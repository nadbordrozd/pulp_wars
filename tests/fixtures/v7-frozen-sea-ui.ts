import type {
  CoordV7,
  GameStateV7,
  TechnologyIdV7,
} from "../../src/engine/index";
import { frozenArenaV7, lineV7 } from "./v7-frozen-sea";

/**
 * The frozen sea interface (bead pulp_wars-5ti.7, second part): scenes on
 * the authored strait of `v7-frozen-sea.ts` (rows 0 to 2 and 8 to 10 land,
 * rows 3 and 7 Shallow Water, rows 4 to 6 Deep Water; capitals on (5, 2)
 * and (5, 8), Ports on (4, 3) and (6, 7)) for the board plan, the dock and
 * the board host. Seat 0 is the viewer. The module imports no test runner,
 * so the browser smoke mounts it through the dev server.
 */
export const FROZEN_UI_V7 = {
  /** Freeze: a Yeti on the north shore, a Witch beside the water. */
  yeti: { x: 2, y: 2 },
  /** The tile south of the Yeti and the tile beyond it. */
  freezeAt: { x: 2, y: 3 },
  freezeBeyond: { x: 2, y: 4 },
  witch: { x: 8, y: 2 },
  /** An enemy Patrol Boat a Freeze toward the south-east locks in. */
  prey: { x: 3, y: 3 },
  /** Slide: a bridge of five ice tiles down column 1, and its far shore. */
  bridgeHead: { x: 1, y: 2 },
  bridge: lineV7({ x: 1, y: 2 }, 0, 1, 5),
  farShore: { x: 1, y: 8 },
  /** Icebound: a Battleship frozen in on Deep Water. */
  frozenShip: { x: 7, y: 5 },
  /** Melting ice at 3, 2 and 1 turns, and permanent ice by the capital. */
  melting: [
    { x: 8, y: 4 },
    { x: 9, y: 4 },
    { x: 10, y: 4 },
  ],
  permanent: { x: 6, y: 3 },
} as const satisfies Record<string, CoordV7 | readonly CoordV7[]>;

const RIME: readonly TechnologyIdV7[] = ["SHORECRAFT"];
const ALL: readonly TechnologyIdV7[] = [
  "SHORECRAFT",
  "NAVIGATION",
  "NAVAL_ENGINEERING",
  "SEAMANSHIP",
  "SUBMERSIBLES",
];

/**
 * Freeze: an Ice Folk Yeti on the shore (a line role) and an Ice Witch (her
 * ring), with every Ice Folk Naval technology (or, `rime`, Rime alone, so
 * Deep Water does not freeze and no ship is locked in), and an enemy Patrol
 * Boat on the tile south-east of the Yeti.
 */
export function frozenFreezeUiFixtureV7(
  options: { readonly rime?: boolean } = {},
): GameStateV7 {
  return frozenArenaV7({
    technologies: [options.rime === true ? RIME : ALL, ["SHORECRAFT"]],
    units: [
      { seat: 0, role: "FIGHTER", at: FROZEN_UI_V7.yeti },
      { seat: 0, role: "CAPTAIN", at: FROZEN_UI_V7.witch },
      { seat: 1, role: "PATROL_BOAT", at: FROZEN_UI_V7.prey },
    ],
  });
}

/**
 * The slide: a five-tile ice bridge from the viewer's shore to the far one,
 * with a Yeti (it slides; `sled` makes it a Sled, which has the Move left
 * to step ashore) and a Sabretooth (it walks) at its head. With
 * `slipper`, seat 0 is Human and seat 1 the Ice Folk whose ice it is: the
 * viewer's Fighter slips, its Move ending on the first ice tile.
 */
export function frozenSlideUiFixtureV7(
  options: { readonly slipper?: boolean; readonly sled?: boolean } = {},
): GameStateV7 {
  const slipper = options.slipper === true;
  return frozenArenaV7({
    ...(slipper ? { factions: ["ORIGINAL", "ICE_FOLK"] as const } : {}),
    technologies: [ALL, ALL],
    units: [
      {
        seat: 0,
        role: options.sled === true ? "RAIDER" : "FIGHTER",
        at: FROZEN_UI_V7.bridgeHead,
      },
      ...(slipper
        ? []
        : [
            {
              seat: 0 as const,
              role: "KNIGHT" as const,
              at: { x: 0, y: 2 },
            },
          ]),
    ],
    ice: FROZEN_UI_V7.bridge.map((at) => ({
      at,
      seat: slipper ? (1 as const) : (0 as const),
      turnsLeft: 3,
    })),
  });
}

/**
 * Icebound: a Battleship frozen in on the viewer's ice (the viewer is the
 * Ice Folk), or, with `victim`, the viewer's own Battleship frozen in on an
 * Ice Folk seat's ice. Beside it: melting ice at 3, 2 and 1 turns and one
 * permanent tile in the Ice Folk capital's territory.
 */
export function frozenIceboundUiFixtureV7(
  options: { readonly victim?: boolean } = {},
): GameStateV7 {
  const victim = options.victim === true;
  const iceSeat = victim ? (1 as const) : (0 as const);
  const shipSeat = victim ? (0 as const) : (1 as const);
  // The permanent tile is by the Ice Folk capital: (6, 3) for seat 0,
  // (4, 7) for seat 1.
  const permanent = victim ? { x: 4, y: 7 } : FROZEN_UI_V7.permanent;
  return frozenArenaV7({
    ...(victim ? { factions: ["ORIGINAL", "ICE_FOLK"] as const } : {}),
    technologies: [ALL, ALL],
    units: [
      { seat: shipSeat, role: "BATTLESHIP", at: FROZEN_UI_V7.frozenShip },
    ],
    ice: [
      { at: FROZEN_UI_V7.frozenShip, seat: iceSeat, turnsLeft: 3 },
      ...FROZEN_UI_V7.melting.map((at, index) => ({
        at,
        seat: iceSeat,
        turnsLeft: 3 - index,
      })),
      { at: permanent, seat: iceSeat, turnsLeft: 3 },
    ],
  });
}

/**
 * Ice Folk Freeze (bead `pulp_wars-w49.38`, Glacier's +1 Move across ice):
 * an Ice Folk Sabretooth (it walks on ice; Move 3) on the north shore at
 * the head of a four-tile ice line down column 1, with every Ice Folk
 * Naval technology (Glacier included). Without Glacier it reaches the
 * third ice tile; the fourth, `glacierTile`, only with the bonus.
 */
export const FROZEN_GLACIER_UI_V7 = {
  walker: { x: 1, y: 2 },
  ice: lineV7({ x: 1, y: 2 }, 0, 1, 4),
  glacierTile: { x: 1, y: 6 },
} as const;

export function frozenGlacierUiFixtureV7(): GameStateV7 {
  return frozenArenaV7({
    technologies: [ALL, ALL],
    units: [{ seat: 0, role: "KNIGHT", at: FROZEN_GLACIER_UI_V7.walker }],
    ice: FROZEN_GLACIER_UI_V7.ice.map((at) => ({ at, turnsLeft: 3 })),
  });
}
