import { describe, expect, it } from "vitest";
import {
  TECHNOLOGY_IDS_V7,
  applyCommandV7,
  armouredDamageV7,
  assignedUnitCountV7,
  cityUnitCapacityV7,
  estimateCombatV7,
  fortificationLevelForUnitV7,
  growthStageForKillsV7,
  grownHpV7,
  grownUnitV7,
  parseEventV7,
  parseGameStateV7,
  previewCityCapacityV7,
  previewKaboomV7,
  previewWailV7,
  projectEventsV7,
  publicUnitStatsV7,
  queryCombatPreviewV7,
  queryPlayerCommandsV7,
  unitAlphaAttack2V7,
  unitCapacitySlotsV7,
  unitGrowsV7,
  unitGrowthStageV7,
  viewForV7,
  type CombatPreviewV7,
  type CommandV7,
  type CoordV7,
  type DomainEventV7,
  type GameStateV7,
  type TechnologyIdV7,
} from "../../src/engine/index";
import { checkedV7 } from "../fixtures/v7-builders";
import { patchTileV7 } from "../fixtures/v7-revision20";
import {
  cityOfV7,
  newUnitsV7,
  rewardStateV7,
  withKillsV7,
  withTileV7,
} from "../fixtures/v7-dinosaur-arena";
import {
  applyOkV7,
  endTurnUntilV7,
  goblinArenaV7,
  sameV7,
  seatIdV7,
  unitAtV7,
  type GoblinPieceV7,
} from "../fixtures/v7-goblin-arena";

// Revision 19 (`pulp_wars-c87.2`) Dinosaur rules: capacity slots, Grow, Wild,
// Acid, Armoured, and the ability parities
// (docs/product/RULESET_7_REVISION_19_DINOSAURS.md sections 3, 5, and 8).
//
// Two-seat arena: seat 0 capital (8, 8), seat 1 capital (2, 8), villages
// (5, 5), (8, 5), (5, 8); the row y = 3 is open neutral ground.

const kinds = (events: readonly DomainEventV7[]): readonly string[] =>
  events.map((event) => event.kind);

function combat(events: readonly DomainEventV7[]): CombatPreviewV7 {
  const event = events.find((item) => item.kind === "COMBAT_RESOLVED");
  if (event?.kind !== "COMBAT_RESOLVED") throw new Error("no combat");
  return event.preview;
}

function attack(
  state: GameStateV7,
  from: CoordV7,
  to: CoordV7,
): { readonly state: GameStateV7; readonly events: readonly DomainEventV7[] } {
  const attacker = unitAtV7(state, from);
  const target = unitAtV7(state, to);
  // The public preview of an offered attack equals its resolution.
  const preview = queryCombatPreviewV7(
    state,
    attacker.ownerId,
    attacker.id,
    target.id,
  );
  const result = applyOkV7(state, attacker.ownerId, {
    kind: "ATTACK",
    unitId: attacker.id,
    targetUnitId: target.id,
  });
  expect(preview).toEqual(combat(result.events));
  for (const event of result.events) expect(parseEventV7(event).ok).toBe(true);
  return result;
}

/** Every technology except Nesting (Fortification) and what needs it. */
const WITHOUT_NESTING: readonly TechnologyIdV7[] = TECHNOLOGY_IDS_V7.filter(
  (tech) => tech !== "FORTIFICATION" && tech !== "EXPLOSIVES",
);

/** Technologies in registry order, for a seat that should lack the rest. */
const techs = (...ids: readonly TechnologyIdV7[]): readonly TechnologyIdV7[] =>
  TECHNOLOGY_IDS_V7.filter((id) => ids.includes(id));

