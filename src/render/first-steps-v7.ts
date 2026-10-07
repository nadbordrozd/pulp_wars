import {
  BASIC_ECONOMIC_ACTIONS_V7,
  technologyDisplayNameV7,
  type BasicEconomicCommandKindV7,
  type CommandV7,
  type CoordV7,
  type PlayerViewV7,
} from "../engine/index";
import type { BoardSelectionV7 } from "./canvas/board-renderer-v7";

/**
 * First steps (bead pulp_wars-2yc.39): a light coach for a player's first
 * turns. It points at the next useful thing with one marker on the board
 * (or a pulse on the Tech or End turn button) and at most one short line;
 * it is never a dialog and never takes a click.
 *
 * This module is the pure part: the steps, the record of what the player
 * has done, and `chooseFirstStepV7`, which reads only the viewer's public
 * view and the commands the engine offers it, so a cue can never show
 * something the player may not know, and never suggests an illegal action.
 * The DOM (app-view-v7.ts) shows the line and the pulse; the board
 * (feedback-host-v7.ts) draws the marker.
 */
export type FirstStepIdV7 =
  | "CAPTURE"
  | "TRAIN"
  | "MOVE"
  | "UNIT_DONE"
  | "RESEARCH"
  | "RESOURCE"
  | "END_TURN";

/**
 * The steps in priority order: with nothing selected, the first one that
 * applies is shown. A unit on a village or an enemy city is rare and worth
 * the most, so it leads; the rest follow a first game. `UNIT_DONE` is the
 * one step no state asks for: its line goes up when a command of the
 * player leaves a unit without a Move (`outOfMovesUnitId`), ahead of the
 * others, for a few seconds.
 */
export const FIRST_STEP_IDS_V7: readonly FirstStepIdV7[] = [
  "CAPTURE",
  "TRAIN",
  "MOVE",
  "UNIT_DONE",
  "RESEARCH",
  "RESOURCE",
  "END_TURN",
];

/**
 * A step retires once the player has done its thing this many times
 * (`UNIT_DONE`: once its line has been shown this many times).
 */
export const FIRST_STEP_RETIRE_COUNT_V7: Readonly<
  Record<FirstStepIdV7, number>
> = {
  CAPTURE: 1,
  TRAIN: 2,
  MOVE: 2,
  UNIT_DONE: 2,
  RESEARCH: 2,
  RESOURCE: 2,
  END_TURN: 3,
};

/** The steps that make a player competent: all retired, the coach is off. */
export const FIRST_STEP_CORE_IDS_V7: readonly FirstStepIdV7[] = [
  "TRAIN",
  "MOVE",
  "RESEARCH",
  "RESOURCE",
  "END_TURN",
];

/** The coach is off for good after this many of the player's turns. */
export const FIRST_STEPS_TURN_LIMIT_V7 = 12;

/** A line never has more words than this. */
export const FIRST_STEP_LINE_WORD_LIMIT_V7 = 8;

/** What this browser profile has done; it is not part of any save. */
export interface FirstStepsProgressV7 {
  /** The Settings toggle "Hints". */
  readonly enabled: boolean;
  readonly done: Readonly<Record<FirstStepIdV7, number>>;
  /** Turns the player has ended with Hints on. */
  readonly turns: number;
}

const NOTHING_DONE: Readonly<Record<FirstStepIdV7, number>> = Object.freeze({
  CAPTURE: 0,
  TRAIN: 0,
  MOVE: 0,
  UNIT_DONE: 0,
  RESEARCH: 0,
  RESOURCE: 0,
  END_TURN: 0,
});

/** A new profile: Hints on, nothing done. */
export const NEW_FIRST_STEPS_PROGRESS_V7: FirstStepsProgressV7 = Object.freeze({
  enabled: true,
  done: NOTHING_DONE,
  turns: 0,
});

export const FIRST_STEPS_STORAGE_KEY_V7 = "pulpWars.ruleset7.firstSteps.v1";

