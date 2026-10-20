import type {
  BiomeIdV7,
  CoordV7,
  FactionIdV7,
  ImprovementIdV7,
  NeutralBreedV7,
  RewardIdV7,
  TechnologyIdV7,
  UnitRoleIdV7,
} from "../types";
import type { CuriosityPlacementKindV7 } from "../curiosities";
import type { MapGenerationRulesV7 } from "../map";

/**
 * A mission (docs/product/CAMPAIGN.md section 2.1): one frozen object that
 * the builder (`./build.ts`) turns into an ordinary initial `GameStateV7`.
 * Its `(id, revision)` pair is what a `MISSION` setup stores; the registry
 * (`./index.ts`) holds only the current revision of each mission.
 *
 * **Terrain legend** (`terrain` rows): `.` Grass, `f` Forest, `^` Mountain,
 * `~` water, `x` Rift. Water is Shallow when one of its four orthogonal
 * on-board neighbours is land, otherwise Deep, exactly as in map generation.
 *
 * **Resource legend** (`resources` rows): `r` Fruit, `e` Fertile Ground,
 * `g` Game, `o` Ore, `s` Fish, `p` Pearls, `.` none.
 *
 * **Biome legend** (`biomes` rows): `P` Plains, `W` Woodland, `H` Highlands;
 * a water tile's character is ignored (water has no biome).
 */
export interface MissionDefinitionV7 {
  /** Stable, SCREAMING_SNAKE; never reused for a different mission. */
  readonly id: string;
  /** Bumped whenever the built initial state changes (section 2.4). */
  readonly revision: number;
  /**
   * In no campaign chapter: the test fixtures (registered for headless and
   * tests) and the tutorial board (`TUTORIAL_1`, started from the menu).
   */
  readonly hidden?: true;
  /**
   * Hidden fixtures only (`pulp_wars-w49.3`, the Human tuning labs): the
   * AI seats may play a faction another seat plays (a mirror), so the
   * `MISSION` setup of such a mission repeats a faction.
   */
  readonly mirror?: true;
  readonly size: 11 | 14 | 16 | 20;
  /** Fixed; it only seeds the treasure-chest draws. */
  readonly seed: number;
  /**
   * Natural maps (`pulp_wars-v642.1`, CAMPAIGN.md section 10.3): where the
   * layers below came from: the map generator's output for this map type,
   * size, seat count, and seed, with these edits. The layers are baked
   * here, so the builder never runs the generator; a test regenerates them
   * from the source and compares (`missionMapDriftV7`).
   */
  readonly source?: MissionMapSourceV7;
  /** Rows of `size` characters, y = 0 first (legend above). */
  readonly terrain: readonly string[];
  /** Same shape: resources; "." for none. */
  readonly resources: readonly string[];
  /** Default biome; `biomes` rows (P/W/H) override it per tile. */
  readonly biome: BiomeIdV7;
  readonly biomes?: readonly string[];
  readonly villages: readonly CoordV7[];
  readonly roads?: readonly CoordV7[];
  readonly fieldDefenses?: readonly CoordV7[];
  readonly improvements?: readonly MissionImprovementV7[];
  readonly treasureChests?: readonly CoordV7[];
  /** Only with an Undead seat. */
  readonly graves?: readonly CoordV7[];
  /**
   * Mission curiosities (`pulp_wars-hmyk.14`, docs/product/SAGA.md section
   * 4, E1; CAMPAIGN.md section 10.9): curiosities placed by hand, of any
   * kind map generation places. A mission without them runs with
   * curiosities off (its setup's `curiosities` is `false`); a mission with
   * them runs with that key `true`, so the rules of every kind it places
   * are on (round 3's `ZAP`, `FIRE_MOON_GUN`, the Claim's payout and the
   * Serpent's turn included), and nothing else is placed. The generator's
   * site rules (distances to capitals, villages, centres and other
   * curiosities, the board widths, the landmass rules) do not apply to an
   * authored tile; each kind's tile rules do (`validateMissionDefinitionV7`).
   */
  readonly curiosities?: readonly MissionCuriosityV7[];
  /** `aiMode` as in a normal setup. */
  readonly aiMode: "RIVAL" | "COOPERATIVE";
  /** Seat 0 is the human; 2–4 seats. */
  readonly seats: readonly MissionSeatV7[];
  /**
   * Teams (`pulp_wars-v642.1`, CAMPAIGN.md section 10.2): one team number
   * per seat. Two seats are allies exactly when their numbers are equal, so
   * an AI seat may fight beside the human. Absent: the `aiMode` rule (every
   * AI seat against the human, and against each other in Rival mode).
   */
  readonly teams?: readonly number[];
  /** Named tiles the objective and the interface refer to. */
  readonly landmarks?: readonly MissionLandmarkV7[];
  /** Units that arrive later, at a seat's Start Turn of a round. */
  readonly reinforcements?: readonly MissionReinforcementV7[];
  /** Closed under prerequisites (section 2.3). */
  readonly forbiddenTechnologies: readonly TechnologyIdV7[];
  readonly objective: MissionObjectiveV7;
}

