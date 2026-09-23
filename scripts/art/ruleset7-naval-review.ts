import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { format } from "prettier";
import sharp, { type OverlayOptions } from "sharp";

const root = process.cwd();
const reviewRoot = path.join(root, "art/pixellab/reviews/ruleset7-naval");
const ids = [
  "terrain-ruleset7-water-shallow",
  "terrain-ruleset7-water-deep",
  "terrain-ruleset7-resource-fish",
  "terrain-ruleset7-resource-pearls",
  "building-ruleset7-port",
  "unit-shared-embarked-transport",
  "unit-original-patrol-boat",
  "unit-original-battleship",
] as const;
const unitIds = [
  "unit-shared-embarked-transport",
  "unit-original-patrol-boat",
  "unit-original-battleship",
] as const;
type ContextLayer = (typeof ids)[number] | "fixture-city" | "fixture-land-unit";
const artifacts = [
  "source-native-enlarged.png",
  "water-seams-repetition.png",
  "coexistence-zoom-dpr.png",
  "dense-coast-11x11.png",
  "mixed-fleet-25x25.png",
  "ui-reuse-32px.png",
  "transport-sample-context.png",
  "source-2x-detail.png",
] as const;

interface Recipe {
  readonly id: string;
  readonly output: string;
  readonly seed: number;
  readonly outputSize: { readonly width: number; readonly height: number };
  readonly anchor?: { readonly x: number; readonly y: number };
  readonly displayScale?: number;
  readonly hardBounds: Bounds;
  readonly preferredBounds?: Bounds;
  readonly historicalStyleReference?: {
    readonly id: string;
    readonly path: string;
    readonly sha256: string;
  };
}
interface Bounds {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}
interface RecordEntry {
  readonly status: string;
  readonly jobId?: string;
  readonly candidate?: string;
  readonly outputSha256?: string;
  readonly alphaBounds?: Bounds;
  readonly reviewedAt?: string;
  readonly request?: {
    readonly styleReference?: {
      readonly id?: string;
      readonly sha256?: string;
    };
  };
  readonly rejectedAttempts?: readonly {
    readonly request?: {
      readonly styleReference?: {
        readonly id?: string;
        readonly sha256?: string;
      };
    };
  }[];
}

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
const available = ids.filter((id) => {
  const status = generated.records[id]?.status;
  return status === "CANDIDATE" || status === "ACCEPTED";
});
if (available.length === 0) throw new Error("No naval candidate is available");
await mkdir(reviewRoot, { recursive: true });
await sourceSheet();
await source2xSheet();
if (available.includes(ids[0]) && available.includes(ids[1]))
  await waterSheet();
if (
  [ids[0], ids[1], ids[2], ids[3], ids[4], ids[5]].every((id) =>
    available.includes(id),
  )
)
  await transportSampleSheet();
if (available.length === ids.length) {
  await coexistenceSheet();
  await denseSheet(11, artifacts[3]);
  await denseSheet(25, artifacts[4]);
  await uiReuseSheet();
}
if (ids.every((id) => generated.records[id]?.status === "ACCEPTED")) {
  await assertReceiptsAndOrder();
  await writeEvidence();
  console.log(
    `Ruleset 7 naval review evidence ready: ${path.relative(root, reviewRoot)}`,
  );
} else {
  console.log(
    `Ruleset 7 naval candidate evidence ready: ${path.relative(root, reviewRoot)} (${available.join(", ")})`,
  );
}

function fileFor(id: (typeof ids)[number]): string {
  const recipe = required(recipes.get(id), `${id} recipe`);
  const record = required(generated.records[id], `${id} record`);
  return path.join(
    root,
    record.status === "ACCEPTED"
      ? recipe.output
      : required(record.candidate, `${id} candidate`),
  );
}

