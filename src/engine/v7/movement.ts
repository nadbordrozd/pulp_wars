import type { PlayerId } from "../model/ids";
import {
  EMBARKED_MOVE_V7,
  GLACIER_ICE_MOVE_BONUS_V7,
  canCrossWaterV7,
  canEnterTerrainV7,
  flyerMayStandOnSiteV7,
  isIceAtV7,
  unitIsIceboundV7,
  isMindControlledV7,
  technologyCapabilitiesV7,
  ownerResearchedTechsV7,
  unitCapabilitiesV7,
  terrainStopsMoveV7,
  unitFliesV7,
  unitIsMountainBornV7,
  unitMovementModeV7,
  unitRoleRuleV7,
  type MovementModeV7,
} from "../rules/ruleset-v7";
import { berserkIgnoresZocV7, berserkMoveBonusV7 } from "./berserk";
import { sugarRushMoveBonusV7 } from "./candy";
import {
  glazeStepAppliesV7,
  hopJumpedTileV7,
  hopLandingsV7,
  moveStepLimitV7,
  unitHopsV7,
} from "./candy-abilities";
import {
  arePlayersAlliedV7,
  arePlayersHostileV7,
  cooperativeAlliesV7,
  isActivePortV7,
} from "./economy";
import {
  deepSnowStopsUnitV7,
  knownWinterV7,
  unitAvoidsForeignSitesV7,
  unitGlidesV7,
  unitIgnoresZocStopsV7,
  winterV7,
} from "./ice-folk";
import {
  isUnitVisibleToPlayerV7,
  withUnitAtForObservationV7,
} from "./observation";
import { iceIndexSetV7, unitKindWalksIceV7, unitSlidesV7 } from "./ice";
import { tileAtV7 } from "./spatial-economy";
import type {
  CoordV7,
  GameStateV7,
  PlayerStateV7,
  TileStateV7,
  UnitStateV7,
} from "./types";
import { isNeutralOwnerV7 } from "./types";
import { gateAtV7 } from "./curiosities";
import { barricadeAtV7, moundAtV7, tileOccupiedV7 } from "./units";
import type { PlayerTileViewV7, PlayerViewV7, PublicUnitV7 } from "./view";

/**
 * The giants' signatures (docs/product/RULESET_7_GIANTS.md section 6.5):
 * Overstride. A land-form unit whose role, under its kind, has
 * `OVERSTRIDE` (the Colossus) passes units and Eggs of any owner like a
 * flyer (never ending on one) and is never stopped by a hostile zone of
 * control; every other walker rule stays.
 */
export function unitOverstridesV7(
  roster: Parameters<typeof unitRoleRuleV7>[0],
  unit: Parameters<typeof unitRoleRuleV7>[1] & {
    readonly form: UnitStateV7["form"];
  },
): boolean {
  return (
    unit.form === "LAND" &&
    unitRoleRuleV7(roster, unit).abilities.includes("OVERSTRIDE")
  );
}

export type MovementFailureReasonV7 =
  | "EMPTY_PATH"
  | "BUDGET_EXCEEDED"
  | "NOT_ADJACENT"
  | "OUT_OF_BOUNDS"
  | "OCCUPIED"
  | "ENGINEERING_REQUIRED"
  | "UNEXPLORED_INTERMEDIATE"
  | "MOUNTAIN_STOPS_MOVE"
  | "FOREST_STOPS_MOVE"
  | "ZOC_STOPS_MOVE"
  | "ALLY_TERRITORY_FORBIDDEN"
  // The Dwarf revision section 5.4: a rider cannot end a Move on a neutral
  // village center or on the center of a city it does not own on the turn
  // it surfaced. (A flyer and a Sabretooth were refused there too before any
  // unit could capture, `pulp_wars-ke95`.)
  | "SETTLEMENT_FORBIDDEN"
  // The Ice Folk revision section 6.2 (3): deep snow ends the Move of
  // another faction's ground unit, so a path cannot continue past it.
  | "SNOW_STOPS_MOVE"
  // The Dwarf revision section 5.3: no Move ends on a mound tile.
  | "MOUND"
  // Dwarf crowd control (`pulp_wars-w49.33`): no Move enters a Barricade.
  | "BARRICADE"
  // The frozen sea (docs/product/RULESET_7_NAVAL_BRANCH.md sections 8.6,
  // 8.7, and 8.9): a path that stops or turns where a slide continues; a
  // path that continues past an ice tile a slipping unit entered; a Move of
  // an icebound unit.
  | "SLIDE_FORCED"
  | "ICE_STOPS_MOVE"
  | "ICEBOUND"
  // Map curiosities round 2 (section 28.2): a Dimensional Gate ends every
  // Move that enters it, so a path cannot continue past one.
  | "GATE_STOPS_MOVE"
  // The Candy redesign (docs/product/RULESET_7_CANDY_REDESIGN.md sections
  // 6.2 and 7.7): a Stuck unit's Move of more than one step; a hop over
  // water or ice.
  | "STUCK"
  | "HOP_ILLEGAL";

export type MovementPathResultV7 =
  | {
      readonly legal: true;
      readonly destination: CoordV7;
      readonly traversedPath: readonly CoordV7[];
      readonly spentPoints2: number;
      readonly stopped: boolean;
      /**
       * The frozen sea (section 8.6), route searches only: the path ends on
       * an ice tile from which the unit's slide continues, in this
       * direction. Such a path is a prefix, never a legal `MOVE` (which is
       * rejected with `SLIDE_FORCED`); only the pass-through probe of the
       * enumerations returns it.
       */
      readonly slideContinues?: { readonly dx: number; readonly dy: number };
      /**
       * Ice Folk Freeze (`pulp_wars-w49.37`, Glacier), route searches only:
       * the probe's path has entered ice (`iceTouched`), or it is over the
       * budget it has without ice and has not (`glacierPending`: never a
       * destination). Absent for a unit without the Glacier bonus.
       */
      readonly iceTouched?: boolean;
      readonly glacierPending?: boolean;
      readonly explored: readonly CoordV7[];
      readonly revealed: readonly CoordV7[];
      readonly interruption: {
        readonly at: CoordV7;
        readonly reason:
          | "OCCUPIED"
          | "ENGINEERING_REQUIRED"
          | "ZOC"
          // A surfaced rider entered an unexplored cell that is a
          // settlement center it cannot stand on.
          | "SETTLEMENT_FORBIDDEN"
          // The Ice Folk revision: Snow the mover could not know about.
          | "SNOW"
          // The Dwarf revision: a mound on a tile the mover had not
          // explored, met on the last tile of the Move.
          | "MOUND"
          // Dwarf crowd control: a Barricade the mover did not know of.
          | "BARRICADE"
          // The frozen sea: ice a slipping unit had not known before.
          | "ICE";
      } | null;
    }
  | { readonly legal: false; readonly reason: MovementFailureReasonV7 };

export interface ReachablePathV7 {
  readonly destination: CoordV7;
  readonly path: readonly CoordV7[];
  readonly spentPoints2: number;
}

/**
 * Validates ordinary movement. A Move passes through tiles held by the
 * mover's own units as if they were empty, but never ends on one.
 *
 * The Martian revision (section 7): a land-form walker or flyer enters a
 * Mountain without Engineering and is never stopped by terrain; it may step
 * onto water (a walker Shallow Water, a flyer also Deep Water with
 * Navigation), and a Move that ends there self-launches it (the reducer
 * embarks it). A flyer also passes over every unit and ignores hostile zones
 * of control; since `pulp_wars-ke95` it may end on a settlement center it
 * does not own (and capture there). Terrain entry goes through the shared
 * `canEnterTerrainV7` and `canCrossWaterV7`.
 */
export function validateMovementPathV7(
  state: GameStateV7,
  unit: UnitStateV7,
  path: readonly CoordV7[],
): MovementPathResultV7 {
  return validateMovementPathWithOptionsV7(state, unit, path, false);
}

/**
 * The Move budget in half-points before Glacier: the role's Move (the
 * Candy revision section 5.2: one more point for a Rushed unit's ordinary
 * Move, never its Escape Move and never afloat; Goblin explosions and
 * Berserk, `pulp_wars-w49.35`: so for a Berserk unit's), or the embarked
 * budget.
 */
function baseMoveBudget2V7(
  lookup: GameStateV7 | PlayerViewV7,
  unit: UnitStateV7 | PublicUnitV7,
): number {
  return (
    (unit.form === "EMBARKED"
      ? EMBARKED_MOVE_V7
      : unitRoleRuleV7(lookup, unit).move +
        sugarRushMoveBonusV7(lookup, unit) +
        berserkMoveBonusV7(lookup, unit)) * 2
  );
}

