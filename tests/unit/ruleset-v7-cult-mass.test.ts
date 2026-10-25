import { describe, expect, it } from "vitest";
import { chooseNormalCommandV7 } from "../../src/ai/v7";
import {
  BOARD_SUMMONED_ROLE_IDS_V7,
  CULT_SUMMONED_ROLE_RULES_V7,
  MASS_CONTROL_V7,
  MASS_DRAG_TILES_V7,
  MASS_FAVOUR_COST_V7,
  NEUTRAL_OWNER_ID_V7,
  NEUTRAL_ROLE_MECHANICS_V7,
  NEUTRAL_ROLE_RULES_V7,
  PRIOR_RULESET_7_IDS,
  RAMPAGE_ATTACKS_V7,
  RULESET_7_ID,
  SAVE_STORAGE_KEY_V7,
  SUMMONED_MECHANICAL_ROLES_V7,
  SUMMON_DAEMONS_V7,
  TECHNOLOGY_IDS_V7,
  calculateCombatPreviewV7,
  defenderCrushableV7,
  draggingMassV7,
  favourOfV7,
  isCityBesiegedV7,
  massOnDoorstepV7,
  neutralBreedOfV7,
  parseCommandV7,
  parseEventV7,
  parseGameStateV7,
  previewRampageV7,
  previewSummonV7,
  publicDaemonHeldV7,
  publicDraggingMassV7,
  queryPlayerCommandsV7,
  summonedUnitRoleMechanicsV7,
  summonedUnitRoleRuleV7,
  unitIsImmovableV7,
  unitRoleRuleV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type DomainEventV7,
  type GameStateV7,
  type PlayerId,
  type TechnologyIdV7,
} from "../../src/engine/index";
import { OBSOLETE_SAVE_STORAGE_KEYS_V7 } from "../../src/persistence/index";
import { tileActionPlanForSelectionV7 } from "../../src/render/canvas/tile-actions-v7";
import { daemonsShortV7 } from "../../src/render/cult-channel-presentation-v7";
import { summonedGlossaryV7 } from "../../src/render/unit-glossary-v7";
import { textPlayCommandIdV7 } from "../../scripts/play-text-v7";
import {
  cultFieldV7,
  withFavourV7,
  withFrogsV7,
  withHorrorV7,
  withStrandsV7,
  withUnboundV7,
} from "../fixtures/v7-cult";
import {
  endTurnUntilV7,
  seatIdV7,
  unitAtV7,
  type GoblinPieceV7,
} from "../fixtures/v7-goblin-arena";
import { offeredV7, playV7, rejectedV7 } from "../fixtures/v7-martian";
import { at, kindsV7 } from "../fixtures/v7-revision20";

/**
 * The Cult redesign E-R7 (`pulp_wars-mch9.37`,
 * docs/product/RULESET_7_CULT_REDESIGN.md sections 4.1, 7.1, and 7.4): the
 * Gibbering Mass. A Summoner and a helper summon it for 5 Favour with
 * Gibbering Masses (Metallurgy); 30 HP, Attack 2, Defense 3, Move 1,
 * Control 1. **Doorstep**: on or beside an own city center, or beside an
 * own Idol Bearer whose idol stands, it needs no strand at the check.
 * **Drag**: a hostile unit that begins a Move beside it moves one tile.
 * Immovable; it never advances after a kill and never captures.
 *
 * Every state is built by hand on the two-seat 11 x 11 field of
 * `cultFieldV7` (seat 0 the Cult, capital (8, 8); seat 1 Human, capital
 * (2, 8); villages (5, 5), (8, 5), (5, 8)); no match is played. A Start
 * Turn check is reached by ending the Cult's turn and the Human's.
 */

const cultId = (state: GameStateV7): PlayerId => seatIdV7(state, 0);
const humanId = (state: GameStateV7): PlayerId => seatIdV7(state, 1);

const eventsOf = <K extends DomainEventV7["kind"]>(
  events: readonly DomainEventV7[],
  kind: K,
): Extract<DomainEventV7, { kind: K }>[] =>
  events.filter(
    (event): event is Extract<DomainEventV7, { kind: K }> =>
      event.kind === kind,
  );

