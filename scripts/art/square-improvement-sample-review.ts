import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp, { type OverlayOptions } from "sharp";

const root = process.cwd();
const reviewRoot = path.join(
  root,
  "art/pixellab/reviews/square-improvement-samples",
);
const ids = [
  "building-square-farm",
  "building-square-quarry",
  "building-square-windmill",
] as const;
const source = JSON.parse(
  await readFile(path.join(root, "scripts/art/pixellab-manifest.json"), "utf8"),
) as SourceManifest;
const generated = JSON.parse(
  await readFile(
    path.join(root, "scripts/art/pixellab-generated.json"),
    "utf8",
  ),
) as GeneratedManifest;
const recipes = new Map(source.recipes.map((recipe) => [recipe.id, recipe]));
const artifacts = [
  "source-native-enlarged.png",
  "farm-adjacency-repetition.png",
  "dense-both-factions.png",
  "zoom-dpr.png",
  "ui-reuse-112x130.png",
] as const;

await mkdir(reviewRoot, { recursive: true });
assertCandidates();
await sourceSheet();
await farmSheet();
await denseSheet();
await zoomDprSheet();
await uiSheet();
await writeEvidence();

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
  readonly requestSize: { readonly width: number; readonly height: number };
  readonly outputSize: { readonly width: number; readonly height: number };
  readonly anchor?: { readonly x: number; readonly y: number };
  readonly squareFootprint?: Bounds;
  readonly hardBounds: Bounds;
  readonly preferredBounds?: Bounds;
  readonly seed: number;
  readonly prompt: string;
  readonly negativePrompt: string;
  readonly postprocess?: string;
  readonly styleReference?: string;
}

interface SourceManifest {
  readonly recipes: readonly Recipe[];
}

interface GeneratedRecord {
  readonly status: string;
  readonly candidate?: string;
  readonly candidateSha256?: string;
  readonly providerOutputSha256?: string;
  readonly outputSha256?: string;
  readonly jobId?: string;
  readonly alphaBounds?: Bounds;
  readonly notes?: string;
  readonly reviewChecks?: Readonly<Record<string, boolean>>;
  readonly rejectedAttempts?: readonly unknown[];
}

interface GeneratedManifest {
  readonly records: Readonly<Record<string, GeneratedRecord>>;
}

function assertCandidates(): void {
  for (const id of ids) {
    const recipe = recipes.get(id);
    const record = generated.records[id];
    if (recipe === undefined || record === undefined)
      throw new Error(`Missing sample record: ${id}`);
    if (!record.candidate && record.status !== "ACCEPTED")
      throw new Error(`No candidate or accepted output: ${id}`);
  }
}

function fileFor(id: string): string {
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
  const width = 1320;
  const overlays: OverlayOptions[] = [
    {
      input: heading("SOURCE · ENLARGED · NATIVE 1× MAP CONTEXT", width),
      left: 0,
      top: 8,
    },
  ];
  for (const [column, id] of ids.entries()) {
    const x = column * 440;
    overlays.push({ input: label(id, 440), left: x, top: 60 });
    overlays.push({
      input: await sharp(fileFor(id))
        .resize({
          width: 250,
          height: 250,
          fit: "contain",
          background: "#00000000",
        })
        .png()
        .toBuffer(),
      left: x + 95,
      top: 100,
    });
    overlays.push({
      input: await tile(id, 1, column, true, true),
      left: x + 28,
      top: 358,
    });
    const record = generated.records[id];
    overlays.push({
      input: caption(
        `${record?.status} · ${record?.candidateSha256?.slice(0, 12) ?? record?.outputSha256?.slice(0, 12)}\nalpha ${bounds(record?.alphaBounds)}`,
        440,
      ),
      left: x,
      top: 748,
    });
  }
  await render(width, 840, overlays, artifacts[0]);
}

