/**
 * Board study scenes of the faction building looks (bead pulp_wars-xdh.1,
 * docs/art/FACTION_BUILDINGS.md). Loaded in the browser through the Vite
 * dev server by scripts/art/faction-buildings-review.ts and drawn by the real
 * CanvasBoardHostV7 with the CHIBI art set and the live look the game draws
 * (`liveBoardLookV7`). Nothing here is part of the game build, and nothing
 * in the game changes: the proposal is not wired in.
 *
 * Each scene is an 8 x 6 patch of the Showcase board: the left half is a
 * city territory of the studied faction (seat 0, the viewer), the right half
 * a Human city territory (seat 1) with the same buildings in the same
 * places, so every proposed building stands beside today's shared one and
 * the grass changes at the territory border. Outside the patch is fog.
 *
 * **The "after" frame.** The renderer resolves art by subject and cell
 * (`chibiVariantV7`: variant `(31x + 17y) mod n`). On the 16 x 16 Showcase
 * board `31x + 17y` is different for every cell and below 721, so a
 * registry that lists 721 variants of a subject picks one entry per cell.
 * The scene fills that list with the live variant the cell would get
 * (`live[i mod live.length]`) and puts the proposed raster on the cells of
 * the studied faction's territory. That draws exactly what a per-territory
 * lookup would, with no change to the game's code:
 *
 * - **Buildings** go through the direction registry the board host is given
 *   (`visualDirectionArt`), which buildings are resolved from first.
 * - **Grass** (and the Forest master, which carries the grass under its
 *   trees) is resolved from the default CHIBI registry that the host builds
 *   from `CHIBI_ART_ASSETS_V7` in its constructor, so the scene swaps that
 *   module array's Grass and Forest entries while it constructs its host and
 *   restores them at once. The terrain is then toned by the live look like
 *   any Grass tile (contrast 65% around the Grass pivot).
 */
import type {
  CityId,
  CoordV7,
  FactionIdV7,
  ImprovementIdV7,
  PlayerId,
  PlayerViewV7,
  TerrainIdV7,
  UnitRoleIdV7,
} from "../../../src/engine/index";
import {
  type ArtSubjectV7,
  type ChibiArtAssetV7,
  type ChibiArtRegistryV7,
} from "../../../src/assets/chibi-art-v7";
import { CHIBI_ART_ASSETS_V7 } from "../../../src/assets/chibi-art-manifest";
import { CanvasBoardHostV7 } from "../../../src/render/canvas/board-host-v7";
import {
  LIVE_DIRECTION_ART_REGISTRY_V7,
  liveBoardLookV7,
} from "../../../src/render/canvas/live-board-look-v7";

type Tile = PlayerViewV7["board"]["tiles"][number];

/** One proposed building raster, by its improvement. */
export interface SceneBuildingV7 {
  readonly improvement: ImprovementIdV7;
  readonly url: string;
  readonly width: number;
  readonly height: number;
}

/** A grass variant: three tiles and the two Forest composites. */
export interface SceneGrassV7 {
  readonly tiles: readonly string[];
  readonly forests: readonly string[];
}

export interface FactionBuildingsSceneOptionsV7 {
  readonly faction: FactionIdV7;
  /** false: today's art everywhere; true: the proposal in seat 0's territory. */
  readonly after: boolean;
  readonly buildings: readonly SceneBuildingV7[];
  readonly grass: SceneGrassV7 | null;
}

const TERRAIN: Readonly<Record<string, TerrainIdV7>> = {
  g: "GRASS",
  f: "FOREST",
  m: "MOUNTAIN",
};

const IMPROVEMENT: Readonly<Record<string, ImprovementIdV7>> = {
  F: "FARM",
  W: "WINDMILL",
  L: "LUMBER_CAMP",
  S: "SAWMILL",
  M: "MINE",
  G: "FORGE",
  K: "WORKSHOP",
  R: "MARKET",
};

/**
 * One half: `<terrain>[/<improvement letter>][/c] (city) [/u] (a Fighter)
 * [/r] (a Road)`. The two halves are the same layout, so each building
 * stands beside its counterpart four cells to the right.
 */
const HALF: readonly (readonly string[])[] = [
  ["f/L", "g/S", "g", "f"],
  ["g", "g/u", "g/c/r", "g/r"],
  ["g/F", "g/F", "g/W", "g"],
  ["g/F", "g/F", "g", "m/M"],
  ["g/G", "g/u", "g/R", "g"],
  ["g", "f", "g/K", "g"],
];
const COLUMNS = 8;
const ROWS = HALF.length;
const CITY_LOCAL: CoordV7 = { x: 2, y: 1 };

