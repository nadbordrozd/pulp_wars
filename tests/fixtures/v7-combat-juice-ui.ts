import type { CoordV7, GameStateV7 } from "../../src/engine/index";
import { checkedV7 } from "./v7-builders";
import { goblinArenaV7 } from "./v7-goblin-arena";

/**
 * Combat juice review scenes (bead pulp_wars-2yc.80): a Human (seat 0, the
 * viewer) vs Goblin arena on the seed-2 Dry Land 11×11 board (capitals
 * (8, 8) and (2, 8); villages (5, 5), (8, 5), (5, 8)). No match is played:
 * the review gives one command at a time.
 */
export const COMBAT_JUICE_UI_V7 = {
  /** The Knight kills the wounded Goblin beside it (and advances). */
  knight: { x: 5, y: 2 },
  knightVictim: { x: 6, y: 2 },
  /** The Fighter hits the Goblin Guard, which hits back. */
  fighter: { x: 2, y: 4 },
  goblinGuard: { x: 3, y: 4 },
  /** The Goblin turn: the Bomb Chucker's bomb and its splash. */
  bombChucker: { x: 7, y: 3 },
  bombTarget: { x: 9, y: 3 },
  bombSplash: { x: 9, y: 2 },
  /** The Human capital, empty, with Coins to train. */
  capital: { x: 8, y: 8 },
} as const satisfies Readonly<Record<string, CoordV7>>;

function arena(activeSeat: 0 | 1): GameStateV7 {
  const at = COMBAT_JUICE_UI_V7;
  const state = goblinArenaV7(
    ["ORIGINAL", "GOBLIN"],
    [
      { seat: 0, role: "KNIGHT", at: at.knight },
      { seat: 1, role: "FIGHTER", at: at.knightVictim, hp: 3 },
      { seat: 0, role: "FIGHTER", at: at.fighter },
      { seat: 1, role: "GUARD", at: at.goblinGuard },
      { seat: 1, role: "MARKSMAN", at: at.bombChucker },
      { seat: 0, role: "GUARD", at: at.bombTarget },
      { seat: 0, role: "FIGHTER", at: at.bombSplash },
    ],
    { activeSeat },
  );
  // Achievements are unlocked in advance, so no notice covers the board;
  // the pieces have no home city, so the capital has room to train.
  return checkedV7({
    ...state,
    units: state.units.map((unit) => ({ ...unit, homeCityId: null })),
    players: state.players.map((player) => ({
      ...player,
      achievementEntitlements: player.achievementEntitlements.map(
        (entitlement) => ({ ...entitlement, unlocked: true }),
      ),
    })),
  });
}

/** The Human's turn: the Knight's kill, the Fighter's trade, training. */
export function combatJuiceFixtureV7(): GameStateV7 {
  return arena(0);
}

/** The Goblin's turn, seen by the Human: the Bomb Chucker's shot. */
export function combatJuiceEnemyTurnFixtureV7(): GameStateV7 {
  return arena(1);
}
