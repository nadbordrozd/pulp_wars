import { describe, expect, it } from "vitest";
import {
  MIND_CONTROL_COOLDOWN_TURNS_V7,
  MIND_CONTROL_HP_V7,
  MIND_CONTROL_RANGE_V7,
  MIND_CONTROL_THRALL_LIMIT_V7,
  TRACTOR_BEAM_RANGE_V7,
  fortificationLevelForUnitV7,
  parseGameStateV7,
  parsePlayerEventEnvelopeV7,
  previewBeamDownV7,
  previewCityCapacityV7,
  previewDisbandV7,
  previewMindControlV7,
  previewTractorBeamV7,
  projectEventsV7,
  recomputeLiveEconomyV7,
  tractorBeamDestinationV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type DomainEventV7,
  type GameStateV7,
  type UnitId,
  type UnitStateV7,
} from "../../src/engine/index";
import { checkedV7 } from "../fixtures/v7-builders";
import { cityOfV7 } from "../fixtures/v7-dinosaur-arena";
import {
  applyOkV7,
  endTurnUntilV7,
  sameV7,
  seatIdV7,
  unitAtV7,
} from "../fixtures/v7-goblin-arena";
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
  patchUnitV7,
  tileV7,
  unexploreV7,
  walledV7,
  withoutTechsV7,
} from "../fixtures/v7-revision20";

// The Martian revision, section 8 (docs/product/RULESET_7_MARTIANS.md): Beam
// Down, Mind Control and Thralls, and the Tractor Beam.

const CAPITAL = at(8, 8);
const FAR: MartianPieceV7 = { seat: 1, role: "FIGHTER", at: at(1, 1) };

const idAt = (state: GameStateV7, where: CoordV7): UnitId =>
  unitAtV7(state, where).id;

