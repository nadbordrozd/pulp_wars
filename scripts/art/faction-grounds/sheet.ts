/**
 * Review sheets of ground candidates (bead pulp_wars-2yc.48): a ground as a
 * tiled field at the board's size (one cell is 80 px, zoom 1), with the
 * faction's units, a patch of its forest, a city and two resources on it.
 * Drawn here from the checked-in masters, not by the game: the forest has
 * no shade under it and the units no shadow, so a sheet shows the ground,
 * its repetition and how the sprites stand off it, and the board scenes
 * show the rest.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp, { type OverlayOptions } from "sharp";
import { forestHashV7 } from "../../../src/render/canvas/chibi-forest-packing-v7";
import type { GroundFaction } from "./candidates";
import { GROUND_CELL } from "./derive";

const CELL = GROUND_CELL;
const CHIBI = "public/assets/chibi";

export interface GroundPanel {
  readonly label: string;
  readonly faction: GroundFaction;
  /** The three tiles as the board draws them, RGBA, 80 x 80. */
  readonly tiles: readonly (Uint8Array | Uint8ClampedArray)[];
}

/** What stands on a faction's panel. */
const CAST: Readonly<
  Record<
    GroundFaction,
    {
      readonly units: readonly string[];
      readonly city: string;
      readonly forest: string;
      readonly resources: readonly string[];
    }
  >
> = {
  CULT: {
    units: [
      "direction-cult-initiate",
      "direction-cult-horror",
      "direction-cult-summoner",
    ],
    city: "chibi-direction-cult-city-2",
    forest: "cult",
    resources: ["chibi-fruit", "chibi-direction-cult-frog"],
  },
  UNDEAD: {
    units: [
      "direction-undead-skeleton",
      "direction-undead-zombie",
      "direction-undead-necromancer",
    ],
    city: "chibi-direction-undead-city-2",
    forest: "undead",
    resources: ["chibi-fruit", "chibi-game"],
  },
  DWARF: {
    units: [
      "direction-dwarf-hammerer",
      "direction-dwarf-clockwork-gunner",
      "direction-dwarf-steam-tank",
    ],
    city: "chibi-direction-dwarf-city-2",
    forest: "dwarf",
    resources: ["chibi-fruit", "chibi-game"],
  },
  CANDY: {
    units: [
      "direction-candy-gummy-bear",
      "direction-candy-gumdrop",
      "direction-candy-confectioner",
    ],
    city: "chibi-direction-candy-city-2",
    forest: "candy",
    resources: ["chibi-direction-candy-crumbs", "chibi-fruit"],
  },
  MARTIAN: {
    units: [
      "direction-martian-grunt",
      "direction-martian-ray-gunner",
      "direction-martian-tripod",
    ],
    city: "chibi-direction-martian-city-2",
    forest: "martian",
    resources: ["chibi-fruit", "chibi-game"],
  },
  GOBLIN: {
    units: [
      "direction-goblin-goblin",
      "direction-goblin-wolf-rider",
      "direction-goblin-orc-brute",
    ],
    city: "chibi-direction-goblin-city-2",
    forest: "goblin",
    resources: ["chibi-fruit", "chibi-game"],
  },
};

export const PANEL_COLUMNS = 6;
export const PANEL_ROWS = 4;
const HEADER = 26;
/** Room over the top row for the 24 px band of tree tops. */
const BAND = 24;

/** The variant of a cell, as the board picks it. */
export function panelVariant(x: number, y: number, variants: number): number {
  return forestHashV7(x, y, 3, 0x51) % variants;
}

/** A field of `columns` x `rows` cells of a ground, RGBA. */
export function groundField(
  tiles: GroundPanel["tiles"],
  columns: number,
  rows: number,
  origin: { readonly x: number; readonly y: number } = { x: 0, y: 0 },
): Buffer {
  const width = columns * CELL;
  const data = Buffer.alloc(width * rows * CELL * 4);
  for (let cy = 0; cy < rows; cy += 1)
    for (let cx = 0; cx < columns; cx += 1) {
      const tile =
        tiles[panelVariant(cx + origin.x, cy + origin.y, tiles.length)];
      if (tile === undefined) continue;
      for (let y = 0; y < CELL; y += 1)
        for (let x = 0; x < CELL; x += 1) {
          const from = (y * CELL + x) * 4;
          const to = ((cy * CELL + y) * width + cx * CELL + x) * 4;
          data[to] = tile[from] ?? 0;
          data[to + 1] = tile[from + 1] ?? 0;
          data[to + 2] = tile[from + 2] ?? 0;
          data[to + 3] = 255;
        }
    }
  return data;
}

