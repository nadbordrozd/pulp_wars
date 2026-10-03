/**
 * Presentation constants and pure drawing functions of the Steampunk Dwarf
 * art (bead pulp_wars-78i.5, docs/art/factions/DWARF.md): the faction's
 * measured colours, the pennant anchors of its cities, the Gyrocopter's
 * lift and shadow, the tunnel mound and the eruption timeline, the bomb
 * timeline, and the code-drawn Dig In earthwork. This module imports
 * nothing, so the game, the review scenes and the tests draw the same
 * bytes. Wired in by the Dwarf UI bead (pulp_wars-78i.6; DWARF.md, "Wiring
 * list"): src/render/canvas/dwarf-canvas-v7.ts and dwarf-effects-v7.ts draw
 * from it, and visual-direction-v7.ts holds the flag anchors.
 */

/**
 * The look's colours, measured on the accepted unit masters (DWARF.md,
 * "Palette"); the spec's reference swatches are in the comments.
 */
export const DWARF_PALETTE_V7 = {
  /** Soot-black iron, the darkest lit iron (spec `#3a3835`, L* 23.6). */
  iron: "#37393b",
  /** The light rim on iron, the lit edge (warm grey). */
  ironRim: "#9c9c9d",
  /** Lit copper as PixelLab draws it: a red copper (spec about `#c27c3a`). */
  copper: "#de6f2a",
  /** Copper shade, kept out of the owner key's band by `dwarf-copper`. */
  copperShade: "#812e11",
  /** Ginger-copper beards (spec about `#c8642a`). */
  beard: "#be5826",
  /** Dark leather (spec about `#4a3426`). */
  leather: "#4e2417",
  /** Steam and gauge faces only, never a body colour (spec `#f2f2ee`). */
  steam: "#f0f1ee",
  /** The reserve signal-green lamp of every machine (spec `#2bd94a`). */
  lamp: "#4ac14a",
  lampLit: "#68ef3a",
  /** Earth of the mound, the eruption and the Dig In earthwork. */
  earthDark: "#3d2a1e",
  earth: "#6e4b30",
  earthLight: "#a07a52",
  sandbag: "#c9b48a",
  sandbagShade: "#8f7a58",
  outline: "#1b1512",
} as const;

/**
 * Pennant anchors of the Dwarf cities: the top of each city's own dark
 * iron pole, in master pixels from the sprite's top-left corner (the
 * shape of DIRECTION_FLAG_ANCHORS_V7).
 */
export const DWARF_FLAG_ANCHORS_V7: Readonly<
  Record<string, { readonly x: number; readonly y: number; readonly pole: 0 }>
> = {
  "chibi-direction-dwarf-city-1": { x: 70, y: 31, pole: 0 },
  "chibi-direction-dwarf-city-2": { x: 78.5, y: 47, pole: 0 },
  "chibi-direction-dwarf-city-3": { x: 84, y: 36, pole: 0 },
};

/**
 * The Gyrocopter flies like the Martian flyers: no shadow is baked into the
 * sprite, which has a gap of empty rows under it (its lowest pixel is row
 * 69 of 88; a walker of the same canvas stands on row 81 to 82). The
 * interface draws the shadow on the ground line and may lift the sprite
 * further, as MARTIAN_FLYER_PRESENTATION_V7 does.
 */
export const DWARF_FLYER_PRESENTATION_V7 = {
  "chibi-direction-dwarf-gyrocopter": {
    hullBottom: 69,
    groundLine: 82,
    shadow: { x: 36, y: 81, radiusX: 18, radiusY: 4 },
  },
} as const;

/** Shadow colour and alpha of the flyer's ground shadow. */
export const DWARF_FLYER_SHADOW_V7 = { colour: "#10131a", alpha: 0.35 };

/**
 * The tunnel mound (spec 5.3 and 16.1): the `UNIT:DWARF:MOUND` raster for a
 * burrowed Mole and `UNIT:DWARF:MOUND_RIDER` for its rider, drawn where the
 * unit would stand (bottom-centred like a unit, 56 x 48), with the unit's
 * HP bar. The eruption ring is the outline of the Mole's eight tiles when
 * the mound is selected or hovered.
 */
export const DWARF_MOUND_V7 = {
  mole: "UNIT:DWARF:MOUND",
  rider: "UNIT:DWARF:MOUND_RIDER",
  /** The eight-tile outline: a dashed earth-light line inset 3 px. */
  eruptionRing: {
    colour: "#a07a52",
    alpha: 0.75,
    width: 2,
    dash: [6, 4],
    inset: 3,
    cornerRadius: 10,
  },
} as const;

/**
 * The eruption, the faction's "wow" moment (spec 5.4 and 16.1), as a
 * timeline in milliseconds from the surfacing. Sprites: `EFFECT:ERUPTION`
 * (the burst), `EFFECT:STEAM_PUFF` (the dust and steam). The ring over the
 * eight tiles is drawn from smaller copies of the burst, one per tile,
 * staggered clockwise from the north. Reduced motion shows the `peak`
 * frame only.
 */
