/**
 * Review evidence of the Candy art (bead pulp_wars-jdb.5, batches
 * `direction-candy` and `naval-candy`, docs/art/factions/CANDY.md).
 *
 *   npm run art:chibi-candy-direction-review
 *   npm run art:chibi-candy-direction-review -- --skip-capture
 *   npm run art:chibi-candy-direction-review -- --port 6541 --copy-to DIR
 *
 * Writes art/pixellab/reviews/chibi-batch-direction-candy/. No sheet draws a
 * base plate, as the live look has none, so the Candy look must carry the
 * owner alone.
 *
 * - `lineup-{1x,x3}.png`, `lineup.json`: the spec's 32 px lineup (section
 *   15.4): the Gumdrop against the Goblin and the Yeti, the Marshmallow
 *   against the Mammoth and the Ice Witch, the Chocolate Bunny against the
 *   Sabretooth, the Confectioner against the Engineer and the Brain, in
 *   colour and greyscale, at native and half size, with the measures of
 *   scripts/art/dwarf-direction/measure.ts and their calibrated thresholds;
 * - `roster-{x4,1x}.png`, `roster-zoom-0.75.png`: each Candy unit on Grass,
 *   Forest, Mountain and Snow beside the unit of its role of the seven
 *   other factions;
 * - `terrain-x2.png`: every unit on Grass, Forest, Mountain, Mountain rock,
 *   Snow over Grass, Forest and Mountain, Shallow and Deep Water;
 * - `portraits-x4.png`, `icons-x4.png`, `effects-x3.png`;
 * - `markers-x3.png`: the Crumbs pile, the Crashed swirl, the Rushed bolt
 *   and the Splat on every ground and on Snow, over Candy and other units;
 * - `cities-x3.png`: City 1-3 as authored, on Grass and Snow, and beside
 *   the other factions' cities;
 * - `naval-x4.png`: the Candy ships on Shallow and Deep Water beside the
 *   seven other fleets, and the two portraits;
 * - `palette.{png,json}`, `readability.json`;
 * - `scene-{mixed,terrain,coast}-{desktop,phone}-zoom-{1,0.75}.png`: the
 *   scenes of scripts/art/candy-direction/scene.ts drawn by the real board
 *   host in the live look, the Candy rasters under Human stand-in subjects;
 * - `index.json`.
 *
 * Captures start Vite on port 6541 unless `--port` says otherwise, need
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
  CANDY_MARKERS_V7,
  CANDY_PALETTE_V7,
} from "../../src/assets/chibi-direction-candy-presentation";
import {
  iceFolkSnowCapsV7,
  iceFolkSnowTileV7,
} from "../../src/assets/chibi-direction-ice-folk-presentation";
import { FACTION_COLOURS_V7 } from "../../src/render/canvas/faction-colours-v7";
import { type RgbaRaster } from "./chibi/owner-mask";
import { readRaster } from "./chibi/pipeline";
import {
  calibratedThresholds,
  FACTION_ROSTERS,
} from "./dwarf-direction/lineup";
import {
  greyscale,
  measurePair,
  paletteDistance,
  resampled,
  round1,
  silhouetteOverlap,
  swatches,
} from "./dwarf-direction/measure";
import {
  colourPair,
  contrast,
  deltaE,
  hexOf,
  lab,
  rgbOf,
  worstDeltaE,
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
const OUT = path.join(ROOT, "art/pixellab/reviews/chibi-batch-direction-candy");
const TILE = 80;
/** The Candy faction colour (spec 15.4, a root ruling). */
const CANDY_COLOUR = "#ffb8d8";

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
/** Role, Candy unit id suffix, title, the Dwarf unit of the role. */
const UNITS: readonly (readonly [Role, string, string, string])[] = [
  ["FIGHTER", "gumdrop", "Gumdrop", "hammerer"],
  ["RAIDER", "donut-racer", "Donut Racer", "gyrocopter"],
  ["MARKSMAN", "gumball-gunner", "Gumball Gunner", "clockwork-gunner"],
  ["GUARD", "marshmallow", "Marshmallow", "steam-mole"],
  ["CAPTAIN", "confectioner", "Confectioner", "engineer"],
  ["CATAPULT", "pie-launcher", "Pie Launcher", "steam-cannon"],
  ["KNIGHT", "gummy-bear", "Chocolate Bunny", "steam-tank"],
  ["JUGGERNAUT", "rock-candy-golem", "Gingerbread Giant", "brass-titan"],
];
const FACTION_NAMES = [
  "Human",
  "Undead",
  "Goblin",
  "Dinosaur",
  "Martian",
  "Ice Folk",
  "Dwarf",
] as const;
const ICONS = [
  ["icon-action-sugar-rush", "Sugar Rush"],
  ["icon-action-rebake", "Re-bake"],
  ["icon-action-sugar-toss", "Sugar Toss"],
  ["icon-action-frosting", "Frosting (retired)"],
  // The Candy redesign (bead pulp_wars-jdb.14).
  ["icon-action-top-up", "Top-Up"],
  ["icon-status-stuck", "Stuck"],
  ["icon-status-toothache", "Toothache"],
  ["icon-action-splat", "Splat"],
  ["icon-action-bounce", "Bounce"],
  ["icon-status-rushed", "Rushed"],
  ["icon-status-crashed", "Crashed"],
  ["icon-status-splatted", "Splatted"],
  ["icon-tech-home-sweet-home", "Home Sweet Home"],
  ["icon-tech-peppermint-surprise", "Peppermint Surprise"],
  ["icon-candy-emblem", "Emblem"],
] as const;
const EFFECTS = [
  ["gumball-shot", "Gumball shot"],
  ["pie", "Pie in flight"],
  ["splat", "Splat"],
  ["sugar-toss", "Tossed sweet"],
  ["rebake-puff", "Re-bake puff"],
  ["peppermint-pop", "Peppermint pop"],
  ["bounce", "Bounce spring"],
] as const;
/** The spec's lineup pairs: Candy unit, then its rivals' unit ids. */
const LINEUP: readonly (readonly [string, string, readonly string[]])[] = [
  ["gumdrop", "Gumdrop", ["goblin-goblin", "ice-folk-yeti"]],
  ["marshmallow", "Marshmallow", ["ice-folk-mammoth", "ice-folk-ice-witch"]],
  ["gummy-bear", "Chocolate Bunny", ["ice-folk-sabretooth"]],
  ["confectioner", "Confectioner", ["dwarf-engineer", "martian-brain"]],
];

