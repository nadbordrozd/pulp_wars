import type { PlayerId } from "../model/ids";
import { effectiveRoleRuleV6 } from "../rules/ruleset-v6";
import { arePlayersAlliedV6, arePlayersHostileV6 } from "./economy";
import { capitalConnectedRoadKeysV6 } from "./spatial-economy";
import type {
  CoordV6,
  GameStateV6,
  PlayerStateV6,
  TileStateV6,
  UnitStateV6,
} from "./types";

export type MovementFailureReasonV6 =
  | "EMPTY_PATH"
  | "BUDGET_EXCEEDED"
  | "NOT_ADJACENT"
  | "OUT_OF_BOUNDS"
  | "OCCUPIED"
  | "SURVEYING_REQUIRED"
  | "UNEXPLORED_INTERMEDIATE"
  | "MOUNTAIN_STOPS_MOVE"
  | "FOREST_STOPS_MOVE"
  | "ZOC_STOPS_MOVE"
  | "ALLY_TERRITORY_FORBIDDEN";

export type MovementPathResultV6 =
  | {
      readonly legal: true;
      readonly destination: CoordV6;
      readonly traversedPath: readonly CoordV6[];
      readonly spentPoints2: number;
      readonly stopped: boolean;
      readonly explored: readonly CoordV6[];
      readonly revealed: readonly CoordV6[];
      readonly interruption: {
        readonly at: CoordV6;
        readonly reason: "OCCUPIED" | "SURVEYING_REQUIRED" | "ZOC";
      } | null;
    }
  | { readonly legal: false; readonly reason: MovementFailureReasonV6 };

export interface ReachablePathV6 {
  readonly destination: CoordV6;
  readonly path: readonly CoordV6[];
  readonly spentPoints2: number;
}

type MovementTileStateV6 = TileStateV6 & {
  /** Observation-safe synthetic states retain this already-public owner. */
  readonly territoryOwnerId?: PlayerId | null;
};

/** Validates v6 integer-half-point movement without consuming PRNG. */
export function validateMovementPathV6(
  state: GameStateV6,
  unit: UnitStateV6,
  path: readonly CoordV6[],
): MovementPathResultV6 {
  if (path.length === 0) return { legal: false, reason: "EMPTY_PATH" };
  const player = state.players.find(
    (candidate) => candidate.id === unit.ownerId,
  );
  if (player === undefined) throw new RangeError("INVALID_STATE");
  const role = effectiveRoleRuleV6(player.faction, unit.role);
  const budget2 = role.move * 2;
  const connectedRoads = capitalConnectedRoadKeysV6(state, player.id);
  let explored = player.explored;
  const revealed: CoordV6[] = [];
  let current = unit.at;
  let spentPoints2 = 0;
  const traversedPath: CoordV6[] = [];

  for (let index = 0; index < path.length; index += 1) {
    const step = path[index];
    if (step === undefined) throw new RangeError("INVALID_STATE");
    if (chebyshev(current, step) !== 1) {
      return { legal: false, reason: "NOT_ADJACENT" };
    }
    const tile = tileAt(state, step);
    if (tile === undefined) return { legal: false, reason: "OUT_OF_BOUNDS" };
    const wasExplored = containsCoord(
      state.setup.aiMode === "COOPERATIVE" ? player.explored : explored,
      step,
    );
    const stepCost2 = wasExplored
      ? movementStepCost2V6(state, player, current, step, connectedRoads)
      : 2;
    spentPoints2 += stepCost2;
    if (spentPoints2 > budget2) {
      return { legal: false, reason: "BUDGET_EXCEEDED" };
    }
    const allied = tileOwnerId(state, tile);
    if (allied !== null && arePlayersAlliedV6(state, player.id, allied)) {
      return { legal: false, reason: "ALLY_TERRITORY_FORBIDDEN" };
    }
    const occupied =
      state.units.some(
        (candidate) =>
          candidate.id !== unit.id &&
          candidate.hp > 0 &&
          sameCoord(candidate.at, step),
      ) || state.chocolateWalls.some((wall) => sameCoord(wall.at, step));
    const surveyingRequired =
      tile.terrain === "MOUNTAIN" &&
      !player.researchedTechs.includes("SURVEYING");
    if (occupied || surveyingRequired) {
      if (wasExplored) {
        return {
          legal: false,
          reason: occupied ? "OCCUPIED" : "SURVEYING_REQUIRED",
        };
      }
      const reveal = revealRadiusV6(state, explored, step, 1);
      explored = reveal.explored;
      revealed.push(...reveal.revealed);
      return {
        legal: true,
        destination: current,
        traversedPath,
        spentPoints2,
        stopped: true,
        explored,
        revealed: uniqueSortedCoords(revealed),
        interruption: {
          at: step,
          reason: occupied ? "OCCUPIED" : "SURVEYING_REQUIRED",
        },
      };
    }

    const ignoresForestTermination =
      player.researchedTechs.includes("FIELDCRAFT") &&
      (unit.role === "SCOUT" || unit.role === "MARKSMAN");
    const ignoresZoc =
      player.researchedTechs.includes("MANEUVER") &&
      (unit.role === "SCOUT" || unit.role === "RAIDER");
    const previouslyExplored = explored;
    const sightRadius =
      role.sightRadius +
      (tile.terrain === "MOUNTAIN" &&
      player.researchedTechs.includes("SURVEYING")
        ? 1
        : 0);
    const reveal = revealRadiusV6(state, explored, step, sightRadius);
    explored = reveal.explored;
    revealed.push(...reveal.revealed);
    const entersZoc =
      !ignoresZoc && isInHostileZoc(state, player.id, step, explored);
    const entersNewlyRevealedZoc =
      entersZoc && !isInHostileZoc(state, player.id, step, previouslyExplored);
    const terrainStops =
      tile.terrain === "MOUNTAIN" ||
      (tile.terrain === "FOREST" && !ignoresForestTermination);
    const stops = !wasExplored || terrainStops || entersZoc;
    traversedPath.push(step);
    current = step;
    if (stops && index < path.length - 1) {
      if (entersNewlyRevealedZoc) {
        return {
          legal: true,
          destination: current,
          traversedPath,
          spentPoints2,
          stopped: true,
          explored,
          revealed: uniqueSortedCoords(revealed),
          interruption: { at: step, reason: "ZOC" },
        };
      }
      return {
        legal: false,
        reason: !wasExplored
          ? "UNEXPLORED_INTERMEDIATE"
          : tile.terrain === "MOUNTAIN"
            ? "MOUNTAIN_STOPS_MOVE"
            : tile.terrain === "FOREST" && !ignoresForestTermination
              ? "FOREST_STOPS_MOVE"
              : "ZOC_STOPS_MOVE",
      };
    }
    if (stops) {
      return {
        legal: true,
        destination: current,
        traversedPath,
        spentPoints2,
        stopped: true,
        explored,
        revealed: uniqueSortedCoords(revealed),
        interruption: null,
      };
    }
  }
  return {
    legal: true,
    destination: current,
    traversedPath,
    spentPoints2,
    stopped: false,
    explored,
    revealed: uniqueSortedCoords(revealed),
    interruption: null,
  };
}

