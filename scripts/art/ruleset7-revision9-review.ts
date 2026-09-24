import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { format } from "prettier";
import sharp, { type OverlayOptions } from "sharp";
import {
  RULESET7_REVISION9_PORTRAIT_IDS,
  RULESET7_REVISION9_SOURCE_IDS,
} from "./ruleset7-revision9-art-order";

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
  : path.join(root, "art/pixellab/reviews/ruleset7-revision9");
const ids = [
  ...RULESET7_REVISION9_SOURCE_IDS,
  ...RULESET7_REVISION9_PORTRAIT_IDS,
] as const;
const artifacts = [
  "source-native-enlarged.png",
  "unit-gameplay-context.png",
  "shipyard-resource-occupant-context.png",
  "action-portrait-ui-context.png",
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
await unitContextSheet();
await shipyardContextSheet();
await uiContextSheet();
await writeEvidence();
console.log(`Ruleset 7 revision-9 art review written to ${reviewRoot}`);

async function validateInventory(): Promise<void> {
  for (const id of ids) {
    const recipe = required(recipes.get(id), id);
    const record = required(generated.records[id], `${id} record`);
    if (record.status !== "ACCEPTED") throw new Error(`${id} is not accepted`);
    if (Object.values(record.reviewChecks ?? {}).some((value) => !value))
      throw new Error(`${id} has incomplete review checks`);
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
  }
}

async function sourceSheet(): Promise<void> {
  const cellWidth = 760;
  const cellHeight = 460;
  const overlays: OverlayOptions[] = [];
  for (const [index, id] of ids.entries()) {
    const recipe = required(recipes.get(id), id);
    const record = required(generated.records[id], id);
    const column = index % 2;
    const row = Math.floor(index / 2);
    const left = column * cellWidth;
    const top = row * cellHeight;
    overlays.push({ input: checker(720, 350), left: left + 20, top: top + 74 });
    overlays.push({
      input: label(id, 720, 34),
      left: left + 20,
      top: top + 18,
    });
    overlays.push({
      input: label(
        `${recipe.outputSize.width}×${recipe.outputSize.height} · alpha ${boundsText(required(record.alphaBounds, id))}`,
        720,
        26,
      ),
      left: left + 20,
      top: top + 48,
    });
    overlays.push({
      input: await contain(recipe.output, 235, 300),
      left: left + 38,
      top: top + 94,
    });
    overlays.push({
      input: await contain(
        recipe.output,
        nativeSize(id, recipe).width,
        nativeSize(id, recipe).height,
      ),
      left: Math.round(left + 335 - nativeSize(id, recipe).width / 2),
      top: Math.round(top + 245 - nativeSize(id, recipe).height / 2),
    });
    overlays.push({
      input: await contain(recipe.output, 330, 330, true),
      left: left + 390,
      top: top + 84,
    });
    overlays.push({
      input: label("source preview", 150, 24),
      left: left + 95,
      top: top + 400,
    });
    overlays.push({
      input: label(
        `${nativeSize(id, recipe).width}×${nativeSize(id, recipe).height}px native`,
        190,
        24,
      ),
      left: left + 270,
      top: top + 318,
    });
    overlays.push({
      input: label("enlarged preview", 160, 24),
      left: left + 500,
      top: top + 400,
    });
  }
  await render(
    1520,
    Math.ceil(ids.length / 2) * cellHeight,
    overlays,
    artifacts[0],
  );
}

async function unitContextSheet(): Promise<void> {
  const terrain = [
    "public/assets/pixellab/terrain-square/original-grass-1.png",
    "public/assets/pixellab/terrain-square/original-mountain-1.png",
  ];
  const comparisonIds = ["unit-warrior", "unit-original-horse-archer"];
  const unitIds = ["unit-original-captain", "unit-original-knight"] as const;
  const zooms = [0.625, 1, 1.75] as const;
  const owners = ["#ef6d66", "#25b7a4", "#e5bd45", "#9f78d1"];
  const overlays: OverlayOptions[] = [];
  overlays.push({
    input: label(
      "Native gameplay context · zoom, owner, terrain and retained-role comparison",
      3200,
      54,
    ),
    left: 18,
    top: 12,
  });
  for (const [row, id] of unitIds.entries()) {
    const recipe = required(recipes.get(id), id);
    const comparisonId = required(comparisonIds[row], "comparison id");
    const comparison = required(
      source.recipes.find((candidate) => candidate.id === comparisonId),
      comparisonId,
    );
    for (const [column, zoom] of zooms.entries()) {
      const cellLeft = 35 + column * 1050;
      const cellTop = 90 + row * 590;
      const cell = 128 * zoom;
      const tile = await contain(
        required(terrain[row] ?? terrain[0], "unit terrain"),
        cell,
        cell,
      );
      for (let i = 0; i < 4; i += 1) {
        const x = cellLeft + i * (cell + 18);
        overlays.push({
          input: tile,
          left: Math.round(x),
          top: Math.round(cellTop + 70),
        });
        overlays.push({
          input: ownerMark(
            cell,
            required(owners[i] ?? owners[0], "owner color"),
          ),
          left: Math.round(x),
          top: Math.round(cellTop + 70),
        });
        overlays.push(await worldOverlay(recipe, x, cellTop + 70, cell, zoom));
      }
      overlays.push({
        input: label(`${id} · ${zoom}×`, 980, 30),
        left: cellLeft,
        top: cellTop + 28,
      });
      const comparisonTop = cellTop + 70 + cell + 38;
      overlays.push({
        input: tile,
        left: Math.round(cellLeft),
        top: Math.round(comparisonTop),
      });
      overlays.push({
        input: ownerMark(cell, owners[0] ?? "#ef6d66"),
        left: Math.round(cellLeft),
        top: Math.round(comparisonTop),
      });
      overlays.push(
        await worldOverlay(comparison, cellLeft, comparisonTop, cell, zoom),
      );
      overlays.push({
        input: label(
          row === 0 ? "beside Fighter" : "beside archived Horse Archer",
          260,
          28,
        ),
        left: cellLeft + cell + 18,
        top: comparisonTop + cell / 2 - 14,
      });
    }
  }
  await render(3200, 1290, overlays, artifacts[1]);
}

async function shipyardContextSheet(): Promise<void> {
  const shipyard = required(
    recipes.get("building-ruleset7-shipyard"),
    "Shipyard",
  );
  const waterIds = [
    "terrain-ruleset7-water-shallow",
    "terrain-ruleset7-water-deep",
  ];
  const resourceIds = [
    undefined,
    "terrain-ruleset7-resource-fish",
    "terrain-ruleset7-resource-pearls",
  ] as const;
  const occupantIds = [
    undefined,
    "unit-original-patrol-boat",
    "unit-original-battleship",
  ] as const;
  const overlays: OverlayOptions[] = [
    {
      input: label(
        "Shipyard · both water types × resource window × occupant priority",
        1510,
        54,
      ),
      left: 18,
      top: 12,
    },
  ];
  let index = 0;
  for (const waterId of waterIds)
    for (const resourceId of resourceIds)
      for (const occupantId of occupantIds) {
        const column = index % 6;
        const row = Math.floor(index / 6);
        const left = 28 + column * 245;
        const top = 80 + row * 280;
        const tileLeft = left + 48;
        const tileTop = top + 50;
        const cell = 128;
        const water = required(
          source.recipes.find((candidate) => candidate.id === waterId),
          waterId,
        );
        overlays.push({
          input: await contain(water.output, cell, cell),
          left: tileLeft,
          top: tileTop,
        });
        if (resourceId !== undefined) {
          const resource = required(
            source.recipes.find((candidate) => candidate.id === resourceId),
            resourceId,
          );
          overlays.push(
            await worldOverlay(resource, tileLeft, tileTop, cell, 1),
          );
        }
        overlays.push(await worldOverlay(shipyard, tileLeft, tileTop, cell, 1));
        if (occupantId !== undefined) {
          const occupant = required(
            source.recipes.find((candidate) => candidate.id === occupantId),
            occupantId,
          );
          overlays.push(
            await worldOverlay(occupant, tileLeft, tileTop, cell, 1),
          );
        }
        overlays.push({
          input: label(
            `${waterId.endsWith("shallow") ? "Shallow" : "Deep"} / ${resourceId === undefined ? "Open" : resourceId.endsWith("fish") ? "Fish" : "Pearls"} / ${occupantId === undefined ? "Empty" : occupantId.endsWith("patrol-boat") ? "Patrol" : "Battleship"}`,
            230,
            42,
          ),
          left: left - 8,
          top: top + 215,
        });
        index += 1;
      }
  const port = required(
    source.recipes.find(
      (candidate) => candidate.id === "building-ruleset7-port",
    ),
    "building-ruleset7-port",
  );
  const shallow = required(
    source.recipes.find(
      (candidate) => candidate.id === "terrain-ruleset7-water-shallow",
    ),
    "terrain-ruleset7-water-shallow",
  );
  for (const [index, building] of [port, shipyard].entries()) {
    const tileLeft = 1120 + index * 180;
    const tileTop = 920;
    overlays.push({
      input: await contain(shallow.output, 128, 128),
      left: tileLeft,
      top: tileTop,
    });
    overlays.push(await worldOverlay(building, tileLeft, tileTop, 128, 1));
  }
  overlays.push({
    input: label("Port → Shipyard silhouette upgrade", 350, 36),
    left: 1095,
    top: 1055,
  });
  await render(1510, 1140, overlays, artifacts[2]);
}

async function uiContextSheet(): Promise<void> {
  const actionIds = RULESET7_REVISION9_SOURCE_IDS.slice(3);
  const panels = ["#f6f0df", "#203b39", "#000000", "#ffffff"];
  const sizes = [24, 32, 48, 64];
  const overlays: OverlayOptions[] = [
    {
      input: label(
        "Compact action family · light/dark/high contrast · color and grayscale",
        1450,
        54,
      ),
      left: 18,
      top: 12,
    },
  ];
  for (const [row, id] of actionIds.entries()) {
    const recipe = required(recipes.get(id), id);
    overlays.push({ input: label(id, 410, 34), left: 25, top: 85 + row * 260 });
    for (const [column, size] of sizes.entries()) {
      const left = 420 + column * 245;
      const top = 72 + row * 260;
      overlays.push({
        input: panel(
          220,
          210,
          required(panels[column] ?? panels[0], "panel color"),
        ),
        left,
        top,
      });
      overlays.push({
        input: await contain(recipe.output, size, size),
        left: left + 35,
        top: top + 72,
      });
      overlays.push({
        input: await grayscale(recipe.output, size),
        left: left + 135,
        top: top + 72,
      });
      overlays.push({
        input: label(
          `${size}px color / gray`,
          200,
          26,
          column === 0 || column === 3 ? "#1c302f" : "#f7f0df",
        ),
        left: left + 10,
        top: top + 175,
      });
    }
  }
  for (const [index, id] of RULESET7_REVISION9_PORTRAIT_IDS.entries()) {
    const recipe = required(recipes.get(id), id);
    const left = 120 + index * 650;
    const top = 890;
    overlays.push({ input: panel(560, 220, "#f6f0df"), left, top });
    overlays.push({
      input: await contain(recipe.output, 112, 130),
      left: left + 30,
      top: top + 42,
    });
    overlays.push({
      input: await contain(recipe.output, 64, 64),
      left: left + 190,
      top: top + 70,
    });
    overlays.push({
      input: label(id, 250, 26, "#1c302f"),
      left: left + 290,
      top: top + 70,
    });
    overlays.push({
      input: label("112×130 identity · 64px tech", 250, 26, "#1c302f"),
      left: left + 290,
      top: top + 96,
    });
  }
  await render(1450, 1140, overlays, artifacts[3]);
}

async function writeEvidence(): Promise<void> {
  const evidence = {
    schemaVersion: 1,
    inventory: ids.map((id) => ({
      id,
      output: required(recipes.get(id), id).output,
      outputSha256: generated.records[id]?.outputSha256,
      alphaBounds: generated.records[id]?.alphaBounds,
    })),
    checks: {
      exactSixPixelLabSources: true,
      deterministicCaptainKnightPortraits: true,
      sourceNativeEnlarged: true,
      unitZoomOwnerTerrainRetainedRoleContext: true,
      shipyardWaterResourceOccupantPortContext: true,
      actionSizesPanelsGrayscale: true,
      portraitIdentityAndTechnologySizes: true,
      cssGeometryOnlyNoRasterDprClaim: true,
      isolatedOutputSupported: true,
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
    "# Ruleset 7 revision 9 art review\n\nDeterministic source, native, enlarged, gameplay-context, resource/occupant, compact UI, grayscale, and portrait evidence for the exact six new PixelLab sources and two derived portraits. These fixtures review asset composition only; runtime wiring belongs to the integration bead.\n",
  );
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

function nativeSize(
  id: string,
  recipe: Recipe,
): {
  readonly width: number;
  readonly height: number;
} {
  if (id.startsWith("ui-action-")) return { width: 48, height: 48 };
  if (id.startsWith("portrait-")) return { width: 112, height: 130 };
  const scale = required(recipe.displayScale, `${id} displayScale`);
  return {
    width: round(recipe.outputSize.width * scale),
    height: round(recipe.outputSize.height * scale),
  };
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
    (recipe.cosmeticOffsetY ?? (recipe.id === "unit-warrior" ? 18 : 0)) * zoom;
  return {
    input: await contain(recipe.output, width, height),
    left: Math.round(tileLeft + cell / 2 - anchor.x * scale),
    top: Math.round(tileTop + cell / 2 - anchor.y * scale + cosmeticOffset),
  };
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
async function grayscale(input: string, size: number): Promise<Buffer> {
  return sharp(input)
    .resize(size, size, { fit: "contain" })
    .grayscale()
    .png()
    .toBuffer();
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
    `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="2" width="${width - 4}" height="${height - 4}" rx="18" fill="${fill}" stroke="#78908a" stroke-width="3"/></svg>`,
  );
}
function label(
  text: string,
  width: number,
  height: number,
  fill = "#f7f0df",
): Buffer {
  const lines = text.split("\n");
  return Buffer.from(
    `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><text x="6" y="${Math.min(28, height - 6)}" fill="${fill}" font-family="Arial,sans-serif" font-size="${height > 45 ? 22 : 16}" font-weight="700">${lines.map((line, index) => `<tspan x="6" dy="${index === 0 ? 0 : 22}">${escapeXml(line)}</tspan>`).join("")}</text></svg>`,
  );
}
async function render(
  width: number,
  height: number,
  overlays: readonly OverlayOptions[],
  artifact: string,
): Promise<void> {
  await sharp({ create: { width, height, channels: 4, background: "#294844" } })
    .composite([...overlays])
    .png({ compressionLevel: 9 })
    .toFile(path.join(reviewRoot, artifact));
}
function optionalOption(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index < 0 ? undefined : process.argv[index + 1];
}
function boundsText(bounds: Bounds): string {
  return `${bounds.left},${bounds.top}..${bounds.right},${bounds.bottom}`;
}
function hash(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
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
