import { NextResponse } from "next/server";

import { isAdminAuthenticatedRequest } from "@/lib/admin-auth";
import { getPickerAuthStatus } from "@/lib/google-photos-picker";

export async function GET(request: Request) {
  if (!isAdminAuthenticatedRequest(request)) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const status = await getPickerAuthStatus();
  return NextResponse.json({
    ok: true,
    status,
  });
}
