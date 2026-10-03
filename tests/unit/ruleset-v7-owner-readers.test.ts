import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  NEUTRAL_OWNER_ID_V7,
  arePlayersAlliedV7,
  cooperativeAlliesV7,
  ownerResearchedTechsV7,
  playerFactionV7,
  seatRoleRuleV7,
  unitFactionV7,
  type PlayerId,
} from "../../src/engine/index";
import { OWNER_READER_CLASSES_V7 } from "../fixtures/v7-owner-reader-classes";
import {
  ownerReaderScopeTextV7,
  ownerReadersV7,
} from "../fixtures/v7-owner-readers";
import { monsterArenaV7, monsterOfV7 } from "../fixtures/v7-monster-arena";

/**
 * Map curiosities (docs/product/RULESET_7_MAP_CURIOSITIES.md section 10.5):
 * every reader that resolves a player record or a seat's faction from an
 * owner ID is classified as neutral-aware, neutral-safe, or player-only,
 * keyed by file and function (the precedent of the Dwarf unit-reader and
 * the Mind Control kind-reader audits), so no new reader can silently
 * crash on, or misjudge, the Giant Spider's neutral owner.
 */
const ROOT = join(__dirname, "..", "..");
const readers = ownerReadersV7(ROOT);
const NEUTRAL_TEXT =
  /NEUTRAL_OWNER_ID_V7|isNeutralOwnerV7|NEUTRAL_KIND_V7|ownerResearchedTechsV7|cooperativeAlliesV7/;

describe("Map curiosities: owner-reader classification", () => {
  it("finds the owner readers", () => {
    expect(readers.length).toBeGreaterThan(80);
  });

  it("classifies every owner reader", () => {
    const unclassified = [
      ...new Set(
        readers
          .map((reader) => `${reader.file}::${reader.scope}`)
          .filter((key) => !(key in OWNER_READER_CLASSES_V7)),
      ),
    ];
    expect(unclassified).toEqual([]);
  });

  it("has no class for a function that no longer reads an owner", () => {
    const present = new Set(
      readers.map((reader) => `${reader.file}::${reader.scope}`),
    );
    expect(
      Object.keys(OWNER_READER_CLASSES_V7).filter((key) => !present.has(key)),
    ).toEqual([]);
  });

  it("makes every neutral-aware reader name the neutral owner", () => {
    for (const [key, kind] of Object.entries(OWNER_READER_CLASSES_V7)) {
      if (kind !== "NEUTRAL_AWARE") continue;
      const [file, scope] = key.split("::") as [string, string];
      expect(ownerReaderScopeTextV7(ROOT, file, scope), key).toMatch(
        NEUTRAL_TEXT,
      );
    }
  });

  it("keeps one Cooperative alliance rule (every other mode literal is a setup check)", () => {
    const cooperative = readers.filter(
      (reader) => reader.read === "COOPERATIVE",
    );
    expect(
      cooperative
        .map((reader) => `${reader.file}::${reader.scope}`)
        .filter(
          (key) =>
            OWNER_READER_CLASSES_V7[key] === "NEUTRAL_AWARE" &&
            key !== "src/engine/v7/economy.ts::cooperativeAlliesV7",
        ),
    ).toEqual([]);
  });

  it("classifies the readers the contract names", () => {
    const expected: Readonly<
      Record<string, "NEUTRAL_AWARE" | "NEUTRAL_SAFE" | "PLAYER_ONLY">
    > = {
      "src/engine/rules/ruleset-v7.ts::unitFactionV7": "NEUTRAL_AWARE",
      "src/engine/rules/ruleset-v7.ts::ownerResearchedTechsV7": "NEUTRAL_AWARE",
      "src/engine/v7/economy.ts::cooperativeAlliesV7": "NEUTRAL_AWARE",
      "src/engine/v7/reducer.ts::resolveAttackExchangeV7": "NEUTRAL_AWARE",
      "src/engine/v7/reducer.ts::plunderAwardsV7": "NEUTRAL_AWARE",
      "src/engine/v7/state-schema.ts::validateCrossReferences": "NEUTRAL_AWARE",
      "src/engine/v7/reducer.ts::applyEndTurn": "PLAYER_ONLY",
      "src/engine/rules/ruleset-v7.ts::seatRoleRuleV7": "PLAYER_ONLY",
    };
    for (const [key, kind] of Object.entries(expected))
      expect(OWNER_READER_CLASSES_V7[key], key).toBe(kind);
  });

  it("resolves the neutral owner in the neutral-aware resolvers and asserts in the player-only ones", () => {
    const state = monsterArenaV7([]);
    const spider = monsterOfV7(state);
    expect(unitFactionV7(state, spider)).toBe("NEUTRAL");
    expect(ownerResearchedTechsV7(state, NEUTRAL_OWNER_ID_V7)).toEqual([]);
    expect(() => ownerResearchedTechsV7(state, 9 as PlayerId)).toThrow();
    expect(() => playerFactionV7(state, NEUTRAL_OWNER_ID_V7)).toThrow();
    expect(() =>
      seatRoleRuleV7(state, NEUTRAL_OWNER_ID_V7, "FIGHTER"),
    ).toThrow();
    for (const aiMode of ["RIVAL", "COOPERATIVE"] as const)
      for (const player of state.players) {
        expect(
          cooperativeAlliesV7(
            aiMode,
            state.humanPlayerId,
            player.id,
            NEUTRAL_OWNER_ID_V7,
          ),
        ).toBe(false);
        expect(
          arePlayersAlliedV7(
            { ...state, setup: { ...state.setup, aiMode } },
            NEUTRAL_OWNER_ID_V7,
            player.id,
          ),
        ).toBe(false);
      }
  });
});
