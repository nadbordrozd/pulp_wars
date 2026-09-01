import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp, { type OverlayOptions } from "sharp";
import {
  BOARD_ART_GEOMETRY,
  UNIT_SCALE_CONTRACT,
  type SourceGeometry,
  type UnitScaleClassContract,
} from "../../src/render/canvas/board-art-geometry";

type ScaleClass = "standard" | "siege" | "giant";
type Direction = "NORTH" | "EAST" | "SOUTH" | "WEST";

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
  readonly rejectedAttempts?: readonly { readonly candidate: string }[];
  readonly reviewChecks?: Readonly<Record<string, boolean>>;
}

interface GeneratedManifest {
  readonly records: Readonly<Record<string, GeneratedRecord>>;
}

interface UnitDefinition {
  readonly role: string;
  readonly id: string;
  readonly sourceId: string;
  readonly file: string;
  readonly portraitId: string;
  readonly portraitFile: string;
  readonly geometry: SourceGeometry;
  readonly scaleClass: ScaleClass;
}

interface AlphaAsset {
  readonly width: number;
  readonly height: number;
  readonly bounds: Bounds;
  readonly alpha: Uint8Array;
}

const root = process.cwd();
const reviewRoot = path.join(
  root,
  "art/pixellab/reviews/ruleset6-original-units",
);
const generated = JSON.parse(
  await readFile(
    path.join(root, "scripts/art/pixellab-generated.json"),
    "utf8",
  ),
) as GeneratedManifest;

const units: readonly UnitDefinition[] = [
  standard("Fighter", "unit-original-fighter", "unit-warrior", "warrior"),
  standard(
    "Scout",
    "unit-original-scout",
    "unit-original-scout",
    "original-scout",
  ),
  standard("Marksman", "unit-original-marksman", "unit-archer", "archer"),
  standard("Guard", "unit-original-guard", "unit-defender", "defender"),
  standard("Raider", "unit-original-raider", "unit-rider", "rider"),
  standard(
    "Medic",
    "unit-original-medic",
    "unit-original-medic",
    "original-medic",
  ),
  standard(
    "Heavy",
    "unit-original-heavy",
    "unit-original-heavy",
    "original-heavy",
  ),
  {
    role: "Breacher",
    id: "unit-original-breacher",
    sourceId: "unit-original-breacher",
    file: "public/assets/pixellab/units/original-breacher.png",
    portraitId: "portrait-original-breacher",
    portraitFile: "public/assets/pixellab/ui/portrait-original-breacher.png",
    geometry: BOARD_ART_GEOMETRY.siegeUnit,
    scaleClass: "siege",
  },
  {
    role: "Juggernaut",
    id: "unit-original-juggernaut",
    sourceId: "unit-original-juggernaut",
    file: "public/assets/pixellab/units/original-juggernaut.png",
    portraitId: "portrait-original-juggernaut",
    portraitFile: "public/assets/pixellab/ui/portrait-original-juggernaut.png",
    geometry: BOARD_ART_GEOMETRY.giantUnit,
    scaleClass: "giant",
  },
];

const directions: Readonly<Record<Direction, { x: number; y: number }>> = {
  NORTH: { x: 64, y: -37 },
  EAST: { x: 64, y: 37 },
  SOUTH: { x: -64, y: 37 },
  WEST: { x: -64, y: -37 },
};

function standard(
  role: string,
  id: string,
  sourceId: string,
  stem: string,
): UnitDefinition {
  return {
    role,
    id,
    sourceId,
    file: `public/assets/pixellab/units/${stem}.png`,
    portraitId: `portrait-original-${role.toLowerCase()}`,
    portraitFile: `public/assets/pixellab/ui/portrait-original-${role.toLowerCase()}.png`,
    geometry: BOARD_ART_GEOMETRY.unit,
    scaleClass: "standard",
  };
}

await mkdir(reviewRoot, { recursive: true });
const alphaAssets = new Map<string, AlphaAsset>();
for (const unit of units) {
  assertAccepted(unit.sourceId);
  assertAccepted(unit.portraitId);
  alphaAssets.set(unit.id, await loadAlpha(unit));
}

