import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { batchManifestProblems } from "../../scripts/art/chibi/batch-manifest";
import { rgbToHsv, type RgbaRaster } from "../../scripts/art/chibi/owner-mask";
import {
  loadBatchManifest,
  loadFragments,
  loadRecords,
  productionLayout,
  readRaster,
  verifyAssetRecord,
} from "../../scripts/art/chibi/pipeline";
import { opaqueBounds } from "../../scripts/art/chibi/raster";
import type { ArtSubjectV7 } from "../../src/assets/chibi-art-v7";
import { chibiDirectionArtRegistryV7 } from "../../src/assets/chibi-direction-art-manifest";
import { CHIBI_DIRECTION_CULT_SUMMONS_ART_ASSETS_V7 } from "../../src/assets/chibi-direction-cult-summons-art-manifest";

/**
 * The Cult redesign's art (bead pulp_wars-mch9.45, ART-R1;
 * docs/product/RULESET_7_CULT_REDESIGN.md section 14 and
 * docs/art/factions/CULT.md, "The redesign's summons"): the Imp and the
 * Gibbering Mass, bound and Unbound, their portraits, and the redesign's
 * icons, in batch `summons-cult`. They are accepted and validated here; the
 * bead that puts each in play registers it in the runtime, in one manifest
 * of the batch (src/assets/chibi-direction-cult-summons-art-manifest.ts):
 * the Imp's sprite, Unbound look and portrait with engine bead
 * pulp_wars-mch9.36, the Hunger bowl with pulp_wars-mch9.42, the Mass and
 * the other icons with U-R2 and U-R3.
 */
const ROOT = process.cwd();
const BATCH = "summons-cult";

/** Asset, subject, asset class, canvas, recipe class, accent, margin. */
const ASSETS = [
  [
    "chibi-direction-cult-imp",
    "UNIT:CULT:IMP",
    "STANDARD_UNIT",
    56,
    80,
    "creature",
    "cult-green",
    4,
  ],
  [
    "chibi-direction-cult-mass",
    "UNIT:CULT:MASS",
    "LARGE_UNIT",
    72,
    88,
    "creature",
    "cult-green",
    6,
  ],
  [
    "chibi-direction-portrait-cult-imp",
    "PORTRAIT:CULT:IMP",
    "PORTRAIT",
    48,
    48,
    "creature",
    "cult-green",
    null,
  ],
  [
    "chibi-direction-portrait-cult-mass",
    "PORTRAIT:CULT:MASS",
    "PORTRAIT",
    48,
    48,
    "creature",
    "cult-green",
    6,
  ],
  [
    "chibi-direction-icon-cult-action-summon-imp",
    "ICON:ACTION:SUMMON_IMP",
    "ICON",
    48,
    48,
    "icon",
    "cult-summoned-icon",
    null,
  ],
  [
    "chibi-direction-icon-cult-action-summon-horror",
    "ICON:ACTION:SUMMON_HORROR",
    "ICON",
    48,
    48,
    "icon",
    "cult-summoned-icon",
    null,
  ],
  [
    "chibi-direction-icon-cult-action-summon-mass",
    "ICON:ACTION:SUMMON_MASS",
    "ICON",
    48,
    48,
    "icon",
    "cult-summoned-icon",
    null,
  ],
  [
    "chibi-direction-icon-cult-action-brood",
    "ICON:ACTION:BROOD",
    "ICON",
    48,
    48,
    "icon",
    "cult-summoned-icon",
    null,
  ],
  [
    "chibi-direction-icon-cult-action-swarm",
    "ICON:ACTION:SWARM",
    "ICON",
    48,
    48,
    "icon",
    "cult-summoned-icon",
    null,
  ],
  [
    "chibi-direction-icon-cult-action-doorstep",
    "ICON:ACTION:DOORSTEP",
    "ICON",
    48,
    48,
    "icon",
    "cult-lodge-icon",
    null,
  ],
  [
    "chibi-direction-icon-cult-action-drag",
    "ICON:ACTION:DRAG",
    "ICON",
    48,
    48,
    "icon",
    "cult-summoned-icon",
    null,
  ],
  [
    "chibi-direction-icon-cult-action-join-chant",
    "ICON:ACTION:JOIN_CHANT",
    "ICON",
    48,
    48,
    "icon",
    "cult-lodge-icon",
    null,
  ],
  [
    "chibi-direction-icon-cult-hunger",
    "ICON:HUD:CULT:HUNGER",
    "ICON",
    48,
    48,
    "icon",
    "cult-lodge-icon",
    null,
  ],
  [
    "chibi-direction-cult-imp-unbound",
    "UNIT:CULT:IMP_UNBOUND",
    "STANDARD_UNIT",
    56,
    80,
    "creature",
    "cult-green",
    4,
  ],
  [
    "chibi-direction-cult-mass-unbound",
    "UNIT:CULT:MASS_UNBOUND",
    "LARGE_UNIT",
    72,
    88,
    "creature",
    "cult-green",
    6,
  ],
] as const;

