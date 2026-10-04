import {
  navalArtRoleOfSubjectV7,
  navalSharedSubjectV7,
  type ArtSubjectV7,
} from "../../assets/chibi-art-v7";
import { DWARF_FLAG_ANCHORS_V7 } from "../../assets/chibi-direction-dwarf-presentation";
import { ICE_FOLK_FLAG_ANCHORS_V7 } from "../../assets/chibi-direction-ice-folk-presentation";
import { MARTIAN_FLAG_ANCHORS_V7 } from "../../assets/chibi-direction-martian-presentation";
import type { BoardRenderPlanEntryV7 } from "./board-renderer-v7";
import type {
  ChibiArtRequestV7,
  ChibiBoardArtV7,
  ChibiRasterEnvironmentV7,
  ChibiResolutionV7,
} from "./chibi-art-resolver-v7";
import {
  TILE_HEIGHT,
  TILE_WIDTH,
  type CameraState,
  type TileEdge,
} from "./geometry";
import { parseHexColourV7 } from "./owner-recolour-v7";
import {
  unitShadowAnchorV7,
  type UnitShadowEllipseV7,
} from "./unit-shadows-v7";

/**
 * The visual direction of the CHIBI art set (beads pulp_wars-3tq.1 to .6,
 * see docs/art/VISUAL_DIRECTION_2026-10.md). The app passes
 * LIVE_DIRECTION_V7 by default; without a direction drawBoardV7 draws the
 * classic look, exactly as before the direction existed. A direction changes
 * only presentation of the CHIBI art set: which art a subject draws, how
 * sprites are toned, what carries the owner colour, and which overlay chrome
 * is drawn. It never changes the plan.
 */

/** How one class of sprite is toned. All fields are whole percent. */
export interface SpriteToneV7 {
  /** 100 keeps the colour, 0 is greyscale. */
  readonly saturation: number;
  /** 100 keeps the contrast; lower pulls every pixel toward the mean colour. */
  readonly contrast: number;
  /** 0 is unchanged; above 0 mixes toward white, below toward black. */
  readonly lightness: number;
  /**
   * 0 keeps the black outline. Above 0, dark outline pixels are mixed that
   * far toward a darker tone of the fill next to them (a coloured outline).
   */
  readonly outline: number;
  /** 100 is unchanged; lower shrinks the art toward its bottom centre. */
  readonly scale: number;
}

export const UNCHANGED_TONE_V7: SpriteToneV7 = {
  saturation: 100,
  contrast: 100,
  lightness: 0,
  outline: 0,
  scale: 100,
};

/** "PLAYER", or the fixed `#rrggbb` every owner area is recoloured to. */
export type OwnerAreaColourV7 = string;

export interface BoardVisualDirectionV7 {
  readonly building: SpriteToneV7 & {
    readonly owner: OwnerAreaColourV7;
    /** Keeps a small flag (where the art has one) in the player colour. */
    readonly accent: boolean;
    /** Draws the exploration sample sprite where one exists (untoned). */
    readonly samples: boolean;
    /**
     * A small code-drawn pennant in the player colour on the buildings that
     * have an authored anchor (DIRECTION_FLAG_ANCHORS_V7).
     */
    readonly flags: boolean;
  };
  readonly city: SpriteToneV7 & {
    readonly owner: OwnerAreaColourV7;
    readonly accent: boolean;
    /** Draws the exploration sample sprite where one exists (untoned). */
    readonly samples: boolean;
    /**
     * A code-drawn pennant in the player colour replaces the seat badge: on
     * the art's authored anchor (DIRECTION_FLAG_ANCHORS_V7) when it has one,
     * else on a pole at the cell's top-left corner.
     */
    readonly banner: boolean;
    /**
     * The cities of a faction whose art is not converted to the direction
     * (a faction subject such as `CITY:UNDEAD:2`). DIRECTED tones them like
     * every city and gives them the corner pennant. CLASSIC draws them
     * exactly as the classic look does, in their owner recolour and with
     * the capital crown, without a pennant: their art already carries the
     * player colour, and the corner pennant would cover the Field Defense
     * badge. The seat badge follows `chrome.badge` either way.
     *
     * A faction city that has direction art of its own (the Goblin scrap
     * camps since bead pulp_wars-3tq.9) is converted in both modes: its
     * direction raster is drawn as authored, with the pennant on its
     * authored anchor. CLASSIC applies to it only while that raster is
     * missing or failed to load.
     */
    readonly factionCities: "DIRECTED" | "CLASSIC";
  };
  /** Terrain tiles, tall terrain, resources and Treasure. */
  readonly terrain: SpriteToneV7;
  readonly unit: {
    /** The garment (the whole checked-in owner mask). */
    readonly owner: OwnerAreaColourV7;
    /** Keeps a small part of the mask (crest, plume, hood) in the player colour. */
    readonly accent: boolean;
    /** Draws the exploration sample sprites where one exists. */
    readonly samples: boolean;
    /**
     * DISC is the study's heavy filled ellipse with a near-black outline,
     * RING its outline alone; PLATE is the demo's lighter plate: smaller,
     * with a rim in a darker tone of the player colour instead of black.
     * SHADOW (the live look since bead pulp_wars-w5j.3) is no plate: a
     * faint neutral ground shadow, with no player colour; NONE draws
     * nothing. A unit afloat (a ship, the transport, a Martian machine on
     * water) never gets a plate or a ring (bead pulp_wars-w5j.3): its
     * faction's art says whose it is.
     */
    readonly base: "NONE" | "SHADOW" | "DISC" | "RING" | "PLATE";
    /** SEAT gives each seat's base its own outline (round, pointed, ...). */
    readonly baseShape: "ROUND" | "SEAT";
    /** A light rim outside the black outline, where the canvas has room. */
    readonly halo: boolean;
  };
  readonly chrome: {
    readonly hp: "ALWAYS" | "DAMAGED";
    /** SIDE is the vertical bar; BASE a short bar under the unit's feet. */
    readonly hpPlacement: "SIDE" | "BASE";
    readonly badge: "SQUARE" | "SHAPE" | "NONE";
    /**
     * GLOW is the sprite outline; BASE brightens the base rim instead;
     * GROUND (the live look since bead pulp_wars-w5j.3) is a thin cream ring
     * on the ground round the feet, with no plate and no player colour.
     */
    readonly ready: "GLOW" | "BASE" | "GROUND";
    readonly roads: "BOLD" | "CALM";
    readonly borders: "DASHED" | "SOLID";
  };
  /**
   * The Undead faction's accent colour (bead pulp_wars-3tq.12). VIOLET
   * draws the Raise Dead target preview and the code-drawn glows of the
   * Undead effects in the faction's violet instead of the classic green and
   * pale blue. Omitted, they are drawn as in the classic look.
   */
  readonly undeadAccent?: "VIOLET";
}

/** Draws exactly like no direction at all (used to test the wiring). */
export const BASELINE_DIRECTION_V7: BoardVisualDirectionV7 = {
  building: {
    ...UNCHANGED_TONE_V7,
    owner: "PLAYER",
    accent: false,
    samples: false,
    flags: false,
  },
  city: {
    ...UNCHANGED_TONE_V7,
    owner: "PLAYER",
    accent: false,
    samples: false,
    banner: false,
    factionCities: "DIRECTED",
  },
  terrain: UNCHANGED_TONE_V7,
  unit: {
    owner: "PLAYER",
    accent: false,
    samples: false,
    base: "NONE",
    baseShape: "ROUND",
    halo: false,
  },
  chrome: {
    hp: "ALWAYS",
    hpPlacement: "SIDE",
    badge: "SQUARE",
    ready: "GLOW",
    roads: "BOLD",
    borders: "DASHED",
  },
};

/** Human faction colours of the recommended direction. */
export const HUMAN_ROOF_COLOUR_V7 = "#b0705c";
export const HUMAN_GARMENT_COLOUR_V7 = "#e6dcc3";

/**
 * The recommended direction (VISUAL_DIRECTION_2026-10.md, section 6):
 * receded buildings and cities in fixed faction colours, the player shown
 * by a base disc under each unit, a small accent on the sprite and a
 * pennant on each city.
 */
