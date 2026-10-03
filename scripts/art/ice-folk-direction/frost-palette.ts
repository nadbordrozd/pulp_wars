/**
 * Writes scripts/art/chibi/palettes/ice-folk-frost.png (bead
 * pulp_wars-7g3.5): the palette of the Ice Folk effect sprites. Every
 * opaque pixel of an accepted effect candidate is mapped to its nearest
 * colour (the pipeline's `palette-map` derivation), so the Shatter burst,
 * its shards, the Cold Snap ring, the Bolas and the frost on a hit all use
 * exactly the faction's ice blue, white and slate and nothing else.
 *
 *   npx tsx scripts/art/ice-folk-direction/frost-palette.ts
 *
 * The file is deterministic; a test checks its colours against this list.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

export const ICE_FOLK_FROST_PALETTE_PATH =
  "scripts/art/chibi/palettes/ice-folk-frost.png";

export const ICE_FOLK_FROST_PALETTE = [
  { to: "#0e1c30", role: "outline" },
  { to: "#145a9c", role: "deep ice shade" },
  { to: "#2f9be8", role: "ice blue" },
  { to: "#7fcbff", role: "light ice" },
  { to: "#d6f0ff", role: "frost pale" },
  { to: "#ffffff", role: "white flash" },
  { to: "#5b6577", role: "slate stone" },
  { to: "#e8dcc2", role: "ivory cord" },
] as const;

const SIZE = 64;

/** Bands of equal height, one per colour, like the other effect palettes. */
export async function iceFolkFrostPalettePng(): Promise<Buffer> {
  const data = Buffer.alloc(SIZE * SIZE * 4);
  const band = SIZE / ICE_FOLK_FROST_PALETTE.length;
  for (let y = 0; y < SIZE; y += 1) {
    const colour = ICE_FOLK_FROST_PALETTE[Math.floor(y / band)];
    if (colour === undefined) throw new Error("palette band out of range");
    const rgb = [1, 3, 5].map((at) =>
      Number.parseInt(colour.to.slice(at, at + 2), 16),
    );
    for (let x = 0; x < SIZE; x += 1) {
      const offset = (y * SIZE + x) * 4;
      data[offset] = rgb[0] ?? 0;
      data[offset + 1] = rgb[1] ?? 0;
      data[offset + 2] = rgb[2] ?? 0;
      data[offset + 3] = 255;
    }
  }
  return sharp(data, { raw: { width: SIZE, height: SIZE, channels: 4 } })
    .png({ compressionLevel: 9, palette: false })
    .toBuffer();
}

async function main(): Promise<void> {
  const file = path.join(process.cwd(), ICE_FOLK_FROST_PALETTE_PATH);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, await iceFolkFrostPalettePng());
  console.log(`wrote ${ICE_FOLK_FROST_PALETTE_PATH}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url))
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "failed");
    process.exitCode = 1;
  });
