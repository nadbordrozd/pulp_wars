import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { format } from "prettier";
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
  readonly preferredBounds?: Bounds;
  readonly hardBounds: Bounds;
  readonly postprocess?: string;
  readonly styleReference?: string;
  readonly fitOffsetX?: number;
  readonly fitOffsetY?: number;
}

interface GeneratedRecord {
  readonly status: string;
  readonly jobId?: string;
  readonly candidate?: string;
  readonly candidateSha256?: string;
  readonly outputSha256?: string;
  readonly providerOutputSha256?: string;
  readonly alphaBounds?: Bounds;
  readonly rejectedAttempts?: readonly {
    readonly candidate: string;
    readonly candidateSha256?: string;
    readonly providerOutputSha256?: string;
    readonly jobId?: string;
    readonly notes?: string;
    readonly request?: { readonly seed?: number };
  }[];
  readonly request?: {
    readonly postprocess?: string;
    readonly fitOffsetX?: number;
    readonly fitOffsetY?: number;
    readonly styleReference?: {
      readonly id: string;
      readonly sha256?: string;
      readonly usageDescription?: string;
    };
  };
  readonly reviewChecks?: Readonly<Record<string, boolean>>;
}

interface Manifest {
  readonly recipes: readonly Recipe[];
}

interface Generated {
  readonly records: Readonly<Record<string, GeneratedRecord>>;
}

const root = process.cwd();
const reviewRoot = path.join(root, "art/pixellab/reviews/ruleset7-catapult");
const source = JSON.parse(
  await readFile(path.join(root, "scripts/art/pixellab-manifest.json"), "utf8"),
) as Manifest;
const generated = JSON.parse(
  await readFile(
    path.join(root, "scripts/art/pixellab-generated.json"),
    "utf8",
  ),
) as Generated;
const recipe = required(
  source.recipes.find(({ id }) => id === "unit-original-catapult"),
  "Catapult recipe",
);
const record = required(
  generated.records["unit-original-catapult"],
  "Catapult generated record",
);
if (record.status !== "CANDIDATE" && record.status !== "ACCEPTED")
  throw new Error("Catapult world asset must be a candidate or accepted");
const worldPath =
  record.status === "ACCEPTED"
    ? recipe.output
    : required(record.candidate, "Catapult candidate path");
const bytes = await readFile(path.join(root, worldPath));
const sourceSha256 = hash(bytes);
const calibratedSourceSha256 =
  "67e7f8cb6fc9a36b385eed9aecc2a12fb2884701cb7661d5503f8dbcf373c360";
const recordedSha256 =
  record.status === "ACCEPTED" ? record.outputSha256 : record.candidateSha256;
if (sourceSha256 !== recordedSha256)
  throw new Error("Catapult source hash drifted");
if (sourceSha256 !== calibratedSourceSha256)
  throw new Error(
    "Catapult source changed; explicit wheel contacts require renewed visual calibration",
  );
const portraitRecipe = required(
  source.recipes.find(({ id }) => id === "portrait-original-catapult"),
  "Catapult portrait recipe",
);
const portraitRecord = generated.records["portrait-original-catapult"];
const portraitPath =
  portraitRecord?.status === "ACCEPTED"
    ? portraitRecipe.output
    : portraitRecord?.status === "CANDIDATE"
      ? required(portraitRecord.candidate, "Catapult portrait candidate path")
      : undefined;
const portraitBytes =
  portraitPath === undefined
    ? undefined
    : await readFile(path.join(root, portraitPath));
const portraitSha256 =
  portraitBytes === undefined ? undefined : hash(portraitBytes);
const expectedPortraitHash =
  portraitRecord?.status === "ACCEPTED"
    ? portraitRecord.outputSha256
    : portraitRecord?.candidateSha256;
if (portraitSha256 !== expectedPortraitHash)
  throw new Error("Catapult portrait hash drifted");
const { data, info } = await sharp(bytes)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
if (info.width !== 384 || info.height !== 384)
  throw new Error("Catapult source must remain untrimmed 384x384");
