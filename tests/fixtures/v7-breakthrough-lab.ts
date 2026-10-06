import {
  chooseNormalCommandV7,
  chooseNormalTurnCommandV7,
} from "../../src/ai/v7";
import {
  MISSION_REGISTRY_V7,
  applyCommandV7,
  createPlayableGameV7,
  missionMatchSetupV7,
  queryCombatPreviewV7,
  queryPlayerCommandsV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type GameStateV7,
  type UnitId,
  type UnitRoleIdV7,
} from "../../src/engine/index";
import {
  LAB_BREAKTHROUGH_CAPITAL_V7,
  LAB_BREAKTHROUGH_LINE_V7,
} from "../../src/engine/v7/missions/lab-breakthrough";

/**
 * The bounded runs of the breakthrough labs (tuning 6, `pulp_wars-w49.6`,
 * and tuning 7, `pulp_wars-w49.10`;
 * docs/product/RULESET_7_TUNING_HUMAN.md sections 13.2 and 14.2): the AI
 * seat plays the Normal policy, the player's seat one of two scripts.
 *
 * - `HOLD`: the defender of tuning 6. It holds the line: focused fire,
 *   every favourable attack, a melee unit in every city that can train, and
 *   the units behind the line walk to its gaps.
 * - `RETREAT`: the defender that stalled the Undead and Goblin AIs in the
 *   hand play of round 6. Its Catapults fire first; every other unit off
 *   the capital's center with an enemy within four tiles steps one tile
 *   back toward the second line (the capital's column, Catapults one
 *   column behind it), then everything shoots as in `HOLD`; the cities
 *   train a Catapult, a Swordsman, a Marksman, a Guard, a Fighter, and the
 *   units trained far away walk to the capital.
 */
export type BreakthroughScriptV7 = "HOLD" | "RETREAT";

export interface BreakthroughRunV7 {
  /** The round an attacker first stands on or behind the line. */
  readonly crossedInRound: number | null;
  readonly capitalFellInRound: number | null;
  /** AI turns from round 2 on without an attack, a Wail, or a Kaboom. */
  readonly turnsWithoutAttack: number;
  readonly attackersLost: number;
  readonly defendersLost: number;
}

const distance = (left: CoordV7, right: CoordV7): number =>
  Math.max(Math.abs(left.x - right.x), Math.abs(left.y - right.y));

const same = (left: CoordV7, right: CoordV7): boolean =>
  left.x === right.x && left.y === right.y;

export function breakthroughLabV7(id: string): GameStateV7 {
  const mission = MISSION_REGISTRY_V7.find((item) => item.id === id);
  if (mission === undefined) throw new Error(id);
  const setup = missionMatchSetupV7(mission);
  if (setup === null) throw new Error(id);
  const created = createPlayableGameV7(setup);
  if (!created.ok) throw new Error(`${id} ${created.error.code}`);
  return created.state;
}

/**
 * The script's fire: the shots that draw no retaliation go together at the
 * unit they kill, or else hurt most; then every other attack that kills or
 * deals at least what it takes; a pending reward is chosen.
 */
function fire(start: GameStateV7): GameStateV7 {
  const player = start.humanPlayerId;
  let state = start;
  const act = (command: CommandV7): boolean => {
    const result = applyCommandV7(state, player, command);
    if (result.accepted) state = result.state;
    return result.accepted;
  };
  for (let guard = 0; guard < 40; guard += 1) {
    const view = viewForV7(state, player);
    const byTarget = new Map<UnitId, { total: number; shot: CommandV7 }>();
    for (const command of queryPlayerCommandsV7(view)) {
      if (command.kind !== "ATTACK") continue;
      const preview = queryCombatPreviewV7(
        view,
        command.unitId,
        command.targetUnitId,
      );
      if (
        preview === null ||
        preview.attackerDies ||
        preview.damageToAttacker > 0 ||
        preview.damageToDefender <= 0
      )
        continue;
      const entry = byTarget.get(command.targetUnitId);
      byTarget.set(command.targetUnitId, {
        total: (entry?.total ?? 0) + preview.damageToDefender,
        shot: entry?.shot ?? command,
      });
    }
    let best: CommandV7 | null = null;
    let bestValue = -1;
    for (const [id, entry] of byTarget) {
      const target = state.units.find((unit) => unit.id === id);
      if (target === undefined) continue;
      const worth =
        (entry.total >= target.hp ? 1000 : 0) +
        Math.floor((100 * Math.min(entry.total, target.hp)) / target.hp);
      if (worth > bestValue) {
        best = entry.shot;
        bestValue = worth;
      }
    }
    if (best === null || !act(best)) break;
    if (state.outcome !== null) return state;
  }
  for (let guard = 0; guard < 64; guard += 1) {
    const view = viewForV7(state, player);
    const commands = queryPlayerCommandsV7(view);
    let best: CommandV7 | null = null;
    let bestValue = -1;
    for (const command of commands) {
      if (command.kind !== "ATTACK") continue;
      const preview = queryCombatPreviewV7(
        view,
        command.unitId,
        command.targetUnitId,
      );
      if (
        preview === null ||
        preview.attackerDies ||
        (!preview.defenderDies &&
          preview.damageToDefender < preview.damageToAttacker)
      )
        continue;
      const worth =
        (preview.defenderDies ? 1000 : 0) +
        10 * preview.damageToDefender -
        preview.damageToAttacker;
      if (worth > bestValue) {
        best = command;
        bestValue = worth;
      }
    }
    best ??=
      commands.find((command) => command.kind === "CHOOSE_CITY_REWARD") ?? null;
    if (best === null || !act(best)) break;
    if (state.outcome !== null) return state;
  }
  return state;
}

