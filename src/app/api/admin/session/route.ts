import { NextResponse } from "next/server";

import { isAdminAuthEnabled, isAdminAuthenticatedRequest } from "@/lib/admin-auth";

export async function GET(request: Request) {
  const authEnabled = isAdminAuthEnabled();
  const authenticated = isAdminAuthenticatedRequest(request);
  return NextResponse.json({
    authEnabled,
    authenticated,
  });
}
