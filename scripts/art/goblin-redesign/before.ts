/**
 * The Goblin sprites as they were before the redesign (bead
 * pulp_wars-wrn.2). The redesign replaced the masters in place, so the
 * dark roster the study diagnosed is read from the superseded recipes'
 * recorded candidates in the raw sheets of batches `direction-goblin` and
 * `naval-goblin`; those masters were the candidates as generated (`as-is`),
 * so this is the old master pixel for pixel and no copy of it is kept.
 */
import path from "node:path";
import type { RgbaRaster } from "../chibi/owner-mask";
import { loadRecords, productionLayout, readRaster } from "../chibi/pipeline";
import { candidateCell, cropRaster } from "../chibi/raster";
import type { GoblinSpriteV7 } from "./directions";

type Raster = RgbaRaster & { readonly data: Uint8Array };

export async function loadGoblinBeforeV7(
  root: string,
  sprite: GoblinSpriteV7,
): Promise<Raster> {
  const { batch, recipe: id } = sprite.before;
  const records = await loadRecords(productionLayout(root, batch), batch);
  const recipe = records.recipes[id];
  if (recipe?.rawSheet === undefined || recipe.candidateSize === undefined)
    throw new Error(`${batch}/${id}: no raw sheet`);
  const sheet = await readRaster(path.join(root, recipe.rawSheet));
  return cropRaster(sheet, {
    ...candidateCell(0, recipe.candidateCount ?? 1, recipe.candidateSize),
    ...recipe.candidateSize,
  }) as Raster;
}
