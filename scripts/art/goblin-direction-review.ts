/**
 * Review evidence of the Goblin direction study (docs/art/
 * VISUAL_DIRECTION_2026-10.md, "Goblin study"): pass 1 (bead
 * pulp_wars-3tq.8, near-black leather and a striped black rocket) and pass 2
 * (bead pulp_wars-3tq.10, orange-brown leather loincloths and a fireworks
 * cart).
 *
 *   npm run art:goblin-direction-study-review -- [--pass 1|2] [--port 6481]
 *       [--skip-capture] [--captures DIR] [--out DIR]
 *
 * `--pass 2` (the default) writes to
 * art/pixellab/reviews/goblin-direction-study/pass-2/ and compares TODAY,
 * PASS 1 and PASS 2 (and the Human direction units): the chosen sheet has a
 * column for each, the before-after scenes have three panels, and
 * readability.json adds the orange-brown leather against the Coral and Gold
 * plates and Human crimson, the cart's pale planks against Human gold, and
 * the cart's width against its base plate. `--pass 1` rewrites the pass 1
 * evidence in art/pixellab/reviews/goblin-direction-study/ as before:
 *
 *   candidates-x3.png       every candidate of the exploration run on Grass
 *                           at x3 and 1:1, with its verdict
 *   chosen-1x.png, -x4.png  the three study sprites beside today's Goblin
 *                           sprite (in the four player colours) and the
 *                           Human direction unit of the same role
 *   alternatives-x4.png     each chosen sprite beside the alternatives kept
 *   palette.png, .json      the faction palette measured on the three
 *                           sprites, beside Grass, the player colours and
 *                           the Human crimson and gold
 *   readability.json        skin against Grass, hazard yellow against Human
 *                           gold and the Gold player colour, and the four
 *                           plates against each other (also under simulated
 *                           colour-vision deficiency)
 *   before-after-<scene>-<viewport>-zoom-<step>.png
 *                           scenes FOUR (four Goblin players) and MIXED
 *                           (Goblin against Human) of
 *                           scripts/art/goblin-direction/scene.ts drawn by
 *                           the real board host with the look the game
 *                           draws: today's Goblin sprites left, the study's
 *                           right; desktop and phone, zoom 1 and 0.75
 *   same-unit-<viewport>-zoom-<step>.png
 *                           the four Goblin players' units, as seen and
 *                           under simulated deuteranopia and protanopia
 *   index.json              files, sizes and hashes
 *
 * The full-screen captures go to --captures (a temporary directory by
 * default). Captures start Vite on --port (default 6481, never the user's
 * 6173) and use headless Chrome from CHROME_PATH. No PixelLab call is made.
 */
import { spawn, type ChildProcess } from "node:child_process";
import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import sharp from "sharp";
import {
  RULESET7_PLAYER_COLORS,
  parseHexColourV7,
  recolourOwnerPixelsV7,
} from "../../src/render/canvas/owner-recolour-v7";
import { rgbToHsv, type RgbaRaster } from "./chibi/owner-mask";
import { readRaster, sha256 } from "./chibi/pipeline";
import { candidateCell, cropRaster } from "./chibi/raster";

const ROOT = process.cwd();
const RUN = "art/explorations/goblin-direction-2026-10";
const TILE = 80;

function option(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  const value = index < 0 ? undefined : process.argv[index + 1];
  return value === undefined || value.startsWith("--") ? undefined : value;
}

/** Which pass of the study the evidence is for. */
const PASS: 1 | 2 = option("--pass") === "1" ? 1 : 2;
const BEAD = PASS === 1 ? "pulp_wars-3tq.8" : "pulp_wars-3tq.10";
/** Pass 2 recipes carry seeds from 79000 up. */
const PASS_2_FIRST_SEED = 79_000;

const OUT = path.resolve(
  option("--out") ??
    (PASS === 1
      ? "art/pixellab/reviews/goblin-direction-study"
      : "art/pixellab/reviews/goblin-direction-study/pass-2"),
);
const CAPTURES = path.resolve(
  option("--captures") ?? path.join(tmpdir(), "pulp-wars-goblin-direction"),
);

type Rgb = readonly [number, number, number];

/**
 * The study's units: today's asset, the study asset of pass 1 (`study`) and
 * of pass 2 (`study2`), and the Human asset.
 */
const UNITS = [
  {
    name: "Goblin",
    today: "chibi-goblin-goblin",
    study: "chibi-study-goblin",
    study2: "chibi-study2-goblin",
    human: "chibi-direction-fighter",
    humanName: "Fighter",
  },
  {
    name: "Bomb Chucker",
    today: "chibi-goblin-bomb-chucker",
    study: "chibi-study-bomb-chucker",
    study2: "chibi-study2-bomb-chucker",
    human: "chibi-direction-marksman",
    humanName: "Marksman",
  },
  {
    name: "Rocket Cart",
    today: "chibi-goblin-rocket-cart",
    study: "chibi-study-rocket-cart",
    study2: "chibi-study2-fireworks-cart",
    human: "chibi-direction-catapult",
    humanName: "Catapult",
  },
] as const;

/** The chosen sample of a unit in the pass under review. */
const chosenId = (unit: (typeof UNITS)[number]): string =>
  PASS === 1 ? unit.study : unit.study2;

const OWNERS = Object.entries(RULESET7_PLAYER_COLORS) as [string, string][];
const title = (text: string): string =>
  text.charAt(0) + text.slice(1).toLowerCase();

interface Sample {
  readonly id: string;
  readonly subject: string;
  readonly assetClass: string;
  readonly width: number;
  readonly height: number;
  readonly anchor?: { readonly x: number; readonly y: number };
  readonly url: string;
  readonly fixedColours: true;
  readonly pass: 1 | 2;
  readonly role: "chosen" | "alternative";
  readonly recipe: string;
  readonly candidate: number;
  readonly note: string;
}

async function samples(): Promise<readonly Sample[]> {
  const file = JSON.parse(
    await readFile(path.join(ROOT, RUN, "samples.json"), "utf8"),
  ) as { assets: Sample[] };
  return file.assets;
}

// ------------------------------------------------------------ rasters

interface Canvas {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8Array;
}

function blank(width: number, height: number, rgb: Rgb): Canvas {
  const data = new Uint8Array(width * height * 4);
  for (let index = 0; index < width * height; index += 1) {
    data[index * 4] = rgb[0];
    data[index * 4 + 1] = rgb[1];
    data[index * 4 + 2] = rgb[2];
    data[index * 4 + 3] = 255;
  }
  return { width, height, data };
}

/** Alpha-over blit with an integer nearest-neighbour scale. */
function blit(
  target: Canvas,
  source: RgbaRaster,
  left: number,
  top: number,
  scale = 1,
): void {
  for (let y = 0; y < source.height * scale; y += 1)
    for (let x = 0; x < source.width * scale; x += 1) {
      const tx = Math.round(left) + x;
      const ty = Math.round(top) + y;
      if (tx < 0 || ty < 0 || tx >= target.width || ty >= target.height)
        continue;
      const s =
        (Math.floor(y / scale) * source.width + Math.floor(x / scale)) * 4;
      const alpha = (source.data[s + 3] ?? 0) / 255;
      if (alpha === 0) continue;
      const t = (ty * target.width + tx) * 4;
      for (let channel = 0; channel < 3; channel += 1)
        target.data[t + channel] = Math.round(
          (source.data[s + channel] ?? 0) * alpha +
            (target.data[t + channel] ?? 0) * (1 - alpha),
        );
    }
}

function fill(
  target: Canvas,
  left: number,
  top: number,
  width: number,
  height: number,
  rgb: Rgb,
): void {
  blit(target, blank(width, height, rgb), left, top);
}

function recoloured(
  raster: RgbaRaster,
  mask: RgbaRaster,
  colour: string,
): RgbaRaster {
  const owner = parseHexColourV7(colour);
  if (owner === null) throw new Error(colour);
  return {
    width: raster.width,
    height: raster.height,
    data: recolourOwnerPixelsV7({
      pixels: new Uint8ClampedArray(raster.data),
      width: raster.width,
      height: raster.height,
      mask: new Uint8ClampedArray(mask.data),
      maskWidth: mask.width,
      maskHeight: mask.height,
      owner,
    }),
  };
}

function escapeXml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

interface Label {
  readonly text: string;
  readonly left: number;
  readonly top: number;
  readonly size?: number;
  readonly fill?: string;
}

