import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp, { type OverlayOptions } from "sharp";

interface Recipe {
  readonly id: string;
  readonly output: string;
  readonly outputSize: { readonly width: number; readonly height: number };
}

interface RecordEntry {
  readonly status: "CANDIDATE" | "ACCEPTED" | "REJECTED" | "FAILED";
  readonly candidate?: string;
  readonly outputSha256?: string;
  readonly candidateSha256?: string;
  readonly alphaBounds?: {
    readonly left: number;
    readonly top: number;
    readonly right: number;
    readonly bottom: number;
  };
  readonly reviewChecks?: Readonly<Record<string, boolean>>;
}

const root = process.cwd();
const reviewRoot = path.join(root, "art/pixellab/reviews/candy-terrain");
const ids = [
  "terrain-candy-grass-1",
  "terrain-candy-grass-2",
  "terrain-candy-grass-3",
  "terrain-candy-grass-4",
  "terrain-candy-mountain-1",
  "terrain-candy-mountain-2",
  "terrain-candy-mountain-3",
  "terrain-candy-forest-1",
  "terrain-candy-forest-2",
  "terrain-candy-forest-3",
  "terrain-candy-forest-4",
  "terrain-candy-fruit",
  "terrain-candy-animal",
] as const;
const sampleIds = [
  "terrain-candy-grass-1",
  "terrain-candy-mountain-1",
  "terrain-candy-forest-1",
  "terrain-candy-fruit",
] as const;

const manifest = JSON.parse(
  await readFile(path.join(root, "scripts/art/pixellab-manifest.json"), "utf8"),
) as { readonly recipes: readonly Recipe[] };
const generated = JSON.parse(
  await readFile(
    path.join(root, "scripts/art/pixellab-generated.json"),
    "utf8",
  ),
) as { readonly records: Readonly<Record<string, RecordEntry>> };
const recipes = new Map(manifest.recipes.map((recipe) => [recipe.id, recipe]));

await mkdir(reviewRoot, { recursive: true });
await individualSheet(
  sampleIds,
  "sample-gate-source-native-enlarged-minimum.png",
);
await individualSheet(ids, "all-assets-source-native-enlarged-minimum.png");
await contactSheet();
await adjacencySheet();
await repetitionSheet();
await mixedMapSheet();
await dprSheet();
await evidence();

async function sourceFor(id: string): Promise<string | null> {
  const recipe = recipes.get(id);
  const record = generated.records[id];
  if (recipe === undefined || record === undefined) return null;
  if (record.status === "ACCEPTED") return path.join(root, recipe.output);
  if (record.candidate !== undefined) return path.join(root, record.candidate);
  return null;
}

async function individualSheet(
  requested: readonly string[],
  filename: string,
): Promise<void> {
  const available: string[] = [];
  for (const id of requested)
    if ((await sourceFor(id)) !== null) available.push(id);
  if (available.length === 0) return;
  const cellWidth = 360;
  const cellHeight = 570;
  const columns = Math.min(4, available.length);
  const rows = Math.ceil(available.length / columns);
  const overlays: OverlayOptions[] = [];
  for (const [index, id] of available.entries()) {
    const source = await sourceFor(id);
    if (source === null) continue;
    const recipe = recipes.get(id);
    if (recipe === undefined) continue;
    const left = (index % columns) * cellWidth;
    const top = Math.floor(index / columns) * cellHeight;
    const isGround = recipe.outputSize.height === 148;
    const sourcePreview = await sharp(source)
      .resize({ width: 256, height: 296, fit: "contain" })
      .png()
      .toBuffer();
    const enlarged = await sharp(source)
      .trim({ background: "#00000000" })
      .resize({
        width: 248,
        height: 184,
        fit: "contain",
        kernel: sharp.kernel.nearest,
      })
      .png()
      .toBuffer();
    const native = await sharp(source)
      .resize({ width: 128, height: isGround ? 74 : 148, fit: "fill" })
      .png()
      .toBuffer();
    const minimum = await sharp(source)
      .resize({ width: 80, height: isGround ? 46 : 93, fit: "fill" })
      .png()
      .toBuffer();
    overlays.push({
      input: label(id, generated.records[id]?.status ?? "MISSING", cellWidth),
      left,
      top: top + 8,
    });
    overlays.push({ input: sourcePreview, left: left + 52, top: top + 54 });
    overlays.push({ input: enlarged, left: left + 56, top: top + 356 });
    overlays.push({ input: native, left: left + 16, top: top + 404 });
    overlays.push({ input: minimum, left: left + 264, top: top + 445 });
    overlays.push({ input: captions(cellWidth), left, top: top + 330 });
  }
  await sharp({
    create: {
      width: columns * cellWidth,
      height: rows * cellHeight,
      channels: 4,
      background: "#263b3a",
    },
  })
    .composite(overlays)
    .png()
    .toFile(path.join(reviewRoot, filename));
}

