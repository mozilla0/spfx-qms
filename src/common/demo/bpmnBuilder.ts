/**
 * Erzeugt BPMN-Diagramme (Pool mit Lanes, Ereignisse, Aktivitäten, Gateways, Sequenzflüsse)
 * als SVG aus einer kompakten Definition. Wird für die Demodaten verwendet.
 */

export type BpmnNodeType = 'start' | 'end' | 'task' | 'xor' | 'and' | 'message';

export interface IBpmnNode {
  id: string;
  type: BpmnNodeType;
  label: string;
  /** Index der Lane (0 = oberste). */
  lane: number;
  /** Spalte (0 = links). */
  col: number;
}

export interface IBpmnFlow {
  from: string;
  to: string;
  label?: string;
  /** Lane-Wechsel: zuerst vertikal (vh, Standard) oder zuerst horizontal (hv). */
  route?: 'vh' | 'hv';
}

export interface IBpmnDiagram {
  title: string;
  lanes: string[];
  nodes: IBpmnNode[];
  flows: IBpmnFlow[];
}

const COL_W: number = 175;
const LANE_H: number = 150;
const LEFT: number = 75;
const TOP: number = 10;
const TASK_W: number = 140;
const TASK_H: number = 60;
const EVENT_R: number = 18;
const GW: number = 20;

const C = {
  ink: '#1b2a41',
  line: '#3b4a5e',
  accent: '#1f6fb2',
  pool: '#1f3a5f',
  lane: '#e8eef6',
  start: '#e6f6fb',
  end: '#9cc0dc'
};

