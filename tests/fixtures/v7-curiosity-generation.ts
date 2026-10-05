import { expect } from "vitest";
import {
  RULESET_7_ID,
  createInitialMapStateV7,
  curiosityRandomStateV7,
  curiosityTargetCountV7,
  distinctFactionsV7,
  generateInitialMapV7,
  generateInitialMapWithVillageCountV7,
  villageCountV7,
  type FactionIdV7,
  type MapTypeV7,
  type MatchSetupV7,
} from "../../src/engine/index";
import {
  checkCuriosityPlacementV7,
  type CheckedCuriosityV7,
} from "./v7-curiosity-checker";

/**
 * Map curiosities (`pulp_wars-737.2`): the generated setups and the
 * per-board on/off check shared by `ruleset-v7-curiosities.test.ts` and
 * `ruleset-v7-curiosity-generation.test.ts` (`pulp_wars-737.8`).
 */

export const CURIOSITY_MAP_TYPES_V7: readonly MapTypeV7[] = [
  "DRY_LAND",
  "PANGEA",
  "CONTINENTS",
  "ARCHIPELAGO",
  "LAKES",
];

/** The board sizes (with their AI counts) the on/off check covers. */
export const CURIOSITY_ON_OFF_SIZES_V7: readonly (readonly [
  MatchSetupV7["width"],
  MatchSetupV7["aiCount"],
])[] = [
  [11, 1],
  [14, 2],
  [16, 3],
  [20, 1],
  [25, 2],
];

/** Seeds 0 to 5 of every map type and size. */
export const CURIOSITY_ON_OFF_SEEDS_V7 = 6;

export function curiosityGeneratedSetupV7(
  seed: number,
  mapType: MapTypeV7,
  width: MatchSetupV7["width"],
  aiCount: MatchSetupV7["aiCount"],
  curiosities: boolean,
  factions: readonly FactionIdV7[] = distinctFactionsV7(aiCount + 1),
): MatchSetupV7 {
  return {
    rulesetId: RULESET_7_ID,
    seed,
    width,
    height: width,
    aiCount,
    aiDifficulty: "NORMAL",
    aiMode: "RIVAL",
    humanColor: "CORAL",
    factions,
    mapType,
    mapGenerationRevision: "REGIONAL_BIOMES_NAVAL_V3",
    curiosities,
  };
}

/**
 * One board of the on/off check: the option off is the generator before the
 * curiosities, the placement with it on obeys section 4, the two initial
 * states differ only in the option, the lists, the Monster unit, and the
 * next entity ID, and the same setup gives the same curiosities. Returns the
 * placed curiosities, the Monster's home included.
 */
export function checkCuriosityOnOffBoardV7(
  mapType: MapTypeV7,
  width: MatchSetupV7["width"],
  aiCount: MatchSetupV7["aiCount"],
  seed: number,
): readonly CheckedCuriosityV7[] {
  const on = curiosityGeneratedSetupV7(seed, mapType, width, aiCount, true);
  const off = { ...on, curiosities: false };
  const mapOn = generateInitialMapV7(on);
  const mapOff = generateInitialMapV7(off);
  const rifts = generateInitialMapWithVillageCountV7(
    on,
    villageCountV7(on),
    "VILLAGE_DENSITY_RIFTS",
  );
  if (!mapOn.ok || !mapOff.ok || !rifts.ok) throw new Error("map");
  // Off is the generator before the curiosities.
  expect(mapOff.map).toEqual(rifts.map);
  const target = curiosityTargetCountV7(
    width,
    curiosityRandomStateV7(seed),
  ).count;
  const placed = checkCuriosityPlacementV7(
    mapOn.map,
    rifts.map,
    mapType,
    target,
  );
  if (mapType === "DRY_LAND")
    expect(placed.some((entry) => entry.kind === "WRECK")).toBe(false);
  const markers = placed.filter((entry) => entry.kind !== "MONSTER");
  const lair = placed.find((entry) => entry.kind === "MONSTER");
  // The initial states differ only in the option, the lists, the
  // Monster unit (the last initial entity), and the next entity ID.
  const stateOn = createInitialMapStateV7(on);
  const stateOff = createInitialMapStateV7(off);
  if (!stateOn.ok || !stateOff.ok) throw new Error("state");
  expect(stateOn.state.curiosities).toEqual(markers);
  expect(stateOn.state.monsters.map((entry) => entry.home)).toEqual(
    lair === undefined ? [] : [lair.at],
  );
  const monsterIds = new Set(
    stateOn.state.monsters.map((entry) => entry.unitId),
  );
  expect(
    stateOn.state.monsters.every(
      (entry) => entry.unitId === stateOff.state.nextEntityId,
    ),
  ).toBe(true);
  expect({
    ...stateOn.state,
    setup: { ...stateOn.state.setup, curiosities: false },
    curiosities: [],
    monsters: [],
    units: stateOn.state.units.filter((unit) => !monsterIds.has(unit.id)),
    nextEntityId: stateOff.state.nextEntityId,
  }).toEqual(stateOff.state);
  // The same setup gives the same curiosities.
  const again = generateInitialMapV7(on);
  if (!again.ok) throw new Error("again");
  expect(again.map.curiosities).toEqual(markers);
  expect(again.map.monsterHome).toEqual(lair?.at ?? null);
  return placed;
}
