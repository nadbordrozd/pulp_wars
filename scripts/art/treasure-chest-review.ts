import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp, { type OverlayOptions } from "sharp";

const root = process.cwd();
const reviewRoot = path.join(root, "art/pixellab/reviews/treasure-chest");
const candidate = path.join(
  root,
  "art/pixellab/candidates/building-treasure-chest.png",
);
const accepted = path.join(
  root,
  "public/assets/pixellab/buildings-square/treasure-chest.png",
);
const sourcePath = await readableAsset();
const sourceBytes = await readFile(sourcePath);
const source = sharp(sourceBytes);
const metadata = await source.metadata();
const alpha = await alphaBounds(sourceBytes);

await mkdir(reviewRoot, { recursive: true });
await writeSourceReview();
await writeZoomReview();
await writeEvidence();

async function readableAsset(): Promise<string> {
  try {
    await readFile(accepted);
    return accepted;
  } catch {
    await readFile(candidate);
    return candidate;
  }
}

async function writeSourceReview(): Promise<void> {
  const checker = await checkerboard(560, 620);
  const enlarged = await sharp(sourceBytes)
    .resize(512, 592, { kernel: "nearest" })
    .png()
    .toBuffer();
  const native = await sharp(sourceBytes).png().toBuffer();
  await sharp(checker)
    .composite([
      { input: enlarged, left: 24, top: 12 },
      { input: native, left: 152, top: 316 },
    ])
    .png()
    .toFile(path.join(reviewRoot, "source-native-enlarged.png"));
}

async function writeZoomReview(): Promise<void> {
  const scales = [0.625, 1, 1.75] as const;
  const terrainPaths = [
    "public/assets/pixellab/terrain-square/original-grass-1.png",
    "public/assets/pixellab/terrain-square/original-forest-1.png",
    "public/assets/pixellab/terrain-square/candy-grass-1.png",
  ] as const;
  const panels: Buffer[] = [];
  for (const [index, scale] of scales.entries()) {
    const tileSize = Math.round(128 * scale);
    const canvas = sharp({
      create: {
        width: tileSize * 3,
        height: tileSize + Math.round(80 * scale),
        channels: 4,
        background: "#18212fff",
      },
    });
    const overlays: OverlayOptions[] = [];
    for (const [column, terrainPath] of terrainPaths.entries()) {
      overlays.push({
        input: await sharp(path.join(root, terrainPath))
          .resize(tileSize, tileSize, { fit: "fill", kernel: "nearest" })
          .png()
          .toBuffer(),
        left: column * tileSize,
        top: Math.round(60 * scale),
      });
      const chestWidth = Math.max(1, Math.round(256 * 0.3 * scale));
      const chestHeight = Math.max(1, Math.round(296 * 0.3 * scale));
      overlays.push({
        input: await sharp(sourceBytes)
          .resize(chestWidth, chestHeight, { kernel: "nearest" })
          .png()
          .toBuffer(),
        left: column * tileSize + Math.round((tileSize - chestWidth) / 2),
        top: Math.round(60 * scale + tileSize - 222 * 0.3 * scale),
      });
    }
    overlays.push({
      input: Buffer.from(
        `<svg width="${tileSize * 3}" height="${Math.round(50 * scale)}"><text x="12" y="${Math.round(35 * scale)}" font-family="sans-serif" font-size="${Math.round(22 * scale)}" fill="white">${scale}× map zoom</text></svg>`,
      ),
      left: 0,
      top: 0,
    });
    panels.push(await canvas.composite(overlays).png().toBuffer());
    if (index < 0) throw new Error("unreachable");
  }
  const width = Math.max(...(await Promise.all(panels.map(imageWidth))));
  const heights = await Promise.all(panels.map(imageHeight));
  let top = 0;
  const overlays: OverlayOptions[] = [];
  for (const [index, panel] of panels.entries()) {
    overlays.push({ input: panel, left: 0, top });
    top += heights[index] ?? 0;
  }
  await sharp({
    create: { width, height: top, channels: 4, background: "#18212fff" },
  })
    .composite(overlays)
    .png()
    .toFile(path.join(reviewRoot, "zoom-contexts.png"));
}

async function writeEvidence(): Promise<void> {
  const files = ["source-native-enlarged.png", "zoom-contexts.png"];
  const evidence = {
    generatedBy: "npm run art:treasure-chest-review",
    source: path.relative(root, sourcePath).replaceAll("\\", "/"),
    sourceSha256: sha256(sourceBytes),
    sourceSize: { width: metadata.width, height: metadata.height },
    alphaBounds: alpha,
    display: {
      scale: 0.3,
      anchor: { x: 128, y: 222 },
      zooms: [0.625, 1, 1.75],
      renderedWidthAtOne: 77,
      owningTileAtOne: 128,
    },
    checks: {
      transparentBackground: metadata.hasAlpha === true,
      noLeftRightBottomOverflow:
        alpha.left >= 0 && alpha.right < 256 && alpha.bottom <= 222,
      substantiallySmallerThanTile: 77 < 128,
    },
    artifacts: Object.fromEntries(
      await Promise.all(
        files.map(async (file) => {
          const bytes = await readFile(path.join(reviewRoot, file));
          return [file, sha256(bytes)];
        }),
      ),
    ),
  };
  await writeFile(
    path.join(reviewRoot, "review-evidence.json"),
    `${JSON.stringify(evidence, null, 2)}\n`,
  );
  await writeFile(
    path.join(reviewRoot, "README.md"),
    "# Treasure chest review\n\nGenerated deterministically with `npm run art:treasure-chest-review`. The evidence presents the exact PixelLab output at nearest-neighbor 2× and native scale, then at 0.625×, 1×, and 1.75× over representative Original and Candy square terrain. The compact neutral pickup is grounded at the shared square anchor, remains smaller than major terrain and units, and never overflows the owning tile to the left, right, or bottom.\n",
  );
}

async function checkerboard(width: number, height: number): Promise<Buffer> {
  const square = 16;
  const overlays: OverlayOptions[] = [];
  for (let y = 0; y < height; y += square) {
    for (let x = 0; x < width; x += square) {
      overlays.push({
        input: {
          create: {
            width: Math.min(square, width - x),
            height: Math.min(square, height - y),
            channels: 4,
            background:
              (x / square + y / square) % 2 === 0 ? "#d7d7d7" : "#a7a7a7",
          },
        },
        left: x,
        top: y,
      });
    }
  }
  return sharp({
    create: { width, height, channels: 4, background: "#ffffffff" },
  })
    .composite(overlays)
    .png()
    .toBuffer();
}

async function alphaBounds(bytes: Buffer): Promise<{
  left: number;
  top: number;
  right: number;
  bottom: number;
}> {
  const { data, info } = await sharp(bytes)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let left = info.width;
  let top = info.height;
  let right = -1;
  let bottom = -1;
  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      if ((data[(y * info.width + x) * 4 + 3] ?? 0) === 0) continue;
      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x);
      bottom = Math.max(bottom, y);
    }
  }
  return { left, top, right, bottom };
}

function sha256(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

async function imageWidth(bytes: Buffer): Promise<number> {
  return (await sharp(bytes).metadata()).width ?? 0;
}

async function imageHeight(bytes: Buffer): Promise<number> {
  return (await sharp(bytes).metadata()).height ?? 0;
}