const alpha = new Uint8Array(info.width * info.height);
const measuredBounds = measureBounds(
  data,
  info.width,
  info.height,
  info.channels,
);
if (
  record.alphaBounds === undefined ||
  measuredBounds.left !== record.alphaBounds.left ||
  measuredBounds.top !== record.alphaBounds.top ||
  measuredBounds.right !== record.alphaBounds.right ||
  measuredBounds.bottom !== record.alphaBounds.bottom
)
  throw new Error("Catapult recorded alpha bounds drifted");
for (let index = 0; index < alpha.length; index += 1)
  alpha[index] = data[index * info.channels + 3] ?? 0;

const displayScale = 0.24;
const baselineOffset = 18;
const anchor = { x: 192, y: 288 } as const;
const contacts = [
  { x: 142, y: 267, description: "left prominent wheel ground contact" },
  { x: 240, y: 309, description: "front prominent wheel ground contact" },
] as const;
const contactMidpoint = {
  x: (contacts[0].x + contacts[1].x) / 2,
  y: (contacts[0].y + contacts[1].y) / 2,
};
const directions = ["NORTH", "EAST", "SOUTH", "WEST"] as const;
const measurement = measure();
assertMeasurement();
await mkdir(reviewRoot, { recursive: true });
await sourceNativeSheet();
await zoomDprSheet();
await contextSheet();
await neighborSheet();
await denseOwnerStateSheet();
await comparisonUiSheet();
await portraitSheet();
await writeEvidence();

function measure() {
  const legacyArea = (128 * 74) / 2;
  const squareArea = 128 * 128;
  let opaqueArea = 0;
  const legacyOcclusion = emptyDirections();
  const squareOcclusion = emptyDirections();
  const legacyCenters = {
    NORTH: { x: 64, y: -37 },
    EAST: { x: 64, y: 37 },
    SOUTH: { x: -64, y: 37 },
    WEST: { x: -64, y: -37 },
  } as const;
  const squareCenters = {
    NORTH: { x: 0, y: -128 },
    EAST: { x: 128, y: 0 },
    SOUTH: { x: 0, y: 128 },
    WEST: { x: -128, y: 0 },
  } as const;
  for (let y = 0; y < 384; y += 1)
    for (let x = 0; x < 384; x += 1) {
      const opacity = (alpha[y * 384 + x] ?? 0) / 255;
      if (opacity === 0) continue;
      const area = opacity * displayScale * displayScale;
      opaqueArea += area;
      const sx = (x + 0.5 - anchor.x) * displayScale;
      const legacyY = (y + 0.5 - anchor.y) * displayScale;
      const squareY = legacyY + baselineOffset;
      for (const direction of directions) {
        const legacy = legacyCenters[direction];
        if (
          Math.abs(sx - legacy.x) / 64 + Math.abs(legacyY - legacy.y) / 37 <=
          1
        )
          legacyOcclusion[direction] += area;
        const square = squareCenters[direction];
        if (Math.abs(sx - square.x) <= 64 && Math.abs(squareY - square.y) <= 64)
          squareOcclusion[direction] += area;
      }
    }
  const placed = {
    left: round(64 + (measuredBounds.left - anchor.x) * displayScale),
    top: round(
      64 + baselineOffset + (measuredBounds.top - anchor.y) * displayScale,
    ),
    right: round(64 + (measuredBounds.right - anchor.x) * displayScale),
    bottom: round(
      64 + baselineOffset + (measuredBounds.bottom - anchor.y) * displayScale,
    ),
  };
  const legacyRatios = directionRatios(legacyOcclusion, legacyArea);
  return {
    sourceDimensions: { width: 384, height: 384 },
    alphaBounds: measuredBounds,
    preferredBounds: recipe.preferredBounds,
    normativePreferredBounds: { left: 30, top: 24, right: 354, bottom: 318 },
    hardBounds: recipe.hardBounds,
    anchor,
    displayScale,
    baselineOffsetCssPx: baselineOffset,
    deterministicFit: {
      fitOffsetXSourcePx: recipe.fitOffsetX ?? 0,
      fitOffsetYSourcePx: recipe.fitOffsetY ?? 0,
      preRepairCandidateSha256:
        "9b993ad52eb5aed9aea1e64a4288c7d67158028aeb50ee90e8cdb5fb8d1e4d83",
      method:
        "uniform Lanczos3 unit-fit into effective x30..354,y64..288 followed by (+50,+21) source-pixel translation",
    },
    wheelContacts: {
      method:
        "explicit individually inspected prominent-wheel ground contacts tied to the final source hash; not inferred from whole bounds or bottom-band centroid",
      points: contacts,
      midpoint: contactMidpoint,
      xDeltaFromAnchor: contactMidpoint.x - anchor.x,
      yDeltaFromAnchor: contactMidpoint.y - anchor.y,
    },
    historicalDiamondWithoutBaselineOffset: {
      visibleWidthRatio: round(
        ((measuredBounds.right - measuredBounds.left) * displayScale) / 128,
      ),
      visibleHeightRatio: round(
        ((measuredBounds.bottom - measuredBounds.top) * displayScale) / 74,
      ),
      opaqueAreaRatio: round(opaqueArea / legacyArea),
      adjacentOcclusionRatio: legacyRatios,
      maximumRearOcclusionRatio: round(
        Math.max(legacyRatios.NORTH, legacyRatios.WEST),
      ),
      preferredWidthRange: [0.5, 0.61],
      preferredHeightRange: [0.75, 0.95],
      meetsPreferredWidth:
        ((measuredBounds.right - measuredBounds.left) * displayScale) / 128 >=
          0.5 &&
        ((measuredBounds.right - measuredBounds.left) * displayScale) / 128 <=
          0.61,
      meetsPreferredHeight:
        ((measuredBounds.bottom - measuredBounds.top) * displayScale) / 74 >=
          0.75 &&
        ((measuredBounds.bottom - measuredBounds.top) * displayScale) / 74 <=
          0.95,
      preferredShortfallAcceptedForReview:
        "Fit prioritizes the normative actual wheel midpoint and hard bounds; minimum/native sheets retain the final CSS size for readability judgment.",
    },
    activeSquareWithBaselineOffset: {
      cellSizeCssPx: 128,
      placedAlphaBoundsCssPx: placed,
      noLeftOverflow: placed.left >= 0,
      noRightOverflow: placed.right <= 128,
      noBottomOverflow: placed.bottom <= 128,
      adjacentOcclusionRatio: directionRatios(squareOcclusion, squareArea),
    },
  };
}