interface ParsedCell {
  readonly terrain: TerrainIdV7;
  readonly seat: number;
  readonly improvement: ImprovementIdV7 | null;
  readonly city: boolean;
  readonly unit: boolean;
  readonly road: boolean;
}

function cellAtLocal(x: number, y: number): ParsedCell | undefined {
  const row = HALF[y];
  if (row === undefined || x < 0 || x >= COLUMNS) return undefined;
  const seat = x < COLUMNS / 2 ? 0 : 1;
  const text = row[x % (COLUMNS / 2)];
  if (text === undefined) return undefined;
  const [head = "g", ...items] = text.split("/");
  let improvement: ImprovementIdV7 | null = null;
  for (const item of items) improvement = IMPROVEMENT[item] ?? improvement;
  return {
    terrain: TERRAIN[head] ?? "GRASS",
    seat,
    improvement,
    city: items.includes("c"),
    unit: items.includes("u"),
    // The Road runs from city to city across the border.
    road: items.includes("r") || (y === CITY_LOCAL.y && x >= 3 && x <= 5),
  };
}

/** The cell index `chibiVariantV7` derives on a board under 16 x 16. */
const VARIANT_SLOTS = 31 * 15 + 17 * 15 + 1;
const slotOf = (at: CoordV7): number => at.x * 31 + at.y * 17;

/**
 * `live` spread over one slot per cell, with `proposed(at)` on the cells it
 * returns a raster for.
 */
function perCellVariants(
  live: readonly ChibiArtAssetV7[],
  cells: readonly CoordV7[],
  proposed: (slot: number) => ChibiArtAssetV7 | null,
): readonly ChibiArtAssetV7[] {
  if (live.length === 0) return live;
  const taken = new Set(cells.map(slotOf));
  return Array.from({ length: VARIANT_SLOTS }, (_, slot) => {
    const today = live[slot % live.length] as ChibiArtAssetV7;
    const next = taken.has(slot) ? proposed(slot) : null;
    return next ?? today;
  });
}

