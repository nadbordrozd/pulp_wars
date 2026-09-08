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
  pursuitPhase: "NONE",
  healed: false,
  recovered: false,
  captured: false,
  handled: false,
  specialActed: false,
};

type OpenPursuitPhase = Extract<
  UnitStateV7["activation"]["pursuitPhase"],
  "PURSUIT_READY" | "PURSUIT_MOVED"
>;

describe("ruleset-7 mandatory reward and Pursuit command precedence", () => {
  it.each(["PURSUIT_READY", "PURSUIT_MOVED"] as const)(
    "accepts every offered reward without consuming an open %s sequence",
    (phase) => {
      const fixture = precedenceFixture(phase, 2);
      const activation = required(
        fixture.state.units.find((unit) => unit.id === fixture.lancerId),
        "Lancer missing",
      ).activation;
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
        expect(result.accepted, JSON.stringify(command)).toBe(true);
        if (!result.accepted) continue;
        expect(
          result.state.units.find((unit) => unit.id === fixture.lancerId)
            ?.activation,
        ).toEqual(activation);
        expect(result.state.pendingChoices).toEqual([]);
        expectPursuitCommands(result.state, fixture, phase);
        expect(
          applyCommandV7(result.state, fixture.actor, {
            kind: "WAIT",
            unitId: fixture.otherUnitId,
          }),
        ).toMatchObject({
          accepted: false,
          error: { code: "PURSUIT_MUST_END" },
        });
      }
    },
  );

  it("rejects malformed or mismatched rewards atomically and blocks all other commands", () => {
    const fixture = precedenceFixture("PURSUIT_READY", 2);
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
    const cases: readonly {
      command: CommandV7;
      code: RuleErrorCodeV7;
    }[] = [
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
        command: { kind: "END_PURSUIT", unitId: fixture.lancerId },
        code: "PENDING_CHOICE",
      },
      {
        command: {
          kind: "ATTACK",
          unitId: fixture.lancerId,
          targetUnitId: fixture.targetId,
        },
        code: "PENDING_CHOICE",
      },
      { command: { kind: "END_TURN" }, code: "PENDING_CHOICE" },
    ];

    for (const { command, code } of cases) {
      const serializedBefore = JSON.stringify(fixture.state);
      const result = applyCommandV7(fixture.state, fixture.actor, command);
      expect(result).toMatchObject({
        accepted: false,
        state: fixture.state,
        events: [],
        error: { code },
      });
      expect(result.state).toBe(fixture.state);
      expect(JSON.stringify(result.state)).toBe(serializedBefore);
    }
  });

  it.each(["PURSUIT_READY", "PURSUIT_MOVED"] as const)(
    "keeps canonical reward order blocking until the queue drains, then resumes %s",
    (phase) => {
      const fixture = precedenceFixture(phase, 3);
      const activation = required(
        fixture.state.units.find((unit) => unit.id === fixture.lancerId),
        "Lancer missing",
      ).activation;
      const first = applyCommandV7(fixture.state, fixture.actor, {
        kind: "CHOOSE_CITY_REWARD",
        cityId: fixture.cityId,
        reachedLevel: 2,
        reward: "STOCKPILE",
      });
      expect(first.accepted).toBe(true);
      if (!first.accepted) return;

      expect(first.state.pendingChoices).toEqual([
        {
          kind: "CITY_REWARD",
          cityId: fixture.cityId,
          reachedLevel: 3,
          candidates: ["WALLS", "MILITIA"],
        },
      ]);
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
      expect(
        first.state.units.find((unit) => unit.id === fixture.lancerId)
          ?.activation,
      ).toEqual(activation);
      expect(
        applyCommandV7(first.state, fixture.actor, {
          kind: "END_PURSUIT",
          unitId: fixture.lancerId,
        }),
      ).toMatchObject({
        accepted: false,
        state: first.state,
        events: [],
        error: { code: "PENDING_CHOICE" },
      });

      const final = applyCommandV7(first.state, fixture.actor, {
        kind: "CHOOSE_CITY_REWARD",
        cityId: fixture.cityId,
        reachedLevel: 3,
        reward: "MILITIA",
      });
      expect(final.accepted).toBe(true);
      if (!final.accepted) return;
      expect(final.state.pendingChoices).toEqual([]);
      expect(
        final.state.cities.find((city) => city.id === fixture.cityId)?.rewards,
      ).toEqual([
        { reachedLevel: 2, reward: "STOCKPILE" },
        { reachedLevel: 3, reward: "MILITIA" },
      ]);
      expect(
        final.state.units.find((unit) => unit.id === fixture.lancerId)
          ?.activation,
      ).toEqual(activation);
      const militia = final.state.units.find(
        (unit) =>
          !first.state.units.some((candidate) => candidate.id === unit.id),
      );
      expect(militia).toMatchObject({
        ownerId: fixture.actor,
        homeCityId: fixture.cityId,
        role: "FIGHTER",
        activation: {
          moved: true,
          movedPathLength: 0,
          attacked: true,
          attacksUsed: 1,
          pursuitPhase: "NONE",
          healed: true,
          recovered: true,
          captured: true,
          handled: true,
          specialActed: true,
        },
      });
      expectPursuitCommands(final.state, fixture, phase);

      const ended = applyCommandV7(final.state, fixture.actor, {
        kind: "END_PURSUIT",
        unitId: fixture.lancerId,
      });
      expect(ended.accepted).toBe(true);
      if (!ended.accepted) return;
      expect(
        ended.state.units.find((unit) => unit.id === fixture.lancerId)
          ?.activation,
      ).toMatchObject({ pursuitPhase: "NONE", attacked: true, handled: true });
      expect(queryPlayerCommandsV7(ended.state, fixture.actor)).toContainEqual({
        kind: "END_TURN",
      });
    },
  );

  it("retains the ordinary Pursuit lock when no reward is pending", () => {
    const fixture = precedenceFixture("PURSUIT_READY", 2);
    const rewarded = applyCommandV7(fixture.state, fixture.actor, {
      kind: "CHOOSE_CITY_REWARD",
      cityId: fixture.cityId,
      reachedLevel: 2,
      reward: "SURVEY",
    });
    if (!rewarded.accepted) throw new Error(rewarded.error.code);

    const rejected = applyCommandV7(rewarded.state, fixture.actor, {
      kind: "END_TURN",
    });
    expect(rejected).toMatchObject({
      accepted: false,
      state: rewarded.state,
      events: [],
      error: { code: "PURSUIT_MUST_END" },
    });
    expect(rejected.state).toBe(rewarded.state);
  });
});

