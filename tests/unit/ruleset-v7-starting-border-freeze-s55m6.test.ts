import { describe, expect, it } from "vitest";
import {
  PRIOR_RULESET_7_IDS,
  RULESET_7_ID,
  SAVE_STORAGE_KEY_V7,
  createPlayableGameV7,
  missionByIdV7,
  missionMatchSetupV7,
  parseGameStateV7,
  withStartingBorderFreezeV7,
  type CoordV7,
  type FactionIdV7,
  type GameStateV7,
  type MatchSetupV7,
  type TechnologyIdV7,
} from "../../src/engine/index";
import { OBSOLETE_SAVE_STORAGE_KEYS_V7 } from "../../src/persistence/index";
import {
  navalArenaV7,
  navalUnitAtV7,
  seatV7,
  type NavalArenaOptionsV7,
} from "../fixtures/v7-naval-branch";

// The starting border freeze (`pulp_wars-s55m.6`, `pulp-wars-poc-7r126`;
// found in the hand play of the Ice Folk campaign: an Ice Folk seat that
// starts a match with Rime known started with open water in its borders, so
// Coldharbour's shallows in I3 stayed open until a Cold Snap). At setup,
// every seat that starts with Rime gets the border freeze of a research of
// Rime. On the authored strait (rows 0 to 2 and 8 to 10 land, rows 3 and 7
// Shallow Water, rows 4 to 6 Deep Water): seat 0's capital on (5, 2) holds
// x 4 to 6, y 1 to 3 with its Port on (4, 3); seat 1's capital on (5, 8)
// holds x 4 to 6, y 7 to 9 with its Port on (6, 7). Every state here is the
// first turn of a playable match. The one Freeze effect (`pulp_wars-xv0t`,
// 7r133): a dock never freezes, so each seat's Port stays open water.

const RIME: readonly TechnologyIdV7[] = ["SHORECRAFT"];
const PACK_ICE: readonly TechnologyIdV7[] = ["SHORECRAFT", "NAVIGATION"];
const NONE: readonly TechnologyIdV7[] = [];
/** Seat 0's border water but its Port on (4, 3). */
const SEAT_0_WATER: readonly CoordV7[] = [
  { x: 5, y: 3 },
  { x: 6, y: 3 },
];

const arena = (
  options: Omit<NavalArenaOptionsV7, "startingFreeze">,
): GameStateV7 => {
  const state = navalArenaV7({ ...options, startingFreeze: true });
  expect(state.round).toBe(1);
  expect(parseGameStateV7(JSON.parse(JSON.stringify(state)))).toEqual(state);
  return state;
};
const iceTiles = (state: GameStateV7, seat: 0 | 1): CoordV7[] =>
  state.ice
    .filter((entry) => entry.ownerId === seatV7(state, seat).id)
    .map((entry) => entry.at);

describe("the identity", () => {
  // Fishing Hole links (`pulp_wars-vg5l`) took 7r127 after it, and the
  // Mammoth's 2- or 3-tile Stampede (`pulp_wars-57lq`) 7r128.
  it("was 7r126 after 7r125, both save keys obsolete now", () => {
    expect(RULESET_7_ID).toBe("pulp-wars-poc-7r139");
    expect(SAVE_STORAGE_KEY_V7).toBe("pulpWars.save.v7r139.current");
    const at = PRIOR_RULESET_7_IDS.indexOf("pulp-wars-poc-7r126");
    expect(at).toBeGreaterThan(0);
    expect(PRIOR_RULESET_7_IDS[at - 1]).toBe("pulp-wars-poc-7r125");
    expect(PRIOR_RULESET_7_IDS).not.toContain(RULESET_7_ID);
    const key = OBSOLETE_SAVE_STORAGE_KEYS_V7.indexOf(
      "pulpWars.save.v7r126.current",
    );
    expect(OBSOLETE_SAVE_STORAGE_KEYS_V7[key - 1]).toBe(
      "pulpWars.save.v7r125.current",
    );
    expect(OBSOLETE_SAVE_STORAGE_KEYS_V7).not.toContain(SAVE_STORAGE_KEY_V7);
  });
});

