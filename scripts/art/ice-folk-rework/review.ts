/**
 * Review evidence of the Ice Folk rework art (bead pulp_wars-s55m.3, batch
 * `direction-ice-folk-rework`, docs/art/factions/ICE_FOLK.md "The rework
 * units"): the Frost Wyrm, the Walrus and the Snow Golem beside the Ice
 * Folk units already in the game. No PixelLab call is made.
 *
 *   tsx scripts/art/ice-folk-rework/review.ts [--out DIR] [--copy-to DIR]
 *   tsx scripts/art/ice-folk-rework/review.ts --candidates --out DIR
 *
 * Default: writes art/pixellab/reviews/chibi-batch-direction-ice-folk-rework/
 * (or `--out DIR`):
 *
 * - `roster-{1x,x2,x4}.png`: every Ice Folk unit master on Grass and on the
 *   Snow overlay over Grass, the three new units last, at native scale and
 *   enlarged by whole pixels;
 * - `replacements-{1x,x4}.png`: each replaced unit beside its replacement
 *   (Sabretooth and Frost Wyrm, Musk Ox and Walrus, Boulder Yeti and Snow
 *   Golem) and beside the Mammoth and the Yeti, which the user said the old
 *   pair looked like;
 * - `portraits-{1x,x2,x4}.png`: every Ice Folk portrait, the new last;
 * - `index.json`: sizes, accent shares, the lowest row of each unit (the
 *   Frost Wyrm's gap under it) and the files.
 *
 * `--copy-to DIR` also copies the sheets there.
 *
 * `--candidates --out DIR` instead draws every generated candidate of the
 * batch (after the recorded or would-be accent step and seat) at 1:1 and x4
 * on Grass, Snow and Mountain rock, for the generate-inspect loop.
 */
import { copyFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { iceFolkSnowTileV7 } from "../../../src/assets/chibi-direction-ice-folk-presentation";
import { accentPreset, accentRaster } from "../chibi/accent";
import type { RgbaRaster } from "../chibi/owner-mask";
import {
  loadBatchManifest,
  loadRecords,
  productionLayout,
  readRaster,
} from "../chibi/pipeline";
import {
  candidateCell,
  cropRaster,
  opaqueBounds,
  seatedRaster,
} from "../chibi/raster";
import { rgbOf, type Rgb } from "../ice-folk-direction/colour";
import {
  blank,
  blit,
  fill,
  writeSheet,
  type Canvas,
  type Label,
} from "../ice-folk-direction/raster-tools";

const ROOT = process.cwd();
const BATCH = "direction-ice-folk-rework";
const BACKDROP: Rgb = [38, 42, 52];
const ROCK: Rgb = rgbOf("#a2aab6");

/** The Ice Folk units in the game, then the three new ones. */
const OLD_UNITS = [
  ["Yeti", "yeti"],
  ["Sled", "sled"],
  ["Snow Hunter", "snow-hunter"],
  ["Mammoth", "mammoth"],
  ["Ice Witch", "ice-witch"],
  ["Boulder Yeti", "boulder-yeti"],
  ["Sabretooth", "sabretooth"],
  ["Musk Ox", "musk-ox"],
  ["Frost Giant", "frost-giant"],
] as const;
const NEW_UNITS = [
  ["Frost Wyrm", "frost-wyrm"],
  ["Walrus", "walrus"],
  ["Snow Golem", "snow-golem"],
] as const;
const PAIRS = [
  ["sabretooth", "frost-wyrm", "Sabretooth > Frost Wyrm"],
  ["musk-ox", "walrus", "Musk Ox > Walrus"],
  ["boulder-yeti", "snow-golem", "Boulder Yeti > Snow Golem"],
] as const;

function option(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  const value = index < 0 ? undefined : process.argv[index + 1];
  return value === undefined || value.startsWith("--") ? undefined : value;
}

const unitFile = (name: string): string =>
  path.join(
    ROOT,
    "public/assets/chibi/units",
    `chibi-direction-ice-folk-${name}.png`,
  );
const portraitFile = (name: string): string =>
  path.join(
    ROOT,
    "public/assets/chibi/portraits",
    `chibi-direction-portrait-ice-folk-${name}.png`,
  );

/** An 80 x 80 Grass tile, optionally under the Ice Folk Snow overlay. */
async function groundTile(snow: boolean): Promise<Canvas> {
  const grass = await readRaster(
    path.join(ROOT, "public/assets/chibi/terrain/chibi-grass-1.png"),
  );
  const tile = blank(80, 80, BACKDROP);
  blit(tile, grass, 0, 0);
  if (snow) {
    const overlay = iceFolkSnowTileV7(
      { north: false, east: false, south: false, west: false },
      1,
    );
    blit(
      tile,
      { width: overlay.width, height: overlay.height, data: overlay.data },
      0,
      0,
    );
  }
  return tile;
}

/** The tallest canvas (the giant's): every cell is this tall. */
const CELL_HEIGHT = 104;

/**
 * One unit on its cell, as the board draws it: the tile at the bottom of
 * the cell and the canvas bottom-centred on the tile's bottom edge, so a
 * taller canvas overflows upward.
 */
function placeUnit(
  target: Canvas,
  tile: Canvas,
  sprite: RgbaRaster,
  left: number,
  top: number,
  scale: number,
): void {
  const bottom = top + CELL_HEIGHT * scale;
  blit(target, tile, left, bottom - 80 * scale, scale);
  blit(
    target,
    sprite,
    left + ((80 - sprite.width) / 2) * scale,
    bottom - sprite.height * scale,
    scale,
  );
}

async function rosterSheet(
  file: string,
  units: readonly (readonly [string, RgbaRaster])[],
  scale: number,
): Promise<void> {
  const cell = CELL_HEIGHT * scale + 8;
  const labelRow = scale >= 2 ? 22 : 14;
  const width = units.length * (80 * scale + 8) + 8;
  const height = 2 * (cell + labelRow) + 8;
  const sheet = blank(width, height, BACKDROP);
  const labels: Label[] = [];
  const tiles = [await groundTile(false), await groundTile(true)];
  tiles.forEach((tile, row) => {
    units.forEach(([name, sprite], index) => {
      const left = 8 + index * (80 * scale + 8);
      const top = 8 + row * (cell + labelRow) + labelRow;
      placeUnit(sheet, tile, sprite, left, top, scale);
      if (row === 0)
        labels.push({
          text: name,
          left,
          top: top - labelRow,
          size: scale >= 2 ? 14 : 9,
        });
    });
  });
  await writeSheet(file, sheet, labels);
}

async function portraitSheet(
  file: string,
  portraits: readonly (readonly [string, RgbaRaster])[],
  scale: number,
): Promise<void> {
  const cell = 48 * scale + 8;
  const labelRow = scale >= 2 ? 20 : 12;
  const width = portraits.length * cell + 8;
  const height = 2 * (cell + labelRow) + 8;
  const sheet = blank(width, height, BACKDROP);
  const labels: Label[] = [];
  // The interface plates: the cream card and the dark dock.
  const plates: Rgb[] = [rgbOf("#efe6d2"), rgbOf("#2b3140")];
  plates.forEach((plate, row) => {
    portraits.forEach(([name, raster], index) => {
      const left = 8 + index * cell;
      const top = 8 + row * (cell + labelRow) + labelRow;
      fill(sheet, left, top, 48 * scale, 48 * scale, plate);
      blit(sheet, raster, left, top, scale);
      if (row === 0)
        labels.push({
          text: name,
          left,
          top: top - labelRow,
          size: scale >= 2 ? 12 : 8,
        });
    });
  });
  await writeSheet(file, sheet, labels);
}

function stats(raster: RgbaRaster): {
  width: number;
  height: number;
  lowestRow: number;
  opaque: number;
} {
  const box = opaqueBounds(raster);
  let opaque = 0;
  for (let index = 3; index < raster.data.length; index += 4)
    if ((raster.data[index] ?? 0) >= 128) opaque += 1;
  return {
    width: box === null ? 0 : box.right - box.left + 1,
    height: box === null ? 0 : box.bottom - box.top + 1,
    lowestRow: box?.bottom ?? -1,
    opaque,
  };
}

async function evidence(
  out: string,
  copyTo: string | undefined,
): Promise<void> {
  await mkdir(out, { recursive: true });
  const units: [string, RgbaRaster][] = [];
  for (const [name, id] of [...OLD_UNITS, ...NEW_UNITS])
    units.push([name, await readRaster(unitFile(id))]);
  const portraits: [string, RgbaRaster][] = [];
  for (const [name, id] of [...OLD_UNITS, ...NEW_UNITS])
    portraits.push([name, await readRaster(portraitFile(id))]);
  const files: string[] = [];
  for (const [scale, suffix] of [
    [1, "1x"],
    [2, "x2"],
    [4, "x4"],
  ] as const) {
    await rosterSheet(path.join(out, `roster-${suffix}.png`), units, scale);
    await portraitSheet(
      path.join(out, `portraits-${suffix}.png`),
      portraits,
      scale,
    );
    files.push(`roster-${suffix}.png`, `portraits-${suffix}.png`);
  }
  const byId = new Map<string, RgbaRaster>();
  for (const [, id] of [...OLD_UNITS, ...NEW_UNITS])
    byId.set(id, await readRaster(unitFile(id)));
  for (const [scale, suffix] of [
    [1, "1x"],
    [4, "x4"],
  ] as const) {
    const lineup: [string, RgbaRaster][] = [];
    for (const [old, fresh, title] of PAIRS) {
      const before = byId.get(old);
      const after = byId.get(fresh);
      if (before === undefined || after === undefined) throw new Error(title);
      lineup.push([`${title.split(" > ")[0]} (old)`, before]);
      lineup.push([`${title.split(" > ")[1]} (new)`, after]);
    }
    for (const id of ["mammoth", "yeti"]) {
      const raster = byId.get(id);
      if (raster === undefined) throw new Error(id);
      lineup.push([id === "yeti" ? "Yeti" : "Mammoth", raster]);
    }
    await rosterSheet(
      path.join(out, `replacements-${suffix}.png`),
      lineup,
      scale,
    );
    files.push(`replacements-${suffix}.png`);
  }
  const spec = accentPreset("ice-folk-blue");
  if (spec === undefined) throw new Error("ice-folk-blue");
  const index = {
    bead: "pulp_wars-s55m.3",
    batch: BATCH,
    units: Object.fromEntries(
      [...OLD_UNITS, ...NEW_UNITS].map(([name, id]) => {
        const raster = byId.get(id);
        if (raster === undefined) throw new Error(id);
        const measured = stats(raster);
        return [
          id,
          {
            name,
            canvas: [raster.width, raster.height],
            sprite: [measured.width, measured.height],
            lowestRow: measured.lowestRow,
            new: NEW_UNITS.some(([, fresh]) => fresh === id),
          },
        ];
      }),
    ),
    files,
  };
  await writeFile(
    path.join(out, "index.json"),
    `${JSON.stringify(index, null, 2)}\n`,
  );
  if (copyTo !== undefined) {
    await mkdir(copyTo, { recursive: true });
    for (const file of [...files, "index.json"])
      await copyFile(path.join(out, file), path.join(copyTo, file));
  }
  console.log(`wrote ${files.length + 1} files to ${out}`);
}

async function candidates(out: string): Promise<void> {
  await mkdir(out, { recursive: true });
  const manifest = await loadBatchManifest(ROOT, BATCH);
  const records = await loadRecords(productionLayout(ROOT, BATCH), BATCH);
  const tiles: Canvas[] = [
    await groundTile(false),
    await groundTile(true),
    blank(80, 80, ROCK),
  ];
  const summary: Record<string, unknown> = {};
  for (const [id, record] of Object.entries(records.recipes)) {
    if (record.rawSheet === undefined || record.candidateSize === undefined)
      continue;
    const recipe = manifest.recipes.find((entry) => entry.id === id);
    const asset = manifest.assets.find((entry) => entry.id === recipe?.asset);
    if (asset === undefined) continue;
    const sheet = await readRaster(path.join(ROOT, record.rawSheet));
    const count = record.candidateCount ?? 1;
    for (let candidate = 0; candidate < count; candidate += 1) {
      const raw = cropRaster(sheet, {
        ...candidateCell(candidate, count, record.candidateSize),
        ...record.candidateSize,
      });
      const base =
        asset.bottomMargin === undefined
          ? raw
          : seatedRaster(raw, asset.canvas, asset.bottomMargin);
      const spec =
        asset.accent === undefined ? undefined : accentPreset(asset.accent);
      const derived = spec === undefined ? null : accentRaster(base, spec);
      const master = derived?.raster ?? base;
      const measured = stats(master);
      summary[`${id}#${candidate}`] = {
        verdict: record.review?.verdict ?? "PENDING",
        sprite: [measured.width, measured.height],
        lowestRow: measured.lowestRow,
        accentPixels: derived?.accentPixels ?? 0,
        accentShare:
          derived === null
            ? 0
            : Number((derived.accentPixels / measured.opaque).toFixed(3)),
      };
      const isPortrait = asset.assetClass === "PORTRAIT";
      const w = master.width;
      const h = master.height;
      const canvas = blank(
        8 + (w + 8) * 3 + (w * 4 + 8) * 3,
        h * 4 + 16,
        BACKDROP,
      );
      let left = 8;
      for (const tile of tiles) {
        if (isPortrait)
          fill(
            canvas,
            left,
            8,
            w,
            h,
            tile === tiles[2] ? ROCK : rgbOf("#efe6d2"),
          );
        else blit(canvas, tile, left - (80 - w) / 2, 8 + h - 80);
        blit(canvas, master, left, 8);
        left += w + 8;
      }
      for (const tile of tiles) {
        if (isPortrait)
          fill(
            canvas,
            left,
            8,
            w * 4,
            h * 4,
            tile === tiles[2] ? ROCK : rgbOf("#2b3140"),
          );
        else blit(canvas, tile, left - ((80 - w) / 2) * 4, 8 + (h - 80) * 4, 4);
        blit(canvas, master, left, 8, 4);
        left += w * 4 + 8;
      }
      await writeSheet(path.join(out, `${id}-${candidate}.png`), canvas, []);
    }
  }
  await writeFile(
    path.join(out, "candidates.json"),
    `${JSON.stringify(summary, null, 2)}\n`,
  );
  console.log(JSON.stringify(summary, null, 2));
}

async function main(): Promise<void> {
  if (process.argv.includes("--candidates")) {
    const out = option("--out");
    if (out === undefined) throw new Error("--candidates needs --out DIR");
    await candidates(path.resolve(out));
    return;
  }
  await evidence(
    path.resolve(
      option("--out") ??
        path.join(
          ROOT,
          "art/pixellab/reviews/chibi-batch-direction-ice-folk-rework",
        ),
    ),
    option("--copy-to"),
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