/**
 * Ice Folk Freeze (`pulp_wars-w49.37`, RULESET_7_CURRENT.md section 21.16,
 * Glacier): the half-points Glacier adds to the `MOVE` of a land-form unit
 * of the Ice Folk kind whose path includes an ice tile (0 for every other
 * unit, and in a match without ice).
 */
function glacierBonus2V7(
  lookup: GameStateV7 | PlayerViewV7,
  unit: UnitStateV7 | PublicUnitV7,
  capabilities: { readonly iceCover: boolean },
  iceCount: number,
): number {
  return unit.form === "LAND" &&
    iceCount > 0 &&
    capabilities.iceCover &&
    unitKindWalksIceV7(lookup, unit)
    ? GLACIER_ICE_MOVE_BONUS_V7 * 2
    : 0;
}

/**
 * Route searches only (`passThroughProbe`): a probe is validated with the
 * Glacier half-points whether or not its path has reached ice yet, so a
 * search can extend it onto ice. `glacierPending` marks a probe that is
 * over the base budget and has not touched ice (never a destination);
 * `iceTouched` keys the search state.
 */
function withGlacierProbeV7(
  result: MovementPathResultV7,
  baseBudget2: number,
  glacier2: number,
  iceAt: (at: CoordV7) => boolean,
): MovementPathResultV7 {
  if (!result.legal || glacier2 === 0) return result;
  const iceTouched = result.traversedPath.some(iceAt);
  return {
    ...result,
    iceTouched,
    glacierPending: result.spentPoints2 > baseBudget2 && !iceTouched,
  };
}

/**
 * `passThroughProbe` treats the last step as an intermediate one for
 * occupancy only, so an enumeration can extend a path across an own unit.
 */
function validateMovementPathWithOptionsV7(
  state: GameStateV7,
  unit: UnitStateV7,
  path: readonly CoordV7[],
  passThroughProbe: boolean,
): MovementPathResultV7 {
  if (path.length === 0) return { legal: false, reason: "EMPTY_PATH" };
  const player = requirePlayer(state, unit.ownerId);
  // The Mind Control revision section 5.2: movement unlocks are unit-level
  // (the controller's research through the unit's kind's tree).
  const capabilities = unitCapabilitiesV7(state, unit, player.researchedTechs);
  const baseBudget2 = baseMoveBudget2V7(state, unit);
  const iceIndex = iceIndexSetV7(state, state.board.width);
  const glacier2 = glacierBonus2V7(state, unit, capabilities, iceIndex.size);
  const onIce = (at: CoordV7): boolean =>
    iceIndex.has(at.y * state.board.width + at.x);
  const result = validateMovementPathCoreV7(
    state,
    unit,
    path,
    passThroughProbe,
    capabilities,
    baseBudget2 +
      (glacier2 > 0 && (passThroughProbe || path.some(onIce)) ? glacier2 : 0),
  );
  return passThroughProbe
    ? withGlacierProbeV7(result, baseBudget2, glacier2, onIce)
    : result;
}

