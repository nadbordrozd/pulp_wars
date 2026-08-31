import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp, { type OverlayOptions } from "sharp";
import {
  BOARD_ART_GEOMETRY,
  MOUNTAIN_ART_GEOMETRY,
  PLACEMENT_ART_GEOMETRY,
  SETTLEMENT_ART_GEOMETRY,
  UNIT_SCALE_CONTRACT,
  type SourceGeometry,
} from "../../src/render/canvas/board-art-geometry";

interface Bounds {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

interface GeneratedRecord {
  readonly status: string;
  readonly outputSha256?: string;
  readonly alphaBounds?: Bounds;
}

interface GeneratedManifest {
  readonly records: Readonly<Record<string, GeneratedRecord>>;
}

interface AlphaAsset {
  readonly id: string;
  readonly file: string;
  readonly width: number;
  readonly height: number;
  readonly bounds: Bounds;
  readonly alpha: Uint8Array;
}

interface Measurement {
  readonly id: string;
  readonly scale: number;
  readonly offsetY: number;
  readonly visibleWidthCss: number;
  readonly visibleHeightCss: number;
  readonly visibleWidthRatio: number;
  readonly visibleHeightRatio: number;
  readonly opaqueDiamondAreaRatio: number;
  readonly adjacentOcclusionRatio: Readonly<Record<Direction, number>>;
  readonly maximumRearTileOcclusionRatio: number;
}

type Direction = "NORTH" | "EAST" | "SOUTH" | "WEST";

interface ReviewAsset {
  readonly id: string;
  readonly file: string;
  readonly geometry: SourceGeometry;
  readonly role: "STANDARD" | "SIEGE" | "TERRAIN" | "CITY";
}

const root = process.cwd();
const reviewRoot = path.join(
  root,
  "art/pixellab/reviews/unit-scale-calibration",
);
const generated = JSON.parse(
  await readFile(
    path.join(root, "scripts/art/pixellab-generated.json"),
    "utf8",
  ),
) as GeneratedManifest;

const standardAssets = [
  "unit-warrior",
  "unit-archer",
  "unit-defender",
  "unit-rider",
  "unit-candy-warrior",
  "unit-candy-gumball-guard",
  "unit-candy-choco-engineer",
  "unit-candy-donut",
] as const;
const candidateScales = {
  standard: [0.2, 0.25, 0.3],
  siege: [0.2, 0.24, 0.28],
} as const;
const directions: Readonly<
  Record<
    Direction,
    { readonly x: number; readonly y: number; readonly rear: boolean }
  >
> = {
  NORTH: { x: 64, y: -37, rear: true },
  EAST: { x: 64, y: 37, rear: false },
  SOUTH: { x: -64, y: 37, rear: false },
  WEST: { x: -64, y: -37, rear: true },
};
const assetDefinitions = new Map<string, ReviewAsset>([
  ...standardAssets.map(
    (id) =>
      [
        id,
        {
          id,
          file: `public/assets/pixellab/units/${id.replace("unit-", "")}.png`,
          geometry:
            id === "unit-candy-warrior"
              ? PLACEMENT_ART_GEOMETRY.candyWarrior
              : BOARD_ART_GEOMETRY.unit,
          role: "STANDARD" as const,
        },
      ] as const,
  ),
  [
    "unit-catapult",
    {
      id: "unit-catapult",
      file: "public/assets/pixellab/units/catapult.png",
      geometry: BOARD_ART_GEOMETRY.siegeUnit,
      role: "SIEGE",
    },
  ],
  [
    "terrain-forest-3",
    {
      id: "terrain-forest-3",
      file: "public/assets/pixellab/terrain/forest-3.png",
      geometry: PLACEMENT_ART_GEOMETRY.forest,
      role: "TERRAIN",
    },
  ],
  [
    "terrain-mountain-1",
    {
      id: "terrain-mountain-1",
      file: "public/assets/pixellab/terrain/mountain-1.png",
      geometry: MOUNTAIN_ART_GEOMETRY[0],
      role: "TERRAIN",
    },
  ],
  [
    "building-city-2",
    {
      id: "building-city-2",
      file: "public/assets/pixellab/buildings/city-2.png",
      geometry: SETTLEMENT_ART_GEOMETRY.cities[2],
      role: "CITY",
    },
  ],
]);

await mkdir(reviewRoot, { recursive: true });
const alphaAssets = new Map<string, AlphaAsset>();
for (const definition of assetDefinitions.values())
  alphaAssets.set(definition.id, await loadAcceptedAlpha(definition));

await candidateComparison(1, "candidate-scale-comparison-native.png");
await enlarged(
  "candidate-scale-comparison-native.png",
  "candidate-scale-comparison-enlarged.png",
);
await mapContext(1, "map-context-zoom-dpr1-native.png");
await enlarged(
  "map-context-zoom-dpr1-native.png",
  "map-context-zoom-dpr1-enlarged.png",
);
await mapContext(2, "map-context-zoom-dpr2-native.png");
await enlarged(
  "map-context-zoom-dpr2-native.png",
  "map-context-zoom-dpr2-enlarged.png",
);
await adjacencyAndCity(1, "adjacency-and-city-native.png");
await enlarged(
  "adjacency-and-city-native.png",
  "adjacency-and-city-enlarged.png",
);
await writeEvidence();

async function loadAcceptedAlpha(definition: ReviewAsset): Promise<AlphaAsset> {
  const record = generated.records[definition.id];
  if (record?.status !== "ACCEPTED" || record.alphaBounds === undefined)
    throw new Error(`${definition.id}: accepted generation record missing`);
  const file = path.join(root, definition.file);
  const source = await readFile(file);
  const hash = createHash("sha256").update(source).digest("hex");
  if (hash !== record.outputSha256)
    throw new Error(`${definition.id}: accepted source hash drifted`);
  const { data, info } = await sharp(source)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const alpha = new Uint8Array(info.width * info.height);
  let left = info.width;
  let top = info.height;
  let right = 0;
  let bottom = 0;
  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const sourceAlpha = data[(y * info.width + x) * info.channels + 3] ?? 0;
      alpha[y * info.width + x] = sourceAlpha;
      if (sourceAlpha === 0) continue;
      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x + 1);
      bottom = Math.max(bottom, y + 1);
    }
  }
  const measured = { left, top, right, bottom };
  if (
    measured.left !== record.alphaBounds.left ||
    measured.top !== record.alphaBounds.top ||
    measured.right !== record.alphaBounds.right ||
    measured.bottom !== record.alphaBounds.bottom
  )
    throw new Error(`${definition.id}: alpha bounds drifted from the manifest`);
  return {
    id: definition.id,
    file,
    width: info.width,
    height: info.height,
    bounds: measured,
    alpha,
  };
}

