import {
  applyCommandV7,
  queryPlayerCommandsV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type GameStateV7,
  type TechnologyIdV7,
} from "../../src/engine/index";
import { frozenArenaV7 } from "./v7-frozen-sea";
import { navalUnitAtV7 } from "./v7-naval-branch";

/**
 * The frozen sea redesign's interface (bead pulp_wars-5ti.27,
 * docs/product/RULESET_7_ICE_REDESIGN.md section 4): small authored states
 * on the strait of `v7-naval-branch.ts` (rows 0 to 2 land, row 3 Shallow
 * Water, rows 4 to 6 Deep Water; seat 0's capital on (5, 2), seat 1's on
 * (5, 8)). Used by the unit tests and, in the dev server, by the review
 * screenshots. No match is played: the buildings are put up by the
 * engine's own commands on seat 0's first turn.
 */

const NAVAL: readonly TechnologyIdV7[] = [
  "SHORECRAFT",
  "NAVIGATION",
  "NAVAL_ENGINEERING",
  "SEAMANSHIP",
  "SUBMERSIBLES",
];

export const ICE_REDESIGN_UI_V7 = {
  /** Crack Ice: the Human Warrior on the shore, three ice tiles below it. */
  cracker: { x: 2, y: 2 },
  /** Plain ice (thick with Glacier until `pulp_wars-tzk6`, 7r137). */
  west: { x: 1, y: 3 },
  /** Plain ice. */
  middle: { x: 2, y: 3 },
  /**
   * Plain ice (the viewer's own Patrol Boat was frozen in here before the
   * Ice Folk freeze rework, `pulp_wars-s55m.1`: no ship is in the ice).
   */
  east: { x: 3, y: 3 },
  /** The building scene: a Yeti on the shore that Freezes. */
  yeti: { x: 2, y: 2 },
  /** The building scene: another player's ice the Freeze takes. */
  foreign: { x: 2, y: 3 },
  /**
   * The building scene: the Fishing Hole (or the Ice Fortress on it), the
   * Workshop, and a captured dock on open water (an Ice Harbour on the ice
   * until `pulp_wars-tzk6`, 7r137).
   */
  hole: { x: 4, y: 3 },
  workshop: { x: 5, y: 3 },
  harbour: { x: 6, y: 3 },
} as const satisfies Record<string, CoordV7>;

/**
 * Seat 0 is Human (the viewer), seat 1 the Ice Folk that own the plain ice
 * below the Warrior (Glacier's thick, cracked variant went with the naval
 * branch rebuilt, `pulp_wars-tzk6`, 7r137). The Warrior may Crack Ice on
 * all three tiles.
 */
export function iceCrackUiFixtureV7(): GameStateV7 {
  const at = ICE_REDESIGN_UI_V7;
  return frozenArenaV7({
    factions: ["ORIGINAL", "ICE_FOLK"],
    technologies: [NAVAL, ["SHORECRAFT", "NAVIGATION"]],
    ports: [false, false],
    units: [{ seat: 0, role: "FIGHTER", at: at.cracker }],
    ice: [
      { at: at.west, seat: 1 },
      { at: at.middle, seat: 1 },
      { at: at.east, seat: 1 },
      { at: { x: 1, y: 4 }, seat: 1 },
      { at: { x: 2, y: 4 }, seat: 1 },
    ],
  });
}

/**
 * `command` applied for the viewer; a city that grows from it takes the
 * first reward on offer, so the next build is not refused.
 */
function accept(state: GameStateV7, command: CommandV7): GameStateV7 {
  const result = applyCommandV7(state, state.humanPlayerId, command);
  if (!result.accepted)
    throw new Error(`fixture command ${command.kind} rejected`);
  let next = result.state;
  for (;;) {
    const reward = queryPlayerCommandsV7(
      viewForV7(next, next.humanPlayerId),
    ).find((candidate) => candidate.kind === "CHOOSE_CITY_REWARD");
    if (reward === undefined) return next;
    const chosen = applyCommandV7(next, next.humanPlayerId, reward);
    if (!chosen.accepted) throw new Error("fixture reward rejected");
    next = chosen.state;
  }
}

/**
 * Seat 0 is the Ice Folk (the viewer) with every naval node, Crafting and
 * Farming. Two of its capital's Shallow Water tiles are its ice, built on
 * with the engine's commands: a Fishing Hole (`fortress`: raised to an Ice
 * Fortress) and a Workshop beside it; the third holds a dock of the seat on
 * open water (`shipyard`: a Shipyard), as a captured one stays since the
 * naval branch rebuilt (`pulp_wars-tzk6`, 7r137: no Ice Harbour; the Ice
 * Folk build no dock since `pulp_wars-s55m.2`). A Yeti on the west shore
 * stands over the Humans' ice and its own.
 */
export function iceBuildUiFixtureV7(
  options: { readonly shipyard?: boolean; readonly fortress?: boolean } = {},
): GameStateV7 {
  const at = ICE_REDESIGN_UI_V7;
  let state = frozenArenaV7({
    factions: ["ICE_FOLK", "ORIGINAL"],
    technologies: [[...NAVAL, "DRILL", "GATHERING", "FARMING"], ["SHORECRAFT"]],
    ports: [false, false],
    // Ice Folk movement (`pulp_wars-s55m.2`): the Ice Folk build no dock,
    // so the dock is one the seat holds already, as a captured one, on
    // open water.
    improvements: [
      {
        at: at.harbour,
        improvement: options.shipyard === true ? "SHIPYARD" : "PORT",
      },
    ],
    units: [{ seat: 0, role: "FIGHTER", at: at.yeti }],
    ice: [
      { at: at.west, seat: 0 },
      { at: at.foreign, seat: 1 },
      { at: at.hole, seat: 0 },
      { at: at.workshop, seat: 0 },
      { at: { x: 7, y: 3 }, seat: 0 },
    ],
  });
  state = accept(state, { kind: "BUILD_FISHING_HOLE", at: at.hole });
  state = accept(state, { kind: "BUILD_WORKSHOP", at: at.workshop });
  if (options.fortress === true)
    state = accept(state, { kind: "BUILD_ICE_FORTRESS", at: at.hole });
  return state;
}

/** The unit of the fixture on `at`. */
export function iceRedesignUnitIdV7(state: GameStateV7, at: CoordV7): number {
  return navalUnitAtV7(state, at).id;
}
