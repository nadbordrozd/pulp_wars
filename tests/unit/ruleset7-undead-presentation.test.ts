import { describe, expect, it } from "vitest";
import {
  applyCommandV7,
  previewDevourV7,
  previewRaiseDeadV7,
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
  type BoardRenderPlanEntryV7,
  type BoardRenderPlanV7,
} from "../../src/render/canvas/board-renderer-v7";
import type { ArtSubjectV7 } from "../../src/assets/chibi-art-v7";
import type { ChibiBoardArtV7 } from "../../src/render/canvas/chibi-art-resolver-v7";
import { corePresentationPlanV7 } from "../../src/render/canvas/presentation-plan-v7";
import {
  GRAVE_MARKER_FRAME_V7,
  UNDEAD_BADGE_FRAME_V7,
} from "../../src/render/canvas/undead-canvas-v7";
import { tacticalAttachmentsV7 } from "../../src/render/tactical-presentation-v7";
import {
  combatPreviewNoteV7,
  restlessRecoverBlockedV7,
  undeadBoundaryNoticeV7,
  undeadCommandLabelV7,
} from "../../src/render/undead-presentation-v7";
import { allTechsV7, exploredAllV7, initialV7 } from "../fixtures/v7-builders";
import {
  UNDEAD_SHOWCASE_V7,
  undeadShowcaseFixtureV7,
} from "../fixtures/v7-undead-ui";

const NO_SELECTION = {
  selection: null,
  selectedUnitId: null,
  selectedAchievement: null,
} as const;