interface PrecedenceFixture {
  readonly state: GameStateV7;
  readonly actor: PlayerId;
  readonly cityId: GameStateV7["cities"][number]["id"];
  readonly lancerId: UnitStateV7["id"];
  readonly targetId: UnitStateV7["id"];
  readonly otherUnitId: UnitStateV7["id"];
}

function precedenceFixture(
  phase: OpenPursuitPhase,
  cityLevel: 2 | 3,
): PrecedenceFixture {
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
  const lancerId = required(
    base.units.find((unit) => unit.ownerId === actor),
    "Owned unit missing",
  ).id;
  const targetId = required(
    base.units.find((unit) => unit.ownerId === enemy),
    "Enemy unit missing",
  ).id;
  const otherUnitId = base.nextEntityId as UnitStateV7["id"];
  const lancerAt = { x: 2, y: 5 };
  const targetAt = { x: 3, y: 5 };
  const otherAt = { x: 2, y: 8 };
  const permanentPopulation = cityLevel === 2 ? 2 : 5;
  const populationTiles = base.board.tiles
    .filter((tile) => tile.territoryCityId === city.id)
    .slice(0, permanentPopulation);
  if (populationTiles.length !== permanentPopulation)
    throw new Error("insufficient city population coordinates");
  const contributions: GameStateV7["populationContributions"] =
    populationTiles.map((tile, index) => ({
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
  const lancer = makeUnit(lancerId, actor, "LANCER", lancerAt, city.id, {
    ...READY,
    attacksUsed: 1,
    pursuitPhase: phase,
  });
  const target = makeUnit(targetId, enemy, "FIGHTER", targetAt);
  const other = makeUnit(otherUnitId, actor, "FIGHTER", otherAt, city.id);
  const occupied = [lancerAt, targetAt, otherAt];
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
    units: [lancer, target, other].sort((left, right) => left.id - right.id),
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
  return { state, actor, cityId: city.id, lancerId, targetId, otherUnitId };
}

function makeUnit(
  id: UnitStateV7["id"],
  ownerId: PlayerId,
  role: "FIGHTER" | "LANCER",
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

function expectPursuitCommands(
  state: GameStateV7,
  fixture: PrecedenceFixture,
  phase: OpenPursuitPhase,
): void {
  const commands = queryPlayerCommandsV7(state, fixture.actor);
  expect(new Set(commands.map((command) => command.kind))).toEqual(
    phase === "PURSUIT_READY"
      ? new Set(["ATTACK", "PURSUE", "END_PURSUIT"])
      : new Set(["ATTACK", "END_PURSUIT"]),
  );
  expect(
    commands.every(
      (command) => "unitId" in command && command.unitId === fixture.lancerId,
    ),
  ).toBe(true);
}

function same(left: CoordV7, right: CoordV7): boolean {
  return left.x === right.x && left.y === right.y;
}

function required<T>(value: T | undefined, message: string): T {
  if (value === undefined) throw new Error(message);
  return value;
}
