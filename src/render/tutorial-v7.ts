import type {
  CommandV7,
  CoordV7,
  PlayerViewV7,
  TechnologyIdV7,
  UnitRoleIdV7,
} from "../engine/index";
import type { BoardSelectionV7 } from "./canvas/board-renderer-v7";
import type { FirstStepMarkerV7 } from "./first-steps-v7";

/**
 * The tutorial (bead pulp_wars-0yxy, docs/ui/SCREEN_FLOW.md "Tutorial"): a
 * guided first game on the `TUTORIAL_1` mission board. It is a real match;
 * for its first steps the interface offers exactly one command at a time.
 *
 * This module is the pure part: the script, the record of how far this
 * browser profile is, the one command a step lets through, and the cue (a
 * line, a marker on the board, a HUD button) that says what to do. The DOM
 * (app-view-v7.ts) filters the commands the engine offers through
 * `tutorialCommandsV7` before anything is drawn from them and refuses any
 * other command before it reaches the engine. The engine knows nothing of
 * the tutorial: no rule changes with it.
 */
export const TUTORIAL_MISSION_ID_V7 = "TUTORIAL_1";

export type TutorialStepIdV7 =
  | "RESEARCH"
  | "HARVEST"
  | "RESOURCES"
  | "MOVE"
  | "TRAIN"
  | "ATTACK"
  | "END_TURN"
  | "CAPTURE";

/**
 * The one command a step lets through, written by place (never by an ID):
 * the technology, the tile, the tile a unit stands on and the tile it acts
 * on. `null` on a step is an explanation with a Next button: no command.
 */
export type TutorialExpectationV7 =
  | { readonly kind: "RESEARCH"; readonly tech: TechnologyIdV7 }
  | { readonly kind: "HARVEST_FRUIT"; readonly at: CoordV7 }
  | { readonly kind: "MOVE"; readonly from: CoordV7; readonly to: CoordV7 }
  | {
      readonly kind: "TRAIN";
      readonly city: CoordV7;
      readonly role: UnitRoleIdV7;
    }
  | {
      readonly kind: "ATTACK";
      readonly from: CoordV7;
      readonly target: CoordV7;
    }
  | { readonly kind: "END_TURN" }
  | { readonly kind: "CAPTURE"; readonly at: CoordV7 };

export interface TutorialStepV7 {
  readonly id: TutorialStepIdV7;
  readonly expects: TutorialExpectationV7 | null;
  /** The line with nothing of the step selected. */
  readonly line: string;
  /** The line once the step's unit, city or tile is selected. */
  readonly selectedLine?: string;
  /** The line inside the technology screen (the research step). */
  readonly techLine?: string;
}

/** Places of the `TUTORIAL_1` board (src/engine/v7/missions/tutorial.ts). */
export const TUTORIAL_PLACES_V7 = {
  capital: { x: 2, y: 8 },
  fruit: { x: 1, y: 9 },
  walker: { x: 4, y: 8 },
  village: { x: 5, y: 8 },
  attacker: { x: 3, y: 7 },
  enemy: { x: 4, y: 6 },
} as const satisfies Readonly<Record<string, CoordV7>>;

/**
 * The script. Turn 1: research, harvest, the resources, move, train,
 * attack, end the turn. Turn 2: capture the village the unit walked onto
 * (a capture needs a unit that began its turn there).
 */
export const TUTORIAL_STEPS_V7: readonly TutorialStepV7[] = [
  {
    id: "RESEARCH",
    expects: { kind: "RESEARCH", tech: "GATHERING" },
    line: "Technologies unlock new things. Your first is free: open Tech.",
    techLine: "Pick Gathering, then Research.",
  },
  {
    id: "HARVEST",
    expects: { kind: "HARVEST_FRUIT", at: TUTORIAL_PLACES_V7.fruit },
    line: "Tap the fruit in your land.",
    selectedLine: "Press Harvest: it costs 2 Coins.",
  },
  {
    id: "RESOURCES",
    expects: null,
    line: "Coins pay for everything, and your cities earn them every turn. The fruit fed your city: fill its population and it grows and earns more.",
  },
  {
    id: "MOVE",
    expects: {
      kind: "MOVE",
      from: TUTORIAL_PLACES_V7.walker,
      to: TUTORIAL_PLACES_V7.village,
    },
    line: "Tap this Fighter to move it.",
    selectedLine: "Tap the village to walk there.",
  },
  {
    id: "TRAIN",
    expects: {
      kind: "TRAIN",
      city: TUTORIAL_PLACES_V7.capital,
      role: "FIGHTER",
    },
    line: "Tap your city to train a unit.",
    selectedLine: "Train a Fighter for 2 Coins.",
  },
  {
    id: "ATTACK",
    expects: {
      kind: "ATTACK",
      from: TUTORIAL_PLACES_V7.attacker,
      target: TUTORIAL_PLACES_V7.enemy,
    },
    line: "A Goblin! Tap this Fighter.",
    selectedLine: "Tap the Goblin to attack it.",
  },
  {
    id: "END_TURN",
    expects: { kind: "END_TURN" },
    line: "Each unit acts once a turn. End your turn.",
  },
  {
    id: "CAPTURE",
    expects: { kind: "CAPTURE", at: TUTORIAL_PLACES_V7.village },
    line: "A unit that starts its turn on a village can take it. Tap this Fighter.",
    selectedLine: "Press Capture: the village becomes your city.",
  },
];

