import { describe, expect, it } from "vitest";
import {
  applyCommandV7,
  projectEventsV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type GameStateV7,
  type PlayerEventEnvelopeV7,
  type PlayerId,
  type PlayerViewV7,
} from "../../src/engine/index";
import {
  CombatJuiceV7,
  DAMAGE_FLOAT_V7,
  DEATH_POOF_V7,
  SPAWN_POP_V7,
  combatJuiceDeathsV7,
  combatJuiceHitsForStepV7,
  combatJuiceScaleV7,
  combatJuiceSpawnsV7,
  damageFloatFrameV7,
  deathPoofFrameV7,
  spawnPopFrameV7,
} from "../../src/render/canvas/combat-juice-v7";
import {
  corePresentationPlanV7,
  type CorePresentationStepV7,
} from "../../src/render/canvas/presentation-plan-v7";
import {
  COMBAT_JUICE_UI_V7,
  combatJuiceEnemyTurnFixtureV7,
  combatJuiceFixtureV7,
} from "../fixtures/v7-combat-juice-ui";

/**
 * Bead pulp_wars-2yc.80 (docs/ui/UI_REVIEW_2026_10.md V1, V2, V3): which
 * hits float a number and when, which deaths poof and which arrivals pop,
 * from hand-built boundaries; the cues' frames from start to end, with
 * reduced motion; and the stacking and staggering of the numbers.
 */

const at = COMBAT_JUICE_UI_V7;

function unitIdAt(state: GameStateV7, cell: CoordV7): number {
  const unit = state.units.find(
    (candidate) => candidate.at.x === cell.x && candidate.at.y === cell.y,
  );
  if (unit === undefined) throw new Error(`no unit at ${cell.x},${cell.y}`);
  return unit.id;
}

interface BoundaryV7 {
  readonly before: PlayerViewV7;
  readonly after: PlayerViewV7;
  readonly envelope: PlayerEventEnvelopeV7;
  readonly steps: readonly CorePresentationStepV7[];
}

/** One command by `actor`, as the human seat sees it. */
function boundary(
  state: GameStateV7,
  command: CommandV7,
  actor: PlayerId = state.humanPlayerId,
): BoundaryV7 {
  const viewer = state.humanPlayerId;
  const result = applyCommandV7(state, actor, command);
  if (!result.accepted) throw new Error(result.error.code);
  const before = viewForV7(state, viewer);
  const after = viewForV7(result.state, viewer);
  const envelope = projectEventsV7(state, result.state, viewer, result.events);
  return {
    before,
    after,
    envelope,
    steps: corePresentationPlanV7(before, envelope, after),
  };
}

function attack(
  state: GameStateV7,
  from: CoordV7,
  to: CoordV7,
  actor?: PlayerId,
): BoundaryV7 {
  return boundary(
    state,
    {
      kind: "ATTACK",
      unitId: unitIdAt(state, from) as never,
      targetUnitId: unitIdAt(state, to) as never,
    },
    actor,
  );
}

function hitsOf(played: BoundaryV7) {
  return played.steps.flatMap((step, index) =>
    combatJuiceHitsForStepV7(played.steps, index, played.envelope).map(
      (hit) => ({ ...hit, kind: step.kind }),
    ),
  );
}