/** Reads a stored record; anything missing or malformed is a new profile. */
export function parseFirstStepsProgressV7(
  stored: string | null | undefined,
): FirstStepsProgressV7 {
  if (stored === null || stored === undefined)
    return NEW_FIRST_STEPS_PROGRESS_V7;
  let parsed: unknown;
  try {
    parsed = JSON.parse(stored);
  } catch {
    return NEW_FIRST_STEPS_PROGRESS_V7;
  }
  if (typeof parsed !== "object" || parsed === null)
    return NEW_FIRST_STEPS_PROGRESS_V7;
  const record = parsed as Record<string, unknown>;
  if (record.version !== 1 || typeof record.enabled !== "boolean")
    return NEW_FIRST_STEPS_PROGRESS_V7;
  const count = (value: unknown): number =>
    typeof value === "number" && Number.isSafeInteger(value) && value > 0
      ? Math.min(value, 1_000)
      : 0;
  const stored_done =
    typeof record.done === "object" && record.done !== null
      ? (record.done as Record<string, unknown>)
      : {};
  const done = { ...NOTHING_DONE };
  for (const step of FIRST_STEP_IDS_V7) done[step] = count(stored_done[step]);
  return { enabled: record.enabled, done, turns: count(record.turns) };
}

export function serializeFirstStepsProgressV7(
  progress: FirstStepsProgressV7,
): string {
  return JSON.stringify({
    version: 1,
    enabled: progress.enabled,
    done: progress.done,
    turns: progress.turns,
  });
}

/** Hints switched off, or on again: on starts the coach from nothing. */
export function setFirstStepsEnabledV7(enabled: boolean): FirstStepsProgressV7 {
  return { ...NEW_FIRST_STEPS_PROGRESS_V7, enabled };
}

/** Whether a step is still to be learnt. */
export function firstStepLiveV7(
  progress: FirstStepsProgressV7,
  step: FirstStepIdV7,
): boolean {
  return progress.done[step] < FIRST_STEP_RETIRE_COUNT_V7[step];
}

/**
 * Whether the coach still speaks: Hints on, the turn limit not reached, and
 * a core step still to be learnt.
 */
export function firstStepsActiveV7(progress: FirstStepsProgressV7): boolean {
  return (
    progress.enabled &&
    progress.turns < FIRST_STEPS_TURN_LIMIT_V7 &&
    FIRST_STEP_CORE_IDS_V7.some((step) => firstStepLiveV7(progress, step))
  );
}

/** One more of a step done (or shown, for `UNIT_DONE`). */
export function bumpFirstStepV7(
  progress: FirstStepsProgressV7,
  step: FirstStepIdV7,
): FirstStepsProgressV7 {
  return {
    ...progress,
    done: { ...progress.done, [step]: progress.done[step] + 1 },
  };
}

/** The player dismissed a step's line: that step is learnt. */
export function retireFirstStepV7(
  progress: FirstStepsProgressV7,
  step: FirstStepIdV7,
): FirstStepsProgressV7 {
  return {
    ...progress,
    done: {
      ...progress.done,
      [step]: Math.max(progress.done[step], FIRST_STEP_RETIRE_COUNT_V7[step]),
    },
  };
}

const ECONOMIC_KINDS = Object.keys(
  BASIC_ECONOMIC_ACTIONS_V7,
) as readonly BasicEconomicCommandKindV7[];

function isEconomic(command: CommandV7): command is {
  readonly kind: BasicEconomicCommandKindV7;
  readonly at: CoordV7;
} {
  return (ECONOMIC_KINDS as readonly string[]).includes(command.kind);
}

