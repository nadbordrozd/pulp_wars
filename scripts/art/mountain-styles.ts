/**
 * Mountain style options (bead pulp_wars-2yc.1,
 * art/explorations/mountain-styles-2026-10/README.md): sample sets of
 * candidate mountain styles, derived into the file names of the production
 * massif set so the review can show each on the real board. Nothing here is
 * production art and nothing is written under `public/`.
 *
 *   npx tsx scripts/art/mountain-styles.ts style     # the composed style images
 *   npx tsx scripts/art/mountain-styles.ts sheet <out.png>
 *
 * The PixelLab calls are recipes of the exploration run, made with
 * `MOUNTAIN_RANGES_RUN=art/explorations/mountain-styles-2026-10` and
 * scripts/art/chibi-mountain-ranges.ts (plan, generate, review).
 *
 * `options.json` of the run says, for each option, which reviewed raw
 * candidates stand for the low single, the low ridge, the tall single and
 * the tall ridge, how the ground under them is made, and how the board's
 * ground treatment (MASSIF_GROUND_V7) is set while the option is shown.
 * `deriveOption` places every candidate as the production bake does
 * (trimmed, centred, its foot 3 px above the bottom of its footprint) and
 * repeats the few samples over the production variants. Nothing is ever
 * mirrored: the sun is at the bottom left, and a mirrored piece is lit from
 * the other side. `deriveOptionWithLighting` measures every piece
 * (scripts/art/lighting-qa.ts) and refuses one lit from the right.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import sharp, { type OverlayOptions } from "sharp";
import { encodePng, readRaster } from "./chibi/pipeline";
import { lightVerdict, lightingOf, type Lighting } from "./lighting-qa";

export const MOUNTAIN_STYLES_RUN = "art/explorations/mountain-styles-2026-10";
const CELL = 80;
const LOW_UP = 24;
const TALL_UP = 48;
/** How far a piece may rise above its footprint. */
const LOW_LIMIT = 13;
const TALL_LIMIT = 48;
const FOOT_INSET = 3;
const MOUNTAINS = "public/assets/chibi/mountains";
const TERRAIN = "public/assets/chibi/terrain";
/** The live terrain tone: contrast 65% around a pivot. */
const TONE = 0.65;
const GRASS_PIVOT = [137, 183, 91] as const;
const ROCK_PIVOT = [162, 170, 182] as const;

type Rgb = readonly [number, number, number];

interface Raster {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8Array;
}

export interface StylePart {
  readonly recipe?: string;
  readonly candidate?: number;
  /** A file of the repository instead of a raw candidate. */
  readonly file?: string;
  /** Style images: the left edge of the trimmed raster. */
  readonly left?: number;
  /** Pieces: px down from "foot 3 px above the footprint's bottom". */
  readonly dy?: number;
  /** Pieces: px right of centred. */
  readonly dx?: number;
  /** Rows cut from the bottom of the trimmed raster (a mist band). */
  readonly cutBottom?: number;
  /**
   * Exact colour swaps, each `[from, to]`: a call that drifted from the
   * style's palette is brought back to it for the mock.
   */
  readonly swap?: readonly (readonly [Rgb, Rgb])[];
}

interface StyleImageSpec {
  readonly file: string;
  readonly width: number;
  readonly height: number;
  readonly parts: readonly StylePart[];
}

export interface MountainStyleOption {
  readonly id: string;
  readonly label: string;
  readonly summary: string;
  /**
   * The ground under the mountains: the Grass tile or the rocky ground,
   * mixed `amount` of the way to `colour` (as seen on the board).
   */
  readonly ground: {
    readonly from: "GRASS" | "ROCK";
    readonly mix?: { readonly colour: Rgb; readonly amount: number };
  };
  /** Overrides of MASSIF_GROUND_V7 while the option is shown. */
  readonly massifGround: Readonly<Record<string, unknown>>;
  /** "CURRENT": the pieces are the production ones through `soften`. */
  readonly pieces:
    | "CURRENT"
    | {
        readonly low1: readonly StylePart[];
        readonly low2: readonly StylePart[];
        readonly tall1: readonly StylePart[];
        readonly tall2: readonly StylePart[];
        readonly mine?: StylePart;
      };
  /** The rendering treatment of the no-new-art option. */
  readonly soften?: {
    readonly outline: Rgb;
    readonly warm: number;
    readonly foot: Rgb;
    readonly footDark: Rgb;
    readonly footRows: readonly [number, number];
  };
}