async function sourceSheet(): Promise<void> {
  const rowHeight = 430;
  const width = 1560;
  const overlays: OverlayOptions[] = [
    {
      input: title(
        "RULESET 7 NAVAL · SOURCE OVERVIEW / DETAIL OVERVIEW / EXACT NATIVE",
        width,
      ),
      left: 0,
      top: 8,
    },
  ];
  for (const [row, id] of available.entries()) {
    const recipe = required(recipes.get(id), `${id} recipe`);
    const record = required(generated.records[id], `${id} record`);
    const top = 64 + row * rowHeight;
    overlays.push({ input: label(id, 460), left: 12, top });
    overlays.push({ input: checker(360, 300), left: 10, top: top + 40 });
    overlays.push({
      input: await contain(fileFor(id), 340, 280),
      left: 20,
      top: top + 50,
    });
    overlays.push({ input: checker(520, 300), left: 390, top: top + 40 });
    overlays.push({
      input: await contain(fileFor(id), 500, 280, true),
      left: 400,
      top: top + 50,
    });
    overlays.push({ input: checker(610, 300), left: 930, top: top + 40 });
    overlays.push({ input: await nativePanel(id), left: 940, top: top + 50 });
    overlays.push({
      input: label(
        `${record.status} · ${recipe.outputSize.width}×${recipe.outputSize.height} · seed ${recipe.seed}\nalpha ${bounds(record.alphaBounds)} · scale ${recipe.displayScale}`,
        900,
      ),
      left: 20,
      top: top + 350,
    });
  }
  await render(
    width,
    92 + rowHeight * available.length,
    overlays,
    artifacts[0],
  );
}

async function source2xSheet(): Promise<void> {
  const cell = 880;
  const overlays: OverlayOptions[] = [
    {
      input: title("RULESET 7 NAVAL · EXACT 2× SOURCE-PIXEL DETAIL", cell * 2),
      left: 0,
      top: 8,
    },
  ];
  for (const [index, id] of available.entries()) {
    const recipe = required(recipes.get(id), `${id} recipe`);
    const column = index % 2;
    const row = Math.floor(index / 2);
    const imageWidth = recipe.outputSize.width * 2;
    const imageHeight = recipe.outputSize.height * 2;
    const image = await sharp(fileFor(id))
      .resize(imageWidth, imageHeight, {
        fit: "fill",
        kernel: sharp.kernel.nearest,
      })
      .png()
      .toBuffer();
    overlays.push({
      input: checker(cell - 16, cell - 58),
      left: column * cell + 8,
      top: row * cell + 54,
    });
    overlays.push({
      input: label(`${id} · exact 2× nearest`, cell - 20),
      left: column * cell + 10,
      top: row * cell + 58,
    });
    overlays.push({
      input: image,
      left: column * cell + Math.round((cell - imageWidth) / 2),
      top:
        row * cell +
        84 +
        Math.max(0, Math.round((cell - 100 - imageHeight) / 2)),
    });
  }
  await render(
    cell * 2,
    Math.ceil(available.length / 2) * cell + 60,
    overlays,
    artifacts[7],
  );
}

async function waterSheet(): Promise<void> {
  const overlays: OverlayOptions[] = [
    {
      input: title(
        "WATER · SAME-TYPE SEAMS / SHALLOW-DEEP / 8×8 REPETITION",
        2048,
      ),
      left: 0,
      top: 8,
    },
  ];
  for (let y = 0; y < 8; y += 1)
    for (let x = 0; x < 8; x += 1) {
      const id = x < 4 === y < 4 ? ids[0] : ids[1];
      overlays.push({
        input: await sharp(fileFor(id)).resize(192, 192).png().toBuffer(),
        left: 16 + x * 192,
        top: 64 + y * 192,
      });
    }
  overlays.push({
    input: label(
      "Exact shared outer fields create seam-free same-type blocks; the center cross exposes every shallow/deep orientation.",
      460,
    ),
    left: 1572,
    top: 90,
  });
  overlays.push({
    input: label("GRAYSCALE 128px", 440),
    left: 1572,
    top: 190,
  });
  overlays.push({
    input: await sharp(fileFor(ids[0]))
      .resize(192, 192)
      .greyscale()
      .png()
      .toBuffer(),
    left: 1572,
    top: 240,
  });
  overlays.push({
    input: await sharp(fileFor(ids[1]))
      .resize(192, 192)
      .greyscale()
      .png()
      .toBuffer(),
    left: 1776,
    top: 240,
  });
  await render(2048, 1620, overlays, artifacts[1], "#233b39");
}

