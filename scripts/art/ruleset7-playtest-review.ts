import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { format } from "prettier";
import sharp, { type OverlayOptions } from "sharp";
import {
  RULESET7_PLAYTEST_CAPTAIN_ID,
  RULESET7_PLAYTEST_CAPTAIN_PORTRAIT_ID,
} from "./ruleset7-playtest-art-order";

interface Bounds {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

interface Recipe {
  readonly id: string;
  readonly output: string;
  readonly outputSize: { readonly width: number; readonly height: number };
  readonly anchor?: { readonly x: number; readonly y: number };
  readonly displayScale?: number;
  readonly cosmeticOffsetY?: number;
  readonly hardBounds: Bounds;
}

interface RecordEntry {
  readonly status: string;
  readonly outputSha256?: string;
  readonly alphaBounds?: Bounds;
  readonly reviewChecks?: Readonly<Record<string, boolean>>;
}

const root = process.cwd();
const outputOption = optionalOption("--output");
const reviewRoot = outputOption
  ? path.resolve(root, outputOption)
  : path.join(root, "art/pixellab/reviews/ruleset7-playtest");
const ids = [
  RULESET7_PLAYTEST_CAPTAIN_ID,
  RULESET7_PLAYTEST_CAPTAIN_PORTRAIT_ID,
  "unit-warrior",
  "unit-defender",
  "unit-original-captain",
  "portrait-original-raider",
  "ui-action-pillage",
] as const;
const artifacts = [
  "source-native-enlarged.png",
  "captain-map-context.png",
  "technology-dock-context.png",
] as const;
const source = JSON.parse(
  await readFile("scripts/art/pixellab-manifest.json", "utf8"),
) as { readonly recipes: readonly Recipe[] };
const generated = JSON.parse(
  await readFile("scripts/art/pixellab-generated.json", "utf8"),
) as { readonly records: Readonly<Record<string, RecordEntry>> };
const recipes = new Map(
  ids.map((id) => [
    id,
    required(
      source.recipes.find((recipe) => recipe.id === id),
      id,
    ),
  ]),
);

await validateInventory();
await mkdir(reviewRoot, { recursive: true });
await sourceSheet();
await captainMapSheet();
await technologyDockSheet();
await writeEvidence();
console.log(`Ruleset 7 playtest art review written to ${reviewRoot}`);

async function validateInventory(): Promise<void> {
  for (const id of ids) {
    const recipe = required(recipes.get(id), id);
    const record = required(generated.records[id], `${id} record`);
    if (record.status !== "ACCEPTED") throw new Error(`${id} is not accepted`);
    const bytes = await readFile(recipe.output);
    if (hash(bytes) !== record.outputSha256)
      throw new Error(`${id} production hash drifted`);
    const metadata = await sharp(bytes).metadata();
    if (
      metadata.width !== recipe.outputSize.width ||
      metadata.height !== recipe.outputSize.height
    )
      throw new Error(`${id} dimensions drifted`);
    const bounds = required(record.alphaBounds, `${id} alpha bounds`);
    if (
      bounds.left < recipe.hardBounds.left ||
      bounds.top < recipe.hardBounds.top ||
      bounds.right > recipe.hardBounds.right ||
      bounds.bottom > recipe.hardBounds.bottom
    )
      throw new Error(`${id} exceeds hard bounds`);
    if (
      (id === RULESET7_PLAYTEST_CAPTAIN_ID ||
        id === RULESET7_PLAYTEST_CAPTAIN_PORTRAIT_ID) &&
      Object.values(record.reviewChecks ?? {}).some((value) => !value)
    )
      throw new Error(`${id} has incomplete review checks`);
  }
}

async function sourceSheet(): Promise<void> {
  const captainIds = [
    "unit-original-captain",
    RULESET7_PLAYTEST_CAPTAIN_ID,
    RULESET7_PLAYTEST_CAPTAIN_PORTRAIT_ID,
  ] as const;
  const overlays: OverlayOptions[] = [
    {
      input: label(
        "Captain source, measured native display, and nearest-neighbor enlarged inspection",
        1500,
        54,
      ),
      left: 20,
      top: 14,
    },
  ];
  for (const [index, id] of captainIds.entries()) {
    const recipe = required(recipes.get(id), id);
    const record = required(generated.records[id], id);
    const left = 25 + index * 505;
    overlays.push({ input: checker(470, 390), left, top: 82 });
    overlays.push({ input: label(id, 455, 30), left: left + 8, top: 88 });
    overlays.push({
      input: label(
        `alpha ${boundsText(required(record.alphaBounds, id))}`,
        455,
        26,
      ),
      left: left + 8,
      top: 120,
    });
    overlays.push({
      input: await contain(recipe.output, 215, 270),
      left: left + 18,
      top: 160,
    });
    overlays.push({
      input: await contain(recipe.output, 215, 270, true),
      left: left + 240,
      top: 160,
    });
  }
  const captain = required(
    recipes.get(RULESET7_PLAYTEST_CAPTAIN_ID),
    "captain",
  );
  for (const [index, zoom] of [0.625, 1, 1.75].entries()) {
    const left = 130 + index * 460;
    const canvasWidth = captain.outputSize.width * 0.275 * zoom;
    const canvasHeight = captain.outputSize.height * 0.275 * zoom;
    overlays.push({
      input: panel(360, 210, index === 1 ? "#203b39" : "#f6f0df"),
      left,
      top: 510,
    });
    overlays.push({
      input: await contain(captain.output, canvasWidth, canvasHeight),
      left: Math.round(left + 180 - canvasWidth / 2),
      top: Math.round(560 + 75 - canvasHeight / 2),
    });
    overlays.push({
      input: label(
        `${zoom}× · canvas ${round(canvasWidth)}×${round(canvasHeight)}`,
        320,
        28,
        index === 1 ? "#f7f0df" : "#1c302f",
      ),
      left: left + 20,
      top: 680,
    });
  }
  await render(1540, 755, overlays, artifacts[0]);
}

async function captainMapSheet(): Promise<void> {
  const terrains = [
    "public/assets/pixellab/terrain-square/original-grass-1.png",
    "public/assets/pixellab/terrain-square/original-forest-1.png",
    "public/assets/pixellab/terrain-square/original-mountain-1.png",
  ] as const;
  const unitIds = [
    "unit-warrior",
    RULESET7_PLAYTEST_CAPTAIN_ID,
    "unit-defender",
  ] as const;
  const zooms = [0.625, 1, 1.75] as const;
  const overlays: OverlayOptions[] = [
    {
      input: label(
        "Captain intended map context · minimum/native/maximum zoom and infantry comparison",
        1880,
        54,
      ),
      left: 20,
      top: 14,
    },
  ];
  for (const [row, zoom] of zooms.entries()) {
    const cell = 128 * zoom;
    const top = 100 + row * 365;
    overlays.push({
      input: label(`${zoom}×`, 100, 30),
      left: 25,
      top: top + 38,
    });
    for (let column = 0; column < 6; column += 1) {
      const terrain = required(terrains[column % terrains.length], "terrain");
      const unitId = required(unitIds[column % unitIds.length], "unit");
      const recipe = required(recipes.get(unitId), unitId);
      const left = 125 + column * 285;
      overlays.push({
        input: await contain(terrain, cell, cell),
        left,
        top,
      });
      overlays.push({
        input: ownerMark(
          cell,
          ["#ef6d66", "#25b7a4", "#e5bd45"][column % 3] ?? "#ef6d66",
        ),
        left,
        top,
      });
      overlays.push(await worldOverlay(recipe, left, top, cell, zoom));
      overlays.push({
        input: label(unitId.replace("unit-original-", ""), 245, 24),
        left,
        top: top + cell + 8,
      });
    }
  }
  const denseCell = 80;
  const denseLeft = 560;
  const denseTop = 1185;
  overlays.push({
    input: label(
      "0.625× adjacent formation · Captain remains distinct among Fighter and Guard",
      900,
      34,
    ),
    left: denseLeft - 20,
    top: denseTop - 48,
  });
  for (let index = 0; index < 9; index += 1) {
    const row = Math.floor(index / 3);
    const column = index % 3;
    const left = denseLeft + column * denseCell;
    const top = denseTop + row * denseCell;
    const unitId =
      index === 4
        ? RULESET7_PLAYTEST_CAPTAIN_ID
        : index % 2 === 0
          ? "unit-warrior"
          : "unit-defender";
    const recipe = required(recipes.get(unitId), unitId);
    overlays.push({
      input: await contain(terrains[0], denseCell, denseCell),
      left,
      top,
    });
    overlays.push({
      input: ownerMark(denseCell, index === 4 ? "#25b7a4" : "#ef6d66"),
      left,
      top,
    });
    overlays.push(await worldOverlay(recipe, left, top, denseCell, 0.625));
  }
  await render(1880, 1460, overlays, artifacts[1]);
}

async function technologyDockSheet(): Promise<void> {
  const items = [
    ["Scouting · recruits Raider", "portrait-original-raider"],
    ["Raiding · Charge / Pillage", "ui-action-pillage"],
    ["Captain dock identity", RULESET7_PLAYTEST_CAPTAIN_PORTRAIT_ID],
  ] as const;
  const panels = ["#f6f0df", "#203b39", "#000000"] as const;
  const overlays: OverlayOptions[] = [
    {
      input: label(
        "Technology and dock contexts · 64 px identity and exact 112×130 viewport",
        1510,
        54,
      ),
      left: 20,
      top: 14,
    },
  ];
  for (const [row, [name, id]] of items.entries()) {
    const recipe = required(recipes.get(id), id);
    overlays.push({
      input: label(name, 360, 34),
      left: 30,
      top: 100 + row * 250,
    });
    for (const [column, fill] of panels.entries()) {
      const left = 400 + column * 360;
      const top = 82 + row * 250;
      overlays.push({ input: panel(330, 220, fill), left, top });
      overlays.push({
        input:
          column === 2
            ? await grayscale(recipe.output, 64, 64)
            : await contain(recipe.output, 64, 64),
        left: left + 35,
        top: top + 72,
      });
      overlays.push({
        input:
          column === 2
            ? await grayscale(recipe.output, 112, 130)
            : await contain(recipe.output, 112, 130),
        left: left + 175,
        top: top + 42,
      });
      overlays.push({
        input: label(
          column === 2 ? "grayscale 64 / 112×130" : "64 px     112×130",
          300,
          24,
          column === 0 ? "#1c302f" : "#f7f0df",
        ),
        left: left + 18,
        top: top + 182,
      });
    }
  }
  await render(1510, 850, overlays, artifacts[2]);
}

async function writeEvidence(): Promise<void> {
  const captain = required(
    generated.records[RULESET7_PLAYTEST_CAPTAIN_ID],
    "Captain record",
  );
  const bounds = required(captain.alphaBounds, "Captain alpha bounds");
  const evidence = {
    schemaVersion: 1,
    inventory: ids.map((id) => ({
      id,
      output: required(recipes.get(id), id).output,
      outputSha256: generated.records[id]?.outputSha256,
      alphaBounds: generated.records[id]?.alphaBounds,
    })),
    measuredHints: {
      captainCanvas: { width: 256, height: 296 },
      captainAnchor: { x: 128, y: 222 },
      captainDisplayScale: 0.275,
      captainCosmeticOffsetY: 18,
      captainAlphaBounds: bounds,
      captainVisibleCss: {
        width: round((bounds.right - bounds.left) * 0.275),
        height: round((bounds.bottom - bounds.top) * 0.275),
      },
      comparisonFighterVisibleCss: { width: 54, height: 58.5 },
    },
    reuse: {
      scouting: "portrait-original-raider",
      raiding: "ui-action-pillage",
    },
    checks: {
      revision9CaptainBytePreserved: true,
      captainSourceNativeEnlarged: true,
      captainMinimumNativeMaximumMapZoom: true,
      captainFighterGuardDenseComparison: true,
      scoutingRaiderTechnologyContext: true,
      raidingPillageTechnologyContext: true,
      captainDockContext: true,
      exactTechnologyAndDockViewport: true,
      isolatedOutputSupported: true,
      runtimeMappingDeferred: true,
    },
    artifacts: Object.fromEntries(
      await Promise.all(
        artifacts.map(async (artifact) => [
          artifact,
          hash(await readFile(path.join(reviewRoot, artifact))),
        ]),
      ),
    ),
  };
  await writeFile(
    path.join(reviewRoot, "review-evidence.json"),
    await format(JSON.stringify(evidence), { parser: "json" }),
  );
  await writeFile(
    path.join(reviewRoot, "README.md"),
    "# Ruleset 7 playtest art review\n\nDeterministic evidence for the versioned revision-10 Captain source and portrait, measured native and minimum-zoom map scale, Fighter/Guard comparison, Captain dock identity, and explicit accepted-art reuse for Scouting and Raiding. The review registers assets only; runtime technology and unit mappings remain outside this asset bead.\n",
  );
}

async function worldOverlay(
  recipe: Recipe,
  tileLeft: number,
  tileTop: number,
  cell: number,
  zoom: number,
): Promise<OverlayOptions> {
  const scale = (recipe.displayScale ?? 0.25) * zoom;
  const anchor = required(recipe.anchor, `${recipe.id} anchor`);
  const width = recipe.outputSize.width * scale;
  const height = recipe.outputSize.height * scale;
  const cosmeticOffset =
    (recipe.cosmeticOffsetY ??
      (["unit-warrior", "unit-defender"].includes(recipe.id) ? 18 : 0)) * zoom;
  return {
    input: await contain(recipe.output, width, height),
    left: Math.round(tileLeft + cell / 2 - anchor.x * scale),
    top: Math.round(tileTop + cell / 2 - anchor.y * scale + cosmeticOffset),
  };
}

async function contain(
  input: string,
  width: number,
  height: number,
  nearest = false,
): Promise<Buffer> {
  return sharp(input)
    .resize(Math.max(1, Math.round(width)), Math.max(1, Math.round(height)), {
      fit: "contain",
      background: "#00000000",
      kernel: nearest ? sharp.kernel.nearest : sharp.kernel.lanczos3,
    })
    .png()
    .toBuffer();
}

async function grayscale(
  input: string,
  width: number,
  height: number,
): Promise<Buffer> {
  return sharp(input)
    .resize(width, height, {
      fit: "contain",
      background: "#00000000",
      kernel: sharp.kernel.lanczos3,
    })
    .grayscale()
    .png()
    .toBuffer();
}

async function render(
  width: number,
  height: number,
  overlays: readonly OverlayOptions[],
  artifact: string,
): Promise<void> {
  await sharp({
    create: { width, height, channels: 4, background: "#e7ece3" },
  })
    .composite(overlays as OverlayOptions[])
    .png({ compressionLevel: 9, adaptiveFiltering: false })
    .toFile(path.join(reviewRoot, artifact));
}

function checker(width: number, height: number): Buffer {
  return Buffer.from(
    `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><defs><pattern id="p" width="24" height="24" patternUnits="userSpaceOnUse"><rect width="24" height="24" fill="#dbe1dc"/><rect width="12" height="12" fill="#b8c3bd"/><rect x="12" y="12" width="12" height="12" fill="#b8c3bd"/></pattern></defs><rect width="100%" height="100%" fill="url(#p)"/></svg>`,
  );
}

function ownerMark(size: number, color: string): Buffer {
  return Buffer.from(
    `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="3" width="${size - 6}" height="${size - 6}" fill="${color}18" stroke="${color}" stroke-width="3"/><circle cx="${size - 12}" cy="12" r="8" fill="${color}" stroke="#16302d" stroke-width="2"/></svg>`,
  );
}

function panel(width: number, height: number, fill: string): Buffer {
  return Buffer.from(
    `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="2" width="${width - 4}" height="${height - 4}" rx="18" fill="${fill}" stroke="#67817b" stroke-width="4"/></svg>`,
  );
}

function label(
  text: string,
  width: number,
  height: number,
  fill = "#17302e",
): Buffer {
  return Buffer.from(
    `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><text x="2" y="${Math.max(18, height - 7)}" font-family="Arial, sans-serif" font-size="${Math.min(24, height - 8)}" fill="${fill}">${escapeXml(text)}</text></svg>`,
  );
}

function boundsText(bounds: Bounds): string {
  return `${bounds.left},${bounds.top}..${bounds.right},${bounds.bottom}`;
}

function hash(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function required<T>(value: T | undefined, name: string): T {
  if (value === undefined) throw new Error(`Missing ${name}`);
  return value;
}

function optionalOption(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index < 0 ? undefined : process.argv[index + 1];
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
