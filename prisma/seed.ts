import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function date(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

async function main() {
  const admin = await prisma.user.upsert({
    where: { email: "admin@tradboard.local" },
    update: {},
    create: {
      email: "admin@tradboard.local",
      name: "Admin TradBoard",
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
      website: "https://apextraderfunding.com",
      notes: "Prop firm futures utilisee pour les exemples."
    }
  });

  const topstep = await prisma.propFirm.upsert({
    where: { name: "Topstep" },
    update: {},
    create: {
      name: "Topstep",
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
      defaultPurchasePrice: "147",
      defaultResetPrice: "80",
      notes: "Regle d'exemple a ajuster selon les conditions reelles."
    }
  });

  const apexPa50k = await prisma.propFirmRule.create({
    data: {
      propFirmId: apex.id,
      name: "PA 50K",
      accountType: "PA",
      accountSize: "50000",
      target: "0",
      maxDrawdown: "2500",
      buffer: "2600",
      defaultResetPrice: "85",
      notes: "Compte PA d'exemple."
    }
  });

  const topstepEval100k = await prisma.propFirmRule.create({
    data: {
      propFirmId: topstep.id,
      name: "Evaluation 100K",
      accountType: "EVALUATION",
      accountSize: "100000",
      target: "6000",
      maxDrawdown: "3000",
      dailyDrawdown: "2000",
      minTradingDays: 5,
      defaultPurchasePrice: "165",
      notes: "Regle d'exemple a ajuster selon les conditions reelles."
    }
  });

  const evalAccount = await prisma.account.create({
    data: {
      userId: user.id,
      propFirmId: apex.id,
      propFirmRuleId: apexEval50k.id,
      name: "Apex Eval 50K #1",
      accountType: "EVALUATION",
      accountSize: "50000",
      status: "ACTIVE",
      purchaseDate: date("2026-04-02"),
      purchasePrice: "147",
      notes: "Compte demo pour le dashboard initial."
    }
  });

  const paAccount = await prisma.account.create({
    data: {
      userId: user.id,
      propFirmId: apex.id,
      propFirmRuleId: apexPa50k.id,
      name: "Apex PA 50K #1",
      accountType: "PA",
      accountSize: "50000",
      status: "ACTIVE",
      activationDate: date("2026-04-18"),
      notes: "Compte PA demo."
    }
  });

  const topstepAccount = await prisma.account.create({
    data: {
      userId: admin.id,
      propFirmId: topstep.id,
      propFirmRuleId: topstepEval100k.id,
      name: "Topstep Eval 100K Admin",
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
        accountId: paAccount.id,
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
        accountId: paAccount.id,
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
        accountId: paAccount.id,
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
