import type {
  CoordV7,
  PlayerEventEnvelopeV7,
  PlayerViewV7,
} from "../../engine/index";
import type { Ruleset7TacticalUiSymbolId } from "../../assets/ruleset7-tactical-ui-symbols";

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
    }
  | {
      readonly kind: "VISIBILITY_CROSSFADE";
      readonly durationMs: 180;
    }
  | {
      readonly kind: "TACTICAL_STATUS";
      readonly at: CoordV7;
      readonly symbolId: Ruleset7TacticalUiSymbolId;
      readonly durationMs: 240;
    };

/** Builds animation instructions exclusively from captured public views/events. */
export function corePresentationPlanV7(
  before: PlayerViewV7,
  envelope: PlayerEventEnvelopeV7,
  after: PlayerViewV7 = before,
): readonly CorePresentationStepV7[] {
  const steps: CorePresentationStepV7[] = [];
  let visibilityCrossfadeAdded = false;
  for (const event of envelope.events) {
    if (event.kind === "UNIT_MOVED") {
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
        attacker.role === "MARKSMAN" ||
        attacker.role === "CATAPULT" ||
        attacker.role === "HORSE_ARCHER";
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
    } else if (
      event.kind === "UNIT_REVEALED" ||
      event.kind === "UNIT_CONCEALED"
    ) {
      if (!visibilityCrossfadeAdded) {
        steps.push({ kind: "VISIBILITY_CROSSFADE", durationMs: 180 });
        visibilityCrossfadeAdded = true;
      }
    } else if (isTacticalStatusEvent(event.kind)) {
      const presentation = tacticalStatusPresentation(after, event);
      if (presentation !== null)
        steps.push({
          kind: "TACTICAL_STATUS",
          ...presentation,
          durationMs: 240,
        });
    }
  }
  return steps;
}

function isTacticalStatusEvent(kind: string): boolean {
  return kind.startsWith("BLACKOUT_") || kind === "SABOTEUR_EXPOSED";
}

function tacticalStatusPresentation(
  after: PlayerViewV7,
  event: PlayerEventEnvelopeV7["events"][number],
): {
  readonly at: CoordV7;
  readonly symbolId: Ruleset7TacticalUiSymbolId;
} | null {
  if (event.kind.startsWith("BLACKOUT_") && "cityId" in event) {
    const at = after.cities.find((city) => city.id === event.cityId)?.at;
    if (at === undefined) return null;
    return {
      at,
      symbolId:
        event.kind === "BLACKOUT_PLANTED"
          ? "ui-status-blackout-pending"
          : event.kind === "BLACKOUT_ACTIVATED"
            ? "ui-status-blackout-active"
            : "ui-status-blackout-recovery",
    };
  }
  if (event.kind === "SABOTEUR_EXPOSED") {
    const at = after.units.find((unit) => unit.id === event.unitId)?.at;
    return at === undefined ? null : { at, symbolId: "ui-status-exposed" };
  }
  return null;
}
