import crypto from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import Parser from "rss-parser";

const parser = new Parser();

const dataDir = path.join(process.cwd(), "data");
const profilePath = path.join(dataDir, "profile.json");
const contentPath = path.join(dataDir, "content.json");

function hashKey(value) {
  return crypto.createHash("sha1").update(value).digest("hex").slice(0, 16);
}

function normalize(text) {
  return String(text ?? "").toLowerCase();
}

function clip(text, max = 180) {
  const compact = String(text ?? "").replace(/\s+/g, " ").trim();
  if (compact.length <= max) return compact;
  return `${compact.slice(0, max - 3)}...`;
}

function toText(value) {
  return typeof value === "string" ? value : "";
}

function toIsoDate(input) {
  const parsed = new Date(input);
  if (Number.isNaN(parsed.getTime())) {
    return new Date().toISOString();
  }
  return parsed.toISOString();
}

function dedupeByUrl(items) {
  const map = new Map();
  for (const item of items) {
    const url = toText(item?.url);
    if (!url) continue;
    if (!map.has(url)) {
      map.set(url, item);
    }
  }
  return [...map.values()];
}

function parseLocale(locale) {
  const matched = String(locale ?? "").match(/^([a-z]{2})-([A-Z]{2})$/);
  if (!matched) {
    return { lang: "ko", country: "KR" };
  }
  return { lang: matched[1], country: matched[2] };
}

