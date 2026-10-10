/**
 * Review evidence of the Ice Folk production art (bead pulp_wars-7g3.5,
 * batch `direction-ice-folk`, docs/art/factions/ICE_FOLK.md).
 *
 *   npm run art:chibi-ice-folk-direction-review
 *   npm run art:chibi-ice-folk-direction-review -- --skip-capture
 *   npm run art:chibi-ice-folk-direction-review -- --port 6513
 *   npm run art:chibi-ice-folk-direction-review -- --copy-to <dir>
 *
 * Writes art/pixellab/reviews/chibi-batch-direction-ice-folk/:
 *
 * - `study-options-{x3,1x}.png`, `study.json`: the direction study (fur and
 *   accent options of the Yeti, the Ice Witch and the Mammoth);
 * - `roster-{x4,1x}.png`, `roster-zoom-0.75.png`: the eight units on Grass,
 *   Mountain rock, Snow and snowy rock, beside the Human, Undead, Goblin,
 *   Dinosaur and Martian unit of the role;
 * - `terrain-x2.png`: every unit on Grass, Forest, Mountain, Shallow and
 *   Deep Water, and on the Snow overlay over Grass, Forest and Mountain;
 * - `portraits-x4.png`, `icons-x4.png`, `effects-x3.png`,
 *   `shatter-frames-x3.png`, `cities-x3.png`, `markers-x3.png`;
 * - `frozen-sea-icons.png` (bead pulp_wars-5ti.10): the Freeze icon and the
 *   five Naval technology icons on the interface's cream plate and on the
 *   technology card's tone, at x4, 48, 24 and 18 px, beside the faction's
 *   other ice icons and the Naval icons of the other factions
 *   (`-- --frozen-sea-icons-only` writes this sheet alone);
 * - `snow-tiles-x2.png` (the overlay's edge sets and seams) and
 *   `snow-board-zoom-{1,0.75}.png` (a board mock: Snow over an Ice Folk
 *   city's territory with Roads, Forest and Mountain, and a Witch's
 *   Blizzard over enemy land);
 * - `palette.{png,json}` and `readability.json`, measured on the masters;
 * - `scene-{mixed-a,mixed-b}-{desktop,phone}-zoom-{1,0.75}.png`: the mixed
 *   scenes of scripts/art/ice-folk-direction/scene.ts drawn by the real
 *   board host with the default look (the four-Ice-Folk scene is no longer
 *   captured since bead pulp_wars-w5j.3);
 * - `index.json`.
 *
 * The faction is not in the renderer yet: the scenes register the Ice Folk
 * rasters under a stand-in faction, and the Snow overlay, the Blizzard and
 * the Chill markers are drawn here from the pure functions of
 * src/assets/chibi-direction-ice-folk-presentation.ts on the review sheets
 * and the board mock. Captures start Vite on port 6513 unless `--port` says
 * otherwise and need CHROME_PATH.
 */