const deaths = (events: readonly DomainEventV7[]) =>
  events.flatMap((event) =>
    event.kind === "UNIT_DIED"
      ? [{ unitId: event.unitId, cause: event.cause }]
      : [],
  );

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
  it("moves an own unit from a city to a tile next to an unmoved Saucer, exhausted", () => {
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
      activation: { moved: true, attacked: true, handled: true },
    });
    expect(shieldAtV7(run.state, at(5, 3))).toBe(2);
    // The Saucer has used its primary action and is handled.
    expect(unitAtV7(run.state, at(4, 3)).activation).toMatchObject({
      handled: true,
    });
    expect(
      offeredV7(run.state).filter(
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
    // 2: a role without Beam Down.
    const state = beamField([{ seat: 0, role: "KNIGHT", at: at(7, 7) }]);
    expect(
      rejectedV7(state, {
        kind: "BEAM_DOWN",
        unitId: idAt(state, at(7, 7)),
        passengerUnitId: idAt(state, CAPITAL),
        to: at(6, 6),
      }),
    ).toEqual({ code: "UNIT_ROLE_INVALID", params: { role: "KNIGHT" } });
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
    // 4 before 5: an embarked Saucer that moved.
    const afloat = beamField(
      [],
      { water: [at(4, 3)] },
      { form: "EMBARKED", activation: movedV7(1) },
    );
    expect(
      rejectedV7(afloat, beam(afloat, at(4, 3), CAPITAL, at(5, 3))),
    ).toEqual({ code: "BEAM_DOWN_NOT_LEGAL", params: { reason: "EMBARKED" } });
    // 5 before 6: a Saucer that moved, with no legal passenger either.
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
    ).toEqual({ code: "BEAM_DOWN_NOT_LEGAL", params: { reason: "MOVED" } });
    expect(offeredV7(moved, "BEAM_DOWN")).toEqual([]);
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

  it("an acted, Plagued, Cooling, or Thrall passenger is fine and keeps its statuses", () => {
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
        { seat: 0, role: "FIGHTER", at: at(7, 7), thrallOf: at(9, 9), hp: 4 },
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
    // A Thrall is a legal passenger and stays a Thrall.
    const thrall = playV7(state, beam(state, at(4, 3), at(7, 7), at(5, 3)));
    expect(thrall.state.thralls).toEqual(state.thralls);
    expect(unitAtV7(thrall.state, at(5, 3)).homeCityId).toBeNull();
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
// Mind Control and Thralls
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

const BRAIN = at(4, 3);

/** A Brain on (4, 3) with the given other pieces. */
const brainField = (
  more: readonly MartianPieceV7[],
  options: MartianFieldOptionsV7 = {},
  brain: Partial<MartianPieceV7> = {},
) =>
  martianFieldV7(
    [{ seat: 0, role: "CAPTAIN", at: BRAIN, ...brain }, ...more],
    options,
  );

describe("Mind Control (section 8.2)", () => {
  it("the constants of the rule", () => {
    expect([
      MIND_CONTROL_HP_V7,
      MIND_CONTROL_RANGE_V7,
      MIND_CONTROL_COOLDOWN_TURNS_V7,
      MIND_CONTROL_THRALL_LIMIT_V7,
      TRACTOR_BEAM_RANGE_V7,
    ]).toEqual([6, 2, 2, 2, 2]);
  });

  it("removes a weakened enemy without a death and puts a Thrall with its HP on its tile", () => {
    const state = brainField([
      { seat: 1, role: "KNIGHT", at: at(6, 3), hp: 6 },
      FAR,
    ]);
    const brain = unitAtV7(state, BRAIN);
    const victim = unitAtV7(state, at(6, 3));
    const thrallId = state.nextEntityId as UnitId;
    const view = activeViewV7(state);
    expect(offeredV7(state, "MIND_CONTROL")).toEqual([
      control(state, BRAIN, at(6, 3)),
    ]);
    expect(previewMindControlV7(view, brain.id, victim.id)).toEqual({
      unitId: brain.id,
      targetUnitId: victim.id,
      at: at(6, 3),
      thrallHp: 6,
      thrallMaxHp: 10,
      thrallsAfter: 1,
      thrallLimit: 2,
      cooldownTurns: 2,
      collapsingUnitIds: [],
      plagueCleared: [],
    });
    const run = playV7(state, control(state, BRAIN, at(6, 3)));
    expect(run.events[0]).toEqual({
      kind: "UNIT_MIND_CONTROLLED",
      playerId: activeIdV7(state),
      unitId: brain.id,
      targetUnitId: victim.id,
      targetOwnerId: victim.ownerId,
      targetRole: "KNIGHT",
      thrallUnitId: thrallId,
      at: at(6, 3),
      hp: 6,
    });
    // A removal, not a death: no UNIT_DIED, Grave, credit, or Coins.
    expect(deaths(run.events)).toEqual([]);
    expect(run.state.graves).toEqual(state.graves);
    expect(run.state.units.some((unit) => unit.id === victim.id)).toBe(false);
    expect(unitAtV7(run.state, BRAIN).kills).toBe(0);
    expect(run.state.players.map((player) => player.coins)).toEqual(
      state.players.map((player) => player.coins),
    );
    expect(unitAtV7(run.state, at(6, 3))).toEqual({
      id: thrallId,
      ownerId: brain.ownerId,
      homeCityId: null,
      role: "FIGHTER",
      form: "LAND",
      at: at(6, 3),
      hp: 6,
      maxHp: 10,
      kills: 0,
      veteran: false,
      captureEligible: false,
      activation: expect.objectContaining({
        moved: true,
        attacked: true,
        handled: true,
      }),
    });
    expect(run.state.nextEntityId).toBe(state.nextEntityId + 1);
    expect(run.state.thralls).toEqual([
      { unitId: thrallId, brainUnitId: brain.id },
    ]);
    expect(run.state.mindControlCooldowns).toEqual([
      { unitId: brain.id, turnsRemaining: 2 },
    ]);
    expect(run.state.shields.some((entry) => entry.unitId === thrallId)).toBe(
      false,
    );
    expect(unitAtV7(run.state, BRAIN).activation.handled).toBe(true);
    // A Thrall is ordinary from its owner's next Start Turn.
    const other = seatIdV7(state, 1);
    const next = endTurnUntilV7(
      endTurnUntilV7(run.state, other).state,
      brain.ownerId,
    ).state;
    expect(unitAtV7(next, at(6, 3)).activation).toMatchObject({
      moved: false,
      attacked: false,
      handled: false,
    });
    // It never has a Shield, not even at a recharge.
    expect(next.shields.some((entry) => entry.unitId === thrallId)).toBe(false);
  });

  it("a moved Brain may use it; a Shield does not count toward the HP limit", () => {
    const state = brainField(
      [{ seat: 1, role: "FIGHTER", at: at(6, 3), hp: 6 }, FAR],
      { factions: ["MARTIAN", "MARTIAN"] },
      { activation: movedV7(1) },
    );
    expect(shieldAtV7(state, at(6, 3))).toBe(2);
    const run = playV7(state, control(state, BRAIN, at(6, 3)));
    expect(unitAtV7(run.state, at(6, 3))).toMatchObject({
      ownerId: seatIdV7(state, 0),
      hp: 6,
    });
    // The victim's Shield ended with it.
    expect(shieldAtV7(run.state, at(6, 3))).toBe(0);
  });

  it("rejects in the order of the legality table", () => {
    const reason = (state: GameStateV7, target: CoordV7, brain = BRAIN) =>
      rejectedV7(state, control(state, brain, target));
    // 2: a role without Mind Control.
    const role = martianFieldV7([
      { seat: 0, role: "FIGHTER", at: BRAIN },
      { seat: 1, role: "FIGHTER", at: at(6, 3), hp: 3 },
    ]);
    expect(reason(role, at(6, 3))).toEqual({
      code: "UNIT_ROLE_INVALID",
      params: { role: "FIGHTER" },
    });
    const weak: MartianPieceV7 = {
      seat: 1,
      role: "FIGHTER",
      at: at(6, 3),
      hp: 3,
    };
    // 3: the primary action is used.
    const acted = brainField(
      [weak],
      {},
      {
        activation: { attacked: true, attacksUsed: 1 },
      },
    );
    expect(reason(acted, at(6, 3)).code).toBe("UNIT_ALREADY_ACTED");
    // 4 before 5 and 6: embarked, on cooldown, at the Thrall limit.
    const afloat = brainField(
      [weak],
      { water: [BRAIN] },
      {
        form: "EMBARKED",
        cooldown: 2,
      },
    );
    expect(reason(afloat, at(6, 3)).params).toEqual({ reason: "EMBARKED" });
    // 5 before 6: on cooldown and at the limit.
    const limit: MartianPieceV7[] = [
      { seat: 0, role: "FIGHTER", at: at(3, 3), thrallOf: BRAIN, hp: 5 },
      { seat: 0, role: "FIGHTER", at: at(3, 4), thrallOf: BRAIN, hp: 5 },
    ];
    const cooling = brainField([weak, ...limit], {}, { cooldown: 0 });
    expect(reason(cooling, at(6, 3))).toEqual({
      code: "MIND_CONTROL_NOT_LEGAL",
      params: { reason: "COOLDOWN" },
    });
    // 6: two Thralls already.
    const full = brainField([weak, ...limit]);
    expect(reason(full, at(6, 3)).params).toEqual({ reason: "THRALL_LIMIT" });
    expect(offeredV7(full, "MIND_CONTROL")).toEqual([]);
    // 7: a target the actor cannot see, or that does not exist.
    const hidden = unexploreV7(brainField([weak]), 0, [at(6, 3)]);
    expect(reason(hidden, at(6, 3)).code).toBe("TARGET_NOT_FOUND");
    expect(
      rejectedV7(hidden, {
        kind: "MIND_CONTROL",
        unitId: idAt(hidden, BRAIN),
        targetUnitId: 9999 as UnitId,
      }).code,
    ).toBe("TARGET_NOT_FOUND");
    // 8: not hostile (an own unit).
    const own = brainField([
      { seat: 0, role: "FIGHTER", at: at(5, 3), hp: 3 },
      FAR,
    ]);
    expect(reason(own, at(5, 3)).code).toBe("TARGET_ALLIED");
    // 9 before 10 and 11: immune targets, far away and healthy.
    const immune = brainField(
      [
        { seat: 1, role: "JUGGERNAUT", at: at(8, 3) },
        { seat: 1, role: "JUGGERNAUT", at: at(6, 3), hp: 3 },
        // A two-slot unit (the T-Rex).
        { seat: 1, role: "KNIGHT", at: at(6, 4), hp: 3 },
        // On a settlement site.
        { seat: 1, role: "FIGHTER", at: at(5, 5), hp: 3 },
        // Afloat.
        { seat: 1, role: "FIGHTER", at: at(4, 1), hp: 3, form: "EMBARKED" },
        { seat: 1, role: "PATROL_BOAT", at: at(5, 1), hp: 3, form: "NAVAL" },
      ],
      {
        factions: ["MARTIAN", "DINOSAUR"],
        water: [at(4, 1), at(5, 1)],
        eggs: [{ seat: 1, role: "RAIDER", at: at(2, 7), hp: 3 }],
      },
    );
    for (const where of [
      at(8, 3),
      at(6, 3),
      at(6, 4),
      at(5, 5),
      at(4, 1),
      at(5, 1),
      at(2, 7),
    ])
      expect(reason(immune, where), `${where.x},${where.y}`).toEqual({
        code: "MIND_CONTROL_NOT_LEGAL",
        params: { reason: "TARGET_IMMUNE" },
      });
    expect(offeredV7(immune, "MIND_CONTROL")).toEqual([]);
    // 10 before 11: out of range and healthy.
    const far = brainField([
      { seat: 1, role: "FIGHTER", at: at(7, 3) },
      { seat: 1, role: "FIGHTER", at: at(6, 3), hp: 7 },
      { seat: 1, role: "FIGHTER", at: at(7, 4), hp: 6 },
    ]);
    expect(reason(far, at(7, 3)).params).toEqual({ reason: "OUT_OF_RANGE" });
    expect(reason(far, at(7, 4)).params).toEqual({ reason: "OUT_OF_RANGE" });
    // 11: more than 6 HP.
    expect(reason(far, at(6, 3)).params).toEqual({ reason: "TARGET_HEALTHY" });
    expect(offeredV7(far, "MIND_CONTROL")).toEqual([]);
  });

  it("is offered for every legal target and only those", () => {
    const state = brainField([
      { seat: 1, role: "FIGHTER", at: at(6, 3), hp: 6 },
      { seat: 1, role: "MARKSMAN", at: at(5, 2), hp: 1 },
      { seat: 1, role: "GUARD", at: at(2, 1), hp: 6 },
      { seat: 1, role: "GUARD", at: at(6, 5), hp: 7 },
      { seat: 1, role: "RAIDER", at: at(7, 3), hp: 2 },
    ]);
    const offered = expectOfferedAcceptedV7(state, "MIND_CONTROL");
    expect(offered).toEqual(
      [at(5, 2), at(6, 3), at(2, 1)]
        .map((where) => control(state, BRAIN, where))
        .sort(
          (left, right) =>
            (left as { targetUnitId: number }).targetUnitId -
            (right as { targetUnitId: number }).targetUnitId,
        ),
    );
  });

  it("the cooldown: not on turns N + 1 and N + 2, again on N + 3", () => {
    let state = brainField([
      { seat: 1, role: "FIGHTER", at: at(6, 3), hp: 6 },
      { seat: 1, role: "FIGHTER", at: at(6, 1), hp: 6 },
      { seat: 1, role: "FIGHTER", at: at(1, 1) },
    ]);
    const martian = seatIdV7(state, 0);
    const other = seatIdV7(state, 1);
    const brain = idAt(state, BRAIN);
    const nextTurn = (current: GameStateV7) =>
      endTurnUntilV7(endTurnUntilV7(current, other).state, martian).state;
    state = playV7(state, control(state, BRAIN, at(6, 3))).state;
    // The cooldown is public on a visible Brain.
    expect(viewForV7(state, other).mindControlCooldowns).toEqual([
      { unitId: brain, turnsRemaining: 2 },
    ]);
    for (const remaining of [1, 0]) {
      state = nextTurn(state);
      expect(state.mindControlCooldowns).toEqual([
        { unitId: brain, turnsRemaining: remaining },
      ]);
      expect(rejectedV7(state, control(state, BRAIN, at(6, 1))).params).toEqual(
        { reason: "COOLDOWN" },
      );
    }
    state = nextTurn(state);
    expect(state.mindControlCooldowns).toEqual([]);
    // (The second victim recovered in the meantime; weaken it again.)
    state = patchUnitV7(state, at(6, 1), { hp: 6 });
    const again = playV7(state, control(state, BRAIN, at(6, 1)));
    expect(again.state.thralls).toHaveLength(2);
  });

  it("a mind-controlled Lich has left the board: its Plagues are cleared", () => {
    const base = brainField(
      [
        { seat: 0, role: "FIGHTER", at: at(3, 3) },
        { seat: 1, role: "CATAPULT", at: at(6, 3), hp: 5 },
      ],
      { factions: ["MARTIAN", "UNDEAD"] },
    );
    const lich = idAt(base, at(6, 3));
    const grunt = idAt(base, at(3, 3));
    const state = checkedV7({
      ...base,
      plagued: [{ unitId: grunt, sourceUnitId: lich, turnsRemaining: 3 }],
    });
    expect(
      previewMindControlV7(activeViewV7(state), idAt(state, BRAIN), lich)
        ?.plagueCleared,
    ).toEqual([grunt]);
    const run = playV7(state, control(state, BRAIN, at(6, 3)));
    expect(run.state.plagued).toEqual([]);
    expect(kindsV7(run.events)).toContain("PLAGUE_CLEARED");
    // The Thrall is a Grunt-statted FIGHTER: it lost every Undead ability.
    expect(unitAtV7(run.state, at(6, 3))).toMatchObject({
      role: "FIGHTER",
      hp: 5,
      maxHp: 10,
    });
  });

  it("a mind-controlled exploding unit does not explode, and nobody earns Plunder", () => {
    const state = brainField(
      [
        // A Bomb Chucker next to a Martian Grunt.
        { seat: 1, role: "MARKSMAN", at: at(6, 3), hp: 2 },
        { seat: 0, role: "FIGHTER", at: at(5, 3) },
        { seat: 1, role: "FIGHTER", at: at(1, 1) },
      ],
      { factions: ["MARTIAN", "GOBLIN"] },
    );
    const run = playV7(state, control(state, BRAIN, at(6, 3)));
    expect(kindsV7(run.events)).not.toContain("EXPLOSION_RESOLVED");
    expect(deaths(run.events)).toEqual([]);
    expect(unitAtV7(run.state, at(5, 3)).hp).toBe(10);
    expect(run.state.players.map((player) => player.coins)).toEqual(
      state.players.map((player) => player.coins),
    );
  });

  it("a one-slot dinosaur can be mind-controlled; an Egg, a T-Rex, and a Troll cannot", () => {
    const state = brainField(
      [
        { seat: 1, role: "RAIDER", at: at(6, 3), hp: 5 },
        { seat: 1, role: "GUARD", at: at(5, 2), hp: 6 },
        { seat: 1, role: "MARKSMAN", at: at(3, 2), hp: 4 },
      ],
      { factions: ["MARTIAN", "DINOSAUR"] },
    );
    expect(offeredV7(state, "MIND_CONTROL")).toHaveLength(3);
    const run = playV7(state, control(state, BRAIN, at(6, 3)));
    // The Thrall has the Grunt's maximum HP and no growth.
    expect(unitAtV7(run.state, at(6, 3))).toMatchObject({
      role: "FIGHTER",
      hp: 5,
      maxHp: 10,
      kills: 0,
    });
    const troll = brainField(
      [{ seat: 1, role: "JUGGERNAUT", at: at(6, 3), hp: 3 }],
      { factions: ["MARTIAN", "GOBLIN"] },
    );
    expect(rejectedV7(troll, control(troll, BRAIN, at(6, 3))).params).toEqual({
      reason: "TARGET_IMMUNE",
    });
  });

  it("a Thrall of another Martian seat is a legal target; a mind-controlled Brain's Thralls collapse", () => {
    const state = brainField(
      [
        { seat: 1, role: "CAPTAIN", at: at(6, 3), hp: 4 },
        { seat: 1, role: "FIGHTER", at: at(7, 3), thrallOf: at(6, 3), hp: 3 },
        { seat: 1, role: "FIGHTER", at: at(6, 2), thrallOf: at(6, 3), hp: 3 },
        { seat: 1, role: "FIGHTER", at: at(1, 1) },
      ],
      { factions: ["MARTIAN", "MARTIAN"] },
    );
    const enemyBrain = idAt(state, at(6, 3));
    const enemyThralls = [idAt(state, at(7, 3)), idAt(state, at(6, 2))].sort(
      (left, right) => left - right,
    );
    // Another seat's Thrall in range is a legal target.
    expect(offeredV7(state, "MIND_CONTROL")).toContainEqual(
      control(state, BRAIN, at(6, 2)),
    );
    const stolen = playV7(state, control(state, BRAIN, at(6, 2)));
    expect(stolen.state.thralls).toHaveLength(2);
    expect(unitAtV7(stolen.state, at(6, 2)).ownerId).toBe(seatIdV7(state, 0));
    // The enemy Brain itself: its Thralls collapse in unit-ID order.
    expect(
      previewMindControlV7(activeViewV7(state), idAt(state, BRAIN), enemyBrain)
        ?.collapsingUnitIds,
    ).toEqual(enemyThralls);
    const run = playV7(state, control(state, BRAIN, at(6, 3)));
    expect(kindsV7(run.events).slice(0, 3)).toEqual([
      "UNIT_MIND_CONTROLLED",
      "UNIT_DIED",
      "UNIT_DIED",
    ]);
    expect(deaths(run.events)).toEqual(
      enemyThralls.map((unitId) => ({ unitId, cause: "BRAIN_LOST" })),
    );
    expect(hasUnitAtV7(run.state, at(7, 3))).toBe(false);
    expect(hasUnitAtV7(run.state, at(6, 2))).toBe(false);
    expect(run.state.graves).toEqual(state.graves);
    expect(run.state.thralls).toEqual([
      {
        unitId: unitAtV7(run.state, at(6, 3)).id,
        brainUnitId: idAt(state, BRAIN),
      },
    ]);
    // The enemy Brain's cooldown and Shield ended with it.
    expect(run.state.mindControlCooldowns).toEqual([
      { unitId: idAt(state, BRAIN), turnsRemaining: 2 },
    ]);
  });

  it("is projected to the victim's owner and to a viewer that sees the tile", () => {
    const state = brainField([
      { seat: 1, role: "FIGHTER", at: at(6, 3), hp: 6 },
      FAR,
    ]);
    const run = playV7(state, control(state, BRAIN, at(6, 3)));
    for (const seat of [0, 1]) {
      const envelope = projectEventsV7(
        state,
        run.state,
        seatIdV7(state, seat),
        run.events,
      );
      expect(parsePlayerEventEnvelopeV7(envelope)).toEqual({
        ok: true,
        value: envelope,
      });
      expect(envelope.events).toContainEqual(run.events[0]);
    }
    // Even when it sees neither the Brain nor the tile.
    const blind = unexploreV7(state, 1, [BRAIN, at(6, 3)]);
    const hiddenRun = applyOkV7(
      blind,
      activeIdV7(blind),
      control(blind, BRAIN, at(6, 3)),
    );
    const envelope = projectEventsV7(
      blind,
      hiddenRun.state,
      seatIdV7(blind, 1),
      hiddenRun.events,
    );
    // The victim's owner always learns what happened to its unit.
    expect(
      envelope.events.filter((event) => event.kind === "UNIT_MIND_CONTROLLED"),
    ).toHaveLength(1);
  });
});

describe("Thralls (section 8.3)", () => {
  const thrallField = (
    more: readonly MartianPieceV7[] = [],
    options: MartianFieldOptionsV7 = {},
    thrall: Partial<MartianPieceV7> = {},
  ) =>
    brainField(
      [
        {
          seat: 0,
          role: "FIGHTER",
          at: at(5, 3),
          thrallOf: BRAIN,
          hp: 4,
          ...thrall,
        },
        ...more,
      ],
      options,
    );

  it("fights as a Grunt without a Shield", () => {
    const state = thrallField(
      [{ seat: 1, role: "FIGHTER", at: at(6, 3) }],
      {},
      {
        hp: 10,
      },
    );
    const grunt = martianFieldV7([
      { seat: 0, role: "FIGHTER", at: at(5, 3) },
      { seat: 1, role: "FIGHTER", at: at(6, 3) },
    ]);
    const thrallRun = attackV7(state, at(5, 3), at(6, 3));
    const gruntRun = attackV7(grunt, at(5, 3), at(6, 3));
    expect(thrallRun.combat.damageToDefender).toBe(
      gruntRun.combat.damageToDefender,
    );
    // The retaliation is the same hit, but nothing absorbs it.
    expect(thrallRun.combat.attackerShieldDamage).toBe(0);
    expect(thrallRun.combat.damageToAttacker).toBe(
      gruntRun.combat.damageToAttacker + gruntRun.combat.attackerShieldDamage,
    );
  });

  it("is never promoted and never disbanded", () => {
    const state = thrallField([FAR], {}, { kills: 5, hp: 10 });
    const thrall = idAt(state, at(5, 3));
    expect(rejectedV7(state, { kind: "PROMOTE", unitId: thrall }).code).toBe(
      "PROMOTION_NOT_ELIGIBLE",
    );
    expect(rejectedV7(state, { kind: "DISBAND", unitId: thrall })).toEqual({
      code: "DISBAND_NOT_LEGAL",
      params: { reason: "THRALL" },
    });
    expect(previewDisbandV7(state, seatIdV7(state, 0), thrall)).toBeNull();
    // A Grunt with the same kills is promoted and may Disband.
    const grunt = martianFieldV7([
      { seat: 0, role: "FIGHTER", at: at(5, 3), kills: 5 },
      FAR,
    ]);
    const kinds = offeredV7(grunt, "PROMOTE", "DISBAND").map(
      (command) => command.kind,
    );
    expect(kinds).toEqual(expect.arrayContaining(["PROMOTE", "DISBAND"]));
  });

  it("uses no slot, captures without being re-homed, and counts as an orphan", () => {
    const state = thrallField(
      [FAR],
      {},
      { at: at(5, 5), captureEligible: true, hp: 6 },
    );
    const thrall = unitAtV7(state, at(5, 5));
    const capital = cityOfV7(state, 0);
    // No slot in the capital: the Brain alone is counted.
    expect(previewCityCapacityV7(state, capital.id)).toMatchObject({
      assigned: 1,
    });
    const run = playV7(state, { kind: "CAPTURE", unitId: thrall.id });
    const village = run.state.cities.find((city) => sameV7(city.at, at(5, 5)));
    expect(village?.ownerId).toBe(thrall.ownerId);
    expect(unitAtV7(run.state, at(5, 5)).homeCityId).toBeNull();
    expect(run.state.thralls).toEqual(state.thralls);
  });

  it("collapses when its Brain is killed: after the Brain's death events, before the advance", () => {
    const state = thrallField(
      [
        { seat: 0, role: "FIGHTER", at: at(3, 3), thrallOf: BRAIN, hp: 2 },
        { seat: 1, role: "FIGHTER", at: at(4, 4) },
      ],
      { activeSeat: 1 },
      {},
    );
    const weakBrain = patchUnitV7(state, BRAIN, { hp: 1 });
    const stripped = checkedV7({
      ...weakBrain,
      shields: weakBrain.shields.filter(
        (entry) => entry.unitId !== idAt(weakBrain, BRAIN),
      ),
    });
    const brain = idAt(stripped, BRAIN);
    const thralls = [idAt(stripped, at(5, 3)), idAt(stripped, at(3, 3))].sort(
      (left, right) => left - right,
    );
    const run = attackV7(stripped, at(4, 4), BRAIN);
    expect(deaths(run.events)).toEqual([
      { unitId: brain, cause: "ATTACK" },
      ...thralls.map((unitId) => ({ unitId, cause: "BRAIN_LOST" })),
    ]);
    const kinds = kindsV7(run.events);
    expect(kinds.lastIndexOf("UNIT_DIED")).toBeLessThan(
      kinds.indexOf("UNIT_MOVED"),
    );
    expect(run.state.thralls).toEqual([]);
    expect(
      run.state.units.filter((unit) => unit.ownerId === seatIdV7(state, 0)),
    ).toEqual([]);
    // Collapses are removals: at most the Brain leaves a Grave; one kill.
    expect(run.state.graves.length).toBeLessThanOrEqual(
      state.graves.length + 1,
    );
    expect(run.attacker?.kills).toBe(1);
  });

  it("collapses when its Brain rises as a Zombie, and a Bitten Thrall that collapses does not rise", () => {
    const base = thrallField([{ seat: 1, role: "GUARD", at: at(4, 4) }], {
      activeSeat: 1,
      factions: ["MARTIAN", "UNDEAD"],
    });
    const weak = patchUnitV7(base, BRAIN, { hp: 1 });
    const zombie = unitAtV7(weak, at(4, 4));
    const thrall = idAt(weak, at(5, 3));
    const state = checkedV7({
      ...weak,
      shields: [],
      bitten: [
        {
          unitId: thrall,
          biterPlayerId: zombie.ownerId,
          biterUnitId: zombie.id,
        },
      ],
    });
    const run = attackV7(state, at(4, 4), BRAIN);
    expect(run.combat.defenderInfected).toBe(true);
    expect(
      deaths(run.events).filter((entry) => entry.cause === "BRAIN_LOST"),
    ).toEqual([{ unitId: thrall, cause: "BRAIN_LOST" }]);
    // The Brain's tile holds the new Zombie; the Thrall's tile is empty.
    expect(unitAtV7(run.state, BRAIN).ownerId).toBe(zombie.ownerId);
    expect(hasUnitAtV7(run.state, at(5, 3))).toBe(false);
    expect(run.state.thralls).toEqual([]);
    expect(run.state.bitten).toEqual([]);
  });

  it("collapses when its Brain is disbanded, and the Brain's owner is refunded for the Brain only", () => {
    const state = thrallField([FAR]);
    const brain = idAt(state, BRAIN);
    const thrall = idAt(state, at(5, 3));
    const before =
      state.players.find((player) => player.seat === 0)?.coins ?? 0;
    const run = playV7(state, { kind: "DISBAND", unitId: brain });
    expect(deaths(run.events)).toContainEqual({
      unitId: thrall,
      cause: "BRAIN_LOST",
    });
    expect(run.state.thralls).toEqual([]);
    expect(
      run.state.units.filter((unit) => unit.ownerId === seatIdV7(state, 0)),
    ).toEqual([]);
    expect(run.state.players.find((player) => player.seat === 0)?.coins).toBe(
      before + 2,
    );
  });

  it("collapses when its Brain dies to a Wail, a Kaboom, or Plague", () => {
    // A Banshee Wail (2) on a Brain at 1 HP without a Shield.
    const wail = thrallField(
      [{ seat: 1, role: "MARKSMAN", at: at(4, 4) }],
      { activeSeat: 1, factions: ["MARTIAN", "UNDEAD"] },
      { hp: 10 },
    );
    const wailState = checkedV7({
      ...patchUnitV7(wail, BRAIN, { hp: 1 }),
      shields: [],
    });
    const wailed = playV7(wailState, {
      kind: "WAIL",
      unitId: idAt(wailState, at(4, 4)),
    });
    expect(deaths(wailed.events).map((entry) => entry.cause)).toEqual([
      "WAIL",
      "BRAIN_LOST",
    ]);
    expect(wailed.state.thralls).toEqual([]);

    // A Goblin Kaboom (5).
    const boom = thrallField(
      [{ seat: 1, role: "FIGHTER", at: at(4, 4) }],
      { activeSeat: 1, factions: ["MARTIAN", "GOBLIN"] },
      { at: at(1, 4) },
    );
    const boomState = checkedV7({
      ...patchUnitV7(boom, BRAIN, { hp: 3 }),
      shields: [],
    });
    const kaboom = playV7(boomState, {
      kind: "KABOOM",
      unitId: idAt(boomState, at(4, 4)),
    });
    expect(deaths(kaboom.events).map((entry) => entry.cause)).toContain(
      "BRAIN_LOST",
    );
    expect(hasUnitAtV7(kaboom.state, at(1, 4))).toBe(false);

    // Plague at the Brain's owner's Start Turn.
    const plague = thrallField([{ seat: 1, role: "CATAPULT", at: at(1, 1) }], {
      activeSeat: 1,
      factions: ["MARTIAN", "UNDEAD"],
    });
    const plagueState = checkedV7({
      ...patchUnitV7(plague, BRAIN, { hp: 2 }),
      plagued: [
        {
          unitId: idAt(plague, BRAIN),
          sourceUnitId: idAt(plague, at(1, 1)),
          turnsRemaining: 3,
        },
      ],
    });
    const turn = endTurnUntilV7(plagueState, seatIdV7(plagueState, 0));
    expect(deaths(turn.events).map((entry) => entry.cause)).toEqual([
      "PLAGUE",
      "BRAIN_LOST",
    ]);
    expect(turn.state.thralls).toEqual([]);
  });

  it("keeps its link while its Brain is embarked, and embarked Brains use no ability", () => {
    const state = brainField(
      [
        { seat: 0, role: "FIGHTER", at: at(5, 3), thrallOf: BRAIN, hp: 4 },
        { seat: 1, role: "FIGHTER", at: at(6, 3), hp: 2 },
      ],
      { water: [BRAIN] },
      { form: "EMBARKED" },
    );
    expect(state.thralls).toHaveLength(1);
    expect(offeredV7(state, "MIND_CONTROL", "RALLY")).toEqual([]);
  });

  it("the view names a Thrall's Brain only when the viewer sees it", () => {
    const state = thrallField([FAR]);
    const thrall = idAt(state, at(5, 3));
    const brain = idAt(state, BRAIN);
    const other = seatIdV7(state, 1);
    expect(viewForV7(state, other).thralls).toEqual([
      { unitId: thrall, brainUnitId: brain },
    ]);
    const hidden = unexploreV7(state, 1, [BRAIN]);
    expect(viewForV7(hidden, other).thralls).toEqual([
      { unitId: thrall, brainUnitId: null },
    ]);
    expect(viewForV7(hidden, other).mindControlCooldowns).toEqual([]);
    const unseen = unexploreV7(state, 1, [BRAIN, at(5, 3)]);
    expect(viewForV7(unseen, other).thralls).toEqual([]);
  });

  it("rejects malformed Thrall and cooldown lists", () => {
    const state = martianFieldV7(
      [
        { seat: 0, role: "CAPTAIN", at: BRAIN },
        { seat: 0, role: "FIGHTER", at: at(5, 3), thrallOf: BRAIN, hp: 4 },
        { seat: 0, role: "FIGHTER", at: at(3, 3) },
        { seat: 0, role: "MARKSMAN", at: at(3, 4) },
        { seat: 0, role: "CAPTAIN", at: at(6, 6) },
        { seat: 1, role: "CAPTAIN", at: at(1, 1) },
        { seat: 1, role: "FIGHTER", at: at(1, 2) },
      ],
      { factions: ["MARTIAN", "MARTIAN"] },
    );
    const brain = idAt(state, BRAIN);
    const thrall = idAt(state, at(5, 3));
    const grunt = idAt(state, at(3, 3));
    const parse = (patch: Partial<Record<keyof GameStateV7, unknown>>) =>
      parseGameStateV7(JSON.parse(JSON.stringify({ ...state, ...patch })));
    expect(parse({})).not.toBeNull();
    const homeless = (unitId: UnitId, change: Partial<UnitStateV7> = {}) =>
      state.units.map((unit) =>
        unit.id === unitId ? { ...unit, homeCityId: null, ...change } : unit,
      );
    const withoutShield = (unitId: UnitId) =>
      state.shields.filter((entry) => entry.unitId !== unitId);
    const twoThralls = {
      units: homeless(grunt),
      shields: withoutShield(grunt),
      thralls: [
        { unitId: thrall, brainUnitId: brain },
        { unitId: grunt, brainUnitId: brain },
      ].sort((left, right) => left.unitId - right.unitId),
    };
    expect(parse(twoThralls)).not.toBeNull();
    const bad: readonly Partial<Record<keyof GameStateV7, unknown>>[] = [
      // an entry without a living unit, or without a living Brain
      { thralls: [{ unitId: 9999, brainUnitId: brain }] },
      { thralls: [{ unitId: thrall, brainUnitId: 9999 }] },
      // the Brain is not a unit with Mind Control, or belongs to another owner
      { thralls: [{ unitId: thrall, brainUnitId: grunt }] },
      { thralls: [{ unitId: thrall, brainUnitId: idAt(state, at(1, 1)) }] },
      // duplicate and unsorted entries
      {
        thralls: [
          { unitId: thrall, brainUnitId: brain },
          { unitId: thrall, brainUnitId: brain },
        ],
      },
      { ...twoThralls, thralls: [...twoThralls.thralls].reverse() },
      // a Thrall with a home, a Shield, the veteran flag, another role or form
      {
        units: state.units.map((unit) =>
          unit.id === thrall
            ? { ...unit, homeCityId: cityOfV7(state, 0).id }
            : unit,
        ),
      },
      {
        shields: [...state.shields, { unitId: thrall, shield: 1 }].sort(
          (left, right) => left.unitId - right.unitId,
        ),
      },
      { units: homeless(thrall, { veteran: true, maxHp: 15 }) },
      { units: homeless(thrall, { maxHp: 15 }) },
      {
        units: homeless(idAt(state, at(3, 4))),
        shields: withoutShield(idAt(state, at(3, 4))),
        thralls: [
          { unitId: thrall, brainUnitId: brain },
          { unitId: idAt(state, at(3, 4)), brainUnitId: brain },
        ].sort((left, right) => left.unitId - right.unitId),
      },
      // extra keys, wrong types
      { thralls: [{ unitId: thrall, brainUnitId: brain, extra: 1 }] },
      { thralls: "none" },
      // cooldowns: no unit, not a Brain, out of range, duplicate, unsorted
      { mindControlCooldowns: [{ unitId: 9999, turnsRemaining: 1 }] },
      { mindControlCooldowns: [{ unitId: grunt, turnsRemaining: 1 }] },
      { mindControlCooldowns: [{ unitId: brain, turnsRemaining: 3 }] },
      { mindControlCooldowns: [{ unitId: brain, turnsRemaining: -1 }] },
      { mindControlCooldowns: [{ unitId: brain, turnsRemaining: 1.5 }] },
      {
        mindControlCooldowns: [
          { unitId: brain, turnsRemaining: 1 },
          { unitId: brain, turnsRemaining: 1 },
        ],
      },
      {
        mindControlCooldowns: [
          { unitId: idAt(state, at(6, 6)), turnsRemaining: 1 },
          { unitId: brain, turnsRemaining: 1 },
        ],
      },
    ];
    for (const patch of bad)
      expect(parse(patch), JSON.stringify(patch).slice(0, 160)).toBeNull();
    expect(
      parse({
        mindControlCooldowns: [
          { unitId: brain, turnsRemaining: 0 },
          { unitId: idAt(state, at(6, 6)), turnsRemaining: 2 },
        ],
      }),
    ).not.toBeNull();
    // More than two Thralls for one Brain.
    const three = martianFieldV7([
      { seat: 0, role: "CAPTAIN", at: BRAIN },
      { seat: 0, role: "FIGHTER", at: at(5, 3), thrallOf: BRAIN, hp: 4 },
      { seat: 0, role: "FIGHTER", at: at(3, 3), thrallOf: BRAIN, hp: 4 },
      { seat: 0, role: "FIGHTER", at: at(3, 4) },
      FAR,
    ]);
    const third = idAt(three, at(3, 4));
    expect(
      parseGameStateV7(
        JSON.parse(
          JSON.stringify({
            ...three,
            units: three.units.map((unit) =>
              unit.id === third ? { ...unit, homeCityId: null } : unit,
            ),
            shields: three.shields.filter((entry) => entry.unitId !== third),
            thralls: [
              ...three.thralls,
              { unitId: third, brainUnitId: idAt(three, BRAIN) },
            ].sort((left, right) => left.unitId - right.unitId),
          }),
        ),
      ),
    ).toBeNull();
  });

  it("rejects any Thrall, Cooling, or cooldown entry in a match without a Martian seat", () => {
    const state = martianFieldV7(
      [
        { seat: 0, role: "CAPTAIN", at: BRAIN },
        { seat: 0, role: "FIGHTER", at: at(5, 3) },
        { seat: 0, role: "MARKSMAN", at: at(3, 3) },
        FAR,
      ],
      { factions: ["ORIGINAL", "ORIGINAL"] },
    );
    const parse = (patch: Partial<Record<keyof GameStateV7, unknown>>) =>
      parseGameStateV7(JSON.parse(JSON.stringify({ ...state, ...patch })));
    expect(parse({})).not.toBeNull();
    expect(
      parse({
        units: state.units.map((unit) =>
          sameV7(unit.at, at(5, 3)) ? { ...unit, homeCityId: null } : unit,
        ),
        thralls: [
          { unitId: idAt(state, at(5, 3)), brainUnitId: idAt(state, BRAIN) },
        ],
      }),
    ).toBeNull();
    expect(
      parse({
        cooling: [{ unitId: idAt(state, at(3, 3)), firedThisTurn: false }],
      }),
    ).toBeNull();
    expect(
      parse({
        mindControlCooldowns: [
          { unitId: idAt(state, BRAIN), turnsRemaining: 1 },
        ],
      }),
    ).toBeNull();
  });
});

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
      });
      // No damage; the target keeps everything but its capture eligibility.
      expect(unitAtV7(run.state, to), label).toEqual({
        ...victim,
        at: to,
        captureEligible: false,
      });
      expect(unitAtV7(run.state, SHIP).activation.handled, label).toBe(true);
    }
  });

  it("rejects an actor that cannot use it, in order", () => {
    const target: MartianPieceV7 = { seat: 1, role: "GUARD", at: at(6, 2) };
    const role = martianFieldV7([
      { seat: 0, role: "RAIDER", at: SHIP },
      target,
    ]);
    expect(rejectedV7(role, pull(role, SHIP, at(6, 2)))).toEqual({
      code: "UNIT_ROLE_INVALID",
      params: { role: "RAIDER" },
    });
    const acted = shipField(
      [target],
      {},
      {
        activation: { attacked: true, attacksUsed: 1 },
      },
    );
    expect(rejectedV7(acted, pull(acted, SHIP, at(6, 2))).code).toBe(
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
        // Distance 1 and 3.
        { seat: 1, role: "FIGHTER", at: at(5, 3) },
        { seat: 1, role: "FIGHTER", at: at(7, 2) },
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
    for (const where of [at(5, 3), at(7, 2)])
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
    expect(fortificationLevelForUnitV7(state, guard)).toBe(3);
    expect(
      previewTractorBeamV7(
        activeViewV7(state),
        idAt(state, at(6, 8)),
        guard.id,
      ),
    ).toMatchObject({
      from: at(8, 8),
      to: at(7, 8),
      fortificationLost: 3,
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
    // The Ray Gunner then kills it at range 2: the blast (2) reaches the
    // Mothership next to it, whose Shield absorbs it.
    const shot = attackV7(run.state, at(7, 3), at(5, 2));
    expect(shot.combat.defenderDies).toBe(true);
    expect(shieldAtV7(shot.state, SHIP)).toBe(2);
    expect(unitAtV7(shot.state, SHIP).hp).toBe(16);
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
