import { describe, expect, it } from "vitest";
import {
  applyCommandV7,
  calculateCombatPreviewV7,
  fortificationLevelForUnitV7,
  halfPowerAttack2V7,
  parseGameStateV7,
  pierceTileV7,
  previewAttackExplosionsV7,
  queryCombatPreviewV7,
  queryPlayerCommandsV7,
  viewForV7,
  type CoordV7,
  type FactionIdV7,
  type GameStateV7,
  type UnitRoleIdV7,
} from "../../src/engine/index";
import { checkedV7 } from "../fixtures/v7-builders";
import {
  applyOkV7,
  endTurnUntilV7,
  seatIdV7,
  unitAtV7,
} from "../fixtures/v7-goblin-arena";
import {
  hasUnitAtV7,
  martianFieldV7,
  shieldAtV7,
  type MartianPieceV7,
} from "../fixtures/v7-martian";
import {
  activeIdV7,
  at,
  attackV7,
  fieldDefenseV7,
  kindsV7,
  moveV7,
  movedV7,
  patchUnitV7,
  tileV7,
  unexploreV7,
  walledV7,
  withoutTechsV7,
} from "../fixtures/v7-revision20";

// The Martian revision, section 6 (docs/product/RULESET_7_MARTIANS.md): heat
// rays, Cooling, Pierce, and the Disintegrator.

type RayRole = "MARKSMAN" | "CATAPULT" | "JUGGERNAUT";

/** Every Martian technology except the Disintegrator (`EXPLOSIVES`). */
const NO_DISINTEGRATOR = { 0: withoutTechsV7("MARTIAN", "EXPLOSIVES") };

/**
 * The whole hit (Shield plus HP damage) of a ray fired by `role` from
 * (3, 2) at a target of `targetRole` on (5, 2), range 2, open Grass.
 */
function openHit(
  role: RayRole,
  power: "FULL" | "HALF",
  targetRole: UnitRoleIdV7,
  opponent: FactionIdV7 = "ORIGINAL",
  inspired = false,
): number {
  const state = martianFieldV7(
    [
      {
        seat: 0,
        role,
        at: at(3, 2),
        activation: {
          ...(power === "HALF" ? movedV7(1) : {}),
          ...(inspired ? { inspired: true } : {}),
        },
      },
      { seat: 1, role: targetRole, at: at(5, 2) },
    ],
    { factions: ["MARTIAN", opponent], techs: NO_DISINTEGRATOR },
  );
  const preview = queryCombatPreviewV7(
    viewForV7(state, activeIdV7(state)),
    unitAtV7(state, at(3, 2)).id,
    unitAtV7(state, at(5, 2)).id,
  );
  if (preview === null) throw new Error("no preview");
  expect(preview.rayPower).toBe(power);
  expect(preview.coolingApplied).toBe(power === "FULL");
  return uncapped(state, at(3, 2), at(5, 2));
}

/**
 * The formula damage of the attack: `damageToDefender` is capped at the
 * target's HP, so a killing hit is read from a target patched to a large
 * maximum HP at the same full-health ratio.
 */
function uncapped(state: GameStateV7, from: CoordV7, to: CoordV7): number {
  const big: GameStateV7 = {
    ...state,
    units: state.units.map((unit) =>
      unit.id === unitAtV7(state, to).id
        ? { ...unit, hp: unit.hp * 10, maxHp: unit.maxHp * 10 }
        : unit,
    ),
  };
  const preview = calculateCombatPreviewV7(
    big,
    unitAtV7(big, from).id,
    unitAtV7(big, to).id,
  );
  return preview.damageToDefender + preview.defenderShieldDamage;
}

