/**
 * Long AI turns hurry (bead pulp_wars-2yc.114). Calm playback (bead
 * pulp_wars-2yc.49) plays every command of another player's turn at the
 * pace of a few; a seat with fifty units makes seventy commands, and its
 * turn took over half a minute to watch. Pure rules; the board host
 * applies them. Nothing here changes a rule, an event, an AI command or a
 * saved game: only how long the board takes to show them.
 *
 * - The first `HURRY_CALM_BOUNDARIES_V7` boundaries of one seat's turn
 *   that the viewer sees (boundaries with steps) play exactly as calm
 *   playback plays them.
 * - From then on the turn is hurried (`hurryScaleCapV7`): its time scale
 *   falls to the Fast setting's over the next few boundaries, to the
 *   shortest calm playback has (`MIN_DURATION_SCALE_V7`) from
 *   `HURRY_FLOOR_BOUNDARIES_V7` on, and, for what does not matter to the
 *   viewer, to `HURRY_RUSH_SCALE_V7` from `HURRY_RUSH_BOUNDARIES_V7` on.
 *   From the floor on, what does not matter skips the beat between units.
 * - In a hurried turn the camera frames only what matters to the viewer,
 *   and a boundary that does not matter and plays wholly off the canvas is
 *   shown at once.
 * - What matters to the viewer (`playbackMattersToViewerV7`): an attack
 *   or cue on or next to the viewer's units or cities, and anything that
 *   hurts the viewer's units or takes the viewer's city. It is framed and
 *   keeps a short readable beat: the Fast setting's pace, and from
 *   HURRY_RUSH_BOUNDARIES_V7 on the floor's (never quicker than calm
 *   playback's own catch-up makes it).
 * - The AI may run further ahead of a hurried turn's board
 *   (`HURRY_PACING_BACKLOG_V7`).
 */
import type { CoordV7, PlayerViewV7 } from "../../engine/index";
import type { CameraState, Size } from "./geometry";
import { cellsOffscreenV7, playbackStepCellsV7 } from "./playback-camera-v7";
import {
  FAST_DURATION_SCALE_V7,
  MIN_DURATION_SCALE_V7,
  playbackDurationScaleV7,
} from "./playback-pacing-v7";
import type { CorePresentationStepV7 } from "./presentation-plan-v7";

/** A seat's first boundaries (that the viewer sees) play calm. */
export const HURRY_CALM_BOUNDARIES_V7 = 12;
/** From this boundary on a hurried turn plays at the Fast setting's pace. */
export const HURRY_FAST_BOUNDARIES_V7 = 14;
/** From this boundary on a hurried turn plays at the 0.375 floor. */
export const HURRY_FLOOR_BOUNDARIES_V7 = 17;
/**
 * From this boundary on what does not matter plays at the rush scale, and
 * what matters at the floor (the pace every walk had before calm playback).
 */
export const HURRY_RUSH_BOUNDARIES_V7 = 20;
/**
 * The time scale of what does not matter to the viewer late in a long
 * turn: a tile in 60 ms, still a walk (four frames), not a jump.
 */
export const HURRY_RUSH_SCALE_V7 = 0.25;
/**
 * The shortest time scale of a boundary that matters to the viewer in a
 * hurried turn before HURRY_RUSH_BOUNDARIES_V7: the Fast setting's, a short
 * beat that still reads. From then on it is the floor.
 */
export const HURRY_BEAT_SCALE_V7 = FAST_DURATION_SCALE_V7;
/**
 * The AI waits for the board (bead pulp_wars-2yc.59) while this many of a
 * hurried turn's boundaries wait to play, instead of AI_PACING_BACKLOG_V7:
 * a hurried turn plays its commands about as fast as the AI decides them,
 * and a deeper queue lets the AI decide ahead during a long attack instead
 * of leaving the board idle while it decides a slow command (a build).
 * It stays under the queue cut (more than twelve waiting); calm playback's
 * own catch-up hurries such a queue to the floor, where a hurried turn
 * mostly is already.
 */
export const HURRY_PACING_BACKLOG_V7 = 9;

/** The seat turn a view is in: its match, round and active seat. */
export function hurryTurnKeyV7(
  matchInstanceId: number | string,
  view: Pick<PlayerViewV7, "round" | "turnOrder" | "activeSeatIndex">,
): string {
  const seat = view.turnOrder[view.activeSeatIndex] ?? null;
  return `${String(matchInstanceId)}:${view.round}:${String(seat)}`;
}

/**
 * The time scale a hurried turn allows its `played`-th seen boundary (0
 * for the seat's first): 1 through the calm ones, falling linearly to the
 * Fast setting's by HURRY_FAST_BOUNDARIES_V7, the floor from
 * HURRY_FLOOR_BOUNDARIES_V7 on and, for a boundary that does not matter to
 * the viewer, the rush scale from HURRY_RUSH_BOUNDARIES_V7 on.
 */