function measure(
  id: string,
  scale: number,
  offsetY = offsetForScale(id, scale),
): Measurement {
  const asset = required(alphaAssets, id);
  const definition = required(assetDefinitions, id);
  const tileArea =
    (UNIT_SCALE_CONTRACT.tile.width * UNIT_SCALE_CONTRACT.tile.height) / 2;
  let opaqueArea = 0;
  const adjacent = { NORTH: 0, EAST: 0, SOUTH: 0, WEST: 0 };
  for (let y = 0; y < asset.height; y += 1) {
    for (let x = 0; x < asset.width; x += 1) {
      const alpha = (asset.alpha[y * asset.width + x] ?? 0) / 255;
      if (alpha === 0) continue;
      const area = alpha * scale * scale;
      opaqueArea += area;
      const screenX = (x + 0.5 - definition.geometry.anchor.x) * scale;
      const screenY =
        (y + 0.5 - definition.geometry.anchor.y) * scale + offsetY;
      for (const [direction, center] of Object.entries(directions) as readonly [
        Direction,
        (typeof directions)[Direction],
      ][]) {
        if (
          Math.abs(screenX - center.x) / (UNIT_SCALE_CONTRACT.tile.width / 2) +
            Math.abs(screenY - center.y) /
              (UNIT_SCALE_CONTRACT.tile.height / 2) <=
          1
        )
          adjacent[direction] += area;
      }
    }
  }
  const adjacentOcclusionRatio = Object.fromEntries(
    (Object.entries(adjacent) as readonly [Direction, number][]).map(
      ([direction, area]) => [direction, rounded(area / tileArea, 5)],
    ),
  ) as Record<Direction, number>;
  return {
    id,
    scale,
    offsetY,
    visibleWidthCss: rounded(
      (asset.bounds.right - asset.bounds.left) * scale,
      2,
    ),
    visibleHeightCss: rounded(
      (asset.bounds.bottom - asset.bounds.top) * scale,
      2,
    ),
    visibleWidthRatio: rounded(
      ((asset.bounds.right - asset.bounds.left) * scale) /
        UNIT_SCALE_CONTRACT.tile.width,
      5,
    ),
    visibleHeightRatio: rounded(
      ((asset.bounds.bottom - asset.bounds.top) * scale) /
        UNIT_SCALE_CONTRACT.tile.height,
      5,
    ),
    opaqueDiamondAreaRatio: rounded(opaqueArea / tileArea, 5),
    adjacentOcclusionRatio,
    maximumRearTileOcclusionRatio: rounded(
      Math.max(adjacentOcclusionRatio.NORTH, adjacentOcclusionRatio.WEST),
      5,
    ),
  };
}

