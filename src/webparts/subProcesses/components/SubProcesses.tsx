import * as React from 'react';
import { QmsService } from '../../../common/QmsService';
import { IQmsLandscape, IQmsProcess } from '../../../common/models';
import { qmsStyles as styles, QmsButton, QmsCard, QmsChip, QmsEmpty, QmsError, QmsSkeleton, statusTone, useAsync } from '../../../common/ui/components';
import { QmsIcon } from '../../../common/ui/QmsIcon';
import { QmsNoProcess } from '../../../common/ui/QmsNoProcess';
import { useProcess } from '../../../common/useProcess';
import { processUrl } from '../../../common/links';
import * as strings from 'QmsStrings';

export interface ISubProcessesProps {
  service: QmsService;
  pid?: string;
  title?: string;
  processPageUrl: string;
  isEditMode: boolean;
}

export const SubProcesses: React.FC<ISubProcessesProps> = props => {
  const { service, pid } = props;
  const { process, error, loading, reload } = useProcess(service, pid);
  const landscape = useAsync<IQmsLandscape>(() => service.getLandscape(), [service]);

  const all: IQmsProcess[] = landscape.data ? landscape.data.processes : [];
  const children: IQmsProcess[] = process ? all.filter(p => p.parent && p.parent.id === process.id) : [];
  const grandChildren = (id: number): number => all.filter(p => p.parent && p.parent.id === id).length;

  return (
    <QmsCard
      icon="layers"
      title={props.title || strings.SubTitle}
      subtitle={process ? strings.SubSubtitle.replace('{0}', String(children.length)) : undefined}
      actions={process && props.isEditMode ? <QmsButton variant="subtle" icon="plus" href={service.newFormUrl('processes')}>{strings.SubAdd}</QmsButton> : undefined}
    >
      {(loading || landscape.loading) && !landscape.data && <QmsSkeleton blocks={2} lines={0} />}
      {!!(error || landscape.error) && <QmsError error={error || landscape.error} onRetry={() => { reload(); landscape.reload(); }} />}
      {!loading && !error && !process && <QmsNoProcess pid={pid} isEditMode={props.isEditMode} />}
      {process && landscape.data && children.length === 0 && <QmsEmpty icon="layers" title={strings.SubEmpty} />}
      {process && children.length > 0 && (
        <nav className={styles.rows} aria-label={props.title || strings.SubTitle}>
          {children.map((child, index) => {
            const nested: number = grandChildren(child.id);
            return (
              <a key={child.id} className={styles.row} href={processUrl(props.processPageUrl, child.id)}>
                <span className={styles.rowIndex}>{index + 1}</span>
                <span className={styles.rowMain}>
                  <span className={styles.rowTitle}>{child.title}</span>
                  {(child.description || child.role) && (
                    <span className={styles.rowMeta} style={{ display: 'block' }}>
                      {[child.role && child.role.title, child.description].filter(Boolean).join(' · ')}
                    </span>
                  )}
                </span>
                <span className={styles.rowEnd}>
                  {nested > 0 && <QmsChip>{strings.MapSubCount.replace('{0}', String(nested))}</QmsChip>}
                  {child.status && <QmsChip tone={statusTone(child.status)} dot>{child.status}</QmsChip>}
                  <QmsIcon name="chevronRight" size={16} />
                </span>
              </a>
            );
          })}
        </nav>
      )}
    </QmsCard>
  );
};