async function coexistenceSheet(): Promise<void> {
  const settings = [
    [0.625, 1],
    [1, 1],
    [1.75, 1],
    [0.625, 2],
    [1, 2],
    [1.75, 2],
  ] as const;
  const overlays: OverlayOptions[] = [
    {
      input: title(
        "NAVAL ART COMPOSITION · WATER / PORT / RESOURCE / FLEET · ZOOM + DPR",
        2780,
      ),
      left: 0,
      top: 8,
    },
  ];
  for (const [index, [zoom, dpr]] of settings.entries()) {
    const column = index % 2;
    const row = Math.floor(index / 2);
    overlays.push({
      input: label(`${zoom}× · DPR${dpr} · composition fixture pixels`, 1360),
      left: 10 + column * 1385,
      top: 62 + row * 940,
    });
    overlays.push({
      input: await contextPanel(zoom, dpr),
      left: 10 + column * 1385,
      top: 104 + row * 940,
    });
  }
  await render(2780, 2900, overlays, artifacts[2]);
}

async function transportSampleSheet(): Promise<void> {
  const settings = [
    [0.625, 1],
    [1, 1],
    [1.75, 1],
    [0.625, 2],
    [1, 2],
    [1.75, 2],
  ] as const;
  const overlays: OverlayOptions[] = [
    {
      input: title(
        "TRANSPORT SAMPLE GATE · ACTUAL ANCHORS / SAME-TILE PORT + RESOURCE",
        2800,
      ),
      left: 0,
      top: 8,
    },
  ];
  for (const [index, [zoom, dpr]] of settings.entries()) {
    const cell = Math.round(128 * zoom * dpr);
    const column = index % 2;
    const row = Math.floor(index / 2);
    const panel = await sharp({
      create: {
        width: cell * 3,
        height: cell * 2,
        channels: 4,
        background: "#00000000",
      },
    })
      .composite([
        {
          input: await cellScene(ids[0], [ids[5]], cell, {
            owner: 0,
            selected: true,
          }),
          left: 0,
          top: 0,
        },
        {
          input: await cellScene(ids[1], [ids[5]], cell, { owner: 1 }),
          left: cell,
          top: 0,
        },
        {
          input: await cellScene(ids[0], [ids[4], ids[2], ids[5]], cell, {
            owner: 2,
          }),
          left: cell * 2,
          top: 0,
        },
        {
          input: await cellScene(ids[1], [ids[4], ids[3], ids[5]], cell, {
            owner: 3,
            selected: true,
          }),
          left: 0,
          top: cell,
        },
        {
          input: await cellScene(ids[0], [ids[4], ids[2]], cell, { fog: true }),
          left: cell,
          top: cell,
        },
        {
          input: await cellScene(ids[1], [ids[3], ids[5]], cell),
          left: cell * 2,
          top: cell,
        },
      ])
      .png()
      .toBuffer();
    overlays.push({
      input: label(`${zoom}× · DPR${dpr} · composition fixture pixels`, 1360),
      left: 10 + column * 1390,
      top: 62 + row * 940,
    });
    overlays.push({
      input: panel,
      left: 10 + column * 1390,
      top: 104 + row * 940,
    });
  }
  await render(2800, 2900, overlays, artifacts[6]);
}

