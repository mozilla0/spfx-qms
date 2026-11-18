import { IBpmnDiagram } from './bpmnBuilder';

/**
 * Demodaten einer fiktiven Musterfirma (Handel/Produktion, ca. 80 Mitarbeitende).
 * Alle Namen und Inhalte sind frei erfunden.
 */

export interface IDemoRole {
  title: string;
  description: string;
  /** Aktuellen Benutzer als Rolleninhaber eintragen. */
  assignCurrentUser?: boolean;
}

export interface IDemoGroup {
  title: string;
  /** 0 = Führung, 1 = Kern, 2 = Unterstützung */
  category: 0 | 1 | 2;
  role: string;
  description: string;
}

export type DemoDocStatus = 'approved' | 'pending' | 'draft';

export interface IDemoDocument {
  /** Dateiname ohne Endung */
  name: string;
  type: 'Anleitung' | 'Dokumentation' | 'Formular' | 'Checkliste' | 'Vorlage' | 'Nachweis';
  format: 'pdf' | 'csv';
  status: DemoDocStatus;
}

export interface IDemoProcess {
  title: string;
  key: string;
  group: string;
  role: string;
  description: string;
  status: 'Entwurf' | 'In Prüfung' | 'Freigegeben' | 'Archiviert';
  version: string;
  /** Monate relativ zu heute (negativ = überfällig). */
  reviewInMonths: number;
  parent?: string;
  ownerIsCurrentUser?: boolean;
  norm?: string;
  input?: string;
  output?: string;
  kpi?: string;
  diagram?: IBpmnDiagram;
  documents?: IDemoDocument[];
}

export const DEMO_ROLES: IDemoRole[] = [
  { title: 'Geschäftsleitung', description: 'Gesamtverantwortung für Strategie, Ressourcen und das Managementsystem.', assignCurrentUser: true },
  { title: 'Qualitätsmanager/in', description: 'Pflegt das QMS, plant Audits und begleitet Verbesserungen.', assignCurrentUser: true },
  { title: 'Verkaufsleiter/in', description: 'Verantwortet Offerten, Aufträge und Kundenbeziehungen.' },
  { title: 'Leiter/in Finanzen', description: 'Verantwortet Buchhaltung, Controlling und Zahlungsverkehr.' },
  { title: 'Leiter/in Logistik', description: 'Verantwortet Einkauf, Lager und Versand.' },
  { title: 'Leiter/in Produktion', description: 'Verantwortet Fertigung, Arbeitsvorbereitung und Instandhaltung.' },
  { title: 'HR-Verantwortliche/r', description: 'Verantwortet Rekrutierung, Einführung und Personaladministration.' },
  { title: 'IT-Verantwortliche/r', description: 'Verantwortet Informatik, Berechtigungen und Datensicherheit.' }
];

export const DEMO_GROUPS: IDemoGroup[] = [
  { title: 'Strategie & Planung', category: 0, role: 'Geschäftsleitung', description: 'Unternehmensstrategie, Jahresziele und Budgetrahmen.' },
  { title: 'Qualitätsmanagement', category: 0, role: 'Qualitätsmanager/in', description: 'Pflege des Managementsystems, interne Audits, Dokumentenlenkung.' },
  { title: 'Management-Review', category: 0, role: 'Geschäftsleitung', description: 'Jährliche Bewertung des Managementsystems durch die Geschäftsleitung.' },
  { title: 'Marketing & Vertrieb', category: 1, role: 'Verkaufsleiter/in', description: 'Marktbearbeitung, Anfragen und Offerten.' },
  { title: 'Auftragsabwicklung', category: 1, role: 'Verkaufsleiter/in', description: 'Vom Bestelleingang bis zur Auslieferung beim Kunden.' },
  { title: 'Entwicklung', category: 1, role: 'Leiter/in Produktion', description: 'Entwicklung und Änderung von Produkten.' },
  { title: 'Beschaffung', category: 1, role: 'Leiter/in Logistik', description: 'Einkauf von Material und Dienstleistungen, Lieferantenmanagement.' },
  { title: 'Produktion', category: 1, role: 'Leiter/in Produktion', description: 'Fertigung, Prüfung und Freigabe der Produkte.' },
  { title: 'Logistik & Versand', category: 1, role: 'Leiter/in Logistik', description: 'Lagerbewirtschaftung, Kommissionierung und Versand.' },
  { title: 'Kundenservice', category: 1, role: 'Verkaufsleiter/in', description: 'Support, Reklamationen und Retouren.' },
  { title: 'Personal', category: 2, role: 'HR-Verantwortliche/r', description: 'Rekrutierung, Einführung, Entwicklung und Austritte.' },
  { title: 'Finanzen & Controlling', category: 2, role: 'Leiter/in Finanzen', description: 'Buchhaltung, Abschlüsse, Controlling und Zahlungsverkehr.' },
  { title: 'Informatik', category: 2, role: 'IT-Verantwortliche/r', description: 'Betrieb der IT, Berechtigungen und Informationssicherheit.' },
  { title: 'Infrastruktur', category: 2, role: 'Leiter/in Produktion', description: 'Gebäude, Maschinen und Instandhaltung.' },
  { title: 'Verbesserungsmanagement', category: 2, role: 'Qualitätsmanager/in', description: 'Ideenmanagement, Korrektur- und Vorbeugemassnahmen.' }
];

