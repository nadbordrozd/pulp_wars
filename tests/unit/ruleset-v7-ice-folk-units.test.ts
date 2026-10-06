import { describe, expect, it } from "vitest";
import {
  applyCommandV7,
  queryThreatenedTilesV7,
  sweepFlankTilesV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type GameStateV7,
  TECHNOLOGY_IDS_V7,
} from "../../src/engine/index";
import { checkedV7 } from "../fixtures/v7-builders";
import { applyOkV7, seatIdV7, unitAtV7 } from "../fixtures/v7-goblin-arena";
import { iceFieldV7 } from "../fixtures/v7-ice-folk";
import { offeredV7, rejectedV7 } from "../fixtures/v7-martian";
import {
  activeIdV7,
  at,
  attackV7,
  fieldDefenseV7,
  kindsV7,
  mountainV7,
  movedV7,
  moveV7,
  tileV7,
  walledV7,
} from "../fixtures/v7-revision20";

// The Ice Folk revision (`pulp_wars-7g3.3`): the unit rules
// (docs/product/RULESET_7_ICE_FOLK.md sections 7.1 to 7.7 and 10).

const NO_ENGINEERING = ["SCOUTING", "RAIDING", "DRILL"] as const;
const move = (
  state: GameStateV7,
  from: CoordV7,
  ...path: CoordV7[]
): CommandV7 => ({
  kind: "MOVE",
  unitId: unitAtV7(state, from).id,
  path,
});

