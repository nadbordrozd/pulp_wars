import type {
  CoordV7,
  FactionIdV7,
  PlayerViewV7,
  TerrainIdV7,
} from "../../engine/index";
import { territoryGroundV7 } from "../../assets/chibi-art-v7";
import { iceFolkSnowVariantV7 } from "../../assets/chibi-direction-ice-folk-presentation";
import type {
  BoardRenderPlanEntryV7,
  BoardRenderPlanV7,
} from "./board-renderer-v7";
import { factionColourV7 } from "./faction-colours-v7";
import { factionForestPlanMemberV7 } from "./faction-forests-v7";
import { factionGrassPlanMemberV7 } from "./faction-grass-v7";
import { TILE_HEIGHT, TILE_WIDTH, type CameraState } from "./geometry";
import {
  SNOW_EDGE_EAST_V7,
  SNOW_EDGE_NORTH_V7,
  SNOW_EDGE_SOUTH_V7,
  SNOW_EDGE_WEST_V7,
  type IceFolkSnowCellV7,
} from "./ice-folk-board-plan-v7";
import type { TileHopV7 } from "./terrain-ripple-v7";

/**
 * The victory wave (bead pulp_wars-556y, docs/art/VICTORY_WAVE.md). The
 * user, 2026-10-09: "when you win the game I want an animation of all the
 * tiles jumping and taking your faction skin. All tiles even outside of
 * any city borders. Even if humans win do it."
 *
 * When the viewer wins (a Domination victory, or a Perfection match the
 * viewer wins by score), a wave starts at the viewer's capital (or, when
 * the capital is lost, the city captured last) and runs outward over the
 * whole explored board, in rings. Each land cell squashes, springs up and,
 * at the top of its hop, takes the winner's faction ground and trees: the
 * faction grass, the faction forest, the Undead ground, the Ice Folk Snow.
 * Water keeps its look and ripples as the wave passes. A Human win turns
 * every cell to the default (Human) look and adds a golden sparkle per
 * cell, so the change still reads. Units, cities and buildings stay as
 * they are. The board then stays in the winner's skin behind the Victory
 * dialog, which waits for the wave (the player can skip the wait with any
 * click or key). A defeat plays nothing.
 *
 * With reduced motion (the system's or the game's Motion setting) there is
 * no wave, no hop, no ripple and no sparkle: the board crossfades to the
 * skin in VICTORY_WAVE_V7.fadeMs, and the dialog waits only for that.
 *
 * Presentation only: no rule, number, save or identity changes. To turn
 * it off: set VICTORY_WAVE_ENABLED_V7 to false, or open the game with
 * `?victory-wave=0` (the board then keeps its look, as before the bead).
 */

/** The master switch. False draws the end of a match as before the bead. */
export const VICTORY_WAVE_ENABLED_V7 = true;

/** `?victory-wave=0` (or `off`, `false`) turns it off, `=1` on. */
export const VICTORY_WAVE_PARAMETER_V7 = "victory-wave";

export function victoryWaveEnabledV7(search?: string): boolean {
  const query =
    search ??
    (globalThis as { location?: { search?: string } }).location?.search ??
    "";
  let value: string | null;
  try {
    value = new URLSearchParams(query).get(VICTORY_WAVE_PARAMETER_V7);
  } catch {
    value = null;
  }
  if (value === null) return VICTORY_WAVE_ENABLED_V7;
  const text = value.trim().toLowerCase();
  if (text === "0" || text === "off" || text === "false") return false;
  if (text === "1" || text === "on" || text === "true") return true;
  return VICTORY_WAVE_ENABLED_V7;
}

export const VICTORY_WAVE_V7 = {
  /** The time from one ring to the next, ms: at most. */
  stepMs: 75,
  /** The longest the rings' starts are spread over, ms (a 25 x 25 board). */
  spreadMs: 1500,
  /** One hop, ms. */
  hopMs: 520,
  /** The hop's phases, as shares of it (see victoryHopV7). */
  crouch: 0.14,
  apex: 0.48,
  land: 0.8,
  settle: 0.88,
  /** The top of a hop as a share of the cell's side (11 px of 80). */
  height: 0.14,
  /**
   * A Human win's hop, taller: the default look does not change, so the
   * jump itself has to read (18 px of 80).
   */
  humanHeight: 0.22,
  /** The widest a cell gets while it crouches and lands, as a share. */
  widen: 0.05,
  /** The little bounce after landing, as a share of the hop's height. */
  bounce: 0.16,
  /** A water cell's rings: how many, how far apart, how long each. */
  ripples: 2,
  rippleGapMs: 150,
  rippleMs: 620,
  /** A Human win's sparkles per cell, their stagger and their life, ms. */
  sparkles: 3,
  sparkleGapMs: 100,
  sparkleMs: 760,
  /**
   * The glow over a cell from the top of its hop: how long it fades, the
   * share of that spent flaring up, and its strongest opacity. A Human
   * win's glow is gold and strong (the ring of light is what reads); every
   * other winner's is its faction colour and faint (its ground changes).
   */
  glowMs: 420,
  glowRise: 0.15,
  humanGlow: { color: "#ffc93c", alpha: 0.6 },
  factionGlowAlpha: 0.22,
  /** Reduced motion, a Human win: a gold tint over the crossfade. */
  humanFadeTint: 0.45,
  /** The pause between the last landing and the Victory dialog, ms. */
  dialogBeatMs: 350,
  /** Reduced motion: the crossfade to the skin, ms. */
  fadeMs: 450,
  /** The longest the dialog ever waits for the wave, ms. */
  dialogHoldLimitMs: 9000,
} as const;

