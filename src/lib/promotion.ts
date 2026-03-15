import { readFile } from "node:fs/promises";

import { bundledDataPath, runtimeDataPath } from "@/lib/data-paths";
import type { PromotionData, PromotionHighlight } from "@/lib/types";

const runtimePromotionPath = runtimeDataPath("promotion-highlights.json");
const bundledPromotionPath = bundledDataPath("promotion-highlights.json");

function normalizeHighlight(raw: PromotionHighlight): PromotionHighlight {
  return {
    id: raw.id,
    title: raw.title,
    summary: raw.summary,
    impact: raw.impact,
    sourceName: raw.sourceName,
    sourceUrl: raw.sourceUrl,
    date: raw.date,
  };
}

async function readPromotionJson(): Promise<PromotionData | null> {
  try {
    const raw = await readFile(runtimePromotionPath, "utf8");
    return JSON.parse(raw) as PromotionData;
  } catch {
    // Fallback to bundled data if runtime data file is missing.
  }

  try {
    const raw = await readFile(bundledPromotionPath, "utf8");
    return JSON.parse(raw) as PromotionData;
  } catch {
    return null;
  }
}

export async function readPromotionData(): Promise<PromotionData> {
  const parsed = await readPromotionJson();
  if (!parsed) {
    return {
      updatedAt: new Date().toISOString().slice(0, 10),
      highlights: [],
    };
  }

  const highlights = Array.isArray(parsed.highlights)
    ? parsed.highlights.map((item) => normalizeHighlight(item))
    : [];

  return {
    updatedAt: parsed.updatedAt ?? new Date().toISOString().slice(0, 10),
    highlights,
  };
}
