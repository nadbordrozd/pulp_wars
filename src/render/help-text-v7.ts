/**
 * Help (bead pulp_wars-2yc.39): the whole of "How to play", short enough to
 * read in about two minutes. It is the same for every match and every
 * faction: no faction sections, no cost or damage formula, no tables. What
 * a unit does is in its "?" and in the Gallery; the full rules stay in
 * docs/product/RULESET_7_CURRENT.md, outside the game.
 *
 * `tests/unit/help-text-ui-v7.test.ts` holds the length and the wording.
 */
export type HelpIconV7 =
  | "trophy"
  | "move"
  | "population"
  | "coin"
  | "tech"
  | "attack"
  | "sight"
  | "info";

export interface HelpSectionV7 {
  readonly id: string;
  readonly title: string;
  readonly icon: HelpIconV7;
  readonly lines: readonly string[];
}

export const HELP_SECTIONS_V7: readonly HelpSectionV7[] = [
  {
    id: "goal",
    title: "The goal",
    icon: "trophy",
    lines: [
      "Capture every enemy city. A player with no city left is out.",
      "More cities mean more Coins, and more Coins mean a bigger army.",
    ],
  },
  {
    id: "turn",
    title: "Your turn",
    icon: "move",
    lines: [
      "Tap a unit, then tap a highlighted tile to move, attack or help.",
      "A unit moves, then acts once. A bright ring under it means it can still move.",
      "Tap your city to train a unit. Each city trains once a turn.",
      "End the turn when you are done. A unit that did nothing rests and heals.",
    ],
  },
  {
    id: "cities",
    title: "Cities",
    icon: "population",
    lines: [
      "A city owns the land inside its borders.",
      "Harvest and build there to add population. Enough population raises the city's level.",
      "Each level brings a reward to choose, room for one more unit, and more Coins every turn.",
      "A big city can choose a free giant unit or a pile of Coins at every new level.",
      "To take a village or an enemy city, stand a unit on it. On your next turn it can capture.",
    ],
  },
  {
    id: "resources",
    title: "Resources and buildings",
    icon: "coin",
    lines: [
      "Tap a tile inside your borders to see what you can do with it.",
      "Harvesting fruit, game and fish, and building farms, lumber camps and mines, costs Coins and adds population.",
      "Each one needs a technology first. The tile tells you which.",
      "Mills, forges and markets pay best when built among the right neighbours.",
    ],
  },
  {
    id: "technology",
    title: "Technology",
    icon: "tech",
    lines: [
      "Your first technology is free. Later ones cost Coins, and more for every city you own.",
      "Five branches: Settlement, Wilds, Mobility, Industry and Naval. Pick what your land rewards.",
      "New units, buildings and abilities all come from technology.",
    ],
  },
  {
    id: "fighting",
    title: "Fighting",
    icon: "attack",
    lines: [
      "Attack an enemy in range. If it survives and can reach you, it hits back.",
      "A wounded unit hits weaker. Units heal fastest resting in their own land.",
      "Mountains, City Walls and Field Defense protect the unit standing on them.",
      "Ranged units strike from a distance, and a unit that cannot reach them cannot hit back.",
      "Three kills earn a promotion: more health and a full heal.",
    ],
  },
  {
    id: "fog",
    title: "Fog and exploring",
    icon: "sight",
    lines: [
      "The map starts hidden. Your units reveal what they see as they move.",
      "Look for villages early: each one you capture becomes a new city.",
      "Walk onto a treasure chest for Coins or a free unit.",
    ],
  },
  {
    id: "more",
    title: "Units and factions",
    icon: "info",
    lines: [
      "Every faction has its own units and tricks. Tap ? on a unit, or open the Gallery, to read what each can do.",
    ],
  },
];

/** The keys of a match, shown under the sections. */
export const HELP_KEYS_V7: readonly (readonly [string, string])[] = [
  ["Arrows", "Move cursor"],
  ["Enter", "Select"],
  ["Tab", "Next target"],
  ["Esc", "Deselect"],
  ["E", "End turn"],
  ["T", "Technology"],
  ["G", "Leaderboard"],
  ["+ / −", "Zoom"],
];

/** Every word of the Help's sections, for the length test. */
export function helpWordCountV7(): number {
  return HELP_SECTIONS_V7.flatMap((section) => [
    section.title,
    ...section.lines,
  ])
    .join(" ")
    .split(/\s+/)
    .filter((word) => word !== "").length;
}
