/** Fachliche Modelle des QMS. Alle Daten stammen direkt aus den SharePoint-Listen (REST), nicht aus dem Suchindex. */

export interface IQmsPerson {
  id: number;
  title: string;
  email?: string;
}

export interface IQmsLookup {
  id: number;
  title: string;
}

/** Prozesskategorie (Führung / Kern / Unterstützung) – aus Managed Metadata oder Auswahlspalte. */
export interface IQmsCategory {
  /** TermGuid (Managed Metadata) oder Auswahlwert (Choice-Modus). */
  key: string;
  label: string;
  order: number;
  /** «core» = Wertschöpfungskette (horizontaler Pfeil), sonst normale Bandanzeige. */
  style: 'core' | 'default';
}

export interface IQmsRole {
  id: number;
  title: string;
  description?: string;
  owners: IQmsPerson[];
}

export interface IQmsProcessGroup {
  id: number;
  title: string;
  description?: string;
  order: number;
  categoryKey?: string;
  role?: IQmsLookup;
}

export type QmsStatus = 'Entwurf' | 'In Prüfung' | 'Freigegeben' | 'Archiviert';

export interface IQmsProcess {
  id: number;
  title: string;
  key?: string;
  description?: string;
  group?: IQmsLookup;
  parent?: IQmsLookup;
  role?: IQmsLookup;
  owner?: IQmsPerson;
  order: number;
  status?: QmsStatus | string;
  version?: string;
  validFrom?: Date;
  nextReview?: Date;
  input?: string;
  output?: string;
  kpi?: string;
  normReference?: string;
  modified?: Date;
}

export enum QmsModerationStatus {
  Approved = 0,
  Denied = 1,
  Pending = 2,
  Draft = 3,
  Scheduled = 4
}

export interface IQmsDocument {
  id: number;
  name: string;
  title?: string;
  serverRelativeUrl: string;
  extension: string;
  docType?: string;
  process?: IQmsLookup;
  role?: IQmsLookup;
  modified?: Date;
  editor?: string;
  moderationStatus?: QmsModerationStatus;
  uiVersion?: string;
}

export interface IQmsLandscape {
  categories: IQmsCategory[];
  groups: IQmsProcessGroup[];
  processes: IQmsProcess[];
}
