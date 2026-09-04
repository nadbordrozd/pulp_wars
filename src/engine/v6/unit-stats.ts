import type { PlayerId } from "../model/ids";
import {
  effectiveRoleRuleV6,
  type EffectiveRoleRuleV6,
} from "../rules/ruleset-v6";
import type {
  CoordV6,
  GameStateV6,
  PlayerStateV6,
  TerrainIdV6,
  TechnologyId,
  UnitStateV6,
} from "./types";

export const UNIT_STAT_IDS_V6 = Object.freeze([
  "HP",
  "ATTACK",
  "DEFENSE",
  "MOVE",
  "RANGE",
  "SIGHT",
] as const);

export type UnitStatIdV6 = (typeof UNIT_STAT_IDS_V6)[number];

export type UnitStatModifierSourceV6 =
  "PROMOTION" | "CHARGE" | UnitDefenseModifierSourceV6 | "HIGH_GROUND";

export interface PublicUnitStatValueV6 {
  readonly numerator: number;
  readonly denominator: number;
}

export interface PublicUnitStatTermV6 {
  readonly value: PublicUnitStatValueV6;
  readonly source: "ROLE_BASE" | UnitStatModifierSourceV6;
  readonly sourceLabel: string;
  readonly description: string;
}

export interface PublicUnitStatBreakdownV6 {
  readonly id: UnitStatIdV6;
  readonly label: string;
  /** Present only for HP; the base/modifier/total values describe max HP. */
  readonly current: number | null;
  readonly base: PublicUnitStatTermV6;
  readonly modifiers: readonly PublicUnitStatTermV6[];
  readonly total: PublicUnitStatValueV6;
}

export interface PublicUnitStatsV6 {
  readonly unitId: UnitStateV6["id"];
  readonly stats: readonly PublicUnitStatBreakdownV6[];
}

export type UnitDefenseModifierSourceV6 =
  "CITY_WALLS" | "FORTIFICATION" | "FRIENDLY_CITY" | "MOUNTAIN" | "FOREST";

export interface UnitDefenseModifierV6 {
  readonly numerator: 3 | 2 | 4;
  readonly denominator: 1 | 2;
  readonly source: UnitDefenseModifierSourceV6;
}

/**
 * Returns the one canonical greatest defense multiplier and its provenance.
 * Ruleset 6 defense modifiers never stack.
 */
export function unitDefenseModifierV6(
  state: GameStateV6,
  unit: UnitStateV6,
): UnitDefenseModifierV6 | null {
  const player = requirePlayer(state, unit.ownerId);
  const city = state.cities.find(
    (candidate) =>
      candidate.ownerId === unit.ownerId && sameCoord(candidate.at, unit.at),
  );
  if (
    city?.rewards.some(
      (record) => record.reachedLevel === 3 && record.reward === "WALLS",
    )
  ) {
    return { numerator: 4, denominator: 1, source: "CITY_WALLS" };
  }
  if (
    city !== undefined &&
    player.researchedTechs.includes("FORTIFICATION") &&
    (unit.role === "FIGHTER" || unit.role === "GUARD")
  ) {
    return { numerator: 2, denominator: 1, source: "FORTIFICATION" };
  }
  if (city !== undefined) {
    return { numerator: 3, denominator: 2, source: "FRIENDLY_CITY" };
  }
  const terrain = terrainAtV6(state, unit);
  if (terrain === "MOUNTAIN") {
    return { numerator: 3, denominator: 2, source: "MOUNTAIN" };
  }
  if (terrain === "FOREST") {
    return { numerator: 3, denominator: 2, source: "FOREST" };
  }
  return null;
}

/** Charge is the only Ruleset 6 modifier to a role's displayed Attack. */
export function unitChargeAttackBonus2V6(
  rule: EffectiveRoleRuleV6,
  unit: UnitStateV6,
): 0 | 2 {
  return rule.abilities.includes("CHARGE") &&
    unit.activation.movedPathLength >= 2
    ? 2
    : 0;
}

