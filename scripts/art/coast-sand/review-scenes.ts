/**
 * Game states for the shoreline review (bead pulp_wars-2yc.5,
 * docs/art/COAST_SAND.md). Loaded in the browser through the Vite dev
 * server by scripts/art/look-switch-review.ts; nothing here is part of the
 * game build.
 *
 * Each scene is a real generated start on a map with sea (Continents or
 * Archipelago), the area round the human capital explored, with a Port on
 * the coastal land tile nearest the capital (made Grass, in its territory). The Ice Folk
 * scene also freezes the water beside the capital's coast.
 */
import {
  MAP_GENERATION_REVISION_V7,
  RULESET_7_ID,
  createPlayableGameV7,
  type CoordV7,
  type FactionIdV7,
  type GameStateV7,
  type MapTypeV7,
  type TileStateV7,
} from "../../../src/engine/index";
import type { LookSwitchShot } from "../look-switch-review";

function start(
  faction: FactionIdV7,
  mapType: MapTypeV7,
  seed: number,
): GameStateV7 {
  const created = createPlayableGameV7({
    rulesetId: RULESET_7_ID,
    seed,
    width: 16,
    height: 16,
    aiCount: 1,
    aiDifficulty: "NORMAL",
    aiMode: "RIVAL",
    humanColor: "CORAL",
    factions: [faction, faction === "ORIGINAL" ? "GOBLIN" : "ORIGINAL"],
    mapType,
    mapGenerationRevision: MAP_GENERATION_REVISION_V7,
    curiosities: false,
  });
  if (!created.ok) throw new Error(created.error.code);
  return created.state;
}

const key = (at: CoordV7): string => `${at.x},${at.y}`;
const WATER = new Set(["SHALLOW_WATER", "DEEP_WATER"]);

function coast(
  faction: FactionIdV7,
  mapType: MapTypeV7,
  seed: number,
  ice: boolean,
): GameStateV7 {
  const state = start(faction, mapType, seed);
  const capital = state.cities.find(
    (city) => city.ownerId === state.humanPlayerId,
  );
  if (capital === undefined) throw new Error("no capital");
  const tileAt = new Map(state.board.tiles.map((tile) => [key(tile.at), tile]));
  const beside = (tile: TileStateV7, wet: boolean): boolean =>
    [
      [0, -1],
      [1, 0],
      [0, 1],
      [-1, 0],
    ].some(([dx, dy]) => {
      const other = tileAt.get(
        key({ x: tile.at.x + (dx ?? 0), y: tile.at.y + (dy ?? 0) }),
      );
      return other !== undefined && WATER.has(other.terrain) === wet;
    });
  const far = (at: CoordV7): number =>
    Math.max(Math.abs(at.x - capital.at.x), Math.abs(at.y - capital.at.y));
  const near = (at: CoordV7, radius: number): boolean => far(at) <= radius;
  // The coastal land tile nearest the capital takes the Port.
  const port = state.board.tiles
    .filter(
      (tile) =>
        tile.biome !== null &&
        !WATER.has(tile.terrain) &&
        tile.terrain !== "RIFT" &&
        tile.site === null &&
        beside(tile, true),
    )
    .sort((a, b) => far(a.at) - far(b.at) || a.at.y - b.at.y)[0];
  return {
    ...state,
    ice: ice
      ? state.board.tiles
          .filter(
            (tile) =>
              WATER.has(tile.terrain) &&
              near(tile.at, 3) &&
              beside(tile, false),
          )
          // Every second coastal water tile, so ice and open coast alternate.
          .filter((_, index) => index % 2 === 0)
          .map((tile) => ({
            at: tile.at,
            ownerId: state.humanPlayerId,
            turnsLeft: 3,
          }))
          .sort((a, b) => a.at.y - b.at.y || a.at.x - b.at.x)
      : state.ice,
    board: {
      ...state.board,
      tiles: state.board.tiles.map((tile) =>
        port !== undefined && key(tile.at) === key(port.at)
          ? {
              ...tile,
              terrain: "GRASS" as const,
              improvement: "PORT" as const,
              resource: null,
              territoryCityId: capital.id,
            }
          : tile,
      ),
    },
    players: state.players.map((player) =>
      player.id === state.humanPlayerId
        ? {
            ...player,
            explored: state.board.tiles
              .map((tile) => tile.at)
              .filter((at) => near(at, 5)),
          }
        : player,
    ),
  };
}

/** Seeds whose human capital stands on a coast with bays and corners. */
export const sceneHuman = (): GameStateV7 =>
  coast("ORIGINAL", "CONTINENTS", 31, false);
export const sceneMartian = (): GameStateV7 =>
  coast("MARTIAN", "ARCHIPELAGO", 12, false);
export const sceneIceFolk = (): GameStateV7 =>
  coast("ICE_FOLK", "ARCHIPELAGO", 12, true);
export const sceneCandy = (): GameStateV7 =>
  coast("CANDY", "ARCHIPELAGO", 7, false);

export const SWITCH_PARAMETER = "coast-sand";

const CROP = [240, 60, 960, 840] as const;
/** The cells round the capital (the page's centre), shown again at 3x. */
const ZOOM = [520, 340, 320, 250] as const;
const shot = (name: string, scene: string): LookSwitchShot => ({
  name,
  scene,
  zoomIn: 1,
  crop: CROP,
  zoom: ZOOM,
});

export const REVIEW_SHOTS: readonly LookSwitchShot[] = [
  shot("human-continents", "sceneHuman"),
  shot("martian-archipelago", "sceneMartian"),
  shot("ice-folk-archipelago", "sceneIceFolk"),
  shot("candy-archipelago", "sceneCandy"),
];
