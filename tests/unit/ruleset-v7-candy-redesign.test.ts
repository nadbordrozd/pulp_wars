import { describe, expect, it } from "vitest";
import {
  parseGameStateV7,
  previewTopUpV7,
  projectEventsV7,
  queryCombatPreviewV7,
  queryThreatenedTilesV7,
  reachablePlayerMovementPathsV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type DomainEventV7,
  type GameStateV7,
} from "../../src/engine/index";
import { checkedV7 } from "../fixtures/v7-builders";
import { candyFieldV7, type CandyPieceV7 } from "../fixtures/v7-candy";
import {
  applyOkV7,
  sameV7,
  seatIdV7,
  unitAtV7,
} from "../fixtures/v7-goblin-arena";
import {
  activeViewV7,
  expectOfferedAcceptedV7,
  hasUnitAtV7,
  offeredV7,
  playV7,
  rejectedV7,
} from "../fixtures/v7-martian";
import {
  activeIdV7,
  at,
  attackV7,
  kindsV7,
  patchUnitV7,
  unexploreV7,
} from "../fixtures/v7-revision20";

// The Candy redesign (`pulp_wars-jdb.12`,
// docs/product/RULESET_7_CANDY_REDESIGN.md sections 6 to 9 and 12): Sticky
// Toffee (Stuck), Toothache, Glaze Trail, Ricochet, Bunny Hop, Thump, and
// Top-Up, each proved on a small hand-built board (the Candy field: seat 0
// Candy, capital (8, 8); seat 1 Human, capital (2, 8); villages (5, 5),
// (8, 5), (5, 8); open Grass elsewhere; every technology; 100 Coins).

const endTurn = (state: GameStateV7) =>
  applyOkV7(state, activeIdV7(state), { kind: "END_TURN" });

const entryOf = (
  list: readonly { readonly unitId: number; readonly endsLeft: 1 | 2 }[],
  unitId: number,
) => list.find((entry) => entry.unitId === unitId)?.endsLeft ?? null;

const eventsOf = <K extends DomainEventV7["kind"]>(
  events: readonly DomainEventV7[],
  kind: K,
): readonly Extract<DomainEventV7, { kind: K }>[] =>
  events.filter(
    (event): event is Extract<DomainEventV7, { kind: K }> =>
      event.kind === kind,
  );

const moves = (state: GameStateV7, from: CoordV7) => {
  const unit = unitAtV7(state, from);
  return offeredV7(state, "MOVE").flatMap((command) =>
    command.kind === "MOVE" && command.unitId === unit.id ? [command] : [],
  );
};

const move = (unitId: number, path: readonly CoordV7[]): CommandV7 => ({
  kind: "MOVE",
  unitId: unitId as never,
  path: [...path],
});

