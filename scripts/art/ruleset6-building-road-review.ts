import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import sharp, { type OverlayOptions } from "sharp";

const root = process.cwd();
const reviewRoot = path.join(
  root,
  "art/pixellab/reviews/ruleset6-buildings-roads",
);
const source = JSON.parse(
  await readFile(path.join(root, "scripts/art/pixellab-manifest.json"), "utf8"),
) as SourceManifest;
const generated = JSON.parse(
  await readFile(
    path.join(root, "scripts/art/pixellab-generated.json"),
    "utf8",
  ),
) as GeneratedManifest;
const roadManifest = JSON.parse(
  await readFile(
    path.join(root, "scripts/art/road-masks.generated.json"),
    "utf8",
  ),
) as RoadManifest;

const NEW_BUILDINGS = [
  "building-farm",
  "building-quarry",
  "building-windmill",
  "building-sawmill",
  "building-forge",
  "building-stoneworks",
  "building-workshop",
  "building-grand-works",
  "building-market",
] as const;
const INDIVIDUAL_GATE = NEW_BUILDINGS.slice(0, 3);
const BATCH_ONE = NEW_BUILDINGS.slice(3, 6);
const BATCH_TWO = NEW_BUILDINGS.slice(6, 9);
const LOW_IDS = new Set([
  "building-farm",
  "building-quarry",
  "building-mine",
  "building-lumber-mill",
  "building-chocolate-wall",
  "terrain-fruit",
  "terrain-animal",
  "terrain-ore",
  "terrain-fertile-ground",
  "terrain-stone",
]);
const recipes = new Map(source.recipes.map((recipe) => [recipe.id, recipe]));
const OWNER_COLORS = ["#f06762", "#28b7a4", "#e2b63f", "#a277d2"];

await mkdir(reviewRoot, { recursive: true });
assertReady();
await individualGateSheet();
await batchSheet();
await roadMaskSheet();
await roadCoexistenceSheet();
await aliasesAndClustersSheet();
await contributorsAndAxesSheet();
await contextMatrixSheet();
await zoomDprSheet();
await deviceSheet("desktop-native.png", 5, 1, 1);
await deviceSheet("desktop-enlarged.png", 5, 1.75, 1);
await deviceSheet("mobile-native-dpr2.png", 3, 1, 2);
await deviceSheet("mobile-enlarged-dpr2.png", 3, 1.75, 2);
await denseSheet("dense-mature-3x3.png", 3);
await denseSheet("dense-mature-5x5.png", 5);
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
  readonly preferredBounds?: Bounds;
  readonly fitBounds?: Bounds;
  readonly hardBounds: Bounds;
  readonly stage: string;
  readonly seed: number;
  readonly prompt: string;
  readonly negativePrompt: string;
}

interface SourceManifest {
  readonly aliases?: readonly {
    readonly id: string;
    readonly source: string;
    readonly semanticRole: string;
  }[];
  readonly recipes: readonly Recipe[];
}

interface GenerationRecord {
  readonly status: string;
  readonly outputSha256?: string;
  readonly alphaBounds?: Bounds;
  readonly notes?: string;
  readonly reviewChecks?: Readonly<Record<string, boolean>>;
  readonly rejectedAttempts?: readonly {
    readonly candidate: string;
    readonly candidateSha256?: string;
    readonly notes?: string;
  }[];
}

interface GeneratedManifest {
  readonly records: Readonly<Record<string, GenerationRecord>>;
}

interface RoadManifest {
  readonly algorithm: string;
  readonly deterministicProcessing: {
    readonly sourceSha256: string;
    readonly directionBitOrder: readonly string[];
    readonly emptySemantics: string;
    readonly diagonalSemantics: string;
  };
  readonly records: readonly {
    readonly id: string;
    readonly mask: number;
    readonly bits: string;
    readonly semantics: readonly string[];
    readonly output: string;
    readonly sha256: string;
    readonly alphaBounds: Bounds;
    readonly accepted: boolean;
  }[];
}

function assertReady(): void {
  for (const id of NEW_BUILDINGS) {
    const recipe = recipes.get(id);
    const record = generated.records[id];
    if (recipe === undefined || record?.status !== "ACCEPTED")
      throw new Error(`Accepted building missing: ${id}`);
    if (Object.values(record.reviewChecks ?? {}).some((value) => !value))
      throw new Error(`Incomplete review flags: ${id}`);
  }
  if (
    generated.records["building-mine"]?.status !== "ACCEPTED" ||
    generated.records["building-lumber-mill"]?.status !== "ACCEPTED"
  )
    throw new Error("Mine and Lumber Mill alias sources must be accepted");
  if (
    roadManifest.algorithm !== "orthogonal-road-mask-v1" ||
    roadManifest.records.length !== 16 ||
    roadManifest.records.some((record) => !record.accepted)
  )
    throw new Error("All 16 deterministic Road masks must be accepted");
}