const key = (at: CoordV7): string => `${at.x},${at.y}`;

/** Who won a victory the viewer should see as a wave, and as which faction. */
export interface VictoryWaveTriggerV7 {
  readonly winnerId: PlayerViewV7["viewer"]["id"];
  readonly faction: FactionIdV7;
  /** A Perfection match decided by the score. */
  readonly byScore: boolean;
}

/**
 * The victory a view shows its viewer, or null: the viewer won (by
 * elimination, or a Perfection match by the score). A defeat, a match
 * still on, and a headless result give null.
 */
export function victoryWaveTriggerV7(
  view: Pick<PlayerViewV7, "outcome" | "viewer" | "players">,
): VictoryWaveTriggerV7 | null {
  const outcome = view.outcome;
  if (outcome === null || outcome.kind !== "VICTORY") return null;
  if (outcome.winnerId !== view.viewer.id) return null;
  const winner = view.players.find((player) => player.id === outcome.winnerId);
  return {
    winnerId: outcome.winnerId,
    faction: winner?.faction ?? view.viewer.faction,
    byScore: outcome.decidedBy === "SCORE",
  };
}

/**
 * Where the wave starts: the winner's capital, else the city the winner
 * captured last (`lastCaptured`, when it is still the winner's), else any
 * city of the winner's, else the middle of the board.
 */
export function victoryWaveOriginV7(
  view: Pick<PlayerViewV7, "cities" | "board">,
  winnerId: number,
  lastCaptured: CoordV7 | null = null,
): CoordV7 {
  const own = view.cities.filter((city) => city.ownerId === winnerId);
  const capital = own.find((city) => city.isCapital);
  if (capital !== undefined) return capital.at;
  if (
    lastCaptured !== null &&
    own.some(
      (city) => city.at.x === lastCaptured.x && city.at.y === lastCaptured.y,
    )
  )
    return lastCaptured;
  const first = own[0];
  if (first !== undefined) return first.at;
  return {
    x: Math.floor(view.board.width / 2),
    y: Math.floor(view.board.height / 2),
  };
}

/** The cities whose owner became `ownerId` from `before` to `after`. */
export function capturedCitiesV7(
  before: Pick<PlayerViewV7, "cities">,
  after: Pick<PlayerViewV7, "cities">,
  ownerId: number,
): CoordV7[] {
  const was = new Map(before.cities.map((city) => [city.id, city.ownerId]));
  return after.cities
    .filter(
      (city) =>
        city.ownerId === ownerId &&
        was.has(city.id) &&
        was.get(city.id) !== ownerId,
    )
    .map((city) => city.at);
}

/** One cell of the wave: its ring, and whether it is water. */
export interface VictoryWaveCellV7 {
  readonly at: CoordV7;
  readonly ring: number;
  readonly water: boolean;
}

const isWater = (terrain: TerrainIdV7): boolean =>
  terrain === "SHALLOW_WATER" || terrain === "DEEP_WATER";

/**
 * The explored cells of a view in rings around `origin`: a cell's ring is
 * its distance from the origin's centre, rounded. The cells of one ring
 * hop together, so the wave is a widening circle. Unexplored cells are
 * left out: the fog stays as it is.
 */
export function victoryWaveRingsV7(
  view: Pick<PlayerViewV7, "board">,
  origin: CoordV7,
): { readonly rings: readonly (readonly VictoryWaveCellV7[])[] } {
  const rings: VictoryWaveCellV7[][] = [];
  for (const tile of view.board.tiles) {
    if (!tile.explored) continue;
    const ring = Math.round(
      Math.hypot(tile.at.x - origin.x, tile.at.y - origin.y),
    );
    const cells = rings[ring] ?? [];
    cells.push({ at: tile.at, ring, water: isWater(tile.terrain) });
    rings[ring] = cells;
  }
  for (let ring = 0; ring < rings.length; ring += 1) rings[ring] ??= [];
  return { rings };
}

/** The time between two rings when the farthest is `maxRing`, ms. */
export function victoryWaveStepMsV7(maxRing: number): number {
  const { stepMs, spreadMs } = VICTORY_WAVE_V7;
  return maxRing <= 0 ? stepMs : Math.min(stepMs, spreadMs / maxRing);
}

