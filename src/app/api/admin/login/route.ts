import { NextResponse } from "next/server";

import {
  createAdminSessionToken,
  getAdminSessionCookieName,
  getAdminSessionCookieOptions,
  isAdminAuthEnabled,
  isValidAdminPassword,
} from "@/lib/admin-auth";

type LoginPayload = {
  password?: string;
};

export async function POST(request: Request) {
  if (!isAdminAuthEnabled()) {
    return NextResponse.json({
      ok: true,
      authEnabled: false,
      message: "Admin auth is disabled.",
    });
  }

  let payload: LoginPayload = {};
  try {
    payload = (await request.json()) as LoginPayload;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid payload." },
      { status: 400 },
    );
  }

  const password = typeof payload.password === "string" ? payload.password : "";
  if (!isValidAdminPassword(password)) {
    return NextResponse.json(
      { ok: false, error: "Invalid credentials." },
      { status: 401 },
    );
  }

  const token = createAdminSessionToken();
  const response = NextResponse.json({
    ok: true,
    authEnabled: true,
  });

  response.cookies.set(
    getAdminSessionCookieName(),
    token,
    getAdminSessionCookieOptions(),
  );
  return response;
}
