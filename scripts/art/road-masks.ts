import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { format } from "prettier";
import sharp from "sharp";

const ROOT = process.cwd();
const SOURCE = path.join(
  ROOT,
  "public/assets/pixellab/terrain/road-material.png",
);
const OUTPUT_ROOT = path.join(
  ROOT,
  "public/assets/pixellab/terrain/road-masks",
);
const MANIFEST = path.join(ROOT, "scripts/art/road-masks.generated.json");
const WIDTH = 256;
const HEIGHT = 148;
const CENTER = { x: 128, y: 74 } as const;

export const ROAD_MASK_DIRECTION_BITS = Object.freeze({
  NORTH: 0b1000,
  EAST: 0b0100,
  SOUTH: 0b0010,
  WEST: 0b0001,
});

export const ROAD_MASK_IDS = Object.freeze(
  Array.from({ length: 16 }, (_, mask) => roadMaskId(mask)),
);

interface AlphaBounds {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly empty: boolean;
}

async function main(): Promise<void> {
  const source = await readFile(SOURCE);
  const metadata = await sharp(source).metadata();
  if (
    metadata.width !== WIDTH ||
    metadata.height !== HEIGHT ||
    metadata.channels !== 4
  )
    throw new Error(
      "Accepted Road material must be straight-alpha 256x148 RGBA",
    );
  await mkdir(OUTPUT_ROOT, { recursive: true });
  const records = [];
  for (let mask = 0; mask < 16; mask += 1) {
    const id = roadMaskId(mask);
    const output = path.join(OUTPUT_ROOT, `${id}.png`);
    const alphaMask = Buffer.from(maskSvg(mask));
    const png = await sharp(source)
      .ensureAlpha()
      .composite([{ input: alphaMask, blend: "dest-in" }])
      .png({ compressionLevel: 9, adaptiveFiltering: false })
      .toBuffer();
    await writeFile(output, png);
    records.push({
      id: `terrain-${id}`,
      mask,
      bits: maskBits(mask),
      semantics: roadSemantics(mask),
      output: path.relative(ROOT, output).replaceAll("\\", "/"),
      sha256: sha256(png),
      width: WIDTH,
      height: HEIGHT,
      anchor: CENTER,
      alphaBounds: await alphaBounds(png),
      accepted: true,
    });
  }
  const manifest = {
    schemaVersion: 1,
    algorithm: "orthogonal-road-mask-v1",
    deterministicProcessing: {
      source: path.relative(ROOT, SOURCE).replaceAll("\\", "/"),
      sourceSha256: sha256(source),
      canvas: { width: WIDTH, height: HEIGHT },
      anchor: CENTER,
      directionBitOrder: ["NORTH", "EAST", "SOUTH", "WEST"],
      directionBits: ROAD_MASK_DIRECTION_BITS,
      centerPad: { cx: 128, cy: 74, rx: 24, ry: 14 },
      arm: {
        strokeWidth: 36,
        lineCap: "round",
        endpoints: {
          NORTH: { x: 192, y: 37 },
          EAST: { x: 192, y: 111 },
          SOUTH: { x: 64, y: 111 },
          WEST: { x: 64, y: 37 },
        },
      },
      emptySemantics:
        "No ROAD render entry emits no overlay. Mask 0000 is an isolated Road tile and renders only the central material pad.",
      diagonalSemantics:
        "No diagonal bits or joins exist; every arm terminates only at an orthogonal shared-edge midpoint.",
    },
    records,
  };
  const formattedManifest = await format(JSON.stringify(manifest), {
    parser: "json",
  });
  await writeFile(MANIFEST, formattedManifest, "utf8");
  console.log(`Derived ${records.length} deterministic Road masks.`);
}

function roadMaskId(mask: number): string {
  return `road-mask-${maskBits(mask)}`;
}

function maskBits(mask: number): string {
  return mask.toString(2).padStart(4, "0");
}

function roadSemantics(mask: number): readonly string[] {
  return Object.entries(ROAD_MASK_DIRECTION_BITS)
    .filter(([, bit]) => (mask & bit) !== 0)
    .map(([direction]) => direction);
}

function maskSvg(mask: number): string {
  const arms = [
    [ROAD_MASK_DIRECTION_BITS.NORTH, 192, 37],
    [ROAD_MASK_DIRECTION_BITS.EAST, 192, 111],
    [ROAD_MASK_DIRECTION_BITS.SOUTH, 64, 111],
    [ROAD_MASK_DIRECTION_BITS.WEST, 64, 37],
  ] as const;
  const lines = arms
    .filter(([bit]) => (mask & bit) !== 0)
    .map(
      ([, x, y]) =>
        `<line x1="${CENTER.x}" y1="${CENTER.y}" x2="${x}" y2="${y}" stroke="white" stroke-width="36" stroke-linecap="round"/>`,
    )
    .join("");
  return `<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="black" fill-opacity="0"/>${lines}<ellipse cx="128" cy="74" rx="24" ry="14" fill="white"/></svg>`;
}

async function alphaBounds(png: Buffer): Promise<AlphaBounds> {
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

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