export const RECOMMENDED_DIRECTION_V7: BoardVisualDirectionV7 = {
  building: {
    saturation: 65,
    contrast: 70,
    lightness: 10,
    outline: 75,
    scale: 100,
    owner: HUMAN_ROOF_COLOUR_V7,
    accent: false,
    samples: false,
    flags: false,
  },
  city: {
    saturation: 85,
    contrast: 85,
    lightness: 3,
    outline: 60,
    scale: 100,
    owner: HUMAN_ROOF_COLOUR_V7,
    accent: false,
    samples: false,
    banner: true,
    factionCities: "DIRECTED",
  },
  terrain: {
    saturation: 100,
    contrast: 65,
    lightness: 0,
    outline: 60,
    scale: 100,
  },
  unit: {
    owner: HUMAN_GARMENT_COLOUR_V7,
    accent: true,
    samples: true,
    base: "DISC",
    baseShape: "SEAT",
    halo: false,
  },
  chrome: {
    hp: "DAMAGED",
    hpPlacement: "BASE",
    badge: "NONE",
    ready: "BASE",
    roads: "CALM",
    borders: "SOLID",
  },
};

/** The Human faction's fixed cloth colour in the demo: heraldic crimson. */
export const HUMAN_CRIMSON_COLOUR_V7 = "#a8202c";

/**
 * The Human demo (bead pulp_wars-3tq.3, VISUAL_DIRECTION_2026-10.md, "Human
 * demo"), which the experiment's developer toggle drew and the study's
 * review benches still do; the game draws LIVE_DIRECTION_V7. Buildings,
 * cities and Human units are re-created sprites in fixed faction colours;
 * since bead pulp_wars-3tq.5 they are the production art of
 * src/assets/chibi-direction-art-manifest.ts (every Human unit, the shared
 * improvements, City 1-3 and the Village). The player is shown by a seat-shaped
 * plate under each unit, a pennant on each city and on the few buildings
 * that have a mast or a ridge for one, and the territory border. A shared
 * piece without direction art (a ship) keeps its player-coloured sail.
 */
export const HUMAN_DEMO_DIRECTION_V7: BoardVisualDirectionV7 = {
  building: {
    ...RECOMMENDED_DIRECTION_V7.building,
    samples: true,
    flags: true,
  },
  city: { ...RECOMMENDED_DIRECTION_V7.city, samples: true },
  terrain: RECOMMENDED_DIRECTION_V7.terrain,
  unit: {
    owner: HUMAN_CRIMSON_COLOUR_V7,
    accent: false,
    samples: true,
    base: "PLATE",
    baseShape: "SEAT",
    halo: false,
  },
  chrome: RECOMMENDED_DIRECTION_V7.chrome,
};

/**
 * The live default of the CHIBI art set (bead pulp_wars-3tq.6): the Human
 * demo's rules with the production art. The app passes it to the board
 * unless the developer option "Classic look (previous art)" is on.
 *
 * A faction without direction art keeps its units' player-coloured
 * garments on a plate, and its cities are drawn as in the classic look
 * (owner recolour, capital crown) without the seat badge; since bead
 * pulp_wars-3tq.13 (the Dinosaurs, by the same mechanism as below, with
 * the Egg) no faction is left in that state, and it remains the fallback
 * of a raster that fails to load.
 * Goblins are converted since bead pulp_wars-3tq.9: their units,
 * portraits and cities resolve from the direction art registry in fixed
 * faction colours, and their cities fly the pennant.
 *
 * Since bead pulp_wars-3tq.12 the Undead are converted too, by the same
 * mechanism: the art registry the game passes holds their units, portraits,
 * cities and effects, and their cities fly the pennant.
 *
 * Since bead pulp_wars-w5j.3 every player plays a different faction, so
 * the faction's look says whose a unit is: the coloured, seat-shaped base
 * plates are retired (a faint neutral ground shadow instead), every
 * faction's ships are its own fixed-colour art, and a ready unit has a thin
 * cream ring on the ground round its feet (GROUND).
 *
 * Since bead pulp_wars-b5f.4 the owner colour is the faction's own
 * (faction-colours-v7.ts) and the code-drawn pennants are retired: a city,
 * a Port or a Shipyard says whose it is by its faction art and the
 * territory border, the only owner colour left on the board. The capital
 * shows the stock gold crown in its cell's top-right corner. The pennant
 * code and anchors stay for the study benches' directions above.
 */
export const LIVE_DIRECTION_V7: BoardVisualDirectionV7 = {
  ...HUMAN_DEMO_DIRECTION_V7,
  building: { ...HUMAN_DEMO_DIRECTION_V7.building, flags: false },
  city: {
    ...HUMAN_DEMO_DIRECTION_V7.city,
    banner: false,
    factionCities: "CLASSIC",
  },
  unit: { ...HUMAN_DEMO_DIRECTION_V7.unit, base: "SHADOW" },
  chrome: { ...HUMAN_DEMO_DIRECTION_V7.chrome, ready: "GROUND" },
  // Undead (bead pulp_wars-3tq.12): the faction's magic is violet.
  undeadAccent: "VIOLET",
};

/**
 * Where a code-drawn player pennant attaches to a sprite, by asset id, in
 * master pixels from the sprite's top-left corner: the top of the pole.
 * `pole` is the length of pole drawn downward from there (0 when the art
 * has its own mast). Buildings without an entry get no pennant: a Farm, a
 * Mine, a Windmill or a Forge says nothing more with a flag, and their
 * territory already shows the owner.
 */
export interface DirectionFlagAnchorV7 {
  readonly x: number;
  readonly y: number;
  readonly pole: number;
}

export const DIRECTION_FLAG_ANCHORS_V7: Readonly<
  Record<string, DirectionFlagAnchorV7>
> = {
  // The tower's cone tip; the keep's cone tip; the side of the great tower
  // (above it the pennant would hide the base of a unit to the north).
  "chibi-demo-city-1": { x: 40, y: 7, pole: 12 },
  "chibi-demo-city-2": { x: 43.5, y: 0, pole: 6 },
  "chibi-demo-city-3": { x: 55, y: 10, pole: 0 },
  // The pier's own bare mast, and a pole on the boathouse ridge.
  "chibi-demo-port": { x: 49.5, y: 22, pole: 0 },
  "chibi-demo-shipyard": { x: 21, y: 4, pole: 11 },
  // The production art of bead pulp_wars-3tq.5 (batch `direction-human`).
  // City 1 and 2 are edits of the demo's, so the tower and keep tips stay;
  // City 3 flies its pennant from the tip of the back tower on a short
  // pole, inside its own cell, so the base of a unit to the north shows.
  "chibi-direction-city-1": { x: 40, y: 7, pole: 12 },
  "chibi-direction-city-2": { x: 43.5, y: 0, pole: 6 },
  "chibi-direction-city-3": { x: 48.5, y: 9, pole: 7 },
  // --- Undead (bead pulp_wars-3tq.12, batch `direction-undead`) ---
  // The crypt tower's cone tip; the bell tower's top; the tip of the
  // central spire, on a pole that keeps the pennant inside the canvas.
  "chibi-direction-undead-city-1": { x: 39.5, y: 0, pole: 5 },
  "chibi-direction-undead-city-2": { x: 44.5, y: 0, pole: 6 },
  "chibi-direction-undead-city-3": { x: 44.5, y: 6, pole: 11 },
  // --- end Undead ---
  // The same masters as the demo's Port and Shipyard.
  "chibi-direction-port": { x: 49.5, y: 22, pole: 0 },
  "chibi-direction-shipyard": { x: 21, y: 4, pole: 11 },
  // The Goblin scrap camps (batch `direction-goblin`; redrawn by bead
  // pulp_wars-wrn.2, seated at the bottom of the same canvases): beside the
  // top of the lookout pole; on a pole over the peak of the middle tent,
  // left of the tower's smoke; on a pole over the peak of the big tent.
  "chibi-direction-goblin-city-1": { x: 71, y: 31, pole: 0 },
  "chibi-direction-goblin-city-2": { x: 57.5, y: 33, pole: 11 },
  "chibi-direction-goblin-city-3": { x: 60.5, y: 29, pole: 10 },
  // --- Dinosaur (bead pulp_wars-3tq.13, batch `direction-dinosaur`) ---
  // A pole over the skull of the bone totem; the top of the camp's own
  // bare pole; a pole on the right shoulder of the giant rib-cage, where
  // the pennant clears the bones.
  "chibi-direction-dinosaur-city-1": { x: 30.5, y: 0, pole: 6 },
  "chibi-direction-dinosaur-city-2": { x: 66.5, y: 11, pole: 0 },
  "chibi-direction-dinosaur-city-3": { x: 68.5, y: 0, pole: 12 },
  // --- end Dinosaur ---
  // --- Martian (art of bead pulp_wars-t6s.6, wired in by pulp_wars-t6s.4):
  // the tips of the colonies' own antenna masts, so no pole is drawn.
  ...MARTIAN_FLAG_ANCHORS_V7,
  // --- Ice Folk (art of bead pulp_wars-7g3.5, wired in by pulp_wars-7g3.6):
  // the tips of the camps' own bone poles, so no pole is drawn.
  ...ICE_FOLK_FLAG_ANCHORS_V7,
  // --- Dwarf (art of bead pulp_wars-78i.5, wired in by pulp_wars-78i.6):
  // the tops of the holds' own dark iron poles, so no pole is drawn.
  ...DWARF_FLAG_ANCHORS_V7,
};