interface OptionsFile {
  readonly bead: string;
  readonly styleImages: readonly StyleImageSpec[];
  readonly options: readonly MountainStyleOption[];
}

interface Records {
  readonly [id: string]: {
    readonly candidates: readonly { readonly file: string }[];
  };
}

export async function loadMountainStyles(root: string): Promise<OptionsFile> {
  return JSON.parse(
    await readFile(
      path.join(root, MOUNTAIN_STYLES_RUN, "options.json"),
      "utf8",
    ),
  ) as OptionsFile;
}

async function loadRecords(root: string): Promise<Records> {
  return JSON.parse(
    await readFile(
      path.join(root, MOUNTAIN_STYLES_RUN, "records.json"),
      "utf8",
    ),
  ) as Records;
}

function trimmed(source: Raster, cutBottom = 0): Raster {
  if (cutBottom > 0) {
    // Cut the rows, then trim again: what was cut may leave empty rows.
    const whole = trimmed(source);
    const height = whole.height - cutBottom;
    return trimmed({
      width: whole.width,
      height,
      data: whole.data.slice(0, whole.width * height * 4),
    });
  }
  let x0 = source.width;
  let y0 = source.height;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < source.height; y += 1)
    for (let x = 0; x < source.width; x += 1)
      if ((source.data[(y * source.width + x) * 4 + 3] ?? 0) > 0) {
        x0 = Math.min(x0, x);
        x1 = Math.max(x1, x);
        y0 = Math.min(y0, y);
        y1 = Math.max(y1, y);
      }
  if (x1 < 0) throw new Error("an empty raster");
  const width = x1 - x0 + 1;
  const height = y1 - y0 + 1;
  const data = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y += 1)
    data.set(
      source.data.subarray(
        ((y0 + y) * source.width + x0) * 4,
        ((y0 + y) * source.width + x0 + width) * 4,
      ),
      y * width * 4,
    );
  // Pixels that are almost clear are cleared; the others are made solid.
  for (let offset = 3; offset < data.length; offset += 4)
    data[offset] = (data[offset] ?? 0) >= 128 ? 255 : 0;
  return { width, height, data };
}

function paint(target: Raster, stamp: Raster, left: number, top: number): void {
  for (let y = 0; y < stamp.height; y += 1)
    for (let x = 0; x < stamp.width; x += 1) {
      const from = (y * stamp.width + x) * 4;
      if ((stamp.data[from + 3] ?? 0) === 0) continue;
      const tx = left + x;
      const ty = top + y;
      if (tx < 0 || ty < 0 || tx >= target.width || ty >= target.height)
        continue;
      target.data.set(
        stamp.data.subarray(from, from + 4),
        (ty * target.width + tx) * 4,
      );
    }
}

const blank = (width: number, height: number): Raster => ({
  width,
  height,
  data: new Uint8Array(width * height * 4),
});

async function partRaster(
  root: string,
  records: Records,
  part: StylePart,
): Promise<Raster> {
  const file =
    part.file ??
    records[part.recipe ?? ""]?.candidates[part.candidate ?? 0]?.file;
  if (file === undefined)
    throw new Error(`no candidate ${part.recipe}#${part.candidate ?? 0}`);
  const raster = trimmed(
    await readRaster(await readFile(path.join(root, file))),
    part.cutBottom,
  );
  for (const [from, to] of part.swap ?? [])
    for (let offset = 0; offset < raster.data.length; offset += 4)
      if (
        raster.data[offset] === from[0] &&
        raster.data[offset + 1] === from[1] &&
        raster.data[offset + 2] === from[2]
      )
        raster.data.set(to, offset);
  return raster;
}

/** The composed style images of the run (two samples side by side). */
export async function composeStyleImages(
  root: string,
): Promise<ReadonlyMap<string, Buffer>> {
  const file = await loadMountainStyles(root);
  const records = await loadRecords(root);
  const out = new Map<string, Buffer>();
  for (const spec of file.styleImages) {
    const canvas = blank(spec.width, spec.height);
    for (const part of spec.parts) {
      const raster = await partRaster(root, records, part);
      paint(
        canvas,
        raster,
        part.left ?? 0,
        spec.height - 2 - raster.height + (part.dy ?? 0),
      );
    }
    out.set(spec.file, await encodePng(canvas));
  }
  return out;
}

