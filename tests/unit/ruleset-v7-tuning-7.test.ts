import { describe, expect, it } from "vitest";
import {
  ARMY_COMMIT_COUNT_RATIO_V7,
  ARMY_COMMIT_COUNT_WEIGHT_V7,
  ARMY_POSITION_SPAN_V7,
  armyAssaultModeV7,
} from "../../src/ai/v7-army";
import {
  chooseNormalCommandV7,
  chooseNormalTurnCommandV7,
  inspectNormalArmyV7,
  inspectNormalTacticalFactsV7,
} from "../../src/ai/v7";
import { corePresentationPlanV7 } from "../../src/render/canvas/presentation-plan-v7";
import {
  MISSION_REGISTRY_V7,
  RULESET_7_ID,
  applyCommandV7,
  createPlayableGameV7,
  projectEventsV7,
  queryCombatPreviewV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type FactionIdV7,
  type GameStateV7,
  type TechnologyIdV7,
  type UnitId,
} from "../../src/engine/index";
import {
  LAB_BREAKTHROUGH_CAPITAL_V7,
  LAB_BREAKTHROUGH_V7,
} from "../../src/engine/v7/missions/lab-breakthrough";
import {
  breakthroughLabV7,
  runBreakthroughLabV7,
} from "../fixtures/v7-breakthrough-lab";
import { checkedV7 } from "../fixtures/v7-builders";
import {
  applyOkV7,
  endTurnUntilV7,
  seatIdV7,
  unitAtV7,
  type GoblinPieceV7,
} from "../fixtures/v7-goblin-arena";
import { at, fieldV7, forestV7, patchTileV7 } from "../fixtures/v7-revision20";
import {
  CAMPAIGN_FRONT_MAIN_UNITS_V7,
  CAMPAIGN_FRONT_MIN_UNITS_V7,
} from "../../src/ai/v7-campaign";

/**
 * Tuning 7 (`pulp_wars-w49.10`, identity unchanged at `pulp-wars-poc-7r64`;
 * docs/product/RULESET_7_TUNING_HUMAN.md section 14, the Normal AI of a
 * Human, Undead, or Goblin seat): it commits against the enemy in front of
 * it and keeps committing after the line breaks, every faction's seat
 * grows, the fast units land with the infantry, the siege units go under
 * fire and stay off the enemy's melee units, Coins go to units while an
 * enemy army is in the field, the abilities are used, and the free army
 * marches on one neighbour. The five defects of the round-6 hand play are
 * at the end.
 *
 * Two-seat field (tests/fixtures/v7-revision20.ts): seat 0 capital (8, 8)
 * with territory x 7-9, y 7-9; seat 1 capital (2, 8) with territory x 1-3,
 * y 7-9; villages (5, 5), (8, 5), (5, 8), which `bare` removes where a
 * test is about something else. Every tile is explored by both seats.
 */

const HUMANS = ["ORIGINAL", "ORIGINAL"] as const;
const GOBLINS = ["GOBLIN", "ORIGINAL"] as const;
const UNDEAD = ["UNDEAD", "ORIGINAL"] as const;
/** A closed set of technologies with no free Monument (no Scouting). */
const BASIC: readonly TechnologyIdV7[] = [
  "GATHERING",
  "HUNTING",
  "FORESTRY",
  "SAWMILLING",
  "MARKSMANSHIP",
  "DRILL",
  "ENGINEERING",
];

const field = (
  pieces: readonly GoblinPieceV7[],
  options: {
    readonly factions?: readonly FactionIdV7[];
    readonly techs?: Readonly<Record<number, readonly TechnologyIdV7[]>>;
    readonly coins?: number;
    readonly activeSeat?: number;
  } = {},
): GameStateV7 =>
  fieldV7(pieces, {
    factions: options.factions ?? HUMANS,
    techs: options.techs ?? { 0: BASIC },
    coins: options.coins ?? 0,
    ...(options.activeSeat === undefined
      ? {}
      : { activeSeat: options.activeSeat }),
  });

/** The field without its villages. */
function bare(state: GameStateV7): GameStateV7 {
  let next = state;
  for (const tile of state.board.tiles)
    if (tile.site === "VILLAGE")
      next = patchTileV7(next, tile.at, { site: null });
  return next;
}

interface PolicyTurnV7 {
  readonly commands: readonly CommandV7[];
  /** The state before the End Turn. */
  readonly state: GameStateV7;
  /** The state before each command. */
  readonly before: readonly GameStateV7[];
}

/** Seat `seat` plays its turn with the Normal policy. */
function policyTurn(start: GameStateV7, seat = 0): PolicyTurnV7 {
  const actor = seatIdV7(start, seat);
  const commands: CommandV7[] = [];
  const before: GameStateV7[] = [];
  let state = start;
  for (let accepted = 0; accepted < 128; accepted += 1) {
    const view = viewForV7(state, actor);
    const command = chooseNormalTurnCommandV7(
      view,
      accepted,
      128,
      chooseNormalCommandV7(view),
    );
    if (command === null) throw new Error("no command");
    commands.push(command);
    before.push(state);
    if (command.kind === "END_TURN") return { commands, state, before };
    state = applyOkV7(state, actor, command).state;
    if (state.outcome !== null) return { commands, state, before };
  }
  throw new Error("the turn did not end");
}

/** Every seat ends its turn: seat 0 is to move again. */
function nextRound(state: GameStateV7): GameStateV7 {
  let next = state;
  for (let seat = 0; seat < state.players.length; seat += 1)
    next = applyOkV7(next, seatIdV7(next, seat), { kind: "END_TURN" }).state;
  return next;
}

const kindsOf = (commands: readonly CommandV7[]): readonly string[] =>
  commands.map((command) => command.kind);

const attacksOf = (
  commands: readonly CommandV7[],
): readonly Extract<CommandV7, { kind: "ATTACK" }>[] =>
  commands.flatMap((command) => (command.kind === "ATTACK" ? [command] : []));

const movesOf = (
  commands: readonly CommandV7[],
): readonly Extract<CommandV7, { kind: "MOVE" }>[] =>
  commands.flatMap((command) => (command.kind === "MOVE" ? [command] : []));

const distance = (left: CoordV7, right: CoordV7): number =>
  Math.max(Math.abs(left.x - right.x), Math.abs(left.y - right.y));

const armyOf = (state: GameStateV7, seat = 0) =>
  inspectNormalArmyV7(viewForV7(state, seatIdV7(state, seat)));

const modesOf = (state: GameStateV7, seat = 0): readonly string[] =>
  armyOf(state, seat).modes.map((entry) => entry.mode);

/**
 * Seat 0's units of `role` (all of them without one) lose their home, so
 * that they fill no unit slot of its cities.
 */
function homeless(state: GameStateV7, role?: string): GameStateV7 {
  const own = seatIdV7(state, 0);
  return checkedV7({
    ...state,
    units: state.units.map((unit) =>
      unit.ownerId === own && (role === undefined || unit.role === role)
        ? { ...unit, homeCityId: null }
        : unit,
    ),
  });
}

/** Where a unit stands (it must be on the board). */
const whereIs = (state: GameStateV7, id: UnitId): CoordV7 => {
  const unit = state.units.find((item) => item.id === id);
  if (unit === undefined) throw new Error(`unit ${id} is gone`);
  return unit.at;
};

describe("tuning 7 identity", () => {
  it("is still 7r49: no rule, command, state, or event shape changed", () => {
    expect(RULESET_7_ID).toBe("pulp-wars-poc-7r64");
  });
});

