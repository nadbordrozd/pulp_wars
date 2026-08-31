import { describe, expect, it } from "vitest";
import {
  ORIGINAL_BASELINE_TREE,
  RULESET_6_ID,
  SPATIAL_ECONOMY_REVISION,
  TECHNOLOGY_IDS,
  UNIT_ROLE_IDS,
  appendReplayCommandV6,
  applyCommandV6,
  calculateCombatPreviewV6,
  canonicalHash,
  createInitialMapStateV6,
  createReplayV6,
  effectiveRoleRuleV6,
  parseEventV6,
  parseGameStateV6,
  queryCombatPreviewV6,
  queryHealPreviewV6,
  queryPlayerCommandsV6,
  unitId,
  validateMovementPathV6,
  wallId,
  viewForV6,
  type CommandV6,
  type CoordV6,
  type GameStateV6,
  type MatchSetupV6,
  type TechnologyId,
  type UnitRoleId,
  type UnitStateV6,
} from "../../src/engine/index";
import { createSaveEnvelopeV6, parseSaveV6 } from "../../src/persistence/index";

const setup: MatchSetupV6 = {
  rulesetId: RULESET_6_ID,
  seed: 883,
  width: 11,
  height: 11,
  aiCount: 1,
  aiDifficulty: "NORMAL",
  aiMode: "RIVAL",
  humanColor: "CORAL",
  factions: ["ORIGINAL", "ORIGINAL"],
  mapGenerationRevision: SPATIAL_ECONOMY_REVISION,
};

const ALL_TECHS = [...TECHNOLOGY_IDS] as readonly TechnologyId[];
const FRESH = {
  moved: false,
  movedPathLength: 0,
  attacked: false,
  healed: false,
  recovered: false,
  captured: false,
  handled: false,
  specialActed: false,
} as const;

type MovementAbilityCase = readonly [
  roleId: UnitRoleId,
  researched: boolean,
  allowed: boolean,
];

const FIELDCRAFT_CASES: readonly MovementAbilityCase[] =
  UNIT_ROLE_IDS.flatMap<MovementAbilityCase>((roleId) =>
    roleId === "SCOUT" || roleId === "MARKSMAN"
      ? [
          [roleId, true, true],
          [roleId, false, false],
        ]
      : [[roleId, true, false]],
  );

const MANEUVER_CASES: readonly MovementAbilityCase[] =
  UNIT_ROLE_IDS.flatMap<MovementAbilityCase>((roleId) =>
    roleId === "SCOUT" || roleId === "RAIDER"
      ? [
          [roleId, true, true],
          [roleId, false, false],
        ]
      : [[roleId, true, false]],
  );

