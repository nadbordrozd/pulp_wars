import { describe, expect, it } from "vitest";
import {
  ARMY_COMMIT_ARRIVED_V7,
  ARMY_COMMIT_HELD_RATIO_V7,
  ARMY_COMMIT_RATIO_V7,
  ARMY_PLAY_FACTIONS_V7,
  ARMY_RESEARCH_ROLES_V7,
  armyAssaultModeV7,
  armyCountsV7,
  armyResearchDueV7,
  armyRoleScoreV7,
  armyUnitStrengthV7,
} from "../../src/ai/v7-army";
import {
  chooseNormalCommandV7,
  chooseNormalTurnCommandV7,
  inspectNormalArmyV7,
  scoreCommandV7,
} from "../../src/ai/v7";
import { OBSOLETE_SAVE_STORAGE_KEYS_V7 } from "../../src/persistence/browser-v7";
import { corePresentationPlanV7 } from "../../src/render/canvas/presentation-plan-v7";
import {
  PRIOR_RULESET_7_IDS,
  RULESET_7_ID,
  SAVE_STORAGE_KEY_V7,
  TECHNOLOGY_IDS_V7,
  TECHNOLOGY_RESEARCH_COST_V7,
  effectiveRoleRuleV7,
  factionTreeV7,
  parseGameStateV7,
  playerTechnologyResearchCostV7,
  projectEventsV7,
  queryCombatPreviewV7,
  queryPlayerCommandsV7,
  queryTechnologyTreeV7,
  technologyResearchCostV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type FactionIdV7,
  type GameStateV7,
  type TechnologyIdV7,
  type UnitId,
  type UnitRoleIdV7,
  unitId,
} from "../../src/engine/index";
import {
  LAB_BREAKTHROUGH_CAPITAL_V7,
  LAB_BREAKTHROUGH_LINE_V7,
} from "../../src/engine/v7/missions/lab-breakthrough";
import { breakthroughLabV7 } from "../fixtures/v7-breakthrough-lab";
import { checkedV7 } from "../fixtures/v7-builders";
import { rewardStateV7 } from "../fixtures/v7-dinosaur-arena";
import {
  applyOkV7,
  seatIdV7,
  unitAtV7,
  type GoblinPieceV7,
} from "../fixtures/v7-goblin-arena";
import {
  at,
  fieldDefenseV7,
  fieldV7,
  forestV7,
  patchTileV7,
  unexploreV7,
} from "../fixtures/v7-revision20";

/**
 * Tuning 6 (`pulp_wars-w49.6`, identity `pulp-wars-poc-7r73`;
 * docs/product/RULESET_7_TUNING_HUMAN.md section 13): the Normal AI breaks
 * a line with numbers, expands and grows, researches toward its army and
 * buys its dear units, and keeps its discipline; research costs 1 Coin more
 * per technology owned (2 before); an unseen attacker's damage reaches the
 * victim's owner; a reward unit leaves the garrison on its center.
 *
 * Two-seat field (tests/fixtures/v7-revision20.ts): seat 0 capital (8, 8)
 * with territory x 7-9, y 7-9; seat 1 capital (2, 8) with territory x 1-3,
 * y 7-9; villages (5, 5), (8, 5), (5, 8), which `bare` removes where a
 * test is about something else. Every tile is explored by both seats.
 */

const HUMANS = ["ORIGINAL", "ORIGINAL"] as const;
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
  } = {},
): GameStateV7 =>
  fieldV7(pieces, {
    factions: options.factions ?? HUMANS,
    techs: options.techs ?? { 0: BASIC },
    coins: options.coins ?? 0,
  });

/** The field without its villages (a captured one is a city and stays). */
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
}

/** Seat `seat` plays its turn with the Normal policy. */
function policyTurn(start: GameStateV7, seat = 0): PolicyTurnV7 {
  const actor = seatIdV7(start, seat);
  const commands: CommandV7[] = [];
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
    if (command.kind === "END_TURN") return { commands, state };
    state = applyOkV7(state, actor, command).state;
  }
  throw new Error("the turn did not end");
}

/** Both seats end their turns: seat 0 is to move again. */
function nextRound(state: GameStateV7): GameStateV7 {
  let next = applyOkV7(state, seatIdV7(state, 0), { kind: "END_TURN" }).state;
  next = applyOkV7(next, seatIdV7(next, 1), { kind: "END_TURN" }).state;
  return next;
}

const kindsOf = (commands: readonly CommandV7[]): readonly string[] =>
  commands.map((command) => command.kind);

const attacksOf = (
  commands: readonly CommandV7[],
): readonly Extract<CommandV7, { kind: "ATTACK" }>[] =>
  commands.flatMap((command) => (command.kind === "ATTACK" ? [command] : []));

const distance = (left: CoordV7, right: CoordV7): number =>
  Math.max(Math.abs(left.x - right.x), Math.abs(left.y - right.y));

const modesOf = (state: GameStateV7, seat = 0): readonly string[] =>
  inspectNormalArmyV7(viewForV7(state, seatIdV7(state, seat))).modes.map(
    (entry) => entry.mode,
  );

const move = (unitId: UnitId, to: CoordV7): CommandV7 => ({
  kind: "MOVE",
  unitId,
  path: [to],
});

describe("tuning 6 identity and the research price", () => {
  // The Goblin pass (tests/unit/ruleset-v7-goblin-pass.test.ts) took 7r50,
  // and the Undead pass 7r51, so 7r49 is the prior identity before the
  // last.
  it("was 7r49 after 7r48, with both save keys obsolete now", () => {
    expect(RULESET_7_ID).toBe("pulp-wars-poc-7r73");
    expect(PRIOR_RULESET_7_IDS.slice(-25, -23)).toEqual([
      "pulp-wars-poc-7r48",
      "pulp-wars-poc-7r49",
    ]);
    expect(SAVE_STORAGE_KEY_V7).toBe("pulpWars.save.v7r73.current");
    expect(OBSOLETE_SAVE_STORAGE_KEYS_V7.slice(-25, -23)).toEqual([
      "pulpWars.save.v7r48.current",
      "pulpWars.save.v7r49.current",
    ]);
  });

  // The economy rejig (`pulp_wars-w49.16`, 7r54) replaced tuning 6's
  // "plus 1 for each technology owned beyond the first" by 1 / 2 / 3 Coins
  // for each city owned beyond the first.
  it("costs the tier base plus 1 / 2 / 3 for each city owned beyond the first", () => {
    expect(TECHNOLOGY_RESEARCH_COST_V7).toEqual({
      1: { base: 5, step: 1 },
      2: { base: 7, step: 2 },
      3: { base: 9, step: 3 },
    });
    expect(
      [1, 2, 3, 6, 10].map((cities) =>
        ([1, 2, 3] as const).map((tier) =>
          technologyResearchCostV7(tier, cities),
        ),
      ),
    ).toEqual([
      [5, 7, 9],
      [6, 9, 12],
      [7, 11, 15],
      [10, 17, 24],
      [14, 25, 36],
    ]);
    // The opener is still free, and only a tier-1 technology.
    expect(playerTechnologyResearchCostV7(1, 0, 1)).toBe(0);
    expect(playerTechnologyResearchCostV7(2, 0, 1)).toBe(7);
  });

  it("is what the public technology tree and the engine charge", () => {
    const state = bare(
      field([{ seat: 1, role: "FIGHTER", at: at(2, 8) }], {
        techs: { 0: ["GATHERING", "HUNTING", "DRILL", "FORTIFICATION"] },
        coins: 40,
      }),
    );
    const view = viewForV7(state, seatIdV7(state, 0));
    const cost = (tech: TechnologyIdV7): number | undefined =>
      queryTechnologyTreeV7(view).nodes.find((node) => node.id === tech)?.cost;
    // One city: 5 / 7 / 9, whatever the three technologies owned.
    expect(cost("SCOUTING")).toBe(5);
    expect(cost("MARKSMANSHIP")).toBe(7);
    expect(cost("ENGINEERING")).toBe(7);
    const result = applyOkV7(state, seatIdV7(state, 0), {
      kind: "RESEARCH",
      tech: "MARKSMANSHIP",
    });
    expect(result.events).toContainEqual(
      expect.objectContaining({ kind: "TECH_RESEARCHED", cost: 7 }),
    );
    expect(
      result.state.players.find((player) => player.seat === 0)?.coins,
    ).toBe(33);
    // The fourth technology owned makes the next one no dearer.
    expect(
      queryTechnologyTreeV7(
        viewForV7(result.state, seatIdV7(state, 0)),
      ).nodes.find((node) => node.id === "ENGINEERING")?.cost,
    ).toBe(7);
  });

  it("puts every faction's siege and breakthrough technologies within reach", () => {
    // The chain the Normal AI follows from a Gathering opener: Hunting,
    // Marksmanship, Forestry, Sawmilling, Scouting, Raiding, Chivalry.
    const chain: readonly TechnologyIdV7[] = [
      "HUNTING",
      "MARKSMANSHIP",
      "FORESTRY",
      "SAWMILLING",
      "SCOUTING",
      "RAIDING",
      "CHIVALRY",
    ];
    const tree = factionTreeV7("ORIGINAL");
    const price = (step: number): number =>
      chain.reduce((total, tech, index) => {
        const tier = tree.nodes.find((node) => node.id === tech)?.tier ?? 1;
        return total + (5 + 2 * (tier - 1)) + step * index;
      }, 0);
    // 49 Coins for the seven technologies' bases, plus the step (the
    // per-technology step of tunings 4 to 8: 70 at 1 Coin, 91 at 2).
    expect(price(1)).toBe(70);
    expect(price(2)).toBe(91);
    // The economy rejig (7r54): with one city the chain costs its bases,
    // and with the AI's usual four cities a tier-3 technology costs 18.
    expect(price(0)).toBe(49);
    expect(technologyResearchCostV7(3, 4)).toBe(18);
  });
});

