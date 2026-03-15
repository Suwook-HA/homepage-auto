import { NextResponse } from "next/server";

import { getHomepageData } from "@/lib/refresh";

export async function GET() {
  const [profile, content] = await getHomepageData();
  return NextResponse.json({
    profile,
    content,
  });
}
