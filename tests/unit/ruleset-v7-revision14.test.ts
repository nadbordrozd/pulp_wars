import { describe, expect, it } from "vitest";
import {
  BITTEN_RISING_HP_V7,
  CITY_LEVEL_INCOME_CAP_V7,
  DOMAIN_EVENT_KIND_ORDER_V7,
  PLAGUE_DAMAGE_V7,
  PLAGUE_DURATION_TURNS_V7,
  RULESET_7_ID,
  SAVE_STORAGE_KEY_V7,
  TECHNOLOGY_IDS_V7,
  appendReplayCommandV7,
  applyCommandV7,
  canonicalHash,
  cityIncomeV7,
  cityLevelIncomeV7,
  createInitialMapStateV7,
  createInitialMapStateWithVillageCountV7,
  createPlayableGameV7,
  createReplayV7,
  effectiveRoleRuleV7,
  factionTreeV7,
  marketCoinsV7,
  parseEventV7,
  parseGameStateV7,
  parsePlayerEventEnvelopeV7,
  parseReplayJsonV7,
  previewTendWoundedV7,
  previewWailV7,
  projectEventsV7,
  prunedAfflictionsV7,
  queryCombatPreviewV7,
  queryPlayerCommandsV7,
  runReplayV7,
  unitId,
  villageCountV7,
  viewForV7,
  type CombatPreviewV7,
  type CommandV7,
  type CoordV7,
  type DomainEventV7,
  type FactionIdV7,
  type GameStateV7,
  type MatchSetupV7,
  type PlayerId,
  type UnitRoleIdV7,
  type UnitStateV7,
} from "../../src/engine/index";
import { runAiMatchV7 } from "../../src/headless/v7";
import {
  OBSOLETE_SAVE_STORAGE_KEYS_V7,
  createSaveEnvelopeV7,
  parseSaveV7,
} from "../../src/persistence/index";
import { checkedV7, mirrorOptionV7 } from "../fixtures/v7-builders";
import { createRevision13MapStateV7 } from "../fixtures/v7-revision13-map";
import { scriptedUndeadRaiseDeadSaveV7 } from "../fixtures/v7-undead-ui";

// Boards: the seed-2 DRY_LAND revision-13 boards the Undead tests use.
// - two seats (11 x 11): capitals (8, 8) and (2, 8); rows 0-4 west of x 6
//   are open neutral land.
// - three seats (14 x 14): capitals (2, 2), (11, 11), and (11, 2); the cells
//   used below (x 5-8, y 6-9, off the settlement lattice) are neutral.

const READY: UnitStateV7["activation"] = {
  moved: false,
  movedPathLength: 0,
  attacked: false,
  attacksUsed: 0,
  tendedThisTurn: false,
  inspired: false,
  overrunActive: false,
  escapeAvailable: false,
  recovered: false,
  captured: false,
  handled: false,
  specialActed: false,
};

interface Piece {
  readonly seat: number;
  readonly role: UnitRoleIdV7;
  readonly at: CoordV7;
  readonly hp?: number;
  readonly form?: UnitStateV7["form"];
  readonly homeless?: boolean;
}

interface ArenaOptions {
  readonly water?: readonly CoordV7[];
  readonly explored?: Readonly<Record<number, readonly CoordV7[]>>;
  /** The seat whose turn it is (seat 0 by default). */
  readonly activeSeat?: number;
  /** Plagued pieces (by coordinate) and the coordinate of their source. */
  readonly plagued?: readonly {
    at: CoordV7;
    source: CoordV7;
    /** Revision 15 remaining Plague turns (default 3, freshly applied). */
    turnsRemaining?: number;
  }[];
  /** Bitten pieces (by coordinate) and the coordinate of their biter. */
  readonly bitten?: readonly { at: CoordV7; biter: CoordV7 }[];
}

describe("ruleset-7 revision-14 identity and roster", () => {
  it("keeps rejecting r13 after the r29 identity and cleans the r13 through r28 save keys", () => {
    expect(RULESET_7_ID).toBe("pulp-wars-poc-7r29");
    expect(SAVE_STORAGE_KEY_V7).toBe("pulpWars.save.v7r29.current");
    expect(OBSOLETE_SAVE_STORAGE_KEYS_V7.slice(-16)).toEqual([
      "pulpWars.save.v7r13.current",
      "pulpWars.save.v7r14.current",
      "pulpWars.save.v7r15.current",
      "pulpWars.save.v7r16.current",
      "pulpWars.save.v7r17.current",
      "pulpWars.save.v7r18.current",
      "pulpWars.save.v7r19.current",
      "pulpWars.save.v7r20.current",
      "pulpWars.save.v7r21.current",
      "pulpWars.save.v7r22.current",
      "pulpWars.save.v7r23.current",
      "pulpWars.save.v7r24.current",
      "pulpWars.save.v7r25.current",
      "pulpWars.save.v7r26.current",
      "pulpWars.save.v7r27.current",
      "pulpWars.save.v7r28.current",
    ]);
    const state = arena(["UNDEAD", "ORIGINAL"], []);
    expect(
      parseGameStateV7({ ...state, rulesetId: "pulp-wars-poc-7r13" }),
    ).toBeNull();
  });

  it("registers Plague, Bite, Unanswered, and the Attack-3 Lich", () => {
    expect(effectiveRoleRuleV7("CATAPULT", "UNDEAD")).toMatchObject({
      label: "Lich",
      attack2: 6,
      abilities: ["ATTACK", "PLAGUE"],
    });
    expect(effectiveRoleRuleV7("GUARD", "UNDEAD").abilities).toEqual([
      "ATTACK",
      "CAPTURE",
      "INFECT",
      "BITE",
    ]);
    expect(effectiveRoleRuleV7("KNIGHT", "UNDEAD").abilities).toEqual([
      "ATTACK",
      "LIFESTEAL",
      "UNANSWERED",
    ]);
    for (const role of [
      "FIGHTER",
      "RAIDER",
      "MARKSMAN",
      "GUARD",
      "CAPTAIN",
      "CATAPULT",
      "KNIGHT",
      "JUGGERNAUT",
      "PATROL_BOAT",
      "BATTLESHIP",
    ] as const)
      for (const ability of ["PLAGUE", "BITE", "UNANSWERED"] as const)
        expect(effectiveRoleRuleV7(role, "ORIGINAL").abilities).not.toContain(
          ability,
        );
  });

  it("orders the new event kinds without moving revision-13 neighbours", () => {
    const at = (kind: (typeof DOMAIN_EVENT_KIND_ORDER_V7)[number]) =>
      DOMAIN_EVENT_KIND_ORDER_V7.indexOf(kind);
    expect(at("PLAGUE_DAMAGED")).toBe(at("TURN_STARTED") + 1);
    expect(at("PLAGUE_SPREAD")).toBe(at("TURN_STARTED") + 2);
    // Revision 15 inserts PLAGUE_EXPIRED after PLAGUE_SPREAD.
    expect(at("PLAGUE_EXPIRED")).toBe(at("TURN_STARTED") + 3);
    expect(at("WINDMILL_HEALING_RESOLVED")).toBe(at("TURN_STARTED") + 4);
    expect(at("UNIT_INFECTED")).toBe(at("UNIT_DIED") + 1);
    // The Martian revision inserts UNIT_MIND_CONTROLLED after UNIT_INFECTED.
    expect(at("UNIT_MIND_CONTROLLED")).toBe(at("UNIT_DIED") + 2);
    expect(at("GRAVE_CREATED")).toBe(at("UNIT_DIED") + 3);
    expect(at("BITTEN_UNIT_RISEN")).toBe(at("GRAVE_CREATED") + 1);
    expect(at("PLAGUE_CLEARED")).toBe(at("GRAVE_CREATED") + 2);
  });
});

