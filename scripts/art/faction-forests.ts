/**
 * Faction forests (bead pulp_wars-2yc.2, docs/art/FACTION_FORESTS.md): a
 * composed-forest piece set per faction, stamped from that faction's own
 * tree clumps by the bake of the default Forest
 * (scripts/art/chibi-forest-pieces.ts: the same lattice, the same twenty
 * shapes, the same softening).
 *
 *   MOUNTAIN_RANGES_RUN=art/pixellab/faction-forests \
 *     npx tsx scripts/art/chibi-mountain-ranges.ts plan
 *   MOUNTAIN_RANGES_RUN=art/pixellab/faction-forests \
 *     node node_modules/.bin/tsx --env-file=<file> scripts/art/chibi-mountain-ranges.ts generate <id>...
 *   npx tsx scripts/art/faction-forests.ts bake
 *   npx tsx scripts/art/faction-forests.ts check        # also in art:validate
 *   npx tsx scripts/art/faction-forests.ts lighting
 *   npx tsx scripts/art/faction-forests.ts sheet <out.png>
 *
 * The clumps are PixelLab candidates of the run `art/pixellab/
 * faction-forests/` (every request a checked-in recipe, the credential-free
 * request and the hash of every candidate recorded, raw candidates kept),
 * made with the style-image generator of the mountain pipeline.
 * `sets.json` of the run names, per faction, the reviewed candidates its
 * forest is stamped from and the ground tile its foliage is lifted toward.
 *
 * Nothing is mirrored: the sun is at the bottom left (the user,
 * 2026-10-05), and a mirrored clump is lit from the other side. `bake`
 * measures every clump (scripts/art/lighting-qa.ts) and refuses one lit
 * from the right. It writes the masters under
 * `public/assets/chibi/forest/<faction>/` and
 * `src/assets/faction-forest-pieces.json` (the runtime manifest and the
 * derivation record); `check` re-derives every master and fails when the
 * bytes differ (`factionForestProblems`).
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import sharp, { type OverlayOptions } from "sharp";
import {
  deriveForestPieces,
  type ForestPieceSet,
  type ForestSoften,
  type ForestPiecesRecord,
} from "./chibi-forest-pieces";
import { pixelSha256, readRaster } from "./chibi/pipeline";
import { lightVerdict, lightingOf, type Lighting } from "./lighting-qa";

export const FACTION_FORESTS_RUN = "art/pixellab/faction-forests";
export const FACTION_FOREST_RECORD = "src/assets/faction-forest-pieces.json";
const OUT = "public/assets/chibi/forest";

interface SetsFile {
  readonly bead: string;
  readonly sets: Readonly<
    Record<
      string,
      {
        /** The ground tile the foliage is lifted toward. */
        readonly grass: string;
        /** The set's own softening (a busy set is calmed further). */
        readonly soften?: ForestSoften;
        readonly clumps: readonly {
          readonly recipe: string;
          readonly candidate: number;
          readonly weight?: number;
        }[];
      }
    >
  >;
}

interface Records {
  readonly [id: string]: {
    readonly candidates: readonly { readonly file: string }[];
  };
}

export interface FactionForestRecord {
  readonly schemaVersion: 1;
  readonly bead: string;
  readonly sets: Readonly<Record<string, ForestPiecesRecord>>;
}

async function readJson<T>(root: string, file: string): Promise<T> {
  return JSON.parse(await readFile(path.join(root, file), "utf8")) as T;
}

