import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  RULESET_7_ID,
  applyCommandV7,
  canonicalHash,
  createPlayableGameV7,
  parseEventV7,
  parseGameStateV7,
  type FactionIdV7,
  type MatchSetupV7,
} from "../../src/engine/index";
import { runAiMatchV7 } from "../../src/headless/v7";
import { goblinSetupV7 } from "../fixtures/v7-goblin-arena";

// The Candy revision (`pulp_wars-jdb.3`, `pulp_wars-jdb.4`): the Normal AI
// stays safe with Candy seats. A Candy seat plays the Candy policy (it
// trains, moves, attacks, captures, Frosts, Rushes, Re-bakes, and Tosses),
// and every other faction plays against Candy units, Crumbs, Splat, and
// Bounce without an illegal command, a crash, or a stall
// (docs/product/RULESET_7_CANDY.md sections 14, 18, and 19.1).

const MATCHES: readonly (readonly [
  readonly FactionIdV7[],
  MatchSetupV7["mapType"],
  number,
])[] = [
  [["CANDY", "ORIGINAL"], "DRY_LAND", 1],
  [["ORIGINAL", "CANDY"], "DRY_LAND", 2],
  [["CANDY", "UNDEAD"], "DRY_LAND", 3],
  [["UNDEAD", "CANDY"], "DRY_LAND", 4],
  [["CANDY", "GOBLIN"], "DRY_LAND", 5],
  [["GOBLIN", "CANDY"], "DRY_LAND", 6],
  [["CANDY", "DINOSAUR"], "DRY_LAND", 7],
  [["DINOSAUR", "CANDY"], "DRY_LAND", 8],
  [["CANDY", "MARTIAN"], "DRY_LAND", 9],
  [["MARTIAN", "CANDY"], "DRY_LAND", 10],
  [["CANDY", "ICE_FOLK"], "DRY_LAND", 11],
  [["ICE_FOLK", "CANDY"], "DRY_LAND", 12],
  [["CANDY", "DWARF"], "DRY_LAND", 13],
  [["DWARF", "CANDY"], "DRY_LAND", 14],
  [["CANDY", "ORIGINAL"], "PANGEA", 1],
  [["MARTIAN", "CANDY", "UNDEAD", "GOBLIN"], "DRY_LAND", 2],
];