const chibi = (folder: string, id: string): string =>
  path.join(ROOT, "public/assets/chibi", folder, `${id}.png`);
const unit = (id: string): Promise<RgbaRaster> =>
  readRaster(chibi("units", `chibi-direction-${id}`));
const candyUnit = (name: string): Promise<RgbaRaster> => unit(`candy-${name}`);
const icon = (id: string): Promise<RgbaRaster> =>
  readRaster(chibi("icons", `chibi-direction-${id}`));
/** The other seven factions' unit of a role, Human first, Dwarf last. */
const rivals = (role: Role, dwarf: string): Promise<RgbaRaster[]> =>
  Promise.all(
    [...(FACTION_ROSTERS[role] ?? []), `dwarf-${dwarf}`].map((id) => unit(id)),
  );

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

type GroundKey =
  | "grass"
  | "forest"
  | "mountain"
  | "rock"
  | "shallow"
  | "deep"
  | "snowGrass"
  | "snowForest"
  | "snowMountain";

async function grounds(): Promise<Record<GroundKey, Ground>> {
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

interface Piece {
  readonly raster: RgbaRaster | Canvas;
  /** Master pixels the piece is raised above the cell's bottom. */
  readonly lift?: number;
  /** Master pixels the piece is moved right of the cell's centre. */
  readonly shift?: number;
  /** A whole-number divisor: 2 draws the piece at half size. */
  readonly shrink?: number;
}

/** A board cell: the ground bottom-aligned, then the pieces bottom-centred. */
function boardCell(
  ground: Ground,
  pieces: readonly (RgbaRaster | Canvas | Piece | null)[],
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
  for (const entry of pieces) {
    if (entry === null) continue;
    const piece: Piece = "raster" in entry ? entry : { raster: entry };
    const raster =
      piece.shrink === undefined
        ? piece.raster
        : shrunk(piece.raster, piece.shrink);
    blit(
      out,
      raster,
      tileLeft + ((TILE - raster.width) / 2 + (piece.shift ?? 0)) * scale,
      bottom - (raster.height + (piece.lift ?? 0)) * scale,
      scale,
    );
  }
  return out;
}

/** Nearest-neighbour reduction by a whole-number divisor, alpha kept. */
function shrunk(source: RgbaRaster | Canvas, divisor: number): Canvas {
  const width = Math.max(1, Math.floor(source.width / divisor));
  const height = Math.max(1, Math.floor(source.height / divisor));
  const data = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y += 1)
    for (let x = 0; x < width; x += 1) {
      const s =
        (Math.min(source.height - 1, Math.floor((y + 0.5) * divisor)) *
          source.width +
          Math.min(source.width - 1, Math.floor((x + 0.5) * divisor))) *
        4;
      for (let channel = 0; channel < 4; channel += 1)
        data[(y * width + x) * 4 + channel] = source.data[s + channel] ?? 0;
    }
  return { width, height, data };
}

/** Rows of cells under column titles, each row with a title at its left. */
async function gridSheet(
  name: string,
  columns: readonly string[],
  rows: readonly {
    readonly title: string;
    readonly note?: string;
    readonly cells: readonly (Canvas | null)[];
  }[],
  options: { readonly labelW?: number; readonly size?: number } = {},
): Promise<void> {
  const labelW = options.labelW ?? 150;
  const size = options.size ?? 14;
  const cellW = Math.max(
    ...rows.flatMap((row) => row.cells.map((cell) => cell?.width ?? 0)),
  );
  const heights = rows.map((row) =>
    Math.max(40, ...row.cells.map((cell) => cell?.height ?? 0)),
  );
  const count = Math.max(
    columns.length,
    ...rows.map((row) => row.cells.length),
  );
  const out = blank(
    labelW + count * (cellW + GAP) + GAP,
    LABEL_H + heights.reduce((sum, height) => sum + height + GAP, 0) + GAP,
    PAPER,
  );
  const labels: Label[] = columns.map((text, column) => ({
    text,
    left: labelW + column * (cellW + GAP),
    top: 4,
    size: Math.min(size, 13),
  }));
  let top = LABEL_H;
  for (const [index, row] of rows.entries()) {
    labels.push({ text: row.title, left: 6, top: top + 6, size });
    if (row.note !== undefined)
      labels.push({
        text: row.note,
        left: 6,
        top: top + 24,
        size: 11,
        fill: "#aab3c0",
      });
    for (const [column, cell] of row.cells.entries())
      if (cell !== null) blit(out, cell, labelW + column * (cellW + GAP), top);
    top += (heights[index] ?? 0) + GAP;
  }
  await sheet(name, out, labels);
}

