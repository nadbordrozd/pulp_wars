import { describe, expect, it } from "vitest";
import {
  TRACTOR_BEAM_RANGE_V7,
  fortificationLevelForUnitV7,
  parsePlayerEventEnvelopeV7,
  previewBeamDownV7,
  previewTractorBeamV7,
  projectEventsV7,
  recomputeLiveEconomyV7,
  tractorBeamDestinationV7,
  type CommandV7,
  type CoordV7,
  type GameStateV7,
  type UnitId,
  type UnitStateV7,
} from "../../src/engine/index";
import { checkedV7 } from "../fixtures/v7-builders";
import { cityOfV7 } from "../fixtures/v7-dinosaur-arena";
import { applyOkV7, seatIdV7, unitAtV7 } from "../fixtures/v7-goblin-arena";
import {
  activeViewV7,
  expectOfferedAcceptedV7,
  hasUnitAtV7,
  martianFieldV7,
  offeredV7,
  playV7,
  rejectedV7,
  shieldAtV7,
  type MartianFieldOptionsV7,
  type MartianPieceV7,
} from "../fixtures/v7-martian";
import {
  activeIdV7,
  at,
  attackV7,
  fieldDefenseV7,
  kindsV7,
  mountainV7,
  movedV7,
  tileV7,
  unexploreV7,
  walledV7,
  withoutTechsV7,
} from "../fixtures/v7-revision20";

// The Martian revision, section 8 (docs/product/RULESET_7_MARTIANS.md): Beam
// Down and the Tractor Beam (Mind Control: ruleset-v7-mind-control.test.ts).

const CAPITAL = at(8, 8);
const FAR: MartianPieceV7 = { seat: 1, role: "FIGHTER", at: at(1, 1) };

const idAt = (state: GameStateV7, where: CoordV7): UnitId =>
  unitAtV7(state, where).id;

// ---------------------------------------------------------------------------
// Beam Down
// ---------------------------------------------------------------------------

const beam = (
  state: GameStateV7,
  saucer: CoordV7,
  passenger: CoordV7,
  to: CoordV7,
): CommandV7 => ({
  kind: "BEAM_DOWN",
  unitId: idAt(state, saucer),
  passengerUnitId: idAt(state, passenger),
  to,
});

/** A Saucer on (4, 3) and a Grunt on the capital center. */
const beamField = (
  more: readonly MartianPieceV7[] = [],
  options: MartianFieldOptionsV7 = {},
  saucer: Partial<MartianPieceV7> = {},
) =>
  martianFieldV7(
    [
      { seat: 0, role: "RAIDER", at: at(4, 3), ...saucer },
      { seat: 0, role: "FIGHTER", at: CAPITAL },
      FAR,
      ...more,
    ],
    options,
  );

