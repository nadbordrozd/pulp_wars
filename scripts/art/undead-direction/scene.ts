/**
 * Review scenes of the Undead direction study (bead pulp_wars-3tq.11,
 * docs/art/VISUAL_DIRECTION_2026-10.md, "Undead study"). Loaded in the
 * browser through the Vite dev server by scripts/art/undead-direction-review.ts
 * and drawn by the real CanvasBoardHostV7 with the CHIBI art set and the
 * look the game draws by default (LIVE_DIRECTION_V7: seat-shaped base
 * plates, the ready rim, the HP bar only when damaged), full screen over a
 * running match. Nothing here is part of the game build. The layout code
 * follows scripts/art/goblin-direction/scene.ts.
 *
 * Both scenes are 7 x 7 cells written around the viewer's capital (3,4):
 *
 * - FOUR: four players who ALL play Undead (Coral, Teal, Gold, Violet), so
 *   the same unit is told apart by its plate alone, and each accent is seen
 *   on every plate (violet on the Violet plate, cyan on the Teal plate).
 *   Rows: Skeletons, Zombies and Necromancers on Grass; a mixed row on
 *   Forest; a row beside and inside Undead cities of the three tiers; a
 *   mixed row on Mountain; a row on a Road with Graves.
 * - MIXED: an Undead player in Teal and one in Violet against a Human
 *   player in Coral and a Goblin player in Gold (today's Goblin sprites),
 *   each Undead unit beside the Human and Goblin unit of its role.
 *
 * Some units carry the Plague or the Bitten marker and some cells a Grave,
 * so the existing Undead board markers are seen beside each accent.
 *
 * Without `samples` the same scene is drawn with the current Undead sprites
 * (the "today" panel): only the three study sprites differ.
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

export type UndeadStudySceneKindV7 = "FOUR" | "MIXED";

const SEATS: readonly Seat[] = ["A", "B", "C", "D"];

const SEATING: Readonly<
  Record<
    UndeadStudySceneKindV7,
    readonly { readonly faction: FactionIdV7; readonly color: PlayerColorV7 }[]
  >
> = {
  FOUR: [
    { faction: "UNDEAD", color: "CORAL" },
    { faction: "UNDEAD", color: "TEAL" },
    { faction: "UNDEAD", color: "GOLD" },
    { faction: "UNDEAD", color: "VIOLET" },
  ],
  // Seat A is the viewer; the Undead seats are A and C.
  MIXED: [
    { faction: "UNDEAD", color: "TEAL" },
    { faction: "ORIGINAL", color: "CORAL" },
    { faction: "UNDEAD", color: "VIOLET" },
    { faction: "GOBLIN", color: "GOLD" },
  ],
};

const TERRAIN: Readonly<Record<string, TerrainIdV7>> = {
  g: "GRASS",
  f: "FOREST",
  m: "MOUNTAIN",
};
/** S Skeleton or Fighter or Goblin, Z Zombie or Guard or Orc Brute, N Necromancer or Captain or Warboss. */
const ROLE: Readonly<Record<string, UnitRoleIdV7>> = {
  S: "FIGHTER",
  Z: "GUARD",
  N: "CAPTAIN",
};

/**
 * One cell: `<terrain><territory seat or ->` then `/`-separated items:
 * `road`, `grave`, `city<level>` (a city of the territory's owner; `*`
 * marks the capital), or a unit `<S|Z|N>:<seat>:<hp percent>[:flags]`
 * (flags: `r` ready, `p` Plagued, `b` Bitten). A phone at zoom 1 shows
 * about columns 1-5.
 */
const LAYOUTS: Readonly<
  Record<UndeadStudySceneKindV7, readonly (readonly string[])[]>
> = {
  FOUR: [
    [
      "g-",
      "g-/S:A:100:r",
      "g-/S:B:100",
      "g-/S:C:100",
      "g-/S:D:100:r",
      "g-/S:A:50",
      "g-",
    ],
    [
      "g-",
      "g-/Z:A:100",
      "g-/Z:B:60",
      "g-/Z:C:100:r",
      "g-/Z:D:30",
      "g-/Z:B:100:r",
      "g-",
    ],
    [
      "g-",
      "g-/N:A:100",
      "g-/N:B:100:r",
      "g-/N:C:50",
      "g-/N:D:100",
      "g-/N:C:100:r",
      "g-",
    ],
    [
      "f-",
      "f-/S:A:60",
      "f-/Z:B:100",
      "f-/N:C:100",
      "f-/S:D:100:r",
      "f-/N:D:100",
      "f-",
    ],
    [
      "gD",
      "gD/city1/S:D:100",
      "gB/N:B:100:r",
      "gA/city3*",
      "gA/Z:A:100",
      "gC/city2",
      "gC/N:C:100",
    ],
    [
      "m-",
      "m-/S:C:100",
      "m-/Z:D:100:r",
      "m-/N:A:100",
      "m-/S:B:40",
      "m-/N:B:100",
      "m-",
    ],
    [
      "g-",
      "g-/road/grave",
      "g-/road/grave/S:B:100",
      "g-/road/Z:C:100:p",
      "g-/road/N:D:100:r",
      "g-/road/S:A:100:b",
      "g-",
    ],
  ],
  MIXED: [
    [
      "g-",
      "g-/S:A:100:r",
      "g-/S:B:100",
      "g-/S:D:100",
      "g-/S:C:100:r",
      "g-/S:B:60",
      "g-",
    ],
    [
      "g-",
      "g-/Z:A:100",
      "g-/Z:B:100:r",
      "g-/Z:D:60",
      "g-/Z:C:100",
      "g-/Z:D:100",
      "g-",
    ],
    [
      "g-",
      "g-/N:A:100",
      "g-/N:B:100:r",
      "g-/N:D:50",
      "g-/N:C:100",
      "g-/N:B:100",
      "g-",
    ],
    [
      "f-",
      "f-/S:B:60",
      "f-/S:A:100",
      "f-/N:D:100",
      "f-/N:C:100:r",
      "f-/Z:A:100",
      "f-",
    ],
    [
      "gB",
      "gB/city2/S:B:100",
      "gB/N:C:100:r",
      "gA/city3*",
      "gA/Z:A:100",
      "gC/S:C:100",
      "gC/city1",
    ],
    [
      "m-",
      "m-/S:A:100",
      "m-/S:D:100:r",
      "m-/N:C:100",
      "m-/Z:B:40",
      "m-/Z:C:100",
      "m-",
    ],
    [
      "g-",
      "g-/road/grave",
      "g-/road/N:A:100:r",
      "g-/road/S:B:100:p",
      "g-/road/grave/Z:D:70:b",
      "g-/road/S:C:100",
      "g-",
    ],
  ],
};
const CAPITAL: CoordV7 = { x: 3, y: 4 };

