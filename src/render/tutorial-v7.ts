import type {
  CommandV7,
  CoordV7,
  PlayerViewV7,
  TechnologyIdV7,
  TileCommandKindV7,
  UnitId,
  UnitRoleIdV7,
} from "../engine/index";
import type { BoardSelectionV7 } from "./canvas/board-renderer-v7";
import type { FirstStepMarkerV7 } from "./first-steps-v7";
import { unitLabelV7 } from "./undead-presentation-v7";

/**
 * The tutorial (beads pulp_wars-0yxy, pulp_wars-2yc.115 and
 * pulp_wars-2yc.119, docs/ui/SCREEN_FLOW.md "Tutorial"): a guided first
 * game on the `TUTORIAL_1` mission board, eight turns long. It is a real
 * match, shown with the real interface: every highlight, dock button,
 * technology and reward the engine offers is drawn, and only the commands
 * of the step at hand go through.
 *
 * This module is the pure part: the script, the record of how far this
 * browser profile is, the commands a step lets through, and the cue (a
 * line, the one thing that pulses, a still look-here ring on a read step)
 * that says what to do. The DOM (app-view-v7.ts) refuses any other
 * command before it reaches the engine, with a nudge that says where the
 * glow is. The engine knows nothing of the tutorial: no rule changes with
 * it.
 */
export const TUTORIAL_MISSION_ID_V7 = "TUTORIAL_1";

export type TutorialStepIdV7 =
  | "HARVEST"
  | "RESOURCES"
  | "MOVE"
  | "TRAIN"
  | "DETAILS"
  | "DETAILS_INFO"
  | "ATTACK"
  | "END_TURN_1"
  | "CAPTURE"
  | "FARM"
  | "END_TURN_2"
  | "WINDMILL"
  | "WINDMILL_INFO"
  | "LUMBER_CAMP"
  | "END_TURN_3"
  | "CRAFTING"
  | "ORE"
  | "WORKSHOP"
  | "END_TURN_4"
  | "ENGINEERING"
  | "CLIMB"
  | "MINE"
  | "END_TURN_5"
  | "ROAD_NEAR"
  | "ROAD_FAR"
  | "LINK"
  | "END_TURN_6"
  | "REINFORCED"
  | "ROAD_MOVE"
  | "END_TURN_7"
  | "RALLY"
  | "INSPIRED"
  | "CHARGE"
  | "OVERRUN_1"
  | "OVERRUN_2"
  | "OVERRUN_3";

/**
 * What a step waits for, written by place (never by an ID): the
 * technology, the tile, the tile a unit stands on and the tile it acts on.
 * Every kind but `UNIT_HELP` is one command; `UNIT_HELP` is the `?` card
 * of the unit on `at` being opened. `null` on a step is an explanation
 * with a Next button.
 */
export type TutorialExpectationV7 =
  | { readonly kind: "RESEARCH"; readonly tech: TechnologyIdV7 }
  | {
      readonly kind: "TILE";
      readonly command: TileCommandKindV7;
      readonly at: CoordV7;
    }
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
  | { readonly kind: "RALLY"; readonly at: CoordV7 }
  | { readonly kind: "END_TURN" }
  | { readonly kind: "CAPTURE"; readonly at: CoordV7 }
  | { readonly kind: "UNIT_HELP"; readonly at: CoordV7 };

export interface TutorialStepV7 {
  readonly id: TutorialStepIdV7;
  readonly expects: TutorialExpectationV7 | null;
  /**
   * The line with nothing of the step selected. `{unit}` is the name of
   * the unit the step names by its tile (a city's reward may have put a
   * Raider or a giant there).
   */
  readonly line: string;
  /** The line once the step's unit, city or tile is selected. */
  readonly selectedLine?: string;
  /** The line inside the technology screen (a research step). */
  readonly techLine?: string;
  /**
   * A read step's marker: what it talks about on the board, drawn as a
   * still look-here ring (bead pulp_wars-2yc.119).
   */
  readonly marker?: Omit<FirstStepMarkerV7, "motion" | "frame" | "style">;
  /**
   * Tiles the camera brings into view with the step's first marker (the
   * Knight's field on a phone): the marker's `frame`.
   */
  readonly frame?: readonly CoordV7[];
  /**
   * Steps of one group may be done in any order (bead pulp_wars-2yc.115):
   * at a step of the group, the command of every later step of the group
   * not yet done is let through too. A step done early is skipped when the
   * script reaches it. Explanations between them keep their place.
   */
  readonly group?: string;
}