describe("Sticky Toffee: Stuck (sections 6.2 and 7.1)", () => {
  it("sticks the Trooper's surviving target until the end of its owner's next turn", () => {
    const state = candyFieldV7([
      { seat: 0, role: "FIGHTER", at: at(5, 3) },
      { seat: 1, role: "RAIDER", at: at(5, 2) },
    ]);
    const raider = unitAtV7(state, at(5, 2));
    const run = attackV7(state, at(5, 3), at(5, 2));
    expect(run.combat.stuckApplied).toBe("TARGET");
    expect(run.target).toBeDefined();
    expect(eventsOf(run.events, "UNIT_STUCK")).toEqual([
      {
        kind: "UNIT_STUCK",
        playerId: activeIdV7(state),
        sourceUnitId: unitAtV7(state, at(5, 3)).id,
        unitId: raider.id,
        endsLeft: 1,
      },
    ]);
    // Right after the deaths and before the advance.
    expect(kindsV7(run.events).indexOf("UNIT_STUCK")).toBeGreaterThan(
      kindsV7(run.events).indexOf("COMBAT_RESOLVED"),
    );
    expect(entryOf(run.state.stuck, raider.id)).toBe(1);
    // Public on a visible unit.
    const view = viewForV7(run.state, seatIdV7(state, 1));
    expect(view.stuck).toEqual([{ unitId: raider.id, endsLeft: 1 }]);
    expect(
      view.unitStats.find((stats) => stats.unitId === raider.id)?.stuck,
    ).toBe(true);
    // The Candy End Turn keeps it; the Raider's turn allows one step only.
    const enemyTurn = endTurn(run.state).state;
    expect(entryOf(enemyTurn.stuck, raider.id)).toBe(1);
    const steps = moves(enemyTurn, at(5, 2)).map(
      (command) => command.path.length,
    );
    expect(steps.length).toBeGreaterThan(0);
    expect(Math.max(...steps)).toBe(1);
    expect(
      rejectedV7(enemyTurn, move(raider.id, [at(5, 1), at(5, 0)])),
    ).toEqual({ code: "MOVEMENT_ILLEGAL", params: { reason: "STUCK" } });
    // Its own End Turn removes it.
    expect(endTurn(enemyTurn).state.stuck).toEqual([]);
  });

  it("sticks the attacker a Trooper strikes back at, for two of its owner's End Turns when applied on its own turn", () => {
    const state = candyFieldV7(
      [
        { seat: 0, role: "FIGHTER", at: at(5, 3) },
        { seat: 1, role: "RAIDER", at: at(5, 2) },
      ],
      { activeSeat: 1 },
    );
    const raider = unitAtV7(state, at(5, 2));
    const run = attackV7(state, at(5, 2), at(5, 3));
    expect(run.combat.retaliation).toBe(true);
    expect(run.combat.stuckApplied).toBe("ATTACKER");
    expect(entryOf(run.state.stuck, raider.id)).toBe(2);
    expect(eventsOf(run.events, "UNIT_STUCK")[0]).toMatchObject({
      playerId: seatIdV7(state, 0),
      unitId: raider.id,
      endsLeft: 2,
    });
    // Its own End Turn now, the Candy turn, then its next turn is Stuck.
    const candyTurn = endTurn(run.state).state;
    expect(entryOf(candyTurn.stuck, raider.id)).toBe(1);
    const next = endTurn(candyTurn).state;
    expect(entryOf(next.stuck, raider.id)).toBe(1);
    expect(
      Math.max(...moves(next, at(5, 2)).map((command) => command.path.length)),
    ).toBe(1);
    expect(endTurn(next).state.stuck).toEqual([]);
  });

  it("never sticks a dead target or a ranged attacker, and a new application keeps the larger count", () => {
    const killed = attackV7(
      candyFieldV7([
        { seat: 0, role: "FIGHTER", at: at(5, 3) },
        { seat: 1, role: "FIGHTER", at: at(5, 2), hp: 1 },
      ]),
      at(5, 3),
      at(5, 2),
    );
    expect(killed.combat.stuckApplied).toBe("NONE");
    expect(killed.state.stuck).toEqual([]);
    const shot = attackV7(
      candyFieldV7(
        [
          { seat: 0, role: "FIGHTER", at: at(5, 4) },
          { seat: 1, role: "MARKSMAN", at: at(5, 2) },
        ],
        { activeSeat: 1 },
      ),
      at(5, 2),
      at(5, 4),
    );
    expect(shot.combat.retaliation).toBe(false);
    expect(shot.combat.stuckApplied).toBe("NONE");
    // A Stuck unit with 2 left that is stuck again for 1 keeps 2.
    const again = candyFieldV7(
      [
        { seat: 0, role: "FIGHTER", at: at(5, 3) },
        { seat: 1, role: "GUARD", at: at(5, 2), stuck: 2 },
      ],
      {},
    );
    const run = attackV7(again, at(5, 3), at(5, 2));
    expect(entryOf(run.state.stuck, unitAtV7(again, at(5, 2)).id)).toBe(2);
  });

  it("gives a Gingerbread Man (a Toffee Trooper in every rule) Sticky Toffee", () => {
    const base = candyFieldV7(
      [
        { seat: 0, role: "FIGHTER", at: at(5, 3) },
        { seat: 1, role: "FIGHTER", at: at(5, 2) },
      ],
      { activeSeat: 1 },
    );
    const state = patchUnitV7(base, at(5, 3), { variant: "GINGERBREAD_MAN" });
    const run = attackV7(state, at(5, 2), at(5, 3));
    expect(run.combat.stuckApplied).toBe("ATTACKER");
  });
});

