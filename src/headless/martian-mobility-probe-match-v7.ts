/**
 * The headless match runner of `MARTIAN_MOBILITY_PROBE` (`pulp_wars-1wy.2`,
 * docs/product/RULESET_7_BALANCE_MARTIAN_ICE.md section 8.2).
 *
 * One two-seat match: the Normal AI on every seat, and, with `probe`, the
 * probe's overrides (`chooseMartianMobilityProbeCommandV7`) on the first
 * Martian seat. Without `probe` the Martian seat is the plain Normal AI, so
 * the same seed gives the comparison run. The usage telemetry is recorded
 * for the Martian seat in both runs.
 */
import {
  chooseNormalCommandV7,
  chooseNormalTurnCommandV7,
  NORMAL_AI_MAX_ACCEPTED_COMMANDS_PER_TURN_V7,
} from "../ai/v7";
import type { CityId, PlayerId, UnitId } from "../engine/model/ids";
import { unitRoleRuleV7 } from "../engine/rules/ruleset-v7";
import type { CommandV7 } from "../engine/v7/commands";
import { applyCommandV7, createPlayableGameV7 } from "../engine/v7/reducer";
import type {
  FactionIdV7,
  GameStateV7,
  MatchSetupV7,
  UnitRoleIdV7,
} from "../engine/v7/types";
import { allOwnedUnitsV7 } from "../engine/v7/units";
import { viewForV7 } from "../engine/v7/view";
import {
  MOBILITY_PROBE_TOOLS_V7,
  chebyshevV7,
  chooseMartianMobilityProbeCommandV7,
  createMobilityProbeMemoryV7,
  type MobilityProbeToolV7,
} from "./martian-mobility-probe-v7";

/** Accepted slots kept free for the Normal policy to close the turn. */
const PROBE_TURN_RESERVE_V7 = 16;

export interface MobilityProbeUsageV7 {
  /** Martian turns played. */
  turns: number;
  /** Own units with a Tractor Beam at the start of each Martian turn, summed. */
  tractorUnitTurns: number;
  /** Own units with Beam Down at the start of each Martian turn, summed. */
  beamUnitTurns: number;
  /** The first round the seat owned a carrier (null: never). */
  firstCarrierRound: number | null;
  tractorBeams: number;
  tractorBeamsHostile: number;
  tractorBeamsOwn: number;
  /** Pulls of a defender off a hostile city center. */
  tractorBeamsOffCenter: number;
  /** ... after which the Martian seat captured that city within two rounds. */
  citiesFellAfterPull: number;
  /** Hostile units pulled and killed in the same turn. */
  pulledKills: number;
  beamDowns: number;
  /** The passenger stood on or next to an own city center. */
  beamDownsCity: number;
  /** The passenger stood anywhere else (a pick-up). */
  beamDownsPickUp: number;
  /** The passenger had attacked this turn (an extraction). */
  beamDownsExtraction: number;
  /** The carrier had moved this turn. */
  beamDownsAfterMove: number;
  /** Passengers that attacked in the turn they were beamed. */
  passengersAttackedOnArrival: number;
  mindControls: number;
  attacks: number;
  /** Attacks from two tiles or more. */
  attacksFromRange: number;
  /** Hostile units that died during a Martian turn. */
  kills: number;
  /** Martian units lost in the whole match. */
  losses: number;
  citiesCaptured: number;
  trained: Partial<Record<UnitRoleIdV7, number>>;
}

export interface MobilityProbeGameV7 {
  readonly termination: "DECIDED" | "ROUND_CAP" | "ERROR";
  readonly error: string | null;
  readonly rounds: number;
  readonly winnerFaction: FactionIdV7 | null;
  /** Null when the match was not decided. */
  readonly martianWon: boolean | null;
  /** Commands the probe chose, by rule (all 0 in a comparison run). */
  readonly tools: Record<MobilityProbeToolV7, number>;
  readonly usage: MobilityProbeUsageV7;
}

export interface MobilityProbeMatchOptionsV7 {
  readonly probe: boolean;
  readonly maxRounds: number;
}