async function individualGateSheet(): Promise<void> {
  const width = 1320;
  const overlays: OverlayOptions[] = [
    {
      input: title(
        "Individual building gate · source / enlarged / native / 0.625×",
        width,
      ),
      left: 0,
      top: 8,
    },
  ];
  for (const [index, id] of INDIVIDUAL_GATE.entries()) {
    const left = index * 440;
    const file = outputFor(id);
    const recipe = requiredRecipe(id);
    const record = requiredRecord(id);
    overlays.push({
      input: label(`${id} · ${record.outputSha256?.slice(0, 12)}`, 440),
      left,
      top: 64,
    });
    overlays.push({
      input: await sharp(file)
        .resize({ width: 260, height: 260, fit: "contain" })
        .png()
        .toBuffer(),
      left: left + 20,
      top: 112,
    });
    overlays.push({
      input: await sharp(file)
        .trim({ background: "#00000000" })
        .resize({
          width: 140,
          height: 140,
          fit: "contain",
          kernel: sharp.kernel.nearest,
        })
        .png()
        .toBuffer(),
      left: left + 288,
      top: 126,
    });
    overlays.push({
      input: await tileContext(id, 1, index, true, true),
      left: left + 32,
      top: 390,
    });
    overlays.push({
      input: await tileContext(id, 0.625, index, true, true),
      left: left + 260,
      top: 416,
    });
    overlays.push({
      input: caption(
        `alpha ${boundsText(record.alphaBounds)} · fit ${boundsText(recipe.fitBounds)}`,
        440,
      ),
      left,
      top: 566,
    });
  }
  await canvas(
    width,
    620,
    overlays,
    "individual-gate-source-native-enlarged-minimum.png",
  );
}

async function batchSheet(): Promise<void> {
  const width = 1320;
  const overlays: OverlayOptions[] = [
    {
      input: title("Bounded coherent batches · every member inspected", width),
      left: 0,
      top: 8,
    },
  ];
  for (const [row, ids] of [BATCH_ONE, BATCH_TWO].entries()) {
    overlays.push({
      input: rowTitle(
        row === 0
          ? "BATCH 1 · Sawmill / Forge / Stoneworks"
          : "BATCH 2 · Workshop / Grand Works / Market",
        width,
      ),
      left: 0,
      top: 66 + row * 390,
    });
    for (const [column, id] of ids.entries()) {
      const left = column * 440;
      overlays.push({ input: label(id, 440), left, top: 106 + row * 390 });
      overlays.push({
        input: await sharp(outputFor(id))
          .resize({ width: 244, height: 244, fit: "contain" })
          .png()
          .toBuffer(),
        left: left + 12,
        top: 148 + row * 390,
      });
      overlays.push({
        input: await tileContext(id, 0.625, column + row, true, false),
        left: left + 272,
        top: 210 + row * 390,
      });
      overlays.push({
        input: caption(
          `${boundsText(requiredRecord(id).alphaBounds)} · ${requiredRecord(id).outputSha256?.slice(0, 12)}`,
          440,
        ),
        left,
        top: 430 + row * 390,
      });
    }
  }
  await canvas(width, 884, overlays, "bounded-batches-contact-sheet.png");
}

async function roadMaskSheet(): Promise<void> {
  const width = 1080;
  const overlays: OverlayOptions[] = [
    {
      input: title(
        "All 16 deterministic orthogonal Road masks · N/E/S/W bits",
        width,
      ),
      left: 0,
      top: 8,
    },
  ];
  const grass = await resized("terrain-grass-1", 192, 111);
  for (const [index, record] of roadManifest.records.entries()) {
    const column = index % 4;
    const row = Math.floor(index / 4);
    const left = column * 270;
    const top = 70 + row * 184;
    overlays.push({ input: grass, left: left + 39, top: top + 30 });
    overlays.push({
      input: await sharp(path.join(root, record.output))
        .resize({ width: 192, height: 111, fit: "fill" })
        .png()
        .toBuffer(),
      left: left + 39,
      top: top + 30,
    });
    overlays.push({
      input: label(
        `${record.bits} · ${record.semantics.join("/") || "ISOLATED"}`,
        270,
      ),
      left,
      top,
    });
    overlays.push({
      input: caption(record.sha256.slice(0, 12), 270),
      left,
      top: top + 144,
    });
  }
  await canvas(width, 820, overlays, "road-mask-sheet.png");
}

async function roadCoexistenceSheet(): Promise<void> {
  const width = 1320;
  const contexts = [
    ["Fruit", "terrain-fruit"],
    ["GAME / Forest", "terrain-animal"],
    ["Ore / Mountain", "terrain-ore"],
    ["Fertile Ground", "terrain-fertile-ground"],
    ["Stone / Mountain", "terrain-stone"],
    ["Mine", "building-mine"],
    ["Lumber Camp", "building-lumber-mill"],
    ["Chocolate Wall", "building-chocolate-wall"],
    ["Occupied", "unit-warrior"],
    ["Selected", "selection"],
  ] as const;
  const overlays: OverlayOptions[] = [
    {
      input: title(
        "Road coexistence · resources / improvements / Wall / unit / selection",
        width,
      ),
      left: 0,
      top: 8,
    },
  ];
  for (const [index, [name, id]] of contexts.entries()) {
    const column = index % 5;
    const row = Math.floor(index / 5);
    const left = column * 264;
    const top = 72 + row * 230;
    overlays.push({
      input: await tileContextWithRoad(id, (index * 5) % 16, index),
      left: left + 34,
      top: top + 34,
    });
    overlays.push({ input: label(name, 264), left, top });
  }
  await canvas(width, 560, overlays, "road-coexistence-contexts.png");
}

