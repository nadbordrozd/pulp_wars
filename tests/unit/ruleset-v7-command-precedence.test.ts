import { describe, expect, it } from "vitest";
import {
  applyCommandV7,
  effectiveRoleRuleV7,
  queryPlayerCommandsV7,
  type CommandV7,
  type CoordV7,
  type GameStateV7,
  type PlayerId,
  type RuleErrorCodeV7,
  type UnitStateV7,
} from "../../src/engine/index";
import { checkedV7, exploredAllV7, initialV7 } from "../fixtures/v7-builders";

const READY: UnitStateV7["activation"] = {
  moved: false,
  movedPathLength: 0,
  attacked: false,
  attacksUsed: 0,
  healed: false,
  recovered: false,
  captured: false,
  handled: false,
  specialActed: false,
};

describe("ruleset-7 mandatory reward and Horse Archer command precedence", () => {
  it("accepts either offered reward without consuming the remaining shot", () => {
    const fixture = precedenceFixture(2);
    const activation = horse(fixture.state, fixture).activation;
    const offered = queryPlayerCommandsV7(fixture.state, fixture.actor);
    expect(offered).toEqual([
      {
        kind: "CHOOSE_CITY_REWARD",
        cityId: fixture.cityId,
        reachedLevel: 2,
        reward: "SURVEY",
      },
      {
        kind: "CHOOSE_CITY_REWARD",
        cityId: fixture.cityId,
        reachedLevel: 2,
        reward: "STOCKPILE",
      },
    ]);
    for (const command of offered) {
      const result = applyCommandV7(fixture.state, fixture.actor, command);
      expect(result.accepted).toBe(true);
      if (!result.accepted) continue;
      expect(horse(result.state, fixture).activation).toEqual(activation);
      expect(result.state.pendingChoices).toEqual([]);
      expect(queryPlayerCommandsV7(result.state, fixture.actor)).toContainEqual(
        {
          kind: "ATTACK",
          unitId: fixture.horseArcherId,
          targetUnitId: fixture.targetId,
        },
      );
      expect(
        queryPlayerCommandsV7(result.state, fixture.actor).some(
          (candidate) =>
            candidate.kind === "WAIT" &&
            candidate.unitId === fixture.otherUnitId,
        ),
      ).toBe(true);
    }
  });

  it("rejects malformed or mismatched rewards atomically and blocks all other commands", () => {
    const fixture = precedenceFixture(2);
    const enemyCityId = required(
      fixture.state.cities.find((city) => city.ownerId !== fixture.actor),
      "Enemy city missing",
    ).id;
    const invalidReward = {
      kind: "CHOOSE_CITY_REWARD",
      cityId: fixture.cityId,
      reachedLevel: 2,
      reward: "NOT_A_REWARD",
    } as unknown as CommandV7;
    const cases: readonly { command: CommandV7; code: RuleErrorCodeV7 }[] = [
      { command: invalidReward, code: "INVALID_COMMAND" },
      {
        command: {
          kind: "CHOOSE_CITY_REWARD",
          cityId: enemyCityId,
          reachedLevel: 2,
          reward: "SURVEY",
        },
        code: "PENDING_CHOICE",
      },
      {
        command: {
          kind: "CHOOSE_CITY_REWARD",
          cityId: fixture.cityId,
          reachedLevel: 3,
          reward: "SURVEY",
        },
        code: "CITY_REWARD_MISMATCH",
      },
      {
        command: {
          kind: "CHOOSE_CITY_REWARD",
          cityId: fixture.cityId,
          reachedLevel: 2,
          reward: "WALLS",
        },
        code: "CITY_REWARD_MISMATCH",
      },
      {
        command: {
          kind: "ATTACK",
          unitId: fixture.horseArcherId,
          targetUnitId: fixture.targetId,
        },
        code: "PENDING_CHOICE",
      },
      { command: { kind: "END_TURN" }, code: "PENDING_CHOICE" },
    ];
    for (const { command, code } of cases) {
      const before = JSON.stringify(fixture.state);
      const result = applyCommandV7(fixture.state, fixture.actor, command);
      expect(result).toMatchObject({
        accepted: false,
        state: fixture.state,
        events: [],
        error: { code },
      });
      expect(result.state).toBe(fixture.state);
      expect(JSON.stringify(result.state)).toBe(before);
    }
  });

  it("keeps canonical reward order blocking until the queue drains", () => {
    const fixture = precedenceFixture(3);
    const activation = horse(fixture.state, fixture).activation;
    const first = applyCommandV7(fixture.state, fixture.actor, {
      kind: "CHOOSE_CITY_REWARD",
      cityId: fixture.cityId,
      reachedLevel: 2,
      reward: "STOCKPILE",
    });
    if (!first.accepted) throw new Error(first.error.code);
    expect(queryPlayerCommandsV7(first.state, fixture.actor)).toEqual([
      {
        kind: "CHOOSE_CITY_REWARD",
        cityId: fixture.cityId,
        reachedLevel: 3,
        reward: "WALLS",
      },
      {
        kind: "CHOOSE_CITY_REWARD",
        cityId: fixture.cityId,
        reachedLevel: 3,
        reward: "MILITIA",
      },
    ]);
    expect(horse(first.state, fixture).activation).toEqual(activation);

    const final = applyCommandV7(first.state, fixture.actor, {
      kind: "CHOOSE_CITY_REWARD",
      cityId: fixture.cityId,
      reachedLevel: 3,
      reward: "MILITIA",
    });
    if (!final.accepted) throw new Error(final.error.code);
    expect(final.state.pendingChoices).toEqual([]);
    expect(horse(final.state, fixture).activation).toEqual(activation);
    const militia = final.state.units.find(
      (unit) =>
        !first.state.units.some((candidate) => candidate.id === unit.id),
    );
    expect(militia).toMatchObject({
      role: "FIGHTER",
      activation: {
        moved: true,
        attacked: true,
        attacksUsed: 1,
        handled: true,
        specialActed: true,
      },
    });
    expect(queryPlayerCommandsV7(final.state, fixture.actor)).toContainEqual({
      kind: "ATTACK",
      unitId: fixture.horseArcherId,
      targetUnitId: fixture.targetId,
    });
  });
});

