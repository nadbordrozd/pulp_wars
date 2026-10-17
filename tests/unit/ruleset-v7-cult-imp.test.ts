import { describe, expect, it } from "vitest";
import { chooseNormalCommandV7 } from "../../src/ai/v7";
import {
  BOARD_SUMMONED_ROLE_IDS_V7,
  CULT_SUMMONED_ROLE_RULES_V7,
  IMP_BROOD_SIZE_V7,
  IMP_CONTROL_V7,
  IMP_FAVOUR_COST_V7,
  IMP_SWARM_MINIMUM_V7,
  NEUTRAL_OWNER_ID_V7,
  NEUTRAL_ROLE_MECHANICS_V7,
  NEUTRAL_ROLE_RULES_V7,
  PRIOR_RULESET_7_IDS,
  RAMPAGE_ATTACKS_V7,
  RULESET_7_ID,
  SAVE_STORAGE_KEY_V7,
  SUMMONED_MECHANICAL_ROLES_V7,
  SUMMON_DAEMONS_V7,
  startingFavourV7,
  calculateCombatPreviewV7,
  compareCommandsV7,
  favourOfV7,
  impBroodV7,
  impSwarmsV7,
  isCityBesiegedV7,
  parseCommandV7,
  parseEventV7,
  parseGameStateV7,
  previewChannelV7,
  previewRampageV7,
  previewSummonV7,
  queryCombatPreviewV7,
  queryPlayerCommandsV7,
  summonedUnitRoleMechanicsV7,
  summonedUnitRoleRuleV7,
  unitRoleRuleV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type DomainEventV7,
  type GameStateV7,
  type PlayerId,
} from "../../src/engine/index";
import { OBSOLETE_SAVE_STORAGE_KEYS_V7 } from "../../src/persistence/index";
import { daemonsShortV7 } from "../../src/render/cult-channel-presentation-v7";
import { summonedGlossaryV7 } from "../../src/render/unit-glossary-v7";
import { textPlayCommandIdV7 } from "../../scripts/play-text-v7";
import { checkedV7 } from "../fixtures/v7-builders";
import {
  cultFieldV7,
  withFavourV7,
  withHorrorV7,
  withStrandsV7,
} from "../fixtures/v7-cult";
import {
  applyOkV7,
  endTurnUntilV7,
  seatIdV7,
  unitAtV7,
  type GoblinPieceV7,
} from "../fixtures/v7-goblin-arena";
import { offeredV7, playV7, rejectedV7 } from "../fixtures/v7-martian";
import { at, kindsV7 } from "../fixtures/v7-revision20";

/**
 * The Cult redesign E-R6 (`pulp_wars-mch9.36`,
 * docs/product/RULESET_7_CULT_REDESIGN.md sections 4.1, 7.1, and 7.3): the
 * Imp. A Summoner alone summons it for 2 Favour (Control 1). **Brood**: at
 * the Start Turn check one holding strand to an Imp also holds up to two
 * other own bound Imps beside it (the lowest IDs; a held Imp never lends
 * its Brood on). **Swarm**: a unit with two or more of a seat's bound Imps
 * beside it does not strike back at their attacks. It never captures.
 *
 * Every state is built by hand on the two-seat 11 x 11 field of
 * `cultFieldV7` (seat 0 the Cult, to move; seat 1 Human); no match is
 * played. A Start Turn check is reached by ending the Cult's turn and the
 * Human's.
 */

const cultId = (state: GameStateV7): PlayerId => seatIdV7(state, 0);

const eventsOf = <K extends DomainEventV7["kind"]>(
  events: readonly DomainEventV7[],
  kind: K,
): Extract<DomainEventV7, { kind: K }>[] =>
  events.filter(
    (event): event is Extract<DomainEventV7, { kind: K }> =>
      event.kind === kind,
  );

const own = (role: GoblinPieceV7["role"], where: CoordV7): GoblinPieceV7 => ({
  seat: 0,
  role,
  at: where,
});
const human = (role: GoblinPieceV7["role"], where: CoordV7): GoblinPieceV7 => ({
  seat: 1,
  role,
  at: where,
});