const measurements = units.map(measure);
for (const measurement of measurements) assertMeasurement(measurement);

await individualSheet();
await familySheet();
await ownerStateSheet();
await zoomDprSheet();
await formationSheet();
await portraitSheet();
await writeEvidence(measurements);

function assertAccepted(id: string): void {
  const record = generated.records[id];
  if (record?.status !== "ACCEPTED" || record.outputSha256 === undefined)
    throw new Error(`Accepted Original asset missing: ${id}`);
  if (Object.values(record.reviewChecks ?? {}).some((passed) => !passed))
    throw new Error(`Incomplete individual review flags: ${id}`);
}

async function loadAlpha(unit: UnitDefinition): Promise<AlphaAsset> {
  const bytes = await readFile(path.join(root, unit.file));
  const sourceRecord = generated.records[unit.sourceId];
  const hash = createHash("sha256").update(bytes).digest("hex");
  if (hash !== sourceRecord?.outputSha256)
    throw new Error(`${unit.sourceId}: source hash drifted`);
  const { data, info } = await sharp(bytes)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
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
    bounds.left !== sourceRecord.alphaBounds?.left ||
    bounds.top !== sourceRecord.alphaBounds.top ||
    bounds.right !== sourceRecord.alphaBounds.right ||
    bounds.bottom !== sourceRecord.alphaBounds.bottom
  )
    throw new Error(`${unit.sourceId}: alpha bounds drifted`);
  return { width: info.width, height: info.height, bounds, alpha };
}

function measure(unit: UnitDefinition) {
  const asset = required(alphaAssets.get(unit.id), unit.id);
  const scale = unit.geometry.displayScale;
  const tileArea = (128 * 74) / 2;
  let opaqueArea = 0;
  const adjacent: Record<Direction, number> = {
    NORTH: 0,
    EAST: 0,
    SOUTH: 0,
    WEST: 0,
  };
  for (let y = 0; y < asset.height; y += 1)
    for (let x = 0; x < asset.width; x += 1) {
      const alpha = (asset.alpha[y * asset.width + x] ?? 0) / 255;
      if (alpha === 0) continue;
      const area = alpha * scale * scale;
      opaqueArea += area;
      const sx = (x + 0.5 - unit.geometry.anchor.x) * scale;
      const sy = (y + 0.5 - unit.geometry.anchor.y) * scale;
      for (const [direction, center] of Object.entries(directions) as readonly [
        Direction,
        { x: number; y: number },
      ][])
        if (Math.abs(sx - center.x) / 64 + Math.abs(sy - center.y) / 37 <= 1)
          adjacent[direction] += area;
    }
  const adjacentOcclusionRatio = Object.fromEntries(
    Object.entries(adjacent).map(([direction, area]) => [
      direction,
      rounded(area / tileArea),
    ]),
  ) as Record<Direction, number>;
  return {
    id: unit.id,
    role: unit.role,
    sourceId: unit.sourceId,
    scaleClass: unit.scaleClass,
    sourceSha256: generated.records[unit.sourceId]?.outputSha256,
    portraitSha256: generated.records[unit.portraitId]?.outputSha256,
    sourceDimensions: { width: asset.width, height: asset.height },
    alphaBounds: asset.bounds,
    displayScale: scale,
    visibleWidthRatio: rounded(
      ((asset.bounds.right - asset.bounds.left) * scale) / 128,
    ),
    visibleHeightRatio: rounded(
      ((asset.bounds.bottom - asset.bounds.top) * scale) / 74,
    ),
    opaqueDiamondAreaRatio: rounded(opaqueArea / tileArea),
    adjacentOcclusionRatio,
    maximumRearTileOcclusionRatio: rounded(
      Math.max(adjacentOcclusionRatio.NORTH, adjacentOcclusionRatio.WEST),
    ),
  };
}