describe("1. commit: a position is local, and numbers are numbers", () => {
  it("commits at a tenth more weight with one and a half times the units", () => {
    expect(ARMY_COMMIT_COUNT_RATIO_V7).toBe(150);
    expect(ARMY_COMMIT_COUNT_WEIGHT_V7).toBe(110);
    expect(ARMY_POSITION_SPAN_V7).toBe(4);
    const facts = { hostile: 100, near: 110, coming: 110, contact: false };
    // By weight alone: not half as much again, so no assault.
    expect(armyAssaultModeV7(facts)).toBe("NONE");
    // Six units against four: numbers.
    expect(
      armyAssaultModeV7({
        ...facts,
        hostileUnits: 4,
        nearUnits: 6,
        comingUnits: 6,
      }),
    ).toBe("COMMIT");
    // Five against four: no.
    expect(
      armyAssaultModeV7({
        ...facts,
        hostileUnits: 4,
        nearUnits: 5,
        comingUnits: 5,
      }),
    ).toBe("NONE");
    // Twice the units at equal weight: no (cheap units against dear ones
    // in cover only bleed).
    expect(
      armyAssaultModeV7({
        ...facts,
        near: 100,
        coming: 100,
        hostileUnits: 4,
        nearUnits: 8,
        comingUnits: 8,
      }),
    ).toBe("NONE");
    // The units are coming in numbers but have not arrived: it stages.
    expect(
      armyAssaultModeV7({
        ...facts,
        near: 40,
        hostileUnits: 4,
        nearUnits: 2,
        comingUnits: 6,
      }),
    ).toBe("STAGE");
  });

  /**
   * The parked army of the six-seat game (`r6c`, rounds 19 to 26): the
   * Human AI kept 8 to 12 units three or four tiles from a city for seven
   * rounds and never assaulted. The player's 23 units stood in one chain,
   * each within two tiles of the next, so the round-6 link read the whole
   * land as one position that no front outweighed. Here: a city with four
   * defenders (169 by weight), ten units in front of it (258), and six
   * more Swordsmen of the enemy in a chain across the board. (With a
   * Catapult and two Marksmen in range of a Guard the round-6 policy found
   * a combined kill here and attacked too; the position it did not attack
   * is the horde below.)
   */
  const parked = (): GameStateV7 =>
    bare(
      field([
        { seat: 0, role: "CATAPULT", at: at(5, 8) },
        { seat: 0, role: "CATAPULT", at: at(6, 9) },
        { seat: 0, role: "MARKSMAN", at: at(5, 7) },
        { seat: 0, role: "MARKSMAN", at: at(5, 9) },
        { seat: 0, role: "GUARD", at: at(5, 6) },
        { seat: 0, role: "GUARD", at: at(5, 10) },
        { seat: 0, role: "FIGHTER", at: at(4, 6) },
        { seat: 0, role: "FIGHTER", at: at(4, 8) },
        { seat: 0, role: "FIGHTER", at: at(4, 10) },
        { seat: 0, role: "FIGHTER", at: at(8, 8) },
        { seat: 1, role: "GUARD", at: at(2, 8) },
        { seat: 1, role: "SWORDSMAN", at: at(2, 7) },
        { seat: 1, role: "SWORDSMAN", at: at(2, 9) },
        { seat: 1, role: "MARKSMAN", at: at(1, 8) },
        // The rest of the enemy's land, two tiles at a time.
        { seat: 1, role: "SWORDSMAN", at: at(2, 5) },
        { seat: 1, role: "SWORDSMAN", at: at(2, 3) },
        { seat: 1, role: "SWORDSMAN", at: at(2, 1) },
        { seat: 1, role: "SWORDSMAN", at: at(4, 1) },
        { seat: 1, role: "SWORDSMAN", at: at(6, 1) },
        { seat: 1, role: "SWORDSMAN", at: at(8, 1) },
      ]),
    );

  it("weighs the defenders in front of it, not the enemy's whole land", () => {
    const state = parked();
    const army = armyOf(state);
    const front = army.positions.find((position) => position.ownIds.length > 0);
    // The city's four defenders and the Swordsman two tiles north of them:
    // the chain beyond four tiles of the seed is another position.
    expect(front?.hostileIds).toHaveLength(5);
    // (The Champion costs 6 Coins since the ninth unit, 7r55: its weight
    // is 39, was 35; three of them here, 181 for 169.)
    expect(front).toMatchObject({ mode: "COMMIT", hostile: 181, near: 258 });
    expect(new Set(army.modes.map((entry) => entry.mode))).toEqual(
      new Set(["COMMIT"]),
    );
    // With all ten hostile units in one position (the round-6 reading:
    // 344 by weight) the same army was not committed.
    expect(
      armyAssaultModeV7({
        hostile: 344,
        near: 258,
        coming: 258,
        contact: false,
      }),
    ).toBe("NONE");
  });

  it("assaults the city that turn: siege at the center first, every melee unit that reaches, then the center and the capture", () => {
    const state = parked();
    const guard = unitAtV7(state, at(2, 8)).id;
    const first = policyTurn(state);
    const attacks = attacksOf(first.commands);
    // The Catapult opens on the unit on the center, and the Marksman
    // finishes it.
    expect(attacks[0]).toEqual({
      kind: "ATTACK",
      unitId: unitAtV7(state, at(5, 8)).id,
      targetUnitId: guard,
    });
    expect(attacks[1]?.targetUnitId).toBe(guard);
    expect(first.state.units.some((unit) => unit.id === guard)).toBe(false);
    // Both Marksmen and all three Fighters of the front attack in the same
    // turn.
    const attackers = new Set(attacks.map((attack) => attack.unitId));
    for (const where of [at(5, 7), at(5, 9), at(4, 6), at(4, 8), at(4, 10)])
      expect(attackers.has(unitAtV7(state, where).id)).toBe(true);
    // Next turn a Fighter steps onto the emptied center before anything
    // else, and the turn after it captures.
    const second = policyTurn(nextRound(first.state));
    expect(second.commands[0]).toMatchObject({
      kind: "MOVE",
      path: [at(2, 8)],
    });
    expect(attacksOf(second.commands).length).toBeGreaterThanOrEqual(5);
    const third = policyTurn(nextRound(second.state));
    expect(third.commands[0]?.kind).toBe("CAPTURE");
  });

  /**
   * A horde in front of a city (the same chain of Swordsmen behind it):
   * twelve Fighters and two Guards (298 by weight) against three Swordsmen
   * in cover, on a Field Defense and in two Forests, a Marksman, and the
   * first Swordsman of the chain (209). That is 143%: not half as much
   * again. A Fighter deals 3 to such a Swordsman and takes 8, and only
   * three of them reach one, so there is no combined kill either: the
   * round-6 policy (run from its source on this position) made no attack
   * in four turns. It parked.
   */
  const horde = (): GameStateV7 => {
    let state = bare(
      field([
        ...[6, 7, 8, 9, 10].map((y): GoblinPieceV7 => ({
          seat: 0,
          role: "FIGHTER",
          at: at(4, y),
        })),
        ...[7, 8, 9].map((y): GoblinPieceV7 => ({
          seat: 0,
          role: "FIGHTER",
          at: at(5, y),
        })),
        ...[6, 7, 9, 10].map((y): GoblinPieceV7 => ({
          seat: 0,
          role: "FIGHTER",
          at: at(6, y),
        })),
        { seat: 0, role: "GUARD", at: at(5, 6) },
        { seat: 0, role: "GUARD", at: at(5, 10) },
        { seat: 0, role: "FIGHTER", at: at(8, 8) },
        { seat: 1, role: "SWORDSMAN", at: at(2, 8) },
        { seat: 1, role: "SWORDSMAN", at: at(2, 7) },
        { seat: 1, role: "SWORDSMAN", at: at(2, 9) },
        { seat: 1, role: "MARKSMAN", at: at(1, 8) },
        { seat: 1, role: "SWORDSMAN", at: at(2, 5) },
        { seat: 1, role: "SWORDSMAN", at: at(2, 3) },
        { seat: 1, role: "SWORDSMAN", at: at(2, 1) },
        { seat: 1, role: "SWORDSMAN", at: at(4, 1) },
        { seat: 1, role: "SWORDSMAN", at: at(6, 1) },
        { seat: 1, role: "SWORDSMAN", at: at(8, 1) },
      ]),
    );
    for (const where of [at(2, 7), at(2, 9), at(2, 5)])
      state = forestV7(state, where);
    return patchTileV7(state, at(2, 8), { fieldDefense: true });
  };

  it("commits a horde with the numbers against Swordsmen in cover, where round 6 parked", () => {
    const state = horde();
    const front = armyOf(state).positions.find(
      (position) => position.ownIds.length > 0,
    );
    expect(front).toMatchObject({ mode: "COMMIT", hostile: 230, near: 298 });
    expect(front?.ownIds).toHaveLength(14);
    expect(front?.hostileIds).toHaveLength(5);
    // The round-6 reading: ten enemy units in one position (384), and by
    // weight alone even the five in front are not outweighed by half.
    expect(
      armyAssaultModeV7({
        hostile: 209,
        near: 298,
        coming: 298,
        contact: false,
      }),
    ).toBe("NONE");
    const first = policyTurn(state);
    const attacks = attacksOf(first.commands);
    expect(attacks.length).toBeGreaterThanOrEqual(4);
    // Three Fighters on the same Swordsman (this turn's focus): each of
    // them takes more than it deals.
    const byTarget = new Map<UnitId, number>();
    for (const attack of attacks)
      byTarget.set(
        attack.targetUnitId,
        (byTarget.get(attack.targetUnitId) ?? 0) + 1,
      );
    expect(Math.max(...byTarget.values())).toBe(3);
    // The turn after, that Swordsman is dead and a Fighter stands in its
    // Forest, next to the city center.
    const second = policyTurn(nextRound(first.state));
    const swordsmen = (current: GameStateV7): number =>
      current.units.filter(
        (unit) =>
          unit.ownerId === seatIdV7(current, 1) &&
          unit.role === "SWORDSMAN" &&
          unit.at.x === 2 &&
          unit.at.y >= 7,
      ).length;
    expect(swordsmen(state)).toBe(3);
    expect(swordsmen(second.state)).toBe(2);
  });

  /**
   * The stall of the Goblin lab game (`r6b`, rounds 7 and 8): the line was
   * gone, the defender stood one tile back with its Catapults, and 22
   * units made no attack for two turns. Thirteen Goblin units (287 by
   * weight) against eight (247, one Marksman wounded): 116% by weight,
   * more than one and a half times the units, and a battle that is joined.
   * Round 6 read no commitment here (no unit in contact): its units took
   * only the exchanges in their favor, and against a defender that shot
   * and stepped back there were none.
   */
  const broken = (): GameStateV7 =>
    bare(
      field(
        [
          { seat: 0, role: "GUARD", at: at(5, 3) },
          { seat: 0, role: "GUARD", at: at(5, 5) },
          { seat: 0, role: "GUARD", at: at(5, 7) },
          { seat: 0, role: "MARKSMAN", at: at(6, 3) },
          { seat: 0, role: "MARKSMAN", at: at(6, 5) },
          { seat: 0, role: "MARKSMAN", at: at(6, 7) },
          { seat: 0, role: "CATAPULT", at: at(7, 4) },
          { seat: 0, role: "CATAPULT", at: at(7, 6) },
          { seat: 0, role: "RAIDER", at: at(6, 4) },
          { seat: 0, role: "RAIDER", at: at(6, 6) },
          { seat: 0, role: "FIGHTER", at: at(7, 3) },
          { seat: 0, role: "FIGHTER", at: at(7, 5) },
          { seat: 0, role: "FIGHTER", at: at(7, 7) },
          { seat: 0, role: "FIGHTER", at: at(8, 8) },
          { seat: 1, role: "CATAPULT", at: at(1, 3) },
          { seat: 1, role: "CATAPULT", at: at(1, 5) },
          { seat: 1, role: "CATAPULT", at: at(1, 7) },
          { seat: 1, role: "MARKSMAN", at: at(2, 4), hp: 7 },
          { seat: 1, role: "MARKSMAN", at: at(2, 6) },
          { seat: 1, role: "SWORDSMAN", at: at(3, 3) },
          { seat: 1, role: "SWORDSMAN", at: at(3, 7) },
          { seat: 1, role: "GUARD", at: at(2, 8) },
        ],
        { factions: GOBLINS, techs: {} },
      ),
    );

  it("goes again against a line that stepped back a tile: no turn without an attack", () => {
    const state = broken();
    const army = armyOf(state);
    const front = army.positions.find((position) => position.ownIds.length > 0);
    // No unit is in contact, and the weight by price and HP is 287
    // against 247 (116%). The Goblin pass, correction (`pulp_wars-w49.12`):
    // a unit with Gang Up weighs half as much again, 399 here.
    expect(front).toMatchObject({ mode: "COMMIT", joined: true, near: 399 });
    const own = seatIdV7(state, 0);
    const gap = (current: GameStateV7, where: CoordV7): number =>
      Math.min(
        ...current.units
          .filter((unit) => unit.ownerId !== own)
          .map((unit) => distance(unit.at, where)),
      );
    let current = state;
    for (let turn = 0; turn < 2; turn += 1) {
      const played = policyTurn(current);
      // The Bomb Chuckers and the Wolf Riders (they move and strike) lead;
      // the first shots come before the first melee attack.
      const attacks = attacksOf(played.commands);
      expect(attacks.length, `turn ${turn}`).toBeGreaterThanOrEqual(3);
      const first = attacks[0];
      const shooter = current.units.find((unit) => unit.id === first?.unitId);
      expect(shooter?.role, `turn ${turn}`).toMatch(/MARKSMAN|RAIDER/);
      // Nobody of the front walks away from the enemy (measured against
      // the enemy units that are left: tuning 8 kills more of them in
      // these two turns, and a unit whose nearest enemy died did not walk
      // away from it).
      for (const unit of current.units) {
        if (unit.ownerId !== own || unit.at.x >= 8) continue;
        const after = played.state.units.find((item) => item.id === unit.id);
        if (after === undefined) continue;
        expect(
          gap(played.state, after.at),
          `turn ${turn} unit ${unit.id}`,
        ).toBeLessThanOrEqual(gap(played.state, unit.at));
      }
      current = nextRound(played.state);
    }
    // The Orc Brutes, the Goblins, and the Rocket Carts (the units that
    // cannot strike a unit that stepped back) came up as a block.
    for (const unit of current.units)
      if (
        unit.ownerId === own &&
        unit.at.x < 8 &&
        (unit.role === "GUARD" || unit.role === "CATAPULT")
      )
        expect(unit.at.x, `${unit.role} ${unit.id}`).toBeLessThanOrEqual(5);
  });
});