describe("ruleset-7 Dinosaur capacity slots", () => {
  it("sums slots through each unit's owner on every capacity surface", () => {
    const state = goblinArenaV7(
      ["DINOSAUR", "ORIGINAL"],
      [
        { seat: 0, role: "FIGHTER", at: { x: 4, y: 3 } },
        { seat: 0, role: "SWORDSMAN", at: { x: 5, y: 3 } },
        { seat: 0, role: "KNIGHT", at: { x: 6, y: 3 } },
        { seat: 0, role: "JUGGERNAUT", at: { x: 7, y: 3 } },
        { seat: 1, role: "FIGHTER", at: { x: 1, y: 1 } },
        { seat: 1, role: "KNIGHT", at: { x: 1, y: 2 } },
        { seat: 1, role: "JUGGERNAUT", at: { x: 1, y: 3 } },
      ],
      { techs: { 0: [], 1: [] } },
    );
    // Revision 20 section 2.1: the Triceratops uses two slots again (the
    // pulp_wars-c87.8 interim baseline had made it one), like the T-Rex and
    // the Brontosaurus.
    expect(state.units.map((unit) => unitCapacitySlotsV7(state, unit))).toEqual(
      [1, 2, 2, 2, 1, 1, 1],
    );
    const dinosaurCity = cityOfV7(state, 0);
    const humanCity = cityOfV7(state, 1);
    expect(assignedUnitCountV7(state, dinosaurCity.id)).toBe(7);
    expect(assignedUnitCountV7(state, humanCity.id)).toBe(3);
    expect(cityUnitCapacityV7(state, dinosaurCity)).toBe(2);
    expect(previewCityCapacityV7(state, dinosaurCity.id)).toEqual({
      cityId: dinosaurCity.id,
      capacity: 2,
      assigned: 7,
      available: 0,
      overCapacity: 5,
      roleSlots: [
        { role: "FIGHTER", slots: 1 },
        { role: "RAIDER", slots: 1 },
        { role: "MARKSMAN", slots: 1 },
        { role: "GUARD", slots: 1 },
        { role: "CAPTAIN", slots: 1 },
        // The ninth unit (7r55): the Stegosaurus, one slot.
        { role: "CATAPULT", slots: 1 },
        { role: "KNIGHT", slots: 2 },
        { role: "PATROL_BOAT", slots: 1 },
        { role: "BATTLESHIP", slots: 1 },
        { role: "SUBMARINE", slots: 1 },
        // The Triceratops, the heavy line role.
        { role: "SWORDSMAN", slots: 2 },
      ],
    });
    const human = previewCityCapacityV7(state, humanCity.id);
    expect(human).toMatchObject({ capacity: 2, assigned: 3, overCapacity: 1 });
    expect(human?.roleSlots.every((entry) => entry.slots === 1)).toBe(true);
    // The public stats carry the slots of a Dinosaur-faction unit.
    expect(
      publicUnitStatsV7(state, unitAtV7(state, { x: 6, y: 3 })).dinosaur
        ?.capacitySlots,
    ).toBe(2);
  });

  it("rejects a 2-slot role with one free slot and accepts it with two (level-1 capital)", () => {
    // The T-Rex is a two-slot egg-laid role (so is the Triceratops again
    // since revision 20).
    const researched = techs("SCOUTING", "RAIDING", "CHIVALRY");
    // A level-1 capital holds two slots; the starting Caveman uses one.
    const one = goblinArenaV7(
      ["DINOSAUR", "ORIGINAL"],
      [
        { seat: 0, role: "FIGHTER", at: { x: 4, y: 3 } },
        { seat: 1, role: "FIGHTER", at: { x: 1, y: 1 } },
      ],
      { techs: { 0: researched } },
    );
    const city = cityOfV7(one, 0);
    expect(city.level).toBe(1);
    expect(cityUnitCapacityV7(one, city)).toBe(2);
    // Egg-laid roles are laid on a nest tile (`pulp_wars-c87.3`).
    const nest = { x: city.at.x - 1, y: city.at.y - 1 };
    const tRex: CommandV7 = {
      kind: "LAY_EGG",
      cityId: city.id,
      role: "KNIGHT",
      at: nest,
    };
    const raptor: CommandV7 = {
      kind: "LAY_EGG",
      cityId: city.id,
      role: "RAIDER",
      at: nest,
    };
    const offered = queryPlayerCommandsV7(one, one.humanPlayerId);
    expect(offered).toContainEqual(raptor);
    expect(
      offered.filter(
        (command) => command.kind === "LAY_EGG" && command.role === "KNIGHT",
      ),
    ).toEqual([]);
    expect(applyCommandV7(one, one.humanPlayerId, tRex)).toMatchObject({
      accepted: false,
      error: { code: "CITY_CAPACITY_FULL", params: { cityId: city.id } },
    });
    expect(applyCommandV7(one, one.humanPlayerId, raptor).accepted).toBe(true);
    // With both slots free the T-Rex is offered and accepted.
    const empty = goblinArenaV7(
      ["DINOSAUR", "ORIGINAL"],
      [{ seat: 1, role: "FIGHTER", at: { x: 1, y: 1 } }],
      { techs: { 0: researched } },
    );
    expect(queryPlayerCommandsV7(empty, empty.humanPlayerId)).toContainEqual(
      tRex,
    );
    const trained = applyOkV7(empty, empty.humanPlayerId, tRex);
    // The Egg uses the slots of the unit inside from the moment it is laid.
    expect(unitAtV7(trained.state, nest).form).toBe("EGG");
    expect(assignedUnitCountV7(trained.state, city.id)).toBe(2);
    expect(previewCityCapacityV7(trained.state, city.id)).toMatchObject({
      assigned: 2,
      available: 0,
      overCapacity: 0,
    });
    // The city is now full for every role, the 1-slot Caveman included.
    const full = checkedV7({
      ...trained.state,
      cities: trained.state.cities.map((candidate) => ({
        ...candidate,
        cityActionAvailable: true,
      })),
    });
    expect(
      queryPlayerCommandsV7(full, full.humanPlayerId).filter(
        (command) => command.kind === "TRAIN" || command.kind === "LAY_EGG",
      ),
    ).toEqual([]);
    expect(
      applyCommandV7(full, full.humanPlayerId, {
        kind: "TRAIN",
        cityId: city.id,
        role: "FIGHTER",
      }),
    ).toMatchObject({
      accepted: false,
      error: { code: "CITY_CAPACITY_FULL" },
    });
    // A death frees its slots at once.
    const freed = checkedV7({
      ...full,
      units: full.units.filter((unit) => unit.role !== "KNIGHT"),
      eggs: [],
    });
    expect(assignedUnitCountV7(freed, city.id)).toBe(0);
    expect(queryPlayerCommandsV7(freed, freed.humanPlayerId)).toContainEqual(
      tRex,
    );
  });

  it("adds one slot with Planning and no Dinosaur faction capacity bonus", () => {
    // Revision 20: Nesting adds a slot of its own
    // (tests/unit/ruleset-v7-revision20-industry.test.ts), so this seat has
    // every technology except Nesting and Wallbreaker.
    const planned = goblinArenaV7(
      ["DINOSAUR", "ORIGINAL"],
      [
        { seat: 0, role: "FIGHTER", at: { x: 4, y: 3 } },
        { seat: 1, role: "FIGHTER", at: { x: 1, y: 1 } },
      ],
      { techs: { 0: WITHOUT_NESTING } },
    );
    const city = cityOfV7(planned, 0);
    // Level + 1, +1 Planning: the Caveman (1) and a T-Rex (2) fit.
    expect(cityUnitCapacityV7(planned, city)).toBe(3);
    expect(cityUnitCapacityV7(planned, cityOfV7(planned, 1))).toBe(3);
    const train: CommandV7 = {
      kind: "LAY_EGG",
      cityId: city.id,
      role: "KNIGHT",
      at: { x: city.at.x - 1, y: city.at.y - 1 },
    };
    expect(
      queryPlayerCommandsV7(planned, planned.humanPlayerId),
    ).toContainEqual(train);
    const result = applyOkV7(planned, planned.humanPlayerId, train);
    expect(previewCityCapacityV7(result.state, city.id)).toMatchObject({
      capacity: 3,
      assigned: 3,
      available: 0,
    });
  });

  it("gives a captured city the ordinary capacity of its new owner (Warrens follow the owner)", () => {
    for (const [factions, delta] of [
      [["GOBLIN", "DINOSAUR"], 1],
      [["DINOSAUR", "GOBLIN"], -1],
    ] as const) {
      const target = cityOfV7(
        goblinArenaV7(factions, [
          { seat: 0, role: "FIGHTER", at: { x: 4, y: 3 } },
        ]),
        1,
      );
      // Without Nesting (revision 20 gives it a slot of its own, which also
      // follows the owner: ruleset-v7-revision20-industry.test.ts).
      const state = goblinArenaV7(
        factions,
        [
          { seat: 0, role: "FIGHTER", at: target.at, captureEligible: true },
          { seat: 0, role: "FIGHTER", at: { x: 4, y: 3 } },
          { seat: 1, role: "KNIGHT", at: { x: 1, y: 1 } },
        ],
        { techs: { 0: WITHOUT_NESTING, 1: WITHOUT_NESTING } },
      );
      const before = cityUnitCapacityV7(state, target);
      const captured = applyOkV7(state, state.humanPlayerId, {
        kind: "CAPTURE",
        unitId: unitAtV7(state, target.at).id,
      });
      const after = captured.state.cities.find((city) => city.id === target.id);
      if (after === undefined) throw new Error("city missing");
      expect(after.ownerId).toBe(state.humanPlayerId);
      expect(cityUnitCapacityV7(captured.state, after) - before).toBe(delta);
      // Only the capturing unit is homed there now, with its own slots.
      expect(assignedUnitCountV7(captured.state, after.id)).toBe(1);
    }
  });

  it("re-homes a capturing Brontosaurus with its two slots", () => {
    const village = { x: 5, y: 5 };
    const state = goblinArenaV7(
      ["DINOSAUR", "ORIGINAL"],
      [
        { seat: 0, role: "JUGGERNAUT", at: village, captureEligible: true },
        { seat: 0, role: "FIGHTER", at: { x: 4, y: 3 } },
        { seat: 1, role: "FIGHTER", at: { x: 1, y: 1 } },
      ],
      { techs: { 0: [] } },
    );
    const capital = cityOfV7(state, 0);
    expect(assignedUnitCountV7(state, capital.id)).toBe(3);
    const result = applyOkV7(state, state.humanPlayerId, {
      kind: "CAPTURE",
      unitId: unitAtV7(state, village).id,
    });
    const city = result.state.cities.find((item) => sameV7(item.at, village));
    if (city === undefined) throw new Error("captured city missing");
    expect(unitAtV7(result.state, village).homeCityId).toBe(city.id);
    // The Brontosaurus fills the level-1 city (2 of 2) and frees the capital.
    expect(previewCityCapacityV7(result.state, city.id)).toMatchObject({
      capacity: 2,
      assigned: 2,
      available: 0,
    });
    expect(assignedUnitCountV7(result.state, capital.id)).toBe(1);
    const next = endTurnUntilV7(result.state, state.humanPlayerId).state;
    expect(
      queryPlayerCommandsV7(next, next.humanPlayerId).filter(
        (command) => command.kind === "TRAIN" && command.cityId === city.id,
      ),
    ).toEqual([]);
  });

  it("uses no slots for a unit orphaned by the capture of its home city", () => {
    const village = { x: 5, y: 5 };
    const start = goblinArenaV7(
      ["ORIGINAL", "DINOSAUR"],
      [
        { seat: 1, role: "FIGHTER", at: village, captureEligible: true },
        { seat: 1, role: "KNIGHT", at: { x: 4, y: 3 } },
        { seat: 0, role: "FIGHTER", at: { x: 6, y: 3 } },
      ],
      { activeSeat: 1 },
    );
    const dinosaur = seatIdV7(start, 1);
    const human = seatIdV7(start, 0);
    const founded = applyOkV7(start, dinosaur, {
      kind: "CAPTURE",
      unitId: unitAtV7(start, village).id,
    }).state;
    const city = founded.cities.find((item) => sameV7(item.at, village));
    if (city === undefined) throw new Error("captured city missing");
    // The T-Rex is homed to the new city; a Human Fighter then stands on its
    // center, ready to capture it.
    const staged = checkedV7({
      ...founded,
      activeSeatIndex: founded.turnOrder.indexOf(human),
      units: founded.units
        .filter((unit) => !sameV7(unit.at, village))
        .map((unit) =>
          unit.role === "KNIGHT"
            ? { ...unit, homeCityId: city.id }
            : unit.ownerId === human
              ? { ...unit, at: village, captureEligible: true }
              : unit,
        ),
    });
    expect(assignedUnitCountV7(staged, city.id)).toBe(2);
    const captured = applyOkV7(staged, human, {
      kind: "CAPTURE",
      unitId: unitAtV7(staged, village).id,
    }).state;
    const trex = unitAtV7(captured, { x: 4, y: 3 });
    expect(trex.homeCityId).toBeNull();
    // The orphan counts nowhere: every city sums only its own homed units.
    expect(
      captured.cities.map((item) => assignedUnitCountV7(captured, item.id)),
    ).toEqual(
      captured.cities.map(
        (item) =>
          captured.units.filter((unit) => unit.homeCityId === item.id).length,
      ),
    );
    expect(assignedUnitCountV7(captured, city.id)).toBe(1);
    expect(parseGameStateV7(captured)).not.toBeNull();
  });
});

