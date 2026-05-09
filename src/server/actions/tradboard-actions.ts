"use server";

import type {
  AccountPlatform,
  AccountStatus,
  AccountType,
  Currency,
  ExpenseType,
  PayoutStatus,
  Prisma
} from "@prisma/client";
import type { DrawdownType, PayoutRuleType, ThemePreference } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { isSupportedCurrency } from "@/lib/currency";
import { calculateEvaluationEligibility } from "@/lib/evaluation";
import { prisma } from "@/lib/prisma";
import { resolveAccountRule } from "@/lib/rules";
import { getCurrentUser } from "@/server/auth/current-user";

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function optionalText(formData: FormData, key: string) {
  const value = text(formData, key);
  return value === "" ? null : value;
}

function requiredText(formData: FormData, key: string) {
  const value = text(formData, key);
  if (!value) {
    throw new Error(`Champ requis: ${key}`);
  }

  return value;
}

function optionalDate(formData: FormData, key: string) {
  const value = text(formData, key);
  return value ? new Date(`${value}T00:00:00.000Z`) : null;
}

function todayUtcDate() {
  return new Date(new Date().toISOString().slice(0, 10) + "T00:00:00.000Z");
}

function requiredDate(formData: FormData, key: string) {
  const value = text(formData, key);
  if (!value) {
    throw new Error(`Date requise: ${key}`);
  }

  return new Date(`${value}T00:00:00.000Z`);
}

function optionalDecimal(formData: FormData, key: string) {
  const value = text(formData, key);
  return value === "" ? null : value.replace(",", ".");
}

function requiredDecimal(formData: FormData, key: string) {
  const value = optionalDecimal(formData, key);
  if (!value) {
    throw new Error(`Montant requis: ${key}`);
  }

  return value;
}

function optionalInt(formData: FormData, key: string) {
  const value = text(formData, key);
  return value === "" ? null : Number.parseInt(value, 10);
}

function optionalRuleType(formData: FormData): PayoutRuleType | null {
  const value = text(formData, "payoutRuleType");
  const values = ["NONE", "BUFFER_ONLY", "APEX", "TAKE_PROFIT_TRADER", "CUSTOM"];
  return values.includes(value) ? (value as PayoutRuleType) : null;
}

function drawdownType(formData: FormData, key: string): DrawdownType {
  const value = formData.get(key);
  return value === "INTRADAY" ? "INTRADAY" : "EOD";
}

function currency(formData: FormData, key: string): Currency {
  const value = formData.get(key);
  return isSupportedCurrency(value) ? value : "USD";
}

function platform(formData: FormData): AccountPlatform | null {
  const value = text(formData, "platform");
  const values = ["RITHMIC", "TRADOVATE", "NINJATRADER", "MT5", "DXTRADE", "MATCHTRADER", "OTHER"];
  return values.includes(value) ? (value as AccountPlatform) : null;
}

function accountType(formData: FormData): AccountType {
  const value = requiredText(formData, "accountType");
  if (value !== "EVALUATION" && value !== "FUNDED") {
    throw new Error("Type de compte invalide.");
  }

  return value as AccountType;
}

function accountStatus(formData: FormData): AccountStatus {
  const value = requiredText(formData, "status");
  const values: AccountStatus[] = ["ACTIVE", "PASSED", "FAILED", "CLOSED"];

  if (!values.includes(value as AccountStatus)) {
    throw new Error("Statut invalide.");
  }

  return value as AccountStatus;
}

function refresh() {
  revalidatePath("/");
}

function evaluationDays(tradingDays: Array<{ tradeDate: Date; profitLoss: Prisma.Decimal }>, startDate: Date | null) {
  const totals = new Map<string, number>();
  const start = startDate?.toISOString().slice(0, 10) ?? null;

  for (const day of tradingDays) {
    const key = day.tradeDate.toISOString().slice(0, 10);
    if (start && key < start) {
      continue;
    }

    totals.set(key, (totals.get(key) ?? 0) + Number(day.profitLoss));
  }

  return [...totals.values()].map((profitLossUsd) => ({ profitLossUsd }));
}

