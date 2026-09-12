import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  RULESET7_LATE_PUBLIC_VIEW_COMMAND_INDEX,
  RULESET7_LATE_PUBLIC_VIEW_FIXTURE_PATH,
} from "../../scripts/ruleset-v7-late-public-view-contract";

describe("Ruleset 7 browser smoke script", () => {
  it("waits for a fresh complete document and installed controller after reload", () => {
    const source = readFileSync("scripts/browser-smoke-v7.ts", "utf8");

    expect(source.match(/await reloadAndWaitForFreshDocument\(/g)).toHaveLength(
      2,
    );
    expect(
      source.match(/await connection\.send\("Page\.reload"/g),
    ).toHaveLength(1);
    expect(source).toContain("globalThis[${JSON.stringify(marker)}] !== true");
    expect(source).toContain("performance.timeOrigin !==");
    expect(source).toContain("document.readyState === 'complete'");
    expect(source).toContain(
      "globalThis.__PULP_WARS_APP__?.controller !== undefined",
    );
  });

  it("keeps cold-policy validation synchronized with the active late-view fixture", () => {
    const source = readFileSync("scripts/browser-smoke-v7.ts", "utf8");
    const fixture = JSON.parse(
      readFileSync(RULESET7_LATE_PUBLIC_VIEW_FIXTURE_PATH, "utf8"),
    ) as { readonly commandIndex?: unknown };

    expect(fixture.commandIndex).toBe(RULESET7_LATE_PUBLIC_VIEW_COMMAND_INDEX);
    expect(source).toContain(
      "evidence.commandIndex !== RULESET7_LATE_PUBLIC_VIEW_COMMAND_INDEX",
    );
    expect(source).not.toContain("command-1100");
  });

  it("defaults evidence to a unique temp directory and remains desktop-only", () => {
    const source = readFileSync("scripts/browser-smoke-v7.ts", "utf8");

    expect(source).toContain('process.argv.includes("--archive-evidence")');
    expect(source).toContain(
      'await mkdtemp(path.join(tmpdir(), "pulp-wars-v7-smoke-evidence-"))',
    );
    expect(source).toContain("temporary, untracked");
    expect(source.match(/await capture\(/g)).toHaveLength(2);
    expect(source).not.toContain("Emulation.setDeviceMetricsOverride");
    expect(source).not.toContain("mobile-ai-return-390-dpr2.png");
    expect(source).toContain("await stopBrowser(browser)");
    expect(source).toContain("await rm(userDataFs");
  });
});
