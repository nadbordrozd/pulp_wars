import type { FactionIdV7 } from "../../engine/index";
import { forestHashV7 } from "./chibi-forest-packing-v7";
import {
  chibiForestRectV7,
  type ChibiForestRasterEnvironmentV7,
} from "./chibi-forest-v7";
import { chibiMasterScale, isWholeScale } from "./chibi-geometry-v7";
import type { CameraState } from "./geometry";
import {
  LIVE_DIRECTION_V7,
  terrainPivotV7,
  tonePixelsV7,
} from "./visual-direction-v7";

/**
 * EXPERIMENT: faction grass (bead pulp_wars-2o7.4, docs/art/FACTION_GRASS.md).
 * The Grass inside a faction's territory is drawn in that faction's own
 * look, and turns with the territory when a city changes hands. Humans keep
 * the default Grass; Ice Folk territory is Snow already. A ground need not
 * be grass: it is the faction's native land (the Cult's peat bog, the
 * Undead's burnt ground, the Dwarves' mine gravel, bead pulp_wars-2yc.48).
 *
 * Everything here is presentation, in the live look of the CHIBI art set
 * only. To turn it off: set FACTION_GRASS_ENABLED_V7 to false, or open the
 * game with `?faction-grass=0`. To remove it: revert the bead's one commit.
 *
 * How a cell is drawn (ground pass, over the cell's Grass and under the
 * forest shade, Snow, Roads and everything else):
 *
 * 1. its own faction tile, when its territory's faction has one;
 * 2. the **spill** of every neighbouring ground of a higher rank: that
 *    ground's tile, cut to an irregular strip along the shared edge (and a
 *    blob at a shared corner). Default Grass has the lowest rank, so a
 *    faction's ground runs a few pixels out over neutral and Human Grass
 *    and no border is a straight line.
 */

/** The master switch. False draws the board exactly as before the bead. */
export const FACTION_GRASS_ENABLED_V7 = true;

/** `?faction-grass=0` (or `off`, `false`) turns it off, `=1` on. */
export const FACTION_GRASS_PARAMETER_V7 = "faction-grass";

/**
 * Whether faction grass is drawn: the switch, unless the page's query
 * string overrides it. `search` defaults to the browser's.
 */
export function factionGrassEnabledV7(search?: string): boolean {
  const query =
    search ??
    (globalThis as { location?: { search?: string } }).location?.search ??
    "";
  let value: string | null;
  try {
    value = new URLSearchParams(query).get(FACTION_GRASS_PARAMETER_V7);
  } catch {
    value = null;
  }
  if (value === null) return FACTION_GRASS_ENABLED_V7;
  const text = value.trim().toLowerCase();
  if (text === "0" || text === "off" || text === "false") return false;
  if (text === "1" || text === "on" || text === "true") return true;
  return FACTION_GRASS_ENABLED_V7;
}

/**
 * The grounds, lowest rank first: a ground spills over every ground before
 * it in this list, and over default Grass. Darker grounds rank higher, so
 * a border reads as the darker land running out into the lighter one.
 */
export const FACTION_GRASS_IDS_V7 = [
  // By mean lightness (bead pulp_wars-2yc.48): the mint frosting 78%, the
  // golden savannah 74%, the mossy stones 54%, the jungle floor 51%, the
  // Mars regolith 49%, the peat bog 47%, the burnt ground 42%.
  "CANDY",
  "GOBLIN",
  "DWARF",
  "DINOSAUR",
  "MARTIAN",
  "CULT",
  "UNDEAD",
] as const;

export type FactionGrassIdV7 = (typeof FACTION_GRASS_IDS_V7)[number];

/**
 * The default Grass as a ground of this module (docs/art/TEXTURED_GROUNDS.md):
 * where the tiles' list holds an asset of this id, every Grass, Forest and
 * Mountain cell that has no faction ground draws it over its Grass tile.
 * It is no faction's and has the lowest rank: it never spills, and every
 * faction's ground spills over it as over the Grass tile.
 */
export const NEUTRAL_GROUND_ID_V7 = "NEUTRAL";
export type GroundIdV7 = FactionGrassIdV7 | typeof NEUTRAL_GROUND_ID_V7;