describe("the starting border freeze", () => {
  it("an Ice Folk seat that starts with Rime starts with its border water as sound ice, its Port left open", () => {
    const state = arena({
      factions: ["ICE_FOLK", "ORIGINAL"],
      technologies: [RIME, RIME],
      units: [],
    });
    expect(state.ice).toEqual(
      SEAT_0_WATER.map((at) => ({
        at,
        ownerId: seatV7(state, 0).id,
      })),
    );
    // Nothing outside its own borders: the open strait, and the Human
    // seat's Port and water, stay open.
    expect(iceTiles(state, 1)).toEqual([]);
  });

  it("an Ice Folk seat without Rime starts with no ice, an AI seat with Rime with its own", () => {
    expect(
      arena({
        factions: ["ICE_FOLK", "ORIGINAL"],
        technologies: [NONE, RIME],
        units: [],
      }).ice,
    ).toEqual([]);
    expect(
      arena({
        factions: ["ORIGINAL", "ICE_FOLK"],
        technologies: [RIME, NONE],
        units: [],
      }).ice,
    ).toEqual([]);
    // Seat 1 (an AI seat): row 7 but its Port on (6, 7).
    const ai = arena({
      factions: ["ORIGINAL", "ICE_FOLK"],
      technologies: [RIME, RIME],
      units: [],
    });
    expect(iceTiles(ai, 0)).toEqual([]);
    expect(iceTiles(ai, 1)).toEqual([
      { x: 4, y: 7 },
      { x: 5, y: 7 },
    ]);
  });

  it("a seat of another faction never freezes, whatever it knows", () => {
    const factions: readonly (readonly [FactionIdV7, FactionIdV7])[] = [
      ["ORIGINAL", "UNDEAD"],
      ["DWARF", "CANDY"],
    ];
    for (const pair of factions)
      expect(
        arena({ factions: pair, technologies: [PACK_ICE, PACK_ICE], units: [] })
          .ice,
      ).toEqual([]);
  });

  it("never touches a ship: a hostile boat in its borders keeps its open water and is not Frozen", () => {
    const state = arena({
      factions: ["ICE_FOLK", "ORIGINAL"],
      technologies: [RIME, RIME],
      units: [{ seat: 1, role: "PATROL_BOAT", at: { x: 6, y: 3 } }],
    });
    expect(iceTiles(state, 0)).toEqual([{ x: 5, y: 3 }]);
    const boat = navalUnitAtV7(state, { x: 6, y: 3 });
    expect(boat).toMatchObject({
      ownerId: seatV7(state, 1).id,
      form: "NAVAL",
      hp: boat.maxHp,
    });
    expect(state.frozen).toEqual([]);
  });

  it("never puts a unit on ice: an embarked unit in its borders keeps its open water", () => {
    // The builder places no embarked unit, so the border freeze is applied
    // by hand to an arena whose starting ice was dropped, with a Human
    // Fighter afloat on (5, 3).
    const open = navalArenaV7({
      factions: ["ICE_FOLK", "ORIGINAL"],
      technologies: [RIME, RIME],
      units: [{ seat: 1, role: "FIGHTER", at: { x: 2, y: 9 } }],
    });
    expect(open.ice).toEqual([]);
    const fighter = navalUnitAtV7(open, { x: 2, y: 9 });
    const afloat: GameStateV7 = {
      ...open,
      units: open.units.map((unit) =>
        unit.id === fighter.id
          ? { ...unit, at: { x: 5, y: 3 }, form: "EMBARKED" as const }
          : unit,
      ),
    };
    const iced = withStartingBorderFreezeV7(afloat);
    expect(iced.ice.map((entry) => entry.at)).toEqual([{ x: 6, y: 3 }]);
    expect(iced.units).toBe(afloat.units);
    expect(iced.frozen).toEqual([]);
  });

  it("freezes Deep Water in its borders only with Pack Ice", () => {
    // (6, 2) is water beside the capital (Shallow); (6, 3) has water on all
    // four sides, so it is Deep.
    const terrain = [
      "...........",
      "...........",
      "......~~~~~",
      "~~~~~~~~~~~",
      "~~~~~~~~~~~",
      "~~~~~~~~~~~",
      "~~~~~~~~~~~",
      "~~~~~~~~~~~",
      "...........",
      "...........",
      "...........",
    ];
    const rime = arena({
      factions: ["ICE_FOLK", "ORIGINAL"],
      technologies: [RIME, NONE],
      units: [],
      terrain,
    });
    expect(
      rime.board.tiles.find((tile) => tile.at.x === 6 && tile.at.y === 3)
        ?.terrain,
    ).toBe("DEEP_WATER");
    expect(iceTiles(rime, 0)).toEqual([
      { x: 6, y: 2 },
      { x: 5, y: 3 },
    ]);
    const packIce = arena({
      factions: ["ICE_FOLK", "ORIGINAL"],
      technologies: [PACK_ICE, NONE],
      units: [],
      terrain,
    });
    expect(iceTiles(packIce, 0)).toEqual([
      { x: 6, y: 2 },
      { x: 5, y: 3 },
      { x: 6, y: 3 },
    ]);
  });

  it("freezes the shallows of Coldharbour in mission I3 from turn 1", () => {
    const mission = missionByIdV7("ICE_FOLK_3");
    if (mission === null) throw new Error("no I3");
    const setup = missionMatchSetupV7(mission);
    if (setup === null) throw new Error("no I3 setup");
    const created = createPlayableGameV7(setup);
    if (!created.ok) throw new Error(created.error.code);
    const { state } = created;
    const ice = seatV7(state, 0);
    expect(ice.faction).toBe("ICE_FOLK");
    expect(ice.researchedTechs).toContain("SHORECRAFT");
    expect(state.ice).toEqual([{ at: { x: 6, y: 10 }, ownerId: ice.id }]);
  });

  it("freezes the Showcase Ice Folk Coast and no other seat's water, every ship afloat", () => {
    const setup: MatchSetupV7 = {
      rulesetId: RULESET_7_ID,
      seed: 1,
      width: 16,
      height: 16,
      aiCount: 3,
      aiDifficulty: "NORMAL",
      aiMode: "RIVAL",
      humanColor: "CORAL",
      factions: ["ICE_FOLK", "ORIGINAL", "UNDEAD", "GOBLIN"],
      mapType: "SHOWCASE",
      mapGenerationRevision: "REGIONAL_BIOMES_NAVAL_V4",
      curiosities: false,
    };
    const created = createPlayableGameV7(setup);
    if (!created.ok) throw new Error(created.error.code);
    const { state } = created;
    const ice = seatV7(state, 0);
    const own = new Set(
      state.cities
        .filter((city) => city.ownerId === ice.id)
        .map((city) => city.id),
    );
    const key = (at: CoordV7): string => `${String(at.x)},${String(at.y)}`;
    const occupied = new Set(state.units.map((unit) => key(unit.at)));
    const iced = new Set(state.ice.map((entry) => key(entry.at)));
    for (const tile of state.board.tiles) {
      if (tile.terrain !== "SHALLOW_WATER" && tile.terrain !== "DEEP_WATER")
        continue;
      if (tile.territoryCityId === null) continue;
      // Every Showcase seat knows Pack Ice: every free water tile of the
      // Ice Folk borders but a dock is ice, and no water in another seat's
      // borders is. (The ice on the tiles of its boats lies outside its
      // borders.)
      const dock =
        tile.improvement === "PORT" || tile.improvement === "SHIPYARD";
      if (!own.has(tile.territoryCityId) || dock)
        expect(iced.has(key(tile.at)), key(tile.at)).toBe(false);
      else if (!occupied.has(key(tile.at)))
        expect(iced.has(key(tile.at)), key(tile.at)).toBe(true);
    }
    expect(state.ice.every((entry) => entry.ownerId === ice.id)).toBe(true);
    for (const unit of state.units)
      if (unit.ownerId !== ice.id && unit.role === "PATROL_BOAT")
        expect(unit.form).toBe("NAVAL");
  });
});
