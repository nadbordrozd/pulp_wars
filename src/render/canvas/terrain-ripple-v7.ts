import type { CoordV7, PlayerViewV7 } from "../../engine/index";
import { TILE_WIDTH, type CameraState } from "./geometry";

/**
 * The territory ripple (bead pulp_wars-2yc.28, docs/art/TERRITORY_RIPPLE.md).
 * The user, 2026-10-07: "whenever you take over a city/village and the
 * terrain changes to your faction make all the changing tiles do a little
 * jump animation - one by one. jump and change into the new skin."
 *
 * And the same day: "when a faction takes over a city and the surroundings
 * change skin i want all terrain tiles to do a little jump as they change.
 * make them jump one in rows, not all at once."
 *
 * When the territory of explored cells changes owner (a city or a village
 * taken, a Land Grant, a border that moves), those cells change one after
 * another, row by row: the top row from left to right, then the next row,
 * down the territory. Each makes a small hop and takes its new look
 * (grass, trees, Snow, the coast, the building's and the city's faction
 * look) at the top of it. Never all at once, and never a whole row at once.
 *
 * It is presentation only. The game's state has changed already; nothing
 * waits for the ripple and no input is held. The module keeps, for each
 * cell still to change, the plan entries it showed before, and gives the
 * board the new plan with those entries put back (`plan`), and the cells
 * in the air (`hops`). The board host owns the clock and the frames.
 *
 * To turn it off: set TERRAIN_RIPPLE_ENABLED_V7 to false, or open the game
 * with `?tile-hop=0`. With reduced motion (the system's or the game's
 * Motion setting) there is no ripple: every cell changes at once.
 */

/** The master switch. False changes every cell at once, as before. */
export const TERRAIN_RIPPLE_ENABLED_V7 = true;

/** `?tile-hop=0` (or `off`, `false`) turns it off, `=1` on. */
export const TERRAIN_RIPPLE_PARAMETER_V7 = "tile-hop";

export function terrainRippleEnabledV7(search?: string): boolean {
  const query =
    search ??
    (globalThis as { location?: { search?: string } }).location?.search ??
    "";
  let value: string | null;
  try {
    value = new URLSearchParams(query).get(TERRAIN_RIPPLE_PARAMETER_V7);
  } catch {
    value = null;
  }
  if (value === null) return TERRAIN_RIPPLE_ENABLED_V7;
  const text = value.trim().toLowerCase();
  if (text === "0" || text === "off" || text === "false") return false;
  if (text === "1" || text === "on" || text === "true") return true;
  return TERRAIN_RIPPLE_ENABLED_V7;
}

export const TERRAIN_RIPPLE_V7 = {
  /** The time from one cell's hop to the next, ms: at most and at least. */
  stepMs: 55,
  stepFloorMs: 2,
  /** The longest the starts of one city's cells are spread over, ms. */
  spreadMs: 900,
  /** One hop, ms, and the share of it spent rising. */
  hopMs: 220,
  apex: 0.4,
  /** The height of a hop as a share of the cell's side (7 px of 80). */
  height: 0.0875,
} as const;

const key = (at: CoordV7): string => `${at.x},${at.y}`;

/** Explored cells whose territory changed owner, by the city they follow. */
export interface TerrainRippleGroupV7 {
  /** The cells in the order they hop: row by row, each left to right. */
  readonly cells: readonly CoordV7[];
}

/**
 * The cells whose territory has another owner in `after` than in `before`,
 * among those explored in both, grouped by the city whose land they are
 * now (or were, when they are no one's now): two cities taken at once
 * change side by side. Each group's cells are in the order they hop.
 */
export function terrainOwnershipChangesV7(
  before: PlayerViewV7,
  after: PlayerViewV7,
): TerrainRippleGroupV7[] {
  if (
    before.board.width !== after.board.width ||
    before.board.height !== after.board.height
  )
    return [];
  const groups = new Map<string, CoordV7[]>();
  for (const [index, tile] of after.board.tiles.entries()) {
    const was = before.board.tiles[index];
    if (was === undefined || !was.explored || !tile.explored) continue;
    if (was.territoryOwnerId === tile.territoryOwnerId) continue;
    const city = tile.territoryCityId ?? was.territoryCityId;
    const owner = tile.territoryOwnerId ?? was.territoryOwnerId;
    // A city the viewer cannot see has no ID in the view: its cells are
    // grouped by their owner.
    const id =
      city === null ? `owner:${String(owner)}` : `city:${String(city)}`;
    const group = groups.get(id) ?? [];
    group.push(tile.at);
    groups.set(id, group);
  }
  return [...groups.values()].map((cells) => ({
    cells: terrainRippleOrderV7(cells),
  }));
}