// --- BPMN-Diagramme --------------------------------------------------------------

const DIAGRAM_ORDER: IBpmnDiagram = {
  title: 'Kundenauftrag abwickeln',
  lanes: ['Vertrieb', 'Finanzen', 'Lager'],
  nodes: [
    { id: 's', type: 'start', label: 'Bestellung eingegangen', lane: 0, col: 0 },
    { id: 't1', type: 'task', label: 'Auftrag erfassen', lane: 0, col: 1 },
    { id: 't2', type: 'task', label: 'Bonität prüfen', lane: 1, col: 2 },
    { id: 'g1', type: 'xor', label: 'Bonität in Ordnung?', lane: 1, col: 3 },
    { id: 't3', type: 'task', label: 'Vorauszahlung anfordern', lane: 1, col: 4 },
    { id: 't4', type: 'task', label: 'Auftragsbestätigung versenden', lane: 0, col: 5 },
    { id: 't5', type: 'task', label: 'Ware kommissionieren', lane: 2, col: 6 },
    { id: 't6', type: 'task', label: 'Lieferung versenden', lane: 2, col: 7 },
    { id: 'e', type: 'end', label: 'Auftrag ausgeliefert', lane: 2, col: 8 }
  ],
  flows: [
    { from: 's', to: 't1' }, { from: 't1', to: 't2', route: 'hv' }, { from: 't2', to: 'g1' },
    { from: 'g1', to: 't4', label: 'Ja' }, { from: 'g1', to: 't3', label: 'Nein' }, { from: 't3', to: 't4' },
    { from: 't4', to: 't5', route: 'hv' }, { from: 't5', to: 't6' }, { from: 't6', to: 'e' }
  ]
};

const DIAGRAM_COMPLAINT: IBpmnDiagram = {
  title: 'Reklamation bearbeiten',
  lanes: ['Kundenservice', 'Qualitätsmanagement', 'Produktion'],
  nodes: [
    { id: 's', type: 'message', label: 'Reklamation eingegangen', lane: 0, col: 0 },
    { id: 't1', type: 'task', label: 'Reklamation erfassen', lane: 0, col: 1 },
    { id: 't2', type: 'task', label: 'Ursache analysieren', lane: 1, col: 2 },
    { id: 'g1', type: 'xor', label: 'Reklamation berechtigt?', lane: 1, col: 3 },
    { id: 't3', type: 'task', label: 'Ablehnung begründen', lane: 0, col: 4 },
    { id: 't4', type: 'task', label: 'Korrekturmassnahme umsetzen', lane: 2, col: 4 },
    { id: 't5', type: 'task', label: 'Wirksamkeit prüfen', lane: 1, col: 5 },
    { id: 't6', type: 'task', label: 'Kunde informieren', lane: 0, col: 6 },
    { id: 'e', type: 'end', label: 'Reklamation abgeschlossen', lane: 0, col: 7 }
  ],
  flows: [
    { from: 's', to: 't1' }, { from: 't1', to: 't2', route: 'hv' }, { from: 't2', to: 'g1' },
    { from: 'g1', to: 't3', label: 'Nein' }, { from: 'g1', to: 't4', label: 'Ja' },
    { from: 't4', to: 't5', route: 'hv' }, { from: 't5', to: 't6', route: 'hv' },
    { from: 't3', to: 't6' }, { from: 't6', to: 'e' }
  ]
};

