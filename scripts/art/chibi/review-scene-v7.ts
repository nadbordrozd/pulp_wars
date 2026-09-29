/**
 * Synthetic in-game scenes for chibi batch reviews (beads pulp_wars-67q.7
 * and pulp_wars-67q.9).
 *
 * Loaded in the browser through the Vite dev server by
 * scripts/art/chibi-batch-review.ts: it takes the live Ruleset 7 player view,
 * rewrites a patch around the viewer's capital and draws it with the real
 * CanvasBoardHostV7 and ?art=chibi, full screen over the running game.
 * Nothing here is part of the game build. Two layouts:
 *
 * - SHOWCASE (9 x 7): every map subject (resources, improvements and Farm
 *   pairs, Mines, Ports, Roads with corner joins and under Forest, Mine and
 *   Mountain bodies, Field Defense and a fortified tile, Treasure) for two
 *   owners, split by column.
 * - ROSTER (9 x 5): built from a batch's unit and improvement subjects that
 *   the showcase lacks (batch 4 onwards): land pieces for the viewer and a
 *   rival, then water pieces (docks on Shallow Water, ships on Shallow Water
 *   for the viewer and Deep Water for the rival), a Fighter per owner beside
 *   the capital for scale. The rival is drawn as Undead, so the skull badge
 *   and the unit overlays are checked on every unit class. Undead subjects
 *   (`UNIT:UNDEAD:<ROLE>`, pulp_wars-vkq.12) are <ROLE> pieces: the viewer
 *   is Undead too, so both land rows show the Undead art, an extra Human
 *   seat owns the scale Fighter, and `GRAVE` places a bare Grave and one
 *   under the rival's Skeleton in the middle row.
 */
import type {
  CoordV7,
  ImprovementIdV7,
  PlayerViewV7,
  ResourceIdV7,
  TerrainIdV7,
  UnitRoleIdV7,
} from "../../../src/engine/index";
import { CanvasBoardHostV7 } from "../../../src/render/canvas/board-host-v7";

type Tile = PlayerViewV7["board"]["tiles"][number];

interface Cell {
  readonly terrain: TerrainIdV7;
  readonly resource?: ResourceIdV7;
  readonly improvement?: ImprovementIdV7;
  readonly road?: true;
  readonly fieldDefense?: true;
  readonly fortificationLevel?: number;
  readonly treasure?: true;
  readonly unit?: UnitRoleIdV7 | "EMBARKED_TRANSPORT";
  /**
   * Overrides the showcase's column rule (viewer left of the capital).
   * HUMAN is an extra Human seat added for Undead rosters (its cells lie in
   * the viewer's territory).
   */
  readonly owner?: "VIEWER" | "RIVAL" | "HUMAN";
  /** A Grave marker on this cell (Undead rosters). */
  readonly grave?: true;
}

type Layout = readonly (readonly Cell[])[];

const G = "GRASS";
const F = "FOREST";
const M = "MOUNTAIN";
const S = "SHALLOW_WATER";
const D = "DEEP_WATER";

/**
 * Rows top to bottom, columns left to right; the capital sits at column 4,
 * row 3. Columns 0..4 are the viewer's territory, 5..8 a rival's.
 */
