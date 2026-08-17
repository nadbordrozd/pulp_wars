import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp, { type OverlayOptions } from "sharp";

interface Recipe {
  readonly id: string;
  readonly output: string;
  readonly anchor?: { readonly x: number; readonly y: number };
}

interface RecordEntry {
  readonly status: "CANDIDATE" | "ACCEPTED" | "REJECTED" | "FAILED";
  readonly candidate?: string;
  readonly outputSha256?: string;
  readonly alphaBounds?: {
    readonly left: number;
    readonly top: number;
    readonly right: number;
    readonly bottom: number;
  };
  readonly reviewChecks?: Readonly<Record<string, boolean>>;
}

const root = process.cwd();
const reviewRoot = path.join(root, "art/pixellab/reviews/candy-cities");
const candyIds = [
  "building-candy-city-1",
  "building-candy-city-2",
  "building-candy-city-3",
] as const;
const normalIds = [
  "building-city-1",
  "building-city-2",
  "building-city-3",
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
await individualGate();
await progressionSheet();
await zoomAndDprSheet();
await mixedMap("desktop-mixed-map.png", 1200, 760, 1);
await mixedMap("mobile-mixed-map-dpr2.png", 780, 1688, 2);
await evidence();

async function sourceFor(id: string): Promise<string | null> {
  const recipe = recipes.get(id);
  const record = generated.records[id];
  if (recipe === undefined || record === undefined) return null;
  if (record.status === "ACCEPTED") return path.join(root, recipe.output);
  if (record.candidate !== undefined) return path.join(root, record.candidate);
  return null;
}

async function individualGate(): Promise<void> {
  const available = await availableCandyIds();
  if (available.length === 0) return;
  const width = 420 * available.length;
  const overlays: OverlayOptions[] = [];
  for (const [index, id] of available.entries()) {
    const source = await sourceFor(id);
    if (source === null) continue;
    const left = index * 420;
    overlays.push({ input: label(id, statusFor(id), 420), left, top: 8 });
    overlays.push({
      input: await checkerPreview(source, 384, 384),
      left: left + 18,
      top: 62,
    });
    overlays.push({
      input: await sharp(source)
        .trim({ background: "#00000000" })
        .resize({
          width: 300,
          height: 226,
          fit: "contain",
          kernel: sharp.kernel.nearest,
        })
        .png()
        .toBuffer(),
      left: left + 60,
      top: 470,
    });
    overlays.push({
      input: await sharp(source)
        .resize({ width: 115, height: 115, fit: "fill" })
        .png()
        .toBuffer(),
      left: left + 24,
      top: 735,
    });
    overlays.push({
      input: await sharp(source)
        .resize({ width: 72, height: 72, fit: "fill" })
        .png()
        .toBuffer(),
      left: left + 319,
      top: 756,
    });
    overlays.push({ input: captions(420), left, top: 442 });
  }
  await sharp({
    create: {
      width,
      height: 860,
      channels: 4,
      background: "#263b3a",
    },
  })
    .composite(overlays)
    .png()
    .toFile(
      path.join(reviewRoot, "individual-source-native-enlarged-minimum.png"),
    );
}

async function progressionSheet(): Promise<void> {
  const available = await availableCandyIds();
  if (available.length === 0) return;
  const overlays: OverlayOptions[] = [
    {
      input: title("Normal / Candy settlement progression", 1200),
      left: 0,
      top: 8,
    },
  ];
  for (let level = 1; level <= available.length; level += 1) {
    const normal = normalIds[level - 1];
    const candy = candyIds[level - 1];
    if (normal === undefined || candy === undefined) continue;
    const candySource = await sourceFor(candy);
    const normalSource = await sourceFor(normal);
    if (candySource === null || normalSource === null) continue;
    const left = (level - 1) * 400;
    overlays.push({
      input: label(`level ${level} · normal`, "REFERENCE", 400),
      left,
      top: 62,
    });
    overlays.push({
      input: await display(normalSource, 270, 270),
      left: left + 65,
      top: 112,
    });
    overlays.push({
      input: label(`level ${level} · Candy`, statusFor(candy), 400),
      left,
      top: 388,
    });
    overlays.push({
      input: await display(candySource, 270, 270),
      left: left + 65,
      top: 438,
    });
  }
  await sharp({
    create: { width: 1200, height: 730, channels: 4, background: "#263b3a" },
  })
    .composite(overlays)
    .png()
    .toFile(path.join(reviewRoot, "progression-contact-sheet.png"));
}

async function zoomAndDprSheet(): Promise<void> {
  const available = await availableCandyIds();
  if (available.length === 0) return;
  const zooms = [0.625, 1, 1.75] as const;
  const canvasWidth = 2290;
  const canvasHeight = 1584;
  const rowHeight = 500;
  const groupWidth = 700;
  const groupStart = 180;
  const panelTopOffset = 42;
  const panelHeight = 410;
  const dpr1PanelWidth = 240;
  const dpr2PanelWidth = 420;
  const overlays: OverlayOptions[] = [
    {
      input: title(
        "Settlement display scale · complete DPR1 / DPR2 backing rasters at 0.625x to 1.75x",
        canvasWidth,
      ),
      left: 0,
      top: 8,
    },
  ];
  for (const [row, zoom] of zooms.entries()) {
    const rowTop = 64 + row * rowHeight;
    overlays.push({
      input: rowLabel(`${zoom}x map zoom`, 164),
      left: 8,
      top: rowTop + 206,
    });
    for (const [index, id] of available.entries()) {
      const source = await sourceFor(id);
      if (source === null) continue;
      const displaySize = Math.round(384 * 0.3 * zoom);
      const dpr2Size = displaySize * 2;
      const groupLeft = groupStart + index * groupWidth;
      const panelTop = rowTop + panelTopOffset;
      const dpr1PanelLeft = groupLeft + 10;
      const dpr2PanelLeft = groupLeft + 265;
      overlays.push({
        input: groupLabel(id, groupWidth - 20),
        left: groupLeft + 10,
        top: rowTop,
      });
      overlays.push({
        input: previewPanel(dpr1PanelWidth, panelHeight),
        left: dpr1PanelLeft,
        top: panelTop,
      });
      overlays.push({
        input: previewPanel(dpr2PanelWidth, panelHeight),
        left: dpr2PanelLeft,
        top: panelTop,
      });
      overlays.push({
        input: await display(source, displaySize, displaySize),
        left: dpr1PanelLeft + Math.round((dpr1PanelWidth - displaySize) / 2),
        top: panelTop + Math.round((panelHeight - displaySize) / 2),
      });
      overlays.push({
        input: await display(source, dpr2Size, dpr2Size),
        left: dpr2PanelLeft + Math.round((dpr2PanelWidth - dpr2Size) / 2),
        top: panelTop + Math.round((panelHeight - dpr2Size) / 2),
      });
      overlays.push({
        input: dprLabel("DPR1", displaySize, dpr1PanelWidth),
        left: dpr1PanelLeft,
        top: rowTop + 455,
      });
      overlays.push({
        input: dprLabel("DPR2", dpr2Size, dpr2PanelWidth),
        left: dpr2PanelLeft,
        top: rowTop + 455,
      });
    }
  }
  await sharp({
    create: {
      width: canvasWidth,
      height: canvasHeight,
      channels: 4,
      background: "#263b3a",
    },
  })
    .composite(overlays)
    .png()
    .toFile(path.join(reviewRoot, "zoom-dpr-review.png"));
}

async function mixedMap(
  filename: string,
  width: number,
  height: number,
  dpr: number,
): Promise<void> {
  if ((await availableCandyIds()).length !== candyIds.length) return;
  const cssWidth = width / dpr;
  const cssHeight = height / dpr;
  const mapZoom = cssWidth < 500 ? 0.78 : 1;
  const origin = {
    x: Math.round(cssWidth * 0.5),
    y: Math.round(cssHeight * (cssWidth < 500 ? 0.14 : 0.16)),
  };
  const overlays: OverlayOptions[] = [];
  const grassIds = [
    "terrain-grass-1",
    "terrain-candy-grass-1",
    "terrain-grass-2",
    "terrain-candy-grass-2",
  ] as const;
  const centers = new Map<string, { x: number; y: number }>();
  for (let y = 0; y < 7; y += 1) {
    for (let x = 0; x < 7; x += 1) {
      const center = mapCenter(origin, x, y, mapZoom);
      centers.set(`${x},${y}`, center);
      const groundId = grassIds[(x + y * 3) % grassIds.length];
      if (groundId === undefined) continue;
      const ground = await acceptedSource(groundId);
      overlays.push({
        input: await display(ground, 128 * mapZoom * dpr, 74 * mapZoom * dpr),
        left: Math.round((center.x - 64 * mapZoom) * dpr),
        top: Math.round((center.y - 37 * mapZoom) * dpr),
      });
    }
  }

  const objects: Array<{
    readonly id: string;
    readonly tile: readonly [number, number];
    readonly level: 1 | 2 | 3;
    readonly unit?: string;
    readonly capital?: boolean;
    readonly reward?: boolean;
  }> = [
    { id: "building-city-1", tile: [0, 2], level: 1 },
    {
      id: "building-candy-city-1",
      tile: [2, 0],
      level: 1,
      unit: "unit-candy-warrior",
    },
    { id: "building-city-2", tile: [1, 4], level: 2, unit: "unit-warrior" },
    {
      id: "building-candy-city-2",
      tile: [4, 1],
      level: 2,
      unit: "unit-candy-gumball-guard",
      reward: true,
    },
    { id: "building-city-3", tile: [3, 6], level: 3, capital: true },
    {
      id: "building-candy-city-3",
      tile: [6, 3],
      level: 3,
      unit: "unit-candy-donut",
      capital: true,
      reward: true,
    },
  ];
  for (const object of objects.sort((first, second) => {
    const a = first.tile[0] + first.tile[1];
    const b = second.tile[0] + second.tile[1];
    return a - b;
  })) {
    const center = centers.get(`${object.tile[0]},${object.tile[1]}`);
    if (center === undefined) continue;
    overlays.push(
      await anchoredOverlay(object.id, center, object.level, mapZoom, dpr),
    );
    if (object.unit !== undefined)
      overlays.push(await unitOverlay(object.unit, center, mapZoom, dpr));
    if (object.capital)
      overlays.push({
        input: crown(26 * dpr),
        left: Math.round((center.x - 13 * mapZoom) * dpr),
        top: Math.round((center.y - 104 * mapZoom) * dpr),
      });
    if (object.reward) {
      const reward = await acceptedSource("ui-reward-workshop");
      overlays.push({
        input: await display(reward, 24 * dpr, 24 * dpr),
        left: Math.round((center.x + 28 * mapZoom) * dpr),
        top: Math.round((center.y - 70 * mapZoom) * dpr),
      });
    }
    overlays.push({
      input: cityLabel(
        `${object.id.includes("candy") ? "Candy" : "Normal"} L${object.level}`,
        100 * dpr,
        24 * dpr,
      ),
      left: Math.round((center.x - 50) * dpr),
      top: Math.round((center.y + 34 * mapZoom) * dpr),
    });
  }

  overlays.push({
    input: title(
      "Mixed map · both grid axes · unit / crown / reward / label space",
      width,
    ),
    left: 0,
    top: 8 * dpr,
  });
  await sharp({
    create: { width, height, channels: 4, background: "#203634" },
  })
    .composite(overlays)
    .png()
    .toFile(path.join(reviewRoot, filename));
}

async function anchoredOverlay(
  id: string,
  center: { readonly x: number; readonly y: number },
  level: 1 | 2 | 3,
  zoom: number,
  dpr: number,
): Promise<OverlayOptions> {
  const source = id.includes("candy")
    ? await sourceFor(id)
    : await acceptedSource(id);
  if (source === null) throw new Error(`Missing ${id}`);
  const anchorY = level === 1 ? 236 : 243;
  const scale = 0.3 * zoom;
  return {
    input: await display(source, 384 * scale * dpr, 384 * scale * dpr),
    left: Math.round((center.x - 192 * scale) * dpr),
    top: Math.round((center.y - anchorY * scale) * dpr),
  };
}

async function unitOverlay(
  id: string,
  center: { readonly x: number; readonly y: number },
  zoom: number,
  dpr: number,
): Promise<OverlayOptions> {
  const source = await acceptedSource(id);
  const scale = 0.35 * zoom;
  const candyOffset = id === "unit-candy-warrior" ? 10.5 * zoom : 0;
  return {
    input: await display(source, 256 * scale * dpr, 296 * scale * dpr),
    left: Math.round((center.x - 128 * scale) * dpr),
    top: Math.round((center.y - 222 * scale + candyOffset) * dpr),
  };
}

async function checkerPreview(
  source: string,
  width: number,
  height: number,
): Promise<Buffer> {
  const square = 24;
  const cells = [];
  for (let y = 0; y < height; y += square) {
    for (let x = 0; x < width; x += square) {
      cells.push(
        `<rect x="${x}" y="${y}" width="${square}" height="${square}" fill="${(x / square + y / square) % 2 === 0 ? "#edf0e8" : "#adb8b2"}"/>`,
      );
    }
  }
  return sharp(
    Buffer.from(
      `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">${cells.join("")}</svg>`,
    ),
  )
    .composite([{ input: await readFile(source), blend: "over" }])
    .png()
    .toBuffer();
}

async function acceptedSource(id: string): Promise<string> {
  const recipe = recipes.get(id);
  if (recipe === undefined || generated.records[id]?.status !== "ACCEPTED")
    throw new Error(`Missing accepted reference ${id}`);
  return path.join(root, recipe.output);
}

async function availableCandyIds(): Promise<string[]> {
  const ids: string[] = [];
  for (const id of candyIds) if ((await sourceFor(id)) !== null) ids.push(id);
  return ids;
}

async function display(
  source: string,
  width: number,
  height: number,
): Promise<Buffer> {
  return sharp(source)
    .resize({
      width: Math.round(width),
      height: Math.round(height),
      fit: "fill",
    })
    .png()
    .toBuffer();
}

async function evidence(): Promise<void> {
  const files = [
    "README.md",
    "individual-source-native-enlarged-minimum.png",
    "progression-contact-sheet.png",
    "zoom-dpr-review.png",
    "desktop-mixed-map.png",
    "mobile-mixed-map-dpr2.png",
  ];
  const artifacts = [];
  for (const file of files) {
    try {
      const data = await readFile(path.join(reviewRoot, file));
      artifacts.push({
        path: `art/pixellab/reviews/candy-cities/${file}`,
        sha256: sha256(data),
        bytes: data.byteLength,
      });
    } catch {
      // Partial sample review intentionally omits trio-only artifacts.
    }
  }
  await writeFile(
    path.join(reviewRoot, "review-evidence.json"),
    `${JSON.stringify(
      {
        schemaVersion: 1,
        purpose:
          "Candy city three-level individual sample gate and mixed-map review",
        displayContracts: {
          sourceCanvas: { width: 384, height: 384 },
          runtimeScale: 0.3,
          anchors: { level1: [192, 236], levels2And3: [192, 243] },
          zoomRange: [0.625, 1.75],
          dprReviewed: [1, 2],
        },
        checks: [
          "source/native/enlarged/minimum silhouettes and transparency",
          "same-settlement progression and normal/Candy mixed-map recognition",
          "unit overlap, label, capital, reward and status attachment space",
          "both grid axes plus desktop/mobile and DPR1/DPR2 presentation",
          "camera, grounding, bounds, palette, outline and detail budget",
        ],
        records: Object.fromEntries(
          candyIds.map((id) => [id, generated.records[id] ?? null]),
        ),
        artifacts,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
}

function statusFor(id: string): string {
  return generated.records[id]?.status ?? "MISSING";
}

function mapCenter(
  origin: { readonly x: number; readonly y: number },
  x: number,
  y: number,
  zoom: number,
): { readonly x: number; readonly y: number } {
  return {
    x: Math.round(origin.x + (x - y) * 64 * zoom),
    y: Math.round(origin.y + (x + y) * 37 * zoom),
  };
}

function title(text: string, width: number): Buffer {
  return Buffer.from(
    `<svg width="${width}" height="48" xmlns="http://www.w3.org/2000/svg"><text x="${width / 2}" y="31" text-anchor="middle" font-family="sans-serif" font-size="22" font-weight="700" fill="#f5efe2">${escapeXml(text)}</text></svg>`,
  );
}

function label(id: string, status: string, width: number): Buffer {
  return Buffer.from(
    `<svg width="${width}" height="48" xmlns="http://www.w3.org/2000/svg"><text x="${width / 2}" y="19" text-anchor="middle" font-family="sans-serif" font-size="16" font-weight="700" fill="#f5efe2">${escapeXml(id)}</text><text x="${width / 2}" y="40" text-anchor="middle" font-family="sans-serif" font-size="13" fill="#8ee8cb">${escapeXml(status)}</text></svg>`,
  );
}

function captions(width: number): Buffer {
  return Buffer.from(
    `<svg width="${width}" height="410" xmlns="http://www.w3.org/2000/svg"><text x="${width / 2}" y="18" text-anchor="middle" font-family="sans-serif" font-size="13" fill="#d5e2dc">384² source on checkerboard</text><text x="${width / 2}" y="278" text-anchor="middle" font-family="sans-serif" font-size="13" fill="#d5e2dc">nearest enlarged alpha</text><text x="82" y="401" text-anchor="middle" font-family="sans-serif" font-size="13" fill="#d5e2dc">native 0.3×</text><text x="355" y="401" text-anchor="middle" font-family="sans-serif" font-size="13" fill="#d5e2dc">minimum 0.625×</text></svg>`,
  );
}

function groupLabel(id: string, width: number): Buffer {
  return Buffer.from(
    `<svg width="${width}" height="36" xmlns="http://www.w3.org/2000/svg"><text x="${width / 2}" y="24" text-anchor="middle" font-family="sans-serif" font-size="17" font-weight="700" fill="#f5efe2">${escapeXml(id)}</text></svg>`,
  );
}

function previewPanel(width: number, height: number): Buffer {
  return Buffer.from(
    `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><rect x="1" y="1" width="${width - 2}" height="${height - 2}" rx="8" fill="#1e3231" stroke="#66817c" stroke-width="2"/></svg>`,
  );
}

function dprLabel(dpr: string, backingSize: number, width: number): Buffer {
  return Buffer.from(
    `<svg width="${width}" height="38" xmlns="http://www.w3.org/2000/svg"><text x="${width / 2}" y="15" text-anchor="middle" font-family="sans-serif" font-size="14" font-weight="700" fill="#8ee8cb">${escapeXml(dpr)}</text><text x="${width / 2}" y="33" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#d5e2dc">${backingSize} × ${backingSize} px backing · same CSS footprint</text></svg>`,
  );
}

function rowLabel(text: string, width: number): Buffer {
  return Buffer.from(
    `<svg width="${width}" height="44" xmlns="http://www.w3.org/2000/svg"><text x="${width / 2}" y="27" text-anchor="middle" font-family="sans-serif" font-size="16" font-weight="700" fill="#f5efe2">${escapeXml(text)}</text></svg>`,
  );
}

function cityLabel(text: string, width: number, height: number): Buffer {
  return Buffer.from(
    `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><rect width="${width}" height="${height}" rx="4" fill="#102321" stroke="#f5efe2" stroke-width="2"/><text x="${width / 2}" y="${height * 0.68}" text-anchor="middle" font-family="sans-serif" font-size="${height * 0.48}" font-weight="700" fill="#f5efe2">${escapeXml(text)}</text></svg>`,
  );
}

function crown(size: number): Buffer {
  return Buffer.from(
    `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg"><path d="M ${size * 0.15} ${size * 0.34} L ${size * 0.34} ${size * 0.58} L ${size * 0.5} ${size * 0.22} L ${size * 0.66} ${size * 0.58} L ${size * 0.85} ${size * 0.34} L ${size * 0.76} ${size * 0.78} L ${size * 0.24} ${size * 0.78} Z" fill="#ffd65a" stroke="#57392f" stroke-width="${Math.max(2, size * 0.08)}" stroke-linejoin="round"/></svg>`,
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