/** The piece sets of the run, by faction. */
export async function factionForestSets(
  root: string,
): Promise<ReadonlyMap<string, ForestPieceSet>> {
  const file = await readJson<SetsFile>(
    root,
    `${FACTION_FORESTS_RUN}/sets.json`,
  );
  const records = await readJson<Records>(
    root,
    `${FACTION_FORESTS_RUN}/records.json`,
  );
  const sets = new Map<string, ForestPieceSet>();
  for (const [faction, spec] of Object.entries(file.sets)) {
    const slug = faction.toLowerCase().replaceAll("_", "-");
    sets.set(faction, {
      bead: file.bead,
      prefix: `chibi-forest-${slug}`,
      out: `${OUT}/${slug}`,
      clumps: spec.clumps.map((clump, index) => {
        const raw = records[clump.recipe]?.candidates[clump.candidate]?.file;
        if (raw === undefined)
          throw new Error(
            `${faction}: no candidate ${clump.recipe}#${clump.candidate}`,
          );
        return {
          id: `chibi-forest-${slug}-${index + 1}`,
          file: raw,
          candidate: true as const,
          weight: clump.weight ?? 1,
          seam: `chibi-forest-${slug}-seam-${index + 1}.png`,
        };
      }),
      toneClumps: spec.clumps.length,
      grass: spec.grass,
      mirror: false,
      ...(spec.soften === undefined ? {} : { soften: spec.soften }),
    });
  }
  return sets;
}

/** The lighting of every clump of a set, as the bake stamps it. */
export async function factionForestLighting(
  root: string,
  set: ForestPieceSet,
): Promise<
  { readonly id: string; readonly file: string; readonly lighting: Lighting }[]
> {
  const out = [];
  for (const clump of set.clumps)
    out.push({
      id: clump.id,
      file: clump.file,
      lighting: lightingOf(
        await readRaster(await readFile(path.join(root, clump.file))),
      ),
    });
  return out;
}

/** Every set as its candidates derive it today, with the record. */
export async function deriveFactionForests(root: string): Promise<{
  readonly record: FactionForestRecord;
  readonly files: ReadonlyMap<string, Buffer>;
}> {
  const sets = await factionForestSets(root);
  const files = new Map<string, Buffer>();
  const records: Record<string, ForestPiecesRecord> = {};
  let bead = "";
  for (const [faction, set] of sets) {
    bead = set.bead;
    for (const clump of await factionForestLighting(root, set))
      if (lightVerdict(clump.lighting) === "RIGHT")
        throw new Error(
          `${faction}: ${clump.file} is lit from the right (faces ${clump.lighting.faces.toFixed(1)})`,
        );
    const derived = await deriveForestPieces(root, undefined, set);
    records[faction] = derived.record;
    for (const [file, bytes] of derived.files) files.set(file, bytes);
  }
  return { record: { schemaVersion: 1, bead, sets: records }, files };
}

/** Problems of the checked-in faction forests; empty means valid. */
export async function factionForestProblems(root: string): Promise<string[]> {
  const problems: string[] = [];
  let derived;
  try {
    derived = await deriveFactionForests(root);
  } catch (error) {
    return [
      `faction forests: ${error instanceof Error ? error.message : String(error)}`,
    ];
  }
  let recorded: string;
  try {
    recorded = await readFile(path.join(root, FACTION_FOREST_RECORD), "utf8");
  } catch {
    return [`faction forests: ${FACTION_FOREST_RECORD} is missing`];
  }
  if (JSON.stringify(JSON.parse(recorded)) !== JSON.stringify(derived.record))
    problems.push(
      `faction forests: ${FACTION_FOREST_RECORD} is not what the candidates derive (run the bake)`,
    );
  for (const [file, bytes] of derived.files) {
    let checkedIn: Buffer;
    try {
      checkedIn = await readFile(path.join(root, file));
    } catch {
      problems.push(`faction forests: ${file} is missing`);
      continue;
    }
    if (
      pixelSha256(await readRaster(checkedIn)) !==
      pixelSha256(await readRaster(bytes))
    )
      problems.push(`faction forests: ${file} is not what its clumps derive`);
  }
  return problems;
}

const signed = (value: number): string =>
  `${value >= 0 ? "+" : ""}${value.toFixed(1)}`;

async function lighting(root: string): Promise<void> {
  for (const [faction, set] of await factionForestSets(root))
    for (const clump of await factionForestLighting(root, set))
      console.log(
        `${faction.padEnd(9)} ${path.basename(clump.file).padEnd(22)} thirds ${signed(clump.lighting.thirds).padStart(6)}  faces ${signed(clump.lighting.faces).padStart(6)}  ${lightVerdict(clump.lighting)}`,
      );
}

