/**
 * Cuts the Undead direction study's sample sprites out of its PixelLab
 * candidates (bead pulp_wars-3tq.11) and derives the three accent options.
 * For each unit the chosen candidate in
 * art/explorations/undead-direction-2026-10/raw is the BASE (generated with
 * a violet accent); the violet, cyan and green options are that base with
 * its accent pixels remapped by scripts/art/undead-direction/accent.ts, so
 * the options of one unit differ in the accent and in nothing else.
 * samples.json lists the masters under assets/ as chibi assets for the
 * study's review bench and records each derivation. Nothing is registered
 * as production art, and no PixelLab call is made here.
 *
 *   npx tsx scripts/art/undead-direction/samples.ts
 *
 * The samples wear fixed faction colours: no owner area and no mask
 * (`fixedColours`), like the Human direction units.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import type { RgbaRaster } from "../chibi/owner-mask";
import { readRaster } from "../chibi/pipeline";
import { candidateCell, cropRaster, opaqueBounds } from "../chibi/raster";
import {
  ACCENT_REMAPS,
  ACCENT_SOURCE_BAND,
  remapAccent,
  type UndeadAccentV7,
} from "./accent";

const ROOT = process.cwd();
export const UNDEAD_STUDY_RUN = "art/explorations/undead-direction-2026-10";
export const UNDEAD_ACCENTS: readonly UndeadAccentV7[] = [
  "violet",
  "cyan",
  "green",
];

interface UnitSpec {
  /** Short name used in the asset ids: chibi-study-<unit>-<accent>. */
  readonly unit: string;
  readonly subject: string;
  readonly recipe: string;
  readonly candidate: number;
  readonly note: string;
}

/** The reviewed base per unit. */
export const UNDEAD_STUDY_UNITS: readonly UnitSpec[] = [
  {
    unit: "skeleton",
    subject: "UNIT:UNDEAD:FIGHTER",
    recipe: "skeleton-bone-edit-d",
    candidate: 0,
    note: "bare ribcage, black loincloth and crest, iron helmet and shield with bronze rims",
  },
  {
    unit: "zombie",
    subject: "UNIT:UNDEAD:GUARD",
    recipe: "zombie-bone-edit-b",
    candidate: 0,
    note: "pallid ash grey skin, charcoal smock, bone necklace, bandaged arms",
  },
  {
    unit: "necromancer",
    subject: "UNIT:UNDEAD:CAPTAIN",
    recipe: "necromancer-bone-edit-c",
    candidate: 0,
    note: "near-black hood and robe, bone spikes on the hood, skull staff, white beard",
  },
];

interface AlternativeSpec {
  readonly id: string;
  readonly subject: string;
  readonly recipe: string;
  readonly candidate: number;
  readonly note: string;
}

/** Candidates kept beside the chosen ones, as generated (no remap). */
export const UNDEAD_STUDY_ALTERNATIVES: readonly AlternativeSpec[] = [
  {
    id: "chibi-study-skeleton-steel",
    subject: "UNIT:UNDEAD:FIGHTER",
    recipe: "skeleton-bone-edit-a",
    candidate: 0,
    note: "all-iron helmet and shield, no bronze",
  },
  {
    id: "chibi-study-skeleton-crest",
    subject: "UNIT:UNDEAD:FIGHTER",
    recipe: "skeleton-bone-edit-b",
    candidate: 0,
    note: "tabard kept in charcoal; the accent on the whole crest",
  },
  {
    id: "chibi-study-zombie-ribs",
    subject: "UNIT:UNDEAD:GUARD",
    recipe: "zombie-bone-edit-c",
    candidate: 0,
    note: "more bone: a bare ribcage and bone arms under the smock",
  },
  {
    id: "chibi-study-necromancer-plain",
    subject: "UNIT:UNDEAD:CAPTAIN",
    recipe: "necromancer-bone-edit-b",
    candidate: 0,
    note: "no bone spikes on the hood",
  },
  {
    id: "chibi-study-necromancer-cyan-by-edit",
    subject: "UNIT:UNDEAD:CAPTAIN",
    recipe: "necromancer-accent-cyan-edit",
    candidate: 0,
    note: "cyan by a PixelLab edit, not by the remap: the eyes stayed violet",
  },
  {
    id: "chibi-study-necromancer-green-by-edit",
    subject: "UNIT:UNDEAD:CAPTAIN",
    recipe: "necromancer-accent-green-edit",
    candidate: 0,
    note: "green by a PixelLab edit, not by the remap: thicker, brighter trim",
  },
];

