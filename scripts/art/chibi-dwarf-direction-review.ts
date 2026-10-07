/**
 * Review evidence of the Steampunk Dwarf art (bead pulp_wars-78i.5, batches
 * `direction-dwarf` and `naval-dwarf`, docs/art/factions/DWARF.md).
 *
 *   npm run art:chibi-dwarf-direction-review
 *   npm run art:chibi-dwarf-direction-review -- --skip-capture
 *   npm run art:chibi-dwarf-direction-review -- --port 6534 --copy-to DIR
 *
 * Writes art/pixellab/reviews/chibi-batch-direction-dwarf/. No sheet draws a
 * base plate, as the live look has none since bead pulp_wars-w5j.3, so the
 * Dwarf look must carry the owner alone.
 *
 * - `lineup-{1x,x3}.png`, `lineup.json`: the spec's 32 px lineup on the
 *   accepted masters (scripts/art/dwarf-direction/lineup.ts); the
 *   `lineup-study-*` files are the study before batching;
 * - `roster-{x4,1x}.png`, `roster-zoom-0.75.png`: each Dwarf unit on Grass,
 *   Forest, Mountain and Snow beside the unit of its role of the six other
 *   factions, and the two mounds;
 * - `terrain-x2.png`: every unit, the mounds and the Dig In earthwork on
 *   Grass, Forest, Mountain, Snow over Grass, Forest and Mountain, the Rift,
 *   Shallow and Deep Water;
 * - `portraits-x4.png`, `icons-x4.png`, `effects-x3.png`;
 * - `mound-x3.png`: the mounds and the Dig In earthwork on every terrain,
 *   on Snow and on a city centre, with a unit standing in the earthwork;
 * - `eruption-frames-x3.png`: the eruption timeline on a 3 x 3 board mock
 *   with enemies around the mound;
 * - `cities-x3.png`: City 1-3 as authored, with the pennant in the four
 *   player colours, on Snow, and beside the other factions' cities;
 * - `naval-x4.png`: the Dwarf ships on Shallow and Deep Water beside the
 *   six other fleets, and the two portraits;
 * - `palette.{png,json}`, `readability.json`;
 * - `scene-{mixed,terrain,coast}-{desktop,phone}-zoom-{1,0.75}.png`: the
 *   scenes of scripts/art/dwarf-direction/scene.ts drawn by the real board
 *   host in the live look with no base plates;
 * - `index.json`.
 *
 * Captures start Vite on port 6534 unless `--port` says otherwise, need
 * CHROME_PATH, and are written after the browser closes (a file written
 * under the project while the page is open makes the dev server reload).
 * `--copy-to DIR` copies the key sheets and captures to DIR.
 */