const SHOWCASE: Layout = [
  [
    { terrain: S, resource: "FISH", improvement: "PORT" },
    { terrain: S, resource: "FISH" },
    { terrain: S, resource: "PEARLS" },
    { terrain: D },
    { terrain: D },
    { terrain: S, improvement: "PORT" },
    { terrain: S, resource: "FISH" },
    { terrain: S, resource: "PEARLS" },
    { terrain: D },
  ],
  [
    { terrain: G, resource: "FRUIT" },
    { terrain: G, unit: "FIGHTER" },
    { terrain: G, road: true },
    { terrain: G, road: true },
    { terrain: G, road: true },
    { terrain: F, resource: "GAME" },
    { terrain: F, improvement: "LUMBER_CAMP" },
    { terrain: M, resource: "ORE" },
    { terrain: M, resource: "ORE", improvement: "MINE" },
  ],
  [
    { terrain: G, resource: "FERTILE_GROUND" },
    {
      terrain: G,
      resource: "FERTILE_GROUND",
      improvement: "FARM",
    },
    { terrain: G, resource: "FERTILE_GROUND", improvement: "FARM" },
    { terrain: G, road: true },
    { terrain: G, improvement: "MONUMENT" },
    // Roads pass under Forest, Mine and Mountain bodies (pulp_wars-yyy).
    { terrain: F, road: true },
    { terrain: F, improvement: "LUMBER_CAMP", road: true },
    { terrain: M, resource: "ORE", improvement: "MINE", road: true },
    { terrain: M, road: true },
  ],
  [
    { terrain: G, treasure: true },
    { terrain: G, resource: "FERTILE_GROUND", improvement: "FARM" },
    { terrain: G, unit: "KNIGHT" },
    { terrain: G, road: true },
    { terrain: G },
    { terrain: G, road: true },
    { terrain: G, road: true },
    { terrain: G, fieldDefense: true, unit: "GUARD" },
    { terrain: G, resource: "FRUIT" },
  ],
  [
    { terrain: G, resource: "FERTILE_GROUND", improvement: "FARM" },
    { terrain: G, resource: "FERTILE_GROUND", improvement: "FARM" },
    { terrain: G },
    { terrain: G, road: true },
    { terrain: G, fieldDefense: true, road: true },
    { terrain: G, resource: "FERTILE_GROUND", improvement: "FARM" },
    { terrain: G, resource: "FERTILE_GROUND", improvement: "FARM" },
    { terrain: F, resource: "GAME", unit: "MARKSMAN" },
    { terrain: G, treasure: true },
  ],
  [
    { terrain: M, resource: "ORE" },
    { terrain: M, resource: "ORE", improvement: "MINE" },
    { terrain: F },
    { terrain: F, improvement: "LUMBER_CAMP" },
    { terrain: G, resource: "FERTILE_GROUND" },
    { terrain: S },
    { terrain: S, resource: "FISH", improvement: "PORT" },
    { terrain: D },
    { terrain: S, resource: "PEARLS" },
  ],
  [
    { terrain: G, improvement: "MONUMENT" },
    { terrain: G, fortificationLevel: 2 },
    { terrain: G, road: true },
    { terrain: G, road: true },
    { terrain: G },
    { terrain: G, resource: "FRUIT" },
    { terrain: M },
    { terrain: M, resource: "ORE", improvement: "MINE" },
    { terrain: G },
  ],
];

/** The showcase's capital cell: column 4, row 3. */
const SHOWCASE_CAPITAL = { x: 4, y: 3 } as const;

/** Every art subject the showcase already draws. */
const SHOWCASE_SUBJECTS: ReadonlySet<string> = new Set(
  SHOWCASE.flatMap((row) =>
    row.flatMap((cell) => [
      ...(cell.resource === undefined ? [] : [`RESOURCE:${cell.resource}`]),
      ...(cell.improvement === undefined
        ? []
        : [
            cell.improvement === "MINE"
              ? "TERRAIN:MINED_MOUNTAIN"
              : `IMPROVEMENT:${cell.improvement}`,
          ]),
      ...(cell.unit === undefined ? [] : [`UNIT:${cell.unit}`]),
      ...(cell.treasure === true ? ["TREASURE"] : []),
    ]),
  ),
);

/** Roster subjects that only ever stand on water. */
const WATER_SUBJECTS: ReadonlySet<string> = new Set([
  "IMPROVEMENT:PORT",
  "IMPROVEMENT:SHIPYARD",
  "UNIT:PATROL_BOAT",
  "UNIT:BATTLESHIP",
  "UNIT:EMBARKED_TRANSPORT",
]);

const ROSTER_COLUMNS = 9;
/** The roster's capital cell: the middle of row 2, between the Fighters. */
const ROSTER_CAPITAL = { x: 4, y: 2 } as const;

export interface ChibiReviewSceneLayoutV7 {
  readonly kind: "SHOWCASE" | "ROSTER";
  readonly layout: Layout;
  readonly capital: CoordV7;
  /** ROSTER only: the rival is drawn as Undead. */
  readonly undeadRival: boolean;
  /**
   * Undead rosters only: the viewer is Undead too, and an extra Human seat
   * owns a Fighter for scale.
   */
  readonly undeadViewer: boolean;
}

type Owner = "VIEWER" | "RIVAL";

/**
 * The unit role of a roster subject: `UNIT:UNDEAD:<ROLE>` is <ROLE> owned by
 * an Undead seat, `UNIT:<ROLE>` is <ROLE>.
 */
function subjectName(subject: string): string {
  return subject.startsWith("UNIT:UNDEAD:")
    ? subject.slice("UNIT:UNDEAD:".length)
    : subject.slice(subject.indexOf(":") + 1);
}

/** One roster row: the subjects left to right, empty ground around them. */
function rosterRow(
  subjects: readonly string[],
  owner: Owner,
  water: boolean,
): Cell[] {
  const empty: TerrainIdV7 = !water ? G : owner === "VIEWER" ? S : D;
  // Centred on the capital's column, so a phone (about five columns around
  // the capital) shows up to five subjects per row.
  const start = Math.max(
    0,
    Math.min(
      ROSTER_COLUMNS - subjects.length,
      ROSTER_CAPITAL.x - Math.floor(subjects.length / 2),
    ),
  );
  return Array.from({ length: ROSTER_COLUMNS }, (_, x): Cell => {
    const subject = subjects[x - start];
    if (subject === undefined) return { terrain: empty, owner };
    const name = subjectName(subject);
    // Docks always stand on Shallow Water; the rival's ships on Deep Water.
    return subject.startsWith("IMPROVEMENT:")
      ? {
          terrain: water ? S : G,
          owner,
          improvement: name as ImprovementIdV7,
        }
      : {
          terrain: empty,
          owner,
          unit: name as UnitRoleIdV7 | "EMBARKED_TRANSPORT",
        };
  });
}

