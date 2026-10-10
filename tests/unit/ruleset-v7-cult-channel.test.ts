import { describe, expect, it } from "vitest";
import {
  ANCHOR_STRANDS_V7,
  BOARD_SUMMONED_ROLE_IDS_V7,
  CHANNEL_RANGE_V7,
  COMMAND_KIND_ORDER_V7,
  CULT_SUMMONED_ROLE_RULES_V7,
  DISRUPTION_CAUSES_V7,
  DOMAIN_EVENT_KIND_ORDER_V7,
  FAVOUR_PURPOSES_V7,
  HORROR_FAVOUR_COST_V7,
  MIND_CONTROLLED_LOST_ABILITIES_V7,
  NEUTRAL_OWNER_ID_V7,
  SUMMONED_MECHANICAL_ROLES_V7,
  applyCommandV7,
  compareCommandsV7,
  daemonControlV7,
  effectiveRoleRuleV7,
  favourOfV7,
  holdingStrandsV7,
  isLivingUnitV7,
  parseCommandV7,
  parseEventV7,
  parseGameStateV7,
  previewAnchorV7,
  previewBeholdV7,
  previewBooV7,
  previewChannelV7,
  previewSummonV7,
  projectEventsV7,
  queryCombatPreviewV7,
  queryPlayerCommandsV7,
  reachablePlayerMovementPathsV7,
  roleMechanicsV7,
  scoreV7,
  unitFavourValueV7,
  unitRoleMechanicsV7,
  unitRoleRuleV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type DomainEventV7,
  type GameStateV7,
  type UnitRoleIdV7,
} from "../../src/engine/index";
import { checkedV7 } from "../fixtures/v7-builders";
import {
  cultFieldV7,
  withFavourV7,
  withGripV7,
  withHorrorV7,
  withIdolsV7,
  withStrandsV7,
} from "../fixtures/v7-cult";
import {
  applyOkV7,
  endTurnUntilV7,
  seatIdV7,
  unitAtV7,
  type GoblinPieceV7,
} from "../fixtures/v7-goblin-arena";
import {
  expectOfferedAcceptedV7,
  martianFieldV7,
  offeredV7,
  playV7,
  rejectedV7,
} from "../fixtures/v7-martian";
import {
  at,
  attackV7,
  kindsV7,
  mountainV7,
  movedV7,
  moveV7,
  patchUnitV7,
  unexploreV7,
} from "../fixtures/v7-revision20";

/**
 * The Cultists of the Ancient Ones, engine bead E3 (`pulp_wars-mch9.5`,
 * docs/product/RULESET_7_CULTISTS.md sections 6.1, 6.2, 8.1, 8.4, and 8.5):
 * Summon and the Horror, Channel and the strands, the Start Turn check,
 * Behold!, Anchor, and Boo!, with their events, previews, and saves. The
 * disruption rule has its own file
 * (`tests/unit/ruleset-v7-cult-disruption.test.ts`).
 *
 * Every state here is built by hand; no match is played. The field is the
 * two-seat 11 x 11 board of `fieldV7`: seat 0 (the Cult) capital (8, 8)
 * with territory x 7 to 9, y 7 to 9; seat 1 (Human) capital (2, 8) with
 * territory x 1 to 3, y 7 to 9; everything else open Grass, all of it
 * explored by both seats.
 */

const SUMMONER: GoblinPieceV7 = { seat: 0, role: "CAPTAIN", at: at(5, 2) };
const HELPER: GoblinPieceV7 = { seat: 0, role: "FIGHTER", at: at(6, 2) };

/** The value, which the test requires to be there. */
function need<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) throw new Error("missing");
  return value;
}

const summon = (
  state: GameStateV7,
  summoner: CoordV7,
  helper: CoordV7,
  where: CoordV7,
): CommandV7 => ({
  kind: "SUMMON",
  unitId: unitAtV7(state, summoner).id,
  helperUnitId: unitAtV7(state, helper).id,
  at: where,
});
const channel = (
  state: GameStateV7,
  cultist: CoordV7,
  daemon: CoordV7,
): CommandV7 => ({
  kind: "CHANNEL",
  unitId: unitAtV7(state, cultist).id,
  daemonUnitId: unitAtV7(state, daemon).id,
});
const anchor = (
  state: GameStateV7,
  thing: CoordV7,
  cultist: CoordV7,
): CommandV7 => ({
  kind: "ANCHOR",
  unitId: unitAtV7(state, thing).id,
  cultistUnitId: unitAtV7(state, cultist).id,
});
const behold = (state: GameStateV7, bearer: CoordV7): CommandV7 => ({
  kind: "BEHOLD",
  unitId: unitAtV7(state, bearer).id,
});
const boo = (state: GameStateV7, horror: CoordV7): CommandV7 => ({
  kind: "BOO",
  unitId: unitAtV7(state, horror).id,
});
const favour = (state: GameStateV7, seat: number): number =>
  favourOfV7(state, seatIdV7(state, seat));
const strandsOn = (state: GameStateV7, daemon: CoordV7): number => {
  const unit = unitAtV7(state, daemon);
  return holdingStrandsV7(state, state.units, unit);
};
const eventsOf = <K extends DomainEventV7["kind"]>(
  events: readonly DomainEventV7[],
  kind: K,
): Extract<DomainEventV7, { kind: K }>[] =>
  events.filter(
    (event): event is Extract<DomainEventV7, { kind: K }> =>
      event.kind === kind,
  );

/** A summoning field: a Summoner, an Initiate beside it, and 5 Favour. */
const summonField = (
  pieces: readonly GoblinPieceV7[] = [],
  favourAmount = 5,
): GameStateV7 =>
  withFavourV7(cultFieldV7([SUMMONER, HELPER, ...pieces]), 0, favourAmount);

/** A Horror at (5, 4) with the given cultists (and other pieces). */
const horrorField = (
  pieces: readonly GoblinPieceV7[],
  options: Parameters<typeof cultFieldV7>[1] = {},
  horror: Parameters<typeof withHorrorV7>[3] = {},
): GameStateV7 =>
  withHorrorV7(cultFieldV7(pieces, options), 0, at(5, 4), horror);