describe("the assault: when a position is attacked", () => {
  it("commits at one and a half times the strength, holds at equal strength once the battle is joined, and stages while the units are still coming", () => {
    expect([
      ARMY_COMMIT_RATIO_V7,
      ARMY_COMMIT_HELD_RATIO_V7,
      ARMY_COMMIT_ARRIVED_V7,
    ]).toEqual([150, 100, 60]);
    const mode = (
      hostile: number,
      near: number,
      coming: number,
      contact = false,
    ) => armyAssaultModeV7({ hostile, near, coming, contact });
    expect(mode(100, 150, 150)).toBe("COMMIT");
    expect(mode(100, 149, 149)).toBe("NONE");
    // The battle is joined: equal strength keeps it going.
    expect(mode(100, 100, 100, true)).toBe("COMMIT");
    expect(mode(100, 99, 99, true)).toBe("NONE");
    // Enough is coming, too little has arrived: wait.
    expect(mode(100, 60, 200)).toBe("STAGE");
    // Three fifths of what is coming has arrived and it matches the enemy.
    expect(mode(100, 120, 200)).toBe("COMMIT");
    expect(mode(100, 0, 200)).toBe("NONE");
    expect(mode(0, 50, 50)).toBe("NONE");
  });

  it("weighs a unit at 4 per Coin of price plus its HP", () => {
    const strength = (role: UnitRoleIdV7, faction: FactionIdV7 = "ORIGINAL") =>
      armyUnitStrengthV7(
        effectiveRoleRuleV7(role, faction),
        effectiveRoleRuleV7(role, faction).maxHp,
      );
    expect(
      (
        [
          "FIGHTER",
          "GUARD",
          "MARKSMAN",
          "SWORDSMAN",
          "CATAPULT",
          "KNIGHT",
        ] as const
      ).map((role) => strength(role)),
      // (The Champion costs 6 Coins since the ninth unit, 7r55: 39, was 35.)
    ).toEqual([20, 29, 28, 39, 42, 49]);
    expect(strength("FIGHTER", "GOBLIN")).toBe(10);
    // A wounded unit weighs less.
    expect(
      armyUnitStrengthV7(effectiveRoleRuleV7("GUARD", "ORIGINAL"), 5),
    ).toBe(17);
  });

  /**
   * A Guard on a Field Defense at (5, 2) with a Marksman behind it, far
   * from the villages; `count` Fighters two and three tiles east of it.
   */
  const guardLine = (count: number): GameStateV7 =>
    fieldDefenseV7(
      bare(
        field([
          ...[at(7, 1), at(7, 2), at(7, 3), at(8, 1), at(8, 2), at(8, 3)]
            .slice(0, count)
            .map((where) => ({ seat: 0, role: "FIGHTER" as const, at: where })),
          { seat: 0, role: "FIGHTER", at: at(8, 8) },
          { seat: 1, role: "GUARD", at: at(5, 2) },
          { seat: 1, role: "MARKSMAN", at: at(4, 2) },
          { seat: 1, role: "FIGHTER", at: at(2, 8) },
        ]),
      ),
      at(5, 2),
    );

  it("with three Fighters against a Guard and a Marksman it does not attack; with six it does, and kills the Guard in two turns", () => {
    // 60 against 71 (the Guard counts half as much again on its Field
    // Defense): no commitment, and a Fighter does not trade 4 for 8.
    const few = guardLine(3);
    expect(new Set(modesOf(few))).toEqual(new Set(["NONE"]));
    expect(kindsOf(policyTurn(few).commands)).not.toContain("ATTACK");

    const many = guardLine(6);
    expect(new Set(modesOf(many))).toEqual(new Set(["COMMIT"]));
    const guard = unitAtV7(many, at(5, 2));
    const first = policyTurn(many);
    // The exchange it refused with three: 4 dealt for 8 taken.
    const opening = attacksOf(first.commands);
    expect(opening.length).toBeGreaterThanOrEqual(2);
    for (const attack of opening) expect(attack.targetUnitId).toBe(guard.id);
    const hit = first.state.units.find((unit) => unit.id === guard.id);
    expect(hit?.hp).toBeLessThan(guard.hp);
    // The attackers paid for it: they took more than they dealt.
    const lost = opening.reduce((total, attack) => {
      const before = many.units.find((unit) => unit.id === attack.unitId);
      const after = first.state.units.find((unit) => unit.id === attack.unitId);
      return total + (before?.hp ?? 0) - (after?.hp ?? 0);
    }, 0);
    expect(lost).toBeGreaterThan(guard.hp - (hit?.hp ?? 0));
    // Every Fighter of the group ends the turn nearer to the position.
    for (const unit of first.state.units.filter(
      (candidate) =>
        candidate.ownerId === seatIdV7(many, 0) && candidate.at.y <= 4,
    ))
      expect(distance(unit.at, guard.at)).toBeLessThanOrEqual(2);
    const second = policyTurn(nextRound(first.state));
    expect(second.state.units.some((unit) => unit.id === guard.id)).toBe(false);
  });
});

describe("the assault: massing, fire first, and the gap", () => {
  it("waits outside every reach while the group comes up, then goes in together", () => {
    // A Guard, a Marksman, and a Fighter in the north-west corner (77);
    // two Fighters have arrived, four more are on their way (120 in all).
    let state = bare(
      field([
        { seat: 0, role: "FIGHTER", at: at(6, 1) },
        { seat: 0, role: "FIGHTER", at: at(6, 2) },
        { seat: 0, role: "FIGHTER", at: at(10, 1) },
        { seat: 0, role: "FIGHTER", at: at(10, 2) },
        { seat: 0, role: "FIGHTER", at: at(10, 3) },
        { seat: 0, role: "FIGHTER", at: at(9, 1) },
        { seat: 0, role: "FIGHTER", at: at(8, 8) },
        { seat: 1, role: "GUARD", at: at(2, 2) },
        { seat: 1, role: "MARKSMAN", at: at(1, 2) },
        { seat: 1, role: "FIGHTER", at: at(2, 3) },
        { seat: 1, role: "FIGHTER", at: at(2, 8) },
      ]),
    );
    const own = seatIdV7(state, 0);
    const enemies = [at(2, 2), at(1, 2), at(2, 3)];
    const gap = (where: CoordV7): number =>
      Math.min(...enemies.map((enemy) => distance(enemy, where)));
    expect(new Set(modesOf(state))).toEqual(new Set(["STAGE"]));
    // Three turns of staging: nobody attacks, nobody steps inside the reach
    // of the Marksman (its Move and its range: 3 tiles) or of the Fighter.
    // (Two before tuning 8, `pulp_wars-w49.11`: the position was weighed
    // again after every Move, so the two front units stepped into reach in
    // the turn the others were still walking up. An army now goes in at
    // the start of a turn, massed.)
    for (let turn = 0; turn < 3; turn += 1) {
      const played = policyTurn(state);
      expect(kindsOf(played.commands)).not.toContain("ATTACK");
      for (const unit of played.state.units)
        if (unit.ownerId === own && unit.at.y <= 5)
          expect(gap(unit.at), `turn ${turn}`).toBeGreaterThanOrEqual(3);
      state = nextRound(played.state);
    }
    // The group is assembled: it commits, and every unit of it closes in
    // in the same turn.
    const before = state.units.filter(
      (unit) => unit.ownerId === own && unit.at.y <= 6,
    );
    const committed = policyTurn(state);
    expect(modesOf(committed.state)).toContain("COMMIT");
    const closer = before.filter((unit) => {
      const after = committed.state.units.find(
        (candidate) => candidate.id === unit.id,
      );
      return after !== undefined && gap(after.at) < gap(unit.at);
    });
    expect(closer.length).toBe(before.length);
    // And the turn after it attacks.
    const assault = policyTurn(nextRound(committed.state));
    expect(attacksOf(assault.commands).length).toBeGreaterThanOrEqual(2);
  });

  it("fires its siege and ranged units at the anchor first and finishes with the melee", () => {
    // A Guard in a Forest between two Swordsmen, a Catapult behind; the
    // attackers are worth 222 against 148.
    const state = forestV7(
      bare(
        field([
          { seat: 0, role: "CATAPULT", at: at(8, 2) },
          { seat: 0, role: "MARKSMAN", at: at(7, 1) },
          { seat: 0, role: "MARKSMAN", at: at(7, 3) },
          { seat: 0, role: "FIGHTER", at: at(6, 1) },
          { seat: 0, role: "FIGHTER", at: at(6, 3) },
          { seat: 0, role: "SWORDSMAN", at: at(6, 2) },
          { seat: 0, role: "KNIGHT", at: at(8, 3) },
          { seat: 0, role: "FIGHTER", at: at(8, 8) },
          { seat: 1, role: "GUARD", at: at(5, 2) },
          { seat: 1, role: "SWORDSMAN", at: at(5, 1) },
          { seat: 1, role: "SWORDSMAN", at: at(5, 3) },
          { seat: 1, role: "CATAPULT", at: at(3, 2) },
          { seat: 1, role: "FIGHTER", at: at(2, 8) },
        ]),
      ),
      at(5, 2),
    );
    const guard = unitAtV7(state, at(5, 2)).id;
    const catapult = unitAtV7(state, at(8, 2)).id;
    const swordsman = unitAtV7(state, at(6, 2)).id;
    expect(new Set(modesOf(state))).toEqual(new Set(["COMMIT"]));
    const turn = policyTurn(state);
    const attacks = attacksOf(turn.commands);
    // The Catapult opens on the Guard (Defense 1 against it, in cover);
    // the Swordsman kills it and takes its tile.
    expect(attacks[0]).toEqual({
      kind: "ATTACK",
      unitId: catapult,
      targetUnitId: guard,
    });
    expect(attacks[1]).toEqual({
      kind: "ATTACK",
      unitId: swordsman,
      targetUnitId: guard,
    });
    expect(turn.state.units.some((unit) => unit.id === guard)).toBe(false);
    expect(unitAtV7(turn.state, at(5, 2)).id).toBe(swordsman);
    // Each Marksman shoots before the Fighter next to it strikes.
    const order = (unitId: number): number =>
      turn.commands.findIndex(
        (command) => command.kind === "ATTACK" && command.unitId === unitId,
      );
    const marksmen = [at(7, 1), at(7, 3)].map((where) =>
      order(unitAtV7(state, where).id),
    );
    const fighters = [at(6, 1), at(6, 3)].map((where) =>
      order(unitAtV7(state, where).id),
    );
    for (const index of [...marksmen, ...fighters])
      expect(index).toBeGreaterThanOrEqual(0);
    expect(Math.max(...marksmen)).toBeLessThan(Math.max(...fighters));
    // Three of the line's units are dead at the end of the turn.
    expect(
      turn.state.units.filter(
        (unit) => unit.ownerId === seatIdV7(state, 1) && unit.at.x === 5,
      ),
    ).toHaveLength(0);
  });

  it("sends a Raider through a gap to the Catapult before the line fights", () => {
    const state = bare(
      field([
        { seat: 0, role: "RAIDER", at: at(7, 2) },
        { seat: 0, role: "SWORDSMAN", at: at(6, 1) },
        { seat: 0, role: "SWORDSMAN", at: at(6, 3) },
        { seat: 0, role: "SWORDSMAN", at: at(7, 1) },
        { seat: 0, role: "SWORDSMAN", at: at(7, 3) },
        { seat: 0, role: "FIGHTER", at: at(8, 8) },
        { seat: 1, role: "GUARD", at: at(5, 1) },
        { seat: 1, role: "GUARD", at: at(5, 3) },
        { seat: 1, role: "CATAPULT", at: at(4, 2) },
        { seat: 1, role: "FIGHTER", at: at(2, 8) },
      ]),
    );
    const raider = unitAtV7(state, at(7, 2)).id;
    const catapult = unitAtV7(state, at(4, 2)).id;
    const turn = policyTurn(state);
    // Its first command of the fight: through the gap at (5, 2).
    const firstFight = turn.commands.find(
      (command) => command.kind === "MOVE" || command.kind === "ATTACK",
    );
    expect(firstFight).toMatchObject({ kind: "MOVE", unitId: raider });
    expect(firstFight?.kind === "MOVE" && firstFight.path.at(-1)).toEqual(
      at(5, 2),
    );
    expect(attacksOf(turn.commands)[0]).toEqual({
      kind: "ATTACK",
      unitId: raider,
      targetUnitId: catapult,
    });
    // The Swordsmen then kill both Guards.
    expect(
      turn.state.units.filter(
        (unit) => unit.ownerId === seatIdV7(state, 1) && unit.role === "GUARD",
      ),
    ).toHaveLength(0);
  });

  it("prefers a ranged or siege target for a fast or ranged unit", () => {
    // A Marksman with a Fighter and a Marksman in range shoots the Marksman.
    const state = bare(
      field([
        { seat: 0, role: "MARKSMAN", at: at(6, 2) },
        { seat: 0, role: "FIGHTER", at: at(8, 8) },
        { seat: 1, role: "FIGHTER", at: at(4, 1) },
        { seat: 1, role: "MARKSMAN", at: at(4, 3) },
        { seat: 1, role: "FIGHTER", at: at(2, 8) },
      ]),
    );
    const view = viewForV7(state, seatIdV7(state, 0));
    const shooter = unitAtV7(state, at(6, 2)).id;
    const shot = (target: CoordV7) =>
      scoreCommandV7(view, {
        kind: "ATTACK",
        unitId: shooter,
        targetUnitId: unitAtV7(state, target).id,
      });
    expect(shot(at(4, 3)).strategicValue).toBeGreaterThan(
      shot(at(4, 1)).strategicValue,
    );
    expect(attacksOf(policyTurn(state).commands)[0]?.targetUnitId).toBe(
      unitAtV7(state, at(4, 3)).id,
    );
  });

  it("keeps attacking with a wounded unit once the battle is joined", () => {
    // Two Swordsmen and a Fighter around a wounded Guard.
    const state = bare(
      field([
        { seat: 0, role: "SWORDSMAN", at: at(6, 1), hp: 5 },
        { seat: 0, role: "SWORDSMAN", at: at(6, 3) },
        { seat: 0, role: "FIGHTER", at: at(7, 2) },
        { seat: 0, role: "FIGHTER", at: at(8, 8) },
        { seat: 1, role: "GUARD", at: at(5, 2), hp: 16 },
        { seat: 1, role: "FIGHTER", at: at(2, 8) },
      ]),
    );
    const guard = unitAtV7(state, at(5, 2));
    const wounded = unitAtV7(state, at(6, 1)).id;
    const turn = policyTurn(state);
    // The Swordsman at a third of its HP attacks instead of recovering.
    expect(turn.commands).toContainEqual({
      kind: "ATTACK",
      unitId: wounded,
      targetUnitId: guard.id,
    });
    expect(kindsOf(turn.commands)).not.toContain("RECOVER");
    expect(turn.state.units.some((unit) => unit.id === guard.id)).toBe(false);
  });
});

