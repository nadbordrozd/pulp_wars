import { describe, expect, it } from "vitest";
import {
  isRallyTargetV7,
  previewTendWoundedV7,
  queryPlayerCommandsV7,
  viewForV7,
  type CoordV7,
  type GameStateV7,
  type PlayerViewV7,
} from "../../src/engine/index";
import {
  buildBoardRenderPlanV7,
  drawBoardV7,
  type AreaSupportFocusV7,
  type BoardRenderPlanEntryV7,
  type BoardRenderPlanV7,
} from "../../src/render/canvas/board-renderer-v7";
import {
  AREA_SUPPORT_DASH_V7,
  AREA_SUPPORT_FILL_V7,
  TARGET_HIGHLIGHTS_V7,
  TARGET_HIGHLIGHT_WIDTHS_V7,
  drawTargetHighlightV7,
  targetHighlightStyleV7,
  type TargetHighlightOptionsV7,
} from "../../src/render/canvas/target-highlight-v7";
import { tendTargetLabelV7 } from "../../src/render/undead-presentation-v7";
import {
  AREA_SUPPORT_SCENES_V7,
  DINOSAUR_TEND_V7,
  HUMAN_TEND_V7,
  dinosaurTendFixtureV7,
  humanTendFixtureV7,
} from "../fixtures/v7-area-support-ui";
import { CANDY_UI_V7, candyUiFixtureV7 } from "../fixtures/v7-candy-ui";
import { DWARF_UI_V7, dwarfUiFixtureV7 } from "../fixtures/v7-dwarf-ui";
import { ICE_FOLK_UI_V7, iceFolkUiFixtureV7 } from "../fixtures/v7-ice-folk-ui";
import {
  AFFLICTION_SHOWCASE_V7,
  afflictionHumanFixtureV7,
} from "../fixtures/v7-undead-ui";

/**
 * Bead pulp_wars-621 (docs/ui/BOARD_TARGETING.md section 2.1): the units
 * an area support would help wear a broken Help ring with the exact amount
 * of the engine's public preview. They are marks, never targets.
 */

type LogEntry = readonly unknown[];
const key = (at: CoordV7): string => `${at.x},${at.y}`;
const humanView = (state: GameStateV7): PlayerViewV7 =>
  viewForV7(state, state.humanPlayerId);
const byKey = (left: string, right: string): number =>
  left < right ? -1 : left > right ? 1 : 0;

function unitAt(view: PlayerViewV7, at: CoordV7) {
  const unit = view.units.find((candidate) => key(candidate.at) === key(at));
  if (unit === undefined) throw new Error(`no unit at ${key(at)}`);
  return unit;
}

function planOf(
  state: GameStateV7,
  actor: CoordV7,
  focus: AreaSupportFocusV7["kind"] | null = null,
): { readonly view: PlayerViewV7; readonly plan: BoardRenderPlanV7 } {
  const view = viewForV7(state, state.humanPlayerId);
  const unit = unitAt(view, actor);
  return {
    view,
    plan: buildBoardRenderPlanV7(view, queryPlayerCommandsV7(view), {
      selection: { kind: "UNIT", unitId: unit.id },
      selectedUnitId: unit.id,
      selectedAchievement: null,
      ...(focus === null
        ? {}
        : { areaSupportFocus: { unitId: unit.id, kind: focus } }),
    }),
  };
}

const marks = (plan: BoardRenderPlanV7): readonly BoardRenderPlanEntryV7[] =>
  plan.entries.filter((entry) => entry.areaSupport !== undefined);

function recordingContext(): {
  readonly context: CanvasRenderingContext2D;
  readonly log: LogEntry[];
} {
  const log: LogEntry[] = [];
  const context = new Proxy(
    {},
    {
      get: (target, name) =>
        name === "canvas"
          ? undefined
          : name === "measureText"
            ? (text: string) => ({ width: text.length * 6 })
            : name === "createLinearGradient"
              ? () => ({ addColorStop: () => undefined })
              : name in target
                ? Reflect.get(target, name)
                : (...args: unknown[]) => {
                    log.push([String(name), ...args]);
                  },
      set: (target, name, value) => {
        log.push(["set", String(name), value]);
        return Reflect.set(target, name, value);
      },
    },
  );
  return { context: context as CanvasRenderingContext2D, log };
}

function drawMark(options: TargetHighlightOptionsV7): LogEntry[] {
  const { context, log } = recordingContext();
  drawTargetHighlightV7(
    context,
    { x: 100, y: 100, size: 128, zoom: 1 },
    "SUPPORT",
    options,
  );
  return log;
}

const count = (log: readonly LogEntry[], name: string): number =>
  log.filter((call) => call[0] === name).length;
