/**
 * Cuts the Goblin direction study's sample sprites out of its PixelLab
 * candidates (beads pulp_wars-3tq.8, pass 1, and pulp_wars-3tq.10, pass 2):
 * the chosen candidate of each recipe in
 * art/explorations/goblin-direction-2026-10/raw becomes a master under
 * assets/, and samples.json lists them as chibi assets for the study's
 * review bench. Nothing is registered as production art, and no PixelLab
 * call is made here.
 *
 *   npx tsx scripts/art/goblin-direction/samples.ts
 *
 * The samples wear fixed faction colours: no owner area and no mask
 * (`fixedColours`), like the Human direction units. Pass 1 samples are
 * `chibi-study-*` (near-black leather, a striped black rocket); pass 2
 * samples are `chibi-study2-*` (orange-brown leather loincloths, a fireworks
 * cart).
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import sharp from "sharp";
import { readRaster } from "../chibi/pipeline";
import { candidateCell, cropRaster, opaqueBounds } from "../chibi/raster";

const ROOT = process.cwd();
export const GOBLIN_STUDY_RUN = "art/explorations/goblin-direction-2026-10";

interface SampleSpec {
  readonly id: string;
  readonly subject: string;
  readonly assetClass: "STANDARD_UNIT" | "LARGE_UNIT";
  readonly recipe: string;
  readonly candidate: number;
  readonly width: number;
  readonly height: number;
  readonly anchor?: { readonly x: number; readonly y: number };
  /** "chosen" is the study's pick; "alternative" is shown beside it. */
  readonly role: "chosen" | "alternative";
  readonly note: string;
}

/** The pass of a sample, from its id. */
export const goblinStudyPass = (id: string): 1 | 2 =>
  id.startsWith("chibi-study2-") ? 2 : 1;

