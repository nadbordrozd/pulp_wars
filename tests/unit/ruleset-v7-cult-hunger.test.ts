import { describe, expect, it } from "vitest";
import {
  FAVOUR_CAP_V7,
  HERALD_FAVOUR_COST_V7,
  HERALD_HUNGER_FAVOUR_V7,
  HORROR_FAVOUR_COST_V7,
  NEUTRAL_OWNER_ID_V7,
  OFFERING_FAVOUR_V7,
  PRIOR_RULESET_7_IDS,
  RULESET_7_ID,
  SAVE_STORAGE_KEY_V7,
  SUMMONER_TRICKLE_FAVOUR_V7,
  daemonIsFuriousV7,
  favourOfV7,
  heraldHungerDueV7,
  parseEventV7,
  parseGameStateV7,
  viewForV7,
  type CoordV7,
  type DomainEventV7,
  type GameStateV7,
  type PlayerId,
} from "../../src/engine/index";
import { OBSOLETE_SAVE_STORAGE_KEYS_V7 } from "../../src/persistence/index";
import {
  roleGlossaryV7,
  summonedGlossaryV7,
} from "../../src/render/unit-glossary-v7";
import {
  cultFieldV7,
  withFavourV7,
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
import { at, kindsV7 } from "../fixtures/v7-revision20";

/**
 * The Cult redesign E-R2 (`pulp_wars-mch9.32`,
 * docs/product/RULESET_7_CULT_REDESIGN.md sections 6, 7.6, and 10.1): the
 * Favour economy at the Start Turn check. After every daemon is checked,
 * each Summoner whose strand held for a daemon still bound pays +1 (the
 * trickle); then each bound Herald eats 2 (Hunger), and one its seat cannot
 * feed is Unbound at once. (The cap, the Offering's 6, and the new prices
 * are pinned with their rules in the favour, channel, and rituals files.)
 *
 * Every state is built by hand on the two-seat 11 x 11 field of
 * `cultFieldV7` (seat 0 the Cult, seat 1 Human); no match is played. A
 * Start Turn check is reached by ending the Cult's turn and the Human's.
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

/** The Cult's robed cultists: an Initiate (`FIGHTER`) or a Summoner. */
const initiate = (where: CoordV7): GoblinPieceV7 => ({
  seat: 0,
  role: "FIGHTER",
  at: where,
});
const summoner = (where: CoordV7): GoblinPieceV7 => ({
  seat: 0,
  role: "CAPTAIN",
  at: where,
});

const HORROR = at(5, 4);
const HERALD = at(5, 4);
/** The three tiles north of the daemon on (5, 4). */
const RING = [at(4, 3), at(5, 3), at(6, 3)] as const;

/**
 * A bound daemon of the Cult on `where` (a Horror, or a Herald with
 * `role`), channelled by every cultist of `cultists`, with `favour` Favour.
 */
function channelled(
  cultists: readonly GoblinPieceV7[],
  favour: number,
  daemons: readonly {
    readonly where: CoordV7;
    readonly role: "HORROR" | "HERALD";
    readonly by: readonly CoordV7[];
  }[],
): GameStateV7 {
  let state = cultFieldV7(cultists);
  for (const daemon of daemons)
    state = withHorrorV7(state, 0, daemon.where, { role: daemon.role });
  for (const daemon of daemons)
    state = withStrandsV7(state, daemon.where, daemon.by);
  return favour > 0 ? withFavourV7(state, 0, favour) : state;
}

/** The Cult's next Start Turn (its turn and the Human's end). */
const check = (state: GameStateV7) => endTurnUntilV7(state, cultId(state));

describe("the Cult redesign E-R2 and E-R3: the identity (7r89)", () => {
  // The Favour economy (`pulp_wars-mch9.32`) and the warden
  // (`pulp_wars-mch9.33`) took 7r89 together, after the Star-fall and the
  // daemons' advance of `pulp_wars-mch9.34` and `pulp_wars-mch9.35` (7r88);
  // the Imp (`pulp_wars-mch9.36`) took 7r90 after it, and the Gibbering
  // Mass (`pulp_wars-mch9.37`) 7r91.
  it("was 7r89 after 7r88, both save keys obsolete now", () => {
    expect(RULESET_7_ID).toBe("pulp-wars-poc-7r104");
    expect(SAVE_STORAGE_KEY_V7).toBe("pulpWars.save.v7r104.current");
    expect(PRIOR_RULESET_7_IDS.slice(-16, -14)).toEqual([
      "pulp-wars-poc-7r88",
      "pulp-wars-poc-7r89",
    ]);
    expect(OBSOLETE_SAVE_STORAGE_KEYS_V7.slice(-16, -14)).toEqual([
      "pulpWars.save.v7r88.current",
      "pulpWars.save.v7r89.current",
    ]);
  });
});

describe("the Cult redesign E-R2: the numbers (pulp_wars-mch9.32)", () => {
  it("holds the redesign's Favour numbers", () => {
    expect({
      cap: FAVOUR_CAP_V7,
      offering: OFFERING_FAVOUR_V7,
      horror: HORROR_FAVOUR_COST_V7,
      herald: HERALD_FAVOUR_COST_V7,
      trickle: SUMMONER_TRICKLE_FAVOUR_V7,
      hunger: HERALD_HUNGER_FAVOUR_V7,
    }).toEqual({
      cap: 30,
      offering: 6,
      horror: 4,
      herald: 18,
      trickle: 1,
      hunger: 2,
    });
  });
});

describe("the trickle (section 6)", () => {
  it("pays 1 for a Summoner whose strand held, after the check", () => {
    const state = channelled([summoner(at(5, 2)), initiate(at(6, 3))], 0, [
      { where: HORROR, role: "HORROR", by: [at(5, 2), at(6, 3)] },
    ]);
    const round = check(state);
    expect(kindsV7(round.events)).not.toContain("DAEMON_UNBOUND");
    expect(eventsOf(round.events, "FAVOUR_GAINED")).toEqual([
      {
        kind: "FAVOUR_GAINED",
        playerId: cultId(state),
        source: "TRICKLE",
        amount: 1,
        forfeited: 0,
        favour: 1,
      },
    ]);
    expect(favourOfV7(round.state, cultId(state))).toBe(1);
    // The Initiate's strand pays nothing; the strands are cleared after.
    expect(round.state.cult.strands).toEqual([]);
    expect(parseGameStateV7(JSON.parse(JSON.stringify(round.state)))).toEqual(
      round.state,
    );
    for (const event of round.events)
      expect(parseEventV7(event).ok, event.kind).toBe(true);
  });

  it("pays nothing for a strand that did not hold, or for a daemon that broke loose", () => {
    // The Summoner stands 4 tiles from the Horror: its strand does not
    // hold, and the Initiate's alone keeps the Horror bound.
    const far = channelled([summoner(at(5, 0)), initiate(at(5, 5))], 0, [
      { where: at(5, 4), role: "HORROR", by: [at(5, 0), at(5, 5)] },
    ]);
    const kept = check(far);
    expect(kindsV7(kept.events)).not.toContain("DAEMON_UNBOUND");
    expect(eventsOf(kept.events, "FAVOUR_GAINED")).toEqual([]);
    // A Herald on two strands (a Summoner's among them) breaks loose: no
    // Summoner held anything.
    const short = channelled([summoner(RING[0]), initiate(RING[1])], 0, [
      { where: HERALD, role: "HERALD", by: [RING[0], RING[1]] },
    ]);
    const lost = check(short);
    expect(eventsOf(lost.events, "DAEMON_UNBOUND")).toMatchObject([
      { reason: "STRANDS", strands: 2, control: 3 },
    ]);
    expect(
      eventsOf(lost.events, "FAVOUR_GAINED").filter(
        (event) => event.source === "TRICKLE",
      ),
    ).toEqual([]);
  });

  it("pays 1 a Summoner: two Summoners on one Herald pay 2", () => {
    const state = channelled(
      [summoner(RING[0]), summoner(RING[1]), initiate(RING[2])],
      0,
      [{ where: HERALD, role: "HERALD", by: [...RING] }],
    );
    const round = check(state);
    expect(eventsOf(round.events, "FAVOUR_GAINED")).toMatchObject([
      { source: "TRICKLE", amount: 2, forfeited: 0, favour: 2 },
    ]);
    // ... which feeds the Herald: 2 for its Hunger, and it stays.
    expect(eventsOf(round.events, "FAVOUR_SPENT")).toEqual([
      {
        kind: "FAVOUR_SPENT",
        playerId: cultId(state),
        purpose: "HUNGER",
        amount: 2,
        favour: 0,
      },
    ]);
    expect(kindsV7(round.events)).not.toContain("DAEMON_UNBOUND");
    expect(unitAtV7(round.state, HERALD).ownerId).toBe(cultId(state));
  });

  it("stops at the cap: a trickle at 30 is lost", () => {
    const state = channelled([summoner(at(5, 2)), initiate(at(6, 3))], 30, [
      { where: HORROR, role: "HORROR", by: [at(5, 2)] },
    ]);
    const round = check(state);
    expect(eventsOf(round.events, "FAVOUR_GAINED")).toMatchObject([
      { source: "TRICKLE", amount: 1, forfeited: 1, favour: 30 },
    ]);
    expect(favourOfV7(round.state, cultId(state))).toBe(30);
  });
});

describe("the Herald's Hunger (section 7.6)", () => {
  const ringed = (favour: number, cultists = RING.map(initiate)) =>
    channelled(cultists, favour, [
      { where: HERALD, role: "HERALD", by: [...RING] },
    ]);

  it("eats 2 Favour at the check: 3 leaves 1", () => {
    const state = ringed(3);
    const round = check(state);
    expect(eventsOf(round.events, "FAVOUR_SPENT")).toEqual([
      {
        kind: "FAVOUR_SPENT",
        playerId: cultId(state),
        purpose: "HUNGER",
        amount: 2,
        favour: 1,
      },
    ]);
    expect(favourOfV7(round.state, cultId(state))).toBe(1);
    expect(unitAtV7(round.state, HERALD).ownerId).toBe(cultId(state));
  });

  it("breaks loose when it cannot be fed: Unbound for Hunger, rampaging at once, Furious", () => {
    const state = ringed(1);
    const herald = unitAtV7(state, HERALD);
    const round = check(state);
    expect(eventsOf(round.events, "DAEMON_UNBOUND")).toEqual([
      {
        kind: "DAEMON_UNBOUND",
        unitId: herald.id,
        summonerPlayerId: cultId(state),
        strands: 3,
        control: 3,
        reason: "HUNGER",
      },
    ]);
    // Nothing is paid and nothing refunded: the 1 stays.
    expect(eventsOf(round.events, "FAVOUR_SPENT")).toEqual([]);
    expect(favourOfV7(round.state, cultId(state))).toBe(1);
    const loose = round.state.units.find((unit) => unit.id === herald.id);
    expect(loose?.ownerId).toBe(NEUTRAL_OWNER_ID_V7);
    expect(daemonIsFuriousV7(round.state, herald.id)).toBe(true);
    // It rampages at once: its cultists beside it are struck.
    const from = round.events.findIndex(
      (event) => event.kind === "DAEMON_UNBOUND",
    );
    expect(kindsV7(round.events.slice(from + 1))).toContain("COMBAT_RESOLVED");
    for (const event of round.events)
      expect(parseEventV7(event).ok, event.kind).toBe(true);
    expect(parseGameStateV7(JSON.parse(JSON.stringify(round.state)))).toEqual(
      round.state,
    );
  });

  it("is paid from the trickle first: Favour 1 and a Summoner's 1 feed it", () => {
    const state = ringed(1, [
      summoner(RING[0]),
      initiate(RING[1]),
      initiate(RING[2]),
    ]);
    const round = check(state);
    expect(
      round.events
        .filter(
          (event) =>
            event.kind === "FAVOUR_GAINED" || event.kind === "FAVOUR_SPENT",
        )
        .map((event) => [event.kind, event.favour]),
    ).toEqual([
      ["FAVOUR_GAINED", 2],
      ["FAVOUR_SPENT", 0],
    ]);
    expect(kindsV7(round.events)).not.toContain("DAEMON_UNBOUND");
  });

  it("feeds two Heralds in unit-ID order: with 3 Favour the second breaks loose", () => {
    const west = [at(1, 3), at(2, 3), at(3, 3)] as const;
    const state = channelled([...RING, ...west].map(initiate), 3, [
      { where: HERALD, role: "HERALD", by: [...RING] },
      { where: at(2, 4), role: "HERALD", by: [...west] },
    ]);
    const first = unitAtV7(state, HERALD);
    const second = unitAtV7(state, at(2, 4));
    expect(first.id).toBeLessThan(second.id);
    const round = check(state);
    expect(eventsOf(round.events, "FAVOUR_SPENT")).toMatchObject([
      { purpose: "HUNGER", amount: 2, favour: 1 },
    ]);
    expect(eventsOf(round.events, "DAEMON_UNBOUND")).toMatchObject([
      { unitId: second.id, reason: "HUNGER" },
    ]);
    expect(
      round.state.units.find((unit) => unit.id === first.id)?.ownerId,
    ).toBe(cultId(state));
  });

  it("says what the Heralds will eat at the seat's next check", () => {
    const state = ringed(3);
    const view = viewForV7(state, cultId(state));
    expect(heraldHungerDueV7(view.units, cultId(state))).toBe(2);
    expect(heraldHungerDueV7(state.units, cultId(state))).toBe(2);
    // A Horror eats nothing, and an Unbound Herald is nobody's.
    const horror = channelled([initiate(at(5, 3))], 0, [
      { where: HORROR, role: "HORROR", by: [at(5, 3)] },
    ]);
    expect(heraldHungerDueV7(horror.units, cultId(horror))).toBe(0);
    const loose = withUnboundV7(state, HERALD, 0);
    expect(heraldHungerDueV7(loose.units, cultId(loose))).toBe(0);
  });

  it("names the reason in the events' schema", () => {
    const base = {
      kind: "DAEMON_UNBOUND",
      unitId: 9,
      summonerPlayerId: 1,
      strands: 3,
      control: 3,
    };
    expect(parseEventV7({ ...base, reason: "HUNGER" }).ok).toBe(true);
    expect(parseEventV7({ ...base, reason: "STRANDS" }).ok).toBe(false);
    expect(parseEventV7({ ...base, strands: 2, reason: "STRANDS" }).ok).toBe(
      true,
    );
    expect(parseEventV7({ ...base, strands: 0, reason: "ELIMINATED" }).ok).toBe(
      true,
    );
    expect(parseEventV7({ ...base, reason: "ELIMINATED" }).ok).toBe(false);
    expect(parseEventV7({ ...base, reason: "BORED" }).ok).toBe(false);
    expect(parseEventV7(base).ok).toBe(false);
    const spent = {
      kind: "FAVOUR_SPENT",
      playerId: 1,
      purpose: "HUNGER",
      amount: 2,
      favour: 0,
    };
    expect(parseEventV7(spent).ok).toBe(true);
    expect(parseEventV7({ ...spent, amount: 3 }).ok).toBe(false);
  });

  it("is in the Herald's glossary; the trickle and the cap are in the Summoner's", () => {
    expect(summonedGlossaryV7("HERALD").map((entry) => entry.id)).toContain(
      "HUNGER",
    );
    expect(summonedGlossaryV7("HORROR").map((entry) => entry.id)).not.toContain(
      "HUNGER",
    );
    const summonerEntries = roleGlossaryV7("CAPTAIN", "CULT").map(
      (entry) => entry.id,
    );
    expect(summonerEntries).toContain("TRICKLE");
    expect(summonerEntries).toContain("FAVOUR_CAP");
    expect(
      roleGlossaryV7("CAPTAIN", "ORIGINAL").map((entry) => entry.id),
    ).not.toContain("TRICKLE");
  });
});