/** Bound Imps of the Cult on `where`, in this order (ascending IDs). */
function withImps(
  state: GameStateV7,
  where: readonly CoordV7[],
  seat = 0,
): GameStateV7 {
  let current = state;
  for (const tile of where)
    current = withHorrorV7(current, seat, tile, { role: "IMP" });
  return current;
}

const idAt = (state: GameStateV7, where: CoordV7) => unitAtV7(state, where).id;

/** The Cult's next Start Turn (its turn and the Human's end). */
const check = (state: GameStateV7) => endTurnUntilV7(state, cultId(state));

const imp = (
  state: GameStateV7,
  summoner: CoordV7,
  where: CoordV7,
): CommandV7 => ({
  kind: "SUMMON",
  unitId: idAt(state, summoner),
  daemon: "IMP",
  at: where,
});

const SUMMONER = at(5, 2);

describe("the Imp: the identity (7r90)", () => {
  // The Imp (`pulp_wars-mch9.36`) took 7r90 after the Favour economy and
  // the warden of `pulp_wars-mch9.32` and `pulp_wars-mch9.33` (7r89); the
  // Gibbering Mass (`pulp_wars-mch9.37`) took 7r91 after it.
  it("was 7r90 after 7r89, both save keys obsolete now, a 7r89 state refused", () => {
    expect(RULESET_7_ID).toBe("pulp-wars-poc-7r96");
    expect(SAVE_STORAGE_KEY_V7).toBe("pulpWars.save.v7r96.current");
    expect(PRIOR_RULESET_7_IDS.slice(-7, -5)).toEqual([
      "pulp-wars-poc-7r89",
      "pulp-wars-poc-7r90",
    ]);
    expect(OBSOLETE_SAVE_STORAGE_KEYS_V7.slice(-7, -5)).toEqual([
      "pulpWars.save.v7r89.current",
      "pulpWars.save.v7r90.current",
    ]);
    const state = cultFieldV7([]);
    expect(
      parseGameStateV7({ ...state, rulesetId: "pulp-wars-poc-7r89" }),
    ).toBeNull();
  });
});

describe("the Imp: its registration (sections 4.1 and 7.3)", () => {
  it("is a summoned unit of 6 HP, Attack 2, Defense 1, Move 3, worth 2, for 2 Favour, Control 1", () => {
    expect(CULT_SUMMONED_ROLE_RULES_V7.IMP).toEqual({
      id: "IMP",
      label: "Imp",
      maxHp: 6,
      attack2: 4,
      defense2: 2,
      move: 3,
      range: 1,
      minimumRange: 1,
      favourCost: 2,
      control: 1,
      value: 2,
      movementMode: "STRIDE",
      unstoppable: false,
    });
    expect({
      cost: IMP_FAVOUR_COST_V7,
      control: IMP_CONTROL_V7,
      brood: IMP_BROOD_SIZE_V7,
      swarm: IMP_SWARM_MINIMUM_V7,
    }).toEqual({ cost: 2, control: 1, brood: 2, swarm: 2 });
    // (The Gibbering Mass follows: `pulp_wars-mch9.37`.)
    expect(SUMMON_DAEMONS_V7).toEqual(["IMP", "HORROR", "MASS"]);
    expect(BOARD_SUMMONED_ROLE_IDS_V7).toContain("IMP");
    // Its mechanical role is a Raider's, a role no rule of it reads.
    expect(SUMMONED_MECHANICAL_ROLES_V7.IMP).toBe("RAIDER");
    const rule = summonedUnitRoleRuleV7("IMP");
    expect(rule.abilities).toEqual(["ATTACK", "BROOD", "SWARM", "STRIDE"]);
    // It never captures.
    expect(rule.abilities).not.toContain("CAPTURE");
    expect([rule.cost, rule.technology, rule.sightRadius]).toEqual([
      null,
      null,
      1,
    ]);
    const mechanics = summonedUnitRoleMechanicsV7("IMP");
    // A daemon: no living thing, it strides, and it advances after a kill
    // (no zone-of-control slip, no Field Defense).
    expect(mechanics.construct).toBe(true);
    expect(mechanics.movementMode).toBe("STRIDE");
    expect(mechanics.advancesAfterKill).toBe(true);
    expect(mechanics.ignoresZocStops).toBe(false);
    expect(mechanics.buildsFieldDefense).toBe(false);
  });

  it("is an Unbound breed of its own: it attacks and strides, once a rampage, with no Brood or Swarm", () => {
    const rule = NEUTRAL_ROLE_RULES_V7.IMP;
    expect([rule.role, rule.label, rule.maxHp, rule.move]).toEqual([
      "RAIDER",
      "Unbound Imp",
      6,
      3,
    ]);
    expect(rule.abilities).toEqual(["ATTACK", "STRIDE"]);
    expect(RAMPAGE_ATTACKS_V7.IMP).toBe(1);
    expect(NEUTRAL_ROLE_MECHANICS_V7.IMP.advancesAfterKill).toBe(true);
  });

  it("explains itself in plain words: Brood, Swarm, and that it never captures", () => {
    const ids = summonedGlossaryV7("IMP").map((entry) => entry.id);
    expect(ids).toEqual([
      "DAEMON",
      "DAEMONS_FEED",
      "BROOD",
      "SWARM",
      "STRIDE",
      "NEVER_CAPTURES",
      "UNBOUND",
    ]);
  });
});

