import { describe, expect, it } from "vitest";
import {
  applyCommandV7,
  previewTendWoundedV7,
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
import type { ArtSubjectV7 } from "../../src/assets/chibi-art-v7";
import {
  buildBoardRenderPlanV7,
  CHIBI_OVERLAY_FRAME_V7,
  drawBoardV7,
  type BoardRenderPlanV7,
} from "../../src/render/canvas/board-renderer-v7";
import type { ChibiBoardArtV7 } from "../../src/render/canvas/chibi-art-resolver-v7";
import { corePresentationPlanV7 } from "../../src/render/canvas/presentation-plan-v7";
import {
  AFFLICTION_MARKER_FRAME_V7,
  UNDEAD_BADGE_FRAME_V7,
} from "../../src/render/canvas/undead-canvas-v7";
import {
  afflictionCursorCueV7,
  combatPreviewNoteV7,
  combatPreviewSemanticNoteV7,
  disbandBlockedByAfflictionV7,
  tendPreviewPresentationV7,
  undeadBoundaryNoticeV7,
  unitAfflictionsV7,
  wailPreviewDescriptionV7,
} from "../../src/render/undead-presentation-v7";
import {
  allTechsV7,
  checkedV7,
  exploredAllV7,
  initialV7,
} from "../fixtures/v7-builders";
import {
  AFFLICTION_SHOWCASE_V7,
  afflictionHumanFixtureV7,
  afflictionUndeadFixtureV7,
  undeadShowcaseFixtureV7,
} from "../fixtures/v7-undead-ui";

const HUMAN = AFFLICTION_SHOWCASE_V7.human;
const UNDEAD = AFFLICTION_SHOWCASE_V7.undead;
const NO_SELECTION = {
  selection: null,
  selectedUnitId: null,
  selectedAchievement: null,
} as const;

describe("Revision 14 Plague and Bitten presentation", () => {
  it("marks every visible plagued and bitten unit on the board plan", () => {
    const { view } = fixture(afflictionHumanFixtureV7);
    const plan = buildBoardRenderPlanV7(view, [], NO_SELECTION);
    expect(
      plan.entries
        .filter((entry) => entry.afflictions !== undefined)
        .map((entry) => [entry.at, entry.afflictions]),
    ).toEqual([
      [HUMAN.plaguedWarrior, ["PLAGUE"]],
      [HUMAN.bittenArcher, ["BITTEN"]],
      [HUMAN.doublyAfflicted, ["PLAGUE", "BITTEN"]],
    ]);
    // The Undead viewer sees the same public statuses on enemy units.
    const undead = fixture(afflictionUndeadFixtureV7).view;
    expect(
      buildBoardRenderPlanV7(undead, [], NO_SELECTION)
        .entries.filter((entry) => entry.afflictions !== undefined)
        .map((entry) => [entry.at, entry.afflictions]),
    ).toEqual([
      [UNDEAD.bittenVictim, ["BITTEN"]],
      [UNDEAD.plaguedSplash, ["PLAGUE"]],
    ]);
  });

  it("draws the markers in the art-set frame, clear of every other overlay", () => {
    const { view } = fixture(afflictionHumanFixtureV7);
    const plan = buildBoardRenderPlanV7(view, [], NO_SELECTION);
    const camera = { offsetX: 64, offsetY: 64, zoom: 1 };
    const at = HUMAN.doublyAfflicted;
    for (const artSet of ["LEGACY", "CHIBI"] as const) {
      const { context, log } = recordingContext();
      drawBoardV7({
        context,
        viewport: { width: 1600, height: 1600 },
        devicePixelRatio: 1,
        camera,
        plan,
        images: { resolve: () => ({}) as CanvasImageSource },
        artSet,
        chibiArt: unitChibiArt(),
      });
      const frames =
        artSet === "CHIBI"
          ? AFFLICTION_MARKER_FRAME_V7.chibi
          : AFFLICTION_MARKER_FRAME_V7.legacy;
      for (const frame of frames)
        expect(
          log.some(
            (call) =>
              call[0] === "arc" &&
              call[1] === 64 + at.x * 128 + frame.left + frame.size / 2 &&
              call[2] === 64 + at.y * 128 + frame.top + frame.size / 2 &&
              call[3] === frame.size / 2,
          ),
        ).toBe(true);
    }
    // A registered raster replaces the code-drawn marker (the art hook).
    const { context, log } = recordingContext();
    const raster = { marker: true } as unknown as CanvasImageSource;
    drawBoardV7({
      context,
      viewport: { width: 1600, height: 1600 },
      devicePixelRatio: 1,
      camera,
      plan,
      images: { resolve: () => ({}) as CanvasImageSource },
      afflictionArt: (subject) => (subject === "STATUS:BITTEN" ? raster : null),
    });
    expect(
      log.filter((call) => call[0] === "drawImage" && call[1] === raster),
    ).toHaveLength(2);

    const rect = (
      left: number,
      top: number,
      width: number,
      height = width,
    ) => ({
      left,
      top,
      right: left + width,
      bottom: top + height,
    });
    const chibi = CHIBI_OVERLAY_FRAME_V7;
    const chibiOthers = [
      rect(
        chibi.hpBar.left,
        chibi.hpBar.top,
        chibi.hpBar.width,
        chibi.hpBar.height,
      ),
      rect(chibi.seatBadge.left, chibi.seatBadge.top, chibi.seatBadge.size),
      rect(
        chibi.fieldDefense.left,
        chibi.fieldDefense.top,
        chibi.fieldDefense.size,
      ),
      rect(
        UNDEAD_BADGE_FRAME_V7.chibi.left,
        UNDEAD_BADGE_FRAME_V7.chibi.top,
        UNDEAD_BADGE_FRAME_V7.chibi.size,
      ),
      // Inspired status (slot 0) and the capital crown.
      rect(19, -50, 22),
      rect(chibi.crown.left, chibi.crown.bottom - 20, 20),
    ];
    const legacyOthers = [
      rect(-31, 13, 18), // seat badge
      rect(-25, 25, 50, 7), // HP bar
      rect(-53, -54, 22), // Field Defense symbol
      rect(
        UNDEAD_BADGE_FRAME_V7.legacy.left,
        UNDEAD_BADGE_FRAME_V7.legacy.top,
        UNDEAD_BADGE_FRAME_V7.legacy.size,
      ),
      rect(19, -50, 22), // Inspired status
    ];
    for (const [frames, others] of [
      [AFFLICTION_MARKER_FRAME_V7.chibi, chibiOthers],
      [AFFLICTION_MARKER_FRAME_V7.legacy, legacyOthers],
    ] as const) {
      const markers = frames.map((frame) =>
        rect(frame.left, frame.top, frame.size),
      );
      for (const marker of markers) {
        expect(marker.left).toBeGreaterThanOrEqual(-64);
        expect(marker.right).toBeLessThanOrEqual(64);
        for (const other of [...others, ...markers.filter((m) => m !== marker)])
          expect(overlaps(marker, other)).toBe(false);
      }
    }
  });

  it("explains each status in one sentence and names only a visible Lich", () => {
    const { view } = fixture(afflictionHumanFixtureV7);
    const warrior = unitAt(view, HUMAN.plaguedWarrior);
    expect(unitAfflictionsV7(view, warrior.id)).toEqual([
      {
        id: "PLAGUE",
        chip: "Plague · 3 turns",
        explanation:
          "Plague from Player 2's Lich: −2 HP at the start of each of its next 3 turns, then it ends; at the first it spreads to adjacent living units. It ends sooner if that Lich dies or a Captain tends it.",
      },
    ]);
    // Revision 15: the chip and sentence count the remaining turns down, and
    // only a first-turn Plague still spreads.
    const later = (turnsRemaining: number): PlayerViewV7 => ({
      ...view,
      plagued: view.plagued.map((entry) => ({ ...entry, turnsRemaining })),
    });
    expect(unitAfflictionsV7(later(2), warrior.id)[0]).toMatchObject({
      chip: "Plague · 2 turns",
      explanation:
        "Plague from Player 2's Lich: −2 HP at the start of each of its next 2 turns, then it ends. It ends sooner if that Lich dies or a Captain tends it.",
    });
    expect(unitAfflictionsV7(later(1), warrior.id)[0]).toMatchObject({
      chip: "Plague · 1 turn",
      explanation:
        "Plague from Player 2's Lich: −2 HP at the start of its next turn, then it ends. It ends sooner if that Lich dies or a Captain tends it.",
    });
    const archer = unitAt(view, HUMAN.bittenArcher);
    expect(unitAfflictionsV7(view, archer.id)).toEqual([
      {
        id: "BITTEN",
        chip: "Bitten",
        explanation:
          "Bitten by Player 2's Zombie: if it dies it rises as Player 2's Zombie, unless a Captain tends it first.",
      },
    ]);
    const hidden: PlayerViewV7 = {
      ...view,
      plagued: view.plagued.map((entry) => ({ ...entry, sourceUnitId: null })),
    };
    expect(unitAfflictionsV7(hidden, warrior.id)[0]?.explanation).toMatch(
      /^Plague from a hidden Lich: /,
    );
    const guard = unitAt(view, HUMAN.doublyAfflicted);
    expect(afflictionCursorCueV7(view, guard.id)).toBe("plagued, bitten");
    expect(afflictionCursorCueV7(view, unitAt(view, HUMAN.knight).id)).toBe("");
    // The Undead viewer owns the biting Zombie.
    const undead = fixture(afflictionUndeadFixtureV7).view;
    expect(
      unitAfflictionsV7(undead, unitAt(undead, UNDEAD.bittenVictim).id)[0]
        ?.explanation,
    ).toBe(
      "Bitten by your Zombie: if it dies it rises as your Zombie, unless a Captain tends it first.",
    );
    expect(
      unitAfflictionsV7(undead, unitAt(undead, UNDEAD.plaguedSplash).id)[0]
        ?.explanation,
    ).toMatch(/^Plague from your Lich: /);
  });

  it("explains why a plagued or bitten unit can't Disband", () => {
    const { view, commands } = fixture(afflictionHumanFixtureV7);
    const reason = (at: CoordV7) =>
      disbandBlockedByAfflictionV7(view, unitAt(view, at).id);
    expect(reason(HUMAN.plaguedWarrior)).toBe("PLAGUED");
    expect(reason(HUMAN.bittenArcher)).toBe("BITTEN");
    expect(reason(HUMAN.doublyAfflicted)).toBe("PLAGUED");
    expect(reason(HUMAN.knight)).toBeNull();
    expect(reason(HUMAN.visibleLich)).toBeNull();
    for (const at of [
      HUMAN.plaguedWarrior,
      HUMAN.bittenArcher,
      HUMAN.doublyAfflicted,
    ])
      expect(
        commands.some(
          (command) =>
            command.kind === "DISBAND" &&
            command.unitId === unitAt(view, at).id,
        ),
      ).toBe(false);
  });

  it("previews Tend Wounded heals and cures in Undead matches only", () => {
    const { view, commands } = fixture(afflictionHumanFixtureV7);
    const captain = unitAt(view, HUMAN.captain);
    const preview = required(previewTendWoundedV7(view, captain.id));
    expect(tendPreviewPresentationV7(view, preview)).toEqual({
      chip: "+2 HP · 2 cures",
      description:
        "Tends 2 units: Fighter: cures Plague; Marksman: +2 HP, cures bite",
    });
    expect(
      selected(view, commands, captain.id)
        .entries.filter((entry) => entry.abilityStyle === "TEND")
        .map((entry) => [entry.at, entry.label]),
    ).toEqual([
      [HUMAN.plaguedWarrior, "Cure"],
      [HUMAN.bittenArcher, "+2 · Cure"],
    ]);
  });

  it("adds Plague, Bite, bitten rising and unanswered outcomes to attack previews", () => {
    const { view, commands } = fixture(afflictionUndeadFixtureV7);
    const lich = unitAt(view, UNDEAD.lich);
    const target = unitAt(view, UNDEAD.lichTarget);
    const lichAttack = attackAt(view, commands, lich.id, UNDEAD.lichTarget);
    const preview = required(queryCombatPreviewV7(view, lich.id, target.id));
    expect(preview.plagued).toEqual([
      target.id,
      unitAt(view, UNDEAD.freshSplash).id,
    ]);
    expect(lichAttack.previewNote).toBe("Plagues 2 targets");
    expect(lichAttack.semanticLabel).toContain(
      "Plagues the target Fighter, Marksman.",
    );
    // The already plagued splash unit is not plagued again.
    expect(
      lichAttack.splash?.map((item) => [item.at, item.plagued === true]),
    ).toEqual([
      [UNDEAD.plaguedSplash, false],
      [UNDEAD.freshSplash, true],
    ]);
    expect(combatPreviewNoteV7({ ...preview, plagued: [target.id] })).toBe(
      "Plagues target",
    );

    const zombie = unitAt(view, UNDEAD.zombie);
    expect(
      attackAt(view, commands, zombie.id, UNDEAD.zombieTarget).previewNote,
    ).toBe("Bites");
    const vampire = unitAt(view, UNDEAD.vampire);
    const vampireAttack = attackAt(
      view,
      commands,
      vampire.id,
      UNDEAD.vampireTarget,
    );
    expect(vampireAttack.previewNote).toMatch(/^No retaliation · Heal \+\d$/);
    expect(vampireAttack.semanticLabel).toContain(
      "The defender can't strike back at a Vampire.",
    );
    const skeleton = unitAt(view, UNDEAD.skeleton);
    const rising = attackAt(view, commands, skeleton.id, UNDEAD.bittenVictim);
    expect(rising.previewNote).toBe("Rises as Zombie (bitten)");
    expect(rising.semanticLabel).toContain(
      "The bitten defender dies and rises as a Zombie.",
    );

    // A Human Knight attacking a Zombie is bitten by its retaliation.
    const human = fixture(afflictionHumanFixtureV7);
    const knight = unitAt(human.view, HUMAN.knight);
    const knightAttack = attackAt(
      human.view,
      human.commands,
      knight.id,
      HUMAN.zombie,
    );
    expect(knightAttack.previewNote).toBe("You get bitten");
    const knightPreview = required(
      queryCombatPreviewV7(
        human.view,
        knight.id,
        unitAt(human.view, HUMAN.zombie).id,
      ),
    );
    expect(combatPreviewSemanticNoteV7(knightPreview)).toBe(
      "The attacker is bitten and would rise as a Zombie on death.",
    );
    expect(
      combatPreviewNoteV7({
        ...knightPreview,
        attackerBitten: false,
        attackerBittenRises: true,
      }),
    ).toBe("You rise as enemy Zombie (bitten)");
  });

  it("shows which Wail victims rise from a bite", () => {
    const { view, commands } = fixture(afflictionUndeadFixtureV7);
    const banshee = unitAt(view, UNDEAD.banshee);
    const preview = required(previewWailV7(view, banshee.id));
    expect(wailPreviewDescriptionV7(view, preview)).toBe(
      "Hits 1 enemy within 2 tiles, 1 dies: Fighter −1 (dies, rises as a Zombie)",
    );
    expect(
      selected(view, commands, banshee.id)
        .entries.filter(
          (entry) =>
            entry.kind === "ABILITY_TARGET" && entry.abilityStyle === "WAIL",
        )
        .map((entry) => [entry.at, entry.label, entry.lethal]),
    ).toEqual([[UNDEAD.bittenVictim, "−1 · Rises", true]]);
  });

  it("animates and announces Plague damage, spread, cures, clearing and bitten risings", () => {
    const humanState = afflictionHumanFixtureV7();
    const humanId = humanState.humanPlayerId;
    const aiId = required(
      humanState.players.find((player) => player.id !== humanId),
    ).id;
    // Human END_TURN, then the Undead END_TURN starts the human turn.
    const ended = apply(humanState, humanId, { kind: "END_TURN" });
    const start = boundaryFor(ended, aiId, { kind: "END_TURN" }, humanId);
    const kinds = start.events.events.map((event) => event.kind);
    expect(kinds).toEqual(
      expect.arrayContaining(["PLAGUE_DAMAGED", "PLAGUE_SPREAD"]),
    );
    const steps = corePresentationPlanV7(
      start.before,
      start.events,
      start.after,
    );
    const damaged = [HUMAN.plaguedWarrior, HUMAN.doublyAfflicted];
    expect(steps).toContainEqual(
      expect.objectContaining({
        kind: "SUPPORT",
        effect: "PLAGUE",
        actor: expect.objectContaining({ at: damaged[0] }),
        recipients: [expect.objectContaining({ at: damaged[1] })],
      }),
    );
    expect(
      steps
        .filter((step) => step.kind === "DAMAGE")
        .map((step) => [step.at, step.damage]),
    ).toEqual(damaged.map((at) => [at, 2]));
    expect(
      steps.filter(
        (step) => step.kind === "SUPPORT" && step.effect === "PLAGUE",
      ),
    ).toHaveLength(2);
    const notice = required(
      undeadBoundaryNoticeV7(start.events.events, start.before, start.after),
    );
    expect(notice.toast).toBe(true);
    expect(notice.text).toMatch(
      /^Plague hit 2 of your units · Plague spread to \d units?$/,
    );

    // Revision 15: Plague on its last turn deals its damage, spreads no more,
    // and wears off with the cure sparkle.
    const lastTurn = checkedV7({
      ...ended,
      plagued: ended.plagued.map((entry) => ({ ...entry, turnsRemaining: 1 })),
    });
    const expiry = boundaryFor(lastTurn, aiId, { kind: "END_TURN" }, humanId);
    const expiryKinds = expiry.events.events.map((event) => event.kind);
    expect(expiryKinds).toContain("PLAGUE_EXPIRED");
    expect(expiryKinds).not.toContain("PLAGUE_SPREAD");
    expect(
      corePresentationPlanV7(expiry.before, expiry.events, expiry.after),
    ).toContainEqual(
      expect.objectContaining({
        kind: "SUPPORT",
        effect: "CURE",
        actor: expect.objectContaining({ at: damaged[0] }),
        recipients: [expect.objectContaining({ at: damaged[1] })],
      }),
    );
    expect(
      undeadBoundaryNoticeV7(expiry.events.events, expiry.before, expiry.after),
    ).toEqual({
      text: "Plague hit 2 of your units · Plague wore off 2 of your units",
      toast: true,
    });

    // A Captain's Tend cures Plague and a bite.
    const captain = unitAt(viewForV7(humanState, humanId), HUMAN.captain);
    const tend = boundaryFor(
      humanState,
      humanId,
      { kind: "TEND_WOUNDED", unitId: captain.id },
      humanId,
    );
    expect(
      undeadBoundaryNoticeV7(tend.events.events, tend.before, tend.after),
    ).toEqual({ text: "Tend cured Plague on 1 and a bite", toast: true });

    // Killing the visible Lich clears its Plague.
    const lichId = unitAt(viewForV7(humanState, humanId), HUMAN.visibleLich).id;
    const weakLich = checkedV7({
      ...humanState,
      units: humanState.units.map((unit) =>
        unit.id === lichId ? { ...unit, hp: 1 } : unit,
      ),
    });
    const warriorId = unitAt(
      viewForV7(weakLich, humanId),
      HUMAN.plaguedWarrior,
    ).id;
    const cleared = boundaryFor(
      weakLich,
      humanId,
      { kind: "ATTACK", unitId: warriorId, targetUnitId: lichId },
      humanId,
    );
    expect(cleared.events.events.map((event) => event.kind)).toContain(
      "PLAGUE_CLEARED",
    );
    expect(
      corePresentationPlanV7(cleared.before, cleared.events, cleared.after),
    ).toContainEqual(
      expect.objectContaining({
        kind: "SUPPORT",
        effect: "CURE",
        actor: expect.objectContaining({ unitId: warriorId }),
      }),
    );
    expect(
      undeadBoundaryNoticeV7(
        cleared.events.events,
        cleared.before,
        cleared.after,
      )?.text,
    ).toContain("Plague lifted from 1 unit");

    // A bitten victim rises as the biter's Zombie.
    const undeadState = afflictionUndeadFixtureV7();
    const undeadView = viewForV7(undeadState, undeadState.humanPlayerId);
    const rising = boundaryFor(
      undeadState,
      undeadState.humanPlayerId,
      {
        kind: "ATTACK",
        unitId: unitAt(undeadView, UNDEAD.skeleton).id,
        targetUnitId: unitAt(undeadView, UNDEAD.bittenVictim).id,
      },
      undeadState.humanPlayerId,
    );
    expect(
      corePresentationPlanV7(rising.before, rising.events, rising.after),
    ).toContainEqual(
      expect.objectContaining({
        kind: "SUPPORT",
        effect: "BITTEN",
        actor: expect.objectContaining({ at: UNDEAD.bittenVictim }),
      }),
    );
    expect(
      undeadBoundaryNoticeV7(rising.events.events, rising.before, rising.after),
    ).toEqual({ text: "A bitten Fighter rose as your Zombie", toast: true });
  });

  it("announces Plague deaths without kill credit", () => {
    const state = afflictionHumanFixtureV7();
    const humanId = state.humanPlayerId;
    const aiId = required(
      state.players.find((player) => player.id !== humanId),
    ).id;
    const warriorId = unitAt(
      viewForV7(state, humanId),
      HUMAN.plaguedWarrior,
    ).id;
    const frail = checkedV7({
      ...apply(state, humanId, { kind: "END_TURN" }),
    });
    const weakened = checkedV7({
      ...frail,
      units: frail.units.map((unit) =>
        unit.id === warriorId ? { ...unit, hp: 2 } : unit,
      ),
    });
    const start = boundaryFor(weakened, aiId, { kind: "END_TURN" }, humanId);
    expect(start.events.events).toContainEqual(
      expect.objectContaining({
        kind: "UNIT_DIED",
        unitId: warriorId,
        cause: "PLAGUE",
      }),
    );
    expect(
      corePresentationPlanV7(start.before, start.events, start.after),
    ).toContainEqual(
      expect.objectContaining({
        kind: "DAMAGE",
        unitId: warriorId,
        lethal: true,
      }),
    );
    expect(
      undeadBoundaryNoticeV7(start.events.events, start.before, start.after)
        ?.text,
    ).toContain("1 unit fell to Plague");
  });

  it("keeps Human-only and revision-13 fixtures free of revision-14 cues", () => {
    const state = allTechsV7(exploredAllV7(initialV7(71)));
    const view = viewForV7(state, state.humanPlayerId);
    const commands = queryPlayerCommandsV7(view);
    for (const unit of view.units) {
      const plan = selected(view, commands, unit.id);
      expect(
        plan.entries.filter(
          (entry) =>
            entry.afflictions !== undefined || entry.abilityStyle === "TEND",
        ),
      ).toEqual([]);
      expect(unitAfflictionsV7(view, unit.id)).toEqual([]);
      expect(disbandBlockedByAfflictionV7(view, unit.id)).toBeNull();
    }
    const showcase = undeadShowcaseFixtureV7();
    const showcaseView = viewForV7(showcase, showcase.humanPlayerId);
    expect(
      buildBoardRenderPlanV7(showcaseView, [], NO_SELECTION).entries.filter(
        (entry) => entry.afflictions !== undefined,
      ),
    ).toEqual([]);
  });
});

function fixture(make: () => GameStateV7): {
  readonly view: PlayerViewV7;
  readonly commands: readonly CommandV7[];
} {
  const state = make();
  const view = viewForV7(state, state.humanPlayerId);
  return { view, commands: queryPlayerCommandsV7(view) };
}

function selected(
  view: PlayerViewV7,
  commands: readonly CommandV7[],
  unitId: number,
): BoardRenderPlanV7 {
  return buildBoardRenderPlanV7(view, commands, {
    selection: { kind: "UNIT", unitId },
    selectedUnitId: unitId,
    selectedAchievement: null,
  });
}

function attackAt(
  view: PlayerViewV7,
  commands: readonly CommandV7[],
  unitId: number,
  at: CoordV7,
): BoardRenderPlanV7["targets"][number] {
  return required(
    selected(view, commands, unitId).targets.find(
      (target) => target.family === "ATTACK" && same(target.at, at),
    ),
  );
}

function apply(
  state: GameStateV7,
  actor: number,
  command: CommandV7,
): GameStateV7 {
  const result = applyCommandV7(state, actor as never, command);
  if (!result.accepted) throw new Error(result.error.code);
  return result.state;
}

function boundaryFor(
  state: GameStateV7,
  actor: number,
  command: CommandV7,
  viewer: number,
): {
  readonly before: PlayerViewV7;
  readonly after: PlayerViewV7;
  readonly events: ReturnType<typeof projectEventsV7>;
} {
  const result = applyCommandV7(state, actor as never, command);
  if (!result.accepted) throw new Error(result.error.code);
  return {
    before: viewForV7(state, viewer as never),
    after: viewForV7(result.state, viewer as never),
    events: projectEventsV7(
      state,
      result.state,
      viewer as never,
      result.events,
    ),
  };
}

function unitAt(
  view: PlayerViewV7,
  at: CoordV7,
): PlayerViewV7["units"][number] {
  return required(view.units.find((unit) => same(unit.at, at)));
}

function overlaps(
  left: { left: number; top: number; right: number; bottom: number },
  right: { left: number; top: number; right: number; bottom: number },
): boolean {
  return (
    left.left < right.right &&
    right.left < left.right &&
    left.top < right.bottom &&
    right.top < left.bottom
  );
}

function recordingContext(): {
  readonly context: CanvasRenderingContext2D;
  readonly log: (readonly unknown[])[];
} {
  const log: (readonly unknown[])[] = [];
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
      set: (target, key, value) => Reflect.set(target, key, value),
    },
  );
  return { context: context as CanvasRenderingContext2D, log };
}

/** CHIBI fake with a registered raster for every Human unit role. */
function unitChibiArt(): ChibiBoardArtV7 {
  const ready = (subject: ArtSubjectV7): boolean =>
    subject.startsWith("UNIT:") && !subject.startsWith("UNIT:UNDEAD:");
  return {
    resolve: (request) => {
      if (!ready(request.subject)) return { kind: "MISSING" };
      return {
        kind: "READY",
        asset: {
          id: `fixture-${request.subject}`,
          subject: request.subject,
          assetClass: "STANDARD_UNIT",
          width: 56,
          height: 80,
          url: "/fixture.png",
        },
        image: { subject: request.subject } as unknown as CanvasImageSource,
        density: 1,
        smoothing: false,
        cacheKey: request.subject,
      };
    },
  };
}

function same(left: CoordV7, right: CoordV7): boolean {
  return left.x === right.x && left.y === right.y;
}

function required<T>(value: T | null | undefined): T {
  if (value === null || value === undefined)
    throw new Error("Required affliction presentation fixture value missing");
  return value;
}
