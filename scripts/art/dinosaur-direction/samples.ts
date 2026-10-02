/**
 * Cuts the Dinosaur direction study's sample sprites out of its PixelLab
 * candidates (bead pulp_wars-3tq.14). Each variant of a unit is one recorded
 * candidate of art/explorations/dinosaur-direction-2026-10/raw, copied as it
 * was generated: a pattern is drawn by an edit pass, so nothing is derived
 * here. For every pattern variant the script also measures how steady the
 * edit held its base sprite (`steadiness`): pixels whose opacity changed
 * (the silhouette), hide pixels that clearly changed (the pattern itself)
 * and other pixels that clearly changed (drift). samples.json lists the masters under assets/
 * as chibi assets for the study's review bench. Nothing is registered as
 * production art, and no PixelLab call is made here.
 *
 *   npx tsx scripts/art/dinosaur-direction/samples.ts
 *
 * The samples wear fixed faction colours: no owner area and no mask
 * (`fixedColours`), like the Human, Goblin and Undead direction units.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { rgbToHsv, type RgbaRaster } from "../chibi/owner-mask";
import { readRaster } from "../chibi/pipeline";
import { candidateCell, cropRaster, opaqueBounds } from "../chibi/raster";

const ROOT = process.cwd();
export const DINOSAUR_STUDY_RUN = "art/explorations/dinosaur-direction-2026-10";

export type DinosaurVariantV7 = "a" | "b" | "c" | "d" | "e" | "f";

/** The variants, in the order of the review sheets. */
export const DINOSAUR_VARIANTS: readonly {
  readonly id: DinosaurVariantV7;
  readonly name: string;
  readonly hide: string;
  readonly pattern: string;
}[] = [
  {
    id: "a",
    name: "A. Tiger stripes",
    hide: "slate",
    pattern: "bold amber stripes across the back and tail",
  },
  {
    id: "b",
    name: "B. Spots",
    hide: "slate",
    pattern: "a few big solid amber spots",
  },
  {
    id: "c",
    name: "C. Bands and saddle",
    hide: "slate",
    pattern: "a dark navy saddle and tail bands; amber on the crest only",
  },
  {
    id: "d",
    name: "D. Plain",
    hide: "slate",
    pattern: "no body pattern; amber on the crest only (the control)",
  },
  {
    id: "e",
    name: "E. Pale steel, navy stripes",
    hide: "pale steel",
    pattern: "dark navy tiger stripes; amber on the crest only",
  },
  {
    id: "f",
    name: "F. Deep blue, amber stripes",
    hide: "deep blue",
    pattern: "the amber stripes of A on a deeper, more saturated hide",
  },
];

interface Pick {
  readonly recipe: string;
  readonly candidate: number;
  /** The plain sprite this variant was edited from, for the steadiness. */
  readonly base?: { readonly recipe: string; readonly candidate: number };
  readonly note: string;
}

interface UnitSpec {
  /** Short name used in the asset ids: chibi-study-dino-<unit>-<variant>. */
  readonly unit: string;
  readonly subject: string;
  readonly assetClass: "STANDARD_UNIT" | "LARGE_UNIT";
  readonly width: number;
  readonly height: number;
  readonly anchor?: { readonly x: number; readonly y: number };
  readonly variants: Readonly<Record<DinosaurVariantV7, Pick>>;
}

const RAPTOR_SLATE = { recipe: "raptor-base-b", candidate: 0 };
const T_REX_SLATE = { recipe: "t-rex-hide-a", candidate: 0 };
const CAVEMAN_SPOTS: Pick = {
  recipe: "caveman-spots-skin-b",
  candidate: 0,
  note: "treatment 1: spotted tawny fur, light tan skin, amber war paint on the cheeks and arm",
};
const CAVEMAN_PLAIN: Pick = {
  recipe: "caveman-plain-skin-b",
  candidate: 0,
  note: "treatment 2: plain tawny fur, light tan skin, a necklace of teeth, no paint",
};
const CAVEMAN_TIGER: Pick = {
  recipe: "caveman-fur-stripes-a",
  candidate: 0,
  base: { recipe: "caveman-spots-skin-b", candidate: 0 },
  note: "treatment 1 with a tiger-striped pelt, to stand beside striped dinosaurs",
};