function esc(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Bricht Beschriftungen auf Wortgrenzen um (max. Zeichen pro Zeile). */
export function wrapLabel(label: string, max: number): string[] {
  const words: string[] = label.split(/\s+/);
  const lines: string[] = [];
  let current: string = '';
  words.forEach(word => {
    if (!current) {
      current = word;
    } else if ((current + ' ' + word).length <= max) {
      current += ' ' + word;
    } else {
      lines.push(current);
      current = word;
    }
  });
  if (current) {
    lines.push(current);
  }
  return lines;
}

function centerX(n: IBpmnNode): number {
  return LEFT + 30 + n.col * COL_W + TASK_W / 2;
}

function centerY(n: IBpmnNode): number {
  return TOP + n.lane * LANE_H + LANE_H / 2;
}

function halfWidth(n: IBpmnNode): number {
  return n.type === 'task' ? TASK_W / 2 : n.type === 'xor' || n.type === 'and' ? GW : EVENT_R;
}

function halfHeight(n: IBpmnNode): number {
  return n.type === 'task' ? TASK_H / 2 : n.type === 'xor' || n.type === 'and' ? GW : EVENT_R;
}

function textLines(lines: string[], x: number, y: number, extra: string = ''): string {
  const lh: number = 14;
  const start: number = y - ((lines.length - 1) * lh) / 2 + 4;
  return lines.map((l, i) => `<text x="${x}" y="${start + i * lh}" text-anchor="middle"${extra}>${esc(l)}</text>`).join('');
}

function renderNode(n: IBpmnNode): string {
  const x: number = centerX(n);
  const y: number = centerY(n);
  let shape: string = '';
  let label: string = '';
  switch (n.type) {
    case 'task':
      shape = `<rect x="${x - TASK_W / 2}" y="${y - TASK_H / 2}" width="${TASK_W}" height="${TASK_H}" rx="10" fill="#ffffff" stroke="${C.accent}" stroke-width="1.6"/>`;
      label = textLines(wrapLabel(n.label, 20), x, y, ` fill="${C.ink}"`);
      break;
    case 'start':
    case 'end':
    case 'message': {
      const fill: string = n.type === 'end' ? C.end : n.type === 'start' ? C.start : '#ffffff';
      const sw: number = n.type === 'end' ? 3.5 : 1.6;
      shape = `<circle cx="${x}" cy="${y}" r="${EVENT_R}" fill="${fill}" stroke="${n.type === 'end' ? C.pool : C.accent}" stroke-width="${sw}"/>`;
      if (n.type === 'message') {
        shape += `<circle cx="${x}" cy="${y}" r="${EVENT_R - 4}" fill="none" stroke="${C.accent}" stroke-width="1.4"/>` +
          `<path d="M${x - 8},${y - 5} h16 v10 h-16 z M${x - 8},${y - 5} l8,6 l8,-6" fill="none" stroke="${C.accent}" stroke-width="1.2"/>`;
      }
      label = textLines(wrapLabel(n.label, 18), x, y + EVENT_R + 20, ` fill="${C.ink}" font-size="11"`);
      break;
    }
    case 'xor':
    case 'and': {
      shape = `<path d="M${x},${y - GW} L${x + GW},${y} L${x},${y + GW} L${x - GW},${y} z" fill="#ffffff" stroke="${C.accent}" stroke-width="1.6"/>`;
      shape += n.type === 'xor'
        ? `<path d="M${x - 6},${y - 6} L${x + 6},${y + 6} M${x + 6},${y - 6} L${x - 6},${y + 6}" stroke="${C.accent}" stroke-width="2.2"/>`
        : `<path d="M${x},${y - 9} L${x},${y + 9} M${x - 9},${y} L${x + 9},${y}" stroke="${C.accent}" stroke-width="2.2"/>`;
      if (n.label) {
        // links oberhalb, damit Flüsse nach oben/rechts die Beschriftung nicht kreuzen
        const gwLines: string[] = wrapLabel(n.label, 18);
        label = gwLines.map((l, i) => `<text x="${x - GW - 4}" y="${y - GW - 14 - (gwLines.length - 1 - i) * 13}" text-anchor="end" fill="${C.ink}" font-size="11" font-weight="600">${esc(l)}</text>`).join('');
      }
      break;
    }
  }
  return `<g data-element-id="${esc(n.id)}" data-bpmn-type="${n.type}">${shape}${label}</g>`;
}

function renderFlow(f: IBpmnFlow, nodes: Map<string, IBpmnNode>, marker: string): string {
  const a: IBpmnNode | undefined = nodes.get(f.from);
  const b: IBpmnNode | undefined = nodes.get(f.to);
  if (!a || !b) {
    return '';
  }
  const ax: number = centerX(a);
  const ay: number = centerY(a);
  const bx: number = centerX(b);
  const by: number = centerY(b);
  let d: string;
  let lx: number;
  let ly: number;

  if (a.lane === b.lane && b.col > a.col) {
    // gerade nach rechts
    d = `M${ax + halfWidth(a)},${ay} L${bx - halfWidth(b)},${by}`;
    lx = ax + halfWidth(a) + 14; ly = ay - 6;
  } else if (b.col > a.col && f.route === 'hv') {
    // Lane-Wechsel: waagrecht bis über/unter das Ziel, dann vertikal hinein
    const down: boolean = b.lane > a.lane;
    const ey: number = down ? by - halfHeight(b) : by + halfHeight(b);
    d = `M${ax + halfWidth(a)},${ay} L${bx},${ay} L${bx},${ey}`;
    lx = bx + 6; ly = ey + (down ? -10 : 18);
  } else if (b.col > a.col) {
    // Lane-Wechsel: vertikal aus dem Element, dann waagrecht zum Ziel
    const down: boolean = b.lane > a.lane;
    const sy: number = down ? ay + halfHeight(a) : ay - halfHeight(a);
    d = `M${ax},${sy} L${ax},${by} L${bx - halfWidth(b)},${by}`;
    lx = ax + 6; ly = sy + (down ? 16 : -8);
  } else if (b.col === a.col) {
    const down: boolean = b.lane > a.lane;
    d = `M${ax},${down ? ay + halfHeight(a) : ay - halfHeight(a)} L${bx},${down ? by - halfHeight(b) : by + halfHeight(b)}`;
    lx = ax + 6; ly = ay + (down ? halfHeight(a) + 16 : -halfHeight(a) - 8);
  } else {
    // Rücksprung: unten aus dem Element, zurück nach links, von unten ins Ziel
    const loopY: number = Math.max(ay + halfHeight(a), by + halfHeight(b)) + 28;
    d = `M${ax},${ay + halfHeight(a)} L${ax},${loopY} L${bx},${loopY} L${bx},${by + halfHeight(b)}`;
    lx = ax + 6; ly = ay + halfHeight(a) + 16;
  }
  const label: string = f.label
    ? `<text x="${lx}" y="${ly}" font-size="11" fill="${C.line}">${esc(f.label)}</text>`
    : '';
  return `<g data-flow="${esc(f.from)}-${esc(f.to)}"><path d="${d}" fill="none" stroke="${C.line}" stroke-width="1.4" marker-end="url(#${marker})"/>${label}</g>`;
}

export function buildBpmnSvg(diagram: IBpmnDiagram): string {
  const cols: number = Math.max(...diagram.nodes.map(n => n.col)) + 1;
  const width: number = LEFT + 30 + cols * COL_W + 20;
  const height: number = TOP * 2 + diagram.lanes.length * LANE_H;
  const marker: string = 'arrow-' + diagram.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const nodes: Map<string, IBpmnNode> = new Map<string, IBpmnNode>();
  diagram.nodes.forEach(n => nodes.set(n.id, n));

  const poolH: number = diagram.lanes.length * LANE_H;
  const lanes: string = diagram.lanes.map((name, i) => {
    const y: number = TOP + i * LANE_H;
    return `<rect x="${LEFT - 25}" y="${y}" width="30" height="${LANE_H}" fill="${C.lane}" stroke="${C.line}"/>` +
      `<text x="${LEFT - 10}" y="${y + LANE_H / 2}" text-anchor="middle" transform="rotate(-90 ${LEFT - 10} ${y + LANE_H / 2})" fill="${C.ink}">${esc(name)}</text>` +
      (i > 0 ? `<line x1="${LEFT - 25}" y1="${y}" x2="${width - 10}" y2="${y}" stroke="${C.line}"/>` : '');
  }).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" font-family="Segoe UI, Arial, sans-serif" font-size="12">
<defs><marker id="${marker}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="${C.line}"/></marker></defs>
<rect x="0" y="0" width="${width}" height="${height}" fill="#ffffff"/>
<g data-element-id="pool"><rect x="10" y="${TOP}" width="${width - 20}" height="${poolH}" fill="#ffffff" stroke="${C.line}" stroke-width="1.5"/>
<rect x="10" y="${TOP}" width="30" height="${poolH}" fill="${C.pool}"/>
<text x="25" y="${TOP + poolH / 2}" fill="#ffffff" font-weight="600" text-anchor="middle" transform="rotate(-90 25 ${TOP + poolH / 2})">${esc(diagram.title)}</text>
${lanes}</g>
${diagram.flows.map(f => renderFlow(f, nodes, marker)).join('\n')}
${diagram.nodes.map(renderNode).join('\n')}
</svg>`;
}
