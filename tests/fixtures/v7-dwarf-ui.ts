import {
  applyCommandV7,
  type CoordV7,
  type FactionIdV7,
  type GameStateV7,
  type TechnologyIdV7,
  type UnitStateV7,
} from "../../src/engine/index";
import { checkedV7 } from "./v7-builders";
import { sameV7, unitAtV7 } from "./v7-goblin-arena";
import { martianUiFieldV7, type MartianUiPieceV7 } from "./v7-martian-ui";

/**
 * Dwarf UI fixtures (bead pulp_wars-78i.6) on the seed-2 11 x 11 arena of
 * the Martian UI fixtures (seat 0 is the human; capitals (8, 8) and (2, 8)
 * with territories x 7-9 and x 1-3, y 7-9; villages (5, 5), (8, 5),
 * (5, 8)). Every land tile that is not a settlement is open Grass unless a
 * `forest` or `mountain` option says otherwise; `water` tiles are Shallow
 * Water. Mounds are made by moving the units on `burrowed` tiles into
 * `GameStateV7.burrowed` with the exhausted activation. The module imports
 * no test runner, so the browser review mounts it through the dev server.
 */
export interface DwarfUiPieceV7 extends MartianUiPieceV7 {
  /** Burrow this unit: a Mole (`"MOLE"`) or the rider of the Mole on `moleAt`. */
  readonly burrow?: "MOLE" | { readonly moleAt: CoordV7 };
}

export interface DwarfUiOptionsV7 {
  readonly factions?: readonly FactionIdV7[];
  readonly forest?: readonly CoordV7[];
  readonly mountain?: readonly CoordV7[];
  readonly water?: readonly CoordV7[];
  readonly fieldDefense?: readonly CoordV7[];
  readonly techs?: Readonly<Record<number, readonly TechnologyIdV7[]>>;
  readonly coins?: number;
  /** Seat-0 tiles whose unit stays homed to the capital. */
  readonly homed?: readonly CoordV7[];
  /** Units bombed this turn (the Dwarf seat must be active). */
  readonly bombed?: readonly CoordV7[];
  /** Units that surfaced this turn (owned by the active Dwarf seat). */
  readonly surfaced?: readonly CoordV7[];
}

/** The exhausted activation every burrowed unit has. */
const EXHAUSTED: UnitStateV7["activation"] = {
  moved: true,
  movedPathLength: 0,
  attacked: true,
  attacksUsed: 1,
  tendedThisTurn: false,
  inspired: false,
  overrunActive: false,
  escapeAvailable: false,
  recovered: true,
  captured: true,
  handled: true,
  specialActed: true,
};

export function dwarfUiFieldV7(
  pieces: readonly DwarfUiPieceV7[],
  options: DwarfUiOptionsV7 = {},
): GameStateV7 {
  const base = martianUiFieldV7(pieces, {
    factions: options.factions ?? ["DWARF", "ORIGINAL"],
    ...(options.water === undefined ? {} : { water: options.water }),
    ...(options.techs === undefined ? {} : { techs: options.techs }),
    ...(options.coins === undefined ? {} : { coins: options.coins }),
    ...(options.homed === undefined ? {} : { homed: options.homed }),
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
          : among(options.forest, tile.at)
            ? {
                ...tile,
                terrain: "FOREST" as const,
                biome: "WOODLAND" as const,
              }
            : among(options.mountain, tile.at)
              ? {
                  ...tile,
                  terrain: "MOUNTAIN" as const,
                  biome: "HIGHLANDS" as const,
                }
              : tile,
      ),
    },
  });
  const burrowing = pieces.filter((piece) => piece.burrow !== undefined);
  const ids = new Map(
    burrowing.map(
      (piece) => [unitAtV7(terrained, piece.at).id, piece] as const,
    ),
  );
  const burrowed = [...ids].map(([unitId, piece]) => {
    const unit = terrained.units.find(
      (candidate) => candidate.id === unitId,
    ) as UnitStateV7;
    return {
      unit: { ...unit, captureEligible: false, activation: EXHAUSTED },
      moleUnitId:
        piece.burrow === "MOLE" || piece.burrow === undefined
          ? null
          : unitAtV7(terrained, piece.burrow.moleAt).id,
    };
  });
  const listed = (list: readonly CoordV7[] | undefined): UnitStateV7["id"][] =>
    (list ?? [])
      .map((at) => unitAtV7(terrained, at).id)
      .sort((left, right) => left - right);
  return checkedV7({
    ...terrained,
    units: terrained.units.filter((unit) => !ids.has(unit.id)),
    shields: terrained.shields.filter((entry) => !ids.has(entry.unitId)),
    burrowed: burrowed.sort((left, right) => left.unit.id - right.unit.id),
    bombedThisTurn: listed(options.bombed),
    surfacedThisTurn: listed(options.surfaced),
  });
}

