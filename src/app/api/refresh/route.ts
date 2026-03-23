import { NextResponse } from "next/server";

import { isAdminAuthenticatedRequest } from "@/lib/admin-auth";
import { refreshContent } from "@/lib/refresh";
import type { RefreshTrigger } from "@/lib/types";

// Minimum interval between manual refreshes (cron calls are exempt)
const MANUAL_REFRESH_COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes
let lastManualRefreshAt = 0;

function getTrigger(request: Request): RefreshTrigger {
  const value = new URL(request.url).searchParams.get("trigger");
  const allowed: RefreshTrigger[] = [
    "auto",
    "manual",
    "profile-save",
    "scheduler",
    "cron",
  ];
  if (value && allowed.includes(value as RefreshTrigger)) {
    return value as RefreshTrigger;
  }
  return "manual";
}

function hasValidCronSecret(request: Request): boolean {
  const secret = (process.env.CRON_SECRET ?? "").trim();
  if (!secret) return true;

  const header = request.headers.get("x-cron-secret") ?? "";
  const query = new URL(request.url).searchParams.get("secret") ?? "";
  return header === secret || query === secret;
}

function unauthorized() {
  return NextResponse.json(
    { ok: false, error: "Unauthorized" },
    { status: 401 },
  );
}

export async function POST(request: Request) {
  const trigger = getTrigger(request);
  const cronAuthorized = hasValidCronSecret(request);
  const adminAuthorized = isAdminAuthenticatedRequest(request);

  const shouldTreatAsCron =
    trigger === "cron" ||
    Boolean(request.headers.get("x-cron-secret")) ||
    Boolean(new URL(request.url).searchParams.get("secret"));

  if (shouldTreatAsCron) {
    if (!cronAuthorized) {
      return unauthorized();
    }
  } else if (!adminAuthorized) {
    return unauthorized();
  } else {
    const now = Date.now();
    const elapsed = now - lastManualRefreshAt;
    if (elapsed < MANUAL_REFRESH_COOLDOWN_MS) {
      const retryAfterSec = Math.ceil((MANUAL_REFRESH_COOLDOWN_MS - elapsed) / 1000);
      return NextResponse.json(
        { ok: false, error: "Too many requests", retryAfterSeconds: retryAfterSec },
        { status: 429, headers: { "Retry-After": String(retryAfterSec) } },
      );
    }
    lastManualRefreshAt = now;
  }

  const content = await refreshContent({
    force: true,
    trigger: shouldTreatAsCron ? "cron" : trigger,
  });

  return NextResponse.json({
    ok: true,
    updatedAt: content.updatedAt,
    counts: {
      articles: content.articles.length,
      videos: content.videos.length,
      photos: content.photos.length,
      projects: content.projects.length,
    },
  });
}
