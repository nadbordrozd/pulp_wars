import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp, { type OverlayOptions } from "sharp";

const root = process.cwd();
const reviewRoot = path.join(
  root,
  "art/pixellab/reviews/square-civic-commerce",
);
const ids = [
  "building-square-workshop",
  "building-square-grand-works",
  "building-square-market",
] as const;
const artifacts = [
  "source-native-enlarged.png",
  "values-contributors-both-factions.png",
  "mature-3x3-both-factions.png",
  "mature-5x5-cross-city.png",
  "zoom-dpr-overlays.png",
  "ui-reuse-112x130.png",
] as const;

interface Bounds {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly empty?: boolean;
}

interface Recipe {
  readonly id: string;
  readonly output: string;
  readonly seed: number;
  readonly requestSize: { readonly width: number; readonly height: number };
  readonly outputSize: { readonly width: number; readonly height: number };
  readonly anchor?: { readonly x: number; readonly y: number };
  readonly hardBounds: Bounds;
  readonly preferredBounds?: Bounds;
  readonly fitBounds?: Bounds;
  readonly groundContactY?: number;
  readonly postprocess?: string;
  readonly styleReference?: string;
  readonly prompt: string;
  readonly negativePrompt: string;
}

interface GeneratedRecord {
  readonly status: string;
  readonly candidate?: string;
  readonly candidateSha256?: string;
  readonly providerOutputSha256?: string;
  readonly outputSha256?: string;
  readonly jobId?: string;
  readonly alphaBounds?: Bounds;
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
) as { readonly records: Readonly<Record<string, GeneratedRecord>> };
const recipes = new Map(source.recipes.map((recipe) => [recipe.id, recipe]));

await mkdir(reviewRoot, { recursive: true });
assertAvailable();
await sourceSheet();
await valuesSheet();
await matureSheet(3, artifacts[2]);
await matureSheet(5, artifacts[3]);
await zoomSheet();
await uiSheet();
if (ids.every((id) => generated.records[id]?.status === "ACCEPTED"))
  await writeEvidence();
else
  console.log(
    `Candidate evidence ready at ${path.relative(root, reviewRoot)}; accept/reject decisions remain required.`,
  );

function assertAvailable(): void {
  for (const id of ids) {
    const recipe = recipes.get(id);
    const record = generated.records[id];
    if (recipe === undefined || record === undefined)
      throw new Error(`Missing square civic/commerce source: ${id}`);
    if (record.status !== "ACCEPTED" && record.candidate === undefined)
      throw new Error(`No reviewable candidate: ${id}`);
  }
}

function fileFor(id: (typeof ids)[number]): string {
  const recipe = recipes.get(id);
  const record = generated.records[id];
  if (recipe === undefined || record === undefined)
    throw new Error(`Unknown asset: ${id}`);
  return path.join(
    root,
    record.status === "ACCEPTED"
      ? recipe.output
      : (record.candidate ?? recipe.output),
  );
}

async function sourceSheet(): Promise<void> {
  const width = 1560;
  const overlays: OverlayOptions[] = [
    {
      input: heading(
        "SQUARE CIVIC + COMMERCE · SOURCE / ENLARGED / NATIVE 1×",
        width,
      ),
      left: 0,
      top: 8,
    },
  ];
  for (const [column, id] of ids.entries()) {
    const left = column * 520;
    const record = generated.records[id];
    overlays.push({ input: label(id, 500), left: left + 10, top: 66 });
    overlays.push({ input: checker(330, 330), left: left + 20, top: 108 });
    overlays.push({
      input: await sharp(fileFor(id))
        .resize(320, 320, { fit: "contain" })
        .png()
        .toBuffer(),
      left: left + 25,
      top: 113,
    });
    overlays.push({
      input: await scene(id, "ORIGINAL", {
        contributors: id.endsWith("grand-works") ? 4 : 4,
        value: id.endsWith("grand-works") ? 8 : 4,
        roadBonus: id.endsWith("market"),
        selected: true,
        unit: true,
      }),
      left: left + 362,
      top: 190,
    });
    overlays.push({
      input: caption(
        `${record?.status} · ${record?.candidateSha256?.slice(0, 12) ?? record?.outputSha256?.slice(0, 12)} · alpha ${bounds(record?.alphaBounds)}`,
        500,
      ),
      left: left + 10,
      top: 460,
    });
  }
  await render(width, 565, overlays, artifacts[0]);
}

