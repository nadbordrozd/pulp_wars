/**
 * Review evidence of the map curiosity art (bead pulp_wars-737.5, batch
 * `curiosities`, docs/art/classes/curiosities.md).
 *
 *   npm run art:curiosities-review
 *   npm run art:curiosities-review -- --copy-to DIR
 *   npm run art:curiosities-review -- --preview spider-a,web-b:0 --out DIR
 *
 * Writes art/pixellab/reviews/chibi-batch-curiosities/:
 *
 * - `pieces-{x4,1x}.png` and `pieces-zoom-0.75.png`: every board piece on
 *   each terrain it may stand on (the Giant Spider and its lair web on
 *   Grass, Forest and Mountain; the Fountain on Grass; the Shrine on Grass
 *   and Forest; the Wreck on Shallow and Deep Water), the Spider on its
 *   web, and a Fighter and a Juggernaut on the Fountain and on the web;
 * - `scale-{x2,1x}.png`: the Spider beside a Human Fighter and the
 *   Juggernaut-class giant of every faction;
 * - `interface-x4.png` and `interface-1x.png`: the portrait, the legend
 *   icons, the bounty icon, the effect sprites and the provoked marker on
 *   the dark dock panel and on a light page, the effects over a Fighter,
 *   and the marker at its 16 px board size over the Spider;
 * - `scene-{x2,1x}.png` and `scene-zoom-0.75.png`: a small mixed board mock
 *   with every piece beside units, a Village, a Treasure chest and a Farm;
 * - `readability.json`: each master's opaque bounds, its distance (CIE76)
 *   from the seven faction colours, how much of the Fountain and the web
 *   shows beside a unit, the Spider's size against the giants and its
 *   ground-contact measurement (scripts/art/unit-shadows/measure.ts);
 * - `index.json`.
 *
 * The art is not wired into the board yet (bead pulp_wars-737.6), so every
 * sheet is composed from the masters; no browser capture and no PixelLab
 * call is made. `--preview` lays raw candidates of the named recipes out
 * the same way before acceptance and writes them to `--out DIR`.
 */
import { copyFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import sharp from "sharp";
import type { ArtSubjectV7 } from "../../src/assets/chibi-art-v7";
import { FACTION_COLOURS_V7 } from "../../src/render/canvas/faction-colours-v7";
import {
  findAsset,
  type ChibiAssetSpec,
  type ChibiBatchManifest,
} from "./chibi/batch-manifest";
import { rgbToHsv, type RgbaRaster } from "./chibi/owner-mask";
import {
  encodePng,
  loadBatchManifest,
  loadRecords,
  masterPaths,
  productionLayout,
  readRaster,
  type BatchRecords,
} from "./chibi/pipeline";
import { candidateCell, cropRaster, opaqueBounds } from "./chibi/raster";
import { measureUnitFootprintV7 } from "./unit-shadows/measure";

const ROOT = process.cwd();
const BATCH = "curiosities";
const OUT = path.join(ROOT, "art/pixellab/reviews/chibi-batch-curiosities");
const CELL = 80;
type Rgb = readonly [number, number, number];
type Raster = RgbaRaster & { readonly data: Uint8Array };

function option(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index < 0 ? undefined : process.argv[index + 1];
}

// ---------------------------------------------------------------- rasters

function blank(width: number, height: number, fill: Rgb | null): Raster {
  const data = new Uint8Array(width * height * 4);
  if (fill !== null)
    for (let index = 0; index < width * height; index += 1)
      data.set([fill[0], fill[1], fill[2], 255], index * 4);
  return { width, height, data };
}

/** Source over destination; pixels outside the destination are dropped. */
function blit(target: Raster, source: RgbaRaster, left: number, top: number) {
  for (let y = 0; y < source.height; y += 1) {
    const ty = top + y;
    if (ty < 0 || ty >= target.height) continue;
    for (let x = 0; x < source.width; x += 1) {
      const tx = left + x;
      if (tx < 0 || tx >= target.width) continue;
      const from = (y * source.width + x) * 4;
      const alpha = (source.data[from + 3] ?? 0) / 255;
      if (alpha === 0) continue;
      const to = (ty * target.width + tx) * 4;
      const under = (target.data[to + 3] ?? 0) / 255;
      const out = alpha + under * (1 - alpha);
      for (let channel = 0; channel < 3; channel += 1)
        target.data[to + channel] = Math.round(
          ((source.data[from + channel] ?? 0) * alpha +
            (target.data[to + channel] ?? 0) * under * (1 - alpha)) /
            out,
        );
      target.data[to + 3] = Math.round(out * 255);
    }
  }
}

function upscale(raster: RgbaRaster, factor: number): Raster {
  const out = blank(raster.width * factor, raster.height * factor, null);
  for (let y = 0; y < out.height; y += 1)
    for (let x = 0; x < out.width; x += 1) {
      const from =
        (Math.floor(y / factor) * raster.width + Math.floor(x / factor)) * 4;
      out.data.set(
        raster.data.subarray(from, from + 4),
        (y * out.width + x) * 4,
      );
    }
  return out;
}

/** The marker's board size: a 32 px master drawn into 16 CSS px. */
async function halve(raster: RgbaRaster): Promise<Raster> {
  return readRaster(
    await sharp(await encodePng(raster))
      .resize(raster.width / 2, raster.height / 2, { kernel: "lanczos3" })
      .png()
      .toBuffer(),
  );
}

const chibi = (file: string): string =>
  path.join(ROOT, "public/assets/chibi", `${file}.png`);

// ------------------------------------------------------------------ pieces

type Terrain = "GRASS" | "FOREST" | "MOUNTAIN" | "SHALLOW" | "DEEP";
const TERRAIN_FILE: Readonly<Record<Terrain, string>> = {
  GRASS: "terrain/chibi-grass-1",
  FOREST: "terrain/chibi-forest-1",
  MOUNTAIN: "terrain/chibi-mountain-1",
  SHALLOW: "terrain/chibi-shallow-water-1",
  DEEP: "terrain/chibi-deep-water-1",
};
const TERRAIN_LABEL: Readonly<Record<Terrain, string>> = {
  GRASS: "Grass",
  FOREST: "Forest",
  MOUNTAIN: "Mountain",
  SHALLOW: "Shallow",
  DEEP: "Deep",
};

/** Asset id slugs of this batch, by what the sheets call them. */
const IDS = {
  spider: "chibi-curiosity-giant-spider",
  portrait: "chibi-curiosity-portrait-giant-spider",
  web: "chibi-curiosity-web",
  fountain: "chibi-curiosity-fountain",
  shrine: "chibi-curiosity-shrine",
  wreck: "chibi-curiosity-wreck",
  iconWeb: "chibi-curiosity-icon-web",
  iconFountain: "chibi-curiosity-icon-fountain",
  iconShrine: "chibi-curiosity-icon-shrine",
  iconWreck: "chibi-curiosity-icon-wreck",
  iconBounty: "chibi-curiosity-icon-bounty",
  heal: "chibi-curiosity-effect-fountain-heal",
  blessing: "chibi-curiosity-effect-shrine-blessing",
  salvage: "chibi-curiosity-effect-salvage-coins",
  provoked: "chibi-curiosity-status-provoked",
} as const;
type PieceKey = keyof typeof IDS;

/** The Juggernaut-class giant of every faction, for the scale sheet. */
const GIANTS: readonly (readonly [string, string])[] = [
  ["Human", "units/chibi-direction-juggernaut"],
  ["Undead", "units/chibi-direction-undead-abomination"],
  ["Goblin", "units/chibi-direction-goblin-troll"],
  ["Dinosaur", "units/chibi-direction-dinosaur-brontosaurus"],
  ["Martian", "units/chibi-direction-martian-colossus"],
  ["Ice Folk", "units/chibi-direction-ice-folk-frost-giant"],
  ["Dwarf", "units/chibi-direction-dwarf-brass-titan"],
];

interface Library {
  readonly terrain: Readonly<Record<Terrain, Raster>>;
  readonly fighter: Raster;
  readonly juggernaut: Raster;
  readonly pieces: Partial<Record<PieceKey, Raster>>;
}

async function loadLibrary(
  pieces: Partial<Record<PieceKey, Raster>>,
): Promise<Library> {
  const terrain = {} as Record<Terrain, Raster>;
  for (const [name, file] of Object.entries(TERRAIN_FILE))
    terrain[name as Terrain] = await readRaster(chibi(file));
  return {
    terrain,
    fighter: await readRaster(chibi("units/chibi-direction-fighter")),
    juggernaut: await readRaster(chibi("units/chibi-direction-juggernaut")),
    pieces,
  };
}

/** The accepted masters of the batch, by sheet key. */
async function acceptedPieces(
  manifest: ChibiBatchManifest,
  records: BatchRecords,
): Promise<Partial<Record<PieceKey, Raster>>> {
  const layout = productionLayout(ROOT, BATCH);
  const pieces: Partial<Record<PieceKey, Raster>> = {};
  for (const [key, id] of Object.entries(IDS)) {
    if (records.assets[id]?.status !== "ACCEPTED") continue;
    pieces[key as PieceKey] = await readRaster(
      masterPaths(layout, findAsset(manifest, id)).master,
    );
  }
  return pieces;
}

// ------------------------------------------------------------------ stages

/** One cell with headroom for tall terrain and giants, and a side margin. */
const STAGE = { width: 104, height: 116, cellLeft: 12, cellTop: 30 } as const;
const PANEL: Rgb = [38, 42, 54];
const DOCK: Rgb = [31, 36, 48];
const PAGE: Rgb = [244, 241, 232];

type Thing =
  | { readonly kind: "overlay"; readonly raster: RgbaRaster }
  | { readonly kind: "unit"; readonly raster: RgbaRaster }
  | {
      readonly kind: "centre";
      readonly raster: RgbaRaster;
      readonly dy?: number;
    };

/** Draws things on one cell whose top-left corner is (left, top). */
function drawCell(
  target: Raster,
  left: number,
  top: number,
  things: readonly Thing[],
): void {
  for (const thing of things) {
    const { raster } = thing;
    if (thing.kind === "overlay")
      blit(target, raster, left + (CELL - raster.width) / 2, top);
    else if (thing.kind === "unit")
      // Bottom-centred: the anchor (width / 2, height - 40) is the cell centre.
      blit(
        target,
        raster,
        left + CELL / 2 - raster.width / 2,
        top + CELL - raster.height,
      );
    else
      blit(
        target,
        raster,
        left + CELL / 2 - Math.floor(raster.width / 2),
        top + CELL / 2 - Math.floor(raster.height / 2) + (thing.dy ?? 0),
      );
  }
}

function drawTerrain(
  target: Raster,
  library: Library,
  terrain: Terrain,
  left: number,
  top: number,
): void {
  const tile = library.terrain[terrain];
  // Tall terrain is bottom-centred on its cell over a Grass ground.
  blit(target, tile, left, top + CELL - tile.height);
}

interface Stage {
  readonly label: string;
  readonly terrain?: Terrain;
  readonly fill?: Rgb;
  readonly things: readonly Thing[];
}

interface Label {
  readonly left: number;
  readonly top: number;
  readonly text: string;
}

function escapeXml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

/** Rows of stages at 1:1, with the label positions under each stage. */
function stageSheet(
  library: Library,
  rows: readonly (readonly Stage[])[],
): { readonly raster: Raster; readonly labels: Label[] } {
  const columns = Math.max(...rows.map((row) => row.length));
  const rowHeight = STAGE.height + 12;
  const raster = blank(columns * STAGE.width, rows.length * rowHeight, PANEL);
  const labels: Label[] = [];
  rows.forEach((row, rowIndex) =>
    row.forEach((stage, column) => {
      const left = column * STAGE.width;
      const top = rowIndex * rowHeight;
      if (stage.fill !== undefined)
        blit(
          raster,
          blank(STAGE.width - 8, STAGE.height - 8, stage.fill),
          left + 4,
          top + 4,
        );
      if (stage.terrain !== undefined)
        drawTerrain(
          raster,
          library,
          stage.terrain,
          left + STAGE.cellLeft,
          top + STAGE.cellTop,
        );
      drawCell(
        raster,
        left + STAGE.cellLeft,
        top + STAGE.cellTop,
        stage.things,
      );
      labels.push({
        left: left + 4,
        top: top + STAGE.height,
        text: stage.label,
      });
    }),
  );
  return { raster, labels };
}

/** Writes a 1:1 layout at an integer scale with its labels drawn sharp. */
async function writeSheet(
  file: string,
  sheet: { readonly raster: Raster; readonly labels: readonly Label[] },
  scale: number,
): Promise<void> {
  const big = scale === 1 ? sheet.raster : upscale(sheet.raster, scale);
  const size = scale === 1 ? 9 : 7 * Math.min(scale, 3);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${big.width}" height="${big.height}">${sheet.labels
    .map(
      (label) =>
        `<text x="${label.left * scale}" y="${label.top * scale + size}" font-family="Helvetica, Arial, sans-serif" font-size="${size}" font-weight="700" fill="#f4f1e8">${escapeXml(label.text)}</text>`,
    )
    .join("")}</svg>`;
  await mkdir(path.dirname(file), { recursive: true });
  await sharp(await encodePng(big))
    .composite([{ input: Buffer.from(svg), left: 0, top: 0 }])
    .png({ compressionLevel: 9 })
    .toFile(file);
}

async function writeZoomed(file: string, source: string): Promise<void> {
  const meta = await sharp(source).metadata();
  await sharp(source)
    .resize(
      Math.round((meta.width ?? 0) * 0.75),
      Math.round((meta.height ?? 0) * 0.75),
      {
        kernel: "lanczos3",
      },
    )
    .png({ compressionLevel: 9 })
    .toFile(file);
}

// ------------------------------------------------------------------ sheets

/** The stages one board piece is judged on. */
function boardStages(
  library: Library,
  key: PieceKey,
  raster: Raster,
  name: string,
): Stage[] {
  const { pieces, fighter, juggernaut } = library;
  const on = (
    terrain: Terrain,
    things: readonly Thing[],
    note = "",
  ): Stage => ({
    label: `${name} · ${TERRAIN_LABEL[terrain]}${note}`,
    terrain,
    things,
  });
  if (key === "spider") {
    const unit: Thing = { kind: "unit", raster };
    return [
      on("GRASS", [unit]),
      on("FOREST", [unit]),
      on("MOUNTAIN", [unit]),
      ...(pieces.web === undefined
        ? []
        : [
            on(
              "GRASS",
              [{ kind: "overlay", raster: pieces.web }, unit],
              " + web",
            ),
          ]),
      { label: `${name} · dark`, fill: DOCK, things: [unit] },
    ];
  }
  const overlay: Thing = { kind: "overlay", raster };
  if (key === "web")
    return [
      on("GRASS", [overlay]),
      on("FOREST", [overlay]),
      on("MOUNTAIN", [overlay]),
      ...(pieces.spider === undefined
        ? []
        : [
            on(
              "GRASS",
              [overlay, { kind: "unit", raster: pieces.spider }],
              " + Spider",
            ),
          ]),
      on("GRASS", [overlay, { kind: "unit", raster: fighter }], " + Fighter"),
      { label: `${name} · dark`, fill: DOCK, things: [overlay] },
    ];
  if (key === "fountain")
    return [
      on("GRASS", [overlay]),
      on("GRASS", [overlay, { kind: "unit", raster: fighter }], " + Fighter"),
      on(
        "GRASS",
        [overlay, { kind: "unit", raster: juggernaut }],
        " + Juggernaut",
      ),
      { label: `${name} · dark`, fill: DOCK, things: [overlay] },
    ];
  if (key === "shrine")
    return [
      on("GRASS", [overlay]),
      on("FOREST", [overlay]),
      on("GRASS", [overlay, { kind: "unit", raster: fighter }], " + Fighter"),
      { label: `${name} · dark`, fill: DOCK, things: [overlay] },
    ];
  if (key === "wreck")
    return [
      on("SHALLOW", [overlay]),
      on("DEEP", [overlay]),
      { label: `${name} · dark`, fill: DOCK, things: [overlay] },
    ];
  // Interface and effect pieces.
  const centre: Thing = { kind: "centre", raster };
  const stages: Stage[] = [
    { label: `${name} · dock`, fill: DOCK, things: [centre] },
    { label: `${name} · page`, fill: PAGE, things: [centre] },
  ];
  if (key === "heal" || key === "blessing")
    stages.push(
      on(
        "GRASS",
        [
          { kind: "unit", raster: fighter },
          { kind: "centre", raster, dy: -14 },
        ],
        " over Fighter",
      ),
    );
  if (key === "salvage")
    stages.push(on("SHALLOW", [centre]), on("DEEP", [centre]));
  if (key === "provoked") {
    // Placeholder position: above the unit, where the UI bead may put it.
    const spider = pieces.spider;
    stages.push({
      label: `${name} · 32 px on Grass`,
      terrain: "GRASS",
      things: [centre],
    });
    if (spider !== undefined)
      stages.push({
        label: `${name} · 16 px over Spider`,
        terrain: "GRASS",
        things: [{ kind: "unit", raster: spider }],
      });
  }
  return stages;
}

const NAMES: Readonly<Record<PieceKey, string>> = {
  spider: "Giant Spider",
  portrait: "Portrait",
  web: "Lair web",
  fountain: "Fountain",
  shrine: "Shrine",
  wreck: "Wreck",
  iconWeb: "Icon web",
  iconFountain: "Icon fountain",
  iconShrine: "Icon shrine",
  iconWreck: "Icon wreck",
  iconBounty: "Icon bounty",
  heal: "Fountain heal",
  blessing: "Shrine blessing",
  salvage: "Salvage coins",
  provoked: "Provoked",
};
const BOARD_KEYS: readonly PieceKey[] = [
  "spider",
  "web",
  "fountain",
  "shrine",
  "wreck",
];
const INTERFACE_KEYS: readonly PieceKey[] = [
  "portrait",
  "iconWeb",
  "iconFountain",
  "iconShrine",
  "iconWreck",
  "iconBounty",
  "heal",
  "blessing",
  "salvage",
  "provoked",
];

/** Adds the 16 px marker to the stages that ask for it. */
async function withMarker(
  library: Library,
  sheet: { readonly raster: Raster; readonly labels: Label[] },
  rows: readonly (readonly Stage[])[],
): Promise<void> {
  const marker = library.pieces.provoked;
  if (marker === undefined) return;
  const small = await halve(marker);
  rows.forEach((row, rowIndex) =>
    row.forEach((stage, column) => {
      if (!stage.label.includes("16 px")) return;
      blit(
        sheet.raster,
        small,
        column * STAGE.width + STAGE.cellLeft + CELL - 20,
        rowIndex * (STAGE.height + 12) + STAGE.cellTop + 2,
      );
    }),
  );
}

async function pieceSheets(
  library: Library,
  keys: readonly PieceKey[],
  out: string,
  name: string,
  scales: readonly number[],
): Promise<string[]> {
  const rows = keys.flatMap((key) => {
    const raster = library.pieces[key];
    return raster === undefined
      ? []
      : [boardStages(library, key, raster, NAMES[key])];
  });
  if (rows.length === 0) return [];
  const sheet = stageSheet(library, rows);
  await withMarker(library, sheet, rows);
  const files: string[] = [];
  for (const scale of scales) {
    const file = `${name}-${scale === 1 ? "1x" : `x${scale}`}.png`;
    await writeSheet(path.join(out, file), sheet, scale);
    files.push(file);
  }
  return files;
}

/** The Spider beside a Fighter and the giants, each on its own Grass cell. */
async function scaleSheet(library: Library, out: string): Promise<string[]> {
  const spider = library.pieces.spider;
  if (spider === undefined) return [];
  const row: Stage[] = [
    {
      label: "Fighter",
      terrain: "GRASS",
      things: [{ kind: "unit", raster: library.fighter }],
    },
    {
      label: "Giant Spider",
      terrain: "GRASS",
      things: [{ kind: "unit", raster: spider }],
    },
  ];
  for (const [label, file] of GIANTS)
    row.push({
      label,
      terrain: "GRASS",
      things: [{ kind: "unit", raster: await readRaster(chibi(file)) }],
    });
  const sheet = stageSheet(library, [row]);
  await writeSheet(path.join(out, "scale-x2.png"), sheet, 2);
  await writeSheet(path.join(out, "scale-1x.png"), sheet, 1);
  return ["scale-x2.png", "scale-1x.png"];
}

/** A 7 x 5 board mock: every piece among ordinary map content. */
async function sceneSheet(library: Library, out: string): Promise<string[]> {
  const { pieces } = library;
  if (BOARD_KEYS.some((key) => pieces[key] === undefined)) return [];
  const rows = ["FFGGGSD", "FGGGGSD", "GGGMGSS", "GGGMMGS", "GFGGGGS"];
  const terrainOf: Readonly<Record<string, Terrain>> = {
    G: "GRASS",
    F: "FOREST",
    M: "MOUNTAIN",
    S: "SHALLOW",
    D: "DEEP",
  };
  const top = 28;
  const raster = blank(7 * CELL, top + 5 * CELL, PANEL);
  const grass = library.terrain.GRASS;
  rows.forEach((row, y) =>
    [...row].forEach((code, x) => {
      const terrain = terrainOf[code] ?? "GRASS";
      if (terrain === "FOREST" || terrain === "MOUNTAIN")
        blit(raster, grass, x * CELL, top + y * CELL);
      else drawTerrain(raster, library, terrain, x * CELL, top + y * CELL);
    }),
  );
  const extra = async (file: string): Promise<Raster> =>
    readRaster(chibi(file));
  const village = await extra("settlements/chibi-direction-village");
  const treasure = await extra("resources/chibi-treasure");
  const windmill = await extra("buildings/chibi-direction-windmill");
  const skeleton = await extra("units/chibi-direction-undead-skeleton");
  const boat = await extra("units/chibi-patrol-boat");
  const unit = (raster: RgbaRaster): Thing => ({ kind: "unit", raster });
  const overlay = (key: PieceKey): Thing => ({
    kind: "overlay",
    raster: pieces[key] as Raster,
  });
  /** Cell contents, drawn row by row so a lower row overlaps the one above. */
  const content: Readonly<Record<string, readonly Thing[]>> = {
    "2,0": [overlay("shrine")],
    "4,0": [unit(village)],
    "5,0": [overlay("wreck")],
    "1,1": [overlay("fountain"), unit(library.fighter)],
    "3,1": [unit(windmill)],
    "6,1": [overlay("wreck")],
    "0,2": [{ kind: "centre", raster: treasure }],
    "2,2": [overlay("web"), unit(pieces.spider as Raster)],
    "5,2": [unit(boat)],
    "1,3": [unit(skeleton)],
    "5,3": [overlay("fountain")],
    "0,4": [unit(library.juggernaut)],
    "2,4": [overlay("web")],
    "4,4": [overlay("shrine"), unit(library.fighter)],
  };
  rows.forEach((row, y) => {
    [...row].forEach((code, x) => {
      const terrain = terrainOf[code] ?? "GRASS";
      if (terrain === "FOREST" || terrain === "MOUNTAIN")
        drawTerrain(raster, library, terrain, x * CELL, top + y * CELL);
    });
    [...row].forEach((_, x) =>
      drawCell(raster, x * CELL, top + y * CELL, content[`${x},${y}`] ?? []),
    );
  });
  const sheet = { raster, labels: [] };
  await writeSheet(path.join(out, "scene-x2.png"), sheet, 2);
  await writeSheet(path.join(out, "scene-1x.png"), sheet, 1);
  await writeZoomed(
    path.join(out, "scene-zoom-0.75.png"),
    path.join(out, "scene-1x.png"),
  );
  return ["scene-x2.png", "scene-1x.png", "scene-zoom-0.75.png"];
}

// ------------------------------------------------------------ measurements

function lab(rgb: Rgb): readonly [number, number, number] {
  const linear = rgb.map((value) => {
    const channel = value / 255;
    return channel <= 0.04045
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  const x =
    (linear[0] * 0.4124 + linear[1] * 0.3576 + linear[2] * 0.1805) / 0.95047;
  const y = linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
  const z =
    (linear[0] * 0.0193 + linear[1] * 0.1192 + linear[2] * 0.9505) / 1.08883;
  const f = (t: number): number =>
    t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116;
  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
}

/** CIE76 colour difference. */
function deltaE(left: Rgb, right: Rgb): number {
  const a = lab(left);
  const b = lab(right);
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

function hexRgb(hex: string): Rgb {
  const value = Number.parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

const hex = (rgb: Rgb): string =>
  `#${rgb.map((value) => Math.round(value).toString(16).padStart(2, "0")).join("")}`;

/** A pixel within this CIE76 distance of a faction colour counts as near it. */
export const FACTION_NEAR_DELTA_E = 25;
/** Pixels this saturated and bright can read as a colour at all. */
const SATURATED = { saturation: 0.5, value: 0.45 } as const;

/**
 * How a master sits among the faction colours: its mean opaque colour, the
 * share of opaque pixels that are saturated, and per faction the share of
 * opaque pixels within FACTION_NEAR_DELTA_E of that faction's colour.
 */
export function paletteReport(raster: RgbaRaster): {
  readonly opaque: number;
  readonly mean: string;
  readonly saturatedShare: number;
  readonly nearFaction: Readonly<Record<string, number>>;
  readonly nearestFaction: { readonly faction: string; readonly share: number };
} {
  const factions = Object.entries(FACTION_COLOURS_V7).map(
    ([faction, colour]) => [faction, hexRgb(colour)] as const,
  );
  const near: Record<string, number> = Object.fromEntries(
    factions.map(([faction]) => [faction, 0]),
  );
  let opaque = 0;
  let saturated = 0;
  const sum = [0, 0, 0];
  for (let index = 0; index < raster.width * raster.height; index += 1) {
    if ((raster.data[index * 4 + 3] ?? 0) < 128) continue;
    const rgb: Rgb = [
      raster.data[index * 4] ?? 0,
      raster.data[index * 4 + 1] ?? 0,
      raster.data[index * 4 + 2] ?? 0,
    ];
    opaque += 1;
    rgb.forEach((value, channel) => {
      sum[channel] = (sum[channel] ?? 0) + value;
    });
    const hsv = rgbToHsv(rgb[0], rgb[1], rgb[2]);
    if (hsv.saturation >= SATURATED.saturation && hsv.value >= SATURATED.value)
      saturated += 1;
    for (const [faction, colour] of factions)
      if (deltaE(rgb, colour) <= FACTION_NEAR_DELTA_E)
        near[faction] = (near[faction] ?? 0) + 1;
  }
  const share = (count: number): number =>
    opaque === 0 ? 0 : Math.round((count / opaque) * 1000) / 1000;
  const nearFaction = Object.fromEntries(
    Object.entries(near).map(([faction, count]) => [faction, share(count)]),
  );
  const nearest = Object.entries(nearFaction).sort(
    (left, right) => right[1] - left[1],
  )[0] ?? ["none", 0];
  return {
    opaque,
    mean: hex(
      sum.map((value) => value / Math.max(1, opaque)) as unknown as Rgb,
    ),
    saturatedShare: share(saturated),
    nearFaction,
    nearestFaction: { faction: nearest[0], share: nearest[1] },
  };
}

/**
 * How much of a cell overlay still shows with a unit standing on the cell:
 * the share of the overlay's opaque pixels the unit's opaque pixels do not
 * cover, and how many overlay columns show left and right of the unit.
 */
export function visibleBesideUnit(
  overlay: RgbaRaster,
  unit: RgbaRaster,
): { readonly share: number; readonly pixels: number } {
  const stage = blank(CELL + 16, CELL + 32, null);
  drawCell(stage, 8, 32, [{ kind: "unit", raster: unit }]);
  let opaque = 0;
  let visible = 0;
  for (let y = 0; y < overlay.height; y += 1)
    for (let x = 0; x < overlay.width; x += 1) {
      if ((overlay.data[(y * overlay.width + x) * 4 + 3] ?? 0) < 128) continue;
      opaque += 1;
      const sx = 8 + (CELL - overlay.width) / 2 + x;
      const sy = 32 + y;
      if ((stage.data[(sy * stage.width + sx) * 4 + 3] ?? 0) < 128)
        visible += 1;
    }
  return {
    share: opaque === 0 ? 0 : Math.round((visible / opaque) * 1000) / 1000,
    pixels: visible,
  };
}

async function readability(library: Library): Promise<unknown> {
  const { pieces } = library;
  const masters: Record<string, unknown> = {};
  for (const [key, raster] of Object.entries(pieces)) {
    const bounds = opaqueBounds(raster);
    masters[IDS[key as PieceKey]] = {
      canvas: `${raster.width} x ${raster.height}`,
      opaqueBounds: bounds,
      opaqueSize:
        bounds === null
          ? null
          : `${bounds.right - bounds.left + 1} x ${bounds.bottom - bounds.top + 1}`,
      palette: paletteReport(raster),
    };
  }
  const size = (raster: RgbaRaster): { width: number; height: number } => {
    const bounds = opaqueBounds(raster);
    return bounds === null
      ? { width: 0, height: 0 }
      : {
          width: bounds.right - bounds.left + 1,
          height: bounds.bottom - bounds.top + 1,
        };
  };
  const giants: Record<string, unknown> = {};
  for (const [label, file] of GIANTS)
    giants[label] = size(await readRaster(chibi(file)));
  const spider = pieces.spider;
  return {
    note: "CIE76 distances; nearFaction is the share of opaque pixels within the threshold of a faction colour. Gold coins are near the Goblin hazard yellow by design (docs/art/classes/curiosities.md section 1).",
    factionNearDeltaE: FACTION_NEAR_DELTA_E,
    factionColours: FACTION_COLOURS_V7,
    masters,
    spider:
      spider === undefined
        ? null
        : {
            opaqueSize: size(spider),
            fighter: size(library.fighter),
            giants,
            // scripts/art/unit-shadows/measure.ts, as the live units' table.
            footprint: measureUnitFootprintV7(spider),
          },
    underUnits: {
      fountainBesideFighter:
        pieces.fountain === undefined
          ? null
          : visibleBesideUnit(pieces.fountain, library.fighter),
      fountainBesideJuggernaut:
        pieces.fountain === undefined
          ? null
          : visibleBesideUnit(pieces.fountain, library.juggernaut),
      webBesideSpider:
        pieces.web === undefined || spider === undefined
          ? null
          : visibleBesideUnit(pieces.web, spider),
      webBesideFighter:
        pieces.web === undefined
          ? null
          : visibleBesideUnit(pieces.web, library.fighter),
    },
  };
}

// ------------------------------------------------------------------- main

/** `recipe[:candidate]` raw candidates in place of the accepted masters. */
async function previewPieces(
  manifest: ChibiBatchManifest,
  records: BatchRecords,
  names: readonly string[],
): Promise<{ key: PieceKey; label: string; raster: Raster }[]> {
  const out: { key: PieceKey; label: string; raster: Raster }[] = [];
  for (const name of names) {
    const [recipeId = "", index = "0"] = name.split(":");
    const record = records.recipes[recipeId];
    if (record?.rawSheet === undefined || record.candidateSize === undefined)
      throw new Error(`${recipeId}: no generated candidate`);
    const asset: ChibiAssetSpec = findAsset(manifest, record.asset);
    const key = (Object.keys(IDS) as PieceKey[]).find(
      (candidate) => IDS[candidate] === asset.id,
    );
    if (key === undefined) throw new Error(`${asset.id}: not a sheet piece`);
    const raster = cropRaster(
      await readRaster(path.join(ROOT, record.rawSheet)),
      {
        ...candidateCell(
          Number.parseInt(index, 10),
          record.candidateCount ?? 1,
          record.candidateSize,
        ),
        ...record.candidateSize,
      },
    );
    out.push({
      key,
      label: `${recipeId}:${index}`,
      raster: { ...raster, data: new Uint8Array(raster.data) },
    });
  }
  return out;
}

async function main(): Promise<void> {
  const manifest = await loadBatchManifest(ROOT, BATCH);
  const records = await loadRecords(productionLayout(ROOT, BATCH), BATCH);
  const accepted = await acceptedPieces(manifest, records);
  const preview = option("--preview");
  if (preview !== undefined) {
    const out = option("--out");
    if (out === undefined) throw new Error("--preview needs --out DIR");
    const candidates = await previewPieces(
      manifest,
      records,
      preview.split(",").filter(Boolean),
    );
    const rows: Stage[][] = [];
    let library = await loadLibrary(accepted);
    for (const candidate of candidates) {
      // A candidate of the web or the Spider is shown with the other's master.
      library = await loadLibrary({
        ...accepted,
        [candidate.key]: candidate.raster,
      });
      rows.push(
        boardStages(library, candidate.key, candidate.raster, candidate.label),
      );
      const report = paletteReport(candidate.raster);
      const bounds = opaqueBounds(candidate.raster);
      console.log(
        `${candidate.label}: opaque ${bounds === null ? "none" : `${bounds.left}..${bounds.right} x ${bounds.top}..${bounds.bottom}`}, mean ${report.mean}, saturated ${report.saturatedShare}, nearest faction ${report.nearestFaction.faction} ${report.nearestFaction.share}`,
      );
      if (candidate.key === "fountain" || candidate.key === "web")
        console.log(
          `  visible beside a Fighter: ${JSON.stringify(visibleBesideUnit(candidate.raster, library.fighter))}`,
        );
      if (candidate.key === "spider")
        console.log(
          `  footprint: ${JSON.stringify(measureUnitFootprintV7(candidate.raster))}`,
        );
    }
    const sheet = stageSheet(library, rows);
    const tag = option("--tag") ?? "preview";
    await writeSheet(path.join(out, `${tag}-x3.png`), sheet, 3);
    await writeSheet(path.join(out, `${tag}-1x.png`), sheet, 1);
    console.log(`Wrote ${tag}-x3.png and ${tag}-1x.png to ${out}`);
    return;
  }
  const library = await loadLibrary(accepted);
  await mkdir(OUT, { recursive: true });
  const written = [
    ...(await pieceSheets(library, BOARD_KEYS, OUT, "pieces", [4, 1])),
    ...(await scaleSheet(library, OUT)),
    ...(await pieceSheets(library, INTERFACE_KEYS, OUT, "interface", [4, 1])),
    ...(await sceneSheet(library, OUT)),
  ];
  if (written.includes("pieces-1x.png")) {
    await writeZoomed(
      path.join(OUT, "pieces-zoom-0.75.png"),
      path.join(OUT, "pieces-1x.png"),
    );
    written.push("pieces-zoom-0.75.png");
  }
  const report = await readability(library);
  await writeFile(
    path.join(OUT, "readability.json"),
    `${JSON.stringify(report, null, 2)}\n`,
  );
  written.push("readability.json");
  const subjects: Record<string, ArtSubjectV7> = {};
  for (const id of Object.values(IDS))
    if (records.assets[id]?.status === "ACCEPTED")
      subjects[id] = findAsset(manifest, id).subject;
  await writeFile(
    path.join(OUT, "index.json"),
    `${JSON.stringify(
      {
        bead: "pulp_wars-737.5",
        batch: BATCH,
        command: "npm run art:curiosities-review",
        accepted: subjects,
        files: written,
      },
      null,
      2,
    )}\n`,
  );
  const copyTo = option("--copy-to");
  if (copyTo !== undefined) {
    await mkdir(copyTo, { recursive: true });
    for (const file of written)
      await copyFile(path.join(OUT, file), path.join(copyTo, file));
  }
  console.log(`Wrote ${written.length} files to ${path.relative(ROOT, OUT)}`);
}

if (process.argv[1]?.endsWith("curiosities-review.ts") === true)
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "Review failed");
    process.exitCode = 1;
  });
