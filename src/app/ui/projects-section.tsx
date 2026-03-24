"use client";

import Link from "next/link";
import { useState } from "react";

import type { ProjectItem } from "@/lib/types";

function fmtDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(date);
}

function fmtNum(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

type Props = {
  projects: ProjectItem[];
  username: string;
};

export function ProjectsSection({ projects, username }: Props) {
  const languages = Array.from(
    new Set(projects.map((p) => p.language).filter(Boolean)),
  ).sort();

  const [filter, setFilter] = useState<string | null>(null);
  const visible = filter ? projects.filter((p) => p.language === filter) : projects;

  return (
    <>
      {languages.length > 1 && (
        <div className="filter-bar">
          <button
            type="button"
            className={`filter-btn${filter === null ? " active" : ""}`}
            onClick={() => setFilter(null)}
          >
            All ({projects.length})
          </button>
          {languages.map((lang) => {
            const count = projects.filter((p) => p.language === lang).length;
            return (
              <button
                key={lang}
                type="button"
                className={`filter-btn${filter === lang ? " active" : ""}`}
                onClick={() => setFilter(lang)}
              >
                {lang} ({count})
              </button>
            );
          })}
        </div>
      )}

      {visible.length === 0 ? (
        <p className="empty">No projects match this filter.</p>
      ) : (
        <div className="item-grid">
          {visible.map((project) => (
            <article key={project.id} className="item-card">
              <p className="item-meta">
                {project.language}
                {" · "}★ {fmtNum(project.stars)}
                {" · "}⑂ {fmtNum(project.forks)}
              </p>
              <h3>
                <Link href={project.url} target="_blank">
                  {project.name}
                </Link>
              </h3>
              {project.description && <p>{project.description}</p>}
              {project.updatedAt && (
                <p className="item-meta" style={{ marginTop: 8 }}>
                  Updated {fmtDate(project.updatedAt)}
                </p>
              )}
            </article>
          ))}
        </div>
      )}

      {visible.length > 0 && (
        <p
          className="hint"
          style={{ marginTop: 16 }}
        >
          Showing {username}&apos;s public repositories on GitHub.
        </p>
      )}
    </>
  );
}
