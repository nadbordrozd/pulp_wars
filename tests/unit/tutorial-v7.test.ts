import { describe, expect, it } from "vitest";
import {
  chooseNormalCommandV7,
  chooseNormalTurnCommandV7,
} from "../../src/ai/v7";
import {
  applyCommandV7,
  createPlayableGameV7,
  missionByIdV7,
  missionMatchSetupV7,
  queryPlayerCommandsV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type GameStateV7,
  type PlayerViewV7,
} from "../../src/engine/index";
import {
  NEW_TUTORIAL_PROGRESS_V7,
  TUTORIAL_FAREWELL_V7,
  TUTORIAL_MISSION_ID_V7,
  TUTORIAL_PLACES_V7,
  TUTORIAL_STEPS_V7,
  TUTORIAL_STORAGE_KEY_V7,
  acknowledgeTutorialV7,
  advanceTutorialV7,
  isTutorialMatchV7,
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
  tutorialStepV7,
  type TutorialProgressV7,
} from "../../src/render/tutorial-v7";
import { browserSetupV7 } from "../fixtures/v7-builders";

/**
 * The tutorial (bead pulp_wars-0yxy): the script as a pure state machine
 * (one command a step, every other command refused, advancing, skipping),
 * and the script's commands applied in order to the real engine from the
 * tutorial board's first state. The opponent's one turn between the
 * player's two is played by the Normal AI's single-turn step; no match is
 * played.
 */
const COORDINATE = /\(\s*\d+\s*,\s*\d+\s*\)|\b\d+\s*,\s*\d+\b/;

function tutorialState(): GameStateV7 {
  const mission = missionByIdV7(TUTORIAL_MISSION_ID_V7);
  if (mission === null) throw new Error("the tutorial mission is missing");
  const setup = missionMatchSetupV7(mission);
  if (setup === null) throw new Error("the tutorial setup is missing");
  const created = createPlayableGameV7(setup);
  if (!created.ok) throw new Error(created.error.code);
  return created.state;
}

const human = (state: GameStateV7): PlayerViewV7 =>
  viewForV7(state, state.humanPlayerId);

function apply(
  state: GameStateV7,
  actor: number,
  command: CommandV7,
): GameStateV7 {
  const result = applyCommandV7(state, actor as never, command);
  if (!result.accepted)
    throw new Error(`${command.kind}: ${result.error.code}`);
  return result.state;
}

