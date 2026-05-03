export type DashboardMetric = {
  label: string;
  value: string;
  tone?: "default" | "positive" | "negative";
};

export type AppView =
  | "dashboard"
  | "settings"
  | "archived-accounts"
  | "prop-firms"
  | "prop-firm"
  | "prop-firm-rule"
  | "account"
  | "trading-day"
  | "expense"
  | "payout"
  | "exchange-rates"
  | `account:${string}`;

export type SelectOption = {
  id: string;
  label: string;
  propFirmId?: string;
};

export type AppData = {
  currentUser: {
    id: string;
    name: string;
    email: string;
    role: string;
    themePreference: "LIGHT" | "DARK";
  };
  metrics: {
    activeAccountsCount: number;
    totalProfitLossUsd: number;
    totalProfitLossEur: number | null;
    monthlyProfitLossUsd: number;
    monthlyProfitLossEur: number | null;
    totalExpensesUsd: number;
    totalPayoutsUsd: number;
    netResultUsd: number;
    netResultEur: number | null;
    latestUsdEurRate: {
      rate: number;
      rateDate: string;
      source: string | null;
    } | null;
  };
  propFirms: SelectOption[];
  propFirmDetails: PropFirmSummary[];
  propFirmOrders: Record<string, number>;
  propFirmRules: Array<
    SelectOption & {
      name: string;
      accountType: string;
      accountSize: number;
      target: number;
      maxDrawdown: number;
      dailyDrawdown: number | null;
      buffer: number | null;
      consistencyPercent: number | null;
      minTradingDays: number | null;
      minTradingDaysForPayout: number | null;
      minPayoutTradingDays: number | null;
      minDailyProfitForPayout: number | null;
      payoutBuffer: number | null;
      payoutRuleType: string;
      traderSharePercent: number | null;
      defaultPurchasePrice: number | null;
      defaultActivationPrice: number | null;
      defaultResetPrice: number | null;
      promoNote: string | null;
      notes: string | null;
      isStandard: boolean;
      isActive: boolean;
      createdByUserId: string | null;
    }
  >;
  activeAccounts: AccountSummary[];
  archivedAccounts: AccountSummary[];
  accounts: AccountSummary[];
  recentTradingDays: TradingDaySummary[];
  calendarTradingDays: TradingDaySummary[];
  exchangeRates: ExchangeRateSummary[];
};

export type AccountSummary = {
  id: string;
  name: string;
  accountNumber: string | null;
  parentAccountId: string | null;
  parentAccountName: string | null;
  propFirmId: string;
  propFirmName: string;
  propFirmAcronym: string;
  propFirmRuleName: string | null;
  platform: string | null;
  currency: string;
  accountType: string;
  accountSize: number;
  status: string;
  purchaseDate: string | null;
  purchasePrice: number | null;
  promoUsed: string | null;
  activationDate: string | null;
  notes: string | null;
  rule: {
    target: number;
    maxDrawdown: number;
    dailyDrawdown: number | null;
    buffer: number | null;
    payoutBuffer: number | null;
    consistencyPercent: number | null;
    minTradingDays: number | null;
    minPayoutTradingDays: number | null;
    minDailyProfitForPayout: number | null;
    payoutRuleType: string;
    traderSharePercent: number | null;
    defaultPurchasePrice: number | null;
    defaultActivationPrice: number | null;
    defaultResetPrice: number | null;
    promoNote: string | null;
    source: string;
  } | null;
  currentResultUsd: number;
  currentResultEur: number | null;
  payoutsPaidUsd: number;
  payoutsGrossUsd: number;
  payoutsNetUsd: number;
  expensesUsd: number;
  netResultUsd: number;
  netResultEur: number | null;
  roiPercent: number | null;
  payoutEligibility: {
    isEligible: boolean;
    availableAmount: number;
    netAmount: number;
    buffer: number;
    bufferReached: boolean;
    missingBuffer: number;
    minTradingDays: number;
    validDays: number;
    consistencyOk: boolean;
    reasons: string[];
  };
  tradedDaysCount: number;
  dailyResults: TradingDaySummary[];
  expenses: MoneyEventSummary[];
  payouts: MoneyEventSummary[];
};

export type TradingDaySummary = {
  id: string;
  accountId: string;
  accountName: string;
  propFirmAcronym: string;
  accountSize: number;
  accountNumber: string | null;
  tradeDate: string;
  profitLossUsd: number;
  tradeCount: number | null;
  notes: string | null;
};

export type PropFirmSummary = {
  id: string;
  name: string;
  acronym: string;
  website: string | null;
  notes: string | null;
  isActive: boolean;
  rules: PropFirmRuleSummary[];
};

export type PropFirmRuleSummary = {
  id: string;
  name: string;
  accountType: string;
  accountSize: number;
  isStandard: boolean;
  isActive: boolean;
  createdByUserId: string | null;
};

export type ExchangeRateSummary = {
  id: string;
  baseCurrency: string;
  targetCurrency: string;
  rate: number;
  rateDate: string;
  source: string | null;
};

export type MoneyEventSummary = {
  id: string;
  amount: number;
  currency: string;
  date: string;
  type?: string;
  status?: string;
  notes: string | null;
};