async function aliasesAndClustersSheet(): Promise<void> {
  const width = 1320;
  const overlays: OverlayOptions[] = [
    {
      input: title(
        "Revalidated aliases and renderer-owned merged clusters",
        width,
      ),
      left: 0,
      top: 8,
    },
  ];
  overlays.push({
    input: await clusterPanel(
      "building-farm",
      "FARM\nsame-city merged field",
      "#e6bd43",
    ),
    left: 20,
    top: 80,
  });
  overlays.push({
    input: await clusterPanel(
      "building-lumber-mill",
      "LUMBER CAMP alias\nconnected Forest cluster",
      "#58a66a",
    ),
    left: 450,
    top: 80,
  });
  overlays.push({ input: await aliasPanel(), left: 880, top: 80 });
  await canvas(width, 600, overlays, "aliases-and-merged-clusters.png");
}

async function contributorsAndAxesSheet(): Promise<void> {
  const width = 1400;
  const overlays: OverlayOptions[] = [
    {
      input: title(
        "Processor contexts · zero→maximum contributors / cross-city / all Stoneworks axes",
        width,
      ),
      left: 0,
      top: 8,
    },
  ];
  const panels = [
    ["building-windmill", "building-farm", "0 → 8 FARM CLUSTER"],
    ["building-sawmill", "building-lumber-mill", "0 → 8 CAMP CLUSTER"],
    ["building-forge", "building-mine", "0 → 8 ADJACENT MINES"],
  ] as const;
  for (const [index, [processorId, contributorId, name]] of panels.entries())
    overlays.push({
      input: await contributorPanel(processorId, contributorId, name, index),
      left: 12 + index * 458,
      top: 76,
    });
  overlays.push({ input: await stoneAxesPanel(), left: 240, top: 600 });
  overlays.push({ input: await mixedPanel(), left: 760, top: 600 });
  await canvas(width, 1120, overlays, "contributors-clusters-pair-axes.png");
}

async function contextMatrixSheet(): Promise<void> {
  const width = 1360;
  const overlays: OverlayOptions[] = [
    {
      input: title(
        "Every building · all owners / occupied / selected / fog edge / labels",
        width,
      ),
      left: 0,
      top: 8,
    },
  ];
  for (const [row, id] of NEW_BUILDINGS.entries()) {
    overlays.push({ input: label(id, 240), left: 0, top: 66 + row * 136 });
    for (let owner = 0; owner < 4; owner += 1) {
      const selected = owner === 1 || owner === 3;
      const occupied = owner >= 2;
      overlays.push({
        input: await tileContext(id, 0.625, owner, selected, occupied),
        left: 250 + owner * 252,
        top: 66 + row * 136,
      });
      overlays.push({
        input: columnCaption(
          `owner ${owner + 1}${selected ? " · selected" : ""}${occupied ? " · occupied" : ""}`,
          252,
        ),
        left: 250 + owner * 252,
        top: 170 + row * 136,
      });
    }
  }
  await canvas(width, 1320, overlays, "owners-selection-fog-occupied.png");
}

async function zoomDprSheet(): Promise<void> {
  const width = 1440;
  const overlays: OverlayOptions[] = [
    {
      input: title("0.625× / 1× / 1.75× · DPR1/DPR2 equivalence", width),
      left: 0,
      top: 8,
    },
  ];
  const ids = [
    "building-farm",
    "building-windmill",
    "building-stoneworks",
    "building-workshop",
    "building-grand-works",
    "building-market",
  ];
  for (const [column, zoom] of [0.625, 1, 1.75].entries()) {
    overlays.push({
      input: label(`${zoom}× · DPR1`, 240),
      left: column * 480,
      top: 66,
    });
    overlays.push({
      input: label(`${zoom}× · DPR2 backing`, 240),
      left: column * 480 + 240,
      top: 66,
    });
    for (const [row, id] of ids.entries()) {
      const context = await tileContext(
        id,
        zoom,
        row % 4,
        row % 2 === 0,
        row % 3 === 0,
      );
      overlays.push({
        input: context,
        left: column * 480,
        top: 108 + row * 250,
      });
      overlays.push({
        input: await sharp(context)
          .resize({ width: 384, height: 296, fit: "fill" })
          .resize({ width: 192, height: 148, fit: "fill" })
          .png()
          .toBuffer(),
        left: column * 480 + 288,
        top: 108 + row * 250,
      });
    }
  }
  await canvas(width, 1660, overlays, "zoom-dpr-review.png");
}

