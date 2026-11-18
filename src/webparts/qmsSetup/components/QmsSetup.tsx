import * as React from 'react';
import { QmsService } from '../../../common/QmsService';
import { IQmsListStatus, QmsCategoryMode, QmsLogLevel, QmsProvisioner } from '../../../common/QmsProvisioner';
import { QMS_TERMGROUP_NAME, QMS_TERMSET_NAME } from '../../../common/qmsSchema';
import {
  cx, errorMessage, qmsStyles as qms, QmsButton, QmsCard, QmsChip, QmsEmpty, QmsError, QmsSkeleton, useAsync
} from '../../../common/ui/components';
import { QmsIcon } from '../../../common/ui/QmsIcon';
import styles from './QmsSetup.module.scss';
import * as strings from 'QmsStrings';

export interface IQmsSetupProps {
  service: QmsService;
  provisioner: QmsProvisioner;
  title?: string;
  categoryMode: QmsCategoryMode;
}

interface ILogEntry { time: string; message: string; level: QmsLogLevel; }

export const QmsSetup: React.FC<IQmsSetupProps> = props => {
  const { provisioner, service } = props;
  const canManage = useAsync<boolean>(() => provisioner.canManage(), [provisioner]);
  const status = useAsync<IQmsListStatus[]>(() => provisioner.getStatus(), [provisioner]);
  const [mode, setMode] = React.useState<QmsCategoryMode>(props.categoryMode || 'taxonomy');
  const [termSetId, setTermSetId] = React.useState<string>('');
  const [groupName, setGroupName] = React.useState<string>(QMS_TERMGROUP_NAME);
  const [setName, setSetName] = React.useState<string>(QMS_TERMSET_NAME);
  const [busy, setBusy] = React.useState<string | undefined>(undefined);
  const [log, setLog] = React.useState<ILogEntry[]>([]);
  const [mapUrl, setMapUrl] = React.useState<string | undefined>(undefined);
  const [confirmRemove, setConfirmRemove] = React.useState<boolean>(false);
  const demo = useAsync<boolean>(() => provisioner.hasSampleData(), [provisioner]);

  const write = (message: string, level: QmsLogLevel = 'info'): void => {
    const time: string = new Date().toLocaleTimeString('de-CH');
    setLog(l => l.concat([{ time, message, level }]));
  };

  const run = async (name: string, action: () => Promise<void>): Promise<void> => {
    setBusy(name);
    try {
      await action();
    } catch (e) {
      write(errorMessage(e), 'error');
    } finally {
      setBusy(undefined);
      setConfirmRemove(false);
      status.reload();
      demo.reload();
    }
  };

  if (canManage.loading || (status.loading && !status.data)) {
    return <QmsCard icon="settings" title={props.title || strings.SetupTitle}><QmsSkeleton lines={4} /></QmsCard>;
  }
  if (canManage.data === false) {
    return (
      <QmsCard icon="settings" title={props.title || strings.SetupTitle}>
        <QmsEmpty icon="shield" title={strings.SetupNoPermission} text={strings.SetupNoPermissionText} />
      </QmsCard>
    );
  }

  const lists: IQmsListStatus[] = status.data || [];
  const ready: boolean = lists.length > 0 && lists.every(l => l.exists && l.missingFields.length === 0);
  const existingMode: QmsCategoryMode | undefined = lists.filter(l => l.key === 'groups')[0]?.categoryMode;

  return (
    <QmsCard
      icon="settings"
      title={props.title || strings.SetupTitle}
      subtitle={strings.SetupSubtitle.replace('{0}', service.webAbsoluteUrl)}
      actions={ready ? <QmsChip tone="success" dot>{strings.SetupReady}</QmsChip> : <QmsChip tone="warning" dot>{strings.SetupIncomplete}</QmsChip>}
    >
      {!!status.error && <QmsError error={status.error} onRetry={status.reload} />}

      <div className={qms.sectionLabel}>{strings.SetupStep1}</div>
      <div className={qms.rows}>
        {lists.map(l => (
          <div key={l.key} className={styles.statusRow}>
            <span className={cx(styles.statusIcon, l.exists && l.missingFields.length === 0 ? styles.ok : styles.todo)}>
              <QmsIcon name={l.exists && l.missingFields.length === 0 ? 'check' : 'warning'} size={16} />
            </span>
            <span className={qms.rowMain}>
              <span className={qms.rowTitle}>{l.exists ? <a href={l.url} target="_blank" rel="noopener noreferrer">{l.title}</a> : l.title}</span>
              <span className={qms.rowMeta} style={{ display: 'block' }}>
                {!l.exists ? strings.SetupListMissing
                  : l.missingFields.length > 0 ? strings.SetupFieldsMissing.replace('{0}', l.missingFields.join(', '))
                    : strings.SetupListOk}
              </span>
            </span>
            {l.categoryMode && <QmsChip tone="primary">{l.categoryMode === 'taxonomy' ? strings.SetupModeTaxonomy : strings.SetupModeChoice}</QmsChip>}
          </div>
        ))}
      </div>

      <div className={qms.sectionLabel}>{strings.SetupStep2}</div>
      {existingMode ? (
        <p className={styles.note}>{strings.SetupModeFixed.replace('{0}', existingMode === 'taxonomy' ? strings.SetupModeTaxonomy : strings.SetupModeChoice)}</p>
      ) : (
        <div className={styles.options}>
          <label className={cx(styles.option, mode === 'taxonomy' && styles.optionActive)}>
            <input type="radio" name="qmsMode" checked={mode === 'taxonomy'} onChange={() => setMode('taxonomy')} />
            <span><strong>{strings.SetupModeTaxonomy}</strong><span>{strings.SetupModeTaxonomyText}</span></span>
          </label>
          <label className={cx(styles.option, mode === 'choice' && styles.optionActive)}>
            <input type="radio" name="qmsMode" checked={mode === 'choice'} onChange={() => setMode('choice')} />
            <span><strong>{strings.SetupModeChoice}</strong><span>{strings.SetupModeChoiceText}</span></span>
          </label>
        </div>
      )}
      {!existingMode && mode === 'taxonomy' && (
        <div className={styles.fields}>
          <label>{strings.SetupTermGroup}<input className={styles.field} value={groupName} onChange={e => setGroupName(e.target.value)} /></label>
          <label>{strings.SetupTermSet}<input className={styles.field} value={setName} onChange={e => setSetName(e.target.value)} /></label>
          <label>{strings.SetupTermSetId}<input className={styles.field} value={termSetId} placeholder="00000000-0000-0000-0000-000000000000"
            onChange={e => setTermSetId(e.target.value)} /></label>
        </div>
      )}

      <div className={qms.sectionLabel}>{strings.SetupStep3}</div>
      <div className={styles.actions}>
        <QmsButton variant="primary" icon={busy === 'provision' ? 'refresh' : 'settings'} disabled={!!busy}
          onClick={() => run('provision', () => provisioner.provision({ categoryMode: existingMode || mode, termSetId, termGroupName: groupName, termSetName: setName }, write))}>
          {ready ? strings.SetupUpdate : strings.SetupProvision}
        </QmsButton>
        {!demo.data && (
          <QmsButton icon="layers" disabled={!!busy || !ready} onClick={() => run('seed', () => provisioner.seedSampleData(write))}>
            {strings.SetupSeed}
          </QmsButton>
        )}
        {demo.data && !confirmRemove && (
          <QmsButton icon="close" disabled={!!busy} onClick={() => setConfirmRemove(true)}>{strings.SetupRemoveDemo}</QmsButton>
        )}
        <QmsButton icon="document" disabled={!!busy || !ready}
          onClick={() => run('pages', async () => { setMapUrl(await provisioner.createPages(write)); })}>
          {strings.SetupPages}
        </QmsButton>
        {mapUrl && <QmsButton variant="subtle" icon="external" href={mapUrl}>{strings.SetupOpenMap}</QmsButton>}
      </div>
      {confirmRemove && (
        <div className={styles.confirm} role="alertdialog" aria-label={strings.SetupRemoveDemo}>
          <QmsIcon name="warning" />
          <span>{strings.SetupRemoveHint}</span>
          <QmsButton variant="primary" disabled={!!busy} onClick={() => run('remove', () => provisioner.removeSampleData(write))}>
            {strings.SetupRemoveConfirm}
          </QmsButton>
          <QmsButton variant="subtle" disabled={!!busy} onClick={() => setConfirmRemove(false)}>{strings.Cancel}</QmsButton>
        </div>
      )}

      {log.length > 0 && (
        <div className={styles.log} role="log" aria-live="polite">
          {log.map((entry, i) => (
            <div key={i} className={cx(styles.logLine, (styles as unknown as Record<string, string>)[`log_${entry.level}`])}>
              <span className={styles.logTime}>{entry.time}</span>
              <span>{entry.message}</span>
            </div>
          ))}
          {busy && <div className={styles.logLine}><span className={styles.logTime}>…</span><span>{strings.SetupRunning}</span></div>}
        </div>
      )}
    </QmsCard>
  );
};
