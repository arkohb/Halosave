import { updateNav } from './nav.ts';
import { providersList } from '../domain/investment.ts';

// ---------------------------------------------------------------------------
// NAV ingestion (automation hook)
//
// Ghanaian fund managers (Databank MFund, EDC, Stanbic, etc.) publish NAVs
// daily/weekly on their own sites and via GSE/SEC Ghana — there is no single
// public API. So real NAV data enters the system one of two ways:
//
//   1. MANUAL (default): an admin posts the published NAV via
//      PUT /api/admin/fund-providers/:id/nav   (calls updateNav()).
//
//   2. AUTOMATED: implement a source below (an official fund API if you get
//      one, a licensed market-data vendor, or a scheduled scraper you are
//      permitted to run) and call fetchAndStoreNavs() from a cron/worker.
//
// This stub intentionally does NOT invent NAVs. Until you wire a real source,
// it returns an empty result and the system keeps using the last admin-entered
// (or placeholder) values.
// ---------------------------------------------------------------------------

export interface NavQuote {
  providerId: string;
  nav: number;
  apy?: number;
  navDate?: Date;
}

/**
 * Plug a real data source in here. Examples of where to integrate:
 *   - an official fund-manager endpoint (if provided under contract)
 *   - a licensed market-data API
 *   - a permitted scheduled scraper of published NAV pages
 * Return one NavQuote per provider you can source. Unsourced providers are
 * simply left untouched.
 */
async function fetchQuotesFromSource(): Promise<NavQuote[]> {
  const sourceUrl = process.env.NAV_SOURCE_URL;
  if (!sourceUrl) return []; // no source configured -> no-op

  // TODO: implement the real fetch + parse for your chosen source, e.g.:
  // const res = await fetch(sourceUrl, { headers: { Authorization: `Bearer ${process.env.NAV_SOURCE_KEY}` } });
  // const data = await res.json();
  // return data.map((d: any) => ({ providerId: d.id, nav: d.nav, apy: d.apy, navDate: new Date(d.date) }));
  return [];
}

/** Fetch from the configured source (if any) and persist via updateNav(). */
export async function fetchAndStoreNavs(): Promise<{ updated: string[]; skipped: string[] }> {
  const quotes = await fetchQuotesFromSource();
  const updated: string[] = [];
  for (const q of quotes) {
    if (!providersList.find((p) => p.id === q.providerId)) continue;
    await updateNav(q.providerId, q.nav, { apy: q.apy, navDate: q.navDate, source: 'api' });
    updated.push(q.providerId);
  }
  const skipped = providersList.map((p) => p.id).filter((id) => !updated.includes(id));
  return { updated, skipped };
}