function offsetForScale(id: string, scale: number): number {
  return id === "unit-candy-warrior" ? rounded(30 * scale, 4) : 0;
}

async function candidateComparison(
  dpr: number,
  filename: string,
): Promise<void> {
  const width = 1480;
  const height = 810;
  const overlays: OverlayOptions[] = [];
  overlays.push({
    input: label(
      "Unit scale calibration · accepted alpha · 128×74 nominal tile",
      width,
      48,
      25,
      dpr,
      "#f8f2df",
    ),
    left: 0,
    top: 8 * dpr,
  });
  const rows = [
    {
      id: "unit-archer",
      name: "representative standard",
      scales: candidateScales.standard,
    },
    {
      id: "unit-defender",
      name: "broad standard",
      scales: candidateScales.standard,
    },
    {
      id: "unit-catapult",
      name: "accepted siege",
      scales: candidateScales.siege,
    },
  ] as const;
  for (const [rowIndex, row] of rows.entries()) {
    const top = 70 + rowIndex * 240;
    overlays.push({
      input: label(`${row.id}\n${row.name}`, 250, 76, 18, dpr, "#d9eadf"),
      left: 14 * dpr,
      top: top * dpr,
    });
    for (const [column, scale] of row.scales.entries()) {
      const chosen =
        scale ===
        (row.id === "unit-catapult"
          ? UNIT_SCALE_CONTRACT.siege.displayScale
          : UNIT_SCALE_CONTRACT.standard.displayScale);
      const left = 270 + column * 395;
      overlays.push({
        input: panel(375, 214, dpr, chosen ? "#315b4f" : "#2b4241"),
        left: left * dpr,
        top: top * dpr,
      });
      const center = { x: left + 188, y: top + 142 };
      overlays.push(await groundOverlay(center, 1, dpr, column));
      overlays.push(
        await assetOverlay(
          row.id,
          center,
          {
            ...required(assetDefinitions, row.id).geometry,
            displayScale: scale,
          },
          1,
          dpr,
        ),
      );
      const metrics = measure(row.id, scale);
      overlays.push({
        input: label(
          `${chosen ? "CHOSEN · " : ""}${scale.toFixed(2)}x source\n` +
            `${percent(metrics.visibleWidthRatio)} width · ${percent(metrics.opaqueDiamondAreaRatio)} area · ${percent(metrics.maximumRearTileOcclusionRatio)} rear`,
          365,
          50,
          15,
          dpr,
          chosen ? "#fff1a8" : "#d9eadf",
        ),
        left: (left + 5) * dpr,
        top: (top + 7) * dpr,
      });
    }
  }
  await render(width, height, dpr, overlays, filename);
}

