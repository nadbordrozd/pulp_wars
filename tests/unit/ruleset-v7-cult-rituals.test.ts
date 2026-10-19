import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  BOARD_SUMMONED_ROLE_IDS_V7,
  COMMAND_KIND_ORDER_V7,
  CULT_SUMMONED_ROLE_RULES_V7,
  DOMAIN_EVENT_KIND_ORDER_V7,
  FACTION_IDS_V7,
  FAVOUR_PURPOSES_V7,
  FAVOUR_SOURCES_V7,
  MIND_CONTROLLED_LOST_ABILITIES_V7,
  NEUTRAL_OWNER_ID_V7,
  NEUTRAL_ROLE_MECHANICS_V7,
  NEUTRAL_ROLE_RULES_V7,
  PRIOR_RULESET_7_IDS,
  PROCLAIM_RANGE_V7,
  RAVAGE_ATTACKS_V7,
  RITUAL_FIZZLE_REASONS_V7,
  RITUAL_KINDS_V7,
  RITUAL_MINIMUM_CHANTERS_V7,
  RULESET_7_ID,
  SAVE_STORAGE_KEY_V7,
  STARFALL_BASE_DAMAGE_V7,
  STARFALL_MAXIMUM_RANGE_V7,
  STARFALL_MINIMUM_RANGE_V7,
  SUMMONED_MECHANICAL_ROLES_V7,
  TECHNOLOGY_IDS_V7,
  applyCommandV7,
  attackAllowanceV7,
  attackCracksV7,
  canonicalRitualTileFactsV7,
  summoningMarkOutcomeV7,
  attackIsFrostbittenV7,
  attackSplatAppliesV7,
  attacksLeftV7,
  calculateCombatPreviewV7,
  canBeFrozenV7,
  cityIncomeV7,
  cityIsCowedV7,
  defenderCrushableV7,
  effectiveRoleRuleV7,
  factionTreeV7,
  favourOfV7,
  isCityCowedV7,
  joinChantRejectionV7,
  parseCommandV7,
  parseEventV7,
  parseGameStateV7,
  previewBeginRitualV7,
  previewChannelV7,
  previewGateV7,
  previewJoinChantV7,
  previewProclaimV7,
  previewRampageV7,
  previewRitualV7,
  projectEventsV7,
  queryCombatPreviewV7,
  queryPlayerCommandsV7,
  ritualChantersV7,
  starfallAreaV7,
  starfallDamageV7,
  summonedUnitRoleMechanicsV7,
  summonedUnitRoleRuleV7,
  technologyCapabilitiesV7,
  tractorBeamTargetBlockV7,
  unitFavourValueV7,
  unitIsImmovableV7,
  unitIsUnstoppableV7,
  unitRoleMechanicsV7,
  unitRoleRuleV7,
  unitTakesCandyStatusV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type DomainEventV7,
  type GameStateV7,
  type PlayerId,
  type TechnologyIdV7,
} from "../../src/engine/index";
import { OBSOLETE_SAVE_STORAGE_KEYS_V7 } from "../../src/persistence/index";
import { checkedV7 } from "../fixtures/v7-builders";
import {
  cultFieldV7,
  withCowedV7,
  withFavourV7,
  withGripV7,
  withHorrorV7,
  withRitualV7,
  withStrandsV7,
  withUnboundHeraldV7,
} from "../fixtures/v7-cult";
import { cityOfV7 } from "../fixtures/v7-dinosaur-arena";
import {
  applyOkV7,
  endTurnUntilV7,
  seatIdV7,
  unitAtV7,
  type GoblinPieceV7,
} from "../fixtures/v7-goblin-arena";
import { withFrozenUnitsV7 } from "../fixtures/v7-ice-folk";
import { offeredV7, playV7, rejectedV7 } from "../fixtures/v7-martian";
import {
  round2ArenaV7,
  round2SeatV7,
  round2UnitAtV7,
} from "../fixtures/v7-round2-arena";
import {
  at,
  attackV7,
  fieldDefenseV7,
  kindsV7,
  patchUnitV7,
  tileV7,
  unexploreV7,
} from "../fixtures/v7-revision20";

/**
 * The Cultists of the Ancient Ones, engine bead E5 (`pulp_wars-mch9.7`,
 * docs/product/RULESET_7_CULTISTS.md sections 7, 4.2, and 8.6): the ritual
 * frame and its participants, Star-fall, the Great Summoning (consume or
 * block) and the Herald's arrival, the Herald (Ravage, Unstoppable and its
 * immunities, Proclaim), and the Cowed city.
 *
 * Every state here is built by hand; no match is played. The field is the
 * two-seat 11 x 11 board of `fieldV7`: seat 0 (the Cult) capital (8, 8)
 * with territory x 7 to 9, y 7 to 9; seat 1 (Human unless a case says
 * otherwise) capital (2, 8) with territory x 1 to 3, y 7 to 9; villages on
 * (5, 5), (8, 5), and (5, 8); everything else open Grass, all of it explored
 * by both seats. The Cult's roles: `FIGHTER` Initiate, `GUARD` Idol Bearer,
 * `CAPTAIN` Summoner, `CATAPULT` Stargazer, `SWORDSMAN` Chosen, `RAIDER`
 * Familiar, `JUGGERNAUT` Thing in the Cellar.
 */

function need<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) throw new Error("missing");
  return value;
}

const cultId = (state: GameStateV7): PlayerId => seatIdV7(state, 0);
const otherId = (state: GameStateV7): PlayerId => seatIdV7(state, 1);

const eventsOf = <K extends DomainEventV7["kind"]>(
  events: readonly DomainEventV7[],
  kind: K,
): Extract<DomainEventV7, { kind: K }>[] =>
  events.filter(
    (event): event is Extract<DomainEventV7, { kind: K }> =>
      event.kind === kind,
  );

const idAt = (state: GameStateV7, where: CoordV7) => unitAtV7(state, where).id;
const unitOf = (state: GameStateV7, unitId: number) =>
  state.units.find((unit) => unit.id === unitId);
const ledger = (state: GameStateV7, playerId: PlayerId) =>
  need(state.scoreLedger.find((entry) => entry.playerId === playerId));
/** The income a Start Turn in `events` paid. */
function incomeOf(events: readonly DomainEventV7[]) {
  const event = events.find((entry) => entry.kind === "INCOME_AWARDED");
  if (event?.kind !== "INCOME_AWARDED") throw new Error("no income");
  return event;
}

/** The Stargazer's circle: it stands on (5, 2) with two Initiates beside it. */
const GAZER = at(5, 2);
const CHANTER_WEST = at(4, 2);
const CHANTER_EAST = at(6, 2);
const STAR = at(5, 6);
const circle: readonly GoblinPieceV7[] = [
  { seat: 0, role: "CATAPULT", at: GAZER },
  { seat: 0, role: "FIGHTER", at: CHANTER_WEST },
  { seat: 0, role: "FIGHTER", at: CHANTER_EAST },
];

const starfall = (state: GameStateV7, mark: CoordV7 = STAR): CommandV7 => ({
  kind: "BEGIN_RITUAL",
  ritual: "STARFALL",
  unitId: idAt(state, GAZER),
  at: mark,
});

/** The cultist on `where` joins the chant of the Stargazer on `leader`. */
const joinChant = (
  state: GameStateV7,
  where: CoordV7,
  leader: CoordV7 = GAZER,
): CommandV7 => ({
  kind: "JOIN_CHANT",
  unitId: idAt(state, where),
  leaderUnitId: idAt(state, leader),
});

/**
 * The Cult redesign (`pulp_wars-mch9.34`): the star begun alone on `mark`,
 * then joined by the cultists on `joiners` (the circle's two Initiates by
 * default), in that order.
 */
const chantedStar = (
  state: GameStateV7,
  joiners: readonly CoordV7[] = [CHANTER_WEST, CHANTER_EAST],
  mark: CoordV7 = STAR,
): GameStateV7 => {
  let current = playV7(state, starfall(state, mark)).state;
  for (const where of joiners)
    current = playV7(current, joinChant(current, where)).state;
  return current;
};

/** The Summoner's circle: it stands on (5, 2) with three Initiates north. */
const SUMMONER = at(5, 2);
const MARK = at(5, 3);
const TRIO = [at(4, 1), at(5, 1), at(6, 1)] as const;
const lodge: readonly GoblinPieceV7[] = [
  { seat: 0, role: "CAPTAIN", at: SUMMONER },
  ...TRIO.map((where) => ({ seat: 0, role: "FIGHTER" as const, at: where })),
];

const summoning = (state: GameStateV7, mark: CoordV7 = MARK): CommandV7 => ({
  kind: "BEGIN_RITUAL",
  ritual: "GREAT_SUMMONING",
  unitId: idAt(state, SUMMONER),
  at: mark,
});

/**
 * The lodge with `favour` Favour (by default the Great Summoning's 18, the
 * Cult redesign's price, `pulp_wars-mch9.32`) and the given other pieces.
 */
const lodgeField = (
  pieces: readonly GoblinPieceV7[] = [],
  favour = 18,
  options: Parameters<typeof cultFieldV7>[1] = {},
): GameStateV7 =>
  withFavourV7(cultFieldV7([...lodge, ...pieces], options), 0, favour);

/** A bound Herald of the Cult (seat 0) on `where`. */
const heraldField = (
  pieces: readonly GoblinPieceV7[],
  where: CoordV7,
  options: Parameters<typeof cultFieldV7>[1] = {},
  herald: Parameters<typeof withHorrorV7>[3] = {},
): GameStateV7 =>
  withHorrorV7(cultFieldV7(pieces, options), 0, where, {
    ...herald,
    role: "HERALD",
  });

/** Ends turns until the Cult's turn has started (its Start Turn has run). */
const toCultTurn = (state: GameStateV7) => endTurnUntilV7(state, cultId(state));

/** Every technology but `without`. */
const techsWithout = (without: TechnologyIdV7): readonly TechnologyIdV7[] =>
  TECHNOLOGY_IDS_V7.filter((tech) => tech !== without);

describe("rituals: identity", () => {
  // The Cult redesign's Star-fall and daemons (`pulp_wars-mch9.34`,
  // `pulp_wars-mch9.35`) took 7r88 after the natural water of 7r87; its
  // Favour economy and warden (`pulp_wars-mch9.32`, `pulp_wars-mch9.33`)
  // took 7r89 after it, and its Imp (`pulp_wars-mch9.36`) 7r90, and its
  // Gibbering Mass (`pulp_wars-mch9.37`) 7r91.
  it("was 7r88 for Star-fall alone and the daemons' advance, 7r87 refused", () => {
    expect(RULESET_7_ID).toBe("pulp-wars-poc-7r101");
    expect(SAVE_STORAGE_KEY_V7).toBe("pulpWars.save.v7r101.current");
    expect(PRIOR_RULESET_7_IDS.slice(-14, -12)).toEqual([
      "pulp-wars-poc-7r87",
      "pulp-wars-poc-7r88",
    ]);
    expect(OBSOLETE_SAVE_STORAGE_KEYS_V7.slice(-14, -12)).toEqual([
      "pulpWars.save.v7r87.current",
      "pulpWars.save.v7r88.current",
    ]);
    const state = cultFieldV7([]);
    expect(
      parseGameStateV7({ ...state, rulesetId: "pulp-wars-poc-7r87" }),
    ).toBeNull();
  });

  it("is a new identity after the Port network's 7r76, whose saves are obsolete", () => {
    const revision = Number(RULESET_7_ID.replace("pulp-wars-poc-7r", ""));
    expect(revision).toBeGreaterThanOrEqual(77);
    expect(PRIOR_RULESET_7_IDS).toContain("pulp-wars-poc-7r76");
    expect(PRIOR_RULESET_7_IDS).not.toContain(RULESET_7_ID);
    expect(SAVE_STORAGE_KEY_V7).toBe(`pulpWars.save.v7r${revision}.current`);
    expect(OBSOLETE_SAVE_STORAGE_KEYS_V7).toContain(
      "pulpWars.save.v7r76.current",
    );
    // A state of the earlier identity is not read as a current one.
    const state = cultFieldV7([]);
    expect(
      parseGameStateV7({ ...state, rulesetId: "pulp-wars-poc-7r76" }),
    ).toBeNull();
  });
});

