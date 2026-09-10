/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { describe, expect, it } from "vitest";
import {
  applyCommandV7,
  cityIncomeV7,
  cityUnitCapacityV7,
  createInitialMapStateV7,
  parseEventEnvelopeV7,
  parseGameStateV7,
  previewBlackoutV7,
  projectEventsV7,
  queryPlayerCommandsV7,
  viewForV7,
  type CityBlackoutV7,
  type CityStateV7,
  type CommandV7,
  type CoordV7,
  type GameStateV7,
  type PlayerId,
  type UnitRoleIdV7,
  type UnitStateV7,
} from "../../src/engine/index";
import { checkedV7, setupV7 } from "../fixtures/v7-builders";

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

const HP: Record<UnitRoleIdV7, number> = {
  FIGHTER: 10,
  SCOUT: 10,
  MARKSMAN: 10,
  GUARD: 15,
  RAIDER: 10,
  MEDIC: 10,
  CATAPULT: 10,
  SABOTEUR: 10,
  HEAVY: 20,
  HORSE_ARCHER: 10,
  BREACHER: 15,
  JUGGERNAUT: 40,
};

describe("ruleset-7 Saboteur Blackout", () => {
  it.each(
    ([2, 3, 4] as const).flatMap((seatCount) =>
      Array.from({ length: seatCount }, (_, sourceSeat) =>
        Array.from({ length: seatCount }, (_, targetSeat) =>
          sourceSeat === targetSeat
            ? []
            : [[seatCount, sourceSeat, targetSeat] as const],
        ).flat(),
      ).flat(),
    ),
  )(
    "gives exactly one affected and one complete unaffected owner turn (%i seats, %i -> %i)",
    (seatCount, sourceSeat, targetSeat) => {
      let state = blackoutScenario(seatCount, sourceSeat, targetSeat);
      const source = required(state.units[0], "Saboteur missing");
      const target = required(
        state.cities.find(
          (city) => city.ownerId === state.turnOrder[targetSeat],
        ),
        "target city missing",
      );
      const command: Extract<CommandV7, { kind: "BLACKOUT_CITY" }> = {
        kind: "BLACKOUT_CITY",
        unitId: source.id,
        cityId: target.id,
      };
      expect(
        queryPlayerCommandsV7(viewForV7(state, source.ownerId)),
      ).toContainEqual(command);
      expect(previewBlackoutV7(state, source.ownerId, command)).toMatchObject({
        ok: true,
        preview: {
          detectingSources: [],
          unitDetectionBlocks: false,
          cityDetectionBlocks: false,
          actionRound: 1,
          nextEligibleRound: 4,
          incomeDenial: {
            suppressionCap: 3,
            exactFutureSuppressedCoins: null,
          },
          prospective: true,
        },
      });
      const planted = applyCommandV7(state, source.ownerId, command);
      if (!planted.accepted) throw new Error(planted.error.code);
      state = planted.state;
      const targetCoinsBefore = state.players.find(
        (player) => player.id === target.ownerId,
      )!.coins;
      const preBlackoutIncome = cityIncomeV7(
        state,
        state.cities.find((city) => city.id === target.id)!,
      );
      expect(
        state.cities.find((city) => city.id === target.id)?.blackout,
      ).toEqual({
        phase: "PENDING",
        sourceUnitId: source.id,
        sourceOwnerId: source.ownerId,
        plantedRound: 1,
      });
      expect(state.units.find((unit) => unit.id === source.id)).toMatchObject({
        blackoutEligibleRound: 4,
        activation: { handled: true, specialActed: true },
      });
      expect(planted.events).toEqual([
        {
          kind: "BLACKOUT_PLANTED",
          cityId: target.id,
          sourceUnitId: source.id,
          sourceOwnerId: source.ownerId,
          targetOwnerId: target.ownerId,
          actionRound: 1,
          eligibleRound: 4,
        },
        {
          kind: "SABOTEUR_EXPOSED",
          unitId: source.id,
          anchorPlayerId: target.ownerId,
          reason: "BLACKOUT",
        },
      ]);

      let targetStartEvents: ReturnType<typeof endTurn>["events"] = [];
      while (activePlayerId(state) !== target.ownerId) {
        const advanced = endTurn(state);
        state = advanced.state;
        if (activePlayerId(state) === target.ownerId)
          targetStartEvents = advanced.events;
      }
      const activeBlackout = state.cities.find(
        (city) => city.id === target.id,
      )?.blackout;
      expect(activeBlackout).toMatchObject({
        phase: "ACTIVE",
        suppressedCoins: Math.min(3, preBlackoutIncome),
      });
      expect(
        targetStartEvents.findIndex(
          (event) => event.kind === "BLACKOUT_ACTIVATED",
        ),
      ).toBeLessThan(
        targetStartEvents.findIndex((event) => event.kind === "INCOME_AWARDED"),
      );
      const targetPlayer = required(
        state.players.find((player) => player.id === target.ownerId),
        "target player missing",
      );
      expect(targetPlayer.coins).toBe(
        targetCoinsBefore - Math.min(3, preBlackoutIncome) + preBlackoutIncome,
      );
      const affectedEnd = endTurn(state);
      state = affectedEnd.state;
      const coinsAfterAffectedTurn = targetPlayer.coins;
      expect(affectedEnd.events).toContainEqual({
        kind: "BLACKOUT_RECOVERY_STARTED",
        cityId: target.id,
        ownerId: target.ownerId,
        reason: "AFFECTED_TURN_ENDED",
      });
      expect(
        state.cities.find((city) => city.id === target.id)?.blackout,
      ).toEqual({
        phase: "RECOVERY",
        recoveryOwnerId: target.ownerId,
        unaffectedTurnStarted: false,
      });

      while (activePlayerId(state) !== target.ownerId)
        state = endTurn(state).state;
      expect(
        state.cities.find((city) => city.id === target.id)?.blackout,
      ).toEqual({
        phase: "RECOVERY",
        recoveryOwnerId: target.ownerId,
        unaffectedTurnStarted: true,
      });
      expect(
        state.players.find((player) => player.id === target.ownerId)?.coins,
      ).toBe(coinsAfterAffectedTurn + preBlackoutIncome);
      const unaffectedEnd = endTurn(state);
      expect(
        unaffectedEnd.state.cities.find((city) => city.id === target.id)
          ?.blackout,
      ).toBeNull();
      expect(unaffectedEnd.events).toContainEqual({
        kind: "BLACKOUT_RECOVERY_COMPLETED",
        cityId: target.id,
        ownerId: target.ownerId,
      });
    },
  );

  it("allows city-center detection but blocks ordinary, Scout, and third-rival unit detection", () => {
    const clear = blackoutScenario(3, 0, 1);
    const source = clear.units[0]!;
    const target = clear.cities.find(
      (city) => city.ownerId === clear.turnOrder[1],
    )!;
    const command = {
      kind: "BLACKOUT_CITY" as const,
      unitId: source.id,
      cityId: target.id,
    };
    const thirdOwner = required(clear.turnOrder[2], "third owner missing");
    expect(applyCommandV7(clear, source.ownerId, command).accepted).toBe(true);

    for (const [role, distance, owner] of [
      ["FIGHTER", 1, target.ownerId],
      ["SCOUT", 2, target.ownerId],
      ["SCOUT", 2, thirdOwner],
    ] as const) {
      const detectorAt = coordinateAtDistance(clear, source.at, distance);
      const blocked = addUnit(clear, owner, role, detectorAt);
      expect(applyCommandV7(blocked, source.ownerId, command)).toMatchObject({
        accepted: false,
        error: { code: "SABOTEUR_DETECTED" },
        events: [],
      });
      const preview = previewBlackoutV7(blocked, source.ownerId, command);
      expect(preview).toMatchObject({
        ok: true,
        preview: {
          unitDetectionBlocks: true,
          detectingSources: [
            { ownerId: owner, role, at: detectorAt, detectionRadius: distance },
          ],
        },
      });
      expect(
        queryPlayerCommandsV7(viewForV7(blocked, source.ownerId)),
      ).not.toContainEqual(command);
    }
  });

  it("keeps equal public views equal when an unseen Scout may be the authority-only blocker", () => {
    const base = blackoutScenario(2, 0, 1);
    const source = base.units[0]!;
    const target = base.cities.find((city) => city.ownerId !== source.ownerId)!;
    const near = coordinateAtDistance(base, source.at, 2);
    const far = required(
      base.board.tiles.find(
        (tile) =>
          chebyshev(tile.at, source.at) > 2 &&
          !same(tile.at, source.at) &&
          !same(tile.at, target.at) &&
          !base.treasureChests.some((chest) => same(chest, tile.at)),
      )?.at,
      "far coordinate missing",
    );
    const hiddenExploration = base.board.tiles
      .map((tile) => tile.at)
      .filter((at) => !same(at, near) && !same(at, far));
    const prepare = (at: CoordV7) => {
      const withScout = addUnit(base, target.ownerId, "SCOUT", at);
      return checkedV7({
        ...withScout,
        players: withScout.players.map((player) =>
          player.id === source.ownerId
            ? { ...player, explored: hiddenExploration }
            : player,
        ),
      });
    };
    const blocked = prepare(near);
    const clear = prepare(far);
    const blockedView = viewForV7(blocked, source.ownerId);
    const clearView = viewForV7(clear, source.ownerId);
    expect(blockedView).toEqual(clearView);
    const command = {
      kind: "BLACKOUT_CITY" as const,
      unitId: source.id,
      cityId: target.id,
    };
    expect(queryPlayerCommandsV7(blockedView)).toEqual(
      queryPlayerCommandsV7(clearView),
    );
    expect(queryPlayerCommandsV7(blockedView)).not.toContainEqual(command);
    expect(previewBlackoutV7(blockedView, command)).toEqual({
      ok: false,
      error: "DETECTION_UNKNOWN",
    });
    expect(previewBlackoutV7(clearView, command)).toEqual({
      ok: false,
      error: "DETECTION_UNKNOWN",
    });
    expect(applyCommandV7(blocked, source.ownerId, command)).toMatchObject({
      accepted: false,
      error: { code: "SABOTEUR_DETECTED" },
    });
    expect(applyCommandV7(clear, source.ownerId, command).accepted).toBe(true);
  });

  it("projects full status only to source/target and redacts a visible city to a third rival", () => {
    let state = blackoutScenario(3, 0, 1);
    const source = state.units[0]!;
    const target = state.cities.find(
      (city) => city.ownerId === state.turnOrder[1],
    )!;
    const third = state.turnOrder[2]!;
    const thirdKnown = new Set(
      [
        ...state.players.find((player) => player.id === third)!.explored,
        target.at,
      ].map(key),
    );
    state = checkedV7({
      ...state,
      players: state.players.map((player) =>
        player.id === third
          ? {
              ...player,
              explored: state.board.tiles
                .map((tile) => tile.at)
                .filter(
                  (at) => thirdKnown.has(key(at)) && !same(at, source.at),
                ),
            }
          : player,
      ),
    });
    expect(viewForV7(state, third).units).not.toContainEqual(
      expect.objectContaining({ id: source.id }),
    );
    const result = applyCommandV7(state, source.ownerId, {
      kind: "BLACKOUT_CITY",
      unitId: source.id,
      cityId: target.id,
    });
    if (!result.accepted) throw new Error(result.error.code);
    expect(
      viewForV7(result.state, source.ownerId).blackoutStatuses,
    ).toContainEqual(
      expect.objectContaining({ visibility: "FULL", cityId: target.id }),
    );
    expect(
      viewForV7(result.state, target.ownerId).blackoutStatuses,
    ).toContainEqual(
      expect.objectContaining({ visibility: "FULL", cityId: target.id }),
    );
    expect(viewForV7(result.state, third).blackoutStatuses).toEqual([
      { visibility: "CITY_ONLY", cityId: target.id, phase: "PENDING" },
    ]);
    const projected = projectEventsV7(
      state,
      result.state,
      third,
      result.events,
    );
    expect(projected.events).not.toContainEqual(
      expect.objectContaining({ kind: "BLACKOUT_PLANTED" }),
    );
    expect(projected.events).not.toContainEqual(
      expect.objectContaining({ kind: "SABOTEUR_EXPOSED" }),
    );
    expect(JSON.stringify(projected.events)).not.toContain(String(source.id));
  });

  it("shares Blackout exposure with the target owner's cooperative ally without leaking the plant", () => {
    const initial = initialV7ForSeats(3);
    const sourceSeat = initial.turnOrder.indexOf(initial.humanPlayerId);
    const otherSeats = [0, 1, 2].filter((seat) => seat !== sourceSeat);
    const targetSeat = otherSeats[0]!;
    const allySeat = otherSeats[1]!;
    const rival = blackoutScenario(3, sourceSeat, targetSeat);
    const state = checkedV7({
      ...rival,
      setup: { ...rival.setup, aiMode: "COOPERATIVE" },
    });
    const source = state.units[0]!;
    const target = state.cities.find(
      (city) => city.ownerId === state.turnOrder[targetSeat],
    )!;
    const ally = state.turnOrder[allySeat]!;
    const result = applyCommandV7(state, source.ownerId, {
      kind: "BLACKOUT_CITY",
      unitId: source.id,
      cityId: target.id,
    });
    if (!result.accepted) throw new Error(result.error.code);
    expect(
      viewForV7(result.state, ally).unitStats.find(
        (stats) => stats.unitId === source.id,
      )?.statuses,
    ).toContain("EXPOSED");
    const projected = projectEventsV7(state, result.state, ally, result.events);
    expect(projected.events).toContainEqual({
      kind: "SABOTEUR_EXPOSED",
      unitId: source.id,
      anchorPlayerId: target.ownerId,
      reason: "BLACKOUT",
    });
    expect(projected.events).not.toContainEqual(
      expect.objectContaining({ kind: "BLACKOUT_PLANTED" }),
    );
  });

  it.each(["PENDING", "ACTIVE", "RECOVERY"] as const)(
    "prevents a second fresh Saboteur from stacking during %s",
    (phase) => {
      const base = blackoutScenario(2, 0, 1);
      const first = base.units[0]!;
      const target = base.cities.find(
        (city) => city.ownerId !== first.ownerId,
      )!;
      const secondAt = coordinateAtDistance(base, target.at, 1);
      let state = addUnit(base, first.ownerId, "SABOTEUR", secondAt);
      const second = state.units.find((unit) => unit.id !== first.id)!;
      const blackout: CityBlackoutV7 =
        phase === "PENDING"
          ? {
              phase,
              sourceUnitId: first.id,
              sourceOwnerId: first.ownerId,
              plantedRound: state.round,
            }
          : phase === "ACTIVE"
            ? { phase, sourceOwnerId: first.ownerId, suppressedCoins: 2 }
            : {
                phase,
                recoveryOwnerId: target.ownerId,
                unaffectedTurnStarted: false,
              };
      state = checkedV7({
        ...state,
        cities: state.cities.map((city) =>
          city.id === target.id ? { ...city, blackout } : city,
        ),
      });
      const command = {
        kind: "BLACKOUT_CITY" as const,
        unitId: second.id,
        cityId: target.id,
      };
      expect(applyCommandV7(state, first.ownerId, command)).toMatchObject({
        accepted: false,
        error: { code: "BLACKOUT_PROTECTED" },
        events: [],
      });
      expect(
        queryPlayerCommandsV7(viewForV7(state, first.ownerId)),
      ).not.toContainEqual(command);
    },
  );

  it("rejects overflow atomically and offers the exact last safe round", () => {
    const maximum = Number.MAX_SAFE_INTEGER;
    const base = blackoutScenario(2, 0, 1);
    const source = base.units[0]!;
    const target = base.cities.find((city) => city.ownerId !== source.ownerId)!;
    const command = {
      kind: "BLACKOUT_CITY" as const,
      unitId: source.id,
      cityId: target.id,
    };
    const safe = checkedV7({ ...base, round: maximum - 3 });
    expect(
      queryPlayerCommandsV7(viewForV7(safe, source.ownerId)),
    ).toContainEqual(command);
    expect(applyCommandV7(safe, source.ownerId, command)).toMatchObject({
      accepted: true,
      state: {
        round: maximum - 3,
        units: [expect.objectContaining({ blackoutEligibleRound: maximum })],
      },
    });
    const overflow = checkedV7({ ...base, round: maximum - 2 });
    expect(
      queryPlayerCommandsV7(viewForV7(overflow, source.ownerId)),
    ).not.toContainEqual(command);
    expect(previewBlackoutV7(overflow, source.ownerId, command)).toEqual({
      ok: false,
      error: "NOT_PREVIEWABLE",
    });
    const result = applyCommandV7(overflow, source.ownerId, command);
    expect(result).toMatchObject({
      accepted: false,
      state: overflow,
      events: [],
      error: { code: "INTEGER_OVERFLOW" },
    });
    expect(result.state).toBe(overflow);
  });

  it("caps suppression at three without touching treasury and restores full recovery income", () => {
    let state = blackoutScenario(2, 0, 1);
    const source = state.units[0]!;
    const target = state.cities.find(
      (city) => city.ownerId !== source.ownerId,
    )!;
    state = withPermanentLevel(state, target.id, 3, true);
    const beforeCoins = state.players.find(
      (player) => player.id === target.ownerId,
    )!.coins;
    const planted = applyCommandV7(state, source.ownerId, {
      kind: "BLACKOUT_CITY",
      unitId: source.id,
      cityId: target.id,
    });
    if (!planted.accepted) throw new Error(planted.error.code);
    state = planted.state;
    while (activePlayerId(state) !== target.ownerId)
      state = endTurn(state).state;
    expect(
      state.cities.find((city) => city.id === target.id)?.blackout,
    ).toEqual({
      phase: "ACTIVE",
      sourceOwnerId: source.ownerId,
      suppressedCoins: 3,
    });
    expect(
      state.players.find((player) => player.id === target.ownerId)?.coins,
    ).toBe(beforeCoins + 1);
    state = endTurn(state).state;
    while (activePlayerId(state) !== target.ownerId)
      state = endTurn(state).state;
    expect(
      state.players.find((player) => player.id === target.ownerId)?.coins,
    ).toBe(beforeCoins + 5);
  });

  it.each(["PENDING", "ACTIVE", "RECOVERY"] as const)(
    "capture during %s installs fresh recovery for the current owner",
    (phase) => {
      const state = captureScenario(phase);
      const actor = activePlayerId(state);
      const unit = state.units[0]!;
      const city = state.cities.find((candidate) =>
        same(candidate.at, unit.at),
      )!;
      const result = applyCommandV7(state, actor, {
        kind: "CAPTURE",
        unitId: unit.id,
      });
      if (!result.accepted) throw new Error(result.error.code);
      expect(
        result.state.cities.find((candidate) => candidate.id === city.id)
          ?.blackout,
      ).toEqual({
        phase: "RECOVERY",
        recoveryOwnerId: actor,
        unaffectedTurnStarted: false,
      });
      expect(result.events).toContainEqual({
        kind: "BLACKOUT_RECOVERY_STARTED",
        cityId: city.id,
        ownerId: actor,
        reason: "CITY_CAPTURED",
      });
      const captureTurnEnd = endTurn(result.state);
      expect(
        captureTurnEnd.state.cities.find(
          (candidate) => candidate.id === city.id,
        )?.blackout,
      ).toEqual({
        phase: "RECOVERY",
        recoveryOwnerId: actor,
        unaffectedTurnStarted: false,
      });
      let advanced = captureTurnEnd.state;
      while (activePlayerId(advanced) !== actor)
        advanced = endTurn(advanced).state;
      expect(
        advanced.cities.find((candidate) => candidate.id === city.id)?.blackout,
      ).toEqual({
        phase: "RECOVERY",
        recoveryOwnerId: actor,
        unaffectedTurnStarted: true,
      });
      const recovered = endTurn(advanced);
      expect(
        recovered.state.cities.find((candidate) => candidate.id === city.id)
          ?.blackout,
      ).toBeNull();
    },
  );

  it("keeps a planted city effect after its Saboteur disappears", () => {
    const base = blackoutScenario(2, 0, 1);
    const source = base.units[0]!;
    const target = base.cities.find((city) => city.ownerId !== source.ownerId)!;
    const planted = applyCommandV7(base, source.ownerId, {
      kind: "BLACKOUT_CITY",
      unitId: source.id,
      cityId: target.id,
    });
    if (!planted.accepted) throw new Error(planted.error.code);
    let state = checkedV7({
      ...planted.state,
      units: planted.state.units.filter((unit) => unit.id !== source.id),
      saboteurExposures: [],
    });
    while (activePlayerId(state) !== target.ownerId)
      state = endTurn(state).state;
    expect(
      state.cities.find((city) => city.id === target.id)?.blackout,
    ).toMatchObject({
      phase: "ACTIVE",
    });
  });

  it("keeps the active city effect after the source Saboteur is killed by combat", () => {
    const base = blackoutScenario(2, 0, 1);
    const source = base.units[0]!;
    const target = base.cities.find((city) => city.ownerId !== source.ownerId)!;
    const planted = applyCommandV7(base, source.ownerId, {
      kind: "BLACKOUT_CITY",
      unitId: source.id,
      cityId: target.id,
    });
    if (!planted.accepted) throw new Error(planted.error.code);
    let state = planted.state;
    while (activePlayerId(state) !== target.ownerId)
      state = endTurn(state).state;
    const attackerAt = coordinateAtDistance(state, source.at, 1);
    state = addUnit(state, target.ownerId, "JUGGERNAUT", attackerAt);
    const attacker = state.units.find((unit) => unit.role === "JUGGERNAUT")!;
    state = checkedV7({
      ...state,
      units: state.units.map((unit) =>
        unit.id === source.id ? { ...unit, hp: 1 } : unit,
      ),
    });
    const attacked = applyCommandV7(state, target.ownerId, {
      kind: "ATTACK",
      unitId: attacker.id,
      targetUnitId: source.id,
    });
    if (!attacked.accepted) throw new Error(attacked.error.code);
    expect(attacked.events).toContainEqual({
      kind: "UNIT_DIED",
      unitId: source.id,
      cause: "ATTACK",
    });
    expect(attacked.state.units.some((unit) => unit.id === source.id)).toBe(
      false,
    );
    expect(
      attacked.state.cities.find((city) => city.id === target.id)?.blackout,
    ).toMatchObject({ phase: "ACTIVE" });
  });

  it("keeps and activates a planted effect after the source player is eliminated", () => {
    const state = eliminationScenario();
    const captor = activePlayerId(state);
    const source = state.units.find((unit) => unit.role === "SABOTEUR")!;
    const capturer = state.units.find((unit) => unit.role === "FIGHTER")!;
    const affected = state.cities.find(
      (city) => city.blackout?.phase === "PENDING",
    )!;
    const captured = applyCommandV7(state, captor, {
      kind: "CAPTURE",
      unitId: capturer.id,
    });
    if (!captured.accepted) throw new Error(captured.error.code);
    expect(captured.events).toContainEqual({
      kind: "PLAYER_ELIMINATED",
      playerId: source.ownerId,
    });
    expect(captured.state.units.some((unit) => unit.id === source.id)).toBe(
      false,
    );
    expect(
      captured.state.cities.find((city) => city.id === affected.id)?.blackout,
    ).toMatchObject({
      phase: "PENDING",
    });
    let advanced = captured.state;
    while (activePlayerId(advanced) !== affected.ownerId)
      advanced = endTurn(advanced).state;
    expect(
      advanced.cities.find((city) => city.id === affected.id)?.blackout,
    ).toMatchObject({
      phase: "ACTIVE",
    });
  });

  it("blocks development and Train while retaining unit actions and existing capacity", () => {
    let state = blackoutScenario(2, 0, 1);
    const target = state.cities.find(
      (city) => city.ownerId === state.turnOrder[1],
    )!;
    const targetTile = state.board.tiles.find(
      (tile) => tile.territoryCityId === target.id && tile.site === null,
    )!;
    state = checkedV7({
      ...state,
      activeSeatIndex: state.turnOrder.indexOf(target.ownerId),
      board: {
        ...state.board,
        tiles: state.board.tiles.map((tile) =>
          same(tile.at, targetTile.at)
            ? {
                ...tile,
                terrain: "GRASS",
                resource: null,
                improvement: null,
                road: false,
              }
            : tile,
        ),
      },
      players: state.players.map((player) =>
        player.id === target.ownerId
          ? {
              ...player,
              explored: state.board.tiles.map((tile) => tile.at),
              researchedTechs: [
                "GATHERING",
                "SCOUTING",
                "ROADS",
                "DRILL",
                "FORTIFICATION",
              ],
            }
          : player,
      ),
      cities: state.cities.map((city) =>
        city.id === target.id
          ? {
              ...city,
              blackout: {
                phase: "ACTIVE",
                sourceOwnerId: state.turnOrder[0]!,
                suppressedCoins: Math.min(3, city.level + 1),
              },
            }
          : city,
      ),
      units: [
        makeUnit(
          state.nextEntityId,
          target.ownerId,
          target.id,
          "FIGHTER",
          target.at,
        ),
      ],
      nextEntityId: state.nextEntityId + 1,
    });
    const unit = state.units[0]!;
    expect(cityUnitCapacityV7(state, target)).toBe(target.level + 2);
    expect(
      cityIncomeV7(
        state,
        state.cities.find((city) => city.id === target.id)!,
      ),
    ).toBe(0);
    expect(
      applyCommandV7(state, target.ownerId, {
        kind: "TRAIN",
        cityId: target.id,
        role: "FIGHTER",
      }),
    ).toMatchObject({ accepted: false, error: { code: "CITY_BLACKED_OUT" } });
    expect(
      applyCommandV7(state, target.ownerId, {
        kind: "BUILD_ROAD",
        at: targetTile.at,
      }),
    ).toMatchObject({ accepted: false, error: { code: "CITY_BLACKED_OUT" } });
    expect(
      applyCommandV7(state, target.ownerId, { kind: "WAIT", unitId: unit.id })
        .accepted,
    ).toBe(true);
  });

  it("denies Monument development while leaving a mandatory city reward resolvable", () => {
    let monumentState = blackoutScenario(2, 0, 1);
    const target = monumentState.cities.find(
      (city) => city.ownerId === monumentState.turnOrder[1],
    )!;
    const at = monumentState.board.tiles.find(
      (tile) =>
        tile.territoryCityId === target.id &&
        tile.site === null &&
        !monumentState.treasureChests.some((chest) => same(chest, tile.at)),
    )!.at;
    monumentState = checkedV7({
      ...monumentState,
      activeSeatIndex: monumentState.turnOrder.indexOf(target.ownerId),
      players: monumentState.players.map((player) =>
        player.id === target.ownerId
          ? {
              ...player,
              explored: monumentState.board.tiles.map((tile) => tile.at),
              achievementEntitlements: player.achievementEntitlements.map(
                (entitlement) =>
                  entitlement.achievement === "ENGINEER"
                    ? { ...entitlement, unlocked: true }
                    : entitlement,
              ),
            }
          : player,
      ),
      board: {
        ...monumentState.board,
        tiles: monumentState.board.tiles.map((tile) =>
          same(tile.at, at)
            ? { ...tile, resource: null, improvement: null }
            : tile,
        ),
      },
      cities: monumentState.cities.map((city) =>
        city.id === target.id
          ? {
              ...city,
              blackout: {
                phase: "ACTIVE",
                sourceOwnerId: monumentState.turnOrder[0]!,
                suppressedCoins: 2,
              },
            }
          : city,
      ),
      units: [],
    });
    expect(
      applyCommandV7(monumentState, target.ownerId, {
        kind: "BUILD_MONUMENT",
        achievement: "ENGINEER",
        at,
      }),
    ).toMatchObject({ accepted: false, error: { code: "CITY_BLACKED_OUT" } });

    let rewardState = withPermanentLevel(monumentState, target.id, 2, false);
    rewardState = checkedV7({
      ...rewardState,
      pendingChoices: [
        {
          kind: "CITY_REWARD",
          cityId: target.id,
          reachedLevel: 2,
          candidates: ["SURVEY", "STOCKPILE"],
        },
      ],
    });
    const coinsBefore = rewardState.players.find(
      (player) => player.id === target.ownerId,
    )!.coins;
    const rewarded = applyCommandV7(rewardState, target.ownerId, {
      kind: "CHOOSE_CITY_REWARD",
      cityId: target.id,
      reachedLevel: 2,
      reward: "STOCKPILE",
    });
    if (!rewarded.accepted) throw new Error(rewarded.error.code);
    expect(
      rewarded.state.players.find((player) => player.id === target.ownerId)
        ?.coins,
    ).toBe(coinsBefore + 4);
    expect(
      rewarded.state.cities.find((city) => city.id === target.id)?.blackout,
    ).toMatchObject({
      phase: "ACTIVE",
    });
  });
});