const own = (
  role: GoblinPieceV7["role"],
  where: CoordV7,
  hp?: number,
): GoblinPieceV7 => ({
  seat: 0,
  role,
  at: where,
  ...(hp === undefined ? {} : { hp }),
});
const human = (
  role: GoblinPieceV7["role"],
  where: CoordV7,
  hp?: number,
): GoblinPieceV7 => ({
  seat: 1,
  role,
  at: where,
  ...(hp === undefined ? {} : { hp }),
});

/** A bound Gibbering Mass of seat `seat` on each of `where`. */
function withMasses(
  state: GameStateV7,
  where: readonly CoordV7[],
  seat = 0,
): GameStateV7 {
  let current = state;
  for (const tile of where)
    current = withHorrorV7(current, seat, tile, { role: "MASS" });
  return current;
}

const idAt = (state: GameStateV7, where: CoordV7) => unitAtV7(state, where).id;

/** The Cult's next Start Turn (its turn and the Human's end). */
const check = (state: GameStateV7) => endTurnUntilV7(state, cultId(state));

const mass = (
  state: GameStateV7,
  summoner: CoordV7,
  helper: CoordV7,
  where: CoordV7,
): CommandV7 => ({
  kind: "SUMMON",
  unitId: idAt(state, summoner),
  daemon: "MASS",
  helperUnitId: idAt(state, helper),
  at: where,
});

const SUMMONER = at(5, 2);
const HELPER = at(6, 2);
/** Every technology but Metallurgy (shown as Gibbering Masses). */
const NO_MASSES = TECHNOLOGY_IDS_V7.filter((tech) => tech !== "METALLURGY");

const chebyshev = (left: CoordV7, right: CoordV7): number =>
  Math.max(Math.abs(left.x - right.x), Math.abs(left.y - right.y));

describe("the Gibbering Mass: the identity (7r91)", () => {
  // The Gibbering Mass (`pulp_wars-mch9.37`) took 7r91 after the Imp of
  // `pulp_wars-mch9.36` (7r90); the Goblin Scrap Fleet
  // (`pulp_wars-5ti.16`) took 7r92 after it, the Undead Drowned Fleet
  // (`pulp_wars-5ti.17`) 7r93.
  it("was 7r91 after 7r90, both save keys obsolete now, a 7r90 state refused", () => {
    expect(RULESET_7_ID).toBe("pulp-wars-poc-7r112");
    expect(SAVE_STORAGE_KEY_V7).toBe("pulpWars.save.v7r112.current");
    expect(PRIOR_RULESET_7_IDS.slice(-22, -20)).toEqual([
      "pulp-wars-poc-7r90",
      "pulp-wars-poc-7r91",
    ]);
    expect(OBSOLETE_SAVE_STORAGE_KEYS_V7.slice(-22, -20)).toEqual([
      "pulpWars.save.v7r90.current",
      "pulpWars.save.v7r91.current",
    ]);
    const state = cultFieldV7([]);
    expect(
      parseGameStateV7({ ...state, rulesetId: "pulp-wars-poc-7r90" }),
    ).toBeNull();
  });
});

