import { describe, expect, it } from "vitest";
import {
  BOARD_SUMMONED_ROLE_IDS_V7,
  CULT_SUMMONED_ROLE_RULES_V7,
  DAEMON_BREEDS_V7,
  DOMAIN_EVENT_KIND_ORDER_V7,
  FAVOUR_SOURCES_V7,
  NEUTRAL_BOUNTIES_V7,
  NEUTRAL_BREEDS_V7,
  NEUTRAL_OWNER_ID_V7,
  NEUTRAL_ROLE_MECHANICS_V7,
  NEUTRAL_ROLE_RULES_V7,
  PRIOR_RULESET_7_IDS,
  RAMPAGE_ATTACKS_V7,
  RULESET_7_ID,
  SAVE_STORAGE_KEY_V7,
  SUMMONED_MECHANICAL_ROLES_V7,
  bindingStrandsV7,
  calculateCombatPreviewV7,
  canBeFrozenV7,
  daemonIsBoundV7,
  daemonIsFuriousV7,
  daemonKillFavourV7,
  favourOfV7,
  isCityBesiegedV7,
  isDaemonBreedV7,
  neutralBreedOfV7,
  parseEventV7,
  parseGameStateV7,
  previewChannelV7,
  previewMonsterV7,
  previewRampageV7,
  projectEventsV7,
  queryPlayerCommandsV7,
  rampageBoardV7,
  UNBOUND_CULTIST_REACH_V7,
  rampageChoiceV7,
  rampagePlanV7,
  rampageTargetV7,
  rampageTargetableV7,
  scoreV7,
  unitFavourValueV7,
  unitId,
  unitIsUnboundV7,
  unitIsWildV7,
  unitRoleMechanicsV7,
  unitRoleRuleV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type DomainEventV7,
  type GameStateV7,
  type PlayerId,
  type RampageBoardV7,
  type RampageUnitFactsV7,
} from "../../src/engine/index";
import { OBSOLETE_SAVE_STORAGE_KEYS_V7 } from "../../src/persistence/index";
import { checkedV7 } from "../fixtures/v7-builders";
import {
  cultFieldV7,
  withGripV7,
  withHorrorV7,
  withStrandsV7,
  withUnboundHeraldV7,
  withUnboundV7,
} from "../fixtures/v7-cult";
import {
  applyOkV7,
  endTurnUntilV7,
  seatIdV7,
  unitAtV7,
  type GoblinPieceV7,
} from "../fixtures/v7-goblin-arena";
import { offeredV7, playV7, rejectedV7 } from "../fixtures/v7-martian";
import { at, attackV7, kindsV7, unexploreV7 } from "../fixtures/v7-revision20";
import { round2ArenaV7, round2SeatV7 } from "../fixtures/v7-round2-arena";

/**
 * The Cultists of the Ancient Ones, engine bead E4 (`pulp_wars-mch9.6`,
 * docs/product/RULESET_7_CULTISTS.md sections 6.4, 6.5, 8.2, 8.3, and
 * 13.1): Unbound. A daemon that fails its check belongs to nobody, is a
 * neutral unit of its own breed, rampages at once and in every neutral
 * turn, is Furious for the turn it broke loose in, and may be bound again;
 * a bound daemon's kills pay Favour; a wild unit's attack pays nobody.
 *
 * Every state here is built by hand; no match is played. The field is the
 * two-seat 11 x 11 board of `fieldV7`: seat 0 (the Cult) capital (8, 8)
 * with territory x 7 to 9, y 7 to 9; seat 1 (Human) capital (2, 8) with
 * territory x 1 to 3, y 7 to 9; villages on (5, 5), (8, 5), and (5, 8);
 * everything else open Grass, all of it explored by both seats.
 */

const HORROR = at(5, 2);

function need<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) throw new Error("missing");
  return value;
}

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

const channel = (
  state: GameStateV7,
  cultist: CoordV7,
  daemon: CoordV7,
): CommandV7 => ({
  kind: "CHANNEL",
  unitId: unitAtV7(state, cultist).id,
  daemonUnitId: unitAtV7(state, daemon).id,
});

/** A bound Horror of the Cult (seat 0) on (5, 2) with the given pieces. */
const horrorField = (
  pieces: readonly GoblinPieceV7[],
  options: Parameters<typeof cultFieldV7>[1] = {},
  horror: Parameters<typeof withHorrorV7>[3] = {},
  where: CoordV7 = HORROR,
): GameStateV7 => withHorrorV7(cultFieldV7(pieces, options), 0, where, horror);

/** The same Horror, Unbound already (its summoner the Cult seat 0). */
const looseField = (
  pieces: readonly GoblinPieceV7[],
  options: Parameters<typeof cultFieldV7>[1] = {},
  furious = false,
  horror: Parameters<typeof withHorrorV7>[3] = {},
): GameStateV7 =>
  withUnboundV7(horrorField(pieces, options, horror), HORROR, 0, furious);

const ledger = (state: GameStateV7, playerId: PlayerId) =>
  need(state.scoreLedger.find((entry) => entry.playerId === playerId));

const combats = (events: readonly DomainEventV7[]) =>
  eventsOf(events, "COMBAT_RESOLVED").map((event) => event.preview);

/**
 * An offered `ATTACK` of the active seat's unit on `from` at the unit on
 * `to`, with its resolved combat. (`attackV7` also pins the public preview,
 * which has one more field for a neutral target.)
 */
function strike(state: GameStateV7, from: CoordV7, to: CoordV7) {
  const actor = need(state.turnOrder[state.activeSeatIndex]);
  const command: CommandV7 = {
    kind: "ATTACK",
    unitId: unitAtV7(state, from).id,
    targetUnitId: unitAtV7(state, to).id,
  };
  expect(offeredV7(state, "ATTACK")).toContainEqual(command);
  const result = applyOkV7(state, actor, command);
  for (const event of result.events)
    expect(parseEventV7(event).ok, event.kind).toBe(true);
  expect(parseGameStateV7(JSON.parse(JSON.stringify(result.state)))).toEqual(
    result.state,
  );
  return { ...result, combat: need(combats(result.events)[0]) };
}

describe("Unbound: identity", () => {
  it("is a new identity after the channel's 7r74, whose saves are obsolete", () => {
    const revision = Number(RULESET_7_ID.replace("pulp-wars-poc-7r", ""));
    expect(revision).toBeGreaterThanOrEqual(75);
    expect(PRIOR_RULESET_7_IDS).toContain("pulp-wars-poc-7r74");
    expect(PRIOR_RULESET_7_IDS).not.toContain(RULESET_7_ID);
    expect(SAVE_STORAGE_KEY_V7).toBe(`pulpWars.save.v7r${revision}.current`);
    expect(OBSOLETE_SAVE_STORAGE_KEYS_V7).toContain(
      "pulpWars.save.v7r74.current",
    );
    // A state of the channel's identity is not read as a current one.
    const state = cultFieldV7([]);
    expect(
      parseGameStateV7({ ...state, rulesetId: "pulp-wars-poc-7r74" }),
    ).toBeNull();
  });
});