import { spawn, type ChildProcess } from "node:child_process";
import { copyFile, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import sharp from "sharp";
import {
  DWARF_ERUPTION_TIMELINE_V7,
  DWARF_FLAG_ANCHORS_V7,
  DWARF_DIG_IN_WALL_SHARE_V7,
  DWARF_PALETTE_V7,
  dwarfDigInMarkerV7,
} from "../../src/assets/chibi-direction-dwarf-presentation";
import type { ArtSubjectV7 } from "../../src/assets/chibi-art-v7";
import { UNIT_SHADOW_TABLE_V7 } from "../../src/render/canvas/unit-shadows-v7";
import {
  iceFolkSnowCapsV7,
  iceFolkSnowTileV7,
} from "../../src/assets/chibi-direction-ice-folk-presentation";
import { RULESET7_PLAYER_COLORS } from "../../src/render/canvas/owner-recolour-v7";
import { rgbToHsv, type RgbaRaster } from "./chibi/owner-mask";
import { readRaster } from "./chibi/pipeline";
import {
  colourPair,
  contrast,
  deltaE,
  hexOf,
  rgbOf,
  worstDeltaE,
  type Rgb,
} from "./ice-folk-direction/colour";
import {
  blank,
  blit,
  fill,
  meanColour,
  pixelsWhere,
  writeSheet,
  type Canvas,
  type Label,
} from "./ice-folk-direction/raster-tools";
import {
  DWARF_REVIEW_DIR,
  FACTION_ROSTERS,
  masterLineupSprites,
  writeLineup,
} from "./dwarf-direction/lineup";
import {
  measurePair,
  paletteDistance,
  round1,
  swatches,
} from "./dwarf-direction/measure";

const ROOT = process.cwd();
const OUT = DWARF_REVIEW_DIR;
const TILE = 80;

function option(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index < 0 ? undefined : process.argv[index + 1];
}

type Role =
  | "FIGHTER"
  | "RAIDER"
  | "MARKSMAN"
  | "GUARD"
  | "CAPTAIN"
  | "CATAPULT"
  | "KNIGHT"
  | "JUGGERNAUT";
/** Role, Dwarf unit id suffix, title. */
const UNITS: readonly (readonly [Role, string, string])[] = [
  ["FIGHTER", "hammerer", "Hammerer"],
  ["RAIDER", "gyrocopter", "Gyrocopter"],
  ["MARKSMAN", "clockwork-gunner", "Clockwork Gunner"],
  ["GUARD", "steam-mole", "Steam Mole"],
  ["CAPTAIN", "engineer", "Engineer"],
  ["CATAPULT", "steam-cannon", "Steam Cannon"],
  ["KNIGHT", "steam-tank", "Steam Tank"],
  ["JUGGERNAUT", "brass-titan", "Brass Titan"],
];
const FACTION_NAMES = [
  "Human",
  "Undead",
  "Goblin",
  "Dinosaur",
  "Martian",
  "Ice Folk",
] as const;
const ICONS = [
  ["action-tunnel", "Tunnel"],
  ["action-bomb-run", "Bomb Run"],
  ["action-assemble", "Assemble"],
  ["action-repair", "Repair"],
  ["action-knockback", "Knockback"],
  ["action-plated", "Plated"],
  ["status-clockwork", "Clockwork"],
  ["status-dug-in", "Dug in"],
  ["tech-dig-in", "Dig In (tech)"],
  ["tech-blasting-charges", "Blasting Charges"],
] as const;
const EFFECTS = [
  ["eruption", "Eruption burst"],
  ["bomb-blast", "Bomb blast"],
  ["steam-puff", "Steam puff"],
  ["repair-sparks", "Repair sparks"],
] as const;

const chibi = (folder: string, id: string): string =>
  path.join(ROOT, "public/assets/chibi", folder, `${id}.png`);
const dwarfUnit = (name: string): Promise<RgbaRaster> =>
  readRaster(chibi("units", `chibi-direction-dwarf-${name}`));

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
const PANEL: Rgb = [36, 40, 48];
const LIGHT: Rgb = [244, 241, 232];
const GAP = 6;
const LABEL_H = 22;
const CELL_W = 96;
const CELL_H = 112;

// ------------------------------------------------------------ grounds

interface Ground {
  readonly label: string;
  /** Layers drawn bottom-aligned in the cell, in order. */
  readonly layers: readonly (RgbaRaster | Canvas)[];
}

const NO_EDGES = { north: false, east: false, south: false, west: false };

function toCanvas(raster: {
  width: number;
  height: number;
  data: ArrayLike<number>;
}): Canvas {
  return {
    width: raster.width,
    height: raster.height,
    data: Uint8Array.from(raster.data),
  };
}

async function grounds(): Promise<Record<string, Ground>> {
  const load = (name: string): Promise<RgbaRaster> =>
    readRaster(chibi("terrain", name));
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
    rift: { label: "Rift", layers: [await load("chibi-rift-h-middle")] },
    shallow: {
      label: "Shallow Water",
      layers: [await load("chibi-shallow-water-1")],
    },
    deep: { label: "Deep Water", layers: [await load("chibi-deep-water-1")] },
    snowGrass: { label: "Snow on Grass", layers: [grass, snow] },
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

/** A board cell: the ground bottom-aligned, then the pieces bottom-centred. */
function boardCell(
  ground: Ground,
  pieces: readonly (RgbaRaster | Canvas | null)[],
  scale: number,
  lift = 0,
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
  for (const piece of pieces)
    if (piece !== null)
      blit(
        out,
        piece,
        tileLeft + ((TILE - piece.width) / 2) * scale,
        bottom - (piece.height + lift) * scale,
        scale,
      );
  return out;
}

/**
 * The Dig In earthwork at a unit: back heaps, unit, front wall, on the
 * unit's measured shadow anchor as the board draws it (bead
 * pulp_wars-78i.9); without a subject, a standard unit's shadow.
 */
function dugIn(
  unit: RgbaRaster,
  subject?: ArtSubjectV7,
): readonly (RgbaRaster | Canvas)[] {
  const shadow = (subject === undefined
    ? null
    : UNIT_SHADOW_TABLE_V7[subject]?.shadow) ?? {
    x: unit.width / 2,
    y: unit.height - 6,
    radiusX: 21.84,
    radiusY: 21.84 * 0.34,
  };
  const marker = dwarfDigInMarkerV7(
    Math.max(16, Math.round(2 * shadow.radiusX * DWARF_DIG_IN_WALL_SHARE_V7)),
  );
  // The wall's foot on the shadow's front edge, centred on the shadow.
  const pad = (layer: {
    width: number;
    height: number;
    data: ArrayLike<number>;
  }): Canvas => {
    // Copied with its alpha (blit keeps the target's alpha).
    const out = blank(unit.width, unit.height, [0, 0, 0]);
    out.data.fill(0);
    const left = Math.round(shadow.x - layer.width / 2);
    const top = Math.round(shadow.y + shadow.radiusY - layer.height);
    for (let y = 0; y < layer.height; y += 1)
      for (let x = 0; x < layer.width; x += 1) {
        const tx = left + x;
        const ty = top + y;
        if (tx < 0 || ty < 0 || tx >= out.width || ty >= out.height) continue;
        const s = (y * layer.width + x) * 4;
        if ((layer.data[s + 3] ?? 0) === 0) continue;
        for (let channel = 0; channel < 4; channel += 1)
          out.data[(ty * out.width + tx) * 4 + channel] =
            layer.data[s + channel] ?? 0;
      }
    return out;
  };
  return [pad(marker.back), unit, pad(marker.front)];
}

// ------------------------------------------------------------ sheets

async function rosterSheet(scale: number, name: string): Promise<void> {
  const ground = await grounds();
  const columns = [
    "Dwarf",
    "on Forest",
    "on Mountain",
    "on Snow",
    ...FACTION_NAMES,
  ];
  const labelW = 150;
  const rows = UNITS.length + 1;
  const out = blank(
    labelW + columns.length * (CELL_W * scale + GAP) + GAP,
    LABEL_H + rows * (CELL_H * scale + GAP) + GAP,
    PAPER,
  );
  const labels: Label[] = columns.map((text, column) => ({
    text,
    left: labelW + column * (CELL_W * scale + GAP),
    top: 4,
    size: scale === 1 ? 11 : 14,
  }));
  for (const [row, [role, id, title]] of UNITS.entries()) {
    const top = LABEL_H + row * (CELL_H * scale + GAP);
    labels.push(
      { text: title, left: 6, top: top + 6, size: scale === 1 ? 11 : 14 },
      { text: role, left: 6, top: top + 24, size: 11, fill: "#aab3c0" },
    );
    const sprite = await dwarfUnit(id);
    const others = await Promise.all(
      (FACTION_ROSTERS[role] ?? []).map((other) =>
        readRaster(chibi("units", `chibi-direction-${other}`)),
      ),
    );
    const cells = [
      boardCell(ground.grass as Ground, [sprite], scale),
      boardCell(ground.forest as Ground, [sprite], scale),
      boardCell(ground.mountain as Ground, [sprite], scale),
      boardCell(ground.snowGrass as Ground, [sprite], scale),
      ...others.map((other) =>
        boardCell(ground.grass as Ground, [other], scale),
      ),
    ];
    for (const [column, cell] of cells.entries())
      blit(out, cell, labelW + column * (CELL_W * scale + GAP), top);
  }
  const top = LABEL_H + UNITS.length * (CELL_H * scale + GAP);
  labels.push({ text: "Mounds", left: 6, top: top + 6, size: 14 });
  const mound = await dwarfUnit("mound");
  const rider = await dwarfUnit("mound-rider");
  const moundCells = [
    boardCell(ground.grass as Ground, [mound], scale),
    boardCell(ground.forest as Ground, [rider], scale),
    boardCell(ground.mountain as Ground, [mound], scale),
    boardCell(ground.snowGrass as Ground, [rider], scale),
  ];
  for (const [column, cell] of moundCells.entries())
    blit(out, cell, labelW + column * (CELL_W * scale + GAP), top);
  await sheet(name, out, labels);
}

async function terrainSheet(): Promise<void> {
  const scale = 2;
  const ground = await grounds();
  const keys = [
    "grass",
    "forest",
    "mountain",
    "snowGrass",
    "snowForest",
    "snowMountain",
    "rift",
    "shallow",
    "deep",
  ] as const;
  const labelW = 150;
  const rows: [string, readonly (RgbaRaster | Canvas)[]][] = [["(bare)", []]];
  for (const [, id, title] of UNITS) rows.push([title, [await dwarfUnit(id)]]);
  rows.push(["Mound", [await dwarfUnit("mound")]]);
  rows.push(["Rider's mound", [await dwarfUnit("mound-rider")]]);
  rows.push([
    "Hammerer dug in",
    dugIn(await dwarfUnit("hammerer"), "UNIT:DWARF:FIGHTER"),
  ]);
  rows.push([
    "Steam Mole dug in",
    dugIn(await dwarfUnit("steam-mole"), "UNIT:DWARF:GUARD"),
  ]);
  const out = blank(
    labelW + keys.length * (CELL_W * scale + GAP) + GAP,
    LABEL_H + rows.length * (CELL_H * scale + GAP) + GAP,
    PAPER,
  );
  const labels: Label[] = keys.map((key, column) => ({
    text: (ground[key] as Ground).label,
    left: labelW + column * (CELL_W * scale + GAP),
    top: 4,
  }));
  for (const [row, [title, pieces]] of rows.entries()) {
    const top = LABEL_H + row * (CELL_H * scale + GAP);
    labels.push({ text: title, left: 6, top: top + 6 });
    for (const [column, key] of keys.entries())
      blit(
        out,
        boardCell(ground[key] as Ground, pieces, scale),
        labelW + column * (CELL_W * scale + GAP),
        top,
      );
  }
  await sheet("terrain-x2.png", out, labels);
}

async function portraitsSheet(): Promise<void> {
  const scale = 4;
  const cell = 52;
  const labelW = 170;
  const columns = ["dock", "page", "map sprite", "Goblin", "Human"];
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
  for (const [row, [role, id, title]] of UNITS.entries()) {
    const top = LABEL_H + row * rowH;
    labels.push({ text: title, left: 6, top: top + 6 });
    const portrait = await readRaster(
      chibi("portraits", `chibi-direction-portrait-dwarf-${id}`),
    );
    const sprite = await dwarfUnit(id);
    const goblinId = FACTION_ROSTERS[role]?.[2]?.replace(/^goblin-/, "");
    const humanId = FACTION_ROSTERS[role]?.[0];
    const goblin = await readRaster(
      chibi("portraits", `chibi-direction-portrait-goblin-${goblinId ?? ""}`),
    ).catch(() => null);
    const human = await readRaster(
      chibi("portraits", `chibi-direction-portrait-${humanId ?? ""}`),
    ).catch(() => null);
    const panels: [number, Rgb, RgbaRaster | null, number][] = [
      [0, PANEL, portrait, scale],
      [1, LIGHT, portrait, scale],
      [2, rgbOf("#89b75b"), sprite, 2],
      [3, PANEL, goblin, scale],
      [4, PANEL, human, scale],
    ];
    for (const [column, background, raster, s] of panels) {
      const left = lefts[column] ?? 0;
      const w = (widths[column] ?? cell) * scale;
      fill(out, left, top, w, cell * scale, background);
      if (raster !== null)
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

async function resample(
  raster: RgbaRaster,
  width: number,
  height: number,
): Promise<RgbaRaster> {
  const data = await sharp(Buffer.from(raster.data), {
    raw: { width: raster.width, height: raster.height, channels: 4 },
  })
    .resize(width, height, { kernel: "lanczos3" })
    .raw()
    .toBuffer();
  return { width, height, data: new Uint8Array(data) };
}

async function iconsSheet(): Promise<void> {
  const scale = 4;
  const existing = [
    ["chibi-direction-icon-action-cold-snap", "Cold Snap"],
    ["chibi-direction-icon-status-shield", "Shield"],
    ["chibi-icon-tech-fortification", "Fortification"],
    ["chibi-icon-action-tend-wounded", "Tend Wounded"],
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
    fill(out, left, top, 48 * scale, 48 * scale, PANEL);
    blit(out, icon, left, top, scale);
    top += 48 * scale + GAP;
    fill(out, left, top, 48 * scale, 48 * scale, LIGHT);
    blit(out, icon, left, top, scale);
    top += 48 * scale + GAP;
    fill(out, left, top, 48 * scale, 48 + 4, PANEL);
    blit(out, icon, left + 4, top + 2, 1);
    blit(out, await resample(icon, 24, 24), left + 64, top + 14, 1);
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
    "snowGrass",
    "rift",
    "shallow",
    "deep",
  ] as const;
  const goblin = await readRaster(
    chibi("units", "chibi-direction-goblin-goblin"),
  );
  const hammerer = await dwarfUnit("hammerer");
  const columns = [
    ...keys.map((key) => (ground[key] as Ground).label),
    "dock panel",
    "on a Goblin",
    "on a Hammerer",
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
      chibi("effects", `chibi-direction-effect-dwarf-${name}`),
    );
    const centreX = (TILE - effect.width) / 2;
    const centreY = (TILE - effect.height) / 2;
    for (const [column, key] of keys.entries()) {
      const tile = blank(TILE * scale, TILE * scale, FRAME);
      for (const layer of (ground[key] as Ground).layers)
        if (layer.height === TILE) blit(tile, layer, 0, 0, scale);
      blit(tile, effect, centreX * scale, centreY * scale, scale);
      blit(out, tile, labelW + column * cell, top);
    }
    let left = labelW + keys.length * cell;
    fill(out, left, top, TILE * scale, TILE * scale, PANEL);
    blit(out, effect, left + centreX * scale, top + centreY * scale, scale);
    for (const unit of [goblin, hammerer]) {
      left += cell;
      const tile = blank(TILE * scale, TILE * scale, FRAME);
      const grass = (ground.grass as Ground).layers[0];
      if (grass !== undefined) blit(tile, grass, 0, 0, scale);
      blit(tile, unit, ((TILE - unit.width) / 2) * scale, 0, scale);
      blit(tile, effect, centreX * scale, (centreY + 4) * scale, scale);
      blit(out, tile, left, top);
    }
  }
  await sheet("effects-x3.png", out, labels);
}

/** Scales a raster by nearest neighbour into a new canvas, with opacity. */
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

async function moundSheet(): Promise<void> {
  const scale = 3;
  const ground = await grounds();
  const city = await readRaster(
    chibi("settlements", "chibi-direction-dwarf-city-2"),
  );
  const keys = [
    "grass",
    "forest",
    "mountain",
    "snowGrass",
    "snowForest",
    "snowMountain",
  ] as const;
  const centre: Ground = {
    label: "City centre",
    layers: [...(ground.grass as Ground).layers, city],
  };
  const columns = [
    ...keys.map((key) => (ground[key] as Ground).label),
    centre.label,
  ];
  const hammerer = await dwarfUnit("hammerer");
  const mole = await dwarfUnit("steam-mole");
  const rows: [string, readonly (RgbaRaster | Canvas)[]][] = [
    ["Mound", [await dwarfUnit("mound")]],
    ["Rider's mound", [await dwarfUnit("mound-rider")]],
    ["Dug in: Hammerer", dugIn(hammerer, "UNIT:DWARF:FIGHTER")],
    ["Dug in: Steam Mole", dugIn(mole, "UNIT:DWARF:GUARD")],
    [
      "Earthwork alone",
      dugIn({ width: 56, height: 80, data: new Uint8Array(56 * 80 * 4) }),
    ],
  ];
  const labelW = 170;
  const out = blank(
    labelW + columns.length * (CELL_W * scale + GAP) + GAP,
    LABEL_H + rows.length * (CELL_H * scale + GAP) + GAP,
    PAPER,
  );
  const labels: Label[] = columns.map((text, column) => ({
    text,
    left: labelW + column * (CELL_W * scale + GAP),
    top: 4,
  }));
  for (const [row, [title, pieces]] of rows.entries()) {
    const top = LABEL_H + row * (CELL_H * scale + GAP);
    labels.push({ text: title, left: 6, top: top + 6 });
    for (const [column, under] of [
      ...keys.map((key) => ground[key] as Ground),
      centre,
    ].entries())
      blit(
        out,
        boardCell(under, pieces, scale),
        labelW + column * (CELL_W * scale + GAP),
        top,
      );
  }
  await sheet("mound-x3.png", out, labels);
}

/** The sprite with every opaque pixel lightened most of the way to white. */
function whiteFlash(sprite: RgbaRaster): Canvas {
  const data = Uint8Array.from(sprite.data);
  for (let index = 0; index < data.length; index += 4)
    for (let channel = 0; channel < 3; channel += 1)
      data[index + channel] = Math.round(
        (data[index + channel] ?? 0) * 0.3 + 255 * 0.7,
      );
  return { width: sprite.width, height: sprite.height, data };
}

/**
 * The eruption timeline (DWARF_ERUPTION_TIMELINE_V7) on a 3 x 3 Grass board
 * mock: the Mole's mound in the middle, enemies (a Goblin, a Human Fighter,
 * a Yeti) on three of its eight tiles, frames at fixed times.
 */
async function eruptionFramesSheet(): Promise<void> {
  const scale = 3;
  const t = DWARF_ERUPTION_TIMELINE_V7;
  const grass = await readRaster(chibi("terrain", "chibi-grass-1"));
  const mound = await dwarfUnit("mound");
  const mole = await dwarfUnit("steam-mole");
  const burst = await readRaster(
    chibi("effects", "chibi-direction-effect-dwarf-eruption"),
  );
  const puff = await readRaster(
    chibi("effects", "chibi-direction-effect-dwarf-steam-puff"),
  );
  const enemies: [number, number, RgbaRaster][] = [
    [0, 0, await readRaster(chibi("units", "chibi-direction-goblin-goblin"))],
    [2, 1, await readRaster(chibi("units", "chibi-direction-fighter"))],
    [1, 2, await readRaster(chibi("units", "chibi-direction-ice-folk-yeti"))],
  ];
  const times = [0, 60, 120, 180, 260, 360, 500, 700, 1000];
  const board = TILE * 3;
  const out = blank(
    GAP + times.length * (board * scale + GAP),
    LABEL_H + board * scale + GAP * 2,
    PAPER,
  );
  const labels: Label[] = [];
  const lerp = (from: number, to: number, share: number): number =>
    from + (to - from) * Math.max(0, Math.min(1, share));
  const fade = (
    phase: { alphaFrom: number; alphaTo: number; fadeFrom: number },
    share: number,
  ): number =>
    share < phase.fadeFrom
      ? phase.alphaFrom
      : lerp(
          phase.alphaFrom,
          phase.alphaTo,
          (share - phase.fadeFrom) / (1 - phase.fadeFrom),
        );
  const ring = [
    [1, 0],
    [2, 0],
    [2, 1],
    [2, 2],
    [1, 2],
    [0, 2],
    [0, 1],
    [0, 0],
  ] as const;
  for (const [index, time] of times.entries()) {
    const frame = blank(board, board, FRAME);
    for (let y = 0; y < 3; y += 1)
      for (let x = 0; x < 3; x += 1) blit(frame, grass, x * TILE, y * TILE);
    const footOf = (
      x: number,
      y: number,
      sprite: { width: number; height: number },
    ): [number, number] => [
      x * TILE + (TILE - sprite.width) / 2,
      (y + 1) * TILE - sprite.height,
    ];
    const shake =
      time >= t.boardShake.from && time < t.boardShake.to
        ? (Math.floor(time / 40) % 2 === 0 ? 1 : -1) * t.boardShake.amplitude
        : 0;
    // The victims flash white for 80 ms at the hit (code-drawn).
    const flash = time >= t.hit && time < t.hit + 80;
    for (const [x, y, sprite] of enemies) {
      const [left, top] = footOf(x, y, sprite);
      blit(frame, flash ? whiteFlash(sprite) : sprite, left + shake, top);
    }
    if (time < t.surface) {
      const wobble =
        time >= t.shake.from && time < t.shake.to
          ? (Math.floor(time / 30) % 2 === 0 ? 1 : -1) * t.shake.amplitude
          : 0;
      const [left, top] = footOf(1, 1, mound);
      blit(frame, mound, left + wobble, top);
    } else {
      const [left, top] = footOf(1, 1, mole);
      blit(frame, mole, left + shake, top);
    }
    // The ring: smaller bursts on the eight tiles, staggered clockwise.
    for (const [step, [x, y]] of ring.entries()) {
      const start = t.ring.from + step * t.ring.stagger;
      const share = (time - start) / t.ring.duration;
      if (share < 0 || share > 1) continue;
      const s = lerp(t.ring.scaleFrom, t.ring.scaleTo, share);
      const sprite = scaled(burst, s, fade(t.ring, share));
      blit(
        frame,
        sprite,
        x * TILE + (TILE - sprite.width) / 2,
        (y + 1) * TILE - sprite.height - lerp(0, t.ring.rise, share) - 4,
      );
    }
    const burstShare = (time - t.burst.from) / (t.burst.to - t.burst.from);
    if (burstShare >= 0 && burstShare <= 1) {
      const s = lerp(t.burst.scaleFrom, t.burst.scaleTo, burstShare);
      const sprite = scaled(burst, s, fade(t.burst, burstShare));
      blit(
        frame,
        sprite,
        TILE + (TILE - sprite.width) / 2,
        2 * TILE - sprite.height - lerp(0, t.burst.rise, burstShare) - 6,
      );
    }
    const dustShare = (time - t.dust.from) / (t.dust.to - t.dust.from);
    if (dustShare >= 0 && dustShare <= 1) {
      const sprite = scaled(
        puff,
        lerp(t.dust.scaleFrom, t.dust.scaleTo, dustShare),
        1 - dustShare,
      );
      blit(
        frame,
        sprite,
        TILE + (TILE - sprite.width) / 2,
        2 * TILE - sprite.height - 10 - lerp(0, t.dust.rise, dustShare),
      );
    }
    const left = GAP + index * (board * scale + GAP);
    blit(out, frame, left, LABEL_H, scale);
    labels.push({
      text: `${time} ms${time === t.peak ? " (reduced motion)" : ""}`,
      left,
      top: 4,
      size: 13,
    });
  }
  await sheet("eruption-frames-x3.png", out, labels);
}

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
    "",
    "undead-",
    "goblin-",
    "dinosaur-",
    "martian-",
    "ice-folk-",
  ] as const;
  const columns = [
    "as authored",
    ...owners.map(
      ([name]) => `${name.charAt(0)}${name.slice(1).toLowerCase()} pennant`,
    ),
    "on Snow, garrisoned",
    ...FACTION_NAMES,
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
  const hammerer = await dwarfUnit("hammerer");
  for (const level of [1, 2, 3]) {
    const top = LABEL_H + (level - 1) * (CELL_H * scale + GAP);
    labels.push({ text: `City ${level}`, left: 6, top: top + 6 });
    const id = `chibi-direction-dwarf-city-${level}`;
    const city = await readRaster(chibi("settlements", id));
    const anchor = DWARF_FLAG_ANCHORS_V7[id];
    if (anchor === undefined) throw new Error(`${id}: no pennant anchor`);
    const cityCell = (
      under: Ground,
      piece: RgbaRaster,
      flag?: Rgb,
      garrison?: RgbaRaster,
    ): Canvas => {
      const outCell = boardCell(under, [piece], scale);
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
        hammerer,
      ),
    ];
    for (const prefix of others)
      cells.push(
        cityCell(
          ground.grass as Ground,
          await readRaster(
            chibi("settlements", `chibi-direction-${prefix}city-${level}`),
          ),
        ),
      );
    for (const [column, canvas] of cells.entries())
      blit(out, canvas, labelW + column * cell, top);
  }
  await sheet("cities-x3.png", out, labels);
}

const NAVAL_FACTIONS = [
  ["Human", "human"],
  ["Undead", "undead"],
  ["Goblin", "goblin"],
  ["Dinosaur", "dinosaur"],
  ["Martian", "martian"],
  ["Ice Folk", "ice-folk"],
  ["Dwarf", "dwarf"],
] as const;
const NAVAL_SPRITES = [
  ["patrol-boat", "Patrol Boat", 88],
  ["battleship", "Battleship", 96],
  ["transport", "Transport", 72],
] as const;

function tiled(tile: RgbaRaster, width: number, height: number): Canvas {
  const canvas = blank(width, height, [0, 0, 0]);
  for (let y = 0; y < height; y += 1)
    for (let x = 0; x < width; x += 1) {
      const s = ((y % tile.height) * tile.width + (x % tile.width)) * 4;
      canvas.data.set(tile.data.subarray(s, s + 4), (y * width + x) * 4);
    }
  return canvas;
}

async function navalSheet(): Promise<void> {
  const scale = 4;
  const shallow = await readRaster(chibi("terrain", "chibi-shallow-water-1"));
  const deep = await readRaster(chibi("terrain", "chibi-deep-water-1"));
  const rows: {
    title: string;
    file: (slug: string) => string;
    height: number;
    ground: RgbaRaster | null;
  }[] = [];
  for (const [key, title, height] of NAVAL_SPRITES) {
    rows.push({
      title: `${title}, Shallow`,
      file: (slug) => chibi("units", `chibi-naval-${slug}-${key}`),
      height,
      ground: shallow,
    });
    rows.push({
      title: `${title}, Deep`,
      file: (slug) => chibi("units", `chibi-naval-${slug}-${key}`),
      height,
      ground: deep,
    });
  }
  for (const key of ["patrol-boat", "battleship"] as const)
    rows.push({
      title: `${key === "battleship" ? "Battleship" : "Patrol Boat"} portrait`,
      file: (slug) => chibi("portraits", `chibi-naval-${slug}-portrait-${key}`),
      height: 48,
      ground: null,
    });
  const cellW = 88 * scale + GAP;
  const titleW = 260;
  const width = titleW + NAVAL_FACTIONS.length * cellW + GAP;
  const height =
    26 + rows.reduce((sum, row) => sum + row.height * scale + GAP, 0) + GAP;
  const out = blank(width, height, PAPER);
  const labels: Label[] = NAVAL_FACTIONS.map(([label], index) => ({
    text: label,
    left: titleW + index * cellW,
    top: 4,
    size: 16,
  }));
  let top = 26;
  for (const row of rows) {
    labels.push({
      text: row.title,
      left: 8,
      top: top + (row.height * scale) / 2 - 8,
      size: 16,
    });
    for (const [index, [, slug]] of NAVAL_FACTIONS.entries()) {
      const sprite = await readRaster(row.file(slug));
      const left = titleW + index * cellW;
      const under =
        row.ground === null
          ? blank(sprite.width * scale, sprite.height * scale, PANEL)
          : tiled(row.ground, sprite.width * scale, sprite.height * scale);
      blit(out, under, left, top);
      blit(out, sprite, left, top, scale);
    }
    top += row.height * scale + GAP;
  }
  await sheet("naval-x4.png", out, labels);
}

// ------------------------------------------------------------ measurements

const PLAYER: readonly [string, Rgb][] = Object.entries(
  RULESET7_PLAYER_COLORS,
).map(([name, hex]) => [name, rgbOf(hex)]);
/** Faction accents and materials the Dwarf colours are measured against. */
const REFERENCES: readonly [string, Rgb][] = [
  ["Undead violet", rgbOf("#a221ee")],
  ["Martian magenta", rgbOf("#f30a96")],
  ["Ice Folk ice blue", rgbOf("#24abfc")],
  ["Dinosaur red-orange", rgbOf("#fe7500")],
  ["Goblin leather", rgbOf("#955627")],
  ["Goblin rust", rgbOf("#8a4625")],
  ["Goblin leather shadow", rgbOf("#5f2407")],
  ["Goblin gunmetal", rgbOf("#47545b")],
  ["Goblin olive skin", rgbOf("#8a952f")],
  ["Human crimson", rgbOf("#c50d25")],
  ["Martian chrome", rgbOf("#d1dbe1")],
  ["Banned rust-dark copper", rgbOf("#8c4a2a")],
];

const BANDS: readonly {
  readonly name: string;
  readonly use: string;
  readonly test: (rgb: Rgb, h: number, s: number, v: number) => boolean;
  readonly units: "ALL" | "DWARVES" | "MACHINES";
}[] = [
  {
    name: "Outline",
    use: "the thick outline",
    units: "ALL",
    test: (_, __, ___, v) => v < 0.14,
  },
  {
    name: "Soot iron",
    use: "machine bodies, helmets, armour",
    units: "MACHINES",
    test: (_, __, s, v) => s < 0.25 && v >= 0.14 && v < 0.33,
  },
  {
    name: "Iron rim",
    use: "the light rim on lit iron edges",
    units: "MACHINES",
    test: (_, __, s, v) => s < 0.25 && v >= 0.45 && v < 0.85,
  },
  {
    name: "Copper, lit",
    use: "boilers, pipes, bands, stacks, the drill",
    units: "MACHINES",
    test: (_, h, s, v) => h >= 10 && h <= 40 && s >= 0.5 && v >= 0.7,
  },
  {
    name: "Copper, shade",
    use: "the shade of copper",
    units: "MACHINES",
    test: (_, h, s, v) => h >= 5 && h <= 40 && s >= 0.5 && v >= 0.3 && v < 0.7,
  },
  {
    name: "Ginger beard",
    use: "beards (Hammerer, Engineer)",
    units: "DWARVES",
    test: (_, h, s, v) => h >= 10 && h <= 30 && s >= 0.55 && v >= 0.55,
  },
  {
    name: "Dark leather",
    use: "aprons, straps, caps",
    units: "DWARVES",
    test: (_, h, s, v) =>
      h >= 10 && h <= 40 && s >= 0.3 && v >= 0.18 && v < 0.42,
  },
  {
    name: "Steam white",
    use: "steam and gauge faces",
    units: "ALL",
    test: (_, __, s, v) => s < 0.12 && v >= 0.88,
  },
  {
    name: "Signal-green lamp",
    use: "the reserve lamp on every machine",
    units: "ALL",
    test: (_, h, s, v) => h >= 95 && h <= 165 && s >= 0.45 && v >= 0.45,
  },
];

async function paletteAndReadability(): Promise<void> {
  const units = await Promise.all(UNITS.map(([, id]) => dwarfUnit(id)));
  const dwarves = [units[0], units[4]].filter(
    (u): u is RgbaRaster => u !== undefined,
  );
  const machines = units.filter((_, index) => index !== 0 && index !== 4);
  const palette: Record<string, unknown>[] = [];
  const means: Record<string, Rgb> = {};
  for (const band of BANDS) {
    const set =
      band.units === "ALL"
        ? units
        : band.units === "DWARVES"
          ? dwarves
          : machines;
    const measured = pixelsWhere(set, (rgb, h, s, v) =>
      band.test(rgb, h, s, v),
    );
    means[band.name] = measured.mean;
    palette.push({
      role: band.name,
      use: band.use,
      measuredOn: band.units.toLowerCase(),
      mean: hexOf(measured.mean),
      tones: measured.tones.slice(0, 4).map(([hex]) => hex),
      share: round1((measured.count / Math.max(1, measured.opaque)) * 100),
    });
  }
  // The palette swatch strip.
  const swatch = blank(BANDS.length * 64, 64, PAPER);
  BANDS.forEach((band, index) =>
    fill(swatch, index * 64 + 4, 4, 56, 56, means[band.name] ?? [0, 0, 0]),
  );
  await sheet(
    "palette.png",
    swatch,
    BANDS.map((band, index) => ({
      text: band.name.split(" ")[0] ?? "",
      left: index * 64 + 6,
      top: 42,
      size: 10,
      fill: "#101010",
    })),
  );
  await writeFile(
    path.join(OUT, "palette.json"),
    `${JSON.stringify({ bead: "pulp_wars-78i.5", note: "Measured on the eight unit masters; shares are of the opaque pixels of the units the band is measured on.", palette, presentation: DWARF_PALETTE_V7 }, null, 2)}\n`,
  );
  written.push("palette.json");
  const outline = means.Outline ?? [0, 0, 0];
  const iron = means["Soot iron"] ?? [0, 0, 0];
  const rim = means["Iron rim"] ?? [0, 0, 0];
  const copper = means["Copper, lit"] ?? [0, 0, 0];
  const copperShade = means["Copper, shade"] ?? [0, 0, 0];
  const beard = means["Ginger beard"] ?? [0, 0, 0];
  const lamp = means["Signal-green lamp"] ?? [0, 0, 0];
  const steam = means["Steam white"] ?? [0, 0, 0];
  const leather = means["Dark leather"] ?? [0, 0, 0];
  const terrain = async (name: string): Promise<Rgb> =>
    meanColour(await readRaster(chibi("terrain", name)));
  const grounds = {
    Grass: await terrain("chibi-grass-1"),
    Forest: await terrain("chibi-forest-1"),
    "Mountain rock": await terrain("chibi-mountain-ground-1"),
    Snow: rgbOf("#f5f8fc"),
    "Shallow Water": await terrain("chibi-shallow-water-1"),
    "Deep Water": await terrain("chibi-deep-water-1"),
  };
  const against = (name: string, colour: Rgb, list: readonly [string, Rgb][]) =>
    list.map(([other, rgb]) => ({
      ...colourPair(name, colour, other, rgb),
      worst: round1(worstDeltaE(colourPair(name, colour, other, rgb))),
    }));
  // Every Dwarf unit against its nearest look-alike among all other units.
  const others: [string, RgbaRaster][] = [];
  for (const [role, ids] of Object.entries(FACTION_ROSTERS))
    for (const [index, id] of ids.entries())
      others.push([
        `${FACTION_NAMES[index] ?? "?"} ${role}`,
        await readRaster(chibi("units", `chibi-direction-${id}`)),
      ]);
  const relaxed = { palette: 0, simulated: 0, lightness: 0, silhouette: 1 };
  const nearest = [] as Record<string, unknown>[];
  for (const [index, [role, , title]] of UNITS.entries()) {
    const mine = units[index];
    if (mine === undefined) continue;
    const ranked = others
      .map(([name, raster]) => ({
        name,
        measure: measurePair(mine, raster, relaxed),
      }))
      .sort((a, b) => a.measure.palette - b.measure.palette);
    const best = ranked[0];
    const sameRole = ranked.filter((entry) => entry.name.endsWith(` ${role}`));
    nearest.push({
      unit: title,
      nearest: best?.name,
      palette: best?.measure.palette,
      deuteranopia: best?.measure.deuteranopia,
      lightness: best?.measure.lightness,
      silhouette: best?.measure.silhouette,
      nearestOfRole: sameRole[0]?.name,
      paletteOfRole: sameRole[0]?.measure.palette,
    });
  }
  // The Dwarf units against each other: does the roster read as one family?
  const family = swatches(units[0] ?? blank(1, 1, [0, 0, 0]));
  const familyDistance = units.slice(1).map((unit, index) => ({
    unit: UNITS[index + 1]?.[2],
    fromHammerer: round1(
      paletteDistance(family.swatches, swatches(unit).swatches),
    ),
  }));
  const json = {
    bead: "pulp_wars-78i.5",
    measure:
      "CIE76 colour difference (about 10 is clear at a glance, 20 and more are different colours), the worst of normal vision, deuteranopia and protanopia, and the WCAG luminance contrast; band means measured on the unit masters (palette.json).",
    ironAgainstOutline: {
      sootIron: {
        iron: hexOf(iron),
        deltaE: round1(deltaE(iron, outline)),
        contrast: round1(contrast(iron, outline)),
      },
      rim: {
        rim: hexOf(rim),
        deltaE: round1(deltaE(rim, outline)),
        contrast: round1(contrast(rim, outline)),
        rimAgainstIronContrast: round1(contrast(rim, iron)),
      },
      bareSootReference: {
        colour: "#2b2a28",
        contrast: round1(contrast(rgbOf("#2b2a28"), outline)),
      },
    },
    copper: {
      lit: hexOf(copper),
      shade: hexOf(copperShade),
      litAgainst: against("copper", copper, REFERENCES),
      shadeAgainst: against("copper shade", copperShade, REFERENCES),
      specReference: {
        colour: "#c27c3a",
        againstLit: round1(deltaE(rgbOf("#c27c3a"), copper)),
      },
    },
    beard: {
      mean: hexOf(beard),
      against: against("beard", beard, [...REFERENCES, ...PLAYER]),
      againstCopper: round1(deltaE(beard, copper)),
      specReference: {
        colour: "#c8642a",
        againstMean: round1(deltaE(rgbOf("#c8642a"), beard)),
      },
    },
    leather: {
      mean: hexOf(leather),
      against: against("leather", leather, REFERENCES),
    },
    steam: { mean: hexOf(steam), against: against("steam", steam, REFERENCES) },
    lamp: {
      mean: hexOf(lamp),
      againstPlayers: against("lamp", lamp, PLAYER),
      againstAccents: against("lamp", lamp, REFERENCES),
      againstTerrain: against("lamp", lamp, Object.entries(grounds)),
    },
    onTerrain: Object.fromEntries(
      Object.entries(grounds).map(([name, rgb]) => [
        name,
        {
          iron: round1(deltaE(iron, rgb)),
          ironContrast: round1(contrast(iron, rgb)),
          rim: round1(deltaE(rim, rgb)),
          copper: round1(deltaE(copper, rgb)),
          beard: round1(deltaE(beard, rgb)),
          outlineContrast: round1(contrast(outline, rgb)),
        },
      ]),
    ),
    nearestLookAlike: nearest,
    familyDistance,
    hueCheck: units.map((unit, index) => {
      // No pixel in the owner key band (hue 340 to 5, saturated).
      let key = 0;
      for (let p = 0; p < unit.width * unit.height; p += 1) {
        const o = p * 4;
        if ((unit.data[o + 3] ?? 0) < 128) continue;
        const { hue, saturation, value } = rgbToHsv(
          unit.data[o] ?? 0,
          unit.data[o + 1] ?? 0,
          unit.data[o + 2] ?? 0,
        );
        if ((hue >= 340 || hue <= 5) && saturation >= 0.65 && value >= 0.3)
          key += 1;
      }
      return { unit: UNITS[index]?.[2], keyBandPixels: key };
    }),
  };
  await writeFile(
    path.join(OUT, "readability.json"),
    `${JSON.stringify(json, null, 2)}\n`,
  );
  written.push("readability.json");
  console.log("wrote readability.json");
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
const SCENES = ["MIXED", "TERRAIN", "COAST"] as const;
const SCENE = `globalThis.__DWARF_SCENE__`;

async function captureAll(baseUrl: string): Promise<void> {
  const chrome = process.env.CHROME_PATH;
  if (chrome === undefined || chrome === "")
    throw new Error("Set CHROME_PATH to a Chrome binary (or --skip-capture)");
  const shots: { name: string; png: Buffer }[] = [];
  const debugPort = 11_000 + (process.pid % 80);
  const profile = await mkdtemp(path.join(tmpdir(), "pulp-wars-dwarf-"));
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
      // The fixed 16 x 16 Showcase board: the scenes rewrite a patch around
      // the capital.
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
          `(async () => { const module = await import('/scripts/art/dwarf-direction/scene.ts'); ${SCENE} = module.showDwarfSceneV7(globalThis.__PULP_WARS_APP__.controller.snapshot().view, ${JSON.stringify({ kind: scene })}); return true; })()`,
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
          const name = `scene-${scene.toLowerCase()}-${viewport.name}-zoom-${step}.png`;
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

const KEY_SHEETS = [
  /^lineup(-1x|-x3)?\.(png|json)$/,
  /^lineup-study-a-x3\.png$/,
  /^roster-x4\.png$/,
  /^roster-1x\.png$/,
  /^terrain-x2\.png$/,
  /^mound-x3\.png$/,
  /^eruption-frames-x3\.png$/,
  /^cities-x3\.png$/,
  /^naval-x4\.png$/,
  /^icons-x4\.png$/,
  /^portraits-x4\.png$/,
  /^effects-x3\.png$/,
  /^readability\.json$/,
  /^palette\.json$/,
  /^scene-(mixed|terrain|coast)-(desktop|phone)-zoom-1\.png$/,
  /^scene-mixed-desktop-zoom-0\.75\.png$/,
];

async function main(): Promise<void> {
  await mkdir(OUT, { recursive: true });
  await writeLineup(
    await masterLineupSprites(),
    OUT,
    "lineup",
    "The accepted masters (the machines carry the reserve signal-green lamp).",
  );
  written.push("lineup.json", "lineup-1x.png", "lineup-x3.png");
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
  await effectsSheet();
  await moundSheet();
  await eruptionFramesSheet();
  await citiesSheet();
  await navalSheet();
  await paletteAndReadability();
  if (!process.argv.includes("--skip-capture")) {
    const port = Number.parseInt(option("--port") ?? "6534", 10);
    const given = option("--url");
    const server = given === undefined ? await startDevServer(port) : undefined;
    try {
      await captureAll(given ?? `http://localhost:${port}/`);
    } finally {
      if (server !== undefined) stopDevServer(server);
    }
  }
  const files = [...new Set(written)].sort();
  await writeFile(
    path.join(OUT, "index.json"),
    `${JSON.stringify(
      {
        bead: "pulp_wars-78i.5",
        batches: ["direction-dwarf", "naval-dwarf"],
        command: "npm run art:chibi-dwarf-direction-review",
        note: "No sheet or capture draws a base plate. The scene-* captures register the Dwarf rasters under Human (and the mounds under Dinosaur) stand-in subjects (scripts/art/dwarf-direction/scene.ts): the faction is not in the engine yet. The lineup-study-* files are the study before batching (scripts/art/dwarf-direction/lineup.ts).",
        files,
      },
      null,
      2,
    )}\n`,
  );
  console.log(`wrote index.json (${files.length} files)`);
  const copyTo = option("--copy-to");
  if (copyTo !== undefined && !copyTo.startsWith("--")) {
    await mkdir(copyTo, { recursive: true });
    for (const file of files.filter((name) =>
      KEY_SHEETS.some((key) => key.test(name)),
    ))
      await copyFile(path.join(OUT, file), path.join(copyTo, file));
    await copyFile(
      path.join(OUT, "lineup-study-a-x3.png"),
      path.join(copyTo, "lineup-study-a-x3.png"),
    ).catch(() => undefined);
    console.log(`copied the key sheets to ${copyTo}`);
  }
}

main().catch((error: unknown) => {
  console.error(
    error instanceof Error ? (error.stack ?? error.message) : "review failed",
  );
  process.exitCode = 1;
});