describe("the Cult's channel: the registration", () => {
  it("adds the five abilities to the roles of sections 4.1, 8.1, and 8.4", () => {
    const abilities = (role: UnitRoleIdV7) =>
      effectiveRoleRuleV7(role, "CULT").abilities;
    for (const role of [
      "FIGHTER",
      "GUARD",
      "MARKSMAN",
      "CAPTAIN",
      "CATAPULT",
      "KNIGHT",
      "SWORDSMAN",
    ] as const) {
      expect(abilities(role), role).toContain("CHANNEL");
      expect(roleMechanicsV7(role, "CULT").robed, role).toBe(true);
    }
    // The Familiar, the Thing, and the ships never channel.
    for (const role of ["RAIDER", "JUGGERNAUT", "PATROL_BOAT"] as const)
      expect(abilities(role), role).not.toContain("CHANNEL");
    expect(abilities("CAPTAIN")).toContain("SUMMON");
    expect(abilities("GUARD")).toContain("BEHOLD");
    expect(abilities("JUGGERNAUT")).toContain("ANCHOR");
    expect(roleMechanicsV7("JUGGERNAUT", "CULT").anchorStrands).toBe(
      ANCHOR_STRANDS_V7,
    );
    expect(ANCHOR_STRANDS_V7).toBe(2);
    expect(CHANNEL_RANGE_V7).toBe(3);
    expect(HORROR_FAVOUR_COST_V7).toBe(5);
    // No other faction has any of them.
    for (const faction of ["ORIGINAL", "UNDEAD", "MARTIAN", "CANDY"] as const)
      for (const role of ["FIGHTER", "CAPTAIN", "GUARD", "JUGGERNAUT"] as const)
        for (const ability of [
          "SUMMON",
          "CHANNEL",
          "BEHOLD",
          "ANCHOR",
          "BOO",
        ] as const)
          expect(
            effectiveRoleRuleV7(role, faction).abilities,
            `${faction} ${role}`,
          ).not.toContain(ability);
  });

  it("needs a Cult seat for Summon, Channel, and Anchor, and keeps the unit tricks", () => {
    for (const ability of ["SUMMON", "CHANNEL", "ANCHOR"] as const)
      expect(MIND_CONTROLLED_LOST_ABILITIES_V7).toContain(ability);
    for (const ability of ["BEHOLD", "BOO"] as const)
      expect(MIND_CONTROLLED_LOST_ABILITIES_V7).not.toContain(ability);
  });

  it("orders the new command and event kinds after the Favour ones", () => {
    const commands = COMMAND_KIND_ORDER_V7 as readonly string[];
    expect(
      commands.slice(commands.indexOf("SEIZE"), commands.indexOf("SEIZE") + 6),
    ).toEqual(["SEIZE", "SUMMON", "CHANNEL", "BEHOLD", "ANCHOR", "BOO"]);
    const events = DOMAIN_EVENT_KIND_ORDER_V7 as readonly string[];
    const from = events.indexOf("FAVOUR_GAINED");
    expect(events.slice(from, from + 11)).toEqual([
      "FAVOUR_GAINED",
      "FAVOUR_SPENT",
      "DAEMON_SUMMONED",
      "STRAND_FORMED",
      "STRAND_BROKEN",
      "IDOL_RAISED",
      "IDOL_DROPPED",
      "ANCHOR_GRIPPED",
      "ANCHOR_BROKEN",
      "UNITS_SCARED",
      "DAEMON_UNBOUND",
    ]);
    expect(FAVOUR_PURPOSES_V7).toEqual(["SUMMON_HORROR"]);
    expect(DISRUPTION_CAUSES_V7).toEqual([
      "HP_LOSS",
      "MOVED",
      "STATUS",
      "OWNER",
      "GONE",
    ]);
  });

  it("parses and orders the five commands", () => {
    const good: CommandV7[] = [
      { kind: "SUMMON", unitId: 31, helperUnitId: 32, at: at(4, 4) } as never,
      { kind: "CHANNEL", unitId: 31, daemonUnitId: 40 } as never,
      { kind: "BEHOLD", unitId: 31 } as never,
      { kind: "ANCHOR", unitId: 31, cultistUnitId: 32 } as never,
      { kind: "BOO", unitId: 31 } as never,
    ];
    for (const command of good)
      expect(parseCommandV7(command), command.kind).toEqual({
        ok: true,
        value: command,
      });
    for (const bad of [
      { kind: "SUMMON", unitId: 31, helperUnitId: 31, at: at(4, 4) },
      { kind: "SUMMON", unitId: 31, helperUnitId: 32 },
      { kind: "SUMMON", unitId: 31, helperUnitId: 32, at: at(4, 4), x: 1 },
      { kind: "CHANNEL", unitId: 31, daemonUnitId: 31 },
      { kind: "CHANNEL", unitId: 31 },
      { kind: "ANCHOR", unitId: 31, cultistUnitId: 31 },
      { kind: "BEHOLD", unitId: 31, at: at(1, 1) },
      { kind: "BOO" },
    ])
      expect(parseCommandV7(bad).ok, JSON.stringify(bad)).toBe(false);
    // By tile, Summoner, then helper; by cultist, then daemon; by Thing,
    // then cultist.
    const order = (left: object, right: object): number =>
      Math.sign(compareCommandsV7(left as CommandV7, right as CommandV7));
    expect(
      order(
        { kind: "SUMMON", unitId: 31, helperUnitId: 33, at: at(4, 4) },
        { kind: "SUMMON", unitId: 31, helperUnitId: 32, at: at(5, 4) },
      ),
    ).toBe(-1);
    expect(
      order(
        { kind: "SUMMON", unitId: 31, helperUnitId: 32, at: at(4, 4) },
        { kind: "SUMMON", unitId: 31, helperUnitId: 33, at: at(4, 4) },
      ),
    ).toBe(-1);
    expect(
      order(
        { kind: "CHANNEL", unitId: 31, daemonUnitId: 41 },
        { kind: "CHANNEL", unitId: 31, daemonUnitId: 40 },
      ),
    ).toBe(1);
    expect(
      order(
        { kind: "ANCHOR", unitId: 31, cultistUnitId: 32 },
        { kind: "ANCHOR", unitId: 31, cultistUnitId: 33 },
      ),
    ).toBe(-1);
    expect(
      order({ kind: "SEIZE", unitId: 1, victimUnitId: 2 }, need(good[0])),
    ).toBe(-1);
  });
});

describe("the Cult's channel: Summon a Horror (section 6.1)", () => {
  it("costs 5 Favour, puts an exhausted Horror beside the Summoner, and both channel it", () => {
    const state = summonField([], 7);
    const command = summon(state, at(5, 2), at(6, 2), at(5, 3));
    const view = viewForV7(state, seatIdV7(state, 0));
    // A Summon that is not offered has no preview.
    expect(
      previewSummonV7(
        view,
        unitAtV7(state, at(6, 2)).id,
        unitAtV7(state, at(5, 2)).id,
        at(5, 3),
      ),
    ).toBeNull();
    const preview = previewSummonV7(
      view,
      unitAtV7(state, at(5, 2)).id,
      unitAtV7(state, at(6, 2)).id,
      at(5, 3),
    );
    expect(preview).toEqual({
      unitId: unitAtV7(state, at(5, 2)).id,
      helperUnitId: unitAtV7(state, at(6, 2)).id,
      at: at(5, 3),
      role: "HORROR",
      hp: 18,
      favour: 5,
      favourAfter: 2,
      control: 1,
      strands: 2,
    });
    const played = playV7(state, command);
    const horror = unitAtV7(played.state, at(5, 3));
    expect(horror).toMatchObject({
      ownerId: seatIdV7(state, 0),
      summoned: "HORROR",
      role: SUMMONED_MECHANICAL_ROLES_V7.HORROR,
      form: "LAND",
      hp: 18,
      maxHp: 18,
      homeCityId: null,
      veteran: false,
      kills: 0,
    });
    expect(horror.id).toBe(state.nextEntityId);
    // Exhausted until the next turn.
    expect(horror.activation).toMatchObject({ handled: true });
    expect(
      queryPlayerCommandsV7(viewForV7(played.state, seatIdV7(state, 0))).filter(
        (offered) => "unitId" in offered && offered.unitId === horror.id,
      ),
    ).toEqual([]);
    expect(favour(played.state, 0)).toBe(2);
    expect(played.state.cult.strands).toEqual([
      { cultistUnitId: unitAtV7(state, at(5, 2)).id, daemonUnitId: horror.id },
      { cultistUnitId: unitAtV7(state, at(6, 2)).id, daemonUnitId: horror.id },
    ]);
    // Both primary actions are spent.
    for (const where of [at(5, 2), at(6, 2)])
      expect(unitAtV7(played.state, where).activation).toMatchObject({
        specialActed: true,
        handled: true,
      });
    expect(kindsV7(played.events).slice(0, 4)).toEqual([
      "FAVOUR_SPENT",
      "DAEMON_SUMMONED",
      "STRAND_FORMED",
      "STRAND_FORMED",
    ]);
    expect(played.events[0]).toEqual({
      kind: "FAVOUR_SPENT",
      playerId: seatIdV7(state, 0),
      purpose: "SUMMON_HORROR",
      amount: 5,
      favour: 2,
    });
    expect(played.events[1]).toEqual({
      kind: "DAEMON_SUMMONED",
      playerId: seatIdV7(state, 0),
      unitId: unitAtV7(state, at(5, 2)).id,
      helperUnitId: unitAtV7(state, at(6, 2)).id,
      daemonUnitId: horror.id,
      role: "HORROR",
      at: at(5, 3),
      hp: 18,
    });
  });

  it("spends the last Favour (the entry goes) and may follow both Moves", () => {
    const state = summonField([], 5);
    const moved = moveV7(moveV7(state, at(5, 2), [at(5, 3)]).state, at(6, 2), [
      at(6, 3),
    ]).state;
    const played = playV7(moved, summon(moved, at(5, 3), at(6, 3), at(5, 4)));
    expect(played.state.cult.favour).toEqual([]);
    expect(favour(played.state, 0)).toBe(0);
    expect(eventsOf(played.events, "FAVOUR_SPENT")[0]?.favour).toBe(0);
  });

  it("is offered for every helper and every free tile, and each is accepted", () => {
    const state = summonField([
      { seat: 0, role: "MARKSMAN", at: at(4, 2) },
      { seat: 0, role: "RAIDER", at: at(5, 1) },
      { seat: 1, role: "FIGHTER", at: at(4, 3) },
    ]);
    const offered = expectOfferedAcceptedV7(state, "SUMMON");
    const summonerId = unitAtV7(state, at(5, 2)).id;
    // Two robed helpers (the Familiar is not one), four free tiles around
    // the Summoner: (4, 1), (6, 1), (5, 3), (6, 3).
    expect(new Set(offered.map((entry) => entry.kind))).toEqual(
      new Set(["SUMMON"]),
    );
    const mine = offered.filter(
      (entry) => entry.kind === "SUMMON" && entry.unitId === summonerId,
    );
    expect(mine).toHaveLength(8);
    expect(
      new Set(
        mine.map((entry) =>
          entry.kind === "SUMMON" ? `${entry.at.x},${entry.at.y}` : "",
        ),
      ),
    ).toEqual(new Set(["4,1", "6,1", "5,3", "6,3"]));
  });

  it("refuses a Summon that section 6.1 does not allow", () => {
    const base = summonField([
      { seat: 0, role: "RAIDER", at: at(5, 1) },
      { seat: 1, role: "FIGHTER", at: at(4, 3) },
      { seat: 0, role: "FIGHTER", at: at(8, 2) },
    ]);
    const good = summon(base, at(5, 2), at(6, 2), at(5, 3));
    const cases: readonly [string, GameStateV7, CommandV7, string, unknown][] =
      [
        [
          "too little Favour",
          withFavourV7(base, 0, 4),
          good,
          "INSUFFICIENT_FAVOUR",
          { cost: 5 },
        ],
        [
          "a helper that is not robed (the Familiar)",
          base,
          summon(base, at(5, 2), at(5, 1), at(5, 3)),
          "SUMMON_NOT_LEGAL",
          { reason: "HELPER" },
        ],
        [
          "an enemy helper",
          base,
          summon(base, at(5, 2), at(4, 3), at(5, 3)),
          "SUMMON_NOT_LEGAL",
          { reason: "HELPER" },
        ],
        [
          "a helper two tiles away",
          base,
          summon(base, at(5, 2), at(8, 2), at(5, 3)),
          "SUMMON_NOT_LEGAL",
          { reason: "HELPER" },
        ],
        [
          "a helper that has acted",
          patchUnitV7(base, at(6, 2), {
            activation: {
              ...unitAtV7(base, at(6, 2)).activation,
              attacked: true,
              attacksUsed: 1,
            },
          }),
          good,
          "SUMMON_NOT_LEGAL",
          { reason: "HELPER" },
        ],
        [
          "an occupied tile",
          base,
          summon(base, at(5, 2), at(6, 2), at(4, 3)),
          "SUMMON_NOT_LEGAL",
          { reason: "TILE" },
        ],
        [
          "a tile two away",
          base,
          summon(base, at(5, 2), at(6, 2), at(5, 4)),
          "SUMMON_NOT_LEGAL",
          { reason: "TILE" },
        ],
        [
          "a Summoner that has acted",
          patchUnitV7(base, at(5, 2), {
            activation: {
              ...unitAtV7(base, at(5, 2)).activation,
              specialActed: true,
            },
          }),
          good,
          "UNIT_ALREADY_ACTED",
          { unitId: unitAtV7(base, at(5, 2)).id },
        ],
        [
          "a unit that is no Summoner",
          base,
          summon(base, at(6, 2), at(5, 2), at(5, 3)),
          "UNIT_ROLE_INVALID",
          { role: "FIGHTER" },
        ],
      ];
    for (const [label, state, command, code, params] of cases)
      expect(rejectedV7(state, command), label).toEqual({ code, params });
  });

  it("never summons onto water, a settlement center, or an unexplored tile, and summons onto a Mountain", () => {
    const pieces: GoblinPieceV7[] = [
      { seat: 0, role: "CAPTAIN", at: at(5, 6) },
      { seat: 0, role: "FIGHTER", at: at(6, 6) },
    ];
    const wet = withFavourV7(cultFieldV7(pieces, { water: [at(4, 6)] }), 0, 5);
    expect(rejectedV7(wet, summon(wet, at(5, 6), at(6, 6), at(4, 6)))).toEqual({
      code: "SUMMON_NOT_LEGAL",
      params: { reason: "TILE" },
    });
    // (5, 5) is a village center.
    expect(rejectedV7(wet, summon(wet, at(5, 6), at(6, 6), at(5, 5)))).toEqual({
      code: "SUMMON_NOT_LEGAL",
      params: { reason: "TILE" },
    });
    const hidden = unexploreV7(wet, 0, [at(4, 7)]);
    expect(
      rejectedV7(hidden, summon(hidden, at(5, 6), at(6, 6), at(4, 7))),
    ).toEqual({ code: "SUMMON_NOT_LEGAL", params: { reason: "TILE" } });
    // A Horror strides: it needs no Engineering for a Mountain.
    const hill = mountainV7(
      withFavourV7(cultFieldV7(pieces, { techs: { 0: [] } }), 0, 5),
      at(4, 7),
    );
    expect(
      unitAtV7(
        playV7(hill, summon(hill, at(5, 6), at(6, 6), at(4, 7))).state,
        at(4, 7),
      ).summoned,
    ).toBe("HORROR");
  });

  it("summons every turn there is a helper and the Favour (no limit)", () => {
    const state = summonField(
      [
        { seat: 0, role: "CAPTAIN", at: at(5, 6) },
        { seat: 0, role: "FIGHTER", at: at(6, 6) },
      ],
      10,
    );
    const first = playV7(state, summon(state, at(5, 2), at(6, 2), at(5, 3)));
    const second = playV7(
      first.state,
      summon(first.state, at(5, 6), at(6, 6), at(5, 7)),
    );
    expect(
      second.state.units.filter((unit) => unit.summoned === "HORROR"),
    ).toHaveLength(2);
    expect(favour(second.state, 0)).toBe(0);
  });
});