/**
 * The layout for a batch's accepted subjects: the showcase when it already
 * draws every unit and improvement subject of the batch, otherwise a roster
 * of those subjects (up to 9 land and 9 water subjects).
 */
export function chibiReviewSceneLayoutV7(
  subjects: readonly string[],
): ChibiReviewSceneLayoutV7 {
  const roster = subjects.filter(
    (subject) =>
      (subject.startsWith("UNIT:") || subject.startsWith("IMPROVEMENT:")) &&
      !SHOWCASE_SUBJECTS.has(subject),
  );
  if (roster.length === 0)
    return {
      kind: "SHOWCASE",
      layout: SHOWCASE,
      capital: SHOWCASE_CAPITAL,
      undeadRival: false,
      undeadViewer: false,
    };
  const land = roster.filter((subject) => !WATER_SUBJECTS.has(subject));
  const water = roster.filter((subject) => WATER_SUBJECTS.has(subject));
  // Undead rosters (pulp_wars-vkq.12): both owners are Undead, so both land
  // rows show the Undead pieces; the middle row has a Human Fighter (an
  // extra Human seat) for scale and, when the batch has the Grave, a bare
  // Grave and one under the rival's Skeleton.
  const undead = roster.some((subject) => subject.startsWith("UNIT:UNDEAD:"));
  const graves = undead && subjects.includes("GRAVE");
  const middle = Array.from({ length: ROSTER_COLUMNS }, (_, x): Cell =>
    x === ROSTER_CAPITAL.x - 1
      ? { terrain: G, owner: undead ? "HUMAN" : "VIEWER", unit: "FIGHTER" }
      : x === ROSTER_CAPITAL.x + 1
        ? {
            terrain: G,
            owner: "RIVAL",
            unit: "FIGHTER",
            ...(graves ? { grave: true as const } : {}),
          }
        : graves && x === ROSTER_CAPITAL.x - 2
          ? { terrain: G, owner: "VIEWER", grave: true }
          : { terrain: G, owner: x <= ROSTER_CAPITAL.x ? "VIEWER" : "RIVAL" },
  );
  return {
    kind: "ROSTER",
    layout: [
      rosterRow(land, "VIEWER", false),
      rosterRow(land, "RIVAL", false),
      middle,
      rosterRow(water, "VIEWER", true),
      rosterRow(water, "RIVAL", true),
    ],
    capital: ROSTER_CAPITAL,
    undeadRival: true,
    undeadViewer: undead,
  };
}

function same(left: CoordV7, right: CoordV7): boolean {
  return left.x === right.x && left.y === right.y;
}

/**
 * The live view with a scene patch written around the capital: the showcase
 * by default, or the layout chosen for a batch's subjects.
 */
