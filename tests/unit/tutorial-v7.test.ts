import { describe, expect, it } from "vitest";
import {
  chooseNormalCommandV7,
  chooseNormalTurnCommandV7,
} from "../../src/ai/v7";
import {
  createPlayableGameV7,
  effectiveRoleRuleV7,
  missionByIdV7,
  queryPlayerCommandsV7,
  type CommandV7,
  type CoordV7,
  type GameStateV7,
} from "../../src/engine/index";
import {
  NEW_TUTORIAL_PROGRESS_V7,
  TUTORIAL_FAREWELL_V7,
  TUTORIAL_MISSION_ID_V7,
  TUTORIAL_NUDGES_V7,
  TUTORIAL_PLACES_V7,
  TUTORIAL_REFUSED_V7,
  TUTORIAL_STEPS_V7,
  TUTORIAL_STORAGE_KEY_V7,
  acknowledgeTutorialV7,
  advanceTutorialV7,
  isTutorialMatchV7,
  noteTutorialUnitHelpV7,
  parseTutorialProgressV7,
  reconcileTutorialV7,
  serializeTutorialProgressV7,
  skipTutorialV7,
  startTutorialV7,
  tutorialAcceptsV7,
  tutorialActiveV7,
  tutorialCommandsV7,
  tutorialCueV7,
  tutorialExpectedCommandV7,
  tutorialNudgeV7,
  type TutorialProgressV7,
  type TutorialStepIdV7,
} from "../../src/render/tutorial-v7";
import { browserSetupV7 } from "../fixtures/v7-builders";
import {
  apply,
  human,
  idleTurn,
  playTutorialV7,
  tileAt,
  tutorialState,
  unitAt,
  unitRewardV7,
  type TutorialRewardChoiceV7,
} from "../fixtures/v7-tutorial-play";

/**
 * The tutorial (beads pulp_wars-0yxy and pulp_wars-2yc.115): the script as
 * a pure state machine (the step's commands only, every other command
 * refused, advancing, skipping, steps of a group in any order), and the
 * whole eight-turn script applied to the real engine from the tutorial
 * board's first state. The opponent ends its turns without acting; one
 * test lets the Normal AI play its single first turn. The play-through
 * against the Normal AI over all eight turns is tutorial-v7.sim.test.ts.
 */
const COORDINATE = /\(\s*\d+\s*,\s*\d+\s*\)|\b\d+\s*,\s*\d+\b/;
const P = TUTORIAL_PLACES_V7;
const indexOf = (id: TutorialStepIdV7): number =>
  TUTORIAL_STEPS_V7.findIndex((step) => step.id === id);
const at = (id: TutorialStepIdV7): TutorialProgressV7 => ({
  completed: false,
  step: indexOf(id),
});

/** One whole turn of the active AI seat, chosen by the Normal AI. */
function aiTurn(start: GameStateV7): GameStateV7 {
  let state = start;
  const actor = state.turnOrder[state.activeSeatIndex];
  if (actor === undefined || actor === state.humanPlayerId)
    throw new Error("not an AI turn");
  for (let accepted = 0; accepted < 64; accepted += 1) {
    const view = human(state, actor);
    const command = chooseNormalTurnCommandV7(
      view,
      accepted,
      64,
      chooseNormalCommandV7(view),
    );
    if (command === null) throw new Error("the AI chose nothing");
    state = apply(state, actor, command);
    if (command.kind === "END_TURN") return state;
  }
  throw new Error("the AI turn did not end");
}

describe("the tutorial board", () => {
  it("is the registered TUTORIAL_1 mission: Humans against Goblins, in no chapter", () => {
    const mission = missionByIdV7(TUTORIAL_MISSION_ID_V7);
    expect(mission).toMatchObject({ revision: 4, hidden: true, size: 11 });
    expect(mission?.seats.map((seat) => seat.faction)).toEqual([
      "ORIGINAL",
      "GOBLIN",
    ]);
    const state = tutorialState();
    expect(isTutorialMatchV7(human(state))).toBe(true);
    expect(state.setup.mapType).toBe("MISSION");
  });

  it("has every place of the script where the script says", () => {
    const state = tutorialState();
    const view = human(state);
    const capital = view.cities.find((city) => city.ownerId === view.viewer.id);
    expect(capital?.at).toEqual(P.capital);
    // Level 2: room for a third unit.
    expect(capital?.level).toBe(2);
    expect(tileAt(view, P.fruit)).toMatchObject({
      resource: "FRUIT",
      territoryOwnerId: view.viewer.id,
      explored: true,
    });
    expect(tileAt(view, P.fertile)).toMatchObject({
      resource: "FERTILE_GROUND",
      territoryOwnerId: view.viewer.id,
    });
    expect(tileAt(view, P.forest)).toMatchObject({
      terrain: "FOREST",
      resource: null,
      territoryOwnerId: view.viewer.id,
    });
    for (const place of [P.windmill, P.workshop, P.roadNear])
      expect(tileAt(view, place)).toMatchObject({
        terrain: "GRASS",
        resource: null,
        territoryOwnerId: view.viewer.id,
      });
    // The Ore mountain beside the village hides its Ore until Crafting; the
    // bare mountain stands beside the lone Goblin's tile (revision 4).
    expect(tileAt(view, P.ore)).toMatchObject({
      terrain: "MOUNTAIN",
      resource: null,
      explored: true,
    });
    expect(tileAt(view, P.peak)).toMatchObject({ terrain: "MOUNTAIN" });
    expect(tileAt(view, P.village)).toMatchObject({ explored: true });
    // The Knight's field is known from the start.
    for (const place of [P.knight, P.charge, P.goblin1, P.goblin3])
      expect(tileAt(view, place)).toMatchObject({
        terrain: "GRASS",
        explored: true,
      });
    expect(unitAt(view, P.walker)?.ownerId).toBe(view.viewer.id);
    expect(unitAt(view, P.attacker)?.ownerId).toBe(view.viewer.id);
    const enemy = unitAt(view, P.enemy);
    expect(enemy).toBeDefined();
    expect(enemy?.ownerId).not.toBe(view.viewer.id);
    // Nothing stands on the city center, so a unit can be trained.
    expect(unitAt(view, P.capital)).toBeUndefined();
  });

  it("starts like a campaign: the lessons' technologies known, Crafting and Engineering not", () => {
    const view = human(tutorialState());
    expect([...view.viewer.researchedTechs].sort()).toEqual(
      [
        "ADMINISTRATION",
        "CHIVALRY",
        "FARMING",
        "FORESTRY",
        "GATHERING",
        "HUNTING",
        "MILLING",
        "RAIDING",
        "ROADS",
        "SCOUTING",
      ].sort(),
    );
    expect(view.viewer.researchedTechs).not.toContain("DRILL");
    expect(view.viewer.researchedTechs).not.toContain("ENGINEERING");
    // Every lesson's Coins over six turns, a little to spare, no more.
    expect(view.viewer.coins).toBe(23);
  });
});

