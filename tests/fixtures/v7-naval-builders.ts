import {
  TECHNOLOGY_IDS_V7,
  applyCommandV7,
  type CoordV7,
  type GameStateV7,
} from "../../src/engine/index";
import { checkedV7, exploredAllV7, initialV7 } from "./v7-builders";

export function coastalV7(seed = 9001): {
  state: GameStateV7;
  portAt: CoordV7;
} {
  let state = exploredAllV7(initialV7(seed));
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

export function withPortV7(seed = 9001): {
  state: GameStateV7;
  portAt: CoordV7;
} {
  const fixture = coastalV7(seed);
  const result = applyCommandV7(fixture.state, fixture.state.humanPlayerId, {
    kind: "BUILD_PORT",
    at: fixture.portAt,
  });
  if (!result.accepted) throw new Error(`port rejected: ${result.error.code}`);
  return { state: result.state, portAt: fixture.portAt };
}