/** Shared high-ground sight formula for authoritative and public contexts. */
export function unitSightRadiusForTerrainV6(
  rule: Pick<EffectiveRoleRuleV6, "sightRadius">,
  researchedTechs: readonly TechnologyId[],
  terrain: TerrainIdV6 | undefined,
): number {
  return (
    rule.sightRadius +
    (terrain === "MOUNTAIN" && researchedTechs.includes("SURVEYING") ? 1 : 0)
  );
}

export function effectiveUnitSightRadiusV6(
  state: GameStateV6,
  unit: UnitStateV6,
): number {
  const player = requirePlayer(state, unit.ownerId);
  const rule = effectiveRoleRuleV6(player.faction, unit.role);
  return unitSightRadiusForTerrainV6(
    rule,
    player.researchedTechs,
    terrainAtV6(state, unit),
  );
}

/**
 * Authority-side, presentation-ready stat attribution for one visible unit.
 * Values remain exact rational integers and the fixed array order is UI order.
 */
export function publicUnitStatsV6(
  state: GameStateV6,
  unit: UnitStateV6,
): PublicUnitStatsV6 {
  const player = requirePlayer(state, unit.ownerId);
  const rule = effectiveRoleRuleV6(player.faction, unit.role);
  const promotion = unit.maxHp - rule.maxHp;
  const charge2 = unitChargeAttackBonus2V6(rule, unit);
  const defense = unitDefenseModifierV6(state, unit);
  const defenseDelta =
    defense === null
      ? null
      : rational(
          rule.defense2 * (defense.numerator - defense.denominator),
          2 * defense.denominator,
        );
  const tile = tileAtV6(state, unit.at);
  const highGround =
    tile?.terrain === "MOUNTAIN" &&
    player.researchedTechs.includes("SURVEYING");

  return {
    unitId: unit.id,
    stats: [
      stat(
        "HP",
        "HP",
        unit.hp,
        roleBase(rule.label, "maximum HP", rule.maxHp),
        promotion > 0
          ? [
              modifier(
                promotion,
                "PROMOTION",
                "Promotion",
                `Promotion adds ${promotion} maximum HP.`,
              ),
            ]
          : [],
      ),
      stat(
        "ATTACK",
        "Attack",
        null,
        roleBase(rule.label, "Attack", rule.attack2, 2),
        charge2 > 0
          ? [
              modifier(
                charge2,
                "CHARGE",
                "Charge",
                "Charge is active after moving at least two tiles and adds 1 Attack to this unit's next melee attack this turn.",
                2,
              ),
            ]
          : [],
      ),
      stat(
        "DEFENSE",
        "Defense",
        null,
        roleBase(rule.label, "Defense", rule.defense2, 2),
        defense === null || defenseDelta === null
          ? []
          : [defenseModifierTerm(rule.label, defense, defenseDelta)],
      ),
      stat("MOVE", "Move", null, roleBase(rule.label, "Move", rule.move), []),
      stat(
        "RANGE",
        "Range",
        null,
        roleBase(rule.label, "Range", rule.range),
        [],
      ),
      stat(
        "SIGHT",
        "Sight",
        null,
        roleBase(rule.label, "Sight", rule.sightRadius),
        highGround
          ? [
              modifier(
                1,
                "HIGH_GROUND",
                "High ground",
                "Surveying adds 1 Sight while this unit is standing on a Mountain.",
              ),
            ]
          : [],
      ),
    ],
  };
}

function stat(
  id: UnitStatIdV6,
  label: string,
  current: number | null,
  base: PublicUnitStatTermV6,
  modifiers: readonly PublicUnitStatTermV6[],
): PublicUnitStatBreakdownV6 {
  return {
    id,
    label,
    current,
    base,
    modifiers,
    total: modifiers.reduce(
      (sum, term) => addRational(sum, term.value),
      base.value,
    ),
  };
}