describe("expansion and growth", () => {
  it("steps onto a free village before an exchange, stays on it, and captures it", () => {
    // A Fighter next to the village at (5, 5) and an enemy Fighter two
    // tiles from it: 5 for 5 would be an acceptable exchange.
    const state = field([
      { seat: 0, role: "FIGHTER", at: at(6, 4) },
      { seat: 0, role: "FIGHTER", at: at(8, 8) },
      { seat: 1, role: "FIGHTER", at: at(6, 2) },
      { seat: 1, role: "FIGHTER", at: at(2, 8) },
    ]);
    const fighter = unitAtV7(state, at(6, 4)).id;
    expect(
      inspectNormalArmyV7(viewForV7(state, seatIdV7(state, 0))).expanding,
    ).toBe(true);
    const first = policyTurn(state);
    expect(first.commands[0]).toMatchObject({ kind: "MOVE", unitId: fighter });
    expect(unitAtV7(first.state, at(5, 5)).id).toBe(fighter);
    expect(kindsOf(first.commands)).not.toContain("ATTACK");
    // Next turn it captures; it did not walk off in between.
    const second = policyTurn(nextRound(first.state));
    expect(second.commands[0]).toEqual({ kind: "CAPTURE", unitId: fighter });
    expect(
      second.state.cities.filter((city) => city.ownerId === seatIdV7(state, 0)),
    ).toHaveLength(2);
  });

  it("does not leave a village it stands on for a Move or an attack that advances", () => {
    const state = field([
      { seat: 0, role: "FIGHTER", at: at(5, 5) },
      { seat: 0, role: "FIGHTER", at: at(8, 8) },
      { seat: 1, role: "FIGHTER", at: at(5, 4), hp: 2 },
      { seat: 1, role: "FIGHTER", at: at(2, 8) },
    ]);
    const fighter = unitAtV7(state, at(5, 5)).id;
    const decision = chooseNormalCommandV7(
      viewForV7(state, seatIdV7(state, 0)),
    );
    const own = decision.candidates.filter(
      ({ command }) => "unitId" in command && command.unitId === fighter,
    );
    // The kill of the 2-HP Fighter would advance it off the village.
    expect(own.map(({ command }) => command.kind)).not.toContain("MOVE");
    expect(own.map(({ command }) => command.kind)).not.toContain("ATTACK");
  });

  /** A level-1 capital with two Fruit tiles and Gathering. */
  const orchard = (enemyAt: CoordV7, coins: number): GameStateV7 =>
    patchTileV7(
      patchTileV7(
        bare(
          field(
            [
              { seat: 0, role: "FIGHTER", at: at(9, 9) },
              { seat: 1, role: "FIGHTER", at: enemyAt },
              { seat: 1, role: "FIGHTER", at: at(2, 8) },
            ],
            { techs: { 0: ["GATHERING"] }, coins },
          ),
        ),
        at(7, 7),
        { resource: "FRUIT" },
      ),
      at(9, 7),
      { resource: "FRUIT" },
    );

  // The reward ladder rework (`pulp_wars-zypi`): the level-2 reward is
  // the Stockpile or the Militia, and a seat with fewer than two units for
  // each city takes the Militia. Its free Fighter stands on the center, so
  // the city trains no unit this turn (it took a level-2 reward and then
  // trained a Fighter with the 2 Coins left before).
  it("harvests to a city level before it trains while no enemy is near, and takes the Militia's free Fighter", () => {
    const state = orchard(at(1, 1), 6);
    const turn = policyTurn(state);
    const kinds = kindsOf(turn.commands);
    expect(kinds.slice(0, 3)).toEqual([
      "HARVEST_FRUIT",
      "HARVEST_FRUIT",
      "CHOOSE_CITY_REWARD",
    ]);
    expect(turn.commands[2]).toMatchObject({ reward: "MILITIA" });
    const own = seatIdV7(turn.state, 0);
    const capital = turn.state.cities.find((city) => city.ownerId === own);
    expect(capital?.level).toBe(2);
    expect(
      turn.state.units.filter(
        (unit) => unit.ownerId === own && unit.role === "FIGHTER",
      ),
    ).toHaveLength(
      state.units.filter(
        (unit) => unit.ownerId === own && unit.role === "FIGHTER",
      ).length + 1,
    );
  });

  it("with an enemy three tiles from the center it trains first, and buys nothing else while a city can still train", () => {
    const state = orchard(at(5, 8), 6);
    const army = inspectNormalArmyV7(viewForV7(state, seatIdV7(state, 0)));
    expect(army.threatDistance).toBe(3);
    expect(army.pressed).toBe(true);
    const decision = chooseNormalCommandV7(
      viewForV7(state, seatIdV7(state, 0)),
    );
    const candidates = decision.candidates.map(({ command }) => command.kind);
    // The Martian pass's correction (`pulp_wars-w49.14`): a pressed Human
    // seat still buys the growth that leaves the Coins for any unit it can
    // train (6 Coins: a 2-Coin harvest and the 2-Coin Fighter), so the
    // harvest is a candidate beside the training; research is not.
    expect(candidates).toContain("TRAIN");
    expect(candidates).toContain("HARVEST_FRUIT");
    expect(candidates).not.toContain("RESEARCH");
    // The reward ladder rework (`pulp_wars-zypi`): the harvests take the
    // threatened capital to level 2, whose Militia puts a free Fighter on
    // the center, so the turn holds that Fighter and no training (it took
    // a level-2 reward and trained before).
    const turn = policyTurn(state);
    expect(kindsOf(turn.commands)).toContain("HARVEST_FRUIT");
    expect(turn.commands).toContainEqual(
      expect.objectContaining({
        kind: "CHOOSE_CITY_REWARD",
        reward: "MILITIA",
      }),
    );
    // With 3 Coins the harvest would leave 1: the unit only, as before.
    const poor = chooseNormalCommandV7(
      viewForV7(orchard(at(5, 8), 3), seatIdV7(state, 0)),
    );
    expect(poor.command?.kind).toBe("TRAIN");
    expect(poor.candidates.map(({ command }) => command.kind)).not.toContain(
      "HARVEST_FRUIT",
    );
  });

  it("builds a free Monument at once", () => {
    // With Scouting the Explorer achievement of this field is unlocked.
    const state = bare(
      field(
        [
          { seat: 0, role: "FIGHTER", at: at(9, 9) },
          { seat: 1, role: "FIGHTER", at: at(2, 8) },
        ],
        { techs: { 0: ["GATHERING", "SCOUTING"] }, coins: 0 },
      ),
    );
    const turn = policyTurn(state);
    expect(turn.commands[0]).toMatchObject({
      kind: "BUILD_MONUMENT",
      achievement: "EXPLORER",
    });
  });

  // The reward ladder rework (`pulp_wars-zypi`): level 4 offers the
  // Population Boom or the Economic Miracle (the Boom, the 6-Coin Treasury,
  // or Barracks before, where the policy took the population). The policy
  // takes the Miracle unless the Boom's +3 population reaches the next level
  // at once.
  it("takes the Economic Miracle at level 4, and the Boom when it reaches level 5 at once", () => {
    // A level-2 capital (one Farm) takes its Militia, builds two Farms
    // (level 3, Walls) and two more: level 4.
    const fixture = rewardStateV7("MILITIA", "ORIGINAL");
    const own = seatIdV7(fixture.state, 0);
    let state = applyOkV7(fixture.state, own, fixture.command).state;
    const capital = state.cities.find((city) => city.ownerId === own);
    if (capital === undefined) throw new Error("no capital");
    const free = state.board.tiles
      .filter(
        (tile) =>
          tile.territoryCityId === capital.id &&
          tile.site === null &&
          tile.improvement === null &&
          !state.units.some(
            (unit) => unit.at.x === tile.at.x && unit.at.y === tile.at.y,
          ),
      )
      .slice(0, 4);
    expect(free).toHaveLength(4);
    for (const tile of free) {
      state = patchTileV7(state, tile.at, {
        biome: "PLAINS",
        terrain: "GRASS",
        resource: "FERTILE_GROUND",
      });
      state = applyOkV7(state, own, { kind: "BUILD_FARM", at: tile.at }).state;
      const pending = state.pendingChoices[0];
      if (pending?.reachedLevel === 3)
        state = applyOkV7(state, own, {
          kind: "CHOOSE_CITY_REWARD",
          cityId: capital.id,
          reachedLevel: 3,
          reward: "WALLS",
        }).state;
    }
    expect(state.pendingChoices[0]).toMatchObject({
      kind: "CITY_REWARD",
      reachedLevel: 4,
      candidates: ["BOOM", "ECONOMIC_MIRACLE"],
    });
    const choice = (value: GameStateV7) =>
      chooseNormalCommandV7(viewForV7(value, own)).command;
    // Population 1 of the 5 that level 5 takes: the Boom does not reach it.
    expect(state.cities.find((city) => city.id === capital.id)).toMatchObject({
      level: 4,
      population: 1,
    });
    expect(choice(state)).toEqual({
      kind: "CHOOSE_CITY_REWARD",
      cityId: capital.id,
      reachedLevel: 4,
      reward: "ECONOMIC_MIRACLE",
    });
    // With one more population (a view the policy reads; the ledger is not
    // the point here) the Boom's +3 makes level 5 at once.
    const fuller: GameStateV7 = {
      ...state,
      cities: state.cities.map((city) =>
        city.id === capital.id
          ? {
              ...city,
              economicPopulation: city.economicPopulation + 1,
              population: city.population + 1,
            }
          : city,
      ),
    };
    expect(choice(fuller)).toEqual({
      kind: "CHOOSE_CITY_REWARD",
      cityId: capital.id,
      reachedLevel: 4,
      reward: "BOOM",
    });
  });
});

