import { describe, expect, it } from "vitest";
import {
  applyCommandV7,
  FACTION_IDS_V7,
  projectEventsV7,
  UNIT_ROLE_IDS_V7,
  viewForV7,
  type CoordV7,
  type GameStateV7,
  type PlayerViewV7,
} from "../../src/engine/index";
import {
  ATTACK_EFFECT_DURATIONS_V7,
  ATTACK_EFFECT_HIT_V7,
  ATTACK_EFFECT_IDS_V7,
  ATTACK_EFFECT_SCALE_V7,
  GATLING_ROUND_GAP_V7,
  NECRO_BOLT_CLASSIC_V7,
  NECRO_BOLT_VIOLET_V7,
  attackEffectForV7,
  attackEffectPlanV7,
  attackReducedMotionProgressV7,
  drawAttackFeedbackV7,
  type AttackEffectIdV7,
  type AttackFeedbackV7,
} from "../../src/render/canvas/attack-effects-v7";
import { projectGrid, worldToScreen } from "../../src/render/canvas/geometry";
import {
  corePresentationPlanV7,
  type CorePresentationStepV7,
} from "../../src/render/canvas/presentation-plan-v7";
import { DWARF_UI_V7, dwarfUiFixtureV7 } from "../fixtures/v7-dwarf-ui";
import { goblinArenaV7 } from "../fixtures/v7-goblin-arena";
import { ICE_FOLK_UI_V7, iceFolkUiFixtureV7 } from "../fixtures/v7-ice-folk-ui";
import {
  UNDEAD_SHOWCASE_V7,
  undeadShowcaseFixtureV7,
} from "../fixtures/v7-undead-ui";

type LogEntry = readonly unknown[];

function recordingContext(): {
  readonly context: CanvasRenderingContext2D;
  readonly log: LogEntry[];
} {
  const log: LogEntry[] = [];
  const context = new Proxy(
    {},
    {
      get: (target, key) =>
        key === "canvas"
          ? undefined
          : key in target
            ? Reflect.get(target, key)
            : (...args: unknown[]) => {
                log.push([String(key), ...args]);
              },
      set: (target, key, value) => {
        log.push(["set", String(key), value]);
        return Reflect.set(target, key, value);
      },
    },
  );
  return { context: context as CanvasRenderingContext2D, log };
}

const camera = { offsetX: 40, offsetY: 30, zoom: 0.625 };
const from = { x: 1, y: 2 };
const to = { x: 3, y: 2 };

const feedback = (
  effect: AttackEffectIdV7,
  progress: number,
  extra: Partial<AttackFeedbackV7> = {},
): AttackFeedbackV7 => ({ effect, from, to, progress, ...extra });

function unitAt(
  view: PlayerViewV7,
  at: CoordV7,
): PlayerViewV7["units"][number] {
  const unit = view.units.find(
    (candidate) => candidate.at.x === at.x && candidate.at.y === at.y,
  );
  if (unit === undefined) throw new Error(`no unit at ${at.x},${at.y}`);
  return unit;
}

/** The plan of the human seat's attack from `attacker` on `target`. */
function attackSteps(
  state: GameStateV7,
  attacker: CoordV7,
  target: CoordV7,
): readonly CorePresentationStepV7[] {
  const actor = state.humanPlayerId;
  const before = viewForV7(state, actor);
  const result = applyCommandV7(state, actor, {
    kind: "ATTACK",
    unitId: unitAt(before, attacker).id,
    targetUnitId: unitAt(before, target).id,
  });
  if (!result.accepted) throw new Error(result.error.code);
  return corePresentationPlanV7(
    before,
    projectEventsV7(state, result.state, actor, result.events),
    viewForV7(result.state, actor),
  );
}

