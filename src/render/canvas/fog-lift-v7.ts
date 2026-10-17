import type { CoordV7 } from "../../engine/index";
import { chibiForestRectV7 } from "./chibi-forest-v7";
import { chibiMasterScale, isWholeScale } from "./chibi-geometry-v7";
import {
  drawFogV7,
  FOG_PALETTES_V7,
  fogHashV7,
  type FogArtV7,
  type FogCellsV7,
  type FogPaletteIdV7,
} from "./fog-of-war-v7";
import {
  FOG_PUFF_RASTER_V7,
  fogPuffPixelsV7,
  type FogPuffColoursV7,
  type FogPuffLobeV7,
  type FogPuffWispV7,
} from "./fog-puff-v7";
import type { CameraState } from "./geometry";

/**
 * The fog lift (bead pulp_wars-2yc.83, UI review V4, docs/art/ATMOSPHERE.md).
 * The user, 2026-10-17: "in polytopia when you click on an unexplored tile,
 * there is a little animation, like the fog is sort of smoking."
 *
 * When cells become explored (a unit walks or is trained and sees new
 * ground, a capture, a technology that widens sight) the board draws the
 * new ground at once, and the effects overlay covers each new cell with
 * its cloud and lifts it away: the cloud swells a little, breaks into
 * wisps of the fog puff's recipe (bead pulp_wars-2yc.77) that drift up and
 * out and thin away, while the cloud under them fades and the ground shows
 * through. The cells lift one ring after another outward from the unit
 * that sees them (along a walk, where it comes nearest), so a reveal reads
 * as a wave.
 *
 * Cost: the covers of every lifting cell are one or a few filled paths of
 * the fog's own pattern (as the board's fog), batched by alpha; a wisp is
 * one drawImage of a cached frame (FOG_LIFT_V7.frames frames of
 * FOG_LIFT_V7.variants variants, cropped, built a few a frame on first
 * use); at most FOG_LIFT_V7.maxPuffs wisps play at once and a cell over the
 * cap only fades. Only the overlay repaints, and only while a lift plays.
 *
 * Reduced motion: no wisp and no wave. Every new cell's cloud fades out
 * together over FOG_LIFT_V7.reducedMs.
 *
 * It never shows anything hidden: it covers cells the viewer has just
 * explored, drawn from their coordinates alone, in the fog's colours.
 */

/** The master switch. False lifts nothing: new ground shows at once. */
export const FOG_LIFT_ENABLED_V7 = true;

/** `?fog-lift=0` (or `off`, `false`) turns it off, `=1` on. */
export const FOG_LIFT_PARAMETER_V7 = "fog-lift";

export function fogLiftEnabledV7(search?: string): boolean {
  const query =
    search ??
    (globalThis as { location?: { search?: string } }).location?.search ??
    "";
  let value: string | null;
  try {
    value = new URLSearchParams(query).get(FOG_LIFT_PARAMETER_V7);
  } catch {
    value = null;
  }
  if (value === null) return FOG_LIFT_ENABLED_V7;
  const text = value.trim().toLowerCase();
  if (text === "0" || text === "off" || text === "false") return false;
  if (text === "1" || text === "on" || text === "true") return true;
  return FOG_LIFT_ENABLED_V7;
}

export const FOG_LIFT_V7 = {
  /** One cell's lift, ms, at the normal and the fast animation speed. */
  durationMs: 640,
  fastDurationMs: 480,
  /** The wave: each ring of cells farther from the unit starts this later. */
  ringMs: 80,
  fastRingMs: 60,
  /** The farthest ring that waits; farther cells start with it. */
  maxRings: 3,
  /** Along a walk, a cell starts lifting this long before the unit is nearest. */
  leadMs: 60,
  /** Reduced motion: the plain fade of every new cell's cloud, ms. */
  reducedMs: 180,
  /** A plain cover (a cell over the cap) is gone by this share of a lift. */
  coverUntil: 0.35,
  /** At most this many cells play their wisps at once; the rest only fade. */
  maxPuffs: 64,
  /** The cached frames of a lift's wisps, and how many differ by cell. */
  frames: 12,
  variants: 3,
  /** At most this many cached frames are built in one overlay frame. */
  buildsPerFrame: 3,
  /** Warming in idle time: this many frames a step, a step this far apart. */
  warmPerStep: 2,
  warmGapMs: 30,
  /** The wisps fade (all together) from this share of a lift. */
  fadeFrom: 0.16,
  /** A cell's wisps are moved by up to this many master px, by cell. */
  jitter: 3,
  /** The cloud swells until this share, then its lobes break away, the last this much later. */
  breakFrom: 0.1,
  breakStagger: 0.1,
  /** The cover's alpha is drawn in this many steps (one path each). */
  coverSteps: 8,
} as const;

export type FogLiftSpeedV7 = "NORMAL" | "FAST";

export interface FogLiftTimingV7 {
  readonly durationMs: number;
  readonly ringMs: number;
  readonly reduced: boolean;
}

export function fogLiftTimingV7(
  speed: FogLiftSpeedV7,
  reduced: boolean,
): FogLiftTimingV7 {
  return {
    durationMs:
      speed === "FAST" ? FOG_LIFT_V7.fastDurationMs : FOG_LIFT_V7.durationMs,
    ringMs: speed === "FAST" ? FOG_LIFT_V7.fastRingMs : FOG_LIFT_V7.ringMs,
    reduced,
  };
}

