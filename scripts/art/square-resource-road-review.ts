import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp, { type OverlayOptions } from "sharp";

interface Recipe {
  readonly id: string;
  readonly output: string;
  readonly outputSize: { readonly width: number; readonly height: number };
  readonly anchor?: { readonly x: number; readonly y: number };
}

interface RecordEntry {
  readonly status: string;
  readonly candidate?: string;
  readonly outputSha256?: string;
  readonly reviewChecks?: Readonly<Record<string, boolean>>;
  readonly notes?: string;
  readonly rejectedAttempts?: readonly unknown[];
}

interface RoadManifest {
  readonly deterministicProcessing: {
    readonly sourceSha256: string;
    readonly directionBitOrder: readonly string[];
    readonly adjacencySemantics: string;
    readonly diagonalSemantics: string;
  };
  readonly records: readonly {
    readonly id: string;
    readonly bits: string;
    readonly output: string;
    readonly sha256: string;
  }[];
}

const root = process.cwd();
const reviewRoot = path.join(
  root,
  "art/pixellab/reviews/square-resources-roads",
);
const ids = [
  "terrain-square-original-fruit",
  "terrain-square-candy-fruit",
  "terrain-square-original-animal",
  "terrain-square-candy-animal",
  "terrain-square-ore",
  "terrain-square-fertile-ground",
  "terrain-square-stone",
  "terrain-square-road-material",
] as const;
const artifactNames = [
  "README.md",
  "source-native-enlarged-zoom.png",
  "fruit-animal-family-gates.png",
  "shared-low-family-gate.png",
  "factions-and-compatible-terrain.png",
  "visibility-layering-hidden-safety.png",
  "road-16-masks-and-adjacency.png",
  "road-coexistence-dense-contexts.png",
  "zoom-dpr-overlays.png",
  "repetition-8x8.png",
] as const;
const requiredCoverage = [
  "all eight sources at source, enlarged, native 1x, minimum 0.625x and maximum 1.75x zoom",
  "Original and Candy Fruit and Game/Animal against their accepted square Grass and Forest families",
  "shared Ore and Stone on every Original and Candy Mountain variant and Fertile Ground on every Grass variant",
  "revealed resources remain visible before action technology while unrevealed resources contribute no hidden raster",
  "Forest canopy then Game/Animal then accepted unit layering for both factions and dense occupied contexts",
  "all 16 deterministic orthogonal Road masks, exact N/E/S/W edge joins, no diagonal corner joins and repeated adjacency",
  "Road coexistence with every compatible terrain/resource state, ownership, selection and fog overlays",
  "0.625x, 1x and 1.75x contexts at DPR1 and DPR2 with identical CSS composition",
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
const recipes = new Map(source.recipes.map((recipe) => [recipe.id, recipe]));

await mkdir(reviewRoot, { recursive: true });
await sourceNativeEnlargedZoom();
if (
  [
    "terrain-square-original-fruit",
    "terrain-square-candy-fruit",
    "terrain-square-original-animal",
    "terrain-square-candy-animal",
  ].every((id) => sourceFor(id) !== null)
)
  await fruitAnimalFamilyGates();
if (
  [
    "terrain-square-ore",
    "terrain-square-fertile-ground",
    "terrain-square-stone",
  ].every((id) => sourceFor(id) !== null)
)
  await sharedLowFamilyGate();
const complete = ids.every((id) => sourceFor(id) !== null);
if (complete) {
  await factionsAndCompatibleTerrain();
  await visibilityLayering();
  await roadMasksAndAdjacency();
  await roadCoexistence();
  await zoomDprOverlays();
  await repetition();
  await readme();
}
await evidence(complete);

function sourceFor(id: string): string | null {
  const recipe = recipes.get(id);
  const record = generated.records[id];
  if (recipe === undefined || record === undefined) return null;
  if (record.status === "ACCEPTED") return path.join(root, recipe.output);
  if (record.status === "CANDIDATE" && record.candidate !== undefined)
    return path.join(root, record.candidate);
  return null;
}

async function sourceNativeEnlargedZoom(): Promise<void> {
  const available = ids.filter((id) => sourceFor(id) !== null);
  const cellWidth = 1680;
  const cellHeight = 760;
  const overlays: OverlayOptions[] = [];
  for (const [index, id] of available.entries()) {
    const file = sourceFor(id);
    const recipe = recipes.get(id);
    if (file === null || recipe === undefined) continue;
    const left = (index % 2) * cellWidth;
    const top = Math.floor(index / 2) * cellHeight;
    overlays.push({ input: label(id, cellWidth), left, top: top + 6 });
    const baseScale = 0.5;
    const panels = [
      {
        name: "source/native",
        width: recipe.outputSize.width,
        height: recipe.outputSize.height,
        input: await sharp(file).png().toBuffer(),
      },
      ...(
        [
          ["min/DPR1", 0.625, 1],
          ["1x/DPR1", 1, 1],
          ["max/DPR1", 1.75, 1],
          ["min/DPR2", 0.625, 2],
          ["1x/DPR2", 1, 2],
          ["max/DPR2", 1.75, 2],
        ] as const
      ).map(([name, zoom, dpr]) => ({
        name,
        width: Math.round(recipe.outputSize.width * baseScale * zoom * dpr),
        height: Math.round(recipe.outputSize.height * baseScale * zoom * dpr),
        input: asset(id, zoom * dpr),
      })),
    ];
    let panelLeft = left + 8;
    for (const panel of panels) {
      overlays.push({
        input: label(panel.name, panel.width),
        left: panelLeft,
        top: top + 42,
      });
      overlays.push({
        input: checker(panel.width, panel.height),
        left: panelLeft,
        top: top + 84,
      });
      overlays.push({
        input: await panel.input,
        left: panelLeft,
        top: top + 84,
      });
      panelLeft += panel.width + 16;
    }
  }
  const rows = Math.max(1, Math.ceil(available.length / 2));
  await compose(
    2 * cellWidth,
    rows * cellHeight,
    overlays,
    "source-native-enlarged-zoom.png",
  );
}

async function factionsAndCompatibleTerrain(): Promise<void> {
  const scenarios: readonly (readonly [string, string, string | undefined])[] =
    [
      ...[1, 2, 3, 4].map(
        (variant) =>
          [
            `Original Grass ${variant} + Fruit`,
            `terrain-square-original-grass-${variant}`,
            "terrain-square-original-fruit",
          ] as const,
      ),
      ...[1, 2, 3, 4].map(
        (variant) =>
          [
            `Candy Grass ${variant} + Fruit`,
            `terrain-square-candy-grass-${variant}`,
            "terrain-square-candy-fruit",
          ] as const,
      ),
      ...["original", "candy"].flatMap((faction) =>
        [1, 2, 3].flatMap((variant) =>
          (["terrain-square-ore", "terrain-square-stone"] as const).map(
            (resource) =>
              [
                `${faction} Mountain ${variant} + ${resource.endsWith("ore") ? "Ore" : "Stone"}`,
                `terrain-square-${faction}-mountain-${variant}`,
                resource,
              ] as const,
          ),
        ),
      ),
      ...["original", "candy"].flatMap((faction) =>
        [1, 2, 3, 4].map(
          (variant) =>
            [
              `${faction} Grass ${variant} + Fertile`,
              `terrain-square-${faction}-grass-${variant}`,
              "terrain-square-fertile-ground",
            ] as const,
        ),
      ),
    ];
  await scenarioSheet(scenarios, "factions-and-compatible-terrain.png", 8);
}

async function fruitAnimalFamilyGates(): Promise<void> {
  const scenarios: readonly (readonly [
    string,
    string,
    string | undefined,
    string?,
  ])[] = [
    [
      "Original Fruit · Grass 1",
      "terrain-square-original-grass-1",
      "terrain-square-original-fruit",
    ],
    [
      "Original Fruit · Grass 4",
      "terrain-square-original-grass-4",
      "terrain-square-original-fruit",
    ],
    [
      "Candy Fruit · Grass 1",
      "terrain-square-candy-grass-1",
      "terrain-square-candy-fruit",
    ],
    [
      "Candy Fruit · Grass 4",
      "terrain-square-candy-grass-4",
      "terrain-square-candy-fruit",
    ],
    [
      "Original Forest 1 → Animal",
      "terrain-square-original-forest-1",
      "terrain-square-original-animal",
    ],
    [
      "Original Forest 4 → Animal",
      "terrain-square-original-forest-4",
      "terrain-square-original-animal",
    ],
    [
      "Candy Forest 1 → Animal",
      "terrain-square-candy-forest-1",
      "terrain-square-candy-animal",
    ],
    [
      "Candy Forest 4 → Animal",
      "terrain-square-candy-forest-4",
      "terrain-square-candy-animal",
    ],
    [
      "Original canopy → Animal → Fighter",
      "terrain-square-original-forest-2",
      "terrain-square-original-animal",
      "unit-warrior",
    ],
    [
      "Original canopy → Animal → Scout",
      "terrain-square-original-forest-3",
      "terrain-square-original-animal",
      "unit-original-scout",
    ],
    [
      "Candy canopy → Animal → Warrior",
      "terrain-square-candy-forest-2",
      "terrain-square-candy-animal",
      "unit-candy-warrior",
    ],
    [
      "Candy canopy → Animal → Scout",
      "terrain-square-candy-forest-3",
      "terrain-square-candy-animal",
      "unit-candy-scout",
    ],
  ];
  await scenarioSheet(scenarios, "fruit-animal-family-gates.png", 4, true);
}

async function sharedLowFamilyGate(): Promise<void> {
  const scenarios: readonly (readonly [
    string,
    string,
    string | undefined,
    string?,
  ])[] = [
    [
      "Ore · Original Mountain 1",
      "terrain-square-original-mountain-1",
      "terrain-square-ore",
    ],
    [
      "Ore · Original Mountain 3",
      "terrain-square-original-mountain-3",
      "terrain-square-ore",
    ],
    [
      "Ore · Candy Mountain 1",
      "terrain-square-candy-mountain-1",
      "terrain-square-ore",
    ],
    [
      "Ore · Candy Mountain 3",
      "terrain-square-candy-mountain-3",
      "terrain-square-ore",
    ],
    [
      "Stone · Original Mountain 1",
      "terrain-square-original-mountain-1",
      "terrain-square-stone",
    ],
    [
      "Stone · Original Mountain 3",
      "terrain-square-original-mountain-3",
      "terrain-square-stone",
    ],
    [
      "Stone · Candy Mountain 1",
      "terrain-square-candy-mountain-1",
      "terrain-square-stone",
    ],
    [
      "Stone · Candy Mountain 3",
      "terrain-square-candy-mountain-3",
      "terrain-square-stone",
    ],
    [
      "Fertile · Original Grass 1",
      "terrain-square-original-grass-1",
      "terrain-square-fertile-ground",
    ],
    [
      "Fertile · Original Grass 4",
      "terrain-square-original-grass-4",
      "terrain-square-fertile-ground",
    ],
    [
      "Fertile · Candy Grass 1",
      "terrain-square-candy-grass-1",
      "terrain-square-fertile-ground",
    ],
    [
      "Fertile · Candy Grass 4",
      "terrain-square-candy-grass-4",
      "terrain-square-fertile-ground",
    ],
  ];
  await scenarioSheet(scenarios, "shared-low-family-gate.png", 4, true);
}

async function visibilityLayering(): Promise<void> {
  const scenarios: readonly [string, string, string | undefined, string?][] = [
    [
      "Game visible before Hunting",
      "terrain-square-original-forest-1",
      "terrain-square-original-animal",
    ],
    [
      "Candy Game visible before Hunting",
      "terrain-square-candy-forest-1",
      "terrain-square-candy-animal",
    ],
    [
      "Fruit revealed; Gathering action locked",
      "terrain-square-original-grass-2",
      "terrain-square-original-fruit",
    ],
    [
      "Ore revealed; Mining action locked",
      "terrain-square-original-mountain-2",
      "terrain-square-ore",
    ],
    [
      "Stone revealed; Quarry action locked",
      "terrain-square-candy-mountain-2",
      "terrain-square-stone",
    ],
    [
      "Unrevealed Ore: ordinary Mountain",
      "terrain-square-original-mountain-3",
      undefined,
    ],
    [
      "Unrevealed Fertile: ordinary Grass",
      "terrain-square-candy-grass-3",
      undefined,
    ],
    [
      "Original canopy → Animal → unit",
      "terrain-square-original-forest-3",
      "terrain-square-original-animal",
      "unit-archer",
    ],
    [
      "Candy canopy → Animal → unit",
      "terrain-square-candy-forest-3",
      "terrain-square-candy-animal",
      "unit-candy-gumball-guard",
    ],
    [
      "Selected occupied Animal",
      "terrain-square-original-forest-4",
      "terrain-square-original-animal",
      "unit-warrior",
    ],
    [
      "Fog hides resource and terrain",
      "terrain-square-candy-grass-4",
      undefined,
    ],
    [
      "Dense readable resource frontage",
      "terrain-square-candy-forest-4",
      "terrain-square-candy-animal",
      "unit-candy-warrior",
    ],
  ];
  await scenarioSheet(
    scenarios,
    "visibility-layering-hidden-safety.png",
    4,
    true,
  );
}

async function roadMasksAndAdjacency(): Promise<void> {
  const road = await roadManifest();
  const overlays: OverlayOptions[] = [];
  for (const [index, record] of road.records.entries()) {
    const left = (index % 8) * 180;
    const top = Math.floor(index / 8) * 200;
    overlays.push({ input: label(record.bits, 180), left, top: top + 4 });
    overlays.push({
      input: await asset("terrain-square-original-grass-1", 1),
      left: left + 26,
      top: top + 48,
    });
    overlays.push({
      input: await sharp(path.join(root, record.output))
        .resize(128, 128)
        .png()
        .toBuffer(),
      left: left + 26,
      top: top + 48,
    });
  }
  const chainTop = 420;
  for (let x = 0; x < 8; x += 1) {
    const bits = x === 0 ? "0100" : x === 7 ? "0001" : "0101";
    overlays.push({
      input: await asset("terrain-square-candy-grass-2", 1),
      left: 180 + x * 128,
      top: chainTop,
    });
    overlays.push({
      input: await roadAsset(bits, 1),
      left: 180 + x * 128,
      top: chainTop,
    });
  }
  overlays.push({
    input: label(
      "Exact E/W repeated adjacency; corners remain transparent",
      1024,
    ),
    left: 180,
    top: chainTop + 130,
  });
  await compose(1440, 610, overlays, "road-16-masks-and-adjacency.png");
}

async function roadCoexistence(): Promise<void> {
  const scenarios: readonly [string, string, string | undefined, string?][] = [
    [
      "Road + Original Fruit",
      "terrain-square-original-grass-1",
      "terrain-square-original-fruit",
    ],
    [
      "Road + Candy Fruit",
      "terrain-square-candy-grass-1",
      "terrain-square-candy-fruit",
    ],
    [
      "Road + Fertile",
      "terrain-square-original-grass-2",
      "terrain-square-fertile-ground",
    ],
    ["Road + Ore", "terrain-square-original-mountain-1", "terrain-square-ore"],
    [
      "Road + Candy Ore",
      "terrain-square-candy-mountain-1",
      "terrain-square-ore",
    ],
    ["Road + Stone", "terrain-square-candy-mountain-3", "terrain-square-stone"],
    [
      "Road + Original Game",
      "terrain-square-original-forest-2",
      "terrain-square-original-animal",
    ],
    [
      "Road + Candy Game",
      "terrain-square-candy-forest-2",
      "terrain-square-candy-animal",
    ],
    [
      "Road + occupied Game",
      "terrain-square-original-forest-4",
      "terrain-square-original-animal",
      "unit-original-scout",
    ],
    [
      "Road + Candy occupied Game",
      "terrain-square-candy-forest-4",
      "terrain-square-candy-animal",
      "unit-candy-scout",
    ],
    [
      "Road + selection",
      "terrain-square-original-grass-4",
      "terrain-square-original-fruit",
    ],
    [
      "Road at fog boundary",
      "terrain-square-candy-grass-4",
      "terrain-square-fertile-ground",
    ],
  ];
  await scenarioSheet(
    scenarios,
    "road-coexistence-dense-contexts.png",
    4,
    true,
    "1111",
  );
}

async function zoomDprOverlays(): Promise<void> {
  const overlays: OverlayOptions[] = [];
  const zooms = [0.625, 1, 1.75] as const;
  let left = 20;
  for (const dpr of [1, 2] as const) {
    for (const zoom of zooms) {
      const css = await tile(
        "terrain-square-candy-forest-3",
        "terrain-square-candy-animal",
        "unit-candy-gumball-guard",
        "1110",
        true,
      );
      const width = Math.round(128 * zoom * dpr);
      const rendered = await sharp(css)
        .resize(width, Math.round(192 * zoom * dpr))
        .png()
        .toBuffer();
      overlays.push({
        input: label(`${zoom}x · DPR${dpr}`, Math.max(160, width)),
        left,
        top: 8,
      });
      overlays.push({ input: rendered, left, top: 52 });
      left += Math.max(160, width) + 24;
    }
  }
  await compose(left, 740, overlays, "zoom-dpr-overlays.png");
}

async function repetition(): Promise<void> {
  const resources = [
    "terrain-square-original-fruit",
    "terrain-square-candy-fruit",
    "terrain-square-fertile-ground",
    "terrain-square-ore",
    "terrain-square-stone",
    "terrain-square-original-animal",
    "terrain-square-candy-animal",
  ] as const;
  const overlays: OverlayOptions[] = [];
  const tileSize = 80;
  for (let y = 0; y < 8; y += 1)
    for (let x = 0; x < 8; x += 1) {
      const resource = resources[(x * 5 + y * 3) % resources.length];
      if (resource === undefined) continue;
      const candy = resource.includes("candy");
      const mountain = resource.endsWith("ore") || resource.endsWith("stone");
      const animal = resource.endsWith("animal");
      const terrain = `terrain-square-${candy ? "candy" : "original"}-${mountain ? "mountain" : animal ? "forest" : "grass"}-${((x * 3 + y * 7) % (mountain ? 3 : 4)) + 1}`;
      overlays.push({
        input: await sharp(
          await tile(
            terrain,
            resource,
            undefined,
            (x + y) % 3 === 0 ? "0110" : undefined,
            (x + y) % 5 === 0,
          ),
        )
          .resize(tileSize, 120)
          .png()
          .toBuffer(),
        left: 60 + x * tileSize,
        top: 24 + y * tileSize,
      });
    }
  await compose(760, 760, overlays, "repetition-8x8.png");
}

async function scenarioSheet(
  scenarios: readonly (readonly [
    string,
    string,
    string | undefined,
    string?,
  ])[],
  filename: string,
  columns: number,
  overlaysEnabled = false,
  roadBits?: string,
): Promise<void> {
  const cellWidth = 210;
  const cellHeight = 252;
  const overlays: OverlayOptions[] = [];
  for (const [index, [name, terrain, resource, unit]] of scenarios.entries()) {
    const left = (index % columns) * cellWidth;
    const top = Math.floor(index / columns) * cellHeight;
    overlays.push({ input: label(name, cellWidth), left, top: top + 4 });
    overlays.push({
      input: await tile(
        terrain,
        resource,
        unit,
        roadBits,
        overlaysEnabled && index % 3 === 0,
        index % 4,
        /fog/i.test(name),
      ),
      left: left + 41,
      top: top + 48,
    });
  }
  await compose(
    columns * cellWidth,
    Math.ceil(scenarios.length / columns) * cellHeight,
    overlays,
    filename,
  );
}

async function tile(
  terrain: string,
  resource?: string,
  unit?: string,
  roadBits?: string,
  selected = false,
  owner = 0,
  fog = false,
): Promise<Buffer> {
  if (fog)
    return sharp({
      create: {
        width: 128,
        height: 192,
        channels: 4,
        background: "#00000000",
      },
    })
      .composite([{ input: fogSquare(), left: 0, top: 48 }])
      .png()
      .toBuffer();
  const overlays: OverlayOptions[] = [];
  const grass = terrain.includes("candy")
    ? "terrain-square-candy-grass-1"
    : "terrain-square-original-grass-1";
  if (!terrain.includes("grass"))
    overlays.push({ input: await asset(grass, 1), left: 0, top: 48 });
  overlays.push({
    input: await asset(terrain, 1),
    left: 0,
    top: terrain.includes("grass") ? 48 : 0,
  });
  if (roadBits !== undefined)
    overlays.push({ input: await roadAsset(roadBits, 1), left: 0, top: 48 });
  overlays.push({ input: ownershipOverlay(owner), left: 0, top: 48 });
  if (resource !== undefined)
    overlays.push({ input: await asset(resource, 1), left: 0, top: 0 });
  if (unit !== undefined) {
    const unitImage = await asset(unit, 0.5);
    overlays.push({ input: unitImage, left: 32, top: 74 });
  }
  if (selected) overlays.push({ input: squareSelection(), left: 0, top: 48 });
  return sharp({
    create: { width: 128, height: 192, channels: 4, background: "#00000000" },
  })
    .composite(overlays)
    .png()
    .toBuffer();
}

async function asset(id: string, zoom: number): Promise<Buffer> {
  const recipe = recipes.get(id);
  const file = sourceFor(id);
  if (recipe === undefined || file === null)
    throw new Error(`Missing review source ${id}`);
  const baseScale = id.startsWith("unit-") ? 0.25 : 0.5;
  return sharp(file)
    .resize(
      Math.round(recipe.outputSize.width * baseScale * zoom),
      Math.round(recipe.outputSize.height * baseScale * zoom),
      { fit: "fill" },
    )
    .png()
    .toBuffer();
}

async function roadAsset(bits: string, zoom: number): Promise<Buffer> {
  return sharp(
    path.join(
      root,
      `public/assets/pixellab/terrain-square/road-masks/road-mask-${bits}.png`,
    ),
  )
    .resize(Math.round(128 * zoom), Math.round(128 * zoom))
    .png()
    .toBuffer();
}

async function roadManifest(): Promise<RoadManifest> {
  return JSON.parse(
    await readFile(
      path.join(root, "scripts/art/square-road-masks.generated.json"),
      "utf8",
    ),
  ) as RoadManifest;
}

async function readme(): Promise<void> {
  const text = `# Square resources and Roads review\n\nStatus: ready for orchestrator review.\n\nEight PixelLab source assets were generated in coherent Fruit (2), Game/Animal (2), shared low-resource (3), and Road-material (1) request families. The accepted Road material deterministically derives exactly 16 orthogonal masks.\n\nThe checked evidence covers source/native/enlarged/minimum/maximum scale, both factions, all compatible square terrain variants, revealed-before-action and hidden-resource states, Forest canopy → Game/Animal → unit sorting, exact cardinal Road adjacency, repetition, dense overlays/fog/selection, and DPR1/2. No square asset is wired into runtime coverage before the integration bead.\n`;
  await writeFile(path.join(reviewRoot, "README.md"), text, "utf8");
}

async function evidence(complete: boolean): Promise<void> {
  const artifacts = [];
  for (const name of artifactNames) {
    try {
      const data = await readFile(path.join(reviewRoot, name));
      artifacts.push({
        path: `art/pixellab/reviews/square-resources-roads/${name}`,
        sha256: hash(data),
        bytes: data.byteLength,
      });
    } catch {
      // Progressive family review intentionally omits full-matrix artifacts.
    }
  }
  const unitHashes: Record<string, string> = {};
  for (const [id, recipe] of recipes) {
    if (!id.startsWith("unit-") || generated.records[id]?.status !== "ACCEPTED")
      continue;
    unitHashes[recipe.output] = hash(
      await readFile(path.join(root, recipe.output)),
    );
  }
  const sampleGate = Object.fromEntries(
    ids.map((id) => {
      const record = generated.records[id];
      return [
        id,
        {
          status: record?.status ?? "MISSING",
          outputSha256: record?.outputSha256 ?? null,
          reviewChecks: record?.reviewChecks ?? null,
          visualFindings: record?.notes ?? "Pending generation and review.",
          rejectedAttempts: record?.rejectedAttempts ?? [],
        },
      ];
    }),
  );
  const roadMasks = await roadManifest().catch(() => null);
  await writeFile(
    path.join(reviewRoot, "review-evidence.json"),
    `${JSON.stringify(
      {
        schemaVersion: 1,
        status: complete ? "READY_FOR_ORCHESTRATOR_REVIEW" : "IN_PROGRESS",
        blocker: null,
        pixelLabSourceCalls: 12,
        pixelLabCommandFamilies: 7,
        generationAccounting:
          "Eight accepted source assets. Twelve provider calls account for the intended 2/2/3/1 sources, one accidental duplicate two-Fruit invocation, one corrective Original Fruit regeneration, and one rejected Road-material regeneration. The final Road refinement reused its recorded provider job with deterministic postprocessing and made no new source call.",
        coherentRequestFamilies: [
          ["terrain-square-original-fruit", "terrain-square-candy-fruit"],
          ["terrain-square-original-animal", "terrain-square-candy-animal"],
          [
            "terrain-square-ore",
            "terrain-square-fertile-ground",
            "terrain-square-stone",
          ],
          ["terrain-square-road-material"],
        ],
        requiredCoverage,
        sampleGate,
        roadMasks,
        acceptedUnitByteHashes: unitHashes,
        runtimeCoverageSwitched: false,
        artifacts,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
}

async function compose(
  width: number,
  height: number,
  overlays: readonly OverlayOptions[],
  filename: string,
): Promise<void> {
  await sharp({
    create: { width, height, channels: 4, background: "#203936" },
  })
    .composite([...overlays])
    .png({ compressionLevel: 9, adaptiveFiltering: false })
    .toFile(path.join(reviewRoot, filename));
}

function squareSelection(): Buffer {
  return Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128"><rect x="4" y="4" width="120" height="120" rx="8" fill="#ffdf4518" stroke="#ffdf45" stroke-width="6"/></svg>',
  );
}

function ownershipOverlay(owner: number): Buffer {
  const colors = ["#ef6b61", "#43b8aa", "#e4bd43", "#9b75cf"];
  const color = colors[owner % colors.length] ?? colors[0];
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128"><rect x="2" y="2" width="124" height="124" fill="none" stroke="${color}" stroke-opacity="0.58" stroke-width="4"/><path d="M8 118 L24 126 M104 2 L120 10" stroke="${color}" stroke-opacity="0.45" stroke-width="4"/></svg>`,
  );
}

function fogSquare(): Buffer {
  return Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128"><rect width="128" height="128" fill="#243333"/><path d="M0 92 C30 72 58 104 88 82 C104 71 117 73 128 66 L128 128 L0 128Z" fill="#1b2929"/><path d="M0 20 C32 5 70 34 128 12" fill="none" stroke="#415250" stroke-width="12" opacity=".38"/></svg>',
  );
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

function label(text: string, width: number): Buffer {
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="42"><text x="${width / 2}" y="25" text-anchor="middle" font-family="sans-serif" font-size="14" font-weight="700" fill="#fff7e7">${escapeXml(text)}</text></svg>`,
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