/**
 * One hand-placed curiosity (E1), named by the generator's placement kind:
 * a tile marker (`FOUNTAIN`, `SHRINE`, `WRECK`, `WISHING_WELL`,
 * `TESLA_TOWER`, `MOON_GUN`, `GOLD_CLAIM`, `LOST_EXPEDITION`), a lone
 * neutral unit that starts on its home (`MONSTER`, the Giant Spider;
 * `BIGFOOT`; `SEA_SERPENT`), the pair of Dimensional Gates (`GATES`: `at`
 * and its `partner`), or a camp centre with its guards (`DOWNED_SAUCER`,
 * `GRAVEYARD`). Markers start fresh: the Gun unfired, the Claim unstaked
 * with all its Coins, the Expedition unfound, the Well untossed.
 */
export type MissionCuriosityV7 =
  | {
      readonly kind: Exclude<
        CuriosityPlacementKindV7,
        "GATES" | "DOWNED_SAUCER" | "GRAVEYARD"
      >;
      readonly at: CoordV7;
    }
  | {
      readonly kind: "GATES";
      readonly at: CoordV7;
      readonly partner: CoordV7;
    }
  | {
      readonly kind: "DOWNED_SAUCER" | "GRAVEYARD";
      readonly at: CoordV7;
      /** The camp's guards, of the camp's breeds, within 2 of its centre. */
      readonly guards: readonly {
        readonly breed: NeutralBreedV7;
        readonly at: CoordV7;
      }[];
    };

export interface MissionImprovementV7 {
  readonly at: CoordV7;
  readonly improvement: ImprovementIdV7;
}

export interface MissionSeatV7 {
  /** A fixed faction, or (seat 0 only) a choice among these. */
  readonly faction: FactionIdV7 | { readonly choice: readonly FactionIdV7[] };
  readonly coins: number;
  /**
   * The Cultists (`pulp_wars-mch9.8`, docs/product/RULESET_7_CULTISTS.md
   * section 3): the Favour the seat starts with. Only a seat whose fixed
   * faction is the Cult may have it; absent: 0.
   */
  readonly favour?: number;
  readonly technologies: readonly TechnologyIdV7[];
  /** The first city is the seat's capital (its original capital). */
  readonly cities: readonly MissionCityV7[];
  /** At least one; the first gets the seat's first unit ID (`2s + 2`). */
  readonly units: readonly MissionUnitV7[];
  /** Explored at start: radius around each own city, plus rectangles. */
  readonly reveal: {
    readonly radius: number;
    readonly rects?: readonly RectV7[];
  };
  /**
   * Technologies this seat alone may not research (`pulp_wars-v642.1`,
   * CAMPAIGN.md section 10.2), on top of the mission's own list: with the
   * mission's list it is closed under prerequisites, and the seat starts
   * with none of them. A handicap for one side: an AI seat without its
   * ranged unit, a player without ships.
   */
  readonly forbiddenTechnologies?: readonly TechnologyIdV7[];
  /**
   * AI seats only; absent means NORMAL. Read by the AI, never the engine.
   * A list is a schedule: the first entry whose rounds
   * (`fromRound` ≤ round < `untilRound`) hold the current round is played.
   */
  readonly directive?: MissionDirectiveV7 | readonly MissionDirectiveV7[];
}

export interface MissionCityV7 {
  readonly at: CoordV7;
  readonly level: number;
  /** One reward per reached level 2…level, e.g. ["SURVEY", "WALLS"]. */
  readonly rewards: readonly RewardIdV7[];
  /**
   * Tuning 7 (`pulp_wars-w49.10`): the city has used its Land Grant: its
   * territory is the centered 5 x 5 footprint, and the grant is spent.
   */
  readonly landGrant?: true;
  /**
   * The city's story name (`pulp_wars-v642.5`, CAMPAIGN.md section 10.5):
   * what the board, the city panel, the log and the text harness call it
   * ("Fort Hollow", "The Lodge") instead of a name dealt from the faction's
   * list. Presentation only: not in the state, so it is outside the pinned
   * initial-state hash and needs no revision bump.
   */
  readonly name?: string;
}

