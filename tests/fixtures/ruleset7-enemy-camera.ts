import {
  applyCommandV7,
  projectEventsV7,
  queryPlayerCommandsV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type PlayerEventEnvelopeV7,
  type PlayerViewV7,
} from "../../src/engine/index";
import { horseArcherPublicFixtureV7 } from "./ruleset7-tactical-ui";
import { checkedV7 } from "./v7-builders";

export type EnemyCameraScenarioV7 =
  | "visible-move"
  | "hidden-move"
  | "mixed-move"
  | "entering-move"
  | "leaving-move"
  | "visible-build"
  | "hidden-build";

/** Real accepted commands and projection, using the established synthetic fixture. */
export function enemyCameraFixtureV7(scenario: EnemyCameraScenarioV7): {
  readonly label: "ENGINE_APPLIED_SYNTHETIC_FIXTURE";
  readonly before: PlayerViewV7;
  readonly after: PlayerViewV7;
  readonly events: PlayerEventEnvelopeV7;
  readonly at: CoordV7;
} {
  const base = horseArcherPublicFixtureV7().state;
  const enemy = base.units.find((unit) => unit.ownerId !== base.humanPlayerId);
  if (enemy === undefined) throw new Error("Camera fixture enemy missing");
  let state = checkedV7({
    ...base,
    activeSeatIndex: base.turnOrder.indexOf(enemy.ownerId),
    units: [
      {
        ...enemy,
        at: { x: 4, y: 4 },
        role: "HORSE_ARCHER",
        hp: 10,
        maxHp: 10,
      },
    ],
    players: base.players.map((player) => ({
      ...player,
      explored: base.board.tiles.map((tile) => tile.at),
    })),
  });
  let command: CommandV7 = {
    kind: "MOVE",
    unitId: enemy.id,
    path: [
      { x: 5, y: 4 },
      { x: 6, y: 4 },
      { x: 7, y: 4 },
    ],
  };
  if (scenario.endsWith("build")) {
    const build = queryPlayerCommandsV7(viewForV7(state, enemy.ownerId)).find(
      (candidate) =>
        candidate.kind === "BUILD_FARM" ||
        candidate.kind === "BUILD_LUMBER_CAMP",
    );
    if (build === undefined) throw new Error("Camera fixture build missing");
    command = build;
  }
  const at =
    command.kind === "MOVE"
      ? command.path.at(-1)
      : "at" in command
        ? command.at
        : undefined;
  if (at === undefined) throw new Error("Camera fixture location missing");
  state = checkedV7({
    ...state,
    players: state.players.map((player) =>
      player.id !== state.humanPlayerId
        ? player
        : {
            ...player,
            explored: player.explored.filter((tile) => {
              if (scenario === "hidden-build")
                return tile.x !== at.x || tile.y !== at.y;
              if (tile.y !== 4 || tile.x < 4 || tile.x > 7) return true;
              if (scenario === "hidden-move") return false;
              if (scenario === "mixed-move") return tile.x !== 6;
              if (scenario === "entering-move") return tile.x >= 6;
              if (scenario === "leaving-move") return tile.x <= 5;
              return true;
            }),
          },
    ),
  });
  const result = applyCommandV7(state, enemy.ownerId, command);
  if (!result.accepted)
    throw new Error(`Camera fixture rejected: ${result.error.code}`);
  return {
    label: "ENGINE_APPLIED_SYNTHETIC_FIXTURE",
    before: viewForV7(state, state.humanPlayerId),
    after: viewForV7(result.state, state.humanPlayerId),
    events: projectEventsV7(
      state,
      result.state,
      state.humanPlayerId,
      result.events,
    ),
    at,
  };
}