async function denseSheet(size: 11 | 25, artifact: string): Promise<void> {
  const cell = size === 11 ? 72 : 32;
  const center = Math.floor(size / 2);
  const forcedWater = new Set([
    `${center - 1},${center - 1}`,
    `${center - 1},${center}`,
    `${center + 2},${center}`,
    `${center - 1},${center + 1}`,
    `${center + 2},${center + 1}`,
  ]);
  const landingLand = (x: number, y: number): boolean =>
    x >= center && x <= center + 1 && y >= center - 1 && y <= center;
  const isLand = (x: number, y: number): boolean =>
    !forcedWater.has(`${x},${y}`) &&
    (landingLand(x, y) ||
      (x + y * 2) % 9 < 2 ||
      (x > size * 0.72 && y < size * 0.28));
  const explicitLayers = new Map<string, readonly ContextLayer[]>([
    [`${center - 1},${center - 1}`, [ids[4], ids[2], ids[5]]],
    [`${center - 1},${center}`, [ids[4], ids[3], ids[6]]],
    [`${center + 2},${center}`, [ids[4], ids[2], ids[7]]],
    [`${center},${center - 1}`, ["fixture-city"]],
    [`${center + 1},${center}`, ["fixture-land-unit"]],
    [`${center - 1},${center + 1}`, [ids[3], ids[5]]],
    [`${center + 2},${center + 1}`, [ids[2], ids[7]]],
  ]);
  let fleetIndex = 0;
  const overlays: OverlayOptions[] = [
    {
      input: title(
        `ART COMPOSITION · ${size}×${size} DENSE COAST / MIXED FLEET`,
        size * cell,
      ),
      left: 0,
      top: 5,
    },
  ];
  for (let y = 0; y < size; y += 1)
    for (let x = 0; x < size; x += 1) {
      const land = isLand(x, y);
      const layers: ContextLayer[] = [
        ...(explicitLayers.get(`${x},${y}`) ?? []),
      ];
      if (layers.length === 0 && !land && (x * 3 + y * 5) % 17 === 0)
        layers.push(
          ids[4],
          required(ids[2 + ((x + y) % 2)], "dense resource fixture"),
        );
      if (layers.length === 0 && !land && (x * 7 + y * 11) % 19 === 0) {
        layers.push(
          required(unitIds[fleetIndex % unitIds.length], "dense fleet fixture"),
        );
        fleetIndex += 1;
      }
      overlays.push({
        input: await cellScene(
          land ? "land" : (x + Math.floor(y / 2)) % 5 < 3 ? ids[0] : ids[1],
          layers,
          cell,
          {
            owner: (x + y) % 4,
            selected: (x + y) % 23 === 0,
            fog: (x * 5 + y * 7) % 31 === 0,
            coast: land
              ? []
              : [
                  y > 0 && isLand(x, y - 1) ? "N" : "",
                  x + 1 < size && isLand(x + 1, y) ? "E" : "",
                  y + 1 < size && isLand(x, y + 1) ? "S" : "",
                  x > 0 && isLand(x - 1, y) ? "W" : "",
                ].filter(Boolean),
          },
        ),
        left: x * cell,
        top: 48 + y * cell,
      });
    }
  await render(size * cell, 48 + size * cell, overlays, artifact);
}

async function uiReuseSheet(): Promise<void> {
  const uiIds = [
    ids[1],
    ids[4],
    ids[2],
    ids[3],
    ids[5],
    ids[6],
    ids[7],
  ] as const;
  const overlays: OverlayOptions[] = [
    {
      input: title("UI REUSE · EXACT 32px / 8× NEAREST REVIEW", 2100),
      left: 0,
      top: 8,
    },
  ];
  for (const [index, id] of uiIds.entries()) {
    const exact = id.startsWith("terrain-ruleset7-water")
      ? await sharp(fileFor(id)).resize(32, 32).png().toBuffer()
      : await contain(fileFor(id), 32, 32);
    const enlarged = await sharp(exact)
      .resize(256, 256, { kernel: sharp.kernel.nearest })
      .png()
      .toBuffer();
    overlays.push({ input: label(id, 290), left: index * 300 + 6, top: 60 });
    overlays.push({
      input: checker(280, 280),
      left: index * 300 + 6,
      top: 104,
    });
    overlays.push({ input: enlarged, left: index * 300 + 18, top: 116 });
    overlays.push({ input: exact, left: index * 300 + 124, top: 394 });
  }
  await render(2100, 460, overlays, artifacts[5]);
}

async function nativePanel(id: (typeof ids)[number]): Promise<Buffer> {
  const canvas = await sharp({
    create: { width: 590, height: 280, channels: 4, background: "#5f948f" },
  })
    .png()
    .toBuffer();
  return sharp(canvas)
    .composite([
      { input: await cellScene(ids[0], [id], 128), left: 231, top: 76 },
    ])
    .png()
    .toBuffer();
}

