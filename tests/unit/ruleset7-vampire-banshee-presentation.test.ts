import { describe, expect, it } from "vitest";
import {
  applyCommandV7,
  previewWailV7,
  projectEventsV7,
  queryCombatPreviewV7,
  queryPlayerCommandsV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type GameStateV7,
  type PlayerViewV7,
} from "../../src/engine/index";
import {
  buildBoardRenderPlanV7,
  drawBoardV7,
  type BoardRenderPlanV7,
} from "../../src/render/canvas/board-renderer-v7";
import {
  corePresentationPlanV7,
  type CorePresentationStepV7,
} from "../../src/render/canvas/presentation-plan-v7";
import { drawSupportFeedbackV7 } from "../../src/render/canvas/support-presentation-v7";
import {
  BAT_ESCAPE_PALETTE_V7,
  drawBatEscapeReachV7,
  drawBatFlightArcV7,
  drawEtherealReachV7,
  drawTerrorGlyphV7,
} from "../../src/render/canvas/vampire-banshee-canvas-v7";
import { soundCuesForStepV7 } from "../../src/audio/sound-events-v7";
import {
  BAT_ESCAPE_REACH_LABEL_V7,
  ETHEREAL_REACH_LABEL_V7,
  FEAST_ATTACK_AGAIN_PREVIEW_V7,
  FEAST_PREVIEW_V7,
  TERROR_NO_STRIKE_BACK_V7,
  TERROR_STATUS_V7,
  combatPreviewNoteV7,
  combatPreviewSemanticNoteV7,
  etherealNewReachV7,
  feastPromptV7,
  terrorCursorCueV7,
  undeadBoundaryNoticeV7,
  wailPreviewDescriptionV7,
  wailTargetLabelV7,
} from "../../src/render/undead-presentation-v7";
import { statusGlossaryV7 } from "../../src/render/unit-glossary-v7";
import {
  VAMPIRE_BANSHEE_UI_V7,
  bansheeEtherealFixtureV7,
  bansheeTerrorFixtureV7,
  bansheeWailFixtureV7,
  vampireBatEscapeFixtureV7,
  vampireFeastFixtureV7,
  vampireFeastSetupFixtureV7,
} from "../fixtures/v7-vampire-banshee-ui";

const AT = VAMPIRE_BANSHEE_UI_V7;

const viewOf = (state: GameStateV7): PlayerViewV7 =>
  viewForV7(state, state.humanPlayerId);

const same = (left: CoordV7, right: CoordV7): boolean =>
  left.x === right.x && left.y === right.y;

function unitAt(view: PlayerViewV7, at: CoordV7) {
  const unit = view.units.find((candidate) => same(candidate.at, at));
  if (unit === undefined) throw new Error(`No unit at ${at.x},${at.y}`);
  return unit;
}

function selectedPlan(view: PlayerViewV7, unitId: number): BoardRenderPlanV7 {
  return buildBoardRenderPlanV7(view, queryPlayerCommandsV7(view), {
    selection: { kind: "UNIT", unitId },
    selectedUnitId: unitId,
    selectedAchievement: null,
  });
}

/** Applies a human command and returns its projected presentation steps. */
function play(
  state: GameStateV7,
  command: CommandV7,
): {
  readonly state: GameStateV7;
  readonly steps: readonly CorePresentationStepV7[];
  readonly notice: ReturnType<typeof undeadBoundaryNoticeV7>;
  readonly before: PlayerViewV7;
  readonly after: PlayerViewV7;
  readonly envelope: ReturnType<typeof projectEventsV7>;
} {
  const before = viewOf(state);
  const result = applyCommandV7(state, state.humanPlayerId, command);
  if (!result.accepted) throw new Error(result.error.code);
  const after = viewOf(result.state);
  const envelope = projectEventsV7(
    state,
    result.state,
    state.humanPlayerId,
    result.events,
  );
  return {
    state: result.state,
    steps: corePresentationPlanV7(before, envelope, after),
    notice: undeadBoundaryNoticeV7(envelope.events, before, after),
    before,
    after,
    envelope,
  };
}

