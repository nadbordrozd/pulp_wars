import type { PlayerId, UnitId } from "../model/ids";
import {
  EGG_HP_V7,
  canEnterTerrainV7,
  unitRoleRuleV7,
  roleMechanicsV7,
  technologyCapabilitiesV7,
  type FactionRosterV7,
} from "../rules/ruleset-v7";
import type { DomainEventV7 } from "./events";
import { revealFromV7, unitSightRadiusAtV7 } from "./movement";
import { tileAtV7 } from "./spatial-economy";
import type {
  CityStateV7,
  CoordV7,
  EggStatusV7,
  FactionIdV7,
  GameStateV7,
  TechnologyIdV7,
  UnitActivationV7,
  UnitRoleIdV7,
  UnitStateV7,
} from "./types";
import type { PlayerViewV7 } from "./view";
import { tileOccupiedV7 } from "./units";

/**
 * Revision 19 Eggs (docs/product/RULESET_7_REVISION_19_DINOSAURS.md section
 * 6). An Egg is a unit of form `EGG` with a countdown in `GameStateV7.eggs`.
 */

/** The activation of a unit that can move and act (a Start Turn hatchling). */
export function freshActivationV7(): UnitActivationV7 {
  return {
    moved: false,
    movedPathLength: 0,
    attacked: false,
    attacksUsed: 0,
    tendedThisTurn: false,
    inspired: false,
    overrunActive: false,
    escapeAvailable: false,
    recovered: false,
    captured: false,
    handled: false,
    specialActed: false,
  };
}

/** The exhausted activation an Egg carries at all times (section 6.1). */
export function eggActivationV7(): UnitActivationV7 {
  return {
    moved: true,
    movedPathLength: 0,
    attacked: true,
    attacksUsed: 1,
    tendedThisTurn: false,
    inspired: false,
    overrunActive: false,
    escapeAvailable: false,
    recovered: true,
    captured: true,
    handled: true,
    specialActed: true,
  };
}

/** Whether `activation` is exactly the Egg activation. */
export function isEggActivationV7(activation: UnitActivationV7): boolean {
  const expected = eggActivationV7();
  return (Object.keys(expected) as (keyof UnitActivationV7)[]).every(
    (name) => activation[name] === expected[name],
  );
}

/** HP of an Egg laid by a player with these technologies (6, or 10). */
export function laidEggHpV7(
  researchedTechs: readonly TechnologyIdV7[],
  faction: FactionIdV7,
): number {
  return (
    EGG_HP_V7 + technologyCapabilitiesV7(researchedTechs, faction).eggHpBonus
  );
}

/**
 * The countdown of an Egg of `role` laid by a player with these
 * technologies: the role's hatch time, one less with Nesting, at least 1.
 * Null for a role that is not egg-laid.
 */
export function laidEggTurnsV7(
  role: UnitRoleIdV7,
  researchedTechs: readonly TechnologyIdV7[],
  faction: FactionIdV7,
): number | null {
  const hatchTurns = roleMechanicsV7(role, faction).hatchTurns;
  return hatchTurns === null
    ? null
    : Math.max(
        1,
        hatchTurns -
          technologyCapabilitiesV7(researchedTechs, faction)
            .eggHatchTurnReduction,
      );
}

/** The eight tiles around `center` that are on the board, in (y, x) order. */
function ringV7(width: number, height: number, center: CoordV7): CoordV7[] {
  const ring: CoordV7[] = [];
  for (let y = center.y - 1; y <= center.y + 1; y += 1)
    for (let x = center.x - 1; x <= center.x + 1; x += 1)
      if (
        (x !== center.x || y !== center.y) &&
        x >= 0 &&
        y >= 0 &&
        x < width &&
        y < height
      )
        ring.push({ x, y });
  return ring;
}

/**
 * Section 6.3 row 7: whether `at` is a nest tile of `city` for its owner:
 * one of the eight tiles around the center; land; in that city's territory;
 * not a settlement site; holding no unit and no treasure chest; and, if it
 * is a Mountain, the owner has Engineering.
 */
