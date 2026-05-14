import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const STATE_COOKIE = "tradboard_google_oauth_state";

function appBaseUrl(request: NextRequest) {
  return process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? request.nextUrl.origin;
}

function secureCookie(request: NextRequest) {
  if (process.env.AUTH_COOKIE_SECURE !== undefined) {
    return process.env.AUTH_COOKIE_SECURE === "true";
  }

  return appBaseUrl(request).startsWith("https://");
}

function redirectHomeWithError(request: NextRequest, error: string) {
  const url = new URL("/", appBaseUrl(request));
  url.searchParams.set("authError", error);
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID;

  if (!clientId) {
    return redirectHomeWithError(request, "google_config");
  }

  const baseUrl = appBaseUrl(request);
  const state = randomBytes(32).toString("base64url");
  const authUrl = new URL(GOOGLE_AUTH_URL);
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", `${baseUrl}/api/auth/google/callback`);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "openid email profile");
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("prompt", "select_account");

  const response = NextResponse.redirect(authUrl);
  response.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: secureCookie(request),
    path: "/",
    maxAge: 60 * 10
  });

  return response;
}
