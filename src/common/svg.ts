/**
 * Sichere Aufbereitung von SVG-Dateien (BPMN-Exporte aus draw.io, Signavio, Visio, bpmn.io …).
 * Entfernt aktive Inhalte, bevor das SVG ins DOM eingefügt wird.
 */

const BLOCKED_TAGS: string[] = ['script', 'iframe', 'object', 'embed', 'audio', 'video', 'meta', 'link', 'base', 'form', 'input', 'button', 'textarea'];
const URL_ATTRS: string[] = ['href', 'xlink:href', 'src', 'action', 'formaction'];

const SCRIPT_URL: RegExp = /^(?:java|vb)script:/;
const SCRIPT_URL_ANY: RegExp = /(?:java|vb)script:/;

/** Entfernt Leer- und Steuerzeichen (Umgehungen wie «java\tscript:»). */
function stripControl(value: string): string {
  let out: string = '';
  for (let i = 0; i < value.length; i++) {
    if (value.charCodeAt(i) > 32) {
      out += value.charAt(i);
    }
  }
  return out;
}

export interface ISanitizedSvg {
  svg: SVGSVGElement;
  width: number;
  height: number;
}

export function sanitizeSvg(text: string): ISanitizedSvg {
  const doc: Document = new DOMParser().parseFromString(text, 'image/svg+xml');
  if (doc.getElementsByTagName('parsererror').length > 0) {
    throw new Error('Die Datei ist kein gültiges SVG.');
  }
  const root: Element = doc.documentElement;
  if (root.nodeName.toLowerCase() !== 'svg') {
    throw new Error('Die Datei enthält kein SVG-Wurzelelement.');
  }

  BLOCKED_TAGS.forEach(tag => {
    const nodes: Element[] = Array.prototype.slice.call(root.getElementsByTagName(tag));
    nodes.forEach(n => n.parentNode && n.parentNode.removeChild(n));
  });

  const all: Element[] = [root].concat(Array.prototype.slice.call(root.getElementsByTagName('*')));
  all.forEach(el => {
    Array.prototype.slice.call(el.attributes).forEach((attr: Attr) => {
      const name: string = attr.name.toLowerCase();
      const value: string = stripControl(attr.value || '').toLowerCase();
      if (name.indexOf('on') === 0) {
        el.removeAttribute(attr.name);
      } else if (URL_ATTRS.indexOf(name) >= 0 && (SCRIPT_URL.test(value) ||
        (value.indexOf('data:') === 0 && value.indexOf('data:image/') !== 0))) {
        el.removeAttribute(attr.name);
      } else if (name === 'style' && (value.indexOf('expression(') >= 0 || SCRIPT_URL_ANY.test(value))) {
        el.removeAttribute(attr.name);
      }
    });
    // Externe Links in Diagrammen immer in neuem Tab öffnen.
    if (el.nodeName.toLowerCase() === 'a') {
      el.setAttribute('target', '_blank');
      el.setAttribute('rel', 'noopener noreferrer');
    }
  });

  const size: { width: number; height: number } = naturalSize(root);
  const svg: SVGSVGElement = document.importNode(root, true) as unknown as SVGSVGElement;
  if (!svg.getAttribute('viewBox')) {
    svg.setAttribute('viewBox', `0 0 ${size.width} ${size.height}`);
  }
  svg.setAttribute('width', String(size.width));
  svg.setAttribute('height', String(size.height));
  svg.setAttribute('preserveAspectRatio', 'xMinYMin meet');
  svg.removeAttribute('style');
  svg.setAttribute('focusable', 'false');
  return { svg, width: size.width, height: size.height };
}

function naturalSize(root: Element): { width: number; height: number } {
  const viewBox: string | null = root.getAttribute('viewBox');
  if (viewBox) {
    const parts: number[] = viewBox.split(/[\s,]+/).map(Number);
    if (parts.length === 4 && parts[2] > 0 && parts[3] > 0) {
      return { width: parts[2], height: parts[3] };
    }
  }
  const w: number = parseFloat(root.getAttribute('width') || '');
  const h: number = parseFloat(root.getAttribute('height') || '');
  return { width: w > 0 ? w : 1200, height: h > 0 ? h : 800 };
}

