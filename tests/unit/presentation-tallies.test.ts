import { describe, expect, it } from "vitest";
import {
  accumulatePlayerTallies,
  resultTalliesForHuman,
} from "../../src/app/controller";
import type { PlayerMatchTallies } from "../../src/app/types";
import type { DomainEvent, UnitId } from "../../src/engine/index";
import { gameStateBuilder, setupBuilder } from "../fixtures/builders";

describe("presentation combat and result tallies", () => {
  it("does not credit AI-vs-AI or elimination deaths to the human, but credits a human combat kill", () => {
    const state = gameStateBuilder(
      setupBuilder({ aiCount: 2, width: 14, height: 14, seed: 7 }),
    );
    const human = state.players.find((player) => player.controller === "HUMAN");
    const ais = state.players.filter((player) => player.controller === "AI");
    const firstAi = ais[0];
    const secondAi = ais[1];
    if (
      human === undefined ||
      firstAi === undefined ||
      secondAi === undefined
    ) {
      throw new Error("Missing three-player fixture seats");
    }
    const humanUnit = state.units.find((unit) => unit.ownerId === human.id);
    const firstAiUnit = state.units.find((unit) => unit.ownerId === firstAi.id);
    const secondAiUnit = state.units.find(
      (unit) => unit.ownerId === secondAi.id,
    );
    if (
      humanUnit === undefined ||
      firstAiUnit === undefined ||
      secondAiUnit === undefined
    ) {
      throw new Error("Missing three-player fixture units");
    }
    const initial: readonly PlayerMatchTallies[] = state.players.map(
      (player) => ({
        playerId: player.id,
        kills: 0,
        losses: 0,
        citiesCaptured: 0,
      }),
    );

    const afterAiCombat = accumulatePlayerTallies(
      state,
      [
        combatEvent(firstAiUnit.id, secondAiUnit.id),
        { kind: "UNIT_DIED", unitId: secondAiUnit.id, cause: "ATTACK" },
      ],
      initial,
    );
    expect(resultTalliesForHuman(afterAiCombat, human.id)).toEqual({
      citiesCaptured: 0,
      unitsDefeated: 0,
      unitsLost: 0,
    });
    expect(tally(afterAiCombat, firstAi.id)).toMatchObject({ kills: 1 });
    expect(tally(afterAiCombat, secondAi.id)).toMatchObject({ losses: 1 });

    const afterHumanCombat = accumulatePlayerTallies(
      state,
      [
        combatEvent(humanUnit.id, firstAiUnit.id),
        { kind: "UNIT_DIED", unitId: firstAiUnit.id, cause: "ATTACK" },
      ],
      afterAiCombat,
    );
    expect(resultTalliesForHuman(afterHumanCombat, human.id)).toEqual({
      citiesCaptured: 0,
      unitsDefeated: 1,
      unitsLost: 0,
    });

    const afterCleanup = accumulatePlayerTallies(
      state,
      [{ kind: "UNIT_DIED", unitId: humanUnit.id, cause: "ELIMINATION" }],
      afterHumanCombat,
    );
    expect(resultTalliesForHuman(afterCleanup, human.id)).toEqual({
      citiesCaptured: 0,
      unitsDefeated: 1,
      unitsLost: 1,
    });
    expect(tally(afterCleanup, firstAi.id)).toMatchObject({ kills: 1 });
    expect(tally(afterCleanup, secondAi.id)).toMatchObject({ kills: 0 });
  });

  it("credits city captures only to the capturing player", () => {
    const state = gameStateBuilder(
      setupBuilder({ aiCount: 2, width: 14, height: 14, seed: 9 }),
    );
    const human = state.players.find((player) => player.controller === "HUMAN");
    const ai = state.players.find((player) => player.controller === "AI");
    const city = state.cities[0];
    if (human === undefined || ai === undefined || city === undefined) {
      throw new Error("Missing capture fixture data");
    }
    const initial = state.players.map((player) => ({
      playerId: player.id,
      kills: 0,
      losses: 0,
      citiesCaptured: 0,
    }));
    const afterAiCapture = accumulatePlayerTallies(
      state,
      [{ kind: "CITY_CAPTURED", cityId: city.id, from: human.id, to: ai.id }],
      initial,
    );
    expect(resultTalliesForHuman(afterAiCapture, human.id).citiesCaptured).toBe(
      0,
    );
    const afterHumanCapture = accumulatePlayerTallies(
      state,
      [{ kind: "CITY_CAPTURED", cityId: city.id, from: ai.id, to: human.id }],
      afterAiCapture,
    );
    expect(
      resultTalliesForHuman(afterHumanCapture, human.id).citiesCaptured,
    ).toBe(1);
  });

  it("counts Roll casualties by owner and credits only hostile victims", () => {
    const state = gameStateBuilder(
      setupBuilder({
        aiCount: 2,
        width: 14,
        height: 14,
        seed: 13,
        aiMode: "COOPERATIVE",
      }),
    );
    const human = state.players.find((player) => player.controller === "HUMAN");
    const [rollerOwner, alliedOwner] = state.players.filter(
      (player) => player.controller === "AI",
    );
    const roller = state.units.find((unit) => unit.ownerId === rollerOwner?.id);
    const ally = state.units.find((unit) => unit.ownerId === alliedOwner?.id);
    const hostile = state.units.find((unit) => unit.ownerId === human?.id);
    if (
      human === undefined ||
      rollerOwner === undefined ||
      alliedOwner === undefined ||
      roller === undefined ||
      ally === undefined ||
      hostile === undefined
    ) {
      throw new Error("Missing cooperative Roll fixture data");
    }
    const initial = state.players.map((player) => ({
      playerId: player.id,
      kills: 0,
      losses: 0,
      citiesCaptured: 0,
    }));
    const rolled = accumulatePlayerTallies(
      state,
      [
        rollDamageEvent(roller.id, ally.id),
        { kind: "UNIT_DIED", unitId: ally.id, cause: "KAMIKAZE_ROLL" },
        rollDamageEvent(roller.id, hostile.id),
        { kind: "UNIT_DIED", unitId: hostile.id, cause: "KAMIKAZE_ROLL" },
        {
          kind: "UNIT_DIED",
          unitId: roller.id,
          cause: "KAMIKAZE_ROLL_SELF",
        },
      ],
      initial,
    );
    expect(tally(rolled, rollerOwner.id)).toMatchObject({
      kills: 1,
      losses: 1,
    });
    expect(tally(rolled, alliedOwner.id)).toMatchObject({
      kills: 0,
      losses: 1,
    });
    expect(tally(rolled, human.id)).toMatchObject({ kills: 0, losses: 1 });
  });
});

function combatEvent(attackerId: UnitId, defenderId: UnitId): DomainEvent {
  return {
    kind: "COMBAT_RESOLVED",
    preview: {
      attackerId,
      target: { kind: "UNIT", unitId: defenderId },
      damageToDefender: 10,
      damageToAttacker: 0,
      defenderDies: true,
      attackerDies: false,
      advances: true,
      noRetaliationReason: "DEFENDER_DIED",
    },
  };
}

function rollDamageEvent(sourceUnitId: UnitId, unitId: UnitId): DomainEvent {
  return {
    kind: "ROLL_DAMAGE_RESOLVED",
    sourceUnitId,
    target: { kind: "UNIT", unitId },
    at: { x: 0, y: 0 },
    damage: 10,
    hpBefore: 10,
    hpAfter: 0,
  };
}

function tally(
  tallies: readonly PlayerMatchTallies[],
  playerId: number,
): PlayerMatchTallies {
  const value = tallies.find((candidate) => candidate.playerId === playerId);
  if (value === undefined)
    throw new Error(`Missing tally for Player ${playerId}`);
  return value;
}