describe("ruleset-7 Saboteur innate Pillage", () => {
  it("bypasses Explosives, exposes with the strict PILLAGE arm, and leaves cooldown unchanged", () => {
    const state = pillageScenario("SABOTEUR");
    const source = state.units[0]!;
    const target = state.cities.find(
      (city) => city.ownerId !== source.ownerId,
    )!;
    expect(
      state.players.find((player) => player.id === source.ownerId)
        ?.researchedTechs,
    ).not.toContain("EXPLOSIVES");
    expect(
      queryPlayerCommandsV7(viewForV7(state, source.ownerId)),
    ).toContainEqual({
      kind: "PILLAGE",
      unitId: source.id,
    });
    const beforeCooldown = source.blackoutEligibleRound;
    const result = applyCommandV7(state, source.ownerId, {
      kind: "PILLAGE",
      unitId: source.id,
    });
    if (!result.accepted) throw new Error(result.error.code);
    expect(result.events.slice(0, 2)).toEqual([
      expect.objectContaining({
        kind: "IMPROVEMENT_PILLAGED",
        unitId: source.id,
      }),
      {
        kind: "SABOTEUR_EXPOSED",
        unitId: source.id,
        anchorPlayerId: target.ownerId,
        reason: "PILLAGE",
      },
    ]);
    expect(
      result.state.units.find((unit) => unit.id === source.id)
        ?.blackoutEligibleRound,
    ).toBe(beforeCooldown);
    expect(parseGameStateV7(JSON.parse(JSON.stringify(result.state)))).toEqual(
      result.state,
    );
    expect(
      parseEventEnvelopeV7({
        format: "pulp-wars-events",
        version: 7,
        commandIndex: result.state.commandIndex,
        events: result.events,
      }),
    ).toMatchObject({ ok: true });
    const projected = projectEventsV7(
      state,
      result.state,
      target.ownerId,
      result.events,
    );
    expect(projected.events).toContainEqual(
      expect.objectContaining({ kind: "SABOTEUR_EXPOSED", reason: "PILLAGE" }),
    );
  });

  it("keeps Explosives required for every other role and checks action state first", () => {
    const ready = pillageScenario("FIGHTER");
    const source = ready.units[0]!;
    expect(
      applyCommandV7(ready, source.ownerId, {
        kind: "PILLAGE",
        unitId: source.id,
      }),
    ).toMatchObject({
      accepted: false,
      error: { code: "TECH_REQUIRED" },
    });
    const acted = checkedV7({
      ...ready,
      units: ready.units.map((unit) =>
        unit.id === source.id
          ? {
              ...unit,
              activation: {
                ...unit.activation,
                handled: true,
                specialActed: true,
              },
            }
          : unit,
      ),
    });
    expect(
      applyCommandV7(acted, source.ownerId, {
        kind: "PILLAGE",
        unitId: source.id,
      }),
    ).toMatchObject({
      accepted: false,
      error: { code: "UNIT_ALREADY_ACTED" },
    });
  });
});