const SHAPE_SELECTOR: string = 'rect, path, ellipse, circle, polygon';

function hasOwnShape(el: Element): boolean {
  const shapes: Element[] = Array.prototype.slice.call(el.querySelectorAll(SHAPE_SELECTOR));
  return shapes.some(s => !closestTag(s, 'foreignobject', el));
}

function closestTag(el: Element, tag: string, stop: Element): Element | undefined {
  let cur: Element | null = el.parentElement;
  while (cur && cur !== stop) {
    if (cur.nodeName.toLowerCase() === tag) {
      return cur;
    }
    cur = cur.parentElement;
  }
  return undefined;
}

export interface IDiagramLabel {
  /** Elemente, die als Einheit hervorgehoben werden (Form + Beschriftung). */
  targets: Element[];
  text: string;
}

/**
 * Sucht Beschriftungen von BPMN-Elementen. Beschriftungen werden pro Gruppe zusammengesetzt,
 * damit mehrzeilige Texte («Kreditkarten-» / «buchungen erfassen») als ein Name erkannt werden.
 */
export function collectLabels(svg: SVGSVGElement): IDiagramLabel[] {
  const labelNodes: Element[] = Array.prototype.slice.call(svg.querySelectorAll('text, foreignObject'));
  const byContainer: Map<Element, Element[]> = new Map<Element, Element[]>();
  labelNodes.forEach(node => {
    if (node.nodeName.toLowerCase() === 'text' && closestTag(node, 'switch', svg) &&
      (closestTag(node, 'switch', svg) as Element).querySelector('foreignObject')) {
      return; // Fallback-Text von draw.io ignorieren (foreignObject gewinnt)
    }
    let container: Element | null = node.parentElement;
    while (container && container.nodeName.toLowerCase() !== 'g' && container !== svg) {
      container = container.parentElement;
    }
    if (!container || container === svg) {
      return;
    }
    const list: Element[] = byContainer.get(container) || [];
    list.push(node);
    byContainer.set(container, list);
  });

  const result: IDiagramLabel[] = [];
  byContainer.forEach((nodes, container) => {
    if (nodes.length > 6) {
      return; // Sammelgruppe (z. B. ganzes Diagramm) – keine Einzelbeschriftung
    }
    const text: string = nodes.map(n => (n.textContent || '').trim()).filter(Boolean).join('\n');
    if (!text || text.length > 160) {
      return;
    }
    result.push({ targets: [resolveShapeContainer(container, nodes.length, svg)], text });
    return;
  });
  return result;
}

/**
 * Findet zur Beschriftung das Element, das auch die Form enthält:
 * draw.io-Zelle (data-cell-id), bpmn.io-Element (data-element-id) oder die nächste
 * übergeordnete Gruppe mit Form, die keine weiteren Beschriftungen enthält.
 */
function resolveShapeContainer(container: Element, labelCount: number, svg: SVGSVGElement): Element {
  let cur: Element = container;
  for (let level = 0; level < 4; level++) {
    if (cur.hasAttribute('data-cell-id') || cur.hasAttribute('data-element-id')) {
      return cur;
    }
    if (hasOwnShape(cur)) {
      return cur;
    }
    const parent: Element | null = cur.parentElement;
    if (!parent || parent === svg || parent.nodeName.toLowerCase() !== 'g') {
      break;
    }
    if (parent.querySelectorAll('text, foreignObject').length > labelCount * 2) {
      break; // übergeordnete Gruppe enthält weitere Beschriftungen (Lane, Pool …)
    }
    cur = parent;
  }
  const prev: Element | null = container.previousElementSibling;
  return prev && prev.nodeName.toLowerCase() === 'g' && hasOwnShape(prev) ? prev : container;
}