async function deviceSheet(
  filename: string,
  size: number,
  zoom: number,
  dpr: number,
): Promise<void> {
  const display = await matureMap(size, zoom, true);
  const width = Math.max(
    Math.round((size === 3 ? 720 : 1160) * dpr),
    Math.round(display.info.width * dpr),
  );
  const height = Math.max(
    Math.round((size === 3 ? 660 : 860) * dpr),
    Math.round(display.info.height * dpr + 64),
  );
  const rendered = await sharp(display.data)
    .resize({
      width: Math.round(display.info.width * dpr),
      height: Math.round(display.info.height * dpr),
      fit: "fill",
    })
    .png()
    .toBuffer();
  await sharp({ create: { width, height, channels: 4, background: "#203332" } })
    .composite([
      {
        input: title(
          `${size === 3 ? "mobile" : "desktop"} · ${zoom}× · DPR${dpr}`,
          width,
        ),
        left: 0,
        top: 8,
      },
      {
        input: rendered,
        left: Math.max(0, Math.floor((width - display.info.width * dpr) / 2)),
        top: 64,
      },
    ])
    .png()
    .toFile(path.join(reviewRoot, filename));
}

async function denseSheet(filename: string, size: number): Promise<void> {
  const map = await matureMap(size, 0.625, true);
  await sharp({
    create: {
      width: map.info.width,
      height: map.info.height + 64,
      channels: 4,
      background: "#203332",
    },
  })
    .composite([
      {
        input: label(
          `${size}×${size} dense mature economy · 0.625× minimum zoom`,
          map.info.width,
        ),
        left: 0,
        top: 8,
      },
      { input: map.data, left: 0, top: 64 },
    ])
    .png()
    .toFile(path.join(reviewRoot, filename));
}

async function matureMap(
  size: number,
  zoom: number,
  includeUi: boolean,
): Promise<{
  readonly data: Buffer;
  readonly info: { readonly width: number; readonly height: number };
}> {
  const tileW = Math.round(128 * zoom);
  const tileH = Math.round(74 * zoom);
  const width = Math.max(660, Math.round((size + 2) * tileW));
  const height = Math.max(520, Math.round((size + 4) * tileH));
  const origin = { x: Math.round(width / 2), y: Math.round(92 * zoom + 30) };
  const grounds: OverlayOptions[] = [];
  const bodies: Array<{
    readonly depth: number;
    readonly tie: number;
    readonly overlay: OverlayOptions;
  }> = [];
  for (let y = 0; y < size; y += 1)
    for (let x = 0; x < size; x += 1) {
      const center = mapCenter(origin, x, y, zoom);
      const index = y * size + x;
      const id = NEW_BUILDINGS[index % NEW_BUILDINGS.length] ?? "building-farm";
      grounds.push({
        input: await resized(`terrain-grass-${(index % 4) + 1}`, tileW, tileH),
        left: center.x - tileW / 2,
        top: center.y - tileH / 2,
      });
      grounds.push({
        input: ownershipDiamond(tileW, tileH, index % 4),
        left: center.x - tileW / 2,
        top: center.y - tileH / 2,
      });
      const placement = await placedAsset(id, zoom);
      bodies.push({
        depth: x + y,
        tie: 20,
        overlay: {
          input: placement.image,
          left: center.x - placement.anchorX,
          top: center.y - placement.anchorY,
        },
      });
      if (includeUi && index % 3 === 0)
        bodies.push({
          depth: x + y,
          tie: 40,
          overlay: {
            input: contributorRing(Math.round(44 * zoom), "#ffe36d"),
            left: center.x - Math.round(22 * zoom),
            top: center.y - Math.round(22 * zoom),
          },
        });
      if (includeUi && index % 4 === 0)
        bodies.push({
          depth: x + y,
          tie: 50,
          overlay: {
            input: valueChip(`+${(index % 8) + 1}`, zoom),
            left: center.x + Math.round(18 * zoom),
            top: center.y - Math.round(48 * zoom),
          },
        });
    }
  bodies.sort((a, b) => a.depth - b.depth || a.tie - b.tie);
  const data = await sharp({
    create: { width, height, channels: 4, background: "#203332" },
  })
    .composite([...grounds, ...bodies.map(({ overlay }) => overlay)])
    .png()
    .toBuffer();
  return { data, info: { width, height } };
}

async function tileContext(
  id: string,
  zoom: number,
  owner: number,
  selected: boolean,
  occupied: boolean,
): Promise<Buffer> {
  const width = Math.max(192, Math.ceil(160 * zoom));
  const height = Math.max(148, Math.ceil(160 * zoom));
  const tileW = Math.round(128 * zoom);
  const tileH = Math.round(74 * zoom);
  const center = { x: Math.round(width / 2), y: Math.round(height * 0.65) };
  const overlays: OverlayOptions[] = [
    {
      input: fogDiamond(tileW, tileH),
      left: center.x,
      top: center.y - tileH,
    },
    {
      input: await resized("terrain-grass-1", tileW, tileH),
      left: center.x - tileW / 2,
      top: center.y - tileH / 2,
    },
    {
      input: ownershipDiamond(tileW, tileH, owner),
      left: center.x - tileW / 2,
      top: center.y - tileH / 2,
    },
  ];
  const placement = await placedAsset(id, zoom);
  overlays.push({
    input: placement.image,
    left: center.x - placement.anchorX,
    top: center.y - placement.anchorY,
  });
  if (occupied) {
    const unit = await resized(
      "unit-warrior",
      Math.round(64 * zoom),
      Math.round(74 * zoom),
    );
    overlays.push({
      input: unit,
      left: center.x - Math.round(32 * zoom),
      top: center.y - Math.round(56 * zoom),
    });
  }
  if (selected)
    overlays.push({
      input: selectionDiamond(tileW, tileH),
      left: center.x - tileW / 2,
      top: center.y - tileH / 2,
    });
  overlays.push({
    input: valueChip("+4", Math.max(0.625, zoom)),
    left: center.x + Math.round(18 * zoom),
    top: center.y - Math.round(48 * zoom),
  });
  return sharp({
    create: { width, height, channels: 4, background: "#233b39" },
  })
    .composite(overlays)
    .png()
    .toBuffer();
}