/** From the wave's start until its last cell has landed, ms. */
export function victoryWaveDurationMsV7(maxRing: number): number {
  return (
    Math.max(0, maxRing) * victoryWaveStepMsV7(maxRing) + VICTORY_WAVE_V7.hopMs
  );
}

const easeOut = (t: number): number => 1 - (1 - t) * (1 - t);
const easeIn = (t: number): number => t * t;

/**
 * A land cell `elapsedMs` into its hop: `lift` is the top's rise as a
 * share of the hop's height (0 to 1), `widen` the extra width as a share
 * of the cell. It crouches (wider, not lower: a lower cell would open a
 * gap above it), springs up fast and slows, falls, lands wide, and bounces
 * once a little.
 */
export function victoryHopV7(elapsedMs: number): {
  readonly lift: number;
  readonly widen: number;
} {
  const spec = VICTORY_WAVE_V7;
  if (elapsedMs <= 0 || elapsedMs >= spec.hopMs) return { lift: 0, widen: 0 };
  const p = elapsedMs / spec.hopMs;
  if (p < spec.crouch)
    return {
      lift: 0,
      widen: spec.widen * Math.sin((Math.PI * p) / spec.crouch),
    };
  if (p < spec.apex)
    return {
      lift: easeOut((p - spec.crouch) / (spec.apex - spec.crouch)),
      widen: 0,
    };
  if (p < spec.land)
    return {
      lift: 1 - easeIn((p - spec.apex) / (spec.land - spec.apex)),
      widen: 0,
    };
  if (p < spec.settle)
    return {
      lift: 0,
      widen:
        spec.widen *
        0.7 *
        Math.sin((Math.PI * (p - spec.land)) / (spec.settle - spec.land)),
    };
  return {
    lift:
      spec.bounce * Math.sin((Math.PI * (p - spec.settle)) / (1 - spec.settle)),
    widen: 0,
  };
}

/**
 * A cell's glow `sinceTopMs` after the top of its hop: 0 to 1. It flares up
 * fast and fades out (ease out) over VICTORY_WAVE_V7.glowMs.
 */
export function victoryGlowV7(sinceTopMs: number): number {
  const { glowMs, glowRise } = VICTORY_WAVE_V7;
  if (sinceTopMs <= 0 || sinceTopMs >= glowMs) return 0;
  const t = sinceTopMs / glowMs;
  if (t < glowRise) return t / glowRise;
  const fall = (t - glowRise) / (1 - glowRise);
  return (1 - fall) * (1 - fall);
}

/** Whether a cell shows the winner's skin `elapsedMs` into its hop. */
export function victoryHopSwappedV7(elapsedMs: number): boolean {
  return elapsedMs >= VICTORY_WAVE_V7.hopMs * VICTORY_WAVE_V7.apex;
}

// --------------------------------------------------------------- the skin

/** The skin members of a terrain entry, as the winner's faction draws it. */
export interface VictoryTerrainSkinV7 {
  readonly territoryGround?: BoardRenderPlanEntryV7["territoryGround"];
  readonly factionGrass?: BoardRenderPlanEntryV7["factionGrass"];
  readonly factionForest?: BoardRenderPlanEntryV7["factionForest"];
  /** The cell is Snow (an Ice Folk win, on land). */
  readonly snow: boolean;
}

/**
 * The look a cell of `terrain` takes in `faction`'s skin: the members the
 * board plan gives a cell inside that faction's territory (the same
 * helpers: faction-grass-v7.ts, faction-forests-v7.ts, territoryGroundV7),
 * and Snow on every land cell of an Ice Folk win (water and the Rift are
 * never Snow). Humans (ORIGINAL) have the default look: no member at all.
 */
export function victoryTerrainSkinV7(
  terrain: TerrainIdV7,
  faction: FactionIdV7,
): VictoryTerrainSkinV7 {
  const ground =
    terrain === "GRASS" || terrain === "FOREST" || terrain === "MOUNTAIN"
      ? territoryGroundV7(faction)
      : null;
  return {
    ...(ground === null ? {} : { territoryGround: ground }),
    ...factionGrassPlanMemberV7(terrain, faction),
    ...factionForestPlanMemberV7(terrain, faction),
    snow: faction === "ICE_FOLK" && !isWater(terrain) && terrain !== "RIFT",
  };
}

/**
 * The plan in the winner's skin: every explored terrain entry takes the
 * faction's ground, trees and Snow (victoryTerrainSkinV7) in place of its
 * territory's. Everything else (water art, the Blizzard, sea ice, Roads,
 * buildings, cities, units, borders) is unchanged. The entries keep their
 * order and their indices.
 */