/** The reviewed choice per unit and pass, and the alternatives shown. */
export const GOBLIN_STUDY_SAMPLES: readonly SampleSpec[] = [
  {
    id: "chibi-study-goblin",
    subject: "UNIT:GOBLIN:FIGHTER",
    assetClass: "STANDARD_UNIT",
    recipe: "goblin-scrap-edit-h",
    candidate: 0,
    width: 56,
    height: 80,
    role: "chosen",
    note: "near-black leather, hide patches, bandage wraps, one striped shoulder pad",
  },
  {
    id: "chibi-study-bomb-chucker",
    subject: "UNIT:GOBLIN:MARKSMAN",
    assetClass: "STANDARD_UNIT",
    recipe: "bomb-chucker-scrap-edit-e",
    candidate: 0,
    width: 56,
    height: 80,
    role: "chosen",
    note: "rusted pot helmet and goggles, near-black leather, one hazard band on the bomb",
  },
  {
    id: "chibi-study-rocket-cart",
    subject: "UNIT:GOBLIN:CATAPULT",
    assetClass: "LARGE_UNIT",
    recipe: "rocket-cart-scrap-edit-e",
    candidate: 0,
    width: 72,
    height: 88,
    anchor: { x: 34, y: 48 },
    role: "chosen",
    note: "black paper rocket with hazard bands on a plank cart with rusty wheels",
  },
  {
    id: "chibi-study-goblin-headband",
    subject: "UNIT:GOBLIN:FIGHTER",
    assetClass: "STANDARD_UNIT",
    recipe: "goblin-scrap-edit-b",
    candidate: 0,
    width: 56,
    height: 80,
    role: "alternative",
    note: "warm brown hide, stripes on the headband, the current skin",
  },
  {
    id: "chibi-study-goblin-plain",
    subject: "UNIT:GOBLIN:FIGHTER",
    assetClass: "STANDARD_UNIT",
    recipe: "goblin-scrap-edit-c",
    candidate: 0,
    width: 56,
    height: 80,
    role: "alternative",
    note: "no hazard stripe at all",
  },
  {
    id: "chibi-study-bomb-chucker-cap",
    subject: "UNIT:GOBLIN:MARKSMAN",
    assetClass: "STANDARD_UNIT",
    recipe: "bomb-chucker-scrap-edit-a",
    candidate: 0,
    width: 56,
    height: 80,
    role: "alternative",
    note: "leather flying cap instead of the pot helmet",
  },
  {
    id: "chibi-study-bomb-chucker-gunmetal",
    subject: "UNIT:GOBLIN:MARKSMAN",
    assetClass: "STANDARD_UNIT",
    recipe: "bomb-chucker-scrap-edit-d",
    candidate: 0,
    width: 56,
    height: 80,
    role: "alternative",
    note: "gunmetal pot helmet, darker green skin, a bigger spark",
  },
  {
    id: "chibi-study-rocket-cart-scrap",
    subject: "UNIT:GOBLIN:CATAPULT",
    assetClass: "LARGE_UNIT",
    recipe: "rocket-cart-scrap-edit-a",
    candidate: 0,
    width: 72,
    height: 88,
    anchor: { x: 34, y: 48 },
    role: "alternative",
    note: "scrap-iron rocket with spiral stripes",
  },
  // Pass 2 (bead pulp_wars-3tq.10).
  {
    id: "chibi-study2-goblin",
    subject: "UNIT:GOBLIN:FIGHTER",
    assetClass: "STANDARD_UNIT",
    recipe: "goblin-leather-edit-k",
    candidate: 0,
    width: 56,
    height: 80,
    role: "chosen",
    note: "leather cap, crossed straps, loincloth; no stripe",
  },
  {
    id: "chibi-study2-bomb-chucker",
    subject: "UNIT:GOBLIN:MARKSMAN",
    assetClass: "STANDARD_UNIT",
    recipe: "bomb-chucker-leather-edit-f",
    candidate: 0,
    width: 56,
    height: 80,
    role: "chosen",
    note: "leather flying cap, straps, loincloth; striped bomb",
  },
  {
    id: "chibi-study2-fireworks-cart",
    subject: "UNIT:GOBLIN:CATAPULT",
    assetClass: "LARGE_UNIT",
    recipe: "fireworks-cart-edit-h",
    candidate: 0,
    width: 72,
    height: 88,
    anchor: { x: 34, y: 48 },
    role: "chosen",
    note: "five paper rockets on a pale plank cart, crew riding",
  },
  {
    id: "chibi-study2-goblin-green",
    subject: "UNIT:GOBLIN:FIGHTER",
    assetClass: "STANDARD_UNIT",
    recipe: "goblin-leather-edit-j",
    candidate: 0,
    width: 56,
    height: 80,
    role: "alternative",
    note: "leaf green skin; headband, one strap; no stripe",
  },
  {
    id: "chibi-study2-goblin-striped",
    subject: "UNIT:GOBLIN:FIGHTER",
    assetClass: "STANDARD_UNIT",
    recipe: "goblin-leather-edit-m",
    candidate: 0,
    width: 56,
    height: 80,
    role: "alternative",
    note: "the leaf green Goblin with one hazard-striped shoulder pad",
  },
  {
    id: "chibi-study2-bomb-chucker-helmet",
    subject: "UNIT:GOBLIN:MARKSMAN",
    assetClass: "STANDARD_UNIT",
    recipe: "bomb-chucker-leather-edit-e",
    candidate: 0,
    width: 56,
    height: 80,
    role: "alternative",
    note: "the rusted pot helmet of pass 1",
  },
  {
    id: "chibi-study2-bomb-chucker-bright",
    subject: "UNIT:GOBLIN:MARKSMAN",
    assetClass: "STANDARD_UNIT",
    recipe: "bomb-chucker-leather-edit-k",
    candidate: 0,
    width: 56,
    height: 80,
    role: "alternative",
    note: "leather cap, a brighter yellow-green skin",
  },
  {
    id: "chibi-study2-fireworks-cart-dark",
    subject: "UNIT:GOBLIN:CATAPULT",
    assetClass: "LARGE_UNIT",
    recipe: "fireworks-cart-edit-g",
    candidate: 0,
    width: 72,
    height: 88,
    anchor: { x: 34, y: 48 },
    role: "alternative",
    note: "the same cart in near-black brown planks",
  },
  {
    id: "chibi-study2-fireworks-cart-walnut",
    subject: "UNIT:GOBLIN:CATAPULT",
    assetClass: "LARGE_UNIT",
    recipe: "fireworks-cart-edit-i",
    candidate: 0,
    width: 72,
    height: 88,
    anchor: { x: 34, y: 48 },
    role: "alternative",
    note: "red-brown planks, a sparkler fuse",
  },
  {
    id: "chibi-study2-fireworks-cart-ground",
    subject: "UNIT:GOBLIN:CATAPULT",
    assetClass: "LARGE_UNIT",
    recipe: "fireworks-cart-edit-c",
    candidate: 0,
    width: 72,
    height: 88,
    anchor: { x: 34, y: 48 },
    role: "alternative",
    note: "dark planks, crew beside the cart (60 px wide)",
  },
];

