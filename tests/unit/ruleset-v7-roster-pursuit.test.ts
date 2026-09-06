/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { describe, expect, it } from "vitest";
import {
  applyCommandV7,
  calculateCombatPreviewV7,
  createInitialMapStateV7,
  createReplayV7,
  effectiveRoleRuleV7,
  movementStepCost2V7,
  nextBounded,
  queryCombatPreviewV7,
  queryPlayerCommandsV7,
  queryPursuitPreviewV7,
  queryThreatenedTilesV7,
  queryUnitStatsV7,
  parseGameStateV7,
  appendReplayCommandV7,
  runReplayV7,
  validateMovementPathV7,
  type CoordV7,
  type GameStateV7,
  type UnitRoleIdV7,
  type UnitStateV7,
  type CommandV7,
} from "../../src/engine/index";
import { createSaveEnvelopeV7, parseSaveV7 } from "../../src/persistence/v7";
import {
  allTechsV7,
  checkedV7,
  exploredAllV7,
  initialV7,
  setupV7,
} from "../fixtures/v7-builders";

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

describe("ruleset-7 conventional roster, movement, combat, and Pursuit", () => {
  it("enforces Catapult minimum range identically in commands, previews, and retaliation", () => {
    const state = battle("CATAPULT", "FIGHTER", { x: 2, y: 2 }, { x: 4, y: 2 });
    const [catapult, fighter] = state.units;
    expect(
      applyCommandV7(state, state.humanPlayerId, {
        kind: "ATTACK",
        unitId: catapult!.id,
        targetUnitId: fighter!.id,
      }).accepted,
    ).toBe(true);
    const preview = queryCombatPreviewV7(
      state,
      state.humanPlayerId,
      catapult!.id,
      fighter!.id,
    );
    expect(preview).toEqual(
      calculateCombatPreviewV7(state, catapult!.id, fighter!.id),
    );
    expect(preview).toMatchObject({ minimumRange: 2, maximumRange: 3 });

    const adjacent = battle(
      "CATAPULT",
      "FIGHTER",
      { x: 2, y: 2 },
      { x: 3, y: 2 },
    );
    const [closeCatapult, closeFighter] = adjacent.units;
    const rejected = applyCommandV7(adjacent, adjacent.humanPlayerId, {
      kind: "ATTACK",
      unitId: closeCatapult!.id,
      targetUnitId: closeFighter!.id,
    });
    expect(rejected).toMatchObject({
      accepted: false,
      error: { code: "TARGET_OUT_OF_RANGE" },
    });
    expect(
      queryCombatPreviewV7(
        adjacent,
        adjacent.humanPlayerId,
        closeCatapult!.id,
        closeFighter!.id,
      ),
    ).toBeNull();

    const counter = battle(
      "FIGHTER",
      "CATAPULT",
      { x: 2, y: 2 },
      { x: 3, y: 2 },
    );
    const counterPreview = calculateCombatPreviewV7(
      counter,
      counter.units[0]!.id,
      counter.units[1]!.id,
    );
    expect(counterPreview).toMatchObject({
      retaliation: false,
      damageToAttacker: 0,
      noRetaliationReason: "OUT_OF_RANGE",
    });
  });

  it("applies ordinary role restrictions, Charge, Breach, Push, and ranged advance", () => {
    const charged = battle(
      "RAIDER",
      "GUARD",
      { x: 2, y: 2 },
      { x: 3, y: 2 },
      {
        attackerActivation: { ...READY, moved: true, movedPathLength: 2 },
      },
    );
    expect(
      calculateCombatPreviewV7(
        charged,
        charged.units[0]!.id,
        charged.units[1]!.id,
      ),
    ).toMatchObject({ attack2: 6, chargeApplied: true });

    const breach = battle(
      "BREACHER",
      "GUARD",
      { x: 2, y: 2 },
      { x: 3, y: 2 },
      {
        defenderTerrain: "FOREST",
      },
    );
    expect(
      calculateCombatPreviewV7(
        breach,
        breach.units[0]!.id,
        breach.units[1]!.id,
      ),
    ).toMatchObject({
      breachApplied: true,
      defenseBonusNumerator: 1,
      defenseBonusDenominator: 1,
    });

    const push = battle("HEAVY", "GUARD", { x: 2, y: 2 }, { x: 3, y: 2 });
    const pushed = applyCommandV7(push, push.humanPlayerId, {
      kind: "ATTACK",
      unitId: push.units[0]!.id,
      targetUnitId: push.units[1]!.id,
    });
    expect(pushed.accepted).toBe(true);
    if (!pushed.accepted) return;
    expect(pushed.events).toContainEqual({
      kind: "UNIT_PUSHED",
      sourceUnitId: push.units[0]!.id,
      targetUnitId: push.units[1]!.id,
      from: { x: 3, y: 2 },
      to: { x: 4, y: 2 },
    });

    const marksman = battle(
      "MARKSMAN",
      "FIGHTER",
      { x: 2, y: 2 },
      { x: 4, y: 2 },
      {
        defenderHp: 1,
      },
    );
    expect(
      calculateCombatPreviewV7(
        marksman,
        marksman.units[0]!.id,
        marksman.units[1]!.id,
      ).advances,
    ).toBe(false);

    const envoy = battle("ENVOY", "FIGHTER", { x: 2, y: 2 }, { x: 3, y: 2 });
    expect(
      applyCommandV7(envoy, envoy.humanPlayerId, {
        kind: "ATTACK",
        unitId: envoy.units[0]!.id,
        targetUnitId: envoy.units[1]!.id,
      }),
    ).toMatchObject({ accepted: false, error: { code: "ATTACK_NOT_LEGAL" } });

    const movedGuard = battle(
      "GUARD",
      "FIGHTER",
      { x: 2, y: 2 },
      { x: 3, y: 2 },
      { attackerActivation: { ...READY, moved: true, movedPathLength: 1 } },
    );
    expect(
      applyCommandV7(movedGuard, movedGuard.humanPlayerId, {
        kind: "ATTACK",
        unitId: movedGuard.units[0]!.id,
        targetUnitId: movedGuard.units[1]!.id,
      }),
    ).toMatchObject({
      accepted: false,
      error: { code: "UNIT_ALREADY_ACTED" },
    });
  });

  it("uses exact movement budgets, connected Road discounts, terrain stops, and Surveying", () => {
    const base = battle("SCOUT", "FIGHTER", { x: 2, y: 2 }, { x: 9, y: 9 });
    const withoutSurveying = checkedV7({
      ...base,
      players: base.players.map((player) =>
        player.id === base.humanPlayerId
          ? {
              ...player,
              researchedTechs: player.researchedTechs.filter(
                (tech) =>
                  ![
                    "SURVEYING",
                    "MINING",
                    "METALLURGY",
                    "QUARRYING",
                    "MASONRY",
                  ].includes(tech),
              ),
            }
          : player,
      ),
      board: patchTiles(base, [
        [
          { x: 3, y: 2 },
          { terrain: "MOUNTAIN", resource: null },
        ],
      ]),
    });
    expect(
      validateMovementPathV7(withoutSurveying, withoutSurveying.units[0]!, [
        { x: 3, y: 2 },
      ]),
    ).toEqual({ legal: false, reason: "SURVEYING_REQUIRED" });
    const withSurveying = checkedV7({
      ...withoutSurveying,
      players: base.players,
    });
    const mountain = validateMovementPathV7(
      withSurveying,
      withSurveying.units[0]!,
      [{ x: 3, y: 2 }],
    );
    expect(mountain).toMatchObject({ legal: true, stopped: true });

    const roadState = checkedV7({
      ...base,
      board: patchTiles(base, [
        [{ x: 8, y: 8 }, { road: false }],
        [
          { x: 7, y: 8 },
          { road: true, territoryCityId: base.cities[0]!.id },
        ],
      ]),
    });
    const human = roadState.players.find(
      (player) => player.id === roadState.humanPlayerId,
    )!;
    expect(
      movementStepCost2V7(roadState, human, roadState.cities[0]!.at, {
        x: 7,
        y: 8,
      }),
    ).toBe(1);

    const lancerBase = battle(
      "LANCER",
      "FIGHTER",
      { x: 2, y: 4 },
      { x: 9, y: 9 },
    );
    const lancer = checkedV7({
      ...lancerBase,
      board: patchTiles(
        lancerBase,
        [3, 4, 5].map(
          (x) =>
            [
              { x, y: 4 },
              { terrain: "GRASS", resource: null, improvement: null },
            ] as const,
        ),
      ),
    });
    expect(
      validateMovementPathV7(lancer, lancer.units[0]!, [
        { x: 3, y: 4 },
        { x: 4, y: 4 },
        { x: 5, y: 4 },
      ]),
    ).toMatchObject({ legal: true, spentPoints2: 6 });
  });

  it("captures treasure with one draw, deterministic Heavy placement, and spawned sight", () => {
    let seed = 0;
    while (
      nextBounded({ algorithm: "MULBERRY32", version: 1, state: seed }, 2)
        .value !== 1
    )
      seed += 1;
    let state = battle("FIGHTER", "FIGHTER", { x: 1, y: 1 }, { x: 9, y: 9 });
    state = checkedV7({
      ...state,
      random: { ...state.random, state: seed },
      treasureChests: [{ x: 2, y: 1 }],
      players: state.players.map((player) =>
        player.id === state.humanPlayerId
          ? { ...player, explored: [{ x: 1, y: 1 }] }
          : player,
      ),
      board: patchTiles(state, [
        [
          { x: 2, y: 1 },
          { terrain: "GRASS", resource: null, improvement: null, site: null },
        ],
      ]),
    });
    const expectedRandom = nextBounded(state.random, 2).random;
    const result = applyCommandV7(state, state.humanPlayerId, {
      kind: "MOVE",
      unitId: state.units[0]!.id,
      path: [{ x: 2, y: 1 }],
    });
    expect(result.accepted).toBe(true);
    if (!result.accepted) return;
    expect(result.state.random).toEqual(expectedRandom);
    expect(result.state.treasureChests).toEqual([]);
    expect(result.state.units.some((unit) => unit.role === "HEAVY")).toBe(true);
    expect(result.events).toContainEqual(
      expect.objectContaining({
        kind: "TREASURE_CAPTURED",
        requestedReward: "HEAVY",
        grantedReward: "HEAVY",
        heavyFallback: false,
      }),
    );
    expect(
      result.state.players
        .find((player) => player.id === state.humanPlayerId)!
        .explored.some((at) => at.x === 0 && at.y === 0),
    ).toBe(true);
  });

  it("supports Heal, Recover, Wait, Promote, stat attribution, and automatic recovery", () => {
    let state = battle("MEDIC", "FIGHTER", { x: 2, y: 2 }, { x: 9, y: 9 });
    const target = makeUnit(
      state,
      state.nextEntityId,
      state.humanPlayerId,
      "FIGHTER",
      { x: 3, y: 2 },
      3,
    );
    state = checkedV7({
      ...state,
      nextEntityId: state.nextEntityId + 1,
      units: [...state.units, target].sort((a, b) => a.id - b.id),
    });
    const healed = applyCommandV7(state, state.humanPlayerId, {
      kind: "HEAL_ADJACENT",
      unitId: state.units[0]!.id,
      targetUnitId: target.id,
    });
    expect(
      healed.accepted &&
        healed.state.units.find((unit) => unit.id === target.id)?.hp,
    ).toBe(9);

    const promotedState = checkedV7({
      ...state,
      units: state.units.map((unit) =>
        unit.id === target.id ? { ...unit, kills: 3 } : unit,
      ),
    });
    const promoted = applyCommandV7(promotedState, state.humanPlayerId, {
      kind: "PROMOTE",
      unitId: target.id,
    });
    expect(
      promoted.accepted &&
        promoted.state.units.find((unit) => unit.id === target.id),
    ).toMatchObject({ veteran: true, hp: 8, maxHp: 15 });
    if (promoted.accepted) {
      const stats = queryUnitStatsV7(promoted.state, target.id);
      expect(stats?.stats.map((stat) => stat.id)).toEqual([
        "HP",
        "ATTACK",
        "DEFENSE",
        "MOVE",
        "RANGE",
        "SIGHT",
      ]);
      expect(stats?.stats[0]?.modifiers[0]?.source).toBe("PROMOTION");
    }

    const waited = applyCommandV7(state, state.humanPlayerId, {
      kind: "WAIT",
      unitId: target.id,
    });
    expect(
      waited.accepted &&
        waited.state.units.find((unit) => unit.id === target.id)?.activation
          .handled,
    ).toBe(true);
    const recovered = applyCommandV7(
      waited.accepted ? waited.state : state,
      state.humanPlayerId,
      { kind: "RECOVER", unitId: target.id },
    );
    expect(
      recovered.accepted &&
        recovered.state.units.find((unit) => unit.id === target.id)?.hp,
    ).toBe(5);

    const idleBase = allTechsV7(initialV7());
    const idleUnit = idleBase.units.find(
      (unit) => unit.ownerId === idleBase.humanPlayerId,
    )!;
    const idle = checkedV7({
      ...idleBase,
      units: idleBase.units.map((unit) =>
        unit.id === idleUnit.id ? { ...unit, hp: 4 } : unit,
      ),
    });
    const ended = applyCommandV7(idle, idle.humanPlayerId, {
      kind: "END_TURN",
    });
    expect(
      ended.accepted &&
        ended.state.units.find((unit) => unit.id === idleUnit.id)?.hp,
    ).toBe(10);
    expect(ended.accepted && ended.events).toContainEqual({
      kind: "UNIT_RECOVERED",
      unitId: idleUnit.id,
      amount: 6,
      automatic: true,
    });
  });

  it("runs the bounded three-attack Pursuit state machine with no side doors", () => {
    let state = battle(
      "LANCER",
      "FIGHTER",
      { x: 2, y: 5 },
      { x: 3, y: 5 },
      { defenderHp: 1 },
    );
    const enemy = state.players.find(
      (player) => player.id !== state.humanPlayerId,
    )!;
    const second = makeUnit(
      state,
      state.nextEntityId,
      enemy.id,
      "FIGHTER",
      { x: 5, y: 5 },
      1,
    );
    const third = makeUnit(
      state,
      state.nextEntityId + 1,
      enemy.id,
      "FIGHTER",
      { x: 7, y: 5 },
      1,
    );
    state = checkedV7({
      ...state,
      nextEntityId: state.nextEntityId + 2,
      treasureChests: [],
      units: [...state.units, second, third].sort((a, b) => a.id - b.id),
      board: patchTiles(
        state,
        [2, 3, 4, 5, 6, 7].map(
          (x) =>
            [
              { x, y: 5 },
              {
                terrain: "GRASS",
                resource: null,
                improvement: null,
                site: null,
              },
            ] as const,
        ),
      ),
    });
    const lancerId = state.units.find(
      (unit) => unit.ownerId === state.humanPlayerId,
    )!.id;
    const firstId = state.units.find(
      (unit) => unit.ownerId === enemy.id && unit.at.x === 3,
    )!.id;
    const first = applyCommandV7(state, state.humanPlayerId, {
      kind: "ATTACK",
      unitId: lancerId,
      targetUnitId: firstId,
    });
    expect(first.accepted).toBe(true);
    if (!first.accepted) return;
    expect(
      first.state.units.find((unit) => unit.id === lancerId)?.activation,
    ).toMatchObject({
      attacksUsed: 1,
      pursuitPhase: "PURSUIT_READY",
      attacked: false,
      handled: false,
    });
    expect(parseGameStateV7(JSON.parse(JSON.stringify(first.state)))).toEqual(
      first.state,
    );
    expect(
      applyCommandV7(first.state, state.humanPlayerId, {
        kind: "WAIT",
        unitId: lancerId,
      }),
    ).toMatchObject({ accepted: false, error: { code: "PURSUIT_MUST_END" } });
    expect(
      queryPursuitPreviewV7(first.state, state.humanPlayerId, lancerId)
        ?.attacksRemaining,
    ).toBe(2);

    const pursueOne = applyCommandV7(first.state, state.humanPlayerId, {
      kind: "PURSUE",
      unitId: lancerId,
      path: [{ x: 4, y: 5 }],
    });
    expect(pursueOne.accepted).toBe(true);
    if (!pursueOne.accepted) return;
    expect(
      pursueOne.state.units.find((unit) => unit.id === lancerId)?.activation
        .pursuitPhase,
    ).toBe("PURSUIT_MOVED");
    expect(
      applyCommandV7(pursueOne.state, state.humanPlayerId, {
        kind: "PURSUE",
        unitId: lancerId,
        path: [{ x: 5, y: 5 }],
      }),
    ).toMatchObject({ accepted: false, error: { code: "PURSUIT_NOT_READY" } });

    const secondAttack = applyCommandV7(pursueOne.state, state.humanPlayerId, {
      kind: "ATTACK",
      unitId: lancerId,
      targetUnitId: second.id,
    });
    expect(secondAttack.accepted).toBe(true);
    if (!secondAttack.accepted) return;
    const pursueTwo = applyCommandV7(secondAttack.state, state.humanPlayerId, {
      kind: "PURSUE",
      unitId: lancerId,
      path: [{ x: 6, y: 5 }],
    });
    expect(pursueTwo.accepted).toBe(true);
    if (!pursueTwo.accepted) return;
    const thirdAttack = applyCommandV7(pursueTwo.state, state.humanPlayerId, {
      kind: "ATTACK",
      unitId: lancerId,
      targetUnitId: third.id,
    });
    expect(thirdAttack.accepted).toBe(true);
    if (!thirdAttack.accepted) return;
    expect(
      thirdAttack.state.units.find((unit) => unit.id === lancerId)?.activation,
    ).toMatchObject({
      attacksUsed: 3,
      pursuitPhase: "NONE",
      attacked: true,
      handled: true,
    });
    expect(thirdAttack.events).toContainEqual({
      kind: "PURSUIT_ENDED",
      unitId: lancerId,
      attacksUsed: 3,
      reason: "THIRD_ATTACK",
    });
    expect(
      queryThreatenedTilesV7(state, lancerId).some(
        (at) => at.x === 8 && at.y === 5,
      ),
    ).toBe(true);
    expect(queryUnitStatsV7(state, lancerId)?.abilities).toContain("DASH");
  });

  it("round-trips a naturally opened Pursuit through replay and save", () => {
    const setup = setupV7();
    const created = createInitialMapStateV7(setup);
    if (!created.ok) throw new Error(created.error.code);
    let state = created.state;
    let replay = createReplayV7(setup);
    const accept = (command: CommandV7) => {
      const actor = state.turnOrder[state.activeSeatIndex]!;
      const result = applyCommandV7(state, actor, command);
      expect(result.accepted, JSON.stringify(result)).toBe(true);
      if (!result.accepted) throw new Error(result.error.code);
      state = result.state;
      replay = appendReplayCommandV7(replay, command, state);
      return result;
    };
    let lancerAttacks = 0;
    for (let guard = 0; guard < 80; guard += 1) {
      const actor = state.turnOrder[state.activeSeatIndex]!;
      const humanTurn = actor === state.humanPlayerId;
      const actorUnit = state.units.find((unit) => unit.ownerId === actor);
      if (!humanTurn && actorUnit !== undefined && actorUnit.at.y < 7)
        accept({
          kind: "MOVE",
          unitId: actorUnit.id,
          path: [{ x: 8, y: actorUnit.at.y + 1 }],
        });
      if (humanTurn) {
        const fighter = state.units.find(
          (unit) => unit.ownerId === actor && unit.role === "FIGHTER",
        );
        if (fighter?.at.x === 8 && fighter.at.y === 8)
          accept({ kind: "MOVE", unitId: fighter.id, path: [{ x: 9, y: 8 }] });
        const player = state.players.find(
          (candidate) => candidate.id === actor,
        )!;
        for (const [tech, prerequisite] of [
          ["SCOUTING", null],
          ["RAIDING", "SCOUTING"],
          ["MANEUVER", "RAIDING"],
        ] as const) {
          if (
            !player.researchedTechs.includes(tech) &&
            (prerequisite === null ||
              player.researchedTechs.includes(prerequisite))
          ) {
            const research = queryPlayerCommandsV7(state, actor).find(
              (command) => command.kind === "RESEARCH" && command.tech === tech,
            );
            if (research !== undefined) accept(research);
            break;
          }
        }
        let lancer = state.units.find(
          (unit) => unit.ownerId === actor && unit.role === "LANCER",
        );
        if (lancer === undefined) {
          const city = state.cities.find(
            (candidate) => candidate.ownerId === actor,
          )!;
          const train = queryPlayerCommandsV7(state, actor).find(
            (command) =>
              command.kind === "TRAIN" &&
              command.cityId === city.id &&
              command.role === "LANCER",
          );
          if (train !== undefined) accept(train);
          lancer = state.units.find(
            (unit) => unit.ownerId === actor && unit.role === "LANCER",
          );
        }
        const target = state.units.find(
          (unit) =>
            unit.ownerId !== actor && unit.at.x === 8 && unit.at.y === 7,
        );
        if (
          lancer !== undefined &&
          target !== undefined &&
          !lancer.activation.attacked &&
          !lancer.activation.handled
        ) {
          const attack = accept({
            kind: "ATTACK",
            unitId: lancer.id,
            targetUnitId: target.id,
          });
          lancerAttacks += 1;
          if (
            attack.state.units.find((unit) => unit.id === lancer!.id)
              ?.activation.pursuitPhase === "PURSUIT_READY"
          )
            break;
        }
      }
      accept({ kind: "END_TURN" });
    }
    expect(lancerAttacks).toBe(2);
    const open = state.units.find(
      (unit) => unit.activation.pursuitPhase === "PURSUIT_READY",
    );
    expect(open).toBeDefined();
    const replayed = runReplayV7(replay);
    expect(replayed.state).toEqual(state);
    const save = createSaveEnvelopeV7(
      { state: replayed.state, replay },
      "2026-09-06T00:00:00.000Z",
    );
    const loaded = parseSaveV7(JSON.stringify(save));
    expect(loaded.kind).toBe("VALID");
    if (loaded.kind === "VALID")
      expect(
        loaded.save.state.units.find((unit) => unit.id === open!.id)?.activation
          .pursuitPhase,
      ).toBe("PURSUIT_READY");
  }, 15_000);
});