describe("ruleset-7 revision-14 Plague", () => {
  it("plagues the surviving living primary and splash targets of a Lich attack", () => {
    const state = arena(
      ["UNDEAD", "ORIGINAL"],
      [
        { seat: 0, role: "CATAPULT", at: { x: 1, y: 1 } },
        { seat: 1, role: "GUARD", at: { x: 3, y: 1 } },
        { seat: 1, role: "FIGHTER", at: { x: 4, y: 1 } },
        { seat: 1, role: "FIGHTER", at: { x: 4, y: 0 }, hp: 1 },
      ],
    );
    const lich = unitAt(state, { x: 1, y: 1 });
    const guard = unitAt(state, { x: 3, y: 1 });
    const fighter = unitAt(state, { x: 4, y: 1 });
    const dying = unitAt(state, { x: 4, y: 0 });
    const result = attack(state, lich.at, guard.at);
    const preview = combatPreview(result.events);
    expect(preview.defenderDies).toBe(false);
    expect(preview.splash.map((entry) => [entry.unitId, entry.dies])).toEqual([
      [dying.id, true],
      [fighter.id, false],
    ]);
    // The defender first, then surviving splash targets; the dead one is not.
    expect(preview.plagued).toEqual([guard.id, fighter.id]);
    expect(result.state.plagued).toEqual([
      { unitId: guard.id, sourceUnitId: lich.id, turnsRemaining: 3 },
      { unitId: fighter.id, sourceUnitId: lich.id, turnsRemaining: 3 },
    ]);
    expect(
      queryCombatPreviewV7(state, state.humanPlayerId, lich.id, guard.id),
    ).toEqual(preview);
    const view = viewForV7(result.state, result.state.humanPlayerId);
    expect(view.plagued).toEqual([
      { unitId: guard.id, sourceUnitId: lich.id, turnsRemaining: 3 },
      { unitId: fighter.id, sourceUnitId: lich.id, turnsRemaining: 3 },
    ]);
  });

  it("never plagues Undead, stacks no second source, and needs a surviving attacking Lich", () => {
    const mirror = arena(
      ["UNDEAD", "UNDEAD"],
      [
        { seat: 0, role: "CATAPULT", at: { x: 1, y: 1 } },
        { seat: 1, role: "GUARD", at: { x: 3, y: 1 } },
      ],
    );
    expect(
      combatPreview(attack(mirror, { x: 1, y: 1 }, { x: 3, y: 1 }).events)
        .plagued,
    ).toEqual([]);

    // A second Lich does not replace the first source.
    const twice = arena(
      ["UNDEAD", "ORIGINAL"],
      [
        { seat: 0, role: "CATAPULT", at: { x: 1, y: 1 } },
        { seat: 0, role: "CATAPULT", at: { x: 1, y: 3 } },
        { seat: 1, role: "JUGGERNAUT", at: { x: 3, y: 2 } },
      ],
    );
    const firstLich = unitAt(twice, { x: 1, y: 1 });
    const juggernaut = unitAt(twice, { x: 3, y: 2 });
    const first = attack(twice, firstLich.at, juggernaut.at);
    const second = attack(first.state, { x: 1, y: 3 }, juggernaut.at);
    expect(combatPreview(second.events).plagued).toEqual([]);
    expect(second.state.plagued).toEqual([
      { unitId: juggernaut.id, sourceUnitId: firstLich.id, turnsRemaining: 3 },
    ]);

    // A retaliating Lich plagues nothing.
    const retaliation = arena(
      ["ORIGINAL", "UNDEAD"],
      [
        { seat: 0, role: "CATAPULT", at: { x: 1, y: 1 }, hp: 3 },
        { seat: 1, role: "CATAPULT", at: { x: 3, y: 1 } },
      ],
    );
    const retaliated = attack(retaliation, { x: 1, y: 1 }, { x: 3, y: 1 });
    expect(combatPreview(retaliated.events)).toMatchObject({
      retaliation: true,
      plagued: [],
    });
    expect(retaliated.state.plagued).toEqual([]);

    // A Lich killed by retaliation applies no Plague.
    const doomed = arena(
      ["UNDEAD", "ORIGINAL"],
      [
        { seat: 0, role: "CATAPULT", at: { x: 1, y: 1 }, hp: 1 },
        { seat: 1, role: "CATAPULT", at: { x: 3, y: 1 } },
      ],
    );
    const died = attack(doomed, { x: 1, y: 1 }, { x: 3, y: 1 });
    expect(combatPreview(died.events)).toMatchObject({
      attackerDies: true,
      plagued: [],
    });
    expect(died.state.plagued).toEqual([]);
  });

  it("damages, kills, and spreads at the plagued owner's Start Turn, before Windmill healing", () => {
    // Seat 0 (Undead) ends its turn; seat 1 (Human) starts and suffers.
    const state = arena(
      ["UNDEAD", "ORIGINAL", "ORIGINAL"],
      [
        { seat: 0, role: "CATAPULT", at: { x: 5, y: 9 } },
        { seat: 1, role: "FIGHTER", at: { x: 6, y: 6 } },
        { seat: 1, role: "FIGHTER", at: { x: 7, y: 6 } },
        { seat: 2, role: "FIGHTER", at: { x: 6, y: 7 } },
        { seat: 0, role: "FIGHTER", at: { x: 7, y: 7 } },
        { seat: 1, role: "FIGHTER", at: { x: 8, y: 6 } },
        { seat: 1, role: "GUARD", at: { x: 6, y: 9 }, hp: 2 },
        { seat: 2, role: "FIGHTER", at: { x: 7, y: 9 } },
      ],
      {
        activeSeat: 0,
        plagued: [
          { at: { x: 6, y: 6 }, source: { x: 5, y: 9 } },
          { at: { x: 6, y: 9 }, source: { x: 5, y: 9 } },
        ],
      },
    );
    const lich = unitAt(state, { x: 5, y: 9 });
    const sufferer = unitAt(state, { x: 6, y: 6 });
    const ownNeighbour = unitAt(state, { x: 7, y: 6 });
    const foreignNeighbour = unitAt(state, { x: 6, y: 7 });
    const undeadNeighbour = unitAt(state, { x: 7, y: 7 });
    const secondRing = unitAt(state, { x: 8, y: 6 });
    const dying = unitAt(state, { x: 6, y: 9 });
    const deadNeighbour = unitAt(state, { x: 7, y: 9 });
    const seat1 = seatPlayer(state, 1);
    const ended = endTurnUntil(state, seat1);
    const kinds = ended.events.map((event) => event.kind);
    const turnStarted = kinds.lastIndexOf("TURN_STARTED");
    expect(kinds.slice(turnStarted, turnStarted + 5)).toEqual([
      "TURN_STARTED",
      "PLAGUE_DAMAGED",
      "UNIT_DIED",
      "GRAVE_CREATED",
      "PLAGUE_SPREAD",
    ]);
    expect(ended.events[turnStarted + 1]).toEqual({
      kind: "PLAGUE_DAMAGED",
      playerId: seat1,
      results: [
        { unitId: sufferer.id, at: sufferer.at, damage: 2, dies: false },
        { unitId: dying.id, at: dying.at, damage: 2, dies: true },
      ],
    });
    expect(ended.events[turnStarted + 2]).toEqual({
      kind: "UNIT_DIED",
      unitId: dying.id,
      cause: "PLAGUE",
    });
    // Spread from the survivor to every adjacent living unit of any owner;
    // not to the Undead neighbour, not from the dead unit, and not onward.
    expect(ended.events[turnStarted + 4]).toEqual({
      kind: "PLAGUE_SPREAD",
      playerId: seat1,
      results: [
        { unitId: ownNeighbour.id, at: ownNeighbour.at },
        { unitId: foreignNeighbour.id, at: foreignNeighbour.at },
      ],
    });
    // Revision 15: the sufferer counts one turn down; spread starts at 3.
    expect(ended.state.plagued).toEqual(
      [sufferer, ownNeighbour, foreignNeighbour]
        .map((unit) => ({
          unitId: unit.id,
          sourceUnitId: lich.id,
          turnsRemaining: unit.id === sufferer.id ? 2 : 3,
        }))
        .sort((left, right) => left.unitId - right.unitId),
    );
    expect(unitById(ended.state, sufferer.id).hp).toBe(
      sufferer.hp - PLAGUE_DAMAGE_V7,
    );
    expect(ended.state.graves).toEqual([dying.at]);
    expect(unitById(ended.state, lich.id).kills).toBe(0);
    for (const untouched of [undeadNeighbour, secondRing, deadNeighbour])
      expect(
        ended.state.plagued.some((entry) => entry.unitId === untouched.id),
      ).toBe(false);
    for (const event of ended.events) expect(parseEventV7(event).ok).toBe(true);
  });

  it("clears every Plague of a Lich when it leaves the board", () => {
    const state = arena(
      ["ORIGINAL", "UNDEAD"],
      [
        { seat: 0, role: "KNIGHT", at: { x: 1, y: 1 } },
        { seat: 1, role: "CATAPULT", at: { x: 2, y: 1 }, hp: 1 },
        { seat: 0, role: "FIGHTER", at: { x: 4, y: 3 } },
        { seat: 0, role: "GUARD", at: { x: 1, y: 4 } },
      ],
      {
        plagued: [
          { at: { x: 4, y: 3 }, source: { x: 2, y: 1 } },
          { at: { x: 1, y: 4 }, source: { x: 2, y: 1 } },
        ],
      },
    );
    const fighter = unitAt(state, { x: 4, y: 3 });
    const guard = unitAt(state, { x: 1, y: 4 });
    const result = attack(state, { x: 1, y: 1 }, { x: 2, y: 1 });
    expect(combatPreview(result.events).defenderDies).toBe(true);
    expect(result.state.plagued).toEqual([]);
    expect(result.events.at(-1)).toEqual({
      kind: "PLAGUE_CLEARED",
      unitIds: [fighter.id, guard.id].sort((left, right) => left - right),
    });

    // Disbanding the Lich clears its Plague too.
    const disbanding = arena(
      ["UNDEAD", "ORIGINAL"],
      [
        { seat: 0, role: "CATAPULT", at: { x: 2, y: 1 } },
        { seat: 1, role: "FIGHTER", at: { x: 4, y: 3 } },
      ],
      { plagued: [{ at: { x: 4, y: 3 }, source: { x: 2, y: 1 } }] },
    );
    const lich = unitAt(disbanding, { x: 2, y: 1 });
    const disbanded = apply(disbanding, lich.ownerId, {
      kind: "DISBAND",
      unitId: lich.id,
    });
    expect(disbanded.state.plagued).toEqual([]);
    expect(disbanded.events.at(-1)).toMatchObject({ kind: "PLAGUE_CLEARED" });
  });

  it("forbids Disband for plagued and bitten units", () => {
    const state = arena(
      ["ORIGINAL", "UNDEAD"],
      [
        { seat: 0, role: "FIGHTER", at: { x: 1, y: 1 } },
        { seat: 0, role: "FIGHTER", at: { x: 3, y: 1 } },
        { seat: 0, role: "FIGHTER", at: { x: 1, y: 3 } },
        { seat: 1, role: "CATAPULT", at: { x: 4, y: 4 } },
        { seat: 1, role: "GUARD", at: { x: 0, y: 4 } },
      ],
      {
        plagued: [{ at: { x: 1, y: 1 }, source: { x: 4, y: 4 } }],
        bitten: [{ at: { x: 3, y: 1 }, biter: { x: 0, y: 4 } }],
      },
    );
    const plagued = unitAt(state, { x: 1, y: 1 });
    const bitten = unitAt(state, { x: 3, y: 1 });
    const healthy = unitAt(state, { x: 1, y: 3 });
    const disbands = queryPlayerCommandsV7(state, state.humanPlayerId)
      .filter((command) => command.kind === "DISBAND")
      .map((command) => ("unitId" in command ? command.unitId : null));
    expect(disbands).toEqual([healthy.id]);
    for (const [unit, reason] of [
      [plagued, "PLAGUED"],
      [bitten, "BITTEN"],
    ] as const)
      expect(
        applyCommandV7(state, state.humanPlayerId, {
          kind: "DISBAND",
          unitId: unit.id,
        }),
      ).toMatchObject({
        accepted: false,
        error: { code: "DISBAND_NOT_LEGAL", params: { reason } },
      });
  });
});

