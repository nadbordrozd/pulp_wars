/**
 * Programmatic Goblin unit placeholders (bead pulp_wars-0ao.4, spec
 * RULESET_7_REVISION_17_GOBLINS.md section 11.4). Each of the eight Goblin
 * land units is drawn from simple pixel shapes in the palette of
 * docs/art/factions/GOBLIN.md, on its Human role's chibi canvas with the
 * class anchor, a one-pixel black outline and an owner area painted in the
 * exact key colour #d8262c on garments or vehicle panels (never skin).
 *
 * Everything here is deterministic: no randomness, no clock, no PixelLab.
 * The CLI (scripts/art/goblin-placeholders.ts) writes the PNGs, masks and
 * records; tests re-render and compare pixel hashes. Bead pulp_wars-0ao.8
 * replaces these placeholders with reviewed PixelLab sprites.
 */
import type { ChibiAssetClassV7 } from "../../../src/assets/chibi-art-v7";
import type { UnitRoleIdV7 } from "../../../src/engine/index";
import {
  extractOwnerMask,
  ownerMaskQa,
  type BinaryMask,
  type MaskQaReport,
  type RgbaRaster,
} from "./owner-mask";

export const GOBLIN_PLACEHOLDER_BEAD = "pulp_wars-0ao.4";
export const GOBLIN_PLACEHOLDER_REPLACED_BY = "pulp_wars-0ao.8";
export const GOBLIN_PLACEHOLDER_RECORDS =
  "scripts/art/chibi/placeholders/goblin-placeholders.json";
export const GOBLIN_PLACEHOLDER_OUTPUT_DIR = "public/assets/chibi/placeholders";
export const GOBLIN_PLACEHOLDER_REVIEW_DIR =
  "art/pixellab/reviews/chibi-goblin-placeholders";

type Rgb = readonly [number, number, number];

function hex(value: string): Rgb {
  const parsed = Number.parseInt(value.slice(1), 16);
  return [(parsed >> 16) & 255, (parsed >> 8) & 255, parsed & 255];
}

/** The GOBLIN.md palette, plus the shared black outline and owner key. */
export const GOBLIN_PLACEHOLDER_PALETTE = {
  key: "#d8262c",
  black: "#000000",
  goblinSkin: "#9aa83e",
  goblinShade: "#6c7a2a",
  orcSkin: "#6f7a52",
  orcShade: "#4d5639",
  trollSkin: "#8a9488",
  trollShade: "#5f685e",
  moss: "#56642c",
  ironDark: "#3a4250",
  ironMid: "#6d7684",
  ironLight: "#aeb6c2",
  charcoal: "#33363d",
  cream: "#efe6c8",
  spark: "#fff8d0",
} as const;

const P = Object.fromEntries(
  Object.entries(GOBLIN_PLACEHOLDER_PALETTE).map(([name, value]) => [
    name,
    hex(value),
  ]),
) as Record<keyof typeof GOBLIN_PLACEHOLDER_PALETTE, Rgb>;

// ------------------------------------------------------------------ shapes

/** A shape tests a pixel by its centre. */
type Shape = (x: number, y: number) => boolean;

const ellipse =
  (cx: number, cy: number, rx: number, ry: number): Shape =>
  (x, y) =>
    ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1;

/** Inclusive pixel rectangle. */
const rect =
  (x0: number, y0: number, x1: number, y1: number): Shape =>
  (x, y) =>
    x >= x0 && x <= x1 && y >= y0 && y <= y1;

const poly =
  (points: readonly (readonly [number, number])[]): Shape =>
  (x, y) => {
    const px = x + 0.5;
    const py = y + 0.5;
    let inside = false;
    for (let i = 0, j = points.length - 1; i < points.length; j = i, i += 1) {
      const [xi, yi] = points[i] ?? [0, 0];
      const [xj, yj] = points[j] ?? [0, 0];
      if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi)
        inside = !inside;
    }
    return inside;
  };

/** A thick segment with round ends. */
const line =
  (x0: number, y0: number, x1: number, y1: number, width: number): Shape =>
  (x, y) => {
    const px = x + 0.5;
    const py = y + 0.5;
    const dx = x1 - x0;
    const dy = y1 - y0;
    const length = dx * dx + dy * dy;
    const t =
      length === 0
        ? 0
        : Math.max(0, Math.min(1, ((px - x0) * dx + (py - y0) * dy) / length));
    return Math.hypot(px - (x0 + t * dx), py - (y0 + t * dy)) <= width / 2;
  };

const union =
  (...shapes: readonly Shape[]): Shape =>
  (x, y) =>
    shapes.some((shape) => shape(x, y));

const minus =
  (shape: Shape, cut: Shape): Shape =>
  (x, y) =>
    shape(x, y) && !cut(x, y);

const clip =
  (shape: Shape, within: Shape): Shape =>
  (x, y) =>
    shape(x, y) && within(x, y);

// ------------------------------------------------------------------ canvas

interface PartOptions {
  /** Colour of the lower-right rim (depth 2), if any. */
  readonly shade?: Rgb;
  /** Colour of the upper-left rim (depth 1), if any. */
  readonly light?: Rgb;
  /** Draw the one-pixel black outline around the part (default true). */
  readonly outline?: boolean;
}

class PixelCanvas {
  readonly data: Uint8Array;

