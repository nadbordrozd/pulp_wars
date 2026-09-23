import type { PlayerId } from "../model/ids";
import {
  effectiveRoleRuleV7,
  technologyCapabilitiesV7,
} from "../rules/ruleset-v7";
import { arePlayersAlliedV7, arePlayersHostileV7 } from "./economy";
import {
  isUnitVisibleToPlayerV7,
  withUnitAtForObservationV7,
} from "./observation";
import { capitalConnectedRoadKeysV7, tileAtV7 } from "./spatial-economy";
import type {
  CoordV7,
  GameStateV7,
  PlayerStateV7,
  TileStateV7,
  UnitStateV7,
} from "./types";
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
  | "ALLY_TERRITORY_FORBIDDEN";

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
        readonly reason: "OCCUPIED" | "ENGINEERING_REQUIRED" | "ZOC";
      } | null;
    }
  | { readonly legal: false; readonly reason: MovementFailureReasonV7 };

export interface ReachablePathV7 {
  readonly destination: CoordV7;
  readonly path: readonly CoordV7[];
  readonly spentPoints2: number;
}

/** Validates ordinary movement. */
export function validateMovementPathV7(
  state: GameStateV7,
  unit: UnitStateV7,
  path: readonly CoordV7[],
): MovementPathResultV7 {
  if (path.length === 0) return { legal: false, reason: "EMPTY_PATH" };
  const player = requirePlayer(state, unit.ownerId);
  const rule = effectiveRoleRuleV7(unit.role);
  const capabilities = technologyCapabilitiesV7(player.researchedTechs);
  const budget2 = (unit.form === "EMBARKED" ? 3 : rule.move) * 2;
  const connectedRoads = capitalConnectedRoadKeysV7(state, player.id);
  const knownBeforeCommand = player.explored;
  let explored = player.explored;
  const revealed: CoordV7[] = [];
  const traversedPath: CoordV7[] = [];
  let current = unit.at;
  let spentPoints2 = 0;

  for (let index = 0; index < path.length; index += 1) {
    const step = path[index];
    if (step === undefined) throw new RangeError("INVALID_STATE");
    if (chebyshev(current, step) !== 1)
      return { legal: false, reason: "NOT_ADJACENT" };
    const tile = tileAtV7(state.board, step);
    if (tile === undefined) return { legal: false, reason: "OUT_OF_BOUNDS" };
    const wasExplored = contains(explored, step);
    const wasKnownBeforeCommand = contains(knownBeforeCommand, step);
    spentPoints2 += wasExplored
      ? movementStepCost2V7(state, player, current, step, connectedRoads)
      : 2;
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
    const occupied = occupant !== undefined;
    const water =
      tile.terrain === "SHALLOW_WATER" || tile.terrain === "DEEP_WATER";
    const engineeringRequired =
      (tile.terrain === "MOUNTAIN" && !capabilities.mountainMovement) ||
      (unit.form === "LAND" && water) ||
      (unit.form !== "LAND" && !water) ||
      (water &&
        tile.terrain === "DEEP_WATER" &&
        !player.researchedTechs.includes("NAVIGATION"));
    if (occupied || engineeringRequired) {
      const occupantVisible =
        occupant !== undefined &&
        isUnitVisibleToPlayerV7(state, player.id, occupant);
      if (occupantVisible || (engineeringRequired && wasKnownBeforeCommand))
        return {
          legal: false,
          reason: occupied ? "OCCUPIED" : "ENGINEERING_REQUIRED",
        };
      return {
        legal: true,
        destination: current,
        traversedPath,
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
    const entersZoc = inHostileZoc(
      observationState,
      { ...unit, at: step },
      step,
      explored,
    );
    const newlyEncounteredZoc =
      entersZoc &&
      !inHostileZoc(state, { ...unit, at: step }, step, knownBeforeCommand);
    const terrainStops =
      tile.terrain === "MOUNTAIN" ||
      (tile.terrain === "FOREST" && !ignoresForest);
    const stops = !wasExplored || terrainStops || entersZoc;
    traversedPath.push(step);
    current = step;
    if (stops && index < path.length - 1) {
      if (newlyEncounteredZoc)
        return {
          legal: true,
          destination: current,
          traversedPath,
          spentPoints2,
          stopped: true,
          explored,
          revealed: unique(revealed),
          interruption: { at: step, reason: "ZOC" },
        };
      return {
        legal: false,
        reason: !wasExplored
          ? "UNEXPLORED_INTERMEDIATE"
          : tile.terrain === "MOUNTAIN"
            ? "MOUNTAIN_STOPS_MOVE"
            : tile.terrain === "FOREST" && !ignoresForest
              ? "FOREST_STOPS_MOVE"
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
  if (player === undefined) return [];
  const queue: CoordV7[][] = [[]];
  const best = new Map<string, number>([[key(unit.at), 0]]);
  const results = new Map<string, ReachablePathV7>();
  while (queue.length > 0) {
    const path = queue.shift();
    if (path === undefined) break;
    const current = path.at(-1) ?? unit.at;
    for (const destination of adjacent(state, current)) {
      const candidate = [...path, destination];
      const validation = validateMovementPathV7(state, unit, candidate);
      if (
        !validation.legal ||
        validation.traversedPath.length !== candidate.length
      )
        continue;
      const destinationKey = key(validation.destination);
      const prior = best.get(destinationKey);
      if (prior !== undefined && prior <= validation.spentPoints2) continue;
      best.set(destinationKey, validation.spentPoints2);
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
  const context = publicMovementContextV7(view);
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
      );
      if (
        !validation.legal ||
        validation.traversedPath.length !== candidate.length
      )
        continue;
      const destinationKey = key(validation.destination);
      const prior = best.get(destinationKey);
      if (prior !== undefined && prior <= validation.spentPoints2) continue;
      best.set(destinationKey, validation.spentPoints2);
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
  );
}

interface PublicMovementContextV7 {
  readonly capabilities: ReturnType<typeof technologyCapabilitiesV7>;
  readonly connectedRoads: ReadonlySet<string>;
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
    capabilities: technologyCapabilitiesV7(view.viewer.researchedTechs),
    connectedRoads: publicCapitalConnectedRoads(view),
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
): MovementPathResultV7 {
  if (path.length === 0) return { legal: false, reason: "EMPTY_PATH" };
  const role = effectiveRoleRuleV7(unit.role);
  const capabilities = context.capabilities;
  const budget2 = (unit.form === "EMBARKED" ? 3 : role.move) * 2;
  let current = unit.at;
  let spentPoints2 = 0;
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
      if (
        (unit.form === "LAND" && water) ||
        (unit.form !== "LAND" && !water) ||
        (water &&
          tile.terrain === "DEEP_WATER" &&
          !view.viewer.researchedTechs.includes("NAVIGATION"))
      )
        return { legal: false, reason: "ENGINEERING_REQUIRED" };
    }
    spentPoints2 += publicStepCost2(view, current, tile, context);
    if (spentPoints2 > budget2)
      return { legal: false, reason: "BUDGET_EXCEEDED" };
    if (tile.explored === false && tile.diplomaticBlock === "ALLIED_TERRITORY")
      return { legal: false, reason: "ALLY_TERRITORY_FORBIDDEN" };
    if (
      context.unitsByPosition
        .get(key(step))
        ?.some((candidate) => candidate.id !== unit.id)
    )
      return { legal: false, reason: "OCCUPIED" };
    if (
      tile.explored &&
      tile.territoryOwnerId !== null &&
      publicAllied(view, unit.ownerId, tile.territoryOwnerId)
    )
      return { legal: false, reason: "ALLY_TERRITORY_FORBIDDEN" };
    if (
      tile.explored &&
      tile.terrain === "MOUNTAIN" &&
      !capabilities.mountainMovement
    )
      return { legal: false, reason: "ENGINEERING_REQUIRED" };
    const ignoresForest = capabilities.forestMovementFreedomRoles.includes(
      unit.role,
    );
    const entersZoc = publicHostileZoc(view, unit, step, context);
    const terrainStops =
      tile.explored &&
      (tile.terrain === "MOUNTAIN" ||
        (tile.terrain === "FOREST" && !ignoresForest));
    const stops = !tile.explored || terrainStops || entersZoc;
    traversedPath.push(step);
    current = step;
    if (stops && index < path.length - 1)
      return {
        legal: false,
        reason: !tile.explored
          ? "UNEXPLORED_INTERMEDIATE"
          : tile.terrain === "MOUNTAIN"
            ? "MOUNTAIN_STOPS_MOVE"
            : tile.terrain === "FOREST" && !ignoresForest
              ? "FOREST_STOPS_MOVE"
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

export function movementStepCost2V7(
  state: Pick<GameStateV7, "board" | "cities">,
  player: PlayerStateV7,
  from: CoordV7,
  to: CoordV7,
  connectedRoads = capitalConnectedRoadKeysV7(state, player.id),
): 1 | 2 {
  if (!player.researchedTechs.includes("ROADS") || chebyshev(from, to) !== 1)
    return 2;
  const fromTile = tileAtV7(state.board, from);
  const toTile = tileAtV7(state.board, to);
  if (fromTile === undefined || toTile === undefined) return 2;
  if (fromTile.biome === null || toTile.biome === null) return 2;
  const fromRoad = fromTile.road && tileOwner(state, fromTile) === player.id;
  const toRoad = toTile.road && tileOwner(state, toTile) === player.id;
  const fromCity = ownedCity(state, player.id, from);
  const toCity = ownedCity(state, player.id, to);
  return (fromRoad || fromCity) &&
    (toRoad || toCity) &&
    connectedRoads.has(key(from)) &&
    connectedRoads.has(key(to))
    ? 1
    : 2;
}

export function unitSightRadiusAtV7(
  state: GameStateV7,
  unit: UnitStateV7,
  tile = tileAtV7(state.board, unit.at),
): number {
  if (unit.form === "EMBARKED") return 1;
  const player = requirePlayer(state, unit.ownerId);
  const capabilities = technologyCapabilitiesV7(player.researchedTechs);
  const base = Math.max(
    effectiveRoleRuleV7(unit.role).sightRadius,
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
      (unit.role !== "SABOTEUR" ||
        isUnitVisibleToPlayerV7(state, target.ownerId, unit)) &&
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
  if (projector.form === "EMBARKED") return false;
  const targetTile = tileAtV7(state.board, at);
  const water = targetTile?.biome === null;
  if (!water) return projector.form !== "NAVAL";
  if (projector.form === "NAVAL") {
    if (targetTile?.terrain !== "DEEP_WATER") return true;
    return requirePlayer(state, projector.ownerId).researchedTechs.includes(
      "NAVIGATION",
    );
  }
  const rule = effectiveRoleRuleV7(projector.role);
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
  const rule = effectiveRoleRuleV7(projector.role);
  return (
    targetForm !== "LAND" &&
    rule.abilities.includes("ATTACK") &&
    rule.minimumRange <= 1 &&
    rule.range >= 1
  );
}
function publicStepCost2(
  view: PlayerViewV7,
  from: CoordV7,
  to: PlayerTileViewV7,
  context = publicMovementContextV7(view),
): 1 | 2 {
  if (
    !view.viewer.researchedTechs.includes("ROADS") ||
    chebyshev(from, to.at) !== 1
  )
    return 2;
  const fromTile = publicTileAt(view, from);
  if (fromTile?.explored !== true || to.explored !== true) return 2;
  const fromRoad =
    fromTile.road && fromTile.territoryOwnerId === view.viewer.id;
  const toRoad = to.road && to.territoryOwnerId === view.viewer.id;
  const fromCity = context.ownedCityKeys.has(key(fromTile.at));
  const toCity = context.ownedCityKeys.has(key(to.at));
  const connected = context.connectedRoads;
  return (fromRoad || fromCity) &&
    (toRoad || toCity) &&
    connected.has(key(fromTile.at)) &&
    connected.has(key(to.at))
    ? 1
    : 2;
}

function publicCapitalConnectedRoads(view: PlayerViewV7): ReadonlySet<string> {
  const roads = new Map(
    view.board.tiles.flatMap((tile) =>
      tile.explored && tile.road && tile.territoryOwnerId === view.viewer.id
        ? [[key(tile.at), tile.at] as const]
        : [],
    ),
  );
  for (const city of view.cities) {
    const tile = publicTileAt(view, city.at);
    if (
      city.ownerId === view.viewer.id &&
      tile?.explored === true &&
      tile.territoryOwnerId === view.viewer.id
    )
      roads.set(key(city.at), city.at);
  }
  const capitals = view.cities.filter(
    (city) => city.ownerId === view.viewer.id && city.isCapital,
  );
  const connected = new Set<string>();
  const queue: CoordV7[] = [];
  for (const capital of capitals)
    if (roads.has(key(capital.at))) {
      connected.add(key(capital.at));
      queue.push(capital.at);
    }
  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index];
    if (current === undefined) break;
    for (const [dx, dy] of ROAD_NEIGHBORS) {
      const candidate = { x: current.x + dx, y: current.y + dy };
      const candidateKey = key(candidate);
      if (roads.has(candidateKey) && !connected.has(candidateKey)) {
        connected.add(candidateKey);
        queue.push(candidate);
      }
    }
  }
  return connected;
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
const ROAD_NEIGHBORS = [
  [-1, -1],
  [1, -1],
  [-1, 1],
  [1, 1],
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
] as const;
