import { deepFreeze } from "../model/freeze";
import { canonicalHash } from "../replay/canonical";
import { ORIGINAL_BASELINE_V3_TREE, RULESET_7 } from "../rules/ruleset-v7";
import {
  createInitialMapStateV6,
  generateInitialMapV6,
  type GenerateMapResultV6,
  type GeneratedMapV6,
} from "../v6/map";
import type { MatchSetupV6 } from "../v6/types";
import { parseMatchSetupV7 } from "./setup";
import { parseGameStateV7 } from "./state-schema";
import {
  RULESET_7_ID,
  type BoardStateV7,
  type CoordV7,
  type GameStateV7,
  type MatchSetupV7,
  type RandomStateV7,
} from "./types";

export interface GeneratedMapV7 {
  readonly board: BoardStateV7;
  readonly capitals: readonly CoordV7[];
  readonly villages: readonly CoordV7[];
  readonly capitalAssignments: readonly CoordV7[];
  readonly turnOrderSeats: readonly number[];
  readonly treasureChests: readonly CoordV7[];
  readonly random: RandomStateV7;
  readonly attempt: number;
  readonly attempts: GeneratedMapV6["attempts"];
}

export type GenerateMapResultV7 =
  | { readonly ok: true; readonly map: GeneratedMapV7 }
  | Extract<GenerateMapResultV6, { readonly ok: false }>
  | {
      readonly ok: false;
      readonly error: {
        readonly code: "INVALID_SETUP";
        readonly params: Readonly<Record<string, never>>;
      };
    };

/**
 * Thin compatibility adapter over the frozen v6 SPATIAL_ECONOMY generator.
 * It changes no generation input other than the ruleset identifier and cannot
 * consume an additional random draw.
 */
export function generateInitialMapV7(input: unknown): GenerateMapResultV7 {
  const setup = parseMatchSetupV7(input);
  if (setup === null) {
    return { ok: false, error: { code: "INVALID_SETUP", params: {} } };
  }
  const generated = generateInitialMapV6(toV6Setup(setup));
  return generated as unknown as GenerateMapResultV7;
}

export type CreateInitialMapStateResultV7 =
  | {
      readonly ok: true;
      readonly state: GameStateV7;
      readonly mapAttempt: number;
    }
  | {
      readonly ok: false;
      readonly error:
        | {
            readonly code: "INVALID_SETUP";
            readonly params: Readonly<Record<string, never>>;
          }
        | Extract<GenerateMapResultV6, { readonly ok: false }>["error"];
    };

export function createInitialMapStateV7(
  input: unknown,
): CreateInitialMapStateResultV7 {
  const setup = parseMatchSetupV7(input);
  if (setup === null)
    return { ok: false, error: { code: "INVALID_SETUP", params: {} } };
  const v6 = createInitialMapStateV6(toV6Setup(setup));
  if (!v6.ok) return v6;
  const state = deepFreeze<GameStateV7>({
    schemaVersion: 7,
    rulesetId: RULESET_7_ID,
    setup,
    random: v6.state.random,
    humanPlayerId: v6.state.humanPlayerId,
    nextEntityId: v6.state.nextEntityId,
    commandIndex: 0,
    round: 1,
    activeSeatIndex: 0,
    turnOrder: v6.state.turnOrder,
    board: v6.state.board,
    players: v6.state.players.map((player) => ({
      id: player.id,
      seat: player.seat,
      controller: player.controller,
      color: player.color,
      faction: "ORIGINAL",
      factionTreeId: "ORIGINAL_BASELINE_V3",
      status: player.status,
      coins: RULESET_7.startingCoins,
      researchedTechs: ORIGINAL_BASELINE_V3_TREE.startingTechIds,
      explored: player.explored,
      spoilsClaimedCityIds: [],
      achievementEntitlements: [
        { achievement: "ENGINEER", unlocked: false, spent: false },
        { achievement: "MUSTER", unlocked: false, spent: false },
      ],
    })),
    cities: v6.state.cities.map((city) => ({ ...city, blackout: null })),
    populationContributions: v6.state.populationContributions,
    units: v6.state.units.map((unit) => ({
      ...unit,
      activation: {
        moved: unit.activation.moved,
        movedPathLength: unit.activation.movedPathLength,
        attacked: unit.activation.attacked,
        attacksUsed: unit.activation.attacked ? 1 : 0,
        pursuitPhase: "NONE",
        healed: unit.activation.healed,
        recovered: unit.activation.recovered,
        captured: unit.activation.captured,
        handled: unit.activation.handled,
        specialActed: unit.activation.specialActed,
      },
      blackoutEligibleRound: null,
    })),
    treasureChests: v6.state.treasureChests,
    defectionMarks: [],
    saboteurExposures: [],
    pendingChoices: [],
    outcome: null,
  });
  if (parseGameStateV7(state) === null)
    throw new Error("Internal v7 initial-state invariant failure");
  return { ok: true, state, mapAttempt: v6.mapAttempt };
}

export function canonicalMapRandomHashV7(
  map: Pick<GeneratedMapV7, "board" | "treasureChests" | "random">,
): string {
  return canonicalHash({
    board: map.board,
    treasureChests: map.treasureChests,
    random: map.random,
  });
}

export function toV6Setup(setup: MatchSetupV7): MatchSetupV6 {
  return {
    rulesetId: "pulp-wars-poc-6",
    seed: setup.seed,
    width: setup.width,
    height: setup.height,
    aiCount: setup.aiCount,
    aiDifficulty: "NORMAL",
    aiMode: setup.aiMode,
    humanColor: setup.humanColor,
    factions: setup.factions,
    mapGenerationRevision: "SPATIAL_ECONOMY",
  };
}
