import { describe, expect, it } from "vitest";
import {
  CANDY_BASELINE_V1_TREE,
  COMMAND_KIND_ORDER_V7,
  DOMAIN_EVENT_KIND_ORDER_V7,
  FACTION_DISPLAY_NAMES_V7,
  FACTION_IDS_V7,
  FACTION_TREES_V7,
  FACTION_TREE_IDS_V7,
  PRIOR_RULESET_7_IDS,
  RULESET_7_ID,
  assertRuleset7Registry,
  canonicalHash,
  createInitialMapStateV7,
  createPlayableGameV7,
  createReplayV7,
  distinctFactionsV7,
  factionTreeIdV7,
  parseGameStateV7,
  parseMatchSetupV7,
  parseReplayFileV7,
  validateMatchSetupV7,
  type FactionIdV7,
  type GameStateV7,
  type MatchSetupV7,
} from "../../src/engine/index";
import {
  OBSOLETE_SAVE_STORAGE_KEYS_V7,
  SAVE_STORAGE_KEY_V7,
  cleanupObsoleteRuleset7Saves,
  createSaveEnvelopeV7,
  parseSaveV7,
} from "../../src/persistence/index";
import { goblinSetupV7 } from "../fixtures/v7-goblin-arena";

// The Candy revision (`pulp_wars-jdb.3`): identity, registration, and
// shapes (docs/product/RULESET_7_CANDY.md section 2). The Candy engine took
// 7r38 after the Martian and Ice Folk balance round (7r37); later beads that
// bump the identity re-pin REVISION here: the Martian Grunt's 8 HP
// (`pulp_wars-1wy.6`) took 7r39, the village density (`pulp_wars-ykw.2`)
// 7r40, and the early economy tweak (`pulp_wars-if6`, 3 starting Coins and
// tier 3 technology base cost 9) 7r41.

/** The revision number of the current identity (`pulp-wars-poc-7rNN`). */
const REVISION = 55;
const ID = `pulp-wars-poc-7r${REVISION}`;
const PREVIOUS_ID = `pulp-wars-poc-7r${REVISION - 1}`;

const CANDY_LISTS = [
  "sugarRush",
  "crumbs",
  "splattedThisTurn",
  "tossedThisTurn",
] as const;

class MemoryStorage {
  readonly values: Map<string, string>;
  constructor(entries: readonly (readonly [string, string])[]) {
    this.values = new Map(entries);
  }
  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
  removeItem(key: string): void {
    this.values.delete(key);
  }
}

function playable(setup: MatchSetupV7): GameStateV7 {
  const created = createPlayableGameV7(setup);
  if (!created.ok) throw new Error(created.error.code);
  return created.state;
}