describe("the Cult's channel: the Horror is a unit of its own (section 4.2)", () => {
  it("has the Horror's numbers, whatever its mechanical role says", () => {
    const state = horrorField([SUMMONER]);
    const horror = unitAtV7(state, at(5, 4));
    expect(BOARD_SUMMONED_ROLE_IDS_V7).toEqual(["HORROR"]);
    expect(horror.role).toBe("KNIGHT");
    const rule = unitRoleRuleV7(state, horror);
    expect(rule).toMatchObject({
      label: "Horror",
      cost: null,
      maxHp: 18,
      attack2: 8,
      defense2: 4,
      move: 2,
      range: 1,
      technology: null,
    });
    expect(rule.abilities).toEqual(["ATTACK", "CAPTURE", "BOO", "STRIDE"]);
    // The same through a view, and through a roster with no lists at all.
    const view = viewForV7(state, seatIdV7(state, 1));
    const seen = view.units.find((unit) => unit.id === horror.id);
    expect(seen?.summoned).toBe("HORROR");
    expect(unitRoleRuleV7(view, need(seen)).label).toBe("Horror");
    expect(
      unitRoleRuleV7({ players: state.players, mindControlled: [] }, horror)
        .label,
    ).toBe("Horror");
    const mechanics = unitRoleMechanicsV7(state, horror);
    expect(mechanics).toMatchObject({
      movementMode: "STRIDE",
      construct: true,
      robed: false,
      capacitySlots: 1,
    });
    expect(isLivingUnitV7(state, horror)).toBe(false);
    expect(daemonControlV7(horror)).toBe(1);
    // Its value is 6 (the Score's Army and what a kill of it is worth).
    expect(unitFavourValueV7(state, horror)).toBe(6);
    expect(CULT_SUMMONED_ROLE_RULES_V7.HORROR.value).toBe(6);
    const army = scoreV7(state, seatIdV7(state, 0)).army.count;
    const without = scoreV7(cultFieldV7([SUMMONER]), seatIdV7(state, 0)).army
      .count;
    expect(army - without).toBe(6);
  });

  it("fights with the numbers of section 4.2", () => {
    // It kills a full-HP Fighter (12), Knight (13), or Initiate (10) in one
    // attack and takes nothing back.
    for (const [role, faction] of [
      ["FIGHTER", "ORIGINAL"],
      ["KNIGHT", "ORIGINAL"],
    ] as const) {
      const state = horrorField([{ seat: 1, role, at: at(5, 5) }], {
        factions: ["CULT", faction],
      });
      const view = viewForV7(state, seatIdV7(state, 0));
      const preview = queryCombatPreviewV7(
        view,
        unitAtV7(state, at(5, 4)).id,
        unitAtV7(state, at(5, 5)).id,
      );
      expect(preview?.defenderDies, role).toBe(true);
      expect(preview?.damageToAttacker, role).toBe(0);
    }
    // It deals a Guard 10 of 17 and takes 6.
    const guard = horrorField([{ seat: 1, role: "GUARD", at: at(5, 5) }]);
    const run = attackV7(guard, at(5, 4), at(5, 5));
    expect(run.combat.damageToDefender).toBe(10);
    expect(run.combat.damageToAttacker).toBe(6);
    // A Knight deals it 12 and takes 3; a Catapult 8; a Marksman 5.
    for (const [role, where, dealt, taken] of [
      ["KNIGHT", at(5, 5), 12, 3],
      ["CATAPULT", at(5, 6), 8, 0],
      ["MARKSMAN", at(5, 6), 5, 0],
    ] as const) {
      const state = horrorField([{ seat: 1, role, at: where }], {
        activeSeat: 1,
      });
      const hit = attackV7(state, where, at(5, 4));
      expect(hit.combat.damageToDefender, role).toBe(dealt);
      expect(hit.combat.damageToAttacker, role).toBe(taken);
    }
  });

  it("strides over Forest and Mountain and never touches water or a boat", () => {
    const state = mountainV7(
      horrorField([], { water: [at(4, 4), at(4, 5)], techs: { 0: [] } }),
      at(6, 4),
    );
    const horror = unitAtV7(state, at(5, 4));
    const view = viewForV7(state, seatIdV7(state, 0));
    const ends = reachablePlayerMovementPathsV7(
      view,
      need(view.units.find((unit) => unit.id === horror.id)),
    ).map((path) => `${path.destination.x},${path.destination.y}`);
    expect(ends).toContain("6,4");
    // Two steps, the first over the Mountain: it is not stopped there.
    expect(ends).toContain("7,4");
    expect(ends).not.toContain("4,4");
    expect(ends).not.toContain("4,5");
    expect(
      rejectedV7(state, {
        kind: "MOVE",
        unitId: horror.id,
        path: [at(4, 4)],
      }).code,
    ).toBe("MOVEMENT_ILLEGAL");
  });

  it("is never promoted, disbanded, sacrificed, or seized, and tosses no Coin", () => {
    // Hurt, with kills enough for a Promotion: it neither recovers nor is
    // promoted.
    const state = patchUnitV7(
      horrorField([
        { seat: 0, role: "CAPTAIN", at: at(5, 5) },
        { seat: 0, role: "FIGHTER", at: at(6, 5) },
      ]),
      at(5, 4),
      { kills: 5, hp: 7 },
    );
    const horror = unitAtV7(state, at(5, 4));
    const offered = offeredV7(state).filter(
      (command) => "unitId" in command && command.unitId === horror.id,
    );
    expect(new Set(offered.map((command) => command.kind))).toEqual(
      new Set(["MOVE", "BOO", "WAIT"]),
    );
    expect(rejectedV7(state, { kind: "PROMOTE", unitId: horror.id }).code).toBe(
      "PROMOTION_NOT_ELIGIBLE",
    );
    expect(rejectedV7(state, { kind: "DISBAND", unitId: horror.id }).code).toBe(
      "UNIT_ROLE_INVALID",
    );
    expect(
      rejectedV7(state, {
        kind: "SACRIFICE",
        unitId: unitAtV7(state, at(5, 5)).id,
        victimUnitId: horror.id,
      }),
    ).toEqual({ code: "SACRIFICE_NOT_LEGAL", params: { reason: "DAEMON" } });
    // A broken enemy Horror is no victim of a Seizure (it is not living).
    const enemy = withHorrorV7(
      cultFieldV7(
        [
          { seat: 0, role: "CAPTAIN", at: at(5, 5) },
          { seat: 0, role: "FIGHTER", at: at(6, 5) },
        ],
        { factions: ["CULT", "CULT"] },
      ),
      1,
      at(6, 4),
      { hp: 3 },
    );
    expect(
      rejectedV7(enemy, {
        kind: "SEIZE",
        unitId: unitAtV7(enemy, at(5, 5)).id,
        victimUnitId: unitAtV7(enemy, at(6, 4)).id,
      }),
    ).toEqual({ code: "SEIZE_NOT_LEGAL", params: { reason: "IMMUNE" } });
  });

  it("captures while bound and stays homeless", () => {
    // (5, 5) is a neutral village: a Horror that began its turn there
    // captures it.
    const state = patchUnitV7(
      withHorrorV7(cultFieldV7([SUMMONER]), 0, at(5, 5)),
      at(5, 5),
      { captureEligible: true },
    );
    const horror = unitAtV7(state, at(5, 5));
    const played = playV7(state, { kind: "CAPTURE", unitId: horror.id });
    expect(kindsV7(played.events)).toContain("CITY_CAPTURED");
    expect(unitAtV7(played.state, at(5, 5)).homeCityId).toBeNull();
  });

  it("rejects a state whose summoned unit is malformed", () => {
    const state = horrorField([SUMMONER]);
    const horror = unitAtV7(state, at(5, 4));
    const withHorror = (patch: object): unknown => ({
      ...state,
      units: state.units.map((unit) =>
        unit.id === horror.id ? { ...unit, ...patch } : unit,
      ),
    });
    expect(parseGameStateV7(withHorror({}))).not.toBeNull();
    for (const [label, input] of [
      ["an unknown summoned role", withHorror({ summoned: "SPIDER" })],
      [
        "a summoned role not on the board yet",
        withHorror({ summoned: "HERALD" }),
      ],
      ["another mechanical role", withHorror({ role: "FIGHTER" })],
      ["another maximum HP", withHorror({ maxHp: 12, hp: 12 })],
      ["a home city", withHorror({ homeCityId: need(state.cities[0]).id })],
      ["a veteran", withHorror({ veteran: true, kills: 3, maxHp: 23 })],
      ["a seat that is no Cult", withHorror({ ownerId: seatIdV7(state, 1) })],
    ] as const)
      expect(parseGameStateV7(input), label).toBeNull();
    // A unit of another kind never carries the key.
    const summoner = unitAtV7(state, at(5, 2));
    expect(
      parseGameStateV7({
        ...state,
        units: state.units.map((unit) =>
          unit.id === summoner.id ? { ...unit, summoned: "HORROR" } : unit,
        ),
      }),
    ).toBeNull();
  });
});

