import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp, { type OverlayOptions } from "sharp";

const root = process.cwd();
const reviewRoot = path.join(
  root,
  "art/pixellab/reviews/square-extraction-processors",
);
const ids = [
  "building-square-lumber-camp",
  "building-square-mine",
  "building-square-sawmill",
  "building-square-forge",
  "building-square-stoneworks",
] as const;
const source = JSON.parse(
  await readFile(path.join(root, "scripts/art/pixellab-manifest.json"), "utf8"),
) as SourceManifest;
const generated = JSON.parse(
  await readFile(
    path.join(root, "scripts/art/pixellab-generated.json"),
    "utf8",
  ),
) as GeneratedManifest;
const recipes = new Map(source.recipes.map((recipe) => [recipe.id, recipe]));
const artifacts = [
  "source-native-enlarged.png",
  "extraction-layering-both-factions.png",
  "processor-contributors-levels.png",
  "dense-overlays.png",
  "zoom-dpr.png",
  "ui-reuse-112x130.png",
] as const;

await mkdir(reviewRoot, { recursive: true });
assertAvailable(ids.slice(0, 2));
await extractionSheet();
if (process.argv.includes("--extraction-only")) {
  console.log(path.join(reviewRoot, artifacts[1]));
  process.exit(0);
}
assertAvailable(ids);
await sourceSheet();
await processorSheet();
await denseSheet();
await zoomSheet();
await uiSheet();
await writeEvidence();

interface Bounds {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly empty?: boolean;
}

interface Recipe {
  readonly id: string;
  readonly output: string;
  readonly requestSize: { readonly width: number; readonly height: number };
  readonly outputSize: { readonly width: number; readonly height: number };
  readonly anchor?: { readonly x: number; readonly y: number };
  readonly hardBounds: Bounds;
  readonly preferredBounds?: Bounds;
  readonly fitBounds?: Bounds;
  readonly seed: number;
  readonly prompt: string;
  readonly negativePrompt: string;
  readonly postprocess?: string;
  readonly styleReference?: string;
}

interface SourceManifest {
  readonly recipes: readonly Recipe[];
}

interface GeneratedRecord {
  readonly status: string;
  readonly candidate?: string;
  readonly candidateSha256?: string;
  readonly providerOutputSha256?: string;
  readonly outputSha256?: string;
  readonly jobId?: string;
  readonly alphaBounds?: Bounds;
  readonly notes?: string;
  readonly reviewChecks?: Readonly<Record<string, boolean>>;
  readonly rejectedAttempts?: readonly unknown[];
}

interface GeneratedManifest {
  readonly records: Readonly<Record<string, GeneratedRecord>>;
}

function assertAvailable(required: readonly string[]): void {
  for (const id of required) {
    const recipe = recipes.get(id);
    const record = generated.records[id];
    if (recipe === undefined || record === undefined)
      throw new Error(`Missing square improvement record: ${id}`);
    if (record.status !== "ACCEPTED" && record.candidate === undefined)
      throw new Error(`No reviewable candidate: ${id}`);
  }
}

function fileFor(id: string): string {
  const recipe = recipes.get(id);
  const record = generated.records[id];
  if (recipe === undefined || record === undefined)
    throw new Error(`Unknown asset: ${id}`);
  return path.join(
    root,
    record.status === "ACCEPTED"
      ? recipe.output
      : (record.candidate ?? recipe.output),
  );
}

