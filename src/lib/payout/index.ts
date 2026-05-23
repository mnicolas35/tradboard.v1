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

export function calculateTraderPayoutNet(
  grossAmount: number,
  rule: Pick<ResolvedAccountRule, "traderSharePercent" | "traderFullShareUntilAmount"> | null,
  previousGrossPayouts = 0
) {
  const standardShare = (rule?.traderSharePercent ?? 100) / 100;
  const fullShareUntil = Math.max(0, rule?.traderFullShareUntilAmount ?? 0);

  if (grossAmount <= 0) {
    return 0;
  }

  if (fullShareUntil <= 0) {
    return grossAmount * standardShare;
  }

  const remainingFullShare = Math.max(0, fullShareUntil - previousGrossPayouts);
  const fullShareAmount = Math.min(grossAmount, remainingFullShare);
  const standardShareAmount = grossAmount - fullShareAmount;

  return fullShareAmount + standardShareAmount * standardShare;
}

export function calculatePayoutEligibility(
  currentResultUsd: number,
  days: TradingDayForPayout[],
  previousGrossPayouts: number,
  rule: ResolvedAccountRule | null
): PayoutEligibility {
  if (!rule) {
    return {
      isEligible: false,
      availableAmount: 0,
      netAmount: 0,
      buffer: 0,
      bufferReached: false,
      missingBuffer: 0,
      minTradingDays: 0,
      validDays: 0,
      consistencyOk: true,
      reasons: ["Aucune regle funded associee au compte."]
    };
  }

  const buffer = rule?.buffer ?? 0;
  const minTradingDays = rule?.minPayoutTradingDays ?? 0;
  const minDailyProfit = rule?.minDailyProfitForPayout ?? 0;
  const availableAmount = Math.max(0, currentResultUsd - buffer);
  const missingBuffer = Math.max(0, buffer - currentResultUsd);
  const bufferReached = missingBuffer === 0;
  const validDays =
    minDailyProfit > 0 ? days.filter((day) => day.profitLossUsd >= minDailyProfit).length : days.length;
  const minDaysOk = validDays >= minTradingDays;
  const bestDay = Math.max(0, ...days.map((day) => day.profitLossUsd));
  const consistencyPercent = rule?.fundedConsistencyPercent ?? null;
  const consistencyRatio = currentResultUsd > 0 ? bestDay / currentResultUsd : null;
  const consistencyOk =
    consistencyPercent === null
      ? true
      : consistencyRatio !== null && consistencyRatio <= consistencyPercent / 100;
  const reasons: string[] = [];

  if (!bufferReached) {
    reasons.push(`Buffer manquant: ${missingBuffer.toFixed(2)} USD.`);
  }

  if (!minDaysOk) {
    reasons.push(`Jours valides insuffisants: ${validDays}/${minTradingDays}.`);
  }

  if (!consistencyOk) {
    const requiredProfit = consistencyPercent && consistencyPercent > 0 ? bestDay / (consistencyPercent / 100) : null;
    const missingProfit = requiredProfit === null ? null : Math.max(0, requiredProfit - currentResultUsd);
    reasons.push(
      missingProfit && missingProfit > 0
        ? `Consistance funded non respectee: augmentez le profit total de ${missingProfit.toFixed(2)} USD pour diluer le meilleur jour.`
        : "Consistance funded non respectee: augmentez le profit total pour diluer le meilleur jour."
    );
  }

  if (availableAmount <= 0) {
    reasons.push("Aucun montant disponible au-dessus du buffer.");
  }

  return {
    isEligible: reasons.length === 0,
    availableAmount,
    netAmount: calculateTraderPayoutNet(availableAmount, rule, previousGrossPayouts),
    buffer,
    bufferReached,
    missingBuffer,
    minTradingDays,
    validDays,
    consistencyOk,
    reasons
  };
}
