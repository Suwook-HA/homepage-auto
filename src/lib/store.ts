import { mkdir, readFile, writeFile } from "node:fs/promises";

import { bundledDataPath, runtimeDataDir, runtimeDataPath } from "@/lib/data-paths";
import type { ContentData, ProfileData, RefreshLogData, RefreshLogItem } from "@/lib/types";

const profilePath = runtimeDataPath("profile.json");
const contentPath = runtimeDataPath("content.json");
const refreshLogPath = runtimeDataPath("refresh-log.json");

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

const defaultProfile: ProfileData = {
  name: "Ha Suwook",
  headline: "Senior Researcher at ETRI",
  bio: "IT standards and AI expert.",
  email: "suwook.ha@example.com",
  location: "Daejeon, South Korea",
  website: "https://github.com/Suwook-HA",
  githubUsername: "Suwook-HA",
  articleKeywords: [
    "IT standardization",
    "AI standardization",
    "ISO IEC AI",
    "ITU-T AI",
  ],
  videoKeywords: [
    "artificial intelligence",
    "AI standardization",
    "latest technology",
  ],
  interests: ["AI", "IT standardization", "emerging technology"],
  links: [
    {
      label: "GitHub",
      url: "https://github.com/Suwook-HA",
    },
  ],
  rssFeeds: [],
  youtubeChannels: [],
  staticPhotoUrls: [],
  googlePhotos: {
    enabled: true,
    albumId: "",
    filterKeyword: "하수욱",
  },
  autoInterestNews: {
    enabled: true,
    locale: "ko-KR",
    maxPerInterest: 3,
  },
  refreshIntervalMinutes: 180,
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
  await mkdir(runtimeDataDir, { recursive: true });
}

async function readJsonFromRuntimeOrBundled<T>(
  fileName: string,
  fallback: T,
): Promise<T> {
  const runtimePath = runtimeDataPath(fileName);
  try {
    const raw = await readFile(runtimePath, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    // Try bundled defaults in repository data directory.
  }

  try {
    const bundledPath = bundledDataPath(fileName);
    const raw = await readFile(bundledPath, "utf8");
    if (bundledPath !== runtimePath) {
      await writeFile(runtimePath, raw, "utf8");
    }
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function readProfile(): Promise<ProfileData> {
  await ensureDataDir();
  const parsed = await readJsonFromRuntimeOrBundled<ProfileData>(
    "profile.json",
    defaultProfile,
  );
  return normalizeProfile(parsed);
}

export async function writeProfile(profile: ProfileData): Promise<void> {
  await ensureDataDir();
  await writeFile(profilePath, JSON.stringify(normalizeProfile(profile), null, 2), "utf8");
}

export async function readContent(): Promise<ContentData> {
  await ensureDataDir();
  const parsed = await readJsonFromRuntimeOrBundled<ContentData>(
    "content.json",
    emptyContent,
  );
  return {
    updatedAt: parsed.updatedAt ?? null,
    articles: Array.isArray(parsed.articles) ? parsed.articles : [],
    videos: Array.isArray(parsed.videos) ? parsed.videos : [],
    photos: Array.isArray(parsed.photos) ? parsed.photos : [],
    projects: Array.isArray(parsed.projects) ? parsed.projects : [],
  };
}

export async function writeContent(content: ContentData): Promise<void> {
  await ensureDataDir();
  await writeFile(contentPath, JSON.stringify(content, null, 2), "utf8");
}

export async function readRefreshLog(): Promise<RefreshLogData> {
  await ensureDataDir();
  const parsed = await readJsonFromRuntimeOrBundled<RefreshLogData>(
    "refresh-log.json",
    emptyRefreshLog,
  );
  return {
    items: Array.isArray(parsed.items) ? parsed.items : [],
  };
}

export async function appendRefreshLog(item: RefreshLogItem): Promise<void> {
  const log = await readRefreshLog();
  const items = [item, ...log.items].slice(0, 100);
  await writeFile(refreshLogPath, JSON.stringify({ items }, null, 2), "utf8");
}