/**
 * Grounds whose own cell is drawn by other code. None since bead
 * pulp_wars-2yc.48: until then the Undead ground was the terrain tile
 * itself (`territoryGround`) and only its spill was drawn here. The burnt
 * ground is a baked tile like every other, drawn over that terrain tile,
 * which stays underneath for the switch being off and for the tile dock.
 */
const DRAWN_ELSEWHERE: ReadonlySet<FactionGrassIdV7> = new Set();

const RANK = new Map<FactionGrassIdV7, number>(
  FACTION_GRASS_IDS_V7.map((id, index) => [id, index + 1]),
);

/** The faction grass of a territory's faction, or null (Human, Ice Folk). */
export function factionGrassIdV7(
  faction: FactionIdV7 | null | undefined,
): FactionGrassIdV7 | null {
  return faction !== null &&
    faction !== undefined &&
    RANK.has(faction as FactionGrassIdV7)
    ? (faction as FactionGrassIdV7)
    : null;
}

/**
 * The terrains that stand on a ground: Grass, Forest, Mountain and the Rift,
 * whose crack lies over its territory's ground like any land cell's (bead
 * pulp_wars-2yc.102). Water has none.
 */
export function groundTerrainV7(terrain: string): boolean {
  return (
    terrain === "GRASS" ||
    terrain === "FOREST" ||
    terrain === "MOUNTAIN" ||
    terrain === "RIFT"
  );
}

/**
 * The plan member of a terrain entry: `factionGrass` on a Grass, Forest,
 * Mountain or Rift cell inside the territory of a faction with a ground,
 * nothing otherwise (and nothing at all with the switch off).
 */
export function factionGrassPlanMemberV7(
  terrain: string,
  faction: FactionIdV7 | null | undefined,
): { readonly factionGrass?: FactionGrassIdV7 } {
  if (!FACTION_GRASS_ENABLED_V7) return {};
  if (!groundTerrainV7(terrain)) return {};
  const id = factionGrassIdV7(faction);
  return id === null ? {} : { factionGrass: id };
}

const CELL = 80;
export const FACTION_GRASS_VARIANTS_V7 = 3;
/**
 * The most tiles a ground may have (bead pulp_wars-2yc.48: the grounds
 * made from PixelLab fields have six, so a pool or a burnt bush does not
 * come back every third cell). A cell's `variant` is one of this many; a
 * ground with fewer tiles takes it modulo its own count, and since this is
 * a multiple of FACTION_GRASS_VARIANTS_V7 a ground of three draws the tile
 * it always drew.
 */
export const FACTION_GRASS_CELL_VARIANTS_V7 = 6;
/** The spill masks repeat every this many cells, so a border never beats. */
export const FACTION_GRASS_PHASES_V7 = 3;

/** Neighbour bits of a spill mask. */
export const GRASS_N = 1;
export const GRASS_E = 2;
export const GRASS_S = 4;
export const GRASS_W = 8;
export const GRASS_NE = 16;
export const GRASS_SE = 32;
export const GRASS_SW = 64;
export const GRASS_NW = 128;

const NEIGHBOURS: readonly (readonly [number, number, number])[] = [
  [0, -1, GRASS_N],
  [1, 0, GRASS_E],
  [0, 1, GRASS_S],
  [-1, 0, GRASS_W],
  [1, -1, GRASS_NE],
  [1, 1, GRASS_SE],
  [-1, 1, GRASS_SW],
  [-1, -1, GRASS_NW],
];

/** How far a ground runs into the next cell, in master pixels. */
export const FACTION_GRASS_SPILL_V7 = {
  /** Mean width of the strip. */
  width: 10,
  /** The three waves added to it (amplitudes, px). */
  waves: [4, 2.6, 1.6],
  /** Loose specks beyond the strip: how far out, and how many of 100. */
  speckReach: 7,
  speckShare: 7,
  /** The strip is cut in blocks of this many pixels, like the tufts. */
  block: 2,
} as const;

/**
 * The alpha mask (0 or 255, CELL x CELL) of a ground spilling into a cell
 * from the neighbours in `neighbours`. `phase` is the cell's place in the
 * PHASES x PHASES repeat (`x % PHASES + PHASES * (y % PHASES)`): the strip's
 * width is a wave over board pixels with that period, so the strips of two
 * cells meet without a step and a long border does not repeat cell by cell.
 */