describe("the tutorial script as a state machine", () => {
  it("teaches its lessons over eight turns, one or two at a time", () => {
    expect(TUTORIAL_STEPS_V7.map((step) => step.id)).toEqual([
      "HARVEST",
      "RESOURCES",
      "MOVE",
      "TRAIN",
      "DETAILS",
      "DETAILS_INFO",
      "ATTACK",
      "END_TURN_1",
      "CAPTURE",
      "FARM",
      "END_TURN_2",
      "WINDMILL",
      "WINDMILL_INFO",
      "LUMBER_CAMP",
      "END_TURN_3",
      "CRAFTING",
      "ORE",
      "WORKSHOP",
      "END_TURN_4",
      "ENGINEERING",
      "CLIMB",
      "MINE",
      "END_TURN_5",
      "ROAD_NEAR",
      "ROAD_FAR",
      "LINK",
      "END_TURN_6",
      "REINFORCED",
      "ROAD_MOVE",
      "END_TURN_7",
      "RALLY",
      "INSPIRED",
      "CHARGE",
      "OVERRUN_1",
      "OVERRUN_2",
      "OVERRUN_3",
    ]);
    // Seven End turns: eight turns.
    expect(
      TUTORIAL_STEPS_V7.filter((step) => step.expects?.kind === "END_TURN"),
    ).toHaveLength(7);
    // At most three things to do in a turn besides ending it (the Knight's
    // turn: the Rally, the ride and its three attacks are one lesson).
    const perTurn: string[][] = [[]];
    for (const step of TUTORIAL_STEPS_V7) {
      if (step.expects?.kind === "END_TURN") perTurn.push([]);
      else if (step.expects !== null)
        (perTurn[perTurn.length - 1] as string[]).push(step.id);
    }
    expect(perTurn.map((turn) => turn.length)).toEqual([
      5, 2, 2, 2, 3, 2, 1, 5,
    ]);
  });

  it("keeps every line short, in plain words, without a coordinate", () => {
    const lines = [
      ...TUTORIAL_STEPS_V7.flatMap((step) => [
        step.line,
        ...(step.selectedLine === undefined ? [] : [step.selectedLine]),
        ...(step.techLine === undefined ? [] : [step.techLine]),
      ]),
      TUTORIAL_FAREWELL_V7,
    ];
    for (const line of lines) {
      expect(line).not.toMatch(COORDINATE);
      // One or two sentences.
      expect(line.split(/[.!?](?:\s|$)/).filter(Boolean).length).toBeLessThan(
        3,
      );
      expect(line.split(/\s+/).length, line).toBeLessThanOrEqual(26);
    }
    // The farewell points at Help.
    expect(TUTORIAL_FAREWELL_V7).toMatch(/Help/);
  });

  it("is off until it is started, and only on its own board", () => {
    const view = human(tutorialState());
    const offered = queryPlayerCommandsV7(view);
    expect(tutorialActiveV7(NEW_TUTORIAL_PROGRESS_V7, view)).toBe(false);
    expect(tutorialCommandsV7(NEW_TUTORIAL_PROGRESS_V7, view, offered)).toBe(
      offered,
    );
    const started = startTutorialV7(NEW_TUTORIAL_PROGRESS_V7);
    expect(started).toEqual({ completed: false, step: 0 });
    expect(tutorialActiveV7(started, view)).toBe(true);
    // Another match: a running record forces nothing there.
    const created = createPlayableGameV7(browserSetupV7());
    if (!created.ok) throw new Error(created.error.code);
    const other = human(created.state);
    const otherOffered = queryPlayerCommandsV7(other);
    expect(isTutorialMatchV7(other)).toBe(false);
    expect(tutorialActiveV7(started, other)).toBe(false);
    expect(tutorialCommandsV7(started, other, otherOffered)).toBe(otherOffered);
    const first = otherOffered[0];
    if (first === undefined) throw new Error("fixture");
    expect(tutorialAcceptsV7(started, other, first)).toBe(true);
    expect(advanceTutorialV7(started, other, first)).toBe(started);
  });

  it("lets exactly one command through at the first step and refuses the rest", () => {
    const view = human(tutorialState());
    const offered = queryPlayerCommandsV7(view);
    const progress = startTutorialV7(NEW_TUTORIAL_PROGRESS_V7);
    const allowed = tutorialCommandsV7(progress, view, offered);
    expect(allowed).toEqual([{ kind: "HARVEST_FRUIT", at: P.fruit }]);
    expect(offered.length).toBeGreaterThan(5);
    const refused = offered.filter(
      (command) => !tutorialAcceptsV7(progress, view, command),
    );
    expect(refused).toHaveLength(offered.length - 1);
    // End turn, a move, a train, research and the other fruit are refused.
    expect(refused.map((command) => command.kind)).toEqual(
      expect.arrayContaining([
        "END_TURN",
        "MOVE",
        "TRAIN",
        "RESEARCH",
        "HARVEST_FRUIT",
      ]),
    );
    // A refused command does not advance the step.
    const endTurn: CommandV7 = { kind: "END_TURN" };
    expect(advanceTutorialV7(progress, view, endTurn)).toBe(progress);
    expect(
      advanceTutorialV7(progress, view, { kind: "RESEARCH", tech: "DRILL" }),
    ).toBe(progress);
    expect(
      advanceTutorialV7(progress, view, {
        kind: "HARVEST_FRUIT",
        at: P.fruit,
      }),
    ).toEqual({ completed: false, step: 1 });
  });

  it("an explanation step lets no command through and moves on with Next", () => {
    const view = human(tutorialState());
    const offered = queryPlayerCommandsV7(view);
    const progress = at("RESOURCES");
    expect(tutorialCommandsV7(progress, view, offered)).toEqual([]);
    for (const command of offered)
      expect(tutorialAcceptsV7(progress, view, command)).toBe(false);
    // It is not given up on: there is nothing the engine has to offer.
    expect(reconcileTutorialV7(progress, view, offered)).toBe(progress);
    expect(acknowledgeTutorialV7(progress)).toEqual(at("MOVE"));
    // Next does nothing on a step that wants a command.
    const first = startTutorialV7(NEW_TUTORIAL_PROGRESS_V7);
    expect(acknowledgeTutorialV7(first)).toBe(first);
  });

  it("the card step lets no command through and moves on when that unit's card opens", () => {
    const view = human(tutorialState());
    const offered = queryPlayerCommandsV7(view);
    const progress = at("DETAILS");
    expect(tutorialCommandsV7(progress, view, offered)).toEqual([]);
    expect(reconcileTutorialV7(progress, view, offered)).toBe(progress);
    // Next does not pass it; another unit's card does not either.
    expect(acknowledgeTutorialV7(progress)).toBe(progress);
    const walker = unitAt(view, P.walker);
    const attacker = unitAt(view, P.attacker);
    if (walker === undefined || attacker === undefined)
      throw new Error("fixture");
    expect(noteTutorialUnitHelpV7(progress, view, walker.id)).toBe(progress);
    expect(noteTutorialUnitHelpV7(progress, view, attacker.id)).toEqual(
      at("DETAILS_INFO"),
    );
    // A card opened at any other step changes nothing.
    const move = at("MOVE");
    expect(noteTutorialUnitHelpV7(move, view, walker.id)).toBe(move);
  });

  it("Skip turns the rest into an ordinary game and is remembered", () => {
    const view = human(tutorialState());
    const offered = queryPlayerCommandsV7(view);
    const skipped = skipTutorialV7(startTutorialV7(NEW_TUTORIAL_PROGRESS_V7));
    expect(skipped).toEqual({ completed: true, step: null });
    expect(tutorialActiveV7(skipped, view)).toBe(false);
    expect(tutorialCommandsV7(skipped, view, offered)).toBe(offered);
    for (const command of offered)
      expect(tutorialAcceptsV7(skipped, view, command)).toBe(true);
    expect(skipTutorialV7(skipped)).toBe(skipped);
    // Starting again keeps the memory that it was seen.
    expect(startTutorialV7(skipped)).toEqual({ completed: true, step: 0 });
  });

  it("gives up rather than trap the player when the step cannot be done", () => {
    const view = human(tutorialState());
    const offered = queryPlayerCommandsV7(view);
    // The capture step on turn 1: no unit stands on the village yet.
    const stuck = at("CAPTURE");
    expect(tutorialExpectedCommandV7(stuck, view, offered)).toBeNull();
    // The Farm of its group is offered: the turn can still be played.
    expect(reconcileTutorialV7(stuck, view, offered)).toBe(stuck);
    // A step with nothing of its group offered is given up.
    const mine = at("MINE");
    expect(reconcileTutorialV7(mine, view, offered)).toEqual({
      completed: true,
      step: null,
    });
    // Not during another seat's turn, when nothing is offered.
    expect(reconcileTutorialV7(mine, view, [])).toBe(mine);
    // A card step whose unit is gone is given up as well.
    const card = at("DETAILS");
    const gone = { ...view, units: view.units.filter((u) => u.hp <= 0) };
    expect(reconcileTutorialV7(card, gone, offered)).toEqual({
      completed: true,
      step: null,
    });
  });

  it("stores its record and reads anything malformed as a new profile", () => {
    expect(TUTORIAL_STORAGE_KEY_V7).toBe("pulpWars.ruleset7.tutorial.v1");
    for (const progress of [
      NEW_TUTORIAL_PROGRESS_V7,
      { completed: false, step: 3 },
      { completed: true, step: null },
      { completed: false, step: 11, ahead: [13] },
    ])
      expect(
        parseTutorialProgressV7(serializeTutorialProgressV7(progress)),
      ).toEqual(progress);
    for (const stored of [
      null,
      undefined,
      "",
      "{",
      "7",
      '{"version":2,"completed":true,"step":null}',
      '{"version":1,"completed":"yes"}',
    ])
      expect(parseTutorialProgressV7(stored)).toEqual(NEW_TUTORIAL_PROGRESS_V7);
    // A step outside the script is no running tutorial.
    expect(
      parseTutorialProgressV7('{"version":1,"completed":false,"step":99}'),
    ).toEqual(NEW_TUTORIAL_PROGRESS_V7);
    // Steps done early must lie after the step and inside the script.
    expect(
      parseTutorialProgressV7(
        '{"version":1,"completed":false,"step":11,"ahead":[13,2,"x",99,13]}',
      ),
    ).toEqual({ completed: false, step: 11, ahead: [13] });
  });
});

