/**
 * Ships sitting in the water (bead pulp_wars-oiu5; the user chose the
 * ghost hull over regenerated sprites). The faction ships are drawn whole, keel and all, so on
 * a water tile they seem to float above it. A ship sprite listed here is
 * drawn lower, with the part of its hull under the water hidden, the same
 * look the derived submerged Submarines have
 * (scripts/art/naval-branch/submerged.ts), but done at draw time so it
 * needs no second raster:
 *
 * - the sprite sinks by `sinkRows` master rows, so the waterline stays on
 *   the row of its keel (the line the ship touched the water before);
 * - the hull under the waterline is a faint ghost (GHOST: the water of the
 *   tile shows through it, whatever its depth) or not drawn at all (CUT);
 * - a line of pale foam is drawn where the hull meets the water, a pixel
 *   wider on each side, with a broken line under it;
 * - a faint ring of foam lies on the water round the hull at the
 *   waterline (its far half behind the ship, its near half in front), so
 *   the hull reads as standing in the water, in the tile's own colour.
 *
 * It is opt-in per sprite (by asset id, with each sprite's own depth); the
 * derived submerged Submarines already show their waterline and are not
 * listed. It is drawn only when the visual direction asks for it
 * (`navalWaterline`): GHOST in the live look, never in the Classic look.
 */

/** How the hull under the waterline is drawn. */
export type NavalWaterlineStyleV7 = "GHOST" | "CUT";

/** One ship sprite's waterline, in master pixels. */
export interface NavalWaterlineSpecV7 {
  /** Rows the sprite sinks: how much of the hull goes under the water. */
  readonly sinkRows: number;
}

/** The ship sprites drawn in the water, by asset id. */
export const NAVAL_WATERLINE_SPECS_V7: Readonly<
  Record<string, NavalWaterlineSpecV7>
> = {
  // Every faction's Patrol Boat, Battleship and embarked transport, each
  // depth chosen on its own master (the review sheet of
  // scripts/art/naval-waterline-review.ts --sprites): at most about the
  // bottom quarter of the visible hull goes under, and the deck, guns,
  // oars and crew stay whole (the user, bead pulp_wars-oiu5). The
  // Submarines are not listed: their submerged sprite already sits in the
  // water.
  "chibi-naval-human-patrol-boat": { sinkRows: 6 },
  "chibi-naval-human-battleship": { sinkRows: 6 },
  "chibi-naval-human-transport": { sinkRows: 3 },
  "chibi-naval-undead-patrol-boat": { sinkRows: 6 },
  "chibi-naval-undead-battleship": { sinkRows: 6 },
  "chibi-naval-undead-transport": { sinkRows: 3 },
  "chibi-naval-goblin-patrol-boat": { sinkRows: 6 },
  "chibi-naval-goblin-battleship": { sinkRows: 7 },
  "chibi-naval-goblin-transport": { sinkRows: 3 },
  "chibi-naval-dinosaur-patrol-boat": { sinkRows: 4 },
  "chibi-naval-dinosaur-battleship": { sinkRows: 4 },
  "chibi-naval-dinosaur-transport": { sinkRows: 3 },
  "chibi-naval-martian-patrol-boat": { sinkRows: 4 },
  "chibi-naval-martian-battleship": { sinkRows: 6 },
  "chibi-naval-martian-transport": { sinkRows: 3 },
  "chibi-naval-ice-folk-patrol-boat": { sinkRows: 3 },
  "chibi-naval-ice-folk-battleship": { sinkRows: 5 },
  "chibi-naval-ice-folk-transport": { sinkRows: 3 },
  "chibi-naval-dwarf-patrol-boat": { sinkRows: 4 },
  "chibi-naval-dwarf-battleship": { sinkRows: 4 },
  "chibi-naval-dwarf-transport": { sinkRows: 3 },
  "chibi-naval-candy-patrol-boat": { sinkRows: 5 },
  "chibi-naval-candy-battleship": { sinkRows: 5 },
  "chibi-naval-candy-transport": { sinkRows: 3 },
  "chibi-naval-cult-patrol-boat": { sinkRows: 3 },
  "chibi-naval-cult-battleship": { sinkRows: 5 },
  "chibi-naval-cult-transport": { sinkRows: 3 },
};