function assertMeasurement(): void {
  const legacy = measurement.historicalDiamondWithoutBaselineOffset;
  const square = measurement.activeSquareWithBaselineOffset;
  if (
    Math.abs(measurement.wheelContacts.xDeltaFromAnchor) > 10 ||
    Math.abs(measurement.wheelContacts.yDeltaFromAnchor) > 6
  )
    throw new Error("Catapult actual wheel midpoint misses anchor tolerance");
  if (
    legacy.visibleWidthRatio > 0.66 ||
    legacy.visibleHeightRatio > 1.04 ||
    legacy.opaqueAreaRatio > 0.58 ||
    legacy.maximumRearOcclusionRatio > 0.12
  )
    throw new Error("Catapult historical siege maximum failed");
  if (
    !square.noLeftOverflow ||
    !square.noRightOverflow ||
    !square.noBottomOverflow
  )
    throw new Error("Catapult active-square containment failed");
}

async function sourceNativeSheet(): Promise<void> {
  const guide = Buffer.from(
    `<svg width="420" height="420" xmlns="http://www.w3.org/2000/svg"><rect x="18" y="18" width="384" height="384" fill="none" stroke="#79918b"/><rect x="${18 + measuredBounds.left}" y="${18 + measuredBounds.top}" width="${measuredBounds.right - measuredBounds.left}" height="${measuredBounds.bottom - measuredBounds.top}" fill="none" stroke="#ffe36d" stroke-width="2"/><circle cx="210" cy="306" r="5" fill="#ff5d68"/>${contacts.map(({ x, y }) => `<circle cx="${18 + x}" cy="${18 + y}" r="5" fill="#5de5cf"/>`).join("")}</svg>`,
  );
  const overlays: OverlayOptions[] = [
    {
      input: title(
        "Catapult source / enlarged / actual native and minimum",
        1500,
      ),
      left: 0,
      top: 8,
    },
    { input: bytes, left: 18, top: 88 },
    { input: guide, left: 0, top: 70 },
    {
      input: await sharp(bytes)
        .trim({ background: "#00000000" })
        .resize(420, 360, { fit: "inside" })
        .png()
        .toBuffer(),
      left: 450,
      top: 90,
    },
    { input: await isolated(1), left: 980, top: 190 },
    { input: await isolated(0.625), left: 1210, top: 207 },
    {
      input: caption(
        `source ${sourceSha256.slice(0, 12)} · alpha ${boundsText(measuredBounds)}`,
        520,
      ),
      left: 20,
      top: 505,
    },
    {
      input: caption(`contacts (142,267), (240,309) · midpoint (191,288)`, 520),
      left: 700,
      top: 505,
    },
  ];
  await canvas(1500, 570, overlays, "world-source-native-enlarged.png");
}