describe("Unbound: the registration (sections 6.4 and 13.1)", () => {
  it("registers the daemons as neutral breeds with their own numbers", () => {
    // (`pulp_wars-mch9.8` adds the Tentacle after them, the Cult redesign
    // the Imp, `pulp_wars-mch9.36`, and the Gibbering Mass,
    // `pulp_wars-mch9.37`; map curiosities round 3 B, `pulp_wars-737.21`,
    // the Sea Serpent after them.)
    expect(NEUTRAL_BREEDS_V7.slice(-6, -1)).toEqual([
      "HORROR",
      "HERALD",
      "TENTACLE",
      "IMP",
      "MASS",
    ]);
    expect(DAEMON_BREEDS_V7).toEqual(["HORROR", "HERALD", "IMP", "MASS"]);
    for (const breed of NEUTRAL_BREEDS_V7)
      expect(isDaemonBreedV7(breed), breed).toBe(
        breed === "HORROR" ||
          breed === "HERALD" ||
          breed === "IMP" ||
          breed === "MASS",
      );
    for (const breed of DAEMON_BREEDS_V7) {
      const rule = NEUTRAL_ROLE_RULES_V7[breed];
      const summoned = CULT_SUMMONED_ROLE_RULES_V7[breed];
      // It keeps its numbers and its stride, and only attacks.
      expect([
        rule.label,
        rule.maxHp,
        rule.attack2,
        rule.defense2,
        rule.move,
        rule.range,
      ]).toEqual([
        `Unbound ${summoned.label}`,
        summoned.maxHp,
        summoned.attack2,
        summoned.defense2,
        summoned.move,
        summoned.range,
      ]);
      // (Unstoppable is the Herald's body rule: `pulp_wars-mch9.7`.)
      // (An Unbound Gibbering Mass still Drags: `pulp_wars-mch9.37`.)
      expect(rule.abilities).toEqual(
        breed === "HERALD"
          ? ["ATTACK", "UNSTOPPABLE", "STRIDE"]
          : breed === "MASS"
            ? ["ATTACK", "DRAG", "STRIDE"]
            : ["ATTACK", "STRIDE"],
      );
      expect(rule.sightRadius).toBe(0);
      const mechanics = NEUTRAL_ROLE_MECHANICS_V7[breed];
      expect(mechanics.construct).toBe(true);
      // The Cult redesign (`pulp_wars-mch9.35`, section 9.1): an Unbound
      // daemon advances after a kill (it never did before), but for the
      // Gibbering Mass (`pulp_wars-mch9.37`).
      expect(mechanics.advancesAfterKill).toBe(breed !== "MASS");
      expect(mechanics.movementMode).toBe("STRIDE");
      // No bounty Coins for an Unbound daemon.
      expect(NEUTRAL_BOUNTIES_V7[breed]).toBe(0);
    }
    expect(RAMPAGE_ATTACKS_V7).toEqual({
      HORROR: 1,
      HERALD: 2,
      IMP: 1,
      MASS: 1,
    });
    // A daemon on the board keeps its mechanical role when it breaks loose.
    for (const role of BOARD_SUMMONED_ROLE_IDS_V7)
      if (CULT_SUMMONED_ROLE_RULES_V7[role].control !== null)
        expect(NEUTRAL_ROLE_RULES_V7[role as "HORROR"].role, role).toBe(
          SUMMONED_MECHANICAL_ROLES_V7[role],
        );
  });

  it("names a neutral daemon's breed from the unit itself", () => {
    const horror = {
      id: 7,
      role: "KNIGHT" as const,
      summoned: "HORROR" as const,
    };
    expect(neutralBreedOfV7({}, horror)).toBe("HORROR");
    // Without the field: by its role, and for the big body by its HP.
    expect(neutralBreedOfV7({}, { id: 7, role: "KNIGHT" })).toBe("HORROR");
    expect(neutralBreedOfV7({}, { id: 7, role: "JUGGERNAUT", maxHp: 60 })).toBe(
      "HERALD",
    );
    expect(neutralBreedOfV7({}, { id: 7, role: "JUGGERNAUT", maxHp: 24 })).toBe(
      "GIANT_SPIDER",
    );
  });

  it("adds the binding event and the daemon's kill as a Favour source", () => {
    const events = DOMAIN_EVENT_KIND_ORDER_V7 as readonly string[];
    const from = events.indexOf("DAEMON_UNBOUND");
    expect(events.slice(from, from + 2)).toEqual([
      "DAEMON_UNBOUND",
      "DAEMON_BOUND",
    ]);
    // (A consumption joined after it with `pulp_wars-mch9.7`, the trickle
    // with `pulp_wars-mch9.32`, Offerings to the Deep with
    // `pulp_wars-5ti.22`.)
    expect(FAVOUR_SOURCES_V7.slice(-4, -2)).toEqual([
      "DAEMON_KILL",
      "CONSUMPTION",
    ]);
    expect(
      parseEventV7({
        kind: "DAEMON_BOUND",
        playerId: 1,
        unitId: 9,
        strands: 1,
        control: 1,
      }).ok,
    ).toBe(true);
    // Fewer strands than the Control is no binding.
    expect(
      parseEventV7({
        kind: "DAEMON_BOUND",
        playerId: 1,
        unitId: 9,
        strands: 2,
        control: 3,
      }).ok,
    ).toBe(false);
    // The stand-in's death cause is gone.
    expect(
      parseEventV7({ kind: "UNIT_DIED", unitId: 9, cause: "UNBOUND" }).ok,
    ).toBe(false);
  });
});