async function tileContextWithRoad(
  id: string,
  mask: number,
  owner: number,
): Promise<Buffer> {
  const width = 196;
  const height = 154;
  const center = { x: 98, y: 100 };
  const overlays: OverlayOptions[] = [
    {
      input: await resized("terrain-grass-2", 128, 74),
      left: center.x - 64,
      top: center.y - 37,
    },
    {
      input: ownershipDiamond(128, 74, owner % 4),
      left: center.x - 64,
      top: center.y - 37,
    },
    {
      input: await sharp(
        path.join(
          root,
          roadManifest.records[mask]?.output ??
            roadManifest.records[0]?.output ??
            "",
        ),
      )
        .resize({ width: 128, height: 74, fit: "fill" })
        .png()
        .toBuffer(),
      left: center.x - 64,
      top: center.y - 37,
    },
  ];
  if (id === "terrain-animal") {
    const forest = await resized("terrain-forest-1", 96, 111);
    overlays.push({ input: forest, left: center.x - 48, top: center.y - 83 });
  }
  if (id === "terrain-ore" || id === "terrain-stone") {
    const mountain = await resized("terrain-mountain-1", 81, 93);
    overlays.push({ input: mountain, left: center.x - 41, top: center.y - 56 });
  }
  if (id === "selection")
    overlays.push({
      input: selectionDiamond(128, 74),
      left: center.x - 64,
      top: center.y - 37,
    });
  else if (id.startsWith("unit-")) {
    const unit = await resized(id, 48, 56);
    overlays.push({ input: unit, left: center.x - 24, top: center.y - 42 });
  } else {
    const placement = await placedAsset(id, 0.75);
    overlays.push({
      input: placement.image,
      left: center.x - placement.anchorX,
      top: center.y - placement.anchorY,
    });
  }
  return sharp({
    create: { width, height, channels: 4, background: "#233b39" },
  })
    .composite(overlays)
    .png()
    .toBuffer();
}

async function clusterPanel(
  id: string,
  heading: string,
  color: string,
): Promise<Buffer> {
  const width = 410;
  const height = 480;
  const overlays: OverlayOptions[] = [
    { input: rowTitle(heading, width), left: 0, top: 4 },
  ];
  const positions = [
    [1, 0],
    [0, 1],
    [1, 1],
    [2, 1],
    [1, 2],
  ] as const;
  const origin = { x: 205, y: 92 };
  for (const [index, [x, y]] of positions.entries()) {
    const center = mapCenter(origin, x, y, 0.75);
    overlays.push({
      input: await resized(`terrain-grass-${(index % 4) + 1}`, 96, 56),
      left: center.x - 48,
      top: center.y - 28,
    });
    const placed = await placedAsset(id, 0.75);
    overlays.push({
      input: placed.image,
      left: center.x - placed.anchorX,
      top: center.y - placed.anchorY,
    });
  }
  overlays.push({ input: clusterOutline(color), left: 60, top: 62 });
  return sharp({
    create: { width, height, channels: 4, background: "#263b3a" },
  })
    .composite(overlays)
    .png()
    .toBuffer();
}

async function aliasPanel(): Promise<Buffer> {
  const width = 410,
    height = 480;
  const overlays: OverlayOptions[] = [
    {
      input: rowTitle("ALIASES · no duplicate raster", width),
      left: 0,
      top: 4,
    },
  ];
  overlays.push({
    input: await tileContext("building-mine", 0.75, 0, true, true),
    left: 10,
    top: 64,
  });
  overlays.push({
    input: await tileContext("building-lumber-mill", 0.75, 1, true, true),
    left: 208,
    top: 64,
  });
  overlays.push({
    input: caption(
      "building-ruleset6-mine → building-mine\nbuilding-lumber-camp → building-lumber-mill",
      width,
    ),
    left: 0,
    top: 270,
  });
  overlays.push({
    input: caption(
      `${requiredRecord("building-mine").outputSha256?.slice(0, 12)}\n${requiredRecord("building-lumber-mill").outputSha256?.slice(0, 12)}`,
      width,
    ),
    left: 0,
    top: 348,
  });
  return sharp({
    create: { width, height, channels: 4, background: "#263b3a" },
  })
    .composite(overlays)
    .png()
    .toBuffer();
}

