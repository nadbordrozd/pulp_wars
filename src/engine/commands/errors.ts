import type { JsonValue } from "../replay/canonical";

export type RuleErrorCode =
  | "INVALID_SETUP"
  | "MAP_GENERATION_FAILED"
  | "RULESET_NOT_FOUND"
  | "INVALID_COMMAND"
  | "COMMAND_NOT_IMPLEMENTED"
  | "MATCH_ENDED"
  | "PENDING_CHOICE"
  | "NOT_ACTIVE_PLAYER"
  | "TECH_ALREADY_RESEARCHED"
  | "TECH_PREREQUISITE_MISSING"
  | "INSUFFICIENT_STARS"
  | "TILE_NOT_FOUND"
  | "TILE_UNEXPLORED"
  | "ORGANIZATION_REQUIRED"
  | "FRUIT_INVALID_TILE"
  | "HUNTING_REQUIRED"
  | "ANIMAL_INVALID_TILE"
  | "FORESTRY_REQUIRED"
  | "LUMBER_MILL_INVALID_TILE"
  | "MINING_REQUIRED"
  | "MINE_INVALID_TILE"
  | "TERRITORY_NOT_OWNED"
  | "CITY_NOT_FOUND"
  | "CITY_NOT_OWNED"
  | "CITY_BESIEGED"
  | "INTEGER_OVERFLOW"
  | "CITY_REWARD_INVALID"
  | "CAPTURE_NOT_ELIGIBLE"
  | "UNIT_NOT_FOUND"
  | "UNIT_NOT_OWNED"
  | "UNIT_NOT_READY"
  | "UNIT_ALREADY_ACTED"
  | "UNIT_ALREADY_HANDLED"
  | "UNIT_TYPE_LOCKED"
  | "CITY_CAPACITY_FULL"
  | "CITY_SPAWN_OCCUPIED"
  | "MOVEMENT_ILLEGAL"
  | "ATTACK_NOT_LEGAL"
  | "TARGET_ALLIED"
  | "ALLY_TERRITORY_FORBIDDEN"
  | "RECOVER_NOT_LEGAL"
  | "PROMOTION_NOT_ELIGIBLE"
  | "INVALID_STATE";

export interface RuleError {
  readonly code: RuleErrorCode;
  readonly params: Readonly<Record<string, JsonValue>>;
}

export function ruleError(
  code: RuleErrorCode,
  params: Readonly<Record<string, JsonValue>> = {},
): RuleError {
  return { code, params };
}
