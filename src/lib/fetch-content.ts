import crypto from "node:crypto";

import Parser from "rss-parser";

import { readPickedMedia } from "@/lib/google-photos-picker";
import type {
  ArticleItem,
  PhotoItem,
  ProfileData,
  ProjectItem,
  VideoItem,
} from "@/lib/types";

const parser = new Parser();
const MAX_ARTICLES = 8;
const MAX_VIDEOS = 8;
const VIDEO_MIN_RELEVANCE_STRICT = 6;
const VIDEO_MIN_RELEVANCE_RELAXED = 2;

const CURATED_TECH_NEWS_CHANNELS = [
  { name: "Bloomberg Technology", channelId: "UCrM7B7SL_g1edFOnmj-SDKg" },
  { name: "TechCrunch", channelId: "UCCjyq_K1Xwfg8Lndy7lKMpA" },
  { name: "OpenAI", channelId: "UCXZCJLdBC09xxGZ6gcdrc6A" },
  { name: "Google Cloud Tech", channelId: "UCTMRxtyHoE3LPcrl-kT4AQQ" },
  { name: "DeepLearningAI", channelId: "UCcIXc5mJsHVYTZR1maL5l9w" },
  { name: "Two Minute Papers", channelId: "UCbfYPyITQ-7l4upoX8nvctg" },
  { name: "IBM Technology", channelId: "UC8cc4pVKVHG7A9fbNsRNrLQ" },
  { name: "Google for Developers", channelId: "UC_x5XG1OV2P6uZZ5FSM9Ttw" },
] as const;

const VIDEO_DOMAIN_TOKENS = [
  "ai",
  "artificial intelligence",
  "machine learning",
  "deep learning",
  "llm",
  "generative ai",
  "chatgpt",
  "openai",
  "technology",
  "tech",
  "it",
  "industry",
  "digital transformation",
  "cloud",
  "semiconductor",
  "gpu",
  "chip",
  "data",
  "analytics",
  "cybersecurity",
  "software",
  "developer",
  "android",
  "robotics",
  "automation",
  "startup",
  "microsoft",
  "google",
  "meta",
  "nvidia",
  "tesla",
  "standard",
  "standardization",
  "iso",
  "iec",
  "itu",
  "sc42",
];

const VIDEO_NEWS_TOKENS = [
  "news",
  "latest",
  "update",
  "trend",
  "brief",
  "report",
  "analysis",
  "insight",
  "conference",
  "summit",
  "announcement",
  "launch",
  "today",
  "weekly",
  "daily",
  "breakdown",
  "roundup",
  "highlights",
];

const VIDEO_EXCLUDE_TOKENS = [
  "trailer",
  "gameplay",
  "cinematic",
  "valorant",
  "fortnite",
  "rtx showcase",
  "walkthrough",
  "reaction",
  "music video",
  "mv",
  "esports",
  "movie",
  "drama",
  "anime",
  "tutorial",
  "course",
  "for beginners",
  "working at",
  "career",
  "hiring",
  "recruiting",
  "join us",
  "engineer like",
];

type VideoChannel = {
  name: string;
  channelId: string;
};

type GitHubRepo = {
  id: number;
  name: string;
  html_url: string;
  description: string | null;
  stargazers_count: number;
  forks_count: number;
  language: string | null;
  updated_at: string;
  archived: boolean;
  fork: boolean;
};

type YouTubeSearchResponse = {
  items?: Array<{
    id?: {
      videoId?: string;
    };
  }>;
};

type YouTubeVideoResponse = {
  items?: Array<{
    id?: string;
    snippet?: {
      title?: string;
      description?: string;
      channelTitle?: string;
      publishedAt?: string;
      thumbnails?: {
        high?: { url?: string };
        medium?: { url?: string };
      };
    };
    statistics?: {
      viewCount?: string;
    };
  }>;
};

function hashKey(value: string): string {
  return crypto.createHash("sha1").update(value).digest("hex").slice(0, 16);
}

function clip(text: string, max = 180): string {
  const compact = text.replace(/\s+/g, " ").trim();
  if (compact.length <= max) return compact;
  return `${compact.slice(0, max - 3)}...`;
}

