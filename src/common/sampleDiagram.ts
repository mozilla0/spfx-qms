/** Neutrales BPMN-Beispieldiagramm «Kundenauftrag abwickeln» für die Beispieldaten. */
export const SAMPLE_DIAGRAM_SVG: string = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1300 460" width="1300" height="460" font-family="Segoe UI, Arial, sans-serif" font-size="12">
  <defs>
    <marker id="qmsArrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
      <path d="M0,0 L10,5 L0,10 z" fill="#3b4a5e"/>
    </marker>
  </defs>
  <rect x="0" y="0" width="1300" height="460" fill="#ffffff"/>
  <g id="pool">
    <rect x="10" y="10" width="1280" height="440" fill="#ffffff" stroke="#3b4a5e" stroke-width="1.5"/>
    <rect x="10" y="10" width="30" height="440" fill="#1f3a5f"/>
    <text x="25" y="230" fill="#ffffff" font-weight="600" text-anchor="middle" transform="rotate(-90 25 230)">Kundenauftrag abwickeln</text>
    <line x1="40" y1="150" x2="1290" y2="150" stroke="#3b4a5e"/>
    <line x1="40" y1="300" x2="1290" y2="300" stroke="#3b4a5e"/>
    <rect x="40" y="10" width="30" height="140" fill="#e8eef6" stroke="#3b4a5e"/>
    <text x="55" y="80" text-anchor="middle" transform="rotate(-90 55 80)">Vertrieb</text>
    <rect x="40" y="150" width="30" height="150" fill="#e8eef6" stroke="#3b4a5e"/>
    <text x="55" y="225" text-anchor="middle" transform="rotate(-90 55 225)">Finanzen</text>
    <rect x="40" y="300" width="30" height="150" fill="#e8eef6" stroke="#3b4a5e"/>
    <text x="55" y="375" text-anchor="middle" transform="rotate(-90 55 375)">Lager</text>
  </g>
  <g id="flows" fill="none" stroke="#3b4a5e" stroke-width="1.4" marker-end="url(#qmsArrow)">
    <path d="M128,80 L170,80"/>
    <path d="M240,110 L240,225 L350,225"/>
    <path d="M490,225 L522,225"/>
    <path d="M540,207 L540,80 L760,80"/>
    <path d="M558,225 L620,225"/>
    <path d="M770,225 L830,225 L830,110"/>
    <path d="M900,80 L950,80 L950,345"/>
    <path d="M1020,375 L1060,375"/>
    <path d="M1200,375 L1232,375"/>
  </g>
  <g id="startEvent">
    <circle cx="110" cy="80" r="18" fill="#e6f6fb" stroke="#3b4a5e" stroke-width="1.5"/>
    <text x="110" y="116" text-anchor="middle">Bestellung</text>
    <text x="110" y="130" text-anchor="middle">eingegangen</text>
  </g>
  <g id="endEvent">
    <circle cx="1250" cy="375" r="18" fill="#9cc0dc" stroke="#1f3a5f" stroke-width="3.5"/>
    <text x="1250" y="411" text-anchor="middle">Auftrag</text>
    <text x="1250" y="425" text-anchor="middle">ausgeliefert</text>
  </g>
  <g id="gateway" stroke="#1f6fb2" stroke-width="1.5">
    <path d="M540,207 L558,225 L540,243 L522,225 z" fill="#ffffff"/>
    <path d="M534,219 L546,231 M546,219 L534,231" stroke-width="2"/>
  </g>
  <text x="540" y="264" text-anchor="middle" font-weight="600">Bonität</text>
  <text x="540" y="278" text-anchor="middle" font-weight="600">in Ordnung?</text>
  <text x="548" y="140" fill="#3b4a5e">Ja</text>
  <text x="572" y="217" fill="#3b4a5e">Nein</text>
  <g id="tasks" fill="#ffffff" stroke="#1f6fb2" stroke-width="1.5">
    <g><rect x="170" y="50" width="140" height="60" rx="10"/><text x="240" y="77" text-anchor="middle" stroke="none" fill="#1b2a41">Auftrag</text><text x="240" y="92" text-anchor="middle" stroke="none" fill="#1b2a41">erfassen</text></g>
    <g><rect x="350" y="195" width="140" height="60" rx="10"/><text x="420" y="229" text-anchor="middle" stroke="none" fill="#1b2a41">Bonität prüfen</text></g>
    <g><rect x="620" y="195" width="150" height="60" rx="10"/><text x="695" y="222" text-anchor="middle" stroke="none" fill="#1b2a41">Vorauszahlung</text><text x="695" y="237" text-anchor="middle" stroke="none" fill="#1b2a41">anfordern</text></g>
    <g><rect x="760" y="50" width="140" height="60" rx="10"/><text x="830" y="77" text-anchor="middle" stroke="none" fill="#1b2a41">Auftrags-</text><text x="830" y="92" text-anchor="middle" stroke="none" fill="#1b2a41">bestätigung versenden</text></g>
    <g><rect x="880" y="345" width="140" height="60" rx="10"/><text x="950" y="372" text-anchor="middle" stroke="none" fill="#1b2a41">Ware</text><text x="950" y="387" text-anchor="middle" stroke="none" fill="#1b2a41">kommissionieren</text></g>
    <g><rect x="1060" y="345" width="140" height="60" rx="10"/><text x="1130" y="372" text-anchor="middle" stroke="none" fill="#1b2a41">Lieferung</text><text x="1130" y="387" text-anchor="middle" stroke="none" fill="#1b2a41">versenden</text></g>
  </g>
</svg>`;
