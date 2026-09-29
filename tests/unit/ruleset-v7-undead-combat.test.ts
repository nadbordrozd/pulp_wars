import { describe, expect, it } from "vitest";
import {
  DOMAIN_EVENT_KIND_ORDER_V7,
  INFECT_RISING_HP_V7,
  RULESET_7_ID,
  TECHNOLOGY_IDS_V7,
  appendReplayCommandV7,
  applyCommandV7,
  assignedUnitCountV7,
  calculateCombatPreviewV7,
  canonicalHash,
  cityUnitCapacityV7,
  createInitialMapStateV7,
  createPlayableGameV7,
  createReplayV7,
  effectiveRoleRuleV7,
  estimateCombatV7,
  isCityBesiegedV7,
  parseEventV7,
  parseGameStateV7,
  parsePlayerEventEnvelopeV7,
  parseReplayJsonV7,
  projectEventsV7,
  queryCombatPreviewV7,
  queryPlayerCommandsV7,
  runReplayV7,
  unitId,
  type CombatPreviewV7,
  type CommandV7,
  type CoordV7,
  type DomainEventV7,
  type FactionIdV7,
  type GameStateV7,
  type MatchSetupV7,
  type PlayerId,
  type TileStateV7,
  type UnitRoleIdV7,
  type UnitStateV7,
} from "../../src/engine/index";
import { runAiMatchV7 } from "../../src/headless/v7";
import { createSaveEnvelopeV7, parseSaveV7 } from "../../src/persistence/index";
import { checkedV7 } from "../fixtures/v7-builders";

// Seed-2 DRY_LAND boards (factions never change the board):
// - two seats (11x11): seat-0 capital (8, 8) with territory x 7-9, y 7-9;
//   seat-1 capital (2, 8) with territory x 1-3, y 7-9; rows 0-4 west of
//   x 6 are open neutral land.
// - three seats (14x14): capitals (2, 2), (11, 11), and (11, 2).
const SEAT0_CAPITAL = { x: 8, y: 8 } as const;

const READY: UnitStateV7["activation"] = {
  moved: false,
  movedPathLength: 0,
  attacked: false,
  attacksUsed: 0,
  tendedThisTurn: false,
  inspired: false,
  overrunActive: false,
  escapeAvailable: false,
  recovered: false,
  captured: false,
  handled: false,
  specialActed: false,
};

const EXHAUSTED: UnitStateV7["activation"] = {
  moved: true,
  movedPathLength: 0,
  attacked: true,
  attacksUsed: 1,
  tendedThisTurn: false,
  inspired: false,
  overrunActive: false,
  escapeAvailable: false,
  recovered: true,
  captured: true,
  handled: true,
  specialActed: true,
};

const NEUTRAL_UNDEAD_FIELDS = {
  attackerHeal: 0,
  defenderHeal: 0,
  attackerInfected: false,
  defenderInfected: false,
} as const;