  constructor(
    readonly width: number,
    readonly height: number,
  ) {
    this.data = new Uint8Array(width * height * 4);
  }

  set(x: number, y: number, colour: Rgb): void {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return;
    const offset = (y * this.width + x) * 4;
    this.data[offset] = colour[0];
    this.data[offset + 1] = colour[1];
    this.data[offset + 2] = colour[2];
    this.data[offset + 3] = 255;
  }

  /** Paints a shape back to front: black outline ring, fill, rims. */
  part(shape: Shape, fill: Rgb, options: PartOptions = {}): void {
    const { width, height } = this;
    const inside = new Uint8Array(width * height);
    for (let y = 0; y < height; y += 1)
      for (let x = 0; x < width; x += 1)
        if (shape(x, y)) inside[y * width + x] = 1;
    const at = (x: number, y: number): boolean =>
      x >= 0 &&
      y >= 0 &&
      x < width &&
      y < height &&
      inside[y * width + x] === 1;
    if (options.outline !== false)
      for (let y = 0; y < height; y += 1)
        for (let x = 0; x < width; x += 1) {
          if (at(x, y)) continue;
          let near = false;
          for (let dy = -1; dy <= 1 && !near; dy += 1)
            for (let dx = -1; dx <= 1 && !near; dx += 1)
              near = at(x + dx, y + dy);
          if (near) this.set(x, y, P.black);
        }
    for (let y = 0; y < height; y += 1)
      for (let x = 0; x < width; x += 1) {
        if (!at(x, y)) continue;
        let colour = fill;
        if (options.light !== undefined && !at(x - 1, y - 1))
          colour = options.light;
        if (
          options.shade !== undefined &&
          (!at(x + 1, y + 1) || !at(x + 2, y + 2))
        )
          colour = options.shade;
        this.set(x, y, colour);
      }
  }

  /** Single pixels without an outline (eyes, stitches, rivets). */
  pixels(points: readonly (readonly [number, number])[], colour: Rgb): void {
    for (const [x, y] of points) this.set(x, y, colour);
  }

  /** A black cross stitch (3 x 3 "x") on an owner patch. */
  stitch(x: number, y: number): void {
    this.pixels(
      [
        [x - 1, y - 1],
        [x + 1, y - 1],
        [x, y],
        [x - 1, y + 1],
        [x + 1, y + 1],
      ],
      P.black,
    );
  }

  /** A cream eye with a black pupil: 3 x 3 with the pupil at the bottom right. */
  eye(x: number, y: number, size: 2 | 3 = 3): void {
    for (let dy = 0; dy < size; dy += 1)
      for (let dx = 0; dx < size; dx += 1) this.set(x + dx, y + dy, P.cream);
    this.set(x + size - 1, y + size - 1, P.black);
    if (size === 3) this.set(x + 1, y + 2, P.black);
  }
}

// ------------------------------------------------------------------ pieces

/** Sideways goblin ears: long triangles wider than the head. */
function goblinEars(
  c: PixelCanvas,
  cx: number,
  cy: number,
  reach: number,
  root: number,
  half: number,
): void {
  for (const side of [-1, 1] as const) {
    const tip = cx + side * reach;
    const base = cx + side * root;
    c.part(
      poly([
        [base, cy - half],
        [tip, cy - half - 3],
        [base, cy + half],
      ]),
      P.goblinSkin,
      { shade: P.goblinShade },
    );
    c.part(
      poly([
        [base, cy - half + 2],
        [tip - side * 4, cy - half - 1],
        [base, cy + half - 2],
      ]),
      P.goblinShade,
      { outline: false },
    );
  }
}

/** A round goblin head with eyes, a pointy nose and a jagged grin. */
function goblinFace(
  c: PixelCanvas,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
): void {
  c.part(ellipse(cx, cy, rx, ry), P.goblinSkin, { shade: P.goblinShade });
  c.eye(Math.round(cx - rx * 0.55), Math.round(cy - ry * 0.2));
  c.eye(Math.round(cx + rx * 0.2), Math.round(cy - ry * 0.2));
  // Long pointy nose, down and to the right.
  const nx = Math.round(cx);
  const ny = Math.round(cy + ry * 0.1);
  c.part(
    poly([
      [nx - 1.5, ny - 1],
      [nx + 2, ny - 1],
      [nx + 5, ny + 5],
    ]),
    P.goblinSkin,
    { shade: P.goblinShade },
  );
  // Jagged grin: a black mouth line with cream teeth.
  const my = Math.round(cy + ry * 0.55);
  const mx0 = Math.round(cx - rx * 0.5);
  const mx1 = Math.round(cx + rx * 0.5);
  for (let x = mx0; x <= mx1; x += 1) {
    c.set(x, my, P.black);
    c.set(x, my + 1, (x - mx0) % 3 === 1 ? P.cream : P.black);
  }
  c.set(mx0 - 1, my - 1, P.black);
  c.set(mx1 + 1, my - 1, P.black);
}

