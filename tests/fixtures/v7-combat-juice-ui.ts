import {
  nextBounded,
  type CommandV7,
  type CoordV7,
  type GameStateV7,
} from "../../src/engine/index";
import { checkedV7 } from "./v7-builders";
import { rewardStateV7 } from "./v7-dinosaur-arena";
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

/**
 * Bead pulp_wars-b9mc: units gained from a city's reward and from a
 * treasure chest drop in like a trained one. The reward scene is the
 * Human capital (8, 8) at level 6 with the giant on offer and a Guard on
 * the center, which the giant pushes to (7, 7); the chest scenes put a
 * Fighter at (5, 2) beside a chest at (5, 3), on a PRNG state whose next
 * draw gives the chest's unit, not Coins.
 */
export const COMBAT_JUICE_REWARD_UI_V7 = {
  capital: { x: 8, y: 8 },
  pushedTo: { x: 7, y: 7 },
  chestMover: { x: 5, y: 2 },
  chest: { x: 5, y: 3 },
} as const satisfies Readonly<Record<string, CoordV7>>;

/** The Human capital's level-6 reward, the giant, with its Guard pushed. */
export function combatJuiceRewardFixtureV7(): GameStateV7 {
  const fixture = rewardStateV7("JUGGERNAUT", "ORIGINAL", [
    { role: "GUARD", at: COMBAT_JUICE_REWARD_UI_V7.capital },
  ]);
  return unlocked(fixture.state);
}

/** The reward command of `combatJuiceRewardFixtureV7`. */
export function combatJuiceRewardCommandV7(
  state: GameStateV7,
): Extract<CommandV7, { kind: "CHOOSE_CITY_REWARD" }> {
  const choice = state.pendingChoices.find(
    (candidate) => candidate.kind === "CITY_REWARD",
  );
  if (choice?.kind !== "CITY_REWARD") throw new Error("no reward pending");
  return {
    kind: "CHOOSE_CITY_REWARD",
    cityId: choice.cityId,
    reachedLevel: choice.reachedLevel,
    reward: "JUGGERNAUT",
  };
}

/**
 * A chest beside a Fighter of `seat` (0, the Human's turn; 1, the
 * Goblin's, seen by the Human), on a draw that gives a unit.
 */
export function combatJuiceChestFixtureV7(seat: 0 | 1 = 0): GameStateV7 {
  const at = COMBAT_JUICE_REWARD_UI_V7;
  let seed = 0;
  while (
    nextBounded({ algorithm: "MULBERRY32", version: 1, state: seed }, 2)
      .value !== 1
  )
    seed += 1;
  const arena = goblinArenaV7(
    ["ORIGINAL", "GOBLIN"],
    [
      { seat, role: "FIGHTER", at: at.chestMover },
      { seat: seat === 0 ? 1 : 0, role: "FIGHTER", at: { x: 1, y: 1 } },
    ],
    { activeSeat: seat },
  );
  return unlocked(
    checkedV7({
      ...arena,
      board: {
        ...arena.board,
        tiles: arena.board.tiles.map((tile) =>
          tile.at.x === at.chest.x && tile.at.y === at.chest.y
            ? {
                ...tile,
                terrain: "GRASS" as const,
                biome: "PLAINS" as const,
                resource: null,
                improvement: null,
              }
            : tile,
        ),
      },
      random: { ...arena.random, state: seed },
      treasureChests: [at.chest],
    }),
  );
}

/** Achievements unlocked in advance, so no notice covers the board. */
function unlocked(state: GameStateV7): GameStateV7 {
  return checkedV7({
    ...state,
    players: state.players.map((player) => ({
      ...player,
      achievementEntitlements: player.achievementEntitlements.map(
        (entitlement) => ({ ...entitlement, unlocked: true }),
      ),
    })),
  });
}
