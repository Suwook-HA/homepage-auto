import crypto from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import Parser from "rss-parser";

const parser = new Parser();
const MAX_ARTICLES = 8;
const MIN_ARTICLES = 6;
const ARTICLE_WINDOW_DAYS = 4;
const ARTICLE_BACKFILL_WINDOWS = [7, 14, 30];
const ARTICLE_FETCH_WINDOW_DAYS = ARTICLE_BACKFILL_WINDOWS[ARTICLE_BACKFILL_WINDOWS.length - 1];
const ARTICLE_ITEMS_PER_FEED = 20;
const ARTICLE_FEED_LIMIT = 12;
const ARTICLE_DEFAULT_QUERIES = [
  "AI standardization",
  "IT standardization",
  "ISO IEC AI",
  "trustworthy AI governance",
  "AI data quality",
];
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
];

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

function articleWindowStartMs(windowDays, nowMs = Date.now()) {
  return nowMs - windowDays * 86_400_000;
}

function isWithinArticleWindow(publishedAt, windowDays = ARTICLE_WINDOW_DAYS, nowMs = Date.now()) {
  const publishedMs = new Date(publishedAt).getTime();
  if (Number.isNaN(publishedMs)) return false;
  return publishedMs >= articleWindowStartMs(windowDays, nowMs) && publishedMs <= nowMs;
}

function parseLocale(locale) {
  const matched = String(locale ?? "").match(/^([a-z]{2})-([A-Z]{2})$/);
  if (!matched) {
    return { lang: "ko", country: "KR" };
  }
  return { lang: matched[1], country: matched[2] };
}

