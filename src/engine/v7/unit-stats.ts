import {
  effectiveRoleRuleV7,
  technologyCapabilitiesV7,
} from "../rules/ruleset-v7";
import { defenseBonusForUnitV7, fortificationLevelForUnitV7 } from "./combat";
import { tileAtV7 } from "./spatial-economy";
import type { GameStateV7, UnitStateV7 } from "./types";

export const UNIT_STAT_IDS_V7 = Object.freeze([
  "HP",
  "ATTACK",
  "DEFENSE",
  "MOVE",
  "RANGE",
  "SIGHT",
] as const);
export type UnitStatIdV7 = (typeof UNIT_STAT_IDS_V7)[number];
export type UnitStatModifierSourceV7 =
  | "PROMOTION"
  | "CHARGE"
  | "INSPIRED"
  | "CITY_WALLS"
  | "CITY_FORTIFICATION"
  | "FIELD_DEFENSE"
  | "MOUNTAIN"
  | "FOREST"
  | "HIGH_GROUND";
export interface PublicUnitStatValueV7 {
  readonly numerator: number;
  readonly denominator: number;
}
export interface PublicUnitStatTermV7 {
  readonly value: PublicUnitStatValueV7;
  readonly source: "ROLE_BASE" | UnitStatModifierSourceV7;
  readonly sourceLabel: string;
  readonly description: string;
}
export interface PublicUnitStatBreakdownV7 {
  readonly id: UnitStatIdV7;
  readonly label: string;
  readonly current: number | null;
  readonly base: PublicUnitStatTermV7;
  readonly modifiers: readonly PublicUnitStatTermV7[];
  readonly total: PublicUnitStatValueV7;
  /** Omitted means the exact historical contract; BASE_ONLY redacts position. */
  readonly visibility?: "BASE_ONLY";
}
export interface PublicUnitStatsV7 {
  readonly unitId: UnitStateV7["id"];
  readonly minimumRange: number;
  readonly maximumRange: number;
  readonly stats: readonly PublicUnitStatBreakdownV7[];
  readonly abilities: readonly string[];
  readonly statuses: readonly string[];
}

export function publicUnitStatsV7(
  state: GameStateV7,
  unit: UnitStateV7,
): PublicUnitStatsV7 {
  const role = effectiveRoleRuleV7(unit.role);
  const embarked = unit.form === "EMBARKED";
  const owner = state.players.find((player) => player.id === unit.ownerId);
  if (owner === undefined) throw new RangeError("INVALID_STATE");
  const promotion = unit.maxHp - role.maxHp;
  const charge =
    !embarked &&
    owner.researchedTechs.includes("RAIDING") &&
    role.abilities.includes("CHARGE") &&
    unit.activation.moved &&
    unit.activation.movedPathLength >= 2 &&
    unit.activation.attacksUsed === 0
      ? 2
      : 0;
  const inspired =
    !embarked && unit.activation.inspired && unit.activation.attacksUsed === 0
      ? 2
      : 0;
  const defense = defenseBonusForUnitV7(state, unit);
  const fortificationModifiers = fortificationTerms(state, unit);
  const fortifiedDefense2 =
    (embarked ? 2 : role.defense2) +
    fortificationModifiers.reduce(
      (sum, term) => sum + term.value.numerator * 2,
      0,
    );
  const terrainSource = defenseSourceAt(state, unit, defense.numerator);
  const defenseDelta = rational(
    fortifiedDefense2 * (defense.numerator - defense.denominator),
    2 * defense.denominator,
  );
  const highGround =
    tileAtV7(state.board, unit.at)?.terrain === "MOUNTAIN" &&
    technologyCapabilitiesV7(owner.researchedTechs)
      .highGroundVisionRadiusBonus === 1;
  const sight = embarked
    ? 1
    : Math.max(
        role.sightRadius,
        technologyCapabilitiesV7(owner.researchedTechs).roleSightRadius[
          unit.role
        ] ?? 0,
      );
  const labelText = embarked ? "Embarked transport" : role.label;
  return {
    unitId: unit.id,
    minimumRange: embarked ? 0 : role.minimumRange,
    maximumRange: embarked ? 0 : role.range,
    stats: [
      stat(
        "HP",
        "HP",
        unit.hp,
        base(labelText, "maximum HP", role.maxHp),
        promotion > 0
          ? [
              modifier(
                promotion,
                "PROMOTION",
                "Promotion",
                "Promotion adds 5 maximum and current HP.",
              ),
            ]
          : [],
      ),
      stat(
        "ATTACK",
        "Attack",
        null,
        base(labelText, "Attack", embarked ? 0 : role.attack2, 2),
        [
          ...(charge > 0
            ? [
                modifier(
                  charge,
                  "CHARGE",
                  "Charge",
                  "Charge adds 1 Attack after an ordinary move of at least two cells.",
                  2,
                ),
              ]
            : []),
          ...(inspired > 0
            ? [
                modifier(
                  inspired,
                  "INSPIRED",
                  "Inspired",
                  "Captain Rally adds 1 Attack to the next attack this turn.",
                  2,
                ),
              ]
            : []),
        ],
      ),
      stat(
        "DEFENSE",
        "Defense",
        null,
        base(labelText, "Defense", embarked ? 2 : role.defense2, 2),
        [
          ...fortificationModifiers,
          ...(terrainSource === null
            ? []
            : [
                modifier(
                  defenseDelta.numerator,
                  terrainSource,
                  label(terrainSource),
                  `${label(terrainSource)} multiplies Defense by 1.5.`,
                  defenseDelta.denominator,
                ),
              ]),
        ],
      ),
      stat(
        "MOVE",
        "Move",
        null,
        base(labelText, "Move", embarked ? 3 : role.move),
        [],
      ),
      stat(
        "RANGE",
        "Range",
        null,
        base(labelText, "Range", embarked ? 0 : role.range),
        [],
      ),
      stat(
        "SIGHT",
        "Sight",
        null,
        base(labelText, "Sight", sight),
        highGround
          ? [
              modifier(
                1,
                "HIGH_GROUND",
                "High ground",
                "Engineering adds 1 Sight while standing on a Mountain.",
              ),
            ]
          : [],
      ),
    ],
    abilities: embarked ? [] : role.abilities,
    statuses: [
      ...(unit.activation.inspired && unit.activation.attacksUsed === 0
        ? ["Inspired: +1 next Attack"]
        : []),
      ...(unit.activation.tendedThisTurn ? ["Tended this turn"] : []),
      ...(unit.activation.overrunActive ? ["Overrun: attack again"] : []),
    ],
  };
}

