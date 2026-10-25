// Long AI turns hurry (bead pulp_wars-2yc.114): hand-built boundaries of
// a rival seat's turn on the small fully explored tactical board, applied by
// the engine and projected for the human (no match is played).

import {
  applyCommandV7,
  projectEventsV7,
  queryPlayerCommandsV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type GameStateV7,
  type PlayerEventEnvelopeV7,
  type PlayerViewV7,
} from "../../src/engine/index";
import { knightOverrunPublicFixtureV7 } from "./ruleset7-tactical-ui";
import { checkedV7 } from "./v7-builders";

export interface BoundaryV7 {
  readonly before: PlayerViewV7;
  readonly after: PlayerViewV7;
  readonly events: PlayerEventEnvelopeV7;
}

/** The 11 x 11 tactical board the boundaries are played on. */
export const hurryBaseStateV7 = knightOverrunPublicFixtureV7().state;
const base = hurryBaseStateV7;
const human = base.humanPlayerId;
function required<T>(value: T | undefined, what: string): T {
  if (value === undefined) throw new Error(`Missing the fixture's ${what}`);
  return value;
}
const rivalUnit = required(
  base.units.find((unit) => unit.ownerId !== human),
  "rival unit",
);
const humanUnit = required(
  base.units.find((unit) => unit.ownerId === human),
  "human unit",
);
const rival = rivalUnit.ownerId;

/** The rival's turn on the 11 x 11 board, every tile explored by both. */
function rivalTurn(units: GameStateV7["units"], round = base.round) {
  return checkedV7({
    ...base,
    round,
    activeSeatIndex: base.turnOrder.indexOf(rival),
    units,
    players: base.players.map((player) => ({
      ...player,
      explored: base.board.tiles.map((tile) => tile.at),
    })),
  });
}

/** `command` applied for its actor, seen by the human. */
function boundaryOf(state: GameStateV7, command: CommandV7): BoundaryV7 {
  const actor = state.turnOrder[state.activeSeatIndex];
  if (actor === undefined) throw new Error("No active seat");
  const result = applyCommandV7(state, actor, command);
  if (!result.accepted) throw new Error(`Rejected: ${result.error.code}`);
  return {
    before: viewForV7(state, human),
    after: viewForV7(result.state, human),
    events: projectEventsV7(state, result.state, human, result.events),
  };
}

/** A rival Knight's one-tile Move from `at` (to the first offered tile). */
export function rivalMove(at: CoordV7, round = base.round): BoundaryV7 {
  const state = rivalTurn(
    [
      {
        ...rivalUnit,
        role: "KNIGHT",
        at,
        hp: 13,
        maxHp: 13,
        activation: humanUnit.activation,
      },
    ],
    round,
  );
  const move = queryPlayerCommandsV7(viewForV7(state, rival)).find(
    (command) =>
      command.kind === "MOVE" &&
      command.unitId === rivalUnit.id &&
      command.path.length === 1,
  );
  if (move === undefined) throw new Error("No rival move");
  return boundaryOf(state, move);
}

/** A rival Fighter attacking the human's Knight next to it. */
export function rivalAttack(): BoundaryV7 {
  const state = rivalTurn(
    base.units.filter((unit) => unit.role === "KNIGHT" || unit.hp === 1),
  );
  const fighter = state.units.find((unit) => unit.ownerId === rival);
  if (fighter === undefined) throw new Error("No rival fighter");
  const ready = rivalTurn(
    state.units.map((unit) =>
      unit.id === fighter.id
        ? { ...unit, hp: 12, activation: humanUnit.activation }
        : unit,
    ),
  );
  const attack = queryPlayerCommandsV7(viewForV7(ready, rival)).find(
    (command) => command.kind === "ATTACK",
  );
  if (attack === undefined) throw new Error("No rival attack");
  return boundaryOf(ready, attack);
}

/** The same boundary as the viewer's own (the human active). */
export function asOwn(boundary: BoundaryV7): BoundaryV7 {
  const own = (view: PlayerViewV7): PlayerViewV7 => ({
    ...view,
    activeSeatIndex: view.turnOrder.indexOf(view.viewer.id),
  });
  return { ...boundary, before: own(boundary.before) };
}
