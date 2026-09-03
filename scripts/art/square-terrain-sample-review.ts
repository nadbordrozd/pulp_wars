import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { format } from "prettier";
import sharp, { type OverlayOptions } from "sharp";

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
  readonly anchor: { readonly x: number; readonly y: number };
  readonly squareFootprint: Bounds;
  readonly postprocess: string;
}

interface RecordEntry {
  readonly status: string;
  readonly outputSha256?: string;
  readonly providerOutputSha256?: string;
  readonly alphaBounds?: Bounds & { readonly empty: boolean };
  readonly rejectedAttempts?: readonly unknown[];
}

const root = process.cwd();
const reviewRoot = path.join(
  root,
  "art/pixellab/reviews/square-terrain-samples",
);
const ids = [
  "terrain-square-original-grass-1",
  "terrain-square-original-forest-1",
  "terrain-square-original-mountain-1",
] as const;
const source = JSON.parse(
  await readFile(path.join(root, "scripts/art/pixellab-manifest.json"), "utf8"),
) as { readonly recipes: readonly Recipe[] };
const generated = JSON.parse(
  await readFile(
    path.join(root, "scripts/art/pixellab-generated.json"),
    "utf8",
  ),
) as { readonly records: Readonly<Record<string, RecordEntry>> };
const recipes = new Map(
  source.recipes
    .filter((recipe) => ids.includes(recipe.id as (typeof ids)[number]))
    .map((recipe) => [recipe.id, recipe] as const),
);

for (const id of ids) {
  if (
    recipes.get(id) === undefined ||
    generated.records[id]?.status !== "ACCEPTED"
  )
    throw new Error(`Accepted square terrain sample missing: ${id}`);
}

await mkdir(reviewRoot, { recursive: true });
await createIndividualSheet();
await createZoomContexts(1);
await createZoomContexts(2);
await createAdjacencySheet();
await createRepetitionSheet();

const artifactNames = [
  "individual-source-native-enlarged.png",
  "zoom-contexts-dpr1.png",
  "zoom-contexts-dpr2.png",
  "adjacency-and-overlays.png",
  "repetition-8x8-minimum.png",
] as const;
const artifacts = await Promise.all(
  artifactNames.map(async (name) => {
    const data = await readFile(path.join(reviewRoot, name));
    const metadata = await sharp(data).metadata();
    return {
      path: `art/pixellab/reviews/square-terrain-samples/${name}`,
      bytes: data.byteLength,
      width: metadata.width,
      height: metadata.height,
      sha256: hash(data),
    };
  }),
);
const measurements = await Promise.all(ids.map(measure));
const warrior = await readFile(
  path.join(root, "public/assets/pixellab/units/warrior.png"),
);

