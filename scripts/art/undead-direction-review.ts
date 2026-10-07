/**
 * Review evidence of the Undead direction study (bead pulp_wars-3tq.11,
 * docs/art/VISUAL_DIRECTION_2026-10.md, "Undead study"):
 *
 *   npm run art:undead-direction-study-review -- [--port 6491]
 *       [--skip-capture] [--captures DIR] [--out DIR]
 *
 * Writes to art/pixellab/reviews/undead-direction-study/:
 *
 *   candidates-x3.png       every candidate of the exploration run on Grass
 *                           at x3 and 1:1, with its verdict
 *   options-1x.png, -x4.png rows = units; columns = today's sprite in the
 *                           four player colours, the violet, cyan and green
 *                           options, and the Human direction unit of the role
 *   terrain-x3.png          each option of each unit on Grass, Forest and
 *                           Mountain art (untoned rasters)
 *   alternatives-x4.png     each base beside the alternatives kept, with the
 *                           two accents made by a PixelLab edit pass
 *   markers-x4.png          the existing Undead markers and effects beside
 *                           the three accents
 *   palette.png, .json      the palette of each option, measured on its
 *                           three sprites, beside Grass, the player colours,
 *                           Goblin skin and the Human crimson
 *   readability.json        bone, dark cloth and each accent against the
 *                           terrain, the plates, Goblin skin and the markers
 *                           (also under simulated colour-vision deficiency),
 *                           and each sprite's width against its plate
 *   scene-<scene>-<viewport>-zoom-<step>.png
 *                           scenes FOUR (four Undead players) and MIXED
 *                           (Undead, Human, Goblin) of
 *                           scripts/art/undead-direction/scene.ts drawn by
 *                           the real board host with the look the game
 *                           draws: today, violet, cyan and green; desktop
 *                           and phone, zoom 1 and 0.75
 *   same-unit-<viewport>-zoom-<step>.png
 *                           the four Undead players' units per accent, as
 *                           seen and under simulated deuteranopia and
 *                           protanopia
 *   index.json              files, sizes and hashes
 *
 * The full-screen captures go to --captures (a temporary directory by
 * default). Captures start Vite on --port (default 6491, never the user's
 * 6173) and use headless Chrome from CHROME_PATH. No PixelLab call is made.
 * The sheet, colour and browser helpers follow
 * scripts/art/goblin-direction-review.ts.
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
import { candidateCell, cropRaster, opaqueBounds } from "./chibi/raster";
import {
  ACCENT_REMAPS,
  isAccentPixel,
  remapAccentColour,
  type UndeadAccentV7,
} from "./undead-direction/accent";

const ROOT = process.cwd();
const RUN = "art/explorations/undead-direction-2026-10";
const TILE = 80;
/** Width of the base plate in CSS px at zoom 1 (visual-direction-v7.ts). */
const PLATE_WIDTH = 52;
const ACCENTS: readonly UndeadAccentV7[] = ["violet", "cyan", "green"];

function option(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  const value = index < 0 ? undefined : process.argv[index + 1];
  return value === undefined || value.startsWith("--") ? undefined : value;
}

const OUT = path.resolve(
  option("--out") ?? "art/pixellab/reviews/undead-direction-study",
);
const CAPTURES = path.resolve(
  option("--captures") ?? path.join(tmpdir(), "pulp-wars-undead-direction"),
);

type Rgb = readonly [number, number, number];

/** The study's units: today's asset, the study unit, the Human asset. */
const UNITS = [
  {
    name: "Skeleton",
    unit: "skeleton",
    today: "chibi-undead-skeleton",
    human: "chibi-direction-fighter",
    humanName: "Fighter",
  },
  {
    name: "Zombie",
    unit: "zombie",
    today: "chibi-undead-zombie",
    human: "chibi-direction-guard",
    humanName: "Guard",
  },
  {
    name: "Necromancer",
    unit: "necromancer",
    today: "chibi-undead-necromancer",
    human: "chibi-direction-captain",
    humanName: "Captain",
  },
] as const;

const studyId = (unit: string, accent: UndeadAccentV7): string =>
  `chibi-study-${unit}-${accent}`;

const OWNERS = Object.entries(RULESET7_PLAYER_COLORS) as [string, string][];
const title = (text: string): string =>
  text.charAt(0) + text.slice(1).toLowerCase();