describe("ruleset-7 Dinosaur Grow", () => {
  it("derives the stage from kills for growing roles only", () => {
    expect([0, 1, 2, 3, 4, 9].map(growthStageForKillsV7)).toEqual([
      0, 1, 1, 2, 2, 2,
    ]);
    const state = goblinArenaV7(
      ["DINOSAUR", "ORIGINAL"],
      [
        { seat: 0, role: "RAIDER", at: { x: 4, y: 3 } },
        { seat: 0, role: "FIGHTER", at: { x: 5, y: 3 } },
        { seat: 0, role: "CAPTAIN", at: { x: 6, y: 3 } },
        { seat: 1, role: "RAIDER", at: { x: 1, y: 1 } },
      ],
    );
    expect(state.units.map((unit) => unitGrowsV7(state, unit))).toEqual([
      true,
      false,
      false,
      false,
    ]);
    expect(
      state.units.map((unit) =>
        unitGrowthStageV7(state, { ...unit, kills: 3 }),
      ),
    ).toEqual([2, null, null, null]);
    const raptor = unitAtV7(state, { x: 4, y: 3 });
    expect(
      [0, 1, 2, 3].map((kills) =>
        unitAlphaAttack2V7(state, { ...raptor, kills }),
      ),
    ).toEqual([0, 0, 0, 2]);
    // Revision 20 section 5: each stage reached fully heals. The public
    // simulations' helper gives the HP after the growth (the new maximum),
    // or the HP unchanged when no stage is reached.
    expect(grownHpV7(state, raptor, 0, 1, 5)).toBe(16);
    expect(grownHpV7(state, raptor, 0, 3, 5)).toBe(20);
    expect(grownHpV7(state, raptor, 1, 2, 5)).toBe(5);
    expect(grownHpV7(state, unitAtV7(state, { x: 5, y: 3 }), 0, 3, 5)).toBe(5);
    // A unit that crosses both thresholds at once gains both stages in order.
    const events: DomainEventV7[] = [];
    const grown = grownUnitV7(state, 0, { ...raptor, kills: 3, hp: 5 }, events);
    expect([grown.hp, grown.maxHp]).toEqual([20, 20]);
    expect(events).toEqual([
      { kind: "UNIT_GREW", unitId: raptor.id, stage: 1, maxHp: 16, hp: 16 },
      { kind: "UNIT_GREW", unitId: raptor.id, stage: 2, maxHp: 20, hp: 20 },
    ]);
    for (const event of events) expect(parseEventV7(event).ok).toBe(true);
    // A dead unit and a non-growing unit are returned unchanged.
    expect(grownUnitV7(state, 0, { ...raptor, kills: 1, hp: 0 }, [])).toEqual({
      ...raptor,
      kills: 1,
      hp: 0,
    });
  });

  it("makes a Raptor Big on its first attack kill, before it advances", () => {
    const state = goblinArenaV7(
      ["DINOSAUR", "ORIGINAL"],
      [
        { seat: 0, role: "RAIDER", at: { x: 4, y: 3 }, hp: 7 },
        { seat: 1, role: "FIGHTER", at: { x: 5, y: 3 }, hp: 1 },
      ],
    );
    const raptor = unitAtV7(state, { x: 4, y: 3 });
    const result = attack(state, { x: 4, y: 3 }, { x: 5, y: 3 });
    expect(kinds(result.events).slice(0, 4)).toEqual([
      "COMBAT_RESOLVED",
      "UNIT_DIED",
      "UNIT_GREW",
      "UNIT_MOVED",
    ]);
    expect(result.events[2]).toEqual({
      kind: "UNIT_GREW",
      unitId: raptor.id,
      stage: 1,
      maxHp: 16,
      // Revision 20: growing fully heals (was 7 + 4 = 11).
      hp: 16,
    });
    expect(unitAtV7(result.state, { x: 5, y: 3 })).toMatchObject({
      id: raptor.id,
      kills: 1,
      hp: 16,
      maxHp: 16,
      veteran: false,
    });
    const stats = publicUnitStatsV7(
      result.state,
      unitAtV7(result.state, { x: 5, y: 3 }),
    );
    expect(stats.dinosaur).toMatchObject({
      growthStage: 1,
      killsToNextStage: 2,
    });
    const hp = stats.stats.find((stat) => stat.id === "HP");
    expect(
      hp?.modifiers.map((term) => [term.source, term.value.numerator]),
    ).toEqual([["GROWTH", 4]]);
    expect(hp?.total).toEqual({ numerator: 16, denominator: 1 });
    // Big adds no Attack.
    expect(stats.stats.find((stat) => stat.id === "ATTACK")?.modifiers).toEqual(
      [],
    );
  });

  it("makes a unit Alpha at three kills: +4 HP again and +1 Attack on every attack", () => {
    const base = goblinArenaV7(
      ["DINOSAUR", "ORIGINAL"],
      [
        { seat: 0, role: "RAIDER", at: { x: 4, y: 3 } },
        { seat: 1, role: "FIGHTER", at: { x: 5, y: 3 }, hp: 1 },
        { seat: 1, role: "FIGHTER", at: { x: 6, y: 3 } },
      ],
    );
    // Two kills: Big, 16 maximum HP, still Attack 2.5.
    const big = withKillsV7(base, { x: 4, y: 3 }, 2);
    const raptor = unitAtV7(big, { x: 4, y: 3 });
    expect([raptor.hp, raptor.maxHp]).toEqual([16, 16]);
    expect(
      estimateCombatV7(big, raptor.id, unitAtV7(big, { x: 5, y: 3 }).id)
        ?.attack2,
    ).toBe(5);
    const result = attack(big, { x: 4, y: 3 }, { x: 5, y: 3 });
    expect(result.events.filter((event) => event.kind === "UNIT_GREW")).toEqual(
      [{ kind: "UNIT_GREW", unitId: raptor.id, stage: 2, maxHp: 20, hp: 20 }],
    );
    const alpha = unitAtV7(result.state, { x: 5, y: 3 });
    expect(alpha).toMatchObject({ kills: 3, hp: 20, maxHp: 20 });
    // The exchange that caused the growth used Attack 2.5; the next one 3.5.
    expect(combat(result.events).attack2).toBe(5);
    const next = endTurnUntilV7(result.state, big.humanPlayerId).state;
    const target = unitAtV7(next, { x: 6, y: 3 });
    expect(estimateCombatV7(next, alpha.id, target.id)?.attack2).toBe(7);
    expect(
      queryCombatPreviewV7(next, next.humanPlayerId, alpha.id, target.id)
        ?.attack2,
    ).toBe(7);
    const stats = publicUnitStatsV7(next, unitAtV7(next, { x: 5, y: 3 }));
    expect(stats.dinosaur).toMatchObject({
      growthStage: 2,
      killsToNextStage: null,
    });
    const attackStat = stats.stats.find((stat) => stat.id === "ATTACK");
    expect(
      attackStat?.modifiers.map((term) => [term.source, term.value]),
    ).toEqual([["ALPHA", { numerator: 1, denominator: 1 }]]);
    expect(attackStat?.total).toEqual({ numerator: 7, denominator: 2 });
    expect(
      stats.stats
        .find((stat) => stat.id === "HP")
        ?.modifiers.map((term) => [term.source, term.value.numerator]),
    ).toEqual([["GROWTH", 8]]);
    // There is no stage beyond Alpha.
    const fourth = attack(next, { x: 5, y: 3 }, { x: 6, y: 3 });
    expect(combat(fourth.events).attack2).toBe(7);
    expect(fourth.events.some((event) => event.kind === "UNIT_GREW")).toBe(
      false,
    );
  });

  it("grows from a retaliation kill", () => {
    const state = goblinArenaV7(
      ["ORIGINAL", "DINOSAUR"],
      [
        { seat: 0, role: "FIGHTER", at: { x: 4, y: 3 }, hp: 1 },
        { seat: 1, role: "GUARD", at: { x: 5, y: 3 } },
      ],
    );
    const ankylosaurus = unitAtV7(state, { x: 5, y: 3 });
    const result = attack(state, { x: 4, y: 3 }, { x: 5, y: 3 });
    const preview = combat(result.events);
    // A Fighter at 1 of 12 HP (10 before revision 20 section 6.3) no longer
    // scratches the Ankylosaurus.
    expect(preview).toMatchObject({
      damageToDefender: 0,
      attackerDies: true,
      defenderDies: false,
    });
    expect(kinds(result.events).slice(0, 3)).toEqual([
      "COMBAT_RESOLVED",
      "UNIT_DIED",
      "UNIT_GREW",
    ]);
    expect(result.events[2]).toEqual({
      kind: "UNIT_GREW",
      unitId: ankylosaurus.id,
      stage: 1,
      maxHp: 24,
      // Revision 20: growing fully heals (was 19 + 4 = 23).
      hp: 24,
    });
    expect(unitAtV7(result.state, { x: 5, y: 3 })).toMatchObject({
      kills: 1,
      hp: 24,
      maxHp: 24,
    });
  });

  it("grows from each Rampage kill, healing before the continuation", () => {
    const state = goblinArenaV7(
      ["DINOSAUR", "ORIGINAL"],
      [
        { seat: 0, role: "KNIGHT", at: { x: 4, y: 3 }, hp: 20 },
        { seat: 1, role: "FIGHTER", at: { x: 5, y: 3 }, hp: 1 },
        { seat: 1, role: "FIGHTER", at: { x: 6, y: 3 } },
        { seat: 1, role: "FIGHTER", at: { x: 7, y: 3 }, hp: 3 },
        { seat: 1, role: "GUARD", at: { x: 8, y: 3 } },
      ],
    );
    const trex = unitAtV7(state, { x: 4, y: 3 });
    const first = attack(state, { x: 4, y: 3 }, { x: 5, y: 3 });
    expect(combat(first.events)).toMatchObject({
      overrunAdvance: true,
      overrunContinues: true,
      attacksRemaining: 1,
    });
    expect(kinds(first.events).slice(0, 4)).toEqual([
      "COMBAT_RESOLVED",
      "UNIT_DIED",
      "UNIT_GREW",
      "UNIT_MOVED",
    ]);
    // Big: 28 + 4, fully healed (revision 20; was 20 + 4 of 32).
    expect(unitAtV7(first.state, { x: 5, y: 3 })).toMatchObject({
      id: trex.id,
      kills: 1,
      hp: 32,
      maxHp: 32,
    });
    expect(
      publicUnitStatsV7(first.state, unitAtV7(first.state, { x: 5, y: 3 }))
        .statuses,
    ).toEqual(["Rampage: attack again"]);
    // The continuation fights at the grown HP (32 of 32) and kills the
    // full-HP Fighter; a second kill reaches no new stage.
    const second = attack(first.state, { x: 5, y: 3 }, { x: 6, y: 3 });
    expect(combat(second.events)).toMatchObject({
      attack2: 8,
      defenderDies: true,
      overrunContinues: true,
    });
    expect(second.events.some((event) => event.kind === "UNIT_GREW")).toBe(
      false,
    );
    expect(unitAtV7(second.state, { x: 6, y: 3 })).toMatchObject({
      kills: 2,
      hp: 32,
      maxHp: 32,
    });
    // The third kill makes it Alpha; the next Rampage attack has Attack 5.
    const third = attack(second.state, { x: 6, y: 3 }, { x: 7, y: 3 });
    expect(third.events.filter((event) => event.kind === "UNIT_GREW")).toEqual([
      { kind: "UNIT_GREW", unitId: trex.id, stage: 2, maxHp: 36, hp: 36 },
    ]);
    const alpha = unitAtV7(third.state, { x: 7, y: 3 });
    expect(alpha).toMatchObject({ kills: 3, hp: 36, maxHp: 36 });
    expect(alpha.activation.overrunActive).toBe(true);
    const fourth = attack(third.state, { x: 7, y: 3 }, { x: 8, y: 3 });
    expect(combat(fourth.events).attack2).toBe(10);
  });

  it("credits no growth for an explosion kill and grows before the chain", () => {
    const state = goblinArenaV7(
      ["DINOSAUR", "GOBLIN"],
      [
        { seat: 0, role: "RAIDER", at: { x: 4, y: 3 } },
        { seat: 1, role: "MARKSMAN", at: { x: 5, y: 3 }, hp: 1 },
        { seat: 1, role: "FIGHTER", at: { x: 6, y: 3 }, hp: 1 },
      ],
    );
    const raptor = unitAtV7(state, { x: 4, y: 3 });
    const result = applyOkV7(state, state.humanPlayerId, {
      kind: "ATTACK",
      unitId: raptor.id,
      targetUnitId: unitAtV7(state, { x: 5, y: 3 }).id,
    });
    const order = kinds(result.events);
    expect(order.indexOf("UNIT_GREW")).toBeGreaterThan(
      order.indexOf("UNIT_DIED"),
    );
    expect(order.indexOf("UNIT_GREW")).toBeLessThan(
      order.indexOf("UNIT_MOVED"),
    );
    expect(order.indexOf("UNIT_MOVED")).toBeLessThan(
      order.indexOf("EXPLOSION_RESOLVED"),
    );
    // One credited kill (the Bomb Chucker); the blast's kill credits no unit.
    expect(result.events.filter((event) => event.kind === "UNIT_GREW")).toEqual(
      [{ kind: "UNIT_GREW", unitId: raptor.id, stage: 1, maxHp: 16, hp: 16 }],
    );
    expect(result.state.units).toHaveLength(1);
    // The death blast (2) hits the grown Raptor on the tile it advanced to.
    expect(unitAtV7(result.state, { x: 5, y: 3 })).toMatchObject({
      id: raptor.id,
      kills: 1,
      hp: 14,
      maxHp: 16,
    });
  });

  it("projects UNIT_GREW like UNIT_PROMOTED: to viewers who see the unit", () => {
    const arena = goblinArenaV7(
      ["DINOSAUR", "ORIGINAL", "GOBLIN"],
      [
        { seat: 0, role: "RAIDER", at: { x: 4, y: 6 } },
        { seat: 1, role: "FIGHTER", at: { x: 5, y: 6 }, hp: 1 },
        { seat: 1, role: "FIGHTER", at: { x: 2, y: 10 } },
      ],
    );
    const blind = seatIdV7(arena, 2);
    const blindCity = cityOfV7(arena, 2);
    const state = checkedV7({
      ...arena,
      players: arena.players.map((player) =>
        player.id === blind
          ? {
              ...player,
              explored: player.explored.filter(
                (at) =>
                  Math.abs(at.x - blindCity.at.x) <= 2 &&
                  Math.abs(at.y - blindCity.at.y) <= 2,
              ),
            }
          : player,
      ),
    });
    const raptor = unitAtV7(state, { x: 4, y: 6 });
    const result = applyOkV7(state, state.humanPlayerId, {
      kind: "ATTACK",
      unitId: raptor.id,
      targetUnitId: unitAtV7(state, { x: 5, y: 6 }).id,
    });
    const grew = {
      kind: "UNIT_GREW",
      unitId: raptor.id,
      stage: 1,
      maxHp: 16,
      hp: 16,
    };
    const projected = (seat: number) =>
      projectEventsV7(state, result.state, seatIdV7(state, seat), result.events)
        .events;
    expect(projected(0)).toContainEqual(grew);
    expect(projected(1)).toContainEqual(grew);
    expect(projected(2).map((event) => event.kind)).not.toContain("UNIT_GREW");
    // Kills and maximum HP are public on a visible unit, so the stage is.
    expect(
      viewForV7(result.state, seatIdV7(state, 1)).unitStats.find(
        (stats) => stats.unitId === raptor.id,
      )?.dinosaur?.growthStage,
    ).toBe(1);
  });

  it("never promotes a Dinosaur unit and keeps Promotion for Cavemen and Shamans", () => {
    const base = goblinArenaV7(
      ["DINOSAUR", "ORIGINAL"],
      [
        { seat: 0, role: "RAIDER", at: { x: 4, y: 3 } },
        { seat: 0, role: "KNIGHT", at: { x: 5, y: 3 } },
        { seat: 0, role: "FIGHTER", at: { x: 6, y: 3 } },
        { seat: 0, role: "CAPTAIN", at: { x: 7, y: 3 } },
        { seat: 1, role: "FIGHTER", at: { x: 1, y: 1 } },
      ],
    );
    let state = base;
    for (const x of [4, 5, 6, 7]) state = withKillsV7(state, { x, y: 3 }, 3);
    const offered = queryPlayerCommandsV7(state, state.humanPlayerId);
    for (const x of [4, 5]) {
      const unit = unitAtV7(state, { x, y: 3 });
      const promote: CommandV7 = { kind: "PROMOTE", unitId: unit.id };
      expect(offered).not.toContainEqual(promote);
      expect(applyCommandV7(state, state.humanPlayerId, promote)).toMatchObject(
        {
          accepted: false,
          error: {
            code: "PROMOTION_NOT_ELIGIBLE",
            params: { unitId: unit.id },
          },
        },
      );
      expect(unit.veteran).toBe(false);
    }
    for (const x of [6, 7]) {
      const unit = unitAtV7(state, { x, y: 3 });
      const promote: CommandV7 = { kind: "PROMOTE", unitId: unit.id };
      expect(offered).toContainEqual(promote);
      const result = applyOkV7(state, state.humanPlayerId, promote);
      // The Caveman on (6, 3) and the Shaman on (7, 3) have 10 HP (the
      // Caveman again since pulp_wars-0hi.3). Promotion adds 5.
      const maxHp = 15;
      expect(result.events).toEqual([
        { kind: "UNIT_PROMOTED", unitId: unit.id, maxHp },
      ]);
      expect(unitAtV7(result.state, { x, y: 3 })).toMatchObject({
        veteran: true,
        maxHp,
        hp: maxHp,
      });
    }
  });

  it("validates maximum HP against kills for growing roles and against Promotion otherwise", () => {
    const state = goblinArenaV7(
      ["DINOSAUR", "ORIGINAL"],
      [
        { seat: 0, role: "RAIDER", at: { x: 4, y: 3 } },
        { seat: 0, role: "FIGHTER", at: { x: 5, y: 3 } },
        { seat: 1, role: "RAIDER", at: { x: 1, y: 1 } },
      ],
    );
    const patched = (at: CoordV7, patch: Record<string, unknown>) =>
      parseGameStateV7({
        ...state,
        units: state.units.map((unit) =>
          sameV7(unit.at, at) ? { ...unit, ...patch } : unit,
        ),
      });
    const raptor = { x: 4, y: 3 };
    const caveman = { x: 5, y: 3 };
    const raider = { x: 1, y: 1 };
    // A growing role: maxHp = role maxHp + 4 * stage(kills), never veteran.
    expect(patched(raptor, { kills: 0, maxHp: 12 })).not.toBeNull();
    expect(patched(raptor, { kills: 1, maxHp: 16 })).not.toBeNull();
    expect(patched(raptor, { kills: 2, maxHp: 16 })).not.toBeNull();
    expect(patched(raptor, { kills: 3, maxHp: 20 })).not.toBeNull();
    expect(patched(raptor, { kills: 7, maxHp: 20 })).not.toBeNull();
    expect(patched(raptor, { kills: 1, maxHp: 12 })).toBeNull();
    expect(patched(raptor, { kills: 0, maxHp: 16 })).toBeNull();
    expect(patched(raptor, { kills: 2, maxHp: 20 })).toBeNull();
    expect(patched(raptor, { kills: 3, maxHp: 16 })).toBeNull();
    expect(patched(raptor, { kills: 3, maxHp: 17, veteran: true })).toBeNull();
    expect(patched(raptor, { kills: 3, maxHp: 20, veteran: true })).toBeNull();
    // Every other unit keeps the Promotion rule (the Caveman's 10 HP plus 5
    // when veteran; the Human Raider's 12 plus 5).
    expect(patched(caveman, { kills: 3, maxHp: 10 })).not.toBeNull();
    expect(
      patched(caveman, { kills: 3, maxHp: 15, veteran: true }),
    ).not.toBeNull();
    expect(patched(caveman, { kills: 1, maxHp: 16 })).toBeNull();
    expect(patched(caveman, { kills: 3, maxHp: 20, veteran: true })).toBeNull();
    expect(patched(raider, { kills: 1, maxHp: 12 })).not.toBeNull();
    expect(patched(raider, { kills: 1, maxHp: 16 })).toBeNull();
    expect(
      patched(raider, { kills: 3, maxHp: 17, veteran: true }),
    ).not.toBeNull();
  });

  it("heals a grown unit toward its grown maximum", () => {
    const base = goblinArenaV7(
      ["DINOSAUR", "ORIGINAL"],
      [
        { seat: 0, role: "RAIDER", at: { x: 7, y: 7 } },
        { seat: 0, role: "CAPTAIN", at: { x: 7, y: 8 } },
        { seat: 1, role: "FIGHTER", at: { x: 1, y: 1 } },
      ],
    );
    const tile = base.board.tiles.find((item) =>
      sameV7(item.at, { x: 7, y: 7 }),
    );
    expect(tile?.territoryCityId).toBe(cityOfV7(base, 0).id);
    // Recover: 4 in own territory, capped at the grown maximum of 16.
    const wounded = withKillsV7(base, { x: 7, y: 7 }, 1, 9);
    const raptor = unitAtV7(wounded, { x: 7, y: 7 });
    expect(
      applyOkV7(wounded, wounded.humanPlayerId, {
        kind: "RECOVER",
        unitId: raptor.id,
      }).events[0],
    ).toMatchObject({ kind: "UNIT_RECOVERED", amount: 4 });
    const nearFull = withKillsV7(base, { x: 7, y: 7 }, 1, 14);
    const recovered = applyOkV7(nearFull, nearFull.humanPlayerId, {
      kind: "RECOVER",
      unitId: raptor.id,
    });
    expect(recovered.events[0]).toMatchObject({ amount: 2 });
    expect(unitAtV7(recovered.state, { x: 7, y: 7 }).hp).toBe(16);
    // Tend Wounded heals above the role's base maximum (12) as well.
    const tended = applyOkV7(wounded, wounded.humanPlayerId, {
      kind: "TEND_WOUNDED",
      unitId: unitAtV7(wounded, { x: 7, y: 8 }).id,
    });
    // The Dinosaur pass, correction (7r53): a Shaman heals a dinosaur 4.
    expect(unitAtV7(tended.state, { x: 7, y: 7 }).hp).toBe(13);
    const high = withKillsV7(base, { x: 7, y: 7 }, 1, 13);
    expect(
      unitAtV7(
        applyOkV7(high, high.humanPlayerId, {
          kind: "TEND_WOUNDED",
          unitId: unitAtV7(high, { x: 7, y: 8 }).id,
        }).state,
        { x: 7, y: 7 },
      ).hp,
    ).toBe(16);
  });

  it("raises an infected Alpha as an ordinary Zombie with no growth", () => {
    const base = goblinArenaV7(
      ["UNDEAD", "DINOSAUR"],
      [
        { seat: 0, role: "GUARD", at: { x: 4, y: 3 } },
        { seat: 1, role: "KNIGHT", at: { x: 5, y: 3 } },
        { seat: 1, role: "FIGHTER", at: { x: 1, y: 1 } },
      ],
    );
    const state = withKillsV7(base, { x: 5, y: 3 }, 3, 1);
    const alpha = unitAtV7(state, { x: 5, y: 3 });
    expect([alpha.kills, alpha.maxHp]).toEqual([3, 36]);
    const result = applyOkV7(state, state.humanPlayerId, {
      kind: "ATTACK",
      unitId: unitAtV7(state, { x: 4, y: 3 }).id,
      targetUnitId: alpha.id,
    });
    expect(kinds(result.events)).toContain("UNIT_INFECTED");
    const rising = newUnitsV7(state, result.state)[0];
    if (rising === undefined) throw new Error("rising missing");
    expect(rising).toMatchObject({
      ownerId: state.humanPlayerId,
      role: "GUARD",
      form: "LAND",
      at: { x: 5, y: 3 },
      // (12 since step two of the Undead pass, 7r57; 10 before.)
      hp: 12,
      maxHp: 18,
      kills: 0,
      veteran: false,
    });
    expect(unitCapacitySlotsV7(result.state, rising)).toBe(1);
    expect(publicUnitStatsV7(result.state, rising)).not.toHaveProperty(
      "dinosaur",
    );
    expect(result.state.units.some((unit) => unit.id === alpha.id)).toBe(false);
  });

  it("keeps growth while embarked and after landing", () => {
    const base = goblinArenaV7(
      ["DINOSAUR", "ORIGINAL"],
      [
        { seat: 0, role: "KNIGHT", at: { x: 4, y: 2 }, form: "EMBARKED" },
        { seat: 1, role: "FIGHTER", at: { x: 1, y: 1 } },
      ],
      { water: [{ x: 4, y: 2 }] },
    );
    const state = withKillsV7(base, { x: 4, y: 2 }, 3);
    const embarked = unitAtV7(state, { x: 4, y: 2 });
    expect(embarked).toMatchObject({ form: "EMBARKED", kills: 3, maxHp: 36 });
    const stats = publicUnitStatsV7(state, embarked);
    expect(stats.dinosaur).toMatchObject({
      growthStage: 2,
      capacitySlots: 2,
    });
    // An embarked unit has no Attack, Alpha included.
    expect(
      stats.stats.find((stat) => stat.id === "ATTACK")?.total.numerator,
    ).toBe(0);
    expect(assignedUnitCountV7(state, cityOfV7(state, 0).id)).toBe(2);
    const landing = queryPlayerCommandsV7(state, state.humanPlayerId).find(
      (command) => command.kind === "DISEMBARK",
    );
    if (landing === undefined) throw new Error("no landing offered");
    const landed = applyOkV7(state, state.humanPlayerId, landing).state;
    expect(landed.units.find((unit) => unit.id === embarked.id)).toMatchObject({
      form: "LAND",
      kills: 3,
      maxHp: 36,
      hp: 36,
    });
  });
});