async function contextPanel(zoom: number, dpr: number): Promise<Buffer> {
  const cell = Math.round(128 * zoom * dpr);
  const width = cell * 3;
  const height = cell * 2;
  const overlays: OverlayOptions[] = [];
  const scenes = [
    [ids[0], [ids[4], ids[2], ids[5]], { owner: 0, selected: true }],
    [ids[1], [ids[4], ids[3], ids[6]], { owner: 1 }],
    [ids[0], [ids[4], ids[2], ids[7]], { owner: 2, selected: true }],
    [ids[1], [ids[3], ids[5]], { owner: 3 }],
    ["land", [], { fog: true }],
    [ids[0], [ids[4], ids[3], ids[7]], { owner: 0, fog: true }],
  ] as const;
  for (const [index, [ground, layers, state]] of scenes.entries())
    overlays.push({
      input: await cellScene(ground, layers, cell, state),
      left: (index % 3) * cell,
      top: Math.floor(index / 3) * cell,
    });
  return sharp({
    create: { width, height, channels: 4, background: "#00000000" },
  })
    .composite(overlays)
    .png()
    .toBuffer();
}

async function cellScene(
  ground: (typeof ids)[0] | (typeof ids)[1] | "land",
  layers: readonly ContextLayer[],
  cell: number,
  state: {
    readonly owner?: number;
    readonly selected?: boolean;
    readonly fog?: boolean;
    readonly coast?: readonly string[];
  } = {},
): Promise<Buffer> {
  const background =
    ground === "land"
      ? await sharp(
          path.join(
            root,
            "public/assets/pixellab/terrain-ruleset7/original-grass-1.png",
          ),
        )
          .resize(cell, cell)
          .png()
          .toBuffer()
      : await sharp(fileFor(ground)).resize(cell, cell).png().toBuffer();
  const overlays: OverlayOptions[] = [];
  for (const id of layers) {
    const layer = await anchoredSprite(id, cell);
    const sourceLeft = Math.max(0, -layer.left);
    const sourceTop = Math.max(0, -layer.top);
    const left = Math.max(0, layer.left);
    const top = Math.max(0, layer.top);
    const width = Math.min(layer.width - sourceLeft, cell - left);
    const height = Math.min(layer.height - sourceTop, cell - top);
    if (width > 0 && height > 0)
      overlays.push({
        input: await sharp(layer.image)
          .extract({ left: sourceLeft, top: sourceTop, width, height })
          .png()
          .toBuffer(),
        left,
        top,
      });
  }
  const colors = ["#f06762", "#28b7a4", "#e2b63f", "#a277d2"];
  if (state.owner !== undefined || state.selected)
    overlays.push({
      input: Buffer.from(
        `<svg width="${cell}" height="${cell}" xmlns="http://www.w3.org/2000/svg"><rect x="${Math.max(1, cell * 0.04)}" y="${Math.max(1, cell * 0.04)}" width="${cell * 0.92}" height="${cell * 0.92}" rx="${cell * 0.08}" fill="none" stroke="${colors[state.owner ?? 0]}" stroke-width="${Math.max(2, cell * 0.025)}"${state.selected ? ` stroke-dasharray="${cell * 0.08} ${cell * 0.04}"` : ""}/></svg>`,
      ),
      left: 0,
      top: 0,
    });
  if ((state.coast?.length ?? 0) > 0) {
    const paths = state.coast
      ?.map((edge) =>
        edge === "N"
          ? `M0 2 H${cell}`
          : edge === "E"
            ? `M${cell - 2} 0 V${cell}`
            : edge === "S"
              ? `M0 ${cell - 2} H${cell}`
              : `M2 0 V${cell}`,
      )
      .join(" ");
    overlays.push({
      input: Buffer.from(
        `<svg width="${cell}" height="${cell}" xmlns="http://www.w3.org/2000/svg"><path d="${paths}" fill="none" stroke="#d6e2d2" stroke-width="${Math.max(2, cell * 0.025)}" stroke-dasharray="${Math.max(3, cell * 0.06)} ${Math.max(2, cell * 0.035)}"/></svg>`,
      ),
      left: 0,
      top: 0,
    });
  }
  if (state.fog)
    overlays.push({
      input: Buffer.from(
        `<svg width="${cell}" height="${cell}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#263b43" fill-opacity="0.62"/><path d="M0 ${cell * 0.78} Q${cell * 0.3} ${cell * 0.62} ${cell * 0.55} ${cell * 0.78} T${cell} ${cell * 0.72}" fill="none" stroke="#9fb1ae" stroke-width="${Math.max(2, cell * 0.02)}"/></svg>`,
      ),
      left: 0,
      top: 0,
    });
  return sharp(background).composite(overlays).png().toBuffer();
}

