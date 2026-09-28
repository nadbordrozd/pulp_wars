import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  mkdtempSync,
  mkdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type { PlayerViewV7 } from "../src/engine/index";

export const TACTICAL_AI_BASELINE_REF =
  "2a3c029f92a63ea33c7164b05ad0a91d134c1e7b";
export const TACTICAL_AI_BASELINE_SHA256 =
  "37c5cebe79cc30939a8a7ce15ab0b83cfac6a6a220add8f57f85f6a2e1d72e73";

export interface BaselinePolicyModuleV7 {
  chooseNormalCommandV7(view: PlayerViewV7): {
    readonly command: unknown;
    readonly candidates: readonly unknown[];
  };
  chooseNormalTurnCommandV7(
    view: PlayerViewV7,
    commandsThisTurn: number,
    maxCommandsPerTurn?: number,
    decision?: unknown,
  ): unknown;
  NormalPolicyWorkV7: new (
    view: PlayerViewV7,
    readClock?: () => number,
  ) => {
    runSlice(milliseconds: number): unknown;
  };
}

/** Loads only the pinned policy source against the current engine in a temp tree. */
export async function loadPinnedTacticalAiBaselineV7(): Promise<{
  readonly module: BaselinePolicyModuleV7;
  readonly cleanup: () => void;
}> {
  const source = execFileSync(
    "git",
    ["show", `${TACTICAL_AI_BASELINE_REF}:src/ai/v7.ts`],
    { encoding: "utf8" },
  );
  const hash = createHash("sha256").update(source).digest("hex");
  if (hash !== TACTICAL_AI_BASELINE_SHA256)
    throw new Error(`Pinned baseline hash mismatch: ${hash}`);
  const temporary = mkdtempSync(join(tmpdir(), "pulp-wars-r11-baseline-"));
  const aiPath = join(temporary, "src", "ai", "v7.ts");
  mkdirSync(dirname(aiPath), { recursive: true });
  symlinkSync(resolve("src/engine"), join(temporary, "src", "engine"), "dir");
  writeFileSync(aiPath, source);
  const loaded = (await import(
    `${pathToFileURL(aiPath).href}?baseline=${TACTICAL_AI_BASELINE_SHA256}`
  )) as BaselinePolicyModuleV7;
  return {
    module: loaded,
    cleanup: () => rmSync(temporary, { recursive: true, force: true }),
  };
}