describe("Martian heat rays: full and half power (sections 6.1 and 6.3)", () => {
  it("halves the role's base Attack, rounding down", () => {
    expect(halfPowerAttack2V7(6)).toBe(3);
    expect(halfPowerAttack2V7(8)).toBe(4);
    expect(halfPowerAttack2V7(5)).toBe(2);
  });

  it("attack2 is the role's at full power and half of it after a Move, for each ray unit", () => {
    for (const [role, full, half] of [
      ["MARKSMAN", 6, 3],
      ["CATAPULT", 8, 4],
      ["JUGGERNAUT", 8, 4],
    ] as const) {
      for (const moved of [false, true]) {
        const state = martianFieldV7([
          {
            seat: 0,
            role,
            at: at(3, 2),
            activation: moved ? movedV7(1) : {},
          },
          { seat: 1, role: "JUGGERNAUT", at: at(5, 2) },
        ]);
        const run = attackV7(state, at(3, 2), at(5, 2));
        expect(run.combat).toMatchObject({
          attack2: moved ? half : full,
          rayPower: moved ? "HALF" : "FULL",
          coolingApplied: !moved,
        });
      }
    }
  });

  it("every row of the section 6.3 table: open Grass, range 2", () => {
    const rows: readonly (readonly [
      UnitRoleIdV7,
      FactionIdV7,
      number,
      number,
      number,
      number,
    ])[] = [
      // target, faction, Ray Gunner full/half, Tripod or Colossus full/half
      ["FIGHTER", "ORIGINAL", 8, 3, 12, 5],
      ["GUARD", "ORIGINAL", 7, 2, 10, 4],
      ["RAIDER", "ORIGINAL", 10, 4, 14, 6],
      ["KNIGHT", "ORIGINAL", 10, 4, 14, 6],
      ["MARKSMAN", "ORIGINAL", 10, 4, 14, 6],
      // The Zombie is the Undead `GUARD` role (18 HP, Defense 2).
      ["GUARD", "UNDEAD", 8, 3, 12, 5],
    ];
    for (const [
      target,
      faction,
      gunnerFull,
      gunnerHalf,
      bigFull,
      bigHalf,
    ] of rows) {
      const label = `${faction} ${target}`;
      expect(openHit("MARKSMAN", "FULL", target, faction), label).toBe(
        gunnerFull,
      );
      expect(openHit("MARKSMAN", "HALF", target, faction), label).toBe(
        gunnerHalf,
      );
      for (const role of ["CATAPULT", "JUGGERNAUT"] as const) {
        expect(openHit(role, "FULL", target, faction), label).toBe(bigFull);
        expect(openHit(role, "HALF", target, faction), label).toBe(bigHalf);
      }
    }
  });

  it("the section 6.3 rows of a Guard on Field Defense and on a Walled center", () => {
    // Field Defense on an own-territory tile of seat 1; shooter at range 2.
    for (const [role, power, hit] of [
      ["MARKSMAN", "FULL", 6],
      ["MARKSMAN", "HALF", 2],
      ["CATAPULT", "FULL", 9],
      ["CATAPULT", "HALF", 3],
      ["JUGGERNAUT", "FULL", 9],
      ["JUGGERNAUT", "HALF", 3],
    ] as const) {
      const state = fieldDefenseV7(
        martianFieldV7(
          [
            {
              seat: 0,
              role,
              at: at(5, 7),
              activation: power === "HALF" ? movedV7(1) : {},
            },
            { seat: 1, role: "GUARD", at: at(3, 7) },
          ],
          { techs: NO_DISINTEGRATOR },
        ),
        at(3, 7),
      );
      expect(
        fortificationLevelForUnitV7(state, unitAtV7(state, at(3, 7))),
      ).toBe(1);
      expect(uncapped(state, at(5, 7), at(3, 7)), `${role} ${power}`).toBe(hit);
    }
    // A Walled center: the Guard of seat 0 on (8, 8), the shooter on (6, 8).
    for (const [role, power, hit] of [
      ["MARKSMAN", "FULL", 5],
      ["MARKSMAN", "HALF", 2],
      ["CATAPULT", "FULL", 8],
      ["CATAPULT", "HALF", 3],
      ["JUGGERNAUT", "FULL", 8],
      ["JUGGERNAUT", "HALF", 3],
    ] as const) {
      const walled = walledV7({
        attackerFaction: "MARTIAN",
        attackers: [{ role, at: at(6, 8) }],
        attackerTechs: withoutTechsV7("MARTIAN", "EXPLOSIVES"),
      });
      const state =
        power === "HALF"
          ? patchUnitV7(walled, at(6, 8), {
              activation: {
                ...unitAtV7(walled, at(6, 8)).activation,
                ...movedV7(1),
              },
            })
          : walled;
      expect(
        fortificationLevelForUnitV7(state, unitAtV7(state, at(8, 8))),
      ).toBe(2);
      expect(uncapped(state, at(6, 8), at(8, 8)), `${role} ${power}`).toBe(hit);
    }
  });

  it("Psychic Command adds 1 Attack after the halving: 12 and 6 on a Fighter", () => {
    expect(openHit("MARKSMAN", "FULL", "FIGHTER", "ORIGINAL", true)).toBe(12);
    expect(openHit("MARKSMAN", "HALF", "FIGHTER", "ORIGINAL", true)).toBe(6);
    const state = martianFieldV7([
      {
        seat: 0,
        role: "MARKSMAN",
        at: at(3, 2),
        activation: { ...movedV7(1), inspired: true },
      },
      { seat: 1, role: "FIGHTER", at: at(5, 2) },
    ]);
    // Half of 6 is 3, plus 2 half-units of Psychic Command.
    expect(attackV7(state, at(3, 2), at(5, 2)).combat).toMatchObject({
      attack2: 5,
      inspiredApplied: true,
      rayPower: "HALF",
    });
  });

  it("Psychic Command reaches Grunts, Ray Gunners, and the Colossus, never a Tripod or another Brain", () => {
    const state = martianFieldV7([
      { seat: 0, role: "CAPTAIN", at: at(4, 3) },
      { seat: 0, role: "FIGHTER", at: at(3, 2) },
      { seat: 0, role: "MARKSMAN", at: at(4, 2) },
      { seat: 0, role: "CATAPULT", at: at(5, 2) },
      { seat: 0, role: "JUGGERNAUT", at: at(3, 3) },
      { seat: 0, role: "CAPTAIN", at: at(5, 3) },
      { seat: 0, role: "RAIDER", at: at(3, 4) },
      { seat: 0, role: "KNIGHT", at: at(4, 4) },
      { seat: 0, role: "GUARD", at: at(5, 4) },
      { seat: 1, role: "FIGHTER", at: at(1, 1) },
    ]);
    const brain = unitAtV7(state, at(4, 3));
    const result = applyOkV7(state, activeIdV7(state), {
      kind: "RALLY",
      unitId: brain.id,
    });
    const inspired = result.state.units
      .filter((unit) => unit.activation.inspired)
      .map((unit) => unit.role)
      .sort();
    expect(inspired).toEqual(
      ["FIGHTER", "GUARD", "JUGGERNAUT", "KNIGHT", "MARKSMAN", "RAIDER"].sort(),
    );
    expect(kindsV7(result.events)).toContain("UNITS_RALLIED");
    // A Brain has no Tend Wounded.
    const tend = applyCommandV7(state, activeIdV7(state), {
      kind: "TEND_WOUNDED",
      unitId: brain.id,
    });
    expect(tend.accepted).toBe(false);
    if (!tend.accepted) expect(tend.error.code).toBe("UNIT_ROLE_INVALID");
    expect(
      queryPlayerCommandsV7(viewForV7(state, activeIdV7(state))).some(
        (command) => command.kind === "TEND_WOUNDED",
      ),
    ).toBe(false);
  });

  it("a ray unit's retaliation is never halved and never causes Cooling", () => {
    const hits = (["READY", "COOLING"] as const).map((mode) => {
      const state = martianFieldV7(
        [
          {
            seat: 0,
            role: "MARKSMAN",
            at: at(3, 2),
            ...(mode === "COOLING" ? { cooling: "COOLING" as const } : {}),
          },
          { seat: 1, role: "MARKSMAN", at: at(5, 2) },
        ],
        { activeSeat: 1 },
      );
      const run = attackV7(state, at(5, 2), at(3, 2));
      expect(run.combat).toMatchObject({
        retaliation: true,
        rayPower: "NONE",
        coolingApplied: false,
      });
      expect(run.state.cooling).toEqual(state.cooling);
      return run.combat.damageToAttacker;
    });
    expect(hits[0]).toBeGreaterThan(0);
    expect(hits[1]).toBe(hits[0]);
  });

  it("an attack by a unit without a heat ray is no ray", () => {
    const state = martianFieldV7([
      { seat: 0, role: "FIGHTER", at: at(4, 2) },
      { seat: 1, role: "FIGHTER", at: at(5, 2) },
    ]);
    const run = attackV7(state, at(4, 2), at(5, 2));
    expect(run.combat).toMatchObject({
      rayPower: "NONE",
      coolingApplied: false,
    });
    expect(run.state.cooling).toEqual([]);
  });
});

