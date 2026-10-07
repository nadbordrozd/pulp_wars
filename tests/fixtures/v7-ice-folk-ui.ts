import type {
  CoordV7,
  FactionIdV7,
  GameStateV7,
  TechnologyIdV7,
} from "../../src/engine/index";
import { checkedV7 } from "./v7-builders";
import { sameV7, unitAtV7 } from "./v7-goblin-arena";
import { martianUiFieldV7, type MartianUiPieceV7 } from "./v7-martian-ui";

/**
 * Ice Folk UI fixtures (bead pulp_wars-7g3.6) on the seed-2 11 x 11 arena
 * of the Martian UI fixtures (seat 0 is the human; capitals (8, 8) and
 * (2, 8) with territories x 7-9 and x 1-3, y 7-9; villages (5, 5), (8, 5),
 * (5, 8)). Every land tile that is not a settlement is open Grass unless a
 * `forest` or `mountain` option says otherwise; `roads` lay Roads. The
 * module imports no test runner, so the browser review mounts it through
 * the dev server.
 */
export interface IceFolkUiPieceV7 extends MartianUiPieceV7 {
  /** A Chill entry: FROZEN (sluggish), FROSTED, or THAWING (turnsLeft 0). */
  readonly chill?: "FROZEN" | "FROSTED" | "THAWING";
}

export interface IceFolkUiOptionsV7 {
  readonly factions?: readonly FactionIdV7[];
  readonly forest?: readonly CoordV7[];
  readonly mountain?: readonly CoordV7[];
  readonly roads?: readonly CoordV7[];
  readonly fieldDefense?: readonly CoordV7[];
  readonly water?: readonly CoordV7[];
  readonly techs?: Readonly<Record<number, readonly TechnologyIdV7[]>>;
}

export function iceFolkUiFieldV7(
  pieces: readonly IceFolkUiPieceV7[],
  options: IceFolkUiOptionsV7 = {},
): GameStateV7 {
  const base = martianUiFieldV7(pieces, {
    factions: options.factions ?? ["ICE_FOLK", "ORIGINAL"],
    ...(options.water === undefined ? {} : { water: options.water }),
    ...(options.techs === undefined ? {} : { techs: options.techs }),
    ...(options.fieldDefense === undefined
      ? {}
      : { fieldDefense: options.fieldDefense }),
  });
  const among = (list: readonly CoordV7[] | undefined, at: CoordV7): boolean =>
    list?.some((candidate) => sameV7(candidate, at)) === true;
  const terrained = checkedV7({
    ...base,
    board: {
      ...base.board,
      tiles: base.board.tiles.map((tile) =>
        tile.site !== null || tile.biome === null
          ? tile
          : {
              ...tile,
              ...(among(options.forest, tile.at)
                ? { terrain: "FOREST" as const, biome: "WOODLAND" as const }
                : among(options.mountain, tile.at)
                  ? {
                      terrain: "MOUNTAIN" as const,
                      biome: "HIGHLANDS" as const,
                    }
                  : {}),
              road: among(options.roads, tile.at),
            },
      ),
    },
  });
  return checkedV7({
    ...terrained,
    chilled: pieces
      .filter((piece) => piece.chill !== undefined)
      .map((piece) => ({
        unitId: unitAtV7(terrained, piece.at).id,
        sluggish: piece.chill === "FROZEN",
        turnsLeft: (piece.chill === "THAWING" ? 0 : 2) as 0 | 1 | 2,
      }))
      .sort((left, right) => left.unitId - right.unitId),
  });
}