async function valuesSheet(): Promise<void> {
  const width = 1940;
  const overlays: OverlayOptions[] = [
    {
      input: heading(
        "BOTH FACTIONS · DISTINCT CONTRIBUTORS / FAMILIES · EXACT LIVE SQUARES",
        width,
      ),
      left: 0,
      top: 8,
    },
  ];
  const states = [
    {
      id: ids[0],
      values: [0, 1, 2, 3, 4].map((value) => ({
        contributors: value,
        value,
        roadBonus: false,
      })),
      note: "Workshop distinct-basic contributors and population squares 0..4",
    },
    {
      id: ids[1],
      values: [
        { contributors: 3, value: 6, roadBonus: false },
        { contributors: 4, value: 8, roadBonus: false },
      ],
      note: "Grand Works three/four advanced processors and exact +6/+8 squares",
    },
    {
      id: ids[2],
      values: [0, 1, 2, 3, 4]
        .map((value) => ({
          contributors: value,
          value,
          roadBonus: false,
        }))
        .concat([{ contributors: 4, value: 5, roadBonus: true }]),
      note: "Market distinct-family income 0..4; capital-Road bonus reaches 5",
    },
  ] as const;
  for (const [row, state] of states.entries()) {
    const top = 72 + row * 430;
    overlays.push({ input: label(state.id, 250), left: 10, top });
    overlays.push({ input: caption(state.note, 250), left: 10, top: top + 44 });
    for (const [factionIndex, faction] of (
      ["ORIGINAL", "CANDY"] as const
    ).entries()) {
      const groupLeft = 276 + factionIndex * 824;
      overlays.push({ input: label(faction, 800), left: groupLeft, top });
      for (const [index, value] of state.values.entries()) {
        overlays.push({
          input: await scene(state.id, faction, {
            ...value,
            selected: index % 2 === 1,
            unit: index === state.values.length - 1,
          }),
          left: groupLeft + index * 132,
          top: top + 42,
        });
        overlays.push({
          input: smallLabel(
            value.roadBonus
              ? `${value.contributors}+ROAD→${value.value}`
              : `${value.contributors}→${value.value}`,
          ),
          left: groupLeft + index * 132,
          top: top + 238,
        });
      }
    }
  }
  await render(width, 1365, overlays, artifacts[1]);
}

async function scene(
  id: (typeof ids)[number],
  faction: "ORIGINAL" | "CANDY",
  state: {
    readonly contributors: number;
    readonly value: number;
    readonly roadBonus: boolean;
    readonly selected?: boolean;
    readonly unit?: boolean;
  },
): Promise<Buffer> {
  const overlays: OverlayOptions[] = [
    {
      input: await terrain(faction, "grass", 2, 128, 128),
      left: 0,
      top: 64,
    },
    { input: ownerOverlay(faction, 128), left: 0, top: 64 },
  ];
  if (state.roadBonus)
    overlays.push({
      input: await publicImage(
        "terrain-square/road-masks/road-mask-1111.png",
        128,
        128,
      ),
      left: 0,
      top: 64,
    });
  overlays.push({
    input: contributorMarks(
      state.contributors,
      id.endsWith("market") ? "FAMILY" : "CONTRIBUTOR",
      state.roadBonus,
    ),
    left: 0,
    top: 64,
  });
  overlays.push({
    input: await sharp(fileFor(id)).resize(115, 115).png().toBuffer(),
    left: 7,
    top: 42,
  });
  if (state.unit)
    overlays.push({
      input: await publicImage(
        `units/${faction === "ORIGINAL" ? "warrior" : "candy-warrior"}.png`,
        64,
        74,
      ),
      left: 32,
      top: 84,
    });
  overlays.push({ input: liveSquares(state.value), left: 91, top: 151 });
  if (state.selected)
    overlays.push({ input: selectionOverlay(128), left: 0, top: 64 });
  return sharp({
    create: { width: 128, height: 192, channels: 4, background: "#d7cab4ff" },
  })
    .composite(overlays)
    .png()
    .toBuffer();
}

