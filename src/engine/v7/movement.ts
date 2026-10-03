import type { PlayerId } from "../model/ids";
import {
  EMBARKED_MOVE_V7,
  canCrossWaterV7,
  canEnterTerrainV7,
  flyerMayStandOnSiteV7,
  technologyCapabilitiesV7,
  terrainStopsMoveV7,
  unitFliesV7,
  unitIsMountainBornV7,
  unitMovementModeV7,
  unitRoleRuleV7,
  type MovementModeV7,
} from "../rules/ruleset-v7";
import {
  arePlayersAlliedV7,
  arePlayersHostileV7,
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
import { tileAtV7 } from "./spatial-economy";
import type {
  CoordV7,
  GameStateV7,
  PlayerStateV7,
  TileStateV7,
  UnitStateV7,
} from "./types";
import { moundAtV7, tileOccupiedV7 } from "./units";
import type { PlayerTileViewV7, PlayerViewV7, PublicUnitV7 } from "./view";

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
  // The Martian revision section 7.2: a flyer cannot end a Move on a neutral
  // village center or on the center of a city it does not own (the Ice Folk
  // revision: nor can a Sabretooth).
  | "SETTLEMENT_FORBIDDEN"
  // The Ice Folk revision section 6.2 (3): deep snow ends the Move of
  // another faction's ground unit, so a path cannot continue past it.
  | "SNOW_STOPS_MOVE"
  // The Dwarf revision section 5.3: no Move ends on a mound tile.
  | "MOUND";

export type MovementPathResultV7 =
  | {
      readonly legal: true;
      readonly destination: CoordV7;
      readonly traversedPath: readonly CoordV7[];
      readonly spentPoints2: number;
      readonly stopped: boolean;
      readonly explored: readonly CoordV7[];
      readonly revealed: readonly CoordV7[];
      readonly interruption: {
        readonly at: CoordV7;
        readonly reason:
          | "OCCUPIED"
          | "ENGINEERING_REQUIRED"
          | "ZOC"
          // The Martian revision: a flyer entered an unexplored cell that
          // is a settlement center it cannot stand on.
          | "SETTLEMENT_FORBIDDEN"
          // The Ice Folk revision: Snow the mover could not know about.
          | "SNOW"
          // The Dwarf revision: a mound on a tile the mover had not
          // explored, met on the last tile of the Move.
          | "MOUND";
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
 * embarks it). A flyer also passes over every unit, ignores hostile zones of
 * control, and cannot end on a settlement center it does not own. Terrain
 * entry goes through the shared `canEnterTerrainV7` and `canCrossWaterV7`.
 */
export function validateMovementPathV7(
  state: GameStateV7,
  unit: UnitStateV7,
  path: readonly CoordV7[],
): MovementPathResultV7 {
  return validateMovementPathWithOptionsV7(state, unit, path, false);
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
  const rule = unitRoleRuleV7(state, unit);
  const capabilities = technologyCapabilitiesV7(
    player.researchedTechs,
    player.faction,
  );
  const budget2 = (unit.form === "EMBARKED" ? EMBARKED_MOVE_V7 : rule.move) * 2;
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
  // from the state before the command. An Ice Folk unit Glides (a step that
  // leaves Snow costs half); another faction's ground unit stops on entering
  // Snow, and Snow it could not know about (a hidden Witch's Blizzard)
  // interrupts the Move. A Sabretooth Prowls through zones of control and,
  // like a flyer, never ends on a settlement center it does not own.
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
  const prowls = unitIgnoresZocStopsV7(state, unit);
  const ownSitesOnly = flies || unitAvoidsForeignSitesV7(state, unit);
  let currentSnow = snowAt(current);

  for (let index = 0; index < path.length; index += 1) {
    const step = path[index];
    if (step === undefined) throw new RangeError("INVALID_STATE");
    if (chebyshev(current, step) !== 1)
      return { legal: false, reason: "NOT_ADJACENT" };
    const tile = tileAtV7(state.board, step);
    if (tile === undefined) return { legal: false, reason: "OUT_OF_BOUNDS" };
    const wasExplored = contains(explored, step);
    const wasKnownBeforeCommand = contains(knownBeforeCommand, step);
    spentPoints2 += currentRoadNode || (glides && currentSnow) ? 1 : 2;
    if (spentPoints2 > budget2)
      return { legal: false, reason: "BUDGET_EXCEEDED" };
    const owner = tileOwner(state, tile);
    if (owner !== null && arePlayersAlliedV7(state, player.id, owner))
      return { legal: false, reason: "ALLY_TERRITORY_FORBIDDEN" };
    const occupant = state.units.find(
      (candidate) =>
        candidate.id !== unit.id &&
        candidate.hp > 0 &&
        same(candidate.at, step),
    );
    // A flyer passes over a unit of any owner; no Move ends on a unit.
    const passesOwnUnit =
      occupant !== undefined &&
      (occupant.ownerId === unit.ownerId || flies) &&
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
    const water =
      tile.terrain === "SHALLOW_WATER" || tile.terrain === "DEEP_WATER";
    const autoEmbark =
      unit.form === "LAND" &&
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
            })
        : !canEnterTerrainV7({
            terrain: tile.terrain,
            movementMode: "GROUND",
            afloat: true,
            engineering: capabilities.mountainMovement,
            navigation,
            mountainBorn: false,
          });
    // The Martian revision section 7.2: a flyer may pass over a settlement
    // center it does not own but never ends a Move there (the Ice Folk
    // revision section 7.7: nor does a Sabretooth).
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
    const ignoresForest = capabilities.forestMovementFreedomRoles.includes(
      unit.role,
    );
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
      inHostileZoc(observationState, { ...unit, at: step }, step, explored);
    const newlyEncounteredZoc =
      entersZoc &&
      !inHostileZoc(state, { ...unit, at: step }, step, knownBeforeCommand);
    // The stop is waived only on a Road edge: both ends usable Road nodes.
    const stepRoadNode = isUsableRoadNodeV7(state, player, step);
    // The Martian revision section 7.1: a walker or flyer is never stopped
    // by terrain; the Ice Folk revision section 7.1: nor is a Mountain-born
    // unit by a Mountain.
    const roadEdge = currentRoadNode && stepRoadNode;
    const groundStops = terrainStopsMoveV7({
      terrain: tile.terrain,
      movementMode: mode,
      mountainBorn,
      ignoresForest,
      roadEdge,
    });
    // The Ice Folk revision section 6.2 (3): deep snow, waived by a Road edge.
    const stepSnow = snowAt(step);
    const snowStops = snowStopped && stepSnow && !roadEdge;
    const terrainStops = groundStops || snowStops;
    const stops = !wasExplored || terrainStops || entersZoc;
    traversedPath.push(step);
    current = step;
    currentRoadNode = stepRoadNode;
    currentSnow = stepSnow;
    if (stops && index < path.length - 1) {
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
          : mode === "GROUND" && tile.terrain === "MOUNTAIN" && !mountainBorn
            ? "MOUNTAIN_STOPS_MOVE"
            : mode === "GROUND" && tile.terrain === "FOREST" && !ignoresForest
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
  return {
    legal: true,
    destination: current,
    traversedPath,
    spentPoints2,
    stopped: false,
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
  // The Ice Folk revision section 7.7: a Sabretooth, like a flyer, never
  // ends on a settlement center it does not own.
  const ownSitesOnly = flies || unitAvoidsForeignSitesV7(state, unit);
  const queue: CoordV7[][] = [[]];
  const best = new Map<string, number>([[key(unit.at), 0]]);
  const results = new Map<string, ReachablePathV7>();
  while (queue.length > 0) {
    const path = queue.shift();
    if (path === undefined) break;
    const current = path.at(-1) ?? unit.at;
    for (const destination of adjacent(state, current)) {
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
      const prior = best.get(destinationKey);
      if (prior !== undefined && prior <= validation.spentPoints2) continue;
      // An own-occupied tile is never a destination; it is only passed, and
      // only when the Move would not have to stop on it. The Martian
      // revision: a flyer passes every unit and every settlement center it
      // cannot stand on, and ends on neither.
      const ownOccupied =
        state.units.some(
          (other) =>
            other.id !== unit.id &&
            other.hp > 0 &&
            (flies || other.ownerId === unit.ownerId) &&
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
      best.set(destinationKey, validation.spentPoints2);
      if (!ownOccupied)
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

/** Observation-only movement enumeration used by presentation and Normal AI. */
export function reachablePlayerMovementPathsV7(
  view: PlayerViewV7,
  unit: PublicUnitV7,
): readonly ReachablePathV7[] {
  // Revision 19 section 6.2: an Egg never moves.
  if (unit.form === "EGG") return [];
  const context = publicMovementContextV7(view);
  const flies = unitFliesV7(view, unit);
  const ownSitesOnly = flies || unitAvoidsForeignSitesV7(view, unit);
  const queue: CoordV7[][] = [[]];
  const best = new Map<string, number>([[key(unit.at), 0]]);
  const results = new Map<string, ReachablePathV7>();
  while (queue.length > 0) {
    const path = queue.shift();
    if (path === undefined) break;
    const current = path.at(-1) ?? unit.at;
    for (const destination of adjacentPublic(view, current)) {
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
      const prior = best.get(destinationKey);
      if (prior !== undefined && prior <= validation.spentPoints2) continue;
      // An own-occupied tile is never a destination; it is only passed, and
      // only when the Move would not have to stop on it. The Martian
      // revision: a flyer also passes, and never ends on, a settlement
      // center it cannot stand on.
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
      best.set(destinationKey, validation.spentPoints2);
      if (!ownOccupied)
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
  const role = unitRoleRuleV7(view, unit);
  const capabilities = context.capabilities;
  const budget2 = (unit.form === "EMBARKED" ? EMBARKED_MOVE_V7 : role.move) * 2;
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
  const prowls = unitIgnoresZocStopsV7(view, unit);
  const ownSitesOnly = flies || unitAvoidsForeignSitesV7(view, unit);
  const publicSnowAt = (at: CoordV7): boolean => {
    const tile = publicTileAt(view, at);
    return tile?.explored === true && tile.snow === true;
  };
  let currentSnow = publicSnowAt(current);
  const traversedPath: CoordV7[] = [];
  for (let index = 0; index < path.length; index += 1) {
    const step = path[index];
    if (step === undefined) return { legal: false, reason: "OUT_OF_BOUNDS" };
    if (chebyshev(current, step) !== 1)
      return { legal: false, reason: "NOT_ADJACENT" };
    const tile = publicTileAt(view, step);
    if (tile === undefined) return { legal: false, reason: "OUT_OF_BOUNDS" };
    if (tile.explored) {
      const water =
        tile.terrain === "SHALLOW_WATER" || tile.terrain === "DEEP_WATER";
      const autoEmbark =
        unit.form === "LAND" &&
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
    spentPoints2 += currentRoadNode || (glides && currentSnow) ? 1 : 2;
    if (spentPoints2 > budget2)
      return { legal: false, reason: "BUDGET_EXCEEDED" };
    if (tile.explored === false && tile.diplomaticBlock === "ALLIED_TERRITORY")
      return { legal: false, reason: "ALLY_TERRITORY_FORBIDDEN" };
    // Only the mover's own visible units can be passed, and never ended on.
    // The Martian revision: a flyer passes every visible unit.
    const passesOwnUnits = passThroughProbe || index < path.length - 1;
    if (
      context.unitsByPosition
        .get(key(step))
        ?.some(
          (candidate) =>
            candidate.id !== unit.id &&
            !(passesOwnUnits && (flies || candidate.ownerId === unit.ownerId)),
        )
    )
      return { legal: false, reason: "OCCUPIED" };
    if (
      tile.explored &&
      tile.territoryOwnerId !== null &&
      publicAllied(view, unit.ownerId, tile.territoryOwnerId)
    )
      return { legal: false, reason: "ALLY_TERRITORY_FORBIDDEN" };
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
    const ignoresForest = capabilities.forestMovementFreedomRoles.includes(
      unit.role,
    );
    const entersZoc =
      !flies && !prowls && publicHostileZoc(view, unit, step, context);
    const stepRoadNode = isUsablePublicRoadNodeV7(view, tile, context);
    const roadEdge = currentRoadNode && stepRoadNode;
    const stepSnow = tile.explored && tile.snow === true;
    const snowStops = snowStopped && stepSnow && !roadEdge;
    const terrainStops =
      tile.explored &&
      (terrainStopsMoveV7({
        terrain: tile.terrain,
        movementMode: mode,
        mountainBorn,
        ignoresForest,
        roadEdge,
      }) ||
        snowStops);
    const stops = !tile.explored || terrainStops || entersZoc;
    traversedPath.push(step);
    current = step;
    currentRoadNode = stepRoadNode;
    currentSnow = stepSnow;
    if (stops && index < path.length - 1)
      return {
        legal: false,
        reason: !tile.explored
          ? "UNEXPLORED_INTERMEDIATE"
          : mode === "GROUND" && tile.terrain === "MOUNTAIN" && !mountainBorn
            ? "MOUNTAIN_STOPS_MOVE"
            : mode === "GROUND" && tile.terrain === "FOREST" && !ignoresForest
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
  return {
    legal: true,
    destination: current,
    traversedPath,
    spentPoints2,
    stopped: false,
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
  const player = requirePlayer(state, unit.ownerId);
  const capabilities = technologyCapabilitiesV7(
    player.researchedTechs,
    player.faction,
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
  if (unitFliesV7(state, projector)) return false;
  const targetTile = tileAtV7(state.board, at);
  const water = targetTile?.biome === null;
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
  return (
    left !== right &&
    view.setup.aiMode === "COOPERATIVE" &&
    left !== view.humanPlayerId &&
    right !== view.humanPlayerId
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
        // The Martian revision: a flyer exerts no zone of control.
        unitFliesV7(view, unit) ||
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
  if (targetTile.biome !== null) return projector.form !== "NAVAL";
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
 * The Martian revision section 7.2: a flyer is also never left on a
 * settlement center it cannot stand on.
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
 * Whether a flyer of `unit`'s owner may end a Move on a public tile: an
 * unexplored tile is unknown and allowed (resolution interrupts the Move if
 * it turns out to be a center); an explored center needs an own city.
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