async function zoomDprSheet(): Promise<void> {
  const settings = [
    [0.625, 1],
    [0.625, 2],
    [1, 1],
    [1, 2],
    [1.75, 1],
    [1.75, 2],
  ] as const;
  const overlays: OverlayOptions[] = [
    {
      input: title("Actual CSS-sized square contexts · zoom and DPR", 2200),
      left: 0,
      top: 8,
    },
  ];
  for (const [index, [zoom, dpr]] of settings.entries()) {
    const backing = await squareContext("grass", zoom, dpr, index);
    const cssWidth = Math.round(192 * zoom);
    const cssHeight = Math.round(224 * zoom);
    const shown =
      dpr === 1
        ? backing
        : await sharp(backing).resize(cssWidth, cssHeight).png().toBuffer();
    overlays.push({
      input: shown,
      left: 20 + index * 360 + Math.round((340 - cssWidth) / 2),
      top: 100 + Math.round((390 - cssHeight) / 2),
    });
    overlays.push({
      input: caption(`${zoom}x DPR${dpr} · ${cssWidth}x${cssHeight} CSS`, 220),
      left: 25 + index * 360,
      top: 500,
    });
  }
  await canvas(2200, 560, overlays, "world-zoom-dpr-square.png");
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
    "dim",
  ] as const;
  const overlays: OverlayOptions[] = [
    {
      input: title(
        "Terrain / city / building / Road / owner / selection / damage / dim",
        2000,
      ),
      left: 0,
      top: 8,
    },
  ];
  for (const [index, context] of contexts.entries()) {
    overlays.push({
      input: await squareContext(context, 1, 1, index),
      left: 10 + index * 198,
      top: 80,
    });
    overlays.push({
      input: caption(context, 180),
      left: 18 + index * 198,
      top: 315,
    });
  }
  await canvas(2000, 365, overlays, "world-square-contexts.png");
}

async function neighborSheet(): Promise<void> {
  const overlays: OverlayOptions[] = [
    {
      input: title(
        "All-direction target visibility · 0.625x active square",
        800,
      ),
      left: 0,
      top: 8,
    },
    { input: await neighborGrid(), left: 80, top: 90 },
    {
      input: caption(
        JSON.stringify(
          measurement.activeSquareWithBaselineOffset.adjacentOcclusionRatio,
        ),
        430,
      ),
      left: 350,
      top: 210,
    },
  ];
  await canvas(800, 430, overlays, "world-square-all-direction-neighbors.png");
}

async function denseOwnerStateSheet(): Promise<void> {
  const overlays: OverlayOptions[] = [
    {
      input: title(
        "Dense units · four owners · selected / damaged / dim",
        1500,
      ),
      left: 0,
      top: 8,
    },
  ];
  const standard = [
    "warrior.png",
    "original-scout.png",
    "original-heavy.png",
    "original-lancer.png",
  ];
  for (const [index, file] of standard.entries())
    overlays.push(
      await placedExternalUnit(
        `public/assets/pixellab/units/${file}`,
        140 + index * 145,
        190,
        1,
      ),
    );
  overlays.push(await placedUnit(720, 190, 1));
  for (let owner = 0; owner < 4; owner += 1) {
    overlays.push({
      input: squareMark(128, owner, owner === 1),
      left: 820 + owner * 160,
      top: 110,
    });
    overlays.push(
      await placedUnit(884 + owner * 160, 174, 1, owner === 2 ? 0.45 : 1),
    );
    if (owner === 3)
      overlays.push({
        input: health(0.28, 1),
        left: 861 + owner * 160,
        top: 203,
      });
  }
  await canvas(1500, 340, overlays, "world-dense-units-owners-states.png");
}