/** One whole turn of the active AI seat, chosen by the Normal AI. */
function aiTurn(start: GameStateV7): GameStateV7 {
  let state = start;
  const actor = state.turnOrder[state.activeSeatIndex];
  if (actor === undefined || actor === state.humanPlayerId)
    throw new Error("not an AI turn");
  for (let accepted = 0; accepted < 64; accepted += 1) {
    const view = viewForV7(state, actor);
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

/** The opponent ends its turn without doing anything. */
function idleTurn(state: GameStateV7): GameStateV7 {
  const actor = state.turnOrder[state.activeSeatIndex];
  if (actor === undefined) throw new Error("no active seat");
  return apply(state, actor, { kind: "END_TURN" });
}

/**
 * Plays the whole script: at each step the one command the tutorial lets
 * through, as the interface would send it. Returns the state after the
 * last step and what was sent.
 */
function playScript(opponent: (state: GameStateV7) => GameStateV7): {
  readonly state: GameStateV7;
  readonly sent: readonly CommandV7[];
  readonly progress: TutorialProgressV7;
} {
  let state = tutorialState();
  let progress = startTutorialV7(NEW_TUTORIAL_PROGRESS_V7);
  const sent: CommandV7[] = [];
  for (const step of TUTORIAL_STEPS_V7) {
    expect(tutorialStepV7(progress)?.id).toBe(step.id);
    const view = human(state);
    const offered = queryPlayerCommandsV7(view);
    // The tutorial never gives up on a step of its own script.
    expect(reconcileTutorialV7(progress, view, offered)).toBe(progress);
    const allowed = tutorialCommandsV7(progress, view, offered);
    if (step.expects === null) {
      expect(allowed).toEqual([]);
      progress = acknowledgeTutorialV7(progress);
      continue;
    }
    // Exactly one command, and it is one the engine offers.
    expect(allowed, step.id).toHaveLength(1);
    const command = allowed[0];
    if (command === undefined) throw new Error(step.id);
    expect(offered).toContain(command);
    // Every other offered command is refused before the engine.
    for (const other of offered)
      expect(tutorialAcceptsV7(progress, view, other)).toBe(other === command);
    state = apply(state, state.humanPlayerId, command);
    sent.push(command);
    progress = advanceTutorialV7(progress, view, command);
    if (command.kind === "END_TURN") state = opponent(state);
  }
  return { state, sent, progress };
}

describe("the tutorial board", () => {
  it("is the registered TUTORIAL_1 mission: Humans against Goblins, in no chapter", () => {
    const mission = missionByIdV7(TUTORIAL_MISSION_ID_V7);
    expect(mission).toMatchObject({ revision: 1, hidden: true, size: 11 });
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
    const at = (place: CoordV7) =>
      view.board.tiles.find(
        (tile) => tile.at.x === place.x && tile.at.y === place.y,
      );
    const unitAt = (place: CoordV7) =>
      view.units.find((unit) => unit.at.x === place.x && unit.at.y === place.y);
    const capital = view.cities.find((city) => city.ownerId === view.viewer.id);
    expect(capital?.at).toEqual(TUTORIAL_PLACES_V7.capital);
    // Level 2: room for a third unit.
    expect(capital?.level).toBe(2);
    expect(at(TUTORIAL_PLACES_V7.fruit)).toMatchObject({
      resource: "FRUIT",
      territoryOwnerId: view.viewer.id,
      explored: true,
    });
    expect(at(TUTORIAL_PLACES_V7.village)).toMatchObject({ explored: true });
    expect(unitAt(TUTORIAL_PLACES_V7.walker)?.ownerId).toBe(view.viewer.id);
    expect(unitAt(TUTORIAL_PLACES_V7.attacker)?.ownerId).toBe(view.viewer.id);
    const enemy = unitAt(TUTORIAL_PLACES_V7.enemy);
    expect(enemy).toBeDefined();
    expect(enemy?.ownerId).not.toBe(view.viewer.id);
    // Nothing stands on the city center, so a unit can be trained, and
    // the player has no technology, so the first one is free.
    expect(unitAt(TUTORIAL_PLACES_V7.capital)).toBeUndefined();
    expect(view.viewer.researchedTechs).toEqual([]);
    // The Coins for the harvest (2) and the Fighter (2), and little more.
    expect(view.viewer.coins).toBe(6);
  });
});

describe("the tutorial script as a state machine", () => {
  it("teaches the seven things the tutorial is for, in a workable order", () => {
    expect(TUTORIAL_STEPS_V7.map((step) => step.id)).toEqual([
      "RESEARCH",
      "HARVEST",
      "RESOURCES",
      "MOVE",
      "TRAIN",
      "ATTACK",
      "END_TURN",
      "CAPTURE",
    ]);
    expect(TUTORIAL_STEPS_V7.map((step) => step.expects?.kind ?? null)).toEqual(
      [
        "RESEARCH",
        "HARVEST_FRUIT",
        null,
        "MOVE",
        "TRAIN",
        "ATTACK",
        "END_TURN",
        "CAPTURE",
      ],
    );
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
    expect(allowed).toEqual([{ kind: "RESEARCH", tech: "GATHERING" }]);
    expect(offered.length).toBeGreaterThan(5);
    const refused = offered.filter(
      (command) => !tutorialAcceptsV7(progress, view, command),
    );
    expect(refused).toHaveLength(offered.length - 1);
    // End turn, a move, a train and the other technologies are refused.
    expect(refused.map((command) => command.kind)).toEqual(
      expect.arrayContaining(["END_TURN", "MOVE", "TRAIN", "RESEARCH"]),
    );
    // A refused command does not advance the step.
    const endTurn: CommandV7 = { kind: "END_TURN" };
    expect(advanceTutorialV7(progress, view, endTurn)).toBe(progress);
    expect(
      advanceTutorialV7(progress, view, { kind: "RESEARCH", tech: "HUNTING" }),
    ).toBe(progress);
    expect(
      advanceTutorialV7(progress, view, {
        kind: "RESEARCH",
        tech: "GATHERING",
      }),
    ).toEqual({ completed: false, step: 1 });
  });

  it("an explanation step lets no command through and moves on with Next", () => {
    const view = human(tutorialState());
    const offered = queryPlayerCommandsV7(view);
    const index = TUTORIAL_STEPS_V7.findIndex((step) => step.expects === null);
    const progress: TutorialProgressV7 = { completed: false, step: index };
    expect(tutorialCommandsV7(progress, view, offered)).toEqual([]);
    for (const command of offered)
      expect(tutorialAcceptsV7(progress, view, command)).toBe(false);
    // It is not given up on: there is nothing the engine has to offer.
    expect(reconcileTutorialV7(progress, view, offered)).toBe(progress);
    expect(acknowledgeTutorialV7(progress)).toEqual({
      completed: false,
      step: index + 1,
    });
    // Next does nothing on a step that wants a command.
    const first = startTutorialV7(NEW_TUTORIAL_PROGRESS_V7);
    expect(acknowledgeTutorialV7(first)).toBe(first);
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
    const capture = TUTORIAL_STEPS_V7.findIndex(
      (step) => step.id === "CAPTURE",
    );
    const stuck: TutorialProgressV7 = { completed: false, step: capture };
    expect(tutorialExpectedCommandV7(stuck, view, offered)).toBeNull();
    expect(reconcileTutorialV7(stuck, view, offered)).toEqual({
      completed: true,
      step: null,
    });
    // Not during another seat's turn, when nothing is offered.
    expect(reconcileTutorialV7(stuck, view, [])).toBe(stuck);
  });

  it("stores its record and reads anything malformed as a new profile", () => {
    expect(TUTORIAL_STORAGE_KEY_V7).toBe("pulpWars.ruleset7.tutorial.v1");
    for (const progress of [
      NEW_TUTORIAL_PROGRESS_V7,
      { completed: false, step: 3 },
      { completed: true, step: null },
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
  });
});

describe("the tutorial cue", () => {
  const cueAt = (
    id: string,
    state: GameStateV7,
    selection: Parameters<typeof tutorialCueV7>[0]["selection"] = null,
    extra: Partial<Parameters<typeof tutorialCueV7>[0]> = {},
  ) =>
    tutorialCueV7({
      progress: {
        completed: false,
        step: TUTORIAL_STEPS_V7.findIndex((step) => step.id === id),
      },
      view: human(state),
      selection,
      ready: true,
      technologyOpen: false,
      motion: "FULL",
      ...extra,
    });

  it("points at the Tech button, then at Gathering in the technology screen", () => {
    const state = tutorialState();
    expect(cueAt("RESEARCH", state)).toMatchObject({
      step: "RESEARCH",
      number: 1,
      count: 8,
      button: "TECH",
      buttonMotion: "PULSE",
      marker: null,
      next: false,
      technology: "GATHERING",
    });
    expect(cueAt("RESEARCH", state, null, { technologyOpen: true })?.line).toBe(
      "Pick Gathering, then Research.",
    );
    expect(
      cueAt("RESEARCH", state, null, { motion: "REDUCED" })?.buttonMotion,
    ).toBe("STILL");
  });

  it("marks what to tap, then the target once it is selected", () => {
    const state = tutorialState();
    const view = human(state);
    const unitId = (at: CoordV7) => {
      const unit = view.units.find(
        (item) => item.at.x === at.x && item.at.y === at.y,
      );
      if (unit === undefined) throw new Error("fixture");
      return unit.id;
    };
    expect(cueAt("HARVEST", state)?.marker).toEqual({
      kind: "TILE",
      at: TUTORIAL_PLACES_V7.fruit,
      motion: "HOP",
    });
    const picked = cueAt("HARVEST", state, {
      kind: "TILE",
      at: TUTORIAL_PLACES_V7.fruit,
    });
    expect(picked?.marker).toBeNull();
    expect(picked?.line).toBe("Press Harvest: it costs 2 Coins.");
    expect(cueAt("MOVE", state)?.marker).toEqual({
      kind: "UNIT",
      at: TUTORIAL_PLACES_V7.walker,
      motion: "HOP",
    });
    expect(
      cueAt("MOVE", state, {
        kind: "UNIT",
        unitId: unitId(TUTORIAL_PLACES_V7.walker),
      }),
    ).toMatchObject({
      line: "Tap the village to walk there.",
      marker: { kind: "TILE", at: TUTORIAL_PLACES_V7.village },
    });
    // The other Fighter selected: still pointed at the one to move.
    expect(
      cueAt("MOVE", state, {
        kind: "UNIT",
        unitId: unitId(TUTORIAL_PLACES_V7.attacker),
      })?.marker,
    ).toMatchObject({ kind: "UNIT", at: TUTORIAL_PLACES_V7.walker });
    expect(cueAt("TRAIN", state)?.marker).toMatchObject({
      kind: "CITY",
      at: TUTORIAL_PLACES_V7.capital,
    });
    expect(
      cueAt("ATTACK", state, {
        kind: "UNIT",
        unitId: unitId(TUTORIAL_PLACES_V7.attacker),
      }),
    ).toMatchObject({
      line: "Tap the Goblin to attack it.",
      marker: { kind: "UNIT", at: TUTORIAL_PLACES_V7.enemy },
    });
    expect(cueAt("END_TURN", state)).toMatchObject({
      button: "END_TURN",
      marker: null,
    });
    expect(
      cueAt("MOVE", state, null, { motion: "REDUCED" })?.marker?.motion,
    ).toBe("STILL");
  });

  it("an explanation has a Next and no marker; nothing shows while the player cannot act", () => {
    const state = tutorialState();
    expect(cueAt("RESOURCES", state)).toMatchObject({
      next: true,
      marker: null,
      button: null,
      number: 3,
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

describe("the tutorial script on the real engine", () => {
  it("every step's command is legal, in order, with an idle opponent", () => {
    const { state, sent, progress } = playScript(idleTurn);
    expect(sent.map((command) => command.kind)).toEqual([
      "RESEARCH",
      "HARVEST_FRUIT",
      "MOVE",
      "TRAIN",
      "ATTACK",
      "END_TURN",
      "CAPTURE",
    ]);
    // The tutorial is over and remembered; the match goes on.
    expect(progress).toEqual({ completed: true, step: null });
    expect(state.outcome).toBeNull();
    const view = human(state);
    expect(tutorialActiveV7(progress, view)).toBe(false);
    const offered = queryPlayerCommandsV7(view);
    expect(tutorialCommandsV7(progress, view, offered)).toBe(offered);
    expect(offered.some((command) => command.kind === "END_TURN")).toBe(true);
    // What the lessons did: Gathering, the fruit gone and the city fed, a
    // third Fighter, the Goblin dead, the village a second city.
    expect(view.viewer.researchedTechs).toEqual(["GATHERING"]);
    const own = view.cities.filter((city) => city.ownerId === view.viewer.id);
    expect(own.map((city) => city.at)).toEqual(
      expect.arrayContaining([
        TUTORIAL_PLACES_V7.capital,
        TUTORIAL_PLACES_V7.village,
      ]),
    );
    expect(own).toHaveLength(2);
    expect(
      view.units.filter((unit) => unit.ownerId === view.viewer.id),
    ).toHaveLength(3);
    expect(
      view.board.tiles.find(
        (tile) =>
          tile.at.x === TUTORIAL_PLACES_V7.fruit.x &&
          tile.at.y === TUTORIAL_PLACES_V7.fruit.y,
      ),
    ).toMatchObject({ explored: true, resource: null });
  });

  it("the one attack kills the lone Goblin, so nothing of the enemy is near on turn 2", () => {
    let state = tutorialState();
    let progress: TutorialProgressV7 = {
      completed: false,
      step: TUTORIAL_STEPS_V7.findIndex((step) => step.id === "ATTACK"),
    };
    const view = human(state);
    const attack = tutorialExpectedCommandV7(
      progress,
      view,
      queryPlayerCommandsV7(view),
    );
    if (attack === null) throw new Error("the attack is not offered");
    const enemies = (current: GameStateV7) =>
      current.units.filter((unit) => unit.ownerId !== current.humanPlayerId);
    expect(enemies(state)).toHaveLength(2);
    state = apply(state, state.humanPlayerId, attack);
    progress = advanceTutorialV7(progress, view, attack);
    expect(tutorialStepV7(progress)?.id).toBe("END_TURN");
    expect(enemies(state)).toHaveLength(1);
    expect(enemies(state)[0]?.at).toEqual({ x: 8, y: 2 });
  });

  it("the Normal AI's own first turn leaves the script legal", () => {
    const { state, sent, progress } = playScript(aiTurn);
    expect(sent[sent.length - 1]?.kind).toBe("CAPTURE");
    expect(progress).toEqual({ completed: true, step: null });
    expect(state.outcome).toBeNull();
    expect(state.turnOrder[state.activeSeatIndex]).toBe(state.humanPlayerId);
  });
});