async function matureSheet(
  size: 3 | 5,
  artifact: (typeof artifacts)[2] | (typeof artifacts)[3],
): Promise<void> {
  const panelWidth = size * 96 + 120;
  const width = panelWidth * 2 + 40;
  const overlays: OverlayOptions[] = [
    {
      input: heading(
        size === 3
          ? "MATURE 3×3 · WORKSHOP FOUR BASICS · CITY / UNIT / ROAD / FOG"
          : "MATURE 5×5 CROSS-CITY · GRAND WORKS + MARKET / ROAD / TERRITORY",
        width,
      ),
      left: 0,
      top: 8,
    },
  ];
  for (const [index, faction] of (["ORIGINAL", "CANDY"] as const).entries())
    overlays.push({
      input: await matureGrid(size, faction),
      left: 20 + index * panelWidth,
      top: 70,
    });
  await render(width, size * 96 + 230, overlays, artifact);
}

async function matureGrid(
  size: 3 | 5,
  faction: "ORIGINAL" | "CANDY",
): Promise<Buffer> {
  const cell = 96;
  const topMargin = 72;
  const width = size * cell;
  const overlays: OverlayOptions[] = [
    { input: label(`${faction} · ${size}×${size}`, width), left: 0, top: 0 },
  ];
  for (let y = 0; y < size; y += 1)
    for (let x = 0; x < size; x += 1) {
      const index = y * size + x;
      const left = x * cell;
      const top = topMargin + y * cell;
      overlays.push({
        input: await terrain(faction, "grass", (index % 4) + 1, cell, cell),
        left,
        top,
      });
      overlays.push({
        input: territoryCell(cell, x < Math.ceil(size / 2) ? 0 : 1),
        left,
        top,
      });
      if (y === Math.floor(size / 2))
        overlays.push({
          input: await publicImage(
            "terrain-square/road-masks/road-mask-0101.png",
            cell,
            cell,
          ),
          left,
          top,
        });
      if ((x === 0 && y === 0) || (x === size - 1 && y === size - 1))
        overlays.push({ input: fog(cell), left, top });
    }
  if (size === 3) {
    const resource = faction === "ORIGINAL" ? "original-fruit" : "candy-fruit";
    overlays.push({
      input: await publicImage(
        `terrain-square/${resource}.png`,
        cell,
        Math.round(cell * 1.5),
      ),
      left: 0,
      top: topMargin + 2 * cell - Math.round(cell * 0.5),
    });
    const basics = ["farm", "lumber-camp", "mine", "quarry"] as const;
    const positions = [
      [1, 0],
      [2, 1],
      [1, 2],
      [0, 1],
    ] as const;
    for (const [index, name] of basics.entries()) {
      const position = positions[index];
      if (position === undefined) continue;
      await placeBuilding(
        overlays,
        name,
        position[0],
        position[1],
        cell,
        topMargin,
      );
    }
    overlays.push({
      input: contributorMarks(4, "CONTRIBUTOR", false),
      left: cell,
      top: topMargin + cell,
    });
    await placeBuilding(overlays, "workshop", 1, 1, cell, topMargin, true);
    overlays.push({
      input: liveSquares(4),
      left: cell + 67,
      top: topMargin + cell + 65,
    });
    overlays.push({
      input: selectionOverlay(cell),
      left: cell,
      top: topMargin + cell,
    });
    const city = faction === "ORIGINAL" ? "city-2" : "candy-city-2";
    overlays.push({
      input: await publicImage(`buildings/${city}.png`, 82, 82),
      left: 2 * cell + 7,
      top: topMargin + 7,
    });
  } else {
    const resource = faction === "ORIGINAL" ? "original-fruit" : "candy-fruit";
    overlays.push({
      input: await publicImage(
        `terrain-square/${resource}.png`,
        cell,
        Math.round(cell * 1.5),
      ),
      left: 3 * cell,
      top: topMargin - Math.round(cell * 0.5),
    });
    for (const [name, x, y] of [
      ["windmill", 2, 1],
      ["sawmill", 3, 2],
      ["forge", 2, 3],
      ["stoneworks", 1, 2],
    ] as const)
      await placeBuilding(overlays, name, x, y, cell, topMargin);
    overlays.push({
      input: contributorMarks(4, "CONTRIBUTOR", false),
      left: 2 * cell,
      top: topMargin + 2 * cell,
    });
    await placeBuilding(overlays, "grand-works", 2, 2, cell, topMargin, true);
    overlays.push({
      input: liveSquares(8),
      left: 2 * cell + 67,
      top: topMargin + 2 * cell + 65,
    });
    overlays.push({
      input: contributorMarks(4, "FAMILY", true),
      left: 0,
      top: topMargin + 2 * cell,
    });
    await placeBuilding(overlays, "market", 0, 2, cell, topMargin, true);
    overlays.push({
      input: liveSquares(5),
      left: 67,
      top: topMargin + 2 * cell + 65,
    });
    await placeBuilding(overlays, "farm", 0, 1, cell, topMargin);
    await placeBuilding(overlays, "mine", 0, 3, cell, topMargin);
    await placeBuilding(overlays, "quarry", 1, 3, cell, topMargin);
    const city = faction === "ORIGINAL" ? "city-2" : "candy-city-2";
    overlays.push({
      input: await publicImage(`buildings/${city}.png`, 86, 86),
      left: 4 * cell + 5,
      top: topMargin + 2 * cell + 5,
    });
    const neighboringCity = faction === "ORIGINAL" ? "city-1" : "candy-city-1";
    overlays.push({
      input: await publicImage(`buildings/${neighboringCity}.png`, 82, 82),
      left: 4 * cell + 7,
      top: topMargin + 7,
    });
    overlays.push({
      input: selectionOverlay(cell),
      left: 2 * cell,
      top: topMargin + 2 * cell,
    });
  }
  overlays.push({
    input: await publicImage(
      `units/${faction === "ORIGINAL" ? "warrior" : "candy-warrior"}.png`,
      48,
      56,
    ),
    left: (size - 1) * cell + 24,
    top: topMargin + cell + 24,
  });
  return sharp({
    create: {
      width,
      height: topMargin + size * cell,
      channels: 4,
      background: "#d7cab4ff",
    },
  })
    .composite(overlays)
    .png()
    .toBuffer();
}