/** The step a command the player gave teaches, or null. */
export function firstStepOfCommandV7(command: CommandV7): FirstStepIdV7 | null {
  switch (command.kind) {
    case "TRAIN":
    case "TRAIN_NAVAL":
    case "LAY_EGG":
    case "HIRE":
      return "TRAIN";
    case "MOVE":
      return "MOVE";
    case "RESEARCH":
      return "RESEARCH";
    case "CAPTURE":
      return "CAPTURE";
    case "END_TURN":
      return "END_TURN";
    default:
      return isEconomic(command) ? "RESOURCE" : null;
  }
}

/** The record after a command of the player was accepted. */
export function noteFirstStepCommandV7(
  progress: FirstStepsProgressV7,
  command: CommandV7,
): FirstStepsProgressV7 {
  if (!progress.enabled) return progress;
  const step = firstStepOfCommandV7(command);
  const next = step === null ? progress : bumpFirstStepV7(progress, step);
  return command.kind === "END_TURN"
    ? { ...next, turns: next.turns + 1 }
    : next;
}

/** What the board draws: a marker over a city, a tile or a unit. */
export interface FirstStepMarkerV7 {
  readonly kind: "CITY" | "TILE" | "UNIT";
  readonly at: CoordV7;
  /** `HOP`: it hops (full motion). `STILL`: a static marker. */
  readonly motion: "HOP" | "STILL";
}

export interface FirstStepCueV7 {
  readonly step: FirstStepIdV7;
  /** The one line, at most `FIRST_STEP_LINE_WORD_LIMIT_V7` words. */
  readonly line: string;
  readonly marker: FirstStepMarkerV7 | null;
  /** The HUD button the cue points at, or null. */
  readonly button: "TECH" | "END_TURN" | null;
  /** `PULSE` in full motion, `STILL` (a static ring) in reduced motion. */
  readonly buttonMotion: "PULSE" | "STILL";
}

export interface FirstStepsInputV7 {
  readonly view: PlayerViewV7;
  /** Every command the engine offers the viewer now. */
  readonly commands: readonly CommandV7[];
  readonly selection: BoardSelectionV7 | null;
  readonly progress: FirstStepsProgressV7;
  /**
   * The board takes the player's input: their turn, nothing playing, no
   * dialog open. False during AI turns.
   */
  readonly interactive: boolean;
  readonly motion: "FULL" | "REDUCED";
  /**
   * The own unit that the player's last command left without a Move, while
   * its line is up; null otherwise.
   */
  readonly outOfMovesUnitId?: number | null;
}

const same = (left: CoordV7, right: CoordV7): boolean =>
  left.x === right.x && left.y === right.y;

/** Commands that mean there is still something useful to do this turn. */
const USEFUL_KINDS: ReadonlySet<CommandV7["kind"]> = new Set<CommandV7["kind"]>(
  [
    "MOVE",
    "ATTACK",
    "CAPTURE",
    "TRAIN",
    "TRAIN_NAVAL",
    "LAY_EGG",
    "RESEARCH",
    "CHOOSE_CITY_REWARD",
    ...ECONOMIC_KINDS,
  ],
);

/** Every fixed line the coach can say. */
export const FIRST_STEP_LINES_V7 = {
  CAPTURE: "Tap this unit to capture here",
  CAPTURE_SELECTED: "Press Capture to take this place",
  TRAIN: "Tap your city to train a unit",
  TRAIN_SELECTED: "Pick a unit to train",
  MOVE: "Tap a ringed unit to move it",
  MOVE_SELECTED: "Pick a highlighted tile to move",
  OUT_OF_MOVES: "No bright ring: this unit has moved",
  RESEARCH_FREE: "Your first technology is free",
  RESEARCH: "You can afford a new technology",
  RESOURCE_SELECTED: "Press the action below to use it",
  END_TURN: "All done: end your turn",
} as const;

/** The line over a tile whose resource can be used now, by its command. */
export const FIRST_STEP_RESOURCE_LINES_V7: Readonly<
  Record<BasicEconomicCommandKindV7, string>