/** The reviewed candidate of each unit in each variant. */
export const DINOSAUR_STUDY_UNITS: readonly UnitSpec[] = [
  {
    unit: "caveman",
    subject: "UNIT:DINOSAUR:FIGHTER",
    assetClass: "STANDARD_UNIT",
    width: 56,
    height: 80,
    variants: {
      a: CAVEMAN_TIGER,
      b: CAVEMAN_SPOTS,
      c: CAVEMAN_PLAIN,
      d: CAVEMAN_PLAIN,
      e: CAVEMAN_SPOTS,
      f: CAVEMAN_TIGER,
    },
  },
  {
    unit: "raptor",
    subject: "UNIT:DINOSAUR:RAIDER",
    assetClass: "LARGE_UNIT",
    width: 72,
    height: 88,
    anchor: { x: 34, y: 48 },
    variants: {
      a: {
        recipe: "raptor-stripes-probe-a",
        candidate: 0,
        base: RAPTOR_SLATE,
        note: "about nine amber wedges from the spine, back and tail",
      },
      b: {
        recipe: "raptor-spots-a",
        candidate: 0,
        base: RAPTOR_SLATE,
        note: "ten solid amber spots on the back, thigh and tail",
      },
      c: {
        recipe: "raptor-saddle-a",
        candidate: 0,
        base: RAPTOR_SLATE,
        note: "navy bands on the back and tail; the calmest",
      },
      d: {
        ...RAPTOR_SLATE,
        note: "plain slate hide, navy tail top, amber feather crest",
      },
      e: {
        recipe: "raptor-steel-stripes-b",
        candidate: 0,
        base: { recipe: "raptor-hide-b", candidate: 0 },
        note: "pale steel hide with eight navy stripes",
      },
      f: {
        recipe: "raptor-deep-stripes-b",
        candidate: 0,
        base: { recipe: "raptor-hide-c", candidate: 0 },
        note: "deep blue hide with amber stripes",
      },
    },
  },
  {
    unit: "t-rex",
    subject: "UNIT:DINOSAUR:KNIGHT",
    assetClass: "LARGE_UNIT",
    width: 72,
    height: 88,
    anchor: { x: 30, y: 48 },
    variants: {
      a: {
        recipe: "t-rex-stripes-a",
        candidate: 0,
        base: T_REX_SLATE,
        note: "fat amber wedges on the neck, back and tail; plain legs",
      },
      b: {
        recipe: "t-rex-spots-a",
        candidate: 0,
        base: T_REX_SLATE,
        note: "about twelve solid amber spots; a yellower amber than the crest",
      },
      c: {
        recipe: "t-rex-saddle-a",
        candidate: 0,
        base: T_REX_SLATE,
        note: "navy head, back and bands; two small amber marks under the eye",
      },
      d: {
        ...T_REX_SLATE,
        note: "plain slate hide, navy back and legs, amber brow crest and back spikes",
      },
      e: {
        recipe: "t-rex-steel-stripes-b",
        candidate: 0,
        base: { recipe: "t-rex-hide-b", candidate: 0 },
        note: "steel hide with navy stripes on the flank and tail",
      },
      f: {
        recipe: "t-rex-deep-stripes-a",
        candidate: 0,
        base: { recipe: "t-rex-hide-d", candidate: 0 },
        note: "deep blue hide with amber stripes",
      },
    },
  },
];

interface AlternativeSpec {
  readonly id: string;
  readonly unit: string;
  readonly recipe: string;
  readonly candidate: number;
  readonly note: string;
}

