import type { CoordV7 } from "../../engine/index";

/**
 * Bead pulp_wars-2yc.116: where a unit drawn off its plan cell goes in the
 * board's draw order.
 *
 * The board plan is sorted once, row by row (`compareBoardPlanEntriesV7`),
 * and the renderer draws its entries in that order: a cell's ore, its
 * mountain's band and its building are drawn at that cell's turn. A unit
 * shown somewhere else this frame (sliding in a push, a Knockback, a pull
 * or a displacement, walking, lunging, or held where a later slide starts)
 * kept the slot of its plan cell, so the decoration of any later cell it
 * overlapped (the cell below or to the right of its slot) was drawn over
 * it: the ore of the Mountain it slid off or onto, for a moment.
 *
 * Such a unit now takes the slot of the last cell it overlaps (the row and
 * column it is reaching, rounded up), at a unit's layer and ahead of the
 * pieces of that cell: so it is drawn over the ground, ore, mountain and
 * buildings of every cell it touches, still under the tops of the trees and
 * peaks of the row in front (which cover a standing unit's feet too), and a
 * unit lunging into a cell is still drawn behind the defender standing
 * there. Only the moved entries are placed again, in one merge pass: the
 * plan is not sorted again per frame.
 */

/** The fields of a plan entry that its draw order reads. */
export interface OrderedBoardEntryV7 {
  readonly key: string;
  readonly kind: string;
  readonly layer: number;
  readonly at: CoordV7;
}

/** The board plan's draw order: values last, then row, column, layer, key. */
export function compareBoardPlanEntriesV7(
  a: OrderedBoardEntryV7,
  b: OrderedBoardEntryV7,
): number {
  return (
    Number(a.kind === "VALUE") - Number(b.kind === "VALUE") ||
    a.at.y - b.at.y ||
    a.at.x - b.at.x ||
    a.layer - b.layer ||
    a.key.localeCompare(b.key)
  );
}

/** A unit's layer in the plan; a moved unit goes ahead of layer 5 and up. */
const UNIT_LAYER_V7 = 5;
/** Interpolation error: a unit this close to a cell is on it. */
const ON_CELL_EPSILON_V7 = 1e-6;

/** The cell whose slot a unit drawn at `at` takes: the last it overlaps. */
export function movingUnitSlotV7(at: CoordV7): CoordV7 {
  return {
    x: Math.ceil(at.x - ON_CELL_EPSILON_V7),
    y: Math.ceil(at.y - ON_CELL_EPSILON_V7),
  };
}

/** Whether a moved unit in `slot` is drawn before the entry `entry`. */
function movedBeforeV7(slot: CoordV7, entry: OrderedBoardEntryV7): boolean {
  if (entry.kind === "VALUE") return true;
  if (slot.y !== entry.at.y) return slot.y < entry.at.y;
  if (slot.x !== entry.at.x) return slot.x < entry.at.x;
  return entry.layer >= UNIT_LAYER_V7;
}

/**
 * `entries` (in plan order) with each UNIT entry whose key is in `moved`
 * placed again at its drawn position's slot (`movingUnitSlotV7`); every
 * other entry keeps its order. `moved` is the keys of the units drawn off
 * their plan cell this frame, usually one or a few.
 */
export function placeMovedUnitsV7<Entry extends OrderedBoardEntryV7>(
  entries: readonly Entry[],
  moved: ReadonlySet<string>,
): readonly Entry[] {
  if (moved.size === 0) return entries;
  const isMoved = (entry: Entry): boolean =>
    entry.kind === "UNIT" && moved.has(entry.key);
  const lifted: { readonly entry: Entry; readonly slot: CoordV7 }[] = [];
  for (const entry of entries)
    if (isMoved(entry))
      lifted.push({ entry, slot: movingUnitSlotV7(entry.at) });
  if (lifted.length === 0) return entries;
  lifted.sort(
    (a, b) =>
      a.slot.y - b.slot.y ||
      a.slot.x - b.slot.x ||
      a.entry.at.y - b.entry.at.y ||
      a.entry.at.x - b.entry.at.x ||
      a.entry.key.localeCompare(b.entry.key),
  );
  const placed: Entry[] = [];
  let next = 0;
  for (const entry of entries) {
    if (isMoved(entry)) continue;
    while (next < lifted.length) {
      const item = lifted[next];
      if (item === undefined || !movedBeforeV7(item.slot, entry)) break;
      placed.push(item.entry);
      next += 1;
    }
    placed.push(entry);
  }
  for (; next < lifted.length; next += 1) {
    const item = lifted[next];
    if (item !== undefined) placed.push(item.entry);
  }
  return placed;
}