async function anchoredSprite(
  id: ContextLayer,
  cell: number,
): Promise<{
  image: Buffer;
  left: number;
  top: number;
  width: number;
  height: number;
}> {
  if (id === "fixture-city" || id === "fixture-land-unit") {
    const city = id === "fixture-city";
    const source = path.join(
      root,
      city
        ? "public/assets/pixellab/buildings/city-2.png"
        : "public/assets/pixellab/units/original-heavy.png",
    );
    const nominal = city
      ? { width: 115, height: 115, anchorX: 58, anchorY: 73 }
      : { width: 90, height: 104, anchorX: 45, anchorY: 78 };
    const width = Math.max(1, Math.round((nominal.width * cell) / 128));
    const height = Math.max(1, Math.round((nominal.height * cell) / 128));
    return {
      image: await sharp(source)
        .resize(width, height, { fit: "fill", kernel: sharp.kernel.lanczos3 })
        .png()
        .toBuffer(),
      left: Math.round(cell / 2 - (nominal.anchorX * cell) / 128),
      top: Math.round(cell / 2 - (nominal.anchorY * cell) / 128),
      width,
      height,
    };
  }
  const recipe = required(recipes.get(id), `${id} recipe`);
  const scale = recipe.displayScale ?? 0.5;
  const width = Math.max(
    1,
    Math.round((recipe.outputSize.width * scale * cell) / 128),
  );
  const height = Math.max(
    1,
    Math.round((recipe.outputSize.height * scale * cell) / 128),
  );
  const anchor = required(recipe.anchor, `${id} anchor`);
  return {
    image: await sharp(fileFor(id))
      .resize(width, height, { fit: "fill", kernel: sharp.kernel.lanczos3 })
      .png()
      .toBuffer(),
    left: Math.round(cell / 2 - (anchor.x * scale * cell) / 128),
    top: Math.round(cell / 2 - (anchor.y * scale * cell) / 128),
    width,
    height,
  };
}

async function assertReceiptsAndOrder(): Promise<void> {
  const receiptFiles = await readdir(
    path.join(root, "art/pixellab/submissions"),
  );
  const receipts = await Promise.all(
    receiptFiles
      .filter((name) => name.endsWith(".json"))
      .map(
        async (name) =>
          JSON.parse(
            await readFile(
              path.join(root, "art/pixellab/submissions", name),
              "utf8",
            ),
          ) as {
            id?: string;
            jobId?: string;
            request?: {
              styleReference?: { id?: string; sha256?: string };
            };
          },
      ),
  );
  const byId = new Map<string, (typeof receipts)[number]>();
  for (const id of ids) {
    const record = required(generated.records[id], `${id} record`);
    const receipt = required(
      receipts.find(
        (candidate) => candidate.id === id && candidate.jobId === record.jobId,
      ),
      `${id} submission receipt`,
    );
    byId.set(id, receipt);
    if (receipt.jobId !== record.jobId)
      throw new Error(`${id}: receipt job mismatch`);
  }
  const patrolReference = byId.get(unitIds[1])?.request?.styleReference;
  const battleshipReference = byId.get(unitIds[2])?.request?.styleReference;
  const patrolRecipe = required(recipes.get(unitIds[1]), "Patrol recipe");
  const historical = required(
    patrolRecipe.historicalStyleReference,
    "Patrol historical style reference",
  );
  if (
    patrolReference?.id !== unitIds[0] ||
    patrolReference.sha256 !== generated.records[unitIds[0]]?.outputSha256 ||
    historical.id !== unitIds[0] ||
    hash(await readFile(path.join(root, historical.path))) !==
      historical.sha256 ||
    !generated.records[unitIds[1]]?.rejectedAttempts?.some(
      (attempt) =>
        attempt.request?.styleReference?.id === historical.id &&
        attempt.request.styleReference.sha256 === historical.sha256,
    ) ||
    battleshipReference?.id !== unitIds[1] ||
    battleshipReference.sha256 !== generated.records[unitIds[1]]?.outputSha256
  )
    throw new Error(
      "Naval unit receipts do not prove the ordered accepted-reference chain",
    );
}

