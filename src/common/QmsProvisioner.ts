import { SPHttpClient, SPHttpClientResponse } from '@microsoft/sp-http';
import { WebPartContext } from '@microsoft/sp-webpart-base';
import { PermissionKind } from '@pnp/sp/security';
import '@pnp/sp/site-users/web';
import { ClientsideWebpart, CreateClientsidePage, IClientsidePage, IClientsidePageComponent } from '@pnp/sp/clientside-pages';
import { IList } from '@pnp/sp/lists';
import { QmsService } from './QmsService';
import {
  IQmsFieldDef,
  IQmsListDef,
  QMS_CATEGORY_NOTE_FIELD,
  QMS_DEFAULT_CATEGORIES,
  QMS_LISTS,
  QMS_TERMGROUP_NAME,
  QMS_TERMPROP_ORDER,
  QMS_TERMPROP_STYLE,
  QMS_TERMSET_NAME,
  QmsListKey
} from './qmsSchema';
import { QMS_WEBPART_IDS } from './webpartIds';
import { demoManifestUrl } from './demo/demoManifest';

export type QmsCategoryMode = 'taxonomy' | 'choice';

export interface IQmsProvisionOptions {
  categoryMode: QmsCategoryMode;
  /** Bestehendes Term Set verwenden (leer = Gruppe/Set nach Namen suchen bzw. anlegen). */
  termSetId?: string;
  termGroupName?: string;
  termSetName?: string;
}

export interface IQmsListStatus {
  key: QmsListKey;
  title: string;
  url: string;
  exists: boolean;
  missingFields: string[];
  categoryMode?: QmsCategoryMode;
}

export type QmsLogLevel = 'info' | 'success' | 'warning' | 'error';
export type QmsLogger = (message: string, level?: QmsLogLevel) => void;

/** AddFieldOptions (SP.AddFieldOptions) */
const ADD_TO_ALL_CT: number = 4;
const INTERNAL_NAME_HINT: number = 8;
const ADD_TO_DEFAULT_VIEW: number = 16;

/**
 * Richtet das QMS auf der Ziel-Site ein: Term Set (Managed Metadata), Listen, Spalten,
 * Ansichten, Bibliothek mit Freigabe, Beispieldaten und Seiten. Alles ist idempotent –
 * mehrfaches Ausführen ergänzt nur, was fehlt.
 */
export class QmsProvisioner {
  private readonly _svc: QmsService;
  private readonly _context: WebPartContext;

  public constructor(context: WebPartContext, service: QmsService) {
    this._context = context;
    this._svc = service;
  }

  public async canManage(): Promise<boolean> {
    try {
      return await this._svc.sp.web.currentUserHasPermissions(PermissionKind.ManageLists);
    } catch {
      return false;
    }
  }

  public async getStatus(): Promise<IQmsListStatus[]> {
    const result: IQmsListStatus[] = [];
    for (const def of QMS_LISTS) {
      const url: string = this._svc.listUrl(def.key);
      const status: IQmsListStatus = { key: def.key, title: def.title, url, exists: false, missingFields: [] };
      try {
        const list: IList = this._svc.sp.web.getList(url);
        const fields: { InternalName: string; TypeAsString: string }[] =
          await list.fields.select('InternalName', 'TypeAsString').filter('Hidden eq false or Hidden eq true')();
        status.exists = true;
        const names: string[] = fields.map(f => f.InternalName);
        status.missingFields = def.fields.filter(f => names.indexOf(f.name) < 0).map(f => f.displayName);
        const cat: { InternalName: string; TypeAsString: string } | undefined = fields.filter(f => f.InternalName === 'QmsCategory')[0];
        if (cat) {
          status.categoryMode = cat.TypeAsString.indexOf('Taxonomy') === 0 ? 'taxonomy' : 'choice';
        }
      } catch {
        status.exists = false;
      }
      result.push(status);
    }
    return result;
  }

  public async provision(options: IQmsProvisionOptions, log: QmsLogger): Promise<void> {
    let taxonomy: { sspId: string; termSetId: string } | undefined;
    if (options.categoryMode === 'taxonomy') {
      log('Managed Metadata: Term Set wird geprüft …');
      taxonomy = await this._ensureTermSet(options, log);
    }

    const listIds: Partial<Record<QmsListKey, string>> = {};
    for (const def of QMS_LISTS) {
      const list: IList = await this._ensureList(def, log);
      const info: { Id: string } = await list.select('Id')();
      listIds[def.key] = info.Id;
      for (const field of def.fields) {
        await this._ensureField(list, def, field, listIds, taxonomy, log);
      }
    }
    QmsService.clearCache();
    log('Einrichtung abgeschlossen.', 'success');
  }

