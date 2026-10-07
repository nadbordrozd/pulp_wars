import { describe, expect, it } from "vitest";
import {
  FACTION_IDS_V7,
  PRIOR_RULESET_7_IDS,
  RULESET_7_ID,
  SAVE_STORAGE_KEY_V7,
  UNIT_ROLE_IDS_V7,
  effectiveRoleRuleV7,
  isNavalRoleV7,
  isRangedRoleRuleV7,
  landTradeCityIdsV7,
  queryPlayerCommandsV7,
  roleMechanicsV7,
  viewForV7,
  type CommandV7,
  type FactionIdV7,
  type GameStateV7,
  type UnitRoleIdV7,
} from "../../src/engine/index";
import { applyOkV7, seatIdV7, unitAtV7 } from "../fixtures/v7-goblin-arena";
import {
  advanceCombatNotesV7,
  landTradeStatusTextV7,
  landTradeStatusV7,
  landTradeUnlockTextV7,
} from "../../src/render/technology-unlock-text-v7";
import {
  at,
  attackV7,
  fieldV7,
  withoutTechsV7,
} from "../fixtures/v7-revision20";

/**
 * Tuning 2 (`pulp_wars-w49.3`, `pulp-wars-poc-7r47`;
 * docs/product/RULESET_7_TUNING_1.md, "Round 2"): who moves after a kill,
 * and the Human Knight's capture.
 *
 * Two-seat field (tests/fixtures/v7-revision20.ts): seat 0 capital (8, 8)
 * with territory x 7-9, y 7-9; seat 1 capital (2, 8) with territory x 1-3,
 * y 7-9; villages (5, 5), (8, 5), (5, 8).
 */

const offered = (state: GameStateV7, seat: number): readonly CommandV7[] =>
  queryPlayerCommandsV7(viewForV7(state, seatIdV7(state, seat)));

/** A foe whose 1-HP Fighter-role unit dies quietly (no blast, no rising). */
const foeOf = (faction: FactionIdV7): FactionIdV7 =>
  faction === "ORIGINAL" ? "DWARF" : "ORIGINAL";

/** The land roles of a faction that attack from distance 1. */
const adjacentAttackers = (faction: FactionIdV7): readonly UnitRoleIdV7[] =>
  UNIT_ROLE_IDS_V7.filter((role) => {
    if (isNavalRoleV7(role)) return false;
    const rule = effectiveRoleRuleV7(role, faction);
    return rule.abilities.includes("ATTACK") && rule.minimumRange === 1;
  });

describe("tuning 2 identity", () => {
  it("is 7r47 with 7r46 last in the prior list", () => {
    expect(RULESET_7_ID).toBe("pulp-wars-poc-7r52");
    expect(SAVE_STORAGE_KEY_V7).toBe("pulpWars.save.v7r52.current");
    expect(PRIOR_RULESET_7_IDS.at(-6)).toBe("pulp-wars-poc-7r46");
    expect(PRIOR_RULESET_7_IDS).toHaveLength(51);
  });
});

