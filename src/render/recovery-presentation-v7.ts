import type { CommandV7 } from "../engine/v7/commands";

/**
 * Section 10 idle recovery in the shell (bead pulp_wars-v3w): the texts of
 * the selected-unit dock line and of the End Turn hint. The numbers come
 * from `queryIdleRecoveryV7`; nothing here names a unit or a coordinate.
 */

/** The dock chip of an idle wounded own unit, e.g. "+4 at End Turn if idle". */
export function idleRecoveryChipV7(amount: number): string {
  return `+${amount} at End Turn if idle`;
}

/** The chip's accessible name and the sentence in the unit's ? details. */
export function idleRecoveryExplanationV7(amount: number): string {
  return `Recovers ${amount} HP at End Turn if it does not move or act.`;
}

/** The End Turn hint, e.g. "3 units will recover". */
export function endTurnRecoveryLabelV7(count: number): string {
  return `${count} ${count === 1 ? "unit" : "units"} will recover`;
}

/**
 * The Heal button (`pulp_wars-6y2r`, 7r143; the user, 2026-11-19: "I want
 * to have the healing button back. instead of the waiting button"): the
 * dock button of `HEAL`, in Wait's slot.
 */
export const HEAL_LABEL_V7 = "Heal";

/**
 * The Heal button's tooltip and accessible description, with the HP it
 * restores (the idle-recovery amount) when known.
 */
export function healTooltipV7(amount: number | null): string {
  return amount === null
    ? "Heals now and ends this unit's turn."
    : `Heals ${amount} HP now and ends this unit's turn.`;
}

/**
 * The Heal button (`pulp_wars-6y2r`, 7r143): the dock shows Heal in Wait's
 * slot. Each offered `WAIT` of a unit that is also offered a `HEAL` is
 * replaced, in its place, by that `HEAL`; a unit that cannot heal (no
 * `HEAL` offered) keeps its Wait, and every other entry keeps its order.
 */
export function healInWaitSlotV7<T extends { readonly command: CommandV7 }>(
  entries: readonly T[],
): T[] {
  const heals = new Map<number, T>();
  for (const entry of entries)
    if (entry.command.kind === "HEAL") heals.set(entry.command.unitId, entry);
  if (heals.size === 0) return [...entries];
  const placed = new Set<number>();
  const result: T[] = [];
  for (const entry of entries) {
    const command = entry.command;
    if (command.kind === "HEAL") continue;
    const heal =
      command.kind === "WAIT" ? heals.get(command.unitId) : undefined;
    if (command.kind !== "WAIT" || heal === undefined) {
      result.push(entry);
      continue;
    }
    result.push(heal);
    placed.add(command.unitId);
  }
  for (const [unitId, heal] of heals)
    if (!placed.has(unitId)) result.push(heal);
  return result;
}