export function factionGrassSpillMaskV7(
  neighbours: number,
  phase: number,
): Uint8Array {
  const mask = new Uint8Array(CELL * CELL);
  if (neighbours === 0) return mask;
  const { width, waves, speckReach, speckShare, block } =
    FACTION_GRASS_SPILL_V7;
  const period = CELL * FACTION_GRASS_PHASES_V7;
  const originX = (phase % FACTION_GRASS_PHASES_V7) * CELL;
  const originY = Math.floor(phase / FACTION_GRASS_PHASES_V7) * CELL;
  const turn = (2 * Math.PI) / period;
  for (let y = 0; y < CELL; y += 1)
    for (let x = 0; x < CELL; x += 1) {
      const bx = Math.floor(x / block) * block + block / 2;
      const by = Math.floor(y / block) * block + block / 2;
      let distance = Infinity;
      if ((neighbours & GRASS_N) !== 0) distance = Math.min(distance, by);
      if ((neighbours & GRASS_S) !== 0)
        distance = Math.min(distance, CELL - by);
      if ((neighbours & GRASS_W) !== 0) distance = Math.min(distance, bx);
      if ((neighbours & GRASS_E) !== 0)
        distance = Math.min(distance, CELL - bx);
      if ((neighbours & GRASS_NE) !== 0)
        distance = Math.min(distance, Math.hypot(CELL - bx, by));
      if ((neighbours & GRASS_SE) !== 0)
        distance = Math.min(distance, Math.hypot(CELL - bx, CELL - by));
      if ((neighbours & GRASS_SW) !== 0)
        distance = Math.min(distance, Math.hypot(bx, CELL - by));
      if ((neighbours & GRASS_NW) !== 0)
        distance = Math.min(distance, Math.hypot(bx, by));
      const wx = originX + bx;
      const wy = originY + by;
      const reach =
        width +
        waves[0] * Math.sin(turn * (5 * wx + 4 * wy) + 1.3) +
        waves[1] * Math.sin(turn * (11 * wy - 9 * wx) + 0.4) +
        waves[2] * Math.sin(turn * (23 * wx + 19 * wy) + 2.6);
      const speck =
        distance < reach + speckReach &&
        forestHashV7(wx, wy, 5, 0x47) % 100 < speckShare;
      if (distance < reach || speck) mask[y * CELL + x] = 255;
    }
  return mask;
}

/** A tile's pixels with the mask as their alpha. */
export function factionGrassSpillPixelsV7(
  tile: Uint8ClampedArray,
  mask: Uint8Array,
): Uint8ClampedArray {
  const output = new Uint8ClampedArray(tile);
  for (let index = 0; index < mask.length; index += 1)
    output[index * 4 + 3] = Math.min(
      output[index * 4 + 3] ?? 0,
      mask[index] ?? 0,
    );
  return output;
}

// ------------------------------------------------------------------- cells

/** What the cells computation reads of a board plan entry. */
export interface FactionGrassEntryV7 {
  readonly kind: string;
  readonly at: { readonly x: number; readonly y: number };
  readonly artSubject?: string;
  readonly factionGrass?: FactionGrassIdV7;
}

export interface FactionGrassCellV7 {
  /** The cell's place on the map: a textured ground is sampled by it. */
  readonly at: { readonly x: number; readonly y: number };
  /** The cell's own tile, or null (default Grass, or drawn elsewhere). */
  readonly own: FactionGrassIdV7 | null;
  readonly variant: number;
  readonly phase: number;
  /** A Mountain: its Grass shows only under the rocky ground's fringe. */
  readonly mountain: boolean;
  /** Grounds of a higher rank around the cell, lowest rank first. */
  readonly spills: readonly {
    readonly id: FactionGrassIdV7;
    readonly neighbours: number;
  }[];
}

const GRASSY_SUBJECTS: ReadonlySet<string> = new Set([
  "TERRAIN:GRASS",
  "TERRAIN:FOREST",
  "TERRAIN:MOUNTAIN",
  "TERRAIN:MINED_MOUNTAIN",
]);

/** A terrain subject drawn on a ground: the Rift's pieces too (2yc.102). */
const grassy = (subject: string | undefined): boolean =>
  subject !== undefined &&
  (GRASSY_SUBJECTS.has(subject) || subject.startsWith("TERRAIN:RIFT_"));

/** A Mountain: its Grass shows only under its rocky ground's fringe. */
const rocky = (subject: string | undefined): boolean =>
  subject === "TERRAIN:MOUNTAIN" || subject === "TERRAIN:MINED_MOUNTAIN";

