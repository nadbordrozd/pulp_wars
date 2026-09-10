import type { CityId, UnitId } from "../model/ids";
import {
  ACHIEVEMENT_IDS_V7,
  COMMAND_KIND_ORDER_V7,
  REWARD_IDS_V7,
  TECHNOLOGY_IDS_V7,
  UNIT_ROLE_IDS_V7,
  type CommandKindV7,
  type AchievementIdV7,
  type CoordV7,
  type RewardIdV7,
  type TechnologyIdV7,
  type UnitRoleIdV7,
} from "./types";
import {
  hasExactKeysV7,
  isDenseArrayV7,
  isPositiveSafeIntegerV7,
  parseCityIdV7,
  parseCoordV7,
  parseUnitIdV7,
} from "./schema";

export type TileCommandKindV7 =
  | "HARVEST_FRUIT"
  | "HUNT_GAME"
  | "BUILD_FARM"
  | "BUILD_LUMBER_CAMP"
  | "BUILD_MINE"
  | "BUILD_WINDMILL"
  | "BUILD_SAWMILL"
  | "BUILD_FORGE"
  | "BUILD_WORKSHOP"
  | "BUILD_GRAND_WORKS"
  | "BUILD_MARKET"
  | "CLEAR_FOREST"
  | "REPLANT_FOREST"
  | "BUILD_ROAD"
  | "REDEVELOP";

export type CommandV7 =
  | {
      readonly kind: "MOVE";
      readonly unitId: UnitId;
      readonly path: readonly CoordV7[];
    }
  | {
      readonly kind: "ATTACK";
      readonly unitId: UnitId;
      readonly targetUnitId: UnitId;
    }
  | {
      readonly kind: "BLACKOUT_CITY";
      readonly unitId: UnitId;
      readonly cityId: CityId;
    }
  | {
      readonly kind: "HEAL_ADJACENT";
      readonly unitId: UnitId;
      readonly targetUnitId: UnitId;
    }
  | {
      readonly kind:
        "RECOVER" | "CAPTURE" | "PROMOTE" | "PILLAGE" | "DISBAND" | "WAIT";
      readonly unitId: UnitId;
    }
  | { readonly kind: "RESEARCH"; readonly tech: TechnologyIdV7 }
  | { readonly kind: TileCommandKindV7; readonly at: CoordV7 }
  | {
      readonly kind: "BUILD_MONUMENT";
      readonly achievement: AchievementIdV7;
      readonly at: CoordV7;
    }
  | {
      readonly kind: "TRAIN";
      readonly cityId: CityId;
      readonly role: UnitRoleIdV7;
    }
  | {
      readonly kind: "CHOOSE_CITY_REWARD";
      readonly cityId: CityId;
      readonly reachedLevel: number;
      readonly reward: RewardIdV7;
    }
  | { readonly kind: "END_TURN" };

export interface CommandEnvelopeV7 {
  readonly format: "pulp-wars-command";
  readonly version: 7;
  readonly command: CommandV7;
}

export type CommandParseResultV7 =
  | { readonly ok: true; readonly value: CommandV7 }
  | { readonly ok: false; readonly field: string };

const TILE_KINDS = new Set<CommandKindV7>([
  "HARVEST_FRUIT",
  "HUNT_GAME",
  "BUILD_FARM",
  "BUILD_LUMBER_CAMP",
  "BUILD_MINE",
  "BUILD_WINDMILL",
  "BUILD_SAWMILL",
  "BUILD_FORGE",
  "BUILD_WORKSHOP",
  "BUILD_GRAND_WORKS",
  "BUILD_MARKET",
  "CLEAR_FOREST",
  "REPLANT_FOREST",
  "BUILD_ROAD",
  "REDEVELOP",
]);
const UNIT_ONLY_KINDS = new Set<CommandKindV7>([
  "RECOVER",
  "CAPTURE",
  "PROMOTE",
  "PILLAGE",
  "DISBAND",
  "WAIT",
]);