describe("the Imp: Summon (section 7.1)", () => {
  it("is summoned by a Summoner alone for 2 Favour, on every free tile beside it", () => {
    const state = withFavourV7(cultFieldV7([own("CAPTAIN", SUMMONER)]), 0, 2);
    const summoner = idAt(state, SUMMONER);
    const offered = offeredV7(state, "SUMMON");
    // No helper, so no Horror; an Imp on each of the eight tiles.
    expect(
      offered.every(
        (command) =>
          command.kind === "SUMMON" &&
          command.daemon === "IMP" &&
          command.helperUnitId === undefined,
      ),
    ).toBe(true);
    expect(offered).toHaveLength(8);
    const view = viewForV7(state, cultId(state));
    expect(previewSummonV7(view, summoner, "IMP", null, at(5, 3))).toEqual({
      unitId: summoner,
      helperUnitId: null,
      at: at(5, 3),
      role: "IMP",
      hp: 6,
      favour: 2,
      favourAfter: 0,
      control: 1,
      strands: 1,
    });
    // A Horror is not offered there (no helper).
    expect(
      previewSummonV7(view, summoner, "HORROR", null, at(5, 3)),
    ).toBeNull();
    const played = playV7(state, imp(state, SUMMONER, at(5, 3)));
    const summoned = unitAtV7(played.state, at(5, 3));
    expect(summoned).toMatchObject({
      ownerId: cultId(state),
      summoned: "IMP",
      role: "RAIDER",
      hp: 6,
      maxHp: 6,
      homeCityId: null,
    });
    expect(played.events.slice(0, 3)).toEqual([
      {
        kind: "FAVOUR_SPENT",
        playerId: cultId(state),
        purpose: "SUMMON_IMP",
        amount: 2,
        favour: 0,
      },
      {
        kind: "DAEMON_SUMMONED",
        playerId: cultId(state),
        unitId: summoner,
        helperUnitId: null,
        daemonUnitId: summoned.id,
        role: "IMP",
        at: at(5, 3),
        hp: 6,
      },
      {
        kind: "STRAND_FORMED",
        playerId: cultId(state),
        unitId: summoner,
        daemonUnitId: summoned.id,
      },
    ]);
    expect(favourOfV7(played.state, cultId(state))).toBe(0);
    // The Summoner channels it and has used its action; the Imp cannot act
    // until the next turn.
    expect(played.state.cult.strands).toEqual([
      { cultistUnitId: summoner, daemonUnitId: summoned.id },
    ]);
    expect(unitAtV7(played.state, SUMMONER).activation.specialActed).toBe(true);
    expect(offeredV7(played.state, "SUMMON")).toEqual([]);
    expect(
      queryPlayerCommandsV7(viewForV7(played.state, cultId(state))).some(
        (command) => "unitId" in command && command.unitId === summoned.id,
      ),
    ).toBe(false);
    // Every Cult seat starts with 2 Favour (E-R1): one Imp the turn its
    // first Summoner is trained.
    expect(startingFavourV7("CULT")).toBe(IMP_FAVOUR_COST_V7);
  });

  it("is refused one Favour short, with a helper named, or on a taken tile", () => {
    const poor = withFavourV7(cultFieldV7([own("CAPTAIN", SUMMONER)]), 0, 1);
    expect(rejectedV7(poor, imp(poor, SUMMONER, at(5, 3)))).toEqual({
      code: "INSUFFICIENT_FAVOUR",
      params: { cost: 2 },
    });
    const state = withFavourV7(
      cultFieldV7([own("CAPTAIN", SUMMONER), own("FIGHTER", at(6, 2))]),
      0,
      9,
    );
    // An Imp is the Summoner's alone: a command that names a helper for it
    // is no command; a Horror's must name one.
    expect(
      rejectedV7(state, {
        kind: "SUMMON",
        unitId: idAt(state, SUMMONER),
        daemon: "IMP",
        helperUnitId: idAt(state, at(6, 2)),
        at: at(5, 3),
      }).code,
    ).toBe("INVALID_COMMAND");
    expect(
      rejectedV7(state, {
        kind: "SUMMON",
        unitId: idAt(state, SUMMONER),
        daemon: "HORROR",
        at: at(5, 3),
      }).code,
    ).toBe("INVALID_COMMAND");
    // With 3 Favour the Imp is offered and the Horror is not.
    const three = withFavourV7(state, 0, 3);
    expect(
      rejectedV7(three, {
        kind: "SUMMON",
        unitId: idAt(three, SUMMONER),
        daemon: "HORROR",
        helperUnitId: idAt(three, at(6, 2)),
        at: at(5, 3),
      }),
    ).toEqual({ code: "INSUFFICIENT_FAVOUR", params: { cost: 4 } });
    expect(offeredV7(three, "SUMMON")).toContainEqual(
      imp(three, SUMMONER, at(5, 3)),
    );
    expect(rejectedV7(state, imp(state, SUMMONER, at(6, 2)))).toEqual({
      code: "SUMMON_NOT_LEGAL",
      params: { reason: "TILE" },
    });
    // Only a Summoner summons.
    expect(rejectedV7(state, imp(state, at(6, 2), at(6, 3)))).toEqual({
      code: "UNIT_ROLE_INVALID",
      params: { role: "FIGHTER" },
    });
  });

  it("parses an Imp without a helper and a Horror with one, and orders the Imp first on a tile", () => {
    const good = [
      { kind: "SUMMON", unitId: 31, daemon: "IMP", at: at(4, 4) },
      {
        kind: "SUMMON",
        unitId: 31,
        daemon: "HORROR",
        helperUnitId: 32,
        at: at(4, 4),
      },
    ] as const;
    for (const command of good)
      expect(parseCommandV7(command)).toEqual({ ok: true, value: command });
    for (const bad of [
      {
        kind: "SUMMON",
        unitId: 31,
        daemon: "IMP",
        helperUnitId: 32,
        at: at(4, 4),
      },
      { kind: "SUMMON", unitId: 31, daemon: "HORROR", at: at(4, 4) },
      { kind: "SUMMON", unitId: 31, helperUnitId: 32, at: at(4, 4) },
      { kind: "SUMMON", unitId: 31, daemon: "MASS", at: at(4, 4) },
      { kind: "SUMMON", unitId: 31, daemon: "HERALD", at: at(4, 4) },
    ])
      expect(parseCommandV7(bad).ok, JSON.stringify(bad)).toBe(false);
    const [first, second] = good;
    expect(
      Math.sign(compareCommandsV7(first as CommandV7, second as CommandV7)),
    ).toBe(-1);
    // By tile before the daemon.
    expect(
      Math.sign(
        compareCommandsV7(
          { ...second, at: at(3, 4) } as CommandV7,
          first as CommandV7,
        ),
      ),
    ).toBe(-1);
  });

  it("has its own id and line in the text harness", () => {
    const state = withFavourV7(cultFieldV7([own("CAPTAIN", SUMMONER)]), 0, 2);
    expect(textPlayCommandIdV7(imp(state, SUMMONER, at(5, 3)))).toBe(
      `u${idAt(state, SUMMONER)}.imp.5,3`,
    );
  });

  it("is summoned by the Cult AI's plan (the summon choice, A-R3)", () => {
    // A Summoner alone with 3 Favour near an enemy: an Imp is offered, a
    // Horror is not (no helper), and the seat summons the Imp
    // (`pulp_wars-mch9.40`; the choice itself is tested in
    // ruleset-v7-cult-summons-ai.test.ts).
    const state = withFavourV7(
      cultFieldV7([own("CAPTAIN", SUMMONER), human("FIGHTER", at(3, 2))]),
      0,
      3,
    );
    expect(offeredV7(state, "SUMMON").length).toBeGreaterThan(0);
    const decision = chooseNormalCommandV7(viewForV7(state, cultId(state)));
    expect(
      decision.candidates.some(
        (entry) =>
          entry.command.kind === "SUMMON" && entry.command.daemon === "IMP",
      ),
    ).toBe(true);
    expect(
      decision.candidates.some(
        (entry) =>
          entry.command.kind === "SUMMON" && entry.command.daemon !== "IMP",
      ),
    ).toBe(false);
  });
});