describe("Mountain-born (section 7.1)", () => {
  it("a Yeti, a Boulder Yeti, and a Frost Giant enter a Mountain without Engineering and are not stopped by it", () => {
    for (const role of ["FIGHTER", "CATAPULT", "JUGGERNAUT"] as const) {
      const state = [at(5, 3), at(6, 3)].reduce(
        mountainV7,
        iceFieldV7(
          [
            { seat: 0, role, at: at(4, 3) },
            { seat: 1, role: "FIGHTER", at: at(1, 1) },
          ],
          { techs: { 0: [...NO_ENGINEERING] } },
        ),
      );
      const moved = applyOkV7(
        state,
        activeIdV7(state),
        move(state, at(4, 3), at(5, 3)),
      );
      expect(unitAtV7(moved.state, at(5, 3)).role, role).toBe(role);
    }
    // The Boulder Yeti (Move 2) crosses two Mountains without stopping.
    const ridge = [at(5, 3), at(6, 3)].reduce(
      mountainV7,
      iceFieldV7(
        [
          { seat: 0, role: "CATAPULT", at: at(4, 3) },
          { seat: 1, role: "FIGHTER", at: at(1, 1) },
        ],
        { techs: { 0: [...NO_ENGINEERING] } },
      ),
    );
    applyOkV7(
      ridge,
      activeIdV7(ridge),
      move(ridge, at(4, 3), at(5, 3), at(6, 3)),
    );
    // A Sled is not Mountain-born: Engineering is required.
    const sled = mountainV7(
      iceFieldV7(
        [
          { seat: 0, role: "RAIDER", at: at(4, 3) },
          { seat: 1, role: "FIGHTER", at: at(1, 1) },
        ],
        { techs: { 0: [...NO_ENGINEERING] } },
      ),
      at(5, 3),
    );
    expect(rejectedV7(sled, move(sled, at(4, 3), at(5, 3))).params.reason).toBe(
      "ENGINEERING_REQUIRED",
    );
    // With Engineering a Sled stops on the Mountain.
    const engineer = mountainV7(
      iceFieldV7([
        { seat: 0, role: "RAIDER", at: at(4, 3) },
        { seat: 1, role: "FIGHTER", at: at(1, 1) },
      ]),
      at(5, 3),
    );
    expect(
      rejectedV7(engineer, move(engineer, at(4, 3), at(5, 3), at(6, 3))).params
        .reason,
    ).toBe("MOUNTAIN_STOPS_MOVE");
  });

  it("advances onto a Mountain and is pushed onto one without Engineering (no landing: an Ice Folk unit never embarks since the frozen sea)", () => {
    // The advance after a kill.
    const advance = mountainV7(
      iceFieldV7(
        [
          { seat: 0, role: "FIGHTER", at: at(4, 3) },
          { seat: 1, role: "FIGHTER", at: at(5, 3), hp: 1 },
        ],
        { techs: { 0: [...NO_ENGINEERING] } },
      ),
      at(5, 3),
    );
    expect(attackV7(advance, at(4, 3), at(5, 3)).combat.advances).toBe(true);
    // Pushed by a Human Juggernaut onto a Mountain (own tech unknown to the
    // pusher: the board rule of Mountain-born makes it exact).
    const push = mountainV7(
      iceFieldV7(
        [
          { seat: 1, role: "JUGGERNAUT", at: at(4, 3) },
          { seat: 0, role: "JUGGERNAUT", at: at(5, 3) },
        ],
        { activeSeat: 1, techs: { 0: [...NO_ENGINEERING] } },
      ),
      at(6, 3),
    );
    const pushed = attackV7(push, at(4, 3), at(5, 3));
    expect(pushed.combat.push).toBe("WILL_PUSH");
    expect(unitAtV7(pushed.state, at(6, 3)).role).toBe("JUGGERNAUT");
    // A Mammoth is not Mountain-born: the same push is blocked.
    const mammoth = mountainV7(
      iceFieldV7(
        [
          { seat: 1, role: "JUGGERNAUT", at: at(4, 3) },
          { seat: 0, role: "GUARD", at: at(5, 3) },
        ],
        { activeSeat: 1, techs: { 0: [...NO_ENGINEERING] } },
      ),
      at(6, 3),
    );
    const blocked = attackV7(mammoth, at(4, 3), at(5, 3));
    expect(blocked.combat.push).not.toBe("WILL_PUSH");
    // A Triceratops's Charge! push onto a Mountain as well.
    const charge = mountainV7(
      iceFieldV7(
        [
          {
            seat: 1,
            role: "CATAPULT",
            at: at(3, 3),
          },
          { seat: 0, role: "FIGHTER", at: at(5, 3) },
        ],
        {
          factions: ["ICE_FOLK", "DINOSAUR"],
          activeSeat: 1,
          techs: { 0: [...NO_ENGINEERING] },
        },
      ),
      at(6, 3),
    );
    const ran = moveV7(charge, at(3, 3), [at(4, 3)]).state;
    const tri = attackV7(ran, at(4, 3), at(5, 3));
    if (!tri.combat.defenderDies) expect(tri.combat.push).toBe("WILL_PUSH");
  });

  it("threatened tiles include a Mountain-born unit's Mountain paths", () => {
    const state = mountainV7(
      iceFieldV7(
        [
          { seat: 0, role: "FIGHTER", at: at(4, 3) },
          { seat: 1, role: "FIGHTER", at: at(1, 1) },
        ],
        { techs: { 0: [...NO_ENGINEERING] } },
      ),
      at(5, 3),
    );
    const tiles = queryThreatenedTilesV7(
      viewForV7(state, seatIdV7(state, 1)),
      unitAtV7(state, at(4, 3)).id,
    );
    // From the Mountain (5, 3) a Yeti reaches (7, 3) by Rockfall.
    expect(tiles).toContainEqual(at(7, 3));
  });
});