describe("ruleset-7 revision-13 Infect", () => {
  it("raises a land victim killed by a Zombie's attack as a Zombie in place", () => {
    for (const [factions, role] of [
      [["UNDEAD", "ORIGINAL"], "FIGHTER"],
      [["UNDEAD", "ORIGINAL"], "JUGGERNAUT"],
      [["UNDEAD", "UNDEAD"], "JUGGERNAUT"],
      [["UNDEAD", "UNDEAD"], "GUARD"],
    ] as const) {
      const state = arena(factions, [
        { seat: 0, role: "GUARD", at: { x: 2, y: 3 } },
        { seat: 1, role, at: { x: 3, y: 3 }, hp: 1 },
      ]);
      const zombie = unitAt(state, { x: 2, y: 3 });
      const victim = unitAt(state, { x: 3, y: 3 });
      const risingId = unitId(state.nextEntityId);
      const result = attack(state, { x: 2, y: 3 }, { x: 3, y: 3 });
      const preview = combatPreview(result.events);
      expect(preview).toMatchObject({
        defenderDies: true,
        attackerDies: false,
        advances: false,
        defenderInfected: true,
        attackerInfected: false,
        attackerHeal: 0,
        defenderHeal: 0,
      });
      expect(withoutTail(result.events)).toEqual([
        expect.objectContaining({ kind: "COMBAT_RESOLVED" }),
        { kind: "UNIT_DIED", unitId: victim.id, cause: "ATTACK" },
        {
          kind: "UNIT_INFECTED",
          playerId: zombie.ownerId,
          sourceUnitId: zombie.id,
          victimUnitId: victim.id,
          unitId: risingId,
          at: { x: 3, y: 3 },
          homeCityId: zombie.homeCityId,
        },
      ]);
      // No Grave for the infected victim, and the Zombie never advances.
      expect(result.state.graves).toEqual([]);
      expect(unitById(result.state, zombie.id)).toMatchObject({
        at: { x: 2, y: 3 },
        hp: zombie.hp,
        kills: 1,
      });
      expect(result.state.units.some((unit) => unit.id === victim.id)).toBe(
        false,
      );
      expect(unitById(result.state, risingId)).toEqual({
        id: risingId,
        ownerId: zombie.ownerId,
        homeCityId: zombie.homeCityId,
        role: "GUARD",
        form: "LAND",
        at: { x: 3, y: 3 },
        hp: INFECT_RISING_HP_V7,
        maxHp: 20,
        kills: 0,
        veteran: false,
        captureEligible: false,
        activation: EXHAUSTED,
      });
      expect(INFECT_RISING_HP_V7).toBe(10);
      expect(result.state.nextEntityId).toBe(state.nextEntityId + 1);
      expect(parseGameStateV7(result.state)).toEqual(result.state);
      expectPublicPreviewMatches(state, zombie.id, victim.id, preview);
    }
  });

  it("raises an attacker killed by a Zombie's retaliation for the Zombie's owner", () => {
    const state = arena(
      ["ORIGINAL", "UNDEAD"],
      [
        { seat: 0, role: "FIGHTER", at: { x: 2, y: 3 }, hp: 1 },
        { seat: 1, role: "GUARD", at: { x: 3, y: 3 } },
      ],
    );
    const attacker = unitAt(state, { x: 2, y: 3 });
    const zombie = unitAt(state, { x: 3, y: 3 });
    const risingId = unitId(state.nextEntityId);
    const result = attack(state, { x: 2, y: 3 }, { x: 3, y: 3 });
    const preview = combatPreview(result.events);
    expect(preview).toMatchObject({
      retaliation: true,
      attackerDies: true,
      attackerInfected: true,
      defenderInfected: false,
    });
    expect(withoutTail(result.events)).toEqual([
      expect.objectContaining({ kind: "COMBAT_RESOLVED" }),
      { kind: "UNIT_DIED", unitId: attacker.id, cause: "RETALIATION" },
      {
        kind: "UNIT_INFECTED",
        playerId: zombie.ownerId,
        sourceUnitId: zombie.id,
        victimUnitId: attacker.id,
        unitId: risingId,
        at: { x: 2, y: 3 },
        homeCityId: zombie.homeCityId,
      },
    ]);
    expect(result.state.graves).toEqual([]);
    expect(unitById(result.state, zombie.id).kills).toBe(1);
    expect(unitById(result.state, risingId)).toMatchObject({
      ownerId: zombie.ownerId,
      homeCityId: zombie.homeCityId,
      role: "GUARD",
      at: { x: 2, y: 3 },
      hp: 10,
      maxHp: 20,
      activation: EXHAUSTED,
      captureEligible: false,
    });
    expectPublicPreviewMatches(state, attacker.id, zombie.id, preview);
  });

  it("raises a Human Knight whose Overrun ends in a Zombie's retaliation, over its Grave", () => {
    const state = arena(
      ["ORIGINAL", "UNDEAD"],
      [
        { seat: 0, role: "KNIGHT", at: { x: 1, y: 3 }, hp: 2 },
        { seat: 1, role: "FIGHTER", at: { x: 2, y: 3 }, hp: 1 },
        { seat: 1, role: "GUARD", at: { x: 3, y: 3 } },
      ],
    );
    const knight = unitAt(state, { x: 1, y: 3 });
    const zombie = unitAt(state, { x: 3, y: 3 });
    const first = attack(state, { x: 1, y: 3 }, { x: 2, y: 3 });
    expect(combatPreview(first.events).overrunContinues).toBe(true);
    expect(first.state.graves).toEqual([{ x: 2, y: 3 }]);
    const second = attack(first.state, { x: 2, y: 3 }, { x: 3, y: 3 });
    expect(withoutTail(second.events).slice(1)).toEqual([
      { kind: "UNIT_DIED", unitId: knight.id, cause: "RETALIATION" },
      {
        kind: "UNIT_INFECTED",
        playerId: zombie.ownerId,
        sourceUnitId: zombie.id,
        victimUnitId: knight.id,
        unitId: unitId(first.state.nextEntityId),
        at: { x: 2, y: 3 },
        homeCityId: zombie.homeCityId,
      },
    ]);
    // The first victim's Grave stays under the risen Zombie.
    expect(second.state.graves).toEqual([{ x: 2, y: 3 }]);
    expect(unitAt(second.state, { x: 2, y: 3 })).toMatchObject({
      ownerId: zombie.ownerId,
      role: "GUARD",
    });
  });

  it("never infects naval or embarked victims", () => {
    // A Zombie's attack on an embarked unit.
    const embarked = arena(
      ["UNDEAD", "ORIGINAL"],
      [
        { seat: 0, role: "GUARD", at: { x: 2, y: 3 } },
        {
          seat: 1,
          role: "FIGHTER",
          at: { x: 3, y: 3 },
          form: "EMBARKED",
          hp: 1,
        },
      ],
      { water: [{ x: 3, y: 3 }] },
    );
    const passenger = unitAt(embarked, { x: 3, y: 3 });
    const sunk = attack(embarked, { x: 2, y: 3 }, { x: 3, y: 3 });
    expect(combatPreview(sunk.events)).toMatchObject({
      defenderDies: true,
      defenderInfected: false,
    });
    expect(withoutTail(sunk.events).slice(1)).toEqual([
      { kind: "UNIT_DIED", unitId: passenger.id, cause: "ATTACK" },
    ]);
    expect(sunk.state.units).toHaveLength(1);
    expect(sunk.state.nextEntityId).toBe(embarked.nextEntityId);

    // A Zombie's retaliation against a naval attacker.
    const naval = arena(
      ["ORIGINAL", "UNDEAD"],
      [
        {
          seat: 0,
          role: "PATROL_BOAT",
          at: { x: 3, y: 1 },
          form: "NAVAL",
          hp: 1,
        },
        { seat: 1, role: "GUARD", at: { x: 2, y: 1 } },
      ],
      { water: [{ x: 3, y: 1 }] },
    );
    const boat = unitAt(naval, { x: 3, y: 1 });
    const repelled = attack(naval, { x: 3, y: 1 }, { x: 2, y: 1 });
    expect(combatPreview(repelled.events)).toMatchObject({
      attackerDies: true,
      attackerInfected: false,
    });
    expect(withoutTail(repelled.events).slice(1)).toEqual([
      { kind: "UNIT_DIED", unitId: boat.id, cause: "RETALIATION" },
    ]);
    expect(repelled.state.units).toHaveLength(1);
    expect(repelled.state.graves).toEqual([]);
  });

  it("besieges a city when the victim dies on its center, and may capture it next turn", () => {
    const state = arena(
      ["ORIGINAL", "UNDEAD"],
      [
        { seat: 0, role: "FIGHTER", at: SEAT0_CAPITAL, hp: 1 },
        { seat: 1, role: "GUARD", at: { x: 8, y: 7 } },
      ],
      { activeSeat: 1 },
    );
    const capital = cityAt(state, SEAT0_CAPITAL);
    const undead = seatPlayer(state, 1);
    expect(isCityBesiegedV7(state, capital)).toBe(false);
    const result = attack(state, { x: 8, y: 7 }, SEAT0_CAPITAL);
    const risen = unitAt(result.state, SEAT0_CAPITAL);
    expect(risen).toMatchObject({ ownerId: undead, role: "GUARD", hp: 10 });
    expect(result.state.graves).toEqual([]);
    expect(
      isCityBesiegedV7(result.state, cityAt(result.state, SEAT0_CAPITAL)),
    ).toBe(true);

    const undeadTurnEnded = apply(result.state, undead, { kind: "END_TURN" });
    const human = undeadTurnEnded.state.humanPlayerId;
    expect(
      applyCommandV7(undeadTurnEnded.state, human, {
        kind: "TRAIN",
        cityId: capital.id,
        role: "FIGHTER",
      }),
    ).toMatchObject({ accepted: false, error: { code: "CITY_BESIEGED" } });
    const humanTurnEnded = apply(undeadTurnEnded.state, human, {
      kind: "END_TURN",
    });
    expect(unitById(humanTurnEnded.state, risen.id).captureEligible).toBe(true);
    const captured = apply(humanTurnEnded.state, undead, {
      kind: "CAPTURE",
      unitId: risen.id,
    });
    expect(captured.events).toContainEqual({
      kind: "CITY_CAPTURED",
      cityId: capital.id,
      from: human,
      to: undead,
    });
  });

  it("homes the rising to the Zombie's city even over capacity, or orphans it", () => {
    const probe = arena(["UNDEAD", "ORIGINAL"], []);
    const home = required(
      probe.cities.find((city) => city.ownerId === probe.humanPlayerId),
    );
    const capacity = cityUnitCapacityV7(probe, home);
    const fillers = Array.from({ length: capacity - 1 }, (_, index) => ({
      seat: 0,
      role: "FIGHTER" as const,
      at: { x: index, y: 0 },
    }));
    const full = arena(
      ["UNDEAD", "ORIGINAL"],
      [
        { seat: 0, role: "GUARD", at: { x: 2, y: 3 } },
        { seat: 1, role: "FIGHTER", at: { x: 3, y: 3 }, hp: 1 },
        ...fillers,
      ],
    );
    expect(assignedUnitCountV7(full, home.id)).toBe(capacity);
    const result = attack(full, { x: 2, y: 3 }, { x: 3, y: 3 });
    expect(unitAt(result.state, { x: 3, y: 3 }).homeCityId).toBe(home.id);
    expect(assignedUnitCountV7(result.state, home.id)).toBe(capacity + 1);

    const orphan = arena(
      ["UNDEAD", "ORIGINAL"],
      [
        { seat: 0, role: "GUARD", at: { x: 2, y: 3 }, homeless: true },
        { seat: 1, role: "FIGHTER", at: { x: 3, y: 3 }, hp: 1 },
      ],
    );
    const orphaned = attack(orphan, { x: 2, y: 3 }, { x: 3, y: 3 });
    expect(unitAt(orphaned.state, { x: 3, y: 3 }).homeCityId).toBeNull();
    expect(orphaned.events).toContainEqual(
      expect.objectContaining({ kind: "UNIT_INFECTED", homeCityId: null }),
    );
  });

  it("places the rising regardless of Mountain entry and never destroys Field Defense", () => {
    // The Undead owner lacks Engineering, yet the rising appears on a Mountain.
    const mountain = withTile(
      withoutTechs(
        arena(
          ["UNDEAD", "ORIGINAL"],
          [
            { seat: 0, role: "GUARD", at: { x: 2, y: 3 } },
            { seat: 1, role: "FIGHTER", at: { x: 3, y: 3 }, hp: 1 },
          ],
        ),
        0,
        ["ENGINEERING", "METALLURGY"],
      ),
      { x: 3, y: 3 },
      { terrain: "MOUNTAIN" },
    );
    const onMountain = attack(mountain, { x: 2, y: 3 }, { x: 3, y: 3 });
    expect(unitAt(onMountain.state, { x: 3, y: 3 })).toMatchObject({
      role: "GUARD",
      ownerId: mountain.humanPlayerId,
    });

    // A retaliation rising on the attacker's Field Defense leaves it intact.
    const fortified = withTile(
      arena(
        ["ORIGINAL", "UNDEAD"],
        [
          { seat: 0, role: "FIGHTER", at: { x: 7, y: 7 }, hp: 1 },
          { seat: 1, role: "GUARD", at: { x: 6, y: 6 } },
        ],
      ),
      { x: 7, y: 7 },
      { fieldDefense: true },
    );
    const risen = attack(fortified, { x: 7, y: 7 }, { x: 6, y: 6 });
    expect(risen.events.map((event) => event.kind)).not.toContain(
      "FIELD_DEFENSE_DESTROYED",
    );
    expect(unitAt(risen.state, { x: 7, y: 7 }).role).toBe("GUARD");
    expect(tileOf(risen.state, { x: 7, y: 7 }).fieldDefense).toBe(true);
  });

  it("orders events per section 6.8 and reveals the rising's sight for its owner", () => {
    // A Frenzied Zombie destroys the victim's Field Defense (INSPIRED), then
    // the victim dies and rises; the rising reveals tiles the Zombie lacked.
    const hiddenFromUndead = [
      { x: 8, y: 6 },
      { x: 8, y: 7 },
      { x: 8, y: 8 },
    ];
    const base = arena(
      ["ORIGINAL", "UNDEAD"],
      [
        { seat: 0, role: "FIGHTER", at: { x: 7, y: 7 }, hp: 1 },
        { seat: 1, role: "GUARD", at: { x: 6, y: 6 } },
      ],
      { activeSeat: 1, explored: { 1: allExceptTiles(hiddenFromUndead) } },
    );
    const zombie = unitAt(base, { x: 6, y: 6 });
    const state = withUnit(
      withTile(base, { x: 7, y: 7 }, { fieldDefense: true }),
      zombie.id,
      { activation: { ...READY, inspired: true } },
    );
    const victim = unitAt(state, { x: 7, y: 7 });
    const risingId = unitId(state.nextEntityId);
    const result = attack(state, { x: 6, y: 6 }, { x: 7, y: 7 });
    expect(result.events.slice(0, 5)).toEqual([
      expect.objectContaining({ kind: "COMBAT_RESOLVED" }),
      {
        kind: "FIELD_DEFENSE_DESTROYED",
        at: { x: 7, y: 7 },
        reason: "INSPIRED",
      },
      { kind: "UNIT_DIED", unitId: victim.id, cause: "ATTACK" },
      expect.objectContaining({ kind: "UNIT_INFECTED", unitId: risingId }),
      {
        kind: "TILES_REVEALED",
        playerId: zombie.ownerId,
        tiles: hiddenFromUndead,
      },
    ]);
    const owner = required(
      result.state.players.find((player) => player.id === zombie.ownerId),
    );
    for (const at of hiddenFromUndead)
      expect(owner.explored).toContainEqual(at);
  });

  it("keeps kill credit and promotion unchanged", () => {
    const state = arena(
      ["UNDEAD", "ORIGINAL"],
      [
        { seat: 0, role: "GUARD", at: { x: 2, y: 3 } },
        { seat: 1, role: "FIGHTER", at: { x: 3, y: 3 }, hp: 1 },
      ],
    );
    const zombie = unitAt(state, { x: 2, y: 3 });
    const veteranReady = withUnit(state, zombie.id, { kills: 2 });
    const result = attack(veteranReady, { x: 2, y: 3 }, { x: 3, y: 3 });
    expect(unitById(result.state, zombie.id).kills).toBe(3);
    const promoted = apply(result.state, zombie.ownerId, {
      kind: "PROMOTE",
      unitId: zombie.id,
    });
    expect(promoted.events).toContainEqual({
      kind: "UNIT_PROMOTED",
      unitId: zombie.id,
      maxHp: 25,
    });
  });

  it("does not infect for a Human Guard in a mixed match", () => {
    const state = arena(
      ["UNDEAD", "ORIGINAL"],
      [
        { seat: 0, role: "FIGHTER", at: { x: 2, y: 3 }, hp: 1 },
        { seat: 1, role: "GUARD", at: { x: 3, y: 3 } },
      ],
    );
    const skeleton = unitAt(state, { x: 2, y: 3 });
    const result = attack(state, { x: 2, y: 3 }, { x: 3, y: 3 });
    expect(combatPreview(result.events)).toMatchObject({
      attackerDies: true,
      ...NEUTRAL_UNDEAD_FIELDS,
    });
    expect(withoutTail(result.events).slice(1)).toEqual([
      { kind: "UNIT_DIED", unitId: skeleton.id, cause: "RETALIATION" },
      { kind: "GRAVE_CREATED", at: { x: 2, y: 3 } },
    ]);
  });
});

