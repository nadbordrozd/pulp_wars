import { describe, expect, it } from "vitest";
import {
  BEAM_DOWN_PICKUP_RANGE_V7,
  FACTION_IDS_V7,
  HEAVY_TRACTOR_PULL_V7,
  HEAVY_TRACTOR_RANGE_V7,
  NEUTRAL_OWNER_ID_V7,
  PROMOTION_HP_V7,
  SNOW_COVER_V7,
  TERRAIN_COVER_V7,
  TRACTOR_BEAM_PULL_V7,
  TRACTOR_BEAM_RANGE_V7,
  UNIT_ROLE_IDS_V7,
  applyCommandV7,
  coverBonusV7,
  defenseBonusForUnitV7,
  effectiveRoleRuleV7,
  parseGameStateV7,
  previewBeamDownV7,
  previewTractorBeamV7,
  publicUnitStatsV7,
  queryCombatPreviewV7,
  queryTractorBeamPathV7,
  roleMechanicsV7,
  tractorBeamPathV7,
  tractorBeamRuleV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type GameStateV7,
  type UnitId,
} from "../../src/engine/index";
import { checkedV7 } from "../fixtures/v7-builders";
import {
  applyOkV7,
  endTurnUntilV7,
  seatIdV7,
  unitAtV7,
} from "../fixtures/v7-goblin-arena";
import { iceFieldV7, offeredForV7 } from "../fixtures/v7-ice-folk";
import {
  activeViewV7,
  expectOfferedAcceptedV7,
  hasUnitAtV7,
  martianFieldV7,
  offeredV7,
  playV7,
  rejectedV7,
  type MartianPieceV7,
} from "../fixtures/v7-martian";
import { monsterArenaV7 } from "../fixtures/v7-monster-arena";
import {
  activeIdV7,
  at,
  attackV7,
  fieldDefenseV7,
  forestV7,
  movedV7,
  unexploreV7,
  withoutTechsV7,
} from "../fixtures/v7-revision20";

// The Martian and Ice Folk balance round (`pulp_wars-1wy.3`,
// docs/product/RULESET_7_BALANCE_MARTIAN_ICE.md): M1 Beam Down freed, M2 the
// Tractor Beam on the Saucer, M3 the Mothership as a carrier with the free
// Heavy Tractor Beam, M4 the Grunt's gun and body, I1 Glide from Snow onto
// Snow, and I2 Snow cover x 1.25. The field: an 11 x 11 board, seat 0
// capital (8, 8) with territory x 7-9, y 7-9, seat 1 capital (2, 8) with
// territory x 1-3, y 7-9, villages (5, 5), (8, 5), and (5, 8), open Grass
// elsewhere.

const CAPITAL = at(8, 8);
const FAR: MartianPieceV7 = { seat: 1, role: "FIGHTER", at: at(0, 0) };

const idAt = (state: GameStateV7, where: CoordV7): UnitId =>
  unitAtV7(state, where).id;

const beam = (
  state: GameStateV7,
  carrier: CoordV7,
  passenger: CoordV7,
  to: CoordV7,
): CommandV7 => ({
  kind: "BEAM_DOWN",
  unitId: idAt(state, carrier),
  passengerUnitId: idAt(state, passenger),
  to,
});

const pull = (
  state: GameStateV7,
  puller: CoordV7,
  target: CoordV7,
): CommandV7 => ({
  kind: "TRACTOR_BEAM",
  unitId: idAt(state, puller),
  targetUnitId: idAt(state, target),
});

const offeredFor = (
  state: GameStateV7,
  where: CoordV7,
  ...kinds: CommandV7["kind"][]
): readonly CommandV7[] => {
  const id = idAt(state, where);
  return offeredV7(state, ...kinds).filter(
    (command) => "unitId" in command && command.unitId === id,
  );
};

const distance = (left: CoordV7, right: CoordV7): number =>
  Math.max(Math.abs(left.x - right.x), Math.abs(left.y - right.y));

// ---------------------------------------------------------------------------
// The registry
// ---------------------------------------------------------------------------