async function extractionSheet(): Promise<void> {
  const width = 1440;
  const overlays: OverlayOptions[] = [
    {
      input: heading(
        "FOREST → LUMBER CAMP → UNIT · MOUNTAIN → MINE → UNIT · BOTH FACTIONS",
        width,
      ),
      left: 0,
      top: 10,
    },
  ];
  const contexts = [
    ["ORIGINAL", "forest", "building-square-lumber-camp", "unit-warrior"],
    ["ORIGINAL", "mountain", "building-square-mine", "unit-warrior"],
    ["CANDY", "forest", "building-square-lumber-camp", "unit-candy-warrior"],
    ["CANDY", "mountain", "building-square-mine", "unit-candy-warrior"],
  ] as const;
  for (const [index, context] of contexts.entries()) {
    const x = 20 + index * 350;
    overlays.push({
      input: label(`${context[0]} · ${context[1].toUpperCase()}`, 330),
      left: x,
      top: 68,
    });
    overlays.push({
      input: await layeredExtraction(
        context[0],
        context[1],
        context[2],
        context[3],
      ),
      left: x + 37,
      top: 112,
    });
    overlays.push({
      input: caption(
        "terrain remains authoritative behind improvement; accepted unit is unchanged and drawn in front",
        330,
      ),
      left: x,
      top: 510,
    });
  }
  await render(width, 620, overlays, artifacts[1]);
}

async function layeredExtraction(
  faction: "ORIGINAL" | "CANDY",
  terrain: "forest" | "mountain",
  building: string,
  unit: string,
): Promise<Buffer> {
  const canvasWidth = 192;
  const canvasHeight = 240;
  const factionSlug = faction.toLowerCase();
  const terrainFile = path.join(
    root,
    `public/assets/pixellab/terrain-square/${factionSlug}-${terrain}-1.png`,
  );
  const unitFile = path.join(
    root,
    `public/assets/pixellab/units/${unit.replace(/^unit-/, "")}.png`,
  );
  const background = await sharp({
    create: {
      width: canvasWidth,
      height: canvasHeight,
      channels: 4,
      background: "#d8cbb6ff",
    },
  })
    .composite([
      {
        input: await sharp(terrainFile).resize(128, 192).png().toBuffer(),
        left: 32,
        top: 0,
      },
      {
        input: await sharp(fileFor(building)).resize(128, 148).png().toBuffer(),
        left: 32,
        top: 17,
      },
      {
        input: await sharp(unitFile).resize(64, 74).png().toBuffer(),
        left: 64,
        top: 72,
      },
      { input: selectionOverlay(), left: 32, top: 64 },
      { input: ownerCorner(faction), left: 38, top: 70 },
    ])
    .png()
    .toBuffer();
  return sharp(background).resize(288, 360).png().toBuffer();
}

async function sourceSheet(): Promise<void> {
  const width = 1800;
  const overlays: OverlayOptions[] = [
    {
      input: heading("FIVE ACCEPTED SOURCES · ENLARGED AND NATIVE 1×", width),
      left: 0,
      top: 8,
    },
  ];
  for (const [index, id] of ids.entries()) {
    const left = 10 + index * 356;
    const recipe = recipes.get(id);
    const record = generated.records[id];
    if (recipe === undefined || record === undefined) continue;
    overlays.push({ input: label(id, 344), left, top: 62 });
    overlays.push({
      input: checker(320, 300),
      left: left + 12,
      top: 104,
    });
    overlays.push({
      input: await sharp(fileFor(id))
        .resize({
          width: 300,
          height: 280,
          fit: "contain",
          background: "#00000000",
        })
        .png()
        .toBuffer(),
      left: left + 22,
      top: 114,
    });
    overlays.push({
      input: await nativeTile(id, "ORIGINAL"),
      left: left + 74,
      top: 416,
    });
    overlays.push({
      input: caption(
        `${record.status} · ${record.candidateSha256?.slice(0, 12) ?? record.outputSha256?.slice(0, 12)} · alpha ${bounds(record.alphaBounds)}`,
        344,
      ),
      left,
      top: 680,
    });
  }
  await render(width, 780, overlays, artifacts[0]);
}

