import { NextResponse } from "next/server";

import { isAdminAuthenticatedRequest } from "@/lib/admin-auth";
import {
  deletePickerSession,
  importPickerSessionMedia,
} from "@/lib/google-photos-picker";
import { refreshContent } from "@/lib/refresh";

type Params = {
  params: Promise<{
    sessionId: string;
  }>;
};

export async function POST(request: Request, context: Params) {
  if (!isAdminAuthenticatedRequest(request)) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const { sessionId } = await context.params;
  try {
    const result = await importPickerSessionMedia(sessionId);

    if (result.session.mediaItemsSet) {
      await deletePickerSession(sessionId);
      await refreshContent({ force: true, trigger: "manual" });
    }

    return NextResponse.json({
      ok: true,
      mediaItemsSet: Boolean(result.session.mediaItemsSet),
      imported: result.imported,
      pollingConfig: result.session.pollingConfig ?? null,
      session: result.session,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to import Picker media.";
    return NextResponse.json(
      { ok: false, error: message },
      { status: 400 },
    );
  }
}
