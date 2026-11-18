import * as React from 'react';
import styles from './Qms.module.scss';
import { QmsIcon, QmsIconName } from './QmsIcon';
import { IQmsPerson, QmsModerationStatus } from '../models';
import * as strings from 'QmsStrings';

const css: Record<string, string> = styles as unknown as Record<string, string>;

export function cx(...names: (string | false | undefined)[]): string {
  return names.filter(Boolean).join(' ');
}

// --- Karte -------------------------------------------------------------------

export interface IQmsCardProps {
  title?: string;
  subtitle?: React.ReactNode;
  icon?: QmsIconName;
  actions?: React.ReactNode;
  flush?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export const QmsCard: React.FC<IQmsCardProps> = ({ title, subtitle, icon, actions, flush, className, children }) => (
  <section className={cx(styles.card, className)} aria-label={title}>
    {(title || actions) && (
      <header className={styles.cardHeader}>
        {icon && <span className={styles.cardIcon}><QmsIcon name={icon} /></span>}
        <div className={styles.cardTitles}>
          {title && <h2 className={styles.cardTitle}>{title}</h2>}
          {subtitle && <p className={styles.cardSubtitle}>{subtitle}</p>}
        </div>
        {actions && <div className={styles.cardActions}>{actions}</div>}
      </header>
    )}
    <div className={flush ? styles.cardBodyFlush : styles.cardBody}>{children}</div>
  </section>
);

// --- Chip --------------------------------------------------------------------

export type QmsTone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info';

export const QmsChip: React.FC<{ tone?: QmsTone; dot?: boolean; title?: string; children?: React.ReactNode }> =
  ({ tone = 'neutral', dot, title, children }) => (
    <span className={cx(styles.chip, tone !== 'neutral' && css[`chip_${tone}`])} title={title}>
      {dot && <span className={styles.chipDot} />}
      {children}
    </span>
  );

export function statusTone(status?: string): QmsTone {
  switch ((status || '').toLowerCase()) {
    case 'freigegeben': return 'success';
    case 'in prüfung': return 'warning';
    case 'archiviert': return 'neutral';
    case 'entwurf': return 'info';
    default: return 'neutral';
  }
}

export function moderationInfo(status?: QmsModerationStatus): { label: string; tone: QmsTone } | undefined {
  switch (status) {
    case QmsModerationStatus.Approved: return { label: strings.ApprovalApproved, tone: 'success' };
    case QmsModerationStatus.Pending: return { label: strings.ApprovalPending, tone: 'warning' };
    case QmsModerationStatus.Denied: return { label: strings.ApprovalDenied, tone: 'danger' };
    case QmsModerationStatus.Draft: return { label: strings.ApprovalDraft, tone: 'info' };
    case QmsModerationStatus.Scheduled: return { label: strings.ApprovalScheduled, tone: 'primary' };
    default: return undefined;
  }
}

// --- Button ------------------------------------------------------------------

export interface IQmsButtonProps {
  variant?: 'default' | 'primary' | 'subtle';
  icon?: QmsIconName;
  href?: string;
  target?: string;
  onClick?: () => void;
  title?: string;
  disabled?: boolean;
  children?: React.ReactNode;
}

export const QmsButton: React.FC<IQmsButtonProps> = ({ variant = 'default', icon, href, target, onClick, title, disabled, children }) => {
  const className: string = cx(styles.button, variant !== 'default' && css[`button_${variant}`], !children && styles.iconButton);
  const content: React.ReactNode = <>{icon && <QmsIcon name={icon} size={16} />}{children}</>;
  if (href) {
    return (
      <a className={className} href={href} target={target} rel={target === '_blank' ? 'noopener noreferrer' : undefined}
        title={title} aria-label={!children ? title : undefined}>{content}</a>
    );
  }
  return (
    <button type="button" className={className} onClick={onClick} title={title} disabled={disabled}
      aria-label={!children ? title : undefined}>{content}</button>
  );
};

// --- Person ------------------------------------------------------------------

export function initials(name: string): string {
  const parts: string[] = name.replace(/\(.*?\)/g, '').trim().split(/\s+/);
  return ((parts[0] || '').charAt(0) + (parts.length > 1 ? parts[parts.length - 1].charAt(0) : '')).toUpperCase();
}

export const QmsPerson: React.FC<{ person: IQmsPerson; photoUrl?: string; subtitle?: string }> = ({ person, photoUrl, subtitle }) => {
  const [photoOk, setPhotoOk] = React.useState<boolean>(true);
  return (
    <span className={styles.person} title={person.email || person.title}>
      <span className={styles.avatar}>
        {initials(person.title)}
        {photoUrl && photoOk && <img src={photoUrl} alt="" onError={() => setPhotoOk(false)} />}
      </span>
      <span style={{ minWidth: 0 }}>
        <span className={styles.personName}>{person.title}</span>
        {subtitle && <span className={styles.rowMeta} style={{ display: 'block' }}>{subtitle}</span>}
      </span>
    </span>
  );
};

// --- Zustände ----------------------------------------------------------------

export const QmsEmpty: React.FC<{ icon?: QmsIconName; title: string; text?: React.ReactNode; action?: React.ReactNode }> =
  ({ icon = 'info', title, text, action }) => (
    <div className={styles.empty}>
      <span className={styles.emptyIcon}><QmsIcon name={icon} size={28} /></span>
      <span className={styles.emptyTitle}>{title}</span>
      {text && <span>{text}</span>}
      {action && <span style={{ marginTop: 8 }}>{action}</span>}
    </div>
  );

export const QmsError: React.FC<{ error: unknown; onRetry?: () => void }> = ({ error, onRetry }) => (
  <div className={styles.error} role="alert">
    <QmsIcon name="warning" />
    <div>
      <strong>{strings.ErrorTitle}</strong>
      {errorMessage(error)}
    </div>
    {onRetry && <QmsButton variant="subtle" icon="refresh" onClick={onRetry}>{strings.Retry}</QmsButton>}
  </div>
);

export const QmsSkeleton: React.FC<{ lines?: number; blocks?: number }> = ({ lines = 3, blocks = 0 }) => (
  <div aria-busy="true" aria-label={strings.Loading}>
    {Array.from({ length: blocks }).map((_, i) => <span key={`b${i}`} className={cx(styles.skeleton, styles.skeletonBlock)} />)}
    {Array.from({ length: lines }).map((_, i) => <span key={`l${i}`} className={styles.skeleton} style={{ width: `${90 - i * 15}%` }} />)}
  </div>
);

export const QmsMeta: React.FC<{ label: string; children?: React.ReactNode }> = ({ label, children }) => (
  <div className={styles.metaItem}>
    <div className={styles.metaLabel}>{label}</div>
    <div className={styles.metaValue}>{children || '–'}</div>
  </div>
);

export const QmsSearchBox: React.FC<{ value: string; onChange: (v: string) => void; placeholder: string }> = ({ value, onChange, placeholder }) => (
  <label className={styles.searchBox}>
    <span className={styles.srOnly}>{placeholder}</span>
    <QmsIcon name="search" size={16} />
    <input className={styles.input} type="search" value={value} placeholder={placeholder} onChange={e => onChange(e.target.value)} />
  </label>
);

// --- Hilfsfunktionen ---------------------------------------------------------

export function errorMessage(error: unknown): string {
  if (!error) {
    return '';
  }
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  const e: any = error;
  if (e.isHttpRequestError && e.response && e.status === 404) {
    return strings.ErrorListMissing;
  }
  return e.message ? String(e.message) : String(error);
}

export function formatDate(date?: Date): string {
  return date ? date.toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';
}

export function fileKind(extension: string): string {
  if (['doc', 'docx', 'dotx', 'docm', 'rtf'].indexOf(extension) >= 0) { return 'word'; }
  if (['xls', 'xlsx', 'xlsm', 'csv'].indexOf(extension) >= 0) { return 'excel'; }
  if (['ppt', 'pptx', 'potx'].indexOf(extension) >= 0) { return 'powerpoint'; }
  if (extension === 'pdf') { return 'pdf'; }
  if (extension === 'svg' || extension === 'bpmn') { return 'svg'; }
  if (['vsd', 'vsdx'].indexOf(extension) >= 0) { return 'visio'; }
  return 'other';
}

export const QmsFileBadge: React.FC<{ extension: string }> = ({ extension }) => (
  <span className={cx(styles.fileBadge, css[`file_${fileKind(extension)}`])} aria-hidden="true">
    {(extension || '?').substring(0, 4).toUpperCase()}
  </span>
);

/** Kleiner Hook für asynchrones Laden mit Lade-/Fehlerzustand und Neu-Laden. */
export function useAsync<T>(factory: () => Promise<T>, deps: React.DependencyList): {
  data?: T; error?: unknown; loading: boolean; reload: () => void;
} {
  const [state, setState] = React.useState<{ data?: T; error?: unknown; loading: boolean }>({ loading: true });
  const [tick, setTick] = React.useState<number>(0);
  React.useEffect(() => {
    let cancelled: boolean = false;
    setState(s => ({ data: s.data, loading: true }));
    factory().then(
      data => { if (!cancelled) { setState({ data, loading: false }); } },
      error => { if (!cancelled) { setState({ error, loading: false }); } }
    );
    return () => { cancelled = true; };
  }, [...deps, tick]);
  return { ...state, reload: () => setTick(t => t + 1) };
}

export { styles as qmsStyles };