/** Every city that can trains the first of `roles` it can pay for. */
function train(
  start: GameStateV7,
  roles: readonly UnitRoleIdV7[],
): GameStateV7 {
  const player = start.humanPlayerId;
  let state = start;
  for (const role of roles)
    for (let guard = 0; guard < 6; guard += 1) {
      const command = queryPlayerCommandsV7(viewForV7(state, player)).find(
        (candidate) => candidate.kind === "TRAIN" && candidate.role === role,
      );
      if (command === undefined) break;
      const result = applyCommandV7(state, player, command);
      if (!result.accepted) break;
      state = result.state;
    }
  return state;
}

function endTurn(state: GameStateV7): GameStateV7 {
  const result = applyCommandV7(state, state.humanPlayerId, {
    kind: "END_TURN",
  });
  if (!result.accepted) throw new Error(result.error.code);
  return result.state;
}

/** The player's turn by the `HOLD` script. */
export function breakthroughHoldTurnV7(start: GameStateV7): GameStateV7 {
  const player = start.humanPlayerId;
  let state = fire(start);
  if (state.outcome !== null) return state;
  state = train(state, ["SWORDSMAN", "GUARD", "FIGHTER"]);
  for (let guard = 0; guard < 40; guard += 1) {
    const empty = LAB_BREAKTHROUGH_LINE_V7.filter(
      (where) => !state.units.some((unit) => same(unit.at, where)),
    );
    if (empty.length === 0) break;
    const gap = (from: CoordV7): number =>
      Math.min(...empty.map((where) => distance(where, from)));
    let best: CommandV7 | null = null;
    let bestGain = 0;
    for (const command of queryPlayerCommandsV7(viewForV7(state, player))) {
      if (command.kind !== "MOVE") continue;
      const unit = state.units.find((item) => item.id === command.unitId);
      const to = command.path.at(-1);
      if (
        unit === undefined ||
        to === undefined ||
        to.x > 6 ||
        !["GUARD", "SWORDSMAN", "FIGHTER"].includes(unit.role) ||
        LAB_BREAKTHROUGH_LINE_V7.some((where) => same(where, unit.at)) ||
        same(unit.at, LAB_BREAKTHROUGH_CAPITAL_V7)
      )
        continue;
      const gain = gap(unit.at) - gap(to);
      if (gain > bestGain) {
        best = command;
        bestGain = gain;
      }
    }
    if (best === null) break;
    const result = applyCommandV7(state, player, best);
    if (!result.accepted) break;
    state = result.state;
  }
  return endTurn(state);
}

