/** Ablageort der Protokolldatei, in der die angelegten Demodaten festgehalten werden. */
export const DEMO_MANIFEST_NAME: string = 'qms-demodaten.json';

export function demoManifestUrl(webServerRelativeUrl: string): string {
  return `${webServerRelativeUrl.replace(/\/$/, '')}/SiteAssets/${DEMO_MANIFEST_NAME}`;
}

export interface IDemoManifest {
  created: string;
  roles: number[];
  groups: number[];
  processes: number[];
  files: string[];
}
