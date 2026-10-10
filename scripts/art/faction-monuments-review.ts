/**
 * Faction Monument review (bead pulp_wars-eu3r.2, docs/art/FACTION_BUILDINGS.md,
 * "Faction Monuments"): contact sheets of the accepted masters of the batches
 * `monuments-<faction>` beside the Human ones (batch `monuments`) and the
 * shared obelisk. No PixelLab call, no browser.
 *
 *   npm run art:faction-monuments-review [-- --out DIR]
 *
 * Writes to art/pixellab/reviews/faction-monuments/ (or DIR):
 *
 *   sheet-<faction>.png   per faction: the seven Human achievement Monuments
 *                         and the shared obelisk (top), the faction's seven
 *                         and its obelisk (below), each x4 nearest on its
 *                         ground, then both rows at 1:1 on 80 x 80 ground
 *                         tiles, the piece placed by its anchor as the board
 *                         places it
 *   overview-1x.png       every faction (rows) by every Monument (columns)
 *                         at 1:1 on its ground tile, and overview-x2.png
 *   index.json            per master: size, opaque box, lighting (faces),
 *                         owner key-colour pixels, sha256
 *
 * A master not accepted yet is drawn as a dashed "missing" slot.
 */
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import sharp, { type OverlayOptions } from "sharp";
import { extractOwnerMask } from "./chibi/owner-mask";
import {
  loadBatchManifest,
  loadRecords,
  productionLayout,
  readRaster,
} from "./chibi/pipeline";
import { opaqueBounds } from "./chibi/raster";
import { lightVerdict, lightingOf } from "./lighting-qa";

const ROOT = process.cwd();
const outIndex = process.argv.indexOf("--out");
const OUT = path.resolve(
  ROOT,
  outIndex < 0
    ? "art/pixellab/reviews/faction-monuments"
    : (process.argv[outIndex + 1] ?? ""),
);

const ACHIEVEMENTS = [
  "EXPLORER",
  "ENGINEER",
  "MUSTER",
  "CONQUEROR",
  "LAND_BARON",
  "SEA_DOG",
  "SLAYER",
] as const;
const FACTIONS = [
  "UNDEAD",
  "GOBLIN",
  "DINOSAUR",
  "MARTIAN",
  "ICE_FOLK",
  "DWARF",
  "CANDY",
  "CULT",
] as const;
type Faction = (typeof FACTIONS)[number];

const NAMES: Record<Faction | "ORIGINAL", string> = {
  ORIGINAL: "Human",
  UNDEAD: "Undead",
  GOBLIN: "Goblin",
  DINOSAUR: "Dinosaur",
  MARTIAN: "Martian",
  ICE_FOLK: "Ice Folk",
  DWARF: "Dwarf",
  CANDY: "Candy",
  CULT: "Cult",
};

/** The ground tile each faction's territory shows (Ice Folk: the Snow wash). */
const GROUNDS: Record<Faction | "ORIGINAL", string> = {
  ORIGINAL: "public/assets/chibi/terrain/chibi-grass-1.png",
  UNDEAD: "public/assets/chibi/terrain/chibi-undead-grass-1.png",
  GOBLIN: "public/assets/chibi/terrain/faction-grass/chibi-goblin-grass-1.png",
  DINOSAUR:
    "public/assets/chibi/terrain/faction-grass/chibi-dinosaur-grass-1.png",
  MARTIAN:
    "public/assets/chibi/terrain/faction-grass/chibi-martian-grass-1.png",
  ICE_FOLK: "art/pixellab/faction-forests/ground/ice-folk-snow.png",
  DWARF: "public/assets/chibi/terrain/faction-grass/chibi-dwarf-grass-1.png",
  CANDY: "public/assets/chibi/terrain/faction-grass/chibi-candy-grass-1.png",
  // The Cult has no ground of its own yet (bead pulp_wars-mch9.22).
  CULT: "public/assets/chibi/terrain/chibi-grass-1.png",
};

const COLUMNS = [...ACHIEVEMENTS, null] as const;
const TILE = 80;
const CANVAS = { width: 48, height: 72 } as const;
/** The shared Monument's anchor: the tile centre on the board. */
const ANCHOR = { x: 24, y: 32 } as const;
const ZOOM = 4;
const GAP = 8;
const LABEL = 22;

const slug = (value: string): string =>
  value.toLowerCase().replaceAll("_", "-");
