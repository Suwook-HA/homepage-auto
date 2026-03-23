import crypto from "node:crypto";

import {
  fetchArticles,
  fetchPatents,
  fetchPhotos,
  fetchProjects,
  fetchVideos,
} from "@/lib/fetch-content";
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
const PATENT_REFRESH_INTERVAL_MS = 24 * 60 * 60 * 1000;

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

function needsPatentRefresh(content: ContentData): boolean {
  const checkedAt = content.patents?.checkedAt ?? content.updatedAt;
  if (!checkedAt) return true;
  const checkedMs = new Date(checkedAt).getTime();
  if (Number.isNaN(checkedMs)) return true;
  return Date.now() - checkedMs >= PATENT_REFRESH_INTERVAL_MS;
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

function patentsFingerprint(content: ContentData["patents"]): string {
  if (!content) return "";
  const records = content.records
    .map((record) =>
      [
        record.patentNumber,
        record.title,
        record.region,
        record.status,
        record.filedAt,
        record.sourceUrl ?? "",
      ].join("|"),
    )
    .join("||");

  return [
    content.source.provider,
    content.source.query,
    records,
    content.stats.domestic.applications,
    content.stats.domestic.registrations,
    content.stats.international.applications,
    content.stats.international.registrations,
  ].join("|");
}

function patentsChanged(
  prevPatents: ContentData["patents"],
  nextPatents: ContentData["patents"],
): boolean {
  return patentsFingerprint(prevPatents) !== patentsFingerprint(nextPatents);
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
    patents: content.patents?.records.length ?? 0,
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
      const shouldRefreshProjects = needsProjectRefresh(existing);
      const shouldRefreshPatents = needsPatentRefresh(existing);
      if (!shouldRefreshProjects && !shouldRefreshPatents) {
        return existing;
      }

      try {
        const [fetchedProjects, fetchedPatents] = await Promise.all([
          shouldRefreshProjects ? fetchProjects(profile) : Promise.resolve(existing.projects),
          shouldRefreshPatents ? fetchPatents(profile) : Promise.resolve(null),
        ]);
        const now = new Date().toISOString();
        const nextProjects =
          shouldRefreshProjects && fetchedProjects.length > 0
            ? fetchedProjects
            : existing.projects;
        const hasProjectDiff = projectsChanged(existing.projects, nextProjects);
        const nextPatentsRaw = fetchedPatents
          ? {
              ...fetchedPatents,
              checkedAt: now,
              updatedAt: now,
            }
          : existing.patents ?? null;
        const hasPatentDiff = patentsChanged(existing.patents ?? null, nextPatentsRaw);
        const nextPatents = nextPatentsRaw
          ? {
              ...nextPatentsRaw,
              checkedAt: shouldRefreshPatents ? now : nextPatentsRaw.checkedAt,
              updatedAt: hasPatentDiff
                ? now
                : existing.patents?.updatedAt ?? nextPatentsRaw.updatedAt,
            }
          : null;

        const content: ContentData = {
          ...existing,
          projects: nextProjects,
          patents: nextPatents,
          projectsCheckedAt: shouldRefreshProjects
            ? now
            : existing.projectsCheckedAt ?? existing.updatedAt ?? now,
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
          message: "projects/patents daily check completed",
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
      const shouldRefreshPatents = force || needsPatentRefresh(existing);
      const fetchedPatents = shouldRefreshPatents ? await fetchPatents(profile) : null;
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
      const nextPatentsRaw = fetchedPatents
        ? {
            ...fetchedPatents,
            checkedAt: now,
            updatedAt: now,
          }
        : existing.patents ?? null;
      const hasPatentDiff = patentsChanged(existing.patents ?? null, nextPatentsRaw);
      const nextPatents = nextPatentsRaw
        ? {
            ...nextPatentsRaw,
            checkedAt: shouldRefreshPatents ? now : nextPatentsRaw.checkedAt,
            updatedAt: hasPatentDiff
              ? now
              : existing.patents?.updatedAt ?? nextPatentsRaw.updatedAt,
          }
        : null;

      const content: ContentData = {
        updatedAt: now,
        projectsCheckedAt: now,
        projectsUpdatedAt: hasProjectDiff
          ? now
          : existing.projectsUpdatedAt ?? existing.updatedAt ?? now,
        patents: nextPatents,
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