export function chibiReviewSceneViewV7(
  live: PlayerViewV7,
  scene: ChibiReviewSceneLayoutV7 = chibiReviewSceneLayoutV7([]),
): PlayerViewV7 {
  const { layout, capital: capitalCell } = scene;
  const viewerId = live.viewer.id;
  const capital =
    live.cities.find((city) => city.ownerId === viewerId && city.isCapital) ??
    live.cities[0];
  if (capital === undefined) throw new Error("the live view has no city");
  const rival = live.players.find((player) => player.id !== viewerId);
  if (rival === undefined) throw new Error("the live view has one player");
  const rows = layout.length;
  const columns = layout[0]?.length ?? 0;
  const origin = {
    x: Math.max(
      0,
      Math.min(live.board.width - columns, capital.at.x - capitalCell.x),
    ),
    y: Math.max(
      0,
      Math.min(live.board.height - rows, capital.at.y - capitalCell.y),
    ),
  };
  const capitalAt = {
    x: origin.x + capitalCell.x,
    y: origin.y + capitalCell.y,
  };
  // Any id other than the capital's: Farms pair only within one city.
  const rivalCityId = (capital.id + 1000) as typeof capital.id;
  const cellAt = (at: CoordV7): Cell | undefined =>
    layout[at.y - origin.y]?.[at.x - origin.x];
  // The showcase splits owners by column; roster cells name their owner.
  // The extra Human seat's cells lie in the viewer's territory.
  const viewerOwns = (cell: Cell, x: number): boolean =>
    cell.owner === undefined
      ? x <= capitalCell.x
      : cell.owner === "VIEWER" || cell.owner === "HUMAN";
  // Undead rosters: an extra Human seat, in a colour no seat uses, owns the
  // Fighter kept for scale.
  const usedColors = new Set(live.players.map((player) => player.color));
  const human = scene.undeadViewer
    ? {
        ...rival,
        id: (Math.max(...live.players.map((player) => player.id)) +
          1) as typeof rival.id,
        seat: live.players.length,
        color:
          (["GOLD", "VIOLET", "TEAL", "CORAL"] as const).find(
            (color) => !usedColors.has(color),
          ) ?? rival.color,
        faction: "ORIGINAL" as const,
      }
    : null;
  const tiles: Tile[] = live.board.tiles.map((tile) => {
    const cell = cellAt(tile.at);
    const viewerSide =
      cell !== undefined && viewerOwns(cell, tile.at.x - origin.x);
    return {
      at: tile.at,
      explored: true,
      biome: null,
      terrain: cell?.terrain ?? "GRASS",
      resource: cell?.resource ?? null,
      improvement: cell?.improvement ?? null,
      road: cell?.road ?? false,
      fieldDefense: cell?.fieldDefense ?? false,
      fortificationLevel: cell?.fortificationLevel ?? null,
      site: same(tile.at, capitalAt) ? "CAPITAL" : null,
      territoryCityId:
        cell === undefined ? null : viewerSide ? capital.id : rivalCityId,
      territoryOwnerId:
        cell === undefined ? null : viewerSide ? viewerId : rival.id,
    };
  });
  const template = live.units.find((unit) => unit.ownerId === viewerId);
  const units =
    template === undefined
      ? []
      : layout.flatMap((row, y) =>
          row.flatMap((cell, x) => {
            if (cell.unit === undefined) return [];
            const viewerUnit = viewerOwns(cell, x);
            const embarked = cell.unit === "EMBARKED_TRANSPORT";
            const naval =
              cell.unit === "PATROL_BOAT" || cell.unit === "BATTLESHIP";
            return [
              {
                ...template,
                id: (9000 + y * columns + x) as typeof template.id,
                ownerId:
                  cell.owner === "HUMAN" && human !== null
                    ? human.id
                    : viewerUnit
                      ? viewerId
                      : rival.id,
                // One embarked sprite serves every passenger role.
                role: embarked ? template.role : (cell.unit as UnitRoleIdV7),
                ...(scene.kind === "ROSTER"
                  ? {
                      form: embarked
                        ? ("EMBARKED" as const)
                        : naval
                          ? ("NAVAL" as const)
                          : ("LAND" as const),
                      // The rival's units show a part-filled HP bar.
                      hp: viewerUnit
                        ? template.maxHp
                        : Math.ceil(template.maxHp / 2),
                    }
                  : {}),
                at: { x: origin.x + x, y: origin.y + y },
              },
            ];
          }),
        );
  return {
    ...live,
    players: [
      ...(scene.undeadRival
        ? live.players.map((player) =>
            player.id === rival.id ||
            (scene.undeadViewer && player.id === viewerId)
              ? { ...player, faction: "UNDEAD" as const }
              : player,
          )
        : live.players),
      ...(human === null ? [] : [human]),
    ],
    board: { ...live.board, tiles, territoryBorders: [] },
    cities: [{ ...capital, at: capitalAt }],
    units,
    treasureChests: layout.flatMap((row, y) =>
      row.flatMap((cell, x) =>
        cell.treasure === true ? [{ x: origin.x + x, y: origin.y + y }] : [],
      ),
    ),
    // Sorted by (y, x) like the engine's view.
    graves: layout.flatMap((row, y) =>
      row.flatMap((cell, x) =>
        cell.grave === true ? [{ x: origin.x + x, y: origin.y + y }] : [],
      ),
    ),
  };
}

/**
 * Mounts a full-screen CHIBI board host over the page showing the scene for
 * a batch's subjects (the showcase when none are given).
 */
export function showChibiReviewSceneV7(
  live: PlayerViewV7,
  subjects: readonly string[] = [],
): {
  readonly host: CanvasBoardHostV7;
  readonly canvas: HTMLCanvasElement;
  readonly kind: ChibiReviewSceneLayoutV7["kind"];
} {
  const scene = chibiReviewSceneLayoutV7(subjects);
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
  host.update({
    matchInstanceId: "chibi-review-scene",
    view: chibiReviewSceneViewV7(live, scene),
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
  });
  const canvas = container.querySelector("canvas.board-canvas-v7");
  if (!(canvas instanceof HTMLCanvasElement))
    throw new Error("the review scene has no board canvas");
  return { host, canvas, kind: scene.kind };
}
