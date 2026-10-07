import { describe, expect, it } from "vitest";
import {
  BASIC_ECONOMIC_ACTIONS_V7,
  FACTION_IDS_V7,
  queryPlayerCommandsV7,
  technologyDisplayNameV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type GameStateV7,
  type PlayerViewV7,
  type TechnologyIdV7,
} from "../../src/engine/index";
import type { BoardSelectionV7 } from "../../src/render/canvas/board-renderer-v7";
import {
  FIRST_STEPS_TURN_LIMIT_V7,
  FIRST_STEP_CORE_IDS_V7,
  FIRST_STEP_IDS_V7,
  FIRST_STEP_LINES_V7,
  FIRST_STEP_LINE_WORD_LIMIT_V7,
  FIRST_STEP_RESOURCE_LINES_V7,
  FIRST_STEP_RETIRE_COUNT_V7,
  NEW_FIRST_STEPS_PROGRESS_V7,
  bumpFirstStepV7,
  chooseFirstStepV7,
  firstStepLiveV7,
  firstStepOfCommandV7,
  firstStepResearchLineV7,
  firstStepsActiveV7,
  noteFirstStepCommandV7,
  parseFirstStepsProgressV7,
  retireFirstStepV7,
  serializeFirstStepsProgressV7,
  setFirstStepsEnabledV7,
  type FirstStepIdV7,
  type FirstStepsProgressV7,
} from "../../src/render/first-steps-v7";
import { replaceTileV7 } from "../fixtures/v7-builders";
import { martianUiFieldV7 } from "../fixtures/v7-martian-ui";

/**
 * First steps (bead pulp_wars-2yc.39): the coach's step chooser is a pure
 * function of the viewer's public view, the commands the engine offers it,
 * and the profile's record. The arena: the viewer's capital at (8, 8) with
 * its land x 7-9, y 7-9, a village at (5, 8), the viewer's turn.
 */
const CAPITAL: CoordV7 = { x: 8, y: 8 };
const BESIDE: CoordV7 = { x: 8, y: 7 };
const FRUIT: CoordV7 = { x: 7, y: 7 };
const VILLAGE: CoordV7 = { x: 5, y: 8 };

interface Scene {
  readonly state: GameStateV7;
  readonly view: PlayerViewV7;
  readonly commands: readonly CommandV7[];
}

function scene(
  options: {
    readonly unitAt?: CoordV7 | null;
    readonly researched?: readonly TechnologyIdV7[];
    readonly coins?: number;
    readonly fruit?: boolean;
    readonly moved?: boolean;
    readonly captureEligible?: boolean;
  } = {},
): Scene {
  const at = options.unitAt === undefined ? BESIDE : options.unitAt;
  let state = martianUiFieldV7(
    at === null
      ? []
      : [
          {
            seat: 0,
            role: "FIGHTER",
            at,
            ...(options.captureEligible === true
              ? { captureEligible: true }
              : {}),
            ...(options.moved === true
              ? { activation: { moved: true, movedPathLength: 1 } }
              : {}),
          },
        ],
    {
      factions: ["ORIGINAL", "UNDEAD"],
      techs: { 0: options.researched ?? [], 1: [] },
      coins: options.coins ?? 20,
    },
  );
  if (options.fruit === true)
    state = replaceTileV7(state, FRUIT, { resource: "FRUIT" });
  const view = viewForV7(state, state.humanPlayerId);
  return { state, view, commands: queryPlayerCommandsV7(view) };
}

const done = (
  counts: Partial<Record<FirstStepIdV7, number>>,
): FirstStepsProgressV7 => ({
  ...NEW_FIRST_STEPS_PROGRESS_V7,
  done: { ...NEW_FIRST_STEPS_PROGRESS_V7.done, ...counts },
});
const retired = (...steps: readonly FirstStepIdV7[]): FirstStepsProgressV7 =>
  done(
    Object.fromEntries(
      steps.map((step) => [step, FIRST_STEP_RETIRE_COUNT_V7[step]]),
    ),
  );

function choose(
  data: Scene,
  options: {
    readonly progress?: FirstStepsProgressV7;
    readonly selection?: BoardSelectionV7 | null;
    readonly commands?: readonly CommandV7[];
    readonly interactive?: boolean;
    readonly motion?: "FULL" | "REDUCED";
    readonly outOfMovesUnitId?: number | null;
  } = {},
) {
  return chooseFirstStepV7({
    view: data.view,
    commands: options.commands ?? data.commands,
    selection: options.selection ?? null,
    progress: options.progress ?? NEW_FIRST_STEPS_PROGRESS_V7,
    interactive: options.interactive ?? true,
    motion: options.motion ?? "FULL",
    outOfMovesUnitId: options.outOfMovesUnitId ?? null,
  });
}