describe("the Candy revision identity (section 2.2)", () => {
  it("is the current identity with the previous one last in the gap-free prior list and its save key obsolete", () => {
    expect(RULESET_7_ID).toBe(ID);
    expect(PRIOR_RULESET_7_IDS.at(-1)).toBe(PREVIOUS_ID);
    expect(PRIOR_RULESET_7_IDS).toHaveLength(REVISION - 1);
    expect([...PRIOR_RULESET_7_IDS]).toEqual([
      "pulp-wars-poc-7",
      ...Array.from(
        { length: REVISION - 2 },
        (_, index) => `pulp-wars-poc-7r${index + 2}`,
      ),
    ]);
    expect(SAVE_STORAGE_KEY_V7).toBe(`pulpWars.save.v7r${REVISION}.current`);
    expect(OBSOLETE_SAVE_STORAGE_KEYS_V7.at(-1)).toBe(
      `pulpWars.save.v7r${REVISION - 1}.current`,
    );
    expect(OBSOLETE_SAVE_STORAGE_KEYS_V7).toHaveLength(REVISION - 1);
    expect(OBSOLETE_SAVE_STORAGE_KEYS_V7).not.toContain(SAVE_STORAGE_KEY_V7);
  });

  it("cleans the previous identity's save key and preserves the current save, the Ruleset 6 save, and unrelated storage", () => {
    const previousKey = `pulpWars.save.v7r${REVISION - 1}.current`;
    const storage = new MemoryStorage([
      [previousKey, "old"],
      [SAVE_STORAGE_KEY_V7, "current"],
      ["pulpWars.save.current", "v6"],
      ["pulpWars.settings.v1", "settings"],
      ["pulpWars.ruleset7.artSet.v1", "art"],
      ["unrelated", "kept"],
    ]);
    expect(cleanupObsoleteRuleset7Saves(storage)).toEqual({
      removedKeys: [previousKey],
      removedCount: 1,
      warning: null,
    });
    expect([...storage.values.keys()]).toEqual([
      SAVE_STORAGE_KEY_V7,
      "pulpWars.save.current",
      "pulpWars.settings.v1",
      "pulpWars.ruleset7.artSet.v1",
      "unrelated",
    ]);
  });

  it("rejects the previous identity, and a state without the four Candy lists, without migration", () => {
    const setup = goblinSetupV7(["CANDY", "ORIGINAL"]);
    const state = playable(setup);
    expect(state.rulesetId).toBe(ID);
    for (const key of CANDY_LISTS) expect(state[key], key).toEqual([]);
    const oldSetup = { ...setup, rulesetId: PREVIOUS_ID };
    expect(parseMatchSetupV7(oldSetup)).toBeNull();
    expect(
      parseGameStateV7({ ...state, rulesetId: PREVIOUS_ID, setup: oldSetup }),
    ).toBeNull();
    for (const key of CANDY_LISTS) {
      const without = Object.fromEntries(
        Object.entries(state).filter(([name]) => name !== key),
      );
      expect(parseGameStateV7(without), key).toBeNull();
    }
    expect(
      parseReplayFileV7({
        format: "pulp-wars-replay",
        version: 7,
        setup: oldSetup,
        commands: [],
        checkpoints: [],
      }),
    ).toEqual({ kind: "INCOMPATIBLE_REPLAY" });
    const save = createSaveEnvelopeV7(
      { state, replay: createReplayV7(setup) },
      "2026-10-04T12:00:00.000Z",
    );
    expect(parseSaveV7(JSON.stringify(save))).toMatchObject({ kind: "VALID" });
    expect(
      parseSaveV7(
        JSON.stringify({
          ...save,
          rulesetId: PREVIOUS_ID,
          setup: oldSetup,
          state: { ...save.state, rulesetId: PREVIOUS_ID },
        }),
      ),
    ).toMatchObject({ kind: "INCOMPATIBLE" });
  });

  it("freezes the faction and tree orders, the binding, and the display name", () => {
    expect(FACTION_IDS_V7).toEqual([
      "ORIGINAL",
      "UNDEAD",
      "GOBLIN",
      "DINOSAUR",
      "MARTIAN",
      "ICE_FOLK",
      "DWARF",
      "CANDY",
    ]);
    expect(FACTION_TREE_IDS_V7).toEqual([
      "ORIGINAL_BASELINE_V5",
      "UNDEAD_BASELINE_V1",
      "GOBLIN_BASELINE_V1",
      "DINOSAUR_BASELINE_V1",
      "MARTIAN_BASELINE_V1",
      "ICE_FOLK_BASELINE_V1",
      "DWARF_BASELINE_V1",
      "CANDY_BASELINE_V1",
    ]);
    expect(factionTreeIdV7("CANDY")).toBe("CANDY_BASELINE_V1");
    expect(FACTION_TREES_V7.CANDY).toBe(CANDY_BASELINE_V1_TREE);
    expect(FACTION_DISPLAY_NAMES_V7.CANDY).toBe("Candy");
    expect(Object.keys(FACTION_TREES_V7)).toHaveLength(8);
    expect(() => assertRuleset7Registry()).not.toThrow();
  });

  it("inserts the three commands after ASSEMBLE and the seven events at their positions", () => {
    const commands: readonly string[] = COMMAND_KIND_ORDER_V7;
    const assemble = commands.indexOf("ASSEMBLE");
    expect(commands.slice(assemble, assemble + 5)).toEqual([
      "ASSEMBLE",
      "SUGAR_RUSH",
      "REBAKE",
      "SUGAR_TOSS",
      "RECOVER",
    ]);
    const events: readonly string[] = DOMAIN_EVENT_KIND_ORDER_V7;
    const after = (kind: string): string | undefined =>
      events[events.indexOf(kind) + 1];
    expect(after("INCOME_AWARDED")).toBe("UNITS_CRASHED");
    expect(after("UNITS_CRASHED")).toBe("CRUMBS_STALE");
    expect(after("CRUMBS_STALE")).toBe("INCOME_PREVIEWED");
    expect(after("UNIT_ASSEMBLED")).toBe("UNIT_REBAKED");
    // The frozen sea (pulp_wars-5ti.3) puts its three events in between.
    expect(after("UNITS_CHILLED")).toBe("WATER_FROZEN");
    expect(after("UNITS_CRUSHED")).toBe("UNIT_SUGAR_RUSHED");
    expect(after("WOUNDED_TENDED")).toBe("SUGAR_TOSSED");
    expect(after("UNIT_MOVE_INTERRUPTED")).toBe("CRUMBS_EATEN");
    expect(after("GRAVE_CREATED")).toBe("CRUMBS_LEFT");
    expect(new Set(events).size).toBe(events.length);
    expect(new Set(commands).size).toBe(commands.length);
  });
});