describe("ruleset-7 revision-14 Bitten", () => {
  it("bites a surviving living land unit on Zombie attack and retaliation", () => {
    const state = arena(
      ["UNDEAD", "ORIGINAL"],
      [
        { seat: 0, role: "GUARD", at: { x: 1, y: 1 } },
        { seat: 1, role: "GUARD", at: { x: 2, y: 1 } },
      ],
    );
    const zombie = unitAt(state, { x: 1, y: 1 });
    const guard = unitAt(state, { x: 2, y: 1 });
    const bitten = attack(state, zombie.at, guard.at);
    const preview = combatPreview(bitten.events);
    expect(preview).toMatchObject({
      defenderDies: false,
      defenderBitten: true,
      attackerBitten: false,
    });
    expect(bitten.state.bitten).toEqual([
      {
        unitId: guard.id,
        biterPlayerId: zombie.ownerId,
        biterUnitId: zombie.id,
      },
    ]);
    expect(
      queryCombatPreviewV7(state, state.humanPlayerId, zombie.id, guard.id),
    ).toEqual(preview);
    expect(viewForV7(bitten.state, guard.ownerId).bitten).toEqual([
      { unitId: guard.id, biterPlayerId: zombie.ownerId },
    ]);

    const retaliating = arena(
      ["ORIGINAL", "UNDEAD"],
      [
        { seat: 0, role: "FIGHTER", at: { x: 1, y: 1 } },
        { seat: 1, role: "GUARD", at: { x: 2, y: 1 } },
      ],
    );
    const fighter = unitAt(retaliating, { x: 1, y: 1 });
    const retaliation = attack(retaliating, fighter.at, { x: 2, y: 1 });
    expect(combatPreview(retaliation.events)).toMatchObject({
      attackerDies: false,
      attackerBitten: true,
      defenderBitten: false,
    });
    expect(retaliation.state.bitten.map((entry) => entry.unitId)).toEqual([
      fighter.id,
    ]);
  });

  it("does not bite Undead, embarked, or killed units", () => {
    const mirror = arena(
      ["UNDEAD", "UNDEAD"],
      [
        { seat: 0, role: "GUARD", at: { x: 1, y: 1 } },
        { seat: 1, role: "GUARD", at: { x: 2, y: 1 } },
      ],
    );
    expect(attack(mirror, { x: 1, y: 1 }, { x: 2, y: 1 }).state.bitten).toEqual(
      [],
    );

    const afloat = arena(
      ["UNDEAD", "ORIGINAL"],
      [
        { seat: 0, role: "GUARD", at: { x: 1, y: 1 } },
        { seat: 1, role: "FIGHTER", at: { x: 2, y: 1 }, form: "EMBARKED" },
      ],
      { water: [{ x: 2, y: 1 }] },
    );
    const embarked = attack(afloat, { x: 1, y: 1 }, { x: 2, y: 1 });
    expect(combatPreview(embarked.events).defenderBitten).toBe(false);
    expect(embarked.state.bitten).toEqual([]);

    const lethal = arena(
      ["UNDEAD", "ORIGINAL"],
      [
        { seat: 0, role: "GUARD", at: { x: 1, y: 1 } },
        { seat: 1, role: "FIGHTER", at: { x: 2, y: 1 }, hp: 1 },
      ],
    );
    const killed = attack(lethal, { x: 1, y: 1 }, { x: 2, y: 1 });
    expect(combatPreview(killed.events)).toMatchObject({
      defenderDies: true,
      defenderInfected: true,
      defenderBitten: false,
      defenderBittenRises: false,
    });
  });

  it("keeps the last biter", () => {
    const state = arena(
      ["ORIGINAL", "UNDEAD", "UNDEAD"],
      [
        { seat: 1, role: "GUARD", at: { x: 6, y: 6 } },
        { seat: 0, role: "GUARD", at: { x: 7, y: 7 } },
        { seat: 2, role: "GUARD", at: { x: 8, y: 8 } },
      ],
      { activeSeat: 1 },
    );
    const first = attack(state, { x: 6, y: 6 }, { x: 7, y: 7 });
    const target = unitAt(first.state, { x: 7, y: 7 });
    expect(first.state.bitten).toEqual([
      {
        unitId: target.id,
        biterPlayerId: seatPlayer(state, 1),
        biterUnitId: unitAt(state, { x: 6, y: 6 }).id,
      },
    ]);
    const secondTurn = checkedV7({
      ...first.state,
      activeSeatIndex: first.state.turnOrder.indexOf(seatPlayer(state, 2)),
    });
    const second = attack(secondTurn, { x: 8, y: 8 }, { x: 7, y: 7 });
    expect(second.state.bitten).toEqual([
      {
        unitId: target.id,
        biterPlayerId: seatPlayer(state, 2),
        biterUnitId: unitAt(state, { x: 8, y: 8 }).id,
      },
    ]);
  });

  it("raises a bitten victim as the biter's Zombie whoever kills it, without a Grave or an advance", () => {
    // Seat 2 (Human) kills a seat-1 (Human) unit bitten by a seat-0 Zombie.
    const state = arena(
      ["UNDEAD", "ORIGINAL", "ORIGINAL"],
      [
        { seat: 0, role: "GUARD", at: { x: 5, y: 9 } },
        { seat: 1, role: "FIGHTER", at: { x: 7, y: 7 }, hp: 1 },
        { seat: 2, role: "KNIGHT", at: { x: 6, y: 6 } },
      ],
      {
        activeSeat: 2,
        bitten: [{ at: { x: 7, y: 7 }, biter: { x: 5, y: 9 } }],
      },
    );
    const zombie = unitAt(state, { x: 5, y: 9 });
    const victim = unitAt(state, { x: 7, y: 7 });
    const knight = unitAt(state, { x: 6, y: 6 });
    const result = attack(state, knight.at, victim.at);
    const preview = combatPreview(result.events);
    expect(preview).toMatchObject({
      defenderDies: true,
      defenderInfected: false,
      defenderBittenRises: true,
      advances: false,
      overrunContinues: false,
    });
    const risingId = unitId(state.nextEntityId);
    expect(withoutTail(result.events).slice(1, 3)).toEqual([
      { kind: "UNIT_DIED", unitId: victim.id, cause: "ATTACK" },
      {
        kind: "BITTEN_UNIT_RISEN",
        playerId: zombie.ownerId,
        victimUnitId: victim.id,
        unitId: risingId,
        at: victim.at,
        homeCityId: zombie.homeCityId,
      },
    ]);
    expect(unitById(result.state, risingId)).toMatchObject({
      ownerId: zombie.ownerId,
      homeCityId: zombie.homeCityId,
      role: "GUARD",
      form: "LAND",
      at: victim.at,
      hp: BITTEN_RISING_HP_V7,
      // Revision 15: the Zombie's maximum HP (18, was 20).
      maxHp: effectiveRoleRuleV7("GUARD", "UNDEAD").maxHp,
      kills: 0,
      captureEligible: false,
      activation: { handled: true, attacked: true },
    });
    expect(unitById(result.state, knight.id)).toMatchObject({
      at: knight.at,
      kills: 1,
    });
    expect(result.state.graves).toEqual([]);
    expect(result.state.bitten).toEqual([]);
    expect(
      queryCombatPreviewV7(state, knight.ownerId, knight.id, victim.id),
    ).toMatchObject({ defenderBittenRises: true, advances: false });

    // The rising is orphaned when the biting Zombie has left the board.
    const orphaned = checkedV7({
      ...state,
      units: state.units.filter((unit) => unit.id !== zombie.id),
    });
    const orphanResult = attack(orphaned, knight.at, victim.at);
    expect(unitById(orphanResult.state, risingId).homeCityId).toBeNull();
  });

  it("raises bitten victims of splash, Wail, and Plague deaths", () => {
    // Wail: a seat-0 Banshee kills a bitten Human.
    const wailing = arena(
      ["UNDEAD", "ORIGINAL"],
      [
        { seat: 0, role: "MARKSMAN", at: { x: 1, y: 1 } },
        { seat: 0, role: "GUARD", at: { x: 4, y: 4 } },
        { seat: 1, role: "FIGHTER", at: { x: 2, y: 2 }, hp: 1 },
      ],
      { bitten: [{ at: { x: 2, y: 2 }, biter: { x: 4, y: 4 } }] },
    );
    const banshee = unitAt(wailing, { x: 1, y: 1 });
    const wailVictim = unitAt(wailing, { x: 2, y: 2 });
    const preview = previewWailV7(wailing, wailing.humanPlayerId, banshee.id);
    expect(preview?.targets).toMatchObject([
      {
        unitId: wailVictim.id,
        dies: true,
        leavesGrave: false,
        bittenRises: true,
      },
    ]);
    const wailed = apply(wailing, banshee.ownerId, {
      kind: "WAIL",
      unitId: banshee.id,
    });
    expect(wailed.events.map((event) => event.kind).slice(0, 3)).toEqual([
      "WAIL_RESOLVED",
      "UNIT_DIED",
      "BITTEN_UNIT_RISEN",
    ]);
    expect(unitAt(wailed.state, { x: 2, y: 2 })).toMatchObject({
      ownerId: banshee.ownerId,
      role: "GUARD",
    });

    // Splash: a Lich splash kill of a bitten Human.
    const splashing = arena(
      ["UNDEAD", "ORIGINAL"],
      [
        { seat: 0, role: "CATAPULT", at: { x: 1, y: 1 } },
        { seat: 0, role: "GUARD", at: { x: 0, y: 4 } },
        { seat: 1, role: "JUGGERNAUT", at: { x: 3, y: 1 } },
        { seat: 1, role: "FIGHTER", at: { x: 4, y: 1 }, hp: 1 },
      ],
      { bitten: [{ at: { x: 4, y: 1 }, biter: { x: 0, y: 4 } }] },
    );
    const splashed = attack(splashing, { x: 1, y: 1 }, { x: 3, y: 1 });
    expect(withoutTail(splashed.events).map((event) => event.kind)).toEqual(
      expect.arrayContaining(["UNIT_DIED", "BITTEN_UNIT_RISEN"]),
    );
    expect(unitAt(splashed.state, { x: 4, y: 1 }).role).toBe("GUARD");
    expect(splashed.state.graves).toEqual([]);

    // Plague: a bitten, plagued Human dies at its Start Turn and rises.
    const plagued = arena(
      ["UNDEAD", "ORIGINAL"],
      [
        { seat: 0, role: "CATAPULT", at: { x: 0, y: 0 } },
        { seat: 0, role: "GUARD", at: { x: 0, y: 4 } },
        { seat: 1, role: "FIGHTER", at: { x: 3, y: 2 }, hp: 2 },
      ],
      {
        plagued: [{ at: { x: 3, y: 2 }, source: { x: 0, y: 0 } }],
        bitten: [{ at: { x: 3, y: 2 }, biter: { x: 0, y: 4 } }],
      },
    );
    const human = seatPlayer(plagued, 1);
    const ended = endTurnUntil(plagued, human);
    const kinds = ended.events.map((event) => event.kind);
    const died = kinds.indexOf("UNIT_DIED");
    expect(kinds.slice(died, died + 2)).toEqual([
      "UNIT_DIED",
      "BITTEN_UNIT_RISEN",
    ]);
    expect(ended.events[died]).toMatchObject({ cause: "PLAGUE" });
    expect(unitAt(ended.state, { x: 3, y: 2 })).toMatchObject({
      ownerId: seatPlayer(plagued, 0),
      role: "GUARD",
      hp: BITTEN_RISING_HP_V7,
    });
    expect(ended.state.plagued).toEqual([]);
    expect(ended.state.bitten).toEqual([]);
  });
});

