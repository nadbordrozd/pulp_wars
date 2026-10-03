/**
 * Review evidence of the Martian production art (bead pulp_wars-t6s.6,
 * batch `direction-martian`, docs/art/factions/MARTIAN.md).
 *
 *   npm run art:chibi-martian-direction-review
 *   npm run art:chibi-martian-direction-review -- --skip-capture
 *   npm run art:chibi-martian-direction-review -- --port 6509
 *
 * Writes art/pixellab/reviews/chibi-batch-direction-martian/:
 *
 * - `roster-{x4,1x}.png`, `roster-zoom-0.75.png`: the nine units on Grass and
 *   on Mountain rock, each beside the Human, Undead, Goblin and Dinosaur
 *   unit of its role;
 * - `terrain-x2.png`: every unit on Grass, Forest, Mountain, Shallow and
 *   Deep Water (the machines afloat are the machine itself over the water;
 *   the flyers with their code-drawn ground shadow);
 * - `portraits-x4.png`, `icons-x4.png`, `effects-x3.png`, `cities-x3.png`;
 * - `palette.{png,json}` and `readability.json`, measured on the masters;
 * - `scene-{mixed-a,mixed-b}-{desktop,phone}-zoom-{1,0.75}.png`: the mixed
 *   scenes of scripts/art/martian-direction/scene.ts drawn by the real board
 *   host with the default look (the four-Martian scene is no longer
 *   captured since bead pulp_wars-w5j.3);
 * - `aliens-before-after-{x4,1x}.png`, `aliens-before-after-zoom-0.75.png`,
 *   `aliens-silhouettes-x4.png`, `aliens-portraits-x4.png` and
 *   `aliens.json` (bead pulp_wars-b5f.1): the Grunt, the Ray Gunner and the
 *   Shield Projector before and after their redesign, beside the other
 *   Martian units, with their outline overlaps; the "before" sprites are
 *   re-derived from the superseded recipes in the records, so they need no
 *   checked-in copy. `scene-aliens-*` draws both trios on the real board;
 * - `index.json`.
 *
 * The faction is not in the engine yet, so nothing here launches a Martian
 * match: the scenes register the Martian rasters under a stand-in faction.
 * Captures start Vite on port 6509 unless `--port` says otherwise and need
 * CHROME_PATH.
 */
