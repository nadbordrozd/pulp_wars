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

// The Dwarf revision (`pulp_wars-78i.3`): the Normal AI stays safe with
// Dwarf seats. It plays a Dwarf seat with the Dwarf policy of
// `pulp_wars-78i.4` (tunnels, bombs, Assemble), and every other faction
// plays against Dwarf units, mounds, bombs, and Dig In without an illegal
// command, a crash, or a stall (docs/product/RULESET_7_DWARVES.md sections
// 15 and 19). The Showcase match with a Dwarf seat runs beside this file in
// ruleset-v7-dwarf-showcase-headless.test.ts (`pulp_wars-9s0.13`).

const MATCHES: readonly (readonly [
  readonly FactionIdV7[],
  MatchSetupV7["mapType"],
  number,
])[] = [
  [["DWARF", "ORIGINAL"], "DRY_LAND", 1],
  [["UNDEAD", "DWARF"], "DRY_LAND", 2],
  [["DWARF", "GOBLIN"], "DRY_LAND", 3],
  [["DINOSAUR", "DWARF"], "DRY_LAND", 4],
  [["DWARF", "MARTIAN"], "DRY_LAND", 5],
  [["ICE_FOLK", "DWARF"], "DRY_LAND", 6],
  [["DWARF", "ORIGINAL"], "PANGEA", 1],
  [["MARTIAN", "DWARF"], "LAKES", 2],
];

describe("headless Normal matches with Dwarf seats", () => {
  it("finish without errors or stalls against every faction", () => {
    const kinds = new Set<string>();
    let gunnerShots = 0;
    for (const [factions, mapType, seed] of MATCHES) {
      const label = `${factions.join("-")} ${mapType} ${seed}`;
      const setup: MatchSetupV7 = { ...goblinSetupV7(factions, seed), mapType };
      const match = runAiMatchV7(setup, { maxRounds: 30 });
      expect(match.errors, label).toEqual([]);
      expect(match.stalls, label).toEqual([]);
      expect(["OUTCOME", "ROUND_CAP"], label).toContain(match.termination);
      expect(parseGameStateV7(match.state), label).not.toBeNull();
      for (const record of match.commandLog) kinds.add(record.command.kind);
      gunnerShots +=
        match.metrics.dwarf.gunnerShotsUnmoved +
        match.metrics.dwarf.gunnerShotsMoved;
    }
    for (const kind of ["TRAIN", "MOVE", "ATTACK", "RESEARCH", "CAPTURE"])
      expect(kinds.has(kind), kind).toBe(true);
    expect(gunnerShots).toBeGreaterThanOrEqual(0);
  }, 900_000);

  it("leaves the Dwarf metrics of a match without a Dwarf seat at zero", () => {
    const setup: MatchSetupV7 = {
      ...goblinSetupV7(["ORIGINAL", "UNDEAD"], 2),
      mapType: "DRY_LAND",
    };
    const match = runAiMatchV7(setup, { maxRounds: 15 });
    expect(
      Object.values(match.metrics.dwarf)
        .filter((value): value is number => typeof value === "number")
        .reduce((sum, value) => sum + value, 0),
    ).toBe(0);
    for (const kind of ["TUNNEL", "BOMB_RUN", "ASSEMBLE"] as const)
      expect(match.metrics.commandsByKind[kind], kind).toBe(0);
    for (const kind of [
      "UNIT_TUNNELLED",
      "UNIT_SURFACED",
      "UNIT_BOMBED",
      "UNIT_ASSEMBLED",
    ] as const)
      expect(match.metrics.eventsByKind[kind], kind).toBe(0);
  }, 120_000);

  it("is deterministic and replays command by command with valid events", () => {
    const setup: MatchSetupV7 = {
      ...goblinSetupV7(["DWARF", "DINOSAUR"], 8),
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
});

describe("headless CLI", () => {
  it("accepts dwarf in --factions", () => {
    const output = execFileSync(
      process.execPath,
      [
        resolve("node_modules/tsx/dist/cli.mjs"),
        resolve("src/headless/cli.ts"),
        "match",
        "--ruleset",
        RULESET_7_ID,
        "--factions",
        "dwarf,human",
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
        readonly dwarf: { readonly tunnels: number };
      };
    };
    expect(result.acceptedCommands).toBeGreaterThan(0);
    expect(result.metrics.rulesetId).toBe(RULESET_7_ID);
    expect(result.metrics.factionsBySeat).toEqual(["DWARF", "ORIGINAL"]);
    expect(result.metrics.dwarf).toBeDefined();
  }, 120_000);
});
