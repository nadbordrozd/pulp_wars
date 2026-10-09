import { describe, expect, it } from "vitest";
import {
  CRUMBS_DEATH_CAUSES_V7,
  UNIT_ROLE_IDS_V7,
  cityUnitCapacityV7,
  applyCommandV7,
  crumbsAtV7,
  crumbsBiteV7,
  deathLeavesCrumbsV7,
  parseGameStateV7,
  previewCrumbsEatV7,
  previewRebakeV7,
  queryRebakeBlockerV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type DomainEventV7,
  type GameStateV7,
  type UnitRoleIdV7,
} from "../../src/engine/index";
import { checkedV7 } from "../fixtures/v7-builders";
import {
  candyFieldV7,
  crumbsOnV7,
  type CandyPieceV7,
} from "../fixtures/v7-candy";
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
  shieldAtV7,
} from "../fixtures/v7-martian";
import {
  activeIdV7,
  at,
  attackV7,
  fieldDefenseV7,
  kindsV7,
  movedV7,
  patchTileV7,
  patchUnitV7,
  withoutTechsV7,
} from "../fixtures/v7-revision20";

// The Candy revision (`pulp_wars-jdb.3`): Crumbs, going stale, eating and
// the Peppermint Surprise, and the Re-bake command
// (docs/product/RULESET_7_CANDY.md section 6).

function endTurn(state: GameStateV7) {
  return applyOkV7(state, activeIdV7(state), { kind: "END_TURN" });
}

function moveTo(state: GameStateV7, from: CoordV7, to: CoordV7) {
  const unit = unitAtV7(state, from);
  const command = offeredV7(state, "MOVE").find(
    (candidate) =>
      candidate.kind === "MOVE" &&
      candidate.unitId === unit.id &&
      sameV7(candidate.path.at(-1) as CoordV7, to),
  );
  if (command === undefined) throw new Error("no Move to the tile");
  return playV7(state, command);
}

const eaten = (events: readonly DomainEventV7[]) =>
  events.filter((event) => event.kind === "CRUMBS_EATEN");

