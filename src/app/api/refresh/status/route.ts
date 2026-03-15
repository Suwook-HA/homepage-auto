import { NextResponse } from "next/server";

import { getRefreshStatus } from "@/lib/refresh";

export async function GET() {
  const status = await getRefreshStatus();
  return NextResponse.json(status);
}
