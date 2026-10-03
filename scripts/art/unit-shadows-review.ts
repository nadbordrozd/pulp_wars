/**
 * Unit ground-shadow review (bead pulp_wars-jg1): every faction's roster of
 * the live look, before (the generic shadow every unit had) and after (the
 * per-unit anchors of src/render/canvas/unit-shadows-v7.ts), at zoom steps
 * 1 and 0.75 on DPR 1. It writes to --out (default <tmp>/pulp-wars-unit-shadows):
 *
 *   roster-<ground>-zoom-<step>.png   per faction a BEFORE and an AFTER row
 *       of its land units (plus the Egg, the Dwarf mounds and a
 *       Big and Alpha Dinosaur) standing in adjacent cells on Grass, and on
 *       Forest and Mountain ground for zoom 1
 *   ready-grass-zoom-<step>.png      the same with every unit ready, so the
 *       GROUND ready ring shows
 *   giants-zoom-1-x3.png / flyers-zoom-1-x3.png / floaters-zoom-1-x3.png
 *       enlarged (x3, nearest) BEFORE / AFTER crops of the Juggernaut-role
 *       giants, the flyers and hovering Banshee, and the units that stood
 *       above their shadow
 *   contact-sheet.png                 the Grass zoom 1 roster and the giant
 *       crops on one sheet
 *   measurements.json                the measured footprint and the anchor
 *       of every unit subject
 *
 * The ground marks are drawn by the shipping code: drawDirectedUnitBaseV7
 * and drawFlyerShadowV7 draw into a recording context whose ellipses are
 * replayed as SVG over the real chibi terrain tiles, and the sprites are
 * the live masters placed like chibiDestinationRect (resampled smoothly at
 * 0.75, like the board). BEFORE calls the base without the drawn asset id
 * (the generic path, which is what the board drew before the anchors) and
 * without the Big/Alpha growth; AFTER calls it as the board does now.
 *
 * Usage: npm run art:unit-shadows-review -- [--out DIR]
 * No PixelLab call is made and no browser is started.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import sharp, { type OverlayOptions } from "sharp";
import { createServer } from "vite";
import type {
  ArtSubjectV7,
  ChibiArtAssetV7,
} from "../../src/assets/chibi-art-v7";
import type { BoardRenderPlanEntryV7 } from "../../src/render/canvas/board-renderer-v7";
import type * as Measurements from "../../src/render/canvas/unit-shadow-measurements-v7.generated";
import type * as Shadows from "../../src/render/canvas/unit-shadows-v7";
import type * as Direction from "../../src/render/canvas/visual-direction-v7";
import { liveUnitAssetsV7, publicFileOfUrlV7 } from "./unit-shadows/assets";

const ROOT = process.cwd();

function option(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  const value = index < 0 ? undefined : process.argv[index + 1];
  return value === undefined || value.startsWith("--") ? undefined : value;
}

const OUT = path.resolve(
  option("--out") ?? path.join(tmpdir(), "pulp-wars-unit-shadows"),
);
const TILE = 80;
const LABEL_WIDTH = 150;

const server = await createServer({
  configFile: false,
  root: ROOT,
  server: { middlewareMode: true, hmr: false },
  appType: "custom",
  logLevel: "error",
});
const direction = (await server.ssrLoadModule(
  "/src/render/canvas/visual-direction-v7.ts",
)) as typeof Direction;
const shadows = (await server.ssrLoadModule(
  "/src/render/canvas/unit-shadows-v7.ts",
)) as typeof Shadows;
const martianCanvas = (await server.ssrLoadModule(
  "/src/render/canvas/martian-canvas-v7.ts",
)) as {
  drawFlyerShadowV7(
    context: CanvasRenderingContext2D,
    rect: { x: number; y: number; width: number; height: number },
    assetId: string,
    masterWidth: number,
  ): void;
  FLYER_LIFT_MASTER_PX_V7: number;
};
const dinosaurCanvas = (await server.ssrLoadModule(
  "/src/render/canvas/dinosaur-canvas-v7.ts",
)) as { growthSpriteScaleV7(stage: 0 | 1 | 2 | undefined, w: number): number };
const measurements = (
  (await server.ssrLoadModule(
    "/src/render/canvas/unit-shadow-measurements-v7.generated.ts",
  )) as typeof Measurements
).UNIT_SHADOW_MEASUREMENTS_V7;
await server.close();
const assets = await liveUnitAssetsV7();
const bySubject = new Map(assets.map((asset) => [asset.subject, asset]));

// ------------------------------------------------------------ recording

interface Mark {
  readonly kind: "fill" | "stroke";
  readonly x: number;
  readonly y: number;
  readonly rx: number;
  readonly ry: number;
  readonly colour: string;
  readonly alpha: number;
  readonly lineWidth: number;
}

/** The subset of a 2D context the ground marks use, recorded as ellipses. */
function recorder(marks: Mark[]): CanvasRenderingContext2D {
  let path: { x: number; y: number; rx: number; ry: number } | null = null;
  const stack: { alpha: number; fill: string; stroke: string; line: number }[] =
    [];
  const state = { alpha: 1, fill: "#000", stroke: "#000", line: 1 };
  const context = {
    save: () => stack.push({ ...stateOf() }),
    restore: () => {
      const top = stack.pop();
      if (top !== undefined) Object.assign(state, top);
    },
    beginPath: () => {
      path = null;
    },
    ellipse: (x: number, y: number, rx: number, ry: number) => {
      path = { x, y, rx, ry };
    },
    fill: () => {
      if (path !== null)
        marks.push({
          kind: "fill",
          ...path,
          colour: state.fill,
          alpha: state.alpha,
          lineWidth: 0,
        });
    },
    stroke: () => {
      if (path !== null)
        marks.push({
          kind: "stroke",
          ...path,
          colour: state.stroke,
          alpha: state.alpha,
          lineWidth: state.line,
        });
    },
    get globalAlpha() {
      return state.alpha;
    },
    set globalAlpha(value: number) {
      state.alpha = value;
    },
    get fillStyle() {
      return state.fill;
    },
    set fillStyle(value: string) {
      state.fill = value;
    },
    get strokeStyle() {
      return state.stroke;
    },
    set strokeStyle(value: string) {
      state.stroke = value;
    },
    get lineWidth() {
      return state.line;
    },
    set lineWidth(value: number) {
      state.line = value;
    },
  };
  function stateOf() {
    return {
      alpha: state.alpha,
      fill: state.fill,
      stroke: state.stroke,
      line: state.line,
    };
  }
  return context as unknown as CanvasRenderingContext2D;
}