describe("Crumbs are left by a fallen Candy unit (section 6.1)", () => {
  it("leaves Crumbs for a death by attack, with the event right after the death", () => {
    const state = candyFieldV7(
      [
        { seat: 1, role: "KNIGHT", at: at(5, 3) },
        { seat: 0, role: "KNIGHT", at: at(5, 2), hp: 1 },
      ],
      { activeSeat: 1 },
    );
    const candy = seatIdV7(state, 0);
    const run = attackV7(state, at(5, 3), at(5, 2));
    expect(run.state.crumbs).toEqual([
      { at: at(5, 2), role: "KNIGHT", ownerId: candy, turnsLeft: 3 },
    ]);
    const kinds = kindsV7(run.events);
    expect(kinds[kinds.indexOf("UNIT_DIED") + 1]).toBe("CRUMBS_LEFT");
    expect(run.events.find((event) => event.kind === "CRUMBS_LEFT")).toEqual({
      kind: "CRUMBS_LEFT",
      playerId: candy,
      at: at(5, 2),
      role: "KNIGHT",
    });
    // The Knight advanced onto the tile: it stands on the Crumbs and did not
    // eat them (an advance is not a Move).
    expect(unitAtV7(run.state, at(5, 2)).role).toBe("KNIGHT");
    expect(eaten(run.events)).toEqual([]);
    // They are public on the explored tile, with the owner's bite.
    const view = viewForV7(run.state, seatIdV7(run.state, 1));
    expect(view.crumbs).toEqual([
      { at: at(5, 2), role: "KNIGHT", ownerId: candy, turnsLeft: 3, bite: 3 },
    ]);
    expect(crumbsAtV7(view, at(5, 2))?.role).toBe("KNIGHT");
    expect(crumbsAtV7(run.state, at(4, 4))).toBeUndefined();
  });

  it("leaves Crumbs for a death by retaliation, on the Candy turn", () => {
    const state = candyFieldV7([
      { seat: 0, role: "FIGHTER", at: at(5, 3), hp: 1 },
      { seat: 1, role: "GUARD", at: at(5, 2) },
    ]);
    const run = attackV7(state, at(5, 3), at(5, 2));
    expect(run.attacker).toBeUndefined();
    expect(run.state.crumbs).toMatchObject([
      { at: at(5, 3), role: "FIGHTER", turnsLeft: 3 },
    ]);
  });

  it("leaves Crumbs for a Kaboom victim, and Crumbs and a Grave on one tile in the stated order", () => {
    const goblins = candyFieldV7(
      [
        { seat: 1, role: "FIGHTER", at: at(5, 3) },
        { seat: 0, role: "MARKSMAN", at: at(5, 2), hp: 4 },
      ],
      { factions: ["CANDY", "GOBLIN"], activeSeat: 1 },
    );
    const boom = playV7(goblins, {
      kind: "KABOOM",
      unitId: unitAtV7(goblins, at(5, 3)).id,
    });
    expect(boom.events).toContainEqual({
      kind: "UNIT_DIED",
      unitId: unitAtV7(goblins, at(5, 2)).id,
      cause: "EXPLOSION",
    });
    // The victim's Crumbs; none for the Goblin that blew itself up.
    expect(boom.state.crumbs).toMatchObject([
      { at: at(5, 2), role: "MARKSMAN" },
    ]);
    const undead = candyFieldV7(
      [
        { seat: 1, role: "FIGHTER", at: at(5, 3) },
        { seat: 0, role: "CAPTAIN", at: at(5, 2), hp: 1 },
      ],
      { factions: ["CANDY", "UNDEAD"], activeSeat: 1 },
    );
    const run = attackV7(undead, at(5, 3), at(5, 2));
    const kinds = kindsV7(run.events);
    const died = kinds.indexOf("UNIT_DIED");
    expect(kinds.slice(died, died + 3)).toEqual([
      "UNIT_DIED",
      "GRAVE_CREATED",
      "CRUMBS_LEFT",
    ]);
    expect(run.state.graves).toHaveLength(1);
    expect(run.state.crumbs).toMatchObject([{ at: at(5, 2), role: "CAPTAIN" }]);
  });

  it("replaces Crumbs already on the tile", () => {
    const state = candyFieldV7(
      [
        { seat: 1, role: "CATAPULT", at: at(5, 5) },
        { seat: 0, role: "RAIDER", at: at(5, 2), hp: 1 },
      ],
      {
        activeSeat: 1,
        crumbs: [{ at: at(5, 2), role: "KNIGHT", turnsLeft: 1 }],
      },
    );
    const run = attackV7(state, at(5, 5), at(5, 2));
    expect(run.state.crumbs).toMatchObject([
      { at: at(5, 2), role: "RAIDER", turnsLeft: 3 },
    ]);
  });

  it("decides every cause and exclusion with the one predicate", () => {
    const state = candyFieldV7(
      [
        { seat: 0, role: "FIGHTER", at: at(5, 3) },
        { seat: 1, role: "FIGHTER", at: at(5, 2) },
      ],
      { water: [at(6, 1)] },
    );
    const candy = seatIdV7(state, 0);
    const dead = (role: UnitRoleIdV7, where = at(5, 3)) => ({
      ownerId: candy,
      role,
      form: "LAND" as const,
      at: where,
    });
    expect(CRUMBS_DEATH_CAUSES_V7).toEqual([
      "ATTACK",
      "RETALIATION",
      "SPLASH",
      "WAIL",
      "PLAGUE",
      "EXPLOSION",
      "SHATTER",
      "BOMB",
      "ERUPTION",
      "PEPPERMINT",
      // The giants' signatures (`pulp_wars-w49.30`, G5).
      "CRUSH",
      "STOMP",
      "TRAMPLE",
      // Ice Folk Freeze (`pulp_wars-w49.37`): a Mammoth's Stampede.
      "STAMPEDE",
      // The Candy redesign (`pulp_wars-jdb.12`): Ricochet and Thump.
      "RICOCHET",
      "THUMP",
    ]);
    for (const cause of CRUMBS_DEATH_CAUSES_V7)
      expect(deathLeavesCrumbsV7(state, dead("FIGHTER"), cause), cause).toBe(
        true,
      );
    // Removals leave none.
    for (const cause of [
      "DISBAND",
      "ELIMINATION",
      "BRAIN_LOST",
      "KABOOM",
      "REWARD",
    ])
      expect(deathLeavesCrumbsV7(state, dead("FIGHTER"), cause), cause).toBe(
        false,
      );
    // The eight trainable land roles (the Jawbreaker since the ninth unit,
    // 7r55), never the Golem or a boat.
    expect(
      UNIT_ROLE_IDS_V7.filter((role) =>
        deathLeavesCrumbsV7(state, dead(role), "ATTACK"),
      ),
    ).toEqual([
      "FIGHTER",
      "RAIDER",
      "MARKSMAN",
      "GUARD",
      "CAPTAIN",
      "CATAPULT",
      "KNIGHT",
      "SWORDSMAN",
    ]);
    // Not embarked, not on water, not owned by another seat (a
    // mind-controlled Candy unit's owner is its controller). The Candy
    // redesign: a settlement site (a village, a city center) holds Crumbs.
    expect(
      deathLeavesCrumbsV7(
        state,
        { ...dead("FIGHTER", at(6, 1)), form: "EMBARKED" },
        "ATTACK",
      ),
    ).toBe(false);
    expect(
      deathLeavesCrumbsV7(state, dead("FIGHTER", at(6, 1)), "ATTACK"),
    ).toBe(false);
    for (const site of [at(5, 5), at(8, 8), at(2, 8)])
      expect(deathLeavesCrumbsV7(state, dead("FIGHTER", site), "ATTACK")).toBe(
        true,
      );
    expect(
      deathLeavesCrumbsV7(
        state,
        { ...dead("FIGHTER"), ownerId: seatIdV7(state, 1) },
        "ATTACK",
      ),
    ).toBe(false);
    // Not on a Rift, a chest, or a curiosity.
    const rift = patchTileV7(state, at(4, 4), { terrain: "RIFT" });
    expect(deathLeavesCrumbsV7(rift, dead("FIGHTER", at(4, 4)), "ATTACK")).toBe(
      false,
    );
    expect(
      deathLeavesCrumbsV7(
        { ...state, treasureChests: [at(4, 4)] },
        dead("FIGHTER", at(4, 4)),
        "ATTACK",
      ),
    ).toBe(false);
    expect(
      deathLeavesCrumbsV7(
        {
          ...state,
          curiosities: [{ kind: "FOUNTAIN", at: at(4, 4) }] as never,
        },
        dead("FIGHTER", at(4, 4)),
        "ATTACK",
      ),
    ).toBe(false);
    // No Crumbs in a match without a Candy seat.
    const other = candyFieldV7(
      [
        { seat: 0, role: "FIGHTER", at: at(5, 3) },
        { seat: 1, role: "FIGHTER", at: at(5, 2) },
      ],
      { factions: ["ORIGINAL", "UNDEAD"] },
    );
    expect(
      deathLeavesCrumbsV7(
        other,
        { ...dead("FIGHTER"), ownerId: seatIdV7(other, 0) },
        "ATTACK",
      ),
    ).toBe(false);
  });

  it("leaves none for a unit that rises, a Golem, or a controlled Candy unit, and leaves them on a village", () => {
    // Infect: a Toffee Trooper killed by a Zombie rises as a Zombie.
    const infect = candyFieldV7(
      [
        { seat: 1, role: "GUARD", at: at(5, 3) },
        { seat: 0, role: "FIGHTER", at: at(5, 2), hp: 1 },
      ],
      { factions: ["CANDY", "UNDEAD"], activeSeat: 1 },
    );
    const risen = attackV7(infect, at(5, 3), at(5, 2));
    expect(kindsV7(risen.events)).toContain("UNIT_INFECTED");
    expect(risen.state.crumbs).toEqual([]);
    expect(kindsV7(risen.events)).not.toContain("CRUMBS_LEFT");
    // The Golem leaves none; a Toffee Trooper on a village leaves Crumbs
    // there (the Candy redesign, section 8.1).
    for (const [role, where] of [
      ["JUGGERNAUT", at(5, 2)],
      ["FIGHTER", at(5, 5)],
    ] as const) {
      const state = candyFieldV7(
        [
          { seat: 1, role: "KNIGHT", at: { x: where.x, y: where.y + 1 } },
          { seat: 0, role, at: where, hp: 1 },
        ],
        { activeSeat: 1 },
      );
      const run = attackV7(state, { x: where.x, y: where.y + 1 }, where);
      expect(run.target, role).toBeUndefined();
      expect(
        run.state.crumbs.map((entry) => entry.at),
        role,
      ).toEqual(role === "FIGHTER" ? [where] : []);
    }
    // A mind-controlled Candy unit dies as its Martian controller's unit.
    const controlled = candyFieldV7(
      [
        { seat: 0, role: "CAPTAIN", at: at(5, 4) },
        {
          seat: 1,
          role: "FIGHTER",
          at: at(5, 3),
          hp: 1,
          controlledBy: at(5, 4),
        },
        { seat: 1, role: "KNIGHT", at: at(5, 2) },
      ],
      { factions: ["MARTIAN", "CANDY"], activeSeat: 1 },
    );
    const killed = attackV7(controlled, at(5, 2), at(5, 3));
    expect(killed.target).toBeUndefined();
    expect(killed.state.crumbs).toEqual([]);
    expect(kindsV7(killed.events)).not.toContain("CRUMBS_LEFT");
  });

  it("occupies nothing: units move through, stop on, and attack across Crumbs", () => {
    const state = candyFieldV7(
      [
        { seat: 0, role: "RAIDER", at: at(5, 3) },
        { seat: 1, role: "FIGHTER", at: at(1, 1) },
      ],
      { crumbs: [{ at: at(5, 4), role: "FIGHTER" }] },
    );
    // An own unit passes over and ends on them without eating them.
    const through = moveTo(state, at(5, 3), at(5, 5));
    expect(through.state.crumbs).toHaveLength(1);
    const onto = moveTo(state, at(5, 3), at(5, 4));
    expect(onto.state.crumbs).toHaveLength(1);
    expect(eaten(onto.events)).toEqual([]);
  });
});

