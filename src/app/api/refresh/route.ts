import { NextResponse } from "next/server";

import { isAdminAuthenticatedRequest } from "@/lib/admin-auth";
import { refreshContent } from "@/lib/refresh";
import type { RefreshTrigger } from "@/lib/types";

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
