/**
 * Test-bench scenes for the visual-direction study (bead pulp_wars-3tq.1,
 * docs/art/VISUAL_DIRECTION_2026-10.md). Loaded in the browser
 * through the Vite dev server by scripts/art/visual-direction-review.ts and
 * drawn by the real CanvasBoardHostV7 with the CHIBI art set, full screen
 * over a running match. Nothing here is part of the game build.
 *
 * BUSY is one deterministic developed map, 13 x 11 cells written around the
 * viewer's capital: four players, one per faction (seats A-D: Human in
 * Coral, Undead in Teal, Goblin in Gold and Dinosaur in Violet; until bead
 * pulp_wars-w5j.3 all four played Human, which the game no longer allows
 * since pulp_wars-w5j.1), a city each at levels 1-3, a neutral Village,
 * every improvement, Roads, Forest, Mountains and a coast, and the Fighters,
 * Marksmen and Knights of all four players intermixed: on open ground, on
 * improvements, in cities, on a Field Defense, damaged, ready and spent.
 * NO_UNITS is the same map without units (the unit mask for the contrast
 * measure is the difference between the two) and EMPTY is its bare terrain.
 * (it keeps the capital alone, so the camera frames it the same way).
 * MARKER is NO_UNITS with the capital's cell selected: the test bench finds
 * that outline in the capture to learn where the scene sits on screen.
 */
import type {
  CityId,
  CommandV7,
  CoordV7,
  ImprovementIdV7,
  PlayerId,
  PlayerViewV7,
  ResourceIdV7,
  TerrainIdV7,
  UnitRoleIdV7,
} from "../../../src/engine/index";
import {
  buildChibiArtRegistryV7,
  type ChibiArtAssetV7,
} from "../../../src/assets/chibi-art-v7";
import { CanvasBoardHostV7 } from "../../../src/render/canvas/board-host-v7";
import {
  VISUAL_DIRECTION_SAMPLE_SETS_V7,
  type VisualDirectionSampleSetV7,
} from "../../../src/render/canvas/visual-direction-samples-v7";
import type { BoardVisualDirectionV7 } from "../../../src/render/canvas/visual-direction-v7";
import { LIVE_DIRECTION_ART_REGISTRY_V7 } from "../../../src/render/canvas/live-board-look-v7";

type Tile = PlayerViewV7["board"]["tiles"][number];
type Seat = "A" | "B" | "C" | "D";

export type VisualDirectionSceneKindV7 =
  | "BUSY"
  | "NO_UNITS"
  | "EMPTY"
  | "MARKER"
  /** The Human demo's compact patch (bead pulp_wars-3tq.3), see DEMO. */
  | "DEMO"
  | "DEMO_MARKER"
  /** The Farm patch (beads pulp_wars-9s0.6 and .7), see FARMS. */
  | "FARMS"
  /**
   * The running match exactly as it is (the demo's Showcase: a Human viewer
   * against Undead, Goblin and Dinosaur seats).
   */
  | "LIVE";

const TERRAIN: Readonly<Record<string, TerrainIdV7>> = {
  g: "GRASS",
  f: "FOREST",
  m: "MOUNTAIN",
  s: "SHALLOW_WATER",
  d: "DEEP_WATER",
};
const IMPROVEMENT: Readonly<Record<string, ImprovementIdV7>> = {
  farm: "FARM",
  lumber: "LUMBER_CAMP",
  mine: "MINE",
  mill: "WINDMILL",
  saw: "SAWMILL",
  forge: "FORGE",
  shop: "WORKSHOP",
  market: "MARKET",
  monument: "MONUMENT",
  port: "PORT",
  yard: "SHIPYARD",
};
const RESOURCE: Readonly<Record<string, ResourceIdV7>> = {
  ore: "ORE",
  fruit: "FRUIT",
  game: "GAME",
  fert: "FERTILE_GROUND",
  fish: "FISH",
  pearls: "PEARLS",
};
const ROLE: Readonly<Record<string, UnitRoleIdV7>> = {
  F: "FIGHTER",
  M: "MARKSMAN",
  K: "KNIGHT",
  P: "PATROL_BOAT",
  B: "BATTLESHIP",
};

