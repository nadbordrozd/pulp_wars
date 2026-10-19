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
  /** Plain ice (thick with Glacier, and cracked in the thick scene). */
  west: { x: 1, y: 3 },
  /** Plain ice. */
  middle: { x: 2, y: 3 },
  /** The viewer's own Patrol Boat, frozen in (the Help mark). */
  frozenShip: { x: 3, y: 3 },
  /** The building scene: a Yeti on the shore that Freezes. */
  yeti: { x: 2, y: 2 },
  /** The building scene: another player's ice the Freeze takes. */
  foreign: { x: 2, y: 3 },
  /** The building scene: the Fishing Hole, Workshop and Ice Harbour. */
  hole: { x: 4, y: 3 },
  workshop: { x: 5, y: 3 },
  harbour: { x: 6, y: 3 },
} as const satisfies Record<string, CoordV7>;

/**
 * Seat 0 is Human (the viewer), seat 1 the Ice Folk that own the ice below
 * the Warrior: plain ice, or (`thick`) Glacier's thick ice whose west tile
 * has taken one crack. The Warrior may Crack Ice on all three tiles; the
 * east one holds the viewer's own icebound Patrol Boat.
 */
export function iceCrackUiFixtureV7(
  options: { readonly thick?: boolean } = {},
): GameStateV7 {
  const at = ICE_REDESIGN_UI_V7;
  const thick = options.thick ?? false;
  return frozenArenaV7({
    factions: ["ORIGINAL", "ICE_FOLK"],
    technologies: [NAVAL, thick ? NAVAL : ["SHORECRAFT", "NAVIGATION"]],
    ports: [false, false],
    units: [
      { seat: 0, role: "FIGHTER", at: at.cracker },
      { seat: 0, role: "PATROL_BOAT", at: at.frozenShip },
    ],
    ice: [
      { at: at.west, seat: 1, cracked: thick },
      { at: at.middle, seat: 1 },
      { at: at.frozenShip, seat: 1 },
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
 * Seat 0 is the Ice Folk (the viewer) with every naval node (thick ice),
 * Crafting and Farming. Its capital's three Shallow Water tiles are its ice,
 * built on with the engine's commands: a Fishing Hole, a Workshop beside
 * it, and an Ice Harbour (`greatHarbour`: upgraded to the Great Harbour).
 * A Yeti on the west shore stands over the Humans' ice (taken by a
 * Freeze) and its own cracked tile (mended by one).
 */
export function iceBuildUiFixtureV7(
  options: { readonly greatHarbour?: boolean } = {},
): GameStateV7 {
  const at = ICE_REDESIGN_UI_V7;
  let state = frozenArenaV7({
    factions: ["ICE_FOLK", "ORIGINAL"],
    technologies: [[...NAVAL, "DRILL", "GATHERING", "FARMING"], ["SHORECRAFT"]],
    ports: [false, false],
    units: [{ seat: 0, role: "FIGHTER", at: at.yeti }],
    ice: [
      { at: at.west, seat: 0, cracked: true },
      { at: at.foreign, seat: 1 },
      { at: at.hole, seat: 0 },
      { at: at.workshop, seat: 0 },
      { at: at.harbour, seat: 0 },
      { at: { x: 7, y: 3 }, seat: 0 },
    ],
  });
  state = accept(state, { kind: "BUILD_FISHING_HOLE", at: at.hole });
  state = accept(state, { kind: "BUILD_WORKSHOP", at: at.workshop });
  state = accept(state, { kind: "BUILD_PORT", at: at.harbour });
  if (options.greatHarbour === true)
    state = accept(state, { kind: "BUILD_SHIPYARD", at: at.harbour });
  return state;
}

/** The unit of the fixture on `at`. */
export function iceRedesignUnitIdV7(state: GameStateV7, at: CoordV7): number {
  return navalUnitAtV7(state, at).id;
}