async function sprite(
  root: string,
  file: string,
): Promise<{ input: Buffer; width: number; height: number }> {
  const input = await readFile(path.join(root, file));
  const { width = 0, height = 0 } = await sharp(input).metadata();
  return { input, width, height };
}

function header(label: string, width: number): Buffer {
  const text = label
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${HEADER}"><rect width="100%" height="100%" fill="#16181c"/><text x="8" y="18" font-family="Helvetica, Arial, sans-serif" font-size="14" font-weight="700" fill="#f2f0e8">${text}</text></svg>`,
  );
}

/** One labelled panel as a PNG. */
export async function groundPanelPng(
  root: string,
  panel: GroundPanel,
  seedOf = 0,
): Promise<Buffer> {
  const cast = CAST[panel.faction];
  const width = PANEL_COLUMNS * CELL;
  const fieldRows = PANEL_ROWS + 1;
  const field = groundField(panel.tiles, PANEL_COLUMNS, fieldRows, {
    x: seedOf * 7,
    y: seedOf * 3,
  });
  const top = HEADER;
  // The field starts one cell above the panel, so the band of tree tops
  // has ground behind it; the panel shows the last BAND px of that row.
  const fieldTop = top + BAND - CELL;
  const cellAt = (cx: number, cy: number): { left: number; top: number } => ({
    left: cx * CELL,
    top: top + BAND + cy * CELL,
  });
  const layers: OverlayOptions[] = [];
  const stand = async (file: string, cx: number, cy: number, lift = 8) => {
    const image = await sprite(root, file);
    const cell = cellAt(cx, cy);
    layers.push({
      input: image.input,
      left: Math.round(cell.left + CELL / 2 - image.width / 2),
      top: Math.round(cell.top + CELL - lift - image.height),
    });
  };
  // A 2 x 2 piece and a 1 x 1 piece of the faction's wood.
  const big = await sprite(
    root,
    `${CHIBI}/forest/${cast.forest}/chibi-forest-${cast.forest}-piece-2x2-a.png`,
  );
  layers.push({
    input: big.input,
    left: 0,
    top: cellAt(0, 2).top - big.height,
  });
  const small = await sprite(
    root,
    `${CHIBI}/forest/${cast.forest}/chibi-forest-${cast.forest}-piece-1x1-b.png`,
  );
  layers.push({
    input: small.input,
    left: cellAt(5, 0).left,
    top: cellAt(5, 1).top - small.height,
  });
  await stand(`${CHIBI}/settlements/${cast.city}.png`, 3, 1, 2);
  await stand(`${CHIBI}/resources/${cast.resources[0]}.png`, 2, 0, 16);
  await stand(`${CHIBI}/resources/${cast.resources[1]}.png`, 5, 3, 16);
  const places: readonly (readonly [number, number])[] = [
    [2, 2],
    [4, 2],
    [1, 3],
  ];
  for (const [index, unit] of cast.units.entries()) {
    const place = places[index];
    if (place !== undefined)
      await stand(`${CHIBI}/units/chibi-${unit}.png`, place[0], place[1]);
  }
  const height = top + BAND + PANEL_ROWS * CELL;
  return sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 22, g: 24, b: 28, alpha: 1 },
    },
  })
    .composite([
      {
        input: await sharp(field, {
          raw: { width, height: fieldRows * CELL, channels: 4 },
        })
          .extract({
            left: 0,
            top: -fieldTop + top,
            width,
            height: BAND + PANEL_ROWS * CELL,
          })
          .png()
          .toBuffer(),
        left: 0,
        top,
      },
      ...layers,
      { input: header(panel.label, width), left: 0, top: 0 },
    ])
    .png()
    .toBuffer();
}

/** Panels side by side, with a gap, as a PNG; also written 2x enlarged. */
export async function groundSheet(
  root: string,
  panels: readonly GroundPanel[],
  out: string,
  perRow = 4,
): Promise<void> {
  const gap = 12;
  const images = [];
  for (const [index, panel] of panels.entries())
    images.push(await groundPanelPng(root, panel, index));
  const first = await sharp(images[0]).metadata();
  const panelWidth = first.width ?? 0;
  const panelHeight = first.height ?? 0;
  const columns = Math.min(perRow, images.length);
  const rows = Math.ceil(images.length / columns);
  const width = columns * panelWidth + (columns - 1) * gap;
  const height = rows * panelHeight + (rows - 1) * gap;
  await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 22, g: 24, b: 28, alpha: 1 },
    },
  })
    .composite(
      images.map((input, index) => ({
        input,
        left: (index % columns) * (panelWidth + gap),
        top: Math.floor(index / columns) * (panelHeight + gap),
      })),
    )
    .png()
    .toFile(out);
  await sharp(out)
    .resize(width * 2, height * 2, { kernel: "nearest" })
    .toFile(out.replace(/\.png$/, "-x2.png"));
}