function recordingContext(): {
  readonly context: CanvasRenderingContext2D;
  readonly log: (readonly unknown[])[];
  readonly styles: string[];
} {
  const log: (readonly unknown[])[] = [];
  const styles: string[] = [];
  const context = new Proxy(
    {},
    {
      get: (target, key) =>
        key === "canvas"
          ? undefined
          : key === "measureText"
            ? (text: string) => ({ width: text.length * 7 })
            : key in target
              ? Reflect.get(target, key)
              : (...args: unknown[]) => {
                  log.push([String(key), ...args]);
                },
      set: (target, key, value) => {
        if (
          (key === "fillStyle" || key === "strokeStyle") &&
          typeof value === "string"
        )
          styles.push(value);
        return Reflect.set(target, key, value);
      },
    },
  );
  return { context: context as CanvasRenderingContext2D, log, styles };
}

describe("Vampire Bat Escape interface (pulp_wars-iqhp)", () => {
  it("marks every Escape Move as flying reach and names the units it flies over", () => {
    const view = viewOf(vampireBatEscapeFixtureV7());
    const vampire = unitAt(view, AT.escape.vampire);
    expect(vampire.activation.escapeAvailable).toBe(true);
    const plan = selectedPlan(view, vampire.id);
    const moves = plan.targets.filter((target) => target.family === "MOVE");
    expect(moves.length).toBeGreaterThan(0);
    expect(moves.every((target) => target.batEscape !== undefined)).toBe(true);
    expect(
      moves.every((target) =>
        target.semanticLabel?.includes(BAT_ESCAPE_REACH_LABEL_V7),
      ),
    ).toBe(true);
    // Two tiles away, past the Guard below it: the flight passes over it.
    const over = moves.filter(
      (target) => (target.batEscape?.over.length ?? 0) > 0,
    );
    expect(over.length).toBeGreaterThan(0);
    for (const target of over) {
      expect(target.semanticLabel).toMatch(/Flies over 1 unit/);
      expect(target.batEscape?.from).toEqual(AT.escape.vampire);
    }
    // Drawn: the landing marks and, for the focused landing, its arc.
    const focus = over[0]?.at ?? null;
    const { context, log, styles } = recordingContext();
    drawBoardV7({
      context,
      viewport: { width: 1400, height: 1000 },
      devicePixelRatio: 1,
      camera: { offsetX: 100, offsetY: 100, zoom: 0.625 },
      plan,
      images: { resolve: () => null },
      previewFocus: focus,
    });
    expect(styles).toContain(BAT_ESCAPE_PALETTE_V7.bat);
    expect(styles).toContain(BAT_ESCAPE_PALETTE_V7.tint);
    expect(log.some((call) => call[0] === "quadraticCurveTo")).toBe(true);
  });

  it("plays a bat swirl with its flutter before the escape Move", () => {
    const state = vampireBatEscapeFixtureV7();
    const view = viewOf(state);
    const vampire = unitAt(view, AT.escape.vampire);
    const escape = queryPlayerCommandsV7(view).find(
      (command): command is Extract<CommandV7, { kind: "MOVE" }> =>
        command.kind === "MOVE" &&
        command.unitId === vampire.id &&
        command.path.length === 2,
    );
    if (escape === undefined) throw new Error("no escape Move");
    const run = play(state, escape);
    const swirl = run.steps.findIndex(
      (step) => step.kind === "SUPPORT" && step.effect === "BAT_SWIRL",
    );
    const move = run.steps.findIndex((step) => step.kind === "MOVE");
    expect(swirl).toBeGreaterThanOrEqual(0);
    expect(move).toBeGreaterThan(swirl);
    const step = run.steps[swirl];
    if (step?.kind !== "SUPPORT") throw new Error("no swirl");
    expect(step.actor.at).toEqual(AT.escape.vampire);
    expect(step.recipients.map((recipient) => recipient.at)).toEqual([
      escape.path.at(-1),
    ]);
    const sounds = soundCuesForStepV7({
      step,
      before: run.before,
      after: run.after,
      envelope: run.envelope,
      durationScale: 1,
    }).map((cue) => cue.id);
    expect(sounds).toEqual(["special.puff", "special.puff"]);
    // The swirl draws bats, still and readable in reduced motion.
    for (const reduced of [false, true]) {
      const { context, styles } = recordingContext();
      drawSupportFeedbackV7(
        context,
        { offsetX: 0, offsetY: 0, zoom: 0.625 },
        {
          effect: "BAT_SWIRL",
          actor: step.actor,
          recipients: step.recipients,
          progress: 0.3,
        },
        reduced,
      );
      expect(styles).toContain(BAT_ESCAPE_PALETTE_V7.bat);
    }
  });

  it("draws the landing mark, the flight arc and their high-contrast forms", () => {
    const reach = recordingContext();
    drawBatEscapeReachV7(reach.context, 100, 100, 1);
    expect(reach.styles).toContain(BAT_ESCAPE_PALETTE_V7.tint);
    const contrast = recordingContext();
    drawBatEscapeReachV7(contrast.context, 100, 100, 1, true);
    expect(contrast.styles).not.toContain(BAT_ESCAPE_PALETTE_V7.tint);
    expect(contrast.styles).toContain("#ffffff");
    const arc = recordingContext();
    drawBatFlightArcV7(
      arc.context,
      { x: 0, y: 0 },
      { x: 160, y: 0 },
      {
        zoom: 1,
        prominent: true,
      },
    );
    expect(arc.styles).toContain(BAT_ESCAPE_PALETTE_V7.stroke);
    expect(arc.styles).toContain(BAT_ESCAPE_PALETTE_V7.bat);
  });
});