describe("ruleset-6 Original baseline roster", () => {
  it("registers all nine exact Original role rows and eight trainable unlocks", () => {
    expect(
      UNIT_ROLE_IDS.map((role) => ORIGINAL_BASELINE_TREE.roleRules[role]),
    ).toEqual([
      role("FIGHTER", "Fighter", 2, 10, 4, 4, 1, 1, null, true),
      role("SCOUT", "Scout", 3, 10, 3, 2, 2, 1, "SCOUTING", true),
      role("MARKSMAN", "Marksman", 3, 10, 4, 2, 1, 2, "MARKSMANSHIP", true),
      role("GUARD", "Guard", 3, 15, 3, 6, 1, 1, "DRILL", false),
      role("RAIDER", "Raider", 4, 10, 5, 3, 2, 1, "RAIDING", true),
      role("MEDIC", "Medic", 4, 10, 1, 3, 1, 1, "MEDICINE", true),
      role("HEAVY", "Heavy", 5, 15, 6, 6, 1, 1, "METALLURGY", true),
      role("BREACHER", "Breacher", 5, 10, 8, 2, 1, 1, "EXPLOSIVES", false),
      role("JUGGERNAUT", "Juggernaut", null, 40, 8, 8, 1, 1, null, true),
    ]);
    expect(
      UNIT_ROLE_IDS.filter(
        (unitRole) => ORIGINAL_BASELINE_TREE.roleRules[unitRole].cost !== null,
      ),
    ).toEqual(UNIT_ROLE_IDS.slice(0, 8));
  });

  it.each(UNIT_ROLE_IDS.slice(0, 8))(
    "trains %s at exact cost with a monotonic exhausted identity",
    (unitRole) => {
      const state = trainingState(unitRole);
      const city = ownCity(state);
      const beforeRandom = state.random;
      const beforeCoins = ownPlayer(state).coins;
      const result = applyCommandV6(state, state.humanPlayerId, {
        kind: "TRAIN",
        cityId: city.id,
        role: unitRole,
      });
      expect(result.accepted).toBe(true);
      if (!result.accepted) return;
      const rule = effectiveRoleRuleV6("ORIGINAL", unitRole);
      const trained = must(
        result.state.units.find((unit) => unit.id === state.nextEntityId),
      );
      expect(trained).toMatchObject({
        ownerId: state.humanPlayerId,
        homeCityId: city.id,
        role: unitRole,
        at: city.at,
        hp: rule.maxHp,
        maxHp: rule.maxHp,
        kills: 0,
        veteran: false,
        captureEligible: false,
        activation: exhaustedActivation(),
      });
      expect(result.state.nextEntityId).toBe(state.nextEntityId + 1);
      expect(ownPlayer(result.state).coins).toBe(beforeCoins - must(rule.cost));
      expect(result.state.random).toEqual(beforeRandom);
      expect(result.events).toEqual([
        {
          kind: "UNIT_TRAINED",
          playerId: state.humanPlayerId,
          cityId: city.id,
          unitId: trained.id,
          role: unitRole,
          cost: rule.cost,
          at: city.at,
        },
      ]);
      expect(result.events.every((event) => parseEventV6(event).ok)).toBe(true);
    },
  );

  it("enforces Train precedence, center occupancy, level+1 capacity, and reward overcapacity", () => {
    const ready = trainingState("HEAVY");
    const city = ownCity(ready);
    const enemy = enemyCity(ready);
    expectRejected(
      applyCommandV6(ready, ready.humanPlayerId, {
        kind: "TRAIN",
        cityId: 999 as never,
        role: "FIGHTER",
      }),
      ready,
      "CITY_NOT_FOUND",
    );
    expectRejected(
      applyCommandV6(ready, ready.humanPlayerId, {
        kind: "TRAIN",
        cityId: enemy.id,
        role: "FIGHTER",
      }),
      ready,
      "CITY_NOT_OWNED",
    );
    const besieged = checked({
      ...ready,
      units: ready.units.map((unit) =>
        unit.ownerId !== ready.humanPlayerId ? { ...unit, at: city.at } : unit,
      ),
    });
    expectRejected(
      applyCommandV6(besieged, besieged.humanPlayerId, {
        kind: "TRAIN",
        cityId: city.id,
        role: "FIGHTER",
      }),
      besieged,
      "CITY_BESIEGED",
    );
    expectRejected(
      applyCommandV6(ready, ready.humanPlayerId, {
        kind: "TRAIN",
        cityId: city.id,
        role: "JUGGERNAUT",
      }),
      ready,
      "UNIT_ROLE_INVALID",
    );
    const locked = withOwnPlayer(ready, { researchedTechs: ["GATHERING"] });
    expectRejected(
      applyCommandV6(locked, locked.humanPlayerId, {
        kind: "TRAIN",
        cityId: city.id,
        role: "HEAVY",
      }),
      locked,
      "TECH_REQUIRED",
    );
    const occupied = checked({
      ...ready,
      units: ready.units.map((unit) =>
        unit.ownerId === ready.humanPlayerId ? { ...unit, at: city.at } : unit,
      ),
    });
    expectRejected(
      applyCommandV6(occupied, occupied.humanPlayerId, {
        kind: "TRAIN",
        cityId: city.id,
        role: "FIGHTER",
      }),
      occupied,
      "CITY_SPAWN_OCCUPIED",
    );
    const full = checked({
      ...ready,
      units: ready.units.map((unit) => ({
        ...unit,
        ownerId: ready.humanPlayerId,
        homeCityId: city.id,
      })),
    });
    expectRejected(
      applyCommandV6(full, full.humanPlayerId, {
        kind: "TRAIN",
        cityId: city.id,
        role: "FIGHTER",
      }),
      full,
      "CITY_CAPACITY_FULL",
    );
    const overCapacity = checked({
      ...full,
      units: [
        ...full.units,
        makeUnit(full, "JUGGERNAUT", full.humanPlayerId, city.id, openAt(full)),
      ],
      nextEntityId: full.nextEntityId + 1,
    });
    expect(
      overCapacity.units.filter((unit) => unit.homeCityId === city.id),
    ).toHaveLength(3);
    expect(
      queryPlayerCommandsV6(
        viewForV6(overCapacity, overCapacity.humanPlayerId),
      ).some(
        (command) => command.kind === "TRAIN" && command.cityId === city.id,
      ),
    ).toBe(false);
    const poor = withOwnPlayer(ready, { coins: 0 });
    expectRejected(
      applyCommandV6(poor, poor.humanPlayerId, {
        kind: "TRAIN",
        cityId: city.id,
        role: "FIGHTER",
      }),
      poor,
      "INSUFFICIENT_COINS",
    );
  });

  it.each([
    ["FIGHTER", true],
    ["SCOUT", true],
    ["MARKSMAN", true],
    ["GUARD", false],
    ["RAIDER", true],
    ["MEDIC", true],
    ["HEAVY", true],
    ["BREACHER", false],
    ["JUGGERNAUT", true],
  ] as const)(
    "uses the exact Move-follow-up matrix for %s",
    (attackerRole, allowed) => {
      const state = adjacentCombatState(attackerRole, "FIGHTER", {
        attackerActivation: {
          ...FRESH,
          moved: true,
          movedPathLength: 1,
          handled: true,
        },
      });
      const attacker = ownUnit(state);
      const defender = enemyUnit(state);
      const command: CommandV6 = {
        kind: "ATTACK",
        unitId: attacker.id,
        target: { kind: "UNIT", unitId: defender.id },
      };
      const offered = queryPlayerCommandsV6(
        viewForV6(state, state.humanPlayerId),
      );
      expect(
        offered.some(
          (candidate) => JSON.stringify(candidate) === JSON.stringify(command),
        ),
      ).toBe(allowed);
      const result = applyCommandV6(state, state.humanPlayerId, command);
      expect(result.accepted).toBe(allowed);
      if (!allowed && !result.accepted)
        expect(result.error.code).toBe("UNIT_ALREADY_ACTED");
    },
  );

  it.each(FIELDCRAFT_CASES)(
    "applies Fieldcraft Forest termination to %s (researched=%s)",
    (roleId, researched, allowed) => {
      const fixture = movementAbilityState(roleId, researched, "FIELDCRAFT");
      expectMovementPath(fixture, allowed, "FOREST_STOPS_MOVE");
    },
  );

  it.each(MANEUVER_CASES)(
    "applies Maneuver against known hostile ZOC to %s (researched=%s)",
    (roleId, researched, allowed) => {
      const fixture = movementAbilityState(roleId, researched, "MANEUVER");
      expectMovementPath(fixture, allowed, "ZOC_STOPS_MOVE");
    },
  );

  it("calculates exact half-unit damage, Charge, single defense bonuses, and Breach", () => {
    const plain = adjacentCombatState("FIGHTER", "FIGHTER");
    const plainPreview = calculateCombatPreviewV6(plain, ownUnit(plain).id, {
      kind: "UNIT",
      unitId: enemyUnit(plain).id,
    });
    expect(plainPreview).toMatchObject({
      attack2: 4,
      chargeApplied: false,
      defenseBonusNumerator: 1,
      defenseBonusDenominator: 1,
      damageToDefender: 5,
      damageToAttacker: 5,
      breachApplied: false,
    });

    const charged = adjacentCombatState("RAIDER", "FIGHTER", {
      attackerActivation: {
        ...FRESH,
        moved: true,
        movedPathLength: 2,
        handled: true,
      },
    });
    expect(
      calculateCombatPreviewV6(charged, ownUnit(charged).id, {
        kind: "UNIT",
        unitId: enemyUnit(charged).id,
      }),
    ).toMatchObject({ attack2: 7, chargeApplied: true });

    const fortified = cityDefenseState("FIGHTER", "FIGHTER", "FORTIFICATION");
    expect(previewUnits(fortified)).toMatchObject({
      defenseBonusNumerator: 2,
      defenseBonusDenominator: 1,
    });
    const plainCity = cityDefenseState("FIGHTER", "FIGHTER", "PLAIN");
    expect(previewUnits(plainCity)).toMatchObject({
      defenseBonusNumerator: 3,
      defenseBonusDenominator: 2,
    });
    const walled = cityDefenseState("FIGHTER", "GUARD", "WALLS");
    expect(previewUnits(walled)).toMatchObject({
      defenseBonusNumerator: 4,
      defenseBonusDenominator: 1,
    });
    const breached = cityDefenseState("BREACHER", "GUARD", "WALLS");
    expect(previewUnits(breached)).toMatchObject({
      breachApplied: true,
      defenseBonusNumerator: 1,
      defenseBonusDenominator: 1,
    });
    for (const terrain of ["FOREST", "MOUNTAIN"] as const) {
      expect(
        previewUnits(
          withDefenderTerrain(
            adjacentCombatState("FIGHTER", "FIGHTER"),
            terrain,
          ),
        ),
      ).toMatchObject({
        defenseBonusNumerator: 3,
        defenseBonusDenominator: 2,
      });
    }
  });

  it("makes retaliation independent of defender exploration while target legality remains explored", () => {
    const base = adjacentCombatState("FIGHTER", "FIGHTER");
    const attacker = ownUnit(base);
    const defender = enemyUnit(base);
    const withDefenderSight = checked({
      ...base,
      players: base.players.map((player) =>
        player.id === defender.ownerId
          ? {
              ...player,
              explored: base.board.tiles
                .map((tile) => tile.at)
                .filter(
                  (at) =>
                    same(at, attacker.at) ||
                    player.explored.some((explored) => same(explored, at)),
                ),
            }
          : player,
      ),
    });
    const withoutDefenderSight = checked({
      ...withDefenderSight,
      players: withDefenderSight.players.map((player) =>
        player.id === defender.ownerId
          ? {
              ...player,
              explored: player.explored.filter(
                (explored) => !same(explored, attacker.at),
              ),
            }
          : player,
      ),
    });
    const publicWithSight = viewForV6(
      withDefenderSight,
      withDefenderSight.humanPlayerId,
    );
    const publicWithoutSight = viewForV6(
      withoutDefenderSight,
      withoutDefenderSight.humanPlayerId,
    );
    expect(JSON.stringify(publicWithSight)).toBe(
      JSON.stringify(publicWithoutSight),
    );

    const target = { kind: "UNIT", unitId: defender.id } as const;
    const publicPreview = queryCombatPreviewV6(
      publicWithSight,
      attacker.id,
      target,
    );
    expect(publicPreview).not.toBeNull();
    expect(publicPreview).toEqual(
      queryCombatPreviewV6(publicWithoutSight, attacker.id, target),
    );
    expect(publicPreview).toEqual(
      calculateCombatPreviewV6(withDefenderSight, attacker.id, target),
    );
    expect(publicPreview).toEqual(
      calculateCombatPreviewV6(withoutDefenderSight, attacker.id, target),
    );
    expect(publicPreview).toMatchObject({
      noRetaliationReason: null,
      attackerDies: false,
    });
    expect(must(publicPreview).damageToAttacker).toBeGreaterThan(0);

    const withResult = attackUnits(withDefenderSight);
    const withoutResult = attackUnits(withoutDefenderSight);
    expect(withResult.accepted).toBe(true);
    expect(withoutResult.accepted).toBe(true);
    if (!withResult.accepted || !withoutResult.accepted) return;
    expect(withResult.events).toEqual(withoutResult.events);
    expect(withResult.state.units).toEqual(withoutResult.state.units);
    expect(ownUnit(withResult.state).hp).toBe(
      attacker.hp - must(publicPreview).damageToAttacker,
    );

    const targetUnexplored = checked({
      ...withDefenderSight,
      players: withDefenderSight.players.map((player) =>
        player.id === withDefenderSight.humanPlayerId
          ? {
              ...player,
              explored: player.explored.filter(
                (explored) => !same(explored, defender.at),
              ),
            }
          : player,
      ),
    });
    const unexploredView = viewForV6(
      targetUnexplored,
      targetUnexplored.humanPlayerId,
    );
    expect(
      queryPlayerCommandsV6(unexploredView).some(
        (command) =>
          command.kind === "ATTACK" && command.unitId === attacker.id,
      ),
    ).toBe(false);
    expect(
      queryCombatPreviewV6(unexploredView, attacker.id, target),
    ).toBeNull();
    const rejected = attackUnits(targetUnexplored);
    expectRejected(rejected, targetUnexplored, "ATTACK_NOT_LEGAL");
    if (!rejected.accepted) {
      expect(rejected.error.params).toEqual({ reason: "TARGET_UNEXPLORED" });
    }
  });

  it("resolves combat, deaths, melee/ranged advance, promotion, and no PRNG", () => {
    let melee = adjacentCombatState("FIGHTER", "FIGHTER");
    melee = checked({
      ...melee,
      units: melee.units.map((unit) =>
        unit.ownerId === melee.humanPlayerId
          ? { ...unit, kills: 2 }
          : { ...unit, hp: 1 },
      ),
    });
    const attackerAt = ownUnit(melee).at;
    const defenderAt = enemyUnit(melee).at;
    const random = melee.random;
    const result = applyCommandV6(melee, melee.humanPlayerId, {
      kind: "ATTACK",
      unitId: ownUnit(melee).id,
      target: { kind: "UNIT", unitId: enemyUnit(melee).id },
    });
    expect(result.accepted).toBe(true);
    if (!result.accepted) return;
    expect(result.state.random).toEqual(random);
    expect(result.events.map((event) => event.kind)).toEqual([
      "COMBAT_RESOLVED",
      "UNIT_DIED",
      "UNIT_MOVED",
    ]);
    expect(result.events.every((event) => parseEventV6(event).ok)).toBe(true);
    expect(ownUnit(result.state)).toMatchObject({ at: defenderAt, kills: 3 });
    expect(ownUnit(result.state).at).not.toEqual(attackerAt);
    const promoted = applyCommandV6(result.state, result.state.humanPlayerId, {
      kind: "PROMOTE",
      unitId: ownUnit(result.state).id,
    });
    expect(promoted.accepted).toBe(true);
    if (!promoted.accepted) return;
    expect(ownUnit(promoted.state)).toMatchObject({
      veteran: true,
      hp: 15,
      maxHp: 15,
    });

    let ranged = rangedCombatState("MARKSMAN", "FIGHTER", 2);
    ranged = checked({
      ...ranged,
      units: ranged.units.map((unit) =>
        unit.ownerId === ranged.humanPlayerId ? unit : { ...unit, hp: 1 },
      ),
    });
    const rangedAt = ownUnit(ranged).at;
    const rangedResult = applyCommandV6(ranged, ranged.humanPlayerId, {
      kind: "ATTACK",
      unitId: ownUnit(ranged).id,
      target: { kind: "UNIT", unitId: enemyUnit(ranged).id },
    });
    expect(rangedResult.accepted).toBe(true);
    if (!rangedResult.accepted) return;
    expect(ownUnit(rangedResult.state).at).toEqual(rangedAt);
    expect(rangedResult.events.map((event) => event.kind)).toEqual([
      "COMBAT_RESOLVED",
      "UNIT_DIED",
    ]);
  });

  it("previews and resolves Heavy/Juggernaut Push without fog, capture, or invalid cells", () => {
    for (const sourceRole of ["HEAVY", "JUGGERNAUT"] as const) {
      const state = linearCombatState(sourceRole, "GUARD");
      const preview = previewUnits(state);
      expect(preview.push).toBe("WILL_PUSH");
      const from = enemyUnit(state).at;
      const result = attackUnits(state);
      expect(result.accepted).toBe(true);
      if (!result.accepted) continue;
      const pushed = enemyUnit(result.state);
      expect(pushed.at).toEqual({ x: from.x + 1, y: from.y });
      expect(pushed.captureEligible).toBe(false);
      expect(result.events.at(-1)).toEqual({
        kind: "UNIT_PUSHED",
        sourceUnitId: ownUnit(state).id,
        targetUnitId: enemyUnit(state).id,
        from,
        to: pushed.at,
      });
    }

    const fogged = withBehindFog(linearCombatState("HEAVY", "FIGHTER"));
    const publicPreview = queryCombatPreviewV6(
      viewForV6(fogged, fogged.humanPlayerId),
      ownUnit(fogged).id,
      { kind: "UNIT", unitId: enemyUnit(fogged).id },
    );
    expect(publicPreview?.push).toBe("UNKNOWN_BEHIND_FOG");
    const fogResult = attackUnits(fogged);
    expect(fogResult.accepted).toBe(true);
    if (fogResult.accepted) {
      expect(enemyUnit(fogResult.state).at).toEqual(enemyUnit(fogged).at);
      expect(
        fogResult.events.some((event) => event.kind === "UNIT_PUSHED"),
      ).toBe(false);
    }

    const blocked = withBehindSite(linearCombatState("HEAVY", "FIGHTER"));
    expect(previewUnits(blocked).push).toBe("BLOCKED");
    for (const blockedState of [
      withBehindMountain(linearCombatState("HEAVY", "FIGHTER")),
      withBehindUnit(linearCombatState("HEAVY", "FIGHTER")),
      withBehindWall(linearCombatState("HEAVY", "FIGHTER")),
    ]) {
      expect(previewUnits(blockedState).push).toBe("BLOCKED");
    }
  });

  it("heals only an adjacent owned damaged unit in exact order for 4 or 6", () => {
    const state = healState();
    const medic = ownUnit(state);
    const target = state.units.find(
      (unit) => unit.id !== medic.id,
    ) as UnitStateV6;
    expect(
      queryHealPreviewV6(
        viewForV6(state, state.humanPlayerId),
        medic.id,
        target.id,
      ),
    ).toEqual({
      medicId: medic.id,
      targetUnitId: target.id,
      amount: 4,
      hpAfter: 7,
    });
    const healed = applyCommandV6(state, state.humanPlayerId, {
      kind: "HEAL_ADJACENT",
      unitId: medic.id,
      targetUnitId: target.id,
    });
    expect(healed.accepted).toBe(true);
    if (!healed.accepted) return;
    expect(healed.events).toEqual([
      {
        kind: "UNIT_HEALED",
        medicId: medic.id,
        targetUnitId: target.id,
        amount: 4,
        hpAfter: 7,
      },
    ]);

    const recovery = withOwnPlayer(state, { researchedTechs: ALL_TECHS });
    expect(
      queryHealPreviewV6(
        viewForV6(recovery, recovery.humanPlayerId),
        medic.id,
        target.id,
      )?.amount,
    ).toBe(6);
    const wrongRole = adjacentCombatState("FIGHTER", "FIGHTER");
    expectRejected(
      applyCommandV6(wrongRole, wrongRole.humanPlayerId, {
        kind: "HEAL_ADJACENT",
        unitId: ownUnit(wrongRole).id,
        targetUnitId: unitId(999),
      }),
      wrongRole,
      "UNIT_ROLE_INVALID",
    );
    const missing = checked({
      ...state,
      units: state.units.map((unit) =>
        unit.id === medic.id
          ? { ...unit, activation: { ...unit.activation, attacked: true } }
          : unit,
      ),
    });
    expectRejected(
      applyCommandV6(missing, missing.humanPlayerId, {
        kind: "HEAL_ADJACENT",
        unitId: medic.id,
        targetUnitId: unitId(999),
      }),
      missing,
      "UNIT_ALREADY_ACTED",
    );
    const hostile = adjacentCombatState("MEDIC", "FIGHTER");
    expectRejected(
      applyCommandV6(hostile, hostile.humanPlayerId, {
        kind: "HEAL_ADJACENT",
        unitId: ownUnit(hostile).id,
        targetUnitId: enemyUnit(hostile).id,
      }),
      hostile,
      "HEAL_TARGET_NOT_OWNED",
    );
    const full = checked({
      ...state,
      units: state.units.map((unit) =>
        unit.id === target.id ? { ...unit, hp: unit.maxHp } : unit,
      ),
    });
    expectRejected(
      applyCommandV6(full, full.humanPlayerId, {
        kind: "HEAL_ADJACENT",
        unitId: medic.id,
        targetUnitId: target.id,
      }),
      full,
      "HEAL_TARGET_FULL",
    );
  });

  it.each([
    ["missing", "HEAL_TARGET_NOT_FOUND"],
    ["same-owner nonadjacent", "HEAL_TARGET_NOT_ADJACENT"],
    ["self", "HEAL_TARGET_NOT_ADJACENT"],
  ] as const)(
    "rejects a %s Heal target atomically with %s",
    (branch, errorCode) => {
      let state = healState();
      const medic = ownUnit(state);
      const target = must(
        state.units.find((candidate) => candidate.id !== medic.id),
      );
      if (branch === "same-owner nonadjacent") {
        const at = must(
          state.board.tiles.find(
            (tile) =>
              tile.site === null &&
              !state.units.some((unit) => same(unit.at, tile.at)) &&
              Math.max(
                Math.abs(tile.at.x - medic.at.x),
                Math.abs(tile.at.y - medic.at.y),
              ) > 1,
          ),
        ).at;
        state = checked({
          ...state,
          units: state.units.map((candidate) =>
            candidate.id === target.id ? { ...candidate, at } : candidate,
          ),
        });
      }
      const targetUnitId =
        branch === "missing"
          ? unitId(999)
          : branch === "self"
            ? medic.id
            : target.id;
      expectRejected(
        applyCommandV6(state, state.humanPlayerId, {
          kind: "HEAL_ADJACENT",
          unitId: medic.id,
          targetUnitId,
        }),
        state,
        errorCode,
      );
    },
  );

  it("keeps Wait non-blocking, explicit recovery at 4/2, and idle Recovery at friendly 6", () => {
    let state = friendlyRecoveryState();
    const unit = ownUnit(state);
    const waited = applyCommandV6(state, state.humanPlayerId, {
      kind: "WAIT",
      unitId: unit.id,
    });
    expect(waited.accepted).toBe(true);
    if (!waited.accepted) return;
    expect(
      waited.state.units.find((candidate) => candidate.id === unit.id)
        ?.activation,
    ).toEqual({
      ...unit.activation,
      handled: true,
    });
    expect(
      queryPlayerCommandsV6(
        viewForV6(waited.state, waited.state.humanPlayerId),
      ),
    ).toContainEqual({ kind: "RECOVER", unitId: unit.id });
    expectRejected(
      applyCommandV6(waited.state, waited.state.humanPlayerId, {
        kind: "WAIT",
        unitId: unit.id,
      }),
      waited.state,
      "UNIT_ALREADY_HANDLED",
    );

    const explicit = applyCommandV6(state, state.humanPlayerId, {
      kind: "RECOVER",
      unitId: unit.id,
    });
    expect(explicit.accepted).toBe(true);
    if (explicit.accepted)
      expect(explicit.events[0]).toMatchObject({ amount: 4, automatic: false });

    const outside = outsideRecoveryState();
    const outsideResult = applyCommandV6(outside, outside.humanPlayerId, {
      kind: "RECOVER",
      unitId: ownUnit(outside).id,
    });
    expect(outsideResult.accepted).toBe(true);
    if (outsideResult.accepted) {
      expect(outsideResult.events[0]).toMatchObject({
        amount: 2,
        automatic: false,
      });
    }

    state = withOwnPlayer(state, { researchedTechs: ALL_TECHS });
    const waitAgain = applyCommandV6(state, state.humanPlayerId, {
      kind: "WAIT",
      unitId: unit.id,
    });
    if (!waitAgain.accepted) throw new Error(waitAgain.error.code);
    const ended = applyCommandV6(
      waitAgain.state,
      waitAgain.state.humanPlayerId,
      { kind: "END_TURN" },
    );
    expect(ended.accepted).toBe(true);
    if (!ended.accepted) return;
    expect(ended.events[0]).toEqual({
      kind: "UNIT_RECOVERED",
      unitId: unit.id,
      amount: 6,
      automatic: true,
    });

    const outsideWithRecovery = withOwnPlayer(outsideRecoveryState(), {
      researchedTechs: ALL_TECHS,
    });
    const outsideEnd = applyCommandV6(
      outsideWithRecovery,
      outsideWithRecovery.humanPlayerId,
      { kind: "END_TURN" },
    );
    expect(outsideEnd.accepted).toBe(true);
    if (outsideEnd.accepted) {
      expect(outsideEnd.events[0]).toEqual({
        kind: "UNIT_RECOVERED",
        unitId: ownUnit(outsideWithRecovery).id,
        amount: 2,
        automatic: true,
      });
    }
  });

  it.each([
    "moved",
    "attacked",
    "healed",
    "recovered",
    "captured",
    "specialActed",
  ] as const)("disqualifies End-Turn auto-recovery after %s", (flag) => {
    const base = withOwnPlayer(friendlyRecoveryState(), {
      researchedTechs: ALL_TECHS,
    });
    const unit = ownUnit(base);
    const state = checked({
      ...base,
      units: base.units.map((candidate) =>
        candidate.id === unit.id
          ? {
              ...candidate,
              activation: {
                ...candidate.activation,
                [flag]: true,
                handled: true,
              },
            }
          : candidate,
      ),
    });
    const ended = applyCommandV6(state, state.humanPlayerId, {
      kind: "END_TURN",
    });
    expect(ended.accepted).toBe(true);
    if (ended.accepted) {
      expect(
        ended.events.some(
          (event) =>
            event.kind === "UNIT_RECOVERED" && event.unitId === unit.id,
        ),
      ).toBe(false);
      expect(ownUnit(ended.state).hp).toBe(unit.hp);
    }
  });

  it("marks Capture only on the next Start Turn, clears it on movement, and enforces role restrictions", () => {
    let state = captureState("FIGHTER");
    const unit = ownUnit(state);
    expectRejected(
      applyCommandV6(state, state.humanPlayerId, {
        kind: "CAPTURE",
        unitId: unit.id,
      }),
      state,
      "CAPTURE_NOT_ELIGIBLE",
    );
    state = cycleToOwnStart(state);
    expect(ownUnit(state).captureEligible).toBe(true);
    expect(
      queryPlayerCommandsV6(viewForV6(state, state.humanPlayerId)),
    ).toContainEqual({
      kind: "CAPTURE",
      unitId: ownUnit(state).id,
    });
    const move = must(
      queryPlayerCommandsV6(viewForV6(state, state.humanPlayerId)).find(
        (command): command is Extract<CommandV6, { readonly kind: "MOVE" }> =>
          command.kind === "MOVE" && command.unitId === ownUnit(state).id,
      ),
    );
    const moved = applyCommandV6(state, state.humanPlayerId, move);
    expect(moved.accepted).toBe(true);
    if (moved.accepted)
      expect(ownUnit(moved.state).captureEligible).toBe(false);
    const captured = applyCommandV6(state, state.humanPlayerId, {
      kind: "CAPTURE",
      unitId: ownUnit(state).id,
    });
    expect(captured.accepted).toBe(true);
    if (captured.accepted) {
      expect(captured.events[0]?.kind).toBe("CITY_CAPTURED");
      expect(ownUnit(captured.state).captureEligible).toBe(false);
    }
  });

  it.each(UNIT_ROLE_IDS)(
    "applies the exact Start-Turn Capture matrix to %s",
    (roleId) => {
      const state = cycleToOwnStart(captureState(roleId));
      const unit = ownUnit(state);
      const allowed = roleId !== "MEDIC" && roleId !== "BREACHER";
      expect(unit.captureEligible).toBe(true);
      expect(
        queryPlayerCommandsV6(viewForV6(state, state.humanPlayerId)).some(
          (command) => command.kind === "CAPTURE" && command.unitId === unit.id,
        ),
      ).toBe(allowed);
      const result = applyCommandV6(state, state.humanPlayerId, {
        kind: "CAPTURE",
        unitId: unit.id,
      });
      expect(result.accepted).toBe(allowed);
      if (!allowed) {
        expectRejected(result, state, "CAPTURE_NOT_ELIGIBLE");
      }
    },
  );

  it("round-trips an accepted unit action through strict events, replay, save, and hash", () => {
    const state = trainingState("FIGHTER");
    const city = ownCity(state);
    const command = {
      kind: "TRAIN",
      cityId: city.id,
      role: "FIGHTER",
    } as const;
    const result = applyCommandV6(state, state.humanPlayerId, command);
    expect(result.accepted).toBe(true);
    if (!result.accepted) return;
    expect(parseGameStateV6(result.state)).toEqual(result.state);
    expect(result.events.every((event) => parseEventV6(event).ok)).toBe(true);
    const replay = appendReplayCommandV6(
      createReplayV6(setup),
      command,
      result.state,
    );
    expect(replay.checkpoints[0]?.stateHash).toBe(canonicalHash(result.state));
    const save = createSaveEnvelopeV6(
      { state: result.state, replay },
      "2026-08-31T22:00:00.000Z",
    );
    expect(parseSaveV6(JSON.stringify(save))).toEqual({ kind: "VALID", save });
  });
});

