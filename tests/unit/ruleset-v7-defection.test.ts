import { describe, expect, it } from "vitest";
import {
  applyCommandV7,
  cityIncomeV7,
  createInitialMapStateV7,
  previewCityCapacityV7,
  previewDefectionV7,
  projectEventsV7,
  queryPlayerCommandsV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type DomainEventV7,
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
  pursuitPhase: "NONE",
  healed: false,
  recovered: false,
  captured: false,
  handled: false,
  specialActed: false,
};

const SEAT_ORDER_CASES: readonly (readonly [2 | 3 | 4, number, number])[] = (
  [2, 3, 4] as const
).flatMap((seatCount) =>
  Array.from({ length: seatCount }, (_, initiatingSeat) =>
    Array.from({ length: seatCount }, (_, targetSeat) =>
      initiatingSeat === targetSeat
        ? []
        : [[seatCount, initiatingSeat, targetSeat] as const],
    ).flat(),
  ).flat(),
);

describe("ruleset-7 Envoy Defection", () => {
  it.each(SEAT_ORDER_CASES)(
    "gives one complete reply activation and resolves at the later initiator Start Turn (%i seats, %i -> %i)",
    (seatCount, initiatingSeat, targetSeat) => {
      let state = scenario(seatCount, initiatingSeat, targetSeat);
      const source = required(
        state.units.find((unit) => unit.role === "ENVOY"),
        "Envoy missing",
      );
      const target = required(
        state.units.find((unit) => unit.ownerId !== source.ownerId),
        "target missing",
      );
      const homeCity = required(
        state.cities.find((city) => city.ownerId === source.ownerId),
        "home city missing",
      );
      const offer: Extract<CommandV7, { kind: "OFFER_DEFECTION" }> = {
        kind: "OFFER_DEFECTION",
        unitId: source.id,
        targetUnitId: target.id,
        homeCityId: homeCity.id,
      };
      const commands = queryPlayerCommandsV7(viewForV7(state, source.ownerId));
      expect(commands).toContainEqual(offer);
      const preview = previewDefectionV7(state, source.ownerId, offer);
      expect(preview).toMatchObject({
        ok: true,
        preview: {
          sourceUnitId: source.id,
          target: { unitId: target.id, ownerId: target.ownerId },
          reservedCity: {
            cityId: homeCity.id,
            availableBeforeOffer: 1,
            availableAfterOffer: 0,
          },
          recordedReplyOwnerId: target.ownerId,
          conversion: { whollyExhausted: true, captureEligible: false },
          complete: true,
        },
      });
      if (!preview.ok) return;
      const initiatingTurnIndex = state.turnOrder.indexOf(source.ownerId);
      const targetTurnIndex = state.turnOrder.indexOf(target.ownerId);
      expect(preview.preview.replyBoundary.earliestRound).toBe(
        state.round + Number(targetTurnIndex <= initiatingTurnIndex),
      );
      expect(preview.preview.earliestResolutionBoundary.earliestRound).toBe(
        state.round + 1,
      );
      const offered = applyCommandV7(state, source.ownerId, offer);
      expect(offered.accepted).toBe(true);
      if (!offered.accepted) return;
      state = offered.state;
      expect(state.defectionMarks).toEqual([
        expect.objectContaining({
          id:
            offered.events[0]?.kind === "DEFECTION_OFFERED"
              ? offered.events[0].markId
              : -1,
          offeredAtCommandIndex: state.commandIndex,
          phase: "WAITING_FOR_REPLY",
        }),
      ]);
      expect(previewCityCapacityV7(state, homeCity.id)).toMatchObject({
        assigned: 1,
        reserved: 1,
        available: 0,
      });

      let targetStarts = 0;
      let targetWaited = false;
      let resolutionBatch:
        | {
            readonly before: GameStateV7;
            readonly after: GameStateV7;
            readonly events: readonly DomainEventV7[];
          }
        | undefined;
      for (
        let guard = 0;
        guard < seatCount * 3 && resolutionBatch === undefined;
        guard += 1
      ) {
        const activeId = activePlayerId(state);
        if (activeId === target.ownerId && !targetWaited) {
          const waited = applyCommandV7(state, activeId, {
            kind: "WAIT",
            unitId: target.id,
          });
          expect(waited.accepted).toBe(true);
          if (!waited.accepted) return;
          state = waited.state;
          targetWaited = true;
        }
        const before = state;
        const ended = applyCommandV7(state, activeId, { kind: "END_TURN" });
        expect(ended.accepted).toBe(true);
        if (!ended.accepted) return;
        targetStarts += ended.events.filter(
          (event) =>
            event.kind === "TURN_STARTED" && event.playerId === target.ownerId,
        ).length;
        state = ended.state;
        if (
          ended.events.some(
            (event) =>
              event.kind === "DEFECTION_RESOLVED" &&
              event.targetUnitId === target.id,
          )
        )
          resolutionBatch = { before, after: state, events: ended.events };
      }
      expect(targetWaited).toBe(true);
      expect(targetStarts).toBe(1);
      expect(resolutionBatch).toBeDefined();
      const converted = required(
        state.units.find((unit) => unit.id === target.id),
        "converted unit missing",
      );
      expect(converted).toMatchObject({
        ownerId: source.ownerId,
        homeCityId: homeCity.id,
        role: target.role,
        hp: target.hp,
        maxHp: target.maxHp,
        kills: target.kills,
        veteran: target.veteran,
        captureEligible: false,
        activation: {
          moved: true,
          attacked: true,
          healed: true,
          recovered: true,
          captured: true,
          handled: true,
          specialActed: true,
          pursuitPhase: "NONE",
        },
      });
      expect(state.defectionMarks).toEqual([]);
      expect(previewCityCapacityV7(state, homeCity.id)).toMatchObject({
        assigned: 2,
        reserved: 0,
        available: 0,
      });

      if (seatCount === 2) {
        const batch = required(resolutionBatch, "resolution missing");
        for (const participant of [source.ownerId, target.ownerId]) {
          const projected = projectEventsV7(
            batch.before,
            batch.after,
            participant,
            batch.events,
          );
          expect(
            projected.events.filter(
              (event) =>
                event.kind === "DEFECTION_ARMED" ||
                event.kind === "DEFECTION_RESOLVED",
            ),
          ).toEqual([
            expect.objectContaining({ kind: "DEFECTION_ARMED" }),
            expect.objectContaining({ kind: "DEFECTION_RESOLVED" }),
          ]);
        }
      }
    },
  );

  it("cancels and releases the reservation immediately when either endpoint moves out of range", () => {
    let state = scenario(2, 0, 1, { line: true });
    const source = required(
      state.units.find((unit) => unit.role === "ENVOY"),
      "Envoy missing",
    );
    const target = required(
      state.units.find((unit) => unit.ownerId !== source.ownerId),
      "target missing",
    );
    const city = required(
      state.cities.find((candidate) => candidate.ownerId === source.ownerId),
      "city missing",
    );
    const offered = applyCommandV7(state, source.ownerId, {
      kind: "OFFER_DEFECTION",
      unitId: source.id,
      targetUnitId: target.id,
      homeCityId: city.id,
    });
    if (!offered.accepted) throw new Error(offered.error.code);
    const targetIndex = offered.state.turnOrder.indexOf(target.ownerId);
    state = checkedV7({
      ...offered.state,
      activeSeatIndex: targetIndex,
      units: offered.state.units.map((unit) =>
        unit.id === target.id ? { ...unit, activation: READY } : unit,
      ),
    });
    const destination = { x: target.at.x + 1, y: target.at.y };
    const moved = applyCommandV7(state, target.ownerId, {
      kind: "MOVE",
      unitId: target.id,
      path: [destination],
    });
    expect(moved.accepted).toBe(true);
    if (!moved.accepted) return;
    expect(moved.events).toContainEqual({
      kind: "DEFECTION_CANCELLED",
      markId: offered.state.defectionMarks[0]?.id,
      reason: "OUT_OF_RANGE",
    });
    expect(moved.state.defectionMarks).toEqual([]);
    expect(previewCityCapacityV7(moved.state, city.id)).toMatchObject({
      reserved: 0,
      available: 1,
    });
  });

  it("converts a city occupant without Capture or Spoils and immediately changes siege", () => {
    let state = scenario(2, 0, 1, { targetOnCity: true });
    const source = required(
      state.units.find((unit) => unit.role === "ENVOY"),
      "Envoy missing",
    );
    const target = required(
      state.units.find((unit) => unit.ownerId !== source.ownerId),
      "target missing",
    );
    const targetCity = required(
      state.cities.find((city) => city.ownerId === target.ownerId),
      "target city missing",
    );
    const homeCity = required(
      state.cities.find((city) => city.ownerId === source.ownerId),
      "home city missing",
    );
    const preview = previewDefectionV7(state, source.ownerId, {
      kind: "OFFER_DEFECTION",
      unitId: source.id,
      targetUnitId: target.id,
      homeCityId: homeCity.id,
    });
    expect(preview).toMatchObject({
      ok: true,
      preview: { cityOccupantSiegeConsequence: "BESIEGES_HOSTILE_CITY" },
    });
    const offer = applyCommandV7(state, source.ownerId, {
      kind: "OFFER_DEFECTION",
      unitId: source.id,
      targetUnitId: target.id,
      homeCityId: homeCity.id,
    });
    if (!offer.accepted) throw new Error(offer.error.code);
    state = offer.state;
    for (let guard = 0; guard < 3; guard += 1) {
      const ended = applyCommandV7(state, activePlayerId(state), {
        kind: "END_TURN",
      });
      if (!ended.accepted) throw new Error(ended.error.code);
      state = ended.state;
      if (state.defectionMarks.length === 0) {
        expect(
          ended.events.some((event) => event.kind === "CITY_CAPTURED"),
        ).toBe(false);
        expect(
          ended.events.some((event) => event.kind === "SPOILS_AWARDED"),
        ).toBe(false);
        break;
      }
    }
    expect(
      state.cities.find((city) => city.id === targetCity.id)?.ownerId,
    ).toBe(target.ownerId);
    expect(state.units.find((unit) => unit.id === target.id)).toMatchObject({
      ownerId: source.ownerId,
      captureEligible: false,
    });
    expect(cityIncomeV7(state, targetCity)).toBe(0);
    expect(
      applyCommandV7(state, source.ownerId, {
        kind: "CAPTURE",
        unitId: target.id,
      }),
    ).toMatchObject({
      accepted: false,
      error: { code: "CAPTURE_NOT_ELIGIBLE" },
      events: [],
    });
  });

  it("auto-recovers the target before arming and preserves the recovered HP through conversion", () => {
    let state = scenario(2, 0, 1);
    const source = unitByRole(state, "ENVOY");
    const target = required(
      state.units.find((unit) => unit.ownerId !== source.ownerId),
      "target missing",
    );
    const city = required(
      state.cities.find((item) => item.ownerId === source.ownerId),
      "city missing",
    );
    state = checkedV7({
      ...state,
      units: state.units.map((unit) =>
        unit.id === target.id ? { ...unit, hp: unit.maxHp - 3 } : unit,
      ),
    });
    const offered = applyCommandV7(state, source.ownerId, {
      kind: "OFFER_DEFECTION",
      unitId: source.id,
      targetUnitId: target.id,
      homeCityId: city.id,
    });
    if (!offered.accepted) throw new Error(offered.error.code);
    const firstEnd = applyCommandV7(offered.state, source.ownerId, {
      kind: "END_TURN",
    });
    if (!firstEnd.accepted) throw new Error(firstEnd.error.code);
    const replyEnd = applyCommandV7(firstEnd.state, target.ownerId, {
      kind: "END_TURN",
    });
    if (!replyEnd.accepted) throw new Error(replyEnd.error.code);
    const recoveryIndex = replyEnd.events.findIndex(
      (event) => event.kind === "UNIT_RECOVERED" && event.unitId === target.id,
    );
    const armedIndex = replyEnd.events.findIndex(
      (event) => event.kind === "DEFECTION_ARMED",
    );
    const resolvedIndex = replyEnd.events.findIndex(
      (event) => event.kind === "DEFECTION_RESOLVED",
    );
    expect(recoveryIndex).toBeGreaterThanOrEqual(0);
    expect(armedIndex).toBeGreaterThan(recoveryIndex);
    expect(resolvedIndex).toBeGreaterThan(armedIndex);
    expect(replyEnd.state.units.find((unit) => unit.id === target.id)?.hp).toBe(
      target.maxHp - 1,
    );
  });

  it("converts Juggernaut through ordinary reserved capacity and preserves all durable fields", () => {
    let state = scenario(2, 0, 1);
    const source = unitByRole(state, "ENVOY");
    const target = required(
      state.units.find((unit) => unit.ownerId !== source.ownerId),
      "target missing",
    );
    state = checkedV7({
      ...state,
      units: state.units.map((unit) =>
        unit.id === target.id
          ? {
              ...unit,
              role: "JUGGERNAUT",
              hp: 29,
              maxHp: 45,
              kills: 4,
              veteran: true,
            }
          : unit,
      ),
    });
    const result = offerAndResolve(state, source.id, target.id);
    const converted = required(
      result.state.units.find((unit) => unit.id === target.id),
      "converted Juggernaut missing",
    );
    expect(converted).toMatchObject({
      ownerId: source.ownerId,
      role: "JUGGERNAUT",
      hp: 31,
      maxHp: 45,
      kills: 4,
      veteran: true,
    });
  });

  it("evaluates converted fourth-role Muster after conversion and income", () => {
    let state = scenario(2, 0, 1);
    const source = unitByRole(state, "ENVOY");
    const target = required(
      state.units.find((unit) => unit.ownerId !== source.ownerId),
      "target missing",
    );
    const [fighterAt, scoutAt] = unusedOpenCoords(state, 2);
    const extras: UnitStateV7[] = [
      roleVariant(
        source,
        state.nextEntityId,
        "FIGHTER",
        10,
        source.ownerId,
        required(fighterAt, "fighter tile missing"),
      ),
      roleVariant(
        source,
        state.nextEntityId + 1,
        "SCOUT",
        10,
        source.ownerId,
        required(scoutAt, "scout tile missing"),
      ),
    ];
    state = checkedV7({
      ...state,
      nextEntityId: state.nextEntityId + 2,
      units: [
        ...state.units.map((unit) =>
          unit.id === target.id
            ? { ...unit, role: "GUARD" as const, hp: 15, maxHp: 15 }
            : unit,
        ),
        ...extras,
      ].sort((left, right) => left.id - right.id),
    });
    const result = offerAndResolve(state, source.id, target.id);
    const resolutionIndex = result.events.findIndex(
      (event) => event.kind === "DEFECTION_RESOLVED",
    );
    const incomeIndex = result.events.findIndex(
      (event) =>
        event.kind === "INCOME_AWARDED" && event.playerId === source.ownerId,
    );
    const musterIndex = result.events.findIndex(
      (event) =>
        event.kind === "ACHIEVEMENT_UNLOCKED" && event.achievement === "MUSTER",
    );
    expect(incomeIndex).toBeGreaterThan(resolutionIndex);
    expect(musterIndex).toBeGreaterThan(incomeIndex);
  });

  it("cancels a converted Envoy's later mark in canonical order and releases its reservation", () => {
    let state = scenario(3, 0, 1);
    const initiator = unitByRole(state, "ENVOY");
    const middle = required(
      state.units.find((unit) => unit.ownerId !== initiator.ownerId),
      "middle unit missing",
    );
    const thirdOwner = required(
      state.players.find(
        (player) =>
          player.id !== initiator.ownerId && player.id !== middle.ownerId,
      ),
      "third owner missing",
    );
    const middleCity = required(
      state.cities.find((city) => city.ownerId === middle.ownerId),
      "middle city missing",
    );
    const thirdUnitBase = roleVariant(
      initiator,
      state.nextEntityId,
      "FIGHTER",
      10,
      thirdOwner.id,
      { x: initiator.at.x + 2, y: initiator.at.y },
    );
    const middleEnvoy: UnitStateV7 = {
      ...middle,
      role: "ENVOY",
      hp: 7,
      maxHp: 7,
    };
    const firstMarkId = state.nextEntityId + 1;
    const secondMarkId = firstMarkId + 1;
    const firstCity = required(
      state.cities.find((city) => city.ownerId === initiator.ownerId),
      "first city missing",
    );
    state = checkedV7({
      ...state,
      commandIndex: 2,
      nextEntityId: secondMarkId + 1,
      activeSeatIndex:
        (state.turnOrder.indexOf(initiator.ownerId) -
          1 +
          state.turnOrder.length) %
        state.turnOrder.length,
      units: [
        initiator,
        { ...middleEnvoy, at: { x: initiator.at.x + 1, y: initiator.at.y } },
        {
          ...thirdUnitBase,
        },
      ].sort((left, right) => left.id - right.id),
      defectionMarks: [
        {
          id: firstMarkId,
          sourceUnitId: initiator.id,
          targetUnitId: middle.id,
          initiatingPlayerId: initiator.ownerId,
          recordedTargetOwnerId: middle.ownerId,
          reservedHomeCityId: firstCity.id,
          offeredAtCommandIndex: 1,
          phase: "ARMED",
        },
        {
          id: secondMarkId,
          sourceUnitId: middle.id,
          targetUnitId: thirdUnitBase.id,
          initiatingPlayerId: middle.ownerId,
          recordedTargetOwnerId: thirdOwner.id,
          reservedHomeCityId: middleCity.id,
          offeredAtCommandIndex: 2,
          phase: "ARMED",
        },
      ],
    });
    const ended = applyCommandV7(state, activePlayerId(state), {
      kind: "END_TURN",
    });
    if (!ended.accepted) throw new Error(ended.error.code);
    expect(
      ended.events.filter(
        (event) =>
          event.kind === "DEFECTION_RESOLVED" ||
          event.kind === "DEFECTION_CANCELLED",
      ),
    ).toEqual([
      expect.objectContaining({
        kind: "DEFECTION_RESOLVED",
        markId: firstMarkId,
      }),
      {
        kind: "DEFECTION_CANCELLED",
        markId: secondMarkId,
        reason: "SOURCE_OWNER_CHANGED",
      },
    ]);
    expect(ended.state.defectionMarks).toEqual([]);
    expect(previewCityCapacityV7(ended.state, middleCity.id)).toMatchObject({
      reserved: 0,
    });
  });

  it("allows attacking a revealed Envoy over unexplored terrain without leaking or advancing", () => {
    let state = scenario(2, 0, 1, { line: true });
    const source = unitByRole(state, "ENVOY");
    const target = required(
      state.units.find((unit) => unit.ownerId !== source.ownerId),
      "target missing",
    );
    const attacker = roleVariant(
      target,
      state.nextEntityId,
      "FIGHTER",
      10,
      target.ownerId,
      { x: source.at.x + 1, y: source.at.y },
    );
    state = checkedV7({
      ...state,
      nextEntityId: state.nextEntityId + 1,
      players: state.players.map((player) =>
        player.id === target.ownerId
          ? {
              ...player,
              explored: player.explored.filter((at) => !same(at, source.at)),
            }
          : player,
      ),
      units: [
        ...state.units.map((unit) =>
          unit.id === source.id ? { ...unit, hp: 1 } : unit,
        ),
        attacker,
      ].sort((left, right) => left.id - right.id),
    });
    const city = required(
      state.cities.find((item) => item.ownerId === source.ownerId),
      "source city missing",
    );
    const offered = applyCommandV7(state, source.ownerId, {
      kind: "OFFER_DEFECTION",
      unitId: source.id,
      targetUnitId: target.id,
      homeCityId: city.id,
    });
    if (!offered.accepted) throw new Error(offered.error.code);
    const targetTurn = checkedV7({
      ...offered.state,
      activeSeatIndex: offered.state.turnOrder.indexOf(target.ownerId),
    });
    const targetView = viewForV7(targetTurn, target.ownerId);
    expect(
      targetView.board.tiles[
        source.at.y * targetView.board.width + source.at.x
      ],
    ).toEqual({ at: source.at, explored: false });
    expect(queryPlayerCommandsV7(targetView)).toContainEqual({
      kind: "ATTACK",
      unitId: attacker.id,
      targetUnitId: source.id,
    });
    const attacked = applyCommandV7(targetTurn, target.ownerId, {
      kind: "ATTACK",
      unitId: attacker.id,
      targetUnitId: source.id,
    });
    if (!attacked.accepted) throw new Error(attacked.error.code);
    expect(
      attacked.events.find((event) => event.kind === "COMBAT_RESOLVED"),
    ).toMatchObject({ preview: { defenderDies: true, advances: false } });
    expect(
      attacked.state.players
        .find((player) => player.id === target.ownerId)
        ?.explored.some((at) => same(at, source.at)),
    ).toBe(false);
  });

  it("suppresses an ambiguous endpoint target and preserves reducer rejection immutability", () => {
    let state = scenario(3, 0, 1, { line: true });
    const source = unitByRole(state, "ENVOY");
    const target = required(
      state.units.find((unit) => unit.ownerId !== source.ownerId),
      "target missing",
    );
    const third = required(
      state.players.find(
        (player) =>
          player.id !== source.ownerId && player.id !== target.ownerId,
      ),
      "third player missing",
    );
    const thirdCity = required(
      state.cities.find((city) => city.ownerId === third.id),
      "third city missing",
    );
    const thirdEnvoy = roleVariant(
      source,
      state.nextEntityId,
      "ENVOY",
      7,
      third.id,
      { x: target.at.x, y: target.at.y + 1 },
    );
    state = checkedV7({
      ...state,
      nextEntityId: state.nextEntityId + 1,
      players: state.players.map((player) =>
        player.id === third.id
          ? {
              ...player,
              explored: uniqueCoords([
                thirdEnvoy.at,
                target.at,
                ...state.board.tiles
                  .filter((tile) => tile.territoryCityId === thirdCity.id)
                  .map((tile) => tile.at),
              ]).filter((at) => !same(at, source.at)),
            }
          : player,
      ),
      units: [...state.units, thirdEnvoy].sort(
        (left, right) => left.id - right.id,
      ),
    });
    const unmarkedView = viewForV7(
      checkedV7({
        ...state,
        activeSeatIndex: state.turnOrder.indexOf(third.id),
      }),
      third.id,
    );
    expect(queryPlayerCommandsV7(unmarkedView)).toContainEqual({
      kind: "OFFER_DEFECTION",
      unitId: thirdEnvoy.id,
      targetUnitId: target.id,
      homeCityId: thirdCity.id,
    });
    const sourceCity = required(
      state.cities.find((city) => city.ownerId === source.ownerId),
      "source city missing",
    );
    const offered = applyCommandV7(state, source.ownerId, {
      kind: "OFFER_DEFECTION",
      unitId: source.id,
      targetUnitId: target.id,
      homeCityId: sourceCity.id,
    });
    if (!offered.accepted) throw new Error(offered.error.code);
    state = checkedV7({
      ...offered.state,
      activeSeatIndex: offered.state.turnOrder.indexOf(third.id),
    });
    const view = viewForV7(state, third.id);
    expect(view.defectionStatuses).toContainEqual({
      visibility: "ENDPOINT",
      endpointUnitId: target.id,
      phase: "WAITING_FOR_REPLY",
    });
    expect(
      queryPlayerCommandsV7(view).some(
        (command) =>
          command.kind === "OFFER_DEFECTION" &&
          command.targetUnitId === target.id,
      ),
    ).toBe(false);
    const command = {
      kind: "OFFER_DEFECTION" as const,
      unitId: thirdEnvoy.id,
      targetUnitId: target.id,
      homeCityId: thirdCity.id,
    };
    const rejected = applyCommandV7(state, third.id, command);
    expect(rejected).toMatchObject({
      accepted: false,
      error: { code: "DEFECTION_TARGET_MARKED" },
      events: [],
    });
    expect(rejected.state).toBe(state);
  });

  it("uses the frozen role-before-action-before-target rejection order without mutation", () => {
    const state = scenario(2, 0, 1);
    const source = unitByRole(state, "ENVOY");
    const command = {
      kind: "OFFER_DEFECTION" as const,
      unitId: source.id,
      targetUnitId: (state.nextEntityId + 50) as UnitStateV7["id"],
      homeCityId: required(
        state.cities.find((city) => city.ownerId === source.ownerId),
        "city missing",
      ).id,
    };
    const wrongRole = checkedV7({
      ...state,
      units: state.units.map((unit) =>
        unit.id === source.id
          ? { ...unit, role: "FIGHTER", hp: 10, maxHp: 10 }
          : unit,
      ),
    });
    const roleRejected = applyCommandV7(wrongRole, source.ownerId, command);
    expect(roleRejected).toMatchObject({
      accepted: false,
      error: { code: "UNIT_ROLE_INVALID" },
      events: [],
    });
    expect(roleRejected.state).toBe(wrongRole);
    const acted = checkedV7({
      ...state,
      units: state.units.map((unit) =>
        unit.id === source.id
          ? {
              ...unit,
              activation: { ...unit.activation, specialActed: true },
            }
          : unit,
      ),
    });
    const actedRejected = applyCommandV7(acted, source.ownerId, command);
    expect(actedRejected).toMatchObject({
      accepted: false,
      error: { code: "UNIT_ALREADY_ACTED" },
      events: [],
    });
    expect(actedRejected.state).toBe(acted);
    const targetRejected = applyCommandV7(state, source.ownerId, command);
    expect(targetRejected).toMatchObject({
      accepted: false,
      error: { code: "TARGET_NOT_FOUND" },
      events: [],
    });
    expect(targetRejected.state).toBe(state);
  });

  it("keeps unexplored empty and city-occupant variants preview-equivalent with an explicit unknown siege consequence", () => {
    let cityState = scenario(3, 0, 1);
    const source = unitByRole(cityState, "ENVOY");
    const target = required(
      cityState.units.find((unit) => unit.ownerId !== source.ownerId),
      "target missing",
    );
    const hiddenCity = required(
      cityState.cities.find(
        (city) =>
          city.ownerId !== target.ownerId && city.ownerId !== source.ownerId,
      ),
      "hidden city missing",
    );
    const hiddenSourceAt = required(
      adjacentOpen(cityState, hiddenCity.at),
      "hidden source coordinate missing",
    );
    const relocatedCenter = required(
      cityState.board.tiles.find(
        (tile) =>
          tile.territoryCityId === hiddenCity.id &&
          tile.site === null &&
          tile.terrain === "GRASS" &&
          tile.resource === null &&
          tile.improvement === null &&
          !same(tile.at, hiddenSourceAt) &&
          !same(tile.at, hiddenCity.at),
      ),
      "relocated center missing",
    ).at;
    cityState = checkedV7({
      ...cityState,
      players: cityState.players.map((player) =>
        player.id === source.ownerId
          ? {
              ...player,
              explored: player.explored.filter(
                (at) =>
                  !same(at, hiddenCity.at) &&
                  !same(at, hiddenSourceAt) &&
                  !same(at, relocatedCenter),
              ),
            }
          : player,
      ),
      units: cityState.units.map((unit) =>
        unit.id === source.id
          ? { ...unit, at: hiddenSourceAt }
          : unit.id === target.id
            ? {
                ...unit,
                at: hiddenCity.at,
                role: "SABOTEUR",
                blackoutEligibleRound: 1,
              }
            : unit,
      ),
    });
    const emptyState = checkedV7({
      ...cityState,
      board: {
        ...cityState.board,
        tiles: cityState.board.tiles.map((tile) =>
          same(tile.at, hiddenCity.at)
            ? { ...tile, site: null }
            : same(tile.at, relocatedCenter)
              ? { ...tile, site: "CAPITAL" as const }
              : tile,
        ),
      },
      cities: cityState.cities.map((city) =>
        city.id === hiddenCity.id ? { ...city, at: relocatedCenter } : city,
      ),
    });
    const cityView = viewForV7(cityState, source.ownerId);
    const emptyView = viewForV7(emptyState, source.ownerId);
    expect(emptyView).toEqual(cityView);
    const homeCity = required(
      cityState.cities.find((city) => city.ownerId === source.ownerId),
      "home city missing",
    );
    const command = {
      kind: "OFFER_DEFECTION" as const,
      unitId: source.id,
      targetUnitId: target.id,
      homeCityId: homeCity.id,
    };
    expect(previewDefectionV7(cityView, command)).toEqual(
      previewDefectionV7(emptyView, command),
    );
    expect(previewDefectionV7(cityView, command)).toMatchObject({
      ok: true,
      preview: { cityOccupantSiegeConsequence: "UNKNOWN_HIDDEN_TILE" },
    });
  });
});

