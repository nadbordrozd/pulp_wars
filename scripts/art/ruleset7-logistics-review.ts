import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { format } from "prettier";
import sharp, { type OverlayOptions } from "sharp";
import { RULESET7_LOGISTICS_SOURCE_IDS } from "./ruleset7-logistics-art-order";
import { RULESET7_LOGISTICS_ART_IDS } from "../../src/assets/ruleset7-logistics-art";
import {
  RULESET7_IMPROVEMENT_ART_IDS,
  RULESET7_RESOURCE_ART_IDS,
  RULESET7_TECH_ART_IDS,
  commandArtIdV7,
} from "../../src/assets/ruleset7-ui-art";

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
  readonly id: string;
  readonly status: string;
  readonly jobId?: string;
  readonly outputSha256?: string;
  readonly alphaBounds?: Bounds;
  readonly providerOutputSha256?: string;
  readonly reviewChecks?: Readonly<Record<string, boolean>>;
  readonly rejectedAttempts?: readonly {
    readonly jobId?: string;
    readonly candidateSha256?: string;
  }[];
}

interface AlphaMeasurement {
  readonly bounds: Bounds;
  readonly weightedArea: number;
  readonly components: readonly number[];
}

const root = process.cwd();
const outputOption = optionalOption("--output");
const reviewRoot = outputOption
  ? path.resolve(root, outputOption)
  : path.join(root, "art/pixellab/reviews/ruleset7-logistics");
const artifactNames = [
  "source-native-enlarged.png",
  "water-zoom-dpr-context.png",
  "coexistence-draw-order.png",
  "owner-state-coast-context.png",
  "dense-coast-port-count-context.png",
] as const;
const source = JSON.parse(
  await readFile("scripts/art/pixellab-manifest.json", "utf8"),
) as { readonly recipes: readonly Recipe[] };
const generated = JSON.parse(
  await readFile("scripts/art/pixellab-generated.json", "utf8"),
) as { readonly records: Readonly<Record<string, RecordEntry>> };
const recipes = new Map(source.recipes.map((recipe) => [recipe.id, recipe]));
const port = recipe("building-ruleset7-port-v7r11");
const fish = recipe("terrain-ruleset7-resource-fish-v7r11");
const oldPort = recipe("building-ruleset7-port");
const oldFish = recipe("terrain-ruleset7-resource-fish");
const shipyard = recipe("building-ruleset7-shipyard");
const shallow = recipe("terrain-ruleset7-water-shallow");
const deep = recipe("terrain-ruleset7-water-deep");
const pearls = recipe("terrain-ruleset7-resource-pearls");
const navalUnits = [
  recipe("unit-shared-embarked-transport"),
  recipe("unit-original-patrol-boat"),
  recipe("unit-original-battleship"),
] as const;

const metrics = await validateInventoryAndGeometry();
await mkdir(reviewRoot, { recursive: true });
await sourceSheet();
await zoomDprSheet();
await coexistenceSheet();
await stateCoastSheet();
await denseCoastSheet();
await writeEvidence(metrics);
console.log(`Ruleset 7 logistics art review written to ${reviewRoot}`);