async function writeSheet(
  file: string,
  canvas: Canvas,
  labels: readonly Label[],
): Promise<void> {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${canvas.width}" height="${canvas.height}">${labels
    .map(
      (label) =>
        `<text x="${label.left}" y="${label.top + (label.size ?? 14)}" font-family="Helvetica, Arial, sans-serif" font-size="${label.size ?? 14}" font-weight="700" fill="${label.fill ?? "#f4f1e8"}">${escapeXml(label.text)}</text>`,
    )
    .join("")}</svg>`;
  await sharp(Buffer.from(canvas.data), {
    raw: { width: canvas.width, height: canvas.height, channels: 4 },
  })
    .composite([{ input: Buffer.from(svg), left: 0, top: 0 }])
    .png({ compressionLevel: 9 })
    .toFile(file);
  console.log(`wrote ${path.relative(ROOT, file)}`);
}

const PAPER: Rgb = [30, 33, 40];
const FRAME: Rgb = [52, 58, 66];
const GAP = 6;
const LABEL_H = 22;

const unitFile = (id: string): string =>
  path.join(ROOT, "public/assets/chibi/units", `${id}.png`);
const sampleFile = (id: string): string =>
  path.join(ROOT, RUN, "assets", `${id}.png`);

/** A board cell: a Grass tile with the piece bottom-centred on it. */
function boardCell(
  grass: RgbaRaster,
  piece: RgbaRaster,
  anchor: { x: number; y: number } | undefined,
  scale: number,
  width = 88,
  height = 104,
): Canvas {
  const out = blank(width * scale, height * scale, FRAME);
  const tileLeft = ((width - TILE) / 2) * scale;
  const tileTop = (height - TILE) * scale;
  blit(out, grass, tileLeft, tileTop, scale);
  const at = anchor ?? { x: piece.width / 2, y: piece.height - TILE / 2 };
  blit(
    out,
    piece,
    tileLeft + (TILE / 2 - at.x) * scale,
    tileTop + (TILE / 2 - at.y) * scale,
    scale,
  );
  return out;
}

// ------------------------------------------------------------ sheets

interface RecipeRecord {
  readonly candidateCount?: number;
  readonly candidateSize?: { width: number; height: number };
  readonly rawSheet?: string;
  readonly review?: { readonly verdict: string; readonly notes: string };
}

async function candidatesSheet(all: readonly Sample[]): Promise<void> {
  const manifest = JSON.parse(
    await readFile(path.join(ROOT, RUN, "batch.json"), "utf8"),
  ) as {
    assets: { id: string }[];
    recipes: { id: string; asset: string; endpoint: string; seed: number }[];
  };
  const records = JSON.parse(
    await readFile(path.join(ROOT, RUN, "records.json"), "utf8"),
  ) as { recipes: Record<string, RecipeRecord> };
  const grass = await readRaster(
    path.join(ROOT, "public/assets/chibi/terrain/chibi-grass-1.png"),
  );
  const scale = 3;
  const cellW = 88 * scale + 96;
  const cellH = 104 * scale + LABEL_H * 2 + GAP;
  const columns = 6;
  const cells: {
    readonly row: number;
    readonly column: number;
    readonly big: Canvas;
    readonly small: Canvas;
    readonly lines: readonly [string, string];
    readonly colour: string;
  }[] = [];
  const headings: { readonly text: string; readonly row: number }[] = [];
  let row = 0;
  for (const asset of manifest.assets) {
    const recipes = manifest.recipes.filter(
      (entry) =>
        entry.asset === asset.id &&
        entry.seed >= PASS_2_FIRST_SEED === (PASS === 2),
    );
    if (recipes.length === 0) continue;
    headings.push({ text: asset.id, row });
    let column = 0;
    for (const recipe of recipes) {
      const record = records.recipes[recipe.id];
      if (record?.rawSheet === undefined || record.candidateSize === undefined)
        continue;
      const sheet = await readRaster(path.join(ROOT, record.rawSheet));
      const count = record.candidateCount ?? 1;
      for (let index = 0; index < count; index += 1) {
        const piece = cropRaster(sheet, {
          ...candidateCell(index, count, record.candidateSize),
          ...record.candidateSize,
        });
        const sample = all.find(
          (entry) => entry.recipe === recipe.id && entry.candidate === index,
        );
        const verdict =
          sample?.role === "chosen"
            ? "CHOSEN"
            : sample?.role === "alternative"
              ? "alternative"
              : record.review?.verdict === "REJECTED"
                ? "rejected"
                : "other candidate";
        const anchor = piece.width === 72 ? { x: 34, y: 48 } : undefined;
        if (column === columns) {
          column = 0;
          row += 1;
        }
        cells.push({
          row,
          column,
          big: boardCell(grass, piece, anchor, scale),
          small: boardCell(grass, piece, anchor, 1),
          lines: [
            `${recipe.id} #${index}`,
            `${verdict} (${recipe.endpoint === "create-image-pixen" ? "fresh" : "edit"})`,
          ],
          colour:
            verdict === "CHOSEN"
              ? "#8be28b"
              : verdict === "alternative"
                ? "#f2d477"
                : "#f4f1e8",
        });
        column += 1;
      }
    }
    row += 1;
  }
  const canvas = blank(GAP + columns * (cellW + GAP), GAP + row * cellH, PAPER);
  const labels: Label[] = [];
  for (const cell of cells) {
    const left = GAP + cell.column * (cellW + GAP);
    const top = GAP + cell.row * cellH;
    labels.push({
      text: cell.lines[0],
      left,
      top,
      size: 13,
      fill: cell.colour,
    });
    labels.push({
      text: cell.lines[1],
      left,
      top: top + LABEL_H - 4,
      size: 12,
      fill: cell.colour,
    });
    blit(canvas, { ...cell.big }, left, top + LABEL_H * 2);
    blit(canvas, { ...cell.small }, left + 88 * scale + GAP, top + LABEL_H * 2);
  }
  await writeSheet(path.join(OUT, "candidates-x3.png"), canvas, labels);
}

async function chosenSheet(all: readonly Sample[], scale: number) {
  const grass = await readRaster(
    path.join(ROOT, "public/assets/chibi/terrain/chibi-grass-1.png"),
  );
  const columns = [
    ...OWNERS.map(([name]) => `today, ${title(name)}`),
    ...(PASS === 1
      ? ["study (every player)"]
      : ["pass 1 (every player)", "PASS 2 (every player)"]),
    "Human, new direction",
  ];
  const cellW = 88 * scale;
  const cellH = 104 * scale;
  const left0 = 150;
  const canvas = blank(
    left0 + columns.length * (cellW + GAP) + GAP,
    LABEL_H + GAP + UNITS.length * (cellH + GAP),
    PAPER,
  );
  const labels: Label[] = columns.map((text, index) => ({
    text,
    left: left0 + index * (cellW + GAP),
    top: 2,
    size: scale === 1 ? 10 : 14,
  }));
  for (const [rowIndex, unit] of UNITS.entries()) {
    const top = LABEL_H + GAP + rowIndex * (cellH + GAP);
    labels.push({ text: unit.name, left: GAP, top: top + 4 });
    labels.push({
      text: `Human: ${unit.humanName}`,
      left: GAP,
      top: top + 24,
      size: 12,
    });
    const today = await readRaster(unitFile(unit.today));
    const mask = await readRaster(
      unitFile(unit.today).replace(/\.png$/, ".mask.png"),
    );
    const sample = all.find((entry) => entry.id === unit.study);
    if (sample === undefined) throw new Error(`${unit.study} is not cut`);
    const anchor = sample.anchor;
    const pieces: RgbaRaster[] = [
      ...OWNERS.map(([, colour]) => recoloured(today, mask, colour)),
      await readRaster(sampleFile(unit.study)),
      ...(PASS === 1 ? [] : [await readRaster(sampleFile(unit.study2))]),
    ];
    for (const [index, piece] of pieces.entries())
      blit(
        canvas,
        boardCell(grass, piece, anchor, scale),
        left0 + index * (cellW + GAP),
        top,
      );
    blit(
      canvas,
      boardCell(
        grass,
        await readRaster(unitFile(unit.human)),
        undefined,
        scale,
      ),
      left0 + pieces.length * (cellW + GAP),
      top,
    );
  }
  await writeSheet(
    path.join(OUT, `chosen-${scale === 1 ? "1x" : `x${scale}`}.png`),
    canvas,
    labels,
  );
}