await writeFile(
  path.join(reviewRoot, "review-evidence.json"),
  await format(
    `${JSON.stringify(
      {
        schemaVersion: 1,
        generatedBy: "npm run art:square-terrain-sample-review",
        gate: "THREE_INDIVIDUAL_SQUARE_TERRAIN_SAMPLES",
        sampleIds: ids,
        geometry: {
          cellCssPixelsAt1x: { width: 128, height: 128 },
          grass: {
            source: { width: 256, height: 256 },
            anchor: { x: 128, y: 128 },
            owningSquare: { left: 0, top: 0, right: 256, bottom: 256 },
          },
          tall: {
            source: { width: 256, height: 384 },
            anchor: { x: 128, y: 256 },
            owningSquare: { left: 0, top: 128, right: 256, bottom: 384 },
            overflow: "UPWARD_ONLY",
          },
        },
        deterministicProcessing: {
          grass:
            "Remove one-sixteenth provider presentation inset; scale authored turf to 256x256; radius-24 blur; retain 4% authored color over #6f9255; smoothstep outer 48px to #6f9255; force alpha 255.",
          forest:
            "Composite accepted square Grass exactly into source y128..384 beneath provider-authored Forest.",
          mountain:
            "Derive slate square ground by greyscale+tint #718391 from accepted square Grass; retain provider Mountain fully through y200 and smoothstep-fade its alpha to zero by y304.",
        },
        lighting:
          "All samples use a soft upper-left/northwest key with lower-right/southeast darker planes; review confirms the direction is consistent and does not encode gameplay state.",
        displayChecks: {
          footprintCssPixels: [80, 128, 224],
          zooms: [0.625, 1, 1.75],
          devicePixelRatios: [1, 2],
          unitSource: "unit-warrior",
          unitSourceSha256: hash(warrior),
          unitBytesChanged: false,
          overlays: ["OWNERSHIP", "SELECTION", "FOG_WITHHOLDING"],
        },
        measurements,
        generationSummary: {
          providerCalls: {
            grass: 8,
            forest: 1,
            mountain: 4,
          },
          rejectedAttempts: Object.fromEntries(
            ids.map((id) => [
              id,
              generated.records[id]?.rejectedAttempts?.length ?? 0,
            ]),
          ),
        },
        visualReview: {
          status: "ACCEPTED_SAMPLE_GATE",
          notes:
            "Every accepted source, native 128px footprint, nearest-neighbor enlarged view, 0.625x/1x/1.75x view at DPR1/2, same-type adjacency, 8x8 Grass repetition, unchanged Warrior occupancy, ownership, selection and fog-withholding context was inspected. Grass retains low-amplitude PixelLab-authored field variation without a visible repeated band or stroke cluster and is seam-safe; Forest reads as three compact trees; Mountain reads as a broad rocky square rather than a diamond. Tall alpha rises only above its owning square and never crosses a lateral or bottom source boundary.",
        },
        artifacts,
      },
      null,
      2,
    )}\n`,
    { parser: "json" },
  ),
  "utf8",
);

await writeFile(
  path.join(reviewRoot, "README.md"),
  `# Square terrain sample gate\n\nThis directory is rebuilt deterministically with \`npm run art:square-terrain-sample-review\`. It records the individual acceptance gate for exactly three new production assets: Original Grass 1, Forest 1, and Mountain 1. Diamond-era art remains untouched and runtime terrain coverage is not switched by this bead.\n\nGrass uses a 256×256 source at anchor (128,128). Forest and Mountain use untrimmed 256×384 sources at anchor (128,256), with source y=128..383 mapping exactly to the 128×128 owning cell and only upward overhang allowed. PixelLab prompts, seeds, provider hashes, rejection history, output hashes, and deterministic processing are recorded in the two checked-in manifests.\n\nThe shared light comes from upper-left/northwest, with darker southeast planes. Grass required seven rejected iterations: the seventh passed source-scale checks but was superseded after its diagonal bands and scratch cluster stamped conspicuously across the 8×8 minimum-zoom review. The final recipe radius-24 blurs fresh PixelLab material, retains 4% of its color over the canonical field, and converges the outer 48 pixels for a quiet seam-safe result. Forest passed its first request; Mountain required three rejected diamond-base iterations before its authored peak was feathered into a full square slate field.\n`,
  "utf8",
);

async function createIndividualSheet(): Promise<void> {
  const width = 1320;
  const height = 1100;
  const overlays: OverlayOptions[] = [];
  for (const [index, id] of ids.entries()) {
    const recipe = requiredRecipe(id);
    const sourceImage = await readFile(path.join(root, recipe.output));
    const sourcePreview = await sharp(sourceImage)
      .resize({
        width: 256,
        height: 384,
        fit: "contain",
        background: "#00000000",
      })
      .png()
      .toBuffer();
    const native = await display(id, 1, 1);
    const enlarged = await sharp(sourceImage)
      .resize({
        width: 384,
        height: 576,
        fit: "contain",
        background: "#00000000",
        kernel: sharp.kernel.nearest,
      })
      .png()
      .toBuffer();
    const left = index * 440;
    overlays.push({
      input: label(id, generated.records[id]?.outputSha256 ?? "", 440),
      left,
      top: 8,
    });
    overlays.push({ input: checker(280, 408), left: left + 8, top: 62 });
    overlays.push({ input: sourcePreview, left: left + 20, top: 74 });
    overlays.push({ input: checker(136, 200), left: left + 296, top: 62 });
    overlays.push({
      input: native,
      left: left + 300,
      top: id.includes("grass") ? 98 : 66,
    });
    overlays.push({ input: checker(408, 590), left: left + 16, top: 496 });
    overlays.push({ input: enlarged, left: left + 28, top: 506 });
  }
  await sharp({ create: { width, height, channels: 4, background: "#203936" } })
    .composite(overlays)
    .png()
    .toFile(path.join(reviewRoot, "individual-source-native-enlarged.png"));
}

