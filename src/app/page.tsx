import Link from "next/link";

import { LangText } from "@/app/ui/lang-text";
import { readPromotionData } from "@/lib/promotion";
import { getHomepageData } from "@/lib/refresh";

export const dynamic = "force-dynamic";

function fmt(n: number) {
  return new Intl.NumberFormat("en-US").format(n);
}

export default async function HomePage() {
  const [[profile, content], promotionData] = await Promise.all([
    getHomepageData(),
    readPromotionData(),
  ]);

  const organization = profile.location.split(",")[0]?.trim() ?? "ETRI";
  const areaMax = Math.max(...profile.researchAreas.map((a) => a.score), 1);

  return (
    <div className="page-wrapper">
      {/* ── HERO ── */}
      <section className="hero">
        <div className="hero-eyebrow">
          <span className="hero-dot" />
          <span className="hero-org">
            {organization} · Daejeon, Korea
          </span>
        </div>

        <h1>{profile.name}</h1>
        <p className="hero-local">{profile.localName}</p>
        <p className="hero-headline">{profile.headline}</p>

        <div className="hero-bio">
          <p className="profile-paragraph ko">{profile.introKo}</p>
          <p className="profile-paragraph en">{profile.introEn}</p>
        </div>

        <div className="hero-interest-list">
          {profile.interests.map((interest) => (
            <span key={interest} className="tag">
              {interest}
            </span>
          ))}
        </div>

        <div className="actions">
          <Link className="button" href="/research">
            View Research
          </Link>
          <Link className="button secondary" href="/about">
            About Me
          </Link>
          {profile.resumeUrl && (
            <Link className="button secondary" href={profile.resumeUrl} target="_blank" download>
              Download CV
            </Link>
          )}
          <Link className="button secondary" href="/contact">
            Contact
          </Link>
        </div>
      </section>

      {/* ── KEY METRICS ── */}
      <section className="section">
        <span className="section-label">
          <LangText ko="연구 성과" en="Research Impact" inline />
        </span>
        <div className="stat-grid">
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
            <span className="stat-note">
              i10: {fmt(profile.researchMetrics.i10Index)}
            </span>
          </div>
          <div className="stat-card">
            <p className="stat-label">Publications</p>
            <strong className="stat-value">
              {fmt(profile.researchMetrics.publications)}
            </strong>
          </div>
          <div className="stat-card">
            <p className="stat-label">Standards Tracks</p>
            <strong className="stat-value">
              {fmt(profile.standardizationActivities.length)}
            </strong>
          </div>
        </div>
      </section>

      {/* ── RESEARCH AREAS ── */}
      <section className="section">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            flexWrap: "wrap",
            gap: 12,
            marginBottom: 24,
          }}
        >
          <div>
            <span className="section-label">
              <LangText ko="연구 분야" en="Research Focus" inline />
            </span>
            <h2 className="section-title" style={{ margin: 0 }}>
              <LangText ko="핵심 전문 분야" en="Core Expertise" />
            </h2>
          </div>
          <Link className="button secondary" href="/research">
            Full Dashboard →
          </Link>
        </div>
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

      {/* ── PROFESSIONAL HIGHLIGHTS ── */}
      {promotionData.highlights.length > 0 && (
        <section className="section">
          <span className="section-label">
            <LangText ko="최신 소식" en="Latest News" inline />
          </span>
          <h2 className="section-title">
            <LangText ko="전문가 하이라이트" en="Professional Highlights" />
          </h2>
          <p className="section-desc">
            <LangText
              ko="최근 연구 성과 및 미디어 언급"
              en="Recent achievements and media coverage"
              inline
            />
          </p>
          <div className="highlight-grid">
            {promotionData.highlights.slice(0, 3).map((item) => (
              <article key={item.id} className="item-card">
                <p className="item-meta">
                  {item.date} · {item.sourceName}
                </p>
                <h3>{item.title}</h3>
                <p>{item.summary}</p>
                <Link
                  href={item.sourceUrl}
                  target="_blank"
                  style={{
                    display: "inline-block",
                    marginTop: 10,
                    fontSize: "0.84rem",
                    color: "var(--primary)",
                    fontWeight: 600,
                  }}
                >
                  Read more →
                </Link>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* ── JSON-LD ── */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Person",
            name: profile.name,
            alternateName: profile.localName,
            jobTitle: profile.headline,
            description: profile.researchSummary,
            worksFor: {
              "@type": "Organization",
              name: organization,
              url: profile.website,
            },
            url: profile.website,
            email: profile.email,
            sameAs: [
              `https://github.com/${profile.githubUsername}`,
              profile.googleScholarUrl,
              ...profile.links.map((l) => l.url),
            ].filter(Boolean),
          }),
        }}
      />
    </div>
  );
}