/** Orc head: broad, heavy jaw, two tusks from an underbite, small eyes. */
function orcFace(
  c: PixelCanvas,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  shouting: boolean,
): void {
  // Small pointed ears first, just outside the head.
  for (const side of [-1, 1] as const)
    c.part(
      poly([
        [cx + side * (rx - 2), cy - 3],
        [cx + side * (rx + 4), cy - 6],
        [cx + side * (rx - 1), cy + 3],
      ]),
      P.orcSkin,
      { shade: P.orcShade },
    );
  c.part(
    union(ellipse(cx, cy, rx, ry), ellipse(cx, cy + ry * 0.35, rx, ry * 0.7)),
    P.orcSkin,
    { shade: P.orcShade },
  );
  // Heavy brow and small grumpy eyes.
  const ey = Math.round(cy - ry * 0.15);
  for (
    let x = Math.round(cx - rx * 0.6);
    x <= Math.round(cx + rx * 0.6);
    x += 1
  )
    if (Math.abs(x - cx) > 1) c.set(x, ey - 1, P.black);
  c.eye(Math.round(cx - rx * 0.5), ey, 2);
  c.eye(Math.round(cx + rx * 0.25), ey, 2);
  // Flat nose.
  c.pixels(
    [
      [Math.round(cx) - 1, ey + 4],
      [Math.round(cx) + 1, ey + 4],
    ],
    P.black,
  );
  const my = Math.round(cy + ry * 0.55);
  if (shouting) {
    c.part(ellipse(cx, my + 1, rx * 0.4, 3.5), P.black, { outline: false });
  } else {
    for (
      let x = Math.round(cx - rx * 0.45);
      x <= Math.round(cx + rx * 0.45);
      x += 1
    )
      c.set(x, my, P.black);
  }
  // Tusks jutting up from the lower lip.
  for (const side of [-1, 1] as const) {
    const tx = Math.round(cx + side * rx * 0.45);
    c.part(
      poly([
        [tx - 1.5, my + 3],
        [tx + 1.5, my + 3],
        [tx + side * 0.5, my - 3],
      ]),
      P.cream,
    );
  }
}

// ------------------------------------------------------------------ units

export interface GoblinPlaceholderSpecV7 {
  readonly id: string;
  readonly role: Exclude<UnitRoleIdV7, "PATROL_BOAT" | "BATTLESHIP">;
  readonly name: string;
  readonly assetClass: Extract<
    ChibiAssetClassV7,
    "STANDARD_UNIT" | "LARGE_UNIT" | "GIANT_UNIT"
  >;
  readonly width: number;
  readonly height: number;
  /**
   * Anchor override, as for the Undead Ghoul, Lich and Vampire: a few px
   * right of the class default so the piece clears the HP bar and seat
   * badge. Omitted means the class anchor of the Human role.
   */
  readonly anchor?: { readonly x: number; readonly y: number };
  /** The unit's one silhouette cue (GOBLIN.md placeholder notes). */
  readonly cue: string;
  readonly draw: (c: PixelCanvas) => void;
}

function drawGoblin(c: PixelCanvas): void {
  // Big feet and short legs.
  c.part(rect(21, 62, 25, 71), P.goblinSkin, { shade: P.goblinShade });
  c.part(rect(31, 62, 35, 71), P.goblinSkin, { shade: P.goblinShade });
  c.part(ellipse(21, 73, 6, 3), P.goblinSkin, { shade: P.goblinShade });
  c.part(ellipse(36, 73, 6, 3), P.goblinSkin, { shade: P.goblinShade });
  // Left arm hanging.
  c.part(line(18, 44, 14, 58, 4), P.goblinSkin, { shade: P.goblinShade });
  // Patched tunic to the knees (owner).
  c.part(
    poly([
      [19, 38],
      [37, 38],
      [42, 64],
      [14, 64],
    ]),
    P.key,
  );
  c.part(rect(17, 50, 39, 52), P.charcoal);
  c.stitch(22, 44);
  c.stitch(34, 58);
  // Right arm up with the oversized jagged dagger.
  c.part(line(38, 44, 45, 48, 4), P.goblinSkin, { shade: P.goblinShade });
  c.part(
    poly([
      [45, 45],
      [50, 45],
      [52, 36],
      [50, 34],
      [52, 30],
      [49, 22],
      [46, 28],
      [47, 33],
      [45, 36],
    ]),
    P.ironLight,
    { shade: P.ironMid },
  );
  c.part(rect(42, 45, 53, 47), P.charcoal);
  c.part(ellipse(47.5, 50, 3, 3), P.goblinSkin, { shade: P.goblinShade });
  // Head, sideways ears and the red bandana.
  goblinEars(c, 28, 24, 26, 10, 5);
  goblinFace(c, 28, 26, 13, 12);
  c.part(clip(ellipse(28, 26, 13, 12), rect(0, 0, 55, 19)), P.key);
  c.part(
    poly([
      [38, 17],
      [46, 12],
      [44, 17],
      [47, 19],
      [39, 20],
    ]),
    P.key,
  );
}