/**
 * One cell: `<terrain><territory seat or ->` then `/`-separated items:
 * an improvement, resource, `road`, `fd` (Field Defense), `vil` (Village),
 * `city<level>` (a city of the territory's owner; `*` marks the capital),
 * or a unit `<F|M|K>:<seat>:<hp percent>[:r]` (`r` = ready to act).
 * Columns 0-12, rows 0-10; the viewer's capital is the centre cell (6,5).
 * A phone at zoom 1 shows about columns 4-8.
 */
const BUSY: readonly (readonly string[])[] = [
  [
    "m-/ore",
    "m-",
    "fD/game",
    "fD/lumber",
    "gD/farm",
    "gD/farm",
    "gD/mill",
    "gD/farm",
    "fD",
    "mD/mine",
    "mB/ore",
    "mB",
    "gB",
  ],
  [
    "f-",
    "gD/fruit",
    "gD/farm",
    "gD/road/M:D:100",
    "gD/road",
    "gD/city2/K:D:100",
    "gD/road",
    "gD/market/F:D:100",
    "gD/saw",
    "fB/lumber",
    "gB/farm",
    "gB/farm",
    "gB",
  ],
  [
    "g-",
    "fC/lumber",
    "gC/farm",
    "gC/F:D:50",
    "gD/farm/F:A:100",
    "gD/road",
    "gD/farm/M:B:70",
    "gD/forge",
    "gA/mill/F:B:70",
    "gB/road",
    "gB/mill",
    "gB/farm",
    "gB",
  ],
  [
    "gC",
    "gC/farm",
    "gC/farm",
    "gC/road/K:C:100",
    "gA/farm/K:A:100:r",
    "gA/road",
    "gA/mill",
    "gA/farm/M:A:100:r",
    "gA/F:C:100",
    "gB/road/K:B:100",
    "gB/city3",
    "gB/market",
    "gB",
  ],
  [
    "gC",
    "gC/mill",
    "gC/city1/F:C:100",
    "gC/road",
    "gA/road/F:D:60",
    "gA/road/F:A:100:r",
    "gA/farm/F:B:100",
    "gA/shop",
    "gA/road/M:C:40",
    "gB/road/F:B:100",
    "gB/road",
    "gB/farm",
    "fB",
  ],
  [
    "fC",
    "gC/farm",
    "gC/market",
    "gC/M:C:100",
    "gA/market/F:C:100",
    "gA/road/M:D:100",
    "gA/city3*/F:A:100:r",
    "gA/road/K:B:60",
    "gA/road/F:A:30",
    "fA/lumber/M:B:100",
    "gB/saw",
    "fB",
    "mB/mine",
  ],
  [
    "gC",
    "gC/saw",
    "fC/lumber",
    "gC/road/F:A:100",
    "gA/farm/M:A:100",
    "gA/farm/F:D:100",
    "gA/road",
    "gA/fd/F:A:100:r",
    "gA/forge/K:C:100",
    "gA/farm",
    "gB/farm/F:B:40",
    "gB",
    "mB/ore",
  ],
  [
    "gC",
    "gC/farm/K:C:100",
    "gC/road",
    "gC/road",
    "gA/saw/F:B:100",
    "gA/mill",
    "gA/road/K:A:50",
    "gA/farm/M:D:100",
    "mA/mine",
    "mA/mine/F:D:100",
    "gB/vil",
    "gB/fruit",
    "gB",
  ],
  [
    "fC",
    "mC/mine",
    "gC/shop",
    "gC/monument",
    "fA/lumber",
    "gA/M:C:100",
    "gA/road",
    "gA/monument",
    "mA/ore",
    "fA/game",
    "fB",
    "gB/farm",
    "gB",
  ],
  [
    "s-",
    "sC/port",
    "sC/fish",
    "gC",
    "gA/fruit",
    "sA/port",
    "gA/road/F:C:100",
    "sA/yard",
    "sA/fish",
    "s-",
    "sB/port",
    "gB",
    "g-",
  ],
  [
    "d-",
    "s-",
    "s-/pearls",
    "s-",
    "s-",
    "s-",
    "s-/fish",
    "s-",
    "d-",
    "d-",
    "s-",
    "s-",
    "s-",
  ],
];
const CAPITAL: CoordV7 = { x: 6, y: 5 };

/**
 * DEMO, 11 x 8 cells around the capital (5,4), the cases the Human demo has
 * to settle: a single Farm, a 3 x 3 block of Farms with Roads passing under
 * it both ways, a unit directly north of each city tier, every improvement
 * alone (row 4) and with a unit on it (row 5), and ships of all four
 * players on shallow and deep water beside Ports and a Shipyard.
 */
