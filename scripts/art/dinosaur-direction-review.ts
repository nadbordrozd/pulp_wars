/**
 * Review evidence of the Dinosaur direction study (bead pulp_wars-3tq.14,
 * docs/art/VISUAL_DIRECTION_2026-10.md, "Dinosaur study"):
 *
 *   npm run art:dinosaur-direction-study-review -- [--port 6492]
 *       [--skip-capture] [--captures DIR] [--out DIR]
 *
 * Writes to art/pixellab/reviews/dinosaur-direction-study/:
 *
 *   candidates-x3.png       every candidate of the exploration run on Grass
 *                           at x3 and 1:1, with its verdict
 *   variants-x4.png, -1x.png, -0.75x.png
 *                           rows = units; columns = today's sprite in two
 *                           player colours, variants A to F, and the live
 *                           Human, Undead and Goblin unit of the role; at
 *                           x4, at native size and scaled to zoom 0.75
 *   terrain-x2.png          each variant of each unit on Grass, Forest and
 *                           Mountain art and over Shallow and Deep Water
 *                           (untoned rasters; the water cells are a contrast
 *                           test, a land unit never stands there)
 *   alternatives-x4.png     the other hides and patterns kept
 *   palette.png, .json      the palette of each variant, measured on its
 *                           sprites, beside the colours it must stay apart
 *                           from
 *   readability.json        hide, amber, cream and fur against the terrain,
 *                           the water, the plates and the other factions
 *                           (also under simulated colour-vision deficiency),
 *                           each sprite's width against its plate and how
 *                           steady each pattern edit held its base
 *   scene-<scene>-<viewport>-zoom-<step>.png
 *                           scenes FOUR (four Dinosaur players) and MIXED
 *                           (Dinosaur, Human, Undead, Goblin) of
 *                           scripts/art/dinosaur-direction/scene.ts drawn by
 *                           the real board host with the look the game
 *                           draws: today and variants A to F; desktop and
 *                           phone, zoom 1 and 0.75
 *   shore-<viewport>-zoom-<step>.png
 *                           the shore row of scene FOUR beside Shallow and
 *                           Deep Water per variant, as seen and under
 *                           simulated deuteranopia
 *   same-unit-<viewport>-zoom-<step>.png
 *                           the four Dinosaur players' units per variant,
 *                           as seen and under simulated deuteranopia
 *   index.json              files, sizes and hashes
 *
 * The full-screen captures go to --captures (a temporary directory by
 * default). Captures start Vite on --port (default 6492, never the user's
 * 6173) and use headless Chrome from CHROME_PATH. No PixelLab call is made.
 * The sheet, colour and browser helpers follow
 * scripts/art/undead-direction-review.ts.
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
  DINOSAUR_VARIANTS,
  STEADY_DISTANCE,
  type DinosaurVariantV7,
  type Steadiness,
} from "./dinosaur-direction/samples";

const ROOT = process.cwd();
const RUN = "art/explorations/dinosaur-direction-2026-10";
const TILE = 80;
const VARIANTS = DINOSAUR_VARIANTS.map((variant) => variant.id);
const variantName = (id: DinosaurVariantV7): string =>
  DINOSAUR_VARIANTS.find((variant) => variant.id === id)?.name ?? id;

function option(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  const value = index < 0 ? undefined : process.argv[index + 1];
  return value === undefined || value.startsWith("--") ? undefined : value;
}

const OUT = path.resolve(
  option("--out") ?? "art/pixellab/reviews/dinosaur-direction-study",
);
const CAPTURES = path.resolve(
  option("--captures") ?? path.join(tmpdir(), "pulp-wars-dinosaur-direction"),
);

type Rgb = readonly [number, number, number];
type Point = { readonly x: number; readonly y: number };

interface Piece {
  readonly id: string;
  readonly name: string;
  readonly anchor?: Point;
}

/**
 * The study's units: today's asset, and the live direction unit of the same
 * role of each converted faction. Anchors are those of the asset manifests.
 * `plate` is the width of the base plate in CSS px at zoom 1
 * (drawDirectedUnitBaseV7: 52 on the standard canvas, 57 on the large one).
 */
