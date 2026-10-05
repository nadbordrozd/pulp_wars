import { describe, expect, it } from "vitest";
import {
  CRUMBS_TURNS_V7,
  PEPPERMINT_DAMAGE_V7,
  SUGAR_FRENZY_MAX_CONTINUATIONS_V7,
  applyCommandV7,
  effectiveRoleRuleV7,
  previewRebakeV7,
  previewSugarRushV7,
  previewSugarTossV7,
  projectEventsV7,
  queryPlayerCommandsV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type GameStateV7,
  type PlayerViewV7,
} from "../../src/engine/index";
import { CANDY_MARKERS_V7 } from "../../src/assets/chibi-direction-candy-presentation";
import {
  BOUNCES_PREVIEW_V7,
  BOUNCE_BLOCKED_PREVIEW_V7,
  RUSH_PREVIEW_V7,
  SPLATTED_PREVIEW_V7,
  rebakeBoardLabelV7,
} from "../../src/render/candy-presentation-v7";
import {
  ATTACK_EFFECT_HIT_V7,
  attackEffectForV7,
  drawAttackFeedbackV7,
} from "../../src/render/canvas/attack-effects-v7";
import {
  TUNNEL_GHOST_ALPHA_V7,
  buildBoardRenderPlanV7,
  drawBoardV7,
  type BoardRenderInteractionV7,
  type BoardRenderPlanV7,
} from "../../src/render/canvas/board-renderer-v7";
import type { CandyPickV7 } from "../../src/render/canvas/candy-board-plan-v7";
import {
  CRASHED_SPRITE_ALPHA_V7,
  candyMarkerPlacesV7,
  drawCandyBounceArrowV7,
  drawCandyCrumbsV7,
  drawCandyPipsV7,
  drawCandyUnitMarkersV7,
} from "../../src/render/canvas/candy-canvas-v7";
import {
  CANDY_EFFECT_DURATIONS_V7,
  CANDY_EFFECT_SUBJECTS_V7,
  CANDY_FEEDBACK_EFFECTS_V7,
  SUGAR_TOSS_LANDS_V7,
  candyReducedMotionProgressV7,
  drawCandyFeedbackV7,
  sugarTossPointV7,
} from "../../src/render/canvas/candy-effects-v7";
import { corePresentationPlanV7 } from "../../src/render/canvas/presentation-plan-v7";
import type { SupportEffectArtV7 } from "../../src/render/canvas/support-presentation-v7";
import {
  buildGalleryDemoSceneV7,
  galleryDemoCuesV7,
} from "../../src/render/gallery-demo-v7";
import {
  CANDY_UI_V7,
  CANDY_VICTIM_V7,
  candyUiFixtureV7,
  candyVictimFixtureV7,
} from "../fixtures/v7-candy-ui";
import { martianUiFixtureV7 } from "../fixtures/v7-martian-ui";

// Bead pulp_wars-jdb.6: the Candy part of the board plan, its markers and
// its cues. Every expected number is read from the engine constants or a
// public preview of the same view.
const AT = CANDY_UI_V7;
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
          : key === "measureText"
            ? (text: string) => ({ width: text.length * 6 })
            : key === "createLinearGradient"
              ? () => ({ addColorStop: () => undefined })
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

const humanView = (state: GameStateV7): PlayerViewV7 =>
  viewForV7(state, state.humanPlayerId);
const same = (left: CoordV7, right: CoordV7): boolean =>
  left.x === right.x && left.y === right.y;

function unitAt(view: PlayerViewV7, at: CoordV7) {
  const unit = view.units.find((candidate) => same(candidate.at, at));
  if (unit === undefined) throw new Error(`no unit at ${at.x},${at.y}`);
  return unit;
}

