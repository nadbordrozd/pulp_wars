import { describe, expect, it } from "vitest";
import {
  RULESET_7_ID,
  parseGameStateV7,
  type FactionIdV7,
  type MatchSetupV7,
} from "../../src/engine/index";
import { runAiMatchV7 } from "../../src/headless/v7";

// The naval branch, engine step I (`pulp_wars-5ti.2`,
// docs/product/RULESET_7_NAVAL_BRANCH.md sections 13 and 16): the Normal AI
// stays legal with the two technologies, the Submarine, the Ram, and
// `BOARD` in the game. It does not play them on purpose yet (that is
// `pulp_wars-5ti.4`); these short capped matches only prove that no seat
// errors, stalls, or issues a rejected command.

function setup(
  factions: readonly FactionIdV7[],
  mapType: MatchSetupV7["mapType"],
  seed: number,
): MatchSetupV7 {
  const size = mapType === "SHOWCASE" ? 16 : 11;
  return {
    rulesetId: RULESET_7_ID,
    seed,
    width: size,
    height: size,
    aiCount: factions.length - 1,
    aiDifficulty: "NORMAL",
    aiMode: "RIVAL",
    humanColor: "CORAL",
    factions: [...factions],
    mapType,
    mapGenerationRevision: "REGIONAL_BIOMES_NAVAL_V4",
    curiosities: false,
  };
}

/** Every faction once, both water map types, both seat orders. */
const WATER_MATCHES: readonly (readonly [
  readonly FactionIdV7[],
  MatchSetupV7["mapType"],
  number,
])[] = [
  [["ORIGINAL", "UNDEAD"], "CONTINENTS", 1],
  [["GOBLIN", "ORIGINAL"], "ARCHIPELAGO", 2],
  [["ORIGINAL", "DINOSAUR"], "ARCHIPELAGO", 3],
  [["MARTIAN", "ORIGINAL"], "CONTINENTS", 4],
  [["ORIGINAL", "ICE_FOLK"], "ARCHIPELAGO", 5],
  [["DWARF", "ORIGINAL"], "ARCHIPELAGO", 6],
  [["ORIGINAL", "CANDY"], "CONTINENTS", 7],
];

describe("headless Normal matches with the naval branch", () => {
  it("finish short water matches of every faction without an error, a stall, or a rejected command", () => {
    for (const [factions, mapType, seed] of WATER_MATCHES) {
      const label = `${factions.join("-")} ${mapType} ${String(seed)}`;
      const match = runAiMatchV7(setup(factions, mapType, seed), {
        maxRounds: 20,
      });
      expect(match.errors, label).toEqual([]);
      expect(match.stalls, label).toEqual([]);
      expect(["OUTCOME", "ROUND_CAP"], label).toContain(match.termination);
      expect(parseGameStateV7(match.state), label).not.toBeNull();
      // The inventories carry the new kinds (zero-filled when unused).
      expect(match.metrics.commandsByKind.BOARD, label).toBeGreaterThanOrEqual(
        0,
      );
    }
  }, 600_000);

  it("plays the Showcase, where every seat has Seamanship, Submersibles, and a Submarine from the first turn", () => {
    for (const factions of [
      ["ORIGINAL", "UNDEAD", "GOBLIN", "DINOSAUR"],
      ["MARTIAN", "ICE_FOLK", "DWARF", "CANDY"],
    ] as const) {
      const label = factions.join("-");
      const match = runAiMatchV7(setup(factions, "SHOWCASE", 1), {
        maxRounds: 8,
      });
      expect(match.errors, label).toEqual([]);
      expect(match.stalls, label).toEqual([]);
      expect(parseGameStateV7(match.state), label).not.toBeNull();
      // The ships fight: every accepted naval attack parsed and resolved.
      const combats = match.events.flatMap((event) =>
        event.kind === "COMBAT_RESOLVED" ? [event.preview] : [],
      );
      for (const preview of combats) {
        expect(typeof preview.ram, label).toBe("boolean");
        expect(typeof preview.torpedo, label).toBe("boolean");
        // A torpedo is never answered.
        if (preview.torpedo) expect(preview.retaliation, label).toBe(false);
      }
    }
  }, 600_000);
});
