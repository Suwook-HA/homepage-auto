"use client";

import Link from "next/link";
import { useState } from "react";

import type { ProjectItem } from "@/lib/types";

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(date);
}

function formatNumber(value: number): string {
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
        <div className="project-filter-bar">
          <button
            type="button"
            className={`project-filter-btn${filter === null ? " active" : ""}`}
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
                className={`project-filter-btn${filter === lang ? " active" : ""}`}
                onClick={() => setFilter(lang)}
              >
                {lang} ({count})
              </button>
            );
          })}
        </div>
      )}

      <div className="grid">
        {visible.length === 0 ? (
          <p className="empty">No projects match this filter.</p>
        ) : (
          visible.map((project) => (
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
              {project.updatedAt && (
                <p className="item-meta">updated {formatDate(project.updatedAt)}</p>
              )}
            </article>
          ))
        )}
      </div>

      {visible.length === 0 && projects.length > 0 && (
        <p className="hint" style={{ marginTop: 8 }}>
          Showing {username}&apos;s public repositories on GitHub.
        </p>
      )}
    </>
  );
}