describe("ruleset-7 Dinosaur Wild", () => {
  it("never offers or accepts Field Defense for a Caveman or an Ankylosaurus", () => {
    const state = goblinArenaV7(
      ["DINOSAUR", "ORIGINAL"],
      [
        { seat: 0, role: "FIGHTER", at: { x: 7, y: 7 } },
        { seat: 0, role: "GUARD", at: { x: 9, y: 7 } },
        { seat: 1, role: "FIGHTER", at: { x: 1, y: 7 } },
        { seat: 1, role: "GUARD", at: { x: 3, y: 7 } },
      ],
    );
    const capital = cityOfV7(state, 0);
    for (const at of [
      { x: 7, y: 7 },
      { x: 9, y: 7 },
    ]) {
      expect(
        state.board.tiles.find((tile) => sameV7(tile.at, at))?.territoryCityId,
      ).toBe(capital.id);
      const build: CommandV7 = {
        kind: "BUILD_FIELD_DEFENSE",
        unitId: unitAtV7(state, at).id,
      };
      expect(
        queryPlayerCommandsV7(state, state.humanPlayerId),
      ).not.toContainEqual(build);
      expect(applyCommandV7(state, state.humanPlayerId, build)).toMatchObject({
        accepted: false,
        error: {
          code: "INVALID_TILE",
          params: { action: "BUILD_FIELD_DEFENSE" },
        },
      });
    }
    // The Human Fighter and Guard of the same match still build it.
    const humanTurn = endTurnUntilV7(state, seatIdV7(state, 1)).state;
    const offered = queryPlayerCommandsV7(humanTurn, seatIdV7(state, 1));
    for (const at of [
      { x: 1, y: 7 },
      { x: 3, y: 7 },
    ])
      expect(offered).toContainEqual({
        kind: "BUILD_FIELD_DEFENSE",
        unitId: unitAtV7(humanTurn, at).id,
      });
  });

  it("still fortifies Dinosaur-faction units on Field Defense they hold", () => {
    const base = goblinArenaV7(
      ["ORIGINAL", "DINOSAUR"],
      [
        { seat: 0, role: "FIGHTER", at: { x: 4, y: 7 } },
        { seat: 1, role: "FIGHTER", at: { x: 3, y: 7 } },
      ],
    );
    expect(
      base.board.tiles.find((tile) => sameV7(tile.at, { x: 3, y: 7 }))
        ?.territoryCityId,
    ).toBe(cityOfV7(base, 1).id);
    const plain = attack(base, { x: 4, y: 7 }, { x: 3, y: 7 });
    expect(combat(plain.events)).toMatchObject({
      fortificationLevel: 0,
      defense2: 4,
    });
    const state = withTileV7(base, { x: 3, y: 7 }, { fieldDefense: true });
    expect(
      fortificationLevelForUnitV7(state, unitAtV7(state, { x: 3, y: 7 })),
    ).toBe(2);
    // Without Explosives the defense stays; with it a melee attack clears it.
    const fortified = checkedV7({
      ...state,
      players: state.players.map((player) => ({
        ...player,
        researchedTechs: player.researchedTechs.filter(
          (tech) => tech !== "EXPLOSIVES",
        ),
      })),
    });
    const result = attack(fortified, { x: 4, y: 7 }, { x: 3, y: 7 });
    expect(combat(result.events)).toMatchObject({
      fortificationLevel: 2,
      defense2: 8,
    });
    expect(combat(result.events).damageToDefender).toBeLessThan(
      combat(plain.events).damageToDefender,
    );
  });
});

