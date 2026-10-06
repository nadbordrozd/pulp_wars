import { MARKET_INCOME_CAP_V7 } from "../engine/index";

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