> = {
  HARVEST_FRUIT: "Tap the fruit to harvest it",
  HUNT_GAME: "Tap the game to hunt it",
  HARVEST_FISH: "Tap the fish to catch them",
  BUILD_FARM: "Tap this field to build a farm",
  BUILD_MINE: "Tap the ore to build a mine",
  BUILD_LUMBER_CAMP: "Tap this forest to build a lumber camp",
};

/** The cheapest and plainest first: a harvest before a building. */
const RESOURCE_ORDER: readonly BasicEconomicCommandKindV7[] = [
  "HARVEST_FRUIT",
  "HUNT_GAME",
  "HARVEST_FISH",
  "BUILD_FARM",
  "BUILD_MINE",
  "BUILD_LUMBER_CAMP",
];

/** "Research Hunting to hunt your game": the verb and the resource. */
const RESOURCE_WORDS: Readonly<Record<string, string>> = {
  FRUIT: "harvest your fruit",
  GAME: "hunt your game",
  FISH: "catch your fish",
  FERTILE_GROUND: "farm your fields",
  ORE: "mine your ore",
};

/**
 * The line that sends the player to the Tech button for a resource in
 * their land ("Research Gathering to harvest your fruit"), or null for a
 * resource the coach has no words for.
 */
export function firstStepResearchLineV7(
  technologyName: string,
  resource: string,
): string | null {
  const words = RESOURCE_WORDS[resource];
  return words === undefined ? null : `Research ${technologyName} to ${words}`;
}

/**
 * The cue to show now, or null: nothing during AI turns or behind a
 * dialog, nothing with Hints off, nothing once the coach has retired.
 *
 * Order: the line of a unit that just ran out of moves; then what the
 * selection can do (its Move tiles, its Train list, its tile's action);
 * then, with nothing of the selection's to say, the first applicable step
 * of `FIRST_STEP_IDS_V7`.
 */