// ------------------------------------------------------------ sheets

async function rosterSheet(scale: number, name: string): Promise<void> {
  const ground = await grounds();
  const rows = [];
  for (const [role, id, title, dwarf] of UNITS) {
    const sprite = await candyUnit(id);
    rows.push({
      title,
      note: role,
      cells: [
        boardCell(ground.grass, [sprite], scale),
        boardCell(ground.forest, [sprite], scale),
        boardCell(ground.mountain, [sprite], scale),
        boardCell(ground.snowGrass, [sprite], scale),
        ...(await rivals(role, dwarf)).map((other) =>
          boardCell(ground.grass, [other], scale),
        ),
      ],
    });
  }
  await gridSheet(
    name,
    ["Candy", "on Forest", "on Mountain", "on Snow", ...FACTION_NAMES],
    rows,
    { size: scale === 1 ? 11 : 14 },
  );
}

async function terrainSheet(): Promise<void> {
  const ground = await grounds();
  const keys: readonly GroundKey[] = [
    "grass",
    "forest",
    "mountain",
    "rock",
    "snowGrass",
    "snowForest",
    "snowMountain",
    "shallow",
    "deep",
  ];
  const rows = [];
  for (const [role, id, title] of UNITS) {
    const sprite = await candyUnit(id);
    rows.push({
      title,
      note: role,
      cells: keys.map((key) => boardCell(ground[key], [sprite], 2)),
    });
  }
  await gridSheet(
    "terrain-x2.png",
    keys.map((key) => ground[key].label),
    rows,
  );
}

/** A square panel with one raster centred in it. */
function panel(
  raster: RgbaRaster | Canvas,
  scale: number,
  rgb: Rgb,
  size = 56,
): Canvas {
  const out = blank(size * scale, size * scale, rgb);
  blit(
    out,
    raster,
    ((size - raster.width) / 2) * scale,
    ((size - raster.height) / 2) * scale,
    scale,
  );
  return out;
}

async function portraitsSheet(): Promise<void> {
  const ground = await grounds();
  const rows = [];
  for (const [role, id, title, dwarf] of UNITS) {
    const portrait = await readRaster(
      chibi("portraits", `chibi-direction-portrait-candy-${id}`),
    );
    const others = await Promise.all(
      [
        `portrait-${role.toLowerCase()}`,
        `portrait-goblin-${(FACTION_ROSTERS[role]?.[2] ?? "").replace("goblin-", "")}`,
        `portrait-ice-folk-${(FACTION_ROSTERS[role]?.[5] ?? "").replace("ice-folk-", "")}`,
        `portrait-dwarf-${dwarf}`,
      ].map((other) =>
        readRaster(chibi("portraits", `chibi-direction-${other}`)).catch(
          () => null,
        ),
      ),
    );
    rows.push({
      title,
      note: role,
      cells: [
        panel(portrait, 4, PANEL),
        panel(portrait, 4, LIGHT),
        panel(portrait, 1, PANEL, 224),
        boardCell(ground.grass, [await candyUnit(id)], 2),
        ...others.map((other) =>
          other === null ? null : panel(other, 4, PANEL),
        ),
      ],
    });
  }
  await gridSheet(
    "portraits-x4.png",
    [
      "Dock panel x4",
      "Light page x4",
      "1:1",
      "Map sprite x2",
      "Human",
      "Goblin",
      "Ice Folk",
      "Dwarf",
    ],
    rows,
  );
}

async function half(raster: RgbaRaster): Promise<RgbaRaster> {
  return resampled(raster, 0.5);
}

async function iconsSheet(): Promise<void> {
  const others = await Promise.all(
    [
      "icon-action-tunnel",
      "icon-action-throw-bolas",
      "icon-action-beam-down",
      "icon-status-frozen",
      "icon-tech-dig-in",
    ].map((id) => icon(id)),
  );
  const rows = [];
  for (const [id, title] of ICONS) {
    const raster = await icon(id);
    const small = await half(raster);
    rows.push({
      title,
      cells: [
        panel(raster, 4, PANEL),
        panel(raster, 4, LIGHT),
        panel(raster, 1, PANEL, 224),
        panel(small, 1, PANEL, 224),
        panel(small, 4, PANEL),
      ],
    });
  }
  rows.push({
    title: "Other factions",
    note: "Tunnel, Bolas, Beam Down, Frozen, Dig In",
    cells: others.map((raster) => panel(raster, 4, PANEL)),
  });
  await gridSheet(
    "icons-x4.png",
    ["Dock panel x4", "Light page x4", "48 px", "24 px", "24 px x4"],
    rows,
    { labelW: 190 },
  );
}

const effect = (name: string): Promise<RgbaRaster> =>
  readRaster(chibi("effects", `chibi-direction-effect-candy-${name}`));

