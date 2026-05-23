import { getLatestUsdEurRate, getMonthlyProfitLossEur, getTotalProfitLossEur } from "@/lib/currency";
import { calculateAvailableDrawdownFromCurrent } from "@/lib/drawdown";
import { calculateEvaluationEligibility } from "@/lib/evaluation";
import { calculatePayoutEligibility, calculateTraderPayoutNet } from "@/lib/payout";
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
import type { AccountCostLineSummary, AccountSummary, AppData, TradingDaySummary } from "@/types";

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

function timeString(value: Date) {
  return new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Paris"
  }).format(value);
}

function summarizeTradingDaysByDate(
  days: Array<{
    id: string;
    accountId: string;
    tradeDate: Date;
    profitLoss: unknown;
    tradeCount: number | null;
    notes: string | null;
  }>,
  account: {
    name: string;
    propFirm: { acronym: string };
    accountSize: unknown;
    accountNumber: string | null;
  }
): TradingDaySummary[] {
  const byDate = new Map<string, TradingDaySummary>();

  for (const day of days) {
    const tradeDate = dateString(day.tradeDate);
    const current = byDate.get(tradeDate);

    if (current) {
      byDate.set(tradeDate, {
        ...current,
        profitLossUsd: current.profitLossUsd + Number(day.profitLoss),
        tradeCount:
          current.tradeCount === null && day.tradeCount === null
            ? null
            : (current.tradeCount ?? 0) + (day.tradeCount ?? 0),
        notes: current.notes ?? day.notes
      });
    } else {
      byDate.set(tradeDate, {
        id: `${day.accountId}-${tradeDate}`,
        accountId: day.accountId,
        propFirmAcronym: account.propFirm.acronym,
        accountSize: Number(account.accountSize),
        accountNumber: account.accountNumber,
        tradeDate,
        profitLossUsd: Number(day.profitLoss),
        tradeCount: day.tradeCount,
        notes: day.notes
      });
    }
  }

  return [...byDate.values()].sort((a, b) => b.tradeDate.localeCompare(a.tradeDate));
}

function tradingDaysFrom(days: TradingDaySummary[], startDate: Date | null) {
  if (!startDate) {
    return days;
  }

  const start = dateString(startDate);
  return days.filter((day) => day.tradeDate >= start);
}

function costLabel(type: string, accountType: string) {
  if (type === "PURCHASE") return accountType === "FUNDED" ? "Achat funded" : "Achat evaluation";
  if (type === "RESET") return accountType === "FUNDED" ? "Reset funded" : "Reset evaluation";
  if (type === "ACTIVATION") return "Activation funded";
  if (type === "SUBSCRIPTION") return "Abonnement";
  return "Coût";
}