function emptyUsage(): MobilityProbeUsageV7 {
  return {
    turns: 0,
    tractorUnitTurns: 0,
    beamUnitTurns: 0,
    firstCarrierRound: null,
    tractorBeams: 0,
    tractorBeamsHostile: 0,
    tractorBeamsOwn: 0,
    tractorBeamsOffCenter: 0,
    citiesFellAfterPull: 0,
    pulledKills: 0,
    beamDowns: 0,
    beamDownsCity: 0,
    beamDownsPickUp: 0,
    beamDownsExtraction: 0,
    beamDownsAfterMove: 0,
    passengersAttackedOnArrival: 0,
    mindControls: 0,
    attacks: 0,
    attacksFromRange: 0,
    kills: 0,
    losses: 0,
    citiesCaptured: 0,
    trained: {},
  };
}

/**
 * The seat's carriers that can act this turn: its units on the board whose
 * kind has the Tractor Beam or Beam Down (a mind-controlled unit counts by
 * its kind; a burrowed unit takes no command).
 */
function carriersOnBoardV7(
  state: GameStateV7,
  ownerId: PlayerId,
): { readonly tractor: number; readonly beam: number } {
  let tractor = 0;
  let beam = 0;
  for (const unit of state.units) {
    if (unit.ownerId !== ownerId || unit.hp <= 0) continue;
    const abilities = unitRoleRuleV7(state, unit).abilities;
    if (abilities.includes("TRACTOR_BEAM")) tractor += 1;
    if (abilities.includes("BEAM_DOWN")) beam += 1;
  }
  return { tractor, beam };
}

