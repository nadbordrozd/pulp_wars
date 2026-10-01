/**
 * Synthetic in-game scenes for the playtest round 3 art review (bead
 * pulp_wars-6gd.5), loaded in the browser through the Vite dev server by
 * scripts/art/chibi-playtest3-review.ts. Each scene is a 7 x 7 patch written
 * around the viewer's capital with chibiReviewSceneViewV7 and drawn by the
 * real CanvasBoardHostV7 with ?art=chibi; a phone sees about the five
 * columns around the capital, so every scene keeps its subject there.
 * Nothing here is part of the game build.
 *
 * - ROCKET: the fireworks-style Goblin Rocket Cart for a Goblin viewer and
 *   rival beside every other Goblin land unit and a Human Catapult (an
 *   extra Human seat), on Grass, Forest and rocky Mountain ground.
 * - FARMS: the grain-field Farm in a 3 x 3 block and in pairs for two
 *   owners, beside Windmills (which keep their owner colour), Fertile
 *   Ground, a Road and a Fighter standing in a field.
 * - MOUNTAINS: a Mountain range on the rocky ground with Ore, Mines and
 *   Roads, beside Grass, Forest, Shallow and Deep Water, with units on and
 *   next to it.
 */
import type { PlayerViewV7 } from "../../../src/engine/index";
import { CanvasBoardHostV7 } from "../../../src/render/canvas/board-host-v7";
import {
  chibiReviewSceneViewV7,
  type ChibiReviewSceneLayoutV7,
} from "./review-scene-v7";

type Layout = ChibiReviewSceneLayoutV7["layout"];
type Cell = Layout[number][number];

const G: Cell = { terrain: "GRASS" };
const F: Cell = { terrain: "FOREST" };
const M: Cell = { terrain: "MOUNTAIN" };
const S: Cell = { terrain: "SHALLOW_WATER" };
const D: Cell = { terrain: "DEEP_WATER" };
const ORE: Cell = { terrain: "MOUNTAIN", resource: "ORE" };
const MINE: Cell = {
  terrain: "MOUNTAIN",
  resource: "ORE",
  improvement: "MINE",
};
const FARM: Cell = {
  terrain: "GRASS",
  resource: "FERTILE_GROUND",
  improvement: "FARM",
  owner: "VIEWER",
};
const RIVAL_FARM: Cell = { ...FARM, owner: "RIVAL" };

const viewer = (unit: NonNullable<Cell["unit"]>, cell: Cell = G): Cell => ({
  ...cell,
  owner: "VIEWER",
  unit,
});
const rival = (unit: NonNullable<Cell["unit"]>, cell: Cell = G): Cell => ({
  ...cell,
  owner: "RIVAL",
  unit,
});
const human = (unit: NonNullable<Cell["unit"]>, cell: Cell = G): Cell => ({
  ...cell,
  owner: "HUMAN",
  unit,
});

/** Rows top to bottom; the capital is the middle cell (column 3, row 3). */
const ROCKET: Layout = [
  [G, G, F, G, G, F, G],
  [
    G,
    viewer("RAIDER"),
    viewer("CATAPULT"),
    viewer("FIGHTER"),
    viewer("MARKSMAN"),
    viewer("KNIGHT"),
    G,
  ],
  [
    G,
    viewer("GUARD"),
    human("CATAPULT"),
    rival("CATAPULT"),
    rival("CAPTAIN"),
    viewer("JUGGERNAUT"),
    G,
  ],
  [G, G, viewer("CATAPULT"), G, human("CATAPULT"), rival("FIGHTER"), G],
  [
    G,
    rival("CATAPULT", F),
    human("FIGHTER"),
    viewer("CATAPULT", { terrain: "GRASS", road: true }),
    rival("CATAPULT", M),
    M,
    G,
  ],
  [G, F, G, { terrain: "GRASS", road: true }, viewer("CAPTAIN"), ORE, G],
  [G, G, G, G, G, G, G],
];

