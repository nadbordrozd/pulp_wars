import { cityId, unitId, wallId, type CityId, type UnitId } from "../model/ids";
import {
  CARDINAL_DIRECTION_ORDER_V6,
  COMMAND_KIND_ORDER_V6,
  REWARD_IDS_V6,
  TECHNOLOGY_IDS,
  UNIT_ROLE_IDS,
  type CardinalDirectionV6,
  type CommandKindV6,
  type CoordV6,
  type RewardIdV6,
  type TechnologyId,
  type UnitRoleId,
} from "./types";

export type CombatTargetRefV6 =
  | { readonly kind: "UNIT"; readonly unitId: UnitId }
  | {
      readonly kind: "CHOCOLATE_WALL";
      readonly wallId: ReturnType<typeof wallId>;
    };

type TileCommandKindV6 =
  | "HARVEST_FRUIT"
  | "HUNT_GAME"
  | "BUILD_FARM"
  | "BUILD_LUMBER_CAMP"
  | "BUILD_MINE"
  | "BUILD_QUARRY"
  | "BUILD_WINDMILL"
  | "BUILD_SAWMILL"
  | "BUILD_FORGE"
  | "BUILD_STONEWORKS"
  | "BUILD_WORKSHOP"
  | "BUILD_GRAND_WORKS"
  | "BUILD_MARKET"
  | "CLEAR_FOREST"
  | "REPLANT_FOREST"
  | "BUILD_ROAD"
  | "REDEVELOP";

export type CommandV6 =
  | {
      readonly kind: "MOVE";
      readonly unitId: UnitId;
      readonly path: readonly CoordV6[];
    }
  | {
      readonly kind: "ATTACK";
      readonly unitId: UnitId;
      readonly target: CombatTargetRefV6;
    }
  | {
      readonly kind: "KAMIKAZE_ROLL";
      readonly unitId: UnitId;
      readonly direction: CardinalDirectionV6;
    }
  | {
      readonly kind: "HEAL_ADJACENT";
      readonly unitId: UnitId;
      readonly targetUnitId: UnitId;
    }
  | {
      readonly kind: "RECOVER" | "CAPTURE" | "PROMOTE" | "WAIT" | "CANDIFY";
      readonly unitId: UnitId;
    }
  | {
      readonly kind: "BUILD_CHOCOLATE_WALL";
      readonly unitId: UnitId;
      readonly at: CoordV6;
    }
  | { readonly kind: "RESEARCH"; readonly tech: TechnologyId }
  | { readonly kind: TileCommandKindV6; readonly at: CoordV6 }
  | {
      readonly kind: "TRAIN";
      readonly cityId: CityId;
      readonly role: UnitRoleId;
    }
  | {
      readonly kind: "CHOOSE_CANDIFY_CITY";
      readonly unitId: UnitId;
      readonly cityId: CityId;
    }
  | {
      readonly kind: "CHOOSE_CITY_REWARD";
      readonly cityId: CityId;
      readonly reachedLevel: number;
      readonly reward: RewardIdV6;
    }
  | { readonly kind: "END_TURN" };

export interface CommandEnvelopeV6 {
  readonly format: "pulp-wars-command";
  readonly version: 6;
  readonly command: CommandV6;
}

export type CommandParseResultV6 =
  | { readonly ok: true; readonly value: CommandV6 }
  | { readonly ok: false; readonly field: string };

const TILE_COMMAND_KINDS = new Set<CommandKindV6>([
  "HARVEST_FRUIT",
  "HUNT_GAME",
  "BUILD_FARM",
  "BUILD_LUMBER_CAMP",
  "BUILD_MINE",
  "BUILD_QUARRY",
  "BUILD_WINDMILL",
  "BUILD_SAWMILL",
  "BUILD_FORGE",
  "BUILD_STONEWORKS",
  "BUILD_WORKSHOP",
  "BUILD_GRAND_WORKS",
  "BUILD_MARKET",
  "CLEAR_FOREST",
  "REPLANT_FOREST",
  "BUILD_ROAD",
  "REDEVELOP",
]);

