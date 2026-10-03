import {
  unitShieldMaximumV7,
  type CoordV7,
  type FactionIdV7,
  type GameStateV7,
  type TechnologyIdV7,
  type UnitStateV7,
} from "../../src/engine/index";
import { checkedV7 } from "./v7-builders";
import {
  goblinArenaV7,
  sameV7,
  unitAtV7,
  type GoblinPieceV7,
} from "./v7-goblin-arena";

/**
 * Martian UI fixtures (bead pulp_wars-t6s.4) on the seed-2 11 x 11 arena
 * (seat 0 is the human; capitals (8, 8) and (2, 8); villages (5, 5),
 * (8, 5), (5, 8)). Every land tile that is not a settlement is open Grass;
 * `water` tiles are Shallow Water. Achievements are unlocked in advance so
 * no achievement notice covers the board. The module imports no test
 * runner, so the browser review mounts it through the dev server.
 */
export interface MartianUiPieceV7 extends GoblinPieceV7 {
  /** Current Shield (default: the Shield maximum). */
  readonly shield?: number;
  /** COOLING: fired on its owner's last turn; FIRED: this turn. */
  readonly cooling?: "COOLING" | "FIRED";
  /** Makes the unit a Thrall of the Brain on this tile. */
  readonly thrallOf?: CoordV7;
  /** A Mind Control cooldown entry with this `turnsRemaining`. */
  readonly cooldown?: number;
}

export interface MartianUiOptionsV7 {
  readonly factions?: readonly FactionIdV7[];
  readonly water?: readonly CoordV7[];
  readonly techs?: Readonly<Record<number, readonly TechnologyIdV7[]>>;
  readonly coins?: number;
  /** Seat-0 tiles whose unit stays homed to the capital (default: none). */
  readonly homed?: readonly CoordV7[];
  /** Tiles with Field Defense (fortification for the Disintegrator). */
  readonly fieldDefense?: readonly CoordV7[];
}

export function martianUiFieldV7(
  pieces: readonly MartianUiPieceV7[],
  options: MartianUiOptionsV7 = {},
): GameStateV7 {
  const water = options.water ?? [];
  const arena = goblinArenaV7(
    options.factions ?? ["MARTIAN", "ORIGINAL"],
    pieces,
    {
      water,
      ...(options.techs === undefined ? {} : { techs: options.techs }),
      ...(options.coins === undefined ? {} : { coins: options.coins }),
    },
  );
  const homed = options.homed ?? [];
  const fortified = options.fieldDefense ?? [];
  const state = checkedV7({
    ...arena,
    treasureChests: [],
    players: arena.players.map((player) => ({
      ...player,
      achievementEntitlements: player.achievementEntitlements.map(
        (entitlement) => ({
          ...entitlement,
          unlocked: player.researchedTechs.includes(
            entitlement.achievement === "EXPLORER"
              ? "SCOUTING"
              : entitlement.achievement === "ENGINEER"
                ? "ENGINEERING"
                : "DRILL",
          ),
        }),
      ),
    })),
    units: arena.units.map((unit) =>
      homed.some((at) => sameV7(at, unit.at))
        ? unit
        : { ...unit, homeCityId: null },
    ),
    board: {
      ...arena.board,
      tiles: arena.board.tiles.map((tile) =>
        tile.site !== null || water.some((at) => sameV7(at, tile.at))
          ? tile
          : {
              ...tile,
              biome: "PLAINS" as const,
              terrain: "GRASS" as const,
              resource: null,
              improvement: null,
              road: false,
              fieldDefense: fortified.some((at) => sameV7(at, tile.at)),
            },
      ),
    },
  });
  const unitOf = (piece: MartianUiPieceV7): UnitStateV7 =>
    unitAtV7(state, piece.at);
  const thralls = pieces
    .filter((piece) => piece.thrallOf !== undefined)
    .map((piece) => ({
      unitId: unitOf(piece).id,
      brainUnitId: unitAtV7(state, piece.thrallOf as CoordV7).id,
    }))
    .sort((left, right) => left.unitId - right.unitId);
  const lookup = { players: state.players, thralls };
  return checkedV7({
    ...state,
    shields: pieces
      .flatMap((piece) => {
        const unit = unitOf(piece);
        const shield = piece.shield ?? unitShieldMaximumV7(lookup, unit);
        return shield > 0 ? [{ unitId: unit.id, shield }] : [];
      })
      .sort((left, right) => left.unitId - right.unitId),
    cooling: pieces
      .filter((piece) => piece.cooling !== undefined)
      .map((piece) => ({
        unitId: unitOf(piece).id,
        firedThisTurn: piece.cooling === "FIRED",
      }))
      .sort((left, right) => left.unitId - right.unitId),
    thralls,
    mindControlCooldowns: pieces
      .filter((piece) => piece.cooldown !== undefined)
      .map((piece) => ({
        unitId: unitOf(piece).id,
        turnsRemaining: piece.cooldown as number,
      }))
      .sort((left, right) => left.unitId - right.unitId),
  });
}