/**
 * The order of a ripple: row by row from the top of the territory, each
 * row from left to right, as a page is read. The same for the same cells,
 * always.
 */
export function terrainRippleOrderV7(cells: readonly CoordV7[]): CoordV7[] {
  return [...cells].sort((a, b) => a.y - b.y || a.x - b.x);
}

/** The time between the hops of a group of `count` cells, ms. */
export function terrainRippleStepMsV7(count: number): number {
  const spec = TERRAIN_RIPPLE_V7;
  if (count <= 1) return spec.stepMs;
  return Math.max(
    spec.stepFloorMs,
    Math.min(spec.stepMs, spec.spreadMs / (count - 1)),
  );
}

/**
 * How high a cell is `elapsedMs` into its hop, as a share of the hop's
 * height: 0 on the ground, 1 at the top. It rises fast and slows (ease
 * out), and falls the other way.
 */
export function tileHopLiftV7(elapsedMs: number): number {
  const { hopMs, apex } = TERRAIN_RIPPLE_V7;
  if (elapsedMs <= 0 || elapsedMs >= hopMs) return 0;
  const progress = elapsedMs / hopMs;
  if (progress < apex) {
    const up = progress / apex;
    return 1 - (1 - up) * (1 - up);
  }
  const down = (progress - apex) / (1 - apex);
  return 1 - down * down;
}

/** Whether a cell has its new look `elapsedMs` into its hop: from the top. */
export function tileHopSwappedV7(elapsedMs: number): boolean {
  return elapsedMs >= TERRAIN_RIPPLE_V7.hopMs * TERRAIN_RIPPLE_V7.apex;
}

/** The plan entries that carry a cell's look. */
const SKIN_KINDS: ReadonlySet<string> = new Set([
  "TERRAIN",
  "IMPROVEMENT",
  "CITY",
]);

interface RippleEntry {
  readonly key: string;
  readonly kind: string;
  readonly at: CoordV7;
}

interface RippleCell<Entry> {
  readonly at: CoordV7;
  /** The entries the cell showed before, by key. */
  readonly from: ReadonlyMap<string, Entry>;
  /** When its hop starts, on the host's clock. */
  readonly startMs: number;
}

export interface TerrainRippleV7<
  Entry extends RippleEntry,
  Plan extends { readonly entries: readonly Entry[] },
> {
  /**
   * Shows the ripple a view about to be drawn. A view newer than the last
   * one seen (a higher command index in the same match) starts a ripple
   * over the cells whose territory changed owner, when `animate` is true;
   * an older or equal one (the "before" of a presentation) is ignored.
   * `entriesOf` gives the plan entries of the last view.
   */
  observe(
    view: PlayerViewV7,
    match: unknown,
    nowMs: number,
    animate: boolean,
    entriesOf: (view: PlayerViewV7) => readonly Entry[],
  ): void;
  /** Whether a cell is still waiting or in the air. */
  active(nowMs: number): boolean;
  /**
   * `plan` with the cells that have not changed yet showing their old
   * entries. `plan` itself when no cell is waiting; the same object for
   * the same plan while the same cells wait.
   */
  plan(plan: Plan, view: PlayerViewV7, nowMs: number): Plan;
  /** The cells in the air: `lift` is 0 to 1 of the hop's height. */
  hops(nowMs: number): TileHopV7[];
  /** Forgets everything: every cell shows its new look at once. */
  reset(): void;
  /** The clock's time when the last ripple started (null: none yet). */
  readonly startedAtMs: number | null;
}

export interface TileHopV7 {
  readonly at: CoordV7;
  readonly lift: number;
}

export function createTerrainRippleV7<
  Entry extends RippleEntry,
  Plan extends { readonly entries: readonly Entry[] },
