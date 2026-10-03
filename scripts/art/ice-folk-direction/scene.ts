/**
 * Review scenes of the Ice Folk production art (bead pulp_wars-7g3.5,
 * docs/art/factions/ICE_FOLK.md). Loaded in the browser through the Vite dev
 * server by scripts/art/chibi-ice-folk-direction-review.ts and drawn by the
 * real CanvasBoardHostV7 with the CHIBI art set and the look the game draws
 * by default (seat-shaped base plates, the ready rim, the HP bar only when
 * damaged), full screen over a running match. Nothing here is part of the
 * game build. The layout code follows scripts/art/martian-direction/scene.ts.
 *
 * **Stand-ins.** Neither the Ice Folk nor the Martian art is wired into the
 * game while this art is made, so a scene gives an Ice Folk seat the faction
 * of a stand-in (a faction the scene does not otherwise show) and registers
 * the Ice Folk rasters under that faction's subjects: `UNIT:ICE_FOLK:<ROLE>`
 * as `UNIT:GOBLIN:<ROLE>`, `CITY:ICE_FOLK:<level>` as `CITY:GOBLIN:<level>`.
 * A Martian seat is drawn the same way with a second stand-in. The stand-ins'
 * own direction art is left out of the scene's registry. The board host, the
 * plates, the HP bars and the pennants are the game's own.
 *
 * The pennant anchors of the Ice Folk cities (ICE_FOLK_FLAG_ANCHORS_V7) are
 * not in DIRECTION_FLAG_ANCHORS_V7 yet (the UI bead copies them there), so
 * the scene adds them to that table in the page it runs in.
 *
 * The Snow overlay and the Blizzard are not in the renderer yet, so these
 * scenes show the units on the ordinary terrain; the review script draws
 * the Snow overlay and the Blizzard in its own board mock.
 *
 * Every scene is 7 x 7 cells written around the viewer's capital (3,4):
 *
 * - FOUR: four Ice Folk players (Coral, Teal, Gold, Violet): the roster on
 *   Grass, Forest and Mountain, beside Shallow and Deep Water, with ready
 *   rims and damaged HP bars, and a city of each tier.
 * - MIXED_A: an Ice Folk player in Teal against a Human in Coral, an Undead
 *   in Violet and a Dinosaur in Gold, each Ice Folk unit beside the others'
 *   unit of its role, Yetis on the Mountain row.
 * - MIXED_B: Ice Folk players in Coral and Violet against a Martian in Teal
 *   and a Goblin in Gold.
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
  type ArtSubjectV7,
  type ChibiArtAssetV7,
} from "../../../src/assets/chibi-art-v7";
import {
  CHIBI_DIRECTION_ART_ASSETS_V7,
  CHIBI_DIRECTION_GOBLIN_ART_ASSETS_V7,
} from "../../../src/assets/chibi-direction-art-manifest";
import {
  CHIBI_DIRECTION_ICE_FOLK_ART_ASSETS_V7,
  ICE_FOLK_FLAG_ANCHORS_V7,
} from "../../../src/assets/chibi-direction-ice-folk-art-manifest";
import {
  CHIBI_DIRECTION_MARTIAN_ART_ASSETS_V7,
  MARTIAN_FLAG_ANCHORS_V7,
} from "../../../src/assets/chibi-direction-martian-art-manifest";
import { CHIBI_DIRECTION_UNDEAD_ART_ASSETS_V7 } from "../../../src/assets/chibi-direction-undead-art-manifest";
import { CanvasBoardHostV7 } from "../../../src/render/canvas/board-host-v7";
import { liveBoardLookV7 } from "../../../src/render/canvas/live-board-look-v7";
import { DIRECTION_FLAG_ANCHORS_V7 } from "../../../src/render/canvas/visual-direction-v7";

type Tile = PlayerViewV7["board"]["tiles"][number];
type Seat = "A" | "B" | "C" | "D";
type StandIn = "UNDEAD" | "GOBLIN" | "DINOSAUR";

export type IceFolkSceneKindV7 = "FOUR" | "MIXED_A" | "MIXED_B";

const SEATS: readonly Seat[] = ["A", "B", "C", "D"];

interface Seating {
  /** `ICE_FOLK` and `MARTIAN` seats take the scene's stand-in factions. */
  readonly faction: FactionIdV7 | "ICE_FOLK";
  readonly color: PlayerColorV7;
}

