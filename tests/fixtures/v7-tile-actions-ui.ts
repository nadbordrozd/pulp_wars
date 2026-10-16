import type { CoordV7, GameStateV7 } from "../../src/engine/index";
import { CULT_RITUAL_UI_V7, CULT_TRICK_UI_V7 } from "./v7-cult-ui";
import { cultStarfallUiFixtureV7, cultTricksUiFixtureV7 } from "./v7-cult-ui";
import { withRitualV7 } from "./v7-cult";
import { FROZEN_UI_V7, frozenFreezeUiFixtureV7 } from "./v7-frozen-sea-ui";
import { MARTIAN_UI_V7, martianUiFixtureV7 } from "./v7-martian-ui";
import { at, fieldV7 } from "./v7-revision20";

/**
 * Tile actions (bead pulp_wars-2yc.60; docs/ui/BOARD_TARGETING.md section
 * 1.1): the scenes the DOM tests, the phone review and the screenshots
 * select a unit on. A Human Knight with Moves and Attacks only (no badge
 * but on its own units' tiles none either), a Cult Hexer with a Ribbit and
 * an Attack on the same Knight, an Ice Folk Yeti whose Freeze tiles are
 * Moves too, a Martian Brain with Mind Control on enemies it can also
 * attack, and a Stargazer with dozens of star tiles (the compact badges).
 */
export const TILE_ACTIONS_UI_V7 = {
  /** An unmoved Human Knight, two enemies in reach, an own Marksman. */
  knight: at(4, 4),
  knightPrey: at(6, 4),
  knightPreyFar: at(4, 6),
  knightFriend: at(3, 3),
  /** The Cult Hexer and the Knight it may hex or shoot. */
  hexer: CULT_TRICK_UI_V7.hexer,
  hexed: CULT_TRICK_UI_V7.knight,
  /** The Ice Folk Yeti on the shore and the water south of it. */
  yeti: FROZEN_UI_V7.yeti,
  freezeAt: FROZEN_UI_V7.freezeAt,
  /** The Martian Brain and the weakened enemy it may take. */
  brain: MARTIAN_UI_V7.brain,
  controlTarget: MARTIAN_UI_V7.weakTarget,
  /** The Stargazer with its chanters. */
  stargazer: CULT_RITUAL_UI_V7.stargazer,
  /** An Initiate beside it that may join its star's chant once begun. */
  joiner: CULT_RITUAL_UI_V7.chanter,
} as const satisfies Readonly<Record<string, CoordV7>>;

/** The Human Knight scene (Humans against Goblins). */
export function tileActionsKnightFixtureV7(): GameStateV7 {
  const A = TILE_ACTIONS_UI_V7;
  return fieldV7(
    [
      { seat: 0, role: "KNIGHT", at: A.knight },
      { seat: 0, role: "MARKSMAN", at: A.knightFriend },
      { seat: 1, role: "FIGHTER", at: A.knightPrey },
      { seat: 1, role: "MARKSMAN", at: A.knightPreyFar },
    ],
    { factions: ["ORIGINAL", "GOBLIN"] },
  );
}

export const tileActionsHexerFixtureV7 = (): GameStateV7 =>
  cultTricksUiFixtureV7();
export const tileActionsYetiFixtureV7 = (): GameStateV7 =>
  frozenFreezeUiFixtureV7();
export const tileActionsBrainFixtureV7 = (): GameStateV7 =>
  martianUiFixtureV7();
export const tileActionsStargazerFixtureV7 = (): GameStateV7 =>
  cultStarfallUiFixtureV7();
/**
 * The Cult redesign's join (`pulp_wars-mch9.34`): the same Stargazer with
 * its star begun alone; each Initiate beside it may join the chant.
 */
export const tileActionsJoinChantFixtureV7 = (): GameStateV7 =>
  withRitualV7(
    cultStarfallUiFixtureV7(),
    "STARFALL",
    CULT_RITUAL_UI_V7.stargazer,
    [],
    CULT_RITUAL_UI_V7.star,
  );