describe("the tutorial cue", () => {
  const cueAt = (
    id: TutorialStepIdV7,
    state: GameStateV7,
    selection: Parameters<typeof tutorialCueV7>[0]["selection"] = null,
    extra: Partial<Parameters<typeof tutorialCueV7>[0]> = {},
  ) =>
    tutorialCueV7({
      progress: at(id),
      view: human(state),
      selection,
      ready: true,
      technologyOpen: false,
      motion: "FULL",
      ...extra,
    });
  const unitId = (state: GameStateV7, place: CoordV7) => {
    const unit = unitAt(human(state), place);
    if (unit === undefined) throw new Error("fixture");
    return unit.id;
  };

  it("points at the Tech button on a research step, then at its technology", () => {
    const state = tutorialState();
    expect(cueAt("CRAFTING", state)).toMatchObject({
      step: "CRAFTING",
      number: 16,
      count: 36,
      button: "TECH",
      buttonMotion: "PULSE",
      marker: null,
      next: false,
      technology: "DRILL",
    });
    expect(
      cueAt("CRAFTING", state, null, { technologyOpen: true }),
    ).toMatchObject({
      line: "Pick Crafting, then Research.",
      target: "TECHNOLOGY",
    });
    // Crafting chosen: its Research button is what pulses now.
    expect(
      cueAt("CRAFTING", state, null, {
        technologyOpen: true,
        selectedTechnology: "DRILL",
      })?.target,
    ).toBe("RESEARCH");
    expect(cueAt("ENGINEERING", state)?.technology).toBe("ENGINEERING");
    expect(
      cueAt("CRAFTING", state, null, { motion: "REDUCED" })?.buttonMotion,
    ).toBe("STILL");
  });

  it("marks what to tap, then the target once it is selected", () => {
    const state = tutorialState();
    expect(cueAt("HARVEST", state)?.marker).toEqual({
      kind: "TILE",
      at: P.fruit,
      motion: "HOP",
      style: "TAP",
    });
    const picked = cueAt("HARVEST", state, { kind: "TILE", at: P.fruit });
    expect(picked?.marker).toBeNull();
    expect(picked?.line).toBe("Press Harvest: it costs 2 Coins.");
    expect(cueAt("FARM", state)?.marker).toMatchObject({
      kind: "TILE",
      at: P.fertile,
    });
    expect(cueAt("MOVE", state)?.marker).toEqual({
      kind: "UNIT",
      at: P.walker,
      motion: "HOP",
      style: "TAP",
    });
    expect(
      cueAt("MOVE", state, { kind: "UNIT", unitId: unitId(state, P.walker) }),
    ).toMatchObject({
      line: "Tap the village to walk there.",
      marker: { kind: "TILE", at: P.village },
    });
    // The other Fighter selected: still pointed at the one to move.
    expect(
      cueAt("MOVE", state, { kind: "UNIT", unitId: unitId(state, P.attacker) })
        ?.marker,
    ).toMatchObject({ kind: "UNIT", at: P.walker });
    expect(cueAt("TRAIN", state)?.marker).toMatchObject({
      kind: "CITY",
      at: P.capital,
    });
    expect(
      cueAt("ATTACK", state, {
        kind: "UNIT",
        unitId: unitId(state, P.attacker),
      }),
    ).toMatchObject({
      line: "Tap the Goblin to attack it.",
      marker: { kind: "UNIT", at: P.enemy },
    });
    expect(cueAt("END_TURN_1", state)).toMatchObject({
      button: "END_TURN",
      marker: null,
    });
    expect(
      cueAt("MOVE", state, null, { motion: "REDUCED" })?.marker?.motion,
    ).toBe("STILL");
  });

  it("the card step marks the unit, then rings its ?", () => {
    const state = tutorialState();
    expect(cueAt("DETAILS", state)).toMatchObject({
      marker: { kind: "UNIT", at: P.attacker },
      button: null,
    });
    expect(
      cueAt("DETAILS", state, {
        kind: "UNIT",
        unitId: unitId(state, P.attacker),
      }),
    ).toMatchObject({
      marker: null,
      button: "UNIT_HELP",
      line: "Press the ? beside its name.",
    });
  });

  it("an explanation has a Next and its own marker; nothing shows while the player cannot act", () => {
    const state = tutorialState();
    expect(cueAt("RESOURCES", state)).toMatchObject({
      next: true,
      marker: null,
      button: null,
      number: 2,
    });
    expect(cueAt("ORE", state)).toMatchObject({
      next: true,
      // A read step's marker is a still look-here ring (2yc.119).
      marker: { kind: "TILE", at: P.ore, motion: "STILL", style: "LOOK" },
    });
    expect(cueAt("LINK", state)?.marker).toMatchObject({
      kind: "CITY",
      at: P.village,
    });
    // The Knight's turn frames its whole field on a phone.
    expect(cueAt("RALLY", state)?.marker).toEqual({
      kind: "UNIT",
      at: P.captain,
      motion: "HOP",
      style: "TAP",
      frame: [P.knight, P.goblin1, P.goblin2, P.goblin3],
    });
    expect(cueAt("MOVE", state, null, { ready: false })).toBeNull();
    expect(
      tutorialCueV7({
        progress: NEW_TUTORIAL_PROGRESS_V7,
        view: human(state),
        selection: null,
        ready: true,
        technologyOpen: false,
        motion: "FULL",
      }),
    ).toBeNull();
  });
});