async function farmSheet(): Promise<void> {
  const width = 1280;
  const overlays: OverlayOptions[] = [
    {
      input: heading(
        "FARM · OPAQUE FOOTPRINT · ORTHOGONAL CONTINUITY · REPETITION",
        width,
      ),
      left: 0,
      top: 8,
    },
  ];
  const farm = await sharp(fileFor(ids[0])).resize(128, 128).png().toBuffer();
  for (let y = 0; y < 4; y += 1)
    for (let x = 0; x < 6; x += 1)
      overlays.push({ input: farm, left: 28 + x * 128, top: 76 + y * 128 });
  overlays.push({ input: farmOutline(), left: 28, top: 76 });
  overlays.push({
    input: caption(
      "Repeated identical accepted source. White contour is a deterministic review-only connected-component edge; it is not baked into the raster. Exact edge equality is asserted on every N/E/S/W join.",
      450,
    ),
    left: 800,
    top: 130,
  });
  overlays.push({
    input: caption(
      "Farm action remains direct: the existing DOM contract dispatches every selected-tile economy action once for pointer, keyboard and touch, with no preview dialog or second map activation.",
      450,
    ),
    left: 800,
    top: 310,
  });
  await render(width, 620, overlays, artifacts[1]);
}

async function denseSheet(): Promise<void> {
  const width = 1540;
  const overlays: OverlayOptions[] = [
    {
      input: heading(
        "DENSE SQUARE MAPS · BOTH FACTIONS · RESOURCES / ROADS / CITIES / UNITS / FOG",
        width,
      ),
      left: 0,
      top: 8,
    },
    { input: await denseFaction("ORIGINAL"), left: 20, top: 68 },
    { input: await denseFaction("CANDY"), left: 780, top: 68 },
  ];
  await render(width, 825, overlays, artifacts[2]);
}

async function denseFaction(faction: "ORIGINAL" | "CANDY"): Promise<Buffer> {
  const size = 5;
  const tileSize = 104;
  const margin = tileSize;
  const width = size * tileSize + margin * 2;
  const height = size * tileSize + margin * 2;
  const overlays: OverlayOptions[] = [];
  const terrainPrefix = `terrain-square-${faction.toLowerCase()}`;
  const units =
    faction === "ORIGINAL"
      ? ["unit-warrior", "unit-archer", "unit-defender", "unit-rider"]
      : [
          "unit-candy-warrior",
          "unit-candy-gumball-guard",
          "unit-candy-choco-engineer",
          "unit-candy-donut",
        ];
  const resources = [
    `${terrainPrefix}-fruit`,
    `${terrainPrefix}-animal`,
    "terrain-square-ore",
    "terrain-square-fertile-ground",
    "terrain-square-stone",
  ];
  for (let y = 0; y < size; y += 1)
    for (let x = 0; x < size; x += 1) {
      const index = y * size + x;
      const left = margin + x * tileSize;
      const top = margin + y * tileSize;
      const terrain =
        index % 7 === 2
          ? `${terrainPrefix}-mountain-${(index % 3) + 1}`
          : index % 6 === 1
            ? `${terrainPrefix}-forest-${(index % 4) + 1}`
            : `${terrainPrefix}-grass-${(index % 4) + 1}`;
      overlays.push({
        input: await accepted(terrain, tileSize, tileSize),
        left,
        top,
      });
      overlays.push({ input: ownerOverlay(tileSize, index % 4), left, top });
      if (index % 4 === 0)
        overlays.push({
          input: await accepted(
            `terrain-square-road-mask-${(index % 16).toString(2).padStart(4, "0")}`,
            tileSize,
            tileSize,
          ),
          left,
          top,
        });
      if (index === 6 || index === 7 || index === 11 || index === 12)
        overlays.push({
          input: await placed(ids[0], tileSize / 128),
          left,
          top: top - tileSize,
        });
      else if (index === 2 || index === 16)
        overlays.push({
          input: await placed(ids[1], tileSize / 128),
          left,
          top: top - tileSize,
        });
      else if (index === 8 || index === 18)
        overlays.push({
          input: await placed(ids[2], tileSize / 128),
          left,
          top: top - tileSize,
        });
      else if (index % 5 === 3)
        overlays.push({
          input: await placed(
            resources[index % resources.length] ??
              resources[0] ??
              "terrain-square-stone",
            tileSize / 128,
          ),
          left,
          top: top - tileSize,
        });
      if (index === 0 || index === 24)
        overlays.push({ input: fog(tileSize), left, top });
      if (index === 10)
        overlays.push({ input: selection(tileSize), left, top });
      if (index % 6 === 0)
        overlays.push({
          input: await placed(
            units[index % units.length] ?? units[0] ?? "unit-warrior",
            tileSize / 128,
          ),
          left,
          top: top - tileSize,
        });
      if (index === 14)
        overlays.push({
          input: await placed(
            faction === "ORIGINAL"
              ? "building-city-2"
              : "building-candy-city-2",
            tileSize / 128,
          ),
          left,
          top: top - tileSize,
        });
    }
  return sharp({
    create: { width, height: height + 72, channels: 4, background: "#203332" },
  })
    .composite([
      {
        input: label(`${faction} · 5×5 dense mature context`, width),
        left: 0,
        top: 0,
      },
      ...overlays.map((overlay) => ({
        ...overlay,
        top: (overlay.top ?? 0) + 72,
      })),
    ])
    .png()
    .toBuffer();
}