describe("ruleset-7 Dinosaur Acid", () => {
  /**
   * A Human level-5 Walled capital (8, 8) with a Guard on its center and
   * Field Defense there, and seat 1's attacker two tiles west, on its turn.
   */
  const walled = (
    faction: "DINOSAUR" | "ORIGINAL",
    fieldDefense: boolean,
  ): GameStateV7 => {
    const fixture = rewardStateV7(
      "JUGGERNAUT",
      "ORIGINAL",
      [{ role: "GUARD", at: { x: 8, y: 8 } }],
      { faction, pieces: [{ role: "MARKSMAN", at: { x: 6, y: 8 } }] },
    );
    const chosen = applyOkV7(fixture.state, fixture.state.humanPlayerId, {
      ...fixture.command,
      reward: "TREASURY",
    }).state;
    const next = endTurnUntilV7(chosen, seatIdV7(chosen, 1)).state;
    return fieldDefense
      ? withTileV7(next, { x: 8, y: 8 }, { fieldDefense: true })
      : next;
  };

  // The numbers were 4 instead of 2 before
  // tuning 5 (`pulp_wars-w49.4`): the Human Guard has Defense 1 against an attack from two or more tiles.
  it("ignores Walls and Field Defense: 6 damage instead of 3 (section 8.1)", () => {
    const state = walled("DINOSAUR", true);
    expect(
      fortificationLevelForUnitV7(state, unitAtV7(state, { x: 8, y: 8 })),
    ).toBe(4);
    const result = attack(state, { x: 6, y: 8 }, { x: 8, y: 8 });
    expect(combat(result.events)).toMatchObject({
      acid: true,
      attack2: 4,
      defense2: 2,
      fortificationLevel: 0,
      defenseBonusNumerator: 1,
      defenseBonusDenominator: 1,
      damageToDefender: 6,
      retaliation: false,
    });
    // Acid destroys nothing: the Walls and the Field Defense stay.
    expect(kinds(result.events)).not.toContain("FIELD_DEFENSE_DESTROYED");
    expect(
      fortificationLevelForUnitV7(
        result.state,
        unitAtV7(result.state, { x: 8, y: 8 }),
      ),
    ).toBe(4);
    // The Human Marksman of the same position deals 3 through the same forts.
    const human = walled("ORIGINAL", true);
    expect(
      combat(attack(human, { x: 6, y: 8 }, { x: 8, y: 8 }).events),
    ).toMatchObject({
      acid: false,
      defense2: 10,
      fortificationLevel: 4,
      damageToDefender: 3,
    });
    // Each fortification source alone is ignored as well.
    const wallsOnly = walled("DINOSAUR", false);
    expect(
      fortificationLevelForUnitV7(
        wallsOnly,
        unitAtV7(wallsOnly, { x: 8, y: 8 }),
      ),
    ).toBe(2);
    expect(
      combat(attack(wallsOnly, { x: 6, y: 8 }, { x: 8, y: 8 }).events),
    ).toMatchObject({ acid: true, fortificationLevel: 0, damageToDefender: 6 });
  });

  it("ignores Forest and Mountain cover: 5 damage instead of 4 (section 8.1)", () => {
    for (const terrain of ["FOREST", "MOUNTAIN"] as const)
      for (const [attacker, expected] of [
        ["DINOSAUR", { acid: true, bonus: [1, 1], damage: 5 }],
        ["ORIGINAL", { acid: false, bonus: [3, 2], damage: 4 }],
      ] as const)
        for (const from of [
          { x: 4, y: 3 },
          { x: 3, y: 3 },
        ]) {
          // Range 1 from (4, 3) and range 2 from (3, 3).
          const state = withTileV7(
            goblinArenaV7(
              [attacker, "ORIGINAL"],
              [
                { seat: 0, role: "MARKSMAN", at: from },
                { seat: 1, role: "FIGHTER", at: { x: 5, y: 3 } },
              ],
            ),
            { x: 5, y: 3 },
            { terrain },
          );
          const preview = combat(attack(state, from, { x: 5, y: 3 }).events);
          expect(
            [
              preview.acid,
              preview.defenseBonusNumerator,
              preview.defenseBonusDenominator,
              preview.damageToDefender,
            ],
            `${attacker} ${terrain} ${from.x}`,
          ).toEqual([
            expected.acid,
            expected.bonus[0],
            expected.bonus[1],
            expected.damage,
          ]);
        }
  });

  it("ignores Field Defense alone, at range 2, without destroying it", () => {
    const base = goblinArenaV7(
      ["DINOSAUR", "ORIGINAL"],
      [
        { seat: 0, role: "MARKSMAN", at: { x: 3, y: 5 } },
        { seat: 1, role: "FIGHTER", at: { x: 3, y: 7 } },
      ],
    );
    const state = withTileV7(base, { x: 3, y: 7 }, { fieldDefense: true });
    expect(
      fortificationLevelForUnitV7(state, unitAtV7(state, { x: 3, y: 7 })),
    ).toBe(2);
    const result = attack(state, { x: 3, y: 5 }, { x: 3, y: 7 });
    expect(combat(result.events)).toMatchObject({
      acid: true,
      fortificationLevel: 0,
      defense2: 4,
      damageToDefender: 5,
    });
    expect(kinds(result.events)).not.toContain("FIELD_DEFENSE_DESTROYED");
    expect(
      result.state.board.tiles.find((tile) => sameV7(tile.at, { x: 3, y: 7 }))
        ?.fieldDefense,
    ).toBe(true);
  });

  it("removes the cover from the defender's retaliation and never applies to the Spitter's own", () => {
    // Spitter attacks an adjacent Fighter in a Forest: no cover either way,
    // so the retaliation uses the reduced defense force (5, not 8).
    const forest = withTileV7(
      goblinArenaV7(
        ["DINOSAUR", "ORIGINAL"],
        [
          { seat: 0, role: "MARKSMAN", at: { x: 4, y: 3 } },
          { seat: 1, role: "FIGHTER", at: { x: 5, y: 3 } },
        ],
      ),
      { x: 5, y: 3 },
      { terrain: "FOREST" },
    );
    expect(
      combat(attack(forest, { x: 4, y: 3 }, { x: 5, y: 3 }).events),
    ).toMatchObject({
      acid: true,
      damageToDefender: 5,
      retaliation: true,
      damageToAttacker: 5,
    });
    // A Fighter attacks a Spitter in a Forest: the Spitter keeps its cover
    // and its retaliation carries no Acid.
    const defending = withTileV7(
      goblinArenaV7(
        ["ORIGINAL", "DINOSAUR"],
        [
          { seat: 0, role: "FIGHTER", at: { x: 4, y: 3 } },
          { seat: 1, role: "MARKSMAN", at: { x: 5, y: 3 } },
        ],
      ),
      { x: 5, y: 3 },
      { terrain: "FOREST" },
    );
    expect(
      combat(attack(defending, { x: 4, y: 3 }, { x: 5, y: 3 }).events),
    ).toMatchObject({
      acid: false,
      defenseBonusNumerator: 3,
      defenseBonusDenominator: 2,
      retaliation: true,
    });
    expect(
      publicUnitStatsV7(forest, unitAtV7(forest, { x: 4, y: 3 })).dinosaur
        ?.acid,
    ).toBe(true);
  });
});