const modulo = (value: number, by: number): number => ((value % by) + by) % by;

/**
 * The faction grass of every explored Grass, Forest, Mountain and Rift cell:
 * only cells with something to draw are in the map. A pure function of the
 * plan's terrain entries, so nothing is read from unexplored cells.
 */
export function factionGrassCellsV7(
  entries: readonly FactionGrassEntryV7[],
): ReadonlyMap<string, FactionGrassCellV7> {
  const ground = new Map<string, FactionGrassIdV7>();
  const grounded: FactionGrassEntryV7[] = [];
  for (const entry of entries) {
    if (entry.kind !== "TERRAIN" || !grassy(entry.artSubject)) continue;
    grounded.push(entry);
    if (entry.factionGrass !== undefined)
      ground.set(`${entry.at.x},${entry.at.y}`, entry.factionGrass);
  }
  const cells = new Map<string, FactionGrassCellV7>();
  if (ground.size === 0) return cells;
  for (const entry of grounded) {
    const { x, y } = entry.at;
    const id = entry.factionGrass ?? null;
    const rank = id === null ? 0 : (RANK.get(id) ?? 0);
    const around = new Map<FactionGrassIdV7, number>();
    for (const [dx, dy, bit] of NEIGHBOURS) {
      const other = ground.get(`${x + dx},${y + dy}`);
      if (other === undefined || (RANK.get(other) ?? 0) <= rank) continue;
      around.set(other, (around.get(other) ?? 0) | bit);
    }
    const own = id !== null && !DRAWN_ELSEWHERE.has(id) ? id : null;
    if (own === null && around.size === 0) continue;
    cells.set(`${x},${y}`, {
      at: { x, y },
      own,
      variant: forestHashV7(x, y, 3, 0x51) % FACTION_GRASS_CELL_VARIANTS_V7,
      phase:
        modulo(x, FACTION_GRASS_PHASES_V7) +
        FACTION_GRASS_PHASES_V7 * modulo(y, FACTION_GRASS_PHASES_V7),
      mountain: rocky(entry.artSubject),
      spills: [...around.entries()]
        .sort((a, b) => (RANK.get(a[0]) ?? 0) - (RANK.get(b[0]) ?? 0))
        .map(([spill, neighbours]) => ({ id: spill, neighbours })),
    });
  }
  return cells;
}

const cellsByEntries = new WeakMap<
  object,
  ReadonlyMap<string, FactionGrassCellV7>
>();

/** `factionGrassCellsV7`, computed once per plan. */
export function factionGrassCellsOfV7(
  entries: readonly FactionGrassEntryV7[],
): ReadonlyMap<string, FactionGrassCellV7> {
  let cells = cellsByEntries.get(entries);
  if (cells === undefined) {
    cells = factionGrassCellsV7(entries);
    cellsByEntries.set(entries, cells);
  }
  return cells;
}

// --------------------------------------------------------------------- art

export interface FactionGrassTileAssetV7 {
  readonly id: GroundIdV7;
  readonly variant: number;
  readonly url: string;
  /**
   * True for a tile the board tones like every Grass tile (the Undead
   * gloam masters); the others are baked in their final colours.
   */
  readonly toned?: boolean;
  /**
   * A textured ground (docs/art/TEXTURED_GROUNDS.md): the file is not one
   * tile but a periodic texture of `columns` x `rows` cells, and a cell draws the
   * part at its own place on the map (modulo the period), so neighbouring
   * cells always continue each other. `variant` is 0.
   */
  readonly world?: {
    readonly columns: number;
    readonly rows: number;
    /** The texture's first cell as an 80 x 80 file, for the interface. */
    readonly swatchUrl?: string;
  };
}

export interface FactionGrassArtV7 {
  /** `at` is the cell's place on the map; a textured ground needs it. */
  tile(
    id: GroundIdV7,
    variant: number,
    at?: { readonly x: number; readonly y: number },
  ): CanvasImageSource | null;
  spill(
    id: GroundIdV7,
    variant: number,
    neighbours: number,
    phase: number,
    at?: { readonly x: number; readonly y: number },
  ): CanvasImageSource | null;
}

/**
 * Loads the faction tiles (on the first `resolve`) and cuts the spills on
 * demand. Null while the tiles load, and for good when a load or a pixel
 * readback fails: the board then draws default Grass, as with the switch
 * off.
 */