  /** Legt den Demodatensatz an (Code wird erst bei Bedarf nachgeladen). */
  public async seedSampleData(log: QmsLogger): Promise<void> {
    const { QmsDemoSeeder } = await import(/* webpackChunkName: 'qms-demo' */ './demo/QmsDemoSeeder');
    await new QmsDemoSeeder(this._svc).seed(log);
  }

  /** Entfernt die Demodaten gemäss Protokolldatei (Papierkorb). */
  public async removeSampleData(log: QmsLogger): Promise<void> {
    const { QmsDemoSeeder } = await import(/* webpackChunkName: 'qms-demo' */ './demo/QmsDemoSeeder');
    await new QmsDemoSeeder(this._svc).remove(log);
  }

  /** Prüft, ob Demodaten angelegt wurden (Protokolldatei vorhanden). */
  public async hasSampleData(): Promise<boolean> {
    try {
      return await this._svc.sp.web.getFileByServerRelativePath(demoManifestUrl(this._svc.webServerRelativeUrl)).exists();
    } catch {
      return false;
    }
  }

  /** Erstellt die Seiten «Prozesslandkarte» und «Prozess» mit den passenden Webparts. */
  public async createPages(log: QmsLogger): Promise<string> {
    const sp = this._svc.sp;
    const pagesUrl: string = `${this._svc.webServerRelativeUrl.replace(/\/$/, '')}/SitePages`;
    const processPageAbs: string = `${this._svc.webAbsoluteUrl}/SitePages/Prozess.aspx`;
    const mapPageAbs: string = `${this._svc.webAbsoluteUrl}/SitePages/Prozesslandkarte.aspx`;

    const defs: IClientsidePageComponent[] = await sp.web.getClientsideWebParts();
    const findDef = (id: string): IClientsidePageComponent => {
      const def: IClientsidePageComponent | undefined = defs.filter(d => d.Id.replace(/[{}]/g, '').toLowerCase() === id)[0];
      if (!def) {
        throw new Error('Die QMS-Webparts sind auf dieser Site nicht verfügbar. Bitte die App zuerst zur Site hinzufügen.');
      }
      return def;
    };
    const part = (id: string, props: Record<string, unknown>): ClientsideWebpart => {
      const wp: ClientsideWebpart = ClientsideWebpart.fromComponentDef(findDef(id));
      wp.setProperties(props);
      return wp;
    };
    const exists = async (name: string): Promise<boolean> =>
      sp.web.getFileByServerRelativePath(`${pagesUrl}/${name}`).exists();

    if (await exists('Prozess.aspx')) {
      log('Seite «Prozess.aspx» existiert bereits – unverändert.', 'warning');
    } else {
      const page: IClientsidePage = await CreateClientsidePage(sp.web, 'Prozess', 'Prozess', 'Home');
      page.addSection().addControl(part(QMS_WEBPART_IDS.processInfo, { mapPageUrl: mapPageAbs }));
      page.addSection().addControl(part(QMS_WEBPART_IDS.processDiagram, { title: 'Prozessdiagramm' }));
      const bottom = page.addSection();
      bottom.addColumn(6).addControl(part(QMS_WEBPART_IDS.subProcesses, { title: 'Sub-Prozesse', processPageUrl: processPageAbs }));
      bottom.addColumn(6).addControl(part(QMS_WEBPART_IDS.processDocuments, { title: 'Prozessdokumente', hideDiagrams: true }));
      await page.save(true);
      log('Seite «Prozess.aspx» erstellt und veröffentlicht.', 'success');
    }

    if (await exists('Prozesslandkarte.aspx')) {
      log('Seite «Prozesslandkarte.aspx» existiert bereits – unverändert.', 'warning');
    } else {
      const page: IClientsidePage = await CreateClientsidePage(sp.web, 'Prozesslandkarte', 'Prozesslandkarte', 'Home');
      page.addSection().addControl(part(QMS_WEBPART_IDS.processMap, { title: 'Prozesslandkarte', processPageUrl: processPageAbs }));
      await page.save(true);
      log('Seite «Prozesslandkarte.aspx» erstellt und veröffentlicht.', 'success');
    }
    return mapPageAbs;
  }

  // ---------------------------------------------------------------------------