function defenseSourceAt(
  state: GameStateV7,
  unit: UnitStateV7,
  numerator: number,
): UnitStatModifierSourceV7 | null {
  if (numerator === 1) return null;
  const terrain = tileAtV7(state.board, unit.at)?.terrain;
  return terrain === "MOUNTAIN"
    ? "MOUNTAIN"
    : terrain === "FOREST"
      ? "FOREST"
      : null;
}
function fortificationTerms(
  state: GameStateV7,
  unit: UnitStateV7,
): readonly PublicUnitStatTermV7[] {
  if (fortificationLevelForUnitV7(state, unit) === 0) return [];
  const tile = tileAtV7(state.board, unit.at);
  const city = state.cities.find(
    (candidate) =>
      candidate.ownerId === unit.ownerId && same(candidate.at, unit.at),
  );
  const terms: PublicUnitStatTermV7[] = [];
  if (
    city?.rewards.some(
      (reward) => reward.reachedLevel === 3 && reward.reward === "WALLS",
    )
  )
    terms.push(
      modifier(2, "CITY_WALLS", "City Walls", "City Walls add 2 Defense."),
    );
  if (tile?.fieldDefense)
    terms.push(
      modifier(
        1,
        "FIELD_DEFENSE",
        "Field defense",
        "Field defense adds 1 Defense.",
      ),
    );
  return terms;
}
function stat(
  id: UnitStatIdV7,
  labelText: string,
  current: number | null,
  baseTerm: PublicUnitStatTermV7,
  modifiers: readonly PublicUnitStatTermV7[],
): PublicUnitStatBreakdownV7 {
  return {
    id,
    label: labelText,
    current,
    base: baseTerm,
    modifiers,
    total: modifiers.reduce(
      (sum, term) => add(sum, term.value),
      baseTerm.value,
    ),
  };
}
function base(
  role: string,
  name: string,
  numerator: number,
  denominator = 1,
): PublicUnitStatTermV7 {
  return {
    value: rational(numerator, denominator),
    source: "ROLE_BASE",
    sourceLabel: `${role} base`,
    description: `${role} has this base ${name}.`,
  };
}
function modifier(
  numerator: number,
  source: UnitStatModifierSourceV7,
  sourceLabel: string,
  description: string,
  denominator = 1,
): PublicUnitStatTermV7 {
  return {
    value: rational(numerator, denominator),
    source,
    sourceLabel,
    description,
  };
}
function rational(
  numerator: number,
  denominator: number,
): PublicUnitStatValueV7 {
  const divisor = gcd(Math.abs(numerator), denominator);
  return { numerator: numerator / divisor, denominator: denominator / divisor };
}
function add(a: PublicUnitStatValueV7, b: PublicUnitStatValueV7) {
  return rational(
    a.numerator * b.denominator + b.numerator * a.denominator,
    a.denominator * b.denominator,
  );
}
function gcd(a: number, b: number): number {
  while (b !== 0) [a, b] = [b, a % b];
  return a || 1;
}
function label(source: UnitStatModifierSourceV7): string {
  return source
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/^./, (value) => value.toUpperCase());
}
const same = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  a.x === b.x && a.y === b.y;
