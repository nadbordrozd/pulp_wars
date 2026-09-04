import packageMetadata from "../../package.json";
import {
  RULESET_6_ID,
  type GameStateV6,
  type ReplayFileV6,
} from "../engine/index";
import { createSaveEnvelopeV6, type SaveEnvelopeV6 } from "../persistence/v6";

export const RULESET6_DEBUG_LOG_FORMAT = "pulp-wars-ruleset6-debug-log";
export const RULESET6_DEBUG_LOG_VERSION = 1;

export type Ruleset6DiagnosticPhase =
  "EMPTY" | "RESUMABLE" | "ACTIVE" | "COMPLETE" | "RECOVERY" | "ERROR";

export interface Ruleset6DebugLogV1 {
  readonly format: typeof RULESET6_DEBUG_LOG_FORMAT;
  readonly version: typeof RULESET6_DEBUG_LOG_VERSION;
  readonly exportedAt: string;
  readonly build: {
    readonly application: "pulp-wars";
    readonly packageVersion: string;
  };
  readonly schemas: {
    readonly rulesetId: typeof RULESET_6_ID;
    readonly gameState: 6;
    readonly command: 6;
    readonly event: 6;
    readonly save: 6;
    readonly replay: 6;
  };
  readonly controller: {
    readonly phase: Ruleset6DiagnosticPhase;
    readonly diagnostic: string | null;
    readonly transitioning: boolean;
  };
  readonly context: {
    readonly commandIndex: number;
    readonly activeSeatIndex: number;
    readonly activePlayerId: number;
    readonly humanPlayerId: number;
    readonly treasureChestsRemaining: number;
    readonly pendingChoiceKinds: readonly string[];
    readonly outcomeKind: string | null;
  };
  readonly reproduction: {
    readonly save: SaveEnvelopeV6;
    readonly replay: ReplayFileV6;
  };
}

export interface Ruleset6DebugLogInput {
  readonly state: GameStateV6;
  readonly replay: ReplayFileV6;
  readonly phase: Ruleset6DiagnosticPhase;
  readonly diagnostic: string | null;
  readonly transitioning: boolean;
  readonly exportedAt: string;
}

/**
 * Builds an explicitly allowlisted diagnostic payload. Canonical reproduction
 * data comes from the existing v6 save/replay contracts; no browser or storage
 * object is accepted by this boundary.
 */
export function createRuleset6DebugLog(
  input: Ruleset6DebugLogInput,
): Ruleset6DebugLogV1 {
  const save = createSaveEnvelopeV6(
    { state: input.state, replay: input.replay },
    input.exportedAt,
  );
  const activePlayerId = input.state.turnOrder[input.state.activeSeatIndex];
  if (activePlayerId === undefined) throw new RangeError("INVALID_STATE");
  return {
    format: RULESET6_DEBUG_LOG_FORMAT,
    version: RULESET6_DEBUG_LOG_VERSION,
    exportedAt: input.exportedAt,
    build: {
      application: "pulp-wars",
      packageVersion: packageMetadata.version,
    },
    schemas: {
      rulesetId: RULESET_6_ID,
      gameState: 6,
      command: 6,
      event: 6,
      save: 6,
      replay: 6,
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
      treasureChestsRemaining: input.state.treasureChests.length,
      pendingChoiceKinds: input.state.pendingChoices.map(
        (choice) => choice.kind,
      ),
      outcomeKind: input.state.outcome?.kind ?? null,
    },
    reproduction: {
      save,
      replay: {
        ...input.replay,
        commands: [...input.replay.commands],
        checkpoints: [...input.replay.checkpoints],
      },
    },
  };
}

export function ruleset6DebugLogFilename(
  exportedAt: string,
  stateHash: string,
): string {
  const timestamp = exportedAt.replaceAll(/[-:.]/g, "");
  return `pulp-wars-ruleset6-debug-${timestamp}-${stateHash.slice(0, 12)}.json`;
}