function initialState(): GameStateV6 {
  const created = createInitialMapStateV6(setup);
  if (!created.ok) throw new Error(created.error.code);
  const activeSeatIndex = created.state.turnOrder.indexOf(
    created.state.humanPlayerId,
  );
  return checked({
    ...created.state,
    activeSeatIndex,
    players: created.state.players.map((player) => ({
      ...player,
      explored: created.state.board.tiles.map((tile) => tile.at),
    })),
  });
}

function trainingState(unitRole: UnitRoleId): GameStateV6 {
  let state = initialState();
  const city = ownCity(state);
  const at = openAt(state, city.at);
  const needed = effectiveRoleRuleV6("ORIGINAL", unitRole).technology;
  state = checked({
    ...state,
    players: state.players.map((player) =>
      player.id === state.humanPlayerId
        ? {
            ...player,
            coins: 100,
            researchedTechs: needed === null ? ["GATHERING"] : ALL_TECHS,
          }
        : player,
    ),
    units: state.units.map((unit) =>
      unit.ownerId === state.humanPlayerId ? { ...unit, at } : unit,
    ),
  });
  return state;
}

function movementAbilityState(
  roleId: UnitRoleId,
  researched: boolean,
  ability: "FIELDCRAFT" | "MANEUVER",
): { readonly state: GameStateV6; readonly path: readonly CoordV6[] } {
  const state = initialState();
  const city = ownCity(state);
  const directions = [
    { x: 1, y: 0 },
    { x: -1, y: 0 },
    { x: 0, y: 1 },
    { x: 0, y: -1 },
  ] as const;
  for (const direction of directions) {
    const first = {
      x: city.at.x + direction.x,
      y: city.at.y + direction.y,
    };
    const second = {
      x: city.at.x + direction.x * 2,
      y: city.at.y + direction.y * 2,
    };
    const pathTiles = [first, second].map((at) =>
      state.board.tiles.find((tile) => same(tile.at, at)),
    );
    if (
      pathTiles.some(
        (tile) =>
          tile === undefined ||
          tile.site !== null ||
          state.units.some((unit) => same(unit.at, tile.at)) ||
          state.chocolateWalls.some((wall) => same(wall.at, tile.at)),
      )
    ) {
      continue;
    }
    const zocAt =
      ability === "MANEUVER"
        ? adjacentCoords(state, first).find(
            (at) =>
              !same(at, city.at) &&
              !same(at, second) &&
              state.board.tiles.some(
                (tile) => same(tile.at, at) && tile.site === null,
              ) &&
              !state.chocolateWalls.some((wall) => same(wall.at, at)),
          )
        : undefined;
    if (ability === "MANEUVER" && zocAt === undefined) continue;
    const rule = effectiveRoleRuleV6("ORIGINAL", roleId);
    return {
      state: checked({
        ...state,
        board: {
          ...state.board,
          tiles: state.board.tiles.map((tile) =>
            [first, second].some((at) => same(at, tile.at))
              ? {
                  ...tile,
                  terrain:
                    ability === "FIELDCRAFT" && same(tile.at, first)
                      ? ("FOREST" as const)
                      : ("GRASS" as const),
                  resource: null,
                  improvement: null,
                  site: null,
                  road: true,
                  territoryCityId: city.id,
                }
              : tile,
          ),
        },
        players: state.players.map((player) =>
          player.id === state.humanPlayerId
            ? {
                ...player,
                researchedTechs: researched ? ALL_TECHS : ["GATHERING"],
              }
            : player,
        ),
        units: state.units.map((unit) =>
          unit.ownerId === state.humanPlayerId
            ? {
                ...unit,
                role: roleId,
                at: city.at,
                hp: rule.maxHp,
                maxHp: rule.maxHp,
                activation: FRESH,
              }
            : ability === "MANEUVER"
              ? { ...unit, at: must(zocAt) }
              : unit,
        ),
      }),
      path: [first, second],
    };
  }
  throw new Error(`missing ${ability} movement fixture`);
}

