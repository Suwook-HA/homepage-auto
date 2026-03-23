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
const MIN_ARTICLES = 6;
const PROJECT_REFRESH_INTERVAL_MS = 24 * 60 * 60 * 1000;

function needsRefresh(content: ContentData, refreshIntervalMinutes: number): boolean {
  if (!content.updatedAt) return true;
  const updatedMs = new Date(content.updatedAt).getTime();
  if (Number.isNaN(updatedMs)) return true;

  const ageMs = Date.now() - updatedMs;
  return ageMs >= refreshIntervalMinutes * 60_000;
}

function needsProjectRefresh(content: ContentData): boolean {
  const checkedAt = content.projectsCheckedAt ?? content.updatedAt;
  if (!checkedAt) return true;
  const checkedMs = new Date(checkedAt).getTime();
  if (Number.isNaN(checkedMs)) return true;
  return Date.now() - checkedMs >= PROJECT_REFRESH_INTERVAL_MS;
}

function projectsFingerprint(content: ContentData["projects"]): string {
  return content
    .map((project) =>
      [
        project.id,
        project.name,
        project.url,
        project.updatedAt,
        project.stars,
        project.forks,
        project.language,
        project.description,
      ].join("|"),
    )
    .join("||");
}

function projectsChanged(
  prevProjects: ContentData["projects"],
  nextProjects: ContentData["projects"],
): boolean {
  return projectsFingerprint(prevProjects) !== projectsFingerprint(nextProjects);
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
    const shouldRefreshAll = force || needsRefresh(existing, profile.refreshIntervalMinutes);

    if (!shouldRefreshAll) {
      if (!needsProjectRefresh(existing)) {
        return existing;
      }

      try {
        const fetchedProjects = await fetchProjects(profile);
        const now = new Date().toISOString();
        const nextProjects = fetchedProjects.length > 0 ? fetchedProjects : existing.projects;
        const hasProjectDiff = projectsChanged(existing.projects, nextProjects);

        const content: ContentData = {
          ...existing,
          projects: nextProjects,
          projectsCheckedAt: now,
          projectsUpdatedAt: hasProjectDiff
            ? now
            : existing.projectsUpdatedAt ?? existing.updatedAt ?? now,
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
          message: "projects daily check completed",
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
          message: error instanceof Error ? error.message : "unknown project refresh error",
          counts: counts(latestContent ?? existing),
        });
        throw error;
      }
    }

    try {
      const [articles, videos, photos, projects] = await Promise.all([
        fetchArticles(profile),
        fetchVideos(profile),
        fetchPhotos(profile),
        fetchProjects(profile),
      ]);

      const nextArticles =
        articles.length >= MIN_ARTICLES || existing.articles.length < MIN_ARTICLES
          ? articles
          : existing.articles;
      const now = new Date().toISOString();
      const hasProjectDiff = projectsChanged(existing.projects, projects);

      const content: ContentData = {
        updatedAt: now,
        projectsCheckedAt: now,
        projectsUpdatedAt: hasProjectDiff
          ? now
          : existing.projectsUpdatedAt ?? existing.updatedAt ?? now,
        articles: nextArticles,
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
