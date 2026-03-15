import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminForm } from "@/app/admin/ui/admin-form";
import { GooglePhotosPickerPanel } from "@/app/admin/ui/google-photos-picker-panel";
import { LogoutButton } from "@/app/admin/ui/logout-button";
import { isAdminAuthEnabled, isAdminAuthenticated } from "@/lib/admin-auth";
import { getRefreshStatus } from "@/lib/refresh";
import { readProfile } from "@/lib/store";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Admin | Auto Homepage",
};

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default async function AdminPage() {
  const [authEnabled, authenticated] = await Promise.all([
    isAdminAuthEnabled(),
    isAdminAuthenticated(),
  ]);

  if (!authenticated) {
    redirect("/admin/login");
  }

  const [profile, status] = await Promise.all([readProfile(), getRefreshStatus()]);

  return (
    <main className="page">
      <section className="card">
        <div className="section-header">
          <h1>Profile Admin</h1>
          <div className="actions">
            <Link className="button secondary" href="/">
              Back to Home
            </Link>
            {authEnabled ? <LogoutButton /> : null}
          </div>
        </div>
        <p className="hint">
          Saving profile settings will trigger an immediate refresh.
        </p>
        <AdminForm initialProfile={profile} />
      </section>

      <GooglePhotosPickerPanel />

      <section className="card">
        <h2>Refresh Status</h2>
        <p className="hint">
          Last content update:{" "}
          {status.updatedAt ? formatDate(status.updatedAt) : "No update yet"}
        </p>
        <p className="hint">
          Cached now: articles {status.counts.articles}, videos {status.counts.videos},
          photos {status.counts.photos}, projects {status.counts.projects}
        </p>
        <div className="log-list">
          {status.recentRuns.length === 0 ? (
            <p className="empty">No refresh logs yet.</p>
          ) : (
            status.recentRuns.map((item) => (
              <article key={item.id} className="item">
                <p className="item-meta">
                  {item.success ? "SUCCESS" : "FAILED"} | {item.trigger} |{" "}
                  {formatDate(item.completedAt)}
                </p>
                <p>
                  {item.message} ({item.durationMs}ms)
                </p>
                <p className="item-meta">
                  articles {item.counts.articles}, videos {item.counts.videos}, photos{" "}
                  {item.counts.photos}, projects {item.counts.projects ?? 0}
                </p>
              </article>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
