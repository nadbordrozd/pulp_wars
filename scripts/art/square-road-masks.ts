import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { format } from "prettier";
import sharp from "sharp";

const root = process.cwd();
const sourcePath = path.join(
  root,
  "public/assets/pixellab/terrain-square/road-material.png",
);
const outputRoot = path.join(
  root,
  "public/assets/pixellab/terrain-square/road-masks",
);
const manifestPath = path.join(
  root,
  "scripts/art/square-road-masks.generated.json",
);
const size = 256;
const center = { x: 128, y: 128 } as const;

export const SQUARE_ROAD_DIRECTION_BITS = Object.freeze({
  NORTH: 0b1000,
  EAST: 0b0100,
  SOUTH: 0b0010,
  WEST: 0b0001,
});

export const SQUARE_ROAD_MASK_IDS = Object.freeze(
  Array.from(
    { length: 16 },
    (_, mask) => `terrain-square-road-mask-${bits(mask)}`,
  ),
);

const source = await readFile(sourcePath);
const metadata = await sharp(source).metadata();
if (
  metadata.width !== size ||
  metadata.height !== size ||
  metadata.channels !== 4
)
  throw new Error("Accepted square Road material must be 256x256 RGBA");

await mkdir(outputRoot, { recursive: true });
const records = [];
for (let mask = 0; mask < 16; mask += 1) {
  const maskBits = bits(mask);
  const output = path.join(outputRoot, `road-mask-${maskBits}.png`);
  const png = await sharp(source)
    .ensureAlpha()
    .composite([{ input: Buffer.from(maskSvg(mask)), blend: "dest-in" }])
    .png({ compressionLevel: 9, adaptiveFiltering: false })
    .toBuffer();
  await writeFile(output, png);
  records.push({
    id: `terrain-square-road-mask-${maskBits}`,
    mask,
    bits: maskBits,
    semantics: Object.entries(SQUARE_ROAD_DIRECTION_BITS)
      .filter(([, bit]) => (mask & bit) !== 0)
      .map(([direction]) => direction),
    output: path.relative(root, output).replaceAll("\\", "/"),
    sha256: sha256(png),
    width: size,
    height: size,
    anchor: center,
    alphaBounds: await alphaBounds(png),
    accepted: true,
  });
}

const manifest = {
  schemaVersion: 1,
  algorithm: "orthogonal-square-road-mask-v1",
  deterministicProcessing: {
    source: path.relative(root, sourcePath).replaceAll("\\", "/"),
    sourceSha256: sha256(source),
    canvas: { width: size, height: size },
    anchor: center,
    directionBitOrder: ["NORTH", "EAST", "SOUTH", "WEST"],
    directionBits: SQUARE_ROAD_DIRECTION_BITS,
    centerPad: { cx: 128, cy: 128, radius: 27 },
    arm: {
      strokeWidth: 42,
      lineCap: "round",
      endpoints: {
        NORTH: { x: 128, y: 0 },
        EAST: { x: 256, y: 128 },
        SOUTH: { x: 128, y: 256 },
        WEST: { x: 0, y: 128 },
      },
    },
    emptySemantics:
      "No ROAD render entry emits no overlay. Mask 0000 is an isolated Road tile and renders only the central material pad.",
    adjacencySemantics:
      "Each enabled arm reaches the exact midpoint of its NORTH, EAST, SOUTH, or WEST square edge, giving equal opposing-edge alpha.",
    diagonalSemantics:
      "No diagonal bits, diagonal arms, or diagonal joins exist; corner alpha remains transparent in all 16 masks.",
  },
  records,
};
await writeFile(
  manifestPath,
  await format(JSON.stringify(manifest), { parser: "json" }),
  "utf8",
);
console.log(`Derived ${records.length} deterministic square Road masks.`);

function bits(mask: number): string {
  return mask.toString(2).padStart(4, "0");
}

function maskSvg(mask: number): string {
  const endpoints = [
    [SQUARE_ROAD_DIRECTION_BITS.NORTH, 128, 0],
    [SQUARE_ROAD_DIRECTION_BITS.EAST, 256, 128],
    [SQUARE_ROAD_DIRECTION_BITS.SOUTH, 128, 256],
    [SQUARE_ROAD_DIRECTION_BITS.WEST, 0, 128],
  ] as const;
  const arms = endpoints
    .filter(([bit]) => (mask & bit) !== 0)
    .map(
      ([, x, y]) =>
        `<line x1="128" y1="128" x2="${x}" y2="${y}" stroke="white" stroke-width="42" stroke-linecap="round"/>`,
    )
    .join("");
  return `<svg width="256" height="256" xmlns="http://www.w3.org/2000/svg"><rect width="256" height="256" fill="black" fill-opacity="0"/>${arms}<circle cx="128" cy="128" r="27" fill="white"/></svg>`;
}

async function alphaBounds(png: Buffer): Promise<{
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly empty: boolean;
}> {
  const { data, info } = await sharp(png)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let left = info.width;
  let top = info.height;
  let right = -1;
  let bottom = -1;
  for (let y = 0; y < info.height; y += 1)
    for (let x = 0; x < info.width; x += 1) {
      if ((data[(y * info.width + x) * 4 + 3] ?? 0) === 0) continue;
      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x + 1);
      bottom = Math.max(bottom, y + 1);
    }
  return right < 0
    ? { left: 0, top: 0, right: 0, bottom: 0, empty: true }
    : { left, top, right, bottom, empty: false };
}

function sha256(data: Buffer): string {
  return createHash("sha256").update(data).digest("hex");
}