function blackoutScenario(
  seatCount: 2 | 3 | 4,
  sourceSeat: number,
  targetSeat: number,
): GameStateV7 {
  const state = initialV7ForSeats(seatCount);
  const sourceOwner = state.turnOrder[sourceSeat]!;
  const targetOwner = state.turnOrder[targetSeat]!;
  const sourceCity = state.cities.find((city) => city.ownerId === sourceOwner)!;
  const targetCity = state.cities.find((city) => city.ownerId === targetOwner)!;
  const at = adjacentOpenCoordinate(state, targetCity);
  const source = makeUnit(
    state.nextEntityId,
    sourceOwner,
    sourceCity.id,
    "SABOTEUR",
    at,
  );
  return checkedV7({
    ...state,
    nextEntityId: state.nextEntityId + 1,
    activeSeatIndex: sourceSeat,
    players: state.players.map((player) =>
      player.id === sourceOwner
        ? { ...player, explored: state.board.tiles.map((tile) => tile.at) }
        : player,
    ),
    units: [source],
  });
}

function captureScenario(phase: CityBlackoutV7["phase"]): GameStateV7 {
  const state = initialV7ForSeats(3);
  const actor = state.humanPlayerId;
  const targetOwner = state.turnOrder.find((playerId) => playerId !== actor)!;
  const home = state.cities.find((city) => city.ownerId === actor)!;
  const target = state.cities.find((city) => city.ownerId === targetOwner)!;
  const unit = {
    ...makeUnit(state.nextEntityId, actor, home.id, "FIGHTER", target.at),
    captureEligible: true,
  };
  const sourceId = state.nextEntityId + 1;
  const blackout: CityBlackoutV7 =
    phase === "PENDING"
      ? {
          phase,
          sourceUnitId: sourceId as UnitStateV7["id"],
          sourceOwnerId: actor,
          plantedRound: state.round,
        }
      : phase === "ACTIVE"
        ? { phase, sourceOwnerId: actor, suppressedCoins: 2 }
        : {
            phase,
            recoveryOwnerId: targetOwner,
            unaffectedTurnStarted: true,
          };
  return checkedV7({
    ...state,
    activeSeatIndex: state.turnOrder.indexOf(actor),
    nextEntityId: sourceId + 1,
    units: [unit],
    cities: state.cities.map((city) =>
      city.id === target.id ? { ...city, blackout } : city,
    ),
  });
}