async function alternativesSheet(all: readonly Sample[]): Promise<void> {
  const grass = await readRaster(
    path.join(ROOT, "public/assets/chibi/terrain/chibi-grass-1.png"),
  );
  const scale = 4;
  const cellW = 88 * scale;
  const cellH = 104 * scale + LABEL_H * 2;
  const rows = UNITS.map((unit) =>
    all
      .filter(
        (sample) =>
          sample.subject ===
          all.find((entry) => entry.id === chosenId(unit))?.subject,
      )
      .sort((left, right) =>
        left.role === right.role ? 0 : left.role === "chosen" ? -1 : 1,
      ),
  );
  const columns = Math.max(...rows.map((row) => row.length));
  const canvas = blank(
    GAP + columns * (cellW + GAP),
    GAP + rows.length * (cellH + GAP),
    PAPER,
  );
  const labels: Label[] = [];
  for (const [rowIndex, row] of rows.entries())
    for (const [index, sample] of row.entries()) {
      const left = GAP + index * (cellW + GAP);
      const top = GAP + rowIndex * (cellH + GAP);
      labels.push({
        text: `${sample.role === "chosen" ? "CHOSEN" : "alternative"}: ${sample.recipe} #${sample.candidate}`,
        left,
        top,
        size: 13,
        fill: sample.role === "chosen" ? "#8be28b" : "#f2d477",
      });
      labels.push({
        text: sample.note,
        left,
        top: top + LABEL_H - 4,
        size: 11,
      });
      blit(
        canvas,
        boardCell(
          grass,
          await readRaster(sampleFile(sample.id)),
          sample.anchor,
          scale,
        ),
        left,
        top + LABEL_H * 2,
      );
    }
  await writeSheet(path.join(OUT, "alternatives-x4.png"), canvas, labels);
}

// ------------------------------------------------------------ colour

const hexOf = (rgb: Rgb): string =>
  `#${rgb.map((value) => Math.round(value).toString(16).padStart(2, "0")).join("")}`;
const rgbOf = (hex: string): Rgb => {
  const value = Number.parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
};

const toLinear = (value: number): number => {
  const c = value / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};
const toSrgb = (value: number): number => {
  const c = Math.max(0, Math.min(1, value));
  return Math.round(
    255 * (c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055),
  );
};

/** CIE L*a*b* (D65) of an sRGB colour. */
function lab(rgb: Rgb): readonly [number, number, number] {
  const [r, g, b] = [toLinear(rgb[0]), toLinear(rgb[1]), toLinear(rgb[2])];
  const x = (0.4124564 * r + 0.3575761 * g + 0.1804375 * b) / 0.95047;
  const y = 0.2126729 * r + 0.7151522 * g + 0.072175 * b;
  const z = (0.0193339 * r + 0.119192 * g + 0.9503041 * b) / 1.08883;
  const f = (t: number): number =>
    t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116;
  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
}

