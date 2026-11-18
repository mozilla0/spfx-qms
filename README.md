# QMS Prozesslandkarte (SPFx)

Qualitätsmanagementsystem für SharePoint Online. Die Prozesslandkarte entsteht automatisch aus den Stammdaten
(Listen und Managed Metadata), Prozessdiagramme werden aus BPMN-SVG-Dateien dargestellt. Alle Webparts lesen
direkt über die Listen-REST-API – **kein Suchindex**, Änderungen sind sofort sichtbar.

| | |
|---|---|
| SPFx | 1.24.1 (Heft-Build) |
| Node | 22 LTS (`>=22.14 <23`) |
| Abhängigkeiten | React 18, PnPjs 4.23 |
| API-Berechtigungen | keine (nur SharePoint im Benutzerkontext) |

## Webparts (Gruppe «QMS» in der Toolbox)

| Webpart | Zweck |
|---|---|
| **QMS Prozesslandkarte** | Bänder je Prozesskategorie (Führung / Kern als Wertschöpfungskette / Unterstützung), Prozessgruppen als Chevrons, Detailbereich mit Prozessen, Suche, Kundenrahmen. `?group=<ID>` wählt eine Gruppe vor. |
| **QMS Prozess-Informationen** | Kopf der Prozessseite: Status, Version, Brotkrumen, Eigner, Rolle inkl. Rolleninhaber, Gültigkeit, Überprüfung (überfällig-Hinweis), Normbezug, Input → Prozess → Output, Kennzahlen. |
| **QMS Prozessdiagramm (BPMN)** | Lädt das SVG des Prozesses, entfernt aktive Inhalte, Zoom/Verschieben/Vollbild/Tastatur. Aktivitäten, deren Beschriftung einem Prozess entspricht, werden **automatisch klickbar** (auch mehrzeilig, z. B. «Kreditkarten- / buchungen erfassen»). Mehrere Diagramme → Tabs. |
| **QMS Sub-Prozesse** | Unterprozesse über «Übergeordneter Prozess», nummeriert nach Reihenfolge. |
| **QMS Prozessdokumente** | Dokumente des Prozesses, gruppiert nach Dokumenttyp, mit Freigabestatus und Filter «Nur freigegebene». |
| **QMS Einrichtung** | Prüft und erstellt Listen, Spalten, Term Set, Beispieldaten und Seiten (idempotent). |

Alle Webparts nutzen dasselbe Design-System (`src/common/ui`): Farben aus dem Site-Theme, gleiche Karten, Chips,
Buttons, Leer-/Lade-/Fehlerzustände und Icons.

Der Prozess wird auf der Prozessseite über `?pid=` bestimmt – Element-ID **oder** Prozess-ID
(z. B. `Prozess.aspx?pid=AUFTRAG`).

## Datenmodell (wird vom Webpart «QMS Einrichtung» angelegt)

Interne Spaltennamen sind mit `Qms` präfixiert und haben fixe IDs – keine Kollision mit bestehenden Spalten.

- **Term Set** `QMS › Prozesskategorien`: Führungsprozesse, Kernprozesse, Unterstützungsprozesse.
  Term-Eigenschaften `QmsOrder` (Reihenfolge) und `QmsStyle` (`core` = Wertschöpfungskette).
  Alternativ Modus «Auswahlspalte» ohne Term Store.
- **QMS Rollen** (`Lists/QmsRollen`): Rolleninhaber, Beschreibung
- **QMS Prozessgruppen** (`Lists/QmsProzessgruppen`): Prozesskategorie (MMS), Reihenfolge, verantwortliche Rolle, Beschreibung
- **QMS Prozesse** (`Lists/QmsProzesse`): Prozess-ID, Beschreibung, Prozessgruppe, übergeordneter Prozess, Rolle,
  Prozesseigner, Reihenfolge, Status, Version, Gültig ab, nächste Überprüfung, Input, Output, Kennzahlen, Normbezug
- **QMS Prozessdokumente** (`QmsProzessdokumente`): Prozess, Dokumenttyp (Diagramm, Anleitung, …), Rolle;
  Haupt-/Nebenversionen und Inhaltsgenehmigung aktiv

## Build & Deployment

```bash
nvm use 22
npm ci
npm run build            # erzeugt sharepoint/solution/qms-spfx.sppkg
```

```powershell
./scripts/Deploy-Qms.ps1 -TenantAdminUrl https://<tenant>-admin.sharepoint.com `
  -SiteUrl https://<tenant>.sharepoint.com/sites/qms -ClientId <app-id> -Interactive -WhatIf
```

Danach auf der QMS-Site:

1. Seite anlegen, Webpart **QMS Einrichtung** einfügen.
2. **QMS einrichten** – für Managed Metadata braucht es Term-Store-Admin-Rechte, alternativ eine bestehende
   Term-Set-ID eintragen oder den Modus «Auswahlspalte» wählen.
3. Optional **Demodaten anlegen** (nur bei leerer Prozessgruppen-Liste), siehe unten.
4. **Seiten erstellen** – legt `Prozesslandkarte.aspx` und `Prozess.aspx` mit allen Webparts an.

## Demodaten

Fiktive Musterfirma (Handel/Produktion), definiert in `src/common/demo/demoData.ts`:

- 8 Rollen – «Geschäftsleitung» und «Qualitätsmanager/in» mit dem ausführenden Benutzer als Rolleninhaber
- 15 Prozessgruppen in den drei Kategorien
- 36 Prozesse, davon 8 Sub-Prozesse, mit Status, Version, Normbezug, Input/Output, Kennzahlen;
  einige Überprüfungstermine bewusst überfällig, mehrere Prozesse mit dem ausführenden Benutzer als Eigner
- 5 BPMN-Diagramme (SVG, aus `bpmnBuilder.ts` erzeugt) mit klickbaren Sub-Prozessen:
  Kundenauftrag abwickeln, Reklamation bearbeiten, Interne Audits durchführen, Neue Mitarbeitende einführen, Offerte erstellen
- 21 Dokumente (PDF und CSV) mit gemischtem Freigabestatus (freigegeben, ausstehend, Entwurf)

Die Demodaten werden **nur auf Knopfdruck** angelegt. Der Code dafür (Daten, BPMN- und PDF-Generator) liegt in einem
eigenen Chunk (`qms-demo`), der erst beim Klick nachgeladen wird – die Webparts für Leser laden ihn nie.
Alle angelegten Elemente werden in `SiteAssets/qms-demodaten.json` protokolliert. **Demodaten entfernen** verschiebt
genau diese Elemente in den Papierkorb; eigene Daten bleiben unberührt.

## BPMN-Diagramme

- Export aus draw.io, bpmn.io, Signavio, Visio o. ä. als **SVG**, in «QMS Prozessdokumente» hochladen,
  Prozess setzen, Dokumenttyp «Diagramm».
- Script-Elemente, Event-Handler und `javascript:`-Links werden vor der Anzeige entfernt.
- Sub-Prozess-Verknüpfung: Beschriftung der Aktivität = Titel oder Prozess-ID eines Prozesses.

## Lokale Entwicklung

```bash
npm start                # heft start, Workbench: https://<tenant>.sharepoint.com/_layouts/15/workbench.aspx
```
