/**
 * The review sheets of the holistic Cult palettes (bead pulp_wars-mch9.58):
 * one sheet and one board mock per palette (and for the current look), and
 * a contact sheet of every board at game scale.
 */
import { mkdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import sharp from "sharp";
import {
  BUILDING_FADE_GROUNDS_V7,
  BUILDING_FADE_V7,
  fadeBuildingPixelsV7,
} from "../../../src/render/canvas/building-fade-v7";
import type { RgbaRaster } from "../chibi/owner-mask";
import { readRaster } from "../chibi/pipeline";
import { rgbOf, type Rgb } from "../ice-folk-direction/colour";
import {
  blank,
  blit,
  writeSheet,
  type Canvas,
  type Label,
} from "../ice-folk-direction/raster-tools";
import {
  BUILDINGS_LIST,
  CAMPAIGN,
  CITIES,
  CREATURES,
  PALETTES,
  ROBED,
  SHIP_PORTRAITS,
  SHIPS,
  recolour,
  type CultAsset,
  type CultPalette,
} from "./recolour";

const ROOT = process.cwd();
const A = "public/assets/chibi";
const BG: Rgb = [30, 32, 36];
const PANEL: Rgb = [58, 62, 70];
const MUTED = "#a9b0b8";
const CELL = 80;
/** The current production colours of the Cult. */
const CURRENT_BORDER = "#00ff78";

const cache = new Map<string, RgbaRaster>();

async function load(file: string): Promise<RgbaRaster> {
  const hit = cache.get(file);
  if (hit !== undefined) return hit;
  const raster = await readRaster(path.join(ROOT, file));
  cache.set(file, raster);
  return raster;
}

/** An asset under a palette (or as it is, with none). */
async function look(
  asset: CultAsset,
  palette: CultPalette | undefined,
): Promise<RgbaRaster> {
  const key = `${palette?.id ?? "current"}:${asset.id}`;
  const hit = cache.get(key);
  if (hit !== undefined) return hit;
  const raster = await load(asset.file);
  const out = palette === undefined ? raster : recolour(asset, raster, palette);
  cache.set(key, out);
  return out;
}

const looks = (
  assets: readonly CultAsset[],
  palette: CultPalette | undefined,
): Promise<RgbaRaster[]> =>
  Promise.all(assets.map((asset) => look(asset, palette)));

type Ground = "CULT" | "UNDEAD" | "NEUTRAL";

/** A building as the board draws it: faded toward its ground. */
function faded(sprite: RgbaRaster, ground: Ground): RgbaRaster {
  if (BUILDING_FADE_V7 === null) return sprite;
  return {
    width: sprite.width,
    height: sprite.height,
    data: new Uint8Array(
      fadeBuildingPixelsV7(new Uint8ClampedArray(sprite.data), {
        strength: BUILDING_FADE_V7,
        ground: BUILDING_FADE_GROUNDS_V7[ground],
      }),
    ),
  };
}

/** A sprite bottom-centred on a cell whose top-left is (left, top). */
function place(
  canvas: Canvas,
  sprite: RgbaRaster,
  left: number,
  top: number,
  scale: number,
  cell = CELL,
): void {
  blit(
    canvas,
    sprite,
    left + Math.floor(((cell - sprite.width) * scale) / 2),
    top + (cell - sprite.height) * scale,
    scale,
  );
}

const tiles = (pattern: string, count: number): Promise<RgbaRaster[]> =>
  Promise.all(
    Array.from({ length: count }, (_, k) =>
      load(pattern.replace("#", String(k + 1))),
    ),
  );

const bogTiles = (): Promise<RgbaRaster[]> =>
  tiles(`${A}/terrain/faction-grass/chibi-cult-grass-#.png`, 6);

const titleOf = (palette: CultPalette | undefined): string =>
  palette === undefined
    ? "Current (production): red robes, indigo lodge"
    : palette.name.replace(/\s+/g, " ");

/** Swatches: the main ramp, the accent and the border. */
function swatches(
  canvas: Canvas,
  labels: Label[],
  palette: CultPalette | undefined,
  left: number,
  top: number,
): void {
  const ramp = palette?.ramp.map(([, hex]) => hex) ?? [
    "#2a0a0e",
    "#4a1118",
    "#6e1a22",
    "#8f2430",
    "#b0323e",
  ];
  ramp.forEach((hex, k) =>
    blit(canvas, blank(22, 22, rgbOf(hex)), left + k * 24, top),
  );
  let x = left + ramp.length * 24 + 16;
  const named: [string, string][] = [
    ["main", palette?.main ?? "#8f2430"],
    ["accent", palette?.accent ?? "#c9a24a"],
    ["border", palette?.border ?? CURRENT_BORDER],
  ];
  for (const [name, hex] of named) {
    blit(canvas, blank(22, 22, rgbOf(hex)), x, top);
    labels.push({
      text: `${name} ${hex}`,
      left: x + 28,
      top: top + 3,
      size: 12,
      fill: MUTED,
    });
    x += 150;
  }
}

/** The per-palette sheet: every Cult piece the palette touches. */
async function paletteSheet(
  out: string,
  palette: CultPalette | undefined,
): Promise<string> {
  const bog = await bogTiles();
  const shallow = await load(`${A}/terrain/chibi-shallow-water-1.png`);
  const width = 2240;
  const labels: Label[] = [
    {
      text: `${titleOf(palette)} (pulp_wars-mch9.58)`,
      left: 8,
      top: 8,
      size: 20,
    },
    {
      text:
        palette === undefined
          ? "What the Cult looks like in production today, for comparison"
          : `${palette.note}. Border: ${palette.borderNote}.`,
      left: 8,
      top: 36,
      size: 13,
      fill: MUTED,
    },
  ];
  const canvas = blank(width, 1500, BG);
  swatches(canvas, labels, palette, 8, 60);

  // The robed cultists: 1x, x3, the busts x2 and 1x.
  let y = 100;
  labels.push({
    text: "The five robed cultists: 1x on the bog, x3, and the busts at x2 and 1x",
    left: 8,
    top: y,
    size: 14,
  });
  y += 24;
  const robed = await looks(ROBED, palette);
  for (let k = 0; k < 5; k += 1) {
    const sprite = robed[k] as RgbaRaster;
    blit(canvas, bog[k] as RgbaRaster, 8 + k * CELL, y + CELL * 2);
    place(canvas, sprite, 8 + k * CELL, y + CELL * 2, 1);
    const x3 = 8 + 5 * CELL + 16 + k * CELL * 3;
    blit(canvas, bog[(k + 2) % 6] as RgbaRaster, x3, y, 3);
    place(canvas, sprite, x3, y, 3);
    const bust = robed[k + 5] as RgbaRaster;
    const bx = 8 + 5 * CELL + 16 + 15 * CELL + 16 + k * 104;
    blit(canvas, blank(96, 96, PANEL), bx, y);
    blit(canvas, bust, bx, y, 2);
    blit(canvas, blank(48, 48, PANEL), bx, y + 104);
    blit(canvas, bust, bx, y + 104);
  }
  y += CELL * 3 + 16;

  // The places at x2 (true pixels) and 1x faded as on the board.
  labels.push({
    text: "The lodge's places: the three city levels, the seven buildings and the obelisk, x2 (true pixels) and 1x faded as the board draws buildings",
    left: 8,
    top: y,
    size: 14,
  });
  y += 24;
  const places = await looks([...CITIES, ...BUILDINGS_LIST], palette);
  places.forEach((sprite, k) => {
    const x = 8 + k * 200;
    blit(canvas, bog[k % 6] as RgbaRaster, x, y, 2);
    place(canvas, sprite, x, y, 2);
    blit(canvas, bog[(k + 3) % 6] as RgbaRaster, x + 40, y + 176);
    const shown = k < 3 ? sprite : faded(sprite, "CULT");
    place(canvas, shown, x + 40, y + 176, 1);
  });
  y += 160 + 16 + CELL + 16;

  // Ships on water, x2 and 1x; portraits; the lodge creatures.
  labels.push({
    text: "The ships: the Black Gondola, the Galleon of the Eye, the Kraken and the barge, x2 and 1x on Shallow Water; the ship portraits x2",
    left: 8,
    top: y,
    size: 14,
  });
  // The Galleon (96 px tall) stands 32 px over its x2 tile.
  y += 24 + 32;
  const ships = await looks(SHIPS, palette);
  ships.forEach((sprite, k) => {
    const x = 8 + k * 200;
    blit(canvas, shallow, x, y, 2);
    place(canvas, sprite, x, y, 2);
    blit(canvas, shallow, x + 40, y + 176);
    place(canvas, sprite, x + 40, y + 176, 1);
  });
  const portraits = await looks(SHIP_PORTRAITS, palette);
  portraits.forEach((sprite, k) => {
    const x = 8 + 4 * 200 + k * 104;
    blit(canvas, blank(96, 96, PANEL), x, y);
    blit(canvas, sprite, x, y, 2);
  });
  labels.push({
    text: "the Familiar and the Herald (they wear the lodge colour), x2",
    left: 8 + 4 * 200 + 3 * 104 + 16,
    top: y - 20,
    size: 12,
    fill: MUTED,
  });
  const creatures = await looks(CREATURES, palette);
  creatures.forEach((sprite, k) => {
    const x = 8 + 4 * 200 + 3 * 104 + 16 + k * 216;
    blit(canvas, blank(208, 216, PANEL), x, y);
    place(canvas, sprite, x + 8, y + 8, 2, 100);
  });
  y += 256 + 32;

  labels.push({
    text: "The summons are never recoloured (teal bodies, yellow eyes): Imp, Horror, Gibbering Mass, Tentacle at x2, and at 1x beside two cultists; the campaign picture remapped, x2 and 1x",
    left: 8,
    top: y,
    size: 14,
  });
  y += 24;
  const summons = await Promise.all(
    ["imp", "horror", "mass", "tentacle"].map((n) =>
      load(`${A}/units/chibi-direction-cult-${n}.png`),
    ),
  );
  summons.forEach((sprite, k) => {
    const x = 8 + k * 200;
    blit(canvas, bog[k % 6] as RgbaRaster, x, y, 2);
    place(canvas, sprite, x, y, 2);
    const robe = robed[k] as RgbaRaster;
    blit(canvas, bog[(k + 1) % 6] as RgbaRaster, x + 40, y + 176);
    place(canvas, k % 2 === 0 ? sprite : robe, x + 40, y + 176, 1);
  });
  const campaign = await look(CAMPAIGN, palette);
  blit(canvas, campaign, 8 + 4 * 200 + 16, y, 2);
  blit(canvas, campaign, 8 + 4 * 200 + 16 + 272, y);
  y += 176 + CELL + 16;

  const name = `sheet-${palette?.id ?? "current"}.png`;
  const cropped = blank(width, y, BG);
  blit(cropped, canvas, 0, 0);
  await writeSheet(path.join(out, name), cropped, labels);
  return name;
}

/** Coordinates of a board tile and which territory owns it. */
type Owner = "UNDEAD" | "CULT" | "HUMAN" | undefined;
const COLS = 14;
const ROWS = 6;

function ownerOf(x: number, y: number): Owner {
  if (y > 4) return undefined;
  if (x <= 3) return "UNDEAD";
  if (x <= 9) return "CULT";
  return "HUMAN";
}

/** A territory border: the dark casing, then the colour, inside the edge. */
function border(board: Canvas, colour: Rgb): (x: number, y: number) => void {
  const casing: Rgb = [29, 42, 40];
  const mix = (index: number, rgb: Rgb, alpha: number): void => {
    for (let c = 0; c < 3; c += 1)
      board.data[index + c] = Math.round(
        (board.data[index + c] ?? 0) * (1 - alpha) + (rgb[c] ?? 0) * alpha,
      );
  };
  return (tx: number, ty: number): void => {
    const owner = ownerOf(tx, ty);
    const edges: [number, number][] = [
      [0, -1],
      [0, 1],
      [-1, 0],
      [1, 0],
    ];
    for (const [dx, dy] of edges) {
      const nx = tx + dx;
      const ny = ty + dy;
      if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) continue;
      if (ownerOf(nx, ny) === owner) continue;
      for (let d = 0; d < 7; d += 1)
        for (let s = 0; s < CELL; s += 1) {
          const px =
            dx === 0
              ? tx * CELL + s
              : dx < 0
                ? tx * CELL + d
                : tx * CELL + CELL - 1 - d;
          const py =
            dy === 0
              ? ty * CELL + s
              : dy < 0
                ? ty * CELL + d
                : ty * CELL + CELL - 1 - d;
          const index = (py * board.width + px) * 4;
          if (d >= 2 && d <= 4) mix(index, colour, 1);
          else mix(index, casing, 0.55);
        }
    }
  };
}