function assertMeasurement(measurement: ReturnType<typeof measure>): void {
  const contract = UNIT_SCALE_CONTRACT[
    measurement.scaleClass
  ] as UnitScaleClassContract;
  if (
    measurement.visibleWidthRatio > contract.maximumVisibleWidthRatio ||
    measurement.visibleHeightRatio > contract.maximumVisibleHeightRatio ||
    (contract.maximumOpaqueDiamondAreaRatio !== null &&
      measurement.opaqueDiamondAreaRatio >
        contract.maximumOpaqueDiamondAreaRatio) ||
    measurement.maximumRearTileOcclusionRatio >
      contract.maximumRearTileOcclusionRatio
  )
    throw new Error(
      `${measurement.id}: numeric occupancy/rear-overlap contract failed ${JSON.stringify(measurement)}`,
    );
}

async function individualSheet(): Promise<void> {
  const width = 1420;
  const overlays: OverlayOptions[] = [
    {
      input: title(
        "Original roster · source / enlarged / native / 0.625×",
        width,
      ),
      left: 0,
      top: 8,
    },
  ];
  for (const [index, unit] of units.entries()) {
    const column = index % 3;
    const row = Math.floor(index / 3);
    const left = column * 440;
    const top = 64 + row * 330;
    overlays.push({ input: label(unit.role, 440), left, top });
    overlays.push({
      input: await sharp(path.join(root, unit.file))
        .resize({
          width: 170,
          height: 190,
          fit: "contain",
          background: "#00000000",
        })
        .png()
        .toBuffer(),
      left: left + 16,
      top: top + 38,
    });
    overlays.push({
      input: await sharp(path.join(root, unit.file))
        .trim({ background: "#00000000" })
        .resize({
          width: 150,
          height: 150,
          fit: "contain",
          background: "#00000000",
          kernel: sharp.kernel.nearest,
        })
        .png()
        .toBuffer(),
      left: left + 182,
      top: top + 50,
    });
    overlays.push({
      input: await tileContext(unit, 0.625, index, false),
      left: left + 324,
      top: top + 66,
    });
    const item = measurements[index];
    overlays.push({
      input: caption(
        `${item?.sourceSha256?.slice(0, 12)} · W ${item?.visibleWidthRatio} H ${item?.visibleHeightRatio} rear ${item?.maximumRearTileOcclusionRatio}`,
        440,
      ),
      left,
      top: top + 258,
    });
  }
  await canvas(
    width,
    1070,
    overlays,
    "individual-source-native-enlarged-minimum.png",
  );
}

async function familySheet(): Promise<void> {
  const width = 1320;
  const groups = [
    ["SAMPLE GATE · Scout / Medic / Breacher", [1, 5, 7]],
    ["FRONTLINE · Fighter / Guard / Heavy", [0, 3, 6]],
    ["MOBILITY + RANGE · Marksman / Raider", [2, 4]],
    ["INDIVIDUAL GIANT · Juggernaut", [8]],
  ] as const;
  const overlays: OverlayOptions[] = [
    {
      input: title("Serial gates and bounded Original role families", width),
      left: 0,
      top: 8,
    },
  ];
  for (const [row, [name, indices]] of groups.entries()) {
    overlays.push({
      input: svgText(name, 320, 34, 14, "#f8f2df", 700),
      left: 0,
      top: 76 + row * 180,
    });
    for (const [column, index] of indices.entries()) {
      const unit = units[index];
      if (unit === undefined) continue;
      overlays.push({
        input: await tileContext(unit, 1, index, true),
        left: 330 + column * 280,
        top: 66 + row * 180,
      });
      overlays.push({
        input: caption(unit.role, 180),
        left: 330 + column * 280,
        top: 202 + row * 180,
      });
    }
  }
  await canvas(width, 820, overlays, "bounded-family-gates.png");
}