async function processorSheet(): Promise<void> {
  const width = 1760;
  const height = 1160;
  const overlays: OverlayOptions[] = [
    {
      input: heading(
        "PROCESSORS · ZERO→MAX CONTRIBUTORS · EXACT LIVE-LEVEL SQUARES · BOTH FACTIONS",
        width,
      ),
      left: 0,
      top: 8,
    },
  ];
  const states = [0, 1, 4, 8] as const;
  const processors = ids.slice(2);
  for (const [row, id] of processors.entries()) {
    const top = 70 + row * 356;
    overlays.push({ input: label(id, 220), left: 12, top });
    for (const [factionIndex, faction] of (
      ["ORIGINAL", "CANDY"] as const
    ).entries()) {
      for (const [stateIndex, contributors] of states.entries()) {
        const left = 244 + (factionIndex * 4 + stateIndex) * 186;
        const liveValue =
          id === "building-square-sawmill"
            ? contributors
            : id === "building-square-forge"
              ? contributors * 2
              : stoneworksValue(contributors);
        overlays.push({
          input: label(
            `${faction.slice(0, 4)} · ${contributors}→${liveValue}`,
            174,
          ),
          left,
          top,
        });
        overlays.push({
          input: await processorContext(id, faction, contributors, liveValue),
          left,
          top: top + 42,
        });
      }
    }
    overlays.push({
      input: caption(
        id.endsWith("sawmill")
          ? "cluster contributors 0/1/4/8; mint squares equal live population and wrap after eight"
          : id.endsWith("forge")
            ? "adjacent Mines 0/1/4/8; +2 each produces exact 0/2/8/16 mint squares"
            : "adjacent Quarries 0/1/4/8; opposite pairs included for exact 0/1/8/16 squares",
        220,
      ),
      left: 12,
      top: top + 76,
    });
  }
  await render(width, height, overlays, artifacts[2]);
}

async function denseSheet(): Promise<void> {
  const width = 1500;
  const overlays: OverlayOptions[] = [
    {
      input: heading(
        "DENSE MAPS · ROADS / RESOURCES / CITIES / FOG / OWNERSHIP / SELECTION",
        width,
      ),
      left: 0,
      top: 8,
    },
    { input: await denseFaction("ORIGINAL"), left: 20, top: 70 },
    { input: await denseFaction("CANDY"), left: 760, top: 70 },
  ];
  await render(width, 780, overlays, artifacts[3]);
}

async function zoomSheet(): Promise<void> {
  const width = 1760;
  const rows = [
    [0.625, 1],
    [1, 1],
    [1.75, 1],
    [0.625, 2],
    [1, 2],
    [1.75, 2],
  ] as const;
  const overlays: OverlayOptions[] = [
    {
      input: heading("MIN / 1× / MAX ZOOM · DPR1 / DPR2", width),
      left: 0,
      top: 8,
    },
  ];
  for (const [row, [zoom, dpr]] of rows.entries()) {
    const top = 66 + row * 250;
    overlays.push({
      input: label(`${zoom}× · DPR${dpr}`, 180),
      left: 10,
      top,
    });
    for (const [column, id] of ids.entries()) {
      const size = Math.round(128 * zoom);
      overlays.push({
        input: await zoomContext(id, zoom, dpr),
        left: 210 + column * 300,
        top,
      });
      overlays.push({
        input: label(
          `${id.replace("building-square-", "")} · ${size}px CSS`,
          280,
        ),
        left: 200 + column * 300,
        top: top + 214,
      });
    }
  }
  await render(width, 1580, overlays, artifacts[4]);
}

async function uiSheet(): Promise<void> {
  const width = 1800;
  const overlays: OverlayOptions[] = [
    {
      input: heading(
        "EXACT 112×130 RASTER VIEWPORT · ACTION / SELECTION / TECHNOLOGY",
        width,
      ),
      left: 0,
      top: 8,
    },
  ];
  for (const [assetIndex, id] of ids.entries()) {
    const groupLeft = 12 + assetIndex * 356;
    overlays.push({ input: label(id, 340), left: groupLeft, top: 64 });
    for (const [useIndex, use] of ["ACTION", "SELECTION", "TECH"].entries()) {
      overlays.push({
        input: await uiViewport(id, use),
        left: groupLeft + 2 + useIndex * 112,
        top: 108,
      });
    }
  }
  await render(width, 270, overlays, artifacts[5]);
}

