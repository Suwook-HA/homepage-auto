import type { Metadata } from "next";

import { LangText } from "@/app/ui/lang-text";
import { MaskedEmail } from "@/app/ui/masked-email";
import { readProfile } from "@/lib/store";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "About | Ha Suwook",
  description: "Background, career timeline, and skills of Ha Suwook, AI standardization researcher at ETRI.",
};

export default async function AboutPage() {
  const profile = await readProfile();
  const organization = profile.location.split(",")[0]?.trim() ?? "ETRI";

  return (
    <div className="page-wrapper">
      {/* ── BIO ── */}
      <section className="section">
        <span className="section-label">
          <LangText ko="소개" en="About" inline />
        </span>
        <h1 style={{ fontSize: "2rem", fontWeight: 800, marginBottom: 6 }}>
          {profile.name}
        </h1>
        <p
          style={{
            fontSize: "1rem",
            color: "var(--muted)",
            marginBottom: 32,
          }}
        >
          {profile.headline} · {organization}
        </p>

        <div style={{ maxWidth: 720, display: "grid", gap: 14, marginBottom: 40 }}>
          <p className="profile-paragraph ko">{profile.introKo}</p>
          <p className="profile-paragraph en">{profile.introEn}</p>
        </div>

        {/* Contact info */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 10,
            alignItems: "center",
          }}
        >
          <MaskedEmail email={profile.email} />
          <span
            style={{
              fontSize: "0.84rem",
              color: "var(--subtle)",
              fontFamily: "var(--mono)",
            }}
          >
            {profile.location}
          </span>
        </div>
      </section>

      {/* ── CAREER TIMELINE ── */}
      {profile.career.length > 0 && (
        <section className="section">
          <span className="section-label">
            <LangText ko="경력" en="Timeline" inline />
          </span>
          <h2 className="section-title">
            <LangText ko="경력 및 학력" en="Career & Education" />
          </h2>
          <ol className="timeline" style={{ maxWidth: 640 }}>
            {profile.career.map((item, i) => (
              <li key={i} className={`timeline-item tl-${item.type}`}>
                <div className="timeline-dot" />
                <span className="tl-year">{item.year}</span>
                <div className="tl-body">
                  <strong className="tl-title">{item.title}</strong>
                  <span className="tl-org">{item.org}</span>
                  {item.description && (
                    <p className="tl-desc">{item.description}</p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* ── SKILLS ── */}
      {profile.skillCategories.length > 0 && (
        <section className="section">
          <span className="section-label">
            <LangText ko="전문성" en="Expertise" inline />
          </span>
          <h2 className="section-title">
            <LangText ko="기술 스택" en="Skills & Tools" />
          </h2>
          <div style={{ maxWidth: 680 }}>
            {profile.skillCategories.map((cat) => (
              <div key={cat.name} className="skill-group">
                <p className="skill-group-name">{cat.name}</p>
                <div className="skill-chips">
                  {cat.skills.map((skill) => (
                    <span key={skill} className="skill-chip">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── INTERESTS ── */}
      {profile.interests.length > 0 && (
        <section className="section">
          <span className="section-label">
            <LangText ko="관심 분야" en="Interests" inline />
          </span>
          <h2 className="section-title">
            <LangText ko="연구 관심사" en="Research Interests" />
          </h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {profile.interests.map((interest) => (
              <span key={interest} className="tag">
                {interest}
              </span>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