describe("the Imp: Brood at the check (section 7.3)", () => {
  /** An Imp on (5, 3) and the Imps of `others`, the Summoner on (5, 1). */
  const brood = (others: readonly CoordV7[], strand: boolean): GameStateV7 => {
    const base = withImps(
      cultFieldV7([own("CAPTAIN", at(5, 1)), human("FIGHTER", at(9, 1))]),
      [at(5, 3), ...others],
    );
    return strand ? withStrandsV7(base, at(5, 3), [at(5, 1)]) : base;
  };
  const ownerAt = (state: GameStateV7, where: CoordV7) =>
    unitAtV7(state, where).ownerId;

  it("holds three Imps beside each other on one strand, and pays the Summoner's trickle", () => {
    const state = brood([at(4, 4), at(6, 4)], true);
    const view = viewForV7(state, cultId(state));
    // As the board stands: the two beside the channelled Imp are held.
    expect(impBroodV7(state, state.units, cultId(state))).toEqual(
      new Map([
        [idAt(state, at(4, 4)), idAt(state, at(5, 3))],
        [idAt(state, at(6, 4)), idAt(state, at(5, 3))],
      ]),
    );
    expect(
      view.cult.daemons.map((entry) => [
        entry.unitId,
        entry.strands,
        entry.broodOf ?? null,
      ]),
    ).toEqual([
      [idAt(state, at(5, 3)), 1, null],
      [idAt(state, at(4, 4)), 0, idAt(state, at(5, 3))],
      [idAt(state, at(6, 4)), 0, idAt(state, at(5, 3))],
    ]);
    // Neither is short: no eye mark, no End Turn question.
    expect(previewRampageV7(view, idAt(state, at(4, 4)))?.short).toBe(false);
    expect(daemonsShortV7(view)).toEqual([]);
    const round = check(state);
    expect(kindsV7(round.events)).not.toContain("DAEMON_UNBOUND");
    for (const where of [at(5, 3), at(4, 4), at(6, 4)])
      expect(ownerAt(round.state, where), `${where.x},${where.y}`).toBe(
        cultId(state),
      );
    expect(eventsOf(round.events, "FAVOUR_GAINED")).toMatchObject([
      { source: "TRICKLE", amount: 1 },
    ]);
    expect(round.state.cult.strands).toEqual([]);
    for (const event of round.events)
      expect(parseEventV7(event).ok, event.kind).toBe(true);
  });

  it("holds two others at most, the lowest IDs: a fourth Imp beside them is Unbound", () => {
    const state = brood([at(4, 4), at(5, 4), at(6, 4)], true);
    const fourth = idAt(state, at(6, 4));
    const view = viewForV7(state, cultId(state));
    expect(
      view.cult.daemons.find((entry) => entry.unitId === fourth)?.broodOf,
    ).toBeUndefined();
    expect(daemonsShortV7(view).map((entry) => entry.unitId)).toEqual([fourth]);
    const round = check(state);
    expect(eventsOf(round.events, "DAEMON_UNBOUND")).toEqual([
      {
        kind: "DAEMON_UNBOUND",
        unitId: fourth,
        summonerPlayerId: cultId(state),
        strands: 0,
        control: 1,
        reason: "STRANDS",
      },
    ]);
    // It is a neutral Imp now, Furious, its breed its own.
    expect(
      round.state.monsters.find((entry) => entry.unitId === fourth),
    ).toMatchObject({
      breed: "IMP",
      unbound: { summonerPlayerId: cultId(state), furious: true },
    });
    const loose = round.state.units.find((unit) => unit.id === fourth);
    expect(loose?.ownerId).toBe(NEUTRAL_OWNER_ID_V7);
    if (loose !== undefined)
      expect(unitRoleRuleV7(round.state, loose).label).toBe("Unbound Imp");
    for (const where of [at(5, 3), at(4, 4), at(5, 4)])
      expect(ownerAt(round.state, where)).toBe(cultId(state));
  });

  it("lends no Brood on: an Imp held only through a held neighbour is Unbound", () => {
    // (5, 3) channelled; (4, 4) beside it; (3, 5) beside (4, 4) only.
    const state = brood([at(4, 4), at(3, 5)], true);
    const chained = idAt(state, at(3, 5));
    const round = check(state);
    expect(
      eventsOf(round.events, "DAEMON_UNBOUND").map((event) => event.unitId),
    ).toEqual([chained]);
    expect(ownerAt(round.state, at(4, 4))).toBe(cultId(state));
  });

  it("counts an Imp's own strand first: it takes none of a Brood", () => {
    // Both (5, 3) and (4, 4) are channelled; (6, 4) and (6, 2) lean on
    // (5, 3), which still has room for both: the channelled (4, 4) beside
    // it took none of its Brood.
    const both = withImps(
      cultFieldV7([
        own("CAPTAIN", at(5, 1)),
        own("FIGHTER", at(3, 3)),
        human("FIGHTER", at(9, 1)),
      ]),
      [at(5, 3), at(4, 4), at(6, 4), at(6, 2)],
    );
    const channelled = withStrandsV7(
      withStrandsV7(both, at(5, 3), [at(5, 1)]),
      at(4, 4),
      [at(3, 3)],
    );
    expect(
      [...impBroodV7(channelled, channelled.units, cultId(channelled))].map(
        ([held, lender]) => [held, lender],
      ),
    ).toEqual([
      [idAt(channelled, at(6, 4)), idAt(channelled, at(5, 3))],
      [idAt(channelled, at(6, 2)), idAt(channelled, at(5, 3))],
    ]);
    const round = check(channelled);
    expect(kindsV7(round.events)).not.toContain("DAEMON_UNBOUND");
  });

  it("names the Imps its Brood would hold in the channel preview", () => {
    const state = brood([at(4, 4), at(6, 4), at(5, 4)], false);
    const view = viewForV7(state, cultId(state));
    const preview = previewChannelV7(
      view,
      idAt(state, at(5, 1)),
      idAt(state, at(5, 3)),
    );
    expect(preview).toMatchObject({
      role: "IMP",
      control: 1,
      strandsBefore: 0,
      strandsAfter: 1,
      holds: true,
      brood: [idAt(state, at(4, 4)), idAt(state, at(6, 4))],
    });
    // A Horror's channel names none.
    const horror = withHorrorV7(
      cultFieldV7([own("FIGHTER", at(5, 1))]),
      0,
      at(5, 3),
    );
    expect(
      previewChannelV7(
        viewForV7(horror, cultId(horror)),
        idAt(horror, at(5, 1)),
        idAt(horror, at(5, 3)),
      )?.brood,
    ).toEqual([]);
  });
});