async function assertAdmin() {
  const currentUser = await getCurrentUser();
  if (currentUser.role !== "ADMIN") {
    throw new Error("Action reservee aux administrateurs.");
  }

  return currentUser;
}

async function assertOwnAccount(accountId: string, userId: string) {
  const account = await prisma.account.findFirst({
    where: { id: accountId, userId },
    select: { id: true }
  });

  if (!account) {
    throw new Error("Compte introuvable pour cet utilisateur.");
  }
}

export async function createPropFirm(formData: FormData) {
  const name = requiredText(formData, "name");
  const acronym = requiredText(formData, "acronym").toUpperCase();
  const website = optionalText(formData, "website");
  const notes = optionalText(formData, "notes");
  const isActive = formData.get("isActive") === "on";

  await prisma.propFirm.upsert({
    where: { name },
    update: {
      acronym,
      website,
      notes,
      isActive
    },
    create: {
      name,
      acronym,
      website,
      notes,
      isActive
    }
  });

  refresh();
}

export async function createPropFirmRule(formData: FormData) {
  const currentUser = await getCurrentUser();
  const requestedStandard = formData.get("isStandard") === "on";
  const isStandard = currentUser.role === "ADMIN" ? requestedStandard : false;
  const propFirmId = requiredText(formData, "propFirmId");
  const accountSize = requiredDecimal(formData, "accountSize");
  const propFirm = await prisma.propFirm.findUnique({
    where: { id: propFirmId },
    select: { acronym: true, name: true }
  });

  if (!propFirm) {
    throw new Error("PropFirm introuvable.");
  }

  const ruleName = optionalText(formData, "name") || `${propFirm.acronym} ${Math.round(Number(accountSize) / 1000)}k`;

  await prisma.propFirmRule.create({
    data: {
      propFirmId,
      createdByUserId: isStandard ? null : currentUser.id,
      name: ruleName,
      accountType: requiredText(formData, "accountType") as AccountType,
      accountSize,
      target: requiredDecimal(formData, "target"),
      maxDrawdown: requiredDecimal(formData, "maxDrawdown"),
      dailyDrawdown: optionalDecimal(formData, "dailyDrawdown"),
      buffer: optionalDecimal(formData, "buffer"),
      payoutBuffer: optionalDecimal(formData, "payoutBuffer"),
      consistencyPercent: optionalDecimal(formData, "consistencyPercent"),
      fundedConsistencyPercent: optionalDecimal(formData, "fundedConsistencyPercent"),
      minTradingDays: optionalInt(formData, "minTradingDays"),
      minDailyProfit: optionalDecimal(formData, "minDailyProfit"),
      minTradingDaysForPayout: optionalInt(formData, "minTradingDaysForPayout"),
      minPayoutTradingDays: optionalInt(formData, "minPayoutTradingDays") ?? optionalInt(formData, "minTradingDaysForPayout"),
      minDailyProfitForPayout: optionalDecimal(formData, "minDailyProfitForPayout"),
      payoutRuleType: optionalRuleType(formData) ?? "NONE",
      traderSharePercent: optionalDecimal(formData, "traderSharePercent"),
      defaultPurchasePrice: optionalDecimal(formData, "defaultPurchasePrice"),
      activationPrice: optionalDecimal(formData, "activationPrice"),
      defaultActivationPrice: optionalDecimal(formData, "defaultActivationPrice") ?? optionalDecimal(formData, "activationPrice"),
      defaultResetPrice: optionalDecimal(formData, "defaultResetPrice"),
      defaultFundedResetPrice: optionalDecimal(formData, "defaultFundedResetPrice"),
      promo: optionalText(formData, "promo"),
      promoNote: optionalText(formData, "promoNote") ?? optionalText(formData, "promo"),
      notes: optionalText(formData, "notes"),
      evalDrawdownType: drawdownType(formData, "evalDrawdownType"),
      fundedDrawdownType: drawdownType(formData, "fundedDrawdownType"),
      isStandard,
      isActive: formData.get("isActive") === "on"
    }
  });

  refresh();
}