describe("Toothache (sections 6.2 and 7.8)", () => {
  it("gives a surviving distance-1 attacker of a Jawbreaker Toothache, whether or not the Jawbreaker survives", () => {
    for (const hp of [16, 1]) {
      const state = candyFieldV7(
        [
          { seat: 0, role: "SWORDSMAN", at: at(5, 3), hp },
          { seat: 1, role: "FIGHTER", at: at(5, 2) },
        ],
        { activeSeat: 1 },
      );
      const fighter = unitAtV7(state, at(5, 2));
      const run = attackV7(state, at(5, 2), at(5, 3));
      expect(run.combat.toothacheApplied, String(hp)).toBe(true);
      expect(entryOf(run.state.toothache, fighter.id), String(hp)).toBe(2);
      expect(eventsOf(run.events, "TOOTHACHE_GIVEN")[0]).toMatchObject({
        playerId: seatIdV7(state, 0),
        unitId: fighter.id,
        endsLeft: 2,
      });
    }
    // From two tiles away: none.
    const shot = attackV7(
      candyFieldV7(
        [
          { seat: 0, role: "SWORDSMAN", at: at(5, 4) },
          { seat: 1, role: "MARKSMAN", at: at(5, 2) },
        ],
        { activeSeat: 1 },
      ),
      at(5, 2),
      at(5, 4),
    );
    expect(shot.combat.toothacheApplied).toBe(false);
    expect(shot.state.toothache).toEqual([]);
  });

  it("lowers the next attack by 1 (never below 0.5), is used up by it, and never touches retaliation", () => {
    const plain = candyFieldV7(
      [
        { seat: 0, role: "FIGHTER", at: at(5, 3) },
        { seat: 1, role: "FIGHTER", at: at(5, 2) },
      ],
      { activeSeat: 1 },
    );
    const aching = candyFieldV7(
      [
        { seat: 0, role: "FIGHTER", at: at(5, 3) },
        { seat: 1, role: "FIGHTER", at: at(5, 2), toothache: 1 },
      ],
      { activeSeat: 1 },
    );
    const normal = attackV7(plain, at(5, 2), at(5, 3));
    const weak = attackV7(aching, at(5, 2), at(5, 3));
    expect(weak.combat.toothacheAttack).toBe(true);
    expect(weak.combat.attack2).toBe(normal.combat.attack2 - 2);
    expect(weak.combat.damageToDefender).toBeLessThan(
      normal.combat.damageToDefender,
    );
    expect(weak.state.toothache).toEqual([]);
    // A Captain (Attack 1) keeps 0.5.
    const captain = candyFieldV7(
      [
        { seat: 0, role: "FIGHTER", at: at(5, 3) },
        { seat: 1, role: "CAPTAIN", at: at(5, 2), toothache: 1 },
      ],
      { activeSeat: 1 },
    );
    expect(attackV7(captain, at(5, 2), at(5, 3)).combat.attack2).toBe(1);
    // A unit with Toothache that is attacked strikes back as ever and keeps
    // the entry.
    const defender = candyFieldV7([
      { seat: 0, role: "FIGHTER", at: at(5, 3) },
      { seat: 1, role: "FIGHTER", at: at(5, 2), toothache: 1 },
    ]);
    const control = candyFieldV7([
      { seat: 0, role: "FIGHTER", at: at(5, 3) },
      { seat: 1, role: "FIGHTER", at: at(5, 2) },
    ]);
    const struck = attackV7(defender, at(5, 3), at(5, 2));
    expect(struck.combat.damageToAttacker).toBe(
      attackV7(control, at(5, 3), at(5, 2)).combat.damageToAttacker,
    );
    expect(struck.state.toothache).toHaveLength(1);
  });
});

describe("Glaze Trail (section 7.2)", () => {
  it("glazes the Racer's start and passed tiles, a half-cost road for its side this turn", () => {
    const state = candyFieldV7([
      { seat: 0, role: "RAIDER", at: at(4, 3) },
      { seat: 0, role: "FIGHTER", at: at(3, 3) },
      { seat: 1, role: "FIGHTER", at: at(1, 0) },
    ]);
    const racer = unitAtV7(state, at(4, 3));
    const rolled = applyOkV7(
      state,
      activeIdV7(state),
      move(racer.id, [at(5, 3), at(6, 3)]),
    );
    expect(eventsOf(rolled.events, "TILES_GLAZED")).toEqual([
      {
        kind: "TILES_GLAZED",
        playerId: activeIdV7(state),
        unitId: racer.id,
        tiles: [at(4, 3), at(5, 3)],
      },
    ]);
    expect(rolled.state.glazedThisTurn).toEqual([at(4, 3), at(5, 3)]);
    // A Move-1 Trooper walks the trail: two tiles for one Move.
    const trooper = unitAtV7(rolled.state, at(3, 3));
    const walk = move(trooper.id, [at(4, 3), at(5, 3)]);
    expect(
      moves(rolled.state, at(3, 3)).map((command) => command.path.at(-1)),
    ).toContainEqual(at(5, 3));
    expect(
      applyOkV7(rolled.state, activeIdV7(state), walk).state,
    ).toBeDefined();
    expectOfferedAcceptedV7(rolled.state, "MOVE");
    // Off the trail it still walks one tile.
    expect(
      rejectedV7(rolled.state, move(trooper.id, [at(3, 4), at(3, 5)])),
    ).toEqual({
      code: "MOVEMENT_ILLEGAL",
      params: { reason: "BUDGET_EXCEEDED" },
    });
    // The End Turn empties it.
    expect(endTurn(rolled.state).state.glazedThisTurn).toEqual([]);
  });

  it("keeps every stop: a zone of control on the trail still ends the Move", () => {
    const state = candyFieldV7(
      [
        { seat: 0, role: "FIGHTER", at: at(3, 3) },
        { seat: 1, role: "FIGHTER", at: at(4, 1) },
      ],
      { glazed: [at(4, 3), at(4, 2)] },
    );
    const trooper = unitAtV7(state, at(3, 3));
    expect(
      rejectedV7(state, move(trooper.id, [at(4, 2), at(5, 2)])).params,
    ).toEqual({ reason: "ZOC_STOPS_MOVE" });
  });
});