function battle(
  attackerRole: UnitRoleIdV7,
  defenderRole: UnitRoleIdV7,
  attackerAt: CoordV7,
  defenderAt: CoordV7,
  options: {
    attackerActivation?: UnitStateV7["activation"];
    defenderHp?: number;
    defenderTerrain?: "GRASS" | "FOREST" | "MOUNTAIN";
  } = {},
): GameStateV7 {
  const base = exploredAllV7(allTechsV7(initialV7()));
  const human = base.humanPlayerId;
  const enemy = base.players.find((player) => player.id !== human)!.id;
  const first = base.units.find((unit) => unit.ownerId === human)!;
  const second = base.units.find((unit) => unit.ownerId === enemy)!;
  const attacker = makeUnit(base, first.id, human, attackerRole, attackerAt);
  const defender = makeUnit(
    base,
    second.id,
    enemy,
    defenderRole,
    defenderAt,
    options.defenderHp,
  );
  return checkedV7({
    ...base,
    treasureChests: base.treasureChests.filter(
      (at) => !same(at, attackerAt) && !same(at, defenderAt),
    ),
    units: [
      { ...attacker, activation: options.attackerActivation ?? READY },
      defender,
    ].sort((a, b) => a.id - b.id),
    board: patchTiles(base, [
      [
        attackerAt,
        { terrain: "GRASS", resource: null, improvement: null, site: null },
      ],
      [
        defenderAt,
        {
          terrain: options.defenderTerrain ?? "GRASS",
          resource: null,
          improvement: null,
          site: null,
        },
      ],
      [
        {
          x: defenderAt.x + defenderAt.x - attackerAt.x,
          y: defenderAt.y + defenderAt.y - attackerAt.y,
        },
        { terrain: "GRASS", resource: null, improvement: null, site: null },
      ],
    ]),
  });
}

