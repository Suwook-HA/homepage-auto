import { mkdir, readFile, writeFile } from "node:fs/promises";

import { bundledDataPath, runtimeDataDir, runtimeDataPath } from "@/lib/data-paths";
import type { ContentData, ProfileData, RefreshLogData, RefreshLogItem } from "@/lib/types";

const profilePath = runtimeDataPath("profile.json");
const contentPath = runtimeDataPath("content.json");
const refreshLogPath = runtimeDataPath("refresh-log.json");
const MAX_ARTICLES = 8;
const MAX_VIDEOS = 8;

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

function clampContent(content: ContentData): ContentData {
  return {
    updatedAt: content.updatedAt ?? null,
    articles: Array.isArray(content.articles)
      ? content.articles.slice(0, MAX_ARTICLES)
      : [],
    videos: Array.isArray(content.videos)
      ? content.videos.slice(0, MAX_VIDEOS)
      : [],
    photos: Array.isArray(content.photos) ? content.photos : [],
    projects: Array.isArray(content.projects) ? content.projects : [],
  };
}

const defaultProfile: ProfileData = {
  name: "Ha Suwook",
  localName: "하수욱",
  headline: "Principal Researcher at ETRI",
  bio: "Research focus: AI data quality, trustworthy AI, and international standardization.",
  researchSummary:
    "Leads practical AI standardization and data quality initiatives across ISO/IEC and ITU-T tracks.",
  email: "sw.ha@etri.re.kr",
  location: "ETRI, Daejeon, Republic of Korea",
  website: "https://www.etri.re.kr",
  googleScholarUrl: "https://scholar.google.com/",
  githubUsername: "Suwook-HA",
  articleKeywords: [
    "IT standardization",
    "AI standardization",
    "ISO IEC AI standard",
    "ITU-T standardization",
  ],
  videoKeywords: [
    "artificial intelligence standardization",
    "ISO IEC AI standard",
    "ITU-T AI standardization",
    "trustworthy AI data quality",
  ],
  interests: [
    "AI Data Quality",
    "Trustworthy AI",
    "International Standardization",
    "Digital Transformation",
  ],
  relatedTechnologies: [
    "Generative AI",
    "AI Safety",
    "Data Governance",
    "Knowledge Graph",
    "MLOps",
    "Edge AI",
  ],
  standardizationActivities: [
    "ISO/IEC JTC 1/SC 42",
    "ITU-T FG-AI4H",
    "ETSI AI Standardization",
    "National AI Policy Alignment",
  ],
  researchMetrics: {
    citations: 420,
    hIndex: 13,
    i10Index: 18,
    publications: 34,
  },
  researchAreas: [
    { name: "AI Data Quality", score: 95 },
    { name: "Trustworthy AI", score: 91 },
    { name: "AI Standardization", score: 97 },
    { name: "Data Governance", score: 82 },
    { name: "Digital Policy", score: 76 },
  ],
  patentStats: {
    domestic: {
      applications: 28,
      registrations: 17,
    },
    international: {
      applications: 14,
      registrations: 8,
    },
    yearly: [
      { year: "2022", applications: 6, registrations: 3 },
      { year: "2023", applications: 9, registrations: 5 },
      { year: "2024", applications: 12, registrations: 7 },
      { year: "2025", applications: 15, registrations: 10 },
      { year: "2026", applications: 18, registrations: 12 },
    ],
  },
  patentRecords: [
    {
      title: "AI Data Quality Evaluation Method for Standardized Benchmarking",
      region: "KR",
      status: "Registered",
      patentNumber: "KR10-2025-0012345",
      filedAt: "2025-03-10",
    },
    {
      title: "Trustworthy AI Lifecycle Audit Framework",
      region: "US",
      status: "Filed",
      patentNumber: "US18/765,432",
      filedAt: "2025-09-18",
    },
    {
      title: "Cross-domain Metadata Harmonization for AI Governance",
      region: "PCT",
      status: "Published",
      patentNumber: "WO2026/145678",
      filedAt: "2026-01-22",
    },
  ],
  links: [
    {
      label: "GitHub",
      url: "https://github.com/Suwook-HA",
    },
    {
      label: "ETRI",
      url: "https://www.etri.re.kr",
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
    localName: profile.localName ?? defaultProfile.localName,
    researchSummary: profile.researchSummary ?? defaultProfile.researchSummary,
    googleScholarUrl: profile.googleScholarUrl ?? defaultProfile.googleScholarUrl,
    githubUsername: profile.githubUsername ?? defaultProfile.githubUsername,
    articleKeywords: profile.articleKeywords ?? defaultProfile.articleKeywords,
    videoKeywords: profile.videoKeywords ?? defaultProfile.videoKeywords,
    relatedTechnologies: profile.relatedTechnologies ?? defaultProfile.relatedTechnologies,
    standardizationActivities:
      profile.standardizationActivities ?? defaultProfile.standardizationActivities,
    researchMetrics: {
      citations: profile.researchMetrics?.citations ?? defaultProfile.researchMetrics.citations,
      hIndex: profile.researchMetrics?.hIndex ?? defaultProfile.researchMetrics.hIndex,
      i10Index: profile.researchMetrics?.i10Index ?? defaultProfile.researchMetrics.i10Index,
      publications:
        profile.researchMetrics?.publications ?? defaultProfile.researchMetrics.publications,
    },
    researchAreas:
      profile.researchAreas && profile.researchAreas.length > 0
        ? profile.researchAreas
        : defaultProfile.researchAreas,
    patentStats: {
      domestic: {
        applications:
          profile.patentStats?.domestic?.applications ??
          defaultProfile.patentStats.domestic.applications,
        registrations:
          profile.patentStats?.domestic?.registrations ??
          defaultProfile.patentStats.domestic.registrations,
      },
      international: {
        applications:
          profile.patentStats?.international?.applications ??
          defaultProfile.patentStats.international.applications,
        registrations:
          profile.patentStats?.international?.registrations ??
          defaultProfile.patentStats.international.registrations,
      },
      yearly:
        profile.patentStats?.yearly && profile.patentStats.yearly.length > 0
          ? profile.patentStats.yearly
          : defaultProfile.patentStats.yearly,
    },
    patentRecords:
      profile.patentRecords && profile.patentRecords.length > 0
        ? profile.patentRecords
        : defaultProfile.patentRecords,
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
  return clampContent({
    updatedAt: parsed.updatedAt ?? null,
    articles: Array.isArray(parsed.articles) ? parsed.articles : [],
    videos: Array.isArray(parsed.videos) ? parsed.videos : [],
    photos: Array.isArray(parsed.photos) ? parsed.photos : [],
    projects: Array.isArray(parsed.projects) ? parsed.projects : [],
  });
}

export async function writeContent(content: ContentData): Promise<void> {
  await ensureDataDir();
  await writeFile(contentPath, JSON.stringify(clampContent(content), null, 2), "utf8");
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