function expectMovementPath(
  fixture: {
    readonly state: GameStateV6;
    readonly path: readonly CoordV6[];
  },
  allowed: boolean,
  stoppedReason: "FOREST_STOPS_MOVE" | "ZOC_STOPS_MOVE",
): void {
  const unit = ownUnit(fixture.state);
  const command = {
    kind: "MOVE",
    unitId: unit.id,
    path: fixture.path,
  } as const;
  const validation = validateMovementPathV6(fixture.state, unit, fixture.path);
  if (allowed) {
    expect(validation).toMatchObject({
      legal: true,
      destination: fixture.path[1],
    });
  } else {
    expect(validation).toEqual({ legal: false, reason: stoppedReason });
  }
  expect(
    queryPlayerCommandsV6(
      viewForV6(fixture.state, fixture.state.humanPlayerId),
    ).some(
      (candidate) => JSON.stringify(candidate) === JSON.stringify(command),
    ),
  ).toBe(allowed);
  const result = applyCommandV6(
    fixture.state,
    fixture.state.humanPlayerId,
    command,
  );
  expect(result.accepted).toBe(allowed);
  if (allowed && result.accepted) {
    expect(ownUnit(result.state).at).toEqual(fixture.path[1]);
  } else if (!allowed) {
    expectRejected(result, fixture.state, "MOVEMENT_ILLEGAL");
    if (!result.accepted) {
      expect(result.error.params).toEqual({ reason: stoppedReason });
    }
  }
}