describe("ruleset-7 Dinosaur Armoured", () => {
  it("reduces one instance of damage by 1, to a minimum of 1, and never an Egg's", () => {
    const state = goblinArenaV7(
      ["DINOSAUR", "ORIGINAL"],
      [
        { seat: 0, role: "GUARD", at: { x: 4, y: 3 } },
        { seat: 0, role: "FIGHTER", at: { x: 5, y: 3 } },
        { seat: 1, role: "GUARD", at: { x: 1, y: 1 } },
      ],
    );
    const ankylosaurus = unitAtV7(state, { x: 4, y: 3 });
    expect(
      [0, 1, 2, 3, 5, 20].map((damage) =>
        armouredDamageV7(state, ankylosaurus, damage),
      ),
    ).toEqual([0, 1, 1, 2, 4, 19]);
    for (const other of [
      { x: 5, y: 3 },
      { x: 1, y: 1 },
    ])
      expect(armouredDamageV7(state, unitAtV7(state, other), 5)).toBe(5);
    expect(
      armouredDamageV7(state, { ...ankylosaurus, form: "EMBARKED" }, 5),
    ).toBe(4);
    expect(armouredDamageV7(state, { ...ankylosaurus, form: "EGG" }, 5)).toBe(
      5,
    );
    expect(
      publicUnitStatsV7(state, ankylosaurus).dinosaur?.armourReduction,
    ).toBe(1);
  });

  it("reduces an attack hit: a Fighter deals 3 instead of 4 (section 8.2)", () => {
    const state = goblinArenaV7(
      ["ORIGINAL", "DINOSAUR"],
      [
        { seat: 0, role: "FIGHTER", at: { x: 4, y: 3 } },
        { seat: 1, role: "GUARD", at: { x: 5, y: 3 } },
      ],
    );
    const result = attack(state, { x: 4, y: 3 }, { x: 5, y: 3 });
    expect(combat(result.events)).toMatchObject({
      damageToDefender: 3,
      defenderArmoured: true,
      attackerArmoured: false,
    });
    expect(unitAtV7(result.state, { x: 5, y: 3 }).hp).toBe(17);
    // The same attack on a Human Guard is not reduced.
    const human = goblinArenaV7(
      ["ORIGINAL", "ORIGINAL"],
      [
        { seat: 0, role: "FIGHTER", at: { x: 4, y: 3 } },
        { seat: 1, role: "GUARD", at: { x: 5, y: 3 } },
      ],
    );
    expect(
      combat(attack(human, { x: 4, y: 3 }, { x: 5, y: 3 }).events),
    ).toMatchObject({ damageToDefender: 4, defenderArmoured: false });
    // A hit of 1 stays 1 and reports no reduction.
    const weak = goblinArenaV7(
      ["ORIGINAL", "DINOSAUR"],
      [
        { seat: 0, role: "FIGHTER", at: { x: 4, y: 3 }, hp: 2 },
        { seat: 1, role: "GUARD", at: { x: 5, y: 3 } },
      ],
    );
    expect(
      estimateCombatV7(
        weak,
        unitAtV7(weak, { x: 4, y: 3 }).id,
        unitAtV7(weak, { x: 5, y: 3 }).id,
      ),
    ).toMatchObject({ damageToDefender: 1, defenderArmoured: false });
  });

  it("reduces the retaliation an attacking Ankylosaurus takes", () => {
    const state = goblinArenaV7(
      ["DINOSAUR", "ORIGINAL"],
      [
        { seat: 0, role: "GUARD", at: { x: 4, y: 3 } },
        { seat: 1, role: "FIGHTER", at: { x: 5, y: 3 } },
      ],
    );
    const result = attack(state, { x: 4, y: 3 }, { x: 5, y: 3 });
    expect(combat(result.events)).toMatchObject({
      retaliation: true,
      damageToAttacker: 4,
      attackerArmoured: true,
      defenderArmoured: false,
    });
    expect(unitAtV7(result.state, { x: 4, y: 3 }).hp).toBe(16);
  });

  it("reduces a splash hit and derives the splash from the reduced primary damage", () => {
    // Lich splash: half of the primary damage, rounded up.
    const beside = goblinArenaV7(
      ["UNDEAD", "DINOSAUR"],
      [
        { seat: 0, role: "CATAPULT", at: { x: 2, y: 3 } },
        { seat: 1, role: "FIGHTER", at: { x: 5, y: 3 } },
        { seat: 1, role: "GUARD", at: { x: 6, y: 3 } },
        { seat: 1, role: "FIGHTER", at: { x: 5, y: 2 } },
      ],
    );
    const first = attack(beside, { x: 2, y: 3 }, { x: 5, y: 3 });
    expect(combat(first.events).damageToDefender).toBe(8);
    expect(
      combat(first.events).splash.map((entry) => [entry.at, entry.damage]),
    ).toEqual([
      [{ x: 5, y: 2 }, 4],
      [{ x: 6, y: 3 }, 3],
    ]);
    expect(unitAtV7(first.state, { x: 6, y: 3 }).hp).toBe(17);
    // The Ankylosaurus as the primary target: 7 becomes 6, so the splash is 3.
    const primary = goblinArenaV7(
      ["UNDEAD", "DINOSAUR"],
      [
        { seat: 0, role: "CATAPULT", at: { x: 2, y: 3 } },
        { seat: 1, role: "GUARD", at: { x: 5, y: 3 } },
        { seat: 1, role: "FIGHTER", at: { x: 6, y: 3 } },
      ],
    );
    const second = attack(primary, { x: 2, y: 3 }, { x: 5, y: 3 });
    expect(combat(second.events)).toMatchObject({
      damageToDefender: 6,
      defenderArmoured: true,
    });
    expect(combat(second.events).splash.map((entry) => entry.damage)).toEqual([
      3,
    ]);
  });

  it("reduces a Wail hit", () => {
    const state = goblinArenaV7(
      ["UNDEAD", "DINOSAUR"],
      [
        { seat: 0, role: "MARKSMAN", at: { x: 4, y: 3 } },
        { seat: 1, role: "GUARD", at: { x: 5, y: 3 }, hp: 5 },
        { seat: 1, role: "GUARD", at: { x: 6, y: 3 } },
        { seat: 1, role: "FIGHTER", at: { x: 4, y: 4 }, hp: 3 },
      ],
    );
    const banshee = unitAtV7(state, { x: 4, y: 3 });
    const preview = previewWailV7(state, state.humanPlayerId, banshee.id);
    const result = applyOkV7(state, state.humanPlayerId, {
      kind: "WAIL",
      unitId: banshee.id,
    });
    const wail = result.events.find((event) => event.kind === "WAIL_RESOLVED");
    if (wail?.kind !== "WAIL_RESOLVED") throw new Error("no wail");
    // Wounded Ankylosaurus: 3 becomes 2; full-HP one: 1 stays 1; the
    // Caveman's 3 is not reduced.
    expect(wail.results.map((entry) => [entry.at, entry.damage])).toEqual([
      [{ x: 5, y: 3 }, 2],
      [{ x: 6, y: 3 }, 1],
      [{ x: 4, y: 4 }, 3],
    ]);
    expect(
      preview?.targets.map((entry) => [entry.at, entry.damage, entry.dies]),
    ).toEqual(
      wail.results.map((entry) => [entry.at, entry.damage, entry.dies]),
    );
    expect(parseEventV7(wail).ok).toBe(true);
    expect(unitAtV7(result.state, { x: 5, y: 3 }).hp).toBe(3);
  });

  it("reduces a Kaboom hit to 4 and a death-blast hit to 1", () => {
    const kaboom = goblinArenaV7(
      ["GOBLIN", "DINOSAUR"],
      [
        { seat: 0, role: "FIGHTER", at: { x: 4, y: 3 } },
        { seat: 1, role: "GUARD", at: { x: 5, y: 3 } },
        { seat: 1, role: "FIGHTER", at: { x: 5, y: 4 } },
      ],
    );
    const goblin = unitAtV7(kaboom, { x: 4, y: 3 });
    const preview = previewKaboomV7(kaboom, kaboom.humanPlayerId, goblin.id);
    const boom = applyOkV7(kaboom, kaboom.humanPlayerId, {
      kind: "KABOOM",
      unitId: goblin.id,
    });
    const explosion = boom.events.find(
      (event) => event.kind === "EXPLOSION_RESOLVED",
    );
    if (explosion?.kind !== "EXPLOSION_RESOLVED") throw new Error("no blast");
    expect(explosion.damage).toBe(5);
    expect(explosion.results.map((entry) => [entry.at, entry.damage])).toEqual([
      [{ x: 5, y: 3 }, 4],
      [{ x: 5, y: 4 }, 5],
    ]);
    expect(parseEventV7(explosion).ok).toBe(true);
    expect(
      preview?.explosions[0]?.results.map((entry) => entry.damage),
    ).toEqual([4, 5]);
    expect(unitAtV7(boom.state, { x: 5, y: 3 }).hp).toBe(16);
    // Death blast: a Bomb Chucker killed next to an Ankylosaurus (2 -> 1).
    const blast = goblinArenaV7(
      ["DINOSAUR", "GOBLIN"],
      [
        { seat: 0, role: "MARKSMAN", at: { x: 3, y: 3 } },
        { seat: 0, role: "GUARD", at: { x: 6, y: 3 } },
        { seat: 0, role: "FIGHTER", at: { x: 5, y: 4 } },
        { seat: 1, role: "MARKSMAN", at: { x: 5, y: 3 }, hp: 1 },
      ],
    );
    const result = applyOkV7(blast, blast.humanPlayerId, {
      kind: "ATTACK",
      unitId: unitAtV7(blast, { x: 3, y: 3 }).id,
      targetUnitId: unitAtV7(blast, { x: 5, y: 3 }).id,
    });
    const death = result.events.find(
      (event) => event.kind === "EXPLOSION_RESOLVED",
    );
    if (death?.kind !== "EXPLOSION_RESOLVED") throw new Error("no blast");
    expect(death).toMatchObject({ cause: "DEATH", damage: 2 });
    expect(death.results.map((entry) => [entry.at, entry.damage])).toEqual([
      [{ x: 6, y: 3 }, 1],
      [{ x: 5, y: 4 }, 2],
    ]);
  });

  it("reduces Start Turn Plague damage to 1 and credits no growth", () => {
    const base = goblinArenaV7(
      ["UNDEAD", "DINOSAUR"],
      [
        { seat: 0, role: "CATAPULT", at: { x: 1, y: 1 } },
        { seat: 1, role: "GUARD", at: { x: 5, y: 3 } },
        { seat: 1, role: "RAIDER", at: { x: 7, y: 3 } },
      ],
    );
    const lich = unitAtV7(base, { x: 1, y: 1 });
    const ankylosaurus = unitAtV7(base, { x: 5, y: 3 });
    const raptor = unitAtV7(base, { x: 7, y: 3 });
    const state = checkedV7({
      ...base,
      plagued: [ankylosaurus, raptor]
        .map((unit) => ({
          unitId: unit.id,
          sourceUnitId: lich.id,
          turnsRemaining: 2,
        }))
        .sort((left, right) => left.unitId - right.unitId),
    });
    const started = endTurnUntilV7(state, seatIdV7(state, 1));
    const plague = started.events.find(
      (event) => event.kind === "PLAGUE_DAMAGED",
    );
    if (plague?.kind !== "PLAGUE_DAMAGED") throw new Error("no plague");
    expect(plague.results.map((entry) => [entry.at, entry.damage])).toEqual([
      [{ x: 5, y: 3 }, 1],
      [{ x: 7, y: 3 }, 2],
    ]);
    expect(parseEventV7(plague).ok).toBe(true);
    expect(unitAtV7(started.state, { x: 5, y: 3 }).hp).toBe(19);
    expect(unitAtV7(started.state, { x: 7, y: 3 }).hp).toBe(10);
    expect(kinds(started.events)).not.toContain("UNIT_GREW");
  });

  it("applies while embarked", () => {
    const water = [
      { x: 4, y: 2 },
      { x: 5, y: 2 },
    ];
    const state = goblinArenaV7(
      ["ORIGINAL", "DINOSAUR"],
      [
        { seat: 0, role: "PATROL_BOAT", at: { x: 4, y: 2 }, form: "NAVAL" },
        { seat: 1, role: "GUARD", at: { x: 5, y: 2 }, form: "EMBARKED" },
        { seat: 1, role: "FIGHTER", at: { x: 1, y: 1 } },
      ],
      { water },
    );
    const result = attack(state, { x: 4, y: 2 }, { x: 5, y: 2 });
    // Embarked Defense 1: a Patrol Boat deals 6, the Ankylosaurus takes 5.
    expect(combat(result.events)).toMatchObject({
      defense2: 2,
      damageToDefender: 5,
      defenderArmoured: true,
      retaliation: false,
    });
    const embarkedFighter = goblinArenaV7(
      ["ORIGINAL", "DINOSAUR"],
      [
        { seat: 0, role: "PATROL_BOAT", at: { x: 4, y: 2 }, form: "NAVAL" },
        { seat: 1, role: "FIGHTER", at: { x: 5, y: 2 }, form: "EMBARKED" },
        { seat: 1, role: "FIGHTER", at: { x: 1, y: 1 } },
      ],
      { water },
    );
    expect(
      combat(attack(embarkedFighter, { x: 4, y: 2 }, { x: 5, y: 2 }).events),
    ).toMatchObject({ damageToDefender: 6, defenderArmoured: false });
  });

  it("feeds the reduced damage into Lifesteal and still lets a 1-damage Zombie bite", () => {
    const vampire = goblinArenaV7(
      ["UNDEAD", "DINOSAUR"],
      [
        { seat: 0, role: "KNIGHT", at: { x: 4, y: 3 }, hp: 5 },
        { seat: 1, role: "GUARD", at: { x: 5, y: 3 } },
      ],
    );
    const drained = attack(vampire, { x: 4, y: 3 }, { x: 5, y: 3 });
    expect(combat(drained.events)).toMatchObject({
      damageToDefender: 4,
      defenderArmoured: true,
      attackerHeal: 4,
    });
    expect(unitAtV7(drained.state, { x: 4, y: 3 }).hp).toBe(9);
    const zombie = goblinArenaV7(
      ["UNDEAD", "DINOSAUR"],
      [
        { seat: 0, role: "GUARD", at: { x: 4, y: 3 }, hp: 7 },
        { seat: 1, role: "GUARD", at: { x: 5, y: 3 } },
      ],
    );
    const bitten = attack(zombie, { x: 4, y: 3 }, { x: 5, y: 3 });
    expect(combat(bitten.events)).toMatchObject({
      damageToDefender: 1,
      defenderArmoured: true,
      defenderBitten: true,
    });
    expect(bitten.state.bitten.map((entry) => entry.unitId)).toEqual([
      unitAtV7(zombie, { x: 5, y: 3 }).id,
    ]);
  });
});

