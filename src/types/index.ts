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
  | "user-management"
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
  users: UserSummary[];
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
      fundedConsistencyPercent: number | null;
      minTradingDays: number | null;
      minDailyProfit: number | null;
      minTradingDaysForPayout: number | null;
      minPayoutTradingDays: number | null;
      minDailyProfitForPayout: number | null;
      payoutBuffer: number | null;
      payoutRuleType: string;
      traderSharePercent: number | null;
      defaultPurchasePrice: number | null;
      defaultActivationPrice: number | null;
      defaultResetPrice: number | null;
      defaultFundedResetPrice: number | null;
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

export type UserSummary = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "USER" | string;
  createdAt: string;
  lastLoginAt: string | null;
};

export type AccountSummary = {
  id: string;
  accountNumber: string | null;
  parentAccountId: string | null;
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
    fundedConsistencyPercent: number | null;
    minTradingDays: number | null;
    minDailyProfit: number | null;
    minPayoutTradingDays: number | null;
    minDailyProfitForPayout: number | null;
    payoutRuleType: string;
    traderSharePercent: number | null;
    defaultPurchasePrice: number | null;
    defaultActivationPrice: number | null;
    defaultResetPrice: number | null;
    defaultFundedResetPrice: number | null;
    promoNote: string | null;
    source: string;
  } | null;
  currentResultUsd: number;
  currentResultEur: number | null;
  accountBalanceUsd: number;
  accountBalanceEur: number | null;
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
  evaluationEligibility: {
    isEligible: boolean;
    isFailed: boolean;
    targetReached: boolean;
    drawdownOk: boolean;
    dailyDrawdownOk: boolean;
    validDays: number;
    minTradingDays: number | null;
    consistencyOk: boolean;
    reasons: string[];
  };
  tradedDaysCount: number;
  dailyResults: TradingDaySummary[];
  tradeEntries: TradeEntrySummary[];
  expenses: MoneyEventSummary[];
  payouts: MoneyEventSummary[];
};

export type TradingDaySummary = {
  id: string;
  accountId: string;
  propFirmAcronym: string;
  accountSize: number;
  accountNumber: string | null;
  tradeDate: string;
  profitLossUsd: number;
  tradeCount: number | null;
  notes: string | null;
};

export type TradeEntrySummary = {
  id: string;
  accountId: string;
  tradeDate: string;
  createdAtTime: string | null;
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
