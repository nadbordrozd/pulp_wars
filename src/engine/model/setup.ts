import {
  FACTION_IDS,
  MAP_GENERATION_REVISION,
  RULESET_ID,
  type FactionId,
  type MatchSetup,
} from "./types";

const BASE_SETUP_KEYS = [
  "aiCount",
  "aiDifficulty",
  "aiMode",
  "factions",
  "height",
  "humanColor",
  "rulesetId",
  "seed",
  "width",
] as const;

/** Exhaustive untrusted v5 setup parser. Absent scenario means STANDARD. */
export function parseMatchSetup(input: unknown): MatchSetup | null {
  if (!isRecord(input)) return null;
  const scenario = Object.prototype.hasOwnProperty.call(input, "scenario")
    ? input.scenario
    : undefined;
  const hasMapGenerationRevision = Object.prototype.hasOwnProperty.call(
    input,
    "mapGenerationRevision",
  );
  const expected = [
    ...BASE_SETUP_KEYS,
    ...(hasMapGenerationRevision ? ["mapGenerationRevision"] : []),
    ...(scenario === undefined ? [] : ["scenario"]),
  ];
  if (!hasExactKeys(input, expected)) return null;
  if (
    input.rulesetId !== RULESET_ID ||
    !isUint32(input.seed) ||
    !isBoardSize(input.width) ||
    input.height !== input.width ||
    (input.aiCount !== 1 && input.aiCount !== 2 && input.aiCount !== 3) ||
    input.width < (input.aiCount === 1 ? 11 : input.aiCount === 2 ? 14 : 16) ||
    input.aiDifficulty !== "NORMAL" ||
    (input.aiMode !== "RIVAL" && input.aiMode !== "COOPERATIVE") ||
    !isFactionArray(input.factions, input.aiCount + 1) ||
    !isPlayerColor(input.humanColor)
  )
    return null;
  if (
    hasMapGenerationRevision &&
    input.mapGenerationRevision !== MAP_GENERATION_REVISION
  )
    return null;
  if (scenario !== undefined && scenario !== "DEMO") return null;
  if (
    scenario === "DEMO" &&
    (hasMapGenerationRevision ||
      input.seed !== 0xdecafbad ||
      input.width !== 25 ||
      input.aiCount !== 2 ||
      input.aiMode !== "RIVAL" ||
      input.factions.some((faction) => faction !== "ORIGINAL") ||
      input.humanColor !== "CORAL")
  )
    return null;
  const base: MatchSetup = {
    rulesetId: RULESET_ID,
    seed: input.seed,
    width: input.width,
    height: input.width,
    aiCount: input.aiCount,
    aiDifficulty: "NORMAL",
    aiMode: input.aiMode,
    humanColor: input.humanColor,
    factions: [...input.factions],
  };
  return scenario === "DEMO"
    ? { ...base, scenario }
    : hasMapGenerationRevision
      ? { ...base, mapGenerationRevision: MAP_GENERATION_REVISION }
      : base;
}

function isFactionArray(
  value: unknown,
  expectedLength: number,
): value is readonly FactionId[] {
  if (!Array.isArray(value) || value.length !== expectedLength) return false;
  if (Reflect.ownKeys(value).length !== value.length + 1) return false;
  for (let index = 0; index < value.length; index += 1) {
    if (!Object.prototype.hasOwnProperty.call(value, index)) return false;
    if (!FACTION_IDS.includes(value[index] as FactionId)) return false;
  }
  return true;
}

function hasExactKeys(
  input: Record<string, unknown>,
  expected: readonly string[],
): boolean {
  const keys = Object.keys(input).sort();
  const required = [...expected].sort();
  return (
    keys.length === required.length &&
    keys.every((key, index) => key === required[index])
  );
}

function isRecord(input: unknown): input is Record<string, unknown> {
  return typeof input === "object" && input !== null && !Array.isArray(input);
}

function isBoardSize(value: unknown): value is MatchSetup["width"] {
  return (
    value === 11 || value === 14 || value === 16 || value === 20 || value === 25
  );
}

function isPlayerColor(value: unknown): value is MatchSetup["humanColor"] {
  return (
    value === "CORAL" ||
    value === "TEAL" ||
    value === "GOLD" ||
    value === "VIOLET"
  );
}

function isUint32(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= 0xffff_ffff
  );
}
