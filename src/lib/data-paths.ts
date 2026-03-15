import path from "node:path";

const bundledDataDir = path.join(process.cwd(), "data");
const configuredDataDir = (process.env.DATA_DIR ?? "").trim();

export const runtimeDataDir = configuredDataDir
  ? path.resolve(configuredDataDir)
  : bundledDataDir;

export function runtimeDataPath(fileName: string): string {
  return path.join(runtimeDataDir, fileName);
}

export function bundledDataPath(fileName: string): string {
  return path.join(bundledDataDir, fileName);
}
