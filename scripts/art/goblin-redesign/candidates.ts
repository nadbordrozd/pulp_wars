/**
 * Candidate sheet of the Goblin redesign (bead pulp_wars-wrn.2): any PNGs
 * side by side at x4 on Grass, at 1x on Grass, Snow and Mountain ground and
 * at x2 in greyscale, with the study's value measurements under each. It
 * makes no PixelLab call and writes only the sheet it is asked for.
 *
 *   npx tsx scripts/art/goblin-redesign/candidates.ts --out FILE.png \
 *     [--scale 4] label=path.png label=sheet.png#2 …
 *
 * `#N` reads a raw sheet of N candidates and shows each (label.0, …).
 *
 * Prints one line per sprite: mean L*, the dark (L* < 35) and lit
 * (L* >= 55) shares of the non-ink pixels, the 90th percentile, the ink
 * share, the hazard-yellow share and the opaque bounds.
 */
import path from "node:path";
import process from "node:process";
import { FACTION_COLOURS_V7 } from "../../../src/render/canvas/faction-colours-v7";
import type { RgbaRaster } from "../chibi/owner-mask";
import { readRaster } from "../chibi/pipeline";
import { candidateCell, cropRaster } from "../chibi/raster";
import { lab, rgbOf, type Rgb } from "../ice-folk-direction/colour";
import {
  blank,
  blit,
  writeSheet,
  type Canvas,
  type Label,
} from "../ice-folk-direction/raster-tools";
import { valueMetricsV7 } from "./measure";

type Raster = RgbaRaster & { readonly data: Uint8Array };

const ROOT = process.cwd();
const BG: Rgb = [30, 32, 36];

function option(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index < 0 ? undefined : process.argv[index + 1];
}

export function greyscale(raster: RgbaRaster): Raster {
  const data = new Uint8Array(raster.data);
  for (let index = 0; index < raster.width * raster.height; index += 1) {
    const o = index * 4;
    const l = lab([data[o] ?? 0, data[o + 1] ?? 0, data[o + 2] ?? 0])[0];
    const grey = Math.round((l / 100) * 255);
    data.set([grey, grey, grey], o);
  }
  return { width: raster.width, height: raster.height, data };
}

/** The Ice Folk Snow overlay: a 42% wash of #f5f8fc over the Grass tile. */
export function snowOf(grass: RgbaRaster): Raster {
  const data = new Uint8Array(grass.data);
  const snow = rgbOf("#f5f8fc");
  for (let index = 0; index < grass.width * grass.height; index += 1)
    for (let c = 0; c < 3; c += 1)
      data[index * 4 + c] = Math.round(
        (data[index * 4 + c] ?? 0) * 0.58 + (snow[c] ?? 0) * 0.42,
      );
  return { width: grass.width, height: grass.height, data };
}

