import type { ArtSubjectV7 } from "../../assets/chibi-art-v7";
import { BOARD_LABEL_FONT_FAMILY_V7 } from "./board-label-font-v7";

/**
 * What the board draws for a subject with no usable raster (none registered,
 * or its load failed; bead pulp_wars-67q.15). Ruleset 7 has one art set, so
 * nothing stands in with another set's raster: the ground is a flat wash of
 * its terrain and a piece is a lettered marker, both drawn in code.
 */

const INK = "#171722";
const NEUTRAL = "#c9d2dc";

const TERRAIN_WASH_V7: readonly (readonly [string, string])[] = [
  // The Undead territory ground is burnt, not green (bead pulp_wars-2yc.48).
  ["UNDEAD:FOREST", "#5a5552"],
  ["UNDEAD:GRASS", "#716a64"],
  ["DEEP_WATER", "#2f5f8f"],
  ["SHALLOW_WATER", "#5fa3c7"],
  ["WATER", "#5fa3c7"],
  ["MOUNTAIN", "#8d8b86"],
  ["FOREST", "#3f7448"],
  ["RIFT", "#65965b"],
  ["GRASS", "#65965b"],
];

/** The flat ground colour of a terrain subject without a raster. */
export function missingTerrainWashV7(
  subject: ArtSubjectV7 | undefined,
): string {
  if (subject === undefined) return "#65965b";
  for (const [name, colour] of TERRAIN_WASH_V7)
    if (subject.includes(name)) return colour;
  return "#65965b";
}

/**
 * The marker's letter: the first letter of the subject's own name (its
 * last part with a letter in it: "K" for a Knight, "C" for `CITY:2`).
 */
export function missingArtLetterV7(subject: ArtSubjectV7 | undefined): string {
  if (subject === undefined) return "?";
  for (const part of subject.split(":").reverse()) {
    const letter = /[A-Z]/i.exec(part)?.[0];
    if (letter !== undefined) return letter.toUpperCase();
  }
  return "?";
}

/**
 * The lettered marker of a piece without a raster, on its cell: a disc for
 * a unit, a plate for anything built or lying on the ground, in the owner's
 * colour (steel when it has none).
 */
export function drawMissingArtMarkerV7(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  zoom: number,
  input: {
    readonly shape: "DISC" | "PLATE";
    readonly letter: string;
    readonly ownerColor?: string | undefined;
    readonly highContrast?: boolean;
  },
): void {
  const highContrast = input.highContrast ?? false;
  const radius = 26 * zoom;
  const cy = y - 2 * zoom;
  context.save();
  context.lineJoin = "round";
  context.fillStyle = highContrast ? "#ffffff" : (input.ownerColor ?? NEUTRAL);
  context.strokeStyle = highContrast ? "#000000" : INK;
  context.lineWidth = Math.max(1, 3 * zoom);
  context.beginPath();
  if (input.shape === "DISC") context.arc(x, cy, radius, 0, Math.PI * 2);
  else context.rect(x - radius, cy - radius, radius * 2, radius * 2);
  context.fill();
  context.stroke();
  context.fillStyle = highContrast ? "#000000" : INK;
  context.font = `${800} ${Math.max(8, radius * 1.1)}px ${BOARD_LABEL_FONT_FAMILY_V7}`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(input.letter, x, cy + radius * 0.06);
  context.restore();
}
