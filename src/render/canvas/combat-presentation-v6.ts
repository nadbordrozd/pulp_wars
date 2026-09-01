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
  projectileMs: 220,
  reducedMs: 100,
});

export interface CombatSpriteSnapshotV6 {
  readonly id: UnitId;
  readonly ownerId: number;
  readonly faction: FactionIdV6;
  readonly role: UnitRoleId;
  readonly at: CoordV6;
}

export interface CombatWallSnapshotV6 {
  readonly id: PlayerViewV6["chocolateWalls"][number]["id"];
  readonly ownerId: number;
  readonly faction: FactionIdV6;
  readonly hp: number;
  readonly at: CoordV6;
}

export type CombatProjectileV6 = "ARROW" | "GUMBALL";

export interface CombatPresentationV6 {
  readonly key: string;
  readonly commandIndex: number;
  readonly motion: "FULL" | "REDUCED";
  readonly durationMs: number;
  readonly actorController: "HUMAN" | "AI";
  readonly kind: "MELEE" | "RANGED";
  readonly projectile: CombatProjectileV6 | null;
  readonly attacker: CombatSpriteSnapshotV6;
  readonly target: CombatSpriteSnapshotV6 | null;
  readonly targetWall: CombatWallSnapshotV6 | null;
  readonly targetAt: CoordV6;
  readonly damaged: readonly CombatSpriteSnapshotV6[];
  readonly wallDamaged: boolean;
  readonly advances: boolean;
}

export interface CombatAnimationFrameV6 {
  readonly attackerTravel: number;
  readonly projectileTravel: number;
  readonly projectileOpacity: number;
  readonly shake: number;
  readonly damagedOpacity: number;
}

/**
 * Converts only accepted, public combat facts into transient Canvas data.
 * Effective faction-role rules distinguish melee lunges from ranged projectiles;
 * distance alone never changes a role's presentation identity.
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
    const wall =
      targetRef.kind === "CHOCOLATE_WALL"
        ? beforeView.chocolateWalls.find(
            (candidate) => candidate.id === targetRef.wallId,
          )
        : undefined;
    const target = defender ?? wall;
    if (attacker === undefined || target === undefined) return;

    const attackerSnapshot = spriteSnapshot(beforeView, attacker);
    if (attackerSnapshot === null) return;
    const ranged = isRangedCombatant(attackerSnapshot);
    if (!ranged && !isAdjacent(attacker.at, target.at)) return;
    const targetSnapshot =
      defender === undefined ? null : spriteSnapshot(beforeView, defender);
    const targetWall =
      targetRef.kind === "CHOCOLATE_WALL" && wall !== undefined
        ? wallSnapshot(beforeView, wall)
        : null;
    if (targetRef.kind === "CHOCOLATE_WALL" && targetWall === null) return;
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
      kind: ranged ? "RANGED" : "MELEE",
      projectile: ranged
        ? attackerSnapshot.faction === "CANDY"
          ? "GUMBALL"
          : "ARROW"
        : null,
      attacker: attackerSnapshot,
      target: targetSnapshot,
      targetWall,
      targetAt: target.at,
      damaged: Object.freeze(damaged),
      wallDamaged:
        targetRef.kind === "CHOCOLATE_WALL" &&
        event.preview.damageToDefender > 0,
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
    return {
      attackerTravel: 0,
      projectileTravel: presentation.kind === "RANGED" ? 1 : 0,
      projectileOpacity: presentation.kind === "RANGED" ? 1 : 0,
      shake: 0,
      damagedOpacity: 0.58,
    };
  }
  const elapsed = clamp(elapsedMs, 0, presentation.durationMs);
  const contactDuration =
    presentation.kind === "RANGED"
      ? COMBAT_PRESENTATION_TIMING_V6.projectileMs
      : COMBAT_PRESENTATION_TIMING_V6.contactMs;
  if (elapsed <= contactDuration) {
    const progress = elapsed / contactDuration;
    return {
      attackerTravel:
        presentation.kind === "MELEE" ? easeOutCubic(progress) * 0.28 : 0,
      projectileTravel:
        presentation.kind === "RANGED" ? easeOutCubic(progress) : 0,
      projectileOpacity: presentation.kind === "RANGED" ? 1 : 0,
      shake: 0,
      damagedOpacity: 1,
    };
  }
  const impactDuration = presentation.durationMs - contactDuration;
  const impact = clamp((elapsed - contactDuration) / impactDuration, 0, 1);
  return {
    attackerTravel:
      presentation.kind === "RANGED"
        ? 0
        : presentation.advances
          ? 0.28 + 0.72 * easeOutCubic(impact)
          : 0.28 * (1 - easeOutCubic(impact)),
    projectileTravel: presentation.kind === "RANGED" ? 1 : 0,
    projectileOpacity: 0,
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

function wallSnapshot(
  view: PlayerViewV6,
  wall: PlayerViewV6["chocolateWalls"][number],
): CombatWallSnapshotV6 | null {
  const faction = view.players.find(
    (player) => player.id === wall.ownerId,
  )?.faction;
  return faction === undefined
    ? null
    : {
        id: wall.id,
        ownerId: wall.ownerId,
        faction,
        hp: wall.hp,
        at: wall.at,
      };
}

function isRangedCombatant(attacker: CombatSpriteSnapshotV6): boolean {
  return effectiveRoleRuleV6(attacker.faction, attacker.role).range > 1;
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