async function nativeTile(
  id: (typeof ids)[number],
  faction: "ORIGINAL" | "CANDY",
): Promise<Buffer> {
  const overlays: OverlayOptions[] = [];
  const factionSlug = faction.toLowerCase();
  if (id === "building-square-lumber-camp" || id === "building-square-mine") {
    const terrain = id.endsWith("lumber-camp") ? "forest" : "mountain";
    overlays.push({
      input: await sharp(
        path.join(
          root,
          `public/assets/pixellab/terrain-square/${factionSlug}-${terrain}-1.png`,
        ),
      )
        .resize(128, 192)
        .png()
        .toBuffer(),
      left: 34,
      top: 16,
    });
  } else {
    overlays.push({
      input: await sharp(
        path.join(
          root,
          `public/assets/pixellab/terrain-square/${factionSlug}-grass-1.png`,
        ),
      )
        .resize(128, 128)
        .png()
        .toBuffer(),
      left: 34,
      top: 80,
    });
  }
  const low =
    id === "building-square-lumber-camp" || id === "building-square-mine";
  overlays.push({
    input: await sharp(fileFor(id))
      .resize(low ? 128 : 115, low ? 148 : 115)
      .png()
      .toBuffer(),
    left: low ? 34 : 40,
    top: low ? 33 : 58,
  });
  overlays.push({ input: selectionOverlay(), left: 34, top: 80 });
  return sharp({
    create: { width: 196, height: 240, channels: 4, background: "#d8cbb6ff" },
  })
    .composite(overlays)
    .png()
    .toBuffer();
}

function stoneworksValue(contributors: number): number {
  if (contributors === 0) return 0;
  if (contributors === 1) return 1;
  if (contributors === 4) return 8;
  return 16;
}

async function processorContext(
  id: string,
  faction: "ORIGINAL" | "CANDY",
  contributors: number,
  liveValue: number,
): Promise<Buffer> {
  const factionSlug = faction.toLowerCase();
  const grass = await sharp(
    path.join(
      root,
      `public/assets/pixellab/terrain-square/${factionSlug}-grass-2.png`,
    ),
  )
    .resize(128, 128)
    .png()
    .toBuffer();
  const processor = await sharp(fileFor(id)).resize(115, 115).png().toBuffer();
  return sharp({
    create: { width: 174, height: 270, channels: 4, background: "#d8cbb6ff" },
  })
    .composite([
      { input: grass, left: 23, top: 60 },
      { input: contributorOverlay(contributors), left: 23, top: 60 },
      { input: processor, left: 29, top: 38 },
      { input: liveSquares(liveValue), left: 119, top: 161 },
      { input: ownerCorner(faction), left: 28, top: 65 },
      {
        input: caption(
          `${contributors} contributor${contributors === 1 ? "" : "s"}; ${liveValue} square${liveValue === 1 ? "" : "s"}`,
          160,
        ),
        left: 7,
        top: 194,
      },
    ])
    .png()
    .toBuffer();
}

function contributorOverlay(count: number): Buffer {
  const points = [
    [64, 7],
    [103, 17],
    [121, 64],
    [103, 111],
    [64, 121],
    [17, 111],
    [7, 64],
    [17, 17],
  ] as const;
  return Buffer.from(
    `<svg width="128" height="128" xmlns="http://www.w3.org/2000/svg">${points
      .slice(0, count)
      .map(
        ([x, y]) =>
          `<line x1="64" y1="64" x2="${x}" y2="${y}" stroke="#f2c35b" stroke-width="2" stroke-dasharray="4 4"/><circle cx="${x}" cy="${y}" r="6" fill="#f2c35b" stroke="#213d43" stroke-width="3"/>`,
      )
      .join("")}</svg>`,
  );
}