function cleanTextKey(text) {
  return normalize(text)
    .replace(/\s*-\s*[^-]{1,80}$/, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function toTextTokens(text) {
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

function overlapRatio(a, b) {
  if (a.length === 0 || b.length === 0) return 0;
  const aSet = new Set(a);
  const bSet = new Set(b);
  let shared = 0;
  for (const token of aSet) {
    if (bSet.has(token)) shared += 1;
  }
  return shared / Math.min(aSet.size, bSet.size);
}

function isDuplicateArticle(a, b) {
  if (a.url === b.url) return true;

  const aTitle = cleanTextKey(a.title);
  const bTitle = cleanTextKey(b.title);
  if (aTitle && bTitle) {
    if (aTitle === bTitle) return true;
    if (aTitle.includes(bTitle) || bTitle.includes(aTitle)) return true;
    if (overlapRatio(toTextTokens(aTitle), toTextTokens(bTitle)) >= 0.74) return true;
  }

  const aSummary = cleanTextKey(a.summary).slice(0, 180);
  const bSummary = cleanTextKey(b.summary).slice(0, 180);
  if (aSummary && bSummary && overlapRatio(toTextTokens(aSummary), toTextTokens(bSummary)) >= 0.8) {
    return true;
  }

  return false;
}

function dedupeArticlesByContent(items) {
  const byUrl = dedupeByUrl(items);
  const ordered = [...byUrl].sort(
    (a, b) => b.rank - a.rank || b.publishedAt.localeCompare(a.publishedAt),
  );
  const selected = [];

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

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hasToken(hay, token) {
  const trimmed = String(token ?? "").trim();
  if (!trimmed) return false;
  if (trimmed.length <= 2) {
    return new RegExp(`\\b${escapeRegExp(trimmed)}\\b`, "i").test(hay);
  }
  return hay.includes(trimmed);
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
  return [...new Set([...base, ...fromInterests, ...ARTICLE_DEFAULT_QUERIES])].slice(
    0,
    ARTICLE_FEED_LIMIT,
  );
}

function articleScore(title, summary, publishedAt, keywordSet) {
  const hay = normalize(`${title} ${summary}`);
  let score = 0;

  for (const keyword of keywordSet) {
    if (hay.includes(normalize(keyword))) {
      score += 4;
    }
  }

  const standardTokens = [
    "standard",
    "standardization",
    "iso",
    "iec",
    "itu",
    "sc42",
    "governance",
    "policy",
    "quality",
    "safety",
  ];
  for (const token of standardTokens) {
    if (hay.includes(token)) {
      score += 2;
    }
  }

  const publishedMs = new Date(publishedAt).getTime();
  if (!Number.isNaN(publishedMs)) {
    const ageDays = Math.max(0, (Date.now() - publishedMs) / 86_400_000);
    score += Math.max(0, 56 - Math.floor(ageDays * 4));
    if (ageDays <= 2) score += 8;
    if (ageDays > 14) score -= Math.floor((ageDays - 14) * 2);
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
    const encoded = encodeURIComponent(`${query} when:${ARTICLE_FETCH_WINDOW_DAYS}d`);
    return {
      source: `Google News: ${query}`,
      url: `https://news.google.com/rss/search?q=${encoded}&hl=${lang}-${country}&gl=${country}&ceid=${country}:${lang}`,
    };
  });

  const jobs = feeds.map(async (feed) => {
    try {
      const parsed = await parser.parseURL(feed.url);
      return (parsed.items ?? []).slice(0, ARTICLE_ITEMS_PER_FEED).map((item) => {
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

  const allCandidates = (await Promise.all(jobs))
    .flat()
    .filter((item) => item.url);

  function rankArticles(items, limit = MAX_ARTICLES) {
    return dedupeArticlesByContent(items)
      .sort((a, b) => b.rank - a.rank || b.publishedAt.localeCompare(a.publishedAt))
      .slice(0, limit)
      .map((item, index) => ({
        ...item,
        rank: index + 1,
      }));
  }

  const primary = rankArticles(
    allCandidates.filter((item) => isWithinArticleWindow(item.publishedAt, ARTICLE_WINDOW_DAYS)),
  );
  if (primary.length >= MIN_ARTICLES) {
    return primary;
  }

  const merged = [...primary];
  for (const windowDays of ARTICLE_BACKFILL_WINDOWS) {
    const widenedPool = rankArticles(
      allCandidates.filter((item) => isWithinArticleWindow(item.publishedAt, windowDays)),
      MAX_ARTICLES * 3,
    );
    for (const item of widenedPool) {
      if (merged.length >= MAX_ARTICLES) break;
      if (merged.some((prev) => prev.url === item.url || isDuplicateArticle(prev, item))) continue;
      merged.push(item);
    }
    if (merged.length >= MIN_ARTICLES) {
      break;
    }
  }

  return merged.slice(0, MAX_ARTICLES).map((item, index) => ({
    ...item,
    rank: index + 1,
  }));
}

function buildVideoChannels(profile) {
  const configured = (Array.isArray(profile.youtubeChannels) ? profile.youtubeChannels : [])
    .map((channel) => ({
      name: toText(channel?.name).trim(),
      channelId: toText(channel?.channelId).trim(),
    }))
    .filter((channel) => channel.name && channel.channelId);

  const merged = [...configured, ...CURATED_TECH_NEWS_CHANNELS];
  const seen = new Set();
  const unique = [];
  for (const channel of merged) {
    if (seen.has(channel.channelId)) continue;
    seen.add(channel.channelId);
    unique.push(channel);
  }

  return unique.slice(0, 12);
}

function getVideoRelevance(profile) {
  const includeKeywords = toKeywordList(profile.videoKeywords);
  return (text, publishedAt) => {
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
      if (hasToken(hay, token)) score -= 8;
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
  };
}

function rankVideoCandidates(candidates) {
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

async function fetchVideosByYouTubeApi(profile) {
  const apiKey = (process.env.YOUTUBE_API_KEY ?? "").trim();
  if (!apiKey) return [];

  const queries = (Array.isArray(profile.videoKeywords) ? profile.videoKeywords : [])
    .map((item) => String(item).trim())
    .filter(Boolean);
  if (queries.length === 0) return [];

  const relevanceScore = getVideoRelevance(profile);
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
        _relevance: relevanceScore(searchText, publishedAt),
      };
    });
  });

  const collected = (await Promise.all(detailJobs)).flat();
  return rankVideoCandidates(collected);
}

async function fetchVideosByChannelFeeds(profile) {
  const channels = buildVideoChannels(profile);
  const relevanceScore = getVideoRelevance(profile);

  const jobs = channels.map(async (channel) => {
    const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channel.channelId}`;
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
          channel: channel.name,
          thumbnail,
          publishedAt,
          viewCount: 0,
          _relevance: relevanceScore(`${title} ${channel.name}`, publishedAt),
        };
      });
    } catch {
      return [];
    }
  });

  const collected = dedupeByUrl((await Promise.all(jobs)).flat().filter((item) => item.url));
  return rankVideoCandidates(collected);
}

async function fetchVideos(profile) {
  const fromApi = await fetchVideosByYouTubeApi(profile);
  if (fromApi.length > 0) return fromApi;
  return fetchVideosByChannelFeeds(profile);
}

function normalizeArticleItems(items) {
  const normalized = (Array.isArray(items) ? items : [])
    .map((item) => ({
      id: toText(item?.id) || hashKey(`article-fallback:${toText(item?.url)}:${toText(item?.title)}`),
      title: toText(item?.title) || "Untitled",
      url: toText(item?.url),
      source: toText(item?.source) || "Unknown",
      summary: clip(toText(item?.summary) || "No summary available."),
      publishedAt: toIsoDate(toText(item?.publishedAt)),
      rank: Number(item?.rank ?? 0),
    }))
    .filter((item) => item.url)
    .filter((item) => isWithinArticleWindow(item.publishedAt, ARTICLE_FETCH_WINDOW_DAYS));

  function rankArticles(list) {
    return dedupeArticlesByContent(list)
      .sort((a, b) => b.rank - a.rank || b.publishedAt.localeCompare(a.publishedAt))
      .slice(0, MAX_ARTICLES)
      .map((item, index) => ({
        ...item,
        rank: index + 1,
      }));
  }

  const primary = rankArticles(
    normalized.filter((item) => isWithinArticleWindow(item.publishedAt, ARTICLE_WINDOW_DAYS)),
  );
  if (primary.length >= MIN_ARTICLES) {
    return primary;
  }

  for (const windowDays of ARTICLE_BACKFILL_WINDOWS) {
    const widened = rankArticles(
      normalized.filter((item) => isWithinArticleWindow(item.publishedAt, windowDays)),
    );
    if (widened.length >= MIN_ARTICLES) {
      return widened;
    }
  }

  return primary;
}

function normalizeVideoItems(items, profile) {
  const relevanceScore = getVideoRelevance(profile);
  const normalized = dedupeByUrl((Array.isArray(items) ? items : [])
    .map((item) => {
      const title = toText(item?.title) || "Untitled";
      const channel = toText(item?.channel) || "YouTube";
      const publishedAt = toIsoDate(toText(item?.publishedAt));
      return {
        id:
          toText(item?.id) ||
          hashKey(`video-fallback:${toText(item?.url)}:${title}:${publishedAt}`),
        title,
        url: toText(item?.url),
        channel,
        thumbnail: toText(item?.thumbnail),
        publishedAt,
        viewCount: Number(item?.viewCount ?? 0),
        _relevance: relevanceScore(`${title} ${channel}`, publishedAt),
      };
    })
    .filter((item) => item.url));

  return rankVideoCandidates(normalized);
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

async function safeFetch(label, fetcher, fallback, minCount = 1) {
  try {
    const result = await fetcher();
    if (!Array.isArray(result)) return fallback;
    if (result.length === 0 && Array.isArray(fallback) && fallback.length > 0) {
      console.log(`${label}: fetched 0 items, keep existing ${fallback.length} items`);
      return fallback;
    }
    if (
      result.length < minCount &&
      Array.isArray(fallback) &&
      fallback.length >= minCount
    ) {
      console.log(
        `${label}: fetched ${result.length} items (<${minCount}), keep existing ${fallback.length} items`,
      );
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
  const fallbackArticles = normalizeArticleItems(existing.articles);
  const fallbackVideos = normalizeVideoItems(existing.videos, profile);
  const fallbackProjects = Array.isArray(existing.projects) ? existing.projects : [];

  const [articles, videos, projects] = await Promise.all([
    safeFetch("articles", () => fetchArticles(profile), fallbackArticles, MIN_ARTICLES),
    safeFetch("videos", () => fetchVideos(profile), fallbackVideos),
    safeFetch("projects", () => fetchProjects(profile), fallbackProjects),
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
