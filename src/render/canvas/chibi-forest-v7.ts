import type {
  ChibiForestArtSetV7,
  ChibiForestClumpAssetV7,
} from "../../assets/chibi-forest-pieces-manifest";
import {
  FOREST_SHAPES_V7,
  FOREST_SHAPE_IDS_V7,
  forestHashV7,
  forestPlacementCellsV7,
  forestShapeRectsV7,
  packForestBlockV7,
  type ForestPlacementV7,
  type ForestShapeV7,
  type ForestVariantCountsV7,
} from "./chibi-forest-packing-v7";
import {
  CHIBI_FRINGE_EAST,
  CHIBI_FRINGE_NORTH,
  CHIBI_FRINGE_SOUTH,
  CHIBI_FRINGE_WEST,
  applyChibiFringeMaskV7,
  chibiFringeMaskV7,
  chibiFringeVariantV7,
} from "./chibi-terrain-fringe-v7";
import { chibiMasterScale, isWholeScale } from "./chibi-geometry-v7";
import { TILE_HEIGHT, TILE_WIDTH, type CameraState } from "./geometry";
import { fogShareRectsV7, type FogAtV7 } from "./terrain-at-fog-v7";

/**
 * Composed CHIBI forests (bead pulp_wars-maw.3,
 * docs/art/COMPOSED_FORESTS.md). A group of Forest cells is drawn as one
 * forest: multi-tile pieces packed per 2 x 2 block
 * (chibi-forest-packing-v7.ts), single clumps closing the seams between
 * pieces, and a faint shade on the ground under the trees.
 *
 * What a cell draws depends only on the plan entries of its own 2 x 2 block
 * and of its four orthogonal neighbours, so clearing or planting one Forest
 * cell changes the picture of a few cells around it and nothing else.
 */

const CELL = 80;
const UP = 24;

/** Rows a seam clump keeps below its cell's bottom edge (its trunk base). */
const SEAM_BASE_INSET = 0;

/**
 * Plan entry kinds that keep a Forest cell a clearing: the cell draws the
 * single clump it always drew, so whatever stands there (a Village, a
 * Treasure, a curiosity, a Grave) is as readable as before. A resource is
 * different: its cell is packed like any other and gets a glade, a small
 * round patch of open ground under the animal (CHIBI_FOREST_GLADE_V7).
 */
const CLEARING_KINDS: ReadonlySet<string> = new Set([
  "IMPROVEMENT",
  "SITE",
  "CITY",
  "TREASURE",
  "CURIOSITY",
  "GRAVE",
  "FIELD_DEFENSE",
]);

interface ForestPlanEntry {
  readonly kind: string;
  readonly at: { readonly x: number; readonly y: number };
  readonly artSubject?: string;
}

export interface ChibiForestBandV7 {
  readonly piece: ForestPlacementV7;
  /** First column and width of the band, in cells from the piece's left. */
  readonly column: number;
  readonly columns: number;
  /** Row of the band's cells, from the piece's top row. */
  readonly row: number;
}

export interface ChibiForestCellV7 {
  /** A cell with a feature: it keeps its single clump. */
  readonly clearing: boolean;
  /** A packed cell with a resource: a patch of open ground under it. */
  readonly glade: boolean;
  /** Floor fringe: edges that face a cell without composed Forest. */
  readonly edges: number;
  /** The seam clump on this cell's east edge, drawn under both pieces. */
  readonly eastSeam: number | null;
  /** The seam clump over this cell's north edge, drawn under its piece. */
  readonly northSeam: number | null;
  /** Pieces whose footprint is drawn at this cell's turn (their last cell). */
  readonly bodies: readonly ForestPlacementV7[];
  /** Upward bands drawn in the foreground at this cell's turn. */
  readonly bands: readonly ChibiForestBandV7[];
}

const key = (x: number, y: number): string => `${x},${y}`;

