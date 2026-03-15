import Image from "next/image";
import Link from "next/link";

import { RefreshButton } from "@/app/ui/refresh-button";
import { isAdminAuthenticated, isAdminAuthEnabled } from "@/lib/admin-auth";
import { readPromotionData } from "@/lib/promotion";
import { getHomepageData, getRefreshStatus } from "@/lib/refresh";

export const dynamic = "force-dynamic";

function formatDate(iso: string | null): string {
  if (!iso) return "Never";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

export default async function HomePage() {
  const [authEnabled, adminAuthenticated, homepageData, status, promotionData] =
    await Promise.all([
      isAdminAuthEnabled(),
      isAdminAuthenticated(),
      getHomepageData(),
      getRefreshStatus(),
      readPromotionData(),
    ]);

  const [profile, content] = homepageData;
  const organization = profile.location.split(",")[0]?.trim() ?? "ETRI";
  const hasVideoViews = content.videos.some((video) => video.viewCount > 0);

  return (
    <main className="page">
      <section className="hero card">
        <div>
          <p className="eyebrow">IT EXPERT PROFILE</p>
          <h1>{profile.name}</h1>
          <p className="name-local">Ha Suwook | 하수욱 | {organization}</p>
          <p className="headline">{profile.headline}</p>
          <p>{profile.bio}</p>
          <div className="meta">
            <span>{profile.location}</span>
            <span>{profile.email}</span>
            <Link href={profile.website} target="_blank">
              Website
            </Link>
          </div>
          <div className="actions">
            {adminAuthenticated ? <RefreshButton /> : null}
            <Link
              className="button secondary"
              href={adminAuthenticated || !authEnabled ? "/admin" : "/admin/login"}
            >
              {adminAuthenticated || !authEnabled ? "Manage Profile" : "Admin Login"}
            </Link>
          </div>
          <p className="updated">Last refresh: {formatDate(content.updatedAt)}</p>
        </div>
      </section>

      <section className="card spotlight">
        <div className="section-header">
          <h2>Professional Highlights</h2>
          <span className="tag">Verified Links</span>
        </div>
        <p className="hint">Updated from curated public sources: {promotionData.updatedAt}</p>
        <div className="highlight-grid">
          {promotionData.highlights.map((item) => (
            <article key={item.id} className="highlight-item">
              <p className="item-meta">
                {item.date} | {item.sourceName}
              </p>
              <h3>{item.title}</h3>
              <p>{item.summary}</p>
              <p className="impact">{item.impact}</p>
              <Link className="source-link" href={item.sourceUrl} target="_blank">
                Open Source
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="card">
        <h2>Refresh Status</h2>
        <p className="hint">
          Cached now: articles {status.counts.articles}, videos {status.counts.videos},
          photos {status.counts.photos}, projects {status.counts.projects}
        </p>
        {status.recentRuns[0] ? (
          <p className="hint">
            Latest run: {status.recentRuns[0].success ? "success" : "failed"} |{" "}
            {status.recentRuns[0].trigger} |{" "}
            {formatDate(status.recentRuns[0].completedAt)}
          </p>
        ) : (
          <p className="hint">No refresh logs yet.</p>
        )}
      </section>

      <section className="card">
        <h2>GitHub Projects ({profile.githubUsername})</h2>
        <div className="grid">
          {content.projects.length === 0 ? (
            <p className="empty">No GitHub projects fetched yet.</p>
          ) : (
            content.projects.map((project) => (
              <article key={project.id} className="item">
                <p className="item-meta">
                  {project.language} | stars {formatNumber(project.stars)} | forks{" "}
                  {formatNumber(project.forks)}
                </p>
                <h3>
                  <Link href={project.url} target="_blank">
                    {project.name}
                  </Link>
                </h3>
                <p>{project.description}</p>
                <p className="item-meta">updated {formatDate(project.updatedAt)}</p>
              </article>
            ))
          )}
        </div>
      </section>

      <section className="card">
        <div className="section-header">
          <h2>IT Standardization Articles (Top 10)</h2>
          <Link href="/api/content" target="_blank">
            JSON API
          </Link>
        </div>
        <div className="grid">
          {content.articles.length === 0 ? (
            <p className="empty">No ranked articles collected yet.</p>
          ) : (
            content.articles.map((article) => (
              <article key={article.id} className="item">
                <p className="item-meta">
                  #{article.rank} | {article.source} | {formatDate(article.publishedAt)}
                </p>
                <h3>
                  <Link href={article.url} target="_blank">
                    {article.title}
                  </Link>
                </h3>
                <p>{article.summary}</p>
              </article>
            ))
          )}
        </div>
      </section>

      <section className="card">
        <h2>AI / Standardization / Latest Tech Videos (Top 10 by Views)</h2>
        {!hasVideoViews ? (
          <p className="hint">Set YOUTUBE_API_KEY to enable true view-count ranking.</p>
        ) : null}
        <div className="video-grid">
          {content.videos.length === 0 ? (
            <p className="empty">No ranked videos collected yet.</p>
          ) : (
            content.videos.map((video, index) => (
              <article key={video.id} className="video-item">
                {video.thumbnail ? (
                  <Image
                    src={video.thumbnail}
                    alt={video.title}
                    width={480}
                    height={270}
                    className="thumb"
                  />
                ) : null}
                <div className="video-body">
                  <p className="item-meta">
                    #{index + 1} | {video.channel} | views {formatNumber(video.viewCount)}
                  </p>
                  <h3>
                    <Link href={video.url} target="_blank">
                      {video.title}
                    </Link>
                  </h3>
                </div>
              </article>
            ))
          )}
        </div>
      </section>

      <section className="card">
        <h2>
          Photos (Google Photos keyword: &quot;{profile.googlePhotos.filterKeyword}
          &quot;)
        </h2>
        <div className="photo-grid">
          {content.photos.length === 0 ? (
            <p className="empty">
              No matching photos found. Enable Google Photos and set album/keyword in admin.
            </p>
          ) : (
            content.photos.map((photo) => (
              <figure key={photo.id} className="photo-item">
                <Image
                  src={photo.url}
                  alt={photo.description}
                  width={500}
                  height={375}
                  className="photo"
                />
                <figcaption>{photo.description}</figcaption>
              </figure>
            ))
          )}
        </div>
      </section>

      <section className="card">
        <h2>Links</h2>
        <ul className="links">
          {profile.links.map((link) => (
            <li key={`${link.label}-${link.url}`}>
              <Link href={link.url} target="_blank">
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