export function createFactionGrassArtV7(input: {
  readonly environment: ChibiForestRasterEnvironmentV7;
  readonly redraw: () => void;
  readonly tiles: readonly FactionGrassTileAssetV7[];
}): { resolve(): FactionGrassArtV7 | null } {
  const { environment, tiles } = input;
  let state: "IDLE" | "LOADING" | "FAILED" | "READY" = "IDLE";
  let art: FactionGrassArtV7 | null = null;
  const images = new Map<string, CanvasImageSource>();
  let pending = 0;
  let failed = false;
  const key = (id: GroundIdV7, variant: number): string => `${id}:${variant}`;

  const build = (): FactionGrassArtV7 | null => {
    const pixels = new Map<string, Uint8ClampedArray>();
    const surfaces = new Map<string, CanvasImageSource>();
    const worlds = new Map<
      GroundIdV7,
      { readonly columns: number; readonly rows: number }
    >();
    for (const tile of tiles) {
      const image = images.get(tile.url);
      if (image === undefined) return null;
      if (tile.world !== undefined) {
        // One read of the whole texture, cut once into its cells: a cell
        // of the board then draws one cached surface, as with tiles.
        const { columns, rows } = tile.world;
        const width = columns * CELL;
        const whole = environment.readPixels(image, width, rows * CELL);
        if (whole === null) return null;
        for (let cy = 0; cy < rows; cy += 1)
          for (let cx = 0; cx < columns; cx += 1) {
            const cut = new Uint8ClampedArray(CELL * CELL * 4);
            for (let y = 0; y < CELL; y += 1) {
              const from = ((cy * CELL + y) * width + cx * CELL) * 4;
              cut.set(whole.subarray(from, from + CELL * 4), y * CELL * 4);
            }
            const surface = environment.createSurface(cut, CELL, CELL);
            if (surface === null) return null;
            pixels.set(key(tile.id, cx + columns * cy), cut);
            surfaces.set(key(tile.id, cx + columns * cy), surface);
          }
        worlds.set(tile.id, tile.world);
        continue;
      }
      const read = environment.readPixels(image, CELL, CELL);
      if (read === null) return null;
      const final =
        tile.toned === true
          ? tonePixelsV7(
              read,
              CELL,
              CELL,
              { ...LIVE_DIRECTION_V7.terrain, scale: 100 },
              1,
              terrainPivotV7("TERRAIN:GRASS"),
            )
          : read;
      const surface = environment.createSurface(final, CELL, CELL);
      if (surface === null) return null;
      pixels.set(key(tile.id, tile.variant), final);
      surfaces.set(key(tile.id, tile.variant), surface);
    }
    const spills = new Map<string, CanvasImageSource | null>();
    // A cell's variant is one of FACTION_GRASS_CELL_VARIANTS_V7; a ground
    // takes it modulo the number of tiles it has.
    const counts = new Map<GroundIdV7, number>();
    for (const tile of tiles)
      counts.set(tile.id, Math.max(counts.get(tile.id) ?? 0, tile.variant + 1));
    const own = (
      id: GroundIdV7,
      variant: number,
      at?: { readonly x: number; readonly y: number },
    ): string => {
      const world = worlds.get(id);
      return world === undefined
        ? key(id, variant % (counts.get(id) ?? 1))
        : key(
            id,
            modulo(at?.x ?? 0, world.columns) +
              world.columns * modulo(at?.y ?? 0, world.rows),
          );
    };
    return {
      tile: (id, variant, at) => surfaces.get(own(id, variant, at)) ?? null,
      spill(id, variant, neighbours, phase, at) {
        const spillKey = `${own(id, variant, at)}:${neighbours}:${phase}`;
        const known = spills.get(spillKey);
        if (known !== undefined) return known;
        const tile = pixels.get(own(id, variant, at));
        const surface =
          tile === undefined
            ? null
            : environment.createSurface(
                factionGrassSpillPixelsV7(
                  tile,
                  factionGrassSpillMaskV7(neighbours, phase),
                ),
                CELL,
                CELL,
              );
        spills.set(spillKey, surface);
        return surface;
      },
    };
  };

  const finish = (): void => {
    if (state !== "LOADING") return;
    if (failed) state = "FAILED";
    else if (pending === 0) {
      art = build();
      state = art === null ? "FAILED" : "READY";
    }
  };

  return {
    resolve() {
      if (state === "IDLE") {
        state = "LOADING";
        const urls = [...new Set(tiles.map((tile) => tile.url))];
        pending = urls.length;
        if (pending === 0) failed = true;
        // A synchronous environment settles inside loadImage, before the
        // raster is recorded, so the outcome is read after the loop.
        let starting = true;
        for (const url of urls) {
          const image = environment.loadImage(url, (ok) => {
            if (ok) pending -= 1;
            else failed = true;
            if (starting) return;
            finish();
            if (state !== "LOADING") input.redraw();
          });
          images.set(url, image);
        }
        starting = false;
        finish();
      }
      return state === "READY" ? art : null;
    },
  };
}