/** Where everything stands in `dwarfUiFixtureV7`. */
export const DWARF_UI_V7 = {
  /** Unmoved Steam Mole with a fresh Hammerer next to it (the rider). */
  mole: { x: 7, y: 2 },
  rider: { x: 8, y: 2 },
  /** The Tunnel destination next to an enemy Catapult and Captain. */
  tunnelTo: { x: 4, y: 2 },
  tunnelCatapult: { x: 4, y: 1 },
  tunnelCaptain: { x: 4, y: 3 },
  /** Unmoved Gyrocopter two tiles from an enemy Marksman. */
  gyrocopter: { x: 4, y: 0 },
  bombTarget: { x: 2, y: 2 },
  /** A burrowed Mole and its rider next to two enemies. */
  mound: { x: 2, y: 4 },
  moundRider: { x: 3, y: 4 },
  moundFighter: { x: 1, y: 5 },
  moundGuard: { x: 2, y: 5 },
  /** Engineer homed to the capital, a wounded Steam Tank and Hammerer. */
  engineer: { x: 9, y: 6 },
  woundedTank: { x: 10, y: 6 },
  woundedHammerer: { x: 9, y: 7 },
  /** Unmoved, wounded Clockwork Gunner two tiles from the enemy Captain. */
  gunner: { x: 6, y: 4 },
  /**
   * Unmoved Steam Cannon: an enemy Guard two tiles away is knocked back to
   * `knockTo`; an enemy Guard on Field Defense in its own territory cannot
   * be (its push tile is the enemy capital), and Blasting Charges ignore
   * its fortification.
   */
  cannon: { x: 6, y: 6 },
  knockTarget: { x: 4, y: 6 },
  knockTo: { x: 3, y: 6 },
  blockedTarget: { x: 3, y: 7 },
  /** Dug in: a Hammerer and a Mole by the capital; one that moved. */
  dugInHammerer: { x: 7, y: 8 },
  dugInMole: { x: 9, y: 9 },
  movedHammerer: { x: 7, y: 9 },
  /** A Brass Titan (reward only). */
  titan: { x: 10, y: 9 },
} as const;

/**
 * Seat 0 (Dwarf) with every ability ready, against seat 1 (Human by
 * default; `enemy` picks another faction). Every technology is researched,
 * so Dig In, Blasting Charges (eruption 3, the Cannon ignores
 * fortification), Dive (bomb 6) and Assemble apply.
 */
export function dwarfUiFixtureV7(enemy: FactionIdV7 = "ORIGINAL"): GameStateV7 {
  const at = DWARF_UI_V7;
  return dwarfUiFieldV7(
    [
      { seat: 0, role: "GUARD", at: at.mole },
      { seat: 0, role: "FIGHTER", at: at.rider },
      { seat: 0, role: "RAIDER", at: at.gyrocopter },
      { seat: 0, role: "GUARD", at: at.mound, hp: 12, burrow: "MOLE" },
      {
        seat: 0,
        role: "FIGHTER",
        at: at.moundRider,
        burrow: { moleAt: at.mound },
      },
      { seat: 0, role: "CAPTAIN", at: at.engineer },
      { seat: 0, role: "SWORDSMAN", at: at.woundedTank, hp: 9 },
      { seat: 0, role: "FIGHTER", at: at.woundedHammerer, hp: 8 },
      { seat: 0, role: "MARKSMAN", at: at.gunner, hp: 7 },
      { seat: 0, role: "CATAPULT", at: at.cannon },
      { seat: 0, role: "FIGHTER", at: at.dugInHammerer },
      { seat: 0, role: "GUARD", at: at.dugInMole },
      {
        seat: 0,
        role: "FIGHTER",
        at: at.movedHammerer,
        activation: { moved: true, movedPathLength: 1 },
      },
      { seat: 0, role: "JUGGERNAUT", at: at.titan },
      { seat: 1, role: "CATAPULT", at: at.tunnelCatapult },
      { seat: 1, role: "CAPTAIN", at: at.tunnelCaptain },
      { seat: 1, role: "MARKSMAN", at: at.bombTarget },
      { seat: 1, role: "FIGHTER", at: at.moundFighter },
      { seat: 1, role: "GUARD", at: at.moundGuard },
      { seat: 1, role: "GUARD", at: at.knockTarget },
      { seat: 1, role: "GUARD", at: at.blockedTarget },
    ],
    {
      factions: ["DWARF", enemy],
      homed: [at.engineer],
      fieldDefense: [at.tunnelCaptain, at.blockedTarget],
    },
  );
}

/**
 * The other side: a Human viewer (seat 0) against a Dwarf seat (seat 1)
 * whose capital is (2, 8). The Human Fighter next to a dug-in Hammerer, a
 * Human Catapult three tiles from a Steam Tank (Plated), a Human Knight next
 * to a Clockwork Gunner, and a Dwarf mound next to Human units.
 */
export const DWARF_VICTIM_V7 = {
  dugInHammerer: { x: 3, y: 7 },
  fighter: { x: 4, y: 6 },
  tank: { x: 6, y: 3 },
  catapult: { x: 6, y: 6 },
  gunner: { x: 9, y: 3 },
  knight: { x: 9, y: 4 },
  mound: { x: 6, y: 1 },
  moundNeighbour: { x: 7, y: 1 },
} as const;

