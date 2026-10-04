/**
 * Writes scripts/art/chibi/palettes/candy-sugar.png (bead pulp_wars-jdb.5):
 * the palette of the Candy effect sprites. Every opaque pixel of an accepted
 * effect candidate is mapped to its nearest colour (the pipeline's
 * `palette-map` derivation), so the gumball shot, the pie and its splat, the
 * tossed sweet, the Re-bake puff, the Peppermint pop and the Bounce spring
 * use exactly the faction's pinks, cream, biscuit, caramel, chocolate and
 * mint and nothing else.
 *
 *   npx tsx scripts/art/candy-direction/sugar-palette.ts
 *
 * The file is deterministic; a test checks its colours against this list.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

export const CANDY_SUGAR_PALETTE_PATH =
  "scripts/art/chibi/palettes/candy-sugar.png";

export const CANDY_SUGAR_PALETTE = [
  { to: "#24121a", role: "outline" },
  { to: "#5a3423", role: "chocolate" },
  { to: "#c98a4b", role: "caramel" },
  { to: "#e9c98f", role: "biscuit and wafer" },
  { to: "#d9779f", role: "rose shade" },
  { to: "#f79cc4", role: "cotton-candy pink" },
  { to: "#ffc9e0", role: "pale pink" },
  { to: "#a8e6cf", role: "mint" },
  { to: "#fbf0dc", role: "cream" },
  { to: "#ffffff", role: "sugar white" },
] as const;

const SIZE = 80;

/** Bands of equal height, one per colour, like the other effect palettes. */
export async function candySugarPalettePng(): Promise<Buffer> {
  const data = Buffer.alloc(SIZE * SIZE * 4);
  const band = SIZE / CANDY_SUGAR_PALETTE.length;
  for (let y = 0; y < SIZE; y += 1) {
    const colour = CANDY_SUGAR_PALETTE[Math.floor(y / band)];
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
  const file = path.join(process.cwd(), CANDY_SUGAR_PALETTE_PATH);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, await candySugarPalettePng());
  console.log(`wrote ${CANDY_SUGAR_PALETTE_PATH}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url))
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "failed");
    process.exitCode = 1;
  });
