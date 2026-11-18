/**
 * Zentrales Schema des QMS: Listen, Spalten (mit fixen IDs) und Konventionen.
 * Die Provisionierung (QmsProvisioner) und der Datenzugriff (QmsService) lesen beide nur von hier.
 * Interne Spaltennamen sind mit «Qms» präfixiert, damit sie nie mit bestehenden Spalten kollidieren.
 */

export type QmsListKey = 'roles' | 'groups' | 'processes' | 'documents';

export type QmsFieldKind =
  | 'Text'
  | 'Note'
  | 'Number'
  | 'DateTime'
  | 'Choice'
  | 'User'
  | 'UserMulti'
  | 'Lookup'
  | 'Category';

export interface IQmsFieldDef {
  id: string;
  name: string;
  displayName: string;
  kind: QmsFieldKind;
  required?: boolean;
  choices?: string[];
  defaultValue?: string;
  /** Für Lookups: Zielliste. */
  lookupList?: QmsListKey;
  description?: string;
  /** In die Standardansicht aufnehmen. */
  inView?: boolean;
}

export interface IQmsListDef {
  key: QmsListKey;
  /** URL-Segment (stabil, wird zum Finden der Liste genutzt). */
  url: string;
  /** Anzeigename beim Erstellen. */
  title: string;
  description: string;
  template: 100 | 101;
  fields: IQmsFieldDef[];
  /** Nur Bibliothek: Versionierung und Inhaltsgenehmigung. */
  enableApproval?: boolean;
}

export const QMS_STATUS_CHOICES: string[] = ['Entwurf', 'In Prüfung', 'Freigegeben', 'Archiviert'];
export const QMS_DOCTYPE_CHOICES: string[] = ['Diagramm', 'Anleitung', 'Dokumentation', 'Formular', 'Checkliste', 'Vorlage', 'Nachweis'];
export const QMS_DIAGRAM_DOCTYPE: string = 'Diagramm';

/** Standard-Kategorien (Term Set bzw. Auswahlwerte), in Anzeigereihenfolge. */
export const QMS_DEFAULT_CATEGORIES: { label: string; style: 'core' | 'default' }[] = [
  { label: 'Führungsprozesse', style: 'default' },
  { label: 'Kernprozesse', style: 'core' },
  { label: 'Unterstützungsprozesse', style: 'default' }
];

export const QMS_TERMGROUP_NAME: string = 'QMS';
export const QMS_TERMSET_NAME: string = 'Prozesskategorien';
/** Benutzerdefinierte Term-Eigenschaften, die die Landkarte auswertet. */
export const QMS_TERMPROP_ORDER: string = 'QmsOrder';
export const QMS_TERMPROP_STYLE: string = 'QmsStyle';

/** Hidden-Note-Feld, das SharePoint für Taxonomiefelder benötigt. */
export const QMS_CATEGORY_NOTE_FIELD: { id: string; name: string } = {
  id: 'f9c06146-7b04-4c73-9ff1-a66920cd39ce',
  name: 'QmsCategoryTaxHTField'
};