describe("the tutorial's cue language (bead pulp_wars-2yc.119)", () => {
  const play = playTutorialV7({ opponent: idleTurn });
  const view = (id: TutorialStepIdV7) => {
    const found = play.views[id];
    if (found === undefined) throw new Error(`no view at ${id}`);
    return found;
  };
  const cue = (
    id: TutorialStepIdV7,
    extra: Partial<Parameters<typeof tutorialCueV7>[0]> = {},
  ) => {
    const at = view(id);
    const found = tutorialCueV7({
      progress: { completed: false, step: indexOf(id) },
      view: at,
      selection: null,
      ready: true,
      technologyOpen: false,
      offered: queryPlayerCommandsV7(at),
      motion: "FULL",
      ...extra,
    });
    if (found === null) throw new Error(`no cue at ${id}`);
    return found;
  };
  /** How many things pulse: a tap marker, a ringed button, a dock button. */
  const pulsing = (found: ReturnType<typeof cue>): number =>
    (found.marker?.style === "TAP" ? 1 : 0) +
    (found.button === null ? 0 : 1) +
    (found.target === "DOCK" ? 1 : 0) +
    (found.target === "TECHNOLOGY" || found.target === "RESEARCH" ? 1 : 0) +
    (found.target === "NEXT" ? 1 : 0);
  /** The selection that is the first half of a two-step action. */
  const picked = (
    id: TutorialStepIdV7,
  ): Parameters<typeof tutorialCueV7>[0]["selection"] => {
    const expects = TUTORIAL_STEPS_V7[indexOf(id)]?.expects ?? null;
    const at = view(id);
    const unit = (place: CoordV7) => {
      const found = unitAt(at, place);
      if (found === undefined) throw new Error(`${id}: no unit`);
      return { kind: "UNIT" as const, unitId: found.id };
    };
    switch (expects?.kind) {
      case "TILE":
        return { kind: "TILE", at: expects.at };
      case "MOVE":
      case "ATTACK":
        return unit(expects.from);
      case "RALLY":
      case "CAPTURE":
      case "UNIT_HELP":
        return unit(expects.at);
      case "TRAIN": {
        const city = at.cities.find(
          (item) =>
            item.at.x === expects.city.x && item.at.y === expects.city.y,
        );
        if (city === undefined) throw new Error(`${id}: no city`);
        return { kind: "CITY", cityId: city.id };
      }
      default:
        return null;
    }
  };

  it("a read step pulses Next and only Next; its marker is a still look-here ring", () => {
    const reads = TUTORIAL_STEPS_V7.filter((step) => step.expects === null);
    expect(reads.map((step) => step.id)).toEqual([
      "RESOURCES",
      "DETAILS_INFO",
      "WINDMILL_INFO",
      "ORE",
      "LINK",
      "REINFORCED",
      "INSPIRED",
    ]);
    for (const step of reads) {
      const found = cue(step.id);
      expect(found, step.id).toMatchObject({
        kind: "READ",
        target: "NEXT",
        next: true,
        button: null,
        command: null,
        nudge: TUTORIAL_NUDGES_V7.NEXT,
      });
      expect(pulsing(found), step.id).toBe(1);
      // Never the arrow on a read step: a still look-here ring, or nothing.
      if (found.marker !== null)
        expect(found.marker, step.id).toMatchObject({
          style: "LOOK",
          motion: "STILL",
        });
      // Its line asks for no tap.
      expect(found.line, step.id).not.toMatch(/\b(tap|press)\b/i);
    }
  });

  it("an action step pulses exactly its target, then the second target once the first is picked", () => {
    const actions = TUTORIAL_STEPS_V7.filter((step) => step.expects !== null);
    expect(actions).toHaveLength(29);
    for (const step of actions) {
      const found = cue(step.id);
      expect(found.kind, step.id).toBe("ACTION");
      expect(found.next, step.id).toBe(false);
      expect(pulsing(found), step.id).toBe(1);
      expect(found.target, step.id).not.toBe("NEXT");
      if (found.marker !== null) {
        expect(found.target, step.id).toBe("BOARD");
        expect(found.marker.style, step.id).toBe("TAP");
        expect(found.marker.motion, step.id).toBe("HOP");
      }
      // The line says what to tap.
      expect(found.line, step.id).toMatch(/\b(Tap|tap|Open|End your turn)\b/);
      const expects = step.expects;
      if (expects === null) continue;
      if (expects.kind === "END_TURN") {
        expect(found.target, step.id).toBe("END_TURN");
        continue;
      }
      if (expects.kind === "RESEARCH") {
        expect(found.target, step.id).toBe("TECH");
        expect(cue(step.id, { technologyOpen: true }).target).toBe(
          "TECHNOLOGY",
        );
        const research = cue(step.id, {
          technologyOpen: true,
          selectedTechnology: expects.tech,
        });
        expect(research.target).toBe("RESEARCH");
        expect(research.command).toEqual({
          kind: "RESEARCH",
          tech: expects.tech,
        });
        continue;
      }
      // The first half: the unit, city or tile is marked on the board.
      expect(found.target, step.id).toBe("BOARD");
      const second = cue(step.id, { selection: picked(step.id) });
      expect(pulsing(second), step.id).toBe(1);
      expect(second.line, step.id).toBe(step.selectedLine);
      switch (expects.kind) {
        case "MOVE":
        case "ATTACK":
          // The pulse moves to the destination on the board.
          expect(second.target, step.id).toBe("BOARD");
          expect(second.marker?.at, step.id).toEqual(
            expects.kind === "MOVE" ? expects.to : expects.target,
          );
          expect(second.command?.kind, step.id).toBe(expects.kind);
          expect(second.nudge, step.id).toBe(
            expects.kind === "MOVE"
              ? TUTORIAL_NUDGES_V7.TILE
              : TUTORIAL_NUDGES_V7.UNIT,
          );
          break;
        case "UNIT_HELP":
          expect(second.target, step.id).toBe("UNIT_HELP");
          expect(second.marker, step.id).toBeNull();
          break;
        default:
          // The pulse moves to the dock's button for the command.
          expect(second.target, step.id).toBe("DOCK");
          expect(second.marker, step.id).toBeNull();
          expect(second.command, step.id).not.toBeNull();
          expect(
            tutorialAcceptsV7(
              { completed: false, step: indexOf(step.id) },
              view(step.id),
              second.command as CommandV7,
            ),
            step.id,
          ).toBe(true);
          expect(second.nudge, step.id).toBe(TUTORIAL_NUDGES_V7.BUTTON);
      }
    }
  });

  it("the nudge names where the glow is, and is the plain refusal with no cue", () => {
    expect(cue("HARVEST").nudge).toBe(TUTORIAL_NUDGES_V7.TILE);
    expect(cue("MOVE").nudge).toBe(TUTORIAL_NUDGES_V7.UNIT);
    expect(cue("TRAIN").nudge).toBe(TUTORIAL_NUDGES_V7.CITY);
    expect(cue("END_TURN_1").nudge).toBe(TUTORIAL_NUDGES_V7.BUTTON);
    expect(cue("CRAFTING", { technologyOpen: true }).nudge).toBe(
      TUTORIAL_NUDGES_V7.TECHNOLOGY,
    );
    expect(tutorialNudgeV7(cue("RESOURCES"))).toBe(TUTORIAL_NUDGES_V7.NEXT);
    expect(tutorialNudgeV7(null)).toBe(TUTORIAL_REFUSED_V7);
  });

  it("the Road lesson names whatever unit a city's reward left on the capital", () => {
    expect(cue("ROAD_MOVE").line).toBe(
      "Roads also speed units up. Tap this Fighter.",
    );
    const giant = playTutorialV7({
      opponent: idleTurn,
      stopAt: "ROAD_MOVE",
      reward: unitRewardV7,
    });
    const at = human(giant.state);
    const found = tutorialCueV7({
      progress: giant.progress,
      view: at,
      selection: null,
      ready: true,
      technologyOpen: false,
      offered: queryPlayerCommandsV7(at),
      motion: "FULL",
    });
    const label = effectiveRoleRuleV7("JUGGERNAUT", "ORIGINAL").label;
    expect(unitAt(at, P.capital)?.role).toBe("JUGGERNAUT");
    expect(found?.line).toBe(`Roads also speed units up. Tap this ${label}.`);
  });
});