describe("rituals: the registration (sections 4.2, 7.2, and 11)", () => {
  it("orders the new command and event kinds after the channel's", () => {
    const commands = COMMAND_KIND_ORDER_V7 as readonly string[];
    // (`pulp_wars-mch9.8` adds the four tricks after PROCLAIM.)
    expect(
      commands.slice(commands.indexOf("BOO"), commands.indexOf("BOO") + 4),
    ).toEqual(["BOO", "BEGIN_RITUAL", "PROCLAIM", "RIBBIT"]);
    const events = DOMAIN_EVENT_KIND_ORDER_V7 as readonly string[];
    const from = events.indexOf("DAEMON_BOUND");
    expect(events.slice(from, from + 10)).toEqual([
      "DAEMON_BOUND",
      "RITUAL_BEGUN",
      // (The Cult redesign, `pulp_wars-mch9.34`: a join of a star's chant.)
      "CHANT_JOINED",
      "RITUAL_DISRUPTED",
      "RITUAL_FIZZLED",
      "STAR_FELL",
      "UNIT_CONSUMED",
      "HERALD_ARRIVED",
      "CITY_COWED",
      // (`pulp_wars-mch9.8` adds its six kinds before the Spoils.)
      "UNIT_FROGGED",
    ]);
    expect(RITUAL_KINDS_V7).toEqual(["STARFALL", "GREAT_SUMMONING"]);
    expect(RITUAL_FIZZLE_REASONS_V7).toEqual(["LEADER", "CHANTERS", "BLOCKED"]);
    // (The trickle and Hunger joined with the Cult redesign,
    // `pulp_wars-mch9.32`; Offerings to the Deep with `pulp_wars-5ti.22`.)
    expect(FAVOUR_SOURCES_V7.at(-3)).toBe("CONSUMPTION");
    expect(FAVOUR_PURPOSES_V7.slice(0, 2)).toEqual([
      "SUMMON_HORROR",
      "GREAT_SUMMONING",
    ]);
  });

  it("holds the spec's numbers", () => {
    expect([
      STARFALL_BASE_DAMAGE_V7,
      STARFALL_MINIMUM_RANGE_V7,
      STARFALL_MAXIMUM_RANGE_V7,
      PROCLAIM_RANGE_V7,
      RAVAGE_ATTACKS_V7,
    ]).toEqual([6, 2, 4, 3, 2]);
    // The Cult redesign (`pulp_wars-mch9.34`, section 8.2): a star needs no
    // chanter; 6, plus 3 for each who joins: a Stargazer ringed by eight
    // joiners drops a 30.
    expect(RITUAL_MINIMUM_CHANTERS_V7).toEqual({
      STARFALL: 0,
      GREAT_SUMMONING: 3,
    });
    expect([0, 1, 2, 3, 4, 8].map(starfallDamageV7)).toEqual([
      6, 9, 12, 15, 18, 30,
    ]);
    expect(CULT_SUMMONED_ROLE_RULES_V7.HERALD).toMatchObject({
      maxHp: 60,
      attack2: 14,
      defense2: 8,
      move: 2,
      favourCost: 18,
      control: 3,
      value: 24,
      unstoppable: true,
    });
    expect(CULT_SUMMONED_ROLE_RULES_V7.HORROR.unstoppable).toBe(false);
    expect(CULT_SUMMONED_ROLE_RULES_V7.TENTACLE.unstoppable).toBe(false);
  });

  it("gives the Stargazer Star-fall and the Cult's Explosives the Great Summoning", () => {
    expect(effectiveRoleRuleV7("CATAPULT", "CULT").abilities).toEqual([
      "CAPTURE",
      "CHANNEL",
      "STARFALL",
      "JOIN_CHANT",
    ]);
    // No other role of any faction has it.
    for (const faction of FACTION_IDS_V7)
      for (const [role, rule] of Object.entries(
        factionTreeV7(faction).roleRules,
      ))
        expect(rule.abilities.includes("STARFALL"), `${faction} ${role}`).toBe(
          faction === "CULT" && role === "CATAPULT",
        );
    const explosives = need(
      factionTreeV7("CULT").nodes.find((node) => node.id === "EXPLOSIVES"),
    );
    expect(explosives.unlocks.map((unlock) => unlock.kind)).toContain(
      "GREAT_SUMMONING",
    );
    for (const faction of FACTION_IDS_V7)
      expect(
        technologyCapabilitiesV7([...TECHNOLOGY_IDS_V7], faction)
          .greatSummoning,
        faction,
      ).toBe(faction === "CULT");
    expect(
      technologyCapabilitiesV7(techsWithout("EXPLOSIVES"), "CULT")
        .greatSummoning,
    ).toBe(false);
    // Rituals need a Cult seat.
    expect(MIND_CONTROLLED_LOST_ABILITIES_V7).toEqual(
      expect.arrayContaining(["STARFALL", "SUMMON", "JOIN_CHANT"]),
    );
  });

  it("registers the Herald as a unit a seat commands, with the big body's mechanical role", () => {
    expect(BOARD_SUMMONED_ROLE_IDS_V7).toEqual([
      "HORROR",
      "HERALD",
      "IMP",
      "MASS",
    ]);
    expect(SUMMONED_MECHANICAL_ROLES_V7.HERALD).toBe("JUGGERNAUT");
    // The same role bound and Unbound: a daemon keeps it when it breaks.
    expect(NEUTRAL_ROLE_RULES_V7.HERALD.role).toBe("JUGGERNAUT");
    const rule = summonedUnitRoleRuleV7("HERALD");
    expect(rule).toMatchObject({
      role: "JUGGERNAUT",
      label: "Herald",
      cost: null,
      technology: null,
      maxHp: 60,
      attack2: 14,
      defense2: 8,
      move: 2,
      range: 1,
      sightRadius: 1,
      mayUsePrimaryActionAfterMove: true,
    });
    expect(rule.abilities).toEqual([
      "ATTACK",
      "CAPTURE",
      "RAVAGE",
      "UNSTOPPABLE",
      "PROCLAIM",
      "STRIDE",
    ]);
    // Unbound it attacks, and nothing else; Unstoppable is the body's rule.
    expect(NEUTRAL_ROLE_RULES_V7.HERALD.abilities).toEqual([
      "ATTACK",
      "UNSTOPPABLE",
      "STRIDE",
    ]);
    for (const mechanics of [
      summonedUnitRoleMechanicsV7("HERALD"),
      NEUTRAL_ROLE_MECHANICS_V7.HERALD,
    ])
      expect(mechanics).toMatchObject({
        ravageAttacks: 2,
        advancesAfterKill: true, // since the Cult redesign, `pulp_wars-mch9.35`
        ignoresFortification: true,
        immovable: true,
        construct: true,
        movementMode: "STRIDE",
        capacitySlots: 1,
        // None of the giants' signatures.
        crushDamage: 0,
        swallowMaxHp: 0,
        stompDamage: 0,
        siegeHammer: false,
      });
    // Every other role of every faction attacks once a turn.
    for (const faction of FACTION_IDS_V7)
      for (const mechanics of Object.values(
        factionTreeV7(faction).roleMechanics,
      ))
        expect(mechanics.ravageAttacks).toBe(1);
    expect(summonedUnitRoleMechanicsV7("HORROR").ravageAttacks).toBe(1);
    expect(unitIsUnstoppableV7({ summoned: "HERALD" })).toBe(true);
    expect(unitIsUnstoppableV7({ summoned: "HORROR" })).toBe(false);
    expect(unitIsUnstoppableV7({})).toBe(false);
  });

  it("parses the two commands and nothing near them", () => {
    const ok = (input: unknown) => parseCommandV7(input).ok;
    expect(
      ok({ kind: "BEGIN_RITUAL", ritual: "STARFALL", unitId: 5, at: at(1, 2) }),
    ).toBe(true);
    expect(
      ok({
        kind: "BEGIN_RITUAL",
        ritual: "GREAT_SUMMONING",
        unitId: 5,
        at: at(1, 2),
      }),
    ).toBe(true);
    expect(ok({ kind: "PROCLAIM", unitId: 5, cityId: 2 })).toBe(true);
    for (const bad of [
      { kind: "BEGIN_RITUAL", ritual: "SUMMON", unitId: 5, at: at(1, 2) },
      { kind: "BEGIN_RITUAL", unitId: 5, at: at(1, 2) },
      { kind: "BEGIN_RITUAL", ritual: "STARFALL", unitId: 5 },
      { kind: "BEGIN_RITUAL", ritual: "STARFALL", unitId: 0, at: at(1, 2) },
      { kind: "PROCLAIM", unitId: 5 },
      { kind: "PROCLAIM", unitId: 5, cityId: 2, at: at(1, 2) },
      { kind: "PROCLAIM", unitId: 5, cityId: 0 },
    ])
      expect(ok(bad), JSON.stringify(bad)).toBe(false);
  });

  it("stores only what a state may hold", () => {
    const state = cultFieldV7([
      ...circle,
      { seat: 0, role: "RAIDER", at: at(5, 1) },
      { seat: 1, role: "FIGHTER", at: at(2, 2) },
    ]);
    const leader = idAt(state, GAZER);
    const west = idAt(state, CHANTER_WEST);
    const east = idAt(state, CHANTER_EAST);
    const good = {
      kind: "STARFALL",
      playerId: cultId(state),
      leaderUnitId: leader,
      chanterUnitIds: [west, east],
      at: STAR,
    };
    const withCult = (value: object): unknown => ({
      ...state,
      cult: { ...state.cult, ...value },
    });
    expect(parseGameStateV7(withCult({ rituals: [good] }))).not.toBeNull();
    // A star with no chanter (the Cult redesign, `pulp_wars-mch9.34`).
    expect(
      parseGameStateV7(
        withCult({ rituals: [{ ...good, chanterUnitIds: [] }] }),
      ),
    ).not.toBeNull();
    const city = cityOfV7(state, 1);
    expect(
      parseGameStateV7(withCult({ cowed: [{ cityId: city.id, endsLeft: 1 }] })),
    ).not.toBeNull();
    for (const [label, value] of [
      ["no rituals list", { rituals: undefined }],
      ["an unknown rite", { rituals: [{ ...good, kind: "RIBBIT" }] }],
      [
        "chanters out of order",
        { rituals: [{ ...good, chanterUnitIds: [east, west] }] },
      ],
      [
        "the leader chants",
        { rituals: [{ ...good, chanterUnitIds: [leader, west] }] },
      ],
      [
        "a Familiar chants",
        { rituals: [{ ...good, chanterUnitIds: [idAt(state, at(5, 1))] }] },
      ],
      [
        "an enemy chants",
        { rituals: [{ ...good, chanterUnitIds: [idAt(state, at(2, 2))] }] },
      ],
      [
        "another seat's ritual",
        { rituals: [{ ...good, playerId: otherId(state) }] },
      ],
      ["a mark off the board", { rituals: [{ ...good, at: at(40, 2) }] }],
      [
        "an Initiate leads a star",
        {
          rituals: [{ ...good, leaderUnitId: west, chanterUnitIds: [leader] }],
        },
      ],
      [
        "a Great Summoning led by a Stargazer",
        { rituals: [{ ...good, kind: "GREAT_SUMMONING" }] },
      ],
      [
        "a participant with a strand",
        {
          rituals: [good],
          strands: [{ cultistUnitId: west, daemonUnitId: leader }],
        },
      ],
      ["an unknown city", { cowed: [{ cityId: 999, endsLeft: 1 }] }],
      ["two turns", { cowed: [{ cityId: city.id, endsLeft: 2 }] }],
      [
        "twice",
        {
          cowed: [
            { cityId: city.id, endsLeft: 1 },
            { cityId: city.id, endsLeft: 1 },
          ],
        },
      ],
    ] as const)
      expect(parseGameStateV7(withCult(value)), label).toBeNull();
    // A Great Summoning's mark is next to its leader.
    const summoned = lodgeField();
    const lodgeRitual = {
      kind: "GREAT_SUMMONING",
      playerId: cultId(summoned),
      leaderUnitId: idAt(summoned, SUMMONER),
      chanterUnitIds: TRIO.map((where) => idAt(summoned, where)),
      at: MARK,
    };
    const withLodge = (ritual: object): unknown => ({
      ...summoned,
      cult: { ...summoned.cult, rituals: [ritual] },
    });
    expect(parseGameStateV7(withLodge(lodgeRitual))).not.toBeNull();
    expect(
      parseGameStateV7(withLodge({ ...lodgeRitual, at: at(5, 5) })),
    ).toBeNull();
    expect(
      parseGameStateV7(
        withLodge({
          ...lodgeRitual,
          chanterUnitIds: lodgeRitual.chanterUnitIds.slice(0, 2),
        }),
      ),
    ).toBeNull();
  });
});