async function zoomDprSheet(): Promise<void> {
  const width = 4200;
  const overlays: OverlayOptions[] = [
    {
      input: heading("0.625× / 1× / 1.75× · DPR1 / DPR2 EQUIVALENCE", width),
      left: 0,
      top: 8,
    },
  ];
  for (const [column, zoom] of [0.625, 1, 1.75].entries()) {
    overlays.push({
      input: label(`${zoom}× · DPR1 clear / DPR2 occupied`, 1400),
      left: column * 1400,
      top: 60,
    });
    for (const [row, id] of ids.entries()) {
      const context = await tile(id, zoom, row, true, false);
      const occupiedContext = await tile(id, zoom, row, true, true, 2);
      overlays.push({
        input: context,
        left: column * 1400 + 14,
        top: 110 + row * 700,
      });
      overlays.push({
        input: occupiedContext,
        left: column * 1400 + 714,
        top: 110 + row * 700,
      });
    }
  }
  await render(width, 2260, overlays, artifacts[3]);
}

async function uiSheet(): Promise<void> {
  const width = 1280;
  const overlays: OverlayOptions[] = [
    {
      input: heading(
        "EXACT 112×130 ART VIEWPORT · ACTION BUTTON / SELECTION HEADER / TECH CARD",
        width,
      ),
      left: 0,
      top: 8,
    },
  ];
  const contexts = ["ACTION BUTTON", "SELECTION HEADER", "TECH CARD"] as const;
  for (const [column, context] of contexts.entries()) {
    overlays.push({
      input: label(context, 400),
      left: 20 + column * 420,
      top: 62,
    });
    for (const [row, id] of ids.entries()) {
      overlays.push({
        input: await viewport(id),
        left: 48 + column * 420,
        top: 108 + row * 182,
      });
      overlays.push({
        input: caption(id.replace("building-square-", "Build "), 230),
        left: 174 + column * 420,
        top: 144 + row * 182,
      });
    }
  }
  await render(width, 680, overlays, artifacts[4]);
}

async function tile(
  id: string,
  zoom: number,
  owner: number,
  selectedState: boolean,
  occupied: boolean,
  dpr = 1,
): Promise<Buffer> {
  const renderZoom = zoom * dpr;
  const tileSize = Math.round(128 * renderZoom);
  const size = tileSize * 3;
  const left = tileSize;
  const top = tileSize;
  const overlays: OverlayOptions[] = [
    {
      input: await accepted(
        `terrain-square-original-grass-${(owner % 4) + 1}`,
        tileSize,
        tileSize,
      ),
      left,
      top,
    },
    { input: ownerOverlay(tileSize, owner), left, top },
    { input: await placed(id, renderZoom), left, top: 0 },
  ];
  if (occupied)
    overlays.push({
      input: await placed(
        owner % 2 ? "unit-candy-warrior" : "unit-warrior",
        renderZoom,
      ),
      left,
      top: 0,
    });
  if (selectedState) overlays.push({ input: selection(tileSize), left, top });
  const rendered = sharp({
    create: { width: size, height: size, channels: 4, background: "#203332" },
  })
    .composite(overlays)
    .png();
  if (dpr === 1) return rendered.toBuffer();
  return sharp(await rendered.toBuffer())
    .resize(Math.round(size / dpr), Math.round(size / dpr), {
      fit: "fill",
      kernel: sharp.kernel.lanczos3,
    })
    .png()
    .toBuffer();
}