/** Places of the `TUTORIAL_1` board (src/engine/v7/missions/tutorial.ts). */
export const TUTORIAL_PLACES_V7 = {
  capital: { x: 2, y: 8 },
  fruit: { x: 1, y: 9 },
  walker: { x: 4, y: 8 },
  village: { x: 5, y: 8 },
  attacker: { x: 3, y: 7 },
  enemy: { x: 4, y: 6 },
  fertile: { x: 1, y: 8 },
  windmill: { x: 2, y: 9 },
  forest: { x: 1, y: 7 },
  ore: { x: 6, y: 9 },
  workshop: { x: 2, y: 7 },
  // Bead pulp_wars-2yc.119: the bare mountain beside the lone Goblin's
  // tile, where the first Fighter stands once it has won.
  peak: { x: 3, y: 6 },
  roadNear: { x: 3, y: 8 },
  roadFar: { x: 4, y: 8 },
  knight: { x: 6, y: 5 },
  captain: { x: 5, y: 5 },
  charge: { x: 7, y: 5 },
  goblin1: { x: 8, y: 5 },
  goblin2: { x: 9, y: 5 },
  goblin3: { x: 10, y: 5 },
} as const satisfies Readonly<Record<string, CoordV7>>;

const P = TUTORIAL_PLACES_V7;
const END_TURN = { kind: "END_TURN" } as const;

/**
 * The script, eight turns. Turn 1: harvest, the resources, move, train, a
 * unit's `?` card, attack. Turn 2: capture the village, a Farm. Turn 3: a
 * Windmill beside it and a Lumber Camp. Turn 4: Crafting (the Ore appears)
 * and a Workshop. Turn 5: Engineering (a unit climbs a mountain) and a
 * Mine on the Ore. Turn 6: two Roads join the cities. Turn 7: a Fighter
 * walks the Road two tiles; a Knight and a Captain have arrived. Turn 8:
 * the Captain's Rally, then the Knight kills three Goblins with Overrun.
 */
