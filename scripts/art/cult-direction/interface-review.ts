/**
 * Review evidence of the Cultists' interface art (bead pulp_wars-mch9.23,
 * batches `interface-cult`, `effects-cult` and the portraits of
 * `naval-cult`; docs/art/factions/CULT.md, "The interface batches"). Called
 * by `npm run art:chibi-cult-direction-review`, which owns the output
 * directory; it makes no PixelLab call and starts no browser.
 *
 * - `portraits-x4.png`: the twelve unit portraits and the three ship
 *   portraits on the Newsstand cream plate at x4 and 1:1, each beside the
 *   board sprite it must match;
 * - `icons-x4.png`: every icon at x4 on the cream plate, and at 24 and 18 px
 *   (enlarged four times) on the cream plate, the dock, Grass and the dark
 *   marker token;
 * - `icons-small-1x.png`: the same small sizes at their real size: 24 and
 *   18 px on the four cream surfaces of the interface, and 24 and 16 px on
 *   Grass, Snow and Shallow Water, bare and on the dark token;
 * - `markers-x3.png`: the eight status icons as board markers, 24 and 16 px
 *   on a dark token over an Initiate on Grass, Snow and Shallow Water;
 * - `effects-x3.png`, `effects-1x.png`: the fifteen effect sprites on Grass,
 *   Forest, Snow, Shallow Water, the rocky ground and the dock, bare and
 *   over an Initiate, and at zoom 0.75;
 * - `candidates-interface-x4.png`, `candidates-effects-x4.png`,
 *   `candidates-naval-portraits-x4.png`: every recorded candidate as
 *   PixelLab returned it, with its verdict;
 * - `interface.json`: each asset's accepted recipe, sprite box and colour
 *   shares, and the PixelLab call counts.
 */
import path from "node:path";
import type { RgbaRaster } from "../chibi/owner-mask";
import {
  loadBatchManifest,
  loadRecords,
  productionLayout,
  readRaster,
} from "../chibi/pipeline";
import { candidateOfRecipe, resampled } from "../dwarf-direction/measure";
import { snowOf } from "../goblin-redesign/candidates";
import type { Rgb } from "../ice-folk-direction/colour";
import {
  blank,
  blit,
  fill,
  opaqueBounds,
  pixelsWhere,
  type Canvas,
  type Label,
} from "../ice-folk-direction/raster-tools";

export const CULT_INTERFACE_BATCH = "interface-cult";
export const CULT_EFFECTS_BATCH = "effects-cult";
const NAVAL_BATCH = "naval-cult";
const BEAD = "pulp_wars-mch9.23";

/** The Newsstand surfaces an icon sits on (src/styles/v7.css). */
const SURFACES: readonly (readonly [name: string, rgb: Rgb])[] = [
  ["--pw-surface", [0xf7, 0xef, 0xd8]],
  ["--pw-surface-2", [0xea, 0xdc, 0xb4]],
  ["--pw-surface-raised", [0xff, 0xfa, 0xf0]],
  ["--pw-dock", [0xef, 0xe4, 0xc4]],
];
const CREAM: Rgb = [0xf7, 0xef, 0xd8];
const DOCK: Rgb = [0xef, 0xe4, 0xc4];
/** The dark token under a small status raster (candy-canvas-v7.ts). */
const TOKEN: Rgb = [0x24, 0x12, 0x1a];
const PAPER: Rgb = [30, 33, 40];
const FRAME: Rgb = [52, 58, 66];
const GAP = 6;

export interface InterfaceReviewContext {
  readonly root: string;
  readonly sheet: (
    name: string,
    canvas: Canvas,
    labels: readonly Label[],
  ) => Promise<void>;
  readonly json: (name: string, value: unknown) => Promise<void>;
}

