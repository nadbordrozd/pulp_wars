import {
  NORMAL_AI_MAX_ACCEPTED_COMMANDS_PER_TURN_V7,
  chooseNormalCommandV7,
  chooseNormalTurnCommandV7,
} from "../../src/ai/index";
import {
  appendReplayCommandV7,
  applyCommandV7,
  createPlayableGameV7,
  createReplayV7,
  missionByIdV7,
  missionMatchSetupV7,
  queryPlayerCommandsV7,
  viewForV7,
  type CommandV7,
  type FactionIdV7,
  type GameStateV7,
  type MatchSetupV7,
  type PlayerId,
  type ReplayFileV7,
} from "../../src/engine/index";
import { createSaveEnvelopeV7 } from "../../src/persistence/index";

/**
 * Campaign UI fixtures (`pulp_wars-68k.5`, docs/product/CAMPAIGN.md section
 * 7): real, replay-valid matches of a chapter mission played to its end.
 * One side is played by the Normal AI and the other only ends its turns
 * (or takes the first offered command when End Turn is not offered), so
 * the match ends in a few rounds. Every command is an ordinary offered
 * command, so a save of any of its states passes `parseSaveV7` and the
 * browser controller resumes it.
 */
export interface MissionEndFixtureV7 {
  readonly setup: MatchSetupV7;
  /** The state and replay just before the deciding command. */
  readonly before: {
    readonly state: GameStateV7;
    readonly replay: ReplayFileV7;
  };
  /** The command that ends the mission (the human's own, for a win). */
  readonly decidingCommand: CommandV7;
  /** The state and replay right after it (the outcome is set). */
  readonly after: {
    readonly state: GameStateV7;
    readonly replay: ReplayFileV7;
  };
}

const cache = new Map<string, MissionEndFixtureV7>();

/** The human's Normal AI wins against an AI seat that only ends turns. */
export function missionWinFixtureV7(
  missionId = "FRONTIER_1",
  faction?: FactionIdV7,
): MissionEndFixtureV7 & { readonly winningCommand: CommandV7 } {
  const fixture = playMissionV7(missionId, faction, "HUMAN");
  return { ...fixture, winningCommand: fixture.decidingCommand };
}

/** The Normal AI seat beats a human who only ends turns. */
export function missionLossFixtureV7(
  missionId = "FRONTIER_1",
): MissionEndFixtureV7 {
  return playMissionV7(missionId, undefined, "AI");
}

function playMissionV7(
  missionId: string,
  faction: FactionIdV7 | undefined,
  winner: "HUMAN" | "AI",
): MissionEndFixtureV7 {
  const key = `${missionId}:${faction ?? ""}:${winner}`;
  const cached = cache.get(key);
  if (cached !== undefined) return cached;
  const mission = missionByIdV7(missionId);
  if (mission === null) throw new Error(`Unknown mission ${missionId}`);
  const setup = missionMatchSetupV7(mission, faction);
  if (setup === null) throw new Error(`No setup for ${missionId}`);
  const created = createPlayableGameV7(setup);
  if (!created.ok) throw new Error(created.error.code);
  let state = created.state;
  let replay = createReplayV7(setup);
  let turnActor = state.turnOrder[state.activeSeatIndex];
  let commandsThisTurn = 0;
  const plays = (actor: PlayerId): boolean =>
    (actor === state.humanPlayerId) === (winner === "HUMAN");
  for (let step = 0; step < 6_000 && state.outcome === null; step += 1) {
    const actor = state.turnOrder[state.activeSeatIndex];
    if (actor === undefined) throw new Error("No active seat");
    if (actor !== turnActor) {
      turnActor = actor;
      commandsThisTurn = 0;
    }
    let command: CommandV7 | null;
    if (plays(actor)) {
      const view = viewForV7(state, actor);
      command = chooseNormalTurnCommandV7(
        view,
        commandsThisTurn,
        NORMAL_AI_MAX_ACCEPTED_COMMANDS_PER_TURN_V7,
        chooseNormalCommandV7(view),
      );
    } else {
      const offered = queryPlayerCommandsV7(state, actor);
      command =
        offered.find((candidate) => candidate.kind === "END_TURN") ??
        offered[0] ??
        null;
    }
    if (command === null) throw new Error("No command offered");
    const applied = applyCommandV7(state, actor, command);
    if (!applied.accepted)
      throw new Error(`${command.kind} rejected: ${applied.error.code}`);
    const nextReplay = appendReplayCommandV7(replay, command, applied.state);
    if (applied.state.outcome !== null) {
      const expected = winner === "HUMAN" ? "VICTORY" : "DEFEAT";
      if (applied.state.outcome.kind !== expected)
        throw new Error(`Fixture ended in ${applied.state.outcome.kind}`);
      const fixture: MissionEndFixtureV7 = {
        setup,
        before: { state, replay },
        decidingCommand: command,
        after: { state: applied.state, replay: nextReplay },
      };
      cache.set(key, fixture);
      return fixture;
    }
    state = applied.state;
    replay = nextReplay;
    commandsThisTurn += 1;
  }
  throw new Error(`${missionId} did not end`);
}

/** The autosave source of the state just before the winning command. */
export function missionNearWinSaveV7(
  savedAt: string,
  missionId = "FRONTIER_1",
): { readonly source: string; readonly winningCommand: CommandV7 } {
  const fixture = missionWinFixtureV7(missionId);
  return {
    source: JSON.stringify(createSaveEnvelopeV7(fixture.before, savedAt)),
    winningCommand: fixture.winningCommand,
  };
}

/** The autosave source of the finished, won match (outcome `VICTORY`). */
export function missionWonSaveV7(
  savedAt: string,
  missionId = "FRONTIER_1",
): string {
  return JSON.stringify(
    createSaveEnvelopeV7(missionWinFixtureV7(missionId).after, savedAt),
  );
}

/** The autosave source of the finished, lost match (outcome `DEFEAT`). */
export function missionLostSaveV7(
  savedAt: string,
  missionId = "FRONTIER_1",
): string {
  return JSON.stringify(
    createSaveEnvelopeV7(missionLossFixtureV7(missionId).after, savedAt),
  );
}
