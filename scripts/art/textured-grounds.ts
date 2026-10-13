/**
 * EXPERIMENT: fully textured grounds (bead pulp_wars-2yc.48, second round;
 * docs/art/TEXTURED_GROUNDS.md).
 *
 *   npx tsx scripts/art/textured-grounds.ts plan
 *       writes the forced palettes, the subjects and the batch manifest of
 *       the exploration run from scripts/art/textured-grounds/candidates.ts
 *
 * The fields are generated and recorded by the chibi pipeline:
 *
 *   node node_modules/.bin/tsx scripts/art/chibi-pipeline.ts \
 *     generate --exploration art/explorations/textured-grounds-2026-10 --ids <recipe>
 *
 * Only that command calls PixelLab; it reads the key from the
 * `PIXELLAB_API_KEY` environment variable. The rest is code:
 *
 *   npx tsx scripts/art/textured-grounds.ts contact <out.png> <recipe>...
 *   npx tsx scripts/art/textured-grounds.ts quilt <look> <out.png>
 *       a look (scripts/art/textured-grounds/looks.ts) quilted from its
 *       fields, as a field of 8 x 6 cells and its corner at 3x
 *   npx tsx scripts/art/textured-grounds.ts sheet <FACTION> <out.png> [--ref main]
 *   npx tsx scripts/art/textured-grounds.ts bake
 *       writes the texture of each look marked `best` where the board's
 *       `?textured-grounds=1` switch loads it
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import sharp, { type OverlayOptions } from "sharp";
import type { RgbaRaster } from "./chibi/owner-mask";
import { encodePng, readRaster, sha256 } from "./chibi/pipeline";
import { groundAt } from "./faction-grounds";
import {
  groundField,
  groundSheet,
  worldField,
  type GroundPanel,
} from "./faction-grounds/sheet";
import {
  scatter,
  scatterMotifs,
  type ScatterRecipe,
} from "./textured-grounds/compose";
import {
  TEXTURED_LOOKS,
  swapped,
  texturedWorldPath,
  type TexturedLook,
} from "./textured-grounds/looks";
import {
  busyness,
  paint,
  paletteIndices,
  quilt,
  type QuiltSource,
} from "./textured-grounds/quilt";
import {
  TEXTURED_BEAD,
  TEXTURED_CANDIDATES,
  TEXTURED_FIELD,
  TEXTURED_RUN,
  TEXTURED_RUN_FACTION,
  texturedFieldPath,
  texturedPalettePath,
  texturedSubjectKey,
  type TexturedFaction,
} from "./textured-grounds/candidates";

function hex(colour: string): readonly [number, number, number] {
  return [1, 3, 5].map((at) =>
    Number.parseInt(colour.slice(at, at + 2), 16),
  ) as unknown as readonly [number, number, number];
}

/** Bands of equal height, one per colour, like every forced palette. */
async function palettePng(colours: readonly string[]): Promise<Buffer> {
  const size = 64;
  const data = new Uint8Array(size * size * 4);
  const band = size / colours.length;
  for (let y = 0; y < size; y += 1) {
    const [r, g, b] = hex(
      colours[Math.min(colours.length - 1, Math.floor(y / band))] ?? "#000000",
    );
    for (let x = 0; x < size; x += 1)
      data.set([r, g, b, 255], (y * size + x) * 4);
  }
  return encodePng({ width: size, height: size, data });
}

const FACTION_DOCUMENT = `# Faction fragment: ${TEXTURED_RUN_FACTION} (exploration copy)

**Status:** TEST ONLY. The fields of the textured-ground experiment of bead
\`${TEXTURED_BEAD}\` (see
[TEXTURED_GROUNDS.md](../../../docs/art/TEXTURED_GROUNDS.md)). The
\`terrain\` class skips the faction layer, so each subject line names its
own materials. It is not a faction and never produces production art by
itself.

## Prompt fragment

\`\`\`text
Faction: none. Each subject names its own materials and colours.
\`\`\`

## Negative fragment

\`\`\`text
people, character, soldier, flag, banner
\`\`\`
`;

/** The run's own style and class: a painted texture, not a flat swatch. */
const STYLE =
  "Style: hand-painted pixel art terrain texture for the adventure map of a classic 1990s fantasy strategy game: rich and soft, many close tones of the same few hues, gentle shading, no outlines.\n";
const STYLE_NEGATIVE =
  "photorealism, blur, text, letters, numbers, logo, UI, frame, black outlines, thick outlines, cartoon outlines, neon, oversaturated\n";
const CLASS =
  "Class: one dense ground texture that covers the whole image from edge to edge with the same material everywhere, evenly lit, with no focal object, nothing tall and no large empty flat area. The texture continues past all four edges of the image.\n";
