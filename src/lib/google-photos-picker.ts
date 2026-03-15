import crypto from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

type OAuthTokenResponse = {
  access_token?: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
};

type StoredOAuth = {
  accessToken: string;
  refreshToken: string;
  expiryDate: number;
  scope: string;
  tokenType: string;
  updatedAt: string;
};

type PickerSessionResponse = {
  id: string;
  pickerUri: string;
  pollingConfig?: {
    pollInterval?: string;
    timeoutIn?: string;
  };
  expireTime?: string;
  mediaItemsSet?: boolean;
};

type PickerMediaFile = {
  baseUrl: string;
  mimeType: string;
  filename: string;
};

type PickerMediaItem = {
  id: string;
  createTime?: string;
  type?: string;
  mediaFile?: PickerMediaFile;
};

type ListMediaItemsResponse = {
  mediaItems?: PickerMediaItem[];
  nextPageToken?: string;
};

export type StoredPickedMediaItem = {
  id: string;
  sessionId: string;
  createTime: string;
  baseUrl: string;
  mimeType: string;
  filename: string;
  pickedAt: string;
};

type PickedMediaStore = {
  updatedAt: string;
  sessionId: string;
  items: StoredPickedMediaItem[];
};

const dataDir = path.join(process.cwd(), "data");
const oauthPath = path.join(dataDir, "google-photos-oauth.json");
const pickedPath = path.join(dataDir, "google-photos-picked.json");

async function ensureDataDir() {
  await mkdir(dataDir, { recursive: true });
}

function getOAuthConfig() {
  return {
    clientId: (process.env.GOOGLE_CLIENT_ID ?? "").trim(),
    clientSecret: (process.env.GOOGLE_CLIENT_SECRET ?? "").trim(),
  };
}

function ensureOAuthConfig() {
  const { clientId, clientSecret } = getOAuthConfig();
  if (!clientId || !clientSecret) {
    throw new Error("Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET.");
  }
  return { clientId, clientSecret };
}

function tokenStillValid(expiryDate: number): boolean {
  return Date.now() + 60_000 < expiryDate;
}

async function readOAuthInternal(): Promise<StoredOAuth | null> {
  await ensureDataDir();
  try {
    const raw = await readFile(oauthPath, "utf8");
    const parsed = JSON.parse(raw) as StoredOAuth;
    if (!parsed.accessToken) return null;
    return parsed;
  } catch {
    return null;
  }
}

async function writeOAuthInternal(data: StoredOAuth): Promise<void> {
  await ensureDataDir();
  await writeFile(oauthPath, JSON.stringify(data, null, 2), "utf8");
}

export async function getPickerAuthStatus() {
  const { clientId, clientSecret } = getOAuthConfig();
  const oauth = await readOAuthInternal();
  const picked = await readPickedMedia();

  return {
    configured: Boolean(clientId && clientSecret),
    connected: Boolean(oauth?.accessToken),
    hasRefreshToken: Boolean(oauth?.refreshToken),
    oauthUpdatedAt: oauth?.updatedAt ?? null,
    pickedUpdatedAt: picked?.updatedAt ?? null,
    pickedCount: picked?.items.length ?? 0,
  };
}

export function createOAuthState(): string {
  return crypto.randomBytes(24).toString("hex");
}

export function buildOAuthAuthorizeUrl(
  baseUrl: string,
  state: string,
): { url: string; redirectUri: string } {
  const { clientId } = ensureOAuthConfig();
  const redirectUri = `${baseUrl}/api/google-photos/oauth/callback`;
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "https://www.googleapis.com/auth/photospicker.mediaitems.readonly",
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  });
  return {
    url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
    redirectUri,
  };
}

export async function exchangeAuthCode(
  code: string,
  redirectUri: string,
): Promise<void> {
  const { clientId, clientSecret } = ensureOAuthConfig();
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
  });

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("Failed to exchange OAuth code.");
  }

  const token = (await res.json()) as OAuthTokenResponse;
  if (!token.access_token) {
    throw new Error("OAuth token response has no access_token.");
  }

  const prev = await readOAuthInternal();
  const refreshToken = token.refresh_token ?? prev?.refreshToken ?? "";
  if (!refreshToken) {
    throw new Error("No refresh token available.");
  }

  const next: StoredOAuth = {
    accessToken: token.access_token,
    refreshToken,
    expiryDate: Date.now() + Math.max(300, token.expires_in ?? 3600) * 1000,
    scope: token.scope ?? prev?.scope ?? "",
    tokenType: token.token_type ?? "Bearer",
    updatedAt: new Date().toISOString(),
  };

  await writeOAuthInternal(next);
}