describe("Unbound: the failed check (section 6.4)", () => {
  it("gives the daemon to nobody as a neutral unit of its own breed, Furious", () => {
    // Nobody channels it; its only unit in sight is four tiles away.
    const state = horrorField([{ seat: 0, role: "FIGHTER", at: at(1, 2) }]);
    const horror = unitAtV7(state, HORROR);
    const round = endTurnUntilV7(state, cultId(state));
    expect(eventsOf(round.events, "DAEMON_UNBOUND")).toEqual([
      {
        kind: "DAEMON_UNBOUND",
        unitId: horror.id,
        summonerPlayerId: cultId(state),
        strands: 0,
        control: 1,
        reason: "STRANDS",
      },
    ]);
    const loose = need(round.state.units.find((unit) => unit.id === horror.id));
    expect(loose).toMatchObject({
      ownerId: NEUTRAL_OWNER_ID_V7,
      role: horror.role,
      summoned: "HORROR",
      hp: horror.hp,
      maxHp: horror.maxHp,
      homeCityId: null,
    });
    expect(unitIsUnboundV7(loose)).toBe(true);
    expect(unitIsWildV7(loose)).toBe(true);
    expect(daemonIsBoundV7(loose)).toBe(false);
    expect(round.state.monsters).toEqual([
      {
        unitId: horror.id,
        breed: "HORROR",
        home: HORROR,
        provokedBy: [],
        unbound: { summonerPlayerId: cultId(state), furious: true },
      },
    ]);
    expect(daemonIsFuriousV7(round.state, horror.id)).toBe(true);
    // It is the neutral registration's Horror now: it attacks, and no more.
    expect(unitRoleRuleV7(round.state, loose).abilities).toEqual([
      "ATTACK",
      "STRIDE",
    ]);
    expect(unitRoleMechanicsV7(round.state, loose).construct).toBe(true);
    // The state and every event round-trip their schemas.
    expect(parseGameStateV7(JSON.parse(JSON.stringify(round.state)))).toEqual(
      round.state,
    );
    for (const event of round.events)
      expect(parseEventV7(event).ok, event.kind).toBe(true);
    // Every viewer that sees it sees who summoned it and that it is Furious.
    for (const seat of [0, 1])
      expect(viewForV7(round.state, seatIdV7(state, seat)).monsters).toEqual(
        round.state.monsters,
      );
    // Not a Loss; the seat's Army no longer counts it; no longer flawless.
    expect(ledger(round.state, cultId(state))).toMatchObject({
      lossValue: 0,
      flawless: false,
    });
    expect(scoreV7(round.state, cultId(state)).army.count).toBe(2);
  });

  it("rampages at once: it walks to the nearest unit by its Move", () => {
    const state = horrorField([{ seat: 0, role: "FIGHTER", at: at(1, 2) }]);
    const horror = unitAtV7(state, HORROR);
    const round = endTurnUntilV7(state, cultId(state));
    const index = round.events.findIndex(
      (event) => event.kind === "DAEMON_UNBOUND",
    );
    // Two steps toward it, each the first neighbour in (y, x) order that
    // shortens the walk; it ends two tiles short and attacks nobody.
    expect(round.events[index + 1]).toEqual({
      kind: "UNIT_MOVED",
      unitId: horror.id,
      path: [at(4, 1), at(3, 0)],
    });
    expect(combats(round.events)).toEqual([]);
    expect(unitAtV7(round.state, at(3, 0)).id).toBe(horror.id);
    // Inside the Cult's Start Turn: after it began, before its income.
    const started = round.events.findIndex(
      (event) =>
        event.kind === "TURN_STARTED" && event.playerId === cultId(state),
    );
    const income = round.events.findIndex(
      (event) =>
        event.kind === "INCOME_AWARDED" && event.playerId === cultId(state),
    );
    expect(started).toBeLessThan(index);
    expect(index).toBeLessThan(income);
  });

  it("attacks the unit it ends next to, and advances after the kill (worked example 16.6)", () => {
    // A wounded Initiate and the Summoner stand beside it: both the Cult's
    // cultists, both at distance 1; the fewer Hit Points decide.
    const state = horrorField([
      { seat: 0, role: "FIGHTER", at: at(5, 1), hp: 5 },
      { seat: 0, role: "CAPTAIN", at: at(6, 3) },
    ]);
    const horror = unitAtV7(state, HORROR);
    const initiate = unitAtV7(state, at(5, 1));
    const summoner = unitAtV7(state, at(6, 3));
    const round = endTurnUntilV7(state, cultId(state));
    expect(combats(round.events)).toEqual([
      expect.objectContaining({
        attackerId: horror.id,
        targetUnitId: initiate.id,
        defenderDies: true,
        // The Cult redesign (`pulp_wars-mch9.35`): it advances.
        advances: true,
      }),
    ]);
    expect(round.state.units.some((unit) => unit.id === initiate.id)).toBe(
      false,
    );
    // It stands on the Initiate's tile; the dead Initiate is the Cult's
    // Loss, and nobody's kill: no Favour, no Kills, no Plunder, no bounty.
    expect(unitAtV7(round.state, at(5, 1)).id).toBe(horror.id);
    expect(
      eventsOf(round.events, "UNIT_MOVED").filter(
        (event) => event.unitId === horror.id,
      ),
    ).toEqual([{ kind: "UNIT_MOVED", unitId: horror.id, path: [at(5, 1)] }]);
    expect(kindsV7(round.events)).not.toContain("FAVOUR_GAINED");
    expect(kindsV7(round.events)).not.toContain("MONSTER_BOUNTY_AWARDED");
    expect(ledger(round.state, cultId(state)).lossValue).toBe(2);
    for (const player of round.state.players)
      expect(ledger(round.state, player.id).killValue).toBe(0);
    // Furious: nobody may channel it for the rest of this turn.
    expect(
      rejectedV7(round.state, channel(round.state, at(6, 3), at(5, 1))),
    ).toEqual({ code: "CHANNEL_NOT_LEGAL", params: { reason: "FURIOUS" } });
    expect(offeredV7(round.state, "CHANNEL")).toEqual([]);
    // After the round it rampages again, in the neutral turn: the Summoner.
    const next = endTurnUntilV7(round.state, cultId(state));
    const kinds = kindsV7(next.events);
    const fight = next.events.findIndex(
      (event) =>
        event.kind === "COMBAT_RESOLVED" &&
        event.preview.attackerId === horror.id,
    );
    expect(kinds.indexOf("NEUTRAL_TURN_STARTED")).toBeLessThan(fight);
    expect(fight).toBeLessThan(kinds.indexOf("NEUTRAL_TURN_ENDED"));
    expect(combats(next.events)[0]).toMatchObject({
      attackerId: horror.id,
      targetUnitId: summoner.id,
    });
    // It was nobody's at that check: no second `DAEMON_UNBOUND`.
    expect(kinds).not.toContain("DAEMON_UNBOUND");
    // And it is Furious no more: the Cult's turn of the break is over.
    expect(daemonIsFuriousV7(next.state, horror.id)).toBe(false);
    expect(need(next.state.monsters[0]).unbound).toEqual({
      summonerPlayerId: cultId(state),
      furious: false,
    });
  });

  // The Cult redesign (`pulp_wars-mch9.35`, section 9.1).
  it("advances after a kill only onto a tile its walk could enter", () => {
    // A wounded Fighter on the neutral village (5, 5): the Horror walks
    // beside it and kills it, and stays off the settlement center.
    const village = looseField([
      { seat: 1, role: "FIGHTER", at: at(5, 5), hp: 3 },
    ]);
    const horror = unitAtV7(village, HORROR);
    const onCenter = endTurnUntilV7(village, cultId(village));
    expect(combats(onCenter.events)[0]).toMatchObject({
      attackerId: horror.id,
      defenderDies: true,
      advances: false,
    });
    expect(
      need(onCenter.state.units.find((unit) => unit.id === horror.id)).at,
    ).toEqual(at(4, 4)); // where its walk ended
    // The same kill on open Grass: it advances onto the tile.
    const grass = looseField([
      { seat: 1, role: "FIGHTER", at: at(6, 5), hp: 3 },
    ]);
    const onGrass = endTurnUntilV7(grass, cultId(grass));
    expect(combats(onGrass.events)[0]).toMatchObject({
      defenderDies: true,
      advances: true,
    });
    expect(
      need(onGrass.state.units.find((unit) => unit.id === horror.id)).at,
    ).toEqual(at(6, 5));
    for (const event of onGrass.events)
      expect(parseEventV7(event).ok, event.kind).toBe(true);
  });

  it("lets a bound daemon's advance carry it beyond its channeller's reach, which breaks it at the next check", () => {
    // Its one channeller is three tiles west; the Fighter it kills stands
    // east of it, so the advance leaves it four tiles from the strand.
    const state = withStrandsV7(
      horrorField([
        { seat: 0, role: "FIGHTER", at: at(2, 2) },
        { seat: 1, role: "FIGHTER", at: at(6, 2), hp: 3 },
      ]),
      HORROR,
      [at(2, 2)],
    );
    const horror = unitAtV7(state, HORROR);
    const kill = strike(state, HORROR, at(6, 2));
    expect(kill.combat).toMatchObject({ defenderDies: true, advances: true });
    expect(unitAtV7(kill.state, at(6, 2)).id).toBe(horror.id);
    const round = endTurnUntilV7(kill.state, cultId(state));
    expect(
      eventsOf(round.events, "DAEMON_UNBOUND").map((event) => event.unitId),
    ).toEqual([horror.id]);
  });

  it("loses every status when it breaks loose", () => {
    const base = horrorField(
      [
        { seat: 0, role: "FIGHTER", at: at(1, 2) },
        { seat: 1, role: "FIGHTER", at: at(1, 5) },
      ],
      { factions: ["CULT", "ICE_FOLK"], activeSeat: 1 },
    );
    const horror = unitAtV7(base, HORROR);
    // Frozen by the Ice Folk in their turn: it stays so through its own.
    const state = checkedV7({
      ...base,
      frozen: [{ unitId: horror.id, turnsLeft: 2 }],
    });
    const round = applyOkV7(state, seatIdV7(state, 1), { kind: "END_TURN" });
    expect(kindsV7(round.events)).toContain("DAEMON_UNBOUND");
    expect(round.state.frozen).toEqual([]);
    // A neutral unit takes no status: it cannot be Frozen again.
    const loose = need(round.state.units.find((unit) => unit.id === horror.id));
    expect(canBeFrozenV7(round.state, seatIdV7(state, 1), loose)).toBe(false);
    // Free of the ice, it walked at once.
    expect(
      eventsOf(round.events, "UNIT_MOVED").some(
        (event) => event.unitId === horror.id,
      ),
    ).toBe(true);
  });

  it("besieges nothing from the moment it breaks loose on a center", () => {
    // A bound Horror on the Human capital besieges it.
    const state = horrorField(
      [{ seat: 1, role: "FIGHTER", at: at(2, 5) }],
      {},
      {},
      at(2, 8),
    );
    const horror = unitAtV7(state, at(2, 8));
    const city = need(
      state.cities.find((candidate) => candidate.ownerId === humanId(state)),
    );
    expect(isCityBesiegedV7(state, city)).toBe(true);
    const round = endTurnUntilV7(state, cultId(state));
    expect(kindsV7(round.events)).toContain("DAEMON_UNBOUND");
    // It steps off at its first move, toward the Fighter, attacks it, and
    // (the Cult redesign, `pulp_wars-mch9.35`) advances onto its tile.
    const loose = need(round.state.units.find((unit) => unit.id === horror.id));
    expect(loose.at).toEqual(at(2, 5));
    expect(isCityBesiegedV7(round.state, city)).toBe(false);
    expect(combats(round.events)[0]).toMatchObject({ attackerId: horror.id });
    // A neutral unit on a center besieges nothing either.
    const stuck = withUnboundV7(horrorField([], {}, {}, at(2, 8)), at(2, 8), 0);
    expect(isCityBesiegedV7(stuck, city)).toBe(false);
  });

  it("lets one break start another: the rampage's hurt breaks strands before the next check", () => {
    // Horror A (the lower ID) has no strand. The Idol Bearer beside it
    // channels Horror B alone. (A Chosen until the Cult redesign retired it,
    // `pulp_wars-mch9.31`: the Idol Bearer is the robed body a Horror's hit
    // does not kill.)
    const pieces: GoblinPieceV7[] = [{ seat: 0, role: "GUARD", at: at(5, 2) }];
    const state = withStrandsV7(
      withHorrorV7(withHorrorV7(cultFieldV7(pieces), 0, at(4, 2)), 0, at(7, 2)),
      at(7, 2),
      [at(5, 2)],
    );
    const first = unitAtV7(state, at(4, 2));
    const second = unitAtV7(state, at(7, 2));
    const chosen = unitAtV7(state, at(5, 2));
    expect(first.id).toBeLessThan(second.id);
    const round = endTurnUntilV7(state, cultId(state));
    // A breaks, hits the Idol Bearer (which lives), and so B's strand
    // snaps: B breaks in the same check and goes for it too.
    expect(
      eventsOf(round.events, "DAEMON_UNBOUND").map((event) => event.unitId),
    ).toEqual([first.id, second.id]);
    const kinds = round.events.map((event) =>
      event.kind === "DAEMON_UNBOUND"
        ? `UNBOUND:${event.unitId}`
        : event.kind === "STRAND_BROKEN"
          ? `BROKEN:${event.unitId}:${event.cause}`
          : event.kind === "COMBAT_RESOLVED"
            ? `FIGHT:${event.preview.attackerId}`
            : null,
    );
    expect(kinds.filter((kind) => kind !== null)).toEqual([
      `UNBOUND:${first.id}`,
      `FIGHT:${first.id}`,
      `BROKEN:${chosen.id}:HP_LOSS`,
      `UNBOUND:${second.id}`,
      `FIGHT:${second.id}`,
    ]);
    expect(
      round.state.units
        .filter((unit) => unit.summoned !== undefined)
        .map((unit) => unit.ownerId),
    ).toEqual([NEUTRAL_OWNER_ID_V7, NEUTRAL_OWNER_ID_V7]);
    // A wild unit's attacks pay nobody (rule 4).
    expect(favourOfV7(round.state, cultId(state))).toBe(0);
    expect(round.state.cult.strands).toEqual([]);
  });

  it("does not check a daemon an earlier rampage killed", () => {
    // Horror A breaks and attacks Horror B (bound, with one Hit Point and a
    // strand): B dies before its own check.
    const state = withStrandsV7(
      withHorrorV7(
        withHorrorV7(
          cultFieldV7([{ seat: 0, role: "FIGHTER", at: at(8, 2) }]),
          0,
          at(4, 2),
        ),
        0,
        at(5, 2),
        { hp: 1 },
      ),
      at(5, 2),
      [at(8, 2)],
    );
    const first = unitAtV7(state, at(4, 2));
    const second = unitAtV7(state, at(5, 2));
    const round = endTurnUntilV7(state, cultId(state));
    expect(
      eventsOf(round.events, "DAEMON_UNBOUND").map((event) => event.unitId),
    ).toEqual([first.id]);
    expect(round.state.units.some((unit) => unit.id === second.id)).toBe(false);
    // The dead daemon was the Cult's: its value is a Loss.
    expect(ledger(round.state, cultId(state)).lossValue).toBe(6);
  });
});