/** Portrait asset, its title, and the board sprite it must match. */
const PORTRAITS: readonly (readonly [
  title: string,
  portrait: string,
  sprite: string,
])[] = [
  ["Initiate", "chibi-direction-portrait-cult-initiate", "initiate"],
  ["Idol Bearer", "chibi-direction-portrait-cult-idol-bearer", "idol-bearer"],
  ["Familiar", "chibi-direction-portrait-cult-familiar", "familiar"],
  ["Hexer", "chibi-direction-portrait-cult-hexer", "hexer"],
  ["Summoner", "chibi-direction-portrait-cult-summoner", "summoner"],
  ["Stargazer", "chibi-direction-portrait-cult-stargazer", "stargazer"],
  ["Caller", "chibi-direction-portrait-cult-caller", "caller"],
  ["Chosen", "chibi-direction-portrait-cult-chosen", "chosen"],
  ["Thing in the Cellar", "chibi-direction-portrait-cult-thing", "thing"],
  ["Horror", "chibi-direction-portrait-cult-horror", "horror"],
  ["Herald", "chibi-direction-portrait-cult-herald", "herald"],
  ["Tentacle", "chibi-direction-portrait-cult-tentacle", "tentacle"],
];
const SHIP_PORTRAITS: readonly (readonly [
  title: string,
  portrait: string,
  sprite: string,
])[] = [
  ["Patrol Boat", "chibi-naval-cult-portrait-patrol-boat", "patrol-boat"],
  ["Battleship", "chibi-naval-cult-portrait-battleship", "battleship"],
  ["Submarine", "chibi-naval-cult-portrait-submarine", "submarine"],
];

function tiled(tile: RgbaRaster, width: number, height: number): Canvas {
  const canvas = blank(width, height, [0, 0, 0]);
  for (let y = 0; y < height; y += 1)
    for (let x = 0; x < width; x += 1) {
      const s = ((y % tile.height) * tile.width + (x % tile.width)) * 4;
      canvas.data.set(tile.data.subarray(s, s + 4), (y * width + x) * 4);
    }
  return canvas;
}

/** A filled disc: the dark token under a board marker. */
function disc(target: Canvas, cx: number, cy: number, r: number): void {
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y += 1)
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x += 1) {
      if (x < 0 || y < 0 || x >= target.width || y >= target.height) continue;
      if ((x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 > r * r) continue;
      const t = (y * target.width + x) * 4;
      for (let channel = 0; channel < 3; channel += 1)
        target.data[t + channel] = Math.round(
          (TOKEN[channel] ?? 0) * 0.85 + (target.data[t + channel] ?? 0) * 0.15,
        );
    }
}

/** The raster drawn `size` px wide, as the interface and the board scale it. */
const sized = (raster: RgbaRaster, size: number): Promise<RgbaRaster> =>
  size === raster.width
    ? Promise.resolve(raster)
    : resampled(raster, size / raster.width);

/** A square cell of `ground` with the raster centred, optionally on a token. */
async function smallCell(
  raster: RgbaRaster,
  size: number,
  ground: Rgb | RgbaRaster,
  cell: number,
  token = false,
): Promise<Canvas> {
  const canvas = Array.isArray(ground)
    ? blank(cell, cell, ground as Rgb)
    : tiled(ground as RgbaRaster, cell, cell);
  if (token) disc(canvas, cell / 2, cell / 2, size / 2 + 2);
  const small = await sized(raster, size);
  blit(canvas, small, (cell - small.width) / 2, (cell - small.height) / 2);
  return canvas;
}

interface Piece {
  readonly id: string;
  readonly subject: string;
  readonly batch: string;
  readonly recipe: string;
  readonly raster: RgbaRaster;
}

async function acceptedPieces(
  root: string,
  batch: string,
  filter: (id: string) => boolean = () => true,
): Promise<Piece[]> {
  const manifest = await loadBatchManifest(root, batch);
  const records = await loadRecords(productionLayout(root, batch), batch);
  const pieces: Piece[] = [];
  for (const asset of manifest.assets) {
    const record = records.assets[asset.id];
    if (record?.status !== "ACCEPTED" || !filter(asset.id)) continue;
    pieces.push({
      id: asset.id,
      subject: asset.subject,
      batch,
      recipe: record.recipe,
      raster: await readRaster(path.join(root, record.master.path)),
    });
  }
  return pieces;
}

const shortName = (id: string): string =>
  id.replace(/^chibi-(direction|naval)-(icon-|effect-|portrait-)?cult-/, "");

