/**
 * Writes the two sea-ice palettes (bead pulp_wars-5ti.6):
 * scripts/art/chibi/palettes/sea-ice-shallow.png and sea-ice-deep.png, the
 * `colorImage` of the ice tiles over Shallow and Deep Water. PixelLab is
 * forced to these colours, so the ice over each water keeps a tint of the
 * water under it (turquoise over the lagoon, blue over the open sea) and
 * both stay clearly lighter than either water and cooler than the Snow
 * wash on land.
 *
 *   npx tsx scripts/art/naval-branch/ice-palettes.ts
 *
 * The files are deterministic; a test checks their bytes against this list.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

export interface SeaIcePaletteV7 {
  readonly path: string;
  /** Bands from the top, by area: the base first. */
  readonly colours: readonly {
    readonly hex: string;
    readonly rows: number;
    readonly role: string;
  }[];
}

const SIZE = 64;

export const SEA_ICE_PALETTES: Readonly<
  Record<"SHALLOW" | "DEEP_FIRST" | "DEEP_SECOND" | "DEEP", SeaIcePaletteV7>
> = {
  SHALLOW: {
    path: "scripts/art/chibi/palettes/sea-ice-shallow.png",
    colours: [
      { hex: "#d3eff3", rows: 40, role: "ice over the lagoon" },
      { hex: "#bfe6ec", rows: 14, role: "thin ice, the water's turquoise" },
      { hex: "#f3fcfd", rows: 10, role: "frost and shine" },
    ],
  },
  // The first deep palette: PixelLab took its lightest colour for the whole
  // sheet, which came out as pale as the ice over the lagoon. Kept for the
  // rejected recipes that name it.
  DEEP_FIRST: {
    path: "scripts/art/chibi/palettes/sea-ice-deep.png",
    colours: [
      { hex: "#a9c6e6", rows: 40, role: "ice over the open sea" },
      { hex: "#93b4da", rows: 14, role: "thin ice, the sea's blue" },
      { hex: "#d9e8f7", rows: 10, role: "frost and shine" },
    ],
  },
  // The second: again the lightest colour (#bfd5ee) became the sheet.
  DEEP_SECOND: {
    path: "scripts/art/chibi/palettes/sea-ice-deep-blue.png",
    colours: [
      { hex: "#a9c6e6", rows: 46, role: "ice over the open sea" },
      { hex: "#93b4da", rows: 10, role: "thin ice, the sea's blue" },
      { hex: "#bfd5ee", rows: 8, role: "frost and shine" },
    ],
  },
  // PixelLab paints the sheet in a palette's lightest colour, so the base
  // is the lightest here and the only other colour is the darker scratch.
  DEEP: {
    path: "scripts/art/chibi/palettes/sea-ice-deep-sea.png",
    colours: [
      { hex: "#a9c6e6", rows: 52, role: "ice over the open sea" },
      { hex: "#93b4da", rows: 12, role: "scratches, the sea's blue" },
    ],
  },
};

/** Bands of the listed heights, one per colour, the base on top. */
export async function seaIcePalettePng(
  palette: SeaIcePaletteV7,
): Promise<Buffer> {
  const data = Buffer.alloc(SIZE * SIZE * 4);
  let y = 0;
  for (const colour of palette.colours) {
    const rgb = [1, 3, 5].map((at) =>
      Number.parseInt(colour.hex.slice(at, at + 2), 16),
    );
    for (let row = 0; row < colour.rows; row += 1, y += 1)
      for (let x = 0; x < SIZE; x += 1) {
        const offset = (y * SIZE + x) * 4;
        data[offset] = rgb[0] ?? 0;
        data[offset + 1] = rgb[1] ?? 0;
        data[offset + 2] = rgb[2] ?? 0;
        data[offset + 3] = 255;
      }
  }
  if (y !== SIZE) throw new Error(`${palette.path}: bands do not fill it`);
  return sharp(data, { raw: { width: SIZE, height: SIZE, channels: 4 } })
    .png({ compressionLevel: 9, palette: false })
    .toBuffer();
}

async function main(): Promise<void> {
  for (const palette of Object.values(SEA_ICE_PALETTES)) {
    const file = path.join(process.cwd(), palette.path);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, await seaIcePalettePng(palette));
    console.log(`wrote ${palette.path}`);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url))
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "failed");
    process.exitCode = 1;
  });
