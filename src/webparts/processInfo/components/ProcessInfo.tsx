import * as React from 'react';
import { QmsService } from '../../../common/QmsService';
import { IQmsCategory, IQmsLandscape, IQmsRole } from '../../../common/models';
import {
  formatDate, QmsButton, QmsCard, QmsChip, QmsError, QmsMeta, QmsPerson, QmsSkeleton, statusTone, useAsync
} from '../../../common/ui/components';
import { QmsIcon } from '../../../common/ui/QmsIcon';
import { QmsNoProcess } from '../../../common/ui/QmsNoProcess';
import { useProcess } from '../../../common/useProcess';
import { processUrl, withParam } from '../../../common/links';
import styles from './ProcessInfo.module.scss';
import * as strings from 'QmsStrings';

export interface IProcessInfoProps {
  service: QmsService;
  pid?: string;
  mapPageUrl: string;
  processPageUrl: string;
  showRoleOwners: boolean;
  isEditMode: boolean;
}

export const ProcessInfo: React.FC<IProcessInfoProps> = props => {
  const { service, pid } = props;
  const { process, error, loading, reload } = useProcess(service, pid);
  const landscape = useAsync<IQmsLandscape>(() => service.getLandscape(), [service]);
  const roles = useAsync<IQmsRole[]>(() => (props.showRoleOwners ? service.getRoles() : Promise.resolve([])), [service, props.showRoleOwners]);

  if (loading && !process) {
    return <QmsCard icon="process"><QmsSkeleton lines={4} /></QmsCard>;
  }
  if (error) {
    return <QmsCard icon="process" title={strings.InfoTitle}><QmsError error={error} onRetry={reload} /></QmsCard>;
  }
  if (!process) {
    return <QmsCard icon="process" title={strings.InfoTitle}><QmsNoProcess pid={pid} isEditMode={props.isEditMode} /></QmsCard>;
  }

  const data: IQmsLandscape | undefined = landscape.data;
  const group = data && process.group ? data.groups.filter(g => g.id === process.group!.id)[0] : undefined;
  const category: IQmsCategory | undefined = data && group ? data.categories.filter(c => c.key === group.categoryKey)[0] : undefined;
  const role: IQmsRole | undefined = roles.data && process.role ? roles.data.filter(r => r.id === process.role!.id)[0] : undefined;
  const overdue: boolean = !!process.nextReview && process.nextReview.getTime() < Date.now();

  const breadcrumb: React.ReactNode = (
    <span className={styles.breadcrumb}>
      <a href={props.mapPageUrl}>{strings.InfoMap}</a>
      {category && <><QmsIcon name="chevronRight" size={12} /><span>{category.label}</span></>}
      {process.group && <><QmsIcon name="chevronRight" size={12} /><a href={withParam(props.mapPageUrl, 'group', process.group.id)}>{process.group.title}</a></>}
      {process.parent && <><QmsIcon name="chevronRight" size={12} /><a href={processUrl(props.processPageUrl, process.parent.id)}>{process.parent.title}</a></>}
    </span>
  );

  return (
    <QmsCard
      icon="process"
      title={process.title}
      subtitle={breadcrumb}
      actions={<>
        {process.status && <QmsChip tone={statusTone(process.status)} dot>{process.status}</QmsChip>}
        {process.version && <QmsChip>{strings.InfoVersionShort} {process.version}</QmsChip>}
        <QmsButton variant="subtle" icon="edit" href={service.editFormUrl('processes', process.id)}>{strings.Edit}</QmsButton>
      </>}
    >
      {process.description && <p className={styles.lead}>{process.description}</p>}

      <div className={styles.metaGrid}>
        <QmsMeta label={strings.FieldProcessKey}>{process.key && <code className={styles.key}>{process.key}</code>}</QmsMeta>
        <QmsMeta label={strings.FieldOwner}>
          {process.owner && <QmsPerson person={process.owner} photoUrl={service.userPhotoUrl(process.owner.email)} />}
        </QmsMeta>
        <QmsMeta label={strings.FieldRole}>
          {process.role && (
            <span className={styles.roleValue}>
              <span>{process.role.title}</span>
              {role && role.owners.length > 0 && (
                <span className={styles.owners}>
                  {role.owners.map(o => <QmsPerson key={o.id} person={o} photoUrl={service.userPhotoUrl(o.email)} />)}
                </span>
              )}
            </span>
          )}
        </QmsMeta>
        <QmsMeta label={strings.FieldGroup}>{process.group && process.group.title}</QmsMeta>
        <QmsMeta label={strings.FieldValidFrom}>{formatDate(process.validFrom)}</QmsMeta>
        <QmsMeta label={strings.FieldNextReview}>
          {process.nextReview && (
            <span className={styles.inline}>
              {formatDate(process.nextReview)}
              {overdue && <QmsChip tone="danger">{strings.InfoOverdue}</QmsChip>}
            </span>
          )}
        </QmsMeta>
        {process.normReference && <QmsMeta label={strings.FieldNorm}>{process.normReference}</QmsMeta>}
        <QmsMeta label={strings.FieldModified}>{formatDate(process.modified)}</QmsMeta>
      </div>

      {(process.input || process.output) && (
        <div className={styles.flow} aria-label={strings.InfoFlow}>
          <div className={styles.flowBox}>
            <div className={styles.flowLabel}>{strings.FieldInput}</div>
            <div className={styles.flowText}>{process.input || '–'}</div>
          </div>
          <div className={styles.flowCenter}>
            <QmsIcon name="chevronRight" size={20} />
            <span>{process.title}</span>
            <QmsIcon name="chevronRight" size={20} />
          </div>
          <div className={styles.flowBox}>
            <div className={styles.flowLabel}>{strings.FieldOutput}</div>
            <div className={styles.flowText}>{process.output || '–'}</div>
          </div>
        </div>
      )}

      {process.kpi && (
        <div className={styles.kpi}>
          <div className={styles.flowLabel}><QmsIcon name="shield" size={14} /> {strings.FieldKpi}</div>
          <div className={styles.flowText}>{process.kpi}</div>
        </div>
      )}
    </QmsCard>
  );
};

