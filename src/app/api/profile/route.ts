import { NextResponse } from "next/server";

import { isAdminAuthenticatedRequest } from "@/lib/admin-auth";
import { profileSchema } from "@/lib/schema";
import { readProfile, writeProfile } from "@/lib/store";

async function commitProfileToGitHub(content: string): Promise<void> {
  const token = (process.env.GITHUB_TOKEN ?? "").trim();
  const repo = (process.env.GITHUB_REPO ?? "").trim();
  if (!token || !repo) return;

  const apiBase = `https://api.github.com/repos/${repo}/contents/data/profile.json`;
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "User-Agent": "homepage-auto",
  };

  const getRes = await fetch(apiBase, { headers });
  if (!getRes.ok) return;
  const fileData = (await getRes.json()) as { sha: string };

  await fetch(apiBase, {
    method: "PUT",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({
      message: "chore: update profile via admin",
      content: Buffer.from(content).toString("base64"),
      sha: fileData.sha,
    }),
  });
}

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

    // Best-effort: commit profile back to GitHub so data survives cold starts
    // (requires GITHUB_TOKEN + GITHUB_REPO env vars on Vercel)
    const serialized = JSON.stringify(profile, null, 2);
    commitProfileToGitHub(serialized).catch(() => {});

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