function validateMovementPathCoreV7(
  state: GameStateV7,
  unit: UnitStateV7,
  path: readonly CoordV7[],
  passThroughProbe: boolean,
  capabilities: ReturnType<typeof unitCapabilitiesV7>,
  budget2: number,
): MovementPathResultV7 {
  const player = requirePlayer(state, unit.ownerId);
  // An embarked machine is an ordinary embarked unit (section 7.3).
  const mode: MovementModeV7 =
    unit.form === "LAND" ? unitMovementModeV7(state, unit) : "GROUND";
  const flies = mode === "FLY";
  // The Ice Folk revision section 7.1: Mountain-born (land form only).
  const mountainBorn = unitIsMountainBornV7(state, unit);
  const navigation = player.researchedTechs.includes("NAVIGATION");
  const knownBeforeCommand = player.explored;
  let explored = player.explored;
  const revealed: CoordV7[] = [];
  const traversedPath: CoordV7[] = [];
  let current = unit.at;
  // Whether the tile being left is a usable Road node for the owner: it
  // alone decides the step cost (revision 18, section 4.1).
  let currentRoadNode = isUsableRoadNodeV7(state, player, current);
  let spentPoints2 = 0;
  // The Ice Folk revision (sections 6.1, 6.2, and 6.5): Snow is read once,
  // from the state before the command. An Ice Folk unit Glides (a step from
  // Snow onto Snow costs half); another faction's ground unit stops on entering
  // Snow, and Snow it could not know about (a hidden Witch's Blizzard)
  // interrupts the Move. A Sabretooth Prowls through zones of control.
  const winter = winterV7(state);
  const glides = unitGlidesV7(state, unit);
  const snowStopped =
    winter.snow.size > 0 &&
    deepSnowStopsUnitV7(
      state,
      unit,
      capabilities.forestMovementFreedomRoles.includes(unit.role),
    );
  const knownSnow = snowStopped
    ? knownWinterV7(
        state,
        player.id,
        new Set(
          knownBeforeCommand.map((at) => at.y * state.board.width + at.x),
        ),
      ).snow
    : winter.snow;
  const snowAt = (at: CoordV7): boolean =>
    winter.snow.size > 0 && winter.snow.has(at.y * state.board.width + at.x);
  // Goblin explosions and Berserk (`pulp_wars-w49.35`): a Berserk unit, like
  // a Prowler, is not stopped by entering a hostile zone of control.
  const prowls =
    unitIgnoresZocStopsV7(state, unit) || berserkIgnoresZocV7(state, unit);
  // The giants' signatures (section 6.5): Overstride.
  const overstrides = unitOverstridesV7(state, unit);
  const ownSitesOnly = unitAvoidsForeignSitesV7(state, unit);
  let currentSnow = snowAt(current);
  // The frozen sea (docs/product/RULESET_7_NAVAL_BRANCH.md sections 8.3,
  // 8.6, 8.7, and 8.9): ice is read once, from the state before the command.
  // It is ground for a land-form unit and closed to a unit afloat; an Ice
  // Folk unit slides on it (forced, at no cost), another faction's ground
  // unit slips (its Move ends there), and an icebound unit never moves.
  const iceSet = iceIndexSetV7(state, state.board.width);
  const iceAt = (at: CoordV7): boolean =>
    iceSet.size > 0 && iceSet.has(at.y * state.board.width + at.x);
  if (unit.form !== "LAND" && iceAt(unit.at))
    return { legal: false, reason: "ICEBOUND" };
  const slides = iceSet.size > 0 && unitSlidesV7(state, unit);
  const iceFolkKind = unitKindWalksIceV7(state, unit);
  /** The direction the next step must take: the slide continues. */
  let slide: { readonly dx: number; readonly dy: number } | null = null;
  // The Candy redesign (RULESET_7_CANDY_REDESIGN.md sections 6.2 and 7.7):
  // a Stuck unit's Move has at most one step (a slide is not a step); a
  // Chocolate Bunny's Move may contain one hop.
  const stepLimit = moveStepLimitV7(state, unit.id);
  const hops = unitHopsV7(state, unit);
  let hopUsed = false;
  let steps = 0;

  for (let index = 0; index < path.length; index += 1) {
    const step = path[index];
    if (step === undefined) throw new RangeError("INVALID_STATE");
    const jumped =
      chebyshev(current, step) === 2 && hops && !hopUsed && slide === null
        ? hopJumpedTileV7(current, step)
        : null;
    if (chebyshev(current, step) !== 1 && jumped === null)
      return { legal: false, reason: "NOT_ADJACENT" };
    if (jumped !== null) {
      // Section 7.7: the jumped tile is explored and not water or ice; it
      // is not entered (no cost, stop, ZOC, eating, or reveal of its own).
      const jumpedTile = tileAtV7(state.board, jumped);
      if (jumpedTile === undefined)
        return { legal: false, reason: "OUT_OF_BOUNDS" };
      if (!contains(explored, jumped))
        return { legal: false, reason: "UNEXPLORED_INTERMEDIATE" };
      if (jumpedTile.biome === null)
        return { legal: false, reason: "HOP_ILLEGAL" };
      hopUsed = true;
    }
    // Section 8.6: the slide is forced; a path that turns is rejected.
    const sliding = slide !== null;
    if (!sliding) {
      steps += 1;
      if (steps > stepLimit) return { legal: false, reason: "STUCK" };
    }
    if (
      slide !== null &&
      (step.x !== current.x + slide.dx || step.y !== current.y + slide.dy)
    )
      return { legal: false, reason: "SLIDE_FORCED" };
    slide = null;
    const tile = tileAtV7(state.board, step);
    if (tile === undefined) return { legal: false, reason: "OUT_OF_BOUNDS" };
    const wasExplored = contains(explored, step);
    const wasKnownBeforeCommand = contains(knownBeforeCommand, step);
    const stepIce = iceAt(step);
    // The Ice Folk balance revision (`pulp_wars-1wy.3`,
    // RULESET_7_BALANCE_MARTIAN_ICE.md section 6.1): Glide is a step from a
    // Snow tile onto a Snow tile (both ends read from the state before the
    // command); it never adds to a Road node's half cost. A slid tile costs
    // nothing.
    const stepSnow = snowAt(step);
    // The Candy redesign (section 7.2): a step onto a Glazed tile costs a
    // Road step's 1 for the active seat's land-form units; a hop always
    // costs one ordinary step.
    spentPoints2 += sliding
      ? 0
      : jumped !== null
        ? 2
        : currentRoadNode ||
            (glides && currentSnow && stepSnow) ||
            glazeStepAppliesV7(state, unit, step)
          ? 1
          : 2;
    if (spentPoints2 > budget2)
      return { legal: false, reason: "BUDGET_EXCEEDED" };
    const owner = tileOwner(state, tile);
    if (owner !== null && arePlayersAlliedV7(state, player.id, owner))
      return { legal: false, reason: "ALLY_TERRITORY_FORBIDDEN" };
    // Dwarf crowd control (`pulp_wars-w49.33`): a Barricade blocks every
    // unit's Move through and onto its tile, a flyer's too. One the mover
    // knew of (on a tile it had explored) rejects the Move; one it met on a
    // tile it had not explored interrupts it there (reason `BARRICADE`). An
    // unexplored tile in the middle of a path is refused as ever below.
    if (
      barricadeAtV7(state, step) !== undefined &&
      (wasExplored || index === path.length - 1)
    ) {
      if (wasKnownBeforeCommand) return { legal: false, reason: "BARRICADE" };
      const entered = lastFreeEnteredPath(
        state,
        unit,
        traversedPath,
        ownSitesOnly,
      );
      return {
        legal: true,
        destination: entered.at(-1) ?? unit.at,
        traversedPath: entered,
        spentPoints2,
        stopped: true,
        explored,
        revealed: unique(revealed),
        interruption: { at: step, reason: "BARRICADE" },
      };
    }
    const occupant = state.units.find(
      (candidate) =>
        candidate.id !== unit.id &&
        candidate.hp > 0 &&
        same(candidate.at, step),
    );
    // A flyer passes over a unit of any owner; no Move ends on a unit. The
    // frozen sea (section 10): a sliding unit never passes a unit on ice,
    // own or not.
    const passesOwnUnit =
      occupant !== undefined &&
      (occupant.ownerId === unit.ownerId || flies || overstrides) &&
      !(slides && stepIce) &&
      (passThroughProbe || index < path.length - 1);
    const occupied = occupant !== undefined && !passesOwnUnit;
    // The Dwarf revision section 5.3: a Move may pass over a mound tile but
    // never ends on one (the occupancy predicate). A mound on a tile the
    // mover had not explored interrupts the Move (reason `MOUND`).
    const endsOnMound =
      occupant === undefined &&
      !passThroughProbe &&
      index === path.length - 1 &&
      tileOccupiedV7(state, step, unit.id);
    if (endsOnMound) {
      if (wasKnownBeforeCommand) return { legal: false, reason: "MOUND" };
      const entered = lastFreeEnteredPath(
        state,
        unit,
        traversedPath,
        ownSitesOnly,
      );
      return {
        legal: true,
        destination: entered.at(-1) ?? unit.at,
        traversedPath: entered,
        spentPoints2,
        stopped: true,
        explored,
        revealed: unique(revealed),
        interruption: { at: step, reason: "MOUND" },
      };
    }
    // Section 8.3: an ice tile is ground, not water, for a land-form unit.
    const water =
      (tile.terrain === "SHALLOW_WATER" || tile.terrain === "DEEP_WATER") &&
      !stepIce;
    // Section 8.11: a unit of the Ice Folk kind never embarks.
    const autoEmbark =
      unit.form === "LAND" &&
      !iceFolkKind &&
      index === path.length - 1 &&
      (tile.improvement === "PORT" || tile.improvement === "SHIPYARD") &&
      tile.territoryCityId !== null &&
      state.cities.some(
        (city) =>
          city.id === tile.territoryCityId && city.ownerId === unit.ownerId,
      ) &&
      player.researchedTechs.includes("SHORECRAFT") &&
      isActivePortV7(state, step, unit.ownerId);
    // Terrain entry through the shared helper: a land-form unit stands on
    // land it can enter, embarks at an own active Port, or (a machine)
    // crosses water; an afloat unit stays on water it can enter.
    const engineeringRequired =
      unit.form === "LAND"
        ? water
          ? (!autoEmbark &&
              !canCrossWaterV7({
                terrain: tile.terrain,
                movementMode: mode,
                navigation,
              })) ||
            (tile.terrain === "DEEP_WATER" && !navigation)
          : !canEnterTerrainV7({
              terrain: tile.terrain,
              movementMode: mode,
              afloat: false,
              engineering: capabilities.mountainMovement,
              navigation,
              mountainBorn,
              ice: stepIce,
            })
        : !canEnterTerrainV7({
            terrain: tile.terrain,
            movementMode: "GROUND",
            afloat: true,
            engineering: capabilities.mountainMovement,
            navigation,
            mountainBorn: false,
            ice: stepIce,
          });
    // The Dwarf revision section 5.4: a surfaced rider may pass over a
    // settlement center it does not own but never ends a Move there.
    const forbiddenSite =
      ownSitesOnly &&
      !passThroughProbe &&
      index === path.length - 1 &&
      !flyerMayStandOnSiteV7(
        tile.site,
        state.cities.find((city) => same(city.at, step))?.ownerId ?? null,
        unit.ownerId,
      );
    if (forbiddenSite && !occupied && !engineeringRequired) {
      if (wasKnownBeforeCommand)
        return { legal: false, reason: "SETTLEMENT_FORBIDDEN" };
      // An unexplored center: the Move is accepted and interrupted, like a
      // Move into a hidden unit, so a rejection reveals nothing.
      const entered = lastFreeEnteredPath(
        state,
        unit,
        traversedPath,
        ownSitesOnly,
      );
      return {
        legal: true,
        destination: entered.at(-1) ?? unit.at,
        traversedPath: entered,
        spentPoints2,
        stopped: true,
        explored,
        revealed: unique(revealed),
        interruption: { at: step, reason: "SETTLEMENT_FORBIDDEN" },
      };
    }
    if (occupied || engineeringRequired) {
      const occupantVisible =
        occupant !== undefined &&
        isUnitVisibleToPlayerV7(state, player.id, occupant);
      if (occupantVisible || (engineeringRequired && wasKnownBeforeCommand))
        return {
          legal: false,
          reason: occupied ? "OCCUPIED" : "ENGINEERING_REQUIRED",
        };
      const entered = lastFreeEnteredPath(
        state,
        unit,
        traversedPath,
        ownSitesOnly,
      );
      return {
        legal: true,
        destination: entered.at(-1) ?? unit.at,
        traversedPath: entered,
        spentPoints2,
        stopped: true,
        explored,
        revealed: unique(revealed),
        interruption: {
          at: step,
          reason: occupied ? "OCCUPIED" : "ENGINEERING_REQUIRED",
        },
      };
    }
    // Tuning 4: Fieldcraft's Forest march frees every role in Forest.
    const ignoresForest =
      capabilities.forestMarch ||
      capabilities.forestMovementFreedomRoles.includes(unit.role);
    const sightRadius = unitSightRadiusAtV7(state, unit, tile);
    const sight = revealRadius(state, explored, step, sightRadius);
    explored = sight.explored;
    revealed.push(...sight.revealed);
    const observationState = withUnitAtForObservationV7(state, unit.id, step);
    // The Martian revision section 7.2: a flyer ignores hostile ZOC; the Ice
    // Folk revision section 7.7: a Sabretooth is not stopped by it.
    const entersZoc =
      !flies &&
      !prowls &&
      !overstrides &&
      inHostileZoc(observationState, { ...unit, at: step }, step, explored);
    const newlyEncounteredZoc =
      entersZoc &&
      !inHostileZoc(state, { ...unit, at: step }, step, knownBeforeCommand);
    // The stop is waived only on a Road edge: both ends usable Road nodes.
    const stepRoadNode = isUsableRoadNodeV7(state, player, step);
    // The Martian revision section 7.1: a walker or flyer is never stopped
    // by terrain; the Ice Folk revision section 7.1: nor is a Mountain-born
    // unit by a Mountain.
    // A hop's landing is never a Road edge (the Candy redesign, 7.7).
    const roadEdge = currentRoadNode && stepRoadNode && jumped === null;
    // The frozen sea section 8.7: slip (a ground unit of another kind ends
    // its Move on entering ice).
    const iceStops =
      stepIce && unit.form === "LAND" && mode === "GROUND" && !iceFolkKind;
    const groundStops = terrainStopsMoveV7({
      terrain: tile.terrain,
      movementMode: mode,
      mountainBorn,
      ignoresForest,
      roadEdge,
      ice: stepIce && unit.form === "LAND",
      iceFolk: iceFolkKind,
    });
    // The Ice Folk revision section 6.2 (3): deep snow, waived by a Road edge.
    const snowStops = snowStopped && stepSnow && !roadEdge;
    const terrainStops = groundStops || snowStops;
    // Map curiosities round 2 (section 28.2): a gate stops every Move that
    // enters it, for every movement mode.
    const gateStops =
      state.curiosities.length > 0 &&
      gateAtV7(state.curiosities, step) !== null;
    const stops = !wasExplored || terrainStops || entersZoc || gateStops;
    // Section 8.6: a step that entered ice the mover knew of continues
    // straight on while the next tile in that direction is on the board,
    // known before the command, ice, and free of units and mounds, and
    // while the tile it is on is not in a hostile zone of control.
    if (slides && stepIce && wasKnownBeforeCommand && !stops) {
      const dx = step.x - current.x;
      const dy = step.y - current.y;
      const next = { x: step.x + dx, y: step.y + dy };
      if (
        tileAtV7(state.board, next) !== undefined &&
        contains(knownBeforeCommand, next) &&
        iceAt(next) &&
        !tileOccupiedV7(state, next, unit.id)
      )
        slide = { dx, dy };
    }
    traversedPath.push(step);
    current = step;
    currentRoadNode = stepRoadNode;
    currentSnow = stepSnow;
    if (stops && index < path.length - 1) {
      // The frozen sea: ice a slipping unit had not known before the
      // command interrupts the Move there instead of rejecting it.
      if (iceStops && wasExplored && !wasKnownBeforeCommand) {
        const entered = lastFreeEnteredPath(
          state,
          unit,
          traversedPath,
          ownSitesOnly,
        );
        return {
          legal: true,
          destination: entered.at(-1) ?? unit.at,
          traversedPath: entered,
          spentPoints2,
          stopped: true,
          explored,
          revealed: unique(revealed),
          interruption: { at: step, reason: "ICE" },
        };
      }
      // Section 6.5: Snow the mover could not know about (a hidden Witch's
      // Blizzard) interrupts the Move there instead of rejecting it. Every
      // Blizzard tile is next to its Witch, so this Move usually meets her
      // zone of control too; the Snow is reported.
      if (
        snowStops &&
        wasExplored &&
        !groundStops &&
        !knownSnow.has(step.y * state.board.width + step.x)
      ) {
        const entered = lastFreeEnteredPath(
          state,
          unit,
          traversedPath,
          ownSitesOnly,
        );
        return {
          legal: true,
          destination: entered.at(-1) ?? unit.at,
          traversedPath: entered,
          spentPoints2,
          stopped: true,
          explored,
          revealed: unique(revealed),
          interruption: { at: step, reason: "SNOW" },
        };
      }
      if (newlyEncounteredZoc) {
        const entered = lastFreeEnteredPath(
          state,
          unit,
          traversedPath,
          ownSitesOnly,
        );
        return {
          legal: true,
          destination: entered.at(-1) ?? unit.at,
          traversedPath: entered,
          spentPoints2,
          stopped: true,
          explored,
          revealed: unique(revealed),
          interruption: { at: step, reason: "ZOC" },
        };
      }
      return {
        legal: false,
        reason: !wasExplored
          ? "UNEXPLORED_INTERMEDIATE"
          : gateStops
            ? "GATE_STOPS_MOVE"
            : iceStops
              ? "ICE_STOPS_MOVE"
              : mode === "GROUND" &&
                  tile.terrain === "MOUNTAIN" &&
                  !mountainBorn
                ? "MOUNTAIN_STOPS_MOVE"
                : mode === "GROUND" &&
                    tile.terrain === "FOREST" &&
                    !ignoresForest
                  ? "FOREST_STOPS_MOVE"
                  : snowStops
                    ? "SNOW_STOPS_MOVE"
                    : "ZOC_STOPS_MOVE",
      };
    }
    if (stops)
      return {
        legal: true,
        destination: current,
        traversedPath,
        spentPoints2,
        stopped: true,
        explored,
        revealed: unique(revealed),
        interruption: null,
      };
  }
  // Section 8.6: a path that stops where a slide continues is rejected; a
  // route search extends it instead.
  if (slide !== null && !passThroughProbe)
    return { legal: false, reason: "SLIDE_FORCED" };
  return {
    legal: true,
    destination: current,
    traversedPath,
    spentPoints2,
    stopped: false,
    ...(slide === null ? {} : { slideContinues: slide }),
    explored,
    revealed: unique(revealed),
    interruption: null,
  };
}