describe("the Imp: Swarm (section 7.3)", () => {
  const IMP = at(4, 4);
  const FIGHTER = at(5, 4);
  const field = (second: boolean): GameStateV7 =>
    withImps(cultFieldV7([human("FIGHTER", FIGHTER)]), [
      IMP,
      ...(second ? [at(5, 3)] : []),
    ]);
  const attack = (state: GameStateV7, from: CoordV7, to: CoordV7) =>
    ({
      kind: "ATTACK",
      unitId: idAt(state, from),
      targetUnitId: idAt(state, to),
    }) as const;

  it("strikes back at a lone Imp: it deals 5 and takes 5", () => {
    const state = field(false);
    expect(
      calculateCombatPreviewV7(state, idAt(state, IMP), idAt(state, FIGHTER)),
    ).toMatchObject({
      damageToDefender: 5,
      damageToAttacker: 5,
      retaliation: true,
      noRetaliationReason: null,
    });
  });

  it("does not strike back at an Imp when two of the seat's Imps stand beside it", () => {
    const state = field(true);
    const expected = {
      damageToDefender: 5,
      damageToAttacker: 0,
      retaliation: false,
      noRetaliationReason: "SWARMED",
    };
    expect(
      calculateCombatPreviewV7(state, idAt(state, IMP), idAt(state, FIGHTER)),
    ).toMatchObject(expected);
    expect(
      queryCombatPreviewV7(
        viewForV7(state, cultId(state)),
        idAt(state, IMP),
        idAt(state, FIGHTER),
      ),
    ).toMatchObject(expected);
    const struck = playV7(state, attack(state, IMP, FIGHTER));
    expect(unitAtV7(struck.state, IMP).hp).toBe(6);
    expect(unitAtV7(struck.state, FIGHTER).hp).toBe(
      unitAtV7(state, FIGHTER).hp - 5,
    );
    // The other Imp's attack is unanswered too.
    const again = applyOkV7(
      struck.state,
      cultId(state),
      attack(struck.state, at(5, 3), FIGHTER),
    );
    expect(eventsOf(again.events, "COMBAT_RESOLVED")[0]?.preview).toMatchObject(
      { retaliation: false, noRetaliationReason: "SWARMED" },
    );
  });

  it("answers every other attacker, and an Unbound Imp has no Swarm", () => {
    // A Familiar (the Cult's Raider) beside the Fighter with two Imps: it
    // is answered as usual.
    const state = checkedV7(
      withImps(
        cultFieldV7([human("FIGHTER", FIGHTER), own("RAIDER", at(6, 4))]),
        [IMP, at(5, 3)],
      ),
    );
    expect(
      calculateCombatPreviewV7(
        state,
        idAt(state, at(6, 4)),
        idAt(state, FIGHTER),
      ),
    ).toMatchObject({ retaliation: true });
    // The helper reads bound Imps only.
    const units = state.units.map((unit) =>
      unit.summoned === "IMP"
        ? { ...unit, ownerId: NEUTRAL_OWNER_ID_V7 }
        : unit,
    );
    const looseImp = units.find((unit) => unit.id === idAt(state, IMP));
    const fighter = unitAtV7(state, FIGHTER);
    if (looseImp === undefined) throw new Error("no Imp");
    expect(impSwarmsV7(units, looseImp, fighter)).toBe(false);
    expect(impSwarmsV7(state.units, unitAtV7(state, IMP), fighter)).toBe(true);
  });
});

