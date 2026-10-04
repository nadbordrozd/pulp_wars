/**
 * The Undead territory ground as production masters (bead pulp_wars-xdh.2,
 * docs/art/FACTION_BUILDINGS.md, section 4): the accepted "gloam" recolour
 * of the three Grass masters, and the two Forest masters re-composited over
 * the first gloam tile (their recorded ground is `chibi-grass-1`).
 *
 *   npx tsx scripts/art/faction-buildings/gloam-grass.ts bake
 *   npx tsx scripts/art/faction-buildings/gloam-grass.ts check
 *
 * No PixelLab call and no hand drawing: every master is an exact colour swap
 * of a reviewed production master, so the tufts, the seamless joins and the
 * three variants stay, and a territory edge is a colour step only. `bake`
 * writes the masters and `gloam-grass.json` (the colour swap and the hash of
 * every source and output); `art:validate` re-derives each master from its
 * sources and fails when the bytes differ (`gloamGrassProblems`).
 *
 * The Forest body layers are not copied: the runtime draws the gloam ground
 * tile, a Road, and the existing `chibi-forest-N.body.png` over it.
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { encodePng, pixelSha256, readRaster, sha256 } from "../chibi/pipeline";
import { groundComposite } from "../chibi/raster";
import {
  UNDEAD_GRASS_VARIANTS,
  grassColourMap,
  recolourGrass,
} from "./undead-grass";

const TERRAIN = "public/assets/chibi/terrain";
export const GLOAM_GRASS_RECORD =
  "scripts/art/faction-buildings/gloam-grass.json";
export const GLOAM_VARIANT = "gloam";

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
  /** Grass colour to gloam colour, `#rrggbb`. */
  readonly colours: Readonly<Record<string, string>>;
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

function gloamSpec() {
  const spec = UNDEAD_GRASS_VARIANTS.find(
    (variant) => variant.id === GLOAM_VARIANT,
  );
  if (spec === undefined) throw new Error("no gloam grass variant");
  return spec;
}

/** Every master as its sources derive it today, with the record entry. */
export async function deriveGloamGrass(root: string): Promise<{
  readonly record: GloamGrassRecord;
  readonly files: ReadonlyMap<string, Buffer>;
}> {
  const spec = gloamSpec();
  const colours = grassColourMap(spec);
  const files = new Map<string, Buffer>();
  const masters: GloamGrassRecord["masters"][number][] = [];
  for (const master of GLOAM_MASTERS) {
    const sourceBytes = await readFile(path.join(root, master.source));
    const source = await readRaster(sourceBytes);
    let raster;
    let ground;
    if (master.ground === undefined) raster = recolourGrass(source, colours);
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
      bead: "pulp_wars-xdh.2",
      variant: spec.id,
      label: spec.label,
      colours: Object.fromEntries(colours),
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
      problems.push(`gloam grass: ${file} is not the gloam recolour`);
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
