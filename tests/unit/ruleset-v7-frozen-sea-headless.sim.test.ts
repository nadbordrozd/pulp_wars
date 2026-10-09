import { describe, expect, it } from "vitest";
import {
  FACTION_IDS_V7,
  RULESET_7_ID,
  parseGameStateV7,
  type FactionIdV7,
  type MatchSetupV7,
} from "../../src/engine/index";
import { runAiMatchV7 } from "../../src/headless/v7";

// The naval branch, engine step II (`pulp_wars-5ti.3`,
// docs/product/RULESET_7_NAVAL_BRANCH.md sections 13, 16, and 17): from this
// step on an Ice Folk seat has no ship and cannot embark, so the ordinary
// naval plan must stay off for it. It does not play the ice on purpose yet
// (that is `pulp_wars-5ti.5`); these short capped matches only prove that no
// seat errors, stalls, or issues a rejected command, for the Ice Folk
// against every faction on both water map types.

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

const OPPONENTS = FACTION_IDS_V7.filter((faction) => faction !== "ICE_FOLK");

describe("headless Normal matches with the frozen sea", () => {
  it("finish short water matches of the Ice Folk against every faction without an error, a stall, or a ship", () => {
    OPPONENTS.forEach((opponent, index) => {
      // Alternate the map type and the seat order.
      const mapType = index % 2 === 0 ? "CONTINENTS" : "ARCHIPELAGO";
      const factions: readonly FactionIdV7[] =
        index % 2 === 0 ? ["ICE_FOLK", opponent] : [opponent, "ICE_FOLK"];
      const label = `${factions.join("-")} ${mapType}`;
      const match = runAiMatchV7(setup(factions, mapType, 11 + index), {
        maxRounds: 16,
      });
      expect(match.errors, label).toEqual([]);
      expect(match.stalls, label).toEqual([]);
      expect(["OUTCOME", "ROUND_CAP"], label).toContain(match.termination);
      expect(parseGameStateV7(match.state), label).not.toBeNull();
      const ice = match.state.players.find(
        (player) => player.faction === "ICE_FOLK",
      );
      // The Ice Folk seat never owns a ship or an embarked unit.
      expect(
        match.state.units.some(
          (unit) => unit.ownerId === ice?.id && unit.form !== "LAND",
        ),
        label,
      ).toBe(false);
      expect(
        match.events.some(
          (event) =>
            (event.kind === "NAVAL_UNIT_TRAINED" ||
              event.kind === "UNIT_EMBARKED") &&
            event.playerId === ice?.id,
        ),
        label,
      ).toBe(false);
      // The inventories carry the new kinds (zero-filled when unused).
      expect(match.metrics.commandsByKind.FREEZE, label).toBeGreaterThanOrEqual(
        0,
      );
      expect(
        match.metrics.eventsByKind.WATER_FROZEN,
        label,
      ).toBeGreaterThanOrEqual(0);
    });
  }, 600_000);

  it("plays the Showcase with an Ice Folk seat among ships from the first turn", () => {
    for (const factions of [
      ["ICE_FOLK", "ORIGINAL", "UNDEAD", "GOBLIN"],
      ["MARTIAN", "ICE_FOLK", "DWARF", "CANDY"],
    ] as const) {
      const label = factions.join("-");
      const match = runAiMatchV7(setup(factions, "SHOWCASE", 1), {
        maxRounds: 8,
      });
      expect(match.errors, label).toEqual([]);
      expect(match.stalls, label).toEqual([]);
      expect(parseGameStateV7(match.state), label).not.toBeNull();
      for (const event of match.events)
        if (event.kind === "COMBAT_RESOLVED") {
          expect(typeof event.preview.iceCover, label).toBe("boolean");
          // An icebound defender never answers.
          if (event.preview.icebound)
            expect(event.preview.retaliation, label).toBe(false);
        }
    }
  }, 600_000);
});
