import * as React from 'react';
import { QmsService } from '../../../common/QmsService';
import { IQmsCategory, IQmsLandscape, IQmsProcess, IQmsProcessGroup } from '../../../common/models';
import {
  cx, QmsButton, QmsCard, QmsChip, QmsEmpty, QmsError, QmsPerson, QmsSearchBox, QmsSkeleton, statusTone, useAsync
} from '../../../common/ui/components';
import { QmsIcon } from '../../../common/ui/QmsIcon';
import { processUrl } from '../../../common/links';
import styles from './ProcessMap.module.scss';
import * as strings from 'QmsStrings';

export interface IProcessMapProps {
  service: QmsService;
  title?: string;
  processPageUrl: string;
  showCustomerFrame: boolean;
  showSearch: boolean;
  initialGroupId?: number;
  isEditMode: boolean;
}

interface IBand {
  category: IQmsCategory;
  groups: IQmsProcessGroup[];
}

const UNCATEGORIZED: IQmsCategory = { key: '__none', label: strings.MapUncategorized, order: 9999, style: 'default' };

const ProcessGrid: React.FC<{
  processes: IQmsProcess[];
  pageUrl: string;
  service: QmsService;
  childCount: (id: number) => number;
  showGroup?: boolean;
}> = ({ processes, pageUrl, service, childCount, showGroup }) => (
  <div className={styles.grid}>
    {processes.map(p => {
      const children: number = childCount(p.id);
      return (
        <a key={p.id} className={styles.processCard} href={processUrl(pageUrl, p.id)}>
          <div className={styles.processTop}>
            <span className={styles.processTitle}>{p.title}</span>
            <span className={styles.processArrow}><QmsIcon name="chevronRight" size={16} /></span>
          </div>
          {showGroup && p.group && <span className={styles.processGroupLabel}>{p.group.title}{p.parent ? ` › ${p.parent.title}` : ''}</span>}
          {p.description && <p className={styles.processDesc}>{p.description}</p>}
          <div className={styles.processFoot}>
            {p.status && <QmsChip tone={statusTone(p.status)} dot>{p.status}</QmsChip>}
            {children > 0 && <QmsChip>{strings.MapSubCount.replace('{0}', String(children))}</QmsChip>}
            {p.owner && <QmsPerson person={p.owner} photoUrl={service.userPhotoUrl(p.owner.email)} />}
          </div>
        </a>
      );
    })}
  </div>
);