async function portraitsSheet(
  context: InterfaceReviewContext,
  portraits: readonly Piece[],
): Promise<void> {
  const { root } = context;
  const grass = await readRaster(
    path.join(root, "public/assets/chibi/terrain/chibi-grass-1.png"),
  );
  const water = await readRaster(
    path.join(root, "public/assets/chibi/terrain/chibi-shallow-water-1.png"),
  );
  const rows = [
    ...PORTRAITS.map((row) => [...row, "direction", grass] as const),
    ...SHIP_PORTRAITS.map((row) => [...row, "naval", water] as const),
  ];
  const columns = 4;
  const cellW = 48 * 4 + 96 * 2 + 64 + GAP * 3;
  const cellH = 112 * 2 + 30;
  const canvas = blank(
    columns * (cellW + GAP) + GAP,
    Math.ceil(rows.length / columns) * (cellH + GAP) + GAP,
    PAPER,
  );
  const labels: Label[] = [];
  for (const [index, [title, id, sprite, family, ground]] of rows.entries()) {
    const left = GAP + (index % columns) * (cellW + GAP);
    const top = GAP + Math.floor(index / columns) * (cellH + GAP);
    labels.push({ text: title, left, top, size: 14 });
    const portrait = portraits.find((piece) => piece.id === id)?.raster;
    fill(canvas, left, top + 24, 48 * 4, 48 * 4, CREAM);
    if (portrait !== undefined) blit(canvas, portrait, left, top + 24, 4);
    else labels.push({ text: "missing", left: left + 8, top: top + 60 });
    // The board sprite at x2, bottom-centred on its ground.
    const board = await readRaster(
      path.join(
        root,
        "public/assets/chibi/units",
        `chibi-${family}-cult-${sprite}.png`,
      ),
    );
    const boardLeft = left + 48 * 4 + GAP;
    blit(canvas, tiled(ground, 96, 112), boardLeft, top + 24, 2);
    blit(
      canvas,
      board,
      boardLeft + (96 - board.width),
      top + 24 + (112 - board.height) * 2,
      2,
    );
    // The portrait at its real size on the plate and on the dock.
    const smallLeft = boardLeft + 96 * 2 + GAP;
    fill(canvas, smallLeft, top + 24, 64, 64, CREAM);
    fill(canvas, smallLeft, top + 24 + 70, 64, 64, DOCK);
    if (portrait !== undefined) {
      blit(canvas, portrait, smallLeft + 8, top + 32);
      blit(canvas, portrait, smallLeft + 8, top + 32 + 70);
    }
  }
  await context.sheet("portraits-x4.png", canvas, labels);
}