interface PrecedenceFixture {
  readonly state: GameStateV7;
  readonly actor: PlayerId;
  readonly cityId: GameStateV7["cities"][number]["id"];
  readonly horseArcherId: UnitStateV7["id"];
  readonly targetId: UnitStateV7["id"];
  readonly otherUnitId: UnitStateV7["id"];
}

function precedenceFixture(cityLevel: 2 | 3): PrecedenceFixture {
  const base = exploredAllV7(initialV7());
  const actor = base.humanPlayerId;
  const enemy = required(
    base.players.find((player) => player.id !== actor),
    "Enemy player missing",
  ).id;
  const city = required(
    base.cities.find((candidate) => candidate.ownerId === actor),
    "Owned city missing",
  );
  const horseArcherId = required(
    base.units.find((unit) => unit.ownerId === actor),
    "Owned unit missing",
  ).id;
  const targetId = required(
    base.units.find((unit) => unit.ownerId === enemy),
    "Enemy unit missing",
  ).id;
  const otherUnitId = base.nextEntityId as UnitStateV7["id"];
  const horseAt = { x: 2, y: 5 };
  const targetAt = { x: 4, y: 5 };
  const otherAt = { x: 2, y: 8 };
  const permanentPopulation = cityLevel === 2 ? 2 : 5;
  const contributions: GameStateV7["populationContributions"] = base.board.tiles
    .filter((tile) => tile.territoryCityId === city.id)
    .slice(0, permanentPopulation)
    .map((tile, index) => ({
      id: base.nextEntityId + 1 + index,
      cityId: city.id,
      category: "PERMANENT" as const,
      amount: 1,
      source: {
        kind: "RESOURCE_ACTION" as const,
        action: "HARVEST_FRUIT" as const,
        at: tile.at,
      },
    }));
  const horseArcher = makeUnit(
    horseArcherId,
    actor,
    "HORSE_ARCHER",
    horseAt,
    city.id,
    { ...READY, attacked: true, attacksUsed: 1 },
  );
  const target = makeUnit(targetId, enemy, "GUARD", targetAt);
  const other = makeUnit(otherUnitId, actor, "FIGHTER", otherAt, city.id);
  const occupied = [horseAt, targetAt, otherAt];
  const state = checkedV7({
    ...base,
    nextEntityId: base.nextEntityId + 1 + permanentPopulation,
    cities: base.cities.map((candidate) =>
      candidate.id === city.id
        ? {
            ...candidate,
            level: cityLevel,
            permanentPopulation,
            economicPopulation: 0,
            population: 0,
            expanded: false,
            rewards: [],
          }
        : candidate,
    ),
    populationContributions: contributions,
    pendingChoices: [
      {
        kind: "CITY_REWARD",
        cityId: city.id,
        reachedLevel: 2,
        candidates: ["SURVEY", "STOCKPILE"],
      },
    ],
    treasureChests: base.treasureChests.filter(
      (at) => !occupied.some((candidate) => same(candidate, at)),
    ),
    units: [horseArcher, target, other].sort(
      (left, right) => left.id - right.id,
    ),
    board: {
      ...base.board,
      tiles: base.board.tiles.map((tile) =>
        occupied.some((at) => same(at, tile.at))
          ? {
              ...tile,
              terrain: "GRASS" as const,
              resource: null,
              improvement: null,
              site: null,
            }
          : tile,
      ),
    },
  });
  return {
    state,
    actor,
    cityId: city.id,
    horseArcherId,
    targetId,
    otherUnitId,
  };
}

function makeUnit(
  id: UnitStateV7["id"],
  ownerId: PlayerId,
  role: "FIGHTER" | "GUARD" | "HORSE_ARCHER",
  at: CoordV7,
  homeCityId: UnitStateV7["homeCityId"] = null,
  activation: UnitStateV7["activation"] = READY,
): UnitStateV7 {
  const rule = effectiveRoleRuleV7(role);
  return {
    id,
    ownerId,
    homeCityId,
    role,
    at,
    hp: rule.maxHp,
    maxHp: rule.maxHp,
    kills: 0,
    veteran: false,
    captureEligible: false,
    activation,
    blackoutEligibleRound: null,
  };
}

function horse(state: GameStateV7, fixture: PrecedenceFixture): UnitStateV7 {
  return required(
    state.units.find((unit) => unit.id === fixture.horseArcherId),
    "Horse Archer missing",
  );
}

function same(left: CoordV7, right: CoordV7): boolean {
  return left.x === right.x && left.y === right.y;
}

function required<T>(value: T | undefined, message: string): T {
  if (value === undefined) throw new Error(message);
  return value;
}
