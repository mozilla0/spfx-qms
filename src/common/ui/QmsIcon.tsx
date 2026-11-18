import * as React from 'react';

/** Einheitliches Linien-Icon-Set (24×24, 1.8 px Strich) – keine Abhängigkeit von Icon-Fonts. */
const PATHS: Record<string, string> = {
  map: 'M3 6.5 9 4l6 2.5L21 4v13.5L15 20l-6-2.5L3 20zM9 4v13.5M15 6.5V20',
  process: 'M4 7h6M4 12h10M4 17h7M17 5l3 2-3 2M17 15l3 2-3 2',
  diagram: 'M4 4h6v5H4zM14 15h6v5h-6zM7 9v4h10v2M14 6.5h6M17 6.5V12',
  document: 'M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h6',
  folder: 'M3 6h6l2 2h10v11H3z',
  layers: 'M12 3 2 8l10 5 10-5zM2 13l10 5 10-5M2 17.5 12 22l10-4.5',
  users: 'M8.5 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2 20c.6-3.4 3.2-5.5 6.5-5.5S14.4 16.6 15 20M16 4.5a3.5 3.5 0 0 1 0 6.5M18 14.8c2.1.6 3.5 2.4 4 5.2',
  chevronRight: 'm9 5 7 7-7 7',
  chevronDown: 'm5 9 7 7 7-7',
  arrowUp: 'M12 19V5M5 12l7-7 7 7',
  zoomIn: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM21 21l-5-5M11 8v6M8 11h6',
  zoomOut: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM21 21l-5-5M8 11h6',
  fit: 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5',
  fullscreen: 'M4 4h6M4 4v6M20 4h-6M20 4v6M4 20h6M4 20v-6M20 20h-6M20 20v-6',
  download: 'M12 4v11M7 10l5 5 5-5M5 20h14',
  edit: 'm4 20 1-4L16 5l3 3L8 19zM14 7l3 3',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM21 21l-5-5',
  check: 'm5 12.5 4.5 4.5L19 7.5',
  warning: 'M12 3 2 20h20zM12 10v4.5M12 17.5v.5',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v6M12 7.5v.5',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 13.5l1.6 1.2-2 3.4-1.9-.7a7 7 0 0 1-2.1 1.2L14.7 21h-4l-.4-2.4a7 7 0 0 1-2.1-1.2l-1.9.7-2-3.4 1.6-1.2a7 7 0 0 1 0-3L4.3 9.3l2-3.4 1.9.7a7 7 0 0 1 2.1-1.2L10.7 3h4l.4 2.4a7 7 0 0 1 2.1 1.2l1.9-.7 2 3.4-1.6 1.2a7 7 0 0 1 0 3z',
  link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
  calendar: 'M4 6h16v14H4zM4 10h16M8 3v5M16 3v5',
  external: 'M14 4h6v6M20 4l-9 9M18 14v6H4V6h6',
  refresh: 'M20 11a8 8 0 0 0-14.5-4.5L4 8M4 4v4h4M4 13a8 8 0 0 0 14.5 4.5L20 16M20 20v-4h-4',
  close: 'M6 6l12 12M18 6 6 18',
  plus: 'M12 5v14M5 12h14',
  shield: 'M12 3 4 6v6c0 4.5 3.4 8 8 9 4.6-1 8-4.5 8-9V6zM8.5 12l2.5 2.5 4.5-5',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c.8-4 4-6.5 8-6.5s7.2 2.5 8 6.5'
};

export type QmsIconName = keyof typeof PATHS;

export interface IQmsIconProps {
  name: QmsIconName;
  size?: number;
  className?: string;
  title?: string;
}

export const QmsIcon: React.FC<IQmsIconProps> = ({ name, size = 18, className, title }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.8}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden={title ? undefined : true}
    role={title ? 'img' : undefined}
  >
    {title && <title>{title}</title>}
    <path d={PATHS[name] || PATHS.info} />
  </svg>
);