async function iconsSheets(
  context: InterfaceReviewContext,
  icons: readonly Piece[],
): Promise<void> {
  const { root } = context;
  const terrain = (id: string): Promise<RgbaRaster> =>
    readRaster(path.join(root, "public/assets/chibi/terrain", `${id}.png`));
  const grass = await terrain("chibi-grass-1");
  const snow = snowOf(grass);
  const water = await terrain("chibi-shallow-water-1");

  // x4 on the plate, then 24 and 18 px enlarged four times.
  {
    const columns = 3;
    const small = 36;
    const cellW = 48 * 4 + GAP + 4 * (small * 4 + GAP);
    const cellH = 48 * 4 + 26 + small * 4 + GAP;
    const canvas = blank(
      columns * (cellW + GAP) + GAP,
      Math.ceil(icons.length / columns) * (cellH + GAP) + GAP,
      PAPER,
    );
    const labels: Label[] = [];
    for (const [index, icon] of icons.entries()) {
      const left = GAP + (index % columns) * (cellW + GAP);
      const top = GAP + Math.floor(index / columns) * (cellH + GAP);
      labels.push({
        text: `${shortName(icon.id)}  ${icon.subject}`,
        left,
        top,
        size: 13,
      });
      fill(canvas, left, top + 22, 48 * 4, 48 * 4, CREAM);
      const scale = icon.raster.width === 32 ? 6 : 4;
      blit(canvas, icon.raster, left, top + 22, scale);
      const cells: (readonly [number, Rgb | RgbaRaster, boolean])[] = [
        [24, CREAM, false],
        [18, CREAM, false],
        [24, DOCK, false],
        [18, DOCK, false],
        [24, grass, false],
        [18, grass, false],
        [24, grass, true],
        [16, grass, true],
      ];
      for (const [at, [size, ground, token]] of cells.entries()) {
        const cell = await smallCell(icon.raster, size, ground, small, token);
        blit(
          canvas,
          cell,
          left + 48 * 4 + GAP + (at % 4) * (small * 4 + GAP),
          top + 22 + Math.floor(at / 4) * (small * 4 + GAP),
          4,
        );
      }
    }
    labels.push({
      text: "Right of each icon, enlarged x4: 24 and 18 px on --pw-surface and on --pw-dock; below: 24 and 18 px on Grass, 24 and 16 px on the dark marker token",
      left: GAP,
      top: canvas.height - 18,
      size: 12,
    });
    await context.sheet("icons-x4.png", canvas, labels);
  }

  // The real sizes: one row per ground, one column per icon.
  {
    const cell = 30;
    const rows: (readonly [string, number, Rgb | RgbaRaster, boolean])[] = [
      ...SURFACES.flatMap(([name, rgb]) => [
        [`${name} 24`, 24, rgb, false] as const,
        [`${name} 18`, 18, rgb, false] as const,
      ]),
      ["Grass 24", 24, grass, false],
      ["Grass 16 token", 16, grass, true],
      ["Snow 24", 24, snow, false],
      ["Snow 16 token", 16, snow, true],
      ["Water 24", 24, water, false],
      ["Water 16 token", 16, water, true],
    ];
    const labelW = 150;
    const canvas = blank(
      labelW + icons.length * cell + GAP,
      rows.length * cell + GAP * 2,
      PAPER,
    );
    const labels: Label[] = [];
    for (const [r, [name, size, ground, token]] of rows.entries()) {
      labels.push({ text: name, left: 4, top: GAP + r * cell + 8, size: 11 });
      for (const [c, icon] of icons.entries())
        blit(
          canvas,
          await smallCell(icon.raster, size, ground, cell, token),
          labelW + c * cell,
          GAP + r * cell,
        );
    }
    await context.sheet("icons-small-1x.png", canvas, labels);
  }
}

async function markersSheet(
  context: InterfaceReviewContext,
  statuses: readonly Piece[],
): Promise<void> {
  const { root } = context;
  const terrain = (id: string): Promise<RgbaRaster> =>
    readRaster(path.join(root, "public/assets/chibi/terrain", `${id}.png`));
  const grounds = [
    await terrain("chibi-grass-1"),
    snowOf(await terrain("chibi-grass-1")),
    await terrain("chibi-shallow-water-1"),
  ];
  const unit = await readRaster(
    path.join(
      root,
      "public/assets/chibi/units/chibi-direction-cult-initiate.png",
    ),
  );
  const scale = 3;
  const cellW = 96;
  const cellH = 112;
  const canvas = blank(
    statuses.length * (cellW * scale + GAP) + GAP,
    grounds.length * (cellH * scale + GAP) + GAP + 20,
    PAPER,
  );
  const labels: Label[] = [];
  for (const [c, status] of statuses.entries()) {
    const left = GAP + c * (cellW * scale + GAP);
    labels.push({ text: shortName(status.id), left, top: 2, size: 13 });
    for (const [r, ground] of grounds.entries()) {
      const cell = blank(cellW, cellH, FRAME);
      blit(cell, ground, 8, cellH - 80);
      blit(cell, unit, 8 + (80 - unit.width) / 2, cellH - unit.height);
      // 24 px over the head, 16 px beside the head, as CANDY_MARKERS_V7.
      const headTop = cellH - unit.height;
      disc(cell, 48, headTop + 2, 14);
      blit(cell, await sized(status.raster, 24), 36, headTop - 10);
      disc(cell, 48 + 30, headTop + 22, 10);
      blit(cell, await sized(status.raster, 16), 48 + 22, headTop + 14);
      blit(canvas, cell, left, 20 + GAP + r * (cellH * scale + GAP), scale);
    }
  }
  await context.sheet("markers-x3.png", canvas, labels);
}