export function victorySkinPlanV7(
  plan: BoardRenderPlanV7,
  view: Pick<PlayerViewV7, "board">,
  faction: FactionIdV7,
): BoardRenderPlanV7 {
  const { width, height, tiles } = view.board;
  const terrainAt = (x: number, y: number): TerrainIdV7 | null => {
    if (x < 0 || y < 0 || x >= width || y >= height) return null;
    const tile = tiles[y * width + x];
    return tile === undefined || !tile.explored ? null : tile.terrain;
  };
  const snowy = (x: number, y: number): boolean => {
    const terrain = terrainAt(x, y);
    return terrain !== null && victoryTerrainSkinV7(terrain, faction).snow;
  };
  const snowCell = (at: CoordV7): IceFolkSnowCellV7 => {
    let edges = 0;
    for (const [bit, dx, dy] of [
      [SNOW_EDGE_NORTH_V7, 0, -1],
      [SNOW_EDGE_EAST_V7, 1, 0],
      [SNOW_EDGE_SOUTH_V7, 0, 1],
      [SNOW_EDGE_WEST_V7, -1, 0],
    ] as const) {
      const x = at.x + dx;
      const y = at.y + dy;
      // The board's edge is not cut, as for the game's own Snow.
      if (x < 0 || y < 0 || x >= width || y >= height) continue;
      if (!snowy(x, y)) edges |= bit;
    }
    return { edges, variant: iceFolkSnowVariantV7(at) };
  };
  return {
    ...plan,
    entries: plan.entries.map((entry) => {
      if (entry.kind !== "TERRAIN") return entry;
      const terrain = terrainAt(entry.at.x, entry.at.y);
      if (terrain === null) return entry;
      const skin = victoryTerrainSkinV7(terrain, faction);
      const snow = entry.snow;
      // The members of the cell's own territory give way to the winner's.
      const rest: Partial<Record<keyof BoardRenderPlanEntryV7, unknown>> = {
        ...entry,
      };
      delete rest.territoryGround;
      delete rest.factionGrass;
      delete rest.factionForest;
      delete rest.snow;
      // The Blizzard's Snow stays where the storm still blows.
      const keepSnow =
        snow !== undefined && entry.blizzard === true && !isWater(terrain);
      return {
        ...(rest as BoardRenderPlanEntryV7),
        ...(skin.territoryGround === undefined
          ? {}
          : { territoryGround: skin.territoryGround }),
        ...(skin.factionGrass === undefined
          ? {}
          : { factionGrass: skin.factionGrass }),
        ...(skin.factionForest === undefined
          ? {}
          : { factionForest: skin.factionForest }),
        ...(skin.snow
          ? { snow: snowCell(entry.at) }
          : keepSnow
            ? { snow }
            : {}),
      };
    }),
  };
}

// --------------------------------------------------------------- the wave

/** How the wave shows: a wave, a crossfade, or the skin at once. */
export type VictoryWaveModeV7 = "WAVE" | "FADE" | "INSTANT";

/** A water cell's ring this frame: `progress` 0 to 1 of its life. */
export interface VictoryRippleV7 {
  readonly at: CoordV7;
  readonly progress: number;
}

/** A sparkle this frame: its cell, its place in it, `progress` 0 to 1. */
export interface VictorySparkleV7 {
  readonly at: CoordV7;
  /** The offset from the cell's centre, as shares of the cell (-0.5..0.5). */
  readonly dx: number;
  readonly dy: number;
  readonly progress: number;
}

/** A cell's glow this frame: its strength, 0 to 1 of the strongest. */
export interface VictoryGlowV7 {
  readonly at: CoordV7;
  readonly strength: number;
}

/** What the board draws of the wave this frame, besides the plan and hops. */
export interface VictoryWaveFrameV7 {
  /** The glows, all of one colour and strongest opacity. */
  readonly glows: readonly VictoryGlowV7[];
  readonly glowColor: string;
  readonly glowAlpha: number;
  /** The board's size in cells: the glows stay on it. */
  readonly board: { readonly width: number; readonly height: number };
  readonly ripples: readonly VictoryRippleV7[];
  readonly sparkles: readonly VictorySparkleV7[];
}

interface Wave {
  readonly view: PlayerViewV7;
  readonly trigger: VictoryWaveTriggerV7;
  readonly mode: VictoryWaveModeV7;
  readonly startMs: number;
  readonly origin: CoordV7;
  readonly rings: readonly (readonly VictoryWaveCellV7[])[];
  /** The ring of each explored cell, by "x,y". */
  readonly ringOf: ReadonlyMap<string, number>;
  readonly stepMs: number;
  readonly durationMs: number;
}