describe("Beam Down (section 8.1)", () => {
  it("moves an own unit from a city to a tile next to the Saucer; it counts as moved", () => {
    const state = beamField();
    const saucer = unitAtV7(state, at(4, 3));
    const grunt = unitAtV7(state, CAPITAL);
    const around = [
      at(3, 2),
      at(4, 2),
      at(5, 2),
      at(3, 3),
      at(5, 3),
      at(3, 4),
      at(4, 4),
      at(5, 4),
    ];
    // Offered for every legal destination in (y, x) order.
    expect(offeredV7(state, "BEAM_DOWN")).toEqual(
      around.map((to) => ({
        kind: "BEAM_DOWN",
        unitId: saucer.id,
        passengerUnitId: grunt.id,
        to,
      })),
    );
    expect(previewBeamDownV7(activeViewV7(state), saucer.id, grunt.id)).toEqual(
      {
        unitId: saucer.id,
        passengerUnitId: grunt.id,
        from: CAPITAL,
        destinations: around,
        fieldDefenseDestroyed: [],
      },
    );
    const run = playV7(state, beam(state, at(4, 3), CAPITAL, at(5, 3)));
    expect(run.events[0]).toEqual({
      kind: "UNIT_BEAMED",
      playerId: activeIdV7(state),
      unitId: saucer.id,
      passengerUnitId: grunt.id,
      from: CAPITAL,
      to: at(5, 3),
    });
    const beamed = unitAtV7(run.state, at(5, 3));
    expect(beamed).toMatchObject({
      id: grunt.id,
      hp: grunt.hp,
      kills: grunt.kills,
      homeCityId: grunt.homeCityId,
      captureEligible: false,
      // `pulp_wars-1wy.3`: it counts as having moved (like the end of an
      // ordinary Move); it is not exhausted and may still attack.
      activation: {
        ...grunt.activation,
        moved: true,
        handled: true,
      },
    });
    expect(run.state.beamedThisTurn).toEqual([grunt.id]);
    expect(shieldAtV7(run.state, at(5, 3))).toBe(2);
    // The Saucer has used its primary action and is handled.
    expect(unitAtV7(run.state, at(4, 3)).activation).toMatchObject({
      specialActed: true,
      handled: true,
    });
    // Neither moves, and the Saucer does nothing more.
    expect(
      offeredV7(
        run.state,
        "MOVE",
        "BEAM_DOWN",
        "TRACTOR_BEAM",
        "RECOVER",
      ).filter(
        (command) =>
          "unitId" in command &&
          (command.unitId === saucer.id || command.unitId === grunt.id),
      ),
    ).toEqual([]);
    // It is not a Move: nothing embarks, no Coins are spent.
    expect(kindsV7(run.events)).not.toContain("UNIT_MOVED");
    expect(run.state.players.map((player) => player.coins)).toEqual(
      state.players.map((player) => player.coins),
    );
  });

  it("rejects in the order of the legality table", () => {
    // 2: a role without Beam Down (the Mothership has it, `pulp_wars-1wy.3`).
    const state = beamField([{ seat: 0, role: "CATAPULT", at: at(7, 7) }]);
    expect(
      rejectedV7(state, {
        kind: "BEAM_DOWN",
        unitId: idAt(state, at(7, 7)),
        passengerUnitId: idAt(state, CAPITAL),
        to: at(6, 6),
      }),
    ).toEqual({ code: "UNIT_ROLE_INVALID", params: { role: "CATAPULT" } });
    // 1: not the actor's own unit.
    expect(
      rejectedV7(state, {
        kind: "BEAM_DOWN",
        unitId: idAt(state, at(1, 1)),
        passengerUnitId: idAt(state, CAPITAL),
        to: at(5, 3),
      }).code,
    ).toBe("UNIT_NOT_OWNED");
    // 3: a primary action already used, even when it has also moved.
    const acted = beamField(
      [],
      {},
      {
        activation: { ...movedV7(2), attacked: true, attacksUsed: 1 },
      },
    );
    expect(
      rejectedV7(acted, beam(acted, at(4, 3), CAPITAL, at(5, 3))).code,
    ).toBe("UNIT_ALREADY_ACTED");
    // 4: an embarked Saucer that moved.
    const afloat = beamField(
      [],
      { water: [at(4, 3)] },
      { form: "EMBARKED", activation: movedV7(1) },
    );
    expect(
      rejectedV7(afloat, beam(afloat, at(4, 3), CAPITAL, at(5, 3))),
    ).toEqual({ code: "BEAM_DOWN_NOT_LEGAL", params: { reason: "EMBARKED" } });
    // `pulp_wars-1wy.3`: row 5 is gone. A Saucer that moved may Beam Down;
    // with no legal passenger the rejection is row 6.
    const moved = martianFieldV7([
      { seat: 0, role: "RAIDER", at: at(4, 3), activation: movedV7(1) },
      FAR,
    ]);
    expect(
      rejectedV7(moved, {
        kind: "BEAM_DOWN",
        unitId: idAt(moved, at(4, 3)),
        passengerUnitId: idAt(moved, at(1, 1)),
        to: at(5, 3),
      }),
    ).toEqual({
      code: "BEAM_DOWN_NOT_LEGAL",
      params: { reason: "NO_PASSENGER" },
    });
    expect(offeredV7(moved, "BEAM_DOWN")).toEqual([]);
    const flown = beamField([], {}, { activation: movedV7(3) });
    expect(offeredV7(flown, "BEAM_DOWN")).toHaveLength(8);
    playV7(flown, beam(flown, at(4, 3), CAPITAL, at(5, 3)));
  });

  it("the passenger: another own land-form one-slot non-flyer on or next to an own city center", () => {
    const state = martianFieldV7(
      [
        { seat: 0, role: "RAIDER", at: at(4, 3) },
        { seat: 0, role: "FIGHTER", at: CAPITAL },
        // Next to the center: legal.
        { seat: 0, role: "CATAPULT", at: at(7, 7) },
        { seat: 0, role: "CAPTAIN", at: at(9, 9) },
        // Two tiles away: not a passenger.
        { seat: 0, role: "FIGHTER", at: at(6, 8) },
        // Two slots, or a flyer: never.
        { seat: 0, role: "KNIGHT", at: at(7, 8) },
        { seat: 0, role: "JUGGERNAUT", at: at(9, 8) },
        { seat: 0, role: "RAIDER", at: at(8, 7) },
        // Embarked next to the center.
        { seat: 0, role: "FIGHTER", at: at(8, 9), form: "EMBARKED" },
        FAR,
      ],
      { water: [at(8, 9)] },
    );
    const saucer = idAt(state, at(4, 3));
    const passengers = new Set(
      offeredV7(state, "BEAM_DOWN").flatMap((command) =>
        command.kind === "BEAM_DOWN" && command.unitId === saucer
          ? [command.passengerUnitId]
          : [],
      ),
    );
    expect([...passengers].sort()).toEqual(
      [CAPITAL, at(7, 7), at(9, 9)].map((where) => idAt(state, where)).sort(),
    );
    for (const where of [
      at(6, 8),
      at(7, 8),
      at(9, 8),
      at(8, 7),
      at(8, 9),
      at(4, 3),
      at(1, 1),
    ])
      expect(
        rejectedV7(state, beam(state, at(4, 3), where, at(5, 3))),
        `${where.x},${where.y}`,
      ).toEqual({
        code: "BEAM_DOWN_NOT_LEGAL",
        params: { reason: "NO_PASSENGER" },
      });
    expect(
      previewBeamDownV7(activeViewV7(state), saucer, idAt(state, at(6, 8))),
    ).toBeNull();
    expectOfferedAcceptedV7(state, "BEAM_DOWN");
  });

  it("the destination: next to the Saucer, empty land without a chest or a site, enterable by the passenger", () => {
    const base = martianFieldV7(
      [
        { seat: 0, role: "RAIDER", at: at(5, 4) },
        { seat: 0, role: "FIGHTER", at: CAPITAL },
        { seat: 0, role: "CATAPULT", at: at(7, 7) },
        { seat: 1, role: "GUARD", at: at(4, 3) },
        FAR,
      ],
      {
        water: [at(5, 3)],
        techs: { 0: withoutTechsV7("MARTIAN", "ENGINEERING") },
      },
    );
    const state = checkedV7({
      ...mountainV7(base, at(6, 3)),
      treasureChests: [at(6, 4)],
    });
    const invalid = (passenger: CoordV7, to: CoordV7) =>
      expect(
        rejectedV7(state, beam(state, at(5, 4), passenger, to)),
        `${to.x},${to.y}`,
      ).toEqual({ code: "INVALID_TILE", params: { action: "BEAM_DOWN" } });
    invalid(CAPITAL, at(7, 4)); // not next to the Saucer
    invalid(CAPITAL, at(5, 4)); // the Saucer's own tile
    invalid(CAPITAL, at(4, 3)); // a unit
    invalid(CAPITAL, at(5, 3)); // water
    invalid(CAPITAL, at(6, 4)); // a treasure chest
    invalid(CAPITAL, at(5, 5)); // a village center
    invalid(CAPITAL, at(6, 3)); // a Mountain without Engineering
    invalid(CAPITAL, at(20, 20)); // off the board
    // A striding passenger lands on the Mountain.
    const tripod = playV7(state, beam(state, at(5, 4), at(7, 7), at(6, 3)));
    expect(unitAtV7(tripod.state, at(6, 3)).role).toBe("CATAPULT");
    // The Grunt's legal tiles.
    expect(
      previewBeamDownV7(
        activeViewV7(state),
        idAt(state, at(5, 4)),
        idAt(state, CAPITAL),
      )?.destinations,
    ).toEqual([at(4, 4), at(4, 5), at(6, 5)]);
    expectOfferedAcceptedV7(state, "BEAM_DOWN");
  });

  it("destroys Field Defense on a tile of hostile territory (the disembarkation rule)", () => {
    const state = fieldDefenseV7(
      fieldDefenseV7(
        martianFieldV7([
          { seat: 0, role: "RAIDER", at: at(4, 7) },
          { seat: 0, role: "FIGHTER", at: CAPITAL },
          FAR,
        ]),
        at(3, 7),
      ),
      at(3, 8),
    );
    const view = activeViewV7(state);
    expect(
      previewBeamDownV7(view, idAt(state, at(4, 7)), idAt(state, CAPITAL))
        ?.fieldDefenseDestroyed,
    ).toEqual([at(3, 7), at(3, 8)]);
    const run = playV7(state, beam(state, at(4, 7), CAPITAL, at(3, 7)));
    expect(kindsV7(run.events).slice(0, 2)).toEqual([
      "UNIT_BEAMED",
      "FIELD_DEFENSE_DESTROYED",
    ]);
    expect(run.events[1]).toEqual({
      kind: "FIELD_DEFENSE_DESTROYED",
      at: at(3, 7),
      reason: "OCCUPATION",
    });
    expect(tileV7(run.state, at(3, 7)).fieldDefense).toBe(false);
    expect(tileV7(run.state, at(3, 8)).fieldDefense).toBe(true);
  });

  it("an acted, Plagued, Cooling, or mind-controlled passenger is fine and keeps its statuses", () => {
    const base = martianFieldV7(
      [
        { seat: 0, role: "RAIDER", at: at(4, 3) },
        {
          seat: 0,
          role: "MARKSMAN",
          at: CAPITAL,
          hp: 5,
          shield: 1,
          cooling: "COOLING",
          kills: 2,
          activation: {
            ...movedV7(1),
            attacked: true,
            attacksUsed: 1,
            handled: true,
          },
        },
        { seat: 0, role: "CAPTAIN", at: at(9, 9) },
        {
          seat: 1,
          role: "FIGHTER",
          at: at(7, 7),
          controlledBy: at(9, 9),
          hp: 4,
        },
        { seat: 1, role: "CATAPULT", at: at(1, 1) },
      ],
      { factions: ["MARTIAN", "UNDEAD"] },
    );
    const gunner = unitAtV7(base, CAPITAL);
    const state = checkedV7({
      ...base,
      plagued: [
        {
          unitId: gunner.id,
          sourceUnitId: idAt(base, at(1, 1)),
          turnsRemaining: 2,
        },
      ],
    });
    const run = playV7(state, beam(state, at(4, 3), CAPITAL, at(5, 3)));
    expect(unitAtV7(run.state, at(5, 3))).toMatchObject({
      id: gunner.id,
      hp: 5,
      kills: 2,
    });
    expect(shieldAtV7(run.state, at(5, 3))).toBe(1);
    expect(run.state.cooling).toEqual(state.cooling);
    expect(run.state.plagued).toEqual(state.plagued);
    // A controlled unit is a legal passenger and stays controlled.
    const controlled = playV7(state, beam(state, at(4, 3), at(7, 7), at(5, 3)));
    expect(controlled.state.mindControlled).toEqual(state.mindControlled);
    expect(unitAtV7(controlled.state, at(5, 3)).homeCityId).toBeNull();
  });

  it("is projected to a viewer that sees a tile involved, and to nobody else", () => {
    const state = beamField();
    const run = playV7(state, beam(state, at(4, 3), CAPITAL, at(5, 3)));
    const seen = projectEventsV7(
      state,
      run.state,
      seatIdV7(state, 1),
      run.events,
    );
    expect(parsePlayerEventEnvelopeV7(seen)).toEqual({ ok: true, value: seen });
    expect(seen.events).toContainEqual(run.events[0]);
    const blind = unexploreV7(state, 1, [at(4, 3), CAPITAL, at(5, 3)]);
    const hidden = applyOkV7(
      blind,
      activeIdV7(blind),
      beam(blind, at(4, 3), CAPITAL, at(5, 3)),
    );
    expect(
      projectEventsV7(
        blind,
        hidden.state,
        seatIdV7(blind, 1),
        hidden.events,
      ).events.filter((event) => event.kind === "UNIT_BEAMED"),
    ).toEqual([]);
  });

  it("is never offered to or accepted from a seat that is not Martian", () => {
    const state = martianFieldV7(
      [
        { seat: 0, role: "RAIDER", at: at(4, 3) },
        { seat: 0, role: "FIGHTER", at: CAPITAL },
        FAR,
      ],
      { factions: ["ORIGINAL", "ORIGINAL"] },
    );
    expect(
      offeredV7(state, "BEAM_DOWN", "MIND_CONTROL", "TRACTOR_BEAM"),
    ).toEqual([]);
    expect(rejectedV7(state, beam(state, at(4, 3), CAPITAL, at(5, 3)))).toEqual(
      { code: "UNIT_ROLE_INVALID", params: { role: "RAIDER" } },
    );
  });
});

