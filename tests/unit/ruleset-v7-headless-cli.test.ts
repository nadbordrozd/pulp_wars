import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  canonicalHash,
  createPlayableGameV7,
  createReplayV7,
} from "../../src/engine/index";
import { setupV7 } from "../fixtures/v7-builders";

interface CliSummary {
  readonly acceptedCommands: number;
  readonly termination: string;
  readonly stateHash: string;
  readonly metrics: { readonly rulesetId: string; readonly setupHash: string };
}

function runCli<T = CliSummary>(...args: readonly string[]): T {
  const output = execFileSync(
    process.execPath,
    [
      resolve("node_modules/tsx/dist/cli.mjs"),
      resolve("src/headless/cli.ts"),
      ...args,
    ],
    { encoding: "utf8", timeout: 20_000 },
  );
  return JSON.parse(output) as T;
}

describe("ruleset-7 revision-3 headless CLI dispatch", () => {
  it("requires the explicit r3 ruleset while preserving the v6 default", () => {
    const defaultResult = runCli(
      "match",
      "--max-commands",
      "1",
      "--max-rounds",
      "5",
    );
    expect(readFileSync("src/headless/cli.ts", "utf8")).toContain(
      'const ruleset = stringArg("--ruleset", "pulp-wars-poc-6")',
    );
    expect(defaultResult.metrics).not.toHaveProperty("rulesetId");

    const result = runCli(
      "match",
      "--ruleset",
      "pulp-wars-poc-7r7",
      "--max-commands",
      "1",
      "--max-rounds",
      "5",
    );
    expect(result).toMatchObject({
      acceptedCommands: 1,
      termination: "COMMAND_CAP",
      metrics: { rulesetId: "pulp-wars-poc-7r7" },
    });
  });

  it("rejects Candy and the incompatible old v7 identity", () => {
    expect(() =>
      runCli(
        "match",
        "--ruleset",
        "pulp-wars-poc-7r7",
        "--factions",
        "original,candy",
        "--max-commands",
        "1",
      ),
    ).toThrow(/ruleset 7 factions must be original/);
    expect(() =>
      runCli("match", "--ruleset", "pulp-wars-poc-7", "--max-commands", "1"),
    ).toThrow(/pulp-wars-poc-7r7/);
  }, 15_000);

  it("defaults to Continents and accepts all map types in match and batch modes", () => {
    const common = [
      "--ruleset",
      "pulp-wars-poc-7r7",
      "--max-commands",
      "1",
      "--max-rounds",
      "5",
    ] as const;
    const defaultMatch = runCli("match", ...common);
    const continents = runCli("match", ...common, "--map-type", "continents");
    const dryLand = runCli("match", ...common, "--map-type", "dry-land");
    expect(defaultMatch.metrics.setupHash).toBe(continents.metrics.setupHash);
    expect(dryLand.metrics.setupHash).not.toBe(continents.metrics.setupHash);

    const batch = runCli<{
      readonly matches: number;
      readonly entries: readonly { readonly mapType: string }[];
    }>(
      "batch",
      ...common,
      "--seeds",
      "0",
      "--ai-counts",
      "1",
      "--modes",
      "rival",
      "--map-types",
      "dry-land,pangea,continents,archipelago,lakes",
    );
    expect(batch.matches).toBe(5);
    expect(batch.entries.map((entry) => entry.mapType)).toEqual([
      "DRY_LAND",
      "PANGEA",
      "CONTINENTS",
      "ARCHIPELAGO",
      "LAKES",
    ]);
  }, 30_000);

  it("dispatches a command-zero v7 replay through canonical playable creation", () => {
    const setup = setupV7(42);
    const created = createPlayableGameV7(setup);
    if (!created.ok) throw new Error(created.error.code);
    const directory = mkdtempSync(join(tmpdir(), "pulp-wars-v7-cli-"));
    const file = join(directory, "replay.json");
    try {
      writeFileSync(file, JSON.stringify(createReplayV7(setup)), "utf8");
      const result = runCli("replay", file);
      expect(result).toMatchObject({
        acceptedCommands: 0,
        stateHash: canonicalHash(created.state),
      });
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
