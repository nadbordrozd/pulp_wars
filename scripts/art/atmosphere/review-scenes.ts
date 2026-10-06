/**
 * Game states for the atmosphere review (bead pulp_wars-2yc.17,
 * docs/art/ATMOSPHERE.md): the edge between shallow and deep water, the
 * fog of war and the night sky outside the map. Loaded in the browser
 * through the Vite dev server by scripts/art/look-switch-review.ts; nothing
 * here is part of the game build.
 *
 * Each scene is a real generated start on a map with sea, with the area
 * round the human capital and a band out to the nearest corner of the map
 * explored, so one picture shows coasts, both waters, fog and the map's
 * edge.
 */
import {
  MAP_GENERATION_REVISION_V7,
  RULESET_7_ID,
  createPlayableGameV7,
  type BoardSizeV7,
  type CoordV7,
  type GameStateV7,
  type MapTypeV7,
} from "../../../src/engine/index";
import type { LookSwitchShot } from "../look-switch-review";

function scene(
  mapType: MapTypeV7,
  seed: number,
  size: BoardSizeV7,
  radius: number,
): GameStateV7 {
  const created = createPlayableGameV7({
    rulesetId: RULESET_7_ID,
    seed,
    width: size,
    height: size,
    aiCount: 1,
    aiDifficulty: "NORMAL",
    aiMode: "RIVAL",
    humanColor: "CORAL",
    factions: ["ORIGINAL", "GOBLIN"],
    mapType,
    mapGenerationRevision: MAP_GENERATION_REVISION_V7,
    curiosities: false,
  });
  if (!created.ok) throw new Error(created.error.code);
  const state = created.state;
  const capital = state.cities.find(
    (city) => city.ownerId === state.humanPlayerId,
  );
  if (capital === undefined) throw new Error("no capital");
  // The nearest corner of the map, and the band from the capital to it.
  const cornerX = capital.at.x < size / 2 ? 0 : size - 1;
  const cornerY = capital.at.y < size / 2 ? 0 : size - 1;
  const between = (value: number, a: number, b: number): boolean =>
    value >= Math.min(a, b) && value <= Math.max(a, b);
  const seen = (at: CoordV7): boolean =>
    Math.max(Math.abs(at.x - capital.at.x), Math.abs(at.y - capital.at.y)) <=
      radius ||
    // A ragged band: every third row is one cell shorter.
    (between(at.x, capital.at.x, cornerX) &&
      between(at.y, capital.at.y, cornerY) &&
      (at.x + 2 * at.y) % 5 !== 0);
  return {
    ...state,
    players: state.players.map((player) =>
      player.id === state.humanPlayerId
        ? {
            ...player,
            explored: state.board.tiles.map((tile) => tile.at).filter(seen),
          }
        : player,
    ),
  };
}

export const sceneArchipelago = (): GameStateV7 =>
  scene("ARCHIPELAGO", 12, 16, 4);
export const sceneContinents = (): GameStateV7 =>
  scene("CONTINENTS", 31, 16, 4);
/** The largest map: the fog's and the sky's cost is measured on it. */
export const sceneLarge = (): GameStateV7 => scene("ARCHIPELAGO", 5, 25, 6);

/**
 * The switch the pairs compare. `look-switch-review.ts` reads
 * `SWITCH_PARAMETER` from the environment first, so the same scenes serve
 * `water-blend`, `fog-style` and `starfield`.
 */
export const SWITCH_PARAMETER = "water-blend";

export const REVIEW_SHOTS: readonly LookSwitchShot[] = [
  // The whole start: fog, both waters, the map's east edge and the sky.
  {
    name: "archipelago",
    scene: "sceneArchipelago",
    zoomIn: 0,
    zoom: [700, 620, 320, 250],
  },
  // Zoomed in: the edge between the waters beside the fog.
  {
    name: "archipelago-near",
    scene: "sceneArchipelago",
    zoomIn: 2,
    zoom: [250, 230, 320, 250],
  },
  // Panned: the stars move less than the board.
  {
    name: "archipelago-panned",
    scene: "sceneArchipelago",
    zoomIn: 1,
    drag: [-320, -160],
    zoom: [900, 500, 320, 250],
  },
  {
    name: "continents",
    scene: "sceneContinents",
    zoomIn: 1,
    zoom: [380, 330, 320, 250],
  },
  {
    name: "large",
    scene: "sceneLarge",
    zoomIn: 0,
    zoom: [520, 330, 320, 250],
  },
];