const DIAGRAM_AUDIT: IBpmnDiagram = {
  title: 'Interne Audits durchführen',
  lanes: ['Qualitätsmanagement', 'Auditierte Stelle'],
  nodes: [
    { id: 's', type: 'start', label: 'Auditprogramm freigegeben', lane: 0, col: 0 },
    { id: 't1', type: 'task', label: 'Audit planen', lane: 0, col: 1 },
    { id: 't2', type: 'task', label: 'Audit durchführen', lane: 1, col: 2 },
    { id: 't3', type: 'task', label: 'Auditbericht erstellen', lane: 0, col: 3 },
    { id: 'g1', type: 'xor', label: 'Abweichungen festgestellt?', lane: 0, col: 4 },
    { id: 't4', type: 'task', label: 'Massnahmen festlegen', lane: 1, col: 5 },
    { id: 't5', type: 'task', label: 'Massnahmen verfolgen', lane: 1, col: 6 },
    { id: 'e', type: 'end', label: 'Audit abgeschlossen', lane: 0, col: 7 }
  ],
  flows: [
    { from: 's', to: 't1' }, { from: 't1', to: 't2', route: 'hv' }, { from: 't2', to: 't3', route: 'hv' },
    { from: 't3', to: 'g1' }, { from: 'g1', to: 't4', label: 'Ja', route: 'hv' }, { from: 'g1', to: 'e', label: 'Nein' },
    { from: 't4', to: 't5' }, { from: 't5', to: 'e' }
  ]
};

const DIAGRAM_ONBOARDING: IBpmnDiagram = {
  title: 'Neue Mitarbeitende einführen',
  lanes: ['HR', 'Vorgesetzte/r', 'Informatik'],
  nodes: [
    { id: 's', type: 'start', label: 'Arbeitsvertrag unterzeichnet', lane: 0, col: 0 },
    { id: 't1', type: 'task', label: 'Personaldossier anlegen', lane: 0, col: 1 },
    { id: 'g1', type: 'and', label: '', lane: 1, col: 2 },
    { id: 't2', type: 'task', label: 'Einführungsplan erstellen', lane: 1, col: 3 },
    { id: 't3', type: 'task', label: 'IT-Zugänge einrichten', lane: 2, col: 3 },
    { id: 'g2', type: 'and', label: '', lane: 1, col: 4 },
    { id: 't4', type: 'task', label: 'Einführungstag durchführen', lane: 1, col: 5 },
    { id: 't5', type: 'task', label: 'Probezeitgespräch führen', lane: 1, col: 6 },
    { id: 'e', type: 'end', label: 'Einführung abgeschlossen', lane: 0, col: 7 }
  ],
  flows: [
    { from: 's', to: 't1' }, { from: 't1', to: 'g1', route: 'hv' }, { from: 'g1', to: 't2' },
    { from: 'g1', to: 't3', route: 'hv' }, { from: 't2', to: 'g2' }, { from: 't3', to: 'g2', route: 'hv' },
    { from: 'g2', to: 't4' }, { from: 't4', to: 't5' }, { from: 't5', to: 'e' }
  ]
};