// ---------------------------------------------------------------------------
// Mind Control
// ---------------------------------------------------------------------------

const control = (
  state: GameStateV7,
  brain: CoordV7,
  target: CoordV7,
): CommandV7 => ({
  kind: "MIND_CONTROL",
  unitId: idAt(state, brain),
  targetUnitId: idAt(state, target),
});

// The Mind Control rules (the legality table, the result, controlled units,
// and their release) are tested in `ruleset-v7-mind-control.test.ts` (the
// Mind Control revision, docs/product/RULESET_7_MIND_CONTROL.md).

// ---------------------------------------------------------------------------
// Tractor Beam
// ---------------------------------------------------------------------------

const pull = (
  state: GameStateV7,
  mothership: CoordV7,
  target: CoordV7,
): CommandV7 => ({
  kind: "TRACTOR_BEAM",
  unitId: idAt(state, mothership),
  targetUnitId: idAt(state, target),
});

const SHIP = at(4, 2);

const shipField = (
  more: readonly MartianPieceV7[],
  options: MartianFieldOptionsV7 = {},
  ship: Partial<MartianPieceV7> = {},
) =>
  martianFieldV7(
    [{ seat: 0, role: "KNIGHT", at: SHIP, ...ship }, ...more],
    options,
  );

const blocked = (state: GameStateV7, mothership: CoordV7, target: CoordV7) =>
  expect(rejectedV7(state, pull(state, mothership, target))).toEqual({
    code: "TRACTOR_BEAM_NOT_LEGAL",
    params: { reason: "BLOCKED" },
  });