async function contributorPanel(
  processorId: string,
  contributorId: string,
  heading: string,
  owner: number,
): Promise<Buffer> {
  const width = 440,
    height = 500,
    origin = { x: 220, y: 104 };
  const overlays: OverlayOptions[] = [
    { input: rowTitle(heading, width), left: 0, top: 4 },
    { input: label("MAXIMUM · 8 highlighted", width), left: 0, top: 44 },
  ];
  const positions = [
    [-1, -1],
    [0, -1],
    [1, -1],
    [-1, 0],
    [1, 0],
    [-1, 1],
    [0, 1],
    [1, 1],
  ] as const;
  for (const [x, y] of positions) {
    const center = mapCenter(origin, x + 1, y + 1, 0.7);
    overlays.push({
      input: await resized("terrain-grass-1", 90, 52),
      left: center.x - 45,
      top: center.y - 26,
    });
    const placed = await placedAsset(contributorId, 0.7);
    overlays.push({
      input: placed.image,
      left: center.x - placed.anchorX,
      top: center.y - placed.anchorY,
    });
    overlays.push({
      input: contributorRing(34, "#ffe36d"),
      left: center.x - 17,
      top: center.y - 17,
    });
  }
  const center = mapCenter(origin, 1, 1, 0.7),
    processor = await placedAsset(processorId, 0.7);
  overlays.push({
    input: ownershipDiamond(90, 52, owner),
    left: center.x - 45,
    top: center.y - 26,
  });
  overlays.push({
    input: processor.image,
    left: center.x - processor.anchorX,
    top: center.y - processor.anchorY,
  });
  overlays.push({
    input: valueChip("+8", 0.8),
    left: center.x + 18,
    top: center.y - 58,
  });
  overlays.push({
    input: label("ZERO contributors", 210),
    left: 0,
    top: 302,
  });
  overlays.push({
    input: await tileContext(processorId, 0.625, owner, false, false),
    left: 9,
    top: 336,
  });
  overlays.push({
    input: columnCaption("function readable at zero and maximum", 220),
    left: 210,
    top: 414,
  });
  return sharp({
    create: { width, height, channels: 4, background: "#263b3a" },
  })
    .composite(overlays)
    .png()
    .toBuffer();
}

async function stoneAxesPanel(): Promise<Buffer> {
  const width = 500,
    height = 470,
    center = { x: 250, y: 238 };
  const overlays: OverlayOptions[] = [
    {
      input: rowTitle("STONEWORKS · all four opposite-pair axes", width),
      left: 0,
      top: 4,
    },
  ];
  const placed = await placedAsset("building-stoneworks", 0.85);
  overlays.push({
    input: await resized("terrain-grass-1", 109, 63),
    left: center.x - 54,
    top: center.y - 31,
  });
  overlays.push({
    input: placed.image,
    left: center.x - placed.anchorX,
    top: center.y - placed.anchorY,
  });
  const axes = [
    [-126, 0, 126, 0],
    [-63, -74, 63, 74],
    [0, -102, 0, 102],
    [-63, 74, 63, -74],
  ] as const;
  for (const [x1, y1, x2, y2] of axes)
    overlays.push({
      input: axisSvg(
        width,
        height,
        center.x + x1,
        center.y + y1,
        center.x + x2,
        center.y + y2,
      ),
      left: 0,
      top: 0,
    });
  overlays.push({
    input: valueChip("+8", 1),
    left: center.x + 34,
    top: center.y - 96,
  });
  return sharp({
    create: { width, height, channels: 4, background: "#263b3a" },
  })
    .composite(overlays)
    .png()
    .toBuffer();
}

async function mixedPanel(): Promise<Buffer> {
  const width = 500,
    height = 470;
  const overlays: OverlayOptions[] = [
    {
      input: rowTitle(
        "WORKSHOP / GRAND WORKS / MARKET\ncross-city diversity",
        width,
      ),
      left: 0,
      top: 4,
    },
  ];
  for (const [index, id] of [
    "building-workshop",
    "building-grand-works",
    "building-market",
  ].entries()) {
    overlays.push({
      input: await tileContext(id, 0.75, index, true, index === 2),
      left: 10 + index * 162,
      top: 86,
    });
    overlays.push({
      input: valueChip(index === 0 ? "+4" : "+8", 0.8),
      left: 102 + index * 162,
      top: 102,
    });
  }
  overlays.push({
    input: axisSvg(width, height, 45, 360, 455, 360, "#f06762"),
    left: 0,
    top: 0,
  });
  overlays.push({
    input: caption(
      "territory boundary + family/value chips + processor links remain code-native",
      width,
    ),
    left: 0,
    top: 382,
  });
  return sharp({
    create: { width, height, channels: 4, background: "#263b3a" },
  })
    .composite(overlays)
    .png()
    .toBuffer();
}