interface SceneSpec {
  readonly seats: readonly Seating[];
  /** The faction whose subjects carry the Ice Folk rasters in this scene. */
  readonly iceFolk: StandIn;
  /** The faction whose subjects carry the Martian rasters, if any. */
  readonly martian: StandIn | null;
  readonly layout: readonly (readonly string[])[];
}

const TERRAIN: Readonly<Record<string, TerrainIdV7>> = {
  g: "GRASS",
  f: "FOREST",
  m: "MOUNTAIN",
  s: "SHALLOW_WATER",
  d: "DEEP_WATER",
};

/**
 * Y Yeti, S Sled, H Snow Hunter, M Mammoth, W Ice Witch, B Boulder Yeti,
 * T Sabretooth, G Frost Giant (for another faction: the unit of that role).
 */
const ROLE: Readonly<Record<string, UnitRoleIdV7>> = {
  Y: "FIGHTER",
  S: "RAIDER",
  H: "MARKSMAN",
  M: "GUARD",
  W: "CAPTAIN",
  B: "CATAPULT",
  T: "KNIGHT",
  G: "JUGGERNAUT",
};

/**
 * One cell: `<terrain><territory seat or ->` then `/`-separated items:
 * `city<level>` (a city of the territory's owner; `*` marks the capital) or
 * a unit `<role letter>:<seat>:<hp percent>[:r]` (`r` ready).
 */
const SCENES: Readonly<Record<IceFolkSceneKindV7, SceneSpec>> = {
  FOUR: {
    seats: [
      { faction: "ICE_FOLK", color: "CORAL" },
      { faction: "ICE_FOLK", color: "TEAL" },
      { faction: "ICE_FOLK", color: "GOLD" },
      { faction: "ICE_FOLK", color: "VIOLET" },
    ],
    iceFolk: "GOBLIN",
    martian: null,
    layout: [
      [
        "g-",
        "g-/Y:A:100:r",
        "g-/Y:B:100",
        "g-/Y:C:100",
        "g-/Y:D:100:r",
        "g-/Y:A:50",
        "g-",
      ],
      [
        "g-",
        "g-/H:A:100",
        "g-/M:B:60",
        "g-/W:C:100:r",
        "g-/W:D:100",
        "g-/S:A:40",
        "g-",
      ],
      [
        "g-",
        "g-/B:A:100",
        "g-/S:B:100:r",
        "g-/T:C:100",
        "g-/G:D:100",
        "g-/B:C:50",
        "g-",
      ],
      [
        "f-",
        "f-/Y:C:100",
        "f-/H:D:100",
        "f-/B:B:100",
        "f-/M:A:100:r",
        "f-/W:D:100",
        "f-",
      ],
      [
        "gD",
        "gD/city1/Y:D:100",
        "gB/S:B:100:r",
        "gA/city3*",
        "gA/M:A:100",
        "gC/city2",
        "gC/W:C:100",
      ],
      [
        "m-",
        "m-/Y:B:100",
        "m-/B:D:100:r",
        "m-/Y:C:100",
        "m-/G:A:100",
        "m-/Y:A:100",
        "m-",
      ],
      [
        "s-",
        "g-/S:A:100",
        "g-/T:D:100:r",
        "g-/H:B:100",
        "d-",
        "g-/T:C:60",
        "d-",
      ],
    ],
  },
  MIXED_A: {
    seats: [
      { faction: "ICE_FOLK", color: "TEAL" },
      { faction: "ORIGINAL", color: "CORAL" },
      { faction: "UNDEAD", color: "VIOLET" },
      { faction: "DINOSAUR", color: "GOLD" },
    ],
    iceFolk: "GOBLIN",
    martian: null,
    layout: [
      [
        "g-",
        "g-/Y:A:100:r",
        "g-/Y:B:100",
        "g-/Y:C:100",
        "g-/Y:D:100",
        "g-/H:A:100",
        "g-",
      ],
      [
        "g-",
        "g-/H:B:100",
        "g-/H:C:60",
        "g-/H:D:100",
        "g-/M:A:100:r",
        "g-/M:B:100",
        "g-",
      ],
      [
        "g-",
        "g-/B:A:100",
        "g-/B:B:100:r",
        "g-/B:C:100",
        "g-/B:D:50",
        "g-/W:A:100",
        "g-",
      ],
      [
        "f-",
        "f-/S:A:100:r",
        "f-/S:B:100",
        "f-/S:C:100",
        "f-/S:D:100",
        "f-/T:A:100",
        "f-",
      ],
      [
        "gB",
        "gB/city2/Y:B:100",
        "gB/W:B:100",
        "gA/city3*",
        "gA/Y:A:100",
        "gC/city1",
        "gC/W:C:100:r",
      ],
      [
        "m-",
        "m-/Y:A:100",
        "m-/T:B:100",
        "m-/T:C:100:r",
        "m-/G:A:100",
        "m-/G:B:60",
        "m-",
      ],
      [
        "gD",
        "gD/city2",
        "gD/G:D:100",
        "gA/city1",
        "gA/H:A:100:r",
        "gA/city2",
        "g-",
      ],
    ],
  },
  MIXED_B: {
    seats: [
      { faction: "ICE_FOLK", color: "CORAL" },
      { faction: "MARTIAN", color: "TEAL" },
      { faction: "GOBLIN", color: "GOLD" },
      { faction: "ICE_FOLK", color: "VIOLET" },
    ],
    iceFolk: "UNDEAD",
    martian: "DINOSAUR",
    layout: [
      [
        "g-",
        "g-/Y:A:100:r",
        "g-/Y:B:100",
        "g-/Y:C:100",
        "g-/Y:D:100",
        "g-/W:D:100:r",
        "g-",
      ],
      [
        "g-",
        "g-/H:A:100",
        "g-/H:D:60",
        "g-/H:B:100",
        "g-/H:C:100:r",
        "g-/S:D:100",
        "g-",
      ],
      [
        "g-",
        "g-/B:D:100:r",
        "g-/B:B:100",
        "g-/B:C:100",
        "g-/W:A:100",
        "g-/M:D:50",
        "g-",
      ],
      [
        "f-",
        "f-/S:A:100",
        "f-/S:B:100:r",
        "f-/S:C:100",
        "f-/M:A:100",
        "f-/T:D:60",
        "f-",
      ],
      [
        "gB",
        "gB/city3/Y:B:100",
        "gD/M:D:100:r",
        "gA/city2*",
        "gA/T:A:100",
        "gC/city3",
        "gC/G:C:100",
      ],
      [
        "m-",
        "m-/Y:D:100",
        "m-/T:B:100",
        "m-/T:C:100:r",
        "m-/Y:A:100",
        "m-/G:B:100",
        "m-",
      ],
      ["gD", "gD/city1", "gD/G:D:100", "gA/city3", "s-", "g-/G:A:60", "d-"],
    ],
  },
};
const CAPITAL: CoordV7 = { x: 3, y: 4 };