async function readJson(filePath, fallback) {
  try {
    const raw = await readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function toKeywordList(values) {
  return (Array.isArray(values) ? values : [])
    .map((item) => normalize(String(item).trim()))
    .filter(Boolean);
}

function buildArticleQueries(profile) {
  const base = (Array.isArray(profile.articleKeywords) ? profile.articleKeywords : [])
    .map((item) => String(item).trim())
    .filter(Boolean);
  const fromInterests = (Array.isArray(profile.interests) ? profile.interests : [])
    .map((item) => String(item).trim())
    .filter(Boolean);
  return [...new Set([...base, ...fromInterests])].slice(0, 10);
}

function articleScore(title, summary, publishedAt, keywordSet) {
  const hay = normalize(`${title} ${summary}`);
  let score = 0;

  for (const keyword of keywordSet) {
    if (hay.includes(normalize(keyword))) {
      score += 4;
    }
  }

  const standardTokens = ["standard", "standardization", "iso", "iec", "itu", "sc42"];
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

async function fetchArticles(profile) {
  const locale = profile?.autoInterestNews?.locale ?? "ko-KR";
  const { lang, country } = parseLocale(locale);
  const queries = buildArticleQueries(profile);
  const keywordSet = [
    ...(Array.isArray(profile.articleKeywords) ? profile.articleKeywords : []),
    ...(Array.isArray(profile.interests) ? profile.interests : []),
  ];

  if (queries.length === 0) {
    return [];
  }

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
      return (parsed.items ?? []).slice(0, 8).map((item) => {
        const title = toText(item?.title) || "Untitled";
        const url = toText(item?.link);
        const summary = clip(
          toText(item?.contentSnippet) || toText(item?.content) || "No summary available.",
        );
        const publishedAt = toIsoDate(toText(item?.isoDate) || toText(item?.pubDate));
        const rank = articleScore(title, summary, publishedAt, keywordSet);
        return {
          id: hashKey(`${feed.source}:${title}:${publishedAt}:${url}`),
          title,
          url,
          source: feed.source,
          summary,
          publishedAt,
          rank,
        };
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

function getVideoRelevance(profile) {
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
    "trustworthy ai",
    "generative ai",
    "data quality",
  ];
  const excludeTokens = [
    "trailer",
    "gameplay",
    "cinematic",
    "valorant",
    "fortnite",
    "geforce",
    "rtx",
    "walkthrough",
    "reaction",
    "music video",
  ];

  return (text) => {
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
  };
}

async function fetchVideosByYouTubeApi(profile) {
  const apiKey = (process.env.YOUTUBE_API_KEY ?? "").trim();
  if (!apiKey) return [];

  const queries = (Array.isArray(profile.videoKeywords) ? profile.videoKeywords : [])
    .map((item) => String(item).trim())
    .filter(Boolean);
  if (queries.length === 0) return [];

  const relevanceScore = getVideoRelevance(profile);

  const searchJobs = queries.map(async (query) => {
    const url = new URL("https://www.googleapis.com/youtube/v3/search");
    url.searchParams.set("part", "snippet");
    url.searchParams.set("type", "video");
    url.searchParams.set("maxResults", "20");
    url.searchParams.set("order", "relevance");
    url.searchParams.set("q", query);
    url.searchParams.set("key", apiKey);

    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.items ?? [])
      .map((item) => item?.id?.videoId ?? "")
      .filter(Boolean);
  });

  const ids = [...new Set((await Promise.all(searchJobs)).flat())];
  if (ids.length === 0) return [];

  const chunks = [];
  for (let i = 0; i < ids.length; i += 50) {
    chunks.push(ids.slice(i, i + 50));
  }

  const detailJobs = chunks.map(async (chunk) => {
    const url = new URL("https://www.googleapis.com/youtube/v3/videos");
    url.searchParams.set("part", "snippet,statistics");
    url.searchParams.set("id", chunk.join(","));
    url.searchParams.set("key", apiKey);

    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.items ?? []).map((item) => {
      const id = toText(item?.id);
      const title = toText(item?.snippet?.title) || "Untitled";
      const description = toText(item?.snippet?.description);
      const channel = toText(item?.snippet?.channelTitle) || "YouTube";
      const publishedAt = toIsoDate(toText(item?.snippet?.publishedAt));
      const viewCount = Number(item?.statistics?.viewCount ?? "0");
      const thumbnail =
        toText(item?.snippet?.thumbnails?.high?.url) ||
        toText(item?.snippet?.thumbnails?.medium?.url);
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
      })),
  )
    .sort((a, b) => b.viewCount - a.viewCount || b.publishedAt.localeCompare(a.publishedAt))
    .slice(0, 10);
}

async function fetchVideosByChannelFeeds(profile) {
  const channels = Array.isArray(profile.youtubeChannels) ? profile.youtubeChannels : [];
  const relevanceScore = getVideoRelevance(profile);

  const jobs = channels.map(async (channel) => {
    const channelId = toText(channel?.channelId);
    if (!channelId) return [];
    const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
    try {
      const parsed = await parser.parseURL(feedUrl);
      return (parsed.items ?? []).map((item) => {
        const title = toText(item?.title) || "Untitled";
        const url = toText(item?.link);
        const publishedAt = toIsoDate(toText(item?.isoDate) || toText(item?.pubDate));
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
          channel: toText(channel?.name) || "YouTube",
          thumbnail,
          publishedAt,
          viewCount: 0,
          _relevance: relevanceScore(`${title} ${toText(channel?.name)}`),
        };
      });
    } catch {
      return [];
    }
  });

  return dedupeByUrl((await Promise.all(jobs)).flat().filter((item) => item.url))
    .filter((item) => item._relevance >= 4)
    .sort((a, b) => b._relevance - a._relevance || b.publishedAt.localeCompare(a.publishedAt))
    .slice(0, 10)
    .map((item) => ({
      id: item.id,
      title: item.title,
      url: item.url,
      channel: item.channel,
      thumbnail: item.thumbnail,
      publishedAt: item.publishedAt,
      viewCount: item.viewCount,
    }));
}

async function fetchVideos(profile) {
  const fromApi = await fetchVideosByYouTubeApi(profile);
  if (fromApi.length > 0) return fromApi;
  return fetchVideosByChannelFeeds(profile);
}

function repoScore(repo) {
  const updatedMs = new Date(repo.updated_at).getTime();
  const ageDays = Number.isNaN(updatedMs) ? 365 : (Date.now() - updatedMs) / 86_400_000;
  const recency = Math.max(0, 90 - ageDays);
  return repo.stargazers_count * 5 + repo.forks_count * 3 + recency;
}

async function fetchProjects(profile) {
  const username = String(profile.githubUsername ?? "").trim();
  if (!username) return [];

  const url = `https://api.github.com/users/${encodeURIComponent(username)}/repos?per_page=100&sort=updated`;
  const token = (process.env.GITHUB_TOKEN ?? "").trim();
  const headers = {
    Accept: "application/vnd.github+json",
    "User-Agent": "homepage-auto-static-refresh",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(url, { headers, cache: "no-store" });
  if (!res.ok) return [];
  const repos = await res.json();

  return (Array.isArray(repos) ? repos : [])
    .filter((repo) => !repo.archived && !repo.fork)
    .sort((a, b) => repoScore(b) - repoScore(a))
    .slice(0, 10)
    .map((repo) => ({
      id: hashKey(`gh:${repo.id}`),
      name: toText(repo.name),
      description: toText(repo.description) || "No description",
      url: toText(repo.html_url),
      stars: Number(repo.stargazers_count ?? 0),
      forks: Number(repo.forks_count ?? 0),
      language: toText(repo.language) || "N/A",
      updatedAt: toIsoDate(toText(repo.updated_at)),
    }));
}

async function safeFetch(label, fetcher, fallback) {
  try {
    const result = await fetcher();
    if (!Array.isArray(result)) return fallback;
    if (result.length === 0 && Array.isArray(fallback) && fallback.length > 0) {
      console.log(`${label}: fetched 0 items, keep existing ${fallback.length} items`);
      return fallback;
    }
    console.log(`${label}: fetched ${result.length} items`);
    return result;
  } catch (error) {
    console.log(`${label}: failed, keep existing items`);
    if (error instanceof Error) {
      console.log(`${label}: ${error.message}`);
    }
    return fallback;
  }
}

async function main() {
  const profile = await readJson(profilePath, {});
  const existing = await readJson(contentPath, {
    updatedAt: null,
    articles: [],
    videos: [],
    photos: [],
    projects: [],
  });

  const [articles, videos, projects] = await Promise.all([
    safeFetch("articles", () => fetchArticles(profile), existing.articles ?? []),
    safeFetch("videos", () => fetchVideos(profile), existing.videos ?? []),
    safeFetch("projects", () => fetchProjects(profile), existing.projects ?? []),
  ]);

  const next = {
    updatedAt: new Date().toISOString(),
    articles,
    videos,
    photos: Array.isArray(existing.photos) ? existing.photos : [],
    projects,
  };

  await writeFile(contentPath, `${JSON.stringify(next, null, 2)}\n`, "utf8");

  console.log(
    `done: articles=${next.articles.length}, videos=${next.videos.length}, photos=${next.photos.length}, projects=${next.projects.length}`,
  );
}

await main();