describe("Ricochet (section 7.3)", () => {
  const GUNNER = at(5, 5);
  const TARGET = at(5, 3);
  const field = (pieces: readonly CandyPieceV7[]) =>
    candyFieldV7([
      { seat: 0, role: "MARKSMAN", at: GUNNER },
      { seat: 1, role: "GUARD", at: TARGET },
      ...pieces,
    ]);

  it("bounces half the hit from two tiles onto the weakest visible neighbour, ties by unit ID", () => {
    const state = field([
      { seat: 1, role: "FIGHTER", at: at(4, 3), hp: 9 },
      { seat: 1, role: "FIGHTER", at: at(6, 2), hp: 7 },
      { seat: 0, role: "FIGHTER", at: at(6, 4), hp: 2 },
    ]);
    const run = attackV7(state, GUNNER, TARGET);
    const hit = run.combat.damageToDefender + run.combat.defenderShieldDamage;
    expect(hit).toBeGreaterThanOrEqual(2);
    const weakest = unitAtV7(state, at(6, 2));
    expect(run.combat.ricochet).toEqual({
      unitId: weakest.id,
      damage: Math.floor(hit / 2),
      shieldDamage: 0,
      dies: false,
    });
    expect(eventsOf(run.events, "RICOCHETED")).toEqual([
      {
        kind: "RICOCHETED",
        playerId: activeIdV7(state),
        unitId: unitAtV7(state, GUNNER).id,
        targetUnitId: weakest.id,
        damage: Math.floor(hit / 2),
        shieldDamage: 0,
        dies: false,
      },
    ]);
    expect(unitAtV7(run.state, at(6, 2)).hp).toBe(7 - Math.floor(hit / 2));
    // Equal HP: the lower unit ID.
    const tie = field([
      { seat: 1, role: "FIGHTER", at: at(4, 3), hp: 7 },
      { seat: 1, role: "FIGHTER", at: at(6, 2), hp: 7 },
    ]);
    const first = Math.min(
      unitAtV7(tie, at(4, 3)).id,
      unitAtV7(tie, at(6, 2)).id,
    );
    expect(attackV7(tie, GUNNER, TARGET).combat.ricochet?.unitId).toBe(first);
  });

  it("does not ricochet from distance 1, and kills with credit to the Gunner", () => {
    const close = candyFieldV7([
      { seat: 0, role: "MARKSMAN", at: at(5, 4) },
      { seat: 1, role: "GUARD", at: TARGET },
      { seat: 1, role: "FIGHTER", at: at(4, 3), hp: 1 },
    ]);
    expect(attackV7(close, at(5, 4), TARGET).combat.ricochet).toBeNull();
    const state = field([{ seat: 1, role: "FIGHTER", at: at(4, 3), hp: 1 }]);
    const run = attackV7(state, GUNNER, TARGET);
    expect(run.combat.ricochet).toMatchObject({ dies: true });
    expect(run.events).toContainEqual({
      kind: "UNIT_DIED",
      unitId: unitAtV7(state, at(4, 3)).id,
      cause: "RICOCHET",
    });
    expect(hasUnitAtV7(run.state, at(4, 3))).toBe(false);
    expect(unitAtV7(run.state, GUNNER).kills).toBe(1);
  });

  it("leaves Crumbs for a Candy unit it kills (a mirror match)", () => {
    const state = candyFieldV7(
      [
        { seat: 0, role: "MARKSMAN", at: GUNNER },
        { seat: 1, role: "GUARD", at: TARGET },
        { seat: 1, role: "FIGHTER", at: at(4, 3), hp: 1 },
      ],
      { factions: ["CANDY", "CANDY"] },
    );
    const run = attackV7(state, GUNNER, TARGET);
    expect(run.state.crumbs.map((entry) => entry.at)).toEqual([at(4, 3)]);
  });
});