export function reachableMovementPathsV7(
  state: GameStateV7,
  unit: UnitStateV7,
): readonly ReachablePathV7[] {
  const player = state.players.find(
    (candidate) => candidate.id === unit.ownerId,
  );
  // Revision 19 section 6.2: an Egg never moves.
  if (player === undefined || unit.form === "EGG") return [];
  const flies = unitFliesV7(state, unit);
  // The giants' signatures (section 6.5): Overstride passes every unit.
  const passesAll = flies || unitOverstridesV7(state, unit);
  // The Dwarf revision section 5.4: a surfaced rider never ends on a
  // settlement center it does not own.
  const ownSitesOnly = unitAvoidsForeignSitesV7(state, unit);
  // The Candy redesign (section 7.7): a Bunny's paths may hop once.
  const hops = unitHopsV7(state, unit);
  const queue: CoordV7[][] = [[]];
  const best = new Map<string, number>([[key(unit.at), 0]]);
  const results = new Map<string, ReachablePathV7>();
  while (queue.length > 0) {
    const path = queue.shift();
    if (path === undefined) break;
    const current = path.at(-1) ?? unit.at;
    const hopped = hops && pathHasHopV7(unit.at, path);
    const nextSteps = [
      ...adjacent(state, current),
      ...(hops && !hopped
        ? hopLandingsV7(current).filter(
            (at) => tileAtV7(state.board, at) !== undefined,
          )
        : []),
    ];
    for (const destination of nextSteps) {
      const candidate = [...path, destination];
      const validation = validateMovementPathWithOptionsV7(
        state,
        unit,
        candidate,
        true,
      );
      if (
        !validation.legal ||
        validation.traversedPath.length !== candidate.length
      )
        continue;
      const destinationKey = key(validation.destination);
      // The frozen sea (naval branch section 8.6): a prefix that ends where
      // a slide continues is a passing state of its own (the tile and the
      // direction), never a destination. The Candy redesign: a path that
      // has hopped is a state of its own (it may not hop again).
      const pending = validation.slideContinues;
      // Ice Folk Freeze (Glacier): a path that has touched ice has more
      // budget, so it is a search state of its own.
      const stateKey =
        (pending === undefined
          ? destinationKey
          : `${destinationKey}>${pending.dx},${pending.dy}`) +
        (validation.iceTouched === true ? "~ice" : "") +
        (hops && pathHasHopV7(unit.at, candidate) ? "^" : "");
      const prior = best.get(stateKey);
      if (prior !== undefined && prior <= validation.spentPoints2) continue;
      // An own-occupied tile is never a destination; it is only passed, and
      // only when the Move would not have to stop on it. The Martian
      // revision: a flyer passes every unit and ends on none; a surfaced
      // rider never ends on a settlement center it cannot stand on.
      const ownOccupied =
        state.units.some(
          (other) =>
            other.id !== unit.id &&
            other.hp > 0 &&
            (passesAll || other.ownerId === unit.ownerId) &&
            same(other.at, destination),
        ) ||
        // The Dwarf revision section 5.3: a mound tile is passed, never
        // ended on.
        moundAtV7(state, destination) !== undefined ||
        (ownSitesOnly &&
          !flyerMayStandOnSiteV7(
            tileAtV7(state.board, destination)?.site ?? null,
            state.cities.find((city) => same(city.at, destination))?.ownerId ??
              null,
            unit.ownerId,
          ));
      if (ownOccupied && validation.stopped) continue;
      best.set(stateKey, validation.spentPoints2);
      // The Candy redesign: a Bunny's destination keeps its cheapest path
      // (a hop and a walk may reach the same tile).
      const known = hops ? results.get(destinationKey) : undefined;
      if (
        !ownOccupied &&
        pending === undefined &&
        validation.glacierPending !== true &&
        (known === undefined || known.spentPoints2 > validation.spentPoints2)
      )
        results.set(destinationKey, {
          destination: validation.destination,
          path: candidate,
          spentPoints2: validation.spentPoints2,
        });
      if (!validation.stopped) queue.push(candidate);
    }
  }
  return [...results.values()].sort((a, b) =>
    compare(a.destination, b.destination),
  );
}

