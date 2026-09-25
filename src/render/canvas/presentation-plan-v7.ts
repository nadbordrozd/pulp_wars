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
      readonly followCamera?: true;
    }
  | {
      readonly kind: "BUILD";
      readonly at: CoordV7;
      readonly durationMs: 180;
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
    }
  | {
      readonly kind: "SUPPORT";
      readonly effect: "RALLY" | "TEND";
      readonly actor: { readonly unitId: number; readonly at: CoordV7 };
      readonly recipients: readonly {
        readonly unitId: number;
        readonly at: CoordV7;
      }[];
      readonly durationMs: 320;
    }
  | {
      readonly kind: "WINDMILL_HEALING";
      readonly sources: readonly CoordV7[];
      readonly recipients: readonly {
        readonly unitId: number;
        readonly at: CoordV7;
      }[];
      readonly sourceDurationMs: 180;
      readonly recipientDurationMs: 260;
    }
  | {
      readonly kind: "DAMAGE";
      readonly unitId: number;
      readonly at: CoordV7;
      readonly damage: number;
      readonly lethal: boolean;
      readonly durationMs: 100;
    };

/** Builds animation instructions exclusively from captured public views/events. */
export function corePresentationPlanV7(
  before: PlayerViewV7,
  envelope: PlayerEventEnvelopeV7,
  after: PlayerViewV7 = before,
): readonly CorePresentationStepV7[] {
  const steps: CorePresentationStepV7[] = [];
  const enemyTurn =
    before.turnOrder[before.activeSeatIndex] !== before.viewer.id;
  const explored = new Set(
    [...before.board.tiles, ...after.board.tiles]
      .filter((tile) => tile.explored)
      .map((tile) => `${tile.at.x},${tile.at.y}`),
  );
  const origins = new Map(before.units.map((unit) => [unit.id, unit.at]));
  const healingEvents = envelope.events.filter(
    (event) => event.kind === "WINDMILL_HEALING_RESOLVED",
  );
  const healingSources = healingEvents.map((event) => event.at);
  const healingRecipientIds = new Set(
    healingEvents.flatMap((event) =>
      event.results.map((result) => result.unitId),
    ),
  );
  const healingRecipients = [...healingRecipientIds].flatMap((unitId) => {
    const unit = after.units.find((candidate) => candidate.id === unitId);
    return unit === undefined ? [] : [{ unitId, at: unit.at }];
  });
  let healingAdded = false;
  let visibilityCrossfadeAdded = false;
  for (const event of envelope.events) {
    if (event.kind === "WINDMILL_HEALING_RESOLVED") {
      if (
        !healingAdded &&
        healingSources.length > 0 &&
        healingRecipients.length > 0
      ) {
        steps.push({
          kind: "WINDMILL_HEALING",
          sources: healingSources,
          recipients: healingRecipients,
          sourceDurationMs: 180,
          recipientDurationMs: 260,
        });
        healingAdded = true;
      }
    } else if (event.kind === "UNIT_MOVED") {
      const origin = origins.get(event.unitId);
      if (enemyTurn) {
        // Ordinary public moves may span fog; reveal/conceal events reset
        // their origins.
        // Never join visible stretches across an unobserved coordinate.
        const path =
          origin === undefined ? event.path : [origin, ...event.path];
        let segment: CoordV7[] = [];
        const flush = (): void => {
          if (segment.length > 0)
            steps.push({
              kind: "MOVE",
              unitId: event.unitId,
              path: segment,
              durationMs: Math.min(900, Math.max(1, segment.length - 1) * 90),
              followCamera: true,
            });
          segment = [];
        };
        for (const at of path) {
          if (!explored.has(`${at.x},${at.y}`)) flush();
          else {
            const previous = segment.at(-1);
            if (previous === undefined || !same(previous, at)) segment.push(at);
          }
        }
        flush();
      } else if (origin !== undefined && event.path.length > 0)
        steps.push({
          kind: "MOVE",
          unitId: event.unitId,
          path: [origin, ...event.path],
          durationMs: Math.min(900, event.path.length * 90),
        });
      const destination = event.path.at(-1);
      if (destination !== undefined) origins.set(event.unitId, destination);
    } else if (
      event.kind === "UNIT_EMBARKED" ||
      event.kind === "UNIT_DISEMBARKED"
    ) {
      const publicPath = [event.from, event.to].filter((at) =>
        explored.has(`${at.x},${at.y}`),
      );
      if (publicPath.length === 2)
        steps.push({
          kind: "MOVE",
          unitId: event.unitId,
          path: publicPath,
          durationMs: 180,
          ...(enemyTurn ? { followCamera: true as const } : {}),
        });
      origins.set(event.unitId, event.to);
    } else if (
      enemyTurn &&
      (event.kind === "ECONOMIC_BUILDING_BUILT" ||
        event.kind === "PORT_BUILT" ||
        event.kind === "NAVAL_UNIT_TRAINED" ||
        event.kind === "ROAD_BUILT" ||
        event.kind === "FIELD_DEFENSE_BUILT" ||
        event.kind === "MONUMENT_BUILT")
    ) {
      if (explored.has(`${event.at.x},${event.at.y}`))
        steps.push({ kind: "BUILD", at: event.at, durationMs: 180 });
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
        attacker.role === "BATTLESHIP";
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
      for (const splash of event.preview.splash) {
        const victim = before.units.find((unit) => unit.id === splash.unitId);
        if (victim !== undefined)
          steps.push({
            kind: "DAMAGE",
            unitId: splash.unitId,
            at: victim.at,
            damage: splash.damage,
            lethal: splash.dies,
            durationMs: 100,
          });
      }
    } else if (event.kind === "COMBAT_SPLASH_DAMAGE") {
      for (const splash of event.splash) {
        const victim = before.units.find((unit) => unit.id === splash.unitId);
        if (victim !== undefined)
          steps.push({
            kind: "DAMAGE",
            unitId: splash.unitId,
            at: victim.at,
            damage: splash.damage,
            lethal: splash.dies,
            durationMs: 100,
          });
      }
    } else if (
      event.kind === "UNITS_RALLIED" ||
      event.kind === "WOUNDED_TENDED"
    ) {
      const publicUnits = new Map(
        [...before.units, ...after.units].map(
          (unit) => [unit.id, unit] as const,
        ),
      );
      const actor = publicUnits.get(event.captainId);
      if (actor === undefined) continue;
      const recipientIds =
        event.kind === "UNITS_RALLIED"
          ? event.unitIds
          : event.results.map((result) => result.unitId);
      const recipients = recipientIds.flatMap((unitId) => {
        const unit = publicUnits.get(unitId);
        return unit === undefined ? [] : [{ unitId, at: unit.at }];
      });
      if (recipients.length > 0)
        steps.push({
          kind: "SUPPORT",
          effect: event.kind === "UNITS_RALLIED" ? "RALLY" : "TEND",
          actor: { unitId: actor.id, at: actor.at },
          recipients,
          durationMs: 320,
        });
    } else if (
      event.kind === "UNIT_REVEALED" ||
      event.kind === "UNIT_CONCEALED"
    ) {
      // A reveal can name the final coordinate of an ordinary move, so it is
      // not an origin. The next public path supplies its own visible start.
      origins.delete(event.unitId);
      if (!visibilityCrossfadeAdded) {
        steps.push({ kind: "VISIBILITY_CROSSFADE", durationMs: 180 });
        visibilityCrossfadeAdded = true;
      }
    }
  }
  return steps;
}

function same(left: CoordV7, right: CoordV7): boolean {
  return left.x === right.x && left.y === right.y;
}