async function writeEvidence(): Promise<void> {
  const evidence = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    inventory: ids.map((id) => ({
      id,
      outputSha256: generated.records[id]?.outputSha256,
      alphaBounds: generated.records[id]?.alphaBounds,
    })),
    aliases: {
      navigation: ids[1],
      shorecraft: ids[4],
      navalEngineering: ids[7],
      portraits: unitIds,
    },
    providerStyleReferences: {
      patrolBoat: generated.records[unitIds[1]]?.request?.styleReference,
      battleship: generated.records[unitIds[2]]?.request?.styleReference,
      historicalPatrolBoat: recipes.get(unitIds[1])?.historicalStyleReference,
    },
    conditionalNavigationSymbol: "not-generated-deep-water-readable",
    checks: {
      source: true,
      native: true,
      enlarged: true,
      minimumZoom: true,
      zooms: [0.625, 1, 1.75],
      dpr: [1, 2],
      waterSeams: true,
      repetition8x8: true,
      resourcePortFleetCoexistence: true,
      fogSelectionOwnershipCompositionReview: true,
      denseCoast11x11: true,
      mixedFleet25x25: true,
      orderedUnitGate: true,
      receiptVerified: true,
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
    "# Ruleset 7 naval review\n\nChecked evidence for six retained revision-6 naval sources and the revision-7 Patrol Boat and Battleship replacements. The sheets cover source, enlarged and native display; water seams and repetition; resource, Port and fleet composition at every supported zoom and DPR; and dense 11 × 11 and 25 × 25 art fixtures. These fixtures review art composition and do not claim runtime renderer coverage. Deep Water remains readable as the Navigation reuse source, so the conditional symbol was not generated.\n",
  );
}

async function contain(
  file: string,
  width: number,
  height: number,
  nearest = false,
): Promise<Buffer> {
  return sharp(file)
    .resize(width, height, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
      kernel: nearest ? sharp.kernel.nearest : sharp.kernel.lanczos3,
    })
    .png()
    .toBuffer();
}
function checker(width: number, height: number): Buffer {
  return Buffer.from(
    `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><defs><pattern id="p" width="24" height="24" patternUnits="userSpaceOnUse"><rect width="24" height="24" fill="#d9dfda"/><rect width="12" height="12" fill="#aebbb5"/><rect x="12" y="12" width="12" height="12" fill="#aebbb5"/></pattern></defs><rect width="100%" height="100%" fill="url(#p)"/></svg>`,
  );
}
function title(text: string, width: number): Buffer {
  return Buffer.from(
    `<svg width="${width}" height="44" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="44" fill="#18312f"/><text x="18" y="30" fill="white" font-family="sans-serif" font-size="22" font-weight="bold">${text}</text></svg>`,
  );
}
function label(text: string, width: number): Buffer {
  const lines = text.split("\n");
  return Buffer.from(
    `<svg width="${width}" height="70" xmlns="http://www.w3.org/2000/svg"><text x="2" y="20" fill="white" font-family="sans-serif" font-size="16">${lines.map((line, index) => `<tspan x="2" dy="${index === 0 ? 0 : 22}">${line}</tspan>`).join("")}</text></svg>`,
  );
}
async function render(
  width: number,
  height: number,
  overlays: OverlayOptions[],
  artifact: string,
  background = "#294844",
): Promise<void> {
  await sharp({ create: { width, height, channels: 4, background } })
    .composite(overlays)
    .png({ compressionLevel: 9 })
    .toFile(path.join(reviewRoot, artifact));
}
function bounds(value: Bounds | undefined): string {
  return value === undefined
    ? "missing"
    : `${value.left},${value.top}..${value.right},${value.bottom}`;
}
function hash(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}
function required<T>(value: T | undefined, name: string): T {
  if (value === undefined) throw new Error(`Missing ${name}`);
  return value;
}