function drawBombChucker(c: PixelCanvas): void {
  // Feet and legs.
  c.part(rect(21, 64, 25, 71), P.goblinSkin, { shade: P.goblinShade });
  c.part(rect(31, 64, 35, 71), P.goblinSkin, { shade: P.goblinShade });
  c.part(ellipse(21, 73, 6, 3), P.goblinSkin, { shade: P.goblinShade });
  c.part(ellipse(36, 73, 6, 3), P.goblinSkin, { shade: P.goblinShade });
  // Patched tunic (owner).
  c.part(
    poly([
      [17, 45],
      [39, 45],
      [44, 67],
      [12, 67],
    ]),
    P.key,
  );
  c.stitch(34, 54);
  c.stitch(24, 61);
  // Bomb satchel on the left hip with bombs peeking out.
  c.part(line(21, 46, 9, 58, 2), P.charcoal);
  c.part(ellipse(6, 58, 3, 3), P.black);
  c.part(ellipse(10, 57, 3, 3), P.black);
  c.part(rect(2, 59, 13, 67), P.charcoal, { shade: P.black });
  // Left arm.
  c.part(line(19, 50, 20, 60, 4), P.goblinSkin, { shade: P.goblinShade });
  // Head, ears, flying cap and goggles.
  goblinEars(c, 28, 32, 26, 10, 5);
  goblinFace(c, 28, 34, 13, 12);
  c.part(clip(ellipse(28, 34, 14, 13), rect(0, 0, 55, 29)), P.key);
  c.part(ellipse(23, 27, 3.5, 3.5), P.ironDark);
  c.part(ellipse(33, 27, 3.5, 3.5), P.ironDark);
  c.pixels(
    [
      [22, 26],
      [23, 26],
      [32, 26],
      [33, 26],
    ],
    P.ironLight,
  );
  // Raised right arm, in front of the ear, holding the bomb up high.
  c.part(line(38, 48, 44, 20, 4.5), P.goblinSkin, { shade: P.goblinShade });
  // The raised round black bomb with a cream fuse and a pale spark.
  c.part(ellipse(43, 18, 3.5, 3.5), P.goblinSkin, { shade: P.goblinShade });
  c.part(ellipse(40, 11, 8.5, 8.5), P.black);
  c.pixels(
    [
      [36, 7],
      [37, 7],
      [36, 8],
      [35, 9],
    ],
    P.ironMid,
  );
  c.part(line(44, 4, 47, 1.5, 1.5), P.cream, { outline: false });
  c.pixels(
    [
      [48, 0],
      [48, 1],
      [49, 1],
      [47, 1],
      [48, 2],
      [50, 0],
      [46, 0],
    ],
    P.spark,
  );
}

function drawWolfRider(c: PixelCanvas): void {
  // Bushy tail, kept right of the HP bar strip.
  c.part(
    poly([
      [14, 58],
      [8, 48],
      [7, 38],
      [13, 44],
      [19, 54],
    ]),
    P.ironDark,
    { light: P.ironMid },
  );
  // Far legs, then the body and near legs.
  c.part(rect(22, 68, 26, 80), P.ironDark);
  c.part(rect(50, 68, 54, 80), P.ironDark);
  c.part(ellipse(36, 62, 24, 10), P.ironDark, { light: P.ironMid });
  c.part(clip(ellipse(36, 64, 20, 7), rect(0, 66, 71, 87)), P.ironLight, {
    outline: false,
  });
  c.part(union(rect(15, 68, 20, 80), ellipse(18, 81, 4, 2.5)), P.ironDark, {
    light: P.ironMid,
  });
  c.part(union(rect(43, 68, 48, 80), ellipse(46, 81, 4, 2.5)), P.ironDark, {
    light: P.ironMid,
  });
  // Head with pointed ears and open jaws.
  c.part(
    poly([
      [53, 46],
      [55, 36],
      [60, 44],
    ]),
    P.ironDark,
  );
  c.part(ellipse(58, 51, 9, 8), P.ironDark, { light: P.ironMid });
  c.part(
    poly([
      [60, 47],
      [71, 50],
      [70, 53],
      [61, 54],
    ]),
    P.ironDark,
    { light: P.ironMid },
  );
  c.part(
    poly([
      [60, 57],
      [70, 58],
      [69, 61],
      [59, 61],
    ]),
    P.ironDark,
  );
  c.pixels(
    [
      [66, 54],
      [67, 55],
      [63, 55],
      [69, 54],
      [65, 57],
      [68, 57],
    ],
    P.cream,
  );
  c.eye(57, 48, 2);
  // Saddle blanket over the back, hanging down both sides (owner).
  c.part(
    poly([
      [24, 50],
      [46, 50],
      [48, 70],
      [22, 70],
    ]),
    P.key,
  );
  c.stitch(28, 64);
  c.stitch(42, 57);
  // The rider: tunic, short spear, head with sideways ears and bandana.
  c.part(
    poly([
      [29, 38],
      [42, 38],
      [44, 53],
      [27, 53],
    ]),
    P.key,
  );
  c.part(line(40, 44, 45, 40, 3.5), P.goblinSkin, { shade: P.goblinShade });
  c.part(line(42, 52, 54, 13, 2.5), P.ironMid);
  c.part(
    poly([
      [52, 16],
      [58, 5],
      [57, 13],
      [59, 15],
      [55, 18],
    ]),
    P.ironLight,
    { shade: P.ironMid },
  );
  c.part(ellipse(45.5, 39.5, 2.5, 2.5), P.goblinSkin, {
    shade: P.goblinShade,
  });
  goblinEars(c, 35, 27, 19, 8, 4);
  goblinFace(c, 35, 28, 10, 9.5);
  c.part(clip(ellipse(35, 28, 10.5, 10), rect(0, 0, 71, 22)), P.key);
}

