/**
 * Review scenes of the Goblin direction study (bead pulp_wars-3tq.8,
 * docs/art/VISUAL_DIRECTION_2026-10.md, "Goblin study"). Loaded in the
 * browser through the Vite dev server by scripts/art/goblin-direction-review.ts
 * and drawn by the real CanvasBoardHostV7 with the CHIBI art set and the
 * look the game draws by default (LIVE_DIRECTION_V7: seat-shaped base
 * plates, the ready rim, the HP bar only when damaged), full screen over a
 * running match. Nothing here is part of the game build.
 *
 * Both scenes are 7 x 7 cells written around the viewer's capital (3,4):
 *
 * - FOUR: four players who ALL play Goblin (Coral, Teal, Gold, Violet), so
 *   the same unit is told apart by its plate alone. Rows: Goblins, Bomb
 *   Chuckers and Rocket Carts on Grass; a mixed row on Forest; a row beside
 *   and inside Goblin cities of the three tiers; a mixed row on Mountain.
 * - MIXED: a Goblin player in Gold and one in Teal against a Human player
 *   in Coral and one in Violet, each Goblin unit beside the Human unit of
 *   its role, for cross-faction contrast (hazard yellow against Human gold
 *   and against the Gold plate).
 *
 * `study: false` draws the same scene with the current Goblin sprites (the
 * before of a before/after pair): only the three study sprites differ.
 */
import type {
  CityId,
  CommandV7,
  CoordV7,
  FactionIdV7,
  PlayerColorV7,
  PlayerId,
  PlayerViewV7,
  TerrainIdV7,
  UnitRoleIdV7,
} from "../../../src/engine/index";
import {
  buildChibiArtRegistryV7,
  type ChibiArtAssetV7,
} from "../../../src/assets/chibi-art-v7";
import { CHIBI_DIRECTION_ART_ASSETS_V7 } from "../../../src/assets/chibi-direction-art-manifest";
import { CanvasBoardHostV7 } from "../../../src/render/canvas/board-host-v7";
import { liveBoardLookV7 } from "../../../src/render/canvas/live-board-look-v7";

type Tile = PlayerViewV7["board"]["tiles"][number];
type Seat = "A" | "B" | "C" | "D";

export type GoblinStudySceneKindV7 = "FOUR" | "MIXED";

const SEATS: readonly Seat[] = ["A", "B", "C", "D"];

const SEATING: Readonly<
  Record<
    GoblinStudySceneKindV7,
    readonly { readonly faction: FactionIdV7; readonly color: PlayerColorV7 }[]
  >
> = {
  FOUR: [
    { faction: "GOBLIN", color: "CORAL" },
    { faction: "GOBLIN", color: "TEAL" },
    { faction: "GOBLIN", color: "GOLD" },
    { faction: "GOBLIN", color: "VIOLET" },
  ],
  // Seat A is the viewer; the Goblin seats are A and C.
  MIXED: [
    { faction: "GOBLIN", color: "GOLD" },
    { faction: "ORIGINAL", color: "CORAL" },
    { faction: "GOBLIN", color: "TEAL" },
    { faction: "ORIGINAL", color: "VIOLET" },
  ],
};

const TERRAIN: Readonly<Record<string, TerrainIdV7>> = {
  g: "GRASS",
  f: "FOREST",
  m: "MOUNTAIN",
};
/** F Goblin or Fighter, M Bomb Chucker or Marksman, C Rocket Cart or Catapult, K Knight. */
const ROLE: Readonly<Record<string, UnitRoleIdV7>> = {
  F: "FIGHTER",
  M: "MARKSMAN",
  C: "CATAPULT",
  K: "KNIGHT",
};

/**
 * One cell: `<terrain><territory seat or ->` then `/`-separated items:
 * `road`, `city<level>` (a city of the territory's owner; `*` marks the
 * capital), or a unit `<F|M|C|K>:<seat>:<hp percent>[:r]` (`r` = ready).
 * A phone at zoom 1 shows about columns 1-5.
 */
const LAYOUTS: Readonly<
  Record<GoblinStudySceneKindV7, readonly (readonly string[])[]>