describe("Bunny Hop and Thump (section 7.7)", () => {
  it("hops over one tile of a unit or a Mountain, never over water, once per Move", () => {
    const state = candyFieldV7(
      [
        { seat: 0, role: "KNIGHT", at: at(5, 3) },
        { seat: 1, role: "FIGHTER", at: at(9, 0) },
        { seat: 0, role: "FIGHTER", at: at(6, 3) },
      ],
      { water: [at(5, 2)] },
    );
    const bunny = unitAtV7(state, at(5, 3));
    // Over an own unit to two tiles east, then one more step.
    const hop = move(bunny.id, [at(7, 3), at(8, 3)]);
    const result = applyOkV7(state, activeIdV7(state), hop);
    expect(unitAtV7(result.state, at(8, 3)).id).toBe(bunny.id);
    expect(eventsOf(result.events, "UNIT_MOVED")[0]?.path).toEqual([
      at(7, 3),
      at(8, 3),
    ]);
    // Over water: refused.
    expect(rejectedV7(state, move(bunny.id, [at(5, 1)])).params).toEqual({
      reason: "HOP_ILLEGAL",
    });
    // A second hop in one path: refused.
    expect(
      rejectedV7(state, move(bunny.id, [at(3, 3), at(1, 3)])).params,
    ).toEqual({ reason: "NOT_ADJACENT" });
    // The movement query offers hop destinations, and every one is accepted.
    const destinations = reachablePlayerMovementPathsV7(
      activeViewV7(state),
      bunny,
    ).map((path) => path.destination);
    expect(destinations).toContainEqual(at(7, 3));
    expectOfferedAcceptedV7(state, "MOVE");
    // Another seat's threat reading counts the hop.
    const threats = queryThreatenedTilesV7(
      viewForV7(state, seatIdV7(state, 1)),
      bunny.id,
    );
    expect(threats).toContainEqual(at(9, 3));
  });

  it("lets a Stuck Bunny hop (a hop is one step), and stops a hop at a hidden unit on the take-off tile", () => {
    const stuck = candyFieldV7([
      { seat: 0, role: "KNIGHT", at: at(5, 3), stuck: 1 },
      { seat: 1, role: "FIGHTER", at: at(9, 0) },
    ]);
    const bunny = unitAtV7(stuck, at(5, 3));
    expect(playV7(stuck, move(bunny.id, [at(7, 3)])).state).toBeDefined();
    expect(
      rejectedV7(stuck, move(bunny.id, [at(6, 3), at(7, 3)])).params,
    ).toEqual({ reason: "STUCK" });
    // A hidden enemy on the (unexplored) landing tile: the Move is accepted
    // and interrupted where it started.
    const hidden = unexploreV7(
      candyFieldV7([
        { seat: 0, role: "KNIGHT", at: at(5, 3) },
        { seat: 1, role: "FIGHTER", at: at(5, 1) },
      ]),
      0,
      [at(5, 1)],
    );
    const hopper = unitAtV7(hidden, at(5, 3));
    const result = applyOkV7(
      hidden,
      activeIdV7(hidden),
      move(hopper.id, [at(5, 1)]),
    );
    expect(eventsOf(result.events, "UNIT_MOVE_INTERRUPTED")).toMatchObject([
      { unitId: hopper.id, at: at(5, 1), reason: "OCCUPIED" },
    ]);
    expect(unitAtV7(result.state, at(5, 3)).id).toBe(hopper.id);
    expect(unitAtV7(result.state, at(5, 1)).ownerId).toBe(seatIdV7(hidden, 1));
  });

  it("thumps 2 into every other hostile unit around the Bunny after its attack and advance", () => {
    const state = candyFieldV7([
      { seat: 0, role: "KNIGHT", at: at(5, 4) },
      { seat: 1, role: "FIGHTER", at: at(5, 3), hp: 1 },
      { seat: 1, role: "GUARD", at: at(4, 2) },
      { seat: 1, role: "FIGHTER", at: at(6, 2), hp: 2 },
      { seat: 1, role: "FIGHTER", at: at(7, 5) },
    ]);
    const run = attackV7(state, at(5, 4), at(5, 3));
    expect(run.combat.advances).toBe(true);
    const ids = [at(4, 2), at(6, 2)].map((where) => unitAtV7(state, where).id);
    expect(run.combat.thump.map((entry) => entry.unitId)).toEqual(
      [...ids].sort((left, right) => left - right),
    );
    expect(run.combat.thump.every((entry) => entry.damage <= 2)).toBe(true);
    const thumped = eventsOf(run.events, "THUMPED");
    expect(thumped).toHaveLength(1);
    expect(thumped[0]?.hits.map((hit) => hit.unitId)).toEqual(
      run.combat.thump.map((entry) => entry.unitId),
    );
    // The 2-HP Fighter dies to the Thump; the Fighter two tiles away from
    // the Bunny's new tile is untouched.
    expect(run.events).toContainEqual({
      kind: "UNIT_DIED",
      unitId: unitAtV7(state, at(6, 2)).id,
      cause: "THUMP",
    });
    expect(unitAtV7(run.state, at(7, 5)).hp).toBe(unitAtV7(state, at(7, 5)).hp);
    expect(unitAtV7(run.state, at(5, 3)).kills).toBe(2);
  });

  it("never thumps on retaliation", () => {
    const state = candyFieldV7(
      [
        { seat: 0, role: "KNIGHT", at: at(5, 3) },
        { seat: 1, role: "FIGHTER", at: at(5, 2) },
        { seat: 1, role: "FIGHTER", at: at(4, 3) },
      ],
      { activeSeat: 1 },
    );
    const run = attackV7(state, at(5, 2), at(5, 3));
    expect(run.combat.thump).toEqual([]);
    expect(eventsOf(run.events, "THUMPED")).toEqual([]);
  });
});

