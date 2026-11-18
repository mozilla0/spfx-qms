import { SPFI } from '@pnp/sp';
import { SPHttpClient, SPHttpClientResponse } from '@microsoft/sp-http';
import { WebPartContext } from '@microsoft/sp-webpart-base';
import { getSP, normalizeSiteUrl } from './sp';
import {
  IQmsCategory,
  IQmsDocument,
  IQmsLandscape,
  IQmsLookup,
  IQmsPerson,
  IQmsProcess,
  IQmsProcessGroup,
  IQmsRole,
  QmsModerationStatus
} from './models';
import {
  getListUrl,
  QMS_DEFAULT_CATEGORIES,
  QMS_DIAGRAM_DOCTYPE,
  QMS_TERMPROP_ORDER,
  QMS_TERMPROP_STYLE,
  QmsListKey
} from './qmsSchema';

/* eslint-disable @typescript-eslint/no-explicit-any */
type RawItem = Record<string, any>;
/* eslint-enable @typescript-eslint/no-explicit-any */

interface ICacheEntry {
  time: number;
  promise: Promise<unknown>;
}

const CACHE_TTL_MS: number = 60 * 1000;
const cache: Map<string, ICacheEntry> = new Map<string, ICacheEntry>();

interface ITermLabel { name: string; languageTag: string; isDefault: boolean; }
interface ITermProperty { key: string; value: string; }
interface ITerm { id: string; labels: ITermLabel[]; properties?: ITermProperty[]; }

/**
 * Datenzugriff für alle QMS-Webparts – ausschliesslich über die Listen-REST-API,
 * dadurch sofort aktuell und unabhängig vom Suchindex.
 * Mehrere Webparts auf derselben Seite teilen sich die Abfragen über einen kurzen Cache.
 */
export class QmsService {
  public readonly webAbsoluteUrl: string;
  public readonly webServerRelativeUrl: string;
  private readonly _sp: SPFI;
  private readonly _context: WebPartContext;

  public constructor(context: WebPartContext, siteUrl?: string) {
    this._context = context;
    this.webAbsoluteUrl = normalizeSiteUrl(siteUrl) || context.pageContext.web.absoluteUrl;
    this.webServerRelativeUrl = new URL(this.webAbsoluteUrl).pathname.replace(/\/$/, '') || '/';
    this._sp = getSP(context, this.webAbsoluteUrl);
  }

  public get sp(): SPFI {
    return this._sp;
  }

  public listUrl(key: QmsListKey): string {
    return getListUrl(this.webServerRelativeUrl, key);
  }

  public static clearCache(): void {
    cache.clear();
  }

  /** Kompletter Datenstand für Landkarte und Prozessseite (gecacht). */
  public getLandscape(force?: boolean): Promise<IQmsLandscape> {
    return this._cached('landscape', force, async () => {
      const [categories, groups, processes] = await Promise.all([
        this.getCategories(),
        this._getGroups(),
        this._getProcesses()
      ]);
      return { categories, groups, processes };
    });
  }

  public getRoles(): Promise<IQmsRole[]> {
    return this._cached('roles', false, async () => {
      const items: RawItem[] = await this._sp.web.getList(this.listUrl('roles')).items
        .select('Id', 'Title', 'QmsRoleDescription', 'QmsRoleOwners/Id', 'QmsRoleOwners/Title', 'QmsRoleOwners/EMail')
        .expand('QmsRoleOwners')
        .top(5000)();
      return items.map(i => ({
        id: i.Id,
        title: i.Title,
        description: i.QmsRoleDescription || undefined,
        owners: ((i.QmsRoleOwners || []) as RawItem[]).map(toPerson).filter(isDefined)
      }));
    });
  }