describe("ruleset-7 revision-13 Lifesteal", () => {
  it("heals an attacking Vampire by the damage it dealt after retaliation", () => {
    const state = arena(
      ["UNDEAD", "ORIGINAL"],
      [
        { seat: 0, role: "KNIGHT", at: { x: 2, y: 3 }, hp: 6 },
        { seat: 1, role: "FIGHTER", at: { x: 3, y: 3 } },
      ],
    );
    const vampire = unitAt(state, { x: 2, y: 3 });
    const target = unitAt(state, { x: 3, y: 3 });
    const result = attack(state, { x: 2, y: 3 }, { x: 3, y: 3 });
    const preview = combatPreview(result.events);
    // 6 HP: deals 6, takes 5 in retaliation, then heals the full 6.
    expect(preview).toMatchObject({
      retaliation: true,
      damageToDefender: 6,
      damageToAttacker: 5,
      attackerDies: false,
      attackerHeal: 6,
      defenderHeal: 0,
    });
    expect(unitById(result.state, vampire.id).hp).toBe(7);
    expect(unitById(result.state, target.id).hp).toBe(4);
    // There is no separate heal event.
    expect(withoutTail(result.events).map((event) => event.kind)).toEqual([
      "COMBAT_RESOLVED",
    ]);
    expectPublicPreviewMatches(state, vampire.id, target.id, preview);
  });

  it("heals a retaliating Vampire by the retaliation damage", () => {
    const state = arena(
      ["ORIGINAL", "UNDEAD"],
      [
        { seat: 0, role: "FIGHTER", at: { x: 2, y: 3 }, hp: 5 },
        { seat: 1, role: "KNIGHT", at: { x: 3, y: 3 }, hp: 7 },
      ],
    );
    const fighter = unitAt(state, { x: 2, y: 3 });
    const vampire = unitAt(state, { x: 3, y: 3 });
    const result = attack(state, { x: 2, y: 3 }, { x: 3, y: 3 });
    const preview = combatPreview(result.events);
    // 7 HP: takes 5, retaliates for 2, then heals 2.
    expect(preview).toMatchObject({
      damageToDefender: 5,
      damageToAttacker: 2,
      defenderDies: false,
      attackerHeal: 0,
      defenderHeal: 2,
    });
    expect(unitById(result.state, vampire.id).hp).toBe(4);
    expect(unitById(result.state, fighter.id).hp).toBe(3);
    expectPublicPreviewMatches(state, fighter.id, vampire.id, preview);
  });

  it("caps the heal at maximum HP, including a promoted maximum", () => {
    const state = arena(
      ["UNDEAD", "ORIGINAL"],
      [
        { seat: 0, role: "KNIGHT", at: { x: 2, y: 3 }, hp: 9 },
        { seat: 1, role: "FIGHTER", at: { x: 3, y: 3 }, hp: 4 },
      ],
    );
    const vampire = unitAt(state, { x: 2, y: 3 });
    const target = unitAt(state, { x: 3, y: 3 });
    const result = attack(state, { x: 2, y: 3 }, { x: 3, y: 3 });
    const preview = combatPreview(result.events);
    expect(preview).toMatchObject({
      defenderDies: true,
      damageToDefender: 4,
      attackerHeal: 1,
    });
    expect(unitById(result.state, vampire.id)).toMatchObject({
      hp: 10,
      kills: 1,
    });
    expectPublicPreviewMatches(state, vampire.id, target.id, preview);

    // Promotion (+5 maximum HP) raises the cap as usual.
    const veteran = withUnit(state, vampire.id, {
      kills: 3,
      veteran: true,
      maxHp: 15,
      hp: 9,
    });
    const promoted = attack(veteran, { x: 2, y: 3 }, { x: 3, y: 3 });
    expect(combatPreview(promoted.events)).toMatchObject({
      damageToDefender: 4,
      attackerHeal: 4,
    });
    expect(unitById(promoted.state, vampire.id)).toMatchObject({
      hp: 13,
      maxHp: 15,
      kills: 4,
    });
  });

  it("never heals a Vampire that dies in the exchange", () => {
    const state = arena(
      ["UNDEAD", "ORIGINAL"],
      [
        { seat: 0, role: "KNIGHT", at: { x: 2, y: 3 }, hp: 1 },
        { seat: 1, role: "GUARD", at: { x: 3, y: 3 } },
      ],
    );
    const vampire = unitAt(state, { x: 2, y: 3 });
    const result = attack(state, { x: 2, y: 3 }, { x: 3, y: 3 });
    const preview = combatPreview(result.events);
    expect(preview.damageToDefender).toBeGreaterThan(0);
    expect(preview).toMatchObject({ attackerDies: true, attackerHeal: 0 });
    expect(result.events).toContainEqual({
      kind: "UNIT_DIED",
      unitId: vampire.id,
      cause: "RETALIATION",
    });
    expect(result.state.units.some((unit) => unit.id === vampire.id)).toBe(
      false,
    );
  });

  it("adds the Frenzied bonus to the damage dealt and therefore the heal", () => {
    const pieces: readonly Piece[] = [
      { seat: 0, role: "KNIGHT", at: { x: 2, y: 3 }, hp: 6 },
      { seat: 1, role: "GUARD", at: { x: 3, y: 3 } },
    ];
    const plain = arena(["UNDEAD", "UNDEAD"], pieces);
    const vampire = unitAt(plain, { x: 2, y: 3 });
    const zombie = unitAt(plain, { x: 3, y: 3 });
    const frenzied = withUnit(plain, vampire.id, {
      activation: { ...READY, inspired: true },
    });
    const plainResult = attack(plain, { x: 2, y: 3 }, { x: 3, y: 3 });
    const frenziedResult = attack(frenzied, { x: 2, y: 3 }, { x: 3, y: 3 });
    // Plain: deals 6, takes 5, heals 6. Frenzied: deals 10, takes 4, heals 8
    // (capped at the maximum from 2 HP).
    expect(combatPreview(plainResult.events)).toMatchObject({
      inspiredApplied: false,
      damageToDefender: 6,
      damageToAttacker: 5,
      attackerHeal: 6,
    });
    const frenziedPreview = combatPreview(frenziedResult.events);
    expect(frenziedPreview).toMatchObject({
      inspiredApplied: true,
      damageToDefender: 10,
      damageToAttacker: 4,
      attackerHeal: 8,
    });
    expect(unitById(plainResult.state, vampire.id).hp).toBe(7);
    expect(unitById(frenziedResult.state, vampire.id).hp).toBe(10);
    expectPublicPreviewMatches(
      frenzied,
      vampire.id,
      zombie.id,
      frenziedPreview,
    );
  });

  it("gives a Human Knight no Lifesteal", () => {
    const state = arena(
      ["ORIGINAL", "UNDEAD"],
      [
        { seat: 0, role: "KNIGHT", at: { x: 2, y: 3 } },
        { seat: 1, role: "FIGHTER", at: { x: 3, y: 3 } },
      ],
    );
    const knight = unitAt(state, { x: 2, y: 3 });
    const result = attack(state, { x: 2, y: 3 }, { x: 3, y: 3 });
    const preview = combatPreview(result.events);
    expect(preview.damageToDefender).toBeGreaterThan(0);
    expect(preview.attackerDies).toBe(false);
    expect(preview).toMatchObject(NEUTRAL_UNDEAD_FIELDS);
    expect(unitById(result.state, knight.id).hp).toBe(
      knight.hp - preview.damageToAttacker,
    );
  });
});