describe("rituals: taking part (section 7.1)", () => {
  it("begins a Star-fall alone, and lets every unused robed cultist beside the Stargazer join it", () => {
    const state = cultFieldV7([
      ...circle,
      // A Familiar and a Thing are no robed cultists; a cultist that has
      // acted, and one two tiles away, cannot join.
      { seat: 0, role: "RAIDER", at: at(5, 1) },
      { seat: 0, role: "JUGGERNAUT", at: at(4, 1) },
      {
        seat: 0,
        role: "FIGHTER",
        at: at(6, 1),
        activation: { attacked: true, attacksUsed: 1 },
      },
      { seat: 0, role: "FIGHTER", at: at(7, 2) },
      // A cultist that moved this turn may still join.
      {
        seat: 0,
        role: "GUARD",
        at: at(5, 3),
        activation: { moved: true, movedPathLength: 1 },
      },
      { seat: 1, role: "FIGHTER", at: STAR },
    ]);
    const leader = idAt(state, GAZER);
    const chanters = [CHANTER_WEST, CHANTER_EAST, at(5, 3)]
      .map((where) => idAt(state, where))
      .sort((left, right) => left - right);
    // The circle (the Great Summoning's joiners at its begin) is these.
    expect(
      ritualChantersV7(state, state.units, unitAtV7(state, GAZER)).map(
        (unit) => unit.id,
      ),
    ).toEqual(chanters);
    // Offered for every explored tile 2 to 4 tiles away, and only those.
    const marks = offeredV7(state, "BEGIN_RITUAL").map((command) =>
      command.kind === "BEGIN_RITUAL" ? command.at : at(-1, -1),
    );
    expect(marks.length).toBeGreaterThan(0);
    for (const mark of marks) {
      const distance = Math.max(
        Math.abs(mark.x - GAZER.x),
        Math.abs(mark.y - GAZER.y),
      );
      expect(distance).toBeGreaterThanOrEqual(2);
      expect(distance).toBeLessThanOrEqual(4);
    }
    // (5, 2) reaches x 1 to 9 and y 0 to 6 on the 11 x 11 board: 63 tiles,
    // less the 5 x 4 block within 1 tile that is on the board (x 4 to 6,
    // y 1 to 3: 9 tiles).
    expect(marks).toHaveLength(9 * 7 - 9);
    // The Cult redesign (`pulp_wars-mch9.34`, section 8.2): nobody is
    // swept in at the begin.
    const begun = playV7(state, starfall(state));
    expect(begun.events).toEqual([
      {
        kind: "RITUAL_BEGUN",
        playerId: cultId(state),
        ritual: "STARFALL",
        unitId: leader,
        chanterUnitIds: [],
        at: STAR,
      },
    ]);
    expect(begun.state.cult.rituals).toEqual([
      {
        kind: "STARFALL",
        playerId: cultId(state),
        leaderUnitId: leader,
        chanterUnitIds: [],
        at: STAR,
      },
    ]);
    // It costs no Favour, and spends the Stargazer's primary action only.
    expect(favourOfV7(begun.state, cultId(state))).toBe(0);
    expect(need(unitOf(begun.state, leader)).activation.specialActed).toBe(
      true,
    );
    for (const unitId of chanters)
      expect(need(unitOf(begun.state, unitId)).activation.specialActed).toBe(
        false,
      );
    // Each unused robed cultist beside it is offered the join, and only
    // they are.
    expect(
      offeredV7(begun.state, "JOIN_CHANT").map((command) =>
        command.kind === "JOIN_CHANT"
          ? [command.unitId, command.leaderUnitId]
          : [],
      ),
    ).toEqual(chanters.map((unitId) => [unitId, leader]));
    // They join one by one: each join is the joiner's primary action, and
    // the star grows by 3 each time.
    let joined = begun.state;
    const damages: number[] = [];
    for (const unitId of chanters) {
      const step = playV7(joined, {
        kind: "JOIN_CHANT",
        unitId,
        leaderUnitId: leader,
      });
      expect(step.events).toHaveLength(1);
      const event = need(eventsOf(step.events, "CHANT_JOINED")[0]);
      expect(event).toMatchObject({
        playerId: cultId(state),
        unitId,
        leaderUnitId: leader,
      });
      expect(parseEventV7(event).ok).toBe(true);
      damages.push(event.damage);
      joined = step.state;
    }
    expect(damages).toEqual([9, 12, 15]);
    expect(joined.cult.rituals).toEqual([
      {
        kind: "STARFALL",
        playerId: cultId(state),
        leaderUnitId: leader,
        chanterUnitIds: chanters,
        at: STAR,
      },
    ]);
    for (const unitId of [leader, ...chanters]) {
      const unit = need(unitOf(joined, unitId));
      expect(unit.activation.specialActed).toBe(true);
      expect(
        offeredV7(joined).filter(
          (command) =>
            "unitId" in command &&
            command.unitId === unitId &&
            command.kind !== "WAIT" &&
            command.kind !== "DISBAND" &&
            command.kind !== "PROMOTE",
        ),
      ).toEqual([]);
    }
    // The others are untouched.
    expect(
      need(unitOf(joined, idAt(state, at(7, 2)))).activation.specialActed,
    ).toBe(false);
    // One ritual per leader: it cannot begin again this turn.
    expect(rejectedV7(begun.state, starfall(begun.state))).toEqual({
      code: "UNIT_ALREADY_ACTED",
      params: { unitId: leader },
    });
  });

  it("refuses a join that is not legal (section 8.2)", () => {
    const state = withFrozenUnitsV7(
      cultFieldV7(
        [
          ...circle,
          // Two tiles off; acted; Frozen; a Familiar; a second Stargazer.
          { seat: 0, role: "FIGHTER", at: at(7, 2) },
          {
            seat: 0,
            role: "FIGHTER",
            at: at(6, 1),
            activation: { attacked: true, attacksUsed: 1 },
          },
          { seat: 0, role: "FIGHTER", at: at(4, 1) },
          { seat: 0, role: "RAIDER", at: at(5, 1) },
          { seat: 0, role: "CATAPULT", at: at(4, 3) },
          { seat: 1, role: "FIGHTER", at: STAR },
        ],
        { factions: ["CULT", "ICE_FOLK"] },
      ),
      [{ at: at(4, 1), turnsLeft: 1 }],
    );
    // No star yet: nothing to join.
    expect(offeredV7(state, "JOIN_CHANT")).toEqual([]);
    expect(rejectedV7(state, joinChant(state, CHANTER_WEST))).toEqual({
      code: "JOIN_CHANT_NOT_LEGAL",
      params: { reason: "RITUAL" },
    });
    const begun = playV7(state, starfall(state)).state;
    const refused = (where: CoordV7, leader: CoordV7 = GAZER) =>
      rejectedV7(begun, joinChant(begun, where, leader));
    expect(refused(at(7, 2))).toEqual({
      code: "JOIN_CHANT_NOT_LEGAL",
      params: { reason: "ADJACENT" },
    });
    expect(refused(at(6, 1))).toEqual({
      code: "JOIN_CHANT_NOT_LEGAL",
      params: { reason: "ACTED" },
    });
    // A Frozen unit is refused by the reducer's own gate first; the shared
    // predicate (the public query's) says why.
    expect(refused(at(4, 1))).toEqual({
      code: "UNIT_FROZEN",
      params: { unitId: idAt(begun, at(4, 1)) },
    });
    expect(
      joinChantRejectionV7(
        begun,
        begun.cult.rituals,
        unitAtV7(begun, at(4, 1)),
        unitAtV7(begun, GAZER),
      ),
    ).toEqual({ code: "JOIN_CHANT_NOT_LEGAL", reason: "STATUS" });
    expect(refused(at(5, 1))).toEqual({
      code: "UNIT_ROLE_INVALID",
      params: { role: "RAIDER" },
    });
    // The leader itself chants already; the other Stargazer leads no star.
    expect(refused(GAZER, at(4, 3))).toEqual({
      code: "JOIN_CHANT_NOT_LEGAL",
      params: { reason: "CHANTING" },
    });
    expect(refused(CHANTER_WEST, at(4, 3))).toEqual({
      code: "JOIN_CHANT_NOT_LEGAL",
      params: { reason: "RITUAL" },
    });
    // A second Stargazer that has not acted joins as any robed cultist.
    const second = playV7(begun, joinChant(begun, at(4, 3)));
    expect(eventsOf(second.events, "CHANT_JOINED")).toMatchObject([
      { damage: 9 },
    ]);
    // A joiner joins once.
    const once = playV7(begun, joinChant(begun, CHANTER_WEST)).state;
    expect(rejectedV7(once, joinChant(once, CHANTER_WEST))).toEqual({
      code: "JOIN_CHANT_NOT_LEGAL",
      params: { reason: "CHANTING" },
    });
    // A frog neither joins.
    // (`tests/unit/ruleset-v7-cult-tricks.test.ts` hexes a cultist.)
    // Another seat's unit joins no Cult star: a Human Fighter beside it.
    const rival = cultFieldV7([
      ...circle,
      { seat: 1, role: "FIGHTER", at: at(6, 3) },
    ]);
    const rivalBegun = playV7(rival, starfall(rival)).state;
    expect(
      applyCommandV7(rivalBegun, otherId(rivalBegun), {
        kind: "JOIN_CHANT",
        unitId: idAt(rivalBegun, at(6, 3)),
        leaderUnitId: idAt(rivalBegun, GAZER),
      }).accepted,
    ).toBe(false);
    // The command parses with exactly its keys, two different units.
    const ok = (input: unknown) => parseCommandV7(input).ok;
    expect(ok({ kind: "JOIN_CHANT", unitId: 4, leaderUnitId: 5 })).toBe(true);
    for (const bad of [
      { kind: "JOIN_CHANT", unitId: 5, leaderUnitId: 5 },
      { kind: "JOIN_CHANT", unitId: 4 },
      { kind: "JOIN_CHANT", unitId: 4, leaderUnitId: 5, at: at(1, 1) },
      { kind: "JOIN_CHANT", unitId: 0, leaderUnitId: 5 },
    ])
      expect(ok(bad), JSON.stringify(bad)).toBe(false);
  });

  it("projects a join to every seat that sees the joiner or the Stargazer", () => {
    const state = cultFieldV7([
      ...circle,
      { seat: 1, role: "FIGHTER", at: STAR },
    ]);
    const begun = playV7(state, starfall(state)).state;
    const joined = playV7(begun, joinChant(begun, CHANTER_WEST));
    const human = otherId(state);
    expect(
      projectEventsV7(begun, joined.state, human, joined.events).events,
    ).toEqual(joined.events);
    const hidden = [GAZER, CHANTER_WEST, CHANTER_EAST];
    expect(
      projectEventsV7(
        unexploreV7(begun, 1, hidden),
        unexploreV7(joined.state, 1, hidden),
        human,
        joined.events,
      ).events,
    ).toEqual([]);
  });

  it("lets a cultist move up and join in the same turn, and not move after", () => {
    const state = cultFieldV7([
      { seat: 0, role: "CATAPULT", at: GAZER },
      { seat: 0, role: "FIGHTER", at: at(7, 2) },
      { seat: 1, role: "FIGHTER", at: STAR },
    ]);
    const begun = playV7(state, starfall(state)).state;
    const walker = idAt(state, at(7, 2));
    const moved = playV7(begun, {
      kind: "MOVE",
      unitId: walker,
      path: [CHANTER_EAST],
    }).state;
    const joined = playV7(moved, joinChant(moved, CHANTER_EAST));
    expect(joined.state.cult.rituals[0]?.chanterUnitIds).toEqual([walker]);
    // It cannot move after joining.
    expect(
      offeredV7(joined.state, "MOVE").filter(
        (command) => command.kind === "MOVE" && command.unitId === walker,
      ),
    ).toEqual([]);
  });

  it("previews a join: the star before and after, and the units it newly kills", () => {
    // A Fighter (15 HP) and a Human Archer on the star's tiles.
    const state = cultFieldV7([
      ...circle,
      { seat: 0, role: "FIGHTER", at: at(5, 3) },
      { seat: 1, role: "FIGHTER", at: STAR },
      { seat: 1, role: "MARKSMAN", at: at(6, 6) },
    ]);
    const joinedOnce = chantedStar(state, [CHANTER_WEST]);
    const view = viewForV7(joinedOnce, cultId(joinedOnce));
    const fighter = unitAtV7(joinedOnce, STAR);
    const archer = unitAtV7(joinedOnce, at(6, 6));
    const preview = need(
      previewJoinChantV7(
        view,
        idAt(joinedOnce, CHANTER_EAST),
        idAt(joinedOnce, GAZER),
      ),
    );
    expect(preview).toMatchObject({
      chantersBefore: 1,
      chantersAfter: 2,
      damageBefore: 9,
      damageAfter: 12,
    });
    expect(preview.before?.damage).toBe(9);
    expect(preview.after?.damage).toBe(12);
    // What newly dies at 12 that did not at 9.
    const dies = (hp: number, damage: number) => hp <= damage;
    expect(preview.newlyKills).toEqual(
      [fighter, archer]
        .filter((unit) => dies(unit.hp, 12) && !dies(unit.hp, 9))
        .map((unit) => unit.id)
        .sort((left, right) => left - right),
    );
    // Not offered, not previewed: a unit two tiles off, an enemy view.
    expect(
      previewJoinChantV7(view, idAt(joinedOnce, at(5, 3)), fighter.id),
    ).toBeNull();
    expect(
      previewJoinChantV7(
        viewForV7(joinedOnce, otherId(joinedOnce)),
        idAt(joinedOnce, CHANTER_EAST),
        idAt(joinedOnce, GAZER),
      ),
    ).toBeNull();
    // The public preview of the star under way counts its chanters.
    const ritual = need(view.cult.rituals[0]);
    expect(previewRitualV7(view, ritual).starfall?.damage).toBe(9);
  });

  it("refuses a Star-fall that cannot begin", () => {
    const state = cultFieldV7([
      ...circle,
      { seat: 1, role: "FIGHTER", at: STAR },
    ]);
    // Too near, too far, and off the board.
    for (const mark of [at(5, 3), at(5, 2), at(5, 7), at(10, 2)])
      expect(
        rejectedV7(state, starfall(state, mark)),
        `${mark.x},${mark.y}`,
      ).toEqual({ code: "RITUAL_NOT_LEGAL", params: { reason: "TILE" } });
    // A tile its seat has not explored.
    expect(rejectedV7(unexploreV7(state, 0, [STAR]), starfall(state))).toEqual({
      code: "RITUAL_NOT_LEGAL",
      params: { reason: "TILE" },
    });
    // A Stargazer that moved this turn.
    const moved = patchUnitV7(state, GAZER, {
      activation: {
        ...unitAtV7(state, GAZER).activation,
        moved: true,
        movedPathLength: 1,
      },
    });
    expect(rejectedV7(moved, starfall(moved))).toEqual({
      code: "RITUAL_NOT_LEGAL",
      params: { reason: "MOVED" },
    });
    // Nobody to chant is no reason since the Cult redesign
    // (`pulp_wars-mch9.34`): a lone Stargazer begins it.
    const alone = cultFieldV7([{ seat: 0, role: "CATAPULT", at: GAZER }]);
    expect(playV7(alone, starfall(alone)).state.cult.rituals).toHaveLength(1);
    // Only a Stargazer leads it.
    expect(
      rejectedV7(state, {
        kind: "BEGIN_RITUAL",
        ritual: "STARFALL",
        unitId: idAt(state, CHANTER_WEST),
        at: STAR,
      }),
    ).toEqual({ code: "UNIT_ROLE_INVALID", params: { role: "FIGHTER" } });
    // Not in another seat's turn.
    const waiting = applyOkV7(state, cultId(state), { kind: "END_TURN" }).state;
    expect(
      applyCommandV7(waiting, cultId(waiting), starfall(waiting)).accepted,
    ).toBe(false);
  });

  it("begins the Great Summoning for 18 Favour with three chanters or more", () => {
    const state = lodgeField([{ seat: 1, role: "FIGHTER", at: at(2, 2) }], 23);
    const leader = idAt(state, SUMMONER);
    const chanters = TRIO.map((where) => idAt(state, where));
    // Every tile next to the Summoner the Herald could stand on, also one
    // that holds a unit (a chanter here).
    expect(
      offeredV7(state, "BEGIN_RITUAL").map((command) =>
        command.kind === "BEGIN_RITUAL" ? [command.at.x, command.at.y] : [],
      ),
    ).toEqual([
      [4, 1],
      [5, 1],
      [6, 1],
      [4, 2],
      [6, 2],
      [4, 3],
      [5, 3],
      [6, 3],
    ]);
    const begun = playV7(state, summoning(state));
    expect(begun.events).toEqual([
      {
        kind: "FAVOUR_SPENT",
        playerId: cultId(state),
        purpose: "GREAT_SUMMONING",
        amount: 18,
        favour: 5,
      },
      {
        kind: "RITUAL_BEGUN",
        playerId: cultId(state),
        ritual: "GREAT_SUMMONING",
        unitId: leader,
        chanterUnitIds: chanters,
        at: MARK,
      },
    ]);
    expect(favourOfV7(begun.state, cultId(state))).toBe(5);
    expect(begun.state.cult.rituals).toEqual([
      {
        kind: "GREAT_SUMMONING",
        playerId: cultId(state),
        leaderUnitId: leader,
        chanterUnitIds: chanters,
        at: MARK,
      },
    ]);
    // No Herald yet.
    expect(begun.state.units.some((unit) => unit.summoned === "HERALD")).toBe(
      false,
    );
  });

  it("refuses a Great Summoning that cannot begin", () => {
    const state = lodgeField();
    // Short of Favour.
    const poor = lodgeField([], 17);
    expect(rejectedV7(poor, summoning(poor))).toEqual({
      code: "INSUFFICIENT_FAVOUR",
      params: { cost: 18 },
    });
    // Without The Stars Are Right.
    const early = lodgeField([], 18, {
      techs: { 0: techsWithout("EXPLOSIVES") },
    });
    expect(rejectedV7(early, summoning(early))).toEqual({
      code: "TECH_REQUIRED",
      params: { tech: "EXPLOSIVES" },
    });
    // Two chanters are not enough.
    const two = withFavourV7(cultFieldV7(lodge.slice(0, 3)), 0, 18);
    expect(rejectedV7(two, summoning(two))).toEqual({
      code: "RITUAL_NOT_LEGAL",
      params: { reason: "CHANTERS" },
    });
    // The mark is next to the Summoner, on land, off every center.
    for (const mark of [SUMMONER, at(5, 4), at(8, 2)])
      expect(rejectedV7(state, summoning(state, mark))).toEqual({
        code: "RITUAL_NOT_LEGAL",
        params: { reason: "TILE" },
      });
    const wet = lodgeField([], 18, { water: [MARK] });
    expect(rejectedV7(wet, summoning(wet))).toEqual({
      code: "RITUAL_NOT_LEGAL",
      params: { reason: "TILE" },
    });
    // A Summoner that moved may still lead it (a primary action that may
    // follow its Move); one that has acted may not.
    const moved = patchUnitV7(state, SUMMONER, {
      activation: {
        ...unitAtV7(state, SUMMONER).activation,
        moved: true,
        movedPathLength: 1,
      },
    });
    expect(playV7(moved, summoning(moved)).state.cult.rituals).toHaveLength(1);
    const acted = patchUnitV7(state, SUMMONER, {
      activation: {
        ...unitAtV7(state, SUMMONER).activation,
        specialActed: true,
      },
    });
    expect(rejectedV7(acted, summoning(acted))).toEqual({
      code: "UNIT_ALREADY_ACTED",
      params: { unitId: idAt(state, SUMMONER) },
    });
    // A Stargazer leads no Great Summoning.
    const gazer = withFavourV7(
      cultFieldV7([
        { seat: 0, role: "CATAPULT", at: SUMMONER },
        ...lodge.slice(1),
      ]),
      0,
      18,
    );
    expect(rejectedV7(gazer, summoning(gazer))).toEqual({
      code: "UNIT_ROLE_INVALID",
      params: { role: "CATAPULT" },
    });
  });

  it("shows a ritual to every seat that sees a participant or has explored its mark", () => {
    const begun = chantedStar(
      cultFieldV7([...circle, { seat: 1, role: "FIGHTER", at: STAR }]),
    );
    const leader = idAt(begun, GAZER);
    const chanters = [idAt(begun, CHANTER_WEST), idAt(begun, CHANTER_EAST)];
    const full = {
      kind: "STARFALL",
      playerId: cultId(begun),
      leaderUnitId: leader,
      chanterUnitIds: chanters,
      chanters: 2,
      at: STAR,
    };
    for (const seat of [0, 1])
      expect(viewForV7(begun, seatIdV7(begun, seat)).cult.rituals).toEqual([
        full,
      ]);
    // The other seat has not explored the circle: it knows the mark only.
    const blind = unexploreV7(begun, 1, [GAZER, CHANTER_WEST, CHANTER_EAST]);
    expect(viewForV7(blind, otherId(blind)).cult.rituals).toEqual([
      { ...full, leaderUnitId: null, chanterUnitIds: [] },
    ]);
    // It has explored one chanter's tile only: that candle, and no mark.
    const candle = unexploreV7(begun, 1, [GAZER, CHANTER_EAST, STAR]);
    expect(viewForV7(candle, otherId(candle)).cult.rituals).toEqual([
      { ...full, leaderUnitId: null, chanterUnitIds: [chanters[0]], at: null },
    ]);
    // It knows nothing of it.
    const dark = unexploreV7(begun, 1, [
      GAZER,
      CHANTER_WEST,
      CHANTER_EAST,
      STAR,
    ]);
    expect(viewForV7(dark, otherId(dark)).cult.rituals).toEqual([]);
    // Candlelit: a participant on an explored tile is visible to everyone.
    const seen = viewForV7(begun, otherId(begun)).units.map((unit) => unit.id);
    for (const unitId of [leader, ...chanters]) expect(seen).toContain(unitId);
  });
});