export function parseCommandEnvelopeV7(
  input: unknown,
):
  | { readonly ok: true; readonly value: CommandEnvelopeV7 }
  | { readonly ok: false; readonly field: string } {
  if (
    !hasExactKeysV7(input, ["format", "version", "command"]) ||
    input.format !== "pulp-wars-command" ||
    input.version !== 7
  ) {
    return invalid("envelope");
  }
  const parsed = parseCommandV7(input.command);
  return parsed.ok
    ? {
        ok: true,
        value: {
          format: "pulp-wars-command",
          version: 7,
          command: parsed.value,
        },
      }
    : parsed;
}

export function parseCommandV7(input: unknown): CommandParseResultV7 {
  if (typeof input !== "object" || input === null || Array.isArray(input))
    return invalid("command");
  const candidate = input as Record<string, unknown>;
  if (
    typeof candidate.kind !== "string" ||
    !COMMAND_KIND_ORDER_V7.includes(candidate.kind as CommandKindV7)
  )
    return invalid("command.kind");
  const kind = candidate.kind as CommandKindV7;
  if (kind === "END_TURN")
    return hasExactKeysV7(input, ["kind"])
      ? { ok: true, value: { kind } }
      : invalid(kind);
  if (kind === "RESEARCH") {
    return hasExactKeysV7(input, ["kind", "tech"]) &&
      TECHNOLOGY_IDS_V7.includes(candidate.tech as TechnologyIdV7)
      ? { ok: true, value: { kind, tech: candidate.tech as TechnologyIdV7 } }
      : invalid(kind);
  }
  if (TILE_KINDS.has(kind)) {
    const at = hasExactKeysV7(input, ["kind", "at"])
      ? parseCoordV7(candidate.at)
      : null;
    return at === null
      ? invalid(kind)
      : { ok: true, value: { kind: kind as TileCommandKindV7, at } };
  }
  if (kind === "BUILD_MONUMENT") {
    const at = hasExactKeysV7(input, ["achievement", "at", "kind"])
      ? parseCoordV7(candidate.at)
      : null;
    return at === null ||
      !ACHIEVEMENT_IDS_V7.includes(candidate.achievement as AchievementIdV7)
      ? invalid(kind)
      : {
          ok: true,
          value: {
            kind,
            achievement: candidate.achievement as AchievementIdV7,
            at,
          },
        };
  }
  if (kind === "MOVE") {
    const id = hasExactKeysV7(input, ["kind", "unitId", "path"])
      ? parseUnitIdV7(candidate.unitId)
      : null;
    const path = id === null ? null : parsePath(candidate.path);
    return id === null || path === null
      ? invalid(kind)
      : { ok: true, value: { kind, unitId: id, path } };
  }
  if (kind === "ATTACK" || kind === "HEAL_ADJACENT") {
    if (!hasExactKeysV7(input, ["kind", "unitId", "targetUnitId"]))
      return invalid(kind);
    const unit = parseUnitIdV7(candidate.unitId);
    const target = parseUnitIdV7(candidate.targetUnitId);
    return unit === null || target === null
      ? invalid(kind)
      : { ok: true, value: { kind, unitId: unit, targetUnitId: target } };
  }
  if (kind === "BLACKOUT_CITY") {
    if (!hasExactKeysV7(input, ["kind", "unitId", "cityId"]))
      return invalid(kind);
    const unit = parseUnitIdV7(candidate.unitId);
    const city = parseCityIdV7(candidate.cityId);
    return unit === null || city === null
      ? invalid(kind)
      : { ok: true, value: { kind, unitId: unit, cityId: city } };
  }
  if (UNIT_ONLY_KINDS.has(kind)) {
    const unit = hasExactKeysV7(input, ["kind", "unitId"])
      ? parseUnitIdV7(candidate.unitId)
      : null;
    return unit === null
      ? invalid(kind)
      : {
          ok: true,
          value: {
            kind: kind as Extract<CommandV7, { unitId: UnitId }>["kind"],
            unitId: unit,
          } as CommandV7,
        };
  }
  if (kind === "TRAIN") {
    const city = hasExactKeysV7(input, ["kind", "cityId", "role"])
      ? parseCityIdV7(candidate.cityId)
      : null;
    return city === null ||
      !UNIT_ROLE_IDS_V7.includes(candidate.role as UnitRoleIdV7)
      ? invalid(kind)
      : {
          ok: true,
          value: { kind, cityId: city, role: candidate.role as UnitRoleIdV7 },
        };
  }
  if (kind === "CHOOSE_CITY_REWARD") {
    if (!hasExactKeysV7(input, ["kind", "cityId", "reachedLevel", "reward"]))
      return invalid(kind);
    const city = parseCityIdV7(candidate.cityId);
    return city === null ||
      !isPositiveSafeIntegerV7(candidate.reachedLevel) ||
      !REWARD_IDS_V7.includes(candidate.reward as RewardIdV7)
      ? invalid(kind)
      : {
          ok: true,
          value: {
            kind,
            cityId: city,
            reachedLevel: candidate.reachedLevel,
            reward: candidate.reward as RewardIdV7,
          },
        };
  }
  return invalid("command.kind");
}