const UNITS: readonly {
  readonly name: string;
  readonly unit: string;
  readonly plate: number;
  readonly anchor?: Point;
  readonly today: string;
  readonly others: readonly Piece[];
}[] = [
  {
    name: "Caveman",
    unit: "caveman",
    plate: 52,
    today: "chibi-dinosaur-caveman",
    others: [
      { id: "chibi-direction-fighter", name: "Human Fighter" },
      { id: "chibi-direction-undead-skeleton", name: "Undead Skeleton" },
      { id: "chibi-direction-goblin-goblin", name: "Goblin" },
    ],
  },
  {
    name: "Raptor",
    unit: "raptor",
    plate: 57,
    anchor: { x: 34, y: 48 },
    today: "chibi-dinosaur-raptor",
    others: [
      { id: "chibi-direction-raider", name: "Human Raider" },
      {
        id: "chibi-direction-undead-ghoul",
        name: "Undead Ghoul",
        anchor: { x: 32, y: 48 },
      },
      { id: "chibi-direction-goblin-wolf-rider", name: "Goblin Wolf Rider" },
    ],
  },
  {
    name: "T-Rex",
    unit: "t-rex",
    plate: 57,
    anchor: { x: 30, y: 48 },
    today: "chibi-dinosaur-t-rex",
    others: [
      { id: "chibi-direction-knight", name: "Human Knight" },
      {
        id: "chibi-direction-undead-vampire",
        name: "Undead Vampire",
        anchor: { x: 33, y: 48 },
      },
      {
        id: "chibi-direction-goblin-scrap-buggy",
        name: "Goblin Scrap Buggy",
        anchor: { x: 32, y: 48 },
      },
    ],
  },
];

const studyId = (unit: string, variant: DinosaurVariantV7): string =>
  `chibi-study-dino-${unit}-${variant}`;

const OWNERS = Object.entries(RULESET7_PLAYER_COLORS) as [string, string][];
/** The two player colours of the "today" columns. */
const TODAY_OWNERS = OWNERS.filter(
  ([name]) => name === "CORAL" || name === "TEAL",
);
const title = (text: string): string =>
  text.charAt(0) + text.slice(1).toLowerCase();