async function contactSheet(): Promise<void> {
  const available: string[] = [];
  for (const id of ids) if ((await sourceFor(id)) !== null) available.push(id);
  if (available.length === 0) return;
  const columns = 4;
  const cellWidth = 300;
  const cellHeight = 320;
  const overlays: OverlayOptions[] = [];
  for (const [index, id] of available.entries()) {
    const source = await sourceFor(id);
    if (source === null) continue;
    overlays.push({
      input: await sharp(source)
        .resize({ width: 250, height: 250, fit: "contain" })
        .png()
        .toBuffer(),
      left: (index % columns) * cellWidth + 25,
      top: Math.floor(index / columns) * cellHeight + 46,
    });
    overlays.push({
      input: label(id, generated.records[id]?.status ?? "MISSING", cellWidth),
      left: (index % columns) * cellWidth,
      top: Math.floor(index / columns) * cellHeight,
    });
  }
  await sharp({
    create: {
      width: columns * cellWidth,
      height: Math.ceil(available.length / columns) * cellHeight,
      channels: 4,
      background: "#263b3a",
    },
  })
    .composite(overlays)
    .png()
    .toFile(path.join(reviewRoot, "contact-sheet.png"));
}

async function adjacencySheet(): Promise<void> {
  const grass = await Promise.all(
    [1, 2, 3, 4].map((variant) =>
      display(`terrain-candy-grass-${variant}`, 128, 74),
    ),
  );
  if (grass.some((entry) => entry === null)) return;
  const overlays: OverlayOptions[] = [];
  const cellWidth = 280;
  const cellHeight = 190;
  for (let first = 0; first < 4; first += 1) {
    for (let second = 0; second < 4; second += 1) {
      const left = second * cellWidth;
      const top = first * cellHeight + 54;
      const firstImage = grass[first];
      const secondImage = grass[second];
      if (firstImage === null || secondImage === null) continue;
      overlays.push({ input: firstImage, left: left + 4, top: top + 24 });
      overlays.push({ input: secondImage, left: left + 68, top: top + 61 });
      overlays.push({ input: firstImage, left: left + 148, top: top + 24 });
      overlays.push({ input: secondImage, left: left + 84, top: top + 61 });
      overlays.push({
        input: Buffer.from(
          `<svg width="${cellWidth}" height="28" xmlns="http://www.w3.org/2000/svg"><text x="${cellWidth / 2}" y="19" text-anchor="middle" font-family="sans-serif" font-size="14" fill="#d5e2dc">${first + 1} → ${second + 1} · both grid axes</text></svg>`,
        ),
        left,
        top: top - 4,
      });
    }
  }
  await sharp({
    create: { width: 1120, height: 814, channels: 4, background: "#263b3a" },
  })
    .composite([
      {
        input: title(
          "Candy Grass · all 16 ordered variant pairs on both diamond axes",
          1120,
        ),
        left: 0,
        top: 8,
      },
      ...overlays,
    ])
    .png()
    .toFile(path.join(reviewRoot, "grass-adjacency-all-edges.png"));
}

async function repetitionSheet(): Promise<void> {
  const grass = await Promise.all(
    [1, 2, 3, 4].map((variant) =>
      display(`terrain-candy-grass-${variant}`, 80, 46),
    ),
  );
  if (grass.some((entry) => entry === null)) return;
  const objects = [
    "terrain-candy-mountain-1",
    "terrain-candy-mountain-2",
    "terrain-candy-mountain-3",
    "terrain-candy-forest-1",
    "terrain-candy-forest-2",
    "terrain-candy-forest-3",
    "terrain-candy-forest-4",
    "terrain-candy-fruit",
    "terrain-candy-animal",
  ];
  const objectImages = new Map<string, Buffer>();
  for (const id of objects) {
    const image = await display(id, 80, 93);
    if (image !== null) objectImages.set(id, image);
  }
  if (objectImages.size !== objects.length) return;
  const grounds: OverlayOptions[] = [];
  const fronts: Array<{ depth: number; overlay: OverlayOptions }> = [];
  const origin = { x: 576, y: 104 };
  for (let y = 0; y < 8; y += 1) {
    for (let x = 0; x < 8; x += 1) {
      const center = mapCenter(origin, x, y, 0.625);
      const ground = grass[(x * 3 + y) % 4];
      if (ground !== null && ground !== undefined)
        grounds.push({
          input: ground,
          left: center.x - 40,
          top: center.y - 23,
        });
      if ((x + y * 2) % 3 !== 0) continue;
      const id = objects[(x * 5 + y * 7) % objects.length];
      if (id === undefined) continue;
      const input = objectImages.get(id);
      if (input !== undefined)
        fronts.push({
          depth: x + y,
          overlay: { input, left: center.x - 40, top: center.y - 79 },
        });
    }
  }
  fronts.sort((a, b) => a.depth - b.depth);
  await sharp({
    create: { width: 1152, height: 700, channels: 4, background: "#263b3a" },
  })
    .composite([
      {
        input: title(
          "Candy terrain · 8×8 repetition and map-fit minimum zoom 0.625×",
          1152,
        ),
        left: 0,
        top: 8,
      },
      ...grounds,
      ...fronts.map(({ overlay }) => overlay),
    ])
    .png()
    .toFile(path.join(reviewRoot, "repetition-8x8.png"));
}