/**
 * The Candy redesign (section 7.7): whether `path` from `start` contains a
 * hop (two consecutive tiles two apart).
 */
function pathHasHopV7(start: CoordV7, path: readonly CoordV7[]): boolean {
  let current = start;
  for (const step of path) {
    if (chebyshev(current, step) === 2) return true;
    current = step;
  }
  return false;
}

/** Observation-only movement enumeration used by presentation and Normal AI. */
export function reachablePlayerMovementPathsV7(
  view: PlayerViewV7,
  unit: PublicUnitV7,
): readonly ReachablePathV7[] {
  // Revision 19 section 6.2: an Egg never moves.
  if (unit.form === "EGG") return [];
  const context = publicMovementContextV7(view);
  // The Dwarf revision section 5.4: a surfaced rider never ends on a
  // settlement center it does not own.
  const ownSitesOnly = unitAvoidsForeignSitesV7(view, unit);
  // The Candy redesign (section 7.7): a Bunny's paths may hop once.
  const hops = unitHopsV7(view, unit);
  const queue: CoordV7[][] = [[]];
  const best = new Map<string, number>([[key(unit.at), 0]]);
  const results = new Map<string, ReachablePathV7>();
  while (queue.length > 0) {
    const path = queue.shift();
    if (path === undefined) break;
    const current = path.at(-1) ?? unit.at;
    const hopped = hops && pathHasHopV7(unit.at, path);
    const nextSteps = [
      ...adjacentPublic(view, current),
      ...(hops && !hopped
        ? hopLandingsV7(current).filter((at) => publicCoordOnBoard(view, at))
        : []),
    ];
    for (const destination of nextSteps) {
      const candidate = [...path, destination];
      const validation = validatePlayerMovementPathWithContextV7(
        view,
        unit,
        candidate,
        context,
        true,
      );
      if (
        !validation.legal ||
        validation.traversedPath.length !== candidate.length
      )
        continue;
      const destinationKey = key(validation.destination);
      // The frozen sea (naval branch section 8.6): a prefix that ends where
      // a slide continues is a passing state of its own (the tile and the
      // direction), never a destination.
      const pending = validation.slideContinues;
      // Ice Folk Freeze (Glacier): a path that has touched ice has more
      // budget, so it is a search state of its own.
      const stateKey =
        (pending === undefined
          ? destinationKey
          : `${destinationKey}>${pending.dx},${pending.dy}`) +
        (validation.iceTouched === true ? "~ice" : "") +
        (hops && pathHasHopV7(unit.at, candidate) ? "^" : "");
      const prior = best.get(stateKey);
      if (prior !== undefined && prior <= validation.spentPoints2) continue;
      // An own-occupied tile is never a destination; it is only passed, and
      // only when the Move would not have to stop on it. A surfaced rider
      // never ends on a settlement center it cannot stand on.
      const ownOccupied =
        context.unitsByPosition
          .get(destinationKey)
          ?.some((other) => other.id !== unit.id) === true ||
        // The Dwarf revision section 5.3: a mound tile is passed, never
        // ended on (every mound on an explored tile is in the view).
        moundAtV7(view, destination) !== undefined ||
        (ownSitesOnly &&
          !publicFlyerMayStandV7(view, unit, publicTileAt(view, destination)));
      if (ownOccupied && validation.stopped) continue;
      best.set(stateKey, validation.spentPoints2);
      // The Candy redesign: a Bunny's destination keeps its cheapest path
      // (a hop and a walk may reach the same tile).
      const known = hops ? results.get(destinationKey) : undefined;
      if (
        !ownOccupied &&
        pending === undefined &&
        validation.glacierPending !== true &&
        (known === undefined || known.spentPoints2 > validation.spentPoints2)
      )
        results.set(destinationKey, {
          destination: validation.destination,
          path: candidate,
          spentPoints2: validation.spentPoints2,
        });
      if (!validation.stopped) queue.push(candidate);
    }
  }
  return [...results.values()].sort((left, right) =>
    compare(left.destination, right.destination),
  );
}

export function validatePlayerMovementPathV7(
  view: PlayerViewV7,
  unit: PublicUnitV7,
  path: readonly CoordV7[],
): MovementPathResultV7 {
  return validatePlayerMovementPathWithContextV7(
    view,
    unit,
    path,
    publicMovementContextV7(view),
    false,
  );
}

/**
 * Route-search form of `validatePlayerMovementPathV7`: an own unit on the
 * last step is passed instead of rejected, so a private search can extend a
 * path across it. Such a path is never a legal `MOVE` by itself; the caller
 * must not treat an own-occupied tile as an end tile.
 */
export function validatePlayerMovementPassagePathV7(
  view: PlayerViewV7,
  unit: PublicUnitV7,
  path: readonly CoordV7[],
): MovementPathResultV7 {
  return validatePlayerMovementPathWithContextV7(
    view,
    unit,
    path,
    publicMovementContextV7(view),
    true,
  );
}

interface PublicMovementContextV7 {
  readonly capabilities: ReturnType<typeof technologyCapabilitiesV7>;
  readonly ownedCityKeys: ReadonlySet<string>;
  readonly unitsByPosition: ReadonlyMap<string, readonly PublicUnitV7[]>;
  readonly hostileZocKeys: Map<string, ReadonlySet<string>>;
  /** The frozen sea: the board indices of the ice the viewer knows of. */
  readonly ice: ReadonlySet<number>;
}

const PUBLIC_MOVEMENT_CONTEXTS_V7 = new WeakMap<
  PlayerViewV7,
  PublicMovementContextV7
>();

function publicMovementContextV7(view: PlayerViewV7): PublicMovementContextV7 {
  const cached = PUBLIC_MOVEMENT_CONTEXTS_V7.get(view);
  if (cached !== undefined) return cached;
  const unitsByPosition = new Map<string, PublicUnitV7[]>();
  for (const unit of view.units) {
    if (unit.hp <= 0) continue;
    const position = key(unit.at);
    const occupants = unitsByPosition.get(position);
    if (occupants === undefined) unitsByPosition.set(position, [unit]);
    else occupants.push(unit);
  }
  const context: PublicMovementContextV7 = {
    capabilities: technologyCapabilitiesV7(
      view.viewer.researchedTechs,
      view.viewer.faction,
    ),
    ownedCityKeys: new Set(
      view.cities
        .filter((city) => city.ownerId === view.viewer.id)
        .map((city) => key(city.at)),
    ),
    unitsByPosition,
    hostileZocKeys: new Map(),
    ice: iceIndexSetV7(view, view.board.width),
  };
  PUBLIC_MOVEMENT_CONTEXTS_V7.set(view, context);
  return context;
}