const easeOut = (value: number): number => 1 - (1 - value) * (1 - value);
const easeIn = (value: number): number => value * value;
const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));
const chebyshev = (a: CoordV7, b: CoordV7): number =>
  Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));

// ---------------------------------------------------------------- the wave

/** Where a reveal is seen from, and how long after it starts. */
export interface FogLiftSourceV7 {
  readonly at: CoordV7;
  readonly delayMs: number;
}

/** A cell to lift: when it starts after the reveal, and its wisps' look. */
export interface FogLiftCellV7 {
  readonly at: CoordV7;
  readonly delayMs: number;
  readonly variant: number;
}

/** A cell's wisp variant: the same for the same cell. */
export function fogLiftVariantV7(at: CoordV7): number {
  return Math.min(
    FOG_LIFT_V7.variants - 1,
    Math.floor(fogHashV7(at.x, at.y, 911) * FOG_LIFT_V7.variants),
  );
}

/**
 * The wave of a reveal: each new cell starts with the source that reaches
 * it first, one `ringMs` later for each ring past the first (at most
 * FOG_LIFT_V7.maxRings); the whole wave is moved so that its first cell
 * starts at 0. With no source every cell starts at 0. Sorted by start,
 * then by row and column.
 */
export function fogLiftScheduleV7(
  cells: readonly CoordV7[],
  sources: readonly FogLiftSourceV7[],
  ringMs: number,
): FogLiftCellV7[] {
  const timed = cells.map((at) => {
    let best = Number.POSITIVE_INFINITY;
    for (const source of sources) {
      const rings = Math.min(
        FOG_LIFT_V7.maxRings,
        Math.max(0, chebyshev(at, source.at) - 1),
      );
      best = Math.min(best, source.delayMs + rings * ringMs);
    }
    return { at, start: Number.isFinite(best) ? best : 0 };
  });
  // A wave seen only from afar (a wider sight) starts at once.
  let floor = Number.POSITIVE_INFINITY;
  for (const cell of timed) floor = Math.min(floor, cell.start);
  return timed
    .map((cell) => ({
      at: { x: cell.at.x, y: cell.at.y },
      delayMs: Math.max(0, cell.start - (Number.isFinite(floor) ? floor : 0)),
      variant: fogLiftVariantV7(cell.at),
    }))
    .sort(
      (a, b) => a.delayMs - b.delayMs || a.at.y - b.at.y || a.at.x - b.at.x,
    );
}

/**
 * The sources of a walk: each cell of the path at the time the unit is on
 * it (the walk is linear in time), less FOG_LIFT_V7.leadMs; only the cell
 * nearest to a new cell counts, so a cell lifts as the unit comes nearest.
 */
export function fogLiftWalkScheduleV7(
  cells: readonly CoordV7[],
  path: readonly CoordV7[],
  walkMs: number,
  ringMs: number,
): FogLiftCellV7[] {
  if (path.length === 0) return fogLiftScheduleV7(cells, [], ringMs);
  const steps = Math.max(1, path.length - 1);
  return cells
    .map((at) => {
      let nearest = 0;
      let distance = Number.POSITIVE_INFINITY;
      for (const [index, step] of path.entries()) {
        const d = chebyshev(at, step);
        if (d < distance) {
          distance = d;
          nearest = index;
        }
      }
      const rings = Math.min(FOG_LIFT_V7.maxRings, Math.max(0, distance - 1));
      const arrive = path.length === 1 ? 0 : (walkMs * nearest) / steps;
      return {
        at: { x: at.x, y: at.y },
        delayMs: Math.max(0, arrive - FOG_LIFT_V7.leadMs + rings * ringMs),
        variant: fogLiftVariantV7(at),
      };
    })
    .sort(
      (a, b) => a.delayMs - b.delayMs || a.at.y - b.at.y || a.at.x - b.at.x,
    );
}

// --------------------------------------------------------------- the look

/** The cloud over a lifting cell, `progress` (0 to 1) into its lift. */
export function fogLiftCoverAlphaV7(progress: number): number {
  if (progress <= 0) return 1;
  if (progress >= FOG_LIFT_V7.coverUntil) return 0;
  return 1 - easeOut(progress / FOG_LIFT_V7.coverUntil);
}

/** Reduced motion: the cloud `elapsedMs` into its plain fade. */
export function fogLiftReducedAlphaV7(elapsedMs: number): number {
  if (elapsedMs <= 0) return 1;
  return clamp01(1 - elapsedMs / FOG_LIFT_V7.reducedMs);
}

/**
 * Where the nine lobes of a cell's cloud sit at rest, master px from the
 * cell's top left: three rows of three that cover the whole cell and
 * bulge a little past it, so the cloud has a round, uneven edge.
 */
const LOBES: readonly (readonly [number, number])[] = [
  [12, 12],
  [40, 9],
  [68, 12],
  [9, 40],
  [40, 40],
  [71, 40],
  [12, 68],
  [40, 71],
  [68, 68],
];

/**
 * The wisps `progress` (0 to 1) into a lift, in master px from the cell's
 * top left (FOG_PUFF_RASTER_V7 holds them). At first the cell's cloud is
 * whole and opaque over its cover and swells a little; then it breaks:
 * each of its nine lobes drifts out from the middle and up (the top ones
 * highest), shrinks and thins, all fading together. Empty at 0 and at 1.
 */