const sets = (log: readonly LogEntry[], name: string): unknown[] =>
  log.filter((call) => call[0] === "set" && call[1] === name).map((c) => c[2]);
const dashes = (log: readonly LogEntry[]): string[] =>
  log
    .filter((call) => call[0] === "setLineDash")
    .map((call) => (call[1] as number[]).join());

describe("the area support mark", () => {
  it("is a broken Help ring: thin at rest, full weight with a soft fill when its button is hovered", () => {
    const target = drawMark({});
    const quiet = drawMark({ weight: "QUIET" });
    const prominent = drawMark({ weight: "PROMINENT" });
    // A target to pick keeps its whole ring.
    expect(dashes(target)).toEqual(["", ""]);
    expect(dashes(quiet)[0]).toBe(AREA_SUPPORT_DASH_V7.join());
    expect(dashes(prominent)[0]).toBe(AREA_SUPPORT_DASH_V7.join());
    // The ring and its plus badge, in the Help green, in every weight.
    for (const log of [target, quiet, prominent]) {
      expect(sets(log, "strokeStyle")).toContain(
        TARGET_HIGHLIGHTS_V7.SUPPORT.stroke,
      );
      expect(count(log, "lineTo")).toBe(2);
    }
    expect(count(target, "arc")).toBe(2);
    expect(count(quiet, "arc")).toBe(2);
    // Prominent adds the filled disc under the ring.
    expect(count(prominent, "arc")).toBe(3);
    expect(sets(prominent, "fillStyle")[0]).toBe(AREA_SUPPORT_FILL_V7);
    expect(sets(quiet, "fillStyle")).not.toContain(AREA_SUPPORT_FILL_V7);
    expect(sets(target, "fillStyle")).not.toContain(AREA_SUPPORT_FILL_V7);
    // Quiet is thinner than a target; prominent is a target's weight.
    expect(sets(target, "lineWidth")).toContain(
      TARGET_HIGHLIGHT_WIDTHS_V7.TARGET[0],
    );
    expect(sets(prominent, "lineWidth")).toContain(
      TARGET_HIGHLIGHT_WIDTHS_V7.TARGET[0],
    );
    expect(sets(quiet, "lineWidth")).toContain(
      TARGET_HIGHLIGHT_WIDTHS_V7.QUIET[0],
    );
    expect(sets(quiet, "lineWidth")).not.toContain(
      TARGET_HIGHLIGHT_WIDTHS_V7.TARGET[0],
    );
    expect(TARGET_HIGHLIGHT_WIDTHS_V7.QUIET[0]).toBeLessThan(
      TARGET_HIGHLIGHT_WIDTHS_V7.TARGET[0],
    );
    // High contrast draws each a step thicker.
    expect(
      sets(drawMark({ weight: "QUIET", highContrast: true }), "lineWidth"),
    ).toContain(TARGET_HIGHLIGHT_WIDTHS_V7.QUIET[1]);
    // The mark never depends on time.
    expect(drawMark({ weight: "QUIET" })).toEqual(quiet);
  });

  it("labels a cure of Plague, a bite or Chill as a cure, never as +0 HP", () => {
    const result = {
      unitId: 1 as never,
      amount: 0,
      hpAfter: 10,
      curedPlague: false,
      curedBitten: false,
      curedChill: false,
    };
    expect(tendTargetLabelV7({ ...result, amount: 2 })).toBe("+2 HP");
    expect(tendTargetLabelV7({ ...result, curedChill: true })).toBe("Cure");
    expect(tendTargetLabelV7({ ...result, curedPlague: true })).toBe("Cure");
    expect(tendTargetLabelV7({ ...result, amount: 2, curedChill: true })).toBe(
      "+2 · Cure",
    );
  });
});

