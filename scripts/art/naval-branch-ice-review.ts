/**
 * Review evidence of the Ice Folk sea ice and the Icebound overlay (bead
 * pulp_wars-5ti.6, batch `naval-branch`; docs/art/NAVAL_FACTIONS.md, "The
 * sea ice"; docs/product/RULESET_7_NAVAL_BRANCH.md section 14.3).
 *
 *   npm run art:naval-branch-ice-review
 *   npm run art:naval-branch-ice-review -- --copy-to DIR
 *
 * Writes art/pixellab/reviews/naval-branch-ice/:
 *
 * - `ice-tiles-x3.png`: the four ice tiles (two windows over each water)
 *   and their permanent (snow-dusted) form, enlarged;
 * - `ice-tiling-1x.png`: each ice as a field of 6 x 3 tiles with the two
 *   variants mixed, beside its water: seams and repetition at map scale;
 * - `ice-scene-{1x,x2}.png`: a mock map drawn with the real tiles: Grass,
 *   Snow on Grass, Shallow and Deep Water, melting and permanent ice over
 *   both waters with its edge cut by seaIceTileV7 at open water and left
 *   whole at the shore and at more ice, ships frozen in under the Icebound
 *   overlay, free ships, and Ice Folk units standing on the ice;
 * - `icebound-sheet-{1x,x3}.png`: the Icebound overlay (with the Frosted
 *   rime on the hull's top edges) over the Patrol Boat, the Battleship and
 *   the Submarine of the seven seafaring factions, each beside the free
 *   ship;
 * - `readability.json`: how far each ice is from both waters, from Grass,
 *   from Snow on Grass and from the other ice (CIE76), and the seam
 *   mismatch of each tile against every tile of its ice;
 * - `index.json`.
 *
 * The engine has no ice state yet, so nothing here is drawn by the board
 * host: the sheets are composed from the checked-in rasters with the pure
 * functions the board will call (seaIceTileV7, iceFolkSnowTileV7,
 * iceFolkSnowCapsV7). No PixelLab call and no browser.
 */
import { copyFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import sharp from "sharp";
import {
  ICE_FOLK_CHILL_MARKER_V7,
  ICE_FOLK_PALETTE_V7,
  iceFolkSnowCapsV7,
  iceFolkSnowTileV7,
} from "../../src/assets/chibi-direction-ice-folk-presentation";
import {
  SEA_ICE_EDGE_EAST_V7,
  SEA_ICE_EDGE_NORTH_V7,
  SEA_ICE_EDGE_SOUTH_V7,
  SEA_ICE_EDGE_WEST_V7,
  seaIceTileV7,
} from "../../src/assets/sea-ice-v7";

const ROOT = process.cwd();
const OUT = path.join(ROOT, "art/pixellab/reviews/naval-branch-ice");
const TILE = 80;
type Rgb = readonly [number, number, number];

interface Raster {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8ClampedArray;
}

function option(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index < 0 ? undefined : process.argv[index + 1];
}

const cache = new Map<string, Raster>();
async function chibi(file: string): Promise<Raster> {
  const cached = cache.get(file);
  if (cached !== undefined) return cached;
  const { data, info } = await sharp(
    path.join(ROOT, "public/assets/chibi", `${file}.png`),
  )
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const raster = {
    width: info.width,
    height: info.height,
    data: new Uint8ClampedArray(data),
  };
  cache.set(file, raster);
  return raster;
}

function blank(width: number, height: number, rgb: Rgb): Raster {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let index = 0; index < width * height; index += 1)
    data.set([rgb[0], rgb[1], rgb[2], 255], index * 4);
  return { width, height, data };
}