export function fogLiftWispsV7(
  variant: number,
  progress: number,
): FogPuffWispV7[] {
  if (!(progress > 0 && progress < 1)) return [];
  const spec = FOG_LIFT_V7;
  const hash = (index: number, which: number): number =>
    fogHashV7(variant * 37 + index, which, 913);
  // Every wisp fades together, so where they still touch there is no seam.
  const alpha = clamp01(
    progress > spec.fadeFrom
      ? Math.pow(1 - (progress - spec.fadeFrom) / (1 - spec.fadeFrom), 1.6)
      : 1,
  );
  const swell = 1 + 0.08 * easeOut(clamp01(progress / spec.breakFrom));
  const wisps: FogPuffWispV7[] = [];
  for (const [index, [x0, y0]] of LOBES.entries()) {
    const start = spec.breakFrom + spec.breakStagger * hash(index, 1);
    const local = clamp01((progress - start) / (1 - start));
    const go = easeOut(local);
    const dx = x0 - 40;
    const dy = y0 - 40;
    const length = Math.hypot(dx, dy);
    const ux =
      length === 0 ? (hash(index, 2) < 0.5 ? -1 : 1) * 0.3 : dx / length;
    const uy = length === 0 ? 0 : dy / length;
    // Each lobe its own way, so a wave of cells does not rise in rows.
    const spread = 10 + 18 * hash(index, 3);
    const rise = 14 + 22 * (1 - y0 / 80) + 18 * hash(index, 4);
    const x =
      40 +
      dx * swell +
      ux * spread * go +
      3 * (hash(index, 5) - 0.5) +
      12 * (hash(index, 7) - 0.5) * go;
    const y = 40 + dy * swell + uy * spread * 0.3 * go - rise * go;
    const base = (index === 4 ? 25 : 22) + 2 * hash(index, 6);
    const shrink = 1 - 0.55 * easeIn(local);
    const radius = base * swell * shrink;
    // A wisp that has gone some way is two lobes side by side.
    const lobes: FogPuffLobeV7[] =
      local < 0.35 || hash(index, 8) < 0.4
        ? [{ x, y, r: radius }]
        : lobesOf(x, y, radius * 0.8, 2, hash, index);
    wisps.push({ lobes, alpha });
  }
  return wisps;
}

/** A cloud of `count` lobes side by side on a shared base. */
function lobesOf(
  x: number,
  y: number,
  radius: number,
  count: number,
  hash: (index: number, which: number) => number,
  index: number,
): FogPuffLobeV7[] {
  const lobes: FogPuffLobeV7[] = [];
  for (let lobe = 0; lobe < count; lobe += 1) {
    const offset = lobe - (count - 1) / 2;
    const r = radius * (offset === 0 ? 1 : 0.72 + 0.12 * hash(index, 7 + lobe));
    lobes.push({
      x: x + offset * radius * 0.95,
      y: y - r * 0.4 + radius * 0.35 * Math.abs(offset),
      r,
    });
  }
  return lobes;
}

/** How far a cell's wisps are moved, master px: the same for the same cell. */
export function fogLiftJitterV7(at: CoordV7): { x: number; y: number } {
  const spread = (salt: number): number =>
    Math.round((fogHashV7(at.x, at.y, salt) - 0.5) * 2 * FOG_LIFT_V7.jitter);
  return { x: spread(917), y: spread(919) };
}

/**
 * The cloud's rims in a fog palette: a pale rim towards the light (bottom
 * left, as the cloud's own edge), a shaded rim away from it and a short
 * cast shadow. Its body is the fog's own pattern (`body` is used only
 * where no pattern can be drawn). `"OFF"` (the flat fog of the classic
 * look) is a grey-teal of that fog.
 */
export function fogLiftColoursV7(
  palette: FogPaletteIdV7 | "OFF",
): FogPuffColoursV7 {
  if (palette === "OFF")
    return {
      body: [28, 42, 46],
      lit: [64, 86, 90],
      shade: [20, 30, 34],
      cast: [10, 16, 18],
    };
  const spec = FOG_PALETTES_V7[palette];
  return {
    body: spec.puff,
    lit: mixRgb(spec.puffLit, spec.rim, 0.4),
    shade: spec.puffShade,
    cast: spec.cast,
  };
}

type Rgb = readonly [number, number, number];

const mixRgb = (a: Rgb, b: Rgb, t: number): Rgb => [
  Math.round(a[0] + (b[0] - a[0]) * t),
  Math.round(a[1] + (b[1] - a[1]) * t),
  Math.round(a[2] + (b[2] - a[2]) * t),
];

/** The cached frame a lift `progress` into it shows (0 to frames - 1). */
export function fogLiftFrameIndexV7(progress: number): number {
  return Math.min(
    FOG_LIFT_V7.frames - 1,
    Math.max(0, Math.floor(clamp01(progress) * FOG_LIFT_V7.frames)),
  );
}

/** The progress a cached frame is drawn at: the middle of its share. */
export function fogLiftFrameProgressV7(frame: number): number {
  return (frame + 0.5) / FOG_LIFT_V7.frames;
}

// ---------------------------------------------------------------- the clock

/** What the lift reads of a view: its viewer, explored cells, units, cities. */
export interface FogLiftViewV7 {
  readonly viewer: { readonly id: unknown };
  readonly board: {
    readonly tiles: readonly {
      readonly at: CoordV7;
      readonly explored: boolean;
    }[];
  };
  readonly units: readonly {
    readonly id: number;
    readonly ownerId: unknown;
    readonly at: CoordV7;
  }[];
  readonly cities: readonly {
    readonly ownerId: unknown;
    readonly at: CoordV7;
  }[];
}

