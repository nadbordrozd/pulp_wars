/**
 * Faction strength tournament (`pulp_wars-hblo`): per-seat telemetry of one
 * finished headless match. It replays the match's accepted command log from
 * the created first turn (the reducer is deterministic, so the replay walks
 * exactly the states the match did) and reads, for every seat: the commands
 * it was offered (`queryPlayerCommandsV7`, the same list the Normal AI
 * scores) against the ones it chose, per turn; its research order; its
 * Coins at each End Turn; its cities and capital; its eliminations and
 * embarkations. Nothing here changes a rule or the AI.
 */
import type { AiMatchResultV7 } from "../../src/headless/v7";
import type { CommandV7 } from "../../src/engine/v7/commands";
import type { DomainEventV7 } from "../../src/engine/v7/events";
import { queryPlayerCommandsV7 } from "../../src/engine/v7/query";
import {
  applyCommandV7,
  createPlayableGameV7,
} from "../../src/engine/v7/reducer";
import type { GameStateV7, MatchSetupV7 } from "../../src/engine/v7/types";

export type OfferSamplingV7 = "every" | "turn" | "none";

export interface SeatTelemetryV7 {
  readonly seat: number;
  readonly playerId: number;
  readonly faction: string;
  turns: number;
  /** Uses of every command key (kind, or `TRAIN:<role>` and the like). */
  readonly uses: Record<string, number>;
  /** Turns in which the key was offered at least once (sampled). */
  readonly turnsOffered: Record<string, number>;
  /** Turns in which the key was used at least once. */
  readonly turnsUsed: Record<string, number>;
  readonly research: { tech: string; round: number }[];
  /** Coins held at each of the seat's End Turns. */
  readonly coinsAtEndTurn: number[];
  /** Cities owned at the start of each round (index 0 = round 1). */
  readonly citiesByRound: number[];
  capitalLostRound: number | null;
  eliminatedRound: number | null;
  eliminatedAt: number | null;
  embarks: number;
  citiesCaptured: number;
  citiesMax: number;
  /** Cities owned in the final state. */
  finalCities: number;
}

/** The key a command counts under: training and summons name what. */
export function commandKeyV7(command: CommandV7): string {
  if (
    command.kind === "TRAIN" ||
    command.kind === "TRAIN_NAVAL" ||
    command.kind === "LAY_EGG" ||
    command.kind === "HIRE"
  )
    return `${command.kind}:${command.role}`;
  if (command.kind === "SUMMON") return `SUMMON:${command.daemon}`;
  if (command.kind === "BEGIN_RITUAL") return `BEGIN_RITUAL:${command.ritual}`;
  return command.kind;
}

export function collectSeatTelemetryV7(
  setup: MatchSetupV7,
  result: AiMatchResultV7,
  sampling: OfferSamplingV7,
): { readonly seats: SeatTelemetryV7[]; readonly waterShare: number } {
  const created = createPlayableGameV7(setup);
  if (!created.ok) throw new Error(`CREATE_REJECTED:${created.error.code}`);
  let state: GameStateV7 = created.state;
  const tiles = state.board.tiles;
  const waterShare =
    tiles.filter(
      (tile) =>
        tile.terrain === "SHALLOW_WATER" || tile.terrain === "DEEP_WATER",
    ).length / tiles.length;
  const seats: SeatTelemetryV7[] = state.players.map((player) => ({
    seat: player.seat,
    playerId: player.id,
    faction: player.faction,
    turns: 0,
    uses: {},
    turnsOffered: {},
    turnsUsed: {},
    research: [],
    coinsAtEndTurn: [],
    citiesByRound: [],
    capitalLostRound: null,
    eliminatedRound: null,
    eliminatedAt: null,
    embarks: 0,
    citiesCaptured: 0,
    citiesMax: 0,
    finalCities: 0,
  }));
  const bySeatId = new Map(seats.map((seat) => [seat.playerId, seat]));
  const capitals = new Map(
    state.players.map((player) => [player.originalCapitalCityId, player.id]),
  );
  const snapshotCities = (snapshot: GameStateV7): void => {
    for (const seat of seats) {
      const count = snapshot.cities.filter(
        (city) => city.ownerId === seat.playerId,
      ).length;
      seat.citiesByRound.push(count);
      seat.citiesMax = Math.max(seat.citiesMax, count);
    }
  };
  snapshotCities(state);
  let turnSeat: SeatTelemetryV7 | null = null;
  let offered = new Set<string>();
  let used = new Set<string>();
  const flush = (): void => {
    if (turnSeat === null) return;
    for (const key of offered) increment(turnSeat.turnsOffered, key);
    for (const key of used) increment(turnSeat.turnsUsed, key);
    offered = new Set();
    used = new Set();
    turnSeat = null;
  };
  const recordEvents = (
    events: readonly DomainEventV7[],
    round: number,
    commandIndex: number,
  ): void => {
    for (const event of events) {
      if (event.kind === "PLAYER_ELIMINATED") {
        const seat = bySeatId.get(event.playerId);
        if (seat !== undefined && seat.eliminatedRound === null) {
          seat.eliminatedRound = round;
          seat.eliminatedAt = commandIndex;
        }
      } else if (event.kind === "CITY_CAPTURED") {
        const taker = bySeatId.get(event.to);
        if (taker !== undefined && event.from !== null)
          taker.citiesCaptured += 1;
        const owner = capitals.get(event.cityId);
        const loser = owner === undefined ? undefined : bySeatId.get(owner);
        if (
          loser !== undefined &&
          event.from === loser.playerId &&
          loser.capitalLostRound === null
        )
          loser.capitalLostRound = round;
      } else if (event.kind === "UNIT_EMBARKED") {
        const seat = bySeatId.get(event.playerId);
        if (seat !== undefined) seat.embarks += 1;
      }
    }
  };
  for (const record of result.commandLog) {
    const actor = record.playerId;
    const seat = bySeatId.get(actor);
    if (seat === undefined) throw new Error(`Unknown actor ${actor}`);
    const newTurn = turnSeat !== seat;
    if (newTurn) {
      flush();
      turnSeat = seat;
      seat.turns += 1;
    }
    if (sampling === "every" || (sampling === "turn" && newTurn))
      for (const command of queryPlayerCommandsV7(state, actor))
        offered.add(commandKeyV7(command));
    const key = commandKeyV7(record.command);
    increment(seat.uses, key);
    used.add(key);
    // A command the seat chose was offered to it, whatever the sampling.
    offered.add(key);
    if (record.command.kind === "RESEARCH")
      seat.research.push({ tech: record.command.tech, round: state.round });
    if (record.command.kind === "END_TURN") {
      const player = state.players.find((item) => item.id === actor);
      if (player !== undefined) seat.coinsAtEndTurn.push(player.coins);
    }
    const before = state;
    const applied = applyCommandV7(state, actor, record.command);
    if (!applied.accepted)
      throw new Error(
        `Replay rejected command ${record.index}: ${applied.error.code}`,
      );
    state = applied.state;
    recordEvents(record.events, before.round, state.commandIndex);
    if (record.command.kind === "END_TURN") flush();
    if (state.round !== before.round) snapshotCities(state);
  }
  flush();
  for (const seat of seats)
    seat.finalCities = state.cities.filter(
      (city) => city.ownerId === seat.playerId,
    ).length;
  return { seats, waterShare };
}

function increment(record: Record<string, number>, key: string): void {
  record[key] = (record[key] ?? 0) + 1;
}
