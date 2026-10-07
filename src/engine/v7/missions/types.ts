import type {
  BiomeIdV7,
  CoordV7,
  FactionIdV7,
  ImprovementIdV7,
  RewardIdV7,
  TechnologyIdV7,
  UnitRoleIdV7,
} from "../types";

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
  /** Test fixtures: registered for headless and tests, in no chapter. */
  readonly hidden?: true;
  /**
   * Hidden fixtures only (`pulp_wars-w49.3`, the Human tuning labs): the
   * AI seats may play a faction another seat plays (a mirror), so the
   * `MISSION` setup of such a mission repeats a faction.
   */
  readonly mirror?: true;
  readonly size: 11 | 14 | 16;
  /** Fixed; it only seeds the treasure-chest draws. */
  readonly seed: number;
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
  /** `aiMode` as in a normal setup. */
  readonly aiMode: "RIVAL" | "COOPERATIVE";
  /** Seat 0 is the human; 2–4 seats. */
  readonly seats: readonly MissionSeatV7[];
  /** Closed under prerequisites (section 2.3). */
  readonly forbiddenTechnologies: readonly TechnologyIdV7[];
  readonly objective: MissionObjectiveV7;
}

export interface MissionImprovementV7 {
  readonly at: CoordV7;
  readonly improvement: ImprovementIdV7;
}

export interface MissionSeatV7 {
  /** A fixed faction, or (seat 0 only) a choice among these. */
  readonly faction: FactionIdV7 | { readonly choice: readonly FactionIdV7[] };
  readonly coins: number;
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
  /** AI seats only; absent means NORMAL. Read by the AI, never the engine. */
  readonly directive?: MissionDirectiveV7;
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
}

/** The teaser objective; later kinds are additive (section 3). */
export type MissionObjectiveV7 = { readonly kind: "DOMINATION" };

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
export type MissionDirectiveV7 =
  | { readonly kind: "NORMAL" }
  | { readonly kind: "RUSH"; readonly untilRound?: number }
  | {
      readonly kind: "HOLD";
      readonly zone: readonly RectV7[];
      readonly untilRound?: number;
    }
  | {
      readonly kind: "GUARD";
      readonly zone: readonly RectV7[];
      readonly garrison: number;
      readonly untilRound?: number;
    };