describe("area support marks in the board plan", () => {
  for (const scene of AREA_SUPPORT_SCENES_V7.filter(
    (entry) => entry.kind === "TEND_WOUNDED",
  ))
    it(`${scene.name}: every unit it would heal is marked with the exact amount`, () => {
      const { view, plan } = planOf(scene.state(), scene.actor);
      const actor = unitAt(view, scene.actor);
      const preview = previewTendWoundedV7(view, actor.id);
      if (preview === null) throw new Error("Tend Wounded is not offered");
      expect(preview.results.length).toBeGreaterThan(0);
      const expected = preview.results
        .map((result) => {
          const unit = view.units.find((entry) => entry.id === result.unitId);
          if (unit === undefined) throw new Error("recipient missing");
          return `${key(unit.at)} ${tendTargetLabelV7(result)}`;
        })
        .sort(byKey);
      // Quiet while the healer is merely selected.
      expect(
        marks(plan)
          .map((entry) => `${key(entry.at)} ${entry.label ?? ""}`)
          .sort(byKey),
      ).toEqual(expected);
      for (const entry of marks(plan)) {
        expect(entry.kind).toBe("ABILITY_TARGET");
        expect(entry.abilityStyle).toBe("TEND");
        expect(entry.areaSupport).toBe("QUIET");
        expect(entry.label).toMatch(/^(\+\d+ HP|Cure|\+\d+ · Cure)$/);
        // No coordinates in a label.
        expect(entry.label).not.toMatch(/\d\s*,\s*\d/);
        // A mark is never a target: a click on it selects the unit.
        expect(
          plan.targets.some((target) => key(target.at) === key(entry.at)),
        ).toBe(false);
      }
      // Prominent while the button is hovered or focused; nothing else
      // about the marks changes.
      const hovered = planOf(scene.state(), scene.actor, "TEND_WOUNDED").plan;
      expect(
        marks(hovered).map((entry) => [entry.key, entry.label, entry.at]),
      ).toEqual(marks(plan).map((entry) => [entry.key, entry.label, entry.at]));
      for (const entry of marks(hovered))
        expect(entry.areaSupport).toBe("PROMINENT");
      expect(hovered.targets).toEqual(plan.targets);
    });

  for (const scene of AREA_SUPPORT_SCENES_V7.filter(
    (entry) => entry.kind === "RALLY",
  ))
    it(`${scene.name}: its recipients are shown only while the button is hovered`, () => {
      const { view, plan } = planOf(scene.state(), scene.actor);
      const actor = unitAt(view, scene.actor);
      expect(
        queryPlayerCommandsV7(view).some(
          (command) => command.kind === "RALLY" && command.unitId === actor.id,
        ),
      ).toBe(true);
      // At rest a Rally adds nothing to the board.
      expect(
        marks(plan).filter((entry) => entry.abilityStyle === "RALLY"),
      ).toEqual([]);
      const hovered = planOf(scene.state(), scene.actor, "RALLY").plan;
      const expected = view.units
        .filter((unit) => isRallyTargetV7(view, actor, unit))
        .map((unit) => key(unit.at))
        .sort(byKey);
      expect(expected.length).toBeGreaterThan(0);
      expect(
        marks(hovered)
          .map((entry) => key(entry.at))
          .sort(byKey),
      ).toEqual(expected);
      for (const entry of marks(hovered)) {
        expect(entry.abilityStyle).toBe("RALLY");
        expect(entry.areaSupport).toBe("PROMINENT");
        // A Rally has no amount: the ring stands without a label. An Orc
        // Warboss's Berserk (`pulp_wars-w49.36`) says what it gives.
        expect(entry.label).toBe(
          scene.name === "Goblin Warboss: Berserk" ? "+1 Move" : undefined,
        );
      }
      expect(hovered.targets).toEqual(plan.targets);
    });

  it("marks only the units in reach that need it, and nothing for another unit's selection", () => {
    const { plan } = planOf(humanTendFixtureV7(), HUMAN_TEND_V7.captain);
    expect(
      marks(plan)
        .map((entry) => key(entry.at))
        .sort(byKey),
    ).toEqual(
      [HUMAN_TEND_V7.woundedFighter, HUMAN_TEND_V7.woundedMarksman]
        .map(key)
        .sort(byKey),
    );
    expect(
      marks(planOf(humanTendFixtureV7(), HUMAN_TEND_V7.healthyGuard).plan),
    ).toEqual([]);
    // A hovered Rally shows the Rally's recipients instead of the heals.
    const rally = planOf(humanTendFixtureV7(), HUMAN_TEND_V7.captain, "RALLY");
    expect(
      marks(rally.plan).every((entry) => entry.abilityStyle === "RALLY"),
    ).toBe(true);
    // The focus of another unit's button changes nothing.
    const view = humanView(humanTendFixtureV7());
    const captain = unitAt(view, HUMAN_TEND_V7.captain);
    const other = buildBoardRenderPlanV7(view, queryPlayerCommandsV7(view), {
      selection: { kind: "UNIT", unitId: captain.id },
      selectedUnitId: captain.id,
      selectedAchievement: null,
      areaSupportFocus: {
        unitId: unitAt(view, HUMAN_TEND_V7.healthyGuard).id,
        kind: "TEND_WOUNDED",
      },
    });
    for (const entry of marks(other)) expect(entry.areaSupport).toBe("QUIET");
  });

  it("keeps a recipient apart from a target to pick: the Shaman's Egg is a target, its wounded Caveman a mark", () => {
    const { plan } = planOf(dinosaurTendFixtureV7(), DINOSAUR_TEND_V7.shaman);
    const egg = plan.targets.filter(
      (target) => key(target.at) === key(DINOSAUR_TEND_V7.egg),
    );
    expect(egg.map((target) => target.family)).toEqual(["HATCH"]);
    expect(targetHighlightStyleV7("HATCH")).toBe("SUPPORT");
    expect(marks(plan).map((entry) => entry.at)).toEqual([
      DINOSAUR_TEND_V7.woundedCaveman,
    ]);
    expect(
      plan.targets.some(
        (target) => key(target.at) === key(DINOSAUR_TEND_V7.woundedCaveman),
      ),
    ).toBe(false);
  });

  it("steps aside while another ability of the unit is aimed", () => {
    const dwarf = humanView(dwarfUiFixtureV7());
    const engineer = unitAt(dwarf, DWARF_UI_V7.engineer);
    const aimed = buildBoardRenderPlanV7(dwarf, queryPlayerCommandsV7(dwarf), {
      selection: { kind: "UNIT", unitId: engineer.id },
      selectedUnitId: engineer.id,
      selectedAchievement: null,
      dwarfPick: { kind: "ASSEMBLE", unitId: engineer.id },
    });
    expect(marks(aimed)).toEqual([]);
    const candy = humanView(candyUiFixtureV7());
    const confectioner = unitAt(candy, CANDY_UI_V7.confectioner);
    const rebake = buildBoardRenderPlanV7(candy, queryPlayerCommandsV7(candy), {
      selection: { kind: "UNIT", unitId: confectioner.id },
      selectedUnitId: confectioner.id,
      selectedAchievement: null,
      candyPick: { kind: "REBAKE", unitId: confectioner.id },
    });
    expect(marks(rebake)).toEqual([]);
  });

  it("the Ice Folk have no area support: no unit of theirs adds a mark", () => {
    const state = iceFolkUiFixtureV7();
    const view = viewForV7(state, state.humanPlayerId);
    expect(
      queryPlayerCommandsV7(view).some(
        (command) =>
          command.kind === "TEND_WOUNDED" || command.kind === "RALLY",
      ),
    ).toBe(false);
    expect(marks(planOf(state, ICE_FOLK_UI_V7.witch).plan)).toEqual([]);
  });
});

