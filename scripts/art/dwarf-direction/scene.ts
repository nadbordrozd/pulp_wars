/**
 * Review scenes of the Steampunk Dwarf art (bead pulp_wars-78i.5,
 * docs/art/factions/DWARF.md). Loaded in the browser through the Vite dev
 * server by scripts/art/chibi-dwarf-direction-review.ts and drawn by the
 * real CanvasBoardHostV7 with the CHIBI art set and the live look exactly as
 * the game passes it (`liveBoardLookV7`): **no base plates** (retired by bead
 * pulp_wars-w5j.3; a faint neutral ground shadow instead), so the Dwarf
 * look alone must say who owns a unit.
 * Nothing here is part of the game build.
 *
 * **Stand-ins.** The Dwarves are not in the engine while this art is made
 * (pulp_wars-78i.3), so a Dwarf seat plays the Human faction and the Dwarf
 * rasters are registered under the Human subjects (`UNIT:<ROLE>`,
 * `CITY:<level>`); no Human unit or city appears in a scene. The two mounds
 * are a second seat of the Dwarf player's colour playing the Dinosaurs,
 * whose FIGHTER carries the Mole's mound and whose GUARD the rider's mound;
 * no Dinosaur appears in the scenes that show mounds. In the COAST scene the
 * Dwarf ships are the Dwarf seat's CAPTAIN (Patrol Boat), CATAPULT
 * (Battleship) and KNIGHT (transport), drawn in land form on water; the six
 * other fleets are real naval units (Patrol Boats and Battleships in naval
 * form, the transport an embarked Fighter) drawn from the live registry
 * under the subjects the game asks for, as in
 * scripts/art/naval-factions/scene.ts. The pennant anchors of the Dwarf
 * cities are added to DIRECTION_FLAG_ANCHORS_V7 in the page.
 *
 * The Gyrocopter stands in for the Human Raider, which is not a flyer, so
 * the board draws no flyer shadow under it; its gap is in the sprite.
 *
 * - MIXED: each row one role: the Dwarf unit beside the Goblin, Undead,
 *   Martian and Ice Folk unit of that role, on Grass, Forest, Mountain and
 *   Snow, with the two mounds, a Rift and the Dwarf City 3.
 * - TERRAIN: the Dwarf roster on Grass, Forest, Mountain, Snow over Grass
 *   and over Mountain, and beside a Rift; the mounds on each terrain; the
 *   three Dwarf cities.
 * - COAST: the Dwarf cities on the coast and the Dwarf ships on Shallow and
 *   Deep Water beside the six other fleets.
 */
