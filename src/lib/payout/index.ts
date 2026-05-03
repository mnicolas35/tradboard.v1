import type { ResolvedAccountRule } from "@/lib/rules";

type TradingDayForPayout = {
  profitLossUsd: number;
};

export type PayoutEligibility = {
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

export function calculatePayoutEligibility(
  currentResultUsd: number,
  days: TradingDayForPayout[],
  rule: ResolvedAccountRule | null
): PayoutEligibility {
  const buffer = rule?.payoutBuffer ?? rule?.buffer ?? 0;
  const isApexRule = rule?.payoutRuleType === "APEX";
  const isTakeProfitTraderRule = rule?.payoutRuleType === "TAKE_PROFIT_TRADER";
  const minTradingDays = rule?.minPayoutTradingDays ?? (isApexRule ? 5 : 0);
  const minDailyProfit = rule?.minDailyProfitForPayout ?? (isApexRule ? 250 : 0);
  const traderSharePercent = rule?.traderSharePercent ?? 100;
  const availableAmount = Math.max(0, currentResultUsd - buffer);
  const missingBuffer = Math.max(0, buffer - currentResultUsd);
  const bufferReached = missingBuffer === 0;
  const validDays =
    minDailyProfit > 0 ? days.filter((day) => day.profitLossUsd >= minDailyProfit).length : days.length;
  const minDaysOk = validDays >= minTradingDays;
  const bestDay = Math.max(0, ...days.map((day) => day.profitLossUsd));
  const consistencyPercent =
    rule?.fundedConsistencyPercent ?? rule?.consistencyPercent ?? (isApexRule ? 50 : null);
  const consistencyLimit =
    consistencyPercent && !isTakeProfitTraderRule ? currentResultUsd * (consistencyPercent / 100) : null;
  const consistencyOk = consistencyLimit === null || bestDay <= consistencyLimit;
  const reasons: string[] = [];

  if (!rule) {
    reasons.push("Aucune regle associee au compte.");
  }

  if (!bufferReached) {
    reasons.push(`Buffer manquant: ${missingBuffer.toFixed(2)} USD.`);
  }

  if (!minDaysOk) {
    reasons.push(`Jours valides insuffisants: ${validDays}/${minTradingDays}.`);
  }

  if (!consistencyOk) {
    reasons.push("Consistance non respectee.");
  }

  if (availableAmount <= 0) {
    reasons.push("Aucun montant disponible au-dessus du buffer.");
  }

  return {
    isEligible: reasons.length === 0,
    availableAmount,
    netAmount: availableAmount * (traderSharePercent / 100),
    buffer,
    bufferReached,
    missingBuffer,
    minTradingDays,
    validDays,
    consistencyOk,
    reasons
  };
}