function toText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function toIsoDate(input: string): string {
  const parsed = new Date(input);
  if (Number.isNaN(parsed.getTime())) {
    return new Date().toISOString();
  }
  return parsed.toISOString();
}

function dedupeByUrl<T extends { url: string }>(items: T[]): T[] {
  const map = new Map<string, T>();
  for (const item of items) {
    if (!map.has(item.url)) {
      map.set(item.url, item);
    }
  }
  return [...map.values()];
}

function parseLocale(locale: string): { lang: string; country: string } {
  const matched = locale.match(/^([a-z]{2})-([A-Z]{2})$/);
  if (!matched) {
    return { lang: "ko", country: "KR" };
  }
  return { lang: matched[1], country: matched[2] };
}

function normalize(text: string): string {
  return text.toLowerCase();
}

function cleanTextKey(text: string): string {
  return normalize(text)
    .replace(/\s*-\s*[^-]{1,80}$/, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function toTextTokens(text: string): string[] {
  const stopwords = new Set([
    "the",
    "and",
    "for",
    "with",
    "from",
    "news",
    "video",
    "update",
    "latest",
    "ai",
    "it",
  ]);
  return cleanTextKey(text)
    .split(" ")
    .map((token) => token.trim())
    .filter((token) => token.length >= 2 && !stopwords.has(token));
}

function overlapRatio(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const aSet = new Set(a);
  const bSet = new Set(b);
  let shared = 0;
  for (const token of aSet) {
    if (bSet.has(token)) shared += 1;
  }
  return shared / Math.min(aSet.size, bSet.size);
}

function isDuplicateArticle(a: ArticleItem, b: ArticleItem): boolean {
  if (a.url === b.url) return true;

  const aTitle = cleanTextKey(a.title);
  const bTitle = cleanTextKey(b.title);
  if (aTitle && bTitle) {
    if (aTitle === bTitle) return true;
    if (aTitle.includes(bTitle) || bTitle.includes(aTitle)) return true;
    if (overlapRatio(toTextTokens(aTitle), toTextTokens(bTitle)) >= 0.82) {
      return true;
    }
  }

  const aSummary = cleanTextKey(a.summary).slice(0, 180);
  const bSummary = cleanTextKey(b.summary).slice(0, 180);
  if (aSummary && bSummary && overlapRatio(toTextTokens(aSummary), toTextTokens(bSummary)) >= 0.88) {
    return true;
  }

  return false;
}

function dedupeArticlesByContent(items: ArticleItem[]): ArticleItem[] {
  const byUrl = dedupeByUrl(items);
  const ordered = [...byUrl].sort(
    (a, b) => b.rank - a.rank || b.publishedAt.localeCompare(a.publishedAt),
  );
  const selected: ArticleItem[] = [];

  for (const item of ordered) {
    const duplicateIndex = selected.findIndex((prev) => isDuplicateArticle(prev, item));
    if (duplicateIndex === -1) {
      selected.push(item);
      continue;
    }

    const prev = selected[duplicateIndex];
    const prevTime = new Date(prev.publishedAt).getTime() || 0;
    const nextTime = new Date(item.publishedAt).getTime() || 0;
    if (item.rank > prev.rank || nextTime > prevTime) {
      selected[duplicateIndex] = item;
    }
  }

  return selected;
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hasToken(hay: string, token: string): boolean {
  const trimmed = token.trim();
  if (!trimmed) return false;
  if (trimmed.length <= 2) {
    return new RegExp(`\\b${escapeRegExp(trimmed)}\\b`, "i").test(hay);
  }
  return hay.includes(trimmed);
}

function buildVideoChannels(profile: ProfileData): VideoChannel[] {
  const configured = profile.youtubeChannels
    .map((channel) => ({
      name: channel.name.trim(),
      channelId: channel.channelId.trim(),
    }))
    .filter((channel) => channel.name && channel.channelId);

  const merged = [...configured, ...CURATED_TECH_NEWS_CHANNELS];
  const seen = new Set<string>();
  const unique: VideoChannel[] = [];
  for (const channel of merged) {
    if (seen.has(channel.channelId)) continue;
    seen.add(channel.channelId);
    unique.push(channel);
  }

  return unique.slice(0, 12);
}

function scoreVideoRelevance(
  text: string,
  publishedAt: string,
  includeKeywords: string[],
): number {
  const hay = normalize(text);
  let score = 0;
  let hasDomain = false;
  let hasNews = false;

  for (const token of includeKeywords) {
    if (hasToken(hay, token)) {
      score += 4;
      hasDomain = true;
    }
  }
  for (const token of VIDEO_DOMAIN_TOKENS) {
    if (hasToken(hay, token)) {
      score += 3;
      hasDomain = true;
    }
  }
  for (const token of VIDEO_NEWS_TOKENS) {
    if (hasToken(hay, token)) {
      score += 2;
      hasNews = true;
    }
  }
  for (const token of VIDEO_EXCLUDE_TOKENS) {
    if (hasToken(hay, token)) {
      score -= 8;
    }
  }

  const publishedMs = new Date(publishedAt).getTime();
  if (!Number.isNaN(publishedMs)) {
    const ageDays = Math.max(0, (Date.now() - publishedMs) / 86_400_000);
    if (ageDays <= 14) score += 4;
    else if (ageDays <= 30) score += 2;
    else if (ageDays <= 60) score += 1;
  }

  if (!hasDomain) score -= 6;
  if (!hasNews) score -= 1;

  return score;
}

function rankVideoCandidates(
  candidates: Array<VideoItem & { _relevance: number }>,
): VideoItem[] {
  const sorted = [...candidates]
    .filter((item) => item.url)
    .filter((item) => !item.url.includes("/shorts/"))
    .sort((a, b) => b._relevance - a._relevance || b.publishedAt.localeCompare(a.publishedAt));

  const strict = sorted.filter((item) => item._relevance >= VIDEO_MIN_RELEVANCE_STRICT);
  const relaxed =
    strict.length >= MAX_VIDEOS
      ? strict
      : [
          ...strict,
          ...sorted
            .filter(
              (item) =>
                item._relevance >= VIDEO_MIN_RELEVANCE_RELAXED &&
                item._relevance < VIDEO_MIN_RELEVANCE_STRICT,
            )
            .slice(0, MAX_VIDEOS - strict.length),
        ];

  return dedupeByUrl(
    relaxed.map((item) => ({
      id: item.id,
      title: item.title,
      url: item.url,
      channel: item.channel,
      thumbnail: item.thumbnail,
      publishedAt: item.publishedAt,
      viewCount: item.viewCount,
    })),
  )
    .sort((a, b) => b.viewCount - a.viewCount || b.publishedAt.localeCompare(a.publishedAt))
    .slice(0, MAX_VIDEOS);
}

function toKeywordList(values: string[]): string[] {
  return values.map((item) => normalize(item.trim())).filter(Boolean);
}

function buildArticleQueries(profile: ProfileData): string[] {
  const base = profile.articleKeywords
    .map((item) => item.trim())
    .filter(Boolean);
  const fromInterests = profile.interests
    .map((item) => item.trim())
    .filter(Boolean);
  return [...new Set([...base, ...fromInterests])];
}

function articleScore(
  title: string,
  summary: string,
  publishedAt: string,
  keywordSet: string[],
): number {
  const hay = normalize(`${title} ${summary}`);
  let score = 0;

  for (const keyword of keywordSet) {
    if (hay.includes(normalize(keyword))) {
      score += 4;
    }
  }

  const standardTokens = ["standard", "standardization", "iso", "iec", "itu"];
  for (const token of standardTokens) {
    if (hay.includes(token)) {
      score += 2;
    }
  }

  const publishedMs = new Date(publishedAt).getTime();
  if (!Number.isNaN(publishedMs)) {
    const ageDays = Math.max(0, (Date.now() - publishedMs) / 86_400_000);
    score += Math.max(0, 10 - Math.floor(ageDays));
  }

  return score;
}

export async function fetchArticles(profile: ProfileData): Promise<ArticleItem[]> {
  const { lang, country } = parseLocale(profile.autoInterestNews.locale);
  const queries = buildArticleQueries(profile);
  const keywordSet = [...profile.articleKeywords, ...profile.interests];

  const feeds = queries.map((query) => {
    const encoded = encodeURIComponent(`${query} IT standardization OR AI standard`);
    return {
      source: `Google News: ${query}`,
      url: `https://news.google.com/rss/search?q=${encoded}&hl=${lang}-${country}&gl=${country}&ceid=${country}:${lang}`,
    };
  });

  const jobs = feeds.map(async (feed) => {
    try {
      const parsed = await parser.parseURL(feed.url);
      return parsed.items.slice(0, 8).map((item) => {
        const title = toText(item.title) || "Untitled";
        const url = toText(item.link);
        const summary = clip(
          toText(item.contentSnippet) || toText(item.content) || "No summary available.",
        );
        const publishedAt = toIsoDate(toText(item.isoDate) || toText(item.pubDate));
        const rank = articleScore(title, summary, publishedAt, keywordSet);
        return {
          id: hashKey(`${feed.source}:${title}:${publishedAt}:${url}`),
          title,
          url,
          source: feed.source,
          summary,
          publishedAt,
          rank,
        } satisfies ArticleItem;
      });
    } catch {
      return [];
    }
  });

  const all = (await Promise.all(jobs)).flat().filter((item) => item.url);
  const deduped = dedupeArticlesByContent(all);
  return deduped
    .sort((a, b) => b.rank - a.rank || b.publishedAt.localeCompare(a.publishedAt))
    .slice(0, MAX_ARTICLES)
    .map((item, index) => ({
      ...item,
      rank: index + 1,
    }));
}

async function fetchVideosByYouTubeApi(profile: ProfileData): Promise<VideoItem[]> {
  const apiKey = (process.env.YOUTUBE_API_KEY ?? "").trim();
  if (!apiKey) {
    return [];
  }

  const queries = profile.videoKeywords.map((item) => item.trim()).filter(Boolean);
  if (queries.length === 0) {
    return [];
  }

  const includeKeywords = toKeywordList(profile.videoKeywords);
  const querySet = [
    ...queries,
    "artificial intelligence latest technology news",
    "AI IT industry news",
    "machine learning technology update",
  ];
  const queryList = [...new Set(querySet)].slice(0, 8);

  const searchJobs = queryList.map(async (query) => {
    const url = new URL("https://www.googleapis.com/youtube/v3/search");
    url.searchParams.set("part", "snippet");
    url.searchParams.set("type", "video");
    url.searchParams.set("maxResults", "25");
    url.searchParams.set("order", "date");
    url.searchParams.set("q", query);
    url.searchParams.set("key", apiKey);

    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = (await res.json()) as YouTubeSearchResponse;
    return (data.items ?? [])
      .map((item) => item.id?.videoId ?? "")
      .filter(Boolean);
  });

  const ids = [...new Set((await Promise.all(searchJobs)).flat())];
  if (ids.length === 0) {
    return [];
  }

  const chunks: string[][] = [];
  for (let i = 0; i < ids.length; i += 50) {
    chunks.push(ids.slice(i, i + 50));
  }

  const detailJobs = chunks.map(async (chunk) => {
    const url = new URL("https://www.googleapis.com/youtube/v3/videos");
    url.searchParams.set("part", "snippet,statistics");
    url.searchParams.set("id", chunk.join(","));
    url.searchParams.set("key", apiKey);

    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    });
    if (!res.ok) return [];

    const data = (await res.json()) as YouTubeVideoResponse;
    return (data.items ?? []).map((item) => {
      const id = toText(item.id);
      const title = toText(item.snippet?.title) || "Untitled";
      const description = toText(item.snippet?.description);
      const channel = toText(item.snippet?.channelTitle) || "YouTube";
      const publishedAt = toIsoDate(toText(item.snippet?.publishedAt));
      const viewCount = Number(item.statistics?.viewCount ?? "0");
      const thumbnail =
        toText(item.snippet?.thumbnails?.high?.url) ||
        toText(item.snippet?.thumbnails?.medium?.url);
      const url = id ? `https://www.youtube.com/watch?v=${id}` : "";

      const searchText = normalize(`${title} ${description} ${channel}`);
      return {
        id: hashKey(`yt:${id}`),
        title,
        url,
        channel,
        thumbnail,
        publishedAt,
        viewCount: Number.isFinite(viewCount) ? viewCount : 0,
        _relevance: scoreVideoRelevance(searchText, publishedAt, includeKeywords),
      };
    });
  });

  const collected = (await Promise.all(detailJobs)).flat();
  return rankVideoCandidates(collected as Array<VideoItem & { _relevance: number }>);
}

async function fetchVideosByChannelFeeds(profile: ProfileData): Promise<VideoItem[]> {
  const includeKeywords = toKeywordList(profile.videoKeywords);
  const channels = buildVideoChannels(profile);
  const jobs = channels.map(async (channel) => {
    const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channel.channelId}`;
    try {
      const parsed = await parser.parseURL(feedUrl);
      return parsed.items.map((item) => {
        const title = toText(item.title) || "Untitled";
        const url = toText(item.link);
        const publishedAt = toIsoDate(toText(item.isoDate) || toText(item.pubDate));
        const videoId = (() => {
          try {
            const parsedUrl = new URL(url);
            return parsedUrl.searchParams.get("v") ?? "";
          } catch {
            return "";
          }
        })();
        const thumbnail = videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : "";

        return {
          id: hashKey(`${channel.name}:${title}:${publishedAt}:${url}`),
          title,
          url,
          channel: channel.name,
          thumbnail,
          publishedAt,
          viewCount: 0,
        } satisfies VideoItem;
      });
    } catch {
      return [];
    }
  });

  const candidates = dedupeByUrl((await Promise.all(jobs)).flat().filter((item) => item.url)).map(
    (item) => ({
      ...item,
      _relevance: scoreVideoRelevance(
        `${item.title} ${item.channel}`,
        item.publishedAt,
        includeKeywords,
      ),
    }),
  );

  return rankVideoCandidates(candidates as Array<VideoItem & { _relevance: number }>);
}

export async function fetchVideos(profile: ProfileData): Promise<VideoItem[]> {
  const fromApi = await fetchVideosByYouTubeApi(profile);
  if (fromApi.length > 0) {
    return fromApi;
  }
  return fetchVideosByChannelFeeds(profile);
}

export async function fetchPhotos(profile: ProfileData): Promise<PhotoItem[]> {
  if (!profile.googlePhotos.enabled) {
    return [];
  }

  const picked = await readPickedMedia();
  if (!picked || picked.items.length === 0) {
    return [];
  }

  const keyword = normalize(profile.googlePhotos.filterKeyword.trim());

  const candidates = picked.items
    .filter((item) => item.baseUrl && item.mimeType?.startsWith("image/"))
    .sort((a, b) => toIsoDate(b.createTime).localeCompare(toIsoDate(a.createTime)));

  const filtered =
    keyword.length > 0
      ? candidates.filter((item) => normalize(item.filename).includes(keyword))
      : candidates;

  const selected = filtered.length > 0 ? filtered : candidates;

  return selected.slice(0, 24).map((item) => ({
      id: hashKey(`gp-picked:${item.id}`),
      url: `${item.baseUrl}=w1200-h900`,
      description: item.filename,
      takenAt: toIsoDate(item.createTime),
    }));
}

function repoScore(repo: GitHubRepo): number {
  const updatedMs = new Date(repo.updated_at).getTime();
  const ageDays = Number.isNaN(updatedMs) ? 365 : (Date.now() - updatedMs) / 86_400_000;
  const recency = Math.max(0, 90 - ageDays);
  return repo.stargazers_count * 5 + repo.forks_count * 3 + recency;
}

export async function fetchProjects(profile: ProfileData): Promise<ProjectItem[]> {
  const username = profile.githubUsername.trim();
  if (!username) return [];

  const url = `https://api.github.com/users/${encodeURIComponent(username)}/repos?per_page=100&sort=updated`;
  const token = (process.env.GITHUB_TOKEN ?? "").trim();
  const headers: HeadersInit = {
    Accept: "application/vnd.github+json",
    "User-Agent": "homepage-auto",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    headers,
    cache: "no-store",
  });
  if (!res.ok) {
    return [];
  }

  const repos = (await res.json()) as GitHubRepo[];

  return repos
    .filter((repo) => !repo.archived)
    .filter((repo) => !repo.fork)
    .sort((a, b) => repoScore(b) - repoScore(a))
    .slice(0, 10)
    .map((repo) => ({
      id: hashKey(`gh:${repo.id}`),
      name: repo.name,
      description: repo.description ?? "No description",
      url: repo.html_url,
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      language: repo.language ?? "N/A",
      updatedAt: toIsoDate(repo.updated_at),
    }));
}