const clampPercent = (value: unknown, low: number, high: number): number =>
  typeof value === "number" && Number.isFinite(value)
    ? Math.max(low, Math.min(high, value))
    : low;

function toneKey(tone: SpriteToneV7): string {
  return `${tone.saturation},${tone.contrast},${tone.lightness},${tone.outline},${tone.scale}`;
}

export function isUnchangedToneV7(tone: SpriteToneV7): boolean {
  return toneKey(tone) === toneKey(UNCHANGED_TONE_V7);
}

const luma = (r: number, g: number, b: number): number =>
  0.299 * r + 0.587 * g + 0.114 * b;

/** Outline pixels are the near-black ones (the chibi outline is #000-#2a). */
const OUTLINE_MAX_CHANNEL = 62;

export type RgbTripleV7 = readonly [number, number, number];

/** Mean colour of the opaque pixels; mid grey for an empty raster. */
export function meanColourV7(pixels: Uint8ClampedArray): RgbTripleV7 {
  let r = 0;
  let g = 0;
  let b = 0;
  let count = 0;
  for (let index = 0; index + 3 < pixels.length; index += 4) {
    if ((pixels[index + 3] ?? 0) < 128) continue;
    r += pixels[index] ?? 0;
    g += pixels[index + 1] ?? 0;
    b += pixels[index + 2] ?? 0;
    count += 1;
  }
  return count === 0 ? [128, 128, 128] : [r / count, g / count, b / count];
}

/**
 * Tones a sprite's pixels. Alpha is kept except by `scale`, which redraws
 * the art smaller around its bottom centre (nearest neighbour). `radius` is
 * the outline search distance in pixels (the raster's density). `pivot`
 * is the colour that lower contrast pulls toward: the raster's own mean
 * unless given (parts cut from one master share the master's mean).
 * `keepDarkBelow` (the Rift, bead pulp_wars-9s0.5) keeps the darkest pixels
 * as they are: a pixel whose luma is at most 70% of it is untoned, one at
 * or above it is fully toned, and those between are blended, so a chasm
 * keeps its depth while the Grass around it is toned like every Grass tile.
 */
export function tonePixelsV7(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  tone: SpriteToneV7,
  radius = 1,
  pivot?: RgbTripleV7,
  keepDarkBelow?: number,
): Uint8ClampedArray {
  const output = new Uint8ClampedArray(pixels);
  if (isUnchangedToneV7(tone)) return output;
  const centre3 = pivot ?? meanColourV7(pixels);
  const outline = clampPercent(tone.outline, 0, 100) / 100;
  if (outline > 0) {
    const reach = Math.max(1, Math.round(radius)) * 2;
    for (let y = 0; y < height; y += 1)
      for (let x = 0; x < width; x += 1) {
        const offset = (y * width + x) * 4;
        if ((pixels[offset + 3] ?? 0) === 0) continue;
        const r = pixels[offset] ?? 0;
        const g = pixels[offset + 1] ?? 0;
        const b = pixels[offset + 2] ?? 0;
        if (Math.max(r, g, b) > OUTLINE_MAX_CHANNEL) continue;
        let sumR = 0;
        let sumG = 0;
        let sumB = 0;
        let count = 0;
        for (let dy = -reach; dy <= reach; dy += 1)
          for (let dx = -reach; dx <= reach; dx += 1) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
            const neighbour = (ny * width + nx) * 4;
            if ((pixels[neighbour + 3] ?? 0) === 0) continue;
            const nr = pixels[neighbour] ?? 0;
            const ng = pixels[neighbour + 1] ?? 0;
            const nb = pixels[neighbour + 2] ?? 0;
            if (Math.max(nr, ng, nb) <= OUTLINE_MAX_CHANNEL) continue;
            sumR += nr;
            sumG += ng;
            sumB += nb;
            count += 1;
          }
        // A darker tone of the neighbouring fill; warm grey when alone.
        const target =
          count === 0
            ? [84, 78, 70]
            : [
                (sumR / count) * 0.5,
                (sumG / count) * 0.5,
                (sumB / count) * 0.5,
              ];
        output[offset] = Math.round(r + ((target[0] ?? 0) - r) * outline);
        output[offset + 1] = Math.round(g + ((target[1] ?? 0) - g) * outline);
        output[offset + 2] = Math.round(b + ((target[2] ?? 0) - b) * outline);
      }
  }
  const keep = clampPercent(tone.saturation, 0, 100) / 100;
  const contrast = clampPercent(tone.contrast, 0, 100) / 100;
  const lightness = clampPercent(tone.lightness, -100, 100) / 100;
  const toward = lightness >= 0 ? 255 : 0;
  const mix = Math.abs(lightness);
  for (let index = 0; index + 3 < output.length; index += 4) {
    if (output[index + 3] === 0) continue;
    const r = output[index] ?? 0;
    const g = output[index + 1] ?? 0;
    const b = output[index + 2] ?? 0;
    const grey = luma(r, g, b);
    for (let channel = 0; channel < 3; channel += 1) {
      const value = channel === 0 ? r : channel === 1 ? g : b;
      const saturated = grey + (value - grey) * keep;
      const middle = centre3[channel] ?? 128;
      const contrasted = middle + (saturated - middle) * contrast;
      output[index + channel] = Math.round(
        contrasted + (toward - contrasted) * mix,
      );
    }
  }
  if (keepDarkBelow !== undefined && keepDarkBelow > 0)
    for (let index = 0; index + 3 < output.length; index += 4) {
      const original = luma(
        pixels[index] ?? 0,
        pixels[index + 1] ?? 0,
        pixels[index + 2] ?? 0,
      );
      const floor = keepDarkBelow * 0.7;
      const weight = Math.min(
        1,
        Math.max(0, (original - floor) / (keepDarkBelow - floor)),
      );
      for (let channel = 0; channel < 3; channel += 1) {
        const before = pixels[index + channel] ?? 0;
        output[index + channel] = Math.round(
          before + ((output[index + channel] ?? 0) - before) * weight,
        );
      }
    }
  const scale = clampPercent(tone.scale, 10, 100) / 100;
  if (scale === 1) return output;
  const scaled = new Uint8ClampedArray(output.length);
  const centre = width / 2;
  for (let y = 0; y < height; y += 1) {
    const sourceY = Math.floor(height - (height - y - 0.5) / scale);
    if (sourceY < 0 || sourceY >= height) continue;
    for (let x = 0; x < width; x += 1) {
      const sourceX = Math.floor(centre + (x + 0.5 - centre) / scale);
      if (sourceX < 0 || sourceX >= width) continue;
      const from = (sourceY * width + sourceX) * 4;
      const to = (y * width + x) * 4;
      scaled[to] = output[from] ?? 0;
      scaled[to + 1] = output[from + 1] ?? 0;
      scaled[to + 2] = output[from + 2] ?? 0;
      scaled[to + 3] = output[from + 3] ?? 0;
    }
  }
  return scaled;
}

