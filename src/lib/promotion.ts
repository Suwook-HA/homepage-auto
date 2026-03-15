import { readFile } from "node:fs/promises";
import path from "node:path";

import type { PromotionData, PromotionHighlight } from "@/lib/types";

const promotionPath = path.join(process.cwd(), "data", "promotion-highlights.json");

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

export async function readPromotionData(): Promise<PromotionData> {
  try {
    const raw = await readFile(promotionPath, "utf8");
    const parsed = JSON.parse(raw) as PromotionData;
    const highlights = Array.isArray(parsed.highlights)
      ? parsed.highlights.map((item) => normalizeHighlight(item))
      : [];

    return {
      updatedAt: parsed.updatedAt ?? new Date().toISOString().slice(0, 10),
      highlights,
    };
  } catch {
    return {
      updatedAt: new Date().toISOString().slice(0, 10),
      highlights: [],
    };
  }
}
