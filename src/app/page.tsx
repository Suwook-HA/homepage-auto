import Image from "next/image";
import Link from "next/link";

import { ContactForm } from "@/app/ui/contact-form";
import { IntelligenceTabs } from "@/app/ui/intelligence-tabs";
import { LangText } from "@/app/ui/lang-text";
import { LanguageToggle } from "@/app/ui/language-toggle";
import { MaskedEmail } from "@/app/ui/masked-email";
import { RefreshButton } from "@/app/ui/refresh-button";
import { RelationshipMap } from "@/app/ui/relationship-map";
import { ThemeToggle } from "@/app/ui/theme-toggle";
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

function toPercent(value: number, max: number): number {
  if (max <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((value / max) * 100)));
}

function toSqrtPercent(value: number, max: number): number {
  if (max <= 0 || value <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((Math.sqrt(value) / Math.sqrt(max)) * 100)));
}

function compactLabel(value: string, max = 24): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1).trimEnd()}\u2026`;
}

function InsightGlyph({ kind }: { kind: "mesh" | "shield" | "chip" | "globe" }) {
  if (kind === "shield") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3 5.5 5.6v5.5c0 4.3 2.7 8.2 6.5 9.8 3.8-1.6 6.5-5.5 6.5-9.8V5.6z" />
        <path d="m9.1 12.3 2 2 3.8-4.5" />
      </svg>
    );
  }

  if (kind === "chip") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="7" y="7" width="10" height="10" rx="2" />
        <path d="M9 1v4M15 1v4M9 19v4M15 19v4M1 9h4M1 15h4M19 9h4M19 15h4" />
      </svg>
    );
  }

  if (kind === "globe") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="8.5" />
        <path d="M3.8 9.5h16.4M3.8 14.5h16.4M12 3.5c2.4 2.2 3.7 5.2 3.7 8.5S14.4 18.3 12 20.5M12 3.5C9.6 5.7 8.3 8.7 8.3 12S9.6 18.3 12 20.5" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="6" cy="12" r="2.5" />
      <circle cx="18" cy="6" r="2.5" />
      <circle cx="18" cy="18" r="2.5" />
      <path d="M8 12h7.5M8 11l7.8-4M8 13l7.8 4" />
    </svg>
  );
}

function HeroPortraitIllustration() {
  return (
    <svg
      className="hero-portrait-svg"
      viewBox="0 0 120 132"
      role="img"
      aria-label="Futuristic AI portrait illustration"
    >
      <defs>
        <linearGradient id="portraitAura" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#79d0ff" />
          <stop offset="100%" stopColor="#3bf2d2" />
        </linearGradient>
        <linearGradient id="portraitCore" x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="#effcff" />
          <stop offset="100%" stopColor="#7fd0ff" />
        </linearGradient>
      </defs>
      <rect x="10" y="10" width="100" height="112" rx="24" className="portrait-frame" />
      <circle cx="60" cy="50" r="26" className="portrait-halo" />
      <path
        d="M60 30c-10.2 0-18 7.9-18 18.2 0 7.9 5.4 14.8 12.8 17.1 3.2 1 7.3 1 10.5 0 7.4-2.3 12.8-9.2 12.8-17.1C78 37.9 70.2 30 60 30Z"
        className="portrait-head"
      />
      <path
        d="M34 104c5.3-18.5 15.7-27.7 26-27.7s20.7 9.2 26 27.7"
        className="portrait-body"
      />
      <path
        d="M28 88c9-4.8 19.7-7.2 32-7.2 12.4 0 23 2.4 32 7.2"
        className="portrait-body accent"
      />
      <path d="M24 22h72M20 48h80M20 74h80M24 100h72" className="portrait-grid" />
      <path d="M24 22v88M48 18v96M72 18v96M96 22v88" className="portrait-grid" />
      <circle cx="60" cy="50" r="29" className="portrait-outline" />
      <path d="M36 108h48" className="portrait-base" />
    </svg>
  );
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
  const areaMax = Math.max(...profile.researchAreas.map((area) => area.score), 1);
  const signalData = [
    { label: "Citations", value: profile.researchMetrics.citations },
    { label: "Publications", value: profile.researchMetrics.publications },
    { label: "Top Projects", value: content.projects.length },
    { label: "Ranked Articles", value: Math.min(content.articles.length, 8) },
    { label: "Top Videos", value: Math.min(content.videos.length, 8) },
  ];
  const signalMax = Math.max(...signalData.map((item) => item.value), 1);
  const patentData = content.patents ?? null;
  const patentStats = patentData?.stats ?? profile.patentStats ?? {
    domestic: { applications: 0, registrations: 0 },
    international: { applications: 0, registrations: 0 },
    yearly: [],
  };
  const patentSummary = [
    {
      label: "Domestic",
      applications: patentStats.domestic.applications,
      registrations: patentStats.domestic.registrations,
    },
    {
      label: "International",
      applications: patentStats.international.applications,
      registrations: patentStats.international.registrations,
    },
  ];
  const patentSummaryMax = Math.max(
    ...patentSummary.map((item) => Math.max(item.applications, item.registrations)),
    1,
  );
  const patentYearly = [...patentStats.yearly].sort((a, b) =>
    a.year.localeCompare(b.year),
  );
  const patentYearlyMax = Math.max(
    ...patentYearly.map((item) => Math.max(item.applications, item.registrations)),
    1,
  );
  const patentRecords = [...(patentData?.records ?? profile.patentRecords ?? [])]
    .sort((a, b) => b.filedAt.localeCompare(a.filedAt))
    .slice(0, 12);
  const patentAssetTotal =
    patentStats.domestic.applications +
    patentStats.domestic.registrations +
    patentStats.international.applications +
    patentStats.international.registrations;
  const heroThemes = profile.interests.slice(0, 4).map((label, index) => ({
    label,
    kind: ["mesh", "shield", "chip", "globe"][index % 4] as
      | "mesh"
      | "shield"
      | "chip"
      | "globe",
  }));
  const heroSignals = [
    {
      label: "h-index",
      value: formatNumber(profile.researchMetrics.hIndex),
      note: `i10: ${formatNumber(profile.researchMetrics.i10Index)}`,
      kind: "mesh" as const,
    },
    {
      label: "Publications",
      value: formatNumber(profile.researchMetrics.publications),
      note: "research outputs",
      kind: "chip" as const,
    },
    {
      label: "Standards",
      value: formatNumber(profile.standardizationActivities.length),
      note: "active tracks",
      kind: "globe" as const,
    },
    {
      label: "Patent Assets",
      value: formatNumber(patentAssetTotal),
      note: "pipeline and grants",
      kind: "shield" as const,
    },
  ];
  const heroOrbitLabels = [
    profile.researchAreas[0]?.name ?? "AI Standardization",
    profile.relatedTechnologies[0] ?? "Generative AI",
    profile.standardizationActivities[0] ?? "ISO/IEC SC 42",
    profile.relatedTechnologies[1] ?? "Trustworthy AI",
  ];
  const credibilitySignals = [
    {
      label: "Institution",
      value: organization,
      note: profile.headline,
      href: profile.website,
      linkLabel: "Open Profile",
      kind: "globe" as const,
    },
    {
      label: "Scholar Impact",
      value: `${formatNumber(profile.researchMetrics.citations)} citations`,
      note: `h-index ${formatNumber(profile.researchMetrics.hIndex)} | i10 ${formatNumber(profile.researchMetrics.i10Index)}`,
      href: profile.googleScholarUrl,
      linkLabel: "Scholar",
      kind: "mesh" as const,
    },
    {
      label: "GitHub Profile",
      value: profile.githubUsername,
      note: `${formatNumber(content.projects.length)} ranked repositories`,
      href: `https://github.com/${profile.githubUsername}`,
      linkLabel: "GitHub",
      kind: "chip" as const,
    },
  ];

  return (
    <main className="page">
      <section className="hero card">
        <div className="hero-copy">
          <div className="hero-topline">
            <p className="eyebrow">
              <LangText ko="IT 전문가 프로파일" en="IT Expert Profile" inline />
            </p>
            <div className="topline-controls">
              <LanguageToggle />
              <ThemeToggle />
            </div>
          </div>
          <h1>{profile.name}</h1>
          <p className="name-local">
            {profile.localName} · {organization}
          </p>
          <p className="headline">{profile.headline}</p>
          <div className="profile-narrative">
            <p className="profile-paragraph ko">{profile.introKo}</p>
            <p className="profile-paragraph en">{profile.introEn}</p>
          </div>
          <div className="hero-interest-row">
            {heroThemes.map((theme) => (
              <span key={theme.label} className="hero-interest-pill">
                <span className="hero-interest-icon">
                  <InsightGlyph kind={theme.kind} />
                </span>
                {theme.label}
              </span>
            ))}
          </div>
          <div className="meta">
            <span>{profile.location}</span>
            <MaskedEmail email={profile.email} />
            <Link href={profile.website} target="_blank">
              Website
            </Link>
          </div>
          <div className="actions">
            {adminAuthenticated ? <RefreshButton /> : null}
            {profile.resumeUrl ? (
              <Link className="button" href={profile.resumeUrl} target="_blank" download>
                Download CV
              </Link>
            ) : null}
            <Link
              className="button secondary"
              href={adminAuthenticated || !authEnabled ? "/admin" : "/admin/login"}
            >
              {adminAuthenticated || !authEnabled ? "Manage Profile" : "Admin Login"}
            </Link>
          </div>
          <p className="updated">Last refresh: {formatDate(content.updatedAt)}</p>
        </div>
        <div className="hero-visual" aria-hidden="true">
          <div className="hero-visual-frame">
            <div className="hero-panel-head">
              <span className="panel-badge">AI SIGNAL MAP</span>
              <span className="panel-status">LIVE PROFILE</span>
            </div>
            <div className="hero-orbit">
              <svg className="hero-mesh" viewBox="0 0 520 360">
                <defs>
                  <linearGradient id="heroLine" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#76c8ff" />
                    <stop offset="100%" stopColor="#39f5d1" />
                  </linearGradient>
                </defs>
                <rect x="0" y="0" width="520" height="360" rx="24" fill="transparent" />
                <circle cx="260" cy="180" r="124" className="hero-ring" />
                <circle cx="260" cy="180" r="86" className="hero-ring inner" />
                <path
                  d="M164 102c32 18 63 28 96 28s64-10 96-28"
                  className="hero-path"
                  stroke="url(#heroLine)"
                />
                <path
                  d="M148 242c44-18 81-28 112-28s68 10 112 28"
                  className="hero-path"
                  stroke="url(#heroLine)"
                />
                <path
                  d="M188 84c-19 40-28 72-28 96s9 56 28 96"
                  className="hero-path soft"
                  stroke="url(#heroLine)"
                />
                <path
                  d="M332 84c19 40 28 72 28 96s-9 56-28 96"
                  className="hero-path soft"
                  stroke="url(#heroLine)"
                />
                <circle cx="260" cy="180" r="14" className="hero-node center" />
                <circle cx="260" cy="56" r="10" className="hero-node" />
                <circle cx="384" cy="180" r="10" className="hero-node" />
                <circle cx="260" cy="304" r="10" className="hero-node" />
                <circle cx="136" cy="180" r="10" className="hero-node" />
                <circle cx="177" cy="97" r="8" className="hero-node accent" />
                <circle cx="343" cy="97" r="8" className="hero-node accent" />
                <circle cx="177" cy="263" r="8" className="hero-node accent" />
                <circle cx="343" cy="263" r="8" className="hero-node accent" />
              </svg>
              <div className="hero-portrait-card">
                <div className="hero-portrait-art">
                  <HeroPortraitIllustration />
                </div>
                <div className="hero-portrait-copy">
                  <p>{profile.name}</p>
                  <span>{profile.researchSummary}</span>
                </div>
              </div>
              <div className="hero-core">
                <span>AI Standardization</span>
                <strong>{organization}</strong>
              </div>
              {heroOrbitLabels.map((label, index) => (
                <div
                  key={`${label}-${index}`}
                  className={`hero-float hero-float-${String.fromCharCode(97 + index)}`}
                >
                  {compactLabel(label, 26)}
                </div>
              ))}
            </div>
            <div className="hero-stat-grid">
              {heroSignals.map((signal) => (
                <article key={signal.label} className="hero-signal-card">
                  <span className="hero-signal-icon">
                    <InsightGlyph kind={signal.kind} />
                  </span>
                  <div>
                    <p className="hero-signal-label">{signal.label}</p>
                    <strong className="hero-signal-value">{signal.value}</strong>
                    <span className="hero-signal-note">{signal.note}</span>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="credibility-strip" aria-label="Professional credibility signals">
        {credibilitySignals.map((item) => (
          <article key={item.label} className="cred-card">
            <span className="cred-icon">
              <InsightGlyph kind={item.kind} />
            </span>
            <div className="cred-copy">
              <p className="cred-label">{item.label}</p>
              <strong className="cred-value">{item.value}</strong>
              <p className="cred-note">{item.note}</p>
            </div>
            {item.href && item.linkLabel ? (
              <Link className="cred-link" href={item.href} target="_blank">
                {item.linkLabel}
              </Link>
            ) : (
              <span className="cred-link passive">Verified</span>
            )}
          </article>
        ))}
      </section>

      <section className="card research-dashboard">
        <div className="section-header">
          <h2>
            <LangText ko="연구 인텔리전스 대시보드" en="Research Intelligence Dashboard" />
          </h2>
          <div className="actions">
            {profile.googleScholarUrl ? (
              <Link className="button secondary" href={profile.googleScholarUrl} target="_blank">
                Google Scholar
              </Link>
            ) : null}
            <Link className="button secondary" href={profile.website} target="_blank">
              Professional Profile
            </Link>
          </div>
        </div>
        <p className="hint">{profile.researchSummary}</p>

        <div className="metrics-grid">
          <article className="metric-card">
            <p className="metric-label">Citations</p>
            <p className="metric-value">{formatNumber(profile.researchMetrics.citations)}</p>
          </article>
          <article className="metric-card">
            <p className="metric-label">h-index</p>
            <p className="metric-value">{formatNumber(profile.researchMetrics.hIndex)}</p>
          </article>
          <article className="metric-card">
            <p className="metric-label">i10-index</p>
            <p className="metric-value">{formatNumber(profile.researchMetrics.i10Index)}</p>
          </article>
          <article className="metric-card">
            <p className="metric-label">Publications</p>
            <p className="metric-value">{formatNumber(profile.researchMetrics.publications)}</p>
          </article>
        </div>

        <div className="research-viz-grid graph-grid">
          <RelationshipMap
            centerLabel={profile.localName || profile.name}
            researchAreas={profile.researchAreas}
            relatedTechnologies={profile.relatedTechnologies}
            standardizationActivities={profile.standardizationActivities}
            articles={content.articles}
            patentRecords={patentRecords}
          />

          <article className="viz-card">
            <h3>Research Domain Strength</h3>
            <div className="domain-chart">
              {profile.researchAreas.map((area) => (
                <div key={area.name} className="domain-row">
                  <div className="domain-head">
                    <span>{area.name}</span>
                    <span>{area.score}</span>
                  </div>
                  <div className="domain-track">
                    <span
                      className="domain-fill"
                      style={{ width: `${toPercent(area.score, areaMax)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </article>
        </div>

        <div className="research-viz-grid three">
          <article className="viz-card">
            <h3>Research Signals</h3>
            <div className="signal-chart">
              {signalData.map((item) => (
                <div key={item.label} className="signal-column">
                  <span
                    className="signal-bar"
                    style={{ height: `${Math.max(10, toSqrtPercent(item.value, signalMax))}%` }}
                  />
                  <span className="signal-value">{formatNumber(item.value)}</span>
                  <span className="signal-label">{item.label}</span>
                </div>
              ))}
            </div>
          </article>

          <article className="viz-card">
            <h3>Related Technologies</h3>
            <div className="tech-cloud">
              {profile.relatedTechnologies.map((tech, index) => {
                const emphasis = 1 + (index % 4) * 0.12;
                return (
                  <span key={tech} className="tech-pill" style={{ fontSize: `${emphasis}rem` }}>
                    {tech}
                  </span>
                );
              })}
            </div>
          </article>

          <article className="viz-card">
            <h3>Standardization Activities</h3>
            <div className="standards-list">
              {profile.standardizationActivities.map((activity, index) => (
                <div key={activity} className="standard-item">
                  <span className="standard-index">{String(index + 1).padStart(2, "0")}</span>
                  <span>{activity}</span>
                </div>
              ))}
            </div>
          </article>
        </div>
      </section>

      <section className="card patent-dashboard">
        <div className="section-header">
          <h2>
            <LangText ko="국내외 특허 출원/등록 현황" en="Domestic and Global Patent Status" />
          </h2>
          <span className="tag">
            <LangText ko="특허 포트폴리오" en="Patent Portfolio" inline />
          </span>
        </div>
        <p className="hint">
          {patentData ? (
            <>
              Source: {patentData.source.provider} | Query: {patentData.source.query} | Checked:{" "}
              {formatDate(patentData.checkedAt)}
            </>
          ) : (
            "No live patent search data yet. Run refresh to fetch from Google Patents."
          )}
        </p>

        <div className="patent-summary-grid">
          {patentSummary.map((item) => (
            <article key={item.label} className="patent-summary-card">
              <p className="metric-label">{item.label}</p>
              <div className="patent-metric-row">
                <span>출원</span>
                <strong>{formatNumber(item.applications)}</strong>
              </div>
              <div className="patent-track">
                <span
                  className="patent-fill applications"
                  style={{ width: `${toPercent(item.applications, patentSummaryMax)}%` }}
                />
              </div>
              <div className="patent-metric-row">
                <span>등록</span>
                <strong>{formatNumber(item.registrations)}</strong>
              </div>
              <div className="patent-track">
                <span
                  className="patent-fill registrations"
                  style={{ width: `${toPercent(item.registrations, patentSummaryMax)}%` }}
                />
              </div>
            </article>
          ))}
        </div>

        <div className="patent-yearly-chart">
          {patentYearly.map((item) => (
            <article key={item.year} className="patent-year-card">
              <p className="item-meta">{item.year}</p>
              <div className="patent-year-bars">
                <span
                  className="patent-bar applications"
                  style={{ height: `${Math.max(10, toSqrtPercent(item.applications, patentYearlyMax))}%` }}
                />
                <span
                  className="patent-bar registrations"
                  style={{ height: `${Math.max(10, toSqrtPercent(item.registrations, patentYearlyMax))}%` }}
                />
              </div>
              <p className="patent-year-values">
                A {formatNumber(item.applications)} / R {formatNumber(item.registrations)}
              </p>
            </article>
          ))}
        </div>

        <h3 className="patent-record-title">
          <LangText ko="특허 목록" en="Patent Records" />
        </h3>
        <div className="patent-record-grid">
          {patentRecords.length === 0 ? (
            <p className="empty">No patent records from live search yet.</p>
          ) : (
            patentRecords.map((item) => (
              <article
                key={`${item.patentNumber}-${item.filedAt}`}
                className="patent-record-item"
              >
                <p className="item-meta">
                  {item.region} | {item.status} | {item.patentNumber}
                </p>
                <h3>
                  {item.sourceUrl ? (
                    <Link href={item.sourceUrl} target="_blank">
                      {item.title}
                    </Link>
                  ) : (
                    item.title
                  )}
                </h3>
                {item.inventors ? <p className="item-meta">Inventor: {item.inventors}</p> : null}
                {item.assignee ? <p className="item-meta">Assignee: {item.assignee}</p> : null}
                <p className="item-meta">Filed: {formatDate(item.filedAt)}</p>
              </article>
            ))
          )}
        </div>
      </section>

      <section className="card spotlight content-section highlight-section">
        <div className="section-header">
          <h2>
            <LangText ko="전문가 하이라이트" en="Professional Highlights" />
          </h2>
          <span className="tag">
            <LangText ko="검증 링크" en="Verified Links" inline />
          </span>
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
                <LangText ko="관련 링크 보기" en="View Reference" inline />
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="card content-section intelligence-briefing">
        <div className="section-header">
          <h2>
            <LangText ko="인텔리전스 브리핑" en="Intelligence Briefing" />
          </h2>
          <span className="tag">
            <LangText ko="탭형 개요" en="Tabbed Overview" inline />
          </span>
        </div>
        <p className="hint">
          Switch between curated articles, ranked videos, and photo highlights without leaving
          the main narrative flow.
        </p>
        <IntelligenceTabs
          articles={content.articles.slice(0, 8)}
          videos={content.videos.slice(0, 8)}
          photos={content.photos}
        />
      </section>

      <section className="card content-section refresh-section">
        <h2>
          <LangText ko="갱신 상태" en="Refresh Status" />
        </h2>
        <p className="hint">
          Cached now: articles {status.counts.articles}, videos {status.counts.videos},
          photos {status.counts.photos}, projects {status.counts.projects}, patents{" "}
          {status.counts.patents}
        </p>
        {status.recentRuns[0] ? (
          <p className="hint">
            Latest run: {status.recentRuns[0].success ? "success" : "failed"} |{" "}
            {status.recentRuns[0].trigger} | {formatDate(status.recentRuns[0].completedAt)}
          </p>
        ) : (
          <p className="hint">No refresh logs yet.</p>
        )}
      </section>

      <section className="card content-section projects-section">
        <h2>
          <LangText ko={`GitHub 프로젝트 (${profile.githubUsername})`} en={`GitHub Projects (${profile.githubUsername})`} />
        </h2>
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
        <h2>
          <LangText
            ko={`사진 (Google Photos 키워드: "${profile.googlePhotos.filterKeyword}")`}
            en={`Photos (Google Photos keyword: "${profile.googlePhotos.filterKeyword}")`}
          />
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

      <section className="card contact-section">
        <div className="section-header">
          <h2>
            <LangText ko="연락하기" en="Contact" />
          </h2>
          <span className="tag">
            <LangText ko="메시지 보내기" en="Send a Message" inline />
          </span>
        </div>
        <p className="hint">
          <LangText
            ko="질문, 협업 제안, 또는 연구 관련 문의를 남겨주세요."
            en="Leave a question, collaboration proposal, or research inquiry."
            inline
          />
        </p>
        <ContactForm />
      </section>

      <section className="card">
        <h2>
          <LangText ko="링크" en="Links" />
        </h2>
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