/** CIE76 colour difference: about 2 is just noticeable, 10 is clear at a glance. */
function deltaE(left: Rgb, right: Rgb): number {
  const a = lab(left);
  const b = lab(right);
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

const luminance = (rgb: Rgb): number =>
  0.2126 * toLinear(rgb[0]) +
  0.7152 * toLinear(rgb[1]) +
  0.0722 * toLinear(rgb[2]);

/** WCAG contrast ratio, 1 (none) to 21. */
function contrast(left: Rgb, right: Rgb): number {
  const [hi, lo] = [luminance(left), luminance(right)].sort(
    (a, b) => b - a,
  ) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * Colour-vision-deficiency simulation (Machado, Oliveira and Fernandes 2009,
 * severity 1.0), applied in linear RGB.
 */
const CVD = {
  deuteranopia: [
    0.367322, 0.860646, -0.227968, 0.280085, 0.672501, 0.047413, -0.01182,
    0.04294, 0.968881,
  ],
  protanopia: [
    0.152286, 1.052583, -0.204868, 0.114503, 0.786281, 0.099216, -0.003882,
    -0.048116, 1.051998,
  ],
} as const;

function simulateColour(rgb: Rgb, kind: keyof typeof CVD): Rgb {
  const m = CVD[kind];
  const [r, g, b] = [toLinear(rgb[0]), toLinear(rgb[1]), toLinear(rgb[2])];
  return [
    toSrgb(m[0] * r + m[1] * g + m[2] * b),
    toSrgb(m[3] * r + m[4] * g + m[5] * b),
    toSrgb(m[6] * r + m[7] * g + m[8] * b),
  ];
}

/** The roles of the scrapyard palette, tested in this order. */
const BANDS: readonly {
  readonly id: string;
  readonly label: string;
  readonly test: (h: number, s: number, v: number) => boolean;
}[] = [
  {
    id: "spark",
    label: "fuse spark",
    test: (h, s, v) => h < 30 && s > 0.75 && v > 0.8,
  },
  {
    id: "hazard",
    label: "hazard yellow",
    test: (h, s, v) => h >= 30 && h < 50 && s > 0.7 && v > 0.75,
  },
  {
    id: "skin",
    label: "skin",
    test: (h, s, v) => h >= 48 && h <= 100 && s > 0.45 && v > 0.55,
  },
  {
    id: "skinShadow",
    label: "skin shadow",
    test: (h, s, v) => h >= 48 && h <= 100 && s > 0.45 && v > 0.25,
  },
  {
    id: "cream",
    label: "bandage, cone",
    test: (_h, s, v) => s < 0.4 && v > 0.85,
  },
  {
    id: "metal",
    label: "gunmetal",
    test: (h, s, v) => s < 0.45 && v >= 0.3 && h > 150 && h < 260,
  },
  {
    id: "hide",
    label: "hide, rust, planks",
    test: (h, s, v) => h < 45 && s > 0.4 && v >= 0.3 && v < 0.8,
  },
  { id: "leather", label: "leather", test: (_h, _s, v) => v > 0.06 && v < 0.3 },
];

interface BandMeasure {
  readonly share: number;
  readonly colours: readonly {
    readonly hex: string;
    readonly pixels: number;
  }[];
}

/** Share of opaque pixels and the commonest colours of each palette role. */
function measureBands(
  rasters: readonly RgbaRaster[],
  bands: typeof BANDS = BANDS,
): Record<string, BandMeasure> {
  const counts = new Map<string, Map<string, number>>(
    bands.map((band) => [band.id, new Map<string, number>()]),
  );
  let opaque = 0;
  for (const raster of rasters)
    for (let index = 0; index < raster.width * raster.height; index += 1) {
      if ((raster.data[index * 4 + 3] ?? 0) < 128) continue;
      opaque += 1;
      const rgb: Rgb = [
        raster.data[index * 4] ?? 0,
        raster.data[index * 4 + 1] ?? 0,
        raster.data[index * 4 + 2] ?? 0,
      ];
      const {
        hue: h,
        saturation: s,
        value: v,
      } = rgbToHsv(rgb[0], rgb[1], rgb[2]);
      const band = bands.find((entry) => entry.test(h, s, v));
      if (band === undefined) continue;
      const colours = counts.get(band.id);
      colours?.set(hexOf(rgb), (colours.get(hexOf(rgb)) ?? 0) + 1);
    }
  return Object.fromEntries(
    bands.map((band) => {
      const colours = [...(counts.get(band.id) ?? [])].sort(
        (left, right) => right[1] - left[1] || left[0].localeCompare(right[0]),
      );
      const total = colours.reduce((sum, [, pixels]) => sum + pixels, 0);
      return [
        band.id,
        {
          share: opaque === 0 ? 0 : total / opaque,
          colours: colours
            .slice(0, 3)
            .map(([hex, pixels]) => ({ hex, pixels })),
        },
      ];
    }),
  );
}

function meanColour(raster: RgbaRaster): Rgb {
  const sum = [0, 0, 0];
  let count = 0;
  for (let index = 0; index < raster.width * raster.height; index += 1) {
    if ((raster.data[index * 4 + 3] ?? 0) < 128) continue;
    count += 1;
    for (let channel = 0; channel < 3; channel += 1)
      sum[channel] =
        (sum[channel] ?? 0) + (raster.data[index * 4 + channel] ?? 0);
  }
  return [
    Math.round((sum[0] ?? 0) / count),
    Math.round((sum[1] ?? 0) / count),
    Math.round((sum[2] ?? 0) / count),
  ];
}

const round1 = (value: number): number => Math.round(value * 10) / 10;

interface Pair {
  readonly a: string;
  readonly b: string;
  readonly deltaE: number;
  readonly contrast: number;
  readonly deuteranopiaDeltaE: number;
  readonly protanopiaDeltaE: number;
}

function pair(aName: string, a: Rgb, bName: string, b: Rgb): Pair {
  return {
    a: `${aName} ${hexOf(a)}`,
    b: `${bName} ${hexOf(b)}`,
    deltaE: round1(deltaE(a, b)),
    contrast: round1(contrast(a, b)),
    deuteranopiaDeltaE: round1(
      deltaE(
        simulateColour(a, "deuteranopia"),
        simulateColour(b, "deuteranopia"),
      ),
    ),
    protanopiaDeltaE: round1(
      deltaE(simulateColour(a, "protanopia"), simulateColour(b, "protanopia")),
    ),
  };
}

interface SwatchRow {
  readonly label: string;
  readonly colours: readonly string[];
}

/** Rows of labelled colour swatches. */
async function writeSwatches(rows: readonly SwatchRow[]): Promise<void> {
  const swatch = 72;
  const labelW = 380;
  const rowH = swatch + GAP;
  const canvas = blank(
    labelW + 4 * (swatch + 96) + GAP,
    GAP + rows.length * rowH,
    PAPER,
  );
  const labels: Label[] = [];
  for (const [index, row] of rows.entries()) {
    const top = GAP + index * rowH;
    labels.push({ text: row.label, left: GAP, top: top + swatch / 2 - 10 });
    for (const [column, hex] of row.colours.slice(0, 4).entries()) {
      const left = labelW + column * (swatch + 96);
      fill(canvas, left, top, swatch, swatch, rgbOf(hex));
      labels.push({
        text: hex,
        left: left + swatch + 6,
        top: top + swatch / 2 - 10,
        size: 13,
      });
    }
  }
  await writeSheet(path.join(OUT, "palette.png"), canvas, labels);
}

/** The roles of the pass 2 palette, tested in this order. */
const BANDS_2: typeof BANDS = [
  {
    id: "cream",
    label: "paper cones, teeth",
    test: (_h, s, v) => s < 0.55 && v > 0.9,
  },
  {
    id: "yellow",
    label: "yellow: bomb stripe, rocket paper",
    test: (h, s, v) => h >= 40 && h < 56 && s > 0.85 && v > 0.75,
  },
  {
    id: "wood",
    label: "planks, sticks, rope",
    test: (h, s, v) => h >= 22 && h < 46 && s >= 0.45 && s <= 0.92 && v >= 0.5,
  },
  {
    id: "leather",
    label: "orange-brown leather (also spark, orange paper)",
    test: (h, s, v) => h >= 8 && h < 32 && s > 0.9 && v >= 0.7,
  },
  {
    id: "leatherShadow",
    label: "leather shadow",
    test: (h, s, v) => h >= 5 && h < 32 && s > 0.85 && v >= 0.3 && v < 0.7,
  },
  {
    id: "skin",
    label: "skin",
    test: (h, s, v) => h >= 48 && h <= 100 && s > 0.45 && v > 0.55,
  },
  {
    id: "skinShadow",
    label: "skin shadow",
    test: (h, s, v) => h >= 48 && h <= 100 && s > 0.45 && v > 0.2,
  },
  {
    id: "metal",
    label: "gunmetal",
    test: (h, s, v) => s < 0.45 && v >= 0.3 && h > 150 && h < 260,
  },
  {
    id: "paperRed",
    label: "red rocket paper",
    test: (h, s, v) => (h < 8 || h > 345) && s > 0.8 && v > 0.5,
  },
  {
    id: "paperBlue",
    label: "blue rocket paper",
    test: (h, s, v) => h >= 190 && h <= 225 && s > 0.8 && v > 0.3,
  },
  {
    id: "paperGreen",
    label: "green rocket paper",
    test: (h, s, v) => h > 100 && h <= 145 && s > 0.5 && v > 0.25,
  },
  {
    id: "dark",
    label: "near-black (bomb, belt, gaps)",
    test: (_h, _s, v) => v > 0.06 && v < 0.3,
  },
];

/** The saturated red of the Human direction units (their crimson cloth). */
const HUMAN_RED: typeof BANDS = [
  {
    id: "crimson",
    label: "Human crimson",
    test: (h, s, v) => (h < 10 || h > 340) && s > 0.7 && v > 0.45,
  },
];

/** The first base plate of the live look is 52 px wide (radius 26). */
const PLATE_WIDTH = 52;

function opaqueWidth(raster: RgbaRaster): {
  left: number;
  right: number;
  width: number;
} {
  let left = raster.width;
  let right = -1;
  for (let y = 0; y < raster.height; y += 1)
    for (let x = 0; x < raster.width; x += 1) {
      if ((raster.data[(y * raster.width + x) * 4 + 3] ?? 0) < 128) continue;
      left = Math.min(left, x);
      right = Math.max(right, x);
    }
  return { left, right, width: right - left + 1 };
}

/** Palette and readability of pass 2, beside pass 1 and today's sprites. */
async function paletteAndReadabilityPass2(
  all: readonly Sample[],
): Promise<void> {
  const chosen = all.filter(
    (sample) => sample.pass === 2 && sample.role === "chosen",
  );
  const rasterOf = (id: string): Promise<RgbaRaster> =>
    readRaster(sampleFile(id));
  const rasters = await Promise.all(
    chosen.map((sample) => rasterOf(sample.id)),
  );
  const pooled = measureBands(rasters, BANDS_2);
  const bandsOf = async (id: string) =>
    measureBands([await rasterOf(id)], BANDS_2);
  const first = (band: string, source = pooled): Rgb =>
    rgbOf(source[band]?.colours[0]?.hex ?? "#000000");

  const grassTiles = await Promise.all(
    [1, 2, 3].map((index) =>
      readRaster(
        path.join(ROOT, `public/assets/chibi/terrain/chibi-grass-${index}.png`),
      ),
    ),
  );
  const grass = meanColour({
    width: TILE * 3,
    height: TILE,
    data: Uint8Array.from(grassTiles.flatMap((tile) => [...tile.data])),
  });
  const goblin = await bandsOf(UNITS[0].study2);
  const bombChucker = await bandsOf(UNITS[1].study2);
  const cart = await bandsOf(UNITS[2].study2);
  const greenGoblin = await bandsOf("chibi-study2-goblin-green");
  const brightChucker = await bandsOf("chibi-study2-bomb-chucker-bright");
  const pass1Goblin = measureBands([await rasterOf(UNITS[0].study)]);
  const todayGoblin = measureBands([
    await readRaster(unitFile(UNITS[0].today)),
  ]);
  const humans = await Promise.all(
    UNITS.map((unit) => readRaster(unitFile(unit.human))),
  );
  const humanGold = first("hazard", measureBands(humans));
  const humanCrimson = first("crimson", measureBands(humans, HUMAN_RED));
  const player = Object.fromEntries(
    OWNERS.map(([name, hex]) => [name, rgbOf(hex)]),
  ) as Record<string, Rgb>;
  const gold = player.GOLD as Rgb;
  const coral = player.CORAL as Rgb;
  const leather = first("leather");
  const leatherShadow = first("leatherShadow");
  const yellow = first("yellow");
  const wood = first("wood", cart);

  const plates: Pair[] = [];
  for (const [index, [aName, aHex]] of OWNERS.entries())
    for (const [bName, bHex] of OWNERS.slice(index + 1))
      plates.push(
        pair(
          `${title(aName)} plate`,
          rgbOf(aHex),
          `${title(bName)} plate`,
          rgbOf(bHex),
        ),
      );

  const carts: Record<string, unknown> = {};
  for (const [label, file] of [
    ["today", unitFile(UNITS[2].today)],
    ["pass 1", sampleFile(UNITS[2].study)],
    ...all
      .filter(
        (sample) => sample.pass === 2 && sample.assetClass === "LARGE_UNIT",
      )
      .map((sample) => [
        `pass 2 ${sample.role} (${sample.recipe})`,
        sampleFile(sample.id),
      ]),
  ] as [string, string][]) {
    const bounds = opaqueWidth(await readRaster(file));
    // The plate is centred on the anchor column (x = 34).
    const plateLeft = 34 - PLATE_WIDTH / 2;
    carts[label] = {
      width: bounds.width,
      overhangLeft: Math.max(0, plateLeft - bounds.left),
      overhangRight: Math.max(0, bounds.right + 1 - (plateLeft + PLATE_WIDTH)),
    };
  }

  const chosenBands: readonly [string, Record<string, BandMeasure>][] = [
    [UNITS[0].study2, goblin],
    [UNITS[1].study2, bombChucker],
    [UNITS[2].study2, cart],
  ];
  const share = (source: Record<string, BandMeasure>, band: string): string =>
    `${round1((source[band]?.share ?? 0) * 100)}%`;
  const readability = {
    bead: BEAD,
    note: "deltaE is CIE76 in L*a*b* (about 2 is just noticeable, 10 is clear at a glance, 20 and more are different colours); contrast is the WCAG luminance ratio (1 to 21). The deuteranopia and protanopia columns repeat deltaE after the Machado 2009 simulation.",
    grassMean: hexOf(grass),
    skinAgainstGrass: [
      pair("pass 2 Goblin skin", first("skin", goblin), "Grass", grass),
      pair(
        "pass 2 Bomb Chucker skin",
        first("skin", bombChucker),
        "Grass",
        grass,
      ),
      pair("pass 2 skin shadow", first("skinShadow", goblin), "Grass", grass),
      pair(
        "pass 2 alternative leaf-green Goblin skin",
        first("skin", greenGoblin),
        "Grass",
        grass,
      ),
      pair(
        "pass 2 alternative bright Bomb Chucker skin",
        first("skin", brightChucker),
        "Grass",
        grass,
      ),
      pair("pass 1 Goblin skin", first("skin", pass1Goblin), "Grass", grass),
      pair("today's Goblin skin", first("skin", todayGoblin), "Grass", grass),
    ],
    skinConsistency: [
      pair(
        "pass 2 Goblin skin",
        first("skin", goblin),
        "pass 2 Bomb Chucker skin",
        first("skin", bombChucker),
      ),
      pair(
        "pass 2 Goblin skin",
        first("skin", goblin),
        "pass 2 cart crew skin",
        first("skin", cart),
      ),
      pair(
        "pass 2 Goblin skin",
        first("skin", goblin),
        "today's Goblin skin",
        first("skin", todayGoblin),
      ),
      pair(
        "pass 2 Goblin skin",
        first("skin", goblin),
        "pass 1 Goblin skin",
        first("skin", pass1Goblin),
      ),
    ],
    clothesAgainstGrass: [
      pair("orange-brown leather", leather, "Grass", grass),
      pair("leather shadow", leatherShadow, "Grass", grass),
      pair("cart planks", wood, "Grass", grass),
      pair("pass 1 leather", first("leather", pass1Goblin), "Grass", grass),
      pair("Coral garment (today)", coral, "Grass", grass),
    ],
    leatherAgainstPlayersAndHumans: [
      pair("orange-brown leather", leather, "Coral plate", coral),
      pair("orange-brown leather", leather, "Gold plate", gold),
      pair("orange-brown leather", leather, "Human crimson", humanCrimson),
      pair("leather shadow", leatherShadow, "Coral plate", coral),
      pair("leather shadow", leatherShadow, "Human crimson", humanCrimson),
    ],
    yellow: [
      pair("bomb stripe and rocket yellow", yellow, "Human gold", humanGold),
      pair("bomb stripe and rocket yellow", yellow, "Gold player", gold),
      pair("cart planks", wood, "Human gold", humanGold),
      pair("cart planks", wood, "Gold player", gold),
      pair("pass 2 Goblin skin", first("skin", goblin), "Gold player", gold),
      pair(
        "pass 2 Bomb Chucker skin",
        first("skin", bombChucker),
        "Gold player",
        gold,
      ),
    ],
    shareOfSprite: {
      note: "Share of each chosen sprite's opaque pixels per role. In pass 1 the near-black leather was 35% of the three sprites pooled.",
      ...Object.fromEntries(
        chosenBands.map(([id, bands]) => [
          id,
          {
            skin: `${round1(((bands.skin?.share ?? 0) + (bands.skinShadow?.share ?? 0)) * 100)}%`,
            leather: `${round1(((bands.leather?.share ?? 0) + (bands.leatherShadow?.share ?? 0)) * 100)}%`,
            wood: share(bands, "wood"),
            yellow: share(bands, "yellow"),
            nearBlack: share(bands, "dark"),
          },
        ]),
      ),
    },
    cartWidthAgainstPlate: {
      note: `Opaque width of the Rocket Cart sprite in pixels against its ${PLATE_WIDTH} px base plate, which is centred on the anchor column (x = 34); overhang is the part of the sprite beyond each end of the plate.`,
      plateWidth: PLATE_WIDTH,
      ...carts,
    },
    plates,
    platesAgainstGrass: OWNERS.map(([name, hex]) =>
      pair(`${title(name)} plate`, rgbOf(hex), "Grass", grass),
    ),
  };
  await writeFile(
    path.join(OUT, "readability.json"),
    `${JSON.stringify(readability, null, 2)}\n`,
  );
  console.log(
    `wrote ${path.relative(ROOT, path.join(OUT, "readability.json"))}`,
  );

  const palette = {
    bead: BEAD,
    note: "Measured on the three chosen pass 2 sprites pooled: share of opaque pixels and the three commonest colours of each role. The fuse spark and the orange rocket paper are the same orange as the leather and are counted with it.",
    roles: Object.fromEntries(
      BANDS_2.map((band) => [
        band.id,
        {
          label: band.label,
          share: `${round1((pooled[band.id]?.share ?? 0) * 100)}%`,
          colours: pooled[band.id]?.colours.map((colour) => colour.hex) ?? [],
        },
      ]),
    ),
  };
  await writeFile(
    path.join(OUT, "palette.json"),
    `${JSON.stringify(palette, null, 2)}\n`,
  );
  const hexes = (source: Record<string, BandMeasure>, band: string) =>
    source[band]?.colours.map((colour) => colour.hex) ?? [];
  await writeSwatches([
    ...BANDS_2.map((band) => ({
      label: `${band.label} (${palette.roles[band.id]?.share ?? ""})`,
      colours: palette.roles[band.id]?.colours ?? [],
    })),
    {
      label: "alternative leaf-green skin",
      colours: hexes(greenGoblin, "skin"),
    },
    { label: "pass 1 skin", colours: hexes(pass1Goblin, "skin") },
    { label: "pass 1 leather", colours: hexes(pass1Goblin, "leather") },
    { label: "today's Goblin skin", colours: hexes(todayGoblin, "skin") },
    { label: "Grass (mean)", colours: [hexOf(grass)] },
    { label: "Human gold", colours: hexes(measureBands(humans), "hazard") },
    {
      label: "Human crimson",
      colours: hexes(measureBands(humans, HUMAN_RED), "crimson"),
    },
    {
      label: "players: Coral, Teal, Gold, Violet",
      colours: OWNERS.map(([, hex]) => hex),
    },
  ]);
}

async function paletteAndReadability(all: readonly Sample[]): Promise<void> {
  const chosen = all.filter(
    (sample) => sample.pass === 1 && sample.role === "chosen",
  );
  const rasters = await Promise.all(
    chosen.map((sample) => readRaster(sampleFile(sample.id))),
  );
  const pooled = measureBands(rasters);
  const perUnit = Object.fromEntries(
    chosen.map((sample, index) => [
      sample.id,
      measureBands([rasters[index] as RgbaRaster]),
    ]),
  );
  const first = (band: string, source = pooled): Rgb =>
    rgbOf(source[band]?.colours[0]?.hex ?? "#000000");

  const grassTiles = await Promise.all(
    [1, 2, 3].map((index) =>
      readRaster(
        path.join(ROOT, `public/assets/chibi/terrain/chibi-grass-${index}.png`),
      ),
    ),
  );
  const grass = meanColour({
    width: TILE * 3,
    height: TILE,
    data: Uint8Array.from(grassTiles.flatMap((tile) => [...tile.data])),
  });
  const todayGoblin = measureBands([
    await readRaster(unitFile(UNITS[0].today)),
  ]);
  const humans = await Promise.all(
    UNITS.map((unit) => readRaster(unitFile(unit.human))),
  );
  const humanBands = measureBands(humans);
  const humanGold = first("hazard", humanBands);
  const player = Object.fromEntries(
    OWNERS.map(([name, hex]) => [name, rgbOf(hex)]),
  ) as Record<string, Rgb>;
  const gold = player.GOLD as Rgb;
  const skin = first("skin");
  const hazard = first("hazard");

  const plates: Pair[] = [];
  for (const [index, [aName, aHex]] of OWNERS.entries())
    for (const [bName, bHex] of OWNERS.slice(index + 1))
      plates.push(
        pair(
          `${title(aName)} plate`,
          rgbOf(aHex),
          `${title(bName)} plate`,
          rgbOf(bHex),
        ),
      );

  const readability = {
    bead: BEAD,
    note: "deltaE is CIE76 in L*a*b* (about 2 is just noticeable, 10 is clear at a glance, 20 and more are different colours); contrast is the WCAG luminance ratio (1 to 21). The deuteranopia and protanopia columns repeat deltaE after the Machado 2009 simulation.",
    grassMean: hexOf(grass),
    skinAgainstGrass: [
      pair(
        "study Goblin skin",
        first("skin", perUnit[UNITS[0].study]),
        "Grass",
        grass,
      ),
      pair(
        "study Bomb Chucker skin",
        first("skin", perUnit[UNITS[1].study]),
        "Grass",
        grass,
      ),
      pair("today's Goblin skin", first("skin", todayGoblin), "Grass", grass),
      pair("study skin shadow", first("skinShadow"), "Grass", grass),
    ],
    clothesAgainstGrass: [
      pair("study leather", first("leather"), "Grass", grass),
      pair("study hide", first("hide"), "Grass", grass),
      pair("Coral garment (today)", player.CORAL as Rgb, "Grass", grass),
      pair("Teal garment (today)", player.TEAL as Rgb, "Grass", grass),
    ],
    hazardYellow: [
      pair("hazard yellow", hazard, "Human gold", humanGold),
      pair("hazard yellow", hazard, "Gold player", gold),
      pair("Human gold", humanGold, "Gold player", gold),
      pair("study Goblin skin", skin, "Gold player", gold),
      pair(
        "study Bomb Chucker skin",
        first("skin", perUnit[UNITS[1].study]),
        "Gold player",
        gold,
      ),
      pair(
        "today's Goblin skin",
        first("skin", todayGoblin),
        "Gold player",
        gold,
      ),
    ],
    yellowShareOfSprite: {
      note: "Share of the sprite's opaque pixels in the saturated yellow band (hue 30 to 50): the hazard stripe on a Goblin unit, the heraldic gold on a Human one.",
      ...Object.fromEntries(
        chosen.map((sample) => [
          sample.id,
          `${round1((perUnit[sample.id]?.hazard?.share ?? 0) * 100)}%`,
        ]),
      ),
      ...Object.fromEntries(
        UNITS.map((unit, index) => [
          unit.human,
          `${round1((measureBands([humans[index] as RgbaRaster]).hazard?.share ?? 0) * 100)}%`,
        ]),
      ),
    },
    plates,
    platesAgainstGrass: OWNERS.map(([name, hex]) =>
      pair(`${title(name)} plate`, rgbOf(hex), "Grass", grass),
    ),
  };
  await writeFile(
    path.join(OUT, "readability.json"),
    `${JSON.stringify(readability, null, 2)}\n`,
  );
  console.log(
    `wrote ${path.relative(ROOT, path.join(OUT, "readability.json"))}`,
  );

  const palette = {
    bead: BEAD,
    note: "Measured on the three chosen study sprites pooled: share of opaque pixels and the three commonest colours of each role.",
    roles: Object.fromEntries(
      BANDS.map((band) => [
        band.id,
        {
          label: band.label,
          share: `${round1((pooled[band.id]?.share ?? 0) * 100)}%`,
          colours: pooled[band.id]?.colours.map((colour) => colour.hex) ?? [],
        },
      ]),
    ),
  };
  await writeFile(
    path.join(OUT, "palette.json"),
    `${JSON.stringify(palette, null, 2)}\n`,
  );

  // Swatches: the faction palette, then the colours it must stay apart from.
  const rows: {
    readonly label: string;
    readonly colours: readonly string[];
  }[] = [
    ...[
      "skin",
      "skinShadow",
      "leather",
      "hide",
      "metal",
      "hazard",
      "spark",
      "cream",
    ].map((id) => ({
      label: `${BANDS.find((band) => band.id === id)?.label ?? id} (${palette.roles[id]?.share ?? ""})`,
      colours: palette.roles[id]?.colours ?? [],
    })),
    { label: "Grass (mean)", colours: [hexOf(grass)] },
    {
      label: "today's Goblin skin",
      colours: todayGoblin.skin?.colours.map((colour) => colour.hex) ?? [],
    },
    {
      label: "Human gold",
      colours: humanBands.hazard?.colours.map((colour) => colour.hex) ?? [],
    },
    { label: "Human crimson", colours: ["#a8202c"] },
    {
      label: "players: Coral, Teal, Gold, Violet",
      colours: OWNERS.map(([, hex]) => hex),
    },
  ];
  const swatch = 72;
  const labelW = 300;
  const rowH = swatch + GAP;
  const canvas = blank(
    labelW + 4 * (swatch + 96) + GAP,
    GAP + rows.length * rowH,
    PAPER,
  );
  const labels: Label[] = [];
  for (const [index, row] of rows.entries()) {
    const top = GAP + index * rowH;
    labels.push({ text: row.label, left: GAP, top: top + swatch / 2 - 10 });
    for (const [column, hex] of row.colours.entries()) {
      const left = labelW + column * (swatch + 96);
      fill(canvas, left, top, swatch, swatch, rgbOf(hex));
      labels.push({
        text: hex,
        left: left + swatch + 6,
        top: top + swatch / 2 - 10,
        size: 13,
      });
    }
  }
  await writeSheet(path.join(OUT, "palette.png"), canvas, labels);
}

// ------------------------------------------------------------ browser

interface Connection {
  send(method: string, params?: Record<string, unknown>): Promise<unknown>;
  close(): void;
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function connect(webSocketUrl: string): Promise<Connection> {
  const socket = new WebSocket(webSocketUrl);
  await new Promise<void>((resolve, reject) => {
    socket.addEventListener("open", () => resolve(), { once: true });
    socket.addEventListener("error", () => reject(new Error("CDP failed")), {
      once: true,
    });
  });
  let nextId = 1;
  const pending = new Map<
    number,
    {
      resolve: (value: unknown) => void;
      reject: (error: Error) => void;
      method: string;
    }
  >();
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(String(event.data)) as {
      id?: number;
      result?: unknown;
      error?: { message?: string };
    };
    if (message.id === undefined) return;
    const request = pending.get(message.id);
    if (request === undefined) return;
    pending.delete(message.id);
    if (message.error !== undefined)
      request.reject(
        new Error(
          `${request.method}: ${message.error.message ?? "CDP failed"}`,
        ),
      );
    else request.resolve(message.result);
  });
  return {
    send(method, params = {}) {
      const id = nextId;
      nextId += 1;
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject, method });
        socket.send(JSON.stringify({ id, method, params }));
      });
    },
    close() {
      socket.close();
    },
  };
}