function validatePlayerMovementPathWithContextV7(
  view: PlayerViewV7,
  unit: PublicUnitV7,
  path: readonly CoordV7[],
  context: PublicMovementContextV7,
  passThroughProbe: boolean,
): MovementPathResultV7 {
  if (path.length === 0) return { legal: false, reason: "EMPTY_PATH" };
  // The Mind Control revision section 5.2: a controlled unit's movement
  // unlocks read the viewer's research through its kind's tree.
  const capabilities = isMindControlledV7(view, unit.id)
    ? unitCapabilitiesV7(view, unit, view.viewer.researchedTechs)
    : context.capabilities;
  // The Candy revision section 5.2: the Rushed budget (the public
  // `sugarRush` list; the same helper as the canonical validation).
  // `pulp_wars-w49.35`: the Berserk budget (the public `berserkThisTurn`).
  // Ice Folk Freeze (`pulp_wars-w49.37`): Glacier, from the public ice.
  const baseBudget2 = baseMoveBudget2V7(view, unit);
  const glacier2 = glacierBonus2V7(view, unit, capabilities, context.ice.size);
  const onIce = (at: CoordV7): boolean =>
    publicTileAt(view, at)?.explored === true &&
    context.ice.has(at.y * view.board.width + at.x);
  const result = validatePlayerMovementPathCoreV7(
    view,
    unit,
    path,
    context,
    passThroughProbe,
    capabilities,
    baseBudget2 +
      (glacier2 > 0 && (passThroughProbe || path.some(onIce)) ? glacier2 : 0),
  );
  return passThroughProbe
    ? withGlacierProbeV7(result, baseBudget2, glacier2, onIce)
    : result;
}

function validatePlayerMovementPathCoreV7(
  view: PlayerViewV7,
  unit: PublicUnitV7,
  path: readonly CoordV7[],
  context: PublicMovementContextV7,
  passThroughProbe: boolean,
  capabilities: PublicMovementContextV7["capabilities"],
  budget2: number,
): MovementPathResultV7 {
  // The Martian revision section 7: the unit's own movement mode. The
  // technologies are the viewer's (exact for the viewer's own units).
  const mode: MovementModeV7 =
    unit.form === "LAND" ? unitMovementModeV7(view, unit) : "GROUND";
  const flies = mode === "FLY";
  // The Ice Folk revision section 7.1: Mountain-born (land form only).
  const mountainBorn = unitIsMountainBornV7(view, unit);
  const navigation = view.viewer.researchedTechs.includes("NAVIGATION");
  let current = unit.at;
  let currentRoadNode = isUsablePublicRoadNodeV7(
    view,
    publicTileAt(view, current),
    context,
  );
  let spentPoints2 = 0;
  // The Ice Folk revision (section 6.2): Glide and deep snow from the
  // public Snow flags; Prowl; a Sabretooth's settlement restriction.
  const glides = unitGlidesV7(view, unit);
  const snowStopped = deepSnowStopsUnitV7(
    view,
    unit,
    capabilities.forestMovementFreedomRoles.includes(unit.role),
  );
  const prowls =
    unitIgnoresZocStopsV7(view, unit) || berserkIgnoresZocV7(view, unit);
  // The giants' signatures (section 6.5): Overstride.
  const overstrides = unitOverstridesV7(view, unit);
  const ownSitesOnly = unitAvoidsForeignSitesV7(view, unit);
  const publicSnowAt = (at: CoordV7): boolean => {
    const tile = publicTileAt(view, at);
    return tile?.explored === true && tile.snow === true;
  };
  let currentSnow = publicSnowAt(current);
  // The frozen sea (naval branch sections 8.3, 8.6, 8.7, and 8.9): the ice
  // on explored tiles is public, so slides, slips, and icebound units are
  // exact here. The same rules as the canonical validation.
  const iceSet = context.ice;
  const iceAt = (at: CoordV7): boolean =>
    iceSet.size > 0 && iceSet.has(at.y * view.board.width + at.x);
  if (unit.form !== "LAND" && iceAt(unit.at))
    return { legal: false, reason: "ICEBOUND" };
  const slides = iceSet.size > 0 && unitSlidesV7(view, unit);
  const iceFolkKind = unitKindWalksIceV7(view, unit);
  let slide: { readonly dx: number; readonly dy: number } | null = null;
  const traversedPath: CoordV7[] = [];
  // The Candy redesign (sections 6.2 and 7.7): Stuck and the hop, from the
  // public `stuck` list and the explored tiles (as the canonical rules).
  const stepLimit = moveStepLimitV7(view, unit.id);
  const hops = unitHopsV7(view, unit);
  let hopUsed = false;
  let steps = 0;
  for (let index = 0; index < path.length; index += 1) {
    const step = path[index];
    if (step === undefined) return { legal: false, reason: "OUT_OF_BOUNDS" };
    const jumped =
      chebyshev(current, step) === 2 && hops && !hopUsed && slide === null
        ? hopJumpedTileV7(current, step)
        : null;
    if (chebyshev(current, step) !== 1 && jumped === null)
      return { legal: false, reason: "NOT_ADJACENT" };
    if (jumped !== null) {
      const jumpedTile = publicTileAt(view, jumped);
      if (jumpedTile === undefined)
        return { legal: false, reason: "OUT_OF_BOUNDS" };
      if (!jumpedTile.explored)
        return { legal: false, reason: "UNEXPLORED_INTERMEDIATE" };
      if (jumpedTile.biome === null)
        return { legal: false, reason: "HOP_ILLEGAL" };
      hopUsed = true;
    }
    const sliding = slide !== null;
    if (!sliding) {
      steps += 1;
      if (steps > stepLimit) return { legal: false, reason: "STUCK" };
    }
    if (
      slide !== null &&
      (step.x !== current.x + slide.dx || step.y !== current.y + slide.dy)
    )
      return { legal: false, reason: "SLIDE_FORCED" };
    slide = null;
    const tile = publicTileAt(view, step);
    if (tile === undefined) return { legal: false, reason: "OUT_OF_BOUNDS" };
    const stepIce = tile.explored && iceAt(step);
    if (tile.explored) {
      const water =
        (tile.terrain === "SHALLOW_WATER" || tile.terrain === "DEEP_WATER") &&
        !stepIce;
      const autoEmbark =
        unit.form === "LAND" &&
        !iceFolkKind &&
        index === path.length - 1 &&
        tile.explored &&
        (tile.improvement === "PORT" || tile.improvement === "SHIPYARD") &&
        tile.territoryOwnerId === view.viewer.id &&
        view.viewer.researchedTechs.includes("SHORECRAFT") &&
        view.naval.ownedPorts.some(
          (port) => same(port.at, tile.at) && port.status === "ACTIVE",
        );
      if (
        (unit.form === "LAND" &&
          water &&
          !autoEmbark &&
          !canCrossWaterV7({
            terrain: tile.terrain,
            movementMode: mode,
            navigation,
          })) ||
        (unit.form !== "LAND" && !water) ||
        (water && tile.terrain === "DEEP_WATER" && !navigation)
      )
        return { legal: false, reason: "ENGINEERING_REQUIRED" };
    }
    // `pulp_wars-1wy.3`: Glide is a step from Snow onto Snow, both ends from
    // the public Snow flags. Hidden Snow can only make the canonical step
    // cheaper, so every offered Move stays within the canonical budget.
    const stepSnow = tile.explored && tile.snow === true;
    // The Candy redesign (section 7.2): the Glaze (public on explored
    // tiles); a hop costs one ordinary step.
    spentPoints2 += sliding
      ? 0
      : jumped !== null
        ? 2
        : currentRoadNode ||
            (glides && currentSnow && stepSnow) ||
            glazeStepAppliesV7(view, unit, step)
          ? 1
          : 2;
    if (spentPoints2 > budget2)
      return { legal: false, reason: "BUDGET_EXCEEDED" };
    if (tile.explored === false && tile.diplomaticBlock === "ALLIED_TERRITORY")
      return { legal: false, reason: "ALLY_TERRITORY_FORBIDDEN" };
    // Only the mover's own visible units can be passed, and never ended on.
    // The Martian revision: a flyer passes every visible unit. The frozen
    // sea: a sliding unit never passes a unit on ice.
    const passesOwnUnits =
      (passThroughProbe || index < path.length - 1) && !(slides && stepIce);
    if (
      context.unitsByPosition
        .get(key(step))
        ?.some(
          (candidate) =>
            candidate.id !== unit.id &&
            !(
              passesOwnUnits &&
              (flies || overstrides || candidate.ownerId === unit.ownerId)
            ),
        )
    )
      return { legal: false, reason: "OCCUPIED" };
    if (
      tile.explored &&
      tile.territoryOwnerId !== null &&
      publicAllied(view, unit.ownerId, tile.territoryOwnerId)
    )
      return { legal: false, reason: "ALLY_TERRITORY_FORBIDDEN" };
    // Dwarf crowd control (`pulp_wars-w49.33`): no Move enters a Barricade
    // (every Barricade on an explored tile is in the view).
    if (barricadeAtV7(view, step) !== undefined)
      return { legal: false, reason: "BARRICADE" };
    // The Dwarf revision section 5.3: no Move ends on a mound tile.
    if (!passesOwnUnits && moundAtV7(view, step) !== undefined)
      return { legal: false, reason: "MOUND" };
    if (
      tile.explored &&
      tile.biome !== null &&
      !canEnterTerrainV7({
        terrain: tile.terrain,
        movementMode: mode,
        afloat: false,
        engineering: capabilities.mountainMovement,
        navigation,
        mountainBorn,
        // A land tile (its biome is not null); ice is handled above.
        ice: false,
      })
    )
      return { legal: false, reason: "ENGINEERING_REQUIRED" };
    if (
      ownSitesOnly &&
      !passThroughProbe &&
      index === path.length - 1 &&
      !publicFlyerMayStandV7(view, unit, tile)
    )
      return { legal: false, reason: "SETTLEMENT_FORBIDDEN" };
    const ignoresForest =
      capabilities.forestMarch ||
      capabilities.forestMovementFreedomRoles.includes(unit.role);
    const entersZoc =
      !flies &&
      !prowls &&
      !overstrides &&
      publicHostileZoc(view, unit, step, context);
    const stepRoadNode = isUsablePublicRoadNodeV7(view, tile, context);
    const roadEdge = currentRoadNode && stepRoadNode && jumped === null;
    const snowStops = snowStopped && stepSnow && !roadEdge;
    // The frozen sea section 8.7: slip.
    const iceStops =
      stepIce && unit.form === "LAND" && mode === "GROUND" && !iceFolkKind;
    const terrainStops =
      tile.explored &&
      (terrainStopsMoveV7({
        terrain: tile.terrain,
        movementMode: mode,
        mountainBorn,
        ignoresForest,
        roadEdge,
        ice: stepIce && unit.form === "LAND",
        iceFolk: iceFolkKind,
      }) ||
        snowStops);
    // Map curiosities round 2 (section 28.2): an explored gate stops every
    // Move that enters it.
    const gateStops =
      tile.explored &&
      view.curiosities.length > 0 &&
      gateAtV7(view.curiosities, step) !== null;
    const stops = !tile.explored || terrainStops || entersZoc || gateStops;
    // Section 8.6: the slide (the same rule as the canonical validation;
    // every tile it reads is explored and every unit on it visible).
    if (slides && stepIce && !stops) {
      const dx = step.x - current.x;
      const dy = step.y - current.y;
      const next = { x: step.x + dx, y: step.y + dy };
      const nextTile = publicTileAt(view, next);
      // The mover's own start tile is free (the canonical occupancy
      // predicate excludes the mover), and a Barricade stops a slide like a
      // unit (Ice Folk Freeze, `pulp_wars-w49.37`: Glacier's extra point
      // made a slide back over the start tile reachable).
      if (
        nextTile?.explored === true &&
        iceAt(next) &&
        context.unitsByPosition
          .get(key(next))
          ?.some((other) => other.id !== unit.id) !== true &&
        moundAtV7(view, next) === undefined &&
        barricadeAtV7(view, next) === undefined
      )
        slide = { dx, dy };
    }
    traversedPath.push(step);
    current = step;
    currentRoadNode = stepRoadNode;
    currentSnow = stepSnow;
    if (stops && index < path.length - 1)
      return {
        legal: false,
        reason: !tile.explored
          ? "UNEXPLORED_INTERMEDIATE"
          : gateStops
            ? "GATE_STOPS_MOVE"
            : iceStops
              ? "ICE_STOPS_MOVE"
              : mode === "GROUND" &&
                  tile.terrain === "MOUNTAIN" &&
                  !mountainBorn
                ? "MOUNTAIN_STOPS_MOVE"
                : mode === "GROUND" &&
                    tile.terrain === "FOREST" &&
                    !ignoresForest
                  ? "FOREST_STOPS_MOVE"
                  : snowStops
                    ? "SNOW_STOPS_MOVE"
                    : "ZOC_STOPS_MOVE",
      };
    if (stops)
      return {
        legal: true,
        destination: current,
        traversedPath,
        spentPoints2,
        stopped: true,
        explored: view.viewer.explored,
        revealed: [],
        interruption: null,
      };
  }
  if (slide !== null && !passThroughProbe)
    return { legal: false, reason: "SLIDE_FORCED" };
  return {
    legal: true,
    destination: current,
    traversedPath,
    spentPoints2,
    stopped: false,
    ...(slide === null ? {} : { slideContinues: slide }),
    explored: view.viewer.explored,
    revealed: [],
    interruption: null,
  };
}