describe("Vampire Feast interface (pulp_wars-iqhp)", () => {
  it("previews the Feast on the killing attack", () => {
    const view = viewOf(vampireFeastSetupFixtureV7());
    const vampire = unitAt(view, AT.feast.vampire);
    const preview = queryCombatPreviewV7(
      view,
      vampire.id,
      unitAt(view, AT.feast.victim).id,
    );
    if (preview === null) throw new Error("no preview");
    expect(preview.feast).toBe(true);
    expect(combatPreviewNoteV7(preview)).toContain(
      FEAST_ATTACK_AGAIN_PREVIEW_V7,
    );
    expect(combatPreviewSemanticNoteV7(preview, view)).toContain(
      "it may attack once more this turn",
    );
    const plan = selectedPlan(view, vampire.id);
    const target = plan.targets.find(
      (candidate) =>
        candidate.family === "ATTACK" && same(candidate.at, AT.feast.victim),
    );
    expect(target?.previewNote).toContain(FEAST_ATTACK_AGAIN_PREVIEW_V7);
  });

  it("heals with a Feast cue, announces it, and prompts the second attack", () => {
    const setup = vampireFeastSetupFixtureV7();
    const view = viewOf(setup);
    const vampire = unitAt(view, AT.feast.vampire);
    const run = play(setup, {
      kind: "ATTACK",
      unitId: vampire.id,
      targetUnitId: unitAt(view, AT.feast.victim).id,
    });
    const feast = run.steps.find(
      (step) => step.kind === "SUPPORT" && step.effect === "FEAST",
    );
    if (feast?.kind !== "SUPPORT") throw new Error("no Feast cue");
    expect(feast.actor.amount).toBe(vampire.maxHp - vampire.hp);
    expect(run.notice?.text).toContain("Vampire feasted: healed to full");
    expect(run.notice?.text).toContain("may attack again");
    expect(run.notice?.toast).toBe(true);
    // The Feast's float, with its "Feast!" line.
    const { context, log } = recordingContext();
    drawSupportFeedbackV7(
      context,
      { offsetX: 0, offsetY: 0, zoom: 0.625 },
      {
        effect: "FEAST",
        actor: feast.actor,
        recipients: [],
        progress: 0.5,
      },
      false,
    );
    const texts = log
      .filter((call) => call[0] === "fillText")
      .map((call) => call[1]);
    expect(texts).toEqual([`+${feast.actor.amount ?? 0}`, "Feast!"]);
    // After the kill: the dock prompt, and the second attack's preview.
    const after = viewOf(vampireFeastFixtureV7());
    const fed = after.units.find((unit) => unit.id === vampire.id);
    if (fed === undefined) throw new Error("Vampire gone");
    expect(after.feastedThisTurn).toEqual([vampire.id]);
    expect(feastPromptV7(after, fed)).toBe(
      "Feast! It healed to full HP and may attack once more this turn, or fly off with Bat Escape.",
    );
    const second = queryCombatPreviewV7(
      after,
      fed.id,
      unitAt(after, AT.feast.next).id,
    );
    if (second === null) throw new Error("no second preview");
    expect(combatPreviewNoteV7(second)).toBe(FEAST_PREVIEW_V7);
    expect(statusGlossaryV7("feast")?.name).toBe("Feast");
    // No prompt for a Vampire that has not feasted.
    expect(feastPromptV7(view, vampire)).toBeNull();
  });
});