export function parseCommandEnvelopeV6(
  input: unknown,
):
  | { readonly ok: true; readonly value: CommandEnvelopeV6 }
  | { readonly ok: false; readonly field: string } {
  if (
    !hasExactKeysV6(input, ["format", "version", "command"]) ||
    input.format !== "pulp-wars-command" ||
    input.version !== 6
  ) {
    return { ok: false, field: "envelope" };
  }
  const command = parseCommandV6(input.command);
  if (!command.ok) return { ok: false, field: command.field };
  return {
    ok: true,
    value: {
      format: "pulp-wars-command",
      version: 6,
      command: command.value,
    },
  };
}

export function parseCommandV6(input: unknown): CommandParseResultV6 {
  if (!isRecordV6(input) || typeof input.kind !== "string") {
    return invalid("command");
  }
  if (!COMMAND_KIND_ORDER_V6.includes(input.kind as CommandKindV6)) {
    return invalid("command.kind");
  }
  const kind = input.kind as CommandKindV6;
  if (kind === "END_TURN") {
    return hasExactKeysV6(input, ["kind"])
      ? { ok: true, value: { kind } }
      : invalid(kind);
  }
  if (kind === "RESEARCH") {
    return hasExactKeysV6(input, ["kind", "tech"]) &&
      TECHNOLOGY_IDS.includes(input.tech as TechnologyId)
      ? { ok: true, value: { kind, tech: input.tech as TechnologyId } }
      : invalid(kind);
  }
  if (TILE_COMMAND_KINDS.has(kind)) {
    const at = hasExactKeysV6(input, ["kind", "at"])
      ? parseCoordV6(input.at)
      : null;
    return at === null
      ? invalid(kind)
      : { ok: true, value: { kind: kind as TileCommandKindV6, at } };
  }
  if (kind === "TRAIN") {
    const id = hasExactKeysV6(input, ["kind", "cityId", "role"])
      ? parseCityIdV6(input.cityId)
      : null;
    return id === null || !UNIT_ROLE_IDS.includes(input.role as UnitRoleId)
      ? invalid(kind)
      : {
          ok: true,
          value: { kind, cityId: id, role: input.role as UnitRoleId },
        };
  }
  if (kind === "MOVE") {
    const id = hasExactKeysV6(input, ["kind", "unitId", "path"])
      ? parseUnitIdV6(input.unitId)
      : null;
    const path = id === null ? null : parsePathV6(input.path);
    return id === null || path === null
      ? invalid(kind)
      : { ok: true, value: { kind, unitId: id, path } };
  }
  if (kind === "ATTACK") {
    const id = hasExactKeysV6(input, ["kind", "unitId", "target"])
      ? parseUnitIdV6(input.unitId)
      : null;
    const target = id === null ? null : parseCombatTargetV6(input.target);
    return id === null || target === null
      ? invalid(kind)
      : { ok: true, value: { kind, unitId: id, target } };
  }
  if (kind === "KAMIKAZE_ROLL") {
    const id = hasExactKeysV6(input, ["kind", "unitId", "direction"])
      ? parseUnitIdV6(input.unitId)
      : null;
    return id === null ||
      !CARDINAL_DIRECTION_ORDER_V6.includes(
        input.direction as CardinalDirectionV6,
      )
      ? invalid(kind)
      : {
          ok: true,
          value: {
            kind,
            unitId: id,
            direction: input.direction as CardinalDirectionV6,
          },
        };
  }
  if (kind === "HEAL_ADJACENT") {
    if (!hasExactKeysV6(input, ["kind", "unitId", "targetUnitId"])) {
      return invalid(kind);
    }
    const id = parseUnitIdV6(input.unitId);
    const target = parseUnitIdV6(input.targetUnitId);
    return id === null || target === null
      ? invalid(kind)
      : { ok: true, value: { kind, unitId: id, targetUnitId: target } };
  }
  if (kind === "BUILD_CHOCOLATE_WALL") {
    if (!hasExactKeysV6(input, ["kind", "unitId", "at"])) return invalid(kind);
    const id = parseUnitIdV6(input.unitId);
    const at = parseCoordV6(input.at);
    return id === null || at === null
      ? invalid(kind)
      : { ok: true, value: { kind, unitId: id, at } };
  }
  if (kind === "CHOOSE_CANDIFY_CITY") {
    if (!hasExactKeysV6(input, ["kind", "unitId", "cityId"]))
      return invalid(kind);
    const unit = parseUnitIdV6(input.unitId);
    const city = parseCityIdV6(input.cityId);
    return unit === null || city === null
      ? invalid(kind)
      : { ok: true, value: { kind, unitId: unit, cityId: city } };
  }
  if (kind === "CHOOSE_CITY_REWARD") {
    if (!hasExactKeysV6(input, ["kind", "cityId", "reachedLevel", "reward"])) {
      return invalid(kind);
    }
    const city = parseCityIdV6(input.cityId);
    return city === null ||
      !isPositiveSafeIntegerV6(input.reachedLevel) ||
      !REWARD_IDS_V6.includes(input.reward as RewardIdV6)
      ? invalid(kind)
      : {
          ok: true,
          value: {
            kind,
            cityId: city,
            reachedLevel: input.reachedLevel,
            reward: input.reward as RewardIdV6,
          },
        };
  }
  if (
    kind === "RECOVER" ||
    kind === "CAPTURE" ||
    kind === "PROMOTE" ||
    kind === "WAIT" ||
    kind === "CANDIFY"
  ) {
    const id = hasExactKeysV6(input, ["kind", "unitId"])
      ? parseUnitIdV6(input.unitId)
      : null;
    return id === null
      ? invalid(kind)
      : { ok: true, value: { kind, unitId: id } };
  }
  return invalid("command.kind");
}