  private async _ensureList(def: IQmsListDef, log: QmsLogger): Promise<IList> {
    const sp = this._svc.sp;
    const url: string = this._svc.listUrl(def.key);
    let list: IList = sp.web.getList(url);
    try {
      await list.select('Id')();
      log(`Liste «${def.title}» vorhanden.`);
    } catch {
      // Mit dem URL-Namen erstellen (bestimmt die URL), danach den Anzeigenamen setzen.
      await sp.web.lists.add(def.url, def.description, def.template, false);
      list = sp.web.getList(url);
      await list.update({ Title: def.title });
      log(`Liste «${def.title}» erstellt.`, 'success');
    }
    if (def.enableApproval) {
      await list.update({
        EnableVersioning: true,
        EnableMinorVersions: true,
        EnableModeration: true,
        MajorVersionLimit: 50,
        DraftVersionVisibility: 2
      });
    }
    return list;
  }

  private async _ensureField(
    list: IList,
    listDef: IQmsListDef,
    field: IQmsFieldDef,
    listIds: Partial<Record<QmsListKey, string>>,
    taxonomy: { sspId: string; termSetId: string } | undefined,
    log: QmsLogger
  ): Promise<void> {
    try {
      await list.fields.getByInternalNameOrTitle(field.name).select('Id')();
      return;
    } catch {
      // fehlt → anlegen
    }
    const options: number = INTERNAL_NAME_HINT | ADD_TO_ALL_CT | (field.inView ? ADD_TO_DEFAULT_VIEW : 0);

    if (field.kind === 'Category' && taxonomy) {
      try {
        await list.fields.getByInternalNameOrTitle(QMS_CATEGORY_NOTE_FIELD.name).select('Id')();
      } catch {
        await list.fields.createFieldAsXml({
          SchemaXml: `<Field Type="Note" ID="{${QMS_CATEGORY_NOTE_FIELD.id}}" Name="${QMS_CATEGORY_NOTE_FIELD.name}" StaticName="${QMS_CATEGORY_NOTE_FIELD.name}" DisplayName="${field.name}_0" ShowInViewForms="FALSE" Hidden="TRUE" CanToggleHidden="TRUE" />`,
          Options: INTERNAL_NAME_HINT
        });
      }
    }

    const lookupId: string | undefined = field.lookupList ? listIds[field.lookupList] : undefined;
    if (field.kind === 'Lookup' && !lookupId) {
      log(`Spalte «${field.displayName}»: Zielliste fehlt – übersprungen.`, 'warning');
      return;
    }
    await list.fields.createFieldAsXml({ SchemaXml: buildFieldXml(field, lookupId, taxonomy), Options: options });
    log(`Spalte «${field.displayName}» in «${listDef.title}» erstellt.`, 'success');
  }

  private async _ensureTermSet(options: IQmsProvisionOptions, log: QmsLogger): Promise<{ sspId: string; termSetId: string }> {
    const store: { id: string; defaultLanguageTag: string } = await this._v21Get('termStore');
    const lang: string = store.defaultLanguageTag || 'de-DE';

    let termSetId: string | undefined = (options.termSetId || '').trim() || undefined;
    if (!termSetId) {
      const groupName: string = options.termGroupName || QMS_TERMGROUP_NAME;
      const setName: string = options.termSetName || QMS_TERMSET_NAME;
      const groups: { value: { id: string; displayName: string }[] } = await this._v21Get('termStore/groups');
      let group: { id: string } | undefined = groups.value.filter(g => g.displayName === groupName)[0];
      if (!group) {
        group = await this._v21Post('termStore/groups', { displayName: groupName });
        log(`Term-Gruppe «${groupName}» erstellt.`, 'success');
      }
      const sets: { value: { id: string; localizedNames: { name: string }[] }[] } =
        await this._v21Get(`termStore/groups/${group!.id}/sets`);
      let set: { id: string } | undefined = sets.value.filter(s => s.localizedNames.some(n => n.name === setName))[0];
      if (!set) {
        set = await this._v21Post('termStore/sets', {
          parentGroup: { id: group!.id },
          localizedNames: [{ languageTag: lang, name: setName }]
        });
        log(`Term Set «${setName}» erstellt.`, 'success');
      }
      termSetId = set!.id;
    }

    const children: { value: { labels: { name: string }[] }[] } = await this._v21Get(`termStore/sets/${termSetId}/children`);
    const existingLabels: string[] = [];
    children.value.forEach(t => t.labels.forEach(l => existingLabels.push(l.name)));
    for (let i = 0; i < QMS_DEFAULT_CATEGORIES.length; i++) {
      const cat = QMS_DEFAULT_CATEGORIES[i];
      if (existingLabels.indexOf(cat.label) >= 0) {
        continue;
      }
      await this._v21Post(`termStore/sets/${termSetId}/children`, {
        labels: [{ languageTag: lang, name: cat.label, isDefault: true }],
        properties: [
          { key: QMS_TERMPROP_ORDER, value: String(i + 1) },
          { key: QMS_TERMPROP_STYLE, value: cat.style }
        ]
      });
      log(`Term «${cat.label}» erstellt.`, 'success');
    }
    log('Term Set bereit.', 'success');
    return { sspId: store.id, termSetId: termSetId! };
  }