function adjacentCombatState(
  attackerRole: UnitRoleId,
  defenderRole: UnitRoleId,
  options: { readonly attackerActivation?: UnitStateV6["activation"] } = {},
): GameStateV6 {
  const state = initialState();
  const [attackerAt, defenderAt] = adjacentOpenPair(state);
  return replaceCombatants(
    state,
    attackerRole,
    defenderRole,
    attackerAt,
    defenderAt,
    options,
  );
}

function rangedCombatState(
  attackerRole: UnitRoleId,
  defenderRole: UnitRoleId,
  distance: number,
): GameStateV6 {
  const state = initialState();
  const [attackerAt, , defenderAt] = horizontalOpenTriple(state);
  if (distance !== 2) throw new Error("test helper only supports range two");
  return replaceCombatants(
    state,
    attackerRole,
    defenderRole,
    attackerAt,
    defenderAt,
  );
}

function linearCombatState(
  attackerRole: UnitRoleId,
  defenderRole: UnitRoleId,
): GameStateV6 {
  const state = initialState();
  const [attackerAt, defenderAt] = horizontalOpenTriple(state);
  return replaceCombatants(
    state,
    attackerRole,
    defenderRole,
    attackerAt,
    defenderAt,
  );
}

function replaceCombatants(
  state: GameStateV6,
  attackerRole: UnitRoleId,
  defenderRole: UnitRoleId,
  attackerAt: CoordV6,
  defenderAt: CoordV6,
  options: { readonly attackerActivation?: UnitStateV6["activation"] } = {},
): GameStateV6 {
  return checked({
    ...state,
    players: state.players.map((player) => ({
      ...player,
      researchedTechs: ALL_TECHS,
    })),
    units: state.units.map((unit) => {
      const roleId =
        unit.ownerId === state.humanPlayerId ? attackerRole : defenderRole;
      const rule = effectiveRoleRuleV6("ORIGINAL", roleId);
      return {
        ...unit,
        role: roleId,
        at: unit.ownerId === state.humanPlayerId ? attackerAt : defenderAt,
        hp: rule.maxHp,
        maxHp: rule.maxHp,
        captureEligible: false,
        activation:
          unit.ownerId === state.humanPlayerId
            ? (options.attackerActivation ?? FRESH)
            : FRESH,
      };
    }),
  });
}