async function assertCanManagePropFirmRule(ruleId: string) {
  const currentUser = await getCurrentUser();
  const rule = await prisma.propFirmRule.findUnique({
    where: { id: ruleId },
    select: {
      id: true,
      isStandard: true,
      createdByUserId: true,
      propFirmId: true
    }
  });

  if (!rule) {
    throw new Error("Regle introuvable.");
  }

  const canManage = currentUser.role === "ADMIN" || (!rule.isStandard && rule.createdByUserId === currentUser.id);
  if (!canManage) {
    throw new Error("Vous ne pouvez modifier que vos regles custom.");
  }

  return { currentUser, rule };
}

export async function updatePropFirmRule(formData: FormData) {
  const id = requiredText(formData, "id");
  const { currentUser, rule } = await assertCanManagePropFirmRule(id);
  const requestedStandard = formData.get("isStandard") === "on";
  const isStandard = currentUser.role === "ADMIN" ? requestedStandard : false;
  const propFirmId = optionalText(formData, "propFirmId") ?? rule.propFirmId;

  await prisma.$transaction([
    prisma.propFirmRule.update({
      where: { id },
      data: {
        propFirm: { connect: { id: propFirmId } },
        createdByUser: isStandard
          ? { disconnect: true }
          : { connect: { id: rule.createdByUserId ?? currentUser.id } },
        name: requiredText(formData, "name"),
        accountType: requiredText(formData, "accountType") as AccountType,
        accountSize: requiredDecimal(formData, "accountSize"),
        target: requiredDecimal(formData, "target"),
        maxDrawdown: requiredDecimal(formData, "maxDrawdown"),
        dailyDrawdown: optionalDecimal(formData, "dailyDrawdown"),
        buffer: optionalDecimal(formData, "buffer"),
        payoutBuffer: optionalDecimal(formData, "payoutBuffer"),
        consistencyPercent: optionalDecimal(formData, "consistencyPercent"),
        fundedConsistencyPercent: optionalDecimal(formData, "fundedConsistencyPercent"),
        minTradingDays: optionalInt(formData, "minTradingDays"),
        minDailyProfit: optionalDecimal(formData, "minDailyProfit"),
        minTradingDaysForPayout: optionalInt(formData, "minTradingDaysForPayout"),
        minPayoutTradingDays: optionalInt(formData, "minPayoutTradingDays") ?? optionalInt(formData, "minTradingDaysForPayout"),
        minDailyProfitForPayout: optionalDecimal(formData, "minDailyProfitForPayout"),
        payoutRuleType: optionalRuleType(formData) ?? "NONE",
        traderSharePercent: optionalDecimal(formData, "traderSharePercent"),
        defaultPurchasePrice: optionalDecimal(formData, "defaultPurchasePrice"),
        activationPrice: optionalDecimal(formData, "activationPrice"),
        defaultActivationPrice: optionalDecimal(formData, "defaultActivationPrice") ?? optionalDecimal(formData, "activationPrice"),
        defaultResetPrice: optionalDecimal(formData, "defaultResetPrice"),
        defaultFundedResetPrice: optionalDecimal(formData, "defaultFundedResetPrice"),
        promo: optionalText(formData, "promo"),
        promoNote: optionalText(formData, "promoNote") ?? optionalText(formData, "promo"),
        notes: optionalText(formData, "notes"),
        evalDrawdownType: drawdownType(formData, "evalDrawdownType"),
        fundedDrawdownType: drawdownType(formData, "fundedDrawdownType"),
        isStandard,
        isActive: formData.get("isActive") === "on"
      }
    }),
    prisma.account.updateMany({
      where: { propFirmRuleId: id },
      data: { updatedAt: new Date() }
    })
  ]);

  refresh();
}

export async function deletePropFirmRule(formData: FormData) {
  const id = requiredText(formData, "id");
  await assertCanManagePropFirmRule(id);
  await prisma.propFirmRule.delete({ where: { id } });
  refresh();
}