interface Sample {
  readonly id: string;
  readonly subject: string;
  readonly assetClass: string;
  readonly width: number;
  readonly height: number;
  readonly anchor?: Point;
  readonly url: string;
  readonly fixedColours: true;
  readonly role: "chosen" | "alternative";
  readonly unit: string;
  readonly variant?: DinosaurVariantV7;
  readonly recipe: string;
  readonly candidate: number;
  readonly base?: { readonly recipe: string; readonly candidate: number };
  readonly steadiness?: Steadiness;
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

/** A canvas resampled as the board draws a sprite at a fractional zoom. */
async function resampled(canvas: Canvas, factor: number): Promise<Canvas> {
  const width = Math.round(canvas.width * factor);
  const height = Math.round(canvas.height * factor);
  const data = await sharp(Buffer.from(canvas.data), {
    raw: { width: canvas.width, height: canvas.height, channels: 4 },
  })
    .resize(width, height, { kernel: "linear" })
    .raw()
    .toBuffer();
  return { width, height, data: new Uint8Array(data) };
}

async function candidatesSheet(all: readonly Sample[]): Promise<void> {
  const manifest = JSON.parse(
    await readFile(path.join(ROOT, RUN, "batch.json"), "utf8"),
  ) as {
    assets: { id: string; anchor?: Point }[];
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
        const used = all.filter(
          (entry) => entry.recipe === recipe.id && entry.candidate === index,
        );
        const chosen = used
          .filter((entry) => entry.role === "chosen")
          .map((entry) => (entry.variant ?? "").toUpperCase());
        const verdict =
          chosen.length > 0
            ? `CHOSEN: ${chosen.join(", ")}`
            : used.length > 0
              ? "alternative"
              : record.review?.verdict === "REJECTED"
                ? "rejected"
                : index === 0
                  ? "step or base"
                  : "other candidate";
        if (column === columns) {
          column = 0;
          row += 1;
        }
        cells.push({
          row,
          column,
          big: boardCell(grass, piece, asset.anchor, scale),
          small: boardCell(grass, piece, asset.anchor, 1),
          lines: [`${recipe.id} #${index}`, verdict],
          colour:
            chosen.length > 0
              ? "#8be28b"
              : verdict === "alternative"
                ? "#f2d477"
                : verdict === "rejected"
                  ? "#f09a8c"
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

/**
 * Rows = units; columns = today in two player colours, variants A to F, and
 * the live Human, Undead and Goblin unit of the role. `scale` 0.75 draws the
 * native cell resampled as the board does at zoom 0.75.
 */
async function variantsSheet(scale: 4 | 1 | 0.75): Promise<void> {
  const grass = await readRaster(terrainFile("chibi-grass-1"));
  const columns = [
    ...TODAY_OWNERS.map(([name]) => `today, ${title(name)}`),
    ...VARIANTS.map((variant) =>
      scale === 4 ? variantName(variant) : variant.toUpperCase(),
    ),
    "Human",
    "Undead",
    "Goblin",
  ];
  const cellW = Math.round(88 * scale);
  const cellH = Math.round(104 * scale);
  const left0 = scale === 4 ? 150 : 76;
  const canvas = blank(
    left0 + columns.length * (cellW + GAP) + GAP,
    LABEL_H + GAP + UNITS.length * (cellH + GAP),
    PAPER,
  );
  const labels: Label[] = columns.map((text, index) => ({
    text,
    left: left0 + index * (cellW + GAP),
    top: 2,
    size: scale === 4 ? 14 : 10,
  }));
  for (const [rowIndex, unit] of UNITS.entries()) {
    const top = LABEL_H + GAP + rowIndex * (cellH + GAP);
    labels.push({
      text: unit.name,
      left: GAP,
      top: top + 4,
      size: scale === 4 ? 14 : 11,
    });
    if (scale === 4)
      unit.others.forEach((other, index) =>
        labels.push({
          text: other.name,
          left: GAP,
          top: top + 26 + index * 16,
          size: 11,
        }),
      );
    const today = await readRaster(unitFile(unit.today));
    const mask = await readRaster(
      unitFile(unit.today).replace(/\.png$/, ".mask.png"),
    );
    const pieces: { raster: RgbaRaster; anchor: Point | undefined }[] = [
      ...TODAY_OWNERS.map(([, colour]) => ({
        raster: recoloured(today, mask, colour),
        anchor: unit.anchor,
      })),
      ...(await Promise.all(
        VARIANTS.map(async (variant) => ({
          raster: await readRaster(sampleFile(studyId(unit.unit, variant))),
          anchor: unit.anchor,
        })),
      )),
      ...(await Promise.all(
        unit.others.map(async (other) => ({
          raster: await readRaster(unitFile(other.id)),
          anchor: other.anchor,
        })),
      )),
    ];
    for (const [index, piece] of pieces.entries()) {
      const cell =
        scale === 0.75
          ? await resampled(
              boardCell(grass, piece.raster, piece.anchor, 1),
              0.75,
            )
          : boardCell(grass, piece.raster, piece.anchor, scale);
      blit(canvas, cell, left0 + index * (cellW + GAP), top);
    }
  }
  await writeSheet(
    path.join(
      OUT,
      `variants-${scale === 4 ? "x4" : scale === 1 ? "1x" : "0.75x"}.png`,
    ),
    canvas,
    labels,
  );
}

/**
 * Rows = variants; columns = each unit on Grass, Forest and Mountain art
 * and over Shallow and Deep Water (a contrast test only).
 */
async function terrainSheet(): Promise<void> {
  const scale = 2;
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
    {
      name: "Shallow",
      layers: [await readRaster(terrainFile("chibi-shallow-water-1"))],
    },
    {
      name: "Deep",
      layers: [await readRaster(terrainFile("chibi-deep-water-1"))],
    },
  ];
  const cellW = 88 * scale;
  const cellH = 104 * scale;
  const left0 = 190;
  const columns = UNITS.flatMap((unit) =>
    grounds.map((ground) => ({ unit, ground })),
  );
  const canvas = blank(
    left0 + columns.length * (cellW + GAP) + GAP,
    LABEL_H + GAP + VARIANTS.length * (cellH + GAP),
    PAPER,
  );
  const labels: Label[] = columns.map((column, index) => ({
    text: `${column.unit.name}, ${column.ground.name}`,
    left: left0 + index * (cellW + GAP),
    top: 2,
    size: 11,
  }));
  for (const [rowIndex, variant] of VARIANTS.entries()) {
    const top = LABEL_H + GAP + rowIndex * (cellH + GAP);
    labels.push({
      text: variantName(variant),
      left: GAP,
      top: top + 4,
      size: 12,
    });
    for (const [index, column] of columns.entries())
      blit(
        canvas,
        terrainCell(
          column.ground.layers,
          await readRaster(sampleFile(studyId(column.unit.unit, variant))),
          scale,
        ),
        left0 + index * (cellW + GAP),
        top,
      );
  }
  await writeSheet(path.join(OUT, "terrain-x2.png"), canvas, labels);
}

async function alternativesSheet(all: readonly Sample[]): Promise<void> {
  const grass = await readRaster(terrainFile("chibi-grass-1"));
  const scale = 4;
  const cellW = 88 * scale;
  const cellH = 104 * scale + LABEL_H * 2;
  const rows = UNITS.map((unit) => ({
    unit,
    samples: all.filter(
      (sample) =>
        sample.unit === unit.unit &&
        (sample.role === "alternative" || sample.variant === "d"),
    ),
  })).filter((row) => row.samples.length > 1);
  const columns = Math.max(...rows.map((row) => row.samples.length));
  const canvas = blank(
    GAP + columns * (cellW + GAP),
    GAP + rows.length * (cellH + GAP),
    PAPER,
  );
  const labels: Label[] = [];
  for (const [rowIndex, row] of rows.entries())
    for (const [index, sample] of row.samples.entries()) {
      const left = GAP + index * (cellW + GAP);
      const top = GAP + rowIndex * (cellH + GAP);
      labels.push({
        text: `${sample.role === "chosen" ? "D (plain)" : "alternative"}: ${sample.recipe} #${sample.candidate}`,
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
          row.unit.anchor,
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

// ------------------------------------------------------------ palette

type Test = (h: number, s: number, v: number) => boolean;

interface Measure {
  /** Mean colour of the pixels in the band. */
  readonly mean: Rgb;
  /** Share of the opaque pixels of the measured sprites. */
  readonly share: number;
  /** The commonest colours of the band. */
  readonly colours: readonly string[];
}

/** The pixels of `rasters` (rows `from` to `to`) that pass `test`. */
function measure(
  rasters: readonly RgbaRaster[],
  test: Test,
  rows?: { readonly from: number; readonly to: number },
): Measure {
  const counts = new Map<string, number>();
  const sum = [0, 0, 0];
  let opaque = 0;
  let inside = 0;
  for (const raster of rasters)
    for (let index = 0; index < raster.width * raster.height; index += 1) {
      if ((raster.data[index * 4 + 3] ?? 0) < 128) continue;
      opaque += 1;
      const y = Math.floor(index / raster.width);
      if (rows !== undefined && (y < rows.from || y > rows.to)) continue;
      const rgb: Rgb = [
        raster.data[index * 4] ?? 0,
        raster.data[index * 4 + 1] ?? 0,
        raster.data[index * 4 + 2] ?? 0,
      ];
      const { hue, saturation, value } = rgbToHsv(rgb[0], rgb[1], rgb[2]);
      if (!test(hue, saturation, value)) continue;
      inside += 1;
      sum[0] = (sum[0] ?? 0) + rgb[0];
      sum[1] = (sum[1] ?? 0) + rgb[1];
      sum[2] = (sum[2] ?? 0) + rgb[2];
      counts.set(hexOf(rgb), (counts.get(hexOf(rgb)) ?? 0) + 1);
    }
  return {
    mean:
      inside === 0
        ? [0, 0, 0]
        : [
            Math.round((sum[0] ?? 0) / inside),
            Math.round((sum[1] ?? 0) / inside),
            Math.round((sum[2] ?? 0) / inside),
          ],
    share: opaque === 0 ? 0 : inside / opaque,
    colours: [...counts]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 3)
      .map(([hex]) => hex),
  };
}

/** The roles of the dinosaur palette. */
const HIDE: Test = (h, s, v) => h >= 195 && h <= 250 && s >= 0.2 && v >= 0.4;
const NAVY: Test = (h, s, v) =>
  h >= 195 && h <= 260 && s >= 0.2 && v >= 0.1 && v < 0.4;
const AMBER: Test = (h, s, v) => h >= 8 && h <= 45 && s >= 0.75 && v >= 0.55;
const CREAM: Test = (h, s, v) =>
  h >= 30 && h <= 58 && s >= 0.1 && s <= 0.45 && v >= 0.85;
/** The Caveman: fur on the body rows, skin on the face rows. */
const FUR_ROWS = { from: 46, to: 64 };
const FACE_ROWS = { from: 22, to: 44 };
const FUR: Test = (h, s, v) => h >= 25 && h <= 52 && s >= 0.3 && v >= 0.45;
const FUR_MARK: Test = (h, s, v) =>
  (h <= 45 || h >= 350) && s >= 0.55 && v >= 0.12 && v < 0.45;
const SKIN: Test = (h, s, v) =>
  h >= 20 && h <= 42 && s >= 0.4 && s <= 0.75 && v >= 0.7;
const PAINT: Test = (h, s, v) => h >= 8 && h <= 32 && s >= 0.75 && v >= 0.7;

const percent = (share: number): string => `${round1(share * 100)}%`;

async function paletteAndReadability(all: readonly Sample[]): Promise<void> {
  const sprite = (unit: string, variant: DinosaurVariantV7) =>
    readRaster(sampleFile(studyId(unit, variant)));
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
  const shallow = meanOf(
    await readRaster(terrainFile("chibi-shallow-water-1")),
  );
  const deep = meanOf(await readRaster(terrainFile("chibi-deep-water-1")));
  const player = Object.fromEntries(
    OWNERS.map(([name, hex]) => [name, rgbOf(hex)]),
  ) as Record<string, Rgb>;
  const unitRaster = (id: string) => readRaster(unitFile(id));
  const humanGold = measure(
    [
      await unitRaster("chibi-direction-fighter"),
      await unitRaster("chibi-direction-knight"),
      await unitRaster("chibi-direction-captain"),
    ],
    (h, s, v) => h >= 36 && h <= 56 && s >= 0.5 && v >= 0.7,
  );
  const goblinLeather = measure(
    [await unitRaster("chibi-direction-goblin-goblin")],
    (h, s, v) => h >= 12 && h <= 36 && s >= 0.5 && v >= 0.3 && v <= 0.72,
  );
  const goblinSkin = measure(
    [await unitRaster("chibi-direction-goblin-goblin")],
    (h, s, v) => h >= 52 && h <= 85 && s >= 0.4 && v >= 0.4,
  );
  const cart = [await unitRaster("chibi-direction-goblin-rocket-cart")];
  const fireworksOrange = measure(
    cart,
    (h, s, v) => h >= 14 && h <= 40 && s >= 0.7 && v >= 0.8,
  );
  const fireworksRed = measure(
    cart,
    (h, s, v) => (h >= 345 || h <= 12) && s >= 0.7 && v >= 0.6,
  );
  const fireworksYellow = measure(
    cart,
    (h, s, v) => h >= 42 && h <= 62 && s >= 0.6 && v >= 0.8,
  );
  const todayHide = measure(
    [
      await unitRaster("chibi-dinosaur-raptor"),
      await unitRaster("chibi-dinosaur-t-rex"),
    ],
    HIDE,
  );

  const variants: Record<string, unknown> = {};
  const paletteVariants: Record<string, unknown> = {};
  const swatchRows: { label: string; colours: readonly string[] }[] = [];
  for (const variant of VARIANTS) {
    const dinosaurs = [
      await sprite("raptor", variant),
      await sprite("t-rex", variant),
    ];
    const hide = measure(dinosaurs, HIDE);
    const navy = measure(dinosaurs, NAVY);
    const amber = measure(dinosaurs, AMBER);
    const cream = measure(dinosaurs, CREAM);
    const name = variantName(variant);
    // The pattern's own colour: amber on A, B and F, navy on C and E.
    const amberPattern = variant === "a" || variant === "b" || variant === "f";
    paletteVariants[variant] = {
      name,
      hide: {
        mean: hexOf(hide.mean),
        share: percent(hide.share),
        colours: hide.colours,
      },
      navy: {
        mean: hexOf(navy.mean),
        share: percent(navy.share),
        colours: navy.colours,
      },
      cream: {
        mean: hexOf(cream.mean),
        share: percent(cream.share),
        colours: cream.colours,
      },
      amber: {
        mean: hexOf(amber.mean),
        share: percent(amber.share),
        colours: amber.colours,
      },
      amberShareOfSprite: {
        Raptor: percent(measure([dinosaurs[0] as RgbaRaster], AMBER).share),
        "T-Rex": percent(measure([dinosaurs[1] as RgbaRaster], AMBER).share),
      },
    };
    swatchRows.push({
      label: `${name}: hide, navy, cream, amber`,
      colours: [
        hide.colours[0] ?? hexOf(hide.mean),
        hide.colours[1] ?? hexOf(hide.mean),
        navy.colours[0] ?? hexOf(navy.mean),
        cream.colours[0] ?? hexOf(cream.mean),
        amber.colours[0] ?? hexOf(amber.mean),
        amber.colours[1] ?? hexOf(amber.mean),
      ],
    });
    variants[variant] = {
      name,
      hide: hexOf(hide.mean),
      navy: hexOf(navy.mean),
      amber: hexOf(amber.mean),
      cream: hexOf(cream.mean),
      hideAgainst: [
        pair("hide", hide.mean, "Grass", grass),
        pair("hide", hide.mean, "Forest (mean)", forestMean),
        pair("hide", hide.mean, "Forest (dark tones)", forestDark),
        pair("hide", hide.mean, "Mountain (mean)", mountainMean),
        pair("hide", hide.mean, "Shallow Water", shallow),
        pair("hide", hide.mean, "Deep Water", deep),
        pair("hide", hide.mean, "Teal plate", player.TEAL as Rgb),
        pair("hide", hide.mean, "Violet plate", player.VIOLET as Rgb),
        pair("navy", navy.mean, "Deep Water", deep),
        pair("navy", navy.mean, "Forest (dark tones)", forestDark),
      ],
      amberAgainst: [
        pair("amber", amber.mean, "Gold plate", player.GOLD as Rgb),
        pair("amber", amber.mean, "Coral plate", player.CORAL as Rgb),
        pair("amber", amber.mean, "Human gold", humanGold.mean),
        pair("amber", amber.mean, "Goblin leather", goblinLeather.mean),
        pair("amber", amber.mean, "fireworks orange", fireworksOrange.mean),
        pair("amber", amber.mean, "fireworks red", fireworksRed.mean),
        pair("amber", amber.mean, "fireworks yellow", fireworksYellow.mean),
        pair("amber", amber.mean, "Grass", grass),
        pair("amber", amber.mean, "hide", hide.mean),
      ],
      creamAgainst: [
        pair("cream", cream.mean, "Mountain (mean)", mountainMean),
        pair("cream", cream.mean, "Mountain (light rock)", mountainLight),
        pair("cream", cream.mean, "Grass", grass),
        pair("cream", cream.mean, "Shallow Water", shallow),
      ],
      patternOnHide: amberPattern
        ? pair("amber pattern", amber.mean, "hide", hide.mean)
        : variant === "d"
          ? null
          : pair("navy pattern", navy.mean, "hide", hide.mean),
      steadiness: Object.fromEntries(
        all
          .filter(
            (sample) =>
              sample.variant === variant && sample.steadiness !== undefined,
          )
          .map((sample) => [sample.unit, sample.steadiness]),
      ),
    };
  }

  const treatments = [
    { name: "spotted fur, amber war paint", variant: "b" },
    { name: "plain fur, bone jewellery", variant: "c" },
    { name: "tiger-striped fur, amber war paint", variant: "a" },
  ] as const;
  const caveman: Record<string, unknown> = {};
  const paletteCaveman: Record<string, unknown> = {};
  for (const treatment of treatments) {
    const raster = [await sprite("caveman", treatment.variant)];
    const fur = measure(raster, FUR, FUR_ROWS);
    const mark = measure(raster, FUR_MARK, FUR_ROWS);
    const skin = measure(raster, SKIN, FACE_ROWS);
    const paint = measure(raster, PAINT, FACE_ROWS);
    paletteCaveman[treatment.name] = {
      variants: all
        .filter(
          (sample) =>
            sample.unit === "caveman" &&
            sample.recipe ===
              all.find(
                (entry) => entry.id === studyId("caveman", treatment.variant),
              )?.recipe &&
            sample.variant !== undefined,
        )
        .map((sample) => (sample.variant ?? "").toUpperCase()),
      fur: { mean: hexOf(fur.mean), colours: fur.colours },
      furMarkings: { mean: hexOf(mark.mean), colours: mark.colours },
      skin: { mean: hexOf(skin.mean), colours: skin.colours },
      warPaint: {
        mean: hexOf(paint.mean),
        colours: paint.colours,
        share: percent(paint.share),
      },
    };
    swatchRows.push({
      label: `Caveman, ${treatment.name}: fur, markings, skin, paint`,
      colours: [
        fur.colours[0] ?? hexOf(fur.mean),
        hexOf(fur.mean),
        mark.colours[0] ?? hexOf(mark.mean),
        skin.colours[0] ?? hexOf(skin.mean),
        ...(paint.colours.length > 0 ? [paint.colours[0] as string] : []),
      ],
    });
    caveman[treatment.name] = {
      fur: hexOf(fur.mean),
      skin: hexOf(skin.mean),
      pairs: [
        pair("fur", fur.mean, "Goblin leather", goblinLeather.mean),
        pair("fur", fur.mean, "Gold plate", player.GOLD as Rgb),
        pair("fur", fur.mean, "Human gold", humanGold.mean),
        pair("fur", fur.mean, "Grass", grass),
        pair("fur", fur.mean, "Mountain (mean)", mountainMean),
        pair("skin", skin.mean, "fur", fur.mean),
        pair("skin", skin.mean, "Goblin skin", goblinSkin.mean),
        ...(paint.colours.length > 0
          ? [pair("war paint", paint.mean, "skin", skin.mean)]
          : []),
      ],
    };
  }

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

  const widths = [];
  for (const unit of UNITS) {
    let widest = 0;
    for (const variant of VARIANTS) {
      const bounds = opaqueBounds(await sprite(unit.unit, variant));
      if (bounds !== null)
        widest = Math.max(widest, bounds.right - bounds.left + 1);
    }
    const raster = await sprite(unit.unit, "d");
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
    const today = opaqueBounds(await readRaster(unitFile(unit.today)));
    const feetWidth = feetRight - feetLeft + 1;
    widths.push({
      unit: unit.name,
      spriteWidth: widest,
      todayWidth: today === null ? 0 : today.right - today.left + 1,
      feetWidth,
      plateWidth: unit.plate,
      widerThanPlate: widest > unit.plate,
      feetWiderThanPlate: feetWidth > unit.plate,
    });
  }

  const others = {
    todayHide: hexOf(todayHide.mean),
    humanGold: hexOf(humanGold.mean),
    goblinLeather: hexOf(goblinLeather.mean),
    goblinSkin: hexOf(goblinSkin.mean),
    fireworksOrange: hexOf(fireworksOrange.mean),
    fireworksRed: hexOf(fireworksRed.mean),
    fireworksYellow: hexOf(fireworksYellow.mean),
  };
  const readability = {
    bead: "pulp_wars-3tq.14",
    note: `deltaE is CIE76 in L*a*b* (about 2 is just noticeable, 10 is clear at a glance, 20 and more are different colours); contrast is the WCAG luminance ratio (1 to 21). The deuteranopia and protanopia columns repeat deltaE after the Machado 2009 simulation. Terrain colours are measured on the untoned rasters. A variant's hide is the mean of its Raptor's and T-Rex's hide pixels (hue 195 to 250, saturation at least 0.2, value at least 0.4), navy the same hues below value 0.4, amber hue 8 to 45 with saturation at least 0.75, cream hue 30 to 58 with saturation 0.1 to 0.45 and value at least 0.85. The Caveman's fur is measured on rows ${FUR_ROWS.from} to ${FUR_ROWS.to} and his skin and paint on rows ${FACE_ROWS.from} to ${FACE_ROWS.to}. Steadiness compares a pattern variant with the plain sprite it was edited from; a pixel counts as changed beyond an RGB distance of ${STEADY_DISTANCE}.`,
    terrain: {
      grassMean: hexOf(grass),
      forestMean: hexOf(forestMean),
      forestDark: hexOf(forestDark),
      mountainMean: hexOf(mountainMean),
      mountainLightRock: hexOf(mountainLight),
      shallowWater: hexOf(shallow),
      deepWater: hexOf(deep),
    },
    others,
    todayHideAgainst: [
      pair("today's hide", todayHide.mean, "Grass", grass),
      pair("today's hide", todayHide.mean, "Shallow Water", shallow),
      pair("today's hide", todayHide.mean, "Deep Water", deep),
      pair("today's hide", todayHide.mean, "Teal plate", player.TEAL as Rgb),
    ],
    variants,
    caveman,
    plates,
    platesAgainstGrass: OWNERS.map(([name, hex]) =>
      pair(`${title(name)} plate`, rgbOf(hex), "Grass", grass),
    ),
    platesAgainstShallowWater: OWNERS.map(([name, hex]) =>
      pair(`${title(name)} plate`, rgbOf(hex), "Shallow Water", shallow),
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

  const palette = {
    bead: "pulp_wars-3tq.14",
    note: "Measured on the Raptor and T-Rex of each variant pooled (share of their opaque pixels, mean and the three commonest colours of each role), and on the Caveman of each treatment.",
    variants: paletteVariants,
    caveman: paletteCaveman,
    others,
  };
  await writeFile(
    path.join(OUT, "palette.json"),
    `${JSON.stringify(palette, null, 2)}\n`,
  );

  // Swatches: each variant, each Caveman treatment, then the colours the
  // faction must stay apart from.
  const rows: { label: string; colours: readonly string[] }[] = [
    ...swatchRows,
    { label: "today's hide (mean)", colours: [hexOf(todayHide.mean)] },
    {
      label: "Grass, Forest (mean, dark)",
      colours: [hexOf(grass), hexOf(forestMean), hexOf(forestDark)],
    },
    {
      label: "Mountain (mean, light rock)",
      colours: [hexOf(mountainMean), hexOf(mountainLight)],
    },
    {
      label: "Shallow Water, Deep Water",
      colours: [hexOf(shallow), hexOf(deep)],
    },
    {
      label: "Human gold; Goblin leather, skin",
      colours: [
        hexOf(humanGold.mean),
        hexOf(goblinLeather.mean),
        hexOf(goblinSkin.mean),
      ],
    },
    {
      label: "Goblin fireworks: orange, red, yellow",
      colours: [
        hexOf(fireworksOrange.mean),
        hexOf(fireworksRed.mean),
        hexOf(fireworksYellow.mean),
      ],
    },
    {
      label: "players: Coral, Teal, Gold, Violet",
      colours: OWNERS.map(([, hex]) => hex),
    },
  ];
  const swatch = 56;
  const labelW = 470;
  const step = swatch + 78;
  const rowH = swatch + GAP;
  const canvas = blank(
    labelW + 6 * step + GAP,
    GAP + rows.length * rowH,
    PAPER,
  );
  const labels: Label[] = [];
  for (const [index, row] of rows.entries()) {
    const top = GAP + index * rowH;
    labels.push({
      text: row.label,
      left: GAP,
      top: top + swatch / 2 - 10,
      size: 13,
    });
    for (const [column, hex] of row.colours.slice(0, 6).entries()) {
      const left = labelW + column * step;
      fill(canvas, left, top, swatch, swatch, rgbOf(hex));
      labels.push({
        text: hex,
        left: left + swatch + 5,
        top: top + swatch / 2 - 10,
        size: 12,
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
type Variant = "today" | DinosaurVariantV7 | "plain" | "marker";

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

const SCENE = `globalThis.__DINOSAUR_STUDY_SCENE__`;

async function captureAll(
  baseUrl: string,
  all: readonly Sample[],
): Promise<void> {
  const chrome = process.env.CHROME_PATH;
  if (chrome === undefined || chrome === "")
    throw new Error("Set CHROME_PATH to a Chrome binary (or --skip-capture)");
  const chosen = (variant: DinosaurVariantV7): unknown[] =>
    all
      .filter(
        (sample) => sample.role === "chosen" && sample.variant === variant,
      )
      .map(({ id, subject, assetClass, width, height, url, anchor }) => ({
        id,
        subject,
        assetClass,
        width,
        height,
        url,
        ...(anchor === undefined ? {} : { anchor }),
        fixedColours: true,
      }));
  const debugPort = 10_800 + (process.pid % 80);
  const profile = await mkdtemp(path.join(tmpdir(), "pulp-wars-dinosaur-"));
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
      await evaluate(connection, `globalThis.__DS_OLD__ = true`);
      await connection.send("Page.navigate", { url: url.href });
      await waitFor(
        connection,
        `globalThis.__DS_OLD__ !== true && document.readyState === 'complete' && globalThis.__PULP_WARS_APP__ !== undefined`,
      );
      await evaluate(
        connection,
        `(() => { for (const key of Object.keys(localStorage)) if (key.startsWith('pulpWars.save.')) localStorage.removeItem(key); globalThis.__DS_OLD__ = true; })()`,
      );
      await connection.send("Page.reload");
      await waitFor(
        connection,
        `globalThis.__DS_OLD__ !== true && document.readyState === 'complete' && document.querySelector('[data-action="launch"]') !== null && globalThis.__PULP_WARS_APP__?.controller.snapshot().phase === 'EMPTY'`,
      );
      // The fixed 16 x 16 Showcase board: the scenes rewrite a 7 x 8 patch
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
          (["today", ...VARIANTS] as const).map((variant) => ({
            scene,
            variant,
          })),
        ),
      ];
      for (const job of jobs) {
        const variant = VARIANTS.find((entry) => entry === job.variant);
        const options = {
          kind: job.scene,
          ...(variant === undefined ? {} : { samples: chosen(variant) }),
          ...(job.variant === "marker" ? { marker: true } : {}),
        };
        await evaluate(
          connection,
          `(async () => { const module = await import('/scripts/art/dinosaur-direction/scene.ts'); ${SCENE} = module.showDinosaurStudySceneV7(globalThis.__PULP_WARS_APP__.controller.snapshot().view, ${JSON.stringify(options)}); return true; })()`,
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
  const shown = ["today", ...VARIANTS] as const;
  const label = (variant: (typeof shown)[number]): string =>
    variant === "today" ? "Today" : variantName(variant);
  const short = (variant: (typeof shown)[number]): string =>
    variant === "today" ? "Today" : variant.toUpperCase();
  for (const viewport of VIEWPORTS)
    for (const zoom of ZOOMS) {
      const centre = await capitalCentre(viewport.name, zoom);
      const cell = TILE * Number(zoom) * viewport.dpr;
      const capture = (scene: SceneKind, variant: (typeof shown)[number]) =>
        loadRaster(captureFile(scene, variant, viewport.name, zoom));
      // The scene is 7 x 8 cells with the capital at (3,4): a window of
      // 7.5 x 8.5 cells holds it with the heads of the top row.
      const window = {
        left: centre.x - 3.75 * cell,
        top: centre.y - 4.9 * cell,
        width: 7.5 * cell,
        height: 8.5 * cell,
      };
      for (const scene of SCENES) {
        const panels: Panel[] = [];
        for (const variant of shown)
          panels.push({
            label:
              variant === "today"
                ? `Today (${scene === "FOUR" ? "four Dinosaur players" : "Dinosaur, Human, Undead, Goblin"})`
                : label(variant),
            raster: crop(await capture(scene, variant), window),
          });
        await writeGrid(
          path.join(
            OUT,
            `scene-${scene.toLowerCase()}-${viewport.name}-zoom-${zoom}.png`,
          ),
          panels,
          4,
        );
      }
      // The shore: row 6 with the water of row 7 and of both ends.
      const shore: Panel[] = [];
      for (const variant of shown) {
        const strip = crop(await capture("FOUR", variant), {
          left: centre.x - 3.75 * cell,
          top: centre.y + 1.0 * cell,
          width: 7.5 * cell,
          height: 2.3 * cell,
        });
        shore.push(
          { label: `${label(variant)}: as seen`, raster: strip },
          {
            label: `${short(variant)}: deuteranopia (simulated)`,
            raster: simulate(strip, "deuteranopia"),
          },
        );
      }
      await writeGrid(
        path.join(OUT, `shore-${viewport.name}-zoom-${zoom}.png`),
        shore,
        2,
      );
      // The same unit of four players: the three Grass rows, columns 1-5,
      // per variant, as seen and under deuteranopia.
      const panels: Panel[] = [];
      for (const variant of VARIANTS) {
        const strip = crop(await capture("FOUR", variant), {
          left: centre.x - 2.5 * cell,
          top: centre.y - 4.9 * cell,
          width: 5 * cell,
          height: 3.45 * cell,
        });
        panels.push(
          { label: `${short(variant)}: as seen`, raster: strip },
          {
            label: `${short(variant)}: deuteranopia (simulated)`,
            raster: simulate(strip, "deuteranopia"),
          },
        );
      }
      await writeGrid(
        path.join(OUT, `same-unit-${viewport.name}-zoom-${zoom}.png`),
        panels,
        4,
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
        bead: "pulp_wars-3tq.14",
        note: "Review evidence of the Dinosaur direction study. The scene, shore and same-unit images are drawn by the real board host with the look the game draws by default; nothing here is registered as production art.",
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
  await variantsSheet(4);
  await variantsSheet(1);
  await variantsSheet(0.75);
  await terrainSheet();
  await alternativesSheet(all);
  await paletteAndReadability(all);
  if (!process.argv.includes("--skip-capture")) {
    const port = Number(option("--port") ?? 6492);
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
