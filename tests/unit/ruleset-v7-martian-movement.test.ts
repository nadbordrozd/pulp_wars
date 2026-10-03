import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  parseEventV7,
  parseGameStateV7,
  canCrossWaterV7,
  canEnterTerrainV7,
  flyerMayStandOnSiteV7,
  fortificationLevelForUnitV7,
  unitMovementModeV7,
  type CommandV7,
  type CoordV7,
  type GameStateV7,
  type TechnologyIdV7,
  type UnitRoleIdV7,
} from "../../src/engine/index";
import {
  applyOkV7,
  sameV7,
  seatIdV7,
  unitAtV7,
} from "../fixtures/v7-goblin-arena";
import {
  expectOfferedAcceptedV7,
  hasUnitAtV7,
  martianFieldV7,
  offeredV7,
  playV7,
  rejectedV7,
  type AppliedV7,
  type MartianFieldOptionsV7,
  type MartianPieceV7,
} from "../fixtures/v7-martian";
import {
  activeIdV7,
  at,
  attackV7,
  fieldDefenseV7,
  forestV7,
  kindsV7,
  mountainV7,
  tileV7,
  unexploreV7,
  walledV7,
  withoutTechsV7,
} from "../fixtures/v7-revision20";

// The Martian revision, section 7 (docs/product/RULESET_7_MARTIANS.md):
// Stride, Flying, crossing water, and self-launch; and the audit of the one
// shared "can this unit enter this terrain" rule.

const without = (...techs: TechnologyIdV7[]) => ({
  0: withoutTechsV7("MARTIAN", ...techs),
});

const move = (
  state: GameStateV7,
  from: CoordV7,
  ...path: CoordV7[]
): Extract<CommandV7, { kind: "MOVE" }> => ({
  kind: "MOVE",
  unitId: unitAtV7(state, from).id,
  path,
});

/**
 * Applies a `MOVE` along `path`. The public query offers one path for each
 * destination, so the test requires an offered Move of that unit to the
 * tile the Move ends on (which may be short of the path's end after a stop).
 */
function go(state: GameStateV7, from: CoordV7, ...path: CoordV7[]): AppliedV7 {
  const command = move(state, from, ...path);
  const result = applyOkV7(state, activeIdV7(state), command);
  for (const event of result.events)
    expect(parseEventV7(event).ok, event.kind).toBe(true);
  expect(parseGameStateV7(JSON.parse(JSON.stringify(result.state)))).toEqual(
    result.state,
  );
  const end = path[path.length - 1] as CoordV7;
  expect(
    offeredV7(state, "MOVE").some(
      (offered) =>
        offered.kind === "MOVE" &&
        offered.unitId === command.unitId &&
        sameV7(offered.path[offered.path.length - 1] as CoordV7, end),
    ),
    `a MOVE to ${end.x},${end.y} is offered`,
  ).toBe(true);
  return result;
}

const moveReason = (state: GameStateV7, from: CoordV7, ...path: CoordV7[]) => {
  const error = rejectedV7(state, move(state, from, ...path));
  expect(error.code).toBe("MOVEMENT_ILLEGAL");
  return error.params.reason;
};

/** A field with one Martian unit on (2, 2) and a far Human Fighter. */
const lone = (
  role: UnitRoleIdV7,
  options: MartianFieldOptionsV7 = {},
  more: readonly MartianPieceV7[] = [],
) =>
  martianFieldV7(
    [
      { seat: 0, role, at: at(2, 2) },
      { seat: 1, role: "FIGHTER", at: at(9, 1) },
      ...more,
    ],
    options,
  );