export function meanOf(raster: RgbaRaster): Rgb {
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

/** Tiles a ground over a rectangle of the canvas at a scale. */
export function tileGround(
  canvas: Canvas,
  tile: RgbaRaster,
  left: number,
  top: number,
  width: number,
  height: number,
  scale: number,
): void {
  const strip = blank(Math.ceil(width / scale), Math.ceil(height / scale), BG);
  for (let y = 0; y < strip.height; y += tile.height)
    for (let x = 0; x < strip.width; x += tile.width) blit(strip, tile, x, y);
  blit(canvas, strip, left, top, scale);
}

export interface SpriteMetrics {
  readonly label: string;
  readonly meanLightness: number;
  readonly dark: number;
  readonly lit: number;
  readonly p90: number;
  readonly ink: number;
  readonly hazard: number;
  readonly width: number;
  readonly height: number;
}

export function spriteMetrics(
  label: string,
  raster: RgbaRaster,
  ground: Rgb,
): SpriteMetrics {
  const m = valueMetricsV7(raster, FACTION_COLOURS_V7.GOBLIN, ground);
  return {
    label,
    meanLightness: m.meanLightness,
    dark: m.dark,
    lit: Math.round((m.light + m.bright) * 1000) / 1000,
    p90: m.p90,
    ink: m.ink,
    hazard: m.factionColour,
    width: m.width,
    height: m.height,
  };
}

async function main(): Promise<void> {
  const out = option("--out");
  if (out === undefined) throw new Error("--out FILE.png is required");
  const scale = Number(option("--scale") ?? 4);
  const listed = process.argv
    .slice(2)
    .filter((arg) => arg.includes("=") && !arg.startsWith("--"))
    .map((arg) => {
      const at = arg.indexOf("=");
      return { label: arg.slice(0, at), file: arg.slice(at + 1) };
    });
  const load = (file: string): Promise<Raster> =>
    readRaster(path.isAbsolute(file) ? file : path.join(ROOT, file));
  const grass = await load("public/assets/chibi/terrain/chibi-grass-1.png");
  const mountain = await load(
    "public/assets/chibi/terrain/chibi-mountain-ground-1.png",
  );
  const snow = snowOf(grass);
  // `label=sheet.png#N` is a raw sheet of N candidates: show each one.
  const items: { label: string; file: string }[] = [];
  const sprites: Raster[] = [];
  for (const item of listed) {
    const hash = item.file.lastIndexOf("#");
    if (hash < 0) {
      items.push(item);
      sprites.push(await load(item.file));
      continue;
    }
    const count = Number(item.file.slice(hash + 1));
    const sheet = await load(item.file.slice(0, hash));
    const columns = Math.ceil(Math.sqrt(count));
    const size = {
      width: sheet.width / columns,
      height: sheet.height / Math.ceil(count / columns),
    };
    for (let k = 0; k < count; k += 1) {
      items.push({ label: `${item.label}.${k}`, file: item.file });
      sprites.push(
        cropRaster(sheet, {
          ...candidateCell(k, count, size),
          ...size,
        }) as Raster,
      );
    }
  }
  const cell = Math.max(...sprites.map((s) => s.width)) + 8;
  const rowHeight = Math.max(...sprites.map((s) => s.height)) + 8;
  const n = sprites.length;
  const margin = 12;
  const width = Math.max(cell * scale * n, 3 * cell * n) + margin * 2;
  const top4 = 30;
  const top1 = top4 + rowHeight * scale + 44;
  const topGrey = top1 + rowHeight * 3 + 24;
  const height = topGrey + rowHeight * 2 + margin;
  const canvas = blank(width, height, BG);
  const labels: Label[] = [];
  tileGround(
    canvas,
    grass,
    margin,
    top4,
    cell * scale * n,
    rowHeight * scale,
    scale,
  );
  [grass, snow, mountain].forEach((tile, row) =>
    tileGround(
      canvas,
      tile,
      margin,
      top1 + row * rowHeight,
      cell * n,
      rowHeight,
      1,
    ),
  );
  const grassMean = meanOf(grass);
  sprites.forEach((sprite, index) => {
    const item = items[index];
    if (item === undefined) return;
    const dx = Math.floor((cell - sprite.width) / 2);
    const dy = rowHeight - sprite.height - 4;
    blit(
      canvas,
      sprite,
      margin + (index * cell + dx) * scale,
      top4 + dy * scale,
      scale,
    );
    for (let row = 0; row < 3; row += 1)
      blit(
        canvas,
        sprite,
        margin + index * cell + dx,
        top1 + row * rowHeight + dy,
      );
    blit(
      canvas,
      greyscale(sprite),
      margin + (index * cell + dx) * 2,
      topGrey + dy * 2,
      2,
    );
    const m = spriteMetrics(item.label, sprite, grassMean);
    labels.push({
      text: item.label,
      left: margin + index * cell * scale + 4,
      top: 8,
      size: 13,
    });
    labels.push({
      text: `L* ${m.meanLightness}  dark ${Math.round(m.dark * 100)}%  lit ${Math.round(m.lit * 100)}%`,
      left: margin + index * cell * scale + 4,
      top: top4 + rowHeight * scale + 4,
      size: 12,
    });
    labels.push({
      text: `p90 ${m.p90}  ink ${Math.round(m.ink * 100)}%  yellow ${Math.round(m.hazard * 1000) / 10}%  ${m.width}x${m.height}`,
      left: margin + index * cell * scale + 4,
      top: top4 + rowHeight * scale + 20,
      size: 12,
      fill: "#a9b0b8",
    });
    process.stdout.write(`${JSON.stringify(m)}\n`);
  });
  await writeSheet(
    path.isAbsolute(out) ? out : path.join(ROOT, out),
    canvas,
    labels,
  );
}

if (process.argv[1]?.endsWith("candidates.ts") === true)
  main().catch((error: unknown) => {
    process.stderr.write(
      `${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exitCode = 1;
  });
