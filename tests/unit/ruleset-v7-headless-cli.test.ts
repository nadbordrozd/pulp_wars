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
      "pulp-wars-poc-7r53",
      "--max-commands",
      "1",
      "--max-rounds",
      "5",
    );
    expect(result).toMatchObject({
      acceptedCommands: 1,
      termination: "COMMAND_CAP",
      metrics: { rulesetId: "pulp-wars-poc-7r53" },
    });
  });

  // The Candy revision (`pulp_wars-jdb.3`): `candy` is a Ruleset 7 faction
  // word; an unknown word is still refused.
  it("accepts Candy and rejects an unknown faction and the incompatible old v7 identity", () => {
    expect(
      runCli<{
        readonly metrics: { readonly factionsBySeat: readonly string[] };
      }>(
        "match",
        "--ruleset",
        "pulp-wars-poc-7r53",
        "--factions",
        "original,Candy",
        "--max-commands",
        "1",
      ).metrics.factionsBySeat,
    ).toEqual(["ORIGINAL", "CANDY"]);
    expect(() =>
      runCli(
        "match",
        "--ruleset",
        "pulp-wars-poc-7r53",
        "--factions",
        "original,elf",
        "--max-commands",
        "1",
      ),
    ).toThrow(
      /ruleset 7 --factions values must be original \(human\), undead, goblin, dinosaur, martian, ice, dwarf, or candy/,
    );
    expect(() =>
      runCli(
        "match",
        "--ruleset",
        "pulp-wars-poc-7r53",
        "--factions",
        "undead",
        "--max-commands",
        "1",
      ),
    ).toThrow(/ruleset 7 --factions must contain exactly 2 seat values/);
    expect(() =>
      runCli("match", "--ruleset", "pulp-wars-poc-7", "--max-commands", "1"),
    ).toThrow(/pulp-wars-poc-7r53/);
  }, 15_000);

  it("accepts seat-ordered Human, Undead, and Goblin factions in match and batch modes", () => {
    const common = [
      "--ruleset",
      "pulp-wars-poc-7r53",
      "--max-commands",
      "1",
      "--max-rounds",
      "5",
    ] as const;
    const match = runCli<{
      readonly metrics: {
        readonly setupHash: string;
        readonly factionsBySeat: readonly string[];
      };
    }>("match", ...common, "--factions", "ORIGINAL,Undead");
    expect(match.metrics.factionsBySeat).toEqual(["ORIGINAL", "UNDEAD"]);
    const alias = runCli<{
      readonly metrics: { readonly setupHash: string };
    }>("match", ...common, "--factions", "human,undead");
    expect(alias.metrics.setupHash).toBe(match.metrics.setupHash);
    // pulp_wars-w5j.1: without --factions the seats play distinct factions
    // in registration order, Human then Undead.
    const defaults = runCli<{
      readonly metrics: { readonly setupHash: string };
    }>("match", ...common);
    expect(defaults.metrics.setupHash).toBe(match.metrics.setupHash);
    // Revision 17: `goblin` is accepted case-insensitively like the others.
    const goblin = runCli<{
      readonly metrics: { readonly factionsBySeat: readonly string[] };
    }>("match", ...common, "--factions", "Goblin,original");
    expect(goblin.metrics.factionsBySeat).toEqual(["GOBLIN", "ORIGINAL"]);
    // Revision 19: `dinosaur` is accepted the same way, in any seat.
    const dinosaur = runCli<{
      readonly metrics: { readonly factionsBySeat: readonly string[] };
    }>("match", ...common, "--factions", "human,Dinosaur");
    expect(dinosaur.metrics.factionsBySeat).toEqual(["ORIGINAL", "DINOSAUR"]);

    // pulp_wars-w5j.1: a repeated faction is refused unless a tool passes
    // --allow-duplicate-factions (the headless and test only mirror option).
    expect(() =>
      runCli(
        "batch",
        ...common,
        "--seeds",
        "0",
        "--ai-counts",
        "3",
        "--factions",
        "undead,original,undead,original",
      ),
    ).toThrow(
      /--factions must give every seat a different faction \(UNDEAD repeats at seats 0, 2\); tools may pass --allow-duplicate-factions/,
    );
    expect(() =>
      runCli("match", ...common, "--factions", "goblin,goblin"),
    ).toThrow(/every seat a different faction/);
    const mirror = runCli<{
      readonly metrics: { readonly factionsBySeat: readonly string[] };
    }>(
      "match",
      ...common,
      "--factions",
      "goblin,goblin",
      "--allow-duplicate-factions",
    );
    expect(mirror.metrics.factionsBySeat).toEqual(["GOBLIN", "GOBLIN"]);
    const batch = runCli<{
      readonly entries: readonly {
        readonly factions: readonly string[];
        readonly metrics: { readonly factionsBySeat: readonly string[] };
      }[];
    }>(
      "batch",
      ...common,
      "--seeds",
      "0",
      "--ai-counts",
      "3",
      "--factions",
      "undead,original,undead,original",
      "--allow-duplicate-factions",
    );
    expect(batch.entries).toHaveLength(1);
    expect(batch.entries[0]?.factions).toEqual([
      "UNDEAD",
      "ORIGINAL",
      "UNDEAD",
      "ORIGINAL",
    ]);
    expect(batch.entries[0]?.metrics.factionsBySeat).toEqual(
      batch.entries[0]?.factions,
    );
    expect(() =>
      runCli(
        "batch",
        ...common,
        "--seeds",
        "0",
        "--ai-counts",
        "1,2",
        "--factions",
        "undead,original",
      ),
    ).toThrow(/--factions with batch requires exactly one --ai-counts value/);
  }, 600_000);

  it("defaults to Continents and accepts all map types in match and batch modes", () => {
    const common = [
      "--ruleset",
      "pulp-wars-poc-7r53",
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
  }, 600_000);

  it("accepts the showcase map type at size 16 only", () => {
    const common = [
      "--ruleset",
      "pulp-wars-poc-7r53",
      "--max-commands",
      "1",
      "--max-rounds",
      "5",
    ] as const;
    // The size defaults to 16 for every seat count.
    const match = runCli(
      "match",
      ...common,
      "--map-type",
      "showcase",
      "--factions",
      "goblin,undead",
    );
    expect(match).toMatchObject({
      acceptedCommands: 1,
      termination: "COMMAND_CAP",
      metrics: { rulesetId: "pulp-wars-poc-7r53" },
    });
    const explicit = runCli(
      "match",
      ...common,
      "--map-type",
      "showcase",
      "--size",
      "16",
      "--factions",
      "goblin,undead",
    );
    expect(explicit.metrics.setupHash).toBe(match.metrics.setupHash);
    expect(() =>
      runCli("match", ...common, "--map-type", "showcase", "--size", "20"),
    ).toThrow(/--size must be 16 for the showcase map type/);
    expect(() => runCli("match", ...common, "--map-type", "plains")).toThrow(
      /--map-type must be dry_land, pangea, continents, archipelago, lakes, showcase, or mission/,
    );

    const batch = runCli<{
      readonly matches: number;
      readonly entries: readonly {
        readonly mapType: string;
        readonly aiCount: number;
      }[];
    }>(
      "batch",
      ...common,
      "--seeds",
      "0",
      "--ai-counts",
      "1,3",
      "--modes",
      "rival",
      "--map-types",
      "showcase",
    );
    expect(batch.matches).toBe(2);
    expect(batch.entries.map((entry) => entry.mapType)).toEqual([
      "SHOWCASE",
      "SHOWCASE",
    ]);
    expect(() =>
      runCli(
        "batch",
        ...common,
        "--seeds",
        "0",
        "--ai-counts",
        "1",
        "--map-types",
        "showcase",
        "--size",
        "11",
      ),
    ).toThrow(/--size must be 16 for the showcase map type/);
  }, 600_000);

  // Many seats (`pulp_wars-ykw.3`, docs/product/RULESET_7_MAP_SCALE.md
  // section 9): 1 to F - 1 AI, the auto size, and the sizes a width holds.
  it("accepts 1 to 7 AI seats, defaults to the auto size, and names the allowed sizes", () => {
    const common = [
      "--ruleset",
      "pulp-wars-poc-7r53",
      "--max-commands",
      "1",
      "--max-rounds",
      "5",
    ] as const;
    type Seats = {
      readonly metrics: {
        readonly setupHash: string;
        readonly factionsBySeat: readonly string[];
      };
    };
    // Eight players on the smallest Dry Land board, distinct by default.
    const crowded = runCli<Seats>(
      "match",
      ...common,
      "--map-type",
      "dry-land",
      "--ai-count",
      "7",
      "--size",
      "11",
    );
    expect(crowded.metrics.factionsBySeat).toEqual([
      "ORIGINAL",
      "UNDEAD",
      "GOBLIN",
      "DINOSAUR",
      "MARTIAN",
      "ICE_FOLK",
      "DWARF",
      "CANDY",
    ]);
    // Without --size five seats play the auto size, 20 x 20.
    const auto = runCli<Seats>(
      "match",
      ...common,
      "--map-type",
      "dry-land",
      "--ai-count",
      "4",
    );
    const twenty = runCli<Seats>(
      "match",
      ...common,
      "--map-type",
      "dry-land",
      "--ai-count",
      "4",
      "--size",
      "20",
    );
    expect(auto.metrics.setupHash).toBe(twenty.metrics.setupHash);
    expect(auto.metrics.factionsBySeat).toHaveLength(5);
    expect(() => runCli("match", ...common, "--ai-count", "8")).toThrow(
      /--ai-count must be 1 to 7/,
    );
    expect(() => runCli("match", ...common, "--ai-count", "0")).toThrow(
      /--ai-count must be 1 to 7/,
    );
    // A width that does not hold the seats names the allowed sizes.
    expect(() =>
      runCli(
        "match",
        ...common,
        "--map-type",
        "archipelago",
        "--ai-count",
        "4",
        "--size",
        "11",
      ),
    ).toThrow(
      /--size must be 14, 16, 20, 25 for 5 seats on the archipelago map type/,
    );
    expect(() =>
      runCli("match", ...common, "--map-type", "showcase", "--ai-count", "4"),
    ).toThrow(/--ai-count 4 has no board size on the showcase map type/);
    expect(() =>
      runCli("batch", ...common, "--seeds", "0", "--ai-counts", "1,9"),
    ).toThrow(/--ai-counts must be a comma list of 1 to 7/);
    // A batch entry takes its own auto size and refuses a size too small.
    const batch = runCli<{
      readonly matches: number;
      readonly entries: readonly { readonly aiCount: number }[];
    }>(
      "batch",
      ...common,
      "--seeds",
      "0",
      "--ai-counts",
      "5",
      "--modes",
      "rival",
      "--map-types",
      "dry-land",
    );
    expect(batch.entries.map((entry) => entry.aiCount)).toEqual([5]);
    expect(() =>
      runCli(
        "batch",
        ...common,
        "--seeds",
        "0",
        "--ai-counts",
        "2",
        "--map-types",
        "lakes",
        "--size",
        "11",
      ),
    ).toThrow(
      /boardSize is too small for aiCount: LAKES with 3 seats allows 14, 16, 20, 25/,
    );
  }, 600_000);

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
