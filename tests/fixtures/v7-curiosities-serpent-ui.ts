import type { GameStateV7, PlayerId } from "../../src/engine/index";
import { checkedV7 } from "./v7-builders";
import { serpentArenaV7 } from "./v7-serpent-arena";

/**
 * The map curiosities round-3 B UI fixture (bead pulp_wars-737.21,
 * docs/product/RULESET_7_CURIOSITIES_ROUND_3.md section 12.1), hand-built
 * on the Serpent's lake (tests/fixtures/v7-serpent-arena.ts: the lake from
 * (1, 5) to (8, 12), the Serpent on its lair at (5, 9); player 1's capital
 * at (9, 15), player 2's at (12, 4)). Player 1, the human, is active and
 * the last seat of the round, so its End Turn runs the neutral turn (the
 * Serpent's bite) and nothing else: the fixture controller plays no AI.
 *
 * - A human Battleship on (8, 11), 3 from the Serpent: it may shell it,
 *   and the preview says the Serpent will strike back (it is in reach).
 * - A human Patrol Boat next to it on (6, 10): the Serpent's likely target,
 *   bitten when the human ends its turn.
 * - A human embarked Fighter (a transport) on (1, 5), outside its reach.
 *
 * The module imports no test runner, so the browser review mounts it
 * through the dev server.
 */
export const SERPENT_UI_V7 = {
  serpent: { x: 5, y: 9 },
  battleship: { x: 8, y: 11 },
  boat: { x: 6, y: 10 },
  transport: { x: 1, y: 5 },
} as const;

const AT = SERPENT_UI_V7;
const P1 = 1 as PlayerId;
const P2 = 2 as PlayerId;

/** The Serpent's board, the human last in the round. */
export function serpentUiFixtureV7(): GameStateV7 {
  const state = serpentArenaV7({
    pieces: [
      { seat: 0, role: "BATTLESHIP", at: AT.battleship, form: "NAVAL" },
      { seat: 0, role: "PATROL_BOAT", at: AT.boat, form: "NAVAL" },
      { seat: 0, role: "FIGHTER", at: AT.transport, form: "EMBARKED" },
    ],
  });
  // Every seat has earned and spent Explorer already, so no reveal opens
  // the achievement dialog over the review.
  return checkedV7({
    ...state,
    turnOrder: [P2, P1],
    activeSeatIndex: 1,
    players: state.players.map((player) => ({
      ...player,
      achievementEntitlements: player.achievementEntitlements.map((entry) =>
        entry.achievement === "EXPLORER"
          ? { ...entry, unlocked: true, spent: true }
          : entry,
      ),
    })),
  });
}
