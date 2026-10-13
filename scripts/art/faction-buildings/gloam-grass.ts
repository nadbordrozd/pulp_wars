/**
 * The Undead territory ground as production masters (bead pulp_wars-xdh.2,
 * docs/art/FACTION_BUILDINGS.md, section 4; docs/art/FACTION_GRASS.md): the
 * three Grass masters in the colours of the burnt ground, and the two
 * Forest masters re-composited over the first of them (their recorded
 * ground is `chibi-grass-1`).
 *
 *   npx tsx scripts/art/faction-buildings/gloam-grass.ts bake
 *   npx tsx scripts/art/faction-buildings/gloam-grass.ts check
 *
 * No PixelLab call: every master is derived from a reviewed production
 * master (scripts/art/faction-grass.ts, `deriveFactionGrassTile`): the four
 * Grass colours are swapped, so the tufts, the seamless joins and the three
 * variants stay. `bake` writes the masters and `gloam-grass.json` (the
 * recipe and the hash of every source and output); `art:validate`
 * re-derives each master from its sources and fails when the bytes differ
 * (`gloamGrassProblems`). The file and its names keep "gloam" for the
 * history of the ground: the gloam (a colour swap), the ashen ground of
 * bead pulp_wars-2yc.14 (with mist, stones and a bone), and since bead
 * pulp_wars-2yc.48 the burnt ground.
 *
 * Since that bead these masters are not what the board shows of Undead
 * land: the burnt ground is a baked tile composed from PixelLab fields and
 * drawn over them (`faction-grass/chibi-undead-grass-1..6.png`). They are
 * what lies under it: with `?faction-grass=0`, and in the tile dock of a
 * plain Grass cell.
 *
 * The board tones these masters like every Grass tile (contrast 65% round
 * the Grass pivot #89b75b), so the recipe's colours are master colours: a
 * board colour c is the master colour pivot + (c - pivot) / 0.65.
 *
 * The Forest body layers are not copied: the runtime draws the ground
 * tile, a Road, and the existing `chibi-forest-N.body.png` over it.
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { encodePng, pixelSha256, readRaster, sha256 } from "../chibi/pipeline";
import { groundComposite } from "../chibi/raster";
import {
  deriveFactionGrassTile,
  fieldGroundLook,
  fieldGroundRecipe,
  type GrassRecipeColours,
} from "../faction-grass";

const TERRAIN = "public/assets/chibi/terrain";
export const GLOAM_GRASS_RECORD =
  "scripts/art/faction-buildings/gloam-grass.json";
export const GLOAM_VARIANT = "wildfire";
const GLOAM_LABEL =
  "Wildfire: the ash, soot and pale ash of the burnt ground on the Grass tufts, under the baked tiles";
/** The seed of the motif placement (the recipe has no motif now). */
const GLOAM_SEED = 14;

/** The Grass pivot of the terrain tone and its contrast (visual-direction-v7.ts). */
const PIVOT = [137, 183, 91] as const;
const CONTRAST = 0.65;

/** The master colour the terrain tone turns into this board colour. */
export function gloamMasterColour(board: string): string {
  const channels = [1, 3, 5].map((at, index) => {
    const value = Number.parseInt(board.slice(at, at + 2), 16);
    const pivot = PIVOT[index] ?? 0;
    return Math.max(
      0,
      Math.min(255, Math.round(pivot + (value - pivot) / CONTRAST)),
    );
  });
  // The tone softens a pixel whose channels are all 62 or less as an
  // outline; no colour of this ground may be one.
  if (Math.max(...channels) <= 62)
    throw new Error(`${board} is too dark for an Undead ground master`);
  return `#${channels.map((value) => value.toString(16).padStart(2, "0")).join("")}`;
}

function mix(left: string, right: string): string {
  return `#${[1, 3, 5]
    .map((at) =>
      Math.round(
        (Number.parseInt(left.slice(at, at + 2), 16) +
          Number.parseInt(right.slice(at, at + 2), 16)) /
          2,
      )
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}

/**
 * Master colours: the board colours of the burnt ground
 * (scripts/art/faction-grounds/looks.ts, the Undead look CHOSEN: its ash,
 * soot and pale ash) taken back through the terrain tone. Since bead
 * pulp_wars-2yc.48 the Undead ground the board shows is a baked tile drawn
 * over these masters (docs/art/FACTION_GRASS.md); they are what is under
 * it: the Grass tufts in the burnt ground's colours, no motif.
 */
function gloamRecipe(): GrassRecipeColours {
  const [ash, soot, , pale] =
    fieldGroundRecipe(fieldGroundLook("UNDEAD")).fields[0]?.to ?? [];
  if (ash === undefined || soot === undefined || pale === undefined)
    throw new Error("the Undead ground look has no ash, soot and pale ash");
  return {
    base: gloamMasterColour(ash),
    light: gloamMasterColour(pale),
    mid: gloamMasterColour(mix(ash, soot)),
    dark: gloamMasterColour(soot),
    motifs: [],
  };
}

export const GLOAM_RECIPE: GrassRecipeColours = gloamRecipe();

/** The Grass masters' colours by the recipe colour that replaces them. */
const GRASS_COLOUR_ROLES = {
  "#8ab85c": "base",
  "#a3cc72": "light",
  "#6e9c4a": "mid",
  "#557f3c": "dark",
  "#52793a": "dark",
} as const;

interface GloamMaster {
  readonly id: string;
  readonly path: string;
  /** The production master it is recoloured from, or the body it carries. */
  readonly source: string;
  /** Forest only: the gloam ground tile under the body. */
  readonly ground?: string;
}

export const GLOAM_MASTERS: readonly GloamMaster[] = [
  ...[1, 2, 3].map((index) => ({
    id: `chibi-undead-grass-${index}`,
    path: `${TERRAIN}/chibi-undead-grass-${index}.png`,
    source: `${TERRAIN}/chibi-grass-${index}.png`,
  })),
  ...[1, 2].map((index) => ({
    id: `chibi-undead-forest-${index}`,
    path: `${TERRAIN}/chibi-undead-forest-${index}.png`,
    source: `${TERRAIN}/chibi-forest-${index}.body.png`,
    ground: `${TERRAIN}/chibi-undead-grass-1.png`,
  })),
];

export interface GloamGrassRecord {
  readonly schemaVersion: 1;
  readonly bead: string;
  readonly variant: string;
  readonly label: string;
  /** Grass colour to master colour, `#rrggbb`. */
  readonly colours: Readonly<Record<string, string>>;
  readonly motifs: GrassRecipeColours["motifs"];
  readonly seed: number;
  readonly masters: readonly {
    readonly id: string;
    readonly path: string;
    readonly sha256: string;
    readonly pixelSha256: string;
    readonly width: number;
    readonly height: number;
    readonly source: { readonly path: string; readonly sha256: string };
    readonly ground?: { readonly path: string; readonly sha256: string };
  }[];
}