async function placeBuilding(
  overlays: OverlayOptions[],
  name: string,
  x: number,
  y: number,
  cell: number,
  topMargin: number,
  current = false,
): Promise<void> {
  const id = `building-square-${name}` as (typeof ids)[number];
  const file = current
    ? fileFor(id)
    : path.join(root, `public/assets/pixellab/buildings-square/${name}.png`);
  const tall = [
    "windmill",
    "sawmill",
    "forge",
    "stoneworks",
    "workshop",
    "grand-works",
    "market",
  ].includes(name);
  const square = name === "farm";
  overlays.push({
    input: await sharp(file)
      .resize(square ? cell : tall ? 86 : cell, square ? cell : tall ? 86 : 111)
      .png()
      .toBuffer(),
    left: x * cell + (tall ? 5 : 0),
    top: topMargin + y * cell + (square ? 0 : tall ? -5 : -15),
  });
}

async function zoomSheet(): Promise<void> {
  const width = 1860;
  const overlays: OverlayOptions[] = [
    {
      input: heading(
        "MIN / 1× / MAX ZOOM · DPR1/2 · UNIT / ROAD / RESOURCE / OWNERSHIP / SELECTION",
        width,
      ),
      left: 0,
      top: 8,
    },
  ];
  const configurations = [
    [0.625, 1],
    [1, 1],
    [1.75, 1],
    [0.625, 2],
    [1, 2],
    [1.75, 2],
  ] as const;
  for (const [row, [zoom, dpr]] of configurations.entries()) {
    const top = 66 + row * 370;
    overlays.push({ input: label(`${zoom}× DPR${dpr}`, 160), left: 8, top });
    for (const [column, id] of ids.entries()) {
      overlays.push({
        input: await zoomPanel(
          id,
          zoom,
          dpr,
          column % 2 ? "CANDY" : "ORIGINAL",
        ),
        left: 182 + column * 550,
        top,
      });
    }
  }
  await render(width, 2300, overlays, artifacts[4]);
}

async function zoomPanel(
  id: (typeof ids)[number],
  zoom: number,
  dpr: number,
  faction: "ORIGINAL" | "CANDY",
): Promise<Buffer> {
  const state = {
    contributors: id.endsWith("grand-works") ? 4 : 4,
    value: id.endsWith("grand-works") ? 8 : id.endsWith("market") ? 5 : 4,
    roadBonus: id.endsWith("market"),
    selected: true,
    unit: true,
  };
  const base = await scene(id, faction, state);
  const scaled = await sharp(base)
    .resize(Math.round(128 * zoom * dpr), Math.round(192 * zoom * dpr))
    .png()
    .toBuffer();
  const css =
    dpr === 1
      ? scaled
      : await sharp(scaled)
          .resize(Math.round(128 * zoom), Math.round(192 * zoom))
          .png()
          .toBuffer();
  return sharp({
    create: { width: 520, height: 350, channels: 4, background: "#eef1e8ff" },
  })
    .composite([
      { input: css, left: 18, top: 12 },
      {
        input: caption(
          `${id.replace("building-square-", "")} · ${Math.round(128 * zoom)}px cell · DPR${dpr} backing equivalence`,
          280,
        ),
        left: 228,
        top: 120,
      },
    ])
    .png()
    .toBuffer();
}

