import { forestHashV7 } from "./chibi-forest-packing-v7";
import {
  chibiForestRectV7,
  type ChibiForestRasterEnvironmentV7,
  type ChibiForestSnowV7,
} from "./chibi-forest-v7";
import { chibiMasterScale, isWholeScale } from "./chibi-geometry-v7";
import type { CameraState } from "./geometry";

/**
 * Mountains as massifs (bead pulp_wars-2o7.1, docs/art/COMPOSED_TERRAIN.md).
 * A group of Mountain cells is drawn as one mountain mass: every row of the
 * group is covered by ridges two cells wide and single mountains, each
 * piece's rock filling its footprint from side to side and down to its
 * foot, and a row whose cells have Mountain above them takes TALL pieces,
 * whose peaks rise up to 48 px over the row behind. Row over row, the
 * peaks of the front rows cover the feet of the rows behind them, so a
 * block two cells wide and three deep reads as one massif, not as peaks
 * standing on a rocky plane.
 *
 * - **Low pieces** rise at most 13 px above their footprint, the most the
 *   old single mountain did. They stand wherever the cell above is not a
 *   plain Mountain: the top row of an area, and under a Mine or a feature
 *   cell. Their 13 px band is drawn in the foreground at the cell's turn,
 *   as the old overflow was.
 * - **Tall pieces** are drawn whole, peaks included, in the body pass:
 *   after the Roads and under every unit and building. A unit standing on
 *   the Mountain behind them is therefore drawn over their peaks and stays
 *   whole.
 * - A Mine's cell draws the mined mountain; a Mountain cell with Ore, a
 *   Treasure, a curiosity, a Grave, a Field Defense or a settlement draws a
 *   low single mountain. Neither is part of a ridge and the piece south of
 *   either stays low, so nothing covers what stands there.
 *
 * The cover is a pure function of the explored Mountain cells and their
 * coordinates: a map always draws the same massifs, and nothing is drawn
 * from cells the player has not seen.
 */

const CELL = 80;
/** Rows above the footprint in a low piece's image (and the Mine's). */
export const MASSIF_LOW_UP_V7 = 24;
/** Rows above the footprint in a tall piece's image. */
export const MASSIF_TALL_UP_V7 = 48;

/** One piece of the set: `columns` cells wide, low or tall. */
export interface ChibiMassifPieceAssetV7 {
  readonly id: string;
  readonly columns: 1 | 2;
  readonly tall: boolean;
  readonly variant: number;
  /** columns x 80 by 80 + 24 (low) or 80 + 48 (tall). */
  readonly width: number;
  readonly height: number;
  readonly url: string;
}

export interface ChibiMassifArtSetV7 {
  readonly pieces: readonly ChibiMassifPieceAssetV7[];
  /** The mined mountains, 80 x 104 each. */
  readonly mined: readonly { readonly id: string; readonly url: string }[];
}

/** Variants per kind of piece. */
export interface MassifVariantCountsV7 {
  readonly low1: number;
  readonly low2: number;
  readonly tall1: number;
  readonly tall2: number;
}

export interface MassifPlacementV7 {
  /** The piece's west cell. */
  readonly x: number;
  readonly y: number;
  readonly columns: 1 | 2;
  readonly tall: boolean;
  readonly variant: number;
}

const key = (x: number, y: number): string => `${x},${y}`;

const countOf = (
  counts: MassifVariantCountsV7,
  columns: 1 | 2,
  tall: boolean,
): number =>
  columns === 2
    ? tall
      ? counts.tall2
      : counts.low2
    : tall
      ? counts.tall1
      : counts.low1;

/**
 * The cover of the plain Mountain cells `cells`: row by row, each run of
 * neighbouring cells becomes ridges with a single mountain where the run is
 * odd, laid like bricks (an even run in an odd row starts and ends with a
 * single), so the ridges of one row never line up with those of the next. A
 * piece is tall when every cell above it is in `cells` too. No piece takes
 * the variant of the piece west of it or of the pieces above it.
 */
