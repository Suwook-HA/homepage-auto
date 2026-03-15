import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { ContentData, ProfileData, RefreshLogData, RefreshLogItem } from "@/lib/types";

const dataDir = path.join(process.cwd(), "data");
const profilePath = path.join(dataDir, "profile.json");
const contentPath = path.join(dataDir, "content.json");
const refreshLogPath = path.join(dataDir, "refresh-log.json");

const emptyContent: ContentData = {
  updatedAt: null,
  articles: [],
  videos: [],
  photos: [],
  projects: [],
};

const emptyRefreshLog: RefreshLogData = {
  items: [],
};

function normalizeProfile(profile: ProfileData): ProfileData {
  return {
    ...profile,
    githubUsername: profile.githubUsername ?? "Suwook-HA",
    articleKeywords: profile.articleKeywords ?? [
      "IT standardization",
      "AI standardization",
      "ISO IEC AI",
      "ITU-T AI",
    ],
    videoKeywords: profile.videoKeywords ?? [
      "artificial intelligence",
      "AI standardization",
      "latest technology",
    ],
    autoInterestNews: profile.autoInterestNews ?? {
      enabled: true,
      locale: "ko-KR",
      maxPerInterest: 3,
    },
    googlePhotos: {
      ...profile.googlePhotos,
      filterKeyword: profile.googlePhotos?.filterKeyword ?? "하수욱",
    },
  };
}

async function ensureDataDir() {
  await mkdir(dataDir, { recursive: true });
}

export async function readProfile(): Promise<ProfileData> {
  await ensureDataDir();
  const raw = await readFile(profilePath, "utf8");
  return normalizeProfile(JSON.parse(raw) as ProfileData);
}

export async function writeProfile(profile: ProfileData): Promise<void> {
  await ensureDataDir();
  await writeFile(profilePath, JSON.stringify(normalizeProfile(profile), null, 2), "utf8");
}

export async function readContent(): Promise<ContentData> {
  await ensureDataDir();
  try {
    const raw = await readFile(contentPath, "utf8");
    const parsed = JSON.parse(raw) as ContentData;
    return {
      updatedAt: parsed.updatedAt ?? null,
      articles: Array.isArray(parsed.articles) ? parsed.articles : [],
      videos: Array.isArray(parsed.videos) ? parsed.videos : [],
      photos: Array.isArray(parsed.photos) ? parsed.photos : [],
      projects: Array.isArray(parsed.projects) ? parsed.projects : [],
    };
  } catch {
    return emptyContent;
  }
}

export async function writeContent(content: ContentData): Promise<void> {
  await ensureDataDir();
  await writeFile(contentPath, JSON.stringify(content, null, 2), "utf8");
}

export async function readRefreshLog(): Promise<RefreshLogData> {
  await ensureDataDir();
  try {
    const raw = await readFile(refreshLogPath, "utf8");
    const parsed = JSON.parse(raw) as RefreshLogData;
    return {
      items: Array.isArray(parsed.items) ? parsed.items : [],
    };
  } catch {
    return emptyRefreshLog;
  }
}

export async function appendRefreshLog(item: RefreshLogItem): Promise<void> {
  const log = await readRefreshLog();
  const items = [item, ...log.items].slice(0, 100);
  await writeFile(refreshLogPath, JSON.stringify({ items }, null, 2), "utf8");
}
