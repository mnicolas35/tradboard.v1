"use server";

import type {
  AccountPlatform,
  AccountStatus,
  AccountType,
  Currency,
  ExpenseType,
  PayoutStatus
} from "@prisma/client";
import type { PayoutRuleType, ThemePreference } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { isSupportedCurrency } from "@/lib/currency";
import { prisma } from "@/lib/prisma";
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

function currency(formData: FormData, key: string): Currency {
  const value = formData.get(key);
  return isSupportedCurrency(value) ? value : "USD";
}

function platform(formData: FormData): AccountPlatform | null {
  const value = text(formData, "platform");
  const values = ["RITHMIC", "TRADOVATE", "NINJATRADER", "MT5", "DXTRADE", "MATCHTRADER", "OTHER"];
  return values.includes(value) ? (value as AccountPlatform) : null;
}

function refresh() {
  revalidatePath("/");
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

  await prisma.propFirmRule.create({
    data: {
      propFirmId: requiredText(formData, "propFirmId"),
      createdByUserId: isStandard ? null : currentUser.id,
      name: requiredText(formData, "name"),
      accountType: requiredText(formData, "accountType") as AccountType,
      accountSize: requiredDecimal(formData, "accountSize"),
      target: requiredDecimal(formData, "target"),
      maxDrawdown: requiredDecimal(formData, "maxDrawdown"),
      dailyDrawdown: optionalDecimal(formData, "dailyDrawdown"),
      buffer: optionalDecimal(formData, "buffer"),
      payoutBuffer: optionalDecimal(formData, "payoutBuffer"),
      consistencyPercent: optionalDecimal(formData, "consistencyPercent"),
      minTradingDays: optionalInt(formData, "minTradingDays"),
      minTradingDaysForPayout: optionalInt(formData, "minTradingDaysForPayout"),
      minPayoutTradingDays: optionalInt(formData, "minPayoutTradingDays") ?? optionalInt(formData, "minTradingDaysForPayout"),
      minDailyProfitForPayout: optionalDecimal(formData, "minDailyProfitForPayout"),
      payoutRuleType: optionalRuleType(formData) ?? "NONE",
      traderSharePercent: optionalDecimal(formData, "traderSharePercent"),
      defaultPurchasePrice: optionalDecimal(formData, "defaultPurchasePrice"),
      activationPrice: optionalDecimal(formData, "activationPrice"),
      defaultActivationPrice: optionalDecimal(formData, "defaultActivationPrice") ?? optionalDecimal(formData, "activationPrice"),
      defaultResetPrice: optionalDecimal(formData, "defaultResetPrice"),
      promo: optionalText(formData, "promo"),
      promoNote: optionalText(formData, "promoNote") ?? optionalText(formData, "promo"),
      notes: optionalText(formData, "notes"),
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
      createdByUserId: true
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

  await prisma.propFirmRule.update({
    where: { id },
    data: {
      propFirmId: requiredText(formData, "propFirmId"),
      createdByUserId: isStandard ? null : rule.createdByUserId ?? currentUser.id,
      name: requiredText(formData, "name"),
      accountType: requiredText(formData, "accountType") as AccountType,
      accountSize: requiredDecimal(formData, "accountSize"),
      target: requiredDecimal(formData, "target"),
      maxDrawdown: requiredDecimal(formData, "maxDrawdown"),
      dailyDrawdown: optionalDecimal(formData, "dailyDrawdown"),
      buffer: optionalDecimal(formData, "buffer"),
      payoutBuffer: optionalDecimal(formData, "payoutBuffer"),
      consistencyPercent: optionalDecimal(formData, "consistencyPercent"),
      minTradingDays: optionalInt(formData, "minTradingDays"),
      minTradingDaysForPayout: optionalInt(formData, "minTradingDaysForPayout"),
      minPayoutTradingDays: optionalInt(formData, "minPayoutTradingDays") ?? optionalInt(formData, "minTradingDaysForPayout"),
      minDailyProfitForPayout: optionalDecimal(formData, "minDailyProfitForPayout"),
      payoutRuleType: optionalRuleType(formData) ?? "NONE",
      traderSharePercent: optionalDecimal(formData, "traderSharePercent"),
      defaultPurchasePrice: optionalDecimal(formData, "defaultPurchasePrice"),
      activationPrice: optionalDecimal(formData, "activationPrice"),
      defaultActivationPrice: optionalDecimal(formData, "defaultActivationPrice") ?? optionalDecimal(formData, "activationPrice"),
      defaultResetPrice: optionalDecimal(formData, "defaultResetPrice"),
      promo: optionalText(formData, "promo"),
      promoNote: optionalText(formData, "promoNote") ?? optionalText(formData, "promo"),
      notes: optionalText(formData, "notes"),
      isStandard,
      isActive: formData.get("isActive") === "on"
    }
  });

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

  await prisma.account.create({
    data: {
      userId: currentUser.id,
      propFirmId: requiredText(formData, "propFirmId"),
      propFirmRuleId: optionalText(formData, "propFirmRuleId"),
      parentAccountId: optionalText(formData, "parentAccountId"),
      accountType: requiredText(formData, "accountType") as AccountType,
      accountSize: requiredDecimal(formData, "accountSize"),
      name: requiredText(formData, "name"),
      accountNumber: optionalText(formData, "accountNumber"),
      platform: platform(formData),
      currency: currency(formData, "currency"),
      purchaseDate: optionalDate(formData, "purchaseDate"),
      purchasePrice: optionalDecimal(formData, "purchasePrice"),
      promoUsed: optionalText(formData, "promoUsed"),
      activationDate: optionalDate(formData, "activationDate"),
      status: (text(formData, "status") || "ACTIVE") as AccountStatus,
      notes: optionalText(formData, "notes")
    }
  });

  refresh();
}

export async function createTradingDay(formData: FormData) {
  const currentUser = await getCurrentUser();
  const accountId = requiredText(formData, "accountId");
  const tradeDate = requiredDate(formData, "tradeDate");
  const profitLoss = requiredDecimal(formData, "profitLoss");

  await assertOwnAccount(accountId, currentUser.id);

  await prisma.tradingDay.upsert({
    where: {
      accountId_tradeDate: {
        accountId,
        tradeDate
      }
    },
    update: {
      profitLoss,
      tradeCount: optionalInt(formData, "tradeCount"),
      notes: optionalText(formData, "notes")
    },
    create: {
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

export async function deleteAccount(formData: FormData) {
  const currentUser = await getCurrentUser();
  const accountId = requiredText(formData, "accountId");
  const confirmationName = requiredText(formData, "confirmationName");
  const account = await prisma.account.findFirst({
    where: { id: accountId, userId: currentUser.id },
    select: { id: true, name: true }
  });

  if (!account) {
    throw new Error("Compte introuvable pour cet utilisateur.");
  }

  if (confirmationName !== account.name) {
    throw new Error("Le nom retape ne correspond pas au compte.");
  }

  await prisma.account.delete({ where: { id: accountId } });
  refresh();
}

export async function validateEvaluation(formData: FormData) {
  const currentUser = await getCurrentUser();
  const accountId = requiredText(formData, "accountId");
  const account = await prisma.account.findFirst({
    where: { id: accountId, userId: currentUser.id, accountType: "EVALUATION" },
    include: { propFirmRule: true }
  });

  if (!account) {
    throw new Error("Evaluation introuvable pour cet utilisateur.");
  }

  const newAccountType = requiredText(formData, "accountType") as AccountType;
  if (newAccountType !== "FUNDED") {
    throw new Error("Le nouveau compte doit etre FUNDED.");
  }

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
        name: requiredText(formData, "name"),
        accountNumber: optionalText(formData, "accountNumber"),
        platform: account.platform,
        currency: account.currency,
        accountType: newAccountType,
        accountSize: account.accountSize,
        status: "ACTIVE",
        activationDate: optionalDate(formData, "activationDate"),
        notes: optionalText(formData, "notes")
      }
    })
  ]);

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
  await assertAdmin();
  const id = requiredText(formData, "id");

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
