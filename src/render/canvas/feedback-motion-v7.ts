/**
 * Bead pulp_wars-2yc.29: the timings, caps and paths of the feedback
 * animations (Coins flying to the counter, population hopping to its city,
 * the city and Promotion hops, the Promotion marker and the ready chevron).
 * Pure numbers: nothing here reads a clock, a canvas or the game.
 */
export interface FeedbackPointV7 {
  readonly x: number;
  readonly y: number;
}

// --- Coins ---------------------------------------------------------------

/** The coin's small hop up out of its tile, growing as it rises. */
export const COIN_POP_MS_V7 = 300;
/** The toss from the tile to the counter: longer for a longer way. */
export const COIN_FLIGHT_MIN_MS_V7 = 1_000;
export const COIN_FLIGHT_MAX_MS_V7 = 1_300;
/** Between two coins of one source: they follow one another in a stream. */
export const COIN_STAGGER_MS_V7 = 125;
/** Between the first coins of two sources of one launch. */
export const COIN_SOURCE_STAGGER_MS_V7 = 70;
/** The longest the sources of one launch spread their first coins over. */
export const COIN_SOURCE_STAGGER_SPAN_MS_V7 = 900;
/** Coin sprites on screen at once, over every source. */
export const COIN_SPRITE_CAP_V7 = 24;
/** Coin sprites one source launches at most. */
export const COIN_SPRITES_PER_SOURCE_V7 = 5;
/** How high (CSS px) a coin hops out of its tile before it is tossed. */
export const COIN_HOP_CSS_PX_V7 = 16;
/** How far outside the board's edge an off-screen source's coins start. */
export const COIN_EDGE_MARGIN_CSS_PX_V7 = 18;
/** The counter's soft pulse when a coin lands. */
export const COUNTER_PULSE_MS_V7 = 280;
/**
 * The top of the toss above the straight line: a third of the way, never
 * under 70 nor over 220 CSS px; each coin of a burst then takes its own
 * share of that (never under the 70), so a burst fans out.
 */
export const COIN_ARC_SHARE_V7 = 0.33;
export const COIN_ARC_FAN_V7 = [0.8, 1, 0.9] as const;
export const COIN_ARC_MIN_CSS_PX_V7 = 70;
export const COIN_ARC_MAX_CSS_PX_V7 = 220;
/** How far along the way the curve is pulled up: its top is at 43%. */
export const COIN_ARC_CONTROL_ALONG_V7 = 0.36;