describe("research toward the army", () => {
  it("is due while the city levels are worth more technologies than the seat owns", () => {
    // One technology is the opener; each further one needs two city levels.
    expect(armyResearchDueV7(1, 1)).toBe(true);
    expect(armyResearchDueV7(2, 2)).toBe(true);
    expect(armyResearchDueV7(3, 3)).toBe(false);
    expect(armyResearchDueV7(4, 3)).toBe(true);
    expect(armyResearchDueV7(9, 6)).toBe(false);
    expect(armyResearchDueV7(10, 6)).toBe(true);
  });

  // The correction pass: the order is the faction's own, its signature
  // units first (it was one class order: ranged, siege, breakthrough, and
  // the Zombie ninth).
  const researchOrder = (
    state: (techs: readonly TechnologyIdV7[]) => GameStateV7,
  ): TechnologyIdV7[] => {
    const order: TechnologyIdV7[] = [];
    for (let step = 0; step < 14; step += 1) {
      const next = state(
        // In the canonical order a state keeps them in.
        TECHNOLOGY_IDS_V7.filter(
          (tech) => tech === "GATHERING" || order.includes(tech),
        ),
      );
      const target = inspectNormalArmyV7(
        viewForV7(next, seatIdV7(next, 0)),
      ).research;
      if (target === null) break;
      order.push(target.tech);
    }
    return order;
  };
  const oneCity =
    (faction: FactionIdV7) =>
    (techs: readonly TechnologyIdV7[]): GameStateV7 =>
      bare(
        field(
          [
            { seat: 0, role: "FIGHTER", at: at(9, 9) },
            { seat: 1, role: "FIGHTER", at: at(2, 8) },
          ],
          { factions: [faction, "ORIGINAL"], techs: { 0: techs } },
        ),
      );

  it("researches toward each faction's signature units first", () => {
    expect(ARMY_RESEARCH_ROLES_V7).toEqual({
      // The Goblin pass, correction (`pulp_wars-w49.12`): the Swordsman
      // third (it was fifth: a Human seat at war bought Forestry and
      // Sawmilling for a Catapult it never trained and had no Swordsman
      // in round 25).
      ORIGINAL: [
        "MARKSMAN",
        "GUARD",
        "SWORDSMAN",
        "CATAPULT",
        "KNIGHT",
        "CAPTAIN",
      ],
      // The Undead pass (`pulp_wars-w49.13`): the Lich third (it was
      // fourth, behind the Necromancer).
      // (The ninth unit, `pulp_wars-w49.17`, 7r55: the heavy line unit of
      // each faction joins its order: the Wight and the Ogre after the
      // support unit, the Shock Trooper after the Ray Gunner, and the
      // Triceratops as the heavy role with the Stegosaurus after the
      // Spitter.)
      UNDEAD: [
        "GUARD",
        "MARKSMAN",
        "CATAPULT",
        "CAPTAIN",
        "SWORDSMAN",
        "KNIGHT",
      ],
      // The Goblin pass (`pulp_wars-w49.12`): the Warboss before the Scrap
      // Buggy (it was KNIGHT, GUARD, CAPTAIN); its correction: the Orc
      // Brute third (a Human Knight's chain ends on a Brute).
      GOBLIN: [
        "MARKSMAN",
        "RAIDER",
        // Step two of the Goblin pass (`pulp_wars-w49.23`): the Ogre third.
        "SWORDSMAN",
        "GUARD",
        "CATAPULT",
        "CAPTAIN",
        "KNIGHT",
      ],
      // The Martian pass (`pulp_wars-w49.14`): the Shield Projector, the
      // Ray Gunner, the Tripod, the Brain, the Saucer, the Mothership.
      // Step two of the Martian pass (`pulp_wars-w49.25`): the Brain third
      // (the Tripod goes before the Shock Trooper unless the enemy in sight
      // fights hand to hand: `armyMartianResearchRolesV7`).
      MARTIAN: [
        "GUARD",
        "MARKSMAN",
        "CAPTAIN",
        "SWORDSMAN",
        "CATAPULT",
        "RAIDER",
        "KNIGHT",
      ],
      // The Dinosaur pass (`pulp_wars-w49.15`): the Ankylosaurus, the
      // Triceratops, the Raptor, the Spitter, the Shaman, the T-Rex.
      // Step two of the Dinosaur pass (`pulp_wars-w49.26`): the Spitter and
      // the Raptor before the Triceratops.
      DINOSAUR: [
        "GUARD",
        "MARKSMAN",
        "RAIDER",
        "SWORDSMAN",
        "CATAPULT",
        "CAPTAIN",
        "KNIGHT",
      ],
      // Step two of the Ice Folk pass (`pulp_wars-w49.27`): the Sled, the
      // Snow Hunter, the Musk Ox (and Deep Winter), the Ice Witch, the
      // Mammoth, the Boulder Yeti, the Sabretooth.
      ICE_FOLK: [
        "RAIDER",
        "MARKSMAN",
        "GUARD",
        "CAPTAIN",
        "SWORDSMAN",
        "CATAPULT",
        "KNIGHT",
      ],
      // Step two of the Dwarf pass (`pulp_wars-w49.28`): the Steam Mole
      // (and Dig In), the Clockwork Gunner, the Gyrocopter, the Engineer,
      // the Steam Tank, the Steam Cannon, the Whirligig.
      DWARF: [
        "GUARD",
        "MARKSMAN",
        "RAIDER",
        "CAPTAIN",
        "SWORDSMAN",
        "CATAPULT",
        "KNIGHT",
      ],
      // The Candy army seat (`pulp_wars-jdb.13`): the Donut Racer, the
      // Gumball Gunner, the Marshmallow (and Home Sweet Home), the
      // Confectioner, the Pie Launcher, the Jawbreaker, the Chocolate Bunny.
      CANDY: [
        "RAIDER",
        "MARKSMAN",
        "GUARD",
        "CAPTAIN",
        "CATAPULT",
        "SWORDSMAN",
        "KNIGHT",
      ],
    });
    expect(Object.keys(ARMY_RESEARCH_ROLES_V7)).toEqual([
      ...ARMY_PLAY_FACTIONS_V7,
    ]);
    // Humans: the Marksman with the second technology bought, the Guard as
    // a cheap anchor with the third, then the Catapult and the Knight.
    // (The Industry reshuffle, `pulp_wars-w49.21`, 7r56: the defender of
    // every faction is at Fortification, one technology behind the root.)
    expect(researchOrder(oneCity("ORIGINAL"))).toEqual([
      "HUNTING",
      "MARKSMANSHIP",
      "DRILL",
      "FORTIFICATION",
      "ENGINEERING",
      // (The ninth unit, 7r55: the Champion is at Metallurgy.)
      "METALLURGY",
      "FORESTRY",
      "SAWMILLING",
      "SCOUTING",
      "RAIDING",
      "CHIVALRY",
      "ADMINISTRATION",
    ]);
    // Undead: the Zombie with the first technology bought, the Banshee with
    // the third, then the Necromancer, the Lich, and the Vampire.
    const undead = researchOrder(oneCity("UNDEAD"));
    expect(undead).toEqual([
      "DRILL",
      "FORTIFICATION",
      "HUNTING",
      "MARKSMANSHIP",
      // The Undead pass (`pulp_wars-w49.13`): the Lich before the
      // Necromancer.
      "FORESTRY",
      "SAWMILLING",
      "ADMINISTRATION",
      // The ninth unit (7r55): the Wight, at Metallurgy.
      "ENGINEERING",
      "METALLURGY",
      "SCOUTING",
      "RAIDING",
      "CHIVALRY",
    ]);
    expect(undead.indexOf("FORTIFICATION")).toBeLessThan(3);
    // Goblins: the Bomb Chucker and the Wolf Rider, the Orc Brute (the
    // correction of the Goblin pass; it was last), then the Rocket Cart,
    // the Warboss, and the Scrap Buggy.
    // Step two of the Goblin pass (`pulp_wars-w49.23`): the Ogre third (the
    // root, Engineering, Armoury), and Fortification one step behind it.
    expect(researchOrder(oneCity("GOBLIN"))).toEqual([
      "HUNTING",
      "MARKSMANSHIP",
      "SCOUTING",
      "DRILL",
      "ENGINEERING",
      "METALLURGY",
      "FORTIFICATION",
      "FORESTRY",
      "SAWMILLING",
      "ADMINISTRATION",
      "RAIDING",
      "CHIVALRY",
    ]);
  });

  it("with three cities researches Roads after its first two units, and Commerce after the last", () => {
    const threeCities = (techs: readonly TechnologyIdV7[]): GameStateV7 => {
      const base = field(
        [
          { seat: 0, role: "FIGHTER", at: at(5, 5), captureEligible: true },
          { seat: 0, role: "FIGHTER", at: at(8, 5), captureEligible: true },
          { seat: 0, role: "FIGHTER", at: at(9, 9) },
          { seat: 1, role: "FIGHTER", at: at(0, 10) },
        ],
        { techs: { 0: techs } },
      );
      let state = base;
      for (const where of [at(5, 5), at(8, 5)])
        state = applyOkV7(state, seatIdV7(state, 0), {
          kind: "CAPTURE",
          unitId: unitAtV7(state, where).id,
        }).state;
      return state;
    };
    const order = researchOrder(threeCities);
    expect(order.slice(0, 7)).toEqual([
      "HUNTING",
      "MARKSMANSHIP",
      "DRILL",
      "FORTIFICATION",
      // Roads (by Scouting) once the Marksman and the Guard can be trained.
      "SCOUTING",
      "ROADS",
      "ENGINEERING",
    ]);
    expect(order.at(-1)).toBe("COMMERCE");
    // A seat with one city does not research Roads at all.
    expect(researchOrder(oneCity("ORIGINAL"))).not.toContain("ROADS");
  });

  it("buys the due technology before it trains while no enemy is near and it has its cities", () => {
    // Three cities (levels 1 + 1 + 1 against one technology): due.
    const base = field(
      [
        { seat: 0, role: "FIGHTER", at: at(5, 5), captureEligible: true },
        { seat: 0, role: "FIGHTER", at: at(8, 5), captureEligible: true },
        { seat: 0, role: "FIGHTER", at: at(9, 9) },
        // More than four tiles from every center of seat 0.
        { seat: 1, role: "FIGHTER", at: at(0, 10) },
      ],
      { techs: { 0: ["GATHERING"] }, coins: 9 },
    );
    const own = seatIdV7(base, 0);
    let state = base;
    for (const where of [at(5, 5), at(8, 5)])
      state = applyOkV7(state, own, {
        kind: "CAPTURE",
        unitId: unitAtV7(state, where).id,
      }).state;
    const army = inspectNormalArmyV7(viewForV7(state, own));
    expect(army.expanding).toBe(false);
    // Three cities: a tier-1 technology costs 5 + 2 (the economy rejig).
    expect(army.research).toMatchObject({
      tech: "HUNTING",
      cost: 7,
      due: true,
    });
    const turn = policyTurn(state);
    expect(turn.commands[0]).toEqual({ kind: "RESEARCH", tech: "HUNTING" });
    expect(kindsOf(turn.commands)).toContain("TRAIN");
  });

  it("trains before it researches while it still has one city", () => {
    const state = bare(
      field(
        [
          { seat: 0, role: "FIGHTER", at: at(9, 9) },
          { seat: 1, role: "FIGHTER", at: at(1, 1) },
          { seat: 1, role: "FIGHTER", at: at(2, 8) },
        ],
        { techs: { 0: ["GATHERING"] }, coins: 7 },
      ),
    );
    const kinds = kindsOf(policyTurn(state).commands);
    expect(kinds.indexOf("TRAIN")).toBeGreaterThanOrEqual(0);
    expect(kinds.indexOf("TRAIN")).toBeLessThan(kinds.indexOf("RESEARCH"));
  });
});