describe("going stale (section 6.2)", () => {
  it("counts down at each End Turn of the Crumbs' owner only, and removes them with one event", () => {
    const state = candyFieldV7(
      [
        { seat: 0, role: "FIGHTER", at: at(8, 8) },
        { seat: 1, role: "FIGHTER", at: at(2, 8) },
      ],
      {
        crumbs: [
          { at: at(5, 3), role: "FIGHTER", turnsLeft: 3 },
          { at: at(4, 2), role: "KNIGHT", turnsLeft: 1 },
          { at: at(6, 2), role: "RAIDER", turnsLeft: 1 },
        ],
      },
    );
    const candy = activeIdV7(state);
    const first = endTurn(state);
    expect(
      first.events.filter((event) => event.kind === "CRUMBS_STALE"),
    ).toEqual([
      { kind: "CRUMBS_STALE", playerId: candy, tiles: [at(4, 2), at(6, 2)] },
    ]);
    const kinds = kindsV7(first.events);
    expect(kinds.indexOf("CRUMBS_STALE")).toBeLessThan(
      kinds.indexOf("INCOME_PREVIEWED"),
    );
    expect(first.state.crumbs).toMatchObject([{ at: at(5, 3), turnsLeft: 2 }]);
    // The enemy's End Turn does not count.
    const enemy = endTurn(first.state);
    expect(enemy.state.crumbs).toEqual(first.state.crumbs);
    expect(kindsV7(enemy.events)).not.toContain("CRUMBS_STALE");
    const second = endTurn(enemy.state);
    expect(second.state.crumbs).toMatchObject([{ turnsLeft: 1 }]);
    expect(kindsV7(second.events)).not.toContain("CRUMBS_STALE");
    const third = endTurn(endTurn(second.state).state);
    expect(third.state.crumbs).toEqual([]);
    expect(
      third.events.find((event) => event.kind === "CRUMBS_STALE"),
    ).toMatchObject({ tiles: [at(5, 3)] });
  });

  it("gives Crumbs left on an enemy turn three Candy turns", () => {
    const state = candyFieldV7(
      [
        { seat: 1, role: "KNIGHT", at: at(5, 3) },
        { seat: 0, role: "FIGHTER", at: at(5, 2), hp: 1 },
        { seat: 0, role: "FIGHTER", at: at(8, 8) },
        { seat: 1, role: "FIGHTER", at: at(2, 8) },
      ],
      { activeSeat: 1, techs: { 0: [] } },
    );
    let current = attackV7(state, at(5, 3), at(5, 2)).state;
    // Move the Knight off the Crumbs (it does not eat: no Move ended there).
    const left: number[] = [];
    for (let turn = 0; turn < 6; turn += 1) {
      current = endTurn(current).state;
      left.push(crumbsOnV7(current, at(5, 2))?.turnsLeft ?? 0);
    }
    // End Turns: enemy, Candy, enemy, Candy, enemy, Candy.
    expect(left).toEqual([3, 2, 2, 1, 1, 0]);
  });
});