describe("the Cult's channel: a bound Horror and the other factions (sections 4.2 and 13.1)", () => {
  const targeted = (
    kind: "MIND_CONTROL" | "TRACTOR_BEAM" | "SWALLOW" | "FROST_BOLT" | "ATTACK",
    state: GameStateV7,
    from: CoordV7,
  ): CommandV7 =>
    ({
      kind,
      unitId: unitAtV7(state, from).id,
      targetUnitId: unitAtV7(state, at(5, 4)).id,
    }) as CommandV7;

  it("is no target of Mind Control, a Tractor Beam, or a Swallow, however hurt", () => {
    const martian = withHorrorV7(
      martianFieldV7(
        [
          { seat: 1, role: "CAPTAIN", at: at(5, 6) },
          { seat: 1, role: "RAIDER", at: at(7, 4) },
        ],
        { factions: ["CULT", "MARTIAN"], activeSeat: 1 },
      ),
      0,
      at(5, 4),
      { hp: 3 },
    );
    expect(
      rejectedV7(martian, targeted("MIND_CONTROL", martian, at(5, 6))).code,
    ).toBe("MIND_CONTROL_NOT_LEGAL");
    expect(
      rejectedV7(martian, targeted("TRACTOR_BEAM", martian, at(7, 4))).code,
    ).toBe("TRACTOR_BEAM_NOT_LEGAL");
    const undead = horrorField(
      [{ seat: 1, role: "JUGGERNAUT", at: at(5, 5) }],
      { factions: ["CULT", "UNDEAD"], activeSeat: 1 },
      { hp: 3 },
    );
    expect(rejectedV7(undead, targeted("SWALLOW", undead, at(5, 5))).code).toBe(
      "SWALLOW_NOT_LEGAL",
    );
  });

  it("takes no Plague and no bite, hears no Wail, and leaves no Grave", () => {
    // A Lich's shot hurts it and plagues nobody.
    const lich = horrorField([{ seat: 1, role: "CATAPULT", at: at(5, 6) }], {
      factions: ["CULT", "UNDEAD"],
      activeSeat: 1,
    });
    const shot = attackV7(lich, at(5, 6), at(5, 4));
    expect(shot.combat.damageToDefender).toBeGreaterThan(0);
    expect(shot.state.plagued).toEqual([]);
    // A Zombie's bite hurts it and marks nobody.
    const zombie = horrorField([{ seat: 1, role: "GUARD", at: at(5, 5) }], {
      factions: ["CULT", "UNDEAD"],
      activeSeat: 1,
    });
    expect(attackV7(zombie, at(5, 5), at(5, 4)).state.bitten).toEqual([]);
    // A Banshee beside it has nobody to Wail at.
    const banshee = horrorField([{ seat: 1, role: "MARKSMAN", at: at(5, 5) }], {
      factions: ["CULT", "UNDEAD"],
      activeSeat: 1,
    });
    expect(offeredV7(banshee, "WAIL")).toEqual([]);
    // Killed, it leaves no Grave for the Undead.
    const dying = horrorField(
      [{ seat: 1, role: "KNIGHT", at: at(5, 5) }],
      { factions: ["CULT", "UNDEAD"], activeSeat: 1 },
      { hp: 1 },
    );
    const killed = attackV7(dying, at(5, 5), at(5, 4));
    expect(killed.target).toBeUndefined();
    expect(killed.state.graves).toEqual([]);
    expect(kindsV7(killed.events)).not.toContain("GRAVE_CREATED");
  });

  it("can be Frozen and pushed while bound", () => {
    const witch = horrorField([{ seat: 1, role: "CAPTAIN", at: at(5, 6) }], {
      factions: ["CULT", "ICE_FOLK"],
      activeSeat: 1,
    });
    const frozen = playV7(witch, targeted("FROST_BOLT", witch, at(5, 6)));
    expect(frozen.state.frozen).toEqual([
      expect.objectContaining({ unitId: unitAtV7(witch, at(5, 4)).id }),
    ]);
    // A Juggernaut pushes it one tile.
    const giant = horrorField([{ seat: 1, role: "JUGGERNAUT", at: at(5, 5) }], {
      activeSeat: 1,
    });
    const pushed = attackV7(giant, at(5, 5), at(5, 4));
    expect(pushed.target?.at).toEqual(at(5, 3));
  });

  it("takes the channel from a mind-controlled cultist, and leaves it Behold!", () => {
    // Two Brains hold an Initiate and an Idol Bearer; the Cult's Horror
    // stands within their reach.
    const state = withHorrorV7(
      martianFieldV7(
        [
          { seat: 0, role: "CAPTAIN", at: at(3, 6) },
          { seat: 0, role: "CAPTAIN", at: at(6, 7) },
          { seat: 1, role: "FIGHTER", at: at(4, 6), controlledBy: at(3, 6) },
          { seat: 1, role: "GUARD", at: at(5, 6), controlledBy: at(6, 7) },
          { seat: 1, role: "CAPTAIN", at: at(8, 2) },
        ],
        { factions: ["MARTIAN", "CULT"] },
      ),
      1,
      at(5, 4),
    );
    const offered = offeredV7(state, "CHANNEL", "BEHOLD", "SUMMON", "ANCHOR");
    expect(offered).toEqual([
      { kind: "BEHOLD", unitId: unitAtV7(state, at(5, 6)).id },
    ]);
    expect(rejectedV7(state, channel(state, at(4, 6), at(5, 4)))).toEqual({
      code: "UNIT_ROLE_INVALID",
      params: { role: "FIGHTER" },
    });
  });

  it("refuses a Frozen helper and a Frozen channeller", () => {
    const base = withFavourV7(
      horrorField([SUMMONER, HELPER], { factions: ["CULT", "ICE_FOLK"] }),
      0,
      5,
    );
    const helper = unitAtV7(base, at(6, 2));
    const state = checkedV7({
      ...base,
      frozen: [{ unitId: helper.id, turnsLeft: 2 }],
    });
    expect(
      rejectedV7(state, summon(state, at(5, 2), at(6, 2), at(5, 3))),
    ).toEqual({ code: "UNIT_FROZEN", params: { unitId: helper.id } });
    expect(rejectedV7(state, channel(state, at(6, 2), at(5, 4)))).toEqual({
      code: "UNIT_FROZEN",
      params: { unitId: helper.id },
    });
    expect(offeredV7(state, "SUMMON")).toEqual([]);
  });
});