describe("the tutorial script on the real engine", () => {
  it("every step's command is legal, in order, with an idle opponent", () => {
    const play = playTutorialV7({ opponent: idleTurn });
    expect(play.sent.map((command) => command.kind)).toEqual([
      "HARVEST_FRUIT",
      "MOVE",
      "TRAIN",
      "ATTACK",
      "END_TURN",
      "CAPTURE",
      "BUILD_FARM",
      "END_TURN",
      "BUILD_WINDMILL",
      "BUILD_LUMBER_CAMP",
      "END_TURN",
      "RESEARCH",
      "BUILD_WORKSHOP",
      "END_TURN",
      "RESEARCH",
      "MOVE",
      "BUILD_MINE",
      "END_TURN",
      "BUILD_ROAD",
      "BUILD_ROAD",
      "END_TURN",
      "MOVE",
      "END_TURN",
      "RALLY",
      "MOVE",
      "ATTACK",
      "ATTACK",
      "ATTACK",
    ]);
    // Every step was reached in order, and the tutorial is over.
    expect(play.visited).toEqual(TUTORIAL_STEPS_V7.map((step) => step.id));
    expect(play.progress).toEqual({ completed: true, step: null });
    expect(play.state.outcome).toBeNull();
    expect(play.state.round).toBe(8);
    const view = human(play.state);
    expect(tutorialActiveV7(play.progress, view)).toBe(false);
    const offered = queryPlayerCommandsV7(view);
    expect(tutorialCommandsV7(play.progress, view, offered)).toBe(offered);
    // The economy stands: Farm, Windmill, Lumber Camp, Workshop, Mine, Roads.
    expect(tileAt(view, P.fertile)?.improvement).toBe("FARM");
    expect(tileAt(view, P.windmill)?.improvement).toBe("WINDMILL");
    expect(tileAt(view, P.forest)?.improvement).toBe("LUMBER_CAMP");
    expect(tileAt(view, P.workshop)?.improvement).toBe("WORKSHOP");
    expect(tileAt(view, P.ore)?.improvement).toBe("MINE");
    expect(tileAt(view, P.roadNear)?.road).toBe(true);
    expect(tileAt(view, P.roadFar)?.road).toBe(true);
    // City rewards came up and were chosen (the fixture's pick: the ones
    // that place no unit; every other pick is played below).
    expect(play.rewards).toEqual(["WALLS", "BOOM", "STOCKPILE", "TREASURY"]);
  });

  it("Crafting reveals the Ore, with the coach mark on it", () => {
    const play = playTutorialV7({ opponent: idleTurn, stopAt: "ORE" });
    const before = play.views.CRAFTING;
    if (before === undefined) throw new Error("no view before Crafting");
    expect(tileAt(before, P.ore)?.resource).toBeNull();
    const view = human(play.state);
    expect(view.viewer.researchedTechs).toContain("DRILL");
    expect(tileAt(view, P.ore)?.resource).toBe("ORE");
  });

  it("Engineering opens the mountain to the Fighter beside it", () => {
    const climbsTo = (state: GameStateV7): boolean => {
      const view = human(state);
      // The Fighter that won turn 1's fight, on the Goblin's tile.
      const fighter = unitAt(view, P.enemy);
      return queryPlayerCommandsV7(view).some(
        (command) =>
          command.kind === "MOVE" &&
          command.unitId === fighter?.id &&
          command.path.some(
            (step) => step.x === P.peak.x && step.y === P.peak.y,
          ),
      );
    };
    const before = playTutorialV7({
      opponent: idleTurn,
      stopAt: "ENGINEERING",
    });
    expect(climbsTo(before.state)).toBe(false);
    const after = playTutorialV7({ opponent: idleTurn, stopAt: "CLIMB" });
    expect(climbsTo(after.state)).toBe(true);
    // The Mine is offered only now, on the Ore.
    expect(
      queryPlayerCommandsV7(human(before.state)).some(
        (command) => command.kind === "BUILD_MINE",
      ),
    ).toBe(false);
    expect(
      tutorialCommandsV7(
        after.progress,
        human(after.state),
        queryPlayerCommandsV7(human(after.state)),
      ).map((command) => command.kind),
    ).toEqual(["MOVE", "BUILD_MINE"]);
  });

  it("the Road joins the cities (+1 population each) and doubles a Fighter's reach", () => {
    const before = playTutorialV7({ opponent: idleTurn, stopAt: "ROAD_FAR" });
    const after = playTutorialV7({ opponent: idleTurn, stopAt: "LINK" });
    const live = (state: GameStateV7, place: CoordV7) =>
      human(state).cities.find(
        (city) => city.at.x === place.x && city.at.y === place.y,
      )?.economicPopulation ?? 0;
    expect(live(after.state, P.village) - live(before.state, P.village)).toBe(
      1,
    );
    expect(live(after.state, P.capital) - live(before.state, P.capital)).toBe(
      1,
    );
    // Turn 7: a Move-1 Fighter on the capital reaches two tiles along it.
    const move = playTutorialV7({ opponent: idleTurn, stopAt: "ROAD_MOVE" });
    const view = human(move.state);
    const fighter = unitAt(view, P.capital);
    const ends = queryPlayerCommandsV7(view)
      .filter(
        (command): command is Extract<CommandV7, { kind: "MOVE" }> =>
          command.kind === "MOVE" && command.unitId === fighter?.id,
      )
      .map((command) => command.path[command.path.length - 1]);
    expect(ends).toContainEqual(P.roadFar);
    expect(
      Math.max(...ends.map((end) => Math.abs((end?.x ?? 0) - P.capital.x))),
    ).toBe(2);
  });

  it("the Captain's Rally inspires the Knight, which then kills three Goblins in one turn", () => {
    const start = playTutorialV7({ opponent: idleTurn, stopAt: "RALLY" });
    const view = human(start.state);
    // Turn 8: the Knight, its Captain beside it, three Goblins in a row.
    expect(view.round).toBe(8);
    expect(unitAt(view, P.knight)?.role).toBe("KNIGHT");
    expect(unitAt(view, P.captain)?.role).toBe("CAPTAIN");
    for (const place of [P.goblin1, P.goblin2, P.goblin3])
      expect(unitAt(view, place)?.ownerId).not.toBe(view.viewer.id);
    const inspired = playTutorialV7({ opponent: idleTurn, stopAt: "INSPIRED" });
    const knight = inspired.state.units.find(
      (unit) => unit.role === "KNIGHT" && unit.ownerId === view.viewer.id,
    );
    expect(knight?.activation.inspired).toBe(true);
    const done = playTutorialV7({ opponent: idleTurn });
    const enemiesBefore = start.state.units.filter(
      (unit) => unit.ownerId !== start.state.humanPlayerId,
    ).length;
    const enemiesAfter = done.state.units.filter(
      (unit) => unit.ownerId !== done.state.humanPlayerId,
    ).length;
    expect(enemiesBefore - enemiesAfter).toBe(3);
    expect(done.state.round).toBe(start.state.round);
    // The three kills were the Knight's, in the turn it rode.
    const rider = done.state.units.find((unit) => unit.id === knight?.id);
    expect(rider?.kills).toBe(3);
    expect(rider?.at).toEqual(P.goblin3);
  });

  it("steps of one turn may be done in another order and the tutorial still completes", () => {
    const play = playTutorialV7({
      opponent: idleTurn,
      early: ["FARM", "LUMBER_CAMP", "MINE", "ROAD_FAR"],
    });
    expect(play.progress).toEqual({ completed: true, step: null });
    const kinds = play.sent.map((command) => command.kind);
    // The Farm before the capture, the Lumber Camp before the Windmill, the
    // Mine before the climb, the far Road tile first.
    expect(kinds.slice(5, 7)).toEqual(["BUILD_FARM", "CAPTURE"]);
    expect(kinds.slice(8, 10)).toEqual(["BUILD_LUMBER_CAMP", "BUILD_WINDMILL"]);
    expect(kinds.slice(15, 17)).toEqual(["BUILD_MINE", "MOVE"]);
    expect(play.sent[18]).toEqual({ kind: "BUILD_ROAD", at: P.roadFar });
    // The steps done early were skipped when the script reached them, and
    // the Windmill's explanation still came after the Windmill.
    expect(play.visited).not.toContain("LUMBER_CAMP");
    expect(play.visited).toContain("WINDMILL_INFO");
    expect(play.visited.length).toBe(TUTORIAL_STEPS_V7.length - 4);
  });

  it("a later step of the group is let through, but not one of another turn", () => {
    const play = playTutorialV7({ opponent: idleTurn, stopAt: "WINDMILL" });
    const view = human(play.state);
    const offered = queryPlayerCommandsV7(view);
    expect(
      tutorialCommandsV7(play.progress, view, offered).map((c) => c.kind),
    ).toEqual(["BUILD_WINDMILL", "BUILD_LUMBER_CAMP"]);
    const camp: CommandV7 = { kind: "BUILD_LUMBER_CAMP", at: P.forest };
    const early = advanceTutorialV7(play.progress, view, camp);
    expect(early).toEqual({
      ...play.progress,
      ahead: [indexOf("LUMBER_CAMP")],
    });
    // The cue stays with the Windmill.
    expect(
      tutorialCueV7({
        progress: early,
        view,
        selection: null,
        ready: true,
        technologyOpen: false,
        motion: "FULL",
      })?.step,
    ).toBe("WINDMILL");
    // Nothing of turn 4 or of the End turn is let through.
    expect(
      tutorialAcceptsV7(early, view, { kind: "RESEARCH", tech: "DRILL" }),
    ).toBe(false);
    expect(tutorialAcceptsV7(early, view, { kind: "END_TURN" })).toBe(false);
  });

  it("a city's reward is the real panel: both choices are let through, and either may be taken", () => {
    const play = playTutorialV7({ opponent: idleTurn, stopAt: "END_TURN_2" });
    // The Farm took the capital to level 3 at the Farm step.
    const farm = play.pendingAt.FARM;
    if (farm === undefined) throw new Error("no reward after the Farm");
    const offered = queryPlayerCommandsV7(farm.view);
    expect(offered.map((command) => command.kind)).toEqual([
      "CHOOSE_CITY_REWARD",
      "CHOOSE_CITY_REWARD",
    ]);
    expect(tutorialCommandsV7(farm.progress, farm.view, offered)).toEqual(
      offered,
    );
    for (const command of offered)
      expect(tutorialAcceptsV7(farm.progress, farm.view, command)).toBe(true);
    expect(reconcileTutorialV7(farm.progress, farm.view, offered)).toBe(
      farm.progress,
    );
  });

  it("every pick of every reward panel, in either order of the turns, still completes the tutorial", () => {
    // The panels: the capital's levels 3 (Scouts or Walls), 4 (Boom or the
    // Economic Miracle) and 5 (the giant or the Treasury, after a Boom),
    // and the second city's level 2 (Stockpile or Militia).
    const levels = [2, 3, 4, 5];
    const orders: readonly (readonly TutorialStepIdV7[])[] = [
      [],
      ["FARM", "LUMBER_CAMP", "MINE", "ROAD_FAR"],
    ];
    const seen = new Set<string>();
    for (let mask = 0; mask < 1 << levels.length; mask += 1)
      for (const early of orders) {
        const pick = (choice: TutorialRewardChoiceV7) => {
          const bit =
            (mask >> levels.indexOf(Math.min(5, choice.reachedLevel))) & 1;
          const reward = choice.candidates[bit] ?? choice.candidates[0];
          if (reward === undefined) throw new Error("no candidate");
          return reward;
        };
        const done = playTutorialV7({
          opponent: idleTurn,
          reward: pick,
          early,
        });
        const label = `${String(mask)} ${early.join(",")}`;
        expect(done.progress, label).toEqual({ completed: true, step: null });
        expect(done.visited.length, label).toBe(
          TUTORIAL_STEPS_V7.length - early.length,
        );
        // The Knight still kills the three Goblins: only the Goblin
        // capital's own Fighter is left.
        const enemies = done.state.units.filter(
          (unit) => unit.ownerId !== done.state.humanPlayerId,
        );
        expect(
          enemies.map((unit) => unit.at),
          label,
        ).toEqual([{ x: 8, y: 2 }]);
        for (const reward of done.rewards) seen.add(reward);
      }
    // Every reward of the four panels was taken in some play.
    expect([...seen].sort()).toEqual(
      [
        "BOOM",
        "ECONOMIC_MIRACLE",
        "JUGGERNAUT",
        "MILITIA",
        "STOCKPILE",
        "SURVEY",
        "TREASURY",
        "WALLS",
      ].sort(),
    );
  });

  it("the one attack kills the lone Goblin, so nothing of the enemy is near on turn 2", () => {
    const play = playTutorialV7({ opponent: idleTurn, stopAt: "END_TURN_1" });
    const enemies = play.state.units.filter(
      (unit) => unit.ownerId !== play.state.humanPlayerId,
    );
    expect(enemies).toHaveLength(1);
    expect(enemies[0]?.at).toEqual({ x: 8, y: 2 });
  });

  it("the Normal AI's own first turn leaves the script legal", () => {
    const play = playTutorialV7({ opponent: aiTurn, stopAt: "END_TURN_2" });
    expect(play.visited[play.visited.length - 1]).toBe("END_TURN_2");
    expect(play.sent[play.sent.length - 1]?.kind).toBe("BUILD_FARM");
    expect(play.state.outcome).toBeNull();
    expect(play.state.turnOrder[play.state.activeSeatIndex]).toBe(
      play.state.humanPlayerId,
    );
  });
});