describe("Banshee Wail, Terror and Ethereal interface (pulp_wars-iqhp)", () => {
  it("previews each Wail target's damage and Terror", () => {
    const view = viewOf(bansheeWailFixtureV7());
    const banshee = unitAt(view, AT.wail.banshee);
    const preview = previewWailV7(view, banshee.id);
    if (preview === null) throw new Error("no Wail preview");
    const plan = selectedPlan(view, banshee.id);
    const labels = plan.entries
      .filter(
        (entry) =>
          entry.kind === "ABILITY_TARGET" && entry.abilityStyle === "WAIL",
      )
      .map((entry) => `${entry.at.x},${entry.at.y}:${entry.label ?? ""}`);
    for (const target of preview.targets)
      expect(labels).toContain(
        `${target.at.x},${target.at.y}:${wailTargetLabelV7(target)}`,
      );
    const survivor = preview.targets.find((target) =>
      same(target.at, AT.wail.survivor),
    );
    const victim = preview.targets.find((target) =>
      same(target.at, AT.wail.victim),
    );
    expect(survivor?.terror).toBe(true);
    expect(survivor === undefined ? "" : wailTargetLabelV7(survivor)).toMatch(
      /^−\d+ · Terror$/,
    );
    expect(victim?.terror).toBe(false);
    expect(victim === undefined ? "" : wailTargetLabelV7(victim)).not.toMatch(
      /Terror/,
    );
    const description = wailPreviewDescriptionV7(view, preview);
    expect(description).toContain("(terrified)");
    expect(description).toContain(
      "Terror: the 2 terrified enemies won't strike back this turn",
    );
  });

  it("marks terrified units, says it, and plays the Terror cue", () => {
    const setup = bansheeWailFixtureV7();
    const run = play(setup, {
      kind: "WAIL",
      unitId: unitAt(viewOf(setup), AT.wail.banshee).id,
    });
    expect(run.notice?.text).toContain(
      "2 terrified (no strike-back this turn)",
    );
    const terror = run.steps.find(
      (step) => step.kind === "SUPPORT" && step.effect === "TERROR",
    );
    if (terror?.kind !== "SUPPORT") throw new Error("no Terror cue");
    expect(
      terror.recipients.map((recipient) => recipient.at).sort(byYX),
    ).toEqual([AT.wail.guard, AT.wail.survivor].sort(byYX));
    const view = viewOf(bansheeTerrorFixtureV7());
    const plan = buildBoardRenderPlanV7(view, [], {
      selection: null,
      selectedUnitId: null,
      selectedAchievement: null,
    });
    const marked = plan.entries
      .filter((entry) => entry.kind === "UNIT" && entry.terror === true)
      .map((entry) => entry.at)
      .sort(byYX);
    expect(marked).toEqual([AT.wail.guard, AT.wail.survivor].sort(byYX));
    expect(terrorCursorCueV7(view, unitAt(view, AT.wail.survivor))).toBe(
      TERROR_STATUS_V7,
    );
    expect(terrorCursorCueV7(view, unitAt(view, AT.wail.banshee))).toBe("");
    expect(statusGlossaryV7("terror")?.name).toBe("Terror");
  });

  it("says a terrified defender won't strike back", () => {
    const view = viewOf(bansheeTerrorFixtureV7());
    const skeleton = unitAt(view, AT.wail.skeleton);
    const preview = queryCombatPreviewV7(
      view,
      skeleton.id,
      unitAt(view, AT.wail.survivor).id,
    );
    if (preview === null) throw new Error("no preview");
    expect(preview.noRetaliationReason).toBe("TERROR");
    expect(combatPreviewNoteV7(preview)).toContain(TERROR_NO_STRIKE_BACK_V7);
    const target = selectedPlan(view, skeleton.id).targets.find(
      (candidate) =>
        candidate.family === "ATTACK" && same(candidate.at, AT.wail.survivor),
    );
    expect(target?.previewNote).toContain(TERROR_NO_STRIKE_BACK_V7);
    expect(target?.semanticLabel).toContain("won't strike back");
    // The attack's log line names the Terror.
    const state = bansheeTerrorFixtureV7();
    const run = play(state, {
      kind: "ATTACK",
      unitId: skeleton.id,
      targetUnitId: unitAt(view, AT.wail.survivor).id,
    });
    expect(run.notice?.text).toMatch(/was terrified and didn't strike back/);
  });

  it("draws the Terror glyph in the status column, white on black in high contrast", () => {
    const glyph = recordingContext();
    drawTerrorGlyphV7(glyph.context, 100, 100, 1, { chibi: true, slot: 0 });
    expect(glyph.styles).toContain(BAT_ESCAPE_PALETTE_V7.stroke);
    expect(glyph.styles).toContain(BAT_ESCAPE_PALETTE_V7.edge);
    const contrast = recordingContext();
    drawTerrorGlyphV7(contrast.context, 100, 100, 1, {
      chibi: false,
      slot: 2,
      highContrast: true,
    });
    expect(contrast.styles).not.toContain(BAT_ESCAPE_PALETTE_V7.stroke);
    expect(contrast.styles).toContain("#ffffff");
  });

  it("marks the Ethereal Banshee's tiles past an enemy zone of control", () => {
    const view = viewOf(bansheeEtherealFixtureV7());
    const banshee = unitAt(view, AT.ethereal.banshee);
    const reach = etherealNewReachV7(view, banshee.id);
    expect(reach.has(`${AT.ethereal.pastZoc.x},${AT.ethereal.pastZoc.y}`)).toBe(
      true,
    );
    // The road tile next to the enemy is reached anyway.
    expect(reach.has("4,6")).toBe(false);
    const plan = selectedPlan(view, banshee.id);
    const past = plan.targets.find(
      (target) =>
        target.family === "MOVE" && same(target.at, AT.ethereal.pastZoc),
    );
    expect(past?.etherealReach).toBe(true);
    expect(past?.semanticLabel).toContain(ETHEREAL_REACH_LABEL_V7);
    const plain = plan.targets.find(
      (target) => target.family === "MOVE" && same(target.at, { x: 4, y: 6 }),
    );
    expect(plain?.etherealReach).toBeUndefined();
    expect(plan.targets.some((target) => target.batEscape !== undefined)).toBe(
      false,
    );
    // A unit without Ethereal never has such reach.
    const wail = viewOf(bansheeWailFixtureV7());
    expect(
      etherealNewReachV7(wail, unitAt(wail, AT.wail.skeleton).id).size,
    ).toBe(0);
    const hatch = recordingContext();
    drawEtherealReachV7(hatch.context, 100, 100, 1);
    expect(hatch.styles).toContain(BAT_ESCAPE_PALETTE_V7.hatch);
    const contrast = recordingContext();
    drawEtherealReachV7(contrast.context, 100, 100, 1, true);
    expect(contrast.styles).not.toContain(BAT_ESCAPE_PALETTE_V7.hatch);
  });
});

function byYX(left: CoordV7, right: CoordV7): number {
  return left.y - right.y || left.x - right.x;
}