/**
 * The forest role of every explored Forest cell that still shows its
 * canopy, by "x,y". The plan has terrain entries for explored cells only,
 * and a Forest under a Lumber Camp or Sawmill is drawn as Grass, so neither
 * fog nor those cells take part: no piece ever shows Forest the player has
 * not seen.
 */
export function chibiForestCellsV7(
  entries: readonly ForestPlanEntry[],
  variants: ForestVariantCountsV7,
  clumpCount: number,
): ReadonlyMap<string, ChibiForestCellV7> {
  const subject = "TERRAIN:FOREST";
  const forest = new Set<string>();
  const featured = new Set<string>();
  const resources = new Set<string>();
  for (const entry of entries) {
    // A resource opens a glade: its cell is packed like any other.
    if (entry.kind === "RESOURCE") resources.add(key(entry.at.x, entry.at.y));
    if (entry.kind === "TERRAIN") {
      if (entry.artSubject === subject) forest.add(key(entry.at.x, entry.at.y));
    } else if (CLEARING_KINDS.has(entry.kind))
      featured.add(key(entry.at.x, entry.at.y));
  }
  const result = new Map<string, ChibiForestCellV7>();
  if (forest.size === 0) return result;
  const packable = (x: number, y: number): boolean => {
    const at = key(x, y);
    return forest.has(at) && !featured.has(at);
  };
  const pieceOf = new Map<string, ForestPlacementV7>();
  const bodies = new Map<string, ForestPlacementV7[]>();
  const bands = new Map<string, ChibiForestBandV7[]>();
  // Forests pack per 2 x 2 block, so a change stays local.
  const placements: ForestPlacementV7[] = [];
  {
    const blocks = new Set<string>();
    for (const at of forest) {
      const [x = 0, y = 0] = at.split(",").map(Number);
      const bx = Math.floor(x / 2);
      const by = Math.floor(y / 2);
      if (blocks.has(key(bx, by))) continue;
      blocks.add(key(bx, by));
      placements.push(...packForestBlockV7(packable, bx, by, variants));
    }
  }
  {
    for (const piece of placements) {
      const cells = forestPlacementCellsV7(piece);
      for (const [cx, cy] of cells) pieceOf.set(key(cx, cy), piece);
      const last = cells[cells.length - 1];
      if (last === undefined) continue;
      const anchor = key(last[0], last[1]);
      bodies.set(anchor, [...(bodies.get(anchor) ?? []), piece]);
      // One band per run of columns whose topmost covered cell shares a row.
      const rows = FOREST_SHAPES_V7[piece.shape];
      const columns = rows[0]?.length ?? 1;
      let start = 0;
      while (start < columns) {
        const row = rows.findIndex((line) => line[start] === "#");
        let end = start;
        while (
          end + 1 < columns &&
          rows.findIndex((line) => line[end + 1] === "#") === row
        )
          end += 1;
        const at2 = key(piece.x + start, piece.y + row);
        bands.set(at2, [
          ...(bands.get(at2) ?? []),
          { piece, column: start, columns: end - start + 1, row },
        ]);
        start = end + 1;
      }
    }
  }
  const pick = (x: number, y: number, salt: number): number =>
    clumpCount <= 0 ? 0 : forestHashV7(x, y, salt, 0x3d) % clumpCount;
  for (const at of forest) {
    const [x = 0, y = 0] = at.split(",").map(Number);
    let edges = 0;
    if (!forest.has(key(x, y - 1))) edges |= CHIBI_FRINGE_NORTH;
    if (!forest.has(key(x + 1, y))) edges |= CHIBI_FRINGE_EAST;
    if (!forest.has(key(x, y + 1))) edges |= CHIBI_FRINGE_SOUTH;
    if (!forest.has(key(x - 1, y))) edges |= CHIBI_FRINGE_WEST;
    const own = pieceOf.get(at);
    const east = pieceOf.get(key(x + 1, y));
    const north = pieceOf.get(key(x, y - 1));
    result.set(at, {
      clearing: own === undefined,
      glade: own !== undefined && resources.has(at),
      edges,
      eastSeam:
        clumpCount > 0 &&
        own !== undefined &&
        east !== undefined &&
        east !== own
          ? pick(x, y, 1)
          : null,
      northSeam:
        clumpCount > 0 &&
        own !== undefined &&
        north !== undefined &&
        north !== own
          ? pick(x, y, 2)
          : null,
      bodies: bodies.get(at) ?? [],
      bands: bands.get(at) ?? [],
    });
  }
  return result;
}

