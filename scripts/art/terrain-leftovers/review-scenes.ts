/**
 * Game states for the review of the forest and mountain leftovers (bead
 * pulp_wars-2yc.41). Loaded in the browser through the Vite dev server by
 * scripts/art/look-switch-review.ts; nothing here is part of the game
 * build.
 *
 *   npx vite --host localhost --port 6597 --strictPort &
 *   CHROME_PATH=... SWITCH_GAME_URL=http://localhost:6597/ \
 *     npx tsx scripts/art/look-switch-review.ts \
 *     scripts/art/terrain-leftovers/review-scenes.ts <out-dir>
 *
 * `occupied<Faction>` is the border scene of the faction grass review (the
 * Human territory on the left six columns, the faction's on the right six)
 * as one wood, with the same things standing on Forest in both
 * territories: a Treasure, a Grave, a Field Defense, a Shrine, a Monument,
 * a Village, a Lumber Camp and a Windmill. `mines<Faction>` is the same
 * scene with a ridge of Mountains, some of them mined, in both.
 */
import type {
  CoordV7,
  FactionIdV7,
  GameStateV7,
  ImprovementIdV7,
} from "../../../src/engine/index";
import { borderScene } from "../faction-grass/review-scenes";
import type { LookSwitchShot } from "../look-switch-review";

/** The scene's window starts here (faction-grass/review-scenes.ts). */
const ORIGIN = { x: 2, y: 4 } as const;

/**
 * `T` Forest, `$` a Treasure, `g` a Grave, `d` a Field Defense, `s` a
 * Shrine, `m` a Monument, `V` a Village, `L` a Lumber Camp, `w` a
 * Windmill, all on Forest; `.` as the border scene has it.
 */
const OCCUPIED = [
  "TTTTTTTTTTTT",
  "T$TgTTT$TgTT",
  "TdTsTTTdTsTT",
  "............",
  "TmTVTTTmTVTT",
  "TLTwTTTLTwTT",
  "TTTTTTTTTTTT",
] as const;

/** `M` a Mountain, `X` a Mine on a Mountain with Ore, `.` as it was. */
const MINES = [
  "MMXMMMMMXMMM",
  "MXMM.MMXMM.M",
  ".X.......X..",
  "............",
  "..X.....X...",
  "MXM...MXM...",
  "MMM...MMM...",
] as const;

function overlaid(state: GameStateV7, overlay: readonly string[]): GameStateV7 {
  const code = (at: CoordV7): string =>
    overlay[at.y - ORIGIN.y]?.[at.x - ORIGIN.x] ?? ".";
  const improvements: Readonly<Record<string, ImprovementIdV7>> = {
    m: "MONUMENT",
    L: "LUMBER_CAMP",
    w: "WINDMILL",
    X: "MINE",
  };
  const tiles = state.board.tiles.map((tile) => {
    const mark = code(tile.at);
    if (mark === "." || tile.site === "CAPITAL") return tile;
    const mountain = mark === "M" || mark === "X";
    return {
      ...tile,
      terrain: mountain ? ("MOUNTAIN" as const) : ("FOREST" as const),
      resource: mark === "X" ? ("ORE" as const) : null,
      road: false,
      improvement: improvements[mark] ?? null,
      fieldDefense: mark === "d",
      site: mark === "V" ? ("VILLAGE" as const) : tile.site,
    };
  });
  const marked = (mark: string): CoordV7[] =>
    tiles.filter((tile) => code(tile.at) === mark).map((tile) => tile.at);
  const cleared = new Set(
    tiles
      .filter((tile) => code(tile.at) !== ".")
      .map((tile) => `${tile.at.x},${tile.at.y}`),
  );
  return {
    ...state,
    board: { ...state.board, tiles },
    units: state.units.filter(
      (unit) => !cleared.has(`${unit.at.x},${unit.at.y}`),
    ),
    treasureChests: marked("$"),
    graves: marked("g"),
    curiosities: marked("s").map((at) => ({ kind: "SHRINE" as const, at })),
  };
}

const occupied = (faction: FactionIdV7) => (): GameStateV7 =>
  overlaid(borderScene(faction), OCCUPIED);
const mines = (faction: FactionIdV7) => (): GameStateV7 =>
  overlaid(borderScene(faction), MINES);

export const occupiedUndead = occupied("UNDEAD");
export const occupiedGoblin = occupied("GOBLIN");
export const occupiedDinosaur = occupied("DINOSAUR");
export const occupiedMartian = occupied("MARTIAN");
export const occupiedIceFolk = occupied("ICE_FOLK");
export const occupiedDwarf = occupied("DWARF");
export const occupiedCandy = occupied("CANDY");
export const minesGoblin = mines("GOBLIN");
export const minesIceFolk = mines("ICE_FOLK");

export const SWITCH_PARAMETER = "faction-forests";

const CROP = [240, 200, 960, 590] as const;
const shot = (name: string, scene: string): LookSwitchShot => ({
  name,
  scene,
  zoomIn: 1,
  crop: CROP,
  zoom: [720, 240, 480, 330],
});

export const REVIEW_SHOTS: readonly LookSwitchShot[] = [
  shot("occupied-undead", "occupiedUndead"),
  shot("occupied-goblin", "occupiedGoblin"),
  shot("occupied-dinosaur", "occupiedDinosaur"),
  shot("occupied-martian", "occupiedMartian"),
  shot("occupied-ice-folk", "occupiedIceFolk"),
  shot("occupied-dwarf", "occupiedDwarf"),
  shot("occupied-candy", "occupiedCandy"),
  { ...shot("mines-goblin", "minesGoblin"), zoom: [240, 200, 480, 330] },
  { ...shot("mines-ice-folk", "minesIceFolk"), zoom: [240, 200, 480, 330] },
  // The tile dock of a selected cell: a Mountain and a Mine in each
  // territory, a Forest, and a Forest with a Treasure on it.
  ...(
    [
      ["mountain-human", "minesGoblin", [280, 260]],
      ["mountain-goblin", "minesGoblin", [760, 260]],
      ["mountain-ice-folk", "minesIceFolk", [760, 260]],
      ["mine-goblin", "minesGoblin", [920, 260]],
      ["forest-human", "occupiedGoblin", [280, 260]],
      ["forest-goblin", "occupiedGoblin", [760, 260]],
      ["forest-ice-folk", "occupiedIceFolk", [760, 260]],
      ["forest-candy", "occupiedCandy", [760, 260]],
      ["forest-undead", "occupiedUndead", [760, 260]],
      ["treasure-forest-goblin", "occupiedGoblin", [840, 340]],
    ] as const
  ).map(([name, scene, click]): LookSwitchShot => ({
    name: `dock-${name}`,
    scene,
    zoomIn: 1,
    click,
    crop: [0, 600, 1440, 300],
  })),
];