const columnName = (achievement: string | null): string =>
  achievement === null
    ? "obelisk"
    : achievement
        .split("_")
        .map((word) => word[0] + word.slice(1).toLowerCase())
        .join(" ");

interface Master {
  readonly id: string;
  readonly file: string;
  readonly png: Buffer;
}

/** The accepted master of each slot, or null; keyed `<faction>:<column>`. */
async function masters(): Promise<Map<string, Master | null>> {
  const found = new Map<string, Master | null>();
  const sources: {
    readonly faction: Faction | "ORIGINAL";
    readonly batch: string;
  }[] = [
    { faction: "ORIGINAL", batch: "monuments" },
    ...FACTIONS.map((faction) => ({
      faction,
      batch: `monuments-${slug(faction)}`,
    })),
  ];
  for (const { faction, batch } of sources) {
    const manifest = await loadBatchManifest(ROOT, batch);
    const records = await loadRecords(productionLayout(ROOT, batch), batch);
    for (const column of COLUMNS) {
      const subject =
        faction === "ORIGINAL"
          ? column === null
            ? null
            : `IMPROVEMENT:MONUMENT:${column}`
          : `IMPROVEMENT:MONUMENT:${faction}${column === null ? "" : `:${column}`}`;
      const key = `${faction}:${column ?? "OBELISK"}`;
      if (subject === null) {
        // The Human obelisk is the shared Monument of batch direction-human.
        const file =
          "public/assets/chibi/buildings/chibi-direction-monument.png";
        found.set(key, {
          id: "chibi-direction-monument",
          file,
          png: await readFile(path.join(ROOT, file)),
        });
        continue;
      }
      const asset = manifest.assets.find((spec) => spec.subject === subject);
      const record = asset === undefined ? undefined : records.assets[asset.id];
      if (asset === undefined || record?.status !== "ACCEPTED") {
        found.set(key, null);
        continue;
      }
      found.set(key, {
        id: asset.id,
        file: record.master.path,
        png: await readFile(path.join(ROOT, record.master.path)),
      });
    }
  }
  return found;
}

const escapeXml = (text: string): string =>
  text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

function label(text: string, width: number, height = LABEL): Buffer {
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><text x="2" y="${Math.round(height * 0.72)}" font-family="Helvetica, Arial, sans-serif" font-size="${Math.round(height * 0.6)}" fill="#f2efe6">${escapeXml(text)}</text></svg>`,
  );
}

function missing(width: number, height: number): Buffer {
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect x="2" y="2" width="${width - 4}" height="${height - 4}" fill="#2b2f36" stroke="#9aa3ad" stroke-width="2" stroke-dasharray="6 4"/><text x="${width / 2}" y="${height / 2}" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="${Math.max(9, Math.round(width / 6))}" fill="#d7dbe0">missing</text></svg>`,
  );
}

/** One 80 x 80 ground tile with the piece placed by its anchor, at `scale`. */
async function tile(
  ground: Buffer,
  master: Master | null,
  scale: number,
): Promise<Buffer> {
  const size = TILE * scale;
  const base = sharp(ground).resize(size, size, { kernel: "nearest" });
  if (master === null)
    return base
      .composite([{ input: missing(size, size), left: 0, top: 0 }])
      .png()
      .toBuffer();
  const piece = await sharp(master.png)
    .resize(CANVAS.width * scale, CANVAS.height * scale, { kernel: "nearest" })
    .png()
    .toBuffer();
  return base
    .composite([
      {
        input: piece,
        left: (TILE / 2 - ANCHOR.x) * scale,
        top: (TILE / 2 - ANCHOR.y) * scale,
      },
    ])
    .png()
    .toBuffer();
}

/** One enlarged canvas (48 x 72 at x4) over the ground colour. */
async function enlarged(
  ground: Buffer,
  master: Master | null,
): Promise<Buffer> {
  const width = CANVAS.width * ZOOM;
  const height = CANVAS.height * ZOOM;
  const back = await sharp(ground)
    .resize(width, height, { kernel: "nearest", fit: "cover" })
    .png()
    .toBuffer();
  if (master === null)
    return sharp(back)
      .composite([{ input: missing(width, height), left: 0, top: 0 }])
      .png()
      .toBuffer();
  const piece = await sharp(master.png)
    .resize(width, height, { kernel: "nearest" })
    .png()
    .toBuffer();
  return sharp(back)
    .composite([{ input: piece, left: 0, top: 0 }])
    .png()
    .toBuffer();
}