describe("Candy setup (sections 2.4 and 12.17)", () => {
  it("accepts a Candy seat with three others and refuses a duplicate Candy seat", () => {
    const four = goblinSetupV7(["CANDY", "ORIGINAL", "UNDEAD", "GOBLIN"]);
    expect(validateMatchSetupV7(four).ok).toBe(true);
    expect(parseMatchSetupV7(four)).not.toBeNull();
    const { allowDuplicateFactions: _allowed, ...mirror } = goblinSetupV7([
      "CANDY",
      "CANDY",
    ]);
    void _allowed;
    const refused = validateMatchSetupV7(mirror);
    expect(refused.ok).toBe(false);
    if (!refused.ok) expect(refused.error.code).toBe("DUPLICATE_FACTION");
    // The test-only mirror option still allows it.
    expect(
      validateMatchSetupV7({ ...mirror, allowDuplicateFactions: true }).ok,
    ).toBe(true);
  });

  it("keeps the default distinct factions of up to four seats in registration order", () => {
    expect(distinctFactionsV7(4)).toEqual([
      "ORIGINAL",
      "UNDEAD",
      "GOBLIN",
      "DINOSAUR",
    ]);
    expect(distinctFactionsV7(8).at(-1)).toBe("CANDY");
    expect(distinctFactionsV7(2, ["CANDY", "CANDY"])).toEqual([
      "CANDY",
      "ORIGINAL",
    ]);
  });

  it("generates the same map whatever seat plays the Candy", () => {
    const mapOf = (factions: readonly FactionIdV7[]): string => {
      const created = createInitialMapStateV7(goblinSetupV7(factions, 11));
      if (!created.ok) throw new Error(created.error.code);
      const { state } = created;
      return canonicalHash({
        board: state.board,
        cities: state.cities.map((city) => ({ at: city.at, id: city.id })),
        treasureChests: state.treasureChests,
        turnOrder: state.turnOrder,
        random: state.random,
        units: state.units.map((unit) => ({ at: unit.at, id: unit.id })),
      });
    };
    const reference = mapOf(["ORIGINAL", "UNDEAD"]);
    expect(mapOf(["CANDY", "ORIGINAL"])).toBe(reference);
    expect(mapOf(["ORIGINAL", "CANDY"])).toBe(reference);
  });

  it("starts a Candy seat with one Toffee Trooper on its capital, 3 Coins, and no technology", () => {
    const state = playable(goblinSetupV7(["ORIGINAL", "CANDY"]));
    const candy = state.players.find((player) => player.faction === "CANDY");
    if (candy === undefined) throw new Error("no Candy seat");
    expect(candy.factionTreeId).toBe("CANDY_BASELINE_V1");
    expect(candy.researchedTechs).toEqual([]);
    // 3 Coins, and its first Start Turn income of 2 when it moves first.
    expect(candy.coins).toBe(state.turnOrder[0] === candy.id ? 5 : 3);
    const capital = state.cities.find(
      (city) => city.ownerId === candy.id && city.isCapital,
    );
    expect(state.units.filter((unit) => unit.ownerId === candy.id)).toEqual([
      expect.objectContaining({
        role: "FIGHTER",
        form: "LAND",
        at: capital?.at,
        hp: 10,
        maxHp: 10,
      }),
    ]);
  });
});
