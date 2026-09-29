/**
 * Synthetic in-game scene for chibi batch reviews (bead pulp_wars-67q.7).
 *
 * Loaded in the browser through the Vite dev server by
 * scripts/art/chibi-batch-review.ts: it takes the live Ruleset 7 player view,
 * rewrites a 9 x 7 patch around the viewer's capital into a showcase of
 * every map subject (resources, improvements and Farm pairs, Mines, Ports,
 * Roads with corner joins, Field Defense and a fortified tile, Treasure) for
 * two owners, and draws it with the real CanvasBoardHostV7 and ?art=chibi,
 * full screen over the running game. Nothing here is part of the game build.
 */
import type {
  CoordV7,
  ImprovementIdV7,
  PlayerViewV7,
  ResourceIdV7,
  TerrainIdV7,
  UnitRoleIdV7,
} from "../../../src/engine/index";
import { CanvasBoardHostV7 } from "../../../src/render/canvas/board-host-v7";

type Tile = PlayerViewV7["board"]["tiles"][number];

interface Cell {
  readonly terrain: TerrainIdV7;
  readonly resource?: ResourceIdV7;
  readonly improvement?: ImprovementIdV7;
  readonly road?: true;
  readonly fieldDefense?: true;
  readonly fortificationLevel?: number;
  readonly treasure?: true;
  readonly unit?: UnitRoleIdV7;
}

const G = "GRASS";
const F = "FOREST";
const M = "MOUNTAIN";
const S = "SHALLOW_WATER";
const D = "DEEP_WATER";

/**
 * Rows top to bottom, columns left to right; the capital sits at column 4,
 * row 3. Columns 0..4 are the viewer's territory, 5..8 a rival's.
 */
const LAYOUT: readonly (readonly Cell[])[] = [
  [
    { terrain: S, resource: "FISH", improvement: "PORT" },
    { terrain: S, resource: "FISH" },
    { terrain: S, resource: "PEARLS" },
    { terrain: D },
    { terrain: D },
    { terrain: S, improvement: "PORT" },
    { terrain: S, resource: "FISH" },
    { terrain: S, resource: "PEARLS" },
    { terrain: D },
  ],
  [
    { terrain: G, resource: "FRUIT" },
    { terrain: G, unit: "FIGHTER" },
    { terrain: G, road: true },
    { terrain: G, road: true },
    { terrain: G, road: true },
    { terrain: F, resource: "GAME" },
    { terrain: F, improvement: "LUMBER_CAMP" },
    { terrain: M, resource: "ORE" },
    { terrain: M, resource: "ORE", improvement: "MINE" },
  ],
  [
    { terrain: G, resource: "FERTILE_GROUND" },
    {
      terrain: G,
      resource: "FERTILE_GROUND",
      improvement: "FARM",
    },
    { terrain: G, resource: "FERTILE_GROUND", improvement: "FARM" },
    { terrain: G, road: true },
    { terrain: G, improvement: "MONUMENT" },
    { terrain: F },
    { terrain: F, improvement: "LUMBER_CAMP", road: true },
    { terrain: M, resource: "ORE", improvement: "MINE", road: true },
    { terrain: M, road: true },
  ],
  [
    { terrain: G, treasure: true },
    { terrain: G, resource: "FERTILE_GROUND", improvement: "FARM" },
    { terrain: G, unit: "KNIGHT" },
    { terrain: G, road: true },
    { terrain: G },
    { terrain: G, road: true },
    { terrain: G, road: true },
    { terrain: G, fieldDefense: true, unit: "GUARD" },
    { terrain: G, resource: "FRUIT" },
  ],
  [
    { terrain: G, resource: "FERTILE_GROUND", improvement: "FARM" },
    { terrain: G, resource: "FERTILE_GROUND", improvement: "FARM" },
    { terrain: G },
    { terrain: G, road: true },
    { terrain: G, fieldDefense: true, road: true },
    { terrain: G, resource: "FERTILE_GROUND", improvement: "FARM" },
    { terrain: G, resource: "FERTILE_GROUND", improvement: "FARM" },
    { terrain: F, resource: "GAME", unit: "MARKSMAN" },
    { terrain: G, treasure: true },
  ],
  [
    { terrain: M, resource: "ORE" },
    { terrain: M, resource: "ORE", improvement: "MINE" },
    { terrain: F },
    { terrain: F, improvement: "LUMBER_CAMP" },
    { terrain: G, resource: "FERTILE_GROUND" },
    { terrain: S },
    { terrain: S, resource: "FISH", improvement: "PORT" },
    { terrain: D },
    { terrain: S, resource: "PEARLS" },
  ],
  [
    { terrain: G, improvement: "MONUMENT" },
    { terrain: G, fortificationLevel: 2 },
    { terrain: G, road: true },
    { terrain: G, road: true },
    { terrain: G },
    { terrain: G, resource: "FRUIT" },
    { terrain: M },
    { terrain: M, resource: "ORE", improvement: "MINE" },
    { terrain: G },
  ],
];