describe("ruleset-7 revision-14 Tend Wounded cures", () => {
  it("cures Plague and Bitten, even at full HP, and previews exactly", () => {
    const state = arena(
      ["ORIGINAL", "UNDEAD"],
      [
        { seat: 0, role: "CAPTAIN", at: { x: 2, y: 2 } },
        { seat: 0, role: "FIGHTER", at: { x: 1, y: 1 } },
        { seat: 0, role: "FIGHTER", at: { x: 3, y: 3 }, hp: 5 },
        { seat: 0, role: "GUARD", at: { x: 3, y: 1 } },
        { seat: 1, role: "CATAPULT", at: { x: 0, y: 4 } },
        { seat: 1, role: "GUARD", at: { x: 5, y: 0 } },
      ],
      {
        plagued: [
          { at: { x: 1, y: 1 }, source: { x: 0, y: 4 } },
          { at: { x: 3, y: 3 }, source: { x: 0, y: 4 } },
        ],
        bitten: [{ at: { x: 3, y: 3 }, biter: { x: 5, y: 0 } }],
      },
    );
    const captain = unitAt(state, { x: 2, y: 2 });
    const full = unitAt(state, { x: 1, y: 1 });
    const wounded = unitAt(state, { x: 3, y: 3 });
    const preview = previewTendWoundedV7(
      state,
      state.humanPlayerId,
      captain.id,
    );
    const expected = [
      {
        unitId: full.id,
        amount: 0,
        hpAfter: full.hp,
        curedPlague: true,
        curedBitten: false,
        curedChill: false,
      },
      {
        unitId: wounded.id,
        amount: 2,
        hpAfter: 7,
        curedPlague: true,
        curedBitten: true,
        curedChill: false,
      },
    ].sort((left, right) => left.unitId - right.unitId);
    expect(preview).toEqual({ results: expected });
    const tended = apply(state, state.humanPlayerId, {
      kind: "TEND_WOUNDED",
      unitId: captain.id,
    });
    expect(tended.events[0]).toEqual({
      kind: "WOUNDED_TENDED",
      captainId: captain.id,
      results: expected,
    });
    expect(tended.state.plagued).toEqual([]);
    expect(tended.state.bitten).toEqual([]);
    expect(parseEventV7(tended.events[0]).ok).toBe(true);

    // With only a full-HP plagued neighbour, Tend is still offered.
    const onlyPlagued = arena(
      ["ORIGINAL", "UNDEAD"],
      [
        { seat: 0, role: "CAPTAIN", at: { x: 2, y: 2 } },
        { seat: 0, role: "FIGHTER", at: { x: 1, y: 1 } },
        { seat: 1, role: "CATAPULT", at: { x: 0, y: 4 } },
      ],
      { plagued: [{ at: { x: 1, y: 1 }, source: { x: 0, y: 4 } }] },
    );
    expect(
      queryPlayerCommandsV7(onlyPlagued, onlyPlagued.humanPlayerId),
    ).toContainEqual({
      kind: "TEND_WOUNDED",
      unitId: unitAt(onlyPlagued, { x: 2, y: 2 }).id,
    });
  });
});