describe("Rockfall (section 7.2)", () => {
  it("a Yeti on a Mountain attacks at distance 2 at Attack 1.5, and melee units do not retaliate", () => {
    const state = mountainV7(
      iceFieldV7([
        { seat: 0, role: "FIGHTER", at: at(4, 3) },
        { seat: 1, role: "FIGHTER", at: at(6, 3) },
      ]),
      at(4, 3),
    );
    const run = attackV7(state, at(4, 3), at(6, 3));
    expect(run.combat).toMatchObject({
      rockfallApplied: true,
      attack2: 3,
      maximumRange: 2,
      damageToDefender: 3,
      retaliation: false,
      noRetaliationReason: "OUT_OF_RANGE",
      advances: false,
      shatters: false,
    });
    // Off the Mountain: range 1 only.
    const flat = iceFieldV7([
      { seat: 0, role: "FIGHTER", at: at(4, 3) },
      { seat: 1, role: "FIGHTER", at: at(6, 3) },
    ]);
    expect(
      rejectedV7(flat, {
        kind: "ATTACK",
        unitId: unitAtV7(flat, at(4, 3)).id,
        targetUnitId: unitAtV7(flat, at(6, 3)).id,
      }).code,
    ).toBe("TARGET_OUT_OF_RANGE");
    // A ranged defender retaliates (a Marksman, 2).
    const marksman = mountainV7(
      iceFieldV7([
        { seat: 0, role: "FIGHTER", at: at(4, 3) },
        { seat: 1, role: "MARKSMAN", at: at(6, 3) },
      ]),
      at(4, 3),
    );
    expect(attackV7(marksman, at(4, 3), at(6, 3)).combat).toMatchObject({
      retaliation: true,
      damageToAttacker: 2,
    });
    // A Chilled target in the window is not shattered from distance 2.
    const chilled = mountainV7(
      iceFieldV7([
        { seat: 0, role: "FIGHTER", at: at(4, 3) },
        {
          seat: 1,
          role: "FIGHTER",
          at: at(6, 3),
          hp: 5,
          chill: { sluggish: false, turnsLeft: 1 },
        },
      ]),
      at(4, 3),
    );
    expect(attackV7(chilled, at(4, 3), at(6, 3)).combat.shatters).toBe(false);
  });

  it("the Yeti's own retaliation range stays 1", () => {
    const state = mountainV7(
      iceFieldV7(
        [
          { seat: 1, role: "MARKSMAN", at: at(6, 3) },
          { seat: 0, role: "FIGHTER", at: at(4, 3) },
        ],
        { activeSeat: 1 },
      ),
      at(4, 3),
    );
    expect(attackV7(state, at(6, 3), at(4, 3)).combat).toMatchObject({
      retaliation: false,
      noRetaliationReason: "OUT_OF_RANGE",
    });
  });
});

describe("Cold Blood (section 7.4)", () => {
  it("a Snow Hunter has +0.5 Attack on a Chilled defender, at any distance, never in retaliation", () => {
    const state = iceFieldV7([
      { seat: 0, role: "MARKSMAN", at: at(4, 3) },
      {
        seat: 1,
        role: "FIGHTER",
        at: at(6, 3),
        chill: { sluggish: false, turnsLeft: 1 },
      },
      { seat: 1, role: "FIGHTER", at: at(4, 5) },
    ]);
    expect(attackV7(state, at(4, 3), at(6, 3)).combat).toMatchObject({
      coldBloodApplied: true,
      attack2: 5,
      damageToDefender: 6,
    });
    expect(attackV7(state, at(4, 3), at(4, 5)).combat).toMatchObject({
      coldBloodApplied: false,
      attack2: 4,
      damageToDefender: 5,
    });
  });
});