describe("Tractor Beam (section 8.4)", () => {
  it("the constant of the rule", () => {
    expect(TRACTOR_BEAM_RANGE_V7).toBe(2);
  });

  it("all sixteen offsets at distance 2 pull one tile toward the Mothership", () => {
    const offsets: CoordV7[] = [];
    for (let dy = -2; dy <= 2; dy += 1)
      for (let dx = -2; dx <= 2; dx += 1)
        if (Math.max(Math.abs(dx), Math.abs(dy)) === 2)
          offsets.push(at(dx, dy));
    expect(offsets).toHaveLength(16);
    for (const offset of offsets) {
      const target = at(SHIP.x + offset.x, SHIP.y + offset.y);
      const to = at(
        target.x - Math.sign(offset.x),
        target.y - Math.sign(offset.y),
      );
      const label = `${offset.x},${offset.y}`;
      expect(tractorBeamDestinationV7(SHIP, target), label).toEqual(to);
      // The destination is always next to the Mothership.
      expect(
        Math.max(Math.abs(to.x - SHIP.x), Math.abs(to.y - SHIP.y)),
        label,
      ).toBe(1);
      const state = shipField([{ seat: 1, role: "GUARD", at: target }]);
      const ship = unitAtV7(state, SHIP);
      const victim = unitAtV7(state, target);
      expect(
        previewTractorBeamV7(activeViewV7(state), ship.id, victim.id),
        label,
      ).toEqual({
        unitId: ship.id,
        targetUnitId: victim.id,
        from: target,
        to,
        path: [to],
        fortificationLost: 0,
        emptiesCenterOfCityId: null,
        liftsSiegeOfCityId: null,
      });
      const run = playV7(state, pull(state, SHIP, target));
      expect(run.events[0], label).toEqual({
        kind: "UNIT_PULLED",
        sourceUnitId: ship.id,
        targetUnitId: victim.id,
        from: target,
        to,
        path: [to],
      });
      // No damage; the target keeps everything but its capture eligibility.
      expect(unitAtV7(run.state, to), label).toEqual({
        ...victim,
        at: to,
        captureEligible: false,
      });
      // `pulp_wars-1wy.3`: the Mothership's pull is free once a turn: its
      // activation is untouched and the per-turn fact records the use.
      expect(unitAtV7(run.state, SHIP).activation, label).toEqual(
        ship.activation,
      );
      expect(run.state.tractorUsedThisTurn, label).toEqual([ship.id]);
    }
  });

  it("rejects an actor that cannot use it, in order", () => {
    const target: MartianPieceV7 = { seat: 1, role: "GUARD", at: at(6, 2) };
    // `pulp_wars-1wy.3`: the Saucer has the Tractor Beam; a Tripod has not.
    const role = martianFieldV7([
      { seat: 0, role: "CATAPULT", at: SHIP },
      target,
    ]);
    expect(rejectedV7(role, pull(role, SHIP, at(6, 2)))).toEqual({
      code: "UNIT_ROLE_INVALID",
      params: { role: "CATAPULT" },
    });
    // The Saucer's pull is a primary action.
    const acted = martianFieldV7([
      {
        seat: 0,
        role: "RAIDER",
        at: SHIP,
        activation: { attacked: true, attacksUsed: 1 },
      },
      target,
    ]);
    expect(rejectedV7(acted, pull(acted, SHIP, at(6, 2))).code).toBe(
      "UNIT_ALREADY_ACTED",
    );
    // The Mothership's is free once a turn: after its attack too, but not
    // twice (ruleset-v7-balance-martian-ice.test.ts has the whole rule).
    const used = playV7(
      shipField(
        [target],
        {},
        { activation: { attacked: true, attacksUsed: 1 } },
      ),
      pull(shipField([target]), SHIP, at(6, 2)),
    );
    expect(rejectedV7(used.state, pull(used.state, SHIP, at(5, 2))).code).toBe(
      "UNIT_ALREADY_ACTED",
    );
    const afloat = shipField([target], { water: [SHIP] }, { form: "EMBARKED" });
    expect(rejectedV7(afloat, pull(afloat, SHIP, at(6, 2)))).toEqual({
      code: "TRACTOR_BEAM_NOT_LEGAL",
      params: { reason: "EMBARKED" },
    });
    // It may have moved.
    const moved = shipField([target], {}, { activation: movedV7(2) });
    playV7(moved, pull(moved, SHIP, at(6, 2)));
    // Unseen or unknown target.
    const hidden = unexploreV7(shipField([target]), 0, [at(6, 2)]);
    expect(rejectedV7(hidden, pull(hidden, SHIP, at(6, 2))).code).toBe(
      "TARGET_NOT_FOUND",
    );
  });

  it("immune targets and the range", () => {
    const state = shipField(
      [
        { seat: 1, role: "JUGGERNAUT", at: at(6, 2) },
        // The T-Rex: two slots.
        { seat: 1, role: "KNIGHT", at: at(2, 2) },
        // An own two-slot Mothership and an own Colossus.
        { seat: 0, role: "KNIGHT", at: at(4, 4) },
        { seat: 0, role: "JUGGERNAUT", at: at(6, 4) },
        // Distance 1 and 4 (`pulp_wars-1wy.3`: the Mothership reaches 3).
        { seat: 1, role: "FIGHTER", at: at(5, 3) },
        { seat: 1, role: "FIGHTER", at: at(8, 2) },
        // A one-slot dinosaur at distance 2: legal.
        { seat: 1, role: "GUARD", at: at(2, 0) },
      ],
      {
        factions: ["MARTIAN", "DINOSAUR"],
        eggs: [{ seat: 1, role: "RAIDER", at: at(2, 7) }],
      },
    );
    for (const where of [at(6, 2), at(2, 2), at(4, 4), at(6, 4)])
      expect(
        rejectedV7(state, pull(state, SHIP, where)),
        `${where.x},${where.y}`,
      ).toEqual({
        code: "TRACTOR_BEAM_NOT_LEGAL",
        params: { reason: "TARGET_IMMUNE" },
      });
    // An Egg is immune before its distance is read.
    expect(rejectedV7(state, pull(state, SHIP, at(2, 7))).params).toEqual({
      reason: "TARGET_IMMUNE",
    });
    for (const where of [at(5, 3), at(8, 2)])
      expect(rejectedV7(state, pull(state, SHIP, where)).params).toEqual({
        reason: "OUT_OF_RANGE",
      });
    expect(
      offeredV7(state, "TRACTOR_BEAM").filter(
        (command) =>
          command.kind === "TRACTOR_BEAM" &&
          command.unitId === idAt(state, SHIP),
      ),
    ).toEqual([pull(state, SHIP, at(2, 0))]);
    expectOfferedAcceptedV7(state, "TRACTOR_BEAM");
  });

  it("each Push condition and a treasure chest block the pull", () => {
    // Occupied destination.
    const occupied = shipField([
      { seat: 1, role: "GUARD", at: at(6, 2) },
      { seat: 1, role: "FIGHTER", at: at(5, 2) },
    ]);
    blocked(occupied, SHIP, at(6, 2));
    // A settlement site: the village (5, 5).
    const site = martianFieldV7([
      { seat: 0, role: "KNIGHT", at: at(5, 4) },
      { seat: 1, role: "GUARD", at: at(5, 6) },
    ]);
    blocked(site, at(5, 4), at(5, 6));
    // Land to water and water to land.
    const water = shipField(
      [
        { seat: 1, role: "GUARD", at: at(6, 2) },
        { seat: 1, role: "PATROL_BOAT", at: at(2, 2), form: "NAVAL" },
      ],
      { water: [at(5, 2), at(2, 2)] },
    );
    blocked(water, SHIP, at(6, 2));
    blocked(water, SHIP, at(2, 2));
    // A treasure chest.
    const chest = checkedV7({
      ...shipField([{ seat: 1, role: "GUARD", at: at(6, 2) }]),
      treasureChests: [at(5, 2)],
    });
    blocked(chest, SHIP, at(6, 2));
    expect(offeredV7(chest, "TRACTOR_BEAM")).toEqual([]);
    // A Mountain: a hostile ground unit is not pulled onto it, whatever its
    // owner has researched (that is private); one that already stands on a
    // Mountain is; an own Grunt needs Engineering; walkers and flyers do not.
    const mountain = (
      pieces: readonly MartianPieceV7[],
      engineering: boolean,
    ) =>
      mountainV7(
        shipField(pieces, {
          techs: engineering
            ? {}
            : { 0: withoutTechsV7("MARTIAN", "ENGINEERING") },
        }),
        at(5, 2),
      );
    blocked(
      mountain([{ seat: 1, role: "GUARD", at: at(6, 2) }], true),
      SHIP,
      at(6, 2),
    );
    const onMountain = mountainV7(
      mountain([{ seat: 1, role: "GUARD", at: at(6, 2) }], true),
      at(6, 2),
    );
    playV7(onMountain, pull(onMountain, SHIP, at(6, 2)));
    blocked(
      mountain([{ seat: 0, role: "FIGHTER", at: at(6, 2) }], false),
      SHIP,
      at(6, 2),
    );
    for (const [role, engineering] of [
      ["FIGHTER", true],
      ["CATAPULT", false],
      ["RAIDER", false],
    ] as const) {
      const state = mountain(
        [{ seat: 0, role, at: at(6, 2) }, FAR],
        engineering,
      );
      expect(
        unitAtV7(playV7(state, pull(state, SHIP, at(6, 2))).state, at(5, 2))
          .role,
      ).toBe(role);
    }
  });

  it("water to water: an afloat unit is pulled over Shallow Water, and onto Deep Water with Navigation", () => {
    const state = shipField(
      [{ seat: 1, role: "PATROL_BOAT", at: at(6, 2), form: "NAVAL" }],
      { water: [at(6, 2), at(5, 2)] },
    );
    const run = playV7(state, pull(state, SHIP, at(6, 2)));
    expect(unitAtV7(run.state, at(5, 2)).form).toBe("NAVAL");
    // An own embarked Grunt onto Deep Water: the owner's Navigation.
    for (const navigation of [true, false]) {
      const deep = shipField(
        [{ seat: 0, role: "FIGHTER", at: at(6, 2), form: "EMBARKED" }, FAR],
        {
          water: [at(6, 2)],
          deepWater: [at(5, 2)],
          techs: navigation
            ? {}
            : { 0: withoutTechsV7("MARTIAN", "NAVIGATION") },
        },
      );
      if (navigation) playV7(deep, pull(deep, SHIP, at(6, 2)));
      else blocked(deep, SHIP, at(6, 2));
    }
  });

  it("an own target keeps its activation: an unmoved own ray unit still fires at full power", () => {
    const state = shipField([
      { seat: 0, role: "MARKSMAN", at: at(6, 2), captureEligible: true },
      { seat: 1, role: "JUGGERNAUT", at: at(7, 2) },
    ]);
    const run = playV7(state, pull(state, SHIP, at(6, 2)));
    const gunner = unitAtV7(run.state, at(5, 2));
    expect(gunner.activation).toEqual(unitAtV7(state, at(6, 2)).activation);
    expect(gunner.captureEligible).toBe(false);
    expect(shieldAtV7(run.state, at(5, 2))).toBe(2);
    const shot = attackV7(run.state, at(5, 2), at(7, 2));
    expect(shot.combat).toMatchObject({ rayPower: "FULL", attack2: 6 });
  });

  it("pulls a defender off a Walled center with Field Defense: it loses both and the center is empty", () => {
    const state = walledV7({
      attackerFaction: "MARTIAN",
      attackers: [
        { role: "KNIGHT", at: at(6, 8) },
        { role: "FIGHTER", at: at(7, 7) },
      ],
      fieldDefense: true,
    });
    const guard = unitAtV7(state, at(8, 8));
    const city = cityOfV7(state, 0);
    expect(fortificationLevelForUnitV7(state, guard)).toBe(4);
    expect(
      previewTractorBeamV7(
        activeViewV7(state),
        idAt(state, at(6, 8)),
        guard.id,
      ),
    ).toMatchObject({
      from: at(8, 8),
      to: at(7, 8),
      fortificationLost: 4,
      emptiesCenterOfCityId: city.id,
      liftsSiegeOfCityId: null,
    });
    const run = playV7(state, pull(state, at(6, 8), at(8, 8)));
    expect(
      fortificationLevelForUnitV7(run.state, unitAtV7(run.state, at(7, 8))),
    ).toBe(0);
    // Nothing on either tile changes.
    expect(tileV7(run.state, at(8, 8)).fieldDefense).toBe(true);
    expect(cityOfV7(run.state, 0).rewards).toEqual(city.rewards);
    // No capture in the same turn: a Grunt that walks onto the emptied
    // center besieges it and cannot capture yet.
    const walked = applyOkV7(run.state, activeIdV7(run.state), {
      kind: "MOVE",
      unitId: idAt(run.state, at(7, 7)),
      path: [at(8, 8)],
    }).state;
    expect(offeredV7(walked, "CAPTURE")).toEqual([]);
    expect(
      rejectedV7(walked, { kind: "CAPTURE", unitId: idAt(walked, at(8, 8)) })
        .code,
    ).toBeDefined();
  });

  it("pulls a besieger off an own center: the siege is lifted", () => {
    const state = martianFieldV7([
      { seat: 0, role: "KNIGHT", at: at(8, 6) },
      { seat: 1, role: "FIGHTER", at: CAPITAL },
    ]);
    const city = cityOfV7(state, 0);
    expect(
      previewTractorBeamV7(
        activeViewV7(state),
        idAt(state, at(8, 6)),
        idAt(state, CAPITAL),
      ),
    ).toMatchObject({
      to: at(8, 7),
      emptiesCenterOfCityId: null,
      liftsSiegeOfCityId: city.id,
    });
    const run = playV7(state, pull(state, at(8, 6), CAPITAL));
    expect(hasUnitAtV7(run.state, CAPITAL)).toBe(false);
    expect(unitAtV7(run.state, at(8, 7)).captureEligible).toBe(false);
  });

  it("pulls a blockader off a dock: the blockade events follow", () => {
    const portAt = at(9, 8);
    const base = martianFieldV7(
      [
        { seat: 0, role: "KNIGHT", at: at(10, 10) },
        { seat: 1, role: "FIGHTER", at: at(1, 1) },
      ],
      { water: [portAt, at(10, 8), at(10, 9)] },
    );
    const owner = seatIdV7(base, 0);
    const built = applyOkV7(base, owner, { kind: "BUILD_PORT", at: portAt });
    const blockader: UnitStateV7 = {
      ...unitAtV7(built.state, at(1, 1)),
      id: built.state.nextEntityId as UnitId,
      homeCityId: null,
      at: portAt,
      role: "PATROL_BOAT",
      form: "NAVAL",
      // The template is a Human Fighter (12 HP since revision 20 section
      // 6.3); a Patrol Boat has 10.
      hp: 10,
      maxHp: 10,
    };
    const units = [...built.state.units, blockader];
    const economy = recomputeLiveEconomyV7(
      built.state,
      { board: built.state.board, cities: built.state.cities, units },
      built.state.populationContributions,
    );
    const state = checkedV7({
      ...built.state,
      nextEntityId: built.state.nextEntityId + 1,
      units,
      cities: economy.cities,
      populationContributions: economy.populationContributions,
    });
    const run = playV7(state, pull(state, at(10, 10), portAt));
    expect(unitAtV7(run.state, at(10, 9)).id).toBe(blockader.id);
    expect(run.events).toContainEqual({
      kind: "PORT_BLOCKADE_CHANGED",
      playerId: owner,
      cityId: cityOfV7(state, 0).id,
      at: portAt,
      activeBefore: false,
      activeAfter: true,
    });
  });

  it("a pulled exploding unit keeps everything and explodes next to the Mothership later", () => {
    const state = shipField(
      [
        { seat: 1, role: "MARKSMAN", at: at(6, 2), hp: 1 },
        { seat: 0, role: "MARKSMAN", at: at(7, 3) },
        { seat: 1, role: "FIGHTER", at: at(1, 5) },
      ],
      { factions: ["MARTIAN", "GOBLIN"] },
    );
    const run = playV7(state, pull(state, SHIP, at(6, 2)));
    expect(kindsV7(run.events)).not.toContain("EXPLOSION_RESOLVED");
    expect(unitAtV7(run.state, at(5, 2)).hp).toBe(1);
    // The Ray Gunner then kills it at range 2: the blast (5 since
    // `pulp_wars-w49.35`, 2 before) reaches the Mothership next to it, whose
    // Shield (4) absorbs all but 1 of it.
    const shot = attackV7(run.state, at(7, 3), at(5, 2));
    expect(shot.combat.defenderDies).toBe(true);
    expect(shieldAtV7(shot.state, SHIP)).toBe(0);
    expect(unitAtV7(shot.state, SHIP).hp).toBe(15);
  });

  it("is projected to the target's owner", () => {
    const state = shipField([{ seat: 1, role: "GUARD", at: at(6, 2) }]);
    const run = playV7(state, pull(state, SHIP, at(6, 2)));
    const envelope = projectEventsV7(
      state,
      run.state,
      seatIdV7(state, 1),
      run.events,
    );
    expect(parsePlayerEventEnvelopeV7(envelope)).toEqual({
      ok: true,
      value: envelope,
    });
    expect(envelope.events).toContainEqual(run.events[0]);
  });
});

