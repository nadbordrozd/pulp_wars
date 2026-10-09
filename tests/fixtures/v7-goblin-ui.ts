import {
  applyCommandV7,
  type CoordV7,
  type GameStateV7,
} from "../../src/engine/index";
import { goblinArenaV7 } from "./v7-goblin-arena";
import { checkedV7 } from "./v7-builders";

/**
 * Revision 17 Goblin UI fixtures (pulp_wars-0ao.5) on the seed-2 Dry Land
 * 11×11 Goblin arena (seat 0 is the human; capitals (8, 8) and (2, 8);
 * villages (5, 5), (8, 5), (5, 8)). Every seat has every technology, so a
 * Goblin seat has Plunder.
 */
export const GOBLIN_SHOWCASE_V7 = {
  /** The Kaboom Goblin: its blast hits two own and two enemy units. */
  kaboom: { x: 2, y: 2 },
  /**
   * An own Wolf Rider (a Goblin before `pulp_wars-w49.35`, whose Kaboom of
   * 6 now kills a Goblin's 6 HP): hit by the Kaboom and survives.
   */
  ownGoblin: { x: 1, y: 1 },
  /** Own Rocket Cart at 3 HP: the Kaboom kills it, wave 2 blast. */
  rocketCart: { x: 1, y: 3 },
  enemyFighter: { x: 3, y: 2 },
  /** Enemy Raider at 3 HP: killed by the Kaboom (Plunder +1). */
  enemyRaider: { x: 3, y: 3 },
  /** Enemy Marksman hit by the wave-2 blast. */
  enemyMarksman: { x: 0, y: 4 },
  /** Bomb Chucker two cells from its target; the Goblin next to it. */
  bombChucker: { x: 6, y: 1 },
  bombTarget: { x: 8, y: 1 },
  bombHelper: { x: 8, y: 2 },
  warboss: { x: 4, y: 7 },
  berserkGoblin: { x: 4, y: 9 },
  troll: { x: 7, y: 6 },
  scrapBuggy: { x: 9, y: 4 },
} as const satisfies Readonly<Record<string, CoordV7>>;

/**
 * Goblin (human) vs Human: Kaboom chain, bomb splash, Berserk, Troll.
 * Achievements are unlocked in advance so that command tails emit no
 * achievement notice over the board.
 */
export function goblinShowcaseFixtureV7(): GameStateV7 {
  const at = GOBLIN_SHOWCASE_V7;
  return withAchievementsUnlockedV7(
    goblinArenaV7(
      ["GOBLIN", "ORIGINAL"],
      [
        { seat: 0, role: "FIGHTER", at: at.kaboom },
        { seat: 0, role: "RAIDER", at: at.ownGoblin },
        { seat: 0, role: "CATAPULT", at: at.rocketCart, hp: 3 },
        { seat: 1, role: "FIGHTER", at: at.enemyFighter },
        { seat: 1, role: "RAIDER", at: at.enemyRaider, hp: 3 },
        { seat: 1, role: "MARKSMAN", at: at.enemyMarksman },
        { seat: 0, role: "MARKSMAN", at: at.bombChucker },
        { seat: 1, role: "GUARD", at: at.bombTarget },
        { seat: 0, role: "FIGHTER", at: at.bombHelper },
        { seat: 0, role: "CAPTAIN", at: at.warboss },
        { seat: 0, role: "FIGHTER", at: at.berserkGoblin },
        { seat: 0, role: "JUGGERNAUT", at: at.troll, hp: 30 },
        { seat: 0, role: "KNIGHT", at: at.scrapBuggy },
      ],
    ),
  );
}