describe("ruleset-7 revision-14 Vampire", () => {
  it("draws no retaliation when attacking but still retaliates", () => {
    const state = arena(
      ["UNDEAD", "ORIGINAL"],
      [
        { seat: 0, role: "KNIGHT", at: { x: 1, y: 1 } },
        { seat: 1, role: "GUARD", at: { x: 2, y: 1 } },
      ],
    );
    const vampire = unitAt(state, { x: 1, y: 1 });
    const guard = unitAt(state, { x: 2, y: 1 });
    const result = attack(state, vampire.at, guard.at);
    const preview = combatPreview(result.events);
    expect(preview).toMatchObject({
      defenderDies: false,
      retaliation: false,
      noRetaliationReason: "UNANSWERED",
      damageToAttacker: 0,
      attackerDies: false,
    });
    expect(
      queryCombatPreviewV7(state, state.humanPlayerId, vampire.id, guard.id),
    ).toEqual(preview);

    const defending = arena(
      ["ORIGINAL", "UNDEAD"],
      [
        { seat: 0, role: "FIGHTER", at: { x: 1, y: 1 } },
        { seat: 1, role: "KNIGHT", at: { x: 2, y: 1 } },
      ],
    );
    expect(
      combatPreview(attack(defending, { x: 1, y: 1 }, { x: 2, y: 1 }).events),
    ).toMatchObject({ retaliation: true, noRetaliationReason: null });

    // The Human Knight is unchanged.
    const knight = arena(
      ["ORIGINAL", "UNDEAD"],
      [
        { seat: 0, role: "KNIGHT", at: { x: 1, y: 1 } },
        { seat: 1, role: "GUARD", at: { x: 2, y: 1 } },
      ],
    );
    expect(
      combatPreview(attack(knight, { x: 1, y: 1 }, { x: 2, y: 1 }).events),
    ).toMatchObject({ retaliation: true, noRetaliationReason: null });
  });
});

