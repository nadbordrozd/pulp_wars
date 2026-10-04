/**
 * Code-side samples of the Undead territory grass for the faction building
 * study (bead pulp_wars-xdh.1, docs/art/FACTION_BUILDINGS.md), and the
 * forced palettes of its PixelLab recipes.
 *
 *   npx tsx scripts/art/faction-buildings/undead-grass.ts
 *
 * - **Palettes** (`scripts/art/chibi/palettes/undead-grass.png`,
 *   `undead-grass-leaves.png`): the forced palettes of the recipes
 *   `undead-grass-a` and `undead-grass-b` of the exploration run
 *   `art/explorations/faction-buildings-2026-10/`. Bands of equal height, one
 *   per colour, like the effect palettes.
 * - **Recoloured grass** (`art/explorations/faction-buildings-2026-10/samples/`):
 *   each accepted Grass master (`chibi-grass-1..3`) has only four or two
 *   colours, so a variant is an exact colour swap of those colours. The
 *   shapes are the reviewed Grass tiles, so an Undead field tiles without a
 *   seam and a territory edge changes colour only. The two Forest masters
 *   are re-composited from their checked-in body layers over the variant's
 *   first tile (`groundComposite`, as the pipeline builds them), so a Forest
 *   in Undead territory stands on the same ground.
 *
 * No PixelLab call and no hand drawing; every output is deterministic.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { encodePng, readRaster } from "../chibi/pipeline";
import { rgbToHsv, type RgbaRaster } from "../chibi/owner-mask";
import { groundComposite } from "../chibi/raster";

export const FACTION_BUILDINGS_RUN =
  "art/explorations/faction-buildings-2026-10";
export const FACTION_BUILDINGS_SAMPLES = `${FACTION_BUILDINGS_RUN}/samples`;

/** The forced palettes of the PixelLab grass recipes. */
export const UNDEAD_GRASS_PALETTES = {
  "scripts/art/chibi/palettes/undead-grass.png": [
    { colour: "#749b76", role: "base: the gloam grey-green, the stable entry" },
    { colour: "#86ab86", role: "light tuft" },
    { colour: "#54605e", role: "mid tuft, violet-grey" },
    { colour: "#4c5656", role: "dark tuft, violet-grey" },
  ],
  "scripts/art/chibi/palettes/undead-grass-leaves.png": [
    { colour: "#749b76", role: "base: the gloam grey-green, the stable entry" },
    { colour: "#4c5656", role: "dark tuft, violet-grey" },
    { colour: "#5e4a63", role: "dusky purple fallen leaf, far from the base" },
  ],
} as const;

/** The grass colours of the accepted masters (batch 1). */
const GRASS_COLOURS = ["#8ab85c", "#a3cc72", "#6e9c4a", "#557f3c", "#52793a"];

export interface GrassVariantSpec {
  readonly id: string;
  readonly label: string;
  /** Hue turn in degrees, saturation and value factors for every colour. */
  readonly hue: number;
  readonly saturation: number;
  readonly value: number;
  /** Darker tufts (every colour darker than the base) mixed this far toward `tuftTint`. */
  readonly tuftTint?: { readonly colour: string; readonly mix: number };
}

/**
 * Candidates, mildest first. "Cool": a little less colour and a cooler
 * green, nothing added. "Dusk" adds a faint violet-grey to the dark tufts.
 * "Gloam" is the recommendation (RECOMMENDED_UNDEAD_GRASS): cooler, a
 * little darker and duller, with violet-grey tufts; on the board, after the
 * live terrain tone, it is the only one that reads as dusk rather than as
 * a paler green. "Wilt" is the autumn alternative (dry olive).
 */
export const UNDEAD_GRASS_VARIANTS: readonly GrassVariantSpec[] = [
  {
    id: "cool",
    label: "Cool: hue +22°, saturation x0.62, value x0.93",
    hue: 22,
    saturation: 0.62,
    value: 0.93,
  },
  {
    id: "dusk",
    label: "Dusk: cool, dark tufts 45% toward violet-grey #4a4458",
    hue: 22,
    saturation: 0.62,
    value: 0.93,
    tuftTint: { colour: "#4a4458", mix: 0.45 },
  },
  {
    id: "gloam",
    label:
      "Gloam: hue +34°, saturation x0.5, value x0.84, dark tufts 55% toward #4a4458",
    hue: 34,
    saturation: 0.5,
    value: 0.84,
    tuftTint: { colour: "#4a4458", mix: 0.55 },
  },
  {
    id: "wilt",
    label: "Wilt: hue -24°, saturation x0.55, value x0.9 (dry olive)",
    hue: -24,
    saturation: 0.55,
    value: 0.9,
  },
];

type Rgb = readonly [number, number, number];

function hex(colour: string): Rgb {
  return [1, 3, 5].map((at) =>
    Number.parseInt(colour.slice(at, at + 2), 16),
  ) as unknown as Rgb;
}

function toHex(rgb: Rgb): string {
  return `#${rgb.map((value) => value.toString(16).padStart(2, "0")).join("")}`;
}