describe("1c and 4. the slow units go as a block, the fast units with them", () => {
  it("a Zombie without numbers and without a unit that strikes on arrival stays out of the enemy's reach", () => {
    // One Zombie against two Marksmen and a Swordsman (round 6: it walked
    // up alone, could not attack after its Move, and was shot).
    const state = bare(
      field(
        [
          { seat: 0, role: "GUARD", at: at(6, 4) },
          { seat: 0, role: "FIGHTER", at: at(8, 8) },
          { seat: 1, role: "MARKSMAN", at: at(3, 3) },
          { seat: 1, role: "MARKSMAN", at: at(3, 5) },
          { seat: 1, role: "SWORDSMAN", at: at(3, 4) },
          { seat: 1, role: "FIGHTER", at: at(2, 8) },
        ],
        { factions: UNDEAD, techs: {} },
      ),
    );
    const zombie = unitAtV7(state, at(6, 4)).id;
    let current = state;
    for (let turn = 0; turn < 2; turn += 1) {
      const played = policyTurn(current);
      expect(whereIs(played.state, zombie), `turn ${turn}`).toEqual(at(6, 4));
      current = nextRound(played.state);
    }
  });

  it("three Zombies with three Skeletons and a Ghoul advance together, and a Zombie bites the cheap infantry", () => {
    const state = bare(
      field(
        [
          { seat: 0, role: "GUARD", at: at(6, 3) },
          { seat: 0, role: "GUARD", at: at(6, 4) },
          { seat: 0, role: "GUARD", at: at(6, 5) },
          { seat: 0, role: "FIGHTER", at: at(7, 3) },
          { seat: 0, role: "FIGHTER", at: at(7, 4) },
          { seat: 0, role: "FIGHTER", at: at(7, 5) },
          { seat: 0, role: "RAIDER", at: at(7, 6) },
          { seat: 0, role: "FIGHTER", at: at(8, 8) },
          { seat: 1, role: "MARKSMAN", at: at(3, 3) },
          { seat: 1, role: "FIGHTER", at: at(3, 5) },
          { seat: 1, role: "FIGHTER", at: at(3, 4) },
          { seat: 1, role: "FIGHTER", at: at(2, 8) },
        ],
        { factions: UNDEAD, techs: {} },
      ),
    );
    expect(new Set(modesOf(state))).toEqual(new Set(["COMMIT"]));
    const own = seatIdV7(state, 0);
    const zombies = [at(6, 3), at(6, 4), at(6, 5)].map(
      (where) => unitAtV7(state, where).id,
    );
    let current = state;
    let bitten = false;
    for (let turn = 0; turn < 3; turn += 1) {
      const played = policyTurn(current);
      // No Zombie ends a turn without a unit that can strike on arrival
      // within two tiles of it.
      for (const id of zombies) {
        const zombie = played.state.units.find((unit) => unit.id === id);
        if (zombie === undefined) continue;
        expect(
          played.state.units.some(
            (unit) =>
              unit.ownerId === own &&
              (unit.role === "FIGHTER" || unit.role === "RAIDER") &&
              distance(unit.at, zombie.at) <= 2,
          ),
          `turn ${turn} zombie ${id}`,
        ).toBe(true);
      }
      for (const attack of attacksOf(played.commands))
        if (zombies.includes(attack.unitId)) {
          // What the Zombie attacks is a Fighter, not the Marksman.
          const target = current.units.find(
            (unit) => unit.id === attack.targetUnitId,
          );
          expect(target?.role).toBe("FIGHTER");
          bitten = true;
        }
      current = nextRound(played.state);
    }
    expect(bitten).toBe(true);
    // A Fighter the Zombie hurt and a Skeleton killed rose as a Zombie.
    expect(
      current.units.filter(
        (unit) => unit.ownerId === own && unit.role === "GUARD",
      ).length,
    ).toBeGreaterThan(3);
  });

  /**
   * Two Knights and a Raider behind three Swordsmen, a Marksman behind
   * them, and an enemy position three tiles in front of the Swordsmen.
   */
  const charge = (moved: boolean): GameStateV7 => {
    const state = bare(
      field(
        [
          { seat: 0, role: "KNIGHT", at: at(8, 3) },
          { seat: 0, role: "KNIGHT", at: at(8, 5) },
          { seat: 0, role: "RAIDER", at: at(8, 4) },
          { seat: 0, role: "SWORDSMAN", at: at(7, 3) },
          { seat: 0, role: "SWORDSMAN", at: at(7, 4) },
          { seat: 0, role: "SWORDSMAN", at: at(7, 5) },
          { seat: 0, role: "MARKSMAN", at: at(9, 4) },
          { seat: 0, role: "FIGHTER", at: at(8, 8) },
          { seat: 1, role: "SWORDSMAN", at: at(4, 3) },
          { seat: 1, role: "SWORDSMAN", at: at(4, 5) },
          { seat: 1, role: "MARKSMAN", at: at(3, 4) },
          { seat: 1, role: "FIGHTER", at: at(2, 8) },
        ],
        { techs: {} },
      ),
    );
    return moved
      ? checkedV7({
          ...state,
          units: state.units.map((unit) =>
            unit.ownerId === seatIdV7(state, 1) && unit.at.y <= 5
              ? {
                  ...unit,
                  activation: {
                    ...unit.activation,
                    moved: true,
                    movedPathLength: 1,
                  },
                }
              : unit,
          ),
        })
      : state;
  };

  it("holds the Knights and the Raider behind the infantry until it strikes, and then they strike in the same turn", () => {
    const state = charge(false);
    const own = seatIdV7(state, 0);
    const fast = new Set(
      [at(8, 3), at(8, 5), at(8, 4)].map((where) => unitAtV7(state, where).id),
    );
    const gapOf = (current: GameStateV7, where: CoordV7): number =>
      Math.min(
        ...current.units
          .filter((unit) => unit.ownerId !== own && unit.at.y <= 5)
          .map((unit) => distance(unit.at, where)),
      );
    let current = state;
    let struck = false;
    for (let turn = 0; turn < 5 && !struck; turn += 1) {
      const played = policyTurn(current);
      const attacks = attacksOf(played.commands);
      const fastAttacks = attacks.filter((attack) => fast.has(attack.unitId));
      const slowAttacks = attacks.filter((attack) => !fast.has(attack.unitId));
      if (slowAttacks.length === 0) {
        // The infantry has not struck: nor has a fast unit, and none of
        // them stands nearer to the enemy than the foremost Swordsman.
        expect(fastAttacks, `turn ${turn}`).toHaveLength(0);
        const front = Math.min(
          ...played.state.units
            .filter(
              (unit) =>
                unit.ownerId === own && !fast.has(unit.id) && unit.at.y <= 6,
            )
            .map((unit) => gapOf(played.state, unit.at)),
        );
        for (const unit of played.state.units)
          if (fast.has(unit.id))
            expect(
              gapOf(played.state, unit.at),
              `turn ${turn}`,
            ).toBeGreaterThanOrEqual(front);
      } else {
        // The turn the first Swordsman strikes, the Knights do too.
        expect(fastAttacks.length, `turn ${turn}`).toBeGreaterThanOrEqual(2);
        struck = true;
      }
      current = nextRound(played.state);
    }
    expect(struck).toBe(true);
  });

  it("does not wait when the enemy is on the move: the fast units lead the chase", () => {
    // The same position, but the enemy's units moved in their last turn
    // (a unit's activation is public until its owner's next turn): this
    // is no prepared line, and the infantry would never catch it.
    const state = charge(true);
    const fast = new Set(
      [at(8, 3), at(8, 5), at(8, 4)].map((where) => unitAtV7(state, where).id),
    );
    expect(armyOf(charge(false)).positions[0]).toMatchObject({
      mode: "COMMIT",
    });
    const first = policyTurn(state);
    // Both Knights reach the enemy (Move 3) and attack in the first turn,
    // while the Swordsmen in front of them are still two turns away.
    const attacks = attacksOf(first.commands).filter((attack) =>
      fast.has(attack.unitId),
    );
    expect(attacks.length).toBeGreaterThanOrEqual(2);
    // Against the same position standing still they wait (see above).
    expect(
      attacksOf(policyTurn(charge(false)).commands).filter((attack) =>
        fast.has(attack.unitId),
      ),
    ).toHaveLength(0);
  });

  it("steps a wounded unit out from between the Catapults when an enemy Knight is in reach, before it recovers", () => {
    const state = bare(
      field(
        [
          { seat: 0, role: "CATAPULT", at: at(7, 3) },
          { seat: 0, role: "CATAPULT", at: at(7, 5) },
          { seat: 0, role: "SWORDSMAN", at: at(7, 4), hp: 4 },
          { seat: 0, role: "SWORDSMAN", at: at(6, 3) },
          { seat: 0, role: "FIGHTER", at: at(8, 8) },
          { seat: 1, role: "KNIGHT", at: at(3, 4) },
          { seat: 1, role: "SWORDSMAN", at: at(2, 4) },
          { seat: 1, role: "FIGHTER", at: at(2, 8) },
        ],
        { techs: {} },
      ),
    );
    const wounded = unitAtV7(state, at(7, 4)).id;
    const turn = policyTurn(state);
    const move = movesOf(turn.commands).find(
      (command) => command.unitId === wounded,
    );
    const to = move?.path.at(-1);
    if (to === undefined) throw new Error("the wounded unit did not move");
    // Not between the two Catapults any more, and no nearer to the Knight.
    expect(
      [at(7, 3), at(7, 5)].filter((catapult) => distance(to, catapult) <= 1),
    ).toHaveLength(1);
    expect(distance(to, at(3, 4))).toBeGreaterThanOrEqual(4);
    // Without a Knight in sight it recovers where it stands.
    const calm = checkedV7({
      ...state,
      units: state.units.filter((unit) => unit.role !== "KNIGHT"),
    });
    const quiet = policyTurn(calm);
    expect(
      quiet.commands.some(
        (command) => command.kind === "RECOVER" && command.unitId === wounded,
      ),
    ).toBe(true);
  });
});

