/**
 * The PixelLab ground fields of bead pulp_wars-2yc.48
 * (docs/art/FACTION_GRASS.md, "Grounds from PixelLab fields").
 *
 *   npx tsx scripts/art/faction-grounds.ts plan
 *       writes the forced palettes, the subjects and the batch manifest of
 *       the exploration run from scripts/art/faction-grounds/candidates.ts
 *
 * The fields themselves are generated, reviewed and recorded by the chibi
 * pipeline (docs/art/CHIBI_PIPELINE.md):
 *
 *   npm run art:chibi -- plan --exploration art/explorations/faction-grounds-2026-10
 *   node node_modules/.bin/tsx scripts/art/chibi-pipeline.ts \
 *     generate --exploration art/explorations/faction-grounds-2026-10 --ids <recipe>
 *   npm run art:chibi -- reject --exploration ... --id <recipe> --notes TEXT
 *
 *   npx tsx scripts/art/faction-grounds.ts motifs <recipe> <out.png> [--ground 1,2] [--min N]
 *       every motif of a field, numbered and enlarged, with its size,
 *       colours and place: what a look's kinds are chosen from
 *   npx tsx scripts/art/faction-grounds.ts motifs <kind> <out.png> --look ID
 *       the motifs of one kind of a look, numbered as its `skip` counts
 *   npx tsx scripts/art/faction-grounds.ts look <look> <out.png>
 *       a look as a plain tiled field, native and 3x, with what each tile
 *       holds
 *   npx tsx scripts/art/faction-grounds.ts sheet <FACTION> <out.png> [--ref main]
 *       the review sheet of a faction: the ground of `--ref` and every look
 *       of scripts/art/faction-grounds/looks.ts, with units, a wood, a
 *       city and resources on each
 *
 *   npx tsx scripts/art/faction-grounds.ts overview <out.png>
 *       the chosen and the recommended grounds side by side between the
 *       default Grass and unexplored land, and the distances of their
 *       colours
 *   npx tsx scripts/art/faction-grounds.ts contact <out.png> <recipe>...
 *       raw fields of the run side by side at 3x
 *
 * None of these makes a PixelLab call.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import sharp, { type OverlayOptions } from "sharp";
import { encodePng, readRaster, sha256 } from "./chibi/pipeline";
import type { RgbaRaster } from "./chibi/owner-mask";
import { tonedGrass } from "./faction-grass";
import { deltaE, rgbOf } from "./ice-folk-direction/colour";
import {
  deriveGroundTile,
  GROUND_CELL,
  groundBaseIndex,
  groundIndices,
  groundKindMotifs,
  groundMotifs,
  type GroundMotif,
  type GroundTileRecipe,
} from "./faction-grounds/derive";
import { GROUND_LOOKS, type GroundLook } from "./faction-grounds/looks";
import {
  groundField,
  groundSheet,
  type GroundPanel,
  type SheetFaction,
} from "./faction-grounds/sheet";
import {
  GROUND_BEAD,
  GROUND_CANDIDATES,
  GROUND_RUN,
  GROUND_RUN_FACTION,
  groundPalettePath,
  groundRecipeId,
  groundSubjectKey,
  type GroundFaction,
} from "./faction-grounds/candidates";

/** The request size of every field: twice the tile, as for the Grass. */
export const GROUND_FIELD = 160;

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
    for (let x = 0; x < size; x += 1) {
      const offset = (y * size + x) * 4;
      data[offset] = r;
      data[offset + 1] = g;
      data[offset + 2] = b;
      data[offset + 3] = 255;
    }
  }
  return encodePng({ width: size, height: size, data });
}

const FACTION_DOCUMENT = `# Faction fragment: ${GROUND_RUN_FACTION} (exploration copy)

**Status:** TEST ONLY. The ground fields of bead \`${GROUND_BEAD}\` (see
[FACTION_GRASS.md](../../../docs/art/FACTION_GRASS.md)): candidates for the
native ground of the Cultists, the Undead, the Dwarves, Candy, the Martians
and the Goblins. The \`terrain\` class skips the faction layer, so each
subject line names its own materials and colours. It is not a faction and
never produces production art by itself: a chosen field is read by
\`scripts/art/faction-grass.ts\`, which derives the board tiles from it.

## Prompt fragment

\`\`\`text
Faction: none. Each subject names its own materials and colours.
\`\`\`

## Negative fragment

\`\`\`text
people, character, soldier, flag, banner
\`\`\`
`;

