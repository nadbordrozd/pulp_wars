/**
 * Board review scenes of the faction building looks (epic pulp_wars-xdh,
 * docs/art/FACTION_BUILDINGS.md). Loaded in the browser through the Vite
 * dev server by scripts/art/faction-buildings-review.ts and drawn by the real
 * CanvasBoardHostV7 with the CHIBI art set and the live look the game draws
 * (`liveBoardLookV7`). Nothing here is part of the game build.
 *
 * Each scene is an 8 x 6 patch of the Showcase board: the left half is a
 * city territory of the studied faction (seat 0, the viewer), the right half
 * a Human city territory (seat 1) with the same buildings in the same
 * places, so every faction building stands beside the shared one and the
 * grass changes at the territory border. Outside the patch is fog.
 *
 * Since bead pulp_wars-xdh.2 the game draws the faction looks itself (the
 * plan asks for `IMPROVEMENT:<FACTION>:<ID>` and the Undead ground by the
 * owner of each cell's territory), so:
 *
 * - **"after"** is the scene in the live look, exactly what the game draws.
 * - **"before"** hides the faction subjects from the direction registry the
 *   host is given, so every cell falls back to the shared building and
 *   ground: the board as it was before the faction looks.
 * - **`captured`** gives the Human half to the studied faction (its city
 *   and its territory change owner): the frame after the city was taken.
 * - **`grass`** replaces the Undead ground with another candidate of the
 *   study (the rejected "cool", "dusk" and "wilt").
 */
import {
  ACHIEVEMENT_IDS_V7,
  type AchievementIdV7,
  type CityId,
  type CoordV7,
  type FactionIdV7,
  type ImprovementIdV7,
  type PlayerId,
  type PlayerViewV7,
  type TerrainIdV7,
  type UnitRoleIdV7,
} from "../../../src/engine/index";
import {
  type ArtSubjectV7,
  type ChibiArtAssetV7,
  type ChibiArtRegistryV7,
} from "../../../src/assets/chibi-art-v7";
import { CanvasBoardHostV7 } from "../../../src/render/canvas/board-host-v7";
import {
  LIVE_DIRECTION_ART_REGISTRY_V7,
  liveBoardLookV7,
} from "../../../src/render/canvas/live-board-look-v7";

type Tile = PlayerViewV7["board"]["tiles"][number];

/** A grass variant: three tiles and the two Forest composites. */
export interface SceneGrassV7 {
  readonly tiles: readonly string[];
  readonly forests: readonly string[];
}