async function evaluate<T>(
  connection: Connection,
  expression: string,
): Promise<T> {
  const response = (await connection.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  })) as {
    result?: { value?: T };
    exceptionDetails?: { exception?: { description?: string }; text?: string };
  };
  if (response.exceptionDetails !== undefined)
    throw new Error(
      response.exceptionDetails.exception?.description ??
        response.exceptionDetails.text ??
        "Browser evaluation failed",
    );
  return response.result?.value as T;
}

async function waitFor(
  connection: Connection,
  expression: string,
  attempts = 400,
): Promise<void> {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (
      await evaluate<boolean>(connection, `Boolean(${expression})`).catch(
        () => false,
      )
    )
      return;
    await delay(50);
  }
  throw new Error(`Chrome timed out waiting for ${expression}`);
}

async function screenshot(connection: Connection): Promise<Buffer> {
  const shot = (await connection.send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: false,
  })) as { data?: string };
  if (shot.data === undefined) throw new Error("Chrome returned no screenshot");
  return Buffer.from(shot.data, "base64");
}

/** Screenshots until two in a row match, so every raster has loaded. */
async function settledScreenshot(connection: Connection): Promise<Buffer> {
  let previous = await screenshot(connection);
  for (let attempt = 0; attempt < 20; attempt += 1) {
    await delay(350);
    const next = await screenshot(connection);
    if (attempt > 0 && next.equals(previous)) return next;
    previous = next;
  }
  return previous;
}