export function dwarfVictimFixtureV7(): GameStateV7 {
  const at = DWARF_VICTIM_V7;
  return dwarfUiFieldV7(
    [
      { seat: 0, role: "FIGHTER", at: at.fighter },
      { seat: 0, role: "CATAPULT", at: at.catapult },
      { seat: 0, role: "KNIGHT", at: at.knight },
      { seat: 0, role: "MARKSMAN", at: at.moundNeighbour },
      { seat: 1, role: "FIGHTER", at: at.dugInHammerer },
      { seat: 1, role: "SWORDSMAN", at: at.tank },
      { seat: 1, role: "MARKSMAN", at: at.gunner },
      { seat: 1, role: "GUARD", at: at.mound, burrow: "MOLE" },
    ],
    { factions: ["ORIGINAL", "DWARF"] },
  );
}

/**
 * The surfacing (spec 5.4): the Dwarf viewer's mound next to two enemies,
 * on the enemy's turn (`dwarfEruptionBeforeFixtureV7`); the enemy's End
 * Turn starts the Dwarf turn and the Mole erupts
 * (`dwarfEruptionAfterFixtureV7` is the state after it).
 */
export function dwarfEruptionBeforeFixtureV7(): GameStateV7 {
  const state = dwarfUiFixtureV7();
  return checkedV7({
    ...state,
    activeSeatIndex: state.turnOrder.indexOf(
      state.players.find((player) => player.faction !== "DWARF")?.id ??
        state.humanPlayerId,
    ),
  });
}

export function dwarfEruptionAfterFixtureV7(): GameStateV7 {
  const before = dwarfEruptionBeforeFixtureV7();
  const active = before.turnOrder[before.activeSeatIndex];
  if (active === undefined) throw new Error("no active seat");
  const result = applyCommandV7(before, active, { kind: "END_TURN" });
  if (!result.accepted) throw new Error(result.error.code);
  return result.state;
}

/**
 * The Dwarf fleet at sea: a Patrol Boat, a Battleship and an embarked
 * Hammerer (the transport) beside a Human Patrol Boat, on a Shallow Water
 * lane along the east edge.
 */
export const DWARF_FLEET_V7 = {
  patrolBoat: { x: 10, y: 2 },
  battleship: { x: 10, y: 4 },
  transport: { x: 9, y: 3 },
  enemyBoat: { x: 10, y: 6 },
  water: [
    { x: 9, y: 1 },
    { x: 10, y: 1 },
    { x: 9, y: 2 },
    { x: 10, y: 2 },
    { x: 9, y: 3 },
    { x: 10, y: 3 },
    { x: 9, y: 4 },
    { x: 10, y: 4 },
    { x: 10, y: 5 },
    { x: 10, y: 6 },
  ],
} as const;

export function dwarfFleetFixtureV7(): GameStateV7 {
  const at = DWARF_FLEET_V7;
  return dwarfUiFieldV7(
    [
      { seat: 0, role: "PATROL_BOAT", at: at.patrolBoat, form: "NAVAL" },
      { seat: 0, role: "BATTLESHIP", at: at.battleship, form: "NAVAL" },
      { seat: 0, role: "FIGHTER", at: at.transport, form: "EMBARKED" },
      { seat: 1, role: "PATROL_BOAT", at: at.enemyBoat, form: "NAVAL" },
    ],
    { water: at.water },
  );
}

/**
 * The Dig In earthwork beside the ready ring (bead pulp_wars-78i.9): round
 * the Dwarf capital (8, 8), a ready dug-in Hammerer and Mole, the same two
 * spent (they attacked without moving: still dug in, no ready ring), a
 * ready Hammerer garrisoned on the capital (dug in on the center) and a
 * Hammerer that moved (not dug in). The ready Mole has two Hammerers that
 * can ride its tunnel: the wounded one beside it and the garrisoned one
 * (full HP, so it is seated first); an enemy Fighter stands to the west.
 */
export const DWARF_DIG_IN_V7 = {
  readyHammerer: { x: 7, y: 8 },
  spentHammerer: { x: 9, y: 8 },
  readyMole: { x: 7, y: 7 },
  spentMole: { x: 9, y: 9 },
  garrisoned: { x: 8, y: 8 },
  movedHammerer: { x: 7, y: 9 },
  enemy: { x: 4, y: 7 },
} as const;

export function dwarfDigInFixtureV7(): GameStateV7 {
  const at = DWARF_DIG_IN_V7;
  const spent = { attacked: true, attacksUsed: 1, handled: true } as const;
  return dwarfUiFieldV7([
    { seat: 0, role: "FIGHTER", at: at.readyHammerer, hp: 7 },
    { seat: 0, role: "FIGHTER", at: at.spentHammerer, activation: spent },
    { seat: 0, role: "GUARD", at: at.readyMole },
    { seat: 0, role: "GUARD", at: at.spentMole, activation: spent },
    { seat: 0, role: "FIGHTER", at: at.garrisoned },
    {
      seat: 0,
      role: "FIGHTER",
      at: at.movedHammerer,
      activation: { moved: true, movedPathLength: 1 },
    },
    { seat: 1, role: "FIGHTER", at: at.enemy },
  ]);
}
