import { NextResponse } from "next/server";

import { isAdminAuthenticatedRequest } from "@/lib/admin-auth";
import { disconnectGooglePhotos } from "@/lib/google-photos-picker";

export async function POST(request: Request) {
  if (!isAdminAuthenticatedRequest(request)) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  await disconnectGooglePhotos();
  return NextResponse.json({ ok: true });
}