function planFor(
  view: PlayerViewV7,
  selected: CoordV7 | null,
  pick: CandyPickV7["kind"] | null = null,
  extra: Partial<BoardRenderInteractionV7> = {},
): BoardRenderPlanV7 {
  const unit = selected === null ? null : unitAt(view, selected);
  return buildBoardRenderPlanV7(view, queryPlayerCommandsV7(view), {
    selection: unit === null ? null : { kind: "UNIT", unitId: unit.id },
    selectedUnitId: unit?.id ?? null,
    selectedAchievement: null,
    ...(unit === null || pick === null
      ? {}
      : { candyPick: { kind: pick, unitId: unit.id } }),
    ...extra,
  });
}

function draw(
  plan: BoardRenderPlanV7,
  options: Partial<Parameters<typeof drawBoardV7>[0]> = {},
): LogEntry[] {
  const { context, log } = recordingContext();
  drawBoardV7({
    context,
    viewport: { width: 1600, height: 1600 },
    devicePixelRatio: 1,
    camera: { offsetX: 100, offsetY: 100, zoom: 1 },
    plan,
    images: {
      resolve: (id) =>
        ({ id, width: 128, height: 128 }) as unknown as CanvasImageSource,
      resolveTerrainGround: (id) =>
        ({ id: `ground:${id}`, width: 128, height: 128 }) as never,
      resolveRaisedTerrain: (id) =>
        ({ id: `raised:${id}`, width: 256, height: 256 }) as never,
    },
    ...options,
  });
  return log;
}

const calls = (log: readonly LogEntry[], name: string): LogEntry[] =>
  log.filter((call) => call[0] === name);

describe("Candy markers in the board plan (section 15.1)", () => {
  const view = humanView(candyUiFixtureV7());
  const plan = planFor(view, null);
  const markersAt = (at: CoordV7) =>
    plan.entries.find((entry) => entry.kind === "UNIT" && same(entry.at, at))
      ?.candy;

  it("marks Rushed, Crashed and Splatted units of any owner", () => {
    expect(markersAt(AT.rushedDonut)).toEqual({
      rushed: true,
      crashed: false,
      splatted: false,
      home: true,
      frenzy: null,
    });
    expect(markersAt(AT.crashed)).toEqual({
      rushed: false,
      crashed: true,
      splatted: false,
      home: false,
      frenzy: null,
    });
    expect(markersAt(AT.splatted)).toEqual({
      rushed: false,
      crashed: false,
      splatted: true,
      home: false,
      frenzy: null,
    });
    expect(markersAt(AT.gumdrop)).toBeUndefined();
  });

  it("shows a Rushed Chocolate Bunny's Sugar Frenzy cap as pips", () => {
    expect(markersAt(AT.rushedBear)?.frenzy).toEqual({
      left: SUGAR_FRENZY_MAX_CONTINUATIONS_V7,
      of: SUGAR_FRENZY_MAX_CONTINUATIONS_V7,
    });
    expect(SUGAR_FRENZY_MAX_CONTINUATIONS_V7).toBe(2);
  });

  it("plans the Crumbs of each tile under the units, with their turns", () => {
    const crumbs = plan.entries.filter((entry) => entry.kind === "CRUMBS");
    expect(
      crumbs.map((entry) => [entry.at, entry.artSubject, entry.crumbs]),
    ).toEqual(
      view.crumbs.map((entry) => [
        entry.at,
        "CRUMBS",
        {
          role: entry.role,
          turnsLeft: entry.turnsLeft,
          bite: entry.bite > 0,
        },
      ]),
    );
    expect(crumbs).toHaveLength(2);
    // No label of a Crumbs entry names a tile.
    for (const entry of crumbs) expect(entry.label).not.toMatch(/\d+, ?\d+/);
    expect(crumbs.every((entry) => entry.layer < 5)).toBe(true);
  });

  it("plans nothing Candy in a match without a Candy seat", () => {
    const other = humanView(martianUiFixtureV7());
    const plain = buildBoardRenderPlanV7(other, queryPlayerCommandsV7(other), {
      selection: null,
      selectedUnitId: null,
      selectedAchievement: null,
    });
    expect(plain.entries.some((entry) => entry.kind === "CRUMBS")).toBe(false);
    expect(plain.entries.some((entry) => entry.candy !== undefined)).toBe(
      false,
    );
  });
});