const FACTION_BORDERS: Record<"UNDEAD" | "HUMAN", string> = {
  UNDEAD: "#a221ee",
  HUMAN: "#d01c3a",
};

/** The board mock at 1x: Undead, Cult and Human towns side by side. */
export async function board(palette: CultPalette | undefined): Promise<Canvas> {
  const bog = await bogTiles();
  const grass = await tiles(`${A}/terrain/chibi-grass-#.png`, 3);
  const undeadGround = await tiles(
    `${A}/terrain/faction-grass/chibi-undead-grass-#.png`,
    1,
  );
  const shallow = await tiles(`${A}/terrain/chibi-shallow-water-#.png`, 2);
  const deep = await tiles(`${A}/terrain/chibi-deep-water-#.png`, 2);
  const canvas = blank(COLS * CELL, ROWS * CELL, BG);
  for (let y = 0; y < ROWS; y += 1)
    for (let x = 0; x < COLS; x += 1) {
      const k = x * 5 + y * 3;
      const tile =
        y === 5
          ? deep[k % 2]
          : y === 4
            ? shallow[k % 2]
            : x <= 3
              ? undeadGround[0]
              : x <= 9
                ? bog[k % 6]
                : grass[k % 3];
      blit(canvas, tile as RgbaRaster, x * CELL, y * CELL);
    }
  const borders = {
    UNDEAD: border(canvas, rgbOf(FACTION_BORDERS.UNDEAD)),
    CULT: border(canvas, rgbOf(palette?.border ?? CURRENT_BORDER)),
    HUMAN: border(canvas, rgbOf(FACTION_BORDERS.HUMAN)),
  };
  for (let y = 0; y < ROWS; y += 1)
    for (let x = 0; x < COLS; x += 1) {
      const owner = ownerOf(x, y);
      if (owner !== undefined) borders[owner](x, y);
    }
  const unit = (name: string): Promise<RgbaRaster> =>
    load(`${A}/units/chibi-${name}.png`);
  const building = async (file: string, ground: Ground): Promise<RgbaRaster> =>
    faded(await load(`${A}/buildings/${file}.png`), ground);
  const cult = async (
    asset: CultAsset,
    ground?: Ground,
  ): Promise<RgbaRaster> => {
    const raster = await look(asset, palette);
    return ground === undefined ? raster : faded(raster, ground);
  };
  const byId = (list: readonly CultAsset[], id: string): CultAsset => {
    const found = list.find((asset) => asset.id === id);
    if (found === undefined) throw new Error(`no asset ${id}`);
    return found;
  };
  const robe = (id: string): Promise<RgbaRaster> => cult(byId(ROBED, id));
  const place1 = (sprite: RgbaRaster, x: number, y: number): void =>
    place(canvas, sprite, x * CELL, y * CELL, 1);
  const pieces: [Promise<RgbaRaster>, number, number][] = [
    // Row 0, the back: three towns.
    [building("chibi-undead-sawmill", "UNDEAD"), 0, 0],
    [load(`${A}/settlements/chibi-direction-undead-city-2.png`), 1, 0],
    [unit("direction-undead-lich"), 3, 0],
    [cult(byId(BUILDINGS_LIST, "forge"), "CULT"), 4, 0],
    [cult(byId(BUILDINGS_LIST, "workshop"), "CULT"), 5, 0],
    [cult(byId(CITIES, "city-3")), 6, 0],
    [cult(byId(BUILDINGS_LIST, "market"), "CULT"), 8, 0],
    [cult(byId(BUILDINGS_LIST, "sawmill"), "CULT"), 9, 0],
    [building("chibi-market", "NEUTRAL"), 10, 0],
    [load(`${A}/settlements/chibi-direction-city-2.png`), 11, 0],
    [unit("direction-knight"), 13, 0],
    // Row 1.
    [unit("direction-undead-necromancer"), 0, 1],
    [unit("direction-undead-skeleton"), 2, 1],
    [robe("initiate"), 4, 1],
    [robe("hexer"), 6, 1],
    [load(`${A}/units/chibi-direction-cult-imp.png`), 7, 1],
    [robe("stargazer"), 9, 1],
    [unit("direction-fighter"), 10, 1],
    [unit("direction-marksman"), 12, 1],
    // Row 2.
    [unit("direction-undead-lich"), 1, 2],
    [unit("direction-undead-wight"), 3, 2],
    [robe("summoner"), 5, 2],
    [load(`${A}/units/chibi-direction-cult-horror.png`), 7, 2],
    [robe("initiate"), 8, 2],
    [unit("direction-knight"), 11, 2],
    [unit("direction-fighter"), 13, 2],
    // Row 3, the shore.
    [unit("direction-undead-necromancer"), 0, 3],
    [cult(byId(BUILDINGS_LIST, "shipyard"), "CULT"), 4, 3],
    [robe("idol-bearer"), 6, 3],
    [cult(byId(CREATURES, "familiar")), 7, 3],
    [robe("initiate"), 9, 3],
    [unit("direction-captain"), 12, 3],
    // Row 4, the harbours.
    [building("chibi-undead-port", "UNDEAD"), 0, 4],
    [unit("naval-undead-patrol-boat"), 2, 4],
    [cult(byId(SHIPS, "ship-patrol-boat")), 5, 4],
    [cult(byId(BUILDINGS_LIST, "port"), "CULT"), 7, 4],
    [cult(byId(SHIPS, "ship-transport")), 9, 4],
    [building("chibi-port", "NEUTRAL"), 10, 4],
    [unit("naval-human-battleship"), 12, 4],
    // Row 5, deep water.
    [unit("naval-undead-battleship"), 1, 5],
    [cult(byId(SHIPS, "ship-submarine")), 4, 5],
    [cult(byId(SHIPS, "ship-battleship")), 7, 5],
    [unit("naval-human-patrol-boat"), 11, 5],
  ];
  for (const [sprite, x, y] of pieces) place1(await sprite, x, y);
  return canvas;
}