describe("ruleset-7 revision-14 fog and state", () => {
  it("names a plague source only when visible and projects affliction events per viewer", () => {
    const state = arena(
      ["UNDEAD", "ORIGINAL"],
      [
        { seat: 0, role: "CATAPULT", at: { x: 0, y: 0 } },
        { seat: 1, role: "FIGHTER", at: { x: 4, y: 3 } },
        { seat: 1, role: "FIGHTER", at: { x: 5, y: 3 } },
      ],
      {
        plagued: [{ at: { x: 4, y: 3 }, source: { x: 0, y: 0 } }],
        explored: {
          1: allExcept([{ x: 0, y: 0 }]),
        },
      },
    );
    const human = seatPlayer(state, 1);
    const sufferer = unitAt(state, { x: 4, y: 3 });
    expect(viewForV7(state, human).plagued).toEqual([
      { unitId: sufferer.id, sourceUnitId: null, turnsRemaining: 3 },
    ]);
    expect(viewForV7(state, state.humanPlayerId).plagued).toEqual([
      {
        unitId: sufferer.id,
        sourceUnitId: unitAt(state, { x: 0, y: 0 }).id,
        turnsRemaining: 3,
      },
    ]);

    const ended = endTurnUntil(state, human);
    const undeadView = viewForV7(ended.state, state.humanPlayerId);
    expect(undeadView.plagued.length).toBeGreaterThan(0);
    // A viewer that explored nothing near the plague learns nothing of it.
    const blind = checkedV7({
      ...state,
      players: state.players.map((player) =>
        player.seat === 0 ? { ...player, explored: [{ x: 0, y: 0 }] } : player,
      ),
    });
    const blindEnd = endTurnUntil(blind, human);
    const projected = projectEventsV7(
      blind,
      blindEnd.state,
      blind.humanPlayerId,
      blindEnd.events,
    );
    expect(
      projected.events.some(
        (event) =>
          event.kind === "PLAGUE_DAMAGED" || event.kind === "PLAGUE_SPREAD",
      ),
    ).toBe(false);
    expect(parsePlayerEventEnvelopeV7(projected).ok).toBe(true);
    const own = projectEventsV7(blind, blindEnd.state, human, blindEnd.events);
    expect(own.events.map((event) => event.kind)).toEqual(
      expect.arrayContaining(["PLAGUE_DAMAGED", "PLAGUE_SPREAD"]),
    );
    expect(parsePlayerEventEnvelopeV7(own).ok).toBe(true);
  });

  it("validates, hashes, and prunes afflictions", () => {
    const state = arena(
      ["UNDEAD", "ORIGINAL"],
      [
        { seat: 0, role: "CATAPULT", at: { x: 0, y: 0 } },
        { seat: 0, role: "GUARD", at: { x: 0, y: 2 } },
        { seat: 1, role: "FIGHTER", at: { x: 4, y: 3 } },
      ],
      {
        plagued: [{ at: { x: 4, y: 3 }, source: { x: 0, y: 0 } }],
        bitten: [{ at: { x: 4, y: 3 }, biter: { x: 0, y: 2 } }],
      },
    );
    const lich = unitAt(state, { x: 0, y: 0 });
    const zombie = unitAt(state, { x: 0, y: 2 });
    const fighter = unitAt(state, { x: 4, y: 3 });
    expect(parseGameStateV7(JSON.parse(JSON.stringify(state)))).toEqual(state);
    expect(canonicalHash(state)).not.toBe(
      canonicalHash({ ...state, plagued: [], bitten: [] }),
    );
    for (const invalid of [
      {
        plagued: [
          { unitId: zombie.id, sourceUnitId: lich.id, turnsRemaining: 3 },
        ],
      },
      {
        plagued: [
          { unitId: fighter.id, sourceUnitId: zombie.id, turnsRemaining: 3 },
        ],
      },
      {
        plagued: [
          { unitId: fighter.id, sourceUnitId: lich.id, turnsRemaining: 3 },
          { unitId: fighter.id, sourceUnitId: lich.id, turnsRemaining: 3 },
        ],
      },
      {
        bitten: [
          {
            unitId: fighter.id,
            biterPlayerId: fighter.ownerId,
            biterUnitId: zombie.id,
          },
        ],
      },
      {
        bitten: [
          {
            unitId: zombie.id,
            biterPlayerId: zombie.ownerId,
            biterUnitId: zombie.id,
          },
        ],
      },
    ])
      expect(parseGameStateV7({ ...state, ...invalid })).toBeNull();
    const human = arena(["ORIGINAL", "ORIGINAL"], []);
    expect(parseGameStateV7(human)).toEqual(human);
    expect(
      parseGameStateV7({
        ...human,
        bitten: [
          {
            unitId: unitId(1),
            biterPlayerId: human.humanPlayerId,
            biterUnitId: unitId(2),
          },
        ],
      }),
    ).toBeNull();

    // Pruning drops departed units, a departed source, and eliminated biters.
    const pruned = prunedAfflictionsV7({
      ...state,
      units: state.units.filter((unit) => unit.id !== lich.id),
      players: state.players.map((player) =>
        player.id === zombie.ownerId
          ? { ...player, status: "ELIMINATED" as const }
          : player,
      ),
    });
    expect(pruned.plagued).toEqual([]);
    expect(pruned.bitten).toEqual([]);
  });
});

