import type { AccountStatus, PayoutStatus, Prisma } from "@prisma/client";

type DecimalLike = Prisma.Decimal | number | string | null | undefined;

type ProfitLossRow = {
  profitLoss: DecimalLike;
  tradeDate?: Date;
};

type ExpenseRow = {
  amount: DecimalLike;
};

type PayoutRow = {
  amount: DecimalLike;
  status?: PayoutStatus;
};

type AccountRow = {
  status: AccountStatus;
};

function toNumber(value: DecimalLike) {
  if (value === null || value === undefined) {
    return 0;
  }

  return Number(value);
}

function sum(values: DecimalLike[]): number {
  return values.reduce<number>((total, value) => total + toNumber(value), 0);
}

export function getTotalProfitLossUsd(rows: ProfitLossRow[]) {
  return sum(rows.map((row) => row.profitLoss));
}

export function getMonthlyProfitLossUsd(rows: ProfitLossRow[], date = new Date()) {
  const month = date.getMonth();
  const year = date.getFullYear();

  return sum(
    rows
      .filter((row) => {
        if (!row.tradeDate) {
          return false;
        }

        return row.tradeDate.getMonth() === month && row.tradeDate.getFullYear() === year;
      })
      .map((row) => row.profitLoss)
  );
}

export function getTotalExpensesUsd(rows: ExpenseRow[]) {
  return sum(rows.map((row) => row.amount));
}

export function getTotalPayoutsUsd(rows: PayoutRow[]) {
  return sum(
    rows
      .filter((row) => row.status === undefined || row.status === "PAID")
      .map((row) => row.amount)
  );
}

export function getNetResultUsd(profitLoss: number, expenses: number, payouts: number) {
  return profitLoss + payouts - expenses;
}

export function getActiveAccountsCount(rows: AccountRow[]) {
  return rows.filter((row) => row.status === "ACTIVE").length;
}

export const getTotalProfitLoss = getTotalProfitLossUsd;
export const getMonthlyProfitLoss = getMonthlyProfitLossUsd;
export const getTotalExpenses = getTotalExpensesUsd;
export const getTotalPayouts = getTotalPayoutsUsd;
export const getNetResult = getNetResultUsd;