describe("the shared terrain-entry rule", () => {
  it("canEnterTerrainV7: land, Mountain, and water for each movement mode", () => {
    const enter = (
      terrain: Parameters<typeof canEnterTerrainV7>[0]["terrain"],
      movementMode: "GROUND" | "STRIDE" | "FLY",
      afloat: boolean,
      engineering = false,
      navigation = false,
    ) =>
      canEnterTerrainV7({
        terrain,
        movementMode,
        afloat,
        engineering,
        navigation,
        mountainBorn: false,
      });
    for (const mode of ["GROUND", "STRIDE", "FLY"] as const) {
      expect(enter("GRASS", mode, false)).toBe(true);
      expect(enter("FOREST", mode, false)).toBe(true);
      expect(enter("GRASS", mode, true)).toBe(false);
      // Only an afloat form stands on a water tile, whatever the mode.
      expect(enter("SHALLOW_WATER", mode, false)).toBe(false);
      expect(enter("SHALLOW_WATER", mode, true)).toBe(true);
      expect(enter("DEEP_WATER", mode, true)).toBe(false);
      expect(enter("DEEP_WATER", mode, true, false, true)).toBe(true);
      expect(enter("DEEP_WATER", mode, false, true, true)).toBe(false);
      expect(enter("MOUNTAIN", mode, true, true)).toBe(false);
    }
    expect(enter("MOUNTAIN", "GROUND", false)).toBe(false);
    expect(enter("MOUNTAIN", "GROUND", false, true)).toBe(true);
    expect(enter("MOUNTAIN", "STRIDE", false)).toBe(true);
    expect(enter("MOUNTAIN", "FLY", false)).toBe(true);
  });

  it("canCrossWaterV7: walkers wade Shallow Water, flyers also cross Deep Water with Navigation", () => {
    const cross = (
      terrain: "SHALLOW_WATER" | "DEEP_WATER" | "GRASS",
      movementMode: "GROUND" | "STRIDE" | "FLY",
      navigation: boolean,
    ) => canCrossWaterV7({ terrain, movementMode, navigation });
    expect(cross("SHALLOW_WATER", "GROUND", true)).toBe(false);
    expect(cross("SHALLOW_WATER", "STRIDE", false)).toBe(true);
    expect(cross("SHALLOW_WATER", "FLY", false)).toBe(true);
    expect(cross("DEEP_WATER", "STRIDE", true)).toBe(false);
    expect(cross("DEEP_WATER", "FLY", false)).toBe(false);
    expect(cross("DEEP_WATER", "FLY", true)).toBe(true);
    expect(cross("GRASS", "FLY", true)).toBe(false);
  });

  it("flyerMayStandOnSiteV7: no site, or the flyer's own city center", () => {
    const state = lone("RAIDER");
    const own = seatIdV7(state, 0);
    const other = seatIdV7(state, 1);
    expect(flyerMayStandOnSiteV7(null, null, own)).toBe(true);
    expect(flyerMayStandOnSiteV7(tileV7(state, at(5, 5)).site, null, own)).toBe(
      false,
    );
    expect(flyerMayStandOnSiteV7(tileV7(state, at(8, 8)).site, own, own)).toBe(
      true,
    );
    expect(
      flyerMayStandOnSiteV7(tileV7(state, at(2, 8)).site, other, own),
    ).toBe(false);
  });

  it("every role has its movement mode, and only Martian machines differ from GROUND", () => {
    const state = martianFieldV7([
      { seat: 0, role: "FIGHTER", at: at(2, 2) },
      { seat: 0, role: "RAIDER", at: at(3, 2) },
      { seat: 0, role: "MARKSMAN", at: at(4, 2) },
      { seat: 0, role: "GUARD", at: at(5, 2) },
      { seat: 0, role: "CAPTAIN", at: at(6, 2) },
      { seat: 0, role: "CATAPULT", at: at(2, 3) },
      { seat: 0, role: "KNIGHT", at: at(3, 3) },
      { seat: 0, role: "JUGGERNAUT", at: at(4, 3) },
      { seat: 1, role: "RAIDER", at: at(9, 1) },
      { seat: 1, role: "CATAPULT", at: at(9, 2) },
      { seat: 1, role: "KNIGHT", at: at(9, 3) },
      { seat: 1, role: "JUGGERNAUT", at: at(9, 4) },
    ]);
    const modes = Object.fromEntries(
      state.units
        .filter((unit) => unit.ownerId === seatIdV7(state, 0))
        .map((unit) => [unit.role, unitMovementModeV7(state, unit)]),
    );
    expect(modes).toEqual({
      FIGHTER: "GROUND",
      RAIDER: "FLY",
      MARKSMAN: "GROUND",
      GUARD: "GROUND",
      CAPTAIN: "GROUND",
      CATAPULT: "STRIDE",
      KNIGHT: "FLY",
      JUGGERNAUT: "STRIDE",
    });
    for (const unit of state.units.filter(
      (candidate) => candidate.ownerId === seatIdV7(state, 1),
    ))
      expect(unitMovementModeV7(state, unit)).toBe("GROUND");
  });

  // Concern 11 of the specification: every rule that asks "can this unit
  // enter this tile" must use the one helper. The audit pins the number of
  // call sites per file; each is exercised by a test named below.
  //
  // - combat.ts (1): `displacementDestinationLegalV7`, the shared Push,
  //   Charge! push, and Tractor Beam destination rule ("Push onto a
  //   Mountain", "all sixteen offsets" in the abilities tests).
  // - movement.ts (3): the canonical Move validator's land step, and its
  //   embarked-unit step (`validateMovementPathV7`); the public validator's
  //   step ("strides over a Mountain", "afloat, a machine is an ordinary
  //   embarked unit").
  // - reducer.ts (5): `DISEMBARK`; Beam Down; the advance after a kill;
  //   treasure-unit placement; reward displacement.
  // - query.ts (5): the public landing tiles; the Beam Down offers; the
  //   Tractor Beam target technology rule; the public advance; the public
  //   Push onto a Rift (`pulp_wars-9s0.5`: only a flyer).
  // - eggs.ts (2): the Ice Folk revision moved the nest-tile Mountain test
  //   (canonical and public) onto the helper.
  // - The Dwarf revision (`pulp_wars-78i.3`): dwarf-reducer.ts (1),
  //   `tunnelTileLegalV7`, the canonical tile of a Tunnel, its rider, and an
  //   Assemble; query.ts (+2), the public tunnel and Assemble tile and the
  //   public Knockback (the canonical Knockback is the shared displacement
  //   rule in combat.ts). Tested in ruleset-v7-dwarf-tunnel.test.ts and
  //   ruleset-v7-dwarf-units.test.ts.
  it("is the only terrain-entry rule: the audited call sites of canEnterTerrainV7", () => {
    const AUDITED: Readonly<Record<string, number>> = {
      "src/engine/v7/combat.ts": 1,
      "src/engine/v7/eggs.ts": 2,
      "src/engine/v7/movement.ts": 3,
      "src/engine/v7/query.ts": 7,
      "src/engine/v7/reducer.ts": 5,
      "src/engine/v7/dwarf-reducer.ts": 1,
    };
    for (const [file, count] of Object.entries(AUDITED)) {
      const source = readFileSync(file, "utf8");
      expect(source.match(/canEnterTerrainV7\(\{/g)?.length ?? 0, file).toBe(
        count,
      );
    }
  });
});

describe("Stride (section 7.1)", () => {
  it("strides over a Mountain and a Forest without Engineering and without stopping", () => {
    const base = lone("CATAPULT", { techs: without("ENGINEERING") });
    const state = forestV7(mountainV7(base, at(3, 2)), at(4, 2));
    const run = go(state, at(2, 2), at(3, 2), at(4, 2));
    expect(unitAtV7(run.state, at(4, 2)).role).toBe("CATAPULT");
    // A Colossus (Move 1) ends on the Mountain.
    const colossus = mountainV7(
      lone("JUGGERNAUT", { techs: without("ENGINEERING") }),
      at(3, 2),
    );
    expect(
      unitAtV7(go(colossus, at(2, 2), at(3, 2)).state, at(3, 2)).form,
    ).toBe("LAND");
  });

  it("a foot unit still needs Engineering for a Mountain, and a Forest still stops a ground unit", () => {
    const grunt = mountainV7(
      lone("FIGHTER", { techs: without("ENGINEERING") }),
      at(3, 2),
    );
    expect(moveReason(grunt, at(2, 2), at(3, 2))).toBe("ENGINEERING_REQUIRED");
    // A Human Knight (Move 2) is stopped by the Forest it enters.
    const human = forestV7(
      martianFieldV7(
        [
          { seat: 0, role: "FIGHTER", at: at(9, 1) },
          { seat: 1, role: "KNIGHT", at: at(2, 2) },
        ],
        {
          activeSeat: 1,
          techs: { 1: withoutTechsV7("ORIGINAL", "FIELDCRAFT") },
        },
      ),
      at(3, 2),
    );
    expect(moveReason(human, at(2, 2), at(3, 2), at(4, 2))).toBe(
      "FOREST_STOPS_MOVE",
    );
  });

  it("hostile zone of control still ends a walker's Move", () => {
    const state = lone("CATAPULT", {}, [
      { seat: 1, role: "FIGHTER", at: at(3, 3) },
    ]);
    expect(moveReason(state, at(2, 2), at(3, 2), at(4, 2))).toBe(
      "ZOC_STOPS_MOVE",
    );
    // It passes its owner's units and is blocked by a hostile one.
    const blocked = lone("CATAPULT", {}, [
      { seat: 0, role: "FIGHTER", at: at(3, 2) },
      { seat: 1, role: "GUARD", at: at(2, 4) },
    ]);
    go(blocked, at(2, 2), at(3, 2), at(4, 2));
    expect(moveReason(blocked, at(2, 2), at(2, 3), at(2, 4))).toBeDefined();
    expect(moveReason(blocked, at(2, 2), at(3, 2))).toBe("OCCUPIED");
  });

  it("machines never get cover or fortification", () => {
    for (const role of [
      "CATAPULT",
      "JUGGERNAUT",
      "RAIDER",
      "KNIGHT",
    ] as const) {
      for (const terrain of ["FOREST", "MOUNTAIN"] as const) {
        const base = martianFieldV7(
          [
            { seat: 0, role, at: at(3, 2) },
            { seat: 1, role: "FIGHTER", at: at(4, 2) },
          ],
          { activeSeat: 1 },
        );
        const state =
          terrain === "FOREST"
            ? forestV7(base, at(3, 2))
            : mountainV7(base, at(3, 2));
        expect(
          attackV7(state, at(4, 2), at(3, 2)).combat,
          `${role} ${terrain}`,
        ).toMatchObject({
          defenseBonusNumerator: 1,
          defenseBonusDenominator: 1,
          fortificationLevel: 0,
        });
      }
    }
    // A Grunt on a Forest has cover.
    const grunt = forestV7(
      martianFieldV7(
        [
          { seat: 0, role: "FIGHTER", at: at(3, 2) },
          { seat: 1, role: "FIGHTER", at: at(4, 2) },
        ],
        { activeSeat: 1 },
      ),
      at(3, 2),
    );
    const cover = attackV7(grunt, at(4, 2), at(3, 2)).combat;
    expect(
      cover.defenseBonusNumerator / cover.defenseBonusDenominator,
    ).toBeGreaterThan(1);
  });

  it("Walls and Field Defense fortify a Martian foot unit and never a machine", () => {
    for (const [role, level] of [
      ["MARKSMAN", 3],
      ["FIGHTER", 3],
      ["GUARD", 3],
      ["CATAPULT", 0],
      ["JUGGERNAUT", 0],
      ["RAIDER", 0],
      ["KNIGHT", 0],
    ] as const) {
      const state = walledV7({
        defenderFaction: "MARTIAN",
        defender: role,
        attackers: [{ role: "FIGHTER", at: at(7, 8) }],
        attackerFaction: "ORIGINAL",
        fieldDefense: true,
      });
      expect(
        fortificationLevelForUnitV7(state, unitAtV7(state, at(8, 8))),
        role,
      ).toBe(level);
      expect(
        attackV7(state, at(7, 8), at(8, 8)).combat.fortificationLevel,
        role,
      ).toBe(level);
    }
  });
});

describe("Flying (section 7.2)", () => {
  it("passes over own and hostile units and never ends a Move on one", () => {
    const state = lone("RAIDER", {}, [
      { seat: 0, role: "FIGHTER", at: at(3, 2) },
      { seat: 1, role: "GUARD", at: at(4, 2) },
    ]);
    const run = go(state, at(2, 2), at(3, 2), at(4, 2), at(5, 2));
    expect(unitAtV7(run.state, at(5, 2)).role).toBe("RAIDER");
    expect(moveReason(state, at(2, 2), at(3, 2), at(4, 2))).toBe("OCCUPIED");
    expect(moveReason(state, at(2, 2), at(3, 2))).toBe("OCCUPIED");
    // A walker cannot pass the hostile Guard.
    const walker = lone("CATAPULT", {}, [
      { seat: 1, role: "GUARD", at: at(3, 2) },
    ]);
    expect(moveReason(walker, at(2, 2), at(3, 2), at(4, 2))).toBe("OCCUPIED");
  });

  it("ignores hostile zone of control", () => {
    const state = lone("RAIDER", {}, [
      { seat: 1, role: "FIGHTER", at: at(3, 3) },
      { seat: 1, role: "FIGHTER", at: at(4, 3) },
    ]);
    const run = go(state, at(2, 2), at(3, 2), at(4, 2), at(5, 2));
    expect(unitAtV7(run.state, at(5, 2)).role).toBe("RAIDER");
    expect(
      run.events.some((event) => event.kind === "UNIT_MOVE_INTERRUPTED"),
    ).toBe(false);
  });

  it("exerts no zone of control, occupies its tile, and cannot be passed by other players", () => {
    const build = (role: UnitRoleIdV7) =>
      martianFieldV7(
        [
          { seat: 0, role, at: at(4, 3) },
          { seat: 1, role: "RAIDER", at: at(5, 2) },
        ],
        { activeSeat: 1 },
      );
    // A Human Raider passes next to a Saucer or a Mothership freely.
    for (const role of ["RAIDER", "KNIGHT"] as const) {
      const state = build(role);
      go(state, at(5, 2), at(4, 2), at(3, 2));
      expect(moveReason(state, at(5, 2), at(4, 3))).toBe("OCCUPIED");
      expect(moveReason(state, at(5, 2), at(4, 3), at(3, 4))).toBe("OCCUPIED");
    }
    // A Grunt and a Tripod stop it.
    for (const role of ["FIGHTER", "CATAPULT"] as const)
      expect(moveReason(build(role), at(5, 2), at(4, 2), at(3, 2)), role).toBe(
        "ZOC_STOPS_MOVE",
      );
  });

  it("cannot end a Move on a village center or a foreign city center; may fly over them and stand on its own", () => {
    const village = martianFieldV7([
      { seat: 0, role: "RAIDER", at: at(5, 3) },
      { seat: 1, role: "FIGHTER", at: at(9, 1) },
    ]);
    expect(moveReason(village, at(5, 3), at(5, 4), at(5, 5))).toBe(
      "SETTLEMENT_FORBIDDEN",
    );
    go(village, at(5, 3), at(5, 4), at(5, 5), at(5, 6));
    const saucer = unitAtV7(village, at(5, 3)).id;
    const destinations = offeredV7(village, "MOVE").flatMap((command) =>
      command.kind === "MOVE" && command.unitId === saucer
        ? [command.path[command.path.length - 1] as CoordV7]
        : [],
    );
    expect(destinations.length).toBeGreaterThan(20);
    expect(destinations.some((where) => sameV7(where, at(5, 5)))).toBe(false);
    expect(destinations.some((where) => sameV7(where, at(5, 6)))).toBe(true);

    const hostile = martianFieldV7([
      { seat: 0, role: "KNIGHT", at: at(2, 6) },
      { seat: 1, role: "FIGHTER", at: at(9, 1) },
    ]);
    expect(moveReason(hostile, at(2, 6), at(2, 7), at(2, 8))).toBe(
      "SETTLEMENT_FORBIDDEN",
    );

    const own = martianFieldV7([
      { seat: 0, role: "KNIGHT", at: at(8, 6) },
      { seat: 1, role: "FIGHTER", at: at(9, 1) },
    ]);
    const home = go(own, at(8, 6), at(8, 7), at(8, 8));
    expect(unitAtV7(home.state, at(8, 8)).role).toBe("KNIGHT");

    // A Grunt and a Tripod end a Move on a village center.
    for (const role of ["FIGHTER", "CATAPULT"] as const) {
      const walker = martianFieldV7([
        { seat: 0, role, at: at(5, 4) },
        { seat: 1, role: "FIGHTER", at: at(9, 1) },
      ]);
      expect(
        unitAtV7(go(walker, at(5, 4), at(5, 5)).state, at(5, 5)).role,
      ).toBe(role);
    }
  });

  it("an embarked flyer cannot land on a forbidden center", () => {
    const state = martianFieldV7(
      [
        { seat: 0, role: "RAIDER", at: at(4, 5), form: "EMBARKED" },
        { seat: 1, role: "FIGHTER", at: at(9, 1) },
      ],
      { water: [at(4, 5)] },
    );
    const saucer = unitAtV7(state, at(4, 5)).id;
    const error = rejectedV7(state, {
      kind: "DISEMBARK",
      unitId: saucer,
      at: at(5, 5),
    });
    expect(error).toEqual({
      code: "MOVEMENT_ILLEGAL",
      params: { reason: "SETTLEMENT_FORBIDDEN" },
    });
    const landing = playV7(state, {
      kind: "DISEMBARK",
      unitId: saucer,
      at: at(4, 4),
    });
    expect(unitAtV7(landing.state, at(4, 4)).form).toBe("LAND");
    // An embarked Grunt lands on the village center.
    const grunt = martianFieldV7(
      [
        { seat: 0, role: "FIGHTER", at: at(4, 5), form: "EMBARKED" },
        { seat: 1, role: "FIGHTER", at: at(9, 1) },
      ],
      { water: [at(4, 5)] },
    );
    playV7(grunt, {
      kind: "DISEMBARK",
      unitId: unitAtV7(grunt, at(4, 5)).id,
      at: at(5, 5),
    });
  });

  it("never advances after a kill, never captures, and cannot Pillage", () => {
    for (const role of ["RAIDER", "KNIGHT"] as const) {
      const state = martianFieldV7([
        { seat: 0, role, at: at(4, 2) },
        { seat: 1, role: "FIGHTER", at: at(5, 2), hp: 1 },
      ]);
      const run = attackV7(state, at(4, 2), at(5, 2));
      expect(run.combat).toMatchObject({
        defenderDies: true,
        advances: false,
        overrunAdvance: false,
        overrunContinues: false,
      });
      expect(run.attacker?.at).toEqual(at(4, 2));
    }
    // On a hostile Farm (7, 8) of the grown Human capital: a Grunt and a
    // Tripod may Pillage, a flyer may not.
    for (const [role, pillages] of [
      ["FIGHTER", true],
      ["CATAPULT", true],
      ["RAIDER", false],
      ["KNIGHT", false],
    ] as const) {
      const walled = walledV7({
        attackerFaction: "MARTIAN",
        attackers: [{ role, at: at(6, 8) }],
      });
      expect(tileV7(walled, at(7, 8)).improvement).toBe("FARM");
      const state = applyOkV7(
        walled,
        activeIdV7(walled),
        move(walled, at(6, 8), at(7, 8)),
      ).state;
      const command: CommandV7 = {
        kind: "PILLAGE",
        unitId: unitAtV7(state, at(7, 8)).id,
      };
      if (pillages) playV7(state, command);
      else rejectedV7(state, command);
      expect(offeredV7(state, "CAPTURE"), role).toEqual([]);
    }
  });

  it("never destroys Field Defense by entering a tile, unlike a unit on the ground", () => {
    for (const [role, destroyed] of [
      ["RAIDER", false],
      ["KNIGHT", false],
      ["CATAPULT", true],
      ["FIGHTER", true],
    ] as const) {
      const state = fieldDefenseV7(
        martianFieldV7([
          { seat: 0, role, at: at(4, 7) },
          { seat: 1, role: "FIGHTER", at: at(1, 9) },
        ]),
        at(3, 7),
      );
      const run = go(state, at(4, 7), at(3, 7));
      expect(tileV7(run.state, at(3, 7)).fieldDefense, role).toBe(!destroyed);
      expect(
        kindsV7(run.events).includes("FIELD_DEFENSE_DESTROYED"),
        role,
      ).toBe(destroyed);
    }
  });
});

describe("crossing water and self-launch (section 7.3)", () => {
  it("a machine crosses Shallow Water inside a Move without a Port or Shorecraft; a foot unit does not", () => {
    for (const role of ["RAIDER", "KNIGHT", "CATAPULT"] as const) {
      const state = lone(role, {
        water: [at(3, 2)],
        techs: without("SHORECRAFT"),
      });
      const run = go(state, at(2, 2), at(3, 2), at(4, 2));
      expect(unitAtV7(run.state, at(4, 2)), role).toMatchObject({
        role,
        form: "LAND",
      });
      expect(kindsV7(run.events)).not.toContain("UNIT_EMBARKED");
    }
    for (const role of ["FIGHTER", "MARKSMAN", "GUARD", "CAPTAIN"] as const) {
      const state = lone(role, { water: [at(3, 2)] });
      rejectedV7(state, move(state, at(2, 2), at(3, 2)));
    }
  });

  it("Deep Water: a flyer with Navigation only; a walker never in land form", () => {
    const deep = { deepWater: [at(3, 2)] };
    const saucer = lone("RAIDER", deep);
    go(saucer, at(2, 2), at(3, 2), at(4, 2));
    const noNavigation = lone("RAIDER", {
      ...deep,
      techs: without("NAVIGATION"),
    });
    rejectedV7(noNavigation, move(noNavigation, at(2, 2), at(3, 2), at(4, 2)));
    rejectedV7(noNavigation, move(noNavigation, at(2, 2), at(3, 2)));
    const tripod = lone("CATAPULT", deep);
    rejectedV7(tripod, move(tripod, at(2, 2), at(3, 2), at(4, 2)));
    rejectedV7(tripod, move(tripod, at(2, 2), at(3, 2)));
  });

  it("self-launch: a Move that ends on water embarks the machine there, exhausted", () => {
    for (const role of [
      "RAIDER",
      "KNIGHT",
      "CATAPULT",
      "JUGGERNAUT",
    ] as const) {
      const state = lone(role, {
        water: [at(3, 2)],
        techs: without("SHORECRAFT"),
      });
      const run = go(state, at(2, 2), at(3, 2));
      const unit = unitAtV7(run.state, at(3, 2));
      expect(unit.form, role).toBe("EMBARKED");
      expect(unit.activation, role).toMatchObject({
        moved: true,
        attacked: true,
        handled: true,
      });
      expect(tileV7(run.state, at(3, 2)).improvement).toBeNull();
      expect(run.events, role).toContainEqual(
        expect.objectContaining({ kind: "UNIT_EMBARKED", unitId: unit.id }),
      );
      // It keeps its Shield afloat.
      expect(run.state.shields).toEqual(state.shields);
      // Nothing more this turn.
      expect(
        offeredV7(run.state).filter(
          (command) => "unitId" in command && command.unitId === unit.id,
        ),
      ).toEqual([]);
    }
    // A flyer self-launches on Deep Water with Navigation only.
    const deep = lone("KNIGHT", { deepWater: [at(3, 2)] });
    expect(unitAtV7(go(deep, at(2, 2), at(3, 2)).state, at(3, 2)).form).toBe(
      "EMBARKED",
    );
    // No unit on the tile.
    const taken = lone("RAIDER", { water: [at(3, 2)] }, [
      { seat: 0, role: "PATROL_BOAT", at: at(3, 2), form: "NAVAL" },
    ]);
    expect(moveReason(taken, at(2, 2), at(3, 2))).toBe("OCCUPIED");
  });

  it("afloat, a machine is an ordinary embarked unit: Deep Water with Navigation, landing on a Mountain", () => {
    const options = {
      water: [at(3, 2)],
      deepWater: [at(4, 2)],
      techs: without("ENGINEERING"),
    };
    const pieces = (role: UnitRoleIdV7): MartianPieceV7[] => [
      { seat: 0, role, at: at(3, 2), form: "EMBARKED" },
      { seat: 1, role: "FIGHTER", at: at(9, 1) },
    ];
    for (const role of ["CATAPULT", "RAIDER"] as const) {
      const state = mountainV7(martianFieldV7(pieces(role), options), at(3, 3));
      const unitId = unitAtV7(state, at(3, 2)).id;
      // A walker afloat enters Deep Water with Navigation.
      go(state, at(3, 2), at(4, 2));
      // It lands on the Mountain without Engineering; landing ends its turn.
      const landed = playV7(state, { kind: "DISEMBARK", unitId, at: at(3, 3) });
      expect(unitAtV7(landed.state, at(3, 3))).toMatchObject({
        form: "LAND",
        activation: { handled: true },
      });
      // No Attack, ability, or zone of control afloat.
      expect(
        offeredV7(state).some(
          (command) =>
            command.kind === "ATTACK" ||
            command.kind === "BEAM_DOWN" ||
            command.kind === "TRACTOR_BEAM",
        ),
      ).toBe(false);
    }
    const grunt = mountainV7(
      martianFieldV7(pieces("FIGHTER"), options),
      at(3, 3),
    );
    rejectedV7(grunt, {
      kind: "DISEMBARK",
      unitId: unitAtV7(grunt, at(3, 2)).id,
      at: at(3, 3),
    });
    const noNavigation = martianFieldV7(pieces("CATAPULT"), {
      ...options,
      techs: without("NAVIGATION"),
    });
    rejectedV7(noNavigation, move(noNavigation, at(3, 2), at(4, 2)));
  });

  it("a Move stopped on an unexplored water tile embarks the machine there", () => {
    // Sight reveals the tiles ahead of every step, so only the first step
    // of a Move can enter an unexplored cell.
    const base = lone("RAIDER", { water: [at(3, 2)] });
    const state = unexploreV7(base, 0, [at(3, 2)]);
    // A Move ends on entering an unexplored cell.
    expect(moveReason(state, at(2, 2), at(3, 2), at(4, 2))).toBe(
      "UNEXPLORED_INTERMEDIATE",
    );
    const run = go(state, at(2, 2), at(3, 2));
    expect(unitAtV7(run.state, at(3, 2)).form).toBe("EMBARKED");
    expect(kindsV7(run.events)).toContain("UNIT_EMBARKED");
  });
});

describe("interrupted Moves (section 7.2, hidden units)", () => {
  it("a flyer that meets a hidden unit stays on the last tile it may end on", () => {
    const base = lone("RAIDER", {}, [
      { seat: 1, role: "FIGHTER", at: at(4, 2) },
    ]);
    const state = unexploreV7(base, 0, [at(4, 2)]);
    const run = go(state, at(2, 2), at(3, 2), at(4, 2));
    expect(unitAtV7(run.state, at(3, 2)).role).toBe("RAIDER");
    expect(run.events).toContainEqual(
      // The event reports the tile that stopped the Move.
      expect.objectContaining({
        kind: "UNIT_MOVE_INTERRUPTED",
        at: at(4, 2),
        reason: "OCCUPIED",
      }),
    );
  });

  it("the last free tile is behind a unit it flew over, or its starting tile", () => {
    const base = lone("RAIDER", {}, [
      { seat: 0, role: "FIGHTER", at: at(3, 2) },
      { seat: 1, role: "FIGHTER", at: at(4, 2) },
    ]);
    const state = unexploreV7(base, 0, [at(4, 2)]);
    const run = go(state, at(2, 2), at(3, 2), at(4, 2));
    expect(unitAtV7(run.state, at(2, 2)).role).toBe("RAIDER");
    expect(unitAtV7(run.state, at(3, 2)).role).toBe("FIGHTER");
    expect(run.events).toContainEqual(
      expect.objectContaining({ kind: "UNIT_MOVE_INTERRUPTED", at: at(4, 2) }),
    );
  });

  it("a flyer that enters an unexplored forbidden center stays on the tile before it", () => {
    const base = martianFieldV7([
      { seat: 0, role: "RAIDER", at: at(5, 3) },
      { seat: 1, role: "FIGHTER", at: at(9, 1) },
    ]);
    const state = unexploreV7(base, 0, [at(5, 5)]);
    const run = go(state, at(5, 3), at(5, 4), at(5, 5));
    expect(unitAtV7(run.state, at(5, 4)).role).toBe("RAIDER");
    expect(hasUnitAtV7(run.state, at(5, 5))).toBe(false);
    expect(run.events).toContainEqual(
      expect.objectContaining({
        kind: "UNIT_MOVE_INTERRUPTED",
        at: at(5, 5),
        reason: "SETTLEMENT_FORBIDDEN",
      }),
    );
  });
});

describe("advance and Push through the shared rule", () => {
  it("a Colossus advances onto a Mountain without Engineering; a Ray Gunner does not", () => {
    for (const [role, advances] of [
      ["JUGGERNAUT", true],
      ["MARKSMAN", false],
    ] as const) {
      const state = mountainV7(
        martianFieldV7(
          [
            { seat: 0, role, at: at(4, 2) },
            { seat: 1, role: "FIGHTER", at: at(5, 2), hp: 1 },
          ],
          { techs: without("ENGINEERING") },
        ),
        at(5, 2),
      );
      const run = attackV7(state, at(4, 2), at(5, 2));
      expect(run.combat.advances, role).toBe(advances);
      expect(run.attacker?.at, role).toEqual(advances ? at(5, 2) : at(4, 2));
    }
  });

  it("Push onto a Mountain: a walker and a flyer without Engineering, never a Grunt; a flyer is not pushed onto water", () => {
    for (const [role, push] of [
      ["CATAPULT", "WILL_PUSH"],
      ["RAIDER", "WILL_PUSH"],
      ["FIGHTER", "BLOCKED"],
    ] as const) {
      const state = mountainV7(
        martianFieldV7(
          [
            { seat: 0, role, at: at(4, 2) },
            // A wounded Juggernaut: its hit must not kill the target.
            { seat: 1, role: "JUGGERNAUT", at: at(5, 2), hp: 4 },
          ],
          { activeSeat: 1, techs: without("ENGINEERING") },
        ),
        at(3, 2),
      );
      const run = attackV7(state, at(5, 2), at(4, 2));
      expect(run.combat.push, role).toBe(push);
      expect(run.target?.at, role).toEqual(
        push === "WILL_PUSH" ? at(3, 2) : at(4, 2),
      );
    }
    const water = martianFieldV7(
      [
        { seat: 0, role: "RAIDER", at: at(4, 2) },
        { seat: 1, role: "JUGGERNAUT", at: at(5, 2), hp: 4 },
      ],
      { activeSeat: 1, water: [at(3, 2)] },
    );
    expect(attackV7(water, at(5, 2), at(4, 2)).combat.push).toBe("BLOCKED");
  });
});

describe("offered Moves are accepted", () => {
  it("for every machine and foot unit on a board with water, a Mountain, units, and a village", () => {
    const base = martianFieldV7(
      [
        { seat: 0, role: "RAIDER", at: at(4, 4) },
        { seat: 0, role: "KNIGHT", at: at(6, 4) },
        { seat: 0, role: "CATAPULT", at: at(4, 6) },
        { seat: 0, role: "JUGGERNAUT", at: at(6, 6) },
        { seat: 0, role: "FIGHTER", at: at(5, 4) },
        { seat: 0, role: "RAIDER", at: at(3, 5), form: "EMBARKED" },
        { seat: 1, role: "FIGHTER", at: at(5, 6) },
        { seat: 1, role: "GUARD", at: at(3, 3) },
      ],
      {
        water: [at(3, 4), at(3, 5), at(4, 3)],
        deepWater: [at(2, 4)],
        techs: without("ENGINEERING", "NAVIGATION"),
      },
    );
    const state = forestV7(mountainV7(base, at(5, 3)), at(7, 5));
    const commands = expectOfferedAcceptedV7(state, "MOVE", "DISEMBARK");
    expect(commands.length).toBeGreaterThan(40);
    const ends = (where: CoordV7) =>
      commands.some(
        (command) =>
          command.kind === "MOVE" &&
          sameV7(command.path[command.path.length - 1] as CoordV7, where),
      );
    // Somebody may end on the Mountain and on Shallow Water; nobody on the
    // village center occupied by nobody but forbidden to flyers ... a Grunt
    // may, so only Deep Water (no Navigation) is unreachable.
    expect(ends(at(5, 3))).toBe(true);
    expect(ends(at(4, 3))).toBe(true);
    expect(ends(at(2, 4))).toBe(false);
  });
});