function roleBase(
  roleLabel: string,
  statLabel: string,
  numerator: number,
  denominator = 1,
): PublicUnitStatTermV6 {
  return {
    value: rational(numerator, denominator),
    source: "ROLE_BASE",
    sourceLabel: `${roleLabel} base`,
    description: `${roleLabel} has ${formatRational(rational(numerator, denominator))} base ${statLabel}.`,
  };
}

function modifier(
  numerator: number,
  source: UnitStatModifierSourceV6,
  sourceLabel: string,
  description: string,
  denominator = 1,
): PublicUnitStatTermV6 {
  return {
    value: rational(numerator, denominator),
    source,
    sourceLabel,
    description,
  };
}

function defenseModifierTerm(
  roleLabel: string,
  defense: UnitDefenseModifierV6,
  value: PublicUnitStatValueV6,
): PublicUnitStatTermV6 {
  const multiplier = formatRational(
    rational(defense.numerator, defense.denominator),
  );
  const [sourceLabel, location] =
    defense.source === "CITY_WALLS"
      ? ["City Walls", "City Walls"]
      : defense.source === "FORTIFICATION"
        ? ["Fortification", "Fortification in a friendly city"]
        : defense.source === "FRIENDLY_CITY"
          ? ["Friendly city", "a friendly city"]
          : defense.source === "MOUNTAIN"
            ? ["Mountain", "Mountain terrain"]
            : ["Forest", "Forest terrain"];
  return {
    value,
    source: defense.source,
    sourceLabel,
    description: `${location} supplies the greatest active defense bonus here, multiplying ${roleLabel}'s base Defense by ${multiplier}. Ruleset 6 defense bonuses do not stack.`,
  };
}

function addRational(
  left: PublicUnitStatValueV6,
  right: PublicUnitStatValueV6,
): PublicUnitStatValueV6 {
  return rational(
    left.numerator * right.denominator + right.numerator * left.denominator,
    left.denominator * right.denominator,
  );
}

function rational(
  numerator: number,
  denominator: number,
): PublicUnitStatValueV6 {
  if (!Number.isSafeInteger(numerator) || !Number.isSafeInteger(denominator)) {
    throw new RangeError("INTEGER_OVERFLOW");
  }
  if (numerator < 0 || denominator <= 0) throw new RangeError("INVALID_STATE");
  const divisor = greatestCommonDivisor(numerator, denominator);
  return { numerator: numerator / divisor, denominator: denominator / divisor };
}

function greatestCommonDivisor(left: number, right: number): number {
  let a = Math.abs(left);
  let b = Math.abs(right);
  while (b !== 0) [a, b] = [b, a % b];
  return a === 0 ? 1 : a;
}

function formatRational(value: PublicUnitStatValueV6): string {
  return value.denominator === 1
    ? String(value.numerator)
    : String(value.numerator / value.denominator);
}

function terrainAtV6(
  state: Pick<GameStateV6, "board">,
  unit: Pick<UnitStateV6, "at">,
): TerrainIdV6 | undefined {
  const tile = state.board.tiles[unit.at.y * state.board.width + unit.at.x];
  return tile?.at.x === unit.at.x && tile.at.y === unit.at.y
    ? tile.terrain
    : undefined;
}

function tileAtV6(state: Pick<GameStateV6, "board">, at: CoordV6) {
  const tile = state.board.tiles[at.y * state.board.width + at.x];
  return tile?.at.x === at.x && tile.at.y === at.y ? tile : undefined;
}

function requirePlayer(
  state: Pick<GameStateV6, "players">,
  id: PlayerId,
): PlayerStateV6 {
  const player = state.players.find((candidate) => candidate.id === id);
  if (player === undefined) throw new RangeError("INVALID_STATE");
  return player;
}

function sameCoord(left: UnitStateV6["at"], right: UnitStateV6["at"]): boolean {
  return left.x === right.x && left.y === right.y;
}