  /** Löst einen Prozess über Element-ID oder Prozess-ID (Schlüssel) auf. */
  public async resolveProcess(pid: string | undefined): Promise<IQmsProcess | undefined> {
    if (!pid) {
      return undefined;
    }
    const landscape: IQmsLandscape = await this.getLandscape();
    const value: string = decodeURIComponent(pid).trim();
    if (/^\d+$/.test(value)) {
      const byId: IQmsProcess | undefined = landscape.processes.filter(p => p.id === parseInt(value, 10))[0];
      if (byId) {
        return byId;
      }
    }
    const lower: string = value.toLowerCase();
    return landscape.processes.filter(p => (p.key || '').toLowerCase() === lower)[0]
      || landscape.processes.filter(p => p.title.toLowerCase() === lower)[0];
  }

  public async getDocuments(processId: number): Promise<IQmsDocument[]> {
    return this._cached(`docs:${processId}`, false, async () => {
      const items: RawItem[] = await this._sp.web.getList(this.listUrl('documents')).items
        .select('Id', 'Title', 'FileLeafRef', 'FileRef', 'Modified', 'QmsDocType',
          'QmsDocProcess/Id', 'QmsDocProcess/Title', 'QmsDocRole/Id', 'QmsDocRole/Title',
          'Editor/Title', 'OData__ModerationStatus', 'OData__UIVersionString')
        .expand('QmsDocProcess', 'QmsDocRole', 'Editor')
        .filter(`QmsDocProcessId eq ${processId} and FSObjType eq 0`)
        .top(500)();
      return items.map(toDocument).sort((a, b) => a.name.localeCompare(b.name, 'de'));
    });
  }

  /** BPMN-Diagramme (SVG) eines Prozesses. */
  public async getDiagrams(processId: number): Promise<IQmsDocument[]> {
    const docs: IQmsDocument[] = await this.getDocuments(processId);
    const svgs: IQmsDocument[] = docs.filter(d => d.extension === 'svg');
    const typed: IQmsDocument[] = svgs.filter(d => d.docType === QMS_DIAGRAM_DOCTYPE);
    return typed.length > 0 ? typed : svgs;
  }

  public getFileText(serverRelativeUrl: string): Promise<string> {
    return this._cached(`file:${serverRelativeUrl}`, false, () =>
      this._sp.web.getFileByServerRelativePath(serverRelativeUrl).getText());
  }

  /** Prozesskategorien – aus dem Term Set (Managed Metadata) oder aus der Auswahlspalte. */
  public getCategories(): Promise<IQmsCategory[]> {
    return this._cached('categories', false, async () => {
      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
      const field: any = await this._sp.web.getList(this.listUrl('groups')).fields.getByInternalNameOrTitle('QmsCategory')();
      if (String(field.TypeAsString).indexOf('Taxonomy') === 0 && field.TermSetId) {
        try {
          const terms: ITerm[] = await this._getTerms(String(field.TermSetId));
          if (terms.length > 0) {
            return this._termsToCategories(terms);
          }
        } catch {
          // Fallback unten: Labels aus den Listendaten lesen.
        }
        return this._categoriesFromListData();
      }
      const choices: string[] = (field.Choices as string[]) || [];
      return choices.map((label, index) => ({
        key: label,
        label,
        order: index,
        style: guessStyle(label, index, choices.length)
      }));
    });
  }

  public userPhotoUrl(email?: string): string | undefined {
    return email ? `${this.webAbsoluteUrl}/_layouts/15/userphoto.aspx?size=S&accountname=${encodeURIComponent(email)}` : undefined;
  }

  public editFormUrl(key: QmsListKey, id: number): string {
    return `${this.listUrl(key)}/EditForm.aspx?ID=${id}&Source=${encodeURIComponent(window.location.href)}`;
  }

  public newFormUrl(key: QmsListKey): string {
    return `${this.listUrl(key)}/NewForm.aspx?Source=${encodeURIComponent(window.location.href)}`;
  }

  // ---------------------------------------------------------------------------