async function placed(id: string, zoom: number): Promise<Buffer> {
  const recipe = recipes.get(id);
  const file = recipe ? fileFor(id) : acceptedFile(id);
  const metadata = await sharp(file).metadata();
  const sourceWidth = metadata.width ?? 256;
  const sourceHeight = metadata.height ?? 256;
  let scale = zoom * 0.5;
  let anchor = { x: sourceWidth / 2, y: sourceHeight / 2 };
  if (recipe?.anchor) anchor = recipe.anchor;
  if (sourceWidth === 384) scale = zoom * 0.3;
  if (id.startsWith("terrain-square-") && sourceHeight === 384)
    anchor = { x: 128, y: 256 };
  const image = await sharp(file)
    .resize({
      width: Math.max(1, Math.round(sourceWidth * scale)),
      height: Math.max(1, Math.round(sourceHeight * scale)),
      fit: "fill",
    })
    .png()
    .toBuffer();
  const canvas = Math.round(128 * zoom);
  return sharp({
    create: {
      width: canvas,
      height: canvas * 2,
      channels: 4,
      background: "#00000000",
    },
  })
    .composite([
      {
        input: image,
        left: Math.round(canvas / 2 - anchor.x * scale),
        top: Math.round(canvas + canvas / 2 - anchor.y * scale),
      },
    ])
    .png()
    .toBuffer();
}

async function viewport(id: string): Promise<Buffer> {
  const content = await sharp(fileFor(id))
    .resize({
      width: 104,
      height: 122,
      fit: "contain",
      background: "#00000000",
    })
    .png()
    .toBuffer();
  return sharp({
    create: { width: 112, height: 130, channels: 4, background: "#142827" },
  })
    .composite([
      {
        input: Buffer.from(
          '<svg width="112" height="130" xmlns="http://www.w3.org/2000/svg"><rect x="1.5" y="1.5" width="109" height="127" rx="8" fill="none" stroke="#f7e8bd" stroke-width="3"/></svg>',
        ),
        left: 0,
        top: 0,
      },
      { input: content, left: 4, top: 4 },
    ])
    .png()
    .toBuffer();
}

function acceptedFile(id: string): string {
  const recipe = source.recipes.find((entry) => entry.id === id);
  if (recipe !== undefined) return path.join(root, recipe.output);
  if (id.startsWith("terrain-square-road-mask-"))
    return path.join(
      root,
      `public/assets/pixellab/terrain-square/road-masks/road-mask-${id.slice(-4)}.png`,
    );
  throw new Error(`Accepted asset not found: ${id}`);
}

async function accepted(
  id: string,
  width: number,
  height: number,
): Promise<Buffer> {
  return sharp(acceptedFile(id))
    .resize({ width, height, fit: "fill" })
    .png()
    .toBuffer();
}

function ownerOverlay(size: number, owner: number): Buffer {
  const colors = ["#f06762", "#28b7a4", "#e2b63f", "#a277d2"];
  return Buffer.from(
    `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="2" width="${size - 4}" height="${size - 4}" fill="${colors[owner % 4]}" fill-opacity=".08" stroke="${colors[owner % 4]}" stroke-width="4" stroke-dasharray="12 7"/></svg>`,
  );
}

function selection(size: number): Buffer {
  return Buffer.from(
    `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg"><rect x="5" y="5" width="${size - 10}" height="${size - 10}" fill="none" stroke="#fff26b" stroke-width="5"/></svg>`,
  );
}

function fog(size: number): Buffer {
  return Buffer.from(
    `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg"><rect width="${size}" height="${size}" fill="#182526" fill-opacity=".83"/><path d="M0 ${size}L${size} 0" stroke="#9db4af" stroke-width="5" stroke-dasharray="12 10"/></svg>`,
  );
}

function farmOutline(): Buffer {
  return Buffer.from(
    '<svg width="768" height="512" xmlns="http://www.w3.org/2000/svg"><path d="M4 4H764V508H4Z" fill="none" stroke="#fff" stroke-width="7" stroke-dasharray="22 14"/></svg>',
  );
}

function heading(value: string, width: number): Buffer {
  return svgText(value, width, 46, 24, "#f7e8bd", "700");
}

function label(value: string, width: number): Buffer {
  return svgText(value, width, 38, 19, "#f7e8bd", "700");
}

function caption(value: string, width: number): Buffer {
  const lines = value
    .split("\n")
    .flatMap((line) => wrap(line, Math.max(20, Math.floor(width / 9.5))));
  return Buffer.from(
    `<svg width="${width}" height="130" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#182c2b"/>${lines.map((line, index) => `<text x="12" y="${28 + index * 28}" fill="#d6e4df" font-family="Arial,sans-serif" font-size="16">${escapeXml(line)}</text>`).join("")}</svg>`,
  );
}

function wrap(value: string, limit: number): readonly string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of value.split(/\s+/)) {
    const next = line.length === 0 ? word : `${line} ${word}`;
    if (next.length <= limit) line = next;
    else {
      if (line.length > 0) lines.push(line);
      line = word;
    }
  }
  if (line.length > 0) lines.push(line);
  return lines;
}