async function mapContext(dpr: number, filename: string): Promise<void> {
  const width = 2030;
  const height = 660;
  const overlays: OverlayOptions[] = [
    {
      input: label(
        `Chosen class scales in deterministic map context · DPR${dpr}`,
        width,
        48,
        24,
        dpr,
        "#f8f2df",
      ),
      left: 0,
      top: 8 * dpr,
    },
  ];
  const zooms = [0.625, 1, 1.75] as const;
  for (const [index, zoom] of zooms.entries()) {
    const left = 20 + index * 670;
    overlays.push({
      input: panel(650, 570, dpr, "#243938"),
      left: left * dpr,
      top: 70 * dpr,
    });
    overlays.push({
      input: label(`${zoom}× camera · DPR${dpr}`, 640, 34, 17, dpr, "#fff1a8"),
      left: (left + 5) * dpr,
      top: 76 * dpr,
    });
    overlays.push(...(await mapScene({ x: left + 325, y: 355 }, zoom, dpr)));
  }
  await render(width, height, dpr, overlays, filename);
}

async function adjacencyAndCity(dpr: number, filename: string): Promise<void> {
  const width = 1500;
  const height = 690;
  const overlays: OverlayOptions[] = [
    {
      input: label(
        "Directional adjacency coverage and unit-on-city checks · chosen scales",
        width,
        48,
        24,
        dpr,
        "#f8f2df",
      ),
      left: 0,
      top: 8 * dpr,
    },
  ];
  const defender = measure(
    "unit-defender",
    UNIT_SCALE_CONTRACT.standard.displayScale,
  );
  for (const [index, [direction, delta]] of (
    Object.entries(directions) as readonly [
      Direction,
      (typeof directions)[Direction],
    ][]
  ).entries()) {
    const left = 18 + index * 365;
    const top = 68;
    overlays.push({
      input: panel(345, 300, dpr, delta.rear ? "#3b4c55" : "#2c4540"),
      left: left * dpr,
      top: top * dpr,
    });
    const center = { x: left + 172, y: top + 172 };
    const neighbor = { x: center.x + delta.x, y: center.y + delta.y };
    overlays.push(await groundOverlay(center, 1, dpr, index));
    overlays.push(await groundOverlay(neighbor, 1, dpr, index + 1));
    overlays.push(
      await assetOverlay(
        "terrain-forest-3",
        neighbor,
        PLACEMENT_ART_GEOMETRY.forest,
        1,
        dpr,
      ),
    );
    overlays.push(
      await assetOverlay(
        "unit-defender",
        center,
        BOARD_ART_GEOMETRY.unit,
        1,
        dpr,
      ),
    );
    overlays.push({
      input: diamondOutline(128, 74, dpr, "#fff1a8"),
      left: Math.round((neighbor.x - 64) * dpr),
      top: Math.round((neighbor.y - 37) * dpr),
    });
    overlays.push({
      input: label(
        `${direction}${delta.rear ? " · REAR" : " · FRONT"}\n` +
          `${percent(defender.adjacentOcclusionRatio[direction])} alpha coverage`,
        335,
        52,
        16,
        dpr,
        "#f8f2df",
      ),
      left: (left + 5) * dpr,
      top: (top + 7) * dpr,
    });
  }
  const contexts = [
    { id: "unit-archer", caption: "standard on level-2 city" },
    { id: "unit-defender", caption: "broad standard on city" },
    { id: "unit-catapult", caption: "siege reference on city" },
  ] as const;
  for (const [index, context] of contexts.entries()) {
    const left = 198 + index * 390;
    const top = 400;
    overlays.push({
      input: panel(350, 245, dpr, "#2b4241"),
      left: left * dpr,
      top: top * dpr,
    });
    const center = { x: left + 175, y: top + 152 };
    overlays.push(await groundOverlay(center, 1, dpr, index));
    overlays.push(
      await assetOverlay(
        "building-city-2",
        center,
        SETTLEMENT_ART_GEOMETRY.cities[2],
        1,
        dpr,
      ),
    );
    overlays.push(
      await assetOverlay(
        context.id,
        center,
        required(assetDefinitions, context.id).geometry,
        1,
        dpr,
      ),
    );
    overlays.push({
      input: label(context.caption, 340, 32, 16, dpr, "#fff1a8"),
      left: (left + 5) * dpr,
      top: (top + 8) * dpr,
    });
  }
  await render(width, height, dpr, overlays, filename);
}

