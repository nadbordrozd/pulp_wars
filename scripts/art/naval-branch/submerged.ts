/**
 * The submerged look of the Submarines (bead pulp_wars-5ti.6,
 * docs/art/NAVAL_FACTIONS.md, "The Submarines"). The naval branch asks for a
 * Submarine "drawn low in the water" (RULESET_7_NAVAL_BRANCH.md section
 * 14.1) and names no second raster, so the submerged sprite is derived from
 * the accepted surfaced one, with no PixelLab call:
 *
 * - the whole sprite sinks by SUBMERGED_SINK_ROWS rows, so the waterline
 *   stays on the row of the surfaced keel (the waterline every ship shares)
 *   and the lower part of the hull is under it;
 * - the part under the waterline is kept as a faint ghost (its colours at
 *   SUBMERGED_GHOST_ALPHA), so the water of the tile shows through it,
 *   whatever its depth;
 * - a line of pale foam is drawn where the hull meets the water, with a
 *   second broken line under it.
 *
 * Only the seven factions' Submarines of the live look have one. The shared
 * Submarine of the Classic look does not: the Classic registry holds only
 * accepted pipeline assets, so there a submerged Submarine falls back to
 * the surfaced one (chibiFallbackSubjectV7).
 *
 *   npx tsx scripts/art/naval-branch/submerged.ts          # write
 *   npx tsx scripts/art/naval-branch/submerged.ts --check  # verify
 *
 * `npm run art:validate` runs the check (submergedSubmarineProblems): every
 * checked-in submerged raster is exactly what its surfaced master derives.
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

export interface SubmergedRaster {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8Array;
}

/** Rows the sprite sinks: about a quarter of a Submarine's hull. */
export const SUBMERGED_SINK_ROWS = 7;
/** Alpha of the hull under the waterline (of 255). */
export const SUBMERGED_GHOST_ALPHA = 72;
/** The foam where the hull meets the water. */
export const SUBMERGED_FOAM = { r: 0xf1, g: 0xfb, b: 0xff } as const;
const FOAM_ALPHA = 235;
const FOAM_UNDER_ALPHA = 150;

/** The asset ids of the surfaced Submarines of the live look. */
export const SUBMARINE_ASSET_IDS = [
  "chibi-naval-human-submarine",
  "chibi-naval-undead-submarine",
  "chibi-naval-goblin-submarine",
  "chibi-naval-dinosaur-submarine",
  "chibi-naval-martian-submarine",
  "chibi-naval-dwarf-submarine",
  "chibi-naval-candy-submarine",
  "chibi-naval-cult-submarine",
] as const;

const UNITS = "public/assets/chibi/units";

export function submergedAssetId(id: string): string {
  return `${id}-submerged`;
}

function lowestOpaqueRow(raster: SubmergedRaster): number {
  for (let y = raster.height - 1; y >= 0; y -= 1)
    for (let x = 0; x < raster.width; x += 1)
      if ((raster.data[(y * raster.width + x) * 4 + 3] ?? 0) >= 128) return y;
  throw new Error("the sprite has no opaque pixel");
}

/**
 * The submerged sprite of a surfaced master. Pure: the same master always
 * gives the same pixels.
 */
