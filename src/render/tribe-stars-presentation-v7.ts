import {
  FACTION_DISPLAY_NAMES_V7,
  PERFECTION_ROUNDS_V7,
  starThresholdsV7,
  type FactionIdV7,
  type GameModeV7,
} from "../engine/index";

/**
 * Words of the play modes and tribe stars
 * (docs/product/RULESET_7_SCORE_AND_STARS.md sections 7 and 8). Pure text,
 * so the setup screen, the end of a match, and the tests share it.
 */
export const GAME_MODE_LABELS_V7: Readonly<Record<GameModeV7, string>> =
  Object.freeze({ DOMINATION: "Domination", PERFECTION: "Perfection" });

/** Section 7, item 1: the line under the mode toggle. */
export function gameModeLineV7(mode: GameModeV7): string {
  return mode === "PERFECTION"
    ? `${PERFECTION_ROUNDS_V7} rounds. The highest score wins.`
    : "Win by taking every rival's last city.";
}

/** The tribe's name in the plural ("the Dwarves", "the Ice Folk"). */
const TRIBE_PLURALS_V7: Readonly<Record<FactionIdV7, string>> = Object.freeze({
  ORIGINAL: "Humans",
  UNDEAD: "Undead",
  GOBLIN: "Goblins",
  DINOSAUR: "Dinosaurs",
  MARTIAN: "Martians",
  ICE_FOLK: "Ice Folk",
  DWARF: "Dwarves",
  CANDY: "Candy",
  CULT: "Cultists",
});

export function tribePluralV7(faction: FactionIdV7): string {
  return TRIBE_PLURALS_V7[faction];
}

/**
 * Section 7, items 2 and 3: a tribe card's accessible name, "Goblin, 2 of
 * 3 stars in Domination", with "flawless" once the glow is earned.
 */
export function tribeCardLabelV7(
  faction: FactionIdV7,
  stars: number,
  glow: boolean,
  mode: GameModeV7,
): string {
  return `${FACTION_DISPLAY_NAMES_V7[faction]}, ${stars} of 3 stars in ${GAME_MODE_LABELS_V7[mode]}${glow ? ", flawless" : ""}`;
}

/** A rating in hundredths without trailing zeros: 150 is "1.5", 200 "2". */
export function ratingMultipleV7(hundredths: number): string {
  const whole = Math.floor(hundredths / 100);
  const rest = hundredths % 100;
  if (rest === 0) return String(whole);
  return `${whole}.${String(rest).padStart(2, "0").replace(/0$/, "")}`;
}

/**
 * Section 7, item 4: how stars are earned for the current opponent count
 * (the thresholds of section 5.2). The glow is never explained.
 */
export function starRulesV7(rivals: number): readonly string[] {
  const { twoStarsHundredths, threeStarsHundredths } = starThresholdsV7(rivals);
  return [
    "★ Win.",
    `★★ Win with ${ratingMultipleV7(twoStarsHundredths)} times the best rival's score.`,
    `★★★ Win with ${ratingMultipleV7(threeStarsHundredths)} times the best rival's score on the hardest difficulty, and in Domination take every rival's last city yourself.`,
  ];
}

/** Section 8: "New best for the Goblins in Domination". */
export function starAwardNewBestV7(
  faction: FactionIdV7,
  mode: GameModeV7,
): string {
  return `New best for the ${tribePluralV7(faction)} in ${GAME_MODE_LABELS_V7[mode]}`;
}
