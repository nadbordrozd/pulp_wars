import type { CoordV7, GameStateV7 } from "../../src/engine/index";
import { cultFieldV7, withFarmsV7, withFavourV7 } from "./v7-cult";
import { at, fieldV7 } from "./v7-revision20";

/**
 * Scenes for the Cult interface (bead `pulp_wars-mch9.17`,
 * docs/ui/BOARD_TARGETING.md section 3.7), on the two-seat field of
 * `cultFieldV7`. The Cult is hidden from setup, so the DOM tests and the
 * review captures (`scripts/browser-cult-review-v7.ts`) mount these states.
 */
export const CULT_UI_V7 = {
  summoner: at(5, 2),
  /** Own units next to the Summoner: the Thing (12) and an Initiate (2). */
  thing: at(4, 1),
  initiate: at(6, 2),
  /** The Initiate that holds the Knight down (not next to the Summoner). */
  holder: at(6, 4),
  /** A broken Human Knight (5 HP) next to the Summoner and the holder. */
  knight: at(5, 3),
  /** A healthy Human Fighter next to the Summoner. */
  fighter: at(4, 3),
} as const satisfies Readonly<Record<string, CoordV7>>;

/**
 * The Cult player (seat 0, the human) to move: a Summoner with two own
 * units beside it to Sacrifice (the Thing in the Cellar for 12 Favour, an
 * Initiate for 2), a broken Knight beside it that a second Initiate holds
 * (a Seizure for 18), and a healthy Fighter it cannot Seize. Its capital is
 * level 2 with 2 population (one Offering), and it has 7 Favour.
 */
export function cultFavourUiFixtureV7(): GameStateV7 {
  return withFavourV7(
    withFarmsV7(
      cultFieldV7([
        { seat: 0, role: "CAPTAIN", at: CULT_UI_V7.summoner },
        { seat: 0, role: "JUGGERNAUT", at: CULT_UI_V7.thing },
        { seat: 0, role: "FIGHTER", at: CULT_UI_V7.initiate },
        { seat: 0, role: "FIGHTER", at: CULT_UI_V7.holder },
        { seat: 1, role: "KNIGHT", at: CULT_UI_V7.knight, hp: 5 },
        { seat: 1, role: "FIGHTER", at: CULT_UI_V7.fighter },
      ]),
      0,
      2,
    ),
    0,
    7,
  );
}

/**
 * A Human player (seat 0) facing a Cult seat with 11 Favour: the viewer has
 * no Favour chip, and the leaderboard shows the Cult's.
 */
export function cultRivalUiFixtureV7(): GameStateV7 {
  return withFavourV7(
    fieldV7(
      [
        { seat: 0, role: "FIGHTER", at: at(5, 2) },
        { seat: 1, role: "CAPTAIN", at: at(5, 4) },
      ],
      { factions: ["ORIGINAL", "CULT"] },
    ),
    1,
    11,
  );
}