export function submergedSubmarineRaster(
  master: SubmergedRaster,
): SubmergedRaster {
  const { width, height } = master;
  const waterline = lowestOpaqueRow(master);
  const data = new Uint8Array(width * height * 4);
  let left = width;
  let right = -1;
  for (let y = 0; y < height; y += 1)
    for (let x = 0; x < width; x += 1) {
      const from = (y * width + x) * 4;
      const alpha = master.data[from + 3] ?? 0;
      if (alpha === 0) continue;
      const row = y + SUBMERGED_SINK_ROWS;
      if (row >= height) continue;
      const to = (row * width + x) * 4;
      data[to] = master.data[from] ?? 0;
      data[to + 1] = master.data[from + 1] ?? 0;
      data[to + 2] = master.data[from + 2] ?? 0;
      data[to + 3] =
        row > waterline
          ? Math.round((alpha * SUBMERGED_GHOST_ALPHA) / 255)
          : alpha;
      if (row === waterline && alpha >= 128) {
        left = Math.min(left, x);
        right = Math.max(right, x);
      }
    }
  if (right < left) throw new Error("no hull at the waterline");
  // The foam: one pale row where the hull meets the water, a pixel wider on
  // each side, and a broken row under it.
  const foam = (x: number, row: number, alpha: number): void => {
    if (x < 0 || x >= width || row >= height) return;
    const to = (row * width + x) * 4;
    data[to] = SUBMERGED_FOAM.r;
    data[to + 1] = SUBMERGED_FOAM.g;
    data[to + 2] = SUBMERGED_FOAM.b;
    data[to + 3] = alpha;
  };
  for (let x = left - 1; x <= right + 1; x += 1) {
    foam(x, waterline, FOAM_ALPHA);
    // Three foam pixels, then a gap of two.
    if ((x - left + 5) % 5 < 3) foam(x, waterline + 1, FOAM_UNDER_ALPHA);
  }
  return { width, height, data };
}

async function read(file: string): Promise<SubmergedRaster> {
  const { data, info } = await sharp(file)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { width: info.width, height: info.height, data: new Uint8Array(data) };
}

async function png(raster: SubmergedRaster): Promise<Buffer> {
  return sharp(Buffer.from(raster.data), {
    raw: { width: raster.width, height: raster.height, channels: 4 },
  })
    .png({ compressionLevel: 9, palette: false })
    .toBuffer();
}

/** Every submerged file (repository-relative) and its derived bytes. */
export async function deriveSubmergedSubmarines(
  root: string,
): Promise<ReadonlyMap<string, Buffer>> {
  const files = new Map<string, Buffer>();
  for (const id of SUBMARINE_ASSET_IDS) {
    const master = await read(path.join(root, UNITS, `${id}.png`));
    files.set(
      `${UNITS}/${submergedAssetId(id)}.png`,
      await png(submergedSubmarineRaster(master)),
    );
  }
  return files;
}

/** The pixels of a PNG, so a check does not depend on the encoder. */
async function pixels(bytes: Buffer): Promise<string> {
  const { data, info } = await sharp(bytes)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return `${info.width}x${info.height}:${data.toString("base64")}`;
}

/** For `art:validate`: the checked-in submerged rasters are the derived ones. */
export async function submergedSubmarineProblems(
  root: string,
): Promise<string[]> {
  const problems: string[] = [];
  let derived: ReadonlyMap<string, Buffer>;
  try {
    derived = await deriveSubmergedSubmarines(root);
  } catch (error) {
    return [
      `submerged submarines: ${error instanceof Error ? error.message : String(error)}`,
    ];
  }
  for (const [file, bytes] of derived) {
    const checkedIn = await readFile(path.join(root, file)).catch(() => null);
    if (checkedIn === null)
      problems.push(`submerged submarines: ${file} is missing`);
    else if ((await pixels(checkedIn)) !== (await pixels(bytes)))
      problems.push(
        `submerged submarines: ${file} is not what its surfaced master derives (run scripts/art/naval-branch/submerged.ts)`,
      );
  }
  return problems;
}

async function main(): Promise<void> {
  const root = process.cwd();
  if (process.argv.includes("--check")) {
    const problems = await submergedSubmarineProblems(root);
    if (problems.length > 0) throw new Error(problems.join("\n"));
    console.log("submerged submarines: derived rasters match");
    return;
  }
  for (const [file, bytes] of await deriveSubmergedSubmarines(root)) {
    await writeFile(path.join(root, file), bytes);
    console.log(`wrote ${file}`);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url))
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "failed");
    process.exitCode = 1;
  });