/** Alpha of the hull under the waterline in the GHOST style (of 1). */
export const NAVAL_WATERLINE_GHOST_ALPHA_V7 = 72 / 255;
/** The foam where the hull meets the water (the Submarines' foam). */
export const NAVAL_WATERLINE_FOAM_V7 = "#f1fbff";
const FOAM_ALPHA = 235 / 255;
const FOAM_UNDER_ALPHA = 150 / 255;
/** The ring round the hull: alpha, and its size from the hull's width. */
const RING_ALPHA = 0.5;
const RING_OVERHANG_PX = 5;
const RING_FLATNESS = 0.26;

/**
 * Where a sunk sprite meets the water, in master pixels of the unsunk
 * sprite: `keel` is its lowest opaque row (the waterline on the board),
 * and `left`/`right` the opaque extent of the hull row that lands on it.
 */
export interface NavalWaterlineGeometryV7 {
  readonly sinkRows: number;
  readonly keel: number;
  readonly left: number;
  readonly right: number;
}

/**
 * The waterline of a sprite from its alpha channel (`alpha(x, y)` of 255,
 * master pixels). Null when the sprite has no hull row to put on the water.
 */
export function navalWaterlineGeometryV7(
  width: number,
  height: number,
  alpha: (x: number, y: number) => number,
  spec: NavalWaterlineSpecV7,
): NavalWaterlineGeometryV7 | null {
  let keel = -1;
  for (let y = height - 1; y >= 0 && keel < 0; y -= 1)
    for (let x = 0; x < width; x += 1)
      if (alpha(x, y) >= 128) {
        keel = y;
        break;
      }
  const row = keel - spec.sinkRows;
  if (keel < 0 || row < 0) return null;
  let left = width;
  let right = -1;
  for (let x = 0; x < width; x += 1)
    if (alpha(x, row) >= 128) {
      left = Math.min(left, x);
      right = Math.max(right, x);
    }
  if (right < left) return null;
  return { sinkRows: spec.sinkRows, keel, left, right };
}

const GEOMETRY = new WeakMap<object, NavalWaterlineGeometryV7 | null>();

/**
 * The waterline of a listed sprite as drawn (measured once per raster).
 * Null when the asset is not listed, the raster has not loaded or cannot
 * be read (no document, as in unit tests): the sprite is then drawn whole.
 */
export function navalWaterlineOfV7(
  assetId: string,
  image: CanvasImageSource,
  master: { readonly width: number; readonly height: number },
): NavalWaterlineGeometryV7 | null {
  const spec = NAVAL_WATERLINE_SPECS_V7[assetId];
  if (spec === undefined || typeof image !== "object" || image === null)
    return null;
  const cached = GEOMETRY.get(image);
  if (cached !== undefined) return cached;
  const source = image as {
    readonly naturalWidth?: number;
    readonly naturalHeight?: number;
    readonly width?: number | object;
    readonly height?: number | object;
  };
  const width =
    source.naturalWidth ??
    (typeof source.width === "number" ? source.width : 0);
  const height =
    source.naturalHeight ??
    (typeof source.height === "number" ? source.height : 0);
  if (!(width > 0 && height > 0)) return null;
  const document = (globalThis as { readonly document?: Document }).document;
  if (document === undefined) return null;
  let geometry: NavalWaterlineGeometryV7 | null = null;
  try {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const scratch = canvas.getContext("2d", { willReadFrequently: true });
    if (scratch !== null) {
      scratch.drawImage(image, 0, 0);
      const { data } = scratch.getImageData(0, 0, width, height);
      // A density copy (2x, 3x) is measured on its master grid.
      const density = Math.max(1, Math.round(width / master.width));
      geometry = navalWaterlineGeometryV7(
        master.width,
        master.height,
        (x, y) => data[(y * density * width + x * density) * 4 + 3] ?? 0,
        spec,
      );
    }
  } catch {
    geometry = null;
  }
  GEOMETRY.set(image, geometry);
  return geometry;
}