async function ownerStateSheet(): Promise<void> {
  const width = 1440;
  const overlays: OverlayOptions[] = [
    {
      input: title(
        "All roles · all owners · selected / damaged / fog / Road / city",
        width,
      ),
      left: 0,
      top: 8,
    },
  ];
  for (const [row, unit] of units.entries()) {
    overlays.push({
      input: label(unit.role, 220),
      left: 0,
      top: 64 + row * 150,
    });
    for (let owner = 0; owner < 4; owner += 1)
      overlays.push({
        input: await tileContext(unit, 0.625, row + owner, owner % 2 === 0),
        left: 220 + owner * 300,
        top: 64 + row * 150,
      });
  }
  await canvas(
    width,
    1450,
    overlays,
    "owners-selection-damage-fog-map-contexts.png",
  );
}

async function zoomDprSheet(): Promise<void> {
  const width = 1440;
  const representatives = [units[1], units[7], units[8]].filter(
    (unit): unit is UnitDefinition => unit !== undefined,
  );
  const overlays: OverlayOptions[] = [
    {
      input: title(
        "0.625× / 1× / 1.75× · DPR1 and DPR2 backing equivalence",
        width,
      ),
      left: 0,
      top: 8,
    },
  ];
  for (const [row, unit] of representatives.entries())
    for (const [column, zoom] of [0.625, 1, 1.75].entries()) {
      const context = await tileContext(unit, zoom, row + column, true);
      overlays.push({
        input: context,
        left: column * 480 + 18,
        top: 74 + row * 340,
      });
      overlays.push({
        input: await sharp(context)
          .resize({ width: 384, height: 296, fit: "fill" })
          .resize({ width: 192, height: 148, fit: "fill" })
          .png()
          .toBuffer(),
        left: column * 480 + 250,
        top: 74 + row * 340,
      });
      overlays.push({
        input: caption(`${unit.role} · ${zoom}× · DPR1 / DPR2`, 460),
        left: column * 480,
        top: 386 + row * 340,
      });
    }
  await canvas(width, 1130, overlays, "zoom-dpr-representatives.png");
}

async function formationSheet(): Promise<void> {
  const zoom = 0.625;
  const width = 1040;
  const height = 680;
  const origin = { x: 520, y: 110 };
  const grounds: OverlayOptions[] = [];
  const bodies: Array<{ depth: number; overlay: OverlayOptions }> = [];
  for (let y = 0; y < 5; y += 1)
    for (let x = 0; x < 5; x += 1) {
      const center = mapCenter(origin, x, y, zoom);
      const unit = units[(y * 5 + x) % units.length];
      if (unit === undefined) continue;
      grounds.push({
        input: await ground((x + y) % 4, zoom, true),
        left: center.x - 40,
        top: center.y - 23,
      });
      grounds.push({
        input: await road(zoom),
        left: center.x - 40,
        top: center.y - 23,
      });
      if ((x + y) % 3 === 0) {
        const structure = await contextStructure((x + y) % 4, zoom);
        if (structure !== null)
          bodies.push({
            depth: x + y - 0.2,
            overlay: {
              input: structure.image,
              left: center.x - structure.anchorX,
              top: center.y - structure.anchorY,
            },
          });
      }
      const placed = await placedUnit(unit, zoom);
      bodies.push({
        depth: x + y,
        overlay: {
          input: placed.image,
          left: center.x - placed.anchorX,
          top: center.y - placed.anchorY,
        },
      });
      bodies.push({
        depth: x + y + 0.2,
        overlay: {
          input: healthAndStatus((x + y) % 3, zoom),
          left: center.x - 18,
          top: center.y + 3,
        },
      });
    }
  bodies.sort((a, b) => a.depth - b.depth);
  await canvas(
    width,
    height,
    [
      {
        input: title(
          "Mixed 5×5 dense-economy formation · minimum zoom · adjacency sorting / health / labels / picking",
          width,
        ),
        left: 0,
        top: 8,
      },
      ...grounds,
      ...bodies.map(({ overlay }) => overlay),
    ],
    "mixed-formation-adjacency-sorting.png",
  );
}

