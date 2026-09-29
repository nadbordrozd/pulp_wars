import { describe, expect, it } from "vitest";
import {
  DOMAIN_EVENT_KIND_ORDER_V7,
  FACTION_RULES_V7,
  RULESET_7_ID,
  TECHNOLOGY_IDS_V7,
  appendReplayCommandV7,
  applyCommandV7,
  canonicalHash,
  createPlayableGameV7,
  createReplayV7,
  deathCreatesGraveV7,
  effectiveRoleRuleV7,
  factionTreeIdV7,
  gravesEnabledV7,
  parseEventV7,
  parseGameStateV7,
  parsePlayerEventEnvelopeV7,
  parseReplayJsonV7,
  projectEventsV7,
  queryPlayerCommandsV7,
  resolveCityGrowthV7,
  runReplayV7,
  unitId,
  viewForV7,
  withGraveV7,
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
import { createSaveEnvelopeV7, parseSaveV7 } from "../../src/persistence/index";
import { checkedV7 } from "../fixtures/v7-builders";
import { withPortV7 } from "../fixtures/v7-naval-builders";
import { createRevision13MapStateV7 } from "../fixtures/v7-revision13-map";

// Seed-2 DRY_LAND boards (factions never change the board):
// - two seats (11x11): human capital (8, 8) with territory x 7-9, y 7-9;
//   enemy capital (2, 8) with territory x 1-3, y 7-9; villages (5, 5),
//   (8, 5), and (5, 8); rows 0-4 west of x 6 are open neutral land.
// - three seats (14x14): capitals (2, 2), (11, 11), and (11, 2); the human's
//   initial exploration covers only x 0-4, y 0-4.
const HUMAN_CAPITAL = { x: 8, y: 8 } as const;
const ENEMY_CAPITAL = { x: 2, y: 8 } as const;
const VILLAGE = { x: 5, y: 5 } as const;

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

describe("ruleset-7 revision-13 Graves: creation", () => {
  it("leaves a Grave under an advancing melee killer in an Undead match", () => {
    const state = arena(
      ["ORIGINAL", "UNDEAD"],
      [
        { seat: 0, role: "FIGHTER", at: { x: 2, y: 3 } },
        { seat: 1, role: "FIGHTER", at: { x: 3, y: 3 }, hp: 1 },
      ],
    );
    const result = attack(state, { x: 2, y: 3 }, { x: 3, y: 3 });
    const victim = unitAt(state, { x: 3, y: 3 });
    expect(result.events.slice(0, 4)).toEqual([
      expect.objectContaining({ kind: "COMBAT_RESOLVED" }),
      { kind: "UNIT_DIED", unitId: victim.id, cause: "ATTACK" },
      { kind: "GRAVE_CREATED", at: { x: 3, y: 3 } },
      expect.objectContaining({ kind: "UNIT_MOVED", path: [{ x: 3, y: 3 }] }),
    ]);
    expect(result.state.graves).toEqual([{ x: 3, y: 3 }]);
    // The attacker advanced onto its victim's Grave and shares the tile.
    expect(unitAt(result.state, { x: 3, y: 3 }).ownerId).toBe(
      state.humanPlayerId,
    );
    expect(parseGameStateV7(result.state)).toEqual(result.state);
    for (const player of result.state.players)
      expect(viewForV7(result.state, player.id).graves).toEqual([
        { x: 3, y: 3 },
      ]);
  });

  it("leaves a Grave for an attacker killed by retaliation, of either faction", () => {
    for (const factions of [
      ["UNDEAD", "ORIGINAL"],
      ["ORIGINAL", "UNDEAD"],
    ] as const) {
      const state = arena(factions, [
        // A Fighter or Skeleton retaliates; an Undead Guard (Zombie) would
        // infect its land victim instead (ruleset-v7-undead-combat tests).
        { seat: 0, role: "FIGHTER", at: { x: 2, y: 3 }, hp: 1 },
        { seat: 1, role: "FIGHTER", at: { x: 3, y: 3 } },
      ]);
      const attacker = unitAt(state, { x: 2, y: 3 });
      const result = attack(state, { x: 2, y: 3 }, { x: 3, y: 3 });
      expect(result.events.slice(0, 3)).toEqual([
        expect.objectContaining({ kind: "COMBAT_RESOLVED" }),
        { kind: "UNIT_DIED", unitId: attacker.id, cause: "RETALIATION" },
        { kind: "GRAVE_CREATED", at: { x: 2, y: 3 } },
      ]);
      expect(result.state.graves).toEqual([{ x: 2, y: 3 }]);
    }
  });

  it("never creates a Grave in a match without an Undead seat", () => {
    const pieces: readonly Piece[] = [
      { seat: 0, role: "FIGHTER", at: { x: 2, y: 3 } },
      { seat: 1, role: "FIGHTER", at: { x: 3, y: 3 }, hp: 1 },
      // Skeleton has exact Fighter parity, so only the Graves differ.
      { seat: 0, role: "FIGHTER", at: { x: 2, y: 1 }, hp: 1 },
      { seat: 1, role: "FIGHTER", at: { x: 3, y: 1 } },
    ];
    const human = arena(["ORIGINAL", "ORIGINAL"], pieces);
    const mixed = arena(["ORIGINAL", "UNDEAD"], pieces);
    expect(gravesEnabledV7(human.setup)).toBe(false);
    expect(gravesEnabledV7(mixed.setup)).toBe(true);
    let humanState = human;
    let mixedState = mixed;
    for (const [from, to] of [
      [
        { x: 2, y: 3 },
        { x: 3, y: 3 },
      ],
      [
        { x: 2, y: 1 },
        { x: 3, y: 1 },
      ],
    ] as const) {
      const humanResult = attack(humanState, from, to);
      const mixedResult = attack(mixedState, from, to);
      expect(humanResult.events.map((event) => event.kind)).not.toContain(
        "GRAVE_CREATED",
      );
      // Apart from the Graves, the all-Human exchange is identical.
      expect(humanResult.events).toEqual(
        mixedResult.events.filter((event) => event.kind !== "GRAVE_CREATED"),
      );
      humanState = humanResult.state;
      mixedState = mixedResult.state;
    }
    expect(humanState.graves).toEqual([]);
    expect(viewForV7(humanState, humanState.humanPlayerId).graves).toEqual([]);
    expect(mixedState.graves).toEqual([
      { x: 2, y: 1 },
      { x: 3, y: 3 },
    ]);
  });

  it("leaves Graves for qualifying splash deaths, including hidden ones, but not afloat", () => {
    const hiddenVictimAt = { x: 3, y: 3 };
    const state = arena(
      ["ORIGINAL", "UNDEAD"],
      [
        { seat: 0, role: "BATTLESHIP", at: { x: 0, y: 2 }, form: "NAVAL" },
        { seat: 1, role: "FIGHTER", at: { x: 2, y: 2 } },
        {
          seat: 1,
          role: "PATROL_BOAT",
          at: { x: 1, y: 1 },
          form: "NAVAL",
          hp: 1,
        },
        { seat: 1, role: "FIGHTER", at: { x: 3, y: 1 } },
        {
          seat: 1,
          role: "FIGHTER",
          at: { x: 1, y: 3 },
          form: "EMBARKED",
          hp: 1,
        },
        { seat: 1, role: "FIGHTER", at: hiddenVictimAt, hp: 1 },
      ],
      {
        water: [
          { x: 0, y: 2 },
          { x: 1, y: 1 },
          { x: 1, y: 3 },
        ],
        explored: { 0: allExceptTiles([hiddenVictimAt]) },
      },
    );
    const boat = unitAt(state, { x: 1, y: 1 });
    const embarked = unitAt(state, { x: 1, y: 3 });
    const target = unitAt(state, { x: 2, y: 2 });
    const hidden = unitAt(state, hiddenVictimAt);
    const result = attack(state, { x: 0, y: 2 }, { x: 2, y: 2 });
    expect(result.events.slice(0, 7)).toEqual([
      expect.objectContaining({ kind: "COMBAT_RESOLVED" }),
      { kind: "UNIT_DIED", unitId: target.id, cause: "ATTACK" },
      { kind: "GRAVE_CREATED", at: { x: 2, y: 2 } },
      { kind: "UNIT_DIED", unitId: boat.id, cause: "SPLASH" },
      { kind: "UNIT_DIED", unitId: embarked.id, cause: "SPLASH" },
      { kind: "UNIT_DIED", unitId: hidden.id, cause: "SPLASH" },
      { kind: "GRAVE_CREATED", at: hiddenVictimAt },
    ]);
    expect(result.state.graves).toEqual([{ x: 2, y: 2 }, hiddenVictimAt]);
    expect(unitAt(result.state, { x: 3, y: 1 }).hp).toBe(5);

    // The attacker never explored the hidden victim's tile: it sees neither
    // that death nor its Grave; the victim's owner sees both Graves.
    const human = state.humanPlayerId;
    const enemy = otherPlayer(state, human);
    const humanEvents = projectEventsV7(
      state,
      result.state,
      human,
      result.events,
    ).events;
    expect(
      humanEvents.filter((event) => event.kind === "GRAVE_CREATED"),
    ).toEqual([{ kind: "GRAVE_CREATED", at: { x: 2, y: 2 } }]);
    expect(humanEvents).not.toContainEqual(
      expect.objectContaining({ kind: "UNIT_DIED", unitId: hidden.id }),
    );
    expect(viewForV7(result.state, human).graves).toEqual([{ x: 2, y: 2 }]);
    expect(
      projectEventsV7(state, result.state, enemy, result.events).events.filter(
        (event) => event.kind === "GRAVE_CREATED",
      ),
    ).toEqual([
      { kind: "GRAVE_CREATED", at: { x: 2, y: 2 } },
      { kind: "GRAVE_CREATED", at: hiddenVictimAt },
    ]);
    expect(viewForV7(result.state, enemy).graves).toEqual(result.state.graves);
  });

  it("leaves a Grave for each Overrun kill that the Knight then occupies", () => {
    const state = arena(
      ["ORIGINAL", "UNDEAD"],
      [
        { seat: 0, role: "KNIGHT", at: { x: 1, y: 3 } },
        { seat: 1, role: "FIGHTER", at: { x: 2, y: 3 }, hp: 1 },
        { seat: 1, role: "FIGHTER", at: { x: 3, y: 3 }, hp: 1 },
      ],
    );
    const first = attack(state, { x: 1, y: 3 }, { x: 2, y: 3 });
    expect(first.state.graves).toEqual([{ x: 2, y: 3 }]);
    const second = attack(first.state, { x: 2, y: 3 }, { x: 3, y: 3 });
    expect(second.events).toContainEqual({
      kind: "GRAVE_CREATED",
      at: { x: 3, y: 3 },
    });
    expect(second.state.graves).toEqual([
      { x: 2, y: 3 },
      { x: 3, y: 3 },
    ]);
    expect(unitAt(second.state, { x: 3, y: 3 }).role).toBe("KNIGHT");
  });

  it("creates nothing and emits no event for a death on an existing Grave", () => {
    // A seeded Grave under a victim.
    const seeded = arena(
      ["ORIGINAL", "UNDEAD"],
      [
        { seat: 0, role: "FIGHTER", at: { x: 2, y: 3 } },
        { seat: 1, role: "FIGHTER", at: { x: 3, y: 3 }, hp: 1 },
      ],
      { graves: [{ x: 3, y: 3 }] },
    );
    const killed = attack(seeded, { x: 2, y: 3 }, { x: 3, y: 3 });
    expect(killed.events.map((event) => event.kind)).toContain("UNIT_DIED");
    expect(killed.events.map((event) => event.kind)).not.toContain(
      "GRAVE_CREATED",
    );
    expect(killed.state.graves).toEqual([{ x: 3, y: 3 }]);

    // An Overrun that ends in the Knight's death on its first victim's Grave.
    const state = arena(
      ["ORIGINAL", "UNDEAD"],
      [
        { seat: 0, role: "KNIGHT", at: { x: 1, y: 3 }, hp: 2 },
        { seat: 1, role: "FIGHTER", at: { x: 2, y: 3 }, hp: 1 },
        // A Skeleton, not a Zombie, so the Knight's death is not infected.
        { seat: 1, role: "FIGHTER", at: { x: 3, y: 3 } },
      ],
    );
    const knight = unitAt(state, { x: 1, y: 3 });
    const first = attack(state, { x: 1, y: 3 }, { x: 2, y: 3 });
    expect(first.state.graves).toEqual([{ x: 2, y: 3 }]);
    const second = attack(first.state, { x: 2, y: 3 }, { x: 3, y: 3 });
    expect(second.events).toContainEqual({
      kind: "UNIT_DIED",
      unitId: knight.id,
      cause: "RETALIATION",
    });
    expect(second.events.map((event) => event.kind)).not.toContain(
      "GRAVE_CREATED",
    );
    expect(second.state.graves).toEqual([{ x: 2, y: 3 }]);
  });

  it("pushes a unit onto a Grave without changing the Grave", () => {
    const state = arena(
      ["ORIGINAL", "UNDEAD"],
      [
        { seat: 0, role: "JUGGERNAUT", at: { x: 1, y: 3 } },
        { seat: 1, role: "GUARD", at: { x: 2, y: 3 } },
      ],
      { graves: [{ x: 3, y: 3 }] },
    );
    const defender = unitAt(state, { x: 2, y: 3 });
    const result = attack(state, { x: 1, y: 3 }, { x: 2, y: 3 });
    expect(result.events).toContainEqual(
      expect.objectContaining({
        kind: "UNIT_PUSHED",
        targetUnitId: defender.id,
        to: { x: 3, y: 3 },
      }),
    );
    expect(result.events.map((event) => event.kind)).not.toContain(
      "GRAVE_CREATED",
    );
    expect(result.state.graves).toEqual([{ x: 3, y: 3 }]);
    expect(unitAt(result.state, { x: 3, y: 3 }).id).toBe(defender.id);
  });

  it("keeps Grave creation after the Undead seat is eliminated", () => {
    const state = arena(
      ["ORIGINAL", "UNDEAD", "ORIGINAL"],
      [
        {
          seat: 0,
          role: "FIGHTER",
          at: { x: 11, y: 11 },
          captureEligible: true,
        },
        { seat: 0, role: "FIGHTER", at: { x: 5, y: 5 } },
        { seat: 2, role: "FIGHTER", at: { x: 6, y: 5 }, hp: 1 },
      ],
    );
    const undead = seatPlayer(state, 1);
    const captured = apply(state, state.humanPlayerId, {
      kind: "CAPTURE",
      unitId: unitAt(state, { x: 11, y: 11 }).id,
    });
    expect(
      captured.state.players.find((player) => player.id === undead)?.status,
    ).toBe("ELIMINATED");
    expect(captured.state.outcome).toBeNull();
    const killed = attack(captured.state, { x: 5, y: 5 }, { x: 6, y: 5 });
    expect(killed.events).toContainEqual({
      kind: "GRAVE_CREATED",
      at: { x: 6, y: 5 },
    });
    expect(killed.state.graves).toEqual([{ x: 6, y: 5 }]);
  });
});

describe("ruleset-7 revision-13 Graves: exclusions", () => {
  it("never leaves a Grave on a village or city center", () => {
    const state = arena(
      ["ORIGINAL", "UNDEAD"],
      [
        { seat: 0, role: "FIGHTER", at: { x: 5, y: 4 } },
        { seat: 1, role: "FIGHTER", at: VILLAGE, hp: 1 },
        { seat: 0, role: "FIGHTER", at: { x: 3, y: 7 } },
        { seat: 1, role: "FIGHTER", at: ENEMY_CAPITAL, hp: 1 },
      ],
    );
    expect(tileOf(state, VILLAGE).site).toBe("VILLAGE");
    expect(tileOf(state, ENEMY_CAPITAL).site).toBe("CAPITAL");
    const village = attack(state, { x: 5, y: 4 }, VILLAGE);
    expect(village.events).toContainEqual(
      expect.objectContaining({ kind: "UNIT_DIED", cause: "ATTACK" }),
    );
    const capital = attack(village.state, { x: 3, y: 7 }, ENEMY_CAPITAL);
    expect(capital.events).toContainEqual(
      expect.objectContaining({ kind: "UNIT_DIED", cause: "ATTACK" }),
    );
    for (const result of [village, capital])
      expect(result.events.map((event) => event.kind)).not.toContain(
        "GRAVE_CREATED",
      );
    expect(capital.state.graves).toEqual([]);
    expect(unitAt(capital.state, ENEMY_CAPITAL).ownerId).toBe(
      state.humanPlayerId,
    );
  });

  it("never leaves a Grave for water, naval, or embarked deaths", () => {
    const state = arena(
      ["ORIGINAL", "UNDEAD"],
      [
        { seat: 0, role: "FIGHTER", at: { x: 2, y: 3 } },
        {
          seat: 1,
          role: "FIGHTER",
          at: { x: 3, y: 3 },
          form: "EMBARKED",
          hp: 1,
        },
        { seat: 0, role: "FIGHTER", at: { x: 2, y: 1 } },
        {
          seat: 1,
          role: "PATROL_BOAT",
          at: { x: 3, y: 1 },
          form: "NAVAL",
          hp: 1,
        },
        { seat: 0, role: "PATROL_BOAT", at: { x: 1, y: 5 }, form: "NAVAL" },
        { seat: 1, role: "GUARD", at: { x: 1, y: 4 } },
      ],
      {
        water: [
          { x: 3, y: 3 },
          { x: 3, y: 1 },
          { x: 1, y: 5 },
        ],
      },
    );
    const embarked = attack(state, { x: 2, y: 3 }, { x: 3, y: 3 });
    const naval = attack(embarked.state, { x: 2, y: 1 }, { x: 3, y: 1 });
    const ownBoat = unitAt(state, { x: 1, y: 5 });
    const boatDies = attack(
      withUnit(naval.state, ownBoat.id, { hp: 1 }),
      { x: 1, y: 5 },
      { x: 1, y: 4 },
    );
    expect(boatDies.events).toContainEqual({
      kind: "UNIT_DIED",
      unitId: ownBoat.id,
      cause: "RETALIATION",
    });
    for (const result of [embarked, naval])
      expect(result.events).toContainEqual(
        expect.objectContaining({ kind: "UNIT_DIED", cause: "ATTACK" }),
      );
    for (const result of [embarked, naval, boatDies])
      expect(result.events.map((event) => event.kind)).not.toContain(
        "GRAVE_CREATED",
      );
    expect(boatDies.state.graves).toEqual([]);
  });

  it("never leaves a Grave for Disband", () => {
    const state = arena(
      ["UNDEAD", "ORIGINAL"],
      [{ seat: 0, role: "FIGHTER", at: { x: 4, y: 3 } }],
    );
    const result = apply(state, state.humanPlayerId, {
      kind: "DISBAND",
      unitId: unitAt(state, { x: 4, y: 3 }).id,
    });
    expect(result.events.map((event) => event.kind)).toEqual([
      "UNIT_DISBANDED",
    ]);
    expect(result.state.graves).toEqual([]);
  });

  it("never leaves a Grave for reward displacement removal", () => {
    const neighbors = neighborsOf(HUMAN_CAPITAL);
    const state = arena(
      ["UNDEAD", "ORIGINAL"],
      [
        { seat: 0, role: "FIGHTER", at: HUMAN_CAPITAL, homeless: true },
        ...neighbors.map((at): Piece => ({
          seat: 0,
          role: "FIGHTER",
          at,
          homeless: true,
        })),
      ],
    );
    const occupant = unitAt(state, HUMAN_CAPITAL);
    const reward = militiaRewardState(state, neighbors.slice(0, 3));
    const result = apply(reward, state.humanPlayerId, {
      kind: "CHOOSE_CITY_REWARD",
      cityId: cityAt(state, HUMAN_CAPITAL).id,
      reachedLevel: 3,
      reward: "MILITIA",
    });
    expect(result.events).toContainEqual(
      expect.objectContaining({
        kind: "UNIT_SPAWN_DISPLACED",
        displacedUnitId: occupant.id,
        to: null,
      }),
    );
    expect(result.state.units.some((unit) => unit.id === occupant.id)).toBe(
      false,
    );
    expect(result.events.map((event) => event.kind)).not.toContain("UNIT_DIED");
    expect(result.events.map((event) => event.kind)).not.toContain(
      "GRAVE_CREATED",
    );
    expect(result.state.graves).toEqual([]);
  });

  it("never leaves a Grave for elimination removal", () => {
    const state = arena(
      ["ORIGINAL", "UNDEAD"],
      [
        {
          seat: 0,
          role: "FIGHTER",
          at: ENEMY_CAPITAL,
          captureEligible: true,
        },
        { seat: 1, role: "FIGHTER", at: { x: 4, y: 3 } },
      ],
      { graves: [{ x: 5, y: 3 }] },
    );
    const eliminated = unitAt(state, { x: 4, y: 3 });
    const result = apply(state, state.humanPlayerId, {
      kind: "CAPTURE",
      unitId: unitAt(state, ENEMY_CAPITAL).id,
    });
    expect(result.events).toContainEqual({
      kind: "UNIT_DIED",
      unitId: eliminated.id,
      cause: "ELIMINATION",
    });
    expect(result.events.map((event) => event.kind)).not.toContain(
      "GRAVE_CREATED",
    );
    expect(result.state.graves).toEqual([{ x: 5, y: 3 }]);
  });

  it("decides Grave eligibility from form, tile, and existing Graves only", () => {
    const state = arena(
      ["ORIGINAL", "UNDEAD"],
      [{ seat: 0, role: "FIGHTER", at: { x: 2, y: 3 } }],
      { water: [{ x: 4, y: 3 }] },
    );
    const land = { form: "LAND", at: { x: 2, y: 3 } } as const;
    expect(deathCreatesGraveV7(state, [], land)).toBe(true);
    expect(deathCreatesGraveV7(state, [{ x: 2, y: 3 }], land)).toBe(false);
    expect(deathCreatesGraveV7(state, [], { ...land, form: "EMBARKED" })).toBe(
      false,
    );
    expect(
      deathCreatesGraveV7(state, [], { form: "NAVAL", at: { x: 4, y: 3 } }),
    ).toBe(false);
    expect(deathCreatesGraveV7(state, [], { ...land, at: VILLAGE })).toBe(
      false,
    );
    const chest = state.treasureChests[0];
    if (chest === undefined) throw new Error("chest missing");
    expect(deathCreatesGraveV7(state, [], { ...land, at: chest })).toBe(false);
    const human = arena(["ORIGINAL", "ORIGINAL"], []);
    expect(deathCreatesGraveV7(human, [], land)).toBe(false);
    expect(withGraveV7([{ x: 5, y: 1 }], { x: 1, y: 2 })).toEqual([
      { x: 5, y: 1 },
      { x: 1, y: 2 },
    ]);
    expect(withGraveV7([{ x: 1, y: 2 }], { x: 1, y: 2 })).toEqual([
      { x: 1, y: 2 },
    ]);
  });
});

describe("ruleset-7 revision-13 Graves: state, events, and persistence", () => {
  it("validates Grave coordinates and requires an Undead seat", () => {
    const state = arena(
      ["ORIGINAL", "UNDEAD"],
      [{ seat: 0, role: "FIGHTER", at: { x: 3, y: 3 } }],
      { water: [{ x: 4, y: 3 }] },
    );
    const chest = state.treasureChests[0];
    if (chest === undefined) throw new Error("chest missing");
    const withGraves = (graves: unknown): unknown => ({ ...state, graves });
    // A Grave may share its tile with a unit.
    const valid = withGraves([
      { x: 5, y: 1 },
      { x: 3, y: 3 },
    ]);
    expect(parseGameStateV7(valid)).toEqual(valid);
    for (const invalid of [
      [
        { x: 3, y: 3 },
        { x: 5, y: 1 },
      ],
      [
        { x: 3, y: 3 },
        { x: 3, y: 3 },
      ],
      [{ x: -1, y: 0 }],
      [{ x: 11, y: 0 }],
      [{ x: 4, y: 3 }],
      [VILLAGE],
      [HUMAN_CAPITAL],
      [chest],
      [{ x: 1 }],
      [{ x: 1, y: 2, z: 0 }],
      {},
      null,
    ])
      expect(parseGameStateV7(withGraves(invalid))).toBeNull();
    const { graves: _graves, ...missing } = state;
    void _graves;
    expect(parseGameStateV7(missing)).toBeNull();

    const human = arena(["ORIGINAL", "ORIGINAL"], []);
    expect(parseGameStateV7(human)).toEqual(human);
    expect(parseGameStateV7({ ...human, graves: [{ x: 5, y: 1 }] })).toBeNull();
  });

  it("orders GRAVE_CREATED right after UNIT_DIED and parses it strictly", () => {
    // Section 8: UNIT_INFECTED and then GRAVE_CREATED follow UNIT_DIED.
    expect(DOMAIN_EVENT_KIND_ORDER_V7.indexOf("GRAVE_CREATED")).toBe(
      DOMAIN_EVENT_KIND_ORDER_V7.indexOf("UNIT_DIED") + 2,
    );
    expect(parseEventV7({ kind: "GRAVE_CREATED", at: { x: 1, y: 2 } })).toEqual(
      { ok: true, value: { kind: "GRAVE_CREATED", at: { x: 1, y: 2 } } },
    );
    for (const invalid of [
      { kind: "GRAVE_CREATED" },
      { kind: "GRAVE_CREATED", at: { x: 1 } },
      { kind: "GRAVE_CREATED", at: { x: 1, y: 2 }, unitId: 1 },
    ])
      expect(parseEventV7(invalid).ok).toBe(false);
  });

  it("round-trips Graves through replay, checkpoints, save, and state hashes", () => {
    // Seed 4: thirty rounds on its revision-14 map include a Raise Dead or
    // Devour (pulp_wars-vkq.9); seed 2 did on its revision-13 map.
    const setup = setupWith(["UNDEAD", "UNDEAD"], 4);
    const match = runAiMatchV7(setup, { maxRounds: 30 });
    expect(match.errors).toEqual([]);
    expect(match.state.graves.length).toBeGreaterThan(0);
    // Normal AI raises and devours Graves (pulp_wars-vkq.9): every created
    // Grave is still on the board unless a Raise Dead or Devour removed it.
    const removed = match.events.reduce(
      (total, event) =>
        total +
        (event.kind === "DEAD_RAISED"
          ? event.results.length
          : event.kind === "GRAVE_DEVOURED"
            ? 1
            : 0),
      0,
    );
    expect(removed).toBeGreaterThan(0);
    expect(match.metrics.eventsByKind.GRAVE_CREATED).toBe(
      match.state.graves.length + removed,
    );
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
    expect(state.graves).toEqual(match.state.graves);
    expect(canonicalHash(state)).toBe(match.stateHash);
    expect(replay.checkpoints.at(-1)?.stateHash).toBe(match.stateHash);
    const parsedReplay = parseReplayJsonV7(JSON.stringify(replay));
    if (parsedReplay.kind !== "VALID") throw new Error(parsedReplay.kind);
    const replayed = runReplayV7(parsedReplay.replay);
    expect(replayed.stateHash).toBe(match.stateHash);
    expect(replayed.state.graves).toEqual(match.state.graves);

    const withoutGrave = { ...state, graves: state.graves.slice(1) };
    expect(parseGameStateV7(withoutGrave)).not.toBeNull();
    expect(canonicalHash(withoutGrave)).not.toBe(canonicalHash(state));

    const save = createSaveEnvelopeV7(
      { state, replay },
      "2026-09-29T12:00:00.000Z",
    );
    const loaded = parseSaveV7(JSON.stringify(save));
    expect(loaded).toEqual({ kind: "VALID", save });
    if (loaded.kind !== "VALID") return;
    expect(loaded.save.state.graves).toEqual(state.graves);
    const tampered = JSON.parse(JSON.stringify(save)) as {
      state: { graves: unknown[] };
    };
    tampered.state.graves = tampered.state.graves.slice(1);
    expect(parseSaveV7(JSON.stringify(tampered)).kind).not.toBe("VALID");
  }, 60_000);
});

describe("ruleset-7 revision-13 Graves: public view and projection", () => {
  const killAt = { x: 7, y: 6 };
  function thirdPartyKill(humanExplored: readonly CoordV7[]) {
    const state = arena(
      ["ORIGINAL", "UNDEAD", "ORIGINAL"],
      [
        { seat: 1, role: "CATAPULT", at: { x: 5, y: 6 } },
        { seat: 2, role: "FIGHTER", at: killAt, hp: 1 },
      ],
      {
        activeSeat: 1,
        explored: {
          0: [
            ...initialExplored(["ORIGINAL", "UNDEAD", "ORIGINAL"]),
            ...humanExplored,
          ],
        },
      },
    );
    const lich = unitAt(state, { x: 5, y: 6 });
    const victim = unitAt(state, killAt);
    const result = apply(state, lich.ownerId, {
      kind: "ATTACK",
      unitId: lich.id,
      targetUnitId: victim.id,
    });
    return { state, result, victim };
  }

  it("hides a Grave created on a tile the viewer never explored", () => {
    const { state, result } = thirdPartyKill([]);
    expect(result.state.graves).toEqual([killAt]);
    const projected = projectEventsV7(
      state,
      result.state,
      state.humanPlayerId,
      result.events,
    );
    expect(projected.events).toEqual([]);
    expect(viewForV7(result.state, state.humanPlayerId).graves).toEqual([]);
  });

  it("projects the Grave to a viewer who explored its tile, even with the killer hidden", () => {
    const { state, result, victim } = thirdPartyKill([killAt]);
    const projected = projectEventsV7(
      state,
      result.state,
      state.humanPlayerId,
      result.events,
    );
    expect(projected.events).toEqual([
      { kind: "UNIT_DIED", unitId: victim.id, cause: "ATTACK" },
      { kind: "GRAVE_CREATED", at: killAt },
    ]);
    expect(parsePlayerEventEnvelopeV7(projected)).toEqual({
      ok: true,
      value: projected,
    });
    expect(viewForV7(result.state, state.humanPlayerId).graves).toEqual([
      killAt,
    ]);
    // Exploring the tile later shows the current Grave.
    const later = checkedV7({
      ...result.state,
      players: result.state.players.map((player) =>
        player.id === state.humanPlayerId
          ? { ...player, explored: allExceptTiles([], 14) }
          : player,
      ),
    });
    expect(viewForV7(later, state.humanPlayerId).graves).toEqual([killAt]);
  });
});

describe("ruleset-7 revision-13 Restless recovery", () => {
  const OWN = { x: 8, y: 7 };
  const NEUTRAL = { x: 4, y: 3 };
  const HOSTILE = { x: 3, y: 7 };

  function wounded(factions: readonly FactionIdV7[]): GameStateV7 {
    return arena(factions, [
      { seat: 0, role: "FIGHTER", at: OWN, hp: 3 },
      { seat: 0, role: "FIGHTER", at: NEUTRAL, hp: 3 },
      { seat: 0, role: "FIGHTER", at: HOSTILE, hp: 3 },
    ]);
  }

  it("registers Restless for the Undead faction only", () => {
    expect(FACTION_RULES_V7).toEqual({
      ORIGINAL: { restless: false },
      UNDEAD: { restless: true },
    });
  });

  it("allows explicit Recover only in own territory and offers nothing elsewhere", () => {
    const state = wounded(["UNDEAD", "ORIGINAL"]);
    const own = unitAt(state, OWN);
    const recovered = apply(state, state.humanPlayerId, {
      kind: "RECOVER",
      unitId: own.id,
    });
    expect(recovered.events).toEqual([
      { kind: "UNIT_RECOVERED", unitId: own.id, amount: 4, automatic: false },
    ]);
    for (const at of [NEUTRAL, HOSTILE]) {
      const unit = unitAt(state, at);
      const rejected = applyCommandV7(state, state.humanPlayerId, {
        kind: "RECOVER",
        unitId: unit.id,
      });
      expect(rejected).toMatchObject({
        accepted: false,
        state,
        events: [],
        error: { code: "RECOVER_NOT_LEGAL", params: { reason: "RESTLESS" } },
      });
    }
    expect(recoverOffers(state)).toEqual([own.id]);
  });

  it("skips idle recovery outside own territory with no event", () => {
    const state = wounded(["UNDEAD", "ORIGINAL"]);
    const own = unitAt(state, OWN);
    const ended = apply(state, state.humanPlayerId, { kind: "END_TURN" });
    expect(
      ended.events.filter((event) => event.kind === "UNIT_RECOVERED"),
    ).toEqual([
      { kind: "UNIT_RECOVERED", unitId: own.id, amount: 4, automatic: true },
    ]);
    expect(unitAt(ended.state, OWN).hp).toBe(7);
    expect(unitAt(ended.state, NEUTRAL).hp).toBe(3);
    expect(unitAt(ended.state, HOSTILE).hp).toBe(3);
  });

  it("keeps Human recovery at 4 in own territory and 2 elsewhere", () => {
    const state = wounded(["ORIGINAL", "UNDEAD"]);
    const ids = [OWN, NEUTRAL, HOSTILE].map((at) => unitAt(state, at).id);
    expect(recoverOffers(state)).toEqual(ids);
    expect(
      ids.map(
        (id) =>
          apply(state, state.humanPlayerId, { kind: "RECOVER", unitId: id })
            .events,
      ),
    ).toEqual(
      ids.map((id, index) => [
        {
          kind: "UNIT_RECOVERED",
          unitId: id,
          amount: index === 0 ? 4 : 2,
          automatic: false,
        },
      ]),
    );
    const ended = apply(state, state.humanPlayerId, { kind: "END_TURN" });
    expect(
      ended.events.filter((event) => event.kind === "UNIT_RECOVERED"),
    ).toEqual(
      ids.map((id, index) => ({
        kind: "UNIT_RECOVERED",
        unitId: id,
        amount: index === 0 ? 4 : 2,
        automatic: true,
      })),
    );
  });

  it("keeps Windmill Start Turn healing outside own territory", () => {
    const windmillAt = { x: 9, y: 7 };
    const outsideAt = { x: 10, y: 6 };
    for (const factions of [
      ["UNDEAD", "ORIGINAL"],
      ["ORIGINAL", "UNDEAD"],
    ] as const) {
      const base = arena(factions, [
        { seat: 0, role: "FIGHTER", at: outsideAt, hp: 2 },
      ]);
      const city = cityAt(base, HUMAN_CAPITAL);
      expect(tileOf(base, windmillAt).territoryCityId).toBe(city.id);
      expect(tileOf(base, outsideAt).territoryCityId).toBeNull();
      const state = checkedV7({
        ...base,
        nextEntityId: base.nextEntityId + 1,
        board: {
          ...base.board,
          tiles: base.board.tiles.map((tile) =>
            same(tile.at, windmillAt)
              ? {
                  ...tile,
                  biome: "PLAINS" as const,
                  terrain: "GRASS" as const,
                  resource: null,
                  improvement: "WINDMILL" as const,
                }
              : tile,
          ),
        },
        populationContributions: [
          ...base.populationContributions,
          {
            id: base.nextEntityId,
            cityId: city.id,
            category: "LIVE" as const,
            amount: 0,
            source: {
              kind: "IMPROVEMENT" as const,
              improvement: "WINDMILL" as const,
              at: windmillAt,
            },
          },
        ],
      });
      const unit = unitAt(state, outsideAt);
      const ended = apply(state, state.humanPlayerId, { kind: "END_TURN" });
      const idle = factions[0] === "UNDEAD" ? 0 : 2;
      expect(
        ended.events.filter((event) => event.kind === "UNIT_RECOVERED"),
      ).toEqual(
        idle === 0
          ? []
          : [
              {
                kind: "UNIT_RECOVERED",
                unitId: unit.id,
                amount: idle,
                automatic: true,
              },
            ],
      );
      const enemy = otherPlayer(state, state.humanPlayerId);
      const started = apply(ended.state, enemy, { kind: "END_TURN" });
      expect(started.events).toContainEqual(
        expect.objectContaining({
          kind: "WINDMILL_HEALING_RESOLVED",
          at: windmillAt,
          results: [{ unitId: unit.id, amount: 6, hpAfter: 2 + idle + 6 }],
        }),
      );
    }
  });

  it("keeps the naval dock rule and the embarked rule for Undead seats", () => {
    const fixture = withPortV7();
    const base = withFactions(fixture.state, ["UNDEAD", "ORIGINAL"]);
    const human = base.humanPlayerId;
    const city = required(
      base.cities.find((candidate) => candidate.ownerId === human),
    );
    const outsideAt = required(
      base.board.tiles.find(
        (tile) =>
          chebyshev(tile.at, fixture.portAt) === 1 &&
          chebyshev(tile.at, city.at) === 2 &&
          tile.territoryCityId !== city.id &&
          tile.site === null &&
          tile.improvement === null &&
          !base.units.some((unit) => same(unit.at, tile.at)),
      ),
    ).at;
    const own = required(base.units.find((unit) => unit.ownerId === human));
    const boatId = unitId(base.nextEntityId);
    const state = checkedV7({
      ...base,
      nextEntityId: base.nextEntityId + 1,
      treasureChests: base.treasureChests.filter(
        (chest) => !same(chest, outsideAt),
      ),
      board: {
        ...base.board,
        tiles: base.board.tiles.map((tile) =>
          same(tile.at, outsideAt)
            ? {
                ...tile,
                biome: null,
                terrain: "SHALLOW_WATER" as const,
                resource: null,
                improvement: null,
                road: false,
                fieldDefense: false,
              }
            : tile,
        ),
      },
      units: [
        ...base.units.map((unit) =>
          unit.id === own.id
            ? {
                ...unit,
                at: fixture.portAt,
                role: "PATROL_BOAT" as const,
                form: "NAVAL" as const,
                hp: 6,
              }
            : unit,
        ),
        {
          ...own,
          id: boatId,
          homeCityId: null,
          at: outsideAt,
          role: "PATROL_BOAT" as const,
          form: "NAVAL" as const,
          hp: 6,
          activation: READY,
        },
      ],
    });
    expect(recoverOffers(state)).toEqual([own.id, boatId]);
    for (const id of [own.id, boatId])
      expect(
        apply(state, human, { kind: "RECOVER", unitId: id }).events,
      ).toEqual([
        { kind: "UNIT_RECOVERED", unitId: id, amount: 4, automatic: false },
      ]);

    const embarked = withUnit(state, boatId, {
      role: "FIGHTER",
      form: "EMBARKED",
      hp: 5,
    });
    expect(recoverOffers(embarked)).toEqual([own.id]);
    expect(
      applyCommandV7(embarked, human, { kind: "RECOVER", unitId: boatId }),
    ).toMatchObject({
      accepted: false,
      error: { code: "RECOVER_NOT_LEGAL", params: { reason: "EMBARKED" } },
    });
    const ended = apply(embarked, human, { kind: "END_TURN" });
    expect(
      ended.events.filter((event) => event.kind === "UNIT_RECOVERED"),
    ).toEqual([
      { kind: "UNIT_RECOVERED", unitId: own.id, amount: 4, automatic: true },
    ]);
  });
});

interface Piece {
  readonly seat: number;
  readonly role: UnitRoleIdV7;
  readonly at: CoordV7;
  readonly hp?: number;
  readonly form?: UnitStateV7["form"];
  readonly captureEligible?: boolean;
  readonly homeless?: boolean;
}

interface ArenaOptions {
  readonly water?: readonly CoordV7[];
  readonly graves?: readonly CoordV7[];
  /** Explored tiles per seat; every tile when omitted. */
  readonly explored?: Readonly<Record<number, readonly CoordV7[]>>;
  readonly activeSeat?: number;
}

function setupWith(factions: readonly FactionIdV7[], seed = 2): MatchSetupV7 {
  const aiCount = (factions.length - 1) as 1 | 2 | 3;
  const size = aiCount === 1 ? 11 : aiCount === 2 ? 14 : 16;
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
    mapType: "DRY_LAND",
    mapGenerationRevision: "REGIONAL_BIOMES_NAVAL_V2",
  };
}