/** A sprite's destination rectangle on the board, in canvas pixels. */
export interface NavalWaterlineRectV7 {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/**
 * Draws a ship sprite in the water: sunk, the hull under the waterline a
 * ghost (or cut), with foam on the waterline. `rect` is where the sprite
 * would be drawn whole; the rectangle it was drawn at (sunk) is returned,
 * for the markers placed on the sprite after it. The caller sets the
 * alpha and smoothing of the sprite.
 */
export function drawNavalWaterlineSpriteV7(
  context: CanvasRenderingContext2D,
  image: CanvasImageSource,
  rect: NavalWaterlineRectV7,
  masterHeight: number,
  geometry: NavalWaterlineGeometryV7,
  style: NavalWaterlineStyleV7,
): NavalWaterlineRectV7 {
  const unit = rect.height / masterHeight;
  const sunk = { ...rect, y: rect.y + geometry.sinkRows * unit };
  const ring = (near: boolean): void => {
    const radiusX =
      ((geometry.right - geometry.left + 1) / 2 + RING_OVERHANG_PX) * unit;
    context.save();
    context.globalAlpha *= RING_ALPHA;
    context.strokeStyle = NAVAL_WATERLINE_FOAM_V7;
    context.lineWidth = unit;
    context.beginPath();
    context.ellipse(
      rect.x + ((geometry.left + geometry.right + 1) / 2) * unit,
      rect.y + (geometry.keel + 0.5) * unit,
      radiusX,
      radiusX * RING_FLATNESS,
      0,
      near ? 0 : Math.PI,
      near ? Math.PI : Math.PI * 2,
    );
    context.stroke();
    context.restore();
  };
  ring(false);
  // The keel row is the first row under the water; the foam covers it.
  const water = rect.y + (geometry.keel + 1) * unit;
  const reach = rect.width;
  context.save();
  context.beginPath();
  context.rect(
    rect.x - reach,
    rect.y - rect.height,
    rect.width + 2 * reach,
    water - (rect.y - rect.height),
  );
  context.clip();
  context.drawImage(image, sunk.x, sunk.y, sunk.width, sunk.height);
  context.restore();
  if (style === "GHOST") {
    context.save();
    context.beginPath();
    context.rect(
      rect.x - reach,
      water,
      rect.width + 2 * reach,
      sunk.y + sunk.height - water,
    );
    context.clip();
    context.globalAlpha *= NAVAL_WATERLINE_GHOST_ALPHA_V7;
    context.drawImage(image, sunk.x, sunk.y, sunk.width, sunk.height);
    context.restore();
  }
  // The foam: the keel row from one pixel left of the hull to one right,
  // then three pixels in five of the row under it.
  const base = context.globalAlpha;
  context.save();
  context.fillStyle = NAVAL_WATERLINE_FOAM_V7;
  context.globalAlpha = base * FOAM_ALPHA;
  context.fillRect(
    rect.x + (geometry.left - 1) * unit,
    rect.y + geometry.keel * unit,
    (geometry.right - geometry.left + 3) * unit,
    unit,
  );
  context.globalAlpha = base * FOAM_UNDER_ALPHA;
  for (let x = geometry.left - 1; x <= geometry.right + 1; x += 1)
    if ((x - geometry.left + 5) % 5 < 3)
      context.fillRect(
        rect.x + x * unit,
        rect.y + (geometry.keel + 1) * unit,
        unit,
        unit,
      );
  context.restore();
  ring(true);
  return sunk;
}