describe("ruleset-7 revision-13 Infect and Lifesteal: events, fog, and persistence", () => {
  it("orders UNIT_INFECTED right after UNIT_DIED and parses both strictly", () => {
    expect(DOMAIN_EVENT_KIND_ORDER_V7.indexOf("UNIT_INFECTED")).toBe(
      DOMAIN_EVENT_KIND_ORDER_V7.indexOf("UNIT_DIED") + 1,
    );
    expect(DOMAIN_EVENT_KIND_ORDER_V7.indexOf("GRAVE_CREATED")).toBe(
      DOMAIN_EVENT_KIND_ORDER_V7.indexOf("UNIT_INFECTED") + 1,
    );
    const valid = {
      kind: "UNIT_INFECTED",
      playerId: 2,
      sourceUnitId: 7,
      victimUnitId: 8,
      unitId: 9,
      at: { x: 1, y: 2 },
      homeCityId: 3,
    };
    expect(parseEventV7(valid)).toEqual({ ok: true, value: valid });
    expect(parseEventV7({ ...valid, homeCityId: null }).ok).toBe(true);
    for (const invalid of [
      { ...valid, unitId: 8 },
      { ...valid, sourceUnitId: 9 },
      { ...valid, homeCityId: 0 },
      { ...valid, at: { x: 1 } },
      { ...valid, extra: true },
      omitKey(valid, "homeCityId"),
    ])
      expect(parseEventV7(invalid).ok).toBe(false);

    const state = arena(
      ["UNDEAD", "ORIGINAL"],
      [
        { seat: 0, role: "GUARD", at: { x: 2, y: 3 } },
        { seat: 1, role: "FIGHTER", at: { x: 3, y: 3 }, hp: 1 },
      ],
    );
    const result = attack(state, { x: 2, y: 3 }, { x: 3, y: 3 });
    const event = result.events[0] as Extract<
      DomainEventV7,
      { kind: "COMBAT_RESOLVED" }
    >;
    expect(parseEventV7(event)).toEqual({ ok: true, value: event });
    for (const preview of [
      { ...event.preview, defenderInfected: false, defenderHeal: 1 },
      { ...event.preview, attackerInfected: true },
      { ...event.preview, advances: true },
      { ...event.preview, attackerHeal: -1 },
      { ...event.preview, defenderInfected: "yes" },
      omitKey(event.preview, "attackerHeal"),
    ])
      expect(parseEventV7({ ...event, preview }).ok).toBe(false);
  });

  it("projects UNIT_INFECTED by unit visibility and masks the home city", () => {
    const factions = ["ORIGINAL", "UNDEAD", "ORIGINAL"] as const;
    const zombieAt = { x: 6, y: 6 };
    const victimAt = { x: 7, y: 6 };
    function infection(thirdExplored: readonly CoordV7[]) {
      const state = arena(
        factions,
        [
          { seat: 1, role: "GUARD", at: zombieAt },
          { seat: 0, role: "FIGHTER", at: victimAt, hp: 1 },
        ],
        { activeSeat: 1, explored: { 2: thirdExplored } },
      );
      const zombie = unitAt(state, zombieAt);
      const victim = unitAt(state, victimAt);
      const result = attack(state, zombieAt, victimAt);
      const risen = unitAt(result.state, victimAt);
      const project = (viewer: PlayerId) => {
        const envelope = projectEventsV7(
          state,
          result.state,
          viewer,
          result.events,
        );
        expect(parsePlayerEventEnvelopeV7(envelope)).toEqual({
          ok: true,
          value: envelope,
        });
        return envelope.events;
      };
      return { state, result, zombie, victim, risen, project };
    }

    const { state, zombie, victim, risen, project } = infection(
      allExceptTiles([zombieAt], 14),
    );
    expect(risen.homeCityId).not.toBeNull();
    const infected = {
      kind: "UNIT_INFECTED",
      playerId: zombie.ownerId,
      sourceUnitId: zombie.id,
      victimUnitId: victim.id,
      unitId: risen.id,
      at: victimAt,
      homeCityId: risen.homeCityId,
    };
    // The Zombie's owner sees the full event and no duplicate reveal.
    const own = project(zombie.ownerId);
    expect(own).toContainEqual(infected);
    expect(own).not.toContainEqual(
      expect.objectContaining({ kind: "UNIT_REVEALED" }),
    );
    // The victim's owner sees the Zombie: the rising is visibly created, but
    // the owner-private home city is masked.
    const victimOwner = project(state.humanPlayerId);
    expect(victimOwner.map((event) => event.kind)).toEqual([
      "COMBAT_RESOLVED",
      "UNIT_DIED",
      "UNIT_INFECTED",
    ]);
    expect(victimOwner[2]).toEqual({ ...infected, homeCityId: null });
    // A third party that cannot see the Zombie learns only the death of the
    // visible victim and the ordinary reveal of the risen Zombie.
    expect(project(seatPlayer(state, 2))).toEqual([
      { kind: "UNIT_DIED", unitId: victim.id, cause: "ATTACK" },
      {
        kind: "UNIT_REVEALED",
        unitId: risen.id,
        at: victimAt,
        reason: "DETECTED",
      },
    ]);

    // A third party that explored neither tile learns nothing.
    const hidden = infection(allExceptTiles([zombieAt, victimAt], 14));
    expect(hidden.project(seatPlayer(hidden.state, 2))).toEqual([]);
  });

  it("round-trips Infect and Lifesteal through replay, checkpoints, and save", () => {
    const setup = setupWith(["UNDEAD", "UNDEAD"], 2);
    const match = runAiMatchV7(setup, { maxRounds: 20 });
    expect(match.errors).toEqual([]);
    expect(match.metrics.eventsByKind.UNIT_INFECTED).toBeGreaterThan(0);
    const previews = match.events.flatMap((event) =>
      event.kind === "COMBAT_RESOLVED" ? [event.preview] : [],
    );
    expect(
      previews.some(
        (preview) => preview.attackerHeal > 0 || preview.defenderHeal > 0,
      ),
    ).toBe(true);
    for (const event of match.events)
      if (event.kind === "COMBAT_RESOLVED" || event.kind === "UNIT_INFECTED")
        expect(parseEventV7(event).ok).toBe(true);

    const created = createPlayableGameV7(setup);
    if (!created.ok) throw new Error(created.error.code);
    let state = created.state;
    let replay = createReplayV7(setup);
    for (const record of match.commandLog) {
      const result = applyCommandV7(state, record.playerId, record.command);
      if (!result.accepted) throw new Error(result.error.code);
      state = result.state;
      replay = appendReplayCommandV7(replay, record.command, state);
    }
    expect(canonicalHash(state)).toBe(match.stateHash);
    const parsedReplay = parseReplayJsonV7(JSON.stringify(replay));
    if (parsedReplay.kind !== "VALID") throw new Error(parsedReplay.kind);
    expect(runReplayV7(parsedReplay.replay).stateHash).toBe(match.stateHash);
    const save = createSaveEnvelopeV7(
      { state, replay },
      "2026-09-29T12:00:00.000Z",
    );
    expect(parseSaveV7(JSON.stringify(save))).toEqual({ kind: "VALID", save });
  });

  it("keeps an all-Human exchange neutral", () => {
    const state = arena(
      ["ORIGINAL", "ORIGINAL"],
      [
        { seat: 0, role: "KNIGHT", at: { x: 2, y: 3 }, hp: 1 },
        { seat: 1, role: "GUARD", at: { x: 3, y: 3 } },
        { seat: 0, role: "FIGHTER", at: { x: 2, y: 1 } },
        { seat: 1, role: "KNIGHT", at: { x: 3, y: 1 }, hp: 5 },
      ],
    );
    for (const [from, to] of [
      [
        { x: 2, y: 3 },
        { x: 3, y: 3 },
      ],
      [
        { x: 2, y: 1 },
        { x: 3, y: 1 },
      ],
    ] as const) {
      const result = attack(state, from, to);
      expect(combatPreview(result.events)).toMatchObject(NEUTRAL_UNDEAD_FIELDS);
      expect(result.events.map((event) => event.kind)).not.toContain(
        "UNIT_INFECTED",
      );
      expect(
        queryCombatPreviewV7(
          state,
          state.humanPlayerId,
          unitAt(state, from).id,
          unitAt(state, to).id,
        ),
      ).toMatchObject(NEUTRAL_UNDEAD_FIELDS);
    }
  });
});