describe("2. every faction's seat grows", () => {
  /** A seat at its unit limit on one city, with two Forests in its land. */
  const capped = (
    faction: FactionIdV7,
    techs: readonly TechnologyIdV7[],
  ): GameStateV7 => {
    const units: GoblinPieceV7[] = [
      { seat: 0, role: "FIGHTER", at: at(8, 8) },
      { seat: 0, role: "FIGHTER", at: at(9, 9) },
      // (A Goblin capital holds one unit more.)
      ...(faction === "GOBLIN"
        ? [{ seat: 0, role: "FIGHTER" as const, at: at(7, 8) }]
        : []),
      { seat: 1, role: "FIGHTER", at: at(2, 8) },
    ];
    return forestV7(
      forestV7(
        bare(
          field(units, {
            factions: [faction, "ORIGINAL"],
            techs: { 0: techs },
            coins: 12,
          }),
        ),
        at(7, 7),
      ),
      at(9, 7),
    );
  };

  it.each([
    ["UNDEAD", ["GATHERING", "HUNTING", "DRILL", "FORTIFICATION"]],
    ["GOBLIN", ["GATHERING", "HUNTING", "MARKSMANSHIP"]],
  ] as const)(
    "a %s seat at its unit limit with nothing to buy population with researches the growth its land can use, and builds it",
    (faction, techs) => {
      // The opening of the hand-played games: Gathering and Hunting owned,
      // the Fruit and the Game eaten, the first unit of the faction's order
      // unlocked (the Zombie, the Bomb Chucker), every unit slot filled.
      // Round 6 researched toward its next unit and stood at the limit; the
      // land has two Forests.
      const state = capped(faction, techs);
      // Before its first unit it does not: units come first.
      expect(
        armyOf(capped(faction, ["GATHERING", "HUNTING"])).research?.growth,
      ).toBe(false);
      const army = armyOf(state);
      expect(army.research).toMatchObject({
        tech: "FORESTRY",
        growth: true,
        due: true,
      });
      const turn = policyTurn(state);
      expect(turn.commands[0]).toEqual({ kind: "RESEARCH", tech: "FORESTRY" });
      expect(turn.commands[1]).toMatchObject({ kind: "BUILD_LUMBER_CAMP" });
    },
  );

  it("at the unit limit it buys the growth on offer before it researches, and the level gives it a slot", () => {
    const state = capped("UNDEAD", [
      "GATHERING",
      "HUNTING",
      "FORESTRY",
      "DRILL",
      "FORTIFICATION",
    ]);
    // Growth is on offer: the next technology is the army's again.
    expect(armyOf(state).research?.growth).toBe(false);
    const turn = policyTurn(state);
    const kinds = kindsOf(turn.commands);
    // The Industry reshuffle (`pulp_wars-w49.21`, 7r56): the Workshop is
    // at the root, which this seat owns, so with one Lumber Camp built the
    // second purchase is the Workshop beside it (2 population for 4 Coins;
    // a second Lumber Camp, 1 for 3, before).
    expect(kinds.slice(0, 2)).toEqual(["BUILD_LUMBER_CAMP", "BUILD_WORKSHOP"]);
    // The Undead pass (`pulp_wars-w49.13`): an Undead level-2 Survey was
    // Scouts, with a free Ghoul, so the level's slot was filled by the
    // reward (it was a TRAIN after the two camps before). The reward ladder
    // rework (`pulp_wars-zypi`): level 2 offers the Stockpile or the
    // Militia, and this seat at its unit limit takes the Militia's free
    // Skeleton into the new slot.
    expect(turn.commands[2]).toMatchObject({
      kind: "CHOOSE_CITY_REWARD",
      reward: "MILITIA",
    });
    const own = seatIdV7(turn.state, 0);
    const fighters = (value: GameStateV7) =>
      value.units.filter(
        (unit) => unit.ownerId === own && unit.role === "FIGHTER",
      ).length;
    expect(fighters(turn.state)).toBe(fighters(state) + 1);
    const capital = turn.state.cities.find((city) => city.ownerId === own);
    expect(capital?.level).toBe(2);
  });

  it("is not pressed for good by an enemy unit on its own center: it still researches", () => {
    // Round 6 read "a city can still train" for a city with an enemy on
    // its center, bought nothing but units, and so nothing at all: a seat
    // banked 25 and 34 Coins while it lost its cities.
    const state = bare(
      field(
        [
          { seat: 0, role: "FIGHTER", at: at(9, 9) },
          { seat: 1, role: "GUARD", at: at(8, 8) },
          { seat: 1, role: "FIGHTER", at: at(2, 8) },
        ],
        {
          factions: UNDEAD,
          techs: { 0: ["GATHERING", "HUNTING", "DRILL", "FORTIFICATION"] },
          coins: 20,
        },
      ),
    );
    const army = armyOf(state);
    expect(army.threatDistance).toBe(0);
    expect(army.pressed).toBe(false);
    const turn = policyTurn(state);
    // The enemy on the center is attacked first, and the Coins are spent.
    expect(turn.commands[0]?.kind).toBe("ATTACK");
    expect(kindsOf(turn.commands)).toContain("RESEARCH");
  });

  it("an Undead seat in a real opening (dry land 14 x 14, seed 4, against the Human AI) researches a growth technology and builds on it", () => {
    // The map of the hand-played game `r6d`, where the Undead AI stood at
    // five units on two cities from round 6 to round 12 and its capital
    // never grew. Both seats play the Normal policy for eighteen rounds;
    // nothing is read but what the Undead seat bought.
    const created = createPlayableGameV7({
      rulesetId: RULESET_7_ID,
      seed: 4,
      width: 14,
      height: 14,
      aiCount: 1,
      aiDifficulty: "NORMAL",
      aiMode: "RIVAL",
      humanColor: "CORAL",
      factions: ["ORIGINAL", "UNDEAD"],
      mapType: "DRY_LAND",
      mapGenerationRevision: "REGIONAL_BIOMES_NAVAL_V4",
      curiosities: true,
    });
    if (!created.ok) throw new Error(created.error.code);
    let state = created.state;
    const undead = state.players.find((player) => player.faction === "UNDEAD");
    if (undead === undefined) throw new Error("no Undead seat");
    const bought: string[] = [];
    // The Undead pass (`pulp_wars-w49.13`, 7r51): eighteen rounds (sixteen
    // before). With a quarter Zombies and the Banshees and Skeletons that
    // go with them the seat trains in rounds 15 and 16 and builds its
    // first Mine in round 17 and a Workshop in round 18.
    while (state.outcome === null && state.round <= 18) {
      const actor = state.turnOrder[state.activeSeatIndex];
      if (actor === undefined) throw new Error("no actor");
      for (let accepted = 0; accepted < 128; accepted += 1) {
        const view = viewForV7(state, actor);
        const command = chooseNormalTurnCommandV7(
          view,
          accepted,
          128,
          chooseNormalCommandV7(view),
        );
        if (command === null) throw new Error("no command");
        if (actor === undead.id)
          bought.push(
            command.kind === "RESEARCH"
              ? `RESEARCH ${command.tech}`
              : command.kind,
          );
        const result = applyCommandV7(state, actor, command);
        if (!result.accepted) throw new Error(result.error.code);
        state = result.state;
        if (command.kind === "END_TURN" || state.outcome !== null) break;
      }
    }
    // A growth technology and a building of it. Tuning 8, correction
    // pass (`pulp_wars-w49.11`): the Banshee's technology came before it
    // (the first two units of the order, then the one growth technology:
    // Engineering, with a Mine in round 17).
    // The Undead pass, correction (`pulp_wars-w49.13`): economy first. The
    // growth its land can use comes right after the Zombie, before the
    // Banshee: Forestry by way of Hunting (the land is Forest), a Lumber
    // Camp on it, then Marksmanship, and Sawmilling (the Lich) by round 18.
    // The economy rejig (`pulp_wars-w49.16`, 7r54): research is priced by
    // the cities owned (1 / 2 / 3 Coins a city), so this seat, which
    // takes its villages first, has Marksmanship inside the window and
    // Sawmilling (tier 3) and Administration after it.
    expect(bought.filter((kind) => kind.startsWith("RESEARCH"))).toEqual([
      "RESEARCH GATHERING",
      // Step two of the Undead pass (`pulp_wars-w49.24`): one growth
      // technology before the Zombie's two while no enemy is in sight
      // (Hunting, in round 3, for the Game in its land), and units before
      // research while the seat is short of them.
      "RESEARCH HUNTING",
      "RESEARCH DRILL",
      // The Industry reshuffle (`pulp_wars-w49.21`, 7r56): the Zombie is
      // at Fortification, bought right after the root.
      "RESEARCH FORTIFICATION",
      "RESEARCH FORESTRY",
      "RESEARCH MARKSMANSHIP",
    ]);
    expect(bought.indexOf("BUILD_LUMBER_CAMP")).toBeGreaterThan(
      bought.indexOf("RESEARCH FORESTRY"),
    );
    expect(bought.indexOf("BUILD_LUMBER_CAMP")).toBeLessThan(
      bought.indexOf("RESEARCH MARKSMANSHIP"),
    );
  }, 120_000);
});

