/**
 * Review scenes of the Undead production art in the new visual direction
 * (bead pulp_wars-3tq.12, docs/art/VISUAL_DIRECTION_2026-10.md, "Undead
 * production"). Loaded in the browser through the Vite dev server by
 * scripts/art/chibi-undead-direction-review.ts and drawn by the real
 * CanvasBoardHostV7 with the CHIBI art set and the look the game draws by
 * default (`liveBoardLookV7`), or the Classic look, full screen over a
 * running match. Nothing here is part of the game build. The layout code
 * follows scripts/art/undead-direction/scene.ts.
 *
 * Every scene is 7 x 7 cells written around the viewer's capital (3,4); a
 * phone at zoom 1 shows about columns 1-5.
 *
 * - FOUR: four players who ALL play Undead (Coral, Teal, Gold, Violet): the
 *   eight units on Grass, Forest and Mountain, with the ready rim and the
 *   damaged HP bar, an Undead city of each tier with a garrison, Graves on a
 *   Road, and the Plague and Bitten chips.
 * - MIXED: an Undead player in Teal and one in Violet against a Human
 *   player in Coral and one in Gold, each Undead unit beside the Human unit
 *   of its role, with a city of each faction.
 * - MAGIC: an Undead viewer (Teal) against a Human (Coral): a Necromancer
 *   among Graves, a Banshee, a Lich and a Vampire among Human units. The
 *   review selects the Necromancer (the Raise Dead preview) or the Banshee
 *   (the Wail preview), or pins the ability cues mid-animation.
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
  UnitId,
  UnitRoleIdV7,
} from "../../../src/engine/index";
import { UNDEAD_BASELINE_V1_NODES } from "../../../src/engine/rules/ruleset-v7";
import { CanvasBoardHostV7 } from "../../../src/render/canvas/board-host-v7";
import { liveBoardLookV7 } from "../../../src/render/canvas/live-board-look-v7";
import type { SupportFeedbackV7 } from "../../../src/render/canvas/support-presentation-v7";

type Tile = PlayerViewV7["board"]["tiles"][number];
type Seat = "A" | "B" | "C" | "D";

export type UndeadDirectionSceneKindV7 = "FOUR" | "MIXED" | "MAGIC";

const SEATS: readonly Seat[] = ["A", "B", "C", "D"];

const SEATING: Readonly<
  Record<
    UndeadDirectionSceneKindV7,
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
    { faction: "ORIGINAL", color: "GOLD" },
  ],
  MAGIC: [
    { faction: "UNDEAD", color: "TEAL" },
    { faction: "ORIGINAL", color: "CORAL" },
    { faction: "UNDEAD", color: "VIOLET" },
    { faction: "ORIGINAL", color: "GOLD" },
  ],
};

const TERRAIN: Readonly<Record<string, TerrainIdV7>> = {
  g: "GRASS",
  f: "FOREST",
  m: "MOUNTAIN",
};

/**
 * The role letters, named for the Undead unit: S Skeleton (Fighter), G Ghoul
 * (Raider), B Banshee (Marksman), Z Zombie (Guard), N Necromancer (Captain),
 * L Lich (Catapult), V Vampire (Knight), A Abomination (Juggernaut).
 */
const ROLE: Readonly<Record<string, UnitRoleIdV7>> = {
  S: "FIGHTER",
  G: "RAIDER",
  B: "MARKSMAN",
  Z: "GUARD",
  N: "CAPTAIN",
  L: "CATAPULT",
  V: "KNIGHT",
  A: "JUGGERNAUT",
};

/**
 * One cell: `<terrain><territory seat or ->` then `/`-separated items:
 * `road`, `grave`, `city<level>` (a city of the territory's owner; `*`
 * marks the capital), or a unit `<role>:<seat>:<hp percent>[:flags]`
 * (flags: `r` ready, `p` Plagued, `b` Bitten).
 */
const LAYOUTS: Readonly<
  Record<UndeadDirectionSceneKindV7, readonly (readonly string[])[]>