  private async _getGroups(): Promise<IQmsProcessGroup[]> {
    const items: RawItem[] = await this._sp.web.getList(this.listUrl('groups')).items
      .select('Id', 'Title', 'QmsCategory', 'QmsGroupOrder', 'QmsGroupDescription', 'QmsGroupRole/Id', 'QmsGroupRole/Title')
      .expand('QmsGroupRole')
      .top(5000)();
    return items.map(i => ({
      id: i.Id,
      title: i.Title,
      description: i.QmsGroupDescription || undefined,
      order: typeof i.QmsGroupOrder === 'number' ? i.QmsGroupOrder : 9999,
      categoryKey: categoryKeyOf(i.QmsCategory),
      role: toLookup(i.QmsGroupRole)
    })).sort(byOrderThenTitle);
  }

  private async _getProcesses(): Promise<IQmsProcess[]> {
    const items: RawItem[] = await this._sp.web.getList(this.listUrl('processes')).items
      .select('Id', 'Title', 'Modified', 'QmsProcessKey', 'QmsDescription', 'QmsProcessOrder', 'QmsStatus', 'QmsVersion',
        'QmsValidFrom', 'QmsNextReview', 'QmsInput', 'QmsOutput', 'QmsKpi', 'QmsNormReference',
        'QmsProcessGroup/Id', 'QmsProcessGroup/Title', 'QmsParentProcess/Id', 'QmsParentProcess/Title',
        'QmsRole/Id', 'QmsRole/Title', 'QmsProcessOwner/Id', 'QmsProcessOwner/Title', 'QmsProcessOwner/EMail')
      .expand('QmsProcessGroup', 'QmsParentProcess', 'QmsRole', 'QmsProcessOwner')
      .top(5000)();
    return items.map(i => ({
      id: i.Id,
      title: i.Title,
      key: i.QmsProcessKey || undefined,
      description: i.QmsDescription || undefined,
      group: toLookup(i.QmsProcessGroup),
      parent: toLookup(i.QmsParentProcess),
      role: toLookup(i.QmsRole),
      owner: toPerson(i.QmsProcessOwner),
      order: typeof i.QmsProcessOrder === 'number' ? i.QmsProcessOrder : 9999,
      status: i.QmsStatus || undefined,
      version: i.QmsVersion || undefined,
      validFrom: toDate(i.QmsValidFrom),
      nextReview: toDate(i.QmsNextReview),
      input: i.QmsInput || undefined,
      output: i.QmsOutput || undefined,
      kpi: i.QmsKpi || undefined,
      normReference: i.QmsNormReference || undefined,
      modified: toDate(i.Modified)
    })).sort(byOrderThenTitle);
  }

  private async _getTerms(termSetId: string): Promise<ITerm[]> {
    const url: string = `${this.webAbsoluteUrl}/_api/v2.1/termStore/sets/${termSetId}/children`;
    const response: SPHttpClientResponse = await this._context.spHttpClient.get(url, SPHttpClient.configurations.v1);
    if (!response.ok) {
      throw new Error(`Term Set konnte nicht gelesen werden (${response.status}).`);
    }
    const json: { value: ITerm[] } = await response.json();
    return json.value || [];
  }

  private _termsToCategories(terms: ITerm[]): IQmsCategory[] {
    const lang: string = (this._context.pageContext.cultureInfo.currentUICultureName || 'de-CH').toLowerCase();
    const mapped: IQmsCategory[] = terms.map((term, index) => {
      const label: ITermLabel | undefined =
        term.labels.filter(l => l.languageTag.toLowerCase() === lang)[0] ||
        term.labels.filter(l => l.languageTag.toLowerCase().split('-')[0] === lang.split('-')[0])[0] ||
        term.labels.filter(l => l.isDefault)[0] || term.labels[0];
      const props: ITermProperty[] = term.properties || [];
      const orderProp: ITermProperty | undefined = props.filter(p => p.key === QMS_TERMPROP_ORDER)[0];
      const styleProp: ITermProperty | undefined = props.filter(p => p.key === QMS_TERMPROP_STYLE)[0];
      const name: string = label ? label.name : term.id;
      return {
        key: term.id.toLowerCase(),
        label: name,
        order: orderProp && !isNaN(Number(orderProp.value)) ? Number(orderProp.value) : index,
        style: styleProp ? (styleProp.value === 'core' ? 'core' : 'default') : guessStyle(name, index, terms.length)
      } as IQmsCategory;
    });
    return mapped.sort((a, b) => a.order - b.order);
  }