export function packMassifV7(
  cells: readonly (readonly [number, number])[],
  counts: MassifVariantCountsV7,
): MassifPlacementV7[] {
  const plain = new Set(cells.map(([x, y]) => key(x, y)));
  const placed: MassifPlacementV7[] = [];
  /** Kind and variant of the piece on each covered cell. */
  const taken = new Map<string, string>();
  const place = (x: number, y: number, wanted: 1 | 2): void => {
    const columns: 1 | 2 = wanted === 2 && counts.low2 > 0 ? 2 : 1;
    if (wanted === 2 && columns === 1) {
      place(x, y, 1);
      place(x + 1, y, 1);
      return;
    }
    let tall = true;
    for (let column = 0; column < columns; column += 1)
      if (!plain.has(key(x + column, y - 1))) tall = false;
    if (countOf(counts, columns, tall) === 0) tall = false;
    const count = Math.max(1, countOf(counts, columns, tall));
    const kind = `${columns}${tall ? "T" : "L"}`;
    const near = new Set([
      taken.get(key(x - 1, y)),
      taken.get(key(x, y - 1)),
      taken.get(key(x + columns - 1, y - 1)),
    ]);
    let variant = forestHashV7(x, y, columns + (tall ? 5 : 0), 0x4d) % count;
    for (let step = 0; step < count; step += 1) {
      const candidate = (variant + step) % count;
      if (!near.has(`${kind}#${candidate}`)) {
        variant = candidate;
        break;
      }
    }
    for (let column = 0; column < columns; column += 1)
      taken.set(key(x + column, y), `${kind}#${variant}`);
    placed.push({ x, y, columns, tall, variant });
  };
  const rows = new Map<number, number[]>();
  for (const [x, y] of cells) rows.set(y, [...(rows.get(y) ?? []), x]);
  for (const y of [...rows.keys()].sort((a, b) => a - b)) {
    const xs = [...new Set(rows.get(y) ?? [])].sort((a, b) => a - b);
    let start = 0;
    while (start < xs.length) {
      let end = start;
      while (end + 1 < xs.length && xs[end + 1] === (xs[end] ?? 0) + 1)
        end += 1;
      const x0 = xs[start] ?? 0;
      const length = end - start + 1;
      // Where the run's single mountains go: an odd run has one, at the
      // end the row's parity picks; an even run of four or more in an odd
      // row has one at each end.
      const odd = (((x0 + y) % 2) + 2) % 2 === 1;
      const lead =
        length % 2 === 1 ? (odd ? 1 : 0) : length >= 4 && odd ? 1 : 0;
      let x = x0;
      if (lead === 1) {
        place(x, y, 1);
        x += 1;
      }
      while (x + 1 <= x0 + length - 1) {
        place(x, y, 2);
        x += 2;
      }
      if (x <= x0 + length - 1) place(x, y, 1);
      start = end + 1;
    }
  }
  return placed;
}

/** Plan entry kinds that make a Mountain cell a feature cell. */
const FEATURE_KINDS: ReadonlySet<string> = new Set([
  "RESOURCE",
  "IMPROVEMENT",
  "SITE",
  "CITY",
  "TREASURE",
  "CURIOSITY",
  "GRAVE",
  "FIELD_DEFENSE",
]);

interface MassifPlanEntry {
  readonly kind: string;
  readonly at: { readonly x: number; readonly y: number };
  readonly artSubject?: string;
}

export interface ChibiMassifCellV7 {
  /** A Mine: the index of its mined mountain, else null. */
  readonly mined: number | null;
  /** Pieces drawn at this cell's turn in the body pass (their east cell). */
  readonly bodies: readonly MassifPlacementV7[];
  /** The low piece whose band this cell draws in the foreground. */
  readonly band: {
    readonly piece: MassifPlacementV7;
    readonly column: number;
  } | null;
}

/** What every explored Mountain and Mined Mountain cell draws, by "x,y". */
export function chibiMassifCellsV7(
  entries: readonly MassifPlanEntry[],
  counts: MassifVariantCountsV7,
  minedCount: number,
): ReadonlyMap<string, ChibiMassifCellV7> {
  const mined = new Set<string>();
  const mountain = new Set<string>();
  const featured = new Set<string>();
  for (const entry of entries) {
    const at = key(entry.at.x, entry.at.y);
    if (entry.kind === "TERRAIN") {
      if (entry.artSubject === "TERRAIN:MINED_MOUNTAIN" && minedCount > 0)
        mined.add(at);
      else if (entry.artSubject === "TERRAIN:MOUNTAIN") mountain.add(at);
    } else if (FEATURE_KINDS.has(entry.kind)) featured.add(at);
  }
  const result = new Map<string, ChibiMassifCellV7>();
  for (const at of mined) {
    const [x = 0, y = 0] = at.split(",").map(Number);
    result.set(at, {
      mined: forestHashV7(x, y, 9, 0x3d) % minedCount,
      bodies: [],
      band: null,
    });
  }
  if (mountain.size === 0) return result;
  const coords = [...mountain].map(
    (at) => at.split(",").map(Number) as [number, number],
  );
  const placements = [
    ...packMassifV7(
      coords.filter(([x, y]) => !featured.has(key(x, y))),
      counts,
    ),
    // A feature cell: a low single mountain outside every ridge.
    ...coords
      .filter(([x, y]) => featured.has(key(x, y)))
      .map(([x, y]) => ({
        x,
        y,
        columns: 1 as const,
        tall: false,
        variant: (((x + y) % counts.low1) + counts.low1) % counts.low1,
      })),
  ];
  const bodies = new Map<string, MassifPlacementV7[]>();
  const bands = new Map<string, ChibiMassifCellV7["band"]>();
  for (const piece of placements) {
    const anchor = key(piece.x + piece.columns - 1, piece.y);
    bodies.set(anchor, [...(bodies.get(anchor) ?? []), piece]);
    if (!piece.tall)
      for (let column = 0; column < piece.columns; column += 1)
        bands.set(key(piece.x + column, piece.y), { piece, column });
  }
  for (const at of mountain)
    result.set(at, {
      mined: null,
      bodies: bodies.get(at) ?? [],
      band: bands.get(at) ?? null,
    });
  return result;
}