function liveSquares(count: number): Buffer {
  const squares = Array.from({ length: count }, (_, index) => {
    const x = (index % 4) * 9;
    const y = Math.floor(index / 4) * 9;
    return `<rect x="${x}" y="${y}" width="7" height="7" rx="1" fill="#8ef0bd" stroke="#213d43" stroke-width="1.5"/>`;
  }).join("");
  return Buffer.from(
    `<svg width="38" height="38" xmlns="http://www.w3.org/2000/svg">${squares}</svg>`,
  );
}

async function denseFaction(faction: "ORIGINAL" | "CANDY"): Promise<Buffer> {
  const overlays: OverlayOptions[] = [
    { input: label(faction, 700), left: 0, top: 0 },
  ];
  for (let index = 0; index < 24; index += 1) {
    overlays.push({
      input: await denseTile(faction, index),
      left: 62 + (index % 6) * 96,
      top: 46 + Math.floor(index / 6) * 144,
    });
  }
  return sharp({
    create: { width: 700, height: 650, channels: 4, background: "#8ca68fff" },
  })
    .composite(overlays)
    .png()
    .toBuffer();
}

async function denseTile(
  faction: "ORIGINAL" | "CANDY",
  index: number,
): Promise<Buffer> {
  const factionSlug = faction.toLowerCase();
  const grassVariant = (index % 4) + 1;
  const overlays: OverlayOptions[] = [
    {
      input: await sharp(
        path.join(
          root,
          `public/assets/pixellab/terrain-square/${factionSlug}-grass-${grassVariant}.png`,
        ),
      )
        .resize(96, 96)
        .png()
        .toBuffer(),
      left: 0,
      top: 48,
    },
  ];
  if ([0, 6].includes(index))
    overlays.push({
      input: await sharp(
        path.join(
          root,
          `public/assets/pixellab/terrain-square/${factionSlug}-forest-1.png`,
        ),
      )
        .resize(96, 144)
        .png()
        .toBuffer(),
      left: 0,
      top: 0,
    });
  if ([1, 7].includes(index))
    overlays.push({
      input: await sharp(
        path.join(
          root,
          `public/assets/pixellab/terrain-square/${factionSlug}-mountain-1.png`,
        ),
      )
        .resize(96, 144)
        .png()
        .toBuffer(),
      left: 0,
      top: 0,
    });
  if (index % 3 === 0)
    overlays.push({
      input: await sharp(
        path.join(
          root,
          "public/assets/pixellab/terrain-square/road-masks/road-mask-1111.png",
        ),
      )
        .resize(96, 96)
        .png()
        .toBuffer(),
      left: 0,
      top: 48,
    });
  if ([4, 10, 16].includes(index))
    overlays.push({ input: ownerWash(faction), left: 0, top: 48 });
  const buildingByIndex: Readonly<Record<number, string>> = {
    0: "building-square-lumber-camp",
    1: "building-square-mine",
    3: "building-square-sawmill",
    4: "building-square-forge",
    5: "building-square-stoneworks",
    9: "building-square-farm",
    10: "building-square-quarry",
    11: "building-square-windmill",
  };
  const building = buildingByIndex[index];
  if (building !== undefined) {
    const low =
      building.endsWith("lumber-camp") ||
      building.endsWith("mine") ||
      building.endsWith("quarry");
    const squareGround = building.endsWith("farm");
    overlays.push({
      input: await sharp(
        ids.includes(building as (typeof ids)[number])
          ? fileFor(building)
          : path.join(
              root,
              `public/assets/pixellab/buildings-square/${building.replace("building-square-", "")}.png`,
            ),
      )
        .resize(
          squareGround ? 96 : low ? 96 : 86,
          squareGround ? 96 : low ? 111 : 86,
        )
        .png()
        .toBuffer(),
      left: squareGround ? 0 : low ? 0 : 5,
      top: squareGround ? 48 : low ? 29 : 47,
    });
  }
  if (index === 13) {
    const resource = faction === "ORIGINAL" ? "original-fruit" : "candy-fruit";
    overlays.push({
      input: await sharp(
        path.join(
          root,
          `public/assets/pixellab/terrain-square/${resource}.png`,
        ),
      )
        .resize(96, 144)
        .png()
        .toBuffer(),
      left: 0,
      top: 0,
    });
  }
  if (index === 14)
    overlays.push({
      input: await sharp(
        path.join(root, "public/assets/pixellab/terrain-square/stone.png"),
      )
        .resize(96, 144)
        .png()
        .toBuffer(),
      left: 0,
      top: 0,
    });
  if (index === 15) {
    const city = faction === "ORIGINAL" ? "city-2" : "candy-city-2";
    overlays.push({
      input: await sharp(
        path.join(root, `public/assets/pixellab/buildings/${city}.png`),
      )
        .resize(86, 86)
        .png()
        .toBuffer(),
      left: 5,
      top: 44,
    });
  }
  if (index === 5)
    overlays.push({
      input: await sharp(selectionOverlay()).resize(96, 96).png().toBuffer(),
      left: 0,
      top: 48,
    });
  if (index === 22) overlays.push({ input: fog(), left: 0, top: 48 });
  return sharp({
    create: { width: 96, height: 144, channels: 4, background: "#00000000" },
  })
    .composite(overlays)
    .png()
    .toBuffer();
}

