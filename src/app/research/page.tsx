import Link from "next/link";
import type { Metadata } from "next";

import { LangText } from "@/app/ui/lang-text";
import { getHomepageData } from "@/lib/refresh";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Research | Ha Suwook",
  description: "Research areas, scholar metrics, publications, and standardization activities.",
};

function fmt(n: number) {
  return new Intl.NumberFormat("en-US").format(n);
}

export default async function ResearchPage() {
  const [profile, content] = await getHomepageData();
  const areaMax = Math.max(...profile.researchAreas.map((a) => a.score), 1);

  return (
    <div className="page-wrapper">
      {/* ── HEADER ── */}
      <section className="section">
        <span className="section-label">
          <LangText ko="연구" en="Research" inline />
        </span>
        <h1 style={{ fontSize: "2rem", fontWeight: 800, marginBottom: 6 }}>
          <LangText ko="연구 인텔리전스" en="Research Intelligence" />
        </h1>
        <p style={{ color: "var(--muted)", marginBottom: 40, maxWidth: 640 }}>
          {profile.researchSummary}
        </p>

        {/* Scholar metrics */}
        <div className="stat-grid" style={{ marginBottom: 28 }}>
          <div className="stat-card">
            <p className="stat-label">Citations</p>
            <strong className="stat-value">
              {fmt(profile.researchMetrics.citations)}
            </strong>
          </div>
          <div className="stat-card">
            <p className="stat-label">h-index</p>
            <strong className="stat-value">
              {fmt(profile.researchMetrics.hIndex)}
            </strong>
          </div>
          <div className="stat-card">
            <p className="stat-label">i10-index</p>
            <strong className="stat-value">
              {fmt(profile.researchMetrics.i10Index)}
            </strong>
          </div>
          <div className="stat-card">
            <p className="stat-label">Publications</p>
            <strong className="stat-value">
              {fmt(profile.researchMetrics.publications)}
            </strong>
          </div>
        </div>

        {profile.googleScholarUrl && (
          <Link
            className="button secondary"
            href={profile.googleScholarUrl}
            target="_blank"
          >
            Google Scholar Profile →
          </Link>
        )}
      </section>

      {/* ── RESEARCH AREAS ── */}
      <section className="section">
        <span className="section-label">
          <LangText ko="연구 도메인" en="Domains" inline />
        </span>
        <h2 className="section-title">
          <LangText ko="연구 분야" en="Research Areas" />
        </h2>
        <div className="area-list" style={{ maxWidth: 560 }}>
          {profile.researchAreas.map((area) => (
            <div key={area.name} className="area-item">
              <div className="area-head">
                <span>{area.name}</span>
                <span className="area-score">{area.score}</span>
              </div>
              <div className="area-track">
                <span
                  className="area-fill"
                  style={{
                    width: `${Math.round((area.score / areaMax) * 100)}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── RELATED TECHNOLOGIES ── */}
      {profile.relatedTechnologies.length > 0 && (
        <section className="section">
          <span className="section-label">
            <LangText ko="기술" en="Technologies" inline />
          </span>
          <h2 className="section-title">
            <LangText ko="관련 기술" en="Related Technologies" />
          </h2>
          <div className="tech-cloud">
            {profile.relatedTechnologies.map((tech) => (
              <span key={tech} className="tech-pill">
                {tech}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* ── STANDARDIZATION ── */}
      {profile.standardizationActivities.length > 0 && (
        <section className="section">
          <span className="section-label">
            <LangText ko="표준화" en="Standardization" inline />
          </span>
          <h2 className="section-title">
            <LangText ko="활성 표준화 트랙" en="Active Standardization Tracks" />
          </h2>
          <div className="standards-list" style={{ maxWidth: 640 }}>
            {profile.standardizationActivities.map((activity, i) => (
              <div key={activity} className="standard-item">
                <span className="standard-num">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span>{activity}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── RECENT ARTICLES ── */}
      {content.articles.length > 0 && (
        <section className="section">
          <span className="section-label">
            <LangText ko="미디어" en="Media" inline />
          </span>
          <h2 className="section-title">
            <LangText ko="최신 기사" en="Recent Articles" />
          </h2>
          <div className="item-list">
            {content.articles.slice(0, 8).map((article) => (
              <article key={article.id} className="item-card">
                <p className="item-meta">
                  {article.publishedAt}
                  {article.source ? ` · ${article.source}` : ""}
                </p>
                <h3>
                  <Link href={article.url} target="_blank">
                    {article.title}
                  </Link>
                </h3>
                {article.summary && <p>{article.summary}</p>}
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