describe("rituals: breaking the circle (section 7.1)", () => {
  /**
   * A Star-fall under way (both Initiates joined), the Human to move, with
   * the given enemies.
   */
  const underWay = (enemies: readonly GoblinPieceV7[]): GameStateV7 => {
    const begun = chantedStar(cultFieldV7([...circle, ...enemies]));
    return applyOkV7(begun, cultId(begun), { kind: "END_TURN" }).state;
  };

  it("takes a chanter that is hurt out of the ritual, which goes on with the rest", () => {
    const state = underWay([{ seat: 1, role: "MARKSMAN", at: at(2, 2) }]);
    const leader = idAt(state, GAZER);
    const west = idAt(state, CHANTER_WEST);
    const east = idAt(state, CHANTER_EAST);
    const shot = attackV7(state, at(2, 2), CHANTER_WEST);
    expect(eventsOf(shot.events, "RITUAL_DISRUPTED")).toEqual([
      {
        kind: "RITUAL_DISRUPTED",
        playerId: cultId(state),
        ritual: "STARFALL",
        unitId: leader,
        participantUnitId: west,
        cause: "HP_LOSS",
      },
    ]);
    expect(eventsOf(shot.events, "RITUAL_FIZZLED")).toEqual([]);
    expect(shot.state.cult.rituals).toEqual([
      {
        kind: "STARFALL",
        playerId: cultId(state),
        leaderUnitId: leader,
        chanterUnitIds: [east],
        at: STAR,
      },
    ]);
    // The star is 3 weaker for it: 6 + 3.
    const landed = toCultTurn(shot.state);
    expect(eventsOf(landed.events, "STAR_FELL")).toMatchObject([
      { chanters: 1, damage: 9 },
    ]);
  });

  it("keeps a star whose every joiner is disrupted, and fizzles it when the leader is", () => {
    const state = underWay([
      { seat: 1, role: "MARKSMAN", at: at(2, 2) },
      { seat: 1, role: "MARKSMAN", at: at(8, 2) },
      { seat: 1, role: "MARKSMAN", at: at(5, 4) },
    ]);
    const leader = idAt(state, GAZER);
    const first = attackV7(state, at(2, 2), CHANTER_WEST);
    const second = attackV7(first.state, at(8, 2), CHANTER_EAST);
    expect(
      second.events.filter(
        (event) =>
          event.kind === "RITUAL_DISRUPTED" || event.kind === "RITUAL_FIZZLED",
      ),
    ).toEqual([
      {
        kind: "RITUAL_DISRUPTED",
        playerId: cultId(state),
        ritual: "STARFALL",
        unitId: leader,
        participantUnitId: idAt(state, CHANTER_EAST),
        cause: "HP_LOSS",
      },
    ]);
    // The Cult redesign (`pulp_wars-mch9.34`): a star never fizzles for
    // want of chanters; it lands alone, for 6.
    expect(second.state.cult.rituals).toMatchObject([
      { kind: "STARFALL", chanterUnitIds: [] },
    ]);
    expect(
      eventsOf(toCultTurn(second.state).events, "STAR_FELL"),
    ).toMatchObject([{ chanters: 0, damage: 6 }]);
    // The leader: one hit ends it whatever the chanters do.
    const beheaded = attackV7(state, at(5, 4), GAZER);
    expect(eventsOf(beheaded.events, "RITUAL_FIZZLED")).toMatchObject([
      { reason: "LEADER", unitId: leader },
    ]);
    expect(beheaded.state.cult.rituals).toEqual([]);
    for (const event of [...second.events, ...beheaded.events])
      expect(parseEventV7(event).ok, event.kind).toBe(true);
  });

  it("takes out a chanter beside a standing idol that is hurt (the aura keeps no participant)", () => {
    const state = cultFieldV7([
      ...circle,
      { seat: 0, role: "GUARD", at: at(3, 2) },
      { seat: 1, role: "MARKSMAN", at: at(2, 4) },
    ]);
    // The circle is under way (built by hand), and the Idol Bearer beside
    // its western chanter stands (its idol always raised since the Cult
    // redesign, `pulp_wars-mch9.33`).
    const raised = withRitualV7(
      patchUnitV7(state, at(3, 2), {
        activation: {
          ...unitAtV7(state, at(3, 2)).activation,
          specialActed: true,
          handled: true,
        },
      }),
      "STARFALL",
      GAZER,
      [CHANTER_WEST, CHANTER_EAST],
      STAR,
    );
    const turn = applyOkV7(raised, cultId(raised), {
      kind: "END_TURN",
    }).state;
    const shot = attackV7(turn, at(2, 4), CHANTER_WEST);
    expect(eventsOf(shot.events, "RITUAL_DISRUPTED")).toMatchObject([
      { participantUnitId: idAt(state, CHANTER_WEST), cause: "HP_LOSS" },
    ]);
  });

  it("takes out a chanter that is frozen, and one that is shoved", () => {
    // A status: an Ice Witch's Frost Bolt on the western chanter.
    const iced = cultFieldV7(
      [...circle, { seat: 1, role: "CAPTAIN", at: at(2, 2) }],
      { factions: ["CULT", "ICE_FOLK"] },
    );
    const begun = chantedStar(iced);
    const turn = applyOkV7(begun, cultId(begun), { kind: "END_TURN" }).state;
    const bolt = playV7(turn, {
      kind: "FROST_BOLT",
      unitId: idAt(turn, at(2, 2)),
      targetUnitId: idAt(turn, CHANTER_WEST),
    });
    expect(eventsOf(bolt.events, "RITUAL_DISRUPTED")).toEqual([
      {
        kind: "RITUAL_DISRUPTED",
        playerId: cultId(iced),
        ritual: "STARFALL",
        unitId: idAt(iced, GAZER),
        participantUnitId: idAt(iced, CHANTER_WEST),
        cause: "STATUS",
      },
    ]);
    expect(bolt.state.cult.rituals[0]?.chanterUnitIds).toEqual([
      idAt(iced, CHANTER_EAST),
    ]);
    // A push: a Human Juggernaut shoves the eastern chanter away. It lost
    // Hit Points too, which comes first in the frozen order of causes.
    const shover = underWay([{ seat: 1, role: "JUGGERNAUT", at: at(7, 2) }]);
    const east = idAt(shover, CHANTER_EAST);
    const pushed = attackV7(shover, at(7, 2), CHANTER_EAST);
    const left = eventsOf(pushed.events, "RITUAL_DISRUPTED");
    if (pushed.target === undefined) {
      expect(left).toMatchObject([{ participantUnitId: east, cause: "GONE" }]);
    } else {
      expect(left).toMatchObject([
        { participantUnitId: east, cause: "HP_LOSS" },
      ]);
    }
  });

  it("fizzles a Great Summoning with fewer than three chanters, and keeps the Favour", () => {
    const state = lodgeField(
      [
        { seat: 1, role: "MARKSMAN", at: at(2, 1) },
        { seat: 0, role: "FIGHTER", at: at(6, 2) },
      ],
      18,
    );
    // Four chanters: the fourth is insurance.
    const begun = playV7(state, summoning(state)).state;
    expect(begun.cult.rituals[0]?.chanterUnitIds).toHaveLength(4);
    const turn = applyOkV7(begun, cultId(begun), { kind: "END_TURN" }).state;
    const one = attackV7(turn, at(2, 1), at(4, 1));
    expect(eventsOf(one.events, "RITUAL_FIZZLED")).toEqual([]);
    expect(one.state.cult.rituals[0]?.chanterUnitIds).toHaveLength(3);
    // With exactly three, one hit is enough.
    const tight = lodgeField([{ seat: 1, role: "MARKSMAN", at: at(2, 1) }]);
    const tightBegun = playV7(tight, summoning(tight)).state;
    const tightTurn = applyOkV7(tightBegun, cultId(tightBegun), {
      kind: "END_TURN",
    }).state;
    const hit = attackV7(tightTurn, at(2, 1), at(4, 1));
    expect(eventsOf(hit.events, "RITUAL_FIZZLED")).toMatchObject([
      { ritual: "GREAT_SUMMONING", reason: "CHANTERS", at: MARK },
    ]);
    expect(hit.state.cult.rituals).toEqual([]);
    // Nothing is refunded, and no Herald arrives.
    expect(favourOfV7(hit.state, cultId(hit.state))).toBe(0);
    const round = toCultTurn(hit.state);
    expect(kindsV7(round.events)).not.toContain("HERALD_ARRIVED");
    expect(round.state.units.some((unit) => unit.summoned === "HERALD")).toBe(
      false,
    );
  });

  it("runs every accepted command through the ritual step, and the Start Turn through its own", () => {
    const source = readFileSync("src/engine/v7/reducer.ts", "utf8");
    const body = (name: string): string => {
      const from = source.indexOf(`\nfunction ${name}(`);
      expect(from, name).toBeGreaterThanOrEqual(0);
      return source.slice(from, source.indexOf("\n}\n", from));
    };
    const unscored = body("applyCommandUnscoredV7");
    // The ritual step wraps the channel's disruption step, with the state
    // the command began with.
    expect(unscored).toMatch(
      /const circles = withRitualDisruptionsResultV7\(stateInput, input, core\);/,
    );
    expect(unscored.indexOf("const circles =")).toBeGreaterThan(
      unscored.indexOf("const core ="),
    );
    // The Start Turn: the channel check, then the rituals, then the hatch.
    const endTurn = body("applyEndTurn");
    const channel = endTurn.indexOf("resolveStartTurnChannelStepV7(");
    const rituals = endTurn.indexOf("resolveStartTurnRitualsV7(");
    const hatch = endTurn.indexOf("resolveStartTurnHatchV7(");
    expect(channel).toBeGreaterThan(0);
    expect(rituals).toBeGreaterThan(channel);
    expect(hatch).toBeGreaterThan(rituals);
  });
});

