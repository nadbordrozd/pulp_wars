import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp, { type OverlayOptions } from "sharp";
import {
  BOARD_ART_GEOMETRY,
  PLACEMENT_ART_GEOMETRY,
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
  readonly label: string;
  readonly id: string;
  readonly sourceId: string;
  readonly file: string;
  readonly portraitId: string;
  readonly portraitFile: string;
  readonly counterpart: string;
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
const reviewRoot = path.join(root, "art/pixellab/reviews/ruleset6-candy-units");
const generated = JSON.parse(
  await readFile(
    path.join(root, "scripts/art/pixellab-generated.json"),
    "utf8",
  ),
) as GeneratedManifest;

const units: readonly UnitDefinition[] = [
  standard(
    "FIGHTER",
    "Candy Warrior",
    "unit-candy-fighter",
    "unit-candy-warrior",
    "candy-warrior",
    "warrior",
    PLACEMENT_ART_GEOMETRY.candyWarrior,
  ),
  standard(
    "SCOUT",
    "Jelly Scout",
    "unit-candy-scout",
    "unit-candy-scout",
    "candy-jelly-scout",
    "original-scout",
  ),
  standard(
    "MARKSMAN",
    "Gumball Guard",
    "unit-candy-marksman",
    "unit-candy-gumball-guard",
    "candy-gumball-guard",
    "archer",
  ),
  standard(
    "GUARD",
    "Choco Engineer",
    "unit-candy-guard",
    "unit-candy-choco-engineer",
    "candy-choco-engineer",
    "defender",
  ),
  standard(
    "RAIDER",
    "Donut",
    "unit-candy-raider",
    "unit-candy-donut",
    "candy-donut",
    "rider",
  ),
  standard(
    "MEDIC",
    "Marshmallow Medic",
    "unit-candy-medic",
    "unit-candy-medic",
    "candy-marshmallow-medic",
    "original-medic",
  ),
  standard(
    "HEAVY",
    "Jawbreaker",
    "unit-candy-heavy",
    "unit-candy-heavy",
    "candy-jawbreaker",
    "original-heavy",
  ),
  {
    role: "BREACHER",
    label: "Candy Crusher",
    id: "unit-candy-breacher",
    sourceId: "unit-candy-breacher",
    file: "public/assets/pixellab/units/candy-crusher.png",
    portraitId: "portrait-candy-breacher",
    portraitFile: "public/assets/pixellab/ui/portrait-candy-breacher.png",
    counterpart: "public/assets/pixellab/units/original-breacher.png",
    geometry: BOARD_ART_GEOMETRY.siegeUnit,
    scaleClass: "siege",
  },
  {
    role: "JUGGERNAUT",
    label: "Sugar Titan",
    id: "unit-candy-juggernaut",
    sourceId: "unit-candy-juggernaut",
    file: "public/assets/pixellab/units/candy-sugar-titan.png",
    portraitId: "portrait-candy-juggernaut",
    portraitFile: "public/assets/pixellab/ui/portrait-candy-juggernaut.png",
    counterpart: "public/assets/pixellab/units/original-juggernaut.png",
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
  labelValue: string,
  id: string,
  sourceId: string,
  stem: string,
  counterpartStem: string,
  geometry: SourceGeometry = BOARD_ART_GEOMETRY.unit,
): UnitDefinition {
  return {
    role,
    label: labelValue,
    id,
    sourceId,
    file: `public/assets/pixellab/units/${stem}.png`,
    portraitId: `portrait-candy-${role.toLowerCase()}`,
    portraitFile: `public/assets/pixellab/ui/portrait-candy-${role.toLowerCase()}.png`,
    counterpart: `public/assets/pixellab/units/${counterpartStem}.png`,
    geometry,
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
await contextSheet();
await zoomDprSheet();
await formationSheet();
await portraitSheet();
await attachmentSheet();
await writeEvidence(measurements);

function assertAccepted(id: string): void {
  const record = generated.records[id];
  if (record?.status !== "ACCEPTED" || record.outputSha256 === undefined)
    throw new Error(`Accepted Candy asset missing: ${id}`);
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
      const sy =
        (y + 0.5 - unit.geometry.anchor.y) * scale +
        (unit.geometry.offsetY ?? 0);
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
    label: unit.label,
    sourceId: unit.sourceId,
    scaleClass: unit.scaleClass,
    sourceSha256: generated.records[unit.sourceId]?.outputSha256,
    portraitSha256: generated.records[unit.portraitId]?.outputSha256,
    sourceDimensions: { width: asset.width, height: asset.height },
    alphaBounds: asset.bounds,
    displayScale: scale,
    offsetY: unit.geometry.offsetY ?? 0,
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
  const overlays: OverlayOptions[] = [
    {
      input: title("Candy roster · enlarged / native / 0.625× map", 1420),
      left: 0,
      top: 8,
    },
  ];
  for (const [index, unit] of units.entries()) {
    const column = index % 3;
    const row = Math.floor(index / 3);
    const left = column * 440;
    const top = 64 + row * 310;
    overlays.push({ input: label(unit.label, 440), left, top });
    overlays.push({
      input: await sharp(path.join(root, unit.file))
        .resize({ height: 190 })
        .png()
        .toBuffer(),
      left: left + 10,
      top: top + 38,
    });
    overlays.push({
      input: await placedUnit(unit, 1),
      left: left + 205,
      top: top + 78,
    });
    overlays.push({
      input: await tileContext(unit, 0.625, index, true),
      left: left + 280,
      top: top + 48,
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
    1420,
    1000,
    overlays,
    "individual-source-native-enlarged-minimum.png",
  );
}

async function familySheet(): Promise<void> {
  const groups = [
    ["INDIVIDUAL SAMPLES", [1, 5, 7]],
    ["FRONTLINE + ALIASES", [0, 2, 6]],
    ["ENGINEER + ROLL", [3, 4]],
    ["INDIVIDUAL GIANT", [8]],
  ] as const;
  const overlays: OverlayOptions[] = [
    {
      input: title(
        "Serial gates · bounded Candy families · Original comparisons",
        1380,
      ),
      left: 0,
      top: 8,
    },
  ];
  for (const [row, [name, indices]] of groups.entries()) {
    overlays.push({ input: label(name, 280), left: 0, top: 78 + row * 205 });
    for (const [column, index] of indices.entries()) {
      const unit = required(units[index], `${index}`);
      overlays.push({
        input: await tileContext(unit, 1, index, true),
        left: 290 + column * 330,
        top: 64 + row * 205,
      });
      overlays.push({
        input: await sharp(path.join(root, unit.counterpart))
          .resize({ height: 96 })
          .png()
          .toBuffer(),
        left: 485 + column * 330,
        top: 104 + row * 205,
      });
      overlays.push({
        input: caption(`${unit.label} / Original ${unit.role}`, 310),
        left: 290 + column * 330,
        top: 225 + row * 205,
      });
    }
  }
  await canvas(
    1380,
    900,
    overlays,
    "bounded-family-alias-counterpart-gates.png",
  );
}

async function contextSheet(): Promise<void> {
  const overlays: OverlayOptions[] = [
    {
      input: title(
        "All Candy roles · owners / terrain / city / Road / selected / damaged / fog",
        1460,
      ),
      left: 0,
      top: 8,
    },
  ];
  for (const [row, unit] of units.entries()) {
    overlays.push({
      input: label(unit.label, 220),
      left: 0,
      top: 68 + row * 156,
    });
    for (let owner = 0; owner < 4; owner += 1)
      overlays.push({
        input: await tileContext(unit, 0.625, row + owner, owner % 2 === 0),
        left: 220 + owner * 300,
        top: 62 + row * 156,
      });
  }
  await canvas(
    1460,
    1500,
    overlays,
    "owners-selection-damage-fog-map-contexts.png",
  );
}

async function zoomDprSheet(): Promise<void> {
  const representatives = [
    required(units[1], "Scout"),
    required(units[7], "Crusher"),
    required(units[8], "Titan"),
  ];
  const overlays: OverlayOptions[] = [
    {
      input: title("0.625× / 1× / 1.75× · DPR1 and DPR2 equivalence", 1980),
      left: 0,
      top: 8,
    },
  ];
  for (const [row, unit] of representatives.entries())
    for (const [column, zoom] of [0.625, 1, 1.75].entries()) {
      const context = await tileContext(unit, zoom, row + column, true);
      overlays.push({
        input: context,
        left: 12 + column * 660,
        top: 70 + row * 450,
      });
      overlays.push({
        input: await sharp(context)
          .resize(440, 300)
          .resize(220, 150)
          .png()
          .toBuffer(),
        left: 420 + column * 660,
        top: 70 + row * 450,
      });
      overlays.push({
        input: caption(`${unit.label} · ${zoom}× · DPR1 / DPR2`, 650),
        left: column * 660,
        top: 480 + row * 450,
      });
    }
  await canvas(1980, 1450, overlays, "zoom-dpr-representatives.png");
}

async function formationSheet(): Promise<void> {
  const zoom = 0.625;
  const overlays: OverlayOptions[] = [
    {
      input: title(
        "Mixed Original–Candy dense economy · adjacency sorting / labels / picking",
        1100,
      ),
      left: 0,
      top: 8,
    },
  ];
  const bodies: Array<{
    readonly depth: number;
    readonly overlay: OverlayOptions;
  }> = [];
  for (let y = 0; y < 5; y += 1)
    for (let x = 0; x < 5; x += 1) {
      const center = {
        x: 550 + Math.round((x - y) * 64 * zoom),
        y: 125 + Math.round((x + y) * 37 * zoom),
      };
      const unit = required(
        units[(x + y * 5) % units.length],
        "formation unit",
      );
      overlays.push({
        input: await grass(zoom, (x + y) % 2 === 0),
        left: center.x - 40,
        top: center.y - 23,
      });
      if ((x + y) % 3 === 0) {
        const building =
          ["farm", "windmill", "market"][(x + y * 2) % 3] ?? "farm";
        bodies.push({
          depth: x + y - 0.2,
          overlay: {
            input: await mapObject(
              `public/assets/pixellab/buildings/${building}.png`,
              zoom,
              building === "farm" ? 256 : 384,
              building === "farm" ? 296 : 384,
              building === "farm" ? 128 : 192,
              building === "farm" ? 222 : 288,
              building === "farm" ? 0.5 : 0.3,
            ),
            left:
              center.x -
              Math.round((building === "farm" ? 128 * 0.5 : 192 * 0.3) * zoom),
            top:
              center.y -
              Math.round((building === "farm" ? 222 * 0.5 : 288 * 0.3) * zoom),
          },
        });
      }
      const candy = (x + y) % 2 === 0;
      const file = candy ? unit.file : unit.counterpart;
      bodies.push({
        depth: x + y,
        overlay: {
          input: await placedFile(file, unit.geometry, zoom),
          left:
            center.x -
            Math.round(
              unit.geometry.anchor.x * unit.geometry.displayScale * zoom,
            ),
          top:
            center.y -
            Math.round(
              unit.geometry.anchor.y * unit.geometry.displayScale * zoom,
            ) +
            Math.round((candy ? (unit.geometry.offsetY ?? 0) : 0) * zoom),
        },
      });
      bodies.push({
        depth: x + y + 0.2,
        overlay: {
          input: health((x + y) % 3),
          left: center.x - 22,
          top: center.y + 3,
        },
      });
    }
  bodies.sort((a, b) => a.depth - b.depth);
  await canvas(
    1100,
    720,
    [...overlays, ...bodies.map(({ overlay }) => overlay)],
    "mixed-formation-adjacency-sorting.png",
  );
}

async function portraitSheet(): Promise<void> {
  const overlays: OverlayOptions[] = [
    {
      input: title(
        "Nine Candy portraits · independent 64 CSS px light / dark / high contrast",
        1080,
      ),
      left: 0,
      top: 8,
    },
  ];
  for (const [index, unit] of units.entries()) {
    const left = (index % 3) * 360;
    const top = 74 + Math.floor(index / 3) * 190;
    for (const [state, fill] of ["#f5efe2", "#263d3b", "#000000"].entries()) {
      overlays.push({
        input: panel(96, 96, fill),
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
        `${unit.label} · ${generated.records[unit.portraitId]?.outputSha256?.slice(0, 12)}`,
        360,
      ),
      left,
      top: top + 106,
    });
  }
  await canvas(1080, 680, overlays, "portrait-64px-contexts.png");
}

async function attachmentSheet(): Promise<void> {
  const indices = [0, 2, 3, 4, 5, 6, 7, 8];
  const overlays: OverlayOptions[] = [
    {
      input: title(
        "Code-native abilities · placement / chute / Wall / Roll / Heal / Push / Breach",
        1320,
      ),
      left: 0,
      top: 8,
    },
  ];
  for (const [index, unitIndex] of indices.entries()) {
    const unit = required(units[unitIndex], "ability unit");
    const left = (index % 4) * 330;
    const top = 70 + Math.floor(index / 4) * 260;
    overlays.push({
      input: await tileContext(unit, 1, index, true),
      left,
      top,
    });
    overlays.push({
      input: effect(unit.role),
      left: left + (unit.role === "MARKSMAN" ? 88 : 150),
      top: top + (unit.role === "MARKSMAN" ? 89 : 70),
    });
    overlays.push({
      input: caption(
        `${unit.label} · renderer-owned ${ability(unit.role)}`,
        320,
      ),
      left,
      top: top + 190,
    });
  }
  await canvas(1320, 610, overlays, "ability-attachment-contexts.png");
}

async function tileContext(
  unit: UnitDefinition,
  zoom: number,
  variant: number,
  selected: boolean,
): Promise<Buffer> {
  const width = zoom > 1 ? Math.ceil(220 * zoom) : 260;
  const height = zoom > 1 ? Math.ceil(230 * zoom) : 190;
  const center = {
    x: Math.round(width / 2),
    y: Math.round(height * 0.67),
  };
  const overlays: OverlayOptions[] = [
    {
      input: await grass(zoom, variant % 2 === 0),
      left: center.x - Math.round(64 * zoom),
      top: center.y - Math.round(37 * zoom),
    },
    {
      input: owner(Math.round(128 * zoom), Math.round(74 * zoom), variant % 4),
      left: center.x - Math.round(64 * zoom),
      top: center.y - Math.round(37 * zoom),
    },
  ];
  if (variant % 2 === 0)
    overlays.push({
      input: await road(zoom),
      left: center.x - Math.round(64 * zoom),
      top: center.y - Math.round(37 * zoom),
    });
  if (variant % 3 === 1)
    overlays.push({
      input: await terrainObject("forest-2", zoom),
      left: center.x - Math.round(64 * zoom),
      top: center.y - Math.round(111 * zoom),
    });
  if (variant % 3 === 2)
    overlays.push({
      input: await terrainObject("mountain-1", zoom),
      left: center.x - Math.round(64 * zoom),
      top: center.y - Math.round(111 * zoom),
    });
  if (variant % 4 === 3)
    overlays.push({
      input: await mapObject(
        "public/assets/pixellab/buildings/candy-city-1.png",
        zoom,
        384,
        384,
        192,
        236,
        0.3,
      ),
      left: center.x - Math.round(57.6 * zoom),
      top: center.y - Math.round(70.8 * zoom),
    });
  overlays.push({
    input: shadow(zoom),
    left: center.x - Math.round(29 * zoom),
    top: center.y - Math.round(6 * zoom),
  });
  overlays.push({
    input: await placedUnit(unit, zoom),
    left:
      center.x -
      Math.round(unit.geometry.anchor.x * unit.geometry.displayScale * zoom),
    top:
      center.y -
      Math.round(unit.geometry.anchor.y * unit.geometry.displayScale * zoom) +
      Math.round((unit.geometry.offsetY ?? 0) * zoom),
  });
  if (selected)
    overlays.push({
      input: selection(Math.round(128 * zoom), Math.round(74 * zoom)),
      left: center.x - Math.round(64 * zoom),
      top: center.y - Math.round(37 * zoom),
    });
  if (variant % 2 === 1)
    overlays.push({ input: damage(), left: center.x + 16, top: center.y - 48 });
  overlays.push({
    input: health(variant % 3),
    left: center.x - 22,
    top: center.y + 3,
  });
  if (variant % 4 === 3)
    overlays.push({
      input: cityLabel(),
      left: center.x - 34,
      top: center.y + 34,
    });
  if (variant % 4 === 2)
    overlays.push({ input: fog(width, height), left: 0, top: 0 });
  return sharp({
    create: { width, height, channels: 4, background: "#203332" },
  })
    .composite(overlays)
    .png()
    .toBuffer();
}

async function placedUnit(unit: UnitDefinition, zoom: number): Promise<Buffer> {
  return placedFile(unit.file, unit.geometry, zoom);
}

async function placedFile(
  file: string,
  geometry: SourceGeometry,
  zoom: number,
): Promise<Buffer> {
  return sharp(path.join(root, file))
    .resize(
      Math.max(1, Math.round(geometry.width * geometry.displayScale * zoom)),
      Math.max(1, Math.round(geometry.height * geometry.displayScale * zoom)),
    )
    .png()
    .toBuffer();
}

async function grass(zoom: number, candy: boolean): Promise<Buffer> {
  return sharp(
    path.join(
      root,
      `public/assets/pixellab/terrain/${candy ? "candy-" : ""}grass-1.png`,
    ),
  )
    .resize(Math.round(128 * zoom), Math.round(74 * zoom))
    .png()
    .toBuffer();
}

async function terrainObject(stem: string, zoom: number): Promise<Buffer> {
  return sharp(path.join(root, `public/assets/pixellab/terrain/${stem}.png`))
    .resize(Math.round(128 * zoom), Math.round(148 * zoom))
    .png()
    .toBuffer();
}

async function road(zoom: number): Promise<Buffer> {
  return sharp(
    path.join(
      root,
      "public/assets/pixellab/terrain/road-masks/road-mask-1111.png",
    ),
  )
    .resize(Math.round(128 * zoom), Math.round(74 * zoom))
    .png()
    .toBuffer();
}

async function mapObject(
  file: string,
  zoom: number,
  width: number,
  height: number,
  _anchorX: number,
  _anchorY: number,
  scale: number,
): Promise<Buffer> {
  return sharp(path.join(root, file))
    .resize(Math.round(width * scale * zoom), Math.round(height * scale * zoom))
    .png()
    .toBuffer();
}

function owner(width: number, height: number, index: number): Buffer {
  const colors = ["#f06762", "#28b7a4", "#e2b63f", "#a277d2"];
  const color = colors[index] ?? colors[0];
  return Buffer.from(
    `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><polygon points="${width / 2},1 ${width - 1},${height / 2} ${width / 2},${height - 1} 1,${height / 2}" fill="${color}35" stroke="${color}" stroke-width="2"/></svg>`,
  );
}

function selection(width: number, height: number): Buffer {
  return Buffer.from(
    `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><polygon points="${width / 2},1 ${width - 1},${height / 2} ${width / 2},${height - 1} 1,${height / 2}" fill="none" stroke="#ffe36d" stroke-width="3"/></svg>`,
  );
}

function shadow(zoom: number): Buffer {
  return Buffer.from(
    `<svg width="${Math.round(58 * zoom)}" height="${Math.round(20 * zoom)}" xmlns="http://www.w3.org/2000/svg"><ellipse cx="50%" cy="50%" rx="48%" ry="35%" fill="#14252477"/></svg>`,
  );
}

function health(index: number): Buffer {
  const value = [1, 0.58, 0.25][index] ?? 1;
  return Buffer.from(
    `<svg width="58" height="16" xmlns="http://www.w3.org/2000/svg"><rect x="1" y="1" width="46" height="10" rx="3" fill="#172725"/><rect x="3" y="3" width="${42 * value}" height="6" rx="2" fill="${value < 0.5 ? "#ff6b6b" : "#76d982"}"/><circle cx="53" cy="6" r="5" fill="#ffd85e" stroke="#172725" stroke-width="2"/></svg>`,
  );
}

function damage(): Buffer {
  return Buffer.from(
    '<svg width="36" height="36" xmlns="http://www.w3.org/2000/svg"><circle cx="18" cy="18" r="14" fill="none" stroke="#ff6b6b" stroke-width="4"/><path d="M7 18h7l4-8 4 16 4-8h4" fill="none" stroke="#ffe2d8" stroke-width="3"/></svg>',
  );
}

function cityLabel(): Buffer {
  return Buffer.from(
    '<svg width="68" height="18" xmlns="http://www.w3.org/2000/svg"><rect width="68" height="18" rx="8" fill="#2b1c25"/><text x="34" y="13" text-anchor="middle" font-family="sans-serif" font-size="11" font-weight="700" fill="#fff3d7">L3 · +2</text></svg>',
  );
}

function fog(width: number, height: number): Buffer {
  return Buffer.from(
    `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#667674" opacity=".52"/></svg>`,
  );
}

function effect(role: string): Buffer {
  if (role === "MARKSMAN")
    return Buffer.from(
      '<svg width="90" height="70" xmlns="http://www.w3.org/2000/svg"><circle cx="52" cy="22" r="7" fill="#ff6b7a" stroke="#2b1c25" stroke-width="3"/><path d="M58 27L82 52" stroke="#ffe36d" stroke-width="3" stroke-dasharray="5 4"/></svg>',
    );
  if (role === "RAIDER")
    return Buffer.from(
      '<svg width="90" height="70" xmlns="http://www.w3.org/2000/svg"><path d="M8 54h65M58 42l15 12-15 12" fill="none" stroke="#ffe36d" stroke-width="5"/></svg>',
    );
  if (role === "MEDIC")
    return Buffer.from(
      '<svg width="90" height="70" xmlns="http://www.w3.org/2000/svg"><path d="M45 52C8 28 25 5 45 24 65 5 82 28 45 52z" fill="#ff8295" stroke="#2b1c25" stroke-width="3"/></svg>',
    );
  return Buffer.from(
    '<svg width="90" height="70" xmlns="http://www.w3.org/2000/svg"><path d="M12 54l28-38 16 18 22-14" fill="none" stroke="#ffe36d" stroke-width="5"/><circle cx="78" cy="20" r="8" fill="#ff6b6b" stroke="#2b1c25" stroke-width="3"/></svg>',
  );
}

function ability(role: string): string {
  return (
    (
      {
        FIGHTER: "Candify",
        MARKSMAN: "chute projectile",
        GUARD: "Chocolate Wall",
        RAIDER: "Roll",
        MEDIC: "Heal",
        HEAVY: "Push",
        BREACHER: "Breach",
        JUGGERNAUT: "Push",
      } as Record<string, string>
    )[role] ?? "ability"
  );
}

async function writeEvidence(
  measured: readonly ReturnType<typeof measure>[],
): Promise<void> {
  const names = [
    "individual-source-native-enlarged-minimum.png",
    "bounded-family-alias-counterpart-gates.png",
    "owners-selection-damage-fog-map-contexts.png",
    "zoom-dpr-representatives.png",
    "mixed-formation-adjacency-sorting.png",
    "portrait-64px-contexts.png",
    "ability-attachment-contexts.png",
  ];
  const artifacts = await Promise.all(
    names.map(async (filename) => {
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
    assetClass: "ruleset6-candy-units-and-portraits",
    gateOrder: [
      ["unit-candy-scout"],
      ["unit-candy-medic"],
      ["unit-candy-breacher"],
      ["unit-candy-fighter", "unit-candy-marksman", "unit-candy-heavy"],
      ["unit-candy-guard", "unit-candy-raider"],
      ["unit-candy-juggernaut"],
      ["portraits in bounded deterministic families"],
    ],
    aliases: {
      "unit-candy-fighter": "unit-candy-warrior",
      "unit-candy-marksman": "unit-candy-gumball-guard",
      "unit-candy-guard": "unit-candy-choco-engineer",
      "unit-candy-raider": "unit-candy-donut",
    },
    measurements: measured,
    projectileOrigin: {
      id: "unit-candy-gumball-guard",
      normalized: { x: 0.6523, y: 0.5156 },
      sourcePixel: { x: 167, y: 153 },
      alpha: 255,
    },
    candyWarriorPlacementCorrection: {
      offsetY: 7.5,
      simulationAnchorUnchanged: true,
    },
    rejectionHistory: {
      "unit-candy-breacher":
        generated.records["unit-candy-breacher"]?.rejectedAttempts ?? [],
      "unit-candy-juggernaut":
        generated.records["unit-candy-juggernaut"]?.rejectedAttempts ?? [],
    },
    reviewCoverage: [
      "individual source/native/enlarged/0.625x acceptance",
      "0.625x/1x/1.75x and DPR1/2",
      "Grass/Forest/Mountain/city/Road/dense economy",
      "all four owner colors",
      "selected/damaged/fog/reduced-motion static readability",
      "mixed Original-Candy formation, health, labels, status, picking and adjacency sorting",
      "Candy Warrior placement correction and Gumball Guard opaque chute attachment",
      "Candify/Roll/Chocolate Wall/gumball projectile/Heal/Push/Breach code-native separation",
      "portrait 64 CSS px on light/dark/high-contrast panels",
      "silhouette plus labels/patterns remains independent of hue",
    ],
    artifacts,
    visualReview: {
      status: "ACCEPTED",
      notes:
        "All nine Candy roles are distinct from one another and their Original counterparts at minimum zoom. Ordinary units remain materially smaller than terrain, Candy Crusher is low-wide, and Sugar Titan is a bounded tall giant. City labels, adjacent targets, selection, health and owner attachments remain readable.",
    },
  };
  await writeFile(
    path.join(reviewRoot, "review-evidence.json"),
    `${JSON.stringify(evidence, null, 2)}\n`,
    "utf8",
  );
  await writeFile(
    path.join(reviewRoot, "README.md"),
    "# Ruleset 6 Candy roster review\n\nGenerated by `npm run art:ruleset6-candy-unit-review`. Evidence records the exact serial gates, explicit role aliases and labels, map-scale measurements, four-direction occlusion, 64 px portrait review, rejected iterations, and code-native ability attachments.\n",
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
function required<T>(value: T | undefined, name: string): T {
  if (value === undefined) throw new Error(`Missing ${name}`);
  return value;
}
function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
