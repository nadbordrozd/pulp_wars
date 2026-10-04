/**
 * Review sheets of the Goblin redesign direction study (bead
 * pulp_wars-wrn.1, docs/art/factions/GOBLIN_REDESIGN.md). No PixelLab call
 * and no production asset is touched: the sheets measure the Goblin roster
 * the study diagnosed against the six other factions and show recolour
 * mockups of those sprites in the three palette directions of
 * scripts/art/goblin-redesign/directions.ts.
 *
 * Since bead pulp_wars-wrn.2 the live masters are the redesigned art
 * (direction A, fresh PixelLab creations). "Before" is therefore read from
 * the superseded recipes' recorded candidates (goblin-redesign/before.ts),
 * and every sheet gains the live roster as the look "Redesign (live)";
 * result-x3.png and the `result` block of index.json put before and after
 * side by side with the study's acceptance numbers.
 *
 *   npm run art:goblin-redesign-study-review [-- --out DIR]
 *
 * Writes to art/pixellab/reviews/goblin-redesign-study/ (and copies every
 * file to DIR when given):
 *
 * - overview.png: every look (current, A, B, C) and two reference
 *   factions, the eight units at 2x on Grass and at 1x on Grass, Snow,
 *   Mountain ground and in greyscale, with the palette of each direction;
 * - diagnosis-x3.png: the current roster in colour and in greyscale beside
 *   the Human and Dwarf rosters, with mean L* and the lit share per sprite;
 * - histograms.png: the lightness histogram of every faction and of the
 *   three problem units;
 * - directions-<ground>-{1x,x3}.png for Grass, Snow and Mountain ground;
 * - extras-x2.png: portraits, cities and ships in each look;
 * - classes-x3.png: how the recolour classified each pixel (evidence that
 *   the mockups are recolours of the old shapes);
 * - result-x3.png: before and after per unit, in colour and greyscale,
 *   with mean L*, lit and dark shares and the faction-colour share;
 * - index.json: every measurement.
 */
import { copyFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { format } from "prettier";
import { FACTION_COLOURS_V7 } from "../../src/render/canvas/faction-colours-v7";
import type { RgbaRaster } from "./chibi/owner-mask";
import { readRaster } from "./chibi/pipeline";
import {
  colourPair,
  lab,
  rgbOf,
  worstDeltaE,
  type Rgb,
} from "./ice-folk-direction/colour";
import {
  blank,
  blit,
  fill,
  writeSheet,
  type Canvas,
  type Label,
} from "./ice-folk-direction/raster-tools";
import {
  GOBLIN_CITIES_V7,
  GOBLIN_DIRECTIONS_V7,
  GOBLIN_PORTRAITS_V7,
  GOBLIN_ROSTER_V7,
  GOBLIN_SHIPS_V7,
  REFERENCE_ROSTERS_V7,
  SIGNATURE_COLOURS_V7,
  referenceFile,
  type GoblinDirectionV7,
  type GoblinSpriteV7,
} from "./goblin-redesign/directions";
import {
  meanMetricsV7,
  valueMetricsV7,
  type ValueMetricsV7,
} from "./goblin-redesign/measure";
import { classMap, recolourGoblinSpriteV7 } from "./goblin-redesign/recolour";
import { loadGoblinBeforeV7 } from "./goblin-redesign/before";

const ROOT = process.cwd();
const OUT = path.join(ROOT, "art/pixellab/reviews/goblin-redesign-study");
const SHEET_BG: Rgb = [30, 32, 36];
const MUTED = "#a9b0b8";

type Raster = RgbaRaster & { readonly data: Uint8Array };

function option(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  const value = index < 0 ? undefined : process.argv[index + 1];
  return value === undefined || value.startsWith("--") ? undefined : value;
}

const load = (file: string): Promise<Raster> =>
  readRaster(path.join(ROOT, file));

/** L* as a grey, so a sheet can be read for value alone. */
function greyscale<T extends RgbaRaster>(raster: T): Raster {
  const data = new Uint8Array(raster.data);
  for (let index = 0; index < raster.width * raster.height; index += 1) {
    const o = index * 4;
    const l = lab([data[o] ?? 0, data[o + 1] ?? 0, data[o + 2] ?? 0])[0];
    const grey = Math.round((l / 100) * 255);
    data[o] = grey;
    data[o + 1] = grey;
    data[o + 2] = grey;
  }
  return { width: raster.width, height: raster.height, data };
}

// ------------------------------------------------------------- grounds

interface Ground {
  readonly id: "grass" | "snow" | "mountain" | "grey";
  readonly name: string;
  readonly tile: Raster;
  readonly mean: Rgb;
}

function meanOf(raster: RgbaRaster): Rgb {
  const sum = [0, 0, 0];
  let n = 0;
  for (let index = 0; index < raster.width * raster.height; index += 1) {
    if ((raster.data[index * 4 + 3] ?? 0) < 128) continue;
    for (let c = 0; c < 3; c += 1)
      sum[c] = (sum[c] ?? 0) + (raster.data[index * 4 + c] ?? 0);
    n += 1;
  }
  return [(sum[0] ?? 0) / n, (sum[1] ?? 0) / n, (sum[2] ?? 0) / n];
}

/** The Ice Folk Snow overlay: a 42% wash of #f5f8fc over the Grass tile. */
function snowOf(grass: Raster): Raster {
  const data = new Uint8Array(grass.data);
  const snow = rgbOf("#f5f8fc");
  for (let index = 0; index < grass.width * grass.height; index += 1)
    for (let c = 0; c < 3; c += 1)
      data[index * 4 + c] = Math.round(
        (data[index * 4 + c] ?? 0) * 0.58 + (snow[c] ?? 0) * 0.42,
      );
  return { width: grass.width, height: grass.height, data };
}

async function grounds(): Promise<readonly Ground[]> {
  const grass = await load("public/assets/chibi/terrain/chibi-grass-1.png");
  const mountain = await load(
    "public/assets/chibi/terrain/chibi-mountain-ground-1.png",
  );
  const snow = snowOf(grass);
  const greyTile = blank(80, 80, [118, 118, 118]);
  return [
    { id: "grass", name: "Grass", tile: grass, mean: meanOf(grass) },
    { id: "snow", name: "Snow", tile: snow, mean: meanOf(snow) },
    {
      id: "mountain",
      name: "Mountain ground",
      tile: mountain,
      mean: meanOf(mountain),
    },
    {
      id: "grey",
      name: "Neutral grey",
      tile: { ...greyTile, data: greyTile.data },
      mean: [118, 118, 118],
    },
  ];
}

function tileGround(
  canvas: Canvas,
  ground: Ground,
  left: number,
  top: number,
  width: number,
  height: number,
  scale: number,
  grey = false,
): void {
  const tile = grey ? greyscale(ground.tile) : ground.tile;
  const size = tile.width * scale;
  for (let y = 0; y < height; y += size)
    for (let x = 0; x < width; x += size) {
      const w = Math.min(size, width - x);
      const h = Math.min(size, height - y);
      // Crop the scaled tile at the strip's edge.
      const part: Raster = {
        width: Math.ceil(w / scale),
        height: Math.ceil(h / scale),
        data: new Uint8Array(Math.ceil(w / scale) * Math.ceil(h / scale) * 4),
      };
      for (let py = 0; py < part.height; py += 1)
        for (let px = 0; px < part.width; px += 1)
          part.data.set(
            tile.data.subarray(
              (py * tile.width + px) * 4,
              (py * tile.width + px) * 4 + 4,
            ),
            (py * part.width + px) * 4,
          );
      blit(canvas, part, left + x, top + y, scale);
    }
  // Trim any overdraw past the strip.
}

// ------------------------------------------------------------- looks

interface Look {
  readonly id: string;
  readonly title: string;
  readonly subtitle: string;
  readonly units: readonly Raster[];
  readonly direction?: GoblinDirectionV7;
  readonly faction: string;
}

const REFERENCE_NAMES: Readonly<Record<string, string>> = {
  human: "Human",
  undead: "Undead",
  dinosaur: "Dinosaur",
  martian: "Martian",
  iceFolk: "Ice Folk",
  dwarf: "Dwarf",
};

const CELL = 92;
const ROW = 108;

/** One row of eight sprites standing on a ground strip. */
function drawRow(
  canvas: Canvas,
  sprites: readonly RgbaRaster[],
  ground: Ground,
  left: number,
  top: number,
  scale: number,
  grey = false,
  cell = CELL,
  rowHeight = ROW,
): void {
  const width = cell * scale * sprites.length;
  const height = rowHeight * scale;
  tileGround(canvas, ground, left, top, width, height, scale, grey);
  sprites.forEach((sprite, index) => {
    const source = grey ? greyscale(sprite) : sprite;
    blit(
      canvas,
      source,
      left +
        index * cell * scale +
        Math.floor((cell - sprite.width) / 2) * scale,
      top + height - (sprite.height + 4) * scale,
      scale,
    );
  });
}

function recolourAll(
  rasters: readonly Raster[],
  sprites: readonly GoblinSpriteV7[],
  direction: GoblinDirectionV7,
): Raster[] {
  return rasters.map((raster, index) => {
    const sprite = sprites[index];
    return recolourGoblinSpriteV7(raster, direction, {
      skin: sprite?.skin ?? "goblin",
      darkBrown: sprite?.darkBrown ?? "wood",
      rust: sprite?.rust ?? "rust",
    }).raster;
  });
}

/** The direction's palette: a chip, the role and the hex, one per line. */
function swatchStrip(
  canvas: Canvas,
  labels: Label[],
  direction: GoblinDirectionV7,
  left: number,
  top: number,
  size = 12,
): void {
  direction.swatches.forEach((swatch, index) => {
    const y = top + index * (size + 3);
    fill(canvas, left, y, size, size, rgbOf(swatch.hex));
    labels.push({
      text: `${swatch.role} ${swatch.hex}`,
      left: left + size + 6,
      top: y - 1,
      size: 10,
      fill: MUTED,
    });
  });
}

async function main(): Promise<void> {
  await mkdir(OUT, { recursive: true });
  const ground = await grounds();
  const [grass, snow, mountain, grey] = ground as [
    Ground,
    Ground,
    Ground,
    Ground,
  ];
  // The roster the study diagnosed (superseded by bead pulp_wars-wrn.2)
  // and the live, redesigned roster.
  const current = await Promise.all(
    GOBLIN_ROSTER_V7.map((unit) => loadGoblinBeforeV7(ROOT, unit)),
  );
  const live = await Promise.all(
    GOBLIN_ROSTER_V7.map((unit) => load(unit.file)),
  );
  const references = Object.fromEntries(
    await Promise.all(
      Object.entries(REFERENCE_ROSTERS_V7).map(
        async ([id, roster]) =>
          [
            id,
            await Promise.all(roster.files.map((f) => load(referenceFile(f)))),
          ] as const,
      ),
    ),
  ) as Record<string, Raster[]>;

  const looks: Look[] = [
    {
      id: "current",
      title: "Before (retired)",
      subtitle: "olive, brown leather, gunmetal",
      units: current,
      faction: FACTION_COLOURS_V7.GOBLIN,
    },
    ...GOBLIN_DIRECTIONS_V7.map((direction) => ({
      id: direction.id,
      title: `${direction.letter}: ${direction.name}`,
      subtitle: "recolour of the old shapes",
      units: recolourAll(current, GOBLIN_ROSTER_V7, direction),
      direction,
      faction: FACTION_COLOURS_V7.GOBLIN,
    })),
    {
      id: "live",
      title: "Redesign (live)",
      subtitle: "direction A redrawn by PixelLab (pulp_wars-wrn.2)",
      units: live,
      faction: FACTION_COLOURS_V7.GOBLIN,
    },
  ];
  const refLooks: Look[] = [
    {
      id: "human",
      title: "Reference: Human",
      subtitle: "crimson, steel, gold",
      units: references.human ?? [],
      faction: FACTION_COLOURS_V7.ORIGINAL,
    },
    {
      id: "dwarf",
      title: "Reference: Dwarf",
      subtitle: "copper, soot iron",
      units: references.dwarf ?? [],
      faction: FACTION_COLOURS_V7.DWARF,
    },
  ];

  // ----------------------------------------------------- measurements
  const names = GOBLIN_ROSTER_V7.map((unit) => unit.name);
  const measured: Record<
    string,
    { units: Record<string, ValueMetricsV7>; mean: object }
  > = {};
  const measureLook = (
    id: string,
    units: readonly Raster[],
    faction: string,
    labels: readonly string[],
  ): void => {
    const metrics = units.map((unit) =>
      valueMetricsV7(unit, faction, grass.mean),
    );
    measured[id] = {
      units: Object.fromEntries(
        metrics.map((m, i) => [labels[i] ?? `${i}`, m]),
      ),
      mean: meanMetricsV7(metrics),
    };
  };
  for (const look of looks)
    measureLook(look.id, look.units, look.faction, names);
  for (const [id, roster] of Object.entries(REFERENCE_ROSTERS_V7))
    measureLook(
      id,
      references[id] ?? [],
      FACTION_COLOURS_V7[roster.faction as keyof typeof FACTION_COLOURS_V7],
      roster.files,
    );

  const written: string[] = [];
  const save = async (
    name: string,
    canvas: Canvas,
    labels: readonly Label[],
  ): Promise<void> => {
    await writeSheet(path.join(OUT, name), canvas, labels);
    written.push(name);
  };

  // ----------------------------------------------------- overview
  {
    const scale2 = 2;
    const labelWidth = 250;
    const bigWidth = CELL * 8 * scale2;
    const smallWidth = CELL * 8;
    const rowHeight = ROW * scale2;
    const all = [...looks, ...refLooks];
    const header = 46;
    const width = labelWidth + bigWidth + 16 + smallWidth * 2 + 16;
    const height = header + all.length * (rowHeight + 12) + 8;
    const canvas = blank(width, height, SHEET_BG);
    const labels: Label[] = [
      {
        text: "Goblin redesign study (pulp_wars-wrn.1): the roster before, three palette directions as recolours of the OLD shapes, the redesigned live roster (pulp_wars-wrn.2), two reference factions",
        left: 12,
        top: 8,
        size: 16,
      },
      {
        text: "left: 2x on Grass | right, 1x: Grass, Snow / Mountain ground, greyscale on Grass (value only)",
        left: 12,
        top: 26,
        size: 12,
        fill: MUTED,
      },
    ];
    all.forEach((look, index) => {
      const top = header + index * (rowHeight + 12);
      labels.push({ text: look.title, left: 12, top: top + 4, size: 15 });
      labels.push({
        text: look.subtitle,
        left: 12,
        top: top + 24,
        size: 11,
        fill: MUTED,
      });
      const mean = measured[look.id]?.mean as
        | { meanLightness: number; dark: number; light: number; bright: number }
        | undefined;
      if (mean !== undefined)
        labels.push({
          text: `mean L* ${mean.meanLightness}, lit ${Math.round((mean.light + mean.bright) * 100)}%, dark ${Math.round(mean.dark * 100)}%`,
          left: 12,
          top: top + 40,
          size: 11,
          fill: MUTED,
        });
      if (look.direction !== undefined) {
        swatchStrip(canvas, labels, look.direction, 12, top + 60);
      }
      drawRow(canvas, look.units, grass, labelWidth, top, scale2);
      const right = labelWidth + bigWidth + 16;
      // Two half-height strips at 1x: Grass over Snow; Mountain over grey.
      drawRow(canvas, look.units, grass, right, top, 1);
      drawRow(canvas, look.units, snow, right + smallWidth, top, 1);
      drawRow(canvas, look.units, mountain, right, top + ROW, 1);
      drawRow(
        canvas,
        look.units,
        grass,
        right + smallWidth,
        top + ROW,
        1,
        true,
      );
    });
    await save("overview.png", canvas, labels);
  }

  // ----------------------------------------------------- diagnosis
  {
    const scale = 3;
    const rows: {
      title: string;
      units: Raster[];
      grey: boolean;
      id: string;
      names: readonly string[];
    }[] = [
      {
        title: "Goblin, before the redesign",
        units: current,
        grey: false,
        id: "current",
        names,
      },
      {
        title: "Goblin, before the redesign, greyscale (L*)",
        units: current,
        grey: true,
        id: "current",
        names,
      },
      {
        title: "Human",
        units: references.human ?? [],
        grey: false,
        id: "human",
        names: REFERENCE_ROSTERS_V7.human?.files ?? [],
      },
      {
        title: "Human, greyscale",
        units: references.human ?? [],
        grey: true,
        id: "human",
        names: REFERENCE_ROSTERS_V7.human?.files ?? [],
      },
      {
        title: "Dwarf",
        units: references.dwarf ?? [],
        grey: false,
        id: "dwarf",
        names: REFERENCE_ROSTERS_V7.dwarf?.files ?? [],
      },
      {
        title: "Dwarf, greyscale",
        units: references.dwarf ?? [],
        grey: true,
        id: "dwarf",
        names: REFERENCE_ROSTERS_V7.dwarf?.files ?? [],
      },
    ];
    const rowHeight = ROW * scale + 40;
    const canvas = blank(CELL * 8 * scale, rows.length * rowHeight, SHEET_BG);
    const labels: Label[] = [];
    rows.forEach((row, index) => {
      const top = index * rowHeight;
      labels.push({ text: row.title, left: 8, top: top + 4, size: 16 });
      drawRow(
        canvas,
        row.units,
        row.grey ? grey : grass,
        0,
        top + 26,
        scale,
        row.grey,
      );
      row.units.forEach((_, i) => {
        const m = measured[row.id]?.units[row.names[i] ?? ""];
        if (m === undefined || row.grey) return;
        labels.push({
          text: `L* ${m.meanLightness}  lit ${Math.round((m.light + m.bright) * 100)}%  dark ${Math.round(m.dark * 100)}%`,
          left: i * CELL * scale + 6,
          top: top + 26 + ROW * scale - 18,
          size: 12,
          fill: "#ffffff",
        });
      });
    });
    await save("diagnosis-x3.png", canvas, labels);
  }

  // ----------------------------------------------------- histograms
  {
    const entries: {
      title: string;
      histogram: readonly number[];
      colour: Rgb;
    }[] = [];
    const meanHistogram = (id: string): number[] => {
      const units = Object.values(measured[id]?.units ?? {});
      return Array.from(
        { length: 10 },
        (_, bin) =>
          units.reduce((sum, m) => sum + (m.histogram[bin] ?? 0), 0) /
          Math.max(1, units.length),
      );
    };
    entries.push({
      title: "Goblin before",
      histogram: meanHistogram("current"),
      colour: [138, 149, 47],
    });
    for (const [id, roster] of Object.entries(REFERENCE_ROSTERS_V7))
      entries.push({
        title: REFERENCE_NAMES[id] ?? id,
        histogram: meanHistogram(id),
        colour: rgbOf(
          FACTION_COLOURS_V7[roster.faction as keyof typeof FACTION_COLOURS_V7],
        ),
      });
    for (const name of ["Orc Brute", "Orc Warboss", "Troll"])
      entries.push({
        title: `${name} (before)`,
        histogram: measured.current?.units[name]?.histogram ?? [],
        colour: [74, 88, 48],
      });
    for (const direction of GOBLIN_DIRECTIONS_V7)
      entries.push({
        title: `Goblin ${direction.letter} mockup`,
        histogram: meanHistogram(direction.id),
        colour: rgbOf(direction.swatches[0]?.hex ?? "#888888"),
      });
    entries.push({
      title: "Goblin redesign (live)",
      histogram: meanHistogram("live"),
      colour: [134, 194, 50],
    });
    for (const name of ["Orc Brute", "Orc Warboss", "Troll"])
      entries.push({
        title: `${name} (live)`,
        histogram: measured.live?.units[name]?.histogram ?? [],
        colour: [134, 194, 50],
      });
    const w = 230;
    const h = 150;
    const cols = 4;
    const canvas = blank(
      cols * w,
      Math.ceil(entries.length / cols) * h,
      SHEET_BG,
    );
    const labels: Label[] = [];
    entries.forEach((entry, index) => {
      const left = (index % cols) * w + 10;
      const top = Math.floor(index / cols) * h + 8;
      labels.push({ text: entry.title, left, top, size: 13 });
      const base = top + 120;
      entry.histogram.forEach((share, bin) => {
        const barH = Math.round(Math.min(1, share / 0.4) * 90);
        const g = Math.round(((bin + 0.5) / 10) * 255);
        fill(canvas, left + bin * 20, base - barH, 16, Math.max(1, barH), [
          g,
          g,
          g,
        ]);
      });
      fill(canvas, left, base + 2, 200, 3, entry.colour);
      labels.push({
        text: "L* 0 to 100, bar height = share (40% full)",
        left,
        top: base + 6,
        size: 9,
        fill: MUTED,
      });
    });
    await save("histograms.png", canvas, labels);
  }

  // ----------------------------------------------------- directions per ground
  for (const g of [grass, snow, mountain]) {
    for (const scale of [1, 3]) {
      const all = [...looks, ...refLooks];
      const labelHeight = 22 * Math.min(scale, 2);
      const rowHeight = ROW * scale + labelHeight;
      const canvas = blank(CELL * 8 * scale, all.length * rowHeight, SHEET_BG);
      const labels: Label[] = [];
      all.forEach((look, index) => {
        const top = index * rowHeight;
        labels.push({
          text: `${look.title} on ${g.name}`,
          left: 6,
          top: top + 2,
          size: scale === 1 ? 11 : 16,
        });
        drawRow(canvas, look.units, g, 0, top + labelHeight, scale);
      });
      await save(
        `directions-${g.id}-${scale === 1 ? "1x" : "x3"}.png`,
        canvas,
        labels,
      );
    }
  }

  // ----------------------------------------------------- portraits, cities, ships
  {
    const before = (sprites: readonly GoblinSpriteV7[]): Promise<Raster[]> =>
      Promise.all(sprites.map((sprite) => loadGoblinBeforeV7(ROOT, sprite)));
    const now = (sprites: readonly GoblinSpriteV7[]): Promise<Raster[]> =>
      Promise.all(sprites.map((sprite) => load(sprite.file)));
    const portraits = await before(GOBLIN_PORTRAITS_V7);
    const cities = await before(GOBLIN_CITIES_V7);
    const ships = await before(GOBLIN_SHIPS_V7);
    const variants: {
      title: string;
      portraits: Raster[];
      cities: Raster[];
      ships: Raster[];
    }[] = [
      { title: "Before (retired)", portraits, cities, ships },
      ...GOBLIN_DIRECTIONS_V7.map((direction) => ({
        title: `${direction.letter}: ${direction.name}`,
        portraits: recolourAll(portraits, GOBLIN_PORTRAITS_V7, direction),
        cities: recolourAll(cities, GOBLIN_CITIES_V7, direction),
        ships: recolourAll(ships, GOBLIN_SHIPS_V7, direction),
      })),
      {
        title: "Redesign (live)",
        portraits: await now(GOBLIN_PORTRAITS_V7),
        cities: await now(GOBLIN_CITIES_V7),
        ships: await now(GOBLIN_SHIPS_V7),
      },
    ];
    const scale = 2;
    const rowHeight = 110 * scale + 24;
    const portraitWidth = 8 * 52 * scale;
    const cityWidth = 3 * 100 * scale;
    const shipWidth = 3 * 92 * scale;
    const canvas = blank(
      portraitWidth + cityWidth + shipWidth + 32,
      variants.length * rowHeight,
      SHEET_BG,
    );
    const labels: Label[] = [];
    variants.forEach((variant, index) => {
      const top = index * rowHeight;
      labels.push({ text: variant.title, left: 6, top: top + 2, size: 15 });
      const y = top + 24;
      tileGround(canvas, grass, 0, y, portraitWidth, 110 * scale, scale);
      variant.portraits.forEach((p, i) =>
        blit(canvas, p, i * 52 * scale + 4, y + 30 * scale, scale),
      );
      const cx = portraitWidth + 16;
      tileGround(canvas, grass, cx, y, cityWidth, 110 * scale, scale);
      variant.cities.forEach((c, i) =>
        blit(
          canvas,
          c,
          cx + i * 100 * scale,
          y + (110 - c.height) * scale,
          scale,
        ),
      );
      const sx = cx + cityWidth + 16;
      tileGround(
        canvas,
        { ...grass, tile: blank(80, 80, [66, 119, 165]) as Raster },
        sx,
        y,
        shipWidth,
        110 * scale,
        scale,
      );
      variant.ships.forEach((s, i) =>
        blit(
          canvas,
          s,
          sx + i * 92 * scale,
          y + (108 - s.height) * scale,
          scale,
        ),
      );
    });
    await save("extras-x2.png", canvas, labels);
  }

  // ----------------------------------------------------- classes
  {
    const scale = 3;
    const rowHeight = ROW * scale + 26;
    const canvas = blank(CELL * 8 * scale, 2 * rowHeight, SHEET_BG);
    const labels: Label[] = [
      { text: "The sprites before the redesign", left: 6, top: 4, size: 16 },
      {
        text: "Pixel classes: ink black, skin green, leather tan, wood dark brown, rust red, metal blue-grey, cream, hazard yellow, kept (fireworks, tongues) magenta",
        left: 6,
        top: rowHeight + 4,
        size: 14,
      },
    ];
    drawRow(canvas, current, grey, 0, 26, scale);
    drawRow(
      canvas,
      current.map((unit, i) => classMap(unit, GOBLIN_ROSTER_V7[i])),
      grey,
      0,
      rowHeight + 26,
      scale,
    );
    await save("classes-x3.png", canvas, labels);
  }

  // ----------------------------------------------------- result
  const share = (m: ValueMetricsV7 | undefined): string =>
    m === undefined
      ? ""
      : `L* ${m.meanLightness}  lit ${Math.round((m.light + m.bright) * 100)}%  dark ${Math.round(m.dark * 100)}%  yellow ${Math.round(m.factionColour * 1000) / 10}%`;
  {
    const scale = 3;
    const rows: {
      title: string;
      units: Raster[];
      grey: boolean;
      id: string;
    }[] = [
      { title: "Before", units: current, grey: false, id: "current" },
      { title: "Redesign (live)", units: live, grey: false, id: "live" },
      {
        title: "Before, greyscale (L*)",
        units: current,
        grey: true,
        id: "current",
      },
      {
        title: "Redesign, greyscale (L*)",
        units: live,
        grey: true,
        id: "live",
      },
    ];
    const rowHeight = ROW * scale + 44;
    const canvas = blank(CELL * 8 * scale, rows.length * rowHeight, SHEET_BG);
    const labels: Label[] = [];
    rows.forEach((row, index) => {
      const top = index * rowHeight;
      labels.push({ text: row.title, left: 8, top: top + 4, size: 16 });
      drawRow(
        canvas,
        row.units,
        row.grey ? grey : grass,
        0,
        top + 26,
        scale,
        row.grey,
      );
      if (!row.grey)
        names.forEach((name, i) =>
          labels.push({
            text: share(measured[row.id]?.units[name]),
            left: i * CELL * scale + 6,
            top: top + 28 + ROW * scale,
            size: 11,
            fill: MUTED,
          }),
        );
    });
    await save("result-x3.png", canvas, labels);
  }
  const lit = (m: ValueMetricsV7 | undefined): number =>
    m === undefined ? 0 : Math.round((m.light + m.bright) * 1000) / 1000;
  const result = {
    bead: "pulp_wars-wrn.2",
    note: "Before: the superseded recipes' recorded candidates. After: the live masters. The study's acceptance: mean L* 50 or more, lit 45% or more, the faction colour on the sprite.",
    units: names.map((name) => {
      const before = measured.current?.units[name];
      const after = measured.live?.units[name];
      return {
        unit: name,
        before: {
          meanLightness: before?.meanLightness,
          lit: lit(before),
          dark: before?.dark,
          p90: before?.p90,
          factionColour: before?.factionColour,
        },
        after: {
          meanLightness: after?.meanLightness,
          lit: lit(after),
          dark: after?.dark,
          p90: after?.p90,
          factionColour: after?.factionColour,
        },
      };
    }),
  };

  // ----------------------------------------------------- index
  const recolourStats = GOBLIN_DIRECTIONS_V7.map((direction) => ({
    direction: direction.id,
    units: GOBLIN_ROSTER_V7.flatMap((unit, index) => {
      const raster = current[index];
      if (raster === undefined) return [];
      const result = recolourGoblinSpriteV7(raster, direction, unit);
      return [
        {
          unit: unit.name,
          classes: result.counts,
          innerLinePixels: result.innerLinePixels,
          rimPixels: result.rimPixels,
        },
      ];
    }),
  }));
  // Each direction's lit colours against the other factions' signature
  // colours and the grounds: the nearest one, normal vision and the worse
  // of the two colour-vision deficiencies.
  const collisions = GOBLIN_DIRECTIONS_V7.map((direction) => ({
    direction: direction.id,
    swatches: direction.swatches.map((swatch) => {
      const pairs = [
        ...SIGNATURE_COLOURS_V7.map((s) =>
          colourPair(swatch.role, rgbOf(swatch.hex), s.name, rgbOf(s.hex)),
        ),
        ...ground
          .filter((g) => g.id !== "grey")
          .map((g) =>
            colourPair(swatch.role, rgbOf(swatch.hex), g.name, g.mean),
          ),
      ];
      const normal = pairs.reduce((best, pair) =>
        pair.deltaE < best.deltaE ? pair : best,
      );
      const cvd = pairs.reduce((best, pair) =>
        worstDeltaE(pair) < worstDeltaE(best) ? pair : best,
      );
      return {
        role: swatch.role,
        hex: swatch.hex,
        nearest: normal.b,
        deltaE: normal.deltaE,
        nearestUnderDeficiency: cvd.b,
        worstDeltaE: worstDeltaE(cvd),
      };
    }),
  }));
  const index = {
    bead: "pulp_wars-wrn.1",
    note: "Recolour mockups of the Goblin shapes before the redesign ('current' in metrics); 'live' is the redesigned roster of bead pulp_wars-wrn.2. No PixelLab call, no production asset changed.",
    grounds: ground.map((g) => ({
      id: g.id,
      mean: g.mean.map(Math.round),
      lightness: Math.round(lab(g.mean)[0]),
    })),
    directions: GOBLIN_DIRECTIONS_V7,
    collisions,
    metrics: measured,
    result,
    recolour: recolourStats,
    files: [...written, "index.json"],
  };
  await writeFile(
    path.join(OUT, "index.json"),
    await format(JSON.stringify(index), { parser: "json" }),
  );
  const out = option("--out");
  if (out !== undefined) {
    await mkdir(out, { recursive: true });
    for (const file of [...written, "index.json"])
      await copyFile(path.join(OUT, file), path.join(out, file));
  }
  console.log(
    `Wrote ${written.length + 1} files to ${path.relative(ROOT, OUT)}`,
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