function svgOfMarks(marks: readonly Mark[], width: number, height: number) {
  const body = marks
    .map((mark) =>
      mark.kind === "fill"
        ? `<ellipse cx="${mark.x}" cy="${mark.y}" rx="${mark.rx}" ry="${mark.ry}" fill="${mark.colour}" opacity="${mark.alpha}"/>`
        : `<ellipse cx="${mark.x}" cy="${mark.y}" rx="${mark.rx}" ry="${mark.ry}" fill="none" stroke="${mark.colour}" stroke-width="${mark.lineWidth}" opacity="${mark.alpha}"/>`,
    )
    .join("");
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${body}</svg>`,
  );
}

// ------------------------------------------------------------ scenes

interface Piece {
  readonly subject: ArtSubjectV7;
  readonly label: string;
  readonly growthStage?: 1 | 2;
}

const FACTIONS: readonly (readonly [string, string])[] = [
  ["Human", ""],
  ["Goblin", "GOBLIN:"],
  ["Undead", "UNDEAD:"],
  ["Dinosaur", "DINOSAUR:"],
  ["Martian", "MARTIAN:"],
  ["Ice Folk", "ICE_FOLK:"],
  ["Dwarf", "DWARF:"],
];
const ROLES = [
  "FIGHTER",
  "MARKSMAN",
  "GUARD",
  "CAPTAIN",
  "RAIDER",
  "KNIGHT",
  "CATAPULT",
  "JUGGERNAUT",
] as const;

function nameOf(subject: ArtSubjectV7): string {
  const asset = bySubject.get(subject);
  return (asset?.id ?? subject)
    .replace(/^chibi-direction-/, "")
    .replace(/^(goblin|undead|dinosaur|martian|ice-folk|dwarf)-/, "");
}

function rosterOf(prefix: string): Piece[] {
  const pieces: Piece[] = ROLES.map((role) => {
    const subject = `UNIT:${prefix}${role}` as ArtSubjectV7;
    return { subject, label: nameOf(subject) };
  });
  if (prefix === "DINOSAUR:")
    pieces.push(
      { subject: "UNIT:DINOSAUR:EGG", label: "egg" },
      { subject: "UNIT:DINOSAUR:KNIGHT", label: "knight big", growthStage: 1 },
      {
        subject: "UNIT:DINOSAUR:JUGGERNAUT",
        label: "jugg. alpha",
        growthStage: 2,
      },
    );
  if (prefix === "DWARF:")
    pieces.push(
      { subject: "UNIT:DWARF:MOUND", label: "mound" },
      { subject: "UNIT:DWARF:MOUND_RIDER", label: "mound rider" },
    );
  return pieces;
}

function entryOf(piece: Piece, ready: boolean): BoardRenderPlanEntryV7 {
  const flyer =
    shadows.UNIT_SHADOW_FLYERS_V7[piece.subject] !== undefined
      ? { flyer: true }
      : undefined;
  return {
    key: "unit:1",
    layer: 0,
    at: { x: 0, y: 0 },
    kind: "UNIT",
    artSubject: piece.subject,
    ready,
    ownerColor: "#c0392b",
    ...(piece.subject.startsWith("UNIT:MARTIAN:") ? { martian: flyer } : {}),
    ...(piece.subject.startsWith("UNIT:DWARF:") ? { dwarf: flyer } : {}),
    ...(piece.subject === "UNIT:DINOSAUR:EGG"
      ? { egg: { turnsRemaining: 2 } }
      : {}),
    ...(piece.growthStage === undefined
      ? {}
      : { growthStage: piece.growthStage }),
  } as unknown as BoardRenderPlanEntryV7;
}

type Ground = "grass" | "forest" | "mountain";
const GROUND_FILES: Readonly<Record<Ground, string>> = {
  grass: "public/assets/chibi/terrain/chibi-grass-1.png",
  forest: "public/assets/chibi/terrain/chibi-forest-1.png",
  mountain: "public/assets/chibi/terrain/chibi-mountain-ground-1.png",
};

const rasterCache = new Map<string, Buffer>();
async function scaledRaster(
  file: string,
  width: number,
  height: number,
): Promise<Buffer> {
  const key = `${file}@${width}x${height}`;
  const cached = rasterCache.get(key);
  if (cached !== undefined) return cached;
  const meta = await sharp(file).metadata();
  const smooth = width !== meta.width || height !== meta.height;
  const buffer = await sharp(file)
    .resize(width, height, {
      kernel: smooth && width < (meta.width ?? 0) ? "linear" : "nearest",
      fit: "fill",
    })
    .png()
    .toBuffer();
  rasterCache.set(key, buffer);
  return buffer;
}

/** The cell's tile: the ground master, a tall forest bottom-aligned. */
async function tileOf(ground: Ground, zoom: number) {
  const file = path.join(ROOT, GROUND_FILES[ground]);
  const meta = await sharp(file).metadata();
  const width = Math.round((meta.width ?? TILE) * zoom);
  const height = Math.round((meta.height ?? TILE) * zoom);
  return { buffer: await scaledRaster(file, width, height), width, height };
}

interface RowSpec {
  readonly label: string;
  readonly pieces: readonly Piece[];
  readonly after: boolean;
  /** Also outline the ground marks over the sprites (the enlarged crops). */
  readonly outline?: boolean;
}

/**
 * One strip: a label column and each row of units in adjacent cells, an
 * empty cell row above each row for the giants' upward overflow.
 */
async function strip(
  rows: readonly RowSpec[],
  ground: Ground,
  zoom: number,
  ready: boolean,
): Promise<Buffer> {
  const cell = TILE * zoom;
  const columns = Math.max(...rows.map((row) => row.pieces.length));
  const labelWidth = LABEL_WIDTH;
  const width = Math.round(labelWidth + columns * cell);
  const rowHeight = cell * 1.5;
  const height = Math.round(rows.length * rowHeight + 18);
  const fillers: OverlayOptions[] = [];
  const composites: OverlayOptions[] = [];
  const outlines: Mark[] = [];
  const tile = await tileOf(ground, zoom);
  const grass = await tileOf("grass", zoom);
  const marks: Mark[] = [];
  const sprites: OverlayOptions[] = [];
  const labels: string[] = [];
  for (const [rowIndex, row] of rows.entries()) {
    const cellTop = rowIndex * rowHeight + rowHeight - cell;
    labels.push(
      `<text x="6" y="${cellTop + cell / 2}" font-size="13" font-family="sans-serif" font-weight="700" fill="${row.after ? "#0b5d1e" : "#7a1010"}">${row.label}</text>`,
      `<text x="6" y="${cellTop + cell / 2 + 16}" font-size="12" font-family="sans-serif" fill="#222">${row.after ? "AFTER" : "BEFORE"}${row.outline === true ? " (outlined)" : ""}</text>`,
    );
    for (const [column, piece] of row.pieces.entries()) {
      const left = labelWidth + column * cell;
      // The cell row above, then this cell's ground.
      fillers.push({
        input: grass.buffer,
        left: Math.round(left),
        top: Math.round(cellTop - cell),
      });
      composites.push({
        input: tile.buffer,
        left: Math.round(left),
        top: Math.round(cellTop + cell - tile.height),
      });
      const asset = bySubject.get(piece.subject);
      if (asset === undefined) continue;
      const before = marks.length;
      await placeUnit(
        asset,
        piece,
        row.after,
        ready,
        zoom,
        { x: left + cell / 2, y: cellTop + cell / 2 },
        marks,
        sprites,
      );
      if (row.outline === true)
        for (const mark of marks.slice(before))
          outlines.push({
            ...mark,
            kind: "stroke",
            colour: mark.kind === "fill" ? "#ff00ff" : "#00e5ff",
            alpha: 1,
            lineWidth: 1,
          });
      labels.push(
        `<text x="${left + 3}" y="${cellTop - cell / 2 + 10}" font-size="${zoom < 1 ? 8 : 9}" font-family="sans-serif" fill="#fff" stroke="#000" stroke-width="2" paint-order="stroke">${piece.label}</text>`,
      );
    }
  }
  return sharp({
    create: { width, height, channels: 4, background: "#ece6d6" },
  })
    .composite([
      ...[...fillers, ...composites].filter(
        (overlay) =>
          (overlay.left ?? 0) >= 0 &&
          (overlay.top ?? 0) >= 0 &&
          (overlay.top ?? 0) < height,
      ),
      { input: svgOfMarks(marks, width, height), left: 0, top: 0 },
      ...sprites,
      { input: svgOfMarks(outlines, width, height), left: 0, top: 0 },
      {
        input: Buffer.from(
          `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${labels.join("")}</svg>`,
        ),
        left: 0,
        top: 0,
      },
    ])
    .png()
    .toBuffer();
}

