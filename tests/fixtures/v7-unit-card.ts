import type { CoordV7, GameStateV7 } from "../../src/engine/index";
import { checkedV7, replaceTileV7 } from "./v7-builders";
import { sameV7 } from "./v7-goblin-arena";
import { martianUiFieldV7 } from "./v7-martian-ui";

/**
 * The compact unit card (bead `pulp_wars-2yc.86`): a Human seat (0) against
 * a Martian seat on the seed-2 11 x 11 arena, on the human's turn, every
 * technology known. The human capital is (8, 8). The module imports no
 * test runner, so the browser review mounts it through the dev server.
 *
 * - `plain`: a ready Fighter with nothing on it.
 * - `inspired`: a Veteran Knight (promoted: +5 maximum HP) that a Rally
 *   Inspired (+1 Attack on its next attack), wounded.
 * - `enemy`: a Martian Fighter with its Shield, on the viewer's side.
 * - `capital`: the human capital, with a Fruit beside it.
 */
export const UNIT_CARD_UI_V7 = {
  capital: { x: 8, y: 8 },
  plain: { x: 7, y: 8 },
  inspired: { x: 9, y: 8 },
  enemy: { x: 6, y: 7 },
  fruit: { x: 7, y: 7 },
} as const satisfies Readonly<Record<string, CoordV7>>;

export function unitCardFixtureV7(): GameStateV7 {
  const at = UNIT_CARD_UI_V7;
  let state = martianUiFieldV7(
    [
      { seat: 0, role: "FIGHTER", at: at.plain },
      {
        seat: 0,
        role: "KNIGHT",
        at: at.inspired,
        activation: { inspired: true },
      },
      { seat: 1, role: "FIGHTER", at: at.enemy },
    ],
    {
      factions: ["ORIGINAL", "MARTIAN"],
      coins: 30,
      homed: [at.plain, at.inspired],
    },
  );
  state = checkedV7({
    ...state,
    units: state.units.map((unit) =>
      sameV7(unit.at, at.inspired)
        ? {
            ...unit,
            veteran: true,
            kills: 3,
            maxHp: unit.maxHp + 5,
            hp: unit.maxHp,
          }
        : unit,
    ),
  });
  return replaceTileV7(state, at.fruit, { resource: "FRUIT" });
}

/**
 * The Promotion pips (bead `pulp_wars-2yc.106`): the unit card fixture with
 * two kills on the `plain` Fighter (two of its three pips lit) and three on
 * the `enemy` Martian Fighter (all lit: it waits for its Promotion). The
 * `inspired` Knight is a veteran and shows none.
 */
export function unitCardPromotionFixtureV7(): GameStateV7 {
  const at = UNIT_CARD_UI_V7;
  const state = unitCardFixtureV7();
  return checkedV7({
    ...state,
    units: state.units.map((unit) =>
      sameV7(unit.at, at.plain)
        ? { ...unit, kills: 2 }
        : sameV7(unit.at, at.enemy)
          ? { ...unit, kills: 3 }
          : unit,
    ),
  });
}
