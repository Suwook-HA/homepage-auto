"use client";

import { useMemo, useState } from "react";

import type { ProfileData, ResearchArea } from "@/lib/types";

type Props = {
  initialProfile: ProfileData;
};

type FormState = {
  name: string;
  localName: string;
  headline: string;
  bio: string;
  researchSummary: string;
  email: string;
  location: string;
  website: string;
  googleScholarUrl: string;
  githubUsername: string;
  articleKeywords: string;
  videoKeywords: string;
  interests: string;
  relatedTechnologies: string;
  standardizationActivities: string;
  researchMetricsCitations: string;
  researchMetricsHIndex: string;
  researchMetricsI10Index: string;
  researchMetricsPublications: string;
  researchAreas: string;
  patentDomesticApplications: string;
  patentDomesticRegistrations: string;
  patentInternationalApplications: string;
  patentInternationalRegistrations: string;
  patentYearlyStats: string;
  links: string;
  rssFeeds: string;
  youtubeChannels: string;
  staticPhotoUrls: string;
  googlePhotosEnabled: boolean;
  googlePhotosAlbumId: string;
  googlePhotosFilterKeyword: string;
  autoInterestNewsEnabled: boolean;
  autoInterestNewsLocale: string;
  autoInterestNewsMaxPerInterest: string;
  refreshIntervalMinutes: string;
};

function toLines(values: string[]): string {
  return values.join("\n");
}

function toPairLines<T extends { name: string; url?: string; channelId?: string }>(
  values: T[],
  key: "url" | "channelId",
): string {
  return values.map((item) => `${item.name}|${item[key] ?? ""}`).join("\n");
}

