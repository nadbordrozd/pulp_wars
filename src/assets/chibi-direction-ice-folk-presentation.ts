/**
 * Presentation data of the Ice Folk production art (bead pulp_wars-7g3.5,
 * docs/art/factions/ICE_FOLK.md): pennant anchors, the palette for
 * code-drawn markers, and the code-drawn pieces the spec asks for: the
 * derived Snow overlay, the Witch's Blizzard, the Frozen marker, the rime
 * of an icebound ship, the Shatter window on the HP bar and the Shatter
 * timeline.
 *
 * It imports nothing, so the review script and the tests run it in Node and
 * the game can run it in the browser. The raster functions are pure: the
 * same input gives the same bytes. They return straight (not premultiplied)
 * RGBA in a Uint8ClampedArray, ready for `new ImageData(data, width)`; the
 * interface is expected to build each tile once per (edges, variant) and
 * cache it, as the Mountain fringe does.
 */

/** A straight-alpha RGBA raster. */
export interface IceFolkRasterV7 {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8ClampedArray;
}

/**
 * Pennant anchors of the Ice Folk cities, in the form of
 * DIRECTION_FLAG_ANCHORS_V7 (master pixels from the sprite's top-left
 * corner: the top of the pole; `pole` is the length drawn downward). Each
 * settlement has a bone pole of its own, so no pole is drawn: the pennant
 * flies from the pole's tip.
 */
export const ICE_FOLK_FLAG_ANCHORS_V7: Readonly<
  Record<
    string,
    { readonly x: number; readonly y: number; readonly pole: number }
  >
> = {
  // The tip of the bone pole right of the igloo.
  "chibi-direction-ice-folk-city-1": { x: 64.5, y: 22, pole: 0 },
  // The forked tip of the bone pole at the right corner of the snow wall.
  "chibi-direction-ice-folk-city-2": { x: 79.5, y: 39, pole: 0 },
  // The knob on the tall bone pole right of the great hall.
  "chibi-direction-ice-folk-city-3": { x: 75, y: 26, pole: 0 },
};

/** The faction's colours for code-drawn markers, overlays and effects. */
export const ICE_FOLK_PALETTE_V7 = {
  /** The accent, lit (the `ice-folk-blue` accent step, measured). */
  ice: "#37b1fa",
  /** Glow and the Shatter window of the HP bar. */
  iceGlow: "#7fcbff",
  /** The palest ice, a casing's rim. */
  icePale: "#d6f0ff",
  /** Shade and outline of ice shapes. */
  iceDark: "#145a9c",
  /** The darkest outline of a marker. */
  outline: "#0e1c30",
  /** Snow: the wash and the drifts of the Snow overlay. */
  snow: "#f5f8fc",
  /** The shade under a drift, and the Blizzard flakes' shadow. */
  snowShade: "#bccbdd",
  /** The rim where Snow ends at a territory edge. */
  snowRim: "#9aaec7",
  /** Fur, lit and shaded (measured on the masters). */
  fur: "#ddd9c1",
  furShade: "#8d8273",
  /** The beasts' faces, hands and feet. */
  slate: "#3b4352",
  /** The Ice Witch's robe. */
  navy: "#1b2552",
} as const;

// ------------------------------------------------------------------ hash

