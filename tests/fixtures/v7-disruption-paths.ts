import type {
  DisruptionCauseV7,
  DomainEventV7,
  GameStateV7,
} from "../../src/engine/index";

/**
 * The Cultists (`pulp_wars-mch9.5`, docs/product/RULESET_7_CULTISTS.md
 * section 6.2): the audit of the one disruption rule. "Any Hit Point a
 * channeller loses, any move that is not its own, any status another seat
 * puts on it, any change of owner, and any way off the board breaks its
 * strand."
 *
 * The engine does not ask each rule whether it disrupts. After every
 * accepted command, and inside a Start Turn before the channel check, it
 * compares what a watched unit was with what it is (`cultDisruptionsV7`,
 * src/engine/v7/cult-channel.ts). So a new way of hurting, moving, taking,
 * or removing a unit disrupts with no further code. Three things a new rule
 * can still get wrong, and each has a table here that
 * `tests/unit/ruleset-v7-cult-disruption.test.ts` checks against the
 * source:
 *
 * 1. **A new event kind.** Every domain event kind is classified below by
 *    what it reports happening to a unit it names (other than what that
 *    unit chose to do itself). The type makes the table total: a new kind
 *    does not compile until it is classified. Every kind with a cause needs
 *    a hand-built proof in the test (a real command that emits it and
 *    breaks a strand), or a reason in `UNPROVEN_DISRUPTION_PATHS_V7`.
 * 2. **A new status list.** Every key of `GameStateV7` is classified below.
 *    A key classified `STATUS` must be read by `disruptingStatusKeysV7`; a
 *    new key does not compile until it is classified.
 * 3. **A new way into the reducer.** The test reads `reducer.ts` and fails
 *    unless every accepted command passes through the disruption step and
 *    the Start Turn runs its own between Plague and the channel check.
 */

/** What an event reports happening to a unit it names. Empty: nothing. */
export type DisruptionPathV7 = readonly DisruptionCauseV7[];

const NONE: DisruptionPathV7 = [];

export const DISRUPTION_EVENT_PATHS_V7: Readonly<
  Record<DomainEventV7["kind"], DisruptionPathV7>