const ownUnit = (data: Scene) => {
  const unit = data.view.units.find(
    (candidate) => candidate.ownerId === data.view.viewer.id,
  );
  if (unit === undefined) throw new Error("no own unit");
  return unit;
};
const ownCity = (data: Scene) => {
  const city = data.view.cities.find(
    (candidate) => candidate.ownerId === data.view.viewer.id,
  );
  if (city === undefined) throw new Error("no own city");
  return city;
};

describe("first steps: the step chooser", () => {
  it("train: a hopping marker over a city that can train, and its line", () => {
    const data = scene();
    expect(data.commands.some((command) => command.kind === "TRAIN")).toBe(
      true,
    );
    expect(choose(data)).toEqual({
      step: "TRAIN",
      line: "Tap your city to train a unit",
      marker: { kind: "CITY", at: CAPITAL, motion: "HOP" },
      button: null,
      buttonMotion: "PULSE",
    });
    // With the city selected the line points at its Train list instead.
    expect(
      choose(data, { selection: { kind: "CITY", cityId: ownCity(data).id } }),
    ).toMatchObject({
      step: "TRAIN",
      line: "Pick a unit to train",
      marker: null,
    });
  });

  it("train: no marker while the city cannot train (its centre is taken)", () => {
    const data = scene({ unitAt: CAPITAL });
    expect(data.commands.some((command) => command.kind === "TRAIN")).toBe(
      false,
    );
    expect(choose(data)?.step).toBe("MOVE");
  });

  it("move: a line for a unit that can move, and another once it is selected", () => {
    const data = scene({ unitAt: CAPITAL });
    expect(choose(data)).toMatchObject({
      step: "MOVE",
      line: "Tap a ringed unit to move it",
      marker: null,
      button: null,
    });
    expect(
      choose(data, { selection: { kind: "UNIT", unitId: ownUnit(data).id } }),
    ).toMatchObject({
      step: "MOVE",
      line: "Pick a highlighted tile to move",
      marker: null,
    });
  });

  it("unit done: one line when the player's command left a unit without a Move", () => {
    const data = scene({ moved: true });
    const unit = ownUnit(data);
    expect(
      data.commands.some(
        (command) => command.kind === "MOVE" && command.unitId === unit.id,
      ),
    ).toBe(false);
    expect(choose(data, { outOfMovesUnitId: unit.id })).toMatchObject({
      step: "UNIT_DONE",
      line: "No bright ring: this unit has moved",
      marker: null,
      button: null,
    });
    // It leads every other step while it is up, and is gone without it.
    expect(choose(data)?.step).toBe("TRAIN");
    // A unit the viewer no longer has says nothing.
    expect(choose(data, { outOfMovesUnitId: 999_999 })?.step).toBe("TRAIN");
  });

  it("research: the Tech button pulses when a technology is affordable", () => {
    const data = scene({ unitAt: null });
    const progress = retired("TRAIN");
    expect(choose(data, { progress })).toEqual({
      step: "RESEARCH",
      line: "Your first technology is free",
      marker: null,
      button: "TECH",
      buttonMotion: "PULSE",
    });
    const second = scene({ unitAt: null, researched: ["GATHERING"] });
    expect(choose(second, { progress })).toMatchObject({
      step: "RESEARCH",
      line: "You can afford a new technology",
      button: "TECH",
    });
    // No Coins for the next one: nothing to point at.
    const broke = scene({ unitAt: null, researched: ["GATHERING"], coins: 0 });
    expect(broke.commands.some((command) => command.kind === "RESEARCH")).toBe(
      false,
    );
    expect(choose(broke, { progress })?.step).not.toBe("RESEARCH");
  });

  it("resource: the line sends the player to Tech while the technology is missing", () => {
    const data = scene({ unitAt: null, fruit: true });
    expect(choose(data, { progress: retired("TRAIN") })).toEqual({
      step: "RESEARCH",
      line: "Research Gathering to harvest your fruit",
      marker: null,
      button: "TECH",
      buttonMotion: "PULSE",
    });
  });

  it("resource: a hopping marker over a tile that can be harvested now", () => {
    const data = scene({
      unitAt: null,
      fruit: true,
      researched: ["GATHERING"],
    });
    const progress = retired("TRAIN", "RESEARCH");
    expect(choose(data, { progress })).toEqual({
      step: "RESOURCE",
      line: "Tap the fruit to harvest it",
      marker: { kind: "TILE", at: FRUIT, motion: "HOP" },
      button: null,
      buttonMotion: "PULSE",
    });
    expect(
      choose(data, { progress, selection: { kind: "TILE", at: FRUIT } }),
    ).toMatchObject({
      step: "RESOURCE",
      line: "Press the action below to use it",
      marker: null,
    });
    // Another tile selected: the marker still points at the fruit.
    expect(
      choose(data, { progress, selection: { kind: "TILE", at: BESIDE } })
        ?.marker,
    ).toEqual({ kind: "TILE", at: FRUIT, motion: "HOP" });
  });

  it("end turn: End turn is emphasised only when nothing useful is left", () => {
    const data = scene({ unitAt: null, coins: 0, researched: ["GATHERING"] });
    expect(data.commands.map((command) => command.kind)).toEqual(["END_TURN"]);
    expect(choose(data)).toEqual({
      step: "END_TURN",
      line: "All done: end your turn",
      marker: null,
      button: "END_TURN",
      buttonMotion: "PULSE",
    });
    // A unit that can still move is something left to do.
    const busy = scene({ unitAt: BESIDE, coins: 0, researched: ["GATHERING"] });
    expect(choose(busy, { progress: retired("MOVE") })).toBeNull();
  });

  it("capture: a unit that can capture leads every other step", () => {
    const data = scene({ unitAt: VILLAGE, captureEligible: true });
    const unit = ownUnit(data);
    expect(
      data.commands.some(
        (command) => command.kind === "CAPTURE" && command.unitId === unit.id,
      ),
    ).toBe(true);
    expect(choose(data)).toEqual({
      step: "CAPTURE",
      line: "Tap this unit to capture here",
      marker: { kind: "UNIT", at: VILLAGE, motion: "HOP" },
      button: null,
      buttonMotion: "PULSE",
    });
    expect(
      choose(data, { selection: { kind: "UNIT", unitId: unit.id } }),
    ).toMatchObject({
      step: "CAPTURE",
      line: "Press Capture to take this place",
      marker: null,
    });
  });

  it("orders the steps: capture, train, move, research, resource, end turn", () => {
    expect(FIRST_STEP_IDS_V7).toEqual([
      "CAPTURE",
      "TRAIN",
      "MOVE",
      "UNIT_DONE",
      "RESEARCH",
      "RESOURCE",
      "END_TURN",
    ]);
    // Everything applies at once here; each retirement uncovers the next.
    const data = scene({
      unitAt: VILLAGE,
      captureEligible: true,
      fruit: true,
      researched: ["GATHERING"],
    });
    const order: FirstStepIdV7[] = [];
    let progress = NEW_FIRST_STEPS_PROGRESS_V7;
    for (let turn = 0; turn < 10; turn += 1) {
      const cue = choose(data, { progress });
      if (cue === null) break;
      order.push(cue.step);
      progress = retireFirstStepV7(progress, cue.step);
    }
    expect(order).toEqual(["CAPTURE", "TRAIN", "MOVE", "RESEARCH", "RESOURCE"]);
    // With every core step but End turn learnt, End turn waits for a turn
    // with nothing left to do.
    expect(firstStepLiveV7(progress, "END_TURN")).toBe(true);
    const idle = scene({ unitAt: null, coins: 0, researched: ["GATHERING"] });
    expect(choose(idle, { progress })?.step).toBe("END_TURN");
  });

  it("shows one step at a time: one line, and one marker or one button", () => {
    for (const data of [
      scene(),
      scene({ unitAt: CAPITAL }),
      scene({ unitAt: null, fruit: true }),
      scene({ unitAt: VILLAGE, captureEligible: true }),
    ]) {
      const cue = choose(data);
      expect(cue).not.toBeNull();
      if (cue === null) continue;
      expect(cue.marker !== null && cue.button !== null).toBe(false);
      expect(cue.line.split(/\s+/).length).toBeLessThanOrEqual(
        FIRST_STEP_LINE_WORD_LIMIT_V7,
      );
    }
  });

  it("retires a step after the player has done it a couple of times", () => {
    const data = scene();
    expect(FIRST_STEP_RETIRE_COUNT_V7).toEqual({
      CAPTURE: 1,
      TRAIN: 2,
      MOVE: 2,
      UNIT_DONE: 2,
      RESEARCH: 2,
      RESOURCE: 2,
      END_TURN: 3,
    });
    expect(choose(data, { progress: done({ TRAIN: 1 }) })?.step).toBe("TRAIN");
    expect(choose(data, { progress: done({ TRAIN: 2 }) })?.step).toBe("MOVE");
    expect(choose(data, { progress: done({ TRAIN: 2, MOVE: 2 }) })?.step).toBe(
      "RESEARCH",
    );
    // A selected city's Train line retires with the step too.
    expect(
      choose(data, {
        progress: done({ TRAIN: 2 }),
        selection: { kind: "CITY", cityId: ownCity(data).id },
      })?.step,
    ).toBe("MOVE");
    // Dismissing a line retires its step at once.
    const dismissed = retireFirstStepV7(NEW_FIRST_STEPS_PROGRESS_V7, "TRAIN");
    expect(firstStepLiveV7(dismissed, "TRAIN")).toBe(false);
    expect(choose(data, { progress: dismissed })?.step).toBe("MOVE");
  });

  it("is off for good after competent play or the turn limit", () => {
    const data = scene({ unitAt: VILLAGE, captureEligible: true });
    const competent = retired(...FIRST_STEP_CORE_IDS_V7);
    expect(firstStepsActiveV7(competent)).toBe(false);
    // Even a step never done (capture) no longer shows.
    expect(firstStepLiveV7(competent, "CAPTURE")).toBe(true);
    expect(choose(data, { progress: competent })).toBeNull();
    const late = {
      ...NEW_FIRST_STEPS_PROGRESS_V7,
      turns: FIRST_STEPS_TURN_LIMIT_V7,
    };
    expect(firstStepsActiveV7(late)).toBe(false);
    expect(choose(data, { progress: late })).toBeNull();
    expect(
      choose(data, { progress: { ...late, turns: late.turns - 1 } })?.step,
    ).toBe("CAPTURE");
  });

  it("says nothing with Hints off, and starts over when they are switched on", () => {
    const data = scene();
    const off = setFirstStepsEnabledV7(false);
    expect(off.enabled).toBe(false);
    expect(firstStepsActiveV7(off)).toBe(false);
    expect(choose(data, { progress: off })).toBeNull();
    // Off records nothing.
    expect(noteFirstStepCommandV7(off, { kind: "END_TURN" } as CommandV7)).toBe(
      off,
    );
    expect(setFirstStepsEnabledV7(true)).toEqual(NEW_FIRST_STEPS_PROGRESS_V7);
  });

  it("says nothing while the board takes no input, or in another seat's turn", () => {
    const data = scene();
    expect(choose(data, { interactive: false })).toBeNull();
    const others: PlayerViewV7 = {
      ...data.view,
      activeSeatIndex: (data.view.activeSeatIndex + 1) % 2,
    };
    expect(choose({ ...data, view: others })).toBeNull();
    const choosing: PlayerViewV7 = {
      ...data.view,
      pendingChoices: [
        {
          kind: "CITY_REWARD",
          cityId: ownCity(data).id,
          reachedLevel: 2,
          candidates: ["SURVEY", "STOCKPILE"],
        },
      ] as unknown as PlayerViewV7["pendingChoices"],
    };
    expect(choose({ ...data, view: choosing })).toBeNull();
  });

  it("reduced motion: a still marker and a still ring, never a hop or a pulse", () => {
    expect(choose(scene(), { motion: "REDUCED" })).toEqual({
      step: "TRAIN",
      line: "Tap your city to train a unit",
      marker: { kind: "CITY", at: CAPITAL, motion: "STILL" },
      button: null,
      buttonMotion: "STILL",
    });
    expect(
      choose(scene({ unitAt: null }), {
        motion: "REDUCED",
        progress: retired("TRAIN"),
      }),
    ).toMatchObject({ button: "TECH", buttonMotion: "STILL" });
  });

  it("reads only public commands: a step the engine does not offer is never shown", () => {
    const data = scene({ fruit: true, researched: ["GATHERING"] });
    // Without any offer there is nothing to point at, whatever the view.
    expect(choose(data, { commands: [] })).toBeNull();
    expect(choose(data, { commands: [{ kind: "END_TURN" }] })?.step).toBe(
      "END_TURN",
    );
  });
});