export async function createAccount(formData: FormData) {
  const currentUser = await getCurrentUser();
  const propFirmId = requiredText(formData, "propFirmId");
  const propFirmRuleId = requiredText(formData, "propFirmRuleId");
  const selectedAccountType = accountType(formData);
  const promoPercentValue = optionalDecimal(formData, "promoPercent");
  const promoPercent = promoPercentValue === null ? 0 : Number(promoPercentValue);

  if (Number.isNaN(promoPercent) || promoPercent < 0 || promoPercent > 100) {
    throw new Error("Promo invalide.");
  }

  const rule = await prisma.propFirmRule.findFirst({
    where: {
      id: propFirmRuleId,
      propFirmId,
      isActive: true,
      OR: currentUser.role === "ADMIN" ? undefined : [{ isStandard: true }, { createdByUserId: currentUser.id }]
    },
    include: { propFirm: true }
  });

  if (!rule) {
    throw new Error("Règle PropFirm introuvable.");
  }

  const defaultPurchasePrice = rule.defaultPurchasePrice === null ? null : Number(rule.defaultPurchasePrice);
  const purchasePrice =
    defaultPurchasePrice === null ? null : (defaultPurchasePrice * (100 - promoPercent)) / 100;
  const promoUsed = promoPercent > 0 ? `${promoPercent}%` : null;
  const generatedName = `${rule.propFirm.acronym} ${rule.name}`;
  const purchaseDate = requiredDate(formData, "purchaseDate");
  const activationDate =
    selectedAccountType === "FUNDED" ? requiredDate(formData, "activationDate") : null;

  await prisma.account.create({
    data: {
      userId: currentUser.id,
      propFirmId,
      propFirmRuleId,
      parentAccountId: null,
      accountType: selectedAccountType,
      accountSize: rule.accountSize,
      name: generatedName,
      accountNumber: optionalText(formData, "accountNumber"),
      platform: null,
      currency: "USD",
      purchaseDate,
      purchasePrice,
      promoUsed,
      activationDate,
      status: accountStatus(formData),
      notes: optionalText(formData, "notes")
    }
  });

  refresh();
}

export async function createTradingDay(formData: FormData) {
  const currentUser = await getCurrentUser();
  const accountId = requiredText(formData, "accountId");
  const tradeDate = optionalDate(formData, "tradeDate") ?? todayUtcDate();
  const profitLoss = requiredDecimal(formData, "profitLoss");

  await assertOwnAccount(accountId, currentUser.id);

  await prisma.tradingDay.create({
    data: {
      userId: currentUser.id,
      accountId,
      tradeDate,
      profitLoss,
      tradeCount: optionalInt(formData, "tradeCount"),
      notes: optionalText(formData, "notes")
    }
  });

  refresh();
}

async function assertOwnTradingDay(tradingDayId: string, userId: string) {
  const tradingDay = await prisma.tradingDay.findFirst({
    where: { id: tradingDayId, userId },
    select: { id: true }
  });

  if (!tradingDay) {
    throw new Error("Trade introuvable pour cet utilisateur.");
  }
}

export async function updateTradingDay(formData: FormData) {
  const currentUser = await getCurrentUser();
  const tradingDayId = requiredText(formData, "tradingDayId");

  await assertOwnTradingDay(tradingDayId, currentUser.id);

  await prisma.tradingDay.update({
    where: { id: tradingDayId },
    data: {
      tradeDate: requiredDate(formData, "tradeDate"),
      profitLoss: requiredDecimal(formData, "profitLoss"),
      tradeCount: optionalInt(formData, "tradeCount"),
      notes: optionalText(formData, "notes")
    }
  });

  refresh();
}

export async function deleteTradingDay(formData: FormData) {
  const currentUser = await getCurrentUser();
  const tradingDayId = requiredText(formData, "tradingDayId");
  const confirmation = requiredText(formData, "confirmation");

  if (confirmation !== "SUPPRIMER") {
    throw new Error("Confirmation de suppression invalide.");
  }

  await assertOwnTradingDay(tradingDayId, currentUser.id);
  await prisma.tradingDay.delete({ where: { id: tradingDayId } });

  refresh();
}