> = {
  // --- Turn structure, economy, and the board: no unit is touched. ---
  TURN_STARTED: NONE,
  INCOME_AWARDED: NONE,
  INCOME_PREVIEWED: NONE,
  TURN_ENDED: NONE,
  NEUTRAL_TURN_STARTED: NONE,
  NEUTRAL_TURN_ENDED: NONE,
  TECH_RESEARCHED: NONE,
  FISH_HARVESTED: NONE,
  PEARLS_GATHERED: NONE,
  PORT_BUILT: NONE,
  SHIPYARD_BUILT: NONE,
  PORT_BLOCKADE_CHANGED: NONE,
  SEA_NETWORK_CHANGED: NONE,
  FRUIT_HARVESTED: NONE,
  GAME_HUNTED: NONE,
  ECONOMIC_BUILDING_BUILT: NONE,
  ECONOMIC_BUILDING_REMOVED: NONE,
  FOREST_CLEARED: NONE,
  FOREST_REPLANTED: NONE,
  FOREST_CULTIVATED: NONE,
  // The blast itself is the `EXPLOSION_RESOLVED` that follows.
  MOUNTAIN_BLASTED: NONE,
  ROAD_BUILT: NONE,
  FIELD_DEFENSE_BUILT: NONE,
  FIELD_DEFENSE_DESTROYED: NONE,
  BARRICADE_BUILT: NONE,
  BARRICADE_REPAIRED: NONE,
  BARRICADE_ATTACKED: NONE,
  WALLS_DESTROYED: NONE,
  LAND_GRANTED: NONE,
  CITY_ECONOMY_CHANGED: NONE,
  CITY_LEVELED_UP: NONE,
  CITY_REWARD_QUEUED: NONE,
  CITY_REWARD_CHOSEN: NONE,
  CITY_REWARD_AUTOMATICALLY_GRANTED: NONE,
  CITY_TERRITORY_EXPANDED: NONE,
  ACHIEVEMENT_UNLOCKED: NONE,
  MONUMENT_BUILT: NONE,
  IMPROVEMENT_PILLAGED: NONE,
  OFFERING_MADE: NONE,
  FAVOUR_GAINED: NONE,
  FAVOUR_SPENT: NONE,
  SPOILS_AWARDED: NONE,
  PLUNDER_AWARDED: NONE,
  MONSTER_BOUNTY_AWARDED: NONE,
  CITY_CAPTURED: NONE,
  TREASURE_CAPTURED: NONE,
  WRECK_SALVAGED: NONE,
  PLAYER_ELIMINATED: NONE,
  MATCH_ENDED: NONE,
  GRAVE_CREATED: NONE,
  GRAVE_DEVOURED: NONE,
  CRUMBS_LEFT: NONE,
  CRUMBS_STALE: NONE,
  TILES_GLAZED: NONE,
  TILES_REVEALED: NONE,
  WATER_FROZEN: NONE,
  // Only units afloat are icebound; a watched unit is in land form.
  ICE_MELTED: NONE,
  PLAGUE_EXPIRED: NONE,
  PLAGUE_CLEARED: NONE,

  // --- A new unit, or a unit's own doing: nothing happens to another. ---
  UNIT_TRAINED: NONE,
  UNIT_ASSEMBLED: NONE,
  UNIT_REBAKED: NONE,
  NAVAL_UNIT_TRAINED: NONE,
  EGG_LAID: NONE,
  EGG_HATCHED: NONE,
  UNIT_REWARD_GRANTED: NONE,
  DEAD_RAISED: NONE,
  BITTEN_UNIT_RISEN: NONE,
  WIGHT_RISEN: NONE,
  UNIT_INFECTED: NONE,
  GIANT_BROKE_OFF: NONE,
  DAEMON_SUMMONED: NONE,
  // A unit's own Move, advance, or traversal (the acting unit's change of
  // tile is its own; a strand holder has spent its action and cannot Move).
  UNIT_MOVED: NONE,
  UNIT_MOVE_INTERRUPTED: NONE,
  GATE_TRAVERSED: NONE,
  GATE_BLOCKED: NONE,
  // It was afloat before: never a watched unit.
  UNIT_DISEMBARKED: NONE,
  UNITS_RALLIED: NONE,
  UNIT_RECOVERED: NONE,
  UNIT_WAITED: NONE,
  COIN_TOSSED: NONE,
  SHRINE_CLAIMED: NONE,
  UNIT_PROMOTED: NONE,
  UNIT_GREW: NONE,
  // Heals and cures: Hit Points go up, statuses come off.
  WINDMILL_HEALING_RESOLVED: NONE,
  FOUNTAIN_HEALED: NONE,
  UNITS_REGENERATED: NONE,
  MONSTER_REGENERATED: NONE,
  SHIELDS_RECHARGED: NONE,
  WOUNDED_TENDED: NONE,
  SUGAR_TOSSED: NONE,
  UNIT_TOPPED_UP: NONE,
  // A Candy unit's own Sugar Rush and its Crash: a status of its own kind,
  // which no cultist has.
  UNIT_SUGAR_RUSHED: NONE,
  UNITS_CRASHED: NONE,
  // The channel's own events.
  STRAND_FORMED: NONE,
  STRAND_BROKEN: NONE,
  IDOL_RAISED: NONE,
  IDOL_DROPPED: NONE,
  ANCHOR_GRIPPED: NONE,
  ANCHOR_BROKEN: NONE,
  // The daemon itself leaves, not a cultist.
  DAEMON_UNBOUND: NONE,
  // The victim left the board when it was swallowed.
  UNIT_DIGESTED: NONE,
  UNIT_REGURGITATED: NONE,
  SWALLOWED_UNIT_RELEASED: NONE,

  // --- Hit Points lost. ---
  // An attack: its hit, its retaliation, its splash, a Sweep, a Pierce, a
  // Rockfall, a heat ray; and what an attack leaves (Plague, a bite, a
  // Splat, a Crack, a hunted mark).
  COMBAT_RESOLVED: ["HP_LOSS", "STATUS"],
  // Kaboom, a death blast, Blast Mountain.
  EXPLOSION_RESOLVED: ["HP_LOSS"],
  PLAGUE_DAMAGED: ["HP_LOSS"],
  WAIL_RESOLVED: ["HP_LOSS", "STATUS"],
  WHIRL_RESOLVED: ["HP_LOSS"],
  THUMPED: ["HP_LOSS"],
  RICOCHETED: ["HP_LOSS"],
  UNIT_BOMBED: ["HP_LOSS", "STATUS"],
  // Crushing Shove on a unit that cannot be pushed.
  UNIT_CRUSHED: ["HP_LOSS"],
  THUNDER_STOMP: ["HP_LOSS"],
  UNITS_TRAMPLED: ["HP_LOSS"],
  // The crush of the ice (units afloat) and a surfacing eruption.
  UNITS_CRUSHED: ["HP_LOSS"],
  UNIT_SURFACED: ["HP_LOSS"],
  // Peppermint Surprise, on a unit that lands on Crumbs.
  CRUMBS_EATEN: ["HP_LOSS"],

  // --- Moved by something else. ---
  // Push, the Charge! push, Knockback, Bounce, a ram.
  UNIT_PUSHED: ["MOVED"],
  UNIT_PULLED: ["MOVED"],
  UNIT_SPAWN_DISPLACED: ["MOVED"],
  GATE_DISPLACED: ["MOVED"],
  UNITS_SCARED: ["MOVED"],
  MAMMOTH_STAMPEDED: ["HP_LOSS", "MOVED"],
  // A passenger a Saucer beams and a Goblin a Troll throws.
  UNIT_BEAMED: ["MOVED"],
  GOBLIN_TOSSED: ["MOVED"],

  // --- A status. ---
  PLAGUE_SPREAD: ["STATUS"],
  UNITS_FROZEN: ["STATUS"],
  UNIT_STUCK: ["STATUS"],
  TOOTHACHE_GIVEN: ["STATUS"],

  // --- A new owner. ---
  UNIT_MIND_CONTROLLED: ["OWNER"],
  UNIT_RELEASED: ["OWNER"],
  SHIP_BOARDED: ["OWNER"],

  // --- Off the board. ---
  UNIT_DIED: ["GONE"],
  UNIT_SWALLOWED: ["GONE"],
  UNIT_SACRIFICED: ["GONE"],
  UNIT_SEIZED: ["GONE"],
  UNIT_DISBANDED: ["GONE"],
  UNIT_EMBARKED: ["GONE"],
  // A Mole and its rider go underground.
  UNIT_TUNNELLED: ["GONE"],
};