function makeUnit(
  state: GameStateV7,
  id: number,
  ownerId: number,
  role: UnitRoleIdV7,
  at: CoordV7,
  hp = effectiveRoleRuleV7(role).maxHp,
): UnitStateV7 {
  const rule = effectiveRoleRuleV7(role);
  return {
    id: id as UnitStateV7["id"],
    ownerId: ownerId as UnitStateV7["ownerId"],
    homeCityId:
      state.cities.find((city) => city.ownerId === ownerId)?.id ?? null,
    role,
    at,
    hp,
    maxHp: rule.maxHp,
    kills: 0,
    veteran: false,
    captureEligible: false,
    activation: READY,
    blackoutEligibleRound: role === "SABOTEUR" ? 1 : null,
  };
}

function patchTiles(
  state: GameStateV7,
  patches: readonly (readonly [
    CoordV7,
    Partial<GameStateV7["board"]["tiles"][number]>,
  ])[],
) {
  return {
    ...state.board,
    tiles: state.board.tiles.map((tile) => {
      const patch = patches.find(([at]) => same(at, tile.at));
      return patch === undefined ? tile : { ...tile, ...patch[1], at: tile.at };
    }),
  };
}
const same = (a: CoordV7, b: CoordV7) => a.x === b.x && a.y === b.y;
