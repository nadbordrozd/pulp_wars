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
