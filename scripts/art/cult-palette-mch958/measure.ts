/**
 * Colour distances of the holistic Cult palettes (bead pulp_wars-mch9.58):
 * each palette's swatches, the measured means of its robes, roofs, hulls
 * and accents, and its proposed border, against every other faction's
 * identity colour (FACTION_COLOURS_V7), the summons' teal and the two
 * nearest neighbours' own cloth, in CIE76 and under deuteranopia and
 * protanopia (Machado 2009), the formulas of the faction-colour test.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { FACTION_COLOURS_V7 } from "../../../src/render/canvas/faction-colours-v7";
import { rgbToHsv, type RgbaRaster } from "../chibi/owner-mask";
import { readRaster } from "../chibi/pipeline";
import {
  colourPair,
  hexOf,
  lab,
  rgbOf,
  type Rgb,
} from "../ice-folk-direction/colour";
import {
  BUILDINGS_LIST,
  CITIES,
  PALETTES,
  ROBED,
  SHIPS,
  SHIP_PORTRAITS,
  CREATURES,
  classify,
  recolour,
  rgbOfLab,
  type CultAsset,
  type CultPalette,
  type Kind,
} from "./recolour";

const ROOT = process.cwd();
const UNITS = "public/assets/chibi/units";

type Lab = readonly [number, number, number];

const load = (file: string): Promise<RgbaRaster> =>
  readRaster(path.join(ROOT, file));

/** Mean colour of the opaque pixels `select` picks, over several rasters. */
function meanOf(
  rasters: readonly RgbaRaster[],
  select: (rgb: Rgb, p: number, r: number) => boolean,
): { rgb: Rgb; count: number } {
  let l = 0;
  let a = 0;
  let b = 0;
  let count = 0;
  rasters.forEach((raster, r) => {
    for (let p = 0; p < raster.width * raster.height; p += 1) {
      if ((raster.data[p * 4 + 3] ?? 0) < 128) continue;
      const rgb: Rgb = [
        raster.data[p * 4] ?? 0,
        raster.data[p * 4 + 1] ?? 0,
        raster.data[p * 4 + 2] ?? 0,
      ];
      if (!select(rgb, p, r)) continue;
      const c = lab(rgb);
      l += c[0];
      a += c[1];
      b += c[2];
      count += 1;
    }
  });
  const mean: Lab = count === 0 ? [0, 0, 0] : [l / count, a / count, b / count];
  return { rgb: rgbOfLab(mean), count };
}

const hsvIn = (
  rgb: Rgb,
  hue: readonly [number, number],
  saturation: number,
  value: number,
): boolean => {
  const h = rgbToHsv(rgb[0], rgb[1], rgb[2]);
  const inHue =
    hue[0] <= hue[1]
      ? h.hue >= hue[0] && h.hue <= hue[1]
      : h.hue >= hue[0] || h.hue <= hue[1];
  return inHue && h.saturation >= saturation && h.value >= value;
};

/** The mean, after the palette, of the pixels of the given kinds. */
async function kindMean(
  assets: readonly CultAsset[],
  palette: CultPalette | undefined,
  kinds: readonly Kind[],
): Promise<{ rgb: Rgb; count: number }> {
  const sources = await Promise.all(assets.map((asset) => load(asset.file)));
  const results = sources.map((raster, k) =>
    palette === undefined
      ? raster
      : recolour(assets[k] as CultAsset, raster, palette),
  );
  return meanOf(results, (_rgb, p, r) => {
    const source = sources[r] as RgbaRaster;
    const rgb: Rgb = [
      source.data[p * 4] ?? 0,
      source.data[p * 4 + 1] ?? 0,
      source.data[p * 4 + 2] ?? 0,
    ];
    return kinds.includes(
      classify(
        assets[r] as CultAsset,
        rgb,
        p % source.width,
        Math.floor(p / source.width),
      ),
    );
  });
}

interface Reference {
  readonly name: string;
  readonly rgb: Rgb;
}

