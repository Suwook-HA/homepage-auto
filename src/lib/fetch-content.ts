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
  const deduped = dedupeByUrl(all);
  return deduped
    .sort((a, b) => b.rank - a.rank || b.publishedAt.localeCompare(a.publishedAt))
    .slice(0, 10)
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
  const strongIncludeTokens = [
    "ai",
    "artificial intelligence",
    "machine learning",
    "deep learning",
    "llm",
    "standard",
    "standardization",
    "iso",
    "iec",
    "itu",
    "sc42",
    "data quality",
    "trustworthy ai",
    "generative ai",
  ];
  const excludeTokens = [
    "trailer",
    "gameplay",
    "cinematic",
    "valorant",
    "fortnite",
    "rtx",
    "geforce",
    "walkthrough",
    "reaction",
  ];

  function relevanceScore(text: string): number {
    const hay = normalize(text);
    let score = 0;
    for (const token of includeKeywords) {
      if (hay.includes(token)) score += 4;
    }
    for (const token of strongIncludeTokens) {
      if (hay.includes(token)) score += 2;
    }
    for (const token of excludeTokens) {
      if (hay.includes(token)) score -= 6;
    }
    return score;
  }

  const searchJobs = queries.map(async (query) => {
    const url = new URL("https://www.googleapis.com/youtube/v3/search");
    url.searchParams.set("part", "snippet");
    url.searchParams.set("type", "video");
    url.searchParams.set("maxResults", "20");
    url.searchParams.set("order", "relevance");
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
        _searchText: searchText,
        _relevance: relevanceScore(searchText),
      };
    });
  });

  const collected = (await Promise.all(detailJobs)).flat();

  return dedupeByUrl(
    collected
      .filter((item) => item.url)
      .filter((item) => item._relevance >= 4)
      .map((item) => ({
        id: item.id,
        title: item.title,
        url: item.url,
        channel: item.channel,
        thumbnail: item.thumbnail,
        publishedAt: item.publishedAt,
        viewCount: item.viewCount,
      })) satisfies VideoItem[],
  )
    .sort((a, b) => b.viewCount - a.viewCount || b.publishedAt.localeCompare(a.publishedAt))
    .slice(0, 10);
}

async function fetchVideosByChannelFeeds(profile: ProfileData): Promise<VideoItem[]> {
  const jobs = profile.youtubeChannels.map(async (channel) => {
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

  const includeKeywords = toKeywordList(profile.videoKeywords);
  const strongIncludeTokens = ["ai", "machine learning", "standard", "iso", "iec", "itu"];
  const excludeTokens = ["trailer", "gameplay", "cinematic", "rtx", "geforce", "valorant"];

  function relevanceScore(text: string): number {
    const hay = normalize(text);
    let score = 0;
    for (const token of includeKeywords) {
      if (hay.includes(token)) score += 4;
    }
    for (const token of strongIncludeTokens) {
      if (hay.includes(token)) score += 2;
    }
    for (const token of excludeTokens) {
      if (hay.includes(token)) score -= 6;
    }
    return score;
  }

  return dedupeByUrl((await Promise.all(jobs)).flat().filter((item) => item.url))
    .map((item) => ({
      item,
      score: relevanceScore(`${item.title} ${item.channel}`),
    }))
    .filter((entry) => entry.score >= 4)
    .sort((a, b) => b.score - a.score || b.item.publishedAt.localeCompare(a.item.publishedAt))
    .slice(0, 10)
    .map((entry) => entry.item);
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