function cityDefenseState(
  attackerRole: UnitRoleId,
  defenderRole: UnitRoleId,
  defense: "PLAIN" | "FORTIFICATION" | "WALLS",
): GameStateV6 {
  let state = initialState();
  const city = enemyCity(state);
  const attackerAt = must(
    adjacentCoords(state, city.at).find(
      (at) => !state.cities.some((candidate) => same(at, candidate.at)),
    ),
  );
  state = replaceCombatants(
    state,
    attackerRole,
    defenderRole,
    attackerAt,
    city.at,
  );
  return checked({
    ...state,
    cities: state.cities.map((candidate) =>
      candidate.id === city.id && defense === "WALLS"
        ? {
            ...candidate,
            level: 3,
            population: -5,
            rewards: [{ reachedLevel: 3, reward: "WALLS" as const }],
          }
        : candidate,
    ),
    players: state.players.map((player) =>
      player.id === city.ownerId
        ? {
            ...player,
            researchedTechs:
              defense === "FORTIFICATION"
                ? (["GATHERING", "DRILL", "FORTIFICATION"] as const)
                : (["GATHERING"] as const),
          }
        : player,
    ),
  });
}

function healState(): GameStateV6 {
  let state = withOwnPlayer(adjacentCombatState("MEDIC", "FIGHTER"), {
    researchedTechs: ["GATHERING", "DRILL", "MEDICINE"],
  });
  state = checked({
    ...state,
    units: state.units.map((unit) =>
      unit.ownerId === state.humanPlayerId
        ? unit
        : { ...unit, ownerId: state.humanPlayerId, hp: 3 },
    ),
  });
  return state;
}