describe("Candy targets on the board (section 15.1)", () => {
  const state = candyUiFixtureV7();
  const view = humanView(state);

  it("shows the ordinary reach until the Rush is armed", () => {
    const plan = planFor(view, AT.gumdrop);
    expect(new Set(plan.targets.map((target) => target.family))).toEqual(
      new Set(["MOVE", "ATTACK"]),
    );
    expect(plan.targets.some((target) => target.sugarRush !== undefined)).toBe(
      false,
    );
  });

  it("arms the Rush: the Rushed reach from the public preview, the new tiles marked, the attack with +1", () => {
    const gumdrop = unitAt(view, AT.gumdrop);
    const preview = previewSugarRushV7(view, gumdrop.id);
    if (preview === null) throw new Error("no Rush preview");
    const plan = planFor(view, AT.gumdrop, "SUGAR_RUSH");
    const moves = plan.targets.filter(
      (target) => target.family === "SUGAR_RUSH",
    );
    expect(moves.map((target) => target.at)).toEqual(preview.destinations);
    expect(
      moves
        .filter((target) => target.sugarRush?.newReach === true)
        .map((target) => target.at),
    ).toEqual(preview.newDestinations);
    expect(preview.newDestinations.length).toBeGreaterThan(0);
    // Every Rush tile carries the SUGAR_RUSH command; the Move follows it.
    expect(
      moves.every(
        (target) =>
          target.command.kind === "SUGAR_RUSH" &&
          target.command.unitId === gumdrop.id,
      ),
    ).toBe(true);
    const attack = plan.targets.find((target) => target.family === "ATTACK");
    expect(attack?.at).toEqual(AT.rushTarget);
    expect(attack?.command.kind).toBe("ATTACK");
    expect(attack?.sugarRush).toEqual({ newReach: false });
    expect(attack?.previewNote).toContain(RUSH_PREVIEW_V7);
    // Unarmed, the same attack has no Rush bonus.
    expect(
      planFor(view, AT.gumdrop).targets.find(
        (target) => target.family === "ATTACK",
      )?.previewNote ?? "",
    ).not.toContain(RUSH_PREVIEW_V7);
    // No semantic label names a tile.
    for (const target of plan.targets)
      expect(target.semanticLabel ?? "").not.toMatch(/\d+, ?\d+/);
  });

  it("aims a Re-bake at the offered Crumbs: a ghost, its price and its HP", () => {
    const confectioner = unitAt(view, AT.confectioner);
    const preview = previewRebakeV7(view, confectioner.id);
    if (preview === null) throw new Error("no Re-bake preview");
    const plan = planFor(view, AT.confectioner, "REBAKE");
    expect(plan.targets.map((target) => target.family)).toEqual(
      preview.options.map(() => "REBAKE"),
    );
    expect(
      plan.targets.map((target) => [
        target.at,
        target.previewLabel,
        target.rebake?.role,
        target.rebake?.artSubject,
      ]),
    ).toEqual(
      preview.options.map((option) => [
        option.at,
        rebakeBoardLabelV7(option.cost, option.hp),
        option.role,
        `UNIT:CANDY:${option.role}`,
      ]),
    );
    expect(preview.options).toHaveLength(2);
    // The Frosting targets step aside while the Re-bake is aimed.
    expect(plan.entries.some((entry) => entry.kind === "ABILITY_TARGET")).toBe(
      false,
    );
  });

  it("draws the Re-bake ghost at the ghost strength", () => {
    const log = draw(planFor(view, AT.confectioner, "REBAKE"));
    const alphas = log.filter(
      (call) =>
        call[0] === "set" &&
        call[1] === "globalAlpha" &&
        call[2] === TUNNEL_GHOST_ALPHA_V7,
    );
    expect(alphas).toHaveLength(2);
  });

  it("highlights a Confectioner's Frosting targets from the Tend preview", () => {
    const plan = planFor(view, AT.confectioner);
    const tend = plan.entries.filter(
      (entry) =>
        entry.kind === "ABILITY_TARGET" && entry.abilityStyle === "TEND",
    );
    expect(tend.map((entry) => entry.at)).toEqual([AT.frostingTarget]);
  });

  it("aims a Sugar Toss at the wounded units in reach, each with its heal", () => {
    const gunner = unitAt(view, AT.gunner);
    const preview = previewSugarTossV7(view, gunner.id);
    if (preview === null) throw new Error("no Toss preview");
    const plan = planFor(view, AT.gunner, "SUGAR_TOSS");
    expect(
      plan.targets.map((target) => [
        target.family,
        target.previewLabel,
        target.command.kind === "SUGAR_TOSS"
          ? target.command.targetUnitId
          : null,
      ]),
    ).toEqual(
      preview.targets.map((target) => [
        "SUGAR_TOSS",
        `+${target.amount}`,
        target.unitId,
      ]),
    );
    expect(plan.targets.map((target) => target.at)).toEqual(
      expect.arrayContaining([AT.tossNear, AT.tossFar]),
    );
  });

  it('labels an attack on a Splatted unit "No strike-back: Splatted"', () => {
    const plan = planFor(view, AT.splatAttacker);
    const attack = plan.targets.find(
      (target) => target.family === "ATTACK" && same(target.at, AT.splatted),
    );
    expect(attack?.previewNote).toContain(SPLATTED_PREVIEW_V7);
  });
});

