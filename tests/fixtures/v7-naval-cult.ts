import {
  parseGameStateV7,
  type CoordV7,
  type FactionIdV7,
  type GameStateV7,
  type TechnologyIdV7,
  type UnitRoleIdV7,
  type UnitStateV7,
} from "../../src/engine/index";
import {
  NAVAL_TECHS_V7,
  navalArenaV7,
  navalUnitAtV7,
  patchNavalUnitV7,
  seatV7,
} from "./v7-naval-branch";

/**
 * Themed naval branches, the Deep Ones (`pulp_wars-5ti.22`,
 * docs/product/RULESET_7_NAVAL_FACTIONS.md section 9): small authored
 * straits for the Cult tests and static interface captures. No match is
 * played. The strait is the shared arena of `v7-naval-branch.ts`: rows 0
 * to 2 and 8 to 10 are land, rows 3 and 7 Shallow Water, rows 4 to 6 Deep
 * Water; seat 0's capital is on (5, 2) with a Port on (4, 3), seat 1's on
 * (5, 8) with a Port on (6, 7).
 */

/** The Cult seat's research: every naval technology. */
export const CULT_NAVAL_TECHS_V7: readonly TechnologyIdV7[] = NAVAL_TECHS_V7;
/** The same without Offerings to the Deep (Seamanship) and the Kraken. */
export const CULT_WITHOUT_OFFERINGS_V7: readonly TechnologyIdV7[] =
  NAVAL_TECHS_V7.filter(
    (tech) => tech !== "SEAMANSHIP" && tech !== "SUBMERSIBLES",
  );

export interface CultPieceV7 {
  readonly seat: 0 | 1;
  readonly role: UnitRoleIdV7;
  readonly at: CoordV7;
  readonly hp?: number;
  /** The tiles its Move entered this turn (it moved and may still act). */
  readonly ran?: number;
  /** An embarked land unit (a transport) on this water tile. */
  readonly embarkedAt?: CoordV7;
}

/** A strait with the pieces, every tile explored by both seats. */
export function cultStraitV7(options: {
  readonly factions?: readonly [FactionIdV7, FactionIdV7];
  readonly pieces: readonly CultPieceV7[];
  readonly technologies?: readonly [
    readonly TechnologyIdV7[],
    readonly TechnologyIdV7[],
  ];
  /** The Favour of the Cult seat(s) (2 by default, the starting Favour). */
  readonly favour?: number;
}): GameStateV7 {
  const factions = options.factions ?? ["CULT", "ORIGINAL"];
  let state = navalArenaV7({
    factions,
    technologies: options.technologies ?? [NAVAL_TECHS_V7, NAVAL_TECHS_V7],
    units: options.pieces.map((piece) => ({
      seat: piece.seat,
      role: piece.role,
      at: piece.at,
    })),
  });
  for (const piece of options.pieces) {
    const unit = navalUnitAtV7(state, piece.at);
    const patch: Partial<UnitStateV7> = {
      ...(piece.hp === undefined ? {} : { hp: piece.hp }),
      ...(piece.embarkedAt === undefined
        ? {}
        : { at: piece.embarkedAt, form: "EMBARKED" as const }),
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
  if (options.favour === undefined) return state;
  const favour = options.favour;
  const cultIds = ([0, 1] as const)
    .filter((seat) => factions[seat] === "CULT")
    .map((seat) => seatV7(state, seat).id);
  const parsed = parseGameStateV7({
    ...state,
    cult: {
      ...state.cult,
      favour:
        favour <= 0
          ? state.cult.favour.filter(
              (entry) => !cultIds.includes(entry.playerId),
            )
          : [
              ...state.cult.favour.filter(
                (entry) => !cultIds.includes(entry.playerId),
              ),
              ...cultIds.map((playerId) => ({ playerId, favour })),
            ].sort((left, right) => left.playerId - right.playerId),
    },
  });
  if (parsed === null) throw new Error("the Favour strait is invalid");
  return parsed;
}

/**
 * The interface fixtures: the coordinates of the Cult fleet captures. The
 * Kraken lies in the Deep Water beside a Human transport (a Fighter) and a
 * Human Patrol Boat, which its Drag holds; the Black Gondola lies beside a
 * second Human transport, a wounded Knight, it sinks for 4 Favour; the
 * Galleon of the Eye keeps its distance.
 */
export const CULT_FLEET_UI_V7 = {
  kraken: { x: 5, y: 5 },
  transport: { x: 6, y: 5 },
  transportFrom: { x: 6, y: 8 },
  boat: { x: 4, y: 6 },
  gondola: { x: 2, y: 4 },
  ferry: { x: 2, y: 5 },
  ferryFrom: { x: 2, y: 8 },
  galleon: { x: 8, y: 3 },
} as const satisfies Record<string, CoordV7>;

/** The Cult fleet capture (the Kraken's Drag ring; an Offering preview). */
export function cultFleetFixtureV7(): GameStateV7 {
  return cultStraitV7({
    favour: 6,
    pieces: [
      { seat: 0, role: "SUBMARINE", at: CULT_FLEET_UI_V7.kraken },
      { seat: 0, role: "PATROL_BOAT", at: CULT_FLEET_UI_V7.gondola },
      { seat: 0, role: "BATTLESHIP", at: CULT_FLEET_UI_V7.galleon },
      {
        seat: 1,
        role: "FIGHTER",
        at: CULT_FLEET_UI_V7.transportFrom,
        embarkedAt: CULT_FLEET_UI_V7.transport,
      },
      {
        seat: 1,
        role: "KNIGHT",
        at: CULT_FLEET_UI_V7.ferryFrom,
        embarkedAt: CULT_FLEET_UI_V7.ferry,
        hp: 5,
      },
      { seat: 1, role: "PATROL_BOAT", at: CULT_FLEET_UI_V7.boat },
    ],
  });
}
