import type {
  CoordV7,
  FactionIdV7,
  GameStateV7,
  TechnologyIdV7,
  UnitRoleIdV7,
  UnitStateV7,
} from "../../src/engine/index";
import {
  NAVAL_TECHS_V7,
  navalArenaV7,
  navalUnitAtV7,
  patchNavalUnitV7,
} from "./v7-naval-branch";

/**
 * Themed naval branches, Ironclads and Sea Tunnels (`pulp_wars-5ti.20`,
 * docs/product/RULESET_7_NAVAL_FACTIONS.md section 7): small authored
 * straits for the Dwarf tests and static interface captures. No match is
 * played.
 *
 * `SEA_TUNNEL_STRAIT_V7` (the two-tile strait): rows 0 to 2 are land with a
 * peninsula on columns 0 to 2 down to row 5; rows 6 and 7 are water (every
 * tile of them Shallow on columns 0 to 2, where land lies to the north and
 * the south); rows 8 to 10 are land. A Steam Mole on (1, 5) reaches (1, 8)
 * in three steps under the two Shallow tiles (1, 6) and (1, 7). Elsewhere
 * rows 3 to 6 east of the peninsula are open sea (Deep away from land).
 * Seat 0's capital is on (5, 2) with a Port on (4, 3); seat 1's on (5, 8)
 * with a Port on (6, 7).
 *
 * `SEA_TUNNEL_NARROW_V7` (the one-tile strait): the peninsula reaches row
 * 6, so (1, 7) is the only water between (1, 6) and (1, 8).
 */
export const SEA_TUNNEL_STRAIT_V7: readonly string[] = [
  "...........",
  "...........",
  "...........",
  "...~~~~~~~~",
  "...~~~~~~~~",
  "...~~~~~~~~",
  "~~~~~~~~~~~",
  "~~~~~~~~~~~",
  "...........",
  "...........",
  "...........",
];
export const SEA_TUNNEL_NARROW_V7: readonly string[] = [
  "...........",
  "...........",
  "...........",
  "...~~~~~~~~",
  "...~~~~~~~~",
  "...~~~~~~~~",
  "...~~~~~~~~",
  "~~~~~~~~~~~",
  "...........",
  "...........",
  "...........",
];

/** The Dwarf seat's research: every naval technology and Dig In (the Mole). */
export const DWARF_NAVAL_TECHS_V7: readonly TechnologyIdV7[] = [
  ...NAVAL_TECHS_V7,
  "DRILL",
  "FORTIFICATION",
];
/** The same without Sea Tunnels (Seamanship) and Submersibles after it. */
export const DWARF_WITHOUT_SEA_TUNNELS_V7: readonly TechnologyIdV7[] =
  DWARF_NAVAL_TECHS_V7.filter(
    (tech) => tech !== "SEAMANSHIP" && tech !== "SUBMERSIBLES",
  );

export interface DwarfPieceV7 {
  readonly seat: 0 | 1;
  readonly role: UnitRoleIdV7;
  readonly at: CoordV7;
  readonly hp?: number;
  /** The tiles its Move entered this turn (it moved and may still act). */
  readonly ran?: number;
}

/** A strait with the pieces, every tile explored by both seats. */
export function dwarfStraitV7(options: {
  readonly factions?: readonly [FactionIdV7, FactionIdV7];
  readonly pieces: readonly DwarfPieceV7[];
  readonly technologies?: readonly [
    readonly TechnologyIdV7[],
    readonly TechnologyIdV7[],
  ];
  readonly terrain?: readonly string[];
  readonly ports?: readonly [boolean, boolean];
  readonly third?: { readonly faction: FactionIdV7 };
}): GameStateV7 {
  let state = navalArenaV7({
    factions: options.factions ?? ["DWARF", "ORIGINAL"],
    technologies: options.technologies ?? [
      DWARF_NAVAL_TECHS_V7,
      NAVAL_TECHS_V7,
    ],
    units: options.pieces.map((piece) => ({
      seat: piece.seat,
      role: piece.role,
      at: piece.at,
    })),
    ...(options.terrain === undefined ? {} : { terrain: options.terrain }),
    ...(options.ports === undefined ? {} : { ports: options.ports }),
    ...(options.third === undefined
      ? {}
      : { third: { faction: options.third.faction, explored: true } }),
  });
  for (const piece of options.pieces) {
    const unit = navalUnitAtV7(state, piece.at);
    const patch: Partial<UnitStateV7> = {
      ...(piece.hp === undefined ? {} : { hp: piece.hp }),
      ...(piece.ran === undefined
        ? {}
        : {
            activation: {
              ...unit.activation,
              moved: true,
              movedPathLength: piece.ran,
            },
          }),
    };
    if (Object.keys(patch).length > 0)
      state = patchNavalUnitV7(state, unit.id, patch);
  }
  return state;
}

/**
 * The interface fixtures: the coordinates of the Dwarf fleet capture and of
 * the Sea Tunnel capture.
 */
export const DWARF_FLEET_UI_V7 = {
  launch: { x: 4, y: 4 },
  ironclad: { x: 7, y: 4 },
  bell: { x: 8, y: 6 },
  boat: { x: 5, y: 4 },
  battleship: { x: 9, y: 6 },
  mole: { x: 1, y: 5 },
  hammerer: { x: 1, y: 4 },
  guard: { x: 2, y: 9 },
} as const satisfies Record<string, CoordV7>;

/**
 * The Ironclad fleet: a Steam Launch that has just moved beside a Human
 * Patrol Boat (its Ram, the Armoured reply), an Ironclad, and a Diving Bell
 * beside a Human Battleship, on the two-tile strait.
 */
export function dwarfFleetFixtureV7(): GameStateV7 {
  const state = dwarfStraitV7({
    terrain: SEA_TUNNEL_STRAIT_V7,
    pieces: [
      { seat: 0, role: "PATROL_BOAT", at: DWARF_FLEET_UI_V7.launch, ran: 1 },
      { seat: 0, role: "BATTLESHIP", at: DWARF_FLEET_UI_V7.ironclad },
      { seat: 0, role: "SUBMARINE", at: DWARF_FLEET_UI_V7.bell },
      { seat: 1, role: "PATROL_BOAT", at: DWARF_FLEET_UI_V7.boat },
      { seat: 1, role: "BATTLESHIP", at: DWARF_FLEET_UI_V7.battleship },
    ],
  });
  return state;
}

/**
 * Sea Tunnels: a Steam Mole on the tip of the peninsula with a Hammerer
 * beside it, facing the two-tile strait, and a hostile Fighter on the far
 * coast beside the landing.
 */
export function dwarfSeaTunnelFixtureV7(): GameStateV7 {
  return dwarfStraitV7({
    terrain: SEA_TUNNEL_STRAIT_V7,
    pieces: [
      { seat: 0, role: "GUARD", at: DWARF_FLEET_UI_V7.mole },
      { seat: 0, role: "FIGHTER", at: DWARF_FLEET_UI_V7.hammerer },
      { seat: 1, role: "FIGHTER", at: DWARF_FLEET_UI_V7.guard },
    ],
  });
}