/** The same tone for a code-drawn `#rrggbb`; other strings pass through. */
export function toneHexColourV7(colour: string, tone: SpriteToneV7): string {
  const rgb = parseHexColourV7(colour);
  if (rgb === null || isUnchangedToneV7(tone)) return colour;
  const toned = tonePixelsV7(
    new Uint8ClampedArray([rgb.r, rgb.g, rgb.b, 255]),
    1,
    1,
    { ...tone, scale: 100, outline: 0 },
  );
  return `#${[toned[0], toned[1], toned[2]]
    .map((value) => (value ?? 0).toString(16).padStart(2, "0"))
    .join("")}`;
}

/** A 1-pixel light rim outside the silhouette, where the canvas has room. */
export function haloPixelsV7(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  radius = 1,
): Uint8ClampedArray {
  const output = new Uint8ClampedArray(pixels);
  const reach = Math.max(1, Math.round(radius));
  for (let y = 0; y < height; y += 1)
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4;
      if ((pixels[offset + 3] ?? 0) !== 0) continue;
      let near = false;
      for (let dy = -reach; dy <= reach && !near; dy += 1)
        for (let dx = -reach; dx <= reach && !near; dx += 1) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          near = (pixels[(ny * width + nx) * 4 + 3] ?? 0) >= 128;
        }
      if (!near) continue;
      output[offset] = 255;
      output[offset + 1] = 246;
      output[offset + 2] = 222;
      output[offset + 3] = 235;
    }
  return output;
}

/**
 * Master rows (from the top) of an asset's owner mask that stay in the
 * player colour when the rest takes the faction colour: the helmet crest,
 * the plume, the hood, a banner or a flag. Assets without an entry have no
 * accent. Code-side stand-in for a regenerated small accent mask.
 */
export const ACCENT_ROWS_V7: Readonly<Record<string, number>> = {
  "chibi-fighter": 27,
  "chibi-marksman": 33,
  "chibi-knight": 26,
  "chibi-captain": 30,
  "chibi-guard": 80,
  "chibi-raider": 34,
  "chibi-juggernaut": 0,
  "chibi-city-1": 22,
  "chibi-city-2": 14,
  "chibi-city-3": 14,
  "chibi-market": 12,
  "chibi-port": 22,
};

/**
 * Mean colours of the chibi Grass tiles and the rocky Mountain ground. Land
 * terrain lowers its contrast around its ground's mean, so the ground under
 * a Forest or a Mountain keeps matching the plain tiles beside it. Water
 * and resources use their own mean.
 */
const GRASS_PIVOT: RgbTripleV7 = [137, 183, 91];
const ROCK_PIVOT: RgbTripleV7 = [162, 170, 182];

/**
 * The Rift (bead pulp_wars-9s0.5): its chasm keeps its depth under the
 * terrain tone. Every Grass pixel has a luma of at least 102, so pixels
 * below this luma are the crack's rim and depth only.
 */
export const RIFT_KEEP_DARK_LUMA_V7 = 100;

export function terrainKeepDarkV7(subject: ArtSubjectV7): number | undefined {
  return subject.startsWith("TERRAIN:RIFT_")
    ? RIFT_KEEP_DARK_LUMA_V7
    : undefined;
}

export function terrainPivotV7(subject: ArtSubjectV7): RgbTripleV7 | undefined {
  // The Rift's pieces stand on the Grass tile (bead pulp_wars-9s0.5).
  if (
    subject === "TERRAIN:GRASS" ||
    subject === "TERRAIN:FOREST" ||
    subject.startsWith("TERRAIN:RIFT_")
  )
    return GRASS_PIVOT;
  if (subject === "TERRAIN:MOUNTAIN" || subject === "TERRAIN:MINED_MOUNTAIN")
    return ROCK_PIVOT;
  return undefined;
}

type SubjectGroup = "UNIT" | "BUILDING" | "CITY" | "TERRAIN" | null;

export function directionSubjectGroupV7(subject: ArtSubjectV7): SubjectGroup {
  if (subject.startsWith("UNIT:")) return "UNIT";
  if (subject.startsWith("IMPROVEMENT:")) return "BUILDING";
  if (subject.startsWith("CITY:") || subject === "SITE:VILLAGE") return "CITY";
  if (
    subject.startsWith("TERRAIN:") ||
    subject.startsWith("RESOURCE:") ||
    subject === "TREASURE"
  )
    return "TERRAIN";
  return null;
}

/** Only the shared (Human) pieces have a designed faction palette so far. */
function humanPiece(subject: ArtSubjectV7): boolean {
  return subject.split(":").length === 2;
}

function intrinsicSize(
  image: CanvasImageSource,
): { readonly width: number; readonly height: number } | null {
  const sized = image as {
    readonly naturalWidth?: unknown;
    readonly naturalHeight?: unknown;
    readonly width?: unknown;
    readonly height?: unknown;
  };
  const width =
    typeof sized.naturalWidth === "number" ? sized.naturalWidth : sized.width;
  const height =
    typeof sized.naturalHeight === "number"
      ? sized.naturalHeight
      : sized.height;
  return typeof width === "number" &&
    typeof height === "number" &&
    width > 0 &&
    height > 0
    ? { width, height }
    : null;
}

type Ready = Extract<ChibiResolutionV7, { readonly kind: "READY" }>;

/**
 * Wraps the CHIBI art resolver so the board draws a direction's sprites:
 * the direction's own art where it has some, owner areas in the faction
 * colour, an optional player-colour accent, and toned copies of buildings,
 * cities and terrain. Copies are built once per source raster and setting
 * and released with the source; drawing a frame does no pixel work.
 *
 * `samples` resolves the direction's own art by subject: the production
 * registry of src/assets/chibi-direction-art-manifest.ts in the game, an
 * exploration set on the study's benches. While such a raster loads the
 * piece is not drawn (never the previous art first); when it is not
 * registered or failed to load (MISSING), the piece falls back to the base
 * resolver's classic asset, recoloured and toned like any unconverted piece.
 */
