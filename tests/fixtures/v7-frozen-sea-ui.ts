import type {
  CoordV7,
  GameStateV7,
  TechnologyIdV7,
} from "../../src/engine/index";
import {
  DIVE_HOLES_V7,
  DIVE_TERRAIN_V7,
  frozenArenaV7,
  frozenShipsV7,
  lineV7,
  withFishingHolesV7,
} from "./v7-frozen-sea";

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
  /** An enemy Patrol Boat a Freeze toward the south-east Freezes. */
  prey: { x: 3, y: 3 },
  /** Slide: a bridge of five ice tiles down column 1, and its far shore. */
  bridgeHead: { x: 1, y: 2 },
  bridge: lineV7({ x: 1, y: 2 }, 0, 1, 5),
  farShore: { x: 1, y: 8 },
  /**
   * A Frozen Battleship on open Deep Water (the Ice Folk freeze rework,
   * `pulp_wars-s55m.1`: it was frozen in, Icebound, before).
   */
  frozenShip: { x: 7, y: 5 },
  /**
   * Three ice tiles (the frozen sea redesign: the last one cracked), and ice
   * by the capital.
   */
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
 * Cold Snap's ring), with every Ice Folk Naval technology (or, `rime`, Rime
 * alone, so Deep Water does not freeze), and an enemy Patrol Boat on the
 * tile south-east of the Yeti (a Freeze toward it Freezes it).
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
    })),
  });
}

/**
 * A Frozen ship (the Ice Folk freeze rework, `pulp_wars-s55m.1`): a hostile
 * Battleship Frozen on open water beside the viewer's ice (the viewer is the
 * Ice Folk), or, with `victim`, the viewer's own Battleship Frozen beside an
 * Ice Folk seat's ice. Beside it: a row of ice (the last tile cracked) and
 * one tile in the Ice Folk capital's territory.
 */
export function frozenShipUiFixtureV7(
  options: { readonly victim?: boolean } = {},
): GameStateV7 {
  const victim = options.victim === true;
  const iceSeat = victim ? (1 as const) : (0 as const);
  const shipSeat = victim ? (0 as const) : (1 as const);
  // The permanent tile is by the Ice Folk capital: (6, 3) for seat 0,
  // (4, 7) for seat 1.
  const permanent = victim ? { x: 4, y: 7 } : FROZEN_UI_V7.permanent;
  return frozenShipsV7(
    frozenArenaV7({
      ...(victim ? { factions: ["ORIGINAL", "ICE_FOLK"] as const } : {}),
      technologies: [ALL, ALL],
      units: [
        { seat: shipSeat, role: "BATTLESHIP", at: FROZEN_UI_V7.frozenShip },
      ],
      ice: [
        // The frozen sea redesign: ice is permanent; the last of the row is
        // cracked thick ice (every technology, so Glacier's).
        ...FROZEN_UI_V7.melting.map((at, index) => ({
          at,
          seat: iceSeat,
          cracked: index === FROZEN_UI_V7.melting.length - 1,
        })),
        { at: permanent, seat: iceSeat },
      ],
    }),
    [FROZEN_UI_V7.frozenShip],
  );
}

/**
 * Ice Folk movement (`pulp_wars-s55m.2`; Glacier's +1 Move across ice
 * before, bead `pulp_wars-w49.38`): an Ice Folk Yeti (Move 1) on the north
 * shore at the head of a four-tile ice line down column 1, with every Ice
 * Folk Naval technology. It skates the first two ice tiles at half a Move
 * each; the second, `glacierTile` (the name kept), is past its Move and
 * only skating reaches it.
 */
export const FROZEN_GLACIER_UI_V7 = {
  walker: { x: 1, y: 2 },
  ice: lineV7({ x: 1, y: 2 }, 0, 1, 4),
  glacierTile: { x: 1, y: 4 },
} as const;

export function frozenGlacierUiFixtureV7(): GameStateV7 {
  return frozenArenaV7({
    technologies: [ALL, ALL],
    units: [{ seat: 0, role: "FIGHTER", at: FROZEN_GLACIER_UI_V7.walker }],
    ice: FROZEN_GLACIER_UI_V7.ice.map((at) => ({ at })),
  });
}

/**
 * Ice Folk movement (`pulp_wars-s55m.2`): the Fishing Hole dive. Seat 0's
 * capital on (5, 2) with four Fishing Holes on its ice two tiles apart
 * (`DIVE_HOLES_V7`), every Ice Folk Naval technology, and a Yeti on the
 * north-west hole, which may dive to the other three.
 */
export const FROZEN_DIVE_UI_V7 = {
  diver: { x: 4, y: 1 },
  destinations: [
    { x: 6, y: 1 },
    { x: 4, y: 3 },
    { x: 6, y: 3 },
  ],
} as const;

export function frozenDiveUiFixtureV7(): GameStateV7 {
  return withFishingHolesV7(
    frozenArenaV7({
      technologies: [ALL, ALL],
      units: [{ seat: 0, role: "FIGHTER", at: FROZEN_DIVE_UI_V7.diver }],
      terrain: DIVE_TERRAIN_V7,
      ports: [false, true],
      ice: DIVE_HOLES_V7.map((at) => ({ at })),
    }),
    DIVE_HOLES_V7,
  );
}