/** A walk that is about to show its new ground (a MOVE step). */
export interface FogLiftWalkV7 {
  readonly unitId: number;
  readonly path: readonly CoordV7[];
  readonly walkMs: number;
}

/** One lifting cell at a moment. */
export interface FogLiftDrawV7 {
  readonly at: CoordV7;
  /**
   * The plain cover of the cell's fog, 1 to 0: drawn for a cell with no
   * cloud (reduced motion, over the cap) or whose cloud cannot be drawn.
   */
  readonly coverAlpha: number;
  /** The cloud's cached frame (0 while the cell waits), or null. */
  readonly puff: { readonly variant: number; readonly frame: number } | null;
}

export interface FogLiftClockV7 {
  /**
   * Reads the view about to be drawn. The first view of a match or a
   * viewer starts nothing; a later one starts a lift on every cell it has
   * explored that the last did not, and drops the lift of a cell no longer
   * explored. Returns how many lifts it started.
   */
  observe(
    view: FogLiftViewV7,
    matchKey: string | number,
    nowMs: number,
    timing: FogLiftTimingV7,
  ): number;
  /** The next reveal comes from this walk (its path's timing). */
  walk(walk: FogLiftWalkV7, nowMs: number): void;
  /** The lifting cells at `nowMs`, sorted by start; empty once all are over. */
  frame(nowMs: number, timing: FogLiftTimingV7): FogLiftDrawV7[];
  /** Whether a lift still plays (or waits) at `nowMs`; drops those over. */
  active(nowMs: number, timing: FogLiftTimingV7): boolean;
  /** When the latest wave started (review tooling), or null. */
  readonly startedAtMs: number | null;
  /**
   * The unexplored cells beside a lifting cell. Their fog is drawn again
   * over the clouds' rims, so a rim shows only against explored ground.
   */
  fogNeighbours(): readonly CoordV7[];
  reset(): void;
}

interface Lift {
  readonly at: CoordV7;
  readonly key: string;
  readonly startMs: number;
  readonly variant: number;
}

const keyOf = (at: CoordV7): string => `${at.x},${at.y}`;

/** How long a lift lasts once it starts. */
function lengthMs(timing: FogLiftTimingV7): number {
  return timing.reduced ? FOG_LIFT_V7.reducedMs : timing.durationMs;
}

