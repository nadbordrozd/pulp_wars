import type { CoordV7, GameStateV7, UnitStateV7 } from "../../src/engine/index";
import {
  NAVAL_TECHS_V7,
  navalArenaV7,
  navalUnitAtV7,
  patchNavalUnitV7,
} from "./v7-naval-branch";

/**
 * Themed naval branches, the Goblin Scrap Fleet's interface fixtures
 * (`pulp_wars-5ti.16`): small authored straits for static captures of the
 * Fire Raft's Kaboom afloat and of a Dreadnought's death blast in an attack
 * preview. Rows 3 and 7 are Shallow Water, rows 4 to 6 Deep Water; seat 0
 * (the human seat) decides. No match is played: a review mounts the state
 * and selects a unit.
 */
export const GOBLIN_FLEET_UI_V7 = {
  raft: { x: 3, y: 5 },
  dreadnought: { x: 1, y: 4 },
  barrel: { x: 2, y: 6 },
  battleship: { x: 4, y: 5 },
  transport: { x: 4, y: 4 },
} as const satisfies Record<string, CoordV7>;

/** A Goblin fleet with Powder Kegs beside a Human Battleship and transport. */
export function goblinFleetFixtureV7(): GameStateV7 {
  let state = navalArenaV7({
    factions: ["GOBLIN", "ORIGINAL"],
    technologies: [NAVAL_TECHS_V7, NAVAL_TECHS_V7],
    units: [
      { seat: 0, role: "PATROL_BOAT", at: GOBLIN_FLEET_UI_V7.raft },
      { seat: 0, role: "BATTLESHIP", at: GOBLIN_FLEET_UI_V7.dreadnought },
      { seat: 0, role: "SUBMARINE", at: GOBLIN_FLEET_UI_V7.barrel },
      { seat: 1, role: "BATTLESHIP", at: GOBLIN_FLEET_UI_V7.battleship },
      { seat: 1, role: "FIGHTER", at: { x: 1, y: 9 } },
    ],
  });
  const fighter = navalUnitAtV7(state, { x: 1, y: 9 });
  state = patchNavalUnitV7(state, fighter.id, {
    at: GOBLIN_FLEET_UI_V7.transport,
    form: "EMBARKED",
  } satisfies Partial<UnitStateV7>);
  return state;
}

export const DREADNOUGHT_BLAST_UI_V7 = {
  submarine: { x: 3, y: 5 },
  dreadnought: { x: 4, y: 5 },
  boat: { x: 4, y: 4 },
} as const satisfies Record<string, CoordV7>;

/** A Human Submarine beside a Goblin Dreadnought at 9 HP and a Fire Raft. */
export function dreadnoughtBlastFixtureV7(): GameStateV7 {
  let state = navalArenaV7({
    factions: ["ORIGINAL", "GOBLIN"],
    technologies: [NAVAL_TECHS_V7, NAVAL_TECHS_V7],
    units: [
      { seat: 0, role: "SUBMARINE", at: DREADNOUGHT_BLAST_UI_V7.submarine },
      { seat: 1, role: "BATTLESHIP", at: DREADNOUGHT_BLAST_UI_V7.dreadnought },
      { seat: 1, role: "PATROL_BOAT", at: DREADNOUGHT_BLAST_UI_V7.boat },
    ],
  });
  const dreadnought = navalUnitAtV7(state, DREADNOUGHT_BLAST_UI_V7.dreadnought);
  state = patchNavalUnitV7(state, dreadnought.id, { hp: 9 });
  return state;
}
