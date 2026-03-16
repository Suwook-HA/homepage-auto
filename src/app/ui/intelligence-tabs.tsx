"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

import type { ArticleItem, PhotoItem, VideoItem } from "@/lib/types";

type TabId = "articles" | "videos" | "photos";

type Props = {
  articles: ArticleItem[];
  videos: VideoItem[];
  photos: PhotoItem[];
};

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
  }).format(date);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

export function IntelligenceTabs({ articles, videos, photos }: Props) {
  const [activeTab, setActiveTab] = useState<TabId>("articles");

  const tabMeta = useMemo(
    () => [
      { id: "articles" as const, label: "Articles", count: Math.min(articles.length, 8) },
      { id: "videos" as const, label: "Videos", count: Math.min(videos.length, 8) },
      { id: "photos" as const, label: "Photos", count: photos.length },
    ],
    [articles.length, photos.length, videos.length],
  );

  return (
    <div className="media-tabs">
      <div className="media-tablist" role="tablist" aria-label="Content categories">
        {tabMeta.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`media-tab${activeTab === tab.id ? " active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span>{tab.label}</span>
            <strong>{tab.count}</strong>
          </button>
        ))}
      </div>

      <div className="media-stage">
        {activeTab === "articles" ? (
          <div className="media-layout">
            {articles[0] ? (
              <article className="media-feature">
                <p className="media-kicker">Lead Story</p>
                <h3>
                  <Link href={articles[0].url} target="_blank">
                    {articles[0].title}
                  </Link>
                </h3>
                <p>{articles[0].summary}</p>
                <p className="item-meta">
                  #{articles[0].rank} | {articles[0].source} | {formatDate(articles[0].publishedAt)}
                </p>
              </article>
            ) : (
              <p className="media-empty">No ranked articles collected yet.</p>
            )}

            <div className="media-list">
              {articles.slice(1, 6).map((article) => (
                <article key={article.id} className="media-list-item">
                  <p className="item-meta">
                    #{article.rank} | {article.source} | {formatDate(article.publishedAt)}
                  </p>
                  <h4>
                    <Link href={article.url} target="_blank">
                      {article.title}
                    </Link>
                  </h4>
                  <p>{article.summary}</p>
                </article>
              ))}
            </div>
          </div>
        ) : null}

        {activeTab === "videos" ? (
          <div className="media-layout">
            {videos[0] ? (
              <article className="media-feature video-feature">
                {videos[0].thumbnail ? (
                  <Image
                    src={videos[0].thumbnail}
                    alt={videos[0].title}
                    width={640}
                    height={360}
                    className="media-feature-thumb"
                  />
                ) : null}
                <div className="media-feature-body">
                  <p className="media-kicker">Featured Video</p>
                  <h3>
                    <Link href={videos[0].url} target="_blank">
                      {videos[0].title}
                    </Link>
                  </h3>
                  <p className="item-meta">
                    {videos[0].channel} | views {formatNumber(videos[0].viewCount)} |{" "}
                    {formatDate(videos[0].publishedAt)}
                  </p>
                </div>
              </article>
            ) : (
              <p className="media-empty">No ranked videos collected yet.</p>
            )}

            <div className="media-list">
              {videos.slice(1, 6).map((video, index) => (
                <article key={video.id} className="media-list-item compact">
                  <p className="item-meta">
                    #{index + 2} | {video.channel} | views {formatNumber(video.viewCount)}
                  </p>
                  <h4>
                    <Link href={video.url} target="_blank">
                      {video.title}
                    </Link>
                  </h4>
                  <p>{formatDate(video.publishedAt)}</p>
                </article>
              ))}
            </div>
          </div>
        ) : null}

        {activeTab === "photos" ? (
          <div className="media-photo-grid">
            {photos.length === 0 ? (
              <p className="media-empty">
                No matching photos found. Enable Google Photos and set album/keyword in admin.
              </p>
            ) : (
              photos.slice(0, 6).map((photo) => (
                <figure key={photo.id} className="media-photo-item">
                  <Image
                    src={photo.url}
                    alt={photo.description}
                    width={560}
                    height={420}
                    className="media-photo"
                  />
                  <figcaption>{photo.description}</figcaption>
                </figure>
              ))
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
