import type { CoordV7, GameStateV7 } from "../../src/engine/index";
import {
  cultFieldV7,
  withFarmsV7,
  withFavourV7,
  withGripV7,
  withHorrorV7,
  withIdolsV7,
  withStrandsV7,
  withUnboundV7,
} from "./v7-cult";
import { at, fieldV7, type FieldOptionsV7 } from "./v7-revision20";

/**
 * Scenes for the Cult interface (bead `pulp_wars-mch9.17`,
 * docs/ui/BOARD_TARGETING.md section 3.7), on the two-seat field of
 * `cultFieldV7`. The Cult is hidden from setup, so the DOM tests and the
 * review captures (`scripts/browser-cult-review-v7.ts`) mount these states.
 */
export const CULT_UI_V7 = {
  summoner: at(5, 2),
  /** Own units next to the Summoner: the Thing (12) and an Initiate (2). */
  thing: at(4, 1),
  initiate: at(6, 2),
  /** The Initiate that holds the Knight down (not next to the Summoner). */
  holder: at(6, 4),
  /** A broken Human Knight (5 HP) next to the Summoner and the holder. */
  knight: at(5, 3),
  /** A healthy Human Fighter next to the Summoner. */
  fighter: at(4, 3),
} as const satisfies Readonly<Record<string, CoordV7>>;

/**
 * The Cult player (seat 0, the human) to move: a Summoner with two own
 * units beside it to Sacrifice (the Thing in the Cellar for 12 Favour, an
 * Initiate for 2), a broken Knight beside it that a second Initiate holds
 * (a Seizure for 18), and a healthy Fighter it cannot Seize. Its capital is
 * level 2 with 2 population (one Offering), and it has 7 Favour.
 */
export function cultFavourUiFixtureV7(): GameStateV7 {
  return withFavourV7(
    withFarmsV7(
      cultFieldV7([
        { seat: 0, role: "CAPTAIN", at: CULT_UI_V7.summoner },
        { seat: 0, role: "JUGGERNAUT", at: CULT_UI_V7.thing },
        { seat: 0, role: "FIGHTER", at: CULT_UI_V7.initiate },
        { seat: 0, role: "FIGHTER", at: CULT_UI_V7.holder },
        { seat: 1, role: "KNIGHT", at: CULT_UI_V7.knight, hp: 5 },
        { seat: 1, role: "FIGHTER", at: CULT_UI_V7.fighter },
      ]),
      0,
      2,
    ),
    0,
    7,
  );
}

/**
 * A Human player (seat 0) facing a Cult seat with 11 Favour: the viewer has
 * no Favour chip, and the leaderboard shows the Cult's.
 */
export function cultRivalUiFixtureV7(): GameStateV7 {
  return withFavourV7(
    fieldV7(
      [
        { seat: 0, role: "FIGHTER", at: at(5, 2) },
        { seat: 1, role: "CAPTAIN", at: at(5, 4) },
      ],
      { factions: ["ORIGINAL", "CULT"] },
    ),
    1,
    11,
  );
}

// --------------------------------------------------- The channel (U2) ---

/**
 * Scenes for the channel's interface (bead `pulp_wars-mch9.18`,
 * docs/ui/BOARD_TARGETING.md section 3.8), on the same field.
 */
export const CULT_CHANNEL_UI_V7 = {
  summoner: at(5, 2),
  /** Two Initiates beside the Summoner: either may help it summon. */
  helper: at(6, 2),
  secondHelper: at(4, 2),
  /** The Horror, held by the channeller's one strand. */
  horror: at(5, 4),
  /** An Initiate that channelled the Horror this turn. */
  channeller: at(5, 6),
  /** The Thing beside the channeller, the Idol Bearer on its other side. */
  thing: at(6, 6),
  bearer: at(4, 6),
  /** A Hexer in reach of the Horror, and beside it (a Boo! scares it). */
  hexer: at(6, 5),
  /** A Human Fighter beside the Horror. */
  fighter: at(4, 4),
  /** A second Horror nobody channels (the short fixture only). */
  loose: at(8, 3),
} as const satisfies Readonly<Record<string, CoordV7>>;

function channelBase(): GameStateV7 {
  return withHorrorV7(
    withFavourV7(
      cultFieldV7([
        { seat: 0, role: "CAPTAIN", at: CULT_CHANNEL_UI_V7.summoner },
        { seat: 0, role: "FIGHTER", at: CULT_CHANNEL_UI_V7.helper },
        { seat: 0, role: "FIGHTER", at: CULT_CHANNEL_UI_V7.secondHelper },
        { seat: 0, role: "GUARD", at: CULT_CHANNEL_UI_V7.bearer },
        {
          seat: 0,
          role: "FIGHTER",
          at: CULT_CHANNEL_UI_V7.channeller,
          activation: { specialActed: true },
        },
        { seat: 0, role: "JUGGERNAUT", at: CULT_CHANNEL_UI_V7.thing },
        { seat: 0, role: "MARKSMAN", at: CULT_CHANNEL_UI_V7.hexer },
        { seat: 1, role: "FIGHTER", at: CULT_CHANNEL_UI_V7.fighter },
        { seat: 1, role: "FIGHTER", at: at(1, 1) },
      ]),
      0,
      6,
    ),
    0,
    CULT_CHANNEL_UI_V7.horror,
  );
}