describe("ruleset-7 Dinosaur ability parities", () => {
  it("gives the Raptor Pounce: Charge after a Move of two cells, with Raiding", () => {
    const raptor: GoblinPieceV7 = {
      seat: 0,
      role: "RAIDER",
      at: { x: 4, y: 3 },
      activation: { moved: true, movedPathLength: 2 },
    };
    const fighter: GoblinPieceV7 = {
      seat: 1,
      role: "FIGHTER",
      at: { x: 5, y: 3 },
    };
    const pieces = [raptor, fighter];
    const state = goblinArenaV7(["DINOSAUR", "ORIGINAL"], pieces);
    expect(
      combat(attack(state, { x: 4, y: 3 }, { x: 5, y: 3 }).events),
    ).toMatchObject({ chargeApplied: true, attack2: 7, gangUp: 0 });
    // Without Raiding, or after a one-cell Move, there is no bonus.
    const noRaiding = goblinArenaV7(["DINOSAUR", "ORIGINAL"], pieces, {
      techs: { 0: techs("SCOUTING") },
    });
    expect(
      combat(attack(noRaiding, { x: 4, y: 3 }, { x: 5, y: 3 }).events),
    ).toMatchObject({ chargeApplied: false, attack2: 5 });
    const short = goblinArenaV7(
      ["DINOSAUR", "ORIGINAL"],
      [{ ...raptor, activation: { moved: true, movedPathLength: 1 } }, fighter],
    );
    expect(
      combat(attack(short, { x: 4, y: 3 }, { x: 5, y: 3 }).events),
    ).toMatchObject({ chargeApplied: false, attack2: 5 });
    // No Escape after the attack.
    expect(
      combat(attack(state, { x: 4, y: 3 }, { x: 5, y: 3 }).events)
        .escapeAvailable,
    ).toBe(false);
  });

  it("gives the Shaman War Drums and Tend Wounded with the Captain's targets", () => {
    const state = goblinArenaV7(
      ["DINOSAUR", "ORIGINAL"],
      [
        { seat: 0, role: "CAPTAIN", at: { x: 5, y: 3 } },
        { seat: 0, role: "FIGHTER", at: { x: 4, y: 3 }, hp: 5 },
        { seat: 0, role: "RAIDER", at: { x: 6, y: 3 } },
        { seat: 0, role: "CAPTAIN", at: { x: 5, y: 2 }, hp: 5 },
        { seat: 0, role: "SWORDSMAN", at: { x: 5, y: 4 } },
        { seat: 0, role: "KNIGHT", at: { x: 4, y: 4 } },
        { seat: 0, role: "GUARD", at: { x: 7, y: 3 } },
        { seat: 1, role: "FIGHTER", at: { x: 1, y: 1 } },
      ],
    );
    const shaman = unitAtV7(state, { x: 5, y: 3 });
    const rally: CommandV7 = { kind: "RALLY", unitId: shaman.id };
    expect(queryPlayerCommandsV7(state, state.humanPlayerId)).toContainEqual(
      rally,
    );
    const drummed = applyOkV7(state, state.humanPlayerId, rally);
    // Adjacent own attackers, never another Shaman (SUPPORT), a Triceratops
    // (SIEGE), or a unit two tiles away.
    expect(drummed.events).toEqual([
      {
        kind: "UNITS_RALLIED",
        captainId: shaman.id,
        unitIds: [
          unitAtV7(state, { x: 4, y: 3 }).id,
          unitAtV7(state, { x: 6, y: 3 }).id,
          unitAtV7(state, { x: 4, y: 4 }).id,
        ].sort((left, right) => left - right),
      },
    ]);
    expect(
      drummed.state.units
        .filter((unit) => unit.activation.inspired)
        .map((unit) => unit.role)
        .sort(),
    ).toEqual(["FIGHTER", "KNIGHT", "RAIDER"]);
    const tended = applyOkV7(state, state.humanPlayerId, {
      kind: "TEND_WOUNDED",
      unitId: shaman.id,
    });
    expect(tended.events[0]).toMatchObject({
      kind: "WOUNDED_TENDED",
      results: [
        { unitId: unitAtV7(state, { x: 4, y: 3 }).id, amount: 2, hpAfter: 7 },
        { unitId: unitAtV7(state, { x: 5, y: 2 }).id, amount: 2, hpAfter: 7 },
      ],
    });
    // The Shaman cannot capture.
    expect(unitAtV7(state, { x: 5, y: 3 }).captureEligible).toBe(false);
  });

  it("makes the Triceratops a melee body: an attack after moving, an advance, and Field Defense destroyed", () => {
    const base = goblinArenaV7(
      ["DINOSAUR", "ORIGINAL"],
      [
        { seat: 0, role: "SWORDSMAN", at: { x: 4, y: 7 } },
        { seat: 1, role: "FIGHTER", at: { x: 3, y: 7 } },
        { seat: 1, role: "FIGHTER", at: { x: 1, y: 1 } },
      ],
    );
    // The tile behind the target is open Grass, so the Push is public.
    const state = patchTileV7(
      withTileV7(base, { x: 3, y: 7 }, { fieldDefense: true }),
      { x: 2, y: 7 },
      {
        terrain: "GRASS",
        biome: "PLAINS",
        resource: null,
        improvement: null,
        road: false,
      },
    );
    const triceratops = unitAtV7(state, { x: 4, y: 7 });
    const target = unitAtV7(state, { x: 3, y: 7 });
    // An ordinary adjacent Attack on a Fighter. Revision 20 Charge!: the
    // Field Defense level is ignored, so 3 against 2 deals 8 and takes 4, as
    // on open ground (the revision-20 Charge tests cover the rest).
    const result = attack(state, { x: 4, y: 7 }, { x: 3, y: 7 });
    expect(combat(result.events)).toMatchObject({
      attack2: 6,
      minimumRange: 1,
      maximumRange: 1,
      runUp: 0,
      fortificationLevel: 0,
      fortificationIgnored: 2,
      damageToDefender: 8,
      damageToAttacker: 4,
      retaliation: true,
      defenderDies: false,
    });
    expect(result.events).toContainEqual({
      kind: "FIELD_DEFENSE_DESTROYED",
      at: { x: 3, y: 7 },
      reason: "CATAPULT",
    });
    // On open ground: 8 damage and 4 back (revision 20 section 2.5).
    expect(estimateCombatV7(base, triceratops.id, target.id)).toMatchObject({
      damageToDefender: 8,
      damageToAttacker: 4,
    });
    // A melee kill advances onto the target's tile, unlike a Catapult.
    const weak = goblinArenaV7(
      ["DINOSAUR", "ORIGINAL"],
      [
        { seat: 0, role: "SWORDSMAN", at: { x: 4, y: 3 } },
        { seat: 1, role: "FIGHTER", at: { x: 5, y: 3 }, hp: 2 },
        { seat: 1, role: "FIGHTER", at: { x: 1, y: 1 } },
      ],
    );
    const killed = attack(weak, { x: 4, y: 3 }, { x: 5, y: 3 });
    expect(combat(killed.events)).toMatchObject({
      defenderDies: true,
      advances: true,
      overrunAdvance: false,
    });
    expect(unitAtV7(killed.state, { x: 5, y: 3 })).toMatchObject({
      role: "SWORDSMAN",
      kills: 1,
      maxHp: 24,
      hp: 24,
    });
    // Revision 20: it attacks after moving (with its run-up), and it is not
    // a ranged unit.
    const moved = goblinArenaV7(
      ["DINOSAUR", "ORIGINAL"],
      [
        {
          seat: 0,
          role: "SWORDSMAN",
          at: { x: 4, y: 3 },
          activation: { moved: true, movedPathLength: 1 },
        },
        { seat: 1, role: "FIGHTER", at: { x: 5, y: 3 } },
        { seat: 1, role: "FIGHTER", at: { x: 7, y: 3 } },
      ],
    );
    const attacker = unitAtV7(moved, { x: 4, y: 3 });
    const afterMove = {
      kind: "ATTACK" as const,
      unitId: attacker.id,
      targetUnitId: unitAtV7(moved, { x: 5, y: 3 }).id,
    };
    expect(
      queryPlayerCommandsV7(moved, moved.humanPlayerId).filter(
        (command) => command.kind === "ATTACK",
      ),
    ).toEqual([afterMove]);
    expect(
      combat(applyOkV7(moved, moved.humanPlayerId, afterMove).events),
    ).toMatchObject({ runUp: 1, attack2: 8 });
    const ready = goblinArenaV7(
      ["DINOSAUR", "ORIGINAL"],
      [
        { seat: 0, role: "SWORDSMAN", at: { x: 4, y: 3 } },
        { seat: 1, role: "FIGHTER", at: { x: 7, y: 3 } },
      ],
    );
    expect(
      applyCommandV7(ready, ready.humanPlayerId, {
        kind: "ATTACK",
        unitId: unitAtV7(ready, { x: 4, y: 3 }).id,
        targetUnitId: unitAtV7(ready, { x: 7, y: 3 }).id,
      }),
    ).toMatchObject({
      accepted: false,
      error: { code: "TARGET_OUT_OF_RANGE" },
    });
    expect(
      publicUnitStatsV7(ready, unitAtV7(ready, { x: 4, y: 3 })).dinosaur,
    ).toMatchObject({ runUpBonus: 1, runUpMaximum: 2, capacitySlots: 2 });
  });

  it("gives the Brontosaurus Push and the T-Rex no capture", () => {
    const state = goblinArenaV7(
      ["DINOSAUR", "ORIGINAL"],
      [
        { seat: 0, role: "JUGGERNAUT", at: { x: 4, y: 3 } },
        { seat: 1, role: "GUARD", at: { x: 5, y: 3 } },
        { seat: 1, role: "FIGHTER", at: { x: 1, y: 1 } },
      ],
    );
    const guard = unitAtV7(state, { x: 5, y: 3 });
    const result = applyOkV7(state, state.humanPlayerId, {
      kind: "ATTACK",
      unitId: unitAtV7(state, { x: 4, y: 3 }).id,
      targetUnitId: guard.id,
    });
    expect(combat(result.events)).toMatchObject({
      attack2: 7,
      push: "WILL_PUSH",
      defenderDies: false,
    });
    expect(result.events).toContainEqual({
      kind: "UNIT_PUSHED",
      sourceUnitId: unitAtV7(state, { x: 4, y: 3 }).id,
      targetUnitId: guard.id,
      from: { x: 5, y: 3 },
      to: { x: 6, y: 3 },
    });
    // Capture-capable Dinosaur units: Caveman, Raptor, Spitter,
    // Ankylosaurus, and Brontosaurus.
    const village = { x: 5, y: 5 };
    for (const [role, captures] of [
      ["FIGHTER", true],
      ["RAIDER", true],
      ["MARKSMAN", true],
      ["GUARD", true],
      ["JUGGERNAUT", true],
      ["CAPTAIN", false],
      ["SWORDSMAN", false],
      ["KNIGHT", false],
    ] as const) {
      const arena = goblinArenaV7(
        ["DINOSAUR", "ORIGINAL"],
        [
          { seat: 0, role, at: village, captureEligible: captures },
          { seat: 1, role: "FIGHTER", at: { x: 1, y: 1 } },
        ],
      );
      const capture: CommandV7 = {
        kind: "CAPTURE",
        unitId: unitAtV7(arena, village).id,
      };
      expect(
        applyCommandV7(arena, arena.humanPlayerId, capture).accepted,
        role,
      ).toBe(captures);
      // The state schema rejects capture eligibility for the other roles.
      if (!captures)
        expect(
          parseGameStateV7({
            ...arena,
            units: arena.units.map((unit) =>
              sameV7(unit.at, village)
                ? { ...unit, captureEligible: true }
                : unit,
            ),
          }),
        ).toBeNull();
    }
  });
});