const WIDTH = 56;
const HEIGHT = 80;

async function png(raster: RgbaRaster): Promise<Buffer> {
  return sharp(Buffer.from(raster.data), {
    raw: { width: raster.width, height: raster.height, channels: 4 },
  })
    .png({ compressionLevel: 9, palette: false })
    .toBuffer();
}

type Records = {
  recipes: Record<string, { candidateCount?: number; rawSheet?: string }>;
};

async function candidate(
  records: Records,
  recipe: string,
  index: number,
): Promise<RgbaRaster> {
  const record = records.recipes[recipe];
  if (record?.rawSheet === undefined)
    throw new Error(`${recipe}: no generated candidates`);
  const sheet = await readRaster(path.join(ROOT, record.rawSheet));
  const size = { width: WIDTH, height: HEIGHT };
  return cropRaster(sheet, {
    ...candidateCell(index, record.candidateCount ?? 1, size),
    ...size,
  });
}

export async function cutUndeadStudySamples(): Promise<void> {
  const directory = path.join(ROOT, UNDEAD_STUDY_RUN, "assets");
  await mkdir(directory, { recursive: true });
  const records = JSON.parse(
    await readFile(path.join(ROOT, UNDEAD_STUDY_RUN, "records.json"), "utf8"),
  ) as Records;
  const assets = [];
  const common = {
    assetClass: "STANDARD_UNIT",
    width: WIDTH,
    height: HEIGHT,
    fixedColours: true,
  } as const;
  for (const spec of UNDEAD_STUDY_UNITS) {
    const base = await candidate(records, spec.recipe, spec.candidate);
    for (const accent of UNDEAD_ACCENTS) {
      const id = `chibi-study-${spec.unit}-${accent}`;
      const result = remapAccent(base, ACCENT_REMAPS[accent]);
      await writeFile(
        path.join(directory, `${id}.png`),
        await png(result.raster),
      );
      console.log(
        `${id}: ${spec.recipe}#${spec.candidate}, ${result.accentPixels} accent pixels of ${result.opaquePixels} opaque, bounds ${JSON.stringify(opaqueBounds(result.raster))}`,
      );
      assets.push({
        id,
        subject: spec.subject,
        ...common,
        url: `/${UNDEAD_STUDY_RUN}/assets/${id}.png`,
        role: "chosen",
        unit: spec.unit,
        accent,
        recipe: spec.recipe,
        candidate: spec.candidate,
        derivation: {
          kind: "accent-hue-remap",
          sourceBand: ACCENT_SOURCE_BAND,
          remap: ACCENT_REMAPS[accent],
          accentPixels: result.accentPixels,
          opaquePixels: result.opaquePixels,
        },
        note: spec.note,
      });
    }
  }
  for (const spec of UNDEAD_STUDY_ALTERNATIVES) {
    const raster = await candidate(records, spec.recipe, spec.candidate);
    await writeFile(path.join(directory, `${spec.id}.png`), await png(raster));
    console.log(`${spec.id}: ${spec.recipe}#${spec.candidate}`);
    assets.push({
      id: spec.id,
      subject: spec.subject,
      ...common,
      url: `/${UNDEAD_STUDY_RUN}/assets/${spec.id}.png`,
      role: "alternative",
      recipe: spec.recipe,
      candidate: spec.candidate,
      derivation: { kind: "as-is" },
      note: spec.note,
    });
  }
  await writeFile(
    path.join(ROOT, UNDEAD_STUDY_RUN, "samples.json"),
    `${JSON.stringify(
      {
        bead: "pulp_wars-3tq.11",
        note: "Exploration sample sprites of the Undead direction study. A chosen asset is its recipe's candidate with the accent pixels (sourceBand, HSV) remapped as recorded in `derivation.remap`: new hue = remap.hue + (hue - sourceBand.hueCentre) * remap.hueSpread, saturation and value multiplied. The URLs are served by the Vite dev server from the repository root; nothing here is registered as production art.",
        assets,
      },
      null,
      2,
    )}\n`,
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url))
  cutUndeadStudySamples().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "samples failed");
    process.exitCode = 1;
  });