describe("eating Crumbs and the Peppermint Surprise (section 6.3)", () => {
  const withCrumbs = (
    pieces: readonly CandyPieceV7[],
    options: Parameters<typeof candyFieldV7>[1] = {},
  ) =>
    candyFieldV7(pieces, {
      activeSeat: 1,
      crumbs: [{ at: at(5, 3), role: "KNIGHT" }],
      ...options,
    });

  it("a hostile ground unit that ends its Move on Crumbs eats them and takes 3", () => {
    const state = withCrumbs([
      { seat: 1, role: "FIGHTER", at: at(5, 2) },
      { seat: 0, role: "FIGHTER", at: at(8, 8) },
    ]);
    const candy = seatIdV7(state, 0);
    const eater = unitAtV7(state, at(5, 2));
    const preview = previewCrumbsEatV7(activeViewV7(state), eater.id, at(5, 3));
    expect(preview).toEqual({
      at: at(5, 3),
      ownerId: candy,
      role: "KNIGHT",
      damage: 3,
      shieldDamage: 0,
      dies: false,
    });
    const moved = moveTo(state, at(5, 2), at(5, 3));
    expect(eaten(moved.events)).toEqual([
      {
        kind: "CRUMBS_EATEN",
        playerId: candy,
        at: at(5, 3),
        role: "KNIGHT",
        unitId: eater.id,
        damage: 3,
        shieldDamage: 0,
        dies: false,
      },
    ]);
    expect(moved.state.crumbs).toEqual([]);
    expect(unitAtV7(moved.state, at(5, 3)).hp).toBe(eater.hp - 3);
    // Right after the Move's own events.
    const kinds = kindsV7(moved.events);
    expect(kinds.indexOf("CRUMBS_EATEN")).toBeGreaterThan(
      kinds.indexOf("UNIT_MOVED"),
    );
    // No preview for a tile without Crumbs or a unit that would not eat.
    expect(
      previewCrumbsEatV7(activeViewV7(state), eater.id, at(4, 3)),
    ).toBeNull();
  });

  it("takes nothing without Peppermint Surprise, and the bite is public", () => {
    const state = withCrumbs(
      [
        { seat: 1, role: "FIGHTER", at: at(5, 2) },
        { seat: 0, role: "FIGHTER", at: at(8, 8) },
      ],
      { techs: { 0: ["DRILL", "FORTIFICATION"] } },
    );
    const candy = seatIdV7(state, 0);
    expect(crumbsBiteV7(state, candy)).toBe(0);
    expect(crumbsBiteV7(activeViewV7(state), candy)).toBe(0);
    expect(activeViewV7(state).crumbs[0]).toMatchObject({ bite: 0 });
    const moved = moveTo(state, at(5, 2), at(5, 3));
    expect(eaten(moved.events)).toMatchObject([
      { damage: 0, shieldDamage: 0, dies: false },
    ]);
    expect(moved.state.crumbs).toEqual([]);
    expect(unitAtV7(moved.state, at(5, 3)).hp).toBe(12);
  });

  it("is not eaten by a flyer, an own unit, a unit passing over, or a unit placed or pushed onto them", () => {
    // A Martian Saucer flies: it ends on the Crumbs and eats nothing.
    const saucer = withCrumbs(
      [
        { seat: 1, role: "RAIDER", at: at(5, 2) },
        { seat: 0, role: "FIGHTER", at: at(8, 8) },
      ],
      { factions: ["CANDY", "MARTIAN"] },
    );
    const flown = moveTo(saucer, at(5, 2), at(5, 3));
    expect(flown.state.crumbs).toHaveLength(1);
    expect(eaten(flown.events)).toEqual([]);
    expect(
      previewCrumbsEatV7(
        activeViewV7(saucer),
        unitAtV7(saucer, at(5, 2)).id,
        at(5, 3),
      ),
    ).toBeNull();
    // A Tripod walks: it eats.
    const tripod = withCrumbs(
      [
        { seat: 1, role: "CATAPULT", at: at(5, 2) },
        { seat: 0, role: "FIGHTER", at: at(8, 8) },
      ],
      { factions: ["CANDY", "MARTIAN"] },
    );
    expect(eaten(moveTo(tripod, at(5, 2), at(5, 3)).events)).toHaveLength(1);
    // A hostile Raider passing over them ends elsewhere.
    const passing = withCrumbs([
      { seat: 1, role: "RAIDER", at: at(5, 2) },
      { seat: 0, role: "FIGHTER", at: at(8, 8) },
    ]);
    const through = offeredV7(passing, "MOVE").find(
      (command) =>
        command.kind === "MOVE" &&
        command.path.length === 2 &&
        sameV7(command.path[0] as CoordV7, at(5, 3)),
    );
    if (through === undefined) throw new Error("no Move over the Crumbs");
    const passed = playV7(passing, through);
    expect(passed.state.crumbs).toHaveLength(1);
    expect(eaten(passed.events)).toEqual([]);
    // A Juggernaut's Push moves a hostile unit onto the Crumbs: not eaten.
    // Since the giants' signatures (`pulp_wars-w49.30`) only the Human
    // Juggernaut pushes: a third seat's Human Juggernaut pushes an Undead
    // Zombie onto the Candy Crumbs (three seats on the 14 x 14 board).
    const pushed = candyFieldV7(
      [
        { seat: 1, role: "JUGGERNAUT", at: at(6, 7) },
        { seat: 2, role: "GUARD", at: at(6, 6) },
        { seat: 0, role: "FIGHTER", at: at(2, 2) },
        { seat: 2, role: "FIGHTER", at: at(11, 2) },
      ],
      {
        factions: ["CANDY", "ORIGINAL", "UNDEAD"],
        activeSeat: 1,
        crumbs: [{ at: at(6, 5), role: "KNIGHT" }],
      },
    );
    const push = attackV7(pushed, at(6, 7), at(6, 6));
    expect(hasUnitAtV7(push.state, at(6, 5))).toBe(true);
    expect(push.state.crumbs).toHaveLength(1);
    expect(eaten(push.events)).toEqual([]);
  });

  it("is eaten at the end of an Escape Move and of a landing", () => {
    const escape = candyFieldV7(
      [
        { seat: 1, role: "RAIDER", at: at(5, 2) },
        { seat: 0, role: "GUARD", at: at(5, 1) },
      ],
      { activeSeat: 1, crumbs: [{ at: at(5, 4), role: "FIGHTER" }] },
    );
    const struck = attackV7(escape, at(5, 2), at(5, 1));
    // The Raider was bounced off the Marshmallow to (5, 3); it may still
    // Escape, and its Escape Move onto the Crumbs eats them.
    const raider = struck.attacker;
    if (raider === undefined) throw new Error("the Raider died");
    expect(raider.activation.escapeAvailable).toBe(true);
    const escaped = moveTo(struck.state, raider.at, at(5, 4));
    expect(eaten(escaped.events)).toMatchObject([{ unitId: raider.id }]);
    const landing = candyFieldV7(
      [
        { seat: 1, role: "FIGHTER", at: at(5, 2), form: "EMBARKED" },
        { seat: 0, role: "FIGHTER", at: at(8, 8) },
      ],
      {
        activeSeat: 1,
        water: [at(5, 2)],
        crumbs: [{ at: at(5, 3), role: "FIGHTER" }],
      },
    );
    const unit = unitAtV7(landing, at(5, 2));
    expect(
      previewCrumbsEatV7(activeViewV7(landing), unit.id, at(5, 3)),
    ).toMatchObject({ damage: 3 });
    const landed = playV7(landing, {
      kind: "DISEMBARK",
      unitId: unit.id,
      at: at(5, 3),
    });
    expect(eaten(landed.events)).toMatchObject([
      { unitId: unit.id, damage: 3 },
    ]);
    expect(landed.state.crumbs).toEqual([]);
  });

  it("reduces the bite by Armoured, caps it by Plated, and takes it from a Shield first", () => {
    const bite = (
      faction: "DINOSAUR" | "DWARF" | "MARTIAN",
      role: UnitRoleIdV7,
    ) => {
      const state = withCrumbs(
        [
          { seat: 1, role, at: at(5, 2) },
          { seat: 0, role: "FIGHTER", at: at(8, 8) },
        ],
        { factions: ["CANDY", faction] },
      );
      const unit = unitAtV7(state, at(5, 2));
      const preview = previewCrumbsEatV7(
        activeViewV7(state),
        unit.id,
        at(5, 3),
      );
      const moved = moveTo(state, at(5, 2), at(5, 3));
      const event = eaten(moved.events)[0];
      if (event?.kind !== "CRUMBS_EATEN") throw new Error("not eaten");
      // The preview equals the resolution.
      expect(preview).toMatchObject({
        damage: event.damage,
        shieldDamage: event.shieldDamage,
        dies: event.dies,
      });
      expect(unitAtV7(moved.state, at(5, 3)).hp).toBe(unit.hp - event.damage);
      return {
        damage: event.damage,
        shieldDamage: event.shieldDamage,
        shieldLeft: shieldAtV7(moved.state, at(5, 3)),
      };
    };
    // An Ankylosaurus takes 2 (Armoured).
    expect(bite("DINOSAUR", "GUARD")).toMatchObject({ damage: 2 });
    // A Steam Tank's Plated cap of 4 does not change a 3.
    expect(bite("DWARF", "KNIGHT")).toMatchObject({ damage: 3 });
    // A Ray Gunner's Shield of 2 absorbs 2 and 1 reaches its HP.
    expect(bite("MARTIAN", "MARKSMAN")).toEqual({
      damage: 1,
      shieldDamage: 2,
      shieldLeft: 0,
    });
  });

  it("kills an eater as an ordinary death with no unit credit: a Grave, a rising, and a blast chain", () => {
    // A plain kill: the cause is PEPPERMINT and nobody's kills grow.
    const plain = withCrumbs([
      { seat: 1, role: "FIGHTER", at: at(5, 2), hp: 3 },
      { seat: 0, role: "FIGHTER", at: at(8, 8) },
    ]);
    const eater = unitAtV7(plain, at(5, 2));
    expect(
      previewCrumbsEatV7(activeViewV7(plain), eater.id, at(5, 3)),
    ).toMatchObject({ damage: 3, dies: true });
    const died = moveTo(plain, at(5, 2), at(5, 3));
    expect(died.events).toContainEqual({
      kind: "UNIT_DIED",
      unitId: eater.id,
      cause: "PEPPERMINT",
    });
    expect(hasUnitAtV7(died.state, at(5, 3))).toBe(false);
    expect(died.state.units.every((unit) => unit.kills === 0)).toBe(true);
    // A Grave where the Grave rules allow (an Undead seat is in the match).
    // Three seats on the 14 x 14 board: capitals (2, 2), (11, 11), (11, 2).
    const grave = candyFieldV7(
      [
        { seat: 1, role: "RAIDER", at: at(6, 5), hp: 2 },
        { seat: 0, role: "FIGHTER", at: at(2, 2) },
        { seat: 2, role: "FIGHTER", at: at(11, 2) },
      ],
      {
        factions: ["CANDY", "ORIGINAL", "UNDEAD"],
        activeSeat: 1,
        crumbs: [{ at: at(6, 6), role: "KNIGHT" }],
      },
    );
    const buried = moveTo(grave, at(6, 5), at(6, 6));
    const kinds = kindsV7(buried.events);
    const eatenAt = kinds.indexOf("CRUMBS_EATEN");
    expect(kinds.slice(eatenAt, eatenAt + 3)).toEqual([
      "CRUMBS_EATEN",
      "UNIT_DIED",
      "GRAVE_CREATED",
    ]);
    expect(buried.state.graves).toEqual([at(6, 6)]);
    expect(buried.state.crumbs).toEqual([]);
  });

  it("explodes an exploding eater with its chain, and leaves Crumbs for a Candy unit the blast kills", () => {
    const state = candyFieldV7(
      [
        { seat: 1, role: "KNIGHT", at: at(5, 2), hp: 3 },
        { seat: 0, role: "FIGHTER", at: at(5, 4), hp: 4 },
        { seat: 0, role: "FIGHTER", at: at(8, 8) },
      ],
      {
        factions: ["CANDY", "GOBLIN"],
        activeSeat: 1,
        crumbs: [{ at: at(5, 3), role: "KNIGHT" }],
      },
    );
    const buggy = unitAtV7(state, at(5, 2));
    const moved = moveTo(state, at(5, 2), at(5, 3));
    const kinds = kindsV7(moved.events);
    expect(kinds).toContain("EXPLOSION_RESOLVED");
    expect(moved.events).toContainEqual({
      kind: "UNIT_DIED",
      unitId: buggy.id,
      cause: "PEPPERMINT",
    });
    // The Scrap Buggy's death blast (4) kills the Toffee Trooper next to it, which
    // leaves its own Crumbs. The Peppermint death is credited to the Candy
    // seat, which has no Plunder; the blast's kill is the Goblin seat's.
    expect(hasUnitAtV7(moved.state, at(5, 4))).toBe(false);
    expect(moved.state.crumbs).toMatchObject([
      { at: at(5, 4), role: "FIGHTER" },
    ]);
    expect(
      moved.events.filter((event) => event.kind === "PLUNDER_AWARDED"),
    ).toEqual([
      {
        kind: "PLUNDER_AWARDED",
        playerId: seatIdV7(state, 1),
        kills: 1,
        coins: 2,
      },
    ]);
    expect(moved.state.units.every((unit) => unit.kills === 0)).toBe(true);
  });

  it("removes a Candy seat's Crumbs when the state prunes them for an eliminated owner", () => {
    const state = candyFieldV7(
      [
        { seat: 0, role: "FIGHTER", at: at(8, 8) },
        { seat: 1, role: "FIGHTER", at: at(2, 8) },
      ],
      { crumbs: [{ at: at(5, 3), role: "FIGHTER" }] },
    );
    // A Crumbs owner must be an active Candy seat.
    expect(
      parseGameStateV7({
        ...state,
        crumbs: state.crumbs.map((entry) => ({
          ...entry,
          ownerId: seatIdV7(state, 1),
        })),
      }),
    ).toBeNull();
  });
});

