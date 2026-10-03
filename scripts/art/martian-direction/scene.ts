/**
 * Review scenes of the Martian production art (bead pulp_wars-t6s.6,
 * docs/art/factions/MARTIAN.md). Loaded in the browser through the Vite dev
 * server by scripts/art/chibi-martian-direction-review.ts and drawn by the
 * real CanvasBoardHostV7 with the CHIBI art set and the look the game draws
 * by default (seat-shaped base plates, the ready rim, the HP bar only when
 * damaged), full screen over a running match. Nothing here is part of the
 * game build. The layout code follows scripts/art/undead-direction/scene.ts.
 *
 * **Stand-ins.** The Martian faction is not in the engine while this art is
 * made, so a scene gives a Martian seat the faction of a stand-in (a faction
 * the scene does not otherwise show) and registers the Martian rasters under
 * that faction's subjects: `UNIT:MARTIAN:<ROLE>` as `UNIT:GOBLIN:<ROLE>`,
 * `CITY:MARTIAN:<level>` as `CITY:GOBLIN:<level>`. The stand-in's own
 * direction art is left out of the scene's registry. The Thrall has no role,
 * so a second stand-in faction's FIGHTER is the Thrall, owned by a shadow
 * player with the colour of its Martian seat; since the Thrall sprite is
 * retired (bead pulp_wars-b5f.3: a mind-controlled unit keeps its own
 * sprite) that FIGHTER draws its own stand-in art. The board host, the plates,
 * the HP bars and the pennants are the game's own.
 *
 * The pennant anchors of the Martian cities (MARTIAN_FLAG_ANCHORS_V7) are
 * not in DIRECTION_FLAG_ANCHORS_V7 yet (the UI bead copies them there), so
 * the scene adds them to that table in the page it runs in.
 *
 * Every scene is 7 x 7 cells written around the viewer's capital (3,4):
 *
 * - FOUR: four players who all play Martian (Coral, Teal, Gold, Violet): the
 *   whole roster on Grass, Forest, Mountain, Shallow and Deep Water, with
 *   ready rims and damaged HP bars, Thralls, and a city of each tier.
 * - MIXED_A: a Martian player in Teal against a Human in Coral, an Undead in
 *   Violet and a Dinosaur in Gold, each Martian unit beside the others' unit
 *   of its role, and a Martian city beside theirs.
 * - MIXED_B: Martian players in Coral and Violet (so magenta is seen on the
 *   Coral and Violet plates) with their Thralls, against a Human in Teal and
 *   a Goblin in Gold.
 * - ALIENS (bead pulp_wars-b5f.1): the redesigned Grunt, Ray Gunner and
 *   Shield Projector of a Martian in Teal in mixed groups on Grass, Forest
 *   and Mountain, beside the other Martian units, with the "before" trio
 *   (a second Martian seat in Violet, whose rasters the review passes as
 *   `before` data URLs) and the Human and Dinosaur unit of each role.
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
  CHIBI_DIRECTION_MARTIAN_ART_ASSETS_V7,
  MARTIAN_FLAG_ANCHORS_V7,
} from "../../../src/assets/chibi-direction-martian-art-manifest";
import { CHIBI_DIRECTION_UNDEAD_ART_ASSETS_V7 } from "../../../src/assets/chibi-direction-undead-art-manifest";
import { CanvasBoardHostV7 } from "../../../src/render/canvas/board-host-v7";
import { liveBoardLookV7 } from "../../../src/render/canvas/live-board-look-v7";
import { DIRECTION_FLAG_ANCHORS_V7 } from "../../../src/render/canvas/visual-direction-v7";

type Tile = PlayerViewV7["board"]["tiles"][number];
type Seat = "A" | "B" | "C" | "D";
type StandIn = Exclude<FactionIdV7, "ORIGINAL">;

export type MartianSceneKindV7 = "FOUR" | "MIXED_A" | "MIXED_B" | "ALIENS";

const SEATS: readonly Seat[] = ["A", "B", "C", "D"];

interface Seating {
  /**
   * `MARTIAN` seats take the scene's stand-in faction; a `MARTIAN_BEFORE`
   * seat takes the `before` stand-in, which draws the "before" trio.
   */
  readonly faction: FactionIdV7 | "MARTIAN" | "MARTIAN_BEFORE";
  readonly color: PlayerColorV7;
}