function friendlyRecoveryState(): GameStateV6 {
  const state = initialState();
  const city = ownCity(state);
  const unit = ownUnit(state);
  const at = must(
    state.board.tiles.find(
      (tile) => tile.territoryCityId === city.id && !same(tile.at, city.at),
    ),
  ).at;
  return checked({
    ...state,
    units: state.units.map((candidate) =>
      candidate.id === unit.id ? { ...candidate, at, hp: 2 } : candidate,
    ),
  });
}

function outsideRecoveryState(): GameStateV6 {
  const state = friendlyRecoveryState();
  const at = ownUnit(state).at;
  return checked({
    ...state,
    board: {
      ...state.board,
      tiles: state.board.tiles.map((tile) =>
        same(tile.at, at) ? { ...tile, territoryCityId: null } : tile,
      ),
    },
  });
}

function withDefenderTerrain(
  state: GameStateV6,
  terrain: "FOREST" | "MOUNTAIN",
): GameStateV6 {
  const at = enemyUnit(state).at;
  return checked({
    ...state,
    board: {
      ...state.board,
      tiles: state.board.tiles.map((tile) =>
        same(tile.at, at)
          ? { ...tile, terrain, resource: null, improvement: null }
          : tile,
      ),
    },
  });
}

function captureState(roleId: UnitRoleId): GameStateV6 {
  const state = initialState();
  const village = must(
    state.board.tiles.find((tile) => tile.site === "VILLAGE"),
  );
  const rule = effectiveRoleRuleV6("ORIGINAL", roleId);
  return checked({
    ...state,
    units: state.units.map((unit) =>
      unit.ownerId === state.humanPlayerId
        ? {
            ...unit,
            role: roleId,
            at: village.at,
            hp: rule.maxHp,
            maxHp: rule.maxHp,
            captureEligible: false,
            activation: FRESH,
          }
        : unit,
    ),
  });
}

function cycleToOwnStart(state: GameStateV6): GameStateV6 {
  let current = state;
  do {
    const actor = must(current.turnOrder[current.activeSeatIndex]);
    const ended = applyCommandV6(current, actor, { kind: "END_TURN" });
    if (!ended.accepted) throw new Error(ended.error.code);
    current = ended.state;
  } while (
    current.turnOrder[current.activeSeatIndex] !== current.humanPlayerId
  );
  return current;
}

function withBehindFog(state: GameStateV6): GameStateV6 {
  const attacker = ownUnit(state);
  const defender = enemyUnit(state);
  const behind = {
    x: defender.at.x + (defender.at.x - attacker.at.x),
    y: defender.at.y,
  };
  return withOwnPlayer(state, {
    explored: ownPlayer(state).explored.filter((at) => !same(at, behind)),
  });
}

function withBehindSite(state: GameStateV6): GameStateV6 {
  const attacker = ownUnit(state);
  const defender = enemyUnit(state);
  const behind = {
    x: defender.at.x + (defender.at.x - attacker.at.x),
    y: defender.at.y,
  };
  return checked({
    ...state,
    board: {
      ...state.board,
      tiles: state.board.tiles.map((tile) =>
        same(tile.at, behind)
          ? {
              ...tile,
              terrain: "GRASS" as const,
              resource: null,
              improvement: null,
              road: false,
              site: "VILLAGE" as const,
              territoryCityId: null,
            }
          : tile,
      ),
    },
  });
}

function withBehindMountain(state: GameStateV6): GameStateV6 {
  const behind = behindAt(state);
  const defenderOwner = enemyUnit(state).ownerId;
  return checked({
    ...state,
    board: {
      ...state.board,
      tiles: state.board.tiles.map((tile) =>
        same(tile.at, behind)
          ? {
              ...tile,
              terrain: "MOUNTAIN" as const,
              resource: null,
              improvement: null,
            }
          : tile,
      ),
    },
    players: state.players.map((player) =>
      player.id === defenderOwner
        ? { ...player, researchedTechs: ["GATHERING"] }
        : player,
    ),
  });
}

