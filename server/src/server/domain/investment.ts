export interface InvestmentProvider {
  id: string;
  name: string;
  annualReturn: number;
  createInvestment(userId: string, amount: number, nav: number): { units: number };
  topUpInvestment(existingUnits: number, amount: number, nav: number): { totalUnits: number };
  redeemInvestment(units: number, nav: number): { payoutAmount: number };
  getInvestmentValue(units: number, nav: number): number;
  calculateReturns(initialAmount: number, currentValuation: number): { profit: number; percentage: number };
}

export class BaseInvestmentProvider implements InvestmentProvider {
  constructor(public id: string, public name: string, public annualReturn: number) {}

  createInvestment(userId: string, amount: number, nav: number) {
    return { units: Number((amount / nav).toFixed(4)) };
  }
  topUpInvestment(existingUnits: number, amount: number, nav: number) {
    return { totalUnits: Number((existingUnits + Number((amount / nav).toFixed(4))).toFixed(4)) };
  }
  redeemInvestment(units: number, nav: number) {
    return { payoutAmount: Number((units * nav).toFixed(2)) };
  }
  getInvestmentValue(units: number, nav: number): number {
    return Number((units * nav).toFixed(2));
  }
  calculateReturns(initialAmount: number, currentValuation: number) {
    const profit = Math.max(0, Number((currentValuation - initialAmount).toFixed(2)));
    const percentage = initialAmount > 0 ? Number(((profit / initialAmount) * 100).toFixed(2)) : 0;
    return { profit, percentage };
  }
}

export class DatabankMFundProvider extends BaseInvestmentProvider {
  constructor() {
    super('DATABANK_MFUND', 'Databank MFund (Tier-1)', 19.2);
  }
}

export class EDCFixedIncomeProvider extends BaseInvestmentProvider {
  constructor() {
    super('EDC_FIXED_INCOME', 'EDC Fixed Income Fund', 20.5);
  }
}

export class StanbicCashTrustProvider extends BaseInvestmentProvider {
  constructor() {
    super('STANBIC_CASH_TRUST', 'Stanbic Cash Trust', 18.0);
  }
}

export class VanguardHaloSaveProvider extends BaseInvestmentProvider {
  constructor() {
    super('VANGUARD_HALOSAVE_FUND', 'Vanguard HaloSave Growth Fund', 12.8);
  }
}

export const providersList = [
  {
    id: 'DATABANK_MFUND',
    name: 'Databank MFund (Tier-1 Licensed)',
    pricingModel: 'NAV_UNIT',
    currentNAV: 2.4815,
    annualReturnPercentage: 19.2,
    dailyGrowthRate: 0.0526,
    managementFeePercentage: 1.0,
    historicalNAVs: [2.3521, 2.3812, 2.4045, 2.4310, 2.4560, 2.4815]
  },
  {
    id: 'EDC_FIXED_INCOME',
    name: 'EDC Fixed Income Fund (Tier-1 Licensed)',
    pricingModel: 'FIXED_INCOME',
    accrual: 'simple',
    currentNAV: 1.5200,
    annualReturnPercentage: 20.5,
    dailyGrowthRate: 0.0561,
    managementFeePercentage: 1.5,
    historicalNAVs: [1.4210, 1.4420, 1.4650, 1.4810, 1.5010, 1.5200]
  },
  {
    id: 'STANBIC_CASH_TRUST',
    name: 'Stanbic Cash Trust (Tier-1 Licensed)',
    pricingModel: 'NAV_UNIT',
    currentNAV: 3.1200,
    annualReturnPercentage: 18.0,
    dailyGrowthRate: 0.0493,
    managementFeePercentage: 1.2,
    historicalNAVs: [2.9810, 3.0120, 3.0450, 3.0720, 3.0950, 3.1200]
  },
  {
    id: 'VANGUARD_HALOSAVE_FUND',
    name: 'Vanguard HaloSave Growth Fund (Tier-1 Licensed)',
    pricingModel: 'NAV_UNIT',
    currentNAV: 10.4500,
    annualReturnPercentage: 12.8,
    dailyGrowthRate: 0.0351,
    managementFeePercentage: 0.75,
    historicalNAVs: [9.8510, 9.9920, 10.1200, 10.2210, 10.3540, 10.4500]
  }
];

export const simulationConfig = {
  providerName: 'Databank MFund (Tier-1 Licensed)',
  currentNAV: 2.4815,
  annualReturnPercentage: 19.2,
  dailyGrowthRate: 0.0526, // % daily compounding
  managementFeePercentage: 1.0,
  compoundingFrequency: 'daily' as const,
  redemptionDelayHours: 0,
  lastValuationDate: new Date().toISOString(),
  providers: providersList
};

export const featureFlags = {
  investmentEngine: true,
  loans: false,
  insurance: false,
  groupSavings: true,
  corporateSavings: false,
  aiCoach: true,
  referrals: true,
  treasuryBills: true,
};