describe("Star-fall (section 7.4)", () => {
  it("lands at the Cult's next Start Turn on everything in its area, friend and foe", () => {
    const state = fieldDefenseV7(
      cultFieldV7([
        ...circle,
        { seat: 1, role: "FIGHTER", at: STAR },
        // A Guard on Field Defense: the star ignores fortification.
        { seat: 1, role: "GUARD", at: at(4, 6) },
        // A hurt Knight dies (it rests to 7 HP at the end of its own turn
        // first); an own Idol Bearer in the area is hit too (an Initiate of
        // 7 HP would die since the Cult redesign, `pulp_wars-mch9.31`).
        { seat: 1, role: "KNIGHT", at: at(6, 7), hp: 5 },
        { seat: 0, role: "GUARD", at: at(6, 5) },
        // Just outside the area.
        { seat: 1, role: "FIGHTER", at: at(3, 6) },
      ]),
      at(4, 6),
    );
    const leader = idAt(state, GAZER);
    // One Initiate joins (the Cult redesign, `pulp_wars-mch9.34`): 6 + 3.
    const begun = chantedStar(state, [CHANTER_WEST]);
    const round = toCultTurn(begun);
    const fell = eventsOf(round.events, "STAR_FELL");
    expect(fell).toEqual([
      {
        kind: "STAR_FELL",
        playerId: cultId(state),
        unitId: leader,
        at: STAR,
        chanters: 1,
        damage: 9,
        results: [
          {
            unitId: idAt(state, at(6, 5)),
            at: at(6, 5),
            damage: 9,
            dies: false,
            shieldDamage: 0,
          },
          {
            unitId: idAt(state, at(4, 6)),
            at: at(4, 6),
            damage: 9,
            dies: false,
            shieldDamage: 0,
          },
          {
            unitId: idAt(state, STAR),
            at: STAR,
            damage: 9,
            dies: false,
            shieldDamage: 0,
          },
          {
            unitId: idAt(state, at(6, 7)),
            at: at(6, 7),
            // All its 7 HP.
            damage: 7,
            dies: true,
            shieldDamage: 0,
          },
        ],
        fieldDefenses: [at(4, 6)],
        barricades: [],
      },
    ]);
    for (const event of round.events)
      expect(parseEventV7(event).ok, event.kind).toBe(true);
    expect(parseGameStateV7(JSON.parse(JSON.stringify(round.state)))).toEqual(
      round.state,
    );
    // It lands inside the Cult's Start Turn, before its income.
    const kinds = kindsV7(round.events);
    expect(kinds.lastIndexOf("TURN_STARTED")).toBeLessThan(
      kinds.indexOf("STAR_FELL"),
    );
    expect(kinds.indexOf("STAR_FELL")).toBeLessThan(
      kinds.lastIndexOf("INCOME_AWARDED"),
    );
    // The Field Defense is gone, the Knight is dead (a death of the star,
    // credited to the Stargazer), and the others are hurt by 9.
    expect(tileV7(round.state, at(4, 6)).fieldDefense).toBe(false);
    expect(round.events).toContainEqual({
      kind: "FIELD_DEFENSE_DESTROYED",
      at: at(4, 6),
      reason: "STARFALL",
    });
    expect(round.events).toContainEqual({
      kind: "UNIT_DIED",
      unitId: idAt(state, at(6, 7)),
      cause: "STARFALL",
    });
    expect(unitOf(round.state, idAt(state, at(6, 7)))).toBeUndefined();
    expect(need(unitOf(round.state, leader)).kills).toBe(1);
    expect(unitAtV7(round.state, STAR).hp).toBe(12 - 9);
    expect(unitAtV7(round.state, at(4, 6)).hp).toBe(17 - 9);
    expect(unitAtV7(round.state, at(6, 5)).hp).toBe(16 - 9);
    expect(unitAtV7(round.state, at(3, 6)).hp).toBe(12);
    // The Score: a Kill for the Cult, a Loss for the Knight's seat.
    const knightValue = unitFavourValueV7(state, unitAtV7(state, at(6, 7)));
    expect(ledger(round.state, cultId(state)).killValue).toBe(knightValue);
    expect(ledger(round.state, otherId(state)).lossValue).toBe(knightValue);
    // The ritual is over, and the Stargazer, which has not moved, may begin
    // again at once.
    expect(round.state.cult.rituals).toEqual([]);
    expect(offeredV7(round.state, "BEGIN_RITUAL").length).toBeGreaterThan(0);
  });

  it("destroys every Barricade in its area, and hits ships and Eggs", () => {
    const base = cultFieldV7(
      [
        ...circle,
        { seat: 1, role: "FIGHTER", at: at(4, 5) },
        { seat: 1, role: "PATROL_BOAT", at: at(6, 6), form: "NAVAL" },
      ],
      { factions: ["CULT", "DWARF"], water: [at(6, 6)] },
    );
    const state = checkedV7({
      ...base,
      barricades: [
        { at: at(2, 2), ownerId: otherId(base), hp: 10 },
        { at: STAR, ownerId: otherId(base), hp: 10 },
      ],
    });
    const round = toCultTurn(playV7(state, starfall(state)).state);
    const fell = need(eventsOf(round.events, "STAR_FELL")[0]);
    expect(fell.barricades).toEqual([STAR]);
    expect(round.state.barricades).toEqual([
      { at: at(2, 2), ownerId: otherId(base), hp: 10 },
    ]);
    expect(fell.results.map((entry) => entry.unitId)).toEqual([
      idAt(state, at(4, 5)),
      idAt(state, at(6, 6)),
    ]);
  });

  it("pays nothing for an own unit it kills, and credits no kill for it", () => {
    // (A Chosen paid a Martyr here until the Cult redesign retired it,
    // `pulp_wars-mch9.31`.)
    const state = cultFieldV7([
      ...circle,
      { seat: 0, role: "GUARD", at: STAR, hp: 4 },
    ]);
    const round = toCultTurn(playV7(state, starfall(state)).state);
    expect(round.events).toContainEqual({
      kind: "UNIT_DIED",
      unitId: idAt(state, STAR),
      cause: "STARFALL",
    });
    expect(eventsOf(round.events, "FAVOUR_GAINED")).toEqual([]);
    expect(need(unitOf(round.state, idAt(state, GAZER))).kills).toBe(0);
    expect(ledger(round.state, cultId(state)).killValue).toBe(0);
  });

  it("is projected to a seat that sees the Stargazer or has explored the mark", () => {
    const state = cultFieldV7([
      ...circle,
      { seat: 1, role: "FIGHTER", at: STAR },
      { seat: 0, role: "FIGHTER", at: at(6, 6) },
    ]);
    const begun = playV7(state, starfall(state));
    const human = otherId(state);
    // It saw the circle begin.
    expect(
      projectEventsV7(state, begun.state, human, begun.events).events,
    ).toEqual(begun.events);
    const turn = applyOkV7(begun.state, cultId(state), { kind: "END_TURN" });
    const landing = applyOkV7(turn.state, human, { kind: "END_TURN" });
    const seen = projectEventsV7(
      turn.state,
      landing.state,
      human,
      landing.events,
    ).events;
    expect(seen.find((event) => event.kind === "STAR_FELL")).toEqual(
      landing.events.find((event) => event.kind === "STAR_FELL"),
    );
    // A seat that explored neither the circle nor the mark gets only its
    // own hits.
    const hidden = [GAZER, CHANTER_WEST, CHANTER_EAST, STAR, at(6, 6)];
    const blind = projectEventsV7(
      unexploreV7(turn.state, 1, hidden),
      unexploreV7(landing.state, 1, hidden),
      human,
      landing.events,
    ).events;
    expect(blind.some((event) => event.kind === "STAR_FELL")).toBe(false);
    expect(blind).toContainEqual({
      kind: "COMBAT_SPLASH_DAMAGE",
      splash: [
        {
          unitId: idAt(state, STAR),
          at: STAR,
          damage: 6,
          dies: false,
          shieldDamage: 0,
        },
      ],
    });
  });

  it("previews the star as the board stands, for its seat and for its victims", () => {
    const state = fieldDefenseV7(
      cultFieldV7([
        ...circle,
        { seat: 1, role: "FIGHTER", at: STAR, hp: 6 },
        // An own Idol Bearer (an Initiate of 7 HP would die since the Cult
        // redesign, `pulp_wars-mch9.31`).
        { seat: 0, role: "GUARD", at: at(6, 6) },
      ]),
      at(4, 7),
    );
    const cult = viewForV7(state, cultId(state));
    const preview = need(
      previewBeginRitualV7(cult, idAt(state, GAZER), "STARFALL", STAR),
    );
    // The Cult redesign (`pulp_wars-mch9.34`): it begins alone, for 6.
    expect(preview).toMatchObject({
      ritual: "STARFALL",
      at: STAR,
      chanterUnitIds: [],
      favour: 0,
      favourAfter: 0,
      summoning: null,
    });
    expect(preview.starfall).toEqual({
      at: STAR,
      chanters: 0,
      damage: 6,
      area: starfallAreaV7(11, 11, STAR),
      results: [
        {
          unitId: idAt(state, STAR),
          ownerId: otherId(state),
          at: STAR,
          damage: 6,
          dies: true,
          shieldDamage: 0,
        },
        {
          unitId: idAt(state, at(6, 6)),
          ownerId: cultId(state),
          at: at(6, 6),
          damage: 6,
          dies: false,
          shieldDamage: 0,
        },
      ],
      fieldDefenses: [at(4, 7)],
      barricades: [],
      exact: true,
    });
    // Not offered: no preview.
    expect(
      previewBeginRitualV7(cult, idAt(state, GAZER), "STARFALL", at(5, 3)),
    ).toBeNull();
    // Under way, every seat that knows the mark reads the same forecast.
    const begun = playV7(state, starfall(state)).state;
    for (const seat of [0, 1]) {
      const view = viewForV7(begun, seatIdV7(begun, seat));
      const ritual = need(view.cult.rituals[0]);
      expect(previewRitualV7(view, ritual)).toEqual({
        ritual,
        starfall: preview.starfall,
        summoning: null,
      });
    }
    // A seat that has not explored the mark has no forecast, and one that
    // has not explored a tile of the area is told so.
    const blind = viewForV7(unexploreV7(begun, 1, [STAR]), otherId(begun));
    expect(
      previewRitualV7(blind, need(blind.cult.rituals[0])).starfall,
    ).toBeNull();
    const partial = viewForV7(
      unexploreV7(begun, 1, [at(6, 7)]),
      otherId(begun),
    );
    expect(
      previewRitualV7(partial, need(partial.cult.rituals[0])).starfall?.exact,
    ).toBe(false);
  });
});

