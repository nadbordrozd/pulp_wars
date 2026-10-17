import {
  parseGameStateV7,
  type CoordV7,
  type FactionIdV7,
  type GameStateV7,
  type SugarRushStatusV7,
  type TechnologyIdV7,
  type UnitRoleIdV7,
  type UnitStateV7,
} from "../../src/engine/index";
import {
  NAVAL_TECHS_V7,
  navalArenaV7,
  navalUnitAtV7,
  patchNavalUnitV7,
} from "./v7-naval-branch";

/**
 * Themed naval branches, Sugar Sails (`pulp_wars-5ti.21`,
 * docs/product/RULESET_7_NAVAL_FACTIONS.md section 8): small authored
 * straits for the Candy tests and static interface captures. No match is
 * played. The strait is the shared arena of `v7-naval-branch.ts`: rows 0
 * to 2 and 8 to 10 are land, rows 3 and 7 Shallow Water, rows 4 to 6 Deep
 * Water; seat 0's capital is on (5, 2) with a Port on (4, 3), seat 1's on
 * (5, 8) with a Port on (6, 7).
 */

/** The Candy seat's research: every naval technology. */
export const CANDY_NAVAL_TECHS_V7: readonly TechnologyIdV7[] = NAVAL_TECHS_V7;
/** The same without Sugar Sails (Seamanship) and Submersibles after it. */
export const CANDY_WITHOUT_SUGAR_SAILS_V7: readonly TechnologyIdV7[] =
  NAVAL_TECHS_V7.filter(
    (tech) => tech !== "SEAMANSHIP" && tech !== "SUBMERSIBLES",
  );
/** Every naval technology and Home Sweet Home (Drill, Fortification). */
export const CANDY_HOME_NAVAL_TECHS_V7: readonly TechnologyIdV7[] = [
  ...NAVAL_TECHS_V7,
  "DRILL",
  "FORTIFICATION",
];

export interface CandyPieceV7 {
  readonly seat: 0 | 1;
  readonly role: UnitRoleIdV7;
  readonly at: CoordV7;
  readonly hp?: number;
  /** The tiles its Move entered this turn (it moved and may still act). */
  readonly ran?: number;
  /** An embarked land unit (a transport) on this water tile. */
  readonly embarkedAt?: CoordV7;
  /** Its Sugar Rush phase (a Candy unit). */
  readonly rush?: SugarRushStatusV7["phase"];
}

/** A strait with the pieces, every tile explored by both seats. */
export function candyStraitV7(options: {
  readonly factions?: readonly [FactionIdV7, FactionIdV7];
  readonly pieces: readonly CandyPieceV7[];
  readonly technologies?: readonly [
    readonly TechnologyIdV7[],
    readonly TechnologyIdV7[],
  ];
  readonly third?: { readonly faction: FactionIdV7 };
}): GameStateV7 {
  const factions = options.factions ?? ["CANDY", "ORIGINAL"];
  let state = navalArenaV7({
    factions,
    technologies: options.technologies ?? [
      factions[0] === "CANDY" ? CANDY_NAVAL_TECHS_V7 : NAVAL_TECHS_V7,
      factions[1] === "CANDY" ? CANDY_NAVAL_TECHS_V7 : NAVAL_TECHS_V7,
    ],
    units: options.pieces.map((piece) => ({
      seat: piece.seat,
      role: piece.role,
      at: piece.at,
    })),
    ...(options.third === undefined
      ? {}
      : { third: { faction: options.third.faction, explored: true } }),
  });
  const rush: SugarRushStatusV7[] = [];
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
    if (piece.rush !== undefined)
      rush.push({ unitId: unit.id, phase: piece.rush });
  }
  if (rush.length === 0) return state;
  const parsed = parseGameStateV7({
    ...state,
    sugarRush: rush.sort((left, right) => left.unitId - right.unitId),
  });
  if (parsed === null) throw new Error("the Rushed strait is invalid");
  return parsed;
}

/**
 * The interface fixtures: the coordinates of the Candy fleet captures. The
 * Gumdrop Tug is Rushed beside nothing yet (its Rushed reach of three
 * tiles reaches the Human Patrol Boat); the Pie Galleon lies off the
 * Human coast, beside a Guard that holds the beach next to a landed Toffee
 * Trooper; the Choco Sub lies beside a Human Battleship.
 */
export const CANDY_FLEET_UI_V7 = {
  tug: { x: 2, y: 4 },
  boat: { x: 5, y: 4 },
  galleon: { x: 3, y: 7 },
  guard: { x: 3, y: 8 },
  trooper: { x: 2, y: 8 },
  sub: { x: 8, y: 5 },
  battleship: { x: 8, y: 6 },
} as const satisfies Record<string, CoordV7>;

/** The Candy fleet capture (a Rushed Tug; the Galleon's Splat preview). */
export function candyFleetFixtureV7(): GameStateV7 {
  return candyStraitV7({
    pieces: [
      {
        seat: 0,
        role: "PATROL_BOAT",
        at: CANDY_FLEET_UI_V7.tug,
        rush: "RUSHED",
      },
      { seat: 0, role: "BATTLESHIP", at: CANDY_FLEET_UI_V7.galleon },
      { seat: 0, role: "SUBMARINE", at: CANDY_FLEET_UI_V7.sub },
      { seat: 0, role: "FIGHTER", at: CANDY_FLEET_UI_V7.trooper },
      { seat: 1, role: "PATROL_BOAT", at: CANDY_FLEET_UI_V7.boat },
      { seat: 1, role: "GUARD", at: CANDY_FLEET_UI_V7.guard },
      { seat: 1, role: "BATTLESHIP", at: CANDY_FLEET_UI_V7.battleship },
    ],
  });
}

/**
 * The Crash of a ship: the fleet capture with the Gumdrop Tug Crashed (its
 * Rush of the last turn) and the Choco Sub Rushed.
 */
export function candyCrashFixtureV7(): GameStateV7 {
  return candyStraitV7({
    pieces: [
      {
        seat: 0,
        role: "PATROL_BOAT",
        at: CANDY_FLEET_UI_V7.tug,
        rush: "CRASHED",
      },
      { seat: 0, role: "BATTLESHIP", at: CANDY_FLEET_UI_V7.galleon },
      {
        seat: 0,
        role: "SUBMARINE",
        at: CANDY_FLEET_UI_V7.sub,
        rush: "RUSHED",
      },
      { seat: 0, role: "FIGHTER", at: CANDY_FLEET_UI_V7.trooper },
      { seat: 1, role: "PATROL_BOAT", at: CANDY_FLEET_UI_V7.boat },
      { seat: 1, role: "GUARD", at: CANDY_FLEET_UI_V7.guard },
      { seat: 1, role: "BATTLESHIP", at: CANDY_FLEET_UI_V7.battleship },
    ],
  });
}
