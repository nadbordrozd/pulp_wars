import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp, { type OverlayOptions } from "sharp";

const root = process.cwd();
const reviewRoot = path.join(root, "art/pixellab/reviews/ruleset7-farms");
const ids = [
  "building-ruleset7-farm-single",
  "building-ruleset7-farm-pair-horizontal",
  "building-ruleset7-farm-pair-vertical",
] as const;
const artifacts = [
  "source-native-enlarged.png",
  "adjacency-layouts.png",
  "zoom-dpr.png",
  "dense-accepted-scene.png",
  "ui-112x130.png",
] as const;

interface Recipe {
  readonly id: string;
  readonly output: string;
  readonly seed: number;
  readonly requestSize: { readonly width: number; readonly height: number };
  readonly outputSize: { readonly width: number; readonly height: number };
  readonly prompt: string;
  readonly negativePrompt: string;
  readonly postprocess?: string;
  readonly styleReference?: string;
}

interface RecordEntry {
  readonly status: string;
  readonly jobId?: string;
  readonly candidate?: string;
  readonly candidateSha256?: string;
  readonly providerOutputSha256?: string;
  readonly outputSha256?: string;
  readonly alphaBounds?: {
    readonly left: number;
    readonly top: number;
    readonly right: number;
    readonly bottom: number;
  };
  readonly rejectedAttempts?: readonly unknown[];
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
const available = ids.filter((id) =>
  ["CANDIDATE", "ACCEPTED"].includes(generated.records[id]?.status ?? ""),
);

if (available.length === 0)
  throw new Error("No Ruleset 7 Farm candidate is available");
await mkdir(reviewRoot, { recursive: true });
await sourceSheet();
if (available.length === 3) {
  await layoutSheet();
  await zoomDprSheet();
  await denseSheet();
}
await uiSheet();
if (ids.every((id) => generated.records[id]?.status === "ACCEPTED"))
  await writeEvidence();
else
  console.log(
    `Ruleset 7 Farm candidate evidence ready: ${path.relative(root, reviewRoot)} (${available.join(", ")})`,
  );

function fileFor(id: (typeof ids)[number]): string {
  const recipe = recipes.get(id);
  const record = generated.records[id];
  if (recipe === undefined || record === undefined)
    throw new Error(`Missing Farm recipe or record: ${id}`);
  return path.join(
    root,
    record.status === "ACCEPTED"
      ? recipe.output
      : required(record.candidate, `${id} candidate`),
  );
}

async function sourceSheet(): Promise<void> {
  const width = 1760;
  const rowHeight = 430;
  const overlays: OverlayOptions[] = [
    {
      input: heading(
        "RULESET 7 FARM · SOURCE / ENLARGED / NATIVE / MINIMUM",
        width,
      ),
      left: 0,
      top: 8,
    },
  ];
  for (const [row, id] of available.entries()) {
    const recipe = required(recipes.get(id), `${id} recipe`);
    const record = required(generated.records[id], `${id} record`);
    const top = 68 + row * rowHeight;
    overlays.push({ input: label(id, 420), left: 10, top });
    overlays.push({ input: checker(360, 300), left: 20, top: top + 42 });
    overlays.push({
      input: await contain(fileFor(id), 340, 280),
      left: 30,
      top: top + 52,
    });
    overlays.push({ input: checker(520, 300), left: 400, top: top + 42 });
    overlays.push({
      input: await contain(fileFor(id), 500, 280, true),
      left: 410,
      top: top + 52,
    });
    overlays.push({
      input: await mapContext(id, 1, 1, true),
      left: 950,
      top: top + 42,
    });
    overlays.push({
      input: await mapContext(id, 0.625, 1, false),
      left: 1310,
      top: top + 42,
    });
    overlays.push({
      input: caption(
        `${record.status} · ${recipe.requestSize.width}×${recipe.requestSize.height} · seed ${recipe.seed}\nalpha ${record.alphaBounds?.left},${record.alphaBounds?.top}..${record.alphaBounds?.right},${record.alphaBounds?.bottom} · ${record.candidateSha256?.slice(0, 12) ?? record.outputSha256?.slice(0, 12)}`,
        410,
      ),
      left: 20,
      top: top + 350,
    });
  }
  await render(
    width,
    88 + rowHeight * available.length,
    overlays,
    artifacts[0],
  );
}

async function layoutSheet(): Promise<void> {
  const layouts = [
    ["ISOLATED", [[2, 2]]],
    [
      "HORIZONTAL",
      [
        [1, 2],
        [2, 2],
      ],
    ],
    [
      "VERTICAL",
      [
        [2, 1],
        [2, 2],
      ],
    ],
    [
      "L",
      [
        [1, 1],
        [2, 1],
        [1, 2],
      ],
    ],
    [
      "T",
      [
        [1, 1],
        [2, 1],
        [3, 1],
        [2, 2],
      ],
    ],
    [
      "2×2",
      [
        [1, 1],
        [2, 1],
        [1, 2],
        [2, 2],
      ],
    ],
    [
      "LONG ODD",
      [
        [0, 2],
        [1, 2],
        [2, 2],
        [3, 2],
        [4, 2],
      ],
    ],
  ] as const;
  const width = 2040;
  const overlays: OverlayOptions[] = [
    {
      input: heading("PAIR + SINGLE LAYOUTS · CANONICAL (y,x), E/S/W/N", width),
      left: 0,
      top: 8,
    },
  ];
  for (const [index, [name, cells]] of layouts.entries()) {
    const column = index % 4;
    const row = Math.floor(index / 4);
    overlays.push({
      input: label(name, 500),
      left: 10 + column * 505,
      top: 60 + row * 570,
    });
    overlays.push({
      input: await cluster(cells),
      left: 10 + column * 505,
      top: 104 + row * 570,
    });
  }
  await render(width, 1210, overlays, artifacts[1]);
}

async function zoomDprSheet(): Promise<void> {
  const settings = [
    [0.625, 1],
    [1, 1],
    [1.75, 1],
    [0.625, 2],
    [1, 2],
    [1.75, 2],
  ] as const;
  const width = 2800;
  const overlays: OverlayOptions[] = [
    {
      input: heading(
        "SINGLE / HORIZONTAL / VERTICAL · 0.625×–1.75× · DPR1/2",
        width,
      ),
      left: 0,
      top: 8,
    },
  ];
  for (const [index, [zoom, dpr]] of settings.entries()) {
    const column = index % 3;
    const row = Math.floor(index / 3);
    overlays.push({
      input: label(`${zoom}× · DPR${dpr}`, 600),
      left: 10 + column * 930,
      top: 60 + row * 950,
    });
    overlays.push({
      input: await zoomPanel(zoom, dpr),
      left: 10 + column * 930,
      top: 104 + row * 950,
    });
  }
  await render(width, 2000, overlays, artifacts[2]);
}

async function denseSheet(): Promise<void> {
  const cell = 112;
  const width = cell * 7;
  const top = 48;
  const overlays: OverlayOptions[] = [
    {
      input: heading(
        "DENSE SCENE · ACCEPTED FOREST / CITY · FARM + ROAD",
        width,
      ),
      left: 0,
      top: 0,
    },
  ];
  for (let y = 0; y < 5; y += 1)
    for (let x = 0; x < 7; x += 1)
      overlays.push({
        input: await terrain(cell, x + y),
        left: x * cell,
        top: top + y * cell,
      });
  await placeLayout(
    overlays,
    [
      [1, 1],
      [2, 1],
      [1, 2],
      [2, 2],
      [3, 2],
    ],
    cell,
    top,
  );
  overlays.push({ input: await road(cell), left: cell, top: top + cell });
  overlays.push({ input: await unit(cell), left: cell, top: top + cell });
  overlays.push({
    input: await acceptedForest(cell),
    left: 5 * cell,
    top: top + Math.round(cell * 0.5),
  });
  overlays.push({
    input: await acceptedCity(cell),
    left: 5 * cell,
    top: top + 3 * cell,
  });
  overlays.push({
    input: await unit(cell),
    left: 5 * cell,
    top: top + 3 * cell,
  });
  await render(width, top + cell * 5, overlays, artifacts[3]);
}

async function uiSheet(): Promise<void> {
  const id = "building-ruleset7-farm-single";
  if (!available.includes(id)) return;
  const width = 1180;
  const overlays: OverlayOptions[] = [
    {
      input: heading("V7 SINGLE FARM IDENTITY · EXACT 112×130 VIEWPORT", width),
      left: 0,
      top: 8,
    },
  ];
  for (const [index, theme] of ["LIGHT", "DARK", "HIGH CONTRAST"].entries()) {
    overlays.push({
      input: label(theme, 360),
      left: 20 + index * 380,
      top: 66,
    });
    overlays.push({
      input: await viewport(theme),
      left: 144 + index * 380,
      top: 116,
    });
    overlays.push({
      input: caption(
        "Farming technology\nBuild Farm action\nFarm identity",
        300,
      ),
      left: 50 + index * 380,
      top: 270,
    });
  }
  await render(width, 420, overlays, artifacts[4]);
}

async function mapContext(
  id: (typeof ids)[number],
  zoom: number,
  dpr: number,
  occupied: boolean,
): Promise<Buffer> {
  const cell = Math.round(128 * zoom * dpr);
  const cssWidth = Math.round((cell * 3) / dpr);
  const cssHeight = Math.round((cell * 3) / dpr);
  const overlays: OverlayOptions[] = [];
  for (let y = 0; y < 3; y += 1)
    for (let x = 0; x < 3; x += 1)
      overlays.push({
        input: await terrain(cell, x + y),
        left: x * cell,
        top: y * cell,
      });
  const cells: readonly (readonly [number, number])[] =
    id === ids[0]
      ? [[1, 1]]
      : id === ids[1]
        ? [
            [0, 1],
            [1, 1],
          ]
        : [
            [1, 0],
            [1, 1],
          ];
  await placeLayout(overlays, cells, cell);
  if (occupied) {
    overlays.push({ input: await road(cell), left: cell, top: cell });
    overlays.push({ input: await unit(cell), left: cell, top: cell });
  }
  const rendered = await sharp({
    create: {
      width: cell * 3,
      height: cell * 3,
      channels: 4,
      background: "#203332",
    },
  })
    .composite(overlays)
    .png()
    .toBuffer();
  return dpr === 1
    ? rendered
    : sharp(rendered)
        .resize(cssWidth, cssHeight, { kernel: sharp.kernel.lanczos3 })
        .png()
        .toBuffer();
}

async function cluster(
  cells: readonly (readonly [number, number])[],
): Promise<Buffer> {
  const cell = 80;
  const overlays: OverlayOptions[] = [];
  for (let y = 0; y < 5; y += 1)
    for (let x = 0; x < 5; x += 1)
      overlays.push({
        input: await terrain(cell, x + y),
        left: x * cell,
        top: y * cell,
      });
  await placeLayout(overlays, cells, cell);
  overlays.push({ input: await road(cell), left: 0, top: 0 });
  return sharp({
    create: {
      width: cell * 5,
      height: cell * 5,
      channels: 4,
      background: "#203332",
    },
  })
    .composite(overlays)
    .png()
    .toBuffer();
}

async function zoomPanel(zoom: number, dpr: number): Promise<Buffer> {
  const cell = Math.round(128 * zoom * dpr);
  const cells = [
    [0, 0],
    [2, 0],
    [3, 0],
    [0, 2],
    [0, 3],
  ] as const;
  const overlays: OverlayOptions[] = [];
  for (let x = 0; x < 4; x += 1)
    for (let y = 0; y < 4; y += 1)
      overlays.push({
        input: await terrain(cell, x + y),
        left: x * cell,
        top: y * cell,
      });
  await placeLayout(overlays, cells, cell);
  overlays.push({ input: await road(cell), left: cell * 2, top: 0 });
  overlays.push({ input: await unit(cell), left: cell * 2, top: 0 });
  const rendered = await sharp({
    create: {
      width: cell * 4,
      height: cell * 4,
      channels: 4,
      background: "#203332",
    },
  })
    .composite(overlays)
    .png()
    .toBuffer();
  return dpr === 1
    ? rendered
    : sharp(rendered)
        .resize(Math.round(cell * 2), Math.round(cell * 2), {
          kernel: sharp.kernel.lanczos3,
        })
        .png()
        .toBuffer();
}

async function placeLayout(
  overlays: OverlayOptions[],
  cells: readonly (readonly [number, number])[],
  cell: number,
  offsetTop = 0,
): Promise<void> {
  const keys = new Set(cells.map(([x, y]) => `${x},${y}`));
  const paired = new Set<string>();
  for (const [x, y] of [...cells].sort(
    (a, b) => (a[1] ?? 0) - (b[1] ?? 0) || (a[0] ?? 0) - (b[0] ?? 0),
  )) {
    const key = `${x},${y}`;
    if (paired.has(key)) continue;
    const partner = [
      [x + 1, y],
      [x, y + 1],
      [x - 1, y],
      [x, y - 1],
    ].find(([nx, ny]) => keys.has(`${nx},${ny}`) && !paired.has(`${nx},${ny}`));
    if (partner === undefined) {
      overlays.push({
        input: await farmCell("single", cell),
        left: (x ?? 0) * cell,
        top: offsetTop + (y ?? 0) * cell,
      });
      continue;
    }
    paired.add(key);
    paired.add(`${partner[0]},${partner[1]}`);
    const horizontal = partner[1] === y;
    const first = horizontal
      ? Math.min(x ?? 0, partner[0] ?? 0)
      : Math.min(y ?? 0, partner[1] ?? 0);
    for (const [px, py] of [[x, y], partner]) {
      const side = horizontal
        ? (px ?? 0) === first
          ? "horizontal-left"
          : "horizontal-right"
        : (py ?? 0) === first
          ? "vertical-top"
          : "vertical-bottom";
      overlays.push({
        input: await farmCell(side, cell),
        left: (px ?? 0) * cell,
        top: offsetTop + (py ?? 0) * cell,
      });
    }
  }
}

async function farmCell(
  kind:
    | "single"
    | "horizontal-left"
    | "horizontal-right"
    | "vertical-top"
    | "vertical-bottom",
  size: number,
): Promise<Buffer> {
  if (kind === "single")
    return sharp(fileFor(ids[0])).resize(size, size).png().toBuffer();
  const horizontal = kind.startsWith("horizontal");
  const id = horizontal ? ids[1] : ids[2];
  const extract = horizontal
    ? { left: kind.endsWith("left") ? 0 : 256, top: 0, width: 256, height: 256 }
    : { left: 0, top: kind.endsWith("top") ? 0 : 256, width: 256, height: 256 };
  return sharp(fileFor(id))
    .extract(extract)
    .resize(size, size)
    .png()
    .toBuffer();
}

async function terrain(size: number, variant: number): Promise<Buffer> {
  return sharp(
    path.join(
      root,
      `public/assets/pixellab/terrain-square/original-grass-${(variant % 4) + 1}.png`,
    ),
  )
    .resize(size, size)
    .png()
    .toBuffer();
}

async function road(size: number): Promise<Buffer> {
  return sharp(
    path.join(
      root,
      "public/assets/pixellab/terrain-square/road-masks/road-mask-0101.png",
    ),
  )
    .resize(size, size)
    .png()
    .toBuffer();
}

async function acceptedForest(size: number): Promise<Buffer> {
  return sharp(
    path.join(
      root,
      "public/assets/pixellab/terrain-square/original-forest-1.png",
    ),
  )
    .resize(size, Math.round(size * 1.5))
    .png()
    .toBuffer();
}

async function acceptedCity(size: number): Promise<Buffer> {
  const display = Math.round(size * 0.9);
  return sharp(path.join(root, "public/assets/pixellab/buildings/city-2.png"))
    .resize(display, display)
    .extend({
      top: Math.round(size * 0.05),
      bottom: Math.max(0, size - display - Math.round(size * 0.05)),
      left: Math.round(size * 0.05),
      right: Math.max(0, size - display - Math.round(size * 0.05)),
      background: "#00000000",
    })
    .png()
    .toBuffer();
}

async function unit(size: number): Promise<Buffer> {
  const sprite = await sharp(
    path.join(root, "public/assets/pixellab/units/warrior.png"),
  )
    .resize(Math.round(size * 0.5), Math.round((size * 74) / 128))
    .png()
    .toBuffer();
  return sharp({
    create: { width: size, height: size, channels: 4, background: "#00000000" },
  })
    .composite([
      {
        input: sprite,
        left: Math.round(size * 0.25),
        top: Math.round(size * 0.18),
      },
    ])
    .png()
    .toBuffer();
}

async function viewport(theme: string): Promise<Buffer> {
  const background =
    theme === "LIGHT" ? "#fff8df" : theme === "DARK" ? "#142827" : "#000000";
  const border = theme === "HIGH CONTRAST" ? "#ffffff" : "#f7e8bd";
  const image = await sharp(fileFor(ids[0])).resize(104, 104).png().toBuffer();
  return sharp({ create: { width: 112, height: 130, channels: 4, background } })
    .composite([
      { input: image, left: 4, top: 13 },
      {
        input: Buffer.from(
          `<svg width="112" height="130" xmlns="http://www.w3.org/2000/svg"><rect x="1.5" y="1.5" width="109" height="127" rx="8" fill="none" stroke="${border}" stroke-width="3"/></svg>`,
        ),
        left: 0,
        top: 0,
      },
    ])
    .png()
    .toBuffer();
}

async function contain(
  file: string,
  width: number,
  height: number,
  nearest = false,
): Promise<Buffer> {
  return sharp(file)
    .resize({
      width,
      height,
      fit: "contain",
      kernel: nearest ? sharp.kernel.nearest : sharp.kernel.lanczos3,
      background: "#00000000",
    })
    .png()
    .toBuffer();
}

function checker(width: number, height: number): Buffer {
  return Buffer.from(
    `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><defs><pattern id="c" width="24" height="24" patternUnits="userSpaceOnUse"><rect width="24" height="24" fill="#d8d0be"/><path d="M0 0h12v12H0zm12 12h12v12H12z" fill="#eee8dc"/></pattern></defs><rect width="100%" height="100%" fill="url(#c)"/></svg>`,
  );
}

function heading(text: string, width: number): Buffer {
  return Buffer.from(
    `<svg width="${width}" height="48" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="48" fill="#142827"/><text x="${width / 2}" y="32" text-anchor="middle" font-family="sans-serif" font-size="24" font-weight="700" fill="#fff1c9">${text}</text></svg>`,
  );
}

function label(text: string, width: number): Buffer {
  return Buffer.from(
    `<svg width="${width}" height="40" xmlns="http://www.w3.org/2000/svg"><text x="8" y="28" font-family="sans-serif" font-size="20" font-weight="700" fill="#fff1c9">${text}</text></svg>`,
  );
}

function caption(text: string, width: number): Buffer {
  const lines = text.split("\n");
  return Buffer.from(
    `<svg width="${width}" height="72" xmlns="http://www.w3.org/2000/svg">${lines.map((line, index) => `<text x="8" y="${22 + index * 22}" font-family="monospace" font-size="15" fill="#d7e7df">${line}</text>`).join("")}</svg>`,
  );
}

async function render(
  width: number,
  height: number,
  overlays: OverlayOptions[],
  name: string,
): Promise<void> {
  await sharp({ create: { width, height, channels: 4, background: "#203332" } })
    .composite(overlays)
    .png({ compressionLevel: 9 })
    .toFile(path.join(reviewRoot, name));
}

async function writeEvidence(): Promise<void> {
  const evidence = [];
  for (const name of artifacts) {
    const data = await readFile(path.join(reviewRoot, name));
    evidence.push({
      path: `art/pixellab/reviews/ruleset7-farms/${name}`,
      sha256: hash(data),
      bytes: data.byteLength,
    });
  }
  await writeFile(
    path.join(reviewRoot, "review-evidence.json"),
    `${JSON.stringify({ schemaVersion: 1, assets: ids.map((id) => ({ id, recipe: recipes.get(id), record: generated.records[id] })), pairing: { algorithm: "canonical-greedy-farm-pair-v7", coordinateOrder: "(y,x)", neighborTieBreak: ["EAST", "SOUTH", "WEST", "NORTH"], semantics: "revealed same-city cardinal Farms only; pair source cropped independently per authoritative cell" }, evidence }, null, 2)}\n`,
  );
}

function hash(data: Buffer): string {
  return createHash("sha256").update(data).digest("hex");
}

function required<T>(value: T | undefined, label: string): T {
  if (value === undefined) throw new Error(`Missing ${label}`);
  return value;
}