function initialExplored(factions: readonly FactionIdV7[]): CoordV7[] {
  const created = createRevision13MapStateV7(setupWith(factions));
  if (!created.ok) throw new Error(created.error.code);
  return [
    ...required(
      created.state.players.find(
        (player) => player.id === created.state.humanPlayerId,
      ),
    ).explored,
  ];
}

/**
 * A seed-2 board with every technology, the given pieces as the only units,
 * and every non-settlement piece tile cleared to Grass (or Shallow Water).
 */
function arena(
  factions: readonly FactionIdV7[],
  pieces: readonly Piece[],
  options: ArenaOptions = {},
): GameStateV7 {
  const created = createRevision13MapStateV7(setupWith(factions));
  if (!created.ok) throw new Error(created.error.code);
  const base = created.state;
  const size = base.board.width;
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
      captureEligible: piece.captureEligible ?? false,
      activation: READY,
    };
  });
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
        options.explored?.[candidate.seat] ?? allExceptTiles([], size),
      ),
    })),
    cities: base.cities.map((city) => ({ ...city, cityActionAvailable: true })),
    units,
    treasureChests: base.treasureChests.filter(
      (chest) => !cleared.some((at) => same(at, chest)),
    ),
    graves: options.graves ?? [],
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

/** Rebinds a fixture's seats to other factions (the board is unaffected). */
function withFactions(
  state: GameStateV7,
  factions: readonly FactionIdV7[],
): GameStateV7 {
  return checkedV7({
    ...state,
    setup: { ...state.setup, factions: [...factions] },
    players: state.players.map((player) => {
      const faction = required(factions[player.seat]);
      return { ...player, faction, factionTreeId: factionTreeIdV7(faction) };
    }),
  });
}

