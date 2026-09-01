import type {
  CoordV6,
  DomainEventV6,
  FactionIdV6,
  PlayerViewV6,
  UnitId,
  UnitRoleId,
} from "../../engine/index";
import { effectiveRoleRuleV6 } from "../../engine/index";

export const COMBAT_PRESENTATION_TIMING_V6 = Object.freeze({
  fullMs: 420,
  contactMs: 180,
  reducedMs: 100,
});

export interface CombatSpriteSnapshotV6 {
  readonly id: UnitId;
  readonly ownerId: number;
  readonly faction: FactionIdV6;
  readonly role: UnitRoleId;
  readonly at: CoordV6;
}

export interface CombatPresentationV6 {
  readonly key: string;
  readonly commandIndex: number;
  readonly motion: "FULL" | "REDUCED";
  readonly durationMs: number;
  readonly actorController: "HUMAN" | "AI";
  readonly attacker: CombatSpriteSnapshotV6;
  readonly target: CombatSpriteSnapshotV6 | null;
  readonly targetAt: CoordV6;
  readonly damaged: readonly CombatSpriteSnapshotV6[];
  readonly advances: boolean;
}

export interface CombatAnimationFrameV6 {
  readonly attackerTravel: number;
  readonly shake: number;
  readonly damagedOpacity: number;
}

/**
 * Converts only accepted, public combat facts into transient Canvas data.
 * Ranged attacks are deliberately left for the projectile presentation.
 */
export function combatPresentationsFromEventsV6(
  beforeView: PlayerViewV6,
  events: readonly DomainEventV6[],
  commandIndex: number,
  motion: "FULL" | "REDUCED",
): readonly CombatPresentationV6[] {
  const presentations: CombatPresentationV6[] = [];
  events.forEach((event, eventIndex) => {
    if (event.kind !== "COMBAT_RESOLVED") return;
    const targetRef = event.preview.target;
    const attacker = beforeView.units.find(
      (unit) => unit.id === event.preview.attackerId,
    );
    const defender =
      targetRef.kind === "UNIT"
        ? beforeView.units.find((unit) => unit.id === targetRef.unitId)
        : undefined;
    const target =
      defender ??
      (targetRef.kind === "CHOCOLATE_WALL"
        ? beforeView.chocolateWalls.find((wall) => wall.id === targetRef.wallId)
        : undefined);
    if (attacker === undefined || target === undefined) return;

    const attackerSnapshot = spriteSnapshot(beforeView, attacker);
    if (attackerSnapshot === null) return;
    if (
      !isMeleeCombatant(attackerSnapshot) ||
      !isAdjacent(attacker.at, target.at)
    )
      return;
    const targetSnapshot =
      defender === undefined ? null : spriteSnapshot(beforeView, defender);
    const damaged: CombatSpriteSnapshotV6[] = [];
    if (targetRef.kind === "UNIT" && event.preview.damageToDefender > 0) {
      const snapshot =
        defender === undefined ? null : spriteSnapshot(beforeView, defender);
      if (snapshot !== null) damaged.push(snapshot);
    }
    if (event.preview.damageToAttacker > 0) damaged.push(attackerSnapshot);

    presentations.push({
      key: `${commandIndex}:${eventIndex}:${attacker.id}`,
      commandIndex,
      motion,
      durationMs:
        motion === "REDUCED"
          ? COMBAT_PRESENTATION_TIMING_V6.reducedMs
          : COMBAT_PRESENTATION_TIMING_V6.fullMs,
      actorController:
        beforeView.players.find((player) => player.id === attacker.ownerId)
          ?.controller ?? "AI",
      attacker: attackerSnapshot,
      target: targetSnapshot,
      targetAt: target.at,
      damaged: Object.freeze(damaged),
      advances: event.preview.advances,
    });
  });
  return Object.freeze(presentations);
}

/** Pure monotonic-time projection shared by the host and deterministic tests. */
export function combatAnimationFrameV6(
  presentation: CombatPresentationV6,
  elapsedMs: number,
): CombatAnimationFrameV6 {
  if (presentation.motion === "REDUCED") {
    return { attackerTravel: 0, shake: 0, damagedOpacity: 0.58 };
  }
  const elapsed = clamp(elapsedMs, 0, presentation.durationMs);
  if (elapsed <= COMBAT_PRESENTATION_TIMING_V6.contactMs) {
    const progress = elapsed / COMBAT_PRESENTATION_TIMING_V6.contactMs;
    return {
      attackerTravel: easeOutCubic(progress) * 0.28,
      shake: 0,
      damagedOpacity: 1,
    };
  }
  const impactDuration =
    presentation.durationMs - COMBAT_PRESENTATION_TIMING_V6.contactMs;
  const impact = clamp(
    (elapsed - COMBAT_PRESENTATION_TIMING_V6.contactMs) / impactDuration,
    0,
    1,
  );
  return {
    attackerTravel: presentation.advances
      ? 0.28 + 0.72 * easeOutCubic(impact)
      : 0.28 * (1 - easeOutCubic(impact)),
    shake: Math.sin(impact * Math.PI * 6) * (1 - impact) * 6,
    damagedOpacity: 1,
  };
}

function spriteSnapshot(
  view: PlayerViewV6,
  unit: PlayerViewV6["units"][number],
): CombatSpriteSnapshotV6 | null {
  const faction = view.players.find(
    (player) => player.id === unit.ownerId,
  )?.faction;
  return faction === undefined
    ? null
    : {
        id: unit.id,
        ownerId: unit.ownerId,
        faction,
        role: unit.role,
        at: unit.at,
      };
}

function isMeleeCombatant(attacker: CombatSpriteSnapshotV6): boolean {
  // Distance does not turn a ranged role into melee; adjacent MARKSMAN attacks
  // stay available to the dedicated projectile presentation.
  return effectiveRoleRuleV6(attacker.faction, attacker.role).range === 1;
}

function isAdjacent(left: CoordV6, right: CoordV6): boolean {
  const distance = Math.max(
    Math.abs(left.x - right.x),
    Math.abs(left.y - right.y),
  );
  return distance === 1;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

function easeOutCubic(value: number): number {
  return 1 - Math.pow(1 - value, 3);
}
