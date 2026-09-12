import { describe, expect, it } from "vitest";
import {
  applyCommandV7,
  calculateCombatPreviewV7,
  effectiveRoleRuleV7,
  movementStepCost2V7,
  nextBounded,
  queryCombatPreviewV7,
  queryPlayerCommandsV7,
  queryUnitStatsV7,
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
  healed: false,
  recovered: false,
  captured: false,
  handled: false,
  specialActed: false,
};

describe("ruleset-7 Horse Archer activation", () => {
  it("uses the exact role values and has no Capture ability", () => {
    expect(effectiveRoleRuleV7("HORSE_ARCHER")).toMatchObject({
      cost: 9,
      maxHp: 10,
      attack2: 4,
      defense2: 2,
      move: 3,
      range: 2,
      minimumRange: 1,
      sightRadius: 1,
      technology: "MOUNTED_ARCHERY",
      mayUsePrimaryActionAfterMove: true,
      abilities: ["ATTACK", "DASH", "TWO_SHOTS"],
    });
  });

  it("keeps the first nonlethal shot open and makes the second shot terminal", () => {
    const state = battle(
      "HORSE_ARCHER",
      "GUARD",
      { x: 2, y: 2 },
      { x: 4, y: 2 },
    );
    const archer = required(state.units[0], "Horse Archer missing");
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
        attacksRemaining: 1,
        advances: false,
      },
    });
    expect(
      first.state.units.find((unit) => unit.id === archer.id)?.activation,
    ).toMatchObject({
      attacked: true,
      attacksUsed: 1,
      handled: false,
    });
    const second = applyCommandV7(first.state, state.humanPlayerId, {
      kind: "ATTACK",
      unitId: archer.id,
      targetUnitId: guard.id,
    });
    expect(second.accepted).toBe(true);
    if (!second.accepted) return;
    expect(
      second.state.units.find((unit) => unit.id === archer.id)?.activation,
    ).toMatchObject({
      attacksUsed: 2,
      handled: true,
    });
  });

  it("allows unit switching and advisory Wait between guaranteed shots", () => {
    let state = battle("HORSE_ARCHER", "GUARD", { x: 2, y: 2 }, { x: 4, y: 2 });
    const archer = required(
      state.units.find((unit) => unit.ownerId === state.humanPlayerId),
      "Horse Archer missing",
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
      state.units.find((unit) => unit.ownerId !== state.humanPlayerId),
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
    if (!waited.accepted) throw new Error(waited.error.code);
    expect(
      waited.state.units.find((unit) => unit.id === archer.id)?.activation,
    ).toMatchObject({
      attacksUsed: 1,
      handled: true,
    });
    expect(
      queryPlayerCommandsV7(waited.state, state.humanPlayerId),
    ).toContainEqual({
      kind: "ATTACK",
      unitId: archer.id,
      targetUnitId: target.id,
    });
  });

  it("locks movement and other actions after the first shot", () => {
    const state = battle(
      "HORSE_ARCHER",
      "GUARD",
      { x: 2, y: 2 },
      { x: 4, y: 2 },
    );
    const archer = required(state.units[0], "Horse Archer missing");
    const target = required(state.units[1], "target missing");
    const first = applyCommandV7(state, state.humanPlayerId, {
      kind: "ATTACK",
      unitId: archer.id,
      targetUnitId: target.id,
    });
    if (!first.accepted) throw new Error(first.error.code);
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

  it("never advances after an adjacent kill while Marksman still advances", () => {
    for (const [role, expectedAdvance] of [
      ["HORSE_ARCHER", false],
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

  it("preserves usage through promotion and resets only at next Start Turn", () => {
    let state = battle("HORSE_ARCHER", "GUARD", { x: 2, y: 2 }, { x: 4, y: 2 });
    const archer = required(
      state.units.find((unit) => unit.ownerId === state.humanPlayerId),
      "Horse Archer missing",
    );
    state = checkedV7({
      ...state,
      units: state.units.map((unit) =>
        unit.id === archer.id ? { ...unit, kills: 3 } : unit,
      ),
    });
    const target = required(
      state.units.find((unit) => unit.ownerId !== state.humanPlayerId),
      "target missing",
    );
    const first = applyCommandV7(state, state.humanPlayerId, {
      kind: "ATTACK",
      unitId: archer.id,
      targetUnitId: target.id,
    });
    if (!first.accepted) throw new Error(first.error.code);
    const promoted = applyCommandV7(first.state, state.humanPlayerId, {
      kind: "PROMOTE",
      unitId: archer.id,
    });
    if (!promoted.accepted) throw new Error(promoted.error.code);
    expect(
      promoted.state.units.find((unit) => unit.id === archer.id)?.activation
        .attacksUsed,
    ).toBe(1);
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

  it("trains newborn Horse Archers fully exhausted", () => {
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
      role: "HORSE_ARCHER",
    });
    if (!trained.accepted) throw new Error(trained.error.code);
    expect(
      trained.state.units.find((unit) => unit.ownerId === state.humanPlayerId)
        ?.activation,
    ).toMatchObject({
      attacksUsed: 2,
      attacked: true,
      handled: true,
    });
  });

  it("offers attacks after Dash from the final coordinate", () => {
    const state = battle(
      "HORSE_ARCHER",
      "FIGHTER",
      { x: 1, y: 2 },
      { x: 5, y: 2 },
    );
    const archer = required(state.units[0], "Horse Archer missing");
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

  it("retains Catapult range, Charge, Breach, Push, and ordinary action locks", () => {
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
      "BREACHER",
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
      breachApplied: true,
      defenseBonusNumerator: 1,
      defenseBonusDenominator: 1,
    });
    const push = battle("HEAVY", "GUARD", { x: 2, y: 2 }, { x: 3, y: 2 });
    const heavy = required(push.units[0], "Heavy missing");
    const pushTarget = required(push.units[1], "target missing");
    const pushed = applyCommandV7(push, push.humanPlayerId, {
      kind: "ATTACK",
      unitId: heavy.id,
      targetUnitId: pushTarget.id,
    });
    expect(
      pushed.accepted &&
        pushed.events.some((event) => event.kind === "UNIT_PUSHED"),
    ).toBe(true);
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
    const base = battle("SCOUT", "FIGHTER", { x: 2, y: 2 }, { x: 9, y: 9 });
    const withoutEngineering = checkedV7({
      ...base,
      players: base.players.map((player) =>
        player.id === base.humanPlayerId
          ? {
              ...player,
              researchedTechs: player.researchedTechs.filter(
                (tech) =>
                  tech !== "ENGINEERING" &&
                  tech !== "METALLURGY" &&
                  tech !== "GRAND_WORKS",
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
    const scoutWithoutEngineering = required(
      withoutEngineering.units[0],
      "Scout missing",
    );
    expect(
      validateMovementPathV7(withoutEngineering, scoutWithoutEngineering, [
        { x: 3, y: 2 },
      ]),
    ).toEqual({
      legal: false,
      reason: "ENGINEERING_REQUIRED",
    });
    const withEngineering = checkedV7({
      ...withoutEngineering,
      players: base.players,
    });
    const scoutWithEngineering = required(
      withEngineering.units[0],
      "Scout missing",
    );
    expect(
      validateMovementPathV7(withEngineering, scoutWithEngineering, [
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
    const horse = battle(
      "HORSE_ARCHER",
      "FIGHTER",
      { x: 2, y: 4 },
      { x: 9, y: 9 },
    );
    const horseArcher = required(horse.units[0], "Horse Archer missing");
    expect(
      validateMovementPathV7(horse, horseArcher, [
        { x: 3, y: 4 },
        { x: 4, y: 4 },
        { x: 5, y: 4 },
      ]),
    ).toMatchObject({
      legal: true,
      spentPoints2: 6,
    });
  });

  it("retains one-draw treasure rewards, Heavy placement, and spawned sight", () => {
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
      result.state.players.find((player) => player.id === state.humanPlayerId)
        ?.explored,
    ).toContainEqual({ x: 0, y: 0 });
  });

  it("retains Heal, Recover, Wait, Promote, stat attribution, and idle recovery", () => {
    let state = battle("MEDIC", "FIGHTER", { x: 2, y: 2 }, { x: 9, y: 9 });
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
    const medic = required(state.units[0], "Medic missing");
    const healed = applyCommandV7(state, state.humanPlayerId, {
      kind: "HEAL_ADJACENT",
      unitId: medic.id,
      targetUnitId: target.id,
    });
    expect(
      healed.accepted &&
        healed.state.units.find((unit) => unit.id === target.id)?.hp,
    ).toBe(9);
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
    const waited = applyCommandV7(state, state.humanPlayerId, {
      kind: "WAIT",
      unitId: target.id,
    });
    if (!waited.accepted) throw new Error(waited.error.code);
    const recovered = applyCommandV7(waited.state, state.humanPlayerId, {
      kind: "RECOVER",
      unitId: target.id,
    });
    expect(
      recovered.accepted &&
        recovered.state.units.find((unit) => unit.id === target.id)?.hp,
    ).toBe(5);
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
    ).toBe(10);
  });
});

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
    blackoutEligibleRound: role === "SABOTEUR" ? 1 : null,
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