const DIAGRAM_OFFER: IBpmnDiagram = {
  title: 'Offerte erstellen',
  lanes: ['Vertrieb', 'Arbeitsvorbereitung'],
  nodes: [
    { id: 's', type: 'message', label: 'Anfrage eingegangen', lane: 0, col: 0 },
    { id: 't1', type: 'task', label: 'Anfrage prüfen', lane: 0, col: 1 },
    { id: 'g1', type: 'xor', label: 'Standardprodukt?', lane: 0, col: 2 },
    { id: 't2', type: 'task', label: 'Machbarkeit klären', lane: 1, col: 3 },
    { id: 't3', type: 'task', label: 'Kalkulation erstellen', lane: 1, col: 4 },
    { id: 't4', type: 'task', label: 'Offerte versenden', lane: 0, col: 5 },
    { id: 't5', type: 'task', label: 'Offerte nachfassen', lane: 0, col: 6 },
    { id: 'e', type: 'end', label: 'Offerte abgeschlossen', lane: 0, col: 7 }
  ],
  flows: [
    { from: 's', to: 't1' }, { from: 't1', to: 'g1' }, { from: 'g1', to: 't4', label: 'Ja' },
    { from: 'g1', to: 't2', label: 'Nein', route: 'hv' }, { from: 't2', to: 't3' }, { from: 't3', to: 't4', route: 'hv' },
    { from: 't4', to: 't5' }, { from: 't5', to: 'e' }
  ]
};

// --- Prozesse ------------------------------------------------------------------

const ISO = 'ISO 9001:2015';