function pillageScenario(role: "SABOTEUR" | "FIGHTER"): GameStateV7 {
  const state = initialV7ForSeats(2);
  const actor = state.turnOrder[0]!;
  const targetOwner = state.turnOrder[1]!;
  const home = state.cities.find((city) => city.ownerId === actor)!;
  const target = state.cities.find((city) => city.ownerId === targetOwner)!;
  const tile = state.board.tiles.find(
    (candidate) =>
      candidate.territoryCityId === target.id && candidate.site === null,
  )!;
  const source = makeUnit(state.nextEntityId, actor, home.id, role, tile.at);
  return checkedV7({
    ...state,
    nextEntityId: state.nextEntityId + 1,
    players: state.players.map((player) =>
      player.id === actor
        ? {
            ...player,
            explored: state.board.tiles.map((candidate) => candidate.at),
            researchedTechs: ["GATHERING"],
          }
        : player,
    ),
    board: {
      ...state.board,
      tiles: state.board.tiles.map((candidate) =>
        same(candidate.at, tile.at)
          ? {
              ...candidate,
              terrain: "GRASS",
              resource: null,
              improvement: "MARKET",
            }
          : candidate,
      ),
    },
    units: [source],
  });
}

function eliminationScenario(): GameStateV7 {
  const state = initialV7ForSeats(3);
  const captorOwner = state.humanPlayerId;
  const opponents = state.turnOrder.filter(
    (playerId) => playerId !== captorOwner,
  );
  const sourceOwner = opponents[0]!;
  const targetOwner = opponents[1]!;
  const captorHome = state.cities.find((city) => city.ownerId === captorOwner)!;
  const sourceCity = state.cities.find((city) => city.ownerId === sourceOwner)!;
  const targetCity = state.cities.find((city) => city.ownerId === targetOwner)!;
  const source = makeUnit(
    state.nextEntityId,
    sourceOwner,
    sourceCity.id,
    "SABOTEUR",
    adjacentOpenCoordinate(state, targetCity),
  );
  const capturer = {
    ...makeUnit(
      state.nextEntityId + 1,
      captorOwner,
      captorHome.id,
      "FIGHTER",
      sourceCity.at,
    ),
    captureEligible: true,
  };
  return checkedV7({
    ...state,
    activeSeatIndex: state.turnOrder.indexOf(captorOwner),
    nextEntityId: state.nextEntityId + 2,
    units: [source, capturer].sort((left, right) => left.id - right.id),
    cities: state.cities.map((city) =>
      city.id === targetCity.id
        ? {
            ...city,
            blackout: {
              phase: "PENDING",
              sourceUnitId: source.id,
              sourceOwnerId: sourceOwner,
              plantedRound: state.round,
            },
          }
        : city,
    ),
  });
}