export async function createExpense(formData: FormData) {
  const currentUser = await getCurrentUser();
  const accountId = requiredText(formData, "accountId");

  await assertOwnAccount(accountId, currentUser.id);

  await prisma.accountExpense.create({
    data: {
      userId: currentUser.id,
      accountId,
      type: requiredText(formData, "type") as ExpenseType,
      amount: requiredDecimal(formData, "amount"),
      currency: currency(formData, "currency"),
      expenseDate: requiredDate(formData, "expenseDate"),
      notes: optionalText(formData, "notes")
    }
  });

  refresh();
}

export async function createPayout(formData: FormData) {
  const currentUser = await getCurrentUser();
  const accountId = requiredText(formData, "accountId");

  await assertOwnAccount(accountId, currentUser.id);

  await prisma.payout.create({
    data: {
      userId: currentUser.id,
      accountId,
      amount: requiredDecimal(formData, "amount"),
      currency: currency(formData, "currency"),
      payoutDate: requiredDate(formData, "payoutDate"),
      status: requiredText(formData, "status") as PayoutStatus,
      notes: optionalText(formData, "notes")
    }
  });

  refresh();
}

export async function createExchangeRate(formData: FormData) {
  const currentUser = await getCurrentUser();

  await prisma.exchangeRate.upsert({
    where: {
      userId_baseCurrency_targetCurrency_rateDate: {
        userId: currentUser.id,
        baseCurrency: currency(formData, "baseCurrency"),
        targetCurrency: currency(formData, "targetCurrency"),
        rateDate: requiredDate(formData, "rateDate")
      }
    },
    update: {
      rate: requiredDecimal(formData, "rate"),
      source: optionalText(formData, "source")
    },
    create: {
      userId: currentUser.id,
      baseCurrency: currency(formData, "baseCurrency"),
      targetCurrency: currency(formData, "targetCurrency"),
      rate: requiredDecimal(formData, "rate"),
      rateDate: requiredDate(formData, "rateDate"),
      source: optionalText(formData, "source")
    }
  });

  refresh();
}

export async function archiveAccount(formData: FormData) {
  const currentUser = await getCurrentUser();
  const accountId = requiredText(formData, "accountId");

  await assertOwnAccount(accountId, currentUser.id);
  await prisma.account.update({
    where: { id: accountId },
    data: { status: "ARCHIVED" }
  });

  refresh();
}

export async function closeAccount(formData: FormData) {
  const currentUser = await getCurrentUser();
  const accountId = requiredText(formData, "accountId");
  const closeStatus = requiredText(formData, "closeStatus");

  if (closeStatus !== "FAILED" && closeStatus !== "PASSED" && closeStatus !== "CLOSED") {
    throw new Error("Statut de fermeture invalide.");
  }

  const account = await prisma.account.findFirst({
    where: { id: accountId, userId: currentUser.id },
    select: { accountType: true }
  });

  if (!account) {
    throw new Error("Compte introuvable pour cet utilisateur.");
  }

  if (account.accountType === "EVALUATION" && closeStatus === "CLOSED") {
    throw new Error("Une evaluation ne peut etre fermee qu'en PASSED ou FAILED.");
  }

  await prisma.account.update({
    where: { id: accountId },
    data: { status: closeStatus as AccountStatus }
  });

  refresh();
}

export async function updateAccountDetails(formData: FormData) {
  const currentUser = await getCurrentUser();
  const accountId = requiredText(formData, "accountId");
  const account = await prisma.account.findFirst({
    where: { id: accountId, userId: currentUser.id },
    select: { id: true, accountType: true }
  });

  if (!account) {
    throw new Error("Compte introuvable pour cet utilisateur.");
  }

  await prisma.account.update({
    where: { id: account.id },
    data: {
      accountNumber: requiredText(formData, "accountNumber"),
      purchaseDate: requiredDate(formData, "purchaseDate"),
      activationDate: account.accountType === "FUNDED" ? requiredDate(formData, "activationDate") : optionalDate(formData, "activationDate")
    }
  });

  refresh();
}

