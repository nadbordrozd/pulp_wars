import { applyCommandV7, type GameStateV7 } from "../../src/engine/index";
import { iceFieldV7, type IcePieceV7 } from "./v7-ice-folk";
import { at } from "./v7-revision20";

/**
 * The Ice Folk roster rework UI fixture (bead `pulp_wars-s55m.4`): seat 0
 * (the viewer, Ice Folk, every technology) with a Frost Wyrm on the shore
 * and one hovering over Deep Water beside a hostile Battleship, a Walrus
 * and a Snow Golem by the capital (8, 8), against Humans. A strait of water
 * runs from x 3 to x 6 between rows 1 and 4 (Deep Water from x 5).
 */
export const FROST_WYRM_UI_V7 = {
  landWyrm: at(2, 3),
  seaWyrm: at(5, 3),
  battleship: at(6, 4),
  fighter: at(1, 4),
  walrus: at(7, 6),
  golem: at(9, 6),
  water: [3, 4, 5, 6].flatMap((x) => [1, 2, 3, 4].map((y) => at(x, y))),
  deepWater: [5, 6].flatMap((x) => [1, 2, 3, 4].map((y) => at(x, y))),
} as const;

export function frostWyrmUiFixtureV7(): GameStateV7 {
  const where = FROST_WYRM_UI_V7;
  const pieces: readonly IcePieceV7[] = [
    { seat: 0, role: "KNIGHT", at: where.landWyrm },
    { seat: 0, role: "KNIGHT", at: where.seaWyrm },
    { seat: 0, role: "GUARD", at: where.walrus },
    { seat: 0, role: "CATAPULT", at: where.golem },
    { seat: 1, role: "BATTLESHIP", at: where.battleship, form: "NAVAL" },
    { seat: 1, role: "FIGHTER", at: where.fighter },
    { seat: 1, role: "FIGHTER", at: at(1, 9) },
  ];
  return iceFieldV7(pieces, {
    water: where.water.filter(
      (tile) =>
        !where.deepWater.some((deep) => deep.x === tile.x && deep.y === tile.y),
    ),
    deepWater: [...where.deepWater],
  });
}

/**
 * The same board after the sea Wyrm's strike on the Battleship: the ship
 * took the blow and is Frozen by Frost Breath (through the engine).
 */
export function frostWyrmStruckFixtureV7(): GameStateV7 {
  const state = frostWyrmUiFixtureV7();
  const find = (where: { readonly x: number; readonly y: number }) => {
    const unit = state.units.find(
      (candidate) => candidate.at.x === where.x && candidate.at.y === where.y,
    );
    if (unit === undefined) throw new Error("no unit");
    return unit;
  };
  const result = applyCommandV7(state, state.humanPlayerId, {
    kind: "ATTACK",
    unitId: find(FROST_WYRM_UI_V7.seaWyrm).id,
    targetUnitId: find(FROST_WYRM_UI_V7.battleship).id,
  });
  if (!result.accepted) throw new Error(JSON.stringify(result.error));
  return result.state;
}