import type {
  CityId,
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
import { CHIBI_DIRECTION_DINOSAUR_ART_ASSETS_V7 } from "../../../src/assets/chibi-direction-dinosaur-art-manifest";
import {
  CHIBI_DIRECTION_DWARF_ART_ASSETS_V7,
  CHIBI_DIRECTION_DWARF_NAVAL_ART_ASSETS_V7,
  DWARF_FLAG_ANCHORS_V7,
} from "../../../src/assets/chibi-direction-dwarf-art-manifest";
import { CHIBI_DIRECTION_ICE_FOLK_ART_ASSETS_V7 } from "../../../src/assets/chibi-direction-ice-folk-art-manifest";
import { CHIBI_DIRECTION_MARTIAN_ART_ASSETS_V7 } from "../../../src/assets/chibi-direction-martian-art-manifest";
import { CHIBI_DIRECTION_UNDEAD_ART_ASSETS_V7 } from "../../../src/assets/chibi-direction-undead-art-manifest";
import { CanvasBoardHostV7 } from "../../../src/render/canvas/board-host-v7";
import { liveBoardLookV7 } from "../../../src/render/canvas/live-board-look-v7";
import { CHIBI_NAVAL_FACTION_ART_ASSETS_V7 } from "../../../src/assets/chibi-naval-faction-art-manifest";
import { DIRECTION_FLAG_ANCHORS_V7 } from "../../../src/render/canvas/visual-direction-v7";

type Tile = PlayerViewV7["board"]["tiles"][number];

export type DwarfSceneKindV7 = "MIXED" | "TERRAIN" | "COAST";

interface Seating {
  readonly faction: FactionIdV7;
  readonly color: PlayerColorV7;
}

interface SceneSpec {
  readonly seats: readonly Seating[];
  readonly layout: readonly (readonly string[])[];
  readonly art: () => readonly ChibiArtAssetV7[];
}

/**
 * Terrain letters: g Grass, f Forest, m Mountain, s Shallow Water, d Deep
 * Water, r Rift, w Snow over Grass, y Snow over Forest, x Snow over
 * Mountain.
 */
const TERRAIN: Readonly<
  Record<string, { readonly terrain: TerrainIdV7; readonly snow: boolean }>
> = {
  g: { terrain: "GRASS", snow: false },
  f: { terrain: "FOREST", snow: false },
  m: { terrain: "MOUNTAIN", snow: false },
  s: { terrain: "SHALLOW_WATER", snow: false },
  d: { terrain: "DEEP_WATER", snow: false },
  r: { terrain: "RIFT", snow: false },
  w: { terrain: "GRASS", snow: true },
  y: { terrain: "FOREST", snow: true },
  x: { terrain: "MOUNTAIN", snow: true },
};

/**
 * Unit letters: the eight land roles in land form; P, B and T a real Patrol
 * Boat, Battleship (naval form) and transport (an embarked Fighter).
 */
const ROLE: Readonly<
  Record<
    string,
    {
      readonly role: UnitRoleIdV7;
      readonly form: "LAND" | "NAVAL" | "EMBARKED";
    }
  >
> = {
  F: { role: "FIGHTER", form: "LAND" },
  R: { role: "RAIDER", form: "LAND" },
  M: { role: "MARKSMAN", form: "LAND" },
  G: { role: "GUARD", form: "LAND" },
  C: { role: "CAPTAIN", form: "LAND" },
  A: { role: "CATAPULT", form: "LAND" },
  K: { role: "KNIGHT", form: "LAND" },
  J: { role: "JUGGERNAUT", form: "LAND" },
  P: { role: "PATROL_BOAT", form: "NAVAL" },
  B: { role: "BATTLESHIP", form: "NAVAL" },
  T: { role: "FIGHTER", form: "EMBARKED" },
};

const DWARF_ROLE_ID: Readonly<Record<string, string>> = {
  FIGHTER: "hammerer",
  RAIDER: "gyrocopter",
  MARKSMAN: "clockwork-gunner",
  GUARD: "steam-mole",
  CAPTAIN: "engineer",
  CATAPULT: "steam-cannon",
  KNIGHT: "steam-tank",
  JUGGERNAUT: "brass-titan",
};

const LIVE: readonly ChibiArtAssetV7[] = [
  ...CHIBI_DIRECTION_ART_ASSETS_V7,
  ...CHIBI_DIRECTION_GOBLIN_ART_ASSETS_V7,
  ...CHIBI_DIRECTION_UNDEAD_ART_ASSETS_V7,
  ...CHIBI_DIRECTION_DINOSAUR_ART_ASSETS_V7,
  ...CHIBI_DIRECTION_MARTIAN_ART_ASSETS_V7,
  ...CHIBI_DIRECTION_ICE_FOLK_ART_ASSETS_V7,
  // Every faction's naval art, live since bead pulp_wars-w5j.3.
  ...CHIBI_NAVAL_FACTION_ART_ASSETS_V7.map((entry) => entry.asset),
];

function dwarfAsset(id: string): ChibiArtAssetV7 {
  const asset = CHIBI_DIRECTION_DWARF_ART_ASSETS_V7.find(
    (entry) => entry.id === id,
  );
  if (asset === undefined) throw new Error(`no Dwarf asset ${id}`);
  return asset;
}

/** Live art with `overrides` registered under their stand-in subjects. */
function withOverrides(
  base: readonly ChibiArtAssetV7[],
  overrides: readonly (readonly [ArtSubjectV7, ChibiArtAssetV7])[],
): readonly ChibiArtAssetV7[] {
  const taken = new Set<string>(overrides.map(([subject]) => subject));
  return [
    ...base.filter((asset) => !taken.has(asset.subject)),
    ...overrides.map(([subject, asset]) => ({ ...asset, subject })),
  ];
}

/** The Dwarf land units and cities under the Human subjects, the mounds under the Dinosaur FIGHTER and GUARD. */
function landArt(): readonly ChibiArtAssetV7[] {
  return withOverrides(LIVE, [
    ...Object.entries(DWARF_ROLE_ID).map(
      ([role, id]) =>
        [
          `UNIT:${role}` as ArtSubjectV7,
          dwarfAsset(`chibi-direction-dwarf-${id}`),
        ] as const,
    ),
    ...[1, 2, 3].map(
      (level) =>
        [
          `CITY:${level}` as ArtSubjectV7,
          dwarfAsset(`chibi-direction-dwarf-city-${level}`),
        ] as const,
    ),
    ["UNIT:DINOSAUR:FIGHTER", dwarfAsset("chibi-direction-dwarf-mound")],
    ["UNIT:DINOSAUR:GUARD", dwarfAsset("chibi-direction-dwarf-mound-rider")],
  ]);
}

/** The live art (the six fleets included), plus the Dwarf ships and cities. */
function coastArt(): readonly ChibiArtAssetV7[] {
  const ship = (role: string): ChibiArtAssetV7 => {
    const entry = CHIBI_DIRECTION_DWARF_NAVAL_ART_ASSETS_V7.find(
      (candidate) => candidate.kind === "UNIT" && candidate.role === role,
    );
    if (entry === undefined) throw new Error(`no Dwarf ship ${role}`);
    return entry.asset as unknown as ChibiArtAssetV7;
  };
  return withOverrides(LIVE, [
    ["UNIT:CAPTAIN", ship("PATROL_BOAT")],
    ["UNIT:CATAPULT", ship("BATTLESHIP")],
    ["UNIT:KNIGHT", ship("EMBARKED_TRANSPORT")],
    ...[1, 2, 3].map(
      (level) =>
        [
          `CITY:${level}` as ArtSubjectV7,
          dwarfAsset(`chibi-direction-dwarf-city-${level}`),
        ] as const,
    ),
  ]);
}

/*
 * Seats: 0 the Dwarf player (Human stand-in), then the others. In MIXED and
 * TERRAIN the last seat is the mound stand-in (Dinosaur) in the Dwarf
 * player's colour: `F:<mound seat>` is the Mole's mound, `G:` the rider's.
 */
const MIXED: SceneSpec = {
  seats: [
    { faction: "ORIGINAL", color: "CORAL" },
    { faction: "GOBLIN", color: "TEAL" },
    { faction: "UNDEAD", color: "VIOLET" },
    { faction: "MARTIAN", color: "GOLD" },
    { faction: "ICE_FOLK", color: "TEAL" },
    { faction: "DINOSAUR", color: "CORAL" },
  ],
  layout: [
    ["g0/F:0", "g-/F:1", "g-/F:2", "g-/F:3", "g-/F:4", "g0/city3"],
    ["f0/R:0", "f-/R:1", "f-/R:2", "g-/R:3", "f-/R:4", "g0/F:5"],
    ["m0/M:0", "m-/M:1", "m-/M:2", "m-/M:3", "m-/M:4", "g0/G:5"],
    ["w-/G:0", "w-/G:1", "w-/G:2", "w-/G:3", "w-/G:4", "r-/R:0"],
    ["g-/C:0", "g-/C:1", "g-/C:2", "g-/C:3", "g-/C:4", "r-"],
    ["g-/A:0", "g-/A:1", "g-/A:2", "g-/A:3", "g-/A:4", "r-"],
    ["x-/K:0", "x-/K:1", "x-/K:2", "x-/K:3", "x-/K:4", "g-/F:5:60"],
    ["g-/J:0", "g-/J:1", "g-/J:2", "g-/J:3", "g-/J:4", "g-/G:5"],
  ],
  art: landArt,
};

const TERRAIN_SCENE: SceneSpec = {
  seats: [
    { faction: "ORIGINAL", color: "TEAL" },
    { faction: "DINOSAUR", color: "TEAL" },
    // The board draws Snow only in a match with an Ice Folk seat; this one
    // has no units.
    { faction: "ICE_FOLK", color: "VIOLET" },
  ],
  layout: [
    [
      "g0/F:0",
      "g0/R:0",
      "g0/M:0",
      "g0/G:0",
      "g0/C:0",
      "g0/A:0",
      "g0/K:0",
      "g0/J:0",
      "g0/F:1",
    ],
    [
      "f0/F:0",
      "f0/R:0",
      "f0/M:0",
      "f0/G:0",
      "f0/C:0",
      "f0/A:0",
      "f0/K:0",
      "f0/J:0",
      "f0/F:1",
    ],
    [
      "m0/F:0",
      "m0/R:0",
      "m0/M:0",
      "m0/G:0",
      "m0/C:0",
      "m0/A:0",
      "m0/K:0",
      "m0/J:0",
      "m0/G:1",
    ],
    [
      "w0/F:0",
      "w0/R:0",
      "w0/M:0",
      "w0/G:0",
      "w0/C:0",
      "w0/A:0",
      "w0/K:0",
      "w0/J:0",
      "w0/F:1",
    ],
    [
      "x0/F:0",
      "y0/R:0",
      "x0/M:0",
      "y0/G:0",
      "x0/C:0",
      "y0/A:0",
      "x0/K:0",
      "y0/J:0",
      "x0/G:1",
    ],
    [
      "g-/F:0",
      "r-/R:0",
      "r-",
      "r-",
      "g-/G:0",
      "g-/F:1",
      "g0/city1",
      "g0/city2",
      "g0/city3",
    ],
  ],
  art: landArt,
};

/*
 * COAST: the Dwarf ships (the Dwarf seat's CAPTAIN, CATAPULT and KNIGHT in
 * land form on water) beside the six live fleets (real Patrol Boats,
 * Battleships and embarked Fighters, `P`, `B`, `T`) and the Dwarf cities.
 */
const COAST: SceneSpec = {
  seats: [
    { faction: "ORIGINAL", color: "GOLD" },
    { faction: "ORIGINAL", color: "CORAL" },
    { faction: "UNDEAD", color: "TEAL" },
    { faction: "GOBLIN", color: "GOLD" },
    { faction: "DINOSAUR", color: "VIOLET" },
    { faction: "MARTIAN", color: "TEAL" },
    { faction: "ICE_FOLK", color: "CORAL" },
  ],
  layout: [
    ["g0/city3", "s0/C:0", "s0/A:0", "s0/K:0", "d-/C:0", "d-/A:0", "d-/K:0"],
    ["g0/city2", "s-/P:1", "s-/B:1", "s-/T:1", "d-/P:1", "d-/B:1", "d-/T:1"],
    ["g0/city1", "s-/P:2", "s-/B:2", "s-/T:2", "d-/P:2", "d-/B:2", "d-/T:2"],
    ["g0", "s-/P:3", "s-/B:3", "s-/T:3", "d-/P:3", "d-/B:3", "d-/T:3"],
    ["g-", "s-/P:4", "s-/B:4", "s-/T:4", "d-/P:4", "d-/B:4", "d-/T:4"],
    ["g-", "s-/P:5", "s-/B:5", "s-/T:5", "d-/P:5", "d-/B:5", "d-/T:5"],
    ["g-", "s-/P:6", "s-/B:6", "s-/T:6", "d-/P:6", "d-/B:6", "d-/T:6"],
    ["s-/C:0", "s-/A:0", "d-/K:0", "s-/P:3", "d-/B:2", "s-/T:6", "d-/P:5"],
  ],
  art: coastArt,
};

export const DWARF_SCENES_V7: Readonly<Record<DwarfSceneKindV7, SceneSpec>> = {
  MIXED,
  TERRAIN: TERRAIN_SCENE,
  COAST,
};

interface ParsedCell {
  readonly terrain: TerrainIdV7;
  readonly snow: boolean;
  readonly seat: number | null;
  readonly city: number | null;
  readonly unit: {
    readonly role: UnitRoleIdV7;
    readonly form: "LAND" | "NAVAL" | "EMBARKED";
    readonly seat: number;
    readonly hp: number;
  } | null;
}

function parse(cell: string): ParsedCell {
  const [head = "g-", ...items] = cell.split("/");
  const ground = TERRAIN[head[0] ?? "g"] ?? TERRAIN.g;
  if (ground === undefined) throw new Error(`bad terrain ${cell}`);
  const seat = head[1] === "-" ? null : Number.parseInt(head.slice(1), 10);
  let city: number | null = null;
  let unit: ParsedCell["unit"] = null;
  for (const item of items) {
    if (item.startsWith("city")) city = Number.parseInt(item.slice(4), 10);
    else {
      const [letter = "", owner = "", hp = "100"] = item.split(":");
      const kind = ROLE[letter];
      if (kind === undefined) throw new Error(`unknown scene item ${item}`);
      unit = {
        ...kind,
        seat: Number.parseInt(owner, 10),
        hp: Number.parseInt(hp, 10),
      };
    }
  }
  return { ...ground, seat, city, unit };
}

const CAPITAL: CoordV7 = { x: 3, y: 3 };

export function dwarfSceneViewV7(
  live: PlayerViewV7,
  kind: DwarfSceneKindV7,
): { readonly view: PlayerViewV7; readonly capitalAt: CoordV7 } {
  const spec = DWARF_SCENES_V7[kind];
  const layout = spec.layout;
  const rows = layout.length;
  const columns = Math.max(...layout.map((row) => row.length));
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
  const players = spec.seats.map((seating, index) => ({
    ...viewer,
    id: (index === 0 ? viewerId : firstFreeId + index) as PlayerId,
    seat: index,
    color: seating.color,
    faction: seating.faction,
    controller: index === 0 ? viewer.controller : ("AI" as const),
  }));
  const playerId = (seat: number): PlayerId => players[seat]?.id ?? viewerId;
  const cityId = (seat: number, at: CoordV7): CityId =>
    (Number(liveCapital.id) + 500 + seat * 100 + at.y * 10 + at.x) as CityId;
  const cityCells: { seat: number; at: CoordV7 }[] = [];
  layout.forEach((row, y) =>
    row.forEach((text, x) => {
      const cell = parse(text);
      if (cell.city !== null && cell.seat !== null)
        cityCells.push({ seat: cell.seat, at: { x, y } });
    }),
  );
  const territoryCity = (seat: number, at: CoordV7): CityId => {
    const own = cityCells
      .filter((city) => city.seat === seat)
      .sort(
        (a, b) =>
          Math.abs(a.at.y - at.y) +
          Math.abs(a.at.x - at.x) -
          (Math.abs(b.at.y - at.y) + Math.abs(b.at.x - at.x)),
      )[0];
    return cityId(seat, own?.at ?? at);
  };
  const cellAt = (at: CoordV7): ParsedCell | undefined => {
    const cell = layout[at.y - origin.y]?.[at.x - origin.x];
    return cell === undefined ? undefined : parse(cell);
  };
  const tiles: Tile[] = live.board.tiles.map((tile) => {
    const cell = cellAt(tile.at);
    const local = { x: tile.at.x - origin.x, y: tile.at.y - origin.y };
    return {
      at: tile.at,
      explored: true,
      // The Snow overlay is drawn on land with a biome (ice-folk-board-plan-v7).
      biome:
        cell?.snow === true
          ? cell.terrain === "MOUNTAIN"
            ? "HIGHLANDS"
            : cell.terrain === "FOREST"
              ? "WOODLAND"
              : "PLAINS"
          : null,
      terrain: cell?.terrain ?? (kind === "COAST" ? "DEEP_WATER" : "GRASS"),
      resource: null,
      improvement: null,
      road: false,
      fieldDefense: false,
      fortificationLevel: null,
      site: cell?.city != null ? "CITY" : null,
      territoryCityId:
        cell == null || cell.seat === null
          ? null
          : territoryCity(cell.seat, local),
      territoryOwnerId:
        cell == null || cell.seat === null ? null : playerId(cell.seat),
      ...(cell?.snow === true ? { snow: true } : {}),
    };
  });
  const cities: PlayerViewV7["cities"][number][] = [];
  const units: PlayerViewV7["units"][number][] = [];
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
          level: cell.city,
          population: cell.city,
          isCapital: false,
        });
      if (cell.unit === null) return;
      units.push({
        ...template,
        id: (9000 + y * columns + x) as typeof template.id,
        ownerId: playerId(cell.unit.seat),
        role: cell.unit.role,
        form: cell.unit.form,
        at,
        hp: Math.max(1, Math.round((template.maxHp * cell.unit.hp) / 100)),
        activation: { ...template.activation, handled: true },
      });
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
  return {
    capitalAt: { x: origin.x + CAPITAL.x, y: origin.y + CAPITAL.y },
    view: {
      ...live,
      viewer: { ...live.viewer, faction: "ORIGINAL" },
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

/**
 * Mounts a full-screen CHIBI board host over the page showing the scene, in
 * the live look with no base plates.
 */
export function showDwarfSceneV7(
  live: PlayerViewV7,
  options: { readonly kind: DwarfSceneKindV7 },
): { readonly host: CanvasBoardHostV7; readonly canvas: HTMLCanvasElement } {
  document
    .querySelectorAll("[data-chibi-review-scene]")
    .forEach((node) => node.remove());
  // The UI bead copies these anchors into DIRECTION_FLAG_ANCHORS_V7; until
  // then the scene adds them in the page it runs in.
  Object.assign(
    DIRECTION_FLAG_ANCHORS_V7 as Record<string, unknown>,
    DWARF_FLAG_ANCHORS_V7,
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
  const scene = dwarfSceneViewV7(live, options.kind);
  const look = liveBoardLookV7("CHIBI");
  const direction = look.visualDirection;
  if (direction === undefined)
    throw new Error("the live look has no direction");
  // SHADOW (the live look since pulp_wars-w5j.3) is a faint neutral ground
  // shadow with no player colour; NONE draws nothing. Neither is a plate.
  if (direction.unit.base !== "SHADOW" && direction.unit.base !== "NONE")
    throw new Error("the live look draws base plates again");
  const art = buildChibiArtRegistryV7(DWARF_SCENES_V7[options.kind].art());
  if (art.problems.length > 0) throw new Error(art.problems.join("; "));
  host.update({
    matchInstanceId: `dwarf-direction-${options.kind}`,
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
    // The live look as the game passes it: no base plates since bead
    // pulp_wars-w5j.3 (checked above); only the art registry is the scene's.
    ...look,
    visualDirectionArt: art.registry,
  });
  const canvas = container.querySelector("canvas.board-canvas-v7");
  if (!(canvas instanceof HTMLCanvasElement))
    throw new Error("the review scene has no board canvas");
  return { host, canvas };
}
