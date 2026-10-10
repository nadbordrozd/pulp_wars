/**
 * Settlement ground-shadow review (bead pulp_wars-2yc.12): every city and
 * the Village of the live look on a flat ground of its faction's colour,
 * BEFORE (the one shape every settlement had) beside AFTER (the shadow
 * fitted to its own measured footprint,
 * src/render/canvas/settlement-shadow-v7.ts). It writes to --out (default
 * <tmp>/pulp-wars-settlement-shadows):
 *
 *   sheet-x1.png   native size, as the board draws at zoom 1
 *   sheet-x3.png   enlarged three times (nearest)
 *   anchors.json   the measurement and the fitted ellipses of every raster
 *
 * The ellipses are the shipping ones (settlementShadowEllipsesV7), drawn
 * as SVG under the live masters. The flat grounds only stand in for the
 * board's terrain: the look-switch review
 * (scripts/art/city-shadow/review-scenes.ts) shows the real board.
 *
 * Usage: npm run art:settlement-shadows-review -- [--out DIR]
 * No PixelLab call is made and no browser is started.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import sharp, { type OverlayOptions } from "sharp";
import { SETTLEMENT_SHADOW_MEASUREMENTS_V7 } from "../../src/render/canvas/settlement-shadow-measurements-v7.generated";
import {
  SETTLEMENT_SHADOW_TABLE_V7,
  settlementShadowEllipsesV7,
} from "../../src/render/canvas/settlement-shadow-v7";
import {
  liveSettlementAssetsV7,
  publicFileOfUrlV7,
} from "./unit-shadows/assets";

function option(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  const value = index < 0 ? undefined : process.argv[index + 1];
  return value === undefined || value.startsWith("--") ? undefined : value;
}

const OUT = path.resolve(
  option("--out") ?? path.join(tmpdir(), "pulp-wars-settlement-shadows"),
);
/** One settlement's box: room for the widest and tallest master. */
const CELL = { width: 112, height: 116 } as const;
const COLUMNS = 3;

/** Flat stand-ins for each faction's ground. */
const GROUNDS: readonly (readonly [string, string])[] = [
  ["undead", "#6f7a63"],
  ["martian", "#b5714d"],
  ["ice-folk", "#e6eef2"],
  ["dwarf", "#8f9a6b"],
  ["candy", "#e9b7c6"],
  ["dinosaur", "#6fa24f"],
  ["goblin", "#87a24a"],
];
const groundOf = (assetId: string): string =>
  GROUNDS.find(([name]) => assetId.includes(name))?.[1] ?? "#7fb35a";

const assets = await liveSettlementAssetsV7();
const rows = Math.ceil(assets.length / COLUMNS);
const pairWidth = CELL.width * 2;
const width = COLUMNS * pairWidth;
const height = rows * CELL.height;
let svg = "";
const sprites: OverlayOptions[] = [];
assets.forEach((asset, index) => {
  const left = (index % COLUMNS) * pairWidth;
  const top = Math.floor(index / COLUMNS) * CELL.height;
  svg += `<rect x="${left}" y="${top}" width="${pairWidth}" height="${CELL.height}" fill="${groundOf(asset.id)}"/>`;
  [undefined, asset.id].forEach((assetId, side) => {
    const sprite = {
      x: left + side * CELL.width + Math.round((CELL.width - asset.width) / 2),
      y: top + CELL.height - asset.height - 4,
      width: asset.width,
      height: asset.height,
    };
    for (const ellipse of settlementShadowEllipsesV7(sprite, assetId))
      svg += `<ellipse cx="${ellipse.centreX}" cy="${ellipse.centreY}" rx="${ellipse.radiusX}" ry="${ellipse.radiusY}" fill="${ellipse.fill}"/>`;
    sprites.push({
      input: publicFileOfUrlV7(asset.url),
      left: sprite.x,
      top: sprite.y,
    });
  });
});
const sheet = await sharp(
  Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${svg}</svg>`,
  ),
)
  .composite(sprites)
  .png()
  .toBuffer();
await mkdir(OUT, { recursive: true });
await writeFile(path.join(OUT, "sheet-x1.png"), sheet);
await sharp(sheet)
  .resize(width * 3, height * 3, { kernel: "nearest" })
  .toFile(path.join(OUT, "sheet-x3.png"));
await writeFile(
  path.join(OUT, "anchors.json"),
  `${JSON.stringify(
    assets.map((asset) => ({
      ...SETTLEMENT_SHADOW_MEASUREMENTS_V7[asset.id],
      ...SETTLEMENT_SHADOW_TABLE_V7[asset.id],
    })),
    null,
    2,
  )}\n`,
);
console.log(
  `${assets.length} settlements, BEFORE | AFTER, ${COLUMNS} per row: ${OUT}`,
);