describe("Martian heat rays: Cooling (section 6.2)", () => {
  it("full, half, full: Cooling lasts through the owner's next turn and ends at that End Turn", () => {
    let state = martianFieldV7([
      { seat: 0, role: "MARKSMAN", at: at(3, 2) },
      { seat: 1, role: "JUGGERNAUT", at: at(5, 2) },
    ]);
    const martian = seatIdV7(state, 0);
    const other = seatIdV7(state, 1);
    const gunner = unitAtV7(state, at(3, 2)).id;

    const first = attackV7(state, at(3, 2), at(5, 2));
    expect(first.combat).toMatchObject({
      rayPower: "FULL",
      coolingApplied: true,
      attack2: 6,
    });
    expect(first.state.cooling).toEqual([
      { unitId: gunner, firedThisTurn: true },
    ]);
    // Cooling is public.
    expect(viewForV7(first.state, other).cooling).toEqual(first.state.cooling);

    // The owner's End Turn starts the Cooling.
    state = endTurnUntilV7(first.state, other).state;
    expect(state.cooling).toEqual([{ unitId: gunner, firedThisTurn: false }]);
    state = endTurnUntilV7(state, martian).state;
    expect(state.cooling).toEqual([{ unitId: gunner, firedThisTurn: false }]);

    // The Cooling turn: half power, and the half shot changes nothing.
    const second = attackV7(state, at(3, 2), at(5, 2));
    expect(second.combat).toMatchObject({
      rayPower: "HALF",
      coolingApplied: false,
      attack2: 3,
    });
    expect(second.state.cooling).toEqual([
      { unitId: gunner, firedThisTurn: false },
    ]);

    // That End Turn removes the entry; the next shot is full again.
    state = endTurnUntilV7(second.state, other).state;
    expect(state.cooling).toEqual([]);
    state = endTurnUntilV7(state, martian).state;
    const third = attackV7(state, at(3, 2), at(5, 2));
    expect(third.combat).toMatchObject({ rayPower: "FULL", attack2: 6 });
    expect(third.combat.damageToDefender).toBeGreaterThan(
      second.combat.damageToDefender,
    );
  });

  it("a half-power shot after a Move leaves no Cooling", () => {
    const state = martianFieldV7([
      { seat: 0, role: "CATAPULT", at: at(2, 2) },
      { seat: 1, role: "JUGGERNAUT", at: at(5, 2) },
    ]);
    const moved = moveV7(state, at(2, 2), [at(3, 2)]).state;
    const run = attackV7(moved, at(3, 2), at(5, 2));
    expect(run.combat).toMatchObject({
      rayPower: "HALF",
      coolingApplied: false,
      attack2: 4,
    });
    expect(run.state.cooling).toEqual([]);
  });

  it("changes nothing but the ray's power: Defense, Shield, and Move stay", () => {
    const build = (cooling: boolean) =>
      martianFieldV7(
        [
          {
            seat: 0,
            role: "CATAPULT",
            at: at(3, 2),
            ...(cooling ? { cooling: "COOLING" as const } : {}),
          },
          { seat: 1, role: "FIGHTER", at: at(4, 2) },
        ],
        { activeSeat: 1 },
      );
    const ready = attackV7(build(false), at(4, 2), at(3, 2));
    const cooling = attackV7(build(true), at(4, 2), at(3, 2));
    expect(cooling.combat.damageToDefender).toBe(ready.combat.damageToDefender);
    expect(cooling.combat.defenderShieldDamage).toBe(2);
    expect(cooling.combat.damageToAttacker).toBe(ready.combat.damageToAttacker);
    // A Cooling Tripod still moves two tiles.
    const own = martianFieldV7([
      { seat: 0, role: "CATAPULT", at: at(3, 2), cooling: "COOLING" },
      { seat: 1, role: "FIGHTER", at: at(1, 1) },
    ]);
    expect(
      unitAtV7(moveV7(own, at(3, 2), [at(4, 2), at(5, 2)]).state, at(5, 2))
        .role,
    ).toBe("CATAPULT");
  });

  it("is kept across embarking and ends when the unit leaves the board", () => {
    const state = martianFieldV7(
      [
        { seat: 0, role: "CATAPULT", at: at(3, 2), cooling: "COOLING" },
        { seat: 0, role: "MARKSMAN", at: at(3, 4), cooling: "COOLING" },
        { seat: 1, role: "KNIGHT", at: at(4, 5) },
      ],
      { water: [at(4, 2)] },
    );
    const tripod = unitAtV7(state, at(3, 2)).id;
    // The Tripod wades in (self-launch) and keeps its entry.
    const launched = moveV7(state, at(3, 2), [at(4, 2)]).state;
    expect(unitAtV7(launched, at(4, 2)).form).toBe("EMBARKED");
    expect(launched.cooling.map((entry) => entry.unitId)).toContain(tripod);
    // The Ray Gunner dies on the enemy turn: its entry goes with it.
    const enemyTurn = endTurnUntilV7(launched, seatIdV7(launched, 1)).state;
    // (End Turn removed both Cooling entries; give the Gunner a fresh one.)
    expect(enemyTurn.cooling).toEqual([]);
    const fired = martianFieldV7(
      [
        { seat: 0, role: "MARKSMAN", at: at(3, 4), hp: 1, shield: 0 },
        { seat: 1, role: "KNIGHT", at: at(4, 5) },
      ],
      { activeSeat: 1 },
    );
    const withEntry = checkedV7({
      ...fired,
      cooling: [{ unitId: unitAtV7(fired, at(3, 4)).id, firedThisTurn: false }],
    });
    const killed = attackV7(withEntry, at(4, 5), at(3, 4));
    expect(killed.target).toBeUndefined();
    expect(killed.state.cooling).toEqual([]);
  });

  it("rejects a malformed Cooling list", () => {
    const state = martianFieldV7([
      { seat: 0, role: "MARKSMAN", at: at(3, 2) },
      { seat: 0, role: "CATAPULT", at: at(3, 3) },
      { seat: 0, role: "FIGHTER", at: at(3, 4) },
      { seat: 1, role: "MARKSMAN", at: at(1, 1) },
    ]);
    const id = (where: CoordV7) => unitAtV7(state, where).id;
    const parse = (cooling: unknown) =>
      parseGameStateV7(JSON.parse(JSON.stringify({ ...state, cooling })));
    expect(
      parse([
        { unitId: id(at(3, 2)), firedThisTurn: true },
        { unitId: id(at(3, 3)), firedThisTurn: false },
      ]),
    ).not.toBeNull();
    const bad: readonly unknown[] = [
      // no living unit
      [{ unitId: 9999, firedThisTurn: false }],
      // a role without a heat ray under its owner's registration
      [{ unitId: id(at(3, 4)), firedThisTurn: false }],
      // a Human Marksman has no heat ray
      [{ unitId: id(at(1, 1)), firedThisTurn: false }],
      // duplicate
      [
        { unitId: id(at(3, 2)), firedThisTurn: false },
        { unitId: id(at(3, 2)), firedThisTurn: false },
      ],
      // unsorted
      [
        { unitId: id(at(3, 3)), firedThisTurn: false },
        { unitId: id(at(3, 2)), firedThisTurn: false },
      ],
      // non-boolean flag
      [{ unitId: id(at(3, 2)), firedThisTurn: 1 }],
      "nope",
    ];
    for (const cooling of bad)
      expect(parse(cooling), JSON.stringify(cooling)).toBeNull();
    // `firedThisTurn: true` for a unit of a player other than the active one.
    const otherTurn = endTurnUntilV7(state, seatIdV7(state, 1)).state;
    expect(
      parseGameStateV7(
        JSON.parse(
          JSON.stringify({
            ...otherTurn,
            cooling: [{ unitId: id(at(3, 2)), firedThisTurn: true }],
          }),
        ),
      ),
    ).toBeNull();
    expect(
      parseGameStateV7(
        JSON.parse(
          JSON.stringify({
            ...otherTurn,
            cooling: [{ unitId: id(at(3, 2)), firedThisTurn: false }],
          }),
        ),
      ),
    ).not.toBeNull();
  });
});