export function createFogLiftClockV7(): FogLiftClockV7 {
  let baseline: {
    readonly matchKey: string | number;
    readonly viewer: unknown;
    readonly tiles: FogLiftViewV7["board"]["tiles"];
    readonly explored: ReadonlySet<string>;
    readonly units: ReadonlyMap<number, string>;
    readonly cities: ReadonlySet<string>;
  } | null = null;
  let lifts: Lift[] = [];
  let pendingWalk: (FogLiftWalkV7 & { readonly atMs: number }) | null = null;
  let startedAtMs: number | null = null;
  let neighbours: CoordV7[] | null = null;
  const clock: FogLiftClockV7 = {
    fogNeighbours() {
      if (neighbours !== null) return neighbours;
      neighbours = [];
      if (baseline === null || lifts.length === 0) return neighbours;
      const tiles = new Set<string>();
      for (const tile of baseline.tiles) tiles.add(keyOf(tile.at));
      const seen = new Set<string>();
      for (const lift of lifts)
        for (let dy = -1; dy <= 1; dy += 1)
          for (let dx = -1; dx <= 1; dx += 1) {
            const at = { x: lift.at.x + dx, y: lift.at.y + dy };
            const key = keyOf(at);
            if (seen.has(key) || !tiles.has(key) || baseline.explored.has(key))
              continue;
            seen.add(key);
            neighbours.push(at);
          }
      return neighbours;
    },
    get startedAtMs() {
      return startedAtMs;
    },
    observe(view, matchKey, nowMs, timing) {
      const tiles = view.board.tiles;
      const viewer = view.viewer.id;
      if (
        baseline !== null &&
        baseline.tiles === tiles &&
        baseline.matchKey === matchKey &&
        baseline.viewer === viewer
      )
        return 0;
      const explored = new Set<string>();
      for (const tile of tiles) if (tile.explored) explored.add(keyOf(tile.at));
      const units = new Map<number, string>();
      for (const unit of view.units)
        if (unit.ownerId === viewer) units.set(unit.id, keyOf(unit.at));
      const cities = new Set<string>();
      for (const city of view.cities)
        if (city.ownerId === viewer) cities.add(keyOf(city.at));
      const prior = baseline;
      baseline = { matchKey, viewer, tiles, explored, units, cities };
      if (
        prior === null ||
        prior.matchKey !== matchKey ||
        prior.viewer !== viewer
      ) {
        lifts = [];
        pendingWalk = null;
        return 0;
      }
      // A cell fogged again (the view before a presentation) is fog on the
      // board: its lift is over.
      if (lifts.length > 0)
        lifts = lifts.filter((lift) => explored.has(lift.key));
      neighbours = null;
      const fresh: CoordV7[] = [];
      for (const tile of tiles)
        if (tile.explored && !prior.explored.has(keyOf(tile.at)))
          fresh.push(tile.at);
      if (fresh.length === 0) return 0;
      const lifting = new Set(lifts.map((lift) => lift.key));
      const cells = fresh.filter((at) => !lifting.has(keyOf(at)));
      if (cells.length === 0) return 0;
      let schedule: FogLiftCellV7[];
      const walk =
        pendingWalk !== null &&
        nowMs - pendingWalk.atMs <= pendingWalk.walkMs + 100
          ? pendingWalk
          : null;
      pendingWalk = null;
      if (timing.reduced)
        schedule = cells.map((at) => ({
          at,
          delayMs: 0,
          variant: fogLiftVariantV7(at),
        }));
      else if (walk !== null)
        schedule = fogLiftWalkScheduleV7(
          cells,
          walk.path,
          Math.max(0, walk.walkMs - (nowMs - walk.atMs)),
          timing.ringMs,
        );
      else {
        // The viewer's units that moved or are new, and cities newly held;
        // or, when none did (a wider sight), every unit and city.
        const moved: FogLiftSourceV7[] = [];
        for (const unit of view.units)
          if (
            unit.ownerId === viewer &&
            prior.units.get(unit.id) !== keyOf(unit.at)
          )
            moved.push({ at: unit.at, delayMs: 0 });
        for (const city of view.cities)
          if (city.ownerId === viewer && !prior.cities.has(keyOf(city.at)))
            moved.push({ at: city.at, delayMs: 0 });
        const sources =
          moved.length > 0
            ? moved
            : [
                ...view.units.filter((unit) => unit.ownerId === viewer),
                ...view.cities.filter((city) => city.ownerId === viewer),
              ].map((owned) => ({ at: owned.at, delayMs: 0 }));
        schedule = fogLiftScheduleV7(cells, sources, timing.ringMs);
      }
      startedAtMs = nowMs;
      for (const cell of schedule)
        lifts.push({
          at: cell.at,
          key: keyOf(cell.at),
          startMs: nowMs + cell.delayMs,
          variant: cell.variant,
        });
      lifts.sort((a, b) => a.startMs - b.startMs);
      neighbours = null;
      return schedule.length;
    },
    walk(walk, nowMs) {
      pendingWalk = { ...walk, atMs: nowMs };
    },
    frame(nowMs, timing) {
      const total = lengthMs(timing);
      const drawn: FogLiftDrawV7[] = [];
      let puffs = 0;
      for (const lift of lifts) {
        const elapsed = nowMs - lift.startMs;
        if (elapsed >= total) continue;
        if (timing.reduced) {
          drawn.push({
            at: lift.at,
            coverAlpha: fogLiftReducedAlphaV7(elapsed),
            puff: null,
          });
          continue;
        }
        const progress = elapsed / total;
        let puff: FogLiftDrawV7["puff"] = null;
        // A cell still waiting holds its whole cloud (frame 0).
        if (puffs < FOG_LIFT_V7.maxPuffs) {
          puffs += 1;
          puff = {
            variant: lift.variant,
            frame: fogLiftFrameIndexV7(progress),
          };
        }
        drawn.push({
          at: lift.at,
          coverAlpha: fogLiftCoverAlphaV7(progress),
          puff,
        });
      }
      return drawn;
    },
    active(nowMs, timing) {
      if (lifts.length === 0) return false;
      const total = lengthMs(timing);
      const before = lifts.length;
      lifts = lifts.filter((lift) => nowMs - lift.startMs < total);
      if (lifts.length !== before) neighbours = null;
      return lifts.length > 0;
    },
    reset() {
      baseline = null;
      lifts = [];
      pendingWalk = null;
      startedAtMs = null;
      neighbours = null;
    },
  };
  return clock;
}

// ------------------------------------------------------------- the drawing