describe("Combat juice: what floats, poofs and pops", () => {
  it("floats a kill's number when the blow lands and poofs the victim where it stood", () => {
    const state = combatJuiceFixtureV7();
    const played = attack(state, at.knight, at.knightVictim);
    const victim = unitIdAt(state, at.knightVictim);
    const melee = played.steps.find((step) => step.kind === "MELEE");
    expect(melee?.kind).toBe("MELEE");
    // The victim had 3 HP: one number, on its tile, as the lunge ends
    // (the frame the board shows the result); no retaliation.
    expect(hitsOf(played)).toEqual([
      {
        unitId: victim,
        at: at.knightVictim,
        amount: 3,
        delayMs: melee?.kind === "MELEE" ? melee.durationMs : -1,
        kind: "MELEE",
      },
    ]);
    // The Knight advances onto the tile; the poof is the victim's.
    expect(
      combatJuiceDeathsV7(
        played.before,
        played.after,
        played.envelope,
        played.steps,
      ),
    ).toEqual([{ unitId: victim, at: at.knightVictim }]);
    expect(
      combatJuiceSpawnsV7(played.before, played.after, played.envelope),
    ).toEqual([]);
  });

  it("floats the hit and then the retaliation on the attacker's tile", () => {
    const state = combatJuiceFixtureV7();
    const played = attack(state, at.fighter, at.goblinGuard);
    const event = played.envelope.events.find(
      (candidate) => candidate.kind === "COMBAT_RESOLVED",
    );
    if (event?.kind !== "COMBAT_RESOLVED") throw new Error("no combat");
    expect(event.preview.damageToAttacker).toBeGreaterThan(0);
    const hits = hitsOf(played);
    expect(hits).toHaveLength(2);
    const [hit, answer] = hits;
    expect(hit).toMatchObject({
      unitId: unitIdAt(state, at.goblinGuard),
      at: at.goblinGuard,
      amount: event.preview.damageToDefender,
    });
    expect(answer).toMatchObject({
      unitId: unitIdAt(state, at.fighter),
      at: at.fighter,
      amount: event.preview.damageToAttacker,
      delayMs: (hit?.delayMs ?? 0) + DAMAGE_FLOAT_V7.retaliationBeatMs,
    });
    expect(
      combatJuiceDeathsV7(
        played.before,
        played.after,
        played.envelope,
        played.steps,
      ),
    ).toEqual([]);
  });

  it("floats an enemy bomb's hit with the shot and its splash with the damage step", () => {
    const state = combatJuiceEnemyTurnFixtureV7();
    const goblin = state.players.find(
      (player) => player.id !== state.humanPlayerId,
    );
    if (goblin === undefined) throw new Error("no goblin seat");
    const played = attack(state, at.bombChucker, at.bombTarget, goblin.id);
    const hits = hitsOf(played);
    // The bomb's own burst floats nothing: its target floats with the
    // shot, its splash with the damage step after it.
    expect(hits.map((hit) => [hit.kind, hit.at])).toEqual([
      ["CATAPULT", at.bombTarget],
      ["DAMAGE", at.bombSplash],
    ]);
    expect(hits[0]?.delayMs).toBe(280);
    expect(hits[1]?.delayMs).toBe(0);
    expect(hits.every((hit) => hit.amount > 0)).toBe(true);
  });

  it("pops a trained unit on its city, and nothing else", () => {
    const state = combatJuiceFixtureV7();
    const city = state.cities.find(
      (candidate) =>
        candidate.at.x === at.capital.x && candidate.at.y === at.capital.y,
    );
    if (city === undefined) throw new Error("no capital");
    const played = boundary(state, {
      kind: "TRAIN",
      cityId: city.id,
      role: "FIGHTER",
    });
    const trained = played.after.units.find(
      (unit) => !played.before.units.some((prior) => prior.id === unit.id),
    );
    expect(trained).toBeDefined();
    expect(
      combatJuiceSpawnsV7(played.before, played.after, played.envelope),
    ).toEqual([{ unitId: trained?.id, at: at.capital }]);
    expect(hitsOf(played)).toEqual([]);
  });

  it("leaves out a number a cue already floats, and deaths with a cue of their own", () => {
    const a = { x: 1, y: 1 };
    const b = { x: 2, y: 1 };
    const damage = (cell: CoordV7, unitId: number): CorePresentationStepV7 => ({
      kind: "DAMAGE",
      unitId,
      at: cell,
      damage: 2,
      lethal: false,
      durationMs: 100,
    });
    const steps: CorePresentationStepV7[] = [
      {
        kind: "CANDY",
        effect: "THUMP",
        from: { x: 1, y: 2 },
        cells: [a],
        amounts: [2],
        durationMs: 500,
      },
      damage(a, 7),
      damage(b, 8),
    ];
    const envelope = { events: [] } as unknown as PlayerEventEnvelopeV7;
    expect(combatJuiceHitsForStepV7(steps, 1, envelope)).toEqual([]);
    expect(combatJuiceHitsForStepV7(steps, 2, envelope)).toEqual([
      { unitId: 8, at: b, amount: 2, delayMs: 0 },
    ]);
    // A shattered unit bursts in its own cue; an Egg breaks its shell.
    const state = combatJuiceFixtureV7();
    const before = viewForV7(state, state.humanPlayerId);
    const victim = unitIdAt(state, at.knightVictim);
    const after = {
      ...before,
      units: before.units.filter((unit) => unit.id !== victim),
    };
    const died = (cause: string) =>
      ({
        events: [{ kind: "UNIT_DIED", unitId: victim, cause }],
      }) as unknown as PlayerEventEnvelopeV7;
    expect(combatJuiceDeathsV7(before, after, died("SHATTER"), [])).toEqual([]);
    expect(combatJuiceDeathsV7(before, after, died("SPLASH"), [])).toEqual([
      { unitId: victim, at: at.knightVictim },
    ]);
  });
});

