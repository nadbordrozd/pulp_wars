/**
 * Writes scripts/art/chibi/palettes/martian-magenta.png (bead
 * pulp_wars-t6s.6): the palette of the Martian ability effect sprites. Every
 * opaque pixel of an accepted effect candidate is mapped to its nearest
 * colour (the pipeline's `palette-map` derivation), so the heat-ray flash,
 * the shield flare, the Beam Down column, the Tractor Beam and the Mind
 * Control swirl all use exactly the faction's hot magenta and nothing else.
 *
 *   npx tsx scripts/art/martian-direction/magenta-palette.ts
 *
 * The file is deterministic; a test checks its colours against this list.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

export const MARTIAN_MAGENTA_PALETTE_PATH =
  "scripts/art/chibi/palettes/martian-magenta.png";

export const MARTIAN_MAGENTA_PALETTE = [
  { to: "#160a14", role: "outline" },
  { to: "#8c1264", role: "dark magenta shade" },
  { to: "#ff2fb0", role: "hot magenta" },
  { to: "#ff8fd6", role: "lit magenta glow" },
  { to: "#ffd3ee", role: "pale pink" },
  { to: "#ffffff", role: "white core" },
  { to: "#d5dde6", role: "chrome, lit" },
  { to: "#4a5262", role: "gunmetal" },
] as const;

const SIZE = 64;

/** Bands of equal height, one per colour, like the other effect palettes. */
export async function martianMagentaPalettePng(): Promise<Buffer> {
  const data = Buffer.alloc(SIZE * SIZE * 4);
  const band = SIZE / MARTIAN_MAGENTA_PALETTE.length;
  for (let y = 0; y < SIZE; y += 1) {
    const colour = MARTIAN_MAGENTA_PALETTE[Math.floor(y / band)];
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
  const file = path.join(process.cwd(), MARTIAN_MAGENTA_PALETTE_PATH);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, await martianMagentaPalettePng());
  console.log(`wrote ${MARTIAN_MAGENTA_PALETTE_PATH}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url))
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "failed");
    process.exitCode = 1;
  });