export function compareCommandsV7(left: CommandV7, right: CommandV7): number {
  const byKind =
    COMMAND_KIND_ORDER_V7.indexOf(left.kind) -
    COMMAND_KIND_ORDER_V7.indexOf(right.kind);
  if (byKind !== 0) return byKind;
  const leftAt = targetCoord(left);
  const rightAt = targetCoord(right);
  const byTarget = compareNullableCoords(leftAt, rightAt);
  if (byTarget !== 0) return byTarget;
  const byActor = actorId(left) - actorId(right);
  if (byActor !== 0) return byActor;
  const byContent = referencedOrdinal(left) - referencedOrdinal(right);
  if (byContent !== 0) return byContent;
  if (left.kind === "MOVE" && right.kind === "MOVE")
    return comparePaths(left.path, right.path);
  return 0;
}

function parsePath(input: unknown): readonly CoordV7[] | null {
  if (!isDenseArrayV7(input)) return null;
  const path: CoordV7[] = [];
  for (const candidate of input) {
    const at = parseCoordV7(candidate);
    if (at === null) return null;
    path.push(at);
  }
  return path;
}

function targetCoord(command: CommandV7): CoordV7 | null {
  if ("at" in command) return command.at;
  if (command.kind === "MOVE") return command.path.at(-1) ?? null;
  return null;
}

function compareNullableCoords(
  left: CoordV7 | null,
  right: CoordV7 | null,
): number {
  if (left === null) return right === null ? 0 : -1;
  if (right === null) return 1;
  return left.y - right.y || left.x - right.x;
}

function actorId(command: CommandV7): number {
  if ("unitId" in command) return command.unitId;
  if ("cityId" in command) return command.cityId;
  return 0;
}

function referencedOrdinal(command: CommandV7): number {
  if (command.kind === "RESEARCH")
    return TECHNOLOGY_IDS_V7.indexOf(command.tech);
  if (command.kind === "TRAIN") return UNIT_ROLE_IDS_V7.indexOf(command.role);
  if (command.kind === "CHOOSE_CITY_REWARD")
    return REWARD_IDS_V7.indexOf(command.reward);
  if (command.kind === "BUILD_MONUMENT")
    return ACHIEVEMENT_IDS_V7.indexOf(command.achievement);
  if (command.kind === "ATTACK" || command.kind === "HEAL_ADJACENT")
    return command.targetUnitId;
  if (command.kind === "BLACKOUT_CITY") return command.cityId;
  return 0;
}

function comparePaths(
  left: readonly CoordV7[],
  right: readonly CoordV7[],
): number {
  const length = Math.min(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    const compared = compareNullableCoords(
      left[index] ?? null,
      right[index] ?? null,
    );
    if (compared !== 0) return compared;
  }
  return left.length - right.length;
}

function invalid(field: string): {
  readonly ok: false;
  readonly field: string;
} {
  return { ok: false, field };
}