describe("Martian heat rays: Pierce (section 6.4)", () => {
  const DIRECTIONS = [
    [1, 0],
    [1, 1],
    [0, 1],
    [-1, 1],
    [-1, 0],
    [-1, -1],
    [0, -1],
    [1, -1],
  ] as const;
  const TRIPOD = at(4, 3);

  it("names the tile directly behind a target in one of the eight directions, and none at a knight offset", () => {
    for (const [dx, dy] of DIRECTIONS)
      for (const distance of [1, 2]) {
        expect(
          pierceTileV7(
            TRIPOD,
            at(TRIPOD.x + dx * distance, TRIPOD.y + dy * distance),
          ),
        ).toEqual(
          at(TRIPOD.x + dx * (distance + 1), TRIPOD.y + dy * (distance + 1)),
        );
      }
    for (const [dx, dy] of [
      [2, 1],
      [2, -1],
      [-2, 1],
      [-2, -1],
      [1, 2],
      [1, -2],
      [-1, 2],
      [-1, -2],
    ] as const)
      expect(pierceTileV7(TRIPOD, at(TRIPOD.x + dx, TRIPOD.y + dy))).toBeNull();
  });

  it("hits the unit behind the target in all eight directions at distance 1 and 2: a Guard (10) pierces for 5", () => {
    for (const [dx, dy] of DIRECTIONS)
      for (const distance of [1, 2]) {
        const target = at(TRIPOD.x + dx * distance, TRIPOD.y + dy * distance);
        const behind = at(target.x + dx, target.y + dy);
        const state = martianFieldV7(
          [
            { seat: 0, role: "CATAPULT", at: TRIPOD },
            { seat: 1, role: "GUARD", at: target },
            { seat: 1, role: "JUGGERNAUT", at: behind },
          ],
          { techs: NO_DISINTEGRATOR },
        );
        const victim = unitAtV7(state, behind);
        const run = attackV7(state, TRIPOD, target);
        const label = `${dx},${dy} x${distance}`;
        expect(run.combat.damageToDefender, label).toBe(10);
        expect(run.combat.splash, label).toEqual([
          {
            unitId: victim.id,
            at: behind,
            damage: 5,
            dies: false,
            shieldDamage: 0,
          },
        ]);
        expect(unitAtV7(run.state, behind).hp, label).toBe(victim.hp - 5);
        // Nobody retaliates for a Pierce hit.
        expect(shieldAtV7(run.state, TRIPOD), label).toBe(
          distance === 1 ? 2 - run.combat.attackerShieldDamage : 2,
        );
      }
  });

  it("pierces nothing at a knight's-move offset", () => {
    for (const [dx, dy] of [
      [2, 1],
      [2, -1],
      [-2, 1],
      [-2, -1],
      [1, 2],
      [1, -2],
      [-1, 2],
      [-1, -2],
    ] as const) {
      const target = at(TRIPOD.x + dx, TRIPOD.y + dy);
      // Every tile around the target holds a possible victim's neighbour:
      // put a unit one step further along both rough directions.
      const state = martianFieldV7([
        { seat: 0, role: "CATAPULT", at: TRIPOD },
        { seat: 1, role: "GUARD", at: target },
        {
          seat: 1,
          role: "JUGGERNAUT",
          at: at(target.x + Math.sign(dx), target.y + Math.sign(dy)),
        },
      ]);
      expect(attackV7(state, TRIPOD, target).combat.splash).toEqual([]);
    }
  });

  it("pierces for half of the whole hit, rounded up: a full ray on a Fighter, and a half ray (5) for 3", () => {
    // The whole hit is Shield damage plus HP damage, so it is capped at the
    // target's Shield plus HP like every splash: a formula hit of 12 on a
    // Fighter with 10 HP is a whole hit of 10 and pierces for 5.
    for (const [moved, formula] of [
      [false, 12],
      [true, 5],
    ] as const) {
      const state = martianFieldV7(
        [
          {
            seat: 0,
            role: "CATAPULT",
            at: at(3, 2),
            activation: moved ? movedV7(1) : {},
          },
          { seat: 1, role: "FIGHTER", at: at(5, 2) },
          { seat: 1, role: "JUGGERNAUT", at: at(6, 2) },
        ],
        { techs: NO_DISINTEGRATOR },
      );
      expect(uncapped(state, at(3, 2), at(5, 2))).toBe(formula);
      const whole = Math.min(formula, unitAtV7(state, at(5, 2)).hp);
      const run = attackV7(state, at(3, 2), at(5, 2));
      expect(run.combat.splash).toMatchObject([
        { damage: Math.max(1, Math.ceil(whole / 2)) },
      ]);
    }
  });

  it("the whole hit includes what the target's Shield absorbed, and the victim's own Shield absorbs its share", () => {
    // A Martian Tripod against another Martian seat: a Grunt (Shield 2)
    // with a Grunt behind it.
    const state = martianFieldV7(
      [
        { seat: 0, role: "CATAPULT", at: at(3, 2) },
        { seat: 1, role: "FIGHTER", at: at(5, 2) },
        { seat: 1, role: "FIGHTER", at: at(6, 2) },
      ],
      { factions: ["MARTIAN", "MARTIAN"], techs: NO_DISINTEGRATOR },
    );
    const run = attackV7(state, at(3, 2), at(5, 2));
    expect(run.combat.defenderShieldDamage).toBe(2);
    const whole = run.combat.defenderShieldDamage + run.combat.damageToDefender;
    expect(whole).toBe(12);
    const share = Math.max(1, Math.ceil(whole / 2));
    expect(run.combat.splash).toMatchObject([
      { shieldDamage: 2, damage: share - 2 },
    ]);
  });

  it("hits an own unit behind the target, without kill credit, and a hostile one with credit and cause SPLASH", () => {
    const own = martianFieldV7(
      [
        { seat: 0, role: "CATAPULT", at: at(3, 2) },
        { seat: 1, role: "GUARD", at: at(5, 2) },
        { seat: 0, role: "FIGHTER", at: at(6, 2), hp: 2, shield: 0 },
      ],
      { techs: NO_DISINTEGRATOR },
    );
    const ownRun = attackV7(own, at(3, 2), at(5, 2));
    expect(ownRun.combat.splash).toMatchObject([{ damage: 2, dies: true }]);
    expect(hasUnitAtV7(ownRun.state, at(6, 2))).toBe(false);
    expect(ownRun.attacker?.kills).toBe(0);
    expect(ownRun.events).toContainEqual(
      expect.objectContaining({ kind: "UNIT_DIED", cause: "SPLASH" }),
    );

    const hostile = martianFieldV7(
      [
        { seat: 0, role: "CATAPULT", at: at(3, 2) },
        { seat: 1, role: "GUARD", at: at(5, 2) },
        { seat: 1, role: "MARKSMAN", at: at(6, 2), hp: 2 },
      ],
      { techs: NO_DISINTEGRATOR },
    );
    const hostileRun = attackV7(hostile, at(3, 2), at(5, 2));
    expect(hostileRun.combat.splash).toMatchObject([{ dies: true }]);
    expect(hostileRun.attacker?.kills).toBe(1);
    expect(hostileRun.events).toContainEqual(
      expect.objectContaining({ kind: "UNIT_DIED", cause: "SPLASH" }),
    );
  });

  it("hits an embarked unit over water and an Egg", () => {
    const afloat = martianFieldV7(
      [
        { seat: 0, role: "CATAPULT", at: at(3, 2) },
        { seat: 1, role: "GUARD", at: at(5, 2) },
        { seat: 1, role: "FIGHTER", at: at(6, 2), form: "EMBARKED" },
      ],
      { water: [at(6, 2)], techs: NO_DISINTEGRATOR },
    );
    expect(attackV7(afloat, at(3, 2), at(5, 2)).combat.splash).toMatchObject([
      { at: at(6, 2), damage: 5 },
    ]);

    const egg = martianFieldV7(
      [
        { seat: 0, role: "CATAPULT", at: at(4, 5) },
        { seat: 1, role: "FIGHTER", at: at(3, 6) },
      ],
      {
        factions: ["MARTIAN", "DINOSAUR"],
        techs: NO_DISINTEGRATOR,
        eggs: [{ seat: 1, role: "RAIDER", at: at(2, 7) }],
      },
    );
    const run = attackV7(egg, at(4, 5), at(3, 6));
    expect(run.combat.splash).toHaveLength(1);
    expect(run.combat.splash[0]?.at).toEqual(at(2, 7));
  });

  it("hits a hidden unit in the canonical resolution; the public preview omits it and flags the chain", () => {
    const base = martianFieldV7(
      [
        { seat: 0, role: "CATAPULT", at: at(3, 2) },
        { seat: 1, role: "GUARD", at: at(5, 2) },
        { seat: 1, role: "MARKSMAN", at: at(6, 2) },
      ],
      { techs: NO_DISINTEGRATOR },
    );
    const state = unexploreV7(base, 0, [at(6, 2)]);
    const actor = activeIdV7(state);
    const view = viewForV7(state, actor);
    const tripod = unitAtV7(state, at(3, 2));
    const target = unitAtV7(state, at(5, 2));
    const hidden = unitAtV7(state, at(6, 2));
    expect(view.units.some((unit) => unit.id === hidden.id)).toBe(false);
    expect(queryCombatPreviewV7(view, tripod.id, target.id)?.splash).toEqual(
      [],
    );
    expect(
      previewAttackExplosionsV7(view, tripod.id, target.id)?.touchesUnexplored,
    ).toBe(true);
    const result = applyOkV7(state, actor, {
      kind: "ATTACK",
      unitId: tripod.id,
      targetUnitId: target.id,
    });
    expect(unitAtV7(result.state, at(6, 2)).hp).toBe(hidden.hp - 5);
  });

  it("a Tripod's attack destroys Field Defense on the target's tile only, and it never advances", () => {
    const fortified = fieldDefenseV7(
      fieldDefenseV7(
        martianFieldV7([
          { seat: 0, role: "CATAPULT", at: at(4, 7) },
          { seat: 1, role: "FIGHTER", at: at(3, 7), hp: 1 },
          { seat: 1, role: "GUARD", at: at(2, 7) },
        ]),
        at(3, 7),
      ),
      at(2, 7),
    );
    const run = attackV7(fortified, at(4, 7), at(3, 7));
    expect(run.combat).toMatchObject({ defenderDies: true, advances: false });
    expect(run.events).toContainEqual(
      expect.objectContaining({
        kind: "FIELD_DEFENSE_DESTROYED",
        reason: "CATAPULT",
      }),
    );
    expect(tileV7(run.state, at(3, 7)).fieldDefense).toBe(false);
    // Pierce does not destroy Field Defense on the pierced tile.
    expect(tileV7(run.state, at(2, 7)).fieldDefense).toBe(true);
    expect(run.attacker?.at).toEqual(at(4, 7));
  });

  it("a Ray Gunner and a Colossus advance after an adjacent kill; the Colossus pushes at range 1 only", () => {
    for (const role of ["MARKSMAN", "JUGGERNAUT"] as const) {
      const state = martianFieldV7([
        { seat: 0, role, at: at(4, 2) },
        { seat: 1, role: "FIGHTER", at: at(5, 2), hp: 1 },
      ]);
      const run = attackV7(state, at(4, 2), at(5, 2));
      expect(run.combat.advances, role).toBe(true);
      expect(run.attacker?.at, role).toEqual(at(5, 2));
      // No Pierce for either.
      expect(run.combat.splash).toEqual([]);
    }
    const near = martianFieldV7([
      { seat: 0, role: "JUGGERNAUT", at: at(4, 2) },
      { seat: 1, role: "JUGGERNAUT", at: at(5, 2) },
    ]);
    // A Juggernaut-role target is never pushed; use a Guard.
    const guard = martianFieldV7([
      { seat: 0, role: "JUGGERNAUT", at: at(4, 2) },
      { seat: 1, role: "GUARD", at: at(5, 2) },
    ]);
    expect(attackV7(guard, at(4, 2), at(5, 2)).combat.push).toBe("WILL_PUSH");
    expect(near.units).toHaveLength(2);
    const far = martianFieldV7([
      { seat: 0, role: "JUGGERNAUT", at: at(3, 2) },
      { seat: 1, role: "GUARD", at: at(5, 2) },
    ]);
    const farRun = attackV7(far, at(3, 2), at(5, 2));
    expect(farRun.target?.at).toEqual(at(5, 2));
    expect(kindsV7(farRun.events)).not.toContain("UNIT_PUSHED");
  });
});