const DEMO: readonly (readonly string[])[] = [
  [
    "gA/farm",
    "gA",
    "gA/road",
    "gA",
    "gB/F:A:100",
    "gB",
    "gC/M:D:100",
    "gC",
    "gD/K:B:100",
    "gD",
    "g-",
  ],
  [
    "gA",
    "gA/farm",
    "gA/farm/road",
    "gA/farm",
    "gB/city1",
    "gB/F:B:100",
    "gC/city2/F:C:100",
    "gC",
    "gD/city3",
    "gD/K:D:100:r",
    "g-",
  ],
  [
    "gA/road",
    "gA/farm/road",
    "gA/farm/road",
    "gA/farm/road",
    "gA/road",
    "gB/M:B:40",
    "gC",
    "gC/F:C:100:r",
    "gD",
    "gD/M:D:100",
    "g-",
  ],
  [
    "gA",
    "gA/farm",
    "gA/farm/road",
    "gA/farm",
    "gA",
    "gA/F:A:100",
    "gA/K:A:100",
    "gA/M:A:100",
    "gA",
    "gA",
    "g-",
  ],
  [
    "fA/lumber",
    "gA/saw",
    "gA/road",
    "gA/mill",
    "gA/forge",
    "gA/city3*",
    "gA/shop",
    "gA/market",
    "gA/monument",
    "mA/mine",
    "g-",
  ],
  [
    "fA/lumber/F:A:100",
    "gA/saw/F:B:100",
    "gA/mill/M:C:100",
    "gA/forge/K:D:100",
    "gA/shop/F:A:70",
    "gA/market/M:B:100",
    "gA/farm/F:C:100",
    "gA/farm/K:A:100",
    "gA/farm/road/M:D:100",
    "mA/mine/F:B:100",
    "g-",
  ],
  [
    "sA/port",
    "sA/P:A:100",
    "sA/yard",
    "sA/B:B:100",
    "sA/fish",
    "sB/port",
    "sB/P:C:100:r",
    "s-/P:D:60",
    "sC/port",
    "s-/B:A:100",
    "s-",
  ],
  [
    "d-",
    "d-",
    "d-/B:D:100",
    "d-",
    "d-",
    "d-",
    "d-/P:B:100",
    "d-",
    "d-",
    "d-",
    "d-",
  ],
];
const DEMO_CAPITAL: CoordV7 = { x: 5, y: 4 };

/**
 * FARMS, 11 x 10 cells around the capital (5,5), for judging the Farm in
 * play (beads pulp_wars-9s0.6 and .7). Columns 3-7 are what a phone shows at zoom
 * 1: a 3 x 3 block of Farms over Roads running both ways (rows 1-3), single
 * Farms beside cities and buildings (rows 4-5), and a 5 x 3 field with a
 * unit of every player on its first row and Roads under it (rows 6-8).
 * Further single Farms, with and without a unit, stand left and right.
 */
const FARMS: readonly (readonly string[])[] = [
  ["gA", "gA", "gA", "gA", "gA", "gA/road", "gA", "gA", "gA", "gA", "g-"],
  [
    "gA",
    "gA/farm",
    "gA",
    "gA",
    "gA/farm",
    "gA/farm/road",
    "gA/farm",
    "gA",
    "gA/mill",
    "gA/farm",
    "g-",
  ],
  [
    "gA",
    "gA",
    "gA/saw",
    "gA/road",
    "gA/farm/road",
    "gA/farm/road",
    "gA/farm/road",
    "gA/road",
    "gA",
    "gA/farm",
    "g-",
  ],
  [
    "gA",
    "gA/farm/F:A:100",
    "gA",
    "gA",
    "gA/farm",
    "gA/farm/road",
    "gA/farm",
    "gA",
    "gA/farm/K:B:100",
    "gA",
    "g-",
  ],
  [
    "fA/lumber",
    "gA/farm",
    "gA/market",
    "gA/farm",
    "gA/forge",
    "gA/road",
    "gA/farm",
    "gB/city1",
    "gB/farm",
    "gB",
    "g-",
  ],
  [
    "gA",
    "gA",
    "gA/farm",
    "gA/mill",
    "gA/farm",
    "gA/city3*",
    "gA/farm",
    "gA/shop",
    "gA/farm",
    "gA",
    "g-",
  ],
  [
    "gA",
    "gA",
    "gA",
    "gA/farm/F:A:100",
    "gA/farm/M:B:100",
    "gA/farm/road/K:C:100",
    "gA/farm/F:D:70",
    "gA/farm",
    "gA",
    "gA",
    "g-",
  ],
  [
    "gA",
    "gA",
    "gA/road",
    "gA/farm/road",
    "gA/farm/road",
    "gA/farm/road",
    "gA/farm/road",
    "gA/farm/road",
    "gA/road",
    "gA",
    "g-",
  ],
  [
    "gA",
    "gA",
    "gA",
    "gA/farm",
    "gA/farm",
    "gA/farm/road",
    "gA/farm",
    "gA/farm",
    "gA",
    "gA",
    "g-",
  ],
  ["g-", "g-", "g-", "g-", "g-", "g-/road", "g-", "g-", "g-", "g-", "g-"],
];
const FARMS_CAPITAL: CoordV7 = { x: 5, y: 5 };
const SEATS: readonly Seat[] = ["A", "B", "C", "D"];
const COLOURS = ["CORAL", "TEAL", "GOLD", "VIOLET"] as const;
/** Every player plays a different faction (bead pulp_wars-w5j.1). */
const SEAT_FACTIONS = ["ORIGINAL", "UNDEAD", "GOBLIN", "DINOSAUR"] as const;

