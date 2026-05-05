import type { AccountRuleOverride, PayoutRuleType, PropFirmRule } from "@prisma/client";

type DecimalLike = number | string | { toString(): string } | null | undefined;

type RuleSource = Pick<
  PropFirmRule,
  | "target"
  | "maxDrawdown"
  | "dailyDrawdown"
  | "buffer"
  | "payoutBuffer"
  | "minTradingDays"
  | "minDailyProfit"
  | "minTradingDaysForPayout"
  | "minPayoutTradingDays"
  | "minDailyProfitForPayout"
  | "consistencyPercent"
  | "fundedConsistencyPercent"
  | "payoutRuleType"
  | "traderSharePercent"
  | "defaultPurchasePrice"
  | "activationPrice"
  | "defaultActivationPrice"
  | "defaultResetPrice"
  | "defaultFundedResetPrice"
  | "promo"
  | "promoNote"
  | "notes"
>;

type OverrideSource = Pick<
  AccountRuleOverride,
  | "target"
  | "maxDrawdown"
  | "dailyDrawdown"
  | "buffer"
  | "payoutBuffer"
  | "minTradingDays"
  | "minDailyProfit"
  | "minPayoutTradingDays"
  | "minDailyProfitForPayout"
  | "consistencyPercent"
  | "payoutRuleType"
  | "traderSharePercent"
  | "defaultPurchasePrice"
  | "defaultActivationPrice"
  | "defaultResetPrice"
  | "promoNote"
  | "notes"
> | null;

function numberOrNull(value: DecimalLike) {
  if (value === null || value === undefined) {
    return null;
  }

  return Number(value);
}

function overrideNumber(overrideValue: DecimalLike, fallbackValue: DecimalLike) {
  return overrideValue === null || overrideValue === undefined
    ? numberOrNull(fallbackValue)
    : numberOrNull(overrideValue);
}

function overrideValue<T>(overrideValue: T | null | undefined, fallbackValue: T | null | undefined) {
  return overrideValue === null || overrideValue === undefined ? fallbackValue ?? null : overrideValue;
}

export type ResolvedAccountRule = {
  target: number;
  maxDrawdown: number;
  dailyDrawdown: number | null;
  buffer: number | null;
  payoutBuffer: number | null;
  minTradingDays: number | null;
  minDailyProfit: number | null;
  minPayoutTradingDays: number | null;
  minDailyProfitForPayout: number | null;
  consistencyPercent: number | null;
  fundedConsistencyPercent: number | null;
  payoutRuleType: PayoutRuleType;
  traderSharePercent: number | null;
  defaultPurchasePrice: number | null;
  defaultActivationPrice: number | null;
  defaultResetPrice: number | null;
  defaultFundedResetPrice: number | null;
  promoNote: string | null;
  notes: string | null;
  source: "PROP_FIRM_RULE" | "ACCOUNT_OVERRIDE";
};

export function resolveAccountRule(rule: RuleSource | null, override: OverrideSource): ResolvedAccountRule | null {
  if (!rule) {
    return null;
  }

  return {
    target: overrideNumber(override?.target, rule.target) ?? 0,
    maxDrawdown: overrideNumber(override?.maxDrawdown, rule.maxDrawdown) ?? 0,
    dailyDrawdown: overrideNumber(override?.dailyDrawdown, rule.dailyDrawdown),
    buffer: overrideNumber(override?.buffer, rule.buffer),
    payoutBuffer: overrideNumber(override?.payoutBuffer, rule.payoutBuffer),
    minTradingDays: overrideValue(override?.minTradingDays, rule.minTradingDays),
    minDailyProfit: overrideNumber(override?.minDailyProfit, rule.minDailyProfit),
    minPayoutTradingDays: overrideValue(
      override?.minPayoutTradingDays,
      rule.minTradingDaysForPayout ?? rule.minPayoutTradingDays
    ),
    minDailyProfitForPayout: overrideNumber(override?.minDailyProfitForPayout, rule.minDailyProfitForPayout),
    consistencyPercent: overrideNumber(override?.consistencyPercent, rule.consistencyPercent),
    fundedConsistencyPercent: numberOrNull(rule.fundedConsistencyPercent),
    payoutRuleType: overrideValue(override?.payoutRuleType, rule.payoutRuleType) ?? "NONE",
    traderSharePercent: overrideNumber(override?.traderSharePercent, rule.traderSharePercent),
    defaultPurchasePrice: overrideNumber(override?.defaultPurchasePrice, rule.defaultPurchasePrice),
    defaultActivationPrice: overrideNumber(
      override?.defaultActivationPrice,
      rule.defaultActivationPrice ?? rule.activationPrice
    ),
    defaultResetPrice: overrideNumber(override?.defaultResetPrice, rule.defaultResetPrice),
    defaultFundedResetPrice: numberOrNull(rule.defaultFundedResetPrice),
    promoNote: overrideValue(override?.promoNote, rule.promoNote ?? rule.promo),
    notes: overrideValue(override?.notes, rule.notes),
    source: override ? "ACCOUNT_OVERRIDE" : "PROP_FIRM_RULE"
  };
}
