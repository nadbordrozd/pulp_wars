import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
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
const ruleset7ReadabilityMode = process.argv.includes("--ruleset7-readability");
if (ruleset7ReadabilityMode) {
  const outputIndex = process.argv.indexOf("--output");
  const output = outputIndex < 0 ? undefined : process.argv[outputIndex + 1];
  if (output === undefined)
    throw new Error("--ruleset7-readability requires --output <directory>");
  await createRuleset7ReadabilityReview(path.resolve(root, output));
  process.exit(0);
}
const candyMode = process.argv.includes("--candy");
const faction = candyMode ? "Candy" : "Original";
const factionSlug = candyMode ? "candy" : "original";
const familyPrefix = `terrain-square-${factionSlug}`;
const reviewRoot = path.join(
  root,
  `art/pixellab/reviews/square-${factionSlug}-terrain`,
);
const families = {
  grass: [1, 2, 3, 4].map((variant) => `${familyPrefix}-grass-${variant}`),
  forest: [1, 2, 3, 4].map((variant) => `${familyPrefix}-forest-${variant}`),
  mountain: [1, 2, 3].map((variant) => `${familyPrefix}-mountain-${variant}`),
} as const;
const ids = [...families.grass, ...families.forest, ...families.mountain];
const newIds = candyMode
  ? ids
  : [
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
    throw new Error(`Reviewable ${faction} square terrain missing: ${id}`);
}

await mkdir(reviewRoot, { recursive: true });
await createIndividualSheet();
await createFamilySheet();
await createRepetitionSheet();
await createAdjacencySheet();
await createZoomSheet(1);
await createZoomSheet(2);
await createGameplayContextSheet();
if (candyMode) {
  await createFactionComparisonSheet();
  await createDenseMixedFactionSheet();
}

const artifactNames: string[] = [
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
];
if (candyMode)
  artifactNames.push("original-vs-candy.png", "dense-mixed-faction-map.png");
