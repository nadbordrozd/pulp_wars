import type {
  CoordV7,
  CrumbsV7,
  FactionIdV7,
  GameStateV7,
  SugarRushStatusV7,
  TechnologyIdV7,
  UnitRoleIdV7,
} from "../../src/engine/index";
import { checkedV7 } from "./v7-builders";
import { unitAtV7 } from "./v7-goblin-arena";
import { martianUiFieldV7, type MartianUiPieceV7 } from "./v7-martian-ui";

/**
 * Candy UI fixtures (bead pulp_wars-jdb.6) on the seed-2 11 x 11 arena of
 * the Martian UI fixtures (seat 0 is the human; capitals (8, 8) and (2, 8)
 * with territories x 7-9 and x 1-3, y 7-9; villages (5, 5), (8, 5),
 * (5, 8)). Every land tile that is not a settlement is open Grass. The
 * module imports no test runner, so the browser review mounts it through
 * the dev server.
 */
export interface CandyUiPieceV7 extends MartianUiPieceV7 {
  /** A `sugarRush` entry for the unit. */
  readonly rush?: SugarRushStatusV7["phase"];
  /** The unit is in `splattedThisTurn`. */
  readonly splatted?: boolean;
  /** The unit is in `tossedThisTurn`. */
  readonly tossed?: boolean;
}

export interface CandyUiOptionsV7 {
  readonly factions?: readonly FactionIdV7[];
  readonly techs?: Readonly<Record<number, readonly TechnologyIdV7[]>>;
  readonly coins?: number;
  /** Seat-0 tiles whose unit stays homed to the capital. */
  readonly homed?: readonly CoordV7[];
  /** Crumbs: the owner's seat, the fallen unit's role, and the turns left. */
  readonly crumbs?: readonly {
    readonly at: CoordV7;
    readonly role: UnitRoleIdV7;
    readonly seat: number;
    readonly turnsLeft?: CrumbsV7["turnsLeft"];
  }[];
}

export function candyUiFieldV7(
  pieces: readonly CandyUiPieceV7[],
  options: CandyUiOptionsV7 = {},
): GameStateV7 {
  const state = martianUiFieldV7(pieces, {
    factions: options.factions ?? ["CANDY", "ORIGINAL"],
    ...(options.techs === undefined ? {} : { techs: options.techs }),
    ...(options.coins === undefined ? {} : { coins: options.coins }),
    ...(options.homed === undefined ? {} : { homed: options.homed }),
  });
  const ids = (predicate: (piece: CandyUiPieceV7) => boolean) =>
    pieces
      .filter(predicate)
      .map((piece) => unitAtV7(state, piece.at).id)
      .sort((left, right) => left - right);
  const seatId = (seat: number): GameStateV7["players"][number]["id"] => {
    const player = state.players.find((candidate) => candidate.seat === seat);
    if (player === undefined) throw new Error("seat missing");
    return player.id;
  };
  return checkedV7({
    ...state,
    sugarRush: pieces
      .filter((piece) => piece.rush !== undefined)
      .map((piece) => ({
        unitId: unitAtV7(state, piece.at).id,
        phase: piece.rush as SugarRushStatusV7["phase"],
      }))
      .sort((left, right) => left.unitId - right.unitId),
    splattedThisTurn: ids((piece) => piece.splatted === true),
    tossedThisTurn: ids((piece) => piece.tossed === true),
    crumbs: (options.crumbs ?? [])
      .map((entry) => ({
        at: entry.at,
        role: entry.role,
        ownerId: seatId(entry.seat),
        turnsLeft: entry.turnsLeft ?? 3,
      }))
      .sort((left, right) => left.at.y - right.at.y || left.at.x - right.at.x),
  });
}

/** Where everything stands in `candyUiFixtureV7`. */
export const CANDY_UI_V7 = {
  /** A fresh Gumdrop next to an enemy Fighter: it may Rush. */
  gumdrop: { x: 6, y: 2 },
  rushTarget: { x: 5, y: 2 },
  /** A Gumdrop that moved: "Already moved". */
  movedGumdrop: { x: 3, y: 1 },
  /** A Rushed Donut Racer next to the capital: Home Sweet Home. */
  rushedDonut: { x: 7, y: 7 },
  /** A Rushed Gummy Bear: Sugar Frenzy and its two pips. */
  rushedBear: { x: 4, y: 4 },
  /** A Crashed Marshmallow. */
  crashed: { x: 3, y: 5 },
  /** A Gumdrop next to a Splatted enemy Guard, and the Pie Launcher. */
  splatAttacker: { x: 9, y: 3 },
  splatted: { x: 9, y: 2 },
  pieLauncher: { x: 9, y: 5 },
  pieTarget: { x: 10, y: 3 },
  /** A homed Confectioner with two Crumbs and a wounded Gumdrop beside it. */
  confectioner: { x: 6, y: 7 },
  crumbsBear: { x: 5, y: 7 },
  crumbsGumdrop: { x: 6, y: 6 },
  frostingTarget: { x: 5, y: 6 },
  /** A Gunner with two wounded own units within two tiles. */
  gunner: { x: 1, y: 2 },
  tossNear: { x: 2, y: 3 },
  tossFar: { x: 1, y: 4 },
  /** A Crashed Gunner: its Sugar Toss names "Crashed". */
  crashedGunner: { x: 0, y: 0 },
} as const;