/**
 * The classified paths that have no hand-built proof in the test, each with
 * the reason. The state comparison still covers them (the synthetic cases
 * of the test break a strand for each cause without any command); what is
 * missing is only a real command that takes the path to a channeller.
 */
export const UNPROVEN_DISRUPTION_PATHS_V7: Readonly<
  Partial<Record<DomainEventV7["kind"], string>>
> = {
  SHIP_BOARDED: "only a ship is boarded; a watched unit is in land form",
  UNITS_CRUSHED: "only a unit afloat is icebound; a watched unit is on land",
  UNIT_RELEASED:
    "a released unit goes back to its owner; a mind-controlled cultist lost its strand, its grip, and its Channel when it was taken",
  UNIT_DISBANDED:
    "a strand holder and an Idol Bearer with a raised idol have spent their action, and a Thing is never disbanded",
  UNIT_TUNNELLED: "only a Dwarf Hammerer rides a Mole",
  UNIT_EMBARKED:
    "a strand holder has spent its action and cannot Move; a gripping Thing that embarks needs a Port (the bare state pairs cover a unit that is no longer in land form)",
  UNIT_BEAMED:
    "a Saucer beams only its own seat's units, and no Martian seat has a cultist",
  GOBLIN_TOSSED: "a Troll throws only a Goblin of its own seat",
  UNIT_SPAWN_DISPLACED:
    "a new unit takes the center only when every tile next to it is taken (tuning 6); the shove is a plain change of tile",
  GATE_DISPLACED:
    "needs a Dimensional Gate pair (a generated curiosity board); the shove is a plain change of tile",
  CRUMBS_EATEN:
    "Peppermint Surprise hurts a unit that ends its own Move or landing on Crumbs; a watched unit does neither",
  UNIT_SURFACED:
    "a surfacing eruption needs a burrowed Mole from an earlier turn; it is fixed damage like a Stomp",
  UNIT_BOMBED:
    "a bombing run needs a flight path; it is fixed damage like a Stomp",
};