describe("Bounce and Crumbs for the other side (section 15.1)", () => {
  const view = humanView(candyVictimFixtureV7());
  const at = CANDY_VICTIM_V7;

  it("shows where a melee attacker bounces to, and a blocked Bounce", () => {
    const bounced = planFor(view, at.fighter).targets.find(
      (target) => target.family === "ATTACK",
    );
    expect(bounced?.previewNote).toContain(BOUNCES_PREVIEW_V7);
    expect(bounced?.bounce).toEqual({
      from: at.fighter,
      to: { x: at.fighter.x - 1, y: at.fighter.y },
      blocked: false,
    });
    const blocked = planFor(view, at.knight).targets.find(
      (target) => target.family === "ATTACK",
    );
    expect(blocked?.previewNote).toContain(BOUNCE_BLOCKED_PREVIEW_V7);
    expect(blocked?.bounce).toEqual({
      from: at.knight,
      to: null,
      blocked: true,
    });
  });

  it("draws the Bounce of the focused target as an arrow", () => {
    const plan = planFor(view, at.fighter);
    const focused = draw(plan, { previewFocus: at.marshmallow });
    const plain = draw(planFor(view, at.eater));
    // The arrow is two strokes (casing and line) more than a board without.
    expect(calls(focused, "stroke").length).toBeGreaterThan(
      calls(plain, "stroke").length,
    );
  });

  it('labels a Move onto enemy Crumbs "Eats Crumbs" with the Peppermint damage', () => {
    const plan = planFor(view, at.eater);
    const move = plan.targets.find(
      (target) => target.family === "MOVE" && same(target.at, at.crumbs),
    );
    expect(move?.previewLabel).toBe(`Eats Crumbs: −${PEPPERMINT_DAMAGE_V7}`);
    // Every other Move tile stays unlabelled.
    expect(
      plan.targets.filter(
        (target) =>
          target.family === "MOVE" && target.previewLabel !== undefined,
      ),
    ).toHaveLength(1);
  });
});