// The correction pass: the Undead army is a third Zombies, and they are
// used the way they work. The Undead pass (`pulp_wars-w49.13`): a quarter
// Zombies, and a Zombie bites the dearest unit in its reach.
describe("the Undead field Zombies", () => {
  const UNDEAD = ["UNDEAD", "ORIGINAL"] as const;

  it("buys a Zombie for every fourth unit of a growing Undead army", () => {
    const roles: readonly UnitRoleIdV7[] = [
      "FIGHTER",
      "GUARD",
      "MARKSMAN",
      "CATAPULT",
      "KNIGHT",
    ];
    const byClass = {
      LINE: 2,
      DEFENDER: 0,
      RANGED: 0,
      SIEGE: 0,
      BREAKTHROUGH: 0,
      SKIRMISHER: 0,
      SUPPORT: 0,
    };
    const bought: UnitRoleIdV7[] = [];
    for (let unit = 0; unit < 10; unit += 1) {
      const counts = {
        total: Object.values(byClass).reduce((sum, value) => sum + value, 0),
        byClass,
        hostileFragile: 0,
      };
      const next = [...roles].sort(
        (left, right) =>
          armyRoleScoreV7("UNDEAD", right, counts, false) -
          armyRoleScoreV7("UNDEAD", left, counts, false),
      )[0] as UnitRoleIdV7;
      bought.push(next);
      const unitClass = effectiveRoleRuleV7(next, "UNDEAD").tacticalRole;
      byClass[unitClass as keyof typeof byClass] += 1;
    }
    // Twelve units: two Skeletons to start with and ten bought. The
    // Undead pass: three Zombies (four before), three Liches (two), two
    // Banshees, two Vampires.
    expect(bought.filter((role) => role === "GUARD")).toHaveLength(3);
    expect(byClass).toMatchObject({
      DEFENDER: 3,
      RANGED: 2,
      SIEGE: 3,
      BREAKTHROUGH: 2,
    });
    // With only Drill owned (its first technology bought), the Zombie is
    // the first unit an army of Skeletons buys.
    expect(
      armyRoleScoreV7(
        "UNDEAD",
        "GUARD",
        {
          total: 2,
          byClass: { ...byClass, LINE: 2, DEFENDER: 0 },
          hostileFragile: 0,
        },
        false,
      ),
    ).toBeGreaterThan(
      armyRoleScoreV7(
        "UNDEAD",
        "FIGHTER",
        {
          total: 2,
          byClass: { ...byClass, LINE: 2, DEFENDER: 0 },
          hostileFragile: 0,
        },
        false,
      ),
    );
    // A Human army keeps its 15%: one Guard in the same ten purchases
    // would be too few to call a share, so the shares are per faction.
    expect(
      armyRoleScoreV7(
        "ORIGINAL",
        "GUARD",
        {
          total: 6,
          byClass: { ...byClass, LINE: 5, DEFENDER: 1 },
          hostileFragile: 0,
        },
        false,
      ),
    ).toBeLessThan(
      armyRoleScoreV7(
        "UNDEAD",
        "GUARD",
        {
          total: 6,
          byClass: { ...byClass, LINE: 5, DEFENDER: 1 },
          hostileFragile: 0,
        },
        false,
      ),
    );
  });

  it("a Zombie bites the dearest unit beside it, and of two as dear the infantry it converts", () => {
    const state = bare(
      field(
        [
          { seat: 0, role: "GUARD", at: at(5, 3) },
          { seat: 0, role: "FIGHTER", at: at(9, 9) },
          { seat: 1, role: "FIGHTER", at: at(4, 2) },
          { seat: 1, role: "RAIDER", at: at(4, 4) },
          { seat: 1, role: "GUARD", at: at(6, 2) },
        ],
        { factions: UNDEAD },
      ),
    );
    const view = viewForV7(state, seatIdV7(state, 0));
    const zombie = unitAtV7(state, at(5, 3)).id;
    const value = (where: CoordV7): number =>
      scoreCommandV7(view, {
        kind: "ATTACK",
        unitId: zombie,
        targetUnitId: unitAtV7(state, where).id,
      }).strategicValue;
    // The Fighter is worth 12 more as a Zombie's target than it would be
    // (it rises when the Zombie kills it). The Undead pass
    // (`pulp_wars-w49.13`): a new bite is worth 4 a Coin of the target's
    // price, so the 4-Coin Raider (16) now comes before the 2-Coin Fighter
    // (8 and the 12), and the Fighter still before the 3-Coin Guard.
    expect(value(at(4, 4))).toBeGreaterThan(value(at(4, 2)));
    expect(value(at(4, 4)) - 8).toBeLessThan(value(at(4, 2)) + 12);
    expect(value(at(4, 2))).toBeGreaterThan(value(at(6, 2)));
    const attack = attacksOf(policyTurn(state).commands).find(
      (command) => command.unitId === zombie,
    );
    expect(attack?.targetUnitId).toBe(unitAtV7(state, at(4, 4)).id);
  });

  it("a Zombie values the tile the Marksman does not reach", () => {
    const state = bare(
      field(
        [
          { seat: 0, role: "GUARD", at: at(6, 3) },
          { seat: 0, role: "FIGHTER", at: at(9, 9) },
          { seat: 1, role: "FIGHTER", at: at(3, 3) },
          { seat: 1, role: "MARKSMAN", at: at(5, 0) },
        ],
        { factions: UNDEAD },
      ),
    );
    const view = viewForV7(state, seatIdV7(state, 0));
    const zombie = unitAtV7(state, at(6, 3)).id;
    const value = (where: CoordV7): number =>
      scoreCommandV7(view, move(zombie, where)).strategicValue;
    // (5, 2) and (5, 3) are inside the Marksman's reach next turn, like the
    // tile the Zombie stands on; (5, 4) is outside it.
    expect(value(at(5, 4))).toBeGreaterThanOrEqual(value(at(5, 3)) + 5);
    expect(value(at(5, 4))).toBeGreaterThanOrEqual(value(at(5, 2)) + 5);
    const moved = policyTurn(state).commands.find(
      (command) => command.kind === "MOVE" && command.unitId === zombie,
    );
    // Tuning 7 (`pulp_wars-w49.10`): a Zombie with no striker within two
    // tiles does not enter the Fighter's reach, so it leaves the
    // Marksman's by (6, 4) and not by (5, 4) (it took (5, 4) before).
    expect(moved?.kind === "MOVE" && moved.path.at(-1)).toEqual(at(6, 4));
  });
});