/**
 * A step costs half when the tile being left is a usable Road node for the
 * mover's owner; the tile being entered does not matter.
 */
export function movementStepCost2V7(
  state: Pick<GameStateV7, "board" | "cities">,
  player: PlayerStateV7,
  from: CoordV7,
  to: CoordV7,
): 1 | 2 {
  if (chebyshev(from, to) !== 1) return 2;
  return isUsableRoadNodeV7(state, player, from) ? 1 : 2;
}

function isUsableRoadNodeV7(
  state: Pick<GameStateV7, "board" | "cities">,
  player: PlayerStateV7,
  at: CoordV7,
): boolean {
  if (!player.researchedTechs.includes("ROADS")) return false;
  const tile = tileAtV7(state.board, at);
  if (tile === undefined || tile.biome === null) return false;
  if (ownedCity(state, player.id, at)) return true;
  const owner = tileOwner(state, tile);
  return tile.road && (owner === null || owner === player.id);
}

function isUsablePublicRoadNodeV7(
  view: PlayerViewV7,
  tile: PlayerTileViewV7 | undefined,
  context: PublicMovementContextV7,
): boolean {
  if (!view.viewer.researchedTechs.includes("ROADS")) return false;
  if (tile?.explored !== true || tile.biome === null) return false;
  if (context.ownedCityKeys.has(key(tile.at))) return true;
  return (
    tile.road &&
    (tile.territoryOwnerId === null || tile.territoryOwnerId === view.viewer.id)
  );
}

export function unitSightRadiusAtV7(
  state: GameStateV7,
  unit: UnitStateV7,
  tile = tileAtV7(state.board, unit.at),
): number {
  if (unit.form === "EMBARKED") return 1;
  // Revision 19 section 6.2: an Egg has Sight 0 and reveals nothing.
  if (unit.form === "EGG") return 0;
  // The Mind Control revision section 5.2: Fieldcraft Sight and high-ground
  // vision are unit-level unlocks.
  // Map curiosities (section 10.5): the neutral owner has no technology.
  const capabilities = unitCapabilitiesV7(
    state,
    unit,
    ownerResearchedTechsV7(state, unit.ownerId),
  );
  const base = Math.max(
    unitRoleRuleV7(state, unit).sightRadius,
    capabilities.roleSightRadius[unit.role] ?? 0,
  );
  return (
    base +
    (tile?.terrain === "MOUNTAIN"
      ? capabilities.highGroundVisionRadiusBonus
      : 0)
  );
}

export function revealFromV7(
  state: GameStateV7,
  playerId: PlayerId,
  center: CoordV7,
  radius: number,
): {
  readonly explored: readonly CoordV7[];
  readonly revealed: readonly CoordV7[];
} {
  return revealRadius(
    state,
    requirePlayer(state, playerId).explored,
    center,
    radius,
  );
}

function revealRadius(
  state: Pick<GameStateV7, "board">,
  explored: readonly CoordV7[],
  center: CoordV7,
  radius: number,
) {
  const known = new Set(explored.map(key));
  const next = [...explored];
  const revealed: CoordV7[] = [];
  for (
    let y = Math.max(0, center.y - radius);
    y <= Math.min(state.board.height - 1, center.y + radius);
    y += 1
  )
    for (
      let x = Math.max(0, center.x - radius);
      x <= Math.min(state.board.width - 1, center.x + radius);
      x += 1
    ) {
      const at = { x, y };
      if (!known.has(key(at))) {
        known.add(key(at));
        next.push(at);
        revealed.push(at);
      }
    }
  return { explored: unique(next), revealed: unique(revealed) };
}

function inHostileZoc(
  state: GameStateV7,
  target: UnitStateV7,
  at: CoordV7,
  explored: readonly CoordV7[],
): boolean {
  return state.units.some(
    (unit) =>
      unit.hp > 0 &&
      unit.form !== "EMBARKED" &&
      arePlayersHostileV7(state, target.ownerId, unit.ownerId) &&
      contains(explored, unit.at) &&
      chebyshev(unit.at, at) === 1 &&
      projectsZocV7(state, unit, target, at),
  );
}

