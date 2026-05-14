import https from "node:https";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/server/auth/current-user";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";
const STATE_COOKIE = "tradboard_google_oauth_state";

type GoogleTokenResponse = {
  access_token?: string;
  error?: string;
  error_description?: string;
};

type GoogleUserInfo = {
  sub?: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
};

async function requestJson<T>(
  url: string,
  options: {
    method?: "GET" | "POST";
    headers?: Record<string, string>;
    body?: string;
  } = {}
) {
  return new Promise<{ statusCode: number; data: T }>((resolve, reject) => {
    const request = https.request(
      url,
      {
        method: options.method ?? "GET",
        headers: options.headers,
        timeout: 15_000
      },
      (response) => {
        let raw = "";

        response.setEncoding("utf8");
        response.on("data", (chunk) => {
          raw += chunk;
        });
        response.on("end", () => {
          try {
            resolve({
              statusCode: response.statusCode ?? 0,
              data: raw ? (JSON.parse(raw) as T) : ({} as T)
            });
          } catch (error) {
            reject(error);
          }
        });
      }
    );

    request.on("timeout", () => {
      request.destroy(new Error(`Google OAuth request timed out: ${url}`));
    });
    request.on("error", reject);

    if (options.body) {
      request.write(options.body);
    }

    request.end();
  });
}

function appBaseUrl(request: NextRequest) {
  return process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? request.nextUrl.origin;
}

function homeRedirect(request: NextRequest, error?: string) {
  const url = new URL("/", appBaseUrl(request));
  if (error) {
    url.searchParams.set("authError", error);
  }
  const response = NextResponse.redirect(url);
  response.cookies.delete(STATE_COOKIE);
  return response;
}

async function exchangeCodeForToken(request: NextRequest, code: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Configuration Google OAuth incomplete.");
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    grant_type: "authorization_code",
    redirect_uri: `${appBaseUrl(request)}/api/auth/google/callback`
  });

  const { statusCode, data } = await requestJson<GoogleTokenResponse>(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Content-Length": Buffer.byteLength(body.toString()).toString()
    },
    body: body.toString()
  });

  if (statusCode < 200 || statusCode >= 300 || !data.access_token) {
    throw new Error(data.error_description ?? data.error ?? "Echange du code Google impossible.");
  }

  return data.access_token;
}

async function fetchGoogleUser(accessToken: string) {
  const { statusCode, data } = await requestJson<GoogleUserInfo>(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (statusCode < 200 || statusCode >= 300) {
    throw new Error("Profil Google inaccessible.");
  }

  return data;
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const expectedState = request.cookies.get(STATE_COOKIE)?.value;

  if (!code || !state || !expectedState || state !== expectedState) {
    return homeRedirect(request, "google_state");
  }

  try {
    const accessToken = await exchangeCodeForToken(request, code);
    const googleUser = await fetchGoogleUser(accessToken);
    const email = googleUser.email?.toLowerCase();

    if (!googleUser.sub || !email || googleUser.email_verified === false) {
      return homeRedirect(request, "google_email");
    }

    const existingByGoogleId = await prisma.user.findUnique({
      where: { googleId: googleUser.sub }
    });

    const existingByEmail = await prisma.user.findUnique({
      where: { email }
    });

    if (existingByGoogleId && existingByEmail && existingByGoogleId.id !== existingByEmail.id) {
      return homeRedirect(request, "google_account_conflict");
    }

    if (existingByEmail?.googleId && existingByEmail.googleId !== googleUser.sub) {
      return homeRedirect(request, "google_account_conflict");
    }

    const user = existingByGoogleId
      ? await prisma.user.update({
          where: { id: existingByGoogleId.id },
          data: {
            email,
            name: googleUser.name ?? existingByGoogleId.name,
            isActive: true,
            lastLoginAt: new Date()
          }
        })
      : existingByEmail
        ? await prisma.user.update({
            where: { id: existingByEmail.id },
            data: {
              googleId: googleUser.sub,
              name: googleUser.name ?? existingByEmail.name,
              isActive: true,
              lastLoginAt: new Date()
            }
          })
        : await prisma.user.create({
            data: {
              email,
              name: googleUser.name ?? email.split("@")[0] ?? email,
              googleId: googleUser.sub,
              role: "USER",
              lastLoginAt: new Date()
            }
          });

    await createSession(user.id);
    return homeRedirect(request);
  } catch (error) {
    console.error("[Google OAuth]", error);
    return homeRedirect(request, "google_login");
  }
}