>(): TerrainRippleV7<Entry, Plan> {
  let match: unknown = null;
  let last: PlayerViewV7 | null = null;
  const cells = new Map<string, RippleCell<Entry>>();
  let patched: {
    readonly plan: Plan;
    readonly waiting: string;
    readonly result: Plan;
  } | null = null;
  let startedAtMs: number | null = null;

  const prune = (nowMs: number): void => {
    for (const [at, cell] of cells)
      if (nowMs - cell.startMs >= TERRAIN_RIPPLE_V7.hopMs) cells.delete(at);
  };

  return {
    observe(view, instance, nowMs, animate, entriesOf) {
      if (last === null || instance !== match) {
        match = instance;
        last = view;
        cells.clear();
        patched = null;
        return;
      }
      if (view === last || view.commandIndex <= last.commandIndex) return;
      const before = last;
      last = view;
      prune(nowMs);
      if (!animate) {
        cells.clear();
        patched = null;
        return;
      }
      const groups = terrainOwnershipChangesV7(before, view);
      if (groups.length === 0) return;
      // What each changing cell showed: a cell still waiting from an
      // earlier ripple keeps the look it is showing; any other takes the
      // look of the view before this one.
      let old: Map<string, Map<string, Entry>> | null = null;
      const oldAt = (at: CoordV7): ReadonlyMap<string, Entry> => {
        if (old === null) {
          old = new Map();
          const changing = new Set(
            groups.flatMap((group) => group.cells.map(key)),
          );
          for (const entry of entriesOf(before)) {
            if (!SKIN_KINDS.has(entry.kind)) continue;
            const cell = key(entry.at);
            if (!changing.has(cell)) continue;
            const entries = old.get(cell) ?? new Map<string, Entry>();
            entries.set(entry.key, entry);
            old.set(cell, entries);
          }
        }
        return old.get(key(at)) ?? new Map<string, Entry>();
      };
      for (const group of groups) {
        const step = terrainRippleStepMsV7(group.cells.length);
        for (const [index, at] of group.cells.entries()) {
          const known = cells.get(key(at));
          const waiting =
            known !== undefined && !tileHopSwappedV7(nowMs - known.startMs);
          cells.set(key(at), {
            at,
            from: waiting ? known.from : oldAt(at),
            startMs: nowMs + index * step,
          });
        }
      }
      patched = null;
      startedAtMs = nowMs;
    },
    get startedAtMs() {
      return startedAtMs;
    },
    active(nowMs) {
      prune(nowMs);
      return cells.size > 0;
    },
    plan(plan, view, nowMs) {
      if (cells.size === 0 || view !== last) return plan;
      const waiting: RippleCell<Entry>[] = [];
      for (const cell of cells.values())
        if (!tileHopSwappedV7(nowMs - cell.startMs)) waiting.push(cell);
      if (waiting.length === 0) return plan;
      const signature = waiting.map((cell) => key(cell.at)).join(";");
      if (patched?.plan === plan && patched.waiting === signature)
        return patched.result;
      const from = new Map<string, ReadonlyMap<string, Entry>>(
        waiting.map((cell) => [key(cell.at), cell.from]),
      );
      const result = {
        ...plan,
        entries: plan.entries.map((entry) =>
          SKIN_KINDS.has(entry.kind)
            ? (from.get(key(entry.at))?.get(entry.key) ?? entry)
            : entry,
        ),
      };
      patched = { plan, waiting: signature, result };
      return result;
    },
    hops(nowMs) {
      const hops: TileHopV7[] = [];
      for (const cell of cells.values()) {
        const lift = tileHopLiftV7(nowMs - cell.startMs);
        if (lift > 0) hops.push({ at: cell.at, lift });
      }
      return hops;
    },
    reset() {
      match = null;
      last = null;
      cells.clear();
      patched = null;
      startedAtMs = null;
    },
  };
}

// ----------------------------------------------------------------- drawing

/**
 * The plan entries that rise with a cell in the air: its ground and what
 * is built or grows on it. A unit standing there stays where it is, and so
 * does a city: a city's own hop, its name plate, its pips, its crown and
 * its garrison belong to the feedback animations (feedback-host-v7.ts),
 * and the two must not pull at it together. The city still takes its new
 * look (and its plate its new colour) at the top of its cell's hop.
 */
export const TILE_HOP_KINDS_V7: ReadonlySet<string> = new Set([
  "TERRAIN",
  "ROAD",
  "ROAD_JOIN",
  "RESOURCE",
  "IMPROVEMENT",
  "SITE",
  "TREASURE",
  "CURIOSITY",
]);

/**
 * How far the top of each cell in the air rises this frame, in CSS px (a
 * whole number of device pixels), by "x,y". The board draws the entries of
 * TILE_HOP_KINDS_V7 at such a cell stretched upward by that much from the
 * cell's foot, which stays on the ground: the cell springs up and settles,
 * and no gap opens under it. No layer is built or copied for it.
 */
export function tileHopLiftsV7(
  hops: readonly TileHopV7[],
  camera: CameraState,
  devicePixelRatio: number,
): Map<string, number> {
  const ratio = devicePixelRatio > 0 ? devicePixelRatio : 1;
  const lifts = new Map<string, number>();
  for (const hop of hops) {
    const lift =
      Math.round(
        hop.lift * TERRAIN_RIPPLE_V7.height * TILE_WIDTH * camera.zoom * ratio,
      ) / ratio;
    if (lift > 0) lifts.set(key(hop.at), lift);
  }
  return lifts;
}
