import cfg from "./content-config.json";

export const MAX_ARTICLES = cfg.maxArticles;
export const MIN_ARTICLES = cfg.minArticles;
export const ARTICLE_WINDOW_DAYS = cfg.articleWindowDays;
export const ARTICLE_BACKFILL_WINDOWS = cfg.articleBackfillWindows as [number, ...number[]];
export const ARTICLE_FETCH_WINDOW_DAYS =
  ARTICLE_BACKFILL_WINDOWS[ARTICLE_BACKFILL_WINDOWS.length - 1];
export const ARTICLE_ITEMS_PER_FEED = cfg.articleItemsPerFeed;
export const ARTICLE_FEED_LIMIT = cfg.articleFeedLimit;
export const ARTICLE_DEFAULT_QUERIES = cfg.articleDefaultQueries as string[];

export const MAX_VIDEOS = cfg.maxVideos;
export const VIDEO_MIN_RELEVANCE_STRICT = cfg.videoMinRelevanceStrict;
export const VIDEO_MIN_RELEVANCE_RELAXED = cfg.videoMinRelevanceRelaxed;

export const MAX_PATENT_RECORDS = cfg.maxPatentRecords;
export const PATENT_YEAR_BUCKETS = cfg.patentYearBuckets;

export type VideoChannel = { name: string; channelId: string };
export const CURATED_TECH_NEWS_CHANNELS =
  cfg.curatedTechNewsChannels as VideoChannel[];

export const VIDEO_DOMAIN_TOKENS = cfg.videoDomainTokens as string[];
export const VIDEO_NEWS_TOKENS = cfg.videoNewsTokens as string[];
export const VIDEO_EXCLUDE_TOKENS = cfg.videoExcludeTokens as string[];
