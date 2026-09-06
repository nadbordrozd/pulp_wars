import {
  RULESET_7_ID,
  type AiCountV7,
  type BoardSizeV7,
  type MatchSetupV7,
  type PlayerColorV7,
} from "./types";
import { hasExactKeysV7, isDenseArrayV7, isUint32V7 } from "./schema";

const SETUP_KEYS_V7 = [
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

export function parseMatchSetupV7(input: unknown): MatchSetupV7 | null {
  if (!hasExactKeysV7(input, SETUP_KEYS_V7)) return null;
  if (
    input.rulesetId !== RULESET_7_ID ||
    input.mapGenerationRevision !== "SPATIAL_ECONOMY" ||
    !isUint32V7(input.seed) ||
    !isBoardSize(input.width) ||
    input.height !== input.width ||
    !isAiCount(input.aiCount) ||
    input.width < minimumWidth(input.aiCount) ||
    input.aiDifficulty !== "NORMAL" ||
    (input.aiMode !== "RIVAL" && input.aiMode !== "COOPERATIVE") ||
    !isColor(input.humanColor) ||
    !isDenseArrayV7(input.factions) ||
    input.factions.length !== input.aiCount + 1 ||
    !input.factions.every((faction) => faction === "ORIGINAL")
  ) {
    return null;
  }
  return {
    rulesetId: RULESET_7_ID,
    seed: input.seed,
    width: input.width,
    height: input.width,
    aiCount: input.aiCount,
    aiDifficulty: "NORMAL",
    aiMode: input.aiMode,
    humanColor: input.humanColor,
    factions: [...input.factions] as readonly "ORIGINAL"[],
    mapGenerationRevision: "SPATIAL_ECONOMY",
  };
}

function minimumWidth(aiCount: AiCountV7): BoardSizeV7 {
  return aiCount === 1 ? 11 : aiCount === 2 ? 14 : 16;
}

function isBoardSize(input: unknown): input is BoardSizeV7 {
  return (
    input === 11 || input === 14 || input === 16 || input === 20 || input === 25
  );
}

function isAiCount(input: unknown): input is AiCountV7 {
  return input === 1 || input === 2 || input === 3;
}

function isColor(input: unknown): input is PlayerColorV7 {
  return (
    input === "CORAL" ||
    input === "TEAL" ||
    input === "GOLD" ||
    input === "VIOLET"
  );
}
