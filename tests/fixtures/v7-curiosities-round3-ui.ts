import type { GameStateV7, PlayerId } from "../../src/engine/index";
import { checkedV7 } from "./v7-builders";
import { round2ArenaV7 } from "./v7-round2-arena";

/**
 * The map curiosities round-3 UI fixture (bead pulp_wars-737.20,
 * docs/product/RULESET_7_CURIOSITIES_ROUND_3.md section 12.1), hand-built
 * on the open 20 x 20 arena (tests/fixtures/v7-round2-arena.ts: player 1's
 * capital at (9, 15), player 2's at (12, 4); player 1, the human, is
 * active). Nothing here plays a turn: the review and the DOM tests select,
 * preview and send the human's own commands only.
 *
 * - The Tesla Tower on (9, 9) with a human Fighter on it, player 2's Guard
 *   2 tiles away (a zap target) and player 2's wounded Fighter next to it
 *   (a zap kill).
 * - The Moon Gun on (4, 10) with a human Knight on it (loaded).
 * - The Gold Claim on (15, 10), staked by player 2 with 18 Coins left, and
 *   a human Fighter next to it (its Move there is labelled Stake).
 * - The Lost Expedition on (4, 4), unfound, and a human Raider next to it
 *   (its Move there is labelled Find).
 *
 * The module imports no test runner, so the browser review mounts it
 * through the dev server.
 */
export const ROUND3_UI_V7 = {
  tower: { x: 9, y: 9 },
  gunner: { x: 9, y: 9 },
  guard: { x: 9, y: 11 },
  wounded: { x: 10, y: 8 },
  gun: { x: 4, y: 10 },
  knight: { x: 4, y: 10 },
  claim: { x: 15, y: 10 },
  prospector: { x: 15, y: 11 },
  expedition: { x: 4, y: 4 },
  explorer: { x: 5, y: 5 },
} as const;

const AT = ROUND3_UI_V7;
const P2 = 2 as PlayerId;

/** The round-3 board: the Tower, the Gun, the Claim and the Expedition. */
export function round3UiFixtureV7(): GameStateV7 {
  const state = round2ArenaV7({
    pieces: [
      { seat: 0, role: "FIGHTER", at: AT.gunner },
      { seat: 1, role: "GUARD", at: AT.guard },
      { seat: 1, role: "FIGHTER", at: AT.wounded, hp: 3 },
      { seat: 0, role: "KNIGHT", at: AT.knight },
      { seat: 0, role: "FIGHTER", at: AT.prospector },
      { seat: 0, role: "RAIDER", at: AT.explorer },
    ],
    curiosities: [
      { kind: "TESLA_TOWER", at: AT.tower },
      { kind: "MOON_GUN", at: AT.gun, lastFired: null },
      { kind: "GOLD_CLAIM", at: AT.claim, ownerId: P2, left: 18 },
      { kind: "LOST_EXPEDITION", at: AT.expedition, foundBy: null },
    ],
    // A short list, so the Expedition's notes have technologies to pay for.
    techs: { 0: ["GATHERING", "HUNTING", "SCOUTING", "RAIDING", "CHIVALRY"] },
  });
  // Every seat has earned and spent Explorer already, so a landing's or a
  // find's reveal never opens the achievement dialog over the review.
  return checkedV7({
    ...state,
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