/** A small deterministic integer hash (no Math.random anywhere). */
export function iceFolkHashV7(...values: readonly number[]): number {
  let h = 0x811c9dc5;
  for (const value of values) {
    h ^= value & 0xffff;
    h = Math.imul(h, 0x01000193) >>> 0;
    h ^= value >>> 16;
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  h ^= h >>> 13;
  h = Math.imul(h, 0x5bd1e995) >>> 0;
  return (h ^ (h >>> 15)) >>> 0;
}

const unit = (...values: readonly number[]): number =>
  iceFolkHashV7(...values) / 0x100000000;

const rgb = (hex: string): readonly [number, number, number] => [
  Number.parseInt(hex.slice(1, 3), 16),
  Number.parseInt(hex.slice(3, 5), 16),
  Number.parseInt(hex.slice(5, 7), 16),
];

/** Straight-alpha "over" of one colour onto one pixel of `data`. */
function paint(
  data: Uint8ClampedArray,
  index: number,
  colour: readonly [number, number, number],
  alpha: number,
): void {
  if (alpha <= 0) return;
  const o = index * 4;
  const below = (data[o + 3] ?? 0) / 255;
  const out = alpha + below * (1 - alpha);
  if (out <= 0) return;
  for (let channel = 0; channel < 3; channel += 1)
    data[o + channel] = Math.round(
      ((colour[channel] ?? 0) * alpha +
        (data[o + channel] ?? 0) * below * (1 - alpha)) /
        out,
    );
  data[o + 3] = Math.round(out * 255);
}

// ------------------------------------------------------------ Snow overlay

/**
 * The Snow overlay (spec 13.1): drawn on every explored land tile whose
 * view flag `snow` is true, over the terrain ground and under Roads,
 * improvements, resources, tall terrain bodies and units.
 *
 * - A soft white wash at `washAlpha`: Grass turns a pale sage white, Forest
 *   ground white under its green trees, Mountain rock whiter: each terrain
 *   keeps its own hue and texture beneath.
 * - A few drifts per tile (low white lenses with a blue-grey shade under
 *   them) and a sparse sparkle, at hashed positions at least `margin` px
 *   from the edges, so tiles join with no seam.
 * - Where a neighbour is not Snow (a territory edge, water, an unexplored
 *   cell), the wash ends on a ragged cut 2 to 5 px inside the edge with a
 *   1 px `snowRim` bank, so the Snow ends cleanly. Edges against another
 *   Snow tile are never cut.
 * - Tall terrain bodies (trees, peaks) get snow caps from
 *   iceFolkSnowCapsV7, drawn over the body.
 */
export const ICE_FOLK_SNOW_OVERLAY_V7 = {
  tile: 80,
  washAlpha: 0.42,
  drifts: 3,
  sparkles: 10,
  margin: 7,
  /** The cut at an exposed edge: from `cutMin` to `cutMax` px deep. */
  cutMin: 2,
  cutMax: 5,
  rimAlpha: 0.75,
  /** Distinct tiles per edge set; pick one by iceFolkSnowVariantV7. */
  variants: 4,
  /** Snow caps on tall terrain bodies: rows from the top of each shape. */
  capDepth: 3,
  capAlpha: 0.85,
} as const;

export interface IceFolkSnowEdgesV7 {
  /** True where the neighbour on that side is not Snow. */
  readonly north: boolean;
  readonly east: boolean;
  readonly south: boolean;
  readonly west: boolean;
}

/** The overlay variant of a cell, so neighbouring cells differ. */
export function iceFolkSnowVariantV7(at: {
  readonly x: number;
  readonly y: number;
}): number {
  return iceFolkHashV7(at.x, at.y, 7) % ICE_FOLK_SNOW_OVERLAY_V7.variants;
}

/** The depth of the cut at position `t` (0..79) along one exposed edge. */
function cutDepth(variant: number, side: number, t: number): number {
  const { cutMin, cutMax } = ICE_FOLK_SNOW_OVERLAY_V7;
  // A smooth ragged profile: three hashed waves, the same at both ends so
  // a cut continues across cell boundaries (the Mountain fringe's rule).
  const ends = Math.sin((Math.PI * t) / 79);
  let wave = 0;
  for (let k = 1; k <= 3; k += 1)
    wave +=
      Math.sin((Math.PI * k * 2 * t) / 79 + unit(variant, side, k) * 6.283) / k;
  const mid = (cutMin + cutMax) / 2;
  return Math.round(mid + ends * wave * ((cutMax - cutMin) / 2) * 0.9);
}

/** One 80 x 80 Snow overlay tile for a set of exposed edges. */
export function iceFolkSnowTileV7(
  edges: IceFolkSnowEdgesV7,
  variant: number,
): IceFolkRasterV7 {
  const spec = ICE_FOLK_SNOW_OVERLAY_V7;
  const size = spec.tile;
  const data = new Uint8ClampedArray(size * size * 4);
  const snow = rgb(ICE_FOLK_PALETTE_V7.snow);
  const shade = rgb(ICE_FOLK_PALETTE_V7.snowShade);
  const rim = rgb(ICE_FOLK_PALETTE_V7.snowRim);
  const sides: readonly [boolean, number][] = [
    [edges.north, 0],
    [edges.east, 1],
    [edges.south, 2],
    [edges.west, 3],
  ];
  /** How far inside the snow a pixel is, from every exposed edge (-1: cut). */
  const inside = (x: number, y: number): number => {
    let least = Number.POSITIVE_INFINITY;
    for (const [exposed, side] of sides) {
      if (!exposed) continue;
      const distance =
        side === 0
          ? y
          : side === 1
            ? size - 1 - x
            : side === 2
              ? size - 1 - y
              : x;
      const along = side === 0 || side === 2 ? x : y;
      least = Math.min(least, distance - cutDepth(variant, side, along));
    }
    return least;
  };
  for (let y = 0; y < size; y += 1)
    for (let x = 0; x < size; x += 1) {
      const depth = inside(x, y);
      if (depth < 0) continue;
      const index = y * size + x;
      if (depth < 1) paint(data, index, rim, spec.rimAlpha);
      else paint(data, index, snow, spec.washAlpha);
    }
  // Drifts: low lenses, white on top with a shade line under them.
  for (let drift = 0; drift < spec.drifts; drift += 1) {
    const rx = 6 + Math.floor(unit(variant, drift, 1) * 6);
    const ry = 2 + Math.floor(unit(variant, drift, 2) * 2);
    const cx =
      spec.margin +
      rx +
      Math.floor(unit(variant, drift, 3) * (size - 2 * (spec.margin + rx)));
    const cy =
      spec.margin +
      ry +
      1 +
      Math.floor(
        ((drift + unit(variant, drift, 4)) / spec.drifts) *
          (size - 2 * (spec.margin + ry + 1)),
      );
    for (let y = cy - ry - 1; y <= cy + ry + 1; y += 1)
      for (let x = cx - rx; x <= cx + rx; x += 1) {
        if (inside(x, y) < 2) continue;
        const dx = (x - cx) / (rx + 0.5);
        const dy = (y - cy) / (ry + 0.5);
        const r = dx * dx + dy * dy;
        const index = y * size + x;
        if (
          y > cy &&
          r <= 1 &&
          (y - cy) / (ry + 0.5) > Math.sqrt(1 - dx * dx) - 0.45
        )
          paint(data, index, shade, 0.6);
        else if (r <= 1) paint(data, index, snow, 0.82);
      }
  }
  // Sparkles: single brighter pixels.
  for (let sparkle = 0; sparkle < spec.sparkles; sparkle += 1) {
    const x =
      spec.margin +
      Math.floor(unit(variant, sparkle, 11) * (size - 2 * spec.margin));
    const y =
      spec.margin +
      Math.floor(unit(variant, sparkle, 12) * (size - 2 * spec.margin));
    if (inside(x, y) >= 2) paint(data, y * size + x, [255, 255, 255], 0.9);
  }
  return { width: size, height: size, data };
}

/**
 * Snow caps or rime: the top `depth` opaque pixels of each column of every
 * shape of `body` (a pixel whose `depth` pixels above include a transparent
 * one), as a layer of the same size to draw over it. Tall terrain bodies
 * get snow caps with it; an icebound ship gets a thin rime (depth 2, ice
 * pale, lower alpha).
 */
export function iceFolkSnowCapsV7(
  body: {
    readonly width: number;
    readonly height: number;
    readonly data: ArrayLike<number>;
  },
  options: {
    readonly depth?: number;
    readonly colour?: string;
    readonly alpha?: number;
  } = {},
): IceFolkRasterV7 {
  const depth = options.depth ?? ICE_FOLK_SNOW_OVERLAY_V7.capDepth;
  const colour = rgb(options.colour ?? ICE_FOLK_PALETTE_V7.snow);
  const alpha = options.alpha ?? ICE_FOLK_SNOW_OVERLAY_V7.capAlpha;
  const { width, height } = body;
  const data = new Uint8ClampedArray(width * height * 4);
  const opaque = (x: number, y: number): boolean =>
    y >= 0 && (body.data[(y * width + x) * 4 + 3] ?? 0) >= 128;
  for (let x = 0; x < width; x += 1)
    for (let y = 0; y < height; y += 1) {
      if (!opaque(x, y)) continue;
      // Skip the outline: a dark pixel stays dark.
      const o = (y * width + x) * 4;
      const value = Math.max(
        body.data[o] ?? 0,
        body.data[o + 1] ?? 0,
        body.data[o + 2] ?? 0,
      );
      if (value < 40) continue;
      let top = false;
      for (let k = 1; k <= depth + 1 && !top; k += 1)
        if (!opaque(x, y - k)) top = true;
      if (!top) continue;
      paint(data, y * width + x, colour, alpha);
    }
  return { width, height, data };
}

// ------------------------------------------------------------- Blizzard

/**
 * The Blizzard (spec 13.1): falling snow over every explored tile whose
 * flag `blizzard` is true, water included, over the Snow overlay and the
 * terrain and under units' plates; calm, not a storm. The selected or
 * hovered Witch adds the outline of her nine tiles (`ring`).
 */
export const ICE_FOLK_BLIZZARD_V7 = {
  flakesPerTile: 9,
  /** Fall speed and sideways drift in CSS px per second at zoom 1. */
  fallPxPerSecond: 14,
  driftPxPerSecond: -5,
  swayPx: 2,
  flakeAlpha: 0.9,
  /** The outline of the nine tiles: inset, dash and alpha. */
  ring: {
    insetPx: 3,
    dashPx: 6,
    gapPx: 4,
    widthPx: 2,
    alpha: 0.55,
    radiusPx: 10,
  },
  /** A faint white veil over the whole aura. */
  veilAlpha: 0.08,
} as const;

export interface IceFolkFlakeV7 {
  /** Position in the cell, CSS px at zoom 1 (0..80). */
  readonly x: number;
  readonly y: number;
  /** 1 (a dot) or 2 (a 2 x 2 flake with a shade pixel under it). */
  readonly size: 1 | 2;
  readonly alpha: number;
}

/**
 * The flakes of one Blizzard cell at `timeMs`: deterministic, so a paused
 * frame, a reduced-motion frame (time 0) and a review capture are stable.
 * Positions wrap inside the cell, so the snow is continuous across the nine
 * tiles.
 */
export function iceFolkBlizzardFlakesV7(
  at: { readonly x: number; readonly y: number },
  timeMs: number,
): readonly IceFolkFlakeV7[] {
  const spec = ICE_FOLK_BLIZZARD_V7;
  const seconds = timeMs / 1000;
  const flakes: IceFolkFlakeV7[] = [];
  for (let flake = 0; flake < spec.flakesPerTile; flake += 1) {
    const speed = 0.7 + unit(at.x, at.y, flake, 1) * 0.6;
    const y0 = unit(at.x, at.y, flake, 2) * 80;
    const x0 = unit(at.x, at.y, flake, 3) * 80;
    const phase = unit(at.x, at.y, flake, 4) * 6.283;
    const y = (((y0 + seconds * spec.fallPxPerSecond * speed) % 80) + 80) % 80;
    const x =
      (((x0 +
        seconds * spec.driftPxPerSecond * speed +
        Math.sin(seconds * 1.7 + phase) * spec.swayPx) %
        80) +
        80) %
      80;
    flakes.push({
      x: Math.round(x),
      y: Math.round(y),
      size: unit(at.x, at.y, flake, 5) < 0.45 ? 2 : 1,
      alpha: spec.flakeAlpha * (0.7 + unit(at.x, at.y, flake, 6) * 0.3),
    });
  }
  return flakes;
}

// ----------------------------------------------------------- Frozen marker

/**
 * The Frozen marker (spec 13.1; Ice Folk Freeze, bead `pulp_wars-w49.38`),
 * code-drawn on units of any faction:
 *
 * - **Frozen**: the unit cased in ice to the waist. The casing covers the
 *   sprite's silhouette, widened by `spreadPx`, from its lowest pixel up to
 *   `heightShare` of its height: an `iceGlow` fill at `fillAlpha`, a 1 px
 *   `icePale` rim along its top and sides, an `iceDark` outline round it
 *   and two white glints. Heavy on purpose. The `ICON:STATUS:FROZEN` ice
 *   cube sits in the status slot (`glyphPx` at zoom step 1), with the turns
 *   left beside it when the unit stays Frozen through more than one of its
 *   owner's turns.
 * - **Rime**: a 2 px `icePale` line on the top edges of a sprite
 *   (iceFolkSnowCapsV7 with depth 2), drawn on an icebound ship (the frozen
 *   sea). The older light frost markers are gone (Ice Folk Freeze).
 */
export const ICE_FOLK_FROZEN_MARKER_V7 = {
  frozen: { heightShare: 0.45, spreadPx: 2, fillAlpha: 0.5, rimAlpha: 0.95 },
  rime: { depth: 2, alpha: 0.85 },
  glyph: { glyphPx: 16 },
  /** The HP bar of a Frozen unit: its lowest {threshold} HP in this tint. */
  shatterWindow: { colour: ICE_FOLK_PALETTE_V7.iceGlow, edge: "#ffffff" },
} as const;

/**
 * The Frozen casing for one sprite, as a layer of the sprite's size (with
 * `spreadPx` of margin on every side; draw it at the sprite's position
 * minus the margin).
 */
export function iceFolkFrozenCasingV7(
  sprite: {
    readonly width: number;
    readonly height: number;
    readonly data: ArrayLike<number>;
  },
  heightShare: number = ICE_FOLK_FROZEN_MARKER_V7.frozen.heightShare,
): IceFolkRasterV7 {
  const spec = ICE_FOLK_FROZEN_MARKER_V7.frozen;
  const m = spec.spreadPx + 1;
  const width = sprite.width + 2 * m;
  const height = sprite.height + 2 * m;
  const solid = new Uint8Array(width * height);
  let top = sprite.height;
  let bottom = -1;
  for (let y = 0; y < sprite.height; y += 1)
    for (let x = 0; x < sprite.width; x += 1)
      if ((sprite.data[(y * sprite.width + x) * 4 + 3] ?? 0) >= 128) {
        top = Math.min(top, y);
        bottom = Math.max(bottom, y);
      }
  const data = new Uint8ClampedArray(width * height * 4);
  if (bottom < 0) return { width, height, data };
  const casingTop = Math.round(bottom - (bottom - top + 1) * heightShare) + m;
  // The silhouette below the casing line, widened by spreadPx.
  for (let y = 0; y < sprite.height; y += 1)
    for (let x = 0; x < sprite.width; x += 1) {
      if ((sprite.data[(y * sprite.width + x) * 4 + 3] ?? 0) < 128) continue;
      for (let dy = -spec.spreadPx; dy <= spec.spreadPx; dy += 1)
        for (let dx = -spec.spreadPx; dx <= spec.spreadPx; dx += 1) {
          const ty = y + m + dy;
          const tx = x + m + dx;
          if (ty < casingTop || ty > bottom + m) continue;
          solid[ty * width + tx] = 1;
        }
    }
  const filled = (x: number, y: number): boolean =>
    x >= 0 && y >= 0 && x < width && y < height && solid[y * width + x] === 1;
  const glow = rgb(ICE_FOLK_PALETTE_V7.iceGlow);
  const pale = rgb(ICE_FOLK_PALETTE_V7.icePale);
  const dark = rgb(ICE_FOLK_PALETTE_V7.iceDark);
  for (let y = 0; y < height; y += 1)
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      if (filled(x, y)) {
        const edgeTop = !filled(x, y - 1);
        const edgeSide = !filled(x - 1, y) || !filled(x + 1, y);
        paint(data, index, glow, spec.fillAlpha);
        if (edgeTop || edgeSide) paint(data, index, pale, spec.rimAlpha);
      } else if (
        filled(x - 1, y) ||
        filled(x + 1, y) ||
        filled(x, y - 1) ||
        filled(x, y + 1)
      )
        paint(data, index, dark, 1);
    }
  // Two white glints: short diagonal strokes on the casing's left half.
  const glints = [
    [0.3, 0.35],
    [0.42, 0.6],
  ] as const;
  for (const [fx, fy] of glints) {
    const gx = Math.round(m + sprite.width * fx);
    const gy = Math.round(casingTop + (bottom + m - casingTop) * fy);
    for (let k = 0; k < 3; k += 1)
      if (filled(gx + k, gy - k))
        paint(data, (gy - k) * width + gx + k, [255, 255, 255], 0.9);
  }
  return { width, height, data };
}

// -------------------------------------------------------------- Shatter

/**
 * The Shatter effect (spec 13.1): the unit turns to ice and bursts into
 * shards that melt away; no body, no Grave, no explosion. Times in ms from
 * the hit; the effect sprites are `EFFECT:SHATTER` (the burst) and
 * `EFFECT:SHATTER_SHARDS` (the loose shards).
 */
export const ICE_FOLK_SHATTER_TIMELINE_V7 = [
  {
    fromMs: 0,
    toMs: 140,
    step: "FREEZE",
    note: "the sprite is cased in ice to the top (iceFolkFrozenCasingV7, heightShare 1)",
  },
  {
    fromMs: 140,
    toMs: 220,
    step: "CRACK",
    note: "three white crack lines over the casing; the sprite shakes 1 px",
  },
  {
    fromMs: 220,
    toMs: 520,
    step: "BURST",
    note: "the sprite is gone; EFFECT:SHATTER at the unit's centre, scale 0.7 to 1.25, alpha 1 to 0.5",
  },
  {
    fromMs: 300,
    toMs: 950,
    step: "SHARDS",
    note: "EFFECT:SHATTER_SHARDS, scale 1 to 1.7, falling 8 px, alpha 1 to 0 (melting)",
  },
] as const;
