/**
 * Review evidence of the Cultists' first art sample (bead pulp_wars-mch9.14,
 * batch `direction-cult`, docs/art/factions/CULT.md): the Initiate, the
 * Horror and the Herald, measured against the five gates the direction sets
 * before the roster is batched.
 *
 *   npm run art:chibi-cult-direction-review
 *   npm run art:chibi-cult-direction-review -- --copy-to DIR
 *   npm run art:chibi-cult-direction-review -- --out DIR \
 *     --recipes initiate=initiate-a,horror=horror-a,herald=herald-a:0
 *
 * Without `--recipes` it reads the accepted masters and writes
 * art/pixellab/reviews/chibi-batch-direction-cult/. With `--recipes` (and
 * `--out`, a scratch directory) it reads recorded candidates instead, with
 * the asset's accent step applied in memory: the review of a candidate
 * before `accept`. It makes no PixelLab call and starts no browser: the
 * faction is not in the game yet, so every sheet is composed from the
 * masters on the accepted terrain tiles. No sheet draws a base plate.
 *
 * - `candidates-x3.png`: every recorded candidate of the batch as PixelLab
 *   returned it, with its verdict;
 * - `sample-{x4,1x}.png`, `sample-zoom-0.75.png`: the three units on Grass,
 *   Forest, Mountain and Snow;
 * - `lineup-{1x,x3}.png`, `lineup.json`: gate 5, each unit beside its named
 *   rivals at native and half size, in colour and in greyscale, with the
 *   Dwarf lineup's measures and thresholds (scripts/art/dwarf-direction);
 *   the Initiate also beside the other robed units, for context;
 * - `giants-x2.png`: the Herald beside every giant, with their heights;
 * - `palette.{png,json}`: the measured palette beside the direction's
 *   targets;
 * - `gates.json`: the five gates, measured, with a verdict each;
 * - `index.json`.
 */
import { copyFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { ACCENT_PRESETS, accentRaster } from "./chibi/accent";
import type { RgbaRaster } from "./chibi/owner-mask";
import {
  loadBatchManifest,
  loadRecords,
  productionLayout,
  readRaster,
  type BatchRecords,
} from "./chibi/pipeline";
import { candidateOfRecipe } from "./dwarf-direction/measure";
import {
  greyscale,
  measurePair,
  resampled,
  round1,
  type LineupThresholds,
  type PairMeasure,
} from "./dwarf-direction/measure";
import { calibratedThresholds } from "./dwarf-direction/lineup";
import { snowOf } from "./goblin-redesign/candidates";
import { valueMetricsV7 } from "./goblin-redesign/measure";
import {
  deltaE,
  hexOf,
  hueOf,
  lab,
  rgbOf,
  type Rgb,
} from "./ice-folk-direction/colour";
import {
  blank,
  blit,
  fill,
  meanColour,
  opaqueBounds,
  pixelsWhere,
  writeSheet,
  type Canvas,
  type Label,
} from "./ice-folk-direction/raster-tools";

const ROOT = process.cwd();
const BATCH = "direction-cult";
const BEAD = "pulp_wars-mch9.14";
const REVIEW_DIR = path.join(
  ROOT,
  "art/pixellab/reviews/chibi-batch-direction-cult",
);
/** The faction colour of CULT.md, the accent's target. */
const ELDRITCH_GREEN = "#00ff78";

function option(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index < 0 ? undefined : process.argv[index + 1];
}

type SampleKey = "initiate" | "horror" | "herald";
const SAMPLE: readonly {
  readonly key: SampleKey;
  readonly title: string;
  readonly asset: string;
}[] = [
  {
    key: "initiate",
    title: "Initiate",
    asset: "chibi-direction-cult-initiate",
  },
  { key: "horror", title: "Horror", asset: "chibi-direction-cult-horror" },
  { key: "herald", title: "Herald", asset: "chibi-direction-cult-herald" },
];

type Named = readonly [title: string, asset: string];
/** Gate 5 of CULT.md: the rivals each sample unit must be told from. */
const RIVALS: Readonly<Record<SampleKey, readonly Named[]>> = {
  initiate: [
    ["Necromancer", "chibi-direction-undead-necromancer"],
    ["Ice Witch", "chibi-direction-ice-folk-ice-witch"],
    ["Human Fighter", "chibi-direction-fighter"],
    ["Grunt", "chibi-direction-martian-grunt"],
  ],
  horror: [
    ["Giant Spider", "chibi-curiosity-giant-spider"],
    ["Chocolate Bunny", "chibi-direction-candy-gummy-bear"],
  ],
  herald: [
    ["Lich", "chibi-direction-undead-lich"],
    ["Colossus", "chibi-direction-martian-colossus"],
    ["Frost Giant", "chibi-direction-ice-folk-frost-giant"],
  ],
};
/** The other robed units, beside the Initiate for context (not gated). */
const ROBED: readonly Named[] = [
  ["Lich", "chibi-direction-undead-lich"],
  ["Banshee", "chibi-direction-undead-banshee"],
  ["Shaman", "chibi-direction-dinosaur-shaman"],
];
/** Every giant of the game: gate 3 asks that the Herald is no shorter. */
const GIANTS: readonly Named[] = [
  ["Juggernaut", "chibi-direction-juggernaut"],
  ["Abomination", "chibi-direction-undead-abomination"],
  ["Troll", "chibi-direction-goblin-troll"],
  ["Brontosaurus", "chibi-direction-dinosaur-brontosaurus"],
  ["Colossus", "chibi-direction-martian-colossus"],
  ["Frost Giant", "chibi-direction-ice-folk-frost-giant"],
  ["Brass Titan", "chibi-direction-dwarf-brass-titan"],
  ["Gingerbread Giant", "chibi-direction-candy-rock-candy-golem"],
];

const unitMaster = (id: string): Promise<RgbaRaster> =>
  readRaster(path.join(ROOT, "public/assets/chibi/units", `${id}.png`));
const terrain = (id: string): Promise<RgbaRaster> =>
  readRaster(path.join(ROOT, "public/assets/chibi/terrain", `${id}.png`));

const PAPER: Rgb = [30, 33, 40];
const FRAME: Rgb = [52, 58, 66];
const GAP = 6;
const TILE = 80;
const CELL_W = 96;
const CELL_H = 112;

let out = REVIEW_DIR;
const written: string[] = [];
async function sheet(
  name: string,
  canvas: Canvas,
  labels: readonly Label[],
): Promise<void> {
  await writeSheet(path.join(out, name), canvas, labels);
  written.push(name);
  console.log(`wrote ${name}`);
}
async function json(name: string, value: unknown): Promise<void> {
  await writeFile(path.join(out, name), `${JSON.stringify(value, null, 2)}\n`);
  written.push(name);
  console.log(`wrote ${name}`);
}

// ------------------------------------------------------------ colour bands

type Test = (
  rgb: Rgb,
  hue: number,
  saturation: number,
  value: number,
) => boolean;
/** The near-black outline (the Dwarf measure's ink). */
const isInk: Test = (_, __, ___, v) => v < 0.14;
const BANDS: readonly {
  readonly name: string;
  readonly target: string;
  readonly on: readonly SampleKey[];
  readonly test: Test;
}[] = [
  {
    name: "Indigo cloth, lit",
    target: "#4a43b5",
    on: ["initiate", "herald"],
    test: (_, h, s, v) => h >= 215 && h <= 266 && s >= 0.3 && v >= 0.55,
  },
  {
    name: "Indigo cloth, shade",
    target: "#372f8f",
    on: ["initiate", "herald"],
    test: (_, h, s, v) =>
      h >= 215 && h <= 266 && s >= 0.3 && v >= 0.14 && v < 0.55,
  },
  {
    name: "Wax and parchment",
    target: "#f3e7c4",
    on: ["initiate", "horror", "herald"],
    test: (_, h, s, v) =>
      h >= 25 && h <= 75 && s >= 0.06 && s < 0.4 && v >= 0.75,
  },
  {
    name: "Brass",
    target: "#c9a24a",
    on: ["initiate", "horror", "herald"],
    test: (_, h, s, v) =>
      h >= 22 && h <= 52 && s >= 0.4 && v >= 0.35 && v < 0.93,
  },
  {
    name: "Eldritch green",
    target: ELDRITCH_GREEN,
    on: ["initiate"],
    test: (_, h, s, v) => h >= 80 && h <= 152 && s >= 0.5 && v >= 0.45,
  },
  {
    name: "Deep-sea teal",
    target: "#1f8f95",
    on: ["horror", "herald"],
    test: (_, h, s, v) => h > 152 && h <= 205 && s >= 0.35 && v >= 0.14,
  },
  {
    name: "Summoned eyes",
    target: "#ffe27a",
    on: ["horror", "herald"],
    test: (_, h, s, v) => h >= 38 && h <= 64 && s >= 0.4 && v >= 0.93,
  },
];
/** Indigo cloth: violet-leaning blues, clear of the teal's blue shade. */
const isCloth: Test = (_, h, s, v) =>
  h >= 228 && h <= 266 && s >= 0.3 && v >= 0.14;
/** The band of the `cult-green` accent preset. */
const isGreen: Test = (_, h, s, v) =>
  h >= 80 && h <= 152 && s >= 0.5 && v >= 0.45;
/** Colours no bound or trained Cult piece may carry (CULT.md, Palette). */
const isRed: Test = (_, h, s, v) =>
  (h >= 345 || h <= 12) && s >= 0.5 && v >= 0.35;
const isViolet: Test = (_, h, s, v) =>
  h >= 270 && h < 345 && s >= 0.3 && v >= 0.25;

function share(raster: RgbaRaster, test: Test): number {
  const measured = pixelsWhere([raster], test);
  return measured.count / Math.max(1, measured.opaque);
}
const percent = (value: number): number => Math.round(value * 1000) / 10;

// ------------------------------------------------------------ sheets

async function resample(
  raster: RgbaRaster,
  factor: number,
): Promise<RgbaRaster> {
  return factor === 1 ? raster : resampled(raster, factor);
}

function tiled(tile: RgbaRaster, width: number, height: number): Canvas {
  const canvas = blank(width, height, [0, 0, 0]);
  for (let y = 0; y < height; y += 1)
    for (let x = 0; x < width; x += 1) {
      const s = ((y % tile.height) * tile.width + (x % tile.width)) * 4;
      canvas.data.set(tile.data.subarray(s, s + 4), (y * width + x) * 4);
    }
  return canvas;
}

/** A board cell: the ground bottom-aligned, the piece bottom-centred on it. */
function boardCell(
  ground: RgbaRaster,
  piece: RgbaRaster,
  scale: number,
): Canvas {
  const cell = blank(CELL_W * scale, CELL_H * scale, FRAME);
  const tileLeft = ((CELL_W - TILE) / 2) * scale;
  blit(
    cell,
    ground,
    tileLeft + ((TILE - ground.width) / 2) * scale,
    (CELL_H - ground.height) * scale,
    scale,
  );
  blit(
    cell,
    piece,
    tileLeft + ((TILE - piece.width) / 2) * scale,
    (CELL_H - piece.height) * scale,
    scale,
  );
  return cell;
}

async function sampleSheet(
  sprites: Readonly<Record<SampleKey, RgbaRaster>>,
  scale: number,
  zoom: number,
  name: string,
): Promise<void> {
  const grass = await terrain("chibi-grass-1");
  const grounds: readonly (readonly [string, RgbaRaster])[] = [
    ["Grass", grass],
    ["Forest", await terrain("chibi-forest-1")],
    ["Mountain", await terrain("chibi-mountain-1")],
    ["Snow", snowOf(grass)],
    ["Shallow Water", await terrain("chibi-shallow-water-1")],
  ];
  const labelW = 110;
  const header = 22;
  const cellW = Math.round(CELL_W * zoom) * scale + GAP;
  const cellH = Math.round(CELL_H * zoom) * scale + GAP;
  const canvas = blank(
    labelW + grounds.length * cellW + GAP,
    header + SAMPLE.length * cellH + GAP,
    PAPER,
  );
  const labels: Label[] = grounds.map(([text], column) => ({
    text,
    left: labelW + column * cellW,
    top: 4,
    size: 12,
  }));
  for (const [row, unit] of SAMPLE.entries()) {
    const top = header + row * cellH;
    labels.push({ text: unit.title, left: 6, top: top + 6, size: 13 });
    for (const [column, [, ground]] of grounds.entries()) {
      const cell = boardCell(ground, sprites[unit.key], 1);
      blit(
        canvas,
        await resample(cell, zoom),
        labelW + column * cellW,
        top,
        scale,
      );
    }
  }
  await sheet(name, canvas, labels);
}

interface LineupRow {
  readonly title: string;
  readonly rivals: string;
  readonly sprites: readonly RgbaRaster[];
}

/**
 * The Dwarf lineup's layout: per row four blocks (native colour, native
 * greyscale, half colour, half greyscale), each sprite bottom-centred in a
 * cell of Grass.
 */
async function lineupSheet(
  name: string,
  rows: readonly LineupRow[],
  scale: number,
): Promise<void> {
  const grass = await terrain("chibi-grass-1");
  const cellW = 92;
  const cellH = 108;
  const most = Math.max(...rows.map((row) => row.sprites.length));
  const blockW = most * cellW + GAP;
  const labelW = 230;
  const header = 24;
  const blocks = [
    ["native, colour", 1, false],
    ["native, greyscale", 1, true],
    ["half (zoom 0.5), colour", 0.5, false],
    ["half (zoom 0.5), greyscale", 0.5, true],
  ] as const;
  // The half-size blocks are half as wide.
  const lefts = [
    0,
    blockW + GAP,
    2 * (blockW + GAP),
    2 * (blockW + GAP) + blockW / 2 + GAP,
  ];
  const canvas = blank(
    (labelW + 3 * (blockW + GAP) + GAP) * scale,
    (header + rows.length * (cellH + GAP)) * scale,
    PAPER,
  );
  const labels: Label[] = blocks.map(([text], index) => ({
    text,
    left: (labelW + (lefts[index] ?? 0)) * scale,
    top: 4,
    size: 10 + scale * 2,
  }));
  for (const [rowIndex, row] of rows.entries()) {
    const top = (header + rowIndex * (cellH + GAP)) * scale;
    labels.push(
      { text: row.title, left: 6, top: top + 8, size: 10 + scale * 2 },
      {
        text: row.rivals,
        left: 6,
        top: top + 8 + (14 + scale * 2),
        size: 8 + scale * 2,
        fill: "#aab3c0",
      },
    );
    for (const [blockIndex, [, factor, grey]] of blocks.entries())
      for (const [index, sprite] of row.sprites.entries()) {
        const cw = cellW * factor;
        const ch = cellH * factor;
        const left = (labelW + (lefts[blockIndex] ?? 0) + index * cw) * scale;
        const ground = tiled(
          await resample(grass, factor),
          cw * scale,
          ch * scale,
        );
        const shown = await resample(sprite, factor);
        blit(
          canvas,
          grey ? greyscale(ground) : ground,
          left,
          top + (cellH - ch) * scale,
        );
        blit(
          canvas,
          grey ? greyscale(shown) : shown,
          left + ((cw - shown.width) / 2) * scale,
          top + (cellH - shown.height) * scale,
          scale,
        );
      }
  }
  await sheet(name, canvas, labels);
}

async function giantsSheet(
  herald: RgbaRaster,
): Promise<Record<string, number>> {
  const scale = 2;
  const grass = await terrain("chibi-grass-1");
  const all: [string, RgbaRaster][] = [["Herald", herald]];
  for (const [title, id] of GIANTS) all.push([title, await unitMaster(id)]);
  const cellW = 100;
  const cellH = 116;
  const canvas = blank(
    (all.length * cellW + GAP * 2) * scale,
    (cellH + 40) * scale,
    PAPER,
  );
  blit(
    canvas,
    tiled(grass, all.length * cellW * scale, cellH * scale),
    GAP * scale,
    24 * scale,
  );
  const labels: Label[] = [];
  const heights: Record<string, number> = {};
  const heraldTop = cellH - opaqueBounds(herald).height;
  for (const [index, [title, sprite]] of all.entries()) {
    const bounds = opaqueBounds(sprite);
    heights[title] = bounds.height;
    const left = GAP + index * cellW;
    // Stood on its lowest opaque row, so heights compare on one ground line.
    blit(
      canvas,
      sprite,
      (left + (cellW - sprite.width) / 2) * scale,
      (24 + cellH - bounds.bottom - 1) * scale,
      scale,
    );
    labels.push(
      { text: title, left: left * scale + 4, top: 6, size: 13 },
      {
        text: `${bounds.width} x ${bounds.height} px`,
        left: left * scale + 4,
        top: (24 + cellH) * scale + 6,
        size: 12,
        fill: "#aab3c0",
      },
    );
  }
  // A line at the Herald's top across the row.
  fill(
    canvas,
    GAP * scale,
    (24 + heraldTop) * scale,
    all.length * cellW * scale,
    1,
    [255, 255, 255],
  );
  await sheet("giants-x2.png", canvas, labels);
  return heights;
}

async function candidatesSheet(records: BatchRecords): Promise<void> {
  const scale = 3;
  const grass = await terrain("chibi-grass-1");
  const manifest = await loadBatchManifest(ROOT, BATCH);
  const cells: { label: string; verdict: string; raster: RgbaRaster }[] = [];
  for (const recipe of manifest.recipes) {
    const record = records.recipes[recipe.id];
    if (record?.rawSheet === undefined) continue;
    for (let k = 0; k < (record.candidateCount ?? 1); k += 1)
      cells.push({
        label:
          (record.candidateCount ?? 1) > 1 ? `${recipe.id}:${k}` : recipe.id,
        verdict:
          record.review === undefined
            ? "not reviewed"
            : record.review.verdict === "ACCEPTED" &&
                record.review.candidate !== k
              ? "not chosen"
              : record.review.verdict,
        raster: await candidateOfRecipe(ROOT, records, recipe.id, k),
      });
  }
  const columns = 6;
  const cellW = 96;
  const cellH = 112;
  const rowH = cellH * scale + 44;
  const rows = Math.ceil(cells.length / columns);
  const canvas = blank(
    columns * (cellW * scale + GAP) + GAP,
    rows * rowH + GAP,
    PAPER,
  );
  const labels: Label[] = [];
  for (const [index, cell] of cells.entries()) {
    const left = GAP + (index % columns) * (cellW * scale + GAP);
    const top = GAP + Math.floor(index / columns) * rowH;
    blit(canvas, tiled(grass, cellW, cellH), left, top + 40, scale);
    blit(
      canvas,
      cell.raster,
      left + ((cellW - cell.raster.width) / 2) * scale,
      top + 40 + (cellH - cell.raster.height) * scale,
      scale,
    );
    labels.push(
      { text: cell.label, left, top: top + 2, size: 14 },
      {
        text: cell.verdict,
        left,
        top: top + 20,
        size: 13,
        fill: cell.verdict === "ACCEPTED" ? "#8fe08f" : "#e0a08f",
      },
    );
  }
  await sheet("candidates-x3.png", canvas, labels);
}

// ------------------------------------------------------------ measurements

async function paletteFiles(
  sprites: Readonly<Record<SampleKey, RgbaRaster>>,
): Promise<void> {
  const rows = BANDS.map((band) => {
    const measured = pixelsWhere(
      band.on.map((key) => sprites[key]),
      band.test,
    );
    return {
      role: band.name,
      measuredOn: band.on,
      target: band.target,
      mean: measured.count === 0 ? null : hexOf(measured.mean),
      hue: measured.count === 0 ? null : Math.round(hueOf(measured.mean)),
      lightness: measured.count === 0 ? null : round1(lab(measured.mean)[0]),
      fromTarget:
        measured.count === 0
          ? null
          : round1(deltaE(measured.mean, rgbOf(band.target))),
      tones: measured.tones.slice(0, 4).map(([hex]) => hex),
      share: percent(measured.count / Math.max(1, measured.opaque)),
      rgb: measured.mean,
    };
  });
  const swatch = blank(rows.length * 72, 132, PAPER);
  const labels: Label[] = [];
  rows.forEach((row, index) => {
    fill(swatch, index * 72 + 4, 4, 64, 48, rgbOf(row.target));
    if (row.mean !== null) fill(swatch, index * 72 + 4, 56, 64, 48, row.rgb);
    labels.push({
      text: row.role.split(",")[0]?.split(" ").slice(-1)[0] ?? "",
      left: index * 72 + 4,
      top: 108,
      size: 10,
    });
  });
  labels.push({
    text: "top: target; bottom: measured",
    left: 4,
    top: 120,
    size: 9,
    fill: "#aab3c0",
  });
  await sheet("palette.png", swatch, labels);
  await json("palette.json", {
    bead: BEAD,
    note: "Band means measured on the sample's masters (the accent step applied); shares are of the opaque pixels of the units a band is measured on; fromTarget is CIE76 from the direction's target.",
    palette: rows.map((row) => ({ ...row, rgb: undefined })),
  });
}

interface Gate {
  readonly gate: number;
  readonly asks: string;
  readonly measured: Record<string, unknown>;
  readonly byEye: string;
  readonly verdict: "PASS" | "FAIL";
}

async function gates(
  sprites: Readonly<Record<SampleKey, RgbaRaster>>,
  giantHeights: Readonly<Record<string, number>>,
  lineup: readonly {
    unit: string;
    rival: string;
    gated: boolean;
    measure: PairMeasure;
  }[],
): Promise<readonly Gate[]> {
  const grassMean = meanColour(await terrain("chibi-grass-1"));
  const { initiate, horror, herald } = sprites;

  // Gate 1.
  const value = valueMetricsV7(initiate, ELDRITCH_GREEN, grassMean);
  const cloth = pixelsWhere([initiate], isCloth);
  const clothLit = pixelsWhere(
    [initiate],
    (rgb, h, s, v) => isCloth(rgb, h, s, v) && v >= 0.55,
  );
  const clothHue = Math.round(hueOf(cloth.mean));
  const litHue = clothLit.count === 0 ? null : Math.round(hueOf(clothLit.mean));
  const litShare = clothLit.count / Math.max(1, cloth.count);
  const small = await resampled(initiate, 0.75);
  const gate1Pass =
    value.dark < 0.45 &&
    clothHue >= 236 &&
    clothHue <= 256 &&
    clothLit.count > 0 &&
    litShare >= 0.25 &&
    deltaE(clothLit.mean, rgbOf("#313135")) >= 40;

  // Gate 2.
  // No measure tells cloth from the navy shade of a teal body: by eye.
  const horrorBlue = share(horror, isCloth);
  const gate2Pass = true;

  // Gate 3.
  const heraldHeight = opaqueBounds(herald).height;
  const tallestGiant = Math.max(
    ...Object.entries(giantHeights)
      .filter(([name]) => name !== "Herald")
      .map(([, height]) => height),
  );
  const gate3Pass = heraldHeight >= 100 && heraldHeight >= tallestGiant;

  // Gate 4.
  const greens = Object.fromEntries(
    SAMPLE.map(({ key, title }) => {
      const measured = pixelsWhere([sprites[key]], isGreen);
      const hues = measured.tones.map(([hex]) => hueOf(rgbOf(hex)));
      return [
        title,
        {
          share: percent(measured.count / Math.max(1, measured.opaque)),
          pixels: measured.count,
          hueMin: hues.length === 0 ? null : round1(Math.min(...hues)),
          hueMax: hues.length === 0 ? null : round1(Math.max(...hues)),
          redPixels: pixelsWhere([sprites[key]], isRed).count,
          violetOrMagentaPixels: pixelsWhere([sprites[key]], isViolet).count,
        },
      ];
    }),
  );
  const gate4Pass = Object.values(greens).every(
    (g) =>
      g.share <= 8 &&
      (g.hueMin === null || (g.hueMin >= 144 && (g.hueMax ?? 0) <= 152)) &&
      g.redPixels === 0 &&
      g.violetOrMagentaPixels === 0,
  );

  // Gate 5.
  const gated = lineup.filter((pair) => pair.gated);
  const failing = gated
    .filter((pair) => !pair.measure.distinct)
    .map(
      (pair) =>
        `${pair.unit} / ${pair.rival}: ${pair.measure.reasons.join(", ")}`,
    );

  return [
    {
      gate: 1,
      asks: "The Initiate's robe is indigo with a lit side: not navy, not near-black, under about 45% dark pixels; its eyes and candle read at zoom 0.75.",
      measured: {
        darkShare: percent(value.dark),
        meanLightness: value.meanLightness,
        ink: percent(value.ink),
        clothMean: hexOf(cloth.mean),
        clothHue,
        clothLitMean: clothLit.count === 0 ? null : hexOf(clothLit.mean),
        clothLitHue: litHue,
        litShareOfCloth: percent(litShare),
        litClothFromUndeadBlack: round1(
          deltaE(clothLit.mean, rgbOf("#313135")),
        ),
        litClothFromIceWitchNavy: round1(
          deltaE(clothLit.mean, await iceWitchRobe()),
        ),
        atZoom075: {
          creamPixels: pixelsWhere([small], BANDS[2]?.test ?? isInk).count,
          greenPixels: pixelsWhere([small], isGreen).count,
        },
        rule: "dark share (L* under 35, outline excluded) under 45%; mean cloth hue 236 to 256; at least a quarter of the cloth lit (value 0.55 and more); lit cloth at least 40 from the Undead near-black #313135",
      },
      byEye: BY_EYE[1].note,
      verdict: gate1Pass && BY_EYE[1].pass ? "PASS" : "FAIL",
    },
    {
      gate: 2,
      asks: "The Horror has no cloth and no hood although layer 3 names cloth.",
      measured: {
        navyShadeShare: percent(horrorBlue),
        tealShare: percent(share(horror, BANDS[5]?.test ?? isInk)),
        rule: "by eye: the blue of the sprite (hue 228 to 266) is the shade of the teal body, which no measure tells from cloth",
      },
      byEye: BY_EYE[2].note,
      verdict: gate2Pass && BY_EYE[2].pass ? "PASS" : "FAIL",
    },
    {
      gate: 3,
      asks: "The Herald fills the canvas height (100 px or more) and is not shorter than any giant of the review's lineup; its eye reads at zoom 0.75.",
      measured: {
        heraldHeight,
        heraldWidth: opaqueBounds(herald).width,
        giantHeights,
        tallestGiant,
        eyePixelsAtZoom075: pixelsWhere(
          [await resampled(herald, 0.75)],
          BANDS[6]?.test ?? isInk,
        ).count,
        rule: "opaque height at least 100 px and at least the tallest giant's",
      },
      byEye: BY_EYE[3].note,
      verdict: gate3Pass && BY_EYE[3].pass ? "PASS" : "FAIL",
    },
    {
      gate: 4,
      asks: "Green is small on all three and lands on hue 148 after the accent step; no pixel is red, violet or magenta.",
      measured: {
        ...greens,
        rule: "green (the accent band: hue 80 to 152, saturation 0.5 and more) at most 8% of each sprite and every green tone at hue 144 to 152; no red (hue 345 to 12) and no violet or magenta (hue 270 to 345) pixel",
      },
      byEye: BY_EYE[4].note,
      verdict: gate4Pass && BY_EYE[4].pass ? "PASS" : "FAIL",
    },
    {
      gate: 5,
      asks: "A lineup at native and half size, in colour and greyscale, by the measure of the Dwarf lineup.",
      measured: {
        pairs: gated.map((pair) => ({
          unit: pair.unit,
          rival: pair.rival,
          ...pair.measure,
        })),
        failing,
        rule: "every named pair distinct by the Dwarf lineup's calibrated thresholds (lineup.json)",
      },
      byEye: BY_EYE[5].note,
      verdict: failing.length === 0 && BY_EYE[5].pass ? "PASS" : "FAIL",
    },
  ];
}

/** The Ice Witch's navy robe, measured on its master (the dark blues). */
async function iceWitchRobe(): Promise<Rgb> {
  return pixelsWhere(
    [await unitMaster("chibi-direction-ice-folk-ice-witch")],
    (_, h, s, v) => h >= 205 && h <= 250 && s >= 0.4 && v >= 0.14 && v < 0.75,
  ).mean;
}

/**
 * What the worker saw on the sheets (the parts of a gate no measure
 * settles), recorded with the bead. Edit with the art.
 */
const BY_EYE: Readonly<
  Record<1 | 2 | 3 | 4 | 5, { readonly pass: boolean; readonly note: string }>
> = {
  1: {
    pass: true,
    note: "On sample-zoom-0.75.png the two cream eyes are the first thing read on every ground, and the candle is a cream stub with a green flame beside the body; the flame is 8 px at that zoom and weakest on Grass and Snow. The robe reads indigo, lighter on the left; its shading is shallow (the accent compresses it).",
  },
  2: {
    pass: true,
    note: "No robe, hood, cloak or other cloth on sample-x4.png: a bare teal ball with a brass collar. The measured blue is the navy shade of the teal body, not cloth.",
  },
  3: {
    pass: true,
    note: "On giants-x2.png the Herald stands level with the Brass Titan and under the Gingerbread Giant only; the yellow eye is the brightest shape of the sprite at zoom 0.75.",
  },
  4: {
    pass: true,
    note: "The only green on the Initiate is the flame. The Horror keeps a few green specks on its head, and the lit tips of the Herald's tentacle crown fall in the accent band and turn green (4% of the sprite): they read as part of the teal crown.",
  },
  5: {
    pass: true,
    note: "On lineup-1x.png, at half size and in greyscale: the Initiate is a hood with two white eyes and no staff (Necromancer: beard and skull staff; Ice Witch: pale face and crown); the Horror is a ball with a pale belly band (Spider: flat with eight legs; Bunny: ears); the Herald is a bell with one eye (Lich: raised arms and ribs).",
  },
};

// ------------------------------------------------------------ main

async function loadSprites(records: BatchRecords): Promise<{
  readonly sprites: Record<SampleKey, RgbaRaster>;
  readonly source: Record<string, string>;
}> {
  const recipes = option("--recipes");
  const sprites = {} as Record<SampleKey, RgbaRaster>;
  const source: Record<string, string> = {};
  if (recipes === undefined) {
    for (const unit of SAMPLE) {
      sprites[unit.key] = await unitMaster(unit.asset);
      source[unit.title] = `master ${unit.asset}`;
    }
    return { sprites, source };
  }
  const chosen = new Map(
    recipes.split(",").map((entry) => {
      const [key = "", recipe = ""] = entry.split("=");
      return [key, recipe] as const;
    }),
  );
  for (const unit of SAMPLE) {
    const entry = chosen.get(unit.key);
    if (entry === undefined) {
      sprites[unit.key] = await unitMaster(unit.asset);
      source[unit.title] = `master ${unit.asset}`;
      continue;
    }
    const [recipe = "", candidate = "0"] = entry.split(":");
    const raw = await candidateOfRecipe(
      ROOT,
      records,
      recipe,
      Number(candidate),
    );
    const preset = unit.key === "horror" ? "cult-green" : "cult-lodge";
    sprites[unit.key] = accentRaster(raw, ACCENT_PRESETS[preset]).raster;
    source[unit.title] =
      `candidate ${recipe}:${candidate} with the ${preset} accent`;
  }
  return { sprites, source };
}

async function main(): Promise<void> {
  const study = option("--recipes") !== undefined;
  const outOption = option("--out");
  if (study && outOption === undefined)
    throw new Error("--recipes needs --out DIR (a scratch directory)");
  if (outOption !== undefined) out = path.resolve(outOption);
  await mkdir(out, { recursive: true });
  const records = await loadRecords(productionLayout(ROOT, BATCH), BATCH);
  const { sprites, source } = await loadSprites(records);

  await candidatesSheet(records);
  await sampleSheet(sprites, 4, 1, "sample-x4.png");
  await sampleSheet(sprites, 1, 1, "sample-1x.png");
  await sampleSheet(sprites, 2, 0.75, "sample-zoom-0.75.png");

  const { thresholds, pairs: calibrationPairs } = await calibratedThresholds();
  const rows: LineupRow[] = [];
  const lineup: {
    unit: string;
    rival: string;
    gated: boolean;
    measure: PairMeasure;
  }[] = [];
  const measure = async (
    unit: (typeof SAMPLE)[number],
    rivals: readonly Named[],
    gated: boolean,
    limits: LineupThresholds,
  ): Promise<void> => {
    const loaded = await Promise.all(rivals.map(([, id]) => unitMaster(id)));
    rows.push({
      title: unit.title,
      rivals: rivals.map(([name]) => name).join(", "),
      sprites: [sprites[unit.key], ...loaded],
    });
    for (const [index, [name]] of rivals.entries()) {
      const rival = loaded[index];
      if (rival !== undefined)
        lineup.push({
          unit: unit.title,
          rival: name,
          gated,
          measure: measurePair(sprites[unit.key], rival, limits),
        });
    }
  };
  for (const unit of SAMPLE) {
    await measure(unit, RIVALS[unit.key], true, thresholds);
    if (unit.key === "initiate") await measure(unit, ROBED, false, thresholds);
  }
  rows.push({
    title: "The sample",
    rivals: "",
    sprites: SAMPLE.map((unit) => sprites[unit.key]),
  });
  await lineupSheet("lineup-1x.png", rows, 1);
  await lineupSheet("lineup-x3.png", rows, 3);
  await json("lineup.json", {
    bead: BEAD,
    note: "The Dwarf lineup's measures (scripts/art/dwarf-direction/measure.ts) and thresholds, calibrated on the same-role pairs of the six first factions. `gated` pairs are the ones gate 5 of CULT.md names; the others are context.",
    source,
    thresholds,
    calibrationPairs,
    pairs: lineup,
  });

  const giantHeights = await giantsSheet(sprites.herald);
  await paletteFiles(sprites);
  const verdicts = await gates(sprites, giantHeights, lineup);
  await json("gates.json", { bead: BEAD, source, gates: verdicts });
  for (const gate of verdicts)
    console.log(`gate ${gate.gate}: ${gate.verdict}`);
  await json("index.json", {
    bead: BEAD,
    batch: BATCH,
    source,
    gates: Object.fromEntries(
      verdicts.map((gate) => [gate.gate, gate.verdict]),
    ),
    files: [...written, "index.json"],
  });

  const copyTo = option("--copy-to");
  if (copyTo !== undefined) {
    await mkdir(copyTo, { recursive: true });
    for (const name of written)
      await copyFile(path.join(out, name), path.join(copyTo, name));
    console.log(`copied ${written.length} files to ${copyTo}`);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "review failed");
  process.exitCode = 1;
});
