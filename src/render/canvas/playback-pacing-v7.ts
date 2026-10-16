/**
 * Calm playback (bead pulp_wars-2yc.49): how long a unit takes to walk, how
 * it speeds up and slows down, and how playback is hurried when it falls
 * behind. Pure numbers; the plan and the board host read them.
 */

/**
 * One tile of an ordinary Move at Normal animation speed, for every player
 * (it was 90 ms). Fast halves it, like every other duration.
 */
export const MOVE_TILE_MS_V7 = 240;
/** The most a whole Move takes at Normal: longer paths walk faster. */
export const MOVE_MAX_MS_V7 = 1200;
/**
 * The beat between two units of another player's turn: the next one starts
 * no sooner than this after the last one stopped. Time that already went by
 * (the AI thinking, a camera glide) counts.
 */
export const UNIT_SETTLE_MS_V7 = 120;
/** Fast animation speed: every duration halves. */
export const FAST_DURATION_SCALE_V7 = 0.5;
/**
 * The shortest playback ever gets (the catch-up and off-screen scale, and
 * the floor under Fast with a backlog): 0.375 x 240 ms is the 90 ms a tile
 * that Normal used before this bead, so a long AI turn takes no longer than
 * it did.
 */
export const MIN_DURATION_SCALE_V7 = 0.375;
/** Boundaries waiting to play before playback starts to hurry. */
export const CATCH_UP_FROM_BACKLOG_V7 = 3;
/** Boundaries waiting at which playback is as quick as it gets. */
export const CATCH_UP_FULL_BACKLOG_V7 = 8;
/**
 * The AI waits for the board (bead pulp_wars-2yc.59): while this many of
 * its boundaries wait to play, the AI does not start on its next command.
 * The AI decides a command in tens of milliseconds and a Move plays for
 * hundreds, so without the wait a long AI turn ran ahead of the board, was
 * hurried to the 0.375 floor and then cut to its last boundary, and the
 * enemy's units jumped. At this backlog playback is still unhurried
 * (`playbackDurationScaleV7` is 1 up to CATCH_UP_FROM_BACKLOG_V7), and the
 * camera still sees the next few commands when it frames.
 */
export const AI_PACING_BACKLOG_V7 = CATCH_UP_FROM_BACKLOG_V7;

/** The duration of an ordinary Move that enters `tiles` tiles, at Normal. */
export function moveDurationMsV7(tiles: number): number {
  return Math.min(MOVE_MAX_MS_V7, Math.max(1, tiles) * MOVE_TILE_MS_V7);
}

/**
 * How far along its path a walking unit is at `time` (0 to 1, linear in
 * time): it speeds up over the first half tile, holds a steady pace and
 * slows down over the last half tile. A one-tile Move is all ease in and
 * out. Monotonic, 0 at 0 and 1 at 1.
 */
export function movePathProgressV7(time: number, tiles: number): number {
  const t = Math.min(1, Math.max(0, time));
  const ramp = Math.min(0.5, 0.5 / Math.max(1, tiles));
  const peak = 1 / (1 - ramp);
  if (t < ramp) return (peak * t * t) / (2 * ramp);
  if (t > 1 - ramp) return 1 - (peak * (1 - t) * (1 - t)) / (2 * ramp);
  return peak * (t - ramp / 2);
}

/**
 * The time scale of one boundary's playback: 1 at Normal and 0.5 at Fast,
 * shrinking towards MIN_DURATION_SCALE_V7 as `backlog` boundaries wait
 * behind it, so playback catches up instead of being dropped.
 */
export function playbackDurationScaleV7(
  speed: "NORMAL" | "FAST",
  backlog = 0,
): number {
  const base = speed === "FAST" ? FAST_DURATION_SCALE_V7 : 1;
  const share = Math.min(
    1,
    Math.max(
      0,
      (backlog - CATCH_UP_FROM_BACKLOG_V7) /
        (CATCH_UP_FULL_BACKLOG_V7 - CATCH_UP_FROM_BACKLOG_V7),
    ),
  );
  const hurried = 1 - share * (1 - MIN_DURATION_SCALE_V7);
  return Math.max(MIN_DURATION_SCALE_V7, base * hurried);
}

/**
 * What is left of the beat between two units: `UNIT_SETTLE_MS_V7` scaled,
 * less the time since the last unit stopped. Zero when no unit moved yet.
 */
export function settleRemainingMsV7(input: {
  readonly nowMs: number;
  readonly lastEndedAtMs: number | null;
  readonly durationScale: number;
}): number {
  if (input.lastEndedAtMs === null) return 0;
  return Math.max(
    0,
    UNIT_SETTLE_MS_V7 * input.durationScale -
      Math.max(0, input.nowMs - input.lastEndedAtMs),
  );
}