async function uiSheet(): Promise<void> {
  const width = 1260;
  const overlays: OverlayOptions[] = [
    {
      input: heading(
        "EXACT 112×130 SHARED RASTER VIEWPORT · ACTION / SELECTION / TECHNOLOGY",
        width,
      ),
      left: 0,
      top: 8,
    },
  ];
  for (const [row, id] of ids.entries()) {
    overlays.push({ input: label(id, 300), left: 10, top: 72 + row * 150 });
    for (const [column, use] of ["ACTION", "SELECTION", "TECH"].entries())
      overlays.push({
        input: await viewport(id, use),
        left: 340 + column * 250,
        top: 64 + row * 150,
      });
  }
  await render(width, 530, overlays, artifacts[5]);
}

async function viewport(
  id: (typeof ids)[number],
  use: string,
): Promise<Buffer> {
  const sprite = await sharp(fileFor(id))
    .resize({ width: 104, height: 120, fit: "contain" })
    .png()
    .toBuffer();
  return sharp({
    create: { width: 112, height: 130, channels: 4, background: "#eef4e8ff" },
  })
    .composite([
      { input: sprite, left: 4, top: 5 },
      { input: viewportFrame(use), left: 0, top: 0 },
    ])
    .png()
    .toBuffer();
}

async function terrain(
  faction: "ORIGINAL" | "CANDY",
  type: "grass",
  variant: number,
  width: number,
  height: number,
): Promise<Buffer> {
  return publicImage(
    `terrain-square/${faction.toLowerCase()}-${type}-${variant}.png`,
    width,
    height,
  );
}

async function publicImage(
  relative: string,
  width: number,
  height: number,
): Promise<Buffer> {
  return sharp(path.join(root, "public/assets/pixellab", relative))
    .resize(width, height)
    .png()
    .toBuffer();
}

function contributorMarks(
  count: number,
  kind: "CONTRIBUTOR" | "FAMILY",
  roadBonus: boolean,
): Buffer {
  const points = [
    [64, 8],
    [120, 64],
    [64, 120],
    [8, 64],
  ] as const;
  const colors = ["#f2c35b", "#76b8d8", "#d77c68", "#9ac66b"];
  const shapes = points.slice(0, count).map(([x, y], index) => {
    const color = kind === "FAMILY" ? colors[index] : "#f2c35b";
    return `<line x1="64" y1="64" x2="${x}" y2="${y}" stroke="${color}" stroke-width="3" stroke-dasharray="5 4"/><${index % 2 === 0 ? "rect" : "circle"} ${index % 2 === 0 ? `x="${x - 7}" y="${y - 7}" width="14" height="14" rx="2"` : `cx="${x}" cy="${y}" r="7"`} fill="${color}" stroke="#213d43" stroke-width="3"/>`;
  });
  const road = roadBonus
    ? '<path d="M64 64V4" stroke="#fff4dc" stroke-width="7"/><path d="M64 64V4" stroke="#6c6559" stroke-width="3"/><circle cx="64" cy="5" r="5" fill="#fff4dc" stroke="#213d43" stroke-width="2"/>'
    : "";
  return Buffer.from(
    `<svg width="128" height="128" xmlns="http://www.w3.org/2000/svg">${shapes.join("")}${road}</svg>`,
  );
}

function liveSquares(count: number): Buffer {
  return Buffer.from(
    `<svg width="37" height="37" xmlns="http://www.w3.org/2000/svg">${Array.from(
      { length: count },
      (_, index) =>
        `<rect x="${(index % 4) * 9}" y="${Math.floor(index / 4) * 9}" width="7" height="7" rx="1" fill="#8ef0bd" stroke="#213d43" stroke-width="1.5"/>`,
    ).join("")}</svg>`,
  );
}