function withPermanentLevel(
  state: GameStateV7,
  cityId: CityStateV7["id"],
  level: 2 | 3,
  rewardsComplete: boolean,
): GameStateV7 {
  const amount = level === 2 ? 2 : 5;
  const coordinates = state.board.tiles
    .filter((tile) => tile.territoryCityId === cityId)
    .slice(0, amount)
    .map((tile) => tile.at);
  if (coordinates.length !== amount)
    throw new Error("insufficient permanent-population coordinates");
  const contributions: GameStateV7["populationContributions"] = coordinates.map(
    (at, index) => ({
      id: state.nextEntityId + index,
      cityId,
      category: "PERMANENT",
      amount: 1,
      source: { kind: "RESOURCE_ACTION", action: "HARVEST_FRUIT", at },
    }),
  );
  return checkedV7({
    ...state,
    nextEntityId: state.nextEntityId + amount,
    cities: state.cities.map((city) =>
      city.id === cityId
        ? {
            ...city,
            level,
            permanentPopulation: amount,
            economicPopulation: 0,
            population: 0,
            expanded: false,
            rewards: rewardsComplete
              ? level === 3
                ? [
                    { reachedLevel: 2, reward: "STOCKPILE" as const },
                    { reachedLevel: 3, reward: "WALLS" as const },
                  ]
                : [{ reachedLevel: 2, reward: "STOCKPILE" as const }]
              : [],
          }
        : city,
    ),
    populationContributions: contributions,
    pendingChoices: rewardsComplete
      ? []
      : [
          {
            kind: "CITY_REWARD",
            cityId,
            reachedLevel: 2,
            candidates: ["SURVEY", "STOCKPILE"],
          },
        ],
  });
}