interface ParsedCell {
  readonly terrain: TerrainIdV7;
  readonly seat: Seat | null;
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
  let city: ParsedCell["city"] = null;
  let unit: ParsedCell["unit"] = null;
  for (const item of items) {
    if (item.startsWith("city"))
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
      };
    }
  }
  return { terrain, seat, city, unit };
}

/** Moves `UNIT:<FROM>:` and `CITY:<FROM>:` subjects to a stand-in. */
function underStandIn(
  assets: readonly ChibiArtAssetV7[],
  from: string,
  to: StandIn,
): ChibiArtAssetV7[] {
  return assets.flatMap((asset) =>
    asset.subject.startsWith(`UNIT:${from}:`) ||
    asset.subject.startsWith(`CITY:${from}:`)
      ? [
          {
            ...asset,
            subject: asset.subject.replace(
              `:${from}:`,
              `:${to}:`,
            ) as ArtSubjectV7,
          },
        ]
      : [],
  );
}

/**
 * The scene's direction art: the game's production art without the
 * stand-in factions' own, plus the Ice Folk (and Martian) rasters under the
 * stand-ins' subjects. The Martian Thrall has no role and is left out.
 */
export function iceFolkSceneArtV7(
  kind: IceFolkSceneKindV7,
): readonly ChibiArtAssetV7[] {
  const spec = SCENES[kind];
  const standIns: StandIn[] = [
    spec.iceFolk,
    ...(spec.martian === null ? [] : [spec.martian]),
  ];
  const taken = (subject: string): boolean =>
    standIns.some(
      (faction) =>
        subject.startsWith(`UNIT:${faction}:`) ||
        subject.startsWith(`CITY:${faction}:`),
    );
  const live = [
    ...CHIBI_DIRECTION_ART_ASSETS_V7,
    ...CHIBI_DIRECTION_GOBLIN_ART_ASSETS_V7,
    ...CHIBI_DIRECTION_UNDEAD_ART_ASSETS_V7,
  ].filter((asset) => !taken(asset.subject));
  return [
    ...live,
    ...underStandIn(
      CHIBI_DIRECTION_ICE_FOLK_ART_ASSETS_V7,
      "ICE_FOLK",
      spec.iceFolk,
    ),
    ...(spec.martian === null
      ? []
      : underStandIn(
          CHIBI_DIRECTION_MARTIAN_ART_ASSETS_V7.filter(
            (asset) => asset.subject !== "UNIT:MARTIAN:THRALL",
          ),
          "MARTIAN",
          spec.martian,
        )),
  ];
}

