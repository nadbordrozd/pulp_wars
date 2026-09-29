/**
 * Chibi batch review evidence (bead pulp_wars-67q.2):
 *
 *   npm run art:chibi-batch-review -- --batch N [--dry-run]
 *       [--url http://localhost:PORT/] [--port 6175] [--skip-capture]
 *
 * Writes to art/pixellab/reviews/chibi-batch-N/:
 *
 *   sheet-1x.png           every asset at 1:1 (key colour, owners A and B, on
 *                          terrain, and a smoothed zoom-0.75 rendition)
 *   sheet-x4.png           every asset at x4 nearest (key colour, owners A and
 *                          B, the owner mask, on terrain; terrain as a 3x3
 *                          repeat)
 *   phone-mock.png         exact 1170x2532 phone screenshot (390x844 CSS at
 *                          DPR 3, tile 80 CSS = 240 px, sprites x3 nearest)
 *   desktop-mock.png       exact 1440x900 DPR 1 screenshot, sprites 1:1
 *   ingame-*.png           the real game with ?art=chibi at zoom 1 and 0.75,
 *                          desktop 1440x900 DPR 1 and phone 390x844 DPR 3
 *   ingame-scene-*.png     production batches from 3 on: a synthetic scene
 *                          from scripts/art/chibi/review-scene-v7.ts drawn by
 *                          the real board host at zoom 1 and 0.75 on desktop
 *                          and phone. Batches whose subjects are all in the
 *                          map showcase (every resource and batch-3
 *                          improvement, Roads, Field Defense) get the
 *                          showcase; others get a roster of their unit and
 *                          improvement subjects for the viewer and an Undead
 *                          rival, ships on water, with Fighters for scale
 *   phone-links.md         raw GitHub URLs for review on a phone
 *   index.json             sizes, hashes, anchors, mask coverage and QA
 *
 * A batch without terrain of its own is reviewed on the accepted terrain of
 * the earlier production batches; water subjects stand on Shallow Water.
 *
 * --dry-run first runs the fixture dry run of the batch (no PixelLab calls)
 * and reviews its outputs; otherwise the batch's accepted production records
 * are reviewed. In-game captures start a Vite server on --port (default
 * 6175, never the user's 6173) unless --url names a running one, and use
 * headless Chrome from CHROME_PATH. Every enlargement is an integer
 * nearest-neighbour upscale of the DPR 1 master; owner colours come from the
 * runtime's own mask recolour (src/render/canvas/owner-recolour-v7.ts).
 */
import { spawn, type ChildProcess } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import sharp from "sharp";
import {
  RULESET7_PLAYER_COLORS,
  parseHexColourV7,
  recolourOwnerPixelsV7,
} from "../../src/render/canvas/owner-recolour-v7";
import {
  assetOwned,
  findAsset,
  type ChibiAssetSpec,
  type ChibiBatchManifest,
} from "./chibi/batch-manifest";
import { runDryRun } from "./chibi/dry-run";
import {
  OWNER_MASK_THRESHOLDS,
  type BinaryMask,
  type RgbaRaster,
} from "./chibi/owner-mask";
import {
  listBatches,
  loadBatchManifest,
  loadRecords,
  productionLayout,
  readMask,
  readRaster,
  reviewDirectory,
  sha256,
  type AssetRecord,
} from "./chibi/pipeline";

const ROOT = process.cwd();
const TILE = 80;
const REPOSITORY = "nadbordrozd/pulp_wars";
const BRANCH = "main";
const PAGES_URL = "https://nadbordrozd.github.io/pulp_wars/";
/** The runtime's ground fill under chibi terrain (board-renderer-v7.ts). */
const GROUND_FILL = { r: 0x65, g: 0x96, b: 0x5b };
const OWNERS = {
  A: { label: "owner A (Coral)", hex: RULESET7_PLAYER_COLORS.CORAL },
  B: { label: "owner B (Teal)", hex: RULESET7_PLAYER_COLORS.TEAL },
} as const;
type Owner = keyof typeof OWNERS;

function option(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  const value = index < 0 ? undefined : process.argv[index + 1];
  return value === undefined || value.startsWith("--") ? undefined : value;
}

function posix(file: string): string {
  return path.relative(ROOT, file).replaceAll("\\", "/");
}

// ------------------------------------------------------------ raster tools

interface Raster extends RgbaRaster {
  readonly data: Uint8Array;
}

function blank(
  width: number,
  height: number,
  fill?: { r: number; g: number; b: number },
): Raster {
  const data = new Uint8Array(width * height * 4);
  if (fill !== undefined)
    for (let index = 0; index < width * height; index += 1) {
      data[index * 4] = fill.r;
      data[index * 4 + 1] = fill.g;
      data[index * 4 + 2] = fill.b;
      data[index * 4 + 3] = 255;
    }
  return { width, height, data };
}

/** Source-over with clipping, exactly like Canvas drawImage at 1:1. */
function draw(
  target: Raster,
  source: RgbaRaster,
  left: number,
  top: number,
): void {
  const x0 = Math.round(left);
  const y0 = Math.round(top);
  for (let y = 0; y < source.height; y += 1) {
    const ty = y0 + y;
    if (ty < 0 || ty >= target.height) continue;
    for (let x = 0; x < source.width; x += 1) {
      const tx = x0 + x;
      if (tx < 0 || tx >= target.width) continue;
      const s = (y * source.width + x) * 4;
      const alpha = (source.data[s + 3] ?? 0) / 255;
      if (alpha === 0) continue;
      const t = (ty * target.width + tx) * 4;
      const below = (target.data[t + 3] ?? 0) / 255;
      const out = alpha + below * (1 - alpha);
      for (let c = 0; c < 3; c += 1)
        target.data[t + c] = Math.round(
          ((source.data[s + c] ?? 0) * alpha +
            (target.data[t + c] ?? 0) * below * (1 - alpha)) /
            out,
        );
      target.data[t + 3] = Math.round(out * 255);
    }
  }
}

function scaled(raster: RgbaRaster, k: number): Raster {
  const width = raster.width * k;
  const height = raster.height * k;
  const data = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y += 1)
    for (let x = 0; x < width; x += 1) {
      const from = (Math.floor(y / k) * raster.width + Math.floor(x / k)) * 4;
      data.set(raster.data.subarray(from, from + 4), (y * width + x) * 4);
    }
  return { width, height, data };
}

function fillRect(
  target: Raster,
  rect: { x: number; y: number; width: number; height: number },
  fill: { r: number; g: number; b: number },
): void {
  draw(target, blank(rect.width, rect.height, fill), rect.x, rect.y);
}

function recoloured(
  master: RgbaRaster,
  mask: BinaryMask,
  owner: Owner,
): Raster {
  const rgb = parseHexColourV7(OWNERS[owner].hex);
  if (rgb === null) throw new Error("bad owner colour");
  const maskPixels = new Uint8ClampedArray(mask.width * mask.height * 4);
  mask.bits.forEach((bit, index) => {
    if (bit === 1) maskPixels[index * 4 + 3] = 255;
  });
  return {
    width: master.width,
    height: master.height,
    data: new Uint8Array(
      recolourOwnerPixelsV7({
        pixels: new Uint8ClampedArray(master.data),
        width: master.width,
        height: master.height,
        mask: maskPixels,
        maskWidth: mask.width,
        maskHeight: mask.height,
        owner: rgb,
      }),
    ),
  };
}