export interface VictoryWaveV7 {
  /**
   * Shows the wave a view about to be drawn. The first view of a match
   * that is already won (a finished save) shows the skin at once; a later
   * view that is the viewer's victory starts the wave in `mode`. Every
   * other view only keeps track of the cities the viewer takes.
   */
  observe(
    view: PlayerViewV7,
    match: unknown,
    nowMs: number,
    mode: VictoryWaveModeV7,
  ): void;
  /** The plan as this frame shows it: the cells changed so far skinned. */
  plan(
    plan: BoardRenderPlanV7,
    view: PlayerViewV7,
    nowMs: number,
  ): BoardRenderPlanV7;
  /**
   * Reduced motion: how much of the skinned plan shows over the unskinned
   * one (0 to 1), or null when the skin is not crossfading now.
   */
  fade(view: PlayerViewV7, nowMs: number): number | null;
  /** The land cells in the air this frame. */
  hops(view: PlayerViewV7, nowMs: number): TileHopV7[];
  /** The water rings and sparkles this frame, or null. */
  frame(view: PlayerViewV7, nowMs: number): VictoryWaveFrameV7 | null;
  /** Whether the board still needs frames for the wave. */
  active(nowMs: number): boolean;
  /** The clock's time at which the Victory dialog may show, or null. */
  readonly settledAtMs: number | null;
  /** The clock's time when the wave started (null: none in this match). */
  readonly startedAtMs: number | null;
  readonly mode: VictoryWaveModeV7 | null;
  /** The wave's start cell and faction, for tests and review tooling. */
  readonly origin: CoordV7 | null;
  readonly faction: FactionIdV7 | null;
  /** Forgets everything. */
  reset(): void;
}