describe("the Cult's channel: Channel (section 6.2)", () => {
  it("gives the daemon a strand within 3 tiles, as a primary action after a Move", () => {
    const state = horrorField([
      { seat: 0, role: "FIGHTER", at: at(5, 8) },
      { seat: 0, role: "GUARD", at: at(8, 4), activation: movedV7(1) },
      { seat: 0, role: "CATAPULT", at: at(2, 4), activation: movedV7(1) },
      { seat: 0, role: "RAIDER", at: at(5, 5) },
    ]);
    const horror = unitAtV7(state, at(5, 4));
    // The Initiate is 4 tiles away: out of range until it has moved.
    expect(rejectedV7(state, channel(state, at(5, 8), at(5, 4)))).toEqual({
      code: "CHANNEL_NOT_LEGAL",
      params: { reason: "RANGE" },
    });
    const moved = moveV7(state, at(5, 8), [at(5, 7)]).state;
    const view = viewForV7(moved, seatIdV7(moved, 0));
    expect(
      previewChannelV7(view, unitAtV7(moved, at(5, 7)).id, horror.id),
    ).toEqual({
      unitId: unitAtV7(moved, at(5, 7)).id,
      daemonUnitId: horror.id,
      role: "HORROR",
      control: 1,
      strandsBefore: 0,
      strandsAfter: 1,
      holds: true,
      binds: false,
    });
    const first = playV7(moved, channel(moved, at(5, 7), at(5, 4)));
    expect(first.events).toEqual([
      {
        kind: "STRAND_FORMED",
        playerId: seatIdV7(state, 0),
        unitId: unitAtV7(moved, at(5, 7)).id,
        daemonUnitId: horror.id,
      },
    ]);
    expect(unitAtV7(first.state, at(5, 7)).activation).toMatchObject({
      specialActed: true,
      handled: true,
    });
    // One strand per cultist per turn; it cannot move afterwards.
    expect(
      rejectedV7(first.state, channel(first.state, at(5, 7), at(5, 4))).code,
    ).toBe("UNIT_ALREADY_ACTED");
    expect(
      offeredV7(first.state).filter(
        (command) =>
          "unitId" in command &&
          command.unitId === unitAtV7(first.state, at(5, 7)).id,
      ),
    ).toEqual([]);
    // The Idol Bearer and the Stargazer may not attack after a Move, and
    // channel after one all the same; a daemon may hold any number.
    const second = playV7(
      first.state,
      channel(first.state, at(8, 4), at(5, 4)),
    );
    const third = playV7(
      second.state,
      channel(second.state, at(2, 4), at(5, 4)),
    );
    expect(strandsOn(third.state, at(5, 4))).toBe(3);
    expect(viewForV7(third.state, seatIdV7(state, 1)).cult.daemons).toEqual([
      { unitId: horror.id, role: "HORROR", control: 1, strands: 3 },
    ]);
    // The Familiar never channels.
    expect(
      rejectedV7(third.state, channel(third.state, at(5, 5), at(5, 4))),
    ).toEqual({ code: "UNIT_ROLE_INVALID", params: { role: "RAIDER" } });
  });

  it("is offered to every robed cultist in range, for every own daemon in range", () => {
    const state = withHorrorV7(
      horrorField([
        { seat: 0, role: "FIGHTER", at: at(5, 6) },
        { seat: 0, role: "MARKSMAN", at: at(1, 1) },
      ]),
      0,
      at(6, 8),
    );
    const offered = expectOfferedAcceptedV7(state, "CHANNEL");
    const initiate = unitAtV7(state, at(5, 6)).id;
    expect(offered).toEqual([
      {
        kind: "CHANNEL",
        unitId: initiate,
        daemonUnitId: unitAtV7(state, at(5, 4)).id,
      },
      {
        kind: "CHANNEL",
        unitId: initiate,
        daemonUnitId: unitAtV7(state, at(6, 8)).id,
      },
    ]);
  });

  it("refuses another seat's daemon, a unit that is no daemon, and an embarked cultist", () => {
    const state = withHorrorV7(
      horrorField(
        [
          { seat: 0, role: "FIGHTER", at: at(5, 6) },
          { seat: 0, role: "CAPTAIN", at: at(4, 6) },
        ],
        { factions: ["CULT", "CULT"] },
      ),
      1,
      at(6, 6),
    );
    expect(rejectedV7(state, channel(state, at(5, 6), at(6, 6)))).toEqual({
      code: "CHANNEL_NOT_LEGAL",
      params: { reason: "DAEMON" },
    });
    expect(rejectedV7(state, channel(state, at(5, 6), at(4, 6)))).toEqual({
      code: "CHANNEL_NOT_LEGAL",
      params: { reason: "DAEMON" },
    });
    expect(
      rejectedV7(state, {
        kind: "CHANNEL",
        unitId: unitAtV7(state, at(5, 6)).id,
        daemonUnitId: 9999 as never,
      }),
    ).toEqual({ code: "CHANNEL_NOT_LEGAL", params: { reason: "DAEMON" } });
  });
});

