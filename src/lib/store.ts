import { mkdir, readFile, writeFile } from "node:fs/promises";

import { bundledDataPath, runtimeDataDir, runtimeDataPath } from "@/lib/data-paths";
import type {
  ContactMessage,
  ContentData,
  ProfileData,
  RefreshLogData,
  RefreshLogItem,
} from "@/lib/types";

const profilePath = runtimeDataPath("profile.json");
const contentPath = runtimeDataPath("content.json");
const refreshLogPath = runtimeDataPath("refresh-log.json");
const messagesPath = runtimeDataPath("messages.json");
const MAX_ARTICLES = 8;
const MAX_VIDEOS = 8;

const emptyContent: ContentData = {
  updatedAt: null,
  projectsCheckedAt: null,
  projectsUpdatedAt: null,
  patents: null,
  articles: [],
  videos: [],
  photos: [],
  projects: [],
};

const emptyRefreshLog: RefreshLogData = {
  items: [],
};

function clampContent(content: ContentData): ContentData {
  const patents =
    content.patents &&
    typeof content.patents === "object" &&
    content.patents.stats &&
    content.patents.source
      ? {
          checkedAt:
            typeof content.patents.checkedAt === "string"
              ? content.patents.checkedAt
              : new Date().toISOString(),
          updatedAt:
            typeof content.patents.updatedAt === "string"
              ? content.patents.updatedAt
              : new Date().toISOString(),
          source: {
            provider: String(content.patents.source.provider ?? "Google Patents"),
            query: String(content.patents.source.query ?? ""),
            queryUrl: String(content.patents.source.queryUrl ?? ""),
          },
          stats: {
            domestic: {
              applications: Number(content.patents.stats.domestic?.applications ?? 0),
              registrations: Number(content.patents.stats.domestic?.registrations ?? 0),
            },
            international: {
              applications: Number(content.patents.stats.international?.applications ?? 0),
              registrations: Number(content.patents.stats.international?.registrations ?? 0),
            },
            yearly: Array.isArray(content.patents.stats.yearly)
              ? content.patents.stats.yearly.slice(0, 16).map((item) => ({
                  year: String(item.year ?? ""),
                  applications: Number(item.applications ?? 0),
                  registrations: Number(item.registrations ?? 0),
                }))
              : [],
          },
          records: Array.isArray(content.patents.records)
            ? content.patents.records.slice(0, 24).map((item) => ({
                title: String(item.title ?? ""),
                region: String(item.region ?? ""),
                status: String(item.status ?? ""),
                patentNumber: String(item.patentNumber ?? ""),
                filedAt: String(item.filedAt ?? ""),
                sourceUrl:
                  typeof item.sourceUrl === "string" ? item.sourceUrl : undefined,
                sourceName:
                  typeof item.sourceName === "string" ? item.sourceName : undefined,
                inventors:
                  typeof item.inventors === "string" ? item.inventors : undefined,
                assignee: typeof item.assignee === "string" ? item.assignee : undefined,
              }))
            : [],
        }
      : null;

  return {
    updatedAt: content.updatedAt ?? null,
    projectsCheckedAt: content.projectsCheckedAt ?? null,
    projectsUpdatedAt: content.projectsUpdatedAt ?? null,
    patents,
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
  introKo:
    "하수욱은 ETRI에서 인공지능 데이터 품질, 신뢰가능 AI, 국제표준화를 연결해 연구 성과를 실제 산업과 글로벌 표준 프레임워크로 전환하는 연구자이다. ISO/IEC와 ITU-T 협력 트랙을 중심으로 AI 거버넌스, 데이터 품질, 표준 전략을 함께 이끌며 연구와 정책, 기술 구현을 연결하고 있다.",
  introEn:
    "Ha Suwook is a principal researcher at ETRI who translates work on AI data quality, trustworthy AI, and international standardization into deployable industry and global standards frameworks. His work bridges ISO/IEC and ITU-T collaboration tracks with practical governance, data quality, and technology strategy for real-world AI adoption.",
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
      applications: 0,
      registrations: 0,
    },
    international: {
      applications: 0,
      registrations: 0,
    },
    yearly: [],
  },
  patentRecords: [],
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
    resumeUrl: profile.resumeUrl ?? "",
    localName: profile.localName ?? defaultProfile.localName,
    introKo: profile.introKo ?? defaultProfile.introKo,
    introEn: profile.introEn ?? defaultProfile.introEn,
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
    return JSON.parse(raw.replace(/^\uFEFF/, "")) as T;
  } catch {
    // Try bundled defaults in repository data directory.
  }

  try {
    const bundledPath = bundledDataPath(fileName);
    const raw = await readFile(bundledPath, "utf8");
    if (bundledPath !== runtimePath) {
      await writeFile(runtimePath, raw, "utf8");
    }
    return JSON.parse(raw.replace(/^\uFEFF/, "")) as T;
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
    projectsCheckedAt: parsed.projectsCheckedAt ?? null,
    projectsUpdatedAt: parsed.projectsUpdatedAt ?? null,
    patents:
      parsed.patents && typeof parsed.patents === "object" ? parsed.patents : null,
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

export async function readMessages(): Promise<ContactMessage[]> {
  await ensureDataDir();
  try {
    const raw = await readFile(messagesPath, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as ContactMessage[]) : [];
  } catch {
    return [];
  }
}
