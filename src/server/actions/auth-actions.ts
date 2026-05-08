"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createSession, destroySession, getCurrentUser } from "@/server/auth/current-user";

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function normalizeLogin(value: string) {
  return value.trim().toLowerCase();
}

function userNameFromEmail(email: string) {
  return email.includes("@") ? email.split("@")[0] || email : email;
}

export async function registerUser(_: string | null, formData: FormData) {
  const email = normalizeLogin(text(formData, "email"));
  const password = text(formData, "password");

  if (!email || !password) {
    return "Email et mot de passe requis.";
  }

  if (password.length < 8) {
    return "Le mot de passe doit contenir au moins 8 caracteres.";
  }

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return "Un utilisateur existe deja avec cet email.";
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: {
      email,
      name: userNameFromEmail(email),
      passwordHash,
      role: "USER",
      lastLoginAt: new Date()
    }
  });

  await createSession(user.id);
  redirect("/");
}

export async function loginUser(_: string | null, formData: FormData) {
  const email = normalizeLogin(text(formData, "email"));
  const password = text(formData, "password");

  if (!email || !password) {
    return "Email et mot de passe requis.";
  }

  const user = await prisma.user.findFirst({
    where: { email, isActive: true }
  });

  if (!user?.passwordHash) {
    return "Identifiants invalides.";
  }

  const isValidPassword = await bcrypt.compare(password, user.passwordHash);
  if (!isValidPassword) {
    return "Identifiants invalides.";
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() }
  });
  await createSession(user.id);
  redirect("/");
}

export async function logoutUser() {
  await destroySession();
  redirect("/");
}

export async function updateUserAdminRole(formData: FormData) {
  const currentUser = await getCurrentUser();

  if (currentUser.role !== "ADMIN") {
    throw new Error("Action reservee aux administrateurs.");
  }

  const userId = text(formData, "userId");
  if (!userId) {
    throw new Error("Utilisateur introuvable.");
  }

  if (userId === currentUser.id) {
    throw new Error("Vous ne pouvez pas modifier votre propre role admin.");
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      role: formData.get("isAdmin") === "on" ? "ADMIN" : "USER"
    }
  });

  revalidatePath("/");
}

export async function deleteUser(formData: FormData) {
  const currentUser = await getCurrentUser();

  if (currentUser.role !== "ADMIN") {
    throw new Error("Action reservee aux administrateurs.");
  }

  const userId = text(formData, "userId");
  if (!userId) {
    throw new Error("Utilisateur introuvable.");
  }

  if (userId === currentUser.id) {
    throw new Error("Vous ne pouvez pas supprimer votre propre utilisateur.");
  }

  await prisma.user.update({
    where: { id: userId },
    data: { isActive: false }
  });

  revalidatePath("/");
}