/** The player's turn by the `RETREAT` script. */
export function breakthroughRetreatTurnV7(start: GameStateV7): GameStateV7 {
  const player = start.humanPlayerId;
  const capital = LAB_BREAKTHROUGH_CAPITAL_V7;
  let state = start;
  const enemies = () => state.units.filter((unit) => unit.ownerId !== player);
  // The Catapults (they cannot fire after a Move) fire first.
  const siege = new Set(
    state.units
      .filter((unit) => unit.ownerId === player && unit.role === "CATAPULT")
      .map((unit) => unit.id),
  );
  for (let guard = 0; guard < 12; guard += 1) {
    const view = viewForV7(state, player);
    let best: CommandV7 | null = null;
    let bestValue = -1;
    for (const command of queryPlayerCommandsV7(view)) {
      if (command.kind !== "ATTACK" || !siege.has(command.unitId)) continue;
      const preview = queryCombatPreviewV7(
        view,
        command.unitId,
        command.targetUnitId,
      );
      if (preview === null || preview.damageToDefender <= 0) continue;
      const worth =
        (preview.defenderDies ? 1000 : 0) + preview.damageToDefender;
      if (worth > bestValue) {
        best = command;
        bestValue = worth;
      }
    }
    if (best === null) break;
    const result = applyCommandV7(state, player, best);
    if (!result.accepted) break;
    state = result.state;
    if (state.outcome !== null) return state;
  }
  // One tile back toward the second line, the units nearest to it first.
  const order = state.units
    .filter((unit) => unit.ownerId === player)
    .sort(
      (left, right) =>
        distance(left.at, capital) - distance(right.at, capital) ||
        left.id - right.id,
    );
  for (const listed of order) {
    const unit = state.units.find((item) => item.id === listed.id);
    if (
      unit === undefined ||
      same(unit.at, capital) ||
      unit.activation.attacksUsed > 0
    )
      continue;
    const from = distance(unit.at, capital);
    const pressed = enemies().some((enemy) => distance(enemy.at, unit.at) <= 4);
    const line = unit.role === "CATAPULT" ? capital.x - 2 : capital.x - 1;
    const retreats = unit.at.x > line && pressed;
    const rallies = !pressed && from > 3;
    if (!retreats && !rallies) continue;
    let best: CommandV7 | null = null;
    let bestValue = Number.NEGATIVE_INFINITY;
    for (const command of queryPlayerCommandsV7(viewForV7(state, player))) {
      if (command.kind !== "MOVE" || command.unitId !== unit.id) continue;
      const to = command.path.at(-1);
      if (
        to === undefined ||
        state.cities.some((city) => same(city.at, to)) ||
        (retreats
          ? to.x >= unit.at.x
          : distance(to, capital) >= from || to.x > capital.x - 1)
      )
        continue;
      const near = Math.min(
        99,
        ...enemies().map((enemy) => distance(enemy.at, to)),
      );
      const value = 10 * Math.min(near, 5) - distance(to, capital);
      if (value > bestValue) {
        best = command;
        bestValue = value;
      }
    }
    if (best === null) continue;
    const result = applyCommandV7(state, player, best);
    if (result.accepted) state = result.state;
  }
  state = fire(state);
  if (state.outcome !== null) return state;
  state = train(state, [
    "CATAPULT",
    "SWORDSMAN",
    "MARKSMAN",
    "GUARD",
    "FIGHTER",
  ]);
  return endTurn(state);
}

/** The AI seat's turn with the Normal policy; the attacks it made. */
export function breakthroughPolicyTurnV7(start: GameStateV7): {
  readonly state: GameStateV7;
  readonly attacks: number;
} {
  const actor = start.turnOrder[start.activeSeatIndex];
  if (actor === undefined) throw new Error("no actor");
  let state = start;
  let attacks = 0;
  for (let accepted = 0; accepted < 128; accepted += 1) {
    const view = viewForV7(state, actor);
    const command = chooseNormalTurnCommandV7(
      view,
      accepted,
      128,
      chooseNormalCommandV7(view),
    );
    if (command === null) throw new Error("no command");
    if (
      command.kind === "ATTACK" ||
      command.kind === "WAIL" ||
      command.kind === "KABOOM"
    )
      attacks += 1;
    const result = applyCommandV7(state, actor, command);
    if (!result.accepted) throw new Error(result.error.code);
    state = result.state;
    if (command.kind === "END_TURN" || state.outcome !== null)
      return { state, attacks };
  }
  throw new Error("the turn did not end");
}

/** One bounded run: until the capital falls, the match ends, or `rounds`. */
export function runBreakthroughLabV7(
  id: string,
  rounds: number,
  script: BreakthroughScriptV7,
): BreakthroughRunV7 {
  let state = breakthroughLabV7(id);
  const player = state.humanPlayerId;
  let crossedInRound: number | null = null;
  let capitalFellInRound: number | null = null;
  let turnsWithoutAttack = 0;
  let attackersLost = 0;
  let defendersLost = 0;
  const count = (before: GameStateV7, after: GameStateV7): void => {
    for (const unit of before.units) {
      const still = after.units.find((item) => item.id === unit.id);
      if (still !== undefined && still.ownerId === unit.ownerId) continue;
      if (unit.ownerId === player) defendersLost += 1;
      else attackersLost += 1;
    }
  };
  while (
    state.outcome === null &&
    state.round <= rounds &&
    capitalFellInRound === null
  ) {
    const round = state.round;
    const before = state;
    if (state.turnOrder[state.activeSeatIndex] === player) {
      state =
        script === "HOLD"
          ? breakthroughHoldTurnV7(state)
          : breakthroughRetreatTurnV7(state);
      count(before, state);
      continue;
    }
    const turn = breakthroughPolicyTurnV7(state);
    state = turn.state;
    count(before, state);
    if (turn.attacks === 0 && round >= 2) turnsWithoutAttack += 1;
    if (
      crossedInRound === null &&
      state.units.some((unit) => unit.ownerId !== player && unit.at.x <= 6)
    )
      crossedInRound = round;
    if (
      state.cities.find((city) => same(city.at, LAB_BREAKTHROUGH_CAPITAL_V7))
        ?.ownerId !== player
    )
      capitalFellInRound = round;
  }
  return {
    crossedInRound,
    capitalFellInRound,
    turnsWithoutAttack,
    attackersLost,
    defendersLost,
  };
}