describe("Candy marker drawing (CANDY.md markers)", () => {
  const anchor = { x: 200, top: 100, bottom: 180 };
  const image = (name: string): CanvasImageSource =>
    ({ name }) as unknown as CanvasImageSource;

  it("places the markers as the art direction says", () => {
    const places = candyMarkerPlacesV7(anchor, 1);
    expect(places.crashed).toEqual({ x: 200, y: 100 });
    expect(places.rushed.x).toBeCloseTo(
      200 + CANDY_MARKERS_V7.rushed.shift * 1.6,
    );
    expect(places.splatted.y).toBeCloseTo(100 + 80 / 3);
  });

  it("draws each marker's raster, and code without one", () => {
    const all = {
      rushed: true,
      crashed: true,
      splatted: true,
      home: true,
      frenzy: null,
    };
    const withArt = recordingContext();
    drawCandyUnitMarkersV7(withArt.context, all, anchor, 1, {
      rushed: image("rushed"),
      crashed: image("crashed"),
      splatted: image("splatted"),
      home: image("home"),
    });
    expect(
      calls(withArt.log, "drawImage").map(
        (call) => (call[1] as { name: string }).name,
      ),
    ).toEqual(["splatted", "crashed", "rushed", "home"]);
    const code = recordingContext();
    drawCandyUnitMarkersV7(code.context, all, anchor, 1);
    expect(calls(code.log, "drawImage")).toHaveLength(0);
    expect(calls(code.log, "fill").length).toBeGreaterThan(3);
    // High contrast never draws a raster.
    const contrast = recordingContext();
    drawCandyUnitMarkersV7(contrast.context, all, anchor, 1, {
      rushed: image("rushed"),
      crashed: image("crashed"),
      highContrast: true,
    });
    expect(calls(contrast.log, "drawImage")).toHaveLength(0);
  });

  it("draws the Sugar Frenzy pips in place of the house, one per continuation", () => {
    const { context, log } = recordingContext();
    drawCandyUnitMarkersV7(
      context,
      {
        rushed: true,
        crashed: false,
        splatted: false,
        home: true,
        frenzy: { left: 1, of: 2 },
      },
      anchor,
      1,
      { rushed: image("rushed"), home: image("home") },
    );
    expect(
      calls(log, "drawImage").map((call) => (call[1] as { name: string }).name),
    ).toEqual(["rushed"]);
    const pips = recordingContext();
    drawCandyPipsV7(pips.context, 0, 0, 1, { left: 1, of: 2 });
    expect(calls(pips.log, "arc")).toHaveLength(2);
    expect(calls(log, "fillText")).toHaveLength(0);
  });

  it("draws the Crumbs pile, its unit and a pip per turn left", () => {
    const { context, log } = recordingContext();
    drawCandyCrumbsV7(
      context,
      300,
      300,
      1,
      { role: "KNIGHT", turnsLeft: 2, bite: true },
      {
        pile: image("pile"),
        unit: { name: "unit", width: 72, height: 88 } as never,
        unitHead: { top: 0.25, centre: 0.5 },
      },
    );
    expect(
      calls(log, "drawImage").map((call) => (call[1] as { name: string }).name),
    ).toEqual(["pile", "unit"]);
    // The token shows the head of the fallen unit's own sprite: a square
    // cut from its canvas at the head, never the whole sprite.
    const head = calls(log, "drawImage")[1];
    expect(head?.[4]).toBe(head?.[5]);
    expect(head?.[4] as number).toBeLessThan(72);
    expect(head?.[3] as number).toBeCloseTo(
      0.25 * 88 - (head?.[4] as number) * 0.06,
    );
    // The pile is its 40 master pixels wide.
    const pile = calls(log, "drawImage")[0];
    expect(pile?.[4]).toBeCloseTo(CANDY_MARKERS_V7.crumbs.size * 1.6);
    const pipFills = (drawn: readonly LogEntry[]): unknown[] =>
      drawn
        .filter((call) => call[0] === "set" && call[1] === "fillStyle")
        .map((call) => call[2])
        .slice(-CRUMBS_TURNS_V7);
    const fills = pipFills(log);
    expect(new Set(fills.slice(0, 2)).size).toBe(1);
    expect(fills[2]).not.toBe(fills[0]);
    // Without art the pile and the unit's initial are code-drawn.
    const code = recordingContext();
    drawCandyCrumbsV7(
      code.context,
      300,
      300,
      1,
      { role: "KNIGHT", turnsLeft: 3, bite: false },
      { initial: "G" },
    );
    expect(calls(code.log, "drawImage")).toHaveLength(0);
    expect(calls(code.log, "fillText").map((call) => call[1])).toEqual(["G"]);
  });

  it("draws a Bounce arrow, and a cross when it is blocked", () => {
    const open = recordingContext();
    drawCandyBounceArrowV7(
      open.context,
      { x: 100, y: 100 },
      { x: 0, y: 100 },
      { x: -1, y: 0 },
      1,
    );
    const blocked = recordingContext();
    drawCandyBounceArrowV7(
      blocked.context,
      { x: 100, y: 100 },
      null,
      { x: -1, y: 0 },
      1,
    );
    expect(calls(open.log, "stroke")).toHaveLength(2);
    expect(calls(blocked.log, "stroke")).toHaveLength(2);
    // Both point away from the defender (to the left).
    for (const { log } of [open, blocked])
      for (const call of calls(log, "lineTo"))
        expect(call[1] as number).toBeLessThan(100);
  });

  it("fades a Crashed unit's sprite, or draws it fainter without a copy", () => {
    const view = humanView(candyUiFixtureV7());
    const plan = planFor(view, null);
    const faded = { faded: true } as unknown as CanvasImageSource;
    const withCopy = draw(plan, { candyDroop: () => faded });
    expect(
      calls(withCopy, "drawImage").filter((call) => call[1] === faded),
    ).toHaveLength(
      plan.entries.filter((entry) => entry.candy?.crashed === true).length,
    );
    const without = draw(plan);
    expect(
      without.some(
        (call) =>
          call[0] === "set" &&
          call[1] === "globalAlpha" &&
          call[2] === CRASHED_SPRITE_ALPHA_V7,
      ),
    ).toBe(true);
  });
});