async function comparisonUiSheet(): Promise<void> {
  const overlays: OverlayOptions[] = [
    {
      input: title("Catapult separation / hierarchy / UI previews", 1600),
      left: 0,
      top: 8,
    },
    await placedUnit(150, 205, 1),
    await placedExternalUnit(
      "public/assets/pixellab/units/original-breacher.png",
      360,
      205,
      1,
    ),
    await placedStructure(
      "public/assets/pixellab/terrain-square/original-forest-1.png",
      256,
      384,
      0.5,
      { x: 128, y: 256 },
      600,
      205,
      1,
    ),
    await placedStructure(
      "public/assets/pixellab/terrain-square/original-mountain-1.png",
      256,
      384,
      0.5,
      { x: 128, y: 256 },
      800,
      205,
      1,
    ),
    { input: panel(96, 96, "#f5efe2"), left: 980, top: 120 },
    { input: await portraitPreview(64), left: 996, top: 136 },
    { input: panel(112, 130, "#263d3b"), left: 1150, top: 103 },
    {
      input: await sharp(bytes)
        .resize(112, 130, { fit: "contain", background: "#00000000" })
        .png()
        .toBuffer(),
      left: 1150,
      top: 103,
    },
    { input: panel(112, 130, "#000000"), left: 1320, top: 103 },
    {
      input: await sharp(bytes)
        .resize(112, 130, { fit: "contain", background: "#00000000" })
        .png()
        .toBuffer(),
      left: 1320,
      top: 103,
    },
    { input: caption("Catapult", 160), left: 80, top: 275 },
    { input: caption("Breacher", 160), left: 300, top: 275 },
    { input: caption("Forest", 160), left: 535, top: 275 },
    { input: caption("Mountain", 160), left: 730, top: 275 },
    { input: caption("64px preview", 150), left: 960, top: 275 },
    { input: caption("112x130 WORLD PNG contain", 390), left: 1130, top: 275 },
  ];
  await canvas(1600, 340, overlays, "world-silhouette-hierarchy-ui.png");
}

async function portraitSheet(): Promise<void> {
  const preview = await portraitPreview(256);
  const backgrounds = ["#f5efe2", "#263d3b", "#000000"];
  const overlays: OverlayOptions[] = [
    {
      input: title(
        `Portrait source / nominal / UI world preview · ${portraitRecord?.status ?? "PRE_DERIVATION"}`,
        1400,
      ),
      left: 0,
      top: 8,
    },
    { input: preview, left: 40, top: 80 },
  ];
  for (const [index, background] of backgrounds.entries()) {
    overlays.push({
      input: panel(96, 96, background),
      left: 380 + index * 130,
      top: 145,
    });
    overlays.push({
      input: await portraitPreview(64),
      left: 396 + index * 130,
      top: 161,
    });
    overlays.push({
      input: panel(112, 130, background),
      left: 800 + index * 150,
      top: 128,
    });
    overlays.push({
      input: await sharp(bytes)
        .resize(112, 130, {
          fit: "contain",
          background: "#00000000",
        })
        .png()
        .toBuffer(),
      left: 800 + index * 150,
      top: 128,
    });
  }
  overlays.push({
    input: caption(
      `256x256 · ${portraitSha256?.slice(0, 12) ?? "pre-derivation"} · safe alpha 20..236`,
      430,
    ),
    left: 35,
    top: 355,
  });
  overlays.push({
    input: caption(
      "portrait at actual 64 CSS px · light / dark / high contrast",
      470,
    ),
    left: 350,
    top: 275,
  });
  overlays.push({
    input: caption(
      "untrimmed WORLD PNG in 112x130 contain · not portrait",
      520,
    ),
    left: 785,
    top: 275,
  });
  await canvas(1400, 410, overlays, "portrait-source-64-contexts.png");
}