export interface FactionBuildingsSceneOptionsV7 {
  readonly faction: FactionIdV7;
  /** false: the shared art everywhere; true: what the game draws. */
  readonly after: boolean;
  /** Another Undead ground candidate instead of the production one. */
  readonly grass: SceneGrassV7 | null;
  /** The Human half belongs to the studied faction (its city was taken). */
  readonly captured?: boolean;
  /**
   * The Monument scene (bead pulp_wars-2yc.15) instead of the buildings:
   * one Monument per achievement, Fertile Ground bare and under a Farm.
   */
  readonly monuments?: boolean;
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
  N: "MONUMENT",
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
/**
 * The Monument scene (bead pulp_wars-2yc.15): seven Monuments, one per
 * achievement in the order of ACHIEVEMENT_IDS_V7 (`N`), and Fertile Ground
 * (`x`) bare, under a Farm and beside plain Grass. The left half is the
 * viewer's, so each Monument is its achievement's; the right half is
 * another player's, whose achievements the view does not name: seven
 * shared Monuments.
 */
const MONUMENT_HALF: readonly (readonly string[])[] = [
  ["g/N", "g/N", "g/N", "g/N"],
  ["g", "g/u", "g/c/r", "g/r"],
  ["g/N", "g/N", "g/N", "g"],
  ["g/x", "g/x/F", "g/x", "g"],
  ["g", "g/x", "g", "f"],
  ["g", "g", "g/x", "g"],
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
  /** Fertile Ground on the cell. */
  readonly fertile: boolean;
  /** The achievement of the Monument on the cell, by its place in the half. */
  readonly achievement: AchievementIdV7 | null;
}

function cellAtLocal(
  x: number,
  y: number,
  monuments = false,
): ParsedCell | undefined {
  const half = monuments ? MONUMENT_HALF : HALF;
  const row = half[y];
  if (row === undefined || x < 0 || x >= COLUMNS) return undefined;
  const seat = x < COLUMNS / 2 ? 0 : 1;
  const text = row[x % (COLUMNS / 2)];
  if (text === undefined) return undefined;
  const [head = "g", ...items] = text.split("/");
  let improvement: ImprovementIdV7 | null = null;
  for (const item of items) improvement = IMPROVEMENT[item] ?? improvement;
  const monumentIndex = half
    .flatMap((cells, rowIndex) =>
      cells.map((cell, column) => ({ cell, rowIndex, column })),
    )
    .filter(({ cell }) => cell.split("/").includes("N"))
    .findIndex(
      (entry) => entry.rowIndex === y && entry.column === x % (COLUMNS / 2),
    );
  return {
    fertile: items.includes("x"),
    achievement:
      improvement === "MONUMENT"
        ? (ACHIEVEMENT_IDS_V7[monumentIndex] ?? null)
        : null,
    terrain: TERRAIN[head] ?? "GRASS",
    seat,
    improvement,
    city: items.includes("c"),
    unit: items.includes("u"),
    // The Road runs from city to city across the border.
    road: items.includes("r") || (y === CITY_LOCAL.y && x >= 3 && x <= 5),
  };
}

export function factionBuildingsSceneViewV7(
  live: PlayerViewV7,
  faction: FactionIdV7,
  /** The Human city and its territory belong to the studied faction. */
  captured = false,
  /** The Monument scene instead of the buildings. */
  monuments = false,
): {
  readonly view: PlayerViewV7;
  /** The board cells of the studied faction's own (left) territory. */
  readonly factionCells: readonly CoordV7[];
} {
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
  // A captured city: both halves are the studied faction's.
  const playerId = (seat: number): PlayerId =>
    players[captured ? 0 : seat]?.id ?? viewerId;
  const cityId = (seat: number): CityId =>
    (Number(liveCapital.id) + 700 + seat) as CityId;
  const factionCells: CoordV7[] = [];
  const tiles: Tile[] = live.board.tiles.map((tile) => {
    const local = { x: tile.at.x - origin.x, y: tile.at.y - origin.y };
    const cell = cellAtLocal(local.x, local.y, monuments);
    if (cell === undefined) return { at: tile.at, explored: false };
    if (cell.seat === 0) factionCells.push(tile.at);
    return {
      at: tile.at,
      explored: true,
      biome: null,
      terrain: cell.terrain,
      resource: cell.fertile ? "FERTILE_GROUND" : null,
      improvement: cell.improvement,
      road: cell.road,
      fieldDefense: false,
      fortificationLevel: null,
      site: cell.city ? "CITY" : null,
      territoryCityId: cityId(cell.seat),
      territoryOwnerId: playerId(cell.seat),
      // The Ice Folk's own territory lies under Snow (the Ice Folk revision).
      ...(faction === "ICE_FOLK" && cell.seat === 0
        ? { snow: true, biome: "PLAINS" }
        : {}),
    } as Tile;
  });
  // A Monument's achievement is in the view for its owner only.
  const populationContributions: PlayerViewV7["populationContributions"][number][] =
    [];
  const cities: PlayerViewV7["cities"][number][] = [];
  const units: PlayerViewV7["units"][number][] = [];
  for (let y = 0; y < ROWS; y += 1)
    for (let x = 0; x < COLUMNS; x += 1) {
      const cell = cellAtLocal(x, y, monuments);
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
      if (cell.achievement !== null)
        populationContributions.push({
          id: 9700 + y * COLUMNS + x,
          cityId: cityId(cell.seat),
          category: "LIVE",
          amount: 2,
          source:
            playerId(cell.seat) === viewerId
              ? {
                  kind: "MONUMENT",
                  visibility: "FULL",
                  achievement: cell.achievement,
                  at,
                }
              : { kind: "MONUMENT", visibility: "BUILDING_ONLY", at },
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
      populationContributions,
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

const factionSubject = (subject: ArtSubjectV7): boolean =>
  subject.split(":").length === 3 &&
  (subject.startsWith("IMPROVEMENT:") || subject.startsWith("TERRAIN:"));

/** The live direction registry without the faction buildings and ground. */
function registryWithoutFactionLooks(): ChibiArtRegistryV7 {
  return {
    variants: (subject) =>
      factionSubject(subject)
        ? []
        : LIVE_DIRECTION_ART_REGISTRY_V7.variants(subject),
  };
}

/** The live direction registry with another Undead ground candidate. */
function registryWithGrass(grass: SceneGrassV7): ChibiArtRegistryV7 {
  const swap = (subject: ArtSubjectV7, urls: readonly string[]) =>
    LIVE_DIRECTION_ART_REGISTRY_V7.variants(subject).map(
      (asset, index): ChibiArtAssetV7 => ({
        ...asset,
        id: `${asset.id}--study`,
        url: urls[index % urls.length] ?? asset.url,
        ...(asset.layers === undefined
          ? {}
          : {
              layers: {
                bodyUrl: asset.layers.bodyUrl,
                groundUrl: grass.tiles[0] ?? asset.layers.groundUrl,
              },
            }),
      }),
    );
  const tiles = swap("TERRAIN:UNDEAD:GRASS", grass.tiles);
  const forests = swap("TERRAIN:UNDEAD:FOREST", grass.forests);
  return {
    variants: (subject) =>
      subject === "TERRAIN:UNDEAD:GRASS"
        ? tiles
        : subject === "TERRAIN:UNDEAD:FOREST"
          ? forests
          : LIVE_DIRECTION_ART_REGISTRY_V7.variants(subject),
  };
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
  const scene = factionBuildingsSceneViewV7(
    live,
    options.faction,
    options.captured === true,
    options.monuments === true,
  );
  const host = new CanvasBoardHostV7(document);
  host.mount(container, {
    onSelection: () => undefined,
    onCommand: () => undefined,
  });
  const look = liveBoardLookV7("CHIBI");
  host.update({
    matchInstanceId: `faction-buildings-${options.faction}-${options.after ? "after" : "before"}-${options.captured === true ? "captured" : "own"}${options.monuments === true ? "-monuments" : ""}`,
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
    ...(!options.after
      ? { visualDirectionArt: registryWithoutFactionLooks() }
      : options.grass !== null
        ? { visualDirectionArt: registryWithGrass(options.grass) }
        : {}),
  });
  const canvas = container.querySelector("canvas.board-canvas-v7");
  if (!(canvas instanceof HTMLCanvasElement))
    throw new Error("the review scene has no board canvas");
  return { host, canvas };
}