export async function deleteAccount(formData: FormData) {
  const currentUser = await getCurrentUser();
  const accountId = requiredText(formData, "accountId");
  const confirmationNumber = requiredText(formData, "confirmationNumber");
  const account = await prisma.account.findFirst({
    where: { id: accountId, userId: currentUser.id },
    select: { id: true, accountNumber: true }
  });

  if (!account) {
    throw new Error("Compte introuvable pour cet utilisateur.");
  }

  if (confirmationNumber !== (account.accountNumber ?? "Sans numero")) {
    throw new Error("Le numero retape ne correspond pas au compte.");
  }

  await prisma.account.delete({ where: { id: accountId } });
  refresh();
}

export async function validateEvaluation(formData: FormData) {
  const currentUser = await getCurrentUser();
  const accountId = requiredText(formData, "accountId");
  const account = await prisma.account.findFirst({
    where: { id: accountId, userId: currentUser.id, accountType: "EVALUATION", status: "ACTIVE" },
    include: { propFirmRule: true, ruleOverride: true, tradingDays: true }
  });

  if (!account) {
    throw new Error("Evaluation introuvable pour cet utilisateur.");
  }

  if (!account.propFirmRule) {
    throw new Error("Regle introuvable pour cette evaluation.");
  }

  const currentResultUsd = account.tradingDays.reduce((sum, day) => sum + Number(day.profitLoss), 0);
  const resolvedRule = resolveAccountRule(account.propFirmRule, account.ruleOverride);
  const eligibility = calculateEvaluationEligibility(
    currentResultUsd,
    evaluationDays(account.tradingDays, account.purchaseDate),
    resolvedRule
  );

  if (!eligibility.isEligible) {
    throw new Error(eligibility.reasons[0] ?? "L'evaluation ne respecte pas encore sa regle.");
  }

  const activationCost = resolvedRule?.defaultActivationPrice ?? null;
  const activationDate = optionalDate(formData, "activationDate") ?? todayUtcDate();

  await prisma.$transaction([
    prisma.account.update({
      where: { id: account.id },
      data: { status: "PASSED" }
    }),
    prisma.account.create({
      data: {
        userId: currentUser.id,
        propFirmId: account.propFirmId,
        propFirmRuleId: account.propFirmRuleId,
        parentAccountId: account.id,
        name: `${account.propFirmRule.name} funded`,
        accountNumber: requiredText(formData, "accountNumber"),
        platform: account.platform,
        currency: account.currency,
        accountType: "FUNDED",
        accountSize: account.accountSize,
        status: "ACTIVE",
        purchaseDate: activationDate,
        purchasePrice: activationCost,
        promoUsed: activationCost ? "Activation" : null,
        activationDate,
        notes: optionalText(formData, "notes")
      }
    })
  ]);

  refresh();
}

export async function resetEvaluation(formData: FormData) {
  const currentUser = await getCurrentUser();
  const accountId = requiredText(formData, "accountId");
  const account = await prisma.account.findFirst({
    where: { id: accountId, userId: currentUser.id, accountType: "EVALUATION", status: "ACTIVE" },
    include: { propFirmRule: true, ruleOverride: true, tradingDays: true }
  });

  if (!account) {
    throw new Error("Evaluation introuvable pour cet utilisateur.");
  }

  if (!account.propFirmRule) {
    throw new Error("Regle introuvable pour cette evaluation.");
  }

  const currentResultUsd = account.tradingDays.reduce((sum, day) => sum + Number(day.profitLoss), 0);
  const resolvedRule = resolveAccountRule(account.propFirmRule, account.ruleOverride);
  const eligibility = calculateEvaluationEligibility(
    currentResultUsd,
    evaluationDays(account.tradingDays, account.purchaseDate),
    resolvedRule
  );

  if (!eligibility.isFailed) {
    throw new Error("L'evaluation ne respecte pas les conditions de reset.");
  }

  const resetCost = resolvedRule?.defaultResetPrice ?? null;
  const accumulatedCost = Number(account.purchasePrice ?? 0) + (resetCost ?? 0);
  const resetDate = todayUtcDate();
  const transactions: Prisma.PrismaPromise<unknown>[] = [
    prisma.account.update({
      where: { id: account.id },
      data: { status: "FAILED" as AccountStatus }
    }),
    prisma.account.create({
      data: {
        userId: currentUser.id,
        propFirmId: account.propFirmId,
        propFirmRuleId: account.propFirmRuleId,
        parentAccountId: account.id,
        name: `${account.propFirmRule.name} reset`,
        accountNumber: requiredText(formData, "accountNumber"),
        platform: account.platform,
        currency: account.currency,
        accountType: "EVALUATION" as AccountType,
        accountSize: account.accountSize,
        status: "ACTIVE" as AccountStatus,
        purchaseDate: resetDate,
        purchasePrice: accumulatedCost > 0 ? accumulatedCost : null,
        promoUsed: resetCost ? "Reset" : null,
        notes: optionalText(formData, "notes")
      }
    })
  ];

  await prisma.$transaction(transactions);
  refresh();
}