describe("3. siege and ranged units", () => {
  it("fires with the Catapult that has a shot and moves the one that has none to a firing tile, in the same turn", () => {
    const state = bare(
      field([
        { seat: 0, role: "CATAPULT", at: at(6, 4) },
        { seat: 0, role: "CATAPULT", at: at(7, 6) },
        { seat: 0, role: "SWORDSMAN", at: at(5, 3) },
        { seat: 0, role: "SWORDSMAN", at: at(5, 4) },
        { seat: 0, role: "SWORDSMAN", at: at(5, 5) },
        { seat: 0, role: "FIGHTER", at: at(8, 8) },
        { seat: 1, role: "GUARD", at: at(3, 4) },
        { seat: 1, role: "GUARD", at: at(3, 5) },
        { seat: 1, role: "GUARD", at: at(3, 3) },
        { seat: 1, role: "FIGHTER", at: at(2, 8) },
      ]),
    );
    const firing = unitAtV7(state, at(6, 4)).id;
    const moving = unitAtV7(state, at(7, 6)).id;
    const turn = policyTurn(state);
    // The shot comes before every melee attack.
    expect(attacksOf(turn.commands)[0]?.unitId).toBe(firing);
    expect(movesOf(turn.commands).some((move) => move.unitId === firing)).toBe(
      false,
    );
    // The other one ends in range of a Guard (3 tiles), not on a center.
    const to = whereIs(turn.state, moving);
    expect(to).not.toEqual(at(7, 6));
    const guards = turn.state.units.filter(
      (unit) => unit.ownerId !== seatIdV7(state, 0) && unit.role === "GUARD",
    );
    expect(guards.length).toBeGreaterThan(0);
    expect(Math.min(...guards.map((unit) => distance(unit.at, to)))).toBe(3);
    // Next turn both fire.
    const next = policyTurn(nextRound(turn.state));
    const shooters = new Set(attacksOf(next.commands).map((a) => a.unitId));
    expect(shooters.has(firing) && shooters.has(moving)).toBe(true);
  });

  it("takes the firing tile no enemy melee unit reaches, not the ones the enemy's Raider can charge", () => {
    // Three tiles are three from the Guard: (6, 4), (6, 5), (6, 6). The
    // enemy Raider at (3, 8) (Move 2) reaches (6, 5) and (6, 6).
    const state = bare(
      field([
        { seat: 0, role: "CATAPULT", at: at(7, 5) },
        { seat: 0, role: "SWORDSMAN", at: at(7, 3) },
        { seat: 0, role: "SWORDSMAN", at: at(7, 7) },
        { seat: 0, role: "SWORDSMAN", at: at(8, 4) },
        { seat: 0, role: "SWORDSMAN", at: at(8, 6) },
        { seat: 0, role: "FIGHTER", at: at(8, 8) },
        { seat: 1, role: "GUARD", at: at(3, 5) },
        { seat: 1, role: "RAIDER", at: at(3, 8) },
        { seat: 1, role: "FIGHTER", at: at(2, 8) },
      ]),
    );
    const catapult = unitAtV7(state, at(7, 5)).id;
    const turn = policyTurn(state);
    expect(whereIs(turn.state, catapult)).toEqual(at(6, 4));
  });

  it("trains a body, not a Catapult, in a city with an enemy melee unit three tiles from its center", () => {
    const city = (enemy: CoordV7): GameStateV7 =>
      homeless(
        bare(
          field(
            [
              { seat: 0, role: "FIGHTER", at: at(9, 9) },
              { seat: 0, role: "FIGHTER", at: at(9, 8) },
              { seat: 0, role: "MARKSMAN", at: at(9, 7) },
              { seat: 1, role: "SWORDSMAN", at: enemy },
              { seat: 1, role: "FIGHTER", at: at(2, 8) },
            ],
            { coins: 20 },
          ),
        ),
      );
    const trained = (state: GameStateV7): string | undefined =>
      policyTurn(state).commands.flatMap((command) =>
        command.kind === "TRAIN" ? [command.role] : [],
      )[0];
    // Far away the army's missing siege unit is bought (the dear units).
    expect(trained(city(at(2, 2)))).toBe("CATAPULT");
    expect(trained(city(at(5, 8)))).not.toBe("CATAPULT");
  });
});

describe("5. wartime spending", () => {
  /**
   * Three cities, one technology (so the next one is due), 12 Coins, and
   * an enemy pair five tiles from every center but three from two own
   * Swordsmen in the field.
   */
  const front = (techs: readonly TechnologyIdV7[]): GameStateV7 => {
    const base = field(
      [
        { seat: 0, role: "FIGHTER", at: at(5, 5), captureEligible: true },
        { seat: 0, role: "FIGHTER", at: at(8, 5), captureEligible: true },
        { seat: 0, role: "FIGHTER", at: at(9, 9) },
        { seat: 0, role: "SWORDSMAN", at: at(3, 1) },
        { seat: 0, role: "SWORDSMAN", at: at(3, 2) },
        { seat: 1, role: "SWORDSMAN", at: at(0, 1) },
        { seat: 1, role: "SWORDSMAN", at: at(0, 2) },
        { seat: 1, role: "FIGHTER", at: at(0, 10) },
      ],
      { techs: { 0: techs }, coins: 12 },
    );
    const own = seatIdV7(base, 0);
    let state = base;
    for (const where of [at(5, 5), at(8, 5)])
      state = applyOkV7(state, own, {
        kind: "CAPTURE",
        unitId: unitAtV7(state, where).id,
      }).state;
    // The field army has no home: the cities have room. (A round later:
    // a unit that captured this turn cannot step off its center.)
    return nextRound(homeless(state, "SWORDSMAN"));
  };

  it("with an enemy army near its own army every city trains before anything is researched or built", () => {
    const state = front(["GATHERING"]);
    const army = armyOf(state);
    // No enemy within four tiles of a center: round 6 was "unthreatened"
    // here and bought its due technology first.
    expect(army.threatDistance).toBeGreaterThan(4);
    expect(army.research).toMatchObject({ tech: "HUNTING", due: true });
    expect(army.pressed).toBe(true);
    const decision = chooseNormalCommandV7(
      viewForV7(state, seatIdV7(state, 0)),
    );
    expect(
      decision.candidates.some(({ command }) => command.kind === "RESEARCH"),
    ).toBe(false);
    const kinds = kindsOf(policyTurn(state).commands);
    const trains = kinds.filter((kind) => kind === "TRAIN").length;
    expect(trains).toBe(3);
    // Research comes only when no city can train any more.
    expect(kinds).toContain("RESEARCH");
    expect(kinds.indexOf("RESEARCH")).toBeGreaterThan(
      kinds.lastIndexOf("TRAIN"),
    );
  });

  it("but the one step to a unit class the army has none of is researched at once", () => {
    // Hunting is owned: Marksmanship is one step from the Marksman, and
    // the army has no ranged unit.
    const state = front(["GATHERING", "HUNTING"]);
    expect(armyOf(state).research).toMatchObject({
      tech: "MARKSMANSHIP",
      unlocks: "MARKSMAN",
    });
    const decision = chooseNormalCommandV7(
      viewForV7(state, seatIdV7(state, 0)),
    );
    expect(
      decision.candidates
        .filter(({ command }) => command.kind === "RESEARCH")
        .map(({ command }) =>
          command.kind === "RESEARCH" ? command.tech : "",
        ),
    ).toEqual(["MARKSMANSHIP"]);
  });
});