describe("Combat juice: the frames of each cue", () => {
  it("pops a number in large, holds it, and fades it as it rises", () => {
    const length = DAMAGE_FLOAT_V7.durationMs;
    const first = damageFloatFrameV7(0, length, false);
    expect(first?.scale).toBeCloseTo(DAMAGE_FLOAT_V7.popScale);
    expect(first?.alpha).toBe(0);
    const held = damageFloatFrameV7(length * 0.3, length, false);
    expect(held?.alpha).toBe(1);
    expect(held?.scale).toBe(1);
    const late = damageFloatFrameV7(length * 0.9, length, false);
    expect(late?.alpha).toBeLessThan(0.5);
    expect(late?.riseWorld).toBeGreaterThan(held?.riseWorld ?? 0);
    expect(damageFloatFrameV7(length, length, false)).toBeNull();
    expect(damageFloatFrameV7(-1, length, false)).toBeNull();
    // Reduced motion: one still frame, at the top of the rise, opaque.
    const still = DAMAGE_FLOAT_V7.reducedHoldMs;
    const top = DAMAGE_FLOAT_V7.startWorld + DAMAGE_FLOAT_V7.riseWorld;
    expect(damageFloatFrameV7(0, still, true)).toEqual({
      riseWorld: top,
      alpha: 1,
      scale: 1,
    });
    expect(damageFloatFrameV7(still - 1, still, true)).toEqual(
      damageFloatFrameV7(0, still, true),
    );
    expect(damageFloatFrameV7(still, still, true)).toBeNull();
  });

  it("flashes, squashes and sinks a dying unit into its dust", () => {
    const length = DEATH_POOF_V7.durationMs;
    const at = (share: number) =>
      deathPoofFrameV7(share * length, length, false, 3);
    expect(at(DEATH_POOF_V7.flashPeak)?.sprite?.flash).toBeCloseTo(1);
    const squashed = at(DEATH_POOF_V7.squashEnd);
    expect(squashed?.sprite?.scaleY).toBeLessThan(0.5);
    expect(squashed?.sprite?.scaleX).toBeGreaterThan(1.2);
    expect(squashed?.sprite?.offsetY).toBeCloseTo(DEATH_POOF_V7.sinkPx);
    expect(at(DEATH_POOF_V7.spriteFadeEnd + 0.01)?.sprite).toBeNull();
    expect(at(0.3)?.puffs.length).toBeGreaterThan(3);
    expect(at(0.3)?.sparks).toHaveLength(3);
    expect(deathPoofFrameV7(length, length, false)).toBeNull();
    // A flyer starts where it flew and falls to the ground first.
    const flyer = deathPoofFrameV7(0, length, false, 0, 4);
    expect(flyer?.sprite?.offsetY).toBeCloseTo(-4);
    const landed = deathPoofFrameV7(
      DEATH_POOF_V7.flyerDropShare * length,
      length,
      false,
      0,
      4,
    );
    expect(landed?.sprite?.offsetY).toBeGreaterThanOrEqual(0);
    // Reduced motion: the dust cloud alone, still, no sparks.
    const still = deathPoofFrameV7(0, DEATH_POOF_V7.reducedHoldMs, true);
    expect(still?.sprite).toBeNull();
    expect(still?.sparks).toEqual([]);
    expect(still?.puffs.length).toBeGreaterThan(0);
    expect(
      deathPoofFrameV7(
        DEATH_POOF_V7.reducedHoldMs - 1,
        DEATH_POOF_V7.reducedHoldMs,
        true,
      ),
    ).toEqual(still);
  });

  it("drops a new unit in, squashes it on landing and rings its feet", () => {
    const length = SPAWN_POP_V7.durationMs;
    const start = spawnPopFrameV7(0, length, false);
    expect(start?.sprite?.offsetY).toBeCloseTo(-SPAWN_POP_V7.dropPx);
    expect(start?.sprite?.alpha).toBe(0);
    expect(start?.ring).toBeNull();
    const squash = spawnPopFrameV7(
      length * ((SPAWN_POP_V7.landShare + SPAWN_POP_V7.squashEnd) / 2),
      length,
      false,
    );
    expect(squash?.sprite?.offsetY).toBe(0);
    expect(squash?.sprite?.scaleX).toBeGreaterThan(1.1);
    expect(squash?.sprite?.scaleY).toBeLessThan(0.9);
    expect(squash?.ring).not.toBeNull();
    const settled = spawnPopFrameV7(length - 1, length, false);
    expect(settled?.sprite?.scaleX).toBeCloseTo(1, 1);
    expect(settled?.sprite?.scaleY).toBeCloseTo(1, 1);
    expect(spawnPopFrameV7(length, length, false)).toBeNull();
    // Reduced motion: the board draws the unit; a still ring at its feet.
    const still = spawnPopFrameV7(0, SPAWN_POP_V7.reducedHoldMs, true);
    expect(still?.sprite).toBeNull();
    expect(still?.ring).not.toBeNull();
  });

  it("halves at the fast speed and never shortens more", () => {
    expect(combatJuiceScaleV7(1)).toBe(1);
    expect(combatJuiceScaleV7(0.5)).toBe(0.5);
    expect(combatJuiceScaleV7(0.375)).toBe(0.5);
  });
});