async function placedAsset(
  id: string,
  zoom: number,
): Promise<{
  readonly image: Buffer;
  readonly anchorX: number;
  readonly anchorY: number;
}> {
  const low = LOW_IDS.has(id);
  const width = Math.round((low ? 128 : 115.2) * zoom);
  const height = Math.round((low ? 148 : 115.2) * zoom);
  return {
    image: await resized(id, width, height),
    anchorX: Math.round((low ? 64 : 57.6) * zoom),
    anchorY: Math.round((low ? 111 : 86.4) * zoom),
  };
}

async function resized(
  id: string,
  width: number,
  height: number,
): Promise<Buffer> {
  return sharp(outputFor(id))
    .resize({ width, height, fit: "fill" })
    .png()
    .toBuffer();
}

function outputFor(id: string): string {
  const recipe = requiredRecipe(id);
  return path.join(root, recipe.output);
}

function requiredRecipe(id: string): Recipe {
  const recipe = recipes.get(id);
  if (recipe === undefined) throw new Error(`Recipe missing: ${id}`);
  return recipe;
}

function requiredRecord(id: string): GenerationRecord {
  const record = generated.records[id];
  if (record === undefined) throw new Error(`Record missing: ${id}`);
  return record;
}

function mapCenter(
  origin: { readonly x: number; readonly y: number },
  x: number,
  y: number,
  scale: number,
): { readonly x: number; readonly y: number } {
  return {
    x: Math.round(origin.x + (x - y) * 64 * scale),
    y: Math.round(origin.y + (x + y) * 37 * scale),
  };
}

function ownershipDiamond(
  width: number,
  height: number,
  owner: number,
): Buffer {
  const color = OWNER_COLORS[owner % 4] ?? OWNER_COLORS[0] ?? "#fff";
  return Buffer.from(
    `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><polygon points="${width / 2},1 ${width - 1},${height / 2} ${width / 2},${height - 1} 1,${height / 2}" fill="${color}" fill-opacity=".13" stroke="${color}" stroke-width="3"/></svg>`,
  );
}

function selectionDiamond(width: number, height: number): Buffer {
  return Buffer.from(
    `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><polygon points="${width / 2},2 ${width - 2},${height / 2} ${width / 2},${height - 2} 2,${height / 2}" fill="#48e9f1" fill-opacity=".1" stroke="#75f7ff" stroke-width="4"/></svg>`,
  );
}

function fogDiamond(width: number, height: number): Buffer {
  return Buffer.from(
    `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><polygon points="${width / 2},1 ${width - 1},${height / 2} ${width / 2},${height - 1} 1,${height / 2}" fill="#263638" stroke="#18282b" stroke-width="3"/><path d="M${width * 0.25} ${height * 0.58} L${width * 0.48} ${height * 0.28}" stroke="#5c6b6c" stroke-width="3" stroke-dasharray="5 4"/></svg>`,
  );
}

function contributorRing(size: number, color: string): Buffer {
  return Buffer.from(
    `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 3}" fill="none" stroke="${color}" stroke-width="4" stroke-dasharray="6 3"/></svg>`,
  );
}

function valueChip(value: string, zoom: number): Buffer {
  const width = Math.round(40 * Math.max(0.75, zoom)),
    height = Math.round(24 * Math.max(0.75, zoom));
  return Buffer.from(
    `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><rect x="1" y="1" width="${width - 2}" height="${height - 2}" rx="${height / 2}" fill="#172627" stroke="#ffe36d" stroke-width="2"/><text x="${width / 2}" y="${height * 0.69}" text-anchor="middle" font-family="sans-serif" font-size="${Math.round(13 * Math.max(0.75, zoom))}" font-weight="800" fill="#fff5bd">${value}</text></svg>`,
  );
}

function clusterOutline(color: string): Buffer {
  return Buffer.from(
    `<svg width="290" height="300" xmlns="http://www.w3.org/2000/svg"><path d="M145 20 L265 85 L245 220 L145 282 L42 220 L25 85 Z" fill="none" stroke="${color}" stroke-width="6" stroke-dasharray="10 6"/></svg>`,
  );
}

function axisSvg(
  width: number,
  height: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: "#ffe36d" | "#f06762" = "#ffe36d",
): Buffer {
  return Buffer.from(
    `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="4" stroke-dasharray="8 5"/></svg>`,
  );
}

function title(value: string, width: number): Buffer {
  return textSvg(value, width, 48, 26, "#f5efe2", 800);
}
function rowTitle(value: string, width: number): Buffer {
  return textSvg(value, width, 40, 18, "#ffe36d", 800);
}
function label(value: string, width: number): Buffer {
  return textSvg(value, width, 38, 16, "#f5efe2", 700);
}
function caption(value: string, width: number): Buffer {
  return textSvg(value, width, 62, 13, "#cbdad5", 600);
}
function columnCaption(value: string, width: number): Buffer {
  return textSvg(value, width, 34, 12, "#cbdad5", 600);
}
function textSvg(
  value: string,
  width: number,
  height: number,
  fontSize: number,
  color: string,
  weight: number,
): Buffer {
  const lines = value.split("\n");
  return Buffer.from(
    `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">${lines.map((line, index) => `<text x="${width / 2}" y="${Math.round(((index + 1) * height) / (lines.length + 1) + fontSize / 3)}" text-anchor="middle" font-family="sans-serif" font-size="${fontSize}" font-weight="${weight}" fill="${color}">${escapeXml(line)}</text>`).join("")}</svg>`,
  );
}

