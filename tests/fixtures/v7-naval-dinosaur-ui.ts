import type { CoordV7, GameStateV7 } from "../../src/engine/index";
import {
  NAVAL_TECHS_V7,
  navalArenaV7,
  navalUnitAtV7,
  patchNavalUnitV7,
} from "./v7-naval-branch";

/**
 * Themed naval branches, the Dinosaur fleet's interface fixtures
 * (`pulp_wars-5ti.18`): a small authored strait for static captures of the
 * three Dinosaur ships, of a Dugout's Horned Prow preview after a two-tile
 * run, and of an Alpha Plesiosaur's torpedo. Rows 3 and 7 are Shallow
 * Water, rows 4 to 6 Deep Water; seat 0 (the human seat) decides. No match
 * is played: a review mounts the state and selects a unit.
 */
export const DINOSAUR_FLEET_UI_V7 = {
  dugout: { x: 3, y: 5 },
  warRaft: { x: 1, y: 4 },
  plesiosaur: { x: 6, y: 6 },
  boat: { x: 4, y: 5 },
  battleship: { x: 7, y: 6 },
} as const satisfies Record<string, CoordV7>;

/**
 * Horned Prows and the Plesiosaur: a Dugout that has just run two tiles
 * beside a Human Patrol Boat (its Horned Prow sinks it), a War Raft, and an
 * Alpha Plesiosaur (three kills, 20 HP) beside a Human Battleship.
 */
export function dinosaurFleetFixtureV7(): GameStateV7 {
  let state = navalArenaV7({
    factions: ["DINOSAUR", "ORIGINAL"],
    technologies: [NAVAL_TECHS_V7, NAVAL_TECHS_V7],
    units: [
      { seat: 0, role: "PATROL_BOAT", at: DINOSAUR_FLEET_UI_V7.dugout },
      { seat: 0, role: "BATTLESHIP", at: DINOSAUR_FLEET_UI_V7.warRaft },
      { seat: 0, role: "SUBMARINE", at: DINOSAUR_FLEET_UI_V7.plesiosaur },
      { seat: 1, role: "PATROL_BOAT", at: DINOSAUR_FLEET_UI_V7.boat },
      { seat: 1, role: "BATTLESHIP", at: DINOSAUR_FLEET_UI_V7.battleship },
    ],
  });
  const dugout = navalUnitAtV7(state, DINOSAUR_FLEET_UI_V7.dugout);
  state = patchNavalUnitV7(state, dugout.id, {
    activation: { ...dugout.activation, moved: true, movedPathLength: 2 },
  });
  const plesiosaur = navalUnitAtV7(state, DINOSAUR_FLEET_UI_V7.plesiosaur);
  return patchNavalUnitV7(state, plesiosaur.id, {
    kills: 3,
    maxHp: 20,
    hp: 20,
  });
}