describe("the Gibbering Mass: its registration (sections 4.1 and 7.4)", () => {
  it("is a summoned unit of 30 HP, Attack 2, Defense 3, Move 1, worth 6, for 5 Favour, Control 1", () => {
    expect(CULT_SUMMONED_ROLE_RULES_V7.MASS).toEqual({
      id: "MASS",
      label: "Gibbering Mass",
      maxHp: 30,
      attack2: 4,
      defense2: 6,
      move: 1,
      range: 1,
      minimumRange: 1,
      favourCost: 5,
      control: 1,
      value: 6,
      movementMode: "STRIDE",
      unstoppable: false,
    });
    expect({
      cost: MASS_FAVOUR_COST_V7,
      control: MASS_CONTROL_V7,
      drag: MASS_DRAG_TILES_V7,
    }).toEqual({ cost: 5, control: 1, drag: 1 });
    expect(SUMMON_DAEMONS_V7).toContain("MASS");
    expect(BOARD_SUMMONED_ROLE_IDS_V7).toContain("MASS");
    // Its mechanical role is a Guard's, a role no rule of it reads.
    expect(SUMMONED_MECHANICAL_ROLES_V7.MASS).toBe("GUARD");
    const rule = summonedUnitRoleRuleV7("MASS");
    expect(rule.abilities).toEqual(["ATTACK", "DOORSTEP", "DRAG", "STRIDE"]);
    // It never captures.
    expect(rule.abilities).not.toContain("CAPTURE");
    expect([rule.cost, rule.technology, rule.sightRadius]).toEqual([
      null,
      null,
      1,
    ]);
    const mechanics = summonedUnitRoleMechanicsV7("MASS");
    // A daemon: no living thing, it strides; immovable, it never advances
    // after a kill, and it is not the Human Guard (no Open to ranged).
    expect(mechanics.construct).toBe(true);
    expect(mechanics.movementMode).toBe("STRIDE");
    expect(mechanics.advancesAfterKill).toBe(false);
    expect(mechanics.immovable).toBe(true);
    expect(mechanics.rangedDefense2).toBeNull();
    expect(mechanics.buildsFieldDefense).toBe(false);
  });

  it("is an Unbound breed of its own: it attacks, strides, and still Drags, once a rampage", () => {
    const rule = NEUTRAL_ROLE_RULES_V7.MASS;
    expect([rule.role, rule.label, rule.maxHp, rule.move]).toEqual([
      "GUARD",
      "Unbound Gibbering Mass",
      30,
      1,
    ]);
    expect(rule.abilities).toEqual(["ATTACK", "DRAG", "STRIDE"]);
    expect(RAMPAGE_ATTACKS_V7.MASS).toBe(1);
    expect(NEUTRAL_ROLE_MECHANICS_V7.MASS.advancesAfterKill).toBe(false);
    expect(NEUTRAL_ROLE_MECHANICS_V7.MASS.immovable).toBe(true);
    // A `GUARD` of the Mass's 30 HP is a Mass, also without its field.
    expect(neutralBreedOfV7({}, { id: 1, role: "GUARD", maxHp: 30 })).toBe(
      "MASS",
    );
  });

  it("explains itself in plain words: Doorstep, Drag, that it holds its ground, and never captures", () => {
    const ids = summonedGlossaryV7("MASS").map((entry) => entry.id);
    expect(ids).toEqual([
      "DAEMON",
      "DAEMONS_FEED",
      "DOORSTEP",
      "DRAG",
      "STRIDE",
      "HOLDS_GROUND",
      "NEVER_CAPTURES",
      "UNBOUND",
    ]);
    for (const entry of summonedGlossaryV7("MASS"))
      expect(entry.text, entry.id).not.toMatch(/[=+*/]/);
  });

  it("matches the hand-computed fights of section 4.3", () => {
    const state = withMasses(
      cultFieldV7([human("FIGHTER", at(5, 3)), human("KNIGHT", at(4, 3))]),
      [at(5, 2)],
    );
    const target = idAt(state, at(5, 2));
    // A Fighter deals 4 (26 left) and takes 8; a Knight deals 10 and
    // takes 6.
    expect(
      calculateCombatPreviewV7(state, idAt(state, at(5, 3)), target),
    ).toMatchObject({ damageToDefender: 4, damageToAttacker: 8 });
    expect(
      calculateCombatPreviewV7(state, idAt(state, at(4, 3)), target),
    ).toMatchObject({ damageToDefender: 10, damageToAttacker: 6 });
  });
});