describe("the Re-bake command (section 6.4, as the Candy redesign changed it)", () => {
  // The Candy redesign (`pulp_wars-jdb.12`, RULESET_7_CANDY_REDESIGN.md
  // section 8.1): reach 2, scooped from under any unit, the copy beside the
  // Confectioner, and one unit over the home city's capacity.
  const CONFECTIONER = at(5, 3);
  const CRUMBS = at(5, 4);
  const PLACE = at(4, 2);
  const field = (
    extra: Partial<CandyPieceV7> = {},
    options: Parameters<typeof candyFieldV7>[1] = {},
    pieces: readonly CandyPieceV7[] = [],
  ) =>
    candyFieldV7(
      [
        { seat: 0, role: "CAPTAIN", at: CONFECTIONER, ...extra },
        { seat: 1, role: "FIGHTER", at: at(1, 1) },
        ...pieces,
      ],
      { crumbs: [{ at: CRUMBS, role: "KNIGHT" }], ...options },
    );
  const rebake = (
    state: GameStateV7,
    from = CRUMBS,
    where = PLACE,
  ): CommandV7 => ({
    kind: "REBAKE",
    unitId: unitAtV7(state, CONFECTIONER).id,
    from,
    at: where,
  });

  it("bakes the fallen role back beside the Confectioner at half price and half HP, exhausted, homed to its city", () => {
    const state = field();
    const candy = activeIdV7(state);
    const confectioner = unitAtV7(state, CONFECTIONER);
    const coins = state.players[0]?.coins ?? 0;
    const preview = previewRebakeV7(activeViewV7(state), confectioner.id);
    expect(preview).toMatchObject({
      unitId: confectioner.id,
      cityId: confectioner.homeCityId,
    });
    // One option per free tile around the Confectioner, all from the pile.
    expect(preview?.options).toHaveLength(8);
    expect(preview?.options).toContainEqual({
      from: CRUMBS,
      at: PLACE,
      role: "KNIGHT",
      cost: 5,
      hp: 7,
    });
    expect(preview?.rebakeCapacity).toBe((preview?.capacity ?? 0) + 1);
    const result = playV7(state, rebake(state));
    const baked = unitAtV7(result.state, PLACE);
    expect(result.events[0]).toEqual({
      kind: "UNIT_REBAKED",
      playerId: candy,
      unitId: confectioner.id,
      rebakedUnitId: baked.id,
      role: "KNIGHT",
      from: CRUMBS,
      at: PLACE,
      cityId: confectioner.homeCityId,
      cost: 5,
      hp: 7,
    });
    expect(baked).toMatchObject({
      id: state.nextEntityId,
      ownerId: candy,
      homeCityId: confectioner.homeCityId,
      role: "KNIGHT",
      form: "LAND",
      hp: 7,
      maxHp: 14,
      kills: 0,
      veteran: false,
      captureEligible: false,
      activation: { moved: true, attacked: true, handled: true },
    });
    expect(hasUnitAtV7(result.state, CRUMBS)).toBe(false);
    expect(result.state.players[0]?.coins).toBe(coins - 5);
    expect(result.state.crumbs).toEqual([]);
    expect(unitAtV7(result.state, CONFECTIONER).activation).toMatchObject({
      specialActed: true,
      handled: true,
    });
    // No city action is spent, and the new unit cannot move, act, or Rush.
    expect(result.state.cities.map((city) => city.cityActionAvailable)).toEqual(
      state.cities.map((city) => city.cityActionAvailable),
    );
    expect(
      offeredV7(result.state).filter(
        (command) => "unitId" in command && command.unitId === baked.id,
      ),
    ).toEqual([]);
    // The preview's slot count: one more unit is assigned afterwards.
    expect(preview?.usedSlots).toBe(1);
  });

  it("reaches 2 and not 3, may follow a Move, and is offered exactly when it is accepted", () => {
    const state = candyFieldV7(
      [
        { seat: 0, role: "CAPTAIN", at: at(5, 1) },
        { seat: 1, role: "FIGHTER", at: at(1, 1) },
      ],
      {
        crumbs: [
          { at: at(5, 4), role: "KNIGHT" },
          { at: at(7, 4), role: "FIGHTER" },
          { at: at(9, 4), role: "RAIDER" },
        ],
      },
    );
    // Three tiles away: nothing.
    expect(offeredV7(state, "REBAKE")).toEqual([]);
    const moved = moveTo(state, at(5, 1), at(6, 2)).state;
    const offered = expectOfferedAcceptedV7(moved, "REBAKE");
    // Within 2 of (6, 2): the Knight's and the Trooper's piles, never the
    // Racer's (3 away); every copy lands next to the Confectioner.
    const sources = new Set(
      offered.map((command) =>
        command.kind === "REBAKE" ? `${command.from.x},${command.from.y}` : "",
      ),
    );
    expect([...sources].sort()).toEqual(["5,4", "7,4"]);
    for (const command of offered)
      if (command.kind === "REBAKE")
        expect(
          Math.max(Math.abs(command.at.x - 6), Math.abs(command.at.y - 2)),
        ).toBe(1);
    expect(
      previewRebakeV7(activeViewV7(moved), unitAtV7(moved, at(6, 2)).id)
        ?.options.length,
    ).toBe(offered.length);
  });

  it("scoops the Crumbs from under a hostile or an own unit, and bakes onto the Crumbs tile itself when it is free", () => {
    for (const seat of [0, 1]) {
      const covered = field({}, {}, [{ seat, role: "GUARD", at: CRUMBS }]);
      const result = playV7(covered, rebake(covered));
      expect(result.state.crumbs, String(seat)).toEqual([]);
      expect(unitAtV7(result.state, CRUMBS).role, String(seat)).toBe("GUARD");
      expect(unitAtV7(result.state, PLACE).role, String(seat)).toBe("KNIGHT");
    }
    const open = field();
    const onPile = playV7(open, rebake(open, CRUMBS, CRUMBS));
    expect(unitAtV7(onPile.state, CRUMBS).role).toBe("KNIGHT");
  });

  it("bakes Crumbs left on a village and on a city center", () => {
    for (const site of [at(5, 5), at(8, 8)]) {
      const state = candyFieldV7(
        [
          { seat: 0, role: "CAPTAIN", at: at(6, 6) },
          { seat: 1, role: "FIGHTER", at: at(1, 1) },
        ],
        { crumbs: [{ at: site, role: "FIGHTER" }] },
      );
      const command = offeredV7(state, "REBAKE").find(
        (candidate) =>
          candidate.kind === "REBAKE" && sameV7(candidate.from, site),
      );
      expect(command, `${site.x},${site.y}`).toBeDefined();
      if (command !== undefined)
        expect(playV7(state, command).state.crumbs).toEqual([]);
    }
  });

  it("bakes a unit back the same turn it fell to a strike-back", () => {
    const state = candyFieldV7([
      { seat: 0, role: "CAPTAIN", at: at(5, 2) },
      { seat: 0, role: "FIGHTER", at: at(5, 4), hp: 1 },
      { seat: 1, role: "GUARD", at: at(5, 5) },
    ]);
    const run = attackV7(state, at(5, 4), at(5, 5));
    expect(run.attacker).toBeUndefined();
    expect(run.state.crumbs.map((entry) => entry.at)).toEqual([at(5, 4)]);
    const command = offeredV7(run.state, "REBAKE").find(
      (candidate) =>
        candidate.kind === "REBAKE" && sameV7(candidate.from, at(5, 4)),
    );
    expect(command).toBeDefined();
    if (command !== undefined)
      expect(playV7(run.state, command).events[0]).toMatchObject({
        kind: "UNIT_REBAKED",
        role: "FIGHTER",
        hp: 5,
      });
  });

  it("rejects each row in order, atomically", () => {
    // Row 2: not a Confectioner; a mind-controlled Confectioner.
    const gumdrop = field({ role: "FIGHTER" });
    expect(rejectedV7(gumdrop, rebake(gumdrop))).toEqual({
      code: "UNIT_ROLE_INVALID",
      params: { role: "FIGHTER" },
    });
    const controlled = candyFieldV7(
      [
        { seat: 0, role: "CAPTAIN", at: at(6, 3) },
        {
          seat: 1,
          role: "CAPTAIN",
          at: CONFECTIONER,
          hp: 5,
          controlledBy: at(6, 3),
        },
        { seat: 1, role: "FIGHTER", at: at(1, 1) },
      ],
      {
        factions: ["MARTIAN", "CANDY"],
        crumbs: [{ at: CRUMBS, role: "KNIGHT", seat: 1 }],
      },
    );
    expect(rejectedV7(controlled, rebake(controlled)).code).toBe(
      "UNIT_ROLE_INVALID",
    );
    // Row 3: Crashed.
    const crashed = field({ rush: "CRASHED" });
    expect(rejectedV7(crashed, rebake(crashed)).code).toBe("UNIT_CRASHED");
    // Row 4: a used primary action. Ice Folk Freeze (`pulp_wars-w49.37`): a
    // Frozen Confectioner is refused before it (`UNIT_FROZEN`).
    const acted = field({ activation: { attacked: true, attacksUsed: 1 } });
    expect(rejectedV7(acted, rebake(acted)).code).toBe("UNIT_ALREADY_ACTED");
    const sluggish = field(
      { frozen: { turnsLeft: 1 }, activation: movedV7(1) },
      { factions: ["CANDY", "ICE_FOLK"] },
    );
    expect(rejectedV7(sluggish, rebake(sluggish)).code).toBe("UNIT_FROZEN");
    // Row 6: an orphaned Confectioner.
    const orphan = patchUnitV7(field(), CONFECTIONER, { homeCityId: null });
    expect(rejectedV7(orphan, rebake(orphan))).toEqual({
      code: "REBAKE_NOT_LEGAL",
      params: { reason: "NO_HOME" },
    });
    // Row 7: no Crumbs there, Crumbs three tiles away, or another seat's.
    const base = field();
    expect(rejectedV7(base, rebake(base, at(4, 4)))).toEqual({
      code: "REBAKE_NOT_LEGAL",
      params: { reason: "NO_CRUMBS" },
    });
    const far = field({}, { crumbs: [{ at: at(8, 3), role: "KNIGHT" }] });
    expect(rejectedV7(far, rebake(far, at(8, 3))).params).toEqual({
      reason: "NO_CRUMBS",
    });
    const mirror = field(
      {},
      {
        factions: ["CANDY", "CANDY"],
        crumbs: [{ at: CRUMBS, role: "KNIGHT", seat: 1 }],
      },
    );
    expect(rejectedV7(mirror, rebake(mirror)).params).toEqual({
      reason: "NO_CRUMBS",
    });
    // Row 8: not next to the Confectioner; a unit of any owner on the tile;
    // a chest; a Mountain without Engineering.
    expect(rejectedV7(base, rebake(base, CRUMBS, at(5, 5))).params).toEqual({
      reason: "TILE",
    });
    for (const seat of [0, 1]) {
      const blocked = field({}, {}, [{ seat, role: "FIGHTER", at: PLACE }]);
      expect(rejectedV7(blocked, rebake(blocked)), String(seat)).toEqual({
        code: "REBAKE_NOT_LEGAL",
        params: { reason: "TILE" },
      });
    }
    const chest = checkedV7({ ...field(), treasureChests: [PLACE] });
    expect(rejectedV7(chest, rebake(chest)).params).toEqual({
      reason: "TILE",
    });
    const mountain = patchTileV7(
      field(
        {},
        {
          techs: {
            0: withoutTechsV7("CANDY", "ENGINEERING"),
          },
        },
      ),
      PLACE,
      { terrain: "MOUNTAIN", biome: "HIGHLANDS" },
    );
    expect(rejectedV7(mountain, rebake(mountain)).params).toEqual({
      reason: "TILE",
    });
    // Row 10: Coins (Arms Industry never lowers the price: 5 for a Bear).
    const poor = field({}, { coins: 4 });
    expect(rejectedV7(poor, rebake(poor))).toEqual({
      code: "INSUFFICIENT_COINS",
      params: { cost: 5 },
    });
    const exact = field({}, { coins: 5 });
    expect(playV7(exact, rebake(exact)).state.players[0]?.coins).toBe(0);
  });

  it("may put the home city one over its capacity, not two, and a besieged home does not block it", () => {
    const open = field();
    const home = open.cities.find(
      (city) => city.id === unitAtV7(open, CONFECTIONER).homeCityId,
    );
    if (home === undefined) throw new Error("no home city");
    const capacity = cityUnitCapacityV7(open, home);
    // The Confectioner uses one slot; fill the rest, then one over.
    const fillers = Array.from({ length: capacity }, (_, index) => ({
      seat: 0,
      role: "FIGHTER" as const,
      at: at(7 + (index % 3), 7 + Math.floor(index / 3)),
    }));
    const full = field({}, {}, fillers.slice(1));
    expect(
      previewRebakeV7(activeViewV7(full), unitAtV7(full, CONFECTIONER).id),
    ).toMatchObject({ usedSlots: capacity, capacity });
    const over = playV7(full, rebake(full));
    expect(over.events[0]).toMatchObject({ kind: "UNIT_REBAKED" });
    const alreadyOver = field({}, {}, fillers);
    expect(rejectedV7(alreadyOver, rebake(alreadyOver)).code).toBe(
      "CITY_CAPACITY_FULL",
    );
    expect(
      previewRebakeV7(
        activeViewV7(alreadyOver),
        unitAtV7(alreadyOver, CONFECTIONER).id,
      ),
    ).toBeNull();
    expect(
      queryRebakeBlockerV7(
        activeViewV7(alreadyOver),
        unitAtV7(alreadyOver, CONFECTIONER).id,
      ),
    ).toBe("CITY_CAPACITY_FULL");
    // An enemy on the home center (a siege) changes nothing.
    const besieged = field({}, {}, [
      { seat: 1, role: "FIGHTER", at: at(8, 8) },
    ]);
    expect(playV7(besieged, rebake(besieged)).events[0]).toMatchObject({
      kind: "UNIT_REBAKED",
    });
  });

  it("names why a Confectioner has no Re-bake (the public why-not query)", () => {
    const view = (state: GameStateV7) => activeViewV7(state);
    const id = (state: GameStateV7) => unitAtV7(state, CONFECTIONER).id;
    const open = field();
    expect(queryRebakeBlockerV7(view(open), id(open))).toBeNull();
    const none = field({}, { crumbs: [] });
    expect(queryRebakeBlockerV7(view(none), id(none))).toBe("NO_CRUMBS");
    const crashed = field({ rush: "CRASHED" });
    expect(queryRebakeBlockerV7(view(crashed), id(crashed))).toBe("CRASHED");
    const orphan = patchUnitV7(field(), CONFECTIONER, { homeCityId: null });
    expect(queryRebakeBlockerV7(view(orphan), id(orphan))).toBe("NO_HOME");
    const poor = field({}, { coins: 4 });
    expect(queryRebakeBlockerV7(view(poor), id(poor))).toBe(
      "INSUFFICIENT_COINS",
    );
    // Every tile around it taken.
    const ring = field(
      {},
      {},
      [
        at(4, 2),
        at(5, 2),
        at(6, 2),
        at(4, 3),
        at(6, 3),
        at(4, 4),
        at(5, 4),
        at(6, 4),
      ].map((where) => ({ seat: 1, role: "FIGHTER" as const, at: where })),
    );
    expect(queryRebakeBlockerV7(view(ring), id(ring))).toBe("TILE");
    // Not a Confectioner: no reason at all.
    const gumdrop = field({ role: "FIGHTER" });
    expect(queryRebakeBlockerV7(view(gumdrop), id(gumdrop))).toBeNull();
  });

  it("destroys hostile Field Defense under the new unit and reveals its sight", () => {
    // The copy appears in the enemy's territory, on its Field Defense.
    const base = candyFieldV7(
      [
        { seat: 0, role: "CAPTAIN", at: at(4, 7) },
        { seat: 1, role: "FIGHTER", at: at(1, 1) },
      ],
      { crumbs: [{ at: at(4, 6), role: "FIGHTER" }] },
    );
    const state = fieldDefenseV7(base, at(3, 7));
    const result = playV7(state, {
      kind: "REBAKE",
      unitId: unitAtV7(state, at(4, 7)).id,
      from: at(4, 6),
      at: at(3, 7),
    });
    expect(kindsV7(result.events).slice(0, 2)).toEqual([
      "UNIT_REBAKED",
      "FIELD_DEFENSE_DESTROYED",
    ]);
    expect(result.events[1]).toEqual({
      kind: "FIELD_DEFENSE_DESTROYED",
      at: at(3, 7),
      reason: "OCCUPATION",
    });
    expect(unitAtV7(result.state, at(3, 7))).toMatchObject({
      hp: 5,
      maxHp: 10,
    });
  });

  it("keeps the state valid: a Crumbs entry's tile, owner, role, and turns are checked", () => {
    const state = field();
    const entry = state.crumbs[0];
    if (entry === undefined) throw new Error("no Crumbs");
    const withEntry = (patch: Record<string, unknown>) =>
      parseGameStateV7({ ...state, crumbs: [{ ...entry, ...patch }] });
    expect(parseGameStateV7(state)).not.toBeNull();
    expect(withEntry({ turnsLeft: 0 })).toBeNull();
    expect(withEntry({ turnsLeft: 4 })).toBeNull();
    expect(withEntry({ role: "JUGGERNAUT" })).toBeNull();
    expect(withEntry({ role: "PATROL_BOAT" })).toBeNull();
    // The Candy redesign: a city center and a village hold Crumbs.
    expect(withEntry({ at: at(8, 8) })).not.toBeNull();
    expect(withEntry({ at: at(5, 5) })).not.toBeNull();
    expect(withEntry({ ownerId: seatIdV7(state, 1) })).toBeNull();
    expect(withEntry({ at: at(40, 40) })).toBeNull();
    // Two entries on one tile, and an unsorted list.
    expect(parseGameStateV7({ ...state, crumbs: [entry, entry] })).toBeNull();
    expect(
      parseGameStateV7({
        ...state,
        crumbs: [entry, { ...entry, at: at(4, 2) }],
      }),
    ).toBeNull();
    // A chest tile.
    expect(
      parseGameStateV7({ ...state, treasureChests: [entry.at] }),
    ).toBeNull();
    // No entry in a match without a Candy seat.
    const other = checkedV7(
      candyFieldV7(
        [
          { seat: 0, role: "FIGHTER", at: at(5, 3) },
          { seat: 1, role: "FIGHTER", at: at(1, 1) },
        ],
        { factions: ["ORIGINAL", "UNDEAD"] },
      ),
    );
    expect(
      parseGameStateV7({
        ...other,
        crumbs: [{ ...entry, ownerId: seatIdV7(other, 0) }],
      }),
    ).toBeNull();
    // A rejected command leaves the state untouched.
    const rejected = applyCommandV7(
      state,
      activeIdV7(state),
      rebake(state, at(9, 9)),
    );
    expect(rejected.accepted).toBe(false);
    expect(rejected.state).toBe(state);
  });
});