/** A small, stable hash of a cell and a number, 0 to 1. */
function hash01(x: number, y: number, n: number): number {
  let h = (x * 374761393 + y * 668265263 + n * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

export function createVictoryWaveV7(): VictoryWaveV7 {
  let match: unknown = null;
  let seen = false;
  let last: PlayerViewV7 | null = null;
  let lastCaptured: CoordV7 | null = null;
  let wave: Wave | null = null;
  const skinned = new WeakMap<BoardRenderPlanV7, BoardRenderPlanV7>();
  let partial: {
    readonly plan: BoardRenderPlanV7;
    readonly ring: number;
    readonly result: BoardRenderPlanV7;
  } | null = null;

  const shows = (view: PlayerViewV7): boolean =>
    wave !== null &&
    (view === wave.view ||
      (view.outcome !== null &&
        view.commandIndex >= wave.view.commandIndex &&
        victoryWaveTriggerV7(view) !== null));

  const start = (
    view: PlayerViewV7,
    trigger: VictoryWaveTriggerV7,
    nowMs: number,
    mode: VictoryWaveModeV7,
  ): void => {
    const origin = victoryWaveOriginV7(view, trigger.winnerId, lastCaptured);
    const { rings } = victoryWaveRingsV7(view, origin);
    const ringOf = new Map<string, number>();
    for (const cells of rings)
      for (const cell of cells) ringOf.set(key(cell.at), cell.ring);
    const maxRing = Math.max(0, rings.length - 1);
    wave = {
      view,
      trigger,
      mode,
      startMs: nowMs,
      origin,
      rings,
      ringOf,
      stepMs: victoryWaveStepMsV7(maxRing),
      durationMs:
        mode === "WAVE"
          ? victoryWaveDurationMsV7(maxRing)
          : mode === "FADE"
            ? VICTORY_WAVE_V7.fadeMs
            : 0,
    };
    partial = null;
  };

  const fullSkin = (
    plan: BoardRenderPlanV7,
    current: Wave,
  ): BoardRenderPlanV7 => {
    let result = skinned.get(plan);
    if (result === undefined) {
      result = victorySkinPlanV7(plan, current.view, current.trigger.faction);
      skinned.set(plan, result);
    }
    return result;
  };

  return {
    observe(view, instance, nowMs, mode) {
      if (!seen || instance !== match) {
        match = instance;
        seen = true;
        last = view;
        lastCaptured = null;
        wave = null;
        partial = null;
        const won = victoryWaveTriggerV7(view);
        if (won !== null) start(view, won, nowMs, "INSTANT");
        return;
      }
      if (wave !== null || view === last) return;
      const won = victoryWaveTriggerV7(view);
      if (last !== null) {
        const taken = capturedCitiesV7(last, view, view.viewer.id).at(-1);
        if (taken !== undefined) lastCaptured = taken;
      }
      last = view;
      if (won !== null) start(view, won, nowMs, mode);
    },
    plan(plan, view, nowMs) {
      const current = wave;
      if (current === null || !shows(view)) return plan;
      const full = fullSkin(plan, current);
      if (current.mode !== "WAVE") return full;
      const elapsed =
        nowMs - current.startMs - VICTORY_WAVE_V7.hopMs * VICTORY_WAVE_V7.apex;
      if (elapsed < 0) return plan;
      const ring = Math.floor(elapsed / current.stepMs);
      if (ring >= current.rings.length - 1) return full;
      if (partial?.plan === plan && partial.ring === ring)
        return partial.result;
      const result = {
        ...plan,
        entries: plan.entries.map((entry, index) =>
          entry.kind === "TERRAIN" &&
          (current.ringOf.get(key(entry.at)) ?? Infinity) <= ring
            ? (full.entries[index] ?? entry)
            : entry,
        ),
      };
      partial = { plan, ring, result };
      return result;
    },
    fade(view, nowMs) {
      const current = wave;
      if (current === null || current.mode !== "FADE" || !shows(view))
        return null;
      const progress = (nowMs - current.startMs) / VICTORY_WAVE_V7.fadeMs;
      return progress >= 1 ? null : Math.max(0, progress);
    },
    hops(view, nowMs) {
      const current = wave;
      if (current === null || current.mode !== "WAVE" || !shows(view))
        return [];
      const hops: TileHopV7[] = [];
      const { hopMs } = VICTORY_WAVE_V7;
      const height =
        current.trigger.faction === "ORIGINAL"
          ? VICTORY_WAVE_V7.humanHeight
          : VICTORY_WAVE_V7.height;
      const elapsed = nowMs - current.startMs;
      const first = Math.max(0, Math.ceil((elapsed - hopMs) / current.stepMs));
      const lastRing = Math.min(
        current.rings.length - 1,
        Math.floor(elapsed / current.stepMs),
      );
      for (let ring = first; ring <= lastRing; ring += 1) {
        const hop = victoryHopV7(elapsed - ring * current.stepMs);
        if (hop.lift <= 0 && hop.widen <= 0) continue;
        for (const cell of current.rings[ring] ?? [])
          if (!cell.water)
            hops.push({
              at: cell.at,
              lift: hop.lift,
              height,
              ...(hop.widen > 0 ? { widen: hop.widen } : {}),
            });
      }
      return hops;
    },
    frame(view, nowMs) {
      const current = wave;
      if (current === null || current.mode !== "WAVE" || !shows(view))
        return null;
      const spec = VICTORY_WAVE_V7;
      const elapsed = nowMs - current.startMs;
      const swapAt = spec.hopMs * spec.apex;
      const rippleLife = (spec.ripples - 1) * spec.rippleGapMs + spec.rippleMs;
      const human = current.trigger.faction === "ORIGINAL";
      const sparkleLife =
        (spec.sparkles - 1) * spec.sparkleGapMs + spec.sparkleMs;
      const reach = Math.max(
        rippleLife,
        swapAt + spec.glowMs,
        human ? swapAt + sparkleLife : 0,
      );
      const first = Math.max(0, Math.ceil((elapsed - reach) / current.stepMs));
      const lastRing = Math.min(
        current.rings.length - 1,
        Math.floor(elapsed / current.stepMs),
      );
      const ripples: VictoryRippleV7[] = [];
      const sparkles: VictorySparkleV7[] = [];
      const glows: VictoryGlowV7[] = [];
      for (let ring = first; ring <= lastRing; ring += 1) {
        const since = elapsed - ring * current.stepMs;
        const glow = victoryGlowV7(since - swapAt);
        for (const cell of current.rings[ring] ?? []) {
          if (glow > 0) glows.push({ at: cell.at, strength: glow });
          if (cell.water)
            for (let index = 0; index < spec.ripples; index += 1) {
              const t = (since - index * spec.rippleGapMs) / spec.rippleMs;
              if (t > 0 && t < 1) ripples.push({ at: cell.at, progress: t });
            }
          if (!human) continue;
          for (let index = 0; index < spec.sparkles; index += 1) {
            const t =
              (since - swapAt - index * spec.sparkleGapMs) / spec.sparkleMs;
            if (t <= 0 || t >= 1) continue;
            sparkles.push({
              at: cell.at,
              dx: hash01(cell.at.x, cell.at.y, index * 2) * 0.7 - 0.35,
              dy: hash01(cell.at.x, cell.at.y, index * 2 + 1) * 0.6 - 0.38,
              progress: t,
            });
          }
        }
      }
      return ripples.length === 0 && sparkles.length === 0 && glows.length === 0
        ? null
        : {
            ripples,
            sparkles,
            glows,
            glowColor: human
              ? spec.humanGlow.color
              : factionColourV7(current.trigger.faction),
            glowAlpha: human ? spec.humanGlow.alpha : spec.factionGlowAlpha,
            board: {
              width: current.view.board.width,
              height: current.view.board.height,
            },
          };
    },
    active(nowMs) {
      const current = wave;
      if (current === null || current.mode === "INSTANT") return false;
      const spec = VICTORY_WAVE_V7;
      const tail =
        current.mode === "WAVE"
          ? Math.max(
              (spec.ripples - 1) * spec.rippleGapMs + spec.rippleMs,
              spec.hopMs * spec.apex +
                (spec.sparkles - 1) * spec.sparkleGapMs +
                spec.sparkleMs,
              spec.hopMs * spec.apex + spec.glowMs,
            ) - spec.hopMs
          : 0;
      return nowMs < current.startMs + current.durationMs + Math.max(0, tail);
    },
    get settledAtMs() {
      const current = wave;
      if (current === null) return null;
      return current.mode === "WAVE"
        ? current.startMs + current.durationMs + VICTORY_WAVE_V7.dialogBeatMs
        : current.startMs + current.durationMs;
    },
    get startedAtMs() {
      return wave?.startMs ?? null;
    },
    get mode() {
      return wave?.mode ?? null;
    },
    get origin() {
      return wave?.origin ?? null;
    },
    get faction() {
      return wave?.trigger.faction ?? null;
    },
    reset() {
      match = null;
      seen = false;
      last = null;
      lastCaptured = null;
      wave = null;
      partial = null;
    },
  };
}

// ---------------------------------------------------------------- drawing

interface DrawFrameV7 {
  readonly camera: CameraState;
  readonly devicePixelRatio: number;
  readonly sceneAlpha: number;
}

const snap = (value: number, ratio: number): number =>
  Math.round(value * ratio) / ratio;

/**
 * The rings a passing wave leaves on water: thin pale ellipses that widen
 * from the cell's centre and fade. Drawn over the ground and Roads, under
 * trees, rocks, buildings and units.
 */
export function drawVictoryRipplesV7(
  context: CanvasRenderingContext2D,
  frame: DrawFrameV7,
  ripples: readonly VictoryRippleV7[],
): void {
  if (ripples.length === 0) return;
  const { camera, devicePixelRatio: ratio } = frame;
  const cell = TILE_WIDTH * camera.zoom;
  const line = Math.max(1, Math.round(1.5 * camera.zoom * ratio)) / ratio;
  context.save();
  context.lineWidth = line;
  for (const ripple of ripples) {
    const x = camera.offsetX + ripple.at.x * TILE_WIDTH * camera.zoom;
    const y = camera.offsetY + ripple.at.y * TILE_HEIGHT * camera.zoom;
    const t = ripple.progress;
    const radius = cell * (0.1 + 0.36 * easeOut(t));
    context.globalAlpha =
      frame.sceneAlpha * 0.62 * (1 - t) * Math.min(1, t * 6);
    context.strokeStyle = "#e9fbff";
    context.beginPath();
    context.ellipse(
      snap(x, ratio),
      snap(y, ratio),
      radius,
      radius * 0.62,
      0,
      0,
      Math.PI * 2,
    );
    context.stroke();
  }
  context.restore();
}

/**
 * A Human win's sparkles: small four-pointed golden stars that flare and
 * fade over each cell as it changes, drifting up a little. Drawn over
 * everything on the board.
 */
export function drawVictorySparklesV7(
  context: CanvasRenderingContext2D,
  frame: DrawFrameV7,
  sparkles: readonly VictorySparkleV7[],
): void {
  if (sparkles.length === 0) return;
  const { camera, devicePixelRatio: ratio } = frame;
  const cell = TILE_WIDTH * camera.zoom;
  const px = (value: number): number =>
    Math.max(1, Math.round(value * camera.zoom * ratio)) / ratio;
  context.save();
  for (const sparkle of sparkles) {
    const t = sparkle.progress;
    const flare = Math.sin(Math.PI * t);
    const x = snap(
      camera.offsetX +
        sparkle.at.x * TILE_WIDTH * camera.zoom +
        sparkle.dx * cell,
      ratio,
    );
    const y = snap(
      camera.offsetY +
        sparkle.at.y * TILE_HEIGHT * camera.zoom +
        sparkle.dy * cell -
        t * 0.12 * cell,
      ratio,
    );
    const arm = px(9 + 15 * flare);
    const waist = Math.max(px(2), arm * 0.22);
    const core = px(3 + 3 * flare);
    const outline = px(1.6);
    const star = (): void => {
      context.beginPath();
      context.moveTo(x, y - arm);
      context.lineTo(x + waist, y - waist);
      context.lineTo(x + arm, y);
      context.lineTo(x + waist, y + waist);
      context.lineTo(x, y + arm);
      context.lineTo(x - waist, y + waist);
      context.lineTo(x - arm, y);
      context.lineTo(x - waist, y - waist);
      context.closePath();
    };
    // A soft warm halo, then the star in gold, outlined, with a white heart.
    context.globalAlpha = frame.sceneAlpha * 0.4 * flare;
    context.fillStyle = "#ffe27a";
    context.beginPath();
    context.arc(x, y, arm * 0.7, 0, Math.PI * 2);
    context.fill();
    context.globalAlpha = frame.sceneAlpha * Math.min(1, flare * 1.6);
    star();
    context.lineJoin = "miter";
    context.lineWidth = outline * 2;
    context.strokeStyle = "#7a4a00";
    context.stroke();
    context.fillStyle = "#ffd23f";
    context.fill();
    context.fillStyle = "#fff8d6";
    context.fillRect(x - core / 2, y - core / 2, core, core);
  }
  context.restore();
}

/**
 * The glow over each cell from the top of its hop: a soft round wash of
 * one colour over the cell, lightening what lies under it (screen
 * blending), so the passing wave reads as a ring of light. Drawn over everything on the
 * board, under a Human win's sparkles.
 */
export function drawVictoryGlowsV7(
  context: CanvasRenderingContext2D,
  frame: DrawFrameV7,
  wave: Pick<VictoryWaveFrameV7, "glows" | "glowColor" | "glowAlpha" | "board">,
): void {
  if (wave.glows.length === 0) return;
  const { camera } = frame;
  const cell = TILE_WIDTH * camera.zoom;
  const cellHeight = TILE_HEIGHT * camera.zoom;
  // A soft round blob a little wider than the cell, so the glows of
  // neighbouring cells melt into one band with no square edge.
  const radius = cell * 0.82;
  context.save();
  // Only over the board: never a halo on the sky round it.
  context.beginPath();
  context.rect(
    camera.offsetX - cell / 2,
    camera.offsetY - cellHeight / 2,
    wave.board.width * cell,
    wave.board.height * cellHeight,
  );
  context.clip();
  context.globalCompositeOperation = "screen";
  const sprite = glowSprite(context, wave.glowColor);
  for (const glow of wave.glows) {
    const x = camera.offsetX + glow.at.x * TILE_WIDTH * camera.zoom;
    const y = camera.offsetY + glow.at.y * TILE_HEIGHT * camera.zoom;
    context.globalAlpha = frame.sceneAlpha * wave.glowAlpha * glow.strength;
    if (sprite !== null)
      context.drawImage(sprite, x - radius, y - radius, radius * 2, radius * 2);
    else {
      const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
      addGlowStops(gradient, wave.glowColor);
      context.fillStyle = gradient;
      context.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    }
  }
  context.restore();
}

/** The soft round glow's colour stops, opaque at the centre. */
function addGlowStops(gradient: CanvasGradient, colour: string): void {
  const [r, g, b] = rgbOf(colour);
  gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 1)`);
  gradient.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, 0.8)`);
  gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
}