describe("the balance registry (section 10)", () => {
  it("the constants", () => {
    expect([
      BEAM_DOWN_PICKUP_RANGE_V7,
      TRACTOR_BEAM_RANGE_V7,
      TRACTOR_BEAM_PULL_V7,
      HEAVY_TRACTOR_RANGE_V7,
      HEAVY_TRACTOR_PULL_V7,
    ]).toEqual([2, 2, 1, 3, 2]);
    expect(SNOW_COVER_V7).toEqual({ numerator: 5, denominator: 4 });
    expect(TERRAIN_COVER_V7).toEqual({ numerator: 3, denominator: 2 });
    // The terrain's cover wins on a snowy Forest or Mountain; never added.
    expect(coverBonusV7(true, true)).toBe(TERRAIN_COVER_V7);
    expect(coverBonusV7(false, true)).toBe(SNOW_COVER_V7);
    expect(coverBonusV7(false, false)).toEqual({
      numerator: 1,
      denominator: 1,
    });
  });

  it("M2 to M4: the Saucer pulls at Scouting, the Mothership is an 8-Coin carrier, the Grunt has Attack 2 and 8 HP", () => {
    const saucer = effectiveRoleRuleV7("RAIDER", "MARTIAN");
    expect(saucer.technology).toBe("SCOUTING");
    // Any unit can capture (`pulp_wars-ke95`).
    expect(saucer.abilities).toEqual([
      "ATTACK",
      "CAPTURE",
      "CHARGE",
      "FLY",
      "BEAM_DOWN",
      "TRACTOR_BEAM",
    ]);
    expect([saucer.cost, saucer.maxHp, saucer.attack2, saucer.move]).toEqual([
      4, 8, 3, 3,
    ]);
    const mothership = effectiveRoleRuleV7("KNIGHT", "MARTIAN");
    expect(mothership.cost).toBe(8);
    expect(mothership.abilities).toEqual([
      "ATTACK",
      "CAPTURE",
      "FLY",
      "BEAM_DOWN",
      "TRACTOR_BEAM",
    ]);
    expect(roleMechanicsV7("KNIGHT", "MARTIAN").capacitySlots).toBe(2);
    const grunt = effectiveRoleRuleV7("FIGHTER", "MARTIAN");
    // 8 HP since `pulp_wars-1wy.6` (the first step of the fallback ladder;
    // 9 at the balance round, 10 before it).
    expect([grunt.cost, grunt.attack2, grunt.maxHp, grunt.defense2]).toEqual([
      3, 4, 8, 3,
    ]);
    expect([grunt.move, grunt.minimumRange, grunt.range]).toEqual([1, 1, 2]);
    expect(roleMechanicsV7("FIGHTER", "MARTIAN").shield).toBe(2);
  });

  it("only the Mothership's Tractor Beam is Heavy; no other faction has either rule", () => {
    for (const faction of FACTION_IDS_V7)
      for (const role of UNIT_ROLE_IDS_V7)
        expect(
          roleMechanicsV7(role, faction).heavyTractorBeam,
          `${faction} ${role}`,
        ).toBe(faction === "MARTIAN" && role === "KNIGHT");
    const state = martianFieldV7([
      { seat: 0, role: "RAIDER", at: at(4, 2) },
      { seat: 0, role: "KNIGHT", at: at(4, 5) },
      { seat: 0, role: "CATAPULT", at: at(1, 1) },
      FAR,
    ]);
    expect(tractorBeamRuleV7(state, unitAtV7(state, at(4, 2)))).toEqual({
      minimumRange: 2,
      maximumRange: 2,
      pull: 1,
      free: false,
    });
    expect(tractorBeamRuleV7(state, unitAtV7(state, at(4, 5)))).toEqual({
      minimumRange: 2,
      maximumRange: 3,
      pull: 2,
      free: true,
    });
    expect(tractorBeamRuleV7(state, unitAtV7(state, at(1, 1)))).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// M1: Beam Down, freed
// ---------------------------------------------------------------------------

describe("M1: Beam Down, freed (section 5.1)", () => {
  it("a Saucer that flew beams a city unit, which shoots at full Attack on arrival but cannot move", () => {
    const state = martianFieldV7([
      { seat: 0, role: "RAIDER", at: at(4, 3), activation: movedV7(3) },
      { seat: 0, role: "FIGHTER", at: CAPITAL },
      { seat: 1, role: "FIGHTER", at: at(7, 3) },
      FAR,
    ]);
    const grunt = unitAtV7(state, CAPITAL);
    const run = playV7(state, beam(state, at(4, 3), CAPITAL, at(5, 3)));
    expect(unitAtV7(run.state, at(5, 3))).toEqual({
      ...grunt,
      at: at(5, 3),
      captureEligible: false,
      activation: { ...grunt.activation, moved: true, handled: true },
    });
    expect(run.state.beamedThisTurn).toEqual([grunt.id]);
    // It may attack (range 2) but not Move.
    expect(
      offeredFor(run.state, at(5, 3)).map((command) => command.kind),
    ).toEqual(["ATTACK", "DISBAND"]);
    // A Grunt's shot on a Fighter from two tiles: 5, no retaliation.
    const shot = attackV7(run.state, at(5, 3), at(7, 3));
    expect(shot.combat).toMatchObject({
      damageToDefender: 5,
      retaliation: false,
      rayPower: "NONE",
    });
  });

  it("a wounded passenger cannot Recover after the beam, and a capture-eligible one loses the capture", () => {
    const state = martianFieldV7([
      { seat: 0, role: "RAIDER", at: at(4, 3) },
      {
        seat: 0,
        role: "FIGHTER",
        at: CAPITAL,
        hp: 4,
        captureEligible: true,
      },
      FAR,
    ]);
    expect(
      offeredFor(state, CAPITAL, "RECOVER", "MOVE").map((c) => c.kind),
    ).toContain("RECOVER");
    const run = playV7(state, beam(state, at(4, 3), CAPITAL, at(5, 3)));
    expect(
      offeredFor(run.state, at(5, 3), "RECOVER", "MOVE", "CAPTURE"),
    ).toEqual([]);
    expect(unitAtV7(run.state, at(5, 3))).toMatchObject({
      hp: 4,
      captureEligible: false,
    });
  });

  it("picks up an own unit within two tiles of the carrier, anywhere, and only relocates one that has acted", () => {
    const fired = { attacked: true, attacksUsed: 1, handled: true };
    const state = martianFieldV7([
      { seat: 0, role: "RAIDER", at: at(4, 3) },
      // Two tiles away, far from every city, and it has fired.
      { seat: 0, role: "FIGHTER", at: at(6, 1), activation: fired },
      // Three tiles away: not a passenger.
      { seat: 0, role: "FIGHTER", at: at(7, 3) },
      // Two tiles away but a flyer, a two-slot unit, and an enemy: never.
      { seat: 0, role: "RAIDER", at: at(2, 1) },
      { seat: 0, role: "JUGGERNAUT", at: at(2, 5) },
      { seat: 1, role: "FIGHTER", at: at(6, 5) },
      FAR,
    ]);
    const saucer = idAt(state, at(4, 3));
    expect([
      ...new Set(
        offeredFor(state, at(4, 3), "BEAM_DOWN").flatMap((command) =>
          command.kind === "BEAM_DOWN" ? [command.passengerUnitId] : [],
        ),
      ),
    ]).toEqual([idAt(state, at(6, 1))]);
    for (const where of [at(7, 3), at(2, 1), at(2, 5), at(6, 5)]) {
      expect(
        rejectedV7(state, beam(state, at(4, 3), where, at(5, 3))),
        `${where.x},${where.y}`,
      ).toEqual({
        code: "BEAM_DOWN_NOT_LEGAL",
        params: { reason: "NO_PASSENGER" },
      });
      expect(
        previewBeamDownV7(activeViewV7(state), saucer, idAt(state, where)),
      ).toBeNull();
    }
    // Extraction: the Grunt that fired is set down on the far side.
    const before = unitAtV7(state, at(6, 1));
    const run = playV7(state, beam(state, at(4, 3), at(6, 1), at(3, 4)));
    expect(run.events[0]).toMatchObject({
      kind: "UNIT_BEAMED",
      from: at(6, 1),
      to: at(3, 4),
    });
    expect(unitAtV7(run.state, at(3, 4)).activation).toEqual({
      ...before.activation,
      moved: true,
    });
    expect(offeredFor(run.state, at(3, 4), "ATTACK", "MOVE")).toEqual([]);
    expectOfferedAcceptedV7(state, "BEAM_DOWN");
  });

  it("a unit is beamed once per turn: no chain teleport, and again on the next turn", () => {
    const state = martianFieldV7([
      { seat: 0, role: "RAIDER", at: at(4, 3) },
      { seat: 0, role: "RAIDER", at: at(6, 4) },
      { seat: 0, role: "FIGHTER", at: CAPITAL },
      FAR,
    ]);
    const first = playV7(state, beam(state, at(4, 3), CAPITAL, at(5, 3)));
    // The second Saucer stands next to the beamed Grunt and may not take it.
    expect(
      rejectedV7(first.state, beam(first.state, at(6, 4), at(5, 3), at(7, 4))),
    ).toEqual({
      code: "BEAM_DOWN_NOT_LEGAL",
      params: { reason: "NO_PASSENGER" },
    });
    expect(offeredFor(first.state, at(6, 4), "BEAM_DOWN")).toEqual([]);
    // The fact is public on the unit and ends with the owner's turn.
    const rival = viewForV7(first.state, seatIdV7(first.state, 1));
    expect(rival.beamedThisTurn).toEqual(first.state.beamedThisTurn);
    const ended = applyOkV7(first.state, activeIdV7(first.state), {
      kind: "END_TURN",
    });
    expect(ended.state.beamedThisTurn).toEqual([]);
    const next = endTurnUntilV7(ended.state, activeIdV7(state)).state;
    playV7(next, beam(next, at(6, 4), at(5, 3), at(7, 4)));
  });

  it("a beamed ray unit fires at half power (no alpha strike), and an unmoved one at full power", () => {
    const build = (role: "MARKSMAN" | "CATAPULT") =>
      martianFieldV7([
        { seat: 0, role: "RAIDER", at: at(4, 3) },
        { seat: 0, role, at: CAPITAL },
        { seat: 1, role: "FIGHTER", at: at(7, 3) },
        { seat: 1, role: "FIGHTER", at: at(8, 3) },
        FAR,
      ]);
    for (const [role, half, full] of [
      // A Ray Gunner: 3 at half power, 8 at full.
      ["MARKSMAN", 3, 8],
      // A Tripod: 5 at half power, 12 at full (Pierce follows the hit).
      ["CATAPULT", 5, 12],
    ] as const) {
      const state = build(role);
      const run = playV7(state, beam(state, at(4, 3), CAPITAL, at(5, 3)));
      const view = activeViewV7(run.state);
      const preview = queryCombatPreviewV7(
        view,
        idAt(run.state, at(5, 3)),
        idAt(run.state, at(7, 3)),
      );
      expect(preview, role).toMatchObject({
        rayPower: "HALF",
        coolingApplied: false,
        damageToDefender: half,
      });
      const shot = attackV7(run.state, at(5, 3), at(7, 3));
      expect(shot.combat.damageToDefender, role).toBe(half);
      // The same unit standing there unmoved fires at full power.
      const stood = martianFieldV7([
        { seat: 0, role, at: at(5, 3) },
        { seat: 1, role: "FIGHTER", at: at(7, 3) },
        { seat: 1, role: "FIGHTER", at: at(8, 3) },
        FAR,
      ]);
      expect(attackV7(stood, at(5, 3), at(7, 3)).combat, role).toMatchObject({
        rayPower: "FULL",
        damageToDefender: full,
      });
    }
  });

  it("a beamed Brain may use Mind Control; a beamed Shield Projector cannot attack", () => {
    const brain = martianFieldV7([
      { seat: 0, role: "RAIDER", at: at(4, 3) },
      { seat: 0, role: "CAPTAIN", at: CAPITAL },
      { seat: 1, role: "FIGHTER", at: at(7, 3), hp: 5 },
      FAR,
    ]);
    const taken = playV7(brain, beam(brain, at(4, 3), CAPITAL, at(5, 3)));
    const control: CommandV7 = {
      kind: "MIND_CONTROL",
      unitId: idAt(taken.state, at(5, 3)),
      targetUnitId: idAt(taken.state, at(7, 3)),
    };
    expect(offeredV7(taken.state, "MIND_CONTROL")).toEqual([control]);
    playV7(taken.state, control);
    const projector = martianFieldV7([
      { seat: 0, role: "RAIDER", at: at(4, 3) },
      { seat: 0, role: "GUARD", at: CAPITAL },
      { seat: 1, role: "FIGHTER", at: at(6, 3) },
      FAR,
    ]);
    const set = playV7(projector, beam(projector, at(4, 3), CAPITAL, at(5, 3)));
    expect(offeredFor(set.state, at(5, 3), "ATTACK")).toEqual([]);
    expect(
      applyCommandV7(set.state, activeIdV7(set.state), {
        kind: "ATTACK",
        unitId: idAt(set.state, at(5, 3)),
        targetUnitId: idAt(set.state, at(6, 3)),
      }).accepted,
    ).toBe(false);
  });

  it("the Mothership is a carrier: Beam Down is its primary action, after its Move too", () => {
    const state = martianFieldV7([
      { seat: 0, role: "KNIGHT", at: at(4, 3), activation: movedV7(2) },
      { seat: 0, role: "FIGHTER", at: CAPITAL },
      { seat: 1, role: "FIGHTER", at: at(7, 3) },
      FAR,
    ]);
    const ship = unitAtV7(state, at(4, 3));
    expect(
      previewBeamDownV7(activeViewV7(state), ship.id, idAt(state, CAPITAL))
        ?.destinations,
    ).toHaveLength(8);
    const run = playV7(state, beam(state, at(4, 3), CAPITAL, at(5, 3)));
    expect(run.events[0]).toMatchObject({
      kind: "UNIT_BEAMED",
      unitId: ship.id,
    });
    expect(unitAtV7(run.state, at(4, 3)).activation).toMatchObject({
      specialActed: true,
      handled: true,
    });
    // Its primary action is spent; its free pull is not.
    expect(
      offeredFor(run.state, at(4, 3)).map((command) => command.kind),
    ).toEqual(["TRACTOR_BEAM"]);
    // A Mothership that attacked cannot beam.
    const attacked = martianFieldV7([
      {
        seat: 0,
        role: "KNIGHT",
        at: at(4, 3),
        activation: { attacked: true, attacksUsed: 1, handled: true },
      },
      { seat: 0, role: "FIGHTER", at: CAPITAL },
      FAR,
    ]);
    expect(
      rejectedV7(attacked, beam(attacked, at(4, 3), CAPITAL, at(5, 3))).code,
    ).toBe("UNIT_ALREADY_ACTED");
  });

  it("a Frozen carrier cannot beam or pull, moved or not; a thawed one can (Ice Folk Freeze, `pulp_wars-w49.37`)", () => {
    const build = (moved: boolean, frozen = true) =>
      iceFieldV7(
        [
          {
            seat: 0,
            role: "RAIDER",
            at: at(4, 3),
            ...(frozen ? { frozen: { turnsLeft: 1 as const } } : {}),
            ...(moved ? { activation: movedV7(1) } : {}),
          },
          {
            seat: 0,
            role: "KNIGHT",
            at: at(4, 6),
            ...(frozen ? { frozen: { turnsLeft: 1 as const } } : {}),
            ...(moved ? { activation: movedV7(1) } : {}),
          },
          { seat: 0, role: "FIGHTER", at: CAPITAL },
          { seat: 1, role: "FIGHTER", at: at(6, 3) },
          { seat: 1, role: "FIGHTER", at: at(7, 6) },
          FAR,
        ],
        { factions: ["MARTIAN", "ICE_FOLK"] },
      );
    for (const moved of [build(true), build(false)]) {
      expect(offeredV7(moved, "BEAM_DOWN", "TRACTOR_BEAM")).toEqual([]);
      expect(
        rejectedV7(moved, beam(moved, at(4, 3), CAPITAL, at(5, 3))).code,
      ).toBe("UNIT_FROZEN");
      expect(rejectedV7(moved, pull(moved, at(4, 3), at(6, 3))).code).toBe(
        "UNIT_FROZEN",
      );
      expect(rejectedV7(moved, pull(moved, at(4, 6), at(7, 6))).code).toBe(
        "UNIT_FROZEN",
      );
    }
    // Not Frozen, a carrier that moved still beams and pulls.
    const warm = build(true, false);
    playV7(warm, beam(warm, at(4, 3), CAPITAL, at(5, 3)));
    playV7(warm, pull(warm, at(4, 3), at(6, 3)));
    playV7(warm, pull(warm, at(4, 6), at(7, 6)));
  });

  it("Mind Control: a controlled unit with a pending Escape is a passenger and cannot Move again", () => {
    const state = martianFieldV7([
      { seat: 0, role: "RAIDER", at: at(4, 3) },
      { seat: 0, role: "CAPTAIN", at: at(9, 9) },
      {
        seat: 1,
        role: "RAIDER",
        at: at(5, 2),
        controlledBy: at(9, 9),
        activation: { attacked: true, attacksUsed: 1, escapeAvailable: true },
      },
      FAR,
    ]);
    expect(offeredFor(state, at(5, 2), "MOVE").length).toBeGreaterThan(0);
    const run = playV7(state, beam(state, at(4, 3), at(5, 2), at(3, 4)));
    expect(unitAtV7(run.state, at(3, 4)).activation).toMatchObject({
      moved: true,
      attacked: true,
      escapeAvailable: false,
      handled: true,
    });
    expect(offeredFor(run.state, at(3, 4), "MOVE", "ATTACK")).toEqual([]);
    expect(run.state.mindControlled).toEqual(state.mindControlled);
  });

  it("Mind Control: a beamed controlled unit released in the same turn leaves the per-turn list", () => {
    const state = martianFieldV7([
      { seat: 0, role: "RAIDER", at: at(4, 3) },
      // A Brain at 1 HP next to a Fighter: its attack costs it its life.
      { seat: 0, role: "CAPTAIN", at: at(8, 2), hp: 1 },
      { seat: 1, role: "FIGHTER", at: at(9, 2) },
      { seat: 1, role: "FIGHTER", at: at(5, 2), controlledBy: at(8, 2), hp: 4 },
      FAR,
    ]);
    const controlled = unitAtV7(state, at(5, 2));
    const beamed = playV7(state, beam(state, at(4, 3), at(5, 2), at(3, 4)));
    expect(beamed.state.beamedThisTurn).toEqual([controlled.id]);
    const lost = attackV7(beamed.state, at(8, 2), at(9, 2));
    expect(lost.combat.attackerDies).toBe(true);
    // Released to its owner where it was set down; the entry is dropped
    // (the list names only the active player's units).
    expect(unitAtV7(lost.state, at(3, 4))).toMatchObject({
      id: controlled.id,
      ownerId: seatIdV7(state, 1),
    });
    expect(lost.state.mindControlled).toEqual([]);
    expect(lost.state.beamedThisTurn).toEqual([]);
  });

  it("every offered Beam Down is accepted and its preview lists exactly the offered tiles", () => {
    const base = martianFieldV7(
      [
        { seat: 0, role: "RAIDER", at: at(6, 6), activation: movedV7(2) },
        { seat: 0, role: "KNIGHT", at: at(4, 6) },
        { seat: 0, role: "FIGHTER", at: CAPITAL },
        { seat: 0, role: "MARKSMAN", at: at(7, 7) },
        { seat: 0, role: "CATAPULT", at: at(5, 4) },
        { seat: 0, role: "GUARD", at: at(3, 5) },
        { seat: 1, role: "GUARD", at: at(5, 6) },
        { seat: 1, role: "FIGHTER", at: at(6, 4) },
        FAR,
      ],
      { water: [at(3, 6), at(7, 5)] },
    );
    const state = checkedV7({ ...base, treasureChests: [at(5, 7)] });
    const offered = expectOfferedAcceptedV7(state, "BEAM_DOWN");
    expect(offered.length).toBeGreaterThan(10);
    const view = activeViewV7(state);
    const pairs = new Map<string, CoordV7[]>();
    for (const command of offered) {
      if (command.kind !== "BEAM_DOWN") continue;
      const key = `${command.unitId}:${command.passengerUnitId}`;
      pairs.set(key, [...(pairs.get(key) ?? []), command.to]);
    }
    // Both carriers carry; the Tripod (within two of each) is a passenger.
    expect(
      new Set(
        offered.map((command) => ("unitId" in command ? command.unitId : 0)),
      ).size,
    ).toBe(2);
    for (const [key, tiles] of pairs) {
      const [carrier, passenger] = key.split(":").map(Number) as [
        UnitId,
        UnitId,
      ];
      expect(previewBeamDownV7(view, carrier, passenger)?.destinations).toEqual(
        tiles,
      );
    }
    // Never onto a unit, water, a chest, or a village; a Tripod strides
    // nowhere it could not stand (no Rift on this board).
    for (const command of offered) {
      if (command.kind !== "BEAM_DOWN") continue;
      expect(hasUnitAtV7(state, command.to)).toBe(false);
      expect([at(3, 6), at(7, 5), at(5, 7), at(5, 5)]).not.toContainEqual(
        command.to,
      );
    }
  });

  it("state parsing: the per-turn lists name only the active player's units, in a match with a Martian seat", () => {
    const state = martianFieldV7([
      { seat: 0, role: "RAIDER", at: at(4, 3) },
      { seat: 0, role: "KNIGHT", at: at(4, 6) },
      { seat: 0, role: "FIGHTER", at: CAPITAL },
      FAR,
    ]);
    const saucer = idAt(state, at(4, 3));
    const ship = idAt(state, at(4, 6));
    const grunt = idAt(state, CAPITAL);
    const rival = idAt(state, at(0, 0));
    const valid = {
      ...state,
      beamedThisTurn: [grunt],
      tractorUsedThisTurn: [ship],
    };
    expect(parseGameStateV7(JSON.parse(JSON.stringify(valid)))).toEqual(valid);
    for (const [label, broken] of [
      ["a rival's unit beamed", { ...state, beamedThisTurn: [rival] }],
      ["an unknown unit", { ...state, beamedThisTurn: [999] }],
      ["unsorted", { ...state, beamedThisTurn: [grunt, saucer] }],
      ["a duplicate", { ...state, beamedThisTurn: [grunt, grunt] }],
      ["a Saucer's free pull", { ...state, tractorUsedThisTurn: [saucer] }],
      ["a rival's pull", { ...state, tractorUsedThisTurn: [rival] }],
      ["a missing list", { ...state, beamedThisTurn: undefined }],
    ] as const)
      expect(parseGameStateV7(JSON.parse(JSON.stringify(broken))), label).toBe(
        null,
      );
    // Without a Martian seat both lists are empty.
    const human = martianFieldV7(
      [{ seat: 0, role: "FIGHTER", at: CAPITAL }, FAR],
      { factions: ["ORIGINAL", "UNDEAD"] },
    );
    expect([human.beamedThisTurn, human.tractorUsedThisTurn]).toEqual([[], []]);
    expect(
      parseGameStateV7({ ...human, beamedThisTurn: [idAt(human, CAPITAL)] }),
    ).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// M2: the Tractor Beam on the Saucer
// ---------------------------------------------------------------------------

describe("M2: the Tractor Beam on the Saucer (section 5.2)", () => {
  const SAUCER = at(4, 2);

  it("is a primary action: one tile from exactly two tiles away, after its flight too", () => {
    const state = martianFieldV7([
      { seat: 0, role: "RAIDER", at: SAUCER, activation: movedV7(3) },
      { seat: 0, role: "FIGHTER", at: CAPITAL },
      { seat: 1, role: "GUARD", at: at(6, 2) },
      { seat: 1, role: "FIGHTER", at: at(7, 3) },
      FAR,
    ]);
    const saucer = unitAtV7(state, SAUCER);
    const victim = unitAtV7(state, at(6, 2));
    expect(offeredFor(state, SAUCER, "TRACTOR_BEAM")).toEqual([
      pull(state, SAUCER, at(6, 2)),
    ]);
    // Distance 3 is the Mothership's reach, not the Saucer's.
    expect(rejectedV7(state, pull(state, SAUCER, at(7, 3)))).toEqual({
      code: "TRACTOR_BEAM_NOT_LEGAL",
      params: { reason: "OUT_OF_RANGE" },
    });
    expect(
      previewTractorBeamV7(activeViewV7(state), saucer.id, victim.id),
    ).toEqual({
      unitId: saucer.id,
      targetUnitId: victim.id,
      from: at(6, 2),
      to: at(5, 2),
      path: [at(5, 2)],
      fortificationLost: 0,
      emptiesCenterOfCityId: null,
      liftsSiegeOfCityId: null,
    });
    const run = playV7(state, pull(state, SAUCER, at(6, 2)));
    expect(run.events[0]).toEqual({
      kind: "UNIT_PULLED",
      sourceUnitId: saucer.id,
      targetUnitId: victim.id,
      from: at(6, 2),
      to: at(5, 2),
      path: [at(5, 2)],
    });
    expect(unitAtV7(run.state, at(5, 2))).toEqual({
      ...victim,
      at: at(5, 2),
      captureEligible: false,
    });
    // The Saucer has used its primary action: no attack, Beam Down, or
    // second pull; the free-pull list is the Mothership's only.
    expect(unitAtV7(run.state, SAUCER).activation).toMatchObject({
      specialActed: true,
      handled: true,
    });
    expect(run.state.tractorUsedThisTurn).toEqual([]);
    expect(offeredFor(run.state, SAUCER)).toEqual([]);
    // One primary action a turn: a Saucer that attacked or beamed cannot.
    const attacked = martianFieldV7([
      {
        seat: 0,
        role: "RAIDER",
        at: SAUCER,
        activation: { attacked: true, attacksUsed: 1, handled: true },
      },
      { seat: 1, role: "GUARD", at: at(6, 2) },
      FAR,
    ]);
    expect(rejectedV7(attacked, pull(attacked, SAUCER, at(6, 2))).code).toBe(
      "UNIT_ALREADY_ACTED",
    );
  });

  it("the immunities hold for both pullers: Juggernaut roles, two-slot units, Eggs; a construct is pulled", () => {
    const state = martianFieldV7(
      [
        { seat: 0, role: "RAIDER", at: SAUCER },
        { seat: 0, role: "KNIGHT", at: at(4, 6) },
        // The Brontosaurus and the T-Rex, two tiles from each puller.
        { seat: 1, role: "JUGGERNAUT", at: at(6, 2) },
        { seat: 1, role: "KNIGHT", at: at(2, 2) },
        { seat: 1, role: "JUGGERNAUT", at: at(6, 6) },
        { seat: 1, role: "KNIGHT", at: at(2, 6) },
        // A one-slot dinosaur: legal for the Saucer.
        { seat: 1, role: "GUARD", at: at(4, 0) },
        FAR,
      ],
      {
        factions: ["MARTIAN", "DINOSAUR"],
        // An Egg in its owner's territory, two tiles from the Mothership.
        eggs: [{ seat: 1, role: "RAIDER", at: at(2, 7) }],
      },
    );
    for (const [puller, target] of [
      [SAUCER, at(6, 2)],
      [SAUCER, at(2, 2)],
      [at(4, 6), at(6, 6)],
      [at(4, 6), at(2, 6)],
      [at(4, 6), at(2, 7)],
    ] as const)
      expect(
        rejectedV7(state, pull(state, puller, target)),
        `${target.x},${target.y}`,
      ).toEqual({
        code: "TRACTOR_BEAM_NOT_LEGAL",
        params: { reason: "TARGET_IMMUNE" },
      });
    expect(offeredV7(state, "TRACTOR_BEAM")).toEqual([
      pull(state, SAUCER, at(4, 0)),
    ]);
    expectOfferedAcceptedV7(state, "TRACTOR_BEAM");
    // A construct (the Clockwork Gunner) is immune to Mind Control, not to
    // the Tractor Beam (current rules).
    const dwarf = martianFieldV7(
      [
        { seat: 0, role: "RAIDER", at: SAUCER },
        { seat: 1, role: "MARKSMAN", at: at(6, 2) },
        FAR,
      ],
      { factions: ["MARTIAN", "DWARF"] },
    );
    expect(roleMechanicsV7("MARKSMAN", "DWARF").construct).toBe(true);
    playV7(dwarf, pull(dwarf, SAUCER, at(6, 2)));
  });

  it("nothing pulls the Giant Spider", () => {
    const state = monsterArenaV7(
      [
        { seat: 0, role: "RAIDER", at: at(5, 7) },
        { seat: 0, role: "KNIGHT", at: at(7, 10) },
      ],
      {},
      ["MARTIAN", "UNDEAD", "GOBLIN", "DINOSAUR"],
    );
    const spider = state.units.find(
      (unit) => unit.ownerId === NEUTRAL_OWNER_ID_V7,
    );
    if (spider === undefined) throw new Error("no Spider");
    expect([
      distance(spider.at, at(5, 7)),
      distance(spider.at, at(7, 10)),
    ]).toEqual([2, 3]);
    expect(
      offeredV7(state, "TRACTOR_BEAM").filter(
        (command) =>
          command.kind === "TRACTOR_BEAM" && command.targetUnitId === spider.id,
      ),
    ).toEqual([]);
    for (const puller of [at(5, 7), at(7, 10)])
      expect(
        rejectedV7(state, {
          kind: "TRACTOR_BEAM",
          unitId: idAt(state, puller),
          targetUnitId: spider.id,
        }),
      ).toEqual({
        code: "TRACTOR_BEAM_NOT_LEGAL",
        params: { reason: "TARGET_IMMUNE" },
      });
    expect(
      queryTractorBeamPathV7(
        activeViewV7(state),
        idAt(state, at(7, 10)),
        spider.id,
      ),
    ).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// M3: the Heavy Tractor Beam
// ---------------------------------------------------------------------------

describe("M3: the Heavy Tractor Beam (section 5.3)", () => {
  const SHIP = at(3, 3);

  it("pulls a unit three tiles away two tiles, ending next to the Mothership, for every direction", () => {
    const offsets: readonly (readonly [number, number])[] = [
      [3, 0],
      [3, 1],
      [3, -1],
      [3, 2],
      [3, -3],
      [-3, 0],
      [-3, -3],
      [0, 3],
      [1, 3],
      [2, 3],
      [0, -3],
      [-2, -3],
    ];
    for (const [dx, dy] of offsets) {
      const target = at(SHIP.x + dx, SHIP.y + dy);
      const label = `${dx},${dy}`;
      // The rule, spelled out: twice, one tile by the sign of the offset
      // from the target to the Mothership.
      const step = (from: CoordV7): CoordV7 =>
        at(
          from.x + Math.sign(SHIP.x - from.x),
          from.y + Math.sign(SHIP.y - from.y),
        );
      const path = [step(target), step(step(target))];
      const to = path[1] as CoordV7;
      expect(distance(SHIP, to), label).toBe(1);
      const state = martianFieldV7([
        { seat: 0, role: "KNIGHT", at: SHIP },
        { seat: 1, role: "GUARD", at: target },
      ]);
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
        path,
        fortificationLost: 0,
        emptiesCenterOfCityId: null,
        liftsSiegeOfCityId: null,
      });
      expect(
        queryTractorBeamPathV7(activeViewV7(state), ship.id, victim.id),
        label,
      ).toEqual(path);
      const run = playV7(state, pull(state, SHIP, target));
      expect(run.events[0], label).toEqual({
        kind: "UNIT_PULLED",
        sourceUnitId: ship.id,
        targetUnitId: victim.id,
        from: target,
        to,
        path,
      });
      expect(unitAtV7(run.state, to), label).toEqual({
        ...victim,
        at: to,
        captureEligible: false,
      });
    }
    // Distance 4 and distance 1 are out of range.
    const range = martianFieldV7([
      { seat: 0, role: "KNIGHT", at: SHIP },
      { seat: 1, role: "GUARD", at: at(7, 3) },
      { seat: 1, role: "GUARD", at: at(3, 4) },
    ]);
    for (const where of [at(7, 3), at(3, 4)])
      expect(rejectedV7(range, pull(range, SHIP, where)).params).toEqual({
        reason: "OUT_OF_RANGE",
      });
  });

  it("the shared path helper stops next to the puller, at the pull, and at the first tile that fails", () => {
    const heavy = { minimumRange: 2, maximumRange: 3, pull: 2, free: true };
    const light = { minimumRange: 2, maximumRange: 2, pull: 1, free: false };
    const open = () => true;
    expect(tractorBeamPathV7(heavy, at(3, 3), at(6, 3), open)).toEqual([
      at(5, 3),
      at(4, 3),
    ]);
    // From two tiles away the second step would be the Mothership's tile.
    expect(tractorBeamPathV7(heavy, at(3, 3), at(5, 3), open)).toEqual([
      at(4, 3),
    ]);
    expect(tractorBeamPathV7(light, at(3, 3), at(5, 4), open)).toEqual([
      at(4, 3),
    ]);
    expect(
      tractorBeamPathV7(heavy, at(3, 3), at(6, 3), (to) => to.x !== 4),
    ).toEqual([at(5, 3)]);
    expect(
      tractorBeamPathV7(heavy, at(3, 3), at(6, 3), (to) => to.x !== 5),
    ).toEqual([]);
  });

  it("each stop condition: a blocked second step shortens the pull, a blocked first step rejects it", () => {
    const TARGET = at(6, 3);
    const field = (
      more: readonly MartianPieceV7[] = [],
      water: readonly CoordV7[] = [],
    ) =>
      martianFieldV7(
        [
          { seat: 0, role: "KNIGHT", at: SHIP },
          { seat: 1, role: "GUARD", at: TARGET },
          ...more,
        ],
        { water },
      );
    const pathOf = (state: GameStateV7): readonly CoordV7[] | undefined =>
      previewTractorBeamV7(
        activeViewV7(state),
        idAt(state, SHIP),
        idAt(state, TARGET),
      )?.path;
    const one = (state: GameStateV7, label: string) => {
      expect(pathOf(state), label).toEqual([at(5, 3)]);
      const run = playV7(state, pull(state, SHIP, TARGET));
      expect(run.events[0], label).toMatchObject({
        to: at(5, 3),
        path: [at(5, 3)],
      });
      expect(hasUnitAtV7(run.state, at(5, 3)), label).toBe(true);
    };
    const none = (state: GameStateV7, label: string) => {
      expect(pathOf(state), label).toBeUndefined();
      expect(rejectedV7(state, pull(state, SHIP, TARGET)), label).toEqual({
        code: "TRACTOR_BEAM_NOT_LEGAL",
        params: { reason: "BLOCKED" },
      });
    };
    // A unit (own or hostile) on the second or the first tile.
    one(
      field([{ seat: 0, role: "FIGHTER", at: at(4, 3) }]),
      "own unit, second",
    );
    none(field([{ seat: 1, role: "FIGHTER", at: at(5, 3) }]), "unit, first");
    // A treasure chest.
    one(checkedV7({ ...field(), treasureChests: [at(4, 3)] }), "chest, second");
    none(checkedV7({ ...field(), treasureChests: [at(5, 3)] }), "chest, first");
    // Land to water.
    one(field([], [at(4, 3)]), "water, second");
    none(field([], [at(5, 3)]), "water, first");
    // A tile the actor has not explored (the target itself stays visible).
    none(unexploreV7(field(), 0, [at(5, 3)]), "unexplored, first");
    // A settlement site: the village (5, 5).
    const site = martianFieldV7([
      { seat: 0, role: "KNIGHT", at: at(5, 3) },
      { seat: 1, role: "GUARD", at: at(5, 6) },
      { seat: 1, role: "GUARD", at: at(5, 7) },
    ]);
    expect(rejectedV7(site, pull(site, at(5, 3), at(5, 6))).params).toEqual({
      reason: "BLOCKED",
    });
    const village = martianFieldV7([
      { seat: 0, role: "KNIGHT", at: at(4, 2) },
      { seat: 1, role: "GUARD", at: at(7, 5) },
    ]);
    // (7, 5) to (6, 4), then (5, 3): the path passes the village (8, 5) and
    // (5, 5) by, and nothing on it is a site.
    expect(
      previewTractorBeamV7(
        activeViewV7(village),
        idAt(village, at(4, 2)),
        idAt(village, at(7, 5)),
      )?.path,
    ).toEqual([at(6, 4), at(5, 3)]);
    // Territory allied to the target (cooperative: seats 1 and 2 are allies
    // against the human) is covered by the shared step predicate; here, the
    // target's own territory is fine.
    const home = martianFieldV7([
      { seat: 0, role: "KNIGHT", at: at(5, 7) },
      { seat: 1, role: "GUARD", at: at(2, 8) },
    ]);
    const cityId = home.cities.find(
      (city) => city.at.x === 2 && city.at.y === 8,
    )?.id;
    // A defender pulled two tiles off its center cannot walk back in a turn.
    expect(
      previewTractorBeamV7(
        activeViewV7(home),
        idAt(home, at(5, 7)),
        idAt(home, at(2, 8)),
      ),
    ).toMatchObject({
      to: at(4, 7),
      path: [at(3, 7), at(4, 7)],
      emptiesCenterOfCityId: cityId,
    });
    const emptied = playV7(home, pull(home, at(5, 7), at(2, 8)));
    expect(hasUnitAtV7(emptied.state, at(2, 8))).toBe(false);
    expect(distance(at(2, 8), unitAtV7(emptied.state, at(4, 7)).at)).toBe(2);
  });

  it("is free once a turn: after it the Mothership still moves and attacks, and it may follow a Move or an attack", () => {
    const pieces = (
      activation: MartianPieceV7["activation"] = {},
    ): readonly MartianPieceV7[] => [
      { seat: 0, role: "KNIGHT", at: SHIP, activation },
      { seat: 0, role: "FIGHTER", at: CAPITAL },
      { seat: 1, role: "FIGHTER", at: at(6, 3) },
      { seat: 1, role: "GUARD", at: at(3, 6) },
      FAR,
    ];
    const state = martianFieldV7(pieces());
    const ship = unitAtV7(state, SHIP);
    const run = playV7(state, pull(state, SHIP, at(6, 3)));
    // Its activation is untouched; the per-turn fact records the use.
    expect(unitAtV7(run.state, SHIP).activation).toEqual(ship.activation);
    expect(run.state.tractorUsedThisTurn).toEqual([ship.id]);
    const kinds = new Set(
      offeredFor(run.state, SHIP).map((command) => command.kind),
    );
    expect(kinds.has("MOVE")).toBe(true);
    expect(kinds.has("ATTACK")).toBe(true);
    expect(kinds.has("BEAM_DOWN")).toBe(true);
    expect(kinds.has("TRACTOR_BEAM")).toBe(false);
    // Not twice.
    expect(rejectedV7(run.state, pull(run.state, SHIP, at(3, 6)))).toEqual({
      code: "UNIT_ALREADY_ACTED",
      params: { unitId: ship.id },
    });
    // The pulled Fighter stands next to it: the Mothership attacks it (6;
    // the Fighter's 4 back is absorbed by the Shield).
    const hit = attackV7(run.state, SHIP, at(4, 3));
    expect(hit.combat).toMatchObject({
      damageToDefender: 6,
      damageToAttacker: 0,
      attackerShieldDamage: 4,
    });
    expect(offeredFor(hit.state, SHIP, "TRACTOR_BEAM", "MOVE")).toEqual([]);
    // After a Move, and after an attack, the pull is still offered.
    for (const activation of [
      movedV7(2),
      { attacked: true, attacksUsed: 1, handled: true },
      { ...movedV7(2), attacked: true, attacksUsed: 1, handled: true },
    ]) {
      const later = martianFieldV7(pieces(activation));
      // The Fighter, the Guard, and the unit on (0, 0), three tiles away.
      expect(offeredFor(later, SHIP, "TRACTOR_BEAM")).toHaveLength(3);
      const pulled = playV7(later, pull(later, SHIP, at(6, 3)));
      expect(unitAtV7(pulled.state, SHIP).activation).toEqual(
        unitAtV7(later, SHIP).activation,
      );
    }
    // A Mothership that landed this turn (the exhausted activation) cannot.
    const landed = martianFieldV7(
      pieces({
        moved: true,
        attacked: true,
        attacksUsed: 1,
        recovered: true,
        captured: true,
        handled: true,
        specialActed: true,
      }),
    );
    expect(offeredFor(landed, SHIP, "TRACTOR_BEAM")).toEqual([]);
    expect(rejectedV7(landed, pull(landed, SHIP, at(6, 3))).code).toBe(
      "UNIT_ALREADY_ACTED",
    );
    // The fact ends with the owner's turn: it pulls again next turn.
    const ended = applyOkV7(run.state, activeIdV7(run.state), {
      kind: "END_TURN",
    });
    expect(ended.state.tractorUsedThisTurn).toEqual([]);
    const next = endTurnUntilV7(ended.state, activeIdV7(state)).state;
    expect(offeredFor(next, SHIP, "TRACTOR_BEAM").length).toBeGreaterThan(0);
  });

  it("a Mothership that pulled may still fly out over water (it self-launches) in the same turn", () => {
    const state = martianFieldV7(
      [
        { seat: 0, role: "KNIGHT", at: SHIP },
        { seat: 1, role: "FIGHTER", at: at(6, 3) },
        FAR,
      ],
      { water: [at(2, 2), at(1, 2)] },
    );
    const ship = unitAtV7(state, SHIP);
    const pulled = playV7(state, pull(state, SHIP, at(6, 3)));
    const flown = playV7(pulled.state, {
      kind: "MOVE",
      unitId: ship.id,
      path: [at(2, 2)],
    });
    expect(unitAtV7(flown.state, at(2, 2))).toMatchObject({
      id: ship.id,
      form: "EMBARKED",
    });
    // The per-turn fact stays on the embarked Mothership until End Turn.
    expect(flown.state.tractorUsedThisTurn).toEqual([ship.id]);
  });

  it("every offered Tractor Beam is accepted and ends where its preview says", () => {
    const base = martianFieldV7(
      [
        { seat: 0, role: "KNIGHT", at: at(4, 4), activation: movedV7(1) },
        { seat: 0, role: "RAIDER", at: at(6, 2) },
        { seat: 0, role: "FIGHTER", at: at(5, 4) },
        { seat: 0, role: "MARKSMAN", at: at(7, 4) },
        { seat: 1, role: "FIGHTER", at: at(7, 5) },
        { seat: 1, role: "GUARD", at: at(4, 1) },
        { seat: 1, role: "MARKSMAN", at: at(1, 4) },
        { seat: 1, role: "RAIDER", at: at(2, 2) },
        { seat: 1, role: "FIGHTER", at: at(4, 7) },
        { seat: 1, role: "CATAPULT", at: at(8, 2) },
        { seat: 1, role: "JUGGERNAUT", at: at(2, 6) },
        { seat: 1, role: "PATROL_BOAT", at: at(6, 0), form: "NAVAL" },
        FAR,
      ],
      { water: [at(6, 0), at(6, 1), at(1, 5)] },
    );
    const state = checkedV7({ ...base, treasureChests: [at(3, 2)] });
    const actor = activeIdV7(state);
    const view = activeViewV7(state);
    const offered = offeredV7(state, "TRACTOR_BEAM");
    expect(offered.length).toBeGreaterThanOrEqual(6);
    expect(
      new Set(offered.map((c) => ("unitId" in c ? c.unitId : 0))).size,
    ).toBe(2);
    for (const command of offered) {
      if (command.kind !== "TRACTOR_BEAM") continue;
      const preview = previewTractorBeamV7(
        view,
        command.unitId,
        command.targetUnitId,
      );
      const result = applyCommandV7(state, actor, command);
      if (!result.accepted || preview === null)
        throw new Error(`${JSON.stringify(command)} not accepted`);
      expect(result.events[0]).toEqual({
        kind: "UNIT_PULLED",
        sourceUnitId: command.unitId,
        targetUnitId: command.targetUnitId,
        from: preview.from,
        to: preview.to,
        path: preview.path,
      });
      expect(
        result.state.units.find((unit) => unit.id === command.targetUnitId)?.at,
      ).toEqual(preview.to);
    }
    // And nothing the reducer accepts is missing from the offer: every
    // (puller, visible unit) pair is either offered or rejected.
    for (const puller of [at(4, 4), at(6, 2)])
      for (const unit of state.units) {
        const command: CommandV7 = {
          kind: "TRACTOR_BEAM",
          unitId: idAt(state, puller),
          targetUnitId: unit.id,
        };
        expect(
          applyCommandV7(state, actor, command).accepted,
          JSON.stringify(command),
        ).toBe(
          offered.some(
            (other) => JSON.stringify(other) === JSON.stringify(command),
          ),
        );
      }
  });
});

// ---------------------------------------------------------------------------
// M4: the Grunt
// ---------------------------------------------------------------------------

describe("M4: the Grunt's gun and body (sections 5.4 and 5.7)", () => {
  const shot = (
    role: MartianPieceV7["role"],
    prepare: (state: GameStateV7) => GameStateV7 = (state) => state,
  ) => {
    const state = prepare(
      martianFieldV7([
        { seat: 0, role: "FIGHTER", at: at(4, 3) },
        { seat: 1, role, at: at(6, 3) },
        FAR,
      ]),
    );
    return attackV7(state, at(4, 3), at(6, 3)).combat;
  };

  // The Guard row was 4 before tuning 5 (`pulp_wars-w49.4`): the Human Guard has Defense 1 against an attack from two or more tiles.
  it("a shot from two tiles: 5 on a Fighter, 6 on a Guard, 6 on a Marksman or Raider, 7 on a Catapult", () => {
    expect(shot("FIGHTER").damageToDefender).toBe(5);
    expect(shot("GUARD").damageToDefender).toBe(6);
    expect(shot("MARKSMAN").damageToDefender).toBe(6);
    expect(shot("RAIDER").damageToDefender).toBe(6);
    expect(shot("KNIGHT").damageToDefender).toBe(6);
    expect(shot("CATAPULT").damageToDefender).toBe(7);
    // A Fighter in a Forest: 4.
    expect(
      shot("FIGHTER", (state) => forestV7(state, at(6, 3))).damageToDefender,
    ).toBe(4);
  });

  it("three Grunts kill a Fighter in a turn (5, 6, 1); two Fighter hits kill a Grunt (5, then its last 5)", () => {
    const state = martianFieldV7([
      { seat: 0, role: "FIGHTER", at: at(4, 3) },
      { seat: 0, role: "FIGHTER", at: at(4, 2) },
      { seat: 0, role: "FIGHTER", at: at(4, 4) },
      { seat: 1, role: "FIGHTER", at: at(6, 3) },
      FAR,
    ]);
    const first = attackV7(state, at(4, 3), at(6, 3));
    const second = attackV7(first.state, at(4, 2), at(6, 3));
    const third = attackV7(second.state, at(4, 4), at(6, 3));
    expect([
      first.combat.damageToDefender,
      second.combat.damageToDefender,
      third.combat.damageToDefender,
    ]).toEqual([5, 6, 1]);
    expect(third.combat.defenderDies).toBe(true);
    const brawl = martianFieldV7(
      [
        { seat: 0, role: "FIGHTER", at: at(5, 2) },
        { seat: 1, role: "FIGHTER", at: at(5, 3) },
        { seat: 1, role: "FIGHTER", at: at(4, 3) },
        FAR,
      ],
      { activeSeat: 1 },
    );
    const one = attackV7(brawl, at(5, 3), at(5, 2));
    expect(one.combat).toMatchObject({
      damageToDefender: 3,
      defenderShieldDamage: 2,
    });
    // 8 HP (`pulp_wars-1wy.6`): the first hit leaves 5, which the second
    // takes (a reported hit is capped at the HP left).
    const two = attackV7(one.state, at(4, 3), at(5, 2));
    expect(two.combat).toMatchObject({
      damageToDefender: 5,
      defenderDies: true,
    });
  });

  it("against Yetis: two hits kill a Chilled Grunt (5, then its last 5); in a Force Field the second shatters it", () => {
    const build = (shield: number) =>
      iceFieldV7(
        [
          {
            seat: 0,
            role: "FIGHTER",
            at: at(5, 2),
            shield,
            frozen: { turnsLeft: 1 },
          },
          { seat: 1, role: "FIGHTER", at: at(5, 3) },
          { seat: 1, role: "FIGHTER", at: at(4, 3) },
        ],
        { factions: ["MARTIAN", "ICE_FOLK"], activeSeat: 1 },
      );
    const plain = attackV7(build(2), at(5, 3), at(5, 2));
    expect(plain.combat).toMatchObject({
      defenderShieldDamage: 2,
      damageToDefender: 3,
    });
    expect(attackV7(plain.state, at(4, 3), at(5, 2)).combat).toMatchObject({
      damageToDefender: 5,
      defenderDies: true,
      shatters: false,
    });
    const covered = attackV7(build(4), at(5, 3), at(5, 2));
    expect(covered.combat).toMatchObject({
      defenderShieldDamage: 4,
      damageToDefender: 1,
    });
    expect(attackV7(covered.state, at(4, 3), at(5, 2)).combat).toMatchObject({
      shatters: true,
      defenderDies: true,
    });
  });

  it("a promoted Grunt has 13 HP", () => {
    expect(
      effectiveRoleRuleV7("FIGHTER", "MARTIAN").maxHp + PROMOTION_HP_V7,
    ).toBe(13);
  });
});

// ---------------------------------------------------------------------------
// I1: Glide from Snow onto Snow
// ---------------------------------------------------------------------------

describe("I1: Glide from Snow onto Snow (section 6.1)", () => {
  const destinations = (
    state: GameStateV7,
    from: CoordV7,
  ): readonly CoordV7[] =>
    offeredForV7(state, from, "MOVE")
      .flatMap((command) =>
        command.kind === "MOVE" ? [command.path.at(-1) as CoordV7] : [],
      )
      .sort((left, right) => left.y - right.y || left.x - right.x);
  const farthest = (state: GameStateV7, from: CoordV7): number =>
    Math.max(...destinations(state, from).map((to) => distance(from, to)));
  const move = (state: GameStateV7, from: CoordV7, path: readonly CoordV7[]) =>
    applyCommandV7(state, activeIdV7(state), {
      kind: "MOVE",
      unitId: idAt(state, from),
      path: [...path],
    });

  // Without Deep Winter the Snow is the territory, x 7-9, y 7-9.
  const NO_DEEP_WINTER = {
    techs: { 0: withoutTechsV7("ICE_FOLK", "FORTIFICATION") },
  };

  it("the village run: a Yeti trained on a center leaves home one tile a turn", () => {
    const state = iceFieldV7(
      [
        { seat: 0, role: "FIGHTER", at: CAPITAL },
        { seat: 0, role: "FIGHTER", at: at(7, 7) },
        { seat: 0, role: "FIGHTER", at: at(4, 3) },
        FAR,
      ],
      NO_DEEP_WINTER,
    );
    // From the center every step of two stays on the territory's Snow.
    const fromCenter = destinations(state, CAPITAL);
    expect(farthest(state, CAPITAL)).toBe(1);
    expect(fromCenter.every((to) => to.x >= 7 && to.y >= 7)).toBe(true);
    // The center to the edge costs a half-point, off the Snow a full one.
    const off = move(state, CAPITAL, [at(7, 8), at(6, 8)]);
    expect(off.accepted).toBe(false);
    if (!off.accepted)
      expect(off.error).toEqual({
        code: "MOVEMENT_ILLEGAL",
        params: { reason: "BUDGET_EXCEEDED" },
      });
    // Inside the Snow it still moves two tiles (interior lines)...
    expect(move(state, at(7, 7), [at(8, 7), at(9, 7)]).accepted).toBe(true);
    expect(destinations(state, at(7, 7))).toContainEqual(at(9, 9));
    // ...and from the edge it steps off like a Fighter: one tile.
    expect(destinations(state, at(7, 7))).toContainEqual(at(6, 6));
    expect(
      destinations(state, at(7, 7)).filter((to) => to.x < 6 || to.y < 6),
    ).toEqual([]);
    // In the open a Yeti moves one tile.
    expect(farthest(state, at(4, 3))).toBe(1);
    expectOfferedAcceptedV7(state, "MOVE");
    // With Deep Winter the Snow reaches two tiles from the center: the
    // Yeti crosses it at double speed and still steps off at one tile.
    const winter = iceFieldV7([
      { seat: 0, role: "FIGHTER", at: CAPITAL },
      { seat: 0, role: "FIGHTER", at: at(6, 6) },
      FAR,
    ]);
    expect(farthest(winter, CAPITAL)).toBe(2);
    expect(destinations(winter, CAPITAL)).toContainEqual(at(6, 6 + 2));
    expect(farthest(winter, at(6, 6))).toBe(2);
    expect(
      destinations(winter, at(6, 6)).filter((to) => to.x < 5 || to.y < 5),
    ).toEqual([]);
    expectOfferedAcceptedV7(winter, "MOVE");
  });

  it("a Sled leaves home at Raider speed (two tiles) and crosses Snow in up to four steps", () => {
    const state = iceFieldV7(
      [
        { seat: 0, role: "RAIDER", at: CAPITAL },
        { seat: 0, role: "RAIDER", at: at(4, 3) },
        FAR,
      ],
      NO_DEEP_WINTER,
    );
    // Half a point to the edge, a full one off it, and no second full step.
    expect(farthest(state, CAPITAL)).toBe(2);
    expect(move(state, CAPITAL, [at(7, 7), at(6, 6)]).accepted).toBe(true);
    expect(move(state, CAPITAL, [at(7, 7), at(6, 6), at(5, 6)]).accepted).toBe(
      false,
    );
    // Four Snow steps.
    expect(
      move(state, CAPITAL, [at(7, 8), at(7, 7), at(8, 7), at(9, 7)]).accepted,
    ).toBe(true);
    expect(farthest(state, at(4, 3))).toBe(2);
    expectOfferedAcceptedV7(state, "MOVE");
  });

  it("the Blizzard ball moves one tile a turn; inside it units still shuffle two steps", () => {
    // The Witch on (4, 3): her Blizzard is Snow on x 3-5, y 2-4.
    const state = iceFieldV7([
      { seat: 0, role: "CAPTAIN", at: at(4, 3) },
      { seat: 0, role: "FIGHTER", at: at(3, 3) },
      { seat: 0, role: "FIGHTER", at: at(5, 3) },
      FAR,
    ]);
    // The Witch: only her 3 x 3 was Snow before the Move.
    expect(farthest(state, at(4, 3))).toBe(1);
    expect(move(state, at(4, 3), [at(5, 2), at(6, 2)]).accepted).toBe(false);
    // The escort on the east edge steps out one tile...
    expect(destinations(state, at(5, 3)).filter((to) => to.x > 5)).toEqual([
      at(6, 2),
      at(6, 3),
      at(6, 4),
    ]);
    expect(move(state, at(5, 3), [at(6, 3), at(7, 3)]).accepted).toBe(false);
    // ...and the one on the west edge crosses the Blizzard in two steps.
    expect(destinations(state, at(3, 3))).toContainEqual(at(5, 2));
    expect(move(state, at(3, 3), [at(4, 2), at(5, 2)]).accepted).toBe(true);
    expectOfferedAcceptedV7(state, "MOVE");
  });

  it("the Sabretooth never glides, and no other faction's unit does", () => {
    const state = iceFieldV7(
      [{ seat: 0, role: "KNIGHT", at: at(7, 7) }, FAR],
      NO_DEEP_WINTER,
    );
    expect(roleMechanicsV7("KNIGHT", "ICE_FOLK").glides).toBe(false);
    // Move 3: three full steps, on Snow or off it, never a fourth.
    expect(effectiveRoleRuleV7("KNIGHT", "ICE_FOLK").move).toBe(3);
    expect(farthest(state, at(7, 7))).toBe(3);
    expect(
      move(state, at(7, 7), [at(8, 7), at(9, 7), at(9, 8), at(9, 9)]).accepted,
    ).toBe(false);
    for (const faction of FACTION_IDS_V7)
      if (faction !== "ICE_FOLK")
        for (const role of UNIT_ROLE_IDS_V7)
          expect(roleMechanicsV7(role, faction).glides).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// I2: Snow cover x 1.25
// ---------------------------------------------------------------------------

describe("I2: Snow cover x 1.25 (section 6.2)", () => {
  const exchange = (
    defender: MartianPieceV7["role"],
    attacker: MartianPieceV7["role"],
    prepare: (state: GameStateV7) => GameStateV7 = (state) => state,
  ) => {
    const state = prepare(
      iceFieldV7(
        [
          { seat: 0, role: defender, at: at(7, 7) },
          { seat: 1, role: attacker, at: at(6, 6) },
          FAR,
        ],
        { activeSeat: 1 },
      ),
    );
    return attackV7(state, at(6, 6), at(7, 7));
  };

  it("a Fighter on a Yeti on Snow: hit 5 and 3 back (x 1.5 gave 4 and 4), as in the open", () => {
    const run = exchange("FIGHTER", "FIGHTER");
    expect(run.combat).toMatchObject({
      snowCover: true,
      defenseBonusNumerator: 5,
      defenseBonusDenominator: 4,
      damageToDefender: 5,
      damageToAttacker: 3,
    });
    const state = run.before;
    expect(defenseBonusForUnitV7(state, unitAtV7(state, at(7, 7)))).toEqual(
      SNOW_COVER_V7,
    );
    // Tuning 3 (`pulp_wars-w49.3`): a Knight (Attack 4, 3 before) kills the
    // 9-HP Yeti on Snow (it dealt 8 of 9).
    expect(exchange("FIGHTER", "KNIGHT").combat.damageToDefender).toBe(9);
  });

  it("a snowy Forest gives the terrain's x 1.5, never both", () => {
    const run = exchange("FIGHTER", "FIGHTER", (state) =>
      forestV7(state, at(7, 7)),
    );
    expect(run.combat).toMatchObject({
      snowCover: false,
      defenseBonusNumerator: 3,
      defenseBonusDenominator: 2,
      damageToDefender: 4,
      // Tuning 1 (7r46): the Yeti's open-ground retaliation (4 with the
      // Forest cover in it before).
      damageToAttacker: 3,
    });
  });

  it("a fortified Ice Folk unit has no Snow cover; another faction's unit never has", () => {
    const fortified = exchange("FIGHTER", "FIGHTER", (state) =>
      fieldDefenseV7(state, at(7, 7)),
    );
    expect(fortified.combat).toMatchObject({
      snowCover: false,
      defenseBonusNumerator: 1,
      defenseBonusDenominator: 1,
    });
    const human = iceFieldV7(
      [
        { seat: 0, role: "FIGHTER", at: at(6, 6) },
        { seat: 1, role: "FIGHTER", at: at(7, 7) },
        FAR,
      ],
      {},
    );
    expect(attackV7(human, at(6, 6), at(7, 7)).combat).toMatchObject({
      snowCover: false,
      defenseBonusNumerator: 1,
    });
  });

  it("two Fighter hits kill the Witch on her own Snow (6, 6), and four kill a Mammoth", () => {
    const hits = (defender: MartianPieceV7["role"], count: number) => {
      const spots = [at(6, 6), at(6, 7), at(6, 8), at(7, 6), at(8, 6)];
      let state = iceFieldV7(
        [
          { seat: 0, role: defender, at: at(7, 7) },
          ...spots
            .slice(0, count)
            .map((where) => ({ seat: 1, role: "FIGHTER" as const, at: where })),
          FAR,
        ],
        { activeSeat: 1 },
      );
      const damage: number[] = [];
      for (const where of spots.slice(0, count)) {
        const run = attackV7(state, where, at(7, 7));
        damage.push(run.combat.damageToDefender);
        state = run.state;
        if (run.combat.defenderDies) break;
      }
      return damage;
    };
    const witch = effectiveRoleRuleV7("CAPTAIN", "ICE_FOLK");
    const dealt = hits("CAPTAIN", 3);
    expect(dealt).toHaveLength(2);
    expect(dealt.reduce((sum, value) => sum + value, 0)).toBe(witch.maxHp);
    expect(hits("GUARD", 5)).toHaveLength(4);
  });

  it("the unit stats name Snow cover with its x 1.25", () => {
    const state = iceFieldV7([{ seat: 0, role: "FIGHTER", at: at(7, 7) }, FAR]);
    const stats = publicUnitStatsV7(state, unitAtV7(state, at(7, 7)));
    expect(stats.iceFolk).toMatchObject({ onSnow: true, snowCover: true });
    const defense = stats.stats.find((stat) => stat.id === "DEFENSE");
    expect(defense?.modifiers).toMatchObject([
      {
        source: "SNOW",
        sourceLabel: "Snow cover",
        // Defense 1.5 x 0.25.
        value: { numerator: 3, denominator: 8 },
      },
    ]);
  });
});

// ---------------------------------------------------------------------------
// Parity
// ---------------------------------------------------------------------------

describe("parity: no change without a Martian or Ice Folk seat (sections 5.5 and 6.3)", () => {
  it("a Human against Undead match offers neither command, keeps both lists empty, and keeps its numbers", () => {
    const state = martianFieldV7(
      [
        { seat: 0, role: "RAIDER", at: at(4, 3) },
        { seat: 0, role: "KNIGHT", at: at(4, 6) },
        { seat: 0, role: "FIGHTER", at: CAPITAL },
        { seat: 1, role: "FIGHTER", at: at(6, 3) },
        { seat: 1, role: "FIGHTER", at: at(7, 6) },
        FAR,
      ],
      { factions: ["ORIGINAL", "UNDEAD"] },
    );
    expect(offeredV7(state, "BEAM_DOWN", "TRACTOR_BEAM")).toEqual([]);
    for (const command of [
      beam(state, at(4, 3), CAPITAL, at(5, 3)),
      pull(state, at(4, 3), at(6, 3)),
      pull(state, at(4, 6), at(7, 6)),
    ])
      expect(rejectedV7(state, command).code).toBe("UNIT_ROLE_INVALID");
    const ended = applyOkV7(state, activeIdV7(state), { kind: "END_TURN" });
    expect([
      ended.state.beamedThisTurn,
      ended.state.tractorUsedThisTurn,
    ]).toEqual([[], []]);
    // The Human Fighter and Knight are what they were.
    const fighter = effectiveRoleRuleV7("FIGHTER", "ORIGINAL");
    expect([fighter.cost, fighter.maxHp, fighter.attack2]).toEqual([2, 12, 4]);
    expect(effectiveRoleRuleV7("KNIGHT", "ORIGINAL").abilities).not.toContain(
      "BEAM_DOWN",
    );
    // Forest cover is unchanged, and a Human unit never glides.
    const forest = forestV7(state, at(6, 3));
    expect(defenseBonusForUnitV7(forest, unitAtV7(forest, at(6, 3)))).toEqual(
      TERRAIN_COVER_V7,
    );
    for (const role of UNIT_ROLE_IDS_V7)
      expect(roleMechanicsV7(role, "ORIGINAL").glides).toBe(false);
  });
});
