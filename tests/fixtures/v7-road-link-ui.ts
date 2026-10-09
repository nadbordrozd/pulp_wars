import type { CoordV7, GameStateV7 } from "../../src/engine/index";
import { applyOkV7, seatIdV7, unitAtV7 } from "./v7-goblin-arena";
import { martianUiFieldV7 } from "./v7-martian-ui";

/**
 * Road link fixtures (bead pulp_wars-v56v) on the seed-2 11 x 11 arena of
 * the Martian UI fixtures (seat 0 is the human, an Original seat; its
 * capital (8, 8) with territory x 7-9, y 7-9; the Dwarf capital (2, 8);
 * villages (5, 5), (8, 5), (5, 8)). Every land tile that is not a
 * settlement is open Grass. The human has captured villages and built
 * Roads toward them, one Road tile short of linking them to the capital:
 * building `ROAD_LINK_V7.build` links them. Built through engine commands
 * only, no match is played. The module imports no test runner, so the
 * browser review mounts it through the dev server.
 */
export const ROAD_LINK_V7 = {
  capital: { x: 8, y: 8 },
  /** The village captured in both fixtures. */
  village: { x: 8, y: 5 },
  /** The second village of `roadLinkPairFixtureV7`. */
  second: { x: 5, y: 8 },
  /** `roadLinkFixtureV7`: the Road tile that links the village. */
  build: { x: 8, y: 7 },
  /** `roadLinkPairFixtureV7`: the Road tile that links both villages. */
  junction: { x: 7, y: 7 },
} as const satisfies Record<string, CoordV7>;

function capturedV7(villages: readonly CoordV7[]): GameStateV7 {
  let state = martianUiFieldV7(
    [
      ...villages.map((at) => ({
        seat: 0,
        role: "FIGHTER" as const,
        at,
        captureEligible: true,
      })),
      { seat: 1, role: "FIGHTER" as const, at: { x: 1, y: 1 } },
    ],
    { factions: ["ORIGINAL", "DWARF"] },
  );
  for (const at of villages)
    state = applyOkV7(state, seatIdV7(state, 0), {
      kind: "CAPTURE",
      unitId: unitAtV7(state, at).id,
    }).state;
  return state;
}

function roadsV7(state: GameStateV7, roads: readonly CoordV7[]): GameStateV7 {
  let next = state;
  for (const at of roads)
    next = applyOkV7(next, seatIdV7(next, 0), { kind: "BUILD_ROAD", at }).state;
  return next;
}

/**
 * The village (8, 5) captured and the Road (8, 6) built: a Road on (8, 7)
 * links it to the capital (8, 8).
 */
export function roadLinkFixtureV7(): GameStateV7 {
  return roadsV7(capturedV7([ROAD_LINK_V7.village]), [{ x: 8, y: 6 }]);
}

/**
 * The villages (8, 5) and (5, 8) captured, with the Roads (8, 6) and
 * (6, 8): a Road on (7, 7) links both to the capital at once.
 */
export function roadLinkPairFixtureV7(): GameStateV7 {
  return roadsV7(capturedV7([ROAD_LINK_V7.village, ROAD_LINK_V7.second]), [
    { x: 8, y: 6 },
    { x: 6, y: 8 },
  ]);
}