const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900, dpr: 1, mobile: false },
  { name: "phone", width: 390, height: 844, dpr: 3, mobile: true },
] as const;
const ZOOMS = ["1", "0.75"] as const;
const SCENES = ["FOUR", "MIXED"] as const;
type SceneKind = (typeof SCENES)[number];
type Variant = "today" | "study" | "pass1" | "pass2" | "plain" | "marker";

/** The study panels beside TODAY: one in pass 1, both passes in pass 2. */
const STUDY_VARIANTS: readonly {
  readonly variant: Variant;
  readonly pass: 1 | 2;
  readonly label: string;
}[] =
  PASS === 1
    ? [{ variant: "study", pass: 1, label: "Study: fixed scrapyard colours" }]
    : [
        {
          variant: "pass1",
          pass: 1,
          label: "Pass 1: near-black leather, striped rocket",
        },
        {
          variant: "pass2",
          pass: 2,
          label: "PASS 2: orange-brown leather, fireworks cart",
        },
      ];

const captureFile = (
  scene: SceneKind,
  variant: Variant,
  viewport: string,
  zoom: string,
): string =>
  path.join(
    CAPTURES,
    `ingame-${scene.toLowerCase()}-${variant}-${viewport}-zoom-${zoom}.png`,
  );

const SCENE = `globalThis.__GOBLIN_STUDY_SCENE__`;