export function createDirectedChibiArtV7(input: {
  readonly base: ChibiBoardArtV7;
  readonly direction: BoardVisualDirectionV7;
  readonly environment: Pick<
    ChibiRasterEnvironmentV7,
    "readPixels" | "createSurface"
  >;
  readonly samples?: ChibiBoardArtV7;
}): ChibiBoardArtV7 {
  const { base, direction, environment } = input;
  const copies = new WeakMap<object, Map<string, CanvasImageSource | null>>();
  const derived = (
    image: CanvasImageSource,
    key: string,
    build: (
      pixels: Uint8ClampedArray,
      width: number,
      height: number,
    ) => Uint8ClampedArray | null,
  ): CanvasImageSource => {
    let perImage = copies.get(image);
    if (perImage === undefined) {
      perImage = new Map();
      copies.set(image, perImage);
    }
    const cached = perImage.get(key);
    if (cached !== undefined) return cached ?? image;
    const size = intrinsicSize(image);
    const pixels =
      size === null
        ? null
        : environment.readPixels(image, size.width, size.height);
    const built =
      size === null || pixels === null
        ? null
        : build(pixels, size.width, size.height);
    const surface =
      size === null || built === null
        ? null
        : environment.createSurface(built, size.width, size.height);
    perImage.set(key, surface);
    return surface ?? image;
  };
  const means = new WeakMap<object, RgbTripleV7 | null>();
  const meanOf = (image: CanvasImageSource): RgbTripleV7 | undefined => {
    const cached = means.get(image);
    if (cached !== undefined) return cached ?? undefined;
    const size = intrinsicSize(image);
    const pixels =
      size === null
        ? null
        : environment.readPixels(image, size.width, size.height);
    const mean = pixels === null ? null : meanColourV7(pixels);
    means.set(image, mean);
    return mean ?? undefined;
  };
  const toned = (
    image: CanvasImageSource,
    tone: SpriteToneV7,
    density: number,
    pivot?: RgbTripleV7,
    keepDark?: number,
  ): CanvasImageSource =>
    isUnchangedToneV7(tone)
      ? image
      : derived(
          image,
          `tone:${toneKey(tone)}:${pivot?.join(",") ?? ""}${keepDark === undefined ? "" : `:dark${keepDark}`}`,
          (pixels, width, height) =>
            tonePixelsV7(pixels, width, height, tone, density, pivot, keepDark),
        );
  /**
   * The piece with its owner mask in `colour`, and the rows above the
   * asset's accent line taken from the player-coloured piece.
   */
  const ownerAreas = (
    request: ChibiArtRequestV7,
    colour: OwnerAreaColourV7,
    accent: boolean,
  ): ChibiResolutionV7 => {
    // Since bead pulp_wars-w5j.3 a ship is no exception: every faction has
    // its own fixed-colour ships, so a Human ship drawn from its classic
    // raster takes the Human colour like a Human land unit.
    if (colour === "PLAYER" || !humanPiece(request.subject))
      return base.resolve(request);
    const fixed = base.resolve({ ...request, ownerColor: colour });
    if (fixed.kind !== "READY" || !accent || request.ownerColor === undefined)
      return fixed;
    const rows = ACCENT_ROWS_V7[fixed.asset.id] ?? 0;
    if (rows <= 0) return fixed;
    const player = base.resolve(request);
    if (player.kind !== "READY") return player;
    const image = derived(
      fixed.image,
      `accent:${request.ownerColor}:${rows}`,
      (pixels, width, height) => {
        const playerPixels = environment.readPixels(
          player.image,
          width,
          height,
        );
        const output = new Uint8ClampedArray(pixels);
        if (playerPixels?.length !== pixels.length) return output;
        const limit = Math.min(height, rows * fixed.density) * width * 4;
        output.set(playerPixels.subarray(0, limit), 0);
        return output;
      },
    );
    return {
      ...fixed,
      image,
      cacheKey: `${fixed.cacheKey}|accent:${request.ownerColor}`,
    };
  };
  const withTone = (
    ready: Ready,
    tone: SpriteToneV7,
    fixedPivot?: RgbTripleV7,
    keepDark?: number,
  ): Ready => {
    if (isUnchangedToneV7(tone)) return ready;
    // Parts and the body layer are cut from the master, so they share its
    // mean; the ground layer is a tile of its own.
    const pivot = fixedPivot ?? meanOf(ready.image);
    const copy = (image: CanvasImageSource, density: number) =>
      toned(image, tone, density, pivot, keepDark);
    const { layers, parts } = ready;
    return {
      ...ready,
      image: copy(ready.image, ready.density),
      cacheKey: `${ready.cacheKey}|tone:${toneKey(tone)}${keepDark === undefined ? "" : `:dark${keepDark}`}`,
      ...(layers === undefined
        ? {}
        : {
            layers: {
              ground: toned(layers.ground, tone, 1, fixedPivot),
              body: copy(layers.body, 1),
            },
          }),
      ...(parts === undefined
        ? {}
        : {
            parts: {
              cell: copy(parts.cell, 1),
              overflow: copy(parts.overflow, 1),
              ...(parts.bodyCell === undefined
                ? {}
                : { bodyCell: copy(parts.bodyCell, 1) }),
            },
          }),
    };
  };
  // Tall-terrain parts and layers are cut from one master, so only the
  // colour of terrain is toned; a per-part outline or scale would misalign.
  const terrainTone: SpriteToneV7 = { ...direction.terrain, scale: 100 };
  return {
    resolveFringedGround(request) {
      const ground = base.resolveFringedGround?.(request) ?? null;
      return ground === null
        ? null
        : toned(ground, terrainTone, 1, terrainPivotV7(request.asset.subject));
    },
    resolve(request) {
      const group = directionSubjectGroupV7(request.subject);
      if (group === null) {
        // Undead (bead pulp_wars-3tq.12): the direction's own effect sprites
        // (the violet Wail, splash, Raise Dead hands and spirit wisp) are
        // drawn where it registers one; every other subject is unchanged.
        if (
          input.samples !== undefined &&
          direction.unit.samples &&
          request.subject.startsWith("EFFECT:")
        ) {
          const sample = input.samples.resolve(request);
          if (sample.kind !== "MISSING") return sample;
        }
        return base.resolve(request);
      }
      if (group === "TERRAIN") {
        const resolved = base.resolve(request);
        return resolved.kind === "READY"
          ? withTone(
              resolved,
              terrainTone,
              terrainPivotV7(request.subject),
              terrainKeepDarkV7(request.subject),
            )
          : resolved;
      }
      if (group === "UNIT") {
        const sample =
          direction.unit.samples && input.samples !== undefined
            ? input.samples.resolve(request)
            : null;
        // A faction's ship or transport without its own raster (none
        // registered, or it failed to load) is the classic shared ship with
        // its sail in the owner's colour, never the Human direction ship,
        // whose crimson would say "Human" (bead pulp_wars-w5j.3).
        const navalStandIn =
          sample !== null && sample.kind !== "MISSING"
            ? null
            : navalSharedSubjectV7(request.subject);
        const resolved =
          sample !== null && sample.kind !== "MISSING"
            ? sample
            : navalStandIn !== null
              ? base.resolve({ ...request, subject: navalStandIn })
              : ownerAreas(
                  request,
                  direction.unit.owner,
                  direction.unit.accent,
                );
        if (resolved.kind !== "READY" || !direction.unit.halo) return resolved;
        return {
          ...resolved,
          image: derived(resolved.image, "halo", (pixels, width, height) =>
            haloPixelsV7(pixels, width, height, resolved.density),
          ),
          cacheKey: `${resolved.cacheKey}|halo`,
        };
      }
      // An unconverted faction's city keeps its classic raster; a faction
      // city with direction art of its own (Goblin, Undead) is drawn from
      // it, and falls back to its classic raster when that fails to load.
      if (
        group === "CITY" &&
        direction.city.factionCities === "CLASSIC" &&
        !humanPiece(request.subject)
      ) {
        const sample =
          direction.city.samples && input.samples !== undefined
            ? input.samples.resolve(request)
            : null;
        return sample !== null && sample.kind !== "MISSING"
          ? sample
          : base.resolve(request);
      }
      const settings = group === "CITY" ? direction.city : direction.building;
      // A re-created sample sprite is drawn as authored: its colours are the
      // faction's already, so it takes neither the tone nor an owner colour.
      if (settings.samples && input.samples !== undefined) {
        const sample = input.samples.resolve(request);
        if (sample.kind !== "MISSING") return sample;
      }
      const resolved = ownerAreas(request, settings.owner, settings.accent);
      return resolved.kind === "READY"
        ? withTone(resolved, settings)
        : resolved;
    },
  };
}

// ---------------------------------------------------------------- chrome

const OUTLINE = "#171722";
const READY_RIM = "#fff6cf";

/** CHIBI road strokes of the calm variant: a soft casing, no black line. */
export const CALM_ROAD_STROKES_V7 = [
  ["#8b7a55", 11],
  ["#cdbb8f", 8],
] as const satisfies readonly (readonly [string, number])[];

