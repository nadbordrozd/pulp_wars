import {
  AI_HEAD_START_COINS_V7,
  aiHeadStartCoinsV7,
  type AiHeadStartCoinsV7,
  type MatchSetupV7,
} from "../engine/index";

/**
 * AI head start (`pulp_wars-w49.39`): the words of the new-game control and
 * of the read-only line in the match's Settings. Today a head start is
 * extra starting Coins; a further kind adds its own choices beside these.
 */
export const AI_HEAD_START_LABEL_V7 = "AI head start";
export const AI_HEAD_START_HINT_V7 = "Every AI player starts with extra Coins.";

/** The control's values, in order: no head start, then each amount. */
export const AI_HEAD_START_CHOICES_V7: readonly (0 | AiHeadStartCoinsV7)[] =
  Object.freeze([0, ...AI_HEAD_START_COINS_V7]);

/** "None", or "+10 Coins". */
export function aiHeadStartChoiceLabelV7(coins: number): string {
  return coins > 0 ? `+${coins} Coins` : "None";
}

/** The control's option labels by value ("0", "5", "10", "20"). */
export const AI_HEAD_START_CHOICE_LABELS_V7: Readonly<Record<string, string>> =
  Object.freeze(
    Object.fromEntries(
      AI_HEAD_START_CHOICES_V7.map((coins) => [
        String(coins),
        aiHeadStartChoiceLabelV7(coins),
      ]),
    ),
  );

/**
 * What a match was started with, for its Settings; null on the Showcase and
 * on a mission, which have no head start to report.
 */
export function aiHeadStartOfMatchV7(
  setup: Pick<MatchSetupV7, "aiHeadStart" | "mapType">,
): string | null {
  if (setup.mapType === "SHOWCASE" || setup.mapType === "MISSION") return null;
  return aiHeadStartChoiceLabelV7(aiHeadStartCoinsV7(setup));
}
