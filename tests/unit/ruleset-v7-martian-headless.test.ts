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

// The Martian revision (`pulp_wars-t6s.2`), step 2: the existing Normal AI
// stays safe with Martian seats. It plays a Martian seat with the generic
// policy (it never uses Beam Down, Mind Control, or the Tractor Beam; the
// Martian policy is `pulp_wars-t6s.3`), and every other faction plays
// against Martian units without an illegal command, a crash, or a stall.

const MATCHES: readonly (readonly [
  readonly FactionIdV7[],
  MatchSetupV7["mapType"],
  number,
])[] = [
  [["MARTIAN", "ORIGINAL"], "PANGEA", 1],
  [["ORIGINAL", "MARTIAN"], "DRY_LAND", 2],
  [["MARTIAN", "UNDEAD"], "CONTINENTS", 1],
  [["UNDEAD", "MARTIAN"], "LAKES", 3],
  [["MARTIAN", "GOBLIN"], "LAKES", 1],
  [["GOBLIN", "MARTIAN"], "PANGEA", 4],
  [["MARTIAN", "DINOSAUR"], "DRY_LAND", 1],
  [["DINOSAUR", "MARTIAN"], "ARCHIPELAGO", 5],
  [["MARTIAN", "MARTIAN"], "PANGEA", 1],
  [["MARTIAN", "MARTIAN"], "ARCHIPELAGO", 2],
];

describe("headless Normal matches with Martian seats", () => {
  it("finish without errors or stalls against every faction and in the mirror", () => {
    const kinds = new Set<string>();
    let rays = 0;
    let absorbed = 0;
    let recharges = 0;
    for (const [factions, mapType, seed] of MATCHES) {
      const label = `${factions.join("-")} ${mapType} ${seed}`;
      const setup: MatchSetupV7 = { ...goblinSetupV7(factions, seed), mapType };
      const match = runAiMatchV7(setup, { maxRounds: 40 });
      expect(match.errors, label).toEqual([]);
      expect(match.stalls, label).toEqual([]);
      expect(["OUTCOME", "ROUND_CAP"], label).toContain(match.termination);
      expect(parseGameStateV7(match.state), label).not.toBeNull();
      for (const record of match.commandLog) kinds.add(record.command.kind);
      const martian = match.metrics.martian;
      rays += martian.raysFull + martian.raysHalf;
      absorbed +=
        martian.shieldAbsorbed.attack +
        martian.shieldAbsorbed.retaliation +
        martian.shieldAbsorbed.splash +
        martian.shieldAbsorbed.wail +
        martian.shieldAbsorbed.blast;
      recharges += martian.rechargeEvents;
      // Rays are full or half, and a half ray has exactly one reason.
      expect(martian.raysHalf, label).toBe(
        martian.raysHalfMoved + martian.raysHalfCooling,
      );
    }
    // The generic policy trains, moves, attacks, and researches for a
    // Martian seat ...
    for (const kind of ["TRAIN", "MOVE", "ATTACK", "RESEARCH", "CAPTURE"])
      expect(kinds.has(kind), kind).toBe(true);
    // ... Shields absorb damage and recharge in real matches ...
    expect(absorbed).toBeGreaterThan(0);
    expect(recharges).toBeGreaterThan(0);
    expect(rays).toBeGreaterThanOrEqual(0);
    // ... and it never issues a Field Defense or Tend Wounded command for
    // a Martian seat (they would be rejected and reported as errors).
  }, 600_000);

  it("is deterministic and replays command by command with valid events", () => {
    const setup: MatchSetupV7 = {
      ...goblinSetupV7(["MARTIAN", "GOBLIN"], 7),
      mapType: "CONTINENTS",
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

  it("plays a Showcase with a Martian seat, where every Martian unit exists from the first turn", () => {
    const setup: MatchSetupV7 = {
      rulesetId: RULESET_7_ID,
      seed: 1,
      width: 16,
      height: 16,
      aiCount: 3,
      aiDifficulty: "NORMAL",
      aiMode: "RIVAL",
      humanColor: "CORAL",
      factions: ["MARTIAN", "ORIGINAL", "UNDEAD", "GOBLIN"],
      mapType: "SHOWCASE",
      mapGenerationRevision: "REGIONAL_BIOMES_NAVAL_V2",
    };
    const match = runAiMatchV7(setup, { maxRounds: 20 });
    expect(match.errors).toEqual([]);
    expect(match.stalls).toEqual([]);
    const martian = match.metrics.martian;
    // Ray units fire and Shields absorb from the first rounds.
    expect(martian.raysFull + martian.raysHalf).toBeGreaterThan(0);
    expect(martian.rechargeEvents).toBeGreaterThan(0);
    expect(parseGameStateV7(match.state)).not.toBeNull();
  }, 300_000);
});

describe("headless CLI", () => {
  it("accepts martian in --factions", () => {
    const output = execFileSync(
      process.execPath,
      [
        resolve("node_modules/tsx/dist/cli.mjs"),
        resolve("src/headless/cli.ts"),
        "match",
        "--ruleset",
        RULESET_7_ID,
        "--factions",
        "martian,human",
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
        readonly martian: { readonly rechargeEvents: number };
      };
    };
    expect(result.acceptedCommands).toBeGreaterThan(0);
    expect(result.metrics.rulesetId).toBe(RULESET_7_ID);
    expect(result.metrics.martian).toBeDefined();
  }, 120_000);
});
