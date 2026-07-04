import { db } from '../../db/index.ts';
import { fundProviders } from '../../db/schema.ts';
import { providersList } from '../domain/investment.ts';

// ---------------------------------------------------------------------------
// NAV service
//
// Authoritative source of fund NAV + APY for all real money math
// (units purchased on deposit, payout value on withdrawal/maturity).
//
// Reads from the `fund_providers` table. If a provider has no row yet, it
// falls back to the placeholder constants in domain/investment.ts so the app
// keeps working before any real NAV has been entered. Values are cached for a
// short window to avoid hitting the DB on every valuation.
// ---------------------------------------------------------------------------

const CACHE_TTL_MS = 60 * 1000;
let cache: { rows: any[]; at: number } | null = null;

async function loadAll(): Promise<any[]> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.rows;
  let rows: any[] = [];
  try {
    rows = await db.select().from(fundProviders);
  } catch {
    // Table may not exist yet (pre-migration) — degrade to placeholders.
    rows = [];
  }
  cache = { rows, at: Date.now() };
  return rows;
}

export function invalidateNavCache() {
  cache = null;
}

function placeholder(id?: string) {
  return providersList.find((p) => p.id === id) || providersList[0];
}

/** Authoritative current NAV for a provider (live DB value, else placeholder). */
export async function getNav(providerId?: string): Promise<number> {
  const id = providerId || 'DATABANK_MFUND';
  const rows = await loadAll();
  const row = rows.find((r) => r.id === id);
  if (row && row.currentNav != null) return Number(row.currentNav);
  return placeholder(id).currentNAV;
}

/** Full provider record, marked isLive=true when backed by a real DB row. */
export async function getProviderData(providerId?: string) {
  const id = providerId || 'DATABANK_MFUND';
  const rows = await loadAll();
  const row = rows.find((r) => r.id === id);
  const base = placeholder(id);
  if (row && row.currentNav != null) {
    return {
      id: row.id,
      name: row.name || base.name,
      currentNAV: Number(row.currentNav),
      annualReturnPercentage: row.apy != null ? Number(row.apy) : base.annualReturnPercentage,
      managementFeePercentage: row.managementFee != null ? Number(row.managementFee) : base.managementFeePercentage,
      historicalNAVs: base.historicalNAVs,
      pricingModel: row.pricingModel || (base as any).pricingModel || 'NAV_UNIT',
      accrual: row.accrual || (base as any).accrual || 'simple',
      source: row.source || 'manual',
      navDate: row.navDate || null,
      updatedAt: row.updatedAt || null,
      isLive: true,
    };
  }
  return {
    ...base,
    pricingModel: (base as any).pricingModel || 'NAV_UNIT',
    accrual: (base as any).accrual || 'simple',
    source: 'placeholder',
    navDate: null,
    updatedAt: null,
    isLive: false,
  };
}

export async function getAllProviderData() {
  return Promise.all(providersList.map((p) => getProviderData(p.id)));
}

/** Upsert a real NAV (and optionally APY) for a provider. Returns the live record. */
export async function updateNav(
  providerId: string,
  nav: number,
  opts: { apy?: number; navDate?: Date; source?: string; pricingModel?: string; accrual?: string } = {},
) {
  if (!providerId) throw new Error('providerId is required.');
  if (!(nav > 0)) throw new Error('NAV must be a positive number.');

  const base = placeholder(providerId);
  const source = opts.source || 'manual';
  const navDate = opts.navDate || new Date();

  await db
    .insert(fundProviders)
    .values({
      id: providerId,
      name: base.name,
      currentNav: nav.toString(),
      apy: (opts.apy ?? base.annualReturnPercentage).toString(),
      managementFee: base.managementFeePercentage.toString(),
      pricingModel: opts.pricingModel || (base as any).pricingModel || 'NAV_UNIT',
      accrual: opts.accrual || (base as any).accrual || 'simple',
      source,
      navDate,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: fundProviders.id,
      set: {
        currentNav: nav.toString(),
        ...(opts.apy != null ? { apy: opts.apy.toString() } : {}),
        ...(opts.pricingModel ? { pricingModel: opts.pricingModel } : {}),
        ...(opts.accrual ? { accrual: opts.accrual } : {}),
        source,
        navDate,
        updatedAt: new Date(),
      },
    });

  invalidateNavCache();
  return getProviderData(providerId);
}