async function boardSheet(
  out: string,
  palette: CultPalette | undefined,
): Promise<{ name: string; board: Canvas }> {
  const mock = await board(palette);
  const robed = await looks(ROBED, palette);
  const labels: Label[] = [
    {
      text: `${titleOf(palette)}: board mock at 1x and x2 (pulp_wars-mch9.58)`,
      left: 8,
      top: 8,
      size: 18,
    },
    {
      text: "Undead town (violet border) | the Cult town on the bog: city level 3, faded Forge, Workshop, Market, Sawmill, Shipyard and Port, the five cultists, the Familiar, an Imp and a Horror, the Gondola, barge, Kraken and Galleon in the harbour | Human town (crimson border)",
      left: 8,
      top: 34,
      size: 12,
      fill: MUTED,
    },
  ];
  const canvas = blank(16 + COLS * CELL * 2, 60 + ROWS * CELL * 3 + 24, BG);
  blit(canvas, mock, 8, 60);
  swatches(canvas, labels, palette, 8 + COLS * CELL + 24, 66);
  for (let k = 0; k < 5; k += 1) {
    const left = 8 + COLS * CELL + 24 + k * 104;
    blit(canvas, blank(96, 96, PANEL), left, 110);
    blit(canvas, robed[k + 5] as RgbaRaster, left, 110, 2);
    blit(canvas, blank(48, 48, PANEL), left, 214);
    blit(canvas, robed[k + 5] as RgbaRaster, left, 214);
  }
  blit(canvas, mock, 8, 60 + ROWS * CELL + 16, 2);
  const name = `board-${palette?.id ?? "current"}.png`;
  await writeSheet(path.join(out, name), canvas, labels);
  return { name, board: mock };
}