export async function closeFailedEvaluation(formData: FormData) {
  const currentUser = await getCurrentUser();
  const accountId = requiredText(formData, "accountId");
  const account = await prisma.account.findFirst({
    where: { id: accountId, userId: currentUser.id, accountType: "EVALUATION", status: "ACTIVE" },
    include: { propFirmRule: true, ruleOverride: true, tradingDays: true }
  });

  if (!account) {
    throw new Error("Evaluation introuvable pour cet utilisateur.");
  }

  if (!account.propFirmRule) {
    throw new Error("Regle introuvable pour cette evaluation.");
  }

  const currentResultUsd = account.tradingDays.reduce((sum, day) => sum + Number(day.profitLoss), 0);
  const resolvedRule = resolveAccountRule(account.propFirmRule, account.ruleOverride);
  const eligibility = calculateEvaluationEligibility(
    currentResultUsd,
    evaluationDays(account.tradingDays, account.purchaseDate),
    resolvedRule
  );

  if (!eligibility.isFailed) {
    throw new Error("L'evaluation ne respecte pas les conditions d'echec.");
  }

  await prisma.account.update({
    where: { id: account.id },
    data: { status: "FAILED" }
  });

  refresh();
}

export async function saveAccountRuleOverride(formData: FormData) {
  const currentUser = await getCurrentUser();
  const accountId = requiredText(formData, "accountId");

  await assertOwnAccount(accountId, currentUser.id);

  await prisma.accountRuleOverride.upsert({
    where: { accountId },
    update: {
      target: optionalDecimal(formData, "target"),
      maxDrawdown: optionalDecimal(formData, "maxDrawdown"),
      dailyDrawdown: optionalDecimal(formData, "dailyDrawdown"),
      buffer: optionalDecimal(formData, "buffer"),
      payoutBuffer: optionalDecimal(formData, "payoutBuffer"),
      minTradingDays: optionalInt(formData, "minTradingDays"),
      minDailyProfit: optionalDecimal(formData, "minDailyProfit"),
      minPayoutTradingDays: optionalInt(formData, "minPayoutTradingDays"),
      minDailyProfitForPayout: optionalDecimal(formData, "minDailyProfitForPayout"),
      consistencyPercent: optionalDecimal(formData, "consistencyPercent"),
      payoutRuleType: optionalRuleType(formData),
      traderSharePercent: optionalDecimal(formData, "traderSharePercent"),
      defaultPurchasePrice: optionalDecimal(formData, "defaultPurchasePrice"),
      defaultActivationPrice: optionalDecimal(formData, "defaultActivationPrice"),
      defaultResetPrice: optionalDecimal(formData, "defaultResetPrice"),
      promoNote: optionalText(formData, "promoNote"),
      notes: optionalText(formData, "notes")
    },
    create: {
      accountId,
      target: optionalDecimal(formData, "target"),
      maxDrawdown: optionalDecimal(formData, "maxDrawdown"),
      dailyDrawdown: optionalDecimal(formData, "dailyDrawdown"),
      buffer: optionalDecimal(formData, "buffer"),
      payoutBuffer: optionalDecimal(formData, "payoutBuffer"),
      minTradingDays: optionalInt(formData, "minTradingDays"),
      minDailyProfit: optionalDecimal(formData, "minDailyProfit"),
      minPayoutTradingDays: optionalInt(formData, "minPayoutTradingDays"),
      minDailyProfitForPayout: optionalDecimal(formData, "minDailyProfitForPayout"),
      consistencyPercent: optionalDecimal(formData, "consistencyPercent"),
      payoutRuleType: optionalRuleType(formData),
      traderSharePercent: optionalDecimal(formData, "traderSharePercent"),
      defaultPurchasePrice: optionalDecimal(formData, "defaultPurchasePrice"),
      defaultActivationPrice: optionalDecimal(formData, "defaultActivationPrice"),
      defaultResetPrice: optionalDecimal(formData, "defaultResetPrice"),
      promoNote: optionalText(formData, "promoNote"),
      notes: optionalText(formData, "notes")
    }
  });

  refresh();
}