interface ParsedCell {
  readonly terrain: TerrainIdV7;
  readonly seat: Seat | null;
  readonly improvement: ImprovementIdV7 | null;
  readonly resource: ResourceIdV7 | null;
  readonly road: boolean;
  readonly fieldDefense: boolean;
  readonly village: boolean;
  readonly city: { readonly level: number; readonly capital: boolean } | null;
  readonly unit: {
    readonly role: UnitRoleIdV7;
    readonly seat: Seat;
    readonly hp: number;
    readonly ready: boolean;
  } | null;
}

function parse(cell: string): ParsedCell {
  const [head = "g-", ...items] = cell.split("/");
  const terrain = TERRAIN[head[0] ?? "g"] ?? "GRASS";
  const seat = SEATS.find((candidate) => candidate === head[1]) ?? null;
  let improvement: ImprovementIdV7 | null = null;
  let resource: ResourceIdV7 | null = null;
  let road = false;
  let fieldDefense = false;
  let village = false;
  let city: ParsedCell["city"] = null;
  let unit: ParsedCell["unit"] = null;
  for (const item of items) {
    if (item === "road") road = true;
    else if (item === "fd") fieldDefense = true;
    else if (item === "vil") village = true;
    else if (item.startsWith("city"))
      city = {
        level: Number.parseInt(item.slice(4), 10),
        capital: item.endsWith("*"),
      };
    else if (IMPROVEMENT[item] !== undefined) improvement = IMPROVEMENT[item];
    else if (RESOURCE[item] !== undefined) resource = RESOURCE[item];
    else {
      const [role = "", owner = "", hp = "100", flag] = item.split(":");
      const unitSeat = SEATS.find((candidate) => candidate === owner);
      const unitRole = ROLE[role];
      if (unitSeat === undefined || unitRole === undefined)
        throw new Error(`unknown scene item ${item}`);
      unit = {
        role: unitRole,
        seat: unitSeat,
        hp: Number.parseInt(hp, 10),
        ready: flag === "r",
      };
    }
  }
  // A Farm stands on Fertile Ground and a Mine on Ore, as in a real match.
  if (improvement === "FARM") resource = "FERTILE_GROUND";
  if (improvement === "MINE") resource = "ORE";
  return {
    terrain,
    seat,
    improvement,
    resource,
    road,
    fieldDefense,
    village,
    city,
    unit,
  };
}

export interface VisualDirectionSceneV7 {
  readonly view: PlayerViewV7;
  /** The board cell of the scene's capital (layout cell 6,5). */
  readonly capitalAt: CoordV7;
  /** MOVE commands that make the scene's ready units draw as ready. */
  readonly commands: readonly CommandV7[];
}