interface ParsedCell {
  readonly terrain: TerrainIdV7;
  readonly seat: Seat | null;
  readonly road: boolean;
  readonly grave: boolean;
  readonly city: { readonly level: number; readonly capital: boolean } | null;
  readonly unit: {
    readonly role: UnitRoleIdV7;
    readonly seat: Seat;
    readonly hp: number;
    readonly ready: boolean;
    readonly plagued: boolean;
    readonly bitten: boolean;
  } | null;
}

function parse(cell: string): ParsedCell {
  const [head = "g-", ...items] = cell.split("/");
  const terrain = TERRAIN[head[0] ?? "g"] ?? "GRASS";
  const seat = SEATS.find((candidate) => candidate === head[1]) ?? null;
  let road = false;
  let grave = false;
  let city: ParsedCell["city"] = null;
  let unit: ParsedCell["unit"] = null;
  for (const item of items) {
    if (item === "road") road = true;
    else if (item === "grave") grave = true;
    else if (item.startsWith("city"))
      city = {
        level: Number.parseInt(item.slice(4), 10),
        capital: item.endsWith("*"),
      };
    else {
      const [role = "", owner = "", hp = "100", flags = ""] = item.split(":");
      const unitSeat = SEATS.find((candidate) => candidate === owner);
      const unitRole = ROLE[role];
      if (unitSeat === undefined || unitRole === undefined)
        throw new Error(`unknown scene item ${item}`);
      unit = {
        role: unitRole,
        seat: unitSeat,
        hp: Number.parseInt(hp, 10),
        ready: flags.includes("r"),
        plagued: flags.includes("p"),
        bitten: flags.includes("b"),
      };
    }
  }
  return { terrain, seat, road, grave, city, unit };
}

export interface UndeadStudySceneV7 {
  readonly view: PlayerViewV7;
  readonly capitalAt: CoordV7;
  /** MOVE commands that make the scene's ready units draw as ready. */
  readonly commands: readonly CommandV7[];
}

export function undeadStudySceneViewV7(
  live: PlayerViewV7,
  kind: UndeadStudySceneKindV7,
): UndeadStudySceneV7 {
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
  const graves: CoordV7[] = [];
  const plagued: PlayerViewV7["plagued"][number][] = [];
  const bitten: PlayerViewV7["bitten"][number][] = [];
  layout.forEach((row, y) =>
    row.forEach((text, x) => {
      const cell = parse(text);
      const at = { x: origin.x + x, y: origin.y + y };
      if (cell.grave) graves.push(at);
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
      if (cell.unit.plagued)
        plagued.push({ unitId: id, sourceUnitId: null, turnsRemaining: 2 });
      if (cell.unit.bitten)
        bitten.push({ unitId: id, biterPlayerId: playerId("C") });
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
        faction: SEATING[kind][0]?.faction ?? "UNDEAD",
      },
      players,
      board: { ...live.board, tiles, territoryBorders },
      cities,
      units,
      treasureChests: [],
      graves,
      improvementValues: [],
      unitStats: [],
      plagued,
      bitten,
    },
  };
}

export interface UndeadStudySceneOptionsV7 {
  readonly kind: UndeadStudySceneKindV7;
  /** The study's sample sprites; omitted or empty draws the current art. */
  readonly samples?: readonly ChibiArtAssetV7[];
  /**
   * Selects the capital's cell: the review script finds that outline in the
   * capture to learn where the scene sits on screen.
   */
  readonly marker?: boolean;
}

/** Mounts a full-screen CHIBI board host over the page showing the scene. */
export function showUndeadStudySceneV7(
  live: PlayerViewV7,
  options: UndeadStudySceneOptionsV7,
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
  const scene = undeadStudySceneViewV7(live, options.kind);
  // The look the game draws (bead pulp_wars-3tq.6); the study's sprites are
  // added to its production art, so only the three Undead units change.
  const look = liveBoardLookV7("CHIBI");
  const samples = options.samples ?? [];
  const art = buildChibiArtRegistryV7([
    ...CHIBI_DIRECTION_ART_ASSETS_V7,
    ...samples,
  ]);
  if (art.problems.length > 0) throw new Error(art.problems.join("; "));
  host.update({
    matchInstanceId: `undead-direction-study-${options.kind}`,
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
    // Always the study's own registry (the Human production art plus the
    // samples): since bead pulp_wars-3tq.12 the game's registry holds the
    // Undead production art, and the "today" panel must stay the art the
    // study compared against.
    visualDirectionArt: art.registry,
  });
  const canvas = container.querySelector("canvas.board-canvas-v7");
  if (!(canvas instanceof HTMLCanvasElement))
    throw new Error("the review scene has no board canvas");
  return { host, canvas };
}