export const ProcessMap: React.FC<IProcessMapProps> = props => {
  const { service } = props;
  const { data, error, loading, reload } = useAsync<IQmsLandscape>(() => service.getLandscape(), [service]);
  const [selectedId, setSelectedId] = React.useState<number | undefined>(props.initialGroupId);
  const [query, setQuery] = React.useState<string>('');

  const bands: IBand[] = React.useMemo(() => buildBands(data), [data]);
  const topLevel: IQmsProcess[] = React.useMemo(() => (data ? data.processes.filter(p => !p.parent) : []), [data]);
  const childCount = React.useCallback((id: number): number => (data ? data.processes.filter(p => p.parent && p.parent.id === id).length : 0), [data]);

  const q: string = query.trim().toLowerCase();
  const matches: IQmsProcess[] = React.useMemo(() => {
    if (!data || !q) {
      return [];
    }
    return data.processes.filter(p =>
      p.title.toLowerCase().indexOf(q) >= 0 ||
      (p.key || '').toLowerCase().indexOf(q) >= 0 ||
      (p.description || '').toLowerCase().indexOf(q) >= 0 ||
      (p.group ? p.group.title.toLowerCase().indexOf(q) >= 0 : false));
  }, [data, q]);
  const matchedGroupIds: number[] = matches.map(m => (m.group ? m.group.id : -1));

  const select = (id: number): void => {
    const next: number | undefined = selectedId === id ? undefined : id;
    setSelectedId(next);
    setQuery('');
    try {
      const url: URL = new URL(window.location.href);
      if (next) { url.searchParams.set('group', String(next)); } else { url.searchParams.delete('group'); }
      window.history.replaceState(window.history.state, '', url.toString());
    } catch { /* ignorieren */ }
  };

  const selectedGroup: IQmsProcessGroup | undefined = data && selectedId ? data.groups.filter(g => g.id === selectedId)[0] : undefined;
  const totalProcesses: number = data ? data.processes.length : 0;

  return (
    <QmsCard
      icon="map"
      title={props.title || strings.MapTitle}
      subtitle={data ? strings.MapSubtitle.replace('{0}', String(data.groups.length)).replace('{1}', String(totalProcesses)) : undefined}
      actions={<>
        {props.showSearch && data && <QmsSearchBox value={query} onChange={setQuery} placeholder={strings.MapSearchPlaceholder} />}
        <QmsButton variant="subtle" icon="refresh" title={strings.Refresh} onClick={() => { QmsService.clearCache(); reload(); }} />
      </>}
    >
      {loading && !data && <QmsSkeleton blocks={3} lines={0} />}
      {!!error && <QmsError error={error} onRetry={reload} />}
      {data && bands.length === 0 && (
        <QmsEmpty icon="layers" title={strings.MapEmptyTitle} text={strings.MapEmptyText}
          action={<QmsButton variant="primary" icon="plus" href={service.newFormUrl('groups')}>{strings.MapAddGroup}</QmsButton>} />
      )}
      {data && bands.length > 0 && (
        <>
          <div className={cx(styles.landscape, !props.showCustomerFrame && styles.landscapeNoFrame)}>
            {props.showCustomerFrame && <div className={styles.rail} aria-hidden="true">{strings.MapCustomerRequirements}</div>}
            <div className={styles.bands}>
              {bands.map(band => (
                <div key={band.category.key} className={cx(styles.band, band.category.style === 'core' && styles.bandCore)} role="group" aria-label={band.category.label}>
                  <div className={styles.bandHead}>
                    <QmsIcon name={band.category.style === 'core' ? 'process' : 'layers'} size={15} />
                    {band.category.label}
                    <span className={styles.bandCount}>· {band.groups.length}</span>
                  </div>
                  <div className={cx(styles.items, band.category.style === 'core' && styles.itemsCore)}>
                    {band.groups.map(group => {
                      const count: number = topLevel.filter(p => p.group && p.group.id === group.id).length;
                      const dim: boolean = !!q && matchedGroupIds.indexOf(group.id) < 0;
                      return (
                        <button key={group.id} type="button"
                          className={cx(styles.chevron, selectedId === group.id && !q && styles.chevronSelected, dim && styles.chevronDim)}
                          aria-pressed={selectedId === group.id}
                          title={group.description || group.title}
                          onClick={() => select(group.id)}>
                          <span className={styles.chevronTitle}>{group.title}</span>
                          <span className={styles.chevronMeta}>{count === 1 ? strings.MapOneProcess : strings.MapNProcesses.replace('{0}', String(count))}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            {props.showCustomerFrame && <div className={styles.rail} aria-hidden="true">{strings.MapCustomerSatisfaction}</div>}
          </div>

          {q && (
            <div className={styles.detail} aria-live="polite">
              <div className={styles.detailHead}>
                <h3 className={styles.detailTitle}>{strings.MapSearchResults}</h3>
                <QmsChip tone="primary">{matches.length}</QmsChip>
              </div>
              {matches.length === 0
                ? <QmsEmpty icon="search" title={strings.MapNoMatches} />
                : <ProcessGrid processes={matches} pageUrl={props.processPageUrl} service={service} childCount={childCount} showGroup />}
            </div>
          )}

          {!q && selectedGroup && (
            <div className={styles.detail} aria-live="polite">
              <div className={styles.detailHead}>
                <h3 className={styles.detailTitle}>{selectedGroup.title}</h3>
                {categoryLabel(data, selectedGroup) && <QmsChip tone="primary">{categoryLabel(data, selectedGroup)}</QmsChip>}
                {selectedGroup.role && <QmsChip><QmsIcon name="users" size={13} />{selectedGroup.role.title}</QmsChip>}
                <span className={styles.detailSpacer} />
                {props.isEditMode && <QmsButton variant="subtle" icon="edit" href={service.editFormUrl('groups', selectedGroup.id)}>{strings.Edit}</QmsButton>}
                <QmsButton variant="subtle" icon="close" title={strings.Close} onClick={() => select(selectedGroup.id)} />
              </div>
              {selectedGroup.description && <p className={styles.detailText}>{selectedGroup.description}</p>}
              {(() => {
                const list: IQmsProcess[] = topLevel.filter(p => p.group && p.group.id === selectedGroup.id);
                return list.length === 0
                  ? <QmsEmpty icon="process" title={strings.MapGroupEmpty}
                    action={<QmsButton icon="plus" href={service.newFormUrl('processes')}>{strings.MapAddProcess}</QmsButton>} />
                  : <ProcessGrid processes={list} pageUrl={props.processPageUrl} service={service} childCount={childCount} />;
              })()}
            </div>
          )}

          {!q && !selectedGroup && (
            <div className={styles.detail}>
              <QmsEmpty icon="map" title={strings.MapHintTitle} text={strings.MapHintText} />
            </div>
          )}
        </>
      )}
    </QmsCard>
  );
};

function categoryLabel(data: IQmsLandscape | undefined, group: IQmsProcessGroup): string | undefined {
  if (!data || !group.categoryKey) {
    return undefined;
  }
  const cat: IQmsCategory | undefined = data.categories.filter(c => c.key === group.categoryKey)[0];
  return cat ? cat.label : undefined;
}

function buildBands(data: IQmsLandscape | undefined): IBand[] {
  if (!data) {
    return [];
  }
  const bands: IBand[] = data.categories.map(category => ({
    category,
    groups: data.groups.filter(g => g.categoryKey === category.key)
  }));
  const known: string[] = data.categories.map(c => c.key);
  const rest: IQmsProcessGroup[] = data.groups.filter(g => !g.categoryKey || known.indexOf(g.categoryKey) < 0);
  if (rest.length > 0) {
    bands.push({ category: UNCATEGORIZED, groups: rest });
  }
  return bands.filter(b => b.groups.length > 0);
}