import { spawn, type ChildProcess } from "node:child_process";
import { copyFile, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import sharp from "sharp";
import {
  ICE_FOLK_BLIZZARD_V7,
  ICE_FOLK_FROZEN_MARKER_V7,
  ICE_FOLK_FLAG_ANCHORS_V7,
  ICE_FOLK_PALETTE_V7,
  iceFolkBlizzardFlakesV7,
  iceFolkFrozenCasingV7,
  iceFolkSnowCapsV7,
  iceFolkSnowTileV7,
  iceFolkSnowVariantV7,
  type IceFolkSnowEdgesV7,
} from "../../src/assets/chibi-direction-ice-folk-presentation";
import { RULESET7_PLAYER_COLORS } from "../../src/render/canvas/owner-recolour-v7";
import {
  LIVE_DIRECTION_V7,
  terrainPivotV7,
  tonePixelsV7,
} from "../../src/render/canvas/visual-direction-v7";
import { ACCENT_PRESETS, isAccentColour } from "./chibi/accent";
import { rgbToHsv, type RgbaRaster } from "./chibi/owner-mask";
import { readRaster } from "./chibi/pipeline";
import {
  colourPair,
  hexOf,
  rgbOf,
  worstDeltaE,
  type ColourPair,
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
import { writeStudy } from "./ice-folk-direction/study";

const ROOT = process.cwd();
const OUT = path.join(
  ROOT,
  "art/pixellab/reviews/chibi-batch-direction-ice-folk",
);
const TILE = 80;

function option(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index < 0 ? undefined : process.argv[index + 1];
}

/** Role, Ice Folk unit, title, and the unit of the role in the other five factions. */
const UNITS = [
  [
    "FIGHTER",
    "yeti",
    "Yeti",
    "fighter",
    "skeleton",
    "goblin",
    "caveman",
    "grunt",
  ],
  [
    "RAIDER",
    "sled",
    "Sled",
    "raider",
    "ghoul",
    "wolf-rider",
    "raptor",
    "saucer",
  ],
  [
    "MARKSMAN",
    "snow-hunter",
    "Snow Hunter",
    "marksman",
    "banshee",
    "bomb-chucker",
    "spitter",
    "ray-gunner",
  ],
  [
    "GUARD",
    "mammoth",
    "Mammoth",
    "guard",
    "zombie",
    "orc-brute",
    "ankylosaurus",
    "shield-projector",
  ],
  [
    "CAPTAIN",
    "ice-witch",
    "Ice Witch",
    "captain",
    "necromancer",
    "orc-warboss",
    "shaman",
    "brain",
  ],
  [
    "CATAPULT",
    "boulder-yeti",
    "Boulder Yeti",
    "catapult",
    "lich",
    "rocket-cart",
    "triceratops",
    "tripod",
  ],
  [
    "KNIGHT",
    "sabretooth",
    "Sabretooth",
    "knight",
    "vampire",
    "scrap-buggy",
    "t-rex",
    "mothership",
  ],
  [
    "JUGGERNAUT",
    "frost-giant",
    "Frost Giant",
    "juggernaut",
    "abomination",
    "troll",
    "brontosaurus",
    "colossus",
  ],
] as const;
/** Plate widths of the live look by unit canvas (VISUAL_DIRECTION_2026-10.md). */
const PLATE = { 56: 52, 72: 57, 88: 68 } as const;
const ICONS = [
  ["action-throw-bolas", "Bolas"],
  ["action-cold-snap", "Cold Snap"],
  ["action-shatter", "Shatter"],
  ["action-sweep", "Sweep"],
  ["action-rockfall", "Rockfall"],
  ["action-prowl", "Prowl"],
  ["tech-deep-winter", "Deep Winter"],
  ["tech-brittle", "Brittle"],
  ["status-chilled", "Chilled"],
  ["status-frozen", "Frozen"],
] as const;
/** The frozen sea (bead pulp_wars-5ti.10), reviewed on a sheet of its own. */
const FROZEN_SEA_ICONS = [
  ["action-freeze", "Freeze"],
  ["tech-rime", "Rime"],
  ["tech-pack-ice", "Pack Ice"],
  ["tech-icebound", "Icebound"],
  ["tech-black-ice", "Black Ice"],
  ["tech-glacier", "Glacier"],
] as const;
const EFFECTS = [
  ["shatter", "Shatter burst"],
  ["shatter-shards", "Shatter shards"],
  ["cold-snap", "Cold Snap ring"],
  ["bolas", "Bolas"],
  ["frost-hit", "Frost on hit"],
] as const;

const chibi = (folder: string, id: string): string =>
  path.join(ROOT, "public/assets/chibi", folder, `${id}.png`);
const unitFile = (id: string): string => chibi("units", id);
const iceUnit = (name: string): Promise<RgbaRaster> =>
  readRaster(unitFile(`chibi-direction-ice-folk-${name}`));
const terrainFile = (name: string): string => chibi("terrain", name);

const written: string[] = [];
async function sheet(
  name: string,
  canvas: Canvas,
  labels: readonly Label[],
): Promise<void> {
  await writeSheet(path.join(OUT, name), canvas, labels);
  written.push(name);
  console.log(`wrote ${name}`);
}

const PAPER: Rgb = [30, 33, 40];
const FRAME: Rgb = [52, 58, 66];
const LIGHT: Rgb = [244, 241, 232];
const GAP = 6;
const LABEL_H = 22;
const CELL_W = 96;
const CELL_H = 112;

// ------------------------------------------------------------ terrain and snow

const NO_EDGES: IceFolkSnowEdgesV7 = {
  north: false,
  east: false,
  south: false,
  west: false,
};

function toCanvas(
  raster:
    RgbaRaster | { width: number; height: number; data: Uint8ClampedArray },
): Canvas {
  return {
    width: raster.width,
    height: raster.height,
    data: new Uint8Array(raster.data),
  };
}

/** A terrain raster toned as the live look tones terrain. */
function toned(
  raster: RgbaRaster,
  subject: "TERRAIN:GRASS" | "TERRAIN:MOUNTAIN" | null,
): Canvas {
  const pixels = new Uint8ClampedArray(raster.data);
  const out = tonePixelsV7(
    pixels,
    raster.width,
    raster.height,
    LIVE_DIRECTION_V7.terrain,
    1,
    subject === null ? undefined : terrainPivotV7(subject),
  );
  return {
    width: raster.width,
    height: raster.height,
    data: new Uint8Array(out),
  };
}

interface Ground {
  readonly label: string;
  /** Layers drawn bottom-aligned in the cell, in order. */
  readonly layers: readonly (RgbaRaster | Canvas)[];
}

async function grounds(): Promise<Record<string, Ground>> {
  const load = (name: string): Promise<RgbaRaster> =>
    readRaster(terrainFile(name));
  const grass = await load("chibi-grass-1");
  const rock = await load("chibi-mountain-ground-1");
  const forestBody = await load("chibi-forest-1.body");
  const mountainBody = await load("chibi-mountain-1.body");
  const snow = toCanvas(iceFolkSnowTileV7(NO_EDGES, 0));
  return {
    grass: { label: "Grass", layers: [grass] },
    forest: { label: "Forest", layers: [await load("chibi-forest-1")] },
    mountain: { label: "Mountain", layers: [await load("chibi-mountain-1")] },
    rock: { label: "Mountain rock", layers: [rock] },
    shallow: {
      label: "Shallow Water",
      layers: [await load("chibi-shallow-water-1")],
    },
    deep: { label: "Deep Water", layers: [await load("chibi-deep-water-1")] },
    snowGrass: { label: "Snow on Grass", layers: [grass, snow] },
    snowRock: { label: "Snow on rock", layers: [rock, snow] },
    snowForest: {
      label: "Snow on Forest",
      layers: [
        grass,
        snow,
        forestBody,
        toCanvas(iceFolkSnowCapsV7(forestBody)),
      ],
    },
    snowMountain: {
      label: "Snow on Mountain",
      layers: [
        rock,
        snow,
        mountainBody,
        toCanvas(iceFolkSnowCapsV7(mountainBody)),
      ],
    },
  };
}

/** A board cell: the ground bottom-aligned, then the piece bottom-centred. */
function boardCell(
  ground: Ground,
  piece: RgbaRaster | Canvas | null,
  scale: number,
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
  if (piece !== null)
    blit(
      out,
      piece,
      tileLeft + ((TILE - piece.width) / 2) * scale,
      bottom - piece.height * scale,
      scale,
    );
  return out;
}

// ------------------------------------------------------------ sheets

async function rosterSheet(scale: number, name: string): Promise<void> {
  const ground = await grounds();
  const columns = [
    "Ice Folk",
    "on rock",
    "on Snow",
    "on snowy rock",
    "Human",
    "Undead",
    "Goblin",
    "Dinosaur",
    "Martian",
  ];
  const labelW = 150;
  const out = blank(
    labelW + columns.length * (CELL_W * scale + GAP) + GAP,
    LABEL_H + UNITS.length * (CELL_H * scale + GAP) + GAP,
    PAPER,
  );
  const labels: Label[] = columns.map((text, column) => ({
    text,
    left: labelW + column * (CELL_W * scale + GAP),
    top: 4,
    size: scale === 1 ? 11 : 14,
  }));
  for (const [row, unit] of UNITS.entries()) {
    const [role, ice, title, human, undead, goblin, dinosaur, martian] = unit;
    const top = LABEL_H + row * (CELL_H * scale + GAP);
    labels.push(
      { text: title, left: 6, top: top + 6 },
      { text: role, left: 6, top: top + 26, size: 11, fill: "#aab3c0" },
    );
    const sprite = await iceUnit(ice);
    const others = [
      unitFile(`chibi-direction-${human}`),
      unitFile(`chibi-direction-undead-${undead}`),
      unitFile(`chibi-direction-goblin-${goblin}`),
      unitFile(`chibi-direction-dinosaur-${dinosaur}`),
      unitFile(`chibi-direction-martian-${martian}`),
    ];
    const cells = [
      boardCell(ground.grass as Ground, sprite, scale),
      boardCell(ground.rock as Ground, sprite, scale),
      boardCell(ground.snowGrass as Ground, sprite, scale),
      boardCell(ground.snowRock as Ground, sprite, scale),
      ...(await Promise.all(
        others.map(async (file) =>
          boardCell(ground.grass as Ground, await readRaster(file), scale),
        ),
      )),
    ];
    for (const [column, cell] of cells.entries())
      blit(out, cell, labelW + column * (CELL_W * scale + GAP), top);
  }
  await sheet(name, out, labels);
}

async function terrainSheet(): Promise<void> {
  const scale = 2;
  const ground = await grounds();
  const keys = [
    "grass",
    "forest",
    "mountain",
    "shallow",
    "deep",
    "snowGrass",
    "snowForest",
    "snowMountain",
  ] as const;
  const labelW = 130;
  const out = blank(
    labelW + keys.length * (CELL_W * scale + GAP) + GAP,
    LABEL_H + (UNITS.length + 1) * (CELL_H * scale + GAP) + GAP,
    PAPER,
  );
  const labels: Label[] = keys.map((key, column) => ({
    text: (ground[key] as Ground).label,
    left: labelW + column * (CELL_W * scale + GAP),
    top: 4,
  }));
  const rows: [string, RgbaRaster | null][] = [["(bare)", null]];
  for (const unit of UNITS) rows.push([unit[2], await iceUnit(unit[1])]);
  for (const [row, [title, sprite]] of rows.entries()) {
    const top = LABEL_H + row * (CELL_H * scale + GAP);
    labels.push({ text: title, left: 6, top: top + 6 });
    for (const [column, key] of keys.entries())
      blit(
        out,
        boardCell(ground[key] as Ground, sprite, scale),
        labelW + column * (CELL_W * scale + GAP),
        top,
      );
  }
  await sheet("terrain-x2.png", out, labels);
}

async function portraitsSheet(): Promise<void> {
  const scale = 4;
  const cell = 52;
  const labelW = 150;
  const columns = ["dock", "page", "map sprite", "Human", "Martian"];
  const widths = [cell, cell, 64, cell, cell];
  const lefts = widths.map(
    (_, index) =>
      labelW +
      widths.slice(0, index).reduce((sum, w) => sum + w * scale + GAP, 0),
  );
  const rowH = cell * scale + GAP;
  const out = blank(
    (lefts.at(-1) ?? 0) + cell * scale + GAP,
    LABEL_H + UNITS.length * rowH + GAP,
    PAPER,
  );
  const labels: Label[] = columns.map((text, column) => ({
    text,
    left: lefts[column] ?? 0,
    top: 4,
  }));
  for (const [row, unit] of UNITS.entries()) {
    const top = LABEL_H + row * rowH;
    labels.push({ text: unit[2], left: 6, top: top + 6 });
    const portrait = await readRaster(
      chibi("portraits", `chibi-direction-portrait-ice-folk-${unit[1]}`),
    );
    const sprite = await iceUnit(unit[1]);
    const human = await readRaster(
      chibi("portraits", `chibi-direction-portrait-${unit[3]}`),
    );
    const martian = await readRaster(
      chibi("portraits", `chibi-direction-portrait-martian-${unit[7]}`),
    );
    const panels: [number, Rgb, RgbaRaster, number][] = [
      [0, [36, 40, 48], portrait, scale],
      [1, LIGHT, portrait, scale],
      [2, rgbOf("#89b75b"), sprite, 2],
      [3, [36, 40, 48], human, scale],
      [4, [36, 40, 48], martian, scale],
    ];
    for (const [column, background, raster, s] of panels) {
      const left = lefts[column] ?? 0;
      const w = (widths[column] ?? cell) * scale;
      fill(out, left, top, w, cell * scale, background);
      blit(
        out,
        raster,
        left + (w - raster.width * s) / 2,
        top + (cell * scale - raster.height * s) / 2,
        s,
      );
    }
  }
  await sheet("portraits-x4.png", out, labels);
}

async function iconsSheet(): Promise<void> {
  const scale = 4;
  const existing = [
    ["chibi-direction-icon-action-beam-down", "Beam Down"],
    ["chibi-direction-icon-status-shield", "Shield"],
    ["chibi-icon-tech-fortification", "Fortification"],
    ["chibi-icon-action-rally", "Rally"],
  ] as const;
  const all = [
    ...ICONS.map(
      ([name, title]) => [`chibi-direction-icon-${name}`, title] as const,
    ),
    ...existing,
  ];
  const cellW = 48 * scale + GAP;
  const out = blank(
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
    fill(out, left, top, 48 * scale, 48 * scale, [36, 40, 48]);
    blit(out, icon, left, top, scale);
    top += 48 * scale + GAP;
    fill(out, left, top, 48 * scale, 48 * scale, LIGHT);
    blit(out, icon, left, top, scale);
    top += 48 * scale + GAP;
    fill(out, left, top, 48 * scale, 48 + 4, [36, 40, 48]);
    blit(out, icon, left + 4, top + 2, 1);
    const small = await sharp(Buffer.from(icon.data), {
      raw: { width: icon.width, height: icon.height, channels: 4 },
    })
      .resize(24, 24, { kernel: "lanczos3" })
      .raw()
      .toBuffer();
    blit(
      out,
      { width: 24, height: 24, data: new Uint8Array(small) },
      left + 64,
      top + 14,
      1,
    );
  }
  labels.push({
    text: "dock panel x4, light page x4, action tile 48 px and HUD 24 px; the four on the right are existing icons",
    left: GAP,
    top: out.height - LABEL_H,
    size: 12,
    fill: "#aab3c0",
  });
  await sheet("icons-x4.png", out, labels);
}

async function effectsSheet(): Promise<void> {
  const scale = 3;
  const ground = await grounds();
  const keys = [
    "grass",
    "forest",
    "rock",
    "shallow",
    "deep",
    "snowGrass",
  ] as const;
  const yeti = await iceUnit("yeti");
  const fighter = await readRaster(unitFile("chibi-direction-fighter"));
  const columns = [
    ...keys.map((key) => (ground[key] as Ground).label),
    "dock panel",
    "on a Yeti",
    "on a Human",
  ];
  const labelW = 150;
  const cell = TILE * scale + GAP;
  const out = blank(
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
      chibi("effects", `chibi-direction-effect-ice-folk-${name}`),
    );
    const centre = (TILE - effect.width) / 2;
    for (const [column, key] of keys.entries()) {
      const tile = blank(TILE * scale, TILE * scale, FRAME);
      for (const layer of (ground[key] as Ground).layers)
        if (layer.height === TILE) blit(tile, layer, 0, 0, scale);
      blit(tile, effect, centre * scale, centre * scale, scale);
      blit(out, tile, labelW + column * cell, top);
    }
    let left = labelW + keys.length * cell;
    fill(out, left, top, TILE * scale, TILE * scale, [36, 40, 48]);
    blit(out, effect, left + centre * scale, top + centre * scale, scale);
    for (const unit of [yeti, fighter]) {
      left += cell;
      const tile = blank(TILE * scale, TILE * scale, FRAME);
      const grass = (ground.grass as Ground).layers[0];
      if (grass !== undefined) blit(tile, grass, 0, 0, scale);
      blit(tile, unit, ((TILE - unit.width) / 2) * scale, 0, scale);
      blit(tile, effect, centre * scale, (centre + 4) * scale, scale);
      blit(out, tile, left, top);
    }
  }
  await sheet("effects-x3.png", out, labels);
}

/** Scales a raster about its centre by nearest neighbour into a new canvas. */
function scaled(
  raster: RgbaRaster | Canvas,
  factor: number,
  opacity = 1,
): Canvas {
  const width = Math.max(1, Math.round(raster.width * factor));
  const height = Math.max(1, Math.round(raster.height * factor));
  const data = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y += 1)
    for (let x = 0; x < width; x += 1) {
      const sx = Math.min(raster.width - 1, Math.floor(x / factor));
      const sy = Math.min(raster.height - 1, Math.floor(y / factor));
      const s = (sy * raster.width + sx) * 4;
      const o = (y * width + x) * 4;
      data[o] = raster.data[s] ?? 0;
      data[o + 1] = raster.data[s + 1] ?? 0;
      data[o + 2] = raster.data[s + 2] ?? 0;
      data[o + 3] = Math.round((raster.data[s + 3] ?? 0) * opacity);
    }
  return { width, height, data };
}

