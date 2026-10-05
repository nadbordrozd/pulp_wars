import type { CoordV7, GameStateV7 } from "../../src/engine/index";
import {
  movedActivationV7,
  navalArenaV7,
  navalUnitAtV7,
  navalUnitV7,
  patchNavalUnitV7,
} from "./v7-naval-branch";

/**
 * The naval branch interface (bead pulp_wars-5ti.7, first part): scenes on
 * the naval arena (`v7-naval-branch.ts`) for the board plan, the dock and
 * the board host. Seat 0 is the viewer and has every Naval technology.
 */
export const NAVAL_UI_V7 = {
  /** Boarding: one boarder, two prizes at 1 HP, one healthy enemy boat. */
  boarder: { x: 5, y: 4 },
  prizes: [
    { x: 4, y: 5 },
    { x: 5, y: 5 },
  ],
  healthy: { x: 6, y: 5 },
  /** Ram: a Patrol Boat that moved, its target and the tile behind it. */
  rammer: { x: 5, y: 4 },
  rammed: { x: 5, y: 5 },
  shoveTo: { x: 5, y: 6 },
  /** Submarine: an enemy Submarine, a far Battleship, an adjacent boat. */
  enemySubmarine: { x: 5, y: 5 },
  farBattleship: { x: 5, y: 3 },
  adjacentBoat: { x: 4, y: 4 },
  /** Torpedo: an own Submarine beside an enemy boat and an enemy on land. */
  ownSubmarine: { x: 4, y: 7 },
  torpedoed: { x: 3, y: 7 },
  ashore: { x: 4, y: 8 },
} as const satisfies Record<string, CoordV7 | readonly CoordV7[]>;

/** A Patrol Boat beside two enemy Patrol Boats at 1 HP and a healthy one. */
export function navalBoardingUiFixtureV7(): GameStateV7 {
  let state = navalArenaV7({
    units: [
      { seat: 0, role: "PATROL_BOAT", at: NAVAL_UI_V7.boarder },
      ...NAVAL_UI_V7.prizes.map((at) => ({
        seat: 1 as const,
        role: "PATROL_BOAT" as const,
        at,
      })),
      { seat: 1, role: "PATROL_BOAT", at: NAVAL_UI_V7.healthy },
    ],
  });
  for (const at of NAVAL_UI_V7.prizes)
    state = patchNavalUnitV7(state, navalUnitAtV7(state, at).id, { hp: 1 });
  return state;
}

/**
 * A Patrol Boat that moved this turn next to an enemy Patrol Boat on Deep
 * Water: its ram shoves the target onto the tile behind it, or, with
 * `blocked`, cannot (another boat stands there).
 */
export function navalRamUiFixtureV7(blocked = false): GameStateV7 {
  const state = navalArenaV7({
    units: [
      { seat: 0, role: "PATROL_BOAT", at: NAVAL_UI_V7.rammer },
      { seat: 1, role: "PATROL_BOAT", at: NAVAL_UI_V7.rammed },
      ...(blocked
        ? [
            {
              seat: 1 as const,
              role: "PATROL_BOAT" as const,
              at: NAVAL_UI_V7.shoveTo,
            },
          ]
        : []),
    ],
  });
  const rammer = navalUnitAtV7(state, NAVAL_UI_V7.rammer);
  return patchNavalUnitV7(state, rammer.id, {
    activation: movedActivationV7(navalUnitV7(state, rammer.id)),
  });
}

/**
 * An enemy Submarine with an own Battleship two tiles away (which cannot
 * target it) and an own Patrol Boat next to it (which can); and an own
 * Submarine beside an enemy Patrol Boat and an enemy Fighter on the shore.
 */
export function navalSubmarineUiFixtureV7(): GameStateV7 {
  return navalArenaV7({
    units: [
      { seat: 1, role: "SUBMARINE", at: NAVAL_UI_V7.enemySubmarine },
      { seat: 0, role: "BATTLESHIP", at: NAVAL_UI_V7.farBattleship },
      { seat: 0, role: "PATROL_BOAT", at: NAVAL_UI_V7.adjacentBoat },
      { seat: 0, role: "SUBMARINE", at: NAVAL_UI_V7.ownSubmarine },
      { seat: 1, role: "PATROL_BOAT", at: NAVAL_UI_V7.torpedoed },
      { seat: 1, role: "FIGHTER", at: NAVAL_UI_V7.ashore },
    ],
  });
}

/**
 * Harbours: seat 0 with (or, `harbours: false`, without) Submersibles, and
 * with its Port built or still to build.
 */
export function navalHarboursUiFixtureV7(
  options: { readonly harbours?: boolean; readonly port?: boolean } = {},
): GameStateV7 {
  return navalArenaV7({
    technologies: [
      options.harbours === false
        ? ["SHORECRAFT", "NAVIGATION", "NAVAL_ENGINEERING", "SEAMANSHIP"]
        : [
            "SHORECRAFT",
            "NAVIGATION",
            "NAVAL_ENGINEERING",
            "SEAMANSHIP",
            "SUBMERSIBLES",
          ],
      ["SHORECRAFT"],
    ],
    ports: [options.port !== false, true],
    units: [],
  });
}