/** A cached frame of a cell's cloud, cropped, in master px from the cell. */
export interface FogLiftSpriteV7 {
  /** The cloud's body: white, with its alpha (the fog's pattern fills it). */
  readonly mask: CanvasImageSource;
  /** Its pale and shaded rims and its cast shadow, in their colours. */
  readonly rims: CanvasImageSource;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface FogLiftSpritesV7 {
  /** Starts an overlay frame: the build budget is full again. */
  beginFrame(): void;
  /**
   * The frame `frame` of `variant` in `colours` (named `colourKey`): built
   * now when the budget allows, else the nearest earlier frame built, else
   * null.
   */
  sprite(
    colourKey: string,
    colours: FogPuffColoursV7,
    variant: number,
    frame: number,
  ): FogLiftSpriteV7 | null;
  /**
   * Builds up to `count` of the frames still missing in `colours` (before
   * a lift needs them, in idle time). True once every frame is built.
   */
  warm(colourKey: string, colours: FogPuffColoursV7, count: number): boolean;
  /** How many frames are built (tests, the cost record). */
  readonly built: number;
}

/** The raster's kinds of pixel, told apart by their red channel. */
const BODY = 10;
const LIT = 20;
const SHADE = 30;
const CAST = 40;
const SORTING: FogPuffColoursV7 = {
  body: [BODY, 0, 0],
  lit: [LIT, 0, 0],
  shade: [SHADE, 0, 0],
  cast: [CAST, 0, 0],
};

/**
 * The pixels of a cached frame, cropped to what is drawn, or null if empty:
 * the body as a white mask, and the rims and the cast shadow in `colours`.
 */
export function fogLiftSpritePixelsV7(
  colours: FogPuffColoursV7,
  variant: number,
  frame: number,
): {
  readonly mask: Uint8ClampedArray;
  readonly rims: Uint8ClampedArray;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
} | null {
  const { width, height } = FOG_PUFF_RASTER_V7;
  const full = fogPuffPixelsV7(
    fogLiftWispsV7(variant, fogLiftFrameProgressV7(frame)),
    SORTING,
  );
  let left = width;
  let top = height;
  let right = -1;
  let bottom = -1;
  for (let py = 0; py < height; py += 1)
    for (let px = 0; px < width; px += 1)
      if ((full[(py * width + px) * 4 + 3] ?? 0) > 0) {
        if (px < left) left = px;
        if (px > right) right = px;
        if (py < top) top = py;
        if (py > bottom) bottom = py;
      }
  if (right < left) return null;
  const w = right - left + 1;
  const h = bottom - top + 1;
  const mask = new Uint8ClampedArray(w * h * 4);
  const rims = new Uint8ClampedArray(w * h * 4);
  for (let row = 0; row < h; row += 1)
    for (let column = 0; column < w; column += 1) {
      const from = ((top + row) * width + left + column) * 4;
      const alpha = full[from + 3] ?? 0;
      if (alpha === 0) continue;
      const to = (row * w + column) * 4;
      const kind = full[from] ?? 0;
      if (kind === BODY) {
        mask[to] = 255;
        mask[to + 1] = 255;
        mask[to + 2] = 255;
        mask[to + 3] = alpha;
        continue;
      }
      const colour =
        kind === LIT
          ? colours.lit
          : kind === SHADE
            ? colours.shade
            : colours.cast;
      rims[to] = colour[0];
      rims[to + 1] = colour[1];
      rims[to + 2] = colour[2];
      rims[to + 3] = alpha;
    }
  return {
    mask,
    rims,
    x: left - FOG_PUFF_RASTER_V7.x,
    y: top - FOG_PUFF_RASTER_V7.y,
    width: w,
    height: h,
  };
}

export function createFogLiftSpritesV7(
  createSurface: (
    pixels: Uint8ClampedArray,
    width: number,
    height: number,
  ) => CanvasImageSource | null,
): FogLiftSpritesV7 {
  const cache = new Map<string, (FogLiftSpriteV7 | null | undefined)[]>();
  let budget: number = FOG_LIFT_V7.buildsPerFrame;
  let built = 0;
  const framesOf = (
    colourKey: string,
    variant: number,
  ): (FogLiftSpriteV7 | null | undefined)[] => {
    const key = `${colourKey}:${variant}`;
    let frames = cache.get(key);
    if (frames === undefined) {
      frames = [];
      cache.set(key, frames);
    }
    return frames;
  };
  const build = (
    frames: (FogLiftSpriteV7 | null | undefined)[],
    colours: FogPuffColoursV7,
    variant: number,
    frame: number,
  ): FogLiftSpriteV7 | null => {
    built += 1;
    const raster = fogLiftSpritePixelsV7(colours, variant, frame);
    const mask =
      raster === null
        ? null
        : createSurface(raster.mask, raster.width, raster.height);
    const rims =
      raster === null || mask === null
        ? null
        : createSurface(raster.rims, raster.width, raster.height);
    const sprite =
      raster === null || mask === null || rims === null
        ? null
        : {
            mask,
            rims,
            x: raster.x,
            y: raster.y,
            width: raster.width,
            height: raster.height,
          };
    frames[frame] = sprite;
    return sprite;
  };
  return {
    get built() {
      return built;
    },
    beginFrame() {
      budget = FOG_LIFT_V7.buildsPerFrame;
    },
    warm(colourKey, colours, count) {
      let left = count;
      for (let variant = 0; variant < FOG_LIFT_V7.variants; variant += 1) {
        const frames = framesOf(colourKey, variant);
        for (let frame = 0; frame < FOG_LIFT_V7.frames; frame += 1) {
          if (frames[frame] !== undefined) continue;
          if (left <= 0) return false;
          left -= 1;
          build(frames, colours, variant, frame);
        }
      }
      return true;
    },
    sprite(colourKey, colours, variant, frame) {
      const frames = framesOf(colourKey, variant);
      const known = frames[frame];
      if (known !== undefined) return known;
      if (budget > 0) {
        budget -= 1;
        return build(frames, colours, variant, frame);
      }
      for (let earlier = frame - 1; earlier >= 0; earlier -= 1) {
        const sprite = frames[earlier];
        if (sprite !== undefined && sprite !== null) return sprite;
      }
      return null;
    },
  };
}

/**
 * The scratch canvas the clouds' bodies are filled on, grown as needed
 * (never past the overlay's size in device px), made once per board.
 */
export interface FogLiftScratchV7 {
  ensure(
    width: number,
    height: number,
  ): {
    readonly canvas: HTMLCanvasElement;
    readonly context: CanvasRenderingContext2D;
  } | null;
}

export function createFogLiftScratchV7(document: Document): FogLiftScratchV7 {
  let made: {
    canvas: HTMLCanvasElement;
    context: CanvasRenderingContext2D;
  } | null = null;
  let failed = false;
  return {
    ensure(width, height) {
      if (failed) return null;
      try {
        if (made === null) {
          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d");
          if (
            context === null ||
            typeof context.drawImage !== "function" ||
            typeof context.setTransform !== "function"
          ) {
            failed = true;
            return null;
          }
          made = { canvas, context };
        }
        // Grown only, so a moving wave does not reallocate every frame.
        if (made.canvas.width < width) made.canvas.width = width;
        if (made.canvas.height < height) made.canvas.height = height;
        return made;
      } catch {
        failed = true;
        return null;
      }
    },
  };
}

export interface FogLiftDrawFrameV7 {
  readonly camera: CameraState;
  readonly devicePixelRatio: number;
  readonly viewport: { readonly width: number; readonly height: number };
  /** The fog wisps' clock (the board's), so a cover matches its cloud. */
  readonly timeMs: number;
}

export interface FogLiftLookV7 {
  /** The cloud's art in the live look, or null for the flat fog. */
  readonly art: FogArtV7 | null;
  /** The flat fog's colour (the classic look, or no pattern). */
  readonly flat: string;
  readonly colourKey: string;
  readonly colours: FogPuffColoursV7;
}

/** What one overlay frame of the lift drew. */
export interface FogLiftCostV7 {
  /** Cells drawn as a plain cover, and the paths that filled them. */
  readonly covers: number;
  readonly coverFills: number;
  /** Cells drawn as a cloud (two drawImage each, one fill for them all). */
  readonly puffs: number;
}

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const visibleIn = (
  viewport: FogLiftDrawFrameV7["viewport"],
  rect: Rect,
): boolean =>
  !(
    rect.x > viewport.width ||
    rect.y > viewport.height ||
    rect.x + rect.width < 0 ||
    rect.y + rect.height < 0
  );

/**
 * Draws the lifting cells on the overlay (CSS px, its transform set).
 *
 * A cell with a cloud: its rims go on the overlay first, then every
 * cloud's body is drawn as a mask on the scratch canvas, the fog's own
 * pattern (anchored to the board, as the board's fog) fills the masks in
 * one fill, and the result goes on the overlay in one drawImage. So the
 * clouds are the fog itself, and where two touch their bodies cover each
 * other's rims: only the edge of the whole wave has a rim, as the fog.
 *
 * A cell without one (reduced motion, over the cap, no scratch canvas):
 * a plain cover of the fog, batched into at most FOG_LIFT_V7.coverSteps
 * paths by alpha.
 */
export function drawFogLiftV7(
  context: CanvasRenderingContext2D,
  frame: FogLiftDrawFrameV7,
  lifts: readonly FogLiftDrawV7[],
  look: FogLiftLookV7,
  sprites: FogLiftSpritesV7 | null,
  scratch: FogLiftScratchV7 | null,
  fogNeighbours: readonly CoordV7[] = [],
): FogLiftCostV7 {
  // A stand-in context that cannot draw (a test's) draws nothing.
  if (
    typeof context.save !== "function" ||
    typeof context.restore !== "function"
  )
    return { covers: 0, coverFills: 0, puffs: 0 };
  const { viewport } = frame;
  const dpr = frame.devicePixelRatio > 0 ? frame.devicePixelRatio : 1;
  const clouds: { at: CoordV7; sprite: FogLiftSpriteV7; rect: Rect }[] = [];
  const covered: FogLiftDrawV7[] = [];
  sprites?.beginFrame();
  const canCloud =
    sprites !== null &&
    scratch !== null &&
    typeof context.drawImage === "function";
  for (const lift of lifts) {
    const sprite =
      canCloud && lift.puff !== null
        ? sprites.sprite(
            look.colourKey,
            look.colours,
            lift.puff.variant,
            lift.puff.frame,
          )
        : null;
    if (sprite === null) {
      covered.push(lift);
      continue;
    }
    const offset = fogLiftJitterV7(lift.at);
    const rect = chibiForestRectV7(frame, lift.at, {
      x: sprite.x + offset.x,
      y: sprite.y + offset.y,
      width: sprite.width,
      height: sprite.height,
    });
    if (visibleIn(viewport, rect)) clouds.push({ at: lift.at, sprite, rect });
  }
  const coverFills = drawCovers(context, frame, covered, look);
  let puffs = 0;
  if (clouds.length > 0 && scratch !== null) {
    let left = Number.POSITIVE_INFINITY;
    let top = Number.POSITIVE_INFINITY;
    let right = Number.NEGATIVE_INFINITY;
    let bottom = Number.NEGATIVE_INFINITY;
    for (const { rect } of clouds) {
      left = Math.min(left, rect.x);
      top = Math.min(top, rect.y);
      right = Math.max(right, rect.x + rect.width);
      bottom = Math.max(bottom, rect.y + rect.height);
    }
    // The box in device px, clipped to the overlay.
    const x0 = Math.max(0, Math.floor(left * dpr));
    const y0 = Math.max(0, Math.floor(top * dpr));
    const x1 = Math.min(
      Math.ceil(viewport.width * dpr),
      Math.ceil(right * dpr),
    );
    const y1 = Math.min(
      Math.ceil(viewport.height * dpr),
      Math.ceil(bottom * dpr),
    );
    const surface =
      x1 > x0 && y1 > y0 ? scratch.ensure(x1 - x0, y1 - y0) : null;
    if (surface !== null) {
      const smoothing = !isWholeScale(
        chibiMasterScale(frame.camera) * frame.devicePixelRatio,
      );
      // The rims, under every body; neither falls on the fog still
      // unexplored beside the wave (the same fog, or what is drawn over it).
      context.save();
      clipOutCells(context, frame, fogNeighbours);
      context.imageSmoothingEnabled = smoothing;
      for (const cloud of clouds)
        context.drawImage(
          cloud.sprite.rims,
          cloud.rect.x,
          cloud.rect.y,
          cloud.rect.width,
          cloud.rect.height,
        );
      context.restore();
      // The bodies: masks, filled with the fog where they are.
      const target = surface.context;
      target.save();
      target.setTransform(1, 0, 0, 1, 0, 0);
      target.globalCompositeOperation = "source-over";
      target.clearRect(0, 0, x1 - x0, y1 - y0);
      target.setTransform(dpr, 0, 0, dpr, -x0, -y0);
      target.imageSmoothingEnabled = smoothing;
      for (const cloud of clouds)
        target.drawImage(
          cloud.sprite.mask,
          cloud.rect.x,
          cloud.rect.y,
          cloud.rect.width,
          cloud.rect.height,
        );
      target.globalCompositeOperation = "source-in";
      fillFog(target, frame, look, clouds, { left, top, right, bottom });
      target.restore();
      context.save();
      clipOutCells(context, frame, fogNeighbours);
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.drawImage(
        surface.canvas,
        0,
        0,
        x1 - x0,
        y1 - y0,
        x0,
        y0,
        x1 - x0,
        y1 - y0,
      );
      context.restore();
      puffs = clouds.length;
    } else drawCovers(context, frame, clouds.map(coverOf(lifts)), look);
  }
  return { covers: covered.length, coverFills, puffs };
}

/** Clips `context` to everything but these cells (CSS px). */
function clipOutCells(
  context: CanvasRenderingContext2D,
  frame: FogLiftDrawFrameV7,
  cells: readonly CoordV7[],
): void {
  if (cells.length === 0 || typeof context.clip !== "function") return;
  context.beginPath();
  context.rect(0, 0, frame.viewport.width, frame.viewport.height);
  for (const at of cells) {
    const rect = chibiForestRectV7(frame, at, {
      x: 0,
      y: 0,
      width: 80,
      height: 80,
    });
    context.rect(rect.x, rect.y, rect.width, rect.height);
  }
  context.clip("evenodd");
}

/** The draw entries of these clouds' cells, for a plain cover instead. */
const coverOf =
  (lifts: readonly FogLiftDrawV7[]) =>
  (cloud: { at: CoordV7 }): FogLiftDrawV7 =>
    lifts.find(
      (lift) => lift.at.x === cloud.at.x && lift.at.y === cloud.at.y,
    ) ?? { at: cloud.at, coverAlpha: 1, puff: null };

/** Fills the box round the clouds with the fog (its pattern, or flat). */
function fillFog(
  target: CanvasRenderingContext2D,
  frame: FogLiftDrawFrameV7,
  look: FogLiftLookV7,
  clouds: readonly { at: CoordV7 }[],
  box: { left: number; top: number; right: number; bottom: number },
): void {
  const art = look.art;
  if (art !== null) {
    // The cells the masks can reach: a cloud spreads at most a cell out.
    let minX = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;
    for (const { at } of clouds) {
      minX = Math.min(minX, at.x);
      maxX = Math.max(maxX, at.x);
      minY = Math.min(minY, at.y);
      maxY = Math.max(maxY, at.y);
    }
    const runs: { y: number; x0: number; x1: number }[] = [];
    for (let y = minY - 1; y <= maxY + 1; y += 1)
      runs.push({ y, x0: minX - 1, x1: maxX + 1 });
    // The texture only: the faint drifting wisps would not stay inside.
    const textureOnly: FogArtV7 = {
      palette: art.palette,
      texture: () => art.texture(),
      wisps: () => null,
      edge: () => null,
    };
    if (art.texture() !== null) {
      const cells: FogCellsV7 = { runs, edges: new Map(), outside: [] };
      drawFogV7(target, { ...frame, sceneAlpha: 1 }, textureOnly, cells);
      return;
    }
  }
  target.fillStyle = look.flat;
  target.fillRect(
    box.left,
    box.top,
    box.right - box.left,
    box.bottom - box.top,
  );
}

/** Plain covers of the fog, batched by alpha step; returns the fills made. */
function drawCovers(
  context: CanvasRenderingContext2D,
  frame: FogLiftDrawFrameV7,
  lifts: readonly FogLiftDrawV7[],
  look: FogLiftLookV7,
): number {
  const steps = FOG_LIFT_V7.coverSteps;
  const groups = new Map<number, CoordV7[]>();
  for (const lift of lifts) {
    if (lift.coverAlpha <= 0) continue;
    const rect = chibiForestRectV7(frame, lift.at, {
      x: 0,
      y: 0,
      width: 80,
      height: 80,
    });
    if (!visibleIn(frame.viewport, rect)) continue;
    const step = Math.max(1, Math.ceil(lift.coverAlpha * steps));
    let group = groups.get(step);
    if (group === undefined) {
      group = [];
      groups.set(step, group);
    }
    group.push(lift.at);
  }
  let fills = 0;
  for (const [step, cells] of groups) {
    const alpha = step / steps;
    if (look.art !== null) {
      const runs = cells.map((at) => ({ y: at.y, x0: at.x, x1: at.x }));
      const fogCells: FogCellsV7 = { runs, edges: new Map(), outside: [] };
      drawFogV7(context, { ...frame, sceneAlpha: alpha }, look.art, fogCells);
    } else {
      context.save();
      context.globalAlpha = alpha;
      context.fillStyle = look.flat;
      context.beginPath();
      for (const at of cells) {
        const rect = chibiForestRectV7(frame, at, {
          x: 0,
          y: 0,
          width: 80,
          height: 80,
        });
        context.rect(rect.x, rect.y, rect.width, rect.height);
      }
      context.fill();
      context.restore();
    }
    fills += 1;
  }
  return fills;
}
