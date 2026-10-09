import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

// The test tiers (`pulp_wars-bwry`): whole-game simulations live only in
// `*.sim.test.ts` files, which `npm test` and `npm run test:unit` leave out
// and `npm run test:sim` runs when the user asks. This guard keeps the
// match runners out of every other test file and of the local `*.shared.ts`
// helper modules they import.

const root = join(import.meta.dirname, "..", "..");

/** Entry points that play a whole match, or drive the Normal AI through one. */
const MATCH_RUNNERS = [
  // src/headless
  "runAiMatch",
  "runAiMatchV6",
  "runAiMatchV7",
  "runAiBatch",
  "runAiBatchV6",
  "runAiBatchV7",
  "runMartianMobilityProbeMatchV7",
  // tests/fixtures
  "runShowcaseHeadlessMatchV7",
  "runBreakthroughLabV7",
  "missionWinFixtureV7",
  "missionLossFixtureV7",
  "missionNearWinSaveV7",
  "missionWonSaveV7",
  "missionLostSaveV7",
] as const;

function files(directory: string): string[] {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    return statSync(path).isDirectory() ? files(path) : [path];
  });
}

const routine = files(join(root, "tests"))
  .map((path) => relative(root, path))
  .filter(
    (path) =>
      (path.endsWith(".test.ts") && !path.endsWith(".sim.test.ts")) ||
      path.endsWith(".shared.ts"),
  )
  .sort();

describe("test tiers", () => {
  it("finds the routine test files and the simulation files", () => {
    expect(routine.length).toBeGreaterThan(400);
    expect(routine).toContain("tests/unit/test-tiers.test.ts");
    expect(
      files(join(root, "tests")).filter((path) => path.endsWith(".sim.test.ts"))
        .length,
    ).toBeGreaterThan(0);
  });

  it("keeps every match runner and the headless CLI out of routine tests", () => {
    const pattern = new RegExp(`\\b(${MATCH_RUNNERS.join("|")})\\b`);
    const offenders = routine
      .filter((path) => path !== "tests/unit/test-tiers.test.ts")
      .flatMap((path) => {
        const text = readFileSync(join(root, path), "utf8");
        const runner = pattern.exec(text)?.[1];
        const cli =
          /\bexec(File)?Sync\b|\bspawn(Sync)?\b/.test(text) &&
          text.includes("src/headless/cli.ts");
        return [
          ...(runner === undefined ? [] : [`${path}: ${runner}`]),
          ...(cli ? [`${path}: the headless CLI`] : []),
        ];
      });
    expect(offenders).toEqual([]);
  });

  it("leaves the simulation files out of the default tier", () => {
    const config = readFileSync(join(root, "vite.config.ts"), "utf8");
    expect(config).toContain(
      'const SIMULATION_TESTS = "tests/**/*.sim.test.ts"',
    );
    const scripts = (
      JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as {
        readonly scripts: Readonly<Record<string, string>>;
      }
    ).scripts;
    expect(scripts["test:sim"]).toBe("PULP_WARS_TEST_TIER=sim vitest run");
    expect(scripts["test:unit"]).toBe("vitest run");
    expect(scripts.check).toContain("npm run test:unit");
    expect(scripts.check).not.toContain("test:sim");
    expect(scripts["check:full"]).toBe("npm run check && npm run test:sim");
  });
});