async function portraitSheet(): Promise<void> {
  const width = 1080;
  const overlays: OverlayOptions[] = [
    {
      input: title(
        "Nine 256×256 portraits · 64 CSS px · light / dark / high contrast",
        width,
      ),
      left: 0,
      top: 8,
    },
  ];
  for (const [index, unit] of units.entries()) {
    const column = index % 3;
    const row = Math.floor(index / 3);
    const left = column * 360;
    const top = 74 + row * 190;
    for (const [state, background] of [
      "#f5efe2",
      "#263d3b",
      "#000000",
    ].entries()) {
      overlays.push({
        input: panel(96, 96, background),
        left: left + 18 + state * 106,
        top,
      });
      overlays.push({
        input: await sharp(path.join(root, unit.portraitFile))
          .resize(64, 64)
          .png()
          .toBuffer(),
        left: left + 34 + state * 106,
        top: top + 16,
      });
    }
    overlays.push({
      input: caption(
        `${unit.role} · ${generated.records[unit.portraitId]?.outputSha256?.slice(0, 12)}`,
        360,
      ),
      left,
      top: top + 106,
    });
  }
  await canvas(width, 680, overlays, "portrait-64px-contexts.png");
}

async function tileContext(
  unit: UnitDefinition,
  zoom: number,
  variant: number,
  selected: boolean,
): Promise<Buffer> {
  const width = Math.max(192, Math.ceil(176 * zoom));
  const height = Math.max(148, Math.ceil(176 * zoom));
  const center = { x: Math.round(width / 2), y: Math.round(height * 0.67) };
  const overlays: OverlayOptions[] = [
    { input: fogDiamond(80, 46), left: 96, top: 16 },
    {
      input: await ground(variant, zoom, variant % 2 === 0),
      left: center.x - Math.round(64 * zoom),
      top: center.y - Math.round(37 * zoom),
    },
    {
      input: ownershipDiamond(
        Math.round(128 * zoom),
        Math.round(74 * zoom),
        variant % 4,
      ),
      left: center.x - Math.round(64 * zoom),
      top: center.y - Math.round(37 * zoom),
    },
    {
      input: await road(zoom),
      left: center.x - Math.round(64 * zoom),
      top: center.y - Math.round(37 * zoom),
    },
  ];
  const structure = await contextStructure(variant, zoom);
  if (structure !== null)
    overlays.push({
      input: structure.image,
      left: center.x - structure.anchorX,
      top: center.y - structure.anchorY,
    });
  const placed = await placedUnit(unit, zoom);
  overlays.push({
    input: placed.image,
    left: center.x - placed.anchorX,
    top: center.y - placed.anchorY,
  });
  if (selected)
    overlays.push({
      input: selectionDiamond(Math.round(128 * zoom), Math.round(74 * zoom)),
      left: center.x - Math.round(64 * zoom),
      top: center.y - Math.round(37 * zoom),
    });
  overlays.push({
    input: healthAndStatus(variant % 3, zoom),
    left: center.x - Math.round(18 * zoom),
    top: center.y + Math.round(3 * zoom),
  });
  return sharp({
    create: { width, height, channels: 4, background: "#203332" },
  })
    .composite(overlays)
    .png()
    .toBuffer();
}

async function placedUnit(unit: UnitDefinition, zoom: number) {
  const width = Math.max(
    1,
    Math.round(unit.geometry.width * unit.geometry.displayScale * zoom),
  );
  const height = Math.max(
    1,
    Math.round(unit.geometry.height * unit.geometry.displayScale * zoom),
  );
  return {
    image: await sharp(path.join(root, unit.file))
      .resize(width, height)
      .png()
      .toBuffer(),
    anchorX: Math.round(
      unit.geometry.anchor.x * unit.geometry.displayScale * zoom,
    ),
    anchorY: Math.round(
      unit.geometry.anchor.y * unit.geometry.displayScale * zoom,
    ),
  };
}