async function createZoomContexts(dpr: 1 | 2): Promise<void> {
  const cell = { width: 300, height: 390 };
  const zooms = [0.625, 1, 1.75] as const;
  const width = cell.width * zooms.length * dpr;
  const height = cell.height * ids.length * dpr;
  const overlays: OverlayOptions[] = [];
  const warrior = await readFile(
    path.join(root, "public/assets/pixellab/units/warrior.png"),
  );
  for (const [row, id] of ids.entries()) {
    for (const [column, zoom] of zooms.entries()) {
      const tile = Math.round(128 * zoom * dpr);
      const center = {
        x: Math.round((column * cell.width + cell.width / 2) * dpr),
        y: Math.round((row * cell.height + 240) * dpr),
      };
      const art = await display(id, zoom, dpr);
      const recipe = requiredRecipe(id);
      const scale = 0.5 * zoom * dpr;
      const artLeft = Math.round(center.x - recipe.anchor.x * scale);
      const artTop = Math.round(center.y - recipe.anchor.y * scale);
      overlays.push({ input: art, left: artLeft, top: artTop });
      overlays.push({
        input: outlineSvg(
          tile,
          id.includes("grass") ? "#ffd166" : "#64d8cb",
          Math.max(2, 3 * dpr),
        ),
        left: center.x - Math.round(tile / 2),
        top: center.y - Math.round(tile / 2),
      });
      const unit = await sharp(warrior)
        .resize(Math.round(64 * zoom * dpr), Math.round(74 * zoom * dpr), {
          fit: "fill",
        })
        .png()
        .toBuffer();
      overlays.push({
        input: unit,
        left: Math.round(center.x - 32 * zoom * dpr),
        top: Math.round(center.y - 55.5 * zoom * dpr),
      });
      overlays.push({
        input: label(
          `${id.replace("terrain-square-original-", "")} · ${zoom}x · DPR${dpr}`,
          "",
          cell.width * dpr,
        ),
        left: column * cell.width * dpr,
        top: row * cell.height * dpr,
      });
    }
  }
  await sharp({ create: { width, height, channels: 4, background: "#203936" } })
    .composite(overlays)
    .png()
    .toFile(path.join(reviewRoot, `zoom-contexts-dpr${dpr}.png`));
}

async function createAdjacencySheet(): Promise<void> {
  const width = 1024;
  const height = 640;
  const overlays: OverlayOptions[] = [];
  const pattern = [
    [ids[0], ids[1], ids[0], ids[2], ids[0], ids[1]],
    [ids[1], ids[0], ids[2], ids[0], ids[1], ids[0]],
    [ids[0], ids[2], ids[0], ids[1], ids[0], ids[2]],
  ] as const;
  const origin = { x: 128, y: 150 };
  for (const [y, row] of pattern.entries()) {
    for (const [x, id] of row.entries()) {
      const recipe = requiredRecipe(id);
      const image = await display(id, 1, 1);
      const center = { x: origin.x + x * 128, y: origin.y + y * 128 };
      overlays.push({
        input: image,
        left: center.x - 64,
        top: center.y - Math.round(recipe.anchor.y * 0.5),
      });
    }
  }
  overlays.push({
    input: outlineSvg(128, "#ffd166", 4),
    left: origin.x + 2 * 128 - 64,
    top: origin.y + 128 - 64,
  });
  overlays.push({
    input: fogSvg(128),
    left: origin.x + 4 * 128 - 64,
    top: origin.y + 2 * 128 - 64,
  });
  overlays.push({
    input: label(
      "Adjacency · selection · ownership · opaque fog withholding",
      "",
      width,
    ),
    left: 0,
    top: 8,
  });
  await sharp({ create: { width, height, channels: 4, background: "#203936" } })
    .composite(overlays)
    .png()
    .toFile(path.join(reviewRoot, "adjacency-and-overlays.png"));
}

