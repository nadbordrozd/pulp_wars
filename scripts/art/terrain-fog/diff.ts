/**
 * Counts the pixels that differ between two screenshots of the same size
 * and, with a third argument, writes the second with the differing pixels
 * in magenta (bead pulp_wars-2yc.28).
 *
 *   npx tsx scripts/art/terrain-fog/diff.ts <a.png> <b.png> [out.png]
 *
 * With `TERRAIN_FOG_DIFF_BOX=x,y,w,h` only that rectangle is compared.
 * With `TERRAIN_FOG_DIFF_FOG=<shot.json>` (the geometry review.ts writes
 * beside a shot) the unexplored cells of that shot are left out, and with
 * them the `TERRAIN_FOG_DIFF_MARGIN` master pixels (default 24: the reach
 * of the cloud's edge and of a band of tree tops) round each of them.
 */
import { readFile } from "node:fs/promises";
import sharp from "sharp";

const [a, b, out] = process.argv.slice(2);
if (a === undefined || b === undefined)
  throw new Error("usage: diff.ts <a.png> <b.png> [out.png]");
const read = async (
  file: string,
): Promise<{ data: Buffer; width: number; height: number }> => {
  const { data, info } = await sharp(file)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
};
const left = await read(a);
const right = await read(b);
if (left.width !== right.width || left.height !== right.height)
  throw new Error("the screenshots differ in size");
const box = (process.env.TERRAIN_FOG_DIFF_BOX ?? "")
  .split(",")
  .map(Number)
  .filter((value) => Number.isFinite(value));
const [x0 = 0, y0 = 0, w = left.width, h = left.height] =
  box.length === 4 ? box : [];
const geometryFile = process.env.TERRAIN_FOG_DIFF_FOG;
const geometry =
  geometryFile === undefined
    ? null
    : (JSON.parse(await readFile(geometryFile, "utf8")) as {
        x: number;
        y: number;
        cell: number;
        fog: [number, number][];
      });
const margin =
  geometry === null
    ? 0
    : (Number(process.env.TERRAIN_FOG_DIFF_MARGIN ?? 24) * geometry.cell) / 80;
const masked = new Uint8Array(left.width * left.height);
if (geometry !== null)
  for (const [cx, cy] of geometry.fog) {
    const fx0 = Math.floor(geometry.x + (cx - 0.5) * geometry.cell - margin);
    const fy0 = Math.floor(geometry.y + (cy - 0.5) * geometry.cell - margin);
    const fx1 = Math.ceil(geometry.x + (cx + 0.5) * geometry.cell + margin);
    const fy1 = Math.ceil(geometry.y + (cy + 0.5) * geometry.cell + margin);
    for (let y = Math.max(0, fy0); y < Math.min(left.height, fy1); y += 1)
      masked.fill(
        1,
        y * left.width + Math.max(0, fx0),
        y * left.width + Math.max(0, Math.min(left.width, fx1)),
      );
  }
let count = 0;
let minX = Infinity;
let minY = Infinity;
let maxX = -1;
let maxY = -1;
const marked = Buffer.from(right.data);
for (let y = y0; y < Math.min(left.height, y0 + h); y += 1)
  for (let x = x0; x < Math.min(left.width, x0 + w); x += 1) {
    const at = (y * left.width + x) * 4;
    if (masked[y * left.width + x] === 1) {
      // Left out: shown darker in the marked picture.
      marked[at] = (marked[at] ?? 0) >> 1;
      marked[at + 1] = (marked[at + 1] ?? 0) >> 1;
      marked[at + 2] = (marked[at + 2] ?? 0) >> 1;
      continue;
    }
    if (
      left.data[at] === right.data[at] &&
      left.data[at + 1] === right.data[at + 1] &&
      left.data[at + 2] === right.data[at + 2]
    )
      continue;
    count += 1;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
    marked[at] = 255;
    marked[at + 1] = 0;
    marked[at + 2] = 255;
  }
console.log(
  count === 0
    ? `0 pixels differ`
    : `${count} pixels differ, inside x ${minX} to ${maxX}, y ${minY} to ${maxY}`,
);
if (out !== undefined)
  await sharp(marked, {
    raw: { width: left.width, height: left.height, channels: 4 },
  })
    .png()
    .toFile(out);