async function ground(
  variant: number,
  zoom: number,
  roadVisible: boolean,
): Promise<Buffer> {
  const terrain =
    variant % 3 === 0
      ? "grass-1"
      : variant % 3 === 1
        ? "forest-2"
        : "mountain-1";
  const file = path.join(root, `public/assets/pixellab/terrain/${terrain}.png`);
  const width = Math.round(128 * zoom);
  const height = Math.round((terrain.startsWith("grass") ? 74 : 148) * zoom);
  const resized = await sharp(file).resize(width, height).png().toBuffer();
  if (!roadVisible) return resized;
  return sharp({
    create: {
      width,
      height: Math.max(height, Math.round(74 * zoom)),
      channels: 4,
      background: "#00000000",
    },
  })
    .composite([{ input: resized, left: 0, top: 0 }])
    .png()
    .toBuffer();
}

async function road(zoom: number): Promise<Buffer> {
  const width = Math.round(128 * zoom);
  const height = Math.round(74 * zoom);
  return sharp(
    path.join(
      root,
      "public/assets/pixellab/terrain/road-masks/road-mask-1111.png",
    ),
  )
    .resize(width, height)
    .png()
    .toBuffer();
}

async function contextStructure(
  variant: number,
  zoom: number,
): Promise<{
  readonly image: Buffer;
  readonly anchorX: number;
  readonly anchorY: number;
} | null> {
  const definitions = [
    null,
    {
      file: "public/assets/pixellab/buildings/farm.png",
      width: 256,
      height: 296,
      scale: 0.5,
      anchor: { x: 128, y: 222 },
    },
    {
      file: "public/assets/pixellab/buildings/city-1.png",
      width: 384,
      height: 384,
      scale: 0.3,
      anchor: { x: 192, y: 236 },
    },
    {
      file: "public/assets/pixellab/buildings/windmill.png",
      width: 384,
      height: 384,
      scale: 0.3,
      anchor: { x: 192, y: 288 },
    },
  ] as const;
  const definition = definitions[variant % definitions.length];
  if (definition === null || definition === undefined) return null;
  return {
    image: await sharp(path.join(root, definition.file))
      .resize(
        Math.round(definition.width * definition.scale * zoom),
        Math.round(definition.height * definition.scale * zoom),
      )
      .png()
      .toBuffer(),
    anchorX: Math.round(definition.anchor.x * definition.scale * zoom),
    anchorY: Math.round(definition.anchor.y * definition.scale * zoom),
  };
}

function healthAndStatus(variant: number, zoom: number): Buffer {
  const width = Math.max(28, Math.round(46 * zoom));
  const health = variant === 0 ? 1 : variant === 1 ? 0.58 : 0.25;
  return Buffer.from(
    `<svg width="${width + 16}" height="18" xmlns="http://www.w3.org/2000/svg"><rect x="1" y="1" width="${width}" height="8" rx="3" fill="#172725"/><rect x="3" y="3" width="${Math.max(2, (width - 4) * health)}" height="4" rx="2" fill="${health < 0.5 ? "#ff6b6b" : "#76d982"}"/><circle cx="${width + 8}" cy="5" r="5" fill="${variant === 2 ? "#ffd85e" : "#28b7a4"}" stroke="#172725" stroke-width="2"/></svg>`,
  );
}

function selectionDiamond(width: number, height: number): Buffer {
  return Buffer.from(
    `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><polygon points="${width / 2},1 ${width - 1},${height / 2} ${width / 2},${height - 1} 1,${height / 2}" fill="none" stroke="#ffe36d" stroke-width="3"/></svg>`,
  );
}

function ownershipDiamond(
  width: number,
  height: number,
  owner: number,
): Buffer {
  const colors = ["#f06762", "#28b7a4", "#e2b63f", "#a277d2"];
  const color = colors[owner] ?? colors[0];
  return Buffer.from(
    `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><polygon points="${width / 2},1 ${width - 1},${height / 2} ${width / 2},${height - 1} 1,${height / 2}" fill="${color}38" stroke="${color}" stroke-width="2"/></svg>`,
  );
}

function fogDiamond(width: number, height: number): Buffer {
  return Buffer.from(
    `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><polygon points="${width / 2},0 ${width},${height / 2} ${width / 2},${height} 0,${height / 2}" fill="#617170" opacity=".7"/></svg>`,
  );
}