describe("the Cult's channel: the Start Turn check (sections 6.2 and 13.3)", () => {
  const cultId = (state: GameStateV7) => seatIdV7(state, 0);

  it("keeps a daemon with enough holding strands, then clears every strand", () => {
    const state = withStrandsV7(
      horrorField([{ seat: 0, role: "FIGHTER", at: at(5, 7) }]),
      at(5, 4),
      [at(5, 7)],
    );
    const round = endTurnUntilV7(state, cultId(state));
    expect(unitAtV7(round.state, at(5, 4)).summoned).toBe("HORROR");
    expect(kindsV7(round.events)).not.toContain("DAEMON_UNBOUND");
    expect(round.state.cult.strands).toEqual([]);
    // The seat must channel again this turn: with nothing done, the next
    // check fails, and the Horror is nobody's.
    const next = endTurnUntilV7(round.state, cultId(state));
    expect(kindsV7(next.events)).toContain("DAEMON_UNBOUND");
    expect(
      next.state.units.filter((unit) => unit.summoned !== undefined),
    ).toEqual([expect.objectContaining({ ownerId: NEUTRAL_OWNER_ID_V7 })]);
  });

  it("Unbinds a daemon short of its Control: it belongs to nobody and rampages at once", () => {
    // The Unbound rules themselves are in
    // `tests/unit/ruleset-v7-cult-unbound.test.ts` (`pulp_wars-mch9.6`).
    const state = horrorField([{ seat: 0, role: "FIGHTER", at: at(5, 7) }]);
    const horror = unitAtV7(state, at(5, 4));
    const round = endTurnUntilV7(state, cultId(state));
    expect(eventsOf(round.events, "DAEMON_UNBOUND")).toEqual([
      {
        kind: "DAEMON_UNBOUND",
        unitId: horror.id,
        summonerPlayerId: cultId(state),
        strands: 0,
        control: 1,
      },
    ]);
    const index = round.events.findIndex(
      (event) => event.kind === "DAEMON_UNBOUND",
    );
    // Its rampage follows: it walks to the Initiate, its nearest unit.
    expect(round.events[index + 1]).toMatchObject({
      kind: "UNIT_MOVED",
      unitId: horror.id,
    });
    expect(
      round.state.units.find((unit) => unit.id === horror.id),
    ).toMatchObject({ ownerId: NEUTRAL_OWNER_ID_V7, summoned: "HORROR" });
    // After the seat's turn began and before its income.
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
    for (const event of round.events)
      expect(parseEventV7(event).ok, event.kind).toBe(true);
    // It is no Loss in the Score (the Loss is the Initiate it killed), and
    // the seat is no longer flawless.
    const entry = round.state.scoreLedger.find(
      (candidate) => candidate.playerId === cultId(state),
    );
    expect(entry).toMatchObject({ lossValue: 2, flawless: false });
  });

  it("counts only the strands of cultists within 3 tiles at the check", () => {
    // The strand was made in range; the Horror then walked away.
    const state = withStrandsV7(
      horrorField([{ seat: 0, role: "FIGHTER", at: at(5, 7) }]),
      at(5, 4),
      [at(5, 7)],
    );
    const walked = moveV7(state, at(5, 4), [at(5, 3)]).state;
    expect(strandsOn(walked, at(5, 3))).toBe(0);
    expect(viewForV7(walked, cultId(state)).cult.daemons[0]).toMatchObject({
      control: 1,
      strands: 0,
    });
    const round = endTurnUntilV7(walked, cultId(state));
    expect(eventsOf(round.events, "DAEMON_UNBOUND")[0]).toMatchObject({
      strands: 0,
      control: 1,
    });
  });

  it("checks a fresh Horror with the strands of its summoning", () => {
    const state = summonField();
    const summoned = playV7(state, summon(state, at(5, 2), at(6, 2), at(5, 3)));
    const round = endTurnUntilV7(summoned.state, cultId(state));
    expect(unitAtV7(round.state, at(5, 3)).summoned).toBe("HORROR");
    expect(round.state.cult.strands).toEqual([]);
    // It acts on that turn.
    expect(
      offeredV7(round.state).some(
        (command) =>
          command.kind === "MOVE" &&
          command.unitId === unitAtV7(round.state, at(5, 3)).id,
      ),
    ).toBe(true);
  });

  it("checks each daemon in unit-ID order and leaves another Cult seat's strands alone", () => {
    const state = withStrandsV7(
      withStrandsV7(
        withHorrorV7(
          withHorrorV7(
            cultFieldV7(
              [
                { seat: 0, role: "FIGHTER", at: at(5, 5) },
                { seat: 1, role: "FIGHTER", at: at(2, 5) },
              ],
              { factions: ["CULT", "CULT"] },
            ),
            0,
            at(5, 4),
          ),
          1,
          at(2, 4),
        ),
        at(5, 4),
        [at(5, 5)],
      ),
      at(2, 4),
      [at(2, 5)],
    );
    // Seat 0 ends its turn: seat 1's check runs; its daemon holds, and its
    // strands are cleared. Seat 0's strand stays until its own check.
    const ended = applyOkV7(state, cultId(state), { kind: "END_TURN" });
    expect(ended.state.cult.strands).toEqual([
      {
        cultistUnitId: unitAtV7(state, at(5, 5)).id,
        daemonUnitId: unitAtV7(state, at(5, 4)).id,
      },
    ]);
    expect(kindsV7(ended.events)).not.toContain("DAEMON_UNBOUND");
    const back = applyOkV7(ended.state, seatIdV7(state, 1), {
      kind: "END_TURN",
    });
    expect(back.state.cult.strands).toEqual([]);
    expect(
      back.state.units.filter((unit) => unit.summoned !== undefined),
    ).toHaveLength(2);
  });
});

describe("the Cult's channel: Anchor (section 8.4)", () => {
  const anchorField = (
    extra: readonly GoblinPieceV7[] = [],
    options: Parameters<typeof cultFieldV7>[1] = {},
  ): GameStateV7 =>
    withStrandsV7(
      horrorField(
        [
          { seat: 0, role: "FIGHTER", at: at(5, 6) },
          { seat: 0, role: "JUGGERNAUT", at: at(6, 6) },
          ...extra,
        ],
        options,
      ),
      at(5, 4),
      [at(5, 6)],
    );

  it("grips a channeller beside the Thing: its strand counts three, and the Thing still acts", () => {
    const state = anchorField();
    const thing = unitAtV7(state, at(6, 6));
    const view = viewForV7(state, seatIdV7(state, 0));
    expect(
      previewAnchorV7(view, thing.id, unitAtV7(state, at(5, 6)).id),
    ).toEqual({
      unitId: thing.id,
      cultistUnitId: unitAtV7(state, at(5, 6)).id,
      daemonUnitId: unitAtV7(state, at(5, 4)).id,
      control: 1,
      strandsBefore: 1,
      strandsAfter: 3,
      holds: true,
      binds: false,
    });
    const played = playV7(state, anchor(state, at(6, 6), at(5, 6)));
    expect(played.events).toEqual([
      {
        kind: "ANCHOR_GRIPPED",
        playerId: seatIdV7(state, 0),
        unitId: thing.id,
        cultistUnitId: unitAtV7(state, at(5, 6)).id,
      },
    ]);
    expect(strandsOn(played.state, at(5, 4))).toBe(3);
    // Not a primary action: the Thing's activation is untouched and it may
    // still move.
    expect(unitAtV7(played.state, at(6, 6)).activation).toEqual(
      thing.activation,
    );
    expect(
      offeredV7(played.state, "MOVE").some(
        (command) => "unitId" in command && command.unitId === thing.id,
      ),
    ).toBe(true);
    // One grip per Thing.
    expect(
      rejectedV7(played.state, anchor(played.state, at(6, 6), at(5, 6))),
    ).toEqual({ code: "ANCHOR_NOT_LEGAL", params: { reason: "GRIPPING" } });
    // The Thing's own Move away ends the bonus (it must still stand next
    // to the cultist at the check), not the strand.
    const walked = moveV7(played.state, at(6, 6), [at(7, 6)]).state;
    expect(strandsOn(walked, at(5, 4))).toBe(1);
    expect(walked.cult.grips).toEqual([]);
  });

  it("may grip after the Thing's attack, and before the cultist... never: it needs a strand", () => {
    const state = cultFieldV7([
      { seat: 0, role: "FIGHTER", at: at(5, 6) },
      { seat: 0, role: "JUGGERNAUT", at: at(6, 6) },
      { seat: 1, role: "FIGHTER", at: at(7, 6) },
    ]);
    const horror = withHorrorV7(state, 0, at(5, 4));
    // No strand yet: no grip.
    expect(rejectedV7(horror, anchor(horror, at(6, 6), at(5, 6)))).toEqual({
      code: "ANCHOR_NOT_LEGAL",
      params: { reason: "CULTIST" },
    });
    const channelled = playV7(horror, channel(horror, at(5, 6), at(5, 4)));
    const attacked = attackV7(channelled.state, at(6, 6), at(7, 6));
    const thing = need(
      attacked.state.units.find((unit) => unit.role === "JUGGERNAUT"),
    );
    // The Thing killed the Fighter and advanced: it no longer stands next
    // to the cultist, so no grip.
    expect(thing.at).toEqual(at(7, 6));
    expect(
      rejectedV7(attacked.state, {
        kind: "ANCHOR",
        unitId: thing.id,
        cultistUnitId: unitAtV7(attacked.state, at(5, 6)).id,
      }),
    ).toEqual({ code: "ANCHOR_NOT_LEGAL", params: { reason: "CULTIST" } });
  });

  it("refuses a second Thing on the same cultist, an enemy, and a unit that is no Thing", () => {
    const state = anchorField([
      { seat: 0, role: "JUGGERNAUT", at: at(4, 6) },
      { seat: 0, role: "RAIDER", at: at(6, 7) },
    ]);
    const gripped = playV7(state, anchor(state, at(6, 6), at(5, 6))).state;
    expect(rejectedV7(gripped, anchor(gripped, at(4, 6), at(5, 6)))).toEqual({
      code: "ANCHOR_NOT_LEGAL",
      params: { reason: "CULTIST" },
    });
    expect(rejectedV7(gripped, anchor(gripped, at(4, 6), at(6, 7))).code).toBe(
      "ANCHOR_NOT_LEGAL",
    );
    expect(rejectedV7(gripped, anchor(gripped, at(5, 6), at(6, 6)))).toEqual({
      code: "UNIT_ROLE_INVALID",
      params: { role: "FIGHTER" },
    });
  });

  it("lets one gripped Initiate hold a daemon at the check, and clears the grip there", () => {
    const state = withGripV7(anchorField(), at(6, 6), at(5, 6));
    expect(state.cult.grips).toHaveLength(1);
    const round = endTurnUntilV7(state, seatIdV7(state, 0));
    expect(kindsV7(round.events)).not.toContain("DAEMON_UNBOUND");
    expect(round.state.cult.grips).toEqual([]);
    expect(round.state.cult.strands).toEqual([]);
  });
});

