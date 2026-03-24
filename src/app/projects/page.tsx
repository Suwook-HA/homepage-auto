import Link from "next/link";
import type { Metadata } from "next";

import { LangText } from "@/app/ui/lang-text";
import { ProjectsSection } from "@/app/ui/projects-section";
import { getHomepageData } from "@/lib/refresh";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Projects | Ha Suwook",
  description: "Open source GitHub repositories.",
};

export default async function ProjectsPage() {
  const [profile, content] = await getHomepageData();

  return (
    <div className="page-wrapper">
      <section className="section">
        <span className="section-label">
          <LangText ko="오픈 소스" en="Open Source" inline />
        </span>
        <h1 style={{ fontSize: "2rem", fontWeight: 800, marginBottom: 6 }}>
          <LangText ko="GitHub 프로젝트" en="GitHub Projects" />
        </h1>
        <p style={{ color: "var(--muted)", marginBottom: 36 }}>
          Public repositories from{" "}
          <Link
            href={`https://github.com/${profile.githubUsername}`}
            target="_blank"
            style={{ color: "var(--primary)", fontWeight: 600 }}
          >
            @{profile.githubUsername}
          </Link>
        </p>

        {content.projects.length === 0 ? (
          <p className="empty">No projects fetched yet. Run refresh from the admin panel.</p>
        ) : (
          <ProjectsSection
            projects={content.projects}
            username={profile.githubUsername}
          />
        )}
      </section>
    </div>
  );
}
