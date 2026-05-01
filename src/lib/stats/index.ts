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

function sum(values: DecimalLike[]) {
  return values.reduce((total, value) => total + toNumber(value), 0);
}

export function getTotalProfitLoss(rows: ProfitLossRow[]) {
  return sum(rows.map((row) => row.profitLoss));
}

export function getMonthlyProfitLoss(rows: ProfitLossRow[], date = new Date()) {
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

export function getTotalExpenses(rows: ExpenseRow[]) {
  return sum(rows.map((row) => row.amount));
}

export function getTotalPayouts(rows: PayoutRow[]) {
  return sum(
    rows
      .filter((row) => row.status === undefined || row.status === "PAID")
      .map((row) => row.amount)
  );
}

export function getNetResult(profitLoss: number, expenses: number, payouts: number) {
  return profitLoss + payouts - expenses;
}

export function getActiveAccountsCount(rows: AccountRow[]) {
  return rows.filter((row) => row.status === "ACTIVE").length;
}
