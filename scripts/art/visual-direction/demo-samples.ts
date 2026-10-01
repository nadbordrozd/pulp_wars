/**
 * Cuts the Human demo's sample sprites out of its PixelLab candidates (bead
 * pulp_wars-3tq.3): the reviewed candidate of each recipe under
 * art/explorations/human-demo-2026-10/<run>/raw becomes a master under
 * art/explorations/human-demo-2026-10/assets, and samples.json records
 * where each came from. Nothing is registered as production art, and no
 * PixelLab call is made here.
 *
 *   npx tsx scripts/art/visual-direction/demo-samples.ts
 *
 * Derivations (whole pixels only, never a resample):
 *
 * - AS_IS: the candidate is the master (units: edits of accepted sprites,
 *   so the feet stay where the production sprite has them).
 * - SEATED: the art is moved inside its canvas so its lowest opaque row
 *   sits `bottomMargin` pixels above the canvas bottom and its bounding box
 *   is centred, because Pixen leaves an uneven margin under a building.
 * - FARM_ROWS: the crop rows of the candidate are moved to an even pitch
 *   (row centres at 10, 30, 50 and 70 of the 80 px tile), so the gaps fall
 *   on the tile's centre lines and edges: a Road through the cell centre
 *   stays visible, and stacked Farms keep one rhythm. The wheat is then
 *   calmed (saturation 80%, mixed 18% toward pale straw), so a map full of
 *   Farms is quieter and the crop stays further from the Gold player.
 *
 * Units and cities get an empty owner mask: their colours are the
 * faction's and never change with the player, but the runtime registry
 * requires a mask for owned subjects.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import sharp from "sharp";
import type { RgbaRaster } from "../chibi/owner-mask";
import { readRaster } from "../chibi/pipeline";
import { candidateCell, cropRaster } from "../chibi/raster";

const ROOT = process.cwd();
const RUN = "art/explorations/human-demo-2026-10";

type Derivation = "AS_IS" | "SEATED" | "FARM_ROWS";

interface Sample {
  readonly id: string;
  readonly subject: string;
  readonly assetClass:
    "STANDARD_UNIT" | "LARGE_UNIT" | "BUILDING" | "SETTLEMENT";
  /** The exploration run (sub-directory) the recipe belongs to. */
  readonly run: string;
  readonly recipe: string;
  readonly candidate: number;
  /** Candidates in the raw sheet (1 for a creation, 2 for an edit). */
  readonly candidates: number;
  readonly width: number;
  readonly height: number;
  readonly derivation: Derivation;
  /** SEATED: transparent rows kept under the art. */
  readonly bottomMargin?: number;
  /**
   * SEATED: the master is this bottom-centred window of the seated
   * candidate (a city is generated larger than it is drawn, and its empty
   * rows must not count as upward overflow). The art must fit inside it.
   */
  readonly crop?: { readonly width: number; readonly height: number };
  /** Which sample sets list the asset (see visual-direction-samples-v7.ts). */
  readonly sets: readonly string[];
}

const building = (
  id: string,
  subject: string,
  run: string,
  recipe: string,
  width: number,
  height: number,
  sets: readonly string[],
  candidates = 1,
  candidate = 0,
): Sample => ({
  id,
  subject,
  assetClass: subject.startsWith("CITY:") ? "SETTLEMENT" : "BUILDING",
  run,
  recipe,
  candidate,
  candidates,
  width,
  height,
  derivation: "SEATED",
  bottomMargin: 3,
  sets,
});

