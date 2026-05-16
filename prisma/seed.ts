import { Prisma, PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function date(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

async function upsertStandardPropFirmRule(data: Prisma.PropFirmRuleUncheckedCreateInput) {
  const existingRule = await prisma.propFirmRule.findFirst({
    where: {
      propFirmId: data.propFirmId,
      name: data.name,
      accountSize: data.accountSize
    },
    select: { id: true }
  });

  if (existingRule) {
    return prisma.propFirmRule.update({
      where: { id: existingRule.id },
      data
    });
  }

  return prisma.propFirmRule.create({ data });
}

async function main() {
  const adminPasswordHash = await bcrypt.hash("IronMan04!!", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin" },
    update: {
      passwordHash: adminPasswordHash,
      role: "ADMIN",
      isActive: true
    },
    create: {
      email: "admin",
      name: "admin",
      passwordHash: adminPasswordHash,
      role: "ADMIN"
    }
  });

  const user = await prisma.user.upsert({
    where: { email: "demo@tradboard.local" },
    update: {},
    create: {
      email: "demo@tradboard.local",
      name: "Demo Trader",
      role: "USER"
    }
  });

  const apex = await prisma.propFirm.upsert({
    where: { name: "Apex Trader Funding" },
    update: {},
    create: {
      name: "Apex Trader Funding",
      acronym: "APX",
      website: "https://apextraderfunding.com",
      notes: "Prop firm futures utilisee pour les exemples."
    }
  });

  const topstep = await prisma.propFirm.upsert({
    where: { name: "Topstep" },
    update: {},
    create: {
      name: "Topstep",
      acronym: "TPS",
      website: "https://www.topstep.com",
      notes: "Prop firm futures utilisee pour les exemples."
    }
  });

  const apexEval50k = await prisma.propFirmRule.create({
    data: {
      propFirmId: apex.id,
      name: "Evaluation 50K",
      accountType: "EVALUATION",
      accountSize: "50000",
      target: "3000",
      maxDrawdown: "2500",
      dailyDrawdown: "0",
      minTradingDays: 7,
      minTradingDaysForPayout: 10,
      minPayoutTradingDays: 5,
      minDailyProfitForPayout: "250",
      payoutRuleType: "APEX",
      traderSharePercent: "90",
      defaultPurchasePrice: "147",
      defaultResetPrice: "80",
      promo: "Promo exemple",
      notes: "Regle d'exemple a ajuster selon les conditions reelles.",
      isStandard: true
    }
  });

  const apexFunded50k = await prisma.propFirmRule.create({
    data: {
      propFirmId: apex.id,
      name: "Funded 50K",
      accountType: "FUNDED",
      accountSize: "50000",
      target: "0",
      maxDrawdown: "2500",
      buffer: "2600",
      payoutBuffer: "2600",
      minTradingDaysForPayout: 10,
      minPayoutTradingDays: 5,
      minDailyProfitForPayout: "250",
      payoutRuleType: "APEX",
      traderSharePercent: "90",
      activationPrice: "85",
      defaultActivationPrice: "85",
      defaultResetPrice: "85",
      notes: "Compte funded d'exemple.",
      isStandard: true
    }
  });

  await upsertStandardPropFirmRule({
    propFirmId: topstep.id,
    name: "50K Trading Combine",
    accountType: "EVALUATION",
    accountSize: "50000",
    target: "3000",
    maxDrawdown: "2000",
    buffer: "0",
    consistencyPercent: "50",
    fundedConsistencyPercent: "0",
    minTradingDays: 2,
    minTradingDaysForPayout: 5,
    minPayoutTradingDays: 5,
    minDailyProfitForPayout: "200",
    payoutRuleType: "CUSTOM",
    traderSharePercent: "90",
    defaultPurchasePrice: "49",
    defaultActivationPrice: "149",
    defaultResetPrice: "49",
    defaultFundedResetPrice: "0",
    notes: "Topstep Trading Combine.",
    evalDrawdownType: "EOD",
    fundedDrawdownType: "INTRADAY",
    isStandard: true,
    isActive: true
  });

  const topstepEval100k = await upsertStandardPropFirmRule({
    propFirmId: topstep.id,
    name: "100K Trading Combine",
    accountType: "EVALUATION",
    accountSize: "100000",
    target: "6000",
    maxDrawdown: "3000",
    buffer: "0",
    consistencyPercent: "50",
    fundedConsistencyPercent: "0",
    minTradingDays: 2,
    minTradingDaysForPayout: 5,
    minPayoutTradingDays: 5,
    minDailyProfitForPayout: "200",
    payoutRuleType: "CUSTOM",
    traderSharePercent: "90",
    defaultPurchasePrice: "99",
    defaultActivationPrice: "149",
    defaultResetPrice: "99",
    defaultFundedResetPrice: "0",
    notes: "Topstep Trading Combine.",
    evalDrawdownType: "EOD",
    fundedDrawdownType: "INTRADAY",
    isStandard: true,
    isActive: true
  });

  await upsertStandardPropFirmRule({
    propFirmId: topstep.id,
    name: "150K Trading Combine",
    accountType: "EVALUATION",
    accountSize: "150000",
    target: "9000",
    maxDrawdown: "4500",
    buffer: "0",
    consistencyPercent: "50",
    fundedConsistencyPercent: "0",
    minTradingDays: 2,
    minTradingDaysForPayout: 5,
    minPayoutTradingDays: 5,
    minDailyProfitForPayout: "200",
    payoutRuleType: "CUSTOM",
    traderSharePercent: "90",
    defaultPurchasePrice: "149",
    defaultActivationPrice: "149",
    defaultResetPrice: "149",
    defaultFundedResetPrice: "0",
    notes: "Topstep Trading Combine.",
    evalDrawdownType: "EOD",
    fundedDrawdownType: "INTRADAY",
    isStandard: true,
    isActive: true
  });

  const evalAccount = await prisma.account.create({
    data: {
      userId: user.id,
      propFirmId: apex.id,
      propFirmRuleId: apexEval50k.id,
      name: "Apex Eval 50K #1",
      accountNumber: "APX-EVAL-001",
      platform: "RITHMIC",
      currency: "USD",
      accountType: "EVALUATION",
      accountSize: "50000",
      status: "ACTIVE",
      purchaseDate: date("2026-04-02"),
      purchasePrice: "147",
      promoUsed: "SPRING",
      notes: "Compte demo pour le dashboard initial."
    }
  });

  const fundedAccount = await prisma.account.create({
    data: {
      userId: user.id,
      propFirmId: apex.id,
      propFirmRuleId: apexFunded50k.id,
      name: "Apex Funded 50K #1",
      accountNumber: "APX-FUN-001",
      platform: "TRADOVATE",
      currency: "USD",
      accountType: "FUNDED",
      accountSize: "50000",
      status: "ACTIVE",
      activationDate: date("2026-04-18"),
      notes: "Compte funded demo."
    }
  });

  const topstepAccount = await prisma.account.create({
    data: {
      userId: admin.id,
      propFirmId: topstep.id,
      propFirmRuleId: topstepEval100k.id,
      name: "Topstep Eval 100K Admin",
      platform: "NINJATRADER",
      currency: "USD",
      accountType: "EVALUATION",
      accountSize: "100000",
      status: "PASSED",
      purchaseDate: date("2026-03-12"),
      purchasePrice: "165"
    }
  });

  await prisma.tradingDay.createMany({
    data: [
      {
        userId: user.id,
        accountId: evalAccount.id,
        tradeDate: date("2026-04-24"),
        profitLoss: "420.50",
        tradeCount: 6,
        notes: "Bonne journee, risque controle."
      },
      {
        userId: user.id,
        accountId: evalAccount.id,
        tradeDate: date("2026-04-25"),
        profitLoss: "-180.00",
        tradeCount: 4
      },
      {
        userId: user.id,
        accountId: fundedAccount.id,
        tradeDate: date("2026-05-01"),
        profitLoss: "760.25",
        tradeCount: 8,
        notes: "Objectif journalier atteint."
      },
      {
        userId: admin.id,
        accountId: topstepAccount.id,
        tradeDate: date("2026-04-29"),
        profitLoss: "1120.00",
        tradeCount: 10
      }
    ]
  });

  await prisma.accountExpense.createMany({
    data: [
      {
        userId: user.id,
        accountId: evalAccount.id,
        type: "PURCHASE",
        amount: "147.00",
        expenseDate: date("2026-04-02"),
        notes: "Achat evaluation."
      },
      {
        userId: user.id,
        accountId: evalAccount.id,
        type: "RESET",
        amount: "80.00",
        expenseDate: date("2026-04-15"),
        notes: "Reset evaluation."
      },
      {
        userId: user.id,
        accountId: fundedAccount.id,
        type: "ACTIVATION",
        amount: "85.00",
        expenseDate: date("2026-04-18")
      },
      {
        userId: admin.id,
        accountId: topstepAccount.id,
        type: "PURCHASE",
        amount: "165.00",
        expenseDate: date("2026-03-12")
      }
    ]
  });

  await prisma.payout.createMany({
    data: [
      {
        userId: user.id,
        accountId: fundedAccount.id,
        amount: "500.00",
        payoutDate: date("2026-05-08"),
        status: "PENDING",
        notes: "Payout possible a confirmer."
      },
      {
        userId: admin.id,
        accountId: topstepAccount.id,
        amount: "900.00",
        payoutDate: date("2026-04-30"),
        status: "PAID"
      }
    ]
  });

  await prisma.exchangeRate.upsert({
    where: {
      userId_baseCurrency_targetCurrency_rateDate: {
        userId: user.id,
        baseCurrency: "USD",
        targetCurrency: "EUR",
        rateDate: date("2026-05-01")
      }
    },
    update: {
      rate: "0.93",
      source: "Seed manuel"
    },
    create: {
      userId: user.id,
      baseCurrency: "USD",
      targetCurrency: "EUR",
      rate: "0.93",
      rateDate: date("2026-05-01"),
      source: "Seed manuel"
    }
  });

  console.log("Seed complete", {
    users: [admin.email, user.email],
    propFirms: [apex.name, topstep.name]
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