describe("the Cult's channel: Behold! (section 8.1)", () => {
  it("raises the idol after a Move, as the Idol Bearer's action for the turn", () => {
    const state = horrorField([
      { seat: 0, role: "GUARD", at: at(5, 6), activation: movedV7(1) },
      { seat: 0, role: "FIGHTER", at: at(6, 6) },
      { seat: 0, role: "RAIDER", at: at(4, 6) },
      { seat: 1, role: "FIGHTER", at: at(5, 7) },
    ]);
    const bearer = unitAtV7(state, at(5, 6));
    expect(
      previewBeholdV7(viewForV7(state, seatIdV7(state, 0)), bearer.id),
    ).toEqual({
      unitId: bearer.id,
      // The Initiate beside it; never the Familiar or an enemy.
      wardedUnitIds: [unitAtV7(state, at(6, 6)).id],
    });
    const played = playV7(state, behold(state, at(5, 6)));
    expect(played.events).toEqual([
      { kind: "IDOL_RAISED", playerId: seatIdV7(state, 0), unitId: bearer.id },
    ]);
    expect(played.state.cult.idols).toEqual([bearer.id]);
    // It spent its action: it does not channel this turn, and cannot raise
    // the idol twice.
    expect(
      rejectedV7(played.state, channel(played.state, at(5, 6), at(5, 4))).code,
    ).toBe("UNIT_ALREADY_ACTED");
    expect(rejectedV7(played.state, behold(played.state, at(5, 6))).code).toBe(
      "UNIT_ALREADY_ACTED",
    );
    // Every viewer who sees the Idol Bearer sees the idol.
    expect(viewForV7(played.state, seatIdV7(state, 1)).cult.idols).toEqual([
      bearer.id,
    ]);
  });

  it("lasts until the end of the channel check of the next Start Turn", () => {
    const state = withIdolsV7(
      cultFieldV7([{ seat: 0, role: "GUARD", at: at(5, 6) }]),
      [at(5, 6)],
    );
    const bearer = unitAtV7(state, at(5, 6));
    const ended = applyOkV7(state, seatIdV7(state, 0), { kind: "END_TURN" });
    expect(ended.state.cult.idols).toEqual([bearer.id]);
    const back = applyOkV7(ended.state, seatIdV7(state, 1), {
      kind: "END_TURN",
    });
    expect(back.state.cult.idols).toEqual([]);
    expect(eventsOf(back.events, "IDOL_DROPPED")).toEqual([
      {
        kind: "IDOL_DROPPED",
        playerId: seatIdV7(state, 0),
        unitId: bearer.id,
        cause: "EXPIRED",
      },
    ]);
  });

  it("refuses a unit that is no Idol Bearer and an idol already raised", () => {
    const state = withIdolsV7(
      cultFieldV7([
        { seat: 0, role: "GUARD", at: at(5, 6) },
        { seat: 0, role: "FIGHTER", at: at(6, 6) },
      ]),
      [at(5, 6)],
    );
    expect(rejectedV7(state, behold(state, at(6, 6)))).toEqual({
      code: "UNIT_ROLE_INVALID",
      params: { role: "FIGHTER" },
    });
    expect(rejectedV7(state, behold(state, at(5, 6)))).toEqual({
      code: "BEHOLD_NOT_LEGAL",
      params: { reason: "RAISED" },
    });
  });
});

describe("the Cult's channel: Boo! (section 8.5)", () => {
  it("makes every living unit beside the Horror jump one tile away, friend or foe", () => {
    const state = horrorField(
      [
        { seat: 1, role: "FIGHTER", at: at(5, 5) },
        { seat: 1, role: "KNIGHT", at: at(6, 3) },
        { seat: 0, role: "FIGHTER", at: at(4, 4) },
        // A reward giant is not scared.
        { seat: 1, role: "JUGGERNAUT", at: at(6, 4) },
        // Blocked: something stands behind it.
        { seat: 1, role: "MARKSMAN", at: at(4, 5) },
        { seat: 1, role: "GUARD", at: at(3, 6) },
        // Two tiles away: out of reach.
        { seat: 1, role: "FIGHTER", at: at(5, 2) },
      ],
      {},
      { activation: movedV7(1) },
    );
    const horror = unitAtV7(state, at(5, 4));
    const id = (where: CoordV7) => unitAtV7(state, where).id;
    const view = viewForV7(state, seatIdV7(state, 0));
    const preview = previewBooV7(view, horror.id);
    expect(
      preview?.results.map((entry) => [entry.unitId, entry.outcome, entry.to]),
    ).toEqual([
      [id(at(6, 3)), "JUMPS", at(7, 2)],
      [id(at(4, 4)), "JUMPS", at(3, 4)],
      [id(at(4, 5)), "STAYS", at(3, 6)],
      [id(at(5, 5)), "JUMPS", at(5, 6)],
    ]);
    const played = playV7(state, boo(state, at(5, 4)));
    expect(eventsOf(played.events, "UNITS_SCARED")).toEqual([
      {
        kind: "UNITS_SCARED",
        playerId: seatIdV7(state, 0),
        unitId: horror.id,
        at: at(5, 4),
        // In (y, x, ID) order.
        results: [
          { unitId: id(at(6, 3)), from: at(6, 3), to: at(7, 2) },
          { unitId: id(at(4, 4)), from: at(4, 4), to: at(3, 4) },
          { unitId: id(at(4, 5)), from: at(4, 5), to: null },
          { unitId: id(at(5, 5)), from: at(5, 5), to: at(5, 6) },
        ],
      },
    ]);
    const where = (unitId: number) =>
      played.state.units.find((unit) => unit.id === unitId)?.at;
    expect(where(id(at(6, 3)))).toEqual(at(7, 2));
    expect(where(id(at(4, 4)))).toEqual(at(3, 4));
    expect(where(id(at(4, 5)))).toEqual(at(4, 5));
    expect(where(id(at(5, 5)))).toEqual(at(5, 6));
    expect(where(id(at(6, 4)))).toEqual(at(6, 4));
    // No damage, and it was the Horror's action in place of its attack.
    for (const unit of played.state.units)
      expect(unit.hp).toBe(
        state.units.find((candidate) => candidate.id === unit.id)?.hp,
      );
    expect(unitAtV7(played.state, at(5, 4)).activation).toMatchObject({
      specialActed: true,
      handled: true,
    });
    expect(rejectedV7(played.state, boo(played.state, at(5, 4))).code).toBe(
      "UNIT_ALREADY_ACTED",
    );
  });

  it("scares nobody that is not living: Undead units, constructs, daemons, Eggs", () => {
    const undead = horrorField([{ seat: 1, role: "FIGHTER", at: at(5, 5) }], {
      factions: ["CULT", "UNDEAD"],
    });
    expect(rejectedV7(undead, boo(undead, at(5, 4)))).toEqual({
      code: "BOO_NOT_LEGAL",
      params: { reason: "NOBODY" },
    });
    // Another Horror beside it is no victim either.
    const two = withHorrorV7(horrorField([]), 0, at(5, 5));
    expect(rejectedV7(two, boo(two, at(5, 4))).code).toBe("BOO_NOT_LEGAL");
    // Nobody around at all.
    const alone = horrorField([]);
    expect(offeredV7(alone, "BOO")).toEqual([]);
  });

  it("never pushes a unit onto a settlement center, off the board, or into water", () => {
    // (5, 5) is a village center: a unit at (5, 6) beside a Horror at
    // (5, 7) would land on it.
    const state = withHorrorV7(
      cultFieldV7(
        [
          { seat: 1, role: "FIGHTER", at: at(5, 6) },
          { seat: 1, role: "FIGHTER", at: at(6, 7) },
        ],
        { water: [at(7, 7)] },
      ),
      0,
      at(5, 7),
    );
    const played = playV7(state, boo(state, at(5, 7)));
    expect(eventsOf(played.events, "UNITS_SCARED")[0]?.results).toEqual([
      { unitId: unitAtV7(state, at(5, 6)).id, from: at(5, 6), to: null },
      { unitId: unitAtV7(state, at(6, 7)).id, from: at(6, 7), to: null },
    ]);
  });

  it("clears a garrison off a center", () => {
    const state = withHorrorV7(
      cultFieldV7([{ seat: 1, role: "FIGHTER", at: at(5, 5) }]),
      0,
      at(5, 4),
    );
    const played = playV7(state, boo(state, at(5, 4)));
    expect(unitAtV7(played.state, at(5, 6)).ownerId).toBe(seatIdV7(state, 1));
    expect(
      played.state.units.some((unit) => unit.at.x === 5 && unit.at.y === 5),
    ).toBe(false);
  });

  it("shows another viewer only the scared units it sees", () => {
    const state = horrorField([
      { seat: 0, role: "FIGHTER", at: at(4, 4) },
      { seat: 1, role: "FIGHTER", at: at(5, 5) },
    ]);
    const hidden = unexploreV7(state, 1, [at(4, 4), at(3, 4)]);
    const result = applyOkV7(hidden, seatIdV7(state, 0), boo(hidden, at(5, 4)));
    const seen = projectEventsV7(
      hidden,
      result.state,
      seatIdV7(state, 1),
      result.events,
    ).events.find((event) => event.kind === "UNITS_SCARED");
    expect(seen?.kind === "UNITS_SCARED" ? seen.results : null).toEqual([
      { unitId: unitAtV7(state, at(5, 5)).id, from: at(5, 5), to: at(5, 6) },
    ]);
  });
});

