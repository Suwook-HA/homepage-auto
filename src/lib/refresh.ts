import crypto from "node:crypto";

import { fetchArticles, fetchPhotos, fetchProjects, fetchVideos } from "@/lib/fetch-content";
import {
  appendRefreshLog,
  readContent,
  readProfile,
  readRefreshLog,
  writeContent,
} from "@/lib/store";
import type { ContentData, RefreshTrigger } from "@/lib/types";

let refreshInFlight: Promise<ContentData> | null = null;

function needsRefresh(content: ContentData, refreshIntervalMinutes: number): boolean {
  if (!content.updatedAt) return true;
  const updatedMs = new Date(content.updatedAt).getTime();
  if (Number.isNaN(updatedMs)) return true;

  const ageMs = Date.now() - updatedMs;
  return ageMs >= refreshIntervalMinutes * 60_000;
}

type RefreshOptions = {
  force?: boolean;
  trigger?: RefreshTrigger;
};

function counts(content: ContentData) {
  return {
    articles: content.articles.length,
    videos: content.videos.length,
    photos: content.photos.length,
    projects: content.projects.length,
  };
}

export async function refreshContent(options: RefreshOptions = {}): Promise<ContentData> {
  const force = options.force ?? false;
  const trigger = options.trigger ?? "auto";

  if (refreshInFlight && !force) {
    return refreshInFlight;
  }

  refreshInFlight = (async () => {
    const startedAt = new Date();
    let latestContent: ContentData | null = null;
    const [profile, existing] = await Promise.all([readProfile(), readContent()]);
    if (!force && !needsRefresh(existing, profile.refreshIntervalMinutes)) {
      return existing;
    }

    try {
      const [articles, videos, photos, projects] = await Promise.all([
        fetchArticles(profile),
        fetchVideos(profile),
        fetchPhotos(profile),
        fetchProjects(profile),
      ]);

      const content: ContentData = {
        updatedAt: new Date().toISOString(),
        articles,
        videos,
        photos,
        projects,
      };

      await writeContent(content);
      latestContent = content;
      await appendRefreshLog({
        id: crypto.randomUUID(),
        trigger,
        requestedAt: startedAt.toISOString(),
        completedAt: new Date().toISOString(),
        durationMs: Date.now() - startedAt.getTime(),
        success: true,
        message: "refresh completed",
        counts: counts(content),
      });
      return content;
    } catch (error) {
      await appendRefreshLog({
        id: crypto.randomUUID(),
        trigger,
        requestedAt: startedAt.toISOString(),
        completedAt: new Date().toISOString(),
        durationMs: Date.now() - startedAt.getTime(),
        success: false,
        message: error instanceof Error ? error.message : "unknown refresh error",
        counts: counts(latestContent ?? existing),
      });
      throw error;
    }
  })();

  try {
    return await refreshInFlight;
  } finally {
    refreshInFlight = null;
  }
}

export async function getHomepageData() {
  await refreshContent({ force: false, trigger: "auto" });
  return Promise.all([readProfile(), readContent()]);
}

export async function getRefreshStatus() {
  const [content, log] = await Promise.all([readContent(), readRefreshLog()]);
  return {
    updatedAt: content.updatedAt,
    counts: counts(content),
    recentRuns: log.items.slice(0, 10),
  };
}