const CLASS_NEGATIVE =
  "border, frame, vignette, dark corners, light spot, lighting gradient, perspective, horizon, tile edge, square island, scene, landscape, clearing, single big object, flat empty background\n";

/** Pixflux options of every field unless a candidate names its own. */
const OPTIONS = {
  shading: "medium shading",
  detail: "medium detail",
  outline: "lineless",
} as const;

async function plan(root: string): Promise<void> {
  const run = path.join(root, TEXTURED_RUN);
  await mkdir(path.join(run, "fragments"), { recursive: true });
  const subjects: Record<string, string> = {};
  const assets: unknown[] = [];
  const recipes: unknown[] = [];
  for (const candidate of TEXTURED_CANDIDATES) {
    const paletteFile = texturedPalettePath(candidate);
    const bytes = await palettePng(candidate.palette);
    await writeFile(path.join(root, paletteFile), bytes);
    const key = texturedSubjectKey(candidate);
    subjects[key] = candidate.subject;
    assets.push({
      id: `chibi-textured-${candidate.id}`,
      subject: "TERRAIN:GRASS",
      assetClass: "TERRAIN",
      recipeClass: "terrain",
      canvas: { width: 80, height: 80 },
      subjectKey: key,
    });
    recipes.push({
      id: candidate.id,
      asset: `chibi-textured-${candidate.id}`,
      endpoint: "create-image-pixflux",
      seed: candidate.seed,
      requestSize: {
        width: candidate.size ?? TEXTURED_FIELD,
        height: candidate.size ?? TEXTURED_FIELD,
      },
      options: candidate.options ?? OPTIONS,
      colorImage: { path: paletteFile, sha256: sha256(bytes) },
      negativeAddendum: candidate.negative,
      notes: `${candidate.faction}, ${candidate.label}. ${candidate.notes}`,
    });
  }
  await writeFile(path.join(run, "faction.md"), FACTION_DOCUMENT);
  await writeFile(path.join(run, "fragments", "style.txt"), STYLE);
  await writeFile(
    path.join(run, "fragments", "style.negative.txt"),
    STYLE_NEGATIVE,
  );
  await writeFile(path.join(run, "fragments", "class-terrain.txt"), CLASS);
  await writeFile(
    path.join(run, "fragments", "class-terrain.negative.txt"),
    CLASS_NEGATIVE,
  );
  await writeFile(
    path.join(run, "subjects.json"),
    `${JSON.stringify(
      {
        faction: TEXTURED_RUN_FACTION,
        note: `Subject layer of the textured-ground fields of bead ${TEXTURED_BEAD} (docs/art/TEXTURED_GROUNDS.md), written by scripts/art/textured-grounds.ts plan. Exploration only.`,
        subjects,
      },
      null,
      2,
    )}\n`,
  );
  await writeFile(
    path.join(run, "batch.json"),
    `${JSON.stringify(
      {
        schemaVersion: 1,
        batch: "textured-grounds",
        title:
          "Textured grounds: PixelLab fields whose whole surface is the material, for a ground sampled by world coordinates (experiment, never registered)",
        bead: TEXTURED_BEAD,
        faction: TEXTURED_RUN_FACTION,
        dryRun: false,
        assets,
        recipes,
      },
      null,
      2,
    )}\n`,
  );
  console.log(`wrote ${TEXTURED_RUN}: ${recipes.length} recipes`);
}

/** Raw fields of the run side by side, enlarged, under their recipe ids. */
async function contact(
  root: string,
  out: string,
  ids: readonly string[],
): Promise<void> {
  const size = 480;
  const gap = 10;
  const label = 22;
  const perRow = Math.min(4, ids.length);
  const rows = Math.ceil(ids.length / perRow);
  const layers: OverlayOptions[] = [];
  for (const [index, id] of ids.entries()) {
    const left = (index % perRow) * (size + gap);
    const top = Math.floor(index / perRow) * (size + label + gap);
    layers.push({
      input: Buffer.from(
        `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${label}"><text x="4" y="16" font-family="Helvetica, Arial, sans-serif" font-size="14" font-weight="700" fill="#f2f0e8">${id}</text></svg>`,
      ),
      left,
      top,
    });
    layers.push({
      input: await sharp(path.join(root, texturedFieldPath(id)))
        .resize(size, size, { kernel: "nearest" })
        .png()
        .toBuffer(),
      left,
      top: top + label,
    });
  }
  await mkdir(path.dirname(path.resolve(out)), { recursive: true });
  await sharp({
    create: {
      width: perRow * (size + gap) - gap,
      height: rows * (size + label + gap) - gap,
      channels: 4,
      background: { r: 22, g: 24, b: 28, alpha: 1 },
    },
  })
    .composite(layers)
    .png()
    .toFile(out);
  console.log(`wrote ${out}`);
}

const CELL = 80;