describe("the dear units get bought", () => {
  const counts = (pieces: readonly GoblinPieceV7[], faction: FactionIdV7) => {
    const state = field(pieces, { factions: [faction, "ORIGINAL"] });
    const view = viewForV7(state, seatIdV7(state, 0));
    return armyCountsV7(view, (unit) => unit.ownerId !== view.viewer.id);
  };
  const best = (
    faction: FactionIdV7,
    roles: readonly UnitRoleIdV7[],
    army: ReturnType<typeof counts>,
  ): UnitRoleIdV7 =>
    [...roles].sort(
      (left, right) =>
        armyRoleScoreV7(faction, right, army, false) -
        armyRoleScoreV7(faction, left, army, false),
    )[0] as UnitRoleIdV7;

  it("in a mixed army of cheap units the next unit is a siege or breakthrough unit, for every army faction", () => {
    const cheap: readonly GoblinPieceV7[] = [
      { seat: 0, role: "FIGHTER", at: at(8, 8) },
      { seat: 0, role: "FIGHTER", at: at(7, 8) },
      { seat: 0, role: "FIGHTER", at: at(9, 8) },
      { seat: 0, role: "GUARD", at: at(8, 7) },
      { seat: 0, role: "MARKSMAN", at: at(8, 9) },
      { seat: 0, role: "MARKSMAN", at: at(7, 7) },
    ];
    const roles = [
      "FIGHTER",
      "GUARD",
      "MARKSMAN",
      "CATAPULT",
      "KNIGHT",
    ] as const;
    for (const faction of ARMY_PLAY_FACTIONS_V7) {
      const army = counts(cheap, faction);
      const first = best(faction, roles, army);
      expect(["CATAPULT", "KNIGHT"], faction).toContain(first);
      // With that one on the board the other dear unit is next.
      // (The Dinosaur pass, `pulp_wars-w49.15`: the first dear unit of a
      // Dinosaur seat is the T-Rex; its Triceratops is a line unit.)
      const second = best(faction, roles, {
        ...army,
        total: army.total + 1,
        byClass: {
          ...army.byClass,
          [first === "CATAPULT" ? "SIEGE" : "BREAKTHROUGH"]: 1,
        },
      });
      // The Martian pass (`pulp_wars-w49.14`): a fifth of a Martian army
      // is Tripods and a tenth Motherships, so its second dear unit of
      // seven is a Tripod again.
      expect(second, faction).toBe(
        faction === "MARTIAN" || first !== "CATAPULT" ? "CATAPULT" : "KNIGHT",
      );
    }
  });

  it("a Goblin seat with the Coins trains a Scrap Buggy or a Rocket Cart, not a 1-Coin Goblin", () => {
    const state = bare(
      field(
        // Two of the capital's three unit slots are used.
        [
          { seat: 0, role: "FIGHTER", at: at(7, 7) },
          { seat: 0, role: "MARKSMAN", at: at(9, 9) },
          { seat: 1, role: "FIGHTER", at: at(2, 8) },
        ],
        {
          factions: ["GOBLIN", "ORIGINAL"],
          techs: {
            0: [
              "GATHERING",
              "HUNTING",
              "FORESTRY",
              "SAWMILLING",
              "MARKSMANSHIP",
              "SCOUTING",
              "RAIDING",
              "CHIVALRY",
              "DRILL",
              "FORTIFICATION",
            ],
          },
          coins: 12,
        },
      ),
    );
    // The Goblin pass (7r50): the free Monument takes the capital to level
    // 2. Since the reward ladder rework (`pulp_wars-zypi`) its choice is
    // the Stockpile or the Militia, and a seat with two units for its one
    // city takes the 4 Coins (it took Scouts and a Wolf Rider before).
    const first = policyTurn(state);
    expect(first.commands).toContainEqual(
      expect.objectContaining({
        kind: "CHOOSE_CITY_REWARD",
        reward: "STOCKPILE",
      }),
    );
    const trained = [
      ...first.commands,
      ...policyTurn(nextRound(first.state)).commands,
    ].flatMap((command) => (command.kind === "TRAIN" ? [command.role] : []));
    // With the center free (no Wolf Rider on it since `pulp_wars-zypi`)
    // the capital trains in both turns: a dear unit first, and never the
    // 1-Coin Goblin.
    expect(trained.length).toBeGreaterThanOrEqual(1);
    expect(["CATAPULT", "KNIGHT"]).toContain(trained[0]);
    expect(trained).not.toContain("FIGHTER");
  });
});

