import { describe, expect, it } from "vitest";
import {
  FACTION_IDS_V7,
  RULESET_7_ID,
  createInitialMapStateV7,
  createPlayableGameV7,
  parseMatchSetupV7,
  type AiCountV7,
  type FactionIdV7,
  type MatchSetupV7,
} from "../../src/engine/index";
import { mirrorOptionV7 } from "../fixtures/v7-builders";

/**
 * Revision 18 section 5 (`pulp_wars-6gd.3`): the fixed `SHOWCASE` setup is
 * accepted for 1–3 AI seats and every faction mix. Split out of
 * `ruleset-v7-revision18-showcase.test.ts` (`pulp_wars-9s0.13`) so the
 * exhaustive 64 + 512 + 4096 mixes run beside that file's AI matches, in
 * partitions that stay far from their timeouts on a busy machine.
 */

function showcaseSetup(
  factions: readonly FactionIdV7[],
  overrides: Partial<MatchSetupV7> = {},
): MatchSetupV7 {
  return {
    rulesetId: RULESET_7_ID,
    seed: 618,
    width: 16,
    height: 16,
    aiCount: (factions.length - 1) as AiCountV7,
    aiDifficulty: "NORMAL",
    aiMode: "RIVAL",
    humanColor: "CORAL",
    factions,
    mapType: "SHOWCASE",
    mapGenerationRevision: "REGIONAL_BIOMES_NAVAL_V3",
    curiosities: false,
    // pulp_wars-w5j.1: the test only mirror option for repeated factions.
    ...mirrorOptionV7(factions),
    ...overrides,
  };
}

/** Every mix of `seats` factions after the given leading seats. */
function factionMixes(
  seats: number,
  leading: readonly FactionIdV7[] = [],
): readonly (readonly FactionIdV7[])[] {
  let mixes: FactionIdV7[][] = [[...leading]];
  for (let seat = leading.length; seat < seats; seat += 1)
    mixes = mixes.flatMap((mix) =>
      FACTION_IDS_V7.map((faction) => [...mix, faction]),
    );
  return mixes;
}

/** Parses and creates every mix; returns how many were accepted. */
function acceptAll(mixes: readonly (readonly FactionIdV7[])[]): number {
  let accepted = 0;
  for (const factions of mixes) {
    const setup = showcaseSetup(factions);
    expect(parseMatchSetupV7(setup), factions.join("-")).toEqual(setup);
    const created = createInitialMapStateV7(setup);
    expect(created.ok, factions.join("-")).toBe(true);
    accepted += 1;
  }
  return accepted;
}

describe("ruleset-7 revision-18 Showcase setup: every faction mix", () => {
  // The Ice Folk revision: six factions (36, 216, and 1296 mixes); the
  // Dwarf revision: seven (49, 343, and 2401 mixes); the Candy revision:
  // eight (64, 512, and 4096 mixes).
  it("has eight factions", () => {
    expect(FACTION_IDS_V7).toHaveLength(8);
  });

  it.each([
    [2, 64],
    [3, 512],
  ] as const)(
    "accepts SHOWCASE at 16 for every %i-seat faction mix (%i mixes)",
    { timeout: 120_000 },
    (seats, mixes) => {
      expect(acceptAll(factionMixes(seats))).toBe(mixes);
    },
  );

  // The 4096 four-seat mixes, one partition of 512 per Human-seat faction.
  it.each(FACTION_IDS_V7)(
    "accepts SHOWCASE at 16 for every 4-seat faction mix with %s in the first seat",
    { timeout: 120_000 },
    (faction) => {
      expect(acceptAll(factionMixes(4, [faction]))).toBe(512);
    },
  );

  it("creates a playable Showcase in both AI modes", () => {
    for (const aiMode of ["RIVAL", "COOPERATIVE"] as const)
      expect(
        createPlayableGameV7(
          showcaseSetup(["ORIGINAL", "UNDEAD", "GOBLIN"], { aiMode }),
        ).ok,
      ).toBe(true);
  });
});