async function placeUnit(
  asset: ChibiArtAssetV7,
  piece: Piece,
  after: boolean,
  ready: boolean,
  zoom: number,
  centre: { x: number; y: number },
  marks: Mark[],
  sprites: OverlayOptions[],
): Promise<void> {
  const anchorX = asset.anchor?.x ?? asset.width / 2;
  const anchorY = asset.anchor?.y ?? asset.height - TILE / 2;
  // chibiDestinationRect at DPR 1.
  let rect = {
    x: Math.round(centre.x - anchorX * zoom),
    y: Math.round(centre.y - anchorY * zoom),
    width: asset.width * zoom,
    height: asset.height * zoom,
  };
  const entry = entryOf(piece, ready);
  const growth = dinosaurCanvas.growthSpriteScaleV7(
    piece.growthStage,
    asset.width,
  );
  const grow = (base: typeof rect) =>
    growth === 1
      ? base
      : {
          x: base.x - (base.width * (growth - 1)) / 2,
          y: base.y - base.height * (growth - 1),
          width: base.width * growth,
          height: base.height * growth,
        };
  const context = recorder(marks);
  if (after)
    direction.drawDirectedUnitBaseV7(
      context,
      direction.LIVE_DIRECTION_V7,
      entry,
      grow(rect),
      zoom * (80 / 128),
      asset.id,
    );
  else
    direction.drawDirectedUnitBaseV7(
      context,
      direction.LIVE_DIRECTION_V7,
      entry,
      rect,
      zoom * (80 / 128),
    );
  if (shadows.UNIT_SHADOW_FLYERS_V7[piece.subject] !== undefined) {
    martianCanvas.drawFlyerShadowV7(context, rect, asset.id, asset.width);
    rect = {
      ...rect,
      y: rect.y - martianCanvas.FLYER_LIFT_MASTER_PX_V7 * zoom,
    };
  }
  rect = grow(rect);
  const width = Math.max(1, Math.round(rect.width));
  const height = Math.max(1, Math.round(rect.height));
  sprites.push({
    input: await scaledRaster(publicFileOfUrlV7(asset.url), width, height),
    left: Math.round(rect.x),
    top: Math.round(rect.y),
  });
}

