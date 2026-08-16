import { cityId, unitId } from "../model/ids";
import type { Coord, RewardId, TechId, UnitType } from "../model/types";
import { ruleError, type RuleError } from "./errors";
import type { Command, CommandEnvelope } from "./types";

const TECH_IDS = new Set<TechId>([
  "CLIMBING",
  "RIDING",
  "HUNTING",
  "ORGANIZATION",
  "MINING",
  "FORESTRY",
  "ARCHERY",
  "STRATEGY",
  "MATHEMATICS",
]);
const UNIT_TYPES = new Set<UnitType>([
  "WARRIOR",
  "ARCHER",
  "DEFENDER",
  "RIDER",
  "CATAPULT",
]);
const REWARD_IDS = new Set<RewardId>([
  "WORKSHOP",
  "SURVEY",
  "RESOURCES",
  "CITY_WALL",
]);

export type ParseResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: RuleError };

export function parseCommandEnvelope(
  input: unknown,
): ParseResult<CommandEnvelope> {
  if (
    !hasExactKeys(input, ["format", "version", "command"]) ||
    input.format !== "pulp-wars-command" ||
    input.version !== 4
  ) {
    return invalid("envelope");
  }
  const parsed = parseCommand(input.command);
  if (!parsed.ok) {
    return parsed;
  }
  return {
    ok: true,
    value: { format: "pulp-wars-command", version: 4, command: parsed.value },
  };
}

export function parseCommand(input: unknown): ParseResult<Command> {
  if (!isRecord(input) || typeof input.kind !== "string") {
    return invalid("command");
  }

  const kind = input.kind;
  switch (kind) {
    case "END_TURN":
      return hasExactKeys(input, ["kind"])
        ? { ok: true, value: { kind: "END_TURN" } }
        : invalid("END_TURN");
    case "RESEARCH": {
      if (
        !hasExactKeys(input, ["kind", "tech"]) ||
        typeof input.tech !== "string" ||
        !TECH_IDS.has(input.tech as TechId)
      ) {
        return invalid("RESEARCH");
      }
      return {
        ok: true,
        value: { kind: "RESEARCH", tech: input.tech as TechId },
      };
    }
    case "HARVEST_FRUIT":
    case "HUNT_ANIMAL":
    case "BUILD_LUMBER_MILL":
    case "BUILD_MINE": {
      if (!hasExactKeys(input, ["kind", "at"])) {
        return invalid(kind);
      }
      const at = parseCoord(input.at);
      return at === null
        ? invalid(`${kind}.at`)
        : { ok: true, value: { kind, at } };
    }
    case "TRAIN": {
      if (
        !hasExactKeys(input, ["kind", "cityId", "unit"]) ||
        typeof input.unit !== "string" ||
        !UNIT_TYPES.has(input.unit as UnitType)
      ) {
        return invalid("TRAIN");
      }
      const id = parseCityId(input.cityId);
      return id === null
        ? invalid("TRAIN.cityId")
        : {
            ok: true,
            value: { kind: "TRAIN", cityId: id, unit: input.unit as UnitType },
          };
    }
    case "MOVE":
    case "ESCAPE_MOVE": {
      if (!hasExactKeys(input, ["kind", "unitId", "path"])) {
        return invalid(kind);
      }
      const id = parseUnitId(input.unitId);
      const path = parsePath(input.path);
      if (id === null || path === null) {
        return invalid(kind);
      }
      return {
        ok: true,
        value: { kind, unitId: id, path },
      };
    }
    case "ATTACK": {
      if (!hasExactKeys(input, ["kind", "unitId", "targetId"])) {
        return invalid("ATTACK");
      }
      const id = parseUnitId(input.unitId);
      const target = parseUnitId(input.targetId);
      return id === null || target === null
        ? invalid("ATTACK")
        : { ok: true, value: { kind: "ATTACK", unitId: id, targetId: target } };
    }
    case "RECOVER":
    case "WAIT":
    case "PROMOTE":
    case "CAPTURE": {
      if (!hasExactKeys(input, ["kind", "unitId"])) {
        return invalid(kind);
      }
      const id = parseUnitId(input.unitId);
      return id === null
        ? invalid(`${kind}.unitId`)
        : { ok: true, value: { kind, unitId: id } };
    }
    case "CHOOSE_CITY_REWARD": {
      if (
        !hasExactKeys(input, ["kind", "cityId", "reward"]) ||
        typeof input.reward !== "string" ||
        !REWARD_IDS.has(input.reward as RewardId)
      ) {
        return invalid("CHOOSE_CITY_REWARD");
      }
      const id = parseCityId(input.cityId);
      return id === null
        ? invalid("CHOOSE_CITY_REWARD.cityId")
        : {
            ok: true,
            value: {
              kind: "CHOOSE_CITY_REWARD",
              cityId: id,
              reward: input.reward as RewardId,
            },
          };
    }
    default:
      return invalid("command.kind");
  }
}

function parseCoord(input: unknown): Coord | null {
  if (
    !hasExactKeys(input, ["x", "y"]) ||
    !Number.isSafeInteger(input.x) ||
    !Number.isSafeInteger(input.y)
  ) {
    return null;
  }
  return { x: input.x as number, y: input.y as number };
}

function parsePath(input: unknown): readonly Coord[] | null {
  if (!Array.isArray(input)) {
    return null;
  }
  const path: Coord[] = [];
  for (const item of input) {
    const coord = parseCoord(item);
    if (coord === null) {
      return null;
    }
    path.push(coord);
  }
  return path;
}

function parseCityId(input: unknown): ReturnType<typeof cityId> | null {
  if (typeof input !== "number") {
    return null;
  }
  try {
    return cityId(input);
  } catch {
    return null;
  }
}

function parseUnitId(input: unknown): ReturnType<typeof unitId> | null {
  if (typeof input !== "number") {
    return null;
  }
  try {
    return unitId(input);
  } catch {
    return null;
  }
}

function invalid(field: string): ParseResult<never> {
  return { ok: false, error: ruleError("INVALID_COMMAND", { field }) };
}

function isRecord(input: unknown): input is Record<string, unknown> {
  return typeof input === "object" && input !== null && !Array.isArray(input);
}

function hasExactKeys(
  input: unknown,
  expected: readonly string[],
): input is Record<string, unknown> {
  if (!isRecord(input)) {
    return false;
  }
  const keys = Object.keys(input).sort();
  const sortedExpected = [...expected].sort();
  return (
    keys.length === sortedExpected.length &&
    keys.every((key, index) => key === sortedExpected[index])
  );
}