function addUnit(
  state: GameStateV7,
  ownerId: PlayerId,
  role: UnitRoleIdV7,
  at: CoordV7,
): GameStateV7 {
  const home = state.cities.find((city) => city.ownerId === ownerId)!;
  return checkedV7({
    ...state,
    nextEntityId: state.nextEntityId + 1,
    units: [
      ...state.units,
      makeUnit(state.nextEntityId, ownerId, home.id, role, at),
    ].sort((left, right) => left.id - right.id),
  });
}

function makeUnit(
  id: number,
  ownerId: PlayerId,
  homeCityId: CityStateV7["id"],
  role: UnitRoleIdV7,
  at: CoordV7,
): UnitStateV7 {
  return {
    id: id as UnitStateV7["id"],
    ownerId,
    homeCityId,
    role,
    at,
    hp: HP[role],
    maxHp: HP[role],
    kills: 0,
    veteran: false,
    captureEligible: false,
    activation: READY,
    blackoutEligibleRound: role === "SABOTEUR" ? 1 : null,
  };
}

function initialV7ForSeats(seatCount: 2 | 3 | 4): GameStateV7 {
  const setup = setupV7(7_100 + seatCount, (seatCount - 1) as 1 | 2 | 3);
  const created = createInitialMapStateV7(setup);
  if (!created.ok) throw new Error(created.error.code);
  return checkedV7({ ...created.state, activeSeatIndex: 0 });
}