describe("Combat juice: cues playing together", () => {
  it("staggers numbers that start together and stacks those on one tile", () => {
    const juice = new CombatJuiceV7();
    const length = DAMAGE_FLOAT_V7.durationMs;
    juice.addFloat({ x: 1, y: 1 }, 3, 100, length, false);
    juice.addFloat({ x: 2, y: 1 }, 2, 100, length, false);
    juice.addFloat({ x: 3, y: 1 }, 2, 100, length, false);
    juice.addFloat({ x: 1, y: 1 }, 1, 200, length, false);
    // A number asked for later on its own starts when asked.
    juice.addFloat({ x: 5, y: 5 }, 4, 2_000, length, false);
    const floats = juice.entries.filter((entry) => entry.kind === "FLOAT");
    expect(floats.map((entry) => entry.startMs)).toEqual([
      100,
      100 + DAMAGE_FLOAT_V7.staggerMs,
      100 + 2 * DAMAGE_FLOAT_V7.staggerMs,
      200,
      2_000,
    ]);
    expect(
      floats.map((entry) => (entry.kind === "FLOAT" ? entry.slot : -1)),
    ).toEqual([0, 0, 0, 1, 0]);
    // Nothing for a hit of nothing.
    juice.addFloat({ x: 9, y: 9 }, 0, 100, length, false);
    expect(juice.entries).toHaveLength(5);
  });

  it("knows what moves, what is still, what it hides, and when it is over", () => {
    const juice = new CombatJuiceV7();
    const sprite = {
      image: {} as CanvasImageSource,
      silhouette: null,
      width: 56,
      height: 80,
      anchorX: 28,
      anchorY: 40,
      feetX: 28,
      feetY: 76,
      shadow: { rx: 14, ry: 5 },
      garrison: false,
      flyerLiftPx: 0,
      growth: 1,
    };
    juice.addUnitCue("POP", 4, { x: 1, y: 1 }, 0, 400, false, sprite);
    juice.addUnitCue("POP", 5, { x: 2, y: 1 }, 0, 400, false, null);
    juice.addUnitCue("POOF", 6, { x: 3, y: 1 }, 0, 300, true, null);
    // A pop with its sprite draws the unit itself until it lands.
    expect([...juice.hiddenUnitIds(100)]).toEqual([4]);
    expect([...juice.hiddenUnitIds(400)]).toEqual([]);
    expect(juice.moving(100)).toBe(true);
    expect(juice.nextStillEndMs(100)).toBe(300);
    expect(juice.active(350)).toBe(true);
    expect(juice.moving(400)).toBe(false);
    expect(juice.active(400)).toBe(false);
    juice.prune(400);
    expect(juice.entries).toEqual([]);
    // A cancelled playback drops the numbers that have not started.
    juice.addFloat({ x: 1, y: 1 }, 2, 500, 800, false);
    juice.addFloat({ x: 1, y: 1 }, 2, 50, 800, false);
    juice.dropPending(100);
    expect(juice.entries.map((entry) => entry.startMs)).toEqual([50]);
  });
});