async function validateInventoryAndGeometry(): Promise<{
  readonly oldPort: AlphaMeasurement;
  readonly port: AlphaMeasurement;
  readonly fish: AlphaMeasurement;
  readonly productionPngCount: number;
}> {
  const revision11Recipes = source.recipes.filter((candidate) =>
    candidate.id.endsWith("v7r11"),
  );
  assert(
    revision11Recipes.length === 2 &&
      RULESET7_LOGISTICS_SOURCE_IDS.every((id) =>
        revision11Recipes.some((candidate) => candidate.id === id),
      ),
    "Revision-11 production inventory must contain exactly Port and Fish",
  );

  const receipts = await Promise.all(
    (await readdir("art/pixellab/submissions")).map(
      async (name) =>
        JSON.parse(
          await readFile(path.join("art/pixellab/submissions", name), "utf8"),
        ) as { readonly id?: string; readonly jobId?: string },
    ),
  );
  for (const id of RULESET7_LOGISTICS_SOURCE_IDS) {
    const currentRecipe = recipe(id);
    const record = required(generated.records[id], `${id} generation record`);
    assert(record.status === "ACCEPTED", `${id} is not accepted`);
    assert(
      Object.values(record.reviewChecks ?? {}).length === 5 &&
        Object.values(record.reviewChecks ?? {}).every(Boolean),
      `${id} review checks are incomplete`,
    );
    const bytes = await readFile(currentRecipe.output);
    assert(hash(bytes) === record.outputSha256, `${id} output hash drifted`);
    const metadata = await sharp(bytes).metadata();
    assert(
      metadata.width === currentRecipe.outputSize.width &&
        metadata.height === currentRecipe.outputSize.height,
      `${id} dimensions drifted`,
    );
    assert(Boolean(record.providerOutputSha256), `${id} provider hash missing`);
    for (const jobId of [
      record.jobId,
      ...(record.rejectedAttempts ?? []).map((attempt) => attempt.jobId),
    ]) {
      assert(Boolean(jobId), `${id} job id missing`);
      assert(
        receipts.some(
          (receipt) => receipt.id === id && receipt.jobId === jobId,
        ),
        `${id} receipt missing for ${jobId}`,
      );
    }
  }

  const oldPortMeasurement = await measureAlpha(oldPort.output);
  const portMeasurement = await measureAlpha(port.output);
  const fishMeasurement = await measureAlpha(fish.output);
  const portWidth = portMeasurement.bounds.right - portMeasurement.bounds.left;
  const portHeight = portMeasurement.bounds.bottom - portMeasurement.bounds.top;
  assert(portWidth >= 300, "Revision-11 Port width is below 300 pixels");
  assert(portHeight >= 210, "Revision-11 Port height is below 210 pixels");
  assertBounds(portMeasurement.bounds, port.hardBounds, port.id);
  assert(
    portMeasurement.weightedArea >= oldPortMeasurement.weightedArea * 1.25,
    "Revision-11 Port alpha-weighted area is below 125% of revision 10",
  );
  assert(
    (await transparentRatio(port.output, {
      left: 80,
      top: 168,
      right: 304,
      bottom: 330,
    })) >= 0.6,
    "Revision-11 Port docking/resource window is not visibly open",
  );
  assertBounds(fishMeasurement.bounds, fish.hardBounds, fish.id);
  assert(
    fishMeasurement.components.length === 6,
    `Revision-11 Fish needs six disconnected silhouettes; got ${fishMeasurement.components.length}`,
  );
  const fishAreas = fishMeasurement.components;
  assert(
    Math.max(...fishAreas) / Math.min(...fishAreas) < 2.25,
    "Revision-11 Fish has a dominant silhouette",
  );

  const productionPngCount = await countPngs("public/assets/pixellab");
  assert(
    productionPngCount === 260,
    `Expected 258 retained plus two new production PNGs; got ${productionPngCount}`,
  );
  return {
    oldPort: oldPortMeasurement,
    port: portMeasurement,
    fish: fishMeasurement,
    productionPngCount,
  };
}

