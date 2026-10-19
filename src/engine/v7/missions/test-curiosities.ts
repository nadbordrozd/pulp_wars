import { TEST_GROUNDS_V7 } from "./test-grounds";
import type { MissionDefinitionV7 } from "./types";

/**
 * `TEST_CURIOSITIES` (`pulp_wars-hmyk.14`): the hidden fixture of mission
 * curiosities (docs/product/SAGA.md section 4, E1; CAMPAIGN.md section
 * 10.9). The TEST_GROUNDS board with one hand-placed curiosity of most
 * kinds, on an 11 x 11 board below every generator width and next to the
 * settlements, where map generation would place none: the round-3 Tesla
 * Tower, Moon Gun, Gold Claim and Lost Expedition, the round-2 Wishing Well
 * and a pair of Dimensional Gates, the round-1 Fountain and Shrine, and the
 * Giant Spider. The Tesla Tower stands 2 from the Undead Marksman on its
 * second city, so a unit put on it may zap.
 */
export const TEST_CURIOSITIES_V7: MissionDefinitionV7 = {
  ...TEST_GROUNDS_V7,
  id: "TEST_CURIOSITIES",
  revision: 1,
  curiosities: [
    { kind: "TESLA_TOWER", at: { x: 5, y: 8 } },
    { kind: "MOON_GUN", at: { x: 4, y: 4 } },
    { kind: "GOLD_CLAIM", at: { x: 3, y: 6 } },
    { kind: "LOST_EXPEDITION", at: { x: 6, y: 6 } },
    { kind: "WISHING_WELL", at: { x: 8, y: 6 } },
    { kind: "SHRINE", at: { x: 4, y: 9 } },
    { kind: "FOUNTAIN", at: { x: 6, y: 4 } },
    { kind: "GATES", at: { x: 3, y: 2 }, partner: { x: 8, y: 9 } },
    { kind: "MONSTER", at: { x: 8, y: 5 } },
  ],
};
