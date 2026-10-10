import type { PlayerColorV7 } from "../../engine/index";

/**
 * The four seat colours the game drew before bead pulp_wars-b5f.4. The game
 * no longer shows them: every owner colour is the faction's
 * (FACTION_COLOURS_V7 in faction-colours-v7.ts). They stay as sample owner
 * colours for the recolour tests and the historical study benches; the five
 * seat colours added for many seats (map scale section 8.6) are stored and
 * never drawn, so they have no sample here.
 */
export const RULESET7_PLAYER_COLORS = {
  CORAL: "#f06762",
  TEAL: "#28b7a4",
  GOLD: "#e2b63f",
  VIOLET: "#a277d2",
} as const satisfies Readonly<Partial<Record<PlayerColorV7, string>>>;

/** Generation key colour for owner areas (ART_DIRECTION.md section 4). */
export const CHIBI_OWNER_KEY_COLOUR = "#d8262c";

export interface RgbV7 {
  readonly r: number;
  readonly g: number;
  readonly b: number;
}

export function parseHexColourV7(value: string): RgbV7 | null {
  const match = /^#([0-9a-f]{6})$/i.exec(value);
  if (match === null) return null;
  const hex = Number.parseInt(match[1] ?? "", 16);
  return { r: (hex >> 16) & 255, g: (hex >> 8) & 255, b: hex & 255 };
}

const KEY = parseHexColourV7(CHIBI_OWNER_KEY_COLOUR) ?? {
  r: 216,
  g: 38,
  b: 44,
};
const KEY_VALUE = Math.max(KEY.r, KEY.g, KEY.b);

/**
 * Recolours only the pixels the checked-in owner mask selects. The mask is
 * the sole selector (no runtime hue matching). Each selected pixel becomes
 * the owner colour scaled by its brightness relative to the key colour, so
 * flat shading and highlights survive. A master mask may drive an integer
 * density variant: mask coordinates are sampled nearest-neighbour.
 */
export function recolourOwnerPixelsV7(input: {
  readonly pixels: Uint8ClampedArray;
  readonly width: number;
  readonly height: number;
  readonly mask: Uint8ClampedArray;
  readonly maskWidth: number;
  readonly maskHeight: number;
  readonly owner: RgbV7;
}): Uint8ClampedArray {
  const { pixels, width, height, mask, maskWidth, maskHeight, owner } = input;
  const output = new Uint8ClampedArray(pixels);
  for (let y = 0; y < height; y += 1) {
    const maskY = Math.min(
      maskHeight - 1,
      Math.floor((y * maskHeight) / height),
    );
    for (let x = 0; x < width; x += 1) {
      const maskX = Math.min(
        maskWidth - 1,
        Math.floor((x * maskWidth) / width),
      );
      if ((mask[(maskY * maskWidth + maskX) * 4 + 3] ?? 0) < 128) continue;
      const offset = (y * width + x) * 4;
      if ((pixels[offset + 3] ?? 0) === 0) continue;
      const shade =
        Math.max(
          pixels[offset] ?? 0,
          pixels[offset + 1] ?? 0,
          pixels[offset + 2] ?? 0,
        ) / KEY_VALUE;
      output[offset] = Math.round(owner.r * shade);
      output[offset + 1] = Math.round(owner.g * shade);
      output[offset + 2] = Math.round(owner.b * shade);
    }
  }
  return output;
}
