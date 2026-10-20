/**
 * Writes scripts/art/chibi/palettes/cult-green.png (bead pulp_wars-mch9.23):
 * the palette of the Cult effect sprites (docs/art/factions/CULT.md,
 * "Markers and effects"). Every opaque pixel of an accepted effect candidate
 * is mapped to its nearest colour (the pipeline's `palette-map` derivation),
 * so the puffs, rings, stars, chain links and tentacle tips use exactly the
 * faction's green flame, wax cream, brass, deep-sea teal, indigo and smoke
 * grey and nothing else: no red (red means broken, and the snapped strand's
 * red flash is drawn in code), no violet and no other faction's accent.
 *
 *   npx tsx scripts/art/cult-direction/green-palette.ts
 *
 * It also writes scripts/art/chibi/palettes/cult-purple.png (bead
 * pulp_wars-mch9.59, the Cult's palette 1): the same list, position for
 * position, with the three indigo tones replaced by the royal purple the
 * `cult-royal-aqua` remap gives them (scripts/art/chibi/remap.ts, the
 * source L* through its main ramp). The effects are `palette-map` swaps from
 * cult-green.png to cult-purple.png, so their shapes are kept exactly and
 * the indigo hood of the Sacrifice puff and the deep folds turn purple; the
 * green stays, the faction colour of the channel strands and the Favour.
 *
 * The files are deterministic; a test checks their colours against these
 * lists.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

export const CULT_GREEN_PALETTE_PATH =
  "scripts/art/chibi/palettes/cult-green.png";

export const CULT_GREEN_PALETTE = [
  { to: "#14121c", role: "outline" },
  { to: "#007336", role: "green, dark" },
  { to: "#00b85a", role: "green, shade" },
  { to: "#00ff78", role: "eldritch green flame" },
  { to: "#80ffbc", role: "green glow" },
  { to: "#f3e7c4", role: "wax and parchment" },
  { to: "#d8c79a", role: "wax shade" },
  { to: "#ffffff", role: "sparkle white" },
  { to: "#8a6a2a", role: "brass shade" },
  { to: "#c9a24a", role: "brass" },
  { to: "#ecd27c", role: "brass, lit" },
  { to: "#ffe27a", role: "summoned eye yellow" },
  { to: "#145f6b", role: "deep-sea teal, shade" },
  { to: "#1f8f95", role: "deep-sea teal" },
  { to: "#2aa6a6", role: "deep-sea teal, lit" },
  { to: "#231d5e", role: "indigo, deepest fold" },
  { to: "#372f8f", role: "indigo cloth, shade" },
  { to: "#4a43b5", role: "indigo cloth, lit" },
  { to: "#8a8a86", role: "smoke and stone grey, shade" },
  { to: "#b9b8b0", role: "smoke and stone grey" },
] as const;

export const CULT_PURPLE_PALETTE_PATH =
  "scripts/art/chibi/palettes/cult-purple.png";

/** The swap of palette 1: indigo to the remap's purple, the rest kept. */
const PURPLE_OF: Readonly<Record<string, { to: string; role: string }>> = {
  "#231d5e": { to: "#2d1542", role: "royal purple, deepest fold" },
  "#372f8f": { to: "#4b226a", role: "royal purple cloth, shade" },
  "#4a43b5": { to: "#67338f", role: "royal purple cloth, lit" },
};

export const CULT_PURPLE_PALETTE: readonly {
  readonly to: string;
  readonly role: string;
}[] = CULT_GREEN_PALETTE.map((entry) => PURPLE_OF[entry.to] ?? entry);

const SIZE = 80;

/** Bands of equal height, one per colour, like the other effect palettes. */
export async function cultGreenPalettePng(): Promise<Buffer> {
  return palettePng(CULT_GREEN_PALETTE);
}

/** cult-purple.png, the swap target of the effects since palette 1. */
export async function cultPurplePalettePng(): Promise<Buffer> {
  return palettePng(CULT_PURPLE_PALETTE);
}

async function palettePng(
  list: readonly { readonly to: string }[],
): Promise<Buffer> {
  const data = Buffer.alloc(SIZE * SIZE * 4);
  const band = SIZE / list.length;
  for (let y = 0; y < SIZE; y += 1) {
    const colour = list[Math.floor(y / band)];
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
  const file = path.join(process.cwd(), CULT_GREEN_PALETTE_PATH);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, await cultGreenPalettePng());
  console.log(`wrote ${CULT_GREEN_PALETTE_PATH}`);
  await writeFile(
    path.join(process.cwd(), CULT_PURPLE_PALETTE_PATH),
    await cultPurplePalettePng(),
  );
  console.log(`wrote ${CULT_PURPLE_PALETTE_PATH}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url))
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "failed");
    process.exitCode = 1;
  });
