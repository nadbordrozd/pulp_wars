import { capturableTargetForUnit } from "../capture/eligibility";
import type { DomainEvent } from "../events/types";
import type { PlayerId } from "../model/ids";
import type { GameState, UnitActivation } from "../model/types";
import { recoveryAmount } from "../commands/reducers";
import { playerIncome, totalIncome } from "../rules/economy";

const FRESH_ACTIVATION: UnitActivation = {
  moved: false,
  attacked: false,
  recovered: false,
  captured: false,
  handled: false,
  escapeAvailable: false,
};

export interface TurnLifecycleResult {
  readonly state: GameState;
  readonly events: readonly DomainEvent[];
}

export function startTurnLifecycle(
  state: GameState,
  playerId: PlayerId,
): TurnLifecycleResult {
  const cities = playerIncome(state, playerId);
  const income = totalIncome(cities);
  const players = state.players.map((player) =>
    player.id === playerId
      ? { ...player, stars: player.stars + income }
      : player,
  );
  const units = state.units.map((unit) =>
    unit.ownerId === playerId && unit.hp > 0
      ? {
          ...unit,
          ready: true,
          captureEligible: capturableTargetForUnit(state, unit) !== null,
          activation: FRESH_ACTIVATION,
        }
      : unit,
  );
  return {
    state: { ...state, players, units },
    events: [
      { kind: "TURN_STARTED", playerId, income },
      {
        kind: "INCOME_AWARDED",
        playerId,
        total: income,
        cities,
      },
    ],
  };
}

export function endTurnLifecycle(
  state: GameState,
  playerId: PlayerId,
): TurnLifecycleResult {
  const cities = playerIncome(state, playerId);
  const recoveries = state.units
    .filter(
      (unit) =>
        unit.ownerId === playerId &&
        unit.ready &&
        unit.hp > 0 &&
        unit.hp < unit.maxHp &&
        !unit.activation.moved &&
        !unit.activation.attacked &&
        !unit.activation.recovered &&
        !unit.activation.captured,
    )
    .sort((left, right) => left.id - right.id)
    .map((unit) => ({
      unitId: unit.id,
      amount: Math.min(recoveryAmount(state, unit), unit.maxHp - unit.hp),
    }));
  const units = state.units.map((unit) => {
    const recovery = recoveries.find(
      (candidate) => candidate.unitId === unit.id,
    );
    return recovery === undefined
      ? unit
      : { ...unit, hp: unit.hp + recovery.amount };
  });
  return {
    state: { ...state, units },
    events: [
      ...recoveries.map((recovery): DomainEvent => ({
        kind: "UNIT_RECOVERED",
        unitId: recovery.unitId,
        amount: recovery.amount,
        automatic: true,
      })),
      {
        kind: "INCOME_PREVIEWED",
        playerId,
        total: totalIncome(cities),
        cities,
      },
      { kind: "TURN_ENDED", playerId },
    ],
  };
}
