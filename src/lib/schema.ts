import { z } from "zod";

export const linkItemSchema = z.object({
  label: z.string().min(1),
  url: z.url(),
});

export const rssFeedSchema = z.object({
  name: z.string().min(1),
  url: z.url(),
});

export const youtubeChannelSchema = z.object({
  name: z.string().min(1),
  channelId: z.string().min(5),
});

export const autoInterestNewsSchema = z.object({
  enabled: z.boolean(),
  locale: z
    .string()
    .regex(/^[a-z]{2}-[A-Z]{2}$/, "locale must be like ko-KR or en-US"),
  maxPerInterest: z.number().int().min(1).max(10),
});

const optionalUrlSchema = z.union([z.url(), z.literal("")]);

export const researchMetricsSchema = z.object({
  citations: z.number().int().min(0),
  hIndex: z.number().int().min(0),
  i10Index: z.number().int().min(0),
  publications: z.number().int().min(0),
});

export const researchAreaSchema = z.object({
  name: z.string().min(1),
  score: z.number().int().min(0).max(100),
});

export const patentRegionStatSchema = z.object({
  applications: z.number().int().min(0),
  registrations: z.number().int().min(0),
});

export const patentYearlyStatSchema = z.object({
  year: z.string().min(1),
  applications: z.number().int().min(0),
  registrations: z.number().int().min(0),
});

export const patentStatsSchema = z.object({
  domestic: patentRegionStatSchema,
  international: patentRegionStatSchema,
  yearly: z.array(patentYearlyStatSchema).min(1),
});

export const profileSchema = z.object({
  name: z.string().min(1),
  localName: z.string().min(1),
  headline: z.string().min(1),
  bio: z.string().min(1),
  researchSummary: z.string().min(1),
  email: z.email(),
  location: z.string().min(1),
  website: z.url(),
  googleScholarUrl: optionalUrlSchema,
  githubUsername: z.string().min(1),
  articleKeywords: z.array(z.string().min(1)).min(1),
  videoKeywords: z.array(z.string().min(1)).min(1),
  interests: z.array(z.string().min(1)),
  relatedTechnologies: z.array(z.string().min(1)),
  standardizationActivities: z.array(z.string().min(1)),
  researchMetrics: researchMetricsSchema,
  researchAreas: z.array(researchAreaSchema).min(1),
  patentStats: patentStatsSchema,
  links: z.array(linkItemSchema),
  rssFeeds: z.array(rssFeedSchema),
  youtubeChannels: z.array(youtubeChannelSchema),
  staticPhotoUrls: z.array(z.url()),
  googlePhotos: z.object({
    enabled: z.boolean(),
    albumId: z.string(),
    filterKeyword: z.string().min(1),
  }),
  autoInterestNews: autoInterestNewsSchema,
  refreshIntervalMinutes: z.number().int().min(15).max(1440),
});

export type ProfileInput = z.infer<typeof profileSchema>;