async function sourceSheet(): Promise<void> {
  const width = 1500;
  const rowHeight = 520;
  const overlays: OverlayOptions[] = [];
  for (const [row, current] of [port, fish].entries()) {
    const old = row === 0 ? oldPort : oldFish;
    const top = row * rowHeight;
    overlays.push({
      input: label(current.id, 1450, 42),
      left: 25,
      top: top + 15,
    });
    overlays.push({ input: checker(420, 410), left: 25, top: top + 65 });
    overlays.push({
      input: await contain(current.output, 380, 380),
      left: 45,
      top: top + 80,
    });
    overlays.push({ input: checker(300, 260), left: 475, top: top + 65 });
    overlays.push({
      input: await nativeAsset(current, 1),
      left: 565,
      top: top + 135,
    });
    overlays.push({ input: checker(420, 410), left: 820, top: top + 65 });
    overlays.push({
      input: await contain(current.output, 380, 380, true),
      left: 840,
      top: top + 80,
    });
    overlays.push({ input: checker(210, 210), left: 1260, top: top + 65 });
    overlays.push({
      input: await contain(old.output, 180, 180),
      left: 1275,
      top: top + 80,
    });
    overlays.push({
      input: label("source", 180, 28),
      left: 145,
      top: top + 480,
    });
    overlays.push({
      input: label("native 1×", 180, 28),
      left: 535,
      top: top + 330,
    });
    overlays.push({
      input: label("nearest enlarged", 220, 28),
      left: 920,
      top: top + 480,
    });
    overlays.push({
      input: label("revision 10", 180, 28),
      left: 1275,
      top: top + 280,
    });
  }
  const comparisons = [
    { id: fish.id, label: "Fish · grayscale" },
    { id: pearls.id, label: "Pearls" },
    { id: "terrain-ruleset7-original-fruit-pear", label: "Fruit" },
    { id: "terrain-ruleset7-original-game-deer", label: "Game" },
    { id: "terrain-square-ore", label: "Ore" },
    { id: "terrain-ruleset7-resource-fertile-ground", label: "Fertile Ground" },
  ] as const;
  overlays.push({
    input: label(
      "Fish grayscale and adjacent resource-family comparison",
      1450,
      42,
    ),
    left: 25,
    top: rowHeight * 2 + 10,
  });
  for (const [index, comparison] of comparisons.entries()) {
    const current = recipe(comparison.id);
    const left = 25 + index * 240;
    overlays.push({ input: checker(215, 210), left, top: rowHeight * 2 + 60 });
    overlays.push({
      input:
        index === 0
          ? await sharp(current.output)
              .grayscale()
              .resize(170, 170, {
                fit: "contain",
                background: "#00000000",
              })
              .png()
              .toBuffer()
          : await contain(current.output, 170, 170),
      left: left + 22,
      top: rowHeight * 2 + 72,
    });
    overlays.push({
      input: label(comparison.label, 220, 28),
      left,
      top: rowHeight * 2 + 275,
    });
  }
  await render(width, rowHeight * 2 + 320, overlays, artifactNames[0]);
}

async function zoomDprSheet(): Promise<void> {
  const zooms = [0.625, 1, 1.75] as const;
  const dprs = [1, 2] as const;
  const waters = [shallow, deep] as const;
  const panelWidth = 500;
  const panelHeight = 820;
  const overlays: OverlayOptions[] = [];
  let index = 0;
  for (const zoom of zooms)
    for (const dpr of dprs)
      for (const water of waters) {
        const column = index % 4;
        const row = Math.floor(index / 4);
        const left = column * panelWidth;
        const top = row * panelHeight;
        const scene = await tileScene({
          zoom,
          dpr,
          water,
          building: port,
          resource: fish,
        });
        overlays.push({
          input: label(
            `${zoom}× · DPR ${dpr} · ${water === shallow ? "Shallow" : "Deep"}`,
            360,
            30,
          ),
          left: left + 15,
          top: top + 12,
        });
        overlays.push({
          input: scene.input,
          left: left + Math.round((panelWidth - scene.width) / 2),
          top: top + 52,
        });
        index += 1;
      }
  await render(panelWidth * 4, panelHeight * 3, overlays, artifactNames[1]);
}

async function coexistenceSheet(): Promise<void> {
  const buildings = [port, shipyard] as const;
  const resources = [undefined, fish, pearls] as const;
  const units = [undefined, ...navalUnits] as const;
  const panelWidth = 260;
  const panelHeight = 310;
  const overlays: OverlayOptions[] = [];
  let index = 0;
  for (const building of buildings)
    for (const resource of resources)
      for (const unit of units) {
        const column = index % 8;
        const row = Math.floor(index / 8);
        const left = column * panelWidth;
        const top = row * panelHeight;
        const scene = await tileScene({
          zoom: 1,
          dpr: 1,
          water: index % 2 === 0 ? shallow : deep,
          building,
          ...(resource === undefined ? {} : { resource }),
          ...(unit === undefined ? {} : { unit }),
        });
        overlays.push({ input: scene.input, left: left + 66, top: top + 25 });
        overlays.push({
          input: twoLineLabel(
            `${building === port ? "Port" : "Shipyard"} · ${resource === undefined ? "Open" : resource === fish ? "Fish" : "Pearls"}`,
            unitLabel(unit),
            245,
            52,
          ),
          left: left + 8,
          top: top + 250,
        });
        index += 1;
      }
  await render(panelWidth * 8, panelHeight * 3, overlays, artifactNames[2]);
}

