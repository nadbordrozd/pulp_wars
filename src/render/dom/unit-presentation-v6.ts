import {
  effectiveRoleRuleV6,
  type FactionIdV6,
  type PlayerViewV6,
  type UnitRoleAbilityV6,
} from "../../engine/index";

export const SPECIAL_UNIT_ABILITY_IDS_V6 = Object.freeze([
  "BREACH",
  "BUILD_CHOCOLATE_WALL",
  "CANDIFY",
  "CHARGE",
  "HEAL_ADJACENT",
  "IGNORE_ZOC_WITH_MANEUVER",
  "KAMIKAZE_ROLL",
  "PUSH",
] as const satisfies readonly UnitRoleAbilityV6[]);

export type SpecialUnitAbilityIdV6 =
  (typeof SPECIAL_UNIT_ABILITY_IDS_V6)[number];

export interface UnitAbilityDetailV6 {
  readonly id: SpecialUnitAbilityIdV6;
  readonly name: string;
  readonly description: string;
}

/**
 * Shared player-facing explanations for the special abilities stored in the
 * canonical Ruleset 6 faction-role bindings. Ordinary Attack and Capture are
 * contextual commands, not special-ability tags.
 */
export const UNIT_ABILITY_DETAILS_V6: Readonly<
  Record<SpecialUnitAbilityIdV6, UnitAbilityDetailV6>
> = Object.freeze({
  BREACH: Object.freeze({
    id: "BREACH",
    name: "Breach",
    description:
      "Melee attacks ignore terrain, city, City Walls, and Fortification defense bonuses. The target keeps its base Defense and can retaliate normally. Breach gives no extra damage against a Chocolate Wall.",
  }),
  BUILD_CHOCOLATE_WALL: Object.freeze({
    id: "BUILD_CHOCOLATE_WALL",
    name: "Chocolate Wall",
    description:
      "Build a 10 HP Chocolate Wall for 1 Coin on an adjacent explored tile with no unit, wall, or settlement. Building the wall ends this unit's activation; terrain, resources, improvements, Roads, and territory remain underneath.",
  }),
  CANDIFY: Object.freeze({
    id: "CANDIFY",
    name: "Candify",
    description:
      "Sacrifice this unit on an explored non-settlement tile not already controlled by its owner to assign the tile to a nearest viable city within that city's 3 x 3 or expanded 5 x 5 footprint. Candify may follow one Move and can annex neutral or hostile territory, but grants no population or income.",
  }),
  CHARGE: Object.freeze({
    id: "CHARGE",
    name: "Charge",
    description:
      "After moving at least two tiles earlier in the same turn, this unit's next melee Attack gains +1 Attack. Charge does not make the unit retreat after attacking.",
  }),
  HEAL_ADJACENT: Object.freeze({
    id: "HEAL_ADJACENT",
    name: "Heal",
    description:
      "Use this unit's action to restore 4 HP to an adjacent damaged unit owned by the same player, or 6 HP after Recovery is researched, without exceeding maximum HP. Heal may follow Move and replaces Attack for the turn.",
  }),
  IGNORE_ZOC_WITH_MANEUVER: Object.freeze({
    id: "IGNORE_ZOC_WITH_MANEUVER",
    name: "Maneuver",
    description:
      "After Maneuver is researched, ordinary movement ignores hostile zones of control. Occupied tiles still block movement, and Maneuver does not alter Kamikaze Roll.",
  }),
  KAMIKAZE_ROLL: Object.freeze({
    id: "KAMIKAZE_ROLL",
    name: "Kamikaze Roll",
    description:
      "Roll in a cardinal line to the board edge, revealing only each path tile and dealing 10 damage to every unit or Chocolate Wall encountered, regardless of relationship or Defense. Victims resolve in path order, then the Donut is removed.",
  }),
  PUSH: Object.freeze({
    id: "PUSH",
    name: "Push",
    description:
      "When a melee target survives, push it one tile directly away if that tile is on the board, explored by the attacker, traversable for the target, and free of units, Chocolate Walls, and settlements. Push never captures or triggers zones of control.",
  }),
});

export interface SelectedUnitStatV6 {
  readonly id: "ATTACK" | "DEFENSE" | "MOVE" | "RANGE" | "SIGHT";
  readonly label: string;
  readonly value: string;
}

export interface SelectedUnitPresentationV6 {
  readonly unitId: number;
  readonly faction: FactionIdV6;
  readonly label: string;
  readonly stats: readonly SelectedUnitStatV6[];
  readonly abilities: readonly UnitAbilityDetailV6[];
}

/** Observation-safe adapter from a visible unit to its canonical role rules. */
export function selectedUnitPresentationV6(
  view: PlayerViewV6,
  unitId: number,
): SelectedUnitPresentationV6 | null {
  const unit = view.units.find((candidate) => candidate.id === unitId);
  if (unit === undefined) return null;
  const faction = view.players.find(
    (candidate) => candidate.id === unit.ownerId,
  )?.faction;
  if (faction === undefined) return null;
  const rule = effectiveRoleRuleV6(faction, unit.role);
  const abilities = uniqueSpecialAbilities(rule.abilities).map(
    (ability) => UNIT_ABILITY_DETAILS_V6[ability],
  );
  return Object.freeze({
    unitId: unit.id,
    faction,
    label: rule.label,
    stats: Object.freeze([
      Object.freeze({
        id: "ATTACK" as const,
        label: "Attack",
        value: formatHalfUnits(rule.attack2),
      }),
      Object.freeze({
        id: "DEFENSE" as const,
        label: "Defense",
        value: formatHalfUnits(rule.defense2),
      }),
      Object.freeze({
        id: "MOVE" as const,
        label: "Move",
        value: String(rule.move),
      }),
      Object.freeze({
        id: "RANGE" as const,
        label: "Range",
        value: String(rule.range),
      }),
      Object.freeze({
        id: "SIGHT" as const,
        label: "Sight",
        value: String(rule.sightRadius),
      }),
    ]),
    abilities: Object.freeze(abilities),
  });
}

function uniqueSpecialAbilities(
  abilities: readonly UnitRoleAbilityV6[],
): readonly SpecialUnitAbilityIdV6[] {
  return [...new Set(abilities.filter(isSpecialUnitAbilityV6))];
}

function isSpecialUnitAbilityV6(
  ability: UnitRoleAbilityV6,
): ability is SpecialUnitAbilityIdV6 {
  return SPECIAL_UNIT_ABILITY_IDS_V6.some((candidate) => candidate === ability);
}

function formatHalfUnits(value2: number): string {
  const whole = Math.floor(value2 / 2);
  return value2 % 2 === 0 ? String(whole) : `${whole}.5`;
}
