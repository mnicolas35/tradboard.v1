import "server-only";

import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

const SESSION_COOKIE = "tradboard_session";
const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 7;

function sessionSecret() {
  return process.env.AUTH_SECRET ?? process.env.DATABASE_URL ?? "tradboard-local-session-secret";
}

function shouldSecureSessionCookie() {
  if (process.env.AUTH_COOKIE_SECURE !== undefined) {
    return process.env.AUTH_COOKIE_SECURE === "true";
  }

  const appUrl = process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "";
  return appUrl.startsWith("https://");
}

function signSession(userId: string, expiresAt: number) {
  return createHmac("sha256", sessionSecret()).update(`${userId}.${expiresAt}`).digest("base64url");
}

function verifySignature(userId: string, expiresAt: string, signature: string) {
  const expected = signSession(userId, Number(expiresAt));
  const expectedBuffer = Buffer.from(expected);
  const signatureBuffer = Buffer.from(signature);

  return expectedBuffer.length === signatureBuffer.length && timingSafeEqual(expectedBuffer, signatureBuffer);
}

export async function createSession(userId: string) {
  const expiresAt = Date.now() + SESSION_DURATION_MS;
  const signature = signSession(userId, expiresAt);

  cookies().set(SESSION_COOKIE, `${userId}.${expiresAt}.${signature}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: shouldSecureSessionCookie(),
    path: "/",
    maxAge: Math.floor(SESSION_DURATION_MS / 1000),
    expires: new Date(expiresAt)
  });
}

export async function destroySession() {
  cookies().delete(SESSION_COOKIE);
}

export async function getOptionalCurrentUser() {
  const session = cookies().get(SESSION_COOKIE)?.value;

  if (!session) {
    return null;
  }

  const [userId, expiresAt, signature] = session.split(".");
  if (!userId || !expiresAt || !signature || Number(expiresAt) < Date.now()) {
    return null;
  }

  if (!verifySignature(userId, expiresAt, signature)) {
    return null;
  }

  const user = await prisma.user.findFirst({
    where: { id: userId, isActive: true }
  });

  return user;
}

export async function getCurrentUser() {
  const user = await getOptionalCurrentUser();

  if (!user) {
    throw new Error("Utilisateur non connecte.");
  }

  return user;
}