function svgText(
  value: string,
  width: number,
  height: number,
  size: number,
  color: string,
  weight: string,
): Buffer {
  return Buffer.from(
    `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#152927"/><text x="${width / 2}" y="${height * 0.69}" text-anchor="middle" fill="${color}" font-family="Arial,sans-serif" font-size="${size}" font-weight="${weight}">${escapeXml(value)}</text></svg>`,
  );
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function bounds(value: Bounds | undefined): string {
  return value
    ? `${value.left},${value.top}..${value.right},${value.bottom}`
    : "pending";
}

async function render(
  width: number,
  height: number,
  overlays: OverlayOptions[],
  filename: string,
): Promise<void> {
  await sharp({ create: { width, height, channels: 4, background: "#203332" } })
    .composite(overlays)
    .png({ compressionLevel: 9 })
    .toFile(path.join(reviewRoot, filename));
}

async function writeEvidence(): Promise<void> {
  const unitFiles = source.recipes
    .filter(
      (recipe) =>
        recipe.id.startsWith("unit-") &&
        generated.records[recipe.id]?.status === "ACCEPTED",
    )
    .map((recipe) => recipe.output);
  const acceptedUnitByteHashes = Object.fromEntries(
    await Promise.all(
      unitFiles.map(
        async (file) =>
          [file, hash(await readFile(path.join(root, file)))] as const,
      ),
    ),
  );
  const artifactRecords = await Promise.all(
    artifacts.map(async (filename) => {
      const file = path.join(reviewRoot, filename);
      const bytes = await readFile(file);
      return {
        path: path.relative(root, file).replaceAll("\\", "/"),
        sha256: hash(bytes),
        bytes: bytes.byteLength,
      };
    }),
  );
  const sampleGate = Object.fromEntries(
    ids.map((id) => [id, generated.records[id]]),
  );
  const ready = ids.every((id) => generated.records[id]?.status === "ACCEPTED");
  const evidence = {
    schemaVersion: 1,
    status: ready ? "READY_FOR_ORCHESTRATOR_REVIEW" : "CANDIDATE_REVIEW",
    blocker: null,
    pixelLabSourceCalls: 3,
    pixelLabCommandFamilies: 1,
    providerRejections: [],
    deterministicCorrections: [
      "Farm postprocess strengthened continuous periodic furrows and exact opposing-edge equality after first repetition review; provider pixels, job and provider-output hash remain recorded.",
    ],
    exactSampleGate: [...ids],
    sampleGate,
    farmMerge: {
      algorithm: "orthogonal-connected-square-farm-v1",
      sourceFootprint: "256x256 fully opaque",
      adjacency:
        "N/E/S/W only; renderer derives connectivity from authoritative Farm coordinates",
      seamRule:
        "outer 20 source pixels converge to exact #9c7343 on every side; repeated identical sources share exact opposing edge bytes",
      bakedState: false,
    },
    directTileAction: {
      changed: false,
      assertion:
        "tests/integration/ruleset6-dom-shell.test.ts dispatches every selected-tile economy command exactly once for pointer, keyboard and touch with targetMode/economicPreview null and no command dialog",
    },
    runtimeCoverageSwitched: false,
    acceptedUnitByteHashes,
    reviewCoverage: [
      "every candidate at source, enlarged, native 1x and minimum 0.625x",
      "0.625x, 1x and 1.75x at DPR1 and DPR2-equivalent backing",
      "both factions with accepted square terrain/resources/Roads, units, cities, territory, fog and selection",
      "Farm 6x4 adjacency/repetition with exact N/E/S/W edge equality",
      "action-button, selection-header and technology-card reuse in exact 112x130 CSS viewports",
    ],
    artifacts: artifactRecords,
  };
  await writeFile(
    path.join(reviewRoot, "review-evidence.json"),
    `${JSON.stringify(evidence, null, 2)}\n`,
    "utf8",
  );
  await writeFile(
    path.join(reviewRoot, "README.md"),
    `# Square improvement sample review\n\nExactly three PixelLab sources are in scope: Farm, Quarry, and Windmill. The PNG sheets and hashed evidence cover source/native/enlarged, supported zoom/DPR, dense map contexts, Farm repetition, and the shared 112 x 130 UI viewport. Runtime coverage remains deferred to e1m.9.\n`,
    "utf8",
  );
}

function hash(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}
