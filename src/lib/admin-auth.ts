import crypto from "node:crypto";

import { cookies } from "next/headers";

const SESSION_COOKIE_NAME = "admin_session";

function getAdminPassword(): string {
  return (process.env.ADMIN_PASSWORD ?? "").trim();
}

function getSessionSecret(): string {
  const explicit = (process.env.ADMIN_SESSION_SECRET ?? "").trim();
  if (explicit) return explicit;
  return getAdminPassword();
}

function getSessionMaxAgeSeconds(): number {
  const hours = Number(process.env.ADMIN_SESSION_HOURS ?? "24");
  const safeHours = Number.isFinite(hours) ? Math.min(Math.max(hours, 1), 24 * 30) : 24;
  return Math.floor(safeHours * 3600);
}

function signPayload(payload: string): string {
  return crypto.createHmac("sha256", getSessionSecret()).update(payload).digest("hex");
}

function safeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  const aa = Buffer.from(a, "hex");
  const bb = Buffer.from(b, "hex");
  if (aa.length !== bb.length || aa.length === 0) return false;
  return crypto.timingSafeEqual(aa, bb);
}

function readCookieValueFromHeader(cookieHeader: string, name: string): string | null {
  const pairs = cookieHeader.split(";").map((part) => part.trim());
  const target = `${name}=`;
  for (const pair of pairs) {
    if (pair.startsWith(target)) {
      try {
        return decodeURIComponent(pair.slice(target.length));
      } catch {
        return null;
      }
    }
  }
  return null;
}

function verifyToken(token: string | null): boolean {
  if (!isAdminAuthEnabled()) return true;
  if (!token) return false;

  const [expiresAtText, signature] = token.split(".");
  if (!expiresAtText || !signature) return false;

  const expiresAt = Number(expiresAtText);
  if (!Number.isFinite(expiresAt)) return false;
  if (Date.now() >= expiresAt) return false;

  const expected = signPayload(expiresAtText);
  return safeEqualHex(signature, expected);
}

export function isAdminAuthEnabled(): boolean {
  return Boolean(getAdminPassword());
}

export function isValidAdminPassword(password: string): boolean {
  if (!isAdminAuthEnabled()) return true;
  return password === getAdminPassword();
}

export function createAdminSessionToken(): string {
  const expiresAt = Date.now() + getSessionMaxAgeSeconds() * 1000;
  const payload = String(expiresAt);
  const signature = signPayload(payload);
  return `${payload}.${signature}`;
}

export function getAdminSessionCookieName(): string {
  return SESSION_COOKIE_NAME;
}

export function getAdminSessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: getSessionMaxAgeSeconds(),
  };
}

export async function isAdminAuthenticated(): Promise<boolean> {
  if (!isAdminAuthEnabled()) return true;
  const store = await cookies();
  const token = store.get(SESSION_COOKIE_NAME)?.value ?? null;
  return verifyToken(token);
}

export function isAdminAuthenticatedRequest(request: Request): boolean {
  if (!isAdminAuthEnabled()) return true;
  const cookieHeader = request.headers.get("cookie") ?? "";
  const token = readCookieValueFromHeader(cookieHeader, SESSION_COOKIE_NAME);
  return verifyToken(token);
}