describe("Top-Up (section 8.2)", () => {
  const field = (target: Partial<CandyPieceV7> = {}) =>
    candyFieldV7(
      [
        { seat: 0, role: "CAPTAIN", at: at(5, 3) },
        {
          seat: 0,
          role: "FIGHTER",
          at: at(5, 4),
          hp: 5,
          rush: "CRASHED",
          stuck: 1,
          toothache: 1,
          ...target,
        },
        { seat: 1, role: "FIGHTER", at: at(1, 0) },
      ],
      { factions: ["CANDY", "ICE_FOLK"] },
    );

  it("ends the Crash, heals 2, and cures, so the unit may Rush and act again", () => {
    // Ice Folk Freeze replaced Chill: a Top-Up thaws a Frozen unit.
    const state = field({ frozen: { turnsLeft: 1 } });
    const confectioner = unitAtV7(state, at(5, 3));
    const trooper = unitAtV7(state, at(5, 4));
    expect(offeredV7(state, "SUGAR_RUSH")).not.toContainEqual({
      kind: "SUGAR_RUSH",
      unitId: trooper.id,
    });
    const command: CommandV7 = {
      kind: "TOP_UP",
      unitId: confectioner.id,
      targetUnitId: trooper.id,
    };
    expect(previewTopUpV7(activeViewV7(state), confectioner.id)).toEqual({
      unitId: confectioner.id,
      targets: [
        {
          unitId: trooper.id,
          crashEnded: true,
          amount: 2,
          hpAfter: 7,
          cured: true,
        },
      ],
    });
    const result = playV7(state, command);
    expect(result.events).toEqual([
      {
        kind: "UNIT_TOPPED_UP",
        playerId: activeIdV7(state),
        unitId: confectioner.id,
        targetUnitId: trooper.id,
        crashEnded: true,
        amount: 2,
        hpAfter: 7,
        cured: true,
      },
    ]);
    expect(result.state.sugarRush).toEqual([]);
    expect(result.state.stuck).toEqual([]);
    expect(result.state.toothache).toEqual([]);
    expect(result.state.frozen).toEqual([]);
    expect(unitAtV7(result.state, at(5, 4)).hp).toBe(7);
    expect(unitAtV7(result.state, at(5, 3)).activation).toMatchObject({
      specialActed: true,
      handled: true,
    });
    expect(offeredV7(result.state, "SUGAR_RUSH")).toContainEqual({
      kind: "SUGAR_RUSH",
      unitId: trooper.id,
    });
  });

  it("ends a Crashed Gingerbread Giant's Crash, so it may Break Off this turn", () => {
    const state = candyFieldV7([
      { seat: 0, role: "CAPTAIN", at: at(5, 3) },
      { seat: 0, role: "JUGGERNAUT", at: at(5, 4), rush: "CRASHED" },
      { seat: 1, role: "FIGHTER", at: at(1, 0) },
    ]);
    const giant = unitAtV7(state, at(5, 4));
    const breaks = (from: GameStateV7) =>
      offeredV7(from, "BREAK_OFF").filter(
        (command) =>
          command.kind === "BREAK_OFF" && command.unitId === giant.id,
      );
    expect(breaks(state)).toEqual([]);
    const result = playV7(state, {
      kind: "TOP_UP",
      unitId: unitAtV7(state, at(5, 3)).id,
      targetUnitId: giant.id,
    });
    expect(result.events[0]).toMatchObject({
      kind: "UNIT_TOPPED_UP",
      crashEnded: true,
      amount: 0,
    });
    expect(breaks(result.state).length).toBeGreaterThan(0);
  });

  it("rejects each row in order, atomically", () => {
    const state = field();
    const confectioner = unitAtV7(state, at(5, 3));
    const trooper = unitAtV7(state, at(5, 4));
    const topUp = (unitId: number, targetUnitId: number): CommandV7 => ({
      kind: "TOP_UP",
      unitId: unitId as never,
      targetUnitId: targetUnitId as never,
    });
    // Row 2: not a Confectioner (checked before the Crash).
    expect(rejectedV7(state, topUp(trooper.id, confectioner.id))).toEqual({
      code: "UNIT_ROLE_INVALID",
      params: { role: "FIGHTER" },
    });
    const gumdrop = candyFieldV7([
      { seat: 0, role: "FIGHTER", at: at(5, 3) },
      { seat: 0, role: "FIGHTER", at: at(5, 4), hp: 5 },
      { seat: 1, role: "FIGHTER", at: at(1, 0) },
    ]);
    expect(
      rejectedV7(
        gumdrop,
        topUp(unitAtV7(gumdrop, at(5, 3)).id, unitAtV7(gumdrop, at(5, 4)).id),
      ),
    ).toEqual({ code: "UNIT_ROLE_INVALID", params: { role: "FIGHTER" } });
    // Row 3: a Crashed Confectioner.
    const crashed = candyFieldV7([
      { seat: 0, role: "CAPTAIN", at: at(5, 3), rush: "CRASHED" },
      { seat: 0, role: "FIGHTER", at: at(5, 4), hp: 5 },
      { seat: 1, role: "FIGHTER", at: at(1, 0) },
    ]);
    expect(
      rejectedV7(
        crashed,
        topUp(unitAtV7(crashed, at(5, 3)).id, unitAtV7(crashed, at(5, 4)).id),
      ),
    ).toEqual({
      code: "UNIT_CRASHED",
      params: { unitId: unitAtV7(crashed, at(5, 3)).id },
    });
    // Row 6: an enemy target; Row 7: out of reach; Row 8: nothing to do.
    const enemy = candyFieldV7([
      { seat: 0, role: "CAPTAIN", at: at(5, 3) },
      { seat: 1, role: "FIGHTER", at: at(5, 4), hp: 5 },
    ]);
    expect(
      rejectedV7(
        enemy,
        topUp(unitAtV7(enemy, at(5, 3)).id, unitAtV7(enemy, at(5, 4)).id),
      ),
    ).toEqual({
      code: "HEAL_TARGET_NOT_OWNED",
      params: { targetUnitId: unitAtV7(enemy, at(5, 4)).id },
    });
    const far = candyFieldV7([
      { seat: 0, role: "CAPTAIN", at: at(5, 3) },
      { seat: 0, role: "FIGHTER", at: at(5, 5), hp: 5 },
      { seat: 1, role: "FIGHTER", at: at(1, 0) },
    ]);
    expect(
      rejectedV7(
        far,
        topUp(unitAtV7(far, at(5, 3)).id, unitAtV7(far, at(5, 5)).id),
      ),
    ).toEqual({
      code: "TOP_UP_NOT_LEGAL",
      params: { reason: "OUT_OF_RANGE" },
    });
    const fine = candyFieldV7([
      { seat: 0, role: "CAPTAIN", at: at(5, 3) },
      { seat: 0, role: "FIGHTER", at: at(5, 4) },
      { seat: 1, role: "FIGHTER", at: at(1, 0) },
    ]);
    expect(
      rejectedV7(
        fine,
        topUp(unitAtV7(fine, at(5, 3)).id, unitAtV7(fine, at(5, 4)).id),
      ),
    ).toEqual({
      code: "TOP_UP_NOT_LEGAL",
      params: { reason: "NOTHING_TO_DO" },
    });
    expect(
      previewTopUpV7(activeViewV7(fine), unitAtV7(fine, at(5, 3)).id),
    ).toBe(null);
  });
});

