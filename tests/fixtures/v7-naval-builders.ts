import {
  TECHNOLOGY_IDS_V7,
  applyCommandV7,
  sameCoordV7,
  type CoordV7,
  type GameStateV7,
  type UnitId,
} from "../../src/engine/index";
import { checkedV7, exploredAllV7, initialV7 } from "./v7-builders";

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
            hp: 20,
            maxHp: 20,
          }
        : unit.id === defender.id
          ? {
              ...unit,
              role: "GUARD" as const,
              form: "LAND" as const,
              at: hostileCity.at,
              hp: 15,
              maxHp: 15,
            }
          : unit,
    ),
  });
  return { state, attackerId: attacker.id, defenderId: defender.id };
}
