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
  type PlayerId,
  type PlayerTileViewV7,
  type PlayerViewV7,
  type RewardIdV7,
} from "../../src/engine/index";
import {
  NEW_TUTORIAL_PROGRESS_V7,
  TUTORIAL_MISSION_ID_V7,
  TUTORIAL_STEPS_V7,
  acknowledgeTutorialV7,
  advanceTutorialV7,
  noteTutorialUnitHelpV7,
  reconcileTutorialV7,
  startTutorialV7,
  tutorialAcceptsV7,
  tutorialCommandMatchesV7,
  tutorialCommandsV7,
  tutorialExpectedCommandV7,
  type TutorialProgressV7,
  type TutorialStepIdV7,
} from "../../src/render/tutorial-v7";

/**
 * The tutorial (beads pulp_wars-0yxy and pulp_wars-2yc.115) played by its
 * script on the real engine, for the unit tests, the DOM fixtures and the
 * screenshots: at each step the command the tutorial lets through, as the
 * interface sends it; Next on an explanation; the unit's card on the card
 * step; when a city grows, one of the real panel's two rewards (the
 * caller's pick, by default the one that places no unit). The opponent's
 * turns are the caller's (`idleTurn` ends them at once).
 */
export function tutorialState(): GameStateV7 {
  const mission = missionByIdV7(TUTORIAL_MISSION_ID_V7);
  if (mission === null) throw new Error("the tutorial mission is missing");
  const setup = missionMatchSetupV7(mission);
  if (setup === null) throw new Error("the tutorial setup is missing");
  const created = createPlayableGameV7(setup);
  if (!created.ok) throw new Error(created.error.code);
  return created.state;
}

export const human = (state: GameStateV7, actor?: PlayerId): PlayerViewV7 =>
  viewForV7(state, actor ?? state.humanPlayerId);

export function apply(
  state: GameStateV7,
  actor: PlayerId,
  command: CommandV7,
): GameStateV7 {
  const result = applyCommandV7(state, actor, command);
  if (!result.accepted)
    throw new Error(`${command.kind}: ${result.error.code}`);
  return result.state;
}

/** The opponent ends its turn without doing anything. */
export function idleTurn(state: GameStateV7): GameStateV7 {
  const actor = state.turnOrder[state.activeSeatIndex];
  if (actor === undefined) throw new Error("no active seat");
  return apply(state, actor, { kind: "END_TURN" });
}

export type ExploredTileV7 = Extract<PlayerTileViewV7, { explored: true }>;

/** An explored tile of the view, or undefined. */
export function tileAt(
  view: PlayerViewV7,
  at: CoordV7,
): ExploredTileV7 | undefined {
  const tile = view.board.tiles.find(
    (item) => item.at.x === at.x && item.at.y === at.y,
  );
  return tile?.explored === true ? tile : undefined;
}

/** The living unit on a tile, any owner, or undefined. */
export const unitAt = (view: PlayerViewV7, at: CoordV7) =>
  view.units.find(
    (unit) => unit.hp > 0 && unit.at.x === at.x && unit.at.y === at.y,
  );

export interface TutorialPlayV7 {
  readonly state: GameStateV7;
  readonly progress: TutorialProgressV7;
  /** The player's commands, reward choices left out. */
  readonly sent: readonly CommandV7[];
  /** The steps the tutorial stood at, in order (a step done early is not). */
  readonly visited: readonly TutorialStepIdV7[];
  /** The rewards chosen when a city grew. */
  readonly rewards: readonly RewardIdV7[];
  /** The player's view when each visited step came up. */
  readonly views: Partial<Record<TutorialStepIdV7, PlayerViewV7>>;
  /** A city's reward waiting, keyed by the step whose command grew it. */
  readonly pendingAt: Partial<
    Record<
      TutorialStepIdV7,
      { readonly view: PlayerViewV7; readonly progress: TutorialProgressV7 }
    >
  >;
}

export interface TutorialPlayOptionsV7 {
  readonly opponent: (state: GameStateV7) => GameStateV7;
  /** Stop when this step comes up, before it is done. */
  readonly stopAt?: TutorialStepIdV7;
  /**
   * Steps to do as soon as their group lets them, before the steps ahead
   * of them in the script (the tolerance of a group).
   */
  readonly early?: readonly TutorialStepIdV7[];
  /**
   * Bead pulp_wars-2yc.119: the reward a growing city takes, of the two
   * the real panel offers; absent, `quietRewardV7` (the one that places no
   * unit, as before 2yc.119, so the fixtures' boards stay as they were).
   */
  readonly reward?: (choice: TutorialRewardChoiceV7) => RewardIdV7;
}

export interface TutorialRewardChoiceV7 {
  readonly reachedLevel: number;
  readonly candidates: readonly RewardIdV7[];
}

/** The rewards that place a free unit: the Scouts' Raider, Militia, giant. */
export const UNIT_REWARDS_V7: readonly RewardIdV7[] = [
  "SURVEY",
  "MILITIA",
  "JUGGERNAUT",
];