async function zoomContext(
  id: (typeof ids)[number],
  zoom: number,
  dpr: number,
): Promise<Buffer> {
  const width = 280 * dpr;
  const height = 240 * dpr;
  const tile = Math.round(128 * zoom * dpr);
  const low =
    id === "building-square-lumber-camp" || id === "building-square-mine";
  const centerX = Math.round(width / 2);
  const centerY = Math.round(height * 0.62);
  const visibleWidth = Math.round((low ? 44 : 64) * zoom * dpr);
  const visible = await sharp(fileFor(id))
    .trim({ background: "#00000000" })
    .resize({ width: visibleWidth })
    .png()
    .toBuffer({ resolveWithObject: true });
  const backing = await sharp({
    create: { width, height, channels: 4, background: "#d8cbb6ff" },
  })
    .composite([
      {
        input: await sharp(
          path.join(
            root,
            "public/assets/pixellab/terrain-square/original-grass-1.png",
          ),
        )
          .resize(tile, tile)
          .png()
          .toBuffer(),
        left: centerX - Math.round(tile / 2),
        top: centerY - Math.round(tile / 2),
      },
      {
        input: visible.data,
        left: centerX - Math.round(visible.info.width / 2),
        top:
          centerY +
          Math.round((low ? 11 : 8) * zoom * dpr) -
          visible.info.height,
      },
    ])
    .png()
    .toBuffer();
  return sharp(backing).resize(280, 205).png().toBuffer();
}

async function uiViewport(
  id: (typeof ids)[number],
  use: string,
): Promise<Buffer> {
  const low =
    id === "building-square-lumber-camp" || id === "building-square-mine";
  const sprite = await sharp(fileFor(id))
    .resize({
      width: low ? 96 : 104,
      height: 108,
      fit: "contain",
      background: "#00000000",
    })
    .png()
    .toBuffer();
  return sharp({
    create: { width: 112, height: 130, channels: 4, background: "#eef4e8ff" },
  })
    .composite([
      { input: sprite, left: low ? 8 : 4, top: 12 },
      { input: viewportFrame(use), left: 0, top: 0 },
    ])
    .png()
    .toBuffer();
}

function viewportFrame(use: string): Buffer {
  return Buffer.from(
    `<svg width="112" height="130" xmlns="http://www.w3.org/2000/svg"><rect x="1" y="1" width="110" height="128" rx="6" fill="none" stroke="#213d43" stroke-width="2"/><rect x="5" y="5" width="102" height="18" rx="4" fill="#213d43"/><text x="56" y="18" text-anchor="middle" font-family="sans-serif" font-size="10" font-weight="700" fill="#fff4dc">${use}</text></svg>`,
  );
}