function option(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index < 0 ? undefined : process.argv[index + 1];
}

export interface TexturedGround {
  /** `WORLD`: the periodic texture. */
  readonly world?: RgbaRaster;
  /** `TILES`: the tiles. */
  readonly tiles?: readonly RgbaRaster[];
  /** The share of neighbouring pixel pairs that differ, of 100. */
  readonly busy: number;
  /** Mean luma and its spread, of 100. */
  readonly luma: number;
  readonly spread: number;
}

function tone(rasters: readonly RgbaRaster[]): {
  luma: number;
  spread: number;
} {
  let sum = 0;
  let squares = 0;
  let count = 0;
  for (const raster of rasters)
    for (let at = 0; at < raster.data.length; at += 4) {
      const value =
        0.299 * (raster.data[at] ?? 0) +
        0.587 * (raster.data[at + 1] ?? 0) +
        0.114 * (raster.data[at + 2] ?? 0);
      sum += value;
      squares += value * value;
      count += 1;
    }
  const mean = sum / count;
  return {
    luma: Number(((mean / 255) * 100).toFixed(1)),
    spread: Number(
      ((Math.sqrt(squares / count - mean * mean) / 255) * 100).toFixed(1),
    ),
  };
}

async function fieldRaster(root: string, id: string): Promise<RgbaRaster> {
  return readRaster(await readFile(path.join(root, texturedFieldPath(id))));
}

/** A look's ground: quilted from its fields, its things strewn over it. */
export async function texturedGround(
  root: string,
  look: TexturedLook,
): Promise<TexturedGround> {
  const sources: QuiltSource[] = [];
  for (const field of look.fields) {
    const raster = await fieldRaster(root, field.id);
    const indices = paletteIndices(raster, swapped(look.from, field.swap));
    if (process.env.TEXTURED_STATS !== undefined) {
      const counts = new Array<number>(look.from.length).fill(0);
      for (const index of indices) counts[index] = (counts[index] ?? 0) + 1;
      console.log(
        `  ${field.id}: ${counts.map((count, index) => `${index} ${((count / indices.length) * 100).toFixed(0)}%`).join(", ")}`,
      );
    }
    sources.push({
      indices,
      width: raster.width,
      height: raster.height,
      regions: field.regions,
    });
  }
  const things = look.things;
  const thingFields: RgbaRaster[] = [];
  for (const field of things?.fields ?? [])
    thingFields.push(await fieldRaster(root, field.id));
  const recipe = (margin?: number): ScatterRecipe | null =>
    things === undefined
      ? null
      : {
          fields: things.fields.map((field) => ({
            from: swapped(look.from, field.swap),
            to: swapped(look.to, field.swap),
            ...(field.base === undefined ? {} : { base: field.base }),
            ...(field.ground === undefined ? {} : { ground: field.ground }),
          })),
          kinds: things.kinds,
          seed: things.seed,
          ...(things.gap === undefined ? {} : { gap: things.gap }),
          ...(margin === undefined ? {} : { margin }),
        };
  const strew = (
    canvas: RgbaRaster,
    variant: number,
    margin?: number,
  ): void => {
    const scatterRecipe = recipe(margin);
    if (scatterRecipe === null) return;
    const placed = scatter(canvas, thingFields, scatterRecipe, variant);
    if (process.env.TEXTURED_STATS !== undefined)
      console.log(
        `  placed: ${Object.entries(placed)
          .map(([kind, count]) => `${kind} ${count}`)
          .join(", ")}`,
      );
  };
  if (process.env.TEXTURED_STATS !== undefined && things !== undefined) {
    const scatterRecipe = recipe();
    if (scatterRecipe !== null)
      console.log(
        `  motifs: ${scatterMotifs(thingFields, scatterRecipe)
          .map((list, index) => `${things.kinds[index]?.id} ${list.length}`)
          .join(", ")}`,
      );
  }
  if (look.mode === "WORLD") {
    const indices = quilt(sources, look.from, look.quilt);
    const world = paint(indices, look.quilt.width, look.to);
    strew(world, 0);
    return {
      world,
      busy: Number((busyness(indices, look.quilt.width) * 100).toFixed(1)),
      ...tone([world]),
    };
  }
  // TILES: one toroidal tile gives the band every tile shares; each tile is
  // quilted again inside that band with its own seed.
  const spec = look.tiles ?? { count: 6, band: 6 };
  const first = quilt(sources, look.from, look.quilt);
  const { width, height } = look.quilt;
  const band = new Uint8Array(width * height).fill(255);
  for (let y = 0; y < height; y += 1)
    for (let x = 0; x < width; x += 1)
      if (
        x < spec.band ||
        y < spec.band ||
        x >= width - spec.band ||
        y >= height - spec.band
      )
        band[y * width + x] = first[y * width + x] ?? 0;
  const tiles: RgbaRaster[] = [];
  let busy = 0;
  for (let index = 0; index < spec.count; index += 1) {
    const indices = quilt(
      sources,
      look.from,
      { ...look.quilt, seed: look.quilt.seed + 31 * (index + 1) },
      band,
    );
    busy += busyness(indices, width);
    const tile = paint(indices, width, look.to);
    strew(tile, index, spec.band + 2);
    tiles.push(tile);
  }
  return {
    tiles,
    busy: Number(((busy / spec.count) * 100).toFixed(1)),
    ...tone(tiles),
  };
}