/**
 * The terrain class negative without "red": the class text is the
 * production one, but a rust-red Martian ground is asked for here.
 */
const TERRAIN_NEGATIVE =
  "border, frame, hedge, outline around the image, vignette, dark corners, light spot, lighting gradient, path, road, buildings, characters, people, perspective, horizon, tile edge, square island, neon, oversaturated, scene, landscape, clearing, tree tops, canopy, mounds, anything tall, big shapes in the corners\n";

/**
 * The run's own style and class texts, since the first three fields
 * (`cult-swamp-a`, `undead-ash-a`, `dwarf-flags-a`): the production texts
 * ("a board game come to life", "terrain ground for a strategy map")
 * drew a scene with lily pads, burnt trees and a paved road in the corners
 * of the field. These ask for a texture swatch.
 */
const TEXTURE_STYLE =
  "Style: clean flat pixel art game texture: flat colours, low detail, small simple shapes, no outlines.\n";
const TEXTURE_CLASS =
  "Class: one seamless repeating ground texture swatch, the same everywhere from edge to edge, with no focal object and nothing tall: only flat ground with small low details scattered evenly over it. The texture continues past all four edges of the image.\n";

async function plan(root: string): Promise<void> {
  const run = path.join(root, GROUND_RUN);
  await mkdir(path.join(run, "fragments"), { recursive: true });
  const subjects: Record<string, string> = {};
  const assets: unknown[] = [];
  const recipes: unknown[] = [];
  for (const candidate of GROUND_CANDIDATES)
    for (const recipe of candidate.recipes) {
      const id = groundRecipeId(candidate, recipe);
      const paletteFile = groundPalettePath(candidate, recipe);
      const bytes = await palettePng(recipe.palette ?? candidate.palette);
      await writeFile(path.join(root, paletteFile), bytes);
      const key = groundSubjectKey(candidate, recipe);
      subjects[key] = recipe.subject ?? candidate.subject;
      assets.push({
        id: `chibi-ground-${id}`,
        subject: "TERRAIN:GRASS",
        assetClass: "TERRAIN",
        recipeClass: "terrain",
        canvas: { width: 80, height: 80 },
        subjectKey: key,
      });
      recipes.push({
        id,
        asset: `chibi-ground-${id}`,
        endpoint: "create-image-pixflux",
        seed: recipe.seed,
        requestSize: { width: GROUND_FIELD, height: GROUND_FIELD },
        colorImage: { path: paletteFile, sha256: sha256(bytes) },
        ...(recipe.promptAddendum === undefined
          ? {}
          : { promptAddendum: recipe.promptAddendum }),
        negativeAddendum: recipe.negativeAddendum ?? candidate.negative,
        notes: `${candidate.faction}, ${candidate.label}. ${recipe.notes}`,
      });
    }
  await writeFile(path.join(run, "faction.md"), FACTION_DOCUMENT);
  await writeFile(
    path.join(run, "fragments", "class-terrain.negative.txt"),
    TERRAIN_NEGATIVE,
  );
  await writeFile(path.join(run, "fragments", "style.txt"), TEXTURE_STYLE);
  await writeFile(
    path.join(run, "fragments", "class-terrain.txt"),
    TEXTURE_CLASS,
  );
  await writeFile(
    path.join(run, "subjects.json"),
    `${JSON.stringify(
      {
        faction: GROUND_RUN_FACTION,
        note: `Subject layer of the ground fields of bead ${GROUND_BEAD} (docs/art/FACTION_GRASS.md), written by scripts/art/faction-grounds.ts plan. Exploration only.`,
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
        batch: "faction-grounds",
        title:
          "Faction grounds: PixelLab fields for the native ground of the Cultists, the Undead, the Dwarves, Candy, the Martians and the Goblins (exploration; the board tiles are derived from a chosen field by scripts/art/faction-grass.ts)",
        bead: GROUND_BEAD,
        faction: GROUND_RUN_FACTION,
        dryRun: false,
        assets,
        recipes,
      },
      null,
      2,
    )}\n`,
  );
  try {
    await readFile(path.join(run, "records.json"));
  } catch {
    // The pipeline writes the records on the first generate.
  }
  console.log(
    `wrote ${GROUND_RUN}: ${recipes.length} recipes, ${Object.keys(subjects).length} subjects`,
  );
}