describe("1: who moves after a kill", () => {
  it("a defender that kills its attacker by retaliation never moves", () => {
    // A 1-HP Fighter attacks a Guard: in the open, and a Guard that
    // garrisons its own capital (8, 8).
    for (const guardAt of [at(5, 3), at(8, 8)]) {
      const from = at(guardAt.x, guardAt.y - 1);
      const state = fieldV7(
        [
          { seat: 0, role: "FIGHTER", at: from, hp: 1 },
          { seat: 1, role: "GUARD", at: guardAt },
        ],
        { factions: ["ORIGINAL", "DWARF"] },
      );
      const guard = unitAtV7(state, guardAt);
      const run = attackV7(state, from, guardAt);
      expect(run.combat.attackerDies).toBe(true);
      expect(run.combat.advances).toBe(false);
      expect(run.attacker).toBeUndefined();
      expect(run.target?.at).toEqual(guardAt);
      expect(run.target?.kills).toBe(guard.kills + 1);
      // Nothing moved in the exchange.
      expect(
        run.events.filter((event) =>
          ["UNIT_MOVED", "UNIT_PUSHED", "UNIT_ADVANCED"].includes(event.kind),
        ),
      ).toEqual([]);
      expect(unitAtV7(run.state, guardAt).id).toBe(guard.id);
    }
  });

  it("a melee attacker that kills takes the killed unit's tile, also off its own city center", () => {
    for (const from of [at(5, 2), at(8, 8)]) {
      const target = at(from.x, from.y + 1);
      const state = fieldV7(
        [
          { seat: 0, role: "FIGHTER", at: from },
          { seat: 1, role: "FIGHTER", at: target, hp: 1 },
        ],
        { factions: ["ORIGINAL", "DWARF"] },
      );
      const run = attackV7(state, from, target);
      expect(run.combat.defenderDies).toBe(true);
      expect(run.combat.advances).toBe(true);
      expect(run.attacker?.at).toEqual(target);
    }
  });

  it("a ranged unit never advances, also after a kill from distance 1", () => {
    const ranged: string[] = [];
    const melee: string[] = [];
    for (const faction of FACTION_IDS_V7)
      for (const role of adjacentAttackers(faction)) {
        const rule = effectiveRoleRuleV7(role, faction);
        const name = `${faction} ${rule.label}`;
        const state = fieldV7(
          [
            { seat: 0, role, at: at(5, 2) },
            { seat: 1, role: "FIGHTER", at: at(5, 3), hp: 1 },
          ],
          { factions: [faction, foeOf(faction)] },
        );
        // The fixture checks the public preview against the resolution.
        const run = attackV7(state, at(5, 2), at(5, 3));
        expect(run.combat.defenderDies, name).toBe(true);
        expect(run.attacker?.at, name).toEqual(
          run.combat.advances ? at(5, 3) : at(5, 2),
        );
        if (isRangedRoleRuleV7(rule)) {
          expect(run.combat.advances, name).toBe(false);
          ranged.push(name);
        } else {
          expect(run.combat.advances, name).toBe(
            roleMechanicsV7(role, faction).advancesAfterKill,
          );
          if (run.combat.advances) melee.push(name);
        }
      }
    // Every ranged land unit that can attack an adjacent unit.
    expect(ranged).toEqual([
      "ORIGINAL Marksman",
      "DINOSAUR Spitter",
      "MARTIAN Grunt",
      "MARTIAN Ray Gunner",
      "MARTIAN Colossus",
      "ICE_FOLK Snow Hunter",
      "ICE_FOLK Boulder Yeti",
      "DWARF Clockwork Gunner",
      "CANDY Gumball Gunner",
    ]);
    // The melee units that do not advance are the ones that never did.
    const stay = FACTION_IDS_V7.flatMap((faction) =>
      adjacentAttackers(faction)
        .filter(
          (role) =>
            !isRangedRoleRuleV7(effectiveRoleRuleV7(role, faction)) &&
            !melee.includes(
              `${faction} ${effectiveRoleRuleV7(role, faction).label}`,
            ),
        )
        .map(
          (role) => `${faction} ${effectiveRoleRuleV7(role, faction).label}`,
        ),
    );
    // (The Undead pass, 7r51: nor the Abomination, whose kill rises on
    // its own tile.)
    expect(stay).toEqual([
      "UNDEAD Zombie",
      "UNDEAD Abomination",
      "MARTIAN Saucer",
      "MARTIAN Mothership",
    ]);
  });
});

describe("1: the preview note", () => {
  it("says Advances or Stays for a kill the attacker survives, and nothing otherwise", () => {
    const note = (
      advances: boolean,
      defenderDies: boolean,
      attackerDies = false,
    ) => advanceCombatNotesV7({ advances, defenderDies, attackerDies });
    expect(note(true, true)).toEqual(["Advances"]);
    expect(note(false, true)).toEqual(["Stays"]);
    expect(note(false, false)).toEqual([]);
    expect(note(false, true, true)).toEqual([]);
  });
});