export function factionBuildingsSceneViewV7(
  live: PlayerViewV7,
  faction: FactionIdV7,
): {
  readonly view: PlayerViewV7;
  /** The board cells of seat 0's territory, where the proposal applies. */
  readonly factionCells: readonly CoordV7[];
} {
  if (live.board.width > 16 || live.board.height > 16)
    throw new Error(
      "the per-cell variant trick needs a board of 16 x 16 or less",
    );
  if (live.board.width < COLUMNS || live.board.height < ROWS)
    throw new Error(`the scene needs a ${COLUMNS} x ${ROWS} board`);
  const viewerId = live.viewer.id;
  const liveCapital =
    live.cities.find((city) => city.ownerId === viewerId && city.isCapital) ??
    live.cities[0];
  const template = live.units.find((unit) => unit.ownerId === viewerId);
  const viewer = live.players.find((player) => player.id === viewerId);
  if (
    liveCapital === undefined ||
    template === undefined ||
    viewer === undefined
  )
    throw new Error("the live view has no capital, unit or viewer");
  const origin = {
    x: Math.max(
      0,
      Math.min(live.board.width - COLUMNS, liveCapital.at.x - CITY_LOCAL.x),
    ),
    y: Math.max(
      0,
      Math.min(live.board.height - ROWS, liveCapital.at.y - CITY_LOCAL.y),
    ),
  };
  const firstFreeId = Math.max(...live.players.map((player) => player.id)) + 1;
  const players = [faction, "ORIGINAL" as FactionIdV7].map(
    (seatFaction, seat) => ({
      ...viewer,
      id: (seat === 0 ? viewerId : firstFreeId) as PlayerId,
      seat,
      color:
        seat === 0 ? viewer.color : viewer.color === "TEAL" ? "CORAL" : "TEAL",
      faction: seatFaction,
      controller: seat === 0 ? viewer.controller : ("AI" as const),
    }),
  );
  const playerId = (seat: number): PlayerId => players[seat]?.id ?? viewerId;
  const cityId = (seat: number): CityId =>
    (Number(liveCapital.id) + 700 + seat) as CityId;
  const factionCells: CoordV7[] = [];
  const tiles: Tile[] = live.board.tiles.map((tile) => {
    const local = { x: tile.at.x - origin.x, y: tile.at.y - origin.y };
    const cell = cellAtLocal(local.x, local.y);
    if (cell === undefined) return { at: tile.at, explored: false };
    if (cell.seat === 0) factionCells.push(tile.at);
    return {
      at: tile.at,
      explored: true,
      biome: null,
      terrain: cell.terrain,
      resource: null,
      improvement: cell.improvement,
      road: cell.road,
      fieldDefense: false,
      fortificationLevel: null,
      site: cell.city ? "CITY" : null,
      territoryCityId: cityId(cell.seat),
      territoryOwnerId: playerId(cell.seat),
    } as Tile;
  });
  const cities: PlayerViewV7["cities"][number][] = [];
  const units: PlayerViewV7["units"][number][] = [];
  for (let y = 0; y < ROWS; y += 1)
    for (let x = 0; x < COLUMNS; x += 1) {
      const cell = cellAtLocal(x, y);
      if (cell === undefined) continue;
      const at = { x: origin.x + x, y: origin.y + y };
      if (cell.city)
        cities.push({
          ...liveCapital,
          id: cityId(cell.seat),
          ownerId: playerId(cell.seat),
          at,
          level: 2,
          population: 2,
          isCapital: cell.seat === 0,
        });
      if (cell.unit)
        units.push({
          ...template,
          id: (9500 + y * COLUMNS + x) as typeof template.id,
          ownerId: playerId(cell.seat),
          role: "FIGHTER" as UnitRoleIdV7,
          form: "LAND",
          at,
          hp: template.maxHp,
          activation: { ...template.activation, handled: true },
        });
    }
  const territoryBorders: PlayerViewV7["board"]["territoryBorders"][number][] =
    [];
  const ownerAt = new Map(
    tiles.map((tile) => [
      `${tile.at.x},${tile.at.y}`,
      tile.explored ? tile.territoryOwnerId : null,
    ]),
  );
  const directions = [
    { edge: "NORTH", dx: 0, dy: -1 },
    { edge: "EAST", dx: 1, dy: 0 },
    { edge: "SOUTH", dx: 0, dy: 1 },
    { edge: "WEST", dx: -1, dy: 0 },
  ] as const;
  for (const tile of tiles) {
    if (!tile.explored) continue;
    for (const { edge, dx, dy } of directions) {
      const owner = tile.territoryOwnerId;
      const other = ownerAt.get(`${tile.at.x + dx},${tile.at.y + dy}`) ?? null;
      if (other === owner) continue;
      // A shared edge is listed once, from its west or north cell.
      if (other !== null && (edge === "WEST" || edge === "NORTH")) continue;
      territoryBorders.push({
        at: tile.at,
        edge,
        ownerId: owner ?? other,
        sharedOwnerIds:
          other !== null && owner !== null ? [owner, other] : null,
        cityIds: [],
      });
    }
  }
  return {
    factionCells,
    view: {
      ...live,
      viewer: { ...live.viewer, faction },
      players,
      board: { ...live.board, tiles, territoryBorders },
      cities,
      units,
      naval: {
        ownedPorts: [],
        tradeCityIds: [],
        landTradeCityIds: [],
        seaTradeCityIds: [],
        networkCityIds: [],
        networkRoads: [],
        seaRoutes: [],
        recoverableNavalUnitIds: [],
      },
      treasureChests: [],
      graves: [],
      improvementValues: [],
      unitStats: [],
      plagued: [],
      bitten: [],
    },
  };
}

function sceneAsset(
  id: string,
  subject: ArtSubjectV7,
  assetClass: ChibiArtAssetV7["assetClass"],
  url: string,
  width: number,
  height: number,
): ChibiArtAssetV7 {
  return { id, subject, assetClass, width, height, url };
}

/** The live direction registry with the proposed buildings on `cells`. */
function buildingRegistry(
  buildings: readonly SceneBuildingV7[],
  cells: readonly CoordV7[],
): ChibiArtRegistryV7 {
  const bySubject = new Map<ArtSubjectV7, readonly ChibiArtAssetV7[]>();
  for (const building of buildings) {
    const subject: ArtSubjectV7 = `IMPROVEMENT:${building.improvement}`;
    const proposed = sceneAsset(
      `chibi-study-${building.improvement.toLowerCase()}`,
      subject,
      "BUILDING",
      building.url,
      building.width,
      building.height,
    );
    bySubject.set(
      subject,
      perCellVariants(
        LIVE_DIRECTION_ART_REGISTRY_V7.variants(subject),
        cells,
        () => proposed,
      ),
    );
  }
  return {
    variants: (subject) =>
      bySubject.get(subject) ??
      LIVE_DIRECTION_ART_REGISTRY_V7.variants(subject),
  };
}