function withAchievementsUnlockedV7(state: GameStateV7): GameStateV7 {
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

export const GOBLIN_ATTACK_CHAIN_V7 = {
  /**
   * Human Champion that kills the Bomb Chucker and advances onto it (a
   * Fighter before `pulp_wars-w49.35`: its 12 HP would not survive both
   * blasts, 5 and 7, on the Bomb Chucker's tile).
   */
  attacker: { x: 4, y: 3 },
  /** Enemy Goblin Bomb Chucker at 2 HP: its death blast hits the Guard. */
  bombChucker: { x: 5, y: 3 },
  ownGuard: { x: 5, y: 2 },
  /** Enemy Rocket Cart at 2 HP: the death blast kills it (wave 2). */
  rocketCart: { x: 6, y: 4 },
  ownMarksman: { x: 7, y: 5 },
} as const satisfies Readonly<Record<string, CoordV7>>;

/**
 * Human (human) vs Goblin: a melee kill of an exploding Bomb Chucker whose
 * death blast hits the attacker and an own Guard and sets off a Rocket Cart.
 */
export function goblinAttackChainFixtureV7(): GameStateV7 {
  const at = GOBLIN_ATTACK_CHAIN_V7;
  return withAchievementsUnlockedV7(
    goblinArenaV7(
      ["ORIGINAL", "GOBLIN"],
      [
        { seat: 0, role: "SWORDSMAN", at: at.attacker },
        { seat: 1, role: "MARKSMAN", at: at.bombChucker, hp: 2 },
        { seat: 0, role: "GUARD", at: at.ownGuard },
        { seat: 1, role: "CATAPULT", at: at.rocketCart, hp: 2 },
        { seat: 0, role: "MARKSMAN", at: at.ownMarksman },
      ],
    ),
  );
}

/**
 * Goblin explosions and Berserk (`pulp_wars-w49.36`): the Orc Warboss's
 * Berserk on the seed-2 arena, rows 0 to 4 cleared to Grass so terrain
 * never stops a Move. Two Human Fighters with a one-tile gap between them
 * hold (4, 0) to (6, 4) in their zones of control.
 */
export const GOBLIN_BERSERK_V7 = {
  warboss: { x: 2, y: 3 },
  /** Wolf Rider: Move 2, so 3 Berserk, through the gap at (5, 2). */
  wolfRider: { x: 3, y: 2 },
  /** Goblin: Move 1, so 2 Berserk. */
  goblin: { x: 1, y: 2 },
  bombChucker: { x: 2, y: 5 },
  /** Out of the Warboss's radius: never Berserk. */
  farGoblin: { x: 0, y: 6 },
  enemyNorth: { x: 5, y: 1 },
  enemySouth: { x: 5, y: 3 },
  /** Where the Berserk Wolf Rider passes between the two enemies. */
  gap: { x: 5, y: 2 },
} as const satisfies Readonly<Record<string, CoordV7>>;

/** The Berserk arena before the Warboss calls it (Goblin seat to act). */
export function goblinBerserkFixtureV7(): GameStateV7 {
  const at = GOBLIN_BERSERK_V7;
  const base = goblinArenaV7(
    ["GOBLIN", "ORIGINAL"],
    [
      { seat: 0, role: "CAPTAIN", at: at.warboss },
      { seat: 0, role: "RAIDER", at: at.wolfRider },
      { seat: 0, role: "FIGHTER", at: at.goblin },
      { seat: 0, role: "MARKSMAN", at: at.bombChucker },
      { seat: 0, role: "FIGHTER", at: at.farGoblin },
      { seat: 1, role: "FIGHTER", at: at.enemyNorth },
      { seat: 1, role: "FIGHTER", at: at.enemySouth },
    ],
  );
  return withAchievementsUnlockedV7({
    ...base,
    board: {
      ...base.board,
      tiles: base.board.tiles.map((tile) =>
        tile.at.y <= 4 && tile.site === null
          ? {
              ...tile,
              biome: tile.biome ?? "PLAINS",
              terrain: "GRASS" as const,
              resource: null,
              improvement: null,
              road: false,
              fieldDefense: false,
            }
          : tile,
      ),
    },
  });
}

/** The same arena after the Warboss's Berserk (three units Berserk). */
export function goblinBerserkActiveFixtureV7(): GameStateV7 {
  const state = goblinBerserkFixtureV7();
  const warboss = state.units.find(
    (unit) =>
      unit.at.x === GOBLIN_BERSERK_V7.warboss.x &&
      unit.at.y === GOBLIN_BERSERK_V7.warboss.y,
  );
  if (warboss === undefined) throw new Error("Warboss missing");
  const result = applyCommandV7(state, state.humanPlayerId, {
    kind: "RALLY",
    unitId: warboss.id,
  });
  if (!result.accepted) throw new Error(result.error.code);
  return result.state;
}