/** The reviewed choice per sample. */
export const DEMO_SAMPLES: readonly Sample[] = [
  {
    id: "chibi-demo-fighter",
    subject: "UNIT:FIGHTER",
    assetClass: "STANDARD_UNIT",
    run: "units",
    recipe: "fighter-heraldic-edit",
    candidate: 0,
    candidates: 2,
    width: 56,
    height: 80,
    derivation: "AS_IS",
    sets: ["demo"],
  },
  {
    id: "chibi-demo-marksman",
    subject: "UNIT:MARKSMAN",
    assetClass: "STANDARD_UNIT",
    run: "units",
    recipe: "marksman-heraldic-edit",
    candidate: 0,
    candidates: 2,
    width: 56,
    height: 80,
    derivation: "AS_IS",
    sets: ["demo"],
  },
  {
    id: "chibi-demo-knight",
    subject: "UNIT:KNIGHT",
    assetClass: "LARGE_UNIT",
    run: "units",
    recipe: "knight-heraldic-edit",
    candidate: 0,
    candidates: 2,
    width: 72,
    height: 88,
    derivation: "AS_IS",
    sets: ["demo"],
  },
  {
    id: "chibi-demo-farm",
    subject: "IMPROVEMENT:FARM",
    assetClass: "BUILDING",
    run: "farm",
    recipe: "farm-field-a-edit-2",
    candidate: 0,
    candidates: 2,
    width: 80,
    height: 80,
    derivation: "FARM_ROWS",
    sets: ["demo", "style-a", "style-b"],
  },
  // Building style comparison: A (soft chibi, full size) against B (flat,
  // smaller), three buildings each.
  building(
    "chibi-style-a-windmill",
    "IMPROVEMENT:WINDMILL",
    "buildings-soft",
    "windmill-soft-a",
    80,
    88,
    ["style-a"],
  ),
  building(
    "chibi-style-a-forge",
    "IMPROVEMENT:FORGE",
    "buildings-soft",
    "forge-soft-a",
    80,
    88,
    ["style-a"],
  ),
  building(
    "chibi-style-a-market",
    "IMPROVEMENT:MARKET",
    "buildings-soft",
    "market-soft-a",
    80,
    88,
    ["style-a"],
  ),
  building(
    "chibi-demo-windmill",
    "IMPROVEMENT:WINDMILL",
    "buildings-flat",
    "windmill-flat-a",
    64,
    72,
    ["demo", "style-b"],
    1,
  ),
  building(
    "chibi-style-b-forge",
    "IMPROVEMENT:FORGE",
    "buildings-flat",
    "forge-flat-a",
    64,
    64,
    ["style-b"],
    1,
  ),
  building(
    "chibi-style-b-market",
    "IMPROVEMENT:MARKET",
    "buildings-flat",
    "market-flat-a",
    64,
    64,
    ["style-b"],
    1,
  ),
  building(
    "chibi-demo-lumber-camp",
    "IMPROVEMENT:LUMBER_CAMP",
    "buildings-flat",
    "lumber-camp-b-a-edit",
    72,
    72,
    ["demo"],
    2,
  ),
  building(
    "chibi-demo-sawmill",
    "IMPROVEMENT:SAWMILL",
    "buildings-flat",
    "sawmill-b-a-edit",
    72,
    72,
    ["demo"],
    2,
  ),
  building(
    "chibi-demo-forge",
    "IMPROVEMENT:FORGE",
    "buildings-flat",
    "forge-b-a-edit",
    72,
    72,
    ["demo"],
    2,
  ),
  building(
    "chibi-demo-workshop",
    "IMPROVEMENT:WORKSHOP",
    "buildings-flat",
    "workshop-b-a-edit",
    72,
    72,
    ["demo"],
    2,
  ),
  building(
    "chibi-demo-market",
    "IMPROVEMENT:MARKET",
    "buildings-flat",
    "market-b-a-edit",
    72,
    72,
    ["demo"],
    2,
  ),
  building(
    "chibi-demo-monument",
    "IMPROVEMENT:MONUMENT",
    "buildings-flat",
    "monument-b-b-edit",
    48,
    72,
    ["demo"],
    2,
  ),
  building(
    "chibi-demo-port",
    "IMPROVEMENT:PORT",
    "buildings-flat",
    "port-b-a",
    72,
    72,
    ["demo"],
    1,
  ),
  building(
    "chibi-demo-shipyard",
    "IMPROVEMENT:SHIPYARD",
    "buildings-flat",
    "shipyard-b-a",
    72,
    72,
    ["demo"],
    1,
  ),
  {
    ...building(
      "chibi-demo-city-1",
      "CITY:1",
      "buildings-flat",
      "city-1-c-a-edit",
      96,
      96,
      ["demo"],
      2,
    ),
    crop: { width: 80, height: 80 },
  },
  {
    ...building(
      "chibi-demo-city-2",
      "CITY:2",
      "buildings-flat",
      "city-2-c-a-edit",
      96,
      96,
      ["demo"],
      2,
    ),
    crop: { width: 88, height: 80 },
  },
  {
    ...building(
      "chibi-demo-city-3",
      "CITY:3",
      "buildings-flat",
      "city-3-c-a-edit-2",
      96,
      96,
      ["demo"],
      2,
    ),
    crop: { width: 96, height: 88 },
  },
];