describe("3: the Human Knight captures settlements", () => {
  const onVillage = (
    faction: FactionIdV7,
    role: UnitRoleIdV7,
    captureEligible: boolean,
  ): GameStateV7 =>
    fieldV7([{ seat: 0, role, at: at(5, 5), captureEligible }], {
      factions: [faction, foeOf(faction)],
    });

  it("is offered Capture under the timing rules of a Fighter and takes the village", () => {
    expect(effectiveRoleRuleV7("KNIGHT", "ORIGINAL").abilities).toEqual([
      "ATTACK",
      "CAPTURE",
      "OVERRUN",
    ]);
    for (const role of ["KNIGHT", "FIGHTER"] as const) {
      // Not on the turn the unit arrives.
      const arrived = onVillage("ORIGINAL", role, false);
      expect(
        offered(arrived, 0).filter((command) => command.kind === "CAPTURE"),
        role,
      ).toEqual([]);
      const ready = onVillage("ORIGINAL", role, true);
      const unit = unitAtV7(ready, at(5, 5));
      const capture: CommandV7 = { kind: "CAPTURE", unitId: unit.id };
      expect(offered(ready, 0), role).toContainEqual(capture);
      const result = applyOkV7(ready, seatIdV7(ready, 0), capture);
      expect(
        result.state.cities.find((city) => city.at.x === 5 && city.at.y === 5)
          ?.ownerId,
        role,
      ).toBe(seatIdV7(ready, 0));
    }
  });

  it("captures the village it has stood on since its turn began, in natural play", () => {
    // The Knight moves onto the village, both seats end their turns, and
    // the Capture is offered on its next turn.
    let state = fieldV7(
      [
        { seat: 0, role: "KNIGHT", at: at(5, 4) },
        { seat: 1, role: "FIGHTER", at: at(1, 1) },
      ],
      { factions: ["ORIGINAL", "DWARF"] },
    );
    const knight = unitAtV7(state, at(5, 4));
    const move = offered(state, 0).find(
      (command) =>
        command.kind === "MOVE" &&
        command.unitId === knight.id &&
        command.path.at(-1)?.x === 5 &&
        command.path.at(-1)?.y === 5,
    );
    if (move === undefined) throw new Error("the Knight cannot reach it");
    state = applyOkV7(state, seatIdV7(state, 0), move).state;
    const capture: CommandV7 = { kind: "CAPTURE", unitId: knight.id };
    expect(offered(state, 0)).not.toContainEqual(capture);
    state = applyOkV7(state, seatIdV7(state, 0), { kind: "END_TURN" }).state;
    state = applyOkV7(state, seatIdV7(state, 1), { kind: "END_TURN" }).state;
    expect(offered(state, 0)).toContainEqual(capture);
    state = applyOkV7(state, seatIdV7(state, 0), capture).state;
    expect(
      state.cities.find((city) => city.at.x === 5 && city.at.y === 5)?.ownerId,
    ).toBe(seatIdV7(state, 0));
  });

  it("leaves the Knight-role units of the other factions without Capture", () => {
    const capturing = FACTION_IDS_V7.filter((faction) =>
      effectiveRoleRuleV7("KNIGHT", faction).abilities.includes("CAPTURE"),
    );
    expect(capturing).toEqual(["ORIGINAL"]);
    expect(
      FACTION_IDS_V7.map(
        (faction) => effectiveRoleRuleV7("KNIGHT", faction).label,
      ),
    ).toEqual([
      "Knight",
      "Vampire",
      "Scrap Buggy",
      "T-Rex",
      "Mothership",
      "Sabretooth",
      "Steam Tank",
      "Chocolate Bunny",
    ]);
  });
});

describe("5: Commerce's capital rule is shown", () => {
  // The Human seat captures the village (8, 5) and builds the Road
  // (8, 6)-(8, 7) to its capital (8, 8).
  const captured = (): GameStateV7 => {
    const base = fieldV7(
      [
        { seat: 0, role: "KNIGHT", at: at(8, 5), captureEligible: true },
        { seat: 1, role: "FIGHTER", at: at(1, 1) },
      ],
      { factions: ["ORIGINAL", "DWARF"] },
    );
    return applyOkV7(base, seatIdV7(base, 0), {
      kind: "CAPTURE",
      unitId: unitAtV7(base, at(8, 5)).id,
    }).state;
  };
  const linked = (): GameStateV7 => {
    let state = captured();
    for (const road of [at(8, 6), at(8, 7)])
      state = applyOkV7(state, seatIdV7(state, 0), {
        kind: "BUILD_ROAD",
        at: road,
      }).state;
    return state;
  };
  const cityAt = (state: GameStateV7, x: number, y: number) => {
    const city = state.cities.find(
      (candidate) => candidate.at.x === x && candidate.at.y === y,
    );
    if (city === undefined) throw new Error("no city");
    return city;
  };
  const status = (state: GameStateV7, x: number, y: number) => {
    const found = landTradeStatusV7(
      viewForV7(state, seatIdV7(state, 0)),
      cityAt(state, x, y).id,
    );
    return found === null ? null : landTradeStatusTextV7(found);
  };

  it("states the rule on the tech card", () => {
    expect(landTradeUnlockTextV7(1)).toBe(
      "Each city linked by Road to another of your cities: +1 Coin each turn",
    );
  });

  // Tuning 3 (`pulp_wars-w49.3`) replaced the capital rule: a city earns
  // while a Road links it to another city of its owner
  // (tests/unit/ruleset-v7-tuning-3.test.ts has the rule itself).
  it("says which cities earn and why the others do not", () => {
    const before = captured();
    for (const [x, y] of [
      [8, 5],
      [8, 8],
    ] as const)
      expect(status(before, x, y)).toBe(
        "No land trade: no Road link to another of your cities",
      );
    const after = linked();
    const owner = seatIdV7(after, 0);
    for (const [x, y] of [
      [8, 5],
      [8, 8],
    ] as const)
      expect(status(after, x, y)).toBe(
        "Land trade +1: linked by Road to another of your cities",
      );
    // The line agrees with the engine.
    expect([...landTradeCityIdsV7(after, owner)].sort()).toEqual(
      [cityAt(after, 8, 5).id, cityAt(after, 8, 8).id].sort(),
    );
    // Another seat's city, and a seat without Commerce, have no line.
    expect(status(after, 2, 8)).toBeNull();
    const plain = fieldV7([], {
      factions: ["ORIGINAL", "DWARF"],
      techs: { 0: withoutTechsV7("ORIGINAL", "COMMERCE") },
    });
    expect(status(plain, 8, 8)).toBeNull();
  });
});