/** CHIBI_ART_ASSETS_V7 with the Grass and Forest of `cells` replaced. */
function grassAssets(
  grass: SceneGrassV7,
  cells: readonly CoordV7[],
): ChibiArtAssetV7[] {
  const swap = (
    subject: ArtSubjectV7,
    rasters: (slot: number) => ChibiArtAssetV7,
  ) => {
    const live = CHIBI_ART_ASSETS_V7.filter(
      (asset) => asset.subject === subject,
    );
    return perCellVariants(live, cells, rasters).map((asset, slot) => ({
      ...asset,
      // Registry entries need unique ids.
      id: `${asset.id}--slot-${slot}`,
    }));
  };
  const firstForest = CHIBI_ART_ASSETS_V7.find(
    (asset) => asset.subject === "TERRAIN:FOREST",
  );
  if (firstForest === undefined) throw new Error("no Forest asset");
  const replaced = [
    ...swap("TERRAIN:GRASS", (slot) =>
      sceneAsset(
        `chibi-study-grass-${slot % grass.tiles.length}`,
        "TERRAIN:GRASS",
        "TERRAIN",
        grass.tiles[slot % grass.tiles.length] ?? "",
        80,
        80,
      ),
    ),
    ...swap("TERRAIN:FOREST", (slot) => {
      const forests = CHIBI_ART_ASSETS_V7.filter(
        (asset) => asset.subject === "TERRAIN:FOREST",
      );
      const today = forests[slot % forests.length] ?? firstForest;
      const url = grass.forests[slot % grass.forests.length] ?? today.url;
      return {
        ...today,
        url,
        ...(today.layers === undefined
          ? {}
          : {
              layers: {
                bodyUrl: today.layers.bodyUrl,
                groundUrl: grass.tiles[0] ?? today.layers.groundUrl,
              },
            }),
      };
    }),
  ];
  return [
    ...CHIBI_ART_ASSETS_V7.filter(
      (asset) =>
        asset.subject !== "TERRAIN:GRASS" && asset.subject !== "TERRAIN:FOREST",
    ),
    ...replaced,
  ];
}

/**
 * A board host whose default CHIBI registry holds `assets`: the host builds
 * that registry from CHIBI_ART_ASSETS_V7 in its constructor, so the array is
 * swapped for the constructor only.
 */
function hostWithDefaultArt(
  assets: ChibiArtAssetV7[] | null,
): CanvasBoardHostV7 {
  if (assets === null) return new CanvasBoardHostV7(document);
  const shared = CHIBI_ART_ASSETS_V7 as ChibiArtAssetV7[];
  if (Object.isFrozen(shared))
    throw new Error(
      "CHIBI_ART_ASSETS_V7 is frozen; the grass swap needs another way in",
    );
  const saved = shared.slice();
  shared.splice(0, shared.length, ...assets);
  try {
    return new CanvasBoardHostV7(document);
  } finally {
    shared.splice(0, shared.length, ...saved);
  }
}

/** Mounts a full-screen CHIBI board host over the page showing the scene. */
export function showFactionBuildingsSceneV7(
  live: PlayerViewV7,
  options: FactionBuildingsSceneOptionsV7,
): { readonly host: CanvasBoardHostV7; readonly canvas: HTMLCanvasElement } {
  document
    .querySelectorAll("[data-chibi-review-scene]")
    .forEach((node) => node.remove());
  const container = document.createElement("div");
  container.dataset.chibiReviewScene = "true";
  Object.assign(container.style, {
    position: "fixed",
    inset: "0",
    zIndex: "2147483647",
    background: "#173632",
  });
  document.body.append(container);
  const scene = factionBuildingsSceneViewV7(live, options.faction);
  const host = hostWithDefaultArt(
    options.after && options.grass !== null
      ? grassAssets(options.grass, scene.factionCells)
      : null,
  );
  host.mount(container, {
    onSelection: () => undefined,
    onCommand: () => undefined,
  });
  const look = liveBoardLookV7("CHIBI");
  host.update({
    matchInstanceId: `faction-buildings-${options.faction}-${options.after ? "after" : "before"}`,
    view: scene.view,
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
    ...look,
    ...(options.after && options.buildings.length > 0
      ? {
          visualDirectionArt: buildingRegistry(
            options.buildings,
            scene.factionCells,
          ),
        }
      : {}),
  });
  const canvas = container.querySelector("canvas.board-canvas-v7");
  if (!(canvas instanceof HTMLCanvasElement))
    throw new Error("the review scene has no board canvas");
  return { host, canvas };
}