/** Grows the human capital to level 3 with a pending Militia choice. */
function militiaRewardState(
  state: GameStateV7,
  farms: readonly CoordV7[],
): GameStateV7 {
  const city = cityAt(state, HUMAN_CAPITAL);
  const economicPopulation = city.economicPopulation + farms.length * 2;
  const grown = resolveCityGrowthV7(
    city,
    city.permanentPopulation,
    economicPopulation,
  ).city;
  return checkedV7({
    ...state,
    nextEntityId: state.nextEntityId + farms.length,
    cities: state.cities.map((candidate) =>
      candidate.id === city.id
        ? {
            ...grown,
            economicPopulation,
            rewards: [{ reachedLevel: 2, reward: "SURVEY" as const }],
          }
        : candidate,
    ),
    board: {
      ...state.board,
      tiles: state.board.tiles.map((tile) =>
        farms.some((at) => same(at, tile.at))
          ? {
              ...tile,
              biome: "PLAINS" as const,
              terrain: "GRASS" as const,
              resource: "FERTILE_GROUND" as const,
              improvement: "FARM" as const,
            }
          : tile,
      ),
    },
    populationContributions: [
      ...state.populationContributions,
      ...farms.map((at, index) => ({
        id: state.nextEntityId + index,
        cityId: city.id,
        category: "LIVE" as const,
        amount: 2,
        source: {
          kind: "IMPROVEMENT" as const,
          improvement: "FARM" as const,
          at,
        },
      })),
    ],
    pendingChoices: [
      {
        kind: "CITY_REWARD" as const,
        cityId: city.id,
        reachedLevel: 3,
        candidates: ["WALLS", "MILITIA"] as const,
      },
    ],
  });
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

function recoverOffers(state: GameStateV7): UnitStateV7["id"][] {
  return queryPlayerCommandsV7(state, state.humanPlayerId)
    .filter((command) => command.kind === "RECOVER")
    .map((command) => ("unitId" in command ? command.unitId : unitId(0)))
    .sort((left, right) => left - right);
}

function withUnit(
  state: GameStateV7,
  id: UnitStateV7["id"],
  patch: Partial<UnitStateV7>,
): GameStateV7 {
  return checkedV7({
    ...state,
    units: state.units.map((unit) =>
      unit.id === id ? { ...unit, ...patch } : unit,
    ),
  });
}

function unitAt(state: GameStateV7, at: CoordV7): UnitStateV7 {
  return required(state.units.find((unit) => same(unit.at, at)));
}

function cityAt(
  state: GameStateV7,
  at: CoordV7,
): GameStateV7["cities"][number] {
  return required(state.cities.find((city) => same(city.at, at)));
}

function tileOf(state: GameStateV7, at: CoordV7) {
  return required(state.board.tiles.find((tile) => same(tile.at, at)));
}

function seatPlayer(state: GameStateV7, seat: number): PlayerId {
  return required(state.players.find((player) => player.seat === seat)).id;
}

function otherPlayer(state: GameStateV7, id: PlayerId): PlayerId {
  return required(state.players.find((player) => player.id !== id)).id;
}

function neighborsOf(center: CoordV7): CoordV7[] {
  const result: CoordV7[] = [];
  for (let y = center.y - 1; y <= center.y + 1; y += 1)
    for (let x = center.x - 1; x <= center.x + 1; x += 1)
      if (x !== center.x || y !== center.y) result.push({ x, y });
  return result;
}

function allExceptTiles(excluded: readonly CoordV7[], size = 11): CoordV7[] {
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
const chebyshev = (left: CoordV7, right: CoordV7): number =>
  Math.max(Math.abs(left.x - right.x), Math.abs(left.y - right.y));