export const DEMO_PROCESSES: IDemoProcess[] = [
  // Führung
  { title: 'Strategie entwickeln', key: 'STRATEGIE', group: 'Strategie & Planung', role: 'Geschäftsleitung', status: 'Freigegeben', version: '2.0', reviewInMonths: 6, ownerIsCurrentUser: true,
    description: 'Mehrjahresstrategie und Jahresziele herleiten, abstimmen und kommunizieren.', norm: `${ISO} Kap. 4.1, 6.2`,
    input: 'Markt- und Wettbewerbsanalyse\nKundenfeedback\nErgebnisse Management-Review', output: 'Strategiepapier\nJahresziele je Bereich', kpi: 'Zielerreichungsgrad Jahresziele',
    documents: [{ name: 'Leitfaden Strategieprozess', type: 'Anleitung', format: 'pdf', status: 'approved' }] },
  { title: 'Budget erstellen', key: 'BUDGET', group: 'Strategie & Planung', role: 'Leiter/in Finanzen', status: 'In Prüfung', version: '1.1', reviewInMonths: 3,
    description: 'Jahresbudget aus den Zielen ableiten und durch die Geschäftsleitung freigeben lassen.', norm: `${ISO} Kap. 7.1`,
    input: 'Jahresziele\nIst-Zahlen Vorjahr', output: 'Freigegebenes Budget', kpi: 'Budgetabweichung < 5 %' },
  { title: 'Interne Audits durchführen', key: 'AUDIT', group: 'Qualitätsmanagement', role: 'Qualitätsmanager/in', status: 'Freigegeben', version: '3.0', reviewInMonths: -1, ownerIsCurrentUser: true,
    description: 'Auditprogramm planen, Audits durchführen, Abweichungen festhalten und Massnahmen verfolgen.', norm: `${ISO} Kap. 9.2`,
    input: 'Auditprogramm\nErgebnisse früherer Audits\nProzessbeschreibungen', output: 'Auditberichte\nMassnahmenliste', kpi: 'Umsetzungsquote Auditprogramm 100 %\nMassnahmen fristgerecht erledigt > 90 %',
    diagram: DIAGRAM_AUDIT,
    documents: [
      { name: 'Auditprogramm 2026', type: 'Dokumentation', format: 'pdf', status: 'approved' },
      { name: 'Auditcheckliste Prozessaudit', type: 'Checkliste', format: 'csv', status: 'approved' },
      { name: 'Vorlage Auditbericht', type: 'Vorlage', format: 'pdf', status: 'pending' }
    ] },
  { title: 'Audit durchführen', key: 'AUDIT-DURCHF', group: 'Qualitätsmanagement', role: 'Qualitätsmanager/in', status: 'Freigegeben', version: '1.0', reviewInMonths: 10, parent: 'Interne Audits durchführen',
    description: 'Eröffnungsgespräch, Befragung und Stichproben, Abschlussgespräch mit der auditierten Stelle.' },
  { title: 'Massnahmen verfolgen', key: 'MASSNAHMEN', group: 'Qualitätsmanagement', role: 'Qualitätsmanager/in', status: 'Entwurf', version: '0.2', reviewInMonths: 2, parent: 'Interne Audits durchführen',
    description: 'Termine und Wirksamkeit der Massnahmen aus Audits überwachen.' },
  { title: 'Dokumente lenken', key: 'DOKUMENTE', group: 'Qualitätsmanagement', role: 'Qualitätsmanager/in', status: 'Freigegeben', version: '2.1', reviewInMonths: 8,
    description: 'Erstellung, Prüfung, Freigabe und Archivierung von QMS-Dokumenten.', norm: `${ISO} Kap. 7.5`,
    input: 'Neue oder geänderte Dokumente', output: 'Freigegebene Dokumente in der Bibliothek', kpi: 'Anteil überfälliger Dokumentprüfungen < 5 %',
    documents: [{ name: 'Richtlinie Dokumentenlenkung', type: 'Anleitung', format: 'pdf', status: 'approved' }] },
  { title: 'Management-Review durchführen', key: 'REVIEW', group: 'Management-Review', role: 'Geschäftsleitung', status: 'Freigegeben', version: '1.3', reviewInMonths: 11, ownerIsCurrentUser: true,
    description: 'Jährliche Bewertung von Eignung, Angemessenheit und Wirksamkeit des QMS.', norm: `${ISO} Kap. 9.3`,
    input: 'Auditergebnisse\nKennzahlen\nKundenzufriedenheit\nStatus Massnahmen', output: 'Protokoll Management-Review\nBeschlüsse und Ziele',
    documents: [{ name: 'Vorlage Management-Review', type: 'Vorlage', format: 'pdf', status: 'approved' }] },

  // Kern
  { title: 'Offerte erstellen', key: 'OFFERTE', group: 'Marketing & Vertrieb', role: 'Verkaufsleiter/in', status: 'Freigegeben', version: '1.4', reviewInMonths: 5,
    description: 'Kundenanfrage prüfen, Machbarkeit klären, kalkulieren und Offerte versenden.', norm: `${ISO} Kap. 8.2`,
    input: 'Kundenanfrage\nPreisliste', output: 'Versendete Offerte', kpi: 'Offerten innert 3 Arbeitstagen > 90 %\nAbschlussquote',
    diagram: DIAGRAM_OFFER,
    documents: [{ name: 'Kalkulationsschema', type: 'Anleitung', format: 'pdf', status: 'approved' }, { name: 'Checkliste Offertprüfung', type: 'Checkliste', format: 'csv', status: 'draft' }] },
  { title: 'Kalkulation erstellen', key: 'KALKULATION', group: 'Marketing & Vertrieb', role: 'Verkaufsleiter/in', status: 'In Prüfung', version: '0.9', reviewInMonths: 4, parent: 'Offerte erstellen',
    description: 'Material, Arbeitszeit und Zuschläge kalkulieren.' },
  { title: 'Messen und Events planen', key: 'MESSEN', group: 'Marketing & Vertrieb', role: 'Verkaufsleiter/in', status: 'Entwurf', version: '0.1', reviewInMonths: 9,
    description: 'Teilnahme an Messen und Kundenevents planen und auswerten.' },
  { title: 'Kundenauftrag abwickeln', key: 'AUFTRAG', group: 'Auftragsabwicklung', role: 'Verkaufsleiter/in', status: 'Freigegeben', version: '1.2', reviewInMonths: -2, ownerIsCurrentUser: true,
    description: 'Vom Bestelleingang bis zur Auslieferung beim Kunden – inklusive Bonitätsprüfung und Versand.', norm: `${ISO} Kap. 8.2, 8.5`,
    input: 'Kundenbestellung\nKundenstammdaten\nLagerbestand', output: 'Auftragsbestätigung\nAusgelieferte Ware\nRechnung',
    kpi: 'Durchlaufzeit Bestellung → Versand < 48 Stunden\nLiefertermintreue > 95 %',
    diagram: DIAGRAM_ORDER,
    documents: [
      { name: 'Arbeitsanweisung Auftragserfassung', type: 'Anleitung', format: 'pdf', status: 'approved' },
      { name: 'Prozessbeschreibung Kundenauftrag', type: 'Dokumentation', format: 'pdf', status: 'pending' },
      { name: 'Checkliste Versandbereitschaft', type: 'Checkliste', format: 'csv', status: 'approved' }
    ] },
  { title: 'Bonität prüfen', key: 'BONITAET', group: 'Auftragsabwicklung', role: 'Leiter/in Finanzen', status: 'In Prüfung', version: '1.0', reviewInMonths: 7, parent: 'Kundenauftrag abwickeln',
    description: 'Kreditwürdigkeit von Neu- und Bestandeskunden prüfen und Kreditlimite festlegen.',
    input: 'Kundenstammdaten\nZahlungshistorie', output: 'Entscheid Rechnung oder Vorauszahlung',
    documents: [{ name: 'Kurzanleitung Bonitätsabfrage', type: 'Anleitung', format: 'pdf', status: 'draft' }] },
  { title: 'Ware kommissionieren', key: 'KOMMISSION', group: 'Auftragsabwicklung', role: 'Leiter/in Logistik', status: 'Freigegeben', version: '1.1', reviewInMonths: 12, parent: 'Kundenauftrag abwickeln',
    description: 'Artikel gemäss Lieferschein bereitstellen und Vollständigkeit prüfen.' },
  { title: 'Retouren bearbeiten', key: 'RETOUREN', group: 'Auftragsabwicklung', role: 'Leiter/in Logistik', status: 'Entwurf', version: '0.3', reviewInMonths: 1,
    description: 'Rücksendungen prüfen, gutschreiben und wieder einlagern.' },
  { title: 'Produkt entwickeln', key: 'ENTWICKLUNG', group: 'Entwicklung', role: 'Leiter/in Produktion', status: 'In Prüfung', version: '0.8', reviewInMonths: 6,
    description: 'Entwicklungsprojekte von der Idee bis zur Serienfreigabe steuern.', norm: `${ISO} Kap. 8.3`,
    input: 'Produktidee\nKundenanforderungen', output: 'Freigegebenes Produkt\nTechnische Dokumentation' },
  { title: 'Lieferanten bewerten', key: 'LIEFERANTEN', group: 'Beschaffung', role: 'Leiter/in Logistik', status: 'Freigegeben', version: '2.0', reviewInMonths: 9,
    description: 'Jährliche Bewertung der Hauptlieferanten nach Qualität, Termintreue und Preis.', norm: `${ISO} Kap. 8.4`,
    input: 'Wareneingangsprüfungen\nLieferterminstatistik', output: 'Lieferantenbewertung A/B/C', kpi: 'Anteil A-Lieferanten > 70 %',
    documents: [{ name: 'Bewertungsbogen Lieferanten', type: 'Formular', format: 'pdf', status: 'approved' }] },
  { title: 'Material bestellen', key: 'BESTELLUNG', group: 'Beschaffung', role: 'Leiter/in Logistik', status: 'Freigegeben', version: '1.0', reviewInMonths: 10,
    description: 'Bedarf ermitteln, Bestellung auslösen und Auftragsbestätigung prüfen.' },
  { title: 'Fertigungsauftrag ausführen', key: 'FERTIGUNG', group: 'Produktion', role: 'Leiter/in Produktion', status: 'Freigegeben', version: '1.5', reviewInMonths: 4,
    description: 'Fertigung gemäss Arbeitsplan inkl. Zwischen- und Endprüfung.', norm: `${ISO} Kap. 8.5, 8.6`,
    input: 'Fertigungsauftrag\nArbeitsplan\nMaterial', output: 'Geprüfte Produkte', kpi: 'Ausschussquote < 1,5 %',
    documents: [{ name: 'Prüfanweisung Endkontrolle', type: 'Anleitung', format: 'pdf', status: 'approved' }, { name: 'Prüfprotokoll', type: 'Nachweis', format: 'csv', status: 'approved' }] },
  { title: 'Fehlerhafte Produkte lenken', key: 'NC-PRODUKTE', group: 'Produktion', role: 'Qualitätsmanager/in', status: 'In Prüfung', version: '1.0', reviewInMonths: -3,
    description: 'Nichtkonforme Produkte kennzeichnen, sperren und über die Verwendung entscheiden.', norm: `${ISO} Kap. 8.7` },
  { title: 'Ware versenden', key: 'VERSAND', group: 'Logistik & Versand', role: 'Leiter/in Logistik', status: 'Freigegeben', version: '1.2', reviewInMonths: 8,
    description: 'Verpacken, Lieferpapiere erstellen und Spedition beauftragen.' },
  { title: 'Inventur durchführen', key: 'INVENTUR', group: 'Logistik & Versand', role: 'Leiter/in Logistik', status: 'Entwurf', version: '0.4', reviewInMonths: 2,
    description: 'Jährliche Stichtagsinventur planen, durchführen und auswerten.' },
  { title: 'Reklamation bearbeiten', key: 'REKLAMATION', group: 'Kundenservice', role: 'Qualitätsmanager/in', status: 'Freigegeben', version: '2.2', reviewInMonths: 5, ownerIsCurrentUser: true,
    description: 'Kundenreklamationen erfassen, Ursachen analysieren, Massnahmen umsetzen und Kunden informieren.', norm: `${ISO} Kap. 8.7, 10.2`,
    input: 'Reklamation des Kunden\nLieferdaten', output: 'Antwort an den Kunden\nKorrekturmassnahmen', kpi: 'Bearbeitungszeit < 10 Arbeitstage\nReklamationsquote < 0,5 %',
    diagram: DIAGRAM_COMPLAINT,
    documents: [{ name: 'Formular 8D-Report', type: 'Formular', format: 'pdf', status: 'approved' }, { name: 'Leitfaden Ursachenanalyse', type: 'Anleitung', format: 'pdf', status: 'pending' }] },
  { title: 'Ursache analysieren', key: 'URSACHE', group: 'Kundenservice', role: 'Qualitätsmanager/in', status: 'Freigegeben', version: '1.0', reviewInMonths: 9, parent: 'Reklamation bearbeiten',
    description: 'Ursachenanalyse mit 5-Why oder Ishikawa durchführen und dokumentieren.' },
  { title: 'Korrekturmassnahme umsetzen', key: 'KORREKTUR', group: 'Kundenservice', role: 'Leiter/in Produktion', status: 'In Prüfung', version: '0.9', reviewInMonths: 6, parent: 'Reklamation bearbeiten',
    description: 'Massnahmen zur Beseitigung der Ursache planen und umsetzen.' },

  // Unterstützung
  { title: 'Neue Mitarbeitende einführen', key: 'ONBOARDING', group: 'Personal', role: 'HR-Verantwortliche/r', status: 'Freigegeben', version: '1.6', reviewInMonths: 7,
    description: 'Einführung neuer Mitarbeitender von der Vertragsunterzeichnung bis zum Probezeitgespräch.', norm: `${ISO} Kap. 7.2, 7.3`,
    input: 'Unterzeichneter Arbeitsvertrag\nStellenbeschreibung', output: 'Eingeführte Mitarbeitende\nAbgeschlossene Schulungen', kpi: 'Arbeitsplatz am ersten Tag bereit 100 %',
    diagram: DIAGRAM_ONBOARDING,
    documents: [{ name: 'Einführungsplan Vorlage', type: 'Vorlage', format: 'pdf', status: 'approved' }, { name: 'Checkliste erster Arbeitstag', type: 'Checkliste', format: 'csv', status: 'approved' }] },
  { title: 'Mitarbeitende rekrutieren', key: 'REKRUTIERUNG', group: 'Personal', role: 'HR-Verantwortliche/r', status: 'Freigegeben', version: '1.1', reviewInMonths: 4,
    description: 'Stellenausschreibung, Auswahlverfahren und Vertragsabschluss.' },
  { title: 'Mitarbeitergespräche führen', key: 'MAG', group: 'Personal', role: 'HR-Verantwortliche/r', status: 'Entwurf', version: '0.5', reviewInMonths: 3,
    description: 'Jährliche Ziel- und Entwicklungsgespräche vorbereiten, führen und dokumentieren.' },
  { title: 'Monatsabschluss erstellen', key: 'MONATSABSCHLUSS', group: 'Finanzen & Controlling', role: 'Leiter/in Finanzen', status: 'Freigegeben', version: '1.3', reviewInMonths: 6,
    description: 'Buchungen abstimmen, Abgrenzungen erfassen und Monatsreporting erstellen.',
    input: 'Belege\nBankauszüge', output: 'Monatsreporting', kpi: 'Reporting bis 8. Arbeitstag',
    documents: [{ name: 'Abschlusskalender', type: 'Dokumentation', format: 'pdf', status: 'approved' }] },
  { title: 'Kreditoren bezahlen', key: 'KREDITOREN', group: 'Finanzen & Controlling', role: 'Leiter/in Finanzen', status: 'Freigegeben', version: '1.0', reviewInMonths: 11,
    description: 'Rechnungen prüfen, visieren und Zahlungen ausführen (Vier-Augen-Prinzip).' },
  { title: 'IT-Zugänge einrichten', key: 'IT-ZUGANG', group: 'Informatik', role: 'IT-Verantwortliche/r', status: 'Freigegeben', version: '1.2', reviewInMonths: 5, parent: 'Neue Mitarbeitende einführen',
    description: 'Benutzerkonto, Lizenzen, Geräte und Berechtigungen gemäss Rollenkonzept bereitstellen.' },
  { title: 'Datensicherung überwachen', key: 'BACKUP', group: 'Informatik', role: 'IT-Verantwortliche/r', status: 'Freigegeben', version: '2.0', reviewInMonths: 3,
    description: 'Tägliche Sicherungen kontrollieren und vierteljährlich Wiederherstellungstests durchführen.', norm: 'ISO/IEC 27001 A.8.13',
    kpi: 'Erfolgreiche Sicherungen > 99 %\nWiederherstellungstest pro Quartal' },
  { title: 'Berechtigungen überprüfen', key: 'BERECHTIGUNGEN', group: 'Informatik', role: 'IT-Verantwortliche/r', status: 'In Prüfung', version: '0.7', reviewInMonths: -1,
    description: 'Halbjährliche Rezertifizierung der Zugriffsrechte durch die Linienvorgesetzten.' },
  { title: 'Anlagen instand halten', key: 'INSTANDHALTUNG', group: 'Infrastruktur', role: 'Leiter/in Produktion', status: 'Freigegeben', version: '1.4', reviewInMonths: 8,
    description: 'Wartungsplan führen, Wartungen durchführen und Störungen beheben.', norm: `${ISO} Kap. 7.1.3`,
    documents: [{ name: 'Wartungsplan Maschinen', type: 'Checkliste', format: 'csv', status: 'approved' }] },
  { title: 'Prüfmittel überwachen', key: 'PRUEFMITTEL', group: 'Infrastruktur', role: 'Qualitätsmanager/in', status: 'Freigegeben', version: '1.0', reviewInMonths: 2,
    description: 'Prüfmittel kalibrieren, kennzeichnen und Kalibrierintervalle überwachen.', norm: `${ISO} Kap. 7.1.5` },
  { title: 'Verbesserungsvorschläge bearbeiten', key: 'IDEEN', group: 'Verbesserungsmanagement', role: 'Qualitätsmanager/in', status: 'Freigegeben', version: '1.1', reviewInMonths: 10,
    description: 'Ideen von Mitarbeitenden erfassen, bewerten, umsetzen und anerkennen.', norm: `${ISO} Kap. 10.3`,
    kpi: 'Anzahl Ideen pro Mitarbeitende/r und Jahr\nUmsetzungsquote' },
  { title: 'Risiken und Chancen bewerten', key: 'RISIKEN', group: 'Verbesserungsmanagement', role: 'Geschäftsleitung', status: 'In Prüfung', version: '0.6', reviewInMonths: 1,
    description: 'Risiken und Chancen jährlich identifizieren, bewerten und Massnahmen ableiten.', norm: `${ISO} Kap. 6.1` }
];

export const DEMO_DIAGRAMS: IBpmnDiagram[] = [DIAGRAM_ORDER, DIAGRAM_COMPLAINT, DIAGRAM_AUDIT, DIAGRAM_ONBOARDING, DIAGRAM_OFFER];
