import {
  GROWTH_KILLS_V7,
  effectiveRoleRuleV7,
  type CoordV7,
  type FactionIdV7,
  type GameStateV7,
  type UnitRoleIdV7,
} from "../../src/engine/index";
import { withEggsV7, withKillsV7 } from "./v7-dinosaur-arena";
import { iceFolkUiFieldV7, type IceFolkUiPieceV7 } from "./v7-ice-folk-ui";

/**
 * Faction looks without base plates (bead pulp_wars-w5j.3): four different
 * factions' armies in contact on the seed-2 16 x 16 Dry Land arena (seat 0
 * is the human, capitals (13, 4), (4, 4), (13, 13) and (4, 13) for seats 0
 * to 3). Every land tile that is not a settlement is open Grass. Seat 0's
 * units are ready (one is spent), so the ready cue shows on several units;
 * several units of every seat are damaged; a Martian seat has a dented
 * Shield; an Ice Folk seat has frozen units of the other seats; a Dinosaur seat has a Big and an Alpha unit and two Eggs (one
 * damaged) beside its capital. The module imports no test runner, so the
 * browser review (scripts/art/faction-looks-review.ts) mounts it through
 * the dev server.
 */
export type FactionLooksFactionsV7 = readonly [
  FactionIdV7,
  FactionIdV7,
  FactionIdV7,
  FactionIdV7,
];

/** The two mixes the review shows: together they field all six factions. */
export const FACTION_LOOKS_MIXES_V7 = {
  A: ["ORIGINAL", "MARTIAN", "ICE_FOLK", "DINOSAUR"],
  B: ["GOBLIN", "UNDEAD", "DINOSAUR", "MARTIAN"],
} as const satisfies Readonly<Record<string, FactionLooksFactionsV7>>;

/** Where the review looks: the middle of the contact. */
export const FACTION_LOOKS_V7 = {
  focus: { x: 9, y: 9 },
  /** Seat 0's ready Knight, selected in the "selected" capture. */
  selected: { x: 9, y: 8 },
  capitals: [
    { x: 13, y: 4 },
    { x: 4, y: 4 },
    { x: 13, y: 13 },
    { x: 4, y: 13 },
  ],
} as const;

interface LookPiece {
  readonly seat: 0 | 1 | 2 | 3;
  readonly role: UnitRoleIdV7;
  readonly at: CoordV7;
  /** Share of the maximum HP left (default: full). */
  readonly health?: number;
  readonly spent?: boolean;
  /** Frozen by an Ice Folk seat, when the mix has one. */
  readonly frozen?: true;
  /** Kills for growth, when the seat is Dinosaur (1 Big, 2 Alpha). */
  readonly growth?: 1 | 2;
  /** Current Shield, when the seat is Martian (default: its maximum). */
  readonly shield?: number;
}

const PIECES: readonly LookPiece[] = [
  // Seat 0 (the viewer): ready, one spent, two damaged, one frozen.
  { seat: 0, role: "CATAPULT", at: { x: 7, y: 7 } },
  { seat: 0, role: "FIGHTER", at: { x: 8, y: 8 } },
  { seat: 0, role: "KNIGHT", at: { x: 9, y: 8 } },
  { seat: 0, role: "MARKSMAN", at: { x: 7, y: 9 }, health: 0.4 },
  {
    seat: 0,
    role: "RAIDER",
    at: { x: 8, y: 9 },
    health: 0.7,
    frozen: true,
  },
  { seat: 0, role: "GUARD", at: { x: 8, y: 10 }, spent: true },
  // Seat 1, east of them.
  { seat: 1, role: "RAIDER", at: { x: 10, y: 7 } },
  { seat: 1, role: "FIGHTER", at: { x: 10, y: 8 }, frozen: true },
  { seat: 1, role: "CAPTAIN", at: { x: 11, y: 8 } },
  { seat: 1, role: "MARKSMAN", at: { x: 10, y: 9 }, health: 0.5, shield: 1 },
  { seat: 1, role: "CATAPULT", at: { x: 11, y: 9 } },
  // Seat 2, south-east.
  { seat: 2, role: "FIGHTER", at: { x: 9, y: 10 } },
  { seat: 2, role: "GUARD", at: { x: 10, y: 10 }, health: 0.6 },
  { seat: 2, role: "MARKSMAN", at: { x: 11, y: 10 }, health: 0.3 },
  { seat: 2, role: "CAPTAIN", at: { x: 9, y: 11 } },
  // Seat 3, south-west.
  { seat: 3, role: "RAIDER", at: { x: 6, y: 10 }, growth: 1 },
  { seat: 3, role: "KNIGHT", at: { x: 7, y: 11 }, growth: 2 },
  { seat: 3, role: "CATAPULT", at: { x: 6, y: 11 }, health: 0.5 },
  { seat: 3, role: "FIGHTER", at: { x: 8, y: 11 }, frozen: true },
];

/** Four different factions in contact (FACTION_LOOKS_MIXES_V7). */
export function factionLooksFixtureV7(
  factions: FactionLooksFactionsV7 = FACTION_LOOKS_MIXES_V7.A,
): GameStateV7 {
  const iceFolk = factions.includes("ICE_FOLK");
  const pieces: IceFolkUiPieceV7[] = PIECES.map((piece) => {
    const faction = factions[piece.seat];
    const rule = effectiveRoleRuleV7(piece.role, faction);
    return {
      seat: piece.seat,
      role: piece.role,
      at: piece.at,
      ...(piece.health === undefined
        ? {}
        : { hp: Math.max(1, Math.round(rule.maxHp * piece.health)) }),
      ...(piece.spent === true ? { activation: { handled: true } } : {}),
      ...(piece.frozen === true && iceFolk && faction !== "ICE_FOLK"
        ? { frozen: 1 as const }
        : {}),
      ...(piece.shield !== undefined && faction === "MARTIAN"
        ? { shield: piece.shield }
        : {}),
    };
  });
  let state = iceFolkUiFieldV7(pieces, { factions });
  for (const piece of PIECES)
    if (piece.growth !== undefined && factions[piece.seat] === "DINOSAUR")
      state = withKillsV7(
        state,
        piece.at,
        GROWTH_KILLS_V7[piece.growth - 1] ?? 1,
      );
  const dinosaurSeat = factions.indexOf("DINOSAUR");
  const capital = FACTION_LOOKS_V7.capitals[dinosaurSeat];
  if (dinosaurSeat < 0 || capital === undefined) return state;
  return withEggsV7(state, [
    {
      seat: dinosaurSeat,
      role: "KNIGHT",
      at: { x: capital.x + 1, y: capital.y - 1 },
    },
    {
      seat: dinosaurSeat,
      role: "RAIDER",
      at: { x: capital.x - 1, y: capital.y - 1 },
      hp: 2,
    },
  ]);
}

export function factionLooksMixAFixtureV7(): GameStateV7 {
  return factionLooksFixtureV7(FACTION_LOOKS_MIXES_V7.A);
}

export function factionLooksMixBFixtureV7(): GameStateV7 {
  return factionLooksFixtureV7(FACTION_LOOKS_MIXES_V7.B);
}