interface Piece {
  readonly seat: number;
  readonly role: UnitRoleIdV7;
  readonly at: CoordV7;
  readonly hp?: number;
  readonly form?: UnitStateV7["form"];
  readonly homeless?: boolean;
}

interface ArenaOptions {
  readonly water?: readonly CoordV7[];
  /** Explored tiles per seat; every tile when omitted. */
  readonly explored?: Readonly<Record<number, readonly CoordV7[]>>;
  readonly activeSeat?: number;
}

function setupWith(factions: readonly FactionIdV7[], seed = 2): MatchSetupV7 {
  const aiCount = (factions.length - 1) as 1 | 2 | 3;
  const size = aiCount === 1 ? 11 : aiCount === 2 ? 14 : 16;
  return {
    rulesetId: RULESET_7_ID,
    seed,
    width: size,
    height: size,
    aiCount,
    aiDifficulty: "NORMAL",
    aiMode: "RIVAL",
    humanColor: "CORAL",
    factions: [...factions],
    mapType: "DRY_LAND",
    mapGenerationRevision: "REGIONAL_BIOMES_NAVAL_V2",
  };
}

/**
 * A seed-2 board with every technology, the given pieces as the only units,
 * and every non-settlement piece tile cleared to Grass (or Shallow Water).
 */