describe("Sweep and Trample (section 7.5)", () => {
  it("the flank tiles are the target's two ring neighbours, for each of the eight directions", () => {
    const center = at(5, 5);
    const ring = [
      at(4, 4),
      at(5, 4),
      at(6, 4),
      at(6, 5),
      at(6, 6),
      at(5, 6),
      at(4, 6),
      at(4, 5),
    ];
    ring.forEach((target, index) => {
      expect(sweepFlankTilesV7(center, target)).toEqual([
        ring[(index + 7) % 8],
        ring[(index + 1) % 8],
      ]);
    });
    expect(sweepFlankTilesV7(center, at(7, 5))).toEqual([]);
  });

  it("deals 2 to every hostile unit on a flank tile, any form, with Armoured and Shields applied, never to own units", () => {
    // Mammoth (4, 4) attacks (5, 4): flanks (5, 3) and (5, 5) (a village
    // center: hostile there too).
    const state = iceFieldV7(
      [
        { seat: 0, role: "GUARD", at: at(4, 4) },
        { seat: 1, role: "FIGHTER", at: at(5, 4) },
        { seat: 1, role: "GUARD", at: at(5, 3) },
        { seat: 0, role: "FIGHTER", at: at(5, 5) },
      ],
      { factions: ["ICE_FOLK", "DINOSAUR"] },
    );
    const run = attackV7(state, at(4, 4), at(5, 4));
    expect(run.combat.sweep).toBe(true);
    // The Ankylosaurus (Armoured) takes 1; the own Yeti is untouched.
    expect(run.combat.splash).toEqual([
      {
        unitId: unitAtV7(state, at(5, 3)).id,
        at: at(5, 3),
        damage: 1,
        dies: false,
        shieldDamage: 0,
      },
    ]);
    expect(unitAtV7(run.state, at(5, 5)).hp).toBe(9);
    // A Martian Shield absorbs the flank hit first.
    const shielded = iceFieldV7(
      [
        { seat: 0, role: "GUARD", at: at(4, 4) },
        { seat: 1, role: "FIGHTER", at: at(5, 4) },
        { seat: 1, role: "FIGHTER", at: at(5, 3), shield: 1 },
      ],
      { factions: ["ICE_FOLK", "MARTIAN"] },
    );
    expect(attackV7(shielded, at(4, 4), at(5, 4)).combat.splash).toEqual([
      {
        unitId: unitAtV7(shielded, at(5, 3)).id,
        at: at(5, 3),
        damage: 1,
        dies: false,
        shieldDamage: 1,
      },
    ]);
  });

  it("a flank kill is credited, leaves a Grave, explodes, and never shatters; the Mammoth dying does not stop it", () => {
    const state = iceFieldV7(
      [
        { seat: 0, role: "GUARD", at: at(4, 4), hp: 1 },
        { seat: 1, role: "JUGGERNAUT", at: at(5, 4) },
        {
          seat: 1,
          role: "MARKSMAN",
          at: at(5, 3),
          hp: 2,
          chill: { sluggish: false, turnsLeft: 1 },
        },
      ],
      { factions: ["ICE_FOLK", "GOBLIN"] },
    );
    const run = attackV7(state, at(4, 4), at(5, 4));
    expect(run.combat).toMatchObject({ attackerDies: true, sweep: true });
    expect(run.combat.splash).toEqual([
      {
        unitId: unitAtV7(state, at(5, 3)).id,
        at: at(5, 3),
        damage: 2,
        dies: true,
        shieldDamage: 0,
      },
    ]);
    const died = run.events.filter((event) => event.kind === "UNIT_DIED");
    expect(died).toContainEqual({
      kind: "UNIT_DIED",
      unitId: unitAtV7(state, at(5, 3)).id,
      cause: "SPLASH",
    });
    // The Bomb Chucker explodes.
    expect(kindsV7(run.events)).toContain("EXPLOSION_RESOLVED");
  });

  it("Trample destroys Field Defense on the target's tile (reason TRAMPLE), which still counts for the exchange", () => {
    // Tuning 1 (7r46): without Brittle, whose Breach would ignore the level.
    const base = iceFieldV7(
      [
        { seat: 0, role: "GUARD", at: at(4, 7) },
        { seat: 1, role: "FIGHTER", at: at(3, 7) },
        { seat: 1, role: "FIGHTER", at: at(3, 6) },
      ],
      {
        techs: {
          0: TECHNOLOGY_IDS_V7.filter((tech) => tech !== "EXPLOSIVES"),
        },
      },
    );
    const state = fieldDefenseV7(fieldDefenseV7(base, at(3, 7)), at(3, 6));
    const run = attackV7(state, at(4, 7), at(3, 7));
    expect(run.combat.fortificationLevel).toBe(2);
    expect(
      run.events.find((event) => event.kind === "FIELD_DEFENSE_DESTROYED"),
    ).toEqual({
      kind: "FIELD_DEFENSE_DESTROYED",
      at: at(3, 7),
      reason: "TRAMPLE",
    });
    expect(tileV7(run.state, at(3, 7)).fieldDefense).toBe(false);
    // The flank tile keeps its Field Defense.
    expect(tileV7(run.state, at(3, 6)).fieldDefense).toBe(true);
  });
});

