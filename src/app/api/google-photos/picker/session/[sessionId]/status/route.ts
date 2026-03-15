import { NextResponse } from "next/server";

import { isAdminAuthenticatedRequest } from "@/lib/admin-auth";
import { getPickerSession } from "@/lib/google-photos-picker";

type Params = {
  params: Promise<{
    sessionId: string;
  }>;
};

export async function GET(request: Request, context: Params) {
  if (!isAdminAuthenticatedRequest(request)) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const { sessionId } = await context.params;
  try {
    const session = await getPickerSession(sessionId);
    return NextResponse.json({
      ok: true,
      session,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch Picker session status.";
    return NextResponse.json(
      { ok: false, error: message },
      { status: 400 },
    );
  }
}