async function mixedMapSheet(): Promise<void> {
  const rendered = await renderMixedMap(1);
  if (rendered === null) return;
  await sharp(rendered)
    .png()
    .toFile(path.join(reviewRoot, "mixed-normal-candy-map.png"));
}

async function renderMixedMap(scale: number): Promise<Buffer | null> {
  const candyGrass = await Promise.all(
    [1, 2, 3, 4].map((variant) =>
      display(`terrain-candy-grass-${variant}`, 128 * scale, 74 * scale),
    ),
  );
  const normalGrass = await Promise.all(
    [1, 2, 3, 4].map((variant) =>
      display(`terrain-grass-${variant}`, 128 * scale, 74 * scale),
    ),
  );
  if ([...candyGrass, ...normalGrass].some((entry) => entry === null))
    return null;
  const placements = [
    [1, 1, "terrain-candy-mountain-1"],
    [3, 1, "terrain-mountain-2"],
    [5, 1, "terrain-candy-forest-1"],
    [6, 2, "terrain-forest-2"],
    [2, 3, "terrain-candy-fruit"],
    [4, 3, "terrain-fruit"],
    [1, 5, "terrain-candy-animal"],
    [3, 5, "terrain-animal"],
    [5, 5, "unit-candy-warrior"],
    [6, 5, "unit-warrior"],
  ] as const;
  const grounds: OverlayOptions[] = [];
  const fronts: Array<{ depth: number; overlay: OverlayOptions }> = [];
  const origin = { x: 576 * scale, y: 96 * scale };
  for (let y = 0; y < 8; y += 1)
    for (let x = 0; x < 8; x += 1) {
      const center = mapCenter(origin, x, y, scale);
      const family = x < 4 ? candyGrass : normalGrass;
      const ground = family[(x + y * 3) % 4];
      if (ground !== null)
        grounds.push({
          input: ground,
          left: center.x - 64 * scale,
          top: center.y - 37 * scale,
        });
    }
  for (const [x, y, id] of placements) {
    const center = mapCenter(origin, x, y, scale);
    const isUnit = id.startsWith("unit-");
    const image = await display(
      id,
      (isUnit ? 90 : 128) * scale,
      (isUnit ? 104 : 148) * scale,
    );
    if (image !== null)
      fronts.push({
        depth: x + y,
        overlay: {
          input: image,
          left: center.x - (isUnit ? 45 : 64) * scale,
          top: center.y - (isUnit ? 94 : 125) * scale,
        },
      });
  }
  fronts.sort((a, b) => a.depth - b.depth);
  return sharp({
    create: {
      width: 1152 * scale,
      height: 700 * scale,
      channels: 4,
      background: "#263b3a",
    },
  })
    .composite([
      {
        input: title(
          "Mixed normal / Candy territory · unit and resource overlap",
          1152 * scale,
        ),
        left: 0,
        top: 8 * scale,
      },
      ...grounds,
      ...fronts.map(({ overlay }) => overlay),
    ])
    .png()
    .toBuffer();
}