describe("Attack cues: which attacks get one (bead pulp_wars-b5f.5)", () => {
  it("maps only the six chosen shooters, and the Yeti's Rockfall", () => {
    const chosen = new Map<string, AttackEffectIdV7>([
      ["UNDEAD:CATAPULT", "NECRO_BOLT"],
      ["GOBLIN:CATAPULT", "FIREWORK_ROCKET"],
      ["DWARF:MARKSMAN", "GATLING_BURST"],
      ["DWARF:CATAPULT", "CANNON_BLAST"],
      ["ICE_FOLK:CATAPULT", "ICE_BOULDER"],
      ["ICE_FOLK:MARKSMAN", "HARPOON"],
    ]);
    for (const faction of FACTION_IDS_V7)
      for (const role of UNIT_ROLE_IDS_V7)
        expect(attackEffectForV7(faction, role), `${faction}:${role}`).toBe(
          chosen.get(`${faction}:${role}`) ?? null,
        );
    expect(attackEffectForV7("ICE_FOLK", "FIGHTER", { rockfall: true })).toBe(
      "ICE_BOULDER",
    );
    // Rockfall is an Ice Folk ability; the Martians have their own rays.
    expect(attackEffectForV7("ORIGINAL", "FIGHTER", { rockfall: true })).toBe(
      null,
    );
    expect(attackEffectForV7("MARTIAN", "CATAPULT")).toBe(null);
    expect(attackEffectForV7(undefined, "CATAPULT")).toBe(null);
  });

  it("marks the Lich's shot, then its splash burst", () => {
    const steps = attackSteps(
      undeadShowcaseFixtureV7(),
      UNDEAD_SHOWCASE_V7.lich,
      UNDEAD_SHOWCASE_V7.lichTarget,
    );
    expect(steps[0]).toMatchObject({
      kind: "CATAPULT",
      from: UNDEAD_SHOWCASE_V7.lich,
      to: UNDEAD_SHOWCASE_V7.lichTarget,
      attackEffect: "NECRO_BOLT",
    });
    expect(steps[1]).toMatchObject({ kind: "SUPPORT", effect: "SPLASH" });
  });

  it("marks the Rocket Cart's firework; the Bomb Chucker and Human shots keep theirs", () => {
    const arena = (
      faction: "GOBLIN" | "ORIGINAL",
      role: "CATAPULT" | "MARKSMAN",
    ) =>
      goblinArenaV7(
        [faction, faction === "GOBLIN" ? "ORIGINAL" : "GOBLIN"],
        [
          { seat: 0, role, at: { x: 6, y: 1 } },
          { seat: 1, role: "GUARD", at: { x: 8, y: 1 } },
        ],
      );
    const shot = (
      faction: "GOBLIN" | "ORIGINAL",
      role: "CATAPULT" | "MARKSMAN",
    ) => attackSteps(arena(faction, role), { x: 6, y: 1 }, { x: 8, y: 1 })[0];
    expect(shot("GOBLIN", "CATAPULT")).toMatchObject({
      kind: "CATAPULT",
      attackEffect: "FIREWORK_ROCKET",
    });
    const bomb = shot("GOBLIN", "MARKSMAN");
    expect(bomb).toMatchObject({ kind: "CATAPULT", projectile: "BOMB" });
    expect(bomb).not.toHaveProperty("attackEffect");
    expect(shot("ORIGINAL", "CATAPULT")).not.toHaveProperty("attackEffect");
    expect(shot("ORIGINAL", "MARKSMAN")).toMatchObject({ kind: "RANGED" });
    expect(shot("ORIGINAL", "MARKSMAN")).not.toHaveProperty("attackEffect");
  });

  it("marks the Gunner's burst and the Steam Cannon's blast before its Knockback", () => {
    const at = DWARF_UI_V7;
    const state = dwarfUiFixtureV7();
    const view = viewForV7(state, state.humanPlayerId);
    // The Gunner's target: the enemy two tiles away (the Captain).
    const target = view.units.find(
      (unit) =>
        unit.ownerId !== view.viewer.id &&
        Math.max(
          Math.abs(unit.at.x - at.gunner.x),
          Math.abs(unit.at.y - at.gunner.y),
        ) === 2,
    );
    if (target === undefined) throw new Error("no Gunner target");
    expect(attackSteps(state, at.gunner, target.at)[0]).toMatchObject({
      kind: "RANGED",
      attackEffect: "GATLING_BURST",
    });
    const cannon = attackSteps(state, at.cannon, at.knockTarget);
    expect(cannon[0]).toMatchObject({
      kind: "CATAPULT",
      attackEffect: "CANNON_BLAST",
    });
    expect(
      cannon.some(
        (step) => step.kind === "DWARF" && step.effect === "KNOCKBACK",
      ),
    ).toBe(true);
  });

  it("marks the Boulder Yeti's boulder, a Rockfall, and the Snow Hunter's harpoon", () => {
    const at = ICE_FOLK_UI_V7;
    expect(
      attackSteps(iceFolkUiFixtureV7(), at.boulderYeti, at.boulderTarget)[0],
    ).toMatchObject({ kind: "CATAPULT", attackEffect: "ICE_BOULDER" });
    expect(
      attackSteps(iceFolkUiFixtureV7(), at.rockfallYeti, at.rockfallTarget)[0],
    ).toMatchObject({ kind: "CATAPULT", attackEffect: "ICE_BOULDER" });
    const harpoon = attackSteps(
      iceFolkUiFixtureV7(),
      at.hunter,
      at.shatterTarget,
    )[0];
    expect(harpoon).toMatchObject({ kind: "RANGED", attackEffect: "HARPOON" });
  });
});