export const QMS_LISTS: IQmsListDef[] = [
  {
    key: 'roles',
    url: 'QmsRollen',
    title: 'QMS Rollen',
    description: 'Rollen und Rolleninhaber des Qualitätsmanagementsystems.',
    template: 100,
    fields: [
      { id: 'c6d7fdee-5350-4bf0-890a-7af59e0eb52e', name: 'QmsRoleOwners', displayName: 'Rolleninhaber', kind: 'UserMulti', inView: true },
      { id: 'c3d4c58c-10ae-4aec-a983-4f009eba01cc', name: 'QmsRoleDescription', displayName: 'Beschreibung', kind: 'Note', inView: true }
    ]
  },
  {
    key: 'groups',
    url: 'QmsProzessgruppen',
    title: 'QMS Prozessgruppen',
    description: 'Prozessgruppen der Prozesslandkarte (z. B. Sales, Finance). Kategorie steuert das Band in der Landkarte.',
    template: 100,
    fields: [
      { id: 'd48426dd-4556-4cef-bb4d-346ccebdbedb', name: 'QmsCategory', displayName: 'Prozesskategorie', kind: 'Category', required: true, inView: true },
      { id: 'a43ee362-e7f3-46c2-a86c-c4d6bff6130d', name: 'QmsGroupOrder', displayName: 'Reihenfolge', kind: 'Number', inView: true },
      { id: '925c1b9b-34a2-456e-bf78-914fb639f08e', name: 'QmsGroupRole', displayName: 'Verantwortliche Rolle', kind: 'Lookup', lookupList: 'roles', inView: true },
      { id: '32414c17-fefe-4650-915b-577a39ad4313', name: 'QmsGroupDescription', displayName: 'Beschreibung', kind: 'Note' }
    ]
  },
  {
    key: 'processes',
    url: 'QmsProzesse',
    title: 'QMS Prozesse',
    description: 'Prozesse und Sub-Prozesse mit Verantwortung, Status und Kennzahlen.',
    template: 100,
    fields: [
      { id: '49f4d292-9e68-4376-80c9-aefffff36b7f', name: 'QmsProcessKey', displayName: 'Prozess-ID', kind: 'Text', inView: true,
        description: 'Kurzschlüssel, z. B. AUFTRAG. Optional; Links funktionieren auch über die Element-ID.' },
      { id: '5b5b7c62-461c-46de-9a94-0420dd5daaca', name: 'QmsDescription', displayName: 'Beschreibung', kind: 'Note', inView: true },
      { id: 'c8fad2d7-0c29-4400-bbf8-84c76171536c', name: 'QmsProcessGroup', displayName: 'Prozessgruppe', kind: 'Lookup', lookupList: 'groups', required: true, inView: true },
      { id: '53020306-659a-4b01-9ee3-727800864584', name: 'QmsParentProcess', displayName: 'Übergeordneter Prozess', kind: 'Lookup', lookupList: 'processes', inView: true },
      { id: '3ca770e8-af6f-472d-8346-5beb67327b87', name: 'QmsRole', displayName: 'Rolle', kind: 'Lookup', lookupList: 'roles', inView: true },
      { id: '04187986-8e9f-4b9f-ba8e-5262896da8c5', name: 'QmsProcessOwner', displayName: 'Prozesseigner', kind: 'User', inView: true },
      { id: '3aaaeed4-90df-4aab-ad51-177d9bd65bd9', name: 'QmsProcessOrder', displayName: 'Reihenfolge', kind: 'Number', inView: true },
      { id: 'd8fc0d27-2451-4cf3-9838-cab66553a1f5', name: 'QmsStatus', displayName: 'Status', kind: 'Choice', choices: QMS_STATUS_CHOICES, defaultValue: 'Entwurf', inView: true },
      { id: '5b113ecf-b76f-41f4-9ce8-ff4499fc4428', name: 'QmsVersion', displayName: 'Version', kind: 'Text' },
      { id: '25837340-136c-4c7e-99a5-e9a16b8674de', name: 'QmsValidFrom', displayName: 'Gültig ab', kind: 'DateTime' },
      { id: '8d3a0e2b-af76-4c5d-b601-9aaf443f0e9c', name: 'QmsNextReview', displayName: 'Nächste Überprüfung', kind: 'DateTime', inView: true },
      { id: '7d4868ef-805f-478f-88e1-89309d22e73b', name: 'QmsInput', displayName: 'Input', kind: 'Note' },
      { id: 'add122dd-d5fb-47e5-b24c-8239aa34d5fa', name: 'QmsOutput', displayName: 'Output', kind: 'Note' },
      { id: 'ce7b4860-776a-4c16-931c-6409cab1588c', name: 'QmsKpi', displayName: 'Kennzahlen', kind: 'Note' },
      { id: 'a65cbf89-18f7-4281-b586-e18f8bd929a2', name: 'QmsNormReference', displayName: 'Normbezug', kind: 'Text',
        description: 'z. B. ISO 9001:2015 Kap. 8.2' }
    ]
  },
  {
    key: 'documents',
    url: 'QmsProzessdokumente',
    title: 'QMS Prozessdokumente',
    description: 'Prozessdiagramme (BPMN als SVG) und Prozessdokumente mit Freigabe.',
    template: 101,
    enableApproval: true,
    fields: [
      { id: '22edb6b4-996f-40ff-b521-f282c38d8b7e', name: 'QmsDocProcess', displayName: 'Prozess', kind: 'Lookup', lookupList: 'processes', inView: true },
      { id: '0bb858b2-6788-455b-b663-ff895ee28575', name: 'QmsDocType', displayName: 'Dokumenttyp', kind: 'Choice', choices: QMS_DOCTYPE_CHOICES, defaultValue: 'Dokumentation', inView: true },
      { id: 'cb82743e-e546-47db-8f50-14314fbf2582', name: 'QmsDocRole', displayName: 'Rolle', kind: 'Lookup', lookupList: 'roles', inView: true }
    ]
  }
];

export function getListDef(key: QmsListKey): IQmsListDef {
  const def: IQmsListDef | undefined = QMS_LISTS.filter(l => l.key === key)[0];
  if (!def) {
    throw new Error(`Unbekannte QMS-Liste: ${key}`);
  }
  return def;
}

/** Server-relative URL einer QMS-Liste innerhalb des Webs. */
export function getListUrl(webServerRelativeUrl: string, key: QmsListKey): string {
  const def: IQmsListDef = getListDef(key);
  const base: string = webServerRelativeUrl.replace(/\/$/, '');
  return def.template === 101 ? `${base}/${def.url}` : `${base}/Lists/${def.url}`;
}