export function isNestTileV7(
  state: Pick<
    GameStateV7,
    "board" | "units" | "treasureChests" | "players" | "cities"
  >,
  city: CityStateV7,
  at: CoordV7,
): boolean {
  const tile = tileAtV7(state.board, at);
  const owner = state.players.find((player) => player.id === city.ownerId);
  return (
    tile !== undefined &&
    owner !== undefined &&
    Math.max(Math.abs(at.x - city.at.x), Math.abs(at.y - city.at.y)) === 1 &&
    tile.biome !== null &&
    tile.territoryCityId === city.id &&
    tile.site === null &&
    canEnterTerrainV7({
      terrain: tile.terrain,
      movementMode: "GROUND",
      afloat: false,
      engineering: owner.researchedTechs.includes("ENGINEERING"),
      navigation: false,
      // An Egg is never Mountain-born (only the Ice Folk have the rule).
      mountainBorn: false,
      // The frozen sea: an Egg never lies on ice (a nest is land).
      ice: false,
    }) &&
    // The Dwarf revision section 5.3: the occupancy predicate.
    !tileOccupiedV7(state, at) &&
    !state.treasureChests.some((chest) => same(chest, at))
  );
}

/** The nest tiles of `city` in (y, x) order. */
export function nestTilesV7(
  state: Pick<
    GameStateV7,
    "board" | "units" | "treasureChests" | "players" | "cities"
  >,
  city: CityStateV7,
): readonly CoordV7[] {
  return ringV7(state.board.width, state.board.height, city.at).filter((at) =>
    isNestTileV7(state, city, at),
  );
}

/**
 * The nest tiles of the viewer's own `city` from the public view, in (y, x)
 * order. The ring of an own city, its units, and its chests are visible to
 * the owner, so this equals {@link nestTilesV7}.
 */
export function publicNestTilesV7(
  view: PlayerViewV7,
  city: Pick<PlayerViewV7["cities"][number], "id" | "at" | "ownerId">,
): readonly CoordV7[] {
  if (city.ownerId !== view.viewer.id) return [];
  return ringV7(view.board.width, view.board.height, city.at).filter((at) => {
    const tile = view.board.tiles[at.y * view.board.width + at.x];
    return (
      tile?.explored === true &&
      tile.biome !== null &&
      tile.territoryCityId === city.id &&
      tile.site === null &&
      canEnterTerrainV7({
        terrain: tile.terrain,
        movementMode: "GROUND",
        afloat: false,
        engineering: view.viewer.researchedTechs.includes("ENGINEERING"),
        navigation: false,
        mountainBorn: false,
        ice: false,
      }) &&
      // The Dwarf revision section 5.3: the occupancy predicate.
      !tileOccupiedV7(view, at) &&
      !view.treasureChests.some((chest) => same(chest, at))
    );
  });
}

/**
 * The unit an Egg hatches into (section 6.4): the same unit ID, owner, home
 * city, role, and tile in land form at the role's full HP with no kills.
 */
export function hatchedUnitV7(
  roster: FactionRosterV7,
  egg: UnitStateV7,
  activation: UnitActivationV7,
): UnitStateV7 {
  // An Egg is never controlled, so its kind is its owner's.
  const rule = unitRoleRuleV7(roster, egg);
  return {
    ...egg,
    form: "LAND",
    hp: rule.maxHp,
    maxHp: rule.maxHp,
    kills: 0,
    veteran: false,
    captureEligible: false,
    activation,
  };
}

/**
 * Drops `eggs` entries whose unit is no longer an Egg on the board (it died,
 * was abandoned, or was removed with its city or its owner). Every reducer
 * output runs through this before validation.
 */
export function prunedEggsV7(state: GameStateV7): GameStateV7 {
  if (state.eggs.length === 0) return state;
  const eggIds = new Set(
    state.units
      .filter((unit) => unit.hp > 0 && unit.form === "EGG")
      .map((unit) => unit.id),
  );
  const eggs = state.eggs.filter((entry) => eggIds.has(entry.unitId));
  return eggs.length === state.eggs.length ? state : { ...state, eggs };
}

/** Inserts or replaces one countdown entry, keeping the list sorted. */
export function withEggV7(
  eggs: readonly EggStatusV7[],
  entry: EggStatusV7,
): readonly EggStatusV7[] {
  return [
    ...eggs.filter((item) => item.unitId !== entry.unitId),
    {
      unitId: entry.unitId,
      turnsRemaining: entry.turnsRemaining,
      laidThisTurn: entry.laidThisTurn,
    },
  ].sort((left, right) => left.unitId - right.unitId);
}