const CAPITAL = { x: 4, y: 3 } as const;

function same(left: CoordV7, right: CoordV7): boolean {
  return left.x === right.x && left.y === right.y;
}

/** The live view with the showcase patch written around the capital. */
export function chibiReviewSceneViewV7(live: PlayerViewV7): PlayerViewV7 {
  const viewerId = live.viewer.id;
  const capital =
    live.cities.find((city) => city.ownerId === viewerId && city.isCapital) ??
    live.cities[0];
  if (capital === undefined) throw new Error("the live view has no city");
  const rival = live.players.find((player) => player.id !== viewerId);
  if (rival === undefined) throw new Error("the live view has one player");
  const rows = LAYOUT.length;
  const columns = LAYOUT[0]?.length ?? 0;
  const origin = {
    x: Math.max(0, Math.min(live.board.width - columns, capital.at.x - 4)),
    y: Math.max(0, Math.min(live.board.height - rows, capital.at.y - 3)),
  };
  const capitalAt = { x: origin.x + CAPITAL.x, y: origin.y + CAPITAL.y };
  // Any id other than the capital's: Farms pair only within one city.
  const rivalCityId = (capital.id + 1000) as typeof capital.id;
  const cellAt = (at: CoordV7): Cell | undefined =>
    LAYOUT[at.y - origin.y]?.[at.x - origin.x];
  const tiles: Tile[] = live.board.tiles.map((tile) => {
    const cell = cellAt(tile.at);
    const inPatch = cell !== undefined;
    const viewerSide = tile.at.x - origin.x <= CAPITAL.x;
    return {
      at: tile.at,
      explored: true,
      biome: null,
      terrain: cell?.terrain ?? "GRASS",
      resource: cell?.resource ?? null,
      improvement: cell?.improvement ?? null,
      road: cell?.road ?? false,
      fieldDefense: cell?.fieldDefense ?? false,
      fortificationLevel: cell?.fortificationLevel ?? null,
      site: same(tile.at, capitalAt) ? "CAPITAL" : null,
      territoryCityId: inPatch ? (viewerSide ? capital.id : rivalCityId) : null,
      territoryOwnerId: inPatch ? (viewerSide ? viewerId : rival.id) : null,
    };
  });
  const template = live.units.find((unit) => unit.ownerId === viewerId);
  const units =
    template === undefined
      ? []
      : LAYOUT.flatMap((row, y) =>
          row.flatMap((cell, x) =>
            cell.unit === undefined
              ? []
              : [
                  {
                    ...template,
                    id: (9000 + y * columns + x) as typeof template.id,
                    ownerId: x <= CAPITAL.x ? viewerId : rival.id,
                    role: cell.unit,
                    at: { x: origin.x + x, y: origin.y + y },
                  },
                ],
          ),
        );
  return {
    ...live,
    board: { ...live.board, tiles, territoryBorders: [] },
    cities: [{ ...capital, at: capitalAt }],
    units,
    treasureChests: LAYOUT.flatMap((row, y) =>
      row.flatMap((cell, x) =>
        cell.treasure === true ? [{ x: origin.x + x, y: origin.y + y }] : [],
      ),
    ),
    graves: [],
  };
}

/** Mounts a full-screen CHIBI board host over the page showing the scene. */
export function showChibiReviewSceneV7(live: PlayerViewV7): {
  readonly host: CanvasBoardHostV7;
  readonly canvas: HTMLCanvasElement;
} {
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
    matchInstanceId: "chibi-review-scene",
    view: chibiReviewSceneViewV7(live),
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