async function captureAll(
  baseUrl: string,
  all: readonly Sample[],
): Promise<void> {
  const chrome = process.env.CHROME_PATH;
  if (chrome === undefined || chrome === "")
    throw new Error("Set CHROME_PATH to a Chrome binary (or --skip-capture)");
  const chosenOf = (pass: 1 | 2) =>
    all
      .filter((sample) => sample.role === "chosen" && sample.pass === pass)
      .map(({ id, subject, assetClass, width, height, anchor, url }) => ({
        id,
        subject,
        assetClass,
        width,
        height,
        ...(anchor === undefined ? {} : { anchor }),
        url,
        fixedColours: true,
      }));
  const debugPort = 10_600 + (process.pid % 80);
  const profile = await mkdtemp(path.join(tmpdir(), "pulp-wars-goblin-"));
  const url = new URL(baseUrl);
  url.searchParams.set("art", "chibi");
  const browser = spawn(
    chrome,
    [
      "--headless=new",
      "--mute-audio",
      "--disable-gpu",
      "--hide-scrollbars",
      "--no-first-run",
      "--no-default-browser-check",
      `--remote-debugging-port=${debugPort}`,
      `--user-data-dir=${profile}`,
      "--window-size=1440,900",
      "about:blank",
    ],
    { stdio: "ignore" },
  );
  try {
    let target: { webSocketDebuggerUrl: string } | undefined;
    for (let attempt = 0; attempt < 150 && target === undefined; attempt += 1) {
      try {
        const response = await fetch(`http://localhost:${debugPort}/json/list`);
        const targets = (await response.json()) as {
          type: string;
          webSocketDebuggerUrl: string;
        }[];
        target = targets.find((candidate) => candidate.type === "page");
      } catch {
        // Chrome may not have opened its debugging port yet.
      }
      if (target === undefined) await delay(100);
    }
    if (target === undefined)
      throw new Error("Chrome debugging target did not become ready");
    const connection = await connect(target.webSocketDebuggerUrl);
    await connection.send("Page.enable");
    await connection.send("Runtime.enable");
    for (const viewport of VIEWPORTS) {
      await connection.send("Emulation.setDeviceMetricsOverride", {
        width: viewport.width,
        height: viewport.height,
        deviceScaleFactor: viewport.dpr,
        mobile: viewport.mobile,
      });
      await evaluate(connection, `globalThis.__GS_OLD__ = true`);
      await connection.send("Page.navigate", { url: url.href });
      await waitFor(
        connection,
        `globalThis.__GS_OLD__ !== true && document.readyState === 'complete' && globalThis.__PULP_WARS_APP__ !== undefined`,
      );
      await evaluate(
        connection,
        `(() => { for (const key of Object.keys(localStorage)) if (key.startsWith('pulpWars.save.')) localStorage.removeItem(key); globalThis.__GS_OLD__ = true; })()`,
      );
      await connection.send("Page.reload");
      await waitFor(
        connection,
        `globalThis.__GS_OLD__ !== true && document.readyState === 'complete' && document.querySelector('[data-action="launch"]') !== null && globalThis.__PULP_WARS_APP__?.controller.snapshot().phase === 'EMPTY'`,
      );
      // The fixed 16 x 16 Showcase board: the scenes rewrite a 7 x 7 patch
      // around the capital, whose cell never varies, so every run frames
      // them identically.
      await evaluate(
        connection,
        `(() => { const type = document.querySelector('#v7-map-type'); type.value = 'SHOWCASE'; type.dispatchEvent(new Event('change', { bubbles: true })); document.querySelector('[data-action="launch"]').click(); return true; })()`,
      );
      await waitFor(
        connection,
        `(() => { const s = globalThis.__PULP_WARS_APP__?.controller.snapshot(); const v = s?.view; return s?.phase === 'ACTIVE' && !s.transitioning && !s.ai.active && v?.turnOrder[v.activeSeatIndex] === v?.humanPlayerId && document.querySelector('canvas.board-canvas-v7')?.dataset.artSet === 'CHIBI'; })()`,
        900,
      );
      const jobs: { scene: SceneKind; variant: Variant }[] = [
        { scene: "FOUR", variant: "plain" },
        { scene: "FOUR", variant: "marker" },
        ...SCENES.flatMap((scene) => [
          { scene, variant: "today" as const },
          ...STUDY_VARIANTS.map(({ variant }) => ({ scene, variant })),
        ]),
      ];
      for (const job of jobs) {
        const study = STUDY_VARIANTS.find(
          (entry) => entry.variant === job.variant,
        );
        const options = {
          kind: job.scene,
          ...(study === undefined ? {} : { samples: chosenOf(study.pass) }),
          ...(job.variant === "marker" ? { marker: true } : {}),
        };
        await evaluate(
          connection,
          `(async () => { const module = await import('/scripts/art/goblin-direction/scene.ts'); ${SCENE} = module.showGoblinStudySceneV7(globalThis.__PULP_WARS_APP__.controller.snapshot().view, ${JSON.stringify(options)}); return true; })()`,
        );
        for (const step of ZOOMS) {
          for (let attempt = 0; attempt < 6; attempt += 1) {
            const current = await evaluate<string | null>(
              connection,
              `${SCENE}.canvas.dataset.zoomStep ?? null`,
            );
            if (current === step) break;
            await evaluate(
              connection,
              `${SCENE}.host.zoom(${JSON.stringify(Number(current) < Number(step) ? "IN" : "OUT")})`,
            );
          }
          const zoomStep = await evaluate<string | null>(
            connection,
            `${SCENE}.canvas.dataset.zoomStep ?? null`,
          );
          if (zoomStep !== step)
            throw new Error(`scene could not reach zoom ${step}: ${zoomStep}`);
          await writeFile(
            captureFile(job.scene, job.variant, viewport.name, step),
            await settledScreenshot(connection),
          );
        }
        await evaluate(
          connection,
          `(() => { ${SCENE}.host.destroy(); document.querySelector('[data-chibi-review-scene]')?.remove(); delete ${SCENE}; return true; })()`,
        );
        console.log(`captured ${job.scene} ${job.variant} ${viewport.name}`);
      }
    }
    connection.close();
  } finally {
    browser.kill();
    await delay(300);
    await rm(profile, { recursive: true, force: true }).catch(() => undefined);
  }
}

async function waitForServer(url: string): Promise<void> {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // The dev server is still starting.
    }
    await delay(150);
  }
  throw new Error(`Dev server at ${url} did not start`);
}

async function startDevServer(port: number): Promise<ChildProcess> {
  if (port === 6173)
    throw new Error("Port 6173 is the user's dev server; pick another");
  const server = spawn(
    path.join(ROOT, "node_modules/.bin/vite"),
    ["--host", "localhost", "--port", String(port), "--strictPort"],
    { cwd: ROOT, stdio: "ignore", detached: true },
  );
  await waitForServer(`http://localhost:${port}/`);
  return server;
}