const IDENTITY: readonly [string, string][] = [
  ["Human", FACTION_COLOURS_V7.ORIGINAL],
  ["Undead", FACTION_COLOURS_V7.UNDEAD],
  ["Goblin", FACTION_COLOURS_V7.GOBLIN],
  ["Dinosaur", FACTION_COLOURS_V7.DINOSAUR],
  ["Martian", FACTION_COLOURS_V7.MARTIAN],
  ["Ice Folk", FACTION_COLOURS_V7.ICE_FOLK],
  ["Dwarf", FACTION_COLOURS_V7.DWARF],
  ["Candy", FACTION_COLOURS_V7.CANDY],
];

/** The border test's grounds (tests/unit/faction-colours-render-v7.test.ts). */
const GROUNDS: readonly Reference[] = [
  { name: "Grass", rgb: [137, 183, 91] },
  { name: "Shallow Water", rgb: [143, 211, 220] },
  { name: "Deep Water", rgb: [66, 119, 165] },
  { name: "Mountain ground", rgb: [162, 170, 182] },
];

async function references(): Promise<Reference[]> {
  const summons = meanOf(
    await Promise.all(
      ["imp", "horror", "mass", "tentacle"].map((n) =>
        load(`${UNITS}/chibi-direction-cult-${n}.png`),
      ),
    ),
    (rgb) => hsvIn(rgb, [160, 200], 0.3, 0.25),
  );
  const humanCloth = meanOf(
    await Promise.all(
      ["fighter", "knight", "marksman", "captain"].map((n) =>
        load(`${UNITS}/chibi-direction-${n}.png`),
      ),
    ),
    (rgb) => hsvIn(rgb, [340, 12], 0.5, 0.2),
  );
  const undeadVioletCloth = meanOf(
    await Promise.all(
      ["necromancer", "lich", "skeleton", "wight", "banshee"].map((n) =>
        load(`${UNITS}/chibi-direction-undead-${n}.png`),
      ),
    ),
    (rgb) => hsvIn(rgb, [255, 300], 0.3, 0.15),
  );
  return [
    ...IDENTITY.map(([name, hex]) => ({ name, rgb: rgbOf(hex) })),
    { name: "Summons' teal", rgb: summons.rgb },
    { name: "Human units' red cloth", rgb: humanCloth.rgb },
    { name: "Undead units' violet", rgb: undeadVioletCloth.rgb },
    { name: "Undead near-black cloth", rgb: rgbOf("#313135") },
  ];
}

interface Row {
  readonly element: string;
  readonly hex: string;
  /** Per reference: CIE76 and the smaller of the two simulated ones. */
  readonly distances: readonly { ref: string; de: number; cvd: number }[];
}

function rowOf(element: string, rgb: Rgb, refs: readonly Reference[]): Row {
  return {
    element,
    hex: hexOf(rgb),
    distances: refs.map((ref) => {
      const pair = colourPair(element, rgb, ref.name, ref.rgb);
      return {
        ref: ref.name,
        de: pair.deltaE,
        cvd: Math.min(pair.deuteranopiaDeltaE, pair.protanopiaDeltaE),
      };
    }),
  };
}

/** The faction-colour test's rules for a border colour. */
function borderVerdict(hex: string): string {
  const rgb = rgbOf(hex);
  const fails: string[] = [];
  for (const [name, other] of IDENTITY) {
    const pair = colourPair("border", rgb, name, rgbOf(other));
    if (pair.deltaE < 45) fails.push(`${name} ${pair.deltaE} < 45`);
    const cvd = Math.min(pair.deuteranopiaDeltaE, pair.protanopiaDeltaE);
    if (cvd < 20) fails.push(`${name} simulated ${cvd} < 20`);
  }
  for (const ground of GROUNDS) {
    const pair = colourPair("border", rgb, ground.name, ground.rgb);
    if (pair.deltaE <= 25) fails.push(`${ground.name} ${pair.deltaE} <= 25`);
  }
  const lightness = lab(rgb)[0];
  if (lightness <= 42) fails.push(`L* ${lightness.toFixed(1)} <= 42`);
  return fails.length === 0
    ? `passes the faction-colour test (L* ${lightness.toFixed(1)})`
    : `fails: ${fails.join("; ")}`;
}

