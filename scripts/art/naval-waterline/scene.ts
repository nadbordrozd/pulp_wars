/**
 * The review scene of the ships in the water (bead pulp_wars-oiu5): one
 * faction's fleet (Patrol Boat, Battleship and embarked transport) on
 * Shallow Water beside a coastal city of that faction and again on Deep
 * Water, drawn by the real CanvasBoardHostV7 in the live look the game
 * passes it (`LIVE_DIRECTION_V7` and its art registry). Loaded in the
 * browser through the Vite dev server by
 * scripts/art/naval-waterline-review.ts; nothing here is part of the game
 * build.
 *
 * `waterline` draws the scene with the live look's waterline (GHOST), the
 * hull cut (CUT) or the ships whole as before the waterline (OFF). Every
 * ship is spent (no ready ring), at full HP, owned by a seat of the faction
 * that is not the viewer's.
 */
import type {
  CityId,
  CoordV7,
  FactionIdV7,
  PlayerId,
  PlayerViewV7,
  TerrainIdV7,
} from "../../../src/engine/index";
import { CanvasBoardHostV7 } from "../../../src/render/canvas/board-host-v7";
import { LIVE_DIRECTION_ART_REGISTRY_V7 } from "../../../src/render/canvas/live-board-look-v7";
import type { NavalWaterlineStyleV7 } from "../../../src/render/canvas/naval-waterline-v7";
import {
  LIVE_DIRECTION_V7,
  type BoardVisualDirectionV7,
} from "../../../src/render/canvas/visual-direction-v7";

type Tile = PlayerViewV7["board"]["tiles"][number];

/**
 * One cell: terrain (`g` Grass, `s` Shallow, `d` Deep), then `c` for the
 * city, or a ship letter (`P` Patrol Boat, `B` Battleship, `T` the
 * embarked transport).
 */
const LAYOUT: readonly string[] = [
  "gc s  s  s  s  s  s",
  "g  sP s  sB s  sT s",
  "s  s  s  s  s  s  d",
  "d  dP d  dB d  dT d",
  "d  d  d  d  d  d  d",
];
/** The layout cell put on the live capital (the camera's centre). */
const CENTRE: CoordV7 = { x: 3, y: 2 };

const TERRAIN: Readonly<Record<string, TerrainIdV7>> = {
  g: "GRASS",
  s: "SHALLOW_WATER",
  d: "DEEP_WATER",
};

/** The board cells of the ships, for cropping: [shallow row, deep row]. */
export function waterlineSceneShipCellsV7(
  live: PlayerViewV7,
): readonly CoordV7[] {
  const origin = sceneOrigin(live);
  const cells: CoordV7[] = [];
  rows().forEach((row, y) =>
    row.forEach((cell, x) => {
      if (/[PBT]/.test(cell)) cells.push({ x: origin.x + x, y: origin.y + y });
    }),
  );
  return cells;
}

function rows(): string[][] {
  return LAYOUT.map((line) => line.trim().split(/\s+/));
}

function capitalOf(live: PlayerViewV7): PlayerViewV7["cities"][number] {
  const capital =
    live.cities.find(
      (city) => city.ownerId === live.viewer.id && city.isCapital,
    ) ?? live.cities[0];
  if (capital === undefined) throw new Error("the live view has no city");
  return capital;
}

function sceneOrigin(live: PlayerViewV7): CoordV7 {
  const layout = rows();
  const columns = layout[0]?.length ?? 0;
  const capital = capitalOf(live);
  return {
    x: Math.max(
      0,
      Math.min(live.board.width - columns, capital.at.x - CENTRE.x),
    ),
    y: Math.max(
      0,
      Math.min(live.board.height - layout.length, capital.at.y - CENTRE.y),
    ),
  };
}