interface SceneSpec {
  readonly seats: readonly Seating[];
  /** The faction whose subjects carry the Martian rasters in this scene. */
  readonly martian: StandIn;
  /** The faction whose FIGHTER is the Thrall, or null for no Thralls. */
  readonly thrall: StandIn | null;
  /**
   * The faction whose FIGHTER, MARKSMAN and GUARD carry the "before"
   * Grunt, Ray Gunner and Shield Projector (and its other roles the
   * current Martian units), if any.
   */
  readonly before?: StandIn;
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
 * G Grunt, S Saucer, R Ray Gunner, P Shield Projector, B Brain, T Tripod,
 * M Mothership, C Colossus (for another faction: the unit of that role);
 * H is a Thrall of the seat.
 */
const ROLE: Readonly<Record<string, UnitRoleIdV7>> = {
  G: "FIGHTER",
  S: "RAIDER",
  R: "MARKSMAN",
  P: "GUARD",
  B: "CAPTAIN",
  T: "CATAPULT",
  M: "KNIGHT",
  C: "JUGGERNAUT",
  H: "FIGHTER",
};

/**
 * One cell: `<terrain><territory seat or ->` then `/`-separated items:
 * `city<level>` (a city of the territory's owner; `*` marks the capital) or
 * a unit `<role letter>:<seat>:<hp percent>[:r]` (`r` ready). A phone at
 * zoom 1 shows about columns 1-5.
 */
const SCENES: Readonly<Record<MartianSceneKindV7, SceneSpec>> = {
  FOUR: {
    seats: [
      { faction: "MARTIAN", color: "CORAL" },
      { faction: "MARTIAN", color: "TEAL" },
      { faction: "MARTIAN", color: "GOLD" },
      { faction: "MARTIAN", color: "VIOLET" },
    ],
    martian: "GOBLIN",
    thrall: "DINOSAUR",
    layout: [
      [
        "g-",
        "g-/G:A:100:r",
        "g-/G:B:100",
        "g-/G:C:100",
        "g-/G:D:100:r",
        "g-/G:A:50",
        "g-",
      ],
      [
        "g-",
        "g-/R:A:100",
        "g-/P:B:60",
        "g-/B:C:100:r",
        "g-/H:D:100",
        "g-/H:A:40",
        "g-",
      ],
      [
        "g-",
        "g-/T:A:100",
        "g-/S:B:100:r",
        "g-/M:C:100",
        "g-/C:D:100",
        "g-/T:C:50",
        "g-",
      ],
      [
        "f-",
        "f-/G:C:100",
        "f-/R:D:100",
        "f-/T:B:100",
        "f-/P:A:100:r",
        "f-/B:D:100",
        "f-",
      ],
      [
        "gD",
        "gD/city1/G:D:100",
        "gB/S:B:100:r",
        "gA/city3*",
        "gA/P:A:100",
        "gC/city2",
        "gC/B:C:100",
      ],
      [
        "m-",
        "m-/G:B:100",
        "m-/T:D:100:r",
        "m-/R:C:100",
        "m-/C:A:100",
        "m-/M:B:100",
        "m-",
      ],
      [
        "s-",
        "s-/S:A:100",
        "s-/M:D:100:r",
        "s-/T:B:100",
        "d-/C:C:100",
        "d-/S:C:60",
        "d-",
      ],
    ],
  },
  MIXED_A: {
    seats: [
      { faction: "MARTIAN", color: "TEAL" },
      { faction: "ORIGINAL", color: "CORAL" },
      { faction: "UNDEAD", color: "VIOLET" },
      { faction: "DINOSAUR", color: "GOLD" },
    ],
    martian: "GOBLIN",
    thrall: null,
    layout: [
      [
        "g-",
        "g-/G:A:100:r",
        "g-/G:B:100",
        "g-/G:C:100",
        "g-/G:D:100",
        "g-/R:A:100",
        "g-",
      ],
      [
        "g-",
        "g-/R:B:100",
        "g-/R:C:60",
        "g-/R:D:100",
        "g-/P:A:100:r",
        "g-/P:B:100",
        "g-",
      ],
      [
        "g-",
        "g-/T:A:100",
        "g-/T:B:100:r",
        "g-/T:C:100",
        "g-/T:D:50",
        "g-/B:A:100",
        "g-",
      ],
      [
        "f-",
        "f-/S:A:100:r",
        "f-/S:B:100",
        "f-/S:C:100",
        "f-/S:D:100",
        "f-/M:A:100",
        "f-",
      ],
      [
        "gB",
        "gB/city2/G:B:100",
        "gB/B:B:100",
        "gA/city3*",
        "gA/G:A:100",
        "gC/city1",
        "gC/B:C:100:r",
      ],
      [
        "m-",
        "m-/M:A:100",
        "m-/M:B:100",
        "m-/M:C:100:r",
        "m-/C:A:100",
        "m-/C:B:60",
        "m-",
      ],
      [
        "gD",
        "gD/city2",
        "gD/C:D:100",
        "gA/city1",
        "gA/R:A:100:r",
        "gA/city2",
        "g-",
      ],
    ],
  },
  MIXED_B: {
    seats: [
      { faction: "MARTIAN", color: "CORAL" },
      { faction: "ORIGINAL", color: "TEAL" },
      { faction: "GOBLIN", color: "GOLD" },
      { faction: "MARTIAN", color: "VIOLET" },
    ],
    martian: "UNDEAD",
    thrall: "DINOSAUR",
    layout: [
      [
        "g-",
        "g-/G:A:100:r",
        "g-/H:A:100",
        "g-/G:B:100",
        "g-/G:C:100",
        "g-/H:D:100:r",
        "g-",
      ],
      [
        "g-",
        "g-/R:A:100",
        "g-/R:D:60",
        "g-/R:B:100",
        "g-/R:C:100:r",
        "g-/G:D:100",
        "g-",
      ],
      [
        "g-",
        "g-/T:D:100:r",
        "g-/T:B:100",
        "g-/T:C:100",
        "g-/B:A:100",
        "g-/B:D:50",
        "g-",
      ],
      [
        "f-",
        "f-/S:D:100",
        "f-/S:B:100:r",
        "f-/S:C:100",
        "f-/P:D:100",
        "f-/H:A:60",
        "f-",
      ],
      [
        "gB",
        "gB/city3/G:B:100",
        "gD/P:D:100:r",
        "gA/city2*",
        "gA/M:A:100",
        "gC/city3",
        "gC/C:C:100",
      ],
      [
        "m-",
        "m-/M:D:100",
        "m-/M:B:100",
        "m-/M:C:100:r",
        "m-/C:D:100",
        "m-/C:B:100",
        "m-",
      ],
      [
        "gD",
        "gD/city1",
        "gD/S:D:100",
        "gA/city3",
        "s-/T:A:100",
        "s-/M:A:60",
        "d-/C:A:100:r",
      ],
    ],
  },
  ALIENS: {
    seats: [
      { faction: "MARTIAN", color: "TEAL" },
      { faction: "MARTIAN_BEFORE", color: "VIOLET" },
      { faction: "ORIGINAL", color: "CORAL" },
      { faction: "DINOSAUR", color: "GOLD" },
    ],
    martian: "GOBLIN",
    thrall: null,
    before: "UNDEAD",
    layout: [
      [
        "g-",
        "g-/G:A:100",
        "g-/R:A:100",
        "g-/P:A:100",
        "g-/S:A:100",
        "g-/B:A:100",
        "g-",
      ],
      [
        "g-",
        "g-/G:B:100",
        "g-/R:B:100",
        "g-/P:B:100",
        "g-/T:A:100",
        "g-/M:A:100",
        "g-",
      ],
      [
        "f-",
        "f-/P:A:100",
        "f-/G:A:100:r",
        "f-/R:A:100",
        "f-/G:C:100",
        "f-/R:C:100",
        "f-/P:C:100",
      ],
      [
        "g-",
        "g-/R:A:100",
        "g-/P:A:60",
        "g-/G:A:100",
        "g-/G:D:100",
        "g-/R:D:100",
        "g-/P:D:100",
      ],
      [
        "gA",
        "gA/G:A:100",
        "gA/R:A:100:r",
        "gA/city2*",
        "gA/P:A:100",
        "g-/S:A:100",
        "g-/G:B:100",
      ],
      [
        "m-",
        "m-/G:A:100",
        "m-/R:A:100",
        "m-/P:A:100:r",
        "m-/G:B:100",
        "m-/R:B:100",
        "m-/P:B:100",
      ],
      [
        "g-",
        "g-/T:A:100",
        "g-/G:A:100",
        "g-/C:A:100",
        "g-/R:A:100",
        "g-/P:A:100",
        "g-/B:A:100:r",
      ],
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
    readonly thrall: boolean;
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
        thrall: role === "H",
        seat: unitSeat,
        hp: Number.parseInt(hp, 10),
        ready: flags.includes("r"),
      };
    }
  }
  return { terrain, seat, city, unit };
}