describe("6. abilities", () => {
  // `pulp_wars-w49.35`: Berserk (+1 Move, no zone-of-control stops)
  // replaced WAAAGH! (+1 Attack); the Normal AI calls it where it called
  // WAAAGH! (no AI tuning in that bead), so the order is unchanged and the
  // attackers are Berserk instead of Inspired.
  it("Goblins: the Warboss steps up and calls Berserk before the attacks it strengthens", () => {
    const state = bare(
      field(
        [
          { seat: 0, role: "CAPTAIN", at: at(8, 4) },
          { seat: 0, role: "FIGHTER", at: at(5, 3) },
          { seat: 0, role: "FIGHTER", at: at(5, 4) },
          { seat: 0, role: "FIGHTER", at: at(5, 5) },
          { seat: 0, role: "MARKSMAN", at: at(6, 4) },
          { seat: 0, role: "FIGHTER", at: at(8, 8) },
          { seat: 1, role: "FIGHTER", at: at(3, 3) },
          { seat: 1, role: "FIGHTER", at: at(3, 5) },
          { seat: 1, role: "FIGHTER", at: at(2, 8) },
        ],
        { factions: GOBLINS, techs: {} },
      ),
    );
    const warboss = unitAtV7(state, at(8, 4)).id;
    const turn = policyTurn(state);
    const kinds = kindsOf(turn.commands);
    // It was three tiles behind: its first command is the Move into the
    // radius (2) of the units that will attack, its second the Berserk.
    expect(turn.commands[0]).toMatchObject({ kind: "MOVE", unitId: warboss });
    expect(turn.commands[1]).toEqual({ kind: "RALLY", unitId: warboss });
    const attacks = attacksOf(turn.commands);
    expect(attacks.length).toBeGreaterThanOrEqual(2);
    expect(kinds.indexOf("RALLY")).toBeLessThan(kinds.indexOf("ATTACK"));
    // Every attacker of the turn was Berserk when it struck.
    for (const [index, command] of turn.commands.entries())
      if (command.kind === "ATTACK")
        expect(turn.before[index]?.berserkThisTurn).toContain(command.unitId);
  });

  it("Goblins: a Goblin walks into three units standing together and blows itself up, without a kill", () => {
    const state = bare(
      field(
        [
          { seat: 0, role: "FIGHTER", at: at(5, 4) },
          { seat: 0, role: "FIGHTER", at: at(8, 8) },
          { seat: 1, role: "SWORDSMAN", at: at(3, 3) },
          { seat: 1, role: "SWORDSMAN", at: at(3, 4) },
          { seat: 1, role: "SWORDSMAN", at: at(3, 5) },
          { seat: 1, role: "FIGHTER", at: at(2, 8) },
        ],
        { factions: GOBLINS, techs: {} },
      ),
    );
    const goblin = unitAtV7(state, at(5, 4)).id;
    const turn = policyTurn(state);
    const mine = turn.commands.filter(
      (command) => "unitId" in command && command.unitId === goblin,
    );
    expect(mine.map((command) => command.kind)).toEqual(["MOVE", "KABOOM"]);
    expect(mine[0]).toMatchObject({ path: [at(4, 4)] });
    // Three Swordsmen lost HP; none died (round 6 asked for a kill or two
    // enemies in the blast and never walked to them).
    const hurt = turn.state.units.filter(
      (unit) => unit.role === "SWORDSMAN" && unit.hp < unit.maxHp,
    );
    expect(hurt).toHaveLength(3);
    // One enemy beside it is still no reason.
    const lone = bare(
      field(
        [
          { seat: 0, role: "FIGHTER", at: at(5, 4) },
          { seat: 0, role: "FIGHTER", at: at(8, 8) },
          { seat: 1, role: "SWORDSMAN", at: at(3, 4) },
          { seat: 1, role: "FIGHTER", at: at(2, 8) },
        ],
        { factions: GOBLINS, techs: {} },
      ),
    );
    expect(kindsOf(policyTurn(lone).commands)).not.toContain("KABOOM");
  });

  it("Undead: a committed Banshee moves into range behind the Skeletons and Wails before they strike", () => {
    const state = bare(
      field(
        [
          { seat: 0, role: "MARKSMAN", at: at(6, 3) },
          { seat: 0, role: "MARKSMAN", at: at(6, 4) },
          { seat: 0, role: "FIGHTER", at: at(5, 4) },
          { seat: 0, role: "FIGHTER", at: at(5, 5) },
          { seat: 0, role: "FIGHTER", at: at(5, 6) },
          { seat: 0, role: "FIGHTER", at: at(5, 7) },
          { seat: 0, role: "FIGHTER", at: at(8, 8) },
          { seat: 1, role: "CATAPULT", at: at(2, 4) },
          { seat: 1, role: "SWORDSMAN", at: at(3, 5) },
          { seat: 1, role: "FIGHTER", at: at(2, 8) },
        ],
        { factions: UNDEAD, techs: {} },
      ),
    );
    const banshees = [at(6, 3), at(6, 4)].map(
      (where) => unitAtV7(state, where).id,
    );
    const turn = policyTurn(state);
    const kinds = kindsOf(turn.commands);
    // A Banshee steps to where the Swordsman is two tiles away (inside
    // the reach of the Swordsman and of the Catapult) and Wails before the
    // first melee attack.
    const wails = turn.commands.flatMap((command) =>
      command.kind === "WAIL" ? [command.unitId] : [],
    );
    expect(wails.length).toBeGreaterThanOrEqual(1);
    for (const id of wails) expect(banshees).toContain(id);
    expect(kinds.lastIndexOf("WAIL")).toBeLessThan(kinds.indexOf("ATTACK"));
    expect(attacksOf(turn.commands).length).toBeGreaterThanOrEqual(2);
  });

  it("Undead: a Lich fires at the units that stand together (its splash and its Plague), not at the one alone", () => {
    const state = bare(
      field(
        [
          { seat: 0, role: "CATAPULT", at: at(6, 4) },
          { seat: 0, role: "FIGHTER", at: at(5, 4) },
          { seat: 0, role: "FIGHTER", at: at(8, 8) },
          { seat: 1, role: "SWORDSMAN", at: at(3, 2) },
          { seat: 1, role: "SWORDSMAN", at: at(3, 5) },
          { seat: 1, role: "SWORDSMAN", at: at(3, 6) },
          { seat: 1, role: "SWORDSMAN", at: at(4, 6) },
          { seat: 1, role: "FIGHTER", at: at(2, 8) },
        ],
        { factions: UNDEAD, techs: {} },
      ),
    );
    const lich = unitAtV7(state, at(6, 4)).id;
    const turn = policyTurn(state);
    const shot = attacksOf(turn.commands).find(
      (attack) => attack.unitId === lich,
    );
    // Both (3, 2) and (3, 5) are in its range; (3, 5) has two neighbours.
    expect(shot?.targetUnitId).toBe(unitAtV7(state, at(3, 5)).id);
    const plagued = turn.state.plagued.map((entry) => entry.unitId);
    expect(plagued).toHaveLength(3);
  });

  it("Undead: the Necromancer's Frenzy goes before the attacks of the units beside it, and it raises a Grave it stands next to", () => {
    const pieces: GoblinPieceV7[] = [
      { seat: 0, role: "CAPTAIN", at: at(6, 4) },
      { seat: 0, role: "FIGHTER", at: at(5, 3) },
      { seat: 0, role: "FIGHTER", at: at(5, 5) },
      { seat: 0, role: "FIGHTER", at: at(8, 8) },
      { seat: 1, role: "FIGHTER", at: at(3, 3) },
      { seat: 1, role: "FIGHTER", at: at(3, 5) },
      { seat: 1, role: "FIGHTER", at: at(2, 8) },
    ];
    const state = bare(field(pieces, { factions: UNDEAD, techs: {} }));
    const turn = policyTurn(state);
    expect(turn.commands[0]).toEqual({
      kind: "RALLY",
      unitId: unitAtV7(state, at(6, 4)).id,
    });
    expect(attacksOf(turn.commands)).toHaveLength(2);
    // A Grave behind the line, out of every enemy's reach: Raise Dead.
    const grave = checkedV7({
      ...bare(
        field(
          [
            { seat: 0, role: "CAPTAIN", at: at(8, 4) },
            { seat: 0, role: "FIGHTER", at: at(8, 8) },
            { seat: 1, role: "FIGHTER", at: at(2, 8) },
          ],
          { factions: UNDEAD, techs: {} },
        ),
      ),
      graves: [at(8, 3)],
    });
    const raised = policyTurn(grave);
    expect(kindsOf(raised.commands)).toContain("RAISE_DEAD");
    expect(
      raised.state.units.some(
        (unit) => unit.at.x === 8 && unit.at.y === 3 && unit.role === "FIGHTER",
      ),
    ).toBe(true);
  });
});