function scenario(
  seatCount: 2 | 3 | 4,
  initiatingSeat: number,
  targetSeat: number,
  options: { readonly line?: boolean; readonly targetOnCity?: boolean } = {},
): GameStateV7 {
  const setup = setupV7(271 + seatCount, (seatCount - 1) as 1 | 2 | 3);
  const created = createInitialMapStateV7(setup);
  if (!created.ok) throw new Error(created.error.code);
  const initiator = required(
    created.state.players.find((player) => player.seat === initiatingSeat),
    "initiator missing",
  );
  const targetOwner = required(
    created.state.players.find((player) => player.seat === targetSeat),
    "target owner missing",
  );
  const sourceBase = required(
    created.state.units.find((unit) => unit.ownerId === initiator.id),
    "source missing",
  );
  const targetBase = required(
    created.state.units.find((unit) => unit.ownerId === targetOwner.id),
    "target missing",
  );
  const targetCity = required(
    created.state.cities.find((city) => city.ownerId === targetOwner.id),
    "target city missing",
  );
  const positions = options.targetOnCity
    ? {
        target: targetCity.at,
        source: required(
          adjacentOpen(created.state, targetCity.at),
          "adjacent source tile missing",
        ),
      }
    : required(openLine(created.state), "open line missing");
  const source: UnitStateV7 = {
    ...sourceBase,
    role: "ENVOY",
    at: positions.source,
    hp: 7,
    maxHp: 7,
    kills: 0,
    veteran: false,
    captureEligible: false,
    activation: READY,
    blackoutEligibleRound: null,
  };
  const target: UnitStateV7 = {
    ...targetBase,
    at: positions.target,
    activation: READY,
    captureEligible: false,
  };
  const activeSeatIndex = created.state.turnOrder.indexOf(initiator.id);
  return checkedV7({
    ...created.state,
    activeSeatIndex,
    players: created.state.players.map((player) =>
      player.id === initiator.id
        ? {
            ...player,
            explored: created.state.board.tiles.map((tile) => tile.at),
          }
        : player,
    ),
    units: [source, target].sort((left, right) => left.id - right.id),
  });
}

