/**
 * The Cult's palette 1 tweak (bead pulp_wars-mch9.60). The user
 * (2026-10-20): "make the familiar match the color of the other summons and
 * have the accents on the robes match that hue as well. I want this to be
 * consistent. -- the purple body of the cultist galleon and gondola is
 * slightly nonsensical. make it wood colored and keep the purple on
 * teal/aquamarine accents on the sails and other elements."
 *
 * The tweak is the `cult-royal-teal` preset of the remap step
 * (scripts/art/chibi/remap.ts) and the rules of
 * scripts/art/cult-palette-mch959/assets.ts (the Familiar's `body:
 * "summon"`, the ships' `wood` boxes); no PixelLab call is made.
 *
 *   tsx scripts/art/cult-palette-mch960/apply.ts mask --out DIR
 *       what the classifier changes, per asset, x4, on the master before
 *       the remap (main cyan, dark yellow, trim magenta, glow green, summon
 *       blue, wood orange, the rest dimmed)
 *   tsx scripts/art/cult-palette-mch960/apply.ts apply
 *       every asset of the list whose manifest `remap` is not the list's
 *       (or whose recorded palette is not the preset's) gets the list's,
 *       and its master is re-derived in place from the
 *       recorded candidate (the class derivation and the accent, then the
 *       new remap; same id, canvas and anchor), so `npm run art:validate`
 *       re-derives it; an asset already up to date is left alone
 *
 * The campaign picture is remapped by its own bake
 * (scripts/art/campaign-pictures.ts, the `remap` of its picture entry) and
 * the submerged Kraken by scripts/art/naval-branch/submerged.ts.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import {
  batchManifestPath,
  encodePng,
  listBatches,
  loadBatchManifest,
  loadRecords,
  pixelSha256,
  productionLayout,
  rederivedBeforeRemap,
  remapMaster,
  saveRecords,
  sha256,
  type AssetRecord,
} from "../chibi/pipeline";
import type { ChibiAssetSpec } from "../chibi/batch-manifest";
import { remapClassify, remapPreset, type RemapKind } from "../chibi/remap";
import { blank, blit, writeSheet } from "../ice-folk-direction/raster-tools";
import {
  CULT_REMAP_ASSETS,
  CULT_REMAP_PRESET,
} from "../cult-palette-mch959/assets";

const ROOT = process.cwd();

const DEBUG: Record<RemapKind, readonly [number, number, number]> = {
  main: [0, 255, 255],
  dark: [255, 230, 0],
  trim: [255, 0, 255],
  glow: [0, 255, 0],
  summon: [40, 90, 255],
  wood: [255, 140, 0],
};

/** The batches that hold the list's assets, with their ids. */
async function batchesOfList(): Promise<Map<string, string[]>> {
  const wanted = new Set(CULT_REMAP_ASSETS.map((entry) => entry.id));
  const byBatch = new Map<string, string[]>();
  for (const batch of await listBatches(ROOT)) {
    const manifest = await loadBatchManifest(ROOT, batch);
    const ids = manifest.assets
      .map((asset) => asset.id)
      .filter((id) => wanted.has(id));
    if (ids.length === 0) continue;
    byBatch.set(batch, ids);
    for (const id of ids) wanted.delete(id);
  }
  for (const id of wanted) throw new Error(`${id}: in no batch manifest`);
  return byBatch;
}

/** The manifest entry with `remap` placed right after `accent`. */
function withRemap(
  asset: ChibiAssetSpec,
  remap: NonNullable<ChibiAssetSpec["remap"]>,
): ChibiAssetSpec {
  const entries = Object.entries(asset).filter(([key]) => key !== "remap");
  const at = entries.findIndex(([key]) => key === "accent");
  entries.splice(at < 0 ? entries.length : at + 1, 0, ["remap", remap]);
  return Object.fromEntries(entries) as unknown as ChibiAssetSpec;
}

const PALETTE = remapPreset(CULT_REMAP_PRESET);

const RULES = new Map(CULT_REMAP_ASSETS.map((entry) => [entry.id, entry]));