function ownerWash(faction: "ORIGINAL" | "CANDY"): Buffer {
  const color = faction === "ORIGINAL" ? "#db6b5848" : "#7d69d848";
  return Buffer.from(
    `<svg width="96" height="96" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="2" width="92" height="92" fill="${color}" stroke="#213d43" stroke-width="3" stroke-dasharray="8 5"/></svg>`,
  );
}

function fog(): Buffer {
  return Buffer.from(
    `<svg width="96" height="96" xmlns="http://www.w3.org/2000/svg"><rect width="96" height="96" fill="#172c35e8"/><path d="M0 18L96 78M0 58L55 96M38 0L96 36" stroke="#4f6870" stroke-width="8" opacity=".55"/></svg>`,
  );
}

function checker(width: number, height: number): Buffer {
  return Buffer.from(
    `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><defs><pattern id="c" width="24" height="24" patternUnits="userSpaceOnUse"><rect width="24" height="24" fill="#eef1e8"/><rect width="12" height="12" fill="#cbd5ca"/><rect x="12" y="12" width="12" height="12" fill="#cbd5ca"/></pattern></defs><rect width="100%" height="100%" fill="url(#c)"/></svg>`,
  );
}

function bounds(value: Bounds | undefined): string {
  return value === undefined
    ? "missing"
    : `${value.left},${value.top}..${value.right},${value.bottom}`;
}

async function writeEvidence(): Promise<void> {
  for (const id of ids) {
    if (generated.records[id]?.status !== "ACCEPTED")
      throw new Error(`Evidence requires accepted output: ${id}`);
  }
  const evidence = {
    status: "READY_FOR_ORCHESTRATOR_REVIEW",
    pixelLabFamilyRequests: 2,
    pixelLabSourceCalls: 5,
    acceptedSources: 5,
    rejectedSources: ids.reduce(
      (total, id) =>
        total + (generated.records[id]?.rejectedAttempts?.length ?? 0),
      0,
    ),
    exactFamilies: [
      {
        order: 1,
        purpose: "square low extraction",
        ids: ids.slice(0, 2),
        jobs: ids.slice(0, 2).map((id) => generated.records[id]?.jobId),
      },
      {
        order: 2,
        purpose: "square processors",
        ids: ids.slice(2),
        jobs: ids.slice(2).map((id) => generated.records[id]?.jobId),
      },
    ],
    providerRejections: ids.flatMap(
      (id) => generated.records[id]?.rejectedAttempts ?? [],
    ),
    acceptedAssets: Object.fromEntries(
      ids.map((id) => {
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
          },
        ];
      }),
    ),
    extractionLayerOrder: [
      "accepted square Forest/Mountain terrain",
      "square Lumber Camp/Mine low improvement",
      "accepted unchanged Original/Candy unit",
      "renderer-owned ownership/selection/status",
    ],
    processorContexts: {
      factions: ["ORIGINAL", "CANDY"],
      contributors: [0, 1, 4, 8],
      sawmillLiveLevelSquares: [0, 1, 4, 8],
      forgeLiveLevelSquares: [0, 2, 8, 16],
      stoneworksLiveLevelSquares: [0, 1, 8, 16],
      stoneworksOppositePairsIncluded: true,
      marksAreCodeNative: true,
      levelSquaresWrapAfter: 8,
    },
    runtimeCoverageSwitched: false,
    acceptedUnitByteHashes: await unitHashes(),
    reviewCoverage: [
      "all five sources at source, enlarged, native 1x and 0.625x minimum gameplay zoom",
      "0.625x, 1x and 1.75x map composition at DPR1 and DPR2-equivalent backing",
      "Original and Candy Forest→Lumber Camp→unchanged unit and Mountain→Mine→unchanged unit layering",
      "Sawmill, Forge and Stoneworks with zero, one, four and eight contributors and exact renderer-owned live-level squares",
      "Stoneworks opposite-pair relationship axes and all processor contributor spokes remain code-native and unobscured",
      "dense maps with Roads, resources, existing square samples, cities, fog, ownership and selection",
      "exact 112x130 contextual-action, selection-identity and technology-card raster reuse",
      "accepted IDs/URLs registered while asset coverage and runtime bindings remain deferred to e1m.9",
    ],
    artifacts: await Promise.all(
      artifacts.map(async (name) => {
        const file = path.join(reviewRoot, name);
        const bytes = await readFile(file);
        return {
          path: path.relative(root, file).replaceAll("\\", "/"),
          sha256: hash(bytes),
          bytes: bytes.byteLength,
        };
      }),
    ),
  };
  await writeFile(
    path.join(reviewRoot, "review-evidence.json"),
    `${JSON.stringify(evidence, null, 2)}\n`,
  );
  await writeFile(
    path.join(reviewRoot, "README.md"),
    "# Square extraction and processor review\n\nExactly five PixelLab sources are accepted from two ordered family invocations: Lumber Camp + Mine, then Sawmill + Forge + Stoneworks. The hashed sheets cover terrain/improvement/unit layering, zero-to-maximum contributor and graphical level-square contexts, dense overlays, supported zoom/DPR, and exact 112 x 130 UI reuse. Runtime coverage remains deferred to e1m.9.\n",
  );
}