// ----------------------------------------------------------------- drawing

export interface FactionGrassFrameV7 {
  readonly camera: CameraState;
  readonly devicePixelRatio: number;
  readonly sceneAlpha: number;
}

/** The images of a cell's faction grass, in drawing order. */
export function factionGrassLayersV7(
  art: FactionGrassArtV7,
  cell: FactionGrassCellV7,
): CanvasImageSource[] {
  const layers: CanvasImageSource[] = [];
  // A cell with no faction ground wears the default one, where there is
  // one (null where the default Grass is the terrain tile alone).
  const own = art.tile(cell.own ?? NEUTRAL_GROUND_ID_V7, cell.variant, cell.at);
  if (own !== null) layers.push(own);
  for (const spill of cell.spills) {
    const image = art.spill(
      spill.id,
      cell.variant,
      spill.neighbours,
      cell.phase,
      cell.at,
    );
    if (image !== null) layers.push(image);
  }
  return layers;
}

/**
 * The same layers for the open ground of a Forest glade, which is drawn
 * over the trees: the glade's ground has to be the faction's too.
 */
export function factionGrassGladeLayersV7(
  art: FactionGrassArtV7 | null,
  entry: FactionGrassEntryV7,
  cells: ReadonlyMap<string, FactionGrassCellV7> | null,
): CanvasImageSource[] {
  if (art === null || cells === null) return [];
  const cell = cellOf(entry, cells);
  return cell === null || cell.mountain ? [] : factionGrassLayersV7(art, cell);
}

/**
 * The cell of a terrain entry: the one the plan's faction grounds give it,
 * or, for a Grass, Forest or Mountain cell they give nothing, a plain cell
 * that wears the default ground alone.
 */
function cellOf(
  entry: FactionGrassEntryV7,
  cells: ReadonlyMap<string, FactionGrassCellV7>,
): FactionGrassCellV7 | null {
  const cell = cells.get(`${entry.at.x},${entry.at.y}`);
  if (cell !== undefined) return cell;
  if (entry.kind !== "TERRAIN" || !grassy(entry.artSubject)) return null;
  return {
    at: entry.at,
    own: null,
    variant: 0,
    phase: 0,
    mountain: rocky(entry.artSubject),
    spills: [],
  };
}

/**
 * Draws a terrain entry's faction grass over its Grass. `underRock` says
 * which call this is: false after a cell's ground (skipped for a Mountain,
 * whose ground is rock), true after the Grass under a Mountain's fringe.
 */
export function drawFactionGrassV7(
  context: CanvasRenderingContext2D,
  frame: FactionGrassFrameV7,
  art: FactionGrassArtV7 | null,
  entry: FactionGrassEntryV7,
  cells: ReadonlyMap<string, FactionGrassCellV7> | null,
  underRock: boolean,
): void {
  if (art === null || cells === null) return;
  const cell = cellOf(entry, cells);
  if (cell === null || cell.mountain !== underRock) return;
  const layers = factionGrassLayersV7(art, cell);
  if (layers.length === 0) return;
  const rect = chibiForestRectV7(frame, entry.at, {
    x: 0,
    y: 0,
    width: CELL,
    height: CELL,
  });
  context.save();
  context.globalAlpha = frame.sceneAlpha;
  // The live rule: smoothing only at a fractional device scale (zoom 0.75).
  context.imageSmoothingEnabled = !isWholeScale(
    chibiMasterScale(frame.camera) * frame.devicePixelRatio,
  );
  for (const image of layers)
    context.drawImage(image, rect.x, rect.y, rect.width, rect.height);
  context.restore();
}