/** The line after the last step; it takes no command and blocks nothing. */
export const TUTORIAL_FAREWELL_V7 =
  "You're on your own. Take the Goblin city to win.";

/** The Skip control, and what refusing a command says. */
export const TUTORIAL_SKIP_LABEL_V7 = "Skip tutorial";
export const TUTORIAL_NEXT_LABEL_V7 = "Next";
export const TUTORIAL_REFUSED_V7 = "Follow the tutorial step first.";

/**
 * What this browser profile has done; it is not part of any save.
 * `step` is the index of the step the running tutorial is at, or null when
 * no tutorial is running (never started, finished, or skipped).
 */
export interface TutorialProgressV7 {
  /** The tutorial was finished or skipped at least once. */
  readonly completed: boolean;
  readonly step: number | null;
}

export const NEW_TUTORIAL_PROGRESS_V7: TutorialProgressV7 = Object.freeze({
  completed: false,
  step: null,
});

export const TUTORIAL_STORAGE_KEY_V7 = "pulpWars.ruleset7.tutorial.v1";

/** Reads a stored record; anything missing or malformed is a new profile. */
export function parseTutorialProgressV7(
  stored: string | null | undefined,
): TutorialProgressV7 {
  if (stored === null || stored === undefined) return NEW_TUTORIAL_PROGRESS_V7;
  let parsed: unknown;
  try {
    parsed = JSON.parse(stored);
  } catch {
    return NEW_TUTORIAL_PROGRESS_V7;
  }
  if (typeof parsed !== "object" || parsed === null)
    return NEW_TUTORIAL_PROGRESS_V7;
  const record = parsed as Record<string, unknown>;
  if (record.version !== 1 || typeof record.completed !== "boolean")
    return NEW_TUTORIAL_PROGRESS_V7;
  const step =
    typeof record.step === "number" &&
    Number.isSafeInteger(record.step) &&
    record.step >= 0 &&
    record.step < TUTORIAL_STEPS_V7.length
      ? record.step
      : null;
  return { completed: record.completed, step };
}

export function serializeTutorialProgressV7(
  progress: TutorialProgressV7,
): string {
  return JSON.stringify({
    version: 1,
    completed: progress.completed,
    step: progress.step,
  });
}

/** The tutorial match was just started (or restarted): the first step. */
export function startTutorialV7(
  progress: TutorialProgressV7,
): TutorialProgressV7 {
  return { ...progress, step: 0 };
}

/** Skip tutorial: the rest of the match is an ordinary game. */
export function skipTutorialV7(
  progress: TutorialProgressV7,
): TutorialProgressV7 {
  return progress.step === null ? progress : { completed: true, step: null };
}

/** The step the running tutorial is at, or null. */
export function tutorialStepV7(
  progress: TutorialProgressV7,
): TutorialStepV7 | null {
  return progress.step === null
    ? null
    : (TUTORIAL_STEPS_V7[progress.step] ?? null);
}

/** Whether this match is the tutorial board. */
export function isTutorialMatchV7(view: PlayerViewV7 | null): boolean {
  return view?.setup.mission?.id === TUTORIAL_MISSION_ID_V7;
}

/**
 * Whether the tutorial forces this match now: its board, a step still to
 * do, and the match not over.
 */
export function tutorialActiveV7(
  progress: TutorialProgressV7,
  view: PlayerViewV7 | null,
): boolean {
  return (
    view !== null &&
    isTutorialMatchV7(view) &&
    view.outcome === null &&
    tutorialStepV7(progress) !== null
  );
}

const same = (left: CoordV7, right: CoordV7): boolean =>
  left.x === right.x && left.y === right.y;