async function stateCoastSheet(): Promise<void> {
  const owners = ["#ef6d66", "#25b7a4", "#e5bd45", "#9f78d1"];
  const overlays: OverlayOptions[] = [
    {
      input: label(
        "Owner colors · selection, blockade and fog overlays remain code-native",
        1540,
        42,
      ),
      left: 18,
      top: 10,
    },
  ];
  for (const [index, owner] of owners.entries()) {
    const ownedPort = await recolorCoral(port.output, owner);
    const state =
      index === 1
        ? "selected"
        : index === 2
          ? "blockaded"
          : index === 3
            ? "fog"
            : undefined;
    const scene = await tileScene({
      zoom: 1,
      dpr: 1,
      water: index % 2 === 0 ? shallow : deep,
      building: port,
      buildingInput: ownedPort,
      resource: fish,
      ...(state === undefined ? {} : { state }),
    });
    overlays.push({ input: scene.input, left: 80 + index * 370, top: 65 });
    overlays.push({
      input: label(owner, 190, 28),
      left: 70 + index * 370,
      top: 290,
    });
  }
  overlays.push({
    input: label("All eight land/water coast adjacencies", 1540, 42),
    left: 18,
    top: 360,
  });
  for (let direction = 0; direction < 8; direction += 1) {
    overlays.push({
      input: await coastAdjacency(direction),
      left: 15 + direction * 195,
      top: 420,
    });
  }
  await render(1580, 630, overlays, artifactNames[3]);
}

async function denseCoastSheet(): Promise<void> {
  const overlays: OverlayOptions[] = [
    { input: label("One through five Ports", 1480, 42), left: 18, top: 10 },
  ];
  for (let count = 1; count <= 5; count += 1) {
    overlays.push({
      input: await portCountPanel(count),
      left: 20 + (count - 1) * 295,
      top: 62,
    });
  }
  overlays.push({
    input: label("11×11 dense coast", 700, 42),
    left: 18,
    top: 310,
  });
  overlays.push({
    input: label("25×25 mixed coast/fleet", 720, 42),
    left: 760,
    top: 310,
  });
  overlays.push({ input: await denseMap(11, 40), left: 35, top: 365 });
  overlays.push({ input: await denseMap(25, 20), left: 800, top: 365 });
  await render(1520, 900, overlays, artifactNames[4]);
}