export const DWARF_ERUPTION_TIMELINE_V7 = {
  /** The mound shakes by 1 px, then vanishes as the units return. */
  shake: { from: 0, to: 120, amplitude: 1 },
  surface: 120,
  /** The burst at the Mole's tile: scale, rise in px, alpha. */
  burst: {
    from: 120,
    to: 720,
    scaleFrom: 1.1,
    scaleTo: 2.3,
    rise: 14,
    alphaFrom: 1,
    /** Alpha holds until this share of the phase, then fades. */
    fadeFrom: 0.55,
    alphaTo: 0,
  },
  /** The ring: one burst per neighbour tile, `stagger` ms apart. */
  ring: {
    from: 180,
    duration: 420,
    stagger: 25,
    scaleFrom: 0.8,
    scaleTo: 1.25,
    rise: 8,
    alphaFrom: 0.95,
    fadeFrom: 0.5,
    alphaTo: 0,
  },
  /** A puff of dust and steam rising from the Mole's tile. */
  dust: { from: 220, to: 1000, scaleFrom: 1.2, scaleTo: 2.2, rise: 16 },
  /** Damage numbers and the victims' hit flash. */
  hit: 260,
  /** The whole board shakes by 1 px while the ground bursts. */
  boardShake: { from: 120, to: 300, amplitude: 1 },
  /** Field Defense in the ring collapses (Undermined). */
  undermine: 300,
  end: 1000,
  /** The single frame drawn for reduced motion. */
  peak: 360,
} as const;

/**
 * The bombing run (spec 6 and 16.1): the Gyrocopter flies over the target
 * and lands beyond it, then the bomb falls (spec 20.3 item 14).
 */
export const DWARF_BOMB_TIMELINE_V7 = {
  flight: { from: 0, to: 360 },
  /** The bomb falls from the flight path onto the target. */
  fall: { from: 360, to: 520, drop: 24 },
  /** `EFFECT:BOMB_BLAST` on the target, then a steam puff. */
  blast: { from: 520, to: 900, scaleFrom: 0.7, scaleTo: 1.2 },
  hit: 560,
  end: 900,
} as const;

/** An RGBA raster (straight alpha), row-major. */
export interface DwarfRasterV7 {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8ClampedArray;
}

const rgb = (hex: string): readonly [number, number, number] => [
  Number.parseInt(hex.slice(1, 3), 16),
  Number.parseInt(hex.slice(3, 5), 16),
  Number.parseInt(hex.slice(5, 7), 16),
];

/**
 * The Dig In wall's width as a share of the unit's ground-shadow width
 * (unit-shadows-v7.ts): the wall stands in front of the feet and the ready
 * ring still shows round its ends.
 */
export const DWARF_DIG_IN_WALL_SHARE_V7 = 1;
/**
 * Rows from the marker raster's bottom (the shadow's front edge) up to the
 * foot of the earth heaps behind the wall (about the shadow's centre).
 */
export const DWARF_DIG_IN_HEAP_RISE_V7 = 6;

/**
 * The Dig In marker (spec 8 and 16.1): piled earth and sandbags at the
 * unit's base, "this unit is dug in". Since bead pulp_wars-78i.9 it is a
 * parapet on the front half, not a ring: a ring of sandbags beside the
 * cream GROUND ready ring read as a double ring. It is drawn in two layers:
 * `front` (after the unit) is a short wall of separate sandbags, two
 * courses high in the middle and bowed back at its ends, on clods of earth,
 * in front of the unit's feet; `back` (before the unit) is two small heaps
 * of dug earth behind the ends of the wall. `width` is the wall's width in
 * master pixels (DWARF_DIG_IN_WALL_SHARE_V7 of the unit's shadow width);
 * the raster is `width` x `height`, centred on the shadow, and its bottom
 * row is the wall's lowest point: place it on the front edge of the unit's
 * ground shadow, so the ready ring's front arc still shows below the wall.
 */