describe("Candy cues (CANDY.md effects)", () => {
  const camera = { offsetX: 0, offsetY: 0, zoom: 1 };

  function boundary(
    state: GameStateV7,
    command: CommandV7,
  ): ReturnType<typeof corePresentationPlanV7> {
    const before = humanView(state);
    const result = applyCommandV7(state, state.humanPlayerId, command);
    if (!result.accepted) throw new Error(result.error.code);
    return corePresentationPlanV7(
      before,
      projectEventsV7(state, result.state, state.humanPlayerId, result.events),
      humanView(result.state),
    );
  }

  const state = candyUiFixtureV7();
  const view = humanView(state);

  it("sparkles a Rush, puffs a Re-bake and arcs a Sugar Toss", () => {
    expect(
      boundary(state, {
        kind: "SUGAR_RUSH",
        unitId: unitAt(view, AT.gumdrop).id,
      }),
    ).toEqual([
      {
        kind: "CANDY",
        effect: "RUSH",
        cells: [AT.gumdrop],
        durationMs: CANDY_EFFECT_DURATIONS_V7.RUSH,
      },
    ]);
    expect(
      boundary(state, {
        kind: "REBAKE",
        unitId: unitAt(view, AT.confectioner).id,
        at: AT.crumbsBear,
      }),
    ).toContainEqual({
      kind: "CANDY",
      effect: "REBAKE",
      cells: [AT.crumbsBear],
      from: AT.confectioner,
      durationMs: CANDY_EFFECT_DURATIONS_V7.REBAKE,
    });
    expect(
      boundary(state, {
        kind: "SUGAR_TOSS",
        unitId: unitAt(view, AT.gunner).id,
        targetUnitId: unitAt(view, AT.tossNear).id,
      }),
    ).toContainEqual({
      kind: "CANDY",
      effect: "SUGAR_TOSS",
      cells: [AT.tossNear],
      from: AT.gunner,
      amount: 2,
      durationMs: CANDY_EFFECT_DURATIONS_V7.SUGAR_TOSS,
    });
  });

  it("throws the Pie Launcher's pie and shoots the Gunner's gumball", () => {
    expect(attackEffectForV7("CANDY", "CATAPULT")).toBe("PIE_THROW");
    expect(attackEffectForV7("CANDY", "MARKSMAN")).toBe("GUMBALL_SHOT");
    const steps = boundary(state, {
      kind: "ATTACK",
      unitId: unitAt(view, AT.pieLauncher).id,
      targetUnitId: unitAt(view, AT.pieTarget).id,
    });
    expect(steps[0]).toEqual(
      expect.objectContaining({ kind: "CATAPULT", attackEffect: "PIE_THROW" }),
    );
    // The pie's own burst is the Splat: no second cue.
    expect(steps.some((step) => step.kind === "CANDY")).toBe(false);
    // The pie sprite flies, then the splat sprite bursts.
    const art: SupportEffectArtV7 = {
      devicePixelRatio: 1,
      image: (subject) => ({
        image: { subject } as unknown as CanvasImageSource,
        width: 40,
        height: 40,
      }),
    };
    const flown = (progress: number): unknown[] => {
      const { context, log } = recordingContext();
      drawAttackFeedbackV7(
        context,
        camera,
        {
          effect: "PIE_THROW",
          from: AT.pieLauncher,
          to: AT.pieTarget,
          progress,
        },
        art,
      );
      return calls(log, "drawImage").map(
        (call) => (call[1] as { subject: string }).subject,
      );
    };
    expect(flown(0.3)).toEqual(["EFFECT:PIE"]);
    expect(flown(ATTACK_EFFECT_HIT_V7.PIE_THROW + 0.1)).toEqual([
      "EFFECT:SPLAT",
    ]);
  });

  it("starts the Crash at End Turn and wakes a unit when it ends", () => {
    const steps = boundary(state, { kind: "END_TURN" });
    const crash = steps.find(
      (step) => step.kind === "CANDY" && step.effect === "CRASH",
    );
    // The Rushed Bear crashes; the Rushed Donut is spared at home.
    expect(crash).toEqual(expect.objectContaining({ cells: [AT.rushedBear] }));
    const wake = steps.find(
      (step) => step.kind === "CANDY" && step.effect === "WAKE",
    );
    expect(wake).toEqual(
      expect.objectContaining({
        cells: expect.arrayContaining([AT.crashed, AT.crashedGunner]),
      }),
    );
  });

  it("springs a bounced attacker back and pops the Peppermint", () => {
    const victim = candyVictimFixtureV7();
    const other = humanView(victim);
    const at = CANDY_VICTIM_V7;
    const landing = { x: at.fighter.x - 1, y: at.fighter.y };
    const bounce = boundary(victim, {
      kind: "ATTACK",
      unitId: unitAt(other, at.fighter).id,
      targetUnitId: unitAt(other, at.marshmallow).id,
    });
    expect(bounce).toContainEqual(
      expect.objectContaining({
        kind: "MOVE",
        path: [at.fighter, landing],
        pushSlide: true,
      }),
    );
    expect(bounce).toContainEqual({
      kind: "CANDY",
      effect: "BOUNCE",
      cells: [landing],
      durationMs: CANDY_EFFECT_DURATIONS_V7.BOUNCE,
    });
    const eaten = boundary(victim, {
      kind: "MOVE",
      unitId: unitAt(other, at.eater).id,
      path: [at.crumbs],
    });
    expect(eaten).toContainEqual({
      kind: "CANDY",
      effect: "PEPPERMINT",
      cells: [at.crumbs],
      amount: PEPPERMINT_DAMAGE_V7,
      durationMs: CANDY_EFFECT_DURATIONS_V7.PEPPERMINT,
    });
  });

  it("draws every cue in code without art, and its sprite with it", () => {
    const sprites = new Map<string, string>([
      ["REBAKE", "EFFECT:REBAKE_PUFF"],
      ["SUGAR_TOSS", "EFFECT:SUGAR_TOSS"],
      ["SPLAT", "EFFECT:SPLAT"],
      ["BOUNCE", "EFFECT:BOUNCE"],
      ["PEPPERMINT", "EFFECT:PEPPERMINT_POP"],
    ]);
    const art: SupportEffectArtV7 = {
      devicePixelRatio: 1,
      image: (subject) => ({
        image: { subject } as unknown as CanvasImageSource,
        width: 40,
        height: 40,
      }),
    };
    for (const effect of CANDY_FEEDBACK_EFFECTS_V7) {
      const held = candyReducedMotionProgressV7(effect);
      expect(held, effect).toBeGreaterThan(0);
      expect(held, effect).toBeLessThan(1);
      expect(CANDY_EFFECT_DURATIONS_V7[effect], effect).toBeLessThanOrEqual(
        640,
      );
      const feedback = {
        effect,
        cells: [{ x: 3, y: 3 }],
        from: { x: 1, y: 3 },
        amount: 2,
        progress: held,
      };
      // Reduced motion's still frame draws something for every cue.
      const code = recordingContext();
      drawCandyFeedbackV7(code.context, camera, feedback);
      expect(calls(code.log, "drawImage"), effect).toHaveLength(0);
      expect(
        code.log.some((call) => call[0] === "fill" || call[0] === "stroke"),
        effect,
      ).toBe(true);
      // (A Sugar Toss holds its "+n"; its sweet flies before that.)
      const drawn = recordingContext();
      drawCandyFeedbackV7(
        drawn.context,
        camera,
        effect === "SUGAR_TOSS" ? { ...feedback, progress: 0.3 } : feedback,
        art,
      );
      const subject = sprites.get(effect);
      expect(
        calls(drawn.log, "drawImage").map(
          (call) => (call[1] as { subject: string }).subject,
        ),
        effect,
      ).toEqual(subject === undefined ? [] : [subject]);
    }
    for (const subject of sprites.values())
      expect(CANDY_EFFECT_SUBJECTS_V7).toContain(subject);
  });

  it("arcs the tossed sweet from the Gunner to its target", () => {
    const from = { x: 0, y: 100 };
    const to = { x: 200, y: 100 };
    expect(sugarTossPointV7(from, to, 0, 40)).toEqual(from);
    const mid = sugarTossPointV7(from, to, SUGAR_TOSS_LANDS_V7 / 2, 40);
    expect(mid.x).toBeCloseTo(100);
    expect(mid.y).toBeCloseTo(60);
    const landed = sugarTossPointV7(from, to, SUGAR_TOSS_LANDS_V7, 40);
    expect(landed.x).toBeCloseTo(200);
    expect(landed.y).toBeCloseTo(100);
    // The floated "+n" is drawn after it lands.
    const { context, log } = recordingContext();
    drawCandyFeedbackV7(context, camera, {
      effect: "SUGAR_TOSS",
      cells: [{ x: 2, y: 2 }],
      from: { x: 0, y: 2 },
      amount: 2,
      progress: 0.8,
    });
    expect(calls(log, "fillText").map((call) => call[1])).toEqual(["+2"]);
  });

  it("names a Candy unit by its own label on the Crumbs", () => {
    expect(effectiveRoleRuleV7("KNIGHT", "CANDY").label).toBe(
      "Chocolate Bunny",
    );
  });
});