import { spawn, type ChildProcess } from "node:child_process";
import { access, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import sharp from "sharp";
import {
  MARTIAN_FLAG_ANCHORS_V7,
  MARTIAN_FLYER_PRESENTATION_V7,
  MARTIAN_PALETTE_V7,
} from "../../src/assets/chibi-direction-martian-presentation";
import { RULESET7_PLAYER_COLORS } from "../../src/render/canvas/owner-recolour-v7";
import { ACCENT_PRESETS, accentRaster, isAccentColour } from "./chibi/accent";
import { rgbToHsv, type RgbaRaster } from "./chibi/owner-mask";
import { loadRecords, productionLayout, readRaster } from "./chibi/pipeline";
import { candidateCell, cropRaster } from "./chibi/raster";

const ROOT = process.cwd();
const OUT = path.join(
  ROOT,
  "art/pixellab/reviews/chibi-batch-direction-martian",
);
const TILE = 80;
type Rgb = readonly [number, number, number];

function option(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index < 0 ? undefined : process.argv[index + 1];
}

/** Role, Martian unit, and the unit of the role in the other four factions. */
const UNITS = [
  ["FIGHTER", "grunt", "Grunt", "fighter", "skeleton", "goblin", "caveman"],
  ["RAIDER", "saucer", "Saucer", "raider", "ghoul", "wolf-rider", "raptor"],
  [
    "MARKSMAN",
    "ray-gunner",
    "Ray Gunner",
    "marksman",
    "banshee",
    "bomb-chucker",
    "spitter",
  ],
  [
    "GUARD",
    "shield-projector",
    "Shield Projector",
    "guard",
    "zombie",
    "orc-brute",
    "ankylosaurus",
  ],
  [
    "CAPTAIN",
    "brain",
    "Brain",
    "captain",
    "necromancer",
    "orc-warboss",
    "shaman",
  ],
  [
    "CATAPULT",
    "tripod",
    "Tripod",
    "catapult",
    "lich",
    "rocket-cart",
    "triceratops",
  ],
  [
    "KNIGHT",
    "mothership",
    "Mothership",
    "knight",
    "vampire",
    "scrap-buggy",
    "t-rex",
  ],
  [
    "JUGGERNAUT",
    "colossus",
    "Colossus",
    "juggernaut",
    "abomination",
    "troll",
    "brontosaurus",
  ],
  ["THRALL", "thrall", "Thrall", "fighter", "skeleton", "goblin", "caveman"],
] as const;
/** Plate widths of the live look by unit class (VISUAL_DIRECTION_2026-10.md). */
const PLATE = { STANDARD_UNIT: 52, LARGE_UNIT: 57, GIANT_UNIT: 68 } as const;
const ICONS = [
  ["action-beam-down", "Beam Down"],
  ["action-mind-control", "Mind Control"],
  ["action-tractor-beam", "Tractor Beam"],
  ["action-martian-rally", "Psychic Command"],
  ["action-force-field", "Force Field"],
  ["status-shield", "Shield"],
  ["status-cooling", "Cooling"],
] as const;
const EFFECTS = [
  ["heat-ray", "Heat ray impact"],
  ["shield-flare", "Shield flare"],
  ["beam-down", "Beam Down column"],
  ["tractor-beam", "Tractor Beam"],
  ["mind-control", "Mind Control swirl"],
] as const;

const chibi = (folder: string, id: string): string =>
  path.join(ROOT, "public/assets/chibi", folder, `${id}.png`);
const unitFile = (id: string): string => chibi("units", id);

async function exists(file: string): Promise<boolean> {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

/** The Dinosaur production sprite when it exists, else the classic one. */
async function dinosaurUnit(name: string): Promise<string> {
  const direction = unitFile(`chibi-direction-dinosaur-${name}`);
  return (await exists(direction))
    ? direction
    : unitFile(`chibi-dinosaur-${name}`);
}

// ------------------------------------------------------------ rasters

interface Canvas {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8Array;
}

const rgbOf = (hex: string): Rgb => [
  Number.parseInt(hex.slice(1, 3), 16),
  Number.parseInt(hex.slice(3, 5), 16),
  Number.parseInt(hex.slice(5, 7), 16),
];
const hexOf = (rgb: Rgb): string =>
  `#${rgb.map((value) => Math.round(value).toString(16).padStart(2, "0")).join("")}`;

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
  source: RgbaRaster | Canvas,
  left: number,
  top: number,
  scale = 1,
  opacity = 1,
): void {
  for (let y = 0; y < source.height * scale; y += 1)
    for (let x = 0; x < source.width * scale; x += 1) {
      const tx = Math.round(left) + x;
      const ty = Math.round(top) + y;
      if (tx < 0 || ty < 0 || tx >= target.width || ty >= target.height)
        continue;
      const s =
        (Math.floor(y / scale) * source.width + Math.floor(x / scale)) * 4;
      const alpha = ((source.data[s + 3] ?? 0) / 255) * opacity;
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

/** A filled ellipse as a raster, for the flyers' code-drawn ground shadow. */
function ellipse(radiusX: number, radiusY: number, rgb: Rgb): RgbaRaster {
  const width = radiusX * 2 + 1;
  const height = radiusY * 2 + 1;
  const data = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y += 1)
    for (let x = 0; x < width; x += 1) {
      const dx = (x - radiusX) / (radiusX + 0.5);
      const dy = (y - radiusY) / (radiusY + 0.5);
      if (dx * dx + dy * dy > 1) continue;
      data.set([rgb[0], rgb[1], rgb[2], 255], (y * width + x) * 4);
    }
  return { width, height, data };
}

/** A small right-pointing pennant, as the live look draws one on a city. */
function pennant(rgb: Rgb): RgbaRaster {
  const width = 11;
  const height = 9;
  const data = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    const reach = width - Math.round(Math.abs(y - 4) * 2.4);
    for (let x = 0; x < reach; x += 1) {
      const edge = x === 0 || x >= reach - 1 || y === 0 || y === height - 1;
      data.set(
        edge ? [34, 28, 36, 255] : [rgb[0], rgb[1], rgb[2], 255],
        (y * width + x) * 4,
      );
    }
  }
  return { width, height, data };
}

function bounds(raster: RgbaRaster): {
  left: number;
  right: number;
  top: number;
  bottom: number;
  width: number;
  height: number;
} {
  let left = raster.width;
  let right = -1;
  let top = raster.height;
  let bottom = -1;
  for (let y = 0; y < raster.height; y += 1)
    for (let x = 0; x < raster.width; x += 1)
      if ((raster.data[(y * raster.width + x) * 4 + 3] ?? 0) >= 128) {
        left = Math.min(left, x);
        right = Math.max(right, x);
        top = Math.min(top, y);
        bottom = Math.max(bottom, y);
      }
  return {
    left,
    right,
    top,
    bottom,
    width: right - left + 1,
    height: bottom - top + 1,
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

const written: string[] = [];

async function writeSheet(
  name: string,
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
    .toFile(path.join(OUT, name));
  written.push(name);
  console.log(`wrote ${name}`);
}

const PAPER: Rgb = [30, 33, 40];
const FRAME: Rgb = [52, 58, 66];
const LIGHT: Rgb = [244, 241, 232];
const GAP = 6;
const LABEL_H = 22;
const CELL_W = 96;
const CELL_H = 108;

const terrainFile = (name: string): string => chibi("terrain", name);

interface Ground {
  readonly label: string;
  /** Layers drawn bottom-aligned under the piece, in order. */
  readonly layers: readonly RgbaRaster[];
}

async function grounds(): Promise<Record<string, Ground>> {
  const load = (name: string): Promise<RgbaRaster> =>
    readRaster(terrainFile(name));
  return {
    grass: { label: "Grass", layers: [await load("chibi-grass-1")] },
    forest: { label: "Forest", layers: [await load("chibi-forest-1")] },
    // A unit on a Mountain stands in front of the peak: the rocky ground
    // tile is what its lower half is seen against.
    mountain: { label: "Mountain", layers: [await load("chibi-mountain-1")] },
    rock: {
      label: "Mountain rock",
      layers: [await load("chibi-mountain-ground-1")],
    },
    shallow: {
      label: "Shallow Water",
      layers: [await load("chibi-shallow-water-1")],
    },
    deep: { label: "Deep Water", layers: [await load("chibi-deep-water-1")] },
  };
}

/**
 * A board cell: the ground bottom-aligned, then the piece on its class
 * anchor (bottom-centred), with the flyers' ground shadow under it.
 */
function boardCell(
  ground: Ground,
  piece: RgbaRaster,
  scale: number,
  shadow?: { x: number; y: number; radiusX: number; radiusY: number },
): Canvas {
  const out = blank(CELL_W * scale, CELL_H * scale, FRAME);
  const tileLeft = ((CELL_W - TILE) / 2) * scale;
  const bottom = CELL_H * scale;
  for (const layer of ground.layers)
    blit(
      out,
      layer,
      tileLeft + ((TILE - layer.width) / 2) * scale,
      bottom - layer.height * scale,
      scale,
    );
  const pieceLeft = tileLeft + ((TILE - piece.width) / 2) * scale;
  const pieceTop = bottom - piece.height * scale;
  if (shadow !== undefined)
    blit(
      out,
      ellipse(shadow.radiusX, shadow.radiusY, rgbOf(MARTIAN_PALETTE_V7.shadow)),
      pieceLeft + (shadow.x - shadow.radiusX) * scale,
      pieceTop + (shadow.y - shadow.radiusY) * scale,
      scale,
      0.35,
    );
  blit(out, piece, pieceLeft, pieceTop, scale);
  return out;
}

const flyerShadow = (
  id: string,
): { x: number; y: number; radiusX: number; radiusY: number } | undefined =>
  (
    MARTIAN_FLYER_PRESENTATION_V7 as Record<
      string,
      { shadow: { x: number; y: number; radiusX: number; radiusY: number } }
    >
  )[id]?.shadow;

// ------------------------------------------------------------ sheets

async function rosterSheet(scale: number, name: string): Promise<void> {
  const ground = await grounds();
  const columns = [
    "Martian",
    "on rock",
    "Human",
    "Undead",
    "Goblin",
    "Dinosaur",
  ];
  const labelW = 150;
  const sheet = blank(
    labelW + columns.length * (CELL_W * scale + GAP) + GAP,
    LABEL_H + UNITS.length * (CELL_H * scale + GAP) + GAP,
    PAPER,
  );
  const labels: Label[] = columns.map((text, column) => ({
    text,
    left: labelW + column * (CELL_W * scale + GAP),
    top: 4,
  }));
  for (const [row, unit] of UNITS.entries()) {
    const [role, martian, title, human, undead, goblin, dinosaur] = unit;
    const top = LABEL_H + row * (CELL_H * scale + GAP);
    labels.push(
      { text: title, left: 6, top: top + 6 },
      { text: role, left: 6, top: top + 26, size: 11, fill: "#aab3c0" },
    );
    const id = `chibi-direction-martian-${martian}`;
    const sprite = await readRaster(unitFile(id));
    const files = [
      unitFile(`chibi-direction-${human}`),
      unitFile(`chibi-direction-undead-${undead}`),
      unitFile(`chibi-direction-goblin-${goblin}`),
      await dinosaurUnit(dinosaur),
    ];
    const cells = [
      boardCell(ground.grass as Ground, sprite, scale, flyerShadow(id)),
      boardCell(ground.rock as Ground, sprite, scale, flyerShadow(id)),
      ...(await Promise.all(
        files.map(async (file) =>
          boardCell(ground.grass as Ground, await readRaster(file), scale),
        ),
      )),
    ];
    for (const [column, cell] of cells.entries())
      blit(sheet, cell, labelW + column * (CELL_W * scale + GAP), top);
  }
  await writeSheet(name, sheet, labels);
}

async function terrainSheet(): Promise<void> {
  const scale = 2;
  const ground = await grounds();
  const keys = ["grass", "forest", "mountain", "shallow", "deep"] as const;
  const labelW = 150;
  const sheet = blank(
    labelW + keys.length * (CELL_W * scale + GAP) + GAP,
    LABEL_H + UNITS.length * (CELL_H * scale + GAP) + GAP,
    PAPER,
  );
  const labels: Label[] = keys.map((key, column) => ({
    text: (ground[key] as Ground).label,
    left: labelW + column * (CELL_W * scale + GAP),
    top: 4,
  }));
  for (const [row, unit] of UNITS.entries()) {
    const top = LABEL_H + row * (CELL_H * scale + GAP);
    const id = `chibi-direction-martian-${unit[1]}`;
    labels.push({ text: unit[2], left: 6, top: top + 6 });
    const sprite = await readRaster(unitFile(id));
    for (const [column, key] of keys.entries())
      blit(
        sheet,
        boardCell(ground[key] as Ground, sprite, scale, flyerShadow(id)),
        labelW + column * (CELL_W * scale + GAP),
        top,
      );
  }
  await writeSheet("terrain-x2.png", sheet, labels);
}

async function portraitsSheet(): Promise<void> {
  const scale = 4;
  const cell = 56;
  const columns = ["dock", "page", "map sprite", "Human"];
  const labelW = 150;
  const widths = [cell, cell, 96, cell];
  const lefts = widths.map(
    (_, index) =>
      labelW +
      widths.slice(0, index).reduce((sum, w) => sum + w * scale + GAP, 0),
  );
  const rowH = 104;
  const sheet = blank(
    (lefts.at(-1) ?? 0) + cell * scale + GAP,
    LABEL_H + UNITS.length * (rowH * scale * 0.5 + GAP) + GAP,
    PAPER,
  );
  const labels: Label[] = columns.map((text, column) => ({
    text,
    left: lefts[column] ?? 0,
    top: 4,
  }));
  const half = scale / 2;
  for (const [row, unit] of UNITS.entries()) {
    const top = LABEL_H + row * (rowH * half + GAP);
    labels.push({ text: unit[2], left: 6, top: top + 6 });
    const portrait = await readRaster(
      chibi("portraits", `chibi-direction-portrait-martian-${unit[1]}`),
    );
    const sprite = await readRaster(
      unitFile(`chibi-direction-martian-${unit[1]}`),
    );
    const human = await readRaster(
      chibi("portraits", `chibi-direction-portrait-${unit[3]}`),
    );
    fill(
      sheet,
      lefts[0] ?? 0,
      top,
      cell * half * 2,
      cell * half * 2 - 16,
      [36, 40, 48],
    );
    blit(sheet, portrait, (lefts[0] ?? 0) + 8, top + 4, scale);
    fill(
      sheet,
      lefts[1] ?? 0,
      top,
      cell * half * 2,
      cell * half * 2 - 16,
      LIGHT,
    );
    blit(sheet, portrait, (lefts[1] ?? 0) + 8, top + 4, scale);
    fill(
      sheet,
      lefts[2] ?? 0,
      top,
      96 * half * 2,
      cell * half * 2 - 16,
      rgbOf("#89b75b"),
    );
    blit(sheet, sprite, (lefts[2] ?? 0) + 8, top + 2, 2);
    fill(
      sheet,
      lefts[3] ?? 0,
      top,
      cell * half * 2,
      cell * half * 2 - 16,
      [36, 40, 48],
    );
    blit(sheet, human, (lefts[3] ?? 0) + 8, top + 4, scale);
  }
  await writeSheet("portraits-x4.png", sheet, labels);
}

async function iconsSheet(): Promise<void> {
  const scale = 4;
  const existing = [
    ["chibi-icon-action-kaboom", "Kaboom!"],
    ["chibi-direction-icon-action-raise-dead", "Raise Dead"],
    ["chibi-direction-icon-action-wail", "Wail"],
    ["chibi-icon-action-stampede", "Charge!"],
    ["chibi-icon-action-rally", "Rally"],
  ] as const;
  const all = [
    ...ICONS.map(
      ([name, title]) => [`chibi-direction-icon-${name}`, title] as const,
    ),
    ...existing,
  ];
  const cellW = 48 * scale + GAP;
  const sheet = blank(
    all.length * cellW + GAP,
    LABEL_H * 2 + 48 * scale * 2 + 48 + 24 + GAP * 6,
    PAPER,
  );
  const labels: Label[] = [];
  for (const [column, [id, title]] of all.entries()) {
    const left = GAP + column * cellW;
    const icon = await readRaster(chibi("icons", id));
    labels.push({ text: title, left, top: 4, size: 12 });
    let top = LABEL_H;
    fill(sheet, left, top, 48 * scale, 48 * scale, [36, 40, 48]);
    blit(sheet, icon, left, top, scale);
    top += 48 * scale + GAP;
    fill(sheet, left, top, 48 * scale, 48 * scale, LIGHT);
    blit(sheet, icon, left, top, scale);
    top += 48 * scale + GAP;
    // The size of an action tile, and the half size of inline HUD text.
    fill(sheet, left, top, 48 * scale, 48 + 4, [36, 40, 48]);
    blit(sheet, icon, left + 4, top + 2, 1);
    const small = await sharp(Buffer.from(icon.data), {
      raw: { width: icon.width, height: icon.height, channels: 4 },
    })
      .resize(24, 24, { kernel: "lanczos3" })
      .raw()
      .toBuffer();
    blit(
      sheet,
      { width: 24, height: 24, data: new Uint8Array(small) },
      left + 64,
      top + 14,
      1,
    );
  }
  labels.push({
    text: "dock panel x4, light page x4, action tile 48 px and HUD 24 px; the five on the right are existing icons",
    left: GAP,
    top: sheet.height - LABEL_H,
    size: 12,
    fill: "#aab3c0",
  });
  await writeSheet("icons-x4.png", sheet, labels);
}

async function effectsSheet(): Promise<void> {
  const scale = 3;
  const ground = await grounds();
  const keys = ["grass", "forest", "rock", "shallow", "deep"] as const;
  const grunt = await readRaster(unitFile("chibi-direction-martian-grunt"));
  const fighter = await readRaster(unitFile("chibi-direction-fighter"));
  const columns = [
    ...keys.map((key) => (ground[key] as Ground).label),
    "dock panel",
    "on a Grunt",
    "on a Human",
  ];
  const labelW = 170;
  const cell = TILE * scale + GAP;
  const sheet = blank(
    labelW + columns.length * cell + GAP,
    LABEL_H + EFFECTS.length * cell + GAP,
    PAPER,
  );
  const labels: Label[] = columns.map((text, column) => ({
    text,
    left: labelW + column * cell,
    top: 4,
    size: 12,
  }));
  for (const [row, [name, title]] of EFFECTS.entries()) {
    const top = LABEL_H + row * cell;
    labels.push({ text: title, left: 6, top: top + 6, size: 13 });
    const effect = await readRaster(
      chibi("effects", `chibi-direction-effect-martian-${name}`),
    );
    const centre = (TILE - effect.width) / 2;
    for (const [column, key] of keys.entries()) {
      const left = labelW + column * cell;
      const layer = (ground[key] as Ground).layers[0];
      if (layer === undefined) continue;
      const tile = blank(TILE * scale, TILE * scale, FRAME);
      blit(tile, layer, 0, (TILE - layer.height) * scale, scale);
      blit(tile, effect, centre * scale, centre * scale, scale);
      blit(sheet, tile, left, top);
    }
    let left = labelW + keys.length * cell;
    fill(sheet, left, top, TILE * scale, TILE * scale, [36, 40, 48]);
    blit(sheet, effect, left + centre * scale, top + centre * scale, scale);
    for (const unit of [grunt, fighter]) {
      left += cell;
      const tile = blank(TILE * scale, TILE * scale, FRAME);
      const grass = (ground.grass as Ground).layers[0];
      if (grass !== undefined) blit(tile, grass, 0, 0, scale);
      blit(tile, unit, ((TILE - unit.width) / 2) * scale, 0, scale);
      // Over the unit's body, where the board draws an ability cue.
      blit(tile, effect, centre * scale, (centre + 4) * scale, scale);
      blit(sheet, tile, left, top);
    }
  }
  await writeSheet("effects-x3.png", sheet, labels);
}

async function citiesSheet(): Promise<void> {
  const scale = 3;
  const ground = await grounds();
  const grass = (ground.grass as Ground).layers[0];
  if (grass === undefined) throw new Error("no grass tile");
  const owners = Object.entries(RULESET7_PLAYER_COLORS);
  const others = [
    ["Human", (level: number) => `chibi-direction-city-${level}`],
    ["Undead", (level: number) => `chibi-direction-undead-city-${level}`],
    ["Goblin", (level: number) => `chibi-direction-goblin-city-${level}`],
    ["Dinosaur", (level: number) => `chibi-dinosaur-city-${level}`],
  ] as const;
  const columns = [
    "as authored",
    ...owners.map(
      ([name]) => `${name.charAt(0)}${name.slice(1).toLowerCase()} pennant`,
    ),
    "on rock",
    ...others.map(([name]) => name),
  ];
  const labelW = 90;
  const cell = CELL_W * scale + GAP;
  const sheet = blank(
    labelW + columns.length * cell + GAP,
    LABEL_H + 3 * (CELL_H * scale + GAP) + GAP,
    PAPER,
  );
  const labels: Label[] = columns.map((text, column) => ({
    text,
    left: labelW + column * cell,
    top: 4,
    size: 12,
  }));
  for (const level of [1, 2, 3]) {
    const top = LABEL_H + (level - 1) * (CELL_H * scale + GAP);
    labels.push({ text: `City ${level}`, left: 6, top: top + 6 });
    const id = `chibi-direction-martian-city-${level}`;
    const city = await readRaster(chibi("settlements", id));
    const anchor = MARTIAN_FLAG_ANCHORS_V7[id];
    if (anchor === undefined) throw new Error(`${id}: no pennant anchor`);
    const cityCell = (under: Ground, piece: RgbaRaster, flag?: Rgb): Canvas => {
      const out = boardCell(under, piece, scale);
      if (flag !== undefined) {
        const left = ((CELL_W - TILE) / 2 + (TILE - piece.width) / 2) * scale;
        const pieceTop = (CELL_H - piece.height) * scale;
        blit(
          out,
          pennant(flag),
          left + anchor.x * scale,
          pieceTop + anchor.y * scale,
          scale,
        );
      }
      return out;
    };
    const cells: Canvas[] = [
      cityCell(ground.grass as Ground, city),
      ...owners.map(([, colour]) =>
        cityCell(ground.grass as Ground, city, rgbOf(colour)),
      ),
      cityCell(
        ground.rock as Ground,
        city,
        rgbOf(RULESET7_PLAYER_COLORS.CORAL),
      ),
    ];
    for (const [, file] of others)
      cells.push(
        cityCell(
          ground.grass as Ground,
          await readRaster(chibi("settlements", file(level))),
        ),
      );
    for (const [column, canvas] of cells.entries())
      blit(sheet, canvas, labelW + column * cell, top);
  }
  await writeSheet("cities-x3.png", sheet, labels);
}

// ------------------------------------------------------------ measurements

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

/** CIE76 colour difference: about 10 is clear at a glance, 20 and more are different colours. */
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

/** Machado, Oliveira and Fernandes 2009, severity 1.0, in linear RGB. */
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
  readonly hueA: number;
  readonly hueB: number;
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
    hueA: Math.round(rgbToHsv(a[0], a[1], a[2]).hue),
    hueB: Math.round(rgbToHsv(b[0], b[1], b[2]).hue),
  };
}

const SPEC = ACCENT_PRESETS["martian-magenta"];

/** The palette roles, tested in this order. */
const BANDS: readonly {
  id: string;
  label: string;
  test: (rgb: Rgb, h: number, s: number, v: number) => boolean;
}[] = [
  {
    id: "magenta",
    label: "Hot magenta accent",
    test: (rgb) => isAccentColour(SPEC, rgb[0], rgb[1], rgb[2]),
  },
  {
    id: "outline",
    label: "Outline and darkest tones",
    test: (_, __, ___, v) => v < 0.14,
  },
  {
    id: "skin",
    label: "Lavender-grey skin",
    test: (_, h, s, v) =>
      h >= 225 && h <= 300 && s >= 0.1 && s < 0.4 && v >= 0.5,
  },
  {
    id: "glass",
    label: "Glass",
    test: (_, h, s, v) => h >= 165 && h <= 215 && s >= 0.18 && v >= 0.5,
  },
  {
    id: "chrome",
    label: "Chrome, lit",
    test: (_, __, s, v) => s < 0.22 && v >= 0.68,
  },
  {
    id: "chromeShade",
    label: "Chrome, shaded blue-grey",
    test: (_, __, s, v) => s < 0.4 && v >= 0.42 && v < 0.68,
  },
  {
    id: "gunmetal",
    label: "Gunmetal",
    test: (_, __, s, v) => s < 0.5 && v >= 0.14 && v < 0.42,
  },
];

interface BandStat {
  count: number;
  sum: [number, number, number];
  tones: Map<string, number>;
  hueSum: number;
}

function measure(rasters: readonly RgbaRaster[]): {
  readonly opaque: number;
  readonly bands: Record<string, BandStat>;
} {
  const stats: Record<string, BandStat> = {};
  for (const band of BANDS)
    stats[band.id] = { count: 0, sum: [0, 0, 0], tones: new Map(), hueSum: 0 };
  let opaque = 0;
  for (const raster of rasters)
    for (let index = 0; index < raster.width * raster.height; index += 1) {
      const o = index * 4;
      if ((raster.data[o + 3] ?? 0) < 128) continue;
      opaque += 1;
      const rgb: Rgb = [
        raster.data[o] ?? 0,
        raster.data[o + 1] ?? 0,
        raster.data[o + 2] ?? 0,
      ];
      const { hue, saturation, value } = rgbToHsv(rgb[0], rgb[1], rgb[2]);
      const band = BANDS.find((entry) =>
        entry.test(rgb, hue, saturation, value),
      );
      if (band === undefined) continue;
      const stat = stats[band.id];
      if (stat === undefined) continue;
      stat.count += 1;
      stat.sum[0] += rgb[0];
      stat.sum[1] += rgb[1];
      stat.sum[2] += rgb[2];
      stat.hueSum += hue;
      const hex = hexOf(rgb);
      stat.tones.set(hex, (stat.tones.get(hex) ?? 0) + 1);
    }
  return { opaque, bands: stats };
}

const meanOf = (stat: BandStat): Rgb =>
  stat.count === 0
    ? [0, 0, 0]
    : [
        stat.sum[0] / stat.count,
        stat.sum[1] / stat.count,
        stat.sum[2] / stat.count,
      ];
const topTones = (stat: BandStat, count = 4): string[] =>
  [...stat.tones.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, count)
    .map(([hex]) => hex);

function meanColour(raster: RgbaRaster, lightOnly = false): Rgb {
  const sum = [0, 0, 0];
  let count = 0;
  for (let index = 0; index < raster.width * raster.height; index += 1) {
    const o = index * 4;
    if ((raster.data[o + 3] ?? 0) < 128) continue;
    const rgb: Rgb = [
      raster.data[o] ?? 0,
      raster.data[o + 1] ?? 0,
      raster.data[o + 2] ?? 0,
    ];
    if (lightOnly && Math.max(...rgb) / 255 < 0.7) continue;
    sum[0] = (sum[0] ?? 0) + rgb[0];
    sum[1] = (sum[1] ?? 0) + rgb[1];
    sum[2] = (sum[2] ?? 0) + rgb[2];
    count += 1;
  }
  return [(sum[0] ?? 0) / count, (sum[1] ?? 0) / count, (sum[2] ?? 0) / count];
}

async function paletteAndReadability(): Promise<void> {
  const masters = await Promise.all(
    UNITS.map(async (unit) => ({
      unit,
      id: `chibi-direction-martian-${unit[1]}`,
      raster: await readRaster(unitFile(`chibi-direction-martian-${unit[1]}`)),
    })),
  );
  // The Thrall is a controlled local: its drab cloth is not the faction's.
  const faction = masters.filter((entry) => entry.unit[0] !== "THRALL");
  const all = measure(faction.map((entry) => entry.raster));
  const stat = (id: string): BandStat => {
    const found = all.bands[id];
    if (found === undefined) throw new Error(`no band ${id}`);
    return found;
  };
  // The lit tone: the commonest bright magenta (value at least 0.85).
  const magentaLit = rgbOf(
    [...stat("magenta").tones.entries()]
      .filter(([hex]) => Math.max(...rgbOf(hex)) / 255 >= 0.85)
      .sort((left, right) => right[1] - left[1])[0]?.[0] ??
      MARTIAN_PALETTE_V7.magenta,
  );
  const magentaMean = meanOf(stat("magenta"));
  const chrome = meanOf(stat("chrome"));
  const chromeShade = meanOf(stat("chromeShade"));
  const gunmetal = meanOf(stat("gunmetal"));
  const skin = meanOf(stat("skin"));
  const ground = await grounds();
  const grass = meanColour((ground.grass as Ground).layers[0] as RgbaRaster);
  const forest = meanColour((ground.forest as Ground).layers[0] as RgbaRaster);
  const rock = meanColour((ground.rock as Ground).layers[0] as RgbaRaster);
  const rockLight = meanColour(
    (ground.rock as Ground).layers[0] as RgbaRaster,
    true,
  );
  const shallow = meanColour(
    (ground.shallow as Ground).layers[0] as RgbaRaster,
  );
  const deep = meanColour((ground.deep as Ground).layers[0] as RgbaRaster);
  const violetLit: Rgb = rgbOf("#a221ee");
  const violetTrim: Rgb = rgbOf("#a85df5");
  const players = Object.fromEntries(
    Object.entries(RULESET7_PLAYER_COLORS).map(([name, hex]) => [
      name,
      rgbOf(hex),
    ]),
  ) as Record<keyof typeof RULESET7_PLAYER_COLORS, Rgb>;
  const crimson = rgbOf("#a8202c");
  const dinosaurOrange = rgbOf("#fe6d00");
  const limeFallback = rgbOf("#c8ff2a");
  const accentPairs = [
    pair("magenta, lit", magentaLit, "Undead violet, lit", violetLit),
    pair("magenta, lit", magentaLit, "Undead violet trim", violetTrim),
    pair("magenta, mean", magentaMean, "Undead violet, lit", violetLit),
    pair("magenta, lit", magentaLit, "Coral plate", players.CORAL),
    pair("magenta, lit", magentaLit, "Violet plate", players.VIOLET),
    pair("magenta, lit", magentaLit, "Teal plate", players.TEAL),
    pair("magenta, lit", magentaLit, "Gold plate", players.GOLD),
    pair("magenta, lit", magentaLit, "Human crimson", crimson),
    pair("magenta, lit", magentaLit, "Dinosaur orange", dinosaurOrange),
    pair(
      "magenta glow",
      rgbOf(MARTIAN_PALETTE_V7.magentaGlow),
      "Coral plate",
      players.CORAL,
    ),
    pair(
      "magenta glow",
      rgbOf(MARTIAN_PALETTE_V7.magentaGlow),
      "Violet plate",
      players.VIOLET,
    ),
    pair("magenta, lit", magentaLit, "gunmetal", gunmetal),
    pair("magenta, lit", magentaLit, "chrome", chrome),
    pair("magenta, lit", magentaLit, "Grass", grass),
  ];
  // The fallback the brief names, measured the same way, for the record.
  const fallbackPairs = [
    pair("lime fallback", limeFallback, "Grass", grass),
    pair("lime fallback", limeFallback, "Gold plate", players.GOLD),
    pair("lime fallback", limeFallback, "Goblin olive", rgbOf("#8a952f")),
    pair("lime fallback", limeFallback, "chrome", chrome),
  ];
  const violetPair = accentPairs[0] as Pair;
  const coralPair = accentPairs[3] as Pair;
  const violetPlatePair = accentPairs[4] as Pair;
  const worst = (entry: Pair): number =>
    Math.min(entry.deltaE, entry.deuteranopiaDeltaE, entry.protanopiaDeltaE);
  const verdict = {
    rule: "magenta stays if it differs from the Undead violet, the Coral plate and the Violet plate by at least 20 (CIE76) in normal vision and at least 10 under deuteranopia and protanopia; otherwise the lime-yellow fallback applies",
    againstUndeadViolet: {
      normal: violetPair.deltaE,
      worstCvd: Math.min(
        violetPair.deuteranopiaDeltaE,
        violetPair.protanopiaDeltaE,
      ),
    },
    againstCoralPlate: {
      normal: coralPair.deltaE,
      worstCvd: Math.min(
        coralPair.deuteranopiaDeltaE,
        coralPair.protanopiaDeltaE,
      ),
    },
    againstVioletPlate: {
      normal: violetPlatePair.deltaE,
      worstCvd: Math.min(
        violetPlatePair.deuteranopiaDeltaE,
        violetPlatePair.protanopiaDeltaE,
      ),
    },
    hue: Math.round(rgbToHsv(magentaLit[0], magentaLit[1], magentaLit[2]).hue),
    accent: [violetPair, coralPair, violetPlatePair].every(
      (entry) => entry.deltaE >= 20 && worst(entry) >= 10,
    )
      ? "MAGENTA"
      : "LIME_FALLBACK_NEEDED",
  };
  const units = masters.map(({ unit, id, raster }) => {
    const box = bounds(raster);
    const own = measure([raster]);
    const plate =
      raster.width === 88
        ? PLATE.GIANT_UNIT
        : raster.width === 72
          ? PLATE.LARGE_UNIT
          : PLATE.STANDARD_UNIT;
    const accent = own.bands.magenta as BandStat;
    const flyer = (
      MARTIAN_FLYER_PRESENTATION_V7 as Record<
        string,
        { hullBottom: number; groundLine: number }
      >
    )[id];
    return {
      unit: unit[2],
      role: unit[0],
      asset: id,
      canvas: `${raster.width} x ${raster.height}`,
      spriteWidth: box.width,
      spriteHeight: box.height,
      plateWidth: plate,
      widerThanPlateBy: box.width - plate,
      lowestPixelRow: box.bottom,
      accentShare: round1((accent.count / own.opaque) * 100),
      accentPixels: accent.count,
      accentMeanHue:
        accent.count === 0 ? null : Math.round(accent.hueSum / accent.count),
      keyRedPixels: keyRedPixels(raster),
      ...(flyer === undefined
        ? {}
        : {
            flying: {
              hullBottom: box.bottom,
              groundLine: flyer.groundLine,
              liftGap: flyer.groundLine - box.bottom,
            },
          }),
    };
  });
  const palette = BANDS.map((band) => {
    const found = stat(band.id);
    return {
      role: band.label,
      mean: hexOf(meanOf(found)),
      tones: topTones(found),
      share: round1((found.count / all.opaque) * 100),
      ...(band.id === "magenta"
        ? {
            lit: hexOf(magentaLit),
            meanHue: Math.round(found.hueSum / Math.max(1, found.count)),
          }
        : {}),
    };
  });
  await writeFile(
    path.join(OUT, "palette.json"),
    `${JSON.stringify({ measuredOn: "the eight faction unit masters (the Thrall is left out)", palette, codeDrawn: MARTIAN_PALETTE_V7 }, null, 2)}\n`,
  );
  written.push("palette.json");
  await writeFile(
    path.join(OUT, "readability.json"),
    `${JSON.stringify(
      {
        note: "CIE76 colour difference (about 10 is clear at a glance, 20 and more are different colours); contrast is the WCAG luminance ratio; terrain colours are the mean of the tile rasters.",
        verdict,
        accent: accentPairs,
        limeFallback: fallbackPairs,
        terrain: [
          pair("chrome, lit", chrome, "Grass", grass),
          pair("chrome, lit", chrome, "Forest", forest),
          pair("chrome, lit", chrome, "Mountain rock, mean", rock),
          pair("chrome, lit", chrome, "Mountain rock, light", rockLight),
          pair("chrome, shaded", chromeShade, "Mountain rock, mean", rock),
          pair(
            "chrome, shaded",
            chromeShade,
            "Mountain rock, light",
            rockLight,
          ),
          pair("gunmetal", gunmetal, "Mountain rock, mean", rock),
          pair("gunmetal", gunmetal, "Forest", forest),
          pair("lavender skin", skin, "Grass", grass),
          pair("lavender skin", skin, "Mountain rock, mean", rock),
          pair("chrome, lit", chrome, "Shallow Water", shallow),
          pair("chrome, lit", chrome, "Deep Water", deep),
          pair("gunmetal", gunmetal, "Deep Water", deep),
          pair("magenta, lit", magentaLit, "Mountain rock, mean", rock),
          pair("magenta, lit", magentaLit, "Shallow Water", shallow),
        ],
        units,
      },
      null,
      2,
    )}\n`,
  );
  written.push("readability.json");
  // The swatch sheet.
  const swatch = 56;
  const rowsOf: [string, string[]][] = [
    ...palette.map((entry): [string, string[]] => [
      entry.role,
      [entry.mean, ...entry.tones],
    ]),
    ["Code-drawn markers", Object.values(MARTIAN_PALETTE_V7)],
    ["Player plates", Object.values(RULESET7_PLAYER_COLORS)],
    [
      "Undead violet, Human crimson, Dinosaur orange, Goblin olive",
      ["#a221ee", "#a85df5", "#a8202c", "#fe6d00", "#8a952f"],
    ],
    [
      "Grass, Forest, rock, Shallow, Deep (means)",
      [grass, forest, rock, shallow, deep].map(hexOf),
    ],
  ];
  const sheet = blank(
    330 + 6 * (swatch + GAP),
    rowsOf.length * (swatch + 18 + GAP) + GAP,
    PAPER,
  );
  const labels: Label[] = [];
  for (const [row, [label, colours]] of rowsOf.entries()) {
    const top = GAP + row * (swatch + 18 + GAP);
    labels.push({ text: label, left: 6, top: top + 18, size: 12 });
    for (const [column, hex] of colours.entries()) {
      const left = 330 + column * (swatch + GAP);
      fill(sheet, left, top, swatch, swatch, rgbOf(hex));
      labels.push({
        text: hex,
        left,
        top: top + swatch + 2,
        size: 10,
        fill: "#aab3c0",
      });
    }
  }
  await writeSheet("palette.png", sheet, labels);
  console.log(
    `accent verdict: ${verdict.accent} (hue ${verdict.hue}; against Undead violet ${verdict.againstUndeadViolet.normal}, Coral plate ${verdict.againstCoralPlate.normal}, Violet plate ${verdict.againstVioletPlate.normal})`,
  );
}

/** Pixels in the owner key's colour band (hue 340 to 5, saturated). */
function keyRedPixels(raster: RgbaRaster): number {
  let count = 0;
  for (let index = 0; index < raster.width * raster.height; index += 1) {
    const o = index * 4;
    if ((raster.data[o + 3] ?? 0) < 128) continue;
    const { hue, saturation, value } = rgbToHsv(
      raster.data[o] ?? 0,
      raster.data[o + 1] ?? 0,
      raster.data[o + 2] ?? 0,
    );
    if ((hue >= 340 || hue <= 5) && saturation >= 0.65 && value >= 0.3)
      count += 1;
  }
  return count;
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
// The FOUR scene (four Martian players) is no longer captured: every player
// plays a different faction since bead pulp_wars-w5j.1 (dropped in
// pulp_wars-w5j.3; its earlier captures stay as history).
// ALIENS (bead pulp_wars-b5f.1): the redesigned Grunt, Ray Gunner and Shield
// Projector beside their "before" sprites and the other Martian units.
const SCENES = ["MIXED_A", "MIXED_B", "ALIENS"] as const;
const SCENE = `globalThis.__MARTIAN_SCENE__`;

async function captureAll(baseUrl: string): Promise<void> {
  const chrome = process.env.CHROME_PATH;
  if (chrome === undefined || chrome === "")
    throw new Error("Set CHROME_PATH to a Chrome binary (or --skip-capture)");
  const shots: { name: string; png: Buffer }[] = [];
  const debugPort = 10_800 + (process.pid % 80);
  const profile = await mkdtemp(path.join(tmpdir(), "pulp-wars-martian-"));
  const url = new URL(baseUrl);
  url.searchParams.set("art", "chibi");
  const browser = spawn(
    chrome,
    [
      "--headless=new",
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
      await evaluate(connection, `globalThis.__MS_OLD__ = true`);
      await connection.send("Page.navigate", { url: url.href });
      await waitFor(
        connection,
        `globalThis.__MS_OLD__ !== true && document.readyState === 'complete' && globalThis.__PULP_WARS_APP__ !== undefined`,
      );
      await evaluate(
        connection,
        `(() => { for (const key of Object.keys(localStorage)) if (key.startsWith('pulpWars.save.')) localStorage.removeItem(key); globalThis.__MS_OLD__ = true; })()`,
      );
      await connection.send("Page.reload");
      await waitFor(
        connection,
        `globalThis.__MS_OLD__ !== true && document.readyState === 'complete' && document.querySelector('[data-action="launch"]') !== null && globalThis.__PULP_WARS_APP__?.controller.snapshot().phase === 'EMPTY'`,
      );
      // The fixed 16 x 16 Showcase board: the scenes rewrite a 7 x 7 patch
      // around the capital, whose cell never varies.
      await evaluate(
        connection,
        `(() => { const type = document.querySelector('#v7-map-type'); type.value = 'SHOWCASE'; type.dispatchEvent(new Event('change', { bubbles: true })); document.querySelector('[data-action="launch"]').click(); return true; })()`,
      );
      await waitFor(
        connection,
        `(() => { const s = globalThis.__PULP_WARS_APP__?.controller.snapshot(); const v = s?.view; return s?.phase === 'ACTIVE' && !s.transitioning && !s.ai.active && v?.turnOrder[v.activeSeatIndex] === v?.humanPlayerId && document.querySelector('canvas.board-canvas-v7')?.dataset.artSet === 'CHIBI'; })()`,
        900,
      );
      for (const scene of SCENES) {
        await evaluate(
          connection,
          `(async () => { const module = await import('/scripts/art/martian-direction/scene.ts'); ${SCENE} = module.showMartianSceneV7(globalThis.__PULP_WARS_APP__.controller.snapshot().view, ${JSON.stringify({ kind: scene, ...(scene === "ALIENS" ? { before: beforeUrls } : {}) })}); return true; })()`,
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
          const name = `scene-${scene.toLowerCase().replace("_", "-")}-${viewport.name}-zoom-${step}.png`;
          shots.push({ name, png: await settledScreenshot(connection) });
          console.log(`captured ${name}`);
        }
        await evaluate(
          connection,
          `(() => { ${SCENE}.host.destroy(); document.querySelector('[data-chibi-review-scene]')?.remove(); delete ${SCENE}; return true; })()`,
        );
      }
    }
    connection.close();
  } finally {
    // Written after the browser is done: a file written under the project
    // while the page is open makes the dev server reload it.
    for (const shot of shots) {
      await writeFile(path.join(OUT, shot.name), shot.png);
      written.push(shot.name);
    }
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

// ------------------------------------------------- the three aliens

/**
 * Bead pulp_wars-b5f.1: the Grunt, the Ray Gunner and the Shield Projector
 * were one alien with three tools. The recipes they were accepted from
 * before the redesign; each "before" sprite is that recipe's recorded
 * candidate through the accent step, i.e. the old master byte for byte.
 */
const ALIENS = [
  {
    name: "grunt",
    title: "Grunt",
    role: "FIGHTER",
    before: "grunt-a",
    portraitBefore: "portrait-grunt-b-edit",
  },
  {
    name: "ray-gunner",
    title: "Ray Gunner",
    role: "MARKSMAN",
    before: "ray-gunner-b",
    portraitBefore: "portrait-ray-gunner-b",
  },
  {
    name: "shield-projector",
    title: "Shield Projector",
    role: "GUARD",
    before: "shield-projector-a",
    portraitBefore: "portrait-shield-projector-b",
  },
] as const;
/** The other Martian units the trio is seen beside. */
const ALIEN_NEIGHBOURS = [
  "saucer",
  "brain",
  "tripod",
  "mothership",
  "colossus",
  "thrall",
] as const;

async function recordedCandidate(recipeId: string): Promise<RgbaRaster> {
  const batch = "direction-martian";
  const records = await loadRecords(productionLayout(ROOT, batch), batch);
  const recipe = records.recipes[recipeId];
  if (recipe?.rawSheet === undefined || recipe.candidateSize === undefined)
    throw new Error(`${recipeId}: no recorded raw sheet`);
  const candidate = recipe.review?.candidate ?? 0;
  const sheet = await readRaster(path.join(ROOT, recipe.rawSheet));
  return accentRaster(
    cropRaster(sheet, {
      ...candidateCell(
        candidate,
        recipe.candidateCount ?? 1,
        recipe.candidateSize,
      ),
      ...recipe.candidateSize,
    }),
    SPEC,
  ).raster;
}

interface AlienPair {
  readonly name: string;
  readonly title: string;
  readonly role: string;
  readonly before: RgbaRaster;
  readonly after: RgbaRaster;
  readonly portraitBefore: RgbaRaster;
  readonly portraitAfter: RgbaRaster;
}

async function alienPairs(): Promise<AlienPair[]> {
  return Promise.all(
    ALIENS.map(async (alien) => ({
      name: alien.name,
      title: alien.title,
      role: alien.role,
      before: await recordedCandidate(alien.before),
      after: await readRaster(
        unitFile(`chibi-direction-martian-${alien.name}`),
      ),
      portraitBefore: await recordedCandidate(alien.portraitBefore),
      portraitAfter: await readRaster(
        chibi("portraits", `chibi-direction-portrait-martian-${alien.name}`),
      ),
    })),
  );
}

/** Rows "before" and "after": the trio, then the other Martian units. */
async function aliensSheet(
  pairs: readonly AlienPair[],
  scale: number,
  name: string,
): Promise<void> {
  const ground = (await grounds()).grass as Ground;
  const neighbours = await Promise.all(
    ALIEN_NEIGHBOURS.map(async (unit) => {
      const id = `chibi-direction-martian-${unit}`;
      return { id, raster: await readRaster(unitFile(id)) };
    }),
  );
  const labelW = scale === 1 ? 64 : 110;
  const columns = pairs.length + neighbours.length;
  const sheet = blank(
    labelW + columns * (CELL_W * scale + GAP) + GAP,
    LABEL_H + 2 * (CELL_H * scale + GAP) + GAP,
    PAPER,
  );
  const labels: Label[] = [
    ...pairs.map((pair) => pair.title),
    ...ALIEN_NEIGHBOURS.map(
      (unit) => (UNITS.find((row) => row[1] === unit)?.[2] ?? unit) as string,
    ),
  ].map((text, column) => ({
    text: scale === 1 ? (text.split(" ")[0] ?? text) : text,
    left: labelW + column * (CELL_W * scale + GAP),
    top: 4,
    size: scale === 1 ? 9 : 14,
  }));
  for (const [row, title] of ["before", "after"].entries()) {
    const top = LABEL_H + row * (CELL_H * scale + GAP);
    labels.push({
      text: title,
      left: 6,
      top: top + 6,
      size: scale === 1 ? 10 : 14,
    });
    const trio = pairs.map((pair) => (row === 0 ? pair.before : pair.after));
    const cells = [
      ...trio.map((sprite) => boardCell(ground, sprite, scale)),
      ...neighbours.map((unit) =>
        boardCell(ground, unit.raster, scale, flyerShadow(unit.id)),
      ),
    ];
    for (const [column, cell] of cells.entries())
      blit(sheet, cell, labelW + column * (CELL_W * scale + GAP), top);
  }
  await writeSheet(name, sheet, labels);
}

/** The opaque outline only (alpha >= 128), the way a silhouette reads. */
function silhouette(raster: RgbaRaster, rgb: Rgb): RgbaRaster {
  const data = new Uint8Array(raster.data.length);
  for (let index = 0; index < raster.width * raster.height; index += 1)
    if ((raster.data[index * 4 + 3] ?? 0) >= 128)
      data.set([rgb[0], rgb[1], rgb[2], 255], index * 4);
  return { width: raster.width, height: raster.height, data };
}

/** The trio's silhouettes before and after, and each pair overlaid. */
async function aliensSilhouettesSheet(
  pairs: readonly AlienPair[],
): Promise<void> {
  const scale = 4;
  const cellW = 60 * scale;
  const cellH = 84 * scale;
  const labelW = 110;
  const sheet = blank(
    labelW + 4 * (cellW + GAP) + GAP,
    LABEL_H + 2 * (cellH + GAP) + GAP,
    PAPER,
  );
  const labels: Label[] = [
    ...pairs.map((pair) => pair.title),
    "all three overlaid",
  ].map((text, column) => ({
    text,
    left: labelW + column * (cellW + GAP),
    top: 4,
  }));
  const tints: readonly Rgb[] = [
    [240, 200, 80],
    [90, 200, 240],
    [240, 110, 200],
  ];
  for (const [row, title] of ["before", "after"].entries()) {
    const top = LABEL_H + row * (cellH + GAP);
    labels.push({ text: title, left: 6, top: top + 6 });
    for (let column = 0; column < 4; column += 1)
      fill(sheet, labelW + column * (cellW + GAP), top, cellW, cellH, LIGHT);
    for (const [column, pair] of pairs.entries()) {
      const sprite = row === 0 ? pair.before : pair.after;
      const left = labelW + column * (cellW + GAP) + 2 * scale;
      blit(
        sheet,
        silhouette(sprite, [22, 24, 30]),
        left,
        top + 2 * scale,
        scale,
      );
      blit(
        sheet,
        silhouette(sprite, tints[column] ?? LIGHT),
        labelW + 3 * (cellW + GAP) + 2 * scale,
        top + 2 * scale,
        scale,
        0.45,
      );
    }
  }
  await writeSheet("aliens-silhouettes-x4.png", sheet, labels);
}

async function aliensPortraitsSheet(
  pairs: readonly AlienPair[],
): Promise<void> {
  const scale = 4;
  const cell = 52 * scale;
  const labelW = 110;
  const sheet = blank(
    labelW + pairs.length * (cell + GAP) + GAP,
    LABEL_H + 2 * (cell + GAP) + GAP,
    PAPER,
  );
  const labels: Label[] = pairs.map((pair, column) => ({
    text: pair.title,
    left: labelW + column * (cell + GAP),
    top: 4,
  }));
  for (const [row, title] of ["before", "after"].entries()) {
    const top = LABEL_H + row * (cell + GAP);
    labels.push({ text: title, left: 6, top: top + 6 });
    for (const [column, pair] of pairs.entries()) {
      const left = labelW + column * (cell + GAP);
      fill(sheet, left, top, cell, cell, [36, 40, 48]);
      blit(
        sheet,
        row === 0 ? pair.portraitBefore : pair.portraitAfter,
        left + 2 * scale,
        top + 2 * scale,
        scale,
      );
    }
  }
  await writeSheet("aliens-portraits-x4.png", sheet, labels);
}

const opaqueCount = (raster: RgbaRaster): number => {
  let count = 0;
  for (let index = 0; index < raster.width * raster.height; index += 1)
    if ((raster.data[index * 4 + 3] ?? 0) >= 128) count += 1;
  return count;
};

/**
 * Intersection over union of two outlines on the same canvas and anchor
 * (1 is the same silhouette, 0 none in common).
 */
function outlineOverlap(left: RgbaRaster, right: RgbaRaster): number {
  let both = 0;
  let either = 0;
  for (let index = 0; index < left.width * left.height; index += 1) {
    const a = (left.data[index * 4 + 3] ?? 0) >= 128;
    const b = (right.data[index * 4 + 3] ?? 0) >= 128;
    if (a && b) both += 1;
    if (a || b) either += 1;
  }
  return either === 0 ? 0 : Math.round((both / either) * 1000) / 1000;
}

function alienStats(raster: RgbaRaster): Record<string, unknown> {
  const box = bounds(raster);
  return {
    bounds: { width: box.width, height: box.height },
    opaquePixels: opaqueCount(raster),
    accentPixels: accentRaster(raster, SPEC).accentPixels,
  };
}

async function aliensJson(pairs: readonly AlienPair[]): Promise<void> {
  const overlaps = (pick: (pair: AlienPair) => RgbaRaster) =>
    Object.fromEntries(
      pairs.flatMap((first, index) =>
        pairs
          .slice(index + 1)
          .map((second) => [
            `${first.name}/${second.name}`,
            outlineOverlap(pick(first), pick(second)),
          ]),
      ),
    );
  const report = {
    bead: "pulp_wars-b5f.1",
    note: "Outline overlap is the intersection over union of the opaque pixels (alpha >= 128) of two sprites on their shared 56 x 80 canvas and anchor: lower means more different silhouettes.",
    units: Object.fromEntries(
      pairs.map((pair) => [
        pair.name,
        {
          role: pair.role,
          beforeRecipe: ALIENS.find((alien) => alien.name === pair.name)
            ?.before,
          before: alienStats(pair.before),
          after: alienStats(pair.after),
          beforeToAfterOverlap: outlineOverlap(pair.before, pair.after),
        },
      ]),
    ),
    outlineOverlap: {
      before: overlaps((pair) => pair.before),
      after: overlaps((pair) => pair.after),
    },
  };
  await writeFile(
    path.join(OUT, "aliens.json"),
    `${JSON.stringify(report, null, 2)}\n`,
  );
  written.push("aliens.json");
  console.log("wrote aliens.json");
}

async function encodeDataUrl(raster: RgbaRaster): Promise<string> {
  const png = await sharp(Buffer.from(raster.data), {
    raw: { width: raster.width, height: raster.height, channels: 4 },
  })
    .png()
    .toBuffer();
  return `data:image/png;base64,${png.toString("base64")}`;
}

/** The "before" trio for the ALIENS scene, by role, as data URLs. */
let beforeUrls: Record<string, string> = {};

async function aliensEvidence(): Promise<void> {
  const pairs = await alienPairs();
  await aliensSheet(pairs, 4, "aliens-before-after-x4.png");
  await aliensSheet(pairs, 1, "aliens-before-after-1x.png");
  const native = sharp(path.join(OUT, "aliens-before-after-1x.png"));
  const { width = 0, height = 0 } = await native.metadata();
  await native
    .resize(Math.round(width * 0.75), Math.round(height * 0.75), {
      kernel: "lanczos3",
    })
    .png({ compressionLevel: 9 })
    .toFile(path.join(OUT, "aliens-before-after-zoom-0.75.png"));
  written.push("aliens-before-after-zoom-0.75.png");
  await aliensSilhouettesSheet(pairs);
  await aliensPortraitsSheet(pairs);
  await aliensJson(pairs);
  beforeUrls = Object.fromEntries(
    await Promise.all(
      pairs.map(
        async (pair) => [pair.role, await encodeDataUrl(pair.before)] as const,
      ),
    ),
  );
}

async function main(): Promise<void> {
  await mkdir(OUT, { recursive: true });
  await aliensEvidence();
  await rosterSheet(4, "roster-x4.png");
  await rosterSheet(1, "roster-1x.png");
  // The 1:1 sheet at zoom step 0.75, resampled as the board does.
  const native = sharp(path.join(OUT, "roster-1x.png"));
  const { width = 0, height = 0 } = await native.metadata();
  await native
    .resize(Math.round(width * 0.75), Math.round(height * 0.75), {
      kernel: "lanczos3",
    })
    .png({ compressionLevel: 9 })
    .toFile(path.join(OUT, "roster-zoom-0.75.png"));
  written.push("roster-zoom-0.75.png");
  await terrainSheet();
  await portraitsSheet();
  await iconsSheet();
  await effectsSheet();
  await citiesSheet();
  await paletteAndReadability();
  if (!process.argv.includes("--skip-capture")) {
    const port = Number.parseInt(option("--port") ?? "6509", 10);
    const given = option("--url");
    const server = given === undefined ? await startDevServer(port) : undefined;
    try {
      await captureAll(given ?? `http://localhost:${port}/`);
    } finally {
      if (server !== undefined) stopDevServer(server);
    }
  }
  await writeFile(
    path.join(OUT, "index.json"),
    `${JSON.stringify(
      {
        bead: "pulp_wars-t6s.6",
        batch: "direction-martian",
        command: "npm run art:chibi-martian-direction-review",
        note: "The scene-* captures draw the Martian rasters under a stand-in faction (scripts/art/martian-direction/scene.ts): the faction is not in the engine yet.",
        files: [...new Set(written)].sort(),
      },
      null,
      2,
    )}\n`,
  );
  console.log(`wrote index.json (${written.length} files)`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "review failed");
  process.exitCode = 1;
});