export async function updateThemePreference(formData: FormData) {
  const currentUser = await getCurrentUser();
  const theme = requiredText(formData, "themePreference") as ThemePreference;

  if (theme !== "LIGHT" && theme !== "DARK") {
    throw new Error("Theme invalide.");
  }

  await prisma.user.update({
    where: { id: currentUser.id },
    data: { themePreference: theme }
  });

  refresh();
}

export async function updatePropFirm(formData: FormData) {
  const currentUser = await getCurrentUser();
  const id = requiredText(formData, "id");

  await prisma.propFirm.update({
    where: { id },
    data: {
      name: requiredText(formData, "name"),
      acronym: requiredText(formData, "acronym").toUpperCase(),
      website: optionalText(formData, "website"),
      notes: optionalText(formData, "notes"),
      isActive: formData.get("isActive") === "on"
    }
  });

  if (currentUser.role !== "ADMIN") {
    // Non-admins may edit shared metadata during the mock-auth phase, but not delete.
  }

  refresh();
}

export async function deletePropFirm(formData: FormData) {
  const id = requiredText(formData, "id");
  await assertAdmin();

  const firm = await prisma.propFirm.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      _count: {
        select: {
          accounts: true,
          rules: true
        }
      }
    }
  });

  if (!firm) {
    throw new Error("PropFirm introuvable.");
  }

  if (firm._count.accounts > 0) {
    throw new Error(`Suppression impossible : ${firm._count.accounts} compte(s) utilisateur sont encore liés à ${firm.name}.`);
  }

  if (firm._count.rules > 0) {
    throw new Error(`Suppression impossible : ${firm._count.rules} règle(s) sont encore liées à ${firm.name}.`);
  }

  await prisma.propFirm.delete({ where: { id } });
  refresh();
}

type FrankfurterRateResponse = {
  date?: string;
  rate?: number;
  base?: string;
  quote?: string;
};

export async function updateUsdEurRateFromInternet() {
  const currentUser = await getCurrentUser();
  const response = await fetch("https://api.frankfurter.dev/v2/rate/USD/EUR", {
    cache: "no-store",
    headers: { accept: "application/json" }
  });

  if (!response.ok) {
    throw new Error("Impossible de recuperer le taux USD/EUR.");
  }

  const payload = (await response.json()) as FrankfurterRateResponse;
  if (!payload.rate || !payload.date) {
    throw new Error("Reponse taux USD/EUR invalide.");
  }

  await prisma.exchangeRate.upsert({
    where: {
      userId_baseCurrency_targetCurrency_rateDate: {
        userId: currentUser.id,
        baseCurrency: "USD",
        targetCurrency: "EUR",
        rateDate: new Date(`${payload.date}T00:00:00.000Z`)
      }
    },
    update: {
      rate: String(payload.rate),
      source: "Frankfurter"
    },
    create: {
      userId: currentUser.id,
      baseCurrency: "USD",
      targetCurrency: "EUR",
      rate: String(payload.rate),
      rateDate: new Date(`${payload.date}T00:00:00.000Z`),
      source: "Frankfurter"
    }
  });

  refresh();
}