function hsvToRgb(hue: number, saturation: number, value: number): Rgb {
  const h = (((hue % 360) + 360) % 360) / 60;
  const c = value * saturation;
  const x = c * (1 - Math.abs((h % 2) - 1));
  const m = value - c;
  const [r, g, b] =
    h < 1
      ? [c, x, 0]
      : h < 2
        ? [x, c, 0]
        : h < 3
          ? [0, c, x]
          : h < 4
            ? [0, x, c]
            : h < 5
              ? [x, 0, c]
              : [c, 0, x];
  return [r, g, b].map((channel) => Math.round((channel + m) * 255)) as [
    number,
    number,
    number,
  ];
}

/** The colour swap of one variant: every Grass colour to its new colour. */
export function grassColourMap(spec: GrassVariantSpec): Map<string, string> {
  const map = new Map<string, string>();
  for (const [index, colour] of GRASS_COLOURS.entries()) {
    const [r, g, b] = hex(colour);
    const hsv = rgbToHsv(r, g, b);
    let rgb = hsvToRgb(
      hsv.hue + spec.hue,
      Math.min(1, hsv.saturation * spec.saturation),
      Math.min(1, hsv.value * spec.value),
    );
    if (spec.tuftTint !== undefined && index > 1) {
      const tint = hex(spec.tuftTint.colour);
      const mix = spec.tuftTint.mix;
      rgb = rgb.map((channel, at) =>
        Math.round(channel + ((tint[at] ?? 0) - channel) * mix),
      ) as unknown as Rgb;
    }
    map.set(colour, toHex(rgb));
  }
  return map;
}

export function recolourGrass(
  raster: RgbaRaster,
  map: ReadonlyMap<string, string>,
): RgbaRaster {
  const data = new Uint8Array(raster.data);
  for (let offset = 0; offset < data.length; offset += 4) {
    const from = toHex([
      data[offset] ?? 0,
      data[offset + 1] ?? 0,
      data[offset + 2] ?? 0,
    ]);
    const to = map.get(from);
    if (to === undefined)
      throw new Error(`grass colour ${from} is not in the swap table`);
    const [r, g, b] = hex(to);
    data[offset] = r;
    data[offset + 1] = g;
    data[offset + 2] = b;
  }
  return { width: raster.width, height: raster.height, data };
}

async function palettePng(colours: readonly string[]): Promise<Buffer> {
  const size = 64;
  const data = new Uint8Array(size * size * 4);
  const band = size / colours.length;
  for (let y = 0; y < size; y += 1) {
    const [r, g, b] = hex(
      colours[Math.min(colours.length - 1, Math.floor(y / band))] ?? "#000000",
    );
    for (let x = 0; x < size; x += 1) {
      const offset = (y * size + x) * 4;
      data[offset] = r;
      data[offset + 1] = g;
      data[offset + 2] = b;
      data[offset + 3] = 255;
    }
  }
  return encodePng({ width: size, height: size, data });
}

export function undeadGrassFile(variant: string, index: number): string {
  return `${FACTION_BUILDINGS_SAMPLES}/undead-grass-${variant}-${index}.png`;
}

export function undeadForestFile(variant: string, index: number): string {
  return `${FACTION_BUILDINGS_SAMPLES}/undead-forest-${variant}-${index}.png`;
}

async function main(): Promise<void> {
  const root = process.cwd();
  for (const [file, entries] of Object.entries(UNDEAD_GRASS_PALETTES)) {
    await writeFile(
      path.join(root, file),
      await palettePng(entries.map((entry) => entry.colour)),
    );
    console.log(`wrote ${file}`);
  }
  await mkdir(path.join(root, FACTION_BUILDINGS_SAMPLES), { recursive: true });
  const grass = await Promise.all(
    [1, 2, 3].map((index) =>
      readRaster(
        path.join(root, `public/assets/chibi/terrain/chibi-grass-${index}.png`),
      ),
    ),
  );
  const forests = await Promise.all(
    [1, 2].map((index) =>
      readRaster(
        path.join(
          root,
          `public/assets/chibi/terrain/chibi-forest-${index}.body.png`,
        ),
      ),
    ),
  );
  for (const spec of UNDEAD_GRASS_VARIANTS) {
    const map = grassColourMap(spec);
    console.log(
      `${spec.id}: ${[...map].map(([from, to]) => `${from}->${to}`).join(" ")}`,
    );
    const tiles = grass.map((tile) => recolourGrass(tile, map));
    for (const [index, tile] of tiles.entries())
      await writeFile(
        path.join(root, undeadGrassFile(spec.id, index + 1)),
        await encodePng(tile),
      );
    // Each Forest master stands on chibi-grass-1 (its recorded ground).
    const ground = tiles[0];
    if (ground === undefined) throw new Error("no grass tile");
    for (const [index, body] of forests.entries())
      await writeFile(
        path.join(root, undeadForestFile(spec.id, index + 1)),
        await encodePng(groundComposite(body, ground)),
      );
  }
  console.log(`wrote ${FACTION_BUILDINGS_SAMPLES}/`);
}

if (process.argv[1] === fileURLToPath(import.meta.url))
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "failed");
    process.exitCode = 1;
  });
