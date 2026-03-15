"use client";

import { useMemo, useState } from "react";

import type { ProfileData } from "@/lib/types";

type Props = {
  initialProfile: ProfileData;
};

type FormState = {
  name: string;
  headline: string;
  bio: string;
  email: string;
  location: string;
  website: string;
  githubUsername: string;
  articleKeywords: string;
  videoKeywords: string;
  interests: string;
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

function fromProfile(profile: ProfileData): FormState {
  return {
    name: profile.name,
    headline: profile.headline,
    bio: profile.bio,
    email: profile.email,
    location: profile.location,
    website: profile.website,
    githubUsername: profile.githubUsername,
    articleKeywords: profile.articleKeywords.join(", "),
    videoKeywords: profile.videoKeywords.join(", "),
    interests: profile.interests.join(", "),
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
    };
  }, [form]);

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
      headline: form.headline.trim(),
      bio: form.bio.trim(),
      email: form.email.trim(),
      location: form.location.trim(),
      website: form.website.trim(),
      githubUsername: form.githubUsername.trim(),
      articleKeywords: parseCSV(form.articleKeywords),
      videoKeywords: parseCSV(form.videoKeywords),
      interests: parseCSV(form.interests),
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
        Name
        <input value={form.name} onChange={(e) => setField("name", e.target.value)} />
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

      <label>
        Website URL
        <input
          value={form.website}
          onChange={(e) => setField("website", e.target.value)}
        />
      </label>

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
        Current parsed config: interests {parsedPreview.interests}, feeds{" "}
        {parsedPreview.feeds}, channels {parsedPreview.channels}, photos{" "}
        {parsedPreview.photos}
      </p>

      <button className="button" disabled={isLoading} type="submit">
        {isLoading ? "Saving..." : "Save + Refresh"}
      </button>

      {status ? <p className="status">{status}</p> : null}
    </form>
  );
}
