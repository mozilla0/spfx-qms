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

/**
 * Minimaler, beim Initialisieren gesicherter Kontext für das PnPjs-SPFx-Behavior.
 * PnPjs liest bei jedem Schreibzugriff (Form-Digest) `context.pageContext.web.absoluteUrl`.
 * Unter SPFx 1.24 ist `pageContext` auf dem Webpart-Kontext zu diesem Zeitpunkt nicht
 * zuverlässig verfügbar («Cannot read properties of undefined (reading 'web')»),
 * deshalb wird hier eine unveränderliche Momentaufnahme übergeben.
 */
interface ISpfxContextSnapshot {
  pageContext: {
    web: { absoluteUrl: string };
    legacyPageContext?: { formDigestValue?: string; formDigestTimeoutSeconds?: number };
  };
}

function snapshot(context: WebPartContext, siteUrl: string): ISpfxContextSnapshot {
  const page = context.pageContext;
  const currentWeb: string = page.web.absoluteUrl.replace(/\/+$/, '');
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  const legacy: any = page.legacyPageContext;
  return {
    pageContext: {
      web: { absoluteUrl: siteUrl },
      // Das Digest der Seite gilt nur für die eigene Site; für andere Sites holt PnPjs selbst eines.
      legacyPageContext: siteUrl.toLowerCase() === currentWeb.toLowerCase() && legacy
        ? { formDigestValue: legacy.formDigestValue, formDigestTimeoutSeconds: legacy.formDigestTimeoutSeconds }
        : undefined
    }
  };
}

/** Liefert eine PnPjs-Instanz für die QMS-Site (Standard: aktuelle Site). */
export function getSP(context: WebPartContext, siteUrl?: string): SPFI {
  const url: string = normalizeSiteUrl(siteUrl) || context.pageContext.web.absoluteUrl.replace(/\/+$/, '');
  let sp: SPFI | undefined = instances.get(url);
  if (!sp) {
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    sp = spfi(url).using(SPFx(snapshot(context, url) as any));
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