function panelOf(
  look: TexturedLook,
  ground: TexturedGround,
  label: string,
): GroundPanel {
  return {
    label,
    faction: look.faction,
    tiles: (ground.tiles ?? []).map((tile) => tile.data),
    ...(ground.world === undefined ? {} : { world: ground.world }),
    overlays: true,
  };
}

/** A look as a plain field of 8 x 6 cells, native and its corner at 3x. */
async function quiltCommand(
  root: string,
  id: string,
  out: string,
): Promise<void> {
  const look = TEXTURED_LOOKS.find((entry) => entry.id === id);
  if (look === undefined) throw new Error(`no look ${id}`);
  const started = Date.now();
  const ground = await texturedGround(root, look);
  console.log(
    `${id}: ${look.mode}, busy ${ground.busy}%, luma ${ground.luma}%, spread ${ground.spread}%, ${Date.now() - started} ms`,
  );
  const columns = 8;
  const rows = 6;
  const field =
    ground.world === undefined
      ? groundField(
          (ground.tiles ?? []).map((tile) => tile.data),
          columns,
          rows,
        )
      : worldField(ground.world, columns, rows);
  await mkdir(path.dirname(path.resolve(out)), { recursive: true });
  await sharp(field, {
    raw: { width: columns * CELL, height: rows * CELL, channels: 4 },
  })
    .png()
    .toFile(out);
  await sharp(out)
    .extract({ left: 0, top: 0, width: 4 * CELL, height: 3 * CELL })
    .resize(4 * CELL * 3, 3 * CELL * 3, { kernel: "nearest" })
    .toFile(out.replace(/\.png$/, "-x3.png"));
  console.log(`wrote ${out}`);
}

/**
 * The review sheet of a faction: the ground of `--ref` (default main) and
 * every textured look, each with units, a wood, a city, resources, a Road,
 * a border line and move highlights.
 */
async function sheet(
  root: string,
  faction: TexturedFaction,
  out: string,
): Promise<void> {
  const ref = option("--ref") ?? "main";
  const panels: GroundPanel[] = [
    {
      label: `${faction}  current (${ref})`,
      faction,
      tiles: await groundAt(root, faction, ref),
      overlays: true,
    },
  ];
  for (const look of TEXTURED_LOOKS) {
    if (look.faction !== faction) continue;
    const ground = await texturedGround(root, look);
    console.log(
      `${look.id}: ${look.mode}, busy ${ground.busy}%, luma ${ground.luma}%, spread ${ground.spread}%`,
    );
    panels.push(
      panelOf(
        look,
        ground,
        `${faction}  ${look.letter}: ${look.label}${look.best === true ? "  (best)" : ""}`,
      ),
    );
  }
  await mkdir(path.dirname(path.resolve(out)), { recursive: true });
  await groundSheet(root, panels, out, 2);
  console.log(`wrote ${out}`);
}

/** Writes the texture of every `WORLD` look marked `best` into the assets. */
async function bake(root: string): Promise<void> {
  for (const look of TEXTURED_LOOKS) {
    if (look.best !== true || look.mode !== "WORLD") continue;
    const ground = await texturedGround(root, look);
    if (ground.world === undefined) continue;
    const file = texturedWorldPath(look);
    await mkdir(path.dirname(path.join(root, file)), { recursive: true });
    await writeFile(path.join(root, file), await encodePng(ground.world));
    console.log(`wrote ${file}`);
  }
}

async function main(): Promise<void> {
  const root = process.cwd();
  const [command = "help", first, second] = process.argv.slice(2);
  if (command === "plan") return plan(root);
  if (command === "contact" && first !== undefined && second !== undefined)
    return contact(root, first, process.argv.slice(4));
  if (command === "quilt" && first !== undefined && second !== undefined)
    return quiltCommand(root, first, second);
  if (command === "sheet" && first !== undefined && second !== undefined)
    return sheet(root, first as TexturedFaction, second);
  if (command === "bake") return bake(root);
  throw new Error(
    "usage: textured-grounds.ts plan | contact <out.png> <recipe>... | quilt <look> <out.png> | sheet <FACTION> <out.png> [--ref main] | bake",
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url))
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "failed");
    process.exitCode = 1;
  });
