/**
 * Game states for the fitted settlement shadow review (bead
 * pulp_wars-2yc.12, docs/art/SETTLEMENT_SHADOW.md): every faction's city
 * at art levels 1, 2 and 3 on its own ground. Loaded in the browser
 * through the Vite dev server by scripts/art/look-switch-review.ts;
 * nothing here is part of the game build.
 *
 * Each scene is the border scene of the faction grass review with both
 * capitals grown to the level: the Human one on the left, the faction's
 * on the right. Run it with `SWITCH_BEFORE_VALUE=plain`, so "before" is
 * the one shape every settlement had and "after" the fitted shadow.
 */
import type { FactionIdV7, GameStateV7 } from "../../../src/engine/index";
import { borderScene } from "../faction-grass/review-scenes";
import type { LookSwitchShot } from "../look-switch-review";

type Level = 1 | 2 | 3;

function grown(faction: FactionIdV7, level: Level): GameStateV7 {
  const state = borderScene(faction);
  return {
    ...state,
    cities: state.cities.map((city) => ({ ...city, level })),
  };
}

const FACTIONS = [
  ["undead", "UNDEAD"],
  ["goblin", "GOBLIN"],
  ["dinosaur", "DINOSAUR"],
  ["martian", "MARTIAN"],
  ["ice-folk", "ICE_FOLK"],
  ["dwarf", "DWARF"],
  ["candy", "CANDY"],
] as const satisfies readonly (readonly [string, FactionIdV7])[];
const LEVELS = [1, 2, 3] as const;

export const sceneUndead1 = (): GameStateV7 => grown("UNDEAD", 1);
export const sceneUndead2 = (): GameStateV7 => grown("UNDEAD", 2);
export const sceneUndead3 = (): GameStateV7 => grown("UNDEAD", 3);
export const sceneGoblin1 = (): GameStateV7 => grown("GOBLIN", 1);
export const sceneGoblin2 = (): GameStateV7 => grown("GOBLIN", 2);
export const sceneGoblin3 = (): GameStateV7 => grown("GOBLIN", 3);
export const sceneDinosaur1 = (): GameStateV7 => grown("DINOSAUR", 1);
export const sceneDinosaur2 = (): GameStateV7 => grown("DINOSAUR", 2);
export const sceneDinosaur3 = (): GameStateV7 => grown("DINOSAUR", 3);
export const sceneMartian1 = (): GameStateV7 => grown("MARTIAN", 1);
export const sceneMartian2 = (): GameStateV7 => grown("MARTIAN", 2);
export const sceneMartian3 = (): GameStateV7 => grown("MARTIAN", 3);
export const sceneIceFolk1 = (): GameStateV7 => grown("ICE_FOLK", 1);
export const sceneIceFolk2 = (): GameStateV7 => grown("ICE_FOLK", 2);
export const sceneIceFolk3 = (): GameStateV7 => grown("ICE_FOLK", 3);
export const sceneDwarf1 = (): GameStateV7 => grown("DWARF", 1);
export const sceneDwarf2 = (): GameStateV7 => grown("DWARF", 2);
export const sceneDwarf3 = (): GameStateV7 => grown("DWARF", 3);
export const sceneCandy1 = (): GameStateV7 => grown("CANDY", 1);
export const sceneCandy2 = (): GameStateV7 => grown("CANDY", 2);
export const sceneCandy3 = (): GameStateV7 => grown("CANDY", 3);

const sceneName = (faction: FactionIdV7, level: Level): string =>
  `scene${faction
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("")}${level}`;

export const SWITCH_PARAMETER = "city-shadow";

/** The scene on the page at the normal zoom (80 px cells). */
const CROP_NORMAL = [240, 200, 960, 590] as const;
/** The faction's and the Human capital's cells at the normal zoom. */
const FACTION_CITY = [920, 420, 170, 170] as const;
const HUMAN_CITY = [275, 420, 170, 170] as const;
/** The same two cells one zoom step in (120 px cells). */
const CROP_IN = [1020, 400, 240, 240] as const;
const CROP_IN_HUMAN = [60, 400, 240, 240] as const;

/**
 * Per faction and level one shot at the normal zoom (the pair's lower
 * half is the faction's city three times enlarged). The Human city of
 * each level is cut from the Dwarf scenes.
 */
export const REVIEW_SHOTS: readonly LookSwitchShot[] = [
  ...FACTIONS.flatMap(([name, faction]) =>
    LEVELS.map((level): LookSwitchShot => ({
      name: `${name}-${level}`,
      scene: sceneName(faction, level),
      zoomIn: 1,
      crop: CROP_NORMAL,
      zoom: FACTION_CITY,
    })),
  ),
  ...LEVELS.map((level): LookSwitchShot => ({
    name: `human-${level}`,
    scene: sceneName("DWARF", level),
    zoomIn: 1,
    crop: CROP_NORMAL,
    zoom: HUMAN_CITY,
  })),
  ...FACTIONS.flatMap(([name, faction]) =>
    LEVELS.map((level): LookSwitchShot => ({
      name: `${name}-${level}-in`,
      scene: sceneName(faction, level),
      zoomIn: 2,
      crop: CROP_IN,
    })),
  ),
  ...LEVELS.map((level): LookSwitchShot => ({
    name: `human-${level}-in`,
    scene: sceneName("DWARF", level),
    zoomIn: 2,
    crop: CROP_IN_HUMAN,
  })),
];