// ------------------------------------------------------------------- art

/** The browser seams of chibi-art-resolver-v7.ts, repeated to avoid a cycle. */
export interface ChibiForestRasterEnvironmentV7 {
  loadImage(url: string, settle: (ok: boolean) => void): CanvasImageSource;
  readPixels(
    image: CanvasImageSource,
    width: number,
    height: number,
  ): Uint8ClampedArray | null;
  createSurface(
    pixels: Uint8ClampedArray,
    width: number,
    height: number,
  ): CanvasImageSource | null;
}

/** A rectangle of a piece as its own raster, in cells from the piece. */
export interface ChibiForestPartV7 {
  readonly image: CanvasImageSource;
  readonly x: number;
  readonly y: number;
  readonly columns: number;
  readonly rows: number;
}

export interface ChibiForestClumpV7 {
  readonly image: CanvasImageSource;
  readonly width: number;
  readonly height: number;
}

export interface ChibiForestArtV7 {
  readonly variants: ForestVariantCountsV7;
  readonly clumps: readonly ChibiForestClumpV7[];
  /** The footprint of a piece, one raster per rectangle of cells. */
  body(shape: ForestShapeV7, variant: number): readonly ChibiForestPartV7[];
  /** The 24 px band above `columns` cells starting at `column`, `row`. */
  band(
    shape: ForestShapeV7,
    variant: number,
    column: number,
    row: number,
  ): CanvasImageSource | null;
  /** The shade under the trees of a cell, cut back along `edges`. */
  floor(
    at: { readonly x: number; readonly y: number },
    edges: number,
  ): CanvasImageSource | null;
  /**
   * A glade: the 80 x 80 ground tile `ground` cut to a round opening with
   * a soft edge, drawn over the trees and under a resource.
   */
  glade(ground: CanvasImageSource): CanvasImageSource | null;
}

/**
 * The glade of a resource cell, in cell pixels: a circle about the centre
 * of the cell, where the 48 px resource sits. Inside `core` the cell's
 * ground is fully open; from there it fades out evenly to nothing at
 * `rim`, so the opening is round from every side and has no hard line.
 * `rim` is well inside the cell, so a glade never reaches a neighbour.
 * (Bead pulp_wars-2yc.16: it was an irregular blob with a channel running
 * down to the cell's bottom edge, which read as a keyhole.)
 */
export const CHIBI_FOREST_GLADE_V7 = {
  x: 40,
  y: 40,
  core: 17,
  rim: 29,
} as const;

/** How open cell pixel (x, y) of a glade is: 0 (trees) to 1 (ground). */
export function chibiForestGladeAlphaV7(x: number, y: number): number {
  const { core, rim } = CHIBI_FOREST_GLADE_V7;
  const radius = Math.hypot(
    x + 0.5 - CHIBI_FOREST_GLADE_V7.x,
    y + 0.5 - CHIBI_FOREST_GLADE_V7.y,
  );
  const t = Math.min(1, Math.max(0, (rim - radius) / (rim - core)));
  return t * t * (3 - 2 * t);
}

/** The shade under a forest: a dark green veil, about an eighth opaque. */
const FLOOR_RGBA = [22, 58, 38, 32] as const;

/**
 * Loads the piece set through the environment. `resolve` returns null until
 * every raster is ready (the board then draws the single clumps as before)
 * and for good when a load or a pixel readback fails.
 */
