import type { PlayerId } from "../engine/model/ids";
import { barricadesOfV7 } from "../engine/v7/units";
import type { CoordV7 } from "../engine/v7/types";
import type { PlayerViewV7 } from "../engine/v7/view";
import type { RouteFieldV7 } from "./v7-campaign";

/**
 * Barricades in the way (`pulp_wars-54fb`, docs/architecture/NORMAL_AI.md
 * "Barricades in the way").
 *
 * A Barricade (Dwarf crowd control, `pulp_wars-w49.33`) blocks every Move
 * through and onto its tile and is broken only by `ATTACK_BARRICADE`. The
 * rule, in one sentence: **a land route goes round a hostile Barricade
 * when the way round is at most `BARRICADE_DETOUR_STEPS_V7` steps longer,
 * and otherwise through it, and a unit whose route runs through a hostile
 * Barricade in its range attacks it.**
 *
 * - **The routes** (the campaign plan's job fields and a directive's zone
 *   fields): a known Barricade of the viewer or an ally is a wall (nobody
 *   can break it); stepping onto a known hostile Barricade costs
 *   `BARRICADE_CROSSING_COST_V7` (its step and `BARRICADE_DETOUR_STEPS_V7`
 *   and one more), so the shortest route goes round it unless every way
 *   round is longer by more than `BARRICADE_DETOUR_STEPS_V7`.
 * - **The attack** (`barricadeOnRouteV7`): a hostile Barricade the unit can
 *   hit now lies on its route when the route's cost from the Barricade
 *   plus the Chebyshev distance to it is no more than the route's cost from
 *   the unit. A Barricade beside the route, behind the unit, or one the
 *   route goes round is never on it, so it is never hit.
 *
 * With no Barricade in the view nothing changes: the searches are the plain
 * breadth-first searches they were.
 */

/**
 * The steps a route will add to go round a hostile Barricade rather than
 * break it: about the turns two hits on a fresh one take, and short enough
 * that a unit never walks round a whole range to avoid one.
 */
export const BARRICADE_DETOUR_STEPS_V7 = 3;

/**
 * What a route pays to step onto a hostile Barricade: one more than the
 * longest detour it takes, so a detour of `BARRICADE_DETOUR_STEPS_V7`
 * steps is strictly shorter than breaking through.
 */
export const BARRICADE_CROSSING_COST_V7 = BARRICADE_DETOUR_STEPS_V7 + 2;

/**
 * The priority of an attack on a Barricade on the route: below every
 * attack on a unit (900 and up) and every engagement, above the routine
 * approach Moves (700 to 762), which make no progress at a wall.
 */
export const BARRICADE_BREACH_PRIORITY_V7 = 890;

/** Per tile: 0 open, 1 a hostile Barricade (costly), 2 a wall. */
export type BarricadeRouteMarksV7 = Uint8Array;

/**
 * The route marks of the Barricades in `view` (every Barricade on an
 * explored tile is in a view), or null when there is none, so the
 * searches stay plain breadth-first searches.
 */
export function barricadeRouteMarksV7(
  view: PlayerViewV7,
  isHostile: (ownerId: PlayerId) => boolean,
): BarricadeRouteMarksV7 | null {
  const barricades = barricadesOfV7(view);
  if (barricades.length === 0) return null;
  const { width, height } = view.board;
  const marks = new Uint8Array(width * height);
  for (const barricade of barricades) {
    const { x, y } = barricade.at;
    if (x < 0 || y < 0 || x >= width || y >= height) continue;
    marks[y * width + x] = isHostile(barricade.ownerId) ? 1 : 2;
  }
  return marks;
}

/**
 * Land-route steps from every tile of `enterable` to the nearest source
 * (8-neighbour moves, -1 where no route exists). With `marks` a wall is
 * never entered and a hostile Barricade costs `BARRICADE_CROSSING_COST_V7`
 * (a bucket queue); without, a plain breadth-first search.
 */
export function landRouteStepsV7(
  width: number,
  height: number,
  enterable: Uint8Array,
  sources: readonly number[],
  marks: BarricadeRouteMarksV7 | null,
): Int16Array {
  const size = width * height;
  const steps = new Int16Array(size).fill(-1);
  if (marks === null) {
    const queue = new Int32Array(size);
    let tail = 0;
    for (const source of sources)
      if (steps[source] === -1) {
        steps[source] = 0;
        queue[tail] = source;
        tail += 1;
      }
    for (let head = 0; head < tail; head += 1) {
      const current = queue[head] as number;
      const next = (steps[current] as number) + 1;
      const x = current % width;
      const y = (current - x) / width;
      for (let dy = -1; dy <= 1; dy += 1) {
        const ny = y + dy;
        if (ny < 0 || ny >= height) continue;
        for (let dx = -1; dx <= 1; dx += 1) {
          const nx = x + dx;
          if (nx < 0 || nx >= width) continue;
          const index = ny * width + nx;
          if (steps[index] !== -1 || enterable[index] !== 1) continue;
          steps[index] = next;
          queue[tail] = index;
          tail += 1;
        }
      }
    }
    return steps;
  }
  // Dial's algorithm: buckets of tiles by cost; a tile is settled when it
  // is first taken from a bucket at its final cost.
  const settled = new Uint8Array(size);
  const buckets: number[][] = [];
  const push = (index: number, cost: number): void => {
    const current = steps[index] as number;
    if (current !== -1 && current <= cost) return;
    steps[index] = cost;
    (buckets[cost] ??= []).push(index);
  };
  for (const source of sources) if (marks[source] !== 2) push(source, 0);
  for (let cost = 0; cost < buckets.length; cost += 1) {
    const bucket = buckets[cost];
    if (bucket === undefined) continue;
    for (const current of bucket) {
      if (settled[current] === 1 || steps[current] !== cost) continue;
      settled[current] = 1;
      const x = current % width;
      const y = (current - x) / width;
      for (let dy = -1; dy <= 1; dy += 1) {
        const ny = y + dy;
        if (ny < 0 || ny >= height) continue;
        for (let dx = -1; dx <= 1; dx += 1) {
          const nx = x + dx;
          if (nx < 0 || nx >= width) continue;
          const index = ny * width + nx;
          if (enterable[index] !== 1 || settled[index] === 1) continue;
          const mark = marks[index];
          if (mark === 2) continue;
          push(index, cost + (mark === 1 ? BARRICADE_CROSSING_COST_V7 : 1));
        }
      }
    }
  }
  return steps;
}

/**
 * Whether the hostile Barricade on `barricade` lies on the route `field`
 * of a unit on `from`: the route's cost from the Barricade plus the
 * Chebyshev distance to it is no more than the route's cost from `from`
 * (and the Barricade is nearer the goal). False when either tile has no
 * route.
 */
export function barricadeOnRouteV7(
  field: RouteFieldV7,
  from: CoordV7,
  barricade: CoordV7,
): boolean {
  const here = field.get(from);
  const there = field.get(barricade);
  if (here === undefined || there === undefined || there >= here) return false;
  const gap = Math.max(
    Math.abs(from.x - barricade.x),
    Math.abs(from.y - barricade.y),
  );
  return there + gap <= here;
}