/** The viewer's living unit on a tile, or undefined. */
function ownUnitAt(view: PlayerViewV7, at: CoordV7) {
  return view.units.find(
    (unit) =>
      unit.ownerId === view.viewer.id && unit.hp > 0 && same(unit.at, at),
  );
}

/** Whether a command is the one an expectation names, read in this view. */
export function tutorialCommandMatchesV7(
  expects: TutorialExpectationV7,
  view: PlayerViewV7,
  command: CommandV7,
): boolean {
  switch (expects.kind) {
    case "RESEARCH":
      return command.kind === "RESEARCH" && command.tech === expects.tech;
    case "HARVEST_FRUIT":
      return command.kind === "HARVEST_FRUIT" && same(command.at, expects.at);
    case "MOVE": {
      if (command.kind !== "MOVE") return false;
      const end = command.path[command.path.length - 1];
      return (
        command.unitId === ownUnitAt(view, expects.from)?.id &&
        end !== undefined &&
        same(end, expects.to)
      );
    }
    case "TRAIN":
      return (
        command.kind === "TRAIN" &&
        command.role === expects.role &&
        view.cities.some(
          (city) =>
            city.id === command.cityId &&
            city.ownerId === view.viewer.id &&
            same(city.at, expects.city),
        )
      );
    case "ATTACK":
      return (
        command.kind === "ATTACK" &&
        command.unitId === ownUnitAt(view, expects.from)?.id &&
        view.units.some(
          (unit) =>
            unit.id === command.targetUnitId &&
            unit.ownerId !== view.viewer.id &&
            same(unit.at, expects.target),
        )
      );
    case "END_TURN":
      return command.kind === "END_TURN";
    case "CAPTURE":
      return (
        command.kind === "CAPTURE" &&
        command.unitId === ownUnitAt(view, expects.at)?.id
      );
  }
}

/**
 * The offered command the current step expects, or null: an explanation
 * step, no step, or a step whose command the engine does not offer.
 */
export function tutorialExpectedCommandV7(
  progress: TutorialProgressV7,
  view: PlayerViewV7,
  offered: readonly CommandV7[],
): CommandV7 | null {
  const expects = tutorialStepV7(progress)?.expects ?? null;
  if (expects === null) return null;
  return (
    offered.find((command) =>
      tutorialCommandMatchesV7(expects, view, command),
    ) ?? null
  );
}

/**
 * The commands the interface may use now: all the engine offers when the
 * tutorial does not force this match, otherwise the step's one command (or
 * none, on an explanation step). Everything the interface draws from the
 * offered commands (highlights, buttons, End turn) follows from this.
 */
export function tutorialCommandsV7(
  progress: TutorialProgressV7,
  view: PlayerViewV7 | null,
  offered: readonly CommandV7[],
): readonly CommandV7[] {
  if (view === null || !tutorialActiveV7(progress, view)) return offered;
  const expected = tutorialExpectedCommandV7(progress, view, offered);
  return expected === null ? [] : [expected];
}

/** Whether a command may go to the engine now. */
export function tutorialAcceptsV7(
  progress: TutorialProgressV7,
  view: PlayerViewV7 | null,
  command: CommandV7,
): boolean {
  if (view === null || !tutorialActiveV7(progress, view)) return true;
  const expects = tutorialStepV7(progress)?.expects ?? null;
  return expects !== null && tutorialCommandMatchesV7(expects, view, command);
}

/** The next step, or the end of the tutorial after the last one. */
function next(progress: TutorialProgressV7): TutorialProgressV7 {
  if (progress.step === null) return progress;
  const step = progress.step + 1;
  return step >= TUTORIAL_STEPS_V7.length
    ? { completed: true, step: null }
    : { ...progress, step };
}

/**
 * The record after the engine accepted a command of the player: the next
 * step when it was the step's command (`view` is the view the command was
 * given in), unchanged otherwise.
 */
export function advanceTutorialV7(
  progress: TutorialProgressV7,
  view: PlayerViewV7,
  command: CommandV7,
): TutorialProgressV7 {
  if (!tutorialActiveV7(progress, view)) return progress;
  const expects = tutorialStepV7(progress)?.expects ?? null;
  return expects !== null && tutorialCommandMatchesV7(expects, view, command)
    ? next(progress)
    : progress;
}

/** Next on an explanation step. Unchanged on a step that wants a command. */
export function acknowledgeTutorialV7(
  progress: TutorialProgressV7,
): TutorialProgressV7 {
  const step = tutorialStepV7(progress);
  return step !== null && step.expects === null ? next(progress) : progress;
}

