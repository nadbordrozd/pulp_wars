import type { CoordV7, GameStateV7 } from "../../src/engine/index";
import { checkedV7 } from "./v7-builders";
import { MONSTER_LAIR_V7, monsterArenaV7 } from "./v7-monster-arena";

/**
 * The map curiosities UI fixture (bead pulp_wars-737.6) on the four-seat
 * 16 x 16 monster arena (capitals (4, 4), (13, 4), (4, 13), (13, 13);
 * villages (7, 4), (10, 4), (4, 7), (4, 10), (10, 10), (13, 10)). The
 * human (seat 0, player 1) acts **last** in the round, so its End Turn
 * runs the neutral turn and then the next seat's Start Turn:
 *
 * - the Giant Spider on its lair (7, 7), with a wounded human Fighter next
 *   to it (it is provoked and attacks that Fighter in the neutral turn);
 * - a Shrine on the Forest tile (7, 11), one step from a human Fighter;
 * - a Sunken Wreck on the water tile (1, 7), one step from a human Patrol
 *   Boat;
 * - a Fountain of Youth on (10, 7) with a wounded Caveman of the next seat
 *   standing on it (healed at that seat's Start Turn);
 * - a human Knight two tiles from the Spider, whose Moves next to it carry
 *   the provoke warning.
 *
 * The module imports no test runner, so the browser review and the smoke
 * mount it through the dev server.
 */
export const CURIOSITIES_UI_V7 = {
  lair: MONSTER_LAIR_V7,
  spider: MONSTER_LAIR_V7,
  bait: { x: 8, y: 6 },
  knight: { x: 9, y: 9 },
  fountain: { x: 10, y: 7 },
  bather: { x: 10, y: 7 },
  shrine: { x: 7, y: 11 },
  pilgrim: { x: 6, y: 11 },
  wreck: { x: 1, y: 7 },
  boat: { x: 1, y: 8 },
  water: [
    { x: 0, y: 6 },
    { x: 1, y: 6 },
    { x: 0, y: 7 },
    { x: 1, y: 7 },
    { x: 0, y: 8 },
    { x: 1, y: 8 },
    { x: 0, y: 9 },
    { x: 1, y: 9 },
  ],
} as const;

const same = (left: CoordV7, right: CoordV7): boolean =>
  left.x === right.x && left.y === right.y;

/** `spiderHp` wounds the Spider (it then regenerates in the neutral turn). */
export function curiositiesUiFixtureV7(
  options: { readonly spiderHp?: number } = {},
): GameStateV7 {
  const at = CURIOSITIES_UI_V7;
  const base = monsterArenaV7(
    [
      { seat: 0, role: "FIGHTER", at: at.bait, hp: 9 },
      { seat: 0, role: "KNIGHT", at: at.knight },
      { seat: 0, role: "FIGHTER", at: at.pilgrim },
      { seat: 0, role: "PATROL_BOAT", at: at.boat, form: "NAVAL" },
      { seat: 3, role: "FIGHTER", at: at.bather, hp: 3 },
    ],
    {
      water: at.water,
      grass: [at.fountain, { x: 8, y: 7 }, { x: 7, y: 8 }, { x: 8, y: 8 }],
      ...(options.spiderHp === undefined
        ? {}
        : { monsterHp: options.spiderHp }),
    },
  );
  const human = base.humanPlayerId;
  const turnOrder = [...base.turnOrder.filter((id) => id !== human), human];
  return checkedV7({
    ...base,
    turnOrder,
    activeSeatIndex: turnOrder.indexOf(human),
    curiosities: [
      { kind: "WRECK" as const, at: at.wreck },
      { kind: "FOUNTAIN" as const, at: at.fountain },
      { kind: "SHRINE" as const, at: at.shrine },
    ].sort((a, b) => a.at.y - b.at.y || a.at.x - b.at.x),
    treasureChests: base.treasureChests.filter(
      (chest) => !same(chest, at.shrine) && !same(chest, at.wreck),
    ),
    board: {
      ...base.board,
      tiles: base.board.tiles.map((tile) =>
        same(tile.at, at.shrine)
          ? {
              ...tile,
              biome: "WOODLAND" as const,
              terrain: "FOREST" as const,
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

/** The Spider wounded: it regenerates at the end of the neutral turn. */
export function curiositiesWoundedSpiderFixtureV7(): GameStateV7 {
  return curiositiesUiFixtureV7({ spiderHp: 20 });
}

/** Nothing next to the Spider: it is calm (no provoked marker). */
export function curiositiesCalmFixtureV7(): GameStateV7 {
  const state = curiositiesUiFixtureV7();
  return checkedV7({
    ...state,
    units: state.units.filter((unit) => !same(unit.at, CURIOSITIES_UI_V7.bait)),
  });
}

/** The same board without any curiosity or Spider, the option off. */
export function curiositiesOffFixtureV7(): GameStateV7 {
  const state = curiositiesUiFixtureV7();
  const spider = state.monsters[0]?.unitId;
  return checkedV7({
    ...state,
    setup: { ...state.setup, curiosities: false },
    curiosities: [],
    monsters: [],
    units: state.units.filter((unit) => unit.id !== spider),
    nextEntityId: state.nextEntityId - 1,
  });
}