describe("Martian heat rays: the Disintegrator (section 6.5)", () => {
  const pieces = (role: RayRole): MartianPieceV7[] => [
    { seat: 0, role, at: at(5, 7) },
    { seat: 1, role: "GUARD", at: at(3, 7) },
  ];

  it("removes Field Defense for a ray, full or half, and reports the removed level", () => {
    for (const [role, without, withIt] of [
      ["MARKSMAN", 6, 7],
      ["CATAPULT", 9, 10],
    ] as const) {
      const plain = fieldDefenseV7(
        martianFieldV7(pieces(role), { techs: NO_DISINTEGRATOR }),
        at(3, 7),
      );
      expect(uncapped(plain, at(5, 7), at(3, 7))).toBe(without);
      const state = fieldDefenseV7(martianFieldV7(pieces(role)), at(3, 7));
      const run = attackV7(state, at(5, 7), at(3, 7));
      expect(run.combat).toMatchObject({
        fortificationLevel: 0,
        fortificationIgnored: 1,
        damageToDefender: withIt,
      });
      // The rule destroys nothing; only a Tripod removes Field Defense.
      expect(tileV7(run.state, at(3, 7)).fieldDefense).toBe(
        role !== "CATAPULT",
      );
    }
  });

  it("a Walled center with Field Defense: a Ray Gunner deals 7 instead of 5, a Tripod 10 instead of 7", () => {
    for (const [role, without, withIt] of [
      ["MARKSMAN", 5, 7],
      ["CATAPULT", 7, 10],
    ] as const) {
      const plain = walledV7({
        attackerFaction: "MARTIAN",
        attackers: [{ role, at: at(6, 8) }],
        attackerTechs: withoutTechsV7("MARTIAN", "EXPLOSIVES"),
        fieldDefense: true,
      });
      expect(
        fortificationLevelForUnitV7(plain, unitAtV7(plain, at(8, 8))),
      ).toBe(3);
      expect(uncapped(plain, at(6, 8), at(8, 8)), role).toBe(without);
      const state = walledV7({
        attackerFaction: "MARTIAN",
        attackers: [{ role, at: at(6, 8) }],
        fieldDefense: true,
      });
      const run = attackV7(state, at(6, 8), at(8, 8));
      expect(run.combat, role).toMatchObject({
        fortificationLevel: 0,
        fortificationIgnored: 3,
        damageToDefender: withIt,
      });
    }
  });

  it("applies to the defender's retaliation too, and keeps cover", () => {
    // A Ray Gunner next to a Guard on Field Defense in a Forest.
    const build = (techs: boolean) => {
      const field = martianFieldV7(
        [
          { seat: 0, role: "MARKSMAN", at: at(4, 7) },
          { seat: 1, role: "GUARD", at: at(3, 7) },
        ],
        techs ? {} : { techs: NO_DISINTEGRATOR },
      );
      return fieldDefenseV7(
        checkedV7({
          ...field,
          board: {
            ...field.board,
            tiles: field.board.tiles.map((tile) =>
              tile.at.x === 3 && tile.at.y === 7
                ? {
                    ...tile,
                    terrain: "FOREST" as const,
                    biome: "WOODLAND" as const,
                  }
                : tile,
            ),
          },
        }),
        at(3, 7),
      );
    };
    const plain = attackV7(build(false), at(4, 7), at(3, 7));
    const ignored = attackV7(build(true), at(4, 7), at(3, 7));
    expect(plain.combat.fortificationLevel).toBe(1);
    expect(ignored.combat).toMatchObject({
      fortificationLevel: 0,
      fortificationIgnored: 1,
    });
    // Cover stays: the Forest bonus is still applied.
    expect(
      ignored.combat.defenseBonusNumerator /
        ignored.combat.defenseBonusDenominator,
    ).toBeGreaterThan(1);
  });

  it("applies to the defender's retaliation too", () => {
    // A Ray Gunner next to the Guard on the Walled center.
    const build = (disintegrator: boolean) =>
      walledV7({
        attackerFaction: "MARTIAN",
        attackers: [{ role: "MARKSMAN", at: at(7, 8) }],
        ...(disintegrator
          ? {}
          : { attackerTechs: withoutTechsV7("MARTIAN", "EXPLOSIVES") }),
      });
    const plain = attackV7(build(false), at(7, 8), at(8, 8));
    const ignored = attackV7(build(true), at(7, 8), at(8, 8));
    const taken = (run: typeof plain) =>
      run.combat.damageToAttacker + run.combat.attackerShieldDamage;
    expect(plain.combat.fortificationLevel).toBe(2);
    expect(ignored.combat).toMatchObject({
      fortificationLevel: 0,
      fortificationIgnored: 2,
      retaliation: true,
    });
    expect(ignored.combat.damageToDefender).toBeGreaterThan(
      plain.combat.damageToDefender,
    );
    expect(taken(ignored)).toBeLessThan(taken(plain));
  });

  it("does not apply to a Martian attack that is no ray", () => {
    const state = fieldDefenseV7(
      martianFieldV7([
        { seat: 0, role: "KNIGHT", at: at(4, 7) },
        { seat: 1, role: "GUARD", at: at(3, 7) },
      ]),
      at(3, 7),
    );
    expect(attackV7(state, at(4, 7), at(3, 7)).combat).toMatchObject({
      fortificationLevel: 1,
      fortificationIgnored: 0,
      rayPower: "NONE",
    });
  });
});
