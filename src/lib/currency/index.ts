import type { Currency, ExchangeRate, Prisma } from "@prisma/client";

type DecimalLike = Prisma.Decimal | number | string | null | undefined;

export type ExchangeRateLike = Pick<
  ExchangeRate,
  "baseCurrency" | "targetCurrency" | "rate" | "rateDate" | "source"
>;

function toNumber(value: DecimalLike) {
  if (value === null || value === undefined) {
    return 0;
  }

  return Number(value);
}

export function convertUsdToEur(valueUsd: DecimalLike, rate?: DecimalLike | null) {
  if (!rate) {
    return null;
  }

  return toNumber(valueUsd) * toNumber(rate);
}

export function getLatestUsdEurRate(rates: ExchangeRateLike[]) {
  return getLatestRate(rates, "USD", "EUR");
}

export function getLatestRate(rates: ExchangeRateLike[], baseCurrency: Currency, targetCurrency: Currency) {
  return rates
    .filter((rate) => rate.baseCurrency === baseCurrency && rate.targetCurrency === targetCurrency)
    .sort((a, b) => b.rateDate.getTime() - a.rateDate.getTime())[0];
}

export function getTotalProfitLossEur(totalUsd: number, rate?: DecimalLike | null) {
  return convertUsdToEur(totalUsd, rate);
}

export function getMonthlyProfitLossEur(monthlyUsd: number, rate?: DecimalLike | null) {
  return convertUsdToEur(monthlyUsd, rate);
}

export function isSupportedCurrency(value: FormDataEntryValue | null): value is Currency {
  return value === "USD" || value === "EUR";
}
