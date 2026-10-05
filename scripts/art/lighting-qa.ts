/**
 * Lighting QA (bead pulp_wars-2yc.1). The user's rule of 2026-10-05: "the
 * sun is in the south west - bottom left". In the game's three-quarter view
 * that means faces turned to the left (and toward the viewer) are lit,
 * faces turned to the right are in shadow, and a cast shadow falls up and
 * to the right, behind the thing.
 *
 *   npx tsx scripts/art/lighting-qa.ts <file-or-directory>...
 *
 * Two numbers per sprite, in luma points (0 to 255), positive when the
 * light comes from the left:
 *
 * - **thirds**: mean luma of the left third of the sprite's opaque box
 *   minus that of its right third. Simple, but a sprite with a pale thing
 *   on one side (a shield, a snow cap) moves it.
 * - **faces**: every row is cut into runs of paint between outline or
 *   clear pixels (one run is about one face of one peak, roof or body);
 *   in each run of 8 px or more the mean luma of the left half minus that
 *   of the right half, averaged over the runs by their length. This reads
 *   the shading of each form, so a ridge of five peaks counts five times
 *   and not as one blob.
 *
 * `lightVerdict` calls a sprite LEFT when `faces` is at least +1.5, RIGHT
 * when at most -1.5, and FLAT between. Outline pixels (no channel over 62)
 * are never counted; `rockOnly` also leaves out green pixels (the pines and
 * bushes at a mountain's foot).
 */
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { readRaster } from "./chibi/pipeline";

export interface LightRaster {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8Array | Uint8ClampedArray;
}

export interface Lighting {
  readonly thirds: number;
  readonly faces: number;
  readonly left: number;
  readonly right: number;
}

export const LIGHT_THRESHOLD = 1.5;
const OUTLINE_MAX_CHANNEL = 62;
const MIN_RUN = 8;

export function lightVerdict(lighting: Lighting): "LEFT" | "RIGHT" | "FLAT" {
  return lighting.faces >= LIGHT_THRESHOLD
    ? "LEFT"
    : lighting.faces <= -LIGHT_THRESHOLD
      ? "RIGHT"
      : "FLAT";
}

export function lightingOf(raster: LightRaster, rockOnly = false): Lighting {
  const { width, height, data } = raster;
  /** Luma of a counted pixel, or -1 for clear, outline or left-out paint. */
  const lumaAt = (x: number, y: number): number => {
    const offset = (y * width + x) * 4;
    if ((data[offset + 3] ?? 0) < 128) return -1;
    const r = data[offset] ?? 0;
    const g = data[offset + 1] ?? 0;
    const b = data[offset + 2] ?? 0;
    if (Math.max(r, g, b) <= OUTLINE_MAX_CHANNEL) return -1;
    if (rockOnly && g > r + 6 && g > b + 6) return -1;
    return 0.299 * r + 0.587 * g + 0.114 * b;
  };
  let x0 = width;
  let x1 = -1;
  for (let y = 0; y < height; y += 1)
    for (let x = 0; x < width; x += 1)
      if ((data[(y * width + x) * 4 + 3] ?? 0) >= 128) {
        x0 = Math.min(x0, x);
        x1 = Math.max(x1, x);
      }
  if (x1 < 0) return { thirds: 0, faces: 0, left: 0, right: 0 };
  const third = (x1 - x0 + 1) / 3;
  let leftSum = 0;
  let leftCount = 0;
  let rightSum = 0;
  let rightCount = 0;
  let facesSum = 0;
  let facesWeight = 0;
  for (let y = 0; y < height; y += 1) {
    let run: number[] = [];
    const close = (): void => {
      if (run.length >= MIN_RUN) {
        const half = Math.floor(run.length / 2);
        let a = 0;
        let b = 0;
        for (let i = 0; i < half; i += 1) {
          a += run[i] ?? 0;
          b += run[run.length - 1 - i] ?? 0;
        }
        facesSum += ((a - b) / half) * run.length;
        facesWeight += run.length;
      }
      run = [];
    };
    for (let x = x0; x <= x1; x += 1) {
      const luma = lumaAt(x, y);
      if (luma < 0) {
        close();
        continue;
      }
      run.push(luma);
      if (x - x0 < third) {
        leftSum += luma;
        leftCount += 1;
      } else if (x - x0 >= 2 * third) {
        rightSum += luma;
        rightCount += 1;
      }
    }
    close();
  }
  const left = leftCount === 0 ? 0 : leftSum / leftCount;
  const right = rightCount === 0 ? 0 : rightSum / rightCount;
  return {
    thirds: left - right,
    faces: facesWeight === 0 ? 0 : facesSum / facesWeight,
    left,
    right,
  };
}

async function filesOf(target: string): Promise<string[]> {
  if (!(await stat(target)).isDirectory()) return [target];
  return (await readdir(target))
    .filter(
      (name) =>
        name.endsWith(".png") &&
        !name.endsWith(".mask.png") &&
        !name.endsWith(".master.png"),
    )
    .sort()
    .map((name) => path.join(target, name));
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const rockOnly = args.includes("--rock");
  const verbose = args.includes("--each");
  for (const target of args.filter((arg) => !arg.startsWith("--"))) {
    const files = await filesOf(target);
    const tally = { LEFT: 0, RIGHT: 0, FLAT: 0 };
    let thirds = 0;
    let faces = 0;
    const wrong: string[] = [];
    for (const file of files) {
      const lighting = lightingOf(
        await readRaster(await readFile(file)),
        rockOnly,
      );
      const verdict = lightVerdict(lighting);
      tally[verdict] += 1;
      thirds += lighting.thirds;
      faces += lighting.faces;
      if (verdict === "RIGHT")
        wrong.push(`${path.basename(file)} (${lighting.faces.toFixed(1)})`);
      if (verbose || files.length === 1)
        console.log(
          `  ${path.basename(file).padEnd(44)} thirds ${lighting.thirds.toFixed(1).padStart(6)}  faces ${lighting.faces.toFixed(1).padStart(6)}  ${verdict}`,
        );
    }
    console.log(
      `${target}: ${files.length} sprites, lit from the LEFT ${tally.LEFT}, FLAT ${tally.FLAT}, from the RIGHT ${tally.RIGHT}; mean thirds ${(thirds / files.length).toFixed(1)}, mean faces ${(faces / files.length).toFixed(1)}`,
    );
    if (wrong.length > 0) console.log(`  from the right: ${wrong.join(", ")}`);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url))
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "failed");
    process.exitCode = 1;
  });