export const TUTORIAL_STEPS_V7: readonly TutorialStepV7[] = [
  // Turn 1.
  {
    id: "HARVEST",
    expects: { kind: "TILE", command: "HARVEST_FRUIT", at: P.fruit },
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
    expects: { kind: "MOVE", from: P.walker, to: P.village },
    line: "Tap this Fighter to move it.",
    selectedLine: "Tap the village to walk there.",
  },
  {
    id: "TRAIN",
    expects: { kind: "TRAIN", city: P.capital, role: "FIGHTER" },
    line: "Tap your city to train a unit.",
    selectedLine: "Train a Fighter for 2 Coins.",
  },
  {
    id: "DETAILS",
    expects: { kind: "UNIT_HELP", at: P.attacker },
    line: "Every unit has a card that tells you about it. Tap this Fighter.",
    selectedLine: "Press the ? beside its name.",
  },
  {
    id: "DETAILS_INFO",
    expects: null,
    line: "The card lists what a unit can do and its numbers. Open it whenever a unit is new to you.",
  },
  {
    id: "ATTACK",
    expects: { kind: "ATTACK", from: P.attacker, target: P.enemy },
    line: "A Goblin! Tap this Fighter.",
    selectedLine: "Tap the Goblin to attack it.",
  },
  {
    id: "END_TURN_1",
    expects: END_TURN,
    line: "Each unit acts once a turn. End your turn.",
  },
  // Turn 2.
  {
    id: "CAPTURE",
    group: "TURN_2",
    expects: { kind: "CAPTURE", at: P.village },
    line: "A unit that starts its turn on a village can take it. Tap this Fighter.",
    selectedLine: "Press Capture: the village becomes your city.",
  },
  {
    id: "FARM",
    group: "TURN_2",
    expects: { kind: "TILE", command: "BUILD_FARM", at: P.fertile },
    line: "This is fertile ground. Tap it.",
    selectedLine: "Build a Farm: +2 population for 5 Coins.",
  },
  {
    id: "END_TURN_2",
    expects: END_TURN,
    line: "A city that fills its population grows a level. End your turn.",
  },
  // Turn 3.
  {
    id: "WINDMILL",
    group: "TURN_3",
    expects: { kind: "TILE", command: "BUILD_WINDMILL", at: P.windmill },
    line: "A Windmill works the Farms beside it. Tap this tile.",
    selectedLine: "Build a Windmill for 5 Coins.",
  },
  {
    id: "WINDMILL_INFO",
    expects: null,
    line: "The Windmill gives +1 population for each Farm next to it.",
    marker: { kind: "TILE", at: P.windmill },
  },
  {
    id: "LUMBER_CAMP",
    group: "TURN_3",
    expects: { kind: "TILE", command: "BUILD_LUMBER_CAMP", at: P.forest },
    line: "Forests feed cities too. Tap this forest.",
    selectedLine: "Build a Lumber Camp: +1 population for 3 Coins.",
  },
  {
    id: "END_TURN_3",
    expects: END_TURN,
    line: "Buildings keep their population for good. End your turn.",
  },
  // Turn 4.
  {
    id: "CRAFTING",
    expects: { kind: "RESEARCH", tech: "DRILL" },
    line: "Technologies unlock new things. Open Tech.",
    techLine: "Pick Crafting, then Research.",
  },
  {
    id: "ORE",
    expects: null,
    line: "Crafting revealed Ore on this mountain. A Mine on it needs Engineering, next turn.",
    marker: { kind: "TILE", at: P.ore },
  },
  {
    id: "WORKSHOP",
    expects: { kind: "TILE", command: "BUILD_WORKSHOP", at: P.workshop },
    line: "Crafting also gives the Workshop. Tap this tile beside your Farm and Lumber Camp.",
    selectedLine:
      "Build a Workshop: +1, and +1 for each kind of building next to it.",
  },
  {
    id: "END_TURN_4",
    expects: END_TURN,
    line: "Your capital is growing fast. End your turn.",
  },
  // Turn 5.
  {
    id: "ENGINEERING",
    expects: { kind: "RESEARCH", tech: "ENGINEERING" },
    line: "Engineering lets units climb mountains and opens Mines. Open Tech.",
    techLine: "Pick Engineering, then Research.",
  },
  {
    id: "CLIMB",
    group: "TURN_5",
    // The Fighter that won turn 1's fight stands on the Goblin's tile.
    expects: { kind: "MOVE", from: P.enemy, to: P.peak },
    line: "Mountains are open now. Tap this Fighter.",
    selectedLine: "Tap the mountain to climb it.",
  },
  {
    id: "MINE",
    group: "TURN_5",
    expects: { kind: "TILE", command: "BUILD_MINE", at: P.ore },
    line: "Now the Ore can be mined. Tap it.",
    selectedLine: "Build a Mine: +2 population for 5 Coins.",
  },
  {
    id: "END_TURN_5",
    expects: END_TURN,
    line: "End your turn.",
  },
  // Turn 6.
  {
    id: "ROAD_NEAR",
    group: "TURN_6",
    expects: { kind: "TILE", command: "BUILD_ROAD", at: P.roadNear },
    line: "Roads join your cities. Tap this tile.",
    selectedLine: "Build a Road for 2 Coins.",
  },
  {
    id: "ROAD_FAR",
    group: "TURN_6",
    expects: { kind: "TILE", command: "BUILD_ROAD", at: P.roadFar },
    line: "One more Road tile reaches your second city. Tap it.",
    selectedLine: "Build a Road for 2 Coins.",
  },
  {
    id: "LINK",
    expects: null,
    line: "Joined to your capital by Road: +1 population here, and +1 in the capital.",
    marker: { kind: "CITY", at: P.village },
  },
  {
    id: "END_TURN_6",
    expects: END_TURN,
    line: "End your turn.",
  },
  // Turn 7.
  {
    id: "REINFORCED",
    expects: null,
    line: "Help has arrived: a Knight and a Captain. They fight next turn.",
    marker: { kind: "UNIT", at: P.knight },
    frame: [P.captain],
  },
  {
    id: "ROAD_MOVE",
    expects: { kind: "MOVE", from: P.capital, to: P.roadFar },
    line: "Roads also speed units up. Tap this {unit}.",
    selectedLine: "On the Road it walks two tiles: tap here.",
  },
  {
    id: "END_TURN_7",
    expects: END_TURN,
    line: "Goblins are coming. End your turn.",
  },
  // Turn 8.
  {
    id: "RALLY",
    expects: { kind: "RALLY", at: P.captain },
    line: "Three Goblins! First tap your Captain.",
    selectedLine: "Press Rally: the units beside him get +1 Attack.",
    frame: [P.knight, P.goblin1, P.goblin2, P.goblin3],
  },
  {
    id: "INSPIRED",
    expects: null,
    // A read step says nothing to tap (bead pulp_wars-2yc.119): the chip is
    // on the Knight's card when the next step selects it.
    line: "Your Knight is Inspired: its next attack hits harder. Its card shows the chip.",
    marker: { kind: "UNIT", at: P.knight },
  },
  {
    id: "CHARGE",
    expects: { kind: "MOVE", from: P.knight, to: P.charge },
    line: "Knights move far. Tap the Knight.",
    selectedLine: "Ride up to the Goblins: tap here.",
    frame: [P.goblin1, P.goblin2, P.goblin3],
  },
  {
    id: "OVERRUN_1",
    expects: { kind: "ATTACK", from: P.charge, target: P.goblin1 },
    line: "Tap the Knight.",
    selectedLine: "Attack the first Goblin.",
  },
  {
    id: "OVERRUN_2",
    expects: { kind: "ATTACK", from: P.goblin1, target: P.goblin2 },
    line: "A kill lets a Knight attack again. Tap the Knight.",
    selectedLine: "A kill lets a Knight attack again: tap the next Goblin.",
  },
  {
    id: "OVERRUN_3",
    expects: { kind: "ATTACK", from: P.goblin2, target: P.goblin3 },
    line: "Tap the Knight.",
    selectedLine: "And again: tap the last Goblin.",
  },
];

