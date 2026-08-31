import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp, { type OverlayOptions } from "sharp";

type ReviewStatus =
  "MISSING" | "CANDIDATE" | "ACCEPTED" | "REJECTED" | "FAILED";

interface Recipe {
  readonly id: string;
  readonly output: string;
  readonly outputSize: { readonly width: number; readonly height: number };
  readonly anchor?: { readonly x: number; readonly y: number };
  readonly hardBounds: Bounds;
}

interface Bounds {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

interface RecordEntry {
  readonly status: Exclude<ReviewStatus, "MISSING">;
  readonly candidate?: string;
  readonly outputSha256?: string;
  readonly candidateSha256?: string;
  readonly alphaBounds?: Bounds & { readonly empty?: boolean };
  readonly reviewChecks?: Readonly<Record<string, boolean>>;
}

interface Alias {
  readonly id: string;
  readonly source: string;
  readonly semanticRole: string;
  readonly notes: string;
}

interface EvidenceArtifact {
  readonly path: string;
  readonly sha256: string;
  readonly bytes: number;
}

const root = process.cwd();
const reviewRoot = path.join(root, "art/pixellab/reviews/ruleset6-terrain");
const sampleIds = [
  "terrain-fertile-ground",
  "terrain-stone",
  "terrain-road-material",
] as const;
const requiredArtifacts = [
  "sample-gate-source-native-enlarged-minimum.png",
  "compatible-contexts-and-four-edges.png",
  "repetition-8x8.png",
  "dense-mixed-map-dpr1.png",
  "dense-mixed-map-dpr2.png",
  "dpr1-dpr2-comparison.png",
] as const;
const gameContexts = [
  "empty Forest",
  "GAME on Forest",
  "occupied GAME on Forest",
  "locked GAME on Forest",
  "selected GAME on Forest",
  "repeated GAME/empty Forest",
] as const;
const requiredCoverage = [
  "source, native, enlarged and minimum 0.625x zoom",
  "DPR 1 and DPR 2 at identical CSS size",
  "compatible Grass, Forest and Mountain variants",
  "all owner treatments, selection and fog boundaries",
  "Road material against all four diamond edges without composing Road masks",
  "8x8 deterministic repetition",
  "dense mixed terrain/resource/improvement contexts",
  "GAME alias label in empty, occupied, locked, selected and repeated Forest contexts",
] as const;

const source = JSON.parse(
  await readFile(path.join(root, "scripts/art/pixellab-manifest.json"), "utf8"),
) as {
  readonly aliases?: readonly Alias[];
  readonly recipes: readonly Recipe[];
};
const generated = JSON.parse(
  await readFile(
    path.join(root, "scripts/art/pixellab-generated.json"),
    "utf8",
  ),
) as { readonly records: Readonly<Record<string, RecordEntry>> };
const recipes = new Map(source.recipes.map((recipe) => [recipe.id, recipe]));

await mkdir(reviewRoot, { recursive: true });
await gameAliasContexts();
const availableSamples: string[] = [];
for (const id of sampleIds)
  if ((await sourceFor(id)) !== null) availableSamples.push(id);
if (availableSamples.length > 0)
  await individualSheet(
    availableSamples,
    "sample-gate-source-native-enlarged-minimum.png",
  );
if (availableSamples.length === sampleIds.length) {
  await compatibleContexts();
  await repetition();
  const dpr1 = await denseMixedMap(1);
  const dpr2 = await denseMixedMap(2);
  await sharp(dpr1)
    .png()
    .toFile(path.join(reviewRoot, "dense-mixed-map-dpr1.png"));
  await sharp(dpr2)
    .png()
    .toFile(path.join(reviewRoot, "dense-mixed-map-dpr2.png"));
  await dprComparison(dpr1, dpr2);
}
await evidence();

async function sourceFor(id: string): Promise<string | null> {
  const recipe = recipes.get(id);
  const record = generated.records[id];
  if (recipe === undefined || record === undefined) return null;
  if (record.status === "ACCEPTED") return path.join(root, recipe.output);
  if (record.status === "CANDIDATE" && record.candidate !== undefined)
    return path.join(root, record.candidate);
  return null;
}

async function acceptedSource(id: string): Promise<string> {
  const recipe = recipes.get(id);
  const record = generated.records[id];
  if (recipe === undefined || record?.status !== "ACCEPTED")
    throw new Error(`Accepted review dependency missing: ${id}`);
  return path.join(root, recipe.output);
}

async function display(
  id: string,
  width: number,
  height: number,
  acceptedOnly = false,
): Promise<Buffer> {
  const file = acceptedOnly ? await acceptedSource(id) : await sourceFor(id);
  if (file === null) throw new Error(`Review source missing: ${id}`);
  return sharp(file).resize({ width, height, fit: "fill" }).png().toBuffer();
}

async function individualSheet(
  ids: readonly string[],
  filename: string,
): Promise<void> {
  const cellWidth = 400;
  const cellHeight = 560;
  const overlays: OverlayOptions[] = [];
  for (const [index, id] of ids.entries()) {
    const file = await sourceFor(id);
    const recipe = recipes.get(id);
    if (file === null || recipe === undefined) continue;
    const ground = recipe.outputSize.height === 148;
    const left = index * cellWidth;
    overlays.push({ input: label(id, statusFor(id), cellWidth), left, top: 8 });
    overlays.push({
      input: await sharp(file)
        .resize({ width: 256, height: 296, fit: "contain" })
        .png()
        .toBuffer(),
      left: left + 72,
      top: 62,
    });
    overlays.push({
      input: await sharp(file)
        .trim({ background: "#00000000" })
        .resize({
          width: 260,
          height: 168,
          fit: "contain",
          kernel: sharp.kernel.nearest,
        })
        .png()
        .toBuffer(),
      left: left + 70,
      top: 352,
    });
    overlays.push({
      input: await sharp(file)
        .resize({ width: 128, height: ground ? 74 : 148, fit: "fill" })
        .png()
        .toBuffer(),
      left: left + 16,
      top: ground ? 448 : 386,
    });
    overlays.push({
      input: await sharp(file)
        .resize({ width: 80, height: ground ? 46 : 93, fit: "fill" })
        .png()
        .toBuffer(),
      left: left + 292,
      top: ground ? 462 : 414,
    });
    overlays.push({ input: scaleCaptions(cellWidth), left, top: 326 });
  }
  await sharp({
    create: {
      width: ids.length * cellWidth,
      height: cellHeight,
      channels: 4,
      background: "#263b3a",
    },
  })
    .composite(overlays)
    .png()
    .toFile(path.join(reviewRoot, filename));
}

async function gameAliasContexts(): Promise<void> {
  const alias = source.aliases?.find((entry) => entry.id === "terrain-game");
  if (alias?.source !== "terrain-animal" || alias.semanticRole !== "GAME")
    throw new Error(
      "terrain-game must explicitly alias terrain-animal as GAME",
    );
  if (generated.records[alias.source]?.status !== "ACCEPTED")
    throw new Error("GAME alias source terrain-animal is not accepted");

  const grass = await display("terrain-grass-1", 128, 74, true);
  const forests = await Promise.all(
    [1, 2, 3, 4].map((variant) =>
      display(`terrain-forest-${variant}`, 128, 148, true),
    ),
  );
  const game = await display(alias.source, 128, 148, true);
  const unit = await display("unit-archer", 90, 104, true);
  const width = 1320;
  const cellWidth = 300;
  const cellHeight = 172;
  const overlays: OverlayOptions[] = [
    {
      input: title(
        "Ruleset 6 GAME → accepted Animal raster · Forest context revalidation",
        width,
      ),
      left: 0,
      top: 8,
    },
  ];
  const contexts = ["EMPTY", "GAME", "OCCUPIED", "LOCKED", "SELECTED"] as const;
  for (const [row, context] of contexts.entries()) {
    overlays.push({
      input: rowLabel(context, 112, cellHeight),
      left: 0,
      top: 62 + row * cellHeight,
    });
    for (let column = 0; column < 4; column += 1) {
      const center = {
        x: 112 + column * cellWidth + 150,
        y: 62 + row * cellHeight + 90,
      };
      overlays.push({ input: grass, left: center.x - 64, top: center.y - 37 });
      overlays.push({
        input: ownershipOverlay(column, 128, 74),
        left: center.x - 64,
        top: center.y - 37,
      });
      overlays.push({
        input: requiredAt(forests, column, "Forest variant"),
        left: center.x - 64,
        top: center.y - 88,
      });
      if (context !== "EMPTY")
        overlays.push({ input: game, left: center.x - 64, top: center.y - 88 });
      if (context === "OCCUPIED")
        overlays.push({ input: unit, left: center.x - 45, top: center.y - 78 });
      if (context === "LOCKED")
        overlays.push({
          input: lockBadge(),
          left: center.x + 27,
          top: center.y - 68,
        });
      if (context === "SELECTED")
        overlays.push({
          input: selectionDiamond(128, 74),
          left: center.x - 64,
          top: center.y - 37,
        });
      overlays.push({
        input: columnLabel(
          `Forest ${column + 1} · owner ${column + 1}`,
          cellWidth,
        ),
        left: 112 + column * cellWidth,
        top: 62 + row * cellHeight + 142,
      });
    }
  }
  overlays.push({
    input: rowLabel("REPEATED", 180, 90),
    left: 0,
    top: 974,
  });
  const smallGrass = await sharp(grass)
    .resize({ width: 80, height: 46, fit: "fill" })
    .png()
    .toBuffer();
  const smallForests = await Promise.all(
    forests.map((forest) =>
      sharp(forest)
        .resize({ width: 80, height: 93, fit: "fill" })
        .png()
        .toBuffer(),
    ),
  );
  const smallGame = await sharp(game)
    .resize({ width: 80, height: 93, fit: "fill" })
    .png()
    .toBuffer();
  const repeatedGrounds: OverlayOptions[] = [];
  const repeatedFronts: Array<{
    readonly depth: number;
    readonly overlay: OverlayOptions;
  }> = [];
  const repeatedOrigin = { x: 710, y: 950 };
  for (let y = 0; y < 8; y += 1)
    for (let x = 0; x < 8; x += 1) {
      const center = mapCenter(repeatedOrigin, x, y, 0.625);
      repeatedGrounds.push({
        input: smallGrass,
        left: center.x - 40,
        top: center.y - 23,
      });
      repeatedFronts.push({
        depth: x + y,
        overlay: {
          input: requiredAt(
            smallForests,
            (x * 3 + y * 5) % 4,
            "small Forest variant",
          ),
          left: center.x - 40,
          top: center.y - 55,
        },
      });
      if ((x + y * 2) % 3 === 0)
        repeatedFronts.push({
          depth: x + y,
          overlay: {
            input: smallGame,
            left: center.x - 40,
            top: center.y - 55,
          },
        });
    }
  repeatedFronts.sort((a, b) => a.depth - b.depth);
  overlays.push(
    ...repeatedGrounds,
    ...repeatedFronts.map(({ overlay }) => overlay),
  );
  await sharp({
    create: { width, height: 1300, channels: 4, background: "#203332" },
  })
    .composite(overlays)
    .png()
    .toFile(path.join(reviewRoot, "game-alias-forest-contexts.png"));
}

async function compatibleContexts(): Promise<void> {
  const width = 1240;
  const height = 780;
  const road = await display("terrain-road-material", 128, 74);
  const fertile = await display("terrain-fertile-ground", 128, 148);
  const stone = await display("terrain-stone", 128, 148);
  const grass = await Promise.all(
    [1, 2, 3, 4].map((variant) =>
      display(`terrain-grass-${variant}`, 128, 74, true),
    ),
  );
  const mountains = await Promise.all(
    [1, 2, 3].map((variant) =>
      display(`terrain-mountain-${variant}`, 108, 124, true),
    ),
  );
  const resourceIds = [
    "terrain-fruit",
    "terrain-animal",
    "terrain-ore",
    "building-mine",
    "building-lumber-mill",
  ] as const;
  const resources = await Promise.all(
    resourceIds.map((id) =>
      display(id, 128, id === "terrain-ore" ? 74 : 148, true),
    ),
  );
  const overlays: OverlayOptions[] = [
    {
      input: title(
        "V6 terrain inputs · compatible contexts, ownership, selection, fog and raw-material edges",
        width,
      ),
      left: 0,
      top: 8,
    },
  ];
  for (let index = 0; index < 12; index += 1) {
    const column = index % 6;
    const row = Math.floor(index / 6);
    const center = { x: 120 + column * 200, y: 170 + row * 250 };
    const base = requiredAt(grass, index % 4, "Grass variant");
    overlays.push({ input: base, left: center.x - 64, top: center.y - 37 });
    if (index % 3 === 0)
      overlays.push({ input: road, left: center.x - 64, top: center.y - 37 });
    overlays.push({
      input: ownershipOverlay(index % 4, 128, 74),
      left: center.x - 64,
      top: center.y - 37,
    });
    if (index < 4)
      overlays.push({
        input: fertile,
        left: center.x - 64,
        top: center.y - 111,
      });
    else if (index < 8) {
      const mountain = requiredAt(mountains, index % 3, "Mountain variant");
      overlays.push({
        input: mountain,
        left: center.x - 54,
        top: center.y - 75,
      });
      overlays.push({ input: stone, left: center.x - 64, top: center.y - 111 });
    } else {
      const resourceIndex = index % resources.length;
      const resource = requiredAt(resources, resourceIndex, "resource context");
      const resourceId = resourceIds[resourceIndex] ?? resourceIds[0];
      overlays.push({
        input: resource,
        left: center.x - 64,
        top: center.y - (resourceId === "terrain-ore" ? 37 : 111),
      });
    }
    if (index % 5 === 0)
      overlays.push({
        input: selectionDiamond(128, 74),
        left: center.x - 64,
        top: center.y - 37,
      });
    if (index === 11)
      overlays.push({
        input: fogDiamond(128, 74),
        left: center.x - 64,
        top: center.y - 37,
      });
    overlays.push({
      input: columnLabel(`context ${index + 1}`, 180),
      left: center.x - 90,
      top: center.y + 72,
    });
  }
  const edgeOrigin = { x: 260, y: 660 };
  const pairs = [
    [0, -1],
    [1, 0],
    [0, 1],
    [-1, 0],
  ] as const;
  for (const [index, [dx, dy]] of pairs.entries()) {
    const center = { x: edgeOrigin.x + index * 240, y: edgeOrigin.y };
    overlays.push({ input: road, left: center.x - 64, top: center.y - 37 });
    overlays.push({
      input: requiredAt(grass, index, "edge Grass variant"),
      left: center.x + dx * 64 - 64,
      top: center.y + dy * 37 - 37,
    });
    overlays.push({
      input: columnLabel(
        ["north edge", "east edge", "south edge", "west edge"][index] ?? "edge",
        180,
      ),
      left: center.x - 90,
      top: center.y + 64,
    });
  }
  await sharp({ create: { width, height, channels: 4, background: "#263b3a" } })
    .composite(overlays)
    .png()
    .toFile(path.join(reviewRoot, "compatible-contexts-and-four-edges.png"));
}

async function repetition(): Promise<void> {
  const grass = await Promise.all(
    [1, 2, 3, 4].map((variant) =>
      display(`terrain-grass-${variant}`, 80, 46, true),
    ),
  );
  const samples = await Promise.all(
    sampleIds.map((id) =>
      display(id, 80, id === "terrain-road-material" ? 46 : 93),
    ),
  );
  const grounds: OverlayOptions[] = [];
  const objects: Array<{
    readonly depth: number;
    readonly overlay: OverlayOptions;
  }> = [];
  const origin = { x: 560, y: 110 };
  for (let y = 0; y < 8; y += 1)
    for (let x = 0; x < 8; x += 1) {
      const center = mapCenter(origin, x, y, 0.625);
      grounds.push({
        input: requiredAt(grass, (x * 3 + y * 5) % 4, "repeated Grass"),
        left: center.x - 40,
        top: center.y - 23,
      });
      const sampleIndex = (x * 5 + y * 7) % 3;
      const sample = requiredAt(samples, sampleIndex, "terrain sample");
      if ((x + y) % 2 === 0)
        objects.push({
          depth: x + y,
          overlay: {
            input: sample,
            left: center.x - 40,
            top: center.y - (sampleIndex === 2 ? 23 : 70),
          },
        });
    }
  objects.sort((a, b) => a.depth - b.depth);
  await sharp({
    create: { width: 1120, height: 700, channels: 4, background: "#263b3a" },
  })
    .composite([
      {
        input: title(
          "V6 terrain sample gate · deterministic 8x8 minimum-zoom repetition",
          1120,
        ),
        left: 0,
        top: 8,
      },
      ...grounds,
      ...objects.map(({ overlay }) => overlay),
    ])
    .png()
    .toFile(path.join(reviewRoot, "repetition-8x8.png"));
}

async function denseMixedMap(scale: number): Promise<Buffer> {
  const width = 1180 * scale;
  const grass = await Promise.all(
    [1, 2, 3, 4].map((variant) =>
      display(`terrain-grass-${variant}`, 128 * scale, 74 * scale, true),
    ),
  );
  const fertile = await display(
    "terrain-fertile-ground",
    128 * scale,
    148 * scale,
  );
  const stone = await display("terrain-stone", 128 * scale, 148 * scale);
  const road = await display("terrain-road-material", 128 * scale, 74 * scale);
  const objects = new Map<string, Buffer>();
  for (const id of [
    "terrain-fruit",
    "terrain-animal",
    "terrain-ore",
    "terrain-forest-1",
    "terrain-forest-2",
    "terrain-mountain-1",
    "terrain-mountain-2",
    "building-mine",
    "building-lumber-mill",
    "unit-warrior",
  ]) {
    const unit = id.startsWith("unit-");
    const low = id === "terrain-ore";
    objects.set(
      id,
      await display(
        id,
        (unit ? 90 : low ? 128 : 128) * scale,
        (unit ? 104 : low ? 74 : 148) * scale,
        true,
      ),
    );
  }
  const grounds: OverlayOptions[] = [];
  const fronts: Array<{
    readonly depth: number;
    readonly tie: number;
    readonly overlay: OverlayOptions;
  }> = [];
  const origin = { x: 590 * scale, y: 100 * scale };
  const placements = [
    "terrain-fruit",
    "terrain-animal",
    "terrain-ore",
    "terrain-forest-1",
    "terrain-mountain-1",
    "building-mine",
    "building-lumber-mill",
    "unit-warrior",
  ] as const;
  for (let y = 0; y < 8; y += 1)
    for (let x = 0; x < 8; x += 1) {
      const center = mapCenter(origin, x, y, scale);
      grounds.push({
        input: requiredAt(grass, (x + y * 3) % 4, "dense-map Grass"),
        left: center.x - 64 * scale,
        top: center.y - 37 * scale,
      });
      if ((x + y) % 3 === 0)
        grounds.push({
          input: road,
          left: center.x - 64 * scale,
          top: center.y - 37 * scale,
        });
      if ((x * 2 + y) % 7 === 0)
        grounds.push({
          input: ownershipOverlay((x + y) % 4, 128 * scale, 74 * scale),
          left: center.x - 64 * scale,
          top: center.y - 37 * scale,
        });
      const selector = (x * 5 + y * 7) % 11;
      if (selector === 0)
        fronts.push({
          depth: x + y,
          tie: 10,
          overlay: {
            input: fertile,
            left: center.x - 64 * scale,
            top: center.y - 111 * scale,
          },
        });
      else if (selector === 1)
        fronts.push({
          depth: x + y,
          tie: 10,
          overlay: {
            input: stone,
            left: center.x - 64 * scale,
            top: center.y - 111 * scale,
          },
        });
      else if (selector < 9) {
        const id = requiredAt(placements, selector - 2, "dense-map placement");
        const image = objects.get(id);
        if (image === undefined)
          throw new Error(`Dense-map review object missing: ${id}`);
        const unit = id.startsWith("unit-");
        const low = id === "terrain-ore";
        fronts.push({
          depth: x + y,
          tie: unit ? 40 : id === "terrain-animal" ? 30 : 20,
          overlay: {
            input: image,
            left: center.x - (unit ? 45 : 64) * scale,
            top: center.y - (unit ? 78 : low ? 37 : 88) * scale,
          },
        });
      }
      if (selector === 9)
        fronts.push({
          depth: x + y,
          tie: 90,
          overlay: {
            input: selectionDiamond(128 * scale, 74 * scale),
            left: center.x - 64 * scale,
            top: center.y - 37 * scale,
          },
        });
      if (selector === 10)
        fronts.push({
          depth: x + y,
          tie: 100,
          overlay: {
            input: fogDiamond(128 * scale, 74 * scale),
            left: center.x - 64 * scale,
            top: center.y - 37 * scale,
          },
        });
    }
  fronts.sort((a, b) => a.depth - b.depth || a.tie - b.tie);
  return sharp({
    create: { width, height: 720 * scale, channels: 4, background: "#203332" },
  })
    .composite([
      {
        input: title(`Dense V6 mixed map · DPR ${scale}`, width),
        left: 0,
        top: 8 * scale,
      },
      ...grounds,
      ...fronts.map(({ overlay }) => overlay),
    ])
    .png()
    .toBuffer();
}

async function dprComparison(dpr1: Buffer, dpr2: Buffer): Promise<void> {
  const panelWidth = 590;
  const panelHeight = 360;
  await sharp({
    create: { width: 1180, height: 410, channels: 4, background: "#263b3a" },
  })
    .composite([
      {
        input: await sharp(dpr1)
          .resize({ width: panelWidth, height: panelHeight, fit: "fill" })
          .png()
          .toBuffer(),
        left: 0,
        top: 50,
      },
      {
        input: await sharp(dpr2)
          .resize({ width: panelWidth, height: panelHeight, fit: "fill" })
          .png()
          .toBuffer(),
        left: panelWidth,
        top: 50,
      },
      {
        input: Buffer.from(
          '<svg width="1180" height="48" xmlns="http://www.w3.org/2000/svg"><text x="295" y="30" text-anchor="middle" font-family="sans-serif" font-size="20" font-weight="700" fill="#f5efe2">DPR 1 · CSS-scale raster</text><text x="885" y="30" text-anchor="middle" font-family="sans-serif" font-size="20" font-weight="700" fill="#f5efe2">DPR 2 · source-resolution raster</text></svg>',
        ),
        left: 0,
        top: 0,
      },
    ])
    .png()
    .toFile(path.join(reviewRoot, "dpr1-dpr2-comparison.png"));
}

async function evidence(): Promise<void> {
  const alias = source.aliases?.find((entry) => entry.id === "terrain-game");
  const animal = generated.records["terrain-animal"];
  const artifacts: EvidenceArtifact[] = [];
  for (const filename of [
    "README.md",
    "game-alias-forest-contexts.png",
    ...requiredArtifacts,
  ]) {
    try {
      const data = await readFile(path.join(reviewRoot, filename));
      artifacts.push({
        path: `art/pixellab/reviews/ruleset6-terrain/${filename}`,
        sha256: sha256(data),
        bytes: data.byteLength,
      });
    } catch {
      // Candidate-dependent evidence is intentionally absent until generation.
    }
  }
  const sampleGate = Object.fromEntries(
    sampleIds.map((id) => {
      const record = generated.records[id];
      return [
        id,
        {
          status: record?.status ?? "MISSING",
          candidateSha256: record?.candidateSha256 ?? null,
          outputSha256: record?.outputSha256 ?? null,
          alphaBounds: record?.alphaBounds ?? null,
          reviewChecks: record?.reviewChecks ?? null,
        },
      ];
    }),
  );
  const allAccepted = sampleIds.every(
    (id) => generated.records[id]?.status === "ACCEPTED",
  );
  await writeFile(
    path.join(reviewRoot, "review-evidence.json"),
    `${JSON.stringify(
      {
        schemaVersion: 1,
        purpose:
          "Ruleset 6 Fertile Ground, Stone, Road material sample gate and GAME alias review",
        status: allAccepted
          ? "READY_FOR_ORCHESTRATOR_REVIEW"
          : "BLOCKED_MISSING_GENERATION",
        blocker: allAccepted
          ? null
          : "PIXELLAB_API_KEY is missing; no v6 terrain candidates were generated or accepted.",
        displayContracts: {
          sourceScale: 2,
          zooms: [0.625, 1, 1.75],
          dpr: [1, 2],
        },
        requiredCoverage,
        sampleGate,
        pendingArtifacts: requiredArtifacts.filter(
          (filename) =>
            !artifacts.some(({ path: artifactPath }) =>
              artifactPath.endsWith(filename),
            ),
        ),
        gameAlias: {
          id: alias?.id ?? null,
          semanticRole: alias?.semanticRole ?? null,
          source: alias?.source ?? null,
          status:
            alias?.source === "terrain-animal" && animal?.status === "ACCEPTED"
              ? "ACCEPTED"
              : "INVALID",
          sourceOutputSha256: animal?.outputSha256 ?? null,
          contexts: gameContexts,
          visualFindings: [
            "The broad tan boar silhouette, snout and tusks read as wildlife rather than a unit on all four accepted Forest variants.",
            "GAME remains identifiable beside all four owner treatments, under selection, and with locked-action UI kept separate from the world raster.",
            "The exact nominal occupied composition leaves the boar frontage readable around the accepted Archer without changing the source anchor.",
            "The 8x8 minimum-zoom repetition remains distinguishable from empty Forest while preserving the existing quiet terrain hierarchy.",
          ],
          notes: alias?.notes ?? null,
        },
        artifacts,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
}

function statusFor(id: string): ReviewStatus {
  return generated.records[id]?.status ?? "MISSING";
}

function requiredAt<T>(
  values: readonly T[],
  index: number,
  labelText: string,
): T {
  const value = values[index];
  if (value === undefined) throw new Error(`${labelText} ${index} is missing`);
  return value;
}

function mapCenter(
  origin: { readonly x: number; readonly y: number },
  x: number,
  y: number,
  scale: number,
): { readonly x: number; readonly y: number } {
  return {
    x: Math.round(origin.x + (x - y) * 64 * scale),
    y: Math.round(origin.y + (x + y) * 37 * scale),
  };
}

function title(text: string, width: number): Buffer {
  return Buffer.from(
    `<svg width="${width}" height="50" xmlns="http://www.w3.org/2000/svg"><text x="${width / 2}" y="31" text-anchor="middle" font-family="sans-serif" font-size="22" font-weight="700" fill="#f5efe2">${escapeXml(text)}</text></svg>`,
  );
}

function label(id: string, status: ReviewStatus, width: number): Buffer {
  return Buffer.from(
    `<svg width="${width}" height="48" xmlns="http://www.w3.org/2000/svg"><text x="${width / 2}" y="19" text-anchor="middle" font-family="sans-serif" font-size="17" font-weight="700" fill="#f5efe2">${escapeXml(id)}</text><text x="${width / 2}" y="41" text-anchor="middle" font-family="sans-serif" font-size="14" fill="#8ee8cb">${status}</text></svg>`,
  );
}

function scaleCaptions(width: number): Buffer {
  return Buffer.from(
    `<svg width="${width}" height="220" xmlns="http://www.w3.org/2000/svg"><text x="${width / 2}" y="18" text-anchor="middle" font-family="sans-serif" font-size="13" fill="#d5e2dc">source canvas · enlarged alpha</text><text x="80" y="214" text-anchor="middle" font-family="sans-serif" font-size="13" fill="#d5e2dc">native 1x</text><text x="332" y="214" text-anchor="middle" font-family="sans-serif" font-size="13" fill="#d5e2dc">minimum 0.625x</text></svg>`,
  );
}

function rowLabel(text: string, width: number, height: number): Buffer {
  return Buffer.from(
    `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><text x="${width / 2}" y="${height / 2}" text-anchor="middle" dominant-baseline="middle" font-family="sans-serif" font-size="14" font-weight="700" fill="#f5efe2">${escapeXml(text)}</text></svg>`,
  );
}

function columnLabel(text: string, width: number): Buffer {
  return Buffer.from(
    `<svg width="${width}" height="28" xmlns="http://www.w3.org/2000/svg"><text x="${width / 2}" y="19" text-anchor="middle" font-family="sans-serif" font-size="13" fill="#d5e2dc">${escapeXml(text)}</text></svg>`,
  );
}

function ownershipOverlay(
  owner: number,
  width: number,
  height: number,
): Buffer {
  const colors = ["#ff776f", "#4ecdc4", "#f1c75b", "#9b7ede"];
  const color = colors[owner % colors.length] ?? colors[0];
  return Buffer.from(
    `<svg width="${width}" height="${height}" viewBox="0 0 128 74" xmlns="http://www.w3.org/2000/svg"><path d="M64 2 L125 37 L64 72 L3 37 Z" fill="${color}" fill-opacity="0.12" stroke="${color}" stroke-width="3" stroke-dasharray="8 5"/></svg>`,
  );
}

function selectionDiamond(width: number, height: number): Buffer {
  return Buffer.from(
    `<svg width="${width}" height="${height}" viewBox="0 0 128 74" xmlns="http://www.w3.org/2000/svg"><path d="M64 2 L125 37 L64 72 L3 37 Z" fill="none" stroke="#fff3a6" stroke-width="5"/></svg>`,
  );
}

function fogDiamond(width: number, height: number): Buffer {
  return Buffer.from(
    `<svg width="${width}" height="${height}" viewBox="0 0 128 74" xmlns="http://www.w3.org/2000/svg"><path d="M64 0 L128 37 L64 74 L0 37 Z" fill="#344544" fill-opacity="0.96" stroke="#9aabaa" stroke-width="2"/></svg>`,
  );
}

function lockBadge(): Buffer {
  return Buffer.from(
    '<svg width="40" height="48" xmlns="http://www.w3.org/2000/svg"><path d="M12 21v-6a8 8 0 0116 0v6" fill="none" stroke="#fff3a6" stroke-width="4"/><rect x="7" y="20" width="26" height="22" rx="5" fill="#283c3b" stroke="#fff3a6" stroke-width="3"/></svg>',
  );
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function sha256(data: Buffer): string {
  return createHash("sha256").update(data).digest("hex");
}