describe("Revision 13 Undead presentation", () => {
  it("plans explored Graves as corner markers above units and badges Undead units", () => {
    const state = undeadShowcaseFixtureV7();
    const view = viewForV7(state, state.humanPlayerId);
    const plan = buildBoardRenderPlanV7(
      view,
      queryPlayerCommandsV7(view),
      NO_SELECTION,
    );
    const graves = plan.entries.filter((entry) => entry.kind === "GRAVE");
    expect(graves.map((entry) => entry.at)).toEqual(view.graves);
    const units = plan.entries.filter((entry) => entry.kind === "UNIT");
    // The marker belongs above every piece (units are layer 5), and no
    // showcase Grave shares its tile with a city.
    expect(
      graves.every(
        (entry) =>
          entry.layer > Math.max(...units.map((unit) => unit.layer)) &&
          entry.attachmentSlot === 0,
      ),
    ).toBe(true);
    const undead = units.filter((entry) => entry.faction === "UNDEAD");
    expect(undead.map((entry) => entry.label).sort()).toEqual(
      [
        "Banshee",
        "Ghoul",
        "Lich",
        "Necromancer",
        "Skeleton",
        "Vampire",
        "Zombie",
      ].sort(),
    );
    // Undead units keep the Human legacy sprite of the same role and ask the
    // CHIBI art set for their own Undead subject first.
    const banshee = unitEntryAt(plan, UNDEAD_SHOWCASE_V7.banshee);
    const humanMarksman = unitEntryAt(plan, UNDEAD_SHOWCASE_V7.lichSplash[1]);
    expect(banshee.assetId).toBe(humanMarksman.assetId);
    expect(banshee.artSubject).toBe("UNIT:UNDEAD:MARKSMAN");
    expect(humanMarksman.artSubject).toBe("UNIT:MARKSMAN");
    expect(humanMarksman.faction).toBeUndefined();
    expect(humanMarksman.label).toBe("Marksman");
    expect(graves.every((entry) => entry.artSubject === "GRAVE")).toBe(true);
  });

  it("previews the Wail radius and exact per-target damage for a selected Banshee", () => {
    const { view, commands } = showcase();
    const banshee = unitAt(view, UNDEAD_SHOWCASE_V7.banshee);
    const plan = selected(view, commands, banshee.id);
    const preview = required(previewWailV7(view, banshee.id));
    const area = plan.entries.filter(
      (entry) => entry.kind === "ABILITY_AREA" && entry.abilityStyle === "WAIL",
    );
    // Radius 2 around (2, 2) on an 11x11 board: a full 5x5 square.
    expect(area).toHaveLength(25);
    expect(
      area.every(
        (entry) =>
          Math.max(
            Math.abs(entry.at.x - banshee.at.x),
            Math.abs(entry.at.y - banshee.at.y),
          ) <= 2,
      ),
    ).toBe(true);
    const targets = plan.entries.filter(
      (entry) =>
        entry.kind === "ABILITY_TARGET" && entry.abilityStyle === "WAIL",
    );
    expect(
      targets.map((entry) => [entry.at, entry.label, entry.lethal]),
    ).toEqual(
      preview.targets.map((target) => [
        target.at,
        // The Vampire and Banshee rework (`pulp_wars-iqhp`): a survivor the
        // Wail terrifies says so.
        `−${target.damage}${target.terror ? " · Terror" : ""}`,
        target.dies,
      ]),
    );
    expect(targets.some((entry) => entry.lethal === true)).toBe(true);
  });

  it("highlights the Graves Raise Dead raises and the Devour heal", () => {
    const { view, commands } = showcase();
    const necromancer = unitAt(view, UNDEAD_SHOWCASE_V7.necromancer);
    const raise = selected(view, commands, necromancer.id).entries.filter(
      (entry) => entry.kind === "ABILITY_TARGET",
    );
    expect(raise.map((entry) => entry.at)).toEqual(
      required(previewRaiseDeadV7(view, necromancer.id)).graves,
    );
    expect(raise.every((entry) => entry.label === "Rise")).toBe(true);
    const ghoul = unitAt(view, UNDEAD_SHOWCASE_V7.ghoul);
    const devour = required(previewDevourV7(view, ghoul.id));
    expect(
      selected(view, commands, ghoul.id)
        .entries.filter((entry) => entry.kind === "ABILITY_TARGET")
        .map((entry) => [entry.abilityStyle, entry.at, entry.label]),
    ).toEqual([["DEVOUR", devour.at, `+${devour.amount} HP`]]);
  });

  it("adds Lich splash cells, Lifesteal and Infect outcomes to attack previews", () => {
    const { view, commands } = showcase();
    const lich = unitAt(view, UNDEAD_SHOWCASE_V7.lich);
    const target = unitAt(view, UNDEAD_SHOWCASE_V7.lichTarget);
    const lichPlan = selected(view, commands, lich.id);
    const attack = required(
      lichPlan.targets.find(
        (candidate) =>
          candidate.family === "ATTACK" &&
          same(candidate.at, UNDEAD_SHOWCASE_V7.lichTarget),
      ),
    );
    const preview = required(queryCombatPreviewV7(view, lich.id, target.id));
    // Revision 14: the Lich also plagues every surviving splashed unit.
    expect(attack.splash).toEqual(
      preview.splash.map((item) => ({
        at: item.at,
        damage: item.damage,
        dies: item.dies,
        ...(preview.plagued.includes(item.unitId) ? { plagued: true } : {}),
      })),
    );
    expect(attack.splash?.map((item) => item.at)).toEqual(
      expect.arrayContaining([...UNDEAD_SHOWCASE_V7.lichSplash]),
    );

    const vampire = unitAt(view, UNDEAD_SHOWCASE_V7.vampire);
    const vampireAttack = required(
      selected(view, commands, vampire.id).targets.find(
        (candidate) => candidate.family === "ATTACK",
      ),
    );
    const heal = required(
      queryCombatPreviewV7(
        view,
        vampire.id,
        unitAt(view, UNDEAD_SHOWCASE_V7.vampireTarget).id,
      ),
    ).attackerHeal;
    expect(heal).toBeGreaterThan(0);
    // Revision 14: a Vampire's attack is also unanswered.
    expect(vampireAttack.previewNote).toBe(`No retaliation · Heal +${heal}`);
    expect(vampireAttack.semanticLabel).toContain(
      `Lifesteal heals the attacker by ${heal} HP.`,
    );

    const zombie = unitAt(view, UNDEAD_SHOWCASE_V7.zombie);
    const zombieAttack = required(
      selected(view, commands, zombie.id).targets.find(
        (candidate) =>
          candidate.family === "ATTACK" &&
          same(candidate.at, UNDEAD_SHOWCASE_V7.zombieTarget),
      ),
    );
    // Tuning 2 (7r47): the attacker does not take the tile of a unit that
    // rises.
    expect(zombieAttack.previewNote).toBe("Rises as Zombie · Stays");
    expect(zombieAttack.semanticLabel).toContain("rises as a Zombie");
  });

  it("keeps Human-only plans free of every revision-13 addition", () => {
    const state = allTechsV7(exploredAllV7(initialV7(71)));
    const view = viewForV7(state, state.humanPlayerId);
    const commands = queryPlayerCommandsV7(view);
    for (const unit of view.units) {
      const plan = buildBoardRenderPlanV7(view, commands, {
        selection: { kind: "UNIT", unitId: unit.id },
        selectedUnitId: unit.id,
        selectedAchievement: null,
      });
      expect(
        plan.entries.filter(
          (entry) =>
            entry.kind === "GRAVE" ||
            entry.kind === "ABILITY_AREA" ||
            entry.kind === "ABILITY_TARGET" ||
            entry.faction !== undefined,
        ),
      ).toEqual([]);
      expect(
        plan.targets.filter(
          (target) =>
            target.previewNote !== undefined || target.splash !== undefined,
        ),
      ).toEqual([]);
    }
    expect(tacticalAttachmentsV7(view).map((item) => item.label)).not.toContain(
      "Frenzied by Necromancer Frenzy: +1 next Attack",
    );
    expect(undeadCommandLabelV7("RALLY", "ORIGINAL")).toBeNull();
    expect(undeadCommandLabelV7("RALLY", "UNDEAD")).toBe("Frenzy");
  });

  it("draws the Grave corner marker and the Undead badge in both art sets", () => {
    const state = undeadShowcaseFixtureV7();
    const view = viewForV7(state, state.humanPlayerId);
    const plan = buildBoardRenderPlanV7(view, [], NO_SELECTION);
    const banshee = UNDEAD_SHOWCASE_V7.banshee;
    const camera = { offsetX: 64, offsetY: 64, zoom: 1 };
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
        // CHIBI Human units resolve a registered raster, so they use the
        // chibi overlay frame. No Undead raster is registered, so Undead
        // units fall back to the Human sprite of their role (with the badge).
        chibiArt: fixtureChibiArt(
          (subject) =>
            subject.startsWith("UNIT:") && !subject.startsWith("UNIT:UNDEAD:"),
        ),
      });
      // Every Grave is a small code-drawn tombstone in the bottom-right
      // corner of its cell: no mound, no raster, in either art set.
      const frame0 =
        artSet === "CHIBI"
          ? GRAVE_MARKER_FRAME_V7.chibi
          : GRAVE_MARKER_FRAME_V7.legacy;
      expect(frame0.left).toBeGreaterThan(0);
      expect(frame0.top).toBeGreaterThan(0);
      expect(frame0.left + frame0.size).toBeLessThanOrEqual(64);
      expect(frame0.top + frame0.size).toBeLessThanOrEqual(64);
      // 14–18 CSS px on an 80 CSS px cell (128 world units).
      expect((frame0.size * 80) / 128).toBeGreaterThanOrEqual(14);
      expect((frame0.size * 80) / 128).toBeLessThanOrEqual(18.001);
      expect(log.some((call) => call[0] === "ellipse")).toBe(false);
      const lastImage = log.reduce(
        (last, call, index) => (call[0] === "drawImage" ? index : last),
        -1,
      );
      expect(lastImage).toBeGreaterThan(-1);
      for (const at of view.graves) {
        const index = graveMarkerIndex(log, at, frame0);
        // Drawn after every sprite, so the Ghoul standing on its Grave
        // never hides the marker.
        expect(index).toBeGreaterThan(lastImage);
      }
      // The faction badge is a disc on the art-set frame of the Banshee.
      const frame =
        artSet === "CHIBI"
          ? UNDEAD_BADGE_FRAME_V7.chibi
          : UNDEAD_BADGE_FRAME_V7.legacy;
      expect(
        log.some(
          (call) =>
            call[0] === "arc" &&
            call[1] === 64 + banshee.x * 128 + frame.left + frame.size / 2 &&
            call[2] === 64 + banshee.y * 128 + frame.top + frame.size / 2 &&
            call[3] === frame.size / 2,
        ),
      ).toBe(true);
      if (artSet === "CHIBI")
        expect(drawnSubjects(log)).toContain("UNIT:MARKSMAN");
    }
  });

  it("draws registered Undead rasters without the badge and never the Grave raster", () => {
    const state = undeadShowcaseFixtureV7();
    const view = viewForV7(state, state.humanPlayerId);
    const plan = buildBoardRenderPlanV7(view, [], NO_SELECTION);
    const camera = { offsetX: 64, offsetY: 64, zoom: 1 };
    const undeadUnits = plan.entries.filter(
      (entry) => entry.kind === "UNIT" && entry.faction === "UNDEAD",
    );
    const badgeCentres = (log: readonly (readonly unknown[])[]) =>
      undeadUnits.filter((entry) =>
        log.some(
          (call) =>
            call[0] === "arc" &&
            call[1] ===
              64 +
                entry.at.x * 128 +
                UNDEAD_BADGE_FRAME_V7.chibi.left +
                UNDEAD_BADGE_FRAME_V7.chibi.size / 2 &&
            call[2] ===
              64 +
                entry.at.y * 128 +
                UNDEAD_BADGE_FRAME_V7.chibi.top +
                UNDEAD_BADGE_FRAME_V7.chibi.size / 2,
        ),
      );
    const draw = (
      ready: (subject: string) => boolean,
      loading: (subject: string) => boolean = () => false,
    ) => {
      const { context, log } = recordingContext();
      drawBoardV7({
        context,
        viewport: { width: 1600, height: 1600 },
        devicePixelRatio: 1,
        camera,
        plan,
        images: { resolve: () => ({}) as CanvasImageSource },
        artSet: "CHIBI",
        chibiArt: fixtureChibiArt(ready, loading),
      });
      return log;
    };
    // Every Undead raster and the Grave are registered.
    const all = draw(
      (subject) => subject.startsWith("UNIT:") || subject === "GRAVE",
    );
    expect(badgeCentres(all)).toEqual([]);
    const subjects = drawnSubjects(all);
    for (const entry of undeadUnits)
      expect(subjects).toContain(entry.artSubject);
    // Undead units never draw the Human sprite of their role in its place.
    expect(subjects).not.toContain("UNIT:CAPTAIN");
    expect(subjects).toContain("UNIT:FIGHTER");
    // The large Grave raster is no longer drawn even when registered: each
    // Grave is the code-drawn corner marker.
    expect(subjects).not.toContain("GRAVE");
    expect(all.some((call) => call[0] === "ellipse")).toBe(false);
    for (const at of view.graves)
      expect(
        graveMarkerIndex(all, at, GRAVE_MARKER_FRAME_V7.chibi),
      ).toBeGreaterThan(-1);
    // A loading Undead raster still means Undead art: no stand-in, no badge.
    const loading = draw(
      (subject) =>
        subject.startsWith("UNIT:") && subject !== "UNIT:UNDEAD:MARKSMAN",
      (subject) => subject === "UNIT:UNDEAD:MARKSMAN" || subject === "GRAVE",
    );
    expect(badgeCentres(loading)).toEqual([]);
    // Only the Human Marksman draws the Human Marksman sprite.
    expect(
      drawnSubjects(loading).filter((subject) => subject === "UNIT:MARKSMAN"),
    ).toHaveLength(
      plan.entries.filter((entry) => entry.artSubject === "UNIT:MARKSMAN")
        .length,
    );
    expect(drawnSubjects(loading)).not.toContain("UNIT:UNDEAD:MARKSMAN");
    expect(loading.some((call) => call[0] === "ellipse")).toBe(false);
    // Only some Undead rasters registered: the rest keep the Human sprite
    // and the badge.
    const partial = draw(
      (subject) =>
        subject === "UNIT:UNDEAD:FIGHTER" ||
        (subject.startsWith("UNIT:") && !subject.startsWith("UNIT:UNDEAD:")),
    );
    expect(
      badgeCentres(partial)
        .map((entry) => entry.label)
        .sort(),
    ).toEqual(
      undeadUnits
        .filter((entry) => entry.artSubject !== "UNIT:UNDEAD:FIGHTER")
        .map((entry) => entry.label)
        .sort(),
    );
  });

  it("plans Wail, Raise Dead, Devour, Infect and Grave animations and notices", () => {
    const state = undeadShowcaseFixtureV7();
    const view = viewForV7(state, state.humanPlayerId);
    const banshee = unitAt(view, UNDEAD_SHOWCASE_V7.banshee);
    const wail = boundary(state, { kind: "WAIL", unitId: banshee.id });
    const wailSteps = corePresentationPlanV7(
      wail.before,
      wail.events,
      wail.after,
    );
    expect(wailSteps[0]).toMatchObject({
      kind: "SUPPORT",
      effect: "WAIL",
      actor: { unitId: banshee.id, at: banshee.at },
    });
    expect(
      wailSteps.filter((step) => step.kind === "DAMAGE").map((step) => step.at),
    ).toEqual(
      required(previewWailV7(view, banshee.id)).targets.map(
        (target) => target.at,
      ),
    );
    expect(wailSteps.at(-1)).toMatchObject({
      kind: "SUPPORT",
      effect: "GRAVE",
      actor: { at: UNDEAD_SHOWCASE_V7.wailVictim },
    });
    expect(
      undeadBoundaryNoticeV7(wail.events.events, wail.before, wail.after),
    ).toEqual({
      text: "Banshee wailed: 2 hit, 1 fell, 1 terrified (no strike-back this turn) · 1 Grave left",
      toast: true,
    });

    const necromancer = unitAt(view, UNDEAD_SHOWCASE_V7.necromancer);
    const raise = boundary(state, {
      kind: "RAISE_DEAD",
      unitId: necromancer.id,
    });
    expect(
      corePresentationPlanV7(raise.before, raise.events, raise.after).find(
        (step) => step.kind === "SUPPORT",
      ),
    ).toMatchObject({
      effect: "RAISE",
      recipients: UNDEAD_SHOWCASE_V7.raiseGraves.map((at) => ({ at })),
    });
    expect(
      undeadBoundaryNoticeV7(raise.events.events, raise.before, raise.after)
        ?.text,
    ).toBe("Necromancer raised 3 Skeletons");

    const ghoul = unitAt(view, UNDEAD_SHOWCASE_V7.ghoul);
    const devour = boundary(state, { kind: "DEVOUR", unitId: ghoul.id });
    expect(
      corePresentationPlanV7(devour.before, devour.events, devour.after),
    ).toContainEqual(
      expect.objectContaining({ kind: "SUPPORT", effect: "DEVOUR" }),
    );
    expect(
      undeadBoundaryNoticeV7(devour.events.events, devour.before, devour.after)
        ?.text,
    ).toBe("Ghoul devoured a Grave: +6 HP");

    const zombie = unitAt(view, UNDEAD_SHOWCASE_V7.zombie);
    const victim = unitAt(view, UNDEAD_SHOWCASE_V7.zombieTarget);
    const infect = boundary(state, {
      kind: "ATTACK",
      unitId: zombie.id,
      targetUnitId: victim.id,
    });
    expect(
      corePresentationPlanV7(infect.before, infect.events, infect.after),
    ).toContainEqual(
      expect.objectContaining({
        kind: "SUPPORT",
        effect: "INFECT",
        actor: expect.objectContaining({ at: UNDEAD_SHOWCASE_V7.zombieTarget }),
      }),
    );
    expect(
      undeadBoundaryNoticeV7(infect.events.events, infect.before, infect.after)
        ?.text,
    ).toBe("A fallen Fighter rose as a Zombie");
  });

  it("reports Lifesteal and Infect preview notes only when they apply", () => {
    const { view } = showcase();
    const lich = unitAt(view, UNDEAD_SHOWCASE_V7.lich);
    const plain = required(
      queryCombatPreviewV7(
        view,
        lich.id,
        unitAt(view, UNDEAD_SHOWCASE_V7.lichTarget).id,
      ),
    );
    // Revision 14: the Lich shot plagues; without Plague the note is empty.
    expect(combatPreviewNoteV7({ ...plain, plagued: [] })).toBeNull();
    expect(
      combatPreviewNoteV7({
        ...plain,
        plagued: [],
        defenderHeal: 2,
        attackerInfected: true,
      }),
    ).toBe("Foe heals +2 · You rise as enemy Zombie");
  });

  it("explains Restless only for a damaged own Undead land unit outside its territory", () => {
    const { view, commands } = showcase();
    const skeleton = unitAt(view, UNDEAD_SHOWCASE_V7.restlessSkeleton);
    expect(skeleton.hp).toBeLessThan(skeleton.maxHp);
    expect(
      commands.some(
        (command) =>
          command.kind === "RECOVER" && command.unitId === skeleton.id,
      ),
    ).toBe(false);
    expect(restlessRecoverBlockedV7(view, skeleton)).toBe(true);
    expect(
      restlessRecoverBlockedV7(
        view,
        unitAt(view, UNDEAD_SHOWCASE_V7.banshee), // full HP
      ),
    ).toBe(false);
    const human = allTechsV7(exploredAllV7(initialV7(71)));
    const humanView = viewForV7(human, human.humanPlayerId);
    for (const unit of humanView.units)
      expect(restlessRecoverBlockedV7(humanView, { ...unit, hp: 1 })).toBe(
        false,
      );
  });
});