async function writeEvidence(metrics: {
  readonly oldPort: AlphaMeasurement;
  readonly port: AlphaMeasurement;
  readonly fish: AlphaMeasurement;
  readonly productionPngCount: number;
}): Promise<void> {
  const currentRuntimeMappings = {
    mapPort: RULESET7_IMPROVEMENT_ART_IDS.PORT,
    mapFish: RULESET7_RESOURCE_ART_IDS.FISH,
    dockPort: RULESET7_IMPROVEMENT_ART_IDS.PORT,
    dockFish: RULESET7_RESOURCE_ART_IDS.FISH,
    shorecraft: RULESET7_TECH_ART_IDS.SHORECRAFT,
    buildPort: commandArtIdV7({ kind: "BUILD_PORT", at: { x: 0, y: 0 } }),
    harvestFish: commandArtIdV7({
      kind: "HARVEST_FISH",
      at: { x: 0, y: 0 },
    }),
  };
  assert(
    [
      currentRuntimeMappings.mapPort,
      currentRuntimeMappings.dockPort,
      currentRuntimeMappings.shorecraft,
      currentRuntimeMappings.buildPort,
    ].every((id) => id === RULESET7_LOGISTICS_ART_IDS.PORT) &&
      [
        currentRuntimeMappings.mapFish,
        currentRuntimeMappings.dockFish,
        currentRuntimeMappings.harvestFish,
      ].every((id) => id === RULESET7_LOGISTICS_ART_IDS.FISH),
    "Revision-11 Port and Fish must be bound throughout the current runtime",
  );
  const artifacts = Object.fromEntries(
    await Promise.all(
      artifactNames.map(async (name) => [
        name,
        hash(await readFile(path.join(reviewRoot, name))),
      ]),
    ),
  );
  const displayedOld = metrics.oldPort.weightedArea * 0.3 * 0.3;
  const displayedNew = metrics.port.weightedArea * 0.3 * 0.3;
  const evidence = {
    schemaVersion: 1,
    inventory: {
      exactNewSources: RULESET7_LOGISTICS_SOURCE_IDS,
      retainedProductionPngs: metrics.productionPngCount - 2,
      totalProductionPngs: metrics.productionPngCount,
      liveRuntimeMappingsChanged: true,
      currentRuntimeMappings,
    },
    port: {
      revision10: {
        alphaBounds: metrics.oldPort.bounds,
        alphaWeightedArea: round(metrics.oldPort.weightedArea),
        displayedWeightedAreaAtScale030: round(displayedOld),
      },
      revision11: {
        alphaBounds: metrics.port.bounds,
        alphaWeightedArea: round(metrics.port.weightedArea),
        displayedWeightedAreaAtScale030: round(displayedNew),
        growthRatio: round(displayedNew / displayedOld),
        dockingWindowTransparentRatio: round(
          await transparentRatio(port.output, {
            left: 80,
            top: 168,
            right: 304,
            bottom: 330,
          }),
        ),
      },
    },
    fish: {
      alphaBounds: metrics.fish.bounds,
      disconnectedSilhouettes: metrics.fish.components.length,
      silhouetteAreas: metrics.fish.components,
    },
    drawOrder: [
      "water",
      "Port or Shipyard",
      "resource",
      "unit",
      "code-native status",
    ],
    contexts: {
      zoom: [0.625, 1, 1.75],
      dpr: [1, 2],
      water: ["Shallow", "Deep"],
      owners: ["coral", "teal", "gold", "violet"],
      states: ["base", "selected", "blockaded", "fog"],
      coastAdjacencies: 8,
      portCounts: [1, 2, 3, 4, 5],
      denseMaps: ["11x11", "25x25"],
      resourceComparisons: [
        "Fish revision 10",
        "Pearls",
        "Fruit",
        "Game",
        "Ore",
        "Fertile Ground",
      ],
      navalOccupants: navalUnits.map(({ id }) => id),
      shipyardComparison: shipyard.id,
    },
    artifacts,
  };
  await writeFile(
    path.join(reviewRoot, "review-evidence.json"),
    await format(JSON.stringify(evidence), { parser: "json" }),
  );
}

async function tileScene(options: {
  readonly zoom: number;
  readonly dpr: number;
  readonly water: Recipe;
  readonly building?: Recipe;
  readonly buildingInput?: Buffer;
  readonly resource?: Recipe;
  readonly unit?: Recipe;
  readonly state?: "selected" | "blockaded" | "fog";
}): Promise<{
  readonly input: Buffer;
  readonly width: number;
  readonly height: number;
}> {
  const cell = Math.round(128 * options.zoom * options.dpr);
  const topPad = Math.round(88 * options.zoom * options.dpr);
  const overlays: OverlayOptions[] = [
    {
      input: await contain(options.water.output, cell, cell),
      left: 0,
      top: topPad,
    },
  ];
  // Contract draw order: water, building, resource, unit, code-native status.
  if (options.building)
    overlays.push(
      await worldOverlay(
        options.building,
        0,
        topPad,
        cell,
        options.zoom * options.dpr,
        options.buildingInput,
      ),
    );
  if (options.resource)
    overlays.push(
      await worldOverlay(
        options.resource,
        0,
        topPad,
        cell,
        options.zoom * options.dpr,
      ),
    );
  if (options.unit)
    overlays.push(
      await worldOverlay(
        options.unit,
        0,
        topPad,
        cell,
        options.zoom * options.dpr,
      ),
    );
  if (options.state)
    overlays.push({
      input: stateOverlay(cell, options.state),
      left: 0,
      top: topPad,
    });
  const input = await sharp({
    create: {
      width: cell,
      height: cell + topPad,
      channels: 4,
      background: "#f4eedf",
    },
  })
    .composite(overlays)
    .png()
    .toBuffer();
  return { input, width: cell, height: cell + topPad };
}

