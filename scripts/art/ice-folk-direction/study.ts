/**
 * The Ice Folk direction study (bead pulp_wars-7g3.5, ICE_FOLK.md "How the
 * direction was chosen"): three units (Yeti, Ice Witch, Mammoth) in three
 * fur options and three accent options, measured against the terrain, the
 * player plates and the other factions' colours.
 *
 * Fur options are real PixelLab results (recipes of the batch). Accent
 * options other than the drawn one are deterministic recolours of the drawn
 * ice pixels, so every accent is judged on the same shapes; the edit
 * `yeti-ice-b` shows what PixelLab itself draws when asked for the deep ice
 * blue.
 *
 *   npx tsx scripts/art/ice-folk-direction/study.ts   (writes the study files)
 *
 * Writes `study-options-x3.png`, `study-options-1x.png` and `study.json`
 * into art/pixellab/reviews/chibi-batch-direction-ice-folk/; the review
 * script calls it too.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { ACCENT_PRESETS, accentRaster, hsvToRgb } from "../chibi/accent";
import { rgbToHsv, type RgbaRaster } from "../chibi/owner-mask";
import { readRaster } from "../chibi/pipeline";
import {
  colourPair,
  hexOf,
  rgbOf,
  worstDeltaE,
  type ColourPair,
  type Rgb,
} from "./colour";
import {
  batchRecords,
  blank,
  blit,
  meanColour,
  pixelsWhere,
  recordedCandidate,
  writeSheet,
  type Label,
} from "./raster-tools";

/** The ice pixels of a sprite: pale-to-bright cyan blue, never the fur. */
export function isIcePixel(
  hue: number,
  saturation: number,
  value: number,
): boolean {
  const band = ACCENT_PRESETS["ice-folk-blue"].band;
  return (
    hue >= band.hueFrom &&
    hue <= band.hueTo &&
    saturation >= band.saturationMin &&
    value >= band.valueMin
  );
}

export type AccentOption = "A1" | "A2" | "A3";

export const ACCENT_OPTIONS: Readonly<
  Record<AccentOption, { readonly name: string; readonly target: string }>
> = {
  A1: { name: "A1 glacier ice blue, as drawn", target: "#8fe3ff" },
  A2: { name: "A2 deep ice blue", target: "#2ea8ff" },
  A3: { name: "A3 frost white, blue-violet shade", target: "#eef2ff" },
};

/**
 * The study's accent recolour. A2 is the `ice-folk-blue` accent preset (a
 * saturated sky blue at hue 205, each pixel's lightness kept); A3 bleaches
 * the lit ice to frost white and turns its shade to a blue-violet (hue 238).
 */
export function recolourIce(
  raster: RgbaRaster,
  option: AccentOption,
): RgbaRaster {
  const data = new Uint8Array(raster.data);
  if (option === "A1") return { ...raster, data };
  // A2 is the production step: the `ice-folk-blue` accent preset.
  if (option === "A2")
    return accentRaster(raster, ACCENT_PRESETS["ice-folk-blue"]).raster;
  for (let index = 0; index < raster.width * raster.height; index += 1) {
    const o = index * 4;
    if ((data[o + 3] ?? 0) < 128) continue;
    const { hue, saturation, value } = rgbToHsv(
      data[o] ?? 0,
      data[o + 1] ?? 0,
      data[o + 2] ?? 0,
    );
    if (!isIcePixel(hue, saturation, value)) continue;
    const out =
      value >= 0.85
        ? hsvToRgb(225, Math.min(0.12, saturation * 0.3), 1)
        : hsvToRgb(238, 0.45, value * 0.9);
    data.set(out, o);
  }
  return { ...raster, data };
}

const FUR = [
  ["F1", "warm white, blue-grey shade (yeti-a)", "yeti-a", 0],
  ["F2", "warm white, taupe shade (yeti-fur-b)", "yeti-fur-b", 0],
  ["F3", "honey cream (yeti-fur-c)", "yeti-fur-c", 0],
] as const;

