import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

export const BROWSER_RELEASE_SOURCE_PATHS_V7 = Object.freeze([
  "scripts/browser-smoke-v7.ts",
  "src/main.ts",
  "src/app/browser-routing.ts",
  "src/app/v7-controller.ts",
  "src/assets/generated-art-manifest.ts",
  "src/assets/ruleset7-ui-art.ts",
  "src/engine/v7/reducer.ts",
  "src/engine/v7/replay.ts",
  "src/persistence/v7.ts",
  "src/render/canvas/board-renderer-v7.ts",
  "src/render/dom/app-view-v7.ts",
  "src/styles/main.css",
] as const);

export function browserReleaseRuntimeFingerprintV7(root: string): string {
  const hash = createHash("sha256");
  for (const relativePath of BROWSER_RELEASE_SOURCE_PATHS_V7) {
    const bytes = readFileSync(path.join(root, relativePath));
    hash.update(`${relativePath}\0${bytes.length}\0`);
    hash.update(bytes);
  }
  return hash.digest("hex");
}
