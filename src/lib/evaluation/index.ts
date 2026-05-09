import type { ResolvedAccountRule } from "@/lib/rules";

type TradingDayForEvaluation = {
  profitLossUsd: number;
};

export type EvaluationEligibility = {
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

export function calculateEvaluationEligibility(
  currentResultUsd: number,
  days: TradingDayForEvaluation[],
  rule: ResolvedAccountRule | null
): EvaluationEligibility {
  const target = rule?.target ?? null;
  const maxDrawdown = rule?.maxDrawdown ?? null;
  const dailyDrawdown = rule?.dailyDrawdown ?? null;
  const minTradingDays = rule?.minTradingDays ?? null;
  const minDailyProfit = rule?.minDailyProfit ?? null;
  const consistencyPercent = rule?.consistencyPercent ?? null;
  const validDays = minDailyProfit === null
    ? days.length
    : days.filter((day) => day.profitLossUsd >= minDailyProfit).length;
  const bestDay = Math.max(0, ...days.map((day) => day.profitLossUsd));
  const targetReached = target === null ? true : currentResultUsd >= target;
  const drawdownOk = maxDrawdown === null ? true : currentResultUsd > -maxDrawdown;
  const dailyDrawdownOk = dailyDrawdown === null ? true : days.every((day) => day.profitLossUsd > -dailyDrawdown);
  const minDaysOk = minTradingDays === null ? true : validDays >= minTradingDays;
  const consistencyBase = target !== null ? target : currentResultUsd > 0 ? currentResultUsd : null;
  const consistencyRatio = consistencyBase !== null ? bestDay / consistencyBase : null;
  const consistencyOk =
    consistencyPercent === null
      ? true
      : consistencyRatio !== null && consistencyRatio <= consistencyPercent / 100;
  const reasons: string[] = [];

  if (!rule) {
    reasons.push("Aucune regle associee a l'evaluation.");
  }

  if (!targetReached && target !== null) {
    reasons.push(`Target non atteinte: ${currentResultUsd.toFixed(2)}/${target.toFixed(2)} USD.`);
  }

  if (!drawdownOk && maxDrawdown !== null) {
    reasons.push(`Drawdown atteint: ${currentResultUsd.toFixed(2)}/-${maxDrawdown.toFixed(2)} USD.`);
  }

  if (!dailyDrawdownOk && dailyDrawdown !== null) {
    reasons.push(`Daily drawdown depasse: limite -${dailyDrawdown.toFixed(2)} USD.`);
  }

  if (!minDaysOk && minTradingDays !== null) {
    reasons.push(`Jours de trade insuffisants: ${validDays}/${minTradingDays}.`);
  }

  if (!consistencyOk) {
    const requiredProfit = consistencyPercent && consistencyPercent > 0 ? bestDay / (consistencyPercent / 100) : null;
    const missingProfit = requiredProfit === null ? null : Math.max(0, requiredProfit - currentResultUsd);
    reasons.push(
      missingProfit && missingProfit > 0
        ? `Consistance evaluation non respectee: augmentez le profit total de ${missingProfit.toFixed(2)} USD pour diluer le meilleur jour.`
        : "Consistance evaluation non respectee: augmentez le profit total pour diluer le meilleur jour."
    );
  }

  return {
    isEligible: reasons.length === 0,
    isFailed: !drawdownOk || !dailyDrawdownOk,
    targetReached,
    drawdownOk,
    dailyDrawdownOk,
    validDays,
    minTradingDays,
    consistencyOk,
    reasons
  };
}