async function squareContext(
  kind:
    | "grass"
    | "forest"
    | "mountain"
    | "city"
    | "building"
    | "road"
    | "owner"
    | "selected"
    | "damaged"
    | "dim",
  zoom: number,
  dpr: number,
  variant: number,
): Promise<Buffer> {
  const scale = zoom * dpr;
  const width = Math.round(192 * scale);
  const height = Math.round(224 * scale);
  const cell = Math.round(128 * scale);
  const left = Math.round(32 * scale);
  const top = Math.round(80 * scale);
  const centerX = left + cell / 2;
  const centerY = top + cell / 2;
  const terrainKind = kind === "forest" || kind === "mountain" ? kind : "grass";
  const overlays: OverlayOptions[] = [
    {
      input: await terrain(terrainKind, cell),
      left,
      top: terrainKind === "grass" ? top : top - Math.round(cell / 2),
    },
  ];
  if (kind === "road")
    overlays.push({
      input: await raster(
        "public/assets/pixellab/terrain-square/road-masks/road-mask-1111.png",
        cell,
        cell,
      ),
      left,
      top,
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
      left,
      top,
    });
  overlays.push(
    await placedUnit(centerX, centerY, scale, kind === "dim" ? 0.45 : 1),
  );
  if (kind === "city") {
    overlays.push({
      input: health(0.7, scale),
      left: Math.round(centerX - 23 * scale),
      top: Math.round(centerY - 49 * scale),
    });
    overlays.push({
      input: cityStatusBadge(scale),
      left: Math.round(centerX - 25 * scale),
      top: Math.round(centerY + 27 * scale),
    });
  }
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

async function neighborGrid(): Promise<Buffer> {
  const cell = 80;
  const overlays: OverlayOptions[] = [];
  for (let y = 0; y < 3; y += 1)
    for (let x = 0; x < 3; x += 1) {
      overlays.push({
        input: await terrain("grass", cell),
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
  overlays.push(await placedUnit(120, 120, 0.625));
  return sharp({
    create: { width: 240, height: 240, channels: 4, background: "#203332" },
  })
    .composite(overlays)
    .png()
    .toBuffer();
}

async function portraitPreview(size: number): Promise<Buffer> {
  const preview =
    portraitBytes !== undefined
      ? portraitBytes
      : await sharp(bytes)
          .trim({ background: "#00000000" })
          .resize(216, 216, { fit: "contain", background: "#00000000" })
          .extend({
            top: 20,
            bottom: 20,
            left: 20,
            right: 20,
            background: "#00000000",
          })
          .resize(256, 256, { fit: "contain" })
          .png()
          .toBuffer();
  return sharp(preview).resize(size, size, { fit: "contain" }).png().toBuffer();
}

async function isolated(zoom: number): Promise<Buffer> {
  return sharp(bytes)
    .resize(
      Math.round(384 * displayScale * zoom),
      Math.round(384 * displayScale * zoom),
    )
    .png()
    .toBuffer();
}

async function placedUnit(
  centerX: number,
  centerY: number,
  zoomDpr: number,
  opacity = 1,
): Promise<OverlayOptions> {
  const size = Math.max(1, Math.round(384 * displayScale * zoomDpr));
  return {
    input: await sharp(bytes)
      .resize(size, size)
      .modulate({ brightness: opacity })
      .png()
      .toBuffer(),
    left: Math.round(centerX - anchor.x * displayScale * zoomDpr),
    top: Math.round(
      centerY + baselineOffset * zoomDpr - anchor.y * displayScale * zoomDpr,
    ),
  };
}

async function placedExternalUnit(
  file: string,
  centerX: number,
  centerY: number,
  zoom: number,
): Promise<OverlayOptions> {
  const external = await readFile(path.join(root, file));
  const metadata = await sharp(external).metadata();
  const siege = metadata.width === 384;
  const scale = siege ? 0.24 : 0.25;
  const sourceAnchor = siege ? { x: 192, y: 288 } : { x: 128, y: 222 };
  return {
    input: await sharp(external)
      .resize(
        Math.round((metadata.width ?? 256) * scale * zoom),
        Math.round((metadata.height ?? 296) * scale * zoom),
      )
      .png()
      .toBuffer(),
    left: Math.round(centerX - sourceAnchor.x * scale * zoom),
    top: Math.round(
      centerY + baselineOffset * zoom - sourceAnchor.y * scale * zoom,
    ),
  };
}

async function placedStructure(
  file: string,
  width: number,
  height: number,
  display: number,
  sourceAnchor: { x: number; y: number },
  centerX: number,
  centerY: number,
  zoom: number,
): Promise<OverlayOptions> {
  return {
    input: await raster(
      file,
      Math.round(width * display * zoom),
      Math.round(height * display * zoom),
    ),
    left: Math.round(centerX - sourceAnchor.x * display * zoom),
    top: Math.round(centerY - sourceAnchor.y * display * zoom),
  };
}

async function terrain(
  kind: "grass" | "forest" | "mountain",
  cell: number,
): Promise<Buffer> {
  return raster(
    `public/assets/pixellab/terrain-square/original-${kind}-1.png`,
    cell,
    kind === "grass" ? cell : Math.round(cell * 1.5),
  );
}

async function raster(
  file: string,
  width: number,
  height: number,
): Promise<Buffer> {
  return sharp(path.join(root, file)).resize(width, height).png().toBuffer();
}

async function writeEvidence(): Promise<void> {
  const artifactNames = [
    "world-source-native-enlarged.png",
    "world-zoom-dpr-square.png",
    "world-square-contexts.png",
    "world-square-all-direction-neighbors.png",
    "world-dense-units-owners-states.png",
    "world-silhouette-hierarchy-ui.png",
    "portrait-source-64-contexts.png",
  ];
  const artifacts = await Promise.all(
    artifactNames.map(async (filename) => {
      const file = await readFile(path.join(reviewRoot, filename));
      return { filename, sha256: hash(file), bytes: file.byteLength };
    }),
  );
  if (
    portraitRecord?.status === "ACCEPTED" &&
    (portraitRecord.jobId !== undefined ||
      portraitRecord.providerOutputSha256 !== sourceSha256 ||
      portraitRecord.request?.postprocess !== "sprite-derived-portrait" ||
      portraitRecord.request.styleReference?.id !== "unit-original-catapult" ||
      portraitRecord.request.styleReference.sha256 !== sourceSha256 ||
      portraitSha256 !== portraitRecord.outputSha256)
  )
    throw new Error("Catapult sprite-derived portrait provenance mismatch");
  const portraitProvenance =
    portraitRecord?.status === "ACCEPTED"
      ? {
          id: "portrait-original-catapult",
          status: portraitRecord.status,
          outputSha256: portraitRecord.outputSha256,
          sourceSha256,
          postprocess: portraitRecord.request?.postprocess,
          providerRequestMade: false,
          providerOutputSha256FieldMeaning:
            "accepted world-source hash, not a provider portrait response",
        }
      : null;
  const portraitReview =
    portraitRecord === undefined
      ? null
      : {
          status: portraitRecord.status,
          path: portraitPath,
          sha256: portraitSha256,
          alphaBounds: portraitRecord.alphaBounds,
          sourceSha256: portraitRecord.request?.styleReference?.sha256,
          providerRequestMade: false,
        };
  const evidence = {
    schemaVersion: 1,
    status: "READY_FOR_ORCHESTRATOR_REVIEW",
    phase:
      portraitProvenance !== null
        ? "COMPLETE_WITH_PORTRAIT"
        : portraitRecord?.status === "CANDIDATE"
          ? "PORTRAIT_CANDIDATE_CHECKPOINT"
          : "WORLD_SAMPLE_CHECKPOINT",
    assetClass: "ruleset7-original-catapult-world-and-portrait",
    world: {
      id: "unit-original-catapult",
      status: record.status,
      sourcePath: worldPath,
      sourceSha256,
      providerOutputSha256: record.providerOutputSha256,
      jobId: record.jobId,
      rejectedAttempts: record.rejectedAttempts ?? [],
    },
    portraitProvenance,
    portraitReview,
    measurement,
    reviewCoverage: [
      "source 384x384, enlarged, actual native 92.16 CSS px, and actual minimum 57.6 CSS px",
      "0.625x, 1x, and 1.75x at DPR1 and DPR2 without panel-size normalization",
      "active-square Grass, Forest, Mountain, city, dense building, Road, all-direction neighbor and dense-unit contexts",
      "current-geometry city L3/population badge below the sprite and unit health above it remain visible",
      "all four renderer-owned owner colors plus selection, damage and dim states",
      "Catapult versus Breacher, Forest and Mountain silhouette hierarchy",
      portraitProvenance === null
        ? "pre-derivation 64px full-silhouette preview plus separate 112x130 untrimmed WORLD-PNG contain preview"
        : "accepted deterministic 256x256 portrait at nominal 64px plus separate 112x130 untrimmed WORLD-PNG contain preview",
      "manual review: southeast camera, northwest light, low-wide arm/bowl artillery, visible contacts, no baked projectile/status/ownership/shadow/scenery",
    ],
    workerVisualAssessment:
      "Compact low-wide throwing engine remains recognizable at minimum zoom, clearly differs from the forward Breacher ram, stays materially smaller than Forest/Mountain, and preserves city, adjacent target, label, unit and status visibility.",
    artifacts,
  };
  await writeFile(
    path.join(reviewRoot, "review-evidence.json"),
    await format(JSON.stringify(evidence), { parser: "json" }),
    "utf8",
  );
  await writeFile(
    path.join(reviewRoot, "README.md"),
    "# Ruleset 7 Catapult review\n\nGenerated by `npm run art:ruleset7-catapult-review`. Evidence preserves the individual world-sample checkpoint, deterministic source-fit provenance, explicit wheel contacts, historical diamond measurements without the active offset, active-square placement with the 18 CSS-pixel offset, actual zoom/DPR sizes, contextual readability, rejected attempts, and final sprite-derived portrait provenance when present.\n",
    "utf8",
  );
}

function emptyDirections(): Record<Direction, number> {
  return { NORTH: 0, EAST: 0, SOUTH: 0, WEST: 0 };
}
function directionRatios(
  values: Record<Direction, number>,
  area: number,
): Record<Direction, number> {
  return {
    NORTH: round(values.NORTH / area),
    EAST: round(values.EAST / area),
    SOUTH: round(values.SOUTH / area),
    WEST: round(values.WEST / area),
  };
}
function measureBounds(
  data: Buffer,
  width: number,
  height: number,
  channels: number,
): Bounds {
  let left = width,
    top = height,
    right = 0,
    bottom = 0;
  for (let y = 0; y < height; y += 1)
    for (let x = 0; x < width; x += 1) {
      if ((data[(y * width + x) * channels + 3] ?? 0) === 0) continue;
      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x + 1);
      bottom = Math.max(bottom, y + 1);
    }
  return { left, top, right, bottom };
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
function cityStatusBadge(scale: number): Buffer {
  const width = Math.round(50 * scale);
  const height = Math.round(30 * scale);
  const square = Math.max(3, Math.round(5 * scale));
  const gap = Math.max(1, Math.round(scale));
  const startX = Math.round((width - (square * 4 + gap * 3)) / 2);
  const squareY = Math.round(17 * scale);
  return Buffer.from(
    `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><rect x="1" y="1" width="${width - 2}" height="${height - 2}" fill="#142625" stroke="#f06762" stroke-width="${Math.max(1, 2 * scale)}"/><text x="${width / 2}" y="${Math.round(11 * scale)}" text-anchor="middle" fill="#fff" font-size="${Math.max(7, Math.round(9 * scale))}" font-family="Arial,sans-serif" font-weight="700">L3</text>${Array.from({ length: 4 }, (_, index) => `<rect x="${startX + index * (square + gap)}" y="${squareY}" width="${square}" height="${square}" fill="${index < 3 ? "#ffd85e" : "#203331"}" stroke="#d3e6e5" stroke-width="1"/>`).join("")}</svg>`,
  );
}
function panel(width: number, height: number, fill: string): Buffer {
  return Buffer.from(
    `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><rect x="1" y="1" width="${width - 2}" height="${height - 2}" rx="12" fill="${fill}" stroke="#8ba09a" stroke-width="2"/></svg>`,
  );
}
function title(text: string, width: number): Buffer {
  return Buffer.from(
    `<svg width="${width}" height="54" xmlns="http://www.w3.org/2000/svg"><text x="20" y="38" fill="#f5efe2" font-size="30" font-family="Arial,sans-serif" font-weight="700">${text}</text></svg>`,
  );
}
function caption(text: string, width: number): Buffer {
  return Buffer.from(
    `<svg width="${width}" height="42" xmlns="http://www.w3.org/2000/svg"><text x="4" y="24" fill="#f5efe2" font-size="17" font-family="Arial,sans-serif">${escapeXml(text)}</text></svg>`,
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
function boundsText(bounds: Bounds): string {
  return `${bounds.left},${bounds.top}..${bounds.right},${bounds.bottom}`;
}
function hash(value: Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}
function round(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}
function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
function required<T>(value: T | undefined, label: string): T {
  if (value === undefined) throw new Error(`Missing ${label}`);
  return value;
}
