function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

export function calculateCurrentDrawdown(accountBalance: number, accountSize: number) {
  return roundMoney(accountBalance - accountSize);
}

export function calculateEvaluationDrawdown(currentResultUsd: number, drawdownLimit: number | null) {
  if (drawdownLimit === null) {
    return null;
  }

  return roundMoney(drawdownLimit + currentResultUsd);
}

export function calculateFundedCurrentDrawdown(
  currentResultUsd: number,
  drawdownLimit: number | null,
  buffer: number | null = null,
  hasReachedBuffer = false
) {
  if (drawdownLimit === null) {
    return null;
  }

  return roundMoney(drawdownLimit + currentResultUsd);
}

export function calculateFundedAvailableDrawdown(currentResultUsd: number, drawdownLimit: number | null) {
  if (drawdownLimit === null) {
    return null;
  }

  return roundMoney(Math.min(drawdownLimit + currentResultUsd, drawdownLimit));
}

export function calculateAvailableDrawdownFromCurrent(
  currentActualDrawdown: number | null,
  drawdownLimit: number | null
) {
  if (currentActualDrawdown === null) {
    return null;
  }

  if (drawdownLimit === null) {
    return roundMoney(currentActualDrawdown);
  }

  return roundMoney(Math.min(currentActualDrawdown, drawdownLimit));
}

export function calculateNextTradeDrawdown(
  currentResultUsd: number,
  currentActualDrawdown: number,
  profitLoss: number,
  drawdownLimit: number | null = null,
  accountType: "EVALUATION" | "FUNDED" = "EVALUATION",
  buffer: number | null = null
) {
  if (drawdownLimit === null && currentActualDrawdown === 0) {
    return null;
  }

  return roundMoney(currentActualDrawdown + profitLoss);
}