describe("Unbound: whom a rampage goes for (section 6.4, rule 1; the Cult redesign, section 9.2)", () => {
  // The roster: seat 0 is the Cult (a `FIGHTER` is a robed Initiate),
  // seat 1 the Humans (a `FIGHTER` is a Fighter).
  const roster = cultFieldV7([]);
  const CULT = cultId(roster);
  const HUMAN = humanId(roster);
  const facts = (
    id: number,
    ownerId: PlayerId,
    where: CoordV7,
    hp = 10,
    form: RampageUnitFactsV7["form"] = "LAND",
    extra: Partial<RampageUnitFactsV7> = {},
  ): RampageUnitFactsV7 => ({
    id: unitId(id),
    ownerId,
    role: "FIGHTER",
    form,
    at: where,
    hp,
    ...extra,
  });
  const cultist = (id: number, where: CoordV7, hp = 7) =>
    facts(id, CULT, where, hp);
  const soldier = (id: number, where: CoordV7, hp = 10) =>
    facts(id, HUMAN, where, hp, "LAND", { role: "KNIGHT" });
  const summon = (id: number, where: CoordV7, hp = 18) =>
    facts(id, CULT, where, hp, "LAND", { role: "KNIGHT", summoned: "HORROR" });
  const daemon = { id: unitId(99) };
  const from = at(5, 5);
  // A Horror's reach: its Move 2, + 1.
  const REACH = 3;
  const choose = (
    units: readonly RampageUnitFactsV7[],
    summoner: PlayerId = HUMAN,
    maximumDistance?: number,
  ) =>
    rampageChoiceV7(
      roster,
      units,
      daemon,
      from,
      summoner,
      REACH,
      maximumDistance,
    );

  it("goes first for a robed cultist within 2, over a nearer soldier", () => {
    const initiate = cultist(1, at(5, 7));
    const knight = soldier(2, at(5, 6));
    expect(choose([initiate, knight])).toEqual({ target: initiate, step: 1 });
    expect(UNBOUND_CULTIST_REACH_V7).toBe(2);
  });

  it("treats a cultist beyond 2 as anyone: the nearest non-summon in reach", () => {
    const initiate = cultist(1, at(5, 8));
    const knight = soldier(2, at(7, 5));
    expect(choose([initiate, knight])).toEqual({ target: knight, step: 2 });
    // At the same distance the ties decide (here the Knight's fewer HP).
    const hurt = soldier(3, at(8, 5), 5);
    expect(choose([initiate, hurt])).toEqual({ target: hurt, step: 2 });
  });

  it("goes for a summon in reach only when nobody else is in reach", () => {
    const horror = summon(1, at(5, 6));
    const fighter = soldier(2, at(5, 10));
    expect(choose([horror, fighter])).toEqual({ target: horror, step: 3 });
    // A soldier in reach comes before the summon beside it.
    const near = soldier(3, at(5, 8));
    expect(choose([horror, fighter, near])).toEqual({
      target: near,
      step: 2,
    });
  });

  it("walks toward the nearest non-summon when nobody is in reach, a summon only when there is nobody else", () => {
    const horror = summon(1, at(5, 9));
    const fighter = soldier(2, at(5, 10));
    expect(choose([horror, fighter])).toEqual({ target: fighter, step: 4 });
    expect(choose([horror])).toEqual({ target: horror, step: 4 });
    expect(choose([])).toEqual({ target: null, step: null });
    expect(rampageTargetV7(roster, [], daemon, from, HUMAN, REACH)).toBeNull();
  });

  it("breaks a tie for the seat that summoned it, then the fewest HP, then the lowest ID", () => {
    const enemy = facts(1, HUMAN, at(5, 3), 1);
    const own = facts(8, CULT, at(7, 5), 9, "LAND", { role: "KNIGHT" });
    const ownWeak = facts(9, CULT, at(3, 5), 4, "LAND", { role: "KNIGHT" });
    const ownWeakToo = facts(7, CULT, at(5, 7), 4, "LAND", { role: "KNIGHT" });
    const pick = (units: readonly RampageUnitFactsV7[]) =>
      rampageTargetV7(roster, units, daemon, from, CULT, REACH);
    // The summoner's own units come first, however weak the enemy is.
    expect(pick([enemy, own])).toBe(own);
    expect(pick([enemy, own, ownWeak])).toBe(ownWeak);
    expect(pick([enemy, own, ownWeak, ownWeakToo])).toBe(ownWeakToo);
    // Nearer always wins.
    const adjacent = facts(20, HUMAN, at(5, 4), 30);
    expect(pick([enemy, own, ownWeak, adjacent])).toBe(adjacent);
  });

  it("chooses the Herald's second attack by steps 1 to 3 among the units beside it", () => {
    const initiate = cultist(1, at(4, 4));
    const knight = soldier(2, at(6, 6), 3);
    const horror = summon(3, at(5, 4), 1);
    const far = cultist(4, at(5, 7));
    expect(choose([horror, knight, initiate, far], HUMAN, 1)).toEqual({
      target: initiate,
      step: 1,
    });
    expect(choose([horror, knight, far], HUMAN, 1)).toEqual({
      target: knight,
      step: 2,
    });
    expect(choose([horror, far], HUMAN, 1)).toEqual({
      target: horror,
      step: 3,
    });
    // Nobody beside it: no second attack, and no walk.
    expect(choose([far], HUMAN, 1)).toEqual({ target: null, step: null });
  });

  it("never goes for a neutral, an afloat, or a dead unit, or itself; an Egg is a unit", () => {
    const egg = facts(5, HUMAN, at(5, 8), 6, "EGG");
    const units = [
      facts(1, NEUTRAL_OWNER_ID_V7, at(5, 4)),
      facts(2, HUMAN, at(5, 6), 10, "NAVAL"),
      facts(3, HUMAN, at(4, 5), 10, "EMBARKED"),
      facts(4, HUMAN, at(6, 5), 0),
      { ...facts(99, HUMAN, at(5, 5)) },
      egg,
    ];
    expect(units.map(rampageTargetableV7)).toEqual([
      false,
      false,
      false,
      false,
      true,
      true,
    ]);
    expect(rampageTargetV7(roster, units, daemon, from, HUMAN, REACH)).toBe(
      egg,
    );
    // The Herald's second attack: only a unit next to it.
    expect(
      rampageTargetV7(roster, units, daemon, from, HUMAN, REACH, 1),
    ).toBeNull();
  });
});