/** Where everything stands in `iceFolkUiFixtureV7`. */
export const ICE_FOLK_UI_V7 = {
  /** Unmoved Sled two tiles from a wounded enemy Fighter a Yeti could
   * then shatter. */
  sled: { x: 6, y: 2 },
  bolasTarget: { x: 4, y: 2 },
  bolasPartner: { x: 3, y: 2 },
  /** Witch (her Blizzard on Snow) with an unchilled and a Frosted enemy. */
  witch: { x: 6, y: 6 },
  snapFrozen: { x: 4, y: 6 },
  snapFrosted: { x: 6, y: 4 },
  /** Mammoth: a target on Field Defense with an enemy on each flank. */
  mammoth: { x: 9, y: 3 },
  sweepTarget: { x: 9, y: 2 },
  sweepFlankWest: { x: 8, y: 2 },
  sweepFlankEast: { x: 10, y: 2 },
  /** Yeti next to a Frosted, wounded enemy Fighter: the attack shatters. */
  yeti: { x: 2, y: 4 },
  shatterTarget: { x: 2, y: 5 },
  /** A Frozen enemy Guard and a Thawing enemy Marksman. */
  frozenEnemy: { x: 0, y: 5 },
  thawingEnemy: { x: 0, y: 2 },
  /**
   * Unmoved Boulder Yeti two tiles from an enemy Guard on Field Defense in
   * its own territory (fortified; Boulders ignore it).
   */
  boulderYeti: { x: 5, y: 7 },
  boulderTarget: { x: 3, y: 7 },
  /** Snow Hunter two tiles from the Frosted Fighter (Cold Blood). */
  hunter: { x: 4, y: 4 },
  /** Yeti on a Mountain two tiles from an enemy Raider (Rockfall). */
  rockfallYeti: { x: 10, y: 5 },
  rockfallTarget: { x: 10, y: 3 },
  /** A Sabretooth and a Frost Giant at home. */
  sabretooth: { x: 9, y: 7 },
  giant: { x: 7, y: 9 },
  /** Forest, Mountain and Road tiles inside the Snow. */
  forest: [
    { x: 7, y: 7 },
    { x: 6, y: 9 },
    { x: 10, y: 9 },
  ],
  mountain: [
    { x: 9, y: 9 },
    { x: 10, y: 5 },
    { x: 10, y: 7 },
  ],
  roads: [
    { x: 7, y: 8 },
    { x: 9, y: 8 },
    { x: 8, y: 9 },
    { x: 8, y: 10 },
  ],
} as const;

/**
 * Seat 0 (Ice Folk) with every ability ready, against seat 1 (Human by
 * default; `enemy` picks another faction). Every technology is researched,
 * so Deep Winter spreads Snow two tiles from the capital and Brittle sets
 * the Shatter threshold to 4.
 */
export function iceFolkUiFixtureV7(
  enemy: FactionIdV7 = "ORIGINAL",
): GameStateV7 {
  const at = ICE_FOLK_UI_V7;
  return iceFolkUiFieldV7(
    [
      { seat: 0, role: "RAIDER", at: at.sled },
      { seat: 0, role: "FIGHTER", at: at.bolasPartner },
      { seat: 0, role: "CAPTAIN", at: at.witch },
      { seat: 0, role: "SWORDSMAN", at: at.mammoth },
      { seat: 0, role: "FIGHTER", at: at.yeti },
      { seat: 0, role: "CATAPULT", at: at.boulderYeti },
      { seat: 0, role: "MARKSMAN", at: at.hunter },
      { seat: 0, role: "FIGHTER", at: at.rockfallYeti },
      { seat: 0, role: "KNIGHT", at: at.sabretooth },
      { seat: 0, role: "JUGGERNAUT", at: at.giant },
      { seat: 1, role: "FIGHTER", at: at.bolasTarget, hp: 7 },
      { seat: 1, role: "MARKSMAN", at: at.snapFrozen },
      { seat: 1, role: "FIGHTER", at: at.snapFrosted, chill: "FROSTED" },
      { seat: 1, role: "FIGHTER", at: at.sweepTarget },
      { seat: 1, role: "MARKSMAN", at: at.sweepFlankWest },
      { seat: 1, role: "RAIDER", at: at.sweepFlankEast },
      {
        seat: 1,
        role: "FIGHTER",
        at: at.shatterTarget,
        hp: 8,
        chill: "FROSTED",
      },
      { seat: 1, role: "GUARD", at: at.frozenEnemy, chill: "FROZEN" },
      { seat: 1, role: "MARKSMAN", at: at.thawingEnemy, chill: "THAWING" },
      { seat: 1, role: "GUARD", at: at.boulderTarget },
      { seat: 1, role: "RAIDER", at: at.rockfallTarget },
    ],
    {
      factions: ["ICE_FOLK", enemy],
      forest: at.forest,
      mountain: at.mountain,
      roads: at.roads,
      fieldDefense: [at.sweepTarget, at.boulderTarget],
    },
  );
}