describe("area support marks on the canvas", () => {
  const draw = (plan: BoardRenderPlanV7): LogEntry[] => {
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
    });
    return log;
  };
  const texts = (log: readonly LogEntry[]): unknown[] =>
    log.filter((call) => call[0] === "fillText").map((call) => call[1]);
  const fills = (log: readonly LogEntry[]): number =>
    sets(log, "fillStyle").filter((value) => value === AREA_SUPPORT_FILL_V7)
      .length;
  const brokenRings = (log: readonly LogEntry[]): number =>
    dashes(log).filter((dash) => dash === AREA_SUPPORT_DASH_V7.join()).length;

  it("draws each recipient's ring and amount, and the soft fill only when hovered", () => {
    const quiet = draw(
      planOf(humanTendFixtureV7(), HUMAN_TEND_V7.captain).plan,
    );
    const hovered = draw(
      planOf(humanTendFixtureV7(), HUMAN_TEND_V7.captain, "TEND_WOUNDED").plan,
    );
    for (const log of [quiet, hovered]) {
      expect(brokenRings(log)).toBe(2);
      expect(texts(log).filter((text) => text === "+2 HP")).toHaveLength(2);
    }
    expect(fills(quiet)).toBe(0);
    expect(fills(hovered)).toBe(2);
    // Another unit selected: no ring at all.
    expect(
      brokenRings(
        draw(planOf(humanTendFixtureV7(), HUMAN_TEND_V7.healthyGuard).plan),
      ),
    ).toBe(0);
  });

  it("draws a cure as its word, and a Rally's rings without any label", () => {
    const cures = draw(
      planOf(afflictionHumanFixtureV7(), AFFLICTION_SHOWCASE_V7.human.captain)
        .plan,
    );
    expect(texts(cures)).toEqual(expect.arrayContaining(["Cure", "+2 · Cure"]));
    const rest = draw(planOf(humanTendFixtureV7(), HUMAN_TEND_V7.captain).plan);
    const rally = draw(
      planOf(humanTendFixtureV7(), HUMAN_TEND_V7.captain, "RALLY").plan,
    );
    expect(brokenRings(rally)).toBeGreaterThan(0);
    expect(fills(rally)).toBe(brokenRings(rally));
    expect(texts(rally).filter((text) => text === "+2 HP")).toEqual([]);
    expect(texts(rest).filter((text) => text === "+2 HP")).toHaveLength(2);
  });
});
