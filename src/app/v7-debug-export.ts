import packageMetadata from "../../package.json";
import {
  RULESET_7_ID,
  authorizeOmniscientArtifactV7,
  packageOmniscientArtifactV7,
  type GameStateV7,
  type OmniscientArtifactV7,
  type ReplayFileV7,
} from "../engine/index";
import { createSaveEnvelopeV7, type SaveEnvelopeV7 } from "../persistence/v7";

export const RULESET7_DEBUG_BUNDLE_FORMAT =
  "pulp-wars-ruleset7-debug-bundle" as const;
export const RULESET7_DEBUG_BUNDLE_VERSION = 1 as const;

export type Ruleset7DiagnosticPhase =
  "EMPTY" | "RESUMABLE" | "ACTIVE" | "COMPLETE" | "RECOVERY" | "ERROR";

export interface Ruleset7DebugPayloadV1 {
  readonly format: typeof RULESET7_DEBUG_BUNDLE_FORMAT;
  readonly version: typeof RULESET7_DEBUG_BUNDLE_VERSION;
  readonly exportedAt: string;
  readonly warning: "INCLUDES_HIDDEN_MAP_AND_UNITS";
  readonly build: {
    readonly application: "pulp-wars";
    readonly packageVersion: string;
  };
  readonly schemas: {
    readonly rulesetId: typeof RULESET_7_ID;
    readonly gameState: 7;
    readonly command: 7;
    readonly canonicalEvent: 7;
    readonly playerEvent: 7;
    readonly save: 7;
    readonly replay: 7;
  };
  readonly controller: {
    readonly phase: Ruleset7DiagnosticPhase;
    readonly diagnostic: string | null;
    readonly transitioning: boolean;
  };
  readonly context: {
    readonly commandIndex: number;
    readonly activeSeatIndex: number;
    readonly activePlayerId: number;
    readonly humanPlayerId: number;
    readonly pendingChoiceKinds: readonly string[];
    readonly outcomeKind: string | null;
  };
  readonly reproduction: {
    readonly save: SaveEnvelopeV7;
    readonly replay: ReplayFileV7;
  };
}

export type Ruleset7DebugBundleV1 =
  OmniscientArtifactV7<Ruleset7DebugPayloadV1>;

export interface Ruleset7DebugBundleInput {
  readonly state: GameStateV7;
  readonly replay: ReplayFileV7;
  readonly phase: Ruleset7DiagnosticPhase;
  readonly diagnostic: string | null;
  readonly transitioning: boolean;
  readonly exportedAt: string;
  readonly acknowledgeHiddenInformation: true;
}

/** The sole browser-facing authority path for raw v7 reproduction data. */
export function createRuleset7DebugBundle(
  input: Ruleset7DebugBundleInput,
): Ruleset7DebugBundleV1 {
  const access = authorizeOmniscientArtifactV7({
    purpose: "DEBUG_WITH_SPOILERS",
    acknowledgeHiddenInformation: input.acknowledgeHiddenInformation,
  });
  const activePlayerId = input.state.turnOrder[input.state.activeSeatIndex];
  if (activePlayerId === undefined) throw new RangeError("INVALID_STATE");
  return packageOmniscientArtifactV7(access, "DEBUG_WITH_SPOILERS", {
    format: RULESET7_DEBUG_BUNDLE_FORMAT,
    version: RULESET7_DEBUG_BUNDLE_VERSION,
    exportedAt: input.exportedAt,
    warning: "INCLUDES_HIDDEN_MAP_AND_UNITS",
    build: {
      application: "pulp-wars",
      packageVersion: packageMetadata.version,
    },
    schemas: {
      rulesetId: RULESET_7_ID,
      gameState: 7,
      command: 7,
      canonicalEvent: 7,
      playerEvent: 7,
      save: 7,
      replay: 7,
    },
    controller: {
      phase: input.phase,
      diagnostic: input.diagnostic,
      transitioning: input.transitioning,
    },
    context: {
      commandIndex: input.state.commandIndex,
      activeSeatIndex: input.state.activeSeatIndex,
      activePlayerId,
      humanPlayerId: input.state.humanPlayerId,
      pendingChoiceKinds: input.state.pendingChoices.map(
        (choice) => choice.kind,
      ),
      outcomeKind: input.state.outcome?.kind ?? null,
    },
    reproduction: {
      save: createSaveEnvelopeV7(
        { state: input.state, replay: input.replay },
        input.exportedAt,
      ),
      replay: {
        ...input.replay,
        commands: [...input.replay.commands],
        checkpoints: [...input.replay.checkpoints],
      },
    },
  });
}

export function ruleset7DebugBundleFilename(
  exportedAt: string,
  stateHash: string,
): string {
  const timestamp = exportedAt.replaceAll(/[-:.]/g, "");
  return `pulp-wars-ruleset7-debug-with-spoilers-${timestamp}-${stateHash.slice(0, 12)}.json`;
}

export function ruleset7SafeLogFilename(exportedAt: string): string {
  const timestamp = exportedAt.replaceAll(/[-:.]/g, "");
  return `pulp-wars-ruleset7-safe-log-${timestamp}.json`;
}