/**
 * The Cult player (seat 0, the human) with every channel action on offer:
 * a Summoner with two Initiates beside it and 6 Favour; a Horror held by
 * one strand, with a Human Fighter and the Cult's own Hexer beside it; the
 * channeller between the Thing (which may grip it) and the Idol Bearer
 * (whose idol would ward it).
 */
export function cultChannelUiFixtureV7(): GameStateV7 {
  return withStrandsV7(channelBase(), CULT_CHANNEL_UI_V7.horror, [
    CULT_CHANNEL_UI_V7.channeller,
  ]);
}

/**
 * The same lodge at work: the Thing grips the channeller (its strand counts
 * three), the Idol Bearer's idol is raised, and the Hexer channels the
 * Horror too.
 */
export function cultChannelBusyUiFixtureV7(): GameStateV7 {
  return withIdolsV7(
    withGripV7(
      withStrandsV7(channelBase(), CULT_CHANNEL_UI_V7.horror, [
        CULT_CHANNEL_UI_V7.channeller,
        CULT_CHANNEL_UI_V7.hexer,
      ]),
      CULT_CHANNEL_UI_V7.thing,
      CULT_CHANNEL_UI_V7.channeller,
    ),
    [CULT_CHANNEL_UI_V7.bearer],
  );
}

/**
 * End Turn's question: a second Horror stands where nobody channels it, so
 * the next Start Turn check unbinds it.
 */
export function cultChannelShortUiFixtureV7(): GameStateV7 {
  return withHorrorV7(cultChannelUiFixtureV7(), 0, CULT_CHANNEL_UI_V7.loose);
}

/**
 * The second Horror has broken loose (bead `pulp_wars-mch9.6`): it belongs
 * to nobody, Furious or not, and goes for the nearest unit. Both Initiates
 * beside the Summoner have it and the bound Horror in reach.
 */
export function cultChannelUnboundUiFixtureV7(furious = false): GameStateV7 {
  return withUnboundV7(
    cultChannelShortUiFixtureV7(),
    CULT_CHANNEL_UI_V7.loose,
    0,
    furious,
  );
}

/** The same, in the turn it broke loose. */
export function cultChannelFuriousUiFixtureV7(): GameStateV7 {
  return cultChannelUnboundUiFixtureV7(true);
}

/**
 * Bind again: an Initiate whose only daemon in reach is an Unbound Horror
 * (its button binds it), and a Human Fighter the Horror goes for.
 */
export function cultChannelBindUiFixtureV7(): GameStateV7 {
  return withUnboundV7(
    withHorrorV7(
      cultFieldV7([
        { seat: 0, role: "FIGHTER", at: at(5, 2) },
        { seat: 1, role: "FIGHTER", at: at(6, 5) },
      ]),
      0,
      at(5, 4),
    ),
    at(5, 4),
    0,
  );
}

/** Horrors of seat 0, each channelled by the Initiates on `cultists`. */
function lodgeV7(
  groups: readonly {
    readonly horror: CoordV7;
    readonly cultists: readonly CoordV7[];
  }[],
  options: FieldOptionsV7 = {},
): GameStateV7 {
  let state = cultFieldV7(
    groups.flatMap((group) =>
      group.cultists.map((where) => ({
        seat: 0,
        role: "FIGHTER" as const,
        at: where,
        activation: { specialActed: true },
      })),
    ),
    options,
  );
  for (const group of groups) state = withHorrorV7(state, 0, group.horror);
  for (const group of groups)
    state = withStrandsV7(state, group.horror, group.cultists);
  return state;
}

/**
 * The strands over each ground, for the review: a Horror with a channeller
 * three tiles away over Grass (north and east) and over water (west), and a
 * second Horror whose two channellers stand in the Snow of an Ice Folk
 * seat's territory.
 */
export function cultChannelGroundsUiFixtureV7(): GameStateV7 {
  return lodgeV7(
    [
      { horror: at(5, 3), cultists: [at(2, 3), at(8, 3), at(5, 0)] },
      { horror: at(2, 6), cultists: [at(1, 9), at(3, 9)] },
    ],
    {
      factions: ["CULT", "ICE_FOLK"],
      water: [at(3, 2), at(3, 3), at(3, 4), at(4, 2), at(4, 3), at(4, 4)],
    },
  );
}

/**
 * A dozen strands: four Horrors with three channellers each (what a late
 * Cult army shows at once), for the cost of a still frame.
 */
export function cultChannelDozenUiFixtureV7(): GameStateV7 {
  return lodgeV7([
    { horror: at(2, 2), cultists: [at(0, 1), at(1, 0), at(0, 3)] },
    { horror: at(5, 2), cultists: [at(4, 0), at(6, 0), at(5, 4)] },
    { horror: at(8, 2), cultists: [at(9, 0), at(10, 2), at(9, 4)] },
    { horror: at(2, 5), cultists: [at(0, 5), at(1, 6), at(4, 5)] },
  ]);
}

/**
 * A Human player (seat 0) watching a Cult seat's channel: the strands, the
 * candles and the pips are public, and nothing is offered on them.
 */
export function cultChannelRivalUiFixtureV7(): GameStateV7 {
  return withStrandsV7(
    withHorrorV7(
      fieldV7(
        [
          { seat: 0, role: "FIGHTER", at: at(5, 2) },
          { seat: 1, role: "FIGHTER", at: at(4, 6) },
          { seat: 1, role: "FIGHTER", at: at(6, 6) },
        ],
        { factions: ["ORIGINAL", "CULT"] },
      ),
      1,
      at(5, 4),
    ),
    at(5, 4),
    [at(4, 6), at(6, 6)],
  );
}