async function effectsSheet(): Promise<void> {
  const ground = await grounds();
  const gumdrop = await candyUnit("gumdrop");
  const human = await unit("fighter");
  const goblin = await unit("goblin-goblin");
  const rows = [];
  for (const [id, title] of EFFECTS) {
    const raster = await effect(id);
    rows.push({
      title,
      note: `${raster.width} x ${raster.height}`,
      cells: [
        panel(raster, 3, PANEL, 64),
        panel(raster, 3, LIGHT, 64),
        ...(["grass", "forest", "rock", "snowGrass", "shallow"] as const).map(
          (key) => boardCell(ground[key], [{ raster, lift: 20 }], 3),
        ),
        boardCell(ground.grass, [human, { raster, lift: 24 }], 3),
        boardCell(ground.grass, [goblin, { raster, lift: 20 }], 3),
        boardCell(ground.grass, [gumdrop, { raster, lift: 14 }], 3),
      ],
    });
  }
  await gridSheet(
    "effects-x3.png",
    [
      "Dock panel",
      "Light page",
      "Grass",
      "Forest",
      "Mountain rock",
      "Snow",
      "Shallow Water",
      "over a Human",
      "over a Goblin",
      "over a Gumdrop",
    ],
    rows,
  );
}

/**
 * The markers the spec lists (15.1, 15.4): the Crumbs pile on a tile, and
 * the Crashed swirl, the Rushed bolt and the Splat on a unit, at the size
 * and place CANDY_MARKERS_V7 proposes.
 */
async function markersSheet(): Promise<void> {
  const ground = await grounds();
  const crumbs = await readRaster(
    chibi("resources", "chibi-direction-candy-crumbs"),
  );
  const crashed = await icon("icon-status-crashed");
  const rushed = await icon("icon-status-rushed");
  const splatted = await icon("icon-status-splatted");
  const keys: readonly GroundKey[] = [
    "grass",
    "forest",
    "mountain",
    "rock",
    "snowGrass",
    "snowForest",
    "snowMountain",
  ];
  const bear = await candyUnit("gummy-bear");
  const gumdrop = await candyUnit("gumdrop");
  const marshmallow = await candyUnit("marshmallow");
  const victims = await Promise.all(
    ["fighter", "goblin-orc-brute", "ice-folk-yeti", "dwarf-hammerer"].map(
      (id) => unit(id),
    ),
  );
  /** A marker over a unit's head: centred above the sprite's top row. */
  const overHead = (
    sprite: RgbaRaster,
    marker: RgbaRaster,
    divisor: number,
  ): readonly Piece[] => {
    const bounds = opaqueBounds(sprite);
    const size = Math.floor(marker.height / divisor);
    return [
      { raster: sprite },
      {
        raster: marker,
        shrink: divisor,
        lift: Math.max(0, sprite.height - bounds.top - size / 2),
      },
    ];
  };
  /** A marker on a unit's face: centred a third of the way down the body. */
  const onFace = (
    sprite: RgbaRaster,
    marker: RgbaRaster,
    divisor: number,
  ): readonly Piece[] => {
    const bounds = opaqueBounds(sprite);
    const size = Math.floor(marker.height / divisor);
    return [
      { raster: sprite },
      {
        raster: marker,
        shrink: divisor,
        lift: sprite.height - bounds.top - bounds.height / 3 - size / 2,
      },
    ];
  };
  const crashedDivisor = 48 / CANDY_MARKERS_V7.crashed.size;
  const rushedDivisor = 48 / CANDY_MARKERS_V7.rushed.size;
  const splatDivisor = 48 / CANDY_MARKERS_V7.splatted.size;
  const rows = [
    {
      title: "Crumbs",
      note: "CRUMBS, 40 x 40, on the tile",
      cells: keys.map((key) =>
        boardCell(
          ground[key],
          [{ raster: crumbs, lift: CANDY_MARKERS_V7.crumbs.lift }],
          3,
        ),
      ),
    },
    {
      title: "Crumbs with a unit on the tile",
      note: "drawn in front of the unit, at its left foot",
      cells: [
        ...victims.map((victim) =>
          boardCell(
            ground.grass,
            [victim, { raster: crumbs, lift: 2, shift: -24, shrink: 1 }],
            3,
          ),
        ),
        boardCell(
          ground.snowGrass,
          [
            victims[2] ?? null,
            { raster: crumbs, lift: 2, shift: -24, shrink: 1 },
          ],
          3,
        ),
      ],
    },
    {
      title: "Crashed",
      note: `the swirl over the head, ${CANDY_MARKERS_V7.crashed.size} px`,
      cells: [
        ...keys
          .slice(0, 5)
          .map((key, index) =>
            boardCell(
              ground[key],
              overHead(
                [bear, gumdrop, marshmallow][index % 3] ?? bear,
                crashed,
                crashedDivisor,
              ),
              3,
            ),
          ),
      ],
    },
    {
      title: "Rushed",
      note: `the bolt beside the head, ${CANDY_MARKERS_V7.rushed.size} px`,
      cells: [
        ...keys.slice(0, 5).map((key, index) => {
          const sprite = [gumdrop, bear, marshmallow][index % 3] ?? bear;
          const [body, marker] = overHead(sprite, rushed, rushedDivisor);
          return boardCell(
            ground[key],
            [body ?? null, marker ? { ...marker, shift: 18 } : null],
            3,
          );
        }),
      ],
    },
    {
      title: "Splatted",
      note: `the cream on the face, ${CANDY_MARKERS_V7.splatted.size} px`,
      cells: [
        ...victims.map((victim) =>
          boardCell(ground.grass, onFace(victim, splatted, splatDivisor), 3),
        ),
        boardCell(
          ground.snowGrass,
          onFace(victims[2] ?? bear, splatted, splatDivisor),
          3,
        ),
      ],
    },
  ];
  await gridSheet(
    "markers-x3.png",
    keys.map((key) => ground[key].label),
    rows,
    { labelW: 250 },
  );
}