async function effectsSheets(
  context: InterfaceReviewContext,
  effects: readonly Piece[],
): Promise<void> {
  const { root } = context;
  const terrain = (id: string): Promise<RgbaRaster> =>
    readRaster(path.join(root, "public/assets/chibi/terrain", `${id}.png`));
  const unit = await readRaster(
    path.join(
      root,
      "public/assets/chibi/units/chibi-direction-cult-initiate.png",
    ),
  );
  const grounds: (readonly [string, RgbaRaster | Rgb, boolean])[] = [
    ["Grass", await terrain("chibi-grass-1"), false],
    ["Grass, unit", await terrain("chibi-grass-1"), true],
    ["Forest", await terrain("chibi-forest-1"), false],
    ["Snow", snowOf(await terrain("chibi-grass-1")), false],
    ["Shallow", await terrain("chibi-shallow-water-1"), false],
    ["Rock", await terrain("chibi-mountain-ground-1"), false],
    ["Dock", DOCK, false],
  ];
  for (const [name, scale, zoom] of [
    ["effects-x3.png", 3, 1],
    ["effects-1x.png", 1, 1],
    ["effects-zoom-0.75-x2.png", 2, 0.75],
  ] as const) {
    const tile = Math.round(80 * zoom);
    const cellH = Math.round(104 * zoom);
    const labelW = 150;
    const canvas = blank(
      labelW + grounds.length * (tile * scale + GAP) + GAP,
      effects.length * (cellH * scale + GAP) + GAP + 20,
      PAPER,
    );
    const labels: Label[] = grounds.map(([title], c) => ({
      text: title,
      left: labelW + c * (tile * scale + GAP),
      top: 2,
      size: 12,
    }));
    for (const [r, effect] of effects.entries()) {
      const top = 20 + GAP + r * (cellH * scale + GAP);
      labels.push({ text: shortName(effect.id), left: 4, top, size: 12 });
      const sprite = await sized(
        effect.raster,
        Math.round(effect.raster.width * zoom),
      );
      for (const [c, [, ground, withUnit]] of grounds.entries()) {
        const cell = blank(tile, cellH, FRAME);
        if (Array.isArray(ground))
          fill(cell, 0, cellH - tile, tile, tile, ground as Rgb);
        else {
          const g = await sized(ground as RgbaRaster, tile);
          blit(cell, g, 0, cellH - g.height);
        }
        if (withUnit) {
          const u = await sized(unit, Math.round(unit.width * zoom));
          blit(cell, u, (tile - u.width) / 2, cellH - u.height);
        }
        blit(
          cell,
          sprite,
          (tile - sprite.width) / 2,
          cellH - tile / 2 - sprite.height / 2 - (withUnit ? 8 * zoom : 0),
        );
        blit(canvas, cell, labelW + c * (tile * scale + GAP), top, scale);
      }
    }
    await context.sheet(name, canvas, labels);
  }
}

/** Every recorded candidate of a batch as returned, with its verdict. */
async function candidatesSheet(
  context: InterfaceReviewContext,
  batch: string,
  name: string,
  filter: (asset: string) => boolean = () => true,
): Promise<{ recipes: number; creations: number; edits: number }> {
  const { root } = context;
  const manifest = await loadBatchManifest(root, batch);
  const records = await loadRecords(productionLayout(root, batch), batch);
  const cells: { label: string; verdict: string; raster: RgbaRaster }[] = [];
  const counts = { recipes: 0, creations: 0, edits: 0 };
  for (const recipe of manifest.recipes) {
    if (!filter(recipe.asset)) continue;
    const record = records.recipes[recipe.id];
    if (record?.rawSheet === undefined) continue;
    counts.recipes += 1;
    if (recipe.endpoint === "edit-image-pixen") counts.edits += 1;
    else counts.creations += 1;
    // edit-image-pixen returns the same image twice: the first is shown.
    cells.push({
      label: recipe.id,
      verdict: record.review?.verdict ?? "not reviewed",
      raster: await candidateOfRecipe(root, records, recipe.id, 0),
    });
  }
  const scale = 4;
  const columns = 8;
  const cellW = 52;
  const rowH = cellW * scale + 40;
  const canvas = blank(
    columns * (cellW * scale + GAP) + GAP,
    Math.ceil(cells.length / columns) * rowH + GAP,
    PAPER,
  );
  const labels: Label[] = [];
  for (const [index, cell] of cells.entries()) {
    const left = GAP + (index % columns) * (cellW * scale + GAP);
    const top = GAP + Math.floor(index / columns) * rowH;
    fill(canvas, left, top + 36, cellW * scale, cellW * scale, CREAM);
    blit(
      canvas,
      cell.raster,
      left + ((cellW - cell.raster.width) / 2) * scale,
      top + 36 + ((cellW - cell.raster.height) / 2) * scale,
      scale,
    );
    labels.push(
      { text: cell.label, left, top: top + 2, size: 11 },
      {
        text: cell.verdict,
        left,
        top: top + 18,
        size: 12,
        fill: cell.verdict === "ACCEPTED" ? "#3f9f3f" : "#e0a08f",
      },
    );
  }
  await context.sheet(name, canvas, labels);
  return counts;
}