export interface MissionUnitV7 {
  /** The mechanical role; it resolves through the seat's faction. */
  readonly role: UnitRoleIdV7;
  readonly at: CoordV7;
  /** Index into the seat's `cities`; default 0 (the capital). */
  readonly home?: number;
  /**
   * The Dinosaur pass (`pulp_wars-w49.15`): the kills credited to a unit of
   * a role that grows (a dinosaur), which sets its growth stage and with it
   * its maximum HP: 1 for Big, 3 for Alpha. Absent: 0.
   */
  readonly kills?: number;
  /**
   * The Dinosaur pass: the unit is an Egg of `role` with this many of its
   * owner's Start Turns still to come before it hatches (its countdown).
   * An egg-laid role of a Dinosaur seat, on a nest tile of its home city;
   * never a seat's first unit.
   */
  readonly egg?: number;
  /**
   * A name the objective refers to (`pulp_wars-v642.1`): the escorted
   * unit, a target to kill, a unit that must live. Unique in the mission.
   */
  readonly tag?: string;
}

/** A named tile: a city or village to capture or defend, a destination. */
export interface MissionLandmarkV7 {
  /** Unique in the mission, SCREAMING_SNAKE. */
  readonly tag: string;
  readonly at: CoordV7;
  /**
   * The story name of a landmark on a neutral village (`pulp_wars-v642.5`):
   * the board labels the village with it and the city founded there keeps
   * it. A landmark on a city takes the city's own `name` instead.
   */
  readonly name?: string;
}

/**
 * Units that arrive at `seat`'s Start Turn of `round` (2 or later), each
 * on its tile or the nearest free tile it may stand on that is not next to
 * a unit of a seat hostile to it (rings outward to the board's edge,
 * `(y, x)` order), with their turn spent (`pulp_wars-v642.5`, 7r83); a
 * unit with no such tile does not come.
 * Nothing arrives for an eliminated seat. They are homed to the seat's
 * capital while it holds it, otherwise to its city with the lowest ID, and
 * may stand above the unit limit.
 */
export interface MissionReinforcementV7 {
  readonly seat: number;
  readonly round: number;
  readonly units: readonly {
    readonly role: UnitRoleIdV7;
    readonly at: CoordV7;
  }[];
}

/** The generated map types a mission board may come from. */
export type MissionMapTypeV7 =
  "DRY_LAND" | "PANGEA" | "CONTINENTS" | "ARCHIPELAGO" | "LAKES";

export interface MissionMapSourceV7 {
  readonly mapType: MissionMapTypeV7;
  readonly size: 11 | 14 | 16 | 20;
  /** The seat count the generator was asked for (its capitals). */
  readonly seats: number;
  readonly seed: number;
  readonly edits: readonly MissionMapEditV7[];
  /**
   * The generation rules the map was baked with, when the current
   * generator no longer draws it (`pulp_wars-ykw.8`: Continents and Lakes
   * boards baked before `pulp-wars-poc-7r87` name
   * `SPREAD_VILLAGES_CURIOSITIES`). The source is regenerated and compared
   * under these rules, so the baked layers stay pinned to their generator.
   * Absent: the current generator.
   */
  readonly rules?: MapGenerationRulesV7;
  /**
   * The generator changed after this map was baked: the baked layers are
   * the truth and the source is history, no longer compared.
   */
  readonly frozen?: true;
}

/** One recorded change to the generator's board (legend characters). */
export type MissionMapEditV7 =
  | {
      readonly kind: "TERRAIN";
      readonly at: CoordV7;
      readonly terrain: string;
      /** The tile's resource afterwards; absent: none. */
      readonly resource?: string;
    }
  | {
      readonly kind: "RESOURCE";
      readonly at: CoordV7;
      readonly resource: string;
    }
  | { readonly kind: "BIOME"; readonly at: CoordV7; readonly biome: string }
  | {
      readonly kind: "VILLAGE";
      readonly at: CoordV7;
      readonly present: boolean;
    }
  | {
      readonly kind: "CHEST";
      readonly at: CoordV7;
      readonly present: boolean;
    };

/**
 * What wins and loses a mission (`pulp_wars-v642.1`, CAMPAIGN.md section
 * 10.1). In every kind the human loses when eliminated and wins when no
 * seat hostile to it is left; the kind adds one more way to win, and the
 * shared keys add ways to lose.
 *
 * - `DOMINATION`: nothing more.
 * - `ESCORT`: the tagged unit of seat 0 stands within `within` tiles of the
 *   landmark `to`. The mission is lost when that unit is dead.
 * - `SURVIVE`: the round `rounds` ends (its last seat ends its turn).
 * - `CAPTURE`: seat 0 or an ally owns the city on every landmark of
 *   `places`.
 * - `KILL`: every tagged unit of `units` is dead.
 */