const LODGE_PLACES = [...CITIES, ...BUILDINGS_LIST];
const LODGE_SHIPS = [...SHIPS, ...SHIP_PORTRAITS];

async function rowsFor(
  palette: CultPalette | undefined,
  refs: readonly Reference[],
): Promise<Row[]> {
  const robeSprites = ROBED.slice(0, 5);
  const rows: Row[] = [];
  if (palette !== undefined) {
    rows.push(rowOf("main swatch", rgbOf(palette.main), refs));
    rows.push(rowOf("accent swatch", rgbOf(palette.accent), refs));
  }
  const robe = await kindMean(robeSprites, palette, ["main"]);
  rows.push(rowOf(`robe mean (${robe.count} px)`, robe.rgb, refs));
  const roofs = await kindMean(LODGE_PLACES, palette, ["main"]);
  rows.push(rowOf(`roof mean (${roofs.count} px)`, roofs.rgb, refs));
  const hulls = await kindMean(LODGE_SHIPS, palette, ["main"]);
  rows.push(rowOf(`hull and sail mean (${hulls.count} px)`, hulls.rgb, refs));
  const trim = await kindMean(robeSprites, palette, ["trim"]);
  rows.push(rowOf(`robe trim mean (${trim.count} px)`, trim.rgb, refs));
  const glow = await kindMean(
    [...robeSprites, ...LODGE_PLACES, ...LODGE_SHIPS, ...CREATURES],
    palette,
    ["glow"],
  );
  rows.push(rowOf(`lights mean (${glow.count} px)`, glow.rgb, refs));
  return rows;
}

function table(rows: readonly Row[], refs: readonly Reference[]): string {
  const head = `| Element | Colour | ${refs.map((r) => r.name).join(" | ")} |`;
  const rule = `| --- | --- | ${refs.map(() => "---:").join(" | ")} |`;
  const body = rows.map(
    (row) =>
      `| ${row.element} | \`${row.hex}\` | ${row.distances
        .map((d) => `${d.de.toFixed(0)} (${d.cvd.toFixed(0)})`)
        .join(" | ")} |`,
  );
  return [head, rule, ...body].join("\n");
}

export async function measure(out?: string): Promise<void> {
  const refs = await references();
  const parts: string[] = [
    "# Cult palettes: colour distances (pulp_wars-mch9.58)",
    "",
    "CIE76, with the smaller of the deuteranopia and protanopia distances in brackets. About 10 is clear at a glance and 20 and more are different colours; the faction-colour test asks 45 (20 simulated) between two border colours.",
    "",
    "References: " +
      refs.map((ref) => `${ref.name} \`${hexOf(ref.rgb)}\``).join(", ") +
      ".",
  ];
  const json: Record<string, unknown> = {};
  for (const palette of [undefined, ...PALETTES]) {
    const rows = await rowsFor(palette, refs);
    const title = palette?.name.replace(/\s+/g, " ") ?? "Current (production)";
    const borders: string[] = [palette?.border ?? "#00ff78"];
    if (palette?.id === "p1-purple-aqua") borders.push("#46f0c8");
    parts.push("", `## ${title}`, "", table(rows, refs), "");
    for (const hex of borders)
      parts.push(`- Border \`${hex}\`: ${borderVerdict(hex)}.`);
    json[palette?.id ?? "current"] = {
      rows,
      borders: borders.map((hex) => ({ hex, verdict: borderVerdict(hex) })),
    };
  }
  const text = `${parts.join("\n")}\n`;
  process.stdout.write(text);
  if (out === undefined) return;
  const dir = path.resolve(ROOT, out);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, "measure.md"), text);
  await writeFile(
    path.join(dir, "measure.json"),
    `${JSON.stringify({ references: refs.map((r) => ({ name: r.name, hex: hexOf(r.rgb) })), ...json }, null, 2)}\n`,
  );
}
