import {
  FACTION_IDS_V6,
  RULESET_6_ID,
  SPATIAL_ECONOMY_REVISION,
  type AiCountV6,
  type BoardSizeV6,
  type FactionIdV6,
  type MatchSetupV6,
  type PlayerColorV6,
} from "./types";
import { hasExactKeysV6, isDenseArrayV6 } from "./commands";

const SETUP_KEYS_V6 = [
  "aiCount",
  "aiDifficulty",
  "aiMode",
  "factions",
  "height",
  "humanColor",
  "mapGenerationRevision",
  "rulesetId",
  "seed",
  "width",
] as const;

/**
 * Exhaustive v6 setup parser. There is deliberately no scenario or unmarked
 * generator arm: both are ruleset-5 compatibility data, not defaults.
 */
export function parseMatchSetupV6(input: unknown): MatchSetupV6 | null {
  if (!hasExactKeysV6(input, SETUP_KEYS_V6)) return null;
  if (
    input.rulesetId !== RULESET_6_ID ||
    input.mapGenerationRevision !== SPATIAL_ECONOMY_REVISION ||
    !isUint32V6(input.seed) ||
    !isBoardSizeV6(input.width) ||
    input.height !== input.width ||
    !isAiCountV6(input.aiCount) ||
    input.width < minimumWidth(input.aiCount) ||
    input.aiDifficulty !== "NORMAL" ||
    (input.aiMode !== "RIVAL" && input.aiMode !== "COOPERATIVE") ||
    !isPlayerColorV6(input.humanColor) ||
    !isFactionArrayV6(input.factions, input.aiCount + 1)
  ) {
    return null;
  }
  return {
    rulesetId: RULESET_6_ID,
    seed: input.seed,
    width: input.width,
    height: input.width,
    aiCount: input.aiCount,
    aiDifficulty: "NORMAL",
    aiMode: input.aiMode,
    humanColor: input.humanColor,
    factions: [...input.factions],
    mapGenerationRevision: SPATIAL_ECONOMY_REVISION,
  };
}

function minimumWidth(aiCount: AiCountV6): BoardSizeV6 {
  return aiCount === 1 ? 11 : aiCount === 2 ? 14 : 16;
}

function isFactionArrayV6(
  input: unknown,
  expectedLength: number,
): input is readonly FactionIdV6[] {
  return (
    isDenseArrayV6(input) &&
    input.length === expectedLength &&
    input.every((faction) => FACTION_IDS_V6.includes(faction as FactionIdV6))
  );
}

function isBoardSizeV6(input: unknown): input is BoardSizeV6 {
  return (
    input === 11 || input === 14 || input === 16 || input === 20 || input === 25
  );
}

function isAiCountV6(input: unknown): input is AiCountV6 {
  return input === 1 || input === 2 || input === 3;
}

function isPlayerColorV6(input: unknown): input is PlayerColorV6 {
  return (
    input === "CORAL" ||
    input === "TEAL" ||
    input === "GOLD" ||
    input === "VIOLET"
  );
}

function isUint32V6(input: unknown): input is number {
  return (
    typeof input === "number" &&
    Number.isInteger(input) &&
    input >= 0 &&
    input <= 0xffff_ffff
  );
}
