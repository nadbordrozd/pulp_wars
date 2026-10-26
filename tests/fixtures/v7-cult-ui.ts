import {
  TECHNOLOGY_IDS_V7,
  type CoordV7,
  type FactionIdV7,
  type GameStateV7,
} from "../../src/engine/index";
import { checkedV7 } from "./v7-builders";
import {
  cultFieldV7,
  withCowedV7,
  withFarmsV7,
  withFavourV7,
  withFrogsV7,
  withGripV7,
  withHorrorV7,
  withRitualV7,
  withStrandsV7,
  withTentacleV7,
  withUnboundHeraldV7,
  withUnboundV7,
} from "./v7-cult";
import { unitAtV7 } from "./v7-goblin-arena";
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
 * three) and the Hexer channels the Horror too. (The Idol Bearer's idol
 * stands by itself since the Cult redesign's lasting aura,
 * `pulp_wars-mch9.33`.)
 */
export function cultChannelBusyUiFixtureV7(): GameStateV7 {
  return withGripV7(
    withStrandsV7(channelBase(), CULT_CHANNEL_UI_V7.horror, [
      CULT_CHANNEL_UI_V7.channeller,
      CULT_CHANNEL_UI_V7.hexer,
    ]),
    CULT_CHANNEL_UI_V7.thing,
    CULT_CHANNEL_UI_V7.channeller,
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

// ------------------------------ Rituals, hexes and tricks (U3) ---

/**
 * Scenes for rituals, hexes and tricks (bead `pulp_wars-mch9.19`,
 * docs/ui/BOARD_TARGETING.md section 3.9), on the same field.
 */
export const CULT_RITUAL_UI_V7 = {
  /** A Stargazer that has not moved, an Initiate on each side of it. */
  stargazer: at(5, 1),
  chanter: at(4, 1),
  secondChanter: at(6, 1),
  /** The tile the scenes mark: three tiles south of the Stargazer. */
  star: at(5, 4),
  /** Under the star: a Human Fighter, a hurt Knight, an own Initiate. */
  starFighter: at(5, 4),
  starKnight: at(4, 4),
  starInitiate: at(6, 3),
  /** A Summoner with four Initiates round it and 22 Favour. */
  summoner: at(5, 2),
  circle: [at(4, 2), at(6, 2), at(5, 1), at(4, 1)],
  /** Next to the Summoner: a free tile, a broken Knight, a Fighter. */
  free: at(4, 3),
  broken: at(5, 3),
  healthy: at(6, 3),
  /** A bound Herald within 3 of the Human capital (2, 8). */
  herald: at(4, 6),
  heraldCultists: [at(6, 4), at(6, 5), at(6, 6)],
  enemyCapital: at(2, 8),
} as const;

/**
 * Star-fall on offer: the Stargazer with two Initiates beside it (a star of
 * 6 begun alone, 12 with both joining: the Cult redesign,
 * `pulp_wars-mch9.34`), and, three tiles south, a Human Fighter, a Knight
 * at 6 HP and one of the Cult's own Initiates.
 */
export function cultStarfallUiFixtureV7(): GameStateV7 {
  const A = CULT_RITUAL_UI_V7;
  return cultFieldV7([
    { seat: 0, role: "CATAPULT", at: A.stargazer },
    { seat: 0, role: "FIGHTER", at: A.chanter },
    { seat: 0, role: "FIGHTER", at: A.secondChanter },
    { seat: 0, role: "FIGHTER", at: A.starInitiate },
    { seat: 1, role: "FIGHTER", at: A.starFighter },
    { seat: 1, role: "KNIGHT", at: A.starKnight, hp: 6 },
  ]);
}

/**
 * The same star under way with both Initiates joined (12): the ring, the
 * mark, the countdown, the hits.
 */
export function cultStarfallBegunUiFixtureV7(): GameStateV7 {
  const A = CULT_RITUAL_UI_V7;
  return withRitualV7(
    cultStarfallUiFixtureV7(),
    "STARFALL",
    A.stargazer,
    [A.chanter, A.secondChanter],
    A.star,
  );
}

/**
 * The Great Summoning on offer: a Summoner with four Initiates round it and
 * 22 Favour; of the tiles next to it one is free, one holds a broken Human
 * Knight (consumed) and one a healthy Human Fighter (it blocks).
 */
export function cultSummoningUiFixtureV7(): GameStateV7 {
  const A = CULT_RITUAL_UI_V7;
  return withFavourV7(
    cultFieldV7([
      { seat: 0, role: "CAPTAIN", at: A.summoner },
      ...A.circle.map((where) => ({
        seat: 0,
        role: "FIGHTER" as const,
        at: where,
      })),
      { seat: 1, role: "KNIGHT", at: A.broken, hp: 4 },
      { seat: 1, role: "FIGHTER", at: A.healthy },
    ]),
    0,
    22,
  );
}

/** The Great Summoning under way, its mark on `where` (default: free). */
export function cultSummoningBegunUiFixtureV7(
  where: CoordV7 = CULT_RITUAL_UI_V7.free,
): GameStateV7 {
  const A = CULT_RITUAL_UI_V7;
  return withRitualV7(
    cultSummoningUiFixtureV7(),
    "GREAT_SUMMONING",
    A.summoner,
    A.circle,
    where,
  );
}

/** The Great Summoning with a healthy Fighter on its mark: it blocks. */
export function cultSummoningBlockedUiFixtureV7(): GameStateV7 {
  return cultSummoningBegunUiFixtureV7(CULT_RITUAL_UI_V7.healthy);
}

function heraldBase(options: FieldOptionsV7 = {}): GameStateV7 {
  const A = CULT_RITUAL_UI_V7;
  return withStrandsV7(
    withHorrorV7(
      cultFieldV7(
        [
          ...A.heraldCultists.map((where) => ({
            seat: 0,
            role: "FIGHTER" as const,
            at: where,
            activation: { specialActed: true },
          })),
          { seat: 1, role: "FIGHTER", at: at(3, 7) },
        ],
        options,
      ),
      0,
      A.herald,
      { role: "HERALD" },
    ),
    A.herald,
    A.heraldCultists,
  );
}

/**
 * A bound Herald of the Cult player with both attacks left, three tiles
 * from the Human capital: Proclaim is on offer.
 */
export function cultProclaimUiFixtureV7(): GameStateV7 {
  return heraldBase();
}

/** The same with the Human capital Cowed already. */
export function cultCowedUiFixtureV7(): GameStateV7 {
  return withCowedV7(heraldBase(), CULT_RITUAL_UI_V7.enemyCapital);
}

/**
 * A Human player (seat 0) whose capital a Cult seat's Herald has Cowed, and
 * whose Fighter stands under a Cult star with a Stargazer's circle in
 * sight: what the victim of a Proclaim and of a ritual sees.
 */
export function cultRitualRivalUiFixtureV7(): GameStateV7 {
  return withCowedV7(
    withRitualV7(
      fieldV7(
        [
          { seat: 0, role: "FIGHTER", at: at(5, 4) },
          { seat: 0, role: "KNIGHT", at: at(6, 5) },
          { seat: 1, role: "CATAPULT", at: at(5, 1) },
          { seat: 1, role: "FIGHTER", at: at(4, 1) },
        ],
        { factions: ["ORIGINAL", "CULT"] },
      ),
      "STARFALL",
      at(5, 1),
      [at(4, 1)],
      at(5, 4),
    ),
    at(8, 8),
  );
}

/**
 * Scenes for the hexes and tricks. The Cult redesign (`pulp_wars-mch9.31`):
 * the Tentacle's `caller` is a Summoner (the retired Caller's tile), and an
 * Idol Bearer (`bearer`) stands where the retired Chosen stood.
 */
export const CULT_TRICK_UI_V7 = {
  hexer: at(5, 3),
  familiar: at(3, 3),
  caller: at(7, 2),
  bearer: at(3, 5),
  /** A Human Knight within 2 of the Hexer and beside the Idol Bearer. */
  knight: at(4, 5),
  /** A Human Fighter beside the Idol Bearer. */
  fighter: at(2, 6),
  /** A Human Juggernaut within 2 of the Hexer: no hex takes it. */
  giant: at(7, 4),
  /** Where the hexed scene's Tentacle stands, beside the Knight. */
  tentacle: at(5, 6),
} as const satisfies Readonly<Record<string, CoordV7>>;

/**
 * The Cult player with every trick on offer: a Hexer with a Human Knight
 * and a Juggernaut within 2, a Familiar, a Summoner (its Tentacle), and an
 * Idol Bearer with the Knight and a Fighter beside it.
 */
export function cultTricksUiFixtureV7(): GameStateV7 {
  const A = CULT_TRICK_UI_V7;
  return cultFieldV7([
    { seat: 0, role: "MARKSMAN", at: A.hexer },
    { seat: 0, role: "RAIDER", at: A.familiar },
    { seat: 0, role: "CAPTAIN", at: A.caller },
    { seat: 0, role: "GUARD", at: A.bearer },
    { seat: 1, role: "KNIGHT", at: A.knight },
    { seat: 1, role: "FIGHTER", at: A.fighter },
    { seat: 1, role: "JUGGERNAUT", at: A.giant },
  ]);
}

function hexed(state: GameStateV7): GameStateV7 {
  const A = CULT_TRICK_UI_V7;
  const spent = withTentacleV7(
    withFrogsV7(state, [A.knight]),
    A.caller,
    A.tentacle,
    { grabbed: A.knight, turnsLeft: 2 },
  );
  return checkedV7({
    ...spent,
    cult: {
      ...spent.cult,
      hexCooldowns: [
        { unitId: unitAtV7(spent, A.hexer).id, turnsRemaining: 2 as const },
      ],
    },
  });
}

/**
 * The same after the tricks: the Knight is a frog a Tentacle holds, and the
 * Hexer's Ribbit is spent.
 */
export function cultTricksDoneUiFixtureV7(): GameStateV7 {
  return hexed(cultTricksUiFixtureV7());
}

/**
 * The victim's side: a Human player (seat 0) whose Knight is a frog a
 * Tentacle holds, beside a Cult Idol Bearer with its Fighter.
 */
export function cultTricksRivalUiFixtureV7(): GameStateV7 {
  const A = CULT_TRICK_UI_V7;
  return hexed(
    fieldV7(
      [
        { seat: 1, role: "MARKSMAN", at: A.hexer },
        { seat: 1, role: "CAPTAIN", at: A.caller },
        { seat: 1, role: "GUARD", at: A.bearer },
        { seat: 0, role: "KNIGHT", at: A.knight },
        { seat: 0, role: "FIGHTER", at: A.fighter },
      ],
      { factions: ["ORIGINAL", "CULT"] },
    ),
  );
}

/**
 * An Unbound Herald being bound again: two of the three strands it needs
 * are held this turn, and a third Initiate in reach has not acted (its
 * button binds it).
 */
export function cultHeraldBindUiFixtureV7(): GameStateV7 {
  return withStrandsV7(
    withUnboundHeraldV7(
      cultFieldV7([
        {
          seat: 0,
          role: "FIGHTER",
          at: at(3, 3),
          activation: { specialActed: true },
        },
        {
          seat: 0,
          role: "FIGHTER",
          at: at(7, 3),
          activation: { specialActed: true },
        },
        { seat: 0, role: "FIGHTER", at: at(5, 2) },
        { seat: 1, role: "FIGHTER", at: at(6, 6) },
      ]),
      at(5, 4),
      0,
    ),
    at(5, 4),
    [at(3, 3), at(7, 3)],
  );
}

/** The frogs of the frog scenes: where each victim stands, by role. */
export const CULT_FROGS_UI_V7 = {
  hexer: at(5, 3),
  FIGHTER: at(3, 4),
  MARKSMAN: at(4, 4),
  GUARD: at(5, 4),
  RAIDER: at(6, 4),
  KNIGHT: at(4, 5),
  CAPTAIN: at(6, 5),
  CATAPULT: at(3, 6),
  /** A victim that is no frog, beside the frogs. */
  plain: at(6, 6),
} as const satisfies Readonly<Record<string, CoordV7>>;

/** The roles that are frogs in the frog scenes, in reading order. */
export const CULT_FROG_ROLES_UI_V7 = [
  "FIGHTER",
  "MARKSMAN",
  "GUARD",
  "RAIDER",
  "KNIGHT",
  "CAPTAIN",
  "CATAPULT",
] as const;

/**
 * Seven frogs (bead `pulp_wars-mch9.26`): a Cult Hexer among seven units of
 * `victim`, each a frog, and one more Fighter that is none. Seat 0 is the
 * Cult unless `asVictim`, which seats the victim first (the owner's view).
 */
export function cultFrogsUiFixtureV7(
  victim: Exclude<FactionIdV7, "CULT"> = "ORIGINAL",
  asVictim = false,
): GameStateV7 {
  const A = CULT_FROGS_UI_V7;
  const cult = asVictim ? 1 : 0;
  const other = asVictim ? 0 : 1;
  return withFrogsV7(
    fieldV7(
      [
        { seat: cult, role: "MARKSMAN", at: A.hexer },
        ...CULT_FROG_ROLES_UI_V7.map((role) => ({
          seat: other,
          role,
          at: A[role],
        })),
        { seat: other, role: "FIGHTER", at: A.plain },
      ],
      { factions: asVictim ? [victim, "CULT"] : ["CULT", victim] },
    ),
    CULT_FROG_ROLES_UI_V7.map((role) => A[role]),
  );
}

/** The same frogs as their Human owner sees them. */
export function cultFrogsOwnerUiFixtureV7(): GameStateV7 {
  return cultFrogsUiFixtureV7("ORIGINAL", true);
}

/** The same scene with Undead victims, for the Cult player. */
export function cultFrogsUndeadUiFixtureV7(): GameStateV7 {
  return cultFrogsUiFixtureV7("UNDEAD");
}

// ------------------------------- The cap, the trickle, Hunger (U-R1) ---

/**
 * Scenes for the Cult redesign's Favour display (bead `pulp_wars-mch9.42`,
 * docs/product/RULESET_7_CULT_REDESIGN.md sections 6 and 7.6): a bound
 * Herald held by three channelling cultists, and a Summoner beside them.
 */
export const CULT_HUNGER_UI_V7 = {
  herald: at(5, 4),
  /** Three Initiates that channel the Herald this turn. */
  initiates: [at(4, 6), at(5, 6), at(6, 6)],
  /** A Summoner in the Herald's reach. */
  summoner: at(3, 4),
} as const;

/**
 * The Cult player (seat 0, the human) with `favour` Favour and a bound
 * Herald held by its three strands. With `summonerChannels` the Summoner
 * holds the third strand in place of an Initiate, so the next Start Turn
 * pays it the trickle before the Herald's Hunger.
 */
export function cultHungerUiFixtureV7(
  favour: number,
  summonerChannels = false,
): GameStateV7 {
  const A = CULT_HUNGER_UI_V7;
  const channelled = { activation: { specialActed: true } };
  // A seat with no Favour has no entry in the state (the view lists it at 0).
  const withAnyFavour = (state: GameStateV7): GameStateV7 =>
    favour > 0
      ? withFavourV7(state, 0, favour)
      : checkedV7({ ...state, cult: { ...state.cult, favour: [] } });
  const herald = withHorrorV7(
    withAnyFavour(
      cultFieldV7([
        ...A.initiates.map((where) => ({
          seat: 0,
          role: "FIGHTER" as const,
          at: where,
          ...channelled,
        })),
        {
          seat: 0,
          role: "CAPTAIN",
          at: A.summoner,
          ...(summonerChannels ? channelled : {}),
        },
        { seat: 1, role: "FIGHTER", at: at(1, 1) },
      ]),
    ),
    0,
    A.herald,
    { role: "HERALD" },
  );
  return withStrandsV7(
    herald,
    A.herald,
    summonerChannels
      ? [A.initiates[0], A.initiates[1], A.summoner]
      : A.initiates,
  );
}

/** The Favour scene with 25 Favour: each victim's label says what is lost. */
export function cultFavourNearCapUiFixtureV7(): GameStateV7 {
  return withFavourV7(cultFavourUiFixtureV7(), 0, 25);
}

/** The Favour scene at the cap of 30: the chip is full. */
export function cultFavourFullUiFixtureV7(): GameStateV7 {
  return withFavourV7(cultFavourUiFixtureV7(), 0, 30);
}

/** A bound Herald with 1 Favour: the next Start Turn cannot feed it. */
export function cultHungryHeraldUiFixtureV7(): GameStateV7 {
  return cultHungerUiFixtureV7(1);
}

// ------------------- The warden, the join, Switcheroo's reach (U-R2) ---

/**
 * Scenes for the Cult redesign's warden and joins (bead
 * `pulp_wars-mch9.43`, docs/product/RULESET_7_CULT_REDESIGN.md sections 8.1,
 * 8.2 and 13). The warden: an Idol Bearer whose idol stands, an Initiate and
 * a Stargazer beside it (shielded), a Hexer one tile further (not), a Human
 * Knight and Fighter beside the bearer (Awestruck), and a Human Archer two
 * tiles from the Initiate and from the bearer (free; its shot at the
 * Initiate is halved).
 */
export const CULT_WARDEN_UI_V7 = {
  bearer: at(7, 5),
  initiate: at(6, 5),
  stargazer: at(8, 4),
  hexer: at(8, 7),
  knight: at(7, 6),
  fighter: at(6, 4),
  archer: at(6, 7),
} as const satisfies Readonly<Record<string, CoordV7>>;

function wardenPieces(cult: number, human: number) {
  const A = CULT_WARDEN_UI_V7;
  return [
    { seat: cult, role: "GUARD" as const, at: A.bearer },
    { seat: cult, role: "FIGHTER" as const, at: A.initiate },
    { seat: cult, role: "CATAPULT" as const, at: A.stargazer },
    { seat: cult, role: "MARKSMAN" as const, at: A.hexer },
    { seat: human, role: "KNIGHT" as const, at: A.knight },
    { seat: human, role: "FIGHTER" as const, at: A.fighter },
    { seat: human, role: "MARKSMAN" as const, at: A.archer },
  ];
}

/** The warden as the Cult player (seat 0) sees it. */
export function cultWardenUiFixtureV7(): GameStateV7 {
  return cultFieldV7(wardenPieces(0, 1));
}

/**
 * The warden as its victim sees it: the Human player (seat 0) with the
 * Awestruck Knight and Fighter and the free Archer, against a Cult seat.
 */
export function cultWardenRivalUiFixtureV7(): GameStateV7 {
  return fieldV7(wardenPieces(1, 0), { factions: ["ORIGINAL", "CULT"] });
}

/**
 * Join the chant: the Stargazer of the ritual scenes has begun a star alone
 * (6) three tiles south, over a Human Fighter, a Knight at 8 HP (a join
 * makes it 9: it dies) and an own Initiate; the two Initiates beside the
 * Stargazer have not acted and may each join.
 */
export function cultJoinUiFixtureV7(): GameStateV7 {
  const A = CULT_RITUAL_UI_V7;
  return withRitualV7(
    cultFieldV7([
      { seat: 0, role: "CATAPULT", at: A.stargazer },
      { seat: 0, role: "FIGHTER", at: A.chanter },
      { seat: 0, role: "FIGHTER", at: A.secondChanter },
      { seat: 0, role: "FIGHTER", at: A.starInitiate },
      { seat: 1, role: "FIGHTER", at: A.starFighter },
      { seat: 1, role: "KNIGHT", at: A.starKnight, hp: 8 },
    ]),
    "STARFALL",
    A.stargazer,
    [],
    A.star,
  );
}

/**
 * The second Stargazer of the two-star join scene (`pulp_wars-mch9.61`):
 * two tiles east of the first, with its own star three tiles south of it.
 */
export const CULT_TWO_STARS_UI_V7 = {
  secondStargazer: at(7, 1),
  secondStar: at(7, 4),
} as const satisfies Readonly<Record<string, CoordV7>>;

/**
 * Join the chant with two Stargazers to choose from (`pulp_wars-mch9.61`):
 * the join scene, and a second Stargazer on (7, 1) whose star is pending on
 * (7, 4). The Initiate on (6, 1) stands beside both Stargazers; the one on
 * (4, 1) beside the first only.
 */
export function cultTwoStarsJoinUiFixtureV7(): GameStateV7 {
  const A = CULT_RITUAL_UI_V7;
  const B = CULT_TWO_STARS_UI_V7;
  return withRitualV7(
    withRitualV7(
      cultFieldV7([
        { seat: 0, role: "CATAPULT", at: A.stargazer },
        { seat: 0, role: "CATAPULT", at: B.secondStargazer },
        { seat: 0, role: "FIGHTER", at: A.chanter },
        { seat: 0, role: "FIGHTER", at: A.secondChanter },
        { seat: 1, role: "FIGHTER", at: A.starFighter },
        { seat: 1, role: "KNIGHT", at: A.starKnight, hp: 8 },
      ]),
      "STARFALL",
      A.stargazer,
      [],
      A.star,
    ),
    "STARFALL",
    B.secondStargazer,
    [],
    B.secondStar,
  );
}

/**
 * The Cult redesign's summons on the board (bead `pulp_wars-mch9.44`,
 * docs/product/RULESET_7_CULT_REDESIGN.md sections 7.3, 7.4 and 13): the
 * named tiles of `cultSummonsUiFixtureV7`.
 */
export const CULT_SUMMONS_UI_V7 = {
  /** The Summoner, with one Initiate beside it to help, and 9 Favour. */
  summoner: at(5, 2),
  helper: at(6, 2),
  /** The Initiate whose strand holds the first Imp. */
  channeller: at(1, 2),
  /** The channelled Imp, and the two Imps beside it its Brood holds. */
  imp: at(2, 3),
  broodImp: at(3, 3),
  secondBroodImp: at(2, 4),
  /** A Human Fighter beside all three Imps: Swarmed. */
  swarmed: at(3, 4),
  /** A Gibbering Mass beside the Cult capital (8, 8): its Doorstep. */
  mass: at(7, 7),
  /** A Human Fighter beside the Mass: Dragged. */
  dragged: at(6, 6),
  /** An Unbound Imp and an Unbound Gibbering Mass (the summoner's seat 0). */
  unboundImp: at(9, 2),
  unboundMass: at(9, 4),
} as const satisfies Readonly<Record<string, CoordV7>>;

/**
 * The Cult player (seat 0, the human) to move with every summon on the
 * board: a Summoner with one helper and 9 Favour (an Imp, a Horror and a
 * Mass are each offered; with `massLocked` the seat lacks Metallurgy,
 * shown as Gibbering Masses, so the Mass is not); a Brood of three Imps
 * held by one strand, round a Human Fighter they Swarm; a Gibbering Mass on
 * its Doorstep that drags the Human Fighter beside it; and an Unbound Imp
 * and an Unbound Mass in their Unbound looks.
 */
export function cultSummonsUiFixtureV7(massLocked = false): GameStateV7 {
  const A = CULT_SUMMONS_UI_V7;
  let state = withFavourV7(
    cultFieldV7(
      [
        { seat: 0, role: "CAPTAIN", at: A.summoner },
        { seat: 0, role: "FIGHTER", at: A.helper },
        { seat: 0, role: "FIGHTER", at: A.channeller },
        { seat: 1, role: "FIGHTER", at: A.swarmed },
        { seat: 1, role: "FIGHTER", at: A.dragged },
      ],
      massLocked
        ? {
            techs: {
              0: TECHNOLOGY_IDS_V7.filter((tech) => tech !== "METALLURGY"),
            },
          }
        : {},
    ),
    0,
    9,
  );
  for (const where of [A.imp, A.broodImp, A.secondBroodImp, A.unboundImp])
    state = withHorrorV7(state, 0, where, { role: "IMP" });
  for (const where of [A.mass, A.unboundMass])
    state = withHorrorV7(state, 0, where, { role: "MASS" });
  state = withStrandsV7(state, A.imp, [A.channeller]);
  state = withUnboundV7(state, A.unboundImp, 0);
  return withUnboundV7(state, A.unboundMass, 0);
}

/** The same with the Mass locked behind its technology. */
export function cultSummonsLockedUiFixtureV7(): GameStateV7 {
  return cultSummonsUiFixtureV7(true);
}

/**
 * Drag as its victim sees it (bead `pulp_wars-mch9.44`): the Human player
 * (seat 0) to move, its Fighter beside a Gibbering Mass that stands beside
 * the Cult capital (2, 8) of seat 1 (its Doorstep).
 */
export const CULT_SUMMONS_RIVAL_UI_V7 = {
  mass: at(3, 7),
  dragged: at(4, 6),
  free: at(6, 4),
} as const satisfies Readonly<Record<string, CoordV7>>;

export function cultSummonsRivalUiFixtureV7(): GameStateV7 {
  const A = CULT_SUMMONS_RIVAL_UI_V7;
  return withHorrorV7(
    fieldV7(
      [
        { seat: 0, role: "FIGHTER", at: A.dragged },
        { seat: 0, role: "FIGHTER", at: A.free },
      ],
      { factions: ["ORIGINAL", "CULT"] },
    ),
    1,
    A.mass,
    { role: "MASS" },
  );
}