async function mapScene(
  origin: { readonly x: number; readonly y: number },
  zoom: number,
  dpr: number,
): Promise<OverlayOptions[]> {
  const overlays: OverlayOptions[] = [];
  const objects: Array<{
    readonly depth: number;
    readonly overlays: OverlayOptions[];
  }> = [];
  const unitAt = new Map([
    ["1,0", "unit-archer"],
    ["1,1", "unit-defender"],
    ["0,1", "unit-catapult"],
    ["2,1", "unit-candy-warrior"],
  ]);
  for (let y = 0; y < 3; y += 1) {
    for (let x = 0; x < 3; x += 1) {
      const center = {
        x: origin.x + (x - y) * 64 * zoom,
        y: origin.y + (x + y - 2) * 37 * zoom,
      };
      overlays.push(await groundOverlay(center, zoom, dpr, x + y * 3));
      const tileObjects: OverlayOptions[] = [];
      const key = `${x},${y}`;
      if (key === "0,0" || key === "2,2")
        tileObjects.push(
          await assetOverlay(
            "terrain-mountain-1",
            center,
            MOUNTAIN_ART_GEOMETRY[0],
            zoom,
            dpr,
          ),
        );
      if (key === "2,0" || key === "0,2")
        tileObjects.push(
          await assetOverlay(
            "terrain-forest-3",
            center,
            PLACEMENT_ART_GEOMETRY.forest,
            zoom,
            dpr,
          ),
        );
      if (key === "1,1")
        tileObjects.push(
          await assetOverlay(
            "building-city-2",
            center,
            SETTLEMENT_ART_GEOMETRY.cities[2],
            zoom,
            dpr,
          ),
        );
      const unitId = unitAt.get(key);
      if (unitId !== undefined)
        tileObjects.push(
          await assetOverlay(
            unitId,
            center,
            required(assetDefinitions, unitId).geometry,
            zoom,
            dpr,
          ),
        );
      objects.push({ depth: center.y, overlays: tileObjects });
    }
  }
  objects.sort((left, right) => left.depth - right.depth);
  for (const object of objects) overlays.push(...object.overlays);
  return overlays;
}

async function groundOverlay(
  center: { readonly x: number; readonly y: number },
  zoom: number,
  dpr: number,
  variant: number,
): Promise<OverlayOptions> {
  const file = path.join(
    root,
    `public/assets/pixellab/terrain/grass-${(variant % 4) + 1}.png`,
  );
  const geometry = BOARD_ART_GEOMETRY.ground;
  const scale = geometry.displayScale * zoom * dpr;
  return {
    input: await sharp(file)
      .resize({
        width: Math.round(geometry.width * scale),
        height: Math.round(geometry.height * scale),
        fit: "fill",
      })
      .png()
      .toBuffer(),
    left: Math.round(center.x * dpr - geometry.anchor.x * scale),
    top: Math.round(center.y * dpr - geometry.anchor.y * scale),
  };
}

async function assetOverlay(
  id: string,
  center: { readonly x: number; readonly y: number },
  geometry: SourceGeometry,
  zoom: number,
  dpr: number,
): Promise<OverlayOptions> {
  const definition = required(assetDefinitions, id);
  const scale = geometry.displayScale * zoom * dpr;
  return {
    input: await sharp(path.join(root, definition.file))
      .resize({
        width: Math.round(geometry.width * scale),
        height: Math.round(geometry.height * scale),
        fit: "fill",
      })
      .png()
      .toBuffer(),
    left: Math.round(center.x * dpr - geometry.anchor.x * scale),
    top: Math.round(
      center.y * dpr -
        geometry.anchor.y * scale +
        (geometry.offsetY ?? 0) * zoom * dpr,
    ),
  };
}

async function render(
  width: number,
  height: number,
  dpr: number,
  overlays: OverlayOptions[],
  filename: string,
): Promise<void> {
  await sharp({
    create: {
      width: width * dpr,
      height: height * dpr,
      channels: 4,
      background: "#1e302f",
    },
  })
    .composite(overlays)
    .png({ compressionLevel: 9, adaptiveFiltering: false })
    .toFile(path.join(reviewRoot, filename));
}