/** Three white crack lines over a sprite's casing (the CRACK step). */
function cracks(sprite: RgbaRaster): Canvas {
  const out = blank(sprite.width, sprite.height, [0, 0, 0]);
  out.data.fill(0);
  const box = opaqueBounds(sprite);
  const lines = [
    [0.5, 0.2, -1, 1, 14],
    [0.45, 0.55, 1, 1, 10],
    [0.55, 0.45, 1, -1, 9],
  ] as const;
  for (const [fx, fy, dx, dy, length] of lines) {
    let x = Math.round(box.left + box.width * fx);
    let y = Math.round(box.top + box.height * fy);
    for (let step = 0; step < length; step += 1) {
      if (x >= 0 && y >= 0 && x < out.width && y < out.height)
        out.data.set([255, 255, 255, 255], (y * out.width + x) * 4);
      y += 1;
      x += step % 2 === 0 ? dx : 0;
      if (step % 4 === 3) x += dy;
    }
  }
  return out;
}

async function shatterFramesSheet(): Promise<void> {
  const scale = 3;
  const ground = await grounds();
  const burst = await readRaster(
    chibi("effects", "chibi-direction-effect-ice-folk-shatter"),
  );
  const shards = await readRaster(
    chibi("effects", "chibi-direction-effect-ice-folk-shatter-shards"),
  );
  const victims = [
    ["Human Fighter", await readRaster(unitFile("chibi-direction-fighter"))],
    [
      "Dinosaur Raptor",
      await readRaster(unitFile("chibi-direction-dinosaur-raptor")),
    ],
  ] as const;
  const frames = [
    "0 ms: hit",
    "70 ms: freeze",
    "180 ms: crack",
    "300 ms: burst",
    "450 ms: burst + shards",
    "700 ms: shards melt",
    "950 ms: gone",
  ];
  const labelW = 150;
  const cell = TILE * scale + GAP;
  const out = blank(
    labelW + frames.length * cell + GAP,
    LABEL_H + victims.length * (CELL_H * scale + GAP) + GAP,
    PAPER,
  );
  const labels: Label[] = frames.map((text, column) => ({
    text,
    left: labelW + column * cell,
    top: 4,
    size: 12,
  }));
  for (const [row, [title, sprite]] of victims.entries()) {
    const top = LABEL_H + row * (CELL_H * scale + GAP);
    labels.push({ text: title, left: 6, top: top + 6, size: 13 });
    const casing = toCanvas(iceFolkFrozenCasingV7(sprite, 1));
    const box = opaqueBounds(sprite);
    const centreY = CELL_H - sprite.height + box.top + box.height / 2;
    for (let frame = 0; frame < frames.length; frame += 1) {
      const cellCanvas = boardCell(
        ground.snowGrass as Ground,
        frame <= 2 ? sprite : null,
        scale,
      );
      const pieceLeft = (CELL_W - sprite.width) / 2;
      const pieceTop = CELL_H - sprite.height;
      if (frame >= 1 && frame <= 2) {
        const m = (casing.width - sprite.width) / 2;
        blit(
          cellCanvas,
          casing,
          (pieceLeft - m) * scale,
          (pieceTop - m) * scale,
          scale,
        );
      }
      if (frame === 2)
        blit(
          cellCanvas,
          cracks(sprite),
          (pieceLeft + 1) * scale,
          pieceTop * scale,
          scale,
        );
      const put = (raster: Canvas, dy = 0): void =>
        blit(
          cellCanvas,
          raster,
          ((CELL_W - raster.width) / 2) * scale,
          (centreY - raster.height / 2 + dy) * scale,
          scale,
        );
      if (frame === 3) put(scaled(burst, 0.9));
      if (frame === 4) {
        put(scaled(burst, 1.25, 0.55));
        put(scaled(shards, 1.15));
      }
      if (frame === 5) put(scaled(shards, 1.55, 0.5), 6);
      blit(out, cellCanvas, labelW + frame * cell, top);
    }
  }
  labels.push({
    text: "ICE_FOLK_SHATTER_TIMELINE_V7: freeze (casing to the top), crack, the burst sprite, the shards falling and fading; no body, no Grave",
    left: 6,
    top: out.height - 18,
    size: 11,
    fill: "#aab3c0",
  });
  await sheet("shatter-frames-x3.png", out, labels);
}