function projectsZocV7(
  state: GameStateV7,
  projector: UnitStateV7,
  target: UnitStateV7,
  at: CoordV7,
): boolean {
  // Revision 19 section 6.2: an Egg projects no zone of control.
  if (projector.form === "EMBARKED" || projector.form === "EGG") return false;
  // The Martian revision section 7.2: a flyer exerts no zone of control.
  // Map curiosities (section 8.3): nor does the neutral Monster.
  if (unitFliesV7(state, projector) || isNeutralOwnerV7(projector.ownerId))
    return false;
  // The frozen sea (naval branch sections 8.3 and 8.9): an icebound unit is
  // frozen solid and projects nothing; an ice tile takes zones of control
  // like land (from land units, never from naval units).
  if (unitIsIceboundV7(state, projector)) return false;
  const targetTile = tileAtV7(state.board, at);
  const water = targetTile?.biome === null && !isIceAtV7(state, at);
  if (!water) return projector.form !== "NAVAL";
  if (projector.form === "NAVAL") {
    if (targetTile?.terrain !== "DEEP_WATER") return true;
    return requirePlayer(state, projector.ownerId).researchedTechs.includes(
      "NAVIGATION",
    );
  }
  const rule = unitRoleRuleV7(state, projector);
  return (
    target.form !== "LAND" &&
    isUnitVisibleToPlayerV7(state, projector.ownerId, target) &&
    rule.abilities.includes("ATTACK") &&
    rule.minimumRange <= 1 &&
    rule.range >= 1
  );
}

function publicTileAt(
  view: PlayerViewV7,
  at: CoordV7,
): PlayerTileViewV7 | undefined {
  if (!publicCoordOnBoard(view, at)) return undefined;
  const tile = view.board.tiles[at.y * view.board.width + at.x];
  return tile?.at.x === at.x && tile.at.y === at.y ? tile : undefined;
}
function publicCoordOnBoard(view: PlayerViewV7, at: CoordV7): boolean {
  return (
    Number.isSafeInteger(at.x) &&
    Number.isSafeInteger(at.y) &&
    at.x >= 0 &&
    at.y >= 0 &&
    at.x < view.board.width &&
    at.y < view.board.height
  );
}
function adjacentPublic(view: PlayerViewV7, at: CoordV7): CoordV7[] {
  const result: CoordV7[] = [];
  for (let y = at.y - 1; y <= at.y + 1; y += 1)
    for (let x = at.x - 1; x <= at.x + 1; x += 1) {
      const candidate = { x, y };
      if (!same(at, candidate) && publicTileAt(view, candidate) !== undefined)
        result.push(candidate);
    }
  return result.sort(compare);
}
function publicAllied(
  view: PlayerViewV7,
  left: PlayerId,
  right: PlayerId,
): boolean {
  return cooperativeAlliesV7(
    view.setup.aiMode,
    view.humanPlayerId,
    left,
    right,
  );
}
function publicHostileZoc(
  view: PlayerViewV7,
  target: PublicUnitV7,
  at: CoordV7,
  context: PublicMovementContextV7,
): boolean {
  const cacheKey = `${target.ownerId}:${target.form}`;
  let keys = context.hostileZocKeys.get(cacheKey);
  if (keys === undefined) {
    const generated = new Set<string>();
    for (const unit of view.units) {
      if (
        unit.hp <= 0 ||
        unit.form === "EMBARKED" ||
        // Revision 19: an Egg projects no zone of control.
        unit.form === "EGG" ||
        // The Martian revision: a flyer exerts no zone of control; map
        // curiosities (section 8.3): nor does the neutral Monster.
        unitFliesV7(view, unit) ||
        isNeutralOwnerV7(unit.ownerId) ||
        // The frozen sea: an icebound unit projects nothing.
        unitIsIceboundV7(view, unit) ||
        unit.ownerId === target.ownerId ||
        publicAllied(view, target.ownerId, unit.ownerId)
      )
        continue;
      for (let y = unit.at.y - 1; y <= unit.at.y + 1; y += 1)
        for (let x = unit.at.x - 1; x <= unit.at.x + 1; x += 1)
          if (
            (x !== unit.at.x || y !== unit.at.y) &&
            publicProjectsZocV7(view, unit, target.form, { x, y })
          )
            generated.add(`${y},${x}`);
    }
    keys = generated;
    context.hostileZocKeys.set(cacheKey, keys);
  }
  return keys.has(key(at));
}

function publicProjectsZocV7(
  view: PlayerViewV7,
  projector: PublicUnitV7,
  targetForm: PublicUnitV7["form"],
  at: CoordV7,
): boolean {
  const targetTile = publicTileAt(view, at);
  if (targetTile === undefined || !targetTile.explored) return true;
  // The frozen sea: ice takes zones of control like land.
  if (targetTile.biome !== null || isIceAtV7(view, at))
    return projector.form !== "NAVAL";
  if (projector.form === "NAVAL") return true;
  const rule = unitRoleRuleV7(view, projector);
  return (
    targetForm !== "LAND" &&
    rule.abilities.includes("ATTACK") &&
    rule.minimumRange <= 1 &&
    rule.range >= 1
  );
}
/**
 * The entered path cut back to its last tile that holds no other unit. An
 * interrupted Move never leaves the mover on a tile it was only passing.
 * A surfaced rider is also never left on a settlement center it cannot
 * stand on.
 */
function lastFreeEnteredPath(
  state: Pick<GameStateV7, "units" | "board" | "cities">,
  unit: UnitStateV7,
  entered: readonly CoordV7[],
  ownSitesOnly: boolean,
): readonly CoordV7[] {
  for (let length = entered.length; length > 0; length -= 1) {
    const at = entered[length - 1];
    if (
      at !== undefined &&
      // The occupancy predicate: no other unit and no mound.
      !tileOccupiedV7(state, at, unit.id) &&
      (!ownSitesOnly ||
        flyerMayStandOnSiteV7(
          tileAtV7(state.board, at)?.site ?? null,
          state.cities.find((city) => same(city.at, at))?.ownerId ?? null,
          unit.ownerId,
        ))
    )
      return entered.slice(0, length);
  }
  return [];
}

/**
 * Whether a surfaced rider of `unit`'s owner may end a Move on a public
 * tile: an unexplored tile is unknown and allowed (resolution interrupts the
 * Move if it turns out to be a center); an explored center needs an own
 * city.
 */
function publicFlyerMayStandV7(
  view: PlayerViewV7,
  unit: PublicUnitV7,
  tile: PlayerTileViewV7 | undefined,
): boolean {
  if (tile?.explored !== true) return true;
  return flyerMayStandOnSiteV7(
    tile.site,
    view.cities.find((city) => same(city.at, tile.at))?.ownerId ?? null,
    unit.ownerId,
  );
}

function tileOwner(
  state: Pick<GameStateV7, "cities">,
  tile: TileStateV7,
): PlayerId | null {
  return tile.territoryCityId === null
    ? null
    : (state.cities.find((city) => city.id === tile.territoryCityId)?.ownerId ??
        null);
}
function ownedCity(
  state: Pick<GameStateV7, "cities">,
  ownerId: PlayerId,
  at: CoordV7,
) {
  return state.cities.some(
    (city) => city.ownerId === ownerId && same(city.at, at),
  );
}
function adjacent(state: Pick<GameStateV7, "board">, at: CoordV7): CoordV7[] {
  const result: CoordV7[] = [];
  for (let y = at.y - 1; y <= at.y + 1; y += 1)
    for (let x = at.x - 1; x <= at.x + 1; x += 1) {
      const candidate = { x, y };
      if (
        !same(at, candidate) &&
        tileAtV7(state.board, candidate) !== undefined
      )
        result.push(candidate);
    }
  return result.sort(compare);
}
function requirePlayer(state: GameStateV7, id: PlayerId): PlayerStateV7 {
  const player = state.players.find((candidate) => candidate.id === id);
  if (player === undefined) throw new RangeError("INVALID_STATE");
  return player;
}
function contains(values: readonly CoordV7[], at: CoordV7) {
  return values.some((value) => same(value, at));
}
function unique(values: readonly CoordV7[]): readonly CoordV7[] {
  return [...new Map(values.map((at) => [key(at), at])).values()].sort(compare);
}
const key = (at: CoordV7) => `${at.y},${at.x}`;
const same = (a: CoordV7, b: CoordV7) => a.x === b.x && a.y === b.y;
const compare = (a: CoordV7, b: CoordV7) => a.y - b.y || a.x - b.x;
const chebyshev = (a: CoordV7, b: CoordV7) =>
  Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