// ------------------------------------------------------------------- art

export interface ChibiMassifArtV7 {
  readonly counts: MassifVariantCountsV7;
  readonly minedCount: number;
  /**
   * What a piece draws in the body pass: a low piece its footprint, a tall
   * piece its whole image (`up` master rows above the footprint).
   */
  body(piece: MassifPlacementV7): {
    readonly image: CanvasImageSource;
    readonly up: number;
  } | null;
  /** The 24 px band above one column of a low piece. */
  band(piece: MassifPlacementV7, column: number): CanvasImageSource | null;
  mined(index: number): {
    readonly body: CanvasImageSource;
    readonly band: CanvasImageSource;
  } | null;
}

const pieceKey = (columns: number, tall: boolean, variant: number): string =>
  `${columns}${tall ? "T" : "L"}#${variant}`;

/**
 * Loads the massif set and cuts it into the rasters the board draws. The
 * result is null while the rasters load, and for good when a load or a
 * pixel readback fails: every Mountain cell then draws its single mountain
 * as before.
 */
export function createChibiMassifArtV7(input: {
  readonly environment: ChibiForestRasterEnvironmentV7;
  readonly redraw: () => void;
  readonly set: ChibiMassifArtSetV7;
}): { resolve(): ChibiMassifArtV7 | null } {
  const { environment, set } = input;
  let state: "IDLE" | "LOADING" | "FAILED" | "READY" = "IDLE";
  let art: ChibiMassifArtV7 | null = null;
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

  const build = (): ChibiMassifArtV7 | null => {
    const counts = { low1: 0, low2: 0, tall1: 0, tall2: 0 };
    const bodies = new Map<string, { image: CanvasImageSource; up: number }>();
    const bands = new Map<string, CanvasImageSource>();
    for (const piece of set.pieces) {
      const image = images.get(piece.url);
      if (image === undefined) return null;
      const up = piece.tall ? MASSIF_TALL_UP_V7 : MASSIF_LOW_UP_V7;
      if (piece.width !== piece.columns * CELL || piece.height !== CELL + up)
        return null;
      const pixels = environment.readPixels(image, piece.width, piece.height);
      if (pixels === null) return null;
      const id = pieceKey(piece.columns, piece.tall, piece.variant);
      if (piece.tall) {
        const surface = slice(
          pixels,
          piece.width,
          0,
          0,
          piece.width,
          piece.height,
        );
        if (surface === null) return null;
        bodies.set(id, { image: surface, up });
      } else {
        const surface = slice(pixels, piece.width, 0, up, piece.width, CELL);
        if (surface === null) return null;
        bodies.set(id, { image: surface, up: 0 });
        for (let column = 0; column < piece.columns; column += 1) {
          const band = slice(pixels, piece.width, column * CELL, 0, CELL, up);
          if (band === null) return null;
          bands.set(`${id}@${column}`, band);
        }
      }
      const slot =
        piece.columns === 2
          ? piece.tall
            ? "tall2"
            : "low2"
          : piece.tall
            ? "tall1"
            : "low1";
      counts[slot] = Math.max(counts[slot], piece.variant + 1);
    }
    if (counts.low1 === 0) return null;
    const mined: { body: CanvasImageSource; band: CanvasImageSource }[] = [];
    for (const piece of set.mined) {
      const image = images.get(piece.url);
      if (image === undefined) return null;
      const pixels = environment.readPixels(
        image,
        CELL,
        CELL + MASSIF_LOW_UP_V7,
      );
      if (pixels === null) return null;
      const body = slice(pixels, CELL, 0, MASSIF_LOW_UP_V7, CELL, CELL);
      const band = slice(pixels, CELL, 0, 0, CELL, MASSIF_LOW_UP_V7);
      if (body === null || band === null) return null;
      mined.push({ body, band });
    }
    return {
      counts,
      minedCount: mined.length,
      body: (piece) =>
        bodies.get(pieceKey(piece.columns, piece.tall, piece.variant)) ?? null,
      band: (piece, column) =>
        bands.get(
          `${pieceKey(piece.columns, piece.tall, piece.variant)}@${column}`,
        ) ?? null,
      mined: (index) => mined[index] ?? null,
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
        const urls = [
          ...new Set([
            ...set.pieces.map((piece) => piece.url),
            ...set.mined.map((piece) => piece.url),
          ]),
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
}

function blit(
  context: CanvasRenderingContext2D,
  frame: DrawFrame,
  image: CanvasImageSource,
  rect: { x: number; y: number; width: number; height: number },
  source?: { x: number; y: number; width: number; height: number },
): void {
  context.save();
  context.globalAlpha = frame.sceneAlpha;
  // The live rule: smoothing only at a fractional device scale (zoom 0.75).
  context.imageSmoothingEnabled = !isWholeScale(
    chibiMasterScale(frame.camera) * frame.devicePixelRatio,
  );
  if (source === undefined)
    context.drawImage(image, rect.x, rect.y, rect.width, rect.height);
  else
    context.drawImage(
      image,
      source.x,
      source.y,
      source.width,
      source.height,
      rect.x,
      rect.y,
      rect.width,
      rect.height,
    );
  context.restore();
}

/**
 * The pieces a cell draws after the Roads and under every unit and
 * building: the footprint of a low piece, the whole of a tall one. On Snow
 * each column carries its caps when its own cell is Snow.
 */
export function drawChibiMassifBodiesV7(
  context: CanvasRenderingContext2D,
  frame: DrawFrame,
  art: ChibiMassifArtV7,
  cell: ChibiMassifCellV7,
  snow: ChibiForestSnowV7 | null,
): void {
  for (const piece of cell.bodies) {
    const body = art.body(piece);
    if (body === null) continue;
    const height = CELL + body.up;
    blit(
      context,
      frame,
      body.image,
      chibiForestRectV7(frame, piece, {
        x: 0,
        y: -body.up,
        width: piece.columns * CELL,
        height,
      }),
    );
    if (snow === null) continue;
    let caps: CanvasImageSource | null | undefined;
    for (let column = 0; column < piece.columns; column += 1) {
      if (!snow.snowAt(piece.x + column, piece.y)) continue;
      if (caps === undefined) caps = snow.caps(body.image);
      if (caps === null) break;
      blit(
        context,
        frame,
        caps,
        chibiForestRectV7(
          frame,
          { x: piece.x + column, y: piece.y },
          { x: 0, y: -body.up, width: CELL, height },
        ),
        { x: column * CELL, y: 0, width: CELL, height },
      );
    }
  }
}

/** The band of a low piece over this cell, in the foreground. */
export function drawChibiMassifBandV7(
  context: CanvasRenderingContext2D,
  frame: DrawFrame,
  art: ChibiMassifArtV7,
  at: { readonly x: number; readonly y: number },
  cell: ChibiMassifCellV7,
  snow: ChibiForestSnowV7 | null,
): void {
  if (cell.band === null) return;
  const image = art.band(cell.band.piece, cell.band.column);
  if (image === null) return;
  const rect = chibiForestRectV7(frame, at, {
    x: 0,
    y: -MASSIF_LOW_UP_V7,
    width: CELL,
    height: MASSIF_LOW_UP_V7,
  });
  blit(context, frame, image, rect);
  if (snow === null || !snow.snowAt(at.x, at.y)) return;
  const caps = snow.caps(image);
  if (caps !== null) blit(context, frame, caps, rect);
}

/**
 * A Mine's cell: the mined mountain's cell part, or the band above it.
 * `tint` is the building saturation of the live look.
 */
export function drawChibiMassifMinedV7(
  context: CanvasRenderingContext2D,
  frame: DrawFrame,
  art: ChibiMassifArtV7,
  at: { readonly x: number; readonly y: number },
  index: number,
  part: "BODY" | "BAND",
  snow: ChibiForestSnowV7 | null,
  tint: (image: CanvasImageSource) => CanvasImageSource,
): void {
  const mined = art.mined(index);
  if (mined === null) return;
  const image = tint(part === "BODY" ? mined.body : mined.band);
  const rect = chibiForestRectV7(
    frame,
    at,
    part === "BODY"
      ? { x: 0, y: 0, width: CELL, height: CELL }
      : {
          x: 0,
          y: -MASSIF_LOW_UP_V7,
          width: CELL,
          height: MASSIF_LOW_UP_V7,
        },
  );
  blit(context, frame, image, rect);
  if (snow === null || !snow.snowAt(at.x, at.y)) return;
  const caps = snow.caps(image);
  if (caps !== null) blit(context, frame, caps, rect);
}