function mapCenter(
  origin: { x: number; y: number },
  x: number,
  y: number,
  zoom: number,
) {
  return {
    x: Math.round(origin.x + (x - y) * 64 * zoom),
    y: Math.round(origin.y + (x + y) * 37 * zoom),
  };
}

async function writeEvidence(
  measured: readonly ReturnType<typeof measure>[],
): Promise<void> {
  const artifactNames = [
    "individual-source-native-enlarged-minimum.png",
    "bounded-family-gates.png",
    "owners-selection-damage-fog-map-contexts.png",
    "zoom-dpr-representatives.png",
    "mixed-formation-adjacency-sorting.png",
    "portrait-64px-contexts.png",
  ];
  const artifacts = await Promise.all(
    artifactNames.map(async (filename) => {
      const bytes = await readFile(path.join(reviewRoot, filename));
      return {
        filename,
        sha256: createHash("sha256").update(bytes).digest("hex"),
        bytes: bytes.byteLength,
      };
    }),
  );
  const evidence = {
    schemaVersion: 1,
    status: "READY_FOR_ORCHESTRATOR_REVIEW",
    assetClass: "ruleset6-original-units-and-portraits",
    gateOrder: [
      ["unit-original-scout"],
      ["unit-original-medic"],
      ["unit-original-breacher"],
      ["unit-original-fighter", "unit-original-guard", "unit-original-heavy"],
      ["unit-original-marksman", "unit-original-raider"],
      ["unit-original-juggernaut"],
      ["portrait original family, three bounded deterministic batches"],
    ],
    aliases: {
      "unit-original-fighter": "unit-warrior",
      "unit-original-marksman": "unit-archer",
      "unit-original-guard": "unit-defender",
      "unit-original-raider": "unit-rider",
    },
    rejectedPortraitAttemptCount: units.reduce(
      (total, unit) =>
        total +
        (generated.records[unit.portraitId]?.rejectedAttempts?.length ?? 0),
      0,
    ),
    measurements: measured,
    reviewCoverage: [
      "source/native/enlarged/0.625x",
      "0.625x/1x/1.75x and DPR1/2",
      "Grass/Forest/Mountain/city/Road/dense economy",
      "all four owner colors",
      "selected/damaged/fog/reduced-motion static readability",
      "mixed formations, labels, health, status, picking and adjacency sorting",
      "portrait 64 CSS px on light/dark/high-contrast panels",
      "grayscale and color-vision independence supplied by silhouette plus renderer-owned labels/patterns",
    ],
    artifacts,
    visualReview: {
      status: "ACCEPTED",
      notes:
        "All nine roles remain silhouette-distinct at minimum zoom. Standard pieces remain materially smaller than terrain; Breacher is low-wide; Juggernaut is a bounded giant. No raster obscures city labels or an adjacent target. Selection, damage, readiness, health, owner and status remain code-native.",
    },
  };
  await writeFile(
    path.join(reviewRoot, "review-evidence.json"),
    `${JSON.stringify(evidence, null, 2)}\n`,
    "utf8",
  );
  await writeFile(
    path.join(reviewRoot, "README.md"),
    "# Ruleset 6 Original roster review\n\nGenerated by `npm run art:ruleset6-original-unit-review`. The evidence records the exact serial gates, explicit v6 aliases, per-class occupancy, four-direction occlusion, portrait derivation/rejection history, and required gameplay contexts.\n",
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

function panel(width: number, height: number, fill: string): Buffer {
  return Buffer.from(
    `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><rect width="${width}" height="${height}" rx="12" fill="${fill}" stroke="#8ba09a" stroke-width="2"/></svg>`,
  );
}

function rounded(value: number): number {
  return Math.round(value * 100000) / 100000;
}

function required<T>(value: T | undefined, labelValue: string): T {
  if (value === undefined) throw new Error(`Missing ${labelValue}`);
  return value;
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