/** Candidates kept beside the chosen ones, as generated. */
export const DINOSAUR_STUDY_ALTERNATIVES: readonly AlternativeSpec[] = [
  {
    id: "chibi-study-dino-raptor-today-blue",
    unit: "raptor",
    recipe: "raptor-base-a",
    candidate: 0,
    note: "today's light blue kept: only the crest recoloured and the blanket removed",
  },
  {
    id: "chibi-study-dino-raptor-two-tone",
    unit: "raptor",
    recipe: "raptor-hide-a",
    candidate: 0,
    note: "light head and flank under a navy back",
  },
  {
    id: "chibi-study-dino-raptor-steel",
    unit: "raptor",
    recipe: "raptor-hide-b",
    candidate: 0,
    note: "pale steel, plain: the base of variant E",
  },
  {
    id: "chibi-study-dino-raptor-deep",
    unit: "raptor",
    recipe: "raptor-hide-c",
    candidate: 0,
    note: "deep blue, plain: the base of variant F",
  },
  {
    id: "chibi-study-dino-raptor-rosettes",
    unit: "raptor",
    recipe: "raptor-spots-probe-a",
    candidate: 0,
    note: "amber rings instead of solid spots: freckles at native size",
  },
  {
    id: "chibi-study-dino-t-rex-today-blue",
    unit: "t-rex",
    recipe: "t-rex-base-b",
    candidate: 0,
    note: "today's bright blue kept: cape, scarf and bands removed, amber crest added",
  },
  {
    id: "chibi-study-dino-t-rex-steel",
    unit: "t-rex",
    recipe: "t-rex-hide-b",
    candidate: 0,
    note: "steel blue, plain: the base of variant E (smaller crest)",
  },
  {
    id: "chibi-study-dino-t-rex-deep",
    unit: "t-rex",
    recipe: "t-rex-hide-d",
    candidate: 0,
    note: "deep blue, plain: the base of variant F",
  },
];

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

export async function dinosaurStudyCandidate(
  records: Records,
  recipe: string,
  index: number,
  size: { readonly width: number; readonly height: number },
): Promise<RgbaRaster> {
  const record = records.recipes[recipe];
  if (record?.rawSheet === undefined)
    throw new Error(`${recipe}: no generated candidates`);
  const sheet = await readRaster(path.join(ROOT, record.rawSheet));
  return cropRaster(sheet, {
    ...candidateCell(index, record.candidateCount ?? 1, size),
    ...size,
  });
}

/** Hide: the blue of every hide tone of the study, light steel to navy. */
export function isHidePixel(r: number, g: number, b: number): boolean {
  const { hue, saturation, value } = rgbToHsv(r, g, b);
  return hue >= 195 && hue <= 250 && saturation >= 0.2 && value >= 0.15;
}

export interface Steadiness {
  /** Pixels opaque in one sprite and transparent in the other. */
  readonly silhouettePixels: number;
  /** Clearly changed pixels that were hide in the base: the pattern. */
  readonly hidePixels: number;
  /** Clearly changed pixels that were not hide in the base: drift. */
  readonly otherPixels: number;
  /** Pixels whose colour changed at all: an edit repaints nearly all. */
  readonly repaintedPixels: number;
  readonly opaquePixels: number;
}

/**
 * A pixel "clearly changed" when its colour moved further than this in RGB
 * (Euclidean, 0 to 441). An edit pass repaints every pixel by a few steps,
 * so exact equality says nothing; 48 is a visible change of tone.
 */
export const STEADY_DISTANCE = 48;

/** How far an edit moved its base sprite. */
export function steadinessOf(base: RgbaRaster, edit: RgbaRaster): Steadiness {
  let silhouettePixels = 0;
  let hidePixels = 0;
  let otherPixels = 0;
  let opaquePixels = 0;
  let repaintedPixels = 0;
  for (let index = 0; index < base.width * base.height; index += 1) {
    const o = index * 4;
    const was = (base.data[o + 3] ?? 0) >= 128;
    const is = (edit.data[o + 3] ?? 0) >= 128;
    if (was) opaquePixels += 1;
    if (was !== is) {
      silhouettePixels += 1;
      continue;
    }
    if (!was) continue;
    const distance = Math.hypot(
      (base.data[o] ?? 0) - (edit.data[o] ?? 0),
      (base.data[o + 1] ?? 0) - (edit.data[o + 1] ?? 0),
      (base.data[o + 2] ?? 0) - (edit.data[o + 2] ?? 0),
    );
    if (distance > 0) repaintedPixels += 1;
    if (distance <= STEADY_DISTANCE) continue;
    if (
      isHidePixel(
        base.data[o] ?? 0,
        base.data[o + 1] ?? 0,
        base.data[o + 2] ?? 0,
      )
    )
      hidePixels += 1;
    else otherPixels += 1;
  }
  return {
    silhouettePixels,
    hidePixels,
    otherPixels,
    repaintedPixels,
    opaquePixels,
  };
}