export function createChibiForestArtV7(input: {
  readonly environment: ChibiForestRasterEnvironmentV7;
  readonly redraw: () => void;
  readonly set: ChibiForestArtSetV7;
}): { resolve(): ChibiForestArtV7 | null } {
  const { environment, set } = input;
  let state: "IDLE" | "LOADING" | "FAILED" | "READY" = "IDLE";
  let art: ChibiForestArtV7 | null = null;
  const images = new Map<string, CanvasImageSource>();
  let pending = 0;
  let failed = false;

  const slice = (
    pixels: Uint8ClampedArray,
    stride: number,
    x: number,
    y: number,
    width: number,
    height: number,
  ): CanvasImageSource | null => {
    const part = new Uint8ClampedArray(width * height * 4);
    for (let row = 0; row < height; row += 1)
      part.set(
        pixels.subarray(
          ((y + row) * stride + x) * 4,
          ((y + row) * stride + x + width) * 4,
        ),
        row * width * 4,
      );
    return environment.createSurface(part, width, height);
  };

  const build = (): ChibiForestArtV7 | null => {
    const variants = Object.fromEntries(
      FOREST_SHAPE_IDS_V7.map((shape) => [shape, 0]),
    ) as Record<ForestShapeV7, number>;
    const bodies = new Map<string, ChibiForestPartV7[]>();
    const bands = new Map<string, CanvasImageSource>();
    for (const piece of set.pieces) {
      const image = images.get(piece.url);
      if (image === undefined) return null;
      const pixels = environment.readPixels(image, piece.width, piece.height);
      if (pixels === null) return null;
      const id = `${piece.shape}#${piece.variant}`;
      const parts: ChibiForestPartV7[] = [];
      for (const rect of forestShapeRectsV7(piece.shape)) {
        const surface = slice(
          pixels,
          piece.width,
          rect.x * CELL,
          UP + rect.y * CELL,
          rect.w * CELL,
          rect.h * CELL,
        );
        if (surface === null) return null;
        parts.push({
          image: surface,
          x: rect.x,
          y: rect.y,
          columns: rect.w,
          rows: rect.h,
        });
      }
      bodies.set(id, parts);
      const rows = FOREST_SHAPES_V7[piece.shape];
      const columns = rows[0]?.length ?? 1;
      let start = 0;
      while (start < columns) {
        const row = rows.findIndex((line) => line[start] === "#");
        let end = start;
        while (
          end + 1 < columns &&
          rows.findIndex((line) => line[end + 1] === "#") === row
        )
          end += 1;
        const surface = slice(
          pixels,
          piece.width,
          start * CELL,
          row * CELL,
          (end - start + 1) * CELL,
          UP,
        );
        if (surface === null) return null;
        bands.set(`${id}@${start},${row}`, surface);
        start = end + 1;
      }
      variants[piece.shape] = Math.max(
        variants[piece.shape],
        piece.variant + 1,
      );
    }
    const clumps: ChibiForestClumpV7[] = [];
    for (const clump of set.clumps) {
      const image = images.get(clump.url);
      if (image === undefined) return null;
      clumps.push({ image, width: clump.width, height: clump.height });
    }
    if (variants["1x1"] === 0) return null;
    const plain = new Uint8ClampedArray(CELL * CELL * 4);
    for (let i = 0; i < plain.length; i += 4) plain.set(FLOOR_RGBA, i);
    const floors = new Map<string, CanvasImageSource | null>();
    const glades = new WeakMap<object, CanvasImageSource | null>();
    return {
      variants,
      clumps,
      glade(ground) {
        const known = glades.get(ground);
        if (known !== undefined) return known;
        const source = environment.readPixels(ground, CELL, CELL);
        let surface: CanvasImageSource | null = null;
        if (source !== null) {
          const pixels = new Uint8ClampedArray(source);
          for (let y = 0; y < CELL; y += 1)
            for (let x = 0; x < CELL; x += 1) {
              const alpha = (y * CELL + x) * 4 + 3;
              pixels[alpha] = Math.round(
                (pixels[alpha] ?? 0) * chibiForestGladeAlphaV7(x, y),
              );
            }
          surface = environment.createSurface(pixels, CELL, CELL);
        }
        glades.set(ground, surface);
        return surface;
      },
      body: (shape, variant) => bodies.get(`${shape}#${variant}`) ?? [],
      band: (shape, variant, column, row) =>
        bands.get(`${shape}#${variant}@${column},${row}`) ?? null,
      floor(at, edges) {
        const variant = edges === 0 ? 0 : chibiFringeVariantV7(at);
        const id = `${variant}:${edges}`;
        const cached = floors.get(id);
        if (cached !== undefined) return cached;
        const surface = environment.createSurface(
          edges === 0
            ? plain
            : applyChibiFringeMaskV7(
                plain,
                chibiFringeMaskV7(variant, edges, CELL),
              ),
          CELL,
          CELL,
        );
        floors.set(id, surface);
        return surface;
      },
    };
  };

  /** Ends the loading state once every raster settled or one failed. */
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
        const urls = [
          ...set.pieces.map((piece) => piece.url),
          ...set.clumps.map((clump: ChibiForestClumpAssetV7) => clump.url),
        ];
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

// --------------------------------------------------------------- drawing

interface DrawFrame {
  readonly camera: CameraState;
  readonly devicePixelRatio: number;
  readonly sceneAlpha: number;
  /**
   * Which cells are unexplored (bead pulp_wars-2yc.28): a piece, a seam
   * clump or a band is drawn only over the cells that are not. Omitted,
   * everything is drawn whole.
   */
  readonly fogAt?: FogAtV7 | null;
}

/**
 * CSS-pixel destination of a master-pixel rectangle measured from the
 * top-left of cell (x, y). Every edge is rounded to a whole device pixel on
 * its own, as chibiTerrainPartRect does, so parts meet without a gap.
 */
export function chibiForestRectV7(
  frame: Pick<DrawFrame, "camera" | "devicePixelRatio">,
  cell: { readonly x: number; readonly y: number },
  rect: {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  },
): { x: number; y: number; width: number; height: number } {
  const { camera } = frame;
  const scale = chibiMasterScale(camera);
  const ratio = frame.devicePixelRatio > 0 ? frame.devicePixelRatio : 1;
  const device = (value: number): number => Math.round(value * ratio);
  const originX =
    camera.offsetX + (cell.x * TILE_WIDTH - TILE_WIDTH / 2) * camera.zoom;
  const originY =
    camera.offsetY + (cell.y * TILE_HEIGHT - TILE_HEIGHT / 2) * camera.zoom;
  const left = device(originX + rect.x * scale);
  const top = device(originY + rect.y * scale);
  const right = device(originX + (rect.x + rect.width) * scale);
  const bottom = device(originY + (rect.y + rect.height) * scale);
  return {
    x: left / ratio,
    y: top / ratio,
    width: (right - left) / ratio,
    height: (bottom - top) / ratio,
  };
}

function blit(
  context: CanvasRenderingContext2D,
  frame: DrawFrame,
  image: CanvasImageSource,
  rect: { x: number; y: number; width: number; height: number },
): void {
  context.save();
  context.globalAlpha = frame.sceneAlpha;
  // The live rule: smoothing only at a fractional device scale (zoom 0.75).
  context.imageSmoothingEnabled = !isWholeScale(
    chibiMasterScale(frame.camera) * frame.devicePixelRatio,
  );
  context.drawImage(image, rect.x, rect.y, rect.width, rect.height);
  context.restore();
}

/**
 * Draws art that may lie over several cells: `rect` is its place in master
 * pixels from the top left of cell `origin`, and `source` the top left of
 * that rectangle inside `image` (the whole image when omitted). Only the
 * part over cells that are not fog is drawn (`frame.fogAt`, bead
 * pulp_wars-2yc.28): where no cell under it is fog, that is the one whole
 * draw it always was; otherwise the same draw inside a clip of the cells
 * that are not fog, so the pixels it does paint are the same either way.
 */
export function blitShareV7(
  context: CanvasRenderingContext2D,
  frame: DrawFrame,
  image: CanvasImageSource,
  origin: { readonly x: number; readonly y: number },
  rect: {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  },
  source?: { readonly x: number; readonly y: number },
): void {
  const shares = fogShareRectsV7(origin, rect, frame.fogAt);
  if (shares !== null && shares.length === 0) return;
  context.save();
  if (shares !== null) {
    context.beginPath();
    for (const share of shares) {
      const part = chibiForestRectV7(frame, origin, share);
      context.rect(part.x, part.y, part.width, part.height);
    }
    context.clip();
  }
  context.globalAlpha = frame.sceneAlpha;
  // The live rule: smoothing only at a fractional device scale (zoom 0.75).
  context.imageSmoothingEnabled = !isWholeScale(
    chibiMasterScale(frame.camera) * frame.devicePixelRatio,
  );
  const to = chibiForestRectV7(frame, origin, rect);
  if (source === undefined)
    context.drawImage(image, to.x, to.y, to.width, to.height);
  else
    context.drawImage(
      image,
      source.x,
      source.y,
      rect.width,
      rect.height,
      to.x,
      to.y,
      to.width,
      to.height,
    );
  context.restore();
}

/**
 * Snow (the Ice Folk revision): the caps raster of a tree raster, and which
 * cells are Snow. Caps are drawn cell by cell, so a piece that spans a Snow
 * border is capped only over its Snow cells.
 */
export interface ChibiForestSnowV7 {
  caps(image: CanvasImageSource): CanvasImageSource | null;
  snowAt(x: number, y: number): boolean;
}

/**
 * The caps of `image` over the Snow cells among `columns` x `rows` cells
 * whose top-left cell is `cell`; `image` starts `offsetY` master pixels
 * above that cell's top edge and is `height` master pixels tall per row.
 */
function blitCaps(
  context: CanvasRenderingContext2D,
  frame: DrawFrame,
  snow: ChibiForestSnowV7 | null,
  image: CanvasImageSource,
  cell: { readonly x: number; readonly y: number },
  columns: number,
  rows: number,
  offsetY: number,
  height: number,
): void {
  if (snow === null) return;
  let caps: CanvasImageSource | null | undefined;
  for (let row = 0; row < rows; row += 1)
    for (let column = 0; column < columns; column += 1) {
      if (!snow.snowAt(cell.x + column, cell.y + row)) continue;
      if (caps === undefined) caps = snow.caps(image);
      if (caps === null) return;
      blitShareV7(
        context,
        frame,
        caps,
        { x: cell.x + column, y: cell.y + row },
        { x: 0, y: offsetY, width: CELL, height },
        { x: column * CELL, y: row * height },
      );
    }
}

/** A seam clump with its caps when its own cell is Snow. */
function blitClump(
  context: CanvasRenderingContext2D,
  frame: DrawFrame,
  snow: ChibiForestSnowV7 | null,
  image: CanvasImageSource,
  at: { readonly x: number; readonly y: number },
  rect: { x: number; y: number; width: number; height: number },
): void {
  blitShareV7(context, frame, image, at, rect);
  if (snow === null || !snow.snowAt(at.x, at.y)) return;
  const caps = snow.caps(image);
  if (caps !== null) blitShareV7(context, frame, caps, at, rect);
}

/** The shade under the trees of one Forest cell (ground pass). */
export function drawChibiForestFloorV7(
  context: CanvasRenderingContext2D,
  frame: DrawFrame,
  art: ChibiForestArtV7,
  at: { readonly x: number; readonly y: number },
  cell: ChibiForestCellV7,
): void {
  const floor = art.floor(at, cell.edges);
  if (floor === null) return;
  blit(
    context,
    frame,
    floor,
    chibiForestRectV7(frame, at, { x: 0, y: 0, width: CELL, height: CELL }),
  );
}

/**
 * The trees a cell draws after the Roads and under every unit and building:
 * the seam clump on its east edge, the seam clump over its north edge, then
 * the footprints of the pieces that end on it.
 */
export function drawChibiForestBodiesV7(
  context: CanvasRenderingContext2D,
  frame: DrawFrame,
  art: ChibiForestArtV7,
  at: { readonly x: number; readonly y: number },
  cell: ChibiForestCellV7,
  snow: ChibiForestSnowV7 | null,
): void {
  const east = cell.eastSeam === null ? undefined : art.clumps[cell.eastSeam];
  if (east !== undefined)
    // Astride the east edge, its top at the cell's top: never above it.
    blitClump(context, frame, snow, east.image, at, {
      x: CELL - Math.round(east.width / 2),
      y: Math.max(0, CELL - SEAM_BASE_INSET - east.height),
      width: east.width,
      height: east.height,
    });
  const north =
    cell.northSeam === null ? undefined : art.clumps[cell.northSeam];
  if (north !== undefined)
    // Rising 24 px into the Forest cell above, over that piece's trunks.
    blitClump(context, frame, snow, north.image, at, {
      x: Math.round((CELL - north.width) / 2),
      y: -UP,
      width: north.width,
      height: north.height,
    });
  for (const piece of cell.bodies)
    for (const part of art.body(piece.shape, piece.variant)) {
      const origin = { x: piece.x + part.x, y: piece.y + part.y };
      blitShareV7(context, frame, part.image, origin, {
        x: 0,
        y: 0,
        width: part.columns * CELL,
        height: part.rows * CELL,
      });
      blitCaps(
        context,
        frame,
        snow,
        part.image,
        origin,
        part.columns,
        part.rows,
        0,
        CELL,
      );
    }
}

/** The glade of a resource cell: open ground over the trees (foreground). */
export function drawChibiForestGladeV7(
  context: CanvasRenderingContext2D,
  frame: DrawFrame,
  art: ChibiForestArtV7,
  at: { readonly x: number; readonly y: number },
  ground: CanvasImageSource,
): void {
  const glade = art.glade(ground);
  if (glade === null) return;
  blit(
    context,
    frame,
    glade,
    chibiForestRectV7(frame, at, { x: 0, y: 0, width: CELL, height: CELL }),
  );
}

/** The upward bands a cell draws in the foreground, as the old overflow. */
export function drawChibiForestBandsV7(
  context: CanvasRenderingContext2D,
  frame: DrawFrame,
  art: ChibiForestArtV7,
  cell: ChibiForestCellV7,
  snow: ChibiForestSnowV7 | null,
): void {
  for (const band of cell.bands) {
    const image = art.band(
      band.piece.shape,
      band.piece.variant,
      band.column,
      band.row,
    );
    if (image === null) continue;
    const origin = {
      x: band.piece.x + band.column,
      y: band.piece.y + band.row,
    };
    // The tops of the trees of the cells under the band: a column whose
    // own cell is unexplored shows none (pulp_wars-2yc.28).
    const fogAt = frame.fogAt ?? null;
    let from = 0;
    while (from < band.columns) {
      if (fogAt !== null && fogAt(origin.x + from, origin.y)) {
        from += 1;
        continue;
      }
      let to = from;
      while (
        to + 1 < band.columns &&
        !(fogAt !== null && fogAt(origin.x + to + 1, origin.y))
      )
        to += 1;
      const whole = from === 0 && to === band.columns - 1;
      blitShareV7(
        context,
        frame,
        image,
        { x: origin.x + from, y: origin.y },
        { x: 0, y: -UP, width: (to - from + 1) * CELL, height: UP },
        whole ? undefined : { x: from * CELL, y: 0 },
      );
      from = to + 1;
    }
    // The band belongs to the trees of the row under it.
    blitCaps(context, frame, snow, image, origin, band.columns, 1, -UP, UP);
  }
}