function openLine(
  state: GameStateV7,
): { readonly source: CoordV7; readonly target: CoordV7 } | undefined {
  for (const tile of state.board.tiles) {
    const target = { x: tile.at.x + 2, y: tile.at.y };
    const destination = { x: tile.at.x + 3, y: tile.at.y };
    if (
      tile.site === null &&
      openAt(state, target) &&
      openAt(state, destination)
    )
      return { source: tile.at, target };
  }
  return undefined;
}

function adjacentOpen(state: GameStateV7, at: CoordV7): CoordV7 | undefined {
  return state.board.tiles.find(
    (tile) =>
      tile.site === null &&
      Math.max(Math.abs(tile.at.x - at.x), Math.abs(tile.at.y - at.y)) === 1,
  )?.at;
}

function openAt(state: GameStateV7, at: CoordV7): boolean {
  const tile = state.board.tiles[at.y * state.board.width + at.x];
  return (
    tile !== undefined &&
    tile.at.x === at.x &&
    tile.at.y === at.y &&
    tile.site === null &&
    tile.terrain !== "MOUNTAIN" &&
    !state.treasureChests.some((chest) => same(chest, at))
  );
}

function activePlayerId(state: GameStateV7): PlayerId {
  return required(
    state.turnOrder[state.activeSeatIndex],
    "active player missing",
  );
}

