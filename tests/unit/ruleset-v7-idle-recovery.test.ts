import { describe, expect, it } from "vitest";
import {
  applyCommandV7,
  queryIdleRecoveryV7,
  queryPlayerCommandsV7,
  recoverEligibleV7,
  recoveryGainV7,
  recoveryHealV7,
  viewForV7,
  type GameStateV7,
  type RecoveryFactsV7,
  type UnitStateV7,
} from "../../src/engine/index";
import { checkedV7 } from "../fixtures/v7-builders";
import {
  dinosaurCityFixtureV7,
  dinosaurShowcaseFixtureV7,
} from "../fixtures/v7-dinosaur-ui";
import { dwarfDigInFixtureV7, dwarfUiFixtureV7 } from "../fixtures/v7-dwarf-ui";
import { goblinShowcaseFixtureV7 } from "../fixtures/v7-goblin-ui";
import { iceFolkUiFixtureV7 } from "../fixtures/v7-ice-folk-ui";
import { martianUiFixtureV7 } from "../fixtures/v7-martian-ui";
import {
  undeadShowcaseFixtureV7,
  undeadUiArenaV7,
} from "../fixtures/v7-undead-ui";

/**
 * Bead pulp_wars-v3w: section 10 idle recovery is the automatic form of
 * Recover. The offered `RECOVER`, the End Turn hint (`queryIdleRecoveryV7`),
 * and End Turn itself share `recoverEligibleV7` and `recoveryGainV7`.
 */

const FIXTURES: readonly (readonly [string, () => GameStateV7])[] = [
  ["Undead showcase", undeadShowcaseFixtureV7],
  ["Goblin showcase", goblinShowcaseFixtureV7],
  ["Dinosaur showcase", dinosaurShowcaseFixtureV7],
  ["Dinosaur nest", () => dinosaurCityFixtureV7()],
  ["Martian abilities", () => martianUiFixtureV7()],
  ["Ice Folk abilities", () => iceFolkUiFixtureV7()],
  ["Dwarf abilities", () => dwarfUiFixtureV7()],
  ["Dwarf passengers", dwarfDigInFixtureV7],
];

/** Every unit that can be wounded is left with 1 HP. */
function wounded(state: GameStateV7): GameStateV7 {
  return checkedV7({
    ...state,
    units: state.units.map((unit) =>
      unit.maxHp > 1 ? { ...unit, hp: 1 } : unit,
    ),
  });
}

function offeredRecoverIds(state: GameStateV7): number[] {
  return queryPlayerCommandsV7(viewForV7(state, state.humanPlayerId))
    .flatMap((command) => (command.kind === "RECOVER" ? [command.unitId] : []))
    .sort((left, right) => left - right);
}

function endTurnRecoveries(state: GameStateV7) {
  const result = applyCommandV7(state, state.humanPlayerId, {
    kind: "END_TURN",
  });
  if (!result.accepted) throw new Error(result.error.code);
  // Only the human's own End Turn step: the events before TURN_ENDED.
  const ended = result.events.findIndex((event) => event.kind === "TURN_ENDED");
  return result.events.slice(0, ended).flatMap((event) =>
    event.kind === "UNIT_RECOVERED"
      ? [
          {
            unitId: event.unitId,
            amount: event.amount,
            automatic: event.automatic,
          },
        ]
      : [],
  );
}

function expectAgreement(state: GameStateV7): number {
  const hint = queryIdleRecoveryV7(state, state.humanPlayerId);
  const offered = offeredRecoverIds(state);
  // Offered equals idle: the same units, in unit-ID order.
  expect(hint.map((entry) => entry.unitId)).toEqual(offered);
  // End Turn heals exactly those units by exactly the hinted amounts.
  expect(endTurnRecoveries(state)).toEqual(
    hint.map((entry) => ({ ...entry, automatic: true })),
  );
  // And an explicit Recover is accepted for each, with the same amount.
  for (const entry of hint) {
    const explicit = applyCommandV7(state, state.humanPlayerId, {
      kind: "RECOVER",
      unitId: entry.unitId,
    });
    if (!explicit.accepted) throw new Error(explicit.error.code);
    expect(explicit.events).toContainEqual({
      kind: "UNIT_RECOVERED",
      unitId: entry.unitId,
      amount: entry.amount,
      automatic: false,
    });
  }
  // No other own unit accepts a Recover.
  for (const unit of state.units)
    if (
      unit.ownerId === state.humanPlayerId &&
      !offered.includes(unit.id) &&
      applyCommandV7(state, state.humanPlayerId, {
        kind: "RECOVER",
        unitId: unit.id,
      }).accepted
    )
      throw new Error(`Unit ${unit.id} accepts an unoffered Recover`);
  return hint.length;
}