export function chooseFirstStepV7(
  input: FirstStepsInputV7,
): FirstStepCueV7 | null {
  const { view, commands, selection, progress } = input;
  if (
    !input.interactive ||
    !firstStepsActiveV7(progress) ||
    view.outcome !== null ||
    view.pendingChoices.length > 0 ||
    view.viewer.id !== view.humanPlayerId ||
    view.turnOrder[view.activeSeatIndex] !== view.viewer.id
  )
    return null;
  const viewer = view.viewer.id;
  const live = (step: FirstStepIdV7): boolean =>
    firstStepLiveV7(progress, step);
  const hop = input.motion === "FULL" ? "HOP" : "STILL";
  const cue = (
    step: FirstStepIdV7,
    line: string,
    marker: Omit<FirstStepMarkerV7, "motion"> | null = null,
    button: FirstStepCueV7["button"] = null,
  ): FirstStepCueV7 => ({
    step,
    line,
    marker: marker === null ? null : { ...marker, motion: hop },
    button,
    buttonMotion: input.motion === "FULL" ? "PULSE" : "STILL",
  });
  const ownUnit = (unitId: number) =>
    view.units.find(
      (unit) => unit.id === unitId && unit.ownerId === viewer && unit.hp > 0,
    );
  const offered = (kind: CommandV7["kind"], unitId: number): boolean =>
    commands.some(
      (command) =>
        command.kind === kind &&
        "unitId" in command &&
        command.unitId === unitId,
    );
  const trains = (cityId: number): boolean =>
    commands.some(
      (command) =>
        (command.kind === "TRAIN" || command.kind === "LAY_EGG") &&
        command.cityId === cityId,
    );
  const economic = commands.filter(isEconomic);

  // A unit the player's command just left without a Move.
  if (
    input.outOfMovesUnitId !== null &&
    input.outOfMovesUnitId !== undefined &&
    ownUnit(input.outOfMovesUnitId) !== undefined
  )
    return cue("UNIT_DONE", FIRST_STEP_LINES_V7.OUT_OF_MOVES);

  // What the selection can do.
  if (selection?.kind === "UNIT" && ownUnit(selection.unitId) !== undefined) {
    if (live("CAPTURE") && offered("CAPTURE", selection.unitId))
      return cue("CAPTURE", FIRST_STEP_LINES_V7.CAPTURE_SELECTED);
    if (live("MOVE") && offered("MOVE", selection.unitId))
      return cue("MOVE", FIRST_STEP_LINES_V7.MOVE_SELECTED);
  }
  if (selection?.kind === "CITY" && live("TRAIN") && trains(selection.cityId))
    return cue("TRAIN", FIRST_STEP_LINES_V7.TRAIN_SELECTED);
  if (
    selection?.kind === "TILE" &&
    live("RESOURCE") &&
    economic.some((command) => same(command.at, selection.at))
  )
    return cue("RESOURCE", FIRST_STEP_LINES_V7.RESOURCE_SELECTED);

  // The next useful thing on the board.
  if (live("CAPTURE")) {
    const capture = commands.find((command) => command.kind === "CAPTURE");
    const unit =
      capture !== undefined && "unitId" in capture
        ? ownUnit(capture.unitId)
        : undefined;
    if (unit !== undefined)
      return cue("CAPTURE", FIRST_STEP_LINES_V7.CAPTURE, {
        kind: "UNIT",
        at: unit.at,
      });
  }
  if (live("TRAIN")) {
    const cities = view.cities.filter(
      (city) => city.ownerId === viewer && trains(city.id),
    );
    const city = cities.find((candidate) => candidate.isCapital) ?? cities[0];
    if (city !== undefined)
      return cue("TRAIN", FIRST_STEP_LINES_V7.TRAIN, {
        kind: "CITY",
        at: city.at,
      });
  }
  if (
    live("MOVE") &&
    view.units.some(
      (unit) =>
        unit.ownerId === viewer &&
        unit.form !== "EGG" &&
        !unit.activation.handled &&
        offered("MOVE", unit.id),
    )
  )
    return cue("MOVE", FIRST_STEP_LINES_V7.MOVE);
  if (live("RESEARCH")) {
    const research = commands.filter(
      (command): command is Extract<CommandV7, { kind: "RESEARCH" }> =>
        command.kind === "RESEARCH",
    );
    if (research.length > 0) {
      // A resource in the player's land that an affordable technology
      // unlocks: the line names both.
      for (const tile of view.board.tiles) {
        if (
          !tile.explored ||
          tile.territoryOwnerId !== viewer ||
          tile.improvement !== null ||
          tile.resource === null
        )
          continue;
        const action = Object.values(BASIC_ECONOMIC_ACTIONS_V7).find(
          (rule) => rule.resource !== null && rule.resource === tile.resource,
        );
        if (
          action === undefined ||
          view.viewer.researchedTechs.includes(action.technology) ||
          !research.some((command) => command.tech === action.technology)
        )
          continue;
        const line = firstStepResearchLineV7(
          technologyDisplayNameV7(action.technology, view.viewer.faction),
          String(tile.resource),
        );
        if (line !== null) return cue("RESEARCH", line, null, "TECH");
      }
      return cue(
        "RESEARCH",
        view.viewer.researchedTechs.length === 0
          ? FIRST_STEP_LINES_V7.RESEARCH_FREE
          : FIRST_STEP_LINES_V7.RESEARCH,
        null,
        "TECH",
      );
    }
  }
  if (live("RESOURCE"))
    for (const kind of RESOURCE_ORDER) {
      const command = economic.find((candidate) => candidate.kind === kind);
      if (command !== undefined)
        return cue("RESOURCE", FIRST_STEP_RESOURCE_LINES_V7[kind], {
          kind: "TILE",
          at: command.at,
        });
    }
  if (
    live("END_TURN") &&
    commands.some((command) => command.kind === "END_TURN") &&
    !commands.some((command) => USEFUL_KINDS.has(command.kind))
  )
    return cue("END_TURN", FIRST_STEP_LINES_V7.END_TURN, null, "END_TURN");
  return null;
}
