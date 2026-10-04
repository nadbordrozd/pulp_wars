import { describe, expect, it } from "vitest";
import {
  calculateCombatPreviewV7,
  type FactionIdV7,
  type GameStateV7,
  type UnitRoleIdV7,
} from "../../src/engine/index";
import { checkedV7 } from "../fixtures/v7-builders";
import {
  candyFieldV7,
  dealsTakesV7,
  exchangeV7,
  type CandyPieceV7,
} from "../fixtures/v7-candy";
import { unitAtV7 } from "../fixtures/v7-goblin-arena";
import {
  at,
  fieldDefenseV7,
  movedV7,
  walledV7,
} from "../fixtures/v7-revision20";

// The Candy contract (docs/product/RULESET_7_CANDY.md section 11): the
// per-unit battle analysis, re-run by the engine with the real Candy
// registration at the identity the engine bead lands on (section 18, "first
// step"). Every cell is "deals / takes" at full HP on open Grass ("-": no
// strike-back; "+n sh": what a Martian Shield absorbed; "kill": the defender
// dies). The values are the contract's; the two readings the registry moved
// since the contract was written are marked.

type Extra = Partial<CandyPieceV7>;

interface DuelOptions {
  readonly distance?: 1 | 2;
  readonly attackerExtra?: Extra;
  readonly defenderExtra?: Extra;
  /** Other own units next to the target (Gang Up). */
  readonly helpers?: number;
  /** The defender stands on Field Defense in its own territory. */
  readonly fieldDefense?: boolean;
  /** The defender stands in its own territory (Snow for an Ice Folk seat). */
  readonly ownTerritory?: boolean;
}

function duel(
  attackerFaction: FactionIdV7,
  attacker: UnitRoleIdV7,
  defenderFaction: FactionIdV7,
  defender: UnitRoleIdV7,
  options: DuelOptions = {},
): string {
  const distance = options.distance ?? 1;
  const home = options.fieldDefense === true || options.ownTerritory === true;
  const target = home ? at(2, 7) : at(5, 2);
  const from = home ? at(2, 7 - distance) : at(5, 2 + distance);
  const helpers: CandyPieceV7[] = Array.from(
    { length: options.helpers ?? 0 },
    (_, index) => ({
      seat: 0,
      role: "FIGHTER" as const,
      at: at(4 + index * 2, 1),
    }),
  );
  let state: GameStateV7 = candyFieldV7(
    [
      { seat: 0, role: attacker, at: from, ...options.attackerExtra },
      { seat: 1, role: defender, at: target, ...options.defenderExtra },
      ...helpers,
    ],
    { factions: [attackerFaction, defenderFaction] },
  );
  if (options.fieldDefense === true) state = fieldDefenseV7(state, target);
  return dealsTakesV7(exchangeV7(state, from, target));
}

const RUSH: Extra = { rush: "RUSHED" };
const CHARGE: Extra = { activation: movedV7(2) };

