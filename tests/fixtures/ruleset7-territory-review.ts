import { viewForV7, type PlayerViewV7 } from "../../src/engine/index";
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
  return {
    ...base,
    cities: [{ ...city, at: { x: 2, y: 2 }, expanded: false }],
    units: [{ ...unit, at: { x: 1, y: 2 } }],
    treasureChests: [],
    board: {
      ...base.board,
      // Crop the public presentation entries without changing ruleset board size.
      tiles: base.board.tiles
        .filter((tile) => tile.at.x < 6 && tile.at.y < 5)
        .map((tile) => {
          const { x, y } = tile.at;
          if (x === 5 && y < 2) return { at: tile.at, explored: false };
          if (!tile.explored) throw new Error("Expected explored base fixture");
          const owned = x >= 1 && x <= 3 && y >= 1 && y <= 3;
          const foreign = x >= 4 && y >= 1 && y <= 3;
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
            territoryCityId: owned ? city.id : null,
            territoryOwnerId: owned
              ? base.viewer.id
              : foreign
                ? rival.id
                : null,
          };
        }),
    },
  };
}