describe("7. the strategic choice", () => {
  /**
   * Three seats (14 x 14): the viewer's capital (2, 2), seat 1's capital
   * (11, 11) and seat 2's (11, 2), each with a garrison. Five Fighters
   * stand at home; `strong` is the seat that also holds the village
   * (11, 5).
   */
  const three = (strong: 1 | 2): GameStateV7 => {
    const start = field(
      [
        { seat: 0, role: "FIGHTER", at: at(3, 2) },
        { seat: 0, role: "FIGHTER", at: at(3, 3) },
        { seat: 0, role: "FIGHTER", at: at(2, 3) },
        { seat: 0, role: "FIGHTER", at: at(1, 3) },
        { seat: 0, role: "FIGHTER", at: at(2, 2) },
        { seat: 1, role: "FIGHTER", at: at(11, 2) },
        { seat: 2, role: "FIGHTER", at: at(11, 11) },
        { seat: strong, role: "FIGHTER", at: at(11, 5), captureEligible: true },
      ],
      {
        factions: ["ORIGINAL", "UNDEAD", "GOBLIN"],
        techs: {},
        activeSeat: strong,
      },
    );
    const captured = applyOkV7(start, seatIdV7(start, strong), {
      kind: "CAPTURE",
      unitId: unitAtV7(start, at(11, 5)).id,
    }).state;
    return bare(endTurnUntilV7(captured, seatIdV7(captured, 0)).state);
  };
  const targetsOf = (state: GameStateV7): readonly string[] =>
    inspectNormalTacticalFactsV7(viewForV7(state, seatIdV7(state, 0)))
      .campaign.assignments.filter((item) => item.job === "ATTACK")
      .map((item) => `${item.at.x},${item.at.y}`);

  it("marches the whole free army on one city, and a holder of that city makes it no cheaper", () => {
    // Round 6 sent every unit to its nearest city and a pair to every
    // other seat: four units on three fronts never had the numbers. All
    // three known cities are nine tiles away here; the army takes one.
    for (const strong of [1, 2] as const) {
      const targets = targetsOf(three(strong));
      expect(new Set(targets).size).toBe(1);
      expect(targets.length).toBeGreaterThanOrEqual(4);
    }
  });

  /**
   * The correction of the root review: opportunity and reach, not
   * weakness. Seat 1 is the strong neighbor: three cities (its capital at
   * (11, 11) and the villages (5, 8) and (11, 5)) and six Swordsmen at
   * home. Its border city (5, 8) is six tiles from the viewer's capital and
   * held by one Skeleton. Seat 2 is weak and far: one city (11, 2), nine
   * tiles away, one Goblin. The viewer has `count` Fighters at home.
   */
  const neighbours = (count: number): GameStateV7 => {
    // Around the capital (2, 2), the nearest tiles first.
    const own: GoblinPieceV7[] = [];
    for (let ring = 0; ring <= 3; ring += 1)
      for (let y = 0; y <= 5; y += 1)
        for (let x = 0; x <= 5; x += 1)
          if (own.length < count && distance(at(x, y), at(2, 2)) === ring)
            own.push({ seat: 0, role: "FIGHTER", at: at(x, y) });
    const start = field(
      [
        ...own,
        { seat: 2, role: "FIGHTER", at: at(11, 2) },
        { seat: 1, role: "FIGHTER", at: at(11, 11) },
        ...[10, 12].flatMap((x): GoblinPieceV7[] =>
          [10, 11, 12].map((y) => ({
            seat: 1,
            role: "SWORDSMAN",
            at: at(x, y),
          })),
        ),
        { seat: 1, role: "FIGHTER", at: at(5, 8), captureEligible: true },
        { seat: 1, role: "FIGHTER", at: at(11, 5), captureEligible: true },
      ],
      {
        factions: ["ORIGINAL", "UNDEAD", "GOBLIN"],
        techs: {},
        activeSeat: 1,
      },
    );
    let state = start;
    for (const where of [at(5, 8), at(11, 5)])
      state = applyOkV7(state, seatIdV7(state, 1), {
        kind: "CAPTURE",
        unitId: unitAtV7(state, where).id,
      }).state;
    return bare(endTurnUntilV7(state, seatIdV7(state, 0)).state);
  };

  it("attacks the lightly held border city of the strong neighbor next door, not the weak seat far away", () => {
    const state = neighbours(8);
    const levels = (seat: number): number =>
      state.cities
        .filter((city) => city.ownerId === seatIdV7(state, seat))
        .reduce((sum, city) => sum + city.level, 0);
    // The strong seat has more cities, more city levels, and the army.
    expect(levels(1)).toBeGreaterThan(levels(2));
    const targets = targetsOf(state);
    expect(new Set(targets)).toEqual(new Set(["5,8"]));
    expect(targets).toHaveLength(8);
    // And it walks there: after two turns its nearest unit is closer.
    const before = Math.min(
      ...state.units
        .filter((unit) => unit.ownerId === seatIdV7(state, 0))
        .map((unit) => distance(unit.at, at(5, 8))),
    );
    const after = policyTurn(nextRound(policyTurn(state).state)).state;
    expect(
      Math.min(
        ...after.units
          .filter((unit) => unit.ownerId === seatIdV7(after, 0))
          .map((unit) => distance(unit.at, at(5, 8))),
      ),
    ).toBeLessThan(before);
  });

  it("opens a second front with a surplus army, on the other neighbor", () => {
    expect(CAMPAIGN_FRONT_MAIN_UNITS_V7).toBe(10);
    expect(CAMPAIGN_FRONT_MIN_UNITS_V7).toBe(6);
    // Fourteen units: one front (the main front keeps ten, a second needs
    // six).
    expect(new Set(targetsOf(neighbours(14)))).toEqual(new Set(["5,8"]));
    // Twenty: fourteen stay on the border city and six march on the weak
    // seat's capital instead of standing behind the others.
    const state = neighbours(20);
    const targets = targetsOf(state);
    const count = (key: string): number =>
      targets.filter((item) => item === key).length;
    expect(new Set(targets)).toEqual(new Set(["5,8", "11,2"]));
    expect(count("5,8")).toBe(14);
    expect(count("11,2")).toBe(6);
    // A third front takes thirty-two.
    expect(new Set(targetsOf(neighbours(26))).size).toBe(2);
  });

  it("keeps the units of a holding force where an enemy stands at the gates of an own center", () => {
    // The units stand north of the capital, and (11, 2) is the city in
    // their reach by a clear step: it is the front. With a unit of that
    // seat three tiles from the capital, the units around the capital are
    // a holding force: none of them walks off to the front.
    const north = [at(3, 1), at(4, 1), at(4, 2), at(3, 2)];
    const start = three(2);
    const own = seatIdV7(start, 0);
    let moved = 0;
    const base = checkedV7({
      ...start,
      units: start.units.map((unit) =>
        unit.ownerId === own && !(unit.at.x === 2 && unit.at.y === 2)
          ? { ...unit, at: north[moved++] ?? unit.at }
          : unit,
      ),
    });
    expect(new Set(targetsOf(base))).toEqual(new Set(["11,2"]));
    const state = checkedV7({
      ...base,
      units: base.units.map((unit) =>
        unit.at.x === 11 && unit.at.y === 2 ? { ...unit, at: at(5, 5) } : unit,
      ),
    });
    expect(armyOf(state).threatDistance).toBe(3);
    expect(targetsOf(state)).not.toContain("11,11");
    const turn = policyTurn(state);
    for (const unit of turn.state.units)
      if (unit.ownerId === seatIdV7(state, 0))
        expect(distance(unit.at, at(2, 2))).toBeLessThanOrEqual(3);
  });

  it("sends its fast unit alone at an enemy city no unit defends, and takes it", () => {
    // The enemy's three Swordsmen stand four tiles from their capital;
    // nothing is on or next to its center.
    const state = bare(
      field(
        [
          { seat: 0, role: "RAIDER", at: at(6, 6) },
          { seat: 0, role: "SWORDSMAN", at: at(7, 3) },
          { seat: 0, role: "SWORDSMAN", at: at(7, 4) },
          { seat: 0, role: "FIGHTER", at: at(8, 8) },
          { seat: 1, role: "SWORDSMAN", at: at(3, 2) },
          { seat: 1, role: "SWORDSMAN", at: at(3, 3) },
          { seat: 1, role: "SWORDSMAN", at: at(3, 4) },
        ],
        { techs: {} },
      ),
    );
    const raider = unitAtV7(state, at(6, 6)).id;
    const jobs = inspectNormalTacticalFactsV7(
      viewForV7(state, seatIdV7(state, 0)),
    ).campaign.assignments;
    expect(jobs.find((item) => item.unitId === raider)).toMatchObject({
      job: "ATTACK",
      at: at(2, 8),
      raid: true,
    });
    expect(jobs.filter((item) => item.raid === true)).toHaveLength(1);
    let current = state;
    for (let turn = 0; turn < 2; turn += 1)
      current = nextRound(policyTurn(current).state);
    expect(whereIs(current, raider)).toEqual(at(2, 8));
    expect(policyTurn(current).commands[0]).toEqual({
      kind: "CAPTURE",
      unitId: raider,
    });
    // A defended city is no raid: the Raider stays with the army.
    const defended = checkedV7({
      ...state,
      units: state.units.map((unit) =>
        unit.at.x === 3 && unit.at.y === 4 ? { ...unit, at: at(2, 8) } : unit,
      ),
    });
    expect(
      inspectNormalTacticalFactsV7(
        viewForV7(defended, seatIdV7(defended, 0)),
      ).campaign.assignments.some((item) => item.raid === true),
    ).toBe(false);
  });

  it("expands with its fastest capturer and takes the village away from the enemy first", () => {
    // Villages at (5, 5), (8, 5), and (5, 8). An enemy Marksman stands two
    // tiles from (5, 5). The Zombie is nearer to (8, 5) than the Ghoul.
    const state = field(
      [
        { seat: 0, role: "GUARD", at: at(7, 6) },
        { seat: 0, role: "RAIDER", at: at(9, 7) },
        { seat: 0, role: "FIGHTER", at: at(8, 8) },
        { seat: 1, role: "FIGHTER", at: at(2, 8) },
        { seat: 1, role: "MARKSMAN", at: at(4, 3) },
      ],
      { factions: UNDEAD, techs: {} },
    );
    const jobs = inspectNormalTacticalFactsV7(
      viewForV7(state, seatIdV7(state, 0)),
    ).campaign.assignments;
    const jobOf = (where: CoordV7) =>
      jobs.find((item) => item.unitId === unitAtV7(state, where).id);
    // The Ghoul (Move 2) gets the safe village; round 6 gave it to the
    // nearest capturer, the Zombie.
    expect(jobOf(at(9, 7))).toMatchObject({ job: "VILLAGE", at: at(8, 5) });
    expect(jobOf(at(7, 6))?.at).not.toEqual(at(8, 5));
    const turn = policyTurn(state);
    expect(whereIs(turn.state, unitAtV7(state, at(9, 7)).id)).toEqual(at(8, 5));
    // The Zombie does not step onto the village under the Marksman.
    expect(whereIs(turn.state, unitAtV7(state, at(7, 6)).id)).not.toEqual(
      at(5, 5),
    );
  });
});