describe("the Great Summoning (section 7.3)", () => {
  it("puts the Herald on a free mark and has the whole circle channel it", () => {
    const state = lodgeField([{ seat: 1, role: "FIGHTER", at: at(2, 2) }]);
    const leader = idAt(state, SUMMONER);
    const chanters = TRIO.map((where) => idAt(state, where));
    const round = toCultTurn(playV7(state, summoning(state)).state);
    for (const event of round.events)
      expect(parseEventV7(event).ok, event.kind).toBe(true);
    expect(parseGameStateV7(JSON.parse(JSON.stringify(round.state)))).toEqual(
      round.state,
    );
    const herald = unitAtV7(round.state, MARK);
    expect(herald).toMatchObject({
      ownerId: cultId(state),
      summoned: "HERALD",
      role: "JUGGERNAUT",
      hp: 60,
      maxHp: 60,
      homeCityId: null,
      veteran: false,
    });
    const rule = unitRoleRuleV7(round.state, herald);
    expect(rule.label).toBe("Herald");
    expect(eventsOf(round.events, "HERALD_ARRIVED")).toEqual([
      {
        kind: "HERALD_ARRIVED",
        playerId: cultId(state),
        unitId: leader,
        chanterUnitIds: chanters,
        daemonUnitId: herald.id,
        at: MARK,
        hp: 60,
      },
    ]);
    expect(eventsOf(round.events, "STRAND_FORMED")).toEqual(
      [leader, ...chanters].map((unitId) => ({
        kind: "STRAND_FORMED",
        playerId: cultId(state),
        unitId,
        daemonUnitId: herald.id,
      })),
    );
    expect(round.state.cult.strands).toEqual(
      [leader, ...chanters].map((cultistUnitId) => ({
        cultistUnitId,
        daemonUnitId: herald.id,
      })),
    );
    expect(round.state.cult.rituals).toEqual([]);
    // Four strands against its Control of three (the pips of the view).
    expect(viewForV7(round.state, cultId(state)).cult.daemons).toEqual([
      { unitId: herald.id, role: "HERALD", control: 3, strands: 4 },
    ]);
    // The Herald and the whole circle have spent this turn: nothing but a
    // Wait is offered for them (the Favour is spent, so no Summon either).
    for (const unitId of [herald.id, leader, ...chanters])
      expect(
        offeredV7(round.state).filter(
          (command) =>
            "unitId" in command &&
            command.unitId === unitId &&
            command.kind !== "WAIT" &&
            command.kind !== "DISBAND" &&
            command.kind !== "PROMOTE",
        ),
        String(unitId),
      ).toEqual([]);
    // Its value joins the Army of the Score.
    expect(unitFavourValueV7(round.state, herald)).toBe(24);
    // The arrival is seen by a seat that sees the Herald.
    const before = applyOkV7(
      playV7(state, summoning(state)).state,
      cultId(state),
      { kind: "END_TURN" },
    ).state;
    const landing = applyOkV7(before, otherId(state), { kind: "END_TURN" });
    expect(
      projectEventsV7(before, landing.state, otherId(state), landing.events)
        .events,
    ).toContainEqual(need(eventsOf(landing.events, "HERALD_ARRIVED")[0]));
  });

  it("holds the Herald at its first check with three unbroken strands, and loses it with two", () => {
    // 2 Favour beyond the price pays its first Hunger (`pulp_wars-mch9.32`).
    const state = lodgeField(
      [
        { seat: 1, role: "MARKSMAN", at: at(2, 1) },
        { seat: 1, role: "MARKSMAN", at: at(8, 1) },
      ],
      20,
    );
    const arriving = toCultTurn(playV7(state, summoning(state)).state);
    // A Herald that arrives at this Start Turn eats nothing yet: the check
    // and its Hunger come before the rituals (`pulp_wars-mch9.32`).
    expect(eventsOf(arriving.events, "FAVOUR_SPENT")).toEqual([]);
    expect(favourOfV7(arriving.state, cultId(state))).toBe(2);
    const arrived = arriving.state;
    const herald = unitAtV7(arrived, MARK);
    // The Human breaks one strand: three hold.
    const human = applyOkV7(arrived, cultId(arrived), { kind: "END_TURN" });
    const one = attackV7(human.state, at(2, 1), at(4, 1));
    expect(eventsOf(one.events, "STRAND_BROKEN")).toHaveLength(1);
    const held = toCultTurn(one.state);
    expect(kindsV7(held.events)).not.toContain("DAEMON_UNBOUND");
    // Its leader's strand held: +1; then its Hunger: -2.
    expect(favourOfV7(held.state, cultId(state))).toBe(1);
    expect(need(unitOf(held.state, herald.id)).ownerId).toBe(cultId(state));
    // Two broken strands leave two against its Control of three.
    const two = attackV7(one.state, at(8, 1), at(6, 1));
    const lost = toCultTurn(two.state);
    expect(eventsOf(lost.events, "DAEMON_UNBOUND")).toEqual([
      {
        kind: "DAEMON_UNBOUND",
        unitId: herald.id,
        summonerPlayerId: cultId(state),
        strands: 2,
        control: 3,
        reason: "STRANDS",
      },
    ]);
    expect(need(unitOf(lost.state, herald.id)).ownerId).toBe(
      NEUTRAL_OWNER_ID_V7,
    );
  });

  it("consumes an own unit on the mark for its value, like a Sacrifice", () => {
    // An Idol Bearer on the mark: its value is 3. (A Chosen, worth 6 and
    // no Martyr, until the Cult redesign retired it, `pulp_wars-mch9.31`.)
    const state = lodgeField([{ seat: 0, role: "GUARD", at: MARK }]);
    // The Idol Bearer joined the circle (it stands beside the Summoner).
    const begun = playV7(state, summoning(state)).state;
    const chosen = idAt(state, MARK);
    expect(begun.cult.rituals[0]?.chanterUnitIds).toContain(chosen);
    const round = toCultTurn(begun);
    const leader = idAt(state, SUMMONER);
    const from = round.events.findIndex(
      (event) => event.kind === "UNIT_CONSUMED",
    );
    expect(round.events.slice(from, from + 3)).toEqual([
      {
        kind: "UNIT_CONSUMED",
        playerId: cultId(state),
        unitId: leader,
        victimUnitId: chosen,
        victimOwnerId: cultId(state),
        role: "GUARD",
        at: MARK,
        favour: 3,
      },
      { kind: "UNIT_DIED", unitId: chosen, cause: "CONSUMED" },
      {
        kind: "FAVOUR_GAINED",
        playerId: cultId(state),
        source: "CONSUMPTION",
        amount: 3,
        forfeited: 0,
        favour: 3,
      },
    ]);
    for (const event of round.events)
      expect(parseEventV7(event).ok, event.kind).toBe(true);
    expect(
      eventsOf(round.events, "FAVOUR_GAINED").map((event) => event.source),
    ).toEqual(["CONSUMPTION"]);
    expect(kindsV7(round.events)).not.toContain("GRAVE_CREATED");
    // The Herald stands where the Idol Bearer stood, channelled by the rest.
    const herald = unitAtV7(round.state, MARK);
    expect(herald.summoned).toBe("HERALD");
    expect(
      need(eventsOf(round.events, "HERALD_ARRIVED")[0]).chanterUnitIds,
    ).toEqual(TRIO.map((where) => idAt(state, where)));
    expect(round.state.cult.strands).toHaveLength(4);
    // Not a Loss, no Kill, and no kill for the Summoner; the game is no
    // longer flawless.
    expect(ledger(round.state, cultId(state)).lossValue).toBe(0);
    expect(ledger(round.state, cultId(state)).killValue).toBe(0);
    expect(ledger(round.state, cultId(state)).flawless).toBe(false);
    expect(need(unitOf(round.state, leader)).kills).toBe(0);
  });

  it("consumes a broken enemy on the mark for twice its value, a kill for the leader", () => {
    // A Knight at 5 HP walks onto the mark in its own turn: 2 x 9 Favour.
    // (One that stood still would rest above 5 HP at its End Turn.)
    const state = lodgeField([
      { seat: 1, role: "KNIGHT", at: at(6, 4), hp: 5 },
    ]);
    const begun = playV7(state, summoning(state)).state;
    const knight = idAt(state, at(6, 4));
    const leader = idAt(state, SUMMONER);
    const value = unitFavourValueV7(state, unitAtV7(state, at(6, 4)));
    expect(value).toBe(9);
    const moved = playV7(
      applyOkV7(begun, cultId(begun), { kind: "END_TURN" }).state,
      { kind: "MOVE", unitId: knight, path: [MARK] },
    ).state;
    // The preview says so for both seats.
    for (const seat of [0, 1]) {
      const view = viewForV7(moved, seatIdV7(moved, seat));
      expect(
        previewRitualV7(view, need(view.cult.rituals[0])).summoning,
      ).toEqual({
        at: MARK,
        outcome: "CONSUMES",
        unitId: knight,
        hostile: true,
        favour: 18,
        control: 3,
        strands: 4,
      });
    }
    const round = toCultTurn(moved);
    expect(eventsOf(round.events, "UNIT_CONSUMED")).toEqual([
      {
        kind: "UNIT_CONSUMED",
        playerId: cultId(state),
        unitId: leader,
        victimUnitId: knight,
        victimOwnerId: otherId(state),
        role: "KNIGHT",
        at: MARK,
        favour: 18,
      },
    ]);
    expect(round.events).toContainEqual({
      kind: "UNIT_DIED",
      unitId: knight,
      cause: "CONSUMED",
    });
    expect(favourOfV7(round.state, cultId(state))).toBe(18);
    expect(unitAtV7(round.state, MARK).summoned).toBe("HERALD");
    expect(need(unitOf(round.state, leader)).kills).toBe(1);
    expect(ledger(round.state, cultId(state)).killValue).toBe(value);
    expect(ledger(round.state, otherId(state)).lossValue).toBe(value);
    for (const event of round.events)
      expect(parseEventV7(event).ok, event.kind).toBe(true);
  });

  it("is blocked by any other unit on the mark, and the Favour is gone", () => {
    const blockers: readonly (readonly [string, GoblinPieceV7])[] = [
      ["a healthy enemy", { seat: 1, role: "FIGHTER", at: at(5, 5) }],
      ["a giant at 3 HP", { seat: 1, role: "JUGGERNAUT", at: at(5, 5), hp: 3 }],
    ];
    for (const [label, piece] of blockers) {
      const state = lodgeField([piece]);
      const begun = playV7(state, summoning(state)).state;
      const moved = checkedV7({
        ...begun,
        units: begun.units.map((unit) =>
          unit.id === idAt(state, at(5, 5)) ? { ...unit, at: MARK } : unit,
        ),
      });
      const view = viewForV7(moved, otherId(moved));
      expect(
        previewRitualV7(view, need(view.cult.rituals[0])).summoning,
        label,
      ).toMatchObject({
        outcome: "BLOCKED",
        unitId: idAt(state, at(5, 5)),
        favour: 0,
        strands: 0,
      });
      const round = toCultTurn(moved);
      expect(eventsOf(round.events, "RITUAL_FIZZLED"), label).toEqual([
        {
          kind: "RITUAL_FIZZLED",
          playerId: cultId(state),
          ritual: "GREAT_SUMMONING",
          unitId: idAt(state, SUMMONER),
          at: MARK,
          reason: "BLOCKED",
        },
      ]);
      expect(kindsV7(round.events), label).not.toContain("HERALD_ARRIVED");
      expect(
        round.state.units.some((unit) => unit.summoned === "HERALD"),
        label,
      ).toBe(false);
      expect(round.state.cult.rituals, label).toEqual([]);
      expect(favourOfV7(round.state, cultId(state)), label).toBe(0);
      // The circle keeps its turn: nobody channelled anything.
      expect(round.state.cult.strands, label).toEqual([]);
      for (const event of round.events)
        expect(parseEventV7(event).ok, event.kind).toBe(true);
    }
  });

  it("is blocked by an own daemon, a Plagued own unit, and a Barricade on the mark", () => {
    // An own Horror on the mark is no victim.
    const daemon = withHorrorV7(lodgeField(), 0, MARK);
    const withDaemon = withStrandsV7(daemon, MARK, []);
    const begun = playV7(withDaemon, summoning(withDaemon)).state;
    const view = viewForV7(begun, cultId(begun));
    expect(
      previewRitualV7(view, need(view.cult.rituals[0])).summoning?.outcome,
    ).toBe("BLOCKED");
    // A Plagued or Bitten own unit cannot be Sacrificed, so it blocks; the
    // same unit in good health is consumed.
    const sick = lodgeField([{ seat: 0, role: "RAIDER", at: MARK }]);
    const facts = canonicalRitualTileFactsV7(sick, cultId(sick));
    const familiar = unitAtV7(sick, MARK);
    expect(
      summoningMarkOutcomeV7(sick, facts, sick.units, cultId(sick), MARK),
    ).toMatchObject({ kind: "CONSUMES", hostile: false, favour: 3 });
    for (const list of ["plagued", "bitten"] as const)
      expect(
        summoningMarkOutcomeV7(
          { ...sick, [list]: [{ unitId: familiar.id }] },
          facts,
          sick.units,
          cultId(sick),
          MARK,
        ),
        list,
      ).toEqual({ kind: "BLOCKED", unit: familiar });
    // A Barricade built on the mark after the ritual began.
    const base = lodgeField([], 18, { factions: ["CULT", "DWARF"] });
    const walled = checkedV7({
      ...playV7(base, summoning(base)).state,
      barricades: [{ at: MARK, ownerId: otherId(base), hp: 10 }],
    });
    const round = toCultTurn(walled);
    expect(eventsOf(round.events, "RITUAL_FIZZLED")).toMatchObject([
      { reason: "BLOCKED", at: MARK },
    ]);
    // A Barricade there before it began: no mark.
    const early = checkedV7({
      ...base,
      barricades: [{ at: MARK, ownerId: otherId(base), hp: 10 }],
    });
    expect(rejectedV7(early, summoning(early))).toEqual({
      code: "RITUAL_NOT_LEGAL",
      params: { reason: "TILE" },
    });
  });

  it("previews the Great Summoning before it begins", () => {
    const state = lodgeField([{ seat: 0, role: "RAIDER", at: MARK }], 24);
    const view = viewForV7(state, cultId(state));
    expect(
      previewBeginRitualV7(
        view,
        idAt(state, SUMMONER),
        "GREAT_SUMMONING",
        MARK,
      ),
    ).toEqual({
      ritual: "GREAT_SUMMONING",
      unitId: idAt(state, SUMMONER),
      at: MARK,
      chanterUnitIds: TRIO.map((where) => idAt(state, where)),
      favour: 18,
      favourAfter: 6,
      starfall: null,
      // The Familiar on the mark is consumed for its value (3).
      summoning: {
        at: MARK,
        outcome: "CONSUMES",
        unitId: idAt(state, MARK),
        hostile: false,
        favour: 3,
        control: 3,
        strands: 4,
      },
    });
    const free = previewBeginRitualV7(
      view,
      idAt(state, SUMMONER),
      "GREAT_SUMMONING",
      at(4, 3),
    );
    expect(free?.summoning).toMatchObject({
      outcome: "ARRIVES",
      unitId: null,
      strands: 4,
    });
  });

  it("lets a later star break a strand of the Herald that arrived just before it", () => {
    // One Start Turn, two rituals in leader-ID order: the Great Summoning
    // (the Summoner's ID is lower), then a Star-fall whose area holds one
    // of the Herald's new channellers. The strand breaks for the next check.
    const state = withFavourV7(
      cultFieldV7([
        ...lodge,
        { seat: 0, role: "CATAPULT", at: at(9, 1) },
        { seat: 0, role: "FIGHTER", at: at(9, 2) },
      ]),
      0,
      18,
    );
    const summoned = playV7(state, summoning(state)).state;
    const star = playV7(summoned, {
      kind: "BEGIN_RITUAL",
      ritual: "STARFALL",
      unitId: idAt(summoned, at(9, 1)),
      at: at(6, 1),
    }).state;
    expect(star.cult.rituals.map((ritual) => ritual.kind)).toEqual([
      "GREAT_SUMMONING",
      "STARFALL",
    ]);
    const round = toCultTurn(star);
    const kinds = kindsV7(round.events);
    expect(kinds.indexOf("HERALD_ARRIVED")).toBeLessThan(
      kinds.indexOf("STAR_FELL"),
    );
    expect(kinds.indexOf("STAR_FELL")).toBeLessThan(
      kinds.indexOf("STRAND_BROKEN"),
    );
    const herald = unitAtV7(round.state, MARK);
    // The star's area is x 5 to 7, y 0 to 2: the Summoner on (5, 2) and
    // the chanters on (5, 1) and (6, 1).
    expect(
      eventsOf(round.events, "STRAND_BROKEN")
        .map((event) => [event.unitId, event.daemonUnitId, event.cause])
        .sort(),
    ).toEqual(
      [SUMMONER, at(5, 1), at(6, 1)]
        .map((where) => [idAt(state, where), herald.id, "HP_LOSS"])
        .sort(),
    );
    expect(round.state.cult.strands).toEqual([
      { cultistUnitId: idAt(state, at(4, 1)), daemonUnitId: herald.id },
    ]);
    expect(parseGameStateV7(JSON.parse(JSON.stringify(round.state)))).toEqual(
      round.state,
    );
  });

  it("takes a chanter out of a circle that an earlier star of the same Start Turn hurts", () => {
    // Two stars: the first (lower leader ID) lands on the second circle.
    const state = cultFieldV7([
      ...circle,
      { seat: 0, role: "CATAPULT", at: at(5, 6) },
      // An Idol Bearer survives the first star (an Initiate of 7 HP would
      // die of it since the Cult redesign, `pulp_wars-mch9.31`).
      { seat: 0, role: "GUARD", at: at(4, 6) },
      { seat: 0, role: "FIGHTER", at: at(6, 6) },
    ]);
    const first = chantedStar(state, [CHANTER_WEST, CHANTER_EAST], at(3, 6));
    const begun = playV7(first, {
      kind: "BEGIN_RITUAL",
      ritual: "STARFALL",
      unitId: idAt(first, at(5, 6)),
      at: at(9, 4),
    }).state;
    const joined = playV7(begun, joinChant(begun, at(4, 6), at(5, 6))).state;
    const second = playV7(joined, joinChant(joined, at(6, 6), at(5, 6))).state;
    const round = toCultTurn(second);
    expect(eventsOf(round.events, "RITUAL_DISRUPTED")).toEqual([
      {
        kind: "RITUAL_DISRUPTED",
        playerId: cultId(state),
        ritual: "STARFALL",
        unitId: idAt(state, at(5, 6)),
        participantUnitId: idAt(state, at(4, 6)),
        cause: "HP_LOSS",
      },
    ]);
    // The second star lands with the one chanter it has left.
    expect(
      eventsOf(round.events, "STAR_FELL").map((event) => [
        event.unitId,
        event.chanters,
        event.damage,
      ]),
    ).toEqual([
      [idAt(state, GAZER), 2, 12],
      [idAt(state, at(5, 6)), 1, 9],
    ]);
  });
});

describe("the Herald: Ravage (section 4.2)", () => {
  it("attacks twice a turn, at two targets or one, also after its Move, and advances after a kill", () => {
    const state = heraldField(
      [
        { seat: 1, role: "FIGHTER", at: at(4, 4) },
        { seat: 1, role: "FIGHTER", at: at(6, 4) },
        { seat: 1, role: "JUGGERNAUT", at: at(5, 4) },
      ],
      at(5, 1),
    );
    const herald = unitAtV7(state, at(5, 1));
    expect(attackAllowanceV7(state, herald)).toBe(2);
    expect(attacksLeftV7(state, herald)).toBe(2);
    const stride = need(
      offeredV7(state, "MOVE").find(
        (command) =>
          command.kind === "MOVE" &&
          command.path.at(-1)?.x === 5 &&
          command.path.at(-1)?.y === 3,
      ),
    );
    const moved = playV7(state, stride).state;
    expect(attacksLeftV7(moved, unitAtV7(moved, at(5, 3)))).toBe(2);
    // It kills a full-HP Fighter outright, takes nothing, and (the Cult
    // redesign, `pulp_wars-mch9.35`, section 9.1) advances onto its tile.
    const first = attackV7(moved, at(5, 3), at(4, 4));
    expect(first.combat).toMatchObject({
      damageToDefender: 12,
      defenderDies: true,
      damageToAttacker: 0,
      advances: true,
      attacksUsed: 1,
      attacksRemaining: 1,
    });
    expect(first.attacker?.at).toEqual(at(4, 4));
    expect(first.attacker?.activation.handled).toBe(false);
    // A kill by a bound daemon pays its value in Favour.
    expect(favourOfV7(first.state, cultId(state))).toBe(2);
    // Its second attack is made from there: the Fighter on (6, 4) is no
    // longer beside it, the Juggernaut is.
    expect(
      offeredV7(first.state, "ATTACK").map((command) =>
        command.kind === "ATTACK" ? command.targetUnitId : null,
      ),
    ).toEqual([idAt(state, at(5, 4))]);
    const second = attackV7(first.state, at(4, 4), at(5, 4));
    expect(second.combat).toMatchObject({
      damageToDefender: 20,
      damageToAttacker: 7,
      defenderDies: false,
      advances: false,
      attacksUsed: 2,
      attacksRemaining: 0,
    });
    expect(second.attacker?.activation.handled).toBe(true);
    // No third attack, and no Move after an attack (the advance is no Move).
    expect(offeredV7(second.state, "ATTACK", "MOVE", "PROCLAIM")).toEqual([]);
    expect(
      rejectedV7(second.state, {
        kind: "ATTACK",
        unitId: herald.id,
        targetUnitId: idAt(state, at(5, 4)),
      }),
    ).toEqual({ code: "UNIT_ALREADY_ACTED", params: { unitId: herald.id } });
    expect(offeredV7(first.state, "MOVE")).toEqual([]);
    // Unmoved, it may not Move after a kill's advance either.
    const lone = heraldField(
      [{ seat: 1, role: "FIGHTER", at: at(5, 2) }],
      at(5, 1),
    );
    const advanced = attackV7(lone, at(5, 1), at(5, 2));
    expect(advanced.attacker?.at).toEqual(at(5, 2));
    expect(
      offeredV7(advanced.state, "MOVE").filter(
        (command) =>
          "unitId" in command && command.unitId === advanced.attacker?.id,
      ),
    ).toEqual([]);
    // Both attacks at one target: a giant dies in one turn (20 and 20).
    const giant = heraldField(
      [{ seat: 1, role: "JUGGERNAUT", at: at(5, 4) }],
      at(5, 3),
    );
    const blow = attackV7(giant, at(5, 3), at(5, 4));
    expect(blow.combat).toMatchObject({
      damageToDefender: 20,
      damageToAttacker: 7,
      defenderDies: false,
    });
    const kill = attackV7(blow.state, at(5, 3), at(5, 4));
    expect(kill.combat).toMatchObject({
      damageToDefender: 20,
      defenderDies: true,
      advances: true,
    });
    expect(kill.attacker?.at).toEqual(at(5, 4));
    expect(favourOfV7(kill.state, cultId(giant))).toBe(12);
  });

  it("has the spec's numbers against the Human roster", () => {
    const strikes = (role: GoblinPieceV7["role"]) => {
      const state = heraldField([{ seat: 1, role, at: at(5, 4) }], at(5, 3));
      const hit = calculateCombatPreviewV7(
        state,
        idAt(state, at(5, 3)),
        idAt(state, at(5, 4)),
      );
      const back = calculateCombatPreviewV7(
        state,
        idAt(state, at(5, 4)),
        idAt(state, at(5, 3)),
      );
      return [
        hit.damageToDefender,
        hit.damageToAttacker,
        back.damageToDefender,
        back.damageToAttacker,
      ];
    };
    // [it deals, it takes, the other deals it, the other takes].
    expect(strikes("FIGHTER")).toEqual([12, 0, 3, 12]);
    expect(strikes("GUARD")).toEqual([17, 0, 2, 13]);
    expect(strikes("KNIGHT")).toEqual([13, 0, 9, 9]);
    expect(strikes("SWORDSMAN")).toEqual([15, 0, 7, 10]);
    expect(strikes("CAPTAIN")).toEqual([10, 0, 1, 10]);
    expect(strikes("JUGGERNAUT")).toEqual([20, 7, 9, 9]);
    expect(strikes("MARKSMAN").slice(2, 3)).toEqual([3]);
    expect(strikes("CATAPULT").slice(2, 3)).toEqual([6]);
  });

  it("captures a village like every land unit while a seat commands it", () => {
    const state = heraldField([], at(5, 5), {}, {});
    const eligible = patchUnitV7(state, at(5, 5), { captureEligible: true });
    expect(offeredV7(eligible, "CAPTURE")).toEqual([
      { kind: "CAPTURE", unitId: idAt(eligible, at(5, 5)) },
    ]);
  });
});