const city = (faction: string, level: number): Promise<RgbaRaster> =>
  readRaster(
    chibi(
      "settlements",
      `chibi-direction-${faction === "" ? "" : `${faction}-`}city-${level}`,
    ),
  );

async function citiesSheet(): Promise<void> {
  const ground = await grounds();
  const rows = [];
  for (const level of [1, 2, 3]) {
    const own = await city("candy", level);
    const others = await Promise.all(
      ["", "undead", "goblin", "dinosaur", "martian", "ice-folk", "dwarf"].map(
        (faction) => city(faction, level),
      ),
    );
    rows.push({
      title: `City ${level}`,
      note: `${own.width} x ${own.height}`,
      cells: [
        panel(own, 3, PANEL, 100),
        cityCell(ground.grass, own),
        cityCell(ground.snowGrass, own),
        cityCell(ground.grass, own, await candyUnit("gumdrop")),
        ...others.map((other) => cityCell(ground.grass, other)),
      ],
    });
  }
  await gridSheet(
    "cities-x3.png",
    ["As authored", "on Grass", "on Snow", "garrison", ...FACTION_NAMES],
    rows,
  );
}

/** A city on its tile, the canvas bottom on the tile's bottom, at x3. */
function cityCell(
  ground: Ground,
  raster: RgbaRaster,
  garrison?: RgbaRaster,
): Canvas {
  const scale = 3;
  const size = 100;
  const out = blank(size * scale, size * scale, FRAME);
  const tileLeft = ((size - TILE) / 2) * scale;
  for (const layer of ground.layers)
    blit(
      out,
      layer,
      tileLeft + ((TILE - layer.width) / 2) * scale,
      (size - layer.height) * scale,
      scale,
    );
  blit(
    out,
    raster,
    ((size - raster.width) / 2) * scale,
    (size - raster.height) * scale,
    scale,
  );
  if (garrison !== undefined) {
    const small = shrunk(garrison, 2);
    blit(
      out,
      small,
      ((size - small.width) / 2 + 22) * scale,
      (size - small.height - 2) * scale,
      scale,
    );
  }
  return out;
}

const NAVAL_FACTIONS = [
  ["candy", "Candy"],
  ["human", "Human"],
  ["undead", "Undead"],
  ["goblin", "Goblin"],
  ["dinosaur", "Dinosaur"],
  ["martian", "Martian"],
  ["ice-folk", "Ice Folk"],
  ["dwarf", "Dwarf"],
] as const;
const NAVAL_SPRITES = [
  ["patrol-boat", "Patrol Boat"],
  ["battleship", "Battleship"],
  ["transport", "Embarked transport"],
] as const;

function tiled(tile: RgbaRaster, width: number, height: number): Canvas {
  const out = blank(width, height, [0, 0, 0]);
  for (let top = 0; top < height; top += tile.height)
    for (let left = 0; left < width; left += tile.width)
      blit(out, tile, left, top);
  return out;
}

async function navalSheet(): Promise<void> {
  const shallow = await readRaster(chibi("terrain", "chibi-shallow-water-1"));
  const deep = await readRaster(chibi("terrain", "chibi-deep-water-1"));
  const scale = 4;
  const water = (tile: RgbaRaster, sprite: RgbaRaster): Canvas => {
    const out = blank(100 * scale, 104 * scale, FRAME);
    blit(out, tiled(tile, 100, 104), 0, 0, scale);
    blit(
      out,
      sprite,
      ((100 - sprite.width) / 2) * scale,
      (104 - sprite.height - 4) * scale,
      scale,
    );
    return out;
  };
  const rows = [];
  for (const [id, title] of NAVAL_SPRITES)
    for (const [tile, name] of [
      [shallow, "Shallow Water"],
      [deep, "Deep Water"],
    ] as const)
      rows.push({
        title,
        note: `on ${name}`,
        cells: await Promise.all(
          NAVAL_FACTIONS.map(async ([faction]) =>
            water(
              tile,
              await readRaster(chibi("units", `chibi-naval-${faction}-${id}`)),
            ),
          ),
        ),
      });
  for (const [id, title] of NAVAL_SPRITES.slice(0, 2))
    rows.push({
      title: `${title} portrait`,
      note: "dock panel",
      cells: await Promise.all(
        NAVAL_FACTIONS.map(async ([faction]) =>
          panel(
            await readRaster(
              chibi("portraits", `chibi-naval-${faction}-portrait-${id}`),
            ),
            scale,
            PANEL,
            100,
          ),
        ),
      ),
    });
  await gridSheet(
    "naval-x4.png",
    NAVAL_FACTIONS.map(([, name]) => name),
    rows,
    { labelW: 180 },
  );
}

// ------------------------------------------------------------ lineup