interface Hsv {
  readonly hue: number;
  readonly saturation: number;
  readonly value: number;
}
function hsvPixels(source: RgbaRaster): Hsv[] {
  const out: Hsv[] = [];
  for (let index = 0; index < source.width * source.height; index += 1)
    if ((source.data[index * 4 + 3] ?? 0) >= 128)
      out.push(
        rgbToHsv(
          source.data[index * 4] ?? 0,
          source.data[index * 4 + 1] ?? 0,
          source.data[index * 4 + 2] ?? 0,
        ),
      );
  return out;
}
const isRed = (p: Hsv): boolean =>
  (p.hue >= 345 || p.hue <= 12) && p.saturation >= 0.5 && p.value >= 0.35;
const isViolet = (p: Hsv): boolean =>
  p.hue >= 270 && p.hue < 345 && p.saturation >= 0.3 && p.value >= 0.25;
const isGreen = (p: Hsv): boolean =>
  p.hue >= 80 && p.hue <= 152 && p.saturation >= 0.5 && p.value >= 0.45;
const isTeal = (p: Hsv): boolean =>
  p.hue > 152 && p.hue <= 205 && p.saturation >= 0.35 && p.value >= 0.14;

const unit = (id: string): Promise<RgbaRaster> =>
  readRaster(path.join(ROOT, "public/assets/chibi/units", `${id}.png`));
function box(raster: RgbaRaster): { width: number; height: number } {
  const bounds = opaqueBounds(raster);
  if (bounds === null) throw new Error("empty sprite");
  return {
    width: bounds.right - bounds.left + 1,
    height: bounds.bottom - bounds.top + 1,
  };
}

