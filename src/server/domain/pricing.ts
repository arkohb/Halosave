// ---------------------------------------------------------------------------
// Pricing engine
//
// Supports two product types, selected per provider via `pricingModel`:
//
//   NAV_UNIT      Mutual-fund / money-market unit trust priced at a NAV.
//                 Deposit buys units (amount / NAV); value = units * currentNAV.
//                 (Databank MFund, Stanbic Cash Trust, Vanguard HaloSave, ...)
//
//   FIXED_INCOME  Principal locked at a fixed annual rate for a tenor.
//                 No units; value accrues over time from lockedAt to maturity.
//                 Interest stops accruing at maturity (a held-past-maturity
//                 fixed deposit does not keep earning until rolled over).
//                 (EDC Fixed Income Fund, T-bill style products, ...)
//
// Each tranche stores the model + locked rate it was opened under, so a later
// change to a provider's rate never retroactively re-prices existing money.
// ---------------------------------------------------------------------------

export type PricingModel = 'NAV_UNIT' | 'FIXED_INCOME';
export type Accrual = 'simple' | 'compound';

const MS_PER_YEAR = 365 * 24 * 3600 * 1000;

export interface ProviderPricing {
  id: string;
  pricingModel: PricingModel;
  currentNAV: number;
  annualReturnPercentage: number;
  accrual?: Accrual;
}

/**
 * Compute what to persist on a tranche when opening a position.
 * Returns string-typed values ready for the numeric DB columns.
 */
export function openPosition(p: ProviderPricing, amount: number) {
  if (p.pricingModel === 'FIXED_INCOME') {
    return {
      pricingModel: 'FIXED_INCOME' as PricingModel,
      // store principal in `units` for schema continuity; not used for valuation
      units: amount.toFixed(2),
      purchaseNav: '1',
      lockedRate: Number(p.annualReturnPercentage).toFixed(4),
    };
  }
  const units = Number((amount / p.currentNAV).toFixed(4));
  return {
    pricingModel: 'NAV_UNIT' as PricingModel,
    units: units.toString(),
    purchaseNav: p.currentNAV.toString(),
    lockedRate: null as string | null,
  };
}

export interface ValuationInput {
  pricingModel?: PricingModel | null;
  principal: number;            // tranche.amount
  units: number;                // tranche.units
  lockedRate?: number | null;   // tranche.lockedRate (annual %)
  lockedAt: Date | string;
  maturesAt: Date | string;
  currentNAV: number;           // provider live NAV (NAV_UNIT only)
  accrual?: Accrual;
  now?: Date;
}

/** Current value of a tranche under its own pricing model. */
export function valueTranche(input: ValuationInput): number {
  const now = input.now ?? new Date();
  const model: PricingModel = input.pricingModel === 'FIXED_INCOME' ? 'FIXED_INCOME' : 'NAV_UNIT';

  if (model === 'FIXED_INCOME') {
    const rate = (Number(input.lockedRate) || 0) / 100;
    const lockedAtMs = new Date(input.lockedAt).getTime();
    const maturesAtMs = new Date(input.maturesAt).getTime();
    // Accrue only up to maturity.
    const endMs = Math.min(now.getTime(), maturesAtMs);
    const years = Math.max(0, endMs - lockedAtMs) / MS_PER_YEAR;
    const value = input.accrual === 'compound'
      ? input.principal * Math.pow(1 + rate, years)
      : input.principal * (1 + rate * years);
    return Number(value.toFixed(2));
  }

  // NAV_UNIT
  return Number((input.units * input.currentNAV).toFixed(2));
}

/** Profit/return helper, valid for both models. */
export function computeReturns(principal: number, currentValue: number) {
  const profit = Number((currentValue - principal).toFixed(2));
  const percentage = principal > 0 ? Number(((profit / principal) * 100).toFixed(2)) : 0;
  return { profit: Math.max(0, profit), percentage: Math.max(0, percentage) };
}