/** Mask review view: the master dimmed, owner pixels in bright cyan. */
function maskOverlay(master: RgbaRaster, mask: BinaryMask): Raster {
  const data = new Uint8Array(master.data);
  for (let index = 0; index < mask.bits.length; index += 1) {
    const offset = index * 4;
    if (mask.bits[index] === 1) {
      data[offset] = 0;
      data[offset + 1] = 255;
      data[offset + 2] = 255;
      data[offset + 3] = 255;
    } else
      for (let c = 0; c < 3; c += 1)
        data[offset + c] = Math.round((data[offset + c] ?? 0) * 0.35 + 60);
  }
  return { width: master.width, height: master.height, data };
}

async function smoothed(raster: RgbaRaster, factor: number): Promise<Raster> {
  const width = Math.round(raster.width * factor);
  const height = Math.round(raster.height * factor);
  const { data } = await sharp(Buffer.from(raster.data), {
    raw: { width: raster.width, height: raster.height, channels: 4 },
  })
    .resize(width, height, { kernel: sharp.kernel.linear, fit: "fill" })
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { width, height, data: new Uint8Array(data) };
}

interface Label {
  readonly x: number;
  readonly y: number;
  readonly text: string;
  readonly size: number;
  readonly color?: string;
  readonly weight?: "normal" | "bold";
  readonly anchor?: "start" | "middle" | "end";
}