function arena(
  factions: readonly FactionIdV7[],
  pieces: readonly Piece[],
  options: ArenaOptions = {},
): GameStateV7 {
  const created = createInitialMapStateV7(setupWith(factions));
  if (!created.ok) throw new Error(created.error.code);
  const base = created.state;
  const size = base.board.width;
  const water = options.water ?? [];
  const player = (seat: number) =>
    required(base.players.find((candidate) => candidate.seat === seat));
  const units = pieces.map((piece, index): UnitStateV7 => {
    const owner = player(piece.seat);
    const rule = effectiveRoleRuleV7(piece.role, owner.faction);
    return {
      id: unitId(base.nextEntityId + index),
      ownerId: owner.id,
      homeCityId: piece.homeless
        ? null
        : (base.cities.find((city) => city.ownerId === owner.id)?.id ?? null),
      role: piece.role,
      form: piece.form ?? "LAND",
      at: piece.at,
      hp: piece.hp ?? rule.maxHp,
      maxHp: rule.maxHp,
      kills: 0,
      veteran: false,
      captureEligible: false,
      activation: READY,
    };
  });
  const cleared = [...pieces.map((piece) => piece.at), ...water];
  const activeId = player(options.activeSeat ?? 0).id;
  return checkedV7({
    ...base,
    nextEntityId: base.nextEntityId + pieces.length,
    activeSeatIndex: base.turnOrder.indexOf(activeId),
    players: base.players.map((candidate) => ({
      ...candidate,
      researchedTechs: TECHNOLOGY_IDS_V7,
      coins: 10_000,
      explored: sortedCoords(
        options.explored?.[candidate.seat] ?? allExceptTiles([], size),
      ),
    })),
    cities: base.cities.map((city) => ({ ...city, cityActionAvailable: true })),
    units,
    treasureChests: base.treasureChests.filter(
      (chest) => !cleared.some((at) => same(at, chest)),
    ),
    graves: [],
    board: {
      ...base.board,
      tiles: base.board.tiles.map((tile) =>
        water.some((at) => same(at, tile.at))
          ? {
              ...tile,
              biome: null,
              terrain: "SHALLOW_WATER" as const,
              resource: null,
              improvement: null,
              road: false,
              fieldDefense: false,
              site: null,
            }
          : cleared.some((at) => same(at, tile.at)) && tile.site === null
            ? {
                ...tile,
                biome: tile.biome ?? "PLAINS",
                terrain: "GRASS" as const,
                resource: null,
                improvement: null,
                road: false,
                fieldDefense: false,
              }
            : tile,
      ),
    },
  });
}