  /** Fallback ohne Term-Store-Zugriff: Labels über RenderListDataAsStream aus den Gruppen lesen. */
  private async _categoriesFromListData(): Promise<IQmsCategory[]> {
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    const result: any = await this._sp.web.getList(this.listUrl('groups')).renderListDataAsStream({
      ViewXml: '<View><ViewFields><FieldRef Name="QmsCategory"/></ViewFields><RowLimit>5000</RowLimit></View>'
    });
    const seen: Map<string, string> = new Map<string, string>();
    ((result.Row || []) as RawItem[]).forEach(row => {
      const value: RawItem | undefined = row.QmsCategory;
      if (value && value.TermID && !seen.has(String(value.TermID).toLowerCase())) {
        seen.set(String(value.TermID).toLowerCase(), value.Label);
      }
    });
    const defaults: string[] = QMS_DEFAULT_CATEGORIES.map(c => c.label);
    const list: IQmsCategory[] = [];
    seen.forEach((label, key) => {
      const idx: number = defaults.indexOf(label);
      list.push({ key, label, order: idx >= 0 ? idx : 100 + list.length, style: guessStyle(label, idx, defaults.length) });
    });
    return list.sort((a, b) => a.order - b.order);
  }

  private _cached<T>(key: string, force: boolean | undefined, factory: () => Promise<T>): Promise<T> {
    const fullKey: string = `${this.webAbsoluteUrl}|${key}`;
    const entry: ICacheEntry | undefined = cache.get(fullKey);
    if (!force && entry && Date.now() - entry.time < CACHE_TTL_MS) {
      return entry.promise as Promise<T>;
    }
    const promise: Promise<T> = factory();
    cache.set(fullKey, { time: Date.now(), promise });
    promise.catch(() => cache.delete(fullKey));
    return promise;
  }
}

// --- Mapper -------------------------------------------------------------------

function isDefined<T>(value: T | undefined): value is T {
  return value !== undefined;
}

function toLookup(value: RawItem | undefined): IQmsLookup | undefined {
  return value && value.Id ? { id: value.Id, title: value.Title } : undefined;
}

function toPerson(value: RawItem | undefined): IQmsPerson | undefined {
  return value && value.Id ? { id: value.Id, title: value.Title, email: value.EMail || undefined } : undefined;
}

function toDate(value: string | undefined): Date | undefined {
  return value ? new Date(value) : undefined;
}

function categoryKeyOf(value: unknown): string | undefined {
  if (!value) {
    return undefined;
  }
  if (typeof value === 'string') {
    return value;
  }
  const tax: RawItem = value as RawItem;
  return tax.TermGuid ? String(tax.TermGuid).toLowerCase() : undefined;
}

function guessStyle(label: string, index: number, count: number): 'core' | 'default' {
  if (/kern|core|wertsch/i.test(label)) {
    return 'core';
  }
  return count === 3 && index === 1 ? 'core' : 'default';
}

function byOrderThenTitle(a: { order: number; title: string }, b: { order: number; title: string }): number {
  return a.order - b.order || a.title.localeCompare(b.title, 'de');
}

function toDocument(i: RawItem): IQmsDocument {
  const name: string = i.FileLeafRef || '';
  const dot: number = name.lastIndexOf('.');
  const status: number | undefined = typeof i.OData__ModerationStatus === 'number' ? i.OData__ModerationStatus : undefined;
  return {
    id: i.Id,
    name,
    title: i.Title || undefined,
    serverRelativeUrl: i.FileRef,
    extension: dot >= 0 ? name.substring(dot + 1).toLowerCase() : '',
    docType: i.QmsDocType || undefined,
    process: toLookup(i.QmsDocProcess),
    role: toLookup(i.QmsDocRole),
    modified: toDate(i.Modified),
    editor: i.Editor ? i.Editor.Title : undefined,
    moderationStatus: status as QmsModerationStatus | undefined,
    uiVersion: i.OData__UIVersionString || undefined
  };
}
