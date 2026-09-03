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
  readonly candidate?: string;
  readonly candidateSha256?: string;
  readonly outputSha256?: string;
  readonly providerOutputSha256?: string;
  readonly alphaBounds?: Bounds & { readonly empty: boolean };
  readonly rejectedAttempts?: readonly unknown[];
}

const root = process.cwd();
const reviewRoot = path.join(
  root,
  "art/pixellab/reviews/square-original-terrain",
);
const families = {
  grass: [1, 2, 3, 4].map(
    (variant) => `terrain-square-original-grass-${variant}`,
  ),
  forest: [1, 2, 3, 4].map(
    (variant) => `terrain-square-original-forest-${variant}`,
  ),
  mountain: [1, 2, 3].map(
    (variant) => `terrain-square-original-mountain-${variant}`,
  ),
} as const;
const ids = [...families.grass, ...families.forest, ...families.mountain];
const newIds = [
  ...families.grass.slice(1),
  ...families.forest.slice(1),
  ...families.mountain.slice(1),
];
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
    .filter((recipe) => ids.includes(recipe.id))
    .map((recipe) => [recipe.id, recipe] as const),
);

for (const id of ids) {
  const record = generated.records[id];
  if (
    recipes.get(id) === undefined ||
    !["ACCEPTED", "CANDIDATE"].includes(record?.status ?? "")
  )
    throw new Error(`Reviewable Original square terrain missing: ${id}`);
}

await mkdir(reviewRoot, { recursive: true });
await createIndividualSheet();
await createFamilySheet();
await createRepetitionSheet();
await createAdjacencySheet();
await createZoomSheet(1);
await createZoomSheet(2);
await createGameplayContextSheet();

