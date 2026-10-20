/**
 * Review sheets of the Cult's palette 1 tweak (bead pulp_wars-mch9.60):
 *
 *   tsx scripts/art/cult-palette-mch960/sheets.ts --before DIR --out DIR
 *
 * DIR of `--before` is a copy of public/assets/chibi as it was before the
 * tweak (for example `git archive` of the parent commit). Writes
 * before-after-1x.png and before-after-x3.png (every raster the tweak
 * changes, before and after, beside the summons it now matches) and
 * board.png (the production board mock beside the Undead and Human towns,
 * at 1x and x2, from scripts/art/cult-palette-mch958/sheets.ts with no
 * palette: the files as they are now).
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
  PLACE_ASSETS,
  ROBED_ASSETS,
  SHIP_ASSETS,
  type CultRemapAsset,
} from "../cult-palette-mch959/assets";

const ROOT = process.cwd();
const BG = [30, 32, 36] as const;
const PANEL = [74, 80, 88] as const;
const MUTED = "#a9b0b8";
const TITLE =
  "Cult palette 1 tweak (pulp_wars-mch9.60): the summons' teal accent, a teal Familiar, wooden hulls";

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

const SUMMONS = ["imp", "horror", "mass", "tentacle", "thing"].map(
  (id) => `public/assets/chibi/units/chibi-direction-cult-${id}.png`,
);

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
      title:
        "The Familiar and its bust, beside the summons it now matches (the summons are not changed)",
      files: [
        ...files(
          CREATURE_ASSETS.filter((asset) => asset.id.includes("familiar")),
        ),
        ...SUMMONS,
      ],
    },
    {
      title:
        "The robed cultists and their busts: the embroidery and flames in the summons' teal",
      files: files(ROBED_ASSETS),
    },
    {
      title:
        "The ships: wooden hulls, purple sails and sigils, teal lanterns; the Kraken (and its submerged look) purple",
      files: [
        ...ships.slice(0, 4),
        "public/assets/chibi/units/chibi-naval-cult-submarine-submerged.png",
        ...ships.slice(4),
      ],
    },
    {
      title:
        "The cities, buildings and Monuments with lit windows and lamps (unlit ones are not changed)",
      files: files(PLACE_ASSETS).filter(
        (file) => !/(forge|shipyard|monument-muster)\.png$/.test(file),
      ),
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
  type Placed = { left: number; top: number; pair: [RgbaRaster, RgbaRaster] };
  const placed: Placed[] = [];
  const labels: Label[] = [
    {
      text: `${TITLE}; before | after, ${scale === 1 ? "1x" : `x${scale}`}`,
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
    { text: `${TITLE}: the board at 1x and x2`, left: 8, top: 8, size: 18 },
    {
      text: "Undead town (violet border) | the Cult town on the bog: city level 3, Forge, Workshop, Market, Sawmill, Shipyard and Port, the five cultists, the Familiar, an Imp and a Horror, the Gondola, barge, Kraken and Galleon | Human town (crimson border)",
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
