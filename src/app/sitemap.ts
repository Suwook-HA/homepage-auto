import type { MetadataRoute } from "next";

const BASE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");

export default function sitemap(): MetadataRoute.Sitemap {
  const base = BASE_URL || "https://suwook-ha.github.io/homepage-auto";
  return [
    {
      url: base,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
  ];
}