function ownerOverlay(faction: "ORIGINAL" | "CANDY", size: number): Buffer {
  const color = faction === "ORIGINAL" ? "#db6b58" : "#7d69d8";
  return Buffer.from(
    `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="2" width="${size - 4}" height="${size - 4}" fill="${color}22" stroke="${color}" stroke-width="4" stroke-dasharray="10 6"/></svg>`,
  );
}

function territoryCell(size: number, city: 0 | 1): Buffer {
  const color = city === 0 ? "#db6b58" : "#53a8a0";
  return Buffer.from(
    `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="2" width="${size - 4}" height="${size - 4}" fill="${color}18" stroke="${color}" stroke-width="4" stroke-dasharray="12 7"/></svg>`,
  );
}

function selectionOverlay(size: number): Buffer {
  return Buffer.from(
    `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg"><rect x="5" y="5" width="${size - 10}" height="${size - 10}" rx="5" fill="none" stroke="#fff3a0" stroke-width="5"/><rect x="10" y="10" width="${size - 20}" height="${size - 20}" fill="none" stroke="#213d43" stroke-width="2"/></svg>`,
  );
}

function fog(size: number): Buffer {
  return Buffer.from(
    `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg"><rect width="${size}" height="${size}" fill="#172c35e8"/><path d="M0 15L${size} ${size - 15}M0 ${size / 2}L${size / 2} ${size}M${size / 3} 0L${size} ${size / 3}" stroke="#4f6870" stroke-width="8" opacity=".55"/></svg>`,
  );
}

function viewportFrame(use: string): Buffer {
  return Buffer.from(
    `<svg width="112" height="130" xmlns="http://www.w3.org/2000/svg"><rect x="1" y="1" width="110" height="128" rx="7" fill="none" stroke="#213d43" stroke-width="2"/><rect x="5" y="5" width="102" height="18" rx="4" fill="#213d43"/><text x="56" y="18" text-anchor="middle" font-family="sans-serif" font-size="10" font-weight="700" fill="#fff4dc">${use}</text></svg>`,
  );
}

function checker(width: number, height: number): Buffer {
  return Buffer.from(
    `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><defs><pattern id="c" width="24" height="24" patternUnits="userSpaceOnUse"><rect width="24" height="24" fill="#eef1e8"/><rect width="12" height="12" fill="#cbd5ca"/><rect x="12" y="12" width="12" height="12" fill="#cbd5ca"/></pattern></defs><rect width="100%" height="100%" fill="url(#c)"/></svg>`,
  );
}

function heading(text: string, width: number): Buffer {
  return Buffer.from(
    `<svg width="${width}" height="48" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="48" rx="12" fill="#213d43"/><text x="${width / 2}" y="31" text-anchor="middle" font-family="sans-serif" font-weight="700" font-size="20" fill="#fff4dc">${text}</text></svg>`,
  );
}

function label(text: string, width: number): Buffer {
  return Buffer.from(
    `<svg width="${width}" height="34" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="34" rx="8" fill="#395a60"/><text x="${width / 2}" y="23" text-anchor="middle" font-family="sans-serif" font-weight="700" font-size="15" fill="#fff4dc">${text}</text></svg>`,
  );
}

function smallLabel(text: string): Buffer {
  return Buffer.from(
    `<svg width="128" height="28" xmlns="http://www.w3.org/2000/svg"><rect width="128" height="28" rx="6" fill="#213d43"/><text x="64" y="19" text-anchor="middle" font-family="sans-serif" font-size="12" font-weight="700" fill="#fff4dc">${text}</text></svg>`,
  );
}

function caption(text: string, width: number): Buffer {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    if (`${line} ${word}`.trim().length > 40) {
      lines.push(line);
      line = word;
    } else line = `${line} ${word}`.trim();
  }
  if (line) lines.push(line);
  return Buffer.from(
    `<svg width="${width}" height="86" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="86" rx="8" fill="#fff4dce8"/>${lines
      .slice(0, 4)
      .map(
        (value, index) =>
          `<text x="12" y="${22 + index * 18}" font-family="sans-serif" font-size="13" fill="#213d43">${value}</text>`,
      )
      .join("")}</svg>`,
  );
}

function bounds(value: Bounds | undefined): string {
  return value === undefined
    ? "missing"
    : `${value.left},${value.top}..${value.right},${value.bottom}`;
}