const alphaAt = (raster: RgbaRaster, x: number, y: number): number =>
  raster.data[(y * raster.width + x) * 4 + 3] ?? 0;

function bounds(raster: RgbaRaster): {
  left: number;
  right: number;
  top: number;
  bottom: number;
} {
  let left = raster.width;
  let right = -1;
  let top = raster.height;
  let bottom = -1;
  for (let y = 0; y < raster.height; y += 1)
    for (let x = 0; x < raster.width; x += 1)
      if (alphaAt(raster, x, y) >= 128) {
        left = Math.min(left, x);
        right = Math.max(right, x);
        top = Math.min(top, y);
        bottom = Math.max(bottom, y);
      }
  if (right < 0) throw new Error("the candidate is empty");
  return { left, right, top, bottom };
}

/** Copies the rows [top, bottom] of `from`, moved by (dx, dy), into `to`. */
function blit(
  from: RgbaRaster,
  to: Uint8Array,
  rows: { readonly top: number; readonly bottom: number },
  dx: number,
  dy: number,
): void {
  for (let y = rows.top; y <= rows.bottom; y += 1)
    for (let x = 0; x < from.width; x += 1) {
      const alpha = alphaAt(from, x, y);
      const nx = x + dx;
      const ny = y + dy;
      if (
        alpha < 128 ||
        nx < 0 ||
        ny < 0 ||
        nx >= from.width ||
        ny >= from.height
      )
        continue;
      const source = (y * from.width + x) * 4;
      const target = (ny * from.width + nx) * 4;
      to[target] = from.data[source] ?? 0;
      to[target + 1] = from.data[source + 1] ?? 0;
      to[target + 2] = from.data[source + 2] ?? 0;
      to[target + 3] = 255;
    }
}

/** Binary alpha, the art centred and `margin` pixels above the bottom. */
export function seated(raster: RgbaRaster, margin: number): RgbaRaster {
  const box = bounds(raster);
  const data = new Uint8Array(raster.data.length);
  const dx =
    Math.floor((raster.width - (box.right - box.left + 1)) / 2) - box.left;
  const dy = Math.max(-box.top, raster.height - 1 - margin - box.bottom);
  blit(raster, data, { top: 0, bottom: raster.height - 1 }, dx, dy);
  return { width: raster.width, height: raster.height, data };
}

/** The bottom-centred window of a raster; the art must lie inside it. */
export function bottomWindow(
  raster: RgbaRaster,
  size: { readonly width: number; readonly height: number },
): RgbaRaster {
  const window = {
    left: Math.floor((raster.width - size.width) / 2),
    top: raster.height - size.height,
    ...size,
  };
  const box = bounds(raster);
  if (
    box.left < window.left ||
    box.right >= window.left + size.width ||
    box.top < window.top
  )
    throw new Error(
      `the art (${box.left},${box.top}..${box.right},${box.bottom}) does not fit a ${size.width} x ${size.height} window`,
    );
  return cropRaster(raster, window);
}

const FARM_SATURATION = 0.8;
const FARM_STRAW_MIX = 0.18;
const PALE_STRAW = [238, 220, 160] as const;