async function enlarged(source: string, output: string): Promise<void> {
  const file = path.join(reviewRoot, source);
  const metadata = await sharp(file).metadata();
  if (metadata.width === undefined || metadata.height === undefined)
    throw new Error(`${source}: missing dimensions`);
  await sharp(file)
    .resize({
      width: metadata.width * 2,
      height: metadata.height * 2,
      kernel: sharp.kernel.nearest,
    })
    .png({ compressionLevel: 9, adaptiveFiltering: false })
    .toFile(path.join(reviewRoot, output));
}

async function writeEvidence(): Promise<void> {
  const selectedStandards = standardAssets.map((id) =>
    measure(id, UNIT_SCALE_CONTRACT.standard.displayScale),
  );
  const selectedSiege = measure(
    "unit-catapult",
    UNIT_SCALE_CONTRACT.siege.displayScale,
  );
  const artifacts = [
    "README.md",
    "candidate-scale-comparison-native.png",
    "candidate-scale-comparison-enlarged.png",
    "map-context-zoom-dpr1-native.png",
    "map-context-zoom-dpr1-enlarged.png",
    "map-context-zoom-dpr2-native.png",
    "map-context-zoom-dpr2-enlarged.png",
    "adjacency-and-city-native.png",
    "adjacency-and-city-enlarged.png",
  ];
  const artifactRecords = [];
  for (const name of artifacts) {
    const file = path.join(reviewRoot, name);
    const data = await readFile(file);
    artifactRecords.push({
      path: path.relative(root, file).replaceAll("\\", "/"),
      sha256: createHash("sha256").update(data).digest("hex"),
      bytes: data.byteLength,
    });
  }
  const evidence = {
    schemaVersion: 1,
    purpose:
      "Objective unit display-scale and adjacent-tile occlusion calibration using accepted production rasters only",
    tile: UNIT_SCALE_CONTRACT.tile,
    measurement: {
      alphaThreshold: "source alpha > 0 contributes alpha/255 weight",
      visibleOccupancy:
        "non-zero alpha bounding width/height after display scale, divided by the 128x74 nominal tile dimensions",
      opaqueDiamondArea:
        "sum(alpha/255 * displayScale^2) divided by nominal diamond area 128*74/2",
      adjacentOcclusion:
        "alpha-weighted sprite area whose source-pixel center falls inside each immediately adjacent projected 128x74 diamond, divided by that diamond area",
      projectedDirections: directions,
      invariant:
        "camera zoom and DPR scale the sprite and diamonds uniformly, so ratios are unchanged",
    },
    candidateScales,
    chosenContracts: UNIT_SCALE_CONTRACT,
    candidateMeasurements: {
      representativeStandard: candidateScales.standard.map((scale) =>
        measure("unit-archer", scale),
      ),
      broadStandard: candidateScales.standard.map((scale) =>
        measure("unit-defender", scale),
      ),
      acceptedSiege: candidateScales.siege.map((scale) =>
        measure("unit-catapult", scale),
      ),
    },
    chosenMeasurements: {
      standards: selectedStandards,
      siege: selectedSiege,
      summary: {
        standardVisibleWidthRatio: range(
          selectedStandards.map(({ visibleWidthRatio }) => visibleWidthRatio),
        ),
        standardVisibleHeightRatio: range(
          selectedStandards.map(({ visibleHeightRatio }) => visibleHeightRatio),
        ),
        standardOpaqueDiamondAreaRatio: range(
          selectedStandards.map(
            ({ opaqueDiamondAreaRatio }) => opaqueDiamondAreaRatio,
          ),
        ),
        maximumStandardRearTileOcclusionRatio: Math.max(
          ...selectedStandards.map(
            ({ maximumRearTileOcclusionRatio }) =>
              maximumRearTileOcclusionRatio,
          ),
        ),
      },
    },
    runtimeIntegration: {
      standardDisplayScale: BOARD_ART_GEOMETRY.unit.displayScale,
      siegeDisplayScale: BOARD_ART_GEOMETRY.siegeUnit.displayScale,
      giantReservedDisplayScale: BOARD_ART_GEOMETRY.giantUnit.displayScale,
      candyWarriorCosmeticOffsetY: PLACEMENT_ART_GEOMETRY.candyWarrior.offsetY,
      unchanged:
        "source PNGs and hashes, source anchors, logical coordinates, picking, sorting, state, commands, AI and deterministic hashes",
    },
    reviewCoverage: [
      "accepted representative Archer, broad Defender, Candy standards and Catapult siege reference",
      "accepted Grass, Mountain, Forest and level-two City context",
      "logical NORTH/EAST/SOUTH/WEST adjacent diamonds with rear/above NORTH and WEST measured",
      "standard, broad and siege unit-on-city composition",
      "0.625x, 1x and 1.75x camera zoom",
      "DPR1 and DPR2 backing resolution",
      "native outputs and deterministic nearest-neighbor 2x enlarged companions",
    ],
    visualReview: {
      status: "ACCEPTED",
      reviewedAt: "2026-08-31",
      findings: [
        "At 0.25, ordinary units read as pieces placed on a tile and remain materially smaller than accepted Mountains and Forests.",
        "The 0.20 candidate loses too much equipment/body presence at 0.625x; the 0.30 candidate makes broad standards occupy most of the diamond and crosses the rear-occlusion limit.",
        "The 0.24 Catapult remains deliberately broader than standards while preserving city, terrain and adjacent-target readability.",
        "The proportional 7.5 CSS Candy Warrior exception preserves its source-space grounding without changing its authoritative anchor.",
      ],
    },
    artifacts: artifactRecords,
  };
  await writeFile(
    path.join(reviewRoot, "review-evidence.json"),
    `${JSON.stringify(evidence, null, 2)}\n`,
  );
}