describe("Ruleset 7 idle recovery is the automatic Recover (pulp_wars-v3w)", () => {
  it.each(FIXTURES)(
    "%s: offered Recover, the End Turn hint and End Turn agree",
    (_name, fixture) => {
      expectAgreement(fixture());
      expectAgreement(wounded(fixture()));
    },
  );

  it("covers a recovering unit in at least one fixture per check", () => {
    const total = FIXTURES.reduce(
      (sum, [, fixture]) => sum + expectAgreement(wounded(fixture())),
      0,
    );
    expect(total).toBeGreaterThan(5);
  });

  it("heals 4 in own territory and 2 elsewhere, capped at the missing HP", () => {
    const base = undeadUiArenaV7([], [], ["ORIGINAL", "UNDEAD"]);
    const human = base.humanPlayerId;
    const taken = (at: { x: number; y: number }) =>
      base.cities.some((city) => city.at.x === at.x && city.at.y === at.y);
    const land = base.board.tiles.filter(
      // The arena turns every piece's tile without a site into Grass.
      (tile) => tile.site === null && !taken(tile.at),
    );
    const ownCityIds = new Set(
      base.cities.filter((city) => city.ownerId === human).map((c) => c.id),
    );
    const own = land.filter(
      (tile) =>
        tile.territoryCityId !== null && ownCityIds.has(tile.territoryCityId),
    );
    const neutral = land.filter((tile) => tile.territoryCityId === null);
    const [ownA, ownB, ownC] = own;
    const [neutralA] = neutral;
    if (
      ownA === undefined ||
      ownB === undefined ||
      ownC === undefined ||
      neutralA === undefined
    )
      throw new Error("recovery tiles missing");
    const state = undeadUiArenaV7(
      [
        { seat: 0, role: "FIGHTER", at: ownA.at, hp: 1 },
        // 1 of the Fighter's 12 HP missing: the gain is capped.
        { seat: 0, role: "FIGHTER", at: ownB.at, hp: 11 },
        // Full HP: nothing to recover.
        { seat: 0, role: "FIGHTER", at: ownC.at },
        { seat: 0, role: "FIGHTER", at: neutralA.at, hp: 1 },
      ],
      [],
      ["ORIGINAL", "UNDEAD"],
    );
    const ids = state.units.map((unit) => unit.id);
    expect(queryIdleRecoveryV7(state, human)).toEqual([
      { unitId: ids[0], amount: 4 },
      { unitId: ids[1], amount: 1 },
      { unitId: ids[3], amount: 2 },
    ]);
    expectAgreement(state);

    // Wait changes nothing; a Recover taken early is not repeated.
    const waited = applyCommandV7(state, human, {
      kind: "WAIT",
      unitId: ids[0] as UnitStateV7["id"],
    });
    if (!waited.accepted) throw new Error(waited.error.code);
    expect(queryIdleRecoveryV7(waited.state, human)).toHaveLength(3);
    expectAgreement(waited.state);
    const recovered = applyCommandV7(waited.state, human, {
      kind: "RECOVER",
      unitId: ids[3] as UnitStateV7["id"],
    });
    if (!recovered.accepted) throw new Error(recovered.error.code);
    expect(queryIdleRecoveryV7(recovered.state, human)).toEqual([
      { unitId: ids[0], amount: 4 },
      { unitId: ids[1], amount: 1 },
    ]);
    expectAgreement(recovered.state);

    // A unit that moved does not recover.
    const moves = queryPlayerCommandsV7(viewForV7(state, human)).filter(
      (command) => command.kind === "MOVE" && command.unitId === ids[0],
    );
    const move = moves[0];
    if (move === undefined) throw new Error("move missing");
    const moved = applyCommandV7(state, human, move);
    if (!moved.accepted) throw new Error(moved.error.code);
    expect(
      queryIdleRecoveryV7(moved.state, human).map((entry) => entry.unitId),
    ).toEqual([ids[1], ids[3]]);
    expectAgreement(moved.state);

    // Off the viewer's turn there is no hint.
    const ended = applyCommandV7(state, human, { kind: "END_TURN" });
    if (!ended.accepted) throw new Error(ended.error.code);
    if (ended.state.turnOrder[ended.state.activeSeatIndex] !== human)
      expect(queryIdleRecoveryV7(ended.state, human)).toEqual([]);
  });

  it("the shared predicate and amount follow section 10", () => {
    const ready: RecoveryFactsV7 = {
      form: "LAND",
      hp: 3,
      maxHp: 10,
      activation: {
        moved: false,
        attacked: false,
        recovered: false,
        captured: false,
        specialActed: false,
      },
      construct: false,
      restless: false,
      inOwnTerritory: true,
      byOwnActivePort: false,
      deepWinter: false,
    };
    expect(recoverEligibleV7(ready)).toBe(true);
    expect(recoveryHealV7(ready)).toBe(4);
    expect(recoveryHealV7({ ...ready, deepWinter: true })).toBe(6);
    expect(recoveryHealV7({ ...ready, inOwnTerritory: false })).toBe(2);
    expect(recoveryGainV7({ ...ready, hp: 8, deepWinter: true })).toBe(2);
    for (const flag of [
      "moved",
      "attacked",
      "recovered",
      "captured",
      "specialActed",
    ] as const)
      expect(
        recoverEligibleV7({
          ...ready,
          activation: { ...ready.activation, [flag]: true },
        }),
      ).toBe(false);
    expect(recoverEligibleV7({ ...ready, hp: 10 })).toBe(false);
    expect(recoverEligibleV7({ ...ready, construct: true })).toBe(false);
    expect(recoverEligibleV7({ ...ready, form: "EGG" })).toBe(false);
    expect(recoverEligibleV7({ ...ready, form: "EMBARKED" })).toBe(false);
    // Restless: only outside own territory, and only in land form.
    expect(recoverEligibleV7({ ...ready, restless: true })).toBe(true);
    expect(
      recoverEligibleV7({ ...ready, restless: true, inOwnTerritory: false }),
    ).toBe(false);
    // A ship recovers 4 by an own active Port and not at all elsewhere.
    const ship = { ...ready, form: "NAVAL" as const, inOwnTerritory: false };
    expect(recoverEligibleV7(ship)).toBe(false);
    expect(recoverEligibleV7({ ...ship, byOwnActivePort: true })).toBe(true);
    expect(recoveryHealV7({ ...ship, byOwnActivePort: true })).toBe(4);
    expect(
      recoverEligibleV7({ ...ship, restless: true, byOwnActivePort: true }),
    ).toBe(true);
  });
});
