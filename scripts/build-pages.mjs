import { cp, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");
const dist = path.join(root, "pages-dist");

async function ensureDir(dir) {
  await mkdir(dir, { recursive: true });
}

async function build() {
  await rm(dist, { recursive: true, force: true });
  await ensureDir(dist);
  await ensureDir(path.join(dist, "data"));

  await cp(path.join(root, "site", "index.html"), path.join(dist, "index.html"));
  await cp(path.join(root, "site", "style.css"), path.join(dist, "style.css"));
  await cp(path.join(root, "site", "app.js"), path.join(dist, "app.js"));

  const files = [
    "profile.json",
    "content.json",
    "promotion-highlights.json",
    "refresh-log.json",
  ];

  for (const file of files) {
    await cp(path.join(root, "data", file), path.join(dist, "data", file));
  }

  console.log("Built GitHub Pages artifact at:", dist);
}

build().catch((error) => {
  console.error(error);
  process.exit(1);
});