export interface IceFolkSceneV7 {
  readonly view: PlayerViewV7;
  readonly capitalAt: CoordV7;
  /** MOVE commands that make the scene's ready units draw as ready. */
  readonly commands: readonly CommandV7[];
}

export function iceFolkSceneViewV7(
  live: PlayerViewV7,
  kind: IceFolkSceneKindV7,
): IceFolkSceneV7 {
  const spec = SCENES[kind];
  const layout = spec.layout;
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
  const faction = (seating: Seating): FactionIdV7 =>
    seating.faction === "ICE_FOLK"
      ? spec.iceFolk
      : seating.faction === "MARTIAN"
        ? (spec.martian ?? "ORIGINAL")
        : seating.faction;
  const players = spec.seats.map((seating, index) => ({
    ...viewer,
    id: (index === 0 ? viewerId : firstFreeId + index) as PlayerId,
    seat: index,
    color: seating.color,
    faction: faction(seating),
    controller: index === 0 ? viewer.controller : ("AI" as const),
  }));
  const playerId = (seat: Seat): PlayerId =>
    players[SEATS.indexOf(seat)]?.id ?? viewerId;
  const cityId = (seat: Seat, at: CoordV7): CityId =>
    (Number(liveCapital.id) +
      500 +
      SEATS.indexOf(seat) * 100 +
      at.y * 10 +
      at.x) as CityId;
  const territoryCity = new Map<string, CityId>();
  layout.forEach((row, y) => {
    const cityOfSeat = new Map<Seat, CityId>();
    row.forEach((text, x) => {
      const cell = parse(text);
      if (cell.city !== null && cell.seat !== null)
        cityOfSeat.set(cell.seat, cityId(cell.seat, { x, y }));
    });
    row.forEach((text, x) => {
      const cell = parse(text);
      if (cell.seat === null) return;
      territoryCity.set(
        `${origin.x + x},${origin.y + y}`,
        cityOfSeat.get(cell.seat) ?? cityId(cell.seat, { x, y }),
      );
    });
  });
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
      road: false,
      fieldDefense: false,
      fortificationLevel: null,
      site:
        cell?.city != null ? (cell.city.capital ? "CAPITAL" : "CITY") : null,
      territoryCityId: territoryCity.get(`${tile.at.x},${tile.at.y}`) ?? null,
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
          id: cityId(cell.seat, { x, y }),
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
  const first = spec.seats[0];
  return {
    commands,
    capitalAt: { x: origin.x + CAPITAL.x, y: origin.y + CAPITAL.y },
    view: {
      ...live,
      viewer: {
        ...live.viewer,
        faction: first === undefined ? spec.iceFolk : faction(first),
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

export interface IceFolkSceneOptionsV7 {
  readonly kind: IceFolkSceneKindV7;
}

/** Mounts a full-screen CHIBI board host over the page showing the scene. */
export function showIceFolkSceneV7(
  live: PlayerViewV7,
  options: IceFolkSceneOptionsV7,
): { readonly host: CanvasBoardHostV7; readonly canvas: HTMLCanvasElement } {
  document
    .querySelectorAll("[data-chibi-review-scene]")
    .forEach((node) => node.remove());
  // The UI beads copy these anchors into DIRECTION_FLAG_ANCHORS_V7; until
  // then the review page adds them to its own copy of the table.
  Object.assign(
    DIRECTION_FLAG_ANCHORS_V7 as Record<string, unknown>,
    ICE_FOLK_FLAG_ANCHORS_V7,
    MARTIAN_FLAG_ANCHORS_V7,
  );
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
  const scene = iceFolkSceneViewV7(live, options.kind);
  const look = liveBoardLookV7("CHIBI");
  const art = buildChibiArtRegistryV7(iceFolkSceneArtV7(options.kind));
  if (art.problems.length > 0) throw new Error(art.problems.join("; "));
  host.update({
    matchInstanceId: `ice-folk-direction-${options.kind}`,
    view: scene.view,
    offeredCommands: scene.commands,
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
    visualDirectionArt: art.registry,
  });
  const canvas = container.querySelector("canvas.board-canvas-v7");
  if (!(canvas instanceof HTMLCanvasElement))
    throw new Error("the review scene has no board canvas");
  return { host, canvas };
}