function withTile(
  state: GameStateV7,
  at: CoordV7,
  patch: Partial<TileStateV7>,
): GameStateV7 {
  return checkedV7({
    ...state,
    board: {
      ...state.board,
      tiles: state.board.tiles.map((tile) =>
        same(tile.at, at) ? { ...tile, ...patch } : tile,
      ),
    },
  });
}

function withoutTechs(
  state: GameStateV7,
  seat: number,
  techs: readonly string[],
): GameStateV7 {
  return checkedV7({
    ...state,
    players: state.players.map((player) =>
      player.seat === seat
        ? {
            ...player,
            researchedTechs: player.researchedTechs.filter(
              (tech) => !techs.includes(tech),
            ),
          }
        : player,
    ),
  });
}

function withUnit(
  state: GameStateV7,
  id: UnitStateV7["id"],
  patch: Partial<UnitStateV7>,
): GameStateV7 {
  return checkedV7({
    ...state,
    units: state.units.map((unit) =>
      unit.id === id ? { ...unit, ...patch } : unit,
    ),
  });
}

function apply(
  state: GameStateV7,
  actor: PlayerId,
  command: CommandV7,
): { readonly state: GameStateV7; readonly events: readonly DomainEventV7[] } {
  const result = applyCommandV7(state, actor, command);
  if (!result.accepted)
    throw new Error(`${command.kind} rejected: ${result.error.code}`);
  return result;
}

