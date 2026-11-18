import * as React from 'react';
import { IQmsDocument, IQmsProcess } from '../../../common/models';
import { collectLabels, ISanitizedSvg, sanitizeSvg } from '../../../common/svg';
import { normalizeLabel, processUrl } from '../../../common/links';
import { cx, QmsButton, QmsChip, QmsError, QmsSkeleton, useAsync } from '../../../common/ui/components';
import { QmsIcon } from '../../../common/ui/QmsIcon';
import styles from './ProcessDiagram.module.scss';
import * as strings from 'QmsStrings';

export interface IDiagramViewerProps {
  document: IQmsDocument;
  loadText: (url: string) => Promise<string>;
  processes: IQmsProcess[];
  currentProcessId: number;
  processPageUrl: string;
  linkProcesses: boolean;
  maxHeight: number;
}

interface IView { scale: number; x: number; y: number; }
interface ILinked { id: number; title: string; }

const MIN_SCALE: number = 0.1;
const MAX_SCALE: number = 6;

export const DiagramViewer: React.FC<IDiagramViewerProps> = props => {
  const { document: doc } = props;
  const frameRef = React.useRef<HTMLDivElement>(null);
  const stageRef = React.useRef<HTMLDivElement>(null);
  const canvasRef = React.useRef<HTMLDivElement>(null);
  const sizeRef = React.useRef<{ width: number; height: number }>({ width: 1, height: 1 });
  const dragRef = React.useRef<{ x: number; y: number; vx: number; vy: number } | undefined>(undefined);
  const movedRef = React.useRef<boolean>(false);
  const [view, setView] = React.useState<IView>({ scale: 1, x: 0, y: 0 });
  const [stageHeight, setStageHeight] = React.useState<number>(360);
  const [fullscreen, setFullscreen] = React.useState<boolean>(false);
  const [linked, setLinked] = React.useState<ILinked[]>([]);

  const svgText = useAsync<string>(() => props.loadText(doc.serverRelativeUrl), [doc.serverRelativeUrl]);

  const parsed: { result?: ISanitizedSvg; error?: unknown } = React.useMemo(() => {
    if (!svgText.data) {
      return {};
    }
    try {
      return { result: sanitizeSvg(svgText.data) };
    } catch (e) {
      return { error: e };
    }
  }, [svgText.data]);

  const fit = React.useCallback((): void => {
    const stage: HTMLDivElement | null = stageRef.current;
    if (!stage) {
      return;
    }
    const { width, height } = sizeRef.current;
    const availableWidth: number = stage.clientWidth - 32;
    const isFull: boolean = !!window.document.fullscreenElement;
    const maxH: number = isFull ? window.innerHeight - 80 : props.maxHeight;
    let scale: number = Math.min(availableWidth / width, 1.5);
    if (height * scale + 32 > maxH) {
      scale = Math.min(scale, (maxH - 32) / height);
    }
    scale = Math.max(MIN_SCALE, scale);
    const h: number = isFull ? maxH : Math.max(240, Math.min(maxH, height * scale + 32));
    setStageHeight(h);
    setView({ scale, x: (stage.clientWidth - width * scale) / 2, y: (h - height * scale) / 2 });
  }, [props.maxHeight]);

  // SVG einsetzen, Prozess-Verknüpfungen markieren
  React.useEffect(() => {
    const canvas: HTMLDivElement | null = canvasRef.current;
    if (!canvas || !parsed.result) {
      return;
    }
    const { svg, width, height } = parsed.result;
    sizeRef.current = { width, height };
    canvas.innerHTML = '';
    canvas.appendChild(svg);

    const found: ILinked[] = [];
    const cleanups: (() => void)[] = [];
    if (props.linkProcesses) {
      const byName: Map<string, IQmsProcess> = new Map<string, IQmsProcess>();
      props.processes.forEach(p => {
        if (p.id !== props.currentProcessId) {
          byName.set(normalizeLabel(p.title), p);
          if (p.key) { byName.set(normalizeLabel(p.key), p); }
        }
      });
      collectLabels(svg).forEach(label => {
        const match: IQmsProcess | undefined = byName.get(normalizeLabel(label.text));
        if (!match) {
          return;
        }
        if (found.every(f => f.id !== match.id)) {
          found.push({ id: match.id, title: match.title });
        }
        const href: string = processUrl(props.processPageUrl, match.id);
        label.targets.forEach(el => {
          el.classList.add(styles.linked);
          el.setAttribute('tabindex', '0');
          el.setAttribute('role', 'link');
          el.setAttribute('aria-label', strings.DiagramOpenProcess.replace('{0}', match.title));
          const title: Element = window.document.createElementNS('http://www.w3.org/2000/svg', 'title');
          title.textContent = strings.DiagramOpenProcess.replace('{0}', match.title);
          el.insertBefore(title, el.firstChild);
          const go = (e: Event): void => {
            if (movedRef.current) {
              return; // war ein Verschieben, kein Klick
            }
            e.preventDefault();
            window.location.href = href;
          };
          const key = (e: KeyboardEvent): void => { if (e.key === 'Enter') { go(e); } };
          el.addEventListener('click', go);
          el.addEventListener('keydown', key as EventListener);
          cleanups.push(() => { el.removeEventListener('click', go); el.removeEventListener('keydown', key as EventListener); });
        });
      });
    }
    setLinked(found);
    fit();
    return () => cleanups.forEach(c => c());
  }, [parsed.result, props.processes, props.linkProcesses, props.currentProcessId, props.processPageUrl, fit]);

  React.useEffect(() => {
    const onResize = (): void => fit();
    const onFs = (): void => { setFullscreen(window.document.fullscreenElement === frameRef.current); window.setTimeout(fit, 50); };
    window.addEventListener('resize', onResize);
    window.document.addEventListener('fullscreenchange', onFs);
    return () => { window.removeEventListener('resize', onResize); window.document.removeEventListener('fullscreenchange', onFs); };
  }, [fit]);

  const zoomAt = (factor: number, cx?: number, cy?: number): void => {
    const stage: HTMLDivElement | null = stageRef.current;
    if (!stage) {
      return;
    }
    const px: number = cx !== undefined ? cx : stage.clientWidth / 2;
    const py: number = cy !== undefined ? cy : stage.clientHeight / 2;
    setView(v => {
      const scale: number = Math.min(MAX_SCALE, Math.max(MIN_SCALE, v.scale * factor));
      const ratio: number = scale / v.scale;
      return { scale, x: px - (px - v.x) * ratio, y: py - (py - v.y) * ratio };
    });
  };

  // Strg/⌘ + Mausrad zoomt; ohne Modifier scrollt die Seite normal weiter.
  React.useEffect(() => {
    const stage: HTMLDivElement | null = stageRef.current;
    if (!stage) {
      return;
    }
    const onWheel = (e: WheelEvent): void => {
      if (!e.ctrlKey && !e.metaKey && !window.document.fullscreenElement) {
        return;
      }
      e.preventDefault();
      const rect: DOMRect = stage.getBoundingClientRect();
      zoomAt(e.deltaY < 0 ? 1.15 : 1 / 1.15, e.clientX - rect.left, e.clientY - rect.top);
    };
    stage.addEventListener('wheel', onWheel, { passive: false });
    return () => stage.removeEventListener('wheel', onWheel);
  });

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>): void => {
    if (e.button !== 0) {
      return;
    }
    movedRef.current = false;
    dragRef.current = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y };
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>): void => {
    const d = dragRef.current;
    if (!d) {
      return;
    }
    const dx: number = e.clientX - d.x;
    const dy: number = e.clientY - d.y;
    if (!movedRef.current && Math.abs(dx) + Math.abs(dy) < 4) {
      return;
    }
    if (!movedRef.current) {
      movedRef.current = true;
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    setView(v => ({ ...v, x: d.vx + dx, y: d.vy + dy }));
  };
  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>): void => {
    dragRef.current = undefined;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    // Der Klick nach einem Verschieben soll keinen Prozesslink auslösen.
    window.setTimeout(() => { movedRef.current = false; }, 0);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>): void => {
    const step: number = 40;
    switch (e.key) {
      case '+': case '=': zoomAt(1.2); break;
      case '-': zoomAt(1 / 1.2); break;
      case '0': fit(); break;
      case 'ArrowLeft': setView(v => ({ ...v, x: v.x + step })); break;
      case 'ArrowRight': setView(v => ({ ...v, x: v.x - step })); break;
      case 'ArrowUp': setView(v => ({ ...v, y: v.y + step })); break;
      case 'ArrowDown': setView(v => ({ ...v, y: v.y - step })); break;
      default: return;
    }
    e.preventDefault();
  };

  const toggleFullscreen = (): void => {
    const frame: HTMLDivElement | null = frameRef.current;
    if (!frame) {
      return;
    }
    if (window.document.fullscreenElement) {
      window.document.exitFullscreen().catch(() => undefined);
    } else if (frame.requestFullscreen) {
      frame.requestFullscreen().catch(() => undefined);
    }
  };

  if (svgText.error || parsed.error) {
    return <QmsError error={svgText.error || parsed.error} onRetry={svgText.reload} />;
  }

  return (
    <div ref={frameRef} className={cx(styles.frame, fullscreen && styles.frameFull)}>
      <div className={styles.toolbar} role="toolbar" aria-label={strings.DiagramToolbar}>
        <div className={styles.toolGroup}>
          <QmsButton variant="subtle" icon="zoomOut" title={strings.DiagramZoomOut} onClick={() => zoomAt(1 / 1.2)} />
          <span className={styles.zoomValue} aria-live="polite">{Math.round(view.scale * 100)}%</span>
          <QmsButton variant="subtle" icon="zoomIn" title={strings.DiagramZoomIn} onClick={() => zoomAt(1.2)} />
          <QmsButton variant="subtle" icon="fit" title={strings.DiagramFit} onClick={fit} />
        </div>
        <span className={styles.hint}>{strings.DiagramHint}</span>
        <div className={styles.toolGroup}>
          <QmsButton variant="subtle" icon="download" title={strings.DiagramDownload} href={doc.serverRelativeUrl} target="_blank" />
          <QmsButton variant="subtle" icon={fullscreen ? 'close' : 'fullscreen'} title={fullscreen ? strings.DiagramExitFullscreen : strings.DiagramFullscreen} onClick={toggleFullscreen} />
        </div>
      </div>

      <div
        ref={stageRef}
        className={styles.stage}
        style={{ height: fullscreen ? undefined : stageHeight }}
        tabIndex={0}
        aria-label={strings.DiagramStage.replace('{0}', doc.name)}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDoubleClick={fit}
        onKeyDown={onKeyDown}
      >
        {svgText.loading && <div className={styles.loading}><QmsSkeleton blocks={1} lines={2} /></div>}
        <div
          ref={canvasRef}
          className={styles.canvas}
          style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})` }}
        />
      </div>

      {linked.length > 0 && (
        <div className={styles.linkedBar}>
          <span className={styles.linkedLabel}><QmsIcon name="link" size={14} /> {strings.DiagramLinked}</span>
          {linked.map(l => (
            <a key={l.id} href={processUrl(props.processPageUrl, l.id)} className={styles.linkedChip}>
              <QmsChip tone="primary">{l.title}</QmsChip>
            </a>
          ))}
        </div>
      )}
    </div>
  );
};
