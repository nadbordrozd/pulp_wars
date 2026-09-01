import type { CommandV6, UnitId } from "../../engine/index";

/**
 * Observation-safe DOM/controller boundary projection. Readiness is exactly
 * the set of units named by public offered MOVE commands; no unit activation
 * fields or authoritative state are consulted.
 */
export function readyUnitIdsFromOfferedMovesV6(
  offeredCommands: readonly CommandV6[],
): readonly UnitId[] {
  return Object.freeze(
    [
      ...new Set(
        offeredCommands.flatMap((command) =>
          command.kind === "MOVE" ? [command.unitId] : [],
        ),
      ),
    ].sort((left, right) => left - right),
  );
}