describe("Attack cue plans", () => {
  const centre = (at: CoordV7) => worldToScreen(projectGrid(at), camera);

  it("keeps every cue short and lands it before the burst", () => {
    for (const effect of ATTACK_EFFECT_IDS_V7) {
      expect(ATTACK_EFFECT_DURATIONS_V7[effect], effect).toBeLessThanOrEqual(
        480,
      );
      expect(ATTACK_EFFECT_HIT_V7[effect], effect).toBeGreaterThanOrEqual(0.5);
      expect(ATTACK_EFFECT_HIT_V7[effect], effect).toBeLessThan(0.6);
      // Reduced motion holds a frame with the shot still in the air.
      const held = attackReducedMotionProgressV7(effect);
      expect(held, effect).toBeLessThan(ATTACK_EFFECT_HIT_V7[effect]);
      expect(
        attackEffectPlanV7(feedback(effect, held), camera).shots.length,
        effect,
      ).toBeGreaterThan(0);
    }
  });

  it("flies each shot from the shooter's side to the target, then bursts there", () => {
    for (const effect of ATTACK_EFFECT_IDS_V7) {
      const hit = ATTACK_EFFECT_HIT_V7[effect];
      const early = attackEffectPlanV7(feedback(effect, 0.1), camera);
      const late = attackEffectPlanV7(feedback(effect, hit - 0.06), camera);
      const after = attackEffectPlanV7(feedback(effect, hit + 0.05), camera);
      const end = attackEffectPlanV7(feedback(effect, 1), camera);
      const first = early.shots[0];
      const last = late.shots.at(-1);
      if (first === undefined || last === undefined)
        throw new Error(`${effect} has no shot in flight`);
      // Left to right: the shot advances toward the target's column.
      expect(first.at.x, effect).toBeLessThan(last.at.x);
      expect(Math.abs(last.at.x - centre(to).x), effect).toBeLessThan(
        Math.abs(first.at.x - centre(to).x),
      );
      expect(after.impacts.length, effect).toBeGreaterThan(0);
      expect(end.shots, effect).toEqual([]);
      for (const impact of after.impacts)
        expect(Math.abs(impact.at.x - centre(to).x), effect).toBeLessThan(
          16 * camera.zoom,
        );
      // Trails lie behind the shot.
      for (const point of last.trail)
        expect(point.x, effect).toBeLessThanOrEqual(last.at.x + 0.001);
      expect(early.scale).toBe(ATTACK_EFFECT_SCALE_V7);
    }
  });

  it("arcs the lobbed shots and keeps the gatling straight", () => {
    const peak = (effect: AttackEffectIdV7): number => {
      const hit = ATTACK_EFFECT_HIT_V7[effect];
      const plan = attackEffectPlanV7(feedback(effect, hit / 2 + 0.03), camera);
      const shot = plan.shots[0];
      if (shot === undefined) throw new Error(effect);
      return plan.target.y - shot.at.y;
    };
    for (const effect of [
      "NECRO_BOLT",
      "FIREWORK_ROCKET",
      "CANNON_BLAST",
      "ICE_BOULDER",
    ] as const)
      expect(peak(effect), effect).toBeGreaterThan(15 * camera.zoom);
    const gatling = attackEffectPlanV7(feedback("GATLING_BURST", 0.15), camera);
    const round = gatling.shots[0];
    if (round === undefined) throw new Error("no round");
    expect(Math.abs(round.angle)).toBeLessThan(0.15);
  });

  it("fires three gatling rounds a gap apart, each with its own spark", () => {
    const rounds = (progress: number) =>
      attackEffectPlanV7(feedback("GATLING_BURST", progress), camera);
    expect(rounds(0.05).shots).toHaveLength(1);
    expect(rounds(0.05 + GATLING_ROUND_GAP_V7).shots).toHaveLength(2);
    expect(rounds(0.05 + 2 * GATLING_ROUND_GAP_V7).shots).toHaveLength(3);
    const sparks = rounds(0.6).impacts;
    expect(sparks.length).toBeGreaterThanOrEqual(2);
    expect(new Set(sparks.map((spark) => spark.at.y)).size).toBe(sparks.length);
    expect(rounds(0.3).muzzle).not.toBeNull();
    expect(rounds(0.9).muzzle).toBeNull();
  });

  it("keeps the harpoon's line until the hit, then lets it go", () => {
    const line = (progress: number) =>
      attackEffectPlanV7(feedback("HARPOON", progress), camera).line;
    expect(line(0.2)).toBe(1);
    expect(line(0.65)).toBeGreaterThan(0);
    expect(line(0.65)).toBeLessThan(1);
    expect(line(0.95)).toBe(0);
    expect(attackEffectPlanV7(feedback("NECRO_BOLT", 0.2), camera).line).toBe(
      0,
    );
  });
});