function option(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index < 0 ? undefined : process.argv[index + 1];
}

/** The forced palette of a recipe of the run, base first. */
export function groundFieldPalette(recipeId: string): readonly string[] {
  for (const candidate of GROUND_CANDIDATES)
    for (const recipe of candidate.recipes)
      if (groundRecipeId(candidate, recipe) === recipeId)
        return recipe.palette ?? candidate.palette;
  throw new Error(`no ground recipe ${recipeId}`);
}

export function groundFieldPath(recipeId: string): string {
  return `${GROUND_RUN}/raw/${recipeId}.png`;
}

/** A look's whole derivation recipe, its palettes filled in. */
export function groundLookRecipe(look: GroundLook): GroundTileRecipe {
  return {
    ...look.recipe,
    fields: look.recipe.fields.map((source, index) => ({
      ...source,
      from: source.from ?? groundFieldPalette(look.fields[index] ?? ""),
    })),
  };
}

export async function groundLookFields(
  root: string,
  look: GroundLook,
): Promise<RgbaRaster[]> {
  return Promise.all(
    look.fields.map(async (id) =>
      readRaster(await readFile(path.join(root, groundFieldPath(id)))),
    ),
  );
}

/** The board tiles of a look, one per variant. */
export async function groundLookTiles(
  root: string,
  look: GroundLook,
  log?: (line: string) => void,
): Promise<RgbaRaster[]> {
  const fields = await groundLookFields(root, look);
  const recipe = groundLookRecipe(look);
  const motifs = groundKindMotifs(fields, recipe);
  log?.(
    `${look.id}: ${recipe.kinds.map((kind, index) => `${kind.id} ${motifs[index]?.length ?? 0}`).join(", ")} motifs`,
  );
  return Array.from({ length: recipe.variants }, (_, variant) => {
    const { raster, stats } = deriveGroundTile(fields, recipe, variant, motifs);
    log?.(
      `  tile ${variant + 1}: ${Object.entries(stats.placed)
        .map(([kind, count]) => `${kind} ${count}`)
        .join(", ")}; ${stats.detail}% detail`,
    );
    return raster;
  });
}