/** Fur: opaque, not outline, not ice, low saturation, lit or shade. */
const furLit = (_: Rgb, h: number, s: number, v: number): boolean =>
  !isIcePixel(h, s, v) && s < 0.4 && v >= 0.72;
const furShade = (_: Rgb, h: number, s: number, v: number): boolean =>
  !isIcePixel(h, s, v) && s < 0.45 && v >= 0.4 && v < 0.72;

export interface StudyResult {
  readonly fur: readonly {
    readonly option: string;
    readonly lit: string;
    readonly shade: string;
    readonly pairs: readonly ColourPair[];
  }[];
  readonly accent: readonly {
    readonly option: string;
    readonly lit: string;
    readonly pairs: readonly ColourPair[];
    readonly worstAgainstShallowTealGlass: number;
  }[];
  readonly drawnDeepIce: string;
}

export async function writeStudy(
  root: string,
  out: string,
): Promise<StudyResult> {
  const records = await batchRecords(root);
  const terrain = (name: string): Promise<RgbaRaster> =>
    readRaster(path.join(root, "public/assets/chibi/terrain", `${name}.png`));
  const grassTile = await terrain("chibi-grass-1");
  const rockTile = await terrain("chibi-mountain-ground-1");
  const shallowTile = await terrain("chibi-shallow-water-1");
  const grass = meanColour(grassTile);
  const rock = meanColour(rockTile);
  const rockLight = meanColour(rockTile, true);
  const shallow = meanColour(shallowTile);
  const forest = meanColour(await terrain("chibi-forest-1"));
  const refs: [string, Rgb][] = [
    ["Shallow Water", shallow],
    ["Teal plate", rgbOf("#28b7a4")],
    ["Martian glass", rgbOf("#8db9cd")],
    ["Martian glass, lit", rgbOf("#c7e7f5")],
    ["Martian chrome", rgbOf("#d1dbe1")],
    ["Dinosaur blue", rgbOf("#205794")],
    ["Deep Water", meanColour(await terrain("chibi-deep-water-1"))],
    ["Mountain rock, light", rockLight],
    ["Violet plate", rgbOf("#a277d2")],
  ];
  const fur = [];
  for (const [option, name, recipe, candidate] of FUR) {
    const sprite = await recordedCandidate(root, records, recipe, candidate);
    const lit = pixelsWhere([sprite], furLit).mean;
    const shade = pixelsWhere([sprite], furShade).mean;
    fur.push({
      option: `${option} ${name}`,
      lit: hexOf(lit),
      shade: hexOf(shade),
      pairs: [
        colourPair("fur lit", lit, "Grass", grass),
        colourPair("fur lit", lit, "Forest", forest),
        colourPair("fur lit", lit, "Mountain rock, mean", rock),
        colourPair("fur lit", lit, "Mountain rock, light", rockLight),
        colourPair("fur shade", shade, "Mountain rock, mean", rock),
        colourPair("fur shade", shade, "Mountain rock, light", rockLight),
        colourPair("fur shade", shade, "Grass", grass),
        colourPair("fur lit", lit, "Gold plate", rgbOf("#e2b63f")),
      ],
    });
  }
  // The accent: the ice of the three units, recoloured per option.
  const units = [
    await recordedCandidate(root, records, "yeti-fur-b", 0),
    await recordedCandidate(root, records, "ice-witch-a", 0),
    await recordedCandidate(root, records, "mammoth-a-edit", 0),
  ];
  const accent = [];
  for (const option of ["A1", "A2", "A3"] as const) {
    const ice = pixelsWhere(
      units.map((unit) => recolourIce(unit, option)),
      (_, h, s, v) =>
        option === "A3"
          ? (h >= 200 && h <= 250 && v >= 0.6) || (s < 0.15 && v >= 0.97)
          : isIcePixel(h, s, v),
    );
    // The lit tone: the commonest of the brightest half.
    const lit = rgbOf(
      ice.tones.find(([hex]) => Math.max(...rgbOf(hex)) >= 0.85 * 255)?.[0] ??
        hexOf(ice.mean),
    );
    const pairs = [
      ...refs.map(([name, rgb]) => colourPair("ice, lit", lit, name, rgb)),
      ...refs
        .slice(0, 3)
        .map(([name, rgb]) => colourPair("ice, mean", ice.mean, name, rgb)),
    ];
    accent.push({
      option: ACCENT_OPTIONS[option].name,
      lit: hexOf(lit),
      mean: hexOf(ice.mean),
      pixels: ice.count,
      pairs,
      worstAgainstShallowTealGlass: Math.min(
        ...pairs
          .filter((pair) => /Shallow|Teal|glass/.test(pair.b))
          .map(worstDeltaE),
      ),
    });
  }
  const deep = pixelsWhere(
    [await recordedCandidate(root, records, "yeti-ice-b", 0)],
    (_, h, s, v) => h >= 190 && h <= 250 && s >= 0.5 && v >= 0.3,
  );
  const result: StudyResult = {
    fur,
    accent,
    drawnDeepIce: hexOf(deep.mean),
  };
  // The sheet: rows are the units in each fur option; columns the accents
  // on Grass and on Mountain rock, and the drawn deep-ice edit.
  const rows: [string, RgbaRaster][] = [];
  for (const [option, , recipe, candidate] of FUR)
    rows.push([
      `Yeti ${option}`,
      await recordedCandidate(root, records, recipe, candidate),
    ]);
  rows.push(["Ice Witch", units[1] as RgbaRaster]);
  rows.push(["Mammoth", units[2] as RgbaRaster]);
  for (const scale of [3, 1]) {
    const cell = 84 * scale;
    const columns = [
      "A1 Grass",
      "A1 rock",
      "A2 Grass",
      "A2 rock",
      "A2 Shallow",
      "A3 Grass",
      "A3 rock",
    ];
    const labelW = 110;
    const sheet = blank(
      labelW + columns.length * (cell + 4) + 4,
      24 + rows.length * (cell + 4) + 4,
      [30, 33, 40],
    );
    const labels: Label[] = columns.map((text, column) => ({
      text,
      left: labelW + column * (cell + 4),
      top: 4,
      size: 12,
    }));
    for (const [row, [name, sprite]] of rows.entries()) {
      const top = 24 + row * (cell + 4);
      labels.push({ text: name, left: 4, top: top + 4, size: 12 });
      const variants: [AccentOption, RgbaRaster][] = [
        ["A1", grassTile],
        ["A1", rockTile],
        ["A2", grassTile],
        ["A2", rockTile],
        ["A2", shallowTile],
        ["A3", grassTile],
        ["A3", rockTile],
      ];
      for (const [column, [option, tile]] of variants.entries()) {
        const left = labelW + column * (cell + 4);
        const box = blank(cell, cell, [52, 58, 66]);
        blit(box, tile, 2 * scale, 4 * scale, scale);
        const piece = recolourIce(sprite, option);
        blit(
          box,
          piece,
          ((84 - piece.width) / 2) * scale,
          (84 - piece.height) * scale,
          scale,
        );
        blit(sheet, box, left, top);
      }
    }
    await writeSheet(
      path.join(out, `study-options-${scale === 3 ? "x3" : "1x"}.png`),
      sheet,
      labels,
    );
  }
  await writeFile(
    path.join(out, "study.json"),
    `${JSON.stringify(
      {
        note: "Fur and accent options of the direction study (ICE_FOLK.md). CIE76 colour difference: about 10 is clear at a glance, 20 and more are different colours. worstAgainstShallowTealGlass is the smallest difference, in normal vision and under deuteranopia and protanopia, from Shallow Water, the Teal plate and the Martian glass.",
        ...result,
      },
      null,
      2,
    )}\n`,
  );
  return result;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = process.cwd();
  const out = path.join(
    root,
    "art/pixellab/reviews/chibi-batch-direction-ice-folk",
  );
  mkdir(out, { recursive: true })
    .then(() => writeStudy(root, out))
    .then((result) => console.log(JSON.stringify(result, null, 1)))
    .catch((error: unknown) => {
      console.error(error instanceof Error ? error.message : "study failed");
      process.exitCode = 1;
    });
}