describe("Attack cue drawing", () => {
  it("draws every cue in code at every stage, never an image", () => {
    for (const effect of ATTACK_EFFECT_IDS_V7)
      for (const progress of [0, 0.15, 0.35, 0.5, 0.65, 0.85, 1]) {
        const { context, log } = recordingContext();
        drawAttackFeedbackV7(context, camera, feedback(effect, progress));
        expect(log.some((call) => call[0] === "drawImage")).toBe(false);
        if (progress > 0 && progress < 0.8)
          expect(
            log.some((call) => call[0] === "fill" || call[0] === "stroke"),
            `${effect} at ${progress}`,
          ).toBe(true);
        // Balanced: the overlay's state is left as it was found.
        expect(log.filter((call) => call[0] === "save").length).toBe(
          log.filter((call) => call[0] === "restore").length,
        );
      }
  });

  it("draws the Lich's bolt in the live violet or the classic pale blue", () => {
    const fills = (undeadViolet: boolean) => {
      const { context, log } = recordingContext();
      drawAttackFeedbackV7(
        context,
        camera,
        feedback("NECRO_BOLT", 0.4, { undeadViolet }),
      );
      return log
        .filter(
          (call) =>
            call[0] === "set" &&
            (call[1] === "fillStyle" || call[1] === "strokeStyle"),
        )
        .map((call) => call[2]);
    };
    expect(fills(true)).toContain(NECRO_BOLT_VIOLET_V7.mid);
    expect(fills(true)).not.toContain(NECRO_BOLT_CLASSIC_V7.mid);
    expect(fills(false)).toContain(NECRO_BOLT_CLASSIC_V7.mid);
    expect(fills(false)).not.toContain(NECRO_BOLT_VIOLET_V7.mid);
  });

  it("draws smaller at LEGACY's scale", () => {
    const radius = (scale?: number) => {
      const { context, log } = recordingContext();
      drawAttackFeedbackV7(
        context,
        camera,
        feedback("NECRO_BOLT", 0.3, scale === undefined ? {} : { scale }),
      );
      return Math.max(
        ...log
          .filter((call) => call[0] === "arc")
          .map((call) => Number(call[3])),
      );
    };
    expect(radius(1)).toBeLessThan(radius());
    expect(radius() / radius(1)).toBeCloseTo(ATTACK_EFFECT_SCALE_V7, 5);
  });
});