function drawOrcBrute(c: PixelCanvas): void {
  // Charcoal boots and legs.
  c.part(rect(17, 62, 25, 70), P.orcSkin, { shade: P.orcShade });
  c.part(rect(31, 62, 39, 70), P.orcSkin, { shade: P.orcShade });
  c.part(union(rect(15, 69, 26, 74), ellipse(20, 74, 6, 2)), P.charcoal);
  c.part(union(rect(30, 69, 41, 74), ellipse(36, 74, 6, 2)), P.charcoal);
  // Broad sleeveless tunic to the knees (owner).
  c.part(
    poly([
      [11, 38],
      [45, 38],
      [48, 66],
      [8, 66],
    ]),
    P.key,
  );
  c.stitch(28, 48);
  c.stitch(38, 60);
  c.part(rect(9, 54, 47, 56), P.charcoal);
  // Right arm raised with a huge chunky cleaver.
  c.part(line(44, 42, 48, 30, 6), P.orcSkin, { shade: P.orcShade });
  c.part(rect(47, 16, 49, 30), P.charcoal);
  c.part(
    poly([
      [41, 4],
      [55, 4],
      [55, 18],
      [44, 18],
      [41, 14],
      [43, 11],
      [41, 8],
    ]),
    P.ironLight,
    { shade: P.ironMid },
  );
  c.part(ellipse(48, 29, 4, 3.5), P.orcSkin, { shade: P.orcShade });
  // Head with pot helmet and one spike.
  orcFace(c, 26, 25, 14, 11, false);
  c.part(line(26, 2, 26, 9, 3), P.ironMid);
  c.part(clip(ellipse(26, 22, 16, 12), rect(0, 0, 55, 18)), P.ironDark, {
    light: P.ironMid,
  });
  c.part(rect(9, 17, 43, 19), P.ironDark, { light: P.ironMid });
  // Round dented shield with a spiky boss on the left arm: an iron rim
  // round a painted face (owner, as GOBLIN.md allows for the Brute).
  c.part(ellipse(12, 52, 11.5, 12), P.ironDark, { light: P.ironMid });
  c.part(ellipse(12, 52, 8.5, 9), P.key, { outline: false });
  c.part(ellipse(12, 52, 4, 4), P.ironLight, { shade: P.ironMid });
  c.part(
    poly([
      [10, 51],
      [12, 44],
      [14, 51],
    ]),
    P.ironLight,
  );
  c.pixels(
    [
      [5, 46],
      [19, 46],
      [5, 58],
      [19, 58],
      [12, 62],
    ],
    P.ironLight,
  );
}

function drawOrcWarboss(c: PixelCanvas): void {
  // Big cape spread behind the shoulders (owner).
  c.part(
    poly([
      [12, 36],
      [44, 36],
      [52, 68],
      [4, 68],
    ]),
    P.key,
  );
  c.stitch(8, 62);
  c.stitch(48, 62);
  // Legs and charcoal boots.
  c.part(rect(18, 62, 25, 70), P.orcSkin, { shade: P.orcShade });
  c.part(rect(31, 62, 38, 70), P.orcSkin, { shade: P.orcShade });
  c.part(union(rect(16, 69, 26, 74), ellipse(21, 74, 6, 2)), P.charcoal);
  c.part(union(rect(30, 69, 40, 74), ellipse(35, 74, 6, 2)), P.charcoal);
  // Tunic (owner) with a belt.
  c.part(
    poly([
      [16, 40],
      [40, 40],
      [42, 66],
      [14, 66],
    ]),
    P.key,
  );
  c.stitch(22, 60);
  c.part(rect(15, 53, 41, 55), P.charcoal);
  // Raised left fist.
  c.part(line(12, 40, 6, 27, 5), P.orcSkin, { shade: P.orcShade });
  c.part(ellipse(6, 25, 4.5, 4.5), P.orcSkin, { shade: P.orcShade });
  c.pixels(
    [
      [4, 24],
      [6, 24],
      [8, 24],
    ],
    P.orcShade,
  );
  // Spiky shoulder plates.
  for (const x of [15, 41]) {
    c.part(
      poly([
        [x - 3, 36],
        [x - 1, 30],
        [x + 1, 36],
      ]),
      P.ironLight,
    );
    c.part(clip(ellipse(x, 42, 8, 6), rect(0, 0, 55, 43)), P.ironDark, {
      light: P.ironMid,
    });
  }
  // Head, shouting, with a horned helmet.
  orcFace(c, 27, 25, 13, 10, true);
  // Big curved horns: out from the helmet sides, then up.
  for (const side of [-1, 1] as const) {
    const x = (value: number): number => 27 + side * (27 - value);
    c.part(
      poly([
        [x(20), 19],
        [x(14), 19],
        [x(9), 15],
        [x(6), 8],
        [x(7), 1],
        [x(10), 7],
        [x(13), 11],
        [x(20), 13],
      ]),
      P.cream,
      { shade: P.ironLight },
    );
  }
  c.part(clip(ellipse(27, 22, 14, 11), rect(0, 0, 55, 17)), P.ironDark, {
    light: P.ironMid,
  });
  // The tin megaphone at the mouth, held in the right hand.
  c.part(
    poly([
      [33, 29],
      [53, 20],
      [55, 22],
      [55, 42],
      [53, 44],
      [33, 35],
    ]),
    P.ironLight,
    { shade: P.ironMid },
  );
  c.part(rect(52, 21, 54, 43), P.ironMid);
  c.part(ellipse(42, 38, 3.5, 3.5), P.orcSkin, { shade: P.orcShade });
}

