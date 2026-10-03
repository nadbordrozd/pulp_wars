/**
 * Writes scripts/art/chibi/palettes/dwarf-forge.png (bead pulp_wars-78i.5):
 * the palette of the Steampunk Dwarf effect sprites. Every opaque pixel of
 * an accepted effect candidate is mapped to its nearest colour (the
 * pipeline's `palette-map` derivation), so the eruption, its ring of dirt,
 * the bomb blast, the steam puff and the repair sparks use exactly the
 * faction's earth, iron, copper, spark and steam and nothing else.
 *
 *   npx tsx scripts/art/dwarf-direction/forge-palette.ts
 *
 * The file is deterministic; a test checks its colours against this list.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

export const DWARF_FORGE_PALETTE_PATH =
  "scripts/art/chibi/palettes/dwarf-forge.png";

export const DWARF_FORGE_PALETTE = [
  { to: "#1b1512", role: "outline" },
  { to: "#3d2a1e", role: "dark earth" },
  { to: "#6e4b30", role: "earth" },
  { to: "#a07a52", role: "light earth and dust" },
  { to: "#8a847a", role: "rock grey" },
  { to: "#4a4744", role: "soot iron and smoke" },
  { to: "#d06a2a", role: "copper flash" },
  { to: "#f0a060", role: "light copper" },
  { to: "#fff1b8", role: "spark" },
  { to: "#f2f2ee", role: "steam white" },
] as const;

const SIZE = 80;

/** Bands of equal height, one per colour, like the other effect palettes. */
export async function dwarfForgePalettePng(): Promise<Buffer> {
  const data = Buffer.alloc(SIZE * SIZE * 4);
  const band = SIZE / DWARF_FORGE_PALETTE.length;
  for (let y = 0; y < SIZE; y += 1) {
    const colour = DWARF_FORGE_PALETTE[Math.floor(y / band)];
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
  const file = path.join(process.cwd(), DWARF_FORGE_PALETTE_PATH);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, await dwarfForgePalettePng());
  console.log(`wrote ${DWARF_FORGE_PALETTE_PATH}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url))
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "failed");
    process.exitCode = 1;
  });
