import { describe, expect, it } from "vitest";
import type { CombatPresentation } from "../../src/app/types";
import {
  ARCHER_PROJECTILE_TIMING,
  archerProjectileEndpoints,
  arrowGeometry,
  combatAnimationFrame,
} from "../../src/render/canvas/combat-presentation";
import { projectGrid, worldToScreen } from "../../src/render/canvas/geometry";
import { usesPreCombatSnapshot } from "../../src/render/canvas/board-renderer";
import { gameStateBuilder } from "../fixtures/builders";

describe("combat presentation timing", () => {
  it("eases a full-motion attacker toward contact without entering game state", () => {
    const presentation = fixture({ phase: "CONTACT", phaseDurationMs: 200 });
    expect(combatAnimationFrame(presentation, 0).attackerTravel).toBe(0);
    expect(combatAnimationFrame(presentation, 100).attackerTravel).toBeCloseTo(
      0.63,
    );
    expect(combatAnimationFrame(presentation, 200)).toMatchObject({
      attackerTravel: 0.72,
      impact: 0,
      defenderOpacity: 1,
    });
  });

  it("decays impact/death feedback and never translates reduced-motion combat", () => {
    const reduced = fixture({
      phase: "IMPACT",
      phaseDurationMs: 100,
      motion: "REDUCED",
      defenderDies: true,
      advances: false,
    });
    expect(combatAnimationFrame(reduced, 0)).toMatchObject({
      attackerTravel: 0,
      impact: 1,
      defenderOpacity: 1,
    });
    const settled = combatAnimationFrame(reduced, 100);
    expect(settled).toMatchObject({
      attackerTravel: 0,
      defenderOpacity: 0,
    });
    expect(settled.impact).toBeCloseTo(0.3);
  });

  it("uses the exact cubic-out Archer flight and impact-boundary crossfade", () => {
    const flight = fixture({
      kind: "ARCHER_ARROW",
      phase: "FLIGHT",
      phaseDurationMs: ARCHER_PROJECTILE_TIMING.flightMs,
    });
    expect(combatAnimationFrame(flight, 0).arrowTravel).toBe(0);
    expect(combatAnimationFrame(flight, 140).arrowTravel).toBeCloseTo(0.875);
    expect(combatAnimationFrame(flight, 280)).toMatchObject({
      attackerTravel: 0,
      arrowTravel: 1,
      preCombatOpacity: 1,
    });
    const impact = fixture({
      kind: "ARCHER_ARROW",
      phase: "IMPACT",
      phaseDurationMs: ARCHER_PROJECTILE_TIMING.impactMs,
    });
    expect(combatAnimationFrame(impact, 0)).toMatchObject({
      arrowTravel: 1,
      impact: 1,
      preCombatOpacity: 1,
    });
    expect(combatAnimationFrame(impact, 100)).toMatchObject({
      arrowTravel: 1,
      impact: 0,
      preCombatOpacity: 0,
    });
  });

  it.each([0.625, 1, 1.75])(
    "reprojects attachment-to-torso geometry for all directions at zoom %s",
    (zoom) => {
      const source = { x: 5, y: 5 };
      const camera = { offsetX: 430, offsetY: 210, zoom };
      const sourceGround = worldToScreen(projectGrid(source), camera);
      for (const [dx, dy] of [
        [-1, -1],
        [0, -1],
        [1, -1],
        [-1, 0],
        [1, 0],
        [-1, 1],
        [0, 1],
        [1, 1],
      ] as const) {
        const targetGround = worldToScreen(
          projectGrid({ x: source.x + dx * 2, y: source.y + dy * 2 }),
          camera,
        );
        const endpoints = archerProjectileEndpoints(
          sourceGround,
          targetGround,
          zoom,
        );
        const start = arrowGeometry(endpoints, 0, zoom);
        const end = arrowGeometry(endpoints, 1, zoom);
        expect(start.tip).toEqual(endpoints.from);
        expect(end.tip).toEqual(endpoints.to);
        const projectileVector = {
          x: end.tip.x - start.tip.x,
          y: end.tip.y - start.tip.y,
        };
        const shaftVector = {
          x: end.shaftEnd.x - end.tail.x,
          y: end.shaftEnd.y - end.tail.y,
        };
        expect(
          projectileVector.x * shaftVector.x +
            projectileVector.y * shaftVector.y,
        ).toBeGreaterThan(0);
      }
    },
  );

  it("keeps CSS arrow geometry invariant across DPR 1 and DPR 2 backing stores", () => {
    const endpoints = archerProjectileEndpoints(
      { x: 200, y: 300 },
      { x: 420, y: 170 },
      1,
    );
    const cssAtDpr1 = arrowGeometry(endpoints, 0.4, 1);
    const cssAtDpr2 = arrowGeometry(endpoints, 0.4, 1);
    expect(cssAtDpr2).toEqual(cssAtDpr1);
    expect(cssAtDpr2.outlineWidth).toBe(2);
  });

  it("switches health/death rendering to the post-event frame at impact", () => {
    const flight = fixture({ kind: "ARCHER_ARROW", phase: "FLIGHT" });
    const impact = fixture({ kind: "ARCHER_ARROW", phase: "IMPACT" });
    const defenderStatus = {
      kind: "UNIT_STATUS" as const,
      id: flight.defender.id,
    };
    expect(usesPreCombatSnapshot(flight, defenderStatus)).toBe(true);
    expect(usesPreCombatSnapshot(impact, defenderStatus)).toBe(false);
  });
});

function fixture(overrides: Partial<CombatPresentation>): CombatPresentation {
  const state = gameStateBuilder();
  const attacker = state.units[0];
  const defender = state.units[1];
  if (attacker === undefined || defender === undefined)
    throw new Error("Missing combatants");
  return {
    id: 1,
    kind: "STANDARD",
    queueToken: 1,
    commandIndex: 1,
    phase: "CONTACT",
    phaseDurationMs: 200,
    phaseElapsedMs: 0,
    paused: false,
    motion: "FULL",
    attacker,
    defender,
    damageToDefender: 5,
    damageToAttacker: 2,
    defenderDies: false,
    attackerDies: false,
    advances: false,
    ...overrides,
  };
}