async function worldOverlay(
  current: Recipe,
  tileLeft: number,
  tileTop: number,
  cell: number,
  physicalZoom: number,
  inputOverride?: Buffer,
): Promise<OverlayOptions> {
  const scale =
    required(current.displayScale, `${current.id} displayScale`) * physicalZoom;
  const anchor = required(current.anchor, `${current.id} anchor`);
  const width = Math.round(current.outputSize.width * scale);
  const height = Math.round(current.outputSize.height * scale);
  const cosmeticOffset = Math.round(
    (current.cosmeticOffsetY ?? 0) * physicalZoom,
  );
  return {
    input: await contain(inputOverride ?? current.output, width, height),
    left: Math.round(tileLeft + cell / 2 - anchor.x * scale),
    top: Math.round(tileTop + cell / 2 - anchor.y * scale + cosmeticOffset),
  };
}

async function coastAdjacency(direction: number): Promise<Buffer> {
  const cell = 48;
  const size = cell * 3;
  const positions = [
    [0, 0],
    [1, 0],
    [2, 0],
    [2, 1],
    [2, 2],
    [1, 2],
    [0, 2],
    [0, 1],
  ] as const;
  const land = recipe("terrain-square-original-grass-1");
  const overlays: OverlayOptions[] = [];
  for (let y = 0; y < 3; y += 1)
    for (let x = 0; x < 3; x += 1)
      overlays.push({
        input: await contain(shallow.output, cell, cell),
        left: x * cell,
        top: y * cell,
      });
  const [landX, landY] = required(positions[direction], "coast direction");
  overlays.push({
    input: await contain(land.output, cell, cell),
    left: landX * cell,
    top: landY * cell,
  });
  const centerX = cell;
  const centerY = cell;
  overlays.push(await worldOverlay(port, centerX, centerY, cell, cell / 128));
  overlays.push(await worldOverlay(fish, centerX, centerY, cell, cell / 128));
  return sharp({
    create: { width: size, height: size, channels: 4, background: "#00000000" },
  })
    .composite(overlays)
    .png()
    .toBuffer();
}

async function portCountPanel(count: number): Promise<Buffer> {
  const cell = 48;
  const overlays: OverlayOptions[] = [];
  for (let index = 0; index < 5; index += 1) {
    overlays.push({
      input: await contain(
        index % 2 ? deep.output : shallow.output,
        cell,
        cell,
      ),
      left: index * cell,
      top: 55,
    });
    if (index < count) {
      overlays.push(
        await worldOverlay(port, index * cell, 55, cell, cell / 128),
      );
      if (index === count - 1)
        overlays.push(
          await worldOverlay(fish, index * cell, 55, cell, cell / 128),
        );
    }
  }
  overlays.push({
    input: label(`${count} Port${count === 1 ? "" : "s"}`, 240, 28),
    left: 0,
    top: 0,
  });
  return sharp({
    create: { width: 240, height: 120, channels: 4, background: "#f4eedf" },
  })
    .composite(overlays)
    .png()
    .toBuffer();
}

async function denseMap(size: number, cell: number): Promise<Buffer> {
  const grass = recipe("terrain-square-original-grass-1");
  const overlays: OverlayOptions[] = [];
  for (let y = 0; y < size; y += 1)
    for (let x = 0; x < size; x += 1) {
      const land = x < Math.floor(size / 3) + Math.round(Math.sin(y) * 1.5);
      const tile = land ? grass : (x + y) % 4 === 0 ? deep : shallow;
      overlays.push({
        input: await contain(tile.output, cell, cell),
        left: x * cell,
        top: y * cell,
      });
      if (!land && (x * 7 + y * 11) % 29 === 0) {
        const building = (x + y) % 3 === 0 ? shipyard : port;
        overlays.push(
          await worldOverlay(building, x * cell, y * cell, cell, cell / 128),
        );
        overlays.push(
          await worldOverlay(fish, x * cell, y * cell, cell, cell / 128),
        );
        const unit = required(
          navalUnits[(x + y) % navalUnits.length],
          "dense map naval unit",
        );
        overlays.push(
          await worldOverlay(unit, x * cell, y * cell, cell, cell / 128),
        );
      }
    }
  return sharp({
    create: {
      width: size * cell,
      height: size * cell,
      channels: 4,
      background: "#00000000",
    },
  })
    .composite(overlays)
    .png()
    .toBuffer();
}

