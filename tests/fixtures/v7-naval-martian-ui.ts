import type { CoordV7, GameStateV7 } from "../../src/engine/index";
import {
  NAVAL_TECHS_V7,
  navalArenaV7,
  navalUnitAtV7,
  patchNavalUnitV7,
} from "./v7-naval-branch";

/**
 * Themed naval branches, the Martian Hover Fleet's interface fixtures
 * (`pulp_wars-5ti.19`): a small authored strait for static captures of the
 * three shielded Martian ships, of a Skimmer's Ram preview, and of a Grunt's
 * shore launch (Hover Pods). Rows 3 and 7 are Shallow Water, rows 4 to 6
 * Deep Water; seat 0 (the human seat) decides. No match is played: a review
 * mounts the state and selects a unit.
 */
export const MARTIAN_FLEET_UI_V7 = {
  skimmer: { x: 3, y: 5 },
  cruiser: { x: 1, y: 4 },
  bathysphere: { x: 6, y: 6 },
  boat: { x: 4, y: 5 },
  battleship: { x: 7, y: 6 },
  grunt: { x: 2, y: 2 },
  launch: { x: 2, y: 3 },
  saucer: { x: 7, y: 2 },
} as const satisfies Record<string, CoordV7>;

/**
 * The Hover Fleet: a Skimmer that has just moved beside a Human Patrol Boat
 * (its Ram, with its Shield taking 2 of the reply), a Hover Cruiser, and a
 * Bathysphere beside a Human Battleship; every hull with its Shield.
 */
export function martianFleetFixtureV7(): GameStateV7 {
  const state = navalArenaV7({
    factions: ["MARTIAN", "ORIGINAL"],
    technologies: [NAVAL_TECHS_V7, NAVAL_TECHS_V7],
    units: [
      { seat: 0, role: "PATROL_BOAT", at: MARTIAN_FLEET_UI_V7.skimmer },
      { seat: 0, role: "BATTLESHIP", at: MARTIAN_FLEET_UI_V7.cruiser },
      { seat: 0, role: "SUBMARINE", at: MARTIAN_FLEET_UI_V7.bathysphere },
      { seat: 1, role: "PATROL_BOAT", at: MARTIAN_FLEET_UI_V7.boat },
      { seat: 1, role: "BATTLESHIP", at: MARTIAN_FLEET_UI_V7.battleship },
    ],
  });
  const skimmer = navalUnitAtV7(state, MARTIAN_FLEET_UI_V7.skimmer);
  return patchNavalUnitV7(state, skimmer.id, {
    activation: { ...skimmer.activation, moved: true, movedPathLength: 1 },
  });
}

/**
 * Hover Pods: a Grunt on a beach with no Port (its launch tiles are the
 * three Shallow Water tiles beside it) and a Saucer (a machine, whose own
 * Launch is unchanged).
 */
export function martianHoverLaunchFixtureV7(): GameStateV7 {
  return navalArenaV7({
    factions: ["MARTIAN", "ORIGINAL"],
    technologies: [NAVAL_TECHS_V7, NAVAL_TECHS_V7],
    ports: [false, true],
    units: [
      { seat: 0, role: "FIGHTER", at: MARTIAN_FLEET_UI_V7.grunt },
      { seat: 0, role: "RAIDER", at: MARTIAN_FLEET_UI_V7.saucer },
      { seat: 1, role: "PATROL_BOAT", at: { x: 8, y: 6 } },
    ],
  });
}
