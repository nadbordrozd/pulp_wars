/**
 * Writes scripts/art/chibi/palettes/undead-violet.png (bead
 * pulp_wars-3tq.12): the palette of the Undead ability effects in the new
 * visual direction. It has one colour for each colour of `undead-frost.png`,
 * in the same order, so the `paletteFrom` swap of the chibi pipeline turns an
 * accepted pale blue effect into the same shapes in the faction's violet.
 *
 *   npx tsx scripts/art/undead-direction/violet-palette.ts
 *
 * The file is deterministic; a test checks its colours against this list.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

export const UNDEAD_VIOLET_PALETTE_PATH =
  "scripts/art/chibi/palettes/undead-violet.png";

/** `from` is the colour of `undead-frost.png` at the same position. */
export const UNDEAD_VIOLET_PALETTE = [
  { from: "#0d1018", to: "#120c1c", role: "outline" },
  { from: "#3e4859", to: "#46247c", role: "dark violet shade" },
  { from: "#7f8ca0", to: "#7b36c9", role: "violet" },
  { from: "#a9bdd8", to: "#b06bf2", role: "lit violet" },
  { from: "#d2e2f6", to: "#dcc4ff", role: "pale violet glow" },
  { from: "#ffffff", to: "#ffffff", role: "white core" },
  { from: "#ece6d2", to: "#e6e0c8", role: "bone, lit (warm ivory)" },
  { from: "#a6abb5", to: "#bab497", role: "bone, shaded (warm grey)" },
] as const;

const SIZE = 64;

/** Bands of equal height, one per colour, like the other effect palettes. */
export async function undeadVioletPalettePng(): Promise<Buffer> {
  const data = Buffer.alloc(SIZE * SIZE * 4);
  const band = SIZE / UNDEAD_VIOLET_PALETTE.length;
  for (let y = 0; y < SIZE; y += 1) {
    const colour = UNDEAD_VIOLET_PALETTE[Math.floor(y / band)];
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
  const file = path.join(process.cwd(), UNDEAD_VIOLET_PALETTE_PATH);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, await undeadVioletPalettePng());
  console.log(`wrote ${UNDEAD_VIOLET_PALETTE_PATH}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url))
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "failed");
    process.exitCode = 1;
  });