async function dprSheet(): Promise<void> {
  const dpr1 = await renderMixedMap(1);
  const dpr2 = await renderMixedMap(2);
  if (dpr1 === null || dpr2 === null) return;
  const width = 560;
  const height = 340;
  const left = await sharp(dpr1)
    .resize({ width, height, fit: "fill" })
    .png()
    .toBuffer();
  const right = await sharp(dpr2)
    .resize({ width, height, fit: "fill" })
    .png()
    .toBuffer();
  await sharp({
    create: {
      width: width * 2,
      height: height + 58,
      channels: 4,
      background: "#263b3a",
    },
  })
    .composite([
      { input: left, left: 0, top: 58 },
      { input: right, left: width, top: 58 },
      {
        input: Buffer.from(
          `<svg width="${width * 2}" height="54" xmlns="http://www.w3.org/2000/svg"><text x="${width / 2}" y="32" text-anchor="middle" font-family="sans-serif" font-size="20" font-weight="700" fill="#f5efe2">DPR 1 · CSS-scale raster</text><text x="${width + width / 2}" y="32" text-anchor="middle" font-family="sans-serif" font-size="20" font-weight="700" fill="#f5efe2">DPR 2 · source-resolution raster</text></svg>`,
        ),
        left: 0,
        top: 0,
      },
    ])
    .png()
    .toFile(path.join(reviewRoot, "dpr1-dpr2-map-fit.png"));
}

async function display(
  id: string,
  width: number,
  height: number,
): Promise<Buffer | null> {
  const source = await sourceFor(id);
  if (source === null) {
    const recipe = recipes.get(id);
    if (recipe === undefined || generated.records[id]?.status !== "ACCEPTED")
      return null;
    return sharp(path.join(root, recipe.output))
      .resize({ width, height, fit: "fill" })
      .png()
      .toBuffer();
  }
  return sharp(source).resize({ width, height, fit: "fill" }).png().toBuffer();
}

async function evidence(): Promise<void> {
  const files = [
    "README.md",
    "sample-gate-source-native-enlarged-minimum.png",
    "all-assets-source-native-enlarged-minimum.png",
    "contact-sheet.png",
    "grass-adjacency-all-edges.png",
    "repetition-8x8.png",
    "mixed-normal-candy-map.png",
    "dpr1-dpr2-map-fit.png",
  ];
  const artifacts = [];
  for (const file of files) {
    try {
      const data = await readFile(path.join(reviewRoot, file));
      artifacts.push({
        path: `art/pixellab/reviews/candy-terrain/${file}`,
        sha256: sha256(data),
        bytes: data.byteLength,
      });
    } catch {
      // Partial sample review intentionally omits full-batch evidence.
    }
  }
  const records = Object.fromEntries(
    ids.map((id) => [id, generated.records[id] ?? null]),
  );
  await writeFile(
    path.join(reviewRoot, "review-evidence.json"),
    `${JSON.stringify(
      {
        schemaVersion: 1,
        purpose: "Candy terrain sample gate and complete class review",
        displayContracts: {
          sourceScale: 2,
          nativeZoom: 1,
          minimumZoom: 0.625,
          dprReviewed: [1, 2],
        },
        checks: [
          "source/native/enlarged/minimum silhouettes",
          "all four grass diamond edges and 8x8 repetition",
          "mixed normal/Candy map readability",
          "unit and resource overlap",
          "transparent edges, anchors, bounds, palette and detail budget",
        ],
        records,
        artifacts,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
}

function mapCenter(
  origin: { readonly x: number; readonly y: number },
  x: number,
  y: number,
  scale = 1,
): { readonly x: number; readonly y: number } {
  return {
    x: Math.round(origin.x + (x - y) * 64 * scale),
    y: Math.round(origin.y + (x + y) * 37 * scale),
  };
}

function title(text: string, width: number): Buffer {
  return Buffer.from(
    `<svg width="${width}" height="48" xmlns="http://www.w3.org/2000/svg"><text x="${width / 2}" y="30" text-anchor="middle" font-family="sans-serif" font-size="22" font-weight="700" fill="#f5efe2">${escapeXml(text)}</text></svg>`,
  );
}

function label(id: string, status: string, width: number): Buffer {
  return Buffer.from(
    `<svg width="${width}" height="44" xmlns="http://www.w3.org/2000/svg"><text x="${width / 2}" y="18" text-anchor="middle" font-family="sans-serif" font-size="16" font-weight="700" fill="#f5efe2">${escapeXml(id)}</text><text x="${width / 2}" y="38" text-anchor="middle" font-family="sans-serif" font-size="13" fill="#8ee8cb">${escapeXml(status)}</text></svg>`,
  );
}

function captions(width: number): Buffer {
  return Buffer.from(
    `<svg width="${width}" height="220" xmlns="http://www.w3.org/2000/svg"><text x="180" y="16" text-anchor="middle" font-family="sans-serif" font-size="13" fill="#d5e2dc">source canvas</text><text x="180" y="208" text-anchor="middle" font-family="sans-serif" font-size="13" fill="#d5e2dc">enlarged alpha · native 1× · minimum 0.625×</text></svg>`,
  );
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function sha256(data: Buffer): string {
  return createHash("sha256").update(data).digest("hex");
}