describe("Unbound: the rampage's walk (section 6.4, rules 2 and 3)", () => {
  /** A board of `rows` (`.` free, `#` closed, `?` unexplored). */
  const board = (rows: readonly string[]): RampageBoardV7 => ({
    width: need(rows[0]).length,
    height: rows.length,
    tile: (where) => {
      const cell = rows[where.y]?.[where.x];
      return cell === "." ? "FREE" : cell === "?" ? "UNKNOWN" : "BLOCKED";
    },
  });
  const roster = cultFieldV7([]);
  const target = (where: CoordV7): RampageUnitFactsV7 => ({
    id: unitId(2),
    ownerId: humanId(roster),
    role: "KNIGHT",
    form: "LAND",
    at: where,
    hp: 10,
  });
  const daemon = (where: CoordV7) => ({ id: unitId(1), at: where });
  const plan = (
    rows: readonly string[],
    from: CoordV7,
    to: CoordV7,
    move = 2,
  ) =>
    rampagePlanV7(
      board(rows),
      roster,
      [target(to)],
      daemon(from),
      move,
      humanId(roster),
    );

  it("stays and attacks a unit beside it", () => {
    expect(plan([".....", ".....", "....."], at(1, 1), at(2, 1))).toMatchObject(
      {
        path: [],
        attacks: true,
      },
    );
  });

  it("stops as soon as it stands next to its target", () => {
    // Two tiles away: one step is enough, the first neighbour in (y, x).
    expect(plan([".....", ".....", "....."], at(0, 1), at(2, 1))).toMatchObject(
      { path: [at(1, 0)], attacks: true },
    );
  });

  it("walks the shortest way round what it cannot stand on", () => {
    // A wall with one gap at the bottom: the straight line is closed.
    const rows = [".#...", ".#...", ".#...", "....."];
    const walked = plan(rows, at(0, 0), at(3, 0), 5);
    expect(walked.path).toEqual([
      at(0, 1),
      at(0, 2),
      at(1, 3),
      at(2, 2),
      at(2, 1),
    ]);
    expect(walked.attacks).toBe(true);
    // One step short of that, it does not reach its target.
    expect(plan(rows, at(0, 0), at(3, 0), 4)).toMatchObject({
      path: walked.path.slice(0, 4),
      attacks: false,
    });
    // With its Move of 2 it gets two steps of that walk.
    expect(plan(rows, at(0, 0), at(3, 0)).path).toEqual([at(0, 1), at(0, 2)]);
  });

  it("with no way through, goes as near as it can, or stays", () => {
    // Water all the way down: the nearest tile on its own side (three are
    // as near; the first in (y, x) order).
    const rows = ["..#..", "..#..", "..#.."];
    expect(plan(rows, at(0, 1), at(4, 1))).toMatchObject({
      path: [at(1, 0)],
      attacks: false,
    });
    // Already as near as it can get: it does not move.
    expect(plan(rows, at(1, 1), at(4, 1))).toMatchObject({
      path: [],
      attacks: false,
    });
    // A tile the viewer has not explored is closed to a preview.
    expect(plan(["..?..", "..?..", "..?.."], at(1, 1), at(4, 1)).path).toEqual(
      [],
    );
  });

  it("never stands on a center, a chest, a curiosity, water, a unit, or a Barricade", () => {
    const base = looseField(
      [
        { seat: 1, role: "FIGHTER", at: at(4, 4) },
        { seat: 1, role: "PATROL_BOAT", at: at(1, 1), form: "NAVAL" },
      ],
      { water: [at(1, 1), at(2, 1)] },
    );
    const state = checkedV7({ ...base, treasureChests: [at(6, 4)] });
    const horror = unitAtV7(state, HORROR);
    const tiles = rampageBoardV7(state, horror.id);
    expect(tiles.tile(at(4, 3))).toBe("FREE");
    // The village on (5, 5), the Cult's capital, a chest, water, a unit,
    // and off the board.
    for (const closed of [
      at(5, 5),
      at(8, 8),
      at(6, 4),
      at(2, 1),
      at(4, 4),
      at(-1, 0),
      at(11, 3),
    ])
      expect(tiles.tile(closed), `${closed.x},${closed.y}`).toBe("BLOCKED");
    // Its own tile does not block itself.
    expect(tiles.tile(HORROR)).toBe("FREE");
    // It never goes for the ship.
    const round = endTurnUntilV7(state, cultId(state));
    expect(combats(round.events)[0]).toMatchObject({
      attackerId: horror.id,
      targetUnitId: unitAtV7(state, at(4, 4)).id,
    });
  });
});

