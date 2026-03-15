import { NextResponse } from "next/server";

import { isAdminAuthenticatedRequest } from "@/lib/admin-auth";
import { createPickerSession } from "@/lib/google-photos-picker";

type Payload = {
  maxItemCount?: number;
};

export async function POST(request: Request) {
  if (!isAdminAuthenticatedRequest(request)) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  let payload: Payload = {};
  try {
    payload = (await request.json()) as Payload;
  } catch {
    payload = {};
  }

  try {
    const max = Number(payload.maxItemCount ?? 200);
    const session = await createPickerSession(max);
    return NextResponse.json({
      ok: true,
      session,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create Picker session.";
    return NextResponse.json(
      { ok: false, error: message },
      { status: 400 },
    );
  }
}