// ------------------------------------------------------------ output

function stack(images: readonly Buffer[], gap = 10): Promise<Buffer> {
  return (async () => {
    const metas = await Promise.all(
      images.map((image) => sharp(image).metadata()),
    );
    const width = Math.max(...metas.map((meta) => meta.width ?? 0));
    const height =
      metas.reduce((sum, meta) => sum + (meta.height ?? 0), 0) +
      gap * (images.length - 1);
    let top = 0;
    const composites = images.map((image, index) => {
      const overlay = { input: image, left: 0, top };
      top += (metas[index]?.height ?? 0) + gap;
      return overlay;
    });
    return sharp({
      create: { width, height, channels: 4, background: "#ffffff" },
    })
      .composite(composites)
      .png()
      .toBuffer();
  })();
}

async function roster(ground: Ground, zoom: number, ready: boolean) {
  const strips: Buffer[] = [];
  for (const [faction, prefix] of FACTIONS) {
    const pieces = rosterOf(prefix);
    strips.push(
      await strip(
        [
          { label: faction, pieces, after: false },
          { label: faction, pieces, after: true },
        ],
        ground,
        zoom,
        ready,
      ),
    );
  }
  return stack(strips);
}

async function enlarged(pieces: readonly Piece[], label: string) {
  const image = await strip(
    [
      { label, pieces, after: false },
      { label, pieces, after: true },
      { label, pieces, after: false, outline: true },
      { label, pieces, after: true, outline: true },
    ],
    "grass",
    1,
    false,
  );
  const meta = await sharp(image).metadata();
  return sharp(image)
    .resize((meta.width ?? 0) * 3, (meta.height ?? 0) * 3, {
      kernel: "nearest",
    })
    .png()
    .toBuffer();
}