describe("ruleset-7 revision-14 villages and economy", () => {
  it("adds one neutral village except on two crowded Archipelago setups", () => {
    const cases = [
      [11, 1, "CONTINENTS", 4],
      [11, 1, "ARCHIPELAGO", 3],
      [14, 1, "PANGEA", 4],
      [14, 2, "LAKES", 5],
      [16, 1, "DRY_LAND", 4],
      [16, 2, "ARCHIPELAGO", 5],
      [16, 3, "CONTINENTS", 7],
      [16, 3, "ARCHIPELAGO", 6],
      [20, 1, "DRY_LAND", 14],
      [20, 3, "PANGEA", 12],
      [25, 2, "DRY_LAND", 20],
    ] as const;
    for (const [width, aiCount, mapType, villages] of cases) {
      const setup = setupWith(
        Array.from({ length: aiCount + 1 }, () => "ORIGINAL" as const),
        4,
        { width, mapType },
      );
      expect(villageCountV7(setup)).toBe(villages);
      if (width > 16) continue;
      const created = createInitialMapStateV7(setup);
      if (!created.ok) throw new Error(created.error.code);
      expect(
        created.state.board.tiles.filter((tile) => tile.site === "VILLAGE"),
      ).toHaveLength(villages);
      expect(
        created.state.board.tiles.filter((tile) => tile.site === "CAPITAL"),
      ).toHaveLength(aiCount + 1);
    }
    // Seed 218 is one of the seven seeds (of 0-999) whose 16 x 16 three-AI
    // Archipelago fails acceptance with seven villages; with six it generates.
    const crowded = setupWith(
      ["ORIGINAL", "ORIGINAL", "ORIGINAL", "ORIGINAL"],
      218,
      { mapType: "ARCHIPELAGO" },
    );
    expect(createInitialMapStateV7(crowded).ok).toBe(true);
    expect(createInitialMapStateWithVillageCountV7(crowded, 7)).toMatchObject({
      ok: false,
      error: { code: "MAP_GENERATION_FAILED" },
    });
  });

  it("caps the level term and stops Commerce doubling Markets", () => {
    // Revision 14 (E2) capped the level term at 5 and the Market at 4;
    // revision 16 (economy deflation) lowers them to 4 and 3.
    expect(CITY_LEVEL_INCOME_CAP_V7).toBe(4);
    expect([1, 4, 5, 6, 9].map(cityLevelIncomeV7)).toEqual([1, 4, 4, 4, 4]);
    expect([1, 3, 4, 7].map(marketCoinsV7)).toEqual([1, 3, 3, 3]);
    expect(
      factionTreeV7("ORIGINAL")
        .nodes.find((node) => node.id === "COMMERCE")
        ?.unlocks.map((unlock) => unlock.kind),
    ).toEqual(["LAND_TRADE_INCOME"]);
    const state = arena(["ORIGINAL", "ORIGINAL"], []);
    const capital = required(
      state.cities.find((city) => city.ownerId === state.humanPlayerId),
    );
    const at = (level: number) =>
      cityIncomeV7(state, { ...capital, level, population: 0 });
    // Level + capital: 4 + 1 at level 4 and at every level above it.
    expect([at(3), at(4), at(5), at(8)]).toEqual([4, 5, 5, 5]);
  });
});

describe("ruleset-7 revision-14 natural play and persistence", () => {
  it("round-trips Plague and Bitten from ordinary Normal AI play", () => {
    // Seed 15 (revision-16 economy numbers; seed 16 no longer plagues).
    const setup = setupWith(["UNDEAD", "ORIGINAL"], 15);
    const match = runAiMatchV7(setup, { maxRounds: 45 });
    expect(match.errors).toEqual([]);
    expect(match.stalls).toEqual([]);
    const undead = match.metrics.undead;
    expect(undead.plagueApplications).toBeGreaterThan(0);
    expect(undead.bites).toBeGreaterThan(0);
    let applications = 0;
    let bites = 0;
    for (const event of match.events) {
      expect(parseEventV7(event).ok).toBe(true);
      if (event.kind === "COMBAT_RESOLVED") {
        applications += event.preview.plagued.length;
        bites +=
          Number(event.preview.attackerBitten) +
          Number(event.preview.defenderBitten);
      }
    }
    expect(undead.plagueApplications).toBe(applications);
    expect(undead.bites).toBe(bites);
    expect(undead.bittenRisings).toBe(
      match.metrics.eventsByKind.BITTEN_UNIT_RISEN ?? 0,
    );
    expect(undead.plaguedRemaining).toBe(match.state.plagued.length);
    expect(undead.bittenRemaining).toBe(match.state.bitten.length);

    const created = createPlayableGameV7(setup);
    if (!created.ok) throw new Error(created.error.code);
    let state = created.state;
    let replay = createReplayV7(setup);
    for (const record of match.commandLog) {
      const result = applyCommandV7(state, record.playerId, record.command);
      if (!result.accepted) throw new Error(result.error.code);
      state = result.state;
      replay = appendReplayCommandV7(replay, record.command, state);
    }
    expect(canonicalHash(state)).toBe(match.stateHash);
    const parsed = parseReplayJsonV7(JSON.stringify(replay));
    if (parsed.kind !== "VALID") throw new Error(parsed.kind);
    expect(runReplayV7(parsed.replay).stateHash).toBe(match.stateHash);
    const save = createSaveEnvelopeV7(
      { state, replay },
      "2026-09-29T12:00:00.000Z",
    );
    expect(parseSaveV7(JSON.stringify(save))).toEqual({ kind: "VALID", save });
  }, 600_000);

  it("still scripts the browser smoke's Raise Dead save on its revision-14 map", () => {
    // The browser smoke resumes this replay-valid save; it must stop on a
    // human turn with Raise Dead offered for the Necromancer.
    const scripted = scriptedUndeadRaiseDeadSaveV7("2026-09-29T12:00:00.000Z");
    const loaded = parseSaveV7(scripted.source);
    if (loaded.kind !== "VALID") throw new Error(loaded.kind);
    const state = loaded.save.state;
    const necromancer = unitAt(state, scripted.necromancerAt);
    expect(necromancer).toMatchObject({
      role: "CAPTAIN",
      ownerId: state.humanPlayerId,
    });
    expect(state.turnOrder[state.activeSeatIndex]).toBe(state.humanPlayerId);
    expect(scripted.graves.length).toBeGreaterThan(0);
    expect(queryPlayerCommandsV7(state, state.humanPlayerId)).toContainEqual({
      kind: "RAISE_DEAD",
      unitId: necromancer.id,
    });
  });
});

