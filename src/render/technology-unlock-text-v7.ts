import { BLAST_MOUNTAIN_POPULATION_V7 } from "../engine/index";

/**
 * Tuning 1 (`pulp_wars-w49.3`, identity 7r46;
 * docs/product/RULESET_7_TUNING_1.md section F): the sentences for the
 * technology effects whose rule changed. The tech card
 * (`src/render/dom/app-view-v7.ts`) and the text-mode harness
 * (`scripts/play-text-v7.ts`) print the same ones, so this module imports
 * the engine only.
 */

/** Explosives, `MELEE_FIELD_DEMOLITION`. */
export const BREACH_UNLOCK_TEXT_V7 =
  "Breach: melee attacks ignore Walls and Field Defense, and destroy Field Defense";

/** Explosives, the `BLAST_MOUNTAIN` command. */
export const BLAST_MOUNTAIN_UNLOCK_TEXT_V7 = `Blast Mountain: removes a Mountain in your territory (and its Ore); its city gains +${BLAST_MOUNTAIN_POPULATION_V7} population`;

/** Fortification, the `BUILD_FIELD_DEFENSE` command. */
export const FIELD_DEFENSE_UNLOCK_TEXT_V7 =
  "Build Field Defense: the builder keeps its move and attack";

/** Commerce, `LAND_TRADE_INCOME`. */
export function landTradeUnlockTextV7(coins: number): string {
  return `Road-linked cities: +${coins} Coins each turn`;
}