const percent = (value: number): number => Math.round(value * 1000) / 10;

function measures(piece: Piece): Record<string, unknown> {
  const box = opaqueBounds(piece.raster);
  const shareOf = (
    test: (rgb: Rgb, h: number, s: number, v: number) => boolean,
  ): number => {
    const measured = pixelsWhere([piece.raster], test);
    return percent(measured.count / Math.max(1, measured.opaque));
  };
  return {
    asset: piece.id,
    subject: piece.subject,
    batch: piece.batch,
    recipe: piece.recipe,
    canvas: `${piece.raster.width} x ${piece.raster.height}`,
    sprite: box === null ? null : `${box.width} x ${box.height}`,
    greenPercent: shareOf(
      (_, h, s, v) => h >= 80 && h <= 152 && s >= 0.5 && v >= 0.45,
    ),
    indigoPercent: shareOf(
      (_, h, s, v) => h >= 228 && h <= 266 && s >= 0.3 && v >= 0.14,
    ),
    tealPercent: shareOf(
      (_, h, s, v) => h > 152 && h <= 205 && s >= 0.35 && v >= 0.14,
    ),
    redPercent: shareOf(
      (_, h, s, v) => (h >= 345 || h <= 12) && s >= 0.5 && v >= 0.35,
    ),
    violetPercent: shareOf(
      (_, h, s, v) => h >= 270 && h < 345 && s >= 0.3 && v >= 0.25,
    ),
  };
}

/** Writes the interface evidence; returns nothing the caller must keep. */
export async function cultInterfaceEvidence(
  context: InterfaceReviewContext,
): Promise<void> {
  const { root } = context;
  const interfacePieces = await acceptedPieces(root, CULT_INTERFACE_BATCH);
  const effects = await acceptedPieces(root, CULT_EFFECTS_BATCH);
  const shipPortraits = await acceptedPieces(root, NAVAL_BATCH, (id) =>
    id.includes("-portrait-"),
  );
  const portraits = [
    ...interfacePieces.filter((piece) => piece.subject.startsWith("PORTRAIT:")),
    ...shipPortraits,
  ];
  const icons = interfacePieces.filter((piece) =>
    piece.subject.startsWith("ICON:"),
  );
  await portraitsSheet(context, portraits);
  await iconsSheets(context, icons);
  await markersSheet(
    context,
    icons.filter((piece) => piece.subject.startsWith("ICON:STATUS:")),
  );
  await effectsSheets(context, effects);
  const calls = {
    [CULT_INTERFACE_BATCH]: await candidatesSheet(
      context,
      CULT_INTERFACE_BATCH,
      "candidates-interface-x4.png",
    ),
    [CULT_EFFECTS_BATCH]: await candidatesSheet(
      context,
      CULT_EFFECTS_BATCH,
      "candidates-effects-x4.png",
    ),
    [`${NAVAL_BATCH} (portraits)`]: await candidatesSheet(
      context,
      NAVAL_BATCH,
      "candidates-naval-portraits-x4.png",
      (asset) => asset.includes("-portrait-"),
    ),
  };
  await context.json("interface.json", {
    bead: BEAD,
    note: "The Cult's interface art: every accepted portrait, icon and effect with its accepted recipe, sprite box and colour shares (percent of opaque pixels). Red is the cue of an Unbound daemon and belongs only to the Furious chip. `calls` counts the recorded PixelLab jobs of each batch (one job per recipe).",
    calls,
    portraits: portraits.map(measures),
    icons: icons.map(measures),
    effects: effects.map(measures),
  });
}
