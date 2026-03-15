import { NextResponse } from "next/server";

import { isAdminAuthenticatedRequest } from "@/lib/admin-auth";
import { buildOAuthAuthorizeUrl, createOAuthState } from "@/lib/google-photos-picker";

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
  if (!isAdminAuthenticatedRequest(request)) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  try {
    const state = createOAuthState();
    const baseUrl = getBaseUrl(request);
    const { url } = buildOAuthAuthorizeUrl(baseUrl, state);
    const response = NextResponse.redirect(url);
    response.cookies.set(OAUTH_STATE_COOKIE, state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 600,
    });
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "OAuth start failed.";
    return NextResponse.redirect(
      new URL(`/admin?gp_error=${encodeURIComponent(message)}`, request.url),
    );
  }
}