describe("Candy in the Gallery", () => {
  it("plays each Candy ability on the demo board with a real command", () => {
    expect(galleryDemoCuesV7("CANDY", "FIGHTER")).toEqual([
      "ATTACK",
      "SUGAR_RUSH",
    ]);
    expect(galleryDemoCuesV7("CANDY", "CAPTAIN")).toEqual(
      expect.arrayContaining(["TEND_WOUNDED", "REBAKE", "SUGAR_RUSH"]),
    );
    expect(galleryDemoCuesV7("CANDY", "MARKSMAN")).toEqual(
      expect.arrayContaining(["ATTACK", "SUGAR_TOSS"]),
    );
    const rebake = buildGalleryDemoSceneV7("CANDY", "CAPTAIN", "REBAKE");
    expect(rebake?.command.kind).toBe("REBAKE");
    expect(rebake?.events.events.map((event) => event.kind)).toContain(
      "UNIT_REBAKED",
    );
    expect(
      buildGalleryDemoSceneV7("CANDY", "MARKSMAN", "SUGAR_TOSS")?.command.kind,
    ).toBe("SUGAR_TOSS");
    // No other faction's unit offers a Candy cue.
    expect(galleryDemoCuesV7("ORIGINAL", "CAPTAIN")).not.toContain("REBAKE");
    expect(galleryDemoCuesV7("DWARF", "FIGHTER")).not.toContain("SUGAR_RUSH");
  });
});