export function compareCommandsV6(left: CommandV6, right: CommandV6): number {
  const kind =
    ordinal(COMMAND_KIND_ORDER_V6, left.kind) -
    ordinal(COMMAND_KIND_ORDER_V6, right.kind);
  if (kind !== 0) return kind;
  const leftAt = commandTarget(left);
  const rightAt = commandTarget(right);
  if (leftAt !== null || rightAt !== null) {
    if (leftAt === null) return -1;
    if (rightAt === null) return 1;
    const coordinate = leftAt.y - rightAt.y || leftAt.x - rightAt.x;
    if (coordinate !== 0) return coordinate;
  }
  const actor = commandActor(left) - commandActor(right);
  return actor || commandContentOrdinal(left) - commandContentOrdinal(right);
}

export function compareTechnologyIdsV6(
  left: TechnologyId,
  right: TechnologyId,
): number {
  return ordinal(TECHNOLOGY_IDS, left) - ordinal(TECHNOLOGY_IDS, right);
}

export function compareUnitRoleIdsV6(
  left: UnitRoleId,
  right: UnitRoleId,
): number {
  return ordinal(UNIT_ROLE_IDS, left) - ordinal(UNIT_ROLE_IDS, right);
}

export function compareRewardIdsV6(
  left: RewardIdV6,
  right: RewardIdV6,
): number {
  return ordinal(REWARD_IDS_V6, left) - ordinal(REWARD_IDS_V6, right);
}

function commandTarget(command: CommandV6): CoordV6 | null {
  if ("at" in command) return command.at;
  if (command.kind === "MOVE") return command.path.at(-1) ?? null;
  return null;
}

function commandActor(command: CommandV6): number {
  if ("unitId" in command) return command.unitId;
  if ("cityId" in command) return command.cityId;
  return 0;
}

