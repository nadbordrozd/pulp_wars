import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

interface CliSummary {
  readonly acceptedCommands: number;
  readonly termination: string;
  readonly metrics: Record<string, unknown>;
}

interface CliBatchSummary {
  readonly matches: number;
  readonly entries: readonly {
    readonly aiMode: string;
    readonly metrics: { readonly factionsBySeat: readonly string[] };
  }[];
}

function runCli(...args: readonly string[]): CliSummary {
  const output = execFileSync(
    process.execPath,
    [
      resolve("node_modules/tsx/dist/cli.mjs"),
      resolve("src/headless/cli.ts"),
      ...args,
    ],
    { encoding: "utf8", timeout: 20_000 },
  );
  return JSON.parse(output) as CliSummary;
}

describe("ruleset-6 headless CLI dispatch", () => {
  it("defaults match to marked v6 Rival with Original factions", () => {
    const source = readFileSync("src/headless/cli.ts", "utf8");
    expect(source).toContain(
      'const ruleset = stringArg("--ruleset", "pulp-wars-poc-6")',
    );
    expect(source).toContain('mapGenerationRevision: "SPATIAL_ECONOMY"');
    const result = runCli("match", "--max-commands", "1", "--max-rounds", "5");
    expect(result).toMatchObject({
      acceptedCommands: 1,
      termination: "COMMAND_CAP",
      metrics: {
        factionsBySeat: ["ORIGINAL", "ORIGINAL"],
        factionTreesBySeat: ["ORIGINAL_BASELINE", "ORIGINAL_BASELINE"],
        commandCapHits: 1,
      },
    });
    expect(result.metrics).toHaveProperty("researchByFactionTree");
    expect(result.metrics).toHaveProperty("postGenerationPrngHash");
  });

  it("accepts both v6 batch relationship modes with explicit factions", () => {
    const result = runCli(
      "batch",
      "--seeds",
      "0",
      "--ai-counts",
      "1",
      "--modes",
      "rival,cooperative",
      "--factions",
      "original,candy",
      "--max-commands",
      "1",
      "--max-rounds",
      "5",
    ) as unknown as CliBatchSummary;
    expect(result.matches).toBe(2);
    expect(result.entries.map((entry) => entry.aiMode)).toEqual([
      "RIVAL",
      "COOPERATIVE",
    ]);
    expect(result.entries.map((entry) => entry.metrics.factionsBySeat)).toEqual(
      [
        ["ORIGINAL", "CANDY"],
        ["ORIGINAL", "CANDY"],
      ],
    );
  }, 15_000);

  it("dispatches ruleset 5 only when explicitly requested", () => {
    const result = runCli(
      "match",
      "--ruleset",
      "pulp-wars-poc-5",
      "--max-commands",
      "1",
      "--max-rounds",
      "5",
    );
    expect(result).toMatchObject({
      acceptedCommands: 1,
      termination: "COMMAND_CAP",
      metrics: { factionsBySeat: ["ORIGINAL", "ORIGINAL"] },
    });
    expect(result.metrics).toHaveProperty("terrainCounts");
    expect(result.metrics).not.toHaveProperty("researchByFactionTree");
  });
});
