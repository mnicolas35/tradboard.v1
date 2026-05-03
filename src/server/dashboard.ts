import { getLatestUsdEurRate, getMonthlyProfitLossEur, getTotalProfitLossEur } from "@/lib/currency";
import { calculatePayoutEligibility } from "@/lib/payout";
import { prisma } from "@/lib/prisma";
import { resolveAccountRule } from "@/lib/rules";
import {
  getActiveAccountsCount,
  getMonthlyProfitLossUsd,
  getNetResultUsd,
  getTotalExpensesUsd,
  getTotalPayoutsUsd,
  getTotalProfitLossUsd
} from "@/lib/stats";
import { getCurrentUser } from "@/server/auth/current-user";
import type { AccountSummary, AppData, TradingDaySummary } from "@/types";

function numberOrNull(value: unknown) {
  if (value === null || value === undefined) {
    return null;
  }

  return Number(value);
}

function dateOrNull(value: Date | null) {
  return value ? value.toISOString().slice(0, 10) : null;
}

function dateString(value: Date) {
  return value.toISOString().slice(0, 10);
}

export async function getDashboardData(): Promise<AppData> {
  const currentUser = await getCurrentUser();
  const ownedWhere = { userId: currentUser.id };

  const [accounts, tradingDays, expenses, payouts, propFirms, propFirmRules, exchangeRates, propFirmOrders] =
    await Promise.all([
      prisma.account.findMany({
        where: ownedWhere,
        include: {
          propFirm: true,
          propFirmRule: true,
          parentAccount: true,
          ruleOverride: true,
          tradingDays: { orderBy: { tradeDate: "desc" } },
          expenses: true,
          payouts: true
        },
        orderBy: { createdAt: "desc" }
      }),
      prisma.tradingDay.findMany({
        where: ownedWhere,
        include: { account: { include: { propFirm: true } } },
        orderBy: { tradeDate: "desc" },
        take: 40
      }),
      prisma.accountExpense.findMany({ where: ownedWhere }),
      prisma.payout.findMany({ where: ownedWhere }),
      prisma.propFirm.findMany({
        where: { isActive: true },
        include: {
          rules: {
            where:
              currentUser.role === "ADMIN"
                ? { isActive: true }
                : {
                    isActive: true,
                    OR: [{ isStandard: true }, { createdByUserId: currentUser.id }]
                  },
            orderBy: [{ isStandard: "desc" }, { name: "asc" }]
          }
        },
        orderBy: { name: "asc" }
      }),
      prisma.propFirmRule.findMany({
        where:
          currentUser.role === "ADMIN"
            ? { isActive: true }
            : {
                isActive: true,
                OR: [{ isStandard: true }, { createdByUserId: currentUser.id }]
              },
        include: { propFirm: true },
        orderBy: [{ propFirm: { name: "asc" } }, { name: "asc" }]
      }),
      prisma.exchangeRate.findMany({
        where: ownedWhere,
        orderBy: { rateDate: "desc" }
      }),
      prisma.userPropFirmOrder.findMany({
        where: { userId: currentUser.id }
      })
    ]);

  const latestUsdEurRate = getLatestUsdEurRate(exchangeRates);
  const usdEurRateValue = latestUsdEurRate ? Number(latestUsdEurRate.rate) : null;
  const allTradingDays = accounts.flatMap((account) => account.tradingDays);
  const totalProfitLossUsd = getTotalProfitLossUsd(allTradingDays);
  const monthlyProfitLossUsd = getMonthlyProfitLossUsd(allTradingDays);
  const totalExpensesUsd = getTotalExpensesUsd(expenses);
  const totalPayoutsUsd = getTotalPayoutsUsd(payouts);
  const netResultUsd = getNetResultUsd(totalProfitLossUsd, totalExpensesUsd, totalPayoutsUsd);

  const mapTradingDay = (day: (typeof tradingDays)[number]): TradingDaySummary => ({
    id: day.id,
    accountId: day.accountId,
    accountName: day.account.name,
    propFirmAcronym: day.account.propFirm.acronym,
    accountSize: Number(day.account.accountSize),
    accountNumber: day.account.accountNumber,
    tradeDate: dateString(day.tradeDate),
    profitLossUsd: Number(day.profitLoss),
    tradeCount: day.tradeCount,
    notes: day.notes
  });

  const accountSummaries: AccountSummary[] = accounts.map((account) => {
    const currentResultUsd = getTotalProfitLossUsd(account.tradingDays);
    const payoutsPaidUsd = getTotalPayoutsUsd(account.payouts);
    const expensesUsd = getTotalExpensesUsd(account.expenses);
    const resolvedRule = resolveAccountRule(account.propFirmRule, account.ruleOverride);
    const payoutEligibility = calculatePayoutEligibility(
      currentResultUsd,
      account.tradingDays.map((day) => ({ profitLossUsd: Number(day.profitLoss) })),
      resolvedRule
    );
    const split = (resolvedRule?.traderSharePercent ?? 100) / 100;
    const payoutsGrossUsd = payoutsPaidUsd;
    const payoutsNetUsd = payoutsGrossUsd * split;
    const accountNetResultUsd = getNetResultUsd(currentResultUsd, expensesUsd, payoutsNetUsd);
    const capitalCost = (account.purchasePrice ? Number(account.purchasePrice) : 0) + expensesUsd;

    return {
      id: account.id,
      name: account.name,
      accountNumber: account.accountNumber,
      parentAccountId: account.parentAccountId,
      parentAccountName: account.parentAccount?.name ?? null,
      propFirmId: account.propFirmId,
      propFirmName: account.propFirm.name,
      propFirmAcronym: account.propFirm.acronym,
      propFirmRuleName: account.propFirmRule?.name ?? null,
      platform: account.platform,
      currency: account.currency,
      accountType: account.accountType,
      accountSize: Number(account.accountSize),
      status: account.status,
      purchaseDate: dateOrNull(account.purchaseDate),
      purchasePrice: numberOrNull(account.purchasePrice),
      promoUsed: account.promoUsed,
      activationDate: dateOrNull(account.activationDate),
      notes: account.notes,
      rule: resolvedRule,
      currentResultUsd,
      currentResultEur: getTotalProfitLossEur(currentResultUsd, usdEurRateValue),
      payoutsPaidUsd,
      payoutsGrossUsd,
      payoutsNetUsd,
      expensesUsd,
      netResultUsd: accountNetResultUsd,
      netResultEur: getTotalProfitLossEur(accountNetResultUsd, usdEurRateValue),
      roiPercent: capitalCost > 0 ? (accountNetResultUsd / capitalCost) * 100 : null,
      payoutEligibility,
      tradedDaysCount: account.tradingDays.length,
      dailyResults: account.tradingDays.map((day) => ({
        id: day.id,
        accountId: day.accountId,
        accountName: account.name,
        propFirmAcronym: account.propFirm.acronym,
        accountSize: Number(account.accountSize),
        accountNumber: account.accountNumber,
        tradeDate: dateString(day.tradeDate),
        profitLossUsd: Number(day.profitLoss),
        tradeCount: day.tradeCount,
        notes: day.notes
      })),
      expenses: account.expenses.map((expense) => ({
        id: expense.id,
        amount: Number(expense.amount),
        currency: expense.currency,
        date: dateString(expense.expenseDate),
        type: expense.type,
        notes: expense.notes
      })),
      payouts: account.payouts.map((payout) => ({
        id: payout.id,
        amount: Number(payout.amount),
        currency: payout.currency,
        date: dateString(payout.payoutDate),
        status: payout.status,
        notes: payout.notes
      }))
    };
  });

  return {
    currentUser: {
      id: currentUser.id,
      name: currentUser.name,
      email: currentUser.email,
      role: currentUser.role,
      themePreference: currentUser.themePreference
    },
    metrics: {
      activeAccountsCount: getActiveAccountsCount(accounts),
      totalProfitLossUsd,
      totalProfitLossEur: getTotalProfitLossEur(totalProfitLossUsd, usdEurRateValue),
      monthlyProfitLossUsd,
      monthlyProfitLossEur: getMonthlyProfitLossEur(monthlyProfitLossUsd, usdEurRateValue),
      totalExpensesUsd,
      totalPayoutsUsd,
      netResultUsd,
      netResultEur: getTotalProfitLossEur(netResultUsd, usdEurRateValue),
      latestUsdEurRate: latestUsdEurRate
        ? {
            rate: Number(latestUsdEurRate.rate),
            rateDate: dateString(latestUsdEurRate.rateDate),
            source: latestUsdEurRate.source
          }
        : null
    },
    propFirms: propFirms.map((propFirm) => ({
      id: propFirm.id,
      label: `${propFirm.acronym} - ${propFirm.name}`,
      acronym: propFirm.acronym
    })),
    propFirmOrders: Object.fromEntries(
      propFirmOrders.map((order) => [order.propFirmId, order.sortOrder])
    ),
    propFirmDetails: propFirms.map((propFirm) => ({
      id: propFirm.id,
      name: propFirm.name,
      acronym: propFirm.acronym,
      website: propFirm.website,
      notes: propFirm.notes,
      isActive: propFirm.isActive,
      rules: propFirm.rules.map((rule) => ({
        id: rule.id,
        name: rule.name,
        accountType: rule.accountType,
        accountSize: Number(rule.accountSize),
        isStandard: rule.isStandard,
        isActive: rule.isActive,
        createdByUserId: rule.createdByUserId
      }))
    })),
    propFirmRules: propFirmRules.map((rule) => ({
      id: rule.id,
      label: `${rule.isStandard ? "" : "** "}${rule.propFirm.acronym} - ${rule.name}`,
      name: rule.name,
      propFirmId: rule.propFirmId,
      accountType: rule.accountType,
      accountSize: Number(rule.accountSize),
      target: Number(rule.target),
      maxDrawdown: Number(rule.maxDrawdown),
      dailyDrawdown: numberOrNull(rule.dailyDrawdown),
      buffer: numberOrNull(rule.buffer),
      consistencyPercent: numberOrNull(rule.consistencyPercent),
      fundedConsistencyPercent: numberOrNull(rule.fundedConsistencyPercent),
      minTradingDays: rule.minTradingDays,
      minTradingDaysForPayout: rule.minTradingDaysForPayout,
      minPayoutTradingDays: rule.minPayoutTradingDays,
      minDailyProfitForPayout: numberOrNull(rule.minDailyProfitForPayout),
      payoutBuffer: numberOrNull(rule.payoutBuffer),
      payoutRuleType: rule.payoutRuleType,
      traderSharePercent: numberOrNull(rule.traderSharePercent),
      defaultPurchasePrice: numberOrNull(rule.defaultPurchasePrice),
      defaultActivationPrice: numberOrNull(rule.defaultActivationPrice ?? rule.activationPrice),
      defaultResetPrice: numberOrNull(rule.defaultResetPrice),
      defaultFundedResetPrice: numberOrNull(rule.defaultFundedResetPrice),
      promoNote: rule.promoNote ?? rule.promo,
      notes: rule.notes,
      isStandard: rule.isStandard,
      isActive: rule.isActive,
      createdByUserId: rule.createdByUserId
    })),
    activeAccounts: accountSummaries.filter((account) => account.status === "ACTIVE"),
    archivedAccounts: accountSummaries.filter((account) => account.status === "ARCHIVED"),
    accounts: accountSummaries,
    recentTradingDays: tradingDays.slice(0, 12).map(mapTradingDay),
    calendarTradingDays: tradingDays.map(mapTradingDay),
    exchangeRates: exchangeRates.map((rate) => ({
      id: rate.id,
      baseCurrency: rate.baseCurrency,
      targetCurrency: rate.targetCurrency,
      rate: Number(rate.rate),
      rateDate: dateString(rate.rateDate),
      source: rate.source
    }))
  };
}