type Unit = readonly [FactionIdV7, UnitRoleIdV7];
const H = (role: UnitRoleIdV7): Unit => ["ORIGINAL", role];
const UNITS = {
  Fighter: H("FIGHTER"),
  Marksman: H("MARKSMAN"),
  Raider: H("RAIDER"),
  Catapult: H("CATAPULT"),
  Captain: H("CAPTAIN"),
  Knight: H("KNIGHT"),
  Guard: H("GUARD"),
  Juggernaut: H("JUGGERNAUT"),
  Hammerer: ["DWARF", "FIGHTER"],
  Caveman: ["DINOSAUR", "FIGHTER"],
  Skeleton: ["UNDEAD", "FIGHTER"],
  Yeti: ["ICE_FOLK", "FIGHTER"],
  Goblin: ["GOBLIN", "FIGHTER"],
  Grunt: ["MARTIAN", "FIGHTER"],
  Zombie: ["UNDEAD", "GUARD"],
  Sled: ["ICE_FOLK", "RAIDER"],
  "Ray Gunner": ["MARTIAN", "MARKSMAN"],
  Sabretooth: ["ICE_FOLK", "KNIGHT"],
  "Scrap Buggy": ["GOBLIN", "KNIGHT"],
  "Wolf Rider": ["GOBLIN", "RAIDER"],
  Raptor: ["DINOSAUR", "RAIDER"],
  Lich: ["UNDEAD", "CATAPULT"],
  Vampire: ["UNDEAD", "KNIGHT"],
  "Snow Hunter": ["ICE_FOLK", "MARKSMAN"],
  "Orc Brute": ["GOBLIN", "GUARD"],
  Mammoth: ["ICE_FOLK", "GUARD"],
  "T-Rex": ["DINOSAUR", "KNIGHT"],
  Ankylosaurus: ["DINOSAUR", "GUARD"],
  "Steam Mole": ["DWARF", "GUARD"],
  "Shield Projector": ["MARTIAN", "GUARD"],
  Necromancer: ["UNDEAD", "CAPTAIN"],
  Ghoul: ["UNDEAD", "RAIDER"],
  Banshee: ["UNDEAD", "MARKSMAN"],
  Shaman: ["DINOSAUR", "CAPTAIN"],
  Spitter: ["DINOSAUR", "MARKSMAN"],
  "Ice Witch": ["ICE_FOLK", "CAPTAIN"],
  "Bomb Chucker": ["GOBLIN", "MARKSMAN"],
  "Rocket Cart": ["GOBLIN", "CATAPULT"],
  "Orc Warboss": ["GOBLIN", "CAPTAIN"],
  Brain: ["MARTIAN", "CAPTAIN"],
  Saucer: ["MARTIAN", "RAIDER"],
  Gyrocopter: ["DWARF", "RAIDER"],
  "Clockwork Gunner": ["DWARF", "MARKSMAN"],
  Engineer: ["DWARF", "CAPTAIN"],
  "Steam Cannon": ["DWARF", "CATAPULT"],
} as const satisfies Record<string, Unit>;
type UnitName = keyof typeof UNITS;

/** A Candy `role` attacks `name`. */
const candyHits = (
  role: UnitRoleIdV7,
  name: UnitName,
  options: DuelOptions = {},
): string => duel("CANDY", role, UNITS[name][0], UNITS[name][1], options);

/** `name` attacks a Candy `role`. */
const hitsCandy = (
  name: UnitName,
  role: UnitRoleIdV7,
  options: DuelOptions = {},
): string => duel(UNITS[name][0], UNITS[name][1], "CANDY", role, options);

