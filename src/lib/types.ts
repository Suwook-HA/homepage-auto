export type LinkItem = {
  label: string;
  url: string;
};

export type RssFeed = {
  name: string;
  url: string;
};

export type YoutubeChannel = {
  name: string;
  channelId: string;
};

export type GooglePhotosConfig = {
  enabled: boolean;
  albumId: string;
  filterKeyword: string;
};

export type AutoInterestNewsConfig = {
  enabled: boolean;
  locale: string;
  maxPerInterest: number;
};

export type ResearchMetrics = {
  citations: number;
  hIndex: number;
  i10Index: number;
  publications: number;
};

export type ResearchArea = {
  name: string;
  score: number;
};

export type PatentRegionStat = {
  applications: number;
  registrations: number;
};

export type PatentYearlyStat = {
  year: string;
  applications: number;
  registrations: number;
};

export type PatentStats = {
  domestic: PatentRegionStat;
  international: PatentRegionStat;
  yearly: PatentYearlyStat[];
};

export type PatentRecord = {
  title: string;
  region: string;
  status: string;
  patentNumber: string;
  filedAt: string;
  sourceUrl?: string;
  sourceName?: string;
  inventors?: string;
  assignee?: string;
};

export type PatentSourceMeta = {
  provider: string;
  query: string;
  queryUrl: string;
};

export type PatentSearchData = {
  checkedAt: string;
  updatedAt: string;
  source: PatentSourceMeta;
  stats: PatentStats;
  records: PatentRecord[];
};

export type CareerItem = {
  year: string;
  title: string;
  org: string;
  type: "work" | "education" | "certification";
  description?: string;
};

export type SkillCategory = {
  name: string;
  skills: string[];
};

export type ContactMessage = {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  receivedAt: string;
  read: boolean;
};

export type ProfileData = {
  name: string;
  localName: string;
  headline: string;
  bio: string;
  introKo: string;
  introEn: string;
  researchSummary: string;
  email: string;
  location: string;
  website: string;
  googleScholarUrl: string;
  githubUsername: string;
  resumeUrl?: string;
  articleKeywords: string[];
  videoKeywords: string[];
  interests: string[];
  relatedTechnologies: string[];
  standardizationActivities: string[];
  researchMetrics: ResearchMetrics;
  researchAreas: ResearchArea[];
  patentStats: PatentStats;
  patentRecords: PatentRecord[];
  links: LinkItem[];
  rssFeeds: RssFeed[];
  youtubeChannels: YoutubeChannel[];
  staticPhotoUrls: string[];
  googlePhotos: GooglePhotosConfig;
  autoInterestNews: AutoInterestNewsConfig;
  refreshIntervalMinutes: number;
  career: CareerItem[];
  skillCategories: SkillCategory[];
};

export type ArticleItem = {
  id: string;
  title: string;
  url: string;
  source: string;
  summary: string;
  publishedAt: string;
  rank: number;
};

export type VideoItem = {
  id: string;
  title: string;
  url: string;
  channel: string;
  thumbnail: string;
  publishedAt: string;
  viewCount: number;
};

export type ProjectItem = {
  id: string;
  name: string;
  description: string;
  url: string;
  stars: number;
  forks: number;
  language: string;
  updatedAt: string;
};

export type PhotoItem = {
  id: string;
  url: string;
  description: string;
  takenAt: string;
};

export type ContentData = {
  updatedAt: string | null;
  projectsCheckedAt?: string | null;
  projectsUpdatedAt?: string | null;
  patents?: PatentSearchData | null;
  articles: ArticleItem[];
  videos: VideoItem[];
  photos: PhotoItem[];
  projects: ProjectItem[];
};

export type RefreshTrigger =
  | "auto"
  | "manual"
  | "profile-save"
  | "scheduler"
  | "cron";

export type RefreshLogItem = {
  id: string;
  trigger: RefreshTrigger;
  requestedAt: string;
  completedAt: string;
  durationMs: number;
  success: boolean;
  message: string;
  counts: {
    articles: number;
    videos: number;
    photos: number;
    projects: number;
    patents: number;
  };
};

export type RefreshLogData = {
  items: RefreshLogItem[];
};

export type PromotionHighlight = {
  id: string;
  title: string;
  summary: string;
  impact: string;
  sourceName: string;
  sourceUrl: string;
  date: string;
};

export type PromotionData = {
  updatedAt: string;
  highlights: PromotionHighlight[];
};
