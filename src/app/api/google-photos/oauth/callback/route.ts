import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { exchangeAuthCode } from "@/lib/google-photos-picker";

const OAUTH_STATE_COOKIE = "gp_oauth_state";

function getBaseUrl(request: Request): string {
  const url = new URL(request.url);
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = forwardedHost ?? request.headers.get("host") ?? url.host;
  const proto = forwardedProto ?? url.protocol.replace(":", "");
  return `${proto}://${host}`;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code") ?? "";
  const state = url.searchParams.get("state") ?? "";
  const error = url.searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      new URL(`/admin?gp_error=${encodeURIComponent(error)}`, request.url),
    );
  }

  const store = await cookies();
  const cookieState = store.get(OAUTH_STATE_COOKIE)?.value ?? "";

  if (!code || !state || !cookieState || state !== cookieState) {
    return NextResponse.redirect(
      new URL("/admin?gp_error=Invalid%20OAuth%20state", request.url),
    );
  }

  try {
    const redirectUri = `${getBaseUrl(request)}/api/google-photos/oauth/callback`;
    await exchangeAuthCode(code, redirectUri);
    const response = NextResponse.redirect(new URL("/admin?gp_connected=1", request.url));
    response.cookies.set(OAUTH_STATE_COOKIE, "", {
      path: "/",
      maxAge: 0,
    });
    return response;
  } catch (err) {
    const message = err instanceof Error ? err.message : "OAuth callback failed.";
    return NextResponse.redirect(
      new URL(`/admin?gp_error=${encodeURIComponent(message)}`, request.url),
    );
  }
}