async function lineupSheets(): Promise<void> {
  const { thresholds, pairs: calibrationPairs } = await calibratedThresholds();
  const grass = await readRaster(chibi("terrain", "chibi-grass-1"));
  const results = [];
  for (const scale of [1, 3]) {
    const cellW = 80;
    const cellH = 96;
    const columns = 3;
    const blockW = columns * (cellW * scale + GAP);
    const out = blank(
      150 + 4 * blockW + GAP,
      LABEL_H + LINEUP.length * (cellH * scale + GAP) + GAP,
      PAPER,
    );
    const labels: Label[] = [
      "Colour, native",
      "Greyscale, native",
      "Colour, half size (32 px)",
      "Greyscale, half size",
    ].map((text, block) => ({
      text,
      left: 150 + block * blockW,
      top: 4,
      size: scale === 1 ? 11 : 14,
    }));
    for (const [row, [id, title, others]] of LINEUP.entries()) {
      const top = LABEL_H + row * (cellH * scale + GAP);
      labels.push({ text: title, left: 6, top: top + 6, size: 13 });
      labels.push({
        text: `vs ${others.join(", ")}`,
        left: 6,
        top: top + 24,
        size: 10,
        fill: "#aab3c0",
      });
      const sprites = [
        await candyUnit(id),
        ...(await Promise.all(others.map((other) => unit(other)))),
      ];
      for (const [block, [grey, small]] of (
        [
          [false, false],
          [true, false],
          [false, true],
          [true, true],
        ] as const
      ).entries())
        for (const [column, sprite] of sprites.entries()) {
          const cell = blank(cellW * scale, cellH * scale, FRAME);
          const groundTile = grey ? greyscale(grass) : grass;
          blit(cell, groundTile, 0, (cellH - TILE) * scale, scale);
          let drawn: RgbaRaster = sprite;
          if (small) drawn = await resampled(drawn, 0.5);
          if (grey) drawn = greyscale(drawn);
          blit(
            cell,
            drawn,
            ((cellW - drawn.width) / 2) * scale,
            (cellH - drawn.height - (small ? 20 : 0)) * scale,
            scale,
          );
          blit(
            out,
            cell,
            150 + block * blockW + column * (cellW * scale + GAP),
            top,
          );
        }
      if (scale === 1)
        for (const [index, other] of others.entries()) {
          const measure = measurePair(
            sprites[0] as RgbaRaster,
            sprites[index + 1] as RgbaRaster,
            thresholds,
          );
          results.push({
            candy: title,
            rival: other,
            palette: round1(measure.palette),
            deuteranopia: round1(measure.deuteranopia),
            protanopia: round1(measure.protanopia),
            lightness: round1(measure.lightness),
            silhouetteOverlap: Math.round(measure.silhouette * 100) / 100,
            distinct: measure.distinct,
          });
        }
    }
    await sheet(`lineup-${scale === 1 ? "1x" : "x3"}.png`, out, labels);
  }
  await writeFile(
    path.join(OUT, "lineup.json"),
    `${JSON.stringify(
      {
        note: "The 32 px lineup of spec 15.4. Measures of scripts/art/dwarf-direction/measure.ts; a pair is distinct when its palette distance and its worse colour-vision simulation both reach their thresholds, and in greyscale its lightness distance reaches its threshold or its silhouettes overlap little enough. The thresholds are the quartiles of the same-role pairs of the six first factions.",
        calibrationPairs,
        thresholds: {
          palette: round1(thresholds.palette),
          simulated: round1(thresholds.simulated),
          lightness: round1(thresholds.lightness),
          silhouette: Math.round(thresholds.silhouette * 100) / 100,
        },
        pairs: results,
        failures: results.filter((result) => !result.distinct).length,
      },
      null,
      2,
    )}\n`,
  );
  written.push("lineup.json");
  console.log("wrote lineup.json");
}

// ------------------------------------------------------------ measures

const HUMAN_VISION = ["normal", "deuteranopia", "protanopia"] as const;

