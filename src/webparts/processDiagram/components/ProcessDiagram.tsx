import * as React from 'react';
import { QmsService } from '../../../common/QmsService';
import { IQmsDocument, IQmsLandscape } from '../../../common/models';
import { cx, QmsButton, QmsCard, QmsChip, QmsEmpty, QmsError, QmsSkeleton, useAsync } from '../../../common/ui/components';
import { QmsNoProcess } from '../../../common/ui/QmsNoProcess';
import { useProcess } from '../../../common/useProcess';
import { DiagramViewer } from './DiagramViewer';
import styles from './ProcessDiagram.module.scss';
import * as strings from 'QmsStrings';

export interface IProcessDiagramProps {
  service: QmsService;
  pid?: string;
  title?: string;
  processPageUrl: string;
  linkProcesses: boolean;
  maxHeight: number;
  isEditMode: boolean;
}

export const ProcessDiagram: React.FC<IProcessDiagramProps> = props => {
  const { service, pid } = props;
  const { process, error, loading, reload } = useProcess(service, pid);
  const diagrams = useAsync<IQmsDocument[]>(() => (process ? service.getDiagrams(process.id) : Promise.resolve([])), [service, process && process.id]);
  const landscape = useAsync<IQmsLandscape>(() => service.getLandscape(), [service]);
  const [active, setActive] = React.useState<number>(0);

  const list: IQmsDocument[] = diagrams.data || [];
  const current: IQmsDocument | undefined = list[Math.min(active, Math.max(0, list.length - 1))];

  return (
    <QmsCard
      icon="diagram"
      title={props.title || strings.DiagramTitle}
      subtitle={current ? current.title || current.name : undefined}
      actions={process && (process.key || pid) ? <QmsChip tone="primary">PID: {(process.key || String(process.id)).toUpperCase()}</QmsChip> : undefined}
    >
      {(loading || (process && diagrams.loading && !diagrams.data)) && <QmsSkeleton blocks={1} lines={1} />}
      {!!(error || diagrams.error) && <QmsError error={error || diagrams.error} onRetry={() => { reload(); diagrams.reload(); }} />}
      {!loading && !error && !process && <QmsNoProcess pid={pid} isEditMode={props.isEditMode} />}
      {process && diagrams.data && list.length === 0 && (
        <QmsEmpty icon="diagram" title={strings.DiagramEmptyTitle} text={strings.DiagramEmptyText}
          action={<QmsButton icon="external" href={service.listUrl('documents')}>{strings.DiagramOpenLibrary}</QmsButton>} />
      )}
      {process && list.length > 1 && (
        <div className={styles.tabs} role="tablist">
          {list.map((d, i) => (
            <button key={d.id} type="button" role="tab" aria-selected={i === active}
              className={cx(styles.tab, i === active && styles.tabActive)} onClick={() => setActive(i)}>
              {(d.title || d.name).replace(/\.svg$/i, '')}
            </button>
          ))}
        </div>
      )}
      {process && current && (
        <DiagramViewer
          key={current.serverRelativeUrl}
          document={current}
          loadText={url => service.getFileText(url)}
          processes={landscape.data ? landscape.data.processes : []}
          currentProcessId={process.id}
          processPageUrl={props.processPageUrl}
          linkProcesses={props.linkProcesses}
          maxHeight={props.maxHeight}
        />
      )}
    </QmsCard>
  );
};