export function visualDirectionSceneViewV7(
  live: PlayerViewV7,
  kind: VisualDirectionSceneKindV7,
): VisualDirectionSceneV7 {
  if (kind === "LIVE")
    return { view: live, capitalAt: { x: 0, y: 0 }, commands: [] };
  const demo = kind === "DEMO" || kind === "DEMO_MARKER";
  const LAYOUT = kind === "FARMS" ? FARMS : demo ? DEMO : BUSY;
  const CAPITAL_AT =
    kind === "FARMS" ? FARMS_CAPITAL : demo ? DEMO_CAPITAL : CAPITAL;
  const rows = LAYOUT.length;
  const columns = LAYOUT[0]?.length ?? 0;
  if (live.board.width < columns || live.board.height < rows)
    throw new Error(`the scene needs a ${columns} x ${rows} board`);
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
      Math.min(live.board.width - columns, liveCapital.at.x - CAPITAL_AT.x),
    ),
    y: Math.max(
      0,
      Math.min(live.board.height - rows, liveCapital.at.y - CAPITAL_AT.y),
    ),
  };
  // Seat A is the viewer; B-D are synthetic seats, one faction each.
  const firstFreeId = Math.max(...live.players.map((player) => player.id)) + 1;
  const players = SEATS.map((_, index) => ({
    ...viewer,
    id: (index === 0 ? viewerId : firstFreeId + index) as PlayerId,
    seat: index,
    color: COLOURS[index] ?? "CORAL",
    faction: SEAT_FACTIONS[index] ?? "ORIGINAL",
    controller: index === 0 ? viewer.controller : ("AI" as const),
  }));
  const playerId = (seat: Seat): PlayerId =>
    players[SEATS.indexOf(seat)]?.id ?? viewerId;
  const cityId = (seat: Seat): CityId =>
    (Number(liveCapital.id) + 500 + SEATS.indexOf(seat)) as CityId;
  const cellAt = (at: CoordV7): ParsedCell | undefined => {
    const cell = LAYOUT[at.y - origin.y]?.[at.x - origin.x];
    return cell === undefined ? undefined : parse(cell);
  };
  const bare = kind === "EMPTY";
  const tiles: Tile[] = live.board.tiles.map((tile) => {
    const cell = cellAt(tile.at);
    return {
      at: tile.at,
      explored: true,
      biome: null,
      terrain: cell?.terrain ?? "GRASS",
      resource: cell?.resource ?? null,
      improvement: bare ? null : (cell?.improvement ?? null),
      road: !bare && (cell?.road ?? false),
      fieldDefense: !bare && (cell?.fieldDefense ?? false),
      fortificationLevel: null,
      site: bare
        ? null
        : cell?.city != null
          ? cell.city.capital
            ? "CAPITAL"
            : "CITY"
          : cell?.village === true
            ? "VILLAGE"
            : null,
      territoryCityId:
        bare || cell == null || cell.seat === null ? null : cityId(cell.seat),
      territoryOwnerId:
        bare || cell == null || cell.seat === null ? null : playerId(cell.seat),
    };
  });
  const cities: PlayerViewV7["cities"][number][] = [];
  const units: PlayerViewV7["units"][number][] = [];
  const commands: CommandV7[] = [];
  LAYOUT.forEach((row, y) =>
    row.forEach((text, x) => {
      const cell = parse(text);
      const at = { x: origin.x + x, y: origin.y + y };
      if (
        cell.city !== null &&
        cell.seat !== null &&
        (!bare || cell.city.capital)
      )
        cities.push({
          ...liveCapital,
          id: cityId(cell.seat),
          ownerId: playerId(cell.seat),
          at,
          level: cell.city.level,
          population: cell.city.level,
          isCapital: cell.city.capital,
        });
      if (
        (kind !== "BUSY" &&
          kind !== "DEMO" &&
          kind !== "DEMO_MARKER" &&
          kind !== "FARMS") ||
        cell.unit === null
      )
        return;
      const id = (9000 + y * columns + x) as typeof template.id;
      units.push({
        ...template,
        id,
        ownerId: playerId(cell.unit.seat),
        role: cell.unit.role,
        form:
          cell.unit.role === "PATROL_BOAT" || cell.unit.role === "BATTLESHIP"
            ? "NAVAL"
            : "LAND",
        at,
        hp: Math.max(1, Math.round((template.maxHp * cell.unit.hp) / 100)),
        activation: { ...template.activation, handled: !cell.unit.ready },
      });
      if (cell.unit.ready)
        commands.push({ kind: "MOVE", unitId: id } as unknown as CommandV7);
    }),
  );
  // Territory edges, as src/engine/v7/view.ts derives them.
  const ownerOf = (at: CoordV7): PlayerId | null => {
    const tile = tiles.find(
      (candidate) => candidate.at.x === at.x && candidate.at.y === at.y,
    );
    return tile?.explored === true ? tile.territoryOwnerId : null;
  };
  const cityOf = (at: CoordV7): CityId | null => {
    const tile = tiles.find(
      (candidate) => candidate.at.x === at.x && candidate.at.y === at.y,
    );
    return tile?.explored === true ? tile.territoryCityId : null;
  };
  const territoryBorders: PlayerViewV7["board"]["territoryBorders"][number][] =
    [];
  const directions = [
    { edge: "NORTH", dx: 0, dy: -1 },
    { edge: "EAST", dx: 1, dy: 0 },
    { edge: "SOUTH", dx: 0, dy: 1 },
    { edge: "WEST", dx: -1, dy: 0 },
  ] as const;
  for (const tile of tiles)
    for (const { edge, dx, dy } of directions) {
      if (
        (edge === "WEST" && tile.at.x > 0) ||
        (edge === "NORTH" && tile.at.y > 0)
      )
        continue;
      const neighbour = { x: tile.at.x + dx, y: tile.at.y + dy };
      const leftCity = cityOf(tile.at);
      const rightCity = cityOf(neighbour);
      if (leftCity === rightCity) continue;
      const leftOwner = ownerOf(tile.at);
      const rightOwner = ownerOf(neighbour);
      territoryBorders.push({
        at: tile.at,
        edge,
        ownerId: leftOwner === rightOwner ? null : (leftOwner ?? rightOwner),
        sharedOwnerIds:
          leftOwner !== null && rightOwner !== null && leftOwner !== rightOwner
            ? [leftOwner, rightOwner]
            : null,
        cityIds: [],
      });
    }
  return {
    commands,
    capitalAt: { x: origin.x + CAPITAL_AT.x, y: origin.y + CAPITAL_AT.y },
    view: {
      ...live,
      players,
      board: { ...live.board, tiles, territoryBorders },
      cities,
      units,
      treasureChests: [],
      graves: [],
      improvementValues: [],
      unitStats: [],
      plagued: [],
      bitten: [],
    },
  };
}