function piece(
  raster: Raster,
  columns: number,
  tall: boolean,
  part: StylePart,
  name: string,
): Raster {
  const up = tall ? TALL_UP : LOW_UP;
  const limit = tall ? TALL_LIMIT : LOW_LIMIT;
  const canvas = blank(columns * CELL, CELL + up);
  const left = Math.round((canvas.width - raster.width) / 2) + (part.dx ?? 0);
  const top = canvas.height - FOOT_INSET - raster.height + (part.dy ?? 0);
  if (raster.width > canvas.width)
    throw new Error(`${name}: ${raster.width} px wide, over its footprint`);
  if (top < up - limit)
    throw new Error(
      `${name}: rises ${up - top} px over its footprint (limit ${limit})`,
    );
  paint(canvas, raster, left, top);
  return canvas;
}

const letter = (index: number): string => String.fromCharCode(97 + index);

/** The production file names of the massif set, by kind. */
const KINDS = [
  { key: "low1", columns: 1, tall: false, count: 8, stem: "1x1" },
  { key: "low2", columns: 2, tall: false, count: 8, stem: "2x1" },
  { key: "tall1", columns: 1, tall: true, count: 6, stem: "1x1-tall" },
  { key: "tall2", columns: 2, tall: true, count: 6, stem: "2x1-tall" },
] as const;

const luma = (r: number, g: number, b: number): number =>
  0.299 * r + 0.587 * g + 0.114 * b;

function unit(a: number, b: number, salt: number): number {
  let h = Math.imul(a | 0, 0x9e3779b1) ^ Math.imul(b | 0, 0x85ebca6b) ^ salt;
  h ^= h >>> 15;
  h = Math.imul(h, 0x2c1b3c6d);
  h ^= h >>> 12;
  return ((h >>> 0) % 1000) / 1000;
}

/**
 * The no-new-art treatment of a production piece: the black outline takes a
 * dark tone of the rock, the cool greys move toward warm brown-grey, the
 * snow toward cream, and the foot of the rock is covered by a ragged skirt
 * of meadow green, so the piece grows out of grass.
 */
export function softenedPiece(
  source: Raster,
  spec: NonNullable<MountainStyleOption["soften"]>,
): Raster {
  const data = new Uint8Array(source.data);
  const { width, height } = source;
  for (let x = 0; x < width; x += 1) {
    let bottom = -1;
    for (let y = height - 1; y >= 0; y -= 1)
      if ((data[(y * width + x) * 4 + 3] ?? 0) > 0) {
        bottom = y;
        break;
      }
    const rows = Math.round(
      spec.footRows[0] +
        (spec.footRows[1] - spec.footRows[0]) *
          (0.5 + 0.5 * Math.sin(x / 5.3) * Math.cos(x / 2.9)),
    );
    for (let y = 0; y < height; y += 1) {
      const offset = (y * width + x) * 4;
      if ((data[offset + 3] ?? 0) === 0) continue;
      const r = data[offset] ?? 0;
      const g = data[offset + 1] ?? 0;
      const b = data[offset + 2] ?? 0;
      let colour: Rgb;
      if (bottom - y < rows && bottom >= height - 30)
        colour = unit(x >> 1, y >> 1, 0x51) < 0.22 ? spec.footDark : spec.foot;
      else if (Math.max(r, g, b) <= 62) colour = spec.outline;
      else if (luma(r, g, b) > 205)
        colour = [
          Math.round(r + (244 - r) * 0.5),
          Math.round(g + (236 - g) * 0.5),
          Math.round(b + (216 - b) * 0.5),
        ];
      else
        colour = [
          Math.min(255, Math.round(r + (r * 1.1 + 10 - r) * spec.warm)),
          Math.round(g + (g * 0.99 - g) * spec.warm),
          Math.round(b + (b * 0.8 - b) * spec.warm),
        ];
      data[offset] = colour[0];
      data[offset + 1] = colour[1];
      data[offset + 2] = colour[2];
    }
  }
  return { width, height, data };
}

/**
 * The ground tile an option serves in place of the rocky ground. The board
 * tones that tile around the rock pivot, so the tile is stored with that
 * tone undone: what the board shows is the colour asked for here.
 */