export interface DirectedRectV7 {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/**
 * The half-width of an Egg's base plate as a share of its sprite's width:
 * 29 of 48 master pixels, about the plate of a large unit (57 px), so
 * that 5 px of plate show on each side of the 48 px nest (bead
 * pulp_wars-3tq.13).
 */
export const DIRECTION_EGG_PLATE_RADIUS_SHARE_V7 = 29 / 48;

/**
 * The ground under a unit in the live look (bead pulp_wars-w5j.3): a faint
 * neutral shadow (SHADOW), never on water or under a flyer, which casts its
 * own; and, for a ready unit, the GROUND ready cue: a thin cream ring with
 * a soft dark casing round the feet (or round the hull on the water). The
 * ring is an ellipse on the ground, so it is never taken for the selection,
 * which outlines the whole cell. In world terms the ring is 28 master px
 * wide each side of a standard unit's centre (wider than its feet, so both
 * ends show), the hull's 44% of its width afloat, and the Egg's nest width.
 */
export const DIRECTED_GROUND_SHADOW_COLOUR_V7 = "rgba(18, 22, 30, 0.24)";
export const DIRECTED_READY_RING_COLOUR_V7 = READY_RIM;

/** The ground ellipse of a unit: centred under the feet, in CSS px. */
export function directedUnitGroundV7(
  entry: BoardRenderPlanEntryV7,
  sprite: DirectedRectV7,
  share: number,
): {
  readonly centreX: number;
  readonly centreY: number;
  readonly radiusX: number;
  readonly radiusY: number;
  readonly afloat: boolean;
} {
  const scale = sprite.height / 80;
  const afloat =
    directionUnitAfloatV7(entry.artSubject) || entry.martian?.afloat === true;
  const egg = entry.kind === "UNIT" && entry.egg !== undefined;
  const radiusX =
    (afloat
      ? sprite.width * 0.44
      : egg
        ? sprite.width * DIRECTION_EGG_PLATE_RADIUS_SHARE_V7
        : Math.min(sprite.width * 0.5, 28 * scale)) * share;
  const radiusY = radiusX * (afloat ? 0.3 : 0.34);
  return {
    centreX: sprite.x + sprite.width / 2,
    // The feet stand about 5 master pixels above the canvas bottom.
    centreY: sprite.y + sprite.height - radiusY - 1 * scale,
    radiusX,
    radiusY,
    afloat,
  };
}

export interface DirectedEllipseV7 {
  readonly centreX: number;
  readonly centreY: number;
  readonly radiusX: number;
  readonly radiusY: number;
}

/**
 * The shadow and the GROUND ready ring of a unit in CSS px (bead
 * pulp_wars-jg1): from the unit's measured anchor (unit-shadows-v7.ts) when
 * `assetId` is the raster it was measured on, scaled by the drawn size of
 * the sprite; otherwise (afloat, a stand-in raster, no anchor) the generic
 * ellipses of directedUnitGroundV7, exactly as before the anchors existed.
 */
export function directedUnitShadowGeometryV7(
  entry: BoardRenderPlanEntryV7,
  sprite: DirectedRectV7,
  assetId?: string,
): {
  readonly shadow: DirectedEllipseV7;
  readonly ring: DirectedEllipseV7;
  readonly afloat: boolean;
  /** Whether the unit's measured anchor placed them. */
  readonly anchored: boolean;
} {
  const ground = directedUnitGroundV7(entry, sprite, 1);
  const anchor = ground.afloat
    ? null
    : unitShadowAnchorV7(entry.artSubject, assetId);
  if (
    anchor !== null &&
    anchor.shadow !== null &&
    anchor.ring !== null &&
    anchor.width > 0
  ) {
    const scale = sprite.width / anchor.width;
    const place = (ellipse: UnitShadowEllipseV7): DirectedEllipseV7 => ({
      centreX: sprite.x + ellipse.x * scale,
      centreY: sprite.y + ellipse.y * scale,
      radiusX: ellipse.radiusX * scale,
      radiusY: ellipse.radiusY * scale,
    });
    return {
      shadow: place(anchor.shadow),
      ring: place(anchor.ring),
      afloat: false,
      anchored: true,
    };
  }
  const shadow = directedUnitGroundV7(entry, sprite, 0.78);
  return {
    shadow: {
      centreX: shadow.centreX,
      centreY: ground.centreY,
      radiusX: shadow.radiusX,
      radiusY: shadow.radiusY,
    },
    ring: ground,
    afloat: ground.afloat,
    anchored: false,
  };
}

function drawDirectedGroundV7(
  context: CanvasRenderingContext2D,
  direction: BoardVisualDirectionV7,
  entry: BoardRenderPlanEntryV7,
  sprite: DirectedRectV7,
  zoom: number,
  assetId: string | undefined,
): void {
  const {
    shadow,
    ring: ground,
    afloat,
  } = directedUnitShadowGeometryV7(entry, sprite, assetId);
  // The Dwarf revision: the Gyrocopter casts its own shadow too.
  const flyer = entry.martian?.flyer === true || entry.dwarf?.flyer === true;
  const shadowed = direction.unit.base === "SHADOW" && !afloat && !flyer;
  const ring = entry.ready === true && direction.chrome.ready !== "GLOW";
  // Nothing to draw: leave the context untouched (the baseline direction
  // draws exactly the stock frame).
  if (!shadowed && !ring) return;
  context.save();
  if (shadowed) {
    context.beginPath();
    context.ellipse(
      shadow.centreX,
      shadow.centreY,
      shadow.radiusX,
      shadow.radiusY,
      0,
      0,
      Math.PI * 2,
    );
    context.fillStyle = DIRECTED_GROUND_SHADOW_COLOUR_V7;
    context.fill();
  }
  if (ring) {
    context.beginPath();
    context.ellipse(
      ground.centreX,
      ground.centreY,
      ground.radiusX,
      ground.radiusY,
      0,
      0,
      Math.PI * 2,
    );
    context.globalAlpha *= 0.55;
    context.strokeStyle = OUTLINE;
    context.lineWidth = 4.5 * zoom;
    context.stroke();
    context.globalAlpha /= 0.55;
    context.strokeStyle = READY_RIM;
    context.lineWidth = 2.25 * zoom;
    context.stroke();
  }
  context.restore();
}

/**
 * The base under a unit's feet: a flat ellipse in the player colour (DISC)
 * or its outline alone (RING), centred on the sprite's bottom edge. A ready
 * unit's base has a bright rim when the direction moves the ready cue there.
 * SHADOW and NONE draw no base (the live look, bead pulp_wars-w5j.3): the
 * faint neutral shadow and the GROUND ready ring. A unit afloat gets no
 * plate and no ring in any direction since bead pulp_wars-w5j.3; a ready
 * one has the ready ring round its hull. `assetId` is the raster drawn:
 * when it is the one a unit's shadow anchor was measured on, the shadow
 * and the ring sit under that unit's own feet (bead pulp_wars-jg1).
 */
export function drawDirectedUnitBaseV7(
  context: CanvasRenderingContext2D,
  direction: BoardVisualDirectionV7,
  entry: BoardRenderPlanEntryV7,
  sprite: DirectedRectV7,
  zoom: number,
  assetId?: string,
): void {
  const style = direction.unit.base;
  const afloat =
    directionUnitAfloatV7(entry.artSubject) || entry.martian?.afloat === true;
  if (style === "NONE" || style === "SHADOW" || afloat) {
    drawDirectedGroundV7(context, direction, entry, sprite, zoom, assetId);
    return;
  }
  if (entry.ownerColor === undefined) return;
  const scale = sprite.height / 80;
  const centreX = sprite.x + sprite.width / 2;
  // --- Dinosaur (bead pulp_wars-3tq.13) ---
  // The Egg's 48 px sprite is a nest that fills its canvas, wider than the
  // 31 px plate its height would give it, so that plate would be hidden. It
  // stands on a 58 px plate (about a large unit's), whose ends show beside
  // the nest: the shell carries no player colour.
  const egg = entry.kind === "UNIT" && entry.egg !== undefined;
  // --- end Dinosaur ---
  const radiusX = egg
    ? sprite.width * DIRECTION_EGG_PLATE_RADIUS_SHARE_V7
    : Math.min(sprite.width * 0.5, (style === "PLATE" ? 26 : 30) * scale);
  const radiusY = radiusX * (style === "PLATE" ? 0.34 : 0.36);
  // The feet stand about 5 master pixels above the canvas bottom.
  const centreY = sprite.y + sprite.height - radiusY - 1 * scale;
  const ready = entry.ready === true && direction.chrome.ready === "BASE";
  const seat = direction.unit.baseShape === "SEAT" ? (entry.ownerSeat ?? 0) : 0;
  const ellipse = (grow: number): void =>
    seatBasePath(
      context,
      seat,
      centreX,
      centreY,
      radiusX + grow * zoom,
      radiusY + grow * zoom,
    );
  context.save();
  if (style === "RING") {
    ellipse(0);
    context.strokeStyle = OUTLINE;
    context.lineWidth = (ready ? 10 : 7) * zoom;
    context.stroke();
    if (ready) {
      context.strokeStyle = READY_RIM;
      context.lineWidth = 8 * zoom;
      context.stroke();
    }
    context.strokeStyle = entry.ownerColor;
    context.lineWidth = 4 * zoom;
    context.stroke();
    context.restore();
    return;
  }
  if (style === "PLATE") {
    if (ready) {
      ellipse(5.5);
      context.fillStyle = OUTLINE;
      context.fill();
      ellipse(4.5);
      context.fillStyle = READY_RIM;
      context.fill();
    }
    ellipse(1.5);
    context.fillStyle = darkerColourV7(entry.ownerColor);
    context.fill();
    ellipse(0);
    context.fillStyle = entry.ownerColor;
    context.fill();
    context.restore();
    return;
  }
  if (ready) {
    ellipse(7);
    context.fillStyle = OUTLINE;
    context.fill();
    ellipse(5.5);
    context.fillStyle = READY_RIM;
    context.fill();
  }
  ellipse(1.5);
  context.fillStyle = OUTLINE;
  context.fill();
  ellipse(0);
  context.fillStyle = entry.ownerColor;
  context.fill();
  context.restore();
}

/**
 * Ships and the embarked transport, of any faction (bead pulp_wars-w5j.3):
 * they stand on the water, so they get no plate and no shadow.
 */
export function directionUnitAfloatV7(
  subject: ArtSubjectV7 | undefined,
): boolean {
  return subject?.startsWith("UNIT:") === true
    ? navalArtRoleOfSubjectV7(subject) !== null
    : false;
}

/** A darker tone of a `#rrggbb` colour, for rims that are not black. */
export function darkerColourV7(colour: string): string {
  const rgb = parseHexColourV7(colour);
  if (rgb === null) return OUTLINE;
  return `#${[rgb.r, rgb.g, rgb.b]
    .map((value) =>
      Math.round(value * 0.45)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}

/**
 * The player pennant on a building or a city that has an authored anchor:
 * a short pole (unless the art has its own mast) and a small swallow-tailed
 * flag in the owner colour; a city's is larger and carries the seat shape,
 * gold for the capital. `sprite` is the drawn rect of the art and `scale`
 * the CSS pixels per master pixel. Returns whether a pennant was drawn.
 */
export function drawDirectedFlagV7(
  context: CanvasRenderingContext2D,
  direction: BoardVisualDirectionV7,
  entry: BoardRenderPlanEntryV7,
  assetId: string,
  sprite: DirectedRectV7,
  scale: number,
): boolean {
  const city = entry.kind === "CITY";
  if (
    !(city ? direction.city.banner : direction.building.flags) ||
    (entry.kind !== "IMPROVEMENT" && !city) ||
    entry.ownerColor === undefined
  )
    return false;
  const anchor = DIRECTION_FLAG_ANCHORS_V7[assetId];
  if (anchor === undefined) return false;
  const x = sprite.x + anchor.x * scale;
  const top = sprite.y + anchor.y * scale;
  const width = (city ? 17 : 11) * scale;
  const height = (city ? 11 : 7) * scale;
  context.save();
  context.lineJoin = "round";
  context.lineCap = "round";
  const pole = Math.max(anchor.pole, 0) * scale;
  if (pole > 0) {
    context.beginPath();
    context.moveTo(x, top);
    context.lineTo(x, top + pole);
    context.strokeStyle = "#4a3b2e";
    context.lineWidth = 2.6 * scale;
    context.stroke();
    context.strokeStyle = "#d9cdb4";
    context.lineWidth = 1.2 * scale;
    context.stroke();
  }
  context.beginPath();
  context.moveTo(x, top);
  context.lineTo(x + width, top);
  context.lineTo(x + width * 0.72, top + height / 2);
  context.lineTo(x + width, top + height);
  context.lineTo(x, top + height);
  context.closePath();
  context.fillStyle = entry.ownerColor;
  context.strokeStyle = darkerColourV7(entry.ownerColor);
  context.lineWidth = 1.2 * scale;
  context.fill();
  context.stroke();
  if (city) {
    seatShapePath(
      context,
      entry.ownerSeat ?? 0,
      x + width * 0.36,
      top + height / 2,
      height * 0.27,
    );
    context.fillStyle = entry.capital === true ? "#f4c542" : "#fff8e6";
    context.fill();
    context.lineWidth = 0.8 * scale;
    context.stroke();
  }
  context.restore();
  return true;
}

/**
 * The base outline of a seat: round, pointed, square or swallow-tailed
 * ends, so four players' bases differ by shape as well as by colour.
 */
function seatBasePath(
  context: CanvasRenderingContext2D,
  seat: number,
  centreX: number,
  centreY: number,
  radiusX: number,
  radiusY: number,
): void {
  context.beginPath();
  const shape = ((seat % 4) + 4) % 4;
  if (shape === 0) {
    context.ellipse(centreX, centreY, radiusX, radiusY, 0, 0, Math.PI * 2);
    return;
  }
  const points: readonly (readonly [number, number])[] =
    shape === 1
      ? [
          [-1.12, 0],
          [0, -1.12],
          [1.12, 0],
          [0, 1.12],
        ]
      : shape === 2
        ? [
            [-0.94, -0.88],
            [0.94, -0.88],
            [0.94, 0.88],
            [-0.94, 0.88],
          ]
        : [
            [-1.08, -0.92],
            [1.08, -0.92],
            [0.74, 0],
            [1.08, 0.92],
            [-1.08, 0.92],
            [-0.74, 0],
          ];
  points.forEach(([px, py], index) => {
    const x = centreX + px * radiusX;
    const y = centreY + py * radiusY;
    if (index === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  });
  context.closePath();
}

/** Seat shapes, so a player is told apart without relying on colour. */
function seatShapePath(
  context: CanvasRenderingContext2D,
  seat: number,
  centreX: number,
  centreY: number,
  radius: number,
): void {
  context.beginPath();
  const shape = ((seat % 4) + 4) % 4;
  if (shape === 0) context.arc(centreX, centreY, radius, 0, Math.PI * 2);
  else if (shape === 1) {
    context.moveTo(centreX, centreY - radius * 1.15);
    context.lineTo(centreX + radius * 1.15, centreY);
    context.lineTo(centreX, centreY + radius * 1.15);
    context.lineTo(centreX - radius * 1.15, centreY);
    context.closePath();
  } else if (shape === 2)
    context.rect(
      centreX - radius * 0.9,
      centreY - radius * 0.9,
      radius * 1.8,
      radius * 1.8,
    );
  else {
    // Swallow-tailed, like the fourth seat's base.
    context.moveTo(centreX - radius * 1.2, centreY - radius * 0.9);
    context.lineTo(centreX + radius * 1.2, centreY - radius * 0.9);
    context.lineTo(centreX + radius * 0.6, centreY);
    context.lineTo(centreX + radius * 1.2, centreY + radius * 0.9);
    context.lineTo(centreX - radius * 1.2, centreY + radius * 0.9);
    context.lineTo(centreX - radius * 0.6, centreY);
    context.closePath();
  }
}

/**
 * Top of the HP bar on the base, in world units below the cell centre (the
 * cell's bottom edge is at 64, the bar is 8 high).
 */
export const DIRECTED_BASE_HP_BAR_TOP_V7 = 50;

export interface DirectedChromeHandledV7 {
  readonly badge: boolean;
  readonly hp: boolean;
  readonly crown: boolean;
}

const NOTHING_HANDLED: DirectedChromeHandledV7 = {
  badge: false,
  hp: false,
  crown: false,
};

/**
 * Draws the direction's replacements for a CHIBI piece's seat badge, HP bar
 * and capital crown, and says which of the stock overlays it replaced. `x`
 * and `y` are the cell centre; sizes are world units (128 = one cell).
 */
export function drawDirectedPieceChromeV7(
  context: CanvasRenderingContext2D,
  direction: BoardVisualDirectionV7,
  entry: BoardRenderPlanEntryV7,
  x: number,
  y: number,
  zoom: number,
  garrisoned = false,
  /** The city's pennant was already drawn on its art's own anchor. */
  flagDrawn = false,
): DirectedChromeHandledV7 {
  if (entry.kind !== "UNIT" && entry.kind !== "CITY") return NOTHING_HANDLED;
  const { chrome } = direction;
  const seat = entry.ownerSeat ?? 0;
  let badge = false;
  let crown = false;
  let hp = false;
  // Nothing replaced: leave the context untouched, so a direction that
  // changes no chrome draws exactly the stock overlays.
  if (
    !(entry.kind === "CITY" && direction.city.banner) &&
    chrome.badge === "SQUARE" &&
    chrome.hp === "ALWAYS" &&
    chrome.hpPlacement === "SIDE"
  )
    return NOTHING_HANDLED;
  context.save();
  context.lineJoin = "round";
  if (
    entry.kind === "CITY" &&
    direction.city.banner &&
    !flagDrawn &&
    direction.city.factionCities === "CLASSIC" &&
    entry.artSubject !== undefined &&
    !humanPiece(entry.artSubject)
  ) {
    // An unconverted faction's city: no pennant, the stock capital crown.
    badge = chrome.badge !== "SQUARE";
  } else if (entry.kind === "CITY" && direction.city.banner) {
    badge = true;
    crown = entry.capital === true;
    if (entry.ownerColor !== undefined && !flagDrawn) {
      // A pennant on a pole at the cell's top-left corner.
      const poleX = x - 52 * zoom;
      const top = y - 78 * zoom;
      const bottom = y - 30 * zoom;
      context.strokeStyle = OUTLINE;
      context.lineCap = "round";
      context.lineWidth = 5 * zoom;
      context.beginPath();
      context.moveTo(poleX, top);
      context.lineTo(poleX, bottom);
      context.stroke();
      context.strokeStyle = "#e9e2cf";
      context.lineWidth = 2 * zoom;
      context.stroke();
      context.beginPath();
      context.moveTo(poleX, top);
      context.lineTo(poleX + 34 * zoom, top);
      context.lineTo(poleX + 26 * zoom, top + 12 * zoom);
      context.lineTo(poleX + 34 * zoom, top + 24 * zoom);
      context.lineTo(poleX, top + 24 * zoom);
      context.closePath();
      context.fillStyle = entry.ownerColor;
      context.strokeStyle = OUTLINE;
      context.lineWidth = 2.5 * zoom;
      context.fill();
      context.stroke();
      seatShapePath(
        context,
        seat,
        poleX + 13 * zoom,
        top + 12 * zoom,
        (crown ? 7 : 5.5) * zoom,
      );
      context.fillStyle = crown ? "#f4c542" : "#fff8e6";
      context.fill();
      context.lineWidth = 1.5 * zoom;
      context.stroke();
    }
  } else if (chrome.badge !== "SQUARE" && entry.ownerColor !== undefined) {
    badge = true;
    if (chrome.badge === "SHAPE") {
      seatShapePath(
        context,
        seat,
        x + (garrisoned ? -6 : -50) * zoom,
        y + 50 * zoom,
        10 * zoom,
      );
      context.fillStyle = entry.ownerColor;
      context.strokeStyle = OUTLINE;
      context.lineWidth = 2.5 * zoom;
      context.fill();
      context.stroke();
    }
  }
  if (
    entry.kind === "UNIT" &&
    entry.hp !== undefined &&
    entry.maxHp !== undefined &&
    (chrome.hp === "DAMAGED" || chrome.hpPlacement === "BASE")
  ) {
    hp = true;
    const share = Math.max(0, Math.min(1, entry.hp / entry.maxHp));
    if (chrome.hp === "ALWAYS" || share < 1) {
      if (chrome.hpPlacement === "SIDE") {
        const bar = { left: -63, top: -36, width: 9, height: 76 };
        context.fillStyle = "#101718";
        context.fillRect(
          x + bar.left * zoom,
          y + bar.top * zoom,
          bar.width * zoom,
          bar.height * zoom,
        );
        const inner = (bar.height - 2) * share;
        context.fillStyle = share <= 0.34 ? "#f0625a" : "#65d889";
        context.fillRect(
          x + (bar.left + 1) * zoom,
          y + (bar.top + bar.height - 1 - inner) * zoom,
          (bar.width - 2) * zoom,
          inner * zoom,
        );
      } else {
        // A short bar under the feet, on the base. It stays clear of the
        // cell's bottom edge, where the territory border and the selection
        // outline are drawn (bead pulp_wars-3tq.6).
        const width = (garrisoned ? 40 : 54) * zoom;
        const height = 8 * zoom;
        const left = x + (garrisoned ? 20 : 0) * zoom - width / 2;
        const top = y + DIRECTED_BASE_HP_BAR_TOP_V7 * zoom;
        context.fillStyle = "#101718";
        context.fillRect(left, top, width, height);
        context.fillStyle =
          share <= 0.34 ? "#f0625a" : share <= 0.67 ? "#f1c94b" : "#65d889";
        context.fillRect(
          left + zoom,
          top + zoom,
          (width - 2 * zoom) * share,
          height - 2 * zoom,
        );
      }
    }
  }
  context.restore();
  return { badge, hp, crown };
}

/**
 * The SOLID territory border: one thin continuous line in the owner colour
 * just inside the owner's side of the edge, with a soft dark casing.
 */
export function drawDirectedTerritoryBoundaryV7(
  context: CanvasRenderingContext2D,
  camera: CameraState,
  entry: BoardRenderPlanEntryV7,
): void {
  if (entry.edge === undefined) return;
  const zoom = camera.zoom;
  const x = camera.offsetX + entry.at.x * TILE_WIDTH * zoom;
  const y = camera.offsetY + entry.at.y * TILE_HEIGHT * zoom;
  const half = (TILE_WIDTH * zoom) / 2;
  const ends: Readonly<Record<TileEdge, readonly number[]>> = {
    NORTH: [x - half, y - half, x + half, y - half],
    EAST: [x + half, y - half, x + half, y + half],
    SOUTH: [x + half, y + half, x - half, y + half],
    WEST: [x - half, y + half, x - half, y - half],
  };
  const [fromX = 0, fromY = 0, toX = 0, toY = 0] = ends[entry.edge];
  const stroke = (colour: string, width: number, alpha: number): void => {
    context.globalAlpha = alpha;
    context.strokeStyle = colour;
    context.lineWidth = width * zoom;
    context.beginPath();
    context.moveTo(fromX, fromY);
    context.lineTo(toX, toY);
    context.stroke();
  };
  context.save();
  context.lineCap = "round";
  const selected = entry.boundaryStyle === "CITY";
  stroke("#1d2a28", selected ? 8 : 6.5, 0.55);
  if (entry.counterpartOwnerColor !== undefined) {
    // Both owners: two thin lines side by side would need the edge's sides;
    // alternate long dashes of the two colours instead.
    context.setLineDash([16 * zoom, 16 * zoom]);
    stroke(entry.ownerColor ?? "#fff6b0", 3.5, 1);
    context.lineDashOffset = -16 * zoom;
    stroke(entry.counterpartOwnerColor, 3.5, 1);
  } else stroke(entry.ownerColor ?? "#fff6b0", selected ? 5 : 3.5, 1);
  context.restore();
}

/** What the board renderer needs to draw a direction. */
export interface BoardDirectionRuntimeV7 {
  readonly spec: BoardVisualDirectionV7;
  /** The CHIBI art resolver wrapped by createDirectedChibiArtV7. */
  readonly art: ChibiBoardArtV7;
}
