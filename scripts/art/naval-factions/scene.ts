/**
 * Review scenes of the faction-styled naval art (bead pulp_wars-w5j.2,
 * docs/art/NAVAL_FACTIONS.md). Loaded in the browser through the Vite dev
 * server by scripts/art/chibi-naval-faction-review.ts and drawn by the real
 * CanvasBoardHostV7 with the CHIBI art set and the live look, **minus the
 * base plates and rings** (`unit.base: "NONE"`): bead pulp_wars-w5j.3
 * removes them, and the ships must carry their owner's faction without
 * them. Nothing here is part of the game build.
 *
 * **Stand-ins.** The naval art is not registered under any subject yet
 * (the ship subjects are shared by every faction until w5j.3 wires the
 * faction art in), so each faction's Patrol Boat, Battleship and embarked
 * transport are registered under three of that faction's own land
 * subjects: the Patrol Boat as its FIGHTER, the Battleship as its GUARD and
 * the transport as its MARKSMAN (`UNIT:<ROLE>` for the Humans,
 * `UNIT:<FACTION>:<ROLE>` for the others). A scene unit of that role, in
 * land form on a water cell, is drawn with the ship's raster, its own
 * canvas and anchor. Those three land subjects are left out of the
 * scene's registry, and nothing else changes: cities, pennants, borders and
 * the board host are the game's own.
 *
 * - COAST: six players, one per faction (Human, Undead, Goblin, Dinosaur,
 *   Martian, Ice Folk), each with a coastal City 2 on Grass and its three
 *   naval sprites on Shallow Water in its own territory and on Deep Water
 *   beyond it.
 * - MIXED: a sea of Shallow and Deep Water with the six factions' ships
 *   mixed together, two coastal cities, so the factions are told apart ship
 *   by ship.
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
import { CHIBI_DIRECTION_ICE_FOLK_ART_ASSETS_V7 } from "../../../src/assets/chibi-direction-ice-folk-art-manifest";
import { CHIBI_DIRECTION_MARTIAN_ART_ASSETS_V7 } from "../../../src/assets/chibi-direction-martian-art-manifest";
import { CHIBI_DIRECTION_UNDEAD_ART_ASSETS_V7 } from "../../../src/assets/chibi-direction-undead-art-manifest";
import {
  CHIBI_NAVAL_FACTION_ART_ASSETS_V7,
  type NavalArtRoleV7,
} from "../../../src/assets/chibi-naval-faction-art-manifest";
import { CanvasBoardHostV7 } from "../../../src/render/canvas/board-host-v7";
import { liveBoardLookV7 } from "../../../src/render/canvas/live-board-look-v7";

type Tile = PlayerViewV7["board"]["tiles"][number];

export type NavalSceneKindV7 = "COAST" | "MIXED";

/** The six factions in review order, one seat each. */
export const NAVAL_SCENE_FACTIONS_V7: readonly FactionIdV7[] = [
  "ORIGINAL",
  "UNDEAD",
  "GOBLIN",
  "DINOSAUR",
  "MARTIAN",
  "ICE_FOLK",
];
const COLOURS: readonly PlayerColorV7[] = [
  "CORAL",
  "TEAL",
  "GOLD",
  "VIOLET",
  "TEAL",
  "CORAL",
];

/** The land role whose subject carries each naval sprite in the scenes. */
export const NAVAL_STAND_IN_ROLE_V7: Readonly<
  Record<NavalArtRoleV7, UnitRoleIdV7>
> = {
  PATROL_BOAT: "FIGHTER",
  BATTLESHIP: "GUARD",
  EMBARKED_TRANSPORT: "MARKSMAN",
};
const ROLE_LETTER: Readonly<Record<string, NavalArtRoleV7>> = {
  P: "PATROL_BOAT",
  B: "BATTLESHIP",
  T: "EMBARKED_TRANSPORT",
};

function landSubject(faction: FactionIdV7, role: UnitRoleIdV7): ArtSubjectV7 {
  return (
    faction === "ORIGINAL" ? `UNIT:${role}` : `UNIT:${faction}:${role}`
  ) as ArtSubjectV7;
}

const TERRAIN: Readonly<Record<string, TerrainIdV7>> = {
  g: "GRASS",
  s: "SHALLOW_WATER",
  d: "DEEP_WATER",
};

/**
 * One cell: `<terrain><territory seat 0-5 or ->` then `/`-separated items:
 * `city<level>` (a city of the territory's seat) or a ship
 * `<P|B|T>:<seat>` (Patrol Boat, Battleship, transport).
 */
function coastLayout(): string[][] {
  return NAVAL_SCENE_FACTIONS_V7.map((_, seat) => [
    `g${seat}/city2`,
    `s${seat}/P:${seat}`,
    `s${seat}/B:${seat}`,
    `s${seat}/T:${seat}`,
    `d-/P:${seat}`,
    `d-/B:${seat}`,
    `d-/T:${seat}`,
  ]);
}

function mixedLayout(): string[][] {
  const rows: string[][] = [];
  for (let y = 0; y < 7; y += 1) {
    const row: string[] = [];
    for (let x = 0; x < 7; x += 1) {
      if (x === 0 && (y === 1 || y === 5)) {
        row.push(`g${y === 1 ? 0 : 4}/city${y === 1 ? 3 : 2}`);
        continue;
      }
      if (x === 0) {
        row.push(`g${y < 3 ? 0 : 4}`);
        continue;
      }
      const water = (x + y) % 3 === 0 || y >= 4 ? "d" : "s";
      const seat = (x + 2 * y) % 6;
      const role = "PBT"[(x + y) % 3] ?? "P";
      row.push(`${water}-/${role}:${seat}`);
    }
    rows.push(row);
  }
  return rows;
}