describe("Boulders and Planted (section 7.6)", () => {
  it("ignore fortification for the damage and the retaliation, keep cover, and are Planted when unmoved", () => {
    const walled = walledV7({
      attackerFaction: "ICE_FOLK",
      attackers: [{ role: "CATAPULT", at: at(8, 6) }],
    });
    const run = attackV7(walled, at(8, 6), at(8, 8));
    expect(run.combat).toMatchObject({
      fortificationLevel: 0,
      fortificationIgnored: 2,
      plantedApplied: true,
      attack2: 6,
      damageToDefender: 7,
    });
    // After a Move: Attack 2, not Planted.
    const moved = walledV7({
      attackerFaction: "ICE_FOLK",
      attackers: [{ role: "CATAPULT", at: at(8, 5) }],
    });
    const walked = moveV7(moved, at(8, 5), [at(8, 6)]).state;
    expect(attackV7(walked, at(8, 6), at(8, 8)).combat).toMatchObject({
      plantedApplied: false,
      attack2: 4,
      damageToDefender: 4,
    });
  });

  it("destroys Field Defense (reason CATAPULT) and never advances", () => {
    const base = iceFieldV7([
      { seat: 0, role: "CATAPULT", at: at(4, 7) },
      { seat: 1, role: "FIGHTER", at: at(3, 7), hp: 1 },
    ]);
    const state = fieldDefenseV7(base, at(3, 7));
    const run = attackV7(state, at(4, 7), at(3, 7));
    expect(run.combat).toMatchObject({ defenderDies: true, advances: false });
    expect(
      run.events.find((event) => event.kind === "FIELD_DEFENSE_DESTROYED"),
    ).toMatchObject({ reason: "CATAPULT" });
    expect(run.attacker?.at).toEqual(at(4, 7));
  });
});

describe("Prowl (section 7.7)", () => {
  it("zones of control do not end a Sabretooth's Move; it does not pass other players' units", () => {
    const state = iceFieldV7(
      [
        { seat: 0, role: "KNIGHT", at: at(3, 3) },
        { seat: 1, role: "FIGHTER", at: at(5, 2) },
        { seat: 1, role: "FIGHTER", at: at(6, 4) },
      ],
      { techs: { 0: ["SCOUTING", "RAIDING", "CHIVALRY"] } },
    );
    // (4, 3) and (5, 3) are in the Fighters' zone of control.
    applyOkV7(
      state,
      activeIdV7(state),
      move(state, at(3, 3), at(4, 3), at(5, 3), at(6, 3)),
    );
    expect(
      rejectedV7(state, move(state, at(3, 3), at(4, 2), at(5, 2), at(6, 2)))
        .params.reason,
    ).toBe("OCCUPIED");
    // Another faction's Knight stops at the first ZOC tile.
    const human = iceFieldV7(
      [
        { seat: 1, role: "KNIGHT", at: at(3, 3) },
        { seat: 0, role: "FIGHTER", at: at(5, 2) },
      ],
      { activeSeat: 1 },
    );
    expect(
      rejectedV7(human, move(human, at(3, 3), at(4, 3), at(5, 3))).params
        .reason,
    ).toBe("ZOC_STOPS_MOVE");
  });

  it("never ends a Move or advances on a settlement center it does not own (no landing: an Ice Folk unit never embarks since the frozen sea)", () => {
    const state = iceFieldV7(
      [
        { seat: 0, role: "KNIGHT", at: at(4, 4) },
        { seat: 1, role: "FIGHTER", at: at(1, 1) },
      ],
      { techs: { 0: ["SCOUTING", "RAIDING", "CHIVALRY"] } },
    );
    // The neutral village (5, 5).
    expect(
      rejectedV7(state, move(state, at(4, 4), at(5, 5))).params.reason,
    ).toBe("SETTLEMENT_FORBIDDEN");
    // It may pass over the village and end beyond it.
    applyOkV7(
      state,
      activeIdV7(state),
      move(state, at(4, 4), at(5, 5), at(6, 6)),
    );
    // It may stand on its own center.
    const home = iceFieldV7(
      [
        { seat: 0, role: "KNIGHT", at: at(7, 7) },
        { seat: 1, role: "FIGHTER", at: at(1, 1) },
      ],
      { techs: { 0: ["SCOUTING", "RAIDING", "CHIVALRY"] } },
    );
    applyOkV7(home, activeIdV7(home), move(home, at(7, 7), at(8, 8)));
    // A kill on a village center: no advance.
    const village = iceFieldV7(
      [
        { seat: 0, role: "KNIGHT", at: at(4, 4) },
        { seat: 1, role: "FIGHTER", at: at(5, 5), hp: 1 },
      ],
      { techs: { 0: ["SCOUTING", "RAIDING", "CHIVALRY"] } },
    );
    const run = attackV7(village, at(4, 4), at(5, 5));
    expect(run.combat).toMatchObject({ defenderDies: true, advances: false });
  });
});

