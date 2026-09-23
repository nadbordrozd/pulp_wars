import { RULESET7_LATE_PUBLIC_VIEW_COMMAND_INDEX } from "./ruleset-v7-late-public-view-contract";

export interface PreviewEvidenceV7 {
  readonly initial: {
    readonly viewerId: number;
    readonly activePlayerId: number;
    readonly humanCoins: number;
    readonly commandIndex: number;
    readonly projectedViewerId: number;
  };
  readonly returned: {
    readonly viewerId: number;
    readonly activePlayerId: number;
    readonly humanCoins: number;
    readonly commandIndex: number;
    readonly policySlices: number;
    readonly maximumSliceMilliseconds: number;
    readonly fastForwardObserved: boolean;
    readonly hostTicks: number;
  };
  readonly persisted: {
    readonly version: number;
    readonly rulesetId: string;
    readonly commandIndex: number;
  };
  readonly ordinaryBoundary: {
    readonly controllerOwnProperties: readonly string[];
    readonly snapshotHasStateHash: boolean;
    readonly snapshotHasReplay: boolean;
    readonly publicPlayersLeakPrivateState: boolean;
  };
  readonly exports: {
    readonly safeClassification: string;
    readonly safeViewerId: number;
    readonly debugClassification: string;
    readonly debugWarning: string;
  };
}

export interface ColdPolicyEvidenceV7 {
  readonly commandIndex: number;
  readonly callbacks: number;
  readonly hostTicks: number;
  readonly maximumCallbackMilliseconds: number;
  readonly totalMilliseconds: number;
  readonly decisionKind: string | null;
}

export function validatePreview(evidence: PreviewEvidenceV7): void {
  validateMilliseconds(evidence.returned.maximumSliceMilliseconds);
  if (
    evidence.initial.commandIndex !== 0 ||
    evidence.initial.viewerId !== 1 ||
    evidence.initial.activePlayerId !== 2 ||
    evidence.initial.humanCoins !== 5 ||
    evidence.initial.projectedViewerId !== 1
  )
    throw new Error(
      `initial boundary failed: ${JSON.stringify(evidence.initial)}`,
    );
  if (
    evidence.returned.viewerId !== 1 ||
    evidence.returned.activePlayerId !== 1 ||
    evidence.returned.humanCoins !== 7 ||
    evidence.returned.commandIndex < 1 ||
    evidence.returned.policySlices < evidence.returned.commandIndex ||
    !evidence.returned.fastForwardObserved ||
    evidence.returned.hostTicks < 1
  )
    throw new Error(
      `production AI boundary failed: ${JSON.stringify(evidence.returned)}`,
    );
  if (
    evidence.persisted.version !== 7 ||
    evidence.persisted.rulesetId !== "pulp-wars-poc-7r6" ||
    evidence.persisted.commandIndex !== evidence.returned.commandIndex
  )
    throw new Error(
      `persisted boundary failed: ${JSON.stringify(evidence.persisted)}`,
    );
  if (
    evidence.ordinaryBoundary.controllerOwnProperties.length !== 0 ||
    evidence.ordinaryBoundary.snapshotHasStateHash ||
    evidence.ordinaryBoundary.snapshotHasReplay ||
    evidence.ordinaryBoundary.publicPlayersLeakPrivateState
  )
    throw new Error(
      `ordinary authority boundary failed: ${JSON.stringify(evidence.ordinaryBoundary)}`,
    );
  if (
    evidence.exports.safeClassification !== "PLAYER_SAFE" ||
    evidence.exports.safeViewerId !== 1 ||
    evidence.exports.debugClassification !== "OMNISCIENT" ||
    evidence.exports.debugWarning !== "INCLUDES_HIDDEN_MAP_AND_UNITS"
  )
    throw new Error(
      `export classification failed: ${JSON.stringify(evidence.exports)}`,
    );
}

export function validateColdPolicy(evidence: ColdPolicyEvidenceV7): void {
  validateMilliseconds(evidence.maximumCallbackMilliseconds);
  validateMilliseconds(evidence.totalMilliseconds);
  if (
    evidence.commandIndex !== RULESET7_LATE_PUBLIC_VIEW_COMMAND_INDEX ||
    evidence.callbacks < 2 ||
    evidence.hostTicks < 2 ||
    evidence.decisionKind === null
  )
    throw new Error(
      `cold late-view responsiveness failed: ${JSON.stringify(evidence)}`,
    );
}

export type BrowserTimingModeV7 = "DIAGNOSTIC" | "STRICT";

export function browserTimingModeV7(
  args: readonly string[],
): BrowserTimingModeV7 {
  return args.includes("--performance") || args.includes("--archive-evidence")
    ? "STRICT"
    : "DIAGNOSTIC";
}

export function collectBrowserTimingV7(
  preview: PreviewEvidenceV7,
  cold: ColdPolicyEvidenceV7 | null,
) {
  const productionMaximumMilliseconds =
    preview.returned.maximumSliceMilliseconds;
  const coldMaximumMilliseconds = cold?.maximumCallbackMilliseconds ?? null;
  validateMilliseconds(productionMaximumMilliseconds);
  if (cold !== null) {
    validateMilliseconds(cold.maximumCallbackMilliseconds);
    validateMilliseconds(cold.totalMilliseconds);
  }
  const budgetMilliseconds = 40;
  const exceeded =
    productionMaximumMilliseconds > budgetMilliseconds ||
    (coldMaximumMilliseconds !== null &&
      coldMaximumMilliseconds > budgetMilliseconds);
  return {
    budgetMilliseconds,
    status: exceeded ? ("EXCEEDED" as const) : ("PASS" as const),
    productionMaximumMilliseconds,
    coldMaximumMilliseconds,
  };
}

export function enforceBrowserTimingV7(
  timing: ReturnType<typeof collectBrowserTimingV7>,
  mode: BrowserTimingModeV7,
): void {
  if (mode === "STRICT" && timing.status === "EXCEEDED")
    throw new Error(
      `Browser performance budget exceeded: ${JSON.stringify(timing)}`,
    );
}

function validateMilliseconds(value: number): void {
  if (!Number.isFinite(value) || value < 0)
    throw new Error(`Invalid browser timing measurement: ${String(value)}`);
}
