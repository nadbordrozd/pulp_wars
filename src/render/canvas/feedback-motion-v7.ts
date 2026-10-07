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

/** The coin grows out of its tile with a small overshoot. */
export const COIN_POP_MS_V7 = 200;
/** The flight from the tile to the counter. */
export const COIN_FLIGHT_MS_V7 = 640;
/** Between two coins of one launch. */
export const COIN_STAGGER_MS_V7 = 55;
/** The longest a launch spreads its coins over, however many they are. */
export const COIN_STAGGER_SPAN_MS_V7 = 900;
/** Coin sprites on screen at once, over every source. */
export const COIN_SPRITE_CAP_V7 = 24;
/** Coin sprites one source launches at most. */
export const COIN_SPRITES_PER_SOURCE_V7 = 5;
/** How far (CSS px) a coin pops away from its tile's centre. */
export const COIN_BURST_RADIUS_CSS_PX_V7 = 13;
/** How far outside the board's edge an off-screen source's coins start. */
export const COIN_EDGE_MARGIN_CSS_PX_V7 = 18;
/** The counter's pulse when a coin lands. */
export const COUNTER_PULSE_MS_V7 = 220;

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

/** The delay between two coins of a launch of `count` coins. */
export function coinStaggerMsV7(count: number): number {
  return count <= 1
    ? 0
    : Math.min(COIN_STAGGER_MS_V7, COIN_STAGGER_SPAN_MS_V7 / (count - 1));
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

/**
 * The control point of a coin's flight: the chord's midpoint pushed
 * sideways by a slight arc height (a seventh of the distance, between 26 and
 * 96 CSS px), on the side that bends up and to the right, away from the
 * counter's corner.
 */
export function coinArcControlV7(
  from: FeedbackPointV7,
  to: FeedbackPointV7,
): FeedbackPointV7 {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const distance = Math.hypot(dx, dy);
  const mid = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };
  if (distance < 1) return { x: mid.x, y: mid.y - 26 };
  const height = Math.min(96, Math.max(26, distance / 7));
  let nx = dy / distance;
  let ny = -dx / distance;
  if (nx * 0.35 - ny < 0) {
    nx = -nx;
    ny = -ny;
  }
  // A quadratic curve reaches half its control offset, hence twice.
  return { x: mid.x + nx * height * 2, y: mid.y + ny * height * 2 };
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

/**
 * One coin at `elapsedMs` after its own start: it pops out of its tile
 * (overshooting to its burst offset), then flies the parabola to the
 * counter, eased in and out, turning gently. Null before it starts and once
 * it has landed.
 */
export function coinFrameV7(input: {
  readonly from: FeedbackPointV7;
  readonly burst: FeedbackPointV7;
  readonly to: FeedbackPointV7;
  readonly elapsedMs: number;
  /** 0.5 at Fast animation speed. */
  readonly durationScale?: number;
  /** False for a coin entering from the edge: it has no pop. */
  readonly pop?: boolean;
}): CoinFrameV7 | null {
  const scale = input.durationScale ?? 1;
  const popMs = input.pop === false ? 0 : COIN_POP_MS_V7 * scale;
  const flightMs = COIN_FLIGHT_MS_V7 * scale;
  const elapsed = input.elapsedMs;
  if (elapsed < 0 || elapsed >= popMs + flightMs) return null;
  const start = {
    x: input.from.x + input.burst.x,
    y: input.from.y + input.burst.y,
  };
  if (elapsed < popMs) {
    const eased = easeOutBackV7(elapsed / popMs);
    return {
      x: input.from.x + input.burst.x * eased,
      y: input.from.y + input.burst.y * eased,
      scale: Math.max(0, eased),
      spin: 1,
      opacity: Math.min(1, (elapsed / popMs) * 3),
    };
  }
  const progress = (elapsed - popMs) / flightMs;
  const s = easeInOutCubicV7(progress);
  const point = parabolaPointV7(
    start,
    coinArcControlV7(start, input.to),
    input.to,
    s,
  );
  return {
    ...point,
    // It shrinks a little into the counter's icon.
    scale: 1 - 0.18 * s,
    // One and a half gentle turns over the flight, flat at both ends.
    spin: 0.35 + 0.65 * Math.abs(Math.cos(s * Math.PI * 1.5)),
    opacity: 1,
  };
}

/** When a coin that starts at `startMs` lands. */
export function coinLandingMsV7(
  startMs: number,
  durationScale = 1,
  pop = true,
): number {
  return (
    startMs + ((pop ? COIN_POP_MS_V7 : 0) + COIN_FLIGHT_MS_V7) * durationScale
  );
}

/** The deterministic burst offset of the `index`-th coin of a source. */
export function coinBurstOffsetV7(
  index: number,
  count: number,
): FeedbackPointV7 {
  if (count <= 1) return { x: 0, y: -COIN_BURST_RADIUS_CSS_PX_V7 * 0.6 };
  // A fan over the upper half, so coins rise from the tile.
  const angle = Math.PI * (1.15 + (0.7 * index) / (count - 1));
  return {
    x: Math.cos(angle) * COIN_BURST_RADIUS_CSS_PX_V7,
    y: Math.sin(angle) * COIN_BURST_RADIUS_CSS_PX_V7,
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
