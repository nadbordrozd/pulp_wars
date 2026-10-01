/**
 * Cuts the visual-direction study's sample sprites out of its PixelLab
 * candidates (bead pulp_wars-3tq.1): the chosen candidate of each recipe in
 * art/explorations/visual-direction-2026-10/raw becomes a master and an
 * automatic owner mask under assets/, and samples.json lists them as chibi
 * assets for the test bench and the developer toggle. Nothing is registered
 * as production art, and no PixelLab call is made here.
 *
 *   npx tsx scripts/art/visual-direction/samples.ts
 *
 * The accent mask is extracted with the production key-colour band; only
 * the coverage floor is ignored, because a small owner area is the point.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import sharp from "sharp";
import { extractOwnerMask, maskToRgba, ownerMaskQa } from "../chibi/owner-mask";
import { readRaster } from "../chibi/pipeline";
import { candidateCell, cropRaster } from "../chibi/raster";

const ROOT = process.cwd();
const RUN = "art/explorations/visual-direction-2026-10";

/** The reviewed choice per sample: recipe, candidate and geometry. */
const SAMPLES = [
  {
    id: "chibi-sample-accent-fighter",
    subject: "UNIT:FIGHTER",
    assetClass: "STANDARD_UNIT",
    recipe: "fighter-accent-edit-b",
    candidate: 0,
    candidates: 2,
    width: 56,
    height: 80,
  },
  {
    id: "chibi-sample-accent-marksman",
    subject: "UNIT:MARKSMAN",
    assetClass: "STANDARD_UNIT",
    recipe: "marksman-accent-edit",
    candidate: 0,
    candidates: 2,
    width: 56,
    height: 80,
  },
  {
    id: "chibi-sample-accent-knight",
    subject: "UNIT:KNIGHT",
    assetClass: "LARGE_UNIT",
    recipe: "knight-accent-edit",
    candidate: 0,
    candidates: 2,
    width: 72,
    height: 88,
  },
] as const;

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
  const directory = path.join(ROOT, RUN, "assets");
  await mkdir(directory, { recursive: true });
  const assets = [];
  for (const sample of SAMPLES) {
    const sheet = await readRaster(
      path.join(ROOT, RUN, "raw", `${sample.recipe}.png`),
    );
    const master = cropRaster(sheet, {
      ...candidateCell(sample.candidate, sample.candidates, sample),
      width: sample.width,
      height: sample.height,
    });
    const { mask } = extractOwnerMask(master);
    const qa = ownerMaskQa(master, mask, { owned: true });
    await writeFile(
      path.join(directory, `${sample.id}.png`),
      await png(master.data, master.width, master.height),
    );
    await writeFile(
      path.join(directory, `${sample.id}.mask.png`),
      await png(maskToRgba(mask), mask.width, mask.height),
    );
    console.log(
      `${sample.id}: owner area ${(qa.coverage * 100).toFixed(1)}% of ${qa.opaquePixels} opaque pixels`,
    );
    assets.push({
      id: sample.id,
      subject: sample.subject,
      assetClass: sample.assetClass,
      width: sample.width,
      height: sample.height,
      url: `/${RUN}/assets/${sample.id}.png`,
      ownerMaskUrl: `/${RUN}/assets/${sample.id}.mask.png`,
      recipe: sample.recipe,
      candidate: sample.candidate,
      ownerCoverage: qa.coverage,
    });
  }
  await writeFile(
    path.join(ROOT, RUN, "samples.json"),
    `${JSON.stringify(
      {
        bead: "pulp_wars-3tq.1",
        note: "Exploration sample sprites of the visual-direction study. The URLs are served by the Vite dev server from the repository root; nothing here is registered as production art.",
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
