import { refreshContent } from "@/lib/refresh";

declare global {
  var __homepageSchedulerStarted: boolean | undefined;
}

export function startLocalScheduler() {
  if (process.env.ENABLE_LOCAL_SCHEDULER !== "true") {
    return;
  }

  if (global.__homepageSchedulerStarted) {
    return;
  }

  global.__homepageSchedulerStarted = true;
  const intervalMinutes = Number(process.env.SCHEDULER_INTERVAL_MINUTES ?? "180");
  const intervalMs = Math.max(15, intervalMinutes) * 60_000;

  refreshContent({ force: true, trigger: "scheduler" }).catch(() => undefined);
  setInterval(() => {
    refreshContent({ force: true, trigger: "scheduler" }).catch(() => undefined);
  }, intervalMs);
}