async function groundTile(
  root: string,
  option: MountainStyleOption,
): Promise<Raster> {
  const grass = option.ground.from === "GRASS";
  const source = await readRaster(
    await readFile(
      path.join(
        root,
        TERRAIN,
        grass ? "chibi-grass-1.png" : "chibi-mountain-ground-1.png",
      ),
    ),
  );
  const pivot = grass ? GRASS_PIVOT : ROCK_PIVOT;
  const data = new Uint8Array(source.data);
  for (let offset = 0; offset < data.length; offset += 4)
    for (let c = 0; c < 3; c += 1) {
      const shown =
        (pivot[c] ?? 0) + ((data[offset + c] ?? 0) - (pivot[c] ?? 0)) * TONE;
      const mixed =
        option.ground.mix === undefined
          ? shown
          : shown +
            ((option.ground.mix.colour[c] ?? 0) - shown) *
              option.ground.mix.amount;
      data[offset + c] = Math.max(
        0,
        Math.min(
          255,
          Math.round(
            (ROCK_PIVOT[c] ?? 0) + (mixed - (ROCK_PIVOT[c] ?? 0)) / TONE,
          ),
        ),
      );
    }
  return { width: source.width, height: source.height, data };
}

/** The lighting QA of one piece of an option (scripts/art/lighting-qa.ts). */
export interface PieceLighting {
  /** The production file name the piece is served as. */
  readonly name: string;
  /** Where it comes from: a raw candidate or a production piece. */
  readonly source: string;
  readonly lighting: Lighting;
  readonly verdict: "LEFT" | "RIGHT" | "FLAT";
}

/** The lighting of the production massif set as it is drawn today. */
export async function currentLighting(root: string): Promise<PieceLighting[]> {
  const out: PieceLighting[] = [];
  for (const kind of KINDS)
    for (let variant = 0; variant < kind.count; variant += 1) {
      const name = `chibi-mountain-range-${kind.stem}-${letter(variant)}.png`;
      const lighting = lightingOf(
        await readRaster(await readFile(path.join(root, MOUNTAINS, name))),
        true,
      );
      out.push({
        name,
        source: name,
        lighting,
        verdict: lightVerdict(lighting),
      });
    }
  return out;
}

/**
 * An option as the files the board asks for: production file name to PNG
 * bytes (the massif pieces, the Mine's mountain and the rocky ground), and
 * the lighting of every piece.
 *
 * The sun is at the bottom left (the user, 2026-10-05), so nothing is
 * mirrored: a mirrored piece is lit from the other side. The few samples
 * of a kind are repeated over the production variants as they are. A
 * sample lit from the right is refused. The no-new-art option serves only
 * the production pieces that are lit from the left, each in place of a
 * variant that is not.
 */
export async function deriveOptionWithLighting(
  root: string,
  option: MountainStyleOption,
): Promise<{
  readonly files: ReadonlyMap<string, Buffer>;
  readonly lighting: readonly PieceLighting[];
}> {
  const records = await loadRecords(root);
  const files = new Map<string, Buffer>();
  const lighting: PieceLighting[] = [];
  const seen = new Set<string>();
  const note = (name: string, source: string, raster: Raster): void => {
    const measured = lightingOf(raster, true);
    const verdict = lightVerdict(measured);
    if (verdict === "RIGHT")
      throw new Error(
        `${option.id}: ${source} is lit from the right (faces ${measured.faces.toFixed(1)})`,
      );
    if (seen.has(source)) return;
    seen.add(source);
    lighting.push({ name, source, lighting: measured, verdict });
  };
  const label = (part: StylePart): string =>
    part.file ?? `${part.recipe}-${part.candidate ?? 0}`;
  files.set(
    "chibi-mountain-ground-1.png",
    await encodePng(await groundTile(root, option)),
  );
  const today = option.pieces === "CURRENT" ? await currentLighting(root) : [];
  for (const kind of KINDS) {
    const lit = today.filter(
      (entry) =>
        entry.verdict === "LEFT" &&
        entry.name.startsWith(`chibi-mountain-range-${kind.stem}-`) &&
        entry.name.includes("-tall-") === kind.tall,
    );
    for (let variant = 0; variant < kind.count; variant += 1) {
      const name = `chibi-mountain-range-${kind.stem}-${letter(variant)}.png`;
      let raster: Raster;
      if (option.pieces === "CURRENT") {
        if (option.soften === undefined)
          throw new Error(`${option.id}: CURRENT pieces need soften`);
        const own = today.find((entry) => entry.name === name);
        // A variant lit from the right gives way to one lit from the left.
        const source =
          own?.verdict === "LEFT" ? name : lit[variant % lit.length]?.name;
        if (source === undefined)
          throw new Error(`${option.id}: no ${kind.key} lit from the left`);
        raster = softenedPiece(
          await readRaster(await readFile(path.join(root, MOUNTAINS, source))),
          option.soften,
        );
        note(name, source, raster);
      } else {
        const parts = option.pieces[kind.key];
        const part = parts[variant % parts.length];
        if (part === undefined) throw new Error(`${option.id}: no ${kind.key}`);
        raster = piece(
          await partRaster(root, records, part),
          kind.columns,
          kind.tall,
          part,
          `${option.id} ${name}`,
        );
        note(name, label(part), raster);
      }
      files.set(name, await encodePng(raster));
    }
  }
  const mineName = "chibi-mountain-range-mine-a.png";
  if (option.pieces === "CURRENT") {
    if (option.soften !== undefined) {
      const raster = softenedPiece(
        await readRaster(await readFile(path.join(root, MOUNTAINS, mineName))),
        option.soften,
      );
      note(mineName, mineName, raster);
      files.set(mineName, await encodePng(raster));
    }
  } else {
    const part = option.pieces.mine ?? option.pieces.low1[0];
    if (part !== undefined) {
      const raster = piece(
        await partRaster(root, records, part),
        1,
        false,
        part,
        `${option.id} ${mineName}`,
      );
      note(mineName, label(part), raster);
      files.set(mineName, await encodePng(raster));
    }
  }
  return { files, lighting };
}