describe("first steps: the record", () => {
  it("counts what the player does", () => {
    const kinds: readonly (readonly [
      CommandV7["kind"],
      FirstStepIdV7 | null,
    ])[] = [
      ["TRAIN", "TRAIN"],
      ["TRAIN_NAVAL", "TRAIN"],
      ["LAY_EGG", "TRAIN"],
      ["HIRE", "TRAIN"],
      ["MOVE", "MOVE"],
      ["RESEARCH", "RESEARCH"],
      ["CAPTURE", "CAPTURE"],
      ["END_TURN", "END_TURN"],
      ["HARVEST_FRUIT", "RESOURCE"],
      ["HUNT_GAME", "RESOURCE"],
      ["HARVEST_FISH", "RESOURCE"],
      ["BUILD_FARM", "RESOURCE"],
      ["BUILD_LUMBER_CAMP", "RESOURCE"],
      ["BUILD_MINE", "RESOURCE"],
      ["ATTACK", null],
      ["WAIT", null],
      ["BUILD_ROAD", null],
    ];
    for (const [kind, step] of kinds)
      expect(firstStepOfCommandV7({ kind } as CommandV7), kind).toBe(step);
    let progress = NEW_FIRST_STEPS_PROGRESS_V7;
    progress = noteFirstStepCommandV7(progress, { kind: "MOVE" } as CommandV7);
    progress = noteFirstStepCommandV7(progress, { kind: "MOVE" } as CommandV7);
    progress = noteFirstStepCommandV7(progress, {
      kind: "END_TURN",
    } as CommandV7);
    expect(progress.done.MOVE).toBe(2);
    expect(progress.done.END_TURN).toBe(1);
    expect(progress.turns).toBe(1);
    expect(firstStepLiveV7(progress, "MOVE")).toBe(false);
    expect(bumpFirstStepV7(progress, "UNIT_DONE").done.UNIT_DONE).toBe(1);
    // The record is never changed in place.
    expect(NEW_FIRST_STEPS_PROGRESS_V7.done.MOVE).toBe(0);
  });

  it("is stored per browser profile and survives a malformed value", () => {
    const progress = bumpFirstStepV7(
      { ...NEW_FIRST_STEPS_PROGRESS_V7, turns: 3 },
      "TRAIN",
    );
    expect(
      parseFirstStepsProgressV7(serializeFirstStepsProgressV7(progress)),
    ).toEqual(progress);
    expect(
      parseFirstStepsProgressV7(
        serializeFirstStepsProgressV7(setFirstStepsEnabledV7(false)),
      ).enabled,
    ).toBe(false);
    for (const stored of [
      null,
      undefined,
      "",
      "{",
      "[]",
      "null",
      '{"version":2,"enabled":false}',
      '{"version":1}',
    ])
      expect(parseFirstStepsProgressV7(stored)).toEqual(
        NEW_FIRST_STEPS_PROGRESS_V7,
      );
    // Unknown and broken counts are dropped; known ones are kept.
    expect(
      parseFirstStepsProgressV7(
        '{"version":1,"enabled":true,"done":{"TRAIN":2,"MOVE":-4,"X":9,"RESEARCH":"a"},"turns":1.5}',
      ),
    ).toEqual({
      enabled: true,
      done: { ...NEW_FIRST_STEPS_PROGRESS_V7.done, TRAIN: 2 },
      turns: 0,
    });
  });
});

describe("first steps: the lines", () => {
  const words = (line: string): number => line.split(/\s+/).length;

  it("keeps every line to eight words, with no coordinates and no numbers", () => {
    const lines = [
      ...Object.values(FIRST_STEP_LINES_V7),
      ...Object.values(FIRST_STEP_RESOURCE_LINES_V7),
    ];
    // Every faction's name for every technology that unlocks a resource.
    for (const faction of FACTION_IDS_V7)
      for (const action of Object.values(BASIC_ECONOMIC_ACTIONS_V7)) {
        if (action.resource === null) continue;
        const line = firstStepResearchLineV7(
          technologyDisplayNameV7(action.technology, faction),
          action.resource,
        );
        expect(line, `${faction} ${action.resource}`).not.toBeNull();
        if (line !== null) lines.push(line);
      }
    expect(lines.length).toBeGreaterThan(40);
    for (const line of lines) {
      expect(words(line), line).toBeLessThanOrEqual(
        FIRST_STEP_LINE_WORD_LIMIT_V7,
      );
      expect(line, line).not.toMatch(/\d/);
      expect(line.endsWith("."), line).toBe(false);
    }
    expect(firstStepResearchLineV7("Gathering", "UNKNOWN_RESOURCE")).toBeNull();
  });
});