async function refreshAccessToken(refreshToken: string): Promise<StoredOAuth> {
  const { clientId, clientSecret } = ensureOAuthConfig();
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("Failed to refresh Google OAuth token.");
  }

  const token = (await res.json()) as OAuthTokenResponse;
  if (!token.access_token) {
    throw new Error("Refresh response has no access_token.");
  }

  const next: StoredOAuth = {
    accessToken: token.access_token,
    refreshToken,
    expiryDate: Date.now() + Math.max(300, token.expires_in ?? 3600) * 1000,
    scope: token.scope ?? "",
    tokenType: token.token_type ?? "Bearer",
    updatedAt: new Date().toISOString(),
  };
  await writeOAuthInternal(next);
  return next;
}

export async function getValidAccessToken(): Promise<string> {
  const oauth = await readOAuthInternal();
  if (!oauth) {
    throw new Error("Google Photos is not connected.");
  }
  if (tokenStillValid(oauth.expiryDate)) {
    return oauth.accessToken;
  }
  if (!oauth.refreshToken) {
    throw new Error("Google OAuth refresh token is missing.");
  }
  const refreshed = await refreshAccessToken(oauth.refreshToken);
  return refreshed.accessToken;
}

function pickerHeaders(accessToken: string): HeadersInit {
  return {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };
}

export async function createPickerSession(
  maxItemCount = 200,
): Promise<PickerSessionResponse> {
  const accessToken = await getValidAccessToken();
  const count = Math.min(2000, Math.max(1, Math.floor(maxItemCount)));
  const res = await fetch("https://photospicker.googleapis.com/v1/sessions", {
    method: "POST",
    headers: pickerHeaders(accessToken),
    body: JSON.stringify({
      pickingConfig: {
        maxItemCount: String(count),
      },
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Picker session creation failed: ${res.status}`);
  }

  return (await res.json()) as PickerSessionResponse;
}

export async function getPickerSession(
  sessionId: string,
): Promise<PickerSessionResponse> {
  const accessToken = await getValidAccessToken();
  const url = `https://photospicker.googleapis.com/v1/sessions/${encodeURIComponent(sessionId)}`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Picker session fetch failed: ${res.status}`);
  }

  return (await res.json()) as PickerSessionResponse;
}

async function listPickerMediaItems(sessionId: string): Promise<PickerMediaItem[]> {
  const accessToken = await getValidAccessToken();
  const out: PickerMediaItem[] = [];
  let pageToken = "";

  for (let i = 0; i < 30; i += 1) {
    const url = new URL("https://photospicker.googleapis.com/v1/mediaItems");
    url.searchParams.set("sessionId", sessionId);
    url.searchParams.set("pageSize", "100");
    if (pageToken) {
      url.searchParams.set("pageToken", pageToken);
    }

    const res = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error(`Picker mediaItems.list failed: ${res.status}`);
    }

    const json = (await res.json()) as ListMediaItemsResponse;
    out.push(...(json.mediaItems ?? []));
    pageToken = json.nextPageToken ?? "";
    if (!pageToken) break;
  }

  return out;
}

export async function deletePickerSession(sessionId: string): Promise<void> {
  const accessToken = await getValidAccessToken();
  const url = `https://photospicker.googleapis.com/v1/sessions/${encodeURIComponent(sessionId)}`;
  await fetch(url, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });
}

export async function readPickedMedia(): Promise<PickedMediaStore | null> {
  await ensureDataDir();
  try {
    const raw = await readFile(pickedPath, "utf8");
    const parsed = JSON.parse(raw) as PickedMediaStore;
    return {
      updatedAt: parsed.updatedAt,
      sessionId: parsed.sessionId,
      items: Array.isArray(parsed.items) ? parsed.items : [],
    };
  } catch {
    return null;
  }
}

export async function importPickerSessionMedia(sessionId: string): Promise<{
  imported: number;
  session: PickerSessionResponse;
}> {
  const session = await getPickerSession(sessionId);
  if (!session.mediaItemsSet) {
    return {
      imported: 0,
      session,
    };
  }

  const mediaItems = await listPickerMediaItems(sessionId);
  const now = new Date().toISOString();
  const stored: StoredPickedMediaItem[] = mediaItems
    .filter((item) => item.mediaFile?.baseUrl && item.mediaFile?.filename)
    .map((item) => ({
      id: item.id,
      sessionId,
      createTime: item.createTime ?? now,
      baseUrl: item.mediaFile?.baseUrl ?? "",
      mimeType: item.mediaFile?.mimeType ?? "",
      filename: item.mediaFile?.filename ?? "",
      pickedAt: now,
    }));

  await ensureDataDir();
  await writeFile(
    pickedPath,
    JSON.stringify(
      {
        updatedAt: now,
        sessionId,
        items: stored,
      },
      null,
      2,
    ),
    "utf8",
  );

  return {
    imported: stored.length,
    session,
  };
}

export async function disconnectGooglePhotos(): Promise<void> {
  try {
    await unlink(oauthPath);
  } catch {
    // ignore
  }
}