function unitByRole(state: GameStateV7, role: UnitRoleIdV7): UnitStateV7 {
  return required(
    state.units.find((unit) => unit.role === role),
    `${role} missing`,
  );
}

function roleVariant(
  source: UnitStateV7,
  id: number,
  role: UnitRoleIdV7,
  maxHp: number,
  ownerId: PlayerId = source.ownerId,
  at: CoordV7 = source.at,
): UnitStateV7 {
  return {
    ...source,
    id: id as UnitStateV7["id"],
    ownerId,
    homeCityId: null,
    role,
    at,
    hp: maxHp,
    maxHp,
    kills: 0,
    veteran: false,
    activation: READY,
    blackoutEligibleRound: role === "SABOTEUR" ? 1 : null,
  };
}

function offerAndResolve(
  initial: GameStateV7,
  sourceUnitId: UnitStateV7["id"],
  targetUnitId: UnitStateV7["id"],
): {
  readonly state: GameStateV7;
  readonly events: readonly DomainEventV7[];
} {
  const source = required(
    initial.units.find((unit) => unit.id === sourceUnitId),
    "source missing",
  );
  const city = required(
    initial.cities.find((item) => item.ownerId === source.ownerId),
    "source city missing",
  );
  const offer = applyCommandV7(initial, source.ownerId, {
    kind: "OFFER_DEFECTION",
    unitId: sourceUnitId,
    targetUnitId,
    homeCityId: city.id,
  });
  if (!offer.accepted) throw new Error(offer.error.code);
  let state = offer.state;
  for (let guard = 0; guard < state.turnOrder.length * 2; guard += 1) {
    const ended = applyCommandV7(state, activePlayerId(state), {
      kind: "END_TURN",
    });
    if (!ended.accepted) throw new Error(ended.error.code);
    state = ended.state;
    if (
      ended.events.some(
        (event) =>
          event.kind === "DEFECTION_RESOLVED" &&
          event.targetUnitId === targetUnitId,
      )
    )
      return { state, events: ended.events };
  }
  throw new Error("Defection did not resolve");
}

function unusedOpenCoords(
  state: GameStateV7,
  count: number,
): readonly CoordV7[] {
  const occupied = new Set(
    state.units.map((unit) => `${unit.at.y},${unit.at.x}`),
  );
  return state.board.tiles
    .filter(
      (tile) =>
        tile.site === null &&
        tile.terrain !== "MOUNTAIN" &&
        !occupied.has(`${tile.at.y},${tile.at.x}`) &&
        !state.treasureChests.some((chest) => same(chest, tile.at)),
    )
    .slice(0, count)
    .map((tile) => tile.at);
}

function uniqueCoords(values: readonly CoordV7[]): readonly CoordV7[] {
  return [
    ...new Map(values.map((at) => [`${at.y},${at.x}`, at])).values(),
  ].sort((left, right) => left.y - right.y || left.x - right.x);
}

function required<T>(value: T | undefined, message: string): T {
  if (value === undefined) throw new Error(message);
  return value;
}

function same(left: CoordV7, right: CoordV7): boolean {
  return left.x === right.x && left.y === right.y;
}
