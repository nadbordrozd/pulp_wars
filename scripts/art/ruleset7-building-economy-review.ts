import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { format } from "prettier";
import sharp, { type OverlayOptions } from "sharp";

const root = process.cwd();
const reviewRoot = path.join(
  root,
  "art/pixellab/reviews/ruleset7-building-economy",
);
const worldIds = [
  "building-square-barracks",
  "building-square-monument",
] as const;
const actionIds = ["ui-action-pillage", "ui-action-disband"] as const;
const allIds = [...worldIds, ...actionIds] as const;
const artifactNames = [
  "world-source-native-enlarged.png",
  "world-zoom-dpr-context.png",
  "world-square-neighbors-units-status.png",
  "ui-icons-native-context.png",
  "ui-viewport-112x130.png",
] as const;

interface Bounds {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

interface Recipe {
  readonly id: string;
  readonly output: string;
  readonly seed: number;
  readonly requestSize: { readonly width: number; readonly height: number };
  readonly outputSize: { readonly width: number; readonly height: number };
  readonly anchor?: { readonly x: number; readonly y: number };
  readonly hardBounds: Bounds;
  readonly fitBounds?: Bounds;
  readonly postprocess?: string;
  readonly styleReference?: string;
}

interface RecordEntry {
  readonly status: string;
  readonly jobId?: string;
  readonly candidate?: string;
  readonly candidateSha256?: string;
  readonly providerOutputSha256?: string;
  readonly outputSha256?: string;
  readonly alphaBounds?: Bounds;
  readonly rejectedAttempts?: readonly unknown[];
}

const source = JSON.parse(
  await readFile(path.join(root, "scripts/art/pixellab-manifest.json"), "utf8"),
) as { readonly recipes: readonly Recipe[] };
const generated = JSON.parse(
  await readFile(
    path.join(root, "scripts/art/pixellab-generated.json"),
    "utf8",
  ),
) as { readonly records: Readonly<Record<string, RecordEntry>> };
const recipes = new Map(source.recipes.map((recipe) => [recipe.id, recipe]));
const availableWorlds = worldIds.filter((id) => available(id));
const availableActions = actionIds.filter((id) => available(id));

if (availableWorlds.length === 0 && availableActions.length === 0)
  throw new Error("No Ruleset 7 building/economy candidates are available");
await mkdir(reviewRoot, { recursive: true });
if (availableWorlds.length > 0) {
  await sourceNativeSheet();
  await zoomDprSheet();
  await squareContextSheet();
}
if (availableActions.length > 0) await iconSheet();
await viewportSheet();
if (allIds.every((id) => generated.records[id]?.status === "ACCEPTED"))
  await writeEvidence();
else
  console.log(
    `Candidate review evidence ready at ${path.relative(root, reviewRoot)}; all four accepted records are required for final evidence.`,
  );

function available(id: string): boolean {
  const status = generated.records[id]?.status;
  return status === "CANDIDATE" || status === "ACCEPTED";
}

function fileFor(id: string): string {
  const recipe = recipes.get(id);
  const record = generated.records[id];
  if (recipe === undefined || record === undefined)
    throw new Error(`Missing recipe or record: ${id}`);
  return path.join(
    root,
    record.status === "ACCEPTED"
      ? recipe.output
      : required(record.candidate, `${id} candidate`),
  );
}

async function sourceNativeSheet(): Promise<void> {
  const rowHeight = 500;
  const width = 1660;
  const overlays: OverlayOptions[] = [
    {
      input: heading(
        "RULESET 7 WORLD BUILDINGS · SOURCE 384 · NATIVE 0.30× · ENLARGED",
        width,
      ),
      left: 0,
      top: 8,
    },
  ];
  for (const [row, id] of availableWorlds.entries()) {
    const top = 70 + row * rowHeight;
    const record = generated.records[id];
    overlays.push({ input: label(id, 390), left: 12, top });
    overlays.push({ input: checker(404, 404), left: 12, top: top + 44 });
    overlays.push({ input: await fit(id, 384, 384), left: 22, top: top + 54 });
    overlays.push({ input: checker(270, 270), left: 438, top: top + 90 });
    overlays.push({
      input: await fit(id, 230, 230),
      left: 458,
      top: top + 110,
    });
    overlays.push({ input: checker(180, 180), left: 732, top: top + 118 });
    overlays.push({
      input: await fit(id, 115, 115),
      left: 764,
      top: top + 150,
    });
    overlays.push({
      input: caption(
        `alpha ${bounds(record?.alphaBounds)} · source 384×384 · map canvas 115.2×115.2 CSS at 1× · anchor 192,288 · visible base aligned to y316`,
        700,
      ),
      left: 940,
      top: top + 125,
    });
    overlays.push({
      input: sourceGuide(record?.alphaBounds),
      left: 22,
      top: top + 54,
    });
  }
  await render(
    width,
    90 + rowHeight * availableWorlds.length,
    overlays,
    artifactNames[0],
  );
}

async function zoomDprSheet(): Promise<void> {
  const settings = [
    [0.625, 1],
    [1, 1],
    [1.75, 1],
    [0.625, 2],
    [1, 2],
    [1.75, 2],
  ] as const;
  const width = 1400;
  const panelWidth = 620;
  const panelHeight = 460;
  const overlays: OverlayOptions[] = [
    {
      input: heading(
        "ACTUAL 128px SQUARE CONTEXT · DPR2 RENDERED AT BACKING SIZE THEN CSS-NORMALIZED",
        width,
      ),
      left: 0,
      top: 8,
    },
  ];
  for (const [row, [zoom, dpr]] of settings.entries()) {
    overlays.push({
      input: label(`${zoom}× · DPR${dpr}`, 120),
      left: 10,
      top: 72 + row * panelHeight,
    });
    for (const [column, id] of availableWorlds.entries())
      overlays.push({
        input: await mapPanel(
          id,
          zoom,
          dpr,
          column === 0 ? "ORIGINAL" : "CANDY",
        ),
        left: 150 + column * panelWidth,
        top: 70 + row * panelHeight,
      });
  }
  await render(
    width,
    90 + settings.length * panelHeight,
    overlays,
    artifactNames[1],
  );
}

async function squareContextSheet(): Promise<void> {
  const width = 1500;
  const overlays: OverlayOptions[] = [
    {
      input: heading(
        "FOREST / MOUNTAIN / CITY / ROADS / OWNERS / FOG / UNCHANGED UNIT + STATUS",
        width,
      ),
      left: 0,
      top: 8,
    },
  ];
  for (const [index, id] of availableWorlds.entries()) {
    overlays.push({ input: label(id, 600), left: 45 + index * 720, top: 70 });
    overlays.push({
      input: await neighborhood(id, index === 0 ? "ORIGINAL" : "CANDY"),
      left: 45 + index * 720,
      top: 118,
    });
  }
  await render(width, 850, overlays, artifactNames[2]);
}

async function iconSheet(): Promise<void> {
  const width = 1320;
  const overlays: OverlayOptions[] = [
    {
      input: heading(
        "PILLAGE + DISBAND · SOURCE 128 · 32 CSS · 112×130 · 176px ACTION BUTTON",
        width,
      ),
      left: 0,
      top: 8,
    },
  ];
  for (const [row, id] of availableActions.entries()) {
    const top = 76 + row * 330;
    overlays.push({ input: label(id, 300), left: 12, top });
    overlays.push({ input: checker(180, 180), left: 12, top: top + 42 });
    overlays.push({ input: await fit(id, 128, 128), left: 38, top: top + 68 });
    for (const [column, theme] of ["LIGHT", "DARK", "GRAY"].entries())
      overlays.push({
        input: await iconContext(id, theme),
        left: 240 + column * 340,
        top: top + 42,
      });
  }
  await render(
    width,
    100 + availableActions.length * 330,
    overlays,
    artifactNames[3],
  );
}

async function viewportSheet(): Promise<void> {
  const ids = allIds.filter((id) => available(id));
  const columnWidth = 390;
  const width = Math.max(800, ids.length * columnWidth);
  const overlays: OverlayOptions[] = [
    {
      input: heading(
        "EXACT 112×130 ORIGINAL-PADDING VIEWPORT · NO CROPPING / DISTORTION",
        width,
      ),
      left: 0,
      top: 8,
    },
  ];
  for (const [column, id] of ids.entries()) {
    const left = 8 + column * columnWidth;
    overlays.push({ input: label(id, 374), left, top: 70 });
    const themes = [
      ["LIGHT", "#eef4e8"],
      ["DARK", "#213d43"],
      ["HIGH CONTRAST", "#000000"],
    ] as const;
    for (const [themeIndex, [theme, background]] of themes.entries()) {
      overlays.push({
        input: await viewport(id, background),
        left: left + 4 + themeIndex * 122,
        top: 118,
      });
      overlays.push({
        input: tinyLabel(theme),
        left: left + 4 + themeIndex * 122,
        top: 252,
      });
    }
    overlays.push({
      input: caption(
        worldIds.includes(id as never)
          ? "exact accepted world source; full 384-square transparent padding preserved with object-fit contain"
          : "exact 128-square action source; 32 CSS identity plus contextual object-fit contain",
        374,
      ),
      left,
      top: 292,
    });
  }
  await render(width, 430, overlays, artifactNames[4]);
}

async function mapPanel(
  id: (typeof worldIds)[number],
  zoom: number,
  dpr: number,
  faction: "ORIGINAL" | "CANDY",
): Promise<Buffer> {
  const cssCell = Math.round(128 * zoom);
  const cssTopPadding = Math.ceil(24 * zoom);
  const backingCell = cssCell * dpr;
  const backingTopPadding = cssTopPadding * dpr;
  const backing = await cellScene(id, backingCell, backingTopPadding, faction);
  const css =
    dpr === 1
      ? backing
      : await sharp(backing)
          .resize(cssCell, cssCell + cssTopPadding, {
            kernel: sharp.kernel.lanczos3,
          })
          .png()
          .toBuffer();
  return sharp({
    create: { width: 600, height: 430, channels: 4, background: "#eef1e8ff" },
  })
    .composite([
      { input: css, left: 18, top: 18 },
      {
        input: caption(
          `${id.replace("building-square-", "")} · ${cssCell}px CSS · rendered ${backingCell}px DPR${dpr} backing${dpr === 2 ? " then normalized to CSS" : ""} · 0.30 source scale · no lateral/bottom overflow`,
          310,
        ),
        left: 275,
        top: 150,
      },
    ])
    .png()
    .toBuffer();
}

async function cellScene(
  id: (typeof worldIds)[number],
  cell: number,
  topPadding: number,
  faction: "ORIGINAL" | "CANDY",
): Promise<Buffer> {
  const factor = cell / 128;
  const buildingSize = Math.round(384 * 0.3 * factor);
  const anchorX = 192 * 0.3 * factor;
  const anchorY = 288 * 0.3 * factor;
  const left = Math.round(cell / 2 - anchorX);
  const top = Math.round(cell / 2 - anchorY);
  const grass = `public/assets/pixellab/terrain-square/${faction.toLowerCase()}-grass-1.png`;
  const road =
    "public/assets/pixellab/terrain-square/road-masks/road-mask-0101.png";
  return sharp({
    create: {
      width: cell,
      height: cell + topPadding,
      channels: 4,
      background: "#eef1e8ff",
    },
  })
    .composite([
      {
        input: await sharp(grass).resize(cell, cell).png().toBuffer(),
        left: 0,
        top: topPadding,
      },
      {
        input: await sharp(road).resize(cell, cell).png().toBuffer(),
        left: 0,
        top: topPadding,
      },
      { input: owner(cell, faction), left: 0, top: topPadding },
      {
        input: await sharp(fileFor(id))
          .resize(buildingSize, buildingSize)
          .png()
          .toBuffer(),
        left,
        top: top + topPadding,
      },
      { input: selection(cell), left: 0, top: topPadding },
    ])
    .png()
    .toBuffer();
}

async function neighborhood(
  id: (typeof worldIds)[number],
  faction: "ORIGINAL" | "CANDY",
): Promise<Buffer> {
  const cell = 168;
  const size = 3;
  const topPadding = 100;
  const overlays: OverlayOptions[] = [];
  for (let y = 0; y < size; y += 1)
    for (let x = 0; x < size; x += 1) {
      const grass = `public/assets/pixellab/terrain-square/${faction.toLowerCase()}-grass-${((x + y) % 4) + 1}.png`;
      overlays.push({
        input: await sharp(grass).resize(cell, cell).png().toBuffer(),
        left: x * cell,
        top: topPadding + y * cell,
      });
      if (x === 1 || y === 1)
        overlays.push({
          input: await sharp(
            "public/assets/pixellab/terrain-square/road-masks/road-mask-0101.png",
          )
            .resize(cell, cell)
            .png()
            .toBuffer(),
          left: x * cell,
          top: topPadding + y * cell,
        });
      overlays.push({
        input: ownerForIndex(cell, y * size + x),
        left: x * cell,
        top: topPadding + y * cell,
      });
    }
  overlays.push(
    await placedStructureAtCell(
      `public/assets/pixellab/terrain-square/${faction.toLowerCase()}-forest-1.png`,
      256,
      384,
      0.5,
      { x: 128, y: 256 },
      0,
      0,
      cell,
      topPadding,
    ),
    await placedStructureAtCell(
      `public/assets/pixellab/terrain-square/${faction.toLowerCase()}-mountain-1.png`,
      256,
      384,
      0.5,
      { x: 128, y: 256 },
      2,
      0,
      cell,
      topPadding,
    ),
    await placedStructureAtCell(
      "public/assets/pixellab/buildings/city-1.png",
      384,
      384,
      0.3,
      { x: 192, y: 236 },
      0,
      2,
      cell,
      topPadding,
    ),
  );
  for (const [name, x, y] of [
    ["workshop", 0, 1],
    ["grand-works", 1, 0],
    ["market", 2, 1],
  ] as const)
    overlays.push(
      await placedStructureAtCell(
        `public/assets/pixellab/buildings-square/${name}.png`,
        384,
        384,
        0.3,
        { x: 192, y: 288 },
        x,
        y,
        cell,
        topPadding,
      ),
    );
  overlays.push(
    await placedStructureAtCell(
      fileFor(id),
      384,
      384,
      0.3,
      { x: 192, y: 288 },
      1,
      1,
      cell,
      topPadding,
    ),
  );
  overlays.push({
    input: selection(cell),
    left: cell,
    top: topPadding + cell,
  });
  const unit = faction === "ORIGINAL" ? "warrior.png" : "candy-warrior.png";
  overlays.push(
    await placedUnitAtCell(
      `public/assets/pixellab/units/${unit}`,
      1,
      1,
      cell,
      topPadding,
    ),
  );
  overlays.push({
    input: status(cell),
    left: cell,
    top: topPadding + cell,
  });
  overlays.push(
    await placedStructureAtCell(
      fileFor(id),
      384,
      384,
      0.3,
      { x: 192, y: 288 },
      2,
      2,
      cell,
      topPadding,
    ),
  );
  overlays.push({
    input: fog(cell),
    left: cell * 2,
    top: topPadding + cell * 2,
  });
  return sharp({
    create: {
      width: cell * size,
      height: topPadding + cell * size,
      channels: 4,
      background: "#a8ba93ff",
    },
  })
    .composite(overlays)
    .png()
    .toBuffer();
}

async function placedStructureAtCell(
  file: string,
  sourceWidth: number,
  sourceHeight: number,
  displayScale: number,
  anchor: { readonly x: number; readonly y: number },
  x: number,
  y: number,
  cell: number,
  topPadding: number,
): Promise<OverlayOptions> {
  const scale = cell / 128;
  const centerX = x * cell + cell / 2;
  const centerY = topPadding + y * cell + cell / 2;
  return {
    input: await sharp(file)
      .resize(
        Math.round(sourceWidth * displayScale * scale),
        Math.round(sourceHeight * displayScale * scale),
      )
      .png()
      .toBuffer(),
    left: Math.round(centerX - anchor.x * displayScale * scale),
    top: Math.round(centerY - anchor.y * displayScale * scale),
  };
}

async function placedUnitAtCell(
  file: string,
  x: number,
  y: number,
  cell: number,
  topPadding: number,
): Promise<OverlayOptions> {
  const scale = cell / 128;
  const displayScale = 0.25;
  const sourceWidth = 256;
  const sourceHeight = 296;
  const anchor = { x: 128, y: 222 };
  const baselineOffset = 18;
  const centerX = x * cell + cell / 2;
  const centerY = topPadding + y * cell + cell / 2;
  return {
    input: await sharp(file)
      .resize(
        Math.round(sourceWidth * displayScale * scale),
        Math.round(sourceHeight * displayScale * scale),
      )
      .png()
      .toBuffer(),
    left: Math.round(centerX - anchor.x * displayScale * scale),
    top: Math.round(
      centerY + baselineOffset * scale - anchor.y * displayScale * scale,
    ),
  };
}

async function iconContext(id: string, theme: string): Promise<Buffer> {
  const background = theme === "DARK" ? "#213d43ff" : "#fff4dcff";
  let icon = await sharp(fileFor(id))
    .resize(32, 32, { kernel: sharp.kernel.lanczos3 })
    .png()
    .toBuffer();
  if (theme === "GRAY") icon = await sharp(icon).grayscale().png().toBuffer();
  return sharp({ create: { width: 330, height: 230, channels: 4, background } })
    .composite([
      { input: miniLabel(`${theme} · 32 CSS + 176 BUTTON`), left: 4, top: 4 },
      { input: icon, left: 32, top: 118 },
      { input: await actionButton(id, theme), left: 128, top: 34 },
    ])
    .png()
    .toBuffer();
}

async function actionButton(id: string, theme: string): Promise<Buffer> {
  const highContrast = theme === "GRAY";
  const background = highContrast
    ? "#000000"
    : theme === "DARK"
      ? "#29484d"
      : "#fff4dc";
  const stroke = highContrast ? "#ffffff" : "#213d43";
  const textColor = highContrast || theme === "DARK" ? "#ffffff" : "#213d43";
  let art = await sharp(fileFor(id))
    .resize({
      width: 112,
      height: 130,
      fit: "contain",
      kernel: sharp.kernel.lanczos3,
      background: "#00000000",
    })
    .png()
    .toBuffer();
  if (highContrast) art = await sharp(art).grayscale().png().toBuffer();
  const labelText = id === "ui-action-pillage" ? "PILLAGE" : "DISBAND";
  return sharp({
    create: { width: 176, height: 192, channels: 4, background: "#00000000" },
  })
    .composite([
      {
        input: Buffer.from(
          `<svg width="176" height="192" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="2" width="172" height="188" rx="12" fill="${background}" stroke="${stroke}" stroke-width="4"/><text x="88" y="166" text-anchor="middle" font-family="sans-serif" font-size="15" font-weight="700" fill="${textColor}">${labelText}</text><text x="88" y="183" text-anchor="middle" font-family="sans-serif" font-size="10" fill="${textColor}">176 CSS px</text></svg>`,
        ),
      },
      { input: art, left: 32, top: 8 },
    ])
    .png()
    .toBuffer();
}

async function viewport(id: string, background = "#eef4e8"): Promise<Buffer> {
  const image = await sharp(fileFor(id))
    .resize({
      width: 112,
      height: 130,
      fit: "contain",
      kernel: sharp.kernel.lanczos3,
      background: "#00000000",
    })
    .png()
    .toBuffer();
  return sharp({
    create: { width: 112, height: 130, channels: 4, background },
  })
    .composite([
      { input: image },
      { input: viewportFrame(background === "#000000") },
    ])
    .png()
    .toBuffer();
}

async function fit(id: string, width: number, height: number): Promise<Buffer> {
  return sharp(fileFor(id))
    .resize(width, height, { fit: "contain", kernel: sharp.kernel.lanczos3 })
    .png()
    .toBuffer();
}

function sourceGuide(alphaBounds: Bounds | undefined): Buffer {
  const alpha = alphaBounds;
  return Buffer.from(
    `<svg width="384" height="384" xmlns="http://www.w3.org/2000/svg">${alpha === undefined ? "" : `<rect x="${alpha.left}" y="${alpha.top}" width="${alpha.right - alpha.left}" height="${alpha.bottom - alpha.top}" fill="none" stroke="#ffe36d" stroke-width="2"/>`}<line x1="0" y1="316" x2="384" y2="316" stroke="#ff6c59" stroke-width="2" stroke-dasharray="9 6"/><circle cx="192" cy="288" r="5" fill="#5de5cf" stroke="#213d43" stroke-width="2"/></svg>`,
  );
}

function owner(size: number, faction: "ORIGINAL" | "CANDY"): Buffer {
  const color = faction === "ORIGINAL" ? "#db6b58" : "#7d69d8";
  return Buffer.from(
    `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="2" width="${size - 4}" height="${size - 4}" fill="${color}20" stroke="${color}" stroke-width="4" stroke-dasharray="10 6"/></svg>`,
  );
}

function ownerForIndex(size: number, index: number): Buffer {
  const colors = ["#db6b58", "#7d69d8", "#418a79", "#d39a32"];
  const color = colors[index % colors.length];
  return Buffer.from(
    `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="2" width="${size - 4}" height="${size - 4}" fill="${color}16" stroke="${color}" stroke-width="4" stroke-dasharray="10 6"/></svg>`,
  );
}

function fog(size: number): Buffer {
  return Buffer.from(
    `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg"><rect width="${size}" height="${size}" fill="#203332e8"/><path d="M0 ${Math.round(size * 0.22)} C${Math.round(size * 0.3)} ${Math.round(size * 0.06)},${Math.round(size * 0.58)} ${Math.round(size * 0.38)},${size} ${Math.round(size * 0.16)}" fill="none" stroke="#78908a" stroke-width="${Math.max(3, Math.round(size * 0.035))}"/><text x="${size / 2}" y="${Math.round(size * 0.58)}" text-anchor="middle" font-family="sans-serif" font-size="${Math.round(size * 0.11)}" font-weight="700" fill="#d7dfda">FOG</text></svg>`,
  );
}

function selection(size: number): Buffer {
  return Buffer.from(
    `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg"><rect x="6" y="6" width="${size - 12}" height="${size - 12}" rx="7" fill="none" stroke="#fff19a" stroke-width="5"/><rect x="11" y="11" width="${size - 22}" height="${size - 22}" rx="5" fill="none" stroke="#213d43" stroke-width="2"/></svg>`,
  );
}

function status(size: number): Buffer {
  const scale = size / 128;
  return Buffer.from(
    `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg"><rect x="${Math.round(41 * scale)}" y="${Math.round(88 * scale)}" width="${Math.round(46 * scale)}" height="${Math.round(10 * scale)}" rx="${Math.round(3 * scale)}" fill="#213d43"/><rect x="${Math.round(43 * scale)}" y="${Math.round(90 * scale)}" width="${Math.round(34 * scale)}" height="${Math.round(6 * scale)}" fill="#78d88c"/><circle cx="${Math.round(98 * scale)}" cy="${Math.round(52 * scale)}" r="${Math.round(9 * scale)}" fill="#db6b58" stroke="#213d43" stroke-width="${Math.max(2, Math.round(2 * scale))}"/></svg>`,
  );
}

function checker(width: number, height: number): Buffer {
  return Buffer.from(
    `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><defs><pattern id="c" width="20" height="20" patternUnits="userSpaceOnUse"><rect width="20" height="20" fill="#eef1e8"/><rect width="10" height="10" fill="#cbd5ca"/><rect x="10" y="10" width="10" height="10" fill="#cbd5ca"/></pattern></defs><rect width="100%" height="100%" fill="url(#c)"/></svg>`,
  );
}

function heading(text: string, width: number): Buffer {
  return Buffer.from(
    `<svg width="${width}" height="48" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="48" rx="12" fill="#213d43"/><text x="${width / 2}" y="31" text-anchor="middle" font-family="sans-serif" font-size="20" font-weight="700" fill="#fff4dc">${text}</text></svg>`,
  );
}

function label(text: string, width: number): Buffer {
  return Buffer.from(
    `<svg width="${width}" height="34" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="34" rx="8" fill="#395a60"/><text x="${width / 2}" y="23" text-anchor="middle" font-family="sans-serif" font-size="15" font-weight="700" fill="#fff4dc">${text}</text></svg>`,
  );
}

function miniLabel(text: string): Buffer {
  return Buffer.from(
    `<svg width="312" height="28" xmlns="http://www.w3.org/2000/svg"><rect width="312" height="28" rx="6" fill="#395a60"/><text x="156" y="19" text-anchor="middle" font-family="sans-serif" font-size="12" font-weight="700" fill="#fff4dc">${text}</text></svg>`,
  );
}

function caption(text: string, width: number): Buffer {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  const lineLength = Math.max(28, Math.floor(width / 10));
  for (const word of words) {
    if (`${line} ${word}`.trim().length > lineLength) {
      lines.push(line);
      line = word;
    } else line = `${line} ${word}`.trim();
  }
  if (line) lines.push(line);
  return Buffer.from(
    `<svg width="${width}" height="116" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="116" rx="8" fill="#fff4dcee"/>${lines
      .slice(0, 5)
      .map(
        (value, index) =>
          `<text x="12" y="${23 + index * 19}" font-family="sans-serif" font-size="14" fill="#213d43">${value}</text>`,
      )
      .join("")}</svg>`,
  );
}

function viewportFrame(highContrast = false): Buffer {
  return Buffer.from(
    `<svg width="112" height="130" xmlns="http://www.w3.org/2000/svg"><rect x="1" y="1" width="110" height="128" rx="7" fill="none" stroke="${highContrast ? "#ffffff" : "#213d43"}" stroke-width="2"/></svg>`,
  );
}

function tinyLabel(text: string): Buffer {
  return Buffer.from(
    `<svg width="112" height="24" xmlns="http://www.w3.org/2000/svg"><text x="56" y="17" text-anchor="middle" font-family="sans-serif" font-size="10" font-weight="700" fill="#213d43">${text}</text></svg>`,
  );
}

async function render(
  width: number,
  height: number,
  overlays: readonly OverlayOptions[],
  filename: string,
): Promise<void> {
  await sharp({
    create: { width, height, channels: 4, background: "#9bb49fff" },
  })
    .composite([...overlays])
    .png()
    .toFile(path.join(reviewRoot, filename));
}

async function writeEvidence(): Promise<void> {
  const artifacts = await Promise.all(
    artifactNames.map(async (filename) => {
      const bytes = await readFile(path.join(reviewRoot, filename));
      return { filename, sha256: hash(bytes), bytes: bytes.byteLength };
    }),
  );
  const evidence = {
    status: "COMPLETE",
    generationOrder: allIds,
    worldApprovalGate: true,
    pixelLabRequests: [[worldIds[0]], [worldIds[1]], [...actionIds]],
    assets: Object.fromEntries(
      allIds.map((id) => {
        const recipe = recipes.get(id);
        const record = generated.records[id];
        return [
          id,
          {
            seed: recipe?.seed,
            output: recipe?.output,
            jobId: record?.jobId,
            providerOutputSha256: record?.providerOutputSha256,
            outputSha256: record?.outputSha256,
            alphaBounds: record?.alphaBounds,
            styleReference: recipe?.styleReference,
            rejectedAttempts: record?.rejectedAttempts ?? [],
          },
        ];
      }),
    ),
    reviewCoverage: [
      "world sources at 384x384, native 0.30 scale and enlarged scale with exact ground guide",
      "actual padded square terrain and Road composition at 0.625/1/1.75 zoom and DPR1/2 backing render normalized to CSS",
      "neighboring Forest, Mountain, city, Workshop, Grand Works and Market with four owners, selection, unchanged units/status and representative building-under-fog suppression",
      "Pillage and Disband at 128 source, 32 CSS, light/dark/grayscale, exact 112x130 transparent contain and 176 CSS-pixel action buttons",
      "all four accepted rasters in the exact 112x130 light/dark/high-contrast object-fit contain viewport with original padding",
      "no rasterized text, number, owner, selection, status, Spoils, achievement or capacity state",
    ],
    artifacts,
  };
  await writeFile(
    path.join(reviewRoot, "review-evidence.json"),
    await format(JSON.stringify(evidence), { parser: "json" }),
  );
  await writeFile(
    path.join(reviewRoot, "README.md"),
    "# Ruleset 7 building and conflict-economy art review\n\nTwo separate PixelLab world-building requests produced Barracks and one shared Monument. Root approval of both complete world proofs gated one bounded Pillage/Disband icon request, and root separately approved the completed icon contexts. Hashed asset-only sheets cover source, native, enlarged, actual padded 0.625/1/1.75 zoom and DPR1/2 square contexts, neighboring Forest/Mountain/city/processors/Roads, multiple owners, unchanged units/status, building-under-fog suppression, 32 CSS icon use, exact 112 x 130 transparent original-padding viewports on light/dark/high-contrast surfaces, and exact 176 CSS-pixel action-button use. Spoils and all dynamic state remain code-native. These review artifacts do not claim runtime or browser integration, which is outside this bead.\n",
  );
}

function bounds(value: Bounds | undefined): string {
  return value === undefined
    ? "missing"
    : `${value.left},${value.top}..${value.right},${value.bottom}`;
}

function hash(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function required<T>(value: T | undefined, description: string): T {
  if (value === undefined) throw new Error(`Missing ${description}`);
  return value;
}