export function hurryScaleCapV7(played: number, matters = false): number {
  if (played < HURRY_CALM_BOUNDARIES_V7) return 1;
  if (played >= HURRY_RUSH_BOUNDARIES_V7 && !matters)
    return HURRY_RUSH_SCALE_V7;
  if (played >= HURRY_FLOOR_BOUNDARIES_V7) return MIN_DURATION_SCALE_V7;
  if (played >= HURRY_FAST_BOUNDARIES_V7) return FAST_DURATION_SCALE_V7;
  const share =
    (played - HURRY_CALM_BOUNDARIES_V7) /
    (HURRY_FAST_BOUNDARIES_V7 - HURRY_CALM_BOUNDARIES_V7);
  return 1 - share * (1 - FAST_DURATION_SCALE_V7);
}

/** Whether another seat's `played`-th seen boundary of its turn hurries. */
export function playbackHurriedV7(played: number): boolean {
  return played >= HURRY_CALM_BOUNDARIES_V7;
}

/**
 * Whether the beat between two units (`UNIT_SETTLE_MS_V7`) is left out:
 * from the floor on, before a boundary that does not matter to the viewer.
 */
export function hurrySkipsBeatV7(played: number, matters: boolean): boolean {
  return played >= HURRY_FLOOR_BOUNDARIES_V7 && !matters;
}

/**
 * The time scale of one boundary of another seat's turn: calm playback's
 * (`playbackDurationScaleV7`, the animation speed and the backlog), no
 * slower than the hurry allows; a boundary that matters to the viewer is
 * hurried no further than HURRY_BEAT_SCALE_V7 (the floor from
 * HURRY_RUSH_BOUNDARIES_V7 on), and never made slower than calm.
 */
export function hurriedDurationScaleV7(input: {
  readonly speed: "NORMAL" | "FAST";
  readonly backlog: number;
  readonly played: number;
  readonly matters: boolean;
}): number {
  const calm = playbackDurationScaleV7(input.speed, input.backlog);
  const hurried = Math.min(calm, hurryScaleCapV7(input.played, input.matters));
  const beat =
    input.played >= HURRY_RUSH_BOUNDARIES_V7
      ? MIN_DURATION_SCALE_V7
      : HURRY_BEAT_SCALE_V7;
  return input.matters ? Math.max(hurried, Math.min(calm, beat)) : hurried;
}

/** The kinds of step that are combat (attacks, hits and ability cues). */
const COMBAT_KINDS_V7: ReadonlySet<CorePresentationStepV7["kind"]> = new Set([
  "MELEE",
  "RANGED",
  "CATAPULT",
  "DAMAGE",
  "EXPLOSION",
  "DINOSAUR",
  "MARTIAN",
  "ICE_FOLK",
  "DWARF",
  "CANDY",
  "GIANT",
  "CULT",
]);

/**
 * Whether a boundary of another seat's turn matters to the viewer: one of
 * the viewer's units is hurt or gone, one of the viewer's cities changed
 * hands, a mission's wave arrived, or an attack or cue plays on or next to
 * (one tile, diagonals included) a unit or a city of the viewer's, before
 * or after the boundary.
 */
export function playbackMattersToViewerV7(
  before: PlayerViewV7,
  after: PlayerViewV7,
  steps: readonly CorePresentationStepV7[],
): boolean {
  const viewer = before.viewer.id;
  if (steps.some((step) => step.kind === "REINFORCEMENT")) return true;
  const afterUnits = new Map(after.units.map((unit) => [unit.id, unit]));
  for (const unit of before.units) {
    if (unit.ownerId !== viewer) continue;
    const later = afterUnits.get(unit.id);
    if (later === undefined || later.ownerId !== viewer || later.hp < unit.hp)
      return true;
  }
  const afterCities = new Map(
    after.cities.map((city) => [`${city.at.x},${city.at.y}`, city]),
  );
  for (const city of before.cities)
    if (
      city.ownerId === viewer &&
      afterCities.get(`${city.at.x},${city.at.y}`)?.ownerId !== viewer
    )
      return true;
  const combat = steps
    .filter((step) => COMBAT_KINDS_V7.has(step.kind))
    .flatMap((step) => playbackStepCellsV7(step));
  if (combat.length === 0) return false;
  const own: CoordV7[] = [];
  for (const view of [before, after]) {
    for (const unit of view.units)
      if (unit.ownerId === viewer) own.push(unit.at);
    for (const city of view.cities)
      if (city.ownerId === viewer) own.push(city.at);
  }
  return combat.some((cell) =>
    own.some(
      (at) => Math.abs(at.x - cell.x) <= 1 && Math.abs(at.y - cell.y) <= 1,
    ),
  );
}

/**
 * Whether every tile a boundary's steps play on is off the canvas under
 * `camera`. A boundary with no tiles (a reveal's crossfade alone) is not.
 */
export function boundaryOffscreenV7(
  steps: readonly CorePresentationStepV7[],
  camera: CameraState,
  viewport: Size,
): boolean {
  const cells = steps.flatMap((step) => playbackStepCellsV7(step));
  if (cells.length === 0) return false;
  // Each step on its own: two far-apart tiles can both be off the canvas
  // while the box around them is on it.
  return steps.every((step) => {
    const own = playbackStepCellsV7(step);
    return own.length === 0 || cellsOffscreenV7(camera, own, viewport);
  });
}