describe("the redesign state (section 12)", () => {
  it("parses Stuck, Toothache, and the Glaze strictly, and none of it without a Candy seat", () => {
    const state = candyFieldV7(
      [
        { seat: 0, role: "FIGHTER", at: at(5, 3), toothache: 2 },
        { seat: 1, role: "FIGHTER", at: at(5, 2), stuck: 1 },
      ],
      { glazed: [at(4, 3)], water: [at(1, 1)] },
    );
    expect(parseGameStateV7(JSON.parse(JSON.stringify(state)))).toEqual(state);
    const id = unitAtV7(state, at(5, 2)).id;
    const parsed = (patch: Partial<GameStateV7>) =>
      parseGameStateV7({ ...state, ...patch });
    expect(
      parsed({ stuck: [{ unitId: id, endsLeft: 3 as never }] }),
    ).toBeNull();
    expect(
      parsed({ stuck: [{ unitId: 999 as never, endsLeft: 1 }] }),
    ).toBeNull();
    expect(
      parsed({
        stuck: [
          { unitId: id, endsLeft: 1 },
          { unitId: id, endsLeft: 1 },
        ],
      }),
    ).toBeNull();
    expect(parsed({ glazedThisTurn: [at(1, 1)] })).toBeNull();
    const other = checkedV7(
      candyFieldV7(
        [
          { seat: 0, role: "FIGHTER", at: at(5, 3) },
          { seat: 1, role: "FIGHTER", at: at(5, 2) },
        ],
        { factions: ["ORIGINAL", "UNDEAD"] },
      ),
    );
    expect(
      parseGameStateV7({
        ...other,
        stuck: [{ unitId: unitAtV7(other, at(5, 2)).id, endsLeft: 1 }],
      }),
    ).toBeNull();
  });

  it("projects a Thump's hits and the Glaze only as far as the viewer sees", () => {
    const state = candyFieldV7([
      { seat: 0, role: "RAIDER", at: at(4, 3) },
      { seat: 1, role: "FIGHTER", at: at(1, 0) },
    ]);
    const enemy = seatIdV7(state, 1);
    const blind = unexploreV7(state, 1, [at(4, 3), at(5, 3), at(6, 3)]);
    const racer = unitAtV7(blind, at(4, 3));
    const rolled = applyOkV7(blind, activeIdV7(blind), {
      kind: "MOVE",
      unitId: racer.id,
      path: [at(5, 3), at(6, 3)],
    });
    const glazed = projectEventsV7(
      blind,
      rolled.state,
      enemy,
      rolled.events,
    ).events.filter((event) => event.kind === "TILES_GLAZED");
    expect(glazed).toEqual([]);
    const owner = projectEventsV7(
      blind,
      rolled.state,
      activeIdV7(blind),
      rolled.events,
    ).events.filter((event) => event.kind === "TILES_GLAZED");
    expect(owner).toHaveLength(1);
    expect(sameV7(at(4, 3), at(4, 3))).toBe(true);
  });

  it("keeps the public preview equal to the resolution for every new field", () => {
    // A mirror match, so the defender is a Candy Jawbreaker.
    const state = candyFieldV7(
      [
        { seat: 0, role: "KNIGHT", at: at(5, 4), toothache: 1 },
        { seat: 1, role: "SWORDSMAN", at: at(5, 3) },
        { seat: 1, role: "FIGHTER", at: at(4, 3) },
      ],
      { factions: ["CANDY", "CANDY"] },
    );
    const view = activeViewV7(state);
    const preview = queryCombatPreviewV7(
      view,
      unitAtV7(state, at(5, 4)).id,
      unitAtV7(state, at(5, 3)).id,
    );
    const run = attackV7(state, at(5, 4), at(5, 3));
    expect(preview).toEqual(run.combat);
    expect(run.combat).toMatchObject({
      toothacheAttack: true,
      toothacheApplied: true,
    });
    expect(run.combat.thump.map((entry) => entry.unitId)).toEqual([
      unitAtV7(state, at(4, 3)).id,
    ]);
  });
});
