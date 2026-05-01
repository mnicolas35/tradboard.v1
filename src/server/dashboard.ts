import { prisma } from "@/lib/prisma";
import {
  getActiveAccountsCount,
  getMonthlyProfitLoss,
  getNetResult,
  getTotalExpenses,
  getTotalPayouts,
  getTotalProfitLoss
} from "@/lib/stats";

export async function getDashboardData(userId?: string) {
  const demoUser =
    userId === undefined
      ? await prisma.user.findFirst({
          where: { role: "USER", isActive: true },
          orderBy: { createdAt: "asc" }
        })
      : null;

  const scopedUserId = userId ?? demoUser?.id;

  if (!scopedUserId) {
    return {
      activeAccountsCount: 0,
      totalProfitLoss: 0,
      monthlyProfitLoss: 0,
      totalExpenses: 0,
      totalPayouts: 0,
      netResult: 0,
      accounts: [],
      recentTradingDays: []
    };
  }

  const [accounts, tradingDays, expenses, payouts] = await Promise.all([
    prisma.account.findMany({
      where: { userId: scopedUserId },
      include: {
        propFirm: true,
        propFirmRule: true
      },
      orderBy: { createdAt: "desc" }
    }),
    prisma.tradingDay.findMany({
      where: { userId: scopedUserId },
      include: {
        account: true
      },
      orderBy: { tradeDate: "desc" },
      take: 8
    }),
    prisma.accountExpense.findMany({
      where: { userId: scopedUserId }
    }),
    prisma.payout.findMany({
      where: { userId: scopedUserId }
    })
  ]);

  const allTradingDays = await prisma.tradingDay.findMany({
    where: { userId: scopedUserId },
    select: {
      profitLoss: true,
      tradeDate: true
    }
  });

  const totalProfitLoss = getTotalProfitLoss(allTradingDays);
  const monthlyProfitLoss = getMonthlyProfitLoss(allTradingDays);
  const totalExpenses = getTotalExpenses(expenses);
  const totalPayouts = getTotalPayouts(payouts);

  return {
    activeAccountsCount: getActiveAccountsCount(accounts),
    totalProfitLoss,
    monthlyProfitLoss,
    totalExpenses,
    totalPayouts,
    netResult: getNetResult(totalProfitLoss, totalExpenses, totalPayouts),
    accounts,
    recentTradingDays: tradingDays
  };
}