function adjacentOpenCoordinate(
  state: GameStateV7,
  city: CityStateV7,
): CoordV7 {
  return required(
    state.board.tiles.find(
      (tile) =>
        chebyshev(tile.at, city.at) === 1 &&
        !state.cities.some((candidate) => same(candidate.at, tile.at)),
    )?.at,
    "adjacent coordinate missing",
  );
}

function coordinateAtDistance(
  state: GameStateV7,
  origin: CoordV7,
  distance: 1 | 2,
): CoordV7 {
  return required(
    state.board.tiles.find(
      (tile) =>
        chebyshev(tile.at, origin) === distance &&
        !state.units.some((unit) => same(unit.at, tile.at)) &&
        !state.cities.some((city) => same(city.at, tile.at)) &&
        !state.treasureChests.some((chest) => same(chest, tile.at)),
    )?.at,
    "detector coordinate missing",
  );
}

function endTurn(state: GameStateV7) {
  const result = applyCommandV7(state, activePlayerId(state), {
    kind: "END_TURN",
  });
  if (!result.accepted) throw new Error(result.error.code);
  return result;
}

function activePlayerId(state: GameStateV7): PlayerId {
  return required(
    state.turnOrder[state.activeSeatIndex],
    "active player missing",
  );
}

function required<T>(value: T | undefined, message: string): T {
  if (value === undefined) throw new Error(message);
  return value;
}

const same = (left: CoordV7, right: CoordV7) =>
  left.x === right.x && left.y === right.y;
const chebyshev = (left: CoordV7, right: CoordV7) =>
  Math.max(Math.abs(left.x - right.x), Math.abs(left.y - right.y));
const key = (at: CoordV7) => `${at.y},${at.x}`;