export function waterlineSceneViewV7(
  live: PlayerViewV7,
  faction: FactionIdV7,
): PlayerViewV7 {
  const layout = rows();
  const origin = sceneOrigin(live);
  const capital = capitalOf(live);
  const viewer = live.players.find((player) => player.id === live.viewer.id);
  const template = live.units.find((unit) => unit.ownerId === live.viewer.id);
  if (viewer === undefined || template === undefined)
    throw new Error("the live view has no viewer or unit");
  const ownerId = (Math.max(...live.players.map((p) => p.id)) + 1) as PlayerId;
  const owner = {
    ...viewer,
    id: ownerId,
    seat: 1,
    color: "GOLD" as const,
    faction,
    controller: "AI" as const,
  };
  const cityAt = { x: origin.x, y: origin.y };
  const cityId = (Number(capital.id) + 700) as CityId;
  const cellAt = (at: CoordV7): string | undefined =>
    layout[at.y - origin.y]?.[at.x - origin.x];
  const tiles: Tile[] = live.board.tiles.map((tile) => {
    const cell = cellAt(tile.at);
    const own =
      cell !== undefined &&
      Math.abs(tile.at.x - cityAt.x) <= 2 &&
      Math.abs(tile.at.y - cityAt.y) <= 2;
    return {
      at: tile.at,
      explored: true,
      biome: null,
      terrain: TERRAIN[cell?.[0] ?? "d"] ?? "DEEP_WATER",
      resource: null,
      improvement: null,
      road: false,
      fieldDefense: false,
      fortificationLevel: null,
      site: cell?.includes("c") === true ? "CITY" : null,
      territoryCityId: own ? cityId : null,
      territoryOwnerId: own ? ownerId : null,
    };
  });
  const units: PlayerViewV7["units"][number][] = [];
  layout.forEach((row, y) =>
    row.forEach((cell, x) => {
      const letter = cell[1];
      if (letter === undefined || !"PBT".includes(letter)) return;
      units.push({
        ...template,
        id: (9100 + y * 10 + x) as typeof template.id,
        ownerId: ownerId,
        at: { x: origin.x + x, y: origin.y + y },
        role:
          letter === "P"
            ? "PATROL_BOAT"
            : letter === "B"
              ? "BATTLESHIP"
              : "FIGHTER",
        form: letter === "T" ? "EMBARKED" : "NAVAL",
        hp: template.maxHp,
        activation: { ...template.activation, handled: true },
      });
    }),
  );
  const ownerOf = (tile: Tile): PlayerId | null =>
    tile.explored ? tile.territoryOwnerId : null;
  const borders: PlayerViewV7["board"]["territoryBorders"][number][] = [];
  for (const tile of tiles) {
    if (ownerOf(tile) === null) continue;
    for (const [edge, dx, dy] of [
      ["NORTH", 0, -1],
      ["EAST", 1, 0],
      ["SOUTH", 0, 1],
      ["WEST", -1, 0],
    ] as const) {
      const next = tiles.find(
        (other) =>
          other.at.x === tile.at.x + dx && other.at.y === tile.at.y + dy,
      );
      if (next !== undefined && ownerOf(next) === ownerOf(tile)) continue;
      borders.push({
        at: tile.at,
        edge,
        ownerId: ownerId,
        sharedOwnerIds: null,
        cityIds: [],
      });
    }
  }
  return {
    ...live,
    players: [viewer, owner],
    board: { ...live.board, tiles, territoryBorders: borders },
    cities: [
      {
        ...capital,
        id: cityId,
        ownerId: ownerId,
        at: cityAt,
        level: 2,
        population: 2,
        isCapital: false,
      },
    ],
    units,
    treasureChests: [],
    graves: [],
    improvementValues: [],
    unitStats: [],
    plagued: [],
    bitten: [],
  };
}

/** The live look with the ships drawn whole (as before bead pulp_wars-oiu5). */
const WITHOUT_WATERLINE: BoardVisualDirectionV7 = Object.fromEntries(
  Object.entries(LIVE_DIRECTION_V7).filter(([key]) => key !== "navalWaterline"),
) as unknown as BoardVisualDirectionV7;

/** Mounts a full-screen board host over the page showing the scene. */
export function showWaterlineSceneV7(
  live: PlayerViewV7,
  options: {
    readonly faction: FactionIdV7;
    readonly waterline: NavalWaterlineStyleV7 | "OFF";
  },
): { readonly host: CanvasBoardHostV7; readonly canvas: HTMLCanvasElement } {
  document
    .querySelectorAll("[data-waterline-review-scene]")
    .forEach((node) => node.remove());
  const container = document.createElement("div");
  container.dataset.waterlineReviewScene = "true";
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
    matchInstanceId: `naval-waterline-${options.faction}-${options.waterline}`,
    view: waterlineSceneViewV7(live, options.faction),
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
    visualDirection:
      options.waterline === "OFF"
        ? WITHOUT_WATERLINE
        : { ...LIVE_DIRECTION_V7, navalWaterline: options.waterline },
    visualDirectionArt: LIVE_DIRECTION_ART_REGISTRY_V7,
  });
  const canvas = container.querySelector("canvas.board-canvas-v7");
  if (!(canvas instanceof HTMLCanvasElement))
    throw new Error("the review scene has no board canvas");
  return { host, canvas };
}