interface Sample {
  readonly id: string;
  readonly subject: string;
  readonly assetClass: string;
  readonly width: number;
  readonly height: number;
  readonly url: string;
  readonly fixedColours: true;
  readonly role: "chosen" | "alternative";
  readonly unit?: string;
  readonly accent?: UndeadAccentV7;
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

const terrainFile = (name: string): string =>
  path.join(ROOT, "public/assets/chibi/terrain", `${name}.png`);

/** A board cell on tall terrain: ground, the piece, then nothing over it. */
function terrainCell(
  layers: readonly RgbaRaster[],
  piece: RgbaRaster,
  scale: number,
): Canvas {
  const width = 88;
  const height = 104;
  const out = blank(width * scale, height * scale, FRAME);
  const tileLeft = ((width - TILE) / 2) * scale;
  const tileBottom = height * scale;
  for (const layer of layers)
    blit(
      out,
      layer,
      tileLeft + ((TILE - layer.width) / 2) * scale,
      tileBottom - layer.height * scale,
      scale,
    );
  blit(
    out,
    piece,
    tileLeft + (TILE / 2 - piece.width / 2) * scale,
    tileBottom - piece.height * scale,
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
    recipes: { id: string; asset: string; endpoint: string }[];
  };
  const records = JSON.parse(
    await readFile(path.join(ROOT, RUN, "records.json"), "utf8"),
  ) as { recipes: Record<string, RecipeRecord> };
  const grass = await readRaster(terrainFile("chibi-grass-1"));
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
  let row = 0;
  for (const asset of manifest.assets) {
    let column = 0;
    for (const recipe of manifest.recipes.filter(
      (entry) => entry.asset === asset.id,
    )) {
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
            ? "BASE (chosen)"
            : sample?.role === "alternative"
              ? "alternative"
              : record.review?.verdict === "REJECTED"
                ? "rejected"
                : "other candidate";
        if (column === columns) {
          column = 0;
          row += 1;
        }
        cells.push({
          row,
          column,
          big: boardCell(grass, piece, undefined, scale),
          small: boardCell(grass, piece, undefined, 1),
          lines: [
            `${recipe.id} #${index}`,
            `${verdict} (${recipe.endpoint === "create-image-pixen" ? "fresh" : "edit"})`,
          ],
          colour:
            verdict === "BASE (chosen)"
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

/** Rows = units; columns = today x4, the three accents, the Human unit. */
async function optionsSheet(scale: number): Promise<void> {
  const grass = await readRaster(terrainFile("chibi-grass-1"));
  const columns = [
    ...OWNERS.map(([name]) => `today, ${title(name)}`),
    ...ACCENTS.map((accent) => `${accent} accent`),
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
    const pieces: RgbaRaster[] = [
      ...OWNERS.map(([, colour]) => recoloured(today, mask, colour)),
      ...(await Promise.all(
        ACCENTS.map((accent) =>
          readRaster(sampleFile(studyId(unit.unit, accent))),
        ),
      )),
      await readRaster(unitFile(unit.human)),
    ];
    for (const [index, piece] of pieces.entries())
      blit(
        canvas,
        boardCell(grass, piece, undefined, scale),
        left0 + index * (cellW + GAP),
        top,
      );
  }
  await writeSheet(
    path.join(OUT, `options-${scale === 1 ? "1x" : `x${scale}`}.png`),
    canvas,
    labels,
  );
}

/** Each option of each unit on Grass, Forest and Mountain art. */
async function terrainSheet(): Promise<void> {
  const scale = 3;
  const grounds: { name: string; layers: RgbaRaster[] }[] = [
    { name: "Grass", layers: [await readRaster(terrainFile("chibi-grass-1"))] },
    {
      name: "Forest",
      layers: [
        await readRaster(terrainFile("chibi-grass-1")),
        await readRaster(terrainFile("chibi-forest-1")),
      ],
    },
    {
      name: "Mountain",
      layers: [
        await readRaster(terrainFile("chibi-mountain-ground-1")),
        await readRaster(terrainFile("chibi-mountain-1")),
      ],
    },
  ];
  const cellW = 88 * scale;
  const cellH = 104 * scale;
  const left0 = 110;
  const columns = grounds.flatMap((ground) =>
    ACCENTS.map((accent) => ({ ground, accent })),
  );
  const canvas = blank(
    left0 + columns.length * (cellW + GAP) + GAP,
    LABEL_H + GAP + UNITS.length * (cellH + GAP),
    PAPER,
  );
  const labels: Label[] = columns.map((column, index) => ({
    text: `${column.ground.name}, ${column.accent}`,
    left: left0 + index * (cellW + GAP),
    top: 2,
    size: 13,
  }));
  for (const [rowIndex, unit] of UNITS.entries()) {
    const top = LABEL_H + GAP + rowIndex * (cellH + GAP);
    labels.push({ text: unit.name, left: GAP, top: top + 4 });
    for (const [index, column] of columns.entries())
      blit(
        canvas,
        terrainCell(
          column.ground.layers,
          await readRaster(sampleFile(studyId(unit.unit, column.accent))),
          scale,
        ),
        left0 + index * (cellW + GAP),
        top,
      );
  }
  await writeSheet(path.join(OUT, "terrain-x3.png"), canvas, labels);
}

async function alternativesSheet(all: readonly Sample[]): Promise<void> {
  const grass = await readRaster(terrainFile("chibi-grass-1"));
  const scale = 4;
  const cellW = 88 * scale;
  const cellH = 104 * scale + LABEL_H * 2;
  const rows = UNITS.map((unit) => {
    const subject = all.find(
      (entry) => entry.id === studyId(unit.unit, "violet"),
    )?.subject;
    return all.filter(
      (sample) =>
        sample.subject === subject &&
        (sample.role === "alternative" || sample.accent === "violet"),
    );
  });
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
        text: `${sample.role === "chosen" ? "BASE" : "alternative"}: ${sample.recipe} #${sample.candidate}`,
        left,
        top,
        size: 12,
        fill: sample.role === "chosen" ? "#8be28b" : "#f2d477",
      });
      labels.push({
        text:
          sample.note.length > 56
            ? `${sample.note.slice(0, 55)}…`
            : sample.note,
        left,
        top: top + LABEL_H - 4,
        size: 11,
      });
      blit(
        canvas,
        boardCell(
          grass,
          await readRaster(sampleFile(sample.id)),
          undefined,
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

// ------------------------------------------------------------ palette

/** The lit accent tone of an option: the commonest generated tone, remapped. */
const ACCENT_SOURCE_LIT: Rgb = [0xd5, 0x21, 0xee];

interface Band {
  readonly id: string;
  readonly label: string;
  readonly test: (h: number, s: number, v: number) => boolean;
}

/** The roles of the bone palette, tested in this order (accent first). */
function bands(accent: UndeadAccentV7): readonly Band[] {
  const hue = ACCENT_REMAPS[accent].hue;
  return [
    {
      id: "accent",
      label: `${accent} accent`,
      test: (h, s, v) => Math.abs(h - hue) <= 30 && s >= 0.4 && v >= 0.2,
    },
    {
      id: "bone",
      label: "bone, lit",
      test: (h, s, v) =>
        h >= 25 && h <= 65 && s >= 0.04 && s <= 0.3 && v >= 0.8,
    },
    {
      id: "boneShade",
      label: "bone, shaded",
      test: (h, s, v) =>
        h >= 25 && h <= 65 && s >= 0.1 && s <= 0.37 && v >= 0.5 && v < 0.8,
    },
    {
      id: "bronze",
      label: "tarnished bronze",
      test: (h, s, v) => h >= 20 && h <= 45 && s >= 0.38 && v >= 0.3 && v < 0.9,
    },
    {
      id: "flesh",
      label: "pallid flesh",
      test: (h, s, v) =>
        (h < 35 || h > 300) && s >= 0.05 && s <= 0.2 && v >= 0.45 && v <= 0.72,
    },
    {
      id: "iron",
      label: "iron",
      test: (h, s, v) =>
        h >= 180 && h <= 232 && s >= 0.04 && s <= 0.35 && v >= 0.3 && v < 0.9,
    },
    {
      id: "white",
      label: "beard white",
      test: (_h, s, v) => s < 0.04 && v > 0.9,
    },
    {
      id: "cloth",
      label: "dark cloth",
      test: (_h, _s, v) => v > 0.06 && v < 0.3,
    },
  ];
}

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
  roles: readonly Band[],
): Record<string, BandMeasure> {
  const counts = new Map<string, Map<string, number>>(
    roles.map((band) => [band.id, new Map<string, number>()]),
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
      const band = roles.find((entry) => entry.test(h, s, v));
      if (band === undefined) continue;
      const colours = counts.get(band.id);
      colours?.set(hexOf(rgb), (colours.get(hexOf(rgb)) ?? 0) + 1);
    }
  return Object.fromEntries(
    roles.map((band) => {
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

/** Mean colour of the opaque pixels that pass `keep` (all by default). */
function meanOf(
  raster: RgbaRaster,
  keep: (h: number, s: number, v: number) => boolean = () => true,
): Rgb {
  const sum = [0, 0, 0];
  let count = 0;
  for (let index = 0; index < raster.width * raster.height; index += 1) {
    if ((raster.data[index * 4 + 3] ?? 0) < 128) continue;
    const r = raster.data[index * 4] ?? 0;
    const g = raster.data[index * 4 + 1] ?? 0;
    const b = raster.data[index * 4 + 2] ?? 0;
    const { hue, saturation, value } = rgbToHsv(r, g, b);
    if (!keep(hue, saturation, value)) continue;
    count += 1;
    sum[0] = (sum[0] ?? 0) + r;
    sum[1] = (sum[1] ?? 0) + g;
    sum[2] = (sum[2] ?? 0) + b;
  }
  if (count === 0) return [0, 0, 0];
  return [
    Math.round((sum[0] ?? 0) / count),
    Math.round((sum[1] ?? 0) / count),
    Math.round((sum[2] ?? 0) / count),
  ];
}

/** The existing Undead board markers and effects, and where their colour is defined. */
const MARKERS: readonly {
  readonly name: string;
  readonly source: string;
  readonly raster?: string;
  readonly colours?: readonly string[];
}[] = [
  {
    name: "Grave marker",
    source: "undead-canvas-v7.ts drawGraveCornerMarkerV7 (code-drawn)",
    colours: ["#d9dcd4", "#3a4044", "#16130f"],
  },
  {
    name: "Undead badge",
    source: "undead-canvas-v7.ts BONE on BADGE_FILL (stand-in sprites only)",
    colours: ["#efe8cf", "#231a2c"],
  },
  {
    name: "Plague chip",
    source: "STATUS:PLAGUED raster on the #20242e token",
    raster: "public/assets/chibi/status/chibi-marker-plagued.png",
  },
  {
    name: "Bitten chip",
    source: "STATUS:BITTEN raster on the #20242e token",
    raster: "public/assets/chibi/status/chibi-marker-bitten.png",
  },
  {
    name: "Raise Dead effect",
    source: "EFFECT:RAISE raster",
    raster: "public/assets/chibi/effects/chibi-effect-raise.png",
  },
  {
    name: "Wail effect",
    source: "EFFECT:WAIL raster",
    raster: "public/assets/chibi/effects/chibi-effect-wail.png",
  },
  {
    name: "Spirit wisp (Infect, lifesteal)",
    source: "EFFECT:WISP raster",
    raster: "public/assets/chibi/effects/chibi-effect-wisp.png",
  },
  {
    name: "Lich splash effect",
    source: "EFFECT:SPLASH raster",
    raster: "public/assets/chibi/effects/chibi-effect-splash.png",
  },
  {
    name: "Raise Dead target preview",
    source: "undead-canvas-v7.ts ability preview RAISE stroke",
    colours: ["#8ff0a4"],
  },
  {
    name: "Wail radius preview",
    source: "undead-canvas-v7.ts ability preview WAIL stroke",
    colours: ["#c9a6ff"],
  },
];

/** The commonest saturated colours of a raster (its "accent"), or its commonest colours. */
function dominantColours(raster: RgbaRaster): readonly string[] {
  const saturated = new Map<string, number>();
  const any = new Map<string, number>();
  for (let index = 0; index < raster.width * raster.height; index += 1) {
    if ((raster.data[index * 4 + 3] ?? 0) < 128) continue;
    const rgb: Rgb = [
      raster.data[index * 4] ?? 0,
      raster.data[index * 4 + 1] ?? 0,
      raster.data[index * 4 + 2] ?? 0,
    ];
    const { saturation, value } = rgbToHsv(rgb[0], rgb[1], rgb[2]);
    if (value < 0.25) continue;
    any.set(hexOf(rgb), (any.get(hexOf(rgb)) ?? 0) + 1);
    if (saturation >= 0.15)
      saturated.set(hexOf(rgb), (saturated.get(hexOf(rgb)) ?? 0) + 1);
  }
  const top = (map: Map<string, number>): string[] =>
    [...map]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 3)
      .map(([hex]) => hex);
  return saturated.size > 0 ? top(saturated) : top(any);
}

async function paletteAndReadability(): Promise<void> {
  const litAccent = Object.fromEntries(
    ACCENTS.map((accent) => [
      accent,
      remapAccentColour(ACCENT_SOURCE_LIT, ACCENT_REMAPS[accent]),
    ]),
  ) as Record<UndeadAccentV7, Rgb>;
  const sprites = Object.fromEntries(
    await Promise.all(
      ACCENTS.map(async (accent) => [
        accent,
        await Promise.all(
          UNITS.map((unit) =>
            readRaster(sampleFile(studyId(unit.unit, accent))),
          ),
        ),
      ]),
    ),
  ) as Record<UndeadAccentV7, RgbaRaster[]>;
  const measured = Object.fromEntries(
    ACCENTS.map((accent) => [
      accent,
      measureBands(sprites[accent], bands(accent)),
    ]),
  ) as Record<UndeadAccentV7, Record<string, BandMeasure>>;
  const shared = measured.violet;
  const first = (band: string, source = shared): Rgb =>
    rgbOf(source[band]?.colours[0]?.hex ?? "#000000");

  const grassTiles = await Promise.all(
    [1, 2, 3].map((index) => readRaster(terrainFile(`chibi-grass-${index}`))),
  );
  const grass = meanOf({
    width: TILE * 3,
    height: TILE,
    data: Uint8Array.from(grassTiles.flatMap((tile) => [...tile.data])),
  });
  const forest = await readRaster(terrainFile("chibi-forest-1"));
  const forestMean = meanOf(forest);
  const forestDark = meanOf(forest, (_h, _s, v) => v < 0.45);
  const mountain = await readRaster(terrainFile("chibi-mountain-1"));
  const mountainMean = meanOf(mountain);
  const mountainLight = meanOf(mountain, (_h, _s, v) => v >= 0.75);
  const mountainGround = meanOf(
    await readRaster(terrainFile("chibi-mountain-ground-1")),
  );
  const goblinSkin = meanOf(
    await readRaster(unitFile("chibi-goblin-goblin")),
    (h, s, v) => h >= 48 && h <= 100 && s > 0.45 && v > 0.55,
  );
  const shallowWater = meanOf(
    await readRaster(terrainFile("chibi-shallow-water-1")),
  );
  const todayFlame = meanOf(
    await readRaster(unitFile("chibi-undead-necromancer")),
    (h, s, v) => h >= 185 && h <= 215 && s >= 0.3 && v >= 0.8,
  );
  const player = Object.fromEntries(
    OWNERS.map(([name, hex]) => [name, rgbOf(hex)]),
  ) as Record<string, Rgb>;

  const bone = first("bone");
  const boneShade = first("boneShade");
  const cloth = first("cloth");
  const flesh = first("flesh");

  const accentPairs = (accent: UndeadAccentV7): Pair[] => {
    const colour = litAccent[accent];
    const name = `${accent} accent`;
    return [
      ...OWNERS.map(([owner, hex]) =>
        pair(name, colour, `${title(owner)} plate`, rgbOf(hex)),
      ),
      pair(name, colour, "Grass", grass),
      pair(name, colour, "Forest (mean)", forestMean),
      pair(name, colour, "Mountain (light rock)", mountainLight),
      pair(name, colour, "Shallow Water (mean)", shallowWater),
      pair(name, colour, "Goblin skin (today)", goblinSkin),
      pair(name, colour, "dark cloth", cloth),
      pair(name, colour, "bone", bone),
      pair(name, colour, "today's pale blue flame", todayFlame),
    ];
  };

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

  const markers = [];
  for (const marker of MARKERS) {
    const colours =
      marker.colours ??
      dominantColours(await readRaster(path.join(ROOT, marker.raster ?? "")));
    const lead = rgbOf(colours[0] ?? "#000000");
    markers.push({
      marker: marker.name,
      source: marker.source,
      colours,
      leadHue: Math.round(rgbToHsv(lead[0], lead[1], lead[2]).hue),
      leadSaturation:
        Math.round(rgbToHsv(lead[0], lead[1], lead[2]).saturation * 100) / 100,
      deltaEToAccent: Object.fromEntries(
        ACCENTS.map((accent) => [
          accent,
          round1(deltaE(lead, litAccent[accent])),
        ]),
      ),
    });
  }

  const widths = [];
  for (const unit of UNITS) {
    const raster = await readRaster(sampleFile(studyId(unit.unit, "violet")));
    const bounds = opaqueBounds(raster);
    // The feet: the widest opaque run in the lowest 10 rows of the figure.
    let feetLeft = raster.width;
    let feetRight = -1;
    if (bounds !== null)
      for (let y = bounds.bottom - 9; y <= bounds.bottom; y += 1)
        for (let x = 0; x < raster.width; x += 1)
          if ((raster.data[(y * raster.width + x) * 4 + 3] ?? 0) >= 128) {
            feetLeft = Math.min(feetLeft, x);
            feetRight = Math.max(feetRight, x);
          }
    const spriteWidth = bounds === null ? 0 : bounds.right - bounds.left + 1;
    const feetWidth = feetRight - feetLeft + 1;
    widths.push({
      unit: unit.name,
      spriteWidth,
      feetWidth,
      plateWidth: PLATE_WIDTH,
      widerThanPlate: spriteWidth > PLATE_WIDTH,
      feetWiderThanPlate: feetWidth > PLATE_WIDTH,
    });
  }

  const readability = {
    bead: "pulp_wars-3tq.11",
    note: "deltaE is CIE76 in L*a*b* (about 2 is just noticeable, 10 is clear at a glance, 20 and more are different colours); contrast is the WCAG luminance ratio (1 to 21). The deuteranopia and protanopia columns repeat deltaE after the Machado 2009 simulation. Terrain colours are measured on the untoned rasters; the game tones terrain towards its mean, so the Mountain's light rock is a little darker in play. The accent colour is the lit tone of each option (the commonest generated tone, remapped).",
    terrain: {
      grassMean: hexOf(grass),
      forestMean: hexOf(forestMean),
      forestDark: hexOf(forestDark),
      mountainMean: hexOf(mountainMean),
      mountainLightRock: hexOf(mountainLight),
      mountainGround: hexOf(mountainGround),
    },
    litAccent: Object.fromEntries(
      ACCENTS.map((accent) => [accent, hexOf(litAccent[accent])]),
    ),
    boneAgainstTerrain: [
      pair("bone", bone, "Grass", grass),
      pair("bone", bone, "Forest (mean)", forestMean),
      pair("bone", bone, "Mountain (mean)", mountainMean),
      pair("bone", bone, "Mountain (light rock)", mountainLight),
      pair("bone", bone, "Mountain ground", mountainGround),
      pair("bone, shaded", boneShade, "Mountain (light rock)", mountainLight),
      pair("bone, shaded", boneShade, "Mountain (mean)", mountainMean),
      pair("pallid flesh", flesh, "Grass", grass),
      pair("pallid flesh", flesh, "Mountain (mean)", mountainMean),
      pair("pallid flesh", flesh, "Goblin skin (today)", goblinSkin),
    ],
    darkClothAgainstTerrain: [
      pair("dark cloth", cloth, "Grass", grass),
      pair("dark cloth", cloth, "Forest (mean)", forestMean),
      pair("dark cloth", cloth, "Forest (dark tones)", forestDark),
      pair("dark cloth", cloth, "Mountain (mean)", mountainMean),
      pair("Coral garment (today)", player.CORAL as Rgb, "Grass", grass),
      pair("Teal garment (today)", player.TEAL as Rgb, "Grass", grass),
    ],
    accent: Object.fromEntries(
      ACCENTS.map((accent) => [accent, accentPairs(accent)]),
    ),
    accentShareOfSprite: Object.fromEntries(
      ACCENTS.map((accent) => [
        accent,
        Object.fromEntries(
          UNITS.map((unit, index) => [
            unit.name,
            `${round1((measureBands([sprites[accent][index] as RgbaRaster], bands(accent)).accent?.share ?? 0) * 100)}%`,
          ]),
        ),
      ]),
    ),
    accentPixelsInBase: Object.fromEntries(
      UNITS.map((unit, index) => {
        const raster = sprites.violet[index] as RgbaRaster;
        let count = 0;
        for (let p = 0; p < raster.width * raster.height; p += 1)
          if (
            (raster.data[p * 4 + 3] ?? 0) >= 128 &&
            isAccentPixel(
              // The violet option's own pixels stay inside the source band.
              raster.data[p * 4] ?? 0,
              raster.data[p * 4 + 1] ?? 0,
              raster.data[p * 4 + 2] ?? 0,
            )
          )
            count += 1;
        return [unit.name, count];
      }),
    ),
    boneShareOfSprite: Object.fromEntries(
      UNITS.map((unit, index) => {
        const measure = measureBands(
          [sprites.violet[index] as RgbaRaster],
          bands("violet"),
        );
        return [
          unit.name,
          {
            bone: `${round1(((measure.bone?.share ?? 0) + (measure.boneShade?.share ?? 0)) * 100)}%`,
            paleFleshOrBeard: `${round1(((measure.flesh?.share ?? 0) + (measure.white?.share ?? 0)) * 100)}%`,
            darkCloth: `${round1((measure.cloth?.share ?? 0) * 100)}%`,
          },
        ];
      }),
    ),
    markers,
    plates,
    platesAgainstGrass: OWNERS.map(([name, hex]) =>
      pair(`${title(name)} plate`, rgbOf(hex), "Grass", grass),
    ),
    widthAgainstPlate: widths,
  };
  await writeFile(
    path.join(OUT, "readability.json"),
    `${JSON.stringify(readability, null, 2)}\n`,
  );
  console.log(
    `wrote ${path.relative(ROOT, path.join(OUT, "readability.json"))}`,
  );

  const sharedRoles = [
    "bone",
    "boneShade",
    "flesh",
    "cloth",
    "iron",
    "bronze",
    "white",
  ];
  const palette = {
    bead: "pulp_wars-3tq.11",
    note: "Measured on the three sprites of each option pooled: share of opaque pixels and the three commonest colours of each role. Every role but the accent is identical in the three options.",
    shared: Object.fromEntries(
      sharedRoles.map((id) => [
        id,
        {
          label: bands("violet").find((band) => band.id === id)?.label ?? id,
          share: `${round1((shared[id]?.share ?? 0) * 100)}%`,
          colours: shared[id]?.colours.map((colour) => colour.hex) ?? [],
        },
      ]),
    ),
    accent: Object.fromEntries(
      ACCENTS.map((accent) => [
        accent,
        {
          share: `${round1((measured[accent].accent?.share ?? 0) * 100)}%`,
          lit: hexOf(litAccent[accent]),
          colours:
            measured[accent].accent?.colours.map((colour) => colour.hex) ?? [],
          remap: ACCENT_REMAPS[accent],
        },
      ]),
    ),
  };
  await writeFile(
    path.join(OUT, "palette.json"),
    `${JSON.stringify(palette, null, 2)}\n`,
  );

  // Swatches: each option's accent, the shared palette, then the colours
  // the faction must stay apart from.
  const rows: {
    readonly label: string;
    readonly colours: readonly string[];
  }[] = [
    ...ACCENTS.map((accent) => ({
      label: `${accent.toUpperCase()} option: accent (${palette.accent[accent]?.share ?? ""})`,
      colours: [
        hexOf(litAccent[accent]),
        ...(palette.accent[accent]?.colours ?? []),
      ].filter((hex, index, list) => list.indexOf(hex) === index),
    })),
    ...sharedRoles.map((id) => ({
      label: `${palette.shared[id]?.label ?? id} (${palette.shared[id]?.share ?? ""})`,
      colours: palette.shared[id]?.colours ?? [],
    })),
    { label: "Grass (mean)", colours: [hexOf(grass)] },
    {
      label: "Forest (mean, dark tones)",
      colours: [hexOf(forestMean), hexOf(forestDark)],
    },
    {
      label: "Mountain (mean, light rock, ground)",
      colours: [
        hexOf(mountainMean),
        hexOf(mountainLight),
        hexOf(mountainGround),
      ],
    },
    { label: "Shallow Water (mean)", colours: [hexOf(shallowWater)] },
    { label: "Goblin skin (today)", colours: [hexOf(goblinSkin)] },
    { label: "today's pale blue flame", colours: [hexOf(todayFlame)] },
    { label: "Human crimson", colours: ["#a8202c"] },
    {
      label: "players: Coral, Teal, Gold, Violet",
      colours: OWNERS.map(([, hex]) => hex),
    },
  ];
  const swatch = 64;
  const labelW = 330;
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

  // The existing markers and effects beside the three accents.
  const scale = 4;
  const markerRowH = 48 * scale + GAP;
  const markerLabelW = 330;
  const sheet = blank(
    markerLabelW +
      48 * scale +
      GAP +
      4 * (swatch + GAP) +
      3 * (56 * scale + GAP),
    LABEL_H + GAP + MARKERS.length * markerRowH,
    PAPER,
  );
  const markerLabels: Label[] = [
    { text: "marker or effect (x4)", left: markerLabelW, top: 2, size: 13 },
    {
      text: "its colours",
      left: markerLabelW + 48 * scale + GAP,
      top: 2,
      size: 13,
    },
    ...ACCENTS.map((accent, index) => ({
      text: `${accent} Necromancer`,
      left:
        markerLabelW +
        48 * scale +
        GAP +
        4 * (swatch + GAP) +
        index * (56 * scale + GAP),
      top: 2,
      size: 13,
    })),
  ];
  const necromancers = await Promise.all(
    ACCENTS.map((accent) =>
      readRaster(sampleFile(studyId("necromancer", accent))),
    ),
  );
  for (const [index, marker] of MARKERS.entries()) {
    const top = LABEL_H + GAP + index * markerRowH;
    markerLabels.push({ text: marker.name, left: GAP, top: top + 8 });
    markerLabels.push({
      text:
        marker.source.length > 48
          ? `${marker.source.slice(0, 47)}…`
          : marker.source,
      left: GAP,
      top: top + 30,
      size: 10,
    });
    fill(sheet, markerLabelW, top, 48 * scale, 48 * scale, [0x20, 0x24, 0x2e]);
    if (marker.raster !== undefined) {
      const raster = await readRaster(path.join(ROOT, marker.raster));
      blit(
        sheet,
        raster,
        markerLabelW + ((48 - raster.width) / 2) * scale,
        top + ((48 - raster.height) / 2) * scale,
        scale,
      );
    }
    const colours = markers[index]?.colours ?? [];
    for (const [column, hex] of colours.slice(0, 4).entries())
      fill(
        sheet,
        markerLabelW + 48 * scale + GAP + column * (swatch + GAP),
        top,
        swatch,
        swatch,
        rgbOf(hex),
      );
    markerLabels.push({
      text: colours.join(" "),
      left: markerLabelW + 48 * scale + GAP,
      top: top + swatch + 6,
      size: 11,
    });
    for (const [column, raster] of necromancers.entries()) {
      const left =
        markerLabelW +
        48 * scale +
        GAP +
        4 * (swatch + GAP) +
        column * (56 * scale + GAP);
      fill(sheet, left, top, 56 * scale, 48 * scale, grass);
      // The staff flame, hood and eyes: the top 48 rows of the sprite.
      blit(
        sheet,
        cropRaster(raster, { left: 0, top: 0, width: 56, height: 48 }),
        left,
        top,
        scale,
      );
    }
  }
  await writeSheet(path.join(OUT, "markers-x4.png"), sheet, markerLabels);
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
type Variant = "today" | UndeadAccentV7 | "plain" | "marker";

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

const SCENE = `globalThis.__UNDEAD_STUDY_SCENE__`;

async function captureAll(
  baseUrl: string,
  all: readonly Sample[],
): Promise<void> {
  const chrome = process.env.CHROME_PATH;
  if (chrome === undefined || chrome === "")
    throw new Error("Set CHROME_PATH to a Chrome binary (or --skip-capture)");
  const chosen = (accent: UndeadAccentV7): unknown[] =>
    all
      .filter((sample) => sample.role === "chosen" && sample.accent === accent)
      .map(({ id, subject, assetClass, width, height, url }) => ({
        id,
        subject,
        assetClass,
        width,
        height,
        url,
        fixedColours: true,
      }));
  const debugPort = 10_700 + (process.pid % 80);
  const profile = await mkdtemp(path.join(tmpdir(), "pulp-wars-undead-"));
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
      await evaluate(connection, `globalThis.__US_OLD__ = true`);
      await connection.send("Page.navigate", { url: url.href });
      await waitFor(
        connection,
        `globalThis.__US_OLD__ !== true && document.readyState === 'complete' && globalThis.__PULP_WARS_APP__ !== undefined`,
      );
      await evaluate(
        connection,
        `(() => { for (const key of Object.keys(localStorage)) if (key.startsWith('pulpWars.save.')) localStorage.removeItem(key); globalThis.__US_OLD__ = true; })()`,
      );
      await connection.send("Page.reload");
      await waitFor(
        connection,
        `globalThis.__US_OLD__ !== true && document.readyState === 'complete' && document.querySelector('[data-action="launch"]') !== null && globalThis.__PULP_WARS_APP__?.controller.snapshot().phase === 'EMPTY'`,
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
        ...SCENES.flatMap((scene) =>
          (["today", ...ACCENTS] as const).map((variant) => ({
            scene,
            variant,
          })),
        ),
      ];
      for (const job of jobs) {
        const accent = ACCENTS.find((entry) => entry === job.variant);
        const options = {
          kind: job.scene,
          ...(accent === undefined ? {} : { samples: chosen(accent) }),
          ...(job.variant === "marker" ? { marker: true } : {}),
        };
        await evaluate(
          connection,
          `(async () => { const module = await import('/scripts/art/undead-direction/scene.ts'); ${SCENE} = module.showUndeadStudySceneV7(globalThis.__PULP_WARS_APP__.controller.snapshot().view, ${JSON.stringify(options)}); return true; })()`,
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
        for (const variant of ["today", ...ACCENTS] as const)
          panels.push({
            label:
              variant === "today"
                ? `Today (${scene === "FOUR" ? "four Undead players" : "Undead, Human, Goblin"})`
                : `Study: ${variant} accent`,
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
            `scene-${scene.toLowerCase()}-${viewport.name}-zoom-${zoom}.png`,
          ),
          panels,
          2,
        );
      }
      // The same unit of four players: the three Grass rows, columns 1-5,
      // per accent, as seen and under two colour-vision deficiencies.
      const panels: Panel[] = [];
      for (const accent of ACCENTS) {
        const strip = crop(
          await loadRaster(captureFile("FOUR", accent, viewport.name, zoom)),
          {
            left: centre.x - 2.5 * cell,
            top: centre.y - 4.9 * cell,
            width: 5 * cell,
            height: 3.45 * cell,
          },
        );
        panels.push(
          { label: `${accent}: as seen`, raster: strip },
          {
            label: `${accent}: deuteranopia (simulated)`,
            raster: simulate(strip, "deuteranopia"),
          },
          {
            label: `${accent}: protanopia (simulated)`,
            raster: simulate(strip, "protanopia"),
          },
        );
      }
      await writeGrid(
        path.join(OUT, `same-unit-${viewport.name}-zoom-${zoom}.png`),
        panels,
        3,
      );
    }
}

async function writeIndex(): Promise<void> {
  const files = [];
  for (const name of (await readdir(OUT)).sort()) {
    if (name === "index.json") continue;
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
        bead: "pulp_wars-3tq.11",
        note: "Review evidence of the Undead direction study. The scene and same-unit images are drawn by the real board host with the look the game draws by default; nothing here is registered as production art.",
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
  await optionsSheet(1);
  await optionsSheet(4);
  await terrainSheet();
  await alternativesSheet(all);
  await paletteAndReadability();
  if (!process.argv.includes("--skip-capture")) {
    const port = Number(option("--port") ?? 6491);
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
