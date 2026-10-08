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
 * First steps (beads pulp_wars-2yc.39 and pulp_wars-eu3r.7): the coach's step chooser is a pure
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
  it("research for a resource: a marker on the resource and the Tech button", () => {
    const data = scene({ fruit: true });
    expect(choose(data)).toEqual({
      step: "RESEARCH",
      line: "Research Gathering to harvest your fruit",
      marker: { kind: "TILE", at: FRUIT, motion: "HOP" },
      button: "TECH",
      buttonMotion: "PULSE",
    });
    // Tapping the resource tile changes nothing: it still needs the
    // technology.
    expect(
      choose(data, { selection: { kind: "TILE", at: FRUIT } }),
    ).toMatchObject({ step: "RESEARCH", button: "TECH" });
  });

  it("research: the Tech button pulses when no resource is in the land", () => {
    const data = scene({ unitAt: null });
    expect(choose(data)).toEqual({
      step: "RESEARCH",
      line: "Your first technology is free",
      marker: null,
      button: "TECH",
      buttonMotion: "PULSE",
    });
    const second = scene({ unitAt: null, researched: ["GATHERING"] });
    expect(choose(second)).toMatchObject({
      step: "RESEARCH",
      line: "You can afford a new technology",
      marker: null,
      button: "TECH",
    });
    // No Coins for the next one: nothing to point at.
    const broke = scene({ unitAt: null, researched: ["GATHERING"], coins: 0 });
    expect(broke.commands.some((command) => command.kind === "RESEARCH")).toBe(
      false,
    );
    expect(choose(broke)?.step).not.toBe("RESEARCH");
  });

  it("resource: with no resource needing a technology, a marker on one usable now", () => {
    const data = scene({
      unitAt: null,
      fruit: true,
      researched: ["GATHERING"],
    });
    expect(choose(data)).toEqual({
      step: "RESOURCE",
      line: "Tap the fruit to harvest it",
      marker: { kind: "TILE", at: FRUIT, motion: "HOP" },
      button: null,
      buttonMotion: "PULSE",
    });
    expect(choose(data, { selection: { kind: "TILE", at: FRUIT } })).toEqual({
      step: "RESOURCE",
      line: "Press the action below to use it",
      marker: null,
      button: null,
      buttonMotion: "PULSE",
    });
    // Another tile selected: the marker still points at the fruit.
    expect(
      choose(data, { selection: { kind: "TILE", at: BESIDE } })?.marker,
    ).toEqual({ kind: "TILE", at: FRUIT, motion: "HOP" });
  });

  it("move: a hopping marker over a unit that can move, and another line once it is selected", () => {
    const data = scene({ unitAt: CAPITAL });
    const progress = retired("RESEARCH");
    expect(choose(data, { progress })).toEqual({
      step: "MOVE",
      line: "Tap this unit to move it",
      marker: { kind: "UNIT", at: CAPITAL, motion: "HOP" },
      button: null,
      buttonMotion: "PULSE",
    });
    expect(
      choose(data, {
        progress,
        selection: { kind: "UNIT", unitId: ownUnit(data).id },
      }),
    ).toMatchObject({
      step: "MOVE",
      line: "Pick a highlighted tile to move",
      marker: null,
    });
  });

  it("train: a hopping marker over the capital, and its line once it is selected", () => {
    const data = scene();
    expect(data.commands.some((command) => command.kind === "TRAIN")).toBe(
      true,
    );
    const progress = retired("RESEARCH", "MOVE");
    expect(choose(data, { progress })).toEqual({
      step: "TRAIN",
      line: "Tap your city to train a unit",
      marker: { kind: "CITY", at: CAPITAL, motion: "HOP" },
      button: null,
      buttonMotion: "PULSE",
    });
    // With the city selected the line points at its Train list instead,
    // whatever step of the sequence is next.
    for (const before of [progress, NEW_FIRST_STEPS_PROGRESS_V7])
      expect(
        choose(data, {
          progress: before,
          selection: { kind: "CITY", cityId: ownCity(data).id },
        }),
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
    expect(choose(data, { progress: retired("RESEARCH") })?.step).toBe("MOVE");
    // The unit can still move, so End turn is not pointed at either.
    expect(choose(data, { progress: retired("RESEARCH", "MOVE") })).toBeNull();
  });

  it("unit done: one line when the player's command left a unit without a Move", () => {
    const data = scene({ moved: true });
    const unit = ownUnit(data);
    expect(
      data.commands.some(
        (command) => command.kind === "MOVE" && command.unitId === unit.id,
      ),
    ).toBe(false);
    const progress = retired("RESEARCH");
    expect(choose(data, { progress, outOfMovesUnitId: unit.id })).toEqual({
      step: "UNIT_DONE",
      line: "No bright ring: this unit has moved",
      marker: null,
      button: null,
      buttonMotion: "PULSE",
    });
    // It leads every other step while it is up, and is gone without it.
    expect(choose(data, { outOfMovesUnitId: unit.id })?.step).toBe("UNIT_DONE");
    expect(choose(data, { progress })?.step).toBe("TRAIN");
    // A unit the viewer no longer has says nothing.
    expect(choose(data, { progress, outOfMovesUnitId: 999_999 })?.step).toBe(
      "TRAIN",
    );
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

  it("capture: a marker over a unit that can capture, after the sequence", () => {
    const data = scene({ unitAt: VILLAGE, captureEligible: true });
    const unit = ownUnit(data);
    expect(
      data.commands.some(
        (command) => command.kind === "CAPTURE" && command.unitId === unit.id,
      ),
    ).toBe(true);
    // A new player is shown the sequence first.
    expect(choose(data)?.step).toBe("RESEARCH");
    expect(
      choose(data, { progress: retired("RESEARCH", "MOVE", "TRAIN") }),
    ).toEqual({
      step: "CAPTURE",
      line: "Tap this unit to capture here",
      marker: { kind: "UNIT", at: VILLAGE, motion: "HOP" },
      button: null,
      buttonMotion: "PULSE",
    });
    // The selected unit's Capture is said at once, at any point.
    expect(
      choose(data, { selection: { kind: "UNIT", unitId: unit.id } }),
    ).toMatchObject({
      step: "CAPTURE",
      line: "Press Capture to take this place",
      marker: null,
    });
  });

  it("orders the steps: resource and research, move, train, then capture and end turn", () => {
    expect(FIRST_STEP_IDS_V7).toEqual([
      "RESEARCH",
      "RESOURCE",
      "MOVE",
      "TRAIN",
      "CAPTURE",
      "UNIT_DONE",
      "END_TURN",
    ]);
    expect(FIRST_STEP_CORE_IDS_V7).toEqual([
      "RESEARCH",
      "RESOURCE",
      "MOVE",
      "TRAIN",
      "END_TURN",
    ]);
    // Everything applies at once here; each retirement uncovers the next.
    const data = scene({
      unitAt: VILLAGE,
      captureEligible: true,
      fruit: true,
    });
    const order: FirstStepIdV7[] = [];
    let progress = NEW_FIRST_STEPS_PROGRESS_V7;
    for (let turn = 0; turn < 10; turn += 1) {
      const cue = choose(data, { progress });
      if (cue === null) break;
      order.push(cue.step);
      progress = retireFirstStepV7(progress, cue.step);
    }
    expect(order).toEqual(["RESEARCH", "MOVE", "TRAIN", "CAPTURE"]);
    // With every step but End turn learnt, End turn waits for a turn with
    // nothing left to do.
    expect(firstStepLiveV7(progress, "END_TURN")).toBe(true);
    const idle = scene({ unitAt: null, coins: 0, researched: ["GATHERING"] });
    expect(choose(idle, { progress })?.step).toBe("END_TURN");
  });

  it("a new player's first turns: research for the resource, then move, then train", () => {
    const data = scene({ fruit: true });
    const steps: (FirstStepIdV7 | undefined)[] = [];
    let progress = NEW_FIRST_STEPS_PROGRESS_V7;
    for (const command of [
      { kind: "RESEARCH", tech: "GATHERING" },
      { kind: "MOVE", unitId: ownUnit(data).id, path: [] },
      { kind: "TRAIN", cityId: ownCity(data).id, role: "WARRIOR" },
    ] as unknown as CommandV7[]) {
      const cue = choose(data, { progress });
      steps.push(cue?.step);
      expect(firstStepOfCommandV7(command)).toBe(cue?.step);
      progress = noteFirstStepCommandV7(progress, command);
    }
    expect(steps).toEqual(["RESEARCH", "MOVE", "TRAIN"]);
    // All three are done once: none of them shows again.
    for (const step of ["RESEARCH", "RESOURCE", "MOVE", "TRAIN"] as const)
      expect(firstStepLiveV7(progress, step), step).toBe(false);
    expect(choose(data, { progress })).toBeNull();
  });

  it("doing a step early, out of order, retires it for good", () => {
    const data = scene({ fruit: true });
    // Train first: the sequence skips it later.
    let progress = noteFirstStepCommandV7(NEW_FIRST_STEPS_PROGRESS_V7, {
      kind: "TRAIN",
    } as CommandV7);
    expect(choose(data, { progress })?.step).toBe("RESEARCH");
    progress = noteFirstStepCommandV7(progress, {
      kind: "RESEARCH",
    } as CommandV7);
    expect(choose(data, { progress })?.step).toBe("MOVE");
    progress = noteFirstStepCommandV7(progress, { kind: "MOVE" } as CommandV7);
    expect(choose(data, { progress })).toBeNull();
    // The city's Train line does not come back when it is selected.
    expect(
      choose(data, {
        progress,
        selection: { kind: "CITY", cityId: ownCity(data).id },
      }),
    ).toBeNull();
    // Using a resource retires the research step too: they are one step.
    const harvested = noteFirstStepCommandV7(NEW_FIRST_STEPS_PROGRESS_V7, {
      kind: "HARVEST_FRUIT",
    } as CommandV7);
    expect(firstStepLiveV7(harvested, "RESEARCH")).toBe(false);
    expect(choose(data, { progress: harvested })?.step).toBe("MOVE");
    const researched = scene({ fruit: true, researched: ["GATHERING"] });
    expect(
      choose(researched, {
        progress: retired("RESEARCH"),
        selection: { kind: "TILE", at: FRUIT },
      })?.step,
    ).toBe("MOVE");
  });

  it("shows one step at a time: one line, one marker, one button at most", () => {
    for (const data of [
      scene(),
      scene({ unitAt: CAPITAL }),
      scene({ unitAt: null, fruit: true }),
      scene({ unitAt: VILLAGE, captureEligible: true }),
    ])
      for (const progress of [
        NEW_FIRST_STEPS_PROGRESS_V7,
        retired("RESEARCH"),
        retired("RESEARCH", "MOVE"),
        retired("RESEARCH", "MOVE", "TRAIN"),
      ]) {
        const cue = choose(data, { progress });
        if (cue === null) continue;
        // Only the research cue for a resource has both.
        if (cue.marker !== null && cue.button !== null) {
          expect(cue.step).toBe("RESEARCH");
          expect(cue.marker.kind).toBe("TILE");
        }
        expect(cue.line.split(/\s+/).length).toBeLessThanOrEqual(
          FIRST_STEP_LINE_WORD_LIMIT_V7,
        );
      }
  });

  it("retires a step of the sequence after the player has done it once", () => {
    const data = scene();
    expect(FIRST_STEP_RETIRE_COUNT_V7).toEqual({
      CAPTURE: 1,
      TRAIN: 1,
      MOVE: 1,
      UNIT_DONE: 2,
      RESEARCH: 1,
      RESOURCE: 1,
      END_TURN: 3,
    });
    expect(choose(data)?.step).toBe("RESEARCH");
    expect(choose(data, { progress: done({ RESEARCH: 1 }) })?.step).toBe(
      "MOVE",
    );
    expect(
      choose(data, { progress: done({ RESEARCH: 1, MOVE: 1 }) })?.step,
    ).toBe("TRAIN");
    // Dismissing a line retires its step at once.
    const dismissed = retireFirstStepV7(
      NEW_FIRST_STEPS_PROGRESS_V7,
      "RESEARCH",
    );
    expect(firstStepLiveV7(dismissed, "RESEARCH")).toBe(false);
    expect(firstStepLiveV7(dismissed, "RESOURCE")).toBe(false);
    expect(choose(data, { progress: dismissed })?.step).toBe("MOVE");
    // End turn still takes three turns.
    expect(firstStepLiveV7(done({ END_TURN: 2 }), "END_TURN")).toBe(true);
    expect(firstStepLiveV7(done({ END_TURN: 3 }), "END_TURN")).toBe(false);
  });

  it("is off for good after competent play or the turn limit", () => {
    const data = scene({ unitAt: VILLAGE, captureEligible: true });
    const competent = retired(...FIRST_STEP_CORE_IDS_V7);
    expect(firstStepsActiveV7(competent)).toBe(false);
    // The resource step is one step: either half retires it.
    expect(
      firstStepsActiveV7(retired("RESEARCH", "MOVE", "TRAIN", "END_TURN")),
    ).toBe(false);
    expect(
      firstStepsActiveV7(retired("RESOURCE", "MOVE", "TRAIN", "END_TURN")),
    ).toBe(false);
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
    ).toBe("RESEARCH");
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
    expect(choose(scene({ fruit: true }), { motion: "REDUCED" })).toEqual({
      step: "RESEARCH",
      line: "Research Gathering to harvest your fruit",
      marker: { kind: "TILE", at: FRUIT, motion: "STILL" },
      button: "TECH",
      buttonMotion: "STILL",
    });
    expect(
      choose(scene(), {
        motion: "REDUCED",
        progress: retired("RESEARCH", "MOVE"),
      }),
    ).toMatchObject({
      marker: { kind: "CITY", at: CAPITAL, motion: "STILL" },
      buttonMotion: "STILL",
    });
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