describe("Unbound: the neutral turn (sections 6.4 and 13.3)", () => {
  it("rampages after every round, for as long as it lives, and never mends", () => {
    const state = looseField(
      [
        { seat: 1, role: "GUARD", at: at(5, 1) },
        { seat: 0, role: "FIGHTER", at: at(9, 2) },
      ],
      {},
      false,
      { hp: 12 },
    );
    const horror = unitAtV7(state, HORROR);
    const guard = unitAtV7(state, at(5, 1));
    let current = state;
    const hits: number[] = [];
    for (let round = 0; round < 2; round += 1) {
      const next = endTurnUntilV7(current, cultId(state));
      const fights = combats(next.events).filter(
        (preview) => preview.attackerId === horror.id,
      );
      expect(fights).toHaveLength(1);
      expect(need(fights[0]).targetUnitId).toBe(guard.id);
      hits.push(need(fights[0]).damageToAttacker);
      // No check of a seat touches it, and nothing heals it.
      expect(kindsV7(next.events)).not.toContain("DAEMON_UNBOUND");
      expect(kindsV7(next.events)).not.toContain("MONSTER_REGENERATED");
      current = next.state;
      if (!current.units.some((unit) => unit.id === guard.id)) break;
    }
    const after = current.units.find((unit) => unit.id === horror.id);
    expect(after?.hp ?? 0).toBe(
      Math.max(0, 12 - hits.reduce((sum, hit) => sum + hit, 0)),
    );
  });

  it("gives the Herald two attacks in a rampage, the second from the tile it advanced to", () => {
    // The Herald is summoned from E5; its breed rampages already.
    const state = withUnboundHeraldV7(
      cultFieldV7([
        { seat: 1, role: "FIGHTER", at: at(4, 2) },
        { seat: 1, role: "FIGHTER", at: at(6, 2), hp: 3 },
        { seat: 1, role: "FIGHTER", at: at(6, 1) },
        { seat: 0, role: "FIGHTER", at: at(8, 4) },
      ]),
      HORROR,
      0,
    );
    const herald = unitAtV7(state, HORROR);
    const round = endTurnUntilV7(state, cultId(state));
    // The weaker Fighter first; it dies and the Herald advances onto its
    // tile (the Cult redesign, `pulp_wars-mch9.35`), so its second attack
    // is on a unit beside (6, 2): the Fighter on (6, 1), not the one on
    // (4, 2), which is no longer beside it.
    expect(
      combats(round.events).map((preview) => [
        preview.attackerId,
        preview.targetUnitId,
      ]),
    ).toEqual([
      [herald.id, unitAtV7(state, at(6, 2)).id],
      [herald.id, unitAtV7(state, at(6, 1)).id],
    ]);
    expect(
      need(round.state.units.find((unit) => unit.id === herald.id)).activation
        .attacksUsed,
    ).toBe(2);
    expect(parseGameStateV7(JSON.parse(JSON.stringify(round.state)))).toEqual(
      round.state,
    );
    // A seat can command a Herald (`pulp_wars-mch9.7`), so a cultist within
    // 3 tiles may channel the Unbound one. One strand of the three it
    // needs binds nothing: the Herald stays nobody's.
    // Both kills advanced it: it stands on the second Fighter's tile.
    expect(
      need(round.state.units.find((unit) => unit.id === herald.id)).at,
    ).toEqual(at(6, 1));
    const cultist = unitAtV7(round.state, at(8, 4));
    const strand = playV7(round.state, {
      kind: "CHANNEL",
      unitId: cultist.id,
      daemonUnitId: herald.id,
    });
    expect(kindsV7(strand.events)).toEqual(["STRAND_FORMED"]);
    expect(strand.state.cult.strands).toEqual([
      { cultistUnitId: cultist.id, daemonUnitId: herald.id },
    ]);
    expect(
      need(strand.state.units.find((unit) => unit.id === herald.id)).ownerId,
    ).toBe(NEUTRAL_OWNER_ID_V7);
  });

  it("is immune to Freeze, Mind Control's taking, and a Push, like every neutral unit", () => {
    const state = looseField([{ seat: 1, role: "JUGGERNAUT", at: at(4, 2) }], {
      activeSeat: 1,
    });
    const horror = unitAtV7(state, HORROR);
    expect(canBeFrozenV7(state, humanId(state), horror)).toBe(false);
    expect(
      calculateCombatPreviewV7(state, unitAtV7(state, at(4, 2)).id, horror.id)
        .push,
    ).toBe("BLOCKED");
  });
});

describe("Unbound: Bind again and Furious (section 6.5)", () => {
  it("binds an Unbound daemon the moment the turn's strands reach its Control", () => {
    // An Initiate three tiles from it.
    const state = looseField([{ seat: 0, role: "FIGHTER", at: at(6, 5) }]);
    const horror = unitAtV7(state, HORROR);
    const initiate = unitAtV7(state, at(6, 5));
    const view = viewForV7(state, cultId(state));
    expect(previewChannelV7(view, initiate.id, horror.id)).toEqual({
      unitId: initiate.id,
      daemonUnitId: horror.id,
      role: "HORROR",
      control: 1,
      strandsBefore: 0,
      strandsAfter: 1,
      holds: true,
      binds: true,
      brood: [],
    });
    const bound = playV7(state, channel(state, at(6, 5), HORROR));
    expect(bound.events).toEqual([
      {
        kind: "STRAND_FORMED",
        playerId: cultId(state),
        unitId: initiate.id,
        daemonUnitId: horror.id,
      },
      {
        kind: "DAEMON_BOUND",
        playerId: cultId(state),
        unitId: horror.id,
        strands: 1,
        control: 1,
      },
    ]);
    const held = unitAtV7(bound.state, HORROR);
    expect(held.ownerId).toBe(cultId(state));
    expect(daemonIsBoundV7(held)).toBe(true);
    expect(bound.state.monsters).toEqual([]);
    // Exhausted until the next turn.
    expect(
      offeredV7(bound.state).filter(
        (command) => "unitId" in command && command.unitId === horror.id,
      ),
    ).toEqual([]);
    // The strand stays and counts for the next check: it holds.
    expect(bound.state.cult.strands).toEqual([
      { cultistUnitId: initiate.id, daemonUnitId: horror.id },
    ]);
    const round = endTurnUntilV7(bound.state, cultId(state));
    expect(kindsV7(round.events)).not.toContain("DAEMON_UNBOUND");
    expect(unitAtV7(round.state, HORROR).ownerId).toBe(cultId(state));
    // It is the seat's Army again.
    expect(scoreV7(bound.state, cultId(state)).army.count).toBe(
      scoreV7(state, cultId(state)).army.count + 6,
    );
  });

  it("is refused while the daemon is Furious, out of reach, or out of sight", () => {
    const furious = looseField(
      [{ seat: 0, role: "FIGHTER", at: at(6, 5) }],
      {},
      true,
    );
    expect(rejectedV7(furious, channel(furious, at(6, 5), HORROR))).toEqual({
      code: "CHANNEL_NOT_LEGAL",
      params: { reason: "FURIOUS" },
    });
    expect(
      previewChannelV7(
        viewForV7(furious, cultId(furious)),
        unitAtV7(furious, at(6, 5)).id,
        unitAtV7(furious, HORROR).id,
      ),
    ).toBeNull();
    const far = looseField([{ seat: 0, role: "FIGHTER", at: at(5, 6) }]);
    expect(rejectedV7(far, channel(far, at(5, 6), HORROR))).toEqual({
      code: "CHANNEL_NOT_LEGAL",
      params: { reason: "RANGE" },
    });
    // A daemon on a tile the seat has not explored is not in its view.
    const hidden = unexploreV7(
      looseField([{ seat: 0, role: "FIGHTER", at: at(6, 5) }]),
      0,
      [HORROR],
    );
    expect(rejectedV7(hidden, channel(hidden, at(6, 5), HORROR))).toEqual({
      code: "CHANNEL_NOT_LEGAL",
      params: { reason: "DAEMON" },
    });
  });

  it("lets any Cult seat bind it: a daemon can change lodges", () => {
    const state = withUnboundV7(
      withHorrorV7(
        cultFieldV7([{ seat: 1, role: "FIGHTER", at: at(6, 5) }], {
          factions: ["CULT", "CULT"],
          activeSeat: 1,
        }),
        0,
        HORROR,
      ),
      HORROR,
      0,
    );
    const horror = unitAtV7(state, HORROR);
    const bound = playV7(state, channel(state, at(6, 5), HORROR));
    expect(eventsOf(bound.events, "DAEMON_BOUND")[0]).toMatchObject({
      playerId: seatIdV7(state, 1),
      unitId: horror.id,
    });
    expect(unitAtV7(bound.state, HORROR).ownerId).toBe(seatIdV7(state, 1));
    // It is the new lodge's to lose: when it breaks again, that seat is
    // its summoner.
    const loose = checkedV7({
      ...bound.state,
      cult: { ...bound.state.cult, strands: [] },
    });
    const round = endTurnUntilV7(loose, seatIdV7(state, 1));
    expect(eventsOf(round.events, "DAEMON_UNBOUND")[0]).toMatchObject({
      unitId: horror.id,
      summonerPlayerId: seatIdV7(state, 1),
    });
  });

  it("counts a gripped strand as three toward a binding", () => {
    // A Herald needs three; a Thing beside the one channeller gives them.
    const state = withGripV7(
      (() => {
        const base = withUnboundHeraldV7(
          cultFieldV7([
            { seat: 0, role: "FIGHTER", at: at(5, 4) },
            { seat: 0, role: "JUGGERNAUT", at: at(6, 4) },
            { seat: 0, role: "GUARD", at: at(1, 1) },
          ]),
          HORROR,
          0,
        );
        return checkedV7({
          ...base,
          cult: {
            ...base.cult,
            strands: [
              {
                cultistUnitId: unitAtV7(base, at(5, 4)).id,
                daemonUnitId: unitAtV7(base, HORROR).id,
              },
            ],
          },
        });
      })(),
      at(6, 4),
      at(5, 4),
    );
    const herald = unitAtV7(state, HORROR);
    expect(bindingStrandsV7(state, state.units, herald, cultId(state))).toBe(3);
    // Another seat's strands are not this seat's.
    expect(bindingStrandsV7(state, state.units, herald, humanId(state))).toBe(
      0,
    );
    expect(
      previewRampageV7(viewForV7(state, cultId(state)), herald.id),
    ).toMatchObject({ unbound: true, control: 3, strands: 3, attackCount: 2 });
  });
});

