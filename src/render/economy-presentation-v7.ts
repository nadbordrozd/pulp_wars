import {
  CITY_REWARD_COINS_V7,
  MARKET_INCOME_CAP_V7,
  REWARD_UNIT_LEVEL_V7,
  TECHNOLOGY_RESEARCH_COST_V7,
} from "../engine/index";

/**
 * The economy rejig (`pulp_wars-w49.16`, 7r54): the research price rule of
 * one tier, as the technology detail states it under the price.
 */
export function researchPriceRuleTextV7(tier: 1 | 2 | 3): string {
  const { base, step } = TECHNOLOGY_RESEARCH_COST_V7[tier];
  return `Tier ${tier}: ${base} Coins, +${step} for each city you own beyond your first`;
}

/** The economy rejig: the Help tip for the shared mills and the price. */
export const ECONOMY_REJIG_HELP_TIP_V7 = `A mill counts every Farm, Lumber Camp, or Mine of yours next to it, on any of your cities' land, and one Farm can feed two cities' mills. A technology costs ${[1, 2, 3].map((tier) => TECHNOLOGY_RESEARCH_COST_V7[tier as 1 | 2 | 3].step).join(" / ")} Coins more (tier 1 / 2 / 3) for each city you own beyond your first.`;

/**
 * When a city offers its faction's giant, for the city panel and the
 * level-4 reward dialog. The reward ladder rework (`pulp_wars-zypi`): at
 * level 5 and every later level, the giant or the Treasury, with no
 * once-per-city limit (the economy rejig, 7r54, offered it once per city).
 */
export function rewardGiantOfferTextV7(giant: string): string {
  return `From level ${REWARD_UNIT_LEVEL_V7}, every level of this city offers a free ${giant} or ${CITY_REWARD_COINS_V7.TREASURY} Coins`;
}

/** The reward giant rule as one sentence (`pulp_wars-zypi`). */
export function rewardGiantHelpTipV7(giant: string): string {
  return `Every city can take a free ${giant} or ${CITY_REWARD_COINS_V7.TREASURY} Coins as the reward of every level from ${REWARD_UNIT_LEVEL_V7}.`;
}

/** Tuning 4: where a Market may be built (its `placementMinimum`). */
export const MARKET_PLACEMENT_TEXT_V7 =
  "needs one of your Farms, Lumber Camps, Mines or their mills next to it";

/**
 * The short text of an improvement's economic formula, as the technology
 * cards and the Gallery (bead pulp_wars-ic8) show it.
 */
export function economicFormulaV7(
  improvement: string,
  formula: string,
): string {
  if (
    improvement === "WINDMILL" &&
    formula === "ADJACENT_FRIENDLY_CONTRIBUTORS"
  )
    return "Windmill: +1 per adjacent farm; heals adjacent owner units for 6 HP at Start Turn";
  if (improvement === "SAWMILL" && formula === "ADJACENT_FRIENDLY_CONTRIBUTORS")
    return "Sawmill: +1 per adjacent lumber camp";
  if (improvement === "FORGE" && formula === "ADJACENT_FRIENDLY_CONTRIBUTORS")
    return "Forge: +1 per adjacent mine";
  if (improvement === "WORKSHOP" && formula === "DISTINCT_BASIC_TYPES")
    return "Workshop: grows with varied neighbors";
  // Tuning 4 (`pulp_wars-w49.3`): the card states the placement rule.
  return `Market: 1–${MARKET_INCOME_CAP_V7} Coins (1 + adjacent families, max ${MARKET_INCOME_CAP_V7}); ${MARKET_PLACEMENT_TEXT_V7}`;
}