export interface VisualDirectionSceneOptionsV7 {
  readonly kind: VisualDirectionSceneKindV7;
  /** Omitted: today's rendering. */
  readonly direction?: BoardVisualDirectionV7;
  /** Exploration sample sprites the direction may draw. */
  readonly samples?: readonly ChibiArtAssetV7[];
  /** A named sample set of visual-direction-samples-v7.ts instead. */
  readonly sampleSet?: VisualDirectionSampleSetV7;
  /** The game's own direction art instead of a sample set. */
  readonly liveArt?: boolean;
}

/** Mounts a full-screen CHIBI board host over the page showing the scene. */
export function showVisualDirectionSceneV7(
  live: PlayerViewV7,
  options: VisualDirectionSceneOptionsV7,
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
  const scene = visualDirectionSceneViewV7(live, options.kind);
  const sampleAssets =
    options.sampleSet === undefined
      ? options.samples
      : VISUAL_DIRECTION_SAMPLE_SETS_V7[options.sampleSet];
  const samples =
    sampleAssets === undefined || sampleAssets.length === 0
      ? undefined
      : buildChibiArtRegistryV7(sampleAssets);
  if (samples !== undefined && samples.problems.length > 0)
    throw new Error(samples.problems.join("; "));
  host.update({
    matchInstanceId: `visual-direction-${options.kind}`,
    view: scene.view,
    offeredCommands: scene.commands,
    interaction: {
      selection:
        options.kind === "MARKER" || options.kind === "DEMO_MARKER"
          ? { kind: "TILE", at: scene.capitalAt }
          : null,
      selectedUnitId: null,
      selectedAchievement: null,
    },
    interactive: false,
    motion: "REDUCED",
    animationSpeed: "NORMAL",
    presentationPaused: true,
    highContrast: false,
    artSet: "CHIBI",
    ...(options.direction === undefined
      ? {}
      : { visualDirection: options.direction }),
    ...(options.liveArt === true
      ? { visualDirectionArt: LIVE_DIRECTION_ART_REGISTRY_V7 }
      : samples === undefined
        ? {}
        : { visualDirectionArt: samples.registry }),
  });
  const canvas = container.querySelector("canvas.board-canvas-v7");
  if (!(canvas instanceof HTMLCanvasElement))
    throw new Error("the review scene has no board canvas");
  return { host, canvas };
}
