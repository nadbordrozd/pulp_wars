import {
  TECHNOLOGY_IDS_V7,
  applyCommandV7,
  sameCoordV7,
  type CoordV7,
  type GameStateV7,
  type UnitId,
} from "../../src/engine/index";
import { checkedV7, exploredAllV7, initialV7, setupV7 } from "./v7-builders";
import { revision13MapStateV7 } from "./v7-revision13-map";

export function coastalV7(
  seed = 9001,
  aiCount: 1 | 2 | 3 = 1,
): {
  state: GameStateV7;
  portAt: CoordV7;
} {
  let state = exploredAllV7(initialV7(seed, aiCount));
  const city = state.cities.find(
    (candidate) => candidate.ownerId === state.humanPlayerId,
  );
  if (city === undefined) throw new Error("human city missing");
  const portTile = state.board.tiles.find(
    (tile) =>
      tile.territoryCityId === city.id &&
      tile.site === null &&
      Math.max(
        Math.abs(tile.at.x - city.at.x),
        Math.abs(tile.at.y - city.at.y),
      ) === 1,
  );
  if (portTile === undefined) throw new Error("port tile missing");
  state = checkedV7({
    ...state,
    treasureChests: state.treasureChests.filter(
      (at) => at.x !== portTile.at.x || at.y !== portTile.at.y,
    ),
    players: state.players.map((player) =>
      player.id === state.humanPlayerId
        ? { ...player, coins: 100, researchedTechs: TECHNOLOGY_IDS_V7 }
        : player,
    ),
    board: {
      ...state.board,
      tiles: state.board.tiles.map((tile) =>
        tile.at.x === portTile.at.x && tile.at.y === portTile.at.y
          ? {
              ...tile,
              biome: null,
              terrain: "SHALLOW_WATER" as const,
              resource: null,
              improvement: null,
              road: false,
            }
          : tile,
      ),
    },
  });
  return { state, portAt: portTile.at };
}

export function withPortV7(
  seed = 9001,
  aiCount: 1 | 2 | 3 = 1,
): {
  state: GameStateV7;
  portAt: CoordV7;
} {
  const fixture = coastalV7(seed, aiCount);
  const result = applyCommandV7(fixture.state, fixture.state.humanPlayerId, {
    kind: "BUILD_PORT",
    at: fixture.portAt,
  });
  if (!result.accepted) throw new Error(`port rejected: ${result.error.code}`);
  return { state: result.state, portAt: fixture.portAt };
}

export function battleshipBombardmentV7(
  seed = 9500,
  aiCount: 1 | 2 | 3 = 1,
): {
  state: GameStateV7;
  attackerId: UnitId;
  defenderId: UnitId;
} {
  const fixture = withPortV7(seed, aiCount);
  const attacker = fixture.state.units.find(
    (unit) => unit.ownerId === fixture.state.humanPlayerId,
  );
  const defender = fixture.state.units.find(
    (unit) => unit.ownerId !== fixture.state.humanPlayerId,
  );
  const hostileCity = fixture.state.cities.find(
    (city) => city.ownerId !== fixture.state.humanPlayerId,
  );
  const waterAt = fixture.state.board.tiles.find(
    (tile) =>
      hostileCity !== undefined &&
      Math.max(
        Math.abs(tile.at.x - hostileCity.at.x),
        Math.abs(tile.at.y - hostileCity.at.y),
      ) === 1 &&
      !fixture.state.units.some((unit) => sameCoordV7(unit.at, tile.at)),
  )?.at;
  if (
    attacker === undefined ||
    defender === undefined ||
    hostileCity === undefined ||
    waterAt === undefined
  )
    throw new Error("bombardment pieces missing");
  const state = checkedV7({
    ...fixture.state,
    setup: { ...fixture.state.setup, mapType: "CONTINENTS" },
    players: fixture.state.players.map((player) =>
      player.id === fixture.state.humanPlayerId
        ? {
            ...player,
            achievementEntitlements: player.achievementEntitlements.map(
              (entitlement) =>
                entitlement.achievement === "EXPLORER"
                  ? { ...entitlement, unlocked: true }
                  : entitlement,
            ),
          }
        : player,
    ),
    treasureChests: fixture.state.treasureChests.filter(
      (at) => !sameCoordV7(at, waterAt),
    ),
    populationContributions: fixture.state.populationContributions.filter(
      (entry) =>
        entry.source.kind !== "IMPROVEMENT" ||
        !sameCoordV7(entry.source.at, waterAt),
    ),
    board: {
      ...fixture.state.board,
      tiles: fixture.state.board.tiles.map((tile) =>
        sameCoordV7(tile.at, waterAt)
          ? {
              ...tile,
              biome: null,
              terrain: "SHALLOW_WATER" as const,
              resource: null,
              improvement: null,
              road: false,
              site: null,
              territoryCityId: null,
            }
          : tile,
      ),
    },
    units: fixture.state.units.map((unit) =>
      unit.id === attacker.id
        ? {
            ...unit,
            role: "BATTLESHIP" as const,
            form: "NAVAL" as const,
            at: waterAt,
            hp: 25,
            maxHp: 25,
          }
        : unit.id === defender.id
          ? {
              ...unit,
              role: "GUARD" as const,
              form: "LAND" as const,
              at: hostileCity.at,
              hp: 17,
              maxHp: 17,
            }
          : unit,
    ),
  });
  return { state, attackerId: attacker.id, defenderId: defender.id };
}