describe("headless Normal matches with Candy seats", () => {
  it("finish without errors or stalls against every faction, in both seat orders", () => {
    const kinds = new Set<string>();
    const totals = {
      crumbsLeft: 0,
      bounces: 0,
      splats: 0,
      crumbsEaten: 0,
      rushes: 0,
      rushedAttacks: 0,
    };
    for (const [factions, mapType, seed] of MATCHES) {
      const label = `${factions.join("-")} ${mapType} ${seed}`;
      const setup: MatchSetupV7 = { ...goblinSetupV7(factions, seed), mapType };
      const match = runAiMatchV7(setup, { maxRounds: 30 });
      expect(match.errors, label).toEqual([]);
      expect(match.stalls, label).toEqual([]);
      expect(["OUTCOME", "ROUND_CAP"], label).toContain(match.termination);
      expect(parseGameStateV7(match.state), label).not.toBeNull();
      for (const record of match.commandLog) kinds.add(record.command.kind);
      totals.crumbsLeft += match.metrics.candy.crumbsLeft;
      totals.crumbsEaten += match.metrics.candy.crumbsEaten;
      totals.bounces += match.metrics.candy.bounces;
      totals.splats += match.metrics.candy.splats;
      totals.rushes += match.metrics.candy.rushes;
      totals.rushedAttacks += match.metrics.candy.rushedAttacks;
      expect(match.metrics.commandsByKind.SUGAR_RUSH, label).toBe(
        match.metrics.candy.rushes,
      );
    }
    for (const kind of ["TRAIN", "MOVE", "ATTACK", "RESEARCH", "CAPTURE"])
      expect(kinds.has(kind), kind).toBe(true);
    // The Candy policy (`pulp_wars-jdb.4`) Rushes, and most Rushes are
    // followed by the attack they were made for.
    expect(kinds.has("SUGAR_RUSH")).toBe(true);
    expect(totals.rushes).toBeGreaterThan(0);
    expect(totals.rushedAttacks * 4).toBeGreaterThanOrEqual(totals.rushes * 3);
    // The passive Candy rules happen in ordinary play.
    expect(totals.crumbsLeft).toBeGreaterThan(0);
    expect(totals.bounces + totals.splats + totals.crumbsEaten).toBeGreaterThan(
      0,
    );
  }, 1_200_000);

  it("leaves the Candy metrics of a match without a Candy seat at zero", () => {
    const setup: MatchSetupV7 = {
      ...goblinSetupV7(["ORIGINAL", "UNDEAD"], 2),
      mapType: "DRY_LAND",
    };
    const match = runAiMatchV7(setup, { maxRounds: 15 });
    expect(
      Object.values(match.metrics.candy)
        .flatMap((value: number | Readonly<Record<string, number>>) =>
          typeof value === "number" ? [value] : Object.values(value),
        )
        .reduce((sum: number, value: number) => sum + value, 0),
    ).toBe(0);
    for (const kind of ["SUGAR_RUSH", "REBAKE", "SUGAR_TOSS"] as const)
      expect(match.metrics.commandsByKind[kind], kind).toBe(0);
    for (const kind of [
      "UNITS_CRASHED",
      "CRUMBS_STALE",
      "UNIT_REBAKED",
      "UNIT_SUGAR_RUSHED",
      "SUGAR_TOSSED",
      "CRUMBS_EATEN",
      "CRUMBS_LEFT",
    ] as const)
      expect(match.metrics.eventsByKind[kind], kind).toBe(0);
    expect([
      match.state.sugarRush,
      match.state.crumbs,
      match.state.splattedThisTurn,
      match.state.tossedThisTurn,
    ]).toEqual([[], [], [], []]);
  }, 120_000);

  it("is deterministic and replays command by command with valid events", () => {
    const setup: MatchSetupV7 = {
      ...goblinSetupV7(["CANDY", "DINOSAUR"], 8),
      mapType: "DRY_LAND",
    };
    const match = runAiMatchV7(setup, { maxRounds: 25 });
    expect(match.errors).toEqual([]);
    expect(runAiMatchV7(setup, { maxRounds: 25 }).stateHash).toBe(
      match.stateHash,
    );
    const created = createPlayableGameV7(setup);
    if (!created.ok) throw new Error(created.error.code);
    let state = created.state;
    for (const record of match.commandLog) {
      const result = applyCommandV7(state, record.playerId, record.command);
      if (!result.accepted) throw new Error(result.error.code);
      for (const event of result.events)
        expect(parseEventV7(event).ok, event.kind).toBe(true);
      state = result.state;
    }
    expect(canonicalHash(state)).toBe(match.stateHash);
  }, 300_000);

  it("plays a Showcase with a Candy seat without errors", () => {
    const setup: MatchSetupV7 = {
      ...goblinSetupV7(["CANDY", "ORIGINAL", "UNDEAD", "DWARF"], 3),
      mapType: "SHOWCASE",
      width: 16,
      height: 16,
    };
    const match = runAiMatchV7(setup, { maxRounds: 8 });
    expect(match.errors).toEqual([]);
    expect(match.stalls).toEqual([]);
    expect(parseGameStateV7(match.state)).not.toBeNull();
  }, 600_000);
});

describe("headless CLI", () => {
  it("accepts candy in --factions and reports the Candy metrics", () => {
    const output = execFileSync(
      process.execPath,
      [
        resolve("node_modules/tsx/dist/cli.mjs"),
        resolve("src/headless/cli.ts"),
        "match",
        "--ruleset",
        RULESET_7_ID,
        "--factions",
        "candy,human",
        "--max-commands",
        "40",
        "--max-rounds",
        "5",
      ],
      { encoding: "utf8", timeout: 60_000 },
    );
    const result = JSON.parse(output) as {
      readonly acceptedCommands: number;
      readonly metrics: {
        readonly rulesetId: string;
        readonly factionsBySeat: readonly string[];
        readonly candy: { readonly rushes: number };
      };
    };
    expect(result.acceptedCommands).toBeGreaterThan(0);
    expect(result.metrics.rulesetId).toBe(RULESET_7_ID);
    expect(result.metrics.factionsBySeat).toEqual(["CANDY", "ORIGINAL"]);
    expect(result.metrics.candy).toBeDefined();
  }, 120_000);
});