function numberLabel(text: string, width: number, height: number): Buffer {
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><text x="2" y="11" font-family="Helvetica, Arial, sans-serif" font-size="10" fill="#f2f0e8">${text}</text></svg>`,
  );
}

/**
 * Every motif of a field (or, with `--look ID --kind K`, of one kind of a
 * look, numbered as `skip` counts them), enlarged 4x on the base colour.
 */
async function motifs(root: string, id: string, out: string): Promise<void> {
  const lookId = option("--look");
  let list: GroundMotif[];
  let palette: readonly string[];
  let base: number;
  if (lookId !== undefined) {
    const look = GROUND_LOOKS.find((entry) => entry.id === lookId);
    if (look === undefined) throw new Error(`no look ${lookId}`);
    const recipe = groundLookRecipe(look);
    const kindIndex = recipe.kinds.findIndex((kind) => kind.id === id);
    const kind = recipe.kinds[kindIndex];
    if (kind === undefined) throw new Error(`no kind ${id} in ${lookId}`);
    const fields = await groundLookFields(root, look);
    list = groundKindMotifs(fields, recipe)[kindIndex] ?? [];
    const source = recipe.fields[kind.field ?? 0];
    const field = fields[kind.field ?? 0];
    if (source === undefined || field === undefined) throw new Error("field");
    palette = source.from;
    base =
      source.base ??
      groundBaseIndex(groundIndices(field, palette), palette.length);
  } else {
    const field = await readRaster(
      await readFile(path.join(root, groundFieldPath(id))),
    );
    palette = groundFieldPalette(id);
    const indices = groundIndices(field, palette);
    base = groundBaseIndex(indices, palette.length);
    const counts = new Array<number>(palette.length).fill(0);
    for (const index of indices) counts[index] = (counts[index] ?? 0) + 1;
    console.log(
      `${id}: base ${base} (${palette[base]}); pixels ${palette.map((colour, index) => `${index} ${colour} ${(((counts[index] ?? 0) / indices.length) * 100).toFixed(1)}%`).join(", ")}`,
    );
    const ground = (option("--ground") ?? "")
      .split(",")
      .filter(Boolean)
      .map(Number);
    list = groundMotifs(field, { from: palette, to: palette, ground });
  }
  const minArea = Number(option("--min") ?? 1);
  const shown = list
    .map((motif, index) => ({ motif, index }))
    .filter(({ motif }) => motif.area >= minArea);
  const scale = 4;
  const cell = 46 * scale;
  const perRow = 10;
  const rows = Math.max(1, Math.ceil(shown.length / perRow));
  const colours = palette.map((colour) =>
    [1, 3, 5].map((at) => Number.parseInt(colour.slice(at, at + 2), 16)),
  );
  const [br = 0, bg = 0, bb = 0] = colours[base] ?? [];
  const layers: OverlayOptions[] = [];
  for (const [slot, { motif, index }] of shown.entries()) {
    const left = (slot % perRow) * cell;
    const top = Math.floor(slot / perRow) * cell;
    const width = Math.min(motif.width, 44);
    const height = Math.min(motif.height, 42);
    const data = Buffer.alloc(width * height * 4);
    for (let y = 0; y < height; y += 1)
      for (let x = 0; x < width; x += 1) {
        const at = motif.pixels[y * motif.width + x] ?? 255;
        const [r = 0, g = 0, b = 0] =
          at === 255 ? [br, bg, bb] : (colours[at] ?? []);
        data.set([r, g, b, 255], (y * width + x) * 4);
      }
    layers.push({
      input: await sharp(data, { raw: { width, height, channels: 4 } })
        .resize(width * scale, height * scale, { kernel: "nearest" })
        .png()
        .toBuffer(),
      left: left + 2,
      top: top + 14,
    });
    layers.push({
      input: numberLabel(
        `${index}: ${motif.area}px ${motif.width}x${motif.height} c${motif.colours.join("")} @${motif.left},${motif.top}`,
        cell,
        14,
      ),
      left,
      top,
    });
  }
  await mkdir(path.dirname(path.resolve(out)), { recursive: true });
  await sharp({
    create: {
      width: perRow * cell,
      height: rows * cell,
      channels: 4,
      background: { r: br, g: bg, b: bb, alpha: 1 },
    },
  })
    .composite(layers)
    .png()
    .toFile(out);
  console.log(`wrote ${out}: ${shown.length} of ${list.length} motifs`);
}

/** A look as a plain tiled field, native and 3x. */
async function lookField(root: string, id: string, out: string): Promise<void> {
  const look = GROUND_LOOKS.find((entry) => entry.id === id);
  if (look === undefined) throw new Error(`no look ${id}`);
  const tiles = (
    await groundLookTiles(root, look, (line) => console.log(line))
  ).map((tile) => tile.data);
  const columns = 8;
  const rows = 6;
  await mkdir(path.dirname(path.resolve(out)), { recursive: true });
  await sharp(groundField(tiles, columns, rows), {
    raw: {
      width: columns * GROUND_CELL,
      height: rows * GROUND_CELL,
      channels: 4,
    },
  })
    .png()
    .toFile(out);
  await sharp(out)
    .extract({
      left: 0,
      top: 0,
      width: 4 * GROUND_CELL,
      height: 3 * GROUND_CELL,
    })
    .resize(4 * GROUND_CELL * 3, 3 * GROUND_CELL * 3, { kernel: "nearest" })
    .toFile(out.replace(/\.png$/, "-x3.png"));
  console.log(`wrote ${out}`);
}

/** Raw fields of the run side by side at 3x, each under its recipe id. */
async function contact(
  root: string,
  out: string,
  ids: readonly string[],
): Promise<void> {
  const scale = 3;
  const size = GROUND_FIELD * scale;
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
      input: await sharp(path.join(root, groundFieldPath(id)))
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

/**
 * The ground of a faction (or the default Grass) at a Git revision, as the
 * board draws it: its tiles, or its texture where it has one.
 */
export async function groundAt(
  root: string,
  faction: SheetFaction,
  ref: string,
): Promise<Pick<GroundPanel, "tiles" | "world">> {
  const show = (file: string): Buffer | null => {
    try {
      return execFileSync("git", ["show", `${ref}:${file}`], {
        cwd: root,
        maxBuffer: 1 << 24,
        stdio: ["ignore", "pipe", "ignore"],
      });
    } catch {
      return null;
    }
  };
  const terrain = "public/assets/chibi/terrain";
  const world = show(
    `${terrain}/faction-grass/world/chibi-${faction.toLowerCase()}-ground.png`,
  );
  if (world !== null) {
    const raster = await readRaster(world);
    return { tiles: [], world: raster };
  }
  if (faction === "ICE_FOLK") {
    // The Snow the forest bake derives: the Grass under the Snow wash.
    const snow = show("art/pixellab/faction-forests/ground/ice-folk-snow.png");
    if (snow === null) throw new Error("no Ice Folk snow tile");
    return { tiles: [new Uint8ClampedArray((await readRaster(snow)).data)] };
  }
  const tiles: Uint8ClampedArray[] = [];
  for (const index of [1, 2, 3, 4, 5, 6]) {
    const bytes = show(
      faction === "NEUTRAL"
        ? `${terrain}/chibi-grass-${index}.png`
        : faction === "UNDEAD" && index <= 3
          ? `${terrain}/faction-grass/chibi-undead-grass-${index}.png`
          : `${terrain}/faction-grass/chibi-${faction.toLowerCase()}-grass-${index}.png`,
    );
    if (bytes === null) break;
    const raster = await readRaster(bytes);
    tiles.push(
      faction === "NEUTRAL"
        ? tonedGrass(raster)
        : new Uint8ClampedArray(raster.data),
    );
  }
  if (tiles.length === 0) throw new Error(`no ground of ${faction} at ${ref}`);
  return { tiles };
}

async function sheet(
  root: string,
  faction: GroundFaction,
  out: string,
): Promise<void> {
  const ref = option("--ref") ?? "main";
  const panels: GroundPanel[] = [
    {
      label: `${faction}  current (${ref})`,
      faction,
      ...(await groundAt(root, faction, ref)),
    },
  ];
  for (const look of GROUND_LOOKS) {
    if (look.faction !== faction) continue;
    panels.push({
      label: `${faction}  ${look.letter}: ${look.label}${look.status === "CHOSEN" ? "  (chosen)" : look.status === "RUNNER_UP" ? "  (runner-up)" : look.lead === true ? "  (recommended)" : ""}`,
      faction,
      tiles: (
        await groundLookTiles(root, look, (line) => console.log(line))
      ).map((tile) => tile.data),
    });
  }
  await mkdir(path.dirname(path.resolve(out)), { recursive: true });
  await groundSheet(root, panels, out, 2);
  console.log(
    `wrote ${out}: ${panels.map((panel) => panel.label).join(" | ")}`,
  );
}

const FOG = "#685f9c";

function luma(colour: string): number {
  const [r, g, b] = hex(colour);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

/**
 * The six chosen or recommended grounds between the default Grass and the
 * colour of unexplored land, three cells wide each, with one unit of the
 * faction; and the ground colours' lightness and their CIE76 distances.
 */
async function overview(root: string, out: string): Promise<void> {
  const columns = 3;
  const rows = 4;
  const label = 24;
  const gap = 6;
  const width = columns * GROUND_CELL;
  const strip = async (
    tiles: readonly (Uint8Array | Uint8ClampedArray)[],
    index: number,
  ): Promise<Buffer> =>
    sharp(groundField(tiles, columns, rows, { x: index * 5, y: index * 3 }), {
      raw: { width, height: rows * GROUND_CELL, channels: 4 },
    })
      .png()
      .toBuffer();
  const flat = (colour: string): Uint8Array => {
    const [r, g, b] = hex(colour);
    const data = new Uint8Array(GROUND_CELL * GROUND_CELL * 4);
    for (let at = 0; at < GROUND_CELL * GROUND_CELL; at += 1)
      data.set([r, g, b, 255], at * 4);
    return data;
  };
  const grass: Uint8ClampedArray[] = [];
  for (const index of [1, 2, 3])
    grass.push(
      tonedGrass(
        await readRaster(
          await readFile(
            path.join(
              root,
              `public/assets/chibi/terrain/chibi-grass-${index}.png`,
            ),
          ),
        ),
      ),
    );
  const entries: {
    name: string;
    colour: string;
    tiles: readonly (Uint8Array | Uint8ClampedArray)[];
    unit?: string;
  }[] = [{ name: "Neutral grass", colour: "#8ab85c", tiles: grass }];
  const units: Readonly<Record<GroundFaction, string>> = {
    CULT: "direction-cult-initiate",
    UNDEAD: "direction-undead-skeleton",
    DWARF: "direction-dwarf-hammerer",
    CANDY: "direction-candy-gummy-bear",
    MARTIAN: "direction-martian-grunt",
    GOBLIN: "direction-goblin-goblin",
  };
  for (const look of GROUND_LOOKS) {
    if (look.status !== "CHOSEN" && look.lead !== true) continue;
    const recipe = groundLookRecipe(look);
    const first = recipe.fields[0];
    const field = (await groundLookFields(root, look))[0];
    if (first === undefined || field === undefined) continue;
    entries.push({
      name: `${look.faction} ${look.letter}${look.status === "CHOSEN" ? "" : " (sample)"}`,
      colour:
        recipe.ground ??
        first.to[
          first.base ??
            groundBaseIndex(groundIndices(field, first.from), first.from.length)
        ] ??
        "#000000",
      tiles: (await groundLookTiles(root, look)).map((tile) => tile.data),
      unit: units[look.faction],
    });
  }
  entries.push({ name: "Unexplored", colour: FOG, tiles: [flat(FOG)] });
  const layers: OverlayOptions[] = [];
  for (const [index, entry] of entries.entries()) {
    const left = index * (width + gap);
    layers.push({
      input: Buffer.from(
        `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${label}"><text x="2" y="17" font-family="Helvetica, Arial, sans-serif" font-size="13" font-weight="700" fill="#f2f0e8">${entry.name}</text></svg>`,
      ),
      left,
      top: 0,
    });
    layers.push({ input: await strip(entry.tiles, index), left, top: label });
    if (entry.unit !== undefined)
      layers.push({
        input: path.join(
          root,
          `public/assets/chibi/units/chibi-${entry.unit}.png`,
        ),
        left: left + GROUND_CELL + 12,
        top: label + GROUND_CELL + 4,
      });
  }
  await mkdir(path.dirname(path.resolve(out)), { recursive: true });
  const total = entries.length * (width + gap) - gap;
  await sharp({
    create: {
      width: total,
      height: label + rows * GROUND_CELL,
      channels: 4,
      background: { r: 22, g: 24, b: 28, alpha: 1 },
    },
  })
    .composite(layers)
    .png()
    .toFile(out);
  console.log(`wrote ${out}`);
  const all = [
    ...entries,
    { name: "Mountain ground", colour: "#8a8f98" },
    { name: "Shallow water", colour: "#66becc" },
    { name: "Goblin (now)", colour: "#a9ac5c" },
    { name: "Dinosaur", colour: "#5f9f58" },
    { name: "Martian (now)", colour: "#b98c6a" },
    { name: "Candy (now)", colour: "#9cd4b6" },
  ];
  for (const entry of all) {
    const nearest = all
      .filter((other) => other !== entry)
      .map((other) => ({
        name: other.name,
        distance: deltaE(rgbOf(entry.colour), rgbOf(other.colour)),
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 2)
      .map((other) => `${other.name} ${other.distance.toFixed(0)}`)
      .join(", ");
    console.log(
      `${entry.name.padEnd(20)} ${entry.colour}  luma ${(luma(entry.colour) * 100).toFixed(0)}%  fog ${deltaE(rgbOf(entry.colour), rgbOf(FOG)).toFixed(0)}  grass ${deltaE(rgbOf(entry.colour), rgbOf("#8ab85c")).toFixed(0)}  nearest: ${nearest}`,
    );
  }
}

async function main(): Promise<void> {
  const root = process.cwd();
  const [command = "help", first, second] = process.argv.slice(2);
  if (command === "plan") return plan(root);
  if (command === "motifs" && first !== undefined && second !== undefined)
    return motifs(root, first, second);
  if (command === "look" && first !== undefined && second !== undefined)
    return lookField(root, first, second);
  if (command === "sheet" && first !== undefined && second !== undefined)
    return sheet(root, first as GroundFaction, second);
  if (command === "overview" && first !== undefined)
    return overview(root, first);
  if (command === "contact" && first !== undefined && second !== undefined)
    return contact(root, first, process.argv.slice(4));
  throw new Error(
    "usage: faction-grounds.ts plan | contact <out.png> <recipe>... | motifs <recipe> <out.png> [--ground 1,2] [--min N] | motifs <kind> <out.png> --look ID | look <look> <out.png> | sheet <FACTION> <out.png> [--ref main] | overview <out.png>",
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url))
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "failed");
    process.exitCode = 1;
  });