describe("the Imp: no capture, and the rest of a daemon (section 7.3)", () => {
  it("is offered no capture on a neutral village, where a Horror is", () => {
    const VILLAGE = at(5, 5);
    const build = (role: "IMP" | "HORROR") =>
      withStrandsV7(
        withHorrorV7(
          cultFieldV7([own("FIGHTER", at(5, 4)), human("FIGHTER", at(1, 1))]),
          0,
          VILLAGE,
          { role },
        ),
        VILLAGE,
        [at(5, 4)],
      );
    const captures = (role: "IMP" | "HORROR") => {
      const round = check(build(role));
      const id = idAt(round.state, VILLAGE);
      return offeredV7(round.state, "CAPTURE").filter(
        (command) => "unitId" in command && command.unitId === id,
      ).length;
    };
    expect(captures("HORROR")).toBe(1);
    expect(captures("IMP")).toBe(0);
  });

  it("besieges a hostile city it stands on, as any unit does", () => {
    const state = withImps(cultFieldV7([]), [at(2, 8)]);
    const city = state.cities.find(
      (entry) => entry.at.x === 2 && entry.at.y === 8,
    );
    if (city === undefined) throw new Error("no city");
    expect(isCityBesiegedV7(state, city)).toBe(true);
  });

  it("goes for anyone within its reach of 4 when it would break loose", () => {
    // A lone Imp with no strand, a Human Fighter four tiles off and no
    // cultist near: if it broke now it would walk three and attack.
    const state = withImps(cultFieldV7([human("FIGHTER", at(5, 7))]), [
      at(5, 3),
    ]);
    const rampage = previewRampageV7(
      viewForV7(state, cultId(state)),
      idAt(state, at(5, 3)),
    );
    expect(rampage).toMatchObject({
      role: "IMP",
      unbound: false,
      short: true,
      control: 1,
      strands: 0,
      targetUnitId: idAt(state, at(5, 7)),
      step: 2,
      attacks: true,
      attackCount: 1,
    });
  });
});
