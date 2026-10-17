import type { CoordV7, GameStateV7 } from "../../src/engine/index";
import {
  NAVAL_TECHS_V7,
  navalArenaV7,
  navalUnitAtV7,
  patchNavalUnitV7,
} from "./v7-naval-branch";

/**
 * Themed naval branches, the Undead Drowned Fleet's interface fixtures
 * (`pulp_wars-5ti.17`): a small authored strait for static captures of the
 * three Undead ships and of a Sunken Galley's attack preview that raises a
 * Ghost Ship. Rows 3 and 7 are Shallow Water, rows 4 to 6 Deep Water; seat
 * 0 (the human seat) decides. No match is played: a review mounts the
 * state and selects a unit.
 */
export const UNDEAD_FLEET_UI_V7 = {
  ghostShip: { x: 2, y: 6 },
  galleon: { x: 1, y: 4 },
  galley: { x: 4, y: 5 },
  boat: { x: 4, y: 4 },
  battleship: { x: 7, y: 5 },
} as const satisfies Record<string, CoordV7>;

/**
 * The Drowned Fleet with Drowned Crews and Pestilence: a Ghost Ship, a
 * Plague Galleon and a Sunken Galley, beside a Human Patrol Boat (that the
 * Galley's torpedo sinks and raises) and a Human Battleship.
 */
export function undeadFleetFixtureV7(): GameStateV7 {
  const state = navalArenaV7({
    factions: ["UNDEAD", "ORIGINAL"],
    technologies: [
      [...NAVAL_TECHS_V7, "DRILL", "FORTIFICATION", "EXPLOSIVES"],
      NAVAL_TECHS_V7,
    ],
    units: [
      { seat: 0, role: "PATROL_BOAT", at: UNDEAD_FLEET_UI_V7.ghostShip },
      { seat: 0, role: "BATTLESHIP", at: UNDEAD_FLEET_UI_V7.galleon },
      { seat: 0, role: "SUBMARINE", at: UNDEAD_FLEET_UI_V7.galley },
      { seat: 1, role: "PATROL_BOAT", at: UNDEAD_FLEET_UI_V7.boat },
      { seat: 1, role: "BATTLESHIP", at: UNDEAD_FLEET_UI_V7.battleship },
    ],
  });
  // A risen Ghost Ship at half HP, to show the 5-HP crew afloat.
  const ghost = navalUnitAtV7(state, UNDEAD_FLEET_UI_V7.ghostShip);
  return patchNavalUnitV7(state, ghost.id, { hp: 5, homeCityId: null });
}
