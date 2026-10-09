import type { CoordV7, CuriosityV7, GameStateV7 } from "../../src/engine/index";
import { checkedV7 } from "./v7-builders";
import {
  round2ArenaV7,
  type Round2ArenaOptionsV7,
  type Round2NeutralV7,
  type Round2PieceV7,
} from "./v7-round2-arena";

/**
 * The map curiosities round-2 UI fixtures (bead pulp_wars-737.16,
 * docs/product/RULESET_7_MAP_CURIOSITIES.md section 34.1), hand-built on
 * the open 20 x 20 round-2 arena (tests/fixtures/v7-round2-arena.ts: player
 * 1's capital at (9, 15), player 2's at (12, 4); player 1, the human, is
 * active). Nothing here plays a turn: the review and the DOM tests select,
 * preview and send the human's own commands only.
 *
 * - A camp on (5, 9): the Downed Saucer with a Grunt, a Ray Gunner and a
 *   Shield Projector (every saucer breed on one board), or the Graveyard
 *   with its two Zombies; a wounded human Fighter inside the camp (it
 *   provokes it) and a human Knight whose Moves into the camp carry the
 *   provoked marker.
 * - The two Dimensional Gates on (2, 2) and (17, 17): a human Fighter next
 *   to the first, and player 2's Fighter on the second (shoved aside, or,
 *   in the blocked fixture, walled in by Mountains player 2 cannot climb).
 * - Bigfoot at home on (16, 10) in a Forest, with a human Fighter 3 tiles
 *   away (it is Alert).
 * - The Wishing Well on (4, 15) with a wounded human Fighter on it, which
 *   may toss its Coin.
 *
 * The module imports no test runner, so the browser review mounts it
 * through the dev server.
 */
export const ROUND2_UI_V7 = {
  camp: { x: 5, y: 9 },
  guards: [
    { x: 5, y: 8 },
    { x: 4, y: 10 },
    { x: 6, y: 10 },
  ],
  bait: { x: 7, y: 10 },
  knight: { x: 9, y: 9 },
  gateA: { x: 2, y: 2 },
  gateB: { x: 17, y: 17 },
  traveller: { x: 3, y: 3 },
  occupant: { x: 17, y: 17 },
  /** Where the occupant is shoved: the first free tile clockwise from N. */
  shoved: { x: 17, y: 16 },
  bigfoot: { x: 16, y: 10 },
  scout: { x: 13, y: 11 },
  well: { x: 4, y: 15 },
  pilgrim: { x: 4, y: 15 },
} as const;

const AT = ROUND2_UI_V7;

const GATES: readonly CuriosityV7[] = [
  { kind: "GATE", at: AT.gateA, partner: AT.gateB },
  { kind: "GATE", at: AT.gateB, partner: AT.gateA },
];

function forest(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): { at: CoordV7; terrain: "FOREST" }[] {
  const tiles: { at: CoordV7; terrain: "FOREST" }[] = [];
  for (let y = y0; y <= y1; y += 1)
    for (let x = x0; x <= x1; x += 1)
      tiles.push({ at: { x, y }, terrain: "FOREST" });
  return tiles;
}

const PIECES: readonly Round2PieceV7[] = [
  { seat: 0, role: "FIGHTER", at: AT.bait, hp: 6 },
  { seat: 0, role: "KNIGHT", at: AT.knight },
  { seat: 0, role: "FIGHTER", at: AT.traveller },
  { seat: 0, role: "FIGHTER", at: AT.scout },
  { seat: 0, role: "FIGHTER", at: AT.pilgrim, hp: 5 },
  { seat: 1, role: "FIGHTER", at: AT.occupant },
];

function round2UiArena(
  camp: "DOWNED_SAUCER" | "GRAVEYARD",
  options: Pick<Round2ArenaOptionsV7, "terrain" | "techs"> = {},
): GameStateV7 {
  const guards: readonly Round2NeutralV7[] =
    camp === "DOWNED_SAUCER"
      ? [
          { breed: "GRUNT", home: AT.camp, at: AT.guards[0] },
          { breed: "RAY_GUNNER", home: AT.camp, at: AT.guards[1] },
          { breed: "SHIELD_PROJECTOR", home: AT.camp, at: AT.guards[2] },
        ]
      : [
          { breed: "ZOMBIE", home: AT.camp, at: AT.guards[0] },
          { breed: "ZOMBIE", home: AT.camp, at: AT.guards[1] },
        ];
  const state = round2ArenaV7({
    pieces: PIECES,
    neutrals: [...guards, { breed: "BIGFOOT", home: AT.bigfoot }],
    curiosities: [
      { kind: camp, at: AT.camp },
      ...GATES,
      { kind: "WISHING_WELL", at: AT.well, tossedBy: [] },
    ],
    terrain: [...forest(13, 7, 19, 13), ...(options.terrain ?? [])],
    ...(options.techs === undefined ? {} : { techs: options.techs }),
  });
  // Every seat has earned and spent Explorer already, so a coin toss's
  // reveal never opens the achievement dialog over the review.
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

/** The Downed Saucer board (with the gates, Bigfoot and the Well). */
export function round2SaucerUiFixtureV7(): GameStateV7 {
  return round2UiArena("DOWNED_SAUCER");
}

/** The Graveyard board (with the gates, Bigfoot and the Well). */
export function round2GraveyardUiFixtureV7(): GameStateV7 {
  return round2UiArena("GRAVEYARD");
}

/**
 * The saucer board with the second gate walled in: Mountains on its eight
 * neighbours and player 2 without Engineering, so a traversal is blocked.
 */
export function round2GateBlockedUiFixtureV7(): GameStateV7 {
  const ring: CoordV7[] = [];
  for (let dy = -1; dy <= 1; dy += 1)
    for (let dx = -1; dx <= 1; dx += 1)
      if (dx !== 0 || dy !== 0)
        ring.push({ x: AT.gateB.x + dx, y: AT.gateB.y + dy });
  return round2UiArena("DOWNED_SAUCER", {
    terrain: ring.map((at) => ({ at, terrain: "MOUNTAIN" as const })),
    techs: { 1: [] },
  });
}
