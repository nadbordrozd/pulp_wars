/**
 * The Cult's palette 1 in production (bead pulp_wars-mch9.59). The user
 * (2026-10-20): "go with cultists color scheme 1." Scheme 1 of bead
 * pulp_wars-mch9.58 is royal purple (#6a2f93) with aquamarine (#4fe3c1)
 * accents, a deterministic remap of the accepted pixels; no PixelLab call
 * is made.
 *
 *   tsx scripts/art/cult-palette-mch959/apply.ts mask --out DIR
 *       before the remap: what the classifier changes, per asset, x4 (main
 *       cyan, dark yellow, trim magenta, glow green, the rest dimmed)
 *   tsx scripts/art/cult-palette-mch959/apply.ts apply
 *       names `remap: { preset: "cult-royal-aqua", rules }` on every asset
 *       of ./assets.ts in its batch manifest, re-derives its master in
 *       place (same id, canvas and anchor) and records the step, so
 *       `npm run art:validate` re-derives the master from its candidate;
 *       an asset already remapped is left alone
 *   tsx scripts/art/cult-palette-mch959/apply.ts effects
 *       the fifteen effect sprites: a palette swap from cult-green.png to
 *       cult-purple.png (their indigo to purple, the green kept)
 *
 * The campaign picture is remapped by its own bake
 * (scripts/art/campaign-pictures.ts, the `remap` of its picture entry) and
 * the submerged Kraken by scripts/art/naval-branch/submerged.ts.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import {
  encodePng,
  listBatches,
  loadBatchManifest,
  batchManifestPath,
  loadRecords,
  pixelSha256,
  productionLayout,
  readRaster,
  remapMaster,
  saveRecords,
  sha256,
  type AssetRecord,
} from "../chibi/pipeline";
import type { ChibiAssetSpec } from "../chibi/batch-manifest";
import { paletteColours, paletteSwapRaster } from "../chibi/raster";
import { remapClassify, type RemapKind } from "../chibi/remap";
import {
  CULT_GREEN_PALETTE_PATH,
  CULT_PURPLE_PALETTE_PATH,
} from "../cult-direction/green-palette";
import { blank, blit, writeSheet } from "../ice-folk-direction/raster-tools";
import { CULT_REMAP_ASSETS, CULT_REMAP_PRESET } from "./assets";

const ROOT = process.cwd();

interface Located {
  readonly batch: string;
  readonly asset: ChibiAssetSpec;
  readonly record: AssetRecord;
}

async function locate(): Promise<Map<string, Located>> {
  const wanted = new Set(CULT_REMAP_ASSETS.map((entry) => entry.id));
  const found = new Map<string, Located>();
  for (const batch of await listBatches(ROOT)) {
    const manifest = await loadBatchManifest(ROOT, batch);
    if (!manifest.assets.some((asset) => wanted.has(asset.id))) continue;
    const records = await loadRecords(productionLayout(ROOT, batch), batch);
    for (const asset of manifest.assets) {
      if (!wanted.has(asset.id)) continue;
      const record = records.assets[asset.id];
      if (record?.status !== "ACCEPTED")
        throw new Error(`${asset.id}: not accepted in batch ${batch}`);
      found.set(asset.id, { batch, asset, record });
    }
  }
  for (const id of wanted)
    if (!found.has(id)) throw new Error(`${id}: in no batch manifest`);
  return found;
}

const DEBUG: Record<RemapKind, readonly [number, number, number]> = {
  main: [0, 255, 255],
  dark: [255, 230, 0],
  trim: [255, 0, 255],
  glow: [0, 255, 0],
};

async function mask(out: string): Promise<void> {
  const scale = 4;
  const dir = path.resolve(ROOT, out);
  await mkdir(dir, { recursive: true });
  const located = await locate();
  for (const entry of CULT_REMAP_ASSETS) {
    const { record } = located.get(entry.id) as Located;
    if (record.derivation.remap !== undefined)
      throw new Error(`${entry.id}: already remapped; mask the original`);
    const raster = await readRaster(path.join(ROOT, record.master.path));
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
        const kind = remapClassify(entry.rules, rgb, x, y);
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
    await writeSheet(path.join(dir, `mask-${entry.id}.png`), canvas, []);
  }
  console.log(`wrote ${CULT_REMAP_ASSETS.length} masks to ${dir}`);
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

async function apply(): Promise<void> {
  const located = await locate();
  const byBatch = new Map<string, string[]>();
  for (const entry of CULT_REMAP_ASSETS) {
    const { batch } = located.get(entry.id) as Located;
    byBatch.set(batch, [...(byBatch.get(batch) ?? []), entry.id]);
  }
  const rules = new Map(CULT_REMAP_ASSETS.map((entry) => [entry.id, entry]));
  for (const [batch, ids] of byBatch) {
    const manifestFile = batchManifestPath(ROOT, batch);
    const manifest = JSON.parse(await readFile(manifestFile, "utf8")) as {
      assets: ChibiAssetSpec[];
    };
    const layout = productionLayout(ROOT, batch);
    const records = await loadRecords(layout, batch);
    let changed = 0;
    for (const id of ids) {
      const record = records.assets[id] as AssetRecord;
      if (record.derivation.remap !== undefined) continue;
      const remap = {
        preset: CULT_REMAP_PRESET,
        rules: (rules.get(id) as (typeof CULT_REMAP_ASSETS)[number]).rules,
      };
      const index = manifest.assets.findIndex((asset) => asset.id === id);
      const asset = withRemap(manifest.assets[index] as ChibiAssetSpec, remap);
      manifest.assets[index] = asset;
      const masterFile = path.join(ROOT, record.master.path);
      const bytes = await readFile(masterFile);
      if (sha256(bytes) !== record.master.sha256)
        throw new Error(`${id}: the master is not the recorded one`);
      const derived = remapMaster(asset, {
        raster: await readRaster(bytes),
        derivation: record.derivation,
      });
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
      const pixels = derived.derivation.remap?.pixels;
      console.log(
        `${batch} ${id}: main ${pixels?.main} dark ${pixels?.dark} trim ${pixels?.trim} glow ${pixels?.glow}`,
      );
      changed += 1;
    }
    if (changed === 0) continue;
    await writeFile(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`);
    await saveRecords(layout, records);
  }
}

/**
 * The fifteen effects (batch effects-cult): a `palette-map` swap from
 * cult-green.png to cult-purple.png (scripts/art/cult-direction/
 * green-palette.ts), the pipeline's own recolour of an accepted effect.
 */
