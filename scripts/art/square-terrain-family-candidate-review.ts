import { createHash } from "node:crypto";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import sharp, { type OverlayOptions } from "sharp";

interface Recipe {
  readonly id: string;
  readonly output: string;
  readonly outputSize: { readonly width: number; readonly height: number };
  readonly anchor: { readonly x: number; readonly y: number };
}

interface RecordEntry {
  readonly status: string;
  readonly candidate?: string;
}

const root = process.cwd();
const faction = optionalOption("--faction") ?? "original";
if (!["original", "candy"].includes(faction))
  throw new Error("--faction must be original or candy");
const family = requiredOption("--family");
if (!["grass", "forest", "mountain"].includes(family))
  throw new Error("--family must be grass, forest, or mountain");
const variants = family === "mountain" ? [2, 3] : [2, 3, 4];
const ids = variants.map(
  (variant) => `terrain-square-${faction}-${family}-${variant}`,
);
if (ids.length > 3)
  throw new Error("Candidate review may include at most three assets");
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
for (const id of ids)
  if (!generatableFile(id)) throw new Error(`Candidate missing: ${id}`);

const reviewRoot = path.join(
  root,
  `art/pixellab/reviews/square-${faction}-terrain`,
);
await mkdir(reviewRoot, { recursive: true });
const overlays: OverlayOptions[] = [];
for (const [index, id] of ids.entries()) {
  const file = generatableFile(id);
  if (file === null) throw new Error(`Candidate missing: ${id}`);
  const sourcePreview = await sharp(file)
    .resize({
      width: 256,
      height: 384,
      fit: "contain",
      background: "#00000000",
    })
    .png()
    .toBuffer();
  const native = await display(id, 1);
  const enlarged = await sharp(file)
    .resize({
      width: 384,
      height: 576,
      fit: "contain",
      background: "#00000000",
      kernel: sharp.kernel.nearest,
    })
    .png()
    .toBuffer();
  const left = index * 460;
  overlays.push({
    input: label(
      `${family}-${variants[index]}`,
      hash(await readFile(file)),
      460,
    ),
    left,
    top: 8,
  });
  overlays.push({ input: checker(272, 400), left: left + 8, top: 62 });
  overlays.push({ input: sourcePreview, left: left + 16, top: 70 });
  overlays.push({ input: checker(152, 208), left: left + 292, top: 62 });
  overlays.push({
    input: native,
    left: left + 304,
    top: family === "grass" ? 100 : 70,
  });
  overlays.push({ input: checker(408, 594), left: left + 24, top: 480 });
  overlays.push({ input: enlarged, left: left + 36, top: 490 });
}

const gridLeft = 40;
const gridTop = 1160;
const tile = 80;
overlays.push({
  input: label(
    `${family.toUpperCase()} · 8×8 deterministic candidate mix`,
    "",
    640,
  ),
  left: gridLeft,
  top: gridTop - 60,
});
for (let y = 0; y < 8; y += 1) {
  for (let x = 0; x < 8; x += 1) {
    const id = ids[(x * 17 + y * 31 + x * y * 7) % ids.length];
    if (id === undefined) throw new Error("Empty family");
    const recipe = requiredRecipe(id);
    overlays.push({
      input: await display(id, 0.625),
      left: gridLeft + x * tile,
      top: gridTop + y * tile - Math.round(recipe.anchor.y * 0.3125),
    });
  }
}

const sameLeft = 760;
overlays.push({
  input: label(`${family.toUpperCase()} · same/different adjacency`, "", 600),
  left: sameLeft,
  top: gridTop - 60,
});
for (let y = 0; y < 2; y += 1) {
  for (let x = 0; x < 4; x += 1) {
    const id = y === 0 ? ids[0] : ids[(x * 2 + 1) % ids.length];
    if (id === undefined) throw new Error("Empty family");
    const recipe = requiredRecipe(id);
    overlays.push({
      input: await display(id, 1),
      left: sameLeft + 40 + x * 128,
      top: gridTop + 120 + y * 180 - Math.round(recipe.anchor.y * 0.5),
    });
  }
}

await sharp({
  create: {
    width: Math.max(1380, ids.length * 460),
    height: 1870,
    channels: 4,
    background: "#203936",
  },
})
  .composite(overlays)
  .png({ compressionLevel: 9, adaptiveFiltering: false })
  .toFile(path.join(reviewRoot, `family-batch-${family}.png`));

async function display(id: string, zoom: number): Promise<Buffer> {
  const recipe = requiredRecipe(id);
  const file = generatableFile(id);
  if (file === null) throw new Error(`Candidate missing: ${id}`);
  return sharp(file)
    .resize(
      Math.round(recipe.outputSize.width * 0.5 * zoom),
      Math.round(recipe.outputSize.height * 0.5 * zoom),
      { fit: "fill" },
    )
    .png()
    .toBuffer();
}

function requiredRecipe(id: string): Recipe {
  const recipe = recipes.get(id);
  if (recipe === undefined) throw new Error(`Recipe missing: ${id}`);
  return recipe;
}

function generatableFile(id: string): string | null {
  const recipe = recipes.get(id);
  const record = generated.records[id];
  if (recipe === undefined || record === undefined) return null;
  if (record.status === "CANDIDATE" && record.candidate)
    return path.join(root, record.candidate);
  if (record.status === "ACCEPTED") return path.join(root, recipe.output);
  return null;
}

function requiredOption(name: string): string {
  const value = optionalOption(name);
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

function optionalOption(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index < 0 ? undefined : process.argv[index + 1];
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

function label(title: string, subtitle: string, width: number): Buffer {
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="54"><text x="${width / 2}" y="22" text-anchor="middle" font-family="sans-serif" font-size="16" font-weight="700" fill="#fff7e7">${title}</text><text x="${width / 2}" y="42" text-anchor="middle" font-family="monospace" font-size="11" fill="#b8d1ca">${subtitle.slice(0, 16)}</text></svg>`,
  );
}

function hash(data: Buffer): string {
  return createHash("sha256").update(data).digest("hex");
}
