import { buildPdf, IPdfBlock } from './pdfBuilder';
import { IDemoDocument, IDemoProcess, DEMO_PROCESSES } from './demoData';

export interface IDemoFile {
  fileName: string;
  content: ArrayBuffer | string;
}

function lines(value?: string): string[] {
  return (value || '').split('\n').map(s => s.trim()).filter(Boolean);
}

/** Ablaufschritte: Aktivitäten des Diagramms oder die Sub-Prozesse. */
function steps(process: IDemoProcess): string[] {
  if (process.diagram) {
    return process.diagram.nodes.filter(n => n.type === 'task').map(n => n.label);
  }
  const subs: string[] = DEMO_PROCESSES.filter(p => p.parent === process.title).map(p => p.title);
  return subs.length > 0 ? subs : ['Auslöser prüfen und Auftrag annehmen', 'Arbeit gemäss Vorgaben ausführen', 'Ergebnis kontrollieren', 'Ergebnis dokumentieren und ablegen'];
}

function checklistItems(process: IDemoProcess, doc: IDemoDocument): string[] {
  if (/versand/i.test(doc.name)) {
    return ['Lieferschein mit Auftrag abgeglichen', 'Ware vollständig und unbeschädigt', 'Verpackung gemäss Vorgabe', 'Versandpapiere beigelegt', 'Spedition avisiert', 'Versand im System gebucht'];
  }
  if (/arbeitstag/i.test(doc.name)) {
    return ['Begrüssung durch Vorgesetzte/n', 'Arbeitsplatz und Geräte übergeben', 'Zugänge getestet', 'Rundgang und Vorstellung im Team', 'Sicherheitsinstruktion', 'Einführungsplan besprochen'];
  }
  if (/wartung/i.test(doc.name)) {
    return ['Schmierstellen kontrolliert', 'Filter gereinigt/ersetzt', 'Sicherheitseinrichtungen geprüft', 'Verschleissteile kontrolliert', 'Wartung im Logbuch eingetragen'];
  }
  if (/audit/i.test(doc.name)) {
    return ['Prozessbeschreibung aktuell', 'Verantwortlichkeiten bekannt', 'Kennzahlen erhoben und ausgewertet', 'Aufzeichnungen vollständig', 'Massnahmen aus letztem Audit umgesetzt', 'Risiken des Prozesses bewertet'];
  }
  return steps(process).map(s => `${s} erledigt`);
}

function buildCsv(process: IDemoProcess, doc: IDemoDocument): string {
  const header: string = doc.type === 'Nachweis' ? 'Nr.;Prüfmerkmal;Sollwert;Istwert;i. O.;Visum' : 'Nr.;Prüfpunkt;Erledigt;Bemerkung;Visum';
  const items: string[] = doc.type === 'Nachweis'
    ? ['Masshaltigkeit;gemäss Zeichnung', 'Oberfläche;ohne Kratzer', 'Funktion;100 % geprüft', 'Kennzeichnung;vorhanden', 'Verpackung;gemäss Vorgabe']
    : checklistItems(process, doc);
  const rows: string[] = items.map((item, i) => doc.type === 'Nachweis' ? `${i + 1};${item};;;` : `${i + 1};${item};;;`);
  return '﻿' + [`${doc.name} – ${process.title}`, '', header].concat(rows).join('\r\n') + '\r\n';
}

function buildPdfDoc(process: IDemoProcess, doc: IDemoDocument): ArrayBuffer {
  const blocks: IPdfBlock[] = [
    { kind: 'meta', text: `${doc.type} · Prozess ${process.key} · Version ${process.version}` },
    { kind: 'title', text: doc.name },
    { kind: 'subtitle', text: process.title }
  ];
  const add = (kind: IPdfBlock['kind'], text?: string): void => { blocks.push({ kind, text }); };

  add('heading', '1  Zweck');
  add('text', `${process.description} Dieses Dokument beschreibt das verbindliche Vorgehen und ist Teil des Qualitätsmanagementsystems.`);
  add('heading', '2  Geltungsbereich');
  add('text', `Gilt für alle Mitarbeitenden, die am Prozess «${process.title}» beteiligt sind.${process.norm ? ` Normbezug: ${process.norm}.` : ''}`);
  add('heading', '3  Verantwortung');
  add('bullet', `Prozessverantwortung: ${process.role}`);
  add('bullet', 'Durchführung: beteiligte Mitarbeitende gemäss Ablauf');
  add('bullet', 'Prüfung und Freigabe: Qualitätsmanager/in');

  if (doc.type === 'Formular' || doc.type === 'Vorlage') {
    add('heading', '4  Angaben');
    ['Datum', 'Erstellt durch', 'Betroffener Auftrag / Bereich', 'Beschreibung', 'Massnahmen', 'Termin', 'Visum Verantwortliche/r']
      .forEach(f => add('text', `${f}:  ____________________________________________`));
  } else {
    add('heading', '4  Ablauf');
    steps(process).forEach((s, i) => add('bullet', `Schritt ${i + 1}: ${s}`));
    if (process.input || process.output) {
      add('heading', '5  Input und Output');
      lines(process.input).forEach(l => add('bullet', `Input: ${l}`));
      lines(process.output).forEach(l => add('bullet', `Output: ${l}`));
    }
    if (process.kpi) {
      add('heading', '6  Kennzahlen');
      lines(process.kpi).forEach(l => add('bullet', l));
    }
    add('heading', 'Mitgeltende Unterlagen');
    add('text', `Prozessdiagramm «${process.title}» und weitere Dokumente in der Bibliothek «QMS Prozessdokumente».`);
  }
  add('spacer');
  add('meta', 'Demodokument – automatisch erzeugt durch die QMS-Einrichtung.');
  return buildPdf(blocks, `${process.title} · ${doc.name}`);
}

export function buildDemoFile(process: IDemoProcess, doc: IDemoDocument): IDemoFile {
  const safe: string = doc.name.replace(/[\\/:*?"<>|#%]/g, '').replace(/\s+/g, '-');
  return doc.format === 'csv'
    ? { fileName: `${safe}.csv`, content: buildCsv(process, doc) }
    : { fileName: `${safe}.pdf`, content: buildPdfDoc(process, doc) };
}
