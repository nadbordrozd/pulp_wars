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
 * The Dig In marker (spec 8 and 16.1): a low ring of piled earth and
 * sandbags at the unit's base, "this unit is dug in". It is drawn in two
 * layers: `back` (a bank of piled earth behind the unit) before the unit,
 * and `front` (a low wall of sandbags on a bank of earth in front of it)
 * after it, so the unit stands inside the earthwork. `width` is the ring's
 * outer width in master pixels (the unit canvas width minus 8: 48 for a
 * 56 px unit, 64 for 72, 80 for 88); the raster is `width` x `height`, the
 * ring's centre is its middle, and its bottom row is the earthwork's
 * lowest point (place it on the unit's foot line).
 */
export function dwarfDigInMarkerV7(width: number): {
  readonly back: DwarfRasterV7;
  readonly front: DwarfRasterV7;
  readonly height: number;
} {
  const rx = Math.floor(width / 2) - 1;
  const ry = Math.max(5, Math.round(rx * 0.38));
  const wall = 6;
  const bagWidth = 8;
  const height = ry * 2 + wall + 3;
  const cx = (width - 1) / 2;
  const cy = height - ry - 2;
  const back = new Uint8ClampedArray(width * height * 4);
  const front = new Uint8ClampedArray(width * height * 4);
  const colour = {
    earth: rgb(DWARF_PALETTE_V7.earth),
    earthDark: rgb(DWARF_PALETTE_V7.earthDark),
    earthLight: rgb(DWARF_PALETTE_V7.earthLight),
    bag: rgb(DWARF_PALETTE_V7.sandbag),
    bagShade: rgb(DWARF_PALETTE_V7.sandbagShade),
  };
  type Colour = keyof typeof colour;
  const backPaint = new Array<Colour | null>(width * height).fill(null);
  const frontPaint = new Array<Colour | null>(width * height).fill(null);
  for (let x = 0; x < width; x += 1) {
    const dx = (x - cx) / rx;
    if (Math.abs(dx) > 1) continue;
    const half = ry * Math.sqrt(1 - dx * dx);
    // The far bank: a ridge of earth 3 px high on the back arc.
    const far = Math.round(cy - half);
    for (let y = far - 3; y <= far; y += 1)
      if (y >= 0)
        backPaint[y * width + x] = y === far - 3 ? "earthLight" : "earth";
    // The near wall: sandbags stacked on the front arc, lumpy on top.
    const near = Math.round(cy + half);
    const slot = (x + Math.round(rx)) % bagWidth;
    const seam = slot === 0;
    const lump = Math.round(Math.sin((Math.PI * slot) / bagWidth) * 2);
    const top = near - (wall - 2) - lump;
    for (let y = top; y <= near + 1 && y < height; y += 1) {
      if (y < 0) continue;
      const fromTop = y - top;
      frontPaint[y * width + x] =
        y >= near
          ? "earthDark"
          : seam
            ? "bagShade"
            : fromTop === 0
              ? "bag"
              : y >= near - 1
                ? "bagShade"
                : "bag";
    }
    // Earth spilling at the ends of the wall, where it meets the far bank.
    if (Math.abs(dx) > 0.85)
      for (let y = Math.round(cy - 2); y <= Math.round(cy + 2); y += 1)
        if (
          frontPaint[y * width + x] === null &&
          backPaint[y * width + x] === null
        )
          frontPaint[y * width + x] = "earth";
  }
  // The near wall wins where the two meet at the ends of the ring.
  for (let index = 0; index < width * height; index += 1)
    if (frontPaint[index] !== null) backPaint[index] = null;
  // Paint, with a 1 px dark outline round each layer's shape.
  const paint = (
    target: Uint8ClampedArray,
    shape: readonly (Colour | null)[],
  ): void => {
    const outline = rgb(DWARF_PALETTE_V7.outline);
    const filled = (x: number, y: number): boolean =>
      x >= 0 &&
      y >= 0 &&
      x < width &&
      y < height &&
      shape[y * width + x] !== null;
    for (let y = 0; y < height; y += 1)
      for (let x = 0; x < width; x += 1) {
        const offset = (y * width + x) * 4;
        const name = shape[y * width + x];
        let value: readonly [number, number, number] | null = null;
        if (name !== null && name !== undefined) {
          const edge =
            !filled(x - 1, y) ||
            !filled(x + 1, y) ||
            !filled(x, y - 1) ||
            !filled(x, y + 1);
          value = edge ? outline : colour[name];
        }
        if (value === null) continue;
        target[offset] = value[0];
        target[offset + 1] = value[1];
        target[offset + 2] = value[2];
        target[offset + 3] = 255;
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