async function factionSheet(
  faction: Faction,
  found: Map<string, Master | null>,
): Promise<Buffer> {
  const rows: (Faction | "ORIGINAL")[] = ["ORIGINAL", faction];
  const cellWidth = CANVAS.width * ZOOM;
  const width = GAP + COLUMNS.length * (cellWidth + GAP);
  const bigHeight = CANVAS.height * ZOOM;
  const smallRowHeight = TILE + GAP;
  const height =
    LABEL +
    rows.length * (LABEL + bigHeight + GAP) +
    LABEL +
    rows.length * smallRowHeight +
    GAP;
  const layers: OverlayOptions[] = [
    {
      input: label(
        `${NAMES[faction]} Monuments beside the Human ones (x${ZOOM}, then 1:1 on tiles)`,
        width,
      ),
      left: GAP,
      top: 0,
    },
  ];
  let top = LABEL;
  for (const row of rows) {
    const ground = await readFile(path.join(ROOT, GROUNDS[row]));
    for (const [index, column] of COLUMNS.entries()) {
      const left = GAP + index * (cellWidth + GAP);
      layers.push({
        input: label(`${NAMES[row]} ${columnName(column)}`, cellWidth, LABEL),
        left,
        top,
      });
      layers.push({
        input: await enlarged(
          ground,
          found.get(`${row}:${column ?? "OBELISK"}`) ?? null,
        ),
        left,
        top: top + LABEL,
      });
    }
    top += LABEL + bigHeight + GAP;
  }
  layers.push({ input: label("1:1", width), left: GAP, top });
  top += LABEL;
  for (const row of rows) {
    const ground = await readFile(path.join(ROOT, GROUNDS[row]));
    for (const [index, column] of COLUMNS.entries())
      layers.push({
        input: await tile(
          ground,
          found.get(`${row}:${column ?? "OBELISK"}`) ?? null,
          1,
        ),
        left: GAP + index * (TILE + GAP),
        top,
      });
    top += smallRowHeight;
  }
  return sharp({
    create: { width, height, channels: 4, background: "#1d2025" },
  })
    .composite(layers)
    .png()
    .toBuffer();
}

async function overview(
  found: Map<string, Master | null>,
  scale: number,
): Promise<Buffer> {
  const rows: (Faction | "ORIGINAL")[] = ["ORIGINAL", ...FACTIONS];
  const size = TILE * scale;
  const width = COLUMNS.length * size;
  const height = rows.length * size;
  const layers: OverlayOptions[] = [];
  for (const [y, row] of rows.entries()) {
    const ground = await readFile(path.join(ROOT, GROUNDS[row]));
    for (const [x, column] of COLUMNS.entries())
      layers.push({
        input: await tile(
          ground,
          found.get(`${row}:${column ?? "OBELISK"}`) ?? null,
          scale,
        ),
        left: x * size,
        top: y * size,
      });
  }
  return sharp({
    create: { width, height, channels: 4, background: "#1d2025" },
  })
    .composite(layers)
    .png()
    .toBuffer();
}

async function main(): Promise<void> {
  await mkdir(OUT, { recursive: true });
  const found = await masters();
  for (const faction of FACTIONS)
    await writeFile(
      path.join(OUT, `sheet-${slug(faction)}.png`),
      await factionSheet(faction, found),
    );
  await writeFile(path.join(OUT, "overview-1x.png"), await overview(found, 1));
  await writeFile(path.join(OUT, "overview-x2.png"), await overview(found, 2));
  const index: Record<string, unknown> = {};
  for (const [key, master] of found) {
    if (master === null) {
      index[key] = null;
      continue;
    }
    const raster = await readRaster(master.png);
    const box = opaqueBounds(raster);
    const lighting = lightingOf(raster);
    index[key] = {
      id: master.id,
      file: master.file,
      sha256: createHash("sha256").update(master.png).digest("hex"),
      size: [raster.width, raster.height],
      box,
      faces: Number(lighting.faces.toFixed(1)),
      light: lightVerdict(lighting),
      keyColourPixels: extractOwnerMask(raster).mask.bits.reduce(
        (sum, bit) => sum + bit,
        0,
      ),
    };
  }
  await writeFile(
    path.join(OUT, "index.json"),
    `${JSON.stringify(index, null, 2)}\n`,
  );
  const accepted = [...found.values()].filter((master) => master !== null);
  console.log(
    `Faction Monument review: ${accepted.length} of ${found.size} slots accepted; wrote ${path.relative(ROOT, OUT)}`,
  );
}

await main();