export type MissionObjectiveV7 = MissionObjectiveCommonV7 &
  (
    | { readonly kind: "DOMINATION" }
    | {
        readonly kind: "ESCORT";
        readonly unit: string;
        readonly to: string;
        readonly within: 0 | 1 | 2;
      }
    | { readonly kind: "SURVIVE"; readonly rounds: number }
    | { readonly kind: "CAPTURE"; readonly places: readonly string[] }
    | { readonly kind: "KILL"; readonly units: readonly string[] }
  );

export interface MissionObjectiveCommonV7 {
  /**
   * The mission is lost when this round ends without a win (never with
   * `SURVIVE`, whose `rounds` is the clock).
   */
  readonly byRound?: number;
  /**
   * The mission is lost when a protected city is no longer owned by the
   * seat that started with it (a landmark nobody started with: when a seat
   * hostile to the human owns it), or a protected unit is dead.
   */
  readonly protect?: readonly MissionProtectedV7[];
  /** Up to two secondary goals; each one met at the win is a star. */
  readonly bonus?: readonly MissionBonusGoalV7[];
}

export type MissionProtectedV7 =
  { readonly place: string } | { readonly unit: string };

/**
 * A secondary goal, judged at the win from the final state alone:
 * `WITHIN_ROUNDS` (the win came in this round or earlier), `KEEP_CITIES`
 * (seat 0 owns every city it started with), `UNIT_ALIVE` (the tagged unit
 * lives), `HOLD_PLACE` (seat 0 or an ally owns the city on the landmark).
 */
export type MissionBonusGoalV7 =
  | { readonly kind: "WITHIN_ROUNDS"; readonly rounds: number }
  | { readonly kind: "KEEP_CITIES" }
  | { readonly kind: "UNIT_ALIVE"; readonly unit: string }
  | { readonly kind: "HOLD_PLACE"; readonly place: string };

/** An inclusive rectangle of tiles. */
export interface RectV7 {
  readonly x0: number;
  readonly y0: number;
  readonly x1: number;
  readonly y1: number;
}

/**
 * An AI seat's directive (section 2.5). Plain data on the seat definition,
 * outside the pinned initial-state hash; only the Normal AI reads it
 * (`pulp_wars-68k.3`), never the engine.
 */
export type MissionDirectiveV7 = MissionDirectiveWindowV7 &
  (
    | { readonly kind: "NORMAL" }
    | { readonly kind: "RUSH" }
    | {
        readonly kind: "HOLD";
        readonly zone: readonly RectV7[];
        readonly ships?: true;
      }
    | {
        readonly kind: "GUARD";
        readonly zone: readonly RectV7[];
        readonly garrison: number;
        /**
         * Directives for ships (`pulp_wars-hmyk.11`, docs/product/SAGA.md
         * section 4, E7): `true` leashes every ship of the seat to the zone
         * as well (for `GUARD` besides the garrison, for `HOLD` besides the
         * land units), so a flagship keeps to its anchorage and a squadron
         * to its station; a zone that should hold ships is drawn on water.
         * Absent: the directive leads land and embarked units only.
         */
        readonly ships?: true;
        /**
         * `pulp_wars-v642.10`: what every unit outside the garrison plays.
         * Absent: `NORMAL`. `RUSH` or `ASSAULT` (with its target): the
         * garrison holds the zone while the rest of the army attacks, so a
         * seat keeps its home and never turtles.
         */
        readonly others?: MissionGuardOthersV7;
      }
    /**
     * `pulp_wars-v642.5`: the seat commits its army to the city on
     * `target` while it is a known hostile city: every free unit marches on
     * it at once (as `RUSH`, but on that city alone), and the hostile units
     * that hold it are assaulted even when they outweigh the attackers,
     * instead of being shot at from outside their reach. Without a known
     * hostile city there it plays `RUSH`.
     */
    | { readonly kind: "ASSAULT"; readonly target: CoordV7 }
  );

/**
 * `pulp_wars-v642.10`: the play of a `GUARD` seat's units outside its
 * garrison: `RUSH` (every free unit marches on the nearest known hostile
 * city at once) or `ASSAULT` on `target` (as the `ASSAULT` directive).
 */
export type MissionGuardOthersV7 =
  | { readonly kind: "RUSH" }
  | { readonly kind: "ASSAULT"; readonly target: CoordV7 };

/**
 * When a directive is played: from `fromRound` (absent: the start) while
 * the round is below `untilRound` (absent: for good). Outside its rounds a
 * seat plays the next matching entry of its schedule, or `NORMAL`.
 */
export interface MissionDirectiveWindowV7 {
  readonly fromRound?: number;
  readonly untilRound?: number;
}