describe("discipline", () => {
  /** Seat 0 with a second city at (8, 5), every center empty. */
  const twoCities = (
    enemies: readonly GoblinPieceV7[],
    coins: number,
    own: readonly GoblinPieceV7[] = [],
  ): GameStateV7 => {
    const base = field(
      [
        { seat: 0, role: "FIGHTER", at: at(8, 5), captureEligible: true },
        ...own,
        ...enemies,
        { seat: 1, role: "FIGHTER", at: at(2, 8) },
      ],
      { coins },
    );
    const captured = applyOkV7(base, seatIdV7(base, 0), {
      kind: "CAPTURE",
      unitId: unitAtV7(base, at(8, 5)).id,
    }).state;
    // Next turn, with the capturer one step south of the new center.
    return checkedV7({
      ...captured,
      cities: captured.cities.map((city) => ({
        ...city,
        cityActionAvailable: true,
      })),
      units: captured.units.map((unit) => ({
        ...unit,
        at: unit.at.x === 8 && unit.at.y === 5 ? at(8, 6) : unit.at,
        activation: {
          ...unit.activation,
          moved: false,
          movedPathLength: 0,
          captured: false,
          handled: false,
        },
      })),
    });
  };

  it("never ends a turn with the Coins for a unit and a free slot in a city that can train", () => {
    // Both centers are occupied; each unit steps aside and each city trains.
    const state = bare(
      checkedV7({
        ...twoCities([], 10, [{ seat: 0, role: "GUARD", at: at(8, 8) }]),
      }),
    );
    const moved = checkedV7({
      ...state,
      units: state.units.map((unit) =>
        unit.at.x === 8 && unit.at.y === 6 ? { ...unit, at: at(8, 5) } : unit,
      ),
    });
    const own = seatIdV7(moved, 0);
    const turn = policyTurn(moved);
    const trainedIn = new Set(
      turn.commands.flatMap((command) =>
        command.kind === "TRAIN" ? [command.cityId] : [],
      ),
    );
    expect(trainedIn.size).toBe(2);
    // What is left would not buy a unit a free slot could take.
    const coins =
      turn.state.players.find((player) => player.id === own)?.coins ?? 0;
    const canTrain = queryPlayerCommandsV7(viewForV7(turn.state, own)).some(
      (command) => command.kind === "TRAIN",
    );
    expect(canTrain).toBe(false);
    expect(coins).toBeLessThan(10);
  });

  it("attacks an enemy unit that stands on its own center, whatever the exchange", () => {
    const state = bare(
      field([
        { seat: 0, role: "FIGHTER", at: at(7, 7) },
        { seat: 1, role: "GUARD", at: at(8, 8) },
        { seat: 1, role: "FIGHTER", at: at(2, 8) },
      ]),
    );
    const own = seatIdV7(state, 0);
    const attack: CommandV7 = {
      kind: "ATTACK",
      unitId: unitAtV7(state, at(7, 7)).id,
      targetUnitId: unitAtV7(state, at(8, 8)).id,
    };
    // 4 dealt for 8 taken: the exchange it refuses anywhere else.
    expect(
      queryCombatPreviewV7(
        viewForV7(state, own),
        attack.unitId,
        attack.targetUnitId,
      ),
    ).toMatchObject({ damageToDefender: 4, damageToAttacker: 8 });
    const decision = chooseNormalCommandV7(viewForV7(state, own));
    expect(decision.command).toEqual(attack);
    expect(decision.candidates[0]?.score.priority).toBe(1345);
  });

  it("steps the garrison aside and trains before the garrison chips at an enemy next to the center", () => {
    const state = bare(
      field(
        [
          { seat: 0, role: "FIGHTER", at: at(8, 8) },
          { seat: 1, role: "GUARD", at: at(7, 7) },
          { seat: 1, role: "FIGHTER", at: at(2, 8) },
        ],
        { coins: 6 },
      ),
    );
    const own = seatIdV7(state, 0);
    const turn = policyTurn(state);
    expect(kindsOf(turn.commands).slice(0, 2)).toEqual(["MOVE", "TRAIN"]);
    // The center is held, and a second unit stands beside it.
    expect(unitAtV7(turn.state, at(8, 8)).ownerId).toBe(own);
    expect(
      turn.state.units.filter(
        (unit) => unit.ownerId === own && distance(unit.at, at(8, 8)) <= 1,
      ),
    ).toHaveLength(2);
  });

  it("does not train onto a center two enemy ranged units cover while another city can train", () => {
    // Two Marksmen three tiles north of the second city (8, 5).
    const state = bare(
      twoCities(
        [
          { seat: 1, role: "MARKSMAN", at: at(8, 2) },
          { seat: 1, role: "MARKSMAN", at: at(9, 2) },
        ],
        4,
      ),
    );
    const own = seatIdV7(state, 0);
    const capital = state.cities.find(
      (city) => city.ownerId === own && city.at.y === 8,
    );
    const second = state.cities.find(
      (city) => city.ownerId === own && city.at.y === 5,
    );
    if (capital === undefined || second === undefined)
      throw new Error("no cities");
    const view = viewForV7(state, own);
    const offered = queryPlayerCommandsV7(view).flatMap((command) =>
      command.kind === "TRAIN" ? [command.cityId] : [],
    );
    expect(new Set(offered)).toEqual(new Set([capital.id, second.id]));
    const candidates = chooseNormalCommandV7(view).candidates.flatMap(
      ({ command }) => (command.kind === "TRAIN" ? [command.cityId] : []),
    );
    expect(candidates).toEqual([capital.id]);
    // The capital trains first; with Coins left the covered city may.
    const first = policyTurn(state).commands.find(
      (command) => command.kind === "TRAIN",
    );
    expect(first).toMatchObject({ kind: "TRAIN", cityId: capital.id });
  });

  it("prefers a tile that is not next to its own units under a splash attacker", () => {
    // A Bomb Chucker at (4, 2) reaches three tiles; (7, 2) is next to the
    // Fighter at (7, 1), (7, 4) is next to nobody.
    const state = bare(
      field(
        [
          { seat: 0, role: "FIGHTER", at: at(7, 1) },
          { seat: 0, role: "FIGHTER", at: at(8, 3) },
          { seat: 0, role: "FIGHTER", at: at(8, 8) },
          { seat: 1, role: "MARKSMAN", at: at(4, 2) },
          { seat: 1, role: "FIGHTER", at: at(2, 8) },
        ],
        { factions: ["ORIGINAL", "GOBLIN"] },
      ),
    );
    const view = viewForV7(state, seatIdV7(state, 0));
    const mover = unitAtV7(state, at(8, 3)).id;
    const beside = scoreCommandV7(view, move(mover, at(7, 2)));
    const apart = scoreCommandV7(view, move(mover, at(7, 4)));
    expect(beside.priority).toBe(apart.priority);
    expect(beside.strategicValue).toBeLessThan(apart.strategicValue);
  });

  it("does not step a Guard into the open in front of an enemy ranged unit, but into cover", () => {
    const open = bare(
      field([
        { seat: 0, role: "GUARD", at: at(7, 2) },
        { seat: 0, role: "FIGHTER", at: at(8, 2) },
        { seat: 0, role: "FIGHTER", at: at(8, 8) },
        { seat: 1, role: "MARKSMAN", at: at(3, 2) },
        { seat: 1, role: "FIGHTER", at: at(2, 8) },
      ]),
    );
    const guard = unitAtV7(open, at(7, 2)).id;
    const step = move(guard, at(6, 2));
    expect(
      scoreCommandV7(viewForV7(open, seatIdV7(open, 0)), step).priority,
    ).toBe(-1);
    // The same tile as a Forest (the seat has Forestry) is cover.
    const covered = forestV7(open, at(6, 2));
    expect(
      scoreCommandV7(viewForV7(covered, seatIdV7(covered, 0)), step).priority,
    ).toBeGreaterThanOrEqual(0);
    // A Fighter may take the open tile.
    const fighter = bare(
      field([
        { seat: 0, role: "FIGHTER", at: at(7, 2) },
        { seat: 0, role: "FIGHTER", at: at(8, 2) },
        { seat: 0, role: "FIGHTER", at: at(8, 8) },
        { seat: 1, role: "MARKSMAN", at: at(3, 2) },
        { seat: 1, role: "FIGHTER", at: at(2, 8) },
      ]),
    );
    expect(
      scoreCommandV7(
        viewForV7(fighter, seatIdV7(fighter, 0)),
        move(unitAtV7(fighter, at(7, 2)).id, at(6, 2)),
      ).priority,
    ).toBeGreaterThanOrEqual(0);
  });

  it("blows a Goblin up for two enemies or a kill, not for 5 damage on one", () => {
    const kaboom = (enemies: readonly GoblinPieceV7[]): number => {
      const state = bare(
        field(
          [
            { seat: 0, role: "FIGHTER", at: at(5, 2) },
            { seat: 0, role: "FIGHTER", at: at(8, 8) },
            ...enemies,
            { seat: 1, role: "FIGHTER", at: at(2, 8) },
          ],
          { factions: ["GOBLIN", "ORIGINAL"] },
        ),
      );
      return scoreCommandV7(viewForV7(state, seatIdV7(state, 0)), {
        kind: "KABOOM",
        unitId: unitAtV7(state, at(5, 2)).id,
      }).priority;
    };
    // One full-HP Guard: 5 damage, no kill.
    expect(kaboom([{ seat: 1, role: "GUARD", at: at(4, 2) }])).toBe(-1);
    // Two units in the blast.
    expect(
      kaboom([
        { seat: 1, role: "GUARD", at: at(4, 2) },
        { seat: 1, role: "MARKSMAN", at: at(4, 1) },
      ]),
    ).toBeGreaterThanOrEqual(0);
    // One unit it kills.
    expect(
      kaboom([{ seat: 1, role: "MARKSMAN", at: at(4, 2), hp: 5 }]),
    ).toBeGreaterThanOrEqual(0);
  });

  it("brings a unit alone among enemies back to the others", () => {
    const state = bare(
      field([
        { seat: 0, role: "FIGHTER", at: at(3, 4) },
        { seat: 0, role: "FIGHTER", at: at(8, 8) },
        { seat: 0, role: "FIGHTER", at: at(8, 7) },
        { seat: 1, role: "SWORDSMAN", at: at(1, 2) },
        { seat: 1, role: "SWORDSMAN", at: at(1, 3) },
        { seat: 1, role: "SWORDSMAN", at: at(1, 4) },
        { seat: 1, role: "FIGHTER", at: at(2, 8) },
      ]),
    );
    const lone = unitAtV7(state, at(3, 4)).id;
    const decision = chooseNormalCommandV7(
      viewForV7(state, seatIdV7(state, 0)),
    );
    const best = decision.candidates.find(
      ({ command }) => "unitId" in command && command.unitId === lone,
    );
    expect(best?.command.kind).toBe("MOVE");
    expect(best?.score.priority).toBe(705);
    const turn = policyTurn(state);
    const after = turn.state.units.find((unit) => unit.id === lone);
    if (after === undefined) throw new Error("no unit");
    expect(distance(after.at, at(8, 7))).toBeLessThan(5);
    expect(after.at.x).toBeGreaterThan(3);
  });

  it("brings a second unit to a center with an enemy at its gates, and keeps the garrison on it", () => {
    const state = bare(
      field([
        { seat: 0, role: "GUARD", at: at(8, 8) },
        { seat: 0, role: "GUARD", at: at(10, 5) },
        { seat: 1, role: "SWORDSMAN", at: at(6, 6) },
        { seat: 1, role: "SWORDSMAN", at: at(5, 6) },
        { seat: 1, role: "SWORDSMAN", at: at(6, 7) },
        { seat: 1, role: "FIGHTER", at: at(2, 8) },
      ]),
    );
    const own = seatIdV7(state, 0);
    const second = unitAtV7(state, at(10, 5)).id;
    const turn = policyTurn(state);
    expect(unitAtV7(turn.state, at(8, 8))).toMatchObject({
      ownerId: own,
      role: "GUARD",
    });
    const after = turn.state.units.find((unit) => unit.id === second);
    if (after === undefined) throw new Error("no unit");
    expect(distance(after.at, at(8, 8))).toBe(2);
    expect(
      turn.commands.find(
        (command) => command.kind === "MOVE" && command.unitId === second,
      ),
    ).toBeDefined();
  });
});