async function effects(): Promise<void> {
  const batch = "effects-cult";
  const green = {
    path: CULT_GREEN_PALETTE_PATH,
    sha256: sha256(await readFile(path.join(ROOT, CULT_GREEN_PALETTE_PATH))),
  };
  const purple = {
    path: CULT_PURPLE_PALETTE_PATH,
    sha256: sha256(await readFile(path.join(ROOT, CULT_PURPLE_PALETTE_PATH))),
  };
  const from = paletteColours(
    await readRaster(path.join(ROOT, CULT_GREEN_PALETTE_PATH)),
  );
  const to = paletteColours(
    await readRaster(path.join(ROOT, CULT_PURPLE_PALETTE_PATH)),
  );
  const manifestFile = batchManifestPath(ROOT, batch);
  const manifest = JSON.parse(await readFile(manifestFile, "utf8")) as {
    assets: ChibiAssetSpec[];
  };
  const layout = productionLayout(ROOT, batch);
  const records = await loadRecords(layout, batch);
  let changed = 0;
  manifest.assets = await Promise.all(
    manifest.assets.map(async (asset) => {
      const record = records.assets[asset.id];
      if (
        record === undefined ||
        asset.palette?.path !== CULT_GREEN_PALETTE_PATH ||
        asset.paletteFrom !== undefined
      )
        return asset;
      const masterFile = path.join(ROOT, record.master.path);
      const bytes = await readFile(masterFile);
      if (sha256(bytes) !== record.master.sha256)
        throw new Error(`${asset.id}: the master is not the recorded one`);
      const swapped = paletteSwapRaster(await readRaster(bytes), from, to);
      const png = await encodePng(swapped);
      await writeFile(masterFile, png);
      records.assets[asset.id] = {
        ...record,
        master: {
          ...record.master,
          sha256: sha256(png),
          pixelSha256: pixelSha256(swapped),
        },
        derivation: {
          kind: "palette-map",
          palette: purple,
          paletteFrom: green,
        },
      };
      changed += 1;
      console.log(`${batch} ${asset.id}: swapped to cult-purple.png`);
      return { ...asset, palette: purple, paletteFrom: green };
    }),
  );
  if (changed === 0) return;
  await writeFile(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`);
  await saveRecords(layout, records);
}

async function main(): Promise<void> {
  const command = process.argv[2];
  const index = process.argv.indexOf("--out");
  const out = index < 0 ? undefined : process.argv[index + 1];
  if (command === "mask" && out !== undefined) return mask(out);
  if (command === "apply") return apply();
  if (command === "effects") return effects();
  throw new Error("usage: apply.ts mask --out DIR | apply | effects");
}

main().catch((error: unknown) => {
  process.stderr.write(
    `${error instanceof Error ? (error.stack ?? error.message) : String(error)}\n`,
  );
  process.exitCode = 1;
});