export function dwarfDigInMarkerV7(width: number): {
  readonly back: DwarfRasterV7;
  readonly front: DwarfRasterV7;
  readonly height: number;
} {
  const bagWidth = 11;
  const bagHeight = 6;
  // Neighbouring bags share their outline column.
  const pitch = bagWidth - 1;
  // The upper course sits this far above the lower one.
  const course = 4;
  // The ends of the wall bow back (up the raster) this far.
  const bow = 2;
  const heapHeight = 4;
  // The wall leaves room at its ends for the heaps of earth.
  const lower = Math.max(2, Math.floor((width - 10) / pitch));
  const wallLeft = Math.floor((width - (lower * pitch + 1)) / 2);
  const middle = width / 2;
  /** How far a bag whose left edge is `left` bows back. */
  const bowAt = (left: number): number =>
    Math.round(bow * ((left + bagWidth / 2 - middle) / middle) ** 2);
  // Each bag's left edge and its rise above the raster's bottom row.
  const lowerBags = Array.from({ length: lower }, (_, index) => {
    const left = wallLeft + index * pitch;
    return { left, rise: bowAt(left) };
  });
  const upperBags = Array.from({ length: lower - 1 }, (_, index) => {
    const left = Math.round(wallLeft + pitch / 2 + index * pitch);
    return { left, rise: course + bowAt(left) };
  });
  const height = Math.max(
    bagHeight + Math.max(...lowerBags.map((entry) => entry.rise)),
    bagHeight + Math.max(...upperBags.map((entry) => entry.rise)),
    DWARF_DIG_IN_HEAP_RISE_V7 + heapHeight,
  );
  const back = new Uint8ClampedArray(width * height * 4);
  const front = new Uint8ClampedArray(width * height * 4);
  const colour = {
    outline: rgb(DWARF_PALETTE_V7.outline),
    earth: rgb(DWARF_PALETTE_V7.earth),
    earthDark: rgb(DWARF_PALETTE_V7.earthDark),
    earthLight: rgb(DWARF_PALETTE_V7.earthLight),
    bag: rgb(DWARF_PALETTE_V7.sandbag),
    bagShade: rgb(DWARF_PALETTE_V7.sandbagShade),
  };
  type Colour = keyof typeof colour;
  const backPaint = new Array<Colour | null>(width * height).fill(null);
  const frontPaint = new Array<Colour | null>(width * height).fill(null);
  const inside = (x: number, y: number): boolean =>
    x >= 0 && y >= 0 && x < width && y < height;
  /** A heap of earth (a half ellipse on `foot`), outlined where it is open. */
  const heap = (
    shape: (Colour | null)[],
    cx: number,
    foot: number,
    rx: number,
    ry: number,
  ): void => {
    const cells: [number, number][] = [];
    for (let y = foot - ry; y <= foot; y += 1)
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x += 1) {
        const dx = (x - cx) / (rx + 0.5);
        const dy = (foot - y) / (ry + 0.5);
        if (dx * dx + dy * dy <= 1 && inside(x, y)) cells.push([x, y]);
      }
    const filled = new Set(cells.map(([x, y]) => `${x},${y}`));
    const has = (x: number, y: number): boolean => filled.has(`${x},${y}`);
    for (const [x, y] of cells) {
      const open =
        !has(x - 1, y) || !has(x + 1, y) || !has(x, y - 1) || !has(x, y + 1);
      shape[y * width + x] = open
        ? "outline"
        : !has(x, y - 2)
          ? "earthLight"
          : (x + y) % 5 === 0
            ? "earthDark"
            : "earth";
    }
  };
  /** One sandbag: a pillow with rounded ends, shaded along its foot. */
  const bag = (left: number, top: number): void => {
    for (let dy = 0; dy < bagHeight; dy += 1) {
      // The rows next to the top and bottom edges are 1 px narrower, those
      // edges 2 px: the ends are round, the seams between bags notched.
      const rim = dy === 0 || dy === bagHeight - 1;
      const inset = rim ? 2 : dy === 1 || dy === bagHeight - 2 ? 1 : 0;
      for (let dx = inset; dx < bagWidth - inset; dx += 1) {
        const x = left + dx;
        const y = top + dy;
        if (!inside(x, y)) continue;
        frontPaint[y * width + x] =
          rim || dx === inset || dx === bagWidth - 1 - inset
            ? "outline"
            : dy === bagHeight - 2
              ? "bagShade"
              : "bag";
      }
    }
  };
  // Behind: two heaps of dug earth behind the ends of the wall.
  const heapFoot = height - 1 - DWARF_DIG_IN_HEAP_RISE_V7;
  heap(backPaint, 4, heapFoot, 5, heapHeight - 1);
  heap(backPaint, width - 5, heapFoot, 5, heapHeight - 1);
  // In front: clods of earth at the foot of the wall's ends, then the bags,
  // the ends first so the middle ones overlap them.
  heap(frontPaint, wallLeft, height - 2, 5, 3);
  heap(frontPaint, width - 1 - wallLeft, height - 2, 5, 3);
  const endsFirst = (
    left: { readonly left: number },
    right: { readonly left: number },
  ): number =>
    Math.abs(right.left + bagWidth / 2 - middle) -
    Math.abs(left.left + bagWidth / 2 - middle);
  for (const bags of [lowerBags, upperBags])
    for (const { left, rise } of [...bags].sort(endsFirst))
      bag(left, height - bagHeight - rise);
  // The wall wins where it meets the heaps behind it.
  for (let index = 0; index < width * height; index += 1)
    if (frontPaint[index] !== null) backPaint[index] = null;
  const paint = (
    target: Uint8ClampedArray,
    shape: readonly (Colour | null)[],
  ): void => {
    for (let index = 0; index < width * height; index += 1) {
      const name = shape[index];
      if (name === null || name === undefined) continue;
      const value = colour[name];
      target[index * 4] = value[0];
      target[index * 4 + 1] = value[1];
      target[index * 4 + 2] = value[2];
      target[index * 4 + 3] = 255;
    }
  };
  paint(back, backPaint);
  paint(front, frontPaint);
  return {
    back: { width, height, data: back },
    front: { width, height, data: front },
    height,
  };
}