const FARMS: Layout = [
  [G, FARM, FARM, FARM, G, RIVAL_FARM, G],
  [
    G,
    FARM,
    FARM,
    FARM,
    { terrain: "GRASS", improvement: "WINDMILL", owner: "VIEWER" },
    RIVAL_FARM,
    RIVAL_FARM,
  ],
  [
    G,
    FARM,
    FARM,
    FARM,
    { terrain: "GRASS", road: true, owner: "VIEWER" },
    { terrain: "GRASS", improvement: "WINDMILL", owner: "RIVAL" },
    RIVAL_FARM,
  ],
  [
    F,
    { terrain: "GRASS", resource: "FERTILE_GROUND" },
    viewer("FIGHTER", FARM),
    G,
    { terrain: "GRASS", road: true, owner: "VIEWER" },
    RIVAL_FARM,
    G,
  ],
  [
    G,
    FARM,
    { terrain: "GRASS", improvement: "WINDMILL", owner: "VIEWER" },
    { terrain: "GRASS", road: true, owner: "VIEWER" },
    rival("GUARD", RIVAL_FARM),
    RIVAL_FARM,
    F,
  ],
  [G, FARM, FARM, G, G, { terrain: "GRASS", resource: "FERTILE_GROUND" }, G],
  [S, S, G, G, F, G, G],
];

const ROAD_M: Cell = { terrain: "MOUNTAIN", road: true };
const MOUNTAINS: Layout = [
  [S, S, M, ORE, M, G, F],
  [S, ORE, MINE, M, ORE, F, G],
  [G, M, { ...MINE, road: true }, ROAD_M, MINE, G, G],
  [G, viewer("FIGHTER"), ORE, G, rival("GUARD", M), F, G],
  [
    F,
    M,
    { terrain: "GRASS", road: true },
    { terrain: "GRASS", road: true },
    G,
    MINE,
    S,
  ],
  [G, G, F, viewer("MARKSMAN", ORE), M, ORE, S],
  [D, S, G, G, M, G, D],
];

export const PLAYTEST3_SCENES_V7 = {
  ROCKET: { layout: ROCKET, goblinRoster: true, extraSeats: ["HUMAN"] },
  FARMS: { layout: FARMS, goblinRoster: false, extraSeats: [] },
  MOUNTAINS: { layout: MOUNTAINS, goblinRoster: false, extraSeats: [] },
} as const;

export type Playtest3SceneIdV7 = keyof typeof PLAYTEST3_SCENES_V7;

export function playtest3SceneViewV7(
  live: PlayerViewV7,
  id: Playtest3SceneIdV7,
): PlayerViewV7 {
  const scene = PLAYTEST3_SCENES_V7[id];
  return chibiReviewSceneViewV7(live, {
    // ROSTER: each cell names its owner and units stand in their land form.
    kind: "ROSTER",
    layout: scene.layout,
    capital: { x: 3, y: 3 },
    undeadRival: false,
    undeadViewer: false,
    goblinRoster: scene.goblinRoster,
    extraSeats: scene.extraSeats,
  });
}

/** Mounts a full-screen CHIBI board host over the page showing one scene. */
export function showPlaytest3SceneV7(
  live: PlayerViewV7,
  id: Playtest3SceneIdV7,
): { readonly host: CanvasBoardHostV7; readonly canvas: HTMLCanvasElement } {
  const container = document.createElement("div");
  container.dataset.chibiReviewScene = "true";
  Object.assign(container.style, {
    position: "fixed",
    inset: "0",
    zIndex: "2147483647",
    background: "#173632",
  });
  document.body.append(container);
  const host = new CanvasBoardHostV7(document);
  host.mount(container, {
    onSelection: () => undefined,
    onCommand: () => undefined,
  });
  host.update({
    matchInstanceId: `chibi-playtest3-${id}`,
    view: playtest3SceneViewV7(live, id),
    offeredCommands: [],
    interaction: {
      selection: null,
      selectedUnitId: null,
      selectedAchievement: null,
    },
    interactive: false,
    motion: "REDUCED",
    animationSpeed: "NORMAL",
    presentationPaused: true,
    highContrast: false,
    artSet: "CHIBI",
  });
  const canvas = container.querySelector("canvas.board-canvas-v7");
  if (!(canvas instanceof HTMLCanvasElement))
    throw new Error("the review scene has no board canvas");
  return { host, canvas };
}
