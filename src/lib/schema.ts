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

export const profileSchema = z.object({
  name: z.string().min(1),
  headline: z.string().min(1),
  bio: z.string().min(1),
  email: z.email(),
  location: z.string().min(1),
  website: z.url(),
  githubUsername: z.string().min(1),
  articleKeywords: z.array(z.string().min(1)).min(1),
  videoKeywords: z.array(z.string().min(1)).min(1),
  interests: z.array(z.string().min(1)),
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