describe("an unseen attacker's damage reaches the victim's owner", () => {
  /**
   * Seat 1's Marksman at (5, 2), on a tile seat 0 has not explored,
   * shoots seat 0's Guard at (7, 2).
   */
  const shot = (guardHp: number) => {
    const state = unexploreV7(
      bare(
        fieldV7(
          [
            { seat: 0, role: "GUARD", at: at(7, 2), hp: guardHp },
            { seat: 0, role: "FIGHTER", at: at(8, 8) },
            { seat: 1, role: "MARKSMAN", at: at(5, 2) },
            { seat: 1, role: "FIGHTER", at: at(2, 8) },
          ],
          { factions: HUMANS, activeSeat: 1 },
        ),
      ),
      0,
      [at(5, 2)],
    );
    const victim = seatIdV7(state, 0);
    const shooter = seatIdV7(state, 1);
    const guard = unitAtV7(state, at(7, 2));
    const marksman = unitAtV7(state, at(5, 2));
    const result = applyOkV7(state, shooter, {
      kind: "ATTACK",
      unitId: marksman.id,
      targetUnitId: guard.id,
    });
    return { state, victim, shooter, guard, marksman, result };
  };

  it("as a hidden-source damage event with the amount, and nothing about the attacker", () => {
    const { state, victim, shooter, guard, marksman, result } = shot(17);
    // The victim does not see the Marksman before or after.
    expect(
      viewForV7(state, victim).units.some((unit) => unit.id === marksman.id),
    ).toBe(false);
    expect(
      viewForV7(result.state, victim).units.some(
        (unit) => unit.id === marksman.id,
      ),
    ).toBe(false);
    const seen = projectEventsV7(state, result.state, victim, result.events);
    expect(seen.events).toEqual([
      {
        kind: "COMBAT_SPLASH_DAMAGE",
        splash: [
          {
            unitId: guard.id,
            at: at(7, 2),
            damage: 6,
            dies: false,
            shieldDamage: 0,
          },
        ],
      },
    ]);
    expect(JSON.stringify(seen.events)).not.toContain(
      String(marksman.id * 1000),
    );
    // The browser shows the hit on the unit (its combat feedback).
    expect(
      corePresentationPlanV7(viewForV7(state, victim), seen),
    ).toContainEqual({
      kind: "DAMAGE",
      unitId: guard.id,
      at: at(7, 2),
      damage: 6,
      lethal: false,
      durationMs: 100,
    });
    // The resulting HP is in the victim's own view.
    expect(
      viewForV7(result.state, victim).units.find((unit) => unit.id === guard.id)
        ?.hp,
    ).toBe(11);
    // The attacker's owner still gets the whole combat.
    expect(
      projectEventsV7(state, result.state, shooter, result.events).events.map(
        (event) => event.kind,
      ),
    ).toContain("COMBAT_RESOLVED");
  });

  it("says that the unit died, before its death event", () => {
    const { state, victim, guard, result } = shot(3);
    const seen = projectEventsV7(state, result.state, victim, result.events);
    expect(seen.events.map((event) => event.kind)).toEqual([
      "COMBAT_SPLASH_DAMAGE",
      "UNIT_DIED",
    ]);
    expect(seen.events[0]).toMatchObject({
      splash: [{ unitId: guard.id, damage: 3, dies: true }],
    });
  });
});

describe("a reward unit leaves the garrison on its center", () => {
  it("appears on a free tile of the city next to the center", () => {
    const fixture = rewardStateV7("MILITIA", "ORIGINAL", [
      { role: "GUARD", at: at(8, 8) },
    ]);
    const own = seatIdV7(fixture.state, 0);
    const guard = unitAtV7(fixture.state, at(8, 8));
    const result = applyOkV7(fixture.state, own, fixture.command);
    expect(result.events.map((event) => event.kind)).not.toContain(
      "UNIT_SPAWN_DISPLACED",
    );
    // The Guard has not moved.
    expect(unitAtV7(result.state, at(8, 8)).id).toBe(guard.id);
    const granted = result.events.find(
      (event) => event.kind === "UNIT_REWARD_GRANTED",
    );
    if (granted?.kind !== "UNIT_REWARD_GRANTED") throw new Error("no unit");
    const fighter = result.state.units.find(
      (unit) => unit.id === granted.unitId,
    );
    // The first tile of the city's territory next to the center.
    expect(fighter).toMatchObject({ role: "FIGHTER", at: at(7, 7) });
    expect(parseGameStateV7(JSON.parse(JSON.stringify(result.state)))).toEqual(
      result.state,
    );
  });

  it("takes an empty center as before", () => {
    const fixture = rewardStateV7("MILITIA", "ORIGINAL");
    const result = applyOkV7(
      fixture.state,
      seatIdV7(fixture.state, 0),
      fixture.command,
    );
    expect(unitAtV7(result.state, at(8, 8)).role).toBe("FIGHTER");
  });

  it("displaces the garrison only when no tile next to the center is free", () => {
    const ring = [
      at(7, 7),
      at(8, 7),
      at(9, 7),
      at(7, 8),
      at(9, 8),
      at(7, 9),
      at(8, 9),
      at(9, 9),
    ];
    const fixture = rewardStateV7("MILITIA", "ORIGINAL", [
      { role: "GUARD", at: at(8, 8) },
    ]);
    const guard = unitAtV7(fixture.state, at(8, 8));
    // Eight more Guards on the eight tiles around the center.
    const crowded = checkedV7({
      ...fixture.state,
      nextEntityId: fixture.state.nextEntityId + ring.length,
      units: [
        ...fixture.state.units,
        ...ring.map((where, index) => ({
          ...guard,
          id: unitId(fixture.state.nextEntityId + index),
          at: where,
        })),
      ],
    });
    const result = applyOkV7(crowded, seatIdV7(crowded, 0), fixture.command);
    expect(result.events).toContainEqual(
      expect.objectContaining({
        kind: "UNIT_SPAWN_DISPLACED",
        displacedUnitId: guard.id,
        to: null,
      }),
    );
  });
});

describe("LAB_BREAKTHROUGH: numbers against a prepared line", () => {
  const LABS = [
    ["LAB_BREAKTHROUGH", "ORIGINAL"],
    ["LAB_BREAKTHROUGH_GOBLIN", "GOBLIN"],
    ["LAB_BREAKTHROUGH_UNDEAD", "UNDEAD"],
  ] as const;

  const lab = breakthroughLabV7;

  const value = (state: GameStateV7, owner: number): number =>
    state.units
      .filter((unit) => unit.ownerId === owner)
      .reduce(
        (total, unit) =>
          total +
          (effectiveRoleRuleV7(
            unit.role,
            state.players.find((player) => player.id === unit.ownerId)
              ?.faction ?? "ORIGINAL",
          ).cost ?? 0),
        0,
      );

  it("is one board with three attackers: a line of eight, shooters behind it, a walled capital, and twice its value in front of it", () => {
    for (const [id, faction] of LABS) {
      const state = lab(id);
      const player = state.humanPlayerId;
      const attacker = state.players.find((item) => item.id !== player);
      if (attacker === undefined) throw new Error(id);
      expect(attacker.faction, id).toBe(faction);
      expect(parseGameStateV7(JSON.parse(JSON.stringify(state))), id).toEqual(
        state,
      );
      // The line: Guards on the two Mountains and the two Field Defenses,
      // Swordsmen in the four Forests.
      const line = LAB_BREAKTHROUGH_LINE_V7.map((where) => ({
        unit: unitAtV7(state, where),
        tile: state.board.tiles[where.y * state.board.width + where.x],
      }));
      expect(line.map((entry) => entry.unit.role).join(" "), id).toBe(
        "GUARD SWORDSMAN GUARD SWORDSMAN SWORDSMAN GUARD SWORDSMAN GUARD",
      );
      for (const { unit, tile } of line) {
        expect(unit.ownerId, id).toBe(player);
        expect(
          unit.role === "SWORDSMAN"
            ? tile?.terrain === "FOREST"
            : tile?.terrain === "MOUNTAIN" || tile?.fieldDefense === true,
          id,
        ).toBe(true);
      }
      const own = state.units.filter((unit) => unit.ownerId === player);
      expect(own, id).toHaveLength(14);
      expect(
        own.filter((unit) => unit.role === "MARKSMAN"),
        id,
      ).toHaveLength(3);
      expect(
        own.filter((unit) => unit.role === "CATAPULT"),
        id,
      ).toHaveLength(2);
      const capital = state.cities.find(
        (city) =>
          city.at.x === LAB_BREAKTHROUGH_CAPITAL_V7.x &&
          city.at.y === LAB_BREAKTHROUGH_CAPITAL_V7.y,
      );
      expect(capital?.ownerId, id).toBe(player);
      expect(
        capital?.rewards.map((entry) => entry.reward),
        id,
      ).toContain("WALLS");
      expect(unitAtV7(state, LAB_BREAKTHROUGH_CAPITAL_V7).role, id).toBe(
        "GUARD",
      );
      // Twice the Coins of units (two and a half to three times in the
      // first draft of the labs), out of reach, and three level-4
      // cities against the player's three.
      const ratio = value(state, attacker.id) / value(state, player);
      // The ninth unit (`pulp_wars-w49.17`, 7r55; revision 3 of the lab):
      // the player's four Champions cost 6 Coins each (5), so its units
      // are worth 67 (63) and the unchanged Goblin and Undead attackers
      // 1.87 times that. The lab is re-staged to twice the value when the
      // Human faction is next played by hand; nothing was tuned here.
      expect(value(state, player), id).toBe(67);
      expect(ratio, id).toBeGreaterThanOrEqual(1.85);
      expect(ratio, id).toBeLessThanOrEqual(2.05);
      expect(
        state.cities
          .filter((city) => city.ownerId === attacker.id)
          .map((city) => city.level),
        id,
      ).toEqual([4, 4, 4]);
      for (const unit of state.units)
        if (unit.ownerId === attacker.id)
          expect(unit.at.x, id).toBeGreaterThanOrEqual(10);
      // The attacker has every unit of its roster, the dear ones included.
      const roles = new Set(
        state.units
          .filter((unit) => unit.ownerId === attacker.id)
          .map((unit) => unit.role),
      );
      for (const role of [
        "FIGHTER",
        "GUARD",
        "MARKSMAN",
        "CATAPULT",
        "KNIGHT",
        "RAIDER",
      ] as const)
        expect(roles.has(role), `${id} ${role}`).toBe(true);
    }
  });
});