function setupWith(
  factions: readonly FactionIdV7[],
  seed = 2,
  options: {
    readonly width?: MatchSetupV7["width"];
    readonly mapType?: MatchSetupV7["mapType"];
  } = {},
): MatchSetupV7 {
  const aiCount = (factions.length - 1) as 1 | 2 | 3;
  const size = options.width ?? (aiCount === 1 ? 11 : aiCount === 2 ? 14 : 16);
  return {
    rulesetId: RULESET_7_ID,
    seed,
    width: size,
    height: size,
    aiCount,
    aiDifficulty: "NORMAL",
    aiMode: "RIVAL",
    humanColor: "CORAL",
    factions: [...factions],
    ...mirrorOptionV7(factions),
    mapType: options.mapType ?? "DRY_LAND",
    mapGenerationRevision: "REGIONAL_BIOMES_NAVAL_V2",
  };
}

/**
 * A seed-2 revision-13 board with every technology, the given pieces as the
 * only units, every non-settlement piece tile cleared to Grass (or Shallow
 * Water), and the given afflictions.
 */
function arena(
  factions: readonly FactionIdV7[],
  pieces: readonly Piece[],
  options: ArenaOptions = {},
): GameStateV7 {
  const created = createRevision13MapStateV7(setupWith(factions));
  if (!created.ok) throw new Error(created.error.code);
  const base = created.state;
  const water = options.water ?? [];
  const player = (seat: number) =>
    required(base.players.find((candidate) => candidate.seat === seat));
  const units = pieces.map((piece, index): UnitStateV7 => {
    const owner = player(piece.seat);
    const rule = effectiveRoleRuleV7(piece.role, owner.faction);
    return {
      id: unitId(base.nextEntityId + index),
      ownerId: owner.id,
      homeCityId: piece.homeless
        ? null
        : (base.cities.find((city) => city.ownerId === owner.id)?.id ?? null),
      role: piece.role,
      form: piece.form ?? "LAND",
      at: piece.at,
      hp: piece.hp ?? rule.maxHp,
      maxHp: rule.maxHp,
      kills: 0,
      veteran: false,
      captureEligible: false,
      activation: READY,
    };
  });
  const idAt = (at: CoordV7) =>
    required(units.find((unit) => same(unit.at, at))).id;
  const cleared = [...pieces.map((piece) => piece.at), ...water];
  const activeId = player(options.activeSeat ?? 0).id;
  return checkedV7({
    ...base,
    nextEntityId: base.nextEntityId + pieces.length,
    activeSeatIndex: base.turnOrder.indexOf(activeId),
    players: base.players.map((candidate) => ({
      ...candidate,
      researchedTechs: TECHNOLOGY_IDS_V7,
      coins: 10_000,
      explored: sortedCoords(
        options.explored?.[candidate.seat] ?? allExcept([], base.board.width),
      ),
    })),
    cities: base.cities.map((city) => ({ ...city, cityActionAvailable: true })),
    units,
    treasureChests: base.treasureChests.filter(
      (chest) => !cleared.some((at) => same(at, chest)),
    ),
    graves: [],
    plagued: (options.plagued ?? [])
      .map((entry) => ({
        unitId: idAt(entry.at),
        sourceUnitId: idAt(entry.source),
        turnsRemaining: entry.turnsRemaining ?? PLAGUE_DURATION_TURNS_V7,
      }))
      .sort((left, right) => left.unitId - right.unitId),
    bitten: (options.bitten ?? [])
      .map((entry) => {
        const biter = required(
          units.find((unit) => same(unit.at, entry.biter)),
        );
        return {
          unitId: idAt(entry.at),
          biterPlayerId: biter.ownerId,
          biterUnitId: biter.id,
        };
      })
      .sort((left, right) => left.unitId - right.unitId),
    board: {
      ...base.board,
      tiles: base.board.tiles.map((tile) =>
        water.some((at) => same(at, tile.at))
          ? {
              ...tile,
              biome: null,
              terrain: "SHALLOW_WATER" as const,
              resource: null,
              improvement: null,
              road: false,
              fieldDefense: false,
              site: null,
            }
          : cleared.some((at) => same(at, tile.at)) && tile.site === null
            ? {
                ...tile,
                biome: tile.biome ?? "PLAINS",
                terrain: "GRASS" as const,
                resource: null,
                improvement: null,
                road: false,
                fieldDefense: false,
              }
            : tile,
      ),
    },
  });
}

/** Ends turns until `playerId`'s turn has started; returns every event. */
function endTurnUntil(
  state: GameStateV7,
  playerId: PlayerId,
): { readonly state: GameStateV7; readonly events: readonly DomainEventV7[] } {
  let current = state;
  const events: DomainEventV7[] = [];
  for (let step = 0; step < state.turnOrder.length; step += 1) {
    const actor = required(current.turnOrder[current.activeSeatIndex]);
    const result = apply(current, actor, { kind: "END_TURN" });
    current = result.state;
    events.push(...result.events);
    if (current.turnOrder[current.activeSeatIndex] === playerId)
      return { state: current, events };
  }
  throw new Error("turn never reached");
}

function apply(
  state: GameStateV7,
  actor: PlayerId,
  command: CommandV7,
): { readonly state: GameStateV7; readonly events: readonly DomainEventV7[] } {
  const result = applyCommandV7(state, actor, command);
  if (!result.accepted)
    throw new Error(`${command.kind} rejected: ${result.error.code}`);
  return result;
}

function attack(
  state: GameStateV7,
  from: CoordV7,
  to: CoordV7,
): { readonly state: GameStateV7; readonly events: readonly DomainEventV7[] } {
  const attacker = unitAt(state, from);
  return apply(state, attacker.ownerId, {
    kind: "ATTACK",
    unitId: attacker.id,
    targetUnitId: unitAt(state, to).id,
  });
}

function combatPreview(events: readonly DomainEventV7[]): CombatPreviewV7 {
  const event = events[0];
  if (event?.kind !== "COMBAT_RESOLVED") throw new Error("no combat");
  return event.preview;
}

function withoutTail(
  events: readonly DomainEventV7[],
): readonly DomainEventV7[] {
  return events.filter((event) => event.kind !== "ACHIEVEMENT_UNLOCKED");
}

function unitAt(state: GameStateV7, at: CoordV7): UnitStateV7 {
  return required(state.units.find((unit) => same(unit.at, at)));
}

function unitById(state: GameStateV7, id: UnitStateV7["id"]): UnitStateV7 {
  return required(state.units.find((unit) => unit.id === id));
}

function seatPlayer(state: GameStateV7, seat: number): PlayerId {
  return required(state.players.find((player) => player.seat === seat)).id;
}

function allExcept(excluded: readonly CoordV7[], size = 11): CoordV7[] {
  const result: CoordV7[] = [];
  for (let y = 0; y < size; y += 1)
    for (let x = 0; x < size; x += 1)
      if (!excluded.some((at) => at.x === x && at.y === y))
        result.push({ x, y });
  return result;
}

function sortedCoords(coords: readonly CoordV7[]): CoordV7[] {
  const unique = new Map(coords.map((at) => [`${at.x},${at.y}`, at]));
  return [...unique.values()].sort(
    (left, right) => left.y - right.y || left.x - right.x,
  );
}

function required<T>(value: T | undefined): T {
  if (value === undefined) throw new Error("fixture value missing");
  return value;
}

const same = (left: CoordV7, right: CoordV7): boolean =>
  left.x === right.x && left.y === right.y;