function panel(
  width: number,
  height: number,
  dpr: number,
  fill: string,
): Buffer {
  return Buffer.from(
    `<svg width="${width * dpr}" height="${height * dpr}" xmlns="http://www.w3.org/2000/svg"><rect x="${dpr}" y="${dpr}" width="${width * dpr - 2 * dpr}" height="${height * dpr - 2 * dpr}" rx="${12 * dpr}" fill="${fill}" stroke="#76938a" stroke-width="${dpr}"/></svg>`,
  );
}

function label(
  text: string,
  width: number,
  height: number,
  fontSize: number,
  dpr: number,
  fill: string,
): Buffer {
  const lines = text.split("\n");
  return Buffer.from(
    `<svg width="${width * dpr}" height="${height * dpr}" xmlns="http://www.w3.org/2000/svg"><style>text{font-family:Arial,sans-serif;font-weight:700}</style>${lines
      .map(
        (line, index) =>
          `<text x="${10 * dpr}" y="${(fontSize + 3 + index * (fontSize + 4)) * dpr}" font-size="${fontSize * dpr}" fill="${fill}">${escapeXml(line)}</text>`,
      )
      .join("")}</svg>`,
  );
}

function diamondOutline(
  width: number,
  height: number,
  dpr: number,
  stroke: string,
): Buffer {
  return Buffer.from(
    `<svg width="${width * dpr}" height="${height * dpr}" xmlns="http://www.w3.org/2000/svg"><path d="M ${width * dpr * 0.5} ${dpr} L ${width * dpr - dpr} ${height * dpr * 0.5} L ${width * dpr * 0.5} ${height * dpr - dpr} L ${dpr} ${height * dpr * 0.5} Z" fill="none" stroke="${stroke}" stroke-width="${2 * dpr}" stroke-dasharray="${6 * dpr} ${4 * dpr}"/></svg>`,
  );
}

function required<K, V>(map: ReadonlyMap<K, V>, key: K): V {
  const value = map.get(key);
  if (value === undefined)
    throw new Error(`Missing review value: ${String(key)}`);
  return value;
}

function rounded(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function percent(value: number): string {
  return `${rounded(value * 100, 1).toFixed(1)}%`;
}

function range(values: readonly number[]): readonly [number, number] {
  return [Math.min(...values), Math.max(...values)];
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
