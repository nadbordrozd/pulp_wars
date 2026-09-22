import {
  viewForV7,
  type PlayerTileViewV7,
  type PlayerViewV7,
  type PublicTerritoryBorderV7,
} from "../../src/engine/index";
import { exploredAllV7, initialV7 } from "./v7-builders";

/** Presentation-only public scene: mixed terrain, adjacent owners, Roads and fog. */
export function territoryReviewFixtureV7(): PlayerViewV7 {
  const state = exploredAllV7(initialV7(1519));
  const base = viewForV7(state, state.humanPlayerId);
  const city = base.cities.find((item) => item.ownerId === base.viewer.id);
  const rival = base.players.find((item) => item.id !== base.viewer.id);
  const unit = base.units.find((item) => item.ownerId === base.viewer.id);
  if (!city || !rival || !unit)
    throw new Error("Territory fixture missing pieces");
  const ownerAt = (x: number, y: number) =>
    x >= 1 && x <= 3 && y >= 1 && y <= 3
      ? base.viewer.id
      : x >= 4 && x <= 5 && y >= 1 && y <= 3
        ? rival.id
        : null;
  const tiles: PlayerTileViewV7[] = base.board.tiles
    .filter((tile) => tile.at.x < 6 && tile.at.y < 5)
    .map((tile): PlayerTileViewV7 => {
      const { x, y } = tile.at;
      if (x === 5 && y < 2) return { at: tile.at, explored: false };
      if (!tile.explored) throw new Error("Expected explored base fixture");
      const terrain =
        (x === 1 && y === 1) || (x === 3 && y === 3)
          ? "FOREST"
          : (x === 3 && y === 1) || (x === 0 && y === 3)
            ? "MOUNTAIN"
            : "GRASS";
      return {
        ...tile,
        terrain,
        resource: null,
        improvement: x === 1 && y === 3 ? "FARM" : null,
        road: y === 2 && x !== 2,
        site: null,
        territoryCityId: ownerAt(x, y) === base.viewer.id ? city.id : null,
        territoryOwnerId: ownerAt(x, y),
      };
    });
  const known = new Set(
    tiles
      .filter((tile) => tile.explored)
      .map((tile) => `${tile.at.x},${tile.at.y}`),
  );
  const territoryBorders: PublicTerritoryBorderV7[] = [];
  for (const tile of tiles) {
    const { x, y } = tile.at;
    for (const [edge, dx, dy] of [
      ["NORTH", 0, -1],
      ["EAST", 1, 0],
      ["SOUTH", 0, 1],
      ["WEST", -1, 0],
    ] as const) {
      if ((edge === "NORTH" && y > 0) || (edge === "WEST" && x > 0)) continue;
      if (!known.has(`${x},${y}`) && !known.has(`${x + dx},${y + dy}`))
        continue;
      const owner = ownerAt(x, y);
      const neighborOwner = ownerAt(x + dx, y + dy);
      if (owner === neighborOwner) continue;
      territoryBorders.push({
        at: tile.at,
        edge,
        ownerId: owner ?? neighborOwner,
        cityIds:
          owner === base.viewer.id || neighborOwner === base.viewer.id
            ? [city.id]
            : [],
      });
    }
  }
  return {
    ...base,
    cities: [{ ...city, at: { x: 2, y: 2 }, expanded: false }],
    units: [{ ...unit, at: { x: 1, y: 2 } }],
    treasureChests: [],
    board: {
      ...base.board,
      // Crop the public presentation entries without changing ruleset board size.
      tiles,
      territoryBorders,
    },
  };
}
