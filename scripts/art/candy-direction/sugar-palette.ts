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
 *
 * Since the Chocolatier look (bead pulp_wars-jdb.10) it also writes
 * candy-chocolate.png and candy-mint-chocolate.png: the same ten positions
 * with the three pinks replaced. The effect assets name candy-sugar.png as
 * their `paletteFrom` and one of these as their `palette`, so each accepted
 * effect candidate is mapped to the sugar palette as before and then
 * swapped colour for colour (the Undead violet effects' palette swap): the
 * shapes are the reviewed ones and no PixelLab call is made.
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

export const CANDY_CHOCOLATE_PALETTE_PATH =
  "scripts/art/chibi/palettes/candy-chocolate.png";

/** Position for position CANDY_SUGAR_PALETTE: the pinks become chocolate and caramel. */
export const CANDY_CHOCOLATE_PALETTE = [
  { to: "#24121a", role: "outline" },
  { to: "#4a2412", role: "dark chocolate" },
  { to: "#c98a4b", role: "caramel" },
  { to: "#e9c98f", role: "biscuit and wafer" },
  { to: "#7a4526", role: "milk chocolate (was the rose shade)" },
  { to: "#e0a040", role: "caramel gold (was cotton-candy pink)" },
  { to: "#f6d58a", role: "pale caramel (was pale pink)" },
  { to: "#a8e6cf", role: "mint" },
  { to: "#fff1d0", role: "vanilla cream" },
  { to: "#ffffff", role: "sugar white" },
] as const;

export const CANDY_MINT_CHOCOLATE_PALETTE_PATH =
  "scripts/art/chibi/palettes/candy-mint-chocolate.png";

/** As CANDY_CHOCOLATE_PALETTE, but the pinks become mint: the Peppermint pop. */
export const CANDY_MINT_CHOCOLATE_PALETTE = [
  { to: "#24121a", role: "outline" },
  { to: "#4a2412", role: "dark chocolate" },
  { to: "#c98a4b", role: "caramel" },
  { to: "#e9c98f", role: "biscuit and wafer" },
  { to: "#5fb891", role: "deep mint (was the rose shade)" },
  { to: "#a8e6cf", role: "mint (was cotton-candy pink)" },
  { to: "#d8f5e8", role: "pale mint (was pale pink)" },
  { to: "#7a4526", role: "milk chocolate (was mint)" },
  { to: "#fff1d0", role: "vanilla cream" },
  { to: "#ffffff", role: "sugar white" },
] as const;

const SIZE = 80;

/** Bands of equal height, one per colour, like the other effect palettes. */
export async function candyPalettePng(
  palette: readonly { readonly to: string }[],
): Promise<Buffer> {
  const data = Buffer.alloc(SIZE * SIZE * 4);
  const band = SIZE / palette.length;
  for (let y = 0; y < SIZE; y += 1) {
    const colour = palette[Math.floor(y / band)];
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

export async function candySugarPalettePng(): Promise<Buffer> {
  return candyPalettePng(CANDY_SUGAR_PALETTE);
}

async function main(): Promise<void> {
  for (const [relative, palette] of [
    [CANDY_SUGAR_PALETTE_PATH, CANDY_SUGAR_PALETTE],
    [CANDY_CHOCOLATE_PALETTE_PATH, CANDY_CHOCOLATE_PALETTE],
    [CANDY_MINT_CHOCOLATE_PALETTE_PATH, CANDY_MINT_CHOCOLATE_PALETTE],
  ] as const) {
    const file = path.join(process.cwd(), relative);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, await candyPalettePng(palette));
    console.log(`wrote ${relative}`);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url))
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "failed");
    process.exitCode = 1;
  });