describe("the Herald: Unstoppable (section 4.2)", () => {
  it("ignores the defender's fortification and destroys the Field Defense on its tile", () => {
    // A Guard on Field Defense in its own territory; the Cult has no
    // Explosives here, so no Breach helps it.
    const GUARD = at(3, 7);
    const noBreach = { techs: { 0: techsWithout("EXPLOSIVES") } };
    const state = fieldDefenseV7(
      heraldField([{ seat: 1, role: "GUARD", at: GUARD }], at(4, 6), noBreach),
      GUARD,
    );
    const preview = calculateCombatPreviewV7(
      state,
      idAt(state, at(4, 6)),
      idAt(state, GUARD),
    );
    // The Field Defense counts for nothing: the same 17 as in the open.
    expect(preview.fortificationLevel).toBe(0);
    expect(preview.fortificationIgnored).toBeGreaterThan(0);
    expect(preview.breachApplied).toBe(false);
    expect(preview.damageToDefender).toBe(17);
    // A Horror on the same tile meets the fortification.
    const horror = fieldDefenseV7(
      withHorrorV7(
        cultFieldV7([{ seat: 1, role: "GUARD", at: GUARD }], noBreach),
        0,
        at(4, 6),
      ),
      GUARD,
    );
    const blunt = calculateCombatPreviewV7(
      horror,
      idAt(horror, at(4, 6)),
      idAt(horror, GUARD),
    );
    expect(blunt.fortificationLevel).toBeGreaterThan(0);
    expect(blunt.fortificationIgnored).toBe(0);
    const hit = attackV7(state, at(4, 6), GUARD);
    expect(hit.events).toContainEqual({
      kind: "FIELD_DEFENSE_DESTROYED",
      at: GUARD,
      reason: "UNSTOPPABLE",
    });
    expect(tileV7(hit.state, GUARD).fieldDefense).toBe(false);
    expect(
      attackV7(horror, at(4, 6), GUARD).events.some(
        (event) => event.kind === "FIELD_DEFENSE_DESTROYED",
      ),
    ).toBe(false);
    // An Unbound Herald's attack does the same (the body's rule).
    const loose = fieldDefenseV7(
      withUnboundHeraldV7(
        cultFieldV7([{ seat: 1, role: "GUARD", at: at(5, 4) }]),
        at(5, 3),
        0,
      ),
      at(5, 4),
    );
    const rampage = toCultTurn(loose);
    expect(rampage.events).toContainEqual({
      kind: "FIELD_DEFENSE_DESTROYED",
      at: at(5, 4),
      reason: "UNSTOPPABLE",
    });
  });

  it("takes no status: not Frozen, Stuck, Toothache, Splatted, or Cracked", () => {
    const state = withHorrorV7(
      heraldField(
        [
          { seat: 1, role: "FIGHTER", at: at(4, 4) },
          { seat: 1, role: "KNIGHT", at: at(6, 4) },
        ],
        at(5, 3),
      ),
      0,
      at(7, 3),
    );
    const herald = unitAtV7(state, at(5, 3));
    const horror = unitAtV7(state, at(7, 3));
    const human = otherId(state);
    // A bound Horror takes them; the Herald never does.
    expect(canBeFrozenV7(state, human, horror)).toBe(true);
    expect(canBeFrozenV7(state, human, herald)).toBe(false);
    expect(unitTakesCandyStatusV7(horror)).toBe(true);
    expect(unitTakesCandyStatusV7(herald)).toBe(false);
    // Splat, Cracked, and Frostbite ask the other unit's role too: the
    // Candy role with Splat, the Dinosaur role that cracks armour, and the
    // Ice Folk role with Frostbite stand in.
    const roleOf = (
      faction: "CANDY" | "DINOSAUR" | "ICE_FOLK",
      has: (role: GoblinPieceV7["role"]) => boolean,
    ): GoblinPieceV7["role"] =>
      need(
        (
          Object.keys(
            factionTreeV7(faction).roleRules,
          ) as GoblinPieceV7["role"][]
        ).find(has),
      );
    const stranger = (
      faction: "CANDY" | "DINOSAUR" | "ICE_FOLK",
      role: GoblinPieceV7["role"],
    ) => {
      const field = cultFieldV7([{ seat: 1, role, at: at(2, 2) }], {
        factions: ["CULT", faction],
      });
      return { field, unit: unitAtV7(field, at(2, 2)) };
    };
    const splatter = stranger(
      "CANDY",
      roleOf("CANDY", (role) =>
        effectiveRoleRuleV7(role, "CANDY").abilities.includes("SPLAT"),
      ),
    );
    expect(
      attackSplatAppliesV7(splatter.field, splatter.unit, horror, false),
    ).toBe(true);
    expect(
      attackSplatAppliesV7(splatter.field, splatter.unit, herald, false),
    ).toBe(false);
    const cracker = stranger(
      "DINOSAUR",
      roleOf(
        "DINOSAUR",
        (role) => factionTreeV7("DINOSAUR").roleMechanics[role].cracksArmour,
      ),
    );
    expect(attackCracksV7(cracker.field, cracker.unit, horror, false)).toBe(
      true,
    );
    expect(attackCracksV7(cracker.field, cracker.unit, herald, false)).toBe(
      false,
    );
    // Frostbite: attacking a Musk Ox from the next tile.
    const ox = stranger(
      "ICE_FOLK",
      roleOf(
        "ICE_FOLK",
        (role) => factionTreeV7("ICE_FOLK").roleMechanics[role].frostbite,
      ),
    );
    expect(attackIsFrostbittenV7(ox.field, horror, ox.unit, 1, false)).toBe(
      true,
    );
    expect(attackIsFrostbittenV7(ox.field, herald, ox.unit, 1, false)).toBe(
      false,
    );
    // Not living: no Plague, bite, Seizure, or Boo!; a daemon heals by no
    // source and leaves no Grave.
    expect(unitRoleMechanicsV7(state, herald).construct).toBe(true);
  });

  it("is frozen by no Frost Bolt and pulled by no Tractor Beam", () => {
    const ice = heraldField(
      [{ seat: 1, role: "CAPTAIN", at: at(5, 5) }],
      at(5, 3),
      { factions: ["CULT", "ICE_FOLK"], activeSeat: 1 },
    );
    const witch = unitAtV7(ice, at(5, 5));
    expect(unitRoleRuleV7(ice, witch).abilities).toContain("FROST_BOLT");
    expect(
      rejectedV7(ice, {
        kind: "FROST_BOLT",
        unitId: witch.id,
        targetUnitId: idAt(ice, at(5, 3)),
      }),
    ).toEqual({
      code: "FROST_BOLT_NOT_LEGAL",
      params: { reason: "TARGET_IMMUNE" },
    });
    const herald = unitAtV7(ice, at(5, 3));
    expect(
      tractorBeamTargetBlockV7(
        ice,
        { free: false, minimumRange: 1, maximumRange: 3, pull: 1 } as never,
        { at: at(5, 5) },
        herald,
        false,
      ),
    ).toBe("TARGET_IMMUNE");
  });

  it("is never pushed: a Crushing Shove crushes it instead, as damage", () => {
    const state = heraldField(
      [{ seat: 1, role: "JUGGERNAUT", at: at(5, 4) }],
      at(5, 3),
      { activeSeat: 1 },
    );
    const herald = unitAtV7(state, at(5, 3));
    expect(unitIsImmovableV7(state, herald)).toBe(true);
    expect(defenderCrushableV7(state, herald)).toBe(true);
    const shove = attackV7(state, at(5, 4), at(5, 3));
    expect(shove.combat.push).toBe("BLOCKED");
    expect(shove.target?.at).toEqual(at(5, 3));
    const crushed = eventsOf(shove.events, "UNIT_CRUSHED");
    expect(crushed).toHaveLength(1);
    expect(crushed[0]).toMatchObject({ targetUnitId: herald.id, dies: false });
    expect(need(crushed[0]).damage).toBeGreaterThan(0);
    expect(shove.target?.hp).toBe(
      60 - shove.combat.damageToDefender - need(crushed[0]).damage,
    );
    // A bound Horror is pushed like any unit.
    const horror = withHorrorV7(
      cultFieldV7([{ seat: 1, role: "JUGGERNAUT", at: at(5, 4) }], {
        activeSeat: 1,
      }),
      0,
      at(5, 3),
    );
    expect(attackV7(horror, at(5, 4), at(5, 3)).combat.push).toBe("WILL_PUSH");
  });
});

describe("the Herald: Unstoppable at a Dimensional Gate (section 4.2)", () => {
  const GATE_A = at(2, 2);
  const GATE_B = at(17, 17);
  /** A Human Fighter beside one gate; a Cult daemon stands on the other. */
  const gateArena = (daemon: "HORROR" | "HERALD"): GameStateV7 =>
    withHorrorV7(
      round2ArenaV7({
        factions: ["ORIGINAL", "CULT"],
        pieces: [{ seat: 0, role: "FIGHTER", at: at(3, 3) }],
        curiosities: [
          { kind: "GATE", at: GATE_A, partner: GATE_B },
          { kind: "GATE", at: GATE_B, partner: GATE_A },
        ],
      }),
      1,
      GATE_B,
      { role: daemon },
    );

  it("is shoved by no gate: the traversal onto it is blocked", () => {
    const state = gateArena("HERALD");
    const human = round2SeatV7(state, 0);
    const mover = round2UnitAtV7(state, at(3, 3));
    const herald = round2UnitAtV7(state, GATE_B);
    expect(previewGateV7(viewForV7(state, human), mover.id, GATE_A)).toEqual({
      gate: GATE_A,
      exit: GATE_B,
      displaces: herald.id,
      displaceTo: null,
      blocked: true,
      exact: true,
    });
    const moved = applyOkV7(state, human, {
      kind: "MOVE",
      unitId: mover.id,
      path: [GATE_A],
    });
    expect(
      kindsV7(moved.events).filter((kind) => kind.startsWith("GATE_")),
    ).toEqual(["GATE_BLOCKED"]);
    expect(need(unitOf(moved.state, herald.id)).at).toEqual(GATE_B);
    expect(need(unitOf(moved.state, mover.id)).at).toEqual(GATE_A);
    // A bound Horror on the exit is shoved aside like any unit.
    const horror = gateArena("HORROR");
    const shoved = applyOkV7(horror, round2SeatV7(horror, 0), {
      kind: "MOVE",
      unitId: round2UnitAtV7(horror, at(3, 3)).id,
      path: [GATE_A],
    });
    expect(
      kindsV7(shoved.events).filter((kind) => kind.startsWith("GATE_")),
    ).toEqual(["GATE_DISPLACED", "GATE_TRAVERSED"]);
  });
});

