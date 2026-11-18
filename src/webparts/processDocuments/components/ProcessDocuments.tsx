import * as React from 'react';
import { QmsService } from '../../../common/QmsService';
import { IQmsDocument, QmsModerationStatus } from '../../../common/models';
import {
  formatDate, moderationInfo, qmsStyles as styles, QmsButton, QmsCard, QmsChip, QmsEmpty, QmsError, QmsFileBadge, QmsSkeleton, useAsync
} from '../../../common/ui/components';
import { QmsIcon } from '../../../common/ui/QmsIcon';
import { QmsNoProcess } from '../../../common/ui/QmsNoProcess';
import { useProcess } from '../../../common/useProcess';
import { fileOpenUrl } from '../../../common/links';
import { QMS_DIAGRAM_DOCTYPE, QMS_DOCTYPE_CHOICES } from '../../../common/qmsSchema';
import * as strings from 'QmsStrings';

export interface IProcessDocumentsProps {
  service: QmsService;
  pid?: string;
  title?: string;
  hideDiagrams: boolean;
  groupByType: boolean;
  isEditMode: boolean;
}

export const ProcessDocuments: React.FC<IProcessDocumentsProps> = props => {
  const { service, pid } = props;
  const { process, error, loading, reload } = useProcess(service, pid);
  const docs = useAsync<IQmsDocument[]>(() => (process ? service.getDocuments(process.id) : Promise.resolve([])), [service, process && process.id]);
  const [approvedOnly, setApprovedOnly] = React.useState<boolean>(false);

  const all: IQmsDocument[] = (docs.data || []).filter(d => !(props.hideDiagrams && d.docType === QMS_DIAGRAM_DOCTYPE && d.extension === 'svg'));
  const hasUnapproved: boolean = all.some(d => d.moderationStatus !== undefined && d.moderationStatus !== QmsModerationStatus.Approved);
  const visible: IQmsDocument[] = approvedOnly ? all.filter(d => d.moderationStatus === undefined || d.moderationStatus === QmsModerationStatus.Approved) : all;

  const groups: { label: string; items: IQmsDocument[] }[] = [];
  if (props.groupByType) {
    const order: string[] = QMS_DOCTYPE_CHOICES.concat([strings.DocsOther]);
    order.forEach(type => {
      const items: IQmsDocument[] = visible.filter(d => (d.docType || strings.DocsOther) === type);
      if (items.length > 0) {
        groups.push({ label: type, items });
      }
    });
  } else {
    groups.push({ label: '', items: visible });
  }

  return (
    <QmsCard
      icon="document"
      title={props.title || strings.DocsTitle}
      subtitle={process && docs.data ? strings.DocsSubtitle.replace('{0}', String(visible.length)) : undefined}
      actions={process ? <>
        {hasUnapproved && (
          <label className={styles.toggle}>
            <input type="checkbox" checked={approvedOnly} onChange={e => setApprovedOnly(e.target.checked)} />
            {strings.DocsApprovedOnly}
          </label>
        )}
        <QmsButton variant="subtle" icon="external" title={strings.DocsOpenLibrary} href={service.listUrl('documents')} target="_blank" />
      </> : undefined}
    >
      {(loading || (process && docs.loading && !docs.data)) && <QmsSkeleton blocks={2} lines={0} />}
      {!!(error || docs.error) && <QmsError error={error || docs.error} onRetry={() => { reload(); docs.reload(); }} />}
      {!loading && !error && !process && <QmsNoProcess pid={pid} isEditMode={props.isEditMode} />}
      {process && docs.data && visible.length === 0 && <QmsEmpty icon="document" title={strings.DocsEmpty} text={strings.DocsEmptyText} />}
      {process && visible.length > 0 && groups.map(group => (
        <div key={group.label || 'all'} className={styles.group}>
          {group.label && <div className={styles.sectionLabel}>{group.label} <QmsChip>{group.items.length}</QmsChip></div>}
          <div className={styles.rows}>
            {group.items.map(doc => {
              const approval = moderationInfo(doc.moderationStatus);
              const meta: string = [
                doc.modified && strings.DocsModified.replace('{0}', formatDate(doc.modified)),
                doc.editor,
                doc.uiVersion && `v${doc.uiVersion}`
              ].filter(Boolean).join(' · ');
              return (
                <a key={doc.id} className={styles.row} href={fileOpenUrl(doc.serverRelativeUrl, doc.extension)} target="_blank" rel="noopener noreferrer">
                  <QmsFileBadge extension={doc.extension} />
                  <span className={styles.rowMain}>
                    <span className={styles.rowTitle}>{(doc.title || doc.name.replace(/\.[^.]+$/, '')).replace(/[-_]+/g, ' ')}</span>
                    <span className={styles.rowMeta} style={{ display: 'block' }}>{meta}</span>
                  </span>
                  <span className={styles.rowEnd}>
                    {approval && approval.tone !== 'success' && <QmsChip tone={approval.tone} dot>{approval.label}</QmsChip>}
                    <QmsIcon name="external" size={15} />
                  </span>
                </a>
              );
            })}
          </div>
        </div>
      ))}
    </QmsCard>
  );
};
