import { chooseNormalCommandV7 } from "../../src/ai/v7";
import {
  RULESET_7_ID,
  applyCommandV7,
  createPlayableGameV7,
  viewForV7,
  type CommandV7,
  type GameStateV7,
  type MapTypeV7,
  type MatchSetupV7,
} from "../../src/engine/index";
import { mirrorOptionV7 } from "./v7-builders";
import { frozenArenaV7 } from "./v7-frozen-sea";

/**
 * The frozen sea redesign, the AI (`pulp_wars-5ti.26`,
 * docs/product/RULESET_7_ICE_REDESIGN.md section 6, bead B, acceptance 6):
 * a match without an Ice Folk seat decides exactly as before. One fixed
 * state per generated map type (a new match, no Ice Folk seat) and the
 * naval strait with ships of two seafaring seats; for each, the first few
 * decisions of the active seat within its first turn (no turn is ended and
 * no match is played): the chosen command, the number of candidates, and
 * the five best with their scores. The expected traces were recorded on
 * the policy before the change (`v7-ice-ai-no-ice-folk-decisions.json`).
 * Reward placement (`pulp_wars-spue`, 7r111) re-recorded the four traces
 * that choose a Militia while a unit stands on the center: the Militia now
 * appears beside it, so the decisions after the reward differ. Reward
 * arrival (`pulp_wars-sa3h`) re-recorded the traces whose reward unit
 * (a Militia or the Scouts' unit) meets a unit on the center: it now takes
 * the center and pushes that unit off, so the decisions after it differ.
 */

export const ICE_AI_PIN_MAP_TYPES_V7: readonly MapTypeV7[] = [
  "DRY_LAND",
  "PANGEA",
  "CONTINENTS",
  "ARCHIPELAGO",
  "LAKES",
];

/** Decisions traced per state. */
export const ICE_AI_PIN_DECISIONS_V7 = 6;

export interface IceAiPinStepV7 {
  readonly command: CommandV7 | null;
  readonly candidates: number;
  readonly best: readonly unknown[];
}

function mapSetupV7(mapType: MapTypeV7): MatchSetupV7 {
  const factions = ["ORIGINAL", "UNDEAD", "GOBLIN"] as const;
  return {
    rulesetId: RULESET_7_ID,
    seed: 5,
    width: 14,
    height: 14,
    aiCount: 2,
    aiDifficulty: "NORMAL",
    aiMode: "RIVAL",
    humanColor: "CORAL",
    factions: [...factions],
    mapType,
    mapGenerationRevision: "REGIONAL_BIOMES_NAVAL_V4",
    curiosities: false,
    ...mirrorOptionV7(factions),
  };
}

/** The fixed state of one pin: a new match of `mapType`, or the naval strait. */
export function iceAiPinStateV7(mapType: MapTypeV7 | "STRAIT"): GameStateV7 {
  if (mapType === "STRAIT")
    return frozenArenaV7({
      factions: ["ORIGINAL", "UNDEAD"],
      units: [
        { seat: 0, role: "FIGHTER", at: { x: 2, y: 2 } },
        { seat: 0, role: "PATROL_BOAT", at: { x: 2, y: 3 } },
        { seat: 0, role: "BATTLESHIP", at: { x: 6, y: 4 } },
        { seat: 1, role: "PATROL_BOAT", at: { x: 8, y: 6 } },
        { seat: 1, role: "SUBMARINE", at: { x: 3, y: 6 } },
      ],
    });
  const created = createPlayableGameV7(mapSetupV7(mapType));
  if (!created.ok) throw new Error(created.error.code);
  return created.state;
}

/** The trace of the active seat's first decisions on `state`. */
export function iceAiPinTraceV7(start: GameStateV7): readonly IceAiPinStepV7[] {
  let state = start;
  const steps: IceAiPinStepV7[] = [];
  for (let index = 0; index < ICE_AI_PIN_DECISIONS_V7; index += 1) {
    const active = state.turnOrder[state.activeSeatIndex];
    if (active === undefined) break;
    const decision = chooseNormalCommandV7(viewForV7(state, active));
    steps.push({
      command: decision.command,
      candidates: decision.candidates.length,
      best: decision.candidates.slice(0, 5).map((item) => ({
        command: item.command,
        score: item.score,
      })),
    });
    if (decision.command === null || decision.command.kind === "END_TURN")
      break;
    const result = applyCommandV7(state, active, decision.command);
    if (!result.accepted) throw new Error(result.error.code);
    state = result.state;
  }
  return JSON.parse(JSON.stringify(steps)) as readonly IceAiPinStepV7[];
}