/** Complete explored-only movement intents for a public-equivalent state. */
export function reachableMovementPathsV6(
  state: GameStateV6,
  unit: UnitStateV6,
): readonly ReachablePathV6[] {
  const player = state.players.find(
    (candidate) => candidate.id === unit.ownerId,
  );
  if (player === undefined) return [];
  const explored = new Set(player.explored.map(coordKey));
  const queue: (readonly CoordV6[])[] = [[]];
  const bestCost = new Map<string, number>([[coordKey(unit.at), 0]]);
  const result = new Map<string, ReachablePathV6>();
  while (queue.length > 0) {
    const path = queue.shift();
    if (path === undefined) break;
    const current = path.at(-1) ?? unit.at;
    for (const destination of adjacentCoords(state, current)) {
      if (!explored.has(coordKey(destination))) continue;
      const candidate = [...path, destination];
      const validation = validateMovementPathV6(state, unit, candidate);
      if (
        !validation.legal ||
        validation.traversedPath.length !== candidate.length
      ) {
        continue;
      }
      const key = coordKey(validation.destination);
      const prior = bestCost.get(key);
      if (prior !== undefined && prior <= validation.spentPoints2) continue;
      bestCost.set(key, validation.spentPoints2);
      result.set(key, {
        destination: validation.destination,
        path: candidate,
        spentPoints2: validation.spentPoints2,
      });
      if (!validation.stopped) queue.push(candidate);
    }
  }
  return [...result.values()].sort((left, right) =>
    compareCoords(left.destination, right.destination),
  );
}