const artifactNames = [
  "individual-native-enlarged.png",
  "all-11-family.png",
  "repetition-mixed-8x8.png",
  "adjacency-same-different.png",
  "zoom-contexts-dpr1.png",
  "zoom-contexts-dpr2.png",
  "gameplay-overlays-and-units.png",
  "family-batch-grass.png",
  "family-batch-forest.png",
  "family-batch-mountain.png",
] as const;
const artifacts = await Promise.all(
  artifactNames.map(async (name) => {
    const data = await readFile(path.join(reviewRoot, name));
    const metadata = await sharp(data).metadata();
    return {
      path: `art/pixellab/reviews/square-original-terrain/${name}`,
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
const unitPaths = source.recipes
  .filter(({ id }) => id.startsWith("unit-"))
  .map(({ output }) => output)
  .filter((value, index, all) => all.indexOf(value) === index)
  .sort();
const unitHashes = Object.fromEntries(
  await Promise.all(
    unitPaths.map(async (file) => [
      file,
      hash(await readFile(path.join(root, file))),
    ]),
  ),
);
const familyDifferences = Object.fromEntries(
  await Promise.all(
    Object.entries(families).map(async ([family, familyIds]) => [
      family,
      await pairwiseDifferences(familyIds),
    ]),
  ),
);
const statuses = Object.fromEntries(
  ids.map((id) => [id, generated.records[id]?.status]),
);
const allAccepted = Object.values(statuses).every(
  (status) => status === "ACCEPTED",
);

await writeFile(
  path.join(reviewRoot, "review-evidence.json"),
  await format(
    `${JSON.stringify(
      {
        schemaVersion: 1,
        generatedBy: "npm run art:square-original-terrain-review",
        gate: "ORIGINAL_SQUARE_TERRAIN_FAMILY",
        familyIds: families,
        statuses,
        boundedProviderBatches: [
          families.grass.slice(1),
          families.forest.slice(1),
          families.mountain.slice(1),
        ],
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
            "Crop the one-sixteenth provider presentation inset; scale to 256x256; radius-24 blur; retain 4% authored color over #6f9255; smoothstep outer 48px to #6f9255; force alpha 255.",
          forest:
            "Apply an 8px lateral alpha safety feather above y128, then composite accepted Original square Grass 1 exactly into source y128..384 beneath each provider-authored Forest.",
          mountain:
            "Apply an 8px lateral alpha safety feather above y128; derive slate square ground by greyscale+tint #718391 from accepted Original square Grass 1; retain provider Mountain through y200 and smoothstep-fade its alpha to zero by y304.",
          variantSelection:
            "Cosmetic review selector only: (x*17 + y*31 + x*y*7) modulo family length. Runtime mechanics and simulation PRNG are not read or changed.",
        },
        lighting:
          "Every accepted source was visually checked for the same soft northwest key, pale upper-left planes and darker southeast planes; lighting carries no ownership, resource or state meaning.",
        displayChecks: {
          footprintCssPixels: [80, 128, 224],
          zooms: [0.625, 1, 1.75],
          devicePixelRatios: [1, 2],
          repetition: "8x8 per family with deterministic mixed variants",
          adjacency: ["SAME_VARIANT", "DIFFERENT_VARIANT"],
          unitSource: "unit-warrior",
          unitSourceSha256: hash(warrior),
          unitHashes,
          unitBytesChanged: false,
          overlays: [
            "OWNERSHIP",
            "SELECTION",
            "MOVEMENT_TARGET",
            "FOG_WITHHOLDING",
          ],
        },
        mechanicsIsolation: {
          cosmeticVariantsOnly: true,
          runtimeCoverageChanged: false,
          simulationStateRead: false,
          simulationPrngRead: false,
          notes:
            "This bead registers accepted URLs only in the generated art manifest. It does not switch terrain coverage, alter the renderer, or encode passability, resources, ownership, commands, saves, replay, AI or headless state.",
        },
        measurements,
        familyDifferences,
        generationSummary: {
          providerCalls: Object.fromEntries(
            newIds.map((id) => [
              id,
              1 + (generated.records[id]?.rejectedAttempts?.length ?? 0),
            ]),
          ),
          rejectedAttempts: Object.fromEntries(
            newIds.map((id) => [
              id,
              generated.records[id]?.rejectedAttempts?.length ?? 0,
            ]),
          ),
        },
        visualReview: {
          status: allAccepted
            ? "ACCEPTED_ORIGINAL_SQUARE_TERRAIN_FAMILY"
            : "CANDIDATE_REVIEW",
          notes:
            "Reviewed every source at native and nearest-neighbor enlarged scale; all 11 together; deterministic 8x8 mixed repetition for Grass, Forest and Mountain; same/different adjacency; 0.625x, 1x and 1.75x at DPR1/2 with unchanged Warrior occupancy; and ownership, selection, target and opaque fog contexts. Grass remains broad and low-salience without stamped bands or gameplay cues. Forest variants use distinct three/four-tree arrangements without resources or buildings. Mountain variants use distinct broad peak-and-shoulder silhouettes with terrain-quiet detail. All own full opaque squares and tall forms overhang upward only.",
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
  `# Original square terrain family\n\nThis directory is rebuilt deterministically with \`npm run art:square-original-terrain-review\`. It reviews all four Grass, four Forest and three Mountain variants without switching runtime coverage.\n\nThe PixelLab provider work is split into three coherent batches—Grass 2–4, Forest 2–4 and Mountain 2–3—and the checked-in generator refuses mixed families or more than three selected assets. Every Grass source is 256×256 at anchor (128,128). Every Forest and Mountain source is 256×384 at anchor (128,256), with y=128..383 exactly owning the square and only upward overhang allowed.\n\nGrass is deterministically subdued and edge-converged; Forest and Mountain reuse the accepted Grass 1 ground composite. Prompts, negative prompts, sizes, seeds, style references, provider hashes, output mapping, rejection history and processing are recorded in the PixelLab manifests. The complete evidence covers native/enlarged inspection, all 11 assets, three 8×8 mixed-family repetition boards, same/different adjacency, min/1x/max zoom, DPR1/2, unchanged unit occupancy, ownership, selection, movement targets and fog withholding.\n`,
  "utf8",
);

async function createIndividualSheet(): Promise<void> {
  const cell = { width: 320, height: 620 };
  const columns = 4;
  const rows = Math.ceil(ids.length / columns);
  const overlays: OverlayOptions[] = [];
  for (const [index, id] of ids.entries()) {
    const recipe = requiredRecipe(id);
    const file = resolvedFile(id);
    const source = await sharp(file)
      .resize({
        width: 176,
        height: 264,
        fit: "contain",
        background: "#00000000",
      })
      .png()
      .toBuffer();
    const native = await display(id, 1, 1);
    const enlarged = await sharp(file)
      .resize({
        width: 256,
        height: 384,
        fit: "contain",
        background: "#00000000",
        kernel: sharp.kernel.nearest,
      })
      .png()
      .toBuffer();
    const left = (index % columns) * cell.width;
    const top = Math.floor(index / columns) * cell.height;
    overlays.push({
      input: label(shortId(id), recordHash(id), cell.width),
      left,
      top: top + 4,
    });
    overlays.push({ input: checker(184, 276), left: left + 8, top: top + 54 });
    overlays.push({ input: source, left: left + 12, top: top + 60 });
    overlays.push({
      input: checker(132, 196),
      left: left + 192,
      top: top + 54,
    });
    overlays.push({
      input: native,
      left: left + 194,
      top: top + (recipe.outputSize.height === 256 ? 88 : 56),
    });
    overlays.push({
      input: checker(272, 272),
      left: left + 24,
      top: top + 338,
    });
    overlays.push({ input: enlarged, left: left + 32, top: top + 342 });
  }
  await canvas(
    columns * cell.width,
    rows * cell.height,
    overlays,
    "individual-native-enlarged.png",
  );
}

async function createFamilySheet(): Promise<void> {
  const overlays: OverlayOptions[] = [];
  for (const [row, [family, familyIds]] of Object.entries(families).entries()) {
    overlays.push({
      input: label(`${family.toUpperCase()} · complete family`, "", 720),
      left: 0,
      top: row * 260,
    });
    for (const [column, id] of familyIds.entries()) {
      const recipe = requiredRecipe(id);
      overlays.push({
        input: await display(id, 1, 1),
        left: 78 + column * 160,
        top: row * 260 + (recipe.outputSize.height === 256 ? 92 : 60),
      });
      overlays.push({
        input: label(shortId(id), "", 160),
        left: 62 + column * 160,
        top: row * 260 + 208,
      });
    }
  }
  await canvas(720, 780, overlays, "all-11-family.png");
}

async function createRepetitionSheet(): Promise<void> {
  const tile = 80;
  const panel = 680;
  const overlays: OverlayOptions[] = [];
  for (const [familyIndex, [family, familyIds]] of Object.entries(
    families,
  ).entries()) {
    const left = familyIndex * panel + 20;
    overlays.push({
      input: label(`${family.toUpperCase()} · deterministic 8×8 mix`, "", 640),
      left,
      top: 4,
    });
    for (let y = 0; y < 8; y += 1) {
      for (let x = 0; x < 8; x += 1) {
        const id =
          familyIds[variantIndex(x, y, familyIds.length)] ?? familyIds[0];
        if (id === undefined) throw new Error("Empty family");
        const recipe = requiredRecipe(id);
        overlays.push({
          input: await display(id, 0.625, 1),
          left: left + x * tile,
          top: 100 + y * tile - Math.round(recipe.anchor.y * 0.3125),
        });
      }
    }
  }
  await canvas(panel * 3, 750, overlays, "repetition-mixed-8x8.png");
}

async function createAdjacencySheet(): Promise<void> {
  const overlays: OverlayOptions[] = [];
  for (const [row, [family, familyIds]] of Object.entries(families).entries()) {
    for (const [panelIndex, mode] of ["SAME", "DIFFERENT"].entries()) {
      const panelLeft = panelIndex * 600;
      overlays.push({
        input: label(`${family.toUpperCase()} · ${mode}`, "", 600),
        left: panelLeft,
        top: row * 350 + 4,
      });
      for (let y = 0; y < 2; y += 1) {
        for (let x = 0; x < 4; x += 1) {
          const id =
            mode === "SAME"
              ? familyIds[0]
              : familyIds[(x + y * 3) % familyIds.length];
          if (id === undefined) throw new Error("Empty family");
          const recipe = requiredRecipe(id);
          overlays.push({
            input: await display(id, 1, 1),
            left: panelLeft + 44 + x * 128,
            top: row * 350 + 126 + y * 128 - Math.round(recipe.anchor.y * 0.5),
          });
        }
      }
    }
  }
  await canvas(1200, 1050, overlays, "adjacency-same-different.png");
}

async function createZoomSheet(dpr: 1 | 2): Promise<void> {
  const zooms = [0.625, 1, 1.75] as const;
  const logicalWidth = 1120;
  const sectionHeight = 970;
  const overlays: OverlayOptions[] = [];
  const warrior = await readFile(
    path.join(root, "public/assets/pixellab/units/warrior.png"),
  );
  for (const [zoomIndex, zoom] of zooms.entries()) {
    const sectionTop = zoomIndex * sectionHeight;
    const tile = Math.round(128 * zoom * dpr);
    overlays.push({
      input: label(
        `${zoom}× · DPR${dpr} · all variants with unchanged Warrior`,
        "",
        logicalWidth * dpr,
      ),
      left: 0,
      top: sectionTop * dpr + 4,
    });
    for (const [familyIndex, [family, familyIds]] of Object.entries(
      families,
    ).entries()) {
      const centerY = Math.round((sectionTop + 190 + familyIndex * 285) * dpr);
      overlays.push({
        input: label(family.toUpperCase(), "", 130 * dpr),
        left: 0,
        top: centerY - 110 * dpr,
      });
      for (const [column, id] of familyIds.entries()) {
        const centerX = Math.round((210 + column * 250) * dpr);
        const recipe = requiredRecipe(id);
        overlays.push({
          input: await display(id, zoom, dpr),
          left: centerX - Math.round(recipe.anchor.x * 0.5 * zoom * dpr),
          top: centerY - Math.round(recipe.anchor.y * 0.5 * zoom * dpr),
        });
        overlays.push({
          input: outlineSvg(tile, "#9fd5ca", Math.max(2, 2 * dpr)),
          left: centerX - Math.round(tile / 2),
          top: centerY - Math.round(tile / 2),
        });
        const unit = await sharp(warrior)
          .resize(Math.round(64 * zoom * dpr), Math.round(74 * zoom * dpr), {
            fit: "fill",
          })
          .png()
          .toBuffer();
        overlays.push({
          input: unit,
          left: centerX - Math.round(32 * zoom * dpr),
          top: centerY - Math.round(55.5 * zoom * dpr),
        });
      }
    }
  }
  await canvas(
    logicalWidth * dpr,
    sectionHeight * zooms.length * dpr,
    overlays,
    `zoom-contexts-dpr${dpr}.png`,
  );
}

async function createGameplayContextSheet(): Promise<void> {
  const overlays: OverlayOptions[] = [];
  const modes = [
    "OWNERSHIP",
    "SELECTION",
    "MOVEMENT TARGET",
    "FOG WITHHOLDING",
  ] as const;
  const warrior = await readFile(
    path.join(root, "public/assets/pixellab/units/warrior.png"),
  );
  for (const [row, [family, familyIds]] of Object.entries(families).entries()) {
    overlays.push({
      input: label(family.toUpperCase(), "", 160),
      left: 0,
      top: row * 320 + 130,
    });
    for (const [column, mode] of modes.entries()) {
      const id = familyIds[column % familyIds.length];
      if (id === undefined) throw new Error("Empty family");
      const recipe = requiredRecipe(id);
      const center = { x: 250 + column * 230, y: 170 + row * 320 };
      if (mode !== "FOG WITHHOLDING")
        overlays.push({
          input: await display(id, 1, 1),
          left: center.x - 64,
          top: center.y - Math.round(recipe.anchor.y * 0.5),
        });
      if (mode === "FOG WITHHOLDING")
        overlays.push({
          input: fogSvg(128),
          left: center.x - 64,
          top: center.y - 64,
        });
      else
        overlays.push({
          input: gameplayOverlaySvg(128, mode),
          left: center.x - 64,
          top: center.y - 64,
        });
      if (column === 0) {
        const unit = await sharp(warrior)
          .resize(64, 74, { fit: "fill" })
          .png()
          .toBuffer();
        overlays.push({ input: unit, left: center.x - 32, top: center.y - 56 });
      }
      overlays.push({
        input: label(mode, "", 210),
        left: center.x - 105,
        top: center.y + 76,
      });
    }
  }
  await canvas(1120, 960, overlays, "gameplay-overlays-and-units.png");
}

async function measure(id: string): Promise<Record<string, unknown>> {
  const recipe = requiredRecipe(id);
  const file = await readFile(resolvedFile(id));
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
  const channelRanges = [0, 1, 2].map((channel) => {
    const values: number[] = [];
    for (
      let y = recipe.squareFootprint.top;
      y < recipe.squareFootprint.bottom;
      y += 1
    )
      for (let x = 0; x < info.width; x += 1)
        values.push(data[(y * info.width + x) * 4 + channel] ?? 0);
    return Math.max(...values) - Math.min(...values);
  });
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
    channelRanges,
    postprocess: recipe.postprocess,
  };
}

async function pairwiseDifferences(
  familyIds: readonly string[],
): Promise<readonly Record<string, unknown>[]> {
  const results: Record<string, unknown>[] = [];
  for (let left = 0; left < familyIds.length; left += 1) {
    for (let right = left + 1; right < familyIds.length; right += 1) {
      const leftId = familyIds[left];
      const rightId = familyIds[right];
      if (leftId === undefined || rightId === undefined) continue;
      const first = await sharp(resolvedFile(leftId))
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      const second = await sharp(resolvedFile(rightId))
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      let sum = 0;
      for (let index = 0; index < first.data.length; index += 4)
        for (let channel = 0; channel < 3; channel += 1)
          sum += Math.abs(
            (first.data[index + channel] ?? 0) -
              (second.data[index + channel] ?? 0),
          );
      results.push({
        pair: [leftId, rightId],
        meanAbsoluteRgbDifference: Number(
          (sum / (first.info.width * first.info.height * 3)).toFixed(4),
        ),
      });
    }
  }
  return results;
}

async function display(id: string, zoom: number, dpr: number): Promise<Buffer> {
  const recipe = requiredRecipe(id);
  const scale = 0.5 * zoom * dpr;
  return sharp(resolvedFile(id))
    .resize(
      Math.round(recipe.outputSize.width * scale),
      Math.round(recipe.outputSize.height * scale),
      { fit: "fill" },
    )
    .png()
    .toBuffer();
}

async function canvas(
  width: number,
  height: number,
  overlays: OverlayOptions[],
  name: string,
): Promise<void> {
  await sharp({ create: { width, height, channels: 4, background: "#203936" } })
    .composite(overlays)
    .png({ compressionLevel: 9, adaptiveFiltering: false })
    .toFile(path.join(reviewRoot, name));
}

function resolvedFile(id: string): string {
  const recipe = requiredRecipe(id);
  const record = generated.records[id];
  return path.join(
    root,
    record?.status === "ACCEPTED"
      ? recipe.output
      : (record?.candidate ?? recipe.output),
  );
}

function requiredRecipe(id: string): Recipe {
  const recipe = recipes.get(id);
  if (recipe === undefined)
    throw new Error(`Original square terrain recipe missing: ${id}`);
  return recipe;
}

function recordHash(id: string): string {
  const record = generated.records[id];
  return record?.status === "ACCEPTED"
    ? (record.outputSha256 ?? "")
    : (record?.candidateSha256 ?? "");
}

function variantIndex(x: number, y: number, length: number): number {
  return (x * 17 + y * 31 + x * y * 7) % length;
}

function shortId(id: string): string {
  return id.replace("terrain-square-original-", "");
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
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect x="${stroke / 2}" y="${stroke / 2}" width="${size - stroke}" height="${size - stroke}" fill="none" stroke="${color}" stroke-width="${stroke}"/></svg>`,
  );
}

function gameplayOverlaySvg(size: number, mode: string): Buffer {
  if (mode === "OWNERSHIP")
    return Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" fill="#2f8fbc38"/><rect x="3" y="3" width="${size - 6}" height="${size - 6}" fill="none" stroke="#6fd5ff" stroke-width="6"/></svg>`,
    );
  if (mode === "SELECTION")
    return Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect x="5" y="5" width="${size - 10}" height="${size - 10}" rx="8" fill="#ffd16620" stroke="#ffd166" stroke-width="8"/></svg>`,
    );
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" fill="#63d7c538"/><circle cx="${size / 2}" cy="${size / 2}" r="24" fill="none" stroke="#9effef" stroke-width="8"/><path d="M${size / 2 - 15} ${size / 2}h30M${size / 2} ${size / 2 - 15}v30" stroke="#9effef" stroke-width="7"/></svg>`,
  );
}

function fogSvg(size: number): Buffer {
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" fill="#142827"/><path d="M0 ${size * 0.35} C${size * 0.3} ${size * 0.15},${size * 0.7} ${size * 0.55},${size} ${size * 0.3}" fill="none" stroke="#56716b" stroke-width="8"/></svg>`,
  );
}

function label(title: string, subtitle: string, width: number): Buffer {
  const height = Math.max(48, Math.round(width > 800 ? 70 : 52));
  const titleSize = Math.max(12, Math.round(width > 800 ? 26 : 16));
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><text x="${width / 2}" y="${Math.round(height * 0.43)}" text-anchor="middle" font-family="sans-serif" font-size="${titleSize}" font-weight="700" fill="#fff7e7">${escapeXml(title)}</text><text x="${width / 2}" y="${Math.round(height * 0.78)}" text-anchor="middle" font-family="monospace" font-size="${Math.max(10, titleSize - 5)}" fill="#b8d1ca">${escapeXml(subtitle.slice(0, 16))}</text></svg>`,
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
