import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp, { type OverlayOptions } from "sharp";

type Direction = "NORTH" | "EAST" | "SOUTH" | "WEST";

interface Bounds {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

interface Recipe {
  readonly id: string;
  readonly output: string;
  readonly anchor?: { readonly x: number; readonly y: number };
  readonly groundContactY?: number;
  readonly fitOffsetX?: number;
  readonly preferredBounds?: Bounds;
  readonly hardBounds: Bounds;
  readonly postprocess?: string;
  readonly styleReference?: string;
}

interface SourceManifest {
  readonly recipes: readonly Recipe[];
}

interface GeneratedRecord {
  readonly status: string;
  readonly jobId?: string;
  readonly candidate?: string;
  readonly candidateSha256?: string;
  readonly outputSha256?: string;
  readonly providerOutputSha256?: string;
  readonly alphaBounds?: Bounds;
  readonly notes?: string;
  readonly rejectedAttempts?: readonly {
    readonly candidate: string;
    readonly candidateSha256?: string;
    readonly notes?: string;
  }[];
  readonly request?: {
    readonly postprocess?: string;
    readonly styleReference?: {
      readonly id: string;
      readonly sha256?: string;
      readonly usageDescription?: string;
    };
  };
  readonly reviewChecks?: Readonly<Record<string, boolean>>;
}

interface GeneratedManifest {
  readonly records: Readonly<Record<string, GeneratedRecord>>;
}

interface UnitDefinition {
  readonly role: string;
  readonly id: string;
  readonly portraitId: string;
  readonly comparisonRole: string;
  readonly comparisonFile: string;
}

interface LoadedUnit extends UnitDefinition {
  readonly recipe: Recipe;
  readonly record: GeneratedRecord;
  readonly file: string;
  readonly bytes: Buffer;
  readonly sha256: string;
  readonly width: number;
  readonly height: number;
  readonly bounds: Bounds;
  readonly alpha: Uint8Array;
}

const root = process.cwd();
const reviewRoot = path.join(
  root,
  "art/pixellab/reviews/ruleset7-original-units",
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

const definitions: readonly UnitDefinition[] = [
  {
    role: "Envoy",
    id: "unit-original-envoy",
    portraitId: "portrait-original-envoy",
    comparisonRole: "Medic",
    comparisonFile: "public/assets/pixellab/units/original-medic.png",
  },
  {
    role: "Lancer",
    id: "unit-original-lancer",
    portraitId: "portrait-original-lancer",
    comparisonRole: "Raider",
    comparisonFile: "public/assets/pixellab/units/rider.png",
  },
  {
    role: "Saboteur",
    id: "unit-original-saboteur",
    portraitId: "portrait-original-saboteur",
    comparisonRole: "Scout",
    comparisonFile: "public/assets/pixellab/units/original-scout.png",
  },
];

const legacyDirections: Readonly<
  Record<Direction, { readonly x: number; readonly y: number }>
> = {
  NORTH: { x: 64, y: -37 },
  EAST: { x: 64, y: 37 },
  SOUTH: { x: -64, y: 37 },
  WEST: { x: -64, y: -37 },
};
const squareDirections: Readonly<
  Record<Direction, { readonly x: number; readonly y: number }>
> = {
  NORTH: { x: 0, y: -128 },
  EAST: { x: 128, y: 0 },
  SOUTH: { x: 0, y: 128 },
  WEST: { x: -128, y: 0 },
};
const displayScale = 0.25;
const baselineOffset = 18;

await mkdir(reviewRoot, { recursive: true });
const units = await Promise.all(definitions.map(loadUnit));
const measurements = units.map(measure);
measurements.forEach(assertMeasurement);
const portraitsAccepted = definitions.every(
  ({ portraitId }) => generated.records[portraitId]?.status === "ACCEPTED",
);
const phase = portraitsAccepted ? "COMPLETE_TRIO" : "WORLD_SAMPLE_CHECKPOINT";

await sourceNativeSheet();
await zoomDprSheet();
await contextSheet();
await ownerSheet();
await adjacencySheet();
await comparisonSheet();
await portraitSheet();
await writeEvidence();

async function loadUnit(definition: UnitDefinition): Promise<LoadedUnit> {
  const recipe = required(
    source.recipes.find(({ id }) => id === definition.id),
    `${definition.id} recipe`,
  );
  const record = required(
    generated.records[definition.id],
    `${definition.id} generation record`,
  );
  if (!new Set(["CANDIDATE", "ACCEPTED"]).has(record.status))
    throw new Error(`${definition.id}: expected CANDIDATE or ACCEPTED`);
  const file =
    record.status === "ACCEPTED"
      ? recipe.output
      : required(record.candidate, `${definition.id} candidate path`);
  const bytes = await readFile(path.join(root, file));
  const sha256 = hash(bytes);
  const expectedHash =
    record.status === "ACCEPTED" ? record.outputSha256 : record.candidateSha256;
  if (sha256 !== expectedHash)
    throw new Error(`${definition.id}: hash drifted`);
  const { data, info } = await sharp(bytes)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  if (info.width !== 256 || info.height !== 296)
    throw new Error(`${definition.id}: expected 256x296 source`);
  const alpha = new Uint8Array(info.width * info.height);
  let left = info.width;
  let top = info.height;
  let right = 0;
  let bottom = 0;
  for (let y = 0; y < info.height; y += 1)
    for (let x = 0; x < info.width; x += 1) {
      const value = data[(y * info.width + x) * info.channels + 3] ?? 0;
      alpha[y * info.width + x] = value;
      if (value === 0) continue;
      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x + 1);
      bottom = Math.max(bottom, y + 1);
    }
  const bounds = { left, top, right, bottom };
  if (
    bounds.left !== record.alphaBounds?.left ||
    bounds.top !== record.alphaBounds.top ||
    bounds.right !== record.alphaBounds.right ||
    bounds.bottom !== record.alphaBounds.bottom
  )
    throw new Error(`${definition.id}: recorded alpha bounds drifted`);
  return {
    ...definition,
    recipe,
    record,
    file,
    bytes,
    sha256,
    width: info.width,
    height: info.height,
    bounds,
    alpha,
  };
}

function measure(unit: LoadedUnit) {
  const anchor = required(unit.recipe.anchor, `${unit.id} anchor`);
  const legacyTileArea = (128 * 74) / 2;
  const squareTileArea = 128 * 128;
  let opaqueArea = 0;
  const footColumnWeights = Array.from({ length: unit.width }, () => 0);
  const legacyArea = emptyDirections();
  const squareArea = emptyDirections();
  for (let y = 0; y < unit.height; y += 1)
    for (let x = 0; x < unit.width; x += 1) {
      const alpha = (unit.alpha[y * unit.width + x] ?? 0) / 255;
      if (alpha === 0) continue;
      const area = alpha * displayScale * displayScale;
      opaqueArea += area;
      if (y >= unit.bounds.bottom - 14) {
        footColumnWeights[x] = (footColumnWeights[x] ?? 0) + alpha;
      }
      const sx = (x + 0.5 - anchor.x) * displayScale;
      const legacySy = (y + 0.5 - anchor.y) * displayScale;
      const squareSy = legacySy + baselineOffset;
      for (const [direction, center] of Object.entries(
        legacyDirections,
      ) as readonly [Direction, { readonly x: number; readonly y: number }][]) {
        if (
          Math.abs(sx - center.x) / 64 + Math.abs(legacySy - center.y) / 37 <=
          1
        )
          legacyArea[direction] += area;
      }
      for (const [direction, center] of Object.entries(
        squareDirections,
      ) as readonly [Direction, { readonly x: number; readonly y: number }][]) {
        if (
          Math.abs(sx - center.x) <= 64 &&
          Math.abs(squareSy - center.y) <= 64
        )
          squareArea[direction] += area;
      }
    }
  const placedBounds = {
    left: rounded(64 + (unit.bounds.left - anchor.x) * displayScale),
    top: rounded(
      64 + baselineOffset + (unit.bounds.top - anchor.y) * displayScale,
    ),
    right: rounded(64 + (unit.bounds.right - anchor.x) * displayScale),
    bottom: rounded(
      64 + baselineOffset + (unit.bounds.bottom - anchor.y) * displayScale,
    ),
  };
  const legacyOcclusion = directionRatios(legacyArea, legacyTileArea);
  const squareOcclusion = directionRatios(squareArea, squareTileArea);
  const footRuns: Array<{ left: number; right: number }> = [];
  for (const [x, weight] of footColumnWeights.entries()) {
    if (weight <= 1) continue;
    const previous = footRuns.at(-1);
    if (previous === undefined || x > previous.right + 1)
      footRuns.push({ left: x, right: x });
    else previous.right = x;
  }
  if (footRuns.length !== 2)
    throw new Error(
      `${unit.id}: expected two explicit foot-contact runs, got ${JSON.stringify(footRuns)}`,
    );
  const footContactCenters = footRuns.map(({ left, right }) =>
    rounded((left + right) / 2),
  );
  const footContactMidpointX = rounded(
    ((footContactCenters[0] ?? 0) + (footContactCenters[1] ?? 0)) / 2,
  );
  return {
    id: unit.id,
    role: unit.role,
    status: unit.record.status,
    sourcePath: unit.file,
    sourceSha256: unit.sha256,
    providerOutputSha256: unit.record.providerOutputSha256,
    sourceDimensions: { width: unit.width, height: unit.height },
    alphaBounds: unit.bounds,
    preferredBounds: unit.recipe.preferredBounds,
    hardBounds: unit.recipe.hardBounds,
    anchor,
    displayScale,
    baselineOffsetCssPx: baselineOffset,
    fitOffsetXSourcePx: unit.recipe.fitOffsetX ?? 0,
    feetCalibration: {
      method:
        "two contiguous foot-contact alpha runs in the lowest 14 source rows; threshold is summed alpha greater than 1",
      contactRuns: footRuns,
      contactCentersX: footContactCenters,
      footContactMidpointX,
      xDeltaFromAnchor: rounded(footContactMidpointX - anchor.x),
      paintedLowExtentY: unit.bounds.bottom - 1,
      yDeltaFromAnchor: unit.bounds.bottom - 1 - anchor.y,
    },
    legacyDiamondContract: {
      visibleWidthRatio: rounded(
        ((unit.bounds.right - unit.bounds.left) * displayScale) / 128,
      ),
      visibleHeightRatio: rounded(
        ((unit.bounds.bottom - unit.bounds.top) * displayScale) / 74,
      ),
      opaqueAreaRatio: rounded(opaqueArea / legacyTileArea),
      adjacentOcclusionRatio: legacyOcclusion,
      maximumRearOcclusionRatio: rounded(
        Math.max(legacyOcclusion.NORTH, legacyOcclusion.WEST),
      ),
      preferredWidthRange: [0.28, 0.44] as const,
      preferredHeightRange: [0.66, 0.8] as const,
      meetsPreferredWidth:
        ((unit.bounds.right - unit.bounds.left) * displayScale) / 128 >= 0.28 &&
        ((unit.bounds.right - unit.bounds.left) * displayScale) / 128 <= 0.44,
      meetsPreferredHeight:
        ((unit.bounds.bottom - unit.bounds.top) * displayScale) / 74 >= 0.66 &&
        ((unit.bounds.bottom - unit.bounds.top) * displayScale) / 74 <= 0.8,
    },
    activeSquareContract: {
      cellSizeCssPx: 128,
      placedAlphaBoundsCssPx: placedBounds,
      noLeftOverflow: placedBounds.left >= 0,
      noRightOverflow: placedBounds.right <= 128,
      noBottomOverflow: placedBounds.bottom <= 128,
      visibleFeetInsideCell: placedBounds.bottom <= 128,
      adjacentOcclusionRatio: squareOcclusion,
    },
  };
}

function assertMeasurement(measurement: ReturnType<typeof measure>): void {
  const legacy = measurement.legacyDiamondContract;
  const square = measurement.activeSquareContract;
  if (
    legacy.visibleWidthRatio > 0.48 ||
    legacy.visibleHeightRatio > 0.84 ||
    legacy.opaqueAreaRatio > 0.45 ||
    legacy.maximumRearOcclusionRatio > 0.08
  )
    throw new Error(`${measurement.id}: legacy occupancy contract failed`);
  if (
    !square.noLeftOverflow ||
    !square.noRightOverflow ||
    !square.noBottomOverflow ||
    !square.visibleFeetInsideCell
  )
    throw new Error(`${measurement.id}: active square placement failed`);
  if (
    Math.abs(measurement.feetCalibration.xDeltaFromAnchor) > 8 ||
    Math.abs(measurement.feetCalibration.yDeltaFromAnchor) > 6
  )
    throw new Error(
      `${measurement.id}: feet calibration failed ${JSON.stringify(measurement.feetCalibration)}`,
    );
}

async function sourceNativeSheet(): Promise<void> {
  const width = 1500;
  const overlays: OverlayOptions[] = [
    {
      input: title(
        "Ruleset 7 Original world trio · source / enlarged / native / minimum",
        width,
      ),
      left: 0,
      top: 8,
    },
  ];
  for (const [row, unit] of units.entries()) {
    const y = 70 + row * 330;
    overlays.push({ input: label(unit.role, 180), left: 0, top: y + 110 });
    overlays.push({ input: await sourcePanel(unit), left: 190, top: y });
    overlays.push({ input: await enlarged(unit), left: 500, top: y + 20 });
    overlays.push({ input: await isolated(unit, 1), left: 840, top: y + 92 });
    overlays.push({
      input: await isolated(unit, 0.625),
      left: 1040,
      top: y + 106,
    });
    const metric = measurements[row];
    overlays.push({
      input: caption(
        `${unit.sha256.slice(0, 12)} · bounds ${boundsText(unit.bounds)} · feet Δ(${metric?.feetCalibration.xDeltaFromAnchor},${metric?.feetCalibration.yDeltaFromAnchor})`,
        380,
      ),
      left: 1100,
      top: y + 265,
    });
  }
  await canvas(width, 1080, overlays, "world-source-native-enlarged.png");
}

async function zoomDprSheet(): Promise<void> {
  const columnWidth = 380;
  const rowHeight = 470;
  const width = 2460;
  const overlays: OverlayOptions[] = [
    {
      input: title(
        "Active square · 0.625× / 1× / 1.75× · DPR1 and DPR2",
        width,
      ),
      left: 0,
      top: 8,
    },
  ];
  const combinations = [
    [0.625, 1],
    [0.625, 2],
    [1, 1],
    [1, 2],
    [1.75, 1],
    [1.75, 2],
  ] as const;
  for (const [row, unit] of units.entries()) {
    const top = 74 + row * rowHeight;
    overlays.push({ input: label(unit.role, 150), left: 0, top: top + 175 });
    for (const [column, [zoom, dpr]] of combinations.entries()) {
      const context = await squareContext(unit, zoom, dpr, "grass", column);
      const cssWidth = Math.round(192 * zoom);
      const cssHeight = Math.round(224 * zoom);
      const displayed =
        dpr === 1
          ? context
          : await sharp(context).resize(cssWidth, cssHeight).png().toBuffer();
      overlays.push({
        input: displayed,
        left:
          150 + column * columnWidth + Math.round((columnWidth - cssWidth) / 2),
        top: top + Math.round((400 - cssHeight) / 2),
      });
      overlays.push({
        input: caption(`${zoom}× · DPR${dpr}`, 230),
        left: 150 + column * columnWidth + 75,
        top: top + 402,
      });
    }
  }
  await canvas(width, 1500, overlays, "world-zoom-dpr-square.png");
}

async function contextSheet(): Promise<void> {
  const contexts = [
    "grass",
    "forest",
    "mountain",
    "city",
    "building",
    "road",
    "owner",
    "selected",
    "damaged",
    "portrait",
  ] as const;
  const width = 1820;
  const overlays: OverlayOptions[] = [
    {
      input: title(
        "Square terrain / city / building / Road / owner / selection / damage / portrait contexts",
        width,
      ),
      left: 0,
      top: 8,
    },
  ];
  for (const [row, unit] of units.entries()) {
    const top = 70 + row * 240;
    overlays.push({ input: label(unit.role, 140), left: 0, top: top + 80 });
    for (const [column, context] of contexts.entries()) {
      const buffer =
        context === "portrait"
          ? await portraitPreview(unit)
          : await squareContext(unit, 1, 1, context, column);
      overlays.push({
        input: await sharp(buffer)
          .resize(150, 180, { fit: "contain" })
          .png()
          .toBuffer(),
        left: 140 + column * 166,
        top,
      });
      overlays.push({
        input: caption(context, 150),
        left: 140 + column * 166,
        top: top + 182,
      });
    }
  }
  await canvas(width, 820, overlays, "world-square-contexts.png");
}

async function adjacencySheet(): Promise<void> {
  const width = 1200;
  const overlays: OverlayOptions[] = [
    {
      input: title(
        "Current square all-direction neighbors · minimum zoom · rear target visibility",
        width,
      ),
      left: 0,
      top: 8,
    },
  ];
  for (const [column, unit] of units.entries()) {
    overlays.push({
      input: await neighborGrid(unit),
      left: 60 + column * 380,
      top: 80,
    });
    const ratios =
      measurements[column]?.activeSquareContract.adjacentOcclusionRatio;
    overlays.push({
      input: caption(
        `N ${ratios?.NORTH} E ${ratios?.EAST} S ${ratios?.SOUTH} W ${ratios?.WEST}`,
        340,
      ),
      left: 60 + column * 380,
      top: 450,
    });
    overlays.push({
      input: label(unit.role, 340),
      left: 60 + column * 380,
      top: 485,
    });
  }
  await canvas(
    width,
    560,
    overlays,
    "world-square-all-direction-neighbors.png",
  );
}

async function ownerSheet(): Promise<void> {
  const width = 1100;
  const overlays: OverlayOptions[] = [
    {
      input: title(
        "Every world role in all four renderer-owned player colors",
        width,
      ),
      left: 0,
      top: 8,
    },
  ];
  for (const [row, unit] of units.entries()) {
    const top = 70 + row * 235;
    overlays.push({ input: label(unit.role, 140), left: 0, top: top + 90 });
    for (let owner = 0; owner < 4; owner += 1) {
      overlays.push({
        input: await squareContext(unit, 1, 1, "owner", owner),
        left: 150 + owner * 230,
        top,
      });
      overlays.push({
        input: caption(
          ["coral", "teal", "gold", "violet"][owner] ?? "owner",
          192,
        ),
        left: 150 + owner * 230,
        top: top + 205,
      });
    }
  }
  await canvas(width, 790, overlays, "world-all-owner-colors.png");
}

async function comparisonSheet(): Promise<void> {
  const width = 1200;
  const overlays: OverlayOptions[] = [
    {
      input: title("Silhouette separation at native and minimum zoom", width),
      left: 0,
      top: 8,
    },
  ];
  for (const [column, unit] of units.entries()) {
    const left = 60 + column * 380;
    overlays.push({ input: await comparisonPanel(unit, 1), left, top: 90 });
    overlays.push({
      input: await comparisonPanel(unit, 0.625),
      left,
      top: 300,
    });
    overlays.push({
      input: caption(`${unit.role} vs ${unit.comparisonRole}`, 340),
      left,
      top: 470,
    });
  }
  await canvas(width, 540, overlays, "world-role-silhouette-comparisons.png");
}

async function portraitSheet(): Promise<void> {
  const width = 1500;
  const overlays: OverlayOptions[] = [
    {
      input: title(
        `Portrait contexts · ${portraitsAccepted ? "accepted sprite-derived outputs" : "pre-derivation sprite previews"}`,
        width,
      ),
      left: 0,
      top: 8,
    },
  ];
  const backgrounds = ["#f5efe2", "#263d3b", "#000000"];
  overlays.push({ input: caption("256×256 source", 260), left: 160, top: 52 });
  overlays.push({
    input: caption("nominal 64×64 portrait", 320),
    left: 460,
    top: 52,
  });
  overlays.push({
    input: caption("112×130 world-sprite UI preview", 440),
    left: 830,
    top: 52,
  });
  for (const [row, unit] of units.entries()) {
    const preview = await portraitPreview(unit);
    const top = 92 + row * 310;
    overlays.push({ input: label(unit.role, 140), left: 0, top: top + 105 });
    overlays.push({ input: preview, left: 160, top });
    for (const [column, background] of backgrounds.entries()) {
      overlays.push({
        input: panel(96, 96, background),
        left: 470 + column * 110,
        top: top + 80,
      });
      overlays.push({
        input: await sharp(preview)
          .resize(64, 64, { fit: "contain" })
          .png()
          .toBuffer(),
        left: 486 + column * 110,
        top: top + 96,
      });
      overlays.push({
        input: panel(112, 130, background),
        left: 850 + column * 130,
        top: top + 63,
      });
      overlays.push({
        input: await sharp(unit.bytes)
          .resize(112, 130, {
            fit: "contain",
            background: "#00000000",
          })
          .png()
          .toBuffer(),
        left: 850 + column * 130,
        top: top + 63,
      });
    }
  }
  await canvas(width, 1040, overlays, "portrait-contexts.png");
}

async function squareContext(
  unit: LoadedUnit,
  zoom: number,
  dpr: number,
  kind:
    | "grass"
    | "forest"
    | "mountain"
    | "city"
    | "building"
    | "road"
    | "owner"
    | "selected"
    | "damaged",
  variant: number,
): Promise<Buffer> {
  const scale = zoom * dpr;
  const width = Math.round(192 * scale);
  const height = Math.round(224 * scale);
  const cell = Math.round(128 * scale);
  const cellLeft = Math.round(32 * scale);
  const cellTop = Math.round(80 * scale);
  const centerX = cellLeft + cell / 2;
  const centerY = cellTop + cell / 2;
  const terrainKind = kind === "forest" || kind === "mountain" ? kind : "grass";
  const overlays: OverlayOptions[] = [
    {
      input: await terrain(terrainKind, cell),
      left: cellLeft,
      top: terrainKind === "grass" ? cellTop : cellTop - Math.round(cell / 2),
    },
  ];
  if (kind === "road")
    overlays.push({
      input: await raster(
        "public/assets/pixellab/terrain-square/road-masks/road-mask-1111.png",
        cell,
        cell,
      ),
      left: cellLeft,
      top: cellTop,
    });
  if (kind === "city")
    overlays.push(
      await placedStructure(
        "public/assets/pixellab/buildings/city-1.png",
        384,
        384,
        0.3,
        { x: 192, y: 236 },
        centerX,
        centerY,
        scale,
      ),
    );
  if (kind === "building")
    overlays.push(
      await placedStructure(
        "public/assets/pixellab/buildings-square/workshop.png",
        384,
        384,
        0.3,
        { x: 192, y: 288 },
        centerX,
        centerY,
        scale,
      ),
    );
  if (kind === "owner" || kind === "selected")
    overlays.push({
      input: squareMark(cell, variant % 4, kind === "selected"),
      left: cellLeft,
      top: cellTop,
    });
  overlays.push(await placedUnit(unit, centerX, centerY, scale));
  if (kind === "damaged")
    overlays.push({
      input: health(0.28, scale),
      left: Math.round(centerX - 23 * scale),
      top: Math.round(centerY + 21 * scale),
    });
  return sharp({
    create: { width, height, channels: 4, background: "#203332" },
  })
    .composite(overlays)
    .png()
    .toBuffer();
}

async function neighborGrid(unit: LoadedUnit): Promise<Buffer> {
  const zoom = 0.625;
  const cell = 80;
  const overlays: OverlayOptions[] = [];
  for (let y = 0; y < 3; y += 1)
    for (let x = 0; x < 3; x += 1) {
      overlays.push({
        input: await terrain("grass", cell),
        left: x * cell,
        top: y * cell,
      });
      overlays.push({
        input: squareMark(cell, (x + y) % 4, x === 1 && y === 1),
        left: x * cell,
        top: y * cell,
      });
      if ((x === 1 && y !== 1) || (y === 1 && x !== 1))
        overlays.push({
          input: targetMarker(cell),
          left: x * cell,
          top: y * cell,
        });
    }
  overlays.push(await placedUnit(unit, 120, 120, zoom));
  return sharp({
    create: { width: 240, height: 240, channels: 4, background: "#203332" },
  })
    .composite(overlays)
    .png()
    .toBuffer();
}

async function comparisonPanel(
  unit: LoadedUnit,
  zoom: number,
): Promise<Buffer> {
  const width = 340;
  const height = 170;
  const overlays: OverlayOptions[] = [
    { input: panel(width, height, "#d6c58f"), left: 0, top: 0 },
    await placedUnit(unit, 90, 86, zoom),
    await placedExternalUnit(unit.comparisonFile, 250, 86, zoom),
    { input: caption(unit.role, 140), left: 20, top: 136 },
    { input: caption(unit.comparisonRole, 140), left: 180, top: 136 },
  ];
  return sharp({
    create: { width, height, channels: 4, background: "#00000000" },
  })
    .composite(overlays)
    .png()
    .toBuffer();
}

async function portraitPreview(unit: LoadedUnit): Promise<Buffer> {
  const portraitRecord = generated.records[unit.portraitId];
  const portraitRecipe = source.recipes.find(
    ({ id }) => id === unit.portraitId,
  );
  if (portraitRecord?.status === "ACCEPTED" && portraitRecipe !== undefined)
    return readFile(path.join(root, portraitRecipe.output));
  return sharp(unit.bytes)
    .trim({ background: "#00000000" })
    .resize({
      width: 216,
      height: 216,
      fit: "contain",
      background: "#00000000",
    })
    .extend({
      top: 20,
      bottom: 20,
      left: 20,
      right: 20,
      background: "#00000000",
    })
    .resize(256, 256, { fit: "contain", background: "#00000000" })
    .png()
    .toBuffer();
}

function placedUnit(
  unit: LoadedUnit,
  centerX: number,
  centerY: number,
  scale: number,
): Promise<OverlayOptions> {
  return placedUnitBytes(unit.bytes, centerX, centerY, scale);
}

async function placedExternalUnit(
  file: string,
  centerX: number,
  centerY: number,
  zoom: number,
): Promise<OverlayOptions> {
  return placedUnitBytes(
    await readFile(path.join(root, file)),
    centerX,
    centerY,
    zoom,
  );
}

async function placedUnitBytes(
  bytes: Buffer,
  centerX: number,
  centerY: number,
  zoomDpr: number,
): Promise<OverlayOptions> {
  const width = Math.max(1, Math.round(256 * displayScale * zoomDpr));
  const height = Math.max(1, Math.round(296 * displayScale * zoomDpr));
  return {
    input: await sharp(bytes).resize(width, height).png().toBuffer(),
    left: Math.round(centerX - 128 * displayScale * zoomDpr),
    top: Math.round(
      centerY + baselineOffset * zoomDpr - 222 * displayScale * zoomDpr,
    ),
  };
}

async function placedStructure(
  file: string,
  width: number,
  height: number,
  display: number,
  anchor: { x: number; y: number },
  centerX: number,
  centerY: number,
  zoomDpr: number,
): Promise<OverlayOptions> {
  return {
    input: await raster(
      file,
      Math.round(width * display * zoomDpr),
      Math.round(height * display * zoomDpr),
    ),
    left: Math.round(centerX - anchor.x * display * zoomDpr),
    top: Math.round(centerY - anchor.y * display * zoomDpr),
  };
}

async function terrain(
  kind: "grass" | "forest" | "mountain",
  cell: number,
): Promise<Buffer> {
  const height = kind === "grass" ? cell : Math.round(cell * 1.5);
  return raster(
    `public/assets/pixellab/terrain-square/original-${kind}-1.png`,
    cell,
    height,
  );
}

async function raster(
  file: string,
  width: number,
  height: number,
): Promise<Buffer> {
  return sharp(path.join(root, file)).resize(width, height).png().toBuffer();
}

async function sourcePanel(unit: LoadedUnit): Promise<Buffer> {
  const guide = Buffer.from(
    `<svg width="280" height="310" xmlns="http://www.w3.org/2000/svg"><rect x="${12 + unit.bounds.left}" y="${7 + unit.bounds.top}" width="${unit.bounds.right - unit.bounds.left}" height="${unit.bounds.bottom - unit.bounds.top}" fill="none" stroke="#ffe36d" stroke-width="2"/><circle cx="140" cy="229" r="4" fill="#ff6b6b"/></svg>`,
  );
  return sharp({
    create: { width: 280, height: 310, channels: 4, background: "#182b2a" },
  })
    .composite([
      { input: unit.bytes, left: 12, top: 7 },
      { input: guide, left: 0, top: 0 },
    ])
    .png()
    .toBuffer();
}

async function enlarged(unit: LoadedUnit): Promise<Buffer> {
  return sharp(unit.bytes)
    .trim({ background: "#00000000" })
    .resize(300, 270, { fit: "inside" })
    .png()
    .toBuffer();
}

async function isolated(unit: LoadedUnit, zoom: number): Promise<Buffer> {
  return sharp(unit.bytes)
    .resize(Math.round(64 * zoom), Math.round(74 * zoom))
    .png()
    .toBuffer();
}

function squareMark(size: number, owner: number, selected: boolean): Buffer {
  const colors = ["#f06762", "#28b7a4", "#e2b63f", "#a277d2"];
  const color = colors[owner] ?? colors[0];
  return Buffer.from(
    `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="2" width="${size - 4}" height="${size - 4}" fill="${color}20" stroke="${selected ? "#ffe36d" : color}" stroke-width="${selected ? 5 : 3}"/><circle cx="${size - 14}" cy="14" r="8" fill="${color}" stroke="#172725" stroke-width="2"/></svg>`,
  );
}

function targetMarker(size: number): Buffer {
  return Buffer.from(
    `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg"><circle cx="${size / 2}" cy="${size / 2}" r="12" fill="#f5efe2" stroke="#c54646" stroke-width="4"/><circle cx="${size / 2}" cy="${size / 2}" r="4" fill="#c54646"/></svg>`,
  );
}

function health(amount: number, scale: number): Buffer {
  const width = Math.round(46 * scale);
  return Buffer.from(
    `<svg width="${width}" height="${Math.round(10 * scale)}" xmlns="http://www.w3.org/2000/svg"><rect width="${width}" height="100%" rx="3" fill="#172725"/><rect x="2" y="2" width="${Math.max(2, (width - 4) * amount)}" height="${Math.max(2, Math.round(6 * scale))}" rx="2" fill="#ff6b6b"/></svg>`,
  );
}

function panel(width: number, height: number, fill: string): Buffer {
  return Buffer.from(
    `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><rect x="1" y="1" width="${width - 2}" height="${height - 2}" rx="12" fill="${fill}" stroke="#8ba09a" stroke-width="2"/></svg>`,
  );
}

async function writeEvidence(): Promise<void> {
  const artifactNames = [
    "world-source-native-enlarged.png",
    "world-zoom-dpr-square.png",
    "world-square-contexts.png",
    "world-all-owner-colors.png",
    "world-square-all-direction-neighbors.png",
    "world-role-silhouette-comparisons.png",
    "portrait-contexts.png",
  ];
  const artifacts = await Promise.all(
    artifactNames.map(async (filename) => {
      const bytes = await readFile(path.join(reviewRoot, filename));
      return { filename, sha256: hash(bytes), bytes: bytes.byteLength };
    }),
  );
  const portraitProvenance = portraitsAccepted
    ? await Promise.all(
        definitions.map(async ({ id, portraitId }) => {
          const record = required(
            generated.records[portraitId],
            `${portraitId} generated record`,
          );
          const recipe = required(
            source.recipes.find((candidate) => candidate.id === portraitId),
            `${portraitId} recipe`,
          );
          const sourceSha256 = generated.records[id]?.outputSha256;
          const bytes = await readFile(path.join(root, recipe.output));
          const outputSha256 = hash(bytes);
          if (
            record.status !== "ACCEPTED" ||
            recipe.postprocess !== "sprite-derived-portrait" ||
            recipe.styleReference !== id ||
            record.outputSha256 !== outputSha256 ||
            record.request?.styleReference?.id !== id ||
            record.request.styleReference.sha256 !== sourceSha256 ||
            record.providerOutputSha256 !== sourceSha256
          )
            throw new Error(
              `${portraitId}: sprite-derived provenance mismatch`,
            );
          return {
            id: portraitId,
            status: record.status,
            outputPath: recipe.output,
            outputSha256,
            sourceId: id,
            sourceSha256,
            postprocess: recipe.postprocess,
            providerRequestMade: false,
            providerOutputSha256FieldMeaning:
              "accepted world-sprite source hash used by deterministic derivation; not a new provider portrait output",
            reviewChecks: record.reviewChecks,
          };
        }),
      )
    : [];
  const evidence = {
    schemaVersion: 1,
    status: "READY_FOR_ORCHESTRATOR_REVIEW",
    phase,
    assetClass: "ruleset7-original-standard-units-and-portraits",
    generationOrder: {
      firstWorldCall: definitions.map(({ id }) => id),
      maximumSelectedPerCall: 3,
      portraitCall: definitions.map(({ portraitId }) => portraitId),
      portraitsAreProviderGenerated: false,
      portraitMethod: "sprite-derived-portrait",
    },
    generationRecords: units.map((unit) => ({
      id: unit.id,
      status: unit.record.status,
      jobId: unit.record.jobId,
      sourcePath: unit.file,
      sourceSha256: unit.sha256,
      providerOutputSha256: unit.record.providerOutputSha256,
      rejectedAttempts: unit.record.rejectedAttempts ?? [],
    })),
    portraitProvenance,
    measurements,
    reviewCoverage: [
      "each source at 256x296, enlarged, native 0.25 display, and minimum 0.625 zoom",
      "each role at 0.625x, 1x, and 1.75x with DPR1 and DPR2 backing",
      "active 128x128 square Grass, Forest, Mountain, city, building, and Road contexts",
      "all owner colors plus code-native selected and damaged states",
      "all four square neighbors with rear target visibility",
      "Envoy/Medic, Lancer/Raider, and Saboteur/Scout silhouette comparisons",
      portraitsAccepted
        ? "accepted sprite-derived portraits at nominal 64x64 and, separately, untrimmed 256x296 world sprites in the 112x130 object-fit UI preview on light, dark, and high-contrast panels"
        : "pre-derivation full-silhouette portrait previews; accepted portrait evidence remains gated",
      "visual inspection confirms southeast facing, northwest light, visible feet, compact hierarchy, clean transparency, and no baked state",
    ],
    workerVisualAssessment: {
      envoy:
        "Fragile open-handed controller; large scroll reads separately from Medic's pale satchel and bandage.",
      lancer:
        "Unmounted forward sweeper; broad near-horizontal lance and foot stance remain distinct from Raider.",
      saboteur:
        "Fully opaque utility infiltrator; visible face, pry-wrench and tool satchel avoid ninja, ghost and concealment language.",
      common:
        "Established tan/off-white/dark-teal/bronze language, chunky illustrated treatment, strong outline, upper-left light and darker lower-right planes are preserved.",
    },
    artifacts,
  };
  await writeFile(
    path.join(reviewRoot, "review-evidence.json"),
    `${JSON.stringify(evidence, null, 2)}\n`,
    "utf8",
  );
  await writeFile(
    path.join(reviewRoot, "README.md"),
    "# Ruleset 7 Original standard-unit review\n\nGenerated by `npm run art:ruleset7-original-unit-review`. The evidence records the bounded three-world-sprite gate, candidate and rejection history, standard geometry, historical diamond occupancy, active square placement and adjacency, zoom/DPR coverage, role comparisons, and sprite-derived portrait provenance.\n",
    "utf8",
  );
}

async function canvas(
  width: number,
  height: number,
  overlays: readonly OverlayOptions[],
  filename: string,
): Promise<void> {
  await sharp({ create: { width, height, channels: 4, background: "#233b39" } })
    .composite([...overlays])
    .png()
    .toFile(path.join(reviewRoot, filename));
}

function emptyDirections(): Record<Direction, number> {
  return { NORTH: 0, EAST: 0, SOUTH: 0, WEST: 0 };
}

function directionRatios(
  values: Record<Direction, number>,
  area: number,
): Record<Direction, number> {
  return {
    NORTH: rounded(values.NORTH / area),
    EAST: rounded(values.EAST / area),
    SOUTH: rounded(values.SOUTH / area),
    WEST: rounded(values.WEST / area),
  };
}

function rounded(value: number): number {
  return Number(value.toFixed(6));
}

function boundsText(bounds: Bounds): string {
  return `${bounds.left},${bounds.top}..${bounds.right},${bounds.bottom}`;
}

function hash(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function title(value: string, width: number): Buffer {
  return svgText(value, width, 48, 24, "#f8f2df", 700);
}

function label(value: string, width: number): Buffer {
  return svgText(value, width, 34, 17, "#f8f2df", 700);
}

function caption(value: string, width: number): Buffer {
  return svgText(value, width, 30, 13, "#cfe0d8", 600);
}

function svgText(
  value: string,
  width: number,
  height: number,
  size: number,
  fill: string,
  weight: number,
): Buffer {
  return Buffer.from(
    `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><text x="${width / 2}" y="${Math.round(height * 0.7)}" text-anchor="middle" font-family="sans-serif" font-size="${size}" font-weight="${weight}" fill="${fill}">${escapeXml(value)}</text></svg>`,
  );
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function required<T>(value: T | undefined, label: string): T {
  if (value === undefined) throw new Error(`Missing ${label}`);
  return value;
}