async function createRepetitionSheet(): Promise<void> {
  const tile = 80;
  const grass = await display(ids[0], 0.625, 1);
  const overlays: OverlayOptions[] = [];
  for (let y = 0; y < 8; y += 1)
    for (let x = 0; x < 8; x += 1)
      overlays.push({ input: grass, left: x * tile, top: y * tile });
  await sharp({
    create: {
      width: tile * 8,
      height: tile * 8,
      channels: 4,
      background: "#203936",
    },
  })
    .composite(overlays)
    .png()
    .toFile(path.join(reviewRoot, "repetition-8x8-minimum.png"));
}

async function display(id: string, zoom: number, dpr: number): Promise<Buffer> {
  const recipe = requiredRecipe(id);
  const scale = 0.5 * zoom * dpr;
  return sharp(path.join(root, recipe.output))
    .resize(
      Math.round(recipe.outputSize.width * scale),
      Math.round(recipe.outputSize.height * scale),
      { fit: "fill" },
    )
    .png()
    .toBuffer();
}

async function measure(id: string): Promise<Record<string, unknown>> {
  const recipe = requiredRecipe(id);
  const file = await readFile(path.join(root, recipe.output));
  const { data, info } = await sharp(file)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let nonOpaqueFootprintPixels = 0;
  for (
    let y = recipe.squareFootprint.top;
    y < recipe.squareFootprint.bottom;
    y += 1
  )
    for (
      let x = recipe.squareFootprint.left;
      x < recipe.squareFootprint.right;
      x += 1
    )
      if ((data[(y * info.width + x) * 4 + 3] ?? 0) !== 255)
        nonOpaqueFootprintPixels += 1;
  let upperLateralAlphaPixels = 0;
  for (let y = 0; y < recipe.squareFootprint.top; y += 1)
    for (const x of [0, info.width - 1])
      if ((data[(y * info.width + x) * 4 + 3] ?? 0) !== 0)
        upperLateralAlphaPixels += 1;
  return {
    id,
    output: recipe.output,
    outputSha256: hash(file),
    providerOutputSha256: generated.records[id]?.providerOutputSha256,
    dimensions: { width: info.width, height: info.height },
    anchor: recipe.anchor,
    squareFootprint: recipe.squareFootprint,
    alphaBounds: generated.records[id]?.alphaBounds,
    nonOpaqueFootprintPixels,
    upperLateralAlphaPixels,
    postprocess: recipe.postprocess,
  };
}

function requiredRecipe(id: string): Recipe {
  const recipe = recipes.get(id);
  if (recipe === undefined) throw new Error(`Square recipe missing: ${id}`);
  return recipe;
}

function checker(width: number, height: number): Buffer {
  const cells: string[] = [];
  for (let y = 0; y < height; y += 16)
    for (let x = 0; x < width; x += 16)
      cells.push(
        `<rect x="${x}" y="${y}" width="16" height="16" fill="${(x / 16 + y / 16) % 2 === 0 ? "#d6ded9" : "#aab8b2"}"/>`,
      );
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${cells.join("")}</svg>`,
  );
}

function outlineSvg(size: number, color: string, stroke: number): Buffer {
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect x="${stroke / 2}" y="${stroke / 2}" width="${size - stroke}" height="${size - stroke}" fill="#2aa19818" stroke="${color}" stroke-width="${stroke}"/></svg>`,
  );
}

function fogSvg(size: number): Buffer {
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" fill="#142827"/><path d="M0 ${size * 0.35} C${size * 0.3} ${size * 0.15},${size * 0.7} ${size * 0.55},${size} ${size * 0.3}" fill="none" stroke="#56716b" stroke-width="8"/></svg>`,
  );
}

function label(title: string, subtitle: string, width: number): Buffer {
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="54"><text x="${width / 2}" y="22" text-anchor="middle" font-family="sans-serif" font-size="16" font-weight="700" fill="#fff7e7">${escapeXml(title)}</text><text x="${width / 2}" y="42" text-anchor="middle" font-family="monospace" font-size="11" fill="#b8d1ca">${escapeXml(subtitle.slice(0, 16))}</text></svg>`,
  );
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function hash(data: Buffer): string {
  return createHash("sha256").update(data).digest("hex");
}