> = {
  FOUR: [
    [
      "g-",
      "g-/F:A:100:r",
      "g-/F:B:100",
      "g-/F:C:100",
      "g-/F:D:100:r",
      "g-/F:A:50",
      "g-",
    ],
    [
      "g-",
      "g-/M:A:100",
      "g-/M:B:60",
      "g-/M:C:100:r",
      "g-/M:D:30",
      "g-/M:B:100:r",
      "g-",
    ],
    [
      "g-",
      "g-/C:A:100",
      "g-/C:B:100:r",
      "g-/C:C:50",
      "g-/C:D:100",
      "g-/C:C:100:r",
      "g-",
    ],
    [
      "f-",
      "f-/F:A:60",
      "f-/M:B:100",
      "f-/C:C:100",
      "f-/F:D:100:r",
      "f-/M:C:100",
      "f-",
    ],
    [
      "gD",
      "gD/city1/F:D:100",
      "gB/M:B:100:r",
      "gA/city3*",
      "gA/F:A:100",
      "gC/city2",
      "gC/C:C:100",
    ],
    [
      "m-",
      "m-/F:C:100",
      "m-/M:D:100:r",
      "m-/C:A:100",
      "m-/F:B:40",
      "m-/M:A:100",
      "m-",
    ],
    [
      "g-",
      "g-/road",
      "g-/road/F:B:100",
      "g-/road/M:C:100",
      "g-/road/C:D:100:r",
      "g-/road",
      "g-",
    ],
  ],
  MIXED: [
    [
      "g-",
      "g-/F:A:100:r",
      "g-/F:B:100",
      "g-/F:C:100",
      "g-/F:D:100:r",
      "g-/K:B:100",
      "g-",
    ],
    [
      "g-",
      "g-/M:B:100",
      "g-/M:A:100:r",
      "g-/M:D:60",
      "g-/M:C:100",
      "g-/F:A:40",
      "g-",
    ],
    [
      "g-",
      "g-/C:A:100",
      "g-/C:B:100:r",
      "g-/C:C:50",
      "g-/C:D:100",
      "g-/M:C:100:r",
      "g-",
    ],
    [
      "f-",
      "f-/F:B:60",
      "f-/F:A:100",
      "f-/M:D:100",
      "f-/M:C:100:r",
      "f-/K:D:100",
      "f-",
    ],
    [
      "gB",
      "gB/city2/F:B:100",
      "gB/F:C:100:r",
      "gA/city3*",
      "gA/M:A:100",
      "gD/K:D:100",
      "gD/city1",
    ],
    [
      "m-",
      "m-/F:A:100",
      "m-/F:D:100:r",
      "m-/C:C:100",
      "m-/M:B:40",
      "m-/M:A:100",
      "m-",
    ],
    [
      "g-",
      "g-/road",
      "g-/road/C:A:100:r",
      "g-/road/F:D:100",
      "g-/road/M:C:70",
      "g-/road",
      "g-",
    ],
  ],
};
const CAPITAL: CoordV7 = { x: 3, y: 4 };