const CAPITAL: CoordV7 = { x: 3, y: 3 };

interface ParsedCell {
  readonly terrain: TerrainIdV7;
  readonly seat: number | null;
  readonly city: number | null;
  readonly ship: {
    readonly role: NavalArtRoleV7;
    readonly seat: number;
  } | null;
}

function parse(cell: string): ParsedCell {
  const [head = "g-", ...items] = cell.split("/");
  const terrain = TERRAIN[head[0] ?? "g"] ?? "GRASS";
  const seat = head[1] === "-" ? null : Number.parseInt(head.slice(1), 10);
  let city: number | null = null;
  let ship: ParsedCell["ship"] = null;
  for (const item of items) {
    if (item.startsWith("city")) city = Number.parseInt(item.slice(4), 10);
    else {
      const [letter = "", owner = ""] = item.split(":");
      const role = ROLE_LETTER[letter];
      if (role === undefined) throw new Error(`unknown scene item ${item}`);
      ship = { role, seat: Number.parseInt(owner, 10) };
    }
  }
  return { terrain, seat, city, ship };
}

/**
 * The scene's direction art: the game's production art, minus the three
 * land subjects of each faction that carry its naval sprites, plus the
 * naval sprites under those subjects.
 */
export function navalSceneArtV7(): readonly ChibiArtAssetV7[] {
  const carriers = new Set<string>();
  const naval: ChibiArtAssetV7[] = [];
  for (const faction of NAVAL_SCENE_FACTIONS_V7)
    for (const [role, standIn] of Object.entries(NAVAL_STAND_IN_ROLE_V7)) {
      const subject = landSubject(faction, standIn);
      carriers.add(subject);
      const asset = CHIBI_NAVAL_FACTION_ART_ASSETS_V7.find(
        (entry) =>
          entry.faction === faction &&
          entry.role === role &&
          entry.kind === "UNIT",
      );
      if (asset === undefined)
        throw new Error(`no naval art for ${faction} ${role}`);
      naval.push({ ...asset.asset, subject });
    }
  const live = [
    ...CHIBI_DIRECTION_ART_ASSETS_V7,
    ...CHIBI_DIRECTION_GOBLIN_ART_ASSETS_V7,
    ...CHIBI_DIRECTION_UNDEAD_ART_ASSETS_V7,
    ...CHIBI_DIRECTION_DINOSAUR_ART_ASSETS_V7,
    ...CHIBI_DIRECTION_MARTIAN_ART_ASSETS_V7,
    ...CHIBI_DIRECTION_ICE_FOLK_ART_ASSETS_V7,
  ].filter((asset) => !carriers.has(asset.subject));
  return [...live, ...naval];
}

export function navalSceneViewV7(
  live: PlayerViewV7,
  kind: NavalSceneKindV7,
): { readonly view: PlayerViewV7; readonly capitalAt: CoordV7 } {
  const layout = kind === "COAST" ? coastLayout() : mixedLayout();
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
  const players = NAVAL_SCENE_FACTIONS_V7.map((faction, index) => ({
    ...viewer,
    id: (index === 0 ? viewerId : firstFreeId + index) as PlayerId,
    seat: index,
    color: COLOURS[index] ?? "CORAL",
    faction,
    controller: index === 0 ? viewer.controller : ("AI" as const),
  }));
  const playerId = (seat: number): PlayerId => players[seat]?.id ?? viewerId;
  const cityId = (seat: number, at: CoordV7): CityId =>
    (Number(liveCapital.id) + 500 + seat * 100 + at.y * 10 + at.x) as CityId;
  // Each territory cell belongs to the nearest city of its seat.
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
    // The fixed 16 x 16 Showcase board around the scene: open sea.
    return {
      at: tile.at,
      explored: true,
      biome: null,
      terrain: cell?.terrain ?? "DEEP_WATER",
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
      if (cell.ship === null) return;
      units.push({
        ...template,
        id: (9000 + y * columns + x) as typeof template.id,
        ownerId: playerId(cell.ship.seat),
        role: NAVAL_STAND_IN_ROLE_V7[cell.ship.role],
        // Land form, so the stand-in subject is asked for; the raster is
        // the ship's (see the module comment).
        form: "LAND",
        at,
        hp: template.maxHp,
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
 * Mounts a full-screen CHIBI board host over the page showing the scene,
 * in the live look with no base plates and no rings.
 */
export function showNavalSceneV7(
  live: PlayerViewV7,
  options: { readonly kind: NavalSceneKindV7 },
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
  const scene = navalSceneViewV7(live, options.kind);
  const look = liveBoardLookV7("CHIBI");
  const direction = look.visualDirection;
  if (direction === undefined)
    throw new Error("the live look has no direction");
  const art = buildChibiArtRegistryV7(navalSceneArtV7());
  if (art.problems.length > 0) throw new Error(art.problems.join("; "));
  host.update({
    matchInstanceId: `naval-factions-${options.kind}`,
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
    visualDirection: {
      ...direction,
      unit: { ...direction.unit, base: "NONE" },
    },
    visualDirectionArt: art.registry,
  });
  const canvas = container.querySelector("canvas.board-canvas-v7");
  if (!(canvas instanceof HTMLCanvasElement))
    throw new Error("the review scene has no board canvas");
  return { host, canvas };
}