/**
 * The other side: a Human viewer (seat 0) against an Ice Folk seat whose
 * Witch stands on the Human territory (her Blizzard over enemy land). The
 * Human Fighter next to her moved while Frozen; a Human Marksman can shoot
 * a Yeti in the Blizzard (half damage); a Human Raider on Grass would stop
 * on the Snow.
 */
export const ICE_FOLK_VICTIM_V7 = {
  witch: { x: 8, y: 6 },
  frozenFighter: { x: 7, y: 6 },
  marksman: { x: 9, y: 3 },
  blizzardYeti: { x: 9, y: 5 },
  raider: { x: 5, y: 3 },
  enemyYeti: { x: 6, y: 5 },
} as const;

export function iceFolkVictimFixtureV7(): GameStateV7 {
  const at = ICE_FOLK_VICTIM_V7;
  return iceFolkUiFieldV7(
    [
      {
        seat: 0,
        role: "FIGHTER",
        at: at.frozenFighter,
        chill: "FROZEN",
        activation: { moved: true },
      },
      { seat: 0, role: "MARKSMAN", at: at.marksman },
      { seat: 0, role: "RAIDER", at: at.raider },
      { seat: 1, role: "CAPTAIN", at: at.witch },
      { seat: 1, role: "FIGHTER", at: at.blizzardYeti },
      { seat: 1, role: "FIGHTER", at: at.enemyYeti },
    ],
    { factions: ["ORIGINAL", "ICE_FOLK"] },
  );
}

/**
 * The Glide fixture of the balance round's UI (bead `pulp_wars-1wy.5`,
 * ruleset `7r37`): an Ice Folk seat with every technology, so Deep Winter
 * makes the tiles within two of its capital (8, 8) Snow (x 6-10, y 6-10).
 * `inside` is a Yeti well inside the Snow (two Snow-to-Snow steps reach two
 * tiles); `edge` is a Yeti on the Snow's western edge (a step off the Snow
 * is a full step: one tile); `outside` is a Yeti on open ground.
 */
export const ICE_FOLK_GLIDE_V7 = {
  inside: { x: 8, y: 7 },
  edge: { x: 6, y: 9 },
  outside: { x: 3, y: 3 },
} as const;

export function iceFolkGlideFixtureV7(): GameStateV7 {
  const at = ICE_FOLK_GLIDE_V7;
  return iceFolkUiFieldV7(
    [
      { seat: 0, role: "FIGHTER", at: at.inside },
      { seat: 0, role: "FIGHTER", at: at.edge },
      { seat: 0, role: "FIGHTER", at: at.outside },
      { seat: 1, role: "FIGHTER", at: { x: 1, y: 5 } },
    ],
    { factions: ["ICE_FOLK", "ORIGINAL"] },
  );
}

/**
 * A Martian seat against an Ice Folk seat: a Frozen Saucer and a Frozen
 * Mothership that moved (sluggish: neither may Beam Down or pull), each
 * with a passenger and a target in reach (bead `pulp_wars-1wy.5`).
 */
export const MARTIAN_FROZEN_V7 = {
  saucer: { x: 3, y: 2 },
  mothership: { x: 7, y: 2 },
  grunt: { x: 5, y: 2 },
  target: { x: 5, y: 4 },
} as const;

export function martianFrozenFixtureV7(): GameStateV7 {
  const at = MARTIAN_FROZEN_V7;
  return iceFolkUiFieldV7(
    [
      {
        seat: 0,
        role: "RAIDER",
        at: at.saucer,
        chill: "FROZEN",
        activation: { moved: true },
      },
      {
        seat: 0,
        role: "KNIGHT",
        at: at.mothership,
        chill: "FROZEN",
        activation: { moved: true },
      },
      { seat: 0, role: "FIGHTER", at: at.grunt },
      { seat: 1, role: "FIGHTER", at: at.target },
    ],
    { factions: ["MARTIAN", "ICE_FOLK"] },
  );
}