function commandContentOrdinal(command: CommandV6): number {
  switch (command.kind) {
    case "RESEARCH":
      return ordinal(TECHNOLOGY_IDS, command.tech);
    case "TRAIN":
      return ordinal(UNIT_ROLE_IDS, command.role);
    case "CHOOSE_CITY_REWARD":
      return ordinal(REWARD_IDS_V6, command.reward);
    case "KAMIKAZE_ROLL":
      return ordinal(CARDINAL_DIRECTION_ORDER_V6, command.direction);
    case "ATTACK":
      return command.target.kind === "UNIT"
        ? command.target.unitId
        : command.target.wallId;
    case "HEAL_ADJACENT":
      return command.targetUnitId;
    case "CHOOSE_CANDIFY_CITY":
      return command.cityId;
    default:
      return 0;
  }
}

function ordinal<T extends string>(order: readonly T[], value: T): number {
  return order.indexOf(value);
}

export function parseCoordV6(input: unknown): CoordV6 | null {
  if (
    !hasExactKeysV6(input, ["x", "y"]) ||
    !Number.isSafeInteger(input.x) ||
    !Number.isSafeInteger(input.y)
  ) {
    return null;
  }
  return { x: input.x as number, y: input.y as number };
}

function parsePathV6(input: unknown): readonly CoordV6[] | null {
  if (!isDenseArrayV6(input)) return null;
  const path: CoordV6[] = [];
  for (const candidate of input) {
    const at = parseCoordV6(candidate);
    if (at === null) return null;
    path.push(at);
  }
  return path;
}

function parseCombatTargetV6(input: unknown): CombatTargetRefV6 | null {
  if (hasExactKeysV6(input, ["kind", "unitId"]) && input.kind === "UNIT") {
    const id = parseUnitIdV6(input.unitId);
    return id === null ? null : { kind: "UNIT", unitId: id };
  }
  if (
    hasExactKeysV6(input, ["kind", "wallId"]) &&
    input.kind === "CHOCOLATE_WALL" &&
    typeof input.wallId === "number"
  ) {
    try {
      return { kind: "CHOCOLATE_WALL", wallId: wallId(input.wallId) };
    } catch {
      return null;
    }
  }
  return null;
}

export function parseCityIdV6(input: unknown): CityId | null {
  if (typeof input !== "number") return null;
  try {
    return cityId(input);
  } catch {
    return null;
  }
}

export function parseUnitIdV6(input: unknown): UnitId | null {
  if (typeof input !== "number") return null;
  try {
    return unitId(input);
  } catch {
    return null;
  }
}

export function isRecordV6(input: unknown): input is Record<string, unknown> {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(input) as object | null;
  return prototype === Object.prototype || prototype === null;
}

export function hasExactKeysV6(
  input: unknown,
  expected: readonly string[],
): input is Record<string, unknown> {
  if (!isRecordV6(input)) return false;
  const ownKeys = Reflect.ownKeys(input);
  if (ownKeys.some((key) => typeof key !== "string")) return false;
  const actual = (ownKeys as string[]).sort();
  const required = [...expected].sort();
  return (
    actual.length === required.length &&
    actual.every((key, index) => key === required[index]) &&
    actual.every((key) => {
      const descriptor = Object.getOwnPropertyDescriptor(input, key);
      return descriptor?.enumerable === true && "value" in descriptor;
    })
  );
}

export function isDenseArrayV6(input: unknown): input is readonly unknown[] {
  if (
    !Array.isArray(input) ||
    Reflect.ownKeys(input).length !== input.length + 1
  )
    return false;
  for (let index = 0; index < input.length; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(input, String(index));
    if (descriptor?.enumerable !== true || !("value" in descriptor))
      return false;
  }
  return true;
}

export function isNonNegativeSafeIntegerV6(input: unknown): input is number {
  return typeof input === "number" && Number.isSafeInteger(input) && input >= 0;
}

export function isPositiveSafeIntegerV6(input: unknown): input is number {
  return typeof input === "number" && Number.isSafeInteger(input) && input >= 1;
}

function invalid(field: string): CommandParseResultV6 {
  return { ok: false, field };
}