/** Where everything stands in `martianUiFixtureV7`. */
export const MARTIAN_UI_V7 = {
  /** Unmoved Saucer: Beam Down the capital's Grunt next to it. */
  saucer: { x: 8, y: 6 },
  /** Grunt on the capital center: the Beam Down passenger. */
  capitalGrunt: { x: 8, y: 8 },
  /**
   * Unmoved Ray Gunner, two tiles from an enemy Guard on Field Defense in
   * its own territory (the Disintegrator ignores the fortification).
   */
  rayGunner: { x: 5, y: 7 },
  rayTarget: { x: 3, y: 7 },
  /**
   * Unmoved Tripod: a Fighter two tiles diagonal with a Marksman behind it
   * (`pulp_wars-b5f.2`: the Tripod fires at range 2 only).
   */
  tripod: { x: 2, y: 2 },
  pierceTarget: { x: 4, y: 4 },
  pierceVictim: { x: 5, y: 5 },
  /** Two tiles south: an enemy Fighter with an own Grunt behind it. */
  friendlyTarget: { x: 2, y: 4 },
  friendlyVictim: { x: 2, y: 5 },
  /** Brain with a weakened enemy in reach, a healthy one, one on a village. */
  brain: { x: 5, y: 6 },
  weakTarget: { x: 3, y: 6 },
  healthyTarget: { x: 4, y: 5 },
  protectedTarget: { x: 5, y: 8 },
  /** The Brain's Thrall. */
  thrall: { x: 6, y: 5 },
  /** Mothership two tiles from an enemy Raider (pulled to `pullTo`). */
  mothership: { x: 9, y: 2 },
  pullTarget: { x: 9, y: 4 },
  pullTo: { x: 9, y: 3 },
  /** Shield Projector with an own Grunt (Shield 1 of 2) beside it. */
  projector: { x: 7, y: 3 },
  dentedGrunt: { x: 7, y: 2 },
  /** A Cooling Ray Gunner. */
  coolingGunner: { x: 0, y: 0 },
  /** A Colossus (reward only). */
  colossus: { x: 0, y: 4 },
  /** A Saucer and a Tripod afloat on Shallow Water. */
  saucerAfloat: { x: 10, y: 1 },
  tripodAfloat: { x: 10, y: 0 },
} as const;

/**
 * Seat 0 (Martian) with every ability ready, against seat 1 (Human by
 * default; `enemy` picks another faction). Every technology is researched,
 * so Force Fields and the Disintegrator apply.
 */
export function martianUiFixtureV7(
  enemy: FactionIdV7 = "ORIGINAL",
): GameStateV7 {
  const at = MARTIAN_UI_V7;
  return martianUiFieldV7(
    [
      { seat: 0, role: "RAIDER", at: at.saucer },
      { seat: 0, role: "FIGHTER", at: at.capitalGrunt },
      { seat: 0, role: "MARKSMAN", at: at.rayGunner },
      { seat: 0, role: "CATAPULT", at: at.tripod },
      { seat: 0, role: "FIGHTER", at: at.friendlyVictim },
      { seat: 0, role: "CAPTAIN", at: at.brain },
      { seat: 0, role: "FIGHTER", at: at.thrall, hp: 4, thrallOf: at.brain },
      { seat: 0, role: "KNIGHT", at: at.mothership },
      { seat: 0, role: "GUARD", at: at.projector },
      { seat: 0, role: "FIGHTER", at: at.dentedGrunt, shield: 1 },
      { seat: 0, role: "MARKSMAN", at: at.coolingGunner, cooling: "COOLING" },
      { seat: 0, role: "JUGGERNAUT", at: at.colossus },
      { seat: 0, role: "RAIDER", at: at.saucerAfloat, form: "EMBARKED" },
      { seat: 0, role: "CATAPULT", at: at.tripodAfloat, form: "EMBARKED" },
      { seat: 1, role: "GUARD", at: at.rayTarget },
      { seat: 1, role: "FIGHTER", at: at.pierceTarget },
      { seat: 1, role: "MARKSMAN", at: at.pierceVictim },
      { seat: 1, role: "FIGHTER", at: at.friendlyTarget },
      { seat: 1, role: "MARKSMAN", at: at.weakTarget, hp: 5 },
      { seat: 1, role: "FIGHTER", at: at.healthyTarget },
      { seat: 1, role: "FIGHTER", at: at.protectedTarget, hp: 3 },
      { seat: 1, role: "RAIDER", at: at.pullTarget },
    ],
    {
      factions: ["MARTIAN", enemy],
      water: [at.saucerAfloat, at.tripodAfloat, { x: 9, y: 0 }],
      fieldDefense: [at.rayTarget],
    },
  );
}

/**
 * Two Martian seats: the human's Ray Gunner two tiles from an enemy Grunt
 * in a Force Field (Shield 4), and its Tripod two tiles from an enemy Grunt
 * (whose ray pistol answers at range 2, `pulp_wars-b5f.2`) with a
 * dented Shield: the attack previews name the Shield on both sides.
 */
export const MARTIAN_DUEL_V7 = {
  rayGunner: { x: 5, y: 2 },
  shieldedGrunt: { x: 5, y: 4 },
  enemyProjector: { x: 6, y: 4 },
  tripod: { x: 2, y: 2 },
  dentedGrunt: { x: 2, y: 4 },
} as const;

export function martianDuelFixtureV7(): GameStateV7 {
  const at = MARTIAN_DUEL_V7;
  return martianUiFieldV7(
    [
      { seat: 0, role: "MARKSMAN", at: at.rayGunner },
      { seat: 0, role: "CATAPULT", at: at.tripod },
      { seat: 1, role: "FIGHTER", at: at.shieldedGrunt, shield: 4 },
      { seat: 1, role: "GUARD", at: at.enemyProjector },
      { seat: 1, role: "FIGHTER", at: at.dentedGrunt, shield: 1 },
    ],
    { factions: ["MARTIAN", "MARTIAN"] },
  );
}
