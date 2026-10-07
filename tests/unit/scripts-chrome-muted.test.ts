import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function scriptFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) return scriptFiles(file);
    return /\.(?:ts|mts|cts|js|mjs|cjs|sh)$/.test(entry.name) ? [file] : [];
  });
}

describe("Chrome launches in scripts", () => {
  it("mutes every headless Chrome so browser runs make no sound", () => {
    const launching = scriptFiles("scripts").filter((file) =>
      readFileSync(file, "utf8").includes("--headless"),
    );
    const unmuted = launching.filter(
      (file) => !readFileSync(file, "utf8").includes("--mute-audio"),
    );

    expect(launching.length).toBeGreaterThan(0);
    expect(unmuted).toEqual([]);
  });
});
