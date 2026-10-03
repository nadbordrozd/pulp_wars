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

// The Ice Folk revision (`pulp_wars-7g3.3`), step 3: the existing Normal AI
// stays safe with Ice Folk seats. It plays an Ice Folk seat with the generic
// policy (the Ice Folk policy is `pulp_wars-7g3.4`), and every other faction
// plays against Ice Folk units, Snow, and Chill without an illegal command,
// a crash, or a stall (docs/product/RULESET_7_ICE_FOLK.md section 12). The
// Showcase match with an Ice Folk seat runs beside this file in
// ruleset-v7-ice-folk-showcase-headless.test.ts (`pulp_wars-9s0.13`).

const MATCHES: readonly (readonly [
  readonly FactionIdV7[],
  MatchSetupV7["mapType"],
  number,
])[] = [
  [["ICE_FOLK", "ORIGINAL"], "DRY_LAND", 1],
  [["ORIGINAL", "ICE_FOLK"], "PANGEA", 2],
  [["ICE_FOLK", "UNDEAD"], "DRY_LAND", 3],
  [["UNDEAD", "ICE_FOLK"], "CONTINENTS", 1],
  [["ICE_FOLK", "GOBLIN"], "DRY_LAND", 4],
  [["GOBLIN", "ICE_FOLK"], "LAKES", 1],
  [["ICE_FOLK", "DINOSAUR"], "DRY_LAND", 5],
  [["DINOSAUR", "ICE_FOLK"], "PANGEA", 1],
  [["ICE_FOLK", "MARTIAN"], "DRY_LAND", 6],
  [["MARTIAN", "ICE_FOLK"], "ARCHIPELAGO", 1],
  [["ICE_FOLK", "ICE_FOLK"], "DRY_LAND", 7],
  [["ICE_FOLK", "ICE_FOLK"], "PANGEA", 1],
];

describe("headless Normal matches with Ice Folk seats", () => {
  it("finish without errors or stalls against every faction and in the mirror", () => {
    const kinds = new Set<string>();
    let glides = 0;
    let snowCover = 0;
    for (const [factions, mapType, seed] of MATCHES) {
      const label = `${factions.join("-")} ${mapType} ${seed}`;
      const setup: MatchSetupV7 = { ...goblinSetupV7(factions, seed), mapType };
      const match = runAiMatchV7(setup, { maxRounds: 40 });
      expect(match.errors, label).toEqual([]);
      expect(match.stalls, label).toEqual([]);
      expect(["OUTCOME", "ROUND_CAP"], label).toContain(match.termination);
      expect(parseGameStateV7(match.state), label).not.toBeNull();
      for (const record of match.commandLog) kinds.add(record.command.kind);
      glides += match.metrics.iceFolk.glideMoves;
      snowCover += match.metrics.iceFolk.snowCoverAttacks;
      expect(
        match.metrics.iceFolk.snowTilesAtEndTurnMaximum,
        label,
      ).toBeGreaterThan(0);
    }
    for (const kind of ["TRAIN", "MOVE", "ATTACK", "RESEARCH", "CAPTURE"])
      expect(kinds.has(kind), kind).toBe(true);
    // Snow is real in these matches: Ice Folk units Glide and have cover.
    expect(glides).toBeGreaterThan(0);
    expect(snowCover).toBeGreaterThan(0);
  }, 600_000);

  it("leaves the metrics of a match without an Ice Folk seat at zero", () => {
    const setup: MatchSetupV7 = {
      ...goblinSetupV7(["ORIGINAL", "UNDEAD"], 2),
      mapType: "DRY_LAND",
    };
    const match = runAiMatchV7(setup, { maxRounds: 15 });
    const metrics = match.metrics.iceFolk;
    expect(
      metrics.shatters + metrics.glideMoves + metrics.snowTilesAtEndTurnTotal,
    ).toBe(0);
    expect(match.metrics.commandsByKind.THROW_BOLAS).toBe(0);
    expect(match.metrics.eventsByKind.UNITS_CHILLED).toBe(0);
  }, 120_000);

  it("is deterministic and replays command by command with valid events", () => {
    const setup: MatchSetupV7 = {
      ...goblinSetupV7(["ICE_FOLK", "DINOSAUR"], 8),
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
  it("accepts ice in --factions", () => {
    const output = execFileSync(
      process.execPath,
      [
        resolve("node_modules/tsx/dist/cli.mjs"),
        resolve("src/headless/cli.ts"),
        "match",
        "--ruleset",
        RULESET_7_ID,
        "--factions",
        "ice,human",
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
        readonly iceFolk: { readonly shatters: number };
      };
    };
    expect(result.acceptedCommands).toBeGreaterThan(0);
    expect(result.metrics.rulesetId).toBe(RULESET_7_ID);
    expect(result.metrics.factionsBySeat).toEqual(["ICE_FOLK", "ORIGINAL"]);
    expect(result.metrics.iceFolk).toBeDefined();
  }, 120_000);
});