async function mask(out: string): Promise<void> {
  const scale = 4;
  const dir = path.resolve(ROOT, out);
  await mkdir(dir, { recursive: true });
  for (const [batch, ids] of await batchesOfList()) {
    const manifest = await loadBatchManifest(ROOT, batch);
    const records = await loadRecords(productionLayout(ROOT, batch), batch);
    for (const id of ids) {
      const record = records.assets[id] as AssetRecord;
      const rules = RULES.get(id)?.rules;
      if (rules === undefined) throw new Error(id);
      const raster = await rederivedBeforeRemap(
        ROOT,
        manifest,
        records,
        record,
      );
      const debug = new Uint8Array(raster.data);
      for (let y = 0; y < raster.height; y += 1)
        for (let x = 0; x < raster.width; x += 1) {
          const p = (y * raster.width + x) * 4;
          if ((raster.data[p + 3] ?? 0) === 0) continue;
          const rgb = [
            raster.data[p] ?? 0,
            raster.data[p + 1] ?? 0,
            raster.data[p + 2] ?? 0,
          ] as const;
          const kind = remapClassify(rules, rgb, x, y, PALETTE);
          debug.set(
            kind === undefined
              ? rgb.map((value) => Math.round(value * 0.45))
              : DEBUG[kind],
            p,
          );
        }
      const canvas = blank(
        raster.width * scale * 2 + 24,
        raster.height * scale + 16,
        [60, 64, 70],
      );
      blit(canvas, raster, 8, 8, scale);
      blit(
        canvas,
        { width: raster.width, height: raster.height, data: debug },
        raster.width * scale + 16,
        8,
        scale,
      );
      await writeSheet(path.join(dir, `mask-${id}.png`), canvas, []);
    }
  }
  console.log(`wrote ${CULT_REMAP_ASSETS.length} masks to ${dir}`);
}

async function apply(): Promise<void> {
  for (const [batch, ids] of await batchesOfList()) {
    const manifestFile = batchManifestPath(ROOT, batch);
    const manifest = JSON.parse(await readFile(manifestFile, "utf8")) as {
      assets: ChibiAssetSpec[];
    };
    const loaded = await loadBatchManifest(ROOT, batch);
    const layout = productionLayout(ROOT, batch);
    const records = await loadRecords(layout, batch);
    let changed = 0;
    for (const id of ids) {
      const record = records.assets[id] as AssetRecord;
      if (record.status !== "ACCEPTED")
        throw new Error(`${id}: not accepted in batch ${batch}`);
      const remap = {
        preset: CULT_REMAP_PRESET,
        rules: (RULES.get(id) as (typeof CULT_REMAP_ASSETS)[number]).rules,
      };
      const index = manifest.assets.findIndex((asset) => asset.id === id);
      const current = manifest.assets[index] as ChibiAssetSpec;
      if (
        JSON.stringify(current.remap) === JSON.stringify(remap) &&
        JSON.stringify(record.derivation.remap?.palette) ===
          JSON.stringify(PALETTE)
      )
        continue;
      const masterFile = path.join(ROOT, record.master.path);
      if (sha256(await readFile(masterFile)) !== record.master.sha256)
        throw new Error(`${id}: the master is not the recorded one`);
      // The master before any remap, from the candidate as recorded.
      const base = await rederivedBeforeRemap(ROOT, loaded, records, record);
      const asset = withRemap(current, remap);
      manifest.assets[index] = asset;
      const { remap: _old, ...derivation } = record.derivation;
      void _old;
      const derived = remapMaster(asset, { raster: base, derivation });
      const png = await encodePng(derived.raster);
      await writeFile(masterFile, png);
      records.assets[id] = {
        ...record,
        master: {
          ...record.master,
          sha256: sha256(png),
          pixelSha256: pixelSha256(derived.raster),
        },
        derivation: derived.derivation,
      };
      const pixels = derived.derivation.remap?.pixels ?? {};
      console.log(
        `${batch} ${id}: ${Object.entries(pixels)
          .map(([kind, count]) => `${kind} ${count}`)
          .join(" ")}`,
      );
      changed += 1;
    }
    if (changed === 0) continue;
    await writeFile(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`);
    await saveRecords(layout, records);
  }
}

async function main(): Promise<void> {
  const command = process.argv[2];
  const index = process.argv.indexOf("--out");
  const out = index < 0 ? undefined : process.argv[index + 1];
  if (command === "mask" && out !== undefined) return mask(out);
  if (command === "apply") return apply();
  throw new Error("usage: apply.ts mask --out DIR | apply");
}

main().catch((error: unknown) => {
  process.stderr.write(
    `${error instanceof Error ? (error.stack ?? error.message) : String(error)}\n`,
  );
  process.exitCode = 1;
});