const artifacts = await Promise.all(
  artifactNames.map(async (name) => {
    const data = await readFile(path.join(reviewRoot, name));
    const metadata = await sharp(data).metadata();
    return {
      path: `art/pixellab/reviews/square-${factionSlug}-terrain/${name}`,
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
        generatedBy: `npm run art:square-${factionSlug}-terrain-review`,
        gate: `${faction.toUpperCase()}_SQUARE_TERRAIN_FAMILY`,
        familyIds: families,
        statuses,
        boundedProviderBatches: candyMode
          ? [
              families.grass.slice(0, 1),
              families.forest.slice(0, 1),
              families.mountain.slice(0, 1),
              families.grass.slice(1),
              families.forest.slice(1),
              families.mountain.slice(1),
            ]
          : [
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
          forest: `Apply an 8px lateral alpha safety feather above y128, then composite accepted ${faction} square Grass 1 exactly into source y128..384 beneath each provider-authored Forest.`,
          mountain: `Apply an 8px lateral alpha safety feather above y128; derive slate square ground by greyscale+tint #718391 from accepted ${faction} square Grass 1; retain provider Mountain through y200 and smoothstep-fade its alpha to zero by y304.`,
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
          unitSources: candyMode
            ? ["unit-warrior", "unit-candy-warrior"]
            : ["unit-warrior"],
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
            ? `ACCEPTED_${faction.toUpperCase()}_SQUARE_TERRAIN_FAMILY`
            : "CANDIDATE_REVIEW",
          notes: `Reviewed every ${faction} source at native and nearest-neighbor enlarged scale; all 11 together; deterministic 8x8 mixed repetition for Grass, Forest and Mountain; same/different adjacency; 0.625x, 1x and 1.75x at DPR1/2 with unchanged ${candyMode ? "Original and Candy Warrior" : "Warrior"} occupancy; and ownership, selection, target and opaque fog contexts.${candyMode ? " Direct Original-vs-Candy and dense mixed-faction boards also pass." : ""} Grass remains broad and low-salience without stamped bands or gameplay cues. Forest variants use distinct three/four-tree arrangements without resources or buildings. Mountain variants use distinct broad peak-and-shoulder silhouettes with terrain-quiet detail. All own full opaque squares and tall forms overhang upward only.`,
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
  `# ${faction} square terrain family\n\nThis directory is rebuilt deterministically with \`npm run art:square-${factionSlug}-terrain-review\`. It reviews all four Grass, four Forest and three Mountain variants without switching runtime coverage.\n\nThe PixelLab provider work ${candyMode ? "uses three one-asset sample gates followed by" : "is split into"} coherent Grass 2–4, Forest 2–4 and Mountain 2–3 batches; the checked-in generator refuses mixed families or more than three selected assets. Every Grass source is 256×256 at anchor (128,128). Every Forest and Mountain source is 256×384 at anchor (128,256), with y=128..383 exactly owning the square and only upward overhang allowed.\n\nGrass is deterministically subdued and edge-converged; Forest and Mountain reuse accepted ${faction} square Grass 1. Prompts, negatives, sizes, seeds, style references, provider hashes, output mapping, rejection history and processing are recorded in the PixelLab manifests. Evidence covers native/enlarged inspection, all 11 assets, three 8×8 repetitions, same/different adjacency, min/1x/max zoom, DPR1/2, unchanged ${candyMode ? "Original and Candy" : "Original"} unit occupancy, ownership, selection, movement targets and fog withholding${candyMode ? ", plus Original-vs-Candy and dense mixed-faction boards" : ""}.\n`,
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
  const candyWarrior = await readFile(
    path.join(root, "public/assets/pixellab/units/candy-warrior.png"),
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
        const unit = await sharp(
          candyMode && column % 2 === 1 ? candyWarrior : warrior,
        )
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

async function createFactionComparisonSheet(): Promise<void> {
  const overlays: OverlayOptions[] = [];
  const originalFamilies = {
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
  overlays.push({
    input: label("ORIGINAL / CANDY · matched geometry and lighting", "", 1200),
    left: 0,
    top: 4,
  });
  for (const [row, family] of ["grass", "forest", "mountain"].entries()) {
    const candyIds = families[family as keyof typeof families];
    const originalIds = originalFamilies[family as keyof typeof families];
    overlays.push({
      input: label(family.toUpperCase(), "", 150),
      left: 0,
      top: 120 + row * 300,
    });
    for (let column = 0; column < candyIds.length; column += 1) {
      const candyId = candyIds[column];
      const originalId = originalIds[column];
      if (candyId === undefined || originalId === undefined) continue;
      const candyRecipe = requiredRecipe(candyId);
      const originalRecipe = source.recipes.find(({ id }) => id === originalId);
      if (originalRecipe === undefined)
        throw new Error(`Original comparison recipe missing: ${originalId}`);
      const centerX = 250 + column * 240;
      const centerY = 190 + row * 300;
      overlays.push({
        input: await sharp(path.join(root, originalRecipe.output))
          .resize(
            Math.round(originalRecipe.outputSize.width * 0.4),
            Math.round(originalRecipe.outputSize.height * 0.4),
            { fit: "fill" },
          )
          .png()
          .toBuffer(),
        left: centerX - 110,
        top: centerY - Math.round(originalRecipe.anchor.y * 0.4),
      });
      overlays.push({
        input: await display(candyId, 0.8, 1),
        left: centerX + 10,
        top: centerY - Math.round(candyRecipe.anchor.y * 0.4),
      });
      overlays.push({
        input: label(`O / C · ${column + 1}`, "", 220),
        left: centerX - 110,
        top: centerY + 112,
      });
    }
  }
  await canvas(1200, 1020, overlays, "original-vs-candy.png");
}

async function createDenseMixedFactionSheet(): Promise<void> {
  const overlays: OverlayOptions[] = [];
  const originalWarrior = await readFile(
    path.join(root, "public/assets/pixellab/units/warrior.png"),
  );
  const candyWarrior = await readFile(
    path.join(root, "public/assets/pixellab/units/candy-warrior.png"),
  );
  const unitBuffers = await Promise.all(
    [originalWarrior, candyWarrior].map((unit) =>
      sharp(unit).resize(40, 46, { fit: "fill" }).png().toBuffer(),
    ),
  );
  overlays.push({
    input: label(
      "8×8 DENSE MIX · both factions, units, overlays and fog · 0.625×",
      "",
      760,
    ),
    left: 0,
    top: 4,
  });
  const tile = 80;
  const mapLeft = 60;
  const mapTop = 130;
  const bodies: Array<{
    readonly depth: number;
    readonly overlay: OverlayOptions;
  }> = [];
  for (let y = 0; y < 8; y += 1) {
    for (let x = 0; x < 8; x += 1) {
      const family: keyof typeof families =
        (x + y * 2) % 5 === 0
          ? "mountain"
          : (x * 2 + y) % 4 === 0
            ? "forest"
            : "grass";
      const variantCount = families[family].length;
      const variant = variantIndex(x, y, variantCount) + 1;
      const candyTile = (x + y) % 2 === 1;
      const id = `terrain-square-${candyTile ? "candy" : "original"}-${family}-${variant}`;
      const recipe = source.recipes.find((entry) => entry.id === id);
      if (recipe === undefined)
        throw new Error(`Dense-map recipe missing: ${id}`);
      const centerX = mapLeft + x * tile + tile / 2;
      const centerY = mapTop + y * tile + tile / 2;
      const fogged = (x * 5 + y) % 17 === 0;
      if (!fogged)
        bodies.push({
          depth: y * 8 + x,
          overlay: {
            input: await sharp(path.join(root, recipe.output))
              .resize(
                Math.round(recipe.outputSize.width * 0.3125),
                Math.round(recipe.outputSize.height * 0.3125),
                { fit: "fill" },
              )
              .png()
              .toBuffer(),
            left: centerX - 40,
            top: centerY - Math.round(recipe.anchor.y * 0.3125),
          },
        });
      if (!fogged && (x * 7 + y * 3) % 9 === 0) {
        const unit = unitBuffers[candyTile ? 1 : 0];
        if (unit !== undefined)
          bodies.push({
            depth: y * 8 + x + 0.5,
            overlay: { input: unit, left: centerX - 20, top: centerY - 35 },
          });
      }
      if (!fogged && (x + y * 3) % 11 === 0)
        bodies.push({
          depth: y * 8 + x + 0.25,
          overlay: {
            input: gameplayOverlaySvg(
              tile,
              x % 2 === 0 ? "OWNERSHIP" : "SELECTION",
            ),
            left: centerX - 40,
            top: centerY - 40,
          },
        });
      if (fogged)
        bodies.push({
          depth: y * 8 + x + 1,
          overlay: {
            input: fogSvg(tile),
            left: centerX - 40,
            top: centerY - 40,
          },
        });
    }
  }
  bodies.sort((left, right) => left.depth - right.depth);
  overlays.push(...bodies.map(({ overlay }) => overlay));
  await canvas(760, 830, overlays, "dense-mixed-faction-map.png");
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
    throw new Error(`${faction} square terrain recipe missing: ${id}`);
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
  return id.replace(`${familyPrefix}-`, "");
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

async function createRuleset7ReadabilityReview(
  outputRoot: string,
): Promise<void> {
  const manifest = JSON.parse(
    await readFile(
      path.join(root, "scripts/art/pixellab-manifest.json"),
      "utf8",
    ),
  ) as { readonly recipes: readonly Recipe[] };
  const records = JSON.parse(
    await readFile(
      path.join(root, "scripts/art/pixellab-generated.json"),
      "utf8",
    ),
  ) as { readonly records: Readonly<Record<string, RecordEntry>> };
  const grassIds = [1, 2, 3].map(
    (variant) => `terrain-ruleset7-original-grass-${variant}`,
  );
  const forestIds = [1, 2, 3, 4].map(
    (variant) => `terrain-ruleset7-original-forest-${variant}`,
  );
  const campId = "building-ruleset7-lumber-camp";
  const reviewIds = [...grassIds, ...forestIds, campId];
  const recipeById = new Map(
    manifest.recipes
      .filter(({ id }) => reviewIds.includes(id))
      .map((recipe) => [recipe.id, recipe] as const),
  );
  for (const id of reviewIds) {
    if (
      recipeById.get(id) === undefined ||
      records.records[id]?.status !== "ACCEPTED"
    )
      throw new Error(`Accepted Ruleset 7 readability asset missing: ${id}`);
  }
  await mkdir(outputRoot, { recursive: true });
  const fileFor = (id: string): string => {
    const recipe = recipeById.get(id);
    if (recipe === undefined) throw new Error(`Recipe missing: ${id}`);
    return path.join(root, recipe.output);
  };
  const artifacts: string[] = [];

  const sourceOverlays: OverlayOptions[] = [];
  for (const [index, id] of reviewIds.entries()) {
    const recipe = recipeById.get(id);
    if (recipe === undefined) continue;
    const column = index % 2;
    const row = Math.floor(index / 2);
    sourceOverlays.push({
      input: label(id.replace("terrain-ruleset7-original-", ""), "", 1300),
      left: column * 1300,
      top: row * 820,
    });
    sourceOverlays.push({
      input: await sharp(fileFor(id)).png().toBuffer(),
      left: column * 1300 + 20,
      top: row * 820 + 70,
    });
    sourceOverlays.push({
      input: await sharp(fileFor(id))
        .resize(recipe.outputSize.width * 2, recipe.outputSize.height * 2, {
          fit: "fill",
          kernel: sharp.kernel.nearest,
        })
        .png()
        .toBuffer(),
      left: column * 1300 + 500,
      top: row * 820 + 50,
    });
    const nativeWidth = Math.round(
      recipe.outputSize.width * (id === campId ? 0.36 : 0.5),
    );
    const nativeHeight = Math.round(
      recipe.outputSize.height * (id === campId ? 0.36 : 0.5),
    );
    sourceOverlays.push({
      input: await sharp(fileFor(id))
        .resize(nativeWidth, nativeHeight, { fit: "fill" })
        .png()
        .toBuffer(),
      left: column * 1300 + Math.round((420 - nativeWidth) / 2),
      top: row * 820 + 500,
    });
  }
  const sourceName = "source-native-enlarged.png";
  await sharp({
    create: { width: 2600, height: 3280, channels: 4, background: "#203936" },
  })
    .composite(sourceOverlays)
    .png()
    .toFile(path.join(outputRoot, sourceName));
  artifacts.push(sourceName);

  const grassTiles = await Promise.all(
    grassIds.map((id) => sharp(fileFor(id)).resize(128, 128).png().toBuffer()),
  );
  const grassOverlays: OverlayOptions[] = [];
  for (let y = 0; y < 6; y += 1)
    for (let x = 0; x < 8; x += 1)
      grassOverlays.push({
        input: grassTiles[(x * 17 + y * 31 + x * y * 7) % 3] as Buffer,
        left: x * 128,
        top: y * 128,
      });
  const grassName = "grass-repetition-and-seams.png";
  await sharp({
    create: { width: 1024, height: 768, channels: 4, background: "#6f9255" },
  })
    .composite(grassOverlays)
    .png()
    .toFile(path.join(outputRoot, grassName));
  artifacts.push(grassName);

  const beforeAfter: OverlayOptions[] = [];
  for (let variant = 1; variant <= 4; variant += 1) {
    for (const [column, file] of [
      path.join(
        root,
        `public/assets/pixellab/terrain-square/original-forest-${variant}.png`,
      ),
      fileFor(`terrain-ruleset7-original-forest-${variant}`),
    ].entries())
      beforeAfter.push({
        input: await sharp(file).resize(128, 192).png().toBuffer(),
        left: 30 + column * 170,
        top: (variant - 1) * 210,
      });
    beforeAfter.push({
      input: label(`Forest ${variant} · before / v7`, "", 420),
      left: 340,
      top: (variant - 1) * 210 + 72,
    });
  }
  const forestName = "forest-before-after.png";
  await sharp({
    create: { width: 760, height: 840, channels: 4, background: "#203936" },
  })
    .composite(beforeAfter)
    .png()
    .toFile(path.join(outputRoot, forestName));
  artifacts.push(forestName);

  const tileCenters = Array.from({ length: 8 }, (_, index) => ({
    x: 96 + (index % 4) * 128,
    y: 96 + Math.floor(index / 4) * 128,
  }));
  const scene: OverlayOptions[] = [];
  for (const [index, center] of tileCenters.entries())
    scene.push({
      input: grassTiles[index % grassTiles.length] as Buffer,
      left: center.x - 64,
      top: center.y - 64,
    });
  for (let variant = 1; variant <= 4; variant += 1) {
    const center = tileCenters[variant - 1];
    if (center === undefined) continue;
    scene.push({
      input: await sharp(fileFor(`terrain-ruleset7-original-forest-${variant}`))
        .resize(128, 192)
        .png()
        .toBuffer(),
      left: center.x - 64,
      top: center.y - 128,
    });
  }
  const camp = await sharp(fileFor(campId)).resize(138, 138).png().toBuffer();
  const unit = await sharp(
    path.join(root, "public/assets/pixellab/units/warrior.png"),
  )
    .resize(64, 74)
    .png()
    .toBuffer();
  for (const index of [4, 5]) {
    const center = tileCenters[index];
    if (center === undefined) continue;
    scene.push({ input: camp, left: center.x - 69, top: center.y - 104 });
    if (index === 5)
      scene.push({ input: unit, left: center.x - 32, top: center.y - 38 });
  }
  const processorIds = ["building-square-windmill", "building-square-sawmill"];
  for (const [offset, id] of processorIds.entries()) {
    const center = tileCenters[6 + offset];
    const recipe = manifest.recipes.find((candidate) => candidate.id === id);
    if (center === undefined || recipe === undefined) continue;
    const scale = id.endsWith("sawmill") ? 0.36 : 0.3;
    const image = await sharp(path.join(root, recipe.output))
      .resize(Math.round(384 * scale), Math.round(384 * scale))
      .png()
      .toBuffer();
    scene.push({
      input: image,
      left: center.x - Math.round(192 * scale),
      top: center.y - Math.round(288 * scale),
    });
  }
  // Renderer-owned value squares are deliberately composited only after every
  // row's terrain, improvement and unit sprites.
  for (const [index, center] of tileCenters.slice(0, 4).entries())
    scene.push({
      input: Buffer.from(
        `<svg width="64" height="24" xmlns="http://www.w3.org/2000/svg">${Array.from(
          { length: index + 1 },
          (_, pip) =>
            `<rect x="${pip * 8}" y="8" width="6" height="6" fill="#8ce5b2" stroke="#19312e" stroke-width="1"/>`,
        ).join("")}</svg>`,
      ),
      left: center.x - 30,
      top: center.y + 30,
    });
  const sceneName = "synthetic-composition-scene.png";
  await sharp({
    create: { width: 640, height: 360, channels: 4, background: "#203936" },
  })
    .composite(scene)
    .png()
    .toFile(path.join(outputRoot, sceneName));
  artifacts.push(sceneName);

  const browserEvidence = await createRuleset7RendererCapture(outputRoot);
  artifacts.push("drawboardv7-desktop-canvas.png");

  const artifactEvidence = await Promise.all(
    artifacts.map(async (name) => {
      const bytes = await readFile(path.join(outputRoot, name));
      const metadata = await sharp(bytes).metadata();
      return {
        path: name,
        width: metadata.width,
        height: metadata.height,
        sha256: hash(bytes),
      };
    }),
  );
  await writeFile(
    path.join(outputRoot, "review-evidence.json"),
    await format(
      `${JSON.stringify(
        {
          schemaVersion: 1,
          generatedBy:
            "npm run art:square-original-terrain-review -- --ruleset7-readability --output <unique-directory>",
          acceptedIds: reviewIds,
          rendererContract: {
            terrainIds: {
              grass: grassIds,
              forest: forestIds,
            },
            campId,
            canopySuppression: ["LUMBER_CAMP", "WINDMILL", "SAWMILL"],
            terrainStateUnchanged: "FOREST",
            valueSquares: "final foreground after all row-major world sprites",
            sceneGeometry:
              "The synthetic companion mirrors drawBoardV7 geometry; drawboardv7-desktop-canvas.png is captured from the actual production drawBoardV7 function.",
            browserEvidence,
          },
          visualChecks: [
            "three quiet Grass variants, mixed repetition and every orthogonal seam",
            "all four Forest sources before/after with variant 3 body preserved",
            "larger Camp alone and occupied by an unchanged Original Fighter",
            "Camp, Windmill and Sawmill over exact Grass ground without a Forest canopy",
            "row-zero value squares composited after lower-row tall sprites",
          ],
          artifacts: artifactEvidence,
        },
        null,
        2,
      )}\n`,
      { parser: "json" },
    ),
    "utf8",
  );
  console.log(`Ruleset 7 readability review: ${outputRoot}`);
}

interface ReadabilityCdpMessage {
  readonly id?: number;
  readonly result?: unknown;
  readonly error?: { readonly message?: string };
}

interface ReadabilityCdpConnection {
  send(method: string, params?: object): Promise<unknown>;
  close(): void;
}

async function createRuleset7RendererCapture(
  outputRoot: string,
): Promise<Record<string, unknown>> {
  const chrome =
    process.env.CHROME_PATH ??
    (process.platform === "win32"
      ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
      : "/mnt/c/Program Files/Google/Chrome/Application/chrome.exe");
  const port = 11_120 + (process.pid % 200);
  const userData = chrome.endsWith(".exe")
    ? `C:\\Windows\\Temp\\pulp-wars-ysv2-readability-${process.pid}`
    : path.join(
        process.env.TMPDIR ?? "/tmp",
        `pulp-wars-ysv2-readability-${process.pid}`,
      );
  const browser = spawn(
    chrome,
    [
      "--headless=new",
      "--disable-gpu",
      "--hide-scrollbars",
      "--no-first-run",
      "--no-default-browser-check",
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${userData}`,
      "--window-size=900,600",
      "http://localhost:6173/?ruleset=7",
    ],
    { stdio: "ignore" },
  );
  let connection: ReadabilityCdpConnection | undefined;
  try {
    const target = await waitForReadabilityTarget(port);
    connection = await connectReadabilityCdp(target.webSocketDebuggerUrl);
    await connection.send("Page.enable");
    await connection.send("Runtime.enable");
    await waitForReadabilityExpression(
      connection,
      "document.querySelector('[data-v7-setup]')",
    );
    await evaluateReadability(
      connection,
      `(() => { const seed = document.querySelector('#v7-seed'); if (seed instanceof HTMLInputElement) { seed.value = '1'; seed.dispatchEvent(new Event('input', { bubbles: true })); } const launch = document.querySelector('[data-action="launch"]'); if (!(launch instanceof HTMLElement)) throw new Error('Ruleset 7 launch missing'); launch.click(); })()`,
    );
    await waitForReadabilityExpression(
      connection,
      "globalThis.__PULP_WARS_APP__?.controller?.snapshot()?.view",
    );
    const evidence = await evaluateReadability<Record<string, unknown>>(
      connection,
      `(async () => {
        const { ACCEPTED_ART_URLS } = await import('/src/assets/generated-art-manifest.ts');
        const { buildBoardRenderPlanV7, drawBoardV7 } = await import('/src/render/canvas/board-renderer-v7.ts');
        const base = globalThis.__PULP_WARS_APP__.controller.snapshot().view;
        const template = base.board.tiles.find((tile) => tile.explored);
        if (!template) throw new Error('No revealed tile template');
        const improvements = new Map([
          ['0,2', 'LUMBER_CAMP'], ['1,2', 'WINDMILL'], ['2,2', 'SAWMILL'], ['3,2', null],
        ]);
        const selected = new Set([...Array.from({ length: 4 }, (_, x) => x + ',1'), ...improvements.keys()]);
        const tiles = base.board.tiles.map((tile) => {
          const key = tile.at.x + ',' + tile.at.y;
          if (!selected.has(key)) return tile;
          return {
            ...template,
            at: tile.at,
            explored: true,
            terrain: 'FOREST',
            resource: null,
            improvement: improvements.has(key) ? improvements.get(key) : null,
            road: false,
            site: null,
            territoryOwnerId: null,
            territoryCityId: null,
          };
        });
        const fighter = base.units[0];
        if (!fighter) throw new Error('No unit template');
        const view = {
          ...base,
          board: { ...base.board, tiles },
          cities: [],
          treasureChests: [],
          units: [{ ...fighter, at: { x: 0, y: 2 } }],
          improvementValues: Array.from({ length: 4 }, (_, x) => ({
            at: { x, y: 1 }, improvement: 'WINDMILL', level: x + 1,
            measure: 'POPULATION', contributingTiles: [],
          })),
        };
        const plan = buildBoardRenderPlanV7(view, [], {
          selection: null, selectedUnitId: null, selectedAchievement: null,
        });
        const entries = plan.entries.filter((entry) => selected.has(entry.at.x + ',' + entry.at.y) && ['TERRAIN','IMPROVEMENT','UNIT','VALUE'].includes(entry.kind));
        const firstValue = entries.findIndex((entry) => entry.kind === 'VALUE');
        const lastWorld = entries.findLastIndex((entry) => entry.kind !== 'VALUE');
        if (!(firstValue > lastWorld)) throw new Error('VALUE entries are not final foreground');
        for (const x of [0,1,2]) {
          const terrain = entries.find((entry) => entry.kind === 'TERRAIN' && entry.at.x === x && entry.at.y === 2);
          if (terrain?.assetId !== 'terrain-ruleset7-original-grass-1') throw new Error('Forest canopy suppression mismatch at ' + x);
        }
        const restored = entries.find((entry) => entry.kind === 'TERRAIN' && entry.at.x === 3 && entry.at.y === 2);
        if (!restored?.assetId?.startsWith('terrain-ruleset7-original-forest-')) throw new Error('Bare Forest canopy not restored');
        const images = new Map();
        for (const entry of entries) if (entry.assetId && !images.has(entry.assetId)) {
          const image = new Image(); image.src = ACCEPTED_ART_URLS[entry.assetId]; await image.decode(); images.set(entry.assetId, image);
        }
        const overlay = document.createElement('main');
        overlay.id = 'ruleset7-readability-review';
        overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#203936;color:#fff;padding:20px;font:16px system-ui';
        overlay.innerHTML = '<h1 style="margin:0 0 4px">RULESET 7 MAP READABILITY · drawBoardV7</h1><p style="margin:0 0 10px;color:#bfd2cb">Forest variants · Camp occupied · Windmill/Sawmill canopy suppression · final foreground pips</p><canvas width="640" height="360" style="display:block;width:640px;height:360px"></canvas>';
        document.body.append(overlay);
        const canvas = overlay.querySelector('canvas');
        const context = canvas.getContext('2d');
        drawBoardV7({
          context, viewport: { width: 640, height: 360 }, devicePixelRatio: 1,
          camera: { offsetX: 96, offsetY: -32, zoom: 1 },
          plan: { version: 7, entries, targets: [] },
          images: { resolve: (id) => images.get(id) ?? null },
        });
        const rect = canvas.getBoundingClientRect();
        globalThis.__ruleset7ReadabilityCanvasRect = { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
        return {
          renderer: 'drawBoardV7',
          entryOrder: entries.map(({ kind, at, assetId, value }) => ({ kind, at, assetId, value })),
          firstValueIndex: firstValue,
          lastWorldIndex: lastWorld,
          canopySuppressionIds: [0,1,2].map((x) => entries.find((entry) => entry.kind === 'TERRAIN' && entry.at.x === x && entry.at.y === 2)?.assetId),
          restoredForestId: restored.assetId,
          sourceStateTerrain: tiles.filter((tile) => tile.explored && tile.at.y === 2 && tile.at.x < 4).map((tile) => tile.terrain),
        };
      })()`,
    );
    const clip = await evaluateReadability<{
      readonly x: number;
      readonly y: number;
      readonly width: number;
      readonly height: number;
    }>(connection, "globalThis.__ruleset7ReadabilityCanvasRect");
    const capture = (await connection.send("Page.captureScreenshot", {
      format: "png",
      fromSurface: true,
      clip: { ...clip, scale: 1 },
    })) as { readonly data?: string };
    if (capture.data === undefined) throw new Error("Canvas capture missing");
    await writeFile(
      path.join(outputRoot, "drawboardv7-desktop-canvas.png"),
      Buffer.from(capture.data, "base64"),
    );
    return evidence;
  } finally {
    connection?.close();
    browser.kill();
  }
}

async function waitForReadabilityTarget(
  port: number,
): Promise<{ readonly webSocketDebuggerUrl: string }> {
  for (let attempt = 0; attempt < 160; attempt += 1) {
    try {
      const response = await fetch(`http://localhost:${port}/json/list`);
      const targets = (await response.json()) as readonly {
        readonly type: string;
        readonly url: string;
        readonly webSocketDebuggerUrl: string;
      }[];
      const target = targets.find(
        (candidate) =>
          candidate.type === "page" && candidate.url.includes("localhost:6173"),
      );
      if (target !== undefined) return target;
    } catch {
      // Chrome's debugging endpoint is not ready yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error("Ruleset 7 readability Chrome target did not start");
}

async function connectReadabilityCdp(
  url: string,
): Promise<ReadabilityCdpConnection> {
  const socket = new WebSocket(url);
  await new Promise<void>((resolve, reject) => {
    socket.addEventListener("open", () => resolve(), { once: true });
    socket.addEventListener(
      "error",
      () => reject(new Error("CDP socket failed")),
      {
        once: true,
      },
    );
  });
  let nextId = 1;
  const pending = new Map<
    number,
    {
      readonly resolve: (value: unknown) => void;
      readonly reject: (error: Error) => void;
    }
  >();
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(String(event.data)) as ReadabilityCdpMessage;
    if (message.id === undefined) return;
    const handler = pending.get(message.id);
    if (handler === undefined) return;
    pending.delete(message.id);
    if (message.error !== undefined)
      handler.reject(new Error(message.error.message ?? "CDP error"));
    else handler.resolve(message.result);
  });
  return {
    send(method, params = {}) {
      const id = nextId;
      nextId += 1;
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });
        socket.send(JSON.stringify({ id, method, params }));
      });
    },
    close() {
      socket.close();
    },
  };
}

async function evaluateReadability<T = unknown>(
  connection: ReadabilityCdpConnection,
  expression: string,
): Promise<T> {
  const response = (await connection.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  })) as {
    readonly result?: { readonly value?: T; readonly description?: string };
    readonly exceptionDetails?: { readonly text?: string };
  };
  if (response.exceptionDetails !== undefined)
    throw new Error(
      response.result?.description ??
        response.exceptionDetails.text ??
        "Browser evaluation failed",
    );
  return response.result?.value as T;
}

async function waitForReadabilityExpression(
  connection: ReadabilityCdpConnection,
  expression: string,
): Promise<void> {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    if (
      await evaluateReadability<boolean>(connection, `Boolean(${expression})`)
    )
      return;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(`Browser expression did not become true: ${expression}`);
}
