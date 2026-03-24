import Link from "next/link";
import type { Metadata } from "next";

import { LangText } from "@/app/ui/lang-text";
import { getHomepageData } from "@/lib/refresh";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Patents | Ha Suwook",
  description: "Domestic and international patent portfolio.",
};

function fmt(n: number) {
  return new Intl.NumberFormat("en-US").format(n);
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(d);
}

function toPercent(value: number, max: number) {
  if (max <= 0) return 0;
  return Math.min(100, Math.round((value / max) * 100));
}

export default async function PatentsPage() {
  const [profile, content] = await getHomepageData();
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

  const max = Math.max(
    ...patentSummary.map((p) => Math.max(p.applications, p.registrations)),
    1,
  );

  const patentRecords = [
    ...(patentData?.records ?? profile.patentRecords ?? []),
  ]
    .sort((a, b) => b.filedAt.localeCompare(a.filedAt))
    .slice(0, 12);

  return (
    <div className="page-wrapper">
      {/* ── HEADER ── */}
      <section className="section">
        <span className="section-label">
          <LangText ko="IP 포트폴리오" en="IP Portfolio" inline />
        </span>
        <h1 style={{ fontSize: "2rem", fontWeight: 800, marginBottom: 6 }}>
          <LangText ko="특허 현황" en="Patent Status" />
        </h1>
        {patentData ? (
          <p
            style={{
              color: "var(--subtle)",
              fontSize: "0.84rem",
              fontFamily: "var(--mono)",
              marginBottom: 40,
            }}
          >
            Source: {patentData.source.provider} · Query:{" "}
            {patentData.source.query}
          </p>
        ) : (
          <p style={{ color: "var(--subtle)", marginBottom: 40, fontSize: "0.9rem" }}>
            No live patent data yet. Run refresh from the admin panel.
          </p>
        )}

        <div className="patent-summary-grid">
          {patentSummary.map((item) => (
            <div key={item.label} className="patent-card">
              <p className="patent-card-label">{item.label}</p>

              <div className="patent-row">
                <span>Applications</span>
                <strong>{fmt(item.applications)}</strong>
              </div>
              <div className="patent-track">
                <div
                  className="patent-fill applications"
                  style={{ width: `${toPercent(item.applications, max)}%` }}
                />
              </div>

              <div className="patent-row">
                <span>Registrations</span>
                <strong>{fmt(item.registrations)}</strong>
              </div>
              <div className="patent-track">
                <div
                  className="patent-fill registrations"
                  style={{ width: `${toPercent(item.registrations, max)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── PATENT RECORDS ── */}
      <section className="section">
        <h2 className="section-title">
          <LangText ko="특허 목록" en="Patent Records" />
        </h2>
        {patentRecords.length === 0 ? (
          <p className="empty">
            No patent records yet. Run refresh to fetch from Google Patents.
          </p>
        ) : (
          <div className="item-list">
            {patentRecords.map((item) => (
              <article
                key={`${item.patentNumber}-${item.filedAt}`}
                className="item-card"
              >
                <p className="item-meta">
                  {item.region} · {item.status} · {item.patentNumber}
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
                <p style={{ fontSize: "0.82rem" }}>
                  Filed: {fmtDate(item.filedAt)}
                </p>
                {item.inventors && (
                  <p className="item-meta">Inventors: {item.inventors}</p>
                )}
                {item.assignee && (
                  <p className="item-meta">Assignee: {item.assignee}</p>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