/**
 * Hatches the Egg `eggUnitId` in place (sections 6.4 and 6.5): the unit
 * becomes its land-form role at full HP with `activation`, its `eggs` entry
 * is removed, and it reveals its sight. Appends `EGG_HATCHED`; the caller
 * emits `TILES_REVEALED` from the returned tiles.
 */
export function hatchEggV7(
  state: GameStateV7,
  eggUnitId: UnitId,
  activation: UnitActivationV7,
  cause: "TIME" | "SHAMAN",
  sourceUnitId: UnitId | null,
  events: DomainEventV7[],
): { readonly state: GameStateV7; readonly revealed: readonly CoordV7[] } {
  const egg = state.units.find(
    (unit) => unit.id === eggUnitId && unit.hp > 0 && unit.form === "EGG",
  );
  // Section 6.4: an Egg is alone on its tile; a violation is internal.
  if (
    egg === undefined ||
    state.units.some(
      (unit) => unit.id !== egg.id && unit.hp > 0 && same(unit.at, egg.at),
    )
  )
    throw new RangeError("INVALID_STATE");
  const hatched = hatchedUnitV7(state, egg, activation);
  const units = state.units.map((unit) =>
    unit.id === egg.id ? hatched : unit,
  );
  const hatchedState: GameStateV7 = {
    ...state,
    units,
    eggs: state.eggs.filter((entry) => entry.unitId !== egg.id),
  };
  events.push({
    kind: "EGG_HATCHED",
    playerId: egg.ownerId,
    unitId: egg.id,
    role: egg.role,
    at: { x: egg.at.x, y: egg.at.y },
    cause,
    sourceUnitId,
  });
  const reveal = revealFromV7(
    hatchedState,
    egg.ownerId,
    hatched.at,
    unitSightRadiusAtV7(hatchedState, hatched),
  );
  return {
    state: {
      ...hatchedState,
      players: hatchedState.players.map((player) =>
        player.id === egg.ownerId
          ? { ...player, explored: reveal.explored }
          : player,
      ),
    },
    revealed: reveal.revealed,
  };
}

/**
 * The Start Turn hatch step of `playerId` (section 6.4), run after Plague
 * and its chain and before Windmill healing: in ascending unit ID, each of
 * the player's Eggs has `laidThisTurn` cleared and counts down by one; at 0
 * it hatches with a fresh activation. One `EGG_HATCHED` per hatch, then one
 * `TILES_REVEALED` for the step when anything was revealed.
 */
export function resolveStartTurnHatchV7(
  state: GameStateV7,
  playerId: PlayerId,
): { readonly state: GameStateV7; readonly events: readonly DomainEventV7[] } {
  if (state.eggs.length === 0) return { state, events: [] };
  const own = new Set(
    state.units
      .filter(
        (unit) =>
          unit.ownerId === playerId && unit.hp > 0 && unit.form === "EGG",
      )
      .map((unit) => unit.id),
  );
  if (own.size === 0) return { state, events: [] };
  const events: DomainEventV7[] = [];
  const revealed: CoordV7[] = [];
  let current: GameStateV7 = {
    ...state,
    eggs: state.eggs.map((entry) =>
      own.has(entry.unitId)
        ? {
            unitId: entry.unitId,
            turnsRemaining: entry.turnsRemaining - 1,
            laidThisTurn: false,
          }
        : entry,
    ),
  };
  for (const entry of current.eggs) {
    if (!own.has(entry.unitId) || entry.turnsRemaining > 0) continue;
    const hatched = hatchEggV7(
      current,
      entry.unitId,
      freshActivationV7(),
      "TIME",
      null,
      events,
    );
    current = hatched.state;
    revealed.push(...hatched.revealed);
  }
  if (revealed.length > 0)
    events.push({
      kind: "TILES_REVEALED",
      playerId,
      tiles: [
        ...new Map(revealed.map((at) => [`${at.y},${at.x}`, at])).values(),
      ].sort((left, right) => left.y - right.y || left.x - right.x),
    });
  return { state: current, events };
}

const same = (left: CoordV7, right: CoordV7): boolean =>
  left.x === right.x && left.y === right.y;
