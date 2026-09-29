/**
 * Faction-layer dry run review (bead pulp_wars-tt3.1):
 *
 *   npm run art:chibi-faction-dry-run-review
 *
 * Compares the throwaway TEST-CLOCKWORK faction of the exploration run
 * art/explorations/faction-layer-dry-run/materials-motifs-only with the
 * accepted batch-1 Human Fighter, Marksman and City 1, and lays out every
 * candidate of the three fragment arms. No PixelLab calls. Writes to
 * art/explorations/faction-layer-dry-run/review/:
 *
 *   comparison-1x.png     Human and test pieces at 1:1 on the grass tile,
 *                         key colour and owners A (Coral) and B (Teal)
 *   comparison-x4.png     the same at x4 nearest, plus the owner-mask view
 *   zoom-0.75.png         both factions side by side on a grass board at
 *                         zoom 0.75, DPR 1 (smoothed like the runtime)
 *   zoom-0.75-dpr2.png    the same board at zoom 0.75 on a DPR 2 screen
 *   arms-x4.png           every candidate of the three fragment arms at x4
 *   index.json            per-piece metrics: opaque box, canvas fill,
 *                         outline darkness and width, plate check, mask QA
 *
 * Owner colours come from the runtime's mask recolour
 * (src/render/canvas/owner-recolour-v7.ts); enlargements are integer
 * nearest-neighbour upscales of the DPR 1 masters.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import sharp from "sharp";
import {
  RULESET7_PLAYER_COLORS,
  parseHexColourV7,
  recolourOwnerPixelsV7,
} from "../../src/render/canvas/owner-recolour-v7";
import { rgbToHsv, type BinaryMask, type RgbaRaster } from "./chibi/owner-mask";
import {
  explorationLayout,
  loadRecords,
  productionLayout,
  readMask,
  readRaster,
  sha256,
  type AssetRecord,
  type BatchRecords,
} from "./chibi/pipeline";
import { candidateCell, cropRaster, plateCheck } from "./chibi/raster";

const ROOT = process.cwd();
const RUN = "art/explorations/faction-layer-dry-run";
const TEST_ARM = `${RUN}/materials-motifs-only`;
const ARMS = [
  { directory: `${RUN}/bodies-in-fragment`, label: "A bodies in fragment" },
  { directory: `${RUN}/materials-only`, label: "B materials + architecture" },
  { directory: TEST_ARM, label: "C materials and motifs only" },
] as const;
const OUT = path.join(ROOT, RUN, "review");
const TILE = 80;
const GRASS = "public/assets/chibi/terrain/chibi-grass-1.png";
const PAPER = { r: 32, g: 36, b: 44 };
const OWNERS = {
  A: RULESET7_PLAYER_COLORS.CORAL,
  B: RULESET7_PLAYER_COLORS.TEAL,
} as const;
type Owner = keyof typeof OWNERS;

const PAIRS = [
  {
    role: "Fighter",
    human: "chibi-fighter",
    test: "chibi-test-clockwork-fighter",
  },
  {
    role: "Marksman",
    human: "chibi-marksman",
    test: "chibi-test-clockwork-marksman",
  },
  {
    role: "City 1",
    human: "chibi-city-1",
    test: "chibi-test-clockwork-city-1",
  },
] as const;

// ------------------------------------------------------------ raster tools

function blank(
  width: number,
  height: number,
  fill?: { r: number; g: number; b: number },
): RgbaRaster {
  const data = new Uint8Array(width * height * 4);
  if (fill !== undefined)
    for (let index = 0; index < width * height; index += 1)
      data.set([fill.r, fill.g, fill.b, 255], index * 4);
  return { width, height, data };
}

/** Source-over with clipping, like Canvas drawImage at 1:1. */
function draw(
  target: RgbaRaster,
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

function scaled(raster: RgbaRaster, k: number): RgbaRaster {
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

async function smoothed(
  raster: RgbaRaster,
  factor: number,
): Promise<RgbaRaster> {
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

function recoloured(
  master: RgbaRaster,
  mask: BinaryMask,
  owner: Owner,
): RgbaRaster {
  const rgb = parseHexColourV7(OWNERS[owner]);
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
function maskOverlay(master: RgbaRaster, mask: BinaryMask): RgbaRaster {
  const data = new Uint8Array(master.data);
  mask.bits.forEach((bit, index) => {
    const offset = index * 4;
    if (bit === 1) data.set([0, 255, 255, 255], offset);
    else
      for (let c = 0; c < 3; c += 1)
        data[offset + c] = Math.round((data[offset + c] ?? 0) * 0.35 + 60);
  });
  return { width: master.width, height: master.height, data };
}

interface Label {
  readonly x: number;
  readonly y: number;
  readonly text: string;
  readonly size: number;
  readonly color?: string;
}

async function writeImage(
  file: string,
  raster: RgbaRaster,
  labels: readonly Label[],
): Promise<void> {
  const escape = (text: string): string =>
    text
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  const svg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${raster.width}" height="${raster.height}">${labels
      .map(
        (label) =>
          `<text x="${label.x}" y="${label.y}" font-family="Helvetica, Arial, sans-serif" font-size="${label.size}" fill="${label.color ?? "#f2f2f2"}">${escape(label.text)}</text>`,
      )
      .join("")}</svg>`,
  );
  await sharp(Buffer.from(raster.data), {
    raw: { width: raster.width, height: raster.height, channels: 4 },
  })
    .composite([{ input: svg, left: 0, top: 0 }])
    .png({ compressionLevel: 9, palette: false })
    .toFile(file);
}

// ------------------------------------------------------------ metrics

/** Opaque bounding box, canvas fill and outline darkness and width. */
function pieceMetrics(raster: RgbaRaster) {
  let left = raster.width;
  let right = -1;
  let top = raster.height;
  let bottom = -1;
  let opaque = 0;
  const alpha = (x: number, y: number): number =>
    x < 0 || y < 0 || x >= raster.width || y >= raster.height
      ? 0
      : (raster.data[(y * raster.width + x) * 4 + 3] ?? 0);
  const dark = (x: number, y: number): boolean => {
    const offset = (y * raster.width + x) * 4;
    return (
      rgbToHsv(
        raster.data[offset] ?? 0,
        raster.data[offset + 1] ?? 0,
        raster.data[offset + 2] ?? 0,
      ).value < 0.25
    );
  };
  let edge = 0;
  let darkEdge = 0;
  for (let y = 0; y < raster.height; y += 1)
    for (let x = 0; x < raster.width; x += 1) {
      if (alpha(x, y) < 128) continue;
      opaque += 1;
      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
      if (
        alpha(x - 1, y) < 128 ||
        alpha(x + 1, y) < 128 ||
        alpha(x, y - 1) < 128 ||
        alpha(x, y + 1) < 128
      ) {
        edge += 1;
        if (dark(x, y)) darkEdge += 1;
      }
    }
  // Outline width: the dark run inward from the first opaque pixel of each
  // row, from both sides, over rows whose edge pixel is dark.
  const runs: number[] = [];
  for (let y = top; y <= bottom; y += 1)
    for (const step of [1, -1]) {
      let x = step === 1 ? 0 : raster.width - 1;
      while (x >= 0 && x < raster.width && alpha(x, y) < 128) x += step;
      if (x < 0 || x >= raster.width || !dark(x, y)) continue;
      let run = 0;
      while (x >= 0 && x < raster.width && alpha(x, y) >= 128 && dark(x, y)) {
        run += 1;
        x += step;
      }
      runs.push(run);
    }
  runs.sort((a, b) => a - b);
  const width = right - left + 1;
  const height = bottom - top + 1;
  return {
    canvas: { width: raster.width, height: raster.height },
    box: { left, top, width, height },
    fill: {
      width: Number((width / raster.width).toFixed(3)),
      height: Number((height / raster.height).toFixed(3)),
      tileWidth: Number((width / TILE).toFixed(3)),
      tileHeight: Number((height / TILE).toFixed(3)),
    },
    opaquePixels: opaque,
    outline: {
      darkEdgeShare: Number((darkEdge / Math.max(1, edge)).toFixed(3)),
      medianWidthPx: runs[Math.floor(runs.length / 2)] ?? 0,
    },
    plate: plateCheck(raster),
  };
}

// ------------------------------------------------------------ inputs

interface Piece {
  readonly id: string;
  readonly record: AssetRecord;
  readonly master: RgbaRaster;
  readonly mask: BinaryMask;
  readonly owners: Readonly<Record<Owner, RgbaRaster>>;
}

async function loadPiece(records: BatchRecords, id: string): Promise<Piece> {
  const record = records.assets[id];
  if (record?.mask === undefined) throw new Error(`${id}: no mask record`);
  const bytes = await readFile(path.join(ROOT, record.master.path));
  if (sha256(bytes) !== record.master.sha256)
    throw new Error(`${id}: master bytes differ from the record`);
  const master = await readRaster(bytes);
  const mask = await readMask(path.join(ROOT, record.mask.path));
  return {
    id,
    record,
    master,
    mask,
    owners: {
      A: recoloured(master, mask, "A"),
      B: recoloured(master, mask, "B"),
    },
  };
}

function status(piece: Piece): string {
  const mask = piece.record.mask;
  const coverage = `${((mask?.qa.coverage ?? 0) * 100).toFixed(1)}%`;
  const failures = mask?.qa.failures.map((issue) => issue.code) ?? [];
  return `${piece.record.status} · owner ${coverage}${failures.length === 0 ? "" : ` · ${failures.join(", ")}`}`;
}

// ------------------------------------------------------------ sheets

async function comparisonSheet(
  file: string,
  pairs: readonly { role: string; human: Piece; test: Piece }[],
  grass: RgbaRaster,
  k: number,
): Promise<void> {
  const views = [
    "key",
    ...(k > 1 ? ["mask"] : []),
    "owner A",
    "owner B",
  ] as const;
  const cellWidth = 96 * k + 12;
  const cellHeight = 104 * k + 12;
  const header = k > 1 ? 56 : 30;
  const labelRow = k > 1 ? 34 : 22;
  const columns = views.length * 2;
  const width = 12 + columns * cellWidth + 24;
  const height = header + pairs.length * (cellHeight + labelRow) + 12;
  const target = blank(width, height, PAPER);
  const labels: Label[] = [
    {
      x: 12,
      y: k > 1 ? 24 : 14,
      size: k > 1 ? 20 : 11,
      text: `Human (batch 1, accepted) vs TEST-CLOCKWORK (faction-layer dry run) at ${k === 1 ? "1:1" : `x${k} nearest`}; owners through the runtime mask recolour`,
    },
  ];
  const size = k > 1 ? 16 : 9;
  pairs.forEach((pair, row) => {
    const top = header + row * (cellHeight + labelRow);
    (["human", "test"] as const).forEach((side, sideIndex) => {
      const piece = pair[side];
      views.forEach((view, viewIndex) => {
        const left =
          12 +
          (sideIndex * views.length + viewIndex) * cellWidth +
          (sideIndex === 1 ? 24 : 0);
        const cellLeft = left + 8 * k;
        const cellTop = top + labelRow + 24 * k;
        draw(target, scaled(grass, k), cellLeft, cellTop);
        const raster =
          view === "key"
            ? piece.master
            : view === "mask"
              ? maskOverlay(piece.master, piece.mask)
              : piece.owners[view === "owner A" ? "A" : "B"];
        draw(
          target,
          scaled(raster, k),
          cellLeft + (TILE / 2 - piece.record.anchor.x) * k,
          cellTop + (TILE / 2 - piece.record.anchor.y) * k,
        );
        labels.push({
          x: left,
          y: top + (k > 1 ? 18 : 10),
          size,
          text:
            viewIndex === 0 || k > 1
              ? `${side === "human" ? "Human" : "Clockwork"} ${pair.role}: ${view}`
              : view,
        });
        if (viewIndex === 0)
          labels.push({
            x: left,
            y: top + (k > 1 ? 34 : 20),
            size: k > 1 ? 13 : 8,
            color: piece.record.status === "ACCEPTED" ? "#9fe0a0" : "#ffb0a0",
            text: status(piece),
          });
      });
    });
  });
  await writeImage(file, target, labels);
}

/** Both factions on one grass board at zoom 0.75, owners A and B. */
async function zoomBoard(
  file: string,
  pairs: readonly { role: string; human: Piece; test: Piece }[],
  grass: RgbaRaster,
  dpr: number,
): Promise<void> {
  const scale = 0.75 * dpr;
  const tile = TILE * scale;
  const columns = 7; // Human x3, a gap, Clockwork x3
  const rows = 2; // owner A, owner B
  const header = 22 * dpr;
  const top = header + 24 * scale;
  const target = blank(
    Math.round(columns * tile),
    Math.round(top + rows * tile + 4 * dpr),
    PAPER,
  );
  const ground = await smoothed(scaled(grass, dpr), 0.75);
  for (let row = 0; row < rows; row += 1)
    for (let col = 0; col < columns; col += 1)
      draw(target, ground, col * tile, top + row * tile);
  for (let row = 0; row < rows; row += 1) {
    const owner: Owner = row === 0 ? "A" : "B";
    for (const [index, pair] of pairs.entries())
      for (const side of ["human", "test"] as const) {
        const piece = pair[side];
        const col = side === "human" ? index : index + 4;
        const small = await smoothed(scaled(piece.owners[owner], dpr), 0.75);
        draw(
          target,
          small,
          col * tile + tile / 2 - piece.record.anchor.x * scale,
          top + row * tile + tile / 2 - piece.record.anchor.y * scale,
        );
      }
  }
  await writeImage(file, target, [
    {
      x: 6 * dpr,
      y: 15 * dpr,
      size: 11 * dpr,
      text: `zoom 0.75 DPR ${dpr} · Human | TEST-CLOCKWORK · rows: owner A, B`,
    },
  ]);
}

/** The review verdict, plus the mask QA outcome of an accepted candidate. */
function verdictText(
  records: BatchRecords,
  recipe: string,
  asset: string,
  review: { readonly verdict: string } | undefined,
): string {
  const verdict = review?.verdict ?? "UNREVIEWED";
  const record = records.assets[asset];
  if (verdict !== "ACCEPTED" || record?.recipe !== recipe) return verdict;
  if (record.status === "ACCEPTED") return "ACCEPTED, mask QA PASS";
  const failures = record.mask?.qa.failures.map((issue) => issue.code) ?? [];
  return `art ok, ${record.status} (${failures.join(", ")})`;
}

/** Every candidate of every arm at x4, with its review verdict. */
async function armsSheet(file: string): Promise<unknown[]> {
  const k = 4;
  const entries: {
    arm: string;
    recipe: string;
    raster: RgbaRaster;
    verdict: string;
  }[] = [];
  for (const arm of ARMS) {
    const layout = explorationLayout(ROOT, arm.directory);
    const records = await loadRecords(layout, "");
    for (const record of Object.values(records.recipes)) {
      if (record.rawSheet === undefined || record.candidateSize === undefined)
        continue;
      const sheet = await readRaster(
        await readFile(path.join(ROOT, record.rawSheet)),
      );
      const count = record.candidateCount ?? 1;
      const index =
        record.review?.candidate === null ||
        record.review?.candidate === undefined
          ? 0
          : record.review.candidate;
      entries.push({
        arm: arm.label,
        recipe: `${record.id}${count > 1 ? ` [${index}]` : ""}`,
        raster: cropRaster(sheet, {
          ...candidateCell(index, count, record.candidateSize),
          ...record.candidateSize,
        }),
        verdict: verdictText(records, record.id, record.asset, record.review),
      });
    }
  }
  const cellWidth = 88 * k + 16;
  const cellHeight = 96 * k + 40;
  const perRow = 5;
  const rowCount = Math.ceil(entries.length / perRow);
  const target = blank(
    12 + perRow * cellWidth,
    44 + rowCount * cellHeight,
    PAPER,
  );
  const labels: Label[] = [
    {
      x: 12,
      y: 26,
      size: 20,
      text: "Faction-layer dry run: every candidate of the three TEST-CLOCKWORK fragment arms, x4 nearest, key colour",
    },
  ];
  entries.forEach((entry, index) => {
    const left = 12 + (index % perRow) * cellWidth;
    const top = 44 + Math.floor(index / perRow) * cellHeight;
    draw(
      target,
      blank(88 * k, 96 * k, { r: 106, g: 143, b: 95 }),
      left,
      top + 36,
    );
    draw(target, scaled(entry.raster, k), left, top + 36);
    labels.push(
      { x: left, y: top + 14, size: 14, text: `${entry.arm}` },
      {
        x: left,
        y: top + 30,
        size: 13,
        color: entry.verdict.endsWith("PASS") ? "#9fe0a0" : "#ffb0a0",
        text: `${entry.recipe}: ${entry.verdict}`,
      },
    );
  });
  await writeImage(file, target, labels);
  return entries.map(({ arm, recipe, verdict }) => ({ arm, recipe, verdict }));
}

async function main(): Promise<void> {
  await mkdir(OUT, { recursive: true });
  const human = await loadRecords(productionLayout(ROOT, "1"), "1");
  const test = await loadRecords(explorationLayout(ROOT, TEST_ARM), "");
  const pairs = [];
  for (const pair of PAIRS)
    pairs.push({
      role: pair.role,
      human: await loadPiece(human, pair.human),
      test: await loadPiece(test, pair.test),
    });
  const grass = await readRaster(await readFile(path.join(ROOT, GRASS)));
  await comparisonSheet(path.join(OUT, "comparison-1x.png"), pairs, grass, 1);
  await comparisonSheet(path.join(OUT, "comparison-x4.png"), pairs, grass, 4);
  await zoomBoard(path.join(OUT, "zoom-0.75.png"), pairs, grass, 1);
  await zoomBoard(path.join(OUT, "zoom-0.75-dpr2.png"), pairs, grass, 2);
  const arms = await armsSheet(path.join(OUT, "arms-x4.png"));
  const metrics = (piece: Piece) => ({
    id: piece.id,
    recipe: piece.record.recipe,
    status: piece.record.status,
    master: piece.record.master.path,
    ...pieceMetrics(piece.master),
    mask: piece.record.mask && {
      coverage: piece.record.mask.qa.coverage,
      status: piece.record.mask.qa.status,
      redBrownPixels: piece.record.mask.qa.redBrownPixels,
      failures: piece.record.mask.qa.failures.map((issue) => issue.code),
    },
  });
  const index = {
    bead: "pulp_wars-tt3.1",
    note: "Exploration only: TEST-CLOCKWORK is a throwaway faction and nothing here is registered.",
    reference: "scripts/art/chibi/records/batch-1.json",
    test: `${TEST_ARM}/records.json`,
    pairs: pairs.map((pair) => ({
      role: pair.role,
      human: metrics(pair.human),
      test: metrics(pair.test),
    })),
    arms,
    outputs: [
      "comparison-1x.png",
      "comparison-x4.png",
      "zoom-0.75.png",
      "zoom-0.75-dpr2.png",
      "arms-x4.png",
    ],
  };
  await writeFile(
    path.join(OUT, "index.json"),
    `${JSON.stringify(index, null, 2)}\n`,
  );
  console.log(`Wrote ${path.relative(ROOT, OUT)}/`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
