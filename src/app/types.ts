import type {
  CityId,
  GameState,
  MatchOutcome,
  AiMode,
  FactionId,
  PlayerColor,
  PlayerUnitView,
  PlayerView,
  UnitId,
} from "../engine/index";

export type AppRoute =
  | "SPLASH"
  | "HUB"
  | "MODE"
  | "SETUP"
  | "FACTION"
  | "MATCH"
  | "RESULT"
  | "ERROR";

export type BoardPreset = "AUTO" | 11 | 14 | 16 | 20 | 25;

export interface SetupDraft {
  readonly aiCount: 1 | 2 | 3;
  readonly aiMode: AiMode;
  readonly boardPreset: BoardPreset;
  readonly seedText: string;
  readonly resolvedSeed: number | null;
  readonly humanColor: PlayerColor;
  readonly factions: readonly FactionId[];
}

export interface UiSettings {
  readonly uiScale: 1 | 1.25 | 1.5 | 2;
  readonly motion: "FULL" | "REDUCED";
  readonly animationSpeed: "NORMAL" | "FAST";
  readonly highContrast: boolean;
}

export type ConfirmationAction =
  | { readonly kind: "START_MATCH" }
  | { readonly kind: "START_DEMO" }
  | { readonly kind: "RESTART" }
  | { readonly kind: "PLAY_AGAIN" }
  | { readonly kind: "DELETE_SAVE" }
  | { readonly kind: "DISCARD_SETUP"; readonly destination: "HUB" | "MODE" };

export type MatchOverlay =
  | { readonly name: "NONE" }
  | { readonly name: "ABOUT" }
  | { readonly name: "HELP" }
  | { readonly name: "SETTINGS"; readonly from: "HUB" | "MATCH" }
  | { readonly name: "STATS" }
  | { readonly name: "TECH" }
  | { readonly name: "REWARD"; readonly cityId: CityId }
  | {
      readonly name: "CANDIFY_CITY";
      readonly unitId: UnitId;
      readonly candidateCityIds: readonly CityId[];
    }
  | { readonly name: "CONFIRM"; readonly action: ConfirmationAction }
  | { readonly name: "SAVE_RECOVERY"; readonly diagnostic: string }
  | { readonly name: "AI_ERROR"; readonly diagnostic: string };

export interface SaveRecovery {
  readonly kind: "CORRUPT" | "INCOMPATIBLE" | "STORAGE_ERROR";
  readonly diagnostic: string;
}

export interface MatchTallies {
  readonly citiesCaptured: number;
  readonly unitsDefeated: number;
  readonly unitsLost: number;
}

export interface PlayerMatchTallies {
  readonly playerId: number;
  readonly kills: number;
  readonly losses: number;
  readonly citiesCaptured: number;
}

/**
 * Ephemeral, observation-safe combat facts consumed by Canvas. This is never
 * persisted or included in the deterministic game state/replay.
 */
export interface CombatPresentation {
  readonly id: number;
  readonly kind: "STANDARD" | "ARCHER_ARROW";
  /** Archer-family projectile is faction presentation, never a combat rule. */
  readonly projectile?: "ARROW" | "GUMBALL" | null;
  readonly queueToken: number;
  readonly commandIndex: number;
  readonly phase: "CONTACT" | "FLIGHT" | "IMPACT";
  readonly phaseDurationMs: number;
  readonly phaseElapsedMs: number;
  readonly paused: boolean;
  readonly motion: "FULL" | "REDUCED";
  readonly attacker: PlayerUnitView | null;
  readonly defender: PlayerUnitView;
  readonly damageToDefender: number;
  readonly damageToAttacker: number;
  readonly defenderDies: boolean;
  readonly attackerDies: boolean;
  readonly advances: boolean;
}

export type CandyPresentation =
  | {
      readonly id: number;
      readonly kind: "DONUT_ROLL";
      readonly queueToken: number;
      readonly commandIndex: number;
      readonly durationMs: number;
      readonly elapsedMs: number;
      readonly paused: boolean;
      readonly motion: "FULL" | "REDUCED";
      readonly actor: PlayerUnitView;
      readonly steps: readonly {
        readonly at: { readonly x: number; readonly y: number };
        readonly damage: number;
        readonly targetKind: "UNIT" | "CHOCOLATE_WALL" | null;
        readonly targetId: number | null;
        readonly targetDies: boolean;
      }[];
    }
  | {
      readonly id: number;
      readonly kind: "WALL_BUILD" | "CANDIFY";
      readonly queueToken: number;
      readonly commandIndex: number;
      readonly durationMs: number;
      readonly elapsedMs: number;
      readonly paused: boolean;
      readonly motion: "FULL" | "REDUCED";
      readonly at: { readonly x: number; readonly y: number };
      readonly actor: PlayerUnitView | null;
    }
  | {
      readonly id: number;
      readonly kind: "WALL_HIT";
      readonly queueToken: number;
      readonly commandIndex: number;
      readonly durationMs: number;
      readonly elapsedMs: number;
      readonly paused: boolean;
      readonly motion: "FULL" | "REDUCED";
      readonly at: { readonly x: number; readonly y: number };
      readonly actor: PlayerUnitView | null;
      readonly damage: number;
      readonly targetDies: boolean;
    };

export interface AppSnapshot {
  readonly route: AppRoute;
  /** Presentation identity; changes only when a distinct match is created. */
  readonly matchInstanceId: number;
  readonly overlay: MatchOverlay;
  readonly draft: SetupDraft;
  readonly settings: UiSettings;
  readonly match: GameState | null;
  readonly view: PlayerView | null;
  readonly readOnlyFinalMap: boolean;
  readonly fastForwarding: boolean;
  readonly combatPresentation: CombatPresentation | null;
  readonly candyPresentation: CandyPresentation | null;
  readonly hasStoredSave: boolean;
  readonly savedAt: string | null;
  readonly saveRecovery: SaveRecovery | null;
  readonly saveWarning: string | null;
  readonly notice: string | null;
  readonly announcement: string;
  readonly assertiveAnnouncement: string;
  readonly tallies: MatchTallies;
  readonly playerTallies: readonly PlayerMatchTallies[];
  readonly result: MatchOutcome | null;
}
