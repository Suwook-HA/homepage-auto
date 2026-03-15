"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

type AuthStatus = {
  configured: boolean;
  connected: boolean;
  hasRefreshToken: boolean;
  oauthUpdatedAt: string | null;
  pickedUpdatedAt: string | null;
  pickedCount: number;
};

type SessionState = {
  sessionId: string;
  pickerUri: string;
  pollIntervalMs: number;
};

function parseDurationToMs(value: string | undefined): number {
  if (!value) return 4000;
  const secMatch = value.match(/^(\d+)(\.\d+)?s$/);
  if (secMatch) {
    return Math.max(2000, Math.floor(Number(secMatch[0].slice(0, -1)) * 1000));
  }
  return 4000;
}

function formatDateTime(input: string | null): string {
  if (!input) return "-";
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function GooglePhotosPickerPanel() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<AuthStatus | null>(null);
  const [session, setSession] = useState<SessionState | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const loadStatus = useCallback(async () => {
    const res = await fetch("/api/google-photos/auth/status", { cache: "no-store" });
    if (!res.ok) {
      throw new Error("Failed to load Google Photos status.");
    }
    const json = (await res.json()) as { ok: boolean; status: AuthStatus };
    setStatus(json.status);
  }, []);

  useEffect(() => {
    loadStatus().catch((error) => {
      setMessage(error instanceof Error ? error.message : "Status load failed.");
    });
  }, [loadStatus]);

  useEffect(() => {
    const connected = searchParams.get("gp_connected");
    const error = searchParams.get("gp_error");
    if (connected === "1") {
      setMessage("Google Photos connected. Start Picker session to import photos.");
      loadStatus().catch(() => undefined);
    } else if (error) {
      setMessage(`Google Photos OAuth error: ${error}`);
    }
  }, [searchParams, loadStatus]);

  async function handleDisconnect() {
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch("/api/google-photos/disconnect", { method: "POST" });
      if (!res.ok) {
        throw new Error("Failed to disconnect.");
      }
      await loadStatus();
      setMessage("Google Photos disconnected.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Disconnect failed.");
    } finally {
      setLoading(false);
    }
  }

  async function handleStartPicker() {
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch("/api/google-photos/picker/session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ maxItemCount: 200 }),
      });

      const json = (await res.json()) as {
        ok: boolean;
        error?: string;
        session?: {
          id: string;
          pickerUri: string;
          pollingConfig?: {
            pollInterval?: string;
          };
        };
      };

      if (!res.ok || !json.ok || !json.session) {
        throw new Error(json.error ?? "Failed to start Picker session.");
      }

      const pollIntervalMs = parseDurationToMs(json.session.pollingConfig?.pollInterval);
      const pickerUrl = json.session.pickerUri.endsWith("/autoclose")
        ? json.session.pickerUri
        : `${json.session.pickerUri}/autoclose`;

      window.open(pickerUrl, "_blank", "width=540,height=760");
      setSession({
        sessionId: json.session.id,
        pickerUri: json.session.pickerUri,
        pollIntervalMs,
      });
      setMessage("Picker opened. Complete selection, then wait for import.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Picker start failed.");
    } finally {
      setLoading(false);
    }
  }

  const checkAndImport = useCallback(async (sessionId: string) => {
    const res = await fetch(`/api/google-photos/picker/session/${sessionId}/import`, {
      method: "POST",
    });
    const json = (await res.json()) as {
      ok: boolean;
      error?: string;
      mediaItemsSet?: boolean;
      imported?: number;
    };
    if (!res.ok || !json.ok) {
      throw new Error(json.error ?? "Import failed.");
    }
    if (!json.mediaItemsSet) {
      return false;
    }

    setMessage(`Imported ${json.imported ?? 0} selected photo(s) from Google Photos.`);
    await loadStatus();
    return true;
  }, [loadStatus]);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;

    const timer = setInterval(() => {
      if (cancelled) return;
      checkAndImport(session.sessionId)
        .then((done) => {
          if (done) {
            setSession(null);
          }
        })
        .catch((error) => {
          setMessage(error instanceof Error ? error.message : "Polling failed.");
          setSession(null);
        });
    }, session.pollIntervalMs);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [session, checkAndImport]);

  const statusText = useMemo(() => {
    if (!status) return "Loading...";
    if (!status.configured) return "Google OAuth config is missing.";
    if (!status.connected) return "Not connected.";
    return "Connected.";
  }, [status]);

  return (
    <section className="card">
      <div className="section-header">
        <h2>Google Photos Picker</h2>
      </div>
      <p className="hint">Status: {statusText}</p>
      <p className="hint">OAuth updated: {formatDateTime(status?.oauthUpdatedAt ?? null)}</p>
      <p className="hint">
        Last import: {formatDateTime(status?.pickedUpdatedAt ?? null)} | picked items:{" "}
        {status?.pickedCount ?? 0}
      </p>

      <div className="actions">
        <a className="button secondary" href="/api/google-photos/oauth/start">
          Connect Google Photos
        </a>
        <button
          className="button"
          type="button"
          onClick={handleStartPicker}
          disabled={!status?.connected || loading}
        >
          {loading ? "Starting..." : "Open Picker"}
        </button>
        <button
          className="button secondary"
          type="button"
          onClick={handleDisconnect}
          disabled={loading}
        >
          Disconnect
        </button>
      </div>

      {session ? (
        <p className="hint">
          Waiting for selection (session {session.sessionId.slice(0, 12)}...).
        </p>
      ) : null}
      {message ? <p className="status">{message}</p> : null}
    </section>
  );
}
