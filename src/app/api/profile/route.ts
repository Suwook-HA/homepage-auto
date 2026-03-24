import { NextResponse } from "next/server";

import { isAdminAuthenticatedRequest } from "@/lib/admin-auth";
import { profileSchema } from "@/lib/schema";
import { readProfile, writeProfile } from "@/lib/store";

/** Returns true if committed, false if GitHub is not configured, throws on error. */
async function commitProfileToGitHub(content: string): Promise<boolean> {
  const token = (process.env.GITHUB_TOKEN ?? "").trim();
  const repo = (process.env.GITHUB_REPO ?? "").trim();
  if (!token || !repo) return false;

  const apiBase = `https://api.github.com/repos/${repo}/contents/data/profile.json`;
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "User-Agent": "homepage-auto",
  };

  const getRes = await fetch(apiBase, { headers });
  if (!getRes.ok) {
    const text = await getRes.text().catch(() => String(getRes.status));
    throw new Error(`GitHub GET failed: ${getRes.status} ${text}`);
  }
  const fileData = (await getRes.json()) as { sha: string };

  const putRes = await fetch(apiBase, {
    method: "PUT",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({
      message: "chore: update profile via admin",
      content: Buffer.from(content).toString("base64"),
      sha: fileData.sha,
    }),
  });
  if (!putRes.ok) {
    const text = await putRes.text().catch(() => String(putRes.status));
    throw new Error(`GitHub PUT failed: ${putRes.status} ${text}`);
  }
  return true;
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

  let profile;
  try {
    const payload = await request.json();
    profile = profileSchema.parse(payload);
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid profile payload" },
      { status: 400 },
    );
  }

  await writeProfile(profile);

  let githubSynced = false;
  try {
    const serialized = JSON.stringify(profile, null, 2);
    githubSynced = await commitProfileToGitHub(serialized);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { ok: false, error: `Profile saved locally but GitHub sync failed: ${msg}` },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, profile, githubSynced });
}