async function paletteAndReadability(): Promise<void> {
  const masters = await Promise.all(UNITS.map(([, id]) => candyUnit(id)));
  const roles: readonly (readonly [
    string,
    string,
    (rgb: Rgb, hue: number, saturation: number, value: number) => boolean,
  ])[] = [
    ["outline", "the thick chibi outline", (_rgb, _h, _s, v) => v < 0.2],
    [
      "pinkLit",
      "glaze, frosting, jelly and crystal, lit",
      (_rgb, h, s, v) => h >= 300 && h <= 358 && s >= 0.12 && v >= 0.92,
    ],
    [
      "pinkShade",
      "the shadow tone of the pink",
      (_rgb, h, s, v) =>
        h >= 300 && h <= 358 && s >= 0.2 && v >= 0.2 && v < 0.92,
    ],
    [
      "white",
      "marshmallow, cream, sugar and the hard shine",
      (_rgb, _h, s, v) => s < 0.12 && v >= 0.85,
    ],
    [
      "cream",
      "cream shade, vanilla and pale sponge",
      (_rgb, h, s, v) => h >= 15 && h <= 60 && s >= 0.12 && s < 0.4 && v >= 0.8,
    ],
    [
      "biscuit",
      "wafer, graham cracker, donut dough and caramel",
      (_rgb, h, s, v) => h >= 15 && h <= 50 && s >= 0.4 && v >= 0.6,
    ],
    [
      "chocolate",
      "chocolate, gingerbread shade and feet",
      (_rgb, h, s, v) =>
        (h <= 40 || h >= 350) && s >= 0.35 && v >= 0.2 && v < 0.6,
    ],
    [
      "mint",
      "the small mint trim",
      (_rgb, h, s, v) => h >= 110 && h <= 190 && s >= 0.12 && v >= 0.6,
    ],
  ];
  const measured = roles.map(([name, use, test]) => {
    const found = pixelsWhere(masters, test);
    return {
      name,
      use,
      hex: hexOf(found.mean),
      rgb: found.mean,
      share: Math.round((found.count / found.opaque) * 1000) / 10,
      lightness: round1(lab(found.mean)[0]),
    };
  });
  const swatch = 72;
  const paletteSheet = blank(
    GAP + measured.length * (swatch + GAP),
    LABEL_H + swatch + 44,
    PAPER,
  );
  const labels: Label[] = [];
  for (const [index, entry] of measured.entries()) {
    const left = GAP + index * (swatch + GAP);
    fill(paletteSheet, left, LABEL_H, swatch, swatch, entry.rgb);
    labels.push(
      { text: entry.name, left, top: 4, size: 12 },
      { text: entry.hex, left, top: LABEL_H + swatch + 4, size: 11 },
      {
        text: `${entry.share}%  L* ${entry.lightness}`,
        left,
        top: LABEL_H + swatch + 20,
        size: 10,
        fill: "#aab3c0",
      },
    );
  }
  await sheet("palette.png", paletteSheet, labels);
  await writeFile(
    path.join(OUT, "palette.json"),
    `${JSON.stringify(
      {
        note: "Measured on the eight accepted unit masters (after the candy-pink accent step). Shares are of the opaque pixels; the roles overlap a little and leave out a few tones.",
        roles: measured.map(({ name, use, hex, share, lightness }) => ({
          name,
          use,
          hex,
          share,
          lightness,
        })),
        codePalette: CANDY_PALETTE_V7,
      },
      null,
      2,
    )}\n`,
  );
  written.push("palette.json");

  const byName = Object.fromEntries(
    measured.map((entry) => [entry.name, entry.rgb]),
  ) as Record<string, Rgb>;
  const ground = await grounds();
  const groundMeans: Record<string, Rgb> = {
    Grass: meanColour(ground.grass.layers[0] as RgbaRaster),
    "Mountain rock": meanColour(ground.rock.layers[0] as RgbaRaster),
    "Shallow Water": meanColour(ground.shallow.layers[0] as RgbaRaster),
    "Deep Water": meanColour(ground.deep.layers[0] as RgbaRaster),
    Snow: meanColour(
      (() => {
        const tile = blank(TILE, TILE, [0, 0, 0]);
        for (const layer of ground.snowGrass.layers) blit(tile, layer, 0, 0);
        return tile;
      })(),
    ),
  };
  const pair = (aName: string, a: Rgb, bName: string, b: Rgb) => {
    const result = colourPair(aName, a, bName, b);
    return {
      a: aName,
      b: bName,
      deltaE: round1(result.deltaE),
      worst: round1(worstDeltaE(result)),
      contrast: round1(result.contrast),
    };
  };
  // The faction colour against the seven others and the grounds. The Candy
  // joined FACTION_COLOURS_V7 in bead pulp_wars-jdb.3 and are left out here:
  // the measure is the Candy look against everyone else.
  const otherFactionColours = Object.entries(FACTION_COLOURS_V7).filter(
    ([faction]) => faction !== "CANDY",
  );
  const candy = rgbOf(CANDY_COLOUR);
  const factionColour = {
    colour: CANDY_COLOUR,
    lightness: round1(lab(candy)[0]),
    againstFactions: otherFactionColours.map(([faction, hex]) =>
      pair("Candy", candy, faction, rgbOf(hex)),
    ),
    againstGrounds: Object.entries(groundMeans).map(([name, rgb]) =>
      pair("Candy", candy, name, rgb),
    ),
  };
  // The look's own tones against the faction colours and the grounds.
  const tones = ["pinkLit", "pinkShade", "white", "biscuit", "chocolate"];
  const toneChecks = tones.map((tone) => ({
    tone,
    hex: hexOf(byName[tone] as Rgb),
    againstFactionColours: otherFactionColours.map(([faction, hex]) =>
      pair(tone, byName[tone] as Rgb, faction, rgbOf(hex)),
    ),
    againstGrounds: Object.entries(groundMeans).map(([name, rgb]) =>
      pair(tone, byName[tone] as Rgb, name, rgb),
    ),
    againstOutline: round1(
      contrast(byName[tone] as Rgb, byName.outline as Rgb),
    ),
  }));
  // Every Candy unit against every unit of the other seven factions.
  const others: { id: string; raster: RgbaRaster }[] = [];
  for (const [role, , , dwarf] of UNITS)
    for (const id of [...(FACTION_ROSTERS[role] ?? []), `dwarf-${dwarf}`])
      others.push({ id, raster: await unit(id) });
  const otherSwatches = others.map((other) => ({
    ...other,
    swatches: swatches(other.raster).swatches,
  }));
  const fighter = swatches(masters[0] as RgbaRaster).swatches;
  const units = UNITS.map(([role, id, title], index) => {
    const raster = masters[index] as RgbaRaster;
    const own = swatches(raster).swatches;
    const ranked = otherSwatches
      .map((other) => ({
        unit: other.id,
        palette: round1(paletteDistance(own, other.swatches)),
        worst: round1(
          Math.min(
            ...HUMAN_VISION.map((view) =>
              paletteDistance(own, other.swatches, view),
            ),
          ),
        ),
        silhouetteOverlap:
          Math.round(silhouetteOverlap(raster, other.raster) * 100) / 100,
      }))
      .sort((a, b) => a.palette - b.palette);
    const bounds = opaqueBounds(raster);
    const pinkBand = pixelsWhere(
      [raster],
      (_rgb, h, s, v) => h >= 300 && h <= 358 && s >= 0.12 && v >= 0.2,
    );
    return {
      unit: title,
      role,
      id: `chibi-direction-candy-${id}`,
      canvas: `${raster.width} x ${raster.height}`,
      body: `${bounds.width} x ${bounds.height}`,
      rows: `${bounds.top} to ${bounds.bottom}`,
      standsAboveCanvasBottom: raster.height - 1 - bounds.bottom,
      pinkShare: Math.round((pinkBand.count / pinkBand.opaque) * 1000) / 10,
      familyDistance: round1(paletteDistance(own, fighter)),
      nearest: ranked.slice(0, 3),
    };
  });
  // No Candy pixel may sit on the Human crimson or the Martian magenta.
  const allMasters = [
    ...masters,
    ...(await Promise.all(
      UNITS.map(([, id]) =>
        readRaster(chibi("portraits", `chibi-direction-portrait-candy-${id}`)),
      ),
    )),
  ];
  const saturatedPink = pixelsWhere(
    allMasters,
    (_rgb, h, s, v) => (h >= 285 || h <= 5) && s > 0.56 && v >= 0.3,
  );
  await writeFile(
    path.join(OUT, "readability.json"),
    `${JSON.stringify(
      {
        note: "CIE76 differences; `worst` is the smallest of normal vision, deuteranopia and protanopia (Machado 2009, severity 1). About 10 is clear at a glance, 20 and more are different colours.",
        factionColour,
        tones: toneChecks,
        units,
        saturatedPinkPixels: {
          test: "hue 285 to 5, saturation above 0.56, value at least 0.3 (the Martian magenta and the Human crimson), on the unit and portrait masters",
          count: saturatedPink.count,
          opaque: saturatedPink.opaque,
        },
        markers: CANDY_MARKERS_V7,
        distances: {
          pinkLitFromCandyColour: round1(deltaE(byName.pinkLit as Rgb, candy)),
          pinkShadeFromMartianMagenta: round1(
            deltaE(byName.pinkShade as Rgb, rgbOf(FACTION_COLOURS_V7.MARTIAN)),
          ),
          pinkShadeFromHumanCrimson: round1(
            deltaE(byName.pinkShade as Rgb, rgbOf(FACTION_COLOURS_V7.ORIGINAL)),
          ),
        },
      },
      null,
      2,
    )}\n`,
  );
  written.push("readability.json");
  console.log("wrote palette.json and readability.json");
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
const SCENE = `globalThis.__CANDY_SCENE__`;

async function captureAll(baseUrl: string): Promise<void> {
  const chrome = process.env.CHROME_PATH;
  if (chrome === undefined || chrome === "")
    throw new Error("Set CHROME_PATH to a Chrome binary (or --skip-capture)");
  const shots: { name: string; png: Buffer }[] = [];
  const debugPort = 11_000 + (process.pid % 80);
  const profile = await mkdtemp(path.join(tmpdir(), "pulp-wars-candy-"));
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
          `(async () => { const module = await import('/scripts/art/candy-direction/scene.ts'); ${SCENE} = module.showCandySceneV7(globalThis.__PULP_WARS_APP__.controller.snapshot().view, ${JSON.stringify({ kind: scene })}); return true; })()`,
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
          `(() => { ${SCENE}.restore(); ${SCENE}.host.destroy(); document.querySelector('[data-chibi-review-scene]')?.remove(); delete ${SCENE}; return true; })()`,
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
  /^roster-x4\.png$/,
  /^roster-1x\.png$/,
  /^roster-zoom-0\.75\.png$/,
  /^terrain-x2\.png$/,
  /^markers-x3\.png$/,
  /^cities-x3\.png$/,
  /^naval-x4\.png$/,
  /^icons-x4\.png$/,
  /^portraits-x4\.png$/,
  /^effects-x3\.png$/,
  /^readability\.json$/,
  /^palette\.(json|png)$/,
  /^scene-(mixed|terrain|coast)-(desktop|phone)-zoom-1\.png$/,
  /^scene-mixed-desktop-zoom-0\.75\.png$/,
];

async function main(): Promise<void> {
  await mkdir(OUT, { recursive: true });
  await lineupSheets();
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
  await markersSheet();
  await citiesSheet();
  await navalSheet();
  await paletteAndReadability();
  if (!process.argv.includes("--skip-capture")) {
    const port = Number.parseInt(option("--port") ?? "6541", 10);
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
        bead: "pulp_wars-jdb.5",
        batches: ["direction-candy", "naval-candy"],
        command: "npm run art:chibi-candy-direction-review",
        note: "No sheet or capture draws a base plate. The scene-* captures register the Candy rasters under Human stand-in subjects, show a Grave glyph where Crumbs would lie, and draw the stand-in seat's border in the Candy pink (scripts/art/candy-direction/scene.ts): the faction is not in the engine yet. With --skip-capture the scene-* files of an earlier run are kept and not listed here.",
        files,
      },
      null,
      2,
    )}\n`,
  );
  const copyTo = option("--copy-to");
  if (copyTo !== undefined) {
    await mkdir(copyTo, { recursive: true });
    for (const file of files)
      if (KEY_SHEETS.some((pattern) => pattern.test(file)))
        await copyFile(path.join(OUT, file), path.join(copyTo, file));
    console.log(`copied the key sheets to ${copyTo}`);
  }
  console.log(`wrote ${files.length + 1} files to ${path.relative(ROOT, OUT)}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "review failed");
  process.exitCode = 1;
});