await mkdir(OUT, { recursive: true });
const files: [string, Buffer][] = [];
for (const zoom of [1, 0.75]) {
  files.push([
    `roster-grass-zoom-${zoom}.png`,
    await roster("grass", zoom, false),
  ]);
  files.push([
    `ready-grass-zoom-${zoom}.png`,
    await roster("grass", zoom, true),
  ]);
}
for (const ground of ["forest", "mountain"] as const)
  files.push([`roster-${ground}-zoom-1.png`, await roster(ground, 1, false)]);

const giants: Piece[] = FACTIONS.map(([, prefix]) => {
  const subject = `UNIT:${prefix}JUGGERNAUT` as ArtSubjectV7;
  return { subject, label: nameOf(subject) };
});
const flyers: Piece[] = [
  ...(Object.keys(shadows.UNIT_SHADOW_FLYERS_V7) as ArtSubjectV7[]),
  ...(Object.keys(shadows.UNIT_SHADOW_HOVER_GAPS_V7) as ArtSubjectV7[]),
].map((subject) => ({ subject, label: nameOf(subject) }));
const floaters: Piece[] = (
  Object.values(shadows.UNIT_SHADOW_TABLE_V7) as Shadows.UnitShadowAnchorV7[]
)
  .filter(
    (anchor) =>
      anchor.motion === "GROUNDED" &&
      anchor.height >= 80 &&
      anchor.height - (shadowContact(anchor.subject) ?? anchor.height) >= 9,
  )
  .map((anchor) => ({
    subject: anchor.subject,
    label: nameOf(anchor.subject),
  }));
function shadowContact(subject: ArtSubjectV7): number | undefined {
  return measurements[subject]?.contactY;
}
const giantsImage = await enlarged(giants, "Giants");
files.push(["giants-zoom-1-x3.png", giantsImage]);
files.push(["flyers-zoom-1-x3.png", await enlarged(flyers, "Fly / hover")]);
files.push(["floaters-zoom-1-x3.png", await enlarged(floaters, "High feet")]);
files.push([
  "contact-sheet.png",
  await stack([
    files.find(([name]) => name === "roster-grass-zoom-1.png")?.[1] ??
      Buffer.alloc(0),
    await sharp(giantsImage)
      .resize({ width: 1400, kernel: "nearest" })
      .png()
      .toBuffer(),
  ]),
]);
for (const [name, png] of files) await writeFile(path.join(OUT, name), png);
await writeFile(
  path.join(OUT, "measurements.json"),
  `${JSON.stringify(
    Object.fromEntries(
      Object.entries(shadows.UNIT_SHADOW_TABLE_V7).map(([subject, anchor]) => [
        subject,
        { measurement: measurements[subject as ArtSubjectV7], anchor },
      ]),
    ),
    null,
    2,
  )}\n`,
);
console.log(`wrote ${files.length + 1} files to ${OUT}`);
