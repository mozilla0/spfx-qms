/** URL-Konventionen der QMS-Seiten. */
export function defaultProcessPageUrl(webAbsoluteUrl: string): string {
  return `${webAbsoluteUrl.replace(/\/$/, '')}/SitePages/Prozess.aspx`;
}

export function defaultMapPageUrl(webAbsoluteUrl: string): string {
  return `${webAbsoluteUrl.replace(/\/$/, '')}/SitePages/Prozesslandkarte.aspx`;
}

export function withParam(url: string, name: string, value: string | number): string {
  const separator: string = url.indexOf('?') >= 0 ? '&' : '?';
  return `${url}${separator}${name}=${encodeURIComponent(String(value))}`;
}

export function processUrl(pageUrl: string, processId: number): string {
  return withParam(pageUrl, 'pid', processId);
}

export function fileOpenUrl(serverRelativeUrl: string, extension: string): string {
  const office: string[] = ['doc', 'docx', 'xls', 'xlsx', 'xlsm', 'ppt', 'pptx', 'vsdx'];
  return office.indexOf(extension) >= 0 ? `${serverRelativeUrl}?web=1` : serverRelativeUrl;
}

/** Normalisiert Texte für Vergleiche (Diagramm-Beschriftung ↔ Prozessname). */
export function normalizeLabel(value: string): string {
  return value
    .toLowerCase()
    .replace(/-\s+/g, '')
    .replace(/­/g, '')
    .replace(/[\s ]+/g, ' ')
    .trim();
}