function drawRocketCart(c: PixelCanvas): void {
  // Tiny crew goblin crouching behind the cart, covering its ears.
  // It stays right of the HP bar strip (x >= 4).
  c.part(ellipse(14, 64, 8, 6), P.key);
  goblinEars(c, 13, 51, 8, 5, 3);
  goblinFace(c, 13, 52, 6.5, 6.5);
  c.part(clip(ellipse(13, 52, 7, 7), rect(0, 0, 71, 48)), P.key);
  c.part(ellipse(7.5, 53, 2.5, 2.5), P.goblinSkin, { shade: P.goblinShade });
  c.part(ellipse(18.5, 53, 2.5, 2.5), P.goblinSkin, {
    shade: P.goblinShade,
  });
  // Crooked frame of dented plates with rivets.
  c.part(
    poly([
      [18, 58],
      [62, 56],
      [64, 70],
      [20, 72],
    ]),
    P.ironDark,
    { light: P.ironMid },
  );
  c.part(line(30, 60, 50, 36, 3), P.ironMid);
  c.pixels(
    [
      [24, 62],
      [34, 61],
      [44, 60],
      [54, 60],
      [24, 68],
      [58, 67],
    ],
    P.ironLight,
  );
  // One huge fat rocket tilted up at 45 degrees (owner), with fins, a
  // light grey nose cone, a cream fuse and a pale spark at its tail.
  c.part(
    poly([
      [22, 60],
      [16, 64],
      [18, 52],
    ]),
    P.ironLight,
    { shade: P.ironMid },
  );
  c.part(
    poly([
      [30, 66],
      [24, 70],
      [34, 72],
    ]),
    P.ironLight,
    { shade: P.ironMid },
  );
  c.part(line(26, 62, 54, 34, 14), P.key);
  c.stitch(34, 56);
  c.stitch(46, 42);
  c.part(
    poly([
      [49, 29],
      [59, 39],
      [68, 22],
      [69, 20],
      [66, 20],
    ]),
    P.ironLight,
    { shade: P.ironMid },
  );
  c.part(line(19, 67, 15, 72, 1.5), P.cream, { outline: false });
  c.pixels(
    [
      [14, 73],
      [13, 72],
      [15, 74],
      [13, 74],
      [15, 72],
    ],
    P.spark,
  );
  // Two big spiked iron wheels.
  for (const cx of [26, 54]) {
    const spikes: [number, number][] = [];
    for (let k = 0; k < 8; k += 1) {
      const angle = (k * Math.PI) / 4 + Math.PI / 8;
      spikes.push([cx + Math.cos(angle) * 11, 75 + Math.sin(angle) * 11]);
    }
    c.part(
      union(
        ellipse(cx, 75, 9, 9),
        ...spikes.map(([x, y]) => line(cx, 75, x, y, 2.5)),
      ),
      P.ironDark,
      { light: P.ironMid },
    );
    c.part(ellipse(cx, 75, 3, 3), P.ironLight, { shade: P.ironMid });
  }
}

function drawScrapBuggy(c: PixelCanvas): void {
  // Big round charcoal soot cloud from the exhaust (the grey plume).
  c.part(
    union(
      ellipse(9, 20, 7, 7),
      ellipse(18, 13, 8, 8),
      ellipse(8, 9, 6, 6),
      ellipse(16, 25, 5, 5),
    ),
    P.charcoal,
    { light: P.ironMid },
  );
  // Tall crooked exhaust pipe at the back.
  c.part(union(line(12, 54, 11, 38, 4), line(11, 38, 14, 30, 4)), P.ironDark, {
    light: P.ironMid,
  });
  // Rear (far) wheels peeking out behind.
  c.part(ellipse(24, 68, 7, 7), P.ironDark);
  c.part(ellipse(58, 68, 6, 6), P.ironDark);
  // Driver: head with sideways ears, flying cap, goggles, steering wheel.
  c.part(rect(29, 42, 40, 52), P.key);
  goblinEars(c, 34, 33, 18, 8, 4);
  goblinFace(c, 34, 35, 9.5, 9);
  c.part(clip(ellipse(34, 35, 10, 9.5), rect(0, 0, 71, 30)), P.key);
  c.part(ellipse(30, 30, 2.5, 2.5), P.ironDark);
  c.part(ellipse(38, 30, 2.5, 2.5), P.ironDark);
  c.part(line(43, 44, 47, 50, 2), P.charcoal);
  c.part(minus(ellipse(43, 42, 4, 3.5), ellipse(43, 42, 1.6, 1.4)), P.charcoal);
  // Boxy body of bolted red panels (owner), low and wide, spiky on top.
  for (const x of [10, 18, 48, 56])
    c.part(
      poly([
        [x, 52],
        [x + 2, 46],
        [x + 4, 52],
      ]),
      P.ironLight,
    );
  c.part(
    poly([
      [6, 52],
      [26, 50],
      [28, 54],
      [56, 52],
      [63, 56],
      [64, 66],
      [6, 68],
    ]),
    P.key,
  );
  c.part(rect(28, 54, 29, 66), P.black);
  c.stitch(18, 59);
  c.stitch(48, 60);
  c.pixels(
    [
      [9, 55],
      [9, 64],
      [60, 58],
      [60, 64],
    ],
    P.ironLight,
  );
  // Spiked light grey ram on the front.
  c.part(
    poly([
      [62, 56],
      [70, 58],
      [67, 61],
      [71, 64],
      [62, 67],
    ]),
    P.ironLight,
    { shade: P.ironMid },
  );
  // Two big mismatched wheels in front, lowest in the image.
  c.part(ellipse(17, 72, 9, 9), P.ironDark, { light: P.ironMid });
  c.part(ellipse(17, 72, 3, 3), P.ironLight);
  c.part(ellipse(52, 73, 8, 8), P.ironDark, { light: P.ironMid });
  c.part(ellipse(52, 73, 2.5, 2.5), P.ironLight);
  c.pixels(
    [
      [17, 65],
      [10, 72],
      [24, 72],
      [17, 79],
      [52, 67],
      [46, 73],
      [58, 73],
      [52, 79],
    ],
    P.ironLight,
  );
}