/** Slow at both ends, fastest in the middle. */
export function easeInOutCubicV7(progress: number): number {
  const t = Math.min(1, Math.max(0, progress));
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/** Fast out, settling: the pop of a coin and of a marker. */
export function easeOutBackV7(progress: number): number {
  const t = Math.min(1, Math.max(0, progress));
  const overshoot = 1.70158;
  return 1 + (overshoot + 1) * Math.pow(t - 1, 3) + overshoot * (t - 1) ** 2;
}

/** How many coin sprites show `amount` Coins from one source. */
export function coinSpritesForAmountV7(amount: number): number {
  if (!(amount >= 1)) return 0;
  if (amount <= 3) return Math.floor(amount);
  return amount <= 7 ? 4 : COIN_SPRITES_PER_SOURCE_V7;
}

export interface CoinSpritePlanV7 {
  /** Index of the gain (source) this sprite flies from. */
  readonly source: number;
  /** Coins the counter gains when this sprite lands; at least 1. */
  readonly value: number;
}

/**
 * The sprites of one launch: a few per source in proportion to its Coins,
 * never more than `available` in all. When the sources ask for more, every
 * source keeps one sprite while there is room and the largest give up
 * theirs first; a source left without a sprite adds its Coins to the last
 * sprite. The values always add up to the Coins gained, so the counter
 * lands on the true value.
 */
export function coinSpritePlanV7(
  amounts: readonly number[],
  available: number = COIN_SPRITE_CAP_V7,
): readonly CoinSpritePlanV7[] {
  const room = Math.max(0, Math.floor(available));
  const wanted = amounts.map((amount) => coinSpritesForAmountV7(amount));
  let total = wanted.reduce((sum, count) => sum + count, 0);
  if (room === 0 || total === 0) return [];
  while (total > room) {
    let widest = -1;
    for (let index = 0; index < wanted.length; index += 1)
      if (
        (wanted[index] ?? 0) > 1 &&
        (wanted[index] ?? 0) > (wanted[widest] ?? 1)
      )
        widest = index;
    if (widest === -1) break;
    wanted[widest] = (wanted[widest] ?? 0) - 1;
    total -= 1;
  }
  // More sources than sprites: the smallest sources go without.
  if (total > room) {
    const order = wanted
      .map((count, index) => ({ count, index, amount: amounts[index] ?? 0 }))
      .filter((entry) => entry.count > 0)
      .sort(
        (left, right) => left.amount - right.amount || right.index - left.index,
      );
    for (const entry of order) {
      if (total <= room) break;
      wanted[entry.index] = 0;
      total -= 1;
    }
  }
  const sprites: CoinSpritePlanV7[] = [];
  let orphaned = 0;
  amounts.forEach((amount, source) => {
    const count = wanted[source] ?? 0;
    const coins = Math.max(0, Math.floor(amount));
    if (count === 0) {
      orphaned += coins;
      return;
    }
    const share = Math.floor(coins / count);
    let extra = coins - share * count;
    for (let index = 0; index < count; index += 1) {
      sprites.push({ source, value: share + (extra > 0 ? 1 : 0) });
      extra -= 1;
    }
  });
  const last = sprites.at(-1);
  if (last !== undefined && orphaned > 0)
    sprites[sprites.length - 1] = { ...last, value: last.value + orphaned };
  return sprites;
}

/**
 * When a coin starts after its launch: the sources of a launch begin a
 * moment apart (never spread over more than
 * COIN_SOURCE_STAGGER_SPAN_MS_V7), and the coins of one source follow one
 * another COIN_STAGGER_MS_V7 apart, so each is seen on its own.
 */
export function coinStartDelayMsV7(
  sourceRank: number,
  sourceCount: number,
  order: number,
): number {
  const between =
    sourceCount <= 1
      ? 0
      : Math.min(
          COIN_SOURCE_STAGGER_MS_V7,
          COIN_SOURCE_STAGGER_SPAN_MS_V7 / (sourceCount - 1),
        );
  return sourceRank * between + order * COIN_STAGGER_MS_V7;
}

/** How long the toss takes over `distance` CSS px. */
export function coinFlightMsV7(distance: number): number {
  return Math.min(
    COIN_FLIGHT_MAX_MS_V7,
    Math.max(COIN_FLIGHT_MIN_MS_V7, 1_000 + (distance - 250) * 0.4),
  );
}

/** The top of the `variant`-th coin's toss above the straight line. */
export function coinArcHeightV7(distance: number, variant = 0): number {
  const fan =
    COIN_ARC_FAN_V7[Math.abs(Math.trunc(variant)) % COIN_ARC_FAN_V7.length] ??
    1;
  const whole = Math.min(
    COIN_ARC_MAX_CSS_PX_V7,
    Math.max(COIN_ARC_MIN_CSS_PX_V7, distance * COIN_ARC_SHARE_V7),
  );
  return Math.max(COIN_ARC_MIN_CSS_PX_V7, whole * fan);
}

/**
 * How far along its curve a coin is at `progress` of its flight: it leaves
 * and arrives at about a third of its mean speed and is fastest midway, so
 * it neither jerks away nor snaps into the counter. Strictly increasing.
 */
export function coinPathProgressV7(progress: number): number {
  const t = Math.min(1, Math.max(0, progress));
  return 0.35 * t + 0.65 * t * t * (3 - 2 * t);
}

/**
 * Where an off-screen source's coins enter: the nearest point of the board's
 * frame, a margin outside it, so they fly in from the edge in the source's
 * direction. A point inside the frame is returned as it is.
 */
export function coinEntryPointV7(
  source: FeedbackPointV7,
  frame: {
    readonly left: number;
    readonly top: number;
    readonly right: number;
    readonly bottom: number;
  },
  margin: number = COIN_EDGE_MARGIN_CSS_PX_V7,
): { readonly point: FeedbackPointV7; readonly offscreen: boolean } {
  const x = Math.min(
    frame.right + margin,
    Math.max(frame.left - margin, source.x),
  );
  const y = Math.min(
    frame.bottom + margin,
    Math.max(frame.top - margin, source.y),
  );
  const offscreen =
    source.x < frame.left ||
    source.x > frame.right ||
    source.y < frame.top ||
    source.y > frame.bottom;
  return { point: offscreen ? { x, y } : source, offscreen };
}

/** The area a coin's toss must stay inside (the flight layer). */
export interface CoinBoundsV7 {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

/**
 * The control point of a coin's toss. The curve is a parabola (a quadratic
 * curve) that leaves the straight line by `coinArcHeightV7` and comes back
 * into the counter; its top is 43% of the way. It bows upward, and for a
 * way that is nearly straight up it bows to the right, so the path never
 * collapses into a line. With `bounds`, a toss whose top would leave them
 * (a city close under the top of the screen) is kept lower, and where
 * less than the least arc fits on that side it bows to the other side
 * instead, so the coin is never lost from view.
 */
export function coinArcControlV7(
  from: FeedbackPointV7,
  to: FeedbackPointV7,
  variant = 0,
  bounds?: CoinBoundsV7,
): FeedbackPointV7 {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const distance = Math.hypot(dx, dy);
  const height = coinArcHeightV7(distance, variant);
  if (distance < 1) return { x: from.x, y: from.y - height * 2 };
  let nx = dy / distance;
  let ny = -dx / distance;
  if (nx * 0.35 - ny < 0) {
    nx = -nx;
    ny = -ny;
  }
  // A quadratic curve reaches half its control offset, hence twice.
  const control = (side: 1 | -1, top: number): FeedbackPointV7 => ({
    x: from.x + dx * COIN_ARC_CONTROL_ALONG_V7 + side * nx * top * 2,
    y: from.y + dy * COIN_ARC_CONTROL_ALONG_V7 + side * ny * top * 2,
  });
  if (bounds === undefined) return control(1, height);
  // The area the curve may use: the bounds, and both ends wherever they
  // are (a coin entering from an off-screen source starts outside).
  const left = Math.min(bounds.left, from.x, to.x);
  const right = Math.max(bounds.right, from.x, to.x);
  const top = Math.min(bounds.top, from.y, to.y);
  const bottom = Math.max(bounds.bottom, from.y, to.y);
  const inside = (side: 1 | -1, bow: number): boolean => {
    const point = control(side, bow);
    for (let step = 1; step < 12; step += 1) {
      const at = parabolaPointV7(from, point, to, step / 12);
      if (at.x < left || at.x > right || at.y < top || at.y > bottom)
        return false;
    }
    return true;
  };
  /** The highest bow up to `most` that keeps the whole curve inside. */
  const fit = (side: 1 | -1, most: number): number => {
    if (inside(side, most)) return most;
    let low = 0;
    let high = most;
    for (let pass = 0; pass < 9; pass += 1) {
      const mid = (low + high) / 2;
      if (inside(side, mid)) low = mid;
      else high = mid;
    }
    return low;
  };
  // Where the bounds cut the arc short, the coins of a burst still fan.
  const fan = 1 - 0.11 * (Math.abs(Math.trunc(variant)) % 3);
  const up = fit(1, height);
  if (up >= COIN_ARC_MIN_CSS_PX_V7)
    return control(1, up < height ? up * fan : up);
  const down = fit(-1, height);
  return down > up
    ? control(-1, down < height ? down * fan : down)
    : control(1, up * fan);
}

/** A point of the parabola through `from` and `to` bent toward `control`. */
export function parabolaPointV7(
  from: FeedbackPointV7,
  control: FeedbackPointV7,
  to: FeedbackPointV7,
  s: number,
): FeedbackPointV7 {
  const t = Math.min(1, Math.max(0, s));
  const a = (1 - t) * (1 - t);
  const b = 2 * t * (1 - t);
  const c = t * t;
  return {
    x: a * from.x + b * control.x + c * to.x,
    y: a * from.y + b * control.y + c * to.y,
  };
}

export interface CoinFrameV7 {
  readonly x: number;
  readonly y: number;
  /** Uniform scale of the sprite. */
  readonly scale: number;
  /** Horizontal squash of the gentle spin, 0.35 to 1. */
  readonly spin: number;
  readonly opacity: number;
}

export interface CoinFlightInputV7 {
  readonly from: FeedbackPointV7;
  /** Where the hop out of the tile ends and the toss begins. */
  readonly burst: FeedbackPointV7;
  readonly to: FeedbackPointV7;
  /** 0.5 at Fast animation speed. */
  readonly durationScale?: number;
  /** False for a coin entering from the edge: it has no hop. */
  readonly pop?: boolean;
  /** Which coin of its burst it is: its own arc height. */
  readonly variant?: number;
  /** The area the toss must stay inside. */
  readonly bounds?: CoinBoundsV7;
  /** The toss's control point, when the caller has worked it out once. */
  readonly control?: FeedbackPointV7;
}

function coinTimesV7(input: CoinFlightInputV7): {
  readonly popMs: number;
  readonly flightMs: number;
  readonly start: FeedbackPointV7;
} {
  const scale = input.durationScale ?? 1;
  const start = {
    x: input.from.x + input.burst.x,
    y: input.from.y + input.burst.y,
  };
  return {
    popMs: input.pop === false ? 0 : COIN_POP_MS_V7 * scale,
    flightMs:
      coinFlightMsV7(Math.hypot(input.to.x - start.x, input.to.y - start.y)) *
      scale,
    start,
  };
}

/**
 * One coin at `elapsedMs` after its own start. It hops up out of its tile,
 * slowing as it rises and growing to full size; the toss goes on from the
 * top of the hop along the parabola of `coinArcControlV7`, at
 * `coinPathProgressV7`, turning once, and shrinks a little over the last
 * third as it settles into the counter. Null before it starts and once it
 * has landed.
 */
export function coinFrameV7(
  input: CoinFlightInputV7 & { readonly elapsedMs: number },
): CoinFrameV7 | null {
  const { popMs, flightMs, start } = coinTimesV7(input);
  const elapsed = input.elapsedMs;
  if (elapsed < 0 || elapsed >= popMs + flightMs) return null;
  if (elapsed < popMs) {
    const p = elapsed / popMs;
    const eased = 1 - (1 - p) * (1 - p);
    return {
      x: input.from.x + input.burst.x * eased,
      y: input.from.y + input.burst.y * eased,
      scale: 0.25 + 0.75 * eased,
      spin: 1,
      opacity: Math.min(1, p * 4),
    };
  }
  const s = coinPathProgressV7((elapsed - popMs) / flightMs);
  const point = parabolaPointV7(
    start,
    input.control ??
      coinArcControlV7(start, input.to, input.variant ?? 0, input.bounds),
    input.to,
    s,
  );
  const settle = Math.min(1, Math.max(0, (s - 0.66) / 0.34));
  return {
    ...point,
    scale: 1 - 0.3 * settle * settle * (3 - 2 * settle),
    // One gentle turn over the flight, face on at both ends.
    spin: 0.4 + 0.6 * Math.abs(Math.cos(s * Math.PI * 2)),
    opacity: 1,
  };
}

/** How long after its own start a coin lands. */
export function coinLandingAfterMsV7(input: CoinFlightInputV7): number {
  const { popMs, flightMs } = coinTimesV7(input);
  return popMs + flightMs;
}

/**
 * Where the `index`-th of a source's `count` coins ends its hop: straight
 * up out of the tile, each a little to the side of the last and a little
 * higher or lower, so a burst fans out before it converges on the counter.
 */
export function coinBurstOffsetV7(
  index: number,
  count: number,
): FeedbackPointV7 {
  const spread = count <= 1 ? 0 : (index - (count - 1) / 2) * 8;
  return {
    x: Math.max(-16, Math.min(16, spread)),
    y: -(COIN_HOP_CSS_PX_V7 + 4 * (index % 3)),
  };
}

// --- Population ----------------------------------------------------------

/** One population icon's hop from its source tile to the city. */
export const POPULATION_HOP_MS_V7 = 460;
export const POPULATION_STAGGER_MS_V7 = 85;
/** Icons one city receives at most; above it, icons carry several points. */
export const POPULATION_ICONS_PER_CITY_V7 = 6;
/** Population icons on the board at once. */
export const POPULATION_ICON_CAP_V7 = 18;

export interface PopulationIconPlanV7 {
  readonly source: number;
  /** Population points the city's meter gains when this icon arrives. */
  readonly value: number;
}

/**
 * The icons of one city's gain: one per point up to
 * POPULATION_ICONS_PER_CITY_V7 (and `available`); above that the points are
 * merged, every source keeping an icon while there is room. Values add up
 * to the points gained.
 */
export function populationIconPlanV7(
  amounts: readonly number[],
  available: number = POPULATION_ICONS_PER_CITY_V7,
): readonly PopulationIconPlanV7[] {
  const room = Math.max(
    0,
    Math.min(POPULATION_ICONS_PER_CITY_V7, Math.floor(available)),
  );
  const points = amounts.map((amount) => Math.max(0, Math.floor(amount)));
  const total = points.reduce((sum, amount) => sum + amount, 0);
  if (total === 0) return [];
  if (room === 0) return [];
  const counts = points.map((amount) => amount);
  let icons = total;
  while (icons > room) {
    let widest = -1;
    for (let index = 0; index < counts.length; index += 1)
      if (
        (counts[index] ?? 0) > 1 &&
        (counts[index] ?? 0) > (counts[widest] ?? 1)
      )
        widest = index;
    if (widest === -1) break;
    counts[widest] = (counts[widest] ?? 0) - 1;
    icons -= 1;
  }
  for (let index = counts.length - 1; index >= 0 && icons > room; index -= 1)
    if ((counts[index] ?? 0) > 0) {
      counts[index] = 0;
      icons -= 1;
    }
  const plan: PopulationIconPlanV7[] = [];
  let orphaned = 0;
  points.forEach((amount, source) => {
    const count = counts[source] ?? 0;
    if (count === 0) {
      orphaned += amount;
      return;
    }
    const share = Math.floor(amount / count);
    let extra = amount - share * count;
    for (let index = 0; index < count; index += 1) {
      plan.push({ source, value: share + (extra > 0 ? 1 : 0) });
      extra -= 1;
    }
  });
  const last = plan.at(-1);
  if (last !== undefined && orphaned > 0)
    plan[plan.length - 1] = { ...last, value: last.value + orphaned };
  return plan;
}

/**
 * A population icon `progress` (0 to 1) along its hop: straight from the
 * source to the city, eased, lifted by a parabola whose top is `height`
 * above the line. It grows in over the first fifth and shrinks into the
 * city over the last.
 */
export function populationHopFrameV7(
  from: FeedbackPointV7,
  to: FeedbackPointV7,
  progress: number,
  height: number,
): { readonly x: number; readonly y: number; readonly scale: number } {
  const t = Math.min(1, Math.max(0, progress));
  const s = t * t * (3 - 2 * t);
  return {
    x: from.x + (to.x - from.x) * s,
    y: from.y + (to.y - from.y) * s - height * 4 * s * (1 - s),
    scale: t < 0.2 ? 0.4 + 3 * t : t > 0.85 ? 1 - (t - 0.85) * 2.4 : 1,
  };
}

/** The top of a population hop: higher for a longer way, in CSS px. */
export function populationHopHeightV7(
  from: FeedbackPointV7,
  to: FeedbackPointV7,
  tileCssPx: number,
): number {
  const distance = Math.hypot(to.x - from.x, to.y - from.y);
  return Math.max(tileCssPx * 0.42, Math.min(tileCssPx * 1.2, distance * 0.3));
}

// --- Road links ----------------------------------------------------------

/**
 * Bead pulp_wars-v56v: a new Road link sends a population icon from each
 * city to the other, hopping tile to tile along the Road. One hop per
 * tile, the whole way between the shortest and the longest time.
 */
export const ROAD_HOP_TILE_MS_V7 = 210;
export const ROAD_HOP_MIN_MS_V7 = 480;
export const ROAD_HOP_MAX_MS_V7 = 1_600;
/** Several links of one command start this far apart, nearest first. */
export const ROAD_LINK_STAGGER_MS_V7 = 160;
/** Road icons on the board at once; the rest arrive at once. */
export const ROAD_ICON_CAP_V7 = 12;
/** The sparkle on the pip an icon lands on. */
export const ROAD_LANDING_MS_V7 = 460;
/** Reduced motion: how long both cities' pips glow, still. */
export const ROAD_GLOW_MS_V7 = 1_400;
/** A lost link: the pip that leaves rises a little and fades. */
export const ROAD_UNLINK_MS_V7 = 700;
/**
 * The Cultists (bead pulp_wars-mch9.17): the pips a city gives up in an
 * Offering leave like a lost link's, this far apart.
 */
export const OFFERING_PIP_STAGGER_MS_V7 = 180;

/** The whole way of a Road icon over `segments` tile-to-tile hops. */
export function roadHopMsV7(segments: number): number {
  return Math.min(
    ROAD_HOP_MAX_MS_V7,
    Math.max(ROAD_HOP_MIN_MS_V7, Math.max(1, segments) * ROAD_HOP_TILE_MS_V7),
  );
}

/**
 * A Road icon `progress` (0 to 1) along its way: through `points` (the
 * source city's pip, the centre of each Road tile, the destination city's
 * pip), one small arc per step, each eased so the icon settles on every
 * tile before the next hop. Each arc's top is a third of its step, between
 * a fifth and half of `tileCssPx`. The icon grows in on the first hop and
 * shrinks a little onto the pip at the end.
 */
export function roadHopFrameV7(
  points: readonly FeedbackPointV7[],
  progress: number,
  tileCssPx: number,
): { readonly x: number; readonly y: number; readonly scale: number } {
  const first = points[0] ?? { x: 0, y: 0 };
  if (points.length < 2) return { x: first.x, y: first.y, scale: 1 };
  const t = Math.min(1, Math.max(0, progress));
  const segments = points.length - 1;
  const index = Math.min(segments - 1, Math.floor(t * segments));
  const local = t * segments - index;
  const from = points[index] ?? first;
  const to = points[index + 1] ?? from;
  const s = local * local * (3 - 2 * local);
  const height = Math.max(
    tileCssPx * 0.2,
    Math.min(tileCssPx * 0.5, Math.hypot(to.x - from.x, to.y - from.y) / 3),
  );
  const growIn = Math.min(1, t * segments * 2.5);
  const landing =
    index === segments - 1 && local > 0.75 ? (local - 0.75) / 0.25 : 0;
  return {
    x: from.x + (to.x - from.x) * s,
    y: from.y + (to.y - from.y) * s - height * 4 * local * (1 - local),
    scale: (0.45 + 0.55 * growIn) * (1 - 0.3 * landing),
  };
}

/**
 * The centre of a city's population pip `slot` (0 is the bottom one) for
 * the city centred on `centre`, in CSS px: the chibi piece's pip column in
 * the right strip of its cell (`CHIBI_OVERLAY_FRAME_V7.populationColumn`,
 * left 46 and bottom 62 world units; pips of 7 every 9).
 */
export function cityPipCentreV7(
  centre: FeedbackPointV7,
  zoom: number,
  slot: number,
): FeedbackPointV7 {
  return {
    x: centre.x + (46 + 3.5) * zoom,
    y: centre.y + (62 - 3.5 - 9 * Math.max(0, slot)) * zoom,
  };
}

// --- Hops ----------------------------------------------------------------

/** The city's small hop: up 14 nominal CSS px, then a slight rebound. */
export const CITY_HOP_AMPLITUDE_CSS_PX_V7 = 14;
export const CITY_HOP_MS_V7 = 320;
/** The hop of a unit that earned its Promotion. */
export const PROMOTION_HOP_AMPLITUDE_CSS_PX_V7 = 12;
export const PROMOTION_HOP_MS_V7 = 360;
/** The ring and sparkles of an earned Promotion. */
export const PROMOTION_CELEBRATION_MS_V7 = 640;
/** The marker leaving when the unit is promoted. */
export const PROMOTION_FLOURISH_MS_V7 = 460;
/** The marker growing in after the celebration. */
export const PROMOTION_MARKER_POP_MS_V7 = 220;
/** The ring that follows a city's level-up hop. */
export const LEVEL_UP_RING_MS_V7 = 520;

/**
 * A small hop in nominal CSS px (negative is up): one half-sine to
 * `amplitude` over the first 70% of the time, then a rebound a fifth as
 * high. Exactly 0 at both ends, outside them, and in reduced motion.
 */
export function hopOffsetCssPxV7(
  elapsedMs: number,
  durationMs: number,
  amplitude: number,
  reducedMotion = false,
): number {
  if (reducedMotion || !(durationMs > 0)) return 0;
  const progress = elapsedMs / durationMs;
  if (!(progress > 0) || progress >= 1) return 0;
  if (progress < 0.7) return -amplitude * Math.sin((progress / 0.7) * Math.PI);
  return -amplitude * 0.2 * Math.sin(((progress - 0.7) / 0.3) * Math.PI);
}

// --- Promotion marker and ready chevron ----------------------------------

/** The shared slow loop of the marker's bob and the ready ring's pulse. */
export const FEEDBACK_BOB_PERIOD_MS_V7 = 1_600;
export const PROMOTION_MARKER_BOB_CSS_PX_V7 = 2.5;
/** The chevron's bounce: twice per loop of the ring. */
export const READY_CHEVRON_PERIOD_MS_V7 = 800;
export const READY_CHEVRON_BOUNCE_CSS_PX_V7 = 4;

/** 0 to 1 and back over one loop; 0 in reduced motion. */
export function feedbackPulseV7(
  elapsedMs: number,
  reducedMotion: boolean,
): number {
  if (reducedMotion) return 0;
  const phase =
    ((elapsedMs % FEEDBACK_BOB_PERIOD_MS_V7) + FEEDBACK_BOB_PERIOD_MS_V7) %
    FEEDBACK_BOB_PERIOD_MS_V7;
  return (1 - Math.cos((phase / FEEDBACK_BOB_PERIOD_MS_V7) * Math.PI * 2)) / 2;
}

/** The marker's gentle bob in nominal CSS px (negative is up). */
export function promotionMarkerBobCssPxV7(
  elapsedMs: number,
  reducedMotion: boolean,
): number {
  return (
    -PROMOTION_MARKER_BOB_CSS_PX_V7 * feedbackPulseV7(elapsedMs, reducedMotion)
  );
}

/**
 * First steps (bead pulp_wars-2yc.39): the marker over a city, tile or unit
 * hops once per loop and rests in between, like a finger tapping.
 */
export const FIRST_STEP_HOP_PERIOD_MS_V7 = 1_100;
export const FIRST_STEP_HOP_MS_V7 = 460;
export const FIRST_STEP_HOP_AMPLITUDE_CSS_PX_V7 = 13;

/** The marker's hop in nominal CSS px (negative is up); 0 when still. */
export function firstStepHopCssPxV7(
  timeMs: number,
  reducedMotion: boolean,
): number {
  if (reducedMotion) return 0;
  const phase =
    ((timeMs % FIRST_STEP_HOP_PERIOD_MS_V7) + FIRST_STEP_HOP_PERIOD_MS_V7) %
    FIRST_STEP_HOP_PERIOD_MS_V7;
  return hopOffsetCssPxV7(
    phase,
    FIRST_STEP_HOP_MS_V7,
    FIRST_STEP_HOP_AMPLITUDE_CSS_PX_V7,
    false,
  );
}

/** The chevron's bounce in nominal CSS px (negative is up). */
export function readyChevronBounceCssPxV7(
  elapsedMs: number,
  reducedMotion: boolean,
): number {
  if (reducedMotion) return 0;
  const phase =
    ((elapsedMs % READY_CHEVRON_PERIOD_MS_V7) + READY_CHEVRON_PERIOD_MS_V7) %
    READY_CHEVRON_PERIOD_MS_V7;
  return (
    -READY_CHEVRON_BOUNCE_CSS_PX_V7 *
    Math.abs(Math.sin((phase / READY_CHEVRON_PERIOD_MS_V7) * Math.PI))
  );
}

/**
 * The level and meter a city shows while population points are still on
 * their way to it: the meter it had before the gain, filled by the points
 * that have arrived, never past full (a level L city's meter holds L + 1).
 * The true level and meter return with the last point.
 */
export function heldCityMeterV7(
  before: { readonly level: number; readonly population: number },
  arrived: number,
): { readonly level: number; readonly population: number } {
  return {
    level: before.level,
    population: Math.min(
      before.level + 1,
      before.population + Math.max(0, arrived),
    ),
  };
}