async function render(
  width: number,
  height: number,
  overlays: readonly OverlayOptions[],
  name: string,
): Promise<void> {
  await sharp({
    create: { width, height, channels: 4, background: "#9bb49fff" },
  })
    .composite([...overlays])
    .png()
    .toFile(path.join(reviewRoot, name));
}

async function writeEvidence(): Promise<void> {
  const evidence = {
    status: "READY_FOR_ORCHESTRATOR_REVIEW",
    pixelLabFamilyRequests: 1,
    pixelLabSourceCalls: 3,
    acceptedSources: 3,
    rejectedSources: ids.reduce(
      (total, id) =>
        total + (generated.records[id]?.rejectedAttempts?.length ?? 0),
      0,
    ),
    exactFamily: {
      purpose: "square civic and commerce improvements",
      ids,
      jobs: ids.map((id) => generated.records[id]?.jobId),
    },
    providerRejections: ids.flatMap(
      (id) => generated.records[id]?.rejectedAttempts ?? [],
    ),
    acceptedAssets: Object.fromEntries(
      ids.map((id) => {
        const recipe = recipes.get(id);
        const record = generated.records[id];
        return [
          id,
          {
            seed: recipe?.seed,
            output: recipe?.output,
            jobId: record?.jobId,
            providerOutputSha256: record?.providerOutputSha256,
            outputSha256: record?.outputSha256,
            alphaBounds: record?.alphaBounds,
            styleReference: recipe?.styleReference,
          },
        ];
      }),
    ),
    economyContexts: {
      factions: ["ORIGINAL", "CANDY"],
      workshopDistinctBasicContributors: [0, 1, 2, 3, 4],
      workshopPopulationSquares: [0, 1, 2, 3, 4],
      grandWorksAdvancedProcessorContributors: [3, 4],
      grandWorksPopulationSquares: [6, 8],
      marketDistinctFamilyContributors: [0, 1, 2, 3, 4],
      marketIncomeSquares: [0, 1, 2, 3, 4],
      marketCapitalRoadBonusSquares: 5,
      marksAreCodeNative: true,
    },
    runtimeCoverageSwitched: false,
    acceptedUnitByteHashes: await unitHashes(),
    reviewCoverage: [
      "all three sources at original/native, enlarged and native 1x map scale",
      "Workshop distinct-basic contributors and exact population squares through four for both factions",
      "Grand Works three/four advanced-processor cross-city contributors and exact +6/+8 population squares",
      "Market zero-through-four distinct families plus capital-Road bonus to five with code-native marks",
      "dense mature 3x3 and expanded 5x5 cross-city contexts with cities, units, Roads, resources, territory, fog, ownership and selection",
      "0.625x, 1x and 1.75x composition at DPR1 and DPR2-equivalent backing",
      "exact 112x130 contextual-action, selection-identity and technology-card raster reuse",
      "accepted IDs/URLs registered while runtime coverage and bindings remain deferred to e1m.9",
    ],
    artifacts: await Promise.all(
      artifacts.map(async (name) => {
        const file = path.join(reviewRoot, name);
        const bytes = await readFile(file);
        return {
          path: path.relative(root, file).replaceAll("\\", "/"),
          sha256: hash(bytes),
          bytes: bytes.byteLength,
        };
      }),
    ),
  };
  await writeFile(
    path.join(reviewRoot, "review-evidence.json"),
    `${JSON.stringify(evidence, null, 2)}\n`,
  );
  await writeFile(
    path.join(reviewRoot, "README.md"),
    "# Square civic and commerce review\n\nExactly three shared PixelLab sources are accepted from one bounded family invocation: Workshop, Grand Works, and Market. The hashed evidence covers source/native/enlarged inspection, exact contributor/value states, both factions, dense mature 3 x 3 and 5 x 5 cross-city maps, all supported zoom/DPR pairs, and exact 112 x 130 UI reuse. All relationship, value, Road, ownership, selection, territory, and fog marks remain code-native; runtime coverage stays deferred to e1m.9.\n",
  );
}

async function unitHashes(): Promise<Record<string, string>> {
  const previous = JSON.parse(
    await readFile(
      path.join(
        root,
        "art/pixellab/reviews/square-extraction-processors/review-evidence.json",
      ),
      "utf8",
    ),
  ) as { readonly acceptedUnitByteHashes: Readonly<Record<string, string>> };
  return { ...previous.acceptedUnitByteHashes };
}

function hash(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}