describe("the Cult redesign's summons art (pulp_wars-mch9.45)", () => {
  it("is a valid fixed-colour Cult batch holding the redesign's fifteen pieces", async () => {
    const manifest = await loadBatchManifest(ROOT, BATCH);
    const fragments = await loadFragments(ROOT);
    expect(batchManifestProblems(manifest, fragments, BATCH)).toEqual([]);
    expect(manifest.faction).toBe("CULT");
    expect(manifest.fixedFactionColours).toBe(true);
    expect(manifest.bead).toBe("pulp_wars-mch9.45");
    expect(
      manifest.assets.map((asset) => [
        asset.id,
        asset.subject,
        asset.assetClass,
        asset.canvas.width,
        asset.canvas.height,
        asset.recipeClass,
        asset.accent,
        asset.bottomMargin ?? null,
      ]),
    ).toEqual(ASSETS.map((row) => [...row]));
    // Every subject has its line in the Cult subjects file.
    const subjects = JSON.parse(
      await readFile(
        path.join(ROOT, "scripts/art/chibi/subjects/CULT.json"),
        "utf8",
      ),
    ) as { subjects: Record<string, string> };
    for (const [, subject] of ASSETS)
      expect(subjects.subjects[subject], subject).toMatch(/^Subject: /);
  });

  it("accepted every piece with its accent, re-derivable, and reviewed every recipe", async () => {
    const manifest = await loadBatchManifest(ROOT, BATCH);
    const records = await loadRecords(productionLayout(ROOT, BATCH), BATCH);
    for (const [id, subject, , width, height, , accent, margin] of ASSETS) {
      const record = records.assets[id];
      expect(record?.status, id).toBe("ACCEPTED");
      if (record === undefined) continue;
      expect(record.subject, id).toBe(subject);
      expect(record.mask, id).toBeUndefined();
      expect([record.master.width, record.master.height], id).toEqual([
        width,
        height,
      ]);
      // A unit generated smaller than its canvas is padded and seated on
      // its foot line (the Mass portrait too, drawn wide as its sprite was);
      // the Imp portrait and the icons are kept as drawn.
      expect(record.derivation.kind, id).toBe(
        margin === null ? "as-is" : "seated",
      );
      expect(record.derivation.accent?.preset, id).toBe(accent);
      expect(await verifyAssetRecord(ROOT, manifest, record), id).toEqual([]);
    }
    for (const recipe of manifest.recipes)
      expect(records.recipes[recipe.id]?.review?.verdict, recipe.id).toMatch(
        /^(ACCEPTED|REJECTED)$/,
      );
    // The creature recipes were sent without layer 3: no robe, hood or
    // green flame reaches a summoned thing.
    for (const recipe of manifest.recipes) {
      const asset = manifest.assets.find((entry) => entry.id === recipe.asset);
      const record = records.recipes[recipe.id];
      if (
        asset?.recipeClass !== "creature" ||
        recipe.endpoint !== "create-image-pixen" ||
        record === undefined
      )
        continue;
      const layers = record.request.layers.map((layer) => layer.layer);
      expect(layers, recipe.id).toContain("light");
      expect(layers, recipe.id).not.toContain("faction");
    }
    // The Unbound looks are edits of the accepted bound sprites.
    const accepted = (id: string): string | undefined =>
      records.assets[id]?.recipe;
    const source = (recipe: string | undefined) =>
      manifest.recipes.find((entry) => entry.id === recipe)?.source;
    for (const [bound, unbound] of [
      ["chibi-direction-cult-imp", "chibi-direction-cult-imp-unbound"],
      ["chibi-direction-cult-mass", "chibi-direction-cult-mass-unbound"],
    ] as const) {
      const from = source(accepted(unbound));
      expect(from?.recipe, unbound).toBe(accepted(bound));
      expect(from?.sibling, unbound).toBe(true);
    }
  });

  it("keeps red for the Unbound looks, violet off every piece and the green on the faction's hue", async () => {
    const records = await loadRecords(productionLayout(ROOT, BATCH), BATCH);
    for (const [id] of ASSETS) {
      const record = records.assets[id];
      if (record === undefined) throw new Error(id);
      const pixels = hsvPixels(
        await readRaster(path.join(ROOT, record.master.path)),
      );
      expect(pixels.filter(isViolet).length, id).toBe(0);
      for (const green of pixels.filter(isGreen)) {
        expect(green.hue, id).toBeGreaterThanOrEqual(144);
        expect(green.hue, id).toBeLessThanOrEqual(152);
      }
      const red = pixels.filter(isRed).length;
      if (id.endsWith("-unbound"))
        // The Unbound cue: red eyes (CULT.md, "Red means broken").
        expect(red, id).toBeGreaterThanOrEqual(40);
      else expect(red, id).toBe(0);
      // The summoned are teal, never the lodge's indigo.
      if (record.subject.startsWith("UNIT:"))
        expect(
          pixels.filter(isTeal).length / pixels.length,
          id,
        ).toBeGreaterThan(0.4);
    }
  });

  it("draws the Imp smaller than the Horror and a cultist, and the Mass low and wide", async () => {
    const imp = box(await unit("chibi-direction-cult-imp"));
    const mass = box(await unit("chibi-direction-cult-mass"));
    const horror = box(await unit("chibi-direction-cult-horror"));
    const initiate = box(await unit("chibi-direction-cult-initiate"));
    const thing = box(await unit("chibi-direction-cult-thing"));
    // One of a swarm: smaller than the Horror both ways, lower than a cultist.
    expect(imp.width).toBeLessThan(horror.width);
    expect(imp.height).toBeLessThan(horror.height);
    expect(imp.height).toBeLessThan(initiate.height);
    // A heap: wider than tall, and smaller than the Thing in the Cellar.
    expect(mass.width).toBeGreaterThan(mass.height);
    expect(mass.width).toBeLessThan(thing.width);
    expect(mass.height).toBeLessThan(thing.height);
    // The Unbound looks keep their bound sprite's outline.
    expect(box(await unit("chibi-direction-cult-imp-unbound"))).toEqual(imp);
    expect(box(await unit("chibi-direction-cult-mass-unbound"))).toEqual(mass);
  });

  it("registers the Imp (pulp_wars-mch9.36) and the Hunger bowl (pulp_wars-mch9.42) in one manifest on their records' canvases, and nothing else yet", async () => {
    const records = await loadRecords(productionLayout(ROOT, BATCH), BATCH);
    expect(
      CHIBI_DIRECTION_CULT_SUMMONS_ART_ASSETS_V7.map((asset) => asset.id),
    ).toEqual([
      "chibi-direction-cult-imp",
      "chibi-direction-cult-imp-unbound",
      "chibi-direction-portrait-cult-imp",
      "chibi-direction-icon-cult-hunger",
    ]);
    for (const asset of CHIBI_DIRECTION_CULT_SUMMONS_ART_ASSETS_V7) {
      const record = records.assets[asset.id];
      expect(record?.status, asset.id).toBe("ACCEPTED");
      expect(asset.subject, asset.id).toBe(record?.subject);
      expect([asset.width, asset.height], asset.id).toEqual([
        record?.master.width,
        record?.master.height,
      ]);
      expect(
        asset.url.endsWith(
          (record?.master.path ?? "?").replace(/^public\//, ""),
        ),
        asset.id,
      ).toBe(true);
    }
    const registry = chibiDirectionArtRegistryV7();
    expect(registry.variants("ICON:HUD:CULT:HUNGER")[0]?.id).toBe(
      "chibi-direction-icon-cult-hunger",
    );
    for (const subject of [
      "UNIT:CULT:IMP",
      "UNIT:CULT:IMP_UNBOUND",
      "PORTRAIT:CULT:IMP",
    ] as const)
      expect(registry.variants(subject).map((asset) => asset.id)).toEqual([
        CHIBI_DIRECTION_CULT_SUMMONS_ART_ASSETS_V7.find(
          (asset) => asset.subject === subject,
        )?.id,
      ]);
    // The Mass waits for its bead.
    expect(registry.variants("UNIT:CULT:MASS" as ArtSubjectV7)).toEqual([]);
  });
});
