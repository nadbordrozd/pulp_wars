import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import sharp from "sharp";
import {
  MOUNTAIN_ART_GEOMETRY,
  SETTLEMENT_ART_GEOMETRY,
  type SourceGeometry,
} from "../../src/render/canvas/board-art-geometry";

interface AlphaBounds {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

interface AcceptedRecord {
  readonly alphaBounds?: AlphaBounds;
}

interface GeneratedManifest {
  readonly records: Readonly<Record<string, AcceptedRecord>>;
}

interface ReviewAsset {
  readonly id: string;
  readonly file: string;
  readonly geometry: SourceGeometry;
  readonly previous: SourceGeometry;
  readonly kind: "MOUNTAIN" | "SETTLEMENT";
}

const root = process.cwd();
const generated = JSON.parse(
  await readFile(
    path.join(root, "scripts/art/pixellab-generated.json"),
    "utf8",
  ),
) as GeneratedManifest;
const previousMountain: SourceGeometry = {
  width: 256,
  height: 296,
  anchor: { x: 128, y: 186 },
  displayScale: 0.5,
};
const previousVillage: SourceGeometry = {
  width: 256,
  height: 296,
  anchor: { x: 128, y: 222 },
  displayScale: 0.5,
};
const previousCity: SourceGeometry = {
  width: 384,
  height: 384,
  anchor: { x: 192, y: 300 },
  displayScale: 0.3,
};
const assets: readonly ReviewAsset[] = [
  ...MOUNTAIN_ART_GEOMETRY.map((geometry, index) => ({
    id: `terrain-mountain-${index + 1}`,
    file: `public/assets/pixellab/terrain/mountain-${index + 1}.png`,
    geometry,
    previous: previousMountain,
    kind: "MOUNTAIN" as const,
  })),
  {
    id: "building-village",
    file: "public/assets/pixellab/buildings/village.png",
    geometry: SETTLEMENT_ART_GEOMETRY.village,
    previous: previousVillage,
    kind: "SETTLEMENT",
  },
  ...([1, 2, 3] as const).map((level) => ({
    id: `building-city-${level}`,
    file: `public/assets/pixellab/buildings/city-${level}.png`,
    geometry: SETTLEMENT_ART_GEOMETRY.cities[level],
    previous: previousCity,
    kind: "SETTLEMENT" as const,
  })),
];

for (const asset of assets) {
  const measurement = await measureAlpha(path.join(root, asset.file));
  const manifestBounds = generated.records[asset.id]?.alphaBounds;
  if (manifestBounds === undefined)
    throw new Error(`${asset.id}: generated manifest has no alpha bounds`);
  assertSameBounds(asset.id, measurement.bounds, manifestBounds);

  const before = displayBounds(measurement.bounds, asset.previous);
  const after = displayBounds(measurement.bounds, asset.geometry);
  const lowerOverflow = lowerDiamondOverflow(
    measurement.alphaPixels,
    asset.geometry,
  );
  if (asset.kind === "MOUNTAIN") {
    if (asset.geometry.lowerDiamondClip !== true)
      throw new Error(`${asset.id}: lower-diamond clip is required`);
    if (
      after.left < -52 ||
      after.right > 52 ||
      after.top < -63 ||
      after.bottom > 31
    )
      throw new Error(`${asset.id}: calibrated bounds exceed the contract`);
  } else if (
    after.right - after.left > 108 ||
    after.bottom < 30 ||
    after.bottom > 30.5
  ) {
    throw new Error(`${asset.id}: settlement bounds exceed the contract`);
  }

  console.log(
    [
      asset.id,
      `source=${formatBounds(measurement.bounds)}`,
      `before=${formatBounds(before)}`,
      `after=${formatBounds(after)}`,
      asset.kind === "MOUNTAIN"
        ? `raw-lower-diamond-overflow=${round(lowerOverflow)}px; runtime-clip=0px`
        : "runtime-clip=none",
    ].join(" | "),
  );
}

async function measureAlpha(file: string): Promise<{
  readonly bounds: AlphaBounds;
  readonly alphaPixels: readonly { readonly x: number; readonly y: number }[];
}> {
  const { data, info } = await sharp(file)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const alphaPixels: { x: number; y: number }[] = [];
  let left = info.width;
  let top = info.height;
  let right = 0;
  let bottom = 0;
  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const alpha = data[(y * info.width + x) * info.channels + 3];
      if (alpha === undefined || alpha === 0) continue;
      alphaPixels.push({ x, y });
      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x + 1);
      bottom = Math.max(bottom, y + 1);
    }
  }
  if (alphaPixels.length === 0) throw new Error(`${file}: alpha is empty`);
  return { bounds: { left, top, right, bottom }, alphaPixels };
}

function displayBounds(
  bounds: AlphaBounds,
  geometry: SourceGeometry,
): AlphaBounds {
  return {
    left: round((bounds.left - geometry.anchor.x) * geometry.displayScale),
    top: round((bounds.top - geometry.anchor.y) * geometry.displayScale),
    right: round((bounds.right - geometry.anchor.x) * geometry.displayScale),
    bottom: round((bounds.bottom - geometry.anchor.y) * geometry.displayScale),
  };
}

function lowerDiamondOverflow(
  alphaPixels: readonly { readonly x: number; readonly y: number }[],
  geometry: SourceGeometry,
): number {
  let maximum = 0;
  for (const pixel of alphaPixels) {
    const x = (pixel.x + 0.5 - geometry.anchor.x) * geometry.displayScale;
    const y = (pixel.y + 0.5 - geometry.anchor.y) * geometry.displayScale;
    if (y <= 0 || Math.abs(x) >= 64) continue;
    const diamondBottom = 37 * (1 - Math.abs(x) / 64);
    maximum = Math.max(maximum, y - diamondBottom);
  }
  return maximum;
}

function assertSameBounds(
  id: string,
  measured: AlphaBounds,
  recorded: AlphaBounds,
): void {
  if (
    measured.left !== recorded.left ||
    measured.top !== recorded.top ||
    measured.right !== recorded.right ||
    measured.bottom !== recorded.bottom
  )
    throw new Error(
      `${id}: measured alpha ${formatBounds(measured)} does not match manifest ${formatBounds(recorded)}`,
    );
}

function formatBounds(bounds: AlphaBounds): string {
  return `[${bounds.left},${bounds.top}..${bounds.right},${bounds.bottom}]`;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