/** The reward of a level that places no unit (the first when both do not). */
export const quietRewardV7 = (choice: TutorialRewardChoiceV7): RewardIdV7 =>
  choice.candidates.find((reward) => !UNIT_REWARDS_V7.includes(reward)) ??
  (choice.candidates[0] as RewardIdV7);

/** The reward of a level that places a unit (the first when none does). */
export const unitRewardV7 = (choice: TutorialRewardChoiceV7): RewardIdV7 =>
  choice.candidates.find((reward) => UNIT_REWARDS_V7.includes(reward)) ??
  (choice.candidates[0] as RewardIdV7);

export function playTutorialV7(options: TutorialPlayOptionsV7): TutorialPlayV7 {
  let state = tutorialState();
  let progress = startTutorialV7(NEW_TUTORIAL_PROGRESS_V7);
  const sent: CommandV7[] = [];
  const visited: TutorialStepIdV7[] = [];
  const rewards: RewardIdV7[] = [];
  const views: Partial<Record<TutorialStepIdV7, PlayerViewV7>> = {};
  const pendingAt: TutorialPlayV7["pendingAt"] & Record<string, unknown> = {};
  const early = new Set(options.early ?? []);
  let lastIndex: number | null = null;
  let lastDone: TutorialStepIdV7 | null = null;
  for (let guard = 0; guard < 400; guard += 1) {
    if (progress.step === null) break;
    const view = human(state);
    const offered = queryPlayerCommandsV7(view);
    // The tutorial never gives up on a step of its own script.
    if (reconcileTutorialV7(progress, view, offered) !== progress)
      throw new Error(`the tutorial gave up at step ${String(progress.step)}`);
    // A city grew: its reward is chosen first.
    if (view.pendingChoices.length > 0) {
      const allowed = tutorialCommandsV7(progress, view, offered);
      const pending = view.pendingChoices[0];
      const choices = allowed.filter(
        (command) => command.kind === "CHOOSE_CITY_REWARD",
      );
      // Bead pulp_wars-2yc.119: the real panel, both of its choices.
      if (
        pending?.kind !== "CITY_REWARD" ||
        choices.length !== pending.candidates.length
      )
        throw new Error("the reward panel is not the real one");
      const wanted = (options.reward ?? quietRewardV7)(pending);
      const choice = choices.find(
        (command) =>
          command.kind === "CHOOSE_CITY_REWARD" && command.reward === wanted,
      );
      if (choice?.kind !== "CHOOSE_CITY_REWARD")
        throw new Error("no reward is let through");
      if (lastDone !== null && pendingAt[lastDone] === undefined)
        pendingAt[lastDone] = { view, progress };
      rewards.push(choice.reward);
      state = apply(state, state.humanPlayerId, choice);
      progress = advanceTutorialV7(progress, view, choice);
      continue;
    }
    const index: number = progress.step;
    const step = TUTORIAL_STEPS_V7[index];
    if (step === undefined) throw new Error("outside the script");
    if (index !== lastIndex) {
      visited.push(step.id);
      views[step.id] = view;
      lastIndex = index;
    }
    if (options.stopAt === step.id) break;
    const allowed = tutorialCommandsV7(progress, view, offered);
    if (step.expects === null) {
      if (allowed.length > 0) throw new Error(`${step.id} lets commands by`);
      progress = acknowledgeTutorialV7(progress);
      continue;
    }
    if (step.expects.kind === "UNIT_HELP") {
      if (allowed.length > 0) throw new Error(`${step.id} lets commands by`);
      const unit = unitAt(view, step.expects.at);
      if (unit === undefined) throw new Error(`${step.id}: no unit`);
      progress = noteTutorialUnitHelpV7(progress, view, unit.id);
      continue;
    }
    // A step asked for early, when its group lets it through now.
    let command: CommandV7 | null = null;
    let done: TutorialStepIdV7 = step.id;
    for (const id of early) {
      const later = TUTORIAL_STEPS_V7.findIndex((item) => item.id === id);
      const expects = TUTORIAL_STEPS_V7[later]?.expects ?? null;
      if (later <= index || expects === null) continue;
      const candidate = allowed.find((item) =>
        tutorialCommandMatchesV7(expects, view, item),
      );
      if (candidate !== undefined) {
        command = candidate;
        done = id;
        early.delete(id);
        break;
      }
    }
    command ??= tutorialExpectedCommandV7(progress, view, offered);
    if (command === null) throw new Error(`${step.id} is not offered`);
    if (!allowed.includes(command))
      throw new Error(`${step.id}: the command is not let through`);
    // Every other offered command is refused before the engine.
    for (const other of offered)
      if (!allowed.includes(other) && tutorialAcceptsV7(progress, view, other))
        throw new Error(`${step.id} lets ${other.kind} by`);
    state = apply(state, state.humanPlayerId, command);
    sent.push(command);
    lastDone = done;
    progress = advanceTutorialV7(progress, view, command);
    if (command.kind === "END_TURN") state = options.opponent(state);
  }
  return { state, progress, sent, visited, rewards, views, pendingAt };
}