/** A small right-pointing pennant, as the live look draws one on a city. */
function pennant(rgb: Rgb): Canvas {
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

async function citiesSheet(): Promise<void> {
  const scale = 3;
  const ground = await grounds();
  const owners = Object.entries(RULESET7_PLAYER_COLORS);
  const others = [
    ["Human", (level: number) => `chibi-direction-city-${level}`],
    ["Undead", (level: number) => `chibi-direction-undead-city-${level}`],
    ["Dinosaur", (level: number) => `chibi-direction-dinosaur-city-${level}`],
    ["Martian", (level: number) => `chibi-direction-martian-city-${level}`],
  ] as const;
  const columns = [
    "as authored",
    ...owners.map(
      ([name]) => `${name.charAt(0)}${name.slice(1).toLowerCase()} pennant`,
    ),
    "on Snow",
    "garrisoned, Snow",
    ...others.map(([name]) => name),
  ];
  const labelW = 90;
  const cell = CELL_W * scale + GAP;
  const out = blank(
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
  const yeti = await iceUnit("yeti");
  for (const level of [1, 2, 3]) {
    const top = LABEL_H + (level - 1) * (CELL_H * scale + GAP);
    labels.push({ text: `City ${level}`, left: 6, top: top + 6 });
    const id = `chibi-direction-ice-folk-city-${level}`;
    const city = await readRaster(chibi("settlements", id));
    const anchor = ICE_FOLK_FLAG_ANCHORS_V7[id];
    if (anchor === undefined) throw new Error(`${id}: no pennant anchor`);
    const cityCell = (
      under: Ground,
      piece: RgbaRaster,
      flag?: Rgb,
      garrison?: RgbaRaster,
    ): Canvas => {
      const outCell = boardCell(under, piece, scale);
      if (flag !== undefined) {
        const left = ((CELL_W - TILE) / 2 + (TILE - piece.width) / 2) * scale;
        const pieceTop = (CELL_H - piece.height) * scale;
        blit(
          outCell,
          pennant(flag),
          left + anchor.x * scale,
          pieceTop + anchor.y * scale,
          scale,
        );
      }
      if (garrison !== undefined)
        blit(
          outCell,
          scaled(garrison, 0.8),
          ((CELL_W - garrison.width * 0.8) / 2 - 18) * scale,
          (CELL_H - garrison.height * 0.8) * scale,
          scale,
        );
      return outCell;
    };
    const cells: Canvas[] = [
      cityCell(ground.grass as Ground, city),
      ...owners.map(([, colour]) =>
        cityCell(ground.grass as Ground, city, rgbOf(colour)),
      ),
      cityCell(
        ground.snowGrass as Ground,
        city,
        rgbOf(RULESET7_PLAYER_COLORS.TEAL),
      ),
      cityCell(
        ground.snowGrass as Ground,
        city,
        rgbOf(RULESET7_PLAYER_COLORS.CORAL),
        yeti,
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
      blit(out, canvas, labelW + column * cell, top);
  }
  await sheet("cities-x3.png", out, labels);
}

/** An HP bar with the Shatter window: the lowest `threshold` HP tinted. */
function hpBar(hp: number, maxHp: number, threshold: number): Canvas {
  const width = 40;
  const out = blank(width + 2, 6, [16, 20, 28]);
  const filled = Math.round((hp / maxHp) * width);
  const windowPx = Math.round((threshold / maxHp) * width);
  for (let x = 0; x < width; x += 1)
    for (let y = 1; y < 5; y += 1) {
      const colour: Rgb =
        x < Math.min(filled, windowPx)
          ? rgbOf(ICE_FOLK_FROZEN_MARKER_V7.shatterWindow.colour)
          : x < filled
            ? [96, 196, 92]
            : x < windowPx
              ? [40, 70, 96]
              : [52, 56, 64];
      out.data.set(
        [colour[0], colour[1], colour[2], 255],
        (y * out.width + x + 1) * 4,
      );
    }
  for (let y = 1; y < 5; y += 1)
    out.data.set([255, 255, 255, 255], (y * out.width + windowPx + 1) * 4);
  return out;
}

async function markersSheet(): Promise<void> {
  const scale = 3;
  const ground = await grounds();
  const glyph = await readRaster(
    chibi("icons", "chibi-direction-icon-status-chilled"),
  );
  const glyphSmall = await sharp(Buffer.from(glyph.data), {
    raw: { width: 48, height: 48, channels: 4 },
  })
    .resize(16, 16, { kernel: "lanczos3" })
    .raw()
    .toBuffer();
  const glyph16: Canvas = {
    width: 16,
    height: 16,
    data: new Uint8Array(glyphSmall),
  };
  const subjects = [
    ["Human Fighter", "chibi-direction-fighter"],
    ["Undead Skeleton", "chibi-direction-undead-skeleton"],
    ["Goblin", "chibi-direction-goblin-goblin"],
    ["Dinosaur Raptor", "chibi-direction-dinosaur-raptor"],
    ["Martian Saucer", "chibi-direction-martian-saucer"],
    ["Ice Folk Yeti", "chibi-direction-ice-folk-yeti"],
    ["Dinosaur T-Rex", "chibi-direction-dinosaur-t-rex"],
  ] as const;
  const columns = [
    "plain",
    "Frosted",
    "Frozen",
    "Frozen on Snow",
    "HP 10/10, window 3",
    "HP 4/10, window 4",
  ];
  const labelW = 150;
  const cell = CELL_W * scale + GAP;
  const out = blank(
    labelW + columns.length * cell + GAP,
    LABEL_H + subjects.length * (CELL_H * scale + GAP) + GAP,
    PAPER,
  );
  const labels: Label[] = columns.map((text, column) => ({
    text,
    left: labelW + column * cell,
    top: 4,
    size: 12,
  }));
  for (const [row, [title, id]] of subjects.entries()) {
    const top = LABEL_H + row * (CELL_H * scale + GAP);
    labels.push({ text: title, left: 6, top: top + 6, size: 13 });
    const sprite = await readRaster(unitFile(id));
    const left0 = (CELL_W - sprite.width) / 2;
    const top0 = CELL_H - sprite.height;
    const rime = toCanvas(
      iceFolkSnowCapsV7(sprite, {
        depth: ICE_FOLK_FROZEN_MARKER_V7.rime.depth,
        colour: ICE_FOLK_PALETTE_V7.icePale,
        alpha: ICE_FOLK_FROZEN_MARKER_V7.rime.alpha,
      }),
    );
    const casing = toCanvas(iceFolkFrozenCasingV7(sprite));
    const m = (casing.width - sprite.width) / 2;
    const variants: [Ground, boolean, boolean, Canvas | null][] = [
      [ground.grass as Ground, false, false, null],
      [ground.grass as Ground, true, false, null],
      [ground.grass as Ground, false, true, null],
      [ground.snowGrass as Ground, false, true, null],
      [ground.grass as Ground, true, false, hpBar(10, 10, 3)],
      [ground.grass as Ground, false, true, hpBar(4, 10, 4)],
    ];
    for (const [column, [under, frosted, frozen, bar]] of variants.entries()) {
      const c = boardCell(under, sprite, scale);
      if (frosted) {
        blit(c, rime, left0 * scale, top0 * scale, scale);
        blit(
          c,
          glyph16,
          (CELL_W - 20) * scale,
          (CELL_H - TILE + 4) * scale,
          scale,
        );
      }
      if (frozen)
        blit(c, casing, (left0 - m) * scale, (top0 - m) * scale, scale);
      if (bar !== null)
        blit(
          c,
          bar,
          ((CELL_W - bar.width) / 2) * scale,
          (CELL_H - 8) * scale,
          scale,
        );
      blit(out, c, labelW + column * cell, top);
    }
  }
  await sheet("markers-x3.png", out, labels);
}

// ------------------------------------------------------------ the Snow overlay

const EDGE_SETS: readonly [string, IceFolkSnowEdgesV7][] = [
  ["none", NO_EDGES],
  ["N", { ...NO_EDGES, north: true }],
  ["E", { ...NO_EDGES, east: true }],
  ["S", { ...NO_EDGES, south: true }],
  ["W", { ...NO_EDGES, west: true }],
  ["N E", { ...NO_EDGES, north: true, east: true }],
  ["S W", { ...NO_EDGES, south: true, west: true }],
  ["all", { north: true, east: true, south: true, west: true }],
];

async function snowTilesSheet(): Promise<void> {
  const scale = 2;
  const grass = await readRaster(terrainFile("chibi-grass-1"));
  const rock = await readRaster(terrainFile("chibi-mountain-ground-1"));
  const labelW = 120;
  const cell = TILE * scale + GAP;
  const out = blank(
    labelW + EDGE_SETS.length * cell + GAP,
    LABEL_H + 2 * cell + LABEL_H + 3 * TILE * scale + GAP * 3,
    PAPER,
  );
  const labels: Label[] = EDGE_SETS.map(([text], column) => ({
    text: `cut: ${text}`,
    left: labelW + column * cell,
    top: 4,
    size: 12,
  }));
  for (const [row, [title, base]] of (
    [
      ["on Grass", grass],
      ["on rock", rock],
    ] as const
  ).entries()) {
    labels.push({
      text: title,
      left: 6,
      top: LABEL_H + row * cell + 6,
      size: 13,
    });
    for (const [column, [, edges]] of EDGE_SETS.entries()) {
      const tile = blank(TILE, TILE, FRAME);
      blit(tile, base, 0, 0);
      blit(tile, iceFolkSnowTileV7(edges, column % 4), 0, 0);
      blit(out, tile, labelW + column * cell, LABEL_H + row * cell, scale);
    }
  }
  // Seams: a 6 x 3 field of Snow tiles of every variant, edges cut only
  // where the field ends, on Grass.
  const top = LABEL_H + 2 * cell + LABEL_H;
  labels.push({
    text: "a 6 x 3 Snow field (variants by cell), cut only at its edge: no seam between tiles",
    left: labelW,
    top: top - LABEL_H + 4,
    size: 12,
  });
  const field = blank(TILE * 6, TILE * 3, FRAME);
  for (let y = 0; y < 3; y += 1)
    for (let x = 0; x < 6; x += 1) {
      blit(field, grass, x * TILE, y * TILE);
      blit(
        field,
        iceFolkSnowTileV7(
          { north: y === 0, south: y === 2, west: x === 0, east: x === 5 },
          iceFolkSnowVariantV7({ x, y }),
        ),
        x * TILE,
        y * TILE,
      );
    }
  blit(out, field, labelW, top, scale);
  await sheet("snow-tiles-x2.png", out, labels);
}

/**
 * The board mock: a 9 x 6 patch drawn with the toned terrain of the live
 * look, Roads, the Snow overlay over an Ice Folk city's territory (and a
 * Deep Winter ring), a Witch's Blizzard over an enemy's land, cities with
 * pennants and units on plain seat plates. Plates, borders and Roads are
 * approximations of the live look; the overlays are the presentation
 * functions' output.
 */
async function snowBoardSheet(): Promise<void> {
  const load = (name: string): Promise<RgbaRaster> =>
    readRaster(terrainFile(name));
  const grass = toned(await load("chibi-grass-1"), "TERRAIN:GRASS");
  const grass2 = toned(await load("chibi-grass-2"), "TERRAIN:GRASS");
  const rock = toned(await load("chibi-mountain-ground-1"), "TERRAIN:MOUNTAIN");
  const forestBody = toned(await load("chibi-forest-1.body"), "TERRAIN:GRASS");
  const mountainBody = toned(
    await load("chibi-mountain-1.body"),
    "TERRAIN:MOUNTAIN",
  );
  const shallow = toned(await load("chibi-shallow-water-1"), null);
  const deep = toned(await load("chibi-deep-water-1"), null);
  // Rows: t terrain letter, territory owner (A Ice Folk Teal, B Human Coral,
  // - none), snow flag (s), road (r).
  const MAP = [
    ["g-", "g-", "fA s", "mA s", "mA s", "g-", "gB", "gB", "fB"],
    ["g- s", "fA s", "gA s r", "gA s r", "mA s", "gB", "gB r", "gB r", "gB"],
    ["g- s", "gA s", "gA s r", "gA s r", "gA s", "gB", "gB r", "fB", "gB"],
    ["f- s", "gA s", "mA s", "gA s r", "gA s r", "gB r", "gB r", "gB", "s-"],
    ["g-", "g- s", "g- s", "g- s", "g-", "g-", "fB", "g-", "s-"],
    ["s-", "s-", "d-", "s-", "g-", "g-", "g-", "s-", "d-"],
  ];
  const W = MAP[0]?.length ?? 0;
  const H = MAP.length;
  const at = (x: number, y: number): string => MAP[y]?.[x] ?? "";
  const isSnow = (x: number, y: number): boolean =>
    at(x, y).includes(" s") &&
    !at(x, y).startsWith("s") &&
    !at(x, y).startsWith("d");
  const isRoad = (x: number, y: number): boolean =>
    at(x, y).includes(" r") || at(x, y).endsWith("r");
  const owner = (x: number, y: number): string => at(x, y)[1] ?? "-";
  // A Witch of seat A stands on B's land at (6, 2): her nine tiles are
  // Snow (Blizzard) and get falling snow.
  const witch = { x: 6, y: 2 };
  const inBlizzard = (x: number, y: number): boolean =>
    Math.abs(x - witch.x) <= 1 && Math.abs(y - witch.y) <= 1;
  const snowAt = (x: number, y: number): boolean => {
    const t = at(x, y)[0];
    if (t === undefined || t === "s" || t === "d") return false;
    return isSnow(x, y) || inBlizzard(x, y);
  };
  const seat: Record<string, Rgb> = {
    A: rgbOf(RULESET7_PLAYER_COLORS.TEAL),
    B: rgbOf(RULESET7_PLAYER_COLORS.CORAL),
  };
  const units: [number, number, string, string][] = [
    [2, 1, "chibi-direction-ice-folk-mammoth", "A"],
    [4, 0, "chibi-direction-ice-folk-yeti", "A"],
    [4, 1, "chibi-direction-ice-folk-boulder-yeti", "A"],
    [1, 2, "chibi-direction-ice-folk-snow-hunter", "A"],
    [4, 3, "chibi-direction-ice-folk-sled", "A"],
    [2, 4, "chibi-direction-ice-folk-sabretooth", "A"],
    [6, 2, "chibi-direction-ice-folk-ice-witch", "A"],
    [5, 1, "chibi-direction-ice-folk-frost-giant", "A"],
    [7, 1, "chibi-direction-fighter", "B"],
    [7, 3, "chibi-direction-knight", "B"],
    [5, 3, "chibi-direction-marksman", "B"],
    [2, 3, "chibi-direction-ice-folk-yeti", "A"],
  ];
  const cities: [number, number, string, string][] = [
    [3, 2, "chibi-direction-ice-folk-city-2", "A"],
    [7, 2, "chibi-direction-city-2", "B"],
  ];
  for (const zoom of [1, 0.75] as const) {
    const board = blank(W * TILE, H * TILE + 24, [23, 54, 50]);
    const top0 = 24;
    // 1. Ground.
    for (let y = 0; y < H; y += 1)
      for (let x = 0; x < W; x += 1) {
        const t = at(x, y)[0];
        const ground =
          t === "s"
            ? shallow
            : t === "d"
              ? deep
              : t === "m"
                ? rock
                : (x + y) % 2 === 0
                  ? grass
                  : grass2;
        blit(board, ground, x * TILE, top0 + y * TILE);
      }
    // 2. Snow overlay over the ground.
    for (let y = 0; y < H; y += 1)
      for (let x = 0; x < W; x += 1) {
        if (!snowAt(x, y)) continue;
        const edges = {
          north: !snowAt(x, y - 1),
          south: !snowAt(x, y + 1),
          west: !snowAt(x - 1, y),
          east: !snowAt(x + 1, y),
        };
        blit(
          board,
          iceFolkSnowTileV7(edges, iceFolkSnowVariantV7({ x, y })),
          x * TILE,
          top0 + y * TILE,
        );
      }
    // 3. Roads (the calm Road of the live look, two strokes).
    const road = (
      x0: number,
      y0: number,
      x1: number,
      y1: number,
      colour: Rgb,
      width: number,
    ): void => {
      const steps = 80;
      for (let k = 0; k <= steps; k += 1) {
        const cx = x0 + ((x1 - x0) * k) / steps;
        const cy = y0 + ((y1 - y0) * k) / steps;
        for (let dy = -width / 2; dy <= width / 2; dy += 1)
          for (let dx = -width / 2; dx <= width / 2; dx += 1) {
            if (dx * dx + dy * dy > (width / 2) ** 2) continue;
            const px = Math.round(cx + dx);
            const py = Math.round(cy + dy);
            if (px >= 0 && py >= 0 && px < board.width && py < board.height)
              board.data.set(
                [colour[0], colour[1], colour[2], 255],
                (py * board.width + px) * 4,
              );
          }
      }
    };
    for (const [colour, width] of [
      [rgbOf("#8b7a55"), 11],
      [rgbOf("#cdbb8f"), 8],
    ] as const)
      for (let y = 0; y < H; y += 1)
        for (let x = 0; x < W; x += 1) {
          if (!isRoad(x, y)) continue;
          for (const [dx, dy] of [
            [1, 0],
            [0, 1],
          ] as const)
            if (isRoad(x + dx, y + dy))
              road(
                x * TILE + 40,
                top0 + y * TILE + 40,
                (x + dx) * TILE + 40,
                top0 + (y + dy) * TILE + 40,
                colour,
                width,
              );
        }
    // 4. Territory borders: 2 px in the owner's colour where territory changes.
    for (let y = 0; y < H; y += 1)
      for (let x = 0; x < W; x += 1) {
        const o = owner(x, y);
        if (o === "-") continue;
        const colour = seat[o] ?? [255, 255, 255];
        for (const [dx, dy] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ] as const) {
          if (owner(x + dx, y + dy) === o) continue;
          const line =
            dx === 0 ? blank(TILE, 2, colour) : blank(2, TILE, colour);
          blit(
            board,
            line,
            x * TILE + (dx === 1 ? TILE - 2 : 0),
            top0 + y * TILE + (dy === 1 ? TILE - 2 : 0),
          );
        }
      }
    // 5. Tall bodies with snow caps, cities, plates and units, by row.
    for (let y = 0; y < H; y += 1) {
      for (let x = 0; x < W; x += 1) {
        const t = at(x, y)[0];
        const body = t === "f" ? forestBody : t === "m" ? mountainBody : null;
        const occupied =
          units.some(([ux, uy]) => ux === x && uy === y) ||
          cities.some(([cx, cy]) => cx === x && cy === y);
        if (body === null || occupied) continue;
        const left = x * TILE;
        const top = top0 + (y + 1) * TILE - body.height;
        blit(board, body, left, top);
        if (snowAt(x, y)) blit(board, iceFolkSnowCapsV7(body), left, top);
      }
      for (const [cx, cy, id, o] of cities) {
        if (cy !== y) continue;
        const city = await readRaster(chibi("settlements", id));
        const left = cx * TILE + (TILE - city.width) / 2;
        const top = top0 + cy * TILE + TILE / 2 - (city.height - 40);
        blit(board, city, left, top);
        const anchor = ICE_FOLK_FLAG_ANCHORS_V7[id];
        if (anchor !== undefined)
          blit(
            board,
            pennant(seat[o] ?? [255, 255, 255]),
            left + anchor.x,
            top + anchor.y,
          );
        else
          blit(
            board,
            pennant(seat[o] ?? [255, 255, 255]),
            left + city.width - 18,
            top + 6,
          );
      }
      for (const [ux, uy, id, o] of units) {
        if (uy !== y) continue;
        const sprite = await readRaster(unitFile(id));
        const plateW = PLATE[sprite.width as 56 | 72 | 88] ?? 52;
        const cx = ux * TILE + TILE / 2;
        const feet = top0 + uy * TILE + TILE - 6;
        const colour = seat[o] ?? [255, 255, 255];
        for (let py = -5; py <= 5; py += 1)
          for (let px = -plateW / 2; px <= plateW / 2; px += 1) {
            const r = (px / (plateW / 2)) ** 2 + (py / 5.5) ** 2;
            if (r > 1) continue;
            const edge = r > 0.72;
            const c: Rgb = edge ? [24, 26, 32] : colour;
            board.data.set(
              [c[0], c[1], c[2], 255],
              ((feet + py) * board.width + cx + Math.round(px)) * 4,
            );
          }
        blit(
          board,
          sprite,
          cx - sprite.width / 2,
          top0 + uy * TILE + TILE / 2 - (sprite.height - 40) - 2,
        );
      }
    }
    // 6. The Blizzard: a faint veil, falling snow and the ring of nine tiles.
    const spec = ICE_FOLK_BLIZZARD_V7;
    for (let y = witch.y - 1; y <= witch.y + 1; y += 1)
      for (let x = witch.x - 1; x <= witch.x + 1; x += 1) {
        const veil = blank(TILE, TILE, [255, 255, 255]);
        blit(board, veil, x * TILE, top0 + y * TILE, 1, spec.veilAlpha);
        for (const flake of iceFolkBlizzardFlakesV7({ x, y }, 1200)) {
          const px = x * TILE + flake.x;
          const py = top0 + y * TILE + flake.y;
          if (flake.size === 2) {
            blit(board, blank(2, 2, [255, 255, 255]), px, py, 1, flake.alpha);
            blit(
              board,
              blank(2, 1, rgbOf(ICE_FOLK_PALETTE_V7.snowShade)),
              px,
              py + 2,
              1,
              flake.alpha * 0.8,
            );
          } else
            blit(board, blank(1, 1, [255, 255, 255]), px, py, 1, flake.alpha);
        }
      }
    const ring = spec.ring;
    const rx0 = (witch.x - 1) * TILE + ring.insetPx;
    const ry0 = top0 + (witch.y - 1) * TILE + ring.insetPx;
    const rw = 3 * TILE - 2 * ring.insetPx;
    for (let k = 0; k < rw; k += 1) {
      if (k % (ring.dashPx + ring.gapPx) >= ring.dashPx) continue;
      for (const [px, py] of [
        [rx0 + k, ry0],
        [rx0 + k, ry0 + rw - ring.widthPx],
        [rx0, ry0 + k],
        [rx0 + rw - ring.widthPx, ry0 + k],
      ] as const)
        blit(
          board,
          blank(ring.widthPx, ring.widthPx, [255, 255, 255]),
          px,
          py,
          1,
          ring.alpha,
        );
    }
    const labels: Label[] = [
      {
        text: `Board mock at zoom ${zoom}: Ice Folk (Teal) Snow territory with Roads, Forest, Mountains and a Deep Winter ring; an Ice Witch's Blizzard on Human (Coral) land`,
        left: 6,
        top: 3,
        size: 13,
      },
    ];
    let final: Canvas = board;
    if (zoom !== 1) {
      const resized = await sharp(Buffer.from(board.data), {
        raw: { width: board.width, height: board.height, channels: 4 },
      })
        .resize(
          Math.round(board.width * zoom),
          Math.round(board.height * zoom),
          { kernel: "lanczos3" },
        )
        .raw()
        .toBuffer();
      final = {
        width: Math.round(board.width * zoom),
        height: Math.round(board.height * zoom),
        data: new Uint8Array(resized),
      };
      labels[0] = { ...(labels[0] as Label), size: 10 };
    }
    await sheet(`snow-board-zoom-${zoom}.png`, final, labels);
  }
}

// ------------------------------------------------------------ measurements

const SPEC = ACCENT_PRESETS["ice-folk-blue"];

const BANDS: readonly {
  id: string;
  label: string;
  test: (rgb: Rgb, h: number, s: number, v: number) => boolean;
}[] = [
  {
    id: "ice",
    label: "Ice blue accent",
    test: (rgb) => isAccentColour(SPEC, rgb[0], rgb[1], rgb[2]),
  },
  {
    id: "outline",
    label: "Outline and darkest tones",
    test: (_, __, ___, v) => v < 0.16,
  },
  {
    id: "white",
    label: "Snow white and highlights",
    test: (_, __, s, v) => s < 0.08 && v >= 0.9,
  },
  {
    id: "fur",
    label: "Fur and cream, lit",
    test: (_, h, s, v) => (h <= 60 || h >= 330) && s < 0.4 && v >= 0.68,
  },
  {
    id: "furShade",
    label: "Fur, taupe shade",
    test: (_, h, s, v) =>
      (h <= 60 || h >= 330) && s < 0.45 && v >= 0.4 && v < 0.68,
  },
  {
    id: "hide",
    label: "Dark brown-grey hide",
    test: (_, h, s, v) =>
      (h <= 60 || h >= 330) && s < 0.75 && v >= 0.16 && v < 0.4,
  },
  {
    id: "slate",
    label: "Slate faces, hands and stone",
    test: (_, h, s, v) =>
      h > 180 && h < 260 && s < 0.4 && v >= 0.16 && v < 0.62,
  },
  {
    id: "navy",
    label: "Navy robe",
    test: (_, h, s, v) => h >= 210 && h <= 250 && s >= 0.4 && v < 0.62,
  },
];

async function paletteAndReadability(): Promise<void> {
  const masters = await Promise.all(
    UNITS.map(async (unit) => ({ unit, raster: await iceUnit(unit[1]) })),
  );
  const stats = BANDS.map((band) => ({
    band,
    ...pixelsWhere(
      masters.map((entry) => entry.raster),
      band.test,
    ),
  }));
  const opaque = stats[0]?.opaque ?? 1;
  const statOf = (id: string): (typeof stats)[number] => {
    const found = stats.find((entry) => entry.band.id === id);
    if (found === undefined) throw new Error(`no band ${id}`);
    return found;
  };
  const ice = statOf("ice");
  const iceLit = rgbOf(
    ice.tones.find(([hex]) => Math.max(...rgbOf(hex)) >= 0.85 * 255)?.[0] ??
      hexOf(ice.mean),
  );
  const fur = statOf("fur").mean;
  const furShade = statOf("furShade").mean;
  const slate = statOf("slate").mean;
  const hide = statOf("hide").mean;
  const load = (name: string): Promise<RgbaRaster> =>
    readRaster(terrainFile(name));
  const grassR = await load("chibi-grass-1");
  const rockR = await load("chibi-mountain-ground-1");
  const grass = meanColour(grassR);
  const forest = meanColour(await load("chibi-forest-1"));
  const rock = meanColour(rockR);
  const rockLight = meanColour(rockR, true);
  const mountainBody = meanColour(await load("chibi-mountain-1.body"));
  const rockToned = meanColour(
    toned(rockR, "TERRAIN:MOUNTAIN") as unknown as RgbaRaster,
  );
  const grassToned = meanColour(
    toned(grassR, "TERRAIN:GRASS") as unknown as RgbaRaster,
  );
  const shallow = meanColour(await load("chibi-shallow-water-1"));
  const deep = meanColour(await load("chibi-deep-water-1"));
  // Snow over Grass and over rock, as the overlay draws it (wash only).
  const snowOver = (base: RgbaRaster): Rgb => {
    const c = blank(TILE, TILE, [0, 0, 0]);
    blit(c, base, 0, 0);
    blit(c, iceFolkSnowTileV7(NO_EDGES, 0), 0, 0);
    return meanColour(c as unknown as RgbaRaster);
  };
  const snowGrass = snowOver(grassR);
  const snowRock = snowOver(rockR);
  const players = Object.fromEntries(
    Object.entries(RULESET7_PLAYER_COLORS).map(([name, hex]) => [
      name,
      rgbOf(hex),
    ]),
  ) as Record<keyof typeof RULESET7_PLAYER_COLORS, Rgb>;
  const accentPairs: ColourPair[] = [
    colourPair("ice, lit", iceLit, "Shallow Water", shallow),
    colourPair("ice, lit", iceLit, "Teal plate", players.TEAL),
    colourPair("ice, lit", iceLit, "Martian glass", rgbOf("#8db9cd")),
    colourPair("ice, lit", iceLit, "Martian glass, lit", rgbOf("#c7e7f5")),
    colourPair("ice, lit", iceLit, "Dinosaur blue", rgbOf("#205794")),
    colourPair("ice, lit", iceLit, "Deep Water", deep),
    colourPair("ice, lit", iceLit, "Violet plate", players.VIOLET),
    colourPair("ice, lit", iceLit, "Undead violet", rgbOf("#a221ee")),
    colourPair("ice, lit", iceLit, "Martian magenta", rgbOf("#f30a96")),
    colourPair("ice, lit", iceLit, "Snow on Grass", snowGrass),
    colourPair("ice, mean", ice.mean, "Shallow Water", shallow),
    colourPair("ice, mean", ice.mean, "Teal plate", players.TEAL),
  ];
  const furPairs: ColourPair[] = [
    colourPair("fur, lit", fur, "Grass", grass),
    colourPair("fur, lit", fur, "Grass, toned", grassToned),
    colourPair("fur, lit", fur, "Forest", forest),
    colourPair("fur, lit", fur, "Mountain rock, mean", rock),
    colourPair("fur, lit", fur, "Mountain rock, light", rockLight),
    colourPair("fur, lit", fur, "Mountain rock, toned", rockToned),
    colourPair("fur, lit", fur, "Mountain peak", mountainBody),
    colourPair("fur, shade", furShade, "Mountain rock, mean", rock),
    colourPair("fur, shade", furShade, "Mountain rock, light", rockLight),
    colourPair("fur, lit", fur, "Snow on Grass", snowGrass),
    colourPair("fur, lit", fur, "Snow on rock", snowRock),
    colourPair("fur, lit", fur, "Gold plate", players.GOLD),
    colourPair("slate face", slate, "Mountain rock, mean", rock),
    colourPair("slate face", slate, "Snow on rock", snowRock),
    colourPair("hide", hide, "Mountain rock, mean", rock),
    colourPair("outline #000000", [0, 0, 0], "Mountain rock, light", rockLight),
    colourPair("Snow on Grass", snowGrass, "Grass", grass),
    colourPair("Snow on rock", snowRock, "Mountain rock, mean", rock),
    colourPair("Snow on Grass", snowGrass, "Shallow Water", shallow),
  ];
  const units = masters.map(({ unit, raster }) => {
    const box = opaqueBounds(raster);
    const own = pixelsWhere([raster], BANDS[0]?.test ?? (() => false));
    // Contrast of the silhouette on rock: outline and darkest share.
    const dark = pixelsWhere([raster], (_, __, ___, v) => v < 0.35);
    return {
      unit: unit[2],
      role: unit[0],
      asset: `chibi-direction-ice-folk-${unit[1]}`,
      canvas: `${raster.width} x ${raster.height}`,
      spriteWidth: box.width,
      spriteHeight: box.height,
      plateWidth: PLATE[raster.width as 56 | 72 | 88] ?? null,
      accentPixels: own.count,
      accentShare:
        Math.round((own.count / Math.max(1, own.opaque)) * 1000) / 10,
      darkShare:
        Math.round((dark.count / Math.max(1, dark.opaque)) * 1000) / 10,
      keyRedPixels: keyRedPixels(raster),
    };
  });
  const verdict = {
    rule: "the accent must differ by at least 20 (CIE76) from Shallow Water, the Teal plate and the Martian glass in normal vision and by at least 10 under deuteranopia and protanopia",
    worstAgainstShallowTealGlass: Math.min(
      ...accentPairs.slice(0, 4).map(worstDeltaE),
    ),
    accentHue: Math.round(rgbToHsv(iceLit[0], iceLit[1], iceLit[2]).hue),
    accent: accentPairs
      .slice(0, 4)
      .every((pair) => pair.deltaE >= 20 && worstDeltaE(pair) >= 10)
      ? "DEEP_ICE_BLUE"
      : "FAILS",
    furOnMountain:
      "fur against rock is 20 to 30 apart (different colours) but its luminance contrast is only about 1.6: the black outline (contrast above 8 against rock), the charcoal faces and hands, and the ice accent carry a unit on a Mountain",
  };
  const palette = stats.map((entry) => ({
    role: entry.band.label,
    mean: hexOf(entry.mean),
    tones: entry.tones.slice(0, 4).map(([hex]) => hex),
    share: Math.round((entry.count / opaque) * 1000) / 10,
  }));
  await writeFile(
    path.join(OUT, "palette.json"),
    `${JSON.stringify({ measuredOn: "the eight unit masters", accentLit: hexOf(iceLit), palette, codeDrawn: ICE_FOLK_PALETTE_V7 }, null, 2)}\n`,
  );
  written.push("palette.json");
  await writeFile(
    path.join(OUT, "readability.json"),
    `${JSON.stringify(
      {
        note: "CIE76 colour difference (about 10 is clear at a glance, 20 and more are different colours); contrast is the WCAG luminance ratio; terrain colours are the mean of the tile rasters, 'toned' as the live look tones terrain; Snow is the overlay's wash over the tile.",
        verdict,
        accent: accentPairs,
        furAndTerrain: furPairs,
        units,
      },
      null,
      2,
    )}\n`,
  );
  written.push("readability.json");
  const swatch = 56;
  const rowsOf: [string, string[]][] = [
    ...palette.map((entry): [string, string[]] => [
      entry.role,
      [entry.mean, ...entry.tones],
    ]),
    [
      "Code-drawn (ICE_FOLK_PALETTE_V7)",
      Object.values(ICE_FOLK_PALETTE_V7).slice(0, 8),
    ],
    ["Player plates", Object.values(RULESET7_PLAYER_COLORS)],
    [
      "Martian glass and magenta, Dinosaur blue, Undead violet, Human crimson",
      ["#8db9cd", "#c7e7f5", "#f30a96", "#205794", "#a221ee", "#a8202c"],
    ],
    [
      "Grass, rock, rock light, Shallow, Deep, Snow on Grass, Snow on rock",
      [grass, rock, rockLight, shallow, deep, snowGrass, snowRock].map(hexOf),
    ],
  ];
  const out = blank(
    380 + 8 * (swatch + GAP),
    rowsOf.length * (swatch + 18 + GAP) + GAP,
    PAPER,
  );
  const labels: Label[] = [];
  for (const [row, [label, colours]] of rowsOf.entries()) {
    const top = GAP + row * (swatch + 18 + GAP);
    labels.push({ text: label, left: 6, top: top + 18, size: 12 });
    for (const [column, hex] of colours.entries()) {
      const left = 380 + column * (swatch + GAP);
      fill(out, left, top, swatch, swatch, rgbOf(hex));
      labels.push({
        text: hex,
        left,
        top: top + swatch + 2,
        size: 10,
        fill: "#aab3c0",
      });
    }
  }
  await sheet("palette.png", out, labels);
  console.log(
    `accent verdict: ${verdict.accent} (hue ${verdict.accentHue}, worst ${verdict.worstAgainstShallowTealGlass})`,
  );
}

/** Pixels in the owner key's colour band (hue 340 to 5, saturated). */
function keyRedPixels(raster: RgbaRaster): number {
  return pixelsWhere(
    [raster],
    (_, h, s, v) => (h >= 340 || h <= 5) && s >= 0.65 && v >= 0.3,
  ).count;
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
// The FOUR scene (four Ice Folk players) is no longer captured: every
// player plays a different faction since bead pulp_wars-w5j.1 (dropped in
// pulp_wars-w5j.3; its earlier captures stay as history).
const SCENES = ["MIXED_A", "MIXED_B"] as const;
const SCENE = `globalThis.__ICE_FOLK_SCENE__`;

async function captureAll(baseUrl: string): Promise<void> {
  const chrome = process.env.CHROME_PATH;
  if (chrome === undefined || chrome === "")
    throw new Error("Set CHROME_PATH to a Chrome binary (or --skip-capture)");
  const shots: { name: string; png: Buffer }[] = [];
  const debugPort = 10_900 + (process.pid % 80);
  const profile = await mkdtemp(path.join(tmpdir(), "pulp-wars-ice-folk-"));
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
      await evaluate(connection, `globalThis.__IF_OLD__ = true`);
      await connection.send("Page.navigate", { url: url.href });
      await waitFor(
        connection,
        `globalThis.__IF_OLD__ !== true && document.readyState === 'complete' && globalThis.__PULP_WARS_APP__ !== undefined`,
      );
      await evaluate(
        connection,
        `(() => { for (const key of Object.keys(localStorage)) if (key.startsWith('pulpWars.save.')) localStorage.removeItem(key); globalThis.__IF_OLD__ = true; })()`,
      );
      await connection.send("Page.reload");
      await waitFor(
        connection,
        `globalThis.__IF_OLD__ !== true && document.readyState === 'complete' && document.querySelector('[data-action="launch"]') !== null && globalThis.__PULP_WARS_APP__?.controller.snapshot().phase === 'EMPTY'`,
      );
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
          `(async () => { const module = await import('/scripts/art/ice-folk-direction/scene.ts'); ${SCENE} = module.showIceFolkSceneV7(globalThis.__PULP_WARS_APP__.controller.snapshot().view, ${JSON.stringify({ kind: scene })}); return true; })()`,
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
    {
      cwd: ROOT,
      stdio: "ignore",
      detached: true,
    },
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

/** The key sheets, copied for the root's review. */
const KEY_SHEETS = [
  "study-options-x3.png",
  "roster-x4.png",
  "roster-1x.png",
  "roster-zoom-0.75.png",
  "terrain-x2.png",
  "portraits-x4.png",
  "icons-x4.png",
  "effects-x3.png",
  "shatter-frames-x3.png",
  "cities-x3.png",
  "markers-x3.png",
  "snow-tiles-x2.png",
  "snow-board-zoom-1.png",
  "snow-board-zoom-0.75.png",
  "palette.png",
  "scene-mixed-a-desktop-zoom-1.png",
  "scene-mixed-b-desktop-zoom-0.75.png",
  "scene-mixed-a-phone-zoom-0.75.png",
];

/** The interface's cream plate and the technology card's tone (STYLE.md). */
const CREAM_PLATE: Rgb = [247, 239, 216];
const CARD_TONE: Rgb = [234, 220, 180];

/**
 * The frozen-sea icons where the interface shows them: on the cream plate
 * (the Freeze button) and on the technology card's tone, at x4 and at 48,
 * 24 and 18 px, beside the icons they must not be mistaken for.
 */
async function frozenSeaIconsSheet(): Promise<void> {
  const scale = 4;
  const all = [
    ...FROZEN_SEA_ICONS.map(
      ([name, title]) => [`chibi-direction-icon-${name}`, title] as const,
    ),
    ["chibi-direction-icon-action-cold-snap", "(Cold Snap)"],
    ["chibi-direction-icon-tech-deep-winter", "(Deep Winter)"],
    ["chibi-direction-icon-tech-brittle", "(Brittle)"],
    ["chibi-direction-icon-status-chilled", "(Chilled)"],
    ["chibi-direction-icon-status-frozen", "(Frozen)"],
    ["chibi-icon-tech-navigation", "(Navigation)"],
    ["chibi-icon-tech-seamanship", "(Seamanship)"],
    ["chibi-icon-tech-submersibles", "(Submersibles)"],
    ["chibi-icon-action-board", "(Board)"],
  ] as const;
  const cellW = 48 * scale + GAP;
  const strip = 48 + GAP * 2;
  const out = blank(
    all.length * cellW + GAP,
    LABEL_H * 2 + 48 * scale + strip * 2 + GAP * 5,
    PAPER,
  );
  const labels: Label[] = [];
  for (const [column, [id, title]] of all.entries()) {
    const left = GAP + column * cellW;
    const icon = await readRaster(chibi("icons", id));
    labels.push({ text: title, left, top: 4, size: 12 });
    let top = LABEL_H;
    fill(out, left, top, 48 * scale, 48 * scale, CREAM_PLATE);
    blit(out, icon, left, top, scale);
    top += 48 * scale + GAP;
    for (const tone of [CREAM_PLATE, CARD_TONE]) {
      fill(out, left, top, 48 * scale, strip, tone);
      blit(out, icon, left + GAP, top + GAP, 1);
      let x = left + GAP + 48 + GAP * 2;
      for (const size of [24, 18]) {
        const small = await sharp(Buffer.from(icon.data), {
          raw: { width: icon.width, height: icon.height, channels: 4 },
        })
          .resize(size, size, { kernel: "lanczos3" })
          .raw()
          .toBuffer();
        blit(
          out,
          { width: size, height: size, data: new Uint8Array(small) },
          x,
          top + GAP + (48 - size) / 2,
          1,
        );
        x += size + GAP * 3;
      }
      top += strip + GAP;
    }
  }
  labels.push({
    text: "cream plate x4; then 48, 24 and 18 px on the cream plate and on the technology card's tone; names in brackets are existing icons",
    left: GAP,
    top: out.height - LABEL_H,
    size: 12,
    fill: "#aab3c0",
  });
  await sheet("frozen-sea-icons.png", out, labels);
}

async function main(): Promise<void> {
  await mkdir(OUT, { recursive: true });
  if (process.argv.includes("--frozen-sea-icons-only")) {
    await frozenSeaIconsSheet();
    return;
  }
  await writeStudy(ROOT, OUT);
  written.push("study-options-x3.png", "study-options-1x.png", "study.json");
  await rosterSheet(4, "roster-x4.png");
  await rosterSheet(1, "roster-1x.png");
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
  await frozenSeaIconsSheet();
  await effectsSheet();
  await shatterFramesSheet();
  await citiesSheet();
  await markersSheet();
  await snowTilesSheet();
  await snowBoardSheet();
  await paletteAndReadability();
  if (!process.argv.includes("--skip-capture")) {
    const port = Number.parseInt(option("--port") ?? "6513", 10);
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
        bead: "pulp_wars-7g3.5",
        batch: "direction-ice-folk",
        command: "npm run art:chibi-ice-folk-direction-review",
        note: "The scene-* captures draw the Ice Folk rasters under a stand-in faction (scripts/art/ice-folk-direction/scene.ts): the faction is not in the renderer yet. The Snow overlay, the Blizzard and the Chill markers are drawn by the review from src/assets/chibi-direction-ice-folk-presentation.ts; snow-board-* is a mock with approximated plates, Roads and borders.",
        files: [...new Set(written)].sort(),
      },
      null,
      2,
    )}\n`,
  );
  console.log(`wrote index.json (${written.length} files)`);
  const copyTo = option("--copy-to");
  if (copyTo !== undefined) {
    await mkdir(copyTo, { recursive: true });
    for (const name of KEY_SHEETS)
      await copyFile(path.join(OUT, name), path.join(copyTo, name)).catch(() =>
        console.log(`not copied: ${name}`),
      );
    console.log(`copied the key sheets to ${copyTo}`);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "review failed");
  process.exitCode = 1;
});