const GLOW_SPRITE_PX = 64;
const glowSprites = new Map<string, CanvasImageSource | null>();

/**
 * The glow of one colour drawn once on a small canvas of its own, so a
 * frame of the wave stamps it rather than building a gradient a cell.
 * Null where no canvas can be made (the caller draws the gradient).
 */
function glowSprite(
  context: CanvasRenderingContext2D,
  colour: string,
): CanvasImageSource | null {
  if (glowSprites.has(colour)) return glowSprites.get(colour) ?? null;
  const sprite = paintGlowSprite(context, colour);
  glowSprites.set(colour, sprite);
  return sprite;
}

function paintGlowSprite(
  context: CanvasRenderingContext2D,
  colour: string,
): HTMLCanvasElement | null {
  try {
    const owner = (context.canvas as Partial<HTMLCanvasElement>).ownerDocument;
    const sprite = owner?.createElement("canvas") ?? null;
    const paint = sprite?.getContext("2d") ?? null;
    if (sprite === null || paint === null) return null;
    sprite.width = GLOW_SPRITE_PX;
    sprite.height = GLOW_SPRITE_PX;
    const half = GLOW_SPRITE_PX / 2;
    const gradient = paint.createRadialGradient(
      half,
      half,
      0,
      half,
      half,
      half,
    );
    addGlowStops(gradient, colour);
    paint.fillStyle = gradient;
    paint.fillRect(0, 0, GLOW_SPRITE_PX, GLOW_SPRITE_PX);
    return sprite;
  } catch {
    return null;
  }
}

