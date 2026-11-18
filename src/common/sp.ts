import { spfi, SPFI, SPFx } from '@pnp/sp';
import '@pnp/sp/webs';
import '@pnp/sp/lists';
import '@pnp/sp/items';
import '@pnp/sp/fields';
import '@pnp/sp/views';
import '@pnp/sp/files';
import '@pnp/sp/folders';
import '@pnp/sp/security';
import '@pnp/sp/site-users/web';
import '@pnp/sp/clientside-pages';
import { WebPartContext } from '@microsoft/sp-webpart-base';

const instances: Map<string, SPFI> = new Map<string, SPFI>();

/** Liefert eine PnPjs-Instanz für die QMS-Site (Standard: aktuelle Site). */
export function getSP(context: WebPartContext, siteUrl?: string): SPFI {
  const url: string = normalizeSiteUrl(siteUrl) || context.pageContext.web.absoluteUrl;
  let sp: SPFI | undefined = instances.get(url);
  if (!sp) {
    sp = spfi(url).using(SPFx(context));
    instances.set(url, sp);
  }
  return sp;
}

export function normalizeSiteUrl(url?: string): string | undefined {
  if (!url) {
    return undefined;
  }
  const trimmed: string = url.trim().replace(/\/+$/, '');
  return trimmed.length > 0 ? trimmed : undefined;
}