  /* eslint-disable @typescript-eslint/no-explicit-any */
  private async _v21Get(path: string): Promise<any> {
    const response: SPHttpClientResponse = await this._context.spHttpClient.get(
      `${this._svc.webAbsoluteUrl}/_api/v2.1/${path}`, SPHttpClient.configurations.v1);
    return this._json(response, path);
  }

  private async _v21Post(path: string, body: unknown): Promise<any> {
    const response: SPHttpClientResponse = await this._context.spHttpClient.post(
      `${this._svc.webAbsoluteUrl}/_api/v2.1/${path}`, SPHttpClient.configurations.v1, {
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(body)
      });
    return this._json(response, path);
  }

  private async _json(response: SPHttpClientResponse, path: string): Promise<any> {
    if (!response.ok) {
      const text: string = await response.text();
      if (response.status === 401 || response.status === 403) {
        throw new Error('Keine Berechtigung im Term Store. Entweder als Term-Store-Admin ausführen, ' +
          'ein bestehendes Term Set (ID) angeben oder den Modus «Auswahlspalte» wählen.');
      }
      throw new Error(`Term Store (${path}): ${response.status} ${text.substring(0, 200)}`);
    }
    return response.json();
  }
  /* eslint-enable @typescript-eslint/no-explicit-any */
}

function xmlEscape(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function taxProp(name: string, value: string, type: 'string' | 'boolean'): string {
  return `<Property><Name>${name}</Name><Value xmlns:q1="http://www.w3.org/2001/XMLSchema" p4:type="q1:${type}" ` +
    `xmlns:p4="http://www.w3.org/2001/XMLSchema-instance">${value}</Value></Property>`;
}

export function buildFieldXml(
  field: IQmsFieldDef,
  lookupListId?: string,
  taxonomy?: { sspId: string; termSetId: string }
): string {
  const base: string = `ID="{${field.id}}" Name="${field.name}" StaticName="${field.name}" ` +
    `DisplayName="${xmlEscape(field.displayName)}" Required="${field.required ? 'TRUE' : 'FALSE'}" Group="QMS"` +
    (field.description ? ` Description="${xmlEscape(field.description)}"` : '');
  const def: string = field.defaultValue ? `<Default>${xmlEscape(field.defaultValue)}</Default>` : '';
  switch (field.kind) {
    case 'Text':
      return `<Field Type="Text" ${base} MaxLength="255" />`;
    case 'Note':
      return `<Field Type="Note" ${base} NumLines="6" RichText="FALSE" />`;
    case 'Number':
      return `<Field Type="Number" ${base} Decimals="0" />`;
    case 'DateTime':
      return `<Field Type="DateTime" ${base} Format="DateOnly" />`;
    case 'Choice':
      return `<Field Type="Choice" ${base} Format="Dropdown">${def}<CHOICES>${(field.choices || [])
        .map(c => `<CHOICE>${xmlEscape(c)}</CHOICE>`).join('')}</CHOICES></Field>`;
    case 'User':
      return `<Field Type="User" ${base} UserSelectionMode="PeopleOnly" UserSelectionScope="0" ShowField="ImnName" />`;
    case 'UserMulti':
      return `<Field Type="UserMulti" ${base} Mult="TRUE" UserSelectionMode="PeopleOnly" UserSelectionScope="0" ShowField="ImnName" />`;
    case 'Lookup':
      return `<Field Type="Lookup" ${base} List="{${lookupListId}}" ShowField="Title" />`;
    case 'Category':
      if (taxonomy) {
        return `<Field Type="TaxonomyFieldType" ${base} ShowField="Term1033" Mult="FALSE"><Customization><ArrayOfProperty>` +
          taxProp('SspId', taxonomy.sspId, 'string') +
          taxProp('TermSetId', taxonomy.termSetId, 'string') +
          taxProp('TextField', `{${QMS_CATEGORY_NOTE_FIELD.id}}`, 'string') +
          taxProp('IsPathRendered', 'false', 'boolean') +
          taxProp('IsKeyword', 'false', 'boolean') +
          '</ArrayOfProperty></Customization></Field>';
      }
      return `<Field Type="Choice" ${base} Format="Dropdown"><CHOICES>${QMS_DEFAULT_CATEGORIES
        .map(c => `<CHOICE>${xmlEscape(c.label)}</CHOICE>`).join('')}</CHOICES></Field>`;
    default:
      throw new Error(`Unbekannter Feldtyp ${field.kind as string}`);
  }
}