/**
 * A sheet: per faction, its seam clumps (the clumps as softened) with their
 * lighting numbers, then a 2x2, a 2x1 and a 1x1 piece, on its ground, 2x.
 */
async function sheet(root: string, out: string): Promise<void> {
  const sets = await factionForestSets(root);
  const record = await readJson<FactionForestRecord>(
    root,
    FACTION_FOREST_RECORD,
  );
  const rowHeight = 220;
  const width = 1040;
  const composites: OverlayOptions[] = [];
  let row = 0;
  for (const [faction, set] of sets) {
    const top = row * rowHeight;
    const ground = await sharp(path.join(root, set.grass))
      .resize(80, 80)
      .toBuffer();
    composites.push({
      input: await sharp({
        create: {
          width,
          height: rowHeight - 6,
          channels: 4,
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        },
      })
        .composite([{ input: ground, tile: true }])
        .png()
        .toBuffer(),
      left: 0,
      top,
    });
    composites.push({
      input: Buffer.from(
        `<svg width="${width}" height="22"><rect width="${width}" height="22" fill="#14181a" fill-opacity="0.7"/><text x="8" y="16" font-family="Helvetica" font-weight="700" font-size="14" fill="#f2f2ee">${faction}</text></svg>`,
      ),
      left: 0,
      top,
    });
    let x = 8;
    const lights = await factionForestLighting(root, set);
    for (const [index, clump] of (
      record.sets[faction]?.clumps ?? []
    ).entries()) {
      composites.push({
        input: path.join(root, clump.seam.path),
        left: x,
        top: top + 28 + (104 - clump.seam.height),
      });
      const light = lights[index]?.lighting;
      if (light !== undefined)
        composites.push({
          input: Buffer.from(
            `<svg width="90" height="18"><rect width="90" height="18" fill="#14181a" fill-opacity="0.7"/><text x="4" y="13" font-family="Helvetica" font-size="11" fill="#f2f2ee">faces ${signed(light.faces)}</text></svg>`,
          ),
          left: x,
          top: top + 138,
        });
      x += 92;
    }
    x += 10;
    for (const id of ["2x2-a", "2x1-a", "1x2-a", "1x1-a"]) {
      const piece = record.sets[faction]?.pieces.find((item) =>
        item.id.endsWith(`-piece-${id}`),
      );
      if (piece === undefined) continue;
      composites.push({
        input: path.join(root, piece.path),
        left: x,
        top: top + 26,
      });
      x += piece.width + 10;
    }
    row += 1;
  }
  const height = row * rowHeight;
  const plain = await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 20, g: 24, b: 26, alpha: 1 },
    },
  })
    .composite(composites)
    .png()
    .toBuffer();
  await mkdir(path.dirname(out), { recursive: true });
  await sharp(plain)
    .resize(width * 2, height * 2, { kernel: "nearest" })
    .toFile(out);
  console.log(`wrote ${out}`);
}

async function main(): Promise<void> {
  const root = process.cwd();
  const [command = "check", ...rest] = process.argv.slice(2);
  if (command === "bake") {
    const { record, files } = await deriveFactionForests(root);
    for (const [file, bytes] of files) {
      await mkdir(path.dirname(path.join(root, file)), { recursive: true });
      await writeFile(path.join(root, file), bytes);
    }
    console.log(`wrote ${files.size} masters under ${OUT}/<faction>/`);
    await writeFile(
      path.join(root, FACTION_FOREST_RECORD),
      `${JSON.stringify(record, null, 2)}\n`,
    );
    console.log(`wrote ${FACTION_FOREST_RECORD}`);
    return;
  }
  if (command === "lighting") return lighting(root);
  if (command === "sheet" && rest[0] !== undefined)
    return sheet(root, path.resolve(rest[0]));
  if (command !== "check")
    throw new Error(
      "usage: faction-forests.ts bake | check | lighting | sheet <out.png>",
    );
  const problems = await factionForestProblems(root);
  if (problems.length > 0) throw new Error(problems.join("\n"));
  console.log("The faction forests are what their candidates derive.");
}

if (process.argv[1] === fileURLToPath(import.meta.url))
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "failed");
    process.exitCode = 1;
  });