/** The line after the last step; it takes no command and blocks nothing. */
export const TUTORIAL_FAREWELL_V7 =
  "Three kills in one turn! Help in the Menu explains the rest; take the Goblin city to win.";

/** The Skip control, and what refusing a command says. */
export const TUTORIAL_SKIP_LABEL_V7 = "Skip tutorial";
export const TUTORIAL_NEXT_LABEL_V7 = "Next";
export const TUTORIAL_REFUSED_V7 = "Follow the tutorial step first.";

/**
 * What this browser profile has done; it is not part of any save.
 * `step` is the index of the step the running tutorial is at, or null when
 * no tutorial is running (never started, finished, or skipped). `ahead`
 * holds the later steps of the current group already done, in order; it
 * is absent when there are none.
 */
export interface TutorialProgressV7 {
  /** The tutorial was finished or skipped at least once. */
  readonly completed: boolean;
  readonly step: number | null;
  readonly ahead?: readonly number[];
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
  // Steps done early: later steps of the current step's group, in order.
  const ahead =
    step !== null && Array.isArray(record.ahead)
      ? (record.ahead as unknown[]).filter(
          (index): index is number =>
            typeof index === "number" &&
            Number.isSafeInteger(index) &&
            index > step &&
            index < TUTORIAL_STEPS_V7.length,
        )
      : [];
  return ahead.length > 0
    ? {
        completed: record.completed,
        step,
        ahead: [...new Set(ahead)].sort((left, right) => left - right),
      }
    : { completed: record.completed, step };
}

export function serializeTutorialProgressV7(
  progress: TutorialProgressV7,
): string {
  return JSON.stringify({
    version: 1,
    completed: progress.completed,
    step: progress.step,
    ...(progress.ahead !== undefined && progress.ahead.length > 0
      ? { ahead: progress.ahead }
      : {}),
  });
}