/** Every master as its sources derive it today, with the record entry. */
export async function deriveGloamGrass(root: string): Promise<{
  readonly record: GloamGrassRecord;
  readonly files: ReadonlyMap<string, Buffer>;
}> {
  const colours = Object.fromEntries(
    Object.entries(GRASS_COLOUR_ROLES).map(([colour, role]) => [
      colour,
      GLOAM_RECIPE[role],
    ]),
  );
  const files = new Map<string, Buffer>();
  const masters: GloamGrassRecord["masters"][number][] = [];
  for (const master of GLOAM_MASTERS) {
    const sourceBytes = await readFile(path.join(root, master.source));
    const source = await readRaster(sourceBytes);
    let raster;
    let ground;
    if (master.ground === undefined)
      raster = deriveFactionGrassTile(
        source,
        GLOAM_RECIPE,
        GLOAM_MASTERS.indexOf(master),
        GLOAM_SEED,
      );
    else {
      const groundBytes = files.get(master.ground);
      if (groundBytes === undefined)
        throw new Error(`${master.id}: ground ${master.ground} is not derived`);
      raster = groundComposite(source, await readRaster(groundBytes));
      ground = { path: master.ground, sha256: sha256(groundBytes) };
    }
    const bytes = await encodePng(raster);
    files.set(master.path, bytes);
    masters.push({
      id: master.id,
      path: master.path,
      sha256: sha256(bytes),
      pixelSha256: pixelSha256(raster),
      width: raster.width,
      height: raster.height,
      source: { path: master.source, sha256: sha256(sourceBytes) },
      ...(ground === undefined ? {} : { ground }),
    });
  }
  return {
    record: {
      schemaVersion: 1,
      bead: "pulp_wars-2yc.48",
      variant: GLOAM_VARIANT,
      label: GLOAM_LABEL,
      colours,
      motifs: GLOAM_RECIPE.motifs,
      seed: GLOAM_SEED,
      masters,
    },
    files,
  };
}

/** Problems of the checked-in gloam masters; empty means valid. */
export async function gloamGrassProblems(root: string): Promise<string[]> {
  const problems: string[] = [];
  let derived;
  try {
    derived = await deriveGloamGrass(root);
  } catch (error) {
    return [
      `gloam grass: ${error instanceof Error ? error.message : String(error)}`,
    ];
  }
  let recorded: string;
  try {
    recorded = await readFile(path.join(root, GLOAM_GRASS_RECORD), "utf8");
  } catch {
    return [`gloam grass: ${GLOAM_GRASS_RECORD} is missing`];
  }
  if (JSON.stringify(JSON.parse(recorded)) !== JSON.stringify(derived.record))
    problems.push(
      `gloam grass: ${GLOAM_GRASS_RECORD} is not what its sources derive (a Grass or Forest master changed; run the bake)`,
    );
  for (const [file, bytes] of derived.files) {
    let checkedIn: Buffer;
    try {
      checkedIn = await readFile(path.join(root, file));
    } catch {
      problems.push(`gloam grass: ${file} is missing`);
      continue;
    }
    if (
      pixelSha256(await readRaster(checkedIn)) !==
      pixelSha256(await readRaster(bytes))
    )
      problems.push(`gloam grass: ${file} is not what the recipe derives`);
  }
  return problems;
}

async function main(): Promise<void> {
  const root = process.cwd();
  const command = process.argv[2] ?? "check";
  if (command === "bake") {
    const { record, files } = await deriveGloamGrass(root);
    for (const [file, bytes] of files) {
      await writeFile(path.join(root, file), bytes);
      console.log(`wrote ${file}`);
    }
    await writeFile(
      path.join(root, GLOAM_GRASS_RECORD),
      `${JSON.stringify(record, null, 2)}\n`,
    );
    console.log(`wrote ${GLOAM_GRASS_RECORD}`);
    return;
  }
  const problems = await gloamGrassProblems(root);
  if (problems.length > 0) throw new Error(problems.join("\n"));
  console.log("The gloam grass masters are what their sources derive.");
}

if (process.argv[1] === fileURLToPath(import.meta.url))
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "failed");
    process.exitCode = 1;
  });