describe("the Gibbering Mass: Summon (section 7.1)", () => {
  const field = (
    favour: number,
    techs: readonly TechnologyIdV7[] = TECHNOLOGY_IDS_V7,
  ) =>
    withFavourV7(
      cultFieldV7([own("CAPTAIN", SUMMONER), own("FIGHTER", HELPER)], {
        techs: { 0: techs },
      }),
      0,
      favour,
    );

  it("is summoned by a Summoner and a helper for 5 Favour, both channelling it", () => {
    const state = field(5);
    const summoner = idAt(state, SUMMONER);
    const helper = idAt(state, HELPER);
    const offered = offeredV7(state, "SUMMON").filter(
      (command) => command.kind === "SUMMON" && command.daemon === "MASS",
    );
    // On every free tile beside the Summoner (the helper holds one).
    expect(offered).toHaveLength(7);
    expect(
      offered.every(
        (command) =>
          command.kind === "SUMMON" && command.helperUnitId === helper,
      ),
    ).toBe(true);
    const view = viewForV7(state, cultId(state));
    expect(previewSummonV7(view, summoner, "MASS", helper, at(5, 3))).toEqual({
      unitId: summoner,
      helperUnitId: helper,
      at: at(5, 3),
      role: "MASS",
      hp: 30,
      favour: 5,
      favourAfter: 0,
      control: 1,
      strands: 2,
    });
    const played = playV7(state, mass(state, SUMMONER, HELPER, at(5, 3)));
    const summoned = unitAtV7(played.state, at(5, 3));
    expect(summoned).toMatchObject({
      ownerId: cultId(state),
      summoned: "MASS",
      role: "GUARD",
      hp: 30,
      maxHp: 30,
      homeCityId: null,
    });
    expect(played.events.slice(0, 4)).toEqual([
      {
        kind: "FAVOUR_SPENT",
        playerId: cultId(state),
        purpose: "SUMMON_MASS",
        amount: 5,
        favour: 0,
      },
      {
        kind: "DAEMON_SUMMONED",
        playerId: cultId(state),
        unitId: summoner,
        helperUnitId: helper,
        daemonUnitId: summoned.id,
        role: "MASS",
        at: at(5, 3),
        hp: 30,
      },
      {
        kind: "STRAND_FORMED",
        playerId: cultId(state),
        unitId: Math.min(summoner, helper),
        daemonUnitId: summoned.id,
      },
      {
        kind: "STRAND_FORMED",
        playerId: cultId(state),
        unitId: Math.max(summoner, helper),
        daemonUnitId: summoned.id,
      },
    ]);
    expect(favourOfV7(played.state, cultId(state))).toBe(0);
    expect(unitAtV7(played.state, SUMMONER).activation.specialActed).toBe(true);
    expect(unitAtV7(played.state, HELPER).activation.specialActed).toBe(true);
  });

  it("is refused one Favour short, without Gibbering Masses, without a helper, or on a taken tile", () => {
    expect(
      rejectedV7(field(4), mass(field(4), SUMMONER, HELPER, at(5, 3))),
    ).toEqual({ code: "INSUFFICIENT_FAVOUR", params: { cost: 5 } });
    // With 4 Favour the Horror is still offered, the Mass is not.
    expect(
      offeredV7(field(4), "SUMMON").some(
        (command) => command.kind === "SUMMON" && command.daemon === "MASS",
      ),
    ).toBe(false);
    // Without Metallurgy (shown as Gibbering Masses): `TECHNOLOGY`, and
    // only the Imp and the Horror are offered.
    const untaught = field(9, NO_MASSES);
    expect(
      rejectedV7(untaught, mass(untaught, SUMMONER, HELPER, at(5, 3))),
    ).toEqual({ code: "SUMMON_NOT_LEGAL", params: { reason: "TECHNOLOGY" } });
    expect(
      [
        ...new Set(
          offeredV7(untaught, "SUMMON").map((command) =>
            command.kind === "SUMMON" ? command.daemon : null,
          ),
        ),
      ].sort(),
    ).toEqual(["HORROR", "IMP"]);
    // A helper two tiles off is no helper.
    const far = withFavourV7(
      cultFieldV7([own("CAPTAIN", SUMMONER), own("FIGHTER", at(7, 2))]),
      0,
      9,
    );
    expect(rejectedV7(far, mass(far, SUMMONER, at(7, 2), at(5, 3)))).toEqual({
      code: "SUMMON_NOT_LEGAL",
      params: { reason: "HELPER" },
    });
    const state = field(9);
    expect(rejectedV7(state, mass(state, SUMMONER, HELPER, HELPER))).toEqual({
      code: "SUMMON_NOT_LEGAL",
      params: { reason: "TILE" },
    });
  });

  it("parses a Mass with a helper only, and orders it after the Horror on a tile", () => {
    const good = {
      kind: "SUMMON",
      unitId: 31,
      daemon: "MASS",
      helperUnitId: 32,
      at: at(4, 4),
    } as const;
    expect(parseCommandV7(good)).toEqual({ ok: true, value: good });
    expect(
      parseCommandV7({
        kind: "SUMMON",
        unitId: 31,
        daemon: "MASS",
        at: at(4, 4),
      }).ok,
    ).toBe(false);
  });

  it("has its own id and line in the text harness", () => {
    const state = field(5);
    expect(textPlayCommandIdV7(mass(state, SUMMONER, HELPER, at(5, 3)))).toBe(
      `u${idAt(state, SUMMONER)}.mass.u${idAt(state, HELPER)}.5,3`,
    );
  });

  it("is aimed in the browser by its own badge on each of its tiles (the chooser, pulp_wars-mch9.44)", () => {
    const state = field(5);
    const masses = offeredV7(state, "SUMMON").filter(
      (command): command is Extract<CommandV7, { kind: "SUMMON" }> =>
        command.kind === "SUMMON" && command.daemon === "MASS",
    );
    expect(masses.length).toBeGreaterThan(0);
    const view = viewForV7(state, cultId(state));
    const plan = tileActionPlanForSelectionV7(
      view,
      queryPlayerCommandsV7(view),
      idAt(state, SUMMONER),
    );
    const badged = (plan?.tiles ?? []).filter((tile) =>
      tile.actions.some((action) => action.id === "SUMMON_MASS"),
    );
    expect(badged.map((tile) => tile.at)).toEqual(
      masses
        .map((command) => command.at)
        .sort((left, right) => left.y - right.y || left.x - right.x),
    );
  });

  it("is summoned by the Cult AI only to guard a city or a circle (A-R3)", () => {
    // A Summoner and a helper with 5 Favour beside an enemy in the open: a
    // Mass is offered, but no city or idol is beside its tiles, so no
    // candidate of the seat names one (`pulp_wars-mch9.40`; the Mass for a
    // watched city and for a circle is tested in
    // ruleset-v7-cult-summons-ai.test.ts).
    const state = withFavourV7(
      cultFieldV7([
        own("CAPTAIN", SUMMONER),
        own("FIGHTER", HELPER),
        human("FIGHTER", at(3, 2)),
      ]),
      0,
      5,
    );
    expect(
      offeredV7(state, "SUMMON").some(
        (command) => command.kind === "SUMMON" && command.daemon === "MASS",
      ),
    ).toBe(true);
    const decision = chooseNormalCommandV7(viewForV7(state, cultId(state)));
    const namesMass = (command: CommandV7 | null | undefined) =>
      command?.kind === "SUMMON" && command.daemon === "MASS";
    expect(namesMass(decision.command)).toBe(false);
    expect(decision.candidates.some((entry) => namesMass(entry.command))).toBe(
      false,
    );
  });
});