function boundsText(bounds: Bounds | undefined): string {
  return bounds === undefined
    ? "missing"
    : `${bounds.left},${bounds.top}..${bounds.right},${bounds.bottom}`;
}
function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

async function canvas(
  width: number,
  height: number,
  overlays: OverlayOptions[],
  filename: string,
): Promise<void> {
  await sharp({ create: { width, height, channels: 4, background: "#203332" } })
    .composite(overlays)
    .png()
    .toFile(path.join(reviewRoot, filename));
}

async function writeEvidence(): Promise<void> {
  const artifactNames = [
    "individual-gate-source-native-enlarged-minimum.png",
    "bounded-batches-contact-sheet.png",
    "road-mask-sheet.png",
    "road-coexistence-contexts.png",
    "aliases-and-merged-clusters.png",
    "contributors-clusters-pair-axes.png",
    "owners-selection-fog-occupied.png",
    "zoom-dpr-review.png",
    "desktop-native.png",
    "desktop-enlarged.png",
    "mobile-native-dpr2.png",
    "mobile-enlarged-dpr2.png",
    "dense-mature-3x3.png",
    "dense-mature-5x5.png",
  ];
  const readme = `# Ruleset 6 buildings and Roads review\n\nNine new economic buildings are accepted after the required three individual gates and two bounded batches. Quarry attempt one is quarantined because its paved base and excess blocks obscured the semantic distinction; the targeted retry passed. Mine and Lumber Camp are aliases of the accepted Mine and Lumber Mill sources, with no duplicate raster.\n\nAll 16 Road masks are deterministic outputs of the accepted Road material. Bit order is N/E/S/W; no Road entry means no overlay and 0000 is an isolated center pad. No diagonal joins exist.\n\nThe checked-in sheets cover source/native/enlarged/minimum scale, 0.625/1/1.75, DPR1/2, desktop/mobile, all owners, selection, fog-edge composition, occupied tiles, zero-to-maximum contributors, merged Farm/Camp clusters, all four Stoneworks axes, cross-city boundaries, resource/Wall coexistence, and dense 3x3/5x5 mature layouts. Processor links, cluster outlines, pair axes, family/value chips and Road state remain code-native.\n`;
  await writeFile(path.join(reviewRoot, "README.md"), readme, "utf8");
  const artifacts = [];
  for (const name of ["README.md", ...artifactNames]) {
    const data = await readFile(path.join(reviewRoot, name));
    artifacts.push({
      path: `art/pixellab/reviews/ruleset6-buildings-roads/${name}`,
      sha256: sha256(data),
      bytes: data.byteLength,
    });
  }
  const sampleGate = Object.fromEntries(
    NEW_BUILDINGS.map((id) => {
      const record = requiredRecord(id);
      return [
        id,
        {
          status: record.status,
          outputSha256: record.outputSha256,
          alphaBounds: record.alphaBounds,
          reviewChecks: record.reviewChecks,
          notes: record.notes,
          rejectedAttempts: record.rejectedAttempts ?? [],
        },
      ];
    }),
  );
  const aliases = (source.aliases ?? [])
    .filter(
      (alias) =>
        alias.id === "building-ruleset6-mine" ||
        alias.id === "building-lumber-camp",
    )
    .map((alias) => ({
      ...alias,
      sourceOutputSha256: requiredRecord(alias.source).outputSha256,
    }));
  const evidence = {
    schemaVersion: 1,
    status: "READY_FOR_ORCHESTRATOR_REVIEW",
    blocker: null,
    requiredCoverage: [
      "source/native/enlarged and 0.625x individual inspection",
      "bounded batch-one and batch-two contact sheets",
      "0.625x/1x/1.75x at DPR1/2",
      "desktop and mobile native/enlarged",
      "all four owners, selection, fog-edge and occupied tiles",
      "zero through maximum contributors, merged Farm/Camp clusters and all four Stoneworks axes",
      "cross-city/territory, resource, Chocolate Wall and Road coexistence",
      "dense mature 3x3 and 5x5 layouts",
    ],
    sampleGate,
    aliases,
    roadMasks: {
      status: "ACCEPTED",
      algorithm: roadManifest.algorithm,
      sourceSha256: roadManifest.deterministicProcessing.sourceSha256,
      directionBitOrder: roadManifest.deterministicProcessing.directionBitOrder,
      emptySemantics: roadManifest.deterministicProcessing.emptySemantics,
      diagonalSemantics: roadManifest.deterministicProcessing.diagonalSemantics,
      records: roadManifest.records,
    },
    quarantines: requiredRecord("building-quarry").rejectedAttempts ?? [],
    artifacts,
  };
  await writeFile(
    path.join(reviewRoot, "review-evidence.json"),
    `${JSON.stringify(evidence, null, 2)}\n`,
    "utf8",
  );
}

function sha256(data: Buffer): string {
  return createHash("sha256").update(data).digest("hex");
}