/** Alpha-over blit with an integer nearest-neighbour scale. */
function blit(
  target: Raster,
  source: Raster,
  left: number,
  top: number,
  scale = 1,
): void {
  for (let y = 0; y < source.height * scale; y += 1)
    for (let x = 0; x < source.width * scale; x += 1) {
      const tx = left + x;
      const ty = top + y;
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

function scaled(source: Raster, scale: number): Raster {
  const target = blank(source.width * scale, source.height * scale, [0, 0, 0]);
  blit(target, source, 0, 0, scale);
  return target;
}

interface Label {
  readonly text: string;
  readonly left: number;
  readonly top: number;
  readonly size?: number;
}

const written: string[] = [];

async function writeSheet(
  name: string,
  canvas: Raster,
  labels: readonly Label[] = [],
): Promise<void> {
  const escape = (text: string): string =>
    text.replaceAll("&", "&amp;").replaceAll("<", "&lt;");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${canvas.width}" height="${canvas.height}">${labels
    .map(
      (label) =>
        `<text x="${label.left}" y="${label.top + (label.size ?? 13)}" font-family="Helvetica, Arial, sans-serif" font-size="${label.size ?? 13}" font-weight="700" fill="#f4f1e8">${escape(label.text)}</text>`,
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

// ------------------------------------------------------------ the tiles

type Depth = "SHALLOW" | "DEEP";
const ICE_FILE: Readonly<Record<Depth, string>> = {
  SHALLOW: "terrain/chibi-ice-shallow",
  DEEP: "terrain/chibi-ice-deep",
};
const WATER_FILE: Readonly<Record<Depth, string>> = {
  SHALLOW: "terrain/chibi-shallow-water",
  DEEP: "terrain/chibi-deep-water",
};

/** The variant of a cell: the two windows mixed without a visible rhythm. */
function variantAt(x: number, y: number): 0 | 1 {
  return ((x * 7 + y * 13 + ((x * y) % 3)) % 2) as 0 | 1;
}

async function iceTile(
  depth: Depth,
  variant: 0 | 1,
  openWater: number,
  permanent: boolean,
): Promise<Raster> {
  return seaIceTileV7(
    await chibi(`${ICE_FILE[depth]}-${variant + 1}`),
    openWater,
    variant,
    permanent,
  );
}

async function tileSheet(): Promise<void> {
  const scale = 3;
  const gap = 10;
  const cells: {
    label: string;
    depth: Depth;
    variant: 0 | 1;
    snow: boolean;
  }[] = [];
  for (const snow of [false, true])
    for (const depth of ["SHALLOW", "DEEP"] as const)
      for (const variant of [0, 1] as const)
        cells.push({
          label: `${depth === "SHALLOW" ? "Ice over Shallow" : "Ice over Deep"} ${variant + 1}${snow ? ", permanent" : ""}`,
          depth,
          variant,
          snow,
        });
  const columns = 4;
  const cellW = TILE * scale + gap;
  const cellH = TILE * scale + gap + 20;
  const canvas = blank(columns * cellW + gap, 2 * cellH + gap, PAPER);
  const labels: Label[] = [];
  for (const [index, cell] of cells.entries()) {
    const left = gap + (index % columns) * cellW;
    const top = gap + Math.floor(index / columns) * cellH;
    labels.push({ text: cell.label, left, top });
    blit(
      canvas,
      await iceTile(cell.depth, cell.variant, 0, cell.snow),
      left,
      top + 20,
      scale,
    );
  }
  await writeSheet("ice-tiles-x3.png", canvas, labels);
}

async function tilingSheet(): Promise<void> {
  const columns = 6;
  const rows = 3;
  const gap = 12;
  const fieldW = columns * TILE;
  const fieldH = rows * TILE;
  const fields: { label: string; file: (x: number, y: number) => string }[] = [
    {
      label: "Ice over Shallow Water",
      file: (x, y) => `${ICE_FILE.SHALLOW}-${variantAt(x, y) + 1}`,
    },
    {
      label: "Shallow Water",
      file: (x, y) => `${WATER_FILE.SHALLOW}-${variantAt(x, y) + 1}`,
    },
    {
      label: "Ice over Deep Water",
      file: (x, y) => `${ICE_FILE.DEEP}-${variantAt(x, y) + 1}`,
    },
    {
      label: "Deep Water",
      file: (x, y) => `${WATER_FILE.DEEP}-${variantAt(x, y) + 1}`,
    },
  ];
  const canvas = blank(
    2 * fieldW + 3 * gap,
    2 * (fieldH + 22) + 2 * gap,
    PAPER,
  );
  const labels: Label[] = [];
  for (const [index, field] of fields.entries()) {
    const left = gap + (index % 2) * (fieldW + gap);
    const top = gap + Math.floor(index / 2) * (fieldH + 22 + gap);
    labels.push({ text: field.label, left, top });
    for (let y = 0; y < rows; y += 1)
      for (let x = 0; x < columns; x += 1)
        blit(
          canvas,
          await chibi(field.file(x, y)),
          left + x * TILE,
          top + 22 + y * TILE,
        );
  }
  await writeSheet("ice-tiling-1x.png", canvas, labels);
}

// ------------------------------------------------------------ the scene

/**
 * The mock map. `g` Grass, `n` Snow on Grass (Ice Folk land), `s` Shallow
 * and `d` Deep Water; `S` and `D` melting ice over them, `P` and `Q`
 * permanent ice (inside the Ice Folk territory, snow-dusted).
 */
const SCENE = [
  "nnnggggggg",
  "nnPPSssggg",
  "nPPQDDssss",
  "gsPQDDDsdd",
  "gssSSDdddd",
  "ggsssddddd",
  "gggssddddd",
] as const;

interface ScenePiece {
  readonly at: readonly [number, number];
  /** A unit master under public/assets/chibi. */
  readonly file: string;
  readonly anchor?: readonly [number, number];
  readonly icebound?: boolean;
  readonly label: string;
}

const SUBMARINE_ANCHOR: readonly [number, number] = [32, 48];

const SCENE_PIECES: readonly ScenePiece[] = [
  {
    at: [4, 1],
    file: "units/chibi-naval-human-patrol-boat",
    icebound: true,
    label: "Human Patrol Boat, icebound",
  },
  {
    at: [5, 2],
    file: "units/chibi-naval-dwarf-battleship",
    icebound: true,
    label: "Dwarf Battleship, icebound",
  },
  {
    at: [5, 4],
    file: "units/chibi-naval-martian-submarine",
    anchor: SUBMARINE_ANCHOR,
    icebound: true,
    label: "Martian Submarine, icebound (not submerged)",
  },
  {
    at: [7, 2],
    file: "units/chibi-naval-undead-patrol-boat",
    label: "Undead Patrol Boat, free",
  },
  {
    at: [7, 4],
    file: "units/chibi-naval-goblin-submarine-submerged",
    anchor: SUBMARINE_ANCHOR,
    label: "Goblin Submarine, submerged",
  },
  {
    at: [2, 2],
    file: "units/chibi-direction-ice-folk-yeti",
    label: "Yeti on permanent ice",
  },
  {
    at: [4, 3],
    file: "units/chibi-direction-ice-folk-snow-hunter",
    label: "Snow Hunter on melting ice",
  },
  {
    at: [3, 4],
    file: "units/chibi-direction-fighter",
    label: "Human Fighter on melting ice",
  },
];

function terrainAt(x: number, y: number): string {
  return SCENE[y]?.[x] ?? "g";
}
const isIce = (cell: string): boolean => "SDPQ".includes(cell);
const isLand = (cell: string): boolean => cell === "g" || cell === "n";
const depthOf = (cell: string): Depth =>
  cell === "s" || cell === "S" || cell === "P" ? "SHALLOW" : "DEEP";

/** The sprite as the board places it: its anchor on the cell centre. */
function spriteOrigin(
  sprite: Raster,
  anchor: readonly [number, number] | undefined,
  cellLeft: number,
  cellTop: number,
): readonly [number, number] {
  const [ax, ay] = anchor ?? [sprite.width / 2, sprite.height - TILE / 2];
  return [
    Math.round(cellLeft + TILE / 2 - ax),
    Math.round(cellTop + TILE / 2 - ay),
  ];
}

/** A ship frozen in: the hull, the Frosted rime on it, then the pack ice. */
async function drawIcebound(
  canvas: Raster,
  sprite: Raster,
  anchor: readonly [number, number] | undefined,
  cellLeft: number,
  cellTop: number,
): Promise<void> {
  const [left, top] = spriteOrigin(sprite, anchor, cellLeft, cellTop);
  blit(canvas, sprite, left, top);
  blit(
    canvas,
    iceFolkSnowCapsV7(sprite, {
      depth: ICE_FOLK_CHILL_MARKER_V7.frosted.depth,
      colour: ICE_FOLK_PALETTE_V7.icePale,
      alpha: ICE_FOLK_CHILL_MARKER_V7.frosted.alpha,
    }),
    left,
    top,
  );
  // OVERLAY:ICEBOUND: 80 x 40, anchor (40, 0): the lower half of the cell.
  blit(
    canvas,
    await chibi("buildings/chibi-overlay-icebound"),
    cellLeft,
    cellTop + TILE / 2,
  );
}

async function sceneRaster(): Promise<Raster> {
  const columns = SCENE[0].length;
  const rows = SCENE.length;
  const canvas = blank(columns * TILE, rows * TILE, PAPER);
  for (let y = 0; y < rows; y += 1)
    for (let x = 0; x < columns; x += 1) {
      const cell = terrainAt(x, y);
      const left = x * TILE;
      const top = y * TILE;
      if (isLand(cell)) {
        blit(
          canvas,
          await chibi(`terrain/chibi-grass-${((x + y) % 3) + 1}`),
          left,
          top,
        );
        if (cell === "n")
          blit(
            canvas,
            iceFolkSnowTileV7(
              {
                north: terrainAt(x, y - 1) !== "n" && y > 0,
                east: terrainAt(x + 1, y) !== "n",
                south: terrainAt(x, y + 1) !== "n",
                west: terrainAt(x - 1, y) !== "n" && x > 0,
              },
              (x + 2 * y) % 4,
            ),
            left,
            top,
          );
        continue;
      }
      const depth = depthOf(cell);
      blit(
        canvas,
        await chibi(`${WATER_FILE[depth]}-${variantAt(x, y) + 1}`),
        left,
        top,
      );
      if (!isIce(cell)) continue;
      // Open water: a neighbour on the map that is water without ice.
      const open = (dx: number, dy: number): boolean => {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= columns || ny >= rows) return false;
        const neighbour = terrainAt(nx, ny);
        return !isLand(neighbour) && !isIce(neighbour);
      };
      const openWater =
        (open(0, -1) ? SEA_ICE_EDGE_NORTH_V7 : 0) |
        (open(1, 0) ? SEA_ICE_EDGE_EAST_V7 : 0) |
        (open(0, 1) ? SEA_ICE_EDGE_SOUTH_V7 : 0) |
        (open(-1, 0) ? SEA_ICE_EDGE_WEST_V7 : 0);
      blit(
        canvas,
        await iceTile(
          depth,
          variantAt(x, y),
          openWater,
          cell === "P" || cell === "Q",
        ),
        left,
        top,
      );
    }
  // Pieces from the back row forward, as the board draws units.
  for (const piece of [...SCENE_PIECES].sort((a, b) => a.at[1] - b.at[1])) {
    const sprite = await chibi(piece.file);
    const left = piece.at[0] * TILE;
    const top = piece.at[1] * TILE;
    if (piece.icebound === true)
      await drawIcebound(canvas, sprite, piece.anchor, left, top);
    else {
      const [x, y] = spriteOrigin(sprite, piece.anchor, left, top);
      blit(canvas, sprite, x, y);
    }
  }
  return canvas;
}

// ------------------------------------------------------- icebound sheet

const SEAFARERS: readonly (readonly [string, string])[] = [
  ["Human", "human"],
  ["Undead", "undead"],
  ["Goblin", "goblin"],
  ["Dinosaur", "dinosaur"],
  ["Martian", "martian"],
  ["Dwarf", "dwarf"],
  ["Candy", "candy"],
];
const HULLS: readonly (readonly [string, string, Depth])[] = [
  ["Patrol Boat", "patrol-boat", "SHALLOW"],
  ["Battleship", "battleship", "DEEP"],
  ["Submarine", "submarine", "DEEP"],
];

async function iceboundSheet(scale: number, name: string): Promise<void> {
  const gap = 6;
  const titleW = 150;
  const headerH = 24;
  // Each cell: the free ship on water, then the icebound ship on ice.
  const cellW = (2 * TILE + gap) * scale + gap;
  const rowH = (TILE + 24) * scale + gap;
  const canvas = blank(
    titleW + SEAFARERS.length * cellW + gap,
    headerH + HULLS.length * rowH + gap,
    PAPER,
  );
  const labels: Label[] = SEAFARERS.map(([label], index) => ({
    text: label,
    left: titleW + index * cellW,
    top: 4,
  }));
  for (const [row, [hull, key, depth]] of HULLS.entries()) {
    const top = headerH + row * rowH;
    labels.push({ text: hull, left: 8, top: top + 20 });
    labels.push({
      text: depth === "SHALLOW" ? "free, icebound" : "free, icebound",
      left: 8,
      top: top + 38,
      size: 11,
    });
    for (const [column, [, slug]] of SEAFARERS.entries()) {
      const sprite = await chibi(`units/chibi-naval-${slug}-${key}`);
      const anchor = key === "submarine" ? SUBMARINE_ANCHOR : undefined;
      // 24 px of headroom: a Battleship rises above its cell.
      const pair = blank(2 * TILE + gap, TILE + 24, PAPER);
      blit(pair, await chibi(`${WATER_FILE[depth]}-1`), 0, 24);
      const [x, y] = spriteOrigin(sprite, anchor, 0, 24);
      blit(pair, sprite, x, y);
      blit(pair, await chibi(`${WATER_FILE[depth]}-1`), TILE + gap, 24);
      blit(pair, await iceTile(depth, 0, 0, false), TILE + gap, 24);
      await drawIcebound(pair, sprite, anchor, TILE + gap, 24);
      blit(canvas, pair, titleW + column * cellW, top, scale);
    }
  }
  await writeSheet(name, canvas, labels);
}

// ------------------------------------------------------------ measures

const toLinear = (value: number): number => {
  const c = value / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

function lab(rgb: Rgb): readonly [number, number, number] {
  const [r, g, b] = [toLinear(rgb[0]), toLinear(rgb[1]), toLinear(rgb[2])];
  const x = (0.4124564 * r + 0.3575761 * g + 0.1804375 * b) / 0.95047;
  const y = 0.2126729 * r + 0.7151522 * g + 0.072175 * b;
  const z = (0.0193339 * r + 0.119192 * g + 0.9503041 * b) / 1.08883;
  const f = (t: number): number =>
    t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116;
  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
}

function deltaE(left: Rgb, right: Rgb): number {
  const a = lab(left);
  const b = lab(right);
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

function mean(raster: Raster): Rgb {
  const sum = [0, 0, 0];
  const count = raster.width * raster.height;
  for (let index = 0; index < count; index += 1)
    for (let channel = 0; channel < 3; channel += 1)
      sum[channel] =
        (sum[channel] ?? 0) + (raster.data[index * 4 + channel] ?? 0);
  return [(sum[0] ?? 0) / count, (sum[1] ?? 0) / count, (sum[2] ?? 0) / count];
}

const hex = (rgb: Rgb): string =>
  `#${rgb.map((value) => Math.round(value).toString(16).padStart(2, "0")).join("")}`;
const round1 = (value: number): number => Math.round(value * 10) / 10;

/** Mean colour difference across the seam of `left` beside `right`. */
function seam(left: Raster, right: Raster, vertical: boolean): number {
  let total = 0;
  for (let index = 0; index < TILE; index += 1) {
    const a = vertical
      ? ((TILE - 1) * TILE + index) * 4
      : (index * TILE + TILE - 1) * 4;
    const b = vertical ? index * 4 : index * TILE * 4;
    total += deltaE(
      [left.data[a] ?? 0, left.data[a + 1] ?? 0, left.data[a + 2] ?? 0],
      [right.data[b] ?? 0, right.data[b + 1] ?? 0, right.data[b + 2] ?? 0],
    );
  }
  return total / TILE;
}

async function readability(): Promise<void> {
  const grass = await chibi("terrain/chibi-grass-1");
  const snowOnGrass = blank(TILE, TILE, [0, 0, 0]);
  blit(snowOnGrass, grass, 0, 0);
  blit(
    snowOnGrass,
    iceFolkSnowTileV7(
      { north: false, east: false, south: false, west: false },
      0,
    ),
    0,
    0,
  );
  const colours: Record<string, Rgb> = {
    iceOverShallow: mean(await chibi(`${ICE_FILE.SHALLOW}-1`)),
    iceOverDeep: mean(await chibi(`${ICE_FILE.DEEP}-1`)),
    permanentIceOverShallow: mean(await iceTile("SHALLOW", 0, 0, true)),
    permanentIceOverDeep: mean(await iceTile("DEEP", 0, 0, true)),
    shallowWater: mean(await chibi(`${WATER_FILE.SHALLOW}-1`)),
    deepWater: mean(await chibi(`${WATER_FILE.DEEP}-1`)),
    grass: mean(grass),
    snowOnGrass: mean(snowOnGrass),
  };
  const names = Object.keys(colours);
  const distances: Record<string, Record<string, number>> = {};
  for (const a of names.filter((name) => name.includes("ce"))) {
    distances[a] = {};
    for (const b of names)
      if (a !== b)
        (distances[a] ?? {})[b] = round1(
          deltaE(colours[a] ?? [0, 0, 0], colours[b] ?? [0, 0, 0]),
        );
  }
  const seams: Record<string, number> = {};
  for (const depth of ["SHALLOW", "DEEP"] as const)
    for (const a of [1, 2])
      for (const b of [1, 2]) {
        const left = await chibi(`${ICE_FILE[depth]}-${a}`);
        const right = await chibi(`${ICE_FILE[depth]}-${b}`);
        seams[`${depth.toLowerCase()} ${a} beside ${b}`] = round1(
          seam(left, right, false),
        );
        seams[`${depth.toLowerCase()} ${a} above ${b}`] = round1(
          seam(left, right, true),
        );
      }
  await writeFile(
    path.join(OUT, "readability.json"),
    `${JSON.stringify(
      {
        bead: "pulp_wars-5ti.6",
        measure:
          "Mean tile colours and their CIE76 difference (about 10 is clear at a glance, 20 and more are different colours). Snow on Grass is the Ice Folk Snow overlay over the Grass tile. A seam is the mean difference between the touching pixel rows of two tiles (0: the same colours meet).",
        colours: Object.fromEntries(
          names.map((name) => [name, hex(colours[name] ?? [0, 0, 0])]),
        ),
        distances,
        seams,
      },
      null,
      2,
    )}\n`,
  );
  written.push("readability.json");
  console.log("wrote readability.json");
}

async function main(): Promise<void> {
  await mkdir(OUT, { recursive: true });
  await tileSheet();
  await tilingSheet();
  const scene = await sceneRaster();
  const sceneLabels: Label[] = SCENE_PIECES.map((piece) => ({
    text: piece.label,
    left: piece.at[0] * TILE + 2,
    top: piece.at[1] * TILE + 2,
    size: 9,
  }));
  await writeSheet("ice-scene-1x.png", scene);
  await writeSheet(
    "ice-scene-x2.png",
    scaled(scene, 2),
    sceneLabels.map((label) => ({
      ...label,
      left: label.left * 2,
      top: label.top * 2,
      size: 12,
    })),
  );
  await iceboundSheet(1, "icebound-sheet-1x.png");
  await iceboundSheet(3, "icebound-sheet-x3.png");
  await readability();
  const files = [...new Set(written)].sort();
  await writeFile(
    path.join(OUT, "index.json"),
    `${JSON.stringify(
      {
        bead: "pulp_wars-5ti.6",
        batch: "naval-branch",
        command: "npm run art:naval-branch-ice-review",
        note: "Composed from the checked-in rasters with the pure functions the board will call (seaIceTileV7 for the edge at open water and the snow dusting of permanent ice, iceFolkSnowCapsV7 for the rime of an icebound hull). The engine has no ice state yet, so the board host draws none of this.",
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
    for (const file of files)
      await copyFile(path.join(OUT, file), path.join(copyTo, file));
    console.log(`copied the sheets to ${copyTo}`);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "review failed");
  process.exitCode = 1;
});
