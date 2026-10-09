import { describe, expect, it } from "vitest";
import {
  applyCommandV7,
  FACTION_IDS_V7,
  GIANT_SIGNATURES_V7,
  queryPlayerCommandsV7,
  type CommandV7,
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
  BROADSIDE_SHELLS_V7,
  BROADSIDE_SPLASH_DELAY_V7,
  GATLING_ROUND_GAP_V7,
  NECRO_BOLT_CLASSIC_V7,
  NECRO_BOLT_VIOLET_V7,
  attackEffectForV7,
  attackEffectPlanV7,
  attackReducedMotionProgressV7,
  broadsideLookV7,
  broadsideShellForV7,
  drawAttackFeedbackV7,
  type AttackEffectIdV7,
  type AttackFeedbackV7,
} from "../../src/render/canvas/attack-effects-v7";
import {
  TILE_WIDTH,
  projectGrid,
  worldToScreen,
} from "../../src/render/canvas/geometry";
import {
  corePresentationPlanV7,
  type CorePresentationStepV7,
} from "../../src/render/canvas/presentation-plan-v7";
import {
  GIANT_EFFECT_BEAT_V7,
  GIANT_EFFECT_DURATIONS_V7,
  GIANT_FEEDBACK_EFFECTS_V7,
  GIANT_SIGNATURE_CUES_V7,
  drawGiantFeedbackV7,
  giantBoardShakeCssPxV7,
  giantEffectPlanV7,
  giantReducedMotionProgressV7,
  giantUnitPulsesV7,
  type GiantFeedbackEffectV7,
  type GiantFeedbackV7,
} from "../../src/render/canvas/giant-effects-v7";
import { soundCuesForStepV7 } from "../../src/audio/sound-events-v7";
import { CANDY_PALETTE_V7 } from "../../src/assets/chibi-direction-candy-presentation";
import { DWARF_PALETTE_V7 } from "../../src/assets/chibi-direction-dwarf-presentation";
import { ICE_FOLK_PALETTE_V7 } from "../../src/assets/chibi-direction-ice-folk-presentation";
import { MARTIAN_PALETTE_V7 } from "../../src/assets/chibi-direction-martian-presentation";
import {
  GIANTS_UI_V7,
  giantsBreakOffFixtureV7,
  giantsCrushFixtureV7,
  giantsGlacialFixtureV7,
  giantsOverstrideFixtureV7,
  giantsSiegeFixtureV7,
  giantsStompFixtureV7,
  giantsSwallowFixtureV7,
  giantsSwallowedFixtureV7,
  giantsTossFixtureV7,
} from "../fixtures/v7-giants-ui";
import { DWARF_UI_V7, dwarfUiFixtureV7 } from "../fixtures/v7-dwarf-ui";
import { goblinArenaV7 } from "../fixtures/v7-goblin-arena";
import { martianFieldV7 } from "../fixtures/v7-martian";
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
  it("maps only the chosen shooters, and the Yeti's Rockfall", () => {
    const chosen = new Map<string, AttackEffectIdV7>([
      ["UNDEAD:CATAPULT", "NECRO_BOLT"],
      ["GOBLIN:CATAPULT", "FIREWORK_ROCKET"],
      ["DWARF:MARKSMAN", "GATLING_BURST"],
      ["DWARF:CATAPULT", "CANNON_BLAST"],
      ["ICE_FOLK:CATAPULT", "ICE_BOULDER"],
      ["ICE_FOLK:MARKSMAN", "HARPOON"],
      // The Candy UI (bead pulp_wars-jdb.6): the pie and the gumball.
      ["CANDY:CATAPULT", "PIE_THROW"],
      ["CANDY:MARKSMAN", "GUMBALL_SHOT"],
    ]);
    // Bead pulp_wars-eu3r.4: every faction's Battleship fires a broadside.
    for (const faction of FACTION_IDS_V7)
      chosen.set(`${faction}:BATTLESHIP`, "BROADSIDE");
    for (const faction of FACTION_IDS_V7)
      for (const role of UNIT_ROLE_IDS_V7)
        expect(attackEffectForV7(faction, role), `${faction}:${role}`).toBe(
          chosen.get(`${faction}:${role}`) ?? null,
        );
    expect(attackEffectForV7(undefined, "BATTLESHIP")).toBe("BROADSIDE");
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

describe("The Battleship's broadside (bead pulp_wars-eu3r.4)", () => {
  /** Faction `faction`'s Battleship at sea fires on a Guard at range 2. */
  const broadside = (faction: (typeof FACTION_IDS_V7)[number]) => {
    const state = martianFieldV7(
      [
        { seat: 0, role: "BATTLESHIP", at: { x: 5, y: 1 }, form: "NAVAL" },
        { seat: 1, role: "GUARD", at: { x: 5, y: 3 } },
        // In the splash: beside the target and diagonal to it.
        { seat: 1, role: "FIGHTER", at: { x: 5, y: 4 } },
        { seat: 1, role: "FIGHTER", at: { x: 6, y: 2 } },
        // Out of it: two tiles from the target.
        { seat: 1, role: "FIGHTER", at: { x: 7, y: 3 } },
      ],
      {
        factions: [faction, faction === "ORIGINAL" ? "GOBLIN" : "ORIGINAL"],
        water: [{ x: 5, y: 1 }],
      },
    );
    return attackSteps(state, { x: 5, y: 1 }, { x: 5, y: 3 });
  };

  it("gives every faction its own shell", () => {
    expect(new Set(Object.values(BROADSIDE_SHELLS_V7)).size).toBe(
      FACTION_IDS_V7.length,
    );
    for (const faction of FACTION_IDS_V7)
      expect(broadsideShellForV7(faction)).toBe(BROADSIDE_SHELLS_V7[faction]);
    expect(broadsideShellForV7(undefined)).toBe("CANNONBALL");
    expect(BROADSIDE_SHELLS_V7.DWARF).toBe("STEAM");
    expect(BROADSIDE_SHELLS_V7.CANDY).toBe("CANDY");
  });

  it("plans the broadside with its shell and splash cells, then the splash damage", () => {
    // The Ice Folk own no ships (they walk the frozen sea).
    for (const faction of FACTION_IDS_V7.filter(
      (candidate) => candidate !== "ICE_FOLK",
    )) {
      const steps = broadside(faction);
      const shot = steps[0];
      expect(shot, faction).toMatchObject({
        kind: "RANGED",
        from: { x: 5, y: 1 },
        to: { x: 5, y: 3 },
        attackEffect: "BROADSIDE",
        shell: BROADSIDE_SHELLS_V7[faction],
      });
      if (shot?.kind !== "RANGED") throw new Error("no shot");
      expect(
        [...(shot.splash ?? [])].sort((a, b) => a.x - b.x || a.y - b.y),
        faction,
      ).toEqual([
        { x: 5, y: 4 },
        { x: 6, y: 2 },
      ]);
      // The splash damage cues still follow, one per splashed unit.
      expect(
        steps.flatMap((step) =>
          step.kind === "DAMAGE" ? [`${step.at.x},${step.at.y}`] : [],
        ),
        faction,
      ).toEqual(expect.arrayContaining(["5,4", "6,2"]));
    }
  });

  const shot = (
    progress: number,
    extra: Partial<AttackFeedbackV7> = {},
  ): AttackFeedbackV7 =>
    feedback("BROADSIDE", progress, {
      shell: "STEAM",
      splash: [
        { x: 3, y: 3 },
        { x: 4, y: 1 },
      ],
      ...extra,
    });

  it("fires three guns along the hull, one after another", () => {
    const plan = attackEffectPlanV7(shot(0.11), camera);
    expect(plan.guns).toHaveLength(3);
    const [first, second, third] = plan.guns;
    if (first === undefined || second === undefined || third === undefined)
      throw new Error("guns missing");
    expect(first.at.x).toBeLessThan(second.at.x);
    expect(second.at.x).toBeLessThan(third.at.x);
    expect(first.local).toBeGreaterThan(second.local);
    expect(second.local).toBeGreaterThan(third.local);
    expect(attackEffectPlanV7(shot(0.02), camera).guns).toHaveLength(1);
    expect(attackEffectPlanV7(shot(0.9), camera).guns).toEqual([]);
    // Other cues have no guns or ring.
    const bolt = attackEffectPlanV7(feedback("NECRO_BOLT", 0.7), camera);
    expect(bolt.guns).toEqual([]);
    expect(bolt.ring).toBeNull();
  });

  it("spreads a shock ring over the splash tiles and bursts on each splashed unit", () => {
    const hit = ATTACK_EFFECT_HIT_V7.BROADSIDE;
    expect(attackEffectPlanV7(shot(hit - 0.02), camera).ring).toBeNull();
    const area = 1.5 * TILE_WIDTH * camera.zoom;
    const ring = (progress: number) => {
      const found = attackEffectPlanV7(shot(progress), camera).ring;
      if (found === null) throw new Error(`no ring at ${progress}`);
      return found;
    };
    expect(ring(hit + 0.02).halfSize).toBeLessThan(area * 0.5);
    expect(ring(hit + 0.4).halfSize).toBeGreaterThan(area * 0.85);
    expect(ring(hit + 0.4).halfSize).toBeLessThanOrEqual(area);
    expect(ring(hit + 0.02).at).toEqual(worldToScreen(projectGrid(to), camera));
    // The splashed units burst once the ring reaches them; the target at
    // the hit.
    const splashes = (progress: number) =>
      attackEffectPlanV7(shot(progress), camera).impacts.filter(
        (impact) => impact.splash === true,
      );
    expect(splashes(hit + BROADSIDE_SPLASH_DELAY_V7 - 0.02)).toEqual([]);
    const bursting = splashes(hit + BROADSIDE_SPLASH_DELAY_V7 + 0.05);
    expect(bursting.map((impact) => Math.round(impact.at.x))).toEqual(
      [
        { x: 3, y: 3 },
        { x: 4, y: 1 },
      ].map((at) => Math.round(worldToScreen(projectGrid(at), camera).x)),
    );
    expect(
      ring(hit + BROADSIDE_SPLASH_DELAY_V7).halfSize,
    ).toBeGreaterThanOrEqual(TILE_WIDTH * camera.zoom * 0.85);
    // Without splashed units the ring still shows the area.
    expect(
      attackEffectPlanV7(shot(hit + 0.2, { splash: [] }), camera).ring,
    ).not.toBeNull();
  });

  it("holds the blast, the ring and the splash bursts under reduced motion", () => {
    const plan = attackEffectPlanV7(
      shot(attackReducedMotionProgressV7("BROADSIDE")),
      camera,
    );
    expect(plan.ring).not.toBeNull();
    expect(
      plan.impacts.filter((impact) => impact.splash !== true),
    ).toHaveLength(1);
    expect(
      plan.impacts.filter((impact) => impact.splash === true),
    ).toHaveLength(2);
  });

  it("draws each faction's shell and blast in its own colours", () => {
    const colours = (
      shell: (typeof BROADSIDE_SHELLS_V7)[keyof typeof BROADSIDE_SHELLS_V7],
      progress: number,
      undeadViolet = false,
    ) => {
      const { context, log } = recordingContext();
      drawAttackFeedbackV7(
        context,
        camera,
        shot(progress, { shell, undeadViolet }),
      );
      return new Set(
        log
          .filter(
            (call) =>
              call[0] === "set" &&
              (call[1] === "fillStyle" || call[1] === "strokeStyle"),
          )
          .map((call) => call[2]),
      );
    };
    for (const shell of Object.values(BROADSIDE_SHELLS_V7)) {
      const look = broadsideLookV7(shell, true);
      const blast = colours(shell, 0.6, true);
      expect(blast.has(look.fire), shell).toBe(true);
      expect(blast.has(look.ring), shell).toBe(true);
      expect(colours(shell, 0.1, true).has(look.flash), shell).toBe(true);
    }
    // Ghost fire takes the look's Undead accent.
    expect(colours("GHOST_FIRE", 0.3, true).has(NECRO_BOLT_VIOLET_V7.mid)).toBe(
      true,
    );
    expect(
      colours("GHOST_FIRE", 0.3, false).has(NECRO_BOLT_VIOLET_V7.mid),
    ).toBe(false);
    expect(
      colours("GHOST_FIRE", 0.3, false).has(NECRO_BOLT_CLASSIC_V7.mid),
    ).toBe(true);
  });
});

describe("Attack cue plans", () => {
  const centre = (at: CoordV7) => worldToScreen(projectGrid(at), camera);

  it("keeps every cue short and lands it before the burst", () => {
    for (const effect of ATTACK_EFFECT_IDS_V7) {
      // The broadside is the one heavy shot (bead pulp_wars-eu3r.4).
      expect(ATTACK_EFFECT_DURATIONS_V7[effect], effect).toBeLessThanOrEqual(
        effect === "BROADSIDE" ? 600 : 480,
      );
      expect(ATTACK_EFFECT_HIT_V7[effect], effect).toBeGreaterThanOrEqual(0.5);
      expect(ATTACK_EFFECT_HIT_V7[effect], effect).toBeLessThan(0.6);
      // The broadside's reduced-motion frame holds its area blast.
      if (effect === "BROADSIDE") continue;
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
      "BROADSIDE",
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

// ---------------------------------------------------------------------------
// The giants' signatures (`pulp_wars-w49.32`, docs/art/ATTACK_EFFECTS.md
// "The giants' signatures"): eight code-drawn cues in the manner of the
// attack cues, planned from the real commands of the hand-built scenes of
// tests/fixtures/v7-giants-ui.ts, each with its sound and its
// reduced-motion frame.

/** The plan of the human seat's `command` on `state`. */
function commandSteps(
  state: GameStateV7,
  command: (view: PlayerViewV7) => CommandV7,
): readonly CorePresentationStepV7[] {
  const actor = state.humanPlayerId;
  const before = viewForV7(state, actor);
  const result = applyCommandV7(state, actor, command(before));
  if (!result.accepted) throw new Error(result.error.code);
  return corePresentationPlanV7(
    before,
    projectEventsV7(state, result.state, actor, result.events),
    viewForV7(result.state, actor),
  );
}

const giantSteps = (steps: readonly CorePresentationStepV7[]) =>
  steps.filter(
    (step): step is Extract<CorePresentationStepV7, { kind: "GIANT" }> =>
      step.kind === "GIANT",
  );

const giantFeedback = (
  effect: GiantFeedbackEffectV7,
  progress: number,
  extra: Partial<GiantFeedbackV7> = {},
): GiantFeedbackV7 => ({
  effect,
  from,
  cells: [to, { x: 4, y: 2 }],
  amounts: [3, 4],
  progress,
  ...extra,
});

describe("The giants' signature cues (bead pulp_wars-w49.32)", () => {
  it("gives each of the eight signatures a cue, short, with a frame to hold", () => {
    expect(Object.keys(GIANT_SIGNATURE_CUES_V7).sort()).toEqual(
      [...GIANT_SIGNATURES_V7].sort(),
    );
    expect(new Set(Object.values(GIANT_SIGNATURE_CUES_V7)).size).toBe(8);
    for (const effect of GIANT_FEEDBACK_EFFECTS_V7) {
      expect(GIANT_EFFECT_DURATIONS_V7[effect], effect).toBeGreaterThanOrEqual(
        400,
      );
      expect(GIANT_EFFECT_DURATIONS_V7[effect], effect).toBeLessThanOrEqual(
        640,
      );
      expect(GIANT_EFFECT_BEAT_V7[effect], effect).toBeLessThan(1);
      const held = giantReducedMotionProgressV7(effect);
      expect(held, effect).toBeGreaterThan(0.3);
      expect(held, effect).toBeLessThan(0.6);
      // The held frame draws something.
      const { context, log } = recordingContext();
      drawGiantFeedbackV7(context, camera, giantFeedback(effect, held));
      expect(
        log.some((call) => call[0] === "fill" || call[0] === "stroke"),
        effect,
      ).toBe(true);
    }
    // Only the Stomp shakes the board, after its slam.
    expect(giantBoardShakeCssPxV7("STOMP", 0.1)).toBe(0);
    expect(Math.abs(giantBoardShakeCssPxV7("STOMP", 0.3))).toBeGreaterThan(0);
    expect(giantBoardShakeCssPxV7("CRUSH", 0.3)).toBe(0);
  });

  it("plans a Crushing Shove's thud after the attack, then each hit", () => {
    const at = GIANTS_UI_V7.crush;
    const steps = commandSteps(giantsCrushFixtureV7(), (view) => ({
      kind: "ATTACK",
      unitId: unitAt(view, at.juggernaut).id,
      targetUnitId: unitAt(view, at.blocked).id,
    }));
    expect(steps[0]).toMatchObject({ kind: "MELEE", to: at.blocked });
    const [crush] = giantSteps(steps);
    expect(crush).toMatchObject({
      effect: "CRUSH",
      from: at.juggernaut,
      cells: [at.blocked, at.blocker],
      amounts: [3, 3],
    });
    const index = steps.indexOf(crush as CorePresentationStepV7);
    expect(steps.slice(index + 1, index + 3)).toMatchObject([
      { kind: "DAMAGE", at: at.blocked, damage: 3 },
      { kind: "DAMAGE", at: at.blocker, damage: 3 },
    ]);
  });

  it("plans a Swallow's gulp, the Goblin's throw, the Stomp and the Break Off", () => {
    const swallow = GIANTS_UI_V7.swallow;
    expect(
      giantSteps(
        commandSteps(giantsSwallowFixtureV7(), (view) => ({
          kind: "SWALLOW",
          unitId: unitAt(view, swallow.abomination).id,
          targetUnitId: unitAt(view, swallow.knight).id,
        })),
      ),
    ).toMatchObject([
      { effect: "SWALLOW", from: swallow.abomination, cells: [swallow.knight] },
    ]);
    const toss = GIANTS_UI_V7.toss;
    const thrown = commandSteps(giantsTossFixtureV7(), (view) => ({
      kind: "TOSS",
      unitId: unitAt(view, toss.troll).id,
      passengerUnitId: unitAt(view, toss.goblin).id,
      at: toss.landing,
    }));
    expect(giantSteps(thrown)).toMatchObject([
      { effect: "TOSS", from: toss.troll, cells: [toss.goblin, toss.landing] },
    ]);
    const stomp = GIANTS_UI_V7.stomp;
    const stomped = commandSteps(giantsStompFixtureV7(), (view) => ({
      kind: "STOMP",
      unitId: unitAt(view, stomp.brontosaurus).id,
    }));
    expect(giantSteps(stomped)).toMatchObject([
      { effect: "STOMP", from: stomp.brontosaurus, amounts: [4, 4, 4] },
    ]);
    expect(stomped.filter((step) => step.kind === "DAMAGE")).toHaveLength(3);
    const breakOff = GIANTS_UI_V7.breakOff;
    const [broke] = giantSteps(
      commandSteps(giantsBreakOffFixtureV7(), (view) => ({
        kind: "BREAK_OFF",
        unitId: unitAt(view, breakOff.giant).id,
        tiles: [breakOff.first, breakOff.second],
      })),
    );
    expect(broke).toMatchObject({
      effect: "BREAK_OFF",
      from: breakOff.giant,
      cells: [breakOff.first, breakOff.second],
    });
    expect(broke?.unitIds).toHaveLength(2);
  });

  it("plans the trample after the Overstride, the shards after the shatter, the hammer as the Titan's blow", () => {
    const stride = GIANTS_UI_V7.overstride;
    const strideSteps = commandSteps(giantsOverstrideFixtureV7(), (view) => {
      const colossus = unitAt(view, stride.colossus);
      const move = queryPlayerCommandsV7(view).find(
        (command) =>
          command.kind === "MOVE" &&
          command.unitId === colossus.id &&
          command.path.at(-1)?.x === stride.beyond.x &&
          command.path.at(-1)?.y === stride.beyond.y,
      );
      if (move === undefined) throw new Error("no Overstride Move");
      return move;
    });
    expect(strideSteps[0]).toMatchObject({ kind: "MOVE" });
    expect(giantSteps(strideSteps)).toMatchObject([
      { effect: "TRAMPLE", cells: [stride.fighter], amounts: [3] },
    ]);
    const glacial = GIANTS_UI_V7.glacial;
    const smash = commandSteps(giantsGlacialFixtureV7(), (view) => ({
      kind: "ATTACK",
      unitId: unitAt(view, glacial.frostGiant).id,
      targetUnitId: unitAt(view, glacial.target).id,
    }));
    const shatter = smash.findIndex(
      (step) => step.kind === "ICE_FOLK" && step.effect === "SHATTER",
    );
    const [shards] = giantSteps(smash);
    expect(shatter).toBeGreaterThanOrEqual(0);
    expect(smash.indexOf(shards as CorePresentationStepV7)).toBe(shatter + 1);
    expect(shards).toMatchObject({ effect: "SHARDS", from: glacial.target });
    // Seven tiles: never back at the Frost Giant.
    expect(shards?.cells).toHaveLength(7);
    expect(
      shards?.cells.some(
        (cell) =>
          cell.x === glacial.frostGiant.x && cell.y === glacial.frostGiant.y,
      ),
    ).toBe(false);
    expect(shards?.marks).toEqual(
      expect.arrayContaining([glacial.shardFighter, glacial.shardKnight]),
    );
    // The shards' Chill is the cue's, not a Cold Aura of its own.
    expect(
      smash.some(
        (step) => step.kind === "ICE_FOLK" && step.effect === "COLD_AURA",
      ),
    ).toBe(false);
    const siege = GIANTS_UI_V7.siege;
    const blow = commandSteps(giantsSiegeFixtureV7(), (view) => ({
      kind: "ATTACK",
      unitId: unitAt(view, siege.titan).id,
      targetUnitId: unitAt(view, siege.centre).id,
    }));
    expect(blow.some((step) => step.kind === "MELEE")).toBe(false);
    expect(giantSteps(blow)).toMatchObject([
      {
        effect: "HAMMER",
        from: siege.titan,
        cells: [siege.centre],
        walls: true,
      },
    ]);
  });

  it("plans the digest and the Zombie spat out at the Abomination's Start Turn", () => {
    let state = giantsSwallowedFixtureV7();
    const human = state.humanPlayerId;
    for (let turn = 0; turn < 6; turn += 1) {
      const actor = state.turnOrder[state.activeSeatIndex];
      if (actor === undefined) throw new Error("no active seat");
      const before = viewForV7(state, human);
      const result = applyCommandV7(state, actor, { kind: "END_TURN" });
      if (!result.accepted) throw new Error(result.error.code);
      const steps = giantSteps(
        corePresentationPlanV7(
          before,
          projectEventsV7(state, result.state, human, result.events),
          viewForV7(result.state, human),
        ),
      );
      state = result.state;
      if (steps.some((step) => step.effect === "REGURGITATE")) {
        expect(steps.map((step) => step.effect)).toEqual([
          "DIGEST",
          "REGURGITATE",
        ]);
        return;
      }
      if (steps.length > 0)
        expect(steps).toMatchObject([{ effect: "DIGEST", amounts: [4] }]);
    }
    throw new Error("the Knight was never digested");
  });

  it("throws the Goblin in an arc over the board and lands it in dust", () => {
    const toss = (progress: number) =>
      giantEffectPlanV7(
        giantFeedback("TOSS", progress, { cells: [from, to], amounts: [] }),
        camera,
      );
    const start = worldToScreen(projectGrid(from), camera);
    const end = worldToScreen(projectGrid(to), camera);
    const mid = toss(0.42).flights[0];
    expect(mid?.at.x).toBeGreaterThan(start.x);
    expect(mid?.at.x).toBeLessThan(end.x);
    // Well above the straight line between the two tiles.
    expect(mid?.at.y).toBeLessThan(start.y - 80 * camera.zoom);
    expect(Math.abs(mid?.spin ?? 0)).toBeGreaterThan(Math.PI);
    const landed = toss(0.9);
    expect(landed.flights).toEqual([]);
    // The landing's dust on the landing tile.
    expect(landed.bursts.some((burst) => burst.at === landed.cells[1])).toBe(
      true,
    );
    // With the Goblin's own sprite, it is that image that cartwheels.
    const { context, log } = recordingContext();
    const image = { width: 56, height: 80 } as unknown as CanvasImageSource;
    drawGiantFeedbackV7(
      context,
      camera,
      giantFeedback("TOSS", 0.42, {
        cells: [from, to],
        sprite: { image, width: 35, height: 50 },
      }),
    );
    expect(
      log.some((call) => call[0] === "drawImage" && call[1] === image),
    ).toBe(true);
    expect(log.some((call) => call[0] === "rotate")).toBe(true);
  });

  it("rings the Stomp out to the 3 x 3 and floats each unit's damage", () => {
    const stomp = (progress: number) =>
      giantEffectPlanV7(giantFeedback("STOMP", progress), camera);
    expect(stomp(0.1).ring).toBeNull();
    const early = stomp(0.3).ring?.halfSize ?? 0;
    const late = stomp(0.8).ring?.halfSize ?? 0;
    expect(early).toBeGreaterThan(0);
    expect(late).toBeGreaterThan(early);
    expect(late).toBeLessThanOrEqual(1.5 * TILE_WIDTH * camera.zoom);
    expect(stomp(0.5).floats.map((float) => float.text)).toEqual(["−3", "−4"]);
    // Each "−N" rises as the cue goes on.
    const first = stomp(0.4).floats[0]?.at.y ?? 0;
    expect(stomp(0.7).floats[0]?.at.y ?? 0).toBeLessThan(first);
  });

  it("puts the crush's thud on the edge the defender could not cross", () => {
    const plan = giantEffectPlanV7(giantFeedback("CRUSH", 0.4), camera);
    const target = worldToScreen(projectGrid(to), camera);
    expect(plan.bursts[0]?.at.x).toBeCloseTo(
      target.x + (TILE_WIDTH * camera.zoom) / 2,
    );
    expect(plan.floats).toHaveLength(2);
  });

  it("moves the units of a cue: the victim shrinks, the men pop up, the Brontosaurus rears", () => {
    const swallow = (progress: number) =>
      giantUnitPulsesV7(
        { effect: "SWALLOW", unitIds: [7], from, cells: [to], actorUnitId: 3 },
        progress,
        1,
      );
    const victim = (progress: number) =>
      swallow(progress).find((pulse) => pulse.unitId === 7)?.scale ?? 1;
    expect(victim(0.3)).toBeLessThan(1);
    expect(victim(0.55)).toBeLessThan(victim(0.3));
    expect(swallow(0.62).some((pulse) => pulse.unitId === 3)).toBe(true);
    const men = giantUnitPulsesV7(
      { effect: "BREAK_OFF", unitIds: [8, 9], from, cells: [to, to] },
      0.62,
      1,
    );
    expect(men.map((pulse) => pulse.unitId)).toEqual([8, 9]);
    expect(men[0]?.scale).toBeLessThan(1.2);
    const rear = giantUnitPulsesV7(
      { effect: "STOMP", unitIds: [], from, cells: [], actorUnitId: 5 },
      0.2,
      1,
    );
    expect(rear[0]?.scale).toBeGreaterThan(1);
  });

  it("draws each cue in its faction's colours, the Undead ones in the live violet", () => {
    const colours = (feedback: GiantFeedbackV7): Set<unknown> => {
      const { context, log } = recordingContext();
      drawGiantFeedbackV7(context, camera, feedback);
      return new Set(
        log
          .filter(
            (call) =>
              call[0] === "set" &&
              (call[1] === "fillStyle" || call[1] === "strokeStyle"),
          )
          .map((call) => call[2]),
      );
    };
    expect(
      colours(giantFeedback("SHARDS", 0.3)).has(ICE_FOLK_PALETTE_V7.ice),
    ).toBe(true);
    expect(
      colours(giantFeedback("HAMMER", 0.2, { walls: true })).has(
        DWARF_PALETTE_V7.copper,
      ),
    ).toBe(true);
    expect(
      colours(giantFeedback("BREAK_OFF", 0.3)).has(CANDY_PALETTE_V7.biscuit),
    ).toBe(true);
    expect(
      colours(giantFeedback("TRAMPLE", 0.2)).has(MARTIAN_PALETTE_V7.magenta),
    ).toBe(true);
    expect(
      colours(giantFeedback("SWALLOW", 0.3, { undeadViolet: true })).has(
        NECRO_BOLT_VIOLET_V7.lit,
      ),
    ).toBe(true);
    expect(
      colours(giantFeedback("SWALLOW", 0.3)).has(NECRO_BOLT_VIOLET_V7.lit),
    ).toBe(false);
  });

  it("times each cue's sound to its beat", () => {
    const step: Extract<CorePresentationStepV7, { kind: "GIANT" }> = {
      kind: "GIANT",
      effect: "STOMP",
      from,
      cells: [to],
      unitIds: [1],
      durationMs: GIANT_EFFECT_DURATIONS_V7.STOMP,
    };
    const state = giantsStompFixtureV7();
    const view = viewForV7(state, state.humanPlayerId);
    const cues = soundCuesForStepV7({
      step,
      before: view,
      after: view,
      envelope: { schemaVersion: 7, events: [] } as never,
      durationScale: 1,
    });
    expect(cues).toEqual([
      {
        id: "impact.explosion",
        delayMs: GIANT_EFFECT_DURATIONS_V7.STOMP * GIANT_EFFECT_BEAT_V7.STOMP,
      },
    ]);
    for (const effect of GIANT_FEEDBACK_EFFECTS_V7)
      expect(
        soundCuesForStepV7({
          step: { ...step, effect },
          before: view,
          after: view,
          envelope: { schemaVersion: 7, events: [] } as never,
          durationScale: 1,
        }).length,
        effect,
      ).toBeGreaterThan(0);
  });
});