function drawTroll(c: PixelCanvas): void {
  // Legs and big bare feet.
  c.part(rect(29, 84, 39, 92), P.trollSkin, { shade: P.trollShade });
  c.part(rect(49, 84, 59, 92), P.trollSkin, { shade: P.trollShade });
  c.part(ellipse(32, 94, 9, 4), P.trollSkin, { shade: P.trollShade });
  c.part(ellipse(57, 94, 9, 4), P.trollSkin, { shade: P.trollShade });
  // Huge hunched body.
  c.part(ellipse(44, 62, 31, 26), P.trollSkin, { shade: P.trollShade });
  // Barrel-belly smock to the knees (owner).
  c.part(
    union(
      clip(ellipse(44, 62, 27, 24), rect(0, 52, 87, 103)),
      poly([
        [18, 70],
        [70, 70],
        [68, 86],
        [20, 86],
      ]),
    ),
    P.key,
  );
  c.part(rect(16, 52, 72, 54), P.key);
  c.stitch(30, 62);
  c.stitch(58, 76);
  c.stitch(38, 80);
  // Moss patches on the shoulders.
  const body = ellipse(44, 62, 30, 25);
  c.part(clip(ellipse(23, 46, 5, 3), body), P.moss, { outline: false });
  c.part(clip(ellipse(63, 45, 4, 3), body), P.moss, { outline: false });
  // Very long left arm reaching down to the knees.
  c.part(line(19, 48, 10, 80, 9), P.trollSkin, { shade: P.trollShade });
  c.part(ellipse(10, 84, 7, 6), P.trollSkin, { shade: P.trollShade });
  // Head sunk forward between the shoulders.
  c.part(ellipse(44, 36, 15, 13), P.trollSkin, { shade: P.trollShade });
  const head = ellipse(44, 36, 14, 12);
  c.part(clip(ellipse(40, 26, 5, 2.5), head), P.moss, { outline: false });
  c.part(clip(ellipse(49, 27, 3, 2), head), P.moss, { outline: false });
  // Tiny sleepy eyes, huge drooping nose, underbite with tusks.
  c.pixels(
    [
      [36, 33],
      [37, 33],
      [38, 33],
      [50, 33],
      [51, 33],
      [52, 33],
    ],
    P.black,
  );
  c.pixels(
    [
      [37, 34],
      [51, 34],
    ],
    P.cream,
  );
  c.part(ellipse(44, 40, 5, 7), P.trollSkin, { shade: P.trollShade });
  for (let x = 37; x <= 51; x += 1) c.set(x, 47, P.black);
  for (const tx of [39, 49])
    c.part(
      poly([
        [tx - 1.5, 48],
        [tx + 1.5, 48],
        [tx, 43],
      ]),
      P.cream,
    );
  // Right arm up to a huge knobbly stone club resting on the shoulder.
  c.part(line(68, 52, 72, 40, 9), P.trollSkin, { shade: P.trollShade });
  c.part(line(70, 42, 80, 14, 7), P.ironLight, { shade: P.ironMid });
  c.part(
    union(
      ellipse(79, 14, 8, 10),
      ellipse(74, 8, 4, 4),
      ellipse(84, 20, 3.5, 3.5),
    ),
    P.ironLight,
    { shade: P.ironMid },
  );
  c.pixels(
    [
      [78, 10],
      [81, 16],
      [76, 18],
    ],
    P.ironMid,
  );
  c.part(ellipse(71, 42, 5, 5), P.trollSkin, { shade: P.trollShade });
}

