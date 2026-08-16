import {
  RULESET_ID,
  appendReplayCommand,
  applyCommand,
  createGame,
  createReplay,
  type Command,
  type GameState,
  type MatchSetup,
  type ReplayFile,
} from "../../src/engine/index";

export function setupBuilder(overrides: Partial<MatchSetup> = {}): MatchSetup {
  return {
    rulesetId: RULESET_ID,
    seed: 0x1234_5678,
    width: 11,
    height: 11,
    aiCount: 1,
    aiDifficulty: "NORMAL",
    aiMode: "RIVAL",
    humanColor: "CORAL",
    ...overrides,
  };
}

export function gameStateBuilder(
  setup: MatchSetup = setupBuilder(),
): GameState {
  const result = createGame(setup);
  if (!result.ok) {
    throw new Error(`Fixture setup rejected: ${result.error.code}`);
  }
  return result.state;
}

/** Builds a human-turn state with exact, publicly explored CAPTURE offers. */
export function captureReadyStateBuilder(
  captureCount = 1,
  state: GameState = gameStateBuilder(),
): GameState {
  const human = state.players.find((player) => player.controller === "HUMAN");
  if (human === undefined) throw new Error("Missing human player");
  const activeSeatIndex = state.turnOrder.indexOf(human.id);
  const villages = state.board.tiles
    .filter((tile) => tile.site === "VILLAGE")
    .slice(0, captureCount);
  const candidates = state.units.slice(0, captureCount);
  if (
    activeSeatIndex < 0 ||
    villages.length !== captureCount ||
    candidates.length !== captureCount
  ) {
    throw new Error("Missing capture fixture context");
  }
  return {
    ...state,
    activeSeatIndex,
    players: state.players.map((player) =>
      player.id === human.id
        ? {
            ...player,
            explored: [
              ...player.explored,
              ...villages
                .map((village) => village.at)
                .filter(
                  (at) =>
                    !player.explored.some((known) => sameCoord(known, at)),
                ),
            ],
          }
        : player,
    ),
    units: state.units.map((unit, index) =>
      index < captureCount
        ? {
            ...unit,
            ownerId: human.id,
            at: villages[index]?.at ?? unit.at,
            captureEligible: true,
            ready: true,
            activation: {
              moved: false,
              attacked: false,
              recovered: false,
              captured: false,
              handled: false,
              escapeAvailable: false,
            },
          }
        : unit,
    ),
  };
}

export function replayBuilder(
  commandCount: number,
  setup: MatchSetup = setupBuilder(),
): ReplayFile {
  let state = gameStateBuilder(setup);
  let replay = createReplay(setup);
  const command: Command = { kind: "END_TURN" };
  for (let index = 0; index < commandCount; index += 1) {
    const result = applyCommand(state, command);
    if (!result.ok) {
      throw new Error(`Fixture command rejected: ${result.error.code}`);
    }
    state = result.state;
    replay = appendReplayCommand(replay, command, state);
  }
  return replay;
}

function sameCoord(
  left: { readonly x: number; readonly y: number },
  right: { readonly x: number; readonly y: number },
): boolean {
  return left.x === right.x && left.y === right.y;
}