/** The red, green and blue of a `#rrggbb` colour (grey for any other). */
function rgbOf(colour: string): readonly [number, number, number] {
  const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(colour);
  if (match === null) return [200, 200, 200];
  return [
    Number.parseInt(match[1] ?? "c8", 16),
    Number.parseInt(match[2] ?? "c8", 16),
    Number.parseInt(match[3] ?? "c8", 16),
  ];
}

/**
 * Reduced motion, a Human win: a gold tint over the board while it
 * crossfades (`progress` 0 to 1), strongest halfway, so the change shows
 * although the default look does not change.
 */
export function drawVictoryFadeTintV7(
  context: CanvasRenderingContext2D,
  frame: DrawFrameV7,
  board: { readonly width: number; readonly height: number },
  progress: number,
): void {
  // Nothing at either end (the sine of pi is not exactly 0).
  if (!(progress > 0 && progress < 1)) return;
  const strength = Math.sin(Math.PI * progress);
  const { camera } = frame;
  const cell = TILE_WIDTH * camera.zoom;
  context.save();
  context.globalCompositeOperation = "screen";
  context.globalAlpha =
    frame.sceneAlpha * VICTORY_WAVE_V7.humanFadeTint * strength;
  context.fillStyle = VICTORY_WAVE_V7.humanGlow.color;
  context.fillRect(
    camera.offsetX - cell / 2,
    camera.offsetY - (TILE_HEIGHT * camera.zoom) / 2,
    board.width * cell,
    board.height * TILE_HEIGHT * camera.zoom,
  );
  context.restore();
}
