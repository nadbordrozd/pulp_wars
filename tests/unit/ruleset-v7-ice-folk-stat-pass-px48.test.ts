import { describe, expect, it } from "vitest";
import { OBSOLETE_SAVE_STORAGE_KEYS_V7 } from "../../src/persistence/browser-v7";
import {
  PRIOR_RULESET_7_IDS,
  RULESET_7_ID,
  SAVE_STORAGE_KEY_V7,
} from "../../src/engine/index";
import {
  effectiveRoleRuleV7,
  factionTreeV7,
  roleMechanicsV7,
  type EffectiveRoleRuleV7,
} from "../../src/engine/rules/ruleset-v7";
import {
  NAVAL_ROLE_IDS_V7,
  type UnitRoleIdV7,
} from "../../src/engine/v7/types";

// The Ice Folk stat pass against the Human roster (`pulp_wars-px48`,
// ruleset 7r136, docs/product/ICE_FOLK_REDESIGN_2026-11.md section 7). The
// user, 2026-11-08: "one unit can be plain better than another but let's
// avoid total dominance on every axis". Each Ice Folk unit is paired with
// the Human unit of its mechanical role; on the numeric axes below it must
// be worse than its pair on at least one, unless the pair is a listed
// exception with a reason. Glide, Mountain-born and every other ability
// are abilities, not axes. No match is played.

type Axis =
  | "cost"
  | "maxHp"
  | "attack"
  | "defense"
  | "move"
  | "range"
  | "attackAfterMove";

/**
 * For each axis, a negative number when the Ice Folk unit is worse than
 * its Human pair, zero when they tie, positive when it is better. A lower
 * cost is better; a reward unit (no cost) ties on cost.
 */
const compare = (
  ice: EffectiveRoleRuleV7,
  human: EffectiveRoleRuleV7,
): Record<Axis, number> => ({
  cost: ice.cost === null || human.cost === null ? 0 : human.cost - ice.cost,
  maxHp: ice.maxHp - human.maxHp,
  attack: ice.attack2 - human.attack2,
  defense: ice.defense2 - human.defense2,
  move: ice.move - human.move,
  range: ice.range - human.range,
  attackAfterMove:
    Number(ice.mayUsePrimaryActionAfterMove) -
    Number(human.mayUsePrimaryActionAfterMove),
});

const worseAxes = (role: UnitRoleIdV7): Axis[] =>
  Object.entries(
    compare(
      effectiveRoleRuleV7(role, "ICE_FOLK"),
      effectiveRoleRuleV7(role, "ORIGINAL"),
    ),
  )
    .filter(([, delta]) => delta < 0)
    .map(([axis]) => axis as Axis);

/** Every Ice Folk land unit: the eight trained ones and the reward giant. */
const ICE_FOLK_LAND_ROLES = [
  "FIGHTER",
  "RAIDER",
  "MARKSMAN",
  "GUARD",
  "CAPTAIN",
  "CATAPULT",
  "KNIGHT",
  "SWORDSMAN",
  "JUGGERNAUT",
] as const satisfies readonly UnitRoleIdV7[];

/**
 * Pairs allowed to be at least the Human unit's equal on every axis, with
 * the reason (docs section 7). Empty since 7r136: the Sled, the one unit
 * that tied the Raider on every number, has 11 HP.
 */
const JUSTIFIED_EXCEPTIONS: Readonly<Partial<Record<UnitRoleIdV7, string>>> =
  {};

/** Where each Ice Folk unit gives way to its Human pair (docs section 7). */
const EXPECTED_WORSE_AXES: Readonly<
  Record<(typeof ICE_FOLK_LAND_ROLES)[number], readonly Axis[]>
> = {
  FIGHTER: ["maxHp", "defense"], // Yeti 9 HP, Defense 1.5 / Fighter 12, 2
  RAIDER: ["maxHp"], // Sled 11 HP / Raider 12 (7r136)
  MARKSMAN: ["maxHp"], // Snow Hunter 8 HP / Marksman 12
  GUARD: ["cost", "maxHp", "defense"], // Walrus 4, 16, 2 / Guard 3, 17, 3
  CAPTAIN: ["cost"], // Ice Witch 6 / Captain 5
  CATAPULT: ["cost"], // Snow Golem 9 / Catapult 8
  KNIGHT: ["attack"], // Frost Wyrm Attack 3 / Knight 4
  SWORDSMAN: ["cost", "attack", "defense"], // Mammoth 8, 3, 2 / Champion 6, 3.5, 2.5
  JUGGERNAUT: ["maxHp"], // Frost Giant 36 HP / Juggernaut 40
};

describe("the identity (pulp_wars-px48)", () => {
  it("is 7r136 after 7r135, whose save key is obsolete now", () => {
    expect(RULESET_7_ID).toBe("pulp-wars-poc-7r138");
    expect(SAVE_STORAGE_KEY_V7).toBe("pulpWars.save.v7r138.current");
    expect(PRIOR_RULESET_7_IDS.at(-3)).toBe("pulp-wars-poc-7r135");
    expect(PRIOR_RULESET_7_IDS).not.toContain(RULESET_7_ID);
    expect(OBSOLETE_SAVE_STORAGE_KEYS_V7.at(-3)).toBe(
      "pulpWars.save.v7r135.current",
    );
    expect(OBSOLETE_SAVE_STORAGE_KEYS_V7).not.toContain(SAVE_STORAGE_KEY_V7);
  });
});

describe("the Ice Folk stat pass (pulp_wars-px48)", () => {
  it("gives the Sled 11 HP and leaves the rest of its numbers the Raider's", () => {
    const sled = effectiveRoleRuleV7("RAIDER", "ICE_FOLK");
    const raider = effectiveRoleRuleV7("RAIDER", "ORIGINAL");
    expect(sled).toMatchObject({
      label: "Sled",
      cost: 4,
      maxHp: 11,
      attack2: 4,
      defense2: 2,
      move: 2,
      range: 1,
      sightRadius: 2,
      mayUsePrimaryActionAfterMove: true,
    });
    expect(raider.maxHp).toBe(12);
    // The trade: the Raider slips past zones of control (Prowl), the Sled
    // Glides over Snow and ice.
    expect(roleMechanicsV7("RAIDER", "ORIGINAL").ignoresZocStops).toBe(true);
    expect(roleMechanicsV7("RAIDER", "ICE_FOLK").ignoresZocStops).toBe(false);
    expect(roleMechanicsV7("RAIDER", "ICE_FOLK").glides).toBe(true);
  });

  it.each(ICE_FOLK_LAND_ROLES)(
    "the Ice Folk %s is worse than its Human pair on some axis",
    (role) => {
      const worse = worseAxes(role);
      if (JUSTIFIED_EXCEPTIONS[role] !== undefined) return;
      expect(worse.length).toBeGreaterThan(0);
      expect(worse).toEqual(EXPECTED_WORSE_AXES[role]);
    },
  );

  it("lists no exception for a unit that is already worse somewhere", () => {
    for (const role of Object.keys(JUSTIFIED_EXCEPTIONS) as UnitRoleIdV7[])
      expect(worseAxes(role)).toEqual([]);
  });

  it("has no Ice Folk ship to pair: no Ice Folk technology unlocks one", () => {
    const unlocked = factionTreeV7("ICE_FOLK").nodes.flatMap((node) =>
      node.unlocks.flatMap((unlock) =>
        unlock.kind === "UNIT_ROLE" ? [unlock.role] : [],
      ),
    );
    for (const ship of NAVAL_ROLE_IDS_V7) expect(unlocked).not.toContain(ship);
  });
});