describe("the defects of the round-6 hand play", () => {
  it("the staged Field Defenses of the breakthrough labs fortify the Guards on them", () => {
    // (Revision 3 since the ninth unit, 7r55: the player owns Metallurgy;
    // revision 4 since the Industry reshuffle, 7r56: the attackers own
    // Fortification, where their defenders are.)
    expect(LAB_BREAKTHROUGH_V7.revision).toBe(4);
    expect(LAB_BREAKTHROUGH_CAPITAL_V7).toEqual(at(4, 7));
    for (const id of [
      "LAB_BREAKTHROUGH",
      "LAB_BREAKTHROUGH_GOBLIN",
      "LAB_BREAKTHROUGH_UNDEAD",
    ]) {
      expect(MISSION_REGISTRY_V7.find((item) => item.id === id)?.revision).toBe(
        4,
      );
      const state = breakthroughLabV7(id);
      const player = state.humanPlayerId;
      const capital = state.cities.find(
        (city) =>
          city.at.x === LAB_BREAKTHROUGH_CAPITAL_V7.x &&
          city.at.y === LAB_BREAKTHROUGH_CAPITAL_V7.y,
      );
      expect(capital?.landGrantUsed, id).toBe(true);
      const attacker = state.players.find((item) => item.id !== player);
      if (attacker === undefined) throw new Error(id);
      for (const where of [at(6, 6), at(6, 9)]) {
        const tile = state.board.tiles[where.y * state.board.width + where.x];
        // In revision 1 the tile was neutral, and a Field Defense counts
        // only in its unit's own territory.
        expect(tile?.fieldDefense, id).toBe(true);
        expect(tile?.territoryCityId, id).toBe(capital?.id);
        // An attacker next to it: the preview shows the two levels.
        const guard = unitAtV7(state, where);
        const striker = state.units.find(
          (unit) => unit.ownerId === attacker.id && unit.role === "FIGHTER",
        );
        if (striker === undefined) throw new Error(id);
        const staged = checkedV7({
          ...state,
          activeSeatIndex: state.turnOrder.indexOf(attacker.id),
          units: state.units.map((unit) =>
            unit.id === striker.id
              ? { ...unit, at: at(where.x + 1, where.y) }
              : unit,
          ),
        });
        const preview = queryCombatPreviewV7(
          viewForV7(staged, attacker.id),
          striker.id,
          guard.id,
        );
        expect(preview?.fortificationLevel, `${id} ${where.y}`).toBe(2);
      }
    }
  });

  /** Seat 1 disbands its Swordsman at (5, 4) on its own turn. */
  const disband = (hidden: boolean) => {
    const base = bare(
      fieldV7(
        [
          { seat: 0, role: "FIGHTER", at: at(8, 8) },
          { seat: 1, role: "SWORDSMAN", at: at(5, 4) },
          { seat: 1, role: "FIGHTER", at: at(2, 8) },
        ],
        { factions: HUMANS, activeSeat: 1 },
      ),
    );
    const state = hidden
      ? checkedV7({
          ...base,
          players: base.players.map((player) =>
            player.seat === 0
              ? {
                  ...player,
                  explored: player.explored.filter(
                    (where) => !(where.x === 5 && where.y === 4),
                  ),
                }
              : player,
          ),
        })
      : base;
    const unit = unitAtV7(state, at(5, 4));
    const owner = seatIdV7(state, 1);
    const result = applyOkV7(state, owner, {
      kind: "DISBAND",
      unitId: unit.id,
    });
    return { state, unit, owner, observer: seatIdV7(state, 0), result };
  };

  it("a unit disbanded in sight is an event for the observer, and the browser fades it out", () => {
    const { state, unit, owner, observer, result } = disband(false);
    const seen = projectEventsV7(state, result.state, observer, result.events);
    expect(seen.events).toEqual([
      {
        kind: "UNIT_DISBANDED",
        playerId: owner,
        unitId: unit.id,
        role: "SWORDSMAN",
        // Half the public price of the role: nothing private (the
        // Champion costs 6 Coins since 7r55).
        coinDelta: 3,
      },
    ]);
    expect(corePresentationPlanV7(viewForV7(state, observer), seen)).toEqual([
      {
        kind: "DISBAND",
        unitId: unit.id,
        at: at(5, 4),
        durationMs: 320,
        followCamera: true,
      },
    ]);
    // The owner's own cue has no camera move.
    expect(
      corePresentationPlanV7(
        viewForV7(state, owner),
        projectEventsV7(state, result.state, owner, result.events),
      ),
    ).toEqual([
      { kind: "DISBAND", unitId: unit.id, at: at(5, 4), durationMs: 320 },
    ]);
  });

  it("a unit disbanded on a tile the observer has not explored is no event for it", () => {
    const { state, observer, result } = disband(true);
    expect(
      projectEventsV7(state, result.state, observer, result.events).events,
    ).toEqual([]);
  });
});

/**
 * The round the capital falls to each attacker (the `RETREAT` script).
 * Tuning 8 (`pulp_wars-w49.11`): 5, 5, and 7 (round 7: 7, 5, and 7); the
 * Human attacker's Raider now stays on the center it rides onto. The
 * Goblin pass (`pulp_wars-w49.12`, 7r50): the Goblin attacker in round 7 (5
 * before): its Bomb Chuckers no longer kill a retreating unit in one throw
 * with two helpers beside it. The Undead pass (`pulp_wars-w49.13`, 7r51):
 * the Undead attacker in round 8 (7 before): its Vampires strike and fly
 * back (Escape), so it loses 8 units where it lost more and takes a
 * round longer. Its correction: round 7 again (its Liches do not plague
 * without Pestilence and its Ghouls have Carrion). Step two of the Goblin
 * pass (`pulp_wars-w49.23`): the Goblin attacker in round 6 (7 before): its
 * combined kills count Gang Up and its helpers come up before the blow.
 */
const RETREAT_ROUNDS = [5, 6, 7] as const;

describe("the bounded lab runs", () => {
  // The `RETREAT` script of tests/fixtures/v7-breakthrough-lab.ts: the
  // defender gives ground one tile a turn and shoots. Measured on revision
  // 2 of the lab (docs/product/RULESET_7_TUNING_HUMAN.md section 14.2):
  // the round-6 policy took the capital in rounds 4 and 6, the Goblin
  // attacker having no turn without an attack against this script, and in
  // round 9 as the Undead; the hand player's stall is the constructed
  // position above, not this script.
  it.each([
    ["LAB_BREAKTHROUGH", RETREAT_ROUNDS[0]],
    ["LAB_BREAKTHROUGH_GOBLIN", RETREAT_ROUNDS[1]],
    ["LAB_BREAKTHROUGH_UNDEAD", RETREAT_ROUNDS[2]],
  ] as const)(
    "%s: against a defender that gives ground and shoots, the capital falls in round %i and no turn passes without an attack",
    (id, capital) => {
      const result = runBreakthroughLabV7(id, 14, "RETREAT");
      expect(result.capitalFellInRound, id).toBe(capital);
      expect(result.turnsWithoutAttack, id).toBe(0);
    },
    120_000,
  );
});