describe("Unbound: kills, Favour, and the Score (sections 6.4, 8.2, and 8.3)", () => {
  it("pays the victim's value for a bound daemon's kill, by attack or by retaliation", () => {
    const state = horrorField([{ seat: 1, role: "FIGHTER", at: at(5, 1) }]);
    const fighter = unitAtV7(state, at(5, 1));
    expect(daemonKillFavourV7(state, unitAtV7(state, HORROR), fighter)).toBe(
      unitFavourValueV7(state, fighter),
    );
    const run = attackV7(state, HORROR, at(5, 1));
    expect(run.combat.defenderDies).toBe(true);
    expect(eventsOf(run.events, "FAVOUR_GAINED")).toEqual([
      {
        kind: "FAVOUR_GAINED",
        playerId: cultId(state),
        source: "DAEMON_KILL",
        amount: 2,
        forfeited: 0,
        favour: 2,
      },
    ]);
    expect(favourOfV7(run.state, cultId(state))).toBe(2);
    // Public, like every Favour gain.
    expect(
      projectEventsV7(state, run.state, humanId(state), run.events).events.some(
        (event) => event.kind === "FAVOUR_GAINED",
      ),
    ).toBe(true);
    // A Knight that attacks it at one Hit Point dies of the answer.
    const answer = horrorField(
      [{ seat: 1, role: "KNIGHT", at: at(5, 1), hp: 1 }],
      { activeSeat: 1 },
    );
    const struck = attackV7(answer, at(5, 1), HORROR);
    expect(struck.combat.attackerDies).toBe(true);
    expect(eventsOf(struck.events, "FAVOUR_GAINED")).toEqual([
      expect.objectContaining({ source: "DAEMON_KILL", amount: 9, favour: 9 }),
    ]);
  });

  it("pays a neutral monster's bounty value, and its bounty Coins to the seat", () => {
    const arena = round2ArenaV7({
      factions: ["CULT", "ORIGINAL"],
      neutrals: [{ breed: "GIANT_SPIDER", home: at(10, 10), hp: 1 }],
    });
    const state = withHorrorV7(arena, 0, at(9, 10));
    const cult = round2SeatV7(state, 0);
    const coins = need(
      state.players.find((player) => player.id === cult),
    ).coins;
    const run = strike(state, at(9, 10), at(10, 10));
    expect(run.combat.defenderDies).toBe(true);
    expect(eventsOf(run.events, "FAVOUR_GAINED")).toEqual([
      expect.objectContaining({ source: "DAEMON_KILL", amount: 10 }),
    ]);
    expect(eventsOf(run.events, "MONSTER_BOUNTY_AWARDED")).toEqual([
      expect.objectContaining({ playerId: cult, coins: 10 }),
    ]);
    expect(
      need(run.state.players.find((player) => player.id === cult)).coins,
    ).toBe(coins + 10);
  });

  it("pays nothing for a daemon, bound or Unbound, of any seat", () => {
    // Another Cult seat's bound Horror at one Hit Point.
    const rival = withHorrorV7(
      horrorField([], { factions: ["CULT", "CULT"] }),
      1,
      at(5, 1),
      { hp: 1 },
    );
    const run = attackV7(rival, HORROR, at(5, 1));
    expect(run.combat.defenderDies).toBe(true);
    expect(kindsV7(run.events)).not.toContain("FAVOUR_GAINED");
    // It is a kill of a hostile unit at its value all the same.
    expect(ledger(run.state, cultId(rival)).killValue).toBe(6);
    expect(ledger(run.state, seatIdV7(rival, 1)).lossValue).toBe(6);
    expect(
      daemonKillFavourV7(
        rival,
        unitAtV7(rival, HORROR),
        unitAtV7(rival, at(5, 1)),
      ),
    ).toBe(0);
  });

  it("makes killing an Unbound daemon a kill at its value with no bounty, except for its summoner", () => {
    // The Human's Knight kills the Cult's former Horror.
    const state = withUnboundV7(
      horrorField(
        [{ seat: 1, role: "KNIGHT", at: at(5, 1) }],
        { activeSeat: 1 },
        { hp: 1 },
      ),
      HORROR,
      0,
    );
    const coins = need(
      state.players.find((player) => player.id === humanId(state)),
    ).coins;
    const run = strike(state, at(5, 1), HORROR);
    expect(run.combat.defenderDies).toBe(true);
    expect(kindsV7(run.events)).not.toContain("MONSTER_BOUNTY_AWARDED");
    expect(ledger(run.state, humanId(state)).killValue).toBe(6);
    expect(
      need(run.state.players.find((player) => player.id === humanId(state)))
        .coins,
    ).toBe(coins);
    expect(run.state.monsters).toEqual([]);
    // No Loss for the summoner: it was nobody's.
    expect(ledger(run.state, cultId(state)).lossValue).toBe(0);
    // The seat that summoned it gets no Kills and no Favour for it: not
    // with an Idol Bearer, and not with another daemon of its own.
    for (const role of ["GUARD", "HORROR"] as const) {
      const base =
        role === "HORROR"
          ? withHorrorV7(horrorField([], {}, { hp: 1 }), 0, at(5, 1))
          : horrorField([{ seat: 0, role, at: at(5, 1) }], {}, { hp: 1 });
      const own = withUnboundV7(base, HORROR, 0);
      const kill = strike(own, at(5, 1), HORROR);
      expect(kill.combat.defenderDies, role).toBe(true);
      expect(ledger(kill.state, cultId(own)).killValue, role).toBe(0);
      expect(kindsV7(kill.events), role).not.toContain("FAVOUR_GAINED");
      expect(kindsV7(kill.events), role).not.toContain(
        "MONSTER_BOUNTY_AWARDED",
      );
    }
  });
});

