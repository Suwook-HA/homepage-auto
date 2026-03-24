import Link from "next/link";
import type { Metadata } from "next";

import { ContactForm } from "@/app/ui/contact-form";
import { LangText } from "@/app/ui/lang-text";
import { MaskedEmail } from "@/app/ui/masked-email";
import { readProfile } from "@/lib/store";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Contact | Ha Suwook",
  description: "Get in touch for research collaborations, standardization discussions, or general inquiries.",
};

export default async function ContactPage() {
  const profile = await readProfile();

  return (
    <div className="page-wrapper">
      <section className="section">
        <span className="section-label">
          <LangText ko="연락하기" en="Get in Touch" inline />
        </span>
        <h1 style={{ fontSize: "2rem", fontWeight: 800, marginBottom: 6 }}>
          Contact
        </h1>
        <p style={{ color: "var(--muted)", marginBottom: 48, maxWidth: 560 }}>
          <LangText
            ko="연구 협력, 표준화 논의, 미디어 문의 등 모든 연락을 환영합니다."
            en="Open to research collaborations, standardization discussions, and media inquiries."
            inline
          />
        </p>

        <div
          style={{
            display: "grid",
            gap: 48,
            gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.6fr)",
          }}
        >
          {/* ── Contact Info ── */}
          <div>
            <h2 style={{ marginBottom: 24 }}>
              <LangText ko="연락처" en="Contact Info" />
            </h2>
            <div style={{ display: "grid", gap: 20 }}>
              <div>
                <p
                  style={{
                    fontSize: "0.72rem",
                    fontFamily: "var(--mono)",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    color: "var(--muted)",
                    marginBottom: 6,
                  }}
                >
                  Email
                </p>
                <MaskedEmail email={profile.email} />
              </div>

              <div>
                <p
                  style={{
                    fontSize: "0.72rem",
                    fontFamily: "var(--mono)",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    color: "var(--muted)",
                    marginBottom: 6,
                  }}
                >
                  Location
                </p>
                <p style={{ fontSize: "0.9rem", color: "var(--ink)" }}>
                  {profile.location}
                </p>
              </div>

              <div>
                <p
                  style={{
                    fontSize: "0.72rem",
                    fontFamily: "var(--mono)",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    color: "var(--muted)",
                    marginBottom: 6,
                  }}
                >
                  Affiliation
                </p>
                <Link
                  href={profile.website}
                  target="_blank"
                  style={{ fontSize: "0.9rem", color: "var(--primary)" }}
                >
                  {profile.website}
                </Link>
              </div>

              {profile.links.length > 0 && (
                <div>
                  <p
                    style={{
                      fontSize: "0.72rem",
                      fontFamily: "var(--mono)",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                      color: "var(--muted)",
                      marginBottom: 10,
                    }}
                  >
                    Links
                  </p>
                  <div style={{ display: "grid", gap: 8 }}>
                    {profile.links.map((link) => (
                      <Link
                        key={link.url}
                        href={link.url}
                        target="_blank"
                        style={{
                          fontSize: "0.9rem",
                          color: "var(--primary)",
                          fontWeight: 500,
                        }}
                      >
                        {link.label} →
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Contact Form ── */}
          <div>
            <h2 style={{ marginBottom: 24 }}>
              <LangText ko="메시지 보내기" en="Send a Message" />
            </h2>
            <ContactForm />
          </div>
        </div>
      </section>
    </div>
  );
}
