import {
  FACTION_DISPLAY_NAMES_V7,
  PERFECTION_ROUNDS_V7,
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

/**
 * Section 7, item 4: how stars are earned (section 5.3), in words: the
 * difficulty decides how many stars a win can earn, a high score earns
 * them. No numbers (the thresholds are on the end screen). The glow is
 * never explained.
 */
export function starRulesV7(): readonly string[] {
  return [
    "★ Win.",
    "★★ Win on Hard or harder with a high score.",
    "★★★ Win on Brutal with a great score.",
  ];
}

/** Section 8: "New best for the Goblins in Domination". */
export function starAwardNewBestV7(
  faction: FactionIdV7,
  mode: GameModeV7,
): string {
  return `New best for the ${tribePluralV7(faction)} in ${GAME_MODE_LABELS_V7[mode]}`;
}