describe("previews and offers (section 11)", () => {
  it("every offered Bolas, Cold Snap, and Ice Folk attack is accepted", () => {
    const state = mountainV7(
      iceFieldV7([
        { seat: 0, role: "RAIDER", at: at(4, 3) },
        { seat: 0, role: "CAPTAIN", at: at(4, 4) },
        { seat: 0, role: "FIGHTER", at: at(3, 3) },
        { seat: 0, role: "GUARD", at: at(3, 4) },
        { seat: 0, role: "CATAPULT", at: at(3, 5) },
        { seat: 1, role: "FIGHTER", at: at(5, 3) },
        { seat: 1, role: "FIGHTER", at: at(5, 4) },
        { seat: 1, role: "MARKSMAN", at: at(5, 5) },
      ]),
      at(3, 3),
    );
    const offered = offeredV7(state, "THROW_BOLAS", "COLD_SNAP", "ATTACK");
    expect(
      offered.filter((command) => command.kind === "THROW_BOLAS"),
    ).toHaveLength(3);
    expect(
      offered.filter((command) => command.kind === "COLD_SNAP"),
    ).toHaveLength(1);
    for (const command of offered)
      expect(
        applyCommandV7(state, activeIdV7(state), command).accepted,
        JSON.stringify(command),
      ).toBe(true);
    // The Yeti on its Mountain is offered the Rockfall targets.
    expect(
      offered.filter(
        (command) =>
          command.kind === "ATTACK" &&
          command.unitId === unitAtV7(state, at(3, 3)).id,
      ),
    ).toHaveLength(3);
  });

  it("the Boulder Yeti's estimate after a planned Move uses Attack 2", () => {
    const state = iceFieldV7([
      { seat: 0, role: "CATAPULT", at: at(4, 3) },
      { seat: 1, role: "FIGHTER", at: at(6, 3) },
    ]);
    const actor = unitAtV7(state, at(4, 3)).id;
    const target = unitAtV7(state, at(6, 3)).id;
    const moved = checkedV7({
      ...state,
      units: state.units.map((unit) =>
        unit.id === actor
          ? { ...unit, activation: { ...unit.activation, ...movedV7(1) } }
          : unit,
      ),
    });
    expect(attackV7(moved, at(4, 3), at(6, 3)).combat.attack2).toBe(4);
    expect(attackV7(state, at(4, 3), at(6, 3)).combat.attack2).toBe(6);
    void target;
  });
});