function stopDevServer(server: ChildProcess): void {
  if (server.pid === undefined) return;
  try {
    process.kill(-server.pid, "SIGTERM");
  } catch {
    server.kill("SIGTERM");
  }
}

// ------------------------------------------------------------ composites

interface Raster {
  readonly width: number;
  readonly height: number;
  readonly data: Buffer;
}

async function loadRaster(file: string): Promise<Raster> {
  const { data, info } = await sharp(file)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { width: info.width, height: info.height, data };
}

function simulate(raster: Raster, kind: keyof typeof CVD): Raster {
  const data = Buffer.alloc(raster.data.length);
  for (let index = 0; index < raster.width * raster.height; index += 1) {
    const out = simulateColour(
      [
        raster.data[index * 3] ?? 0,
        raster.data[index * 3 + 1] ?? 0,
        raster.data[index * 3 + 2] ?? 0,
      ],
      kind,
    );
    data[index * 3] = out[0];
    data[index * 3 + 1] = out[1];
    data[index * 3 + 2] = out[2];
  }
  return { width: raster.width, height: raster.height, data };
}

function crop(
  raster: Raster,
  box: { left: number; top: number; width: number; height: number },
): Raster {
  const left = Math.max(0, Math.min(raster.width - 1, Math.round(box.left)));
  const top = Math.max(0, Math.min(raster.height - 1, Math.round(box.top)));
  const width = Math.min(raster.width - left, Math.round(box.width));
  const height = Math.min(raster.height - top, Math.round(box.height));
  const data = Buffer.alloc(width * height * 3);
  for (let y = 0; y < height; y += 1)
    raster.data.copy(
      data,
      y * width * 3,
      ((top + y) * raster.width + left) * 3,
      ((top + y) * raster.width + left + width) * 3,
    );
  return { width, height, data };
}

/**
 * The centre of the scene's capital cell in device pixels: the middle of
 * the selection outline that the marker capture adds to the plain one.
 */
async function capitalCentre(
  viewport: string,
  zoom: string,
): Promise<{ x: number; y: number }> {
  const plain = await loadRaster(captureFile("FOUR", "plain", viewport, zoom));
  const marker = await loadRaster(
    captureFile("FOUR", "marker", viewport, zoom),
  );
  let left = plain.width;
  let right = -1;
  let top = plain.height;
  let bottom = -1;
  for (let y = 0; y < plain.height; y += 1)
    for (let x = 0; x < plain.width; x += 1) {
      const index = (y * plain.width + x) * 3;
      if (
        plain.data[index] === marker.data[index] &&
        plain.data[index + 1] === marker.data[index + 1] &&
        plain.data[index + 2] === marker.data[index + 2]
      )
        continue;
      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
    }
  if (right < 0) throw new Error(`no capital marker in ${viewport} ${zoom}`);
  return { x: (left + right + 1) / 2, y: (top + bottom + 1) / 2 };
}

interface Panel {
  readonly label: string;
  readonly raster: Raster;
}

/** A labelled grid of equally sized panels. */
async function writeGrid(
  file: string,
  panels: readonly Panel[],
  columns: number,
): Promise<void> {
  const first = panels[0];
  if (first === undefined) return;
  const cellWidth = first.raster.width;
  const cellHeight = first.raster.height;
  const gap = 12;
  const labelHeight = 30;
  const rows = Math.ceil(panels.length / columns);
  const width = columns * cellWidth + (columns + 1) * gap;
  const height = rows * (cellHeight + labelHeight + gap) + gap;
  const composites: { input: Buffer; left: number; top: number }[] = [];
  const labels: string[] = [];
  for (const [index, panel] of panels.entries()) {
    const left = gap + (index % columns) * (cellWidth + gap);
    const top =
      gap + Math.floor(index / columns) * (cellHeight + labelHeight + gap);
    composites.push({
      input: await sharp(panel.raster.data, {
        raw: {
          width: panel.raster.width,
          height: panel.raster.height,
          channels: 3,
        },
      })
        .png()
        .toBuffer(),
      left,
      top: top + labelHeight,
    });
    labels.push(
      `<text x="${left}" y="${top + 21}" font-family="Helvetica, Arial, sans-serif" font-size="17" font-weight="700" fill="#f4f1e8">${escapeXml(panel.label)}</text>`,
    );
  }
  composites.push({
    input: Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${labels.join("")}</svg>`,
    ),
    left: 0,
    top: 0,
  });
  await sharp({
    create: { width, height, channels: 3, background: "#1c2426" },
  })
    .composite(composites)
    .png({ compressionLevel: 9 })
    .toFile(file);
  console.log(`wrote ${path.relative(ROOT, file)}`);
}

async function compose(): Promise<void> {
  for (const viewport of VIEWPORTS)
    for (const zoom of ZOOMS) {
      const centre = await capitalCentre(viewport.name, zoom);
      const cell = TILE * Number(zoom) * viewport.dpr;
      // The scene is 7 x 7 cells with the capital at (3,4): a window of
      // 7.5 x 7.75 cells holds it with the heads of the top row.
      const window = {
        left: centre.x - 3.75 * cell,
        top: centre.y - 4.9 * cell,
        width: 7.5 * cell,
        height: 7.75 * cell,
      };
      for (const scene of SCENES) {
        const panels: Panel[] = [];
        for (const { variant, label } of [
          {
            variant: "today" as Variant,
            label: `Today (${scene === "FOUR" ? "four Goblin players" : "Goblin against Human"})`,
          },
          ...STUDY_VARIANTS,
        ])
          panels.push({
            label,
            raster: crop(
              await loadRaster(
                captureFile(scene, variant, viewport.name, zoom),
              ),
              window,
            ),
          });
        await writeGrid(
          path.join(
            OUT,
            `before-after-${scene.toLowerCase()}-${viewport.name}-zoom-${zoom}.png`,
          ),
          panels,
          panels.length,
        );
      }
      // The same unit of four players: the three Grass rows, columns 1-5.
      const study = await loadRaster(
        captureFile(
          "FOUR",
          STUDY_VARIANTS[STUDY_VARIANTS.length - 1]?.variant ?? "study",
          viewport.name,
          zoom,
        ),
      );
      const strip = crop(study, {
        left: centre.x - 2.5 * cell,
        top: centre.y - 4.9 * cell,
        width: 5 * cell,
        height: 3.45 * cell,
      });
      await writeGrid(
        path.join(OUT, `same-unit-${viewport.name}-zoom-${zoom}.png`),
        [
          { label: "As seen", raster: strip },
          {
            label: "Deuteranopia (simulated)",
            raster: simulate(strip, "deuteranopia"),
          },
          {
            label: "Protanopia (simulated)",
            raster: simulate(strip, "protanopia"),
          },
        ],
        3,
      );
    }
}

async function writeIndex(): Promise<void> {
  const files = [];
  for (const name of (await readdir(OUT)).sort()) {
    if (name === "index.json" || !/\.(png|json)$/.test(name)) continue;
    const bytes = await readFile(path.join(OUT, name));
    const size = name.endsWith(".png")
      ? await sharp(bytes).metadata()
      : undefined;
    files.push({
      file: name,
      sha256: sha256(bytes),
      ...(size === undefined ? {} : { width: size.width, height: size.height }),
    });
  }
  await writeFile(
    path.join(OUT, "index.json"),
    `${JSON.stringify(
      {
        bead: BEAD,
        note: "Review evidence of the Goblin direction study. The before-after and same-unit images are drawn by the real board host with the look the game draws by default; nothing here is registered as production art.",
        files,
      },
      null,
      2,
    )}\n`,
  );
}

async function main(): Promise<void> {
  await mkdir(OUT, { recursive: true });
  await mkdir(CAPTURES, { recursive: true });
  const all = await samples();
  await candidatesSheet(all);
  await chosenSheet(all, 1);
  await chosenSheet(all, 4);
  await alternativesSheet(all.filter((sample) => sample.pass === PASS));
  if (PASS === 1) await paletteAndReadability(all);
  else await paletteAndReadabilityPass2(all);
  if (!process.argv.includes("--skip-capture")) {
    const port = Number(option("--port") ?? 6481);
    const server = await startDevServer(port);
    try {
      await captureAll(`http://localhost:${port}/`, all);
    } finally {
      stopDevServer(server);
    }
    await compose();
  }
  await writeIndex();
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "review failed");
  process.exitCode = 1;
});