async function png(
  data: Uint8Array | Uint8ClampedArray,
  width: number,
  height: number,
): Promise<Buffer> {
  return sharp(Buffer.from(data), { raw: { width, height, channels: 4 } })
    .png({ compressionLevel: 9, palette: false })
    .toBuffer();
}

async function main(): Promise<void> {
  const directory = path.join(ROOT, GOBLIN_STUDY_RUN, "assets");
  await mkdir(directory, { recursive: true });
  const records = JSON.parse(
    await readFile(path.join(ROOT, GOBLIN_STUDY_RUN, "records.json"), "utf8"),
  ) as {
    recipes: Record<string, { candidateCount?: number; rawSheet?: string }>;
  };
  const assets = [];
  for (const sample of GOBLIN_STUDY_SAMPLES) {
    const record = records.recipes[sample.recipe];
    if (record?.rawSheet === undefined)
      throw new Error(`${sample.recipe}: no generated candidates`);
    const sheet = await readRaster(path.join(ROOT, record.rawSheet));
    const master = cropRaster(sheet, {
      ...candidateCell(sample.candidate, record.candidateCount ?? 1, sample),
      width: sample.width,
      height: sample.height,
    });
    const bounds = opaqueBounds(master);
    await writeFile(
      path.join(directory, `${sample.id}.png`),
      await png(master.data, master.width, master.height),
    );
    console.log(
      `${sample.id}: ${sample.recipe}#${sample.candidate}, opaque bounds ${JSON.stringify(bounds)}`,
    );
    assets.push({
      id: sample.id,
      subject: sample.subject,
      assetClass: sample.assetClass,
      width: sample.width,
      height: sample.height,
      ...(sample.anchor === undefined ? {} : { anchor: sample.anchor }),
      url: `/${GOBLIN_STUDY_RUN}/assets/${sample.id}.png`,
      fixedColours: true,
      pass: goblinStudyPass(sample.id),
      role: sample.role,
      recipe: sample.recipe,
      candidate: sample.candidate,
      note: sample.note,
    });
  }
  await writeFile(
    path.join(ROOT, GOBLIN_STUDY_RUN, "samples.json"),
    `${JSON.stringify(
      {
        bead: "pulp_wars-3tq.10",
        note: "Exploration sample sprites of the Goblin direction study, pass 1 (bead pulp_wars-3tq.8, chibi-study-*) and pass 2 (bead pulp_wars-3tq.10, chibi-study2-*). The URLs are served by the Vite dev server from the repository root; nothing here is registered as production art.",
        assets,
      },
      null,
      2,
    )}\n`,
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "samples failed");
  process.exitCode = 1;
});