// ---------------------------------------------------------------------------
// Allied seats (a cooperative three-seat match)
// ---------------------------------------------------------------------------

describe("allied units and territory", () => {
  // Seat 0 is Human; seats 1 and 2 are allied Martian seats. Capitals:
  // seat 0 (2, 2), seat 1 (11, 11), seat 2 (11, 2).
  const allied = (pieces: readonly MartianPieceV7[]) =>
    martianFieldV7(pieces, {
      factions: ["ORIGINAL", "MARTIAN", "MARTIAN"],
      aiMode: "COOPERATIVE",
      activeSeat: 1,
    });

  it("an allied unit is never a target of Mind Control or the Tractor Beam", () => {
    const state = allied([
      { seat: 1, role: "CAPTAIN", at: at(6, 11) },
      { seat: 1, role: "KNIGHT", at: at(6, 9) },
      { seat: 2, role: "FIGHTER", at: at(8, 11), hp: 3 },
      { seat: 2, role: "FIGHTER", at: at(8, 9) },
      { seat: 0, role: "FIGHTER", at: at(1, 1) },
    ]);
    expect(rejectedV7(state, control(state, at(6, 11), at(8, 11))).code).toBe(
      "TARGET_ALLIED",
    );
    expect(rejectedV7(state, pull(state, at(6, 9), at(8, 9))).code).toBe(
      "TARGET_ALLIED",
    );
  });

  it("allied territory is never a Beam Down destination; a flyer passes over an allied unit", () => {
    const state = allied([
      { seat: 1, role: "RAIDER", at: at(9, 4) },
      { seat: 1, role: "FIGHTER", at: at(11, 11) },
      { seat: 2, role: "FIGHTER", at: at(8, 4) },
      { seat: 0, role: "FIGHTER", at: at(1, 1) },
    ]);
    // (10, 3) is territory of the allied capital (11, 2).
    expect(
      rejectedV7(state, beam(state, at(9, 4), at(11, 11), at(10, 3))),
    ).toEqual({ code: "INVALID_TILE", params: { action: "BEAM_DOWN" } });
    playV7(state, beam(state, at(9, 4), at(11, 11), at(9, 5)));
    const flown = applyOkV7(state, activeIdV7(state), {
      kind: "MOVE",
      unitId: idAt(state, at(9, 4)),
      path: [at(8, 4), at(7, 4)],
    });
    expect(unitAtV7(flown.state, at(7, 4)).role).toBe("RAIDER");
  });

  it("Pierce hits an allied unit behind the target, without kill credit", () => {
    const state = allied([
      { seat: 1, role: "CATAPULT", at: at(5, 11) },
      { seat: 0, role: "GUARD", at: at(7, 11) },
      { seat: 2, role: "FIGHTER", at: at(8, 11), hp: 2, shield: 0 },
    ]);
    const run = attackV7(state, at(5, 11), at(7, 11));
    expect(run.combat.splash).toMatchObject([{ at: at(8, 11), dies: true }]);
    expect(run.attacker?.kills).toBe(0);
    expect(hasUnitAtV7(run.state, at(8, 11))).toBe(false);
  });
});
