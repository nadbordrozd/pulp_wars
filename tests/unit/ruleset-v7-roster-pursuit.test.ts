import { describe, expect, it } from "vitest";
import {
  applyCommandV7,
  calculateCombatPreviewV7,
  effectiveRoleRuleV7,
  movementStepCost2V7,
  nextBounded,
  parseGameStateV7,
  queryCombatPreviewV7,
  queryPlayerCommandsV7,
  queryUnitStatsV7,
  startTurnEconomyV7,
  unitId,
  validateMovementPathV7,
  type CoordV7,
  type GameStateV7,
  type UnitRoleIdV7,
  type UnitStateV7,
} from "../../src/engine/index";
import {
  allTechsV7,
  checkedV7,
  exploredAllV7,
  initialV7,
  richV7,
} from "../fixtures/v7-builders";

const READY: UnitStateV7["activation"] = {
  moved: false,
  movedPathLength: 0,
  attacked: false,
  attacksUsed: 0,
  tendedThisTurn: false,
  inspired: false,
  overrunActive: false,
  recovered: false,
  captured: false,
  handled: false,
  specialActed: false,
};

describe("ruleset-7 Knight Overrun activation", () => {
  it("uses the exact role values and has no Capture ability", () => {
    expect(effectiveRoleRuleV7("KNIGHT")).toMatchObject({
      cost: 9,
      maxHp: 10,
      attack2: 6,
      defense2: 2,
      move: 3,
      range: 1,
      minimumRange: 1,
      sightRadius: 1,
      technology: "CHIVALRY",
      mayUsePrimaryActionAfterMove: true,
      abilities: ["ATTACK", "OVERRUN"],
    });
  });

  it("ends a nonlethal attack without opening Overrun", () => {
    const state = battle("KNIGHT", "GUARD", { x: 2, y: 2 }, { x: 3, y: 2 });
    const archer = required(state.units[0], "Knight Overrun missing");
    const guard = required(state.units[1], "Guard missing");
    const first = applyCommandV7(state, state.humanPlayerId, {
      kind: "ATTACK",
      unitId: archer.id,
      targetUnitId: guard.id,
    });
    expect(first.accepted).toBe(true);
    if (!first.accepted) return;
    expect(
      first.events.find((event) => event.kind === "COMBAT_RESOLVED"),
    ).toMatchObject({
      preview: {
        attacksUsed: 1,
        attacksRemaining: 0,
        advances: false,
        overrunContinues: false,
      },
    });
    expect(
      first.state.units.find((unit) => unit.id === archer.id)?.activation,
    ).toMatchObject({
      attacked: true,
      attacksUsed: 1,
      handled: true,
    });
    const second = applyCommandV7(first.state, state.humanPlayerId, {
      kind: "ATTACK",
      unitId: archer.id,
      targetUnitId: guard.id,
    });
    expect(second).toMatchObject({
      accepted: false,
      error: { code: "UNIT_ALREADY_ACTED" },
    });
  });

  it("allows unit switching while rejecting Wait on the active Knight", () => {
    let state = overrunBattle();
    const archer = required(
      state.units.find((unit) => unit.ownerId === state.humanPlayerId),
      "Knight Overrun missing",
    );
    state = checkedV7({
      ...state,
      nextEntityId: state.nextEntityId + 1,
      units: [
        ...state.units,
        {
          ...archer,
          id: unitId(state.nextEntityId),
          role: "FIGHTER" as const,
          at: { x: 1, y: 4 },
          maxHp: 10,
          hp: 10,
          activation: READY,
        },
      ].sort((left, right) => left.id - right.id),
    });
    const target = required(
      state.units.find(
        (unit) =>
          unit.ownerId !== state.humanPlayerId && same(unit.at, { x: 3, y: 2 }),
      ),
      "target missing",
    );
    const first = applyCommandV7(state, state.humanPlayerId, {
      kind: "ATTACK",
      unitId: archer.id,
      targetUnitId: target.id,
    });
    if (!first.accepted) throw new Error(first.error.code);
    expect(
      queryPlayerCommandsV7(first.state, state.humanPlayerId).some(
        (command) => command.kind === "MOVE" && command.unitId !== archer.id,
      ),
    ).toBe(true);
    const waited = applyCommandV7(first.state, state.humanPlayerId, {
      kind: "WAIT",
      unitId: archer.id,
    });
    expect(waited).toMatchObject({
      accepted: false,
      state: first.state,
      events: [],
      error: { code: "UNIT_ALREADY_ACTED" },
    });
    expect(
      queryPlayerCommandsV7(first.state, state.humanPlayerId).some(
        (command) => command.kind === "ATTACK" && command.unitId === archer.id,
      ),
    ).toBe(true);
  });

  it("locks movement and other actions after the first Overrun attack", () => {
    const state = overrunBattle();
    const archer = required(state.units[0], "Knight Overrun missing");
    const target = required(
      state.units.find(
        (unit) =>
          unit.ownerId !== state.humanPlayerId && same(unit.at, { x: 3, y: 2 }),
      ),
      "target missing",
    );
    const first = applyCommandV7(state, state.humanPlayerId, {
      kind: "ATTACK",
      unitId: archer.id,
      targetUnitId: target.id,
    });
    if (!first.accepted) throw new Error(first.error.code);
    expect(first.events[0]).toMatchObject({
      kind: "COMBAT_RESOLVED",
      preview: {
        defenderDies: true,
        advances: true,
        overrunAdvance: true,
        overrunContinues: true,
      },
    });
    const ownCommands = queryPlayerCommandsV7(
      first.state,
      state.humanPlayerId,
    ).filter((command) => "unitId" in command && command.unitId === archer.id);
    expect(ownCommands.some((command) => command.kind === "ATTACK")).toBe(true);
    expect(ownCommands.some((command) => command.kind === "MOVE")).toBe(false);
    expect(ownCommands.some((command) => command.kind === "RECOVER")).toBe(
      false,
    );
    expect(ownCommands.some((command) => command.kind === "PILLAGE")).toBe(
      false,
    );
    expect(ownCommands.some((command) => command.kind === "CAPTURE")).toBe(
      false,
    );
  });

  it("continues beyond two attacks while other units act without refreshing Inspired", () => {
    const base = battle("KNIGHT", "FIGHTER", { x: 2, y: 2 }, { x: 3, y: 2 }, 1);
    const knight = required(base.units[0], "Knight missing");
    const firstEnemy = required(base.units[1], "first target missing");
    const enemyId = firstEnemy.ownerId;
    const captainOne = makeUnit(
      base,
      unitId(base.nextEntityId),
      base.humanPlayerId,
      "CAPTAIN",
      { x: 2, y: 3 },
    );
    const captainTwo = makeUnit(
      base,
      unitId(base.nextEntityId + 1),
      base.humanPlayerId,
      "CAPTAIN",
      { x: 3, y: 3 },
    );
    const secondEnemy = makeUnit(
      base,
      unitId(base.nextEntityId + 2),
      enemyId,
      "FIGHTER",
      { x: 4, y: 2 },
      1,
    );
    const thirdEnemy = makeUnit(
      base,
      unitId(base.nextEntityId + 3),
      enemyId,
      "FIGHTER",
      { x: 5, y: 2 },
      1,
    );
    const state = checkedV7({
      ...base,
      nextEntityId: base.nextEntityId + 4,
      units: [
        knight,
        { ...firstEnemy, hp: 1 },
        captainOne,
        captainTwo,
        secondEnemy,
        thirdEnemy,
      ].sort((left, right) => left.id - right.id),
      board: patchTiles(base, [
        [
          { x: 2, y: 3 },
          { terrain: "GRASS", site: null },
        ],
        [
          { x: 3, y: 3 },
          { terrain: "GRASS", site: null },
        ],
        [
          { x: 4, y: 2 },
          { terrain: "GRASS", site: null },
        ],
        [
          { x: 5, y: 2 },
          { terrain: "GRASS", site: null },
        ],
      ]),
    });
    const firstRally = applyCommandV7(state, state.humanPlayerId, {
      kind: "RALLY",
      unitId: captainOne.id,
    });
    if (!firstRally.accepted) throw new Error(firstRally.error.code);
    const first = applyCommandV7(firstRally.state, state.humanPlayerId, {
      kind: "ATTACK",
      unitId: knight.id,
      targetUnitId: firstEnemy.id,
    });
    if (!first.accepted) throw new Error(first.error.code);
    expect(parseGameStateV7(first.state)).toEqual(first.state);
    expect(
      first.events.find((event) => event.kind === "COMBAT_RESOLVED"),
    ).toMatchObject({ preview: { inspiredApplied: true } });
    expect(
      queryPlayerCommandsV7(first.state, state.humanPlayerId),
    ).toContainEqual({ kind: "RALLY", unitId: captainTwo.id });
    const secondRally = applyCommandV7(first.state, state.humanPlayerId, {
      kind: "RALLY",
      unitId: captainTwo.id,
    });
    if (!secondRally.accepted) throw new Error(secondRally.error.code);
    const second = applyCommandV7(secondRally.state, state.humanPlayerId, {
      kind: "ATTACK",
      unitId: knight.id,
      targetUnitId: secondEnemy.id,
    });
    if (!second.accepted) throw new Error(second.error.code);
    expect(
      second.events.find((event) => event.kind === "COMBAT_RESOLVED"),
    ).toMatchObject({ preview: { inspiredApplied: false } });
    const third = applyCommandV7(second.state, state.humanPlayerId, {
      kind: "ATTACK",
      unitId: knight.id,
      targetUnitId: thirdEnemy.id,
    });
    if (!third.accepted) throw new Error(third.error.code);
    expect(
      third.state.units.find((unit) => unit.id === knight.id),
    ).toMatchObject({
      at: { x: 5, y: 2 },
      activation: {
        attacksUsed: 3,
        overrunActive: false,
        inspired: false,
      },
    });
  });

  it("advances Knight and Marksman after an adjacent kill", () => {
    for (const [role, expectedAdvance] of [
      ["KNIGHT", true],
      ["MARKSMAN", true],
    ] as const) {
      const state = battle(role, "FIGHTER", { x: 2, y: 2 }, { x: 3, y: 2 }, 1);
      const attacker = required(state.units[0], "attacker missing");
      const defender = required(state.units[1], "defender missing");
      const result = applyCommandV7(state, state.humanPlayerId, {
        kind: "ATTACK",
        unitId: attacker.id,
        targetUnitId: defender.id,
      });
      expect(result.accepted).toBe(true);
      if (!result.accepted) continue;
      expect(
        result.events.find((event) => event.kind === "COMBAT_RESOLVED"),
      ).toMatchObject({
        preview: {
          defenderDies: true,
          advances: expectedAdvance,
        },
      });
      expect(
        result.state.units.find((unit) => unit.id === attacker.id)?.at,
      ).toEqual(expectedAdvance ? defender.at : attacker.at);
    }
  });

  it("defers promotion until Overrun ends and resets attacks at next Start Turn", () => {
    let state = overrunBattle();
    const archer = required(
      state.units.find((unit) => unit.ownerId === state.humanPlayerId),
      "Knight Overrun missing",
    );
    state = checkedV7({
      ...state,
      units: state.units.map((unit) =>
        unit.id === archer.id ? { ...unit, kills: 3 } : unit,
      ),
    });
    const target = required(
      state.units.find(
        (unit) =>
          unit.ownerId !== state.humanPlayerId && same(unit.at, { x: 3, y: 2 }),
      ),
      "target missing",
    );
    const first = applyCommandV7(state, state.humanPlayerId, {
      kind: "ATTACK",
      unitId: archer.id,
      targetUnitId: target.id,
    });
    if (!first.accepted) throw new Error(first.error.code);
    const blockedPromotion = applyCommandV7(first.state, state.humanPlayerId, {
      kind: "PROMOTE",
      unitId: archer.id,
    });
    expect(blockedPromotion).toMatchObject({
      accepted: false,
      state: first.state,
      events: [],
      error: { code: "UNIT_ALREADY_ACTED" },
    });
    const continuationTarget = required(
      first.state.units.find((unit) => unit.ownerId !== state.humanPlayerId),
      "continuation target missing",
    );
    const continued = applyCommandV7(first.state, state.humanPlayerId, {
      kind: "ATTACK",
      unitId: archer.id,
      targetUnitId: continuationTarget.id,
    });
    if (!continued.accepted) throw new Error(continued.error.code);
    const promoted = applyCommandV7(continued.state, state.humanPlayerId, {
      kind: "PROMOTE",
      unitId: archer.id,
    });
    if (!promoted.accepted) throw new Error(promoted.error.code);
    expect(
      promoted.state.units.find((unit) => unit.id === archer.id)?.activation
        .attacksUsed,
    ).toBe(2);
    const humanEnded = applyCommandV7(promoted.state, state.humanPlayerId, {
      kind: "END_TURN",
    });
    if (!humanEnded.accepted) throw new Error(humanEnded.error.code);
    const rivalId = required(
      humanEnded.state.turnOrder[humanEnded.state.activeSeatIndex],
      "rival missing",
    );
    const rivalEnded = applyCommandV7(humanEnded.state, rivalId, {
      kind: "END_TURN",
    });
    if (!rivalEnded.accepted) throw new Error(rivalEnded.error.code);
    expect(
      rivalEnded.state.units.find((unit) => unit.id === archer.id)?.activation,
    ).toMatchObject({
      attacksUsed: 0,
      attacked: false,
      handled: false,
    });
  });

  it("trains newborn Knight Overruns fully exhausted", () => {
    const base = richV7(allTechsV7(initialV7()), 100);
    const city = required(
      base.cities.find((candidate) => candidate.ownerId === base.humanPlayerId),
      "city missing",
    );
    const state = checkedV7({
      ...base,
      units: base.units.filter((unit) => unit.ownerId !== base.humanPlayerId),
    });
    const trained = applyCommandV7(state, state.humanPlayerId, {
      kind: "TRAIN",
      cityId: city.id,
      role: "KNIGHT",
    });
    if (!trained.accepted) throw new Error(trained.error.code);
    expect(
      trained.state.units.find((unit) => unit.ownerId === state.humanPlayerId)
        ?.activation,
    ).toMatchObject({
      attacksUsed: 1,
      attacked: true,
      handled: true,
    });
  });

  it("offers attacks after Dash from the final coordinate", () => {
    const state = battle("KNIGHT", "FIGHTER", { x: 1, y: 2 }, { x: 4, y: 2 });
    const archer = required(state.units[0], "Knight Overrun missing");
    const target = required(state.units[1], "target missing");
    const move = queryPlayerCommandsV7(state, state.humanPlayerId).find(
      (command) =>
        command.kind === "MOVE" &&
        command.unitId === archer.id &&
        command.path.at(-1)?.x === 3 &&
        command.path.at(-1)?.y === 2,
    );
    expect(move).toBeDefined();
    if (move?.kind !== "MOVE") return;
    const moved = applyCommandV7(state, state.humanPlayerId, move);
    if (!moved.accepted) throw new Error(moved.error.code);
    expect(
      queryCombatPreviewV7(
        moved.state,
        state.humanPlayerId,
        archer.id,
        target.id,
      ),
    ).not.toBeNull();
  });

  it("retains Catapult range, first-attack Charge, terrain defense, and ordinary action locks", () => {
    const catapult = battle(
      "CATAPULT",
      "FIGHTER",
      { x: 2, y: 2 },
      { x: 4, y: 2 },
    );
    const catapultAttacker = required(catapult.units[0], "Catapult missing");
    const catapultTarget = required(catapult.units[1], "target missing");
    expect(
      calculateCombatPreviewV7(
        catapult,
        catapultAttacker.id,
        catapultTarget.id,
      ),
    ).toMatchObject({
      minimumRange: 2,
      maximumRange: 3,
    });
    const adjacent = battle(
      "CATAPULT",
      "FIGHTER",
      { x: 2, y: 2 },
      { x: 3, y: 2 },
    );
    const adjacentAttacker = required(adjacent.units[0], "Catapult missing");
    const adjacentTarget = required(adjacent.units[1], "target missing");
    expect(
      queryCombatPreviewV7(
        adjacent,
        adjacent.humanPlayerId,
        adjacentAttacker.id,
        adjacentTarget.id,
      ),
    ).toBeNull();
    const charged = battle(
      "RAIDER",
      "GUARD",
      { x: 2, y: 2 },
      { x: 3, y: 2 },
      {
        attackerActivation: { ...READY, moved: true, movedPathLength: 2 },
      },
    );
    const raider = required(charged.units[0], "Raider missing");
    const chargedTarget = required(charged.units[1], "target missing");
    expect(
      calculateCombatPreviewV7(charged, raider.id, chargedTarget.id),
    ).toMatchObject({
      attack2: 6,
      chargeApplied: true,
    });
    const breach = battle(
      "GUARD",
      "GUARD",
      { x: 2, y: 2 },
      { x: 3, y: 2 },
      {
        defenderTerrain: "FOREST",
      },
    );
    const breacher = required(breach.units[0], "Breacher missing");
    const breachTarget = required(breach.units[1], "target missing");
    expect(
      calculateCombatPreviewV7(breach, breacher.id, breachTarget.id),
    ).toMatchObject({
      breachApplied: false,
      defenseBonusNumerator: 3,
      defenseBonusDenominator: 2,
    });
    const push = battle("KNIGHT", "GUARD", { x: 2, y: 2 }, { x: 3, y: 2 });
    const heavy = required(push.units[0], "Heavy missing");
    const pushTarget = required(push.units[1], "target missing");
    const pushed = applyCommandV7(push, push.humanPlayerId, {
      kind: "ATTACK",
      unitId: heavy.id,
      targetUnitId: pushTarget.id,
    });
    expect(pushed.accepted).toBe(true);
    expect(
      pushed.accepted &&
        pushed.events.some((event) => event.kind === "UNIT_PUSHED"),
    ).toBe(false);
    const movedGuard = battle(
      "GUARD",
      "FIGHTER",
      { x: 2, y: 2 },
      { x: 3, y: 2 },
      {
        attackerActivation: { ...READY, moved: true, movedPathLength: 1 },
      },
    );
    const guard = required(movedGuard.units[0], "Guard missing");
    const guardTarget = required(movedGuard.units[1], "target missing");
    expect(
      applyCommandV7(movedGuard, movedGuard.humanPlayerId, {
        kind: "ATTACK",
        unitId: guard.id,
        targetUnitId: guardTarget.id,
      }),
    ).toMatchObject({ accepted: false, error: { code: "UNIT_ALREADY_ACTED" } });
  });

  it("retains movement budgets, Road discounts, terrain stops, and Engineering entry", () => {
    const base = battle("RAIDER", "FIGHTER", { x: 2, y: 2 }, { x: 9, y: 9 });
    const withoutProspecting = checkedV7({
      ...base,
      players: base.players.map((player) =>
        player.id === base.humanPlayerId
          ? {
              ...player,
              researchedTechs: player.researchedTechs.filter(
                (tech) => tech !== "ENGINEERING" && tech !== "METALLURGY",
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
    const scoutWithoutProspecting = required(
      withoutProspecting.units[0],
      "Scout missing",
    );
    expect(
      validateMovementPathV7(withoutProspecting, scoutWithoutProspecting, [
        { x: 3, y: 2 },
      ]),
    ).toEqual({
      legal: false,
      reason: "ENGINEERING_REQUIRED",
    });
    const withProspecting = checkedV7({
      ...withoutProspecting,
      players: base.players,
    });
    const scoutWithProspecting = required(
      withProspecting.units[0],
      "Scout missing",
    );
    expect(
      validateMovementPathV7(withProspecting, scoutWithProspecting, [
        { x: 3, y: 2 },
      ]),
    ).toMatchObject({
      legal: true,
      stopped: true,
    });
    const baseCity = required(base.cities[0], "city missing");
    const roadState = checkedV7({
      ...base,
      board: patchTiles(base, [
        [
          { x: 7, y: 8 },
          { road: true, territoryCityId: baseCity.id },
        ],
      ]),
    });
    const human = required(
      roadState.players.find((player) => player.id === roadState.humanPlayerId),
      "human missing",
    );
    const roadCity = required(roadState.cities[0], "city missing");
    expect(
      movementStepCost2V7(roadState, human, roadCity.at, {
        x: 7,
        y: 8,
      }),
    ).toBe(1);
    const horse = battle("KNIGHT", "FIGHTER", { x: 2, y: 4 }, { x: 9, y: 9 });
    const knightOverrun = required(horse.units[0], "Knight Overrun missing");
    expect(
      validateMovementPathV7(horse, knightOverrun, [
        { x: 3, y: 4 },
        { x: 4, y: 4 },
        { x: 5, y: 4 },
      ]),
    ).toMatchObject({
      legal: true,
      spentPoints2: 6,
    });
  });

  it("retains one-draw treasure rewards, Knight placement, and spawned sight", () => {
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
    const explorer = required(state.units[0], "explorer missing");
    const result = applyCommandV7(state, state.humanPlayerId, {
      kind: "MOVE",
      unitId: explorer.id,
      path: [{ x: 2, y: 1 }],
    });
    if (!result.accepted) throw new Error(result.error.code);
    expect(result.state.random).toEqual(expectedRandom);
    expect(result.state.units.some((unit) => unit.role === "KNIGHT")).toBe(
      true,
    );
    expect(result.events).toContainEqual(
      expect.objectContaining({
        kind: "TREASURE_CAPTURED",
        requestedReward: "KNIGHT",
        grantedReward: "KNIGHT",
        knightFallback: false,
      }),
    );
    expect(
      result.state.players.find((player) => player.id === state.humanPlayerId)
        ?.explored,
    ).toContainEqual({ x: 0, y: 0 });
  });

  it("enforces Captain support eligibility, nonstacking, consumption, and lifecycle", () => {
    const base = battle("CAPTAIN", "FIGHTER", { x: 2, y: 2 }, { x: 4, y: 2 });
    const captainOne = required(base.units[0], "first Captain missing");
    const enemy = required(base.units[1], "enemy missing");
    const target = {
      ...makeUnit(
        base,
        unitId(base.nextEntityId),
        base.humanPlayerId,
        "FIGHTER",
        { x: 3, y: 2 },
        15,
      ),
      veteran: true,
      kills: 3,
      maxHp: 15,
    };
    const captainTwo = makeUnit(
      base,
      unitId(base.nextEntityId + 1),
      base.humanPlayerId,
      "CAPTAIN",
      { x: 2, y: 3 },
    );
    const siege = makeUnit(
      base,
      unitId(base.nextEntityId + 2),
      base.humanPlayerId,
      "CATAPULT",
      { x: 3, y: 3 },
    );
    const naval = {
      ...makeUnit(
        base,
        unitId(base.nextEntityId + 3),
        base.humanPlayerId,
        "PATROL_BOAT",
        { x: 1, y: 2 },
        5,
      ),
      form: "NAVAL" as const,
    };
    const state = checkedV7({
      ...base,
      nextEntityId: base.nextEntityId + 4,
      treasureChests: base.treasureChests.filter(
        (at) =>
          ![
            captainOne.at,
            enemy.at,
            target.at,
            captainTwo.at,
            siege.at,
            naval.at,
          ].some((occupied) => same(occupied, at)),
      ),
      units: [captainOne, enemy, target, captainTwo, siege, naval].sort(
        (left, right) => left.id - right.id,
      ),
      board: patchTiles(base, [
        [target.at, { biome: "PLAINS", terrain: "GRASS", site: null }],
        [captainTwo.at, { biome: "PLAINS", terrain: "GRASS", site: null }],
        [siege.at, { biome: "PLAINS", terrain: "GRASS", site: null }],
        [
          naval.at,
          {
            biome: null,
            terrain: "SHALLOW_WATER",
            resource: null,
            improvement: null,
            site: null,
            road: false,
            fieldDefense: false,
            territoryCityId: null,
          },
        ],
      ]),
    });

    const rallied = applyCommandV7(state, state.humanPlayerId, {
      kind: "RALLY",
      unitId: captainOne.id,
    });
    if (!rallied.accepted) throw new Error(rallied.error.code);
    expect(
      rallied.state.units.find((unit) => unit.id === target.id)?.activation
        .inspired,
    ).toBe(true);
    for (const excluded of [captainOne, captainTwo, siege, naval])
      expect(
        rallied.state.units.find((unit) => unit.id === excluded.id)?.activation
          .inspired,
      ).toBe(false);
    const stacked = applyCommandV7(rallied.state, state.humanPlayerId, {
      kind: "RALLY",
      unitId: captainTwo.id,
    });
    expect(stacked).toMatchObject({ accepted: false, events: [] });
    expect(stacked.state).toBe(rallied.state);
    const guessed = applyCommandV7(rallied.state, state.humanPlayerId, {
      kind: "ATTACK",
      unitId: target.id,
      targetUnitId: unitId(999_999),
    });
    expect(guessed).toMatchObject({ accepted: false, events: [] });
    expect(guessed.state).toBe(rallied.state);
    const attacked = applyCommandV7(rallied.state, state.humanPlayerId, {
      kind: "ATTACK",
      unitId: target.id,
      targetUnitId: enemy.id,
    });
    if (!attacked.accepted) throw new Error(attacked.error.code);
    expect(
      attacked.events.find((event) => event.kind === "COMBAT_RESOLVED"),
    ).toMatchObject({ preview: { inspiredApplied: true } });
    expect(
      attacked.state.units.find((unit) => unit.id === target.id)?.activation
        .inspired,
    ).toBe(false);
    const rallyExpired = applyCommandV7(rallied.state, state.humanPlayerId, {
      kind: "END_TURN",
    });
    if (!rallyExpired.accepted) throw new Error(rallyExpired.error.code);
    expect(
      rallyExpired.state.units.find((unit) => unit.id === target.id)?.activation
        .inspired,
    ).toBe(false);

    const woundedState = checkedV7({
      ...state,
      units: state.units.map((unit) =>
        unit.id === target.id ? { ...unit, hp: 2 } : unit,
      ),
    });
    const tended = applyCommandV7(woundedState, state.humanPlayerId, {
      kind: "TEND_WOUNDED",
      unitId: captainOne.id,
    });
    if (!tended.accepted) throw new Error(tended.error.code);
    expect(
      tended.events.find((event) => event.kind === "WOUNDED_TENDED"),
    ).toMatchObject({
      results: [{ unitId: target.id, amount: 2, hpAfter: 4 }],
    });
    expect(
      queryPlayerCommandsV7(tended.state, state.humanPlayerId),
    ).not.toContainEqual({ kind: "TEND_WOUNDED", unitId: captainTwo.id });
    const retended = applyCommandV7(tended.state, state.humanPlayerId, {
      kind: "TEND_WOUNDED",
      unitId: captainTwo.id,
    });
    expect(retended).toMatchObject({ accepted: false, events: [] });
    const receiverActed = applyCommandV7(tended.state, state.humanPlayerId, {
      kind: "WAIT",
      unitId: target.id,
    });
    expect(receiverActed.accepted).toBe(true);
    const receiverIdled = applyCommandV7(tended.state, state.humanPlayerId, {
      kind: "END_TURN",
    });
    if (!receiverIdled.accepted) throw new Error(receiverIdled.error.code);
    expect(
      receiverIdled.events.some(
        (event) =>
          event.kind === "UNIT_RECOVERED" && event.unitId === target.id,
      ),
    ).toBe(true);
    expect(
      receiverIdled.state.units.find((unit) => unit.id === target.id)?.hp,
    ).toBeGreaterThan(4);
    const enemyEnded = applyCommandV7(
      receiverIdled.state,
      required(
        receiverIdled.state.turnOrder[receiverIdled.state.activeSeatIndex],
        "enemy turn missing",
      ),
      { kind: "END_TURN" },
    );
    if (!enemyEnded.accepted) throw new Error(enemyEnded.error.code);
    expect(
      enemyEnded.state.units.find((unit) => unit.id === target.id)?.activation
        .tendedThisTurn,
    ).toBe(false);
  });

  it("keeps 4/2 recovery independent from zero-output Windmill Start Turn healing", () => {
    const base = battle("FIGHTER", "FIGHTER", { x: 2, y: 2 }, { x: 9, y: 9 });
    const actor = base.humanPlayerId;
    const city = required(
      base.cities.find((candidate) => candidate.ownerId === actor),
      "supply city missing",
    );
    const windmillTile = required(
      base.board.tiles.find(
        (tile) =>
          tile.territoryCityId === city.id &&
          tile.site === null &&
          tile.improvement === null &&
          base.board.tiles.some(
            (candidate) =>
              candidate.territoryCityId === city.id &&
              candidate.site === null &&
              candidate.improvement === null &&
              !same(candidate.at, tile.at) &&
              Math.max(
                Math.abs(candidate.at.x - tile.at.x),
                Math.abs(candidate.at.y - tile.at.y),
              ) === 1,
          ),
      ),
      "Windmill tile missing",
    );
    const farmTile = required(
      base.board.tiles.find(
        (tile) =>
          tile.territoryCityId === city.id &&
          tile.site === null &&
          tile.improvement === null &&
          !same(tile.at, windmillTile.at) &&
          Math.max(
            Math.abs(tile.at.x - windmillTile.at.x),
            Math.abs(tile.at.y - windmillTile.at.y),
          ) === 1,
      ),
      "Farm tile missing",
    );
    const recovering = required(
      base.units.find((unit) => unit.ownerId === actor),
      "recovering unit missing",
    );
    const productiveWindmill = checkedV7({
      ...base,
      nextEntityId: base.nextEntityId + 2,
      treasureChests: base.treasureChests.filter(
        (at) =>
          !same(at, city.at) &&
          !same(at, windmillTile.at) &&
          !same(at, farmTile.at),
      ),
      units: base.units.map((unit) =>
        unit.id === recovering.id
          ? { ...unit, at: city.at, hp: 1, activation: READY }
          : unit,
      ),
      board: patchTiles(base, [
        [
          windmillTile.at,
          {
            biome: "PLAINS",
            terrain: "GRASS",
            resource: null,
            improvement: "WINDMILL",
            site: null,
          },
        ],
        [
          farmTile.at,
          {
            biome: "PLAINS",
            terrain: "GRASS",
            resource: null,
            improvement: "FARM",
            site: null,
          },
        ],
      ]),
      cities: base.cities.map((candidate) =>
        candidate.id === city.id
          ? {
              ...candidate,
              level: 2,
              economicPopulation: 3,
              population: 1,
              rewards: [{ reachedLevel: 2, reward: "STOCKPILE" as const }],
            }
          : candidate,
      ),
      populationContributions: [
        {
          id: base.nextEntityId,
          cityId: city.id,
          category: "LIVE",
          amount: 1,
          source: {
            kind: "IMPROVEMENT",
            improvement: "WINDMILL",
            at: windmillTile.at,
          },
        },
        {
          id: base.nextEntityId + 1,
          cityId: city.id,
          category: "LIVE",
          amount: 2,
          source: {
            kind: "IMPROVEMENT",
            improvement: "FARM",
            at: farmTile.at,
          },
        },
      ],
    });
    const zeroOutputWindmill = checkedV7({
      ...productiveWindmill,
      board: patchTiles(productiveWindmill, [
        [farmTile.at, { improvement: null }],
      ]),
      cities: productiveWindmill.cities.map((candidate) =>
        candidate.id === city.id
          ? { ...candidate, economicPopulation: 0, population: -2 }
          : candidate,
      ),
      populationContributions: [
        {
          id: base.nextEntityId,
          cityId: city.id,
          category: "LIVE",
          amount: 0,
          source: {
            kind: "IMPROVEMENT",
            improvement: "WINDMILL",
            at: windmillTile.at,
          },
        },
      ],
    });
    const neutralAt = required(
      zeroOutputWindmill.board.tiles.find(
        (tile) =>
          tile.territoryCityId === null &&
          tile.biome !== null &&
          tile.site === null &&
          !zeroOutputWindmill.units.some(
            (unit) => unit.id !== recovering.id && same(unit.at, tile.at),
          ),
      )?.at,
      "neutral recovery tile missing",
    );
    const neutral = checkedV7({
      ...zeroOutputWindmill,
      treasureChests: zeroOutputWindmill.treasureChests.filter(
        (at) => !same(at, neutralAt),
      ),
      units: zeroOutputWindmill.units.map((unit) =>
        unit.id === recovering.id
          ? { ...unit, at: neutralAt, hp: 1, activation: READY }
          : unit,
      ),
    });

    for (const [source, amount] of [
      [productiveWindmill, 4],
      [zeroOutputWindmill, 4],
      [neutral, 2],
    ] as const) {
      const explicit = applyCommandV7(source, actor, {
        kind: "RECOVER",
        unitId: recovering.id,
      });
      if (!explicit.accepted) throw new Error(explicit.error.code);
      expect(
        explicit.state.units.find((unit) => unit.id === recovering.id)?.hp,
      ).toBe(1 + amount);
      expect(explicit.events).toContainEqual({
        kind: "UNIT_RECOVERED",
        unitId: recovering.id,
        amount,
        automatic: false,
      });
      const idle = applyCommandV7(source, actor, { kind: "END_TURN" });
      if (!idle.accepted) throw new Error(idle.error.code);
      expect(
        idle.state.units.find((unit) => unit.id === recovering.id)?.hp,
      ).toBe(1 + amount);
      expect(idle.events).toContainEqual({
        kind: "UNIT_RECOVERED",
        unitId: recovering.id,
        amount,
        automatic: true,
      });
    }

    const adjacentToZeroOutputWindmill = checkedV7({
      ...zeroOutputWindmill,
      units: zeroOutputWindmill.units.map((unit) =>
        unit.id === recovering.id
          ? { ...unit, at: farmTile.at, hp: 1, activation: READY }
          : unit,
      ),
    });
    const started = startTurnEconomyV7(
      adjacentToZeroOutputWindmill,
      required(
        adjacentToZeroOutputWindmill.players.find(
          (player) => player.id === actor,
        ),
        "healing owner missing",
      ),
      false,
    );
    expect(
      started.state.units.find((unit) => unit.id === recovering.id)?.hp,
    ).toBe(7);
    expect(started.events).toContainEqual({
      kind: "WINDMILL_HEALING_RESOLVED",
      playerId: actor,
      cityId: city.id,
      at: windmillTile.at,
      results: [{ unitId: recovering.id, amount: 6, hpAfter: 7 }],
    });
  });

  it("retains Tend, Recover, Wait, Promote, stat attribution, and idle recovery", () => {
    let state = battle("CAPTAIN", "FIGHTER", { x: 2, y: 2 }, { x: 9, y: 9 });
    const target = makeUnit(
      state,
      unitId(state.nextEntityId),
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
    const captain = required(state.units[0], "Captain missing");
    const tended = applyCommandV7(state, state.humanPlayerId, {
      kind: "TEND_WOUNDED",
      unitId: captain.id,
    });
    expect(
      tended.accepted &&
        tended.state.units.find((unit) => unit.id === target.id)?.hp,
    ).toBe(5);
    expect(
      tended.accepted &&
        tended.state.units.find((unit) => unit.id === target.id)?.activation,
    ).toMatchObject({ tendedThisTurn: true, handled: false });
    for (const kind of ["RALLY", "TEND_WOUNDED"] as const) {
      const overflow = checkedV7({
        ...state,
        commandIndex: Number.MAX_SAFE_INTEGER,
      });
      const result = applyCommandV7(overflow, overflow.humanPlayerId, {
        kind,
        unitId: captain.id,
      });
      expect(result).toMatchObject({
        accepted: false,
        events: [],
        error: { code: "INTEGER_OVERFLOW" },
      });
      expect(result.state).toBe(overflow);
    }
    const promotable = checkedV7({
      ...state,
      units: state.units.map((unit) =>
        unit.id === target.id ? { ...unit, kills: 3 } : unit,
      ),
    });
    const promoted = applyCommandV7(promotable, state.humanPlayerId, {
      kind: "PROMOTE",
      unitId: target.id,
    });
    expect(
      promoted.accepted &&
        promoted.state.units.find((unit) => unit.id === target.id),
    ).toMatchObject({ veteran: true, hp: 8, maxHp: 15 });
    if (promoted.accepted)
      expect(
        queryUnitStatsV7(promoted.state, target.id)?.stats[0]?.modifiers[0]
          ?.source,
      ).toBe("PROMOTION");
    const recovered = applyCommandV7(
      tended.accepted ? tended.state : state,
      state.humanPlayerId,
      {
        kind: "RECOVER",
        unitId: target.id,
      },
    );
    expect(
      recovered.accepted &&
        recovered.state.units.find((unit) => unit.id === target.id)?.hp,
    ).toBe(7);
    const idleBase = allTechsV7(initialV7());
    const idleUnit = required(
      idleBase.units.find((unit) => unit.ownerId === idleBase.humanPlayerId),
      "idle unit missing",
    );
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
    ).toBe(8);
  });
});

function overrunBattle(): GameStateV7 {
  const base = battle("KNIGHT", "FIGHTER", { x: 2, y: 2 }, { x: 3, y: 2 }, 1);
  const enemy = required(
    base.units.find((unit) => unit.ownerId !== base.humanPlayerId),
    "enemy missing",
  );
  return checkedV7({
    ...base,
    nextEntityId: base.nextEntityId + 1,
    units: [
      ...base.units,
      makeUnit(base, unitId(base.nextEntityId), enemy.ownerId, "GUARD", {
        x: 4,
        y: 2,
      }),
    ].sort((left, right) => left.id - right.id),
  });
}

function battle(
  attackerRole: UnitRoleIdV7,
  defenderRole: UnitRoleIdV7,
  attackerAt: CoordV7,
  defenderAt: CoordV7,
  options:
    | number
    | {
        readonly attackerActivation?: UnitStateV7["activation"];
        readonly defenderHp?: number;
        readonly defenderTerrain?: "GRASS" | "FOREST" | "MOUNTAIN";
      } = {},
): GameStateV7 {
  const normalized =
    typeof options === "number" ? { defenderHp: options } : options;
  const base = exploredAllV7(allTechsV7(initialV7(2)));
  const human = base.humanPlayerId;
  const enemy = required(
    base.players.find((player) => player.id !== human),
    "enemy missing",
  ).id;
  const first = required(
    base.units.find((unit) => unit.ownerId === human),
    "attacker missing",
  );
  const second = required(
    base.units.find((unit) => unit.ownerId === enemy),
    "defender missing",
  );
  return checkedV7({
    ...base,
    treasureChests: base.treasureChests.filter(
      (at) => !same(at, attackerAt) && !same(at, defenderAt),
    ),
    units: [
      {
        ...makeUnit(base, first.id, human, attackerRole, attackerAt),
        activation: normalized.attackerActivation ?? READY,
      },
      makeUnit(
        base,
        second.id,
        enemy,
        defenderRole,
        defenderAt,
        normalized.defenderHp,
      ),
    ].sort((left, right) => left.id - right.id),
    board: {
      ...base.board,
      tiles: base.board.tiles.map((tile) =>
        same(tile.at, attackerAt) || same(tile.at, defenderAt)
          ? {
              ...tile,
              terrain: same(tile.at, defenderAt)
                ? (normalized.defenderTerrain ?? "GRASS")
                : "GRASS",
              resource: null,
              improvement: null,
              site: null,
            }
          : tile,
      ),
    },
  });
}

function makeUnit(
  state: GameStateV7,
  id: UnitStateV7["id"],
  ownerId: UnitStateV7["ownerId"],
  role: UnitRoleIdV7,
  at: CoordV7,
  hp = effectiveRoleRuleV7(role).maxHp,
): UnitStateV7 {
  const rule = effectiveRoleRuleV7(role);
  return {
    id,
    ownerId,
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
    form: "LAND",
  };
}

const same = (left: CoordV7, right: CoordV7): boolean =>
  left.x === right.x && left.y === right.y;

function patchTiles(
  state: GameStateV7,
  patches: readonly (readonly [
    CoordV7,
    Partial<GameStateV7["board"]["tiles"][number]>,
  ])[],
): GameStateV7["board"] {
  return {
    ...state.board,
    tiles: state.board.tiles.map((tile) => {
      const patch = patches.find(([at]) => same(at, tile.at));
      return patch === undefined ? tile : { ...tile, ...patch[1], at: tile.at };
    }),
  };
}

function required<T>(value: T | undefined, message: string): T {
  if (value === undefined) throw new Error(message);
  return value;
}