function attack(
  state: GameStateV7,
  from: CoordV7,
  to: CoordV7,
): { readonly state: GameStateV7; readonly events: readonly DomainEventV7[] } {
  const attacker = unitAt(state, from);
  return apply(state, attacker.ownerId, {
    kind: "ATTACK",
    unitId: attacker.id,
    targetUnitId: unitAt(state, to).id,
  });
}

/** The combat events without the ordinary achievement tail. */
function withoutTail(
  events: readonly DomainEventV7[],
): readonly DomainEventV7[] {
  return events.filter((event) => event.kind !== "ACHIEVEMENT_UNLOCKED");
}

function combatPreview(events: readonly DomainEventV7[]): CombatPreviewV7 {
  const event = events[0];
  if (event?.kind !== "COMBAT_RESOLVED") throw new Error("no combat");
  return event.preview;
}

/** Public and canonical previews equal the resolved preview exactly. */
function expectPublicPreviewMatches(
  state: GameStateV7,
  attackerId: UnitStateV7["id"],
  targetId: UnitStateV7["id"],
  resolved: CombatPreviewV7,
): void {
  const owner = unitById(state, attackerId).ownerId;
  expect(calculateCombatPreviewV7(state, attackerId, targetId)).toEqual(
    resolved,
  );
  expect(estimateCombatV7(state, attackerId, targetId)).toEqual(resolved);
  expect(queryCombatPreviewV7(state, owner, attackerId, targetId)).toEqual(
    resolved,
  );
  expect(
    queryPlayerCommandsV7(state, owner).some(
      (command) =>
        command.kind === "ATTACK" &&
        command.unitId === attackerId &&
        command.targetUnitId === targetId,
    ),
  ).toBe(true);
}

function unitAt(state: GameStateV7, at: CoordV7): UnitStateV7 {
  return required(state.units.find((unit) => same(unit.at, at)));
}

function unitById(state: GameStateV7, id: UnitStateV7["id"]): UnitStateV7 {
  return required(state.units.find((unit) => unit.id === id));
}

function cityAt(
  state: GameStateV7,
  at: CoordV7,
): GameStateV7["cities"][number] {
  return required(state.cities.find((city) => same(city.at, at)));
}

function tileOf(state: GameStateV7, at: CoordV7) {
  return required(state.board.tiles.find((tile) => same(tile.at, at)));
}

function seatPlayer(state: GameStateV7, seat: number): PlayerId {
  return required(state.players.find((player) => player.seat === seat)).id;
}

function allExceptTiles(excluded: readonly CoordV7[], size = 11): CoordV7[] {
  const result: CoordV7[] = [];
  for (let y = 0; y < size; y += 1)
    for (let x = 0; x < size; x += 1)
      if (!excluded.some((at) => at.x === x && at.y === y))
        result.push({ x, y });
  return result;
}

function sortedCoords(coords: readonly CoordV7[]): CoordV7[] {
  const unique = new Map(coords.map((at) => [`${at.x},${at.y}`, at]));
  return [...unique.values()].sort(
    (left, right) => left.y - right.y || left.x - right.x,
  );
}

function omitKey<T extends object>(value: T, key: keyof T): Partial<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([name]) => name !== key),
  ) as Partial<T>;
}

function required<T>(value: T | undefined): T {
  if (value === undefined) throw new Error("fixture value missing");
  return value;
}

const same = (left: CoordV7, right: CoordV7): boolean =>
  left.x === right.x && left.y === right.y;
