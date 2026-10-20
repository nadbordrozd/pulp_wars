/**
 * Holistic Cult palette samples (bead pulp_wars-mch9.58). Makes no PixelLab
 * call: every option is a deterministic remap of the production pixels
 * (see ./recolour.ts for the palettes and the classifier).
 *
 *   tsx scripts/art/cult-palette-mch958/palette.ts mask --out DIR
 *       what the classifier changes, per asset, x4: main cyan, dark
 *       yellow, trim magenta, glow green, the rest dimmed
 *   tsx scripts/art/cult-palette-mch958/palette.ts apply --out DIR
 *       every palette's recoloured PNGs under DIR/<palette>/
 *   tsx scripts/art/cult-palette-mch958/palette.ts sheets --out DIR [--copy DIR2]
 *       sheet-<palette>.png (the five cultists 1x and x3, the busts, the
 *       cities, buildings and Monument, the ships and their portraits, the
 *       Familiar, the Herald and the summons), board-<palette>.png (a board
 *       mock at 1x and x2) and contact.png (the current look and the four
 *       palettes at board scale); --copy also writes 256-colour copies
 *   tsx scripts/art/cult-palette-mch958/palette.ts measure [--out DIR]
 *       CIE76 (and under deuteranopia and protanopia) of each palette's
 *       swatches, measured robe, roof and hull means and proposed border
 *       against every faction's identity colour and the summons' teal;
 *       --out also writes measure.md and measure.json
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { readRaster, encodePng } from "../chibi/pipeline";
import { ALL_ASSETS, PALETTES, recolour } from "./recolour";
import { blank, blit, writeSheet } from "../ice-folk-direction/raster-tools";
import { measure } from "./measure";
import { sheets } from "./sheets";

const ROOT = process.cwd();

function option(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index < 0 ? undefined : process.argv[index + 1];
}

async function mask(out: string): Promise<void> {
  const scale = 4;
  const dir = path.resolve(ROOT, out);
  await mkdir(dir, { recursive: true });
  for (const asset of ALL_ASSETS) {
    const raster = await readRaster(path.join(ROOT, asset.file));
    const debug = recolour(asset, raster, undefined);
    const canvas = blank(
      raster.width * scale * 2 + 24,
      raster.height * scale + 16,
      [60, 64, 70],
    );
    blit(canvas, raster, 8, 8, scale);
    blit(canvas, debug, raster.width * scale + 16, 8, scale);
    await writeSheet(path.join(dir, `mask-${asset.id}.png`), canvas, []);
  }
}

async function apply(out: string): Promise<void> {
  for (const palette of PALETTES) {
    const dir = path.resolve(ROOT, out, palette.id);
    await mkdir(dir, { recursive: true });
    for (const asset of ALL_ASSETS) {
      const raster = await readRaster(path.join(ROOT, asset.file));
      await writeFile(
        path.join(dir, path.basename(asset.file)),
        await encodePng(recolour(asset, raster, palette)),
      );
    }
  }
}

async function main(): Promise<void> {
  const command = process.argv[2];
  const out = option("--out");
  if (command === "mask" && out !== undefined) return mask(out);
  if (command === "apply" && out !== undefined) return apply(out);
  if (command === "sheets" && out !== undefined)
    return sheets(path.resolve(ROOT, out), option("--copy"));
  if (command === "measure") return measure(out);
  throw new Error(
    "usage: palette.ts mask|apply|sheets --out DIR [--copy DIR], or measure [--out DIR]",
  );
}

main().catch((error: unknown) => {
  process.stderr.write(
    `${error instanceof Error ? (error.stack ?? error.message) : String(error)}\n`,
  );
  process.exitCode = 1;
});