describe("Candy battle analysis, re-run by the engine (section 11)", () => {
  it("Gumdrop (11.2): plain and Rushed attacks", () => {
    const table: readonly [UnitName, string, string, DuelOptions?][] = [
      ["Fighter", "5 / 5", "8 / 4"],
      ["Marksman", "6 / 2", "10 / 1"],
      ["Raider", "6 / 2", "10 / 1"],
      ["Catapult", "7 / -", "10, kill"],
      ["Captain", "6 / 2", "10, kill"],
      ["Knight", "6 / 2", "10, kill"],
      ["Hammerer", "5 / 5", "8 / 4"],
      ["Caveman", "5 / 5", "8 / 4"],
      ["Skeleton", "5 / 5", "8 / 4"],
      ["Yeti", "5 / 3", "9, kill"],
      ["Goblin", "6, kill", "6, kill"],
      ["Grunt", "3 +2 sh / 3", "7 +2 sh / 2"],
      ["Guard", "4 / 8", "7 / 7"],
      ["Zombie", "5 / 5", "8 / 4"],
      ["Fighter", "4 / 8", "7 / 7", { fieldDefense: true }],
    ];
    for (const [name, plain, rushed, options] of table) {
      expect(candyHits("FIGHTER", name, options), name).toBe(plain);
      expect(
        candyHits("FIGHTER", name, { ...options, attackerExtra: RUSH }),
        `Rushed on ${name}`,
      ).toBe(rushed);
    }
    // A Yeti on its own Snow: cover is x 1.25 since `pulp_wars-1wy.3`, so a
    // plain Gumdrop now deals 5 and takes 3 (the contract's 4 / 4 was read
    // with the earlier x 1.5); the Rushed 8 / 3 stands: no kill on Snow.
    expect(candyHits("FIGHTER", "Yeti", { ownTerritory: true })).toBe("5 / 3");
    expect(
      candyHits("FIGHTER", "Yeti", { ownTerritory: true, attackerExtra: RUSH }),
    ).toBe("8 / 3");
  });

  it("Gumdrop (11.2): what attackers deal it", () => {
    const table: readonly [UnitName, string, DuelOptions?][] = [
      ["Fighter", "5 / 5"],
      ["Skeleton", "5 / 5"],
      ["Caveman", "5 / 5"],
      ["Yeti", "5 / 5"],
      ["Knight", "8 / 4"],
      ["Sabretooth", "8 / 4"],
      ["Scrap Buggy", "8 / 4"],
      ["Raider", "8 / 4", { attackerExtra: CHARGE }],
      ["Wolf Rider", "8 / 4", { attackerExtra: CHARGE }],
      ["Raptor", "10, kill", { attackerExtra: CHARGE }],
      ["Goblin", "6 / 4", { helpers: 1 }],
      ["Goblin", "10, kill", { helpers: 2 }],
      ["Catapult", "10, kill", { distance: 2 }],
      ["Lich", "8 / -", { distance: 2 }],
      ["Vampire", "8 / -"],
      ["Marksman", "5 / -", { distance: 2 }],
      ["Snow Hunter", "5 / -", { distance: 2 }],
      ["Ray Gunner", "8 / -", { distance: 2 }],
    ];
    for (const [name, expected, options] of table)
      expect(hitsCandy(name, "FIGHTER", options), name).toBe(expected);
  });

  it("Donut Racer (11.3): Rush and Charge never add up", () => {
    const table: readonly [UnitName, string, string][] = [
      ["Fighter", "5 / 5", "8 / 4"],
      ["Hammerer", "5 / 5", "8 / 4"],
      ["Marksman", "6 / 2", "10 / 1"],
      ["Raider", "6 / 2", "10 / 1"],
      ["Catapult", "7 / -", "10, kill"],
      ["Captain", "6 / 2", "10, kill"],
      ["Sled", "6 / 2", "10, kill"],
      ["Ray Gunner", "4 +2 sh / 2", "8 +2 sh, kill"],
    ];
    for (const [name, plain, boosted] of table) {
      expect(candyHits("RAIDER", name), name).toBe(plain);
      for (const attackerExtra of [CHARGE, RUSH, { ...RUSH, ...CHARGE }])
        expect(candyHits("RAIDER", name, { attackerExtra }), name).toBe(
          boosted,
        );
    }
  });

  it("Gumball Gunner (11.4)", () => {
    expect(candyHits("MARKSMAN", "Fighter", { distance: 2 })).toBe("5 / -");
    expect(candyHits("MARKSMAN", "Marksman", { distance: 2 })).toBe("6 / 2");
    expect(
      candyHits("MARKSMAN", "Marksman", { distance: 2, attackerExtra: RUSH }),
    ).toBe("10 / 1");
    expect(
      candyHits("MARKSMAN", "Fighter", { distance: 2, attackerExtra: RUSH }),
    ).toBe("8 / -");
    expect(hitsCandy("Marksman", "MARKSMAN", { distance: 2 })).toBe("6 / 2");
    expect(hitsCandy("Knight", "MARKSMAN")).toBe("8, kill");
    expect(hitsCandy("Catapult", "MARKSMAN", { distance: 2 })).toBe("8, kill");
  });

  it("Marshmallow (11.5)", () => {
    const table: readonly [UnitName, string, DuelOptions?][] = [
      ["Fighter", "4 / 6"],
      ["Skeleton", "4 / 6"],
      ["Hammerer", "4 / 6"],
      ["Zombie", "4 / 6"],
      ["Orc Brute", "4 / 6"],
      ["Guard", "3 / 7"],
      ["Knight", "7 / 5"],
      ["Raptor", "9 / 5", { attackerExtra: CHARGE }],
      ["Goblin", "9 / 5", { helpers: 2 }],
      ["Mammoth", "6 / 6"],
      ["T-Rex", "11 / 4"],
      ["Catapult", "9 / -", { distance: 2 }],
      ["Marksman", "4 / -", { distance: 2 }],
      ["Juggernaut", "11 / 4"],
    ];
    for (const [name, expected, options] of table)
      expect(hitsCandy(name, "GUARD", options), name).toBe(expected);
    expect(candyHits("GUARD", "Fighter")).toBe("3 / 5");
    expect(candyHits("GUARD", "Fighter", { attackerExtra: RUSH })).toBe(
      "6 / 4",
    );
  });

  it("Confectioner (11.6): one blow from the hunters", () => {
    expect(hitsCandy("Vampire", "CAPTAIN")).toBe("10, kill");
    expect(hitsCandy("Knight", "CAPTAIN")).toBe("10, kill");
    expect(hitsCandy("Raptor", "CAPTAIN", { attackerExtra: CHARGE })).toBe(
      "10, kill",
    );
    expect(hitsCandy("Lich", "CAPTAIN", { distance: 2 })).toBe("10, kill");
    expect(hitsCandy("Fighter", "CAPTAIN")).toBe("6 / 2");
  });

  it("Pie Launcher (11.7): from range 2, plain, Rushed, and the Catapult", () => {
    const table: readonly [UnitName, string, string, string, DuelOptions?][] = [
      ["Fighter", "8 / -", "12, kill", "10 / -"],
      ["Guard", "7 / -", "10 / -", "8 / -"],
      ["Guard", "6 / -", "9 / -", "7 / -", { fieldDefense: true }],
      ["Ankylosaurus", "6 / -", "9 / -", "7 / -"],
      ["Juggernaut", "6 / -", "9 / -", "7 / -"],
      ["T-Rex", "8 / -", "12 / -", "10 / -"],
      ["Zombie", "8 / -", "12 / -", "10 / -"],
      ["Steam Mole", "7 / -", "11 / -", "9 / -"],
      ["Shield Projector", "4 +3 sh / -", "8 +3 sh / -", "6 +3 sh / -"],
      ["Captain", "10, kill", "10, kill", "10, kill"],
    ];
    for (const [name, pie, rushed, catapult, options] of table) {
      const ranged = { ...options, distance: 2 } as const;
      expect(candyHits("CATAPULT", name, ranged), name).toBe(pie);
      expect(
        candyHits("CATAPULT", name, { ...ranged, attackerExtra: RUSH }),
        name,
      ).toBe(rushed);
      expect(
        duel("ORIGINAL", "CATAPULT", UNITS[name][0], UNITS[name][1], ranged),
        name,
      ).toBe(catapult);
    }
  });

  it("Pie Launcher (11.7): the cracking of a Walled Guard with Field Defense", () => {
    const walled = (
      role: UnitRoleIdV7,
      rushed: boolean,
      guardHp: number,
    ): string => {
      const from = role === "CATAPULT" ? at(8, 6) : at(8, 7);
      const base = walledV7({
        attackerFaction: "CANDY",
        defender: "GUARD",
        attackers: [{ role, at: from }],
        fieldDefense: true,
      });
      const attacker = unitAtV7(base, from);
      const state = checkedV7({
        ...base,
        units: base.units.map((unit) =>
          unit.at.x === 8 && unit.at.y === 8 ? { ...unit, hp: guardHp } : unit,
        ),
        sugarRush: rushed ? [{ unitId: attacker.id, phase: "RUSHED" }] : [],
      });
      return dealsTakesV7(
        calculateCombatPreviewV7(
          state,
          attacker.id,
          unitAtV7(state, at(8, 8)).id,
        ),
      );
    };
    // The Pie: 5 (7 Rushed), the Guard at 12; a Rushed Gumdrop deals 6 and
    // would take 10 without the Splat; the second Rushed Gumdrop kills.
    expect(walled("CATAPULT", false, 17)).toBe("5 / -");
    expect(walled("CATAPULT", true, 17)).toBe("7 / -");
    expect(walled("FIGHTER", true, 12)).toBe("6 / 10");
    expect(walled("FIGHTER", true, 6)).toBe("6, kill");
    // Without the Rush the Gumdrops deal 3; without the Pie a Rushed
    // Gumdrop deals 5 and takes 10 (it dies).
    expect(walled("FIGHTER", false, 12)).toBe("3 / 10");
    expect(walled("FIGHTER", true, 17)).toBe("5 / 10");
    // The same pair kills a full Zombie: Pie 8, then a Rushed Gumdrop 10.
    expect(candyHits("CATAPULT", "Zombie", { distance: 2 })).toBe("8 / -");
    expect(
      candyHits("FIGHTER", "Zombie", {
        attackerExtra: RUSH,
        defenderExtra: { hp: 10 },
      }),
    ).toBe("10, kill");
  });

  it("Gummy Bear (11.8): the Rushed first attack and the continuation at 3", () => {
    // [target, Rushed first attack, continuation (plain Attack 3)].
    const table: readonly [UnitName, string, string, DuelOptions?][] = [
      ["Fighter", "12, kill", "8 / 4"],
      ["Marksman", "12, kill", "10 / 1"],
      ["Raider", "12, kill", "10 / 1"],
      ["Hammerer", "12, kill", "8 / 4"],
      ["Skeleton", "10, kill", "8 / 4"],
      ["Caveman", "10, kill", "8 / 4"],
      // The contract read the Ice Witch as 9 / 2; the engine gives 10 / 1
      // (12 HP, Defense 1, like a Marksman). The verdict stands: the
      // continuation stops on her.
      ["Ice Witch", "12, kill", "10 / 1"],
      ["Orc Warboss", "12, kill", "10 / 1"],
      ["Grunt", "9 +2 sh, kill", "7 +2 sh / 2"],
      ["Guard", "10 / 6", "7 / 7"],
      ["Guard", "9 / 9", "6 / 10", { fieldDefense: true }],
    ];
    for (const [name, first, continuation, options] of table) {
      expect(
        candyHits("KNIGHT", name, { ...options, attackerExtra: RUSH }),
        name,
      ).toBe(first);
      expect(candyHits("KNIGHT", name, options), name).toBe(continuation);
    }
    // The continuation kills every unit of 10 HP or less with Defense 1 or
    // less.
    const soft: readonly UnitName[] = [
      "Catapult",
      "Captain",
      "Knight",
      "Lich",
      "Necromancer",
      "Vampire",
      "Ghoul",
      "Banshee",
      "Shaman",
      "Spitter",
      "Yeti",
      "Sled",
      "Snow Hunter",
      "Wolf Rider",
      "Bomb Chucker",
      "Rocket Cart",
      "Scrap Buggy",
      "Goblin",
      "Brain",
      "Saucer",
      "Ray Gunner",
      "Gyrocopter",
      "Clockwork Gunner",
      "Engineer",
      "Steam Cannon",
    ];
    for (const name of soft)
      expect(candyHits("KNIGHT", name), name).toMatch(/, kill$/);
    // A Re-baked Bear (7 of 14 HP) on a Fighter.
    expect(
      candyHits("KNIGHT", "Fighter", { attackerExtra: { ...RUSH, hp: 7 } }),
    ).toBe("9 / 5");
  });

  it("Gummy Bear (11.8): what attackers deal it", () => {
    const table: readonly [UnitName, string, DuelOptions?][] = [
      ["Fighter", "5 / 3"],
      ["Knight", "9 / 2"],
      ["Ray Gunner", "9 / -", { distance: 2 }],
      // From range 1 the Bear answers with 2, which the Shield absorbs.
      ["Ray Gunner", "9 / 0"],
      ["Catapult", "11 / -", { distance: 2 }],
      ["T-Rex", "13 / 2"],
      // Crashed in the enemy's lines: a Fighter and a Knight kill it.
      ["Fighter", "5 / 3", { defenderExtra: { hp: 13 } }],
      ["Knight", "8, kill", { defenderExtra: { hp: 8 } }],
      ["Fighter", "6 / 2", { defenderExtra: { hp: 10 } }],
      ["Knight", "4, kill", { defenderExtra: { hp: 4 } }],
    ];
    for (const [name, expected, options] of table)
      expect(hitsCandy(name, "KNIGHT", options), name).toBe(expected);
  });

  it("Rock Candy Golem (11.9)", () => {
    expect(hitsCandy("Juggernaut", "JUGGERNAUT")).toBe("10 / 7");
    expect(candyHits("JUGGERNAUT", "Juggernaut")).toBe("9 / 9");
    expect(candyHits("JUGGERNAUT", "Juggernaut", { attackerExtra: RUSH })).toBe(
      "13 / 8",
    );
    expect(candyHits("JUGGERNAUT", "Fighter")).toBe("12, kill");
    expect(candyHits("JUGGERNAUT", "Guard")).toBe("10 / 6");
    expect(candyHits("JUGGERNAUT", "Guard", { attackerExtra: RUSH })).toBe(
      "14 / 5",
    );
    expect(hitsCandy("Fighter", "JUGGERNAUT")).toBe("3 / 10");
    expect(hitsCandy("Knight", "JUGGERNAUT")).toBe("6 / 8");
  });
});