/** Every board at 1x, the current look first. */
async function contactSheet(
  out: string,
  boards: { palette: CultPalette | undefined; board: Canvas }[],
): Promise<string> {
  const w = COLS * CELL;
  const h = ROWS * CELL;
  const canvas = blank(8 + 2 * (w + 16), 48 + 3 * (h + 40), BG);
  const labels: Label[] = [
    {
      text: "Cult colour vision (pulp_wars-mch9.58): the current look and the four holistic palettes at board scale (1x)",
      left: 8,
      top: 8,
      size: 18,
    },
  ];
  boards.forEach(({ palette, board: mock }, k) => {
    const left = 8 + (k % 2) * (w + 16);
    const top = 48 + Math.floor(k / 2) * (h + 40);
    labels.push({ text: titleOf(palette), left, top, size: 15 });
    blit(canvas, mock, left, top + 24);
  });
  await writeSheet(path.join(out, "contact.png"), canvas, labels);
  return "contact.png";
}

export async function sheets(out: string, copy?: string): Promise<void> {
  await mkdir(out, { recursive: true });
  const names: string[] = [];
  const boards: { palette: CultPalette | undefined; board: Canvas }[] = [];
  for (const palette of [undefined, ...PALETTES]) {
    names.push(await paletteSheet(out, palette));
    const result = await boardSheet(out, palette);
    names.push(result.name);
    boards.push({ palette, board: result.board });
  }
  names.push(await contactSheet(out, boards));
  if (copy === undefined) return;
  const target = path.resolve(ROOT, copy);
  await mkdir(target, { recursive: true });
  for (const name of names)
    await sharp(path.join(out, name))
      .png({
        palette: true,
        colours: 256,
        dither: 0,
        compressionLevel: 9,
        effort: 10,
      })
      .toFile(path.join(target, name));
}