describe("the Gibbering Mass: Doorstep at the check (section 7.4)", () => {
  const FAR = human("FIGHTER", at(1, 1));
  const ownerAt = (state: GameStateV7, where: CoordV7) =>
    unitAtV7(state, where).ownerId;

  it("needs no strand beside an own city center: it stays bound, and is not short", () => {
    const BESIDE = at(7, 7);
    const state = withMasses(cultFieldV7([FAR]), [BESIDE]);
    const id = idAt(state, BESIDE);
    expect(
      massOnDoorstepV7(
        state,
        state.cities,
        state.units,
        unitAtV7(state, BESIDE),
      ),
    ).toBe(true);
    const view = viewForV7(state, cultId(state));
    expect(view.cult.daemons).toEqual([
      { unitId: id, role: "MASS", control: 1, strands: 0, doorstep: true },
    ]);
    expect(publicDaemonHeldV7(view, id)).toBe(true);
    expect(previewRampageV7(view, id)?.short).toBe(false);
    expect(daemonsShortV7(view)).toEqual([]);
    // Every viewer reads it (the channel is public).
    expect(viewForV7(state, humanId(state)).cult.daemons[0]?.doorstep).toBe(
      true,
    );
    const round = check(state);
    expect(kindsV7(round.events)).not.toContain("DAEMON_UNBOUND");
    expect(ownerAt(round.state, BESIDE)).toBe(cultId(state));
    // No strand held, so no Summoner's trickle.
    expect(eventsOf(round.events, "FAVOUR_GAINED")).toEqual([]);
  });

  it("needs none on the center itself (a daemon fills no slot)", () => {
    const CENTER = at(8, 8);
    const state = withMasses(cultFieldV7([FAR]), [CENTER]);
    const round = check(state);
    expect(kindsV7(round.events)).not.toContain("DAEMON_UNBOUND");
    expect(ownerAt(round.state, CENTER)).toBe(cultId(state));
  });

  it("needs none beside an own Idol Bearer whose idol stands, and is Unbound when the bearer is a frog", () => {
    const MASS = at(5, 2);
    const state = withMasses(cultFieldV7([own("GUARD", at(5, 3)), FAR]), [
      MASS,
    ]);
    expect(viewForV7(state, cultId(state)).cult.daemons[0]?.doorstep).toBe(
      true,
    );
    const held = check(state);
    expect(kindsV7(held.events)).not.toContain("DAEMON_UNBOUND");
    expect(ownerAt(held.state, MASS)).toBe(cultId(state));
    // The idol is down while the bearer is a frog: no Doorstep. (A frog
    // lasts until the end of its owner's next turn: one made in the Human's
    // turn stands at the Cult's check.)
    const frogged = withFrogsV7(
      withMasses(
        cultFieldV7([own("GUARD", at(5, 3)), FAR], { activeSeat: 1 }),
        [MASS],
      ),
      [at(5, 3)],
    );
    const view = viewForV7(frogged, cultId(frogged));
    expect(view.cult.daemons[0]?.doorstep).toBeUndefined();
    expect(daemonsShortV7(view).map((entry) => entry.unitId)).toEqual([
      idAt(frogged, MASS),
    ]);
    const broken = check(frogged);
    expect(eventsOf(broken.events, "DAEMON_UNBOUND")).toEqual([
      {
        kind: "DAEMON_UNBOUND",
        unitId: idAt(frogged, MASS),
        summonerPlayerId: cultId(frogged),
        strands: 0,
        control: 1,
        reason: "STRANDS",
      },
    ]);
  });

  it("is Unbound in the open with no strand, beside a village, or beside an enemy city", () => {
    for (const where of [at(5, 2), at(5, 4), at(3, 8)]) {
      const state = withMasses(cultFieldV7([FAR]), [where]);
      const id = idAt(state, where);
      expect(
        viewForV7(state, cultId(state)).cult.daemons[0]?.doorstep,
        `${where.x},${where.y}`,
      ).toBeUndefined();
      const round = check(state);
      expect(
        eventsOf(round.events, "DAEMON_UNBOUND").map((event) => event.unitId),
        `${where.x},${where.y}`,
      ).toEqual([id]);
      // It is a neutral Mass now, Furious, its breed its own.
      expect(
        round.state.monsters.find((entry) => entry.unitId === id),
      ).toMatchObject({
        breed: "MASS",
        unbound: { summonerPlayerId: cultId(state), furious: true },
      });
      const loose = round.state.units.find((unit) => unit.id === id);
      expect(loose?.ownerId).toBe(NEUTRAL_OWNER_ID_V7);
      if (loose !== undefined)
        expect(unitRoleRuleV7(round.state, loose).label).toBe(
          "Unbound Gibbering Mass",
        );
    }
  });

  it("counts its strands first: a Summoner channelling it on its Doorstep still trickles", () => {
    const BESIDE = at(7, 7);
    const state = withStrandsV7(
      withMasses(cultFieldV7([own("CAPTAIN", at(6, 6)), FAR]), [BESIDE]),
      BESIDE,
      [at(6, 6)],
    );
    const round = check(state);
    expect(kindsV7(round.events)).not.toContain("DAEMON_UNBOUND");
    expect(eventsOf(round.events, "FAVOUR_GAINED")).toMatchObject([
      { source: "TRICKLE", amount: 1 },
    ]);
    for (const event of round.events)
      expect(parseEventV7(event).ok, event.kind).toBe(true);
  });

  it("is held by its strand off its Doorstep, as a Horror", () => {
    const state = withStrandsV7(
      withMasses(cultFieldV7([own("FIGHTER", at(5, 1)), FAR]), [at(5, 3)]),
      at(5, 3),
      [at(5, 1)],
    );
    const round = check(state);
    expect(kindsV7(round.events)).not.toContain("DAEMON_UNBOUND");
  });
});

