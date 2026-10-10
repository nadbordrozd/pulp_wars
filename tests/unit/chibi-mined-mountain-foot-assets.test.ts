import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import record from "../../src/assets/chibi-mountain-ranges.json";
import { mineKept, restyled } from "../../scripts/art/chibi-mountain-ranges";
import { readRaster } from "../../scripts/art/chibi/pipeline";

/**
 * Bead pulp_wars-2yc.41: "the mined mountain has an outlined foot that the
 * plain mountains do not; make it sit on the ground like the others." The
 * bake cuts the foot of a mined mountain's rock as it cuts every
 * mountain's, and leaves its entrance, its tunnel and its ore cart whole.
 */

const ROOT = path.resolve(import.meta.dirname, "../..");

interface Image {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8Array;
}

async function raster(relative: string): Promise<Image> {
  const read = await readRaster(await readFile(path.join(ROOT, relative)));
  return {
    width: read.width,
    height: read.height,
    data: new Uint8Array(read.data),
  };
}

const alpha = (image: Image, x: number, y: number): number =>
  image.data[(y * image.width + x) * 4 + 3] ?? 0;
const brightest = (image: Image, x: number, y: number): number =>
  Math.max(
    image.data[(y * image.width + x) * 4] ?? 0,
    image.data[(y * image.width + x) * 4 + 1] ?? 0,
    image.data[(y * image.width + x) * 4 + 2] ?? 0,
  );

/** The lowest painted row of each painted column, by column. */
function feet(image: Image): Map<number, number> {
  const result = new Map<number, number>();
  for (let x = 0; x < image.width; x += 1)
    for (let y = image.height - 1; y >= 0; y -= 1)
      if (alpha(image, x, y) > 0) {
        result.set(x, y);
        break;
      }
  return result;
}

/** The outline of a restyled mountain is dark slate (78, 68, 70). */
const OUTLINE_MAX = 80;

/** Share of the columns whose lowest paint is an outline pixel. */
function outlinedFoot(image: Image): number {
  const columns = [...feet(image)];
  return (
    columns.filter(([x, y]) => brightest(image, x, y) <= OUTLINE_MAX).length /
    columns.length
  );
}

/**
 * A 40 x 30 mountain: a grey block with a black outline, a cream timber
 * frame round a black tunnel at its foot (columns 8 to 17) and a brown ore
 * cart (columns 24 to 31) standing on the bottom outline.
 */
function drawn(): Image {
  const width = 40;
  const height = 30;
  const data = new Uint8Array(width * height * 4);
  const paint = (
    x: number,
    y: number,
    colour: readonly [number, number, number],
  ): void => {
    data.set([...colour, 255], (y * width + x) * 4);
  };
  for (let y = 4; y < height; y += 1)
    for (let x = 2; x < width - 2; x += 1) {
      const edge = y === 4 || y === height - 1 || x === 2 || x === width - 3;
      paint(x, y, edge ? [20, 20, 22] : [150, 150, 156]);
    }
  for (let y = 12; y <= height - 3; y += 1)
    for (let x = 8; x <= 17; x += 1) {
      const frame = y === 12 || x <= 9 || x >= 16;
      paint(x, y, frame ? [236, 214, 160] : [8, 8, 10]);
    }
  for (let y = 20; y <= height - 2; y += 1)
    for (let x = 24; x <= 31; x += 1) paint(x, y, [140, 84, 40]);
  return { width, height, data };
}

describe("the mined mountain's foot", () => {
  it("cuts the rock's foot of a Mine and leaves its timber, tunnel and cart whole", () => {
    const source = drawn();
    expect(outlinedFoot(source)).toBe(1);
    const kept = mineKept(source);
    const mine = restyled(source, true);
    // Everything of the entrance and the cart is still there.
    for (let y = 0; y < source.height; y += 1)
      for (let x = 0; x < source.width; x += 1) {
        const feature =
          (x >= 8 && x <= 17 && y >= 12 && y <= source.height - 3) ||
          (x >= 24 && x <= 31 && y >= 20 && y <= source.height - 2);
        if (!feature) continue;
        expect(kept[y * source.width + x], `${x},${y} is kept`).toBe(1);
        expect(alpha(mine, x, y), `${x},${y} is painted`).toBe(255);
      }
    // Plain rock columns lose their outlined foot, exactly as a mountain's.
    const plain = restyled(source, false);
    for (const x of [4, 5, 20, 21, 34, 35]) {
      const foot = feet(mine).get(x) ?? source.height;
      expect(foot, `column ${x}`).toBe(feet(plain).get(x));
      expect(foot).toBeLessThanOrEqual(source.height - 6);
      expect(brightest(mine, x, foot)).toBeGreaterThan(OUTLINE_MAX);
    }
    // Under the cart the cut stops at the cart: it stands on the ground.
    for (const x of [26, 27, 28])
      expect(feet(mine).get(x)).toBeGreaterThanOrEqual(source.height - 2);
  });

  it.each(record.mines.map((piece) => [piece.id, piece.path] as const))(
    "%s has no outlined foot",
    async (_id, file) => {
      const image = await raster(file);
      // Before the bead every column of the mined mountain ended in its
      // dark outline; what is left of it is under the timber and the cart.
      expect(outlinedFoot(image)).toBeLessThan(0.35);
    },
  );
});
