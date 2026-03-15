import { NextResponse } from "next/server";

import { isAdminAuthenticatedRequest } from "@/lib/admin-auth";
import { profileSchema } from "@/lib/schema";
import { readProfile, writeProfile } from "@/lib/store";

function unauthorized() {
  return NextResponse.json(
    {
      ok: false,
      error: "Unauthorized",
    },
    { status: 401 },
  );
}

export async function GET(request: Request) {
  if (!isAdminAuthenticatedRequest(request)) {
    return unauthorized();
  }

  const profile = await readProfile();
  return NextResponse.json(profile);
}

export async function POST(request: Request) {
  if (!isAdminAuthenticatedRequest(request)) {
    return unauthorized();
  }

  try {
    const payload = await request.json();
    const profile = profileSchema.parse(payload);
    await writeProfile(profile);

    return NextResponse.json({
      ok: true,
      profile,
    });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "Invalid profile payload",
      },
      { status: 400 },
    );
  }
}