export const GOBLIN_PLACEHOLDER_SPECS_V7: readonly GoblinPlaceholderSpecV7[] = [
  {
    id: "chibi-goblin-placeholder-goblin",
    role: "FIGHTER",
    name: "Goblin",
    assetClass: "STANDARD_UNIT",
    width: 56,
    height: 80,
    cue: "big sideways ears and a raised jagged dagger",
    draw: drawGoblin,
  },
  {
    id: "chibi-goblin-placeholder-wolf-rider",
    role: "RAIDER",
    name: "Wolf Rider",
    assetClass: "LARGE_UNIT",
    width: 72,
    height: 88,
    cue: "a low wide wolf with open jaws and a small goblin rider",
    draw: drawWolfRider,
  },
  {
    id: "chibi-goblin-placeholder-bomb-chucker",
    role: "MARKSMAN",
    name: "Bomb Chucker",
    assetClass: "STANDARD_UNIT",
    width: 56,
    height: 80,
    cue: "a round black bomb raised overhead with a lit fuse",
    draw: drawBombChucker,
  },
  {
    id: "chibi-goblin-placeholder-orc-brute",
    role: "GUARD",
    name: "Orc Brute",
    assetClass: "STANDARD_UNIT",
    width: 56,
    height: 80,
    cue: "a broad orc with a round spiked shield and a raised cleaver",
    draw: drawOrcBrute,
  },
  {
    id: "chibi-goblin-placeholder-orc-warboss",
    role: "CAPTAIN",
    name: "Orc Warboss",
    assetClass: "STANDARD_UNIT",
    width: 56,
    height: 80,
    cue: "a horned helmet and a megaphone at the mouth",
    draw: drawOrcWarboss,
  },
  {
    id: "chibi-goblin-placeholder-rocket-cart",
    role: "CATAPULT",
    name: "Rocket Cart",
    assetClass: "LARGE_UNIT",
    width: 72,
    height: 88,
    cue: "two spiked wheels under one long diagonal rocket",
    draw: drawRocketCart,
  },
  {
    id: "chibi-goblin-placeholder-scrap-buggy",
    role: "KNIGHT",
    name: "Scrap Buggy",
    assetClass: "LARGE_UNIT",
    width: 72,
    height: 88,
    // 3 px right of the default: the soot cloud and rear wheel clear the
    // HP bar and seat badge.
    anchor: { x: 33, y: 48 },
    cue: "a low spiky car with a front ram and an exhaust soot puff",
    draw: drawScrapBuggy,
  },
  {
    id: "chibi-goblin-placeholder-troll",
    role: "JUGGERNAUT",
    name: "Troll",
    assetClass: "GIANT_UNIT",
    width: 88,
    height: 104,
    cue: "a huge hunched grey-green lump with a stone club on its shoulder",
    draw: drawTroll,
  },
];

export interface GoblinPlaceholderRenderV7 {
  readonly spec: GoblinPlaceholderSpecV7;
  readonly master: RgbaRaster & { readonly data: Uint8Array };
  /** Owner mask: exactly the pixels painted in the key colour. */
  readonly mask: BinaryMask;
  readonly qa: MaskQaReport;
}

/** Renders one placeholder, its key-colour mask and the strict mask QA. */
export function renderGoblinPlaceholderV7(
  spec: GoblinPlaceholderSpecV7,
): GoblinPlaceholderRenderV7 {
  const canvas = new PixelCanvas(spec.width, spec.height);
  spec.draw(canvas);
  const master = {
    width: spec.width,
    height: spec.height,
    data: canvas.data,
  };
  // The mask is the pipeline's strict extraction of the key colour. A key
  // speck it drops (a garment corner cut off by another part's outline)
  // becomes outline, so no unmasked key pixel is ever drawn raw.
  const mask = extractOwnerMask(master).mask;
  const [kr, kg, kb] = P.key;
  for (let index = 0; index < mask.bits.length; index += 1)
    if (
      mask.bits[index] !== 1 &&
      canvas.data[index * 4] === kr &&
      canvas.data[index * 4 + 1] === kg &&
      canvas.data[index * 4 + 2] === kb
    ) {
      canvas.data[index * 4] = P.black[0];
      canvas.data[index * 4 + 1] = P.black[1];
      canvas.data[index * 4 + 2] = P.black[2];
    }
  return { spec, master, mask, qa: ownerMaskQa(master, mask, { owned: true }) };
}

export function renderGoblinPlaceholdersV7(): readonly GoblinPlaceholderRenderV7[] {
  return GOBLIN_PLACEHOLDER_SPECS_V7.map(renderGoblinPlaceholderV7);
}

/** Pixels outside the palette (should be none), for tests and the CLI. */
export function offPalettePixels(raster: RgbaRaster): number {
  const allowed = new Set(
    Object.values(P).map(([r, g, b]) => (r << 16) | (g << 8) | b),
  );
  let count = 0;
  for (let index = 0; index < raster.width * raster.height; index += 1) {
    const alpha = raster.data[index * 4 + 3] ?? 0;
    if (alpha === 0) continue;
    const rgb =
      ((raster.data[index * 4] ?? 0) << 16) |
      ((raster.data[index * 4 + 1] ?? 0) << 8) |
      (raster.data[index * 4 + 2] ?? 0);
    if (alpha !== 255 || !allowed.has(rgb)) count += 1;
  }
  return count;
}

/**
 * The mask selects exactly the key-colour pixels, and the pipeline's
 * automatic extraction agrees with it.
 */
export function extractedMaskMatches(
  render: GoblinPlaceholderRenderV7,
): boolean {
  const extracted = extractOwnerMask(render.master).mask.bits;
  const [kr, kg, kb] = P.key;
  return extracted.every((bit, index) => {
    const key =
      render.master.data[index * 4 + 3] === 255 &&
      render.master.data[index * 4] === kr &&
      render.master.data[index * 4 + 1] === kg &&
      render.master.data[index * 4 + 2] === kb;
    return bit === render.mask.bits[index] && bit === (key ? 1 : 0);
  });
}

export function placeholderPaths(id: string): {
  readonly master: string;
  readonly mask: string;
} {
  return {
    master: `${GOBLIN_PLACEHOLDER_OUTPUT_DIR}/${id}.png`,
    mask: `${GOBLIN_PLACEHOLDER_OUTPUT_DIR}/${id}.mask.png`,
  };
}
