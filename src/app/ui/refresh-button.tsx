"use client";

import { useState } from "react";

export function RefreshButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleRefresh() {
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch("/api/refresh?trigger=manual", { method: "POST" });
      if (res.status === 401) {
        setError("Admin session required.");
        return;
      }
      if (!res.ok) {
        throw new Error("refresh_failed");
      }
      window.location.reload();
    } catch {
      setError("Refresh request failed.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div>
      <button className="button" onClick={handleRefresh} disabled={isLoading}>
        {isLoading ? "Refreshing..." : "Refresh now"}
      </button>
      {error ? <p className="error">{error}</p> : null}
    </div>
  );
}