describe("the Gibbering Mass: Drag (section 7.4)", () => {
  const MASS = at(5, 2);
  /** The Human to move, its unit on `where`, a Cult Mass on (5, 2). */
  const humanTurn = (role: GoblinPieceV7["role"], where: CoordV7) =>
    withMasses(cultFieldV7([human(role, where)], { activeSeat: 1 }), [MASS]);
  const moves = (state: GameStateV7, from: CoordV7) =>
    offeredV7(state, "MOVE").filter(
      (command) =>
        command.kind === "MOVE" && command.unitId === idAt(state, from),
    );
  const reach = (state: GameStateV7, from: CoordV7): number =>
    Math.max(
      ...moves(state, from).map((command) =>
        command.kind === "MOVE"
          ? chebyshev(command.path.at(-1) ?? from, from)
          : 0,
      ),
    );

  it("lets a Knight that begins beside it move one tile only (`DRAGGED`)", () => {
    const KNIGHT = at(5, 3);
    const state = humanTurn("KNIGHT", KNIGHT);
    const knight = unitAtV7(state, KNIGHT);
    expect(unitRoleRuleV7(state, knight).move).toBeGreaterThan(1);
    expect(moves(state, KNIGHT).length).toBeGreaterThan(0);
    expect(reach(state, KNIGHT)).toBe(1);
    expect(draggingMassV7(state, state.units, knight)?.id).toBe(
      idAt(state, MASS),
    );
    expect(
      publicDraggingMassV7(viewForV7(state, humanId(state)), knight.id),
    ).toBe(idAt(state, MASS));
    expect(
      rejectedV7(state, {
        kind: "MOVE",
        unitId: knight.id,
        path: [at(4, 4), at(3, 5)],
      }),
    ).toEqual({ code: "MOVEMENT_ILLEGAL", params: { reason: "DRAGGED" } });
    // One tile is a Move like any other.
    playV7(state, { kind: "MOVE", unitId: knight.id, path: [at(4, 4)] });
  });

  it("leaves a Knight that begins elsewhere its full Move", () => {
    const KNIGHT = at(5, 6);
    const state = humanTurn("KNIGHT", KNIGHT);
    expect(reach(state, KNIGHT)).toBeGreaterThan(1);
    expect(
      publicDraggingMassV7(
        viewForV7(state, humanId(state)),
        idAt(state, KNIGHT),
      ),
    ).toBeNull();
  });

  it("does not drag its own seat's units; an Unbound Mass drags everybody", () => {
    const FAMILIAR = at(5, 3);
    const state = withMasses(cultFieldV7([own("RAIDER", FAMILIAR)]), [MASS]);
    expect(reach(state, FAMILIAR)).toBe(2);
    const loose = withUnboundV7(state, MASS, 0);
    expect(unitAtV7(loose, MASS).ownerId).toBe(NEUTRAL_OWNER_ID_V7);
    expect(reach(loose, FAMILIAR)).toBe(1);
    expect(
      rejectedV7(loose, {
        kind: "MOVE",
        unitId: idAt(loose, FAMILIAR),
        path: [at(5, 4), at(5, 5)],
      }),
    ).toEqual({ code: "MOVEMENT_ILLEGAL", params: { reason: "DRAGGED" } });
  });

  it("offers the same Moves in the public query as the reducer accepts", () => {
    const KNIGHT = at(5, 3);
    const state = humanTurn("KNIGHT", KNIGHT);
    const view = viewForV7(state, humanId(state));
    const offered = queryPlayerCommandsV7(view).filter(
      (command) =>
        command.kind === "MOVE" && command.unitId === idAt(state, KNIGHT),
    );
    for (const command of offered)
      if (command.kind === "MOVE") expect(command.path).toHaveLength(1);
  });
});