export function movementStepCost2V6(
  state: Pick<GameStateV6, "board" | "cities">,
  player: PlayerStateV6,
  from: CoordV6,
  to: CoordV6,
  connectedRoads = capitalConnectedRoadKeysV6(state, player.id),
): 1 | 2 {
  if (!player.researchedTechs.includes("ROADS") || manhattan(from, to) !== 1) {
    return 2;
  }
  const fromTile = tileAt(state, from);
  const toTile = tileAt(state, to);
  if (fromTile === undefined || toTile === undefined) return 2;
  const fromRoad = fromTile.road && tileOwnerId(state, fromTile) === player.id;
  const toRoad = toTile.road && tileOwnerId(state, toTile) === player.id;
  const fromCity = ownedCityCenter(state, player.id, from);
  const toCity = ownedCityCenter(state, player.id, to);
  const endpointKindsAreValid = (fromRoad || fromCity) && (toRoad || toCity);
  const touchesConnectedRoad =
    (fromRoad && connectedRoads.has(coordKey(from))) ||
    (toRoad && connectedRoads.has(coordKey(to)));
  return endpointKindsAreValid && touchesConnectedRoad ? 1 : 2;
}

function ownedCityCenter(
  state: Pick<GameStateV6, "cities">,
  playerId: PlayerId,
  at: CoordV6,
): boolean {
  return state.cities.some(
    (city) => city.ownerId === playerId && sameCoord(city.at, at),
  );
}

function tileOwnerId(
  state: Pick<GameStateV6, "cities">,
  tile: MovementTileStateV6,
): PlayerId | null {
  if (tile.territoryOwnerId !== undefined) return tile.territoryOwnerId;
  if (tile.territoryCityId === null) return null;
  return (
    state.cities.find((city) => city.id === tile.territoryCityId)?.ownerId ??
    null
  );
}

function isInHostileZoc(
  state: GameStateV6,
  ownerId: PlayerId,
  at: CoordV6,
  explored: readonly CoordV6[],
): boolean {
  return state.units.some(
    (unit) =>
      unit.hp > 0 &&
      arePlayersHostileV6(state, ownerId, unit.ownerId) &&
      containsCoord(explored, unit.at) &&
      chebyshev(unit.at, at) === 1,
  );
}

function revealRadiusV6(
  state: Pick<GameStateV6, "board">,
  explored: readonly CoordV6[],
  center: CoordV6,
  radius: number,
): {
  readonly explored: readonly CoordV6[];
  readonly revealed: readonly CoordV6[];
} {
  const known = new Set(explored.map(coordKey));
  const next = [...explored];
  const revealed: CoordV6[] = [];
  for (
    let y = Math.max(0, center.y - radius);
    y <= Math.min(state.board.height - 1, center.y + radius);
    y += 1
  ) {
    for (
      let x = Math.max(0, center.x - radius);
      x <= Math.min(state.board.width - 1, center.x + radius);
      x += 1
    ) {
      const at = { x, y };
      if (!known.has(coordKey(at))) {
        known.add(coordKey(at));
        next.push(at);
        revealed.push(at);
      }
    }
  }
  return {
    explored: uniqueSortedCoords(next),
    revealed: uniqueSortedCoords(revealed),
  };
}

function containsCoord(values: readonly CoordV6[], at: CoordV6): boolean {
  return values.some((candidate) => sameCoord(candidate, at));
}

function uniqueSortedCoords(values: readonly CoordV6[]): readonly CoordV6[] {
  return [...new Map(values.map((at) => [coordKey(at), at])).values()].sort(
    compareCoords,
  );
}

function adjacentCoords(
  state: Pick<GameStateV6, "board">,
  center: CoordV6,
): readonly CoordV6[] {
  const values: CoordV6[] = [];
  for (let y = center.y - 1; y <= center.y + 1; y += 1) {
    for (let x = center.x - 1; x <= center.x + 1; x += 1) {
      const at = { x, y };
      if (!sameCoord(center, at) && tileAt(state, at) !== undefined)
        values.push(at);
    }
  }
  return values.sort(compareCoords);
}

function tileAt(
  state: Pick<GameStateV6, "board">,
  at: CoordV6,
): TileStateV6 | undefined {
  if (
    at.x < 0 ||
    at.y < 0 ||
    at.x >= state.board.width ||
    at.y >= state.board.height
  ) {
    return undefined;
  }
  const tile = state.board.tiles[at.y * state.board.width + at.x];
  return tile !== undefined && sameCoord(tile.at, at) ? tile : undefined;
}

function chebyshev(left: CoordV6, right: CoordV6): number {
  return Math.max(Math.abs(left.x - right.x), Math.abs(left.y - right.y));
}

function manhattan(left: CoordV6, right: CoordV6): number {
  return Math.abs(left.x - right.x) + Math.abs(left.y - right.y);
}

function coordKey(at: CoordV6): string {
  return `${at.y},${at.x}`;
}

function compareCoords(left: CoordV6, right: CoordV6): number {
  return left.y - right.y || left.x - right.x;
}

function sameCoord(left: CoordV6, right: CoordV6): boolean {
  return left.x === right.x && left.y === right.y;
}