/** The crop rows moved to an even pitch and calmed; see the file comment. */
export function farmRows(raster: RgbaRaster): RgbaRaster {
  const filled = Array.from({ length: raster.height }, (_, y) => {
    for (let x = 0; x < raster.width; x += 1)
      if (alphaAt(raster, x, y) >= 128) return true;
    return false;
  });
  const bands: { top: number; bottom: number }[] = [];
  for (let y = 0; y < raster.height; y += 1) {
    if (filled[y] !== true) continue;
    const last = bands.at(-1);
    if (last?.bottom === y - 1) last.bottom = y;
    else bands.push({ top: y, bottom: y });
  }
  if (bands.length !== 4)
    throw new Error(`the Farm needs four crop rows, found ${bands.length}`);
  const box = bounds(raster);
  const dx =
    Math.floor((raster.width - (box.right - box.left + 1)) / 2) - box.left;
  const data = new Uint8Array(raster.data.length);
  const pitch = raster.height / bands.length;
  bands.forEach((band, index) => {
    const height = band.bottom - band.top + 1;
    const top = Math.round(pitch * (index + 0.5) - height / 2);
    blit(raster, data, band, dx, top - band.top);
  });
  for (let index = 0; index < data.length; index += 4) {
    if (data[index + 3] === 0) continue;
    const r = data[index] ?? 0;
    const g = data[index + 1] ?? 0;
    const b = data[index + 2] ?? 0;
    const grey = 0.299 * r + 0.587 * g + 0.114 * b;
    [r, g, b].forEach((value, channel) => {
      const calm = grey + (value - grey) * FARM_SATURATION;
      data[index + channel] = Math.round(
        calm + ((PALE_STRAW[channel] ?? 0) - calm) * FARM_STRAW_MIX,
      );
    });
  }
  return { width: raster.width, height: raster.height, data };
}

async function png(raster: {
  readonly data: Uint8Array | Uint8ClampedArray;
  readonly width: number;
  readonly height: number;
}): Promise<Buffer> {
  return sharp(Buffer.from(raster.data), {
    raw: { width: raster.width, height: raster.height, channels: 4 },
  })
    .png({ compressionLevel: 9, palette: false })
    .toBuffer();
}

async function main(): Promise<void> {
  const directory = path.join(ROOT, RUN, "assets");
  await mkdir(directory, { recursive: true });
  const assets = [];
  for (const sample of DEMO_SAMPLES) {
    const sheet = await readRaster(
      path.join(ROOT, RUN, sample.run, "raw", `${sample.recipe}.png`),
    );
    const candidate = cropRaster(sheet, {
      ...candidateCell(sample.candidate, sample.candidates, sample),
      width: sample.width,
      height: sample.height,
    });
    const derived =
      sample.derivation === "SEATED"
        ? seated(candidate, sample.bottomMargin ?? 0)
        : sample.derivation === "FARM_ROWS"
          ? farmRows(candidate)
          : candidate;
    const master =
      sample.crop === undefined ? derived : bottomWindow(derived, sample.crop);
    await writeFile(
      path.join(directory, `${sample.id}.png`),
      await png(master),
    );
    const owned =
      sample.subject.startsWith("UNIT:") || sample.subject.startsWith("CITY:");
    if (owned)
      await writeFile(
        path.join(directory, `${sample.id}.mask.png`),
        await png({
          width: master.width,
          height: master.height,
          data: new Uint8Array(master.width * master.height * 4),
        }),
      );
    const box = bounds(master);
    console.log(
      `${sample.id}: ${master.width}x${master.height}, art ${box.left},${box.top}..${box.right},${box.bottom}`,
    );
    assets.push({
      id: sample.id,
      subject: sample.subject,
      assetClass: sample.assetClass,
      width: master.width,
      height: master.height,
      file: `${RUN}/assets/${sample.id}.png`,
      ...(owned
        ? { emptyOwnerMask: `${RUN}/assets/${sample.id}.mask.png` }
        : {}),
      source: `${RUN}/${sample.run}`,
      recipe: sample.recipe,
      candidate: sample.candidate,
      derivation: sample.derivation,
      artBounds: box,
      sets: sample.sets,
    });
  }
  await writeFile(
    path.join(ROOT, RUN, "samples.json"),
    `${JSON.stringify(
      {
        bead: "pulp_wars-3tq.3",
        note: "Sample sprites of the Human demo of the visual-direction study, cut by scripts/art/visual-direction/demo-samples.ts. Nothing here is registered as production art; the developer toggle loads the 'demo' set through src/render/canvas/visual-direction-samples-v7.ts.",
        assets,
      },
      null,
      2,
    )}\n`,
  );
}

if (process.argv[1]?.endsWith("demo-samples.ts") === true)
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "samples failed");
    process.exitCode = 1;
  });