/**
 * The tutorial never traps a player: on the player's own turn (`offered` is
 * what the engine offers, not empty) a step whose command is not offered
 * ends the tutorial, and the match goes on as an ordinary game. Unchanged
 * when the step can be done, on an explanation, and during other turns.
 */
export function reconcileTutorialV7(
  progress: TutorialProgressV7,
  view: PlayerViewV7 | null,
  offered: readonly CommandV7[],
): TutorialProgressV7 {
  if (view === null || !tutorialActiveV7(progress, view)) return progress;
  if (
    offered.length === 0 ||
    view.turnOrder[view.activeSeatIndex] !== view.viewer.id ||
    tutorialStepV7(progress)?.expects === null
  )
    return progress;
  return tutorialExpectedCommandV7(progress, view, offered) === null
    ? skipTutorialV7(progress)
    : progress;
}

export interface TutorialCueV7 {
  readonly step: TutorialStepIdV7;
  /** "3 / 8": the step's number, from 1, and how many there are. */
  readonly number: number;
  readonly count: number;
  readonly line: string;
  readonly marker: FirstStepMarkerV7 | null;
  readonly button: "TECH" | "END_TURN" | null;
  readonly buttonMotion: "PULSE" | "STILL";
  /** An explanation: the line has a Next button. */
  readonly next: boolean;
  /** The technology to pick in the technology screen, or null. */
  readonly technology: TechnologyIdV7 | null;
}

export interface TutorialCueInputV7 {
  readonly progress: TutorialProgressV7;
  readonly view: PlayerViewV7;
  readonly selection: BoardSelectionV7 | null;
  /**
   * The player can act: their turn, nothing playing, no dialog open. The
   * technology screen may be open (`technologyOpen`).
   */
  readonly ready: boolean;
  readonly technologyOpen: boolean;
  readonly motion: "FULL" | "REDUCED";
}

/**
 * The cue of the current step, or null: no tutorial, or the player cannot
 * act now. The marker points at what to tap next: the step's unit, city or
 * tile, then (a move, an attack) its target.
 */
export function tutorialCueV7(input: TutorialCueInputV7): TutorialCueV7 | null {
  const { progress, view, selection } = input;
  const step = tutorialStepV7(progress);
  if (step === null || !input.ready || !tutorialActiveV7(progress, view))
    return null;
  const motion = input.motion === "FULL" ? "HOP" : "STILL";
  const mark = (
    kind: FirstStepMarkerV7["kind"],
    at: CoordV7,
  ): FirstStepMarkerV7 => ({ kind, at, motion });
  const unitSelected = (at: CoordV7): boolean =>
    selection?.kind === "UNIT" && selection.unitId === ownUnitAt(view, at)?.id;
  let line = step.line;
  let marker: FirstStepMarkerV7 | null = null;
  let button: TutorialCueV7["button"] = null;
  const expects = step.expects;
  const selectedLine = step.selectedLine ?? step.line;
  switch (expects?.kind) {
    case undefined:
      break;
    case "RESEARCH":
      button = "TECH";
      if (input.technologyOpen) line = step.techLine ?? step.line;
      break;
    case "HARVEST_FRUIT":
      if (selection?.kind === "TILE" && same(selection.at, expects.at))
        line = selectedLine;
      else marker = mark("TILE", expects.at);
      break;
    case "MOVE":
      if (unitSelected(expects.from)) {
        line = selectedLine;
        marker = mark("TILE", expects.to);
      } else marker = mark("UNIT", expects.from);
      break;
    case "TRAIN":
      if (
        selection?.kind === "CITY" &&
        view.cities.some(
          (city) => city.id === selection.cityId && same(city.at, expects.city),
        )
      )
        line = selectedLine;
      else marker = mark("CITY", expects.city);
      break;
    case "ATTACK":
      if (unitSelected(expects.from)) {
        line = selectedLine;
        marker = mark("UNIT", expects.target);
      } else marker = mark("UNIT", expects.from);
      break;
    case "END_TURN":
      button = "END_TURN";
      break;
    case "CAPTURE":
      if (unitSelected(expects.at)) line = selectedLine;
      else marker = mark("UNIT", expects.at);
      break;
  }
  return {
    step: step.id,
    number: (progress.step ?? 0) + 1,
    count: TUTORIAL_STEPS_V7.length,
    line,
    // Nothing is marked on a board behind the technology screen.
    marker: input.technologyOpen ? null : marker,
    button,
    buttonMotion: input.motion === "FULL" ? "PULSE" : "STILL",
    next: expects === null,
    technology: expects?.kind === "RESEARCH" ? expects.tech : null,
  };
}