function parseCSV(input: string): string[] {
  return input
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseLines(input: string): string[] {
  return input
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function parsePairs(input: string): Array<{ name: string; value: string }> {
  return parseLines(input)
    .map((line) => line.split("|"))
    .map(([name, value]) => ({
      name: (name ?? "").trim(),
      value: (value ?? "").trim(),
    }))
    .filter((item) => item.name && item.value);
}

function parseResearchAreas(input: string): ResearchArea[] {
  return parseLines(input)
    .map((line) => line.split("|"))
    .map(([name, score]) => ({
      name: (name ?? "").trim(),
      score: Number((score ?? "").trim()),
    }))
    .filter((item) => item.name && Number.isFinite(item.score))
    .map((item) => ({
      name: item.name,
      score: Math.max(0, Math.min(100, Math.round(item.score))),
    }));
}

function parsePatentYearlyStats(
  input: string,
): Array<{ year: string; applications: number; registrations: number }> {
  return parseLines(input)
    .map((line) => line.split("|"))
    .map(([year, applications, registrations]) => ({
      year: (year ?? "").trim(),
      applications: Number((applications ?? "").trim()),
      registrations: Number((registrations ?? "").trim()),
    }))
    .filter(
      (item) =>
        item.year &&
        Number.isFinite(item.applications) &&
        Number.isFinite(item.registrations),
    )
    .map((item) => ({
      year: item.year,
      applications: Math.max(0, Math.round(item.applications)),
      registrations: Math.max(0, Math.round(item.registrations)),
    }));
}

function fromProfile(profile: ProfileData): FormState {
  return {
    name: profile.name,
    localName: profile.localName,
    headline: profile.headline,
    bio: profile.bio,
    researchSummary: profile.researchSummary,
    email: profile.email,
    location: profile.location,
    website: profile.website,
    googleScholarUrl: profile.googleScholarUrl,
    githubUsername: profile.githubUsername,
    articleKeywords: profile.articleKeywords.join(", "),
    videoKeywords: profile.videoKeywords.join(", "),
    interests: profile.interests.join(", "),
    relatedTechnologies: profile.relatedTechnologies.join(", "),
    standardizationActivities: profile.standardizationActivities.join(", "),
    researchMetricsCitations: String(profile.researchMetrics.citations),
    researchMetricsHIndex: String(profile.researchMetrics.hIndex),
    researchMetricsI10Index: String(profile.researchMetrics.i10Index),
    researchMetricsPublications: String(profile.researchMetrics.publications),
    researchAreas: profile.researchAreas
      .map((area) => `${area.name}|${area.score}`)
      .join("\n"),
    patentDomesticApplications: String(profile.patentStats.domestic.applications),
    patentDomesticRegistrations: String(profile.patentStats.domestic.registrations),
    patentInternationalApplications: String(profile.patentStats.international.applications),
    patentInternationalRegistrations: String(profile.patentStats.international.registrations),
    patentYearlyStats: profile.patentStats.yearly
      .map((item) => `${item.year}|${item.applications}|${item.registrations}`)
      .join("\n"),
    links: profile.links.map((link) => `${link.label}|${link.url}`).join("\n"),
    rssFeeds: toPairLines(profile.rssFeeds, "url"),
    youtubeChannels: toPairLines(profile.youtubeChannels, "channelId"),
    staticPhotoUrls: toLines(profile.staticPhotoUrls),
    googlePhotosEnabled: profile.googlePhotos.enabled,
    googlePhotosAlbumId: profile.googlePhotos.albumId,
    googlePhotosFilterKeyword: profile.googlePhotos.filterKeyword,
    autoInterestNewsEnabled: profile.autoInterestNews.enabled,
    autoInterestNewsLocale: profile.autoInterestNews.locale,
    autoInterestNewsMaxPerInterest: String(profile.autoInterestNews.maxPerInterest),
    refreshIntervalMinutes: String(profile.refreshIntervalMinutes),
  };
}

export function AdminForm({ initialProfile }: Props) {
  const [form, setForm] = useState<FormState>(() => fromProfile(initialProfile));
  const [status, setStatus] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const parsedPreview = useMemo(() => {
    return {
      interests: parseCSV(form.interests).length,
      feeds: parsePairs(form.rssFeeds).length,
      channels: parsePairs(form.youtubeChannels).length,
      photos: parseLines(form.staticPhotoUrls).length,
      areas: parseResearchAreas(form.researchAreas).length,
      patentYears: parsePatentYearlyStats(form.patentYearlyStats).length,
      relatedTech: parseCSV(form.relatedTechnologies).length,
    };
  }, [
    form.interests,
    form.relatedTechnologies,
    form.researchAreas,
    form.rssFeeds,
    form.youtubeChannels,
    form.staticPhotoUrls,
    form.patentYearlyStats,
  ]);

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("");
    setIsLoading(true);

    const links = parsePairs(form.links).map((item) => ({
      label: item.name,
      url: item.value,
    }));

    const profile: ProfileData = {
      name: form.name.trim(),
      localName: form.localName.trim(),
      headline: form.headline.trim(),
      bio: form.bio.trim(),
      researchSummary: form.researchSummary.trim(),
      email: form.email.trim(),
      location: form.location.trim(),
      website: form.website.trim(),
      googleScholarUrl: form.googleScholarUrl.trim(),
      githubUsername: form.githubUsername.trim(),
      articleKeywords: parseCSV(form.articleKeywords),
      videoKeywords: parseCSV(form.videoKeywords),
      interests: parseCSV(form.interests),
      relatedTechnologies: parseCSV(form.relatedTechnologies),
      standardizationActivities: parseCSV(form.standardizationActivities),
      researchMetrics: {
        citations: Math.max(0, Number(form.researchMetricsCitations)),
        hIndex: Math.max(0, Number(form.researchMetricsHIndex)),
        i10Index: Math.max(0, Number(form.researchMetricsI10Index)),
        publications: Math.max(0, Number(form.researchMetricsPublications)),
      },
      researchAreas: parseResearchAreas(form.researchAreas),
      patentStats: {
        domestic: {
          applications: Math.max(0, Number(form.patentDomesticApplications)),
          registrations: Math.max(0, Number(form.patentDomesticRegistrations)),
        },
        international: {
          applications: Math.max(0, Number(form.patentInternationalApplications)),
          registrations: Math.max(0, Number(form.patentInternationalRegistrations)),
        },
        yearly: parsePatentYearlyStats(form.patentYearlyStats),
      },
      links,
      rssFeeds: parsePairs(form.rssFeeds).map((item) => ({
        name: item.name,
        url: item.value,
      })),
      youtubeChannels: parsePairs(form.youtubeChannels).map((item) => ({
        name: item.name,
        channelId: item.value,
      })),
      staticPhotoUrls: parseLines(form.staticPhotoUrls),
      googlePhotos: {
        enabled: form.googlePhotosEnabled,
        albumId: form.googlePhotosAlbumId.trim(),
        filterKeyword: form.googlePhotosFilterKeyword.trim(),
      },
      autoInterestNews: {
        enabled: form.autoInterestNewsEnabled,
        locale: form.autoInterestNewsLocale.trim(),
        maxPerInterest: Number(form.autoInterestNewsMaxPerInterest),
      },
      refreshIntervalMinutes: Number(form.refreshIntervalMinutes),
    };

    try {
      const saveRes = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });

      if (saveRes.status === 401) {
        window.location.href = "/admin/login";
        return;
      }

      if (!saveRes.ok) {
        throw new Error("save_failed");
      }

      const refreshRes = await fetch("/api/refresh?trigger=profile-save", {
        method: "POST",
      });
      if (refreshRes.status === 401) {
        window.location.href = "/admin/login";
        return;
      }
      if (!refreshRes.ok) {
        throw new Error("refresh_failed");
      }

      setStatus("Saved and refreshed successfully.");
    } catch {
      setStatus("Save or refresh failed. Please verify your input.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form className="admin-form" onSubmit={handleSubmit}>
      <label>
        Name (English)
        <input value={form.name} onChange={(e) => setField("name", e.target.value)} />
      </label>

      <label>
        Name (Korean)
        <input
          value={form.localName}
          onChange={(e) => setField("localName", e.target.value)}
        />
      </label>

      <label>
        Headline
        <input
          value={form.headline}
          onChange={(e) => setField("headline", e.target.value)}
        />
      </label>

      <label>
        Bio
        <textarea value={form.bio} onChange={(e) => setField("bio", e.target.value)} />
      </label>

      <label>
        Research Summary (for dashboard)
        <textarea
          value={form.researchSummary}
          onChange={(e) => setField("researchSummary", e.target.value)}
        />
      </label>

      <div className="form-grid">
        <label>
          Email
          <input
            value={form.email}
            onChange={(e) => setField("email", e.target.value)}
          />
        </label>
        <label>
          Location
          <input
            value={form.location}
            onChange={(e) => setField("location", e.target.value)}
          />
        </label>
      </div>

      <div className="form-grid">
        <label>
          Website URL
          <input
            value={form.website}
            onChange={(e) => setField("website", e.target.value)}
          />
        </label>
        <label>
          Google Scholar URL
          <input
            value={form.googleScholarUrl}
            onChange={(e) => setField("googleScholarUrl", e.target.value)}
          />
        </label>
      </div>

      <label>
        GitHub Username
        <input
          value={form.githubUsername}
          onChange={(e) => setField("githubUsername", e.target.value)}
        />
      </label>

      <label>
        Article keywords for ranking (comma-separated)
        <input
          value={form.articleKeywords}
          onChange={(e) => setField("articleKeywords", e.target.value)}
        />
      </label>

      <label>
        Video keywords for ranking (comma-separated)
        <input
          value={form.videoKeywords}
          onChange={(e) => setField("videoKeywords", e.target.value)}
        />
      </label>

      <label>
        Interests (comma-separated)
        <input
          value={form.interests}
          onChange={(e) => setField("interests", e.target.value)}
        />
      </label>

      <label>
        Related Technologies (comma-separated)
        <input
          value={form.relatedTechnologies}
          onChange={(e) => setField("relatedTechnologies", e.target.value)}
        />
      </label>

      <label>
        Standardization Activities (comma-separated)
        <input
          value={form.standardizationActivities}
          onChange={(e) => setField("standardizationActivities", e.target.value)}
        />
      </label>

      <div className="form-grid">
        <label>
          Citations
          <input
            type="number"
            min={0}
            value={form.researchMetricsCitations}
            onChange={(e) => setField("researchMetricsCitations", e.target.value)}
          />
        </label>
        <label>
          h-index
          <input
            type="number"
            min={0}
            value={form.researchMetricsHIndex}
            onChange={(e) => setField("researchMetricsHIndex", e.target.value)}
          />
        </label>
        <label>
          i10-index
          <input
            type="number"
            min={0}
            value={form.researchMetricsI10Index}
            onChange={(e) => setField("researchMetricsI10Index", e.target.value)}
          />
        </label>
        <label>
          Publications
          <input
            type="number"
            min={0}
            value={form.researchMetricsPublications}
            onChange={(e) => setField("researchMetricsPublications", e.target.value)}
          />
        </label>
      </div>

      <div className="form-grid">
        <label>
          Domestic Patent Applications
          <input
            type="number"
            min={0}
            value={form.patentDomesticApplications}
            onChange={(e) => setField("patentDomesticApplications", e.target.value)}
          />
        </label>
        <label>
          Domestic Patent Registrations
          <input
            type="number"
            min={0}
            value={form.patentDomesticRegistrations}
            onChange={(e) => setField("patentDomesticRegistrations", e.target.value)}
          />
        </label>
        <label>
          International Patent Applications
          <input
            type="number"
            min={0}
            value={form.patentInternationalApplications}
            onChange={(e) => setField("patentInternationalApplications", e.target.value)}
          />
        </label>
        <label>
          International Patent Registrations
          <input
            type="number"
            min={0}
            value={form.patentInternationalRegistrations}
            onChange={(e) => setField("patentInternationalRegistrations", e.target.value)}
          />
        </label>
      </div>

      <label>
        Patent Yearly Stats (one per line: Year|Applications|Registrations)
        <textarea
          value={form.patentYearlyStats}
          onChange={(e) => setField("patentYearlyStats", e.target.value)}
        />
      </label>

      <label>
        Research Areas (one per line: Area|Score 0-100)
        <textarea
          value={form.researchAreas}
          onChange={(e) => setField("researchAreas", e.target.value)}
        />
      </label>

      <label>
        Links (one per line: Label|URL)
        <textarea value={form.links} onChange={(e) => setField("links", e.target.value)} />
      </label>

      <label>
        RSS Feeds (one per line: Name|RSS URL)
        <textarea
          value={form.rssFeeds}
          onChange={(e) => setField("rssFeeds", e.target.value)}
        />
      </label>

      <label>
        YouTube Channels (one per line: Name|CHANNEL_ID)
        <textarea
          value={form.youtubeChannels}
          onChange={(e) => setField("youtubeChannels", e.target.value)}
        />
      </label>

      <label>
        Static Photo URLs (one URL per line)
        <textarea
          value={form.staticPhotoUrls}
          onChange={(e) => setField("staticPhotoUrls", e.target.value)}
        />
      </label>

      <div className="form-grid">
        <label>
          Enable Google Photos
          <input
            type="checkbox"
            checked={form.googlePhotosEnabled}
            onChange={(e) => setField("googlePhotosEnabled", e.target.checked)}
          />
        </label>
        <label>
          Google Photos Album ID
          <input
            value={form.googlePhotosAlbumId}
            onChange={(e) => setField("googlePhotosAlbumId", e.target.value)}
          />
        </label>
      </div>

      <label>
        Google Photos keyword filter
        <input
          value={form.googlePhotosFilterKeyword}
          onChange={(e) => setField("googlePhotosFilterKeyword", e.target.value)}
        />
      </label>

      <div className="form-grid">
        <label>
          Interest-based News (Google News RSS)
          <input
            type="checkbox"
            checked={form.autoInterestNewsEnabled}
            onChange={(e) => setField("autoInterestNewsEnabled", e.target.checked)}
          />
        </label>
        <label>
          Locale (ko-KR, en-US ...)
          <input
            value={form.autoInterestNewsLocale}
            onChange={(e) => setField("autoInterestNewsLocale", e.target.value)}
          />
        </label>
      </div>

      <label>
        Max news per interest (1-10)
        <input
          type="number"
          min={1}
          max={10}
          value={form.autoInterestNewsMaxPerInterest}
          onChange={(e) => setField("autoInterestNewsMaxPerInterest", e.target.value)}
        />
      </label>

      <label>
        Refresh interval in minutes (15-1440)
        <input
          type="number"
          min={15}
          max={1440}
          value={form.refreshIntervalMinutes}
          onChange={(e) => setField("refreshIntervalMinutes", e.target.value)}
        />
      </label>

      <p className="hint">
        Current parsed config: interests {parsedPreview.interests}, related tech{" "}
        {parsedPreview.relatedTech}, areas {parsedPreview.areas}, feeds{" "}
        {parsedPreview.feeds}, channels {parsedPreview.channels}, patent years{" "}
        {parsedPreview.patentYears}, photos{" "}
        {parsedPreview.photos}
      </p>

      <button className="button" disabled={isLoading} type="submit">
        {isLoading ? "Saving..." : "Save + Refresh"}
      </button>

      {status ? <p className="status">{status}</p> : null}
    </form>
  );
}
