import type {
  CoordV7,
  PlayerEventEnvelopeV7,
  PlayerViewV7,
} from "../../engine/index";

export type CorePresentationStepV7 =
  | {
      readonly kind: "MOVE";
      readonly unitId: number;
      readonly path: readonly CoordV7[];
      readonly durationMs: number;
    }
  | {
      readonly kind: "MELEE" | "RANGED" | "CATAPULT";
      readonly unitId: number;
      readonly from: CoordV7;
      readonly to: CoordV7;
      readonly durationMs: 230 | 280;
    };

/** Builds animation instructions exclusively from captured public views/events. */
export function corePresentationPlanV7(
  before: PlayerViewV7,
  envelope: PlayerEventEnvelopeV7,
): readonly CorePresentationStepV7[] {
  const steps: CorePresentationStepV7[] = [];
  for (const event of envelope.events) {
    if (event.kind === "UNIT_MOVED" || event.kind === "UNIT_PURSUED") {
      const origin = before.units.find((unit) => unit.id === event.unitId)?.at;
      if (origin !== undefined && event.path.length > 0)
        steps.push({
          kind: "MOVE",
          unitId: event.unitId,
          path: [origin, ...event.path],
          durationMs: Math.min(900, event.path.length * 90),
        });
    } else if (event.kind === "COMBAT_RESOLVED") {
      const attacker = before.units.find(
        (unit) => unit.id === event.preview.attackerId,
      );
      const defender = before.units.find(
        (unit) => unit.id === event.preview.targetUnitId,
      );
      if (attacker === undefined || defender === undefined) continue;
      const ranged =
        attacker.role === "MARKSMAN" || attacker.role === "CATAPULT";
      steps.push({
        kind:
          attacker.role === "CATAPULT"
            ? "CATAPULT"
            : ranged
              ? "RANGED"
              : "MELEE",
        unitId: attacker.id,
        from: attacker.at,
        to: defender.at,
        durationMs: ranged ? 280 : 230,
      });
    }
  }
  return steps;
}
