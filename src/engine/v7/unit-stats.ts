import {
  effectiveRoleRuleV7,
  technologyCapabilitiesV7,
} from "../rules/ruleset-v7";
import { defenseBonusForUnitV7 } from "./combat";
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
  | "CITY_WALLS"
  | "FORTIFICATION"
  | "FRIENDLY_CITY"
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
  const owner = state.players.find((player) => player.id === unit.ownerId);
  if (owner === undefined) throw new RangeError("INVALID_STATE");
  const promotion = unit.maxHp - role.maxHp;
  const charge =
    role.abilities.includes("CHARGE") &&
    unit.activation.moved &&
    unit.activation.movedPathLength >= 2
      ? 2
      : 0;
  const defense = defenseBonusForUnitV7(state, unit);
  const defenseSource = defenseSourceAt(state, unit, defense.numerator);
  const defenseDelta = rational(
    role.defense2 * (defense.numerator - defense.denominator),
    2 * defense.denominator,
  );
  const highGround =
    tileAtV7(state.board, unit.at)?.terrain === "MOUNTAIN" &&
    technologyCapabilitiesV7(owner.researchedTechs)
      .highGroundVisionRadiusBonus === 1;
  const sight = Math.max(
    role.sightRadius,
    technologyCapabilitiesV7(owner.researchedTechs).roleSightRadius[
      unit.role
    ] ?? 0,
  );
  return {
    unitId: unit.id,
    minimumRange: role.minimumRange,
    maximumRange: role.range,
    stats: [
      stat(
        "HP",
        "HP",
        unit.hp,
        base(role.label, "maximum HP", role.maxHp),
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
        base(role.label, "Attack", role.attack2, 2),
        charge > 0
          ? [
              modifier(
                charge,
                "CHARGE",
                "Charge",
                "Charge adds 1 Attack after an ordinary move of at least two cells.",
                2,
              ),
            ]
          : [],
      ),
      stat(
        "DEFENSE",
        "Defense",
        null,
        base(role.label, "Defense", role.defense2, 2),
        defenseSource === null
          ? []
          : [
              modifier(
                defenseDelta.numerator,
                defenseSource,
                label(defenseSource),
                `${label(defenseSource)} supplies the greatest active defense multiplier.`,
                defenseDelta.denominator,
              ),
            ],
      ),
      stat("MOVE", "Move", null, base(role.label, "Move", role.move), []),
      stat("RANGE", "Range", null, base(role.label, "Range", role.range), []),
      stat(
        "SIGHT",
        "Sight",
        null,
        base(role.label, "Sight", sight),
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
    abilities: role.abilities,
    statuses: [],
  };
}

function defenseSourceAt(
  state: GameStateV7,
  unit: UnitStateV7,
  numerator: number,
): UnitStatModifierSourceV7 | null {
  if (numerator === 1) return null;
  const owner = state.players.find((player) => player.id === unit.ownerId);
  const city = state.cities.find(
    (candidate) =>
      candidate.ownerId === unit.ownerId && same(candidate.at, unit.at),
  );
  if (
    city?.rewards.some(
      (reward) => reward.reachedLevel === 3 && reward.reward === "WALLS",
    )
  )
    return "CITY_WALLS";
  if (
    city !== undefined &&
    owner?.researchedTechs.includes("FORTIFICATION") &&
    (unit.role === "FIGHTER" || unit.role === "GUARD")
  )
    return "FORTIFICATION";
  if (city !== undefined) return "FRIENDLY_CITY";
  const terrain = tileAtV7(state.board, unit.at)?.terrain;
  return terrain === "MOUNTAIN"
    ? "MOUNTAIN"
    : terrain === "FOREST"
      ? "FOREST"
      : null;
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