export async function deriveOption(
  root: string,
  option: MountainStyleOption,
): Promise<ReadonlyMap<string, Buffer>> {
  return (await deriveOptionWithLighting(root, option)).files;
}

/** A sheet of every option's distinct pieces on its ground, 2x. */
async function sheet(root: string, out: string): Promise<void> {
  const file = await loadMountainStyles(root);
  const rowHeight = CELL + TALL_UP + 28;
  const width = 6 * CELL + 5 * 8 + 16;
  const composites: OverlayOptions[] = [];
  for (const [index, option] of file.options.entries()) {
    const files = await deriveOption(root, option);
    const top = index * rowHeight;
    composites.push({
      input: Buffer.from(
        `<svg width="${width}" height="22"><text x="8" y="16" font-family="Helvetica" font-weight="700" font-size="14" fill="#10210f">${option.label}</text></svg>`,
      ),
      left: 0,
      top,
    });
    let x = 8;
    for (const [name, columns, up] of [
      ["chibi-mountain-range-1x1-a.png", 1, LOW_UP],
      ["chibi-mountain-range-2x1-a.png", 2, LOW_UP],
      ["chibi-mountain-range-1x1-tall-a.png", 1, TALL_UP],
      ["chibi-mountain-range-2x1-tall-a.png", 2, TALL_UP],
    ] as const) {
      const bytes = files.get(name);
      if (bytes !== undefined)
        composites.push({
          input: bytes,
          left: x,
          top: top + 24 + (TALL_UP - up),
        });
      x += columns * CELL + 8;
    }
  }
  const height = file.options.length * rowHeight;
  const plain = await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 138, g: 184, b: 92, alpha: 1 },
    },
  })
    .composite(composites)
    .png()
    .toBuffer();
  await mkdir(path.dirname(out), { recursive: true });
  await sharp(plain)
    .resize(width * 2, height * 2, { kernel: "nearest" })
    .toFile(out);
  console.log(`wrote ${out}`);
}

async function main(): Promise<void> {
  const root = process.cwd();
  const [command, ...rest] = process.argv.slice(2);
  if (command === "style") {
    for (const [file, bytes] of await composeStyleImages(root)) {
      const target = path.join(root, MOUNTAIN_STYLES_RUN, file);
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, bytes);
      console.log(`wrote ${MOUNTAIN_STYLES_RUN}/${file}`);
    }
    return;
  }
  if (command === "sheet" && rest[0] !== undefined)
    return sheet(root, path.resolve(rest[0]));
  throw new Error("usage: mountain-styles.ts style | sheet <out.png>");
}

if (process.argv[1] === fileURLToPath(import.meta.url))
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "failed");
    process.exitCode = 1;
  });