export async function getDashboardData(): Promise<AppData> {
  const currentUser = await getCurrentUser();
  const ownedWhere = { userId: currentUser.id };

  const [accounts, tradingDays, expenses, payouts, propFirms, propFirmRules, exchangeRates, marketWatchlist, propFirmOrders, users] =
    await Promise.all([
      prisma.account.findMany({
        where: ownedWhere,
        include: {
          propFirm: true,
          propFirmRule: true,
          parentAccount: true,
          ruleOverride: true,
          tradingDays: { orderBy: [{ tradeDate: "desc" }, { createdAt: "desc" }] },
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
      prisma.marketWatchItem.findMany({
        where: ownedWhere,
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
      }),
      prisma.userPropFirmOrder.findMany({
        where: { userId: currentUser.id }
      }),
      currentUser.role === "ADMIN"
        ? prisma.user.findMany({
            where: { isActive: true },
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              createdAt: true,
              lastLoginAt: true
            },
            orderBy: { createdAt: "desc" }
          })
        : Promise.resolve([])
    ]);

  const latestUsdEurRate = getLatestUsdEurRate(exchangeRates);
  const usdEurRateValue = latestUsdEurRate ? Number(latestUsdEurRate.rate) : null;
  const allTradingDays = accounts.flatMap((account) => account.tradingDays);
  const totalProfitLossUsd = getTotalProfitLossUsd(allTradingDays);
  const monthlyProfitLossUsd = getMonthlyProfitLossUsd(allTradingDays);
  const totalExpensesUsd = getTotalExpensesUsd(expenses);
  const totalPayoutsUsd = getTotalPayoutsUsd(payouts);
  const netResultUsd = getNetResultUsd(totalProfitLossUsd, totalExpensesUsd, totalPayoutsUsd);
  const accountById = new Map(accounts.map((account) => [account.id, account]));

  const buildAccountChain = (account: (typeof accounts)[number]) => {
    const chain: Array<typeof account> = [];
    const seen = new Set<string>();
    let current: typeof account | undefined = account;

    while (current && !seen.has(current.id)) {
      seen.add(current.id);
      chain.unshift(current);
      current = current.parentAccountId ? accountById.get(current.parentAccountId) : undefined;
    }

    return chain;
  };

  const buildAccountCostHistory = (account: (typeof accounts)[number]): AccountCostLineSummary[] => {
    const chain = buildAccountChain(account);
    const lines = chain.flatMap((chainAccount, index) => {
      const parent = index > 0 ? chain[index - 1] : null;
      const explicitCostExpenses = chainAccount.expenses
        .filter((expense) => ["PURCHASE", "RESET", "ACTIVATION", "SUBSCRIPTION", "OTHER"].includes(expense.type))
        .map((expense) => ({
          id: expense.id,
          sourceAccountId: chainAccount.id,
          label: costLabel(expense.type, chainAccount.accountType),
          amount: Number(expense.amount),
          currency: expense.currency,
          date: dateString(expense.expenseDate),
          type: expense.type,
          notes: expense.notes
        }));

      if (explicitCostExpenses.length > 0) {
        return explicitCostExpenses;
      }

      const purchasePrice = chainAccount.purchasePrice === null ? null : Number(chainAccount.purchasePrice);
      const eventDate = chainAccount.purchaseDate ?? chainAccount.activationDate ?? chainAccount.createdAt;
      if (purchasePrice === null || purchasePrice <= 0) {
        return [];
      }

      const isReset = parent !== null && parent.accountType === chainAccount.accountType;
      const isActivation = parent?.accountType === "EVALUATION" && chainAccount.accountType === "FUNDED";
      const parentPurchasePrice = parent?.purchasePrice === null || parent?.purchasePrice === undefined ? 0 : Number(parent.purchasePrice);
      const amount = isReset && purchasePrice > parentPurchasePrice ? purchasePrice - parentPurchasePrice : purchasePrice;

      if (amount <= 0) {
        return [];
      }

      return [{
        id: `account-cost-${chainAccount.id}`,
        sourceAccountId: chainAccount.id,
        label: isActivation
          ? "Activation funded"
          : isReset
            ? costLabel("RESET", chainAccount.accountType)
            : costLabel("PURCHASE", chainAccount.accountType),
        amount,
        currency: chainAccount.currency,
        date: dateString(eventDate),
        type: isActivation ? "ACTIVATION" : isReset ? "RESET" : "PURCHASE",
        notes: chainAccount.promoUsed
      }];
    });

    return lines.sort((a, b) => a.date.localeCompare(b.date) || a.label.localeCompare(b.label));
  };

  const mapTradingDay = (day: (typeof tradingDays)[number]): TradingDaySummary => ({
    id: day.id,
    accountId: day.accountId,
    propFirmAcronym: day.account.propFirm.acronym,
    accountSize: Number(day.account.accountSize),
    accountNumber: day.account.accountNumber,
    tradeDate: dateString(day.tradeDate),
    profitLossUsd: Number(day.profitLoss),
    tradeCount: day.tradeCount,
    notes: day.notes
  });

  const accountSummaries: AccountSummary[] = accounts.map((account) => {
    const tradingResultUsd = getTotalProfitLossUsd(account.tradingDays);
    const accountSizeUsd = Number(account.accountSize);
    const payoutsPaidUsd = getTotalPayoutsUsd(account.payouts);
    const currentResultUsd = account.accountType === "FUNDED" ? tradingResultUsd - payoutsPaidUsd : tradingResultUsd;
    const accountBalanceUsd = accountSizeUsd + currentResultUsd;
    const expensesUsd = getTotalExpensesUsd(account.expenses);
    const resolvedRule = resolveAccountRule(account.propFirmRule, account.ruleOverride);
    const dailyResults = summarizeTradingDaysByDate(account.tradingDays, account);
    const evaluationDayResults = tradingDaysFrom(dailyResults, account.purchaseDate).map((day) => ({
      profitLossUsd: day.profitLossUsd
    }));
    const payoutDayResults = tradingDaysFrom(dailyResults, account.activationDate).map((day) => ({
      profitLossUsd: day.profitLossUsd
    }));
    const evaluationEligibility = calculateEvaluationEligibility(tradingResultUsd, evaluationDayResults, resolvedRule);
    const payoutEligibility = calculatePayoutEligibility(
      currentResultUsd,
      payoutDayResults,
      payoutsPaidUsd,
      account.accountType === "FUNDED" ? resolvedRule : null
    );
    const payoutsGrossUsd = payoutsPaidUsd;
    const paidPayoutsByDate = [...account.payouts]
      .filter((payout) => payout.status === "PAID")
      .sort((a, b) => a.payoutDate.getTime() - b.payoutDate.getTime() || a.createdAt.getTime() - b.createdAt.getTime());
    let previousGrossPayouts = 0;
    const payoutsNetUsd = paidPayoutsByDate.reduce((sum, payout) => {
      const grossAmount = Number(payout.amount);
      const netAmount = calculateTraderPayoutNet(grossAmount, resolvedRule, previousGrossPayouts);
      previousGrossPayouts += grossAmount;
      return sum + netAmount;
    }, 0);
    const accountNetResultUsd = getNetResultUsd(tradingResultUsd, expensesUsd, payoutsNetUsd);
    const costHistory = buildAccountCostHistory(account);
    const accountCostUsd = costHistory.reduce((sum, line) => sum + line.amount, 0);

    const drawdownLimit = resolvedRule?.maxDrawdown ?? null;
    const lastDrawdownDay = account.tradingDays.find((day) => day.drawdownAtClose !== null);
    const payoutsAfterLastDrawdown = lastDrawdownDay
      ? account.payouts
        .filter((payout) => (
          payout.status === "PAID" &&
          payout.createdAt > lastDrawdownDay.createdAt
        ))
        .reduce((sum, payout) => sum + Number(payout.amount), 0)
      : 0;
    const currentActualDrawdown = lastDrawdownDay?.drawdownAtClose !== undefined && lastDrawdownDay.drawdownAtClose !== null
      ? Number(lastDrawdownDay.drawdownAtClose) - payoutsAfterLastDrawdown
      : drawdownLimit ?? 0;

    return {
      id: account.id,
      accountNumber: account.accountNumber,
      parentAccountId: account.parentAccountId,
      propFirmId: account.propFirmId,
      propFirmName: account.propFirm.name,
      propFirmAcronym: account.propFirm.acronym,
      propFirmRuleName: account.propFirmRule?.name ?? null,
      platform: account.platform,
      currency: account.currency,
      accountType: account.accountType,
      accountSize: accountSizeUsd,
      status: account.status,
      purchaseDate: dateOrNull(account.purchaseDate),
      purchasePrice: numberOrNull(account.purchasePrice),
      promoUsed: account.promoUsed,
      activationDate: dateOrNull(account.activationDate),
      notes: account.notes,
      rule: resolvedRule,
      drawdownType: account.accountType === "FUNDED"
        ? (account.propFirmRule?.fundedDrawdownType ?? "EOD")
        : (account.propFirmRule?.evalDrawdownType ?? "EOD"),
      currentDrawdown: calculateAvailableDrawdownFromCurrent(currentActualDrawdown, drawdownLimit),
      currentActualDrawdown,
      currentResultUsd,
      currentResultEur: getTotalProfitLossEur(currentResultUsd, usdEurRateValue),
      accountBalanceUsd,
      accountBalanceEur: getTotalProfitLossEur(accountBalanceUsd, usdEurRateValue),
      payoutsPaidUsd,
      payoutsGrossUsd,
      payoutsNetUsd,
      expensesUsd,
      accountCostUsd,
      netResultUsd: accountNetResultUsd,
      netResultEur: getTotalProfitLossEur(accountNetResultUsd, usdEurRateValue),
      roiPercent: accountCostUsd > 0 ? (accountNetResultUsd / accountCostUsd) * 100 : null,
      payoutEligibility,
      evaluationEligibility,
      tradedDaysCount: dailyResults.length,
      dailyResults,
      tradeEntries: account.tradingDays.map((day) => ({
        id: day.id,
        accountId: day.accountId,
        tradeDate: dateString(day.tradeDate),
        createdAt: day.createdAt.toISOString(),
        createdAtTime: timeString(day.createdAt),
        profitLossUsd: Number(day.profitLoss),
        drawdownAtClose: day.drawdownAtClose !== null ? Number(day.drawdownAtClose) : null,
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
      costHistory,
      payouts: account.payouts.map((payout) => ({
        id: payout.id,
        amount: Number(payout.amount),
        currency: payout.currency,
        date: dateString(payout.payoutDate),
        createdAt: payout.createdAt.toISOString(),
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
    users: users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: dateString(user.createdAt),
      lastLoginAt: user.lastLoginAt ? dateString(user.lastLoginAt) : null
    })),
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
      minDailyProfit: numberOrNull(rule.minDailyProfit),
      minTradingDaysForPayout: rule.minTradingDaysForPayout,
      minPayoutTradingDays: rule.minPayoutTradingDays,
      minDailyProfitForPayout: numberOrNull(rule.minDailyProfitForPayout),
      payoutBuffer: numberOrNull(rule.payoutBuffer),
      payoutRuleType: rule.payoutRuleType,
      traderSharePercent: numberOrNull(rule.traderSharePercent),
      traderFullShareUntilAmount: numberOrNull(rule.traderFullShareUntilAmount),
      defaultPurchasePrice: numberOrNull(rule.defaultPurchasePrice),
      defaultActivationPrice: numberOrNull(rule.defaultActivationPrice ?? rule.activationPrice),
      defaultResetPrice: numberOrNull(rule.defaultResetPrice),
      defaultFundedResetPrice: numberOrNull(rule.defaultFundedResetPrice),
      promoNote: rule.promoNote ?? rule.promo,
      notes: rule.notes,
      evalDrawdownType: rule.evalDrawdownType,
      fundedDrawdownType: rule.fundedDrawdownType,
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
    })),
    marketWatchlist: marketWatchlist.map((item) => ({
      id: item.id,
      query: item.query,
      symbol: item.symbol,
      displaySymbol: item.displaySymbol,
      name: item.name,
      exchange: item.exchange,
      quoteType: item.quoteType,
      instrumentType: item.instrumentType,
      contractRoot: item.contractRoot,
      activeContractCode: item.activeContractCode,
      activeContractMonth: item.activeContractMonth,
      activeContractYear: item.activeContractYear,
      feedSymbol: item.feedSymbol,
      source: item.source,
      color: item.color,
      sortOrder: item.sortOrder
    }))
  };
}