function showcase(): {
  readonly view: PlayerViewV7;
  readonly commands: readonly CommandV7[];
} {
  const state = undeadShowcaseFixtureV7();
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

function boundary(
  state: GameStateV7,
  command: CommandV7,
): {
  readonly before: PlayerViewV7;
  readonly after: PlayerViewV7;
  readonly events: ReturnType<typeof projectEventsV7>;
} {
  const result = applyCommandV7(state, state.humanPlayerId, command);
  if (!result.accepted) throw new Error(result.error.code);
  return {
    before: viewForV7(state, state.humanPlayerId),
    after: viewForV7(result.state, state.humanPlayerId),
    events: projectEventsV7(
      state,
      result.state,
      state.humanPlayerId,
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

function unitEntryAt(
  plan: BoardRenderPlanV7,
  at: CoordV7,
): BoardRenderPlanEntryV7 {
  return required(
    plan.entries.find((entry) => entry.kind === "UNIT" && same(entry.at, at)),
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

/**
 * Index of the headstone arc of the Grave corner marker at `at` (camera
 * offset 64, zoom 1), or -1 when it was not drawn.
 */
function graveMarkerIndex(
  log: readonly (readonly unknown[])[],
  at: CoordV7,
  frame: { readonly left: number; readonly top: number; readonly size: number },
): number {
  const near = (value: unknown, expected: number): boolean =>
    typeof value === "number" && Math.abs(value - expected) < 1e-6;
  return log.findIndex(
    (call) =>
      call[0] === "arc" &&
      near(call[1], 64 + at.x * 128 + frame.left + frame.size * 0.5) &&
      near(call[2], 64 + at.y * 128 + frame.top + frame.size * 0.38) &&
      near(call[3], frame.size * 0.3),
  );
}

/**
 * A CHIBI art fake: `ready` subjects resolve to an image tagged with the
 * subject (units 56 x 80, the Grave a 40 x 40 resource), `loading` ones are
 * still loading, and everything else is MISSING.
 */
function fixtureChibiArt(
  ready: (subject: ArtSubjectV7) => boolean,
  loading: (subject: ArtSubjectV7) => boolean = () => false,
): ChibiBoardArtV7 {
  return {
    resolve: (request) => {
      if (loading(request.subject)) return { kind: "LOADING" };
      if (!ready(request.subject)) return { kind: "MISSING" };
      const grave = request.subject === "GRAVE";
      return {
        kind: "READY",
        asset: {
          id: `fixture-${request.subject}`,
          subject: request.subject,
          assetClass: grave ? "RESOURCE" : "STANDARD_UNIT",
          width: grave ? 40 : 56,
          height: grave ? 40 : 80,
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

/** Subjects of every fixture chibi image drawn, in draw order. */
function drawnSubjects(log: readonly (readonly unknown[])[]): string[] {
  return log
    .filter((call) => call[0] === "drawImage")
    .map((call) => (call[1] as { subject?: string }).subject)
    .filter((subject): subject is string => subject !== undefined);
}

function same(left: CoordV7, right: CoordV7): boolean {
  return left.x === right.x && left.y === right.y;
}

function required<T>(value: T | null | undefined): T {
  if (value === null || value === undefined)
    throw new Error("Required Undead presentation fixture value missing");
  return value;
}
