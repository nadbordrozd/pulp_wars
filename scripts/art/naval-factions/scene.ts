/**
 * Review scenes of the faction-styled naval art (bead pulp_wars-w5j.2,
 * docs/art/NAVAL_FACTIONS.md), wired in by bead pulp_wars-w5j.3. Loaded in
 * the browser through the Vite dev server by
 * scripts/art/chibi-naval-faction-review.ts (and
 * scripts/art/faction-looks-review.ts) and drawn by the real
 * CanvasBoardHostV7 with the CHIBI art set and the live look exactly as the
 * game passes it (`liveBoardLookV7`): no base plates and no rings, every
 * faction's ships from the live registry under the subjects the game asks
 * for (`UNIT:<ROLE>` for the Humans, `UNIT:<FACTION>:<ROLE>` for the
 * others). Ships are naval-form Patrol Boats and Battleships, and the
 * transport is an embarked Fighter. Nothing here is part of the game build.
 *
 * The viewer is seat 0 (Human): its ships are ready (unmoved, with a Move
 * offered), so they carry the ready cue; the others are spent. Ships marked
 * damaged in a layout are at half their HP, so the HP bar shows.
 *
 * - COAST: six players, one per faction (Human, Undead, Goblin, Dinosaur,
 *   Martian, Ice Folk), each with a coastal City 2 on Grass and a Port in
 *   front of it with its Patrol Boat docked, its Battleship and transport on
 *   Shallow Water in its own territory, and its three naval sprites again on
 *   Deep Water beyond it (the Patrol Boat and Battleship there damaged).
 * - MIXED: a sea of Shallow and Deep Water with the six factions' ships
 *   mixed together, two coastal cities, so the factions are told apart ship
 *   by ship.
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
import type { NavalArtRoleV7 } from "../../../src/assets/chibi-naval-faction-art-manifest";
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

/** The role and form of a scene unit of each naval sprite. */
const NAVAL_UNIT_V7: Readonly<
  Record<
    NavalArtRoleV7,
    { readonly role: UnitRoleIdV7; readonly form: "NAVAL" | "EMBARKED" }
  >
> = {
  PATROL_BOAT: { role: "PATROL_BOAT", form: "NAVAL" },
  BATTLESHIP: { role: "BATTLESHIP", form: "NAVAL" },
  EMBARKED_TRANSPORT: { role: "FIGHTER", form: "EMBARKED" },
};
const ROLE_LETTER: Readonly<Record<string, NavalArtRoleV7>> = {
  P: "PATROL_BOAT",
  B: "BATTLESHIP",
  T: "EMBARKED_TRANSPORT",
};

const TERRAIN: Readonly<Record<string, TerrainIdV7>> = {
  g: "GRASS",
  s: "SHALLOW_WATER",
  d: "DEEP_WATER",
};

/**
 * One cell: `<terrain><territory seat 0-5 or ->` then `/`-separated items:
 * `city<level>` (a city of the territory's seat), `port` (a Port), or a
 * ship `<P|B|T>:<seat>` (Patrol Boat, Battleship, transport), damaged with
 * a trailing `*`.
 */
function coastLayout(): string[][] {
  return NAVAL_SCENE_FACTIONS_V7.map((_, seat) => [
    `g${seat}/city2`,
    `s${seat}/port/P:${seat}`,
    `s${seat}/B:${seat}`,
    `s${seat}/T:${seat}`,
    `d-/P:${seat}*`,
    `d-/B:${seat}*`,
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
      const damaged = (x * 3 + y) % 5 === 0 ? "*" : "";
      row.push(`${water}-/${role}:${seat}${damaged}`);
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
  readonly port: boolean;
  readonly ship: {
    readonly role: NavalArtRoleV7;
    readonly seat: number;
    readonly damaged: boolean;
  } | null;
}

function parse(cell: string): ParsedCell {
  const [head = "g-", ...items] = cell.split("/");
  const terrain = TERRAIN[head[0] ?? "g"] ?? "GRASS";
  const seat = head[1] === "-" ? null : Number.parseInt(head.slice(1), 10);
  let city: number | null = null;
  let port = false;
  let ship: ParsedCell["ship"] = null;
  for (const item of items) {
    if (item.startsWith("city")) city = Number.parseInt(item.slice(4), 10);
    else if (item === "port") port = true;
    else {
      const [letter = "", owner = ""] = item.split(":");
      const role = ROLE_LETTER[letter];
      if (role === undefined) throw new Error(`unknown scene item ${item}`);
      ship = {
        role,
        seat: Number.parseInt(owner, 10),
        damaged: owner.endsWith("*"),
      };
    }
  }
  return { terrain, seat, city, port, ship };
}

export function navalSceneViewV7(
  live: PlayerViewV7,
  kind: NavalSceneKindV7,
): {
  readonly view: PlayerViewV7;
  readonly capitalAt: CoordV7;
  readonly offeredCommands: readonly CommandV7[];
} {
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
      improvement: cell?.port === true ? "PORT" : null,
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
  const offeredCommands: CommandV7[] = [];
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
      const id = (9000 + y * columns + x) as typeof template.id;
      const ready = cell.ship.seat === 0;
      units.push({
        ...template,
        id,
        ownerId: playerId(cell.ship.seat),
        ...NAVAL_UNIT_V7[cell.ship.role],
        at,
        hp: cell.ship.damaged
          ? Math.max(1, Math.round(template.maxHp / 2))
          : template.maxHp,
        activation: { ...template.activation, handled: !ready },
      });
      // A ready ship: unmoved, with a Move offered (the plan's ready rule).
      if (ready) offeredCommands.push({ kind: "MOVE", unitId: id, path: [at] });
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
    offeredCommands,
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
 * in the live look the game draws.
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
  host.update({
    matchInstanceId: `naval-factions-${options.kind}`,
    view: scene.view,
    offeredCommands: scene.offeredCommands,
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
    ...liveBoardLookV7("CHIBI"),
  });
  const canvas = container.querySelector("canvas.board-canvas-v7");
  if (!(canvas instanceof HTMLCanvasElement))
    throw new Error("the review scene has no board canvas");
  return { host, canvas };
}