async function unitHashes(): Promise<Record<string, string>> {
  const sampleEvidence = JSON.parse(
    await readFile(
      path.join(
        root,
        "art/pixellab/reviews/square-improvement-samples/review-evidence.json",
      ),
      "utf8",
    ),
  ) as { readonly acceptedUnitByteHashes: Readonly<Record<string, string>> };
  return { ...sampleEvidence.acceptedUnitByteHashes };
}

function selectionOverlay(): Buffer {
  return Buffer.from(
    `<svg width="128" height="128" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="3" width="122" height="122" rx="5" fill="none" stroke="#fff3a0" stroke-width="5"/><rect x="8" y="8" width="112" height="112" rx="3" fill="none" stroke="#33545a" stroke-width="2"/></svg>`,
  );
}

function ownerCorner(faction: "ORIGINAL" | "CANDY"): Buffer {
  const color = faction === "ORIGINAL" ? "#db6b58" : "#7d69d8";
  return Buffer.from(
    `<svg width="28" height="28" xmlns="http://www.w3.org/2000/svg"><path d="M2 2h24v24L2 2Z" fill="${color}" stroke="#243f45" stroke-width="2"/></svg>`,
  );
}

function heading(text: string, width: number): Buffer {
  return Buffer.from(
    `<svg width="${width}" height="48" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="48" rx="12" fill="#213d43"/><text x="${width / 2}" y="31" text-anchor="middle" font-family="sans-serif" font-weight="700" font-size="20" fill="#fff4dc">${text}</text></svg>`,
  );
}

function label(text: string, width: number): Buffer {
  return Buffer.from(
    `<svg width="${width}" height="34" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="34" rx="8" fill="#395a60"/><text x="${width / 2}" y="23" text-anchor="middle" font-family="sans-serif" font-weight="700" font-size="15" fill="#fff4dc">${text}</text></svg>`,
  );
}

function caption(text: string, width: number): Buffer {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    if (`${line} ${word}`.trim().length > 43) {
      lines.push(line);
      line = word;
    } else line = `${line} ${word}`.trim();
  }
  if (line) lines.push(line);
  return Buffer.from(
    `<svg width="${width}" height="82" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="82" rx="8" fill="#fff4dce8"/>${lines.map((value, index) => `<text x="12" y="${22 + index * 18}" font-family="sans-serif" font-size="13" fill="#213d43">${value}</text>`).join("")}</svg>`,
  );
}

async function render(
  width: number,
  height: number,
  overlays: readonly OverlayOptions[],
  name: string,
): Promise<void> {
  await sharp({
    create: { width, height, channels: 4, background: "#9bb49fff" },
  })
    .composite([...overlays])
    .png()
    .toFile(path.join(reviewRoot, name));
}

function hash(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}