export async function cutDinosaurStudySamples(): Promise<void> {
  const directory = path.join(ROOT, DINOSAUR_STUDY_RUN, "assets");
  await mkdir(directory, { recursive: true });
  const records = JSON.parse(
    await readFile(path.join(ROOT, DINOSAUR_STUDY_RUN, "records.json"), "utf8"),
  ) as Records;
  const assets = [];
  for (const spec of DINOSAUR_STUDY_UNITS) {
    const size = { width: spec.width, height: spec.height };
    const common = {
      subject: spec.subject,
      assetClass: spec.assetClass,
      ...size,
      ...(spec.anchor === undefined ? {} : { anchor: spec.anchor }),
      fixedColours: true,
    } as const;
    for (const variant of DINOSAUR_VARIANTS) {
      const pick = spec.variants[variant.id];
      const id = `chibi-study-dino-${spec.unit}-${variant.id}`;
      const raster = await dinosaurStudyCandidate(
        records,
        pick.recipe,
        pick.candidate,
        size,
      );
      await writeFile(path.join(directory, `${id}.png`), await png(raster));
      const steadiness =
        pick.base === undefined
          ? undefined
          : steadinessOf(
              await dinosaurStudyCandidate(
                records,
                pick.base.recipe,
                pick.base.candidate,
                size,
              ),
              raster,
            );
      console.log(
        `${id}: ${pick.recipe}#${pick.candidate}, bounds ${JSON.stringify(opaqueBounds(raster))}${steadiness === undefined ? "" : `, against ${pick.base?.recipe}: ${JSON.stringify(steadiness)}`}`,
      );
      assets.push({
        id,
        ...common,
        url: `/${DINOSAUR_STUDY_RUN}/assets/${id}.png`,
        role: "chosen",
        unit: spec.unit,
        variant: variant.id,
        recipe: pick.recipe,
        candidate: pick.candidate,
        derivation: { kind: "as-is" },
        ...(pick.base === undefined ? {} : { base: pick.base, steadiness }),
        note: pick.note,
      });
    }
    for (const alternative of DINOSAUR_STUDY_ALTERNATIVES.filter(
      (entry) => entry.unit === spec.unit,
    )) {
      const raster = await dinosaurStudyCandidate(
        records,
        alternative.recipe,
        alternative.candidate,
        size,
      );
      await writeFile(
        path.join(directory, `${alternative.id}.png`),
        await png(raster),
      );
      console.log(
        `${alternative.id}: ${alternative.recipe}#${alternative.candidate}`,
      );
      assets.push({
        id: alternative.id,
        ...common,
        url: `/${DINOSAUR_STUDY_RUN}/assets/${alternative.id}.png`,
        role: "alternative",
        unit: spec.unit,
        recipe: alternative.recipe,
        candidate: alternative.candidate,
        derivation: { kind: "as-is" },
        note: alternative.note,
      });
    }
  }
  await writeFile(
    path.join(ROOT, DINOSAUR_STUDY_RUN, "samples.json"),
    `${JSON.stringify(
      {
        bead: "pulp_wars-3tq.14",
        note: "Exploration sample sprites of the Dinosaur direction study. Every asset is its recipe's candidate as generated. `steadiness` compares a pattern variant with the plain sprite it was edited from (`base`): pixels whose opacity changed, clearly changed pixels (further than 48 in RGB) that were hide in the base (hue 195 to 250, saturation at least 0.2, value at least 0.15: the pattern), other clearly changed pixels (drift), and pixels repainted at all. The URLs are served by the Vite dev server from the repository root; nothing here is registered as production art.",
        variants: DINOSAUR_VARIANTS,
        assets,
      },
      null,
      2,
    )}\n`,
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url))
  cutDinosaurStudySamples().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "samples failed");
    process.exitCode = 1;
  });