describe("the Cult's channel: the public view and Candlelit (section 6.2)", () => {
  it("shows a channeller on every explored tile, with its strand, to every viewer", () => {
    const state = withStrandsV7(
      horrorField([
        { seat: 0, role: "FIGHTER", at: at(5, 7) },
        // The enemy has one unit, far away: nothing of its own is near.
        { seat: 1, role: "FIGHTER", at: at(1, 1) },
      ]),
      at(5, 4),
      [at(5, 7)],
    );
    const cultist = unitAtV7(state, at(5, 7));
    const horror = unitAtV7(state, at(5, 4));
    const enemy = viewForV7(state, seatIdV7(state, 1));
    // Every unit on an explored tile is visible (the current rules): a
    // candle needs no line of sight.
    expect(enemy.units.some((unit) => unit.id === cultist.id)).toBe(true);
    expect(enemy.cult.strands).toEqual([
      { cultistUnitId: cultist.id, daemonUnitId: horror.id },
    ]);
    // It can be attacked from range by a unit that never saw it.
    const shooter = withStrandsV7(
      horrorField(
        [
          { seat: 0, role: "FIGHTER", at: at(5, 7) },
          { seat: 1, role: "MARKSMAN", at: at(5, 9) },
        ],
        { activeSeat: 1 },
      ),
      at(5, 4),
      [at(5, 7)],
    );
    expect(
      offeredV7(shooter, "ATTACK").some(
        (command) =>
          command.kind === "ATTACK" &&
          command.targetUnitId === unitAtV7(shooter, at(5, 7)).id,
      ),
    ).toBe(true);
    // A viewer that has not explored the daemon's tile still sees the
    // candle (the strand), without the daemon.
    const fogged = unexploreV7(state, 1, [at(5, 4)]);
    const partial = viewForV7(fogged, seatIdV7(state, 1));
    expect(partial.cult.strands).toEqual([
      { cultistUnitId: cultist.id, daemonUnitId: null },
    ]);
    expect(partial.cult.daemons).toEqual([]);
    // And one that has not explored the cultist's tile sees neither, but
    // the daemon's pips count the strand.
    const blind = viewForV7(
      unexploreV7(state, 1, [at(5, 7)]),
      seatIdV7(state, 1),
    );
    expect(blind.cult.strands).toEqual([]);
    expect(blind.cult.daemons).toEqual([
      { unitId: horror.id, role: "HORROR", control: 1, strands: 1 },
    ]);
  });

  it("projects a strand to whoever sees the cultist, and a summoning to whoever sees all three", () => {
    const state = summonField([{ seat: 1, role: "FIGHTER", at: at(1, 1) }]);
    const command = summon(state, at(5, 2), at(6, 2), at(5, 3));
    const result = applyOkV7(state, seatIdV7(state, 0), command);
    const kinds = (input: GameStateV7) =>
      projectEventsV7(
        input,
        applyOkV7(input, seatIdV7(state, 0), command).state,
        seatIdV7(state, 1),
        applyOkV7(input, seatIdV7(state, 0), command).events,
      ).events.map((event) => event.kind);
    expect(result.events.length).toBeGreaterThan(0);
    expect(kinds(state)).toEqual([
      "FAVOUR_SPENT",
      "DAEMON_SUMMONED",
      "STRAND_FORMED",
      "STRAND_FORMED",
    ]);
    // The Summoner's tile is unexplored: no summoning event, the Horror is
    // revealed, the helper's strand shows, and Favour is public.
    expect(kinds(unexploreV7(state, 1, [at(5, 2)]))).toEqual([
      "FAVOUR_SPENT",
      "UNIT_REVEALED",
      "STRAND_FORMED",
    ]);
  });

  it("carries strands, grips, and idols through a save and rejects malformed lists", () => {
    const state = withIdolsV7(
      withGripV7(
        withStrandsV7(
          horrorField([
            { seat: 0, role: "FIGHTER", at: at(5, 6) },
            { seat: 0, role: "JUGGERNAUT", at: at(6, 6) },
            { seat: 0, role: "GUARD", at: at(4, 6) },
            { seat: 0, role: "RAIDER", at: at(6, 5) },
            { seat: 1, role: "FIGHTER", at: at(1, 1) },
          ]),
          at(5, 4),
          [at(5, 6)],
        ),
        at(6, 6),
        at(5, 6),
      ),
      [at(4, 6)],
    );
    expect(parseGameStateV7(JSON.parse(JSON.stringify(state)))).toEqual(state);
    const id = (where: CoordV7) => unitAtV7(state, where).id;
    const withCult = (patch: object): unknown => ({
      ...state,
      cult: { ...state.cult, ...patch },
    });
    const strand = { cultistUnitId: id(at(5, 6)), daemonUnitId: id(at(5, 4)) };
    for (const [label, input] of [
      [
        "a strand of the Familiar",
        withCult({
          strands: [{ ...strand, cultistUnitId: id(at(6, 5)) }],
          grips: [],
        }),
      ],
      [
        "a strand to a unit that is no daemon",
        withCult({
          strands: [{ ...strand, daemonUnitId: id(at(4, 6)) }],
          grips: [],
        }),
      ],
      [
        "a strand of an enemy",
        withCult({
          strands: [{ ...strand, cultistUnitId: id(at(1, 1)) }],
          grips: [],
        }),
      ],
      [
        "a strand of a missing unit",
        withCult({ strands: [{ ...strand, cultistUnitId: 9999 }], grips: [] }),
      ],
      ["two strands of one cultist", withCult({ strands: [strand, strand] })],
      ["a grip without a strand", withCult({ strands: [] })],
      [
        "a grip by a unit that is no Thing",
        withCult({
          grips: [{ thingUnitId: id(at(4, 6)), cultistUnitId: id(at(5, 6)) }],
        }),
      ],
      [
        "a grip on a cultist not beside the Thing",
        withCult({
          strands: [{ ...strand, cultistUnitId: id(at(4, 6)) }],
          grips: [{ thingUnitId: id(at(6, 6)), cultistUnitId: id(at(4, 6)) }],
        }),
      ],
      [
        "an idol of a unit that is no Idol Bearer",
        withCult({ idols: [id(at(5, 6))] }),
      ],
      ["idols out of order", withCult({ idols: [id(at(4, 6)), id(at(4, 6))] })],
    ] as const)
      expect(parseGameStateV7(input), label).toBeNull();
  });

  it("does nothing in a match without a Cult seat", () => {
    const state = checkedV7(
      cultFieldV7([{ seat: 0, role: "FIGHTER", at: at(5, 5) }], {
        factions: ["ORIGINAL", "UNDEAD"],
      }),
    );
    const result = applyCommandV7(state, seatIdV7(state, 0), {
      kind: "END_TURN",
    });
    if (!result.accepted) throw new Error(result.error.code);
    expect(result.state.cult).toEqual({
      favour: [],
      strands: [],
      grips: [],
      idols: [],
    });
    expect(
      queryPlayerCommandsV7(viewForV7(state, seatIdV7(state, 0))).filter(
        (command) =>
          ["SUMMON", "CHANNEL", "BEHOLD", "ANCHOR", "BOO"].includes(
            command.kind,
          ),
      ),
    ).toEqual([]);
  });
});