describe("the Herald: Proclaim and the Cowed city (section 8.6)", () => {
  /** A bound Herald on (4, 6), two tiles from the Human capital (2, 8). */
  const proclaimField = (
    pieces: readonly GoblinPieceV7[] = [],
    where: CoordV7 = at(4, 6),
  ): GameStateV7 => heraldField(pieces, where);
  const proclaim = (
    state: GameStateV7,
    where: CoordV7 = at(4, 6),
  ): CommandV7 => ({
    kind: "PROCLAIM",
    unitId: idAt(state, where),
    cityId: cityOfV7(state, 1).id,
  });

  it("cows a hostile city within 3 tiles in place of one attack", () => {
    const state = proclaimField([{ seat: 1, role: "FIGHTER", at: at(4, 7) }]);
    const city = cityOfV7(state, 1);
    const herald = unitAtV7(state, at(4, 6));
    expect(offeredV7(state, "PROCLAIM")).toEqual([proclaim(state)]);
    expect(
      previewProclaimV7(viewForV7(state, cultId(state)), herald.id, city.id),
    ).toEqual({
      unitId: herald.id,
      cityId: city.id,
      cityOwnerId: otherId(state),
      at: city.at,
      attacksLeftAfter: 1,
    });
    const cowed = playV7(state, proclaim(state));
    expect(cowed.events).toEqual([
      {
        kind: "CITY_COWED",
        playerId: cultId(state),
        unitId: herald.id,
        cityId: city.id,
        cityOwnerId: otherId(state),
        at: city.at,
      },
    ]);
    expect(cowed.state.cult.cowed).toEqual([{ cityId: city.id, endsLeft: 1 }]);
    expect(isCityCowedV7(cowed.state, city.id)).toBe(true);
    expect(cityIsCowedV7(cowed.state, city.id)).toBe(true);
    // Public: both seats see it.
    for (const seat of [0, 1])
      expect(viewForV7(cowed.state, seatIdV7(state, seat)).cult.cowed).toEqual([
        { cityId: city.id, endsLeft: 1 },
      ]);
    expect(
      projectEventsV7(state, cowed.state, otherId(state), cowed.events).events,
    ).toEqual(cowed.events);
    // It took one of the two attacks: one attack is left, no Move, and no
    // second Proclaim at a city that is Cowed already.
    const after = unitAtV7(cowed.state, at(4, 6));
    expect(after.activation).toMatchObject({
      attacked: true,
      attacksUsed: 1,
      handled: false,
    });
    expect(attacksLeftV7(cowed.state, after)).toBe(1);
    expect(offeredV7(cowed.state, "MOVE", "PROCLAIM")).toEqual([]);
    expect(rejectedV7(cowed.state, proclaim(cowed.state))).toEqual({
      code: "PROCLAIM_NOT_LEGAL",
      params: { reason: "COWED" },
    });
    const struck = attackV7(cowed.state, at(4, 6), at(4, 7));
    expect(struck.combat).toMatchObject({
      attacksUsed: 2,
      attacksRemaining: 0,
    });
    expect(struck.attacker?.activation.handled).toBe(true);
    // The other order: an attack, then the Proclaim with the attack left
    // (from the Fighter's tile, where the kill advanced it: the Cult
    // redesign, `pulp_wars-mch9.35`).
    const first = attackV7(state, at(4, 6), at(4, 7));
    expect(first.attacker?.at).toEqual(at(4, 7));
    const then = playV7(first.state, proclaim(first.state, at(4, 7)));
    expect(unitAtV7(then.state, at(4, 7)).activation).toMatchObject({
      attacksUsed: 2,
      handled: true,
    });
    expect(offeredV7(then.state, "ATTACK", "PROCLAIM")).toEqual([]);
  });

  it("refuses a Proclaim with no legal city", () => {
    // Out of range: (6, 4) is four tiles from (2, 8).
    const far = proclaimField([], at(6, 4));
    expect(rejectedV7(far, proclaim(far, at(6, 4)))).toEqual({
      code: "PROCLAIM_NOT_LEGAL",
      params: { reason: "RANGE" },
    });
    // Its own city.
    const home = proclaimField([], at(6, 6));
    expect(
      rejectedV7(home, {
        kind: "PROCLAIM",
        unitId: idAt(home, at(6, 6)),
        cityId: cityOfV7(home, 0).id,
      }),
    ).toEqual({ code: "PROCLAIM_NOT_LEGAL", params: { reason: "CITY" } });
    // A city whose center its seat has not explored, and one that is not
    // there.
    const state = proclaimField();
    const hidden = unexploreV7(state, 0, [cityOfV7(state, 1).at]);
    expect(rejectedV7(hidden, proclaim(hidden))).toEqual({
      code: "PROCLAIM_NOT_LEGAL",
      params: { reason: "CITY" },
    });
    expect(
      rejectedV7(state, {
        kind: "PROCLAIM",
        unitId: idAt(state, at(4, 6)),
        cityId: 999 as never,
      }),
    ).toEqual({ code: "PROCLAIM_NOT_LEGAL", params: { reason: "CITY" } });
    // No attack left.
    const spent = patchUnitV7(state, at(4, 6), {
      activation: {
        ...unitAtV7(state, at(4, 6)).activation,
        attacked: true,
        attacksUsed: 2,
      },
    });
    expect(rejectedV7(spent, proclaim(spent))).toEqual({
      code: "UNIT_ALREADY_ACTED",
      params: { unitId: idAt(state, at(4, 6)) },
    });
    // A Horror has no Proclaim, and an Unbound Herald is nobody's.
    const horror = withHorrorV7(cultFieldV7([]), 0, at(4, 6));
    expect(rejectedV7(horror, proclaim(horror))).toEqual({
      code: "UNIT_ROLE_INVALID",
      params: { role: "KNIGHT" },
    });
    expect(
      offeredV7(withUnboundHeraldV7(cultFieldV7([]), at(4, 6), 0), "PROCLAIM"),
    ).toEqual([]);
  });

  it("pays a Cowed city no income and gives it no city action until its owner's turn ends", () => {
    const state = proclaimField();
    const city = cityOfV7(state, 1);
    const human = otherId(state);
    const plain = incomeOf(
      applyOkV7(state, cultId(state), { kind: "END_TURN" }).events,
    );
    const normal = need(
      plain.cities.find((entry) => entry.cityId === city.id),
    ).coins;
    expect(normal).toBeGreaterThan(0);
    const cowed = playV7(state, proclaim(state)).state;
    expect(
      cityIncomeV7(cowed, need(cowed.cities.find((c) => c.id === city.id))),
    ).toBe(0);
    const turn = applyOkV7(cowed, cultId(state), { kind: "END_TURN" });
    const income = incomeOf(turn.events);
    expect(income.playerId).toBe(human);
    expect(income.cities.find((entry) => entry.cityId === city.id)?.coins).toBe(
      0,
    );
    expect(income.totalCoins).toBe(plain.totalCoins - normal);
    // No city action: nothing to train, and the reducer says so.
    const now = need(turn.state.cities.find((entry) => entry.id === city.id));
    expect(now.cityActionAvailable).toBe(false);
    expect(
      offeredV7(turn.state).filter(
        (command) => "cityId" in command && command.kind !== "PROCLAIM",
      ),
    ).toEqual([]);
    const refused = applyCommandV7(turn.state, human, {
      kind: "TRAIN",
      cityId: city.id,
      role: "FIGHTER",
    });
    expect(refused.accepted).toBe(false);
    if (!refused.accepted) expect(refused.error.code).toBe("CITY_ACTION_SPENT");
    // It is still Cowed during its owner's turn, and no more when it ends.
    expect(turn.state.cult.cowed).toEqual([{ cityId: city.id, endsLeft: 1 }]);
    const ended = applyOkV7(turn.state, human, { kind: "END_TURN" });
    expect(ended.state.cult.cowed).toEqual([]);
    // Its next turn is an ordinary one.
    const next = applyOkV7(ended.state, cultId(state), { kind: "END_TURN" });
    expect(
      incomeOf(next.events).cities.find((entry) => entry.cityId === city.id)
        ?.coins,
    ).toBe(normal);
    expect(
      need(next.state.cities.find((entry) => entry.id === city.id))
        .cityActionAvailable,
    ).toBe(true);
    expect(parseGameStateV7(JSON.parse(JSON.stringify(turn.state)))).toEqual(
      turn.state,
    );
  });

  it("ends Cowed when the city changes hands", () => {
    // An Initiate that began the turn on the Cowed center captures it.
    const base = cultFieldV7([
      { seat: 0, role: "FIGHTER", at: at(2, 8), captureEligible: true },
    ]);
    const state = withCowedV7(base, at(2, 8));
    const city = cityOfV7(state, 1);
    const taken = applyOkV7(state, cultId(state), {
      kind: "CAPTURE",
      unitId: idAt(state, at(2, 8)),
    });
    expect(kindsV7(taken.events)).toContain("CITY_CAPTURED");
    expect(
      need(taken.state.cities.find((entry) => entry.id === city.id)).ownerId,
    ).toBe(cultId(state));
    expect(taken.state.cult.cowed).toEqual([]);
  });
});

describe("the Herald: Unbound, and bound again (sections 6.4 and 6.5)", () => {
  /** An Unbound Herald on (5, 3) with three Initiates within three tiles. */
  const CULTISTS = [at(4, 5), at(5, 6), at(6, 5)] as const;
  const looseHerald = (extra: readonly GoblinPieceV7[] = []): GameStateV7 =>
    withUnboundHeraldV7(
      cultFieldV7([
        ...CULTISTS.map((where) => ({
          seat: 0,
          role: "FIGHTER" as const,
          at: where,
        })),
        ...extra,
      ]),
      at(5, 3),
      0,
    );
  const channel = (state: GameStateV7, cultist: CoordV7): CommandV7 => ({
    kind: "CHANNEL",
    unitId: idAt(state, cultist),
    daemonUnitId: idAt(state, at(5, 3)),
  });

  it("is bound by the third strand of one turn, with partly filled pips before it", () => {
    const state = looseHerald();
    const herald = unitAtV7(state, at(5, 3));
    const view = (current: GameStateV7) => viewForV7(current, cultId(state));
    // Every cultist in reach may channel it.
    expect(offeredV7(state, "CHANNEL")).toEqual(
      CULTISTS.map((where) => channel(state, where)),
    );
    expect(need(previewRampageV7(view(state), herald.id))).toMatchObject({
      unbound: true,
      control: 3,
      strands: 0,
      attackCount: 2,
    });
    // One strand, then two: the binding is under way, and it is nobody's.
    let current = state;
    for (const [index, where] of CULTISTS.slice(0, 2).entries()) {
      expect(
        need(previewChannelV7(view(current), idAt(state, where), herald.id)),
      ).toMatchObject({
        control: 3,
        strandsBefore: index,
        strandsAfter: index + 1,
        holds: false,
        binds: false,
      });
      const strand = playV7(current, channel(current, where));
      expect(kindsV7(strand.events)).toEqual(["STRAND_FORMED"]);
      current = strand.state;
      expect(need(unitOf(current, herald.id)).ownerId).toBe(
        NEUTRAL_OWNER_ID_V7,
      );
      // The public pips of the binding: the viewer's strands this turn.
      expect(need(previewRampageV7(view(current), herald.id)).strands).toBe(
        index + 1,
      );
      expect(view(current).cult.strands).toHaveLength(index + 1);
      // An Unbound daemon is no entry of the bound daemons' list.
      expect(view(current).cult.daemons).toEqual([]);
    }
    // The third binds it at once.
    expect(
      need(
        previewChannelV7(view(current), idAt(state, CULTISTS[2]), herald.id),
      ),
    ).toMatchObject({ strandsBefore: 2, strandsAfter: 3, binds: true });
    const bound = playV7(current, channel(current, CULTISTS[2]));
    expect(eventsOf(bound.events, "DAEMON_BOUND")).toEqual([
      {
        kind: "DAEMON_BOUND",
        playerId: cultId(state),
        unitId: herald.id,
        strands: 3,
        control: 3,
      },
    ]);
    const mine = need(unitOf(bound.state, herald.id));
    expect(mine.ownerId).toBe(cultId(state));
    expect(mine.activation.handled).toBe(true);
    expect(bound.state.monsters).toEqual([]);
    expect(view(bound.state).cult.daemons).toEqual([
      { unitId: herald.id, role: "HERALD", control: 3, strands: 3 },
    ]);
    // Those strands count for its next check (with its Hunger paid: the
    // Cult redesign, `pulp_wars-mch9.32`).
    const held = toCultTurn(withFavourV7(bound.state, 0, 2));
    expect(kindsV7(held.events)).not.toContain("DAEMON_UNBOUND");
  });

  it("keeps a binding that fell short as nothing: the strands are cleared at the next Start Turn", () => {
    const state = looseHerald();
    const herald = unitAtV7(state, at(5, 3));
    const two = playV7(
      playV7(state, channel(state, CULTISTS[0])).state,
      channel(state, CULTISTS[1]),
    ).state;
    const round = toCultTurn(two);
    expect(need(unitOf(round.state, herald.id)).ownerId).toBe(
      NEUTRAL_OWNER_ID_V7,
    );
    expect(
      round.state.cult.strands.filter(
        (strand) => strand.daemonUnitId === herald.id,
      ),
    ).toEqual([]);
    expect(kindsV7(round.events)).not.toContain("DAEMON_BOUND");
  });

  it("is bound by one channeller that a Thing grips", () => {
    const state = looseHerald([{ seat: 0, role: "JUGGERNAUT", at: at(3, 5) }]);
    const herald = unitAtV7(state, at(5, 3));
    const strand = playV7(state, channel(state, CULTISTS[0])).state;
    const grip = playV7(strand, {
      kind: "ANCHOR",
      unitId: idAt(state, at(3, 5)),
      cultistUnitId: idAt(state, CULTISTS[0]),
    });
    expect(eventsOf(grip.events, "DAEMON_BOUND")).toMatchObject([
      { unitId: herald.id, strands: 3, control: 3 },
    ]);
    expect(need(unitOf(grip.state, herald.id)).ownerId).toBe(cultId(state));
    // The same by hand: a gripped strand counts three.
    expect(
      withGripV7(
        withStrandsV7(
          heraldField(
            [
              { seat: 0, role: "FIGHTER", at: at(4, 5) },
              { seat: 0, role: "JUGGERNAUT", at: at(3, 5) },
            ],
            at(5, 3),
          ),
          at(5, 3),
          [at(4, 5)],
        ),
        at(3, 5),
        at(4, 5),
      ).cult.grips,
    ).toHaveLength(1);
  });
});

describe("rituals: the Normal AI and the public command list", () => {
  it("offers each command exactly when the reducer accepts it", () => {
    const state = withFavourV7(
      withHorrorV7(
        cultFieldV7([
          ...lodge,
          { seat: 0, role: "CATAPULT", at: at(8, 2) },
          { seat: 0, role: "FIGHTER", at: at(8, 3) },
          { seat: 1, role: "FIGHTER", at: at(4, 7) },
        ]),
        0,
        at(4, 6),
        { role: "HERALD" },
      ),
      0,
      20,
    );
    const cult = cultId(state);
    const offered = offeredV7(state, "BEGIN_RITUAL", "PROCLAIM");
    expect(offered.length).toBeGreaterThan(10);
    for (const command of offered)
      expect(applyCommandV7(state, cult, command).accepted).toBe(true);
    // And nothing the list leaves out: every mark on the board for both
    // leaders and both rites.
    const key = (command: CommandV7) => JSON.stringify(command);
    const listed = new Set(offered.map(key));
    for (const leader of [SUMMONER, at(8, 2)])
      for (const ritual of RITUAL_KINDS_V7)
        for (const tile of state.board.tiles) {
          const command: CommandV7 = {
            kind: "BEGIN_RITUAL",
            ritual,
            unitId: idAt(state, leader),
            at: tile.at,
          };
          expect(
            applyCommandV7(state, cult, command).accepted,
            key(command),
          ).toBe(listed.has(key(command)));
        }
    // The other seat is offered neither.
    const turn = applyOkV7(state, cult, { kind: "END_TURN" }).state;
    expect(offeredV7(turn, "BEGIN_RITUAL", "PROCLAIM")).toEqual([]);
    // The combat preview of a Herald's first attack leaves one more.
    const view = viewForV7(state, cult);
    expect(
      queryCombatPreviewV7(view, idAt(state, at(4, 6)), idAt(state, at(4, 7))),
    ).toMatchObject({
      attacksUsed: 1,
      attacksRemaining: 1,
      // A kill advances it (the Cult redesign, `pulp_wars-mch9.35`).
      advances: true,
    });
    expect(queryPlayerCommandsV7(view).length).toBeGreaterThan(0);
    // Join the chant (`pulp_wars-mch9.34`): offered exactly when accepted,
    // for every own unit and every own unit named as the Stargazer.
    const star = playV7(state, {
      kind: "BEGIN_RITUAL",
      ritual: "STARFALL",
      unitId: idAt(state, at(8, 2)),
      at: at(8, 5),
    }).state;
    const joins = offeredV7(star, "JOIN_CHANT");
    expect(joins).toEqual([
      {
        kind: "JOIN_CHANT",
        unitId: idAt(state, at(8, 3)),
        leaderUnitId: idAt(state, at(8, 2)),
      },
    ]);
    const joinable = new Set(joins.map(key));
    const own = star.units.filter((unit) => unit.ownerId === cult);
    for (const unit of own)
      for (const leader of own) {
        if (unit.id === leader.id) continue;
        const command: CommandV7 = {
          kind: "JOIN_CHANT",
          unitId: unit.id,
          leaderUnitId: leader.id,
        };
        expect(applyCommandV7(star, cult, command).accepted, key(command)).toBe(
          joinable.has(key(command)),
        );
      }
  });
});