async function nativeAsset(current: Recipe, zoom: number): Promise<Buffer> {
  const scale =
    required(current.displayScale, `${current.id} displayScale`) * zoom;
  return contain(
    current.output,
    current.outputSize.width * scale,
    current.outputSize.height * scale,
  );
}

async function contain(
  input: string | Buffer,
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

async function recolorCoral(input: string, color: string): Promise<Buffer> {
  const target = parseHex(color);
  const { data, info } = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  for (let offset = 0; offset < data.length; offset += 4) {
    const red = data[offset] ?? 0;
    const green = data[offset + 1] ?? 0;
    const blue = data[offset + 2] ?? 0;
    const pixel = offset / 4;
    const x = pixel % info.width;
    const y = Math.floor(pixel / info.width);
    if (
      x >= 80 &&
      x <= 210 &&
      y >= 115 &&
      y <= 190 &&
      red > 145 &&
      red > green * 1.18 &&
      red > blue * 1.08
    ) {
      const value = Math.max(0.55, Math.min(1.15, (red + green + blue) / 510));
      data[offset] = Math.min(255, Math.round(target[0] * value));
      data[offset + 1] = Math.min(255, Math.round(target[1] * value));
      data[offset + 2] = Math.min(255, Math.round(target[2] * value));
    }
  }
  return sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png()
    .toBuffer();
}

function stateOverlay(
  cell: number,
  state: "selected" | "blockaded" | "fog",
): Buffer {
  if (state === "selected")
    return Buffer.from(
      `<svg width="${cell}" height="${cell}" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="4" width="${cell - 8}" height="${cell - 8}" rx="12" fill="none" stroke="#ffe69a" stroke-width="6" stroke-dasharray="12 7"/></svg>`,
    );
  if (state === "blockaded")
    return Buffer.from(
      `<svg width="${cell}" height="${cell}" xmlns="http://www.w3.org/2000/svg"><path d="M${cell * 0.72} ${cell * 0.12}l${cell * 0.16} ${cell * 0.16}m0-${cell * 0.16}l-${cell * 0.16} ${cell * 0.16}" stroke="#8d2f36" stroke-width="7" stroke-linecap="round"/></svg>`,
    );
  return Buffer.from(
    `<svg width="${cell}" height="${cell}" xmlns="http://www.w3.org/2000/svg"><rect width="${cell}" height="${cell}" fill="#334846" fill-opacity="0.58"/></svg>`,
  );
}

function checker(width: number, height: number): Buffer {
  return Buffer.from(
    `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><defs><pattern id="c" width="24" height="24" patternUnits="userSpaceOnUse"><rect width="24" height="24" fill="#f6f0df"/><path d="M0 0h12v12H0zM12 12h12v12H12z" fill="#d7ddd8"/></pattern></defs><rect width="100%" height="100%" fill="url(#c)"/></svg>`,
  );
}

function label(text: string, width: number, height: number): Buffer {
  const safe = text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
  return Buffer.from(
    `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><text x="6" y="${Math.min(height - 5, 27)}" font-family="Arial,sans-serif" font-size="22" fill="#1c302f">${safe}</text></svg>`,
  );
}

function twoLineLabel(
  first: string,
  second: string,
  width: number,
  height: number,
): Buffer {
  const safeFirst = escapeXml(first);
  const safeSecond = escapeXml(second);
  return Buffer.from(
    `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><text x="6" y="20" font-family="Arial,sans-serif" font-size="18" fill="#1c302f">${safeFirst}</text><text x="6" y="44" font-family="Arial,sans-serif" font-size="18" fill="#1c302f">${safeSecond}</text></svg>`,
  );
}

function unitLabel(unit: Recipe | undefined): string {
  if (unit === undefined) return "No occupant";
  if (unit.id === "unit-shared-embarked-transport") return "Transport";
  if (unit.id === "unit-original-patrol-boat") return "Patrol Boat";
  return "Battleship";
}

function escapeXml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

async function render(
  width: number,
  height: number,
  overlays: readonly OverlayOptions[],
  name: string,
): Promise<void> {
  await sharp({ create: { width, height, channels: 4, background: "#f4eedf" } })
    .composite([...overlays])
    .png({ compressionLevel: 9, adaptiveFiltering: false })
    .toFile(path.join(reviewRoot, name));
}

async function measureAlpha(input: string): Promise<AlphaMeasurement> {
  const { data, info } = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let left = info.width;
  let top = info.height;
  let right = 0;
  let bottom = 0;
  let weightedArea = 0;
  const solid = new Uint8Array(info.width * info.height);
  for (let y = 0; y < info.height; y += 1)
    for (let x = 0; x < info.width; x += 1) {
      const alpha = data[(y * info.width + x) * 4 + 3] ?? 0;
      weightedArea += alpha / 255;
      if (alpha > 0) {
        left = Math.min(left, x);
        top = Math.min(top, y);
        right = Math.max(right, x + 1);
        bottom = Math.max(bottom, y + 1);
      }
      if (alpha >= 32) solid[y * info.width + x] = 1;
    }
  return {
    bounds: { left, top, right, bottom },
    weightedArea,
    components: connectedComponents(solid, info.width, info.height).filter(
      (area) => area >= 50,
    ),
  };
}

function connectedComponents(
  mask: Uint8Array,
  width: number,
  height: number,
): number[] {
  const areas: number[] = [];
  const queue: number[] = [];
  for (let start = 0; start < mask.length; start += 1) {
    if (mask[start] !== 1) continue;
    mask[start] = 2;
    queue.push(start);
    let area = 0;
    while (queue.length > 0) {
      const current = required(queue.pop(), "component pixel");
      area += 1;
      const x = current % width;
      const y = Math.floor(current / width);
      for (const next of [
        x > 0 ? current - 1 : -1,
        x + 1 < width ? current + 1 : -1,
        y > 0 ? current - width : -1,
        y + 1 < height ? current + width : -1,
      ]) {
        if (next >= 0 && mask[next] === 1) {
          mask[next] = 2;
          queue.push(next);
        }
      }
    }
    areas.push(area);
  }
  return areas.sort((a, b) => a - b);
}

async function transparentRatio(
  input: string,
  bounds: Bounds,
): Promise<number> {
  const { data, info } = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let transparent = 0;
  let total = 0;
  for (let y = bounds.top; y < bounds.bottom; y += 1)
    for (let x = bounds.left; x < bounds.right; x += 1) {
      if ((data[(y * info.width + x) * 4 + 3] ?? 0) === 0) transparent += 1;
      total += 1;
    }
  return transparent / total;
}

async function countPngs(directory: string): Promise<number> {
  let count = 0;
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const resolved = path.join(directory, entry.name);
    if (entry.isDirectory()) count += await countPngs(resolved);
    else if (entry.name.endsWith(".png")) count += 1;
  }
  return count;
}

function assertBounds(actual: Bounds, hard: Bounds, id: string): void {
  assert(
    actual.left >= hard.left &&
      actual.top >= hard.top &&
      actual.right <= hard.right &&
      actual.bottom <= hard.bottom,
    `${id} exceeds hard bounds`,
  );
}

function parseHex(value: string): readonly [number, number, number] {
  return [
    Number.parseInt(value.slice(1, 3), 16),
    Number.parseInt(value.slice(3, 5), 16),
    Number.parseInt(value.slice(5, 7), 16),
  ];
}

function recipe(id: string): Recipe {
  return required(recipes.get(id), `recipe ${id}`);
}

function required<T>(value: T | undefined, name: string): T {
  if (value === undefined) throw new Error(`Missing ${name}`);
  return value;
}

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function hash(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function round(value: number): number {
  return Math.round(value * 10000) / 10000;
}

function optionalOption(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index < 0 ? undefined : process.argv[index + 1];
}
