/**
 * Review sheets of the Cult's palette 1 in production (bead
 * pulp_wars-mch9.59):
 *
 *   tsx scripts/art/cult-palette-mch959/sheets.ts --before DIR --out DIR
 *
 * DIR of `--before` is a copy of public/assets/chibi as it was before the
 * remap (for example `git archive` of the parent commit). Writes
 * before-after-1x.png and before-after-x3.png (every changed raster, before
 * and after, grouped) and board.png (the production board mock beside the
 * Undead and Human towns, at 1x and x2, from
 * scripts/art/cult-palette-mch958/sheets.ts with no palette: the files as
 * they are now).
 */
import { mkdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import type { RgbaRaster } from "../chibi/owner-mask";
import { loadRecords, productionLayout, readRaster } from "../chibi/pipeline";
import {
  blank,
  blit,
  writeSheet,
  type Label,
} from "../ice-folk-direction/raster-tools";
import { board } from "../cult-palette-mch958/sheets";
import {
  CREATURE_ASSETS,
  ICON_ASSETS,
  PLACE_ASSETS,
  ROBED_ASSETS,
  SHIP_ASSETS,
  type CultRemapAsset,
} from "./assets";

const ROOT = process.cwd();
const BG = [30, 32, 36] as const;
const PANEL = [74, 80, 88] as const;
const MUTED = "#a9b0b8";

function option(name: string): string {
  const index = process.argv.indexOf(name);
  const value = index < 0 ? undefined : process.argv[index + 1];
  if (value === undefined)
    throw new Error("usage: sheets.ts --before DIR --out DIR");
  return value;
}

const BATCHES = [
  "direction-cult",
  "interface-cult",
  "cities-cult",
  "buildings-cult",
  "monuments-cult",
  "naval-cult",
  "summons-cult",
  "effects-cult",
];

async function masterPaths(): Promise<Map<string, string>> {
  const paths = new Map<string, string>();
  for (const batch of BATCHES) {
    const records = await loadRecords(productionLayout(ROOT, batch), batch);
    for (const [id, record] of Object.entries(records.assets))
      paths.set(id, record.master.path);
  }
  return paths;
}

interface Group {
  readonly title: string;
  readonly files: readonly string[];
}

async function groups(): Promise<Group[]> {
  const paths = await masterPaths();
  const files = (assets: readonly CultRemapAsset[]): string[] =>
    assets.map((asset) => {
      const file = paths.get(asset.id);
      if (file === undefined) throw new Error(`no record for ${asset.id}`);
      return file;
    });
  const ships = files(SHIP_ASSETS);
  return [
    {
      title: "The robed cultists and their busts",
      files: files(ROBED_ASSETS),
    },
    {
      title: "The cities, buildings, obelisk and Monuments",
      files: files(PLACE_ASSETS),
    },
    {
      title: "The ships (the submerged Kraken re-derived), the ship portraits",
      files: [
        ...ships.slice(0, 4),
        "public/assets/chibi/units/chibi-naval-cult-submarine-submerged.png",
        ...ships.slice(4),
      ],
    },
    {
      title:
        "The Familiar and the Herald (and the Unbound Herald), their busts",
      files: files(CREATURE_ASSETS),
    },
    {
      title:
        "The lodge icons that showed indigo (their green, the faction colour, kept)",
      files: files(ICON_ASSETS),
    },
    {
      title:
        "The effects, swapped to cult-purple.png (the Sacrifice hood and the deep folds purple, the green kept)",
      files: [...paths]
        .filter(([id]) => id.startsWith("chibi-direction-effect-cult-"))
        .map(([, file]) => file)
        .sort(),
    },
    {
      title: "The Cult campaign picture",
      files: ["public/assets/chibi/campaign/campaign-cult.png"],
    },
  ];
}

async function beforeAfter(
  before: string,
  out: string,
  scale: number,
): Promise<void> {
  const width = scale === 1 ? 1500 : 2400;
  const rows: { title: string; pairs: [RgbaRaster, RgbaRaster][] }[] = [];
  for (const group of await groups()) {
    const pairs: [RgbaRaster, RgbaRaster][] = [];
    for (const file of group.files) {
      const relative = file.replace(/^public\/assets\/chibi\//, "");
      pairs.push([
        await readRaster(path.join(before, relative)),
        await readRaster(path.join(ROOT, file)),
      ]);
    }
    rows.push({ title: group.title, pairs });
  }
  // Lay out: each pair is before | after on one panel; wrap by width.
  type Placed = { left: number; top: number; pair: [RgbaRaster, RgbaRaster] };
  const placed: Placed[] = [];
  const labels: Label[] = [
    {
      text: `Cult palette 1 in production (pulp_wars-mch9.59): every changed raster, before | after, ${scale === 1 ? "1x" : `x${scale}`}`,
      left: 8,
      top: 8,
      size: 18,
    },
  ];
  let y = 40;
  for (const row of rows) {
    labels.push({ text: row.title, left: 8, top: y, size: 13, fill: MUTED });
    y += 22;
    let x = 8;
    let rowHeight = 0;
    for (const pair of row.pairs) {
      const w = (pair[0].width + pair[1].width) * scale + 18;
      const h = Math.max(pair[0].height, pair[1].height) * scale + 12;
      if (x + w > width) {
        x = 8;
        y += rowHeight + 8;
        rowHeight = 0;
      }
      placed.push({ left: x, top: y, pair });
      x += w + 8;
      rowHeight = Math.max(rowHeight, h);
    }
    y += rowHeight + 16;
  }
  const canvas = blank(width, y, [...BG]);
  for (const { left, top, pair } of placed) {
    const [a, b] = pair;
    const w = (a.width + b.width) * scale + 18;
    const h = Math.max(a.height, b.height) * scale + 12;
    blit(canvas, blank(w, h, [...PANEL]), left, top);
    blit(canvas, a, left + 6, top + 6, scale);
    blit(canvas, b, left + 12 + a.width * scale, top + 6, scale);
  }
  await writeSheet(
    path.join(out, `before-after-${scale === 1 ? "1x" : `x${scale}`}.png`),
    canvas,
    labels,
  );
}

async function boardSheet(out: string): Promise<void> {
  const mock = await board(undefined);
  const canvas = blank(16 + mock.width * 2, 76 + mock.height * 3 + 16, [...BG]);
  blit(canvas, mock, 8, 60);
  blit(canvas, mock, 8, 76 + mock.height, 2);
  await writeSheet(path.join(out, "board.png"), canvas, [
    {
      text: "Cult palette 1 in production (pulp_wars-mch9.59): the board at 1x and x2",
      left: 8,
      top: 8,
      size: 18,
    },
    {
      text: "Undead town (violet border) | the Cult town on the bog (eldritch green border kept): city level 3, Forge, Workshop, Market, Sawmill, Shipyard and Port, the five cultists, the Familiar, an Imp and a Horror, the Gondola, barge, Kraken and Galleon | Human town (crimson border)",
      left: 8,
      top: 34,
      size: 12,
      fill: MUTED,
    },
  ]);
}

async function main(): Promise<void> {
  const before = path.resolve(ROOT, option("--before"));
  const out = path.resolve(ROOT, option("--out"));
  await mkdir(out, { recursive: true });
  await beforeAfter(before, out, 1);
  await beforeAfter(before, out, 3);
  await boardSheet(out);
  console.log(
    `wrote before-after-1x.png, before-after-x3.png, board.png to ${out}`,
  );
}

main().catch((error: unknown) => {
  process.stderr.write(
    `${error instanceof Error ? (error.stack ?? error.message) : String(error)}\n`,
  );
  process.exitCode = 1;
});