/** The tutorial match was just started (or restarted): the first step. */
export function startTutorialV7(
  progress: TutorialProgressV7,
): TutorialProgressV7 {
  return { completed: progress.completed, step: 0 };
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

/** A step that waits for one command (not an explanation, not a card). */
type CommandExpectationV7 = Exclude<
  TutorialExpectationV7,
  { readonly kind: "UNIT_HELP" }
>;

const commandExpectation = (
  expects: TutorialExpectationV7 | null,
): CommandExpectationV7 | null =>
  expects === null || expects.kind === "UNIT_HELP" ? null : expects;

/** Whether a command is the one an expectation names, read in this view. */
export function tutorialCommandMatchesV7(
  expects: TutorialExpectationV7,
  view: PlayerViewV7,
  command: CommandV7,
): boolean {
  switch (expects.kind) {
    case "RESEARCH":
      return command.kind === "RESEARCH" && command.tech === expects.tech;
    case "TILE":
      return (
        command.kind === expects.command &&
        "at" in command &&
        same(command.at, expects.at)
      );
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
    case "RALLY":
      return (
        command.kind === "RALLY" &&
        command.unitId === ownUnitAt(view, expects.at)?.id
      );
    case "END_TURN":
      return command.kind === "END_TURN";
    case "CAPTURE":
      return (
        command.kind === "CAPTURE" &&
        command.unitId === ownUnitAt(view, expects.at)?.id
      );
    case "UNIT_HELP":
      return false;
  }
}

/**
 * The command steps open now: the current step and the later steps of its
 * group that are not done yet, each with its index.
 */
function openSteps(progress: TutorialProgressV7): readonly {
  readonly index: number;
  readonly expects: CommandExpectationV7;
}[] {
  const current = progress.step;
  if (current === null) return [];
  const step = TUTORIAL_STEPS_V7[current];
  if (step === undefined) return [];
  const own = commandExpectation(step.expects);
  if (own === null) return [];
  const open = [{ index: current, expects: own }];
  if (step.group === undefined) return open;
  const ahead = progress.ahead ?? [];
  TUTORIAL_STEPS_V7.forEach((later, index) => {
    const expects = commandExpectation(later.expects);
    if (
      index > current &&
      later.group === step.group &&
      expects !== null &&
      !ahead.includes(index)
    )
      open.push({ index, expects });
  });
  return open;
}

/**
 * The city rewards a level brings are the real choice (bead
 * pulp_wars-2yc.119): the panel offers both of a level's rewards and
 * either may be taken. The board is laid out so that neither choice
 * breaks a later lesson (docs/ui/SCREEN_FLOW.md "Tutorial").
 */
const rewardChoice = (command: CommandV7): boolean =>
  command.kind === "CHOOSE_CITY_REWARD";

/**
 * The offered command the current step expects, or null: an explanation
 * step, a card step, no step, or a step whose command the engine does not
 * offer.
 */
export function tutorialExpectedCommandV7(
  progress: TutorialProgressV7,
  view: PlayerViewV7,
  offered: readonly CommandV7[],
): CommandV7 | null {
  const expects = commandExpectation(tutorialStepV7(progress)?.expects ?? null);
  if (expects === null) return null;
  return (
    offered.find((command) =>
      tutorialCommandMatchesV7(expects, view, command),
    ) ?? null
  );
}

/**
 * The commands the tutorial lets through now: all the engine offers when
 * the tutorial does not force this match, otherwise the step's one command
 * (and one for each open step of its group; none on an explanation or a
 * card), and both of a city reward's choices. The interface draws every
 * offered command (bead pulp_wars-2yc.119: the real highlights, buttons
 * and End turn); `tutorialAcceptsV7` refuses the others when sent.
 */
export function tutorialCommandsV7(
  progress: TutorialProgressV7,
  view: PlayerViewV7 | null,
  offered: readonly CommandV7[],
): readonly CommandV7[] {
  if (view === null || !tutorialActiveV7(progress, view)) return offered;
  const allowed: CommandV7[] = [];
  for (const { expects } of openSteps(progress)) {
    const command = offered.find((candidate) =>
      tutorialCommandMatchesV7(expects, view, candidate),
    );
    if (command !== undefined && !allowed.includes(command))
      allowed.push(command);
  }
  allowed.push(...offered.filter(rewardChoice));
  return allowed;
}

/** Whether a command may go to the engine now. */
export function tutorialAcceptsV7(
  progress: TutorialProgressV7,
  view: PlayerViewV7 | null,
  command: CommandV7,
): boolean {
  if (view === null || !tutorialActiveV7(progress, view)) return true;
  if (rewardChoice(command)) return true;
  return openSteps(progress).some(({ expects }) =>
    tutorialCommandMatchesV7(expects, view, command),
  );
}

/**
 * The next step after the current one, past the steps done early, or the
 * end of the tutorial after the last one.
 */
function next(progress: TutorialProgressV7): TutorialProgressV7 {
  if (progress.step === null) return progress;
  const ahead = progress.ahead ?? [];
  let step = progress.step + 1;
  while (ahead.includes(step)) step += 1;
  if (step >= TUTORIAL_STEPS_V7.length) return { completed: true, step: null };
  const rest = ahead.filter((index) => index > step);
  return rest.length > 0
    ? { completed: progress.completed, step, ahead: rest }
    : { completed: progress.completed, step };
}

/**
 * The record after the engine accepted a command of the player (`view` is
 * the view the command was given in): the next step when it was the
 * step's command, the step marked done early when it was a later step of
 * the group, unchanged otherwise (a reward choice, say).
 */
export function advanceTutorialV7(
  progress: TutorialProgressV7,
  view: PlayerViewV7,
  command: CommandV7,
): TutorialProgressV7 {
  if (!tutorialActiveV7(progress, view)) return progress;
  const done = openSteps(progress).find(({ expects }) =>
    tutorialCommandMatchesV7(expects, view, command),
  );
  if (done === undefined) return progress;
  if (done.index === progress.step) return next(progress);
  const ahead = [...(progress.ahead ?? []), done.index].sort(
    (left, right) => left - right,
  );
  return { ...progress, ahead };
}

/** Next on an explanation step. Unchanged on a step that wants something. */
export function acknowledgeTutorialV7(
  progress: TutorialProgressV7,
): TutorialProgressV7 {
  const step = tutorialStepV7(progress);
  return step !== null && step.expects === null ? next(progress) : progress;
}

/**
 * The `?` card of a unit was opened (bead pulp_wars-2yc.115): the next
 * step when the step asked for that unit's card, unchanged otherwise.
 */
export function noteTutorialUnitHelpV7(
  progress: TutorialProgressV7,
  view: PlayerViewV7 | null,
  unitId: UnitId,
): TutorialProgressV7 {
  if (view === null || !tutorialActiveV7(progress, view)) return progress;
  const expects = tutorialStepV7(progress)?.expects ?? null;
  return expects?.kind === "UNIT_HELP" &&
    ownUnitAt(view, expects.at)?.id === unitId
    ? next(progress)
    : progress;
}

/**
 * The tutorial never traps a player: on the player's own turn (`offered` is
 * what the engine offers, not empty) a step whose command is not offered
 * (nor that of an open step of its group), or a card step whose unit is
 * gone, ends the tutorial, and the match goes on as an ordinary game.
 * Unchanged when the step can be done, on an explanation, while a city's
 * reward waits to be chosen, and during other turns.
 */
export function reconcileTutorialV7(
  progress: TutorialProgressV7,
  view: PlayerViewV7 | null,
  offered: readonly CommandV7[],
): TutorialProgressV7 {
  if (view === null || !tutorialActiveV7(progress, view)) return progress;
  const expects = tutorialStepV7(progress)?.expects ?? null;
  if (
    offered.length === 0 ||
    view.turnOrder[view.activeSeatIndex] !== view.viewer.id ||
    expects === null ||
    view.pendingChoices.length > 0
  )
    return progress;
  if (expects.kind === "UNIT_HELP")
    return ownUnitAt(view, expects.at) === undefined
      ? skipTutorialV7(progress)
      : progress;
  return openSteps(progress).some(({ expects: open }) =>
    offered.some((command) => tutorialCommandMatchesV7(open, view, command)),
  )
    ? progress
    : skipTutorialV7(progress);
}

/**
 * The cue language (bead pulp_wars-2yc.119, docs/ui/SCREEN_FLOW.md
 * "Tutorial"): every step is one of two kinds.
 *
 * - An **action** step waits for a tap on the board or the HUD. Exactly one
 *   thing pulses, the thing to tap now, and the line says what it is: the
 *   unit, city or tile (`BOARD`: the yellow arrow over it and a pulsing
 *   ring round its tile), then, a selection made, the next target of the
 *   same step (the move's or attack's tile on the board, or the dock's
 *   button for the command), or a HUD button, the unit's `?`, the
 *   technology in the tree and then its Research button.
 * - A **read** step waits for Next. Nothing on the board pulses: what it
 *   talks about has a still "look here" ring, without the arrow, and the
 *   Next button is what pulses.
 */
export type TutorialCueKindV7 = "ACTION" | "READ";

/** The one thing that pulses. */
export type TutorialCueTargetV7 =
  /** A unit, city or tile on the board: the marker's. */
  | "BOARD"
  /** The dock's button for the step's command (`command`). */
  | "DOCK"
  /** The selected unit's `?`. */
  | "UNIT_HELP"
  /** The HUD's Tech button. */
  | "TECH"
  /** The technology to pick in the technology screen. */
  | "TECHNOLOGY"
  /** The chosen technology's Research button. */
  | "RESEARCH"
  /** The HUD's End turn button. */
  | "END_TURN"
  /** The line's Next button. */
  | "NEXT";

/** What refusing a command says, by what pulses (bead pulp_wars-2yc.119). */
export const TUTORIAL_NUDGES_V7 = {
  TILE: "Tap the glowing tile.",
  UNIT: "Tap the glowing unit.",
  CITY: "Tap the glowing city.",
  BUTTON: "Tap the glowing button.",
  TECHNOLOGY: "Tap the glowing technology.",
  NEXT: "Read the line, then press Next.",
} as const;

export interface TutorialCueV7 {
  readonly step: TutorialStepIdV7;
  /** "3 / 36": the step's number, from 1, and how many there are. */
  readonly number: number;
  readonly count: number;
  readonly line: string;
  readonly kind: TutorialCueKindV7;
  /** The one thing that pulses now. */
  readonly target: TutorialCueTargetV7;
  /**
   * The board's marker: on an action step (`style: "TAP"`) the unit, city
   * or tile to tap when `target` is `BOARD`, else null; on a read step
   * (`style: "LOOK"`, still) what the line talks about, or null.
   */
  readonly marker: FirstStepMarkerV7 | null;
  /** The button to ring: a HUD button, or the selected unit's `?`. */
  readonly button: "TECH" | "END_TURN" | "UNIT_HELP" | null;
  readonly buttonMotion: "PULSE" | "STILL";
  /** A read step: the line has a Next button, and it pulses. */
  readonly next: boolean;
  /** The technology to pick in the technology screen, or null. */
  readonly technology: TechnologyIdV7 | null;
  /**
   * The offered command the step waits for, when its button is in the dock
   * (`target` is `DOCK`) or its target on the board is the marker's: the
   * interface rings the control that sends it. Null otherwise.
   */
  readonly command: CommandV7 | null;
  /** What a refused command says: where the glow is. */
  readonly nudge: string;
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
  /** The technology chosen in the technology screen, if any. */
  readonly selectedTechnology?: TechnologyIdV7 | null;
  /**
   * Every command the engine offers the viewer now (the real interface
   * draws them all); the step's own is found among them. Omitted: none.
   */
  readonly offered?: readonly CommandV7[];
  readonly motion: "FULL" | "REDUCED";
}

/** Whether two commands are the same command (the interface's buttons). */
export function sameTutorialCommandV7(
  left: CommandV7 | null,
  right: CommandV7 | null,
): boolean {
  return (
    left !== null &&
    right !== null &&
    (left === right || JSON.stringify(left) === JSON.stringify(right))
  );
}

/** A line's `{unit}`: the name of the unit the step names by its tile. */
function unitWord(view: PlayerViewV7, at: CoordV7 | null): string {
  const unit = at === null ? undefined : ownUnitAt(view, at);
  return unit === undefined ? "unit" : unitLabelV7(view, unit);
}

/**
 * The cue of the current step, or null: no tutorial, or the player cannot
 * act now. See `TutorialCueKindV7` for the language.
 */
export function tutorialCueV7(input: TutorialCueInputV7): TutorialCueV7 | null {
  const { progress, view, selection } = input;
  const step = tutorialStepV7(progress);
  if (step === null || !input.ready || !tutorialActiveV7(progress, view))
    return null;
  const motion = input.motion === "FULL" ? "HOP" : "STILL";
  const tap = (
    kind: FirstStepMarkerV7["kind"],
    at: CoordV7,
  ): FirstStepMarkerV7 =>
    step.frame === undefined
      ? { kind, at, motion, style: "TAP" }
      : { kind, at, motion, style: "TAP", frame: step.frame };
  const unitSelected = (at: CoordV7): boolean =>
    selection?.kind === "UNIT" && selection.unitId === ownUnitAt(view, at)?.id;
  const expects = step.expects;
  const expected =
    tutorialExpectedCommandV7(progress, view, input.offered ?? []) ?? null;
  let line = step.line;
  let marker: FirstStepMarkerV7 | null = null;
  let target: TutorialCueTargetV7 = "NEXT";
  let command: CommandV7 | null = null;
  const selectedLine = step.selectedLine ?? step.line;
  switch (expects?.kind) {
    case undefined:
      // A read step: a still look-here ring, never the arrow.
      if (step.marker !== undefined)
        marker =
          step.frame === undefined
            ? { ...step.marker, motion: "STILL", style: "LOOK" }
            : {
                ...step.marker,
                motion: "STILL",
                style: "LOOK",
                frame: step.frame,
              };
      break;
    case "RESEARCH":
      if (!input.technologyOpen) target = "TECH";
      else {
        line = step.techLine ?? step.line;
        target =
          input.selectedTechnology === expects.tech ? "RESEARCH" : "TECHNOLOGY";
        command = expected;
      }
      break;
    case "TILE":
      if (selection?.kind === "TILE" && same(selection.at, expects.at)) {
        line = selectedLine;
        target = "DOCK";
        command = expected;
      } else {
        target = "BOARD";
        marker = tap("TILE", expects.at);
      }
      break;
    case "MOVE":
    case "ATTACK": {
      const to = expects.kind === "MOVE" ? expects.to : expects.target;
      target = "BOARD";
      if (unitSelected(expects.from)) {
        line = selectedLine;
        marker = tap(expects.kind === "MOVE" ? "TILE" : "UNIT", to);
        command = expected;
      } else marker = tap("UNIT", expects.from);
      break;
    }
    case "TRAIN":
      if (
        selection?.kind === "CITY" &&
        view.cities.some(
          (city) => city.id === selection.cityId && same(city.at, expects.city),
        )
      ) {
        line = selectedLine;
        target = "DOCK";
        command = expected;
      } else {
        target = "BOARD";
        marker = tap("CITY", expects.city);
      }
      break;
    case "END_TURN":
      target = "END_TURN";
      command = expected;
      break;
    case "RALLY":
    case "CAPTURE":
      if (unitSelected(expects.at)) {
        line = selectedLine;
        target = "DOCK";
        command = expected;
      } else {
        target = "BOARD";
        marker = tap("UNIT", expects.at);
      }
      break;
    case "UNIT_HELP":
      if (unitSelected(expects.at)) {
        line = selectedLine;
        target = "UNIT_HELP";
      } else {
        target = "BOARD";
        marker = tap("UNIT", expects.at);
      }
      break;
  }
  // A line may name the unit the step is about by its kind ("Tap this
  // {unit}."): whatever a city's reward put on that tile.
  if (line.includes("{unit}")) {
    const at =
      expects?.kind === "MOVE" || expects?.kind === "ATTACK"
        ? expects.from
        : expects?.kind === "RALLY" ||
            expects?.kind === "CAPTURE" ||
            expects?.kind === "UNIT_HELP"
          ? expects.at
          : null;
    line = line.replaceAll("{unit}", unitWord(view, at));
  }
  const nudge =
    target === "NEXT"
      ? TUTORIAL_NUDGES_V7.NEXT
      : target === "TECHNOLOGY"
        ? TUTORIAL_NUDGES_V7.TECHNOLOGY
        : target === "BOARD" && marker !== null
          ? TUTORIAL_NUDGES_V7[marker.kind]
          : TUTORIAL_NUDGES_V7.BUTTON;
  return {
    step: step.id,
    number: (progress.step ?? 0) + 1,
    count: TUTORIAL_STEPS_V7.length,
    line,
    kind: expects === null ? "READ" : "ACTION",
    target,
    // Nothing is marked on a board behind the technology screen.
    marker: input.technologyOpen ? null : marker,
    button:
      target === "TECH" || target === "END_TURN" || target === "UNIT_HELP"
        ? target
        : null,
    buttonMotion: input.motion === "FULL" ? "PULSE" : "STILL",
    next: expects === null,
    technology: expects?.kind === "RESEARCH" ? expects.tech : null,
    command,
    nudge,
  };
}

/**
 * What a refused command says now: where the glow is, or the plain
 * refusal when no cue is up.
 */
export function tutorialNudgeV7(cue: TutorialCueV7 | null): string {
  return cue?.nudge ?? TUTORIAL_REFUSED_V7;
}
