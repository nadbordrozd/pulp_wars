import {
  CRACKED_DEFENSE2_V7,
  UNIT_ROLE_IDS_V7,
  effectiveRoleRuleV7,
  isNavalRoleV7,
  roleMechanicsV7,
  type FactionIdV7,
  type UnitRoleIdV7,
} from "../engine/index";

/**
 * The ninth unit (`pulp_wars-w49.17`, `pulp-wars-poc-7r55`,
 * docs/product/RULESET_7_NINTH_UNIT.md): the words of the mechanics of the
 * units added to every roster. Each text is read from the role mechanics,
 * so a unit card, the Help, the Gallery, and the text harness say the same
 * thing and no number is written twice.
 */

export const HEAVYWEIGHT_LABEL_V7 = "Heavyweight";
export const RISE_AGAIN_LABEL_V7 = "Rise Again";
export const SHOCK_FIELD_LABEL_V7 = "Shock Field";
export const ROCK_HARD_LABEL_V7 = "Rock Hard";
export const THAGOMIZER_LABEL_V7 = "Thagomizer";
export const FROSTBITE_LABEL_V7 = "Frostbite";
export const WHIRL_LABEL_V7 = "Whirl";
export const CRACKED_LABEL_V7 = "Cracked";
/** The Human heavy line unit (the role `SWORDSMAN`): the Champion. */
export const CHAMPION_LABEL_V7 = effectiveRoleRuleV7(
  "SWORDSMAN",
  "ORIGINAL",
).label;
/** The board label of a Grave a Wight will climb out of. */
export const WIGHT_GRAVE_LABEL_V7 = "Wight's Grave";

/**
 * The ninth-unit lines of an attack preview: what the Shock Field takes
 * from the attacker, the Crack the hit leaves, and the attacker's
 * Frostbite.
 */
export function ninthUnitCombatNotesV7(preview: {
  readonly shockDamage: number;
  readonly crackApplied: boolean;
  readonly frostbiteApplied: boolean;
}): readonly string[] {
  return [
    ...(preview.shockDamage > 0
      ? [`${SHOCK_FIELD_LABEL_V7}: attacker takes ${preview.shockDamage}`]
      : []),
    ...(preview.crackApplied
      ? [`${CRACKED_LABEL_V7}: ${half(CRACKED_DEFENSE2_V7)} less Defense`]
      : []),
    ...(preview.frostbiteApplied
      ? [`${FROSTBITE_LABEL_V7}: attacker Chilled`]
      : []),
  ];
}

const numberWord = (value: number): string =>
  ["no", "one", "two", "three", "four", "five", "six"][value] ?? String(value);
const half = (value2: number): string => String(value2 / 2);

/** One mechanic of a role: its name and its one-sentence rule. */
export interface NinthUnitMechanicTextV7 {
  readonly name: string;
  readonly rule: string;
}

/**
 * The ninth-unit mechanics of `role` under `faction`, in a fixed order; an
 * empty list for a role without one (every older unit, and the Human
 * Champion, the baseline heavy).
 */
export function ninthUnitMechanicsV7(
  role: UnitRoleIdV7,
  faction: FactionIdV7,
): readonly NinthUnitMechanicTextV7[] {
  if (isNavalRoleV7(role)) return [];
  const mechanics = roleMechanicsV7(role, faction);
  const result: NinthUnitMechanicTextV7[] = [];
  if (mechanics.gangUpWeight > 1)
    result.push({
      name: HEAVYWEIGHT_LABEL_V7,
      rule: `counts as ${numberWord(mechanics.gangUpWeight)} units for Gang Up when it stands next to the target of another of your units`,
    });
  if (mechanics.riseAgainHp !== null)
    result.push({
      name: RISE_AGAIN_LABEL_V7,
      rule: `when it dies and leaves a Grave, it climbs out of that Grave at the start of your next turn with ${mechanics.riseAgainHp} HP, once, unless a unit stands on the Grave or the Grave is gone`,
    });
  if (mechanics.shockFieldDamage > 0)
    result.push({
      name: SHOCK_FIELD_LABEL_V7,
      rule: `while it has Shield, a unit that attacks it from the next tile takes ${mechanics.shockFieldDamage} damage`,
    });
  if (mechanics.immovable)
    result.push({
      name: ROCK_HARD_LABEL_V7,
      rule: "nothing moves it: it is never pushed, pulled, knocked back, or bounced",
    });
  if (mechanics.cracksArmour)
    result.push({
      name: THAGOMIZER_LABEL_V7,
      rule: `a unit it hits is ${CRACKED_LABEL_V7}: ${half(CRACKED_DEFENSE2_V7)} less Defense until the end of your turn`,
    });
  if (mechanics.frostbite)
    result.push({
      name: FROSTBITE_LABEL_V7,
      rule: "a unit that attacks it from the next tile and survives is Chilled",
    });
  // Dwarf crowd control (`pulp_wars-w49.33`): the Whirligig's Whirl.
  if (mechanics.whirl)
    result.push({
      name: WHIRL_LABEL_V7,
      rule: "hits every enemy next to it at once with its attack, and nobody hits back",
    });
  return result;
}

/** The unit-card lines of the ninth-unit mechanics of a role. */
export function ninthUnitRecruitNotesV7(
  role: UnitRoleIdV7,
  faction: FactionIdV7,
): readonly string[] {
  return ninthUnitMechanicsV7(role, faction).map(
    (entry) =>
      `${entry.name}: ${entry.rule.replace(/^./, (letter) => letter.toUpperCase())}.`,
  );
}

/**
 * The Help sentences of a faction's ninth-unit mechanics, one per mechanic,
 * each naming its unit: `["Heavyweight", "an Ogre counts as two units ..."]`.
 */
export function ninthUnitHelpRulesV7(
  faction: FactionIdV7,
): readonly (readonly [string, string])[] {
  return UNIT_ROLE_IDS_V7.flatMap((role) => {
    const label = effectiveRoleRuleV7(role, faction).label;
    const article = /^[AEIOU]/.test(label) ? "an" : "a";
    return ninthUnitMechanicsV7(role, faction).map(
      (entry) =>
        [
          entry.name,
          `${article} ${label}: ${entry.rule.replaceAll("your", "its owner's")}.`,
        ] as const,
    );
  });
}