function escapeXml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function svgLabels(
  width: number,
  height: number,
  labels: readonly Label[],
): Buffer {
  const texts = labels
    .map(
      (label) =>
        `<text x="${label.x}" y="${label.y}" font-family="Helvetica, Arial, sans-serif" font-size="${label.size}" font-weight="${label.weight ?? "normal"}" fill="${label.color ?? "#f2f2f2"}" text-anchor="${label.anchor ?? "start"}">${escapeXml(label.text)}</text>`,
    )
    .join("");
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${texts}</svg>`,
  );
}

async function writeImage(
  file: string,
  raster: Raster,
  labels: readonly Label[],
): Promise<void> {
  await sharp(Buffer.from(raster.data), {
    raw: { width: raster.width, height: raster.height, channels: 4 },
  })
    .composite([
      {
        input: svgLabels(raster.width, raster.height, labels),
        left: 0,
        top: 0,
      },
    ])
    .png({ compressionLevel: 9, palette: false })
    .toFile(file);
}

// ------------------------------------------------------------ review assets

interface ReviewAsset {
  readonly spec: ChibiAssetSpec;
  readonly record: AssetRecord;
  readonly master: Raster;
  readonly mask?: BinaryMask;
  readonly owners?: Readonly<Record<Owner, Raster>>;
}

function isTerrainTile(asset: ReviewAsset): boolean {
  return asset.spec.assetClass === "TERRAIN";
}

/** Subjects that only ever stand on water. */
const WATER_SUBJECTS: ReadonlySet<string> = new Set([
  "RESOURCE:FISH",
  "RESOURCE:PEARLS",
  "IMPROVEMENT:PORT",
  "IMPROVEMENT:SHIPYARD",
  "UNIT:PATROL_BOAT",
  "UNIT:BATTLESHIP",
  "UNIT:EMBARKED_TRANSPORT",
]);

/** The ground a piece is reviewed on: shallow water for water pieces. */
function groundFor(
  asset: ReviewAsset,
  terrain: readonly ReviewAsset[],
  col: number,
  row: number,
): ReviewAsset | undefined {
  if (WATER_SUBJECTS.has(asset.spec.subject)) {
    const water = terrain.filter(
      (tile) => tile.spec.subject === "TERRAIN:SHALLOW_WATER",
    );
    const pick = variantAt(water, col, row);
    if (pick !== undefined) return pick;
  }
  return terrainAt(terrain, col, row);
}

/**
 * Accepted terrain tiles of earlier production batches, so a batch without
 * terrain of its own (batch 3 onwards) is reviewed on the real ground.
 */
async function contextTerrain(batch: string): Promise<ReviewAsset[]> {
  const result: ReviewAsset[] = [];
  for (let earlier = 1; earlier < Number(batch); earlier += 1) {
    const manifest = await loadBatchManifest(ROOT, String(earlier)).catch(
      () => undefined,
    );
    if (manifest === undefined || manifest.dryRun) continue;
    const records = await loadRecords(
      productionLayout(ROOT, String(earlier)),
      String(earlier),
    );
    const assets = await loadReviewAssets(
      manifest,
      Object.values(records.assets),
    );
    result.push(
      ...assets.filter(
        (asset) => isTerrainTile(asset) && asset.record.status === "ACCEPTED",
      ),
    );
  }
  return result;
}

async function loadReviewAssets(
  manifest: ChibiBatchManifest,
  records: readonly AssetRecord[],
): Promise<ReviewAsset[]> {
  const order = new Map(
    manifest.assets.map((asset, index) => [asset.id, index]),
  );
  const result: ReviewAsset[] = [];
  for (const record of [...records].sort(
    (a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0),
  )) {
    const spec = findAsset(manifest, record.id);
    const bytes = await readFile(path.join(ROOT, record.master.path));
    if (sha256(bytes) !== record.master.sha256)
      throw new Error(`${record.id}: master bytes differ from the record`);
    const master = await readRaster(bytes);
    if (record.mask === undefined || !assetOwned(spec)) {
      result.push({ spec, record, master });
      continue;
    }
    const mask = await readMask(path.join(ROOT, record.mask.path));
    result.push({
      spec,
      record,
      master,
      mask,
      owners: {
        A: recoloured(master, mask, "A"),
        B: recoloured(master, mask, "B"),
      },
    });
  }
  return result;
}

function statusLines(asset: ReviewAsset): string[] {
  const mask = asset.record.mask;
  const base =
    asset.record.status === "ACCEPTED" ? "ACCEPTED" : "REJECTED by mask QA";
  if (mask === undefined) return [base];
  return [
    `${base} · mask ${mask.source} ${(mask.qa.coverage * 100).toFixed(1)}%`,
    ...mask.qa.failures.map((issue) => `fail: ${issue.code}`),
    ...mask.qa.warnings.map((issue) => `waived: ${issue.code}`),
  ];
}

/** The runtime's cosmetic variant hash (chibiVariantV7). */
function variantAt<T>(
  variants: readonly T[],
  col: number,
  row: number,
): T | undefined {
  if (variants.length === 0) return undefined;
  const index =
    (((col * 31 + row * 17) % variants.length) + variants.length) %
    variants.length;
  return variants[index];
}

/**
 * Scene terrain by subject: grass everywhere, a lake (shallow ring, deep
 * centre) right of the pieces for the desktop mock and a shallow inlet at the
 * phone's left edge. Variants of one subject use the runtime hash.
 */
function terrainAt(
  terrain: readonly ReviewAsset[],
  col: number,
  row: number,
): ReviewAsset | undefined {
  if (terrain.length === 0) return undefined;
  const has = (subject: string): boolean =>
    terrain.some((asset) => asset.spec.subject === subject);
  const deep = col >= 10 && col <= 12 && row >= 3 && row <= 7;
  const shallow =
    (col >= 9 && col <= 13 && row >= 2 && row <= 8) ||
    (col === 0 && row >= 5 && row <= 8);
  const subject =
    deep && has("TERRAIN:DEEP_WATER")
      ? "TERRAIN:DEEP_WATER"
      : (deep || shallow) && has("TERRAIN:SHALLOW_WATER")
        ? "TERRAIN:SHALLOW_WATER"
        : has("TERRAIN:GRASS")
          ? "TERRAIN:GRASS"
          : terrain[0]?.spec.subject;
  return variantAt(
    terrain.filter((asset) => asset.spec.subject === subject),
    col,
    row,
  );
}

/** Tall terrain on free grass cells: a forest and a mountain cluster, plus a scatter. */
function tallAt(
  tall: readonly ReviewAsset[],
  ground: ReviewAsset | undefined,
  col: number,
  row: number,
): ReviewAsset | undefined {
  if (tall.length === 0) return undefined;
  if (ground !== undefined && ground.spec.subject !== "TERRAIN:GRASS")
    return undefined;
  const subjects = [...new Set(tall.map((asset) => asset.spec.subject))];
  const pick = (subject: string | undefined) =>
    variantAt(
      tall.filter((asset) => asset.spec.subject === subject),
      col,
      row,
    );
  if (col >= 5 && col <= 7 && row >= 1 && row <= 4) return pick(subjects[0]);
  if (col >= 5 && col <= 7 && row >= 6 && row <= 9)
    return pick(subjects[subjects.length - 1]);
  if ((col * 7 + row * 5) % 6 === 0)
    return pick(subjects[(col + row) % subjects.length]);
  return undefined;
}

/** Top-left of a master whose anchor lands on the centre of a cell at (x, y). */
function placed(asset: ReviewAsset, cellLeft: number, cellTop: number) {
  return {
    x: cellLeft + TILE / 2 - asset.record.anchor.x,
    y: cellTop + TILE / 2 - asset.record.anchor.y,
  };
}

function pieceRaster(asset: ReviewAsset, owner: Owner): Raster {
  return asset.owners?.[owner] ?? asset.master;
}

// ------------------------------------------------------------ sheets

const PAPER = { r: 32, g: 36, b: 44 };
const NEUTRAL = { r: 150, g: 160, b: 150 };

/** Cell with overflow room: 8 px each side and 24 px above the 80 px tile. */
const MARGIN = { side: 8, up: 24 };

function tileBox(
  target: Raster,
  asset: ReviewAsset,
  terrain: readonly ReviewAsset[],
  owner: Owner,
  left: number,
  top: number,
  k: number,
): void {
  const cellLeft = left + MARGIN.side * k;
  const cellTop = top + MARGIN.up * k;
  const ground = groundFor(asset, terrain, 0, 0);
  if (ground === undefined)
    fillRect(
      target,
      { x: cellLeft, y: cellTop, width: TILE * k, height: TILE * k },
      GROUND_FILL,
    );
  else draw(target, scaled(ground.master, k), cellLeft, cellTop);
  const at = placed(asset, 0, 0);
  draw(
    target,
    scaled(pieceRaster(asset, owner), k),
    cellLeft + at.x * k,
    cellTop + at.y * k,
  );
}

async function sheet(
  file: string,
  assets: readonly ReviewAsset[],
  terrain: readonly ReviewAsset[],
  k: 1 | 4,
  title: string,
): Promise<void> {
  const margin = 20;
  const labelWidth = 330;
  const gap = 16;
  const boxWidth = (TILE + MARGIN.side * 2) * k;
  const columns =
    k === 1
      ? [
          "key colour",
          "owner A",
          "owner B",
          "on terrain A",
          "on terrain B",
          "zoom 0.75 A",
        ]
      : ["key colour", "owner A", "owner B", "owner mask", "on terrain A"];
  const header = 96;
  const rows = assets.map((asset) =>
    isTerrainTile(asset)
      ? Math.max(3 * TILE * Math.max(1, k / 2), TILE * k) + gap + 24
      : (TILE + MARGIN.up + 8) * k + gap,
  );
  const width = margin * 2 + labelWidth + columns.length * (boxWidth + gap);
  const height = header + rows.reduce((sum, row) => sum + row, 0) + margin;
  const target = blank(width, height, PAPER);
  const labels: Label[] = [
    { x: margin, y: 40, text: title, size: 24, weight: "bold" },
    {
      x: margin,
      y: 66,
      text:
        k === 1
          ? "1:1 DPR 1 masters (zoom 1). Owners use the runtime mask recolour. Zoom 0.75 is smoothed like the runtime."
          : "x4 nearest-neighbour. Owner mask: cyan = owner pixels. Terrain: 3x3 repeat at x2 for the seam check.",
      size: 15,
      color: "#c8ccd4",
    },
  ];
  columns.forEach((name, index) =>
    labels.push({
      x: margin + labelWidth + index * (boxWidth + gap),
      y: header - 8,
      text: name,
      size: 14,
      weight: "bold",
      color: "#e2b340",
    }),
  );
  let top = header;
  for (const [row, asset] of assets.entries()) {
    const spec = asset.spec;
    labels.push(
      { x: margin, y: top + 20, text: spec.id, size: 16, weight: "bold" },
      {
        x: margin,
        y: top + 40,
        text: `${spec.subject} · ${spec.assetClass}`,
        size: 13,
        color: "#c8ccd4",
      },
      {
        x: margin,
        y: top + 58,
        text: `${asset.master.width}x${asset.master.height} · anchor ${asset.record.anchor.x},${asset.record.anchor.y} · up ${asset.record.overflow.up} side ${Math.max(asset.record.overflow.left, asset.record.overflow.right)}`,
        size: 13,
        color: "#c8ccd4",
      },
    );
    const lines = statusLines(asset);
    lines.forEach((line, index) =>
      labels.push({
        x: margin,
        y: top + 76 + index * 16,
        text: line,
        size: 12,
        color: asset.record.status === "ACCEPTED" ? "#9fdc9f" : "#ff8a80",
      }),
    );
    if (asset.record.plateCheck?.suspect === true)
      labels.push({
        x: margin,
        y: top + 76 + lines.length * 16,
        text: "plate suspected: check nothing is under it",
        size: 12,
        color: "#ff8a80",
      });
    const x0 = margin + labelWidth;
    if (isTerrainTile(asset)) {
      labels.push(
        {
          x: x0,
          y: top + TILE * k + 18,
          text: k === 1 ? "tile 1:1" : "tile x4",
          size: 12,
          color: "#c8ccd4",
        },
        {
          x: x0 + boxWidth + gap,
          y: top + 3 * TILE * Math.max(1, k / 2) + 18,
          text: `3x3 repeat at x${Math.max(1, k / 2)}: seams and wallpaper check`,
          size: 12,
          color: "#c8ccd4",
        },
      );
      draw(target, scaled(asset.master, k), x0, top);
      const repeat = Math.max(1, k / 2);
      for (let y = 0; y < 3; y += 1)
        for (let x = 0; x < 3; x += 1)
          draw(
            target,
            scaled(asset.master, repeat),
            x0 + boxWidth + gap + x * TILE * repeat,
            top + y * TILE * repeat,
          );
      top += rows[row] ?? 0;
      continue;
    }
    const cells: Raster[] =
      k === 1
        ? [asset.master, pieceRaster(asset, "A"), pieceRaster(asset, "B")]
        : [
            scaled(asset.master, k),
            scaled(pieceRaster(asset, "A"), k),
            scaled(pieceRaster(asset, "B"), k),
            scaled(
              asset.mask === undefined
                ? asset.master
                : maskOverlay(asset.master, asset.mask),
              k,
            ),
          ];
    cells.forEach((raster, index) => {
      const left = x0 + index * (boxWidth + gap);
      fillRect(
        target,
        { x: left, y: top, width: boxWidth, height: (TILE + MARGIN.up) * k },
        NEUTRAL,
      );
      const at = placed(asset, MARGIN.side, MARGIN.up);
      draw(target, raster, left + at.x * k, top + at.y * k);
    });
    const terrainColumns: Owner[] = k === 1 ? ["A", "B"] : ["A"];
    terrainColumns.forEach((owner, index) =>
      tileBox(
        target,
        asset,
        terrain,
        owner,
        x0 + (cells.length + index) * (boxWidth + gap),
        top,
        k,
      ),
    );
    if (k === 1) {
      const left = x0 + (cells.length + 2) * (boxWidth + gap);
      const small = await smoothed(pieceRaster(asset, "A"), 0.75);
      const tile = 60;
      const ground = groundFor(asset, terrain, 0, 0);
      const cellTop = top + MARGIN.up;
      if (ground === undefined)
        fillRect(
          target,
          { x: left + 6, y: cellTop, width: tile, height: tile },
          GROUND_FILL,
        );
      else draw(target, await smoothed(ground.master, 0.75), left + 6, cellTop);
      draw(
        target,
        small,
        left + 6 + tile / 2 - asset.record.anchor.x * 0.75,
        cellTop + tile / 2 - asset.record.anchor.y * 0.75,
      );
    }
    top += rows[row] ?? 0;
  }
  await writeImage(file, target, labels);
}

// ------------------------------------------------------------ interface sheets

/** Interface art (batch 5): portraits and icons, never placed on terrain. */
function isInterfaceAsset(asset: ReviewAsset): boolean {
  return (
    asset.spec.assetClass === "PORTRAIT" || asset.spec.assetClass === "ICON"
  );
}

/** Nearest-neighbour at any factor (1.5x is the 72 px card scale). */
function nearest(raster: RgbaRaster, factor: number): Raster {
  const width = Math.round(raster.width * factor);
  const height = Math.round(raster.height * factor);
  const data = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y += 1)
    for (let x = 0; x < width; x += 1) {
      const from =
        (Math.min(raster.height - 1, Math.floor(y / factor)) * raster.width +
          Math.min(raster.width - 1, Math.floor(x / factor))) *
        4;
      data.set(raster.data.subarray(from, from + 4), (y * width + x) * 4);
    }
  return { width, height, data };
}

/** The interface's dark dock panel and a light page, for contrast checks. */
const UI_DARK = { r: 34, g: 32, b: 48 };
const UI_LIGHT = { r: 232, g: 226, b: 212 };

/**
 * Interface art sheet: each portrait or icon on the dark dock panel in the
 * key colour and for owners A and B, its mask, and on a light page; the 1:1
 * sheet adds the 1.5x card size and the half size of inline HUD text.
 */
async function interfaceSheet(
  file: string,
  assets: readonly ReviewAsset[],
  k: 1 | 4,
  title: string,
): Promise<void> {
  const margin = 20;
  const labelWidth = 330;
  const gap = 16;
  const box = k === 1 ? 80 : 48 * k + 16;
  const columns =
    k === 1
      ? [
          "key colour",
          "owner A",
          "owner B",
          "1.5x card, owner A",
          "light page",
          "0.5x smoothed",
        ]
      : ["key colour", "owner A", "owner B", "owner mask", "light page"];
  const header = 96;
  const rowHeight = Math.max(box, 110) + gap;
  const width = margin * 2 + labelWidth + columns.length * (box + gap);
  const height = header + assets.length * rowHeight + margin;
  const target = blank(width, height, PAPER);
  const labels: Label[] = [
    { x: margin, y: 40, text: title, size: 24, weight: "bold" },
    {
      x: margin,
      y: 66,
      text:
        k === 1
          ? "1:1 DPR 1 masters as the 48 px action tile shows them; 1.5x is the 72 px card; 0.5x is inline HUD text."
          : "x4 nearest-neighbour. Owner mask: cyan = owner pixels. Owners use the runtime mask recolour.",
      size: 15,
      color: "#c8ccd4",
    },
  ];
  columns.forEach((name, index) =>
    labels.push({
      x: margin + labelWidth + index * (box + gap),
      y: header - 8,
      text: name,
      size: 14,
      weight: "bold",
      color: "#e2b340",
    }),
  );
  for (const [row, asset] of assets.entries()) {
    const top = header + row * rowHeight;
    labels.push(
      { x: margin, y: top + 20, text: asset.spec.id, size: 16, weight: "bold" },
      {
        x: margin,
        y: top + 40,
        text: `${asset.spec.subject} · ${asset.spec.assetClass}`,
        size: 13,
        color: "#c8ccd4",
      },
      {
        x: margin,
        y: top + 58,
        text: `${asset.master.width}x${asset.master.height}`,
        size: 13,
        color: "#c8ccd4",
      },
    );
    statusLines(asset).forEach((line, index) =>
      labels.push({
        x: margin,
        y: top + 76 + index * 16,
        text: line,
        size: 12,
        color: asset.record.status === "ACCEPTED" ? "#9fdc9f" : "#ff8a80",
      }),
    );
    const owner = (key: Owner): Raster => pieceRaster(asset, key);
    const cells: {
      raster: Raster;
      fill: { r: number; g: number; b: number };
    }[] =
      k === 1
        ? [
            { raster: asset.master, fill: UI_DARK },
            { raster: owner("A"), fill: UI_DARK },
            { raster: owner("B"), fill: UI_DARK },
            { raster: nearest(owner("A"), 1.5), fill: UI_DARK },
            { raster: owner("A"), fill: UI_LIGHT },
            { raster: await smoothed(owner("A"), 0.5), fill: UI_DARK },
          ]
        : [
            { raster: scaled(asset.master, k), fill: UI_DARK },
            { raster: scaled(owner("A"), k), fill: UI_DARK },
            { raster: scaled(owner("B"), k), fill: UI_DARK },
            {
              raster: scaled(
                asset.mask === undefined
                  ? asset.master
                  : maskOverlay(asset.master, asset.mask),
                k,
              ),
              fill: UI_DARK,
            },
            { raster: scaled(owner("A"), k), fill: UI_LIGHT },
          ];
    cells.forEach((cell, index) => {
      const left = margin + labelWidth + index * (box + gap);
      fillRect(target, { x: left, y: top, width: box, height: box }, cell.fill);
      draw(
        target,
        cell.raster,
        left + Math.floor((box - cell.raster.width) / 2),
        top + Math.floor((box - cell.raster.height) / 2),
      );
    });
  }
  await writeImage(file, target, labels);
}

// ------------------------------------------------------------ mocks

interface ScenePiece {
  readonly asset: ReviewAsset;
  readonly owner: Owner;
  readonly col: number;
  readonly row: number;
}

/** A 32-bit integer finaliser: a deterministic, well-mixed cell hash. */
function mixHash(value: number): number {
  let x = value | 0;
  x ^= x >>> 16;
  x = Math.imul(x, 0x7feb352d);
  x ^= x >>> 15;
  x = Math.imul(x, 0x846ca68b);
  x ^= x >>> 16;
  return x >>> 0;
}

const SCENE_COLUMNS = 22;
const SCENE_ROWS = 12;

/** Pieces fill cols 1..4 first (all visible on the phone), then cols 5..8. */
function sceneSlots(): { col: number; row: number }[] {
  const slots: { col: number; row: number }[] = [];
  for (const [from, to] of [
    [1, 4],
    [5, 8],
  ] as const)
    for (const parity of [0, 1])
      for (let row = 1; row <= 9; row += 1)
        for (let col = from; col <= to; col += 1)
          if ((col + row) % 2 === parity) slots.push({ col, row });
  return slots;
}

function scene(assets: readonly ReviewAsset[]): {
  pieces: ScenePiece[];
  tall: ReviewAsset[];
} {
  const rank = (asset: ReviewAsset): number =>
    ({ SETTLEMENT: 0, BUILDING: 1, RESOURCE: 2 })[
      asset.spec.assetClass as string
    ] ?? 3;
  const pieces = assets
    .filter(
      (asset) =>
        !isTerrainTile(asset) && asset.spec.assetClass !== "TALL_TERRAIN",
    )
    .sort((a, b) => rank(a) - rank(b));
  const slots = sceneSlots();
  const result: ScenePiece[] = [];
  // Every piece appears for owners A and B; small batches repeat their
  // pieces until the phone-visible slots (cols 1..4) are populated.
  const count =
    pieces.length === 0
      ? 0
      : Math.min(slots.length, Math.max(18, pieces.length * 2));
  for (let slot = 0; slot < count; slot += 1) {
    const cell = slots[slot];
    // The first 2n slots show every piece for A then B; the rest mix them.
    const systematic = slot < pieces.length * 2;
    const hash = mixHash((cell?.col ?? 0) * 1000 + (cell?.row ?? 0));
    const index = systematic
      ? slot % pieces.length
      : (hash >>> 4) % pieces.length;
    const asset = pieces[index];
    const owner = (systematic ? slot < pieces.length : (hash >>> 9) % 2 === 0)
      ? "A"
      : "B";
    if (asset !== undefined && cell !== undefined)
      result.push({ asset, owner, ...cell });
  }
  return {
    pieces: result,
    tall: assets.filter((asset) => asset.spec.assetClass === "TALL_TERRAIN"),
  };
}

function composeScene(
  assets: readonly ReviewAsset[],
  view: { width: number; height: number; originX: number; originY: number },
): Raster {
  const terrain = assets.filter(isTerrainTile);
  const { pieces, tall } = scene(assets);
  const occupied = new Set(pieces.map((piece) => `${piece.col},${piece.row}`));
  const target = blank(view.width, view.height, PAPER);
  const left = (col: number): number => view.originX + col * TILE;
  const top = (row: number): number => view.originY + row * TILE;
  // Terrain fills the whole view, including cells left of or above the scene.
  const firstCol = -Math.ceil(view.originX / TILE);
  const firstRow = -Math.ceil(view.originY / TILE);
  const waterPiece = new Set(
    pieces
      .filter((piece) => WATER_SUBJECTS.has(piece.asset.spec.subject))
      .map((piece) => `${piece.col},${piece.row}`),
  );
  for (let row = firstRow; row < SCENE_ROWS; row += 1)
    for (let col = firstCol; col < SCENE_COLUMNS; col += 1) {
      const water = pieces.find(
        (piece) =>
          piece.col === col &&
          piece.row === row &&
          waterPiece.has(`${col},${row}`),
      );
      const ground =
        water === undefined
          ? terrainAt(terrain, col, row)
          : groundFor(water.asset, terrain, col, row);
      if (ground === undefined)
        fillRect(
          target,
          { x: left(col), y: top(row), width: TILE, height: TILE },
          GROUND_FILL,
        );
      else draw(target, ground.master, left(col), top(row));
    }
  for (let row = 0; row < SCENE_ROWS; row += 1)
    for (let col = 0; col < SCENE_COLUMNS; col += 1) {
      const key = `${col},${row}`;
      const asset = occupied.has(key)
        ? undefined
        : tallAt(tall, terrainAt(terrain, col, row), col, row);
      if (asset !== undefined) {
        const at = placed(asset, left(col), top(row));
        draw(target, asset.master, at.x, at.y);
      }
      for (const piece of pieces.filter(
        (candidate) => candidate.col === col && candidate.row === row,
      )) {
        const at = placed(piece.asset, left(col), top(row));
        draw(target, pieceRaster(piece.asset, piece.owner), at.x, at.y);
      }
    }
  return target;
}

async function mock(
  file: string,
  assets: readonly ReviewAsset[],
  screen: {
    readonly width: number;
    readonly height: number;
    readonly dpr: number;
    readonly originX: number;
    readonly title: string;
    readonly scale: string;
  },
): Promise<void> {
  const k = screen.dpr;
  const css = { width: screen.width / k, height: screen.height / k };
  const topHud = 110;
  const bottomHud = 90;
  const sceneRaster = composeScene(assets, {
    width: css.width,
    height: css.height,
    originX: screen.originX,
    originY: topHud - 30,
  });
  const hudColour = { r: 0x1c, g: 0x20, b: 0x29 };
  fillRect(
    sceneRaster,
    { x: 0, y: 0, width: css.width, height: topHud },
    hudColour,
  );
  fillRect(
    sceneRaster,
    { x: 0, y: css.height - bottomHud, width: css.width, height: bottomHud },
    hudColour,
  );
  fillRect(
    sceneRaster,
    {
      x: css.width - 128,
      y: css.height - bottomHud + 12,
      width: 116,
      height: bottomHud - 24,
    },
    { r: 0xe2, g: 0xb3, b: 0x40 },
  );
  for (const x of [12, 112])
    fillRect(
      sceneRaster,
      { x, y: css.height - bottomHud + 12, width: 92, height: bottomHud - 24 },
      { r: 0x34, g: 0x3a, b: 0x48 },
    );
  const s = (value: number): number => value * k;
  const hudText = s(css.height - bottomHud / 2 + 6);
  await writeImage(file, scaled(sceneRaster, k), [
    {
      x: s(12),
      y: s(topHud - 52),
      text: "Turn 7 · 12 Coins (+5 next turn)",
      size: s(15),
      weight: "bold",
    },
    {
      x: s(12),
      y: s(topHud - 30),
      text: screen.title,
      size: s(12),
      weight: "bold",
      color: "#e2b340",
    },
    {
      x: s(12),
      y: s(topHud - 12),
      text: screen.scale,
      size: s(11),
      color: "#b8c0cc",
    },
    { x: s(58), y: hudText, text: "Tech", size: s(15), anchor: "middle" },
    { x: s(158), y: hudText, text: "Menu", size: s(15), anchor: "middle" },
    {
      x: s(css.width - 70),
      y: hudText,
      text: "End turn",
      size: s(15),
      weight: "bold",
      color: "#1c2029",
      anchor: "middle",
    },
  ]);
}

// ------------------------------------------------------------ captures

interface Connection {
  send(method: string, params?: object): Promise<unknown>;
  close(): void;
}

interface CaptureEvidence {
  readonly file: string;
  readonly viewport: string;
  readonly zoomStep: string | null;
  readonly tileCssPx: string | null;
  readonly artSet: string | null;
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

/**
 * The synthetic scene (scripts/art/chibi/review-scene-v7.ts) drawn by the
 * real board host over the running game, at zoom 1 and 0.75. Batches whose
 * subjects are all in the map showcase get it (every map subject, Farm
 * pairs, Mines, Ports, Roads and Field Defense for two owners); others get a
 * roster of their unit and improvement subjects (chibiReviewSceneLayoutV7),
 * which a fresh game's start area never shows.
 */
async function captureScene(
  connection: Connection,
  directory: string,
  viewport: {
    readonly name: string;
    readonly width: number;
    readonly height: number;
    readonly dpr: number;
  },
  subjects: readonly string[],
): Promise<CaptureEvidence[]> {
  const kind = await evaluate<string>(
    connection,
    `(async () => { const scene = await import('/scripts/art/chibi/review-scene-v7.ts'); const shown = scene.showChibiReviewSceneV7(globalThis.__PULP_WARS_APP__.controller.snapshot().view, ${JSON.stringify(subjects)}); globalThis.__CHIBI_REVIEW_SCENE__ = shown; return shown.kind; })()`,
  );
  const evidence: CaptureEvidence[] = [];
  for (const step of ["1", "0.75"] as const) {
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const current = await evaluate<string | null>(
        connection,
        `globalThis.__CHIBI_REVIEW_SCENE__.canvas.dataset.zoomStep ?? null`,
      );
      if (current === step) break;
      await evaluate(
        connection,
        `globalThis.__CHIBI_REVIEW_SCENE__.host.zoom(${JSON.stringify(Number(current) < Number(step) ? "IN" : "OUT")})`,
      );
    }
    await waitFor(
      connection,
      `Array.from(document.images).every((image) => image.complete)`,
    );
    await delay(1200);
    const zoomStep = await evaluate<string | null>(
      connection,
      `globalThis.__CHIBI_REVIEW_SCENE__.canvas.dataset.zoomStep ?? null`,
    );
    if (zoomStep !== step)
      throw new Error(`scene could not reach zoom ${step}: ${zoomStep}`);
    const shot = (await connection.send("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: false,
    })) as { data?: string };
    if (shot.data === undefined)
      throw new Error("Chrome returned no screenshot");
    const file = path.join(
      directory,
      `ingame-scene-${viewport.name}-zoom-${step}.png`,
    );
    await writeFile(file, Buffer.from(shot.data, "base64"));
    evidence.push({
      file: posix(file),
      viewport: `${viewport.width}x${viewport.height} CSS at DPR ${viewport.dpr} (synthetic ${kind === "ROSTER" ? "roster" : "showcase"})`,
      zoomStep,
      tileCssPx: await evaluate<string | null>(
        connection,
        `globalThis.__CHIBI_REVIEW_SCENE__.canvas.dataset.tileCssPx ?? null`,
      ),
      artSet: "CHIBI",
    });
  }
  await evaluate(
    connection,
    `(() => { globalThis.__CHIBI_REVIEW_SCENE__.host.destroy(); document.querySelector('[data-chibi-review-scene]')?.remove(); delete globalThis.__CHIBI_REVIEW_SCENE__; return true; })()`,
  );
  return evidence;
}

/** Interface surfaces of scripts/art/chibi/review-dom-v7.ts (batch 5). */
const DOM_SCENES = [
  "HUMAN_UNIT",
  "UNDEAD_RIVAL_UNIT",
  "UNDEAD_UNIT",
  "HUMAN_TRAINING",
  "UNDEAD_TRAINING",
  "TECH",
  "REWARD",
  "REWARD_ECONOMY",
  "UNDEAD_REWARD",
] as const;

/**
 * Interface captures for batch 5: a real Ruleset7DomAppView with
 * ?art=chibi over a fixture arena, one surface per scene (unit docks,
 * training docks, the technology tree, mandatory rewards).
 */
async function captureDom(
  connection: Connection,
  directory: string,
  viewport: {
    readonly name: string;
    readonly width: number;
    readonly height: number;
    readonly dpr: number;
  },
): Promise<CaptureEvidence[]> {
  const evidence: CaptureEvidence[] = [];
  for (const scene of DOM_SCENES) {
    await evaluate(
      connection,
      `(async () => { const review = await import('/scripts/art/chibi/review-dom-v7.ts'); globalThis.__CHIBI_DOM_REVIEW__?.destroy(); globalThis.__CHIBI_DOM_REVIEW__ = await review.showChibiDomReviewV7(${JSON.stringify(scene)}); return true; })()`,
    );
    await waitFor(
      connection,
      `document.querySelector('[data-chibi-dom-review] [data-chibi-state="loading"]') === null && Array.from(document.images).every((image) => image.complete)`,
    );
    await delay(900);
    const shot = (await connection.send("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: false,
    })) as { data?: string };
    if (shot.data === undefined)
      throw new Error("Chrome returned no screenshot");
    const file = path.join(
      directory,
      `dom-${scene.toLowerCase().replaceAll("_", "-")}-${viewport.name}.png`,
    );
    await writeFile(file, Buffer.from(shot.data, "base64"));
    evidence.push({
      file: posix(file),
      viewport: `${viewport.width}x${viewport.height} CSS at DPR ${viewport.dpr} (interface ${scene})`,
      zoomStep: null,
      tileCssPx: null,
      artSet: "CHIBI",
    });
  }
  await evaluate(
    connection,
    `(() => { globalThis.__CHIBI_DOM_REVIEW__?.destroy(); delete globalThis.__CHIBI_DOM_REVIEW__; return true; })()`,
  );
  return evidence;
}

async function captureInGame(
  directory: string,
  baseUrl: string,
  sceneSubjects: readonly string[] | null,
  interfaceBatch = false,
): Promise<CaptureEvidence[]> {
  const chrome = process.env.CHROME_PATH;
  if (chrome === undefined || chrome === "")
    throw new Error(
      "Set CHROME_PATH to a Chrome binary (or pass --skip-capture)",
    );
  const debugPort = 10_300 + (process.pid % 80);
  const profile = await mkdtemp(path.join(tmpdir(), "pulp-wars-chibi-review-"));
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
  const evidence: CaptureEvidence[] = [];
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
    const viewports = [
      { name: "desktop", width: 1440, height: 900, dpr: 1, mobile: false },
      { name: "phone", width: 390, height: 844, dpr: 3, mobile: true },
    ] as const;
    for (const viewport of viewports) {
      await connection.send("Emulation.setDeviceMetricsOverride", {
        width: viewport.width,
        height: viewport.height,
        deviceScaleFactor: viewport.dpr,
        mobile: viewport.mobile,
      });
      await evaluate(connection, `globalThis.__CHIBI_REVIEW_OLD__ = true`);
      await connection.send("Page.navigate", { url: url.href });
      await waitFor(
        connection,
        `globalThis.__CHIBI_REVIEW_OLD__ !== true && document.readyState === 'complete' && globalThis.__PULP_WARS_APP__ !== undefined`,
      );
      await evaluate(
        connection,
        `(() => { for (const key of Object.keys(localStorage)) if (key.startsWith('pulpWars.save.')) localStorage.removeItem(key); globalThis.__CHIBI_REVIEW_OLD__ = true; })()`,
      );
      await connection.send("Page.reload");
      await waitFor(
        connection,
        `globalThis.__CHIBI_REVIEW_OLD__ !== true && document.readyState === 'complete' && document.querySelector('[data-v7-setup]') !== null && globalThis.__PULP_WARS_APP__?.controller.snapshot().phase === 'EMPTY'`,
      );
      await evaluate(
        connection,
        `(() => { const seed = document.querySelector('#v7-seed'); if (seed) { seed.value = '67'; seed.dispatchEvent(new Event('change', { bubbles: true })); } })()`,
      );
      // The setup form re-renders on change; click the fresh Play button.
      await waitFor(
        connection,
        `document.querySelector('#v7-seed')?.value === '67' && document.querySelector('[data-action="launch"]') !== null`,
      );
      await evaluate(
        connection,
        `document.querySelector('[data-action="launch"]').click()`,
      );
      await waitFor(
        connection,
        `(() => { const s = globalThis.__PULP_WARS_APP__?.controller.snapshot(); const v = s?.view; return s?.phase === 'ACTIVE' && !s.transitioning && !s.ai.active && v?.turnOrder[v.activeSeatIndex] === v?.humanPlayerId && document.querySelector('canvas.board-canvas-v7')?.dataset.artSet === 'CHIBI'; })()`,
        900,
      );
      for (const step of ["1", "0.75"] as const) {
        for (let attempt = 0; attempt < 6; attempt += 1) {
          const current = await evaluate<string | null>(
            connection,
            `document.querySelector('canvas.board-canvas-v7')?.dataset.zoomStep ?? null`,
          );
          if (current === step) break;
          const key = Number(current) < Number(step) ? "+" : "-";
          await evaluate(
            connection,
            `(() => { const canvas = document.querySelector('canvas.board-canvas-v7'); canvas.focus(); canvas.dispatchEvent(new KeyboardEvent('keydown', { key: ${JSON.stringify(key)}, bubbles: true })); })()`,
          );
        }
        // Let every raster load and repaint before the capture.
        await waitFor(
          connection,
          `Array.from(document.images).every((image) => image.complete)`,
        );
        await delay(800);
        const dataset = await evaluate<{
          zoomStep: string | null;
          tileCssPx: string | null;
          artSet: string | null;
        }>(
          connection,
          `(() => { const d = document.querySelector('canvas.board-canvas-v7')?.dataset ?? {}; return { zoomStep: d.zoomStep ?? null, tileCssPx: d.tileCssPx ?? null, artSet: d.artSet ?? null }; })()`,
        );
        if (dataset.zoomStep !== step)
          throw new Error(
            `could not reach zoom ${step}: ${JSON.stringify(dataset)}`,
          );
        const shot = (await connection.send("Page.captureScreenshot", {
          format: "png",
          captureBeyondViewport: false,
        })) as { data?: string };
        if (shot.data === undefined)
          throw new Error("Chrome returned no screenshot");
        const file = path.join(
          directory,
          `ingame-${viewport.name}-zoom-${step}.png`,
        );
        await writeFile(file, Buffer.from(shot.data, "base64"));
        evidence.push({
          file: posix(file),
          viewport: `${viewport.width}x${viewport.height} CSS at DPR ${viewport.dpr}`,
          ...dataset,
        });
      }
      if (sceneSubjects !== null)
        evidence.push(
          ...(await captureScene(
            connection,
            directory,
            viewport,
            sceneSubjects,
          )),
        );
      if (interfaceBatch)
        evidence.push(...(await captureDom(connection, directory, viewport)));
    }
    connection.close();
  } finally {
    browser.kill();
    await delay(300);
    await rm(profile, { recursive: true, force: true }).catch(() => undefined);
  }
  return evidence;
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

// ------------------------------------------------------------ main

async function main(): Promise<void> {
  const batch = option("--batch");
  if (batch === undefined) throw new Error("--batch N is required");
  const dryRun = process.argv.includes("--dry-run");
  const manifest = await loadBatchManifest(ROOT, batch);
  if (dryRun !== manifest.dryRun)
    throw new Error(
      manifest.dryRun
        ? `batch ${batch} is a fixture batch: pass --dry-run`
        : `batch ${batch} is a production batch: --dry-run is only for fixture batches`,
    );
  const directory = reviewDirectory(ROOT, batch);
  await mkdir(directory, { recursive: true });
  const records = dryRun
    ? (await runDryRun(ROOT, batch, (line) => console.log(line))).records
    : await loadRecords(productionLayout(ROOT, batch), batch);
  const assetRecords = Object.values(records.assets);
  if (assetRecords.length === 0)
    throw new Error(`batch ${batch} has no accepted assets to review`);
  const assets = await loadReviewAssets(manifest, assetRecords);
  // Batch 5 is split by faction (batch-5.json, batch-5-undead.json): the
  // review of batch N also shows its faction companions N-<name>.
  if (!dryRun)
    for (const companion of await listBatches(ROOT)) {
      if (!companion.startsWith(`${batch}-`)) continue;
      const other = await loadBatchManifest(ROOT, companion);
      const otherRecords = await loadRecords(
        productionLayout(ROOT, companion),
        companion,
      );
      assets.push(
        ...(await loadReviewAssets(other, Object.values(otherRecords.assets))),
      );
    }
  const interfaceBatch = assets.every(isInterfaceAsset);
  const ownTerrain = assets.filter(
    (asset) => isTerrainTile(asset) && asset.record.status === "ACCEPTED",
  );
  // A batch without terrain tiles is reviewed on earlier batches' ground.
  const context =
    ownTerrain.length > 0 || dryRun ? [] : await contextTerrain(batch);
  const terrain = ownTerrain.length > 0 ? ownTerrain : context;
  const label = `Chibi batch ${batch}${dryRun ? " (dry run, fixtures)" : ""}`;
  const outputs: string[] = [];
  const out = (name: string): string => {
    const file = path.join(directory, name);
    outputs.push(file);
    return file;
  };
  if (interfaceBatch) {
    await interfaceSheet(
      out("sheet-1x.png"),
      assets,
      1,
      `${label}: interface art at 1:1`,
    );
    await interfaceSheet(
      out("sheet-x4.png"),
      assets,
      4,
      `${label}: interface art at x4`,
    );
  } else {
    await sheet(
      out("sheet-1x.png"),
      assets,
      terrain,
      1,
      `${label}: sprites at 1:1`,
    );
    await sheet(
      out("sheet-x4.png"),
      assets,
      terrain,
      4,
      `${label}: sprites at x4`,
    );
  }
  // Mocks show only what could ship; mask-rejected art stays on the sheets.
  const sceneAssets = [
    ...context,
    ...assets.filter((asset) => asset.record.status === "ACCEPTED"),
  ];
  // Interface art is reviewed in the real DOM instead of on a map mock.
  if (!interfaceBatch) {
    await mock(out("phone-mock.png"), sceneAssets, {
      width: 1170,
      height: 2532,
      dpr: 3,
      originX: -35,
      title: `${label}: phone, 390x844 CSS at DPR 3`,
      scale:
        "Tile 80 CSS = 240 px; sprites x3 nearest; 1 image px = 1 device px",
    });
    await mock(out("desktop-mock.png"), sceneAssets, {
      width: 1440,
      height: 900,
      dpr: 1,
      originX: 400,
      title: `${label}: desktop, 1440x900 at DPR 1`,
      scale: "Tile 80 px; sprites 1:1 DPR 1 masters",
    });
  }
  let captures: CaptureEvidence[] = [];
  let captureNote: string;
  if (process.argv.includes("--skip-capture"))
    captureNote = "skipped (--skip-capture)";
  else {
    const given = process.argv.find((argument) => argument.startsWith("http"));
    const port = Number(option("--port") ?? "6175");
    const server = given === undefined ? await startDevServer(port) : undefined;
    try {
      captures = await captureInGame(
        directory,
        given ?? `http://localhost:${port}/`,
        // Batch 3 onwards places pieces a fresh game never shows: production
        // batches add the synthetic scene of their map subjects.
        dryRun || Number(batch) < 3 || interfaceBatch
          ? null
          : [
              ...new Set(
                assets
                  .filter(
                    (asset) =>
                      asset.record.status === "ACCEPTED" &&
                      asset.spec.assetClass !== "TERRAIN",
                  )
                  .map((asset) => asset.spec.subject),
              ),
            ],
        interfaceBatch,
      );
    } finally {
      if (server !== undefined) stopDevServer(server);
    }
    outputs.push(...captures.map((capture) => path.join(ROOT, capture.file)));
    captureNote = dryRun
      ? "Dry-run fixtures are never registered in src/assets/chibi-art-manifest.ts, so these captures show the ?art=chibi runtime (80 px cell, discrete zoom) with whatever chibi rasters are registered today and legacy fallback art for the rest."
      : "Captured from the running game with ?art=chibi; subjects without a registered chibi raster still draw their legacy art.";
  }
  const images = await Promise.all(
    outputs.map(async (file) => {
      const bytes = await readFile(file);
      const meta = await sharp(bytes).metadata();
      return {
        file: posix(file),
        width: meta.width,
        height: meta.height,
        sha256: sha256(bytes),
      };
    }),
  );
  const raw = (file: string): string =>
    `https://raw.githubusercontent.com/${REPOSITORY}/${BRANCH}/${file}`;
  const linkFor = (name: string): string | null => {
    const image = images.find((entry) => entry.file.endsWith(`/${name}`));
    return image === undefined
      ? null
      : `- [${name}](${raw(image.file)}) (${image.width}x${image.height})`;
  };
  const links = [
    `# ${label}: phone review links`,
    "",
    "Open each link on the phone and view it at full width: one image pixel is",
    "then one device pixel, so sprites appear at their true in-game size.",
    "",
    "## Phone (exact 1170x2532 screenshots)",
    "",
    ...[
      "phone-mock.png",
      "ingame-phone-zoom-1.png",
      "ingame-phone-zoom-0.75.png",
      "ingame-scene-phone-zoom-1.png",
      "ingame-scene-phone-zoom-0.75.png",
    ]
      .map(linkFor)
      .filter((line): line is string => line !== null),
    "",
    ...DOM_SCENES.map((scene) =>
      linkFor(`dom-${scene.toLowerCase().replaceAll("_", "-")}-phone.png`),
    ).filter((line): line is string => line !== null),
    "",
    "## Desktop and sprite sheets",
    "",
    ...[
      ...DOM_SCENES.map(
        (scene) =>
          `dom-${scene.toLowerCase().replaceAll("_", "-")}-desktop.png`,
      ),
      "desktop-mock.png",
      "ingame-desktop-zoom-1.png",
      "ingame-desktop-zoom-0.75.png",
      "ingame-scene-desktop-zoom-1.png",
      "ingame-scene-desktop-zoom-0.75.png",
      "sheet-1x.png",
      "sheet-x4.png",
    ]
      .map(linkFor)
      .filter((line): line is string => line !== null),
    "",
    "## In the game",
    "",
    `Play with the chibi art set at ${PAGES_URL}?art=chibi (the choice is`,
    "remembered; `?art=legacy` switches back). Zoom with + and - or pinch; the",
    "steps are 0.75, 1, 1.5 and 2.",
    "",
  ].join("\n");
  const linksFile = path.join(directory, "phone-links.md");
  await writeFile(linksFile, links);
  const index = {
    batch,
    bead: manifest.bead,
    title: manifest.title,
    dryRun,
    faction: manifest.faction,
    tileCssPx: TILE,
    owners: { A: OWNERS.A.hex, B: OWNERS.B.hex },
    maskThresholds: OWNER_MASK_THRESHOLDS,
    note: "DPR 1 masters; every enlargement is integer nearest-neighbour. Owner colours use the runtime mask recolour.",
    assets: assets.map((asset) => ({
      id: asset.spec.id,
      subject: asset.spec.subject,
      assetClass: asset.spec.assetClass,
      status: asset.record.status,
      recipe: asset.record.recipe,
      master: asset.record.master,
      anchor: asset.record.anchor,
      overflow: asset.record.overflow,
      derivation: asset.record.derivation,
      ...(asset.record.plateCheck === undefined
        ? {}
        : { plateCheck: asset.record.plateCheck }),
      ...(asset.record.mask === undefined
        ? {}
        : {
            mask: {
              path: asset.record.mask.path,
              source: asset.record.mask.source,
              coverage: asset.record.mask.qa.coverage,
              coverageOnTarget: asset.record.mask.qa.coverageOnTarget,
              qa: asset.record.mask.qa.status,
              failures: asset.record.mask.qa.failures.map(
                (issue) => issue.code,
              ),
              waived: asset.record.mask.qa.warnings.map((issue) => issue.code),
            },
          }),
    })),
    images,
    captures: { note: captureNote, shots: captures },
    phoneLinks: posix(linksFile),
  };
  await writeFile(
    path.join(directory, "index.json"),
    `${JSON.stringify(index, null, 2)}\n`,
  );
  for (const image of images)
    console.log(`${image.file} ${image.width}x${image.height}`);
  console.log(`Chibi batch ${batch} review evidence: ${posix(directory)}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