describe("Unbound: elimination (section 13.1)", () => {
  it("lets an eliminated Cult seat's bound daemons loose, and leaves its Unbound ones", () => {
    const base = withHorrorV7(
      horrorField(
        [
          { seat: 1, role: "FIGHTER", at: at(8, 8), captureEligible: true },
          { seat: 0, role: "FIGHTER", at: at(5, 3) },
        ],
        { activeSeat: 1 },
      ),
      0,
      at(1, 2),
    );
    // One bound and channelled, one Unbound already.
    const state = withStrandsV7(withUnboundV7(base, at(1, 2), 0), HORROR, [
      at(5, 3),
    ]);
    const bound = unitAtV7(state, HORROR);
    const loose = unitAtV7(state, at(1, 2));
    const result = applyOkV7(state, humanId(state), {
      kind: "CAPTURE",
      unitId: unitAtV7(state, at(8, 8)).id,
    });
    expect(kindsV7(result.events)).toContain("PLAYER_ELIMINATED");
    expect(eventsOf(result.events, "DAEMON_UNBOUND")).toEqual([
      {
        kind: "DAEMON_UNBOUND",
        unitId: bound.id,
        summonerPlayerId: cultId(state),
        strands: 0,
        control: 1,
        reason: "ELIMINATED",
      },
    ]);
    // Its cultist is removed with the seat; both daemons stay.
    expect(eventsOf(result.events, "UNIT_DIED")).toEqual([
      {
        kind: "UNIT_DIED",
        unitId: unitAtV7(state, at(5, 3)).id,
        cause: "ELIMINATION",
      },
    ]);
    expect(
      result.state.units
        .filter((unit) => unit.summoned !== undefined)
        .map((unit) => [unit.id, unit.ownerId]),
    ).toEqual([
      [bound.id, NEUTRAL_OWNER_ID_V7],
      [loose.id, NEUTRAL_OWNER_ID_V7],
    ]);
    // Not Furious: no Start Turn check broke it.
    expect(result.state.monsters.map((entry) => entry.unbound)).toEqual([
      { summonerPlayerId: cultId(state), furious: false },
      { summonerPlayerId: cultId(state), furious: false },
    ]);
    expect(result.state.cult).toEqual({
      favour: [],
      strands: [],
      grips: [],
      rituals: [],
      cowed: [],
      frogs: [],
      hexCooldowns: [],
      tentacles: [],
    });
    expect(parseGameStateV7(JSON.parse(JSON.stringify(result.state)))).toEqual(
      result.state,
    );
  });
});

describe("Unbound: the public previews and the eye mark (section 6.4)", () => {
  it("previews an Unbound daemon's next rampage", () => {
    const state = looseField([
      { seat: 1, role: "FIGHTER", at: at(8, 2) },
      { seat: 0, role: "FIGHTER", at: at(2, 2) },
    ]);
    const horror = unitAtV7(state, HORROR);
    for (const seat of [0, 1]) {
      const view = viewForV7(state, seatIdV7(state, seat));
      // Both are three tiles away: the tie goes to its summoner's unit.
      expect(previewRampageV7(view, horror.id)).toEqual({
        unitId: horror.id,
        role: "HORROR",
        unbound: true,
        summonerPlayerId: cultId(state),
        furious: false,
        control: 1,
        strands: 0,
        short: false,
        targetUnitId: unitAtV7(state, at(2, 2)).id,
        // Neither is a cultist within 2: anyone in reach (`pulp_wars-mch9.35`).
        step: 2,
        path: [at(4, 1), at(3, 1)],
        attacks: true,
        attackCount: 1,
        exact: true,
      });
    }
    // It equals what the neutral turn does.
    const round = endTurnUntilV7(state, cultId(state));
    expect(
      eventsOf(round.events, "UNIT_MOVED").find(
        (event) => event.unitId === horror.id,
      )?.path,
    ).toEqual([at(4, 1), at(3, 1)]);
    expect(combats(round.events)[0]).toMatchObject({
      attackerId: horror.id,
      targetUnitId: unitAtV7(state, at(2, 2)).id,
    });
    // No preview for a unit that is no daemon.
    expect(
      previewRampageV7(
        viewForV7(state, cultId(state)),
        unitAtV7(state, at(2, 2)).id,
      ),
    ).toBeNull();
  });

  it("previews what a bound daemon would do if it broke now", () => {
    const state = withStrandsV7(
      horrorField([
        { seat: 0, role: "FIGHTER", at: at(5, 4) },
        { seat: 1, role: "FIGHTER", at: at(5, 1) },
      ]),
      HORROR,
      [at(5, 4)],
    );
    const horror = unitAtV7(state, HORROR);
    const view = viewForV7(state, humanId(state));
    // The Cult redesign (`pulp_wars-mch9.35`): its own channeller two tiles
    // off comes before the Fighter beside it (a cultist within 2).
    expect(previewRampageV7(view, horror.id)).toMatchObject({
      unbound: false,
      summonerPlayerId: cultId(state),
      strands: 1,
      short: false,
      targetUnitId: unitAtV7(state, at(5, 4)).id,
      step: 1,
      attacks: true,
    });
    // Short of its Control, the mark is the warning of section 6.4.
    const short = horrorField([{ seat: 1, role: "FIGHTER", at: at(5, 1) }]);
    expect(
      previewRampageV7(
        viewForV7(short, cultId(short)),
        unitAtV7(short, HORROR).id,
      ),
    ).toMatchObject({ short: true, strands: 0, control: 1 });
  });

  it("says when a hidden unit could change the choice", () => {
    const state = unexploreV7(
      looseField([{ seat: 1, role: "FIGHTER", at: at(8, 2) }]),
      1,
      [at(4, 2)],
    );
    const horror = unitAtV7(state, HORROR);
    expect(
      previewRampageV7(viewForV7(state, humanId(state)), horror.id)?.exact,
    ).toBe(false);
    expect(
      previewRampageV7(viewForV7(state, cultId(state)), horror.id)?.exact,
    ).toBe(true);
  });

  it("gives a daemon the neutral preview the board and the AI read", () => {
    const state = looseField([
      { seat: 1, role: "FIGHTER", at: at(5, 1) },
      { seat: 1, role: "FIGHTER", at: at(9, 2) },
    ]);
    const horror = unitAtV7(state, HORROR);
    const preview = need(
      previewMonsterV7(viewForV7(state, humanId(state)), horror.id),
    );
    expect(preview).toMatchObject({
      breed: "HORROR",
      area: [],
      likelyTarget: unitAtV7(state, at(5, 1)).id,
      provokers: [unitAtV7(state, at(5, 1)).id],
      exact: true,
    });
    // Every tile within its Move + 1 is a tile it could strike.
    expect(preview.reachTiles).toEqual(preview.provokeTiles);
    expect(preview.reachTiles).toContainEqual(at(8, 2));
    expect(preview.reachTiles).not.toContainEqual(at(9, 2));
    expect(preview.reachTiles).not.toContainEqual(HORROR);
    // The Channel on it is the only new thing a Cult seat is offered.
    expect(
      queryPlayerCommandsV7(viewForV7(state, humanId(state))).some(
        (command) => command.kind === "CHANNEL",
      ),
    ).toBe(false);
  });

  it("shows a break only to the viewers that see the daemon", () => {
    const state = unexploreV7(
      horrorField([{ seat: 0, role: "FIGHTER", at: at(1, 2) }]),
      1,
      [HORROR, at(4, 1), at(3, 0)],
    );
    const before = applyOkV7(state, cultId(state), { kind: "END_TURN" }).state;
    const result = applyOkV7(before, humanId(state), { kind: "END_TURN" });
    expect(kindsV7(result.events)).toContain("DAEMON_UNBOUND");
    const seen = (seat: number) =>
      projectEventsV7(
        before,
        result.state,
        seatIdV7(state, seat),
        result.events,
      )
        .events.map((event) => event.kind)
        .includes("DAEMON_UNBOUND");
    expect(seen(0)).toBe(true);
    expect(seen(1)).toBe(false);
  });
});