export function runMartianMobilityProbeMatchV7(
  setup: MatchSetupV7,
  options: MobilityProbeMatchOptionsV7,
): MobilityProbeGameV7 {
  const created = createPlayableGameV7(setup);
  if (!created.ok) throw new Error(`CREATE_REJECTED:${created.error.code}`);
  let state: GameStateV7 = created.state;
  const martian = state.players.find((player) => player.faction === "MARTIAN");
  if (martian === undefined) throw new Error("The probe needs a Martian seat");
  const memory = createMobilityProbeMemoryV7();
  const tools = Object.fromEntries(
    MOBILITY_PROBE_TOOLS_V7.map((tool) => [tool, 0]),
  ) as Record<MobilityProbeToolV7, number>;
  const usage = emptyUsage();
  let turnPlayer: PlayerId | null = null;
  let turnRound = -1;
  let commandsThisTurn = 0;
  // Per Martian turn.
  let pulledThisTurn = new Set<UnitId>();
  let beamedThisTurn = new Set<UnitId>();
  let attackedOnArrival = new Set<UnitId>();
  const centerPulls = new Map<CityId, number>();
  let error: string | null = null;

  while (state.outcome === null && state.round <= options.maxRounds) {
    const actor = state.turnOrder[state.activeSeatIndex];
    if (actor === undefined) throw new Error("No active player");
    if (actor !== turnPlayer || state.round !== turnRound) {
      turnPlayer = actor;
      turnRound = state.round;
      commandsThisTurn = 0;
      if (actor === martian.id) {
        pulledThisTurn = new Set();
        beamedThisTurn = new Set();
        attackedOnArrival = new Set();
        usage.turns += 1;
        const carriers = carriersOnBoardV7(state, martian.id);
        usage.tractorUnitTurns += carriers.tractor;
        usage.beamUnitTurns += carriers.beam;
        if (carriers.tractor + carriers.beam > 0)
          usage.firstCarrierRound ??= state.round;
      }
    }
    const view = viewForV7(state, actor);
    let command: CommandV7 | null = null;
    try {
      const choice =
        options.probe &&
        actor === martian.id &&
        commandsThisTurn <
          NORMAL_AI_MAX_ACCEPTED_COMMANDS_PER_TURN_V7 - PROBE_TURN_RESERVE_V7
          ? chooseMartianMobilityProbeCommandV7(view, memory)
          : null;
      if (choice !== null) {
        command = choice.command;
        tools[choice.tool] += 1;
      }
      command ??= chooseNormalTurnCommandV7(
        view,
        commandsThisTurn,
        NORMAL_AI_MAX_ACCEPTED_COMMANDS_PER_TURN_V7,
        chooseNormalCommandV7(view),
      );
    } catch (cause) {
      error = cause instanceof Error ? cause.message : String(cause);
      break;
    }
    if (command === null) {
      error = "STALL";
      break;
    }
    const before = state;
    const applied = applyCommandV7(state, actor, command);
    if (!applied.accepted) {
      error = `REJECTED:${applied.error.code}:${JSON.stringify(command)}`;
      break;
    }
    state = applied.state;
    commandsThisTurn += 1;
    // Every unit a seat owns, burrowed units included: a unit that dies in
    // its mound is a kill or a loss like any other.
    const unitsBefore = allOwnedUnitsV7(before);
    const unitBefore = (unitId: UnitId) =>
      unitsBefore.find((unit) => unit.id === unitId);
    for (const event of applied.events) {
      if (event.kind === "UNIT_DIED") {
        const unit = unitBefore(event.unitId);
        if (unit === undefined) continue;
        if (unit.ownerId === martian.id) usage.losses += 1;
        else if (actor === martian.id) {
          usage.kills += 1;
          if (pulledThisTurn.has(unit.id)) usage.pulledKills += 1;
        }
      } else if (event.kind === "CITY_CAPTURED" && event.to === martian.id) {
        usage.citiesCaptured += 1;
        const pulledRound = centerPulls.get(event.cityId);
        if (pulledRound !== undefined && before.round <= pulledRound + 2) {
          usage.citiesFellAfterPull += 1;
          centerPulls.delete(event.cityId);
        }
      } else if (event.kind === "UNIT_TRAINED" && event.playerId === martian.id)
        usage.trained[event.role] = (usage.trained[event.role] ?? 0) + 1;
    }
    if (actor !== martian.id) continue;
    if (command.kind === "TRACTOR_BEAM") {
      const target = unitBefore(command.targetUnitId);
      usage.tractorBeams += 1;
      if (target?.ownerId === martian.id) usage.tractorBeamsOwn += 1;
      else if (target !== undefined) {
        usage.tractorBeamsHostile += 1;
        pulledThisTurn.add(target.id);
        const city = before.cities.find(
          (item) =>
            item.at.x === target.at.x &&
            item.at.y === target.at.y &&
            item.ownerId === target.ownerId,
        );
        if (city !== undefined) {
          usage.tractorBeamsOffCenter += 1;
          centerPulls.set(city.id, before.round);
        }
      }
    } else if (command.kind === "BEAM_DOWN") {
      const carrier = unitBefore(command.unitId);
      const passenger = unitBefore(command.passengerUnitId);
      usage.beamDowns += 1;
      if (carrier?.activation.moved === true) usage.beamDownsAfterMove += 1;
      if (passenger !== undefined) {
        beamedThisTurn.add(passenger.id);
        const atCity = before.cities.some(
          (city) =>
            city.ownerId === martian.id &&
            chebyshevV7(city.at, passenger.at) <= 1,
        );
        if (atCity) usage.beamDownsCity += 1;
        else usage.beamDownsPickUp += 1;
        // A unit that attacked this turn (an exhausted unit, such as one
        // trained this turn, has every flag set, `recovered` included).
        if (passenger.activation.attacked && !passenger.activation.recovered)
          usage.beamDownsExtraction += 1;
      }
    } else if (command.kind === "MIND_CONTROL") usage.mindControls += 1;
    else if (command.kind === "ATTACK") {
      const attacker = unitBefore(command.unitId);
      const target = unitBefore(command.targetUnitId);
      usage.attacks += 1;
      if (
        attacker !== undefined &&
        target !== undefined &&
        chebyshevV7(attacker.at, target.at) >= 2
      )
        usage.attacksFromRange += 1;
      if (
        beamedThisTurn.has(command.unitId) &&
        !attackedOnArrival.has(command.unitId)
      ) {
        attackedOnArrival.add(command.unitId);
        usage.passengersAttackedOnArrival += 1;
      }
    }
  }

  const outcome = state.outcome;
  const winnerId =
    outcome === null
      ? null
      : outcome.kind === "DEFEAT"
        ? outcome.defeatedByPlayerId
        : outcome.winnerId;
  const winnerFaction =
    state.players.find((player) => player.id === winnerId)?.faction ?? null;
  return {
    termination:
      error !== null ? "ERROR" : outcome === null ? "ROUND_CAP" : "DECIDED",
    error,
    rounds: state.round,
    winnerFaction,
    martianWon: winnerId === null ? null : winnerId === martian.id,
    tools,
    usage,
  };
}