interface ParsedCell {
  readonly terrain: TerrainIdV7;
  readonly seat: Seat | null;
  readonly road: boolean;
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
  let road = false;
  let city: ParsedCell["city"] = null;
  let unit: ParsedCell["unit"] = null;
  for (const item of items) {
    if (item === "road") road = true;
    else if (item.startsWith("city"))
      city = {
        level: Number.parseInt(item.slice(4), 10),
        capital: item.endsWith("*"),
      };
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
  return { terrain, seat, road, city, unit };
}

export interface GoblinStudySceneV7 {
  readonly view: PlayerViewV7;
  readonly capitalAt: CoordV7;
  /** MOVE commands that make the scene's ready units draw as ready. */
  readonly commands: readonly CommandV7[];
}

export function goblinStudySceneViewV7(
  live: PlayerViewV7,
  kind: GoblinStudySceneKindV7,
): GoblinStudySceneV7 {
  const layout = LAYOUTS[kind];
  const rows = layout.length;
  const columns = layout[0]?.length ?? 0;
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
      Math.min(live.board.width - columns, liveCapital.at.x - CAPITAL.x),
    ),
    y: Math.max(
      0,
      Math.min(live.board.height - rows, liveCapital.at.y - CAPITAL.y),
    ),
  };
  const firstFreeId = Math.max(...live.players.map((player) => player.id)) + 1;
  const players = SEATING[kind].map((seating, index) => ({
    ...viewer,
    id: (index === 0 ? viewerId : firstFreeId + index) as PlayerId,
    seat: index,
    color: seating.color,
    faction: seating.faction,
    controller: index === 0 ? viewer.controller : ("AI" as const),
  }));
  const playerId = (seat: Seat): PlayerId =>
    players[SEATS.indexOf(seat)]?.id ?? viewerId;
  const cityId = (seat: Seat): CityId =>
    (Number(liveCapital.id) + 500 + SEATS.indexOf(seat)) as CityId;
  const cellAt = (at: CoordV7): ParsedCell | undefined => {
    const cell = layout[at.y - origin.y]?.[at.x - origin.x];
    return cell === undefined ? undefined : parse(cell);
  };
  const tiles: Tile[] = live.board.tiles.map((tile) => {
    const cell = cellAt(tile.at);
    return {
      at: tile.at,
      explored: true,
      biome: null,
      terrain: cell?.terrain ?? "GRASS",
      resource: null,
      improvement: null,
      road: cell?.road ?? false,
      fieldDefense: false,
      fortificationLevel: null,
      site:
        cell?.city != null ? (cell.city.capital ? "CAPITAL" : "CITY") : null,
      territoryCityId:
        cell == null || cell.seat === null ? null : cityId(cell.seat),
      territoryOwnerId:
        cell == null || cell.seat === null ? null : playerId(cell.seat),
    };
  });
  const cities: PlayerViewV7["cities"][number][] = [];
  const units: PlayerViewV7["units"][number][] = [];
  const commands: CommandV7[] = [];
  layout.forEach((row, y) =>
    row.forEach((text, x) => {
      const cell = parse(text);
      const at = { x: origin.x + x, y: origin.y + y };
      if (cell.city !== null && cell.seat !== null)
        cities.push({
          ...liveCapital,
          id: cityId(cell.seat),
          ownerId: playerId(cell.seat),
          at,
          level: cell.city.level,
          population: cell.city.level,
          isCapital: cell.city.capital,
        });
      if (cell.unit === null) return;
      const id = (9000 + y * columns + x) as typeof template.id;
      units.push({
        ...template,
        id,
        ownerId: playerId(cell.unit.seat),
        role: cell.unit.role,
        form: "LAND",
        at,
        hp: Math.max(1, Math.round((template.maxHp * cell.unit.hp) / 100)),
        activation: { ...template.activation, handled: !cell.unit.ready },
      });
      if (cell.unit.ready)
        commands.push({ kind: "MOVE", unitId: id } as unknown as CommandV7);
    }),
  );
  // Territory edges, as src/engine/v7/view.ts derives them.
  const tileAt = new Map(
    tiles.map((tile) => [`${tile.at.x},${tile.at.y}`, tile]),
  );
  const ownerOf = (at: CoordV7): PlayerId | null => {
    const tile = tileAt.get(`${at.x},${at.y}`);
    return tile?.explored === true ? tile.territoryOwnerId : null;
  };
  const cityOf = (at: CoordV7): CityId | null => {
    const tile = tileAt.get(`${at.x},${at.y}`);
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
    capitalAt: { x: origin.x + CAPITAL.x, y: origin.y + CAPITAL.y },
    view: {
      ...live,
      viewer: {
        ...live.viewer,
        faction: SEATING[kind][0]?.faction ?? "GOBLIN",
      },
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

export interface GoblinStudySceneOptionsV7 {
  readonly kind: GoblinStudySceneKindV7;
  /** The study's sample sprites; omitted or empty draws the current art. */
  readonly samples?: readonly ChibiArtAssetV7[];
  /**
   * Selects the capital's cell: the review script finds that outline in the
   * capture to learn where the scene sits on screen.
   */
  readonly marker?: boolean;
}

/** Mounts a full-screen CHIBI board host over the page showing the scene. */
export function showGoblinStudySceneV7(
  live: PlayerViewV7,
  options: GoblinStudySceneOptionsV7,
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
  const host = new CanvasBoardHostV7(document);
  host.mount(container, {
    onSelection: () => undefined,
    onCommand: () => undefined,
  });
  const scene = goblinStudySceneViewV7(live, options.kind);
  // The look the game draws (bead pulp_wars-3tq.6); the study's sprites are
  // added to its production art, so only the three Goblin units change.
  const look = liveBoardLookV7("CHIBI");
  const samples = options.samples ?? [];
  const art = buildChibiArtRegistryV7([
    ...CHIBI_DIRECTION_ART_ASSETS_V7,
    ...samples,
  ]);
  if (art.problems.length > 0) throw new Error(art.problems.join("; "));
  host.update({
    matchInstanceId: `goblin-direction-study-${options.kind}`,
    view: scene.view,
    offeredCommands: scene.commands,
    interaction: {
      selection:
        options.marker === true ? { kind: "TILE", at: scene.capitalAt } : null,
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
    ...(samples.length === 0 ? {} : { visualDirectionArt: art.registry }),
  });
  const canvas = container.querySelector("canvas.board-canvas-v7");
  if (!(canvas instanceof HTMLCanvasElement))
    throw new Error("the review scene has no board canvas");
  return { host, canvas };
}