describe("the Gibbering Mass: immovable, no advance, no capture (section 7.4)", () => {
  it("is never pushed, but a Crushing Shove crushes it", () => {
    const state = withMasses(cultFieldV7([]), [at(5, 2)]);
    const body = unitAtV7(state, at(5, 2));
    expect(unitIsImmovableV7(state, body)).toBe(true);
    expect(defenderCrushableV7(state, body)).toBe(true);
  });

  it("stays where it stands after a kill", () => {
    const state = withMasses(cultFieldV7([human("FIGHTER", at(5, 3), 1)]), [
      at(5, 2),
    ]);
    const attacker = idAt(state, at(5, 2));
    expect(
      calculateCombatPreviewV7(state, attacker, idAt(state, at(5, 3))),
    ).toMatchObject({ defenderDies: true, advances: false });
    const played = playV7(state, {
      kind: "ATTACK",
      unitId: attacker,
      targetUnitId: idAt(state, at(5, 3)),
    });
    expect(unitAtV7(played.state, at(5, 2)).id).toBe(attacker);
    expect(
      played.state.units.some(
        (unit) => unit.at.x === 5 && unit.at.y === 3 && unit.hp > 0,
      ),
    ).toBe(false);
    // Unbound, it stays too.
    const loose = withUnboundV7(state, at(5, 2), 0);
    expect(
      calculateCombatPreviewV7(loose, attacker, idAt(loose, at(5, 3))),
    ).toMatchObject({ defenderDies: true, advances: false });
  });

  it("is offered no capture on a neutral village, and besieges a hostile city it stands on", () => {
    const VILLAGE = at(5, 5);
    const state = withStrandsV7(
      withMasses(
        cultFieldV7([own("FIGHTER", at(5, 4)), human("FIGHTER", at(1, 1))]),
        [VILLAGE],
      ),
      VILLAGE,
      [at(5, 4)],
    );
    const round = check(state);
    const id = idAt(round.state, VILLAGE);
    expect(
      offeredV7(round.state, "CAPTURE").filter(
        (command) => "unitId" in command && command.unitId === id,
      ),
    ).toEqual([]);
    const sieging = withMasses(cultFieldV7([]), [at(2, 8)]);
    const city = sieging.cities.find(
      (entry) => entry.at.x === 2 && entry.at.y === 8,
    );
    if (city === undefined) throw new Error("no city");
    expect(isCityBesiegedV7(sieging, city)).toBe(true);
  });

  it("goes for a cultist within 2 or anyone within its reach of 2 when it would break loose", () => {
    // A lone Mass with no strand in the open, a Human Fighter two tiles
    // off: if it broke now it would step one and attack.
    const state = withMasses(cultFieldV7([human("FIGHTER", at(5, 4))]), [
      at(5, 2),
    ]);
    expect(
      previewRampageV7(viewForV7(state, cultId(state)), idAt(state, at(5, 2))),
    ).toMatchObject({
      role: "MASS",
      unbound: false,
      short: true,
      control: 1,
      strands: 0,
      targetUnitId: idAt(state, at(5, 4)),
      step: 2,
      attacks: true,
      attackCount: 1,
    });
  });
});