/**
 * Seat 0 (Candy) with every ability ready, against seat 1 (Human by
 * default): a unit that may Rush, a Rushed Donut Racer at home, a Rushed
 * Gummy Bear, a Crashed Marshmallow, a Splatted enemy, a Confectioner with
 * Crumbs to Re-bake and a unit to Frost, and a Gunner with units to heal.
 */
export function candyUiFixtureV7(
  options: Pick<CandyUiOptionsV7, "factions" | "coins" | "techs"> = {},
): GameStateV7 {
  const at = CANDY_UI_V7;
  return candyUiFieldV7(
    [
      { seat: 0, role: "FIGHTER", at: at.gumdrop },
      { seat: 1, role: "FIGHTER", at: at.rushTarget },
      {
        seat: 0,
        role: "FIGHTER",
        at: at.movedGumdrop,
        activation: { moved: true, movedPathLength: 1 },
      },
      { seat: 0, role: "RAIDER", at: at.rushedDonut, rush: "RUSHED" },
      { seat: 0, role: "KNIGHT", at: at.rushedBear, rush: "RUSHED" },
      { seat: 0, role: "GUARD", at: at.crashed, rush: "CRASHED" },
      { seat: 0, role: "FIGHTER", at: at.splatAttacker },
      { seat: 1, role: "GUARD", at: at.splatted, splatted: true },
      { seat: 0, role: "CATAPULT", at: at.pieLauncher },
      { seat: 1, role: "FIGHTER", at: at.pieTarget },
      { seat: 0, role: "CAPTAIN", at: at.confectioner },
      { seat: 0, role: "FIGHTER", at: at.frostingTarget, hp: 4 },
      { seat: 0, role: "MARKSMAN", at: at.gunner },
      { seat: 0, role: "FIGHTER", at: at.tossNear, hp: 5 },
      { seat: 0, role: "GUARD", at: at.tossFar, hp: 17 },
      { seat: 0, role: "MARKSMAN", at: at.crashedGunner, rush: "CRASHED" },
    ],
    {
      ...options,
      homed: [at.confectioner],
      crumbs: [
        { at: at.crumbsBear, role: "KNIGHT", seat: 0 },
        { at: at.crumbsGumdrop, role: "FIGHTER", seat: 0, turnsLeft: 1 },
      ],
    },
  );
}

/** Where everything stands in `candyVictimFixtureV7`. */
export const CANDY_VICTIM_V7 = {
  /** A Human Fighter next to an enemy Marshmallow: it bounces back. */
  fighter: { x: 5, y: 3 },
  marshmallow: { x: 6, y: 3 },
  /** A Human Knight next to an enemy Golem, a unit behind it: blocked. */
  knight: { x: 4, y: 7 },
  golem: { x: 5, y: 7 },
  blocker: { x: 3, y: 7 },
  /** A Human Fighter next to enemy Crumbs that bite. */
  eater: { x: 6, y: 9 },
  crumbs: { x: 5, y: 9 },
  /** A Crashed and a Rushed enemy unit. */
  crashedEnemy: { x: 8, y: 3 },
  rushedEnemy: { x: 9, y: 4 },
} as const;

/**
 * The other side: seat 0 (Human) against seat 1 (Candy): a Bounce and a
 * blocked Bounce in the attack preview, enemy Crumbs with Peppermint
 * Surprise to walk onto, and the Crashed and Rushed markers on enemy units.
 */
export function candyVictimFixtureV7(): GameStateV7 {
  const at = CANDY_VICTIM_V7;
  return candyUiFieldV7(
    [
      { seat: 0, role: "FIGHTER", at: at.fighter },
      { seat: 1, role: "GUARD", at: at.marshmallow },
      { seat: 0, role: "KNIGHT", at: at.knight },
      { seat: 1, role: "JUGGERNAUT", at: at.golem },
      { seat: 0, role: "FIGHTER", at: at.blocker },
      { seat: 0, role: "FIGHTER", at: at.eater },
      { seat: 1, role: "GUARD", at: at.crashedEnemy, rush: "CRASHED" },
      { seat: 1, role: "FIGHTER", at: at.rushedEnemy, rush: "RUSHED" },
    ],
    {
      factions: ["ORIGINAL", "CANDY"],
      crumbs: [{ at: at.crumbs, role: "RAIDER", seat: 1, turnsLeft: 2 }],
    },
  );
}