> = {
  FOUR: [
    [
      "g-",
      "g-/S:A:100:r",
      "g-/G:B:100",
      "g-/B:C:100",
      "g-/Z:D:100:r",
      "g-/N:A:100",
      "g-/A:C:100",
    ],
    [
      "g-/G:D:100",
      "g-/L:B:100",
      "g-/V:C:100:r",
      "g-/A:D:100",
      "g-/S:D:50",
      "g-/Z:A:60",
      "g-",
    ],
    [
      "f-",
      "f-/N:C:100",
      "f-/B:D:100:r",
      "f-/S:B:100",
      "f-/V:A:100",
      "f-/G:D:60",
      "f-/Z:C:100",
    ],
    [
      "m-",
      "m-/S:C:100",
      "m-/L:D:100",
      "m-/Z:B:100:r",
      "m-/B:A:100",
      "m-/A:A:40",
      "m-/N:B:100",
    ],
    [
      "gD/B:D:100",
      "gD/city1/S:D:100",
      "gB/N:B:100:r",
      "gA/city3*/V:A:100",
      "gA/Z:A:100",
      "gC/city2/Z:C:100",
      "gC/N:C:100",
    ],
    [
      "g-",
      "g-/road/grave",
      "g-/road/grave/S:B:100",
      "g-/road/Z:C:100:p",
      "g-/road/N:D:100:r",
      "g-/road/S:A:100:b",
      "g-/road/G:C:100:p",
    ],
    [
      "g-",
      "g-/A:B:100:r",
      "g-/G:A:100:r",
      "g-/V:D:60",
      "g-/L:A:100:r",
      "g-/B:B:100:p",
      "g-",
    ],
  ],
  MIXED: [
    [
      "g-",
      "g-/S:A:100:r",
      "g-/S:B:100",
      "g-/G:C:100",
      "g-/G:D:100:r",
      "g-/S:C:60",
      "g-",
    ],
    [
      "g-",
      "g-/B:A:100",
      "g-/B:B:100:r",
      "g-/Z:C:60",
      "g-/Z:D:100",
      "g-/B:C:100",
      "g-",
    ],
    [
      "g-",
      "g-/N:A:100",
      "g-/N:B:100:r",
      "g-/V:C:50",
      "g-/V:D:100",
      "g-/N:C:100",
      "g-",
    ],
    [
      "f-",
      "f-/L:A:100",
      "f-/L:B:100",
      "f-/A:C:100:r",
      "f-/A:D:100",
      "f-/Z:A:100",
      "f-",
    ],
    [
      "gB",
      "gB/city2/S:B:100",
      "gB/G:A:100:r",
      "gA/city3*/Z:A:100",
      "gA/V:A:100",
      "gC/S:C:100",
      "gC/city1/Z:C:100",
    ],
    [
      "m-",
      "m-/S:A:100",
      "m-/S:D:100:r",
      "m-/N:C:100",
      "m-/Z:B:40",
      "m-/B:C:100",
      "m-",
    ],
    [
      "gD",
      "gD/city3/V:D:100",
      "g-/road/N:A:100:r",
      "g-/road/S:B:100:p",
      "g-/road/grave/Z:D:70:b",
      "g-/road/grave",
      "g-",
    ],
  ],
  MAGIC: [
    ["g-", "g-", "g-/grave", "g-/S:B:100", "g-", "g-/S:B:100", "g-"],
    [
      "g-",
      "g-/grave",
      "g-/N:A:100:r",
      "g-/grave",
      "g-/Z:B:100",
      "g-/B:A:100:r",
      "g-/S:D:100",
    ],
    ["g-", "g-/S:A:100", "g-/grave", "g-", "g-/S:D:60", "g-/Z:D:100", "g-"],
    // Empty cities of the other two tiers, so each tier is seen whole.
    ["f-", "gA/city1", "g-", "g-", "g-", "gC/city3", "f-"],
    [
      "g-",
      "g-/L:A:100",
      "g-/S:B:100",
      "gA/city2*",
      "g-/S:B:60",
      "g-/V:A:60",
      "g-",
    ],
    [
      "g-",
      "g-/Z:B:100",
      "g-/S:D:100",
      "g-",
      "g-/Z:C:100",
      "g-/S:D:100:p",
      "g-",
    ],
    [
      "g-",
      "g-/Z:A:100:b",
      "g-/grave",
      "g-/S:D:100:p",
      "g-",
      "g-/B:D:100:b",
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

export interface UndeadDirectionSceneV7 {
  readonly view: PlayerViewV7;
  readonly origin: CoordV7;
  readonly capitalAt: CoordV7;
  /** MOVE commands that make the scene's ready units draw as ready. */
  readonly commands: readonly CommandV7[];
  /** The unit standing on a cell of the layout, by column and row. */
  unitIdAt(x: number, y: number): UnitId;
}

export function undeadDirectionSceneViewV7(
  live: PlayerViewV7,
  kind: UndeadDirectionSceneKindV7,
): UndeadDirectionSceneV7 {
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
  // One city per cell, so a seat may own several.
  const cityId = (x: number, y: number): CityId =>
    (Number(liveCapital.id) + 500 + y * columns + x) as CityId;
  const seatCity = new Map<Seat, CityId>();
  layout.forEach((row, y) =>
    row.forEach((text, x) => {
      const cell = parse(text);
      if (cell.city !== null && cell.seat !== null && !seatCity.has(cell.seat))
        seatCity.set(cell.seat, cityId(x, y));
    }),
  );
  const cellAt = (at: CoordV7): ParsedCell | undefined => {
    const cell = layout[at.y - origin.y]?.[at.x - origin.x];
    return cell === undefined ? undefined : parse(cell);
  };
  const tiles: Tile[] = live.board.tiles.map((tile) => {
    const cell = cellAt(tile.at);
    const own =
      cell?.city != null
        ? cityId(tile.at.x - origin.x, tile.at.y - origin.y)
        : cell == null || cell.seat === null
          ? null
          : (seatCity.get(cell.seat) ?? null);
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
      territoryCityId: own,
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
  const unitIdAt = (x: number, y: number): UnitId =>
    (9000 + y * columns + x) as UnitId;
  layout.forEach((row, y) =>
    row.forEach((text, x) => {
      const cell = parse(text);
      const at = { x: origin.x + x, y: origin.y + y };
      if (cell.grave) graves.push(at);
      if (cell.city !== null && cell.seat !== null)
        cities.push({
          ...liveCapital,
          id: cityId(x, y),
          ownerId: playerId(cell.seat),
          at,
          level: cell.city.level,
          population: cell.city.level,
          isCapital: cell.city.capital,
        });
      if (cell.unit === null) return;
      const id = unitIdAt(x, y);
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
    origin,
    capitalAt: { x: origin.x + CAPITAL.x, y: origin.y + CAPITAL.y },
    unitIdAt,
    view: {
      ...live,
      viewer: {
        ...live.viewer,
        faction: SEATING[kind][0]?.faction ?? "UNDEAD",
        // Every technology, so the Necromancer's Raise Dead and the
        // Banshee's Wail are offered and the board draws their previews.
        researchedTechs: UNDEAD_BASELINE_V1_NODES.map((node) => node.id),
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

/** What the MAGIC scene shows on top of its units. */
export type UndeadDirectionMagicV7 =
  /** The Necromancer is selected: the Raise Dead targets on its Graves. */
  | "RAISE_PREVIEW"
  /** The Banshee is selected: the Wail radius and its targets. */
  | "WAIL_PREVIEW"
  /** Wail, Raise Dead, the Lich's splash and lifesteal pinned mid-animation. */
  | "CUES"
  /** Infect and Bitten risings, Plague and the cure sparkle, pinned. */
  | "CUES_B";

/** The MAGIC scene's cells (column, row). */
const NECROMANCER = { x: 2, y: 1 };
const BANSHEE = { x: 5, y: 1 };

function magicFeedback(
  scene: UndeadDirectionSceneV7,
  magic: "CUES" | "CUES_B",
  progress = 0.45,
): readonly SupportFeedbackV7[] {
  const at = (x: number, y: number): CoordV7 => ({
    x: scene.origin.x + x,
    y: scene.origin.y + y,
  });
  const cue = (
    effect: SupportFeedbackV7["effect"],
    actor: CoordV7,
    recipients: readonly CoordV7[],
  ): SupportFeedbackV7 => ({
    effect,
    actor: {
      unitId: scene.unitIdAt(actor.x, actor.y),
      at: at(actor.x, actor.y),
    },
    recipients: recipients.map((cell) => ({
      unitId: scene.unitIdAt(cell.x, cell.y),
      at: at(cell.x, cell.y),
    })),
    progress,
  });
  return magic === "CUES"
    ? [
        // The Necromancer raises the Graves beside it.
        cue("RAISE", NECROMANCER, [
          { x: 1, y: 1 },
          { x: 3, y: 1 },
          { x: 2, y: 2 },
        ]),
        // The Banshee shrieks at the Humans around her.
        cue("WAIL", BANSHEE, [
          { x: 5, y: 0 },
          { x: 6, y: 1 },
          { x: 4, y: 2 },
        ]),
        // The Lich's burst on a Fighter and a splashed Guard.
        cue("SPLASH", { x: 2, y: 4 }, [{ x: 1, y: 5 }]),
        // The Vampire drains the Fighter beside it.
        cue("LIFESTEAL", { x: 5, y: 4 }, [{ x: 4, y: 4 }]),
      ]
    : [
        // A bitten and an infected unit rise as Zombies.
        cue("BITTEN", { x: 1, y: 6 }, []),
        cue("INFECT", { x: 4, y: 5 }, []),
        // Start-turn Plague on two plagued units.
        cue("PLAGUE", { x: 5, y: 5 }, [{ x: 3, y: 6 }]),
        // Tend cures a bitten unit.
        cue("CURE", { x: 5, y: 6 }, []),
      ];
}

export interface UndeadDirectionSceneOptionsV7 {
  readonly kind: UndeadDirectionSceneKindV7;
  /** Draws the Classic look (the previous art) instead of the default. */
  readonly classic?: boolean;
  /** MAGIC only. */
  readonly magic?: UndeadDirectionMagicV7;
  /**
   * Selects the capital's cell: the review script finds that outline in the
   * capture to learn where the scene sits on screen.
   */
  readonly marker?: boolean;
}

/** Mounts a full-screen CHIBI board host over the page showing the scene. */
export function showUndeadDirectionSceneV7(
  live: PlayerViewV7,
  options: UndeadDirectionSceneOptionsV7,
): {
  readonly host: CanvasBoardHostV7;
  readonly canvas: HTMLCanvasElement;
} {
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
  const scene = undeadDirectionSceneViewV7(live, options.kind);
  const magic = options.kind === "MAGIC" ? options.magic : undefined;
  const selected =
    magic === "RAISE_PREVIEW"
      ? scene.unitIdAt(NECROMANCER.x, NECROMANCER.y)
      : magic === "WAIL_PREVIEW"
        ? scene.unitIdAt(BANSHEE.x, BANSHEE.y)
        : null;
  const ability: readonly CommandV7[] =
    selected === null
      ? []
      : [
          {
            kind: magic === "RAISE_PREVIEW" ? "RAISE_DEAD" : "WAIL",
            unitId: selected,
          } as unknown as CommandV7,
        ];
  host.update({
    matchInstanceId: `undead-direction-${options.kind}-${magic ?? ""}-${options.classic === true ? "classic" : "live"}`,
    view: scene.view,
    // The stand-in MOVE of the selected unit has no destination, so it is
    // left out: the board would try to draw it as a move target.
    offeredCommands: [
      ...scene.commands.filter(
        (command) => !("unitId" in command) || command.unitId !== selected,
      ),
      ...ability,
    ],
    interaction: {
      selection:
        selected !== null
          ? { kind: "UNIT", unitId: selected }
          : options.marker === true
            ? { kind: "TILE", at: scene.capitalAt }
            : null,
      selectedUnitId: selected,
      selectedAchievement: null,
    },
    interactive: false,
    motion: magic === "CUES" || magic === "CUES_B" ? "FULL" : "REDUCED",
    animationSpeed: "NORMAL",
    presentationPaused: true,
    highContrast: false,
    artSet: "CHIBI",
    ...liveBoardLookV7("CHIBI", options.classic === true),
  });
  if (magic === "CUES" || magic === "CUES_B")
    host.pinSupportFeedback(magicFeedback(scene, magic));
  const canvas = container.querySelector("canvas.board-canvas-v7");
  if (!(canvas instanceof HTMLCanvasElement))
    throw new Error("the review scene has no board canvas");
  return { host, canvas };
}