/** A ready activation (nothing spent this turn). */
export const READY_ACTIVATION_V7: GameStateV7["units"][number]["activation"] = {
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

export interface EmbarkedLandingFixtureV7 {
  readonly state: GameStateV7;
  readonly unitId: UnitId;
  /** The embarked unit's start-of-turn water cell `S`. */
  readonly start: CoordV7;
  /** The water row east of `S`: one, two, and three cells away. */
  readonly water: readonly [CoordV7, CoordV7, CoordV7];
  /** Land north of `S`: a direct landing cell. */
  readonly direct: CoordV7;
  /** Land north of the first water cell only: Move 1, then land. */
  readonly afterMove: CoordV7;
  /** Land north of the second water cell only: out of landing reach. */
  readonly beyond: CoordV7;
}

/**
 * Revision 16 landing geometry on a Continents-labelled board with every
 * technology researched and the whole map explored by the human:
 *
 * ```text
 *   y-1   L  D  L  A  B  L
 *   y     L  S  W1 W2 W3 L
 *   y+1   L  L  L  L  L  L
 * ```
 *
 * `S` holds the human's first unit, embarked and ready; every other block
 * cell is neutral, empty Grass; the block lies at least four cells from every
 * other human unit and city and two from every other piece.
 */
export function embarkedLandingV7(
  seed = 9601,
  faction: "ORIGINAL" | "UNDEAD" = "ORIGINAL",
): EmbarkedLandingFixtureV7 {
  const setup = {
    ...setupV7(seed, 2),
    factions: [faction, "ORIGINAL", "ORIGINAL"],
  } as const;
  const base = revision13MapStateV7(setup);
  const mover = base.units.find((unit) => unit.ownerId === base.humanPlayerId);
  if (mover === undefined) throw new Error("human unit missing");
  const contributed = new Set(
    base.populationContributions.map((entry) => coordKey(entry.source.at)),
  );
  const tileAt = (at: CoordV7) =>
    at.x >= 0 &&
    at.y >= 0 &&
    at.x < base.board.width &&
    at.y < base.board.height
      ? base.board.tiles[at.y * base.board.width + at.x]
      : undefined;
  const pieces = [
    ...base.units
      .filter((unit) => unit.id !== mover.id)
      .map((unit) => ({
        at: unit.at,
        own: unit.ownerId === base.humanPlayerId,
      })),
    ...base.cities.map((city) => ({
      at: city.at,
      own: city.ownerId === base.humanPlayerId,
    })),
  ];
  for (let ay = 1; ay < base.board.height - 1; ay += 1)
    for (let ax = 1; ax < base.board.width - 4; ax += 1) {
      const block: CoordV7[] = [];
      for (let y = ay - 1; y <= ay + 1; y += 1)
        for (let x = ax - 1; x <= ax + 4; x += 1) block.push({ x, y });
      const fits = block.every((at) => {
        const tile = tileAt(at);
        return (
          tile !== undefined &&
          tile.site === null &&
          tile.improvement === null &&
          tile.territoryCityId === null &&
          !contributed.has(coordKey(at)) &&
          !base.treasureChests.some((chest) => sameCoordV7(chest, at)) &&
          pieces.every(
            (piece) =>
              Math.max(
                Math.abs(piece.at.x - at.x),
                Math.abs(piece.at.y - at.y),
              ) >= (piece.own ? 4 : 2),
          )
        );
      });
      if (!fits) continue;
      const start = { x: ax, y: ay };
      const water = [
        { x: ax + 1, y: ay },
        { x: ax + 2, y: ay },
        { x: ax + 3, y: ay },
      ] as const;
      const waterKeys = new Set([start, ...water].map(coordKey));
      const blockKeys = new Set(block.map(coordKey));
      const state = checkedV7({
        ...base,
        setup: { ...base.setup, mapType: "CONTINENTS" },
        activeSeatIndex: base.turnOrder.indexOf(base.humanPlayerId),
        players: base.players.map((player) =>
          player.id === base.humanPlayerId
            ? {
                ...player,
                researchedTechs: TECHNOLOGY_IDS_V7,
                explored: base.board.tiles.map((tile) => tile.at),
              }
            : player,
        ),
        board: {
          ...base.board,
          tiles: base.board.tiles.map((tile) =>
            !blockKeys.has(coordKey(tile.at))
              ? tile
              : waterKeys.has(coordKey(tile.at))
                ? {
                    ...tile,
                    biome: null,
                    terrain: "SHALLOW_WATER" as const,
                    resource: null,
                    road: false,
                    fieldDefense: false,
                  }
                : {
                    ...tile,
                    biome: tile.biome ?? ("PLAINS" as const),
                    terrain: "GRASS" as const,
                    resource: null,
                    road: false,
                    fieldDefense: false,
                  },
          ),
        },
        units: base.units.map((unit) =>
          unit.id === mover.id
            ? {
                ...unit,
                at: start,
                form: "EMBARKED" as const,
                captureEligible: false,
                activation: READY_ACTIVATION_V7,
              }
            : unit,
        ),
      });
      return {
        state,
        unitId: mover.id,
        start,
        water,
        direct: { x: ax, y: ay - 1 },
        afterMove: { x: ax + 2, y: ay - 1 },
        beyond: { x: ax + 3, y: ay - 1 },
      };
    }
  throw new Error(`no embarked landing geometry for seed ${seed}`);
}

function coordKey(at: CoordV7): string {
  return `${at.x},${at.y}`;
}