function withBehindUnit(state: GameStateV6): GameStateV6 {
  const city = ownCity(state);
  return checked({
    ...state,
    nextEntityId: state.nextEntityId + 1,
    units: [
      ...state.units,
      makeUnit(state, "FIGHTER", state.humanPlayerId, city.id, behindAt(state)),
    ],
  });
}

function withBehindWall(state: GameStateV6): GameStateV6 {
  return checked({
    ...state,
    nextEntityId: state.nextEntityId + 1,
    chocolateWalls: [
      ...state.chocolateWalls,
      {
        id: wallId(state.nextEntityId),
        ownerId: state.humanPlayerId,
        at: behindAt(state),
        hp: 10,
      },
    ],
  });
}

function behindAt(state: GameStateV6): CoordV6 {
  const attacker = ownUnit(state);
  const defender = enemyUnit(state);
  return {
    x: defender.at.x + (defender.at.x - attacker.at.x),
    y: defender.at.y + (defender.at.y - attacker.at.y),
  };
}

function previewUnits(state: GameStateV6) {
  return calculateCombatPreviewV6(state, ownUnit(state).id, {
    kind: "UNIT",
    unitId: enemyUnit(state).id,
  });
}

function attackUnits(state: GameStateV6) {
  return applyCommandV6(state, state.humanPlayerId, {
    kind: "ATTACK",
    unitId: ownUnit(state).id,
    target: { kind: "UNIT", unitId: enemyUnit(state).id },
  });
}

function withOwnPlayer(
  state: GameStateV6,
  values: Partial<GameStateV6["players"][number]>,
): GameStateV6 {
  return checked({
    ...state,
    players: state.players.map((player) =>
      player.id === state.humanPlayerId ? { ...player, ...values } : player,
    ),
  });
}

function makeUnit(
  state: GameStateV6,
  roleId: UnitRoleId,
  ownerId: GameStateV6["humanPlayerId"],
  homeCityId: GameStateV6["cities"][number]["id"],
  at: CoordV6,
): UnitStateV6 {
  const rule = effectiveRoleRuleV6("ORIGINAL", roleId);
  return {
    id: unitId(state.nextEntityId),
    ownerId,
    homeCityId,
    role: roleId,
    at,
    hp: rule.maxHp,
    maxHp: rule.maxHp,
    kills: 0,
    veteran: false,
    captureEligible: false,
    activation: exhaustedActivation(),
  };
}

function role(
  roleId: UnitRoleId,
  label: string,
  cost: number | null,
  maxHp: number,
  attack2: number,
  defense2: number,
  move: number,
  range: number,
  technology: TechnologyId | null,
  mayUsePrimaryActionAfterMove: boolean,
) {
  return expect.objectContaining({
    role: roleId,
    label,
    cost,
    maxHp,
    attack2,
    defense2,
    move,
    range,
    technology,
    mayUsePrimaryActionAfterMove,
  });
}

function exhaustedActivation(): UnitStateV6["activation"] {
  return {
    moved: true,
    movedPathLength: 0,
    attacked: true,
    healed: true,
    recovered: true,
    captured: true,
    handled: true,
    specialActed: true,
  };
}

function ownPlayer(state: GameStateV6) {
  return must(
    state.players.find((player) => player.id === state.humanPlayerId),
  );
}

function ownCity(state: GameStateV6) {
  return must(
    state.cities.find((city) => city.ownerId === state.humanPlayerId),
  );
}

function enemyCity(state: GameStateV6) {
  return must(
    state.cities.find((city) => city.ownerId !== state.humanPlayerId),
  );
}

function ownUnit(state: GameStateV6) {
  return must(state.units.find((unit) => unit.ownerId === state.humanPlayerId));
}

function enemyUnit(state: GameStateV6) {
  return must(state.units.find((unit) => unit.ownerId !== state.humanPlayerId));
}

function openAt(state: GameStateV6, near?: CoordV6): CoordV6 {
  const candidates =
    near === undefined
      ? state.board.tiles
      : adjacentCoords(state, near).map((at) =>
          must(state.board.tiles.find((tile) => same(tile.at, at))),
        );
  return must(
    candidates.find(
      (tile) =>
        tile.site === null &&
        !state.units.some((unit) => same(unit.at, tile.at)) &&
        !state.chocolateWalls.some((wall) => same(wall.at, tile.at)),
    ),
  ).at;
}

function adjacentOpenPair(state: GameStateV6): readonly [CoordV6, CoordV6] {
  for (const tile of state.board.tiles) {
    if (tile.site !== null) continue;
    const right = state.board.tiles.find(
      (candidate) =>
        candidate.at.x === tile.at.x + 1 &&
        candidate.at.y === tile.at.y &&
        candidate.site === null,
    );
    if (right !== undefined) return [tile.at, right.at];
  }
  throw new Error("No adjacent pair");
}

function horizontalOpenTriple(
  state: GameStateV6,
): readonly [CoordV6, CoordV6, CoordV6] {
  for (const left of state.board.tiles) {
    if (left.site !== null || left.at.x > state.board.width - 3) continue;
    const middle =
      state.board.tiles[left.at.y * state.board.width + left.at.x + 1];
    const right =
      state.board.tiles[left.at.y * state.board.width + left.at.x + 2];
    if (middle?.site === null && right?.site === null)
      return [left.at, middle.at, right.at];
  }
  throw new Error("No open triple");
}

function adjacentCoords(state: GameStateV6, center: CoordV6): CoordV6[] {
  return state.board.tiles
    .filter(
      (tile) =>
        !same(tile.at, center) &&
        Math.max(
          Math.abs(tile.at.x - center.x),
          Math.abs(tile.at.y - center.y),
        ) === 1,
    )
    .map((tile) => tile.at);
}

function checked(input: GameStateV6): GameStateV6 {
  const parsed = parseGameStateV6(input);
  if (parsed === null) throw new Error("Invalid test state");
  return parsed;
}

function expectRejected(
  result: ReturnType<typeof applyCommandV6>,
  state: GameStateV6,
  code: string,
): void {
  expect(result.accepted).toBe(false);
  if (result.accepted) return;
  expect(result.error.code).toBe(code);
  expect(result.state).toBe(state);
  expect(result.events).toEqual([]);
}

function must<T>(value: T | undefined | null): T {
  if (value === undefined || value === null)
    throw new Error("Missing test value");
  return value;
}

function same(left: CoordV6, right: CoordV6): boolean {
  return left.x === right.x && left.y === right.y;
}