/**
 * The scene's direction art: the game's production art without the stand-in
 * factions' own, plus the Martian rasters under the stand-ins' subjects.
 */
export function martianSceneArtV7(
  kind: MartianSceneKindV7,
  before: Readonly<Partial<Record<UnitRoleIdV7, string>>> = {},
): readonly ChibiArtAssetV7[] {
  const spec = SCENES[kind];
  const standIns = [
    spec.martian,
    ...(spec.thrall === null ? [] : [spec.thrall]),
    ...(spec.before === undefined ? [] : [spec.before]),
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
  const martian = CHIBI_DIRECTION_MARTIAN_ART_ASSETS_V7.flatMap((asset) => {
    if (
      asset.subject.startsWith("UNIT:MARTIAN:") ||
      asset.subject.startsWith("CITY:MARTIAN:")
    )
      return [
        {
          ...asset,
          subject: asset.subject.replace(
            ":MARTIAN:",
            `:${spec.martian}:`,
          ) as ArtSubjectV7,
        },
      ];
    return [];
  });
  // The "before" seat: its trio from the given rasters, its other roles
  // the current Martian units, under the `before` stand-in's subjects.
  const beforeFaction = spec.before;
  const earlier =
    beforeFaction === undefined
      ? []
      : CHIBI_DIRECTION_MARTIAN_ART_ASSETS_V7.flatMap((asset) => {
          if (!asset.subject.startsWith("UNIT:MARTIAN:")) return [];
          const role = asset.subject.slice("UNIT:MARTIAN:".length);
          const url = before[role as UnitRoleIdV7];
          return [
            {
              ...asset,
              id: `${asset.id}-before-seat`,
              subject: `UNIT:${beforeFaction}:${role}` as ArtSubjectV7,
              ...(url === undefined ? {} : { url }),
            },
          ];
        });
  return [...live, ...martian, ...earlier];
}

export interface MartianSceneV7 {
  readonly view: PlayerViewV7;
  readonly capitalAt: CoordV7;
  /** MOVE commands that make the scene's ready units draw as ready. */
  readonly commands: readonly CommandV7[];
}

export function martianSceneViewV7(
  live: PlayerViewV7,
  kind: MartianSceneKindV7,
): MartianSceneV7 {
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
    seating.faction === "MARTIAN"
      ? spec.martian
      : seating.faction === "MARTIAN_BEFORE"
        ? (spec.before ?? spec.martian)
        : seating.faction;
  const players = spec.seats.map((seating, index) => ({
    ...viewer,
    id: (index === 0 ? viewerId : firstFreeId + index) as PlayerId,
    seat: index,
    color: seating.color,
    faction: faction(seating),
    controller: index === 0 ? viewer.controller : ("AI" as const),
  }));
  // A Thrall's owner: a shadow player with its seat's colour and the
  // Thrall stand-in's faction. It is not in the turn order of the match.
  const shadows = spec.seats.map((seating, index) => ({
    ...viewer,
    id: (firstFreeId + 10 + index) as PlayerId,
    seat: index,
    color: seating.color,
    faction: spec.thrall ?? spec.martian,
    controller: "AI" as const,
  }));
  const playerId = (seat: Seat): PlayerId =>
    players[SEATS.indexOf(seat)]?.id ?? viewerId;
  const shadowId = (seat: Seat): PlayerId =>
    shadows[SEATS.indexOf(seat)]?.id ?? viewerId;
  const cityId = (seat: Seat, at: CoordV7): CityId =>
    (Number(liveCapital.id) +
      500 +
      SEATS.indexOf(seat) * 100 +
      at.y * 10 +
      at.x) as CityId;
  // Each territory cell belongs to the city of its seat in the same row.
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
        ownerId: cell.unit.thrall
          ? shadowId(cell.unit.seat)
          : playerId(cell.unit.seat),
        role: cell.unit.role,
        // A machine over water is drawn as the machine itself, never as a
        // transport (RULESET_7_MARTIANS.md section 13.1).
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
  const first = spec.seats[0];
  return {
    commands,
    capitalAt: { x: origin.x + CAPITAL.x, y: origin.y + CAPITAL.y },
    view: {
      ...live,
      viewer: {
        ...live.viewer,
        faction: first === undefined ? spec.martian : faction(first),
      },
      players: [...players, ...(spec.thrall === null ? [] : shadows)],
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

export interface MartianSceneOptionsV7 {
  readonly kind: MartianSceneKindV7;
  /** ALIENS: the "before" Grunt, Ray Gunner and Shield Projector by role. */
  readonly before?: Readonly<Partial<Record<UnitRoleIdV7, string>>>;
}

/** Mounts a full-screen CHIBI board host over the page showing the scene. */
export function showMartianSceneV7(
  live: PlayerViewV7,
  options: MartianSceneOptionsV7,
): { readonly host: CanvasBoardHostV7; readonly canvas: HTMLCanvasElement } {
  document
    .querySelectorAll("[data-chibi-review-scene]")
    .forEach((node) => node.remove());
  // The UI bead copies these anchors into DIRECTION_FLAG_ANCHORS_V7; until
  // then the review page adds them to its own copy of the table.
  Object.assign(
    DIRECTION_FLAG_ANCHORS_V7 as Record<string, unknown>,
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
  const scene = martianSceneViewV7(live, options.kind);
  const look = liveBoardLookV7("CHIBI");
  const art = buildChibiArtRegistryV7(
    martianSceneArtV7(options.kind, options.before),
  );
  if (art.problems.length > 0) throw new Error(art.problems.join("; "));
  host.update({
    matchInstanceId: `martian-direction-${options.kind}`,
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
