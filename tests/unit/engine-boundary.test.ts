import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const ENGINE_ROOT = join(process.cwd(), "src", "engine");
const FORBIDDEN = [
  /\bwindow\b/,
  /\bdocument\b/,
  /\blocalStorage\b/,
  /\bsessionStorage\b/,
  /\bCanvas(?:RenderingContext2D)?\b/,
  /\bDate\.now\b/,
  /\bperformance\.now\b/,
  /\bsetTimeout\b/,
  /\bIntl\b/,
];

describe("simulation dependency boundary", () => {
  it("contains no DOM, Canvas, storage, locale, or wall-clock dependencies", () => {
    for (const file of sourceFiles(ENGINE_ROOT)) {
      const source = readFileSync(file, "utf8");
      for (const forbidden of FORBIDDEN) {
        expect(
          source,
          `${relative(process.cwd(), file)} matched ${String(forbidden)}`,
        ).not.toMatch(forbidden);
      }
    }
  });
});

function sourceFiles(directory: string): readonly string[] {
  return readdirSync(directory)
    .map((entry) => join(directory, entry))
    .flatMap((entry) =>
      statSync(entry).isDirectory() ? sourceFiles(entry) : [entry],
    )
    .filter((entry) => entry.endsWith(".ts"));
}