/** How a key of the game state bears on the disruption rule. */
export type DisruptionStateKeyClassV7 =
  /** The units themselves: Hit Points, tile, form, and owner are read here. */
  | "UNITS"
  /**
   * A list of units with a status another seat can put on a unit: read by
   * `disruptingStatusKeysV7`; a unit new to it is disrupted.
   */
  | "STATUS"
  /**
   * A list that names units for another reason (its entries are a unit's
   * own doing, a marker of its own seat's turn, or follow a change the
   * comparison already sees). The reason is beside each.
   */
  | "NOT_A_STATUS"
  /** Nothing about a unit on the board. */
  | "OTHER";

export const DISRUPTION_STATE_KEY_CLASSES_V7: Readonly<
  Record<keyof GameStateV7, DisruptionStateKeyClassV7>
> = {
  units: "UNITS",
  plagued: "STATUS",
  bitten: "STATUS",
  frozen: "STATUS",
  stuck: "STATUS",
  toothache: "STATUS",
  splattedThisTurn: "STATUS",
  // Terror, the hunted mark, and the bombed mark come with a hit, and are
  // statuses all the same (a hit a Shield absorbed still marks the unit).
  terrorThisTurn: "STATUS",
  huntedThisTurn: "STATUS",
  bombedThisTurn: "STATUS",
  // Holds `crackedThisTurn` (the Thagomizer's Cracked).
  ninthUnit: "STATUS",
  // A mind-controlled unit changed owner: the comparison sees the owner.
  mindControlled: "NOT_A_STATUS",
  // A swallowed or burrowed unit is off the board: the comparison sees it
  // gone.
  giants: "NOT_A_STATUS",
  burrowed: "NOT_A_STATUS",
  // A unit's own state, set by its own action or its own kind's rules: a
  // Shield, Cooling, a Brain's cooldown, Sugar Rush and the Crash, an Egg's
  // countdown, and the per-turn markers of the active seat's own units.
  shields: "NOT_A_STATUS",
  cooling: "NOT_A_STATUS",
  mindControlCooldowns: "NOT_A_STATUS",
  sugarRush: "NOT_A_STATUS",
  eggs: "NOT_A_STATUS",
  surfacedThisTurn: "NOT_A_STATUS",
  beamedThisTurn: "NOT_A_STATUS",
  tractorUsedThisTurn: "NOT_A_STATUS",
  tossedThisTurn: "NOT_A_STATUS",
  berserkThisTurn: "NOT_A_STATUS",
  feastedThisTurn: "NOT_A_STATUS",
  // The neutral units' registry (breed, home, who provoked it).
  monsters: "NOT_A_STATUS",
  // The channel itself.
  cult: "NOT_A_STATUS",
  schemaVersion: "OTHER",
  rulesetId: "OTHER",
  setup: "OTHER",
  random: "OTHER",
  humanPlayerId: "OTHER",
  nextEntityId: "OTHER",
  commandIndex: "OTHER",
  round: "OTHER",
  activeSeatIndex: "OTHER",
  turnOrder: "OTHER",
  board: "OTHER",
  players: "OTHER",
  cities: "OTHER",
  populationContributions: "OTHER",
  treasureChests: "OTHER",
  curiosities: "OTHER",
  ice: "OTHER",
  graves: "OTHER",
  crumbs: "OTHER",
  glazedThisTurn: "OTHER",
  barricades: "OTHER",
  scoreLedger: "OTHER",
  pendingChoices: "OTHER",
  outcome: "OTHER",
};
