import { describe, expect, it } from "vitest";
import {
  COMMAND_KIND_ORDER_V7,
  DOMAIN_EVENT_KIND_ORDER_V7,
  RAISE_DEAD_SKELETON_HP_V7,
  RULESET_7_ID,
  TECHNOLOGY_IDS_V7,
  appendReplayCommandV7,
  applyCommandV7,
  canonicalHash,
  createInitialMapStateV7,
  createPlayableGameV7,
  createReplayV7,
  effectiveRoleRuleV7,
  parseCommandEnvelopeV7,
  parseCommandV7,
  parseEventEnvelopeV7,
  parseEventV7,
  parseGameStateV7,
  parsePlayerEventEnvelopeV7,
  parseReplayJsonV7,
  previewCityCapacityV7,
  previewDevourV7,
  previewRaiseDeadV7,
  projectEventsV7,
  queryPlayerCommandsV7,
  runReplayV7,
  unitId,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type DomainEventV7,
  type FactionIdV7,
  type GameStateV7,
  type MatchSetupV7,
  type PlayerId,
  type ReplayFileV7,
  type UnitRoleIdV7,
  type UnitStateV7,
} from "../../src/engine/index";
import { createSaveEnvelopeV7, parseSaveV7 } from "../../src/persistence/index";
import { checkedV7 } from "../fixtures/v7-builders";

// Seed-2 DRY_LAND boards (factions never change the board):
// - two seats (11x11): human capital (8, 8) with territory x 7-9, y 7-9;
//   enemy capital (2, 8) with territory x 1-3, y 7-9; villages (5, 5),
//   (8, 5), and (5, 8); rows 0-4 west of x 6 are open neutral land, and
//   (6, 2), (6, 3), (6, 4) are Mountains.
// - three seats (14x14): capitals (2, 2), (11, 11), and (11, 2).
const NECROMANCER_AT = { x: 2, y: 2 } as const;

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
const EXHAUSTED: UnitStateV7["activation"] = {
  moved: true,
  movedPathLength: 0,
  attacked: true,
  attacksUsed: 1,
  tendedThisTurn: false,
  inspired: false,
  overrunActive: false,
  escapeAvailable: false,
  recovered: true,
  captured: true,
  handled: true,
  specialActed: true,
};

describe("ruleset-7 revision-13 Raise Dead", () => {
  function raiseArena(options: ArenaOptions = {}): GameStateV7 {
    return arena(
      ["UNDEAD", "ORIGINAL"],
      [
        { seat: 0, role: "CAPTAIN", at: NECROMANCER_AT },
        { seat: 0, role: "FIGHTER", at: { x: 3, y: 3 } },
        { seat: 1, role: "FIGHTER", at: { x: 1, y: 3 } },
      ],
      {
        graves: [
          { x: 1, y: 1 },
          { x: 3, y: 1 },
          NECROMANCER_AT,
          { x: 4, y: 2 },
          { x: 1, y: 3 },
          { x: 2, y: 3 },
          { x: 3, y: 3 },
        ],
        ...options,
      },
    );
  }

  it("raises every empty adjacent Grave as an exhausted 5-HP Skeleton in (y, x) order", () => {
    const state = raiseArena();
    const necromancer = unitAt(state, NECROMANCER_AT);
    const result = apply(state, state.humanPlayerId, {
      kind: "RAISE_DEAD",
      unitId: necromancer.id,
    });
    const raisedAt = [
      { x: 1, y: 1 },
      { x: 3, y: 1 },
      { x: 2, y: 3 },
    ];
    const ids = raisedAt.map((_, index) => unitId(state.nextEntityId + index));
    expect(result.events[0]).toEqual({
      kind: "DEAD_RAISED",
      playerId: state.humanPlayerId,
      unitId: necromancer.id,
      results: raisedAt.map((at, index) => ({ unitId: ids[index], at })),
    });
    // Every tile was already explored, so nothing is revealed.
    expect(result.events.map((event) => event.kind)).toEqual(["DEAD_RAISED"]);
    const rule = effectiveRoleRuleV7("FIGHTER", "UNDEAD");
    expect(rule.label).toBe("Skeleton");
    expect(RAISE_DEAD_SKELETON_HP_V7).toBe(5);
    expect(result.state.units.slice(-3)).toEqual(
      raisedAt.map((at, index): UnitStateV7 => ({
        id: required(ids[index]),
        ownerId: state.humanPlayerId,
        homeCityId: necromancer.homeCityId,
        role: "FIGHTER",
        form: "LAND",
        at,
        hp: 5,
        maxHp: 10,
        kills: 0,
        veteran: false,
        captureEligible: false,
        activation: EXHAUSTED,
      })),
    );
    // Occupied Graves (own or enemy unit), the Necromancer's own tile, and
    // Graves at distance 2 stay.
    expect(result.state.graves).toEqual([
      NECROMANCER_AT,
      { x: 4, y: 2 },
      { x: 1, y: 3 },
      { x: 3, y: 3 },
    ]);
    expect(unitAt(result.state, NECROMANCER_AT).activation).toEqual({
      ...READY,
      specialActed: true,
      handled: true,
    });
    expect(result.state.nextEntityId).toBe(state.nextEntityId + 3);
    expect(result.state.commandIndex).toBe(state.commandIndex + 1);
    expect(parseGameStateV7(result.state)).toEqual(result.state);
    // The Necromancer's primary action is spent: no Attack, Frenzy, or
    // second Raise Dead.
    const offered = unitCommands(result.state, necromancer.id);
    expect(offered.map((command) => command.kind)).not.toContain("RAISE_DEAD");
    expect(offered.map((command) => command.kind)).not.toContain("RALLY");
    expect(offered.map((command) => command.kind)).not.toContain("ATTACK");
    for (const command of [
      { kind: "RAISE_DEAD", unitId: necromancer.id },
      { kind: "RALLY", unitId: necromancer.id },
    ] as const)
      expectRejected(result.state, state.humanPlayerId, command, {
        code: "UNIT_ALREADY_ACTED",
        params: { unitId: necromancer.id },
      });
  });

  it("has no cap: all eight adjacent Graves rise with consecutive IDs", () => {
    const around = neighborsOf(NECROMANCER_AT);
    const state = arena(
      ["UNDEAD", "ORIGINAL"],
      [{ seat: 0, role: "CAPTAIN", at: NECROMANCER_AT }],
      { graves: around },
    );
    const necromancer = unitAt(state, NECROMANCER_AT);
    const result = apply(state, state.humanPlayerId, {
      kind: "RAISE_DEAD",
      unitId: necromancer.id,
    });
    const event = required(result.events[0]);
    if (event.kind !== "DEAD_RAISED") throw new Error(event.kind);
    expect(event.results).toEqual(
      around.map((at, index) => ({
        unitId: unitId(state.nextEntityId + index),
        at,
      })),
    );
    expect(result.state.graves).toEqual([]);
    expect(
      result.state.units.filter(
        (unit) => unit.role === "FIGHTER" && unit.hp === 5,
      ),
    ).toHaveLength(8);
  });

  it("may exceed the home city's capacity, which then blocks training", () => {
    const state = arena(
      ["UNDEAD", "ORIGINAL"],
      [{ seat: 0, role: "CAPTAIN", at: NECROMANCER_AT }],
      { graves: neighborsOf(NECROMANCER_AT) },
    );
    const necromancer = unitAt(state, NECROMANCER_AT);
    const cityId = required(necromancer.homeCityId ?? undefined);
    const before = required(previewCityCapacityV7(state, cityId) ?? undefined);
    expect(before.available).toBeGreaterThan(0);
    const result = apply(state, state.humanPlayerId, {
      kind: "RAISE_DEAD",
      unitId: necromancer.id,
    });
    const after = required(
      previewCityCapacityV7(result.state, cityId) ?? undefined,
    );
    expect(after.assigned).toBe(before.assigned + 8);
    expect(after.overCapacity).toBe(after.assigned - after.capacity);
    expect(after.overCapacity).toBeGreaterThan(0);
    expect(
      queryPlayerCommandsV7(result.state, state.humanPlayerId).some(
        (command) => command.kind === "TRAIN" && command.cityId === cityId,
      ),
    ).toBe(false);
    expectRejected(
      result.state,
      state.humanPlayerId,
      { kind: "TRAIN", cityId, role: "FIGHTER" },
      { code: "CITY_CAPACITY_FULL", params: { cityId } },
    );
  });

  it("orphans the risings of an orphaned Necromancer", () => {
    const state = arena(
      ["UNDEAD", "ORIGINAL"],
      [{ seat: 0, role: "CAPTAIN", at: NECROMANCER_AT, homeless: true }],
      { graves: [{ x: 1, y: 1 }] },
    );
    const necromancer = unitAt(state, NECROMANCER_AT);
    expect(necromancer.homeCityId).toBeNull();
    const result = apply(state, state.humanPlayerId, {
      kind: "RAISE_DEAD",
      unitId: necromancer.id,
    });
    expect(unitAt(result.state, { x: 1, y: 1 }).homeCityId).toBeNull();
  });

  it("places risings on Mountains without Engineering and never destroys Field Defense", () => {
    const at = { x: 5, y: 3 };
    const mountains = [
      { x: 6, y: 2 },
      { x: 6, y: 3 },
      { x: 6, y: 4 },
    ];
    const state = arena(
      ["UNDEAD", "ORIGINAL"],
      [{ seat: 0, role: "CAPTAIN", at }],
      {
        graves: mountains,
        withoutTechs: { 0: ["ENGINEERING", "METALLURGY", "EXPLOSIVES"] },
      },
    );
    for (const mountain of mountains)
      expect(tileOf(state, mountain).terrain).toBe("MOUNTAIN");
    const necromancer = unitAt(state, at);
    const result = apply(state, state.humanPlayerId, {
      kind: "RAISE_DEAD",
      unitId: necromancer.id,
    });
    for (const mountain of mountains)
      expect(unitAt(result.state, mountain).role).toBe("FIGHTER");

    // Graves in hostile territory keep their Field Defense.
    const hostileAt = { x: 4, y: 7 };
    const defended = [
      { x: 3, y: 7 },
      { x: 3, y: 8 },
    ];
    const hostile = arena(
      ["UNDEAD", "ORIGINAL"],
      [{ seat: 0, role: "CAPTAIN", at: hostileAt }],
      { graves: [{ x: 3, y: 6 }, ...defended], fieldDefense: defended },
    );
    const enemyCity = required(
      hostile.cities.find((city) => city.ownerId !== hostile.humanPlayerId),
    );
    for (const tile of defended) {
      expect(tileOf(hostile, tile).territoryCityId).toBe(enemyCity.id);
      expect(tileOf(hostile, tile).fieldDefense).toBe(true);
    }
    const raised = apply(hostile, hostile.humanPlayerId, {
      kind: "RAISE_DEAD",
      unitId: unitAt(hostile, hostileAt).id,
    });
    expect(raised.events.map((event) => event.kind)).not.toContain(
      "FIELD_DEFENSE_DESTROYED",
    );
    for (const tile of defended) {
      expect(tileOf(raised.state, tile).fieldDefense).toBe(true);
      expect(unitAt(raised.state, tile).role).toBe("FIGHTER");
    }
  });

  it("places risings in allied territory that ordinary movement cannot enter", () => {
    const factions = ["ORIGINAL", "UNDEAD", "ORIGINAL"] as const;
    const probe = arena(factions, [], { aiMode: "COOPERATIVE" });
    const ally = seatPlayer(probe, 2);
    const allyCapital = required(
      probe.cities.find((city) => city.ownerId === ally),
    );
    const grave = required(
      neighborsOf(allyCapital.at).find((at) => {
        const tile = tileOf(probe, at);
        return (
          tile.biome !== null &&
          tile.site === null &&
          tile.territoryCityId === allyCapital.id &&
          !probe.treasureChests.some((chest) => same(chest, at))
        );
      }),
    );
    const necromancerAt = required(
      neighborsOf(grave).find(
        (at) =>
          chebyshev(at, allyCapital.at) === 2 &&
          probe.board.tiles.some(
            (tile) => same(tile.at, at) && tile.site === null,
          ),
      ),
    );
    const state = arena(
      factions,
      [{ seat: 1, role: "CAPTAIN", at: necromancerAt }],
      { aiMode: "COOPERATIVE", activeSeat: 1, graves: [grave] },
    );
    const necromancer = unitAt(state, necromancerAt);
    expect(
      unitCommands(state, necromancer.id).some(
        (command) =>
          command.kind === "MOVE" && same(required(command.path.at(-1)), grave),
      ),
    ).toBe(false);
    const result = apply(state, necromancer.ownerId, {
      kind: "RAISE_DEAD",
      unitId: necromancer.id,
    });
    expect(unitAt(result.state, grave)).toMatchObject({
      ownerId: necromancer.ownerId,
      role: "FIGHTER",
      hp: 5,
    });
  });

  it("reveals each rising's sight for its owner after DEAD_RAISED", () => {
    const factions = ["UNDEAD", "ORIGINAL"] as const;
    const known = [
      ...initialExplored(factions, 0),
      NECROMANCER_AT,
      ...neighborsOf(NECROMANCER_AT),
    ];
    const state = arena(
      factions,
      [{ seat: 0, role: "CAPTAIN", at: NECROMANCER_AT }],
      {
        graves: [
          { x: 1, y: 1 },
          { x: 3, y: 3 },
        ],
        explored: { 0: known },
      },
    );
    const result = apply(state, state.humanPlayerId, {
      kind: "RAISE_DEAD",
      unitId: unitAt(state, NECROMANCER_AT).id,
    });
    const expected = sortedCoords(
      [
        { x: 1, y: 1 },
        { x: 3, y: 3 },
      ]
        .flatMap((at) => [at, ...neighborsOf(at)])
        .filter(
          (at) =>
            at.x >= 0 &&
            at.y >= 0 &&
            !known.some((item) => same(item, at)) &&
            at.x < 11 &&
            at.y < 11,
        ),
    );
    expect(expected.length).toBeGreaterThan(0);
    expect(result.events.map((event) => event.kind)).toEqual([
      "DEAD_RAISED",
      "TILES_REVEALED",
    ]);
    expect(result.events[1]).toEqual({
      kind: "TILES_REVEALED",
      playerId: state.humanPlayerId,
      tiles: expected,
    });
  });

  it("may follow a Move, and the risings recover at their owner's next Start Turn", () => {
    const state = arena(
      ["UNDEAD", "ORIGINAL"],
      [{ seat: 0, role: "CAPTAIN", at: { x: 4, y: 3 } }],
      {
        graves: [
          { x: 2, y: 1 },
          { x: 3, y: 1 },
        ],
      },
    );
    const necromancer = unitAt(state, { x: 4, y: 3 });
    expect(
      unitCommands(state, necromancer.id).map((c) => c.kind),
    ).not.toContain("RAISE_DEAD");
    expectRejected(
      state,
      state.humanPlayerId,
      { kind: "RAISE_DEAD", unitId: necromancer.id },
      { code: "RAISE_DEAD_NOT_LEGAL", params: { reason: "NO_GRAVE" } },
    );
    const moved = apply(state, state.humanPlayerId, {
      kind: "MOVE",
      unitId: necromancer.id,
      path: [{ x: 3, y: 2 }],
    });
    expect(unitCommands(moved.state, necromancer.id)).toContainEqual({
      kind: "RAISE_DEAD",
      unitId: necromancer.id,
    });
    const raised = apply(moved.state, state.humanPlayerId, {
      kind: "RAISE_DEAD",
      unitId: necromancer.id,
    });
    const skeleton = unitAt(raised.state, { x: 2, y: 1 });
    expect(skeleton.activation).toEqual(EXHAUSTED);
    // Exhausted: a rising offers nothing this turn.
    expect(unitCommands(raised.state, skeleton.id)).toEqual([]);
    let next = apply(raised.state, state.humanPlayerId, { kind: "END_TURN" });
    next = apply(next.state, otherPlayer(state, state.humanPlayerId), {
      kind: "END_TURN",
    });
    const refreshed = required(
      next.state.units.find((unit) => unit.id === skeleton.id),
    );
    expect(refreshed.activation).toEqual(READY);
    expect(refreshed.captureEligible).toBe(false);
    expect(unitCommands(next.state, skeleton.id).map((c) => c.kind)).toContain(
      "MOVE",
    );
  });

  it("rejects every illegal Raise Dead atomically", () => {
    const state = raiseArena();
    const actor = state.humanPlayerId;
    const enemy = otherPlayer(state, actor);
    const necromancer = unitAt(state, NECROMANCER_AT);
    const skeleton = unitAt(state, { x: 3, y: 3 });
    const enemyFighter = unitAt(state, { x: 1, y: 3 });
    expectRejected(
      state,
      actor,
      { kind: "RAISE_DEAD", unitId: unitId(9999) },
      { code: "UNIT_NOT_FOUND", params: { unitId: 9999 } },
    );
    expectRejected(
      state,
      actor,
      { kind: "RAISE_DEAD", unitId: enemyFighter.id },
      { code: "UNIT_NOT_OWNED", params: { unitId: enemyFighter.id } },
    );
    expectRejected(
      state,
      actor,
      { kind: "RAISE_DEAD", unitId: skeleton.id },
      { code: "UNIT_ROLE_INVALID", params: { role: "FIGHTER" } },
    );
    expectRejected(
      state,
      enemy,
      { kind: "RAISE_DEAD", unitId: necromancer.id },
      { code: "NOT_ACTIVE_PLAYER", params: {} },
    );
    for (const activation of [
      { attacked: true, attacksUsed: 1 },
      { specialActed: true },
      { recovered: true },
    ])
      expectRejected(
        withUnit(state, necromancer.id, {
          activation: { ...READY, ...activation },
        }),
        actor,
        { kind: "RAISE_DEAD", unitId: necromancer.id },
        { code: "UNIT_ALREADY_ACTED", params: { unitId: necromancer.id } },
      );
    // Frenzy spends the same primary action.
    const frenzied = apply(state, actor, {
      kind: "RALLY",
      unitId: necromancer.id,
    });
    expectRejected(
      frenzied.state,
      actor,
      { kind: "RAISE_DEAD", unitId: necromancer.id },
      { code: "UNIT_ALREADY_ACTED", params: { unitId: necromancer.id } },
    );
    // Only occupied, distant, or own-tile Graves remain.
    expectRejected(
      checkedV7({
        ...state,
        graves: [
          NECROMANCER_AT,
          { x: 4, y: 2 },
          { x: 1, y: 3 },
          { x: 3, y: 3 },
        ],
      }),
      actor,
      { kind: "RAISE_DEAD", unitId: necromancer.id },
      { code: "RAISE_DEAD_NOT_LEGAL", params: { reason: "NO_GRAVE" } },
    );
    expect(
      applyCommandV7(state, actor, {
        kind: "RAISE_DEAD",
        unitId: necromancer.id,
        extra: 1,
      } as unknown as CommandV7),
    ).toEqual({
      accepted: false,
      state,
      events: [],
      error: { code: "INVALID_COMMAND", params: {} },
    });
  });

  it("rejects an embarked Necromancer as the wrong form", () => {
    const water = { x: 2, y: 1 };
    const state = arena(
      ["UNDEAD", "ORIGINAL"],
      [{ seat: 0, role: "CAPTAIN", at: water, form: "EMBARKED" }],
      { water: [water], graves: [{ x: 1, y: 1 }] },
    );
    const necromancer = unitAt(state, water);
    expect(
      unitCommands(state, necromancer.id).map((c) => c.kind),
    ).not.toContain("RAISE_DEAD");
    expectRejected(
      state,
      state.humanPlayerId,
      { kind: "RAISE_DEAD", unitId: necromancer.id },
      { code: "UNIT_ROLE_INVALID", params: { role: "CAPTAIN" } },
    );
  });
});

describe("ruleset-7 revision-13 Devour", () => {
  const GRAVE = { x: 1, y: 1 } as const;

  function devourArena(hp = 3): GameStateV7 {
    return arena(
      ["UNDEAD", "ORIGINAL"],
      [
        { seat: 0, role: "RAIDER", at: GRAVE, hp },
        { seat: 0, role: "FIGHTER", at: { x: 3, y: 3 } },
        { seat: 1, role: "FIGHTER", at: { x: 2, y: 1 } },
      ],
      { graves: [GRAVE, { x: 3, y: 3 }, { x: 4, y: 4 }] },
    );
  }

  it("heals a Ghoul on its Grave to full, consumes the Grave, and ends its turn", () => {
    const state = devourArena();
    const ghoul = unitAt(state, GRAVE);
    const enemy = unitAt(state, { x: 2, y: 1 });
    expect(effectiveRoleRuleV7("RAIDER", "UNDEAD").label).toBe("Ghoul");
    const result = apply(state, state.humanPlayerId, {
      kind: "DEVOUR",
      unitId: ghoul.id,
    });
    expect(result.events).toEqual([
      {
        kind: "GRAVE_DEVOURED",
        playerId: state.humanPlayerId,
        unitId: ghoul.id,
        at: GRAVE,
        amount: 7,
        hpAfter: 10,
      },
    ]);
    expect(result.state.graves).toEqual([
      { x: 3, y: 3 },
      { x: 4, y: 4 },
    ]);
    const after = unitAt(result.state, GRAVE);
    expect(after.hp).toBe(10);
    expect(after.activation).toEqual({
      ...READY,
      specialActed: true,
      handled: true,
    });
    expect(result.state.commandIndex).toBe(state.commandIndex + 1);
    expect(parseGameStateV7(result.state)).toEqual(result.state);
    // Terminal: no Attack, Move, Capture, Pillage, Devour, or Wait.
    const offered = unitCommands(result.state, ghoul.id).map((c) => c.kind);
    for (const kind of [
      "ATTACK",
      "MOVE",
      "CAPTURE",
      "PILLAGE",
      "DEVOUR",
      "WAIT",
    ] as const)
      expect(offered).not.toContain(kind);
    for (const command of [
      { kind: "ATTACK", unitId: ghoul.id, targetUnitId: enemy.id },
      { kind: "MOVE", unitId: ghoul.id, path: [{ x: 1, y: 2 }] },
      { kind: "DEVOUR", unitId: ghoul.id },
    ] as const)
      expectRejected(result.state, state.humanPlayerId, command, {
        code: "UNIT_ALREADY_ACTED",
        params: { unitId: ghoul.id },
      });
    expectRejected(
      result.state,
      state.humanPlayerId,
      { kind: "WAIT", unitId: ghoul.id },
      { code: "UNIT_ALREADY_HANDLED", params: { unitId: ghoul.id } },
    );
  });

  it("is legal at full HP to deny the Grave, healing 0", () => {
    const state = devourArena(10);
    const ghoul = unitAt(state, GRAVE);
    expect(unitCommands(state, ghoul.id)).toContainEqual({
      kind: "DEVOUR",
      unitId: ghoul.id,
    });
    const result = apply(state, state.humanPlayerId, {
      kind: "DEVOUR",
      unitId: ghoul.id,
    });
    expect(result.events[0]).toMatchObject({ amount: 0, hpAfter: 10 });
    expect(result.state.graves).not.toContainEqual(GRAVE);
  });

  it("may follow a Charge-length Move onto the Grave", () => {
    const state = arena(
      ["UNDEAD", "ORIGINAL"],
      [{ seat: 0, role: "RAIDER", at: { x: 1, y: 3 }, hp: 2 }],
      { graves: [GRAVE] },
    );
    const ghoul = unitAt(state, { x: 1, y: 3 });
    expectRejected(
      state,
      state.humanPlayerId,
      { kind: "DEVOUR", unitId: ghoul.id },
      { code: "DEVOUR_NOT_LEGAL", params: { reason: "NO_GRAVE" } },
    );
    const moved = apply(state, state.humanPlayerId, {
      kind: "MOVE",
      unitId: ghoul.id,
      path: [
        { x: 1, y: 2 },
        { x: 1, y: 1 },
      ],
    });
    expect(unitAt(moved.state, GRAVE).activation.movedPathLength).toBe(2);
    expect(unitCommands(moved.state, ghoul.id)).toContainEqual({
      kind: "DEVOUR",
      unitId: ghoul.id,
    });
    const result = apply(moved.state, state.humanPlayerId, {
      kind: "DEVOUR",
      unitId: ghoul.id,
    });
    expect(result.events[0]).toMatchObject({ at: GRAVE, amount: 8 });
    expect(result.state.graves).toEqual([]);
  });

  it("rejects every illegal Devour atomically", () => {
    const state = devourArena();
    const actor = state.humanPlayerId;
    const ghoul = unitAt(state, GRAVE);
    const skeleton = unitAt(state, { x: 3, y: 3 });
    const enemy = unitAt(state, { x: 2, y: 1 });
    expectRejected(
      state,
      actor,
      { kind: "DEVOUR", unitId: enemy.id },
      { code: "UNIT_NOT_OWNED", params: { unitId: enemy.id } },
    );
    // A Skeleton on a Grave cannot Devour; a Ghoul cannot Raise Dead.
    expectRejected(
      state,
      actor,
      { kind: "DEVOUR", unitId: skeleton.id },
      { code: "UNIT_ROLE_INVALID", params: { role: "FIGHTER" } },
    );
    expectRejected(
      state,
      actor,
      { kind: "RAISE_DEAD", unitId: ghoul.id },
      { code: "UNIT_ROLE_INVALID", params: { role: "RAIDER" } },
    );
    expectRejected(
      withUnit(state, ghoul.id, {
        activation: { ...READY, attacked: true, attacksUsed: 1 },
      }),
      actor,
      { kind: "DEVOUR", unitId: ghoul.id },
      { code: "UNIT_ALREADY_ACTED", params: { unitId: ghoul.id } },
    );
    // Standing next to a Grave is not enough.
    expectRejected(
      withUnit(state, ghoul.id, { at: { x: 1, y: 2 } }),
      actor,
      { kind: "DEVOUR", unitId: ghoul.id },
      { code: "DEVOUR_NOT_LEGAL", params: { reason: "NO_GRAVE" } },
    );
    // A Necromancer cannot Devour.
    const necromancerState = arena(
      ["UNDEAD", "ORIGINAL"],
      [{ seat: 0, role: "CAPTAIN", at: GRAVE }],
      { graves: [GRAVE] },
    );
    expectRejected(
      necromancerState,
      actor,
      { kind: "DEVOUR", unitId: unitAt(necromancerState, GRAVE).id },
      { code: "UNIT_ROLE_INVALID", params: { role: "CAPTAIN" } },
    );
  });
});

describe("ruleset-7 revision-13 Grave actions: queries and previews", () => {
  it("offers Raise Dead and Devour exactly when they are legal", () => {
    const states = [
      arena(
        ["UNDEAD", "ORIGINAL"],
        [
          { seat: 0, role: "CAPTAIN", at: NECROMANCER_AT },
          { seat: 0, role: "CAPTAIN", at: { x: 8, y: 2 } },
          { seat: 0, role: "RAIDER", at: { x: 1, y: 1 } },
          { seat: 0, role: "RAIDER", at: { x: 4, y: 4 } },
          { seat: 0, role: "FIGHTER", at: { x: 3, y: 3 } },
          { seat: 1, role: "FIGHTER", at: { x: 1, y: 3 } },
        ],
        {
          graves: [
            { x: 1, y: 1 },
            { x: 3, y: 1 },
            { x: 8, y: 1 },
            { x: 1, y: 3 },
            { x: 3, y: 3 },
          ],
        },
      ),
      // Every adjacent Grave is occupied; the Ghoul has already attacked.
      arena(
        ["UNDEAD", "ORIGINAL"],
        [
          { seat: 0, role: "CAPTAIN", at: NECROMANCER_AT },
          { seat: 0, role: "RAIDER", at: { x: 3, y: 3 }, attacked: true },
        ],
        { graves: [{ x: 3, y: 3 }] },
      ),
    ];
    for (const state of states) {
      const actor = state.humanPlayerId;
      const offered = queryPlayerCommandsV7(state, actor);
      for (const unit of state.units.filter((item) => item.ownerId === actor))
        for (const kind of ["RAISE_DEAD", "DEVOUR"] as const) {
          const command = { kind, unitId: unit.id };
          expect(
            offered.some(
              (candidate) =>
                candidate.kind === kind && candidate.unitId === unit.id,
            ),
          ).toBe(applyCommandV7(state, actor, command).accepted);
        }
    }
    // The first fixture offers both actions; the second offers neither.
    expect(
      queryPlayerCommandsV7(
        required(states[0]),
        required(states[0]).humanPlayerId,
      )
        .filter(
          (command) =>
            command.kind === "RAISE_DEAD" || command.kind === "DEVOUR",
        )
        .map((command) => command.kind),
    ).toEqual(["RAISE_DEAD", "RAISE_DEAD", "DEVOUR"]);
    expect(
      queryPlayerCommandsV7(
        required(states[1]),
        required(states[1]).humanPlayerId,
      )
        .map((command) => command.kind)
        .filter((kind) => kind === "RAISE_DEAD" || kind === "DEVOUR"),
    ).toEqual([]);
  });

  it("previews Raise Dead and Devour exactly as they resolve", () => {
    const state = arena(
      ["UNDEAD", "ORIGINAL"],
      [
        { seat: 0, role: "CAPTAIN", at: NECROMANCER_AT },
        { seat: 0, role: "RAIDER", at: { x: 4, y: 4 }, hp: 4 },
        { seat: 0, role: "FIGHTER", at: { x: 3, y: 3 } },
      ],
      {
        graves: [
          { x: 1, y: 1 },
          { x: 2, y: 3 },
          { x: 3, y: 3 },
          { x: 4, y: 4 },
        ],
      },
    );
    const actor = state.humanPlayerId;
    const enemy = otherPlayer(state, actor);
    const necromancer = unitAt(state, NECROMANCER_AT);
    const ghoul = unitAt(state, { x: 4, y: 4 });
    const raisePreview = previewRaiseDeadV7(state, actor, necromancer.id);
    expect(raisePreview).toEqual({
      graves: [
        { x: 1, y: 1 },
        { x: 2, y: 3 },
      ],
    });
    expect(previewRaiseDeadV7(viewForV7(state, actor), necromancer.id)).toEqual(
      raisePreview,
    );
    const raised = apply(state, actor, {
      kind: "RAISE_DEAD",
      unitId: necromancer.id,
    });
    const event = required(raised.events[0]);
    if (event.kind !== "DEAD_RAISED") throw new Error(event.kind);
    expect(event.results.map((result) => result.at)).toEqual(
      raisePreview?.graves,
    );

    const devourPreview = previewDevourV7(state, actor, ghoul.id);
    expect(devourPreview).toEqual({
      at: { x: 4, y: 4 },
      amount: 6,
      hpAfter: 10,
    });
    expect(previewDevourV7(viewForV7(state, actor), ghoul.id)).toEqual(
      devourPreview,
    );
    const devoured = apply(state, actor, { kind: "DEVOUR", unitId: ghoul.id });
    expect(devoured.events[0]).toEqual({
      kind: "GRAVE_DEVOURED",
      playerId: actor,
      unitId: ghoul.id,
      ...devourPreview,
    });

    // Not offered: no preview (spent action, no Grave, wrong viewer).
    expect(previewRaiseDeadV7(raised.state, actor, necromancer.id)).toBeNull();
    expect(previewDevourV7(state, actor, necromancer.id)).toBeNull();
    expect(previewRaiseDeadV7(state, actor, ghoul.id)).toBeNull();
    expect(previewRaiseDeadV7(state, enemy, necromancer.id)).toBeNull();
    expect(previewDevourV7(state, enemy, ghoul.id)).toBeNull();
    expect(
      previewDevourV7(
        checkedV7({ ...state, graves: [{ x: 1, y: 1 }] }),
        actor,
        ghoul.id,
      ),
    ).toBeNull();
  });
});

describe("ruleset-7 revision-13 Grave actions: projection and fog", () => {
  const factions = ["UNDEAD", "ORIGINAL"] as const;
  const WEST = { x: 1, y: 1 };
  const EAST = { x: 3, y: 3 };

  function raiseSeenBy(viewerKnows: readonly CoordV7[]) {
    const state = arena(
      factions,
      [{ seat: 0, role: "CAPTAIN", at: NECROMANCER_AT }],
      {
        graves: [WEST, EAST],
        explored: { 1: [...initialExplored(factions, 1), ...viewerKnows] },
      },
    );
    const viewer = otherPlayer(state, state.humanPlayerId);
    const result = apply(state, state.humanPlayerId, {
      kind: "RAISE_DEAD",
      unitId: unitAt(state, NECROMANCER_AT).id,
    });
    const projected = projectEventsV7(
      state,
      result.state,
      viewer,
      result.events,
    );
    expect(parsePlayerEventEnvelopeV7(projected)).toEqual({
      ok: true,
      value: projected,
    });
    return {
      state,
      result,
      viewer,
      projected,
      necromancer: unitAt(state, NECROMANCER_AT),
      west: unitAt(result.state, WEST),
      east: unitAt(result.state, EAST),
    };
  }

  it("projects DEAD_RAISED with only the Skeletons the viewer sees afterwards", () => {
    const { state, result, viewer, projected, necromancer, west } = raiseSeenBy(
      [NECROMANCER_AT, WEST],
    );
    expect(viewForV7(state, viewer).graves).toEqual([WEST]);
    // The listed Skeleton counts as visibly created: no UNIT_REVEALED.
    expect(projected.events).toEqual([
      {
        kind: "DEAD_RAISED",
        playerId: state.humanPlayerId,
        unitId: necromancer.id,
        results: [{ unitId: west.id, at: WEST }],
      },
    ]);
    // The raised Grave disappears from the viewer's next view.
    expect(viewForV7(result.state, viewer).graves).toEqual([]);
    expect(
      viewForV7(result.state, viewer).units.map((unit) => unit.id),
    ).toEqual([necromancer.id, west.id]);
  });

  it("projects DEAD_RAISED with empty results when only the Necromancer is visible", () => {
    const { state, projected, necromancer } = raiseSeenBy([NECROMANCER_AT]);
    expect(projected.events).toEqual([
      {
        kind: "DEAD_RAISED",
        playerId: state.humanPlayerId,
        unitId: necromancer.id,
        results: [],
      },
    ]);
  });

  it("reveals Skeletons without DEAD_RAISED to a viewer who cannot see the Necromancer", () => {
    const { projected, east } = raiseSeenBy([EAST]);
    expect(projected.events).toEqual([
      { kind: "UNIT_REVEALED", unitId: east.id, at: EAST, reason: "DETECTED" },
    ]);
    const hidden = raiseSeenBy([]);
    expect(hidden.projected.events).toEqual([]);
    expect(viewForV7(hidden.result.state, hidden.viewer).graves).toEqual([]);
  });

  it("projects everything, including reveals, to the owner", () => {
    const { state, result } = raiseSeenBy([]);
    const own = projectEventsV7(
      state,
      result.state,
      state.humanPlayerId,
      result.events,
    );
    expect(own.events).toEqual(result.events);
  });

  it("projects GRAVE_DEVOURED exactly to viewers who see the Ghoul", () => {
    for (const [known, visible] of [
      [[WEST], true],
      [[], false],
    ] as const) {
      const state = arena(
        factions,
        [{ seat: 0, role: "RAIDER", at: WEST, hp: 5 }],
        {
          graves: [WEST],
          explored: { 1: [...initialExplored(factions, 1), ...known] },
        },
      );
      const viewer = otherPlayer(state, state.humanPlayerId);
      const result = apply(state, state.humanPlayerId, {
        kind: "DEVOUR",
        unitId: unitAt(state, WEST).id,
      });
      const projected = projectEventsV7(
        state,
        result.state,
        viewer,
        result.events,
      );
      expect(projected.events).toEqual(visible ? result.events : []);
      expect(viewForV7(result.state, viewer).graves).toEqual([]);
    }
  });
});

describe("ruleset-7 revision-13 Grave actions: schema, Human parity, and persistence", () => {
  it("places the commands and events at their frozen-order positions", () => {
    const tend = COMMAND_KIND_ORDER_V7.indexOf("TEND_WOUNDED");
    expect(COMMAND_KIND_ORDER_V7.slice(tend + 1, tend + 3)).toEqual([
      "RAISE_DEAD",
      "DEVOUR",
    ]);
    const tended = DOMAIN_EVENT_KIND_ORDER_V7.indexOf("WOUNDED_TENDED");
    expect(DOMAIN_EVENT_KIND_ORDER_V7.slice(tended + 1, tended + 3)).toEqual([
      "DEAD_RAISED",
      "GRAVE_DEVOURED",
    ]);
  });

  it("parses the commands and events strictly", () => {
    for (const kind of ["RAISE_DEAD", "DEVOUR"] as const) {
      expect(parseCommandV7({ kind, unitId: 3 })).toEqual({
        ok: true,
        value: { kind, unitId: 3 },
      });
      for (const invalid of [
        { kind },
        { kind, unitId: 0 },
        { kind, unitId: "3" },
        { kind, unitId: 3, at: { x: 1, y: 1 } },
      ])
        expect(parseCommandV7(invalid).ok).toBe(false);
      expect(
        parseCommandEnvelopeV7({
          format: "pulp-wars-command",
          version: 7,
          command: { kind, unitId: 3 },
        }).ok,
      ).toBe(true);
    }
    const raised = {
      kind: "DEAD_RAISED",
      playerId: 1,
      unitId: 5,
      results: [
        { unitId: 8, at: { x: 1, y: 1 } },
        { unitId: 9, at: { x: 3, y: 1 } },
        { unitId: 10, at: { x: 2, y: 3 } },
      ],
    };
    expect(parseEventV7(raised)).toEqual({ ok: true, value: raised });
    for (const invalid of [
      { ...raised, results: [] },
      { ...raised, results: [...raised.results].reverse() },
      {
        ...raised,
        results: [
          { unitId: 9, at: { x: 1, y: 1 } },
          { unitId: 8, at: { x: 3, y: 1 } },
        ],
      },
      { ...raised, results: [{ unitId: 5, at: { x: 1, y: 1 } }] },
      { ...raised, results: [{ unitId: 8, at: { x: 1 } }] },
      { ...raised, results: [{ unitId: 8, at: { x: 1, y: 1 }, hp: 5 }] },
      { ...raised, playerId: 0 },
      { ...raised, extra: true },
    ])
      expect(parseEventV7(invalid).ok).toBe(false);
    const devoured = {
      kind: "GRAVE_DEVOURED",
      playerId: 1,
      unitId: 5,
      at: { x: 1, y: 1 },
      amount: 0,
      hpAfter: 10,
    };
    expect(parseEventV7(devoured)).toEqual({ ok: true, value: devoured });
    for (const invalid of [
      { ...devoured, amount: -1 },
      { ...devoured, amount: 10 },
      { ...devoured, hpAfter: 0 },
      { ...devoured, at: null },
      { ...devoured, results: [] },
    ])
      expect(parseEventV7(invalid).ok).toBe(false);
    // Empty results exist only as a player projection.
    expect(
      parseEventEnvelopeV7({
        format: "pulp-wars-events",
        version: 7,
        commandIndex: 1,
        events: [{ ...raised, results: [] }],
      }).ok,
    ).toBe(false);
    expect(
      parsePlayerEventEnvelopeV7({
        format: "pulp-wars-player-events",
        version: 7,
        viewerId: 2,
        commandIndex: 1,
        events: [{ ...raised, results: [] }],
      }).ok,
    ).toBe(true);
  });

  it("never offers or accepts Grave actions for Human units", () => {
    const state = arena(
      ["ORIGINAL", "UNDEAD"],
      [
        { seat: 0, role: "CAPTAIN", at: NECROMANCER_AT },
        { seat: 0, role: "RAIDER", at: { x: 1, y: 1 }, hp: 3 },
      ],
      {
        graves: [
          { x: 1, y: 1 },
          { x: 3, y: 3 },
        ],
      },
    );
    const actor = state.humanPlayerId;
    const captain = unitAt(state, NECROMANCER_AT);
    const raider = unitAt(state, { x: 1, y: 1 });
    expect(effectiveRoleRuleV7("CAPTAIN", "ORIGINAL").abilities).not.toContain(
      "RAISE_DEAD",
    );
    expect(
      queryPlayerCommandsV7(state, actor).filter(
        (command) => command.kind === "RAISE_DEAD" || command.kind === "DEVOUR",
      ),
    ).toEqual([]);
    for (const [command, role] of [
      [{ kind: "RAISE_DEAD", unitId: captain.id }, "CAPTAIN"],
      [{ kind: "DEVOUR", unitId: raider.id }, "RAIDER"],
    ] as const)
      expectRejected(state, actor, command, {
        code: "UNIT_ROLE_INVALID",
        params: { role },
      });
    expect(previewRaiseDeadV7(state, actor, captain.id)).toBeNull();
    expect(previewDevourV7(state, actor, raider.id)).toBeNull();
    // Human Tend Wounded and Rally are unchanged by the Graves.
    expect(
      queryPlayerCommandsV7(state, actor).filter(
        (command) => "unitId" in command && command.unitId === captain.id,
      ),
    ).toContainEqual({ kind: "TEND_WOUNDED", unitId: captain.id });
  });

  for (const goal of ["RAISE_DEAD", "DEVOUR"] as const)
    it(`round-trips ${goal} through replay, checkpoints, save, and hashes`, () => {
      const { state, replay, before, events } = scriptedUndeadMatch(goal);
      expect(before.graves.length).toBeGreaterThan(state.graves.length);
      expect(events[0]?.kind).toBe(
        goal === "RAISE_DEAD" ? "DEAD_RAISED" : "GRAVE_DEVOURED",
      );
      expect(replay.commands.at(-1)?.kind).toBe(goal);
      expect(replay.checkpoints.at(-1)?.stateHash).toBe(canonicalHash(state));
      const parsedReplay = parseReplayJsonV7(JSON.stringify(replay));
      if (parsedReplay.kind !== "VALID") throw new Error(parsedReplay.kind);
      const replayed = runReplayV7(parsedReplay.replay);
      expect(replayed.stateHash).toBe(canonicalHash(state));
      expect(replayed.state.graves).toEqual(state.graves);
      const save = createSaveEnvelopeV7(
        { state, replay },
        "2026-09-29T12:00:00.000Z",
      );
      const loaded = parseSaveV7(JSON.stringify(save));
      expect(loaded).toEqual({ kind: "VALID", save });
      expect(
        parseEventEnvelopeV7({
          format: "pulp-wars-events",
          version: 7,
          commandIndex: state.commandIndex,
          events,
        }).ok,
      ).toBe(true);
    });
});

/**
 * A deterministic scripted seed-2 Undead-vs-Undead match from a real start:
 * the human researches toward the goal's unit, trains it, and walks it to a
 * Grave left by the opening Skeleton fight, until the goal command is
 * accepted. It depends only on the rules, never on the Normal AI.
 */
function scriptedUndeadMatch(goal: "RAISE_DEAD" | "DEVOUR"): {
  readonly before: GameStateV7;
  readonly state: GameStateV7;
  readonly events: readonly DomainEventV7[];
  readonly replay: ReplayFileV7;
} {
  const setup = setupWith(["UNDEAD", "UNDEAD"]);
  const plan =
    goal === "RAISE_DEAD"
      ? { techs: ["GATHERING", "ADMINISTRATION"], role: "CAPTAIN" }
      : { techs: ["SCOUTING"], role: "RAIDER" };
  const created = createPlayableGameV7(setup);
  if (!created.ok) throw new Error(created.error.code);
  let state = created.state;
  let replay = createReplayV7(setup);
  for (let step = 0; step < 400; step += 1) {
    const actor = required(state.turnOrder[state.activeSeatIndex]);
    const command = scriptedCommand(state, actor, goal, plan);
    const result = applyCommandV7(state, actor, command);
    if (!result.accepted)
      throw new Error(`${command.kind} rejected: ${result.error.code}`);
    replay = appendReplayCommandV7(replay, command, result.state);
    if (command.kind === goal)
      return {
        before: state,
        state: result.state,
        events: result.events,
        replay,
      };
    state = result.state;
  }
  throw new Error(`${goal} never became legal`);
}

function scriptedCommand(
  state: GameStateV7,
  actor: PlayerId,
  goal: "RAISE_DEAD" | "DEVOUR",
  plan: { readonly techs: readonly string[]; readonly role: string },
): CommandV7 {
  const commands = queryPlayerCommandsV7(state, actor);
  const scripted =
    commands.find((command) => command.kind === goal) ??
    commands.find((command) => command.kind === "ATTACK");
  if (scripted !== undefined) return scripted;
  if (actor === state.humanPlayerId) {
    const player = required(state.players.find((item) => item.id === actor));
    const tech = plan.techs.find(
      (item) => !player.researchedTechs.includes(item as never),
    );
    const research = commands.find(
      (command) => command.kind === "RESEARCH" && command.tech === tech,
    );
    if (research !== undefined) return research;
    const train = commands.find(
      (command) => command.kind === "TRAIN" && command.role === plan.role,
    );
    if (
      tech === undefined &&
      train !== undefined &&
      !state.units.some(
        (unit) => unit.ownerId === actor && unit.role === plan.role,
      )
    )
      return train;
  }
  for (const unit of state.units.filter((item) => item.ownerId === actor)) {
    const freeGraves = state.graves.filter(
      (grave) => !state.units.some((other) => same(other.at, grave)),
    );
    const target =
      unit.role === plan.role
        ? nearest(unit.at, freeGraves)
        : nearest(
            unit.at,
            state.units
              .filter((other) => other.ownerId !== actor)
              .map((other) => other.at),
          );
    if (target === undefined) continue;
    if (unit.role === "CAPTAIN" && chebyshev(unit.at, target) === 1) continue;
    const best = commands
      .filter(
        (command): command is Extract<CommandV7, { kind: "MOVE" }> =>
          command.kind === "MOVE" && command.unitId === unit.id,
      )
      .sort(
        (left, right) =>
          chebyshev(required(left.path.at(-1)), target) -
          chebyshev(required(right.path.at(-1)), target),
      )[0];
    if (
      best !== undefined &&
      chebyshev(required(best.path.at(-1)), target) < chebyshev(unit.at, target)
    )
      return best;
  }
  return { kind: "END_TURN" };
}

function nearest(
  from: CoordV7,
  candidates: readonly CoordV7[],
): CoordV7 | undefined {
  return [...candidates].sort(
    (left, right) => chebyshev(from, left) - chebyshev(from, right),
  )[0];
}

interface Piece {
  readonly seat: number;
  readonly role: UnitRoleIdV7;
  readonly at: CoordV7;
  readonly hp?: number;
  readonly form?: UnitStateV7["form"];
  readonly homeless?: boolean;
  readonly attacked?: boolean;
}

interface ArenaOptions {
  readonly water?: readonly CoordV7[];
  readonly graves?: readonly CoordV7[];
  readonly fieldDefense?: readonly CoordV7[];
  /** Explored tiles per seat; every tile when omitted. */
  readonly explored?: Readonly<Record<number, readonly CoordV7[]>>;
  /** Technologies removed per seat (every technology otherwise). */
  readonly withoutTechs?: Readonly<Record<number, readonly string[]>>;
  readonly activeSeat?: number;
  readonly aiMode?: MatchSetupV7["aiMode"];
}

function setupWith(
  factions: readonly FactionIdV7[],
  seed = 2,
  aiMode: MatchSetupV7["aiMode"] = "RIVAL",
): MatchSetupV7 {
  const aiCount = (factions.length - 1) as 1 | 2 | 3;
  const size = aiCount === 1 ? 11 : aiCount === 2 ? 14 : 16;
  return {
    rulesetId: RULESET_7_ID,
    seed,
    width: size,
    height: size,
    aiCount,
    aiDifficulty: "NORMAL",
    aiMode,
    humanColor: "CORAL",
    factions: [...factions],
    mapType: "DRY_LAND",
    mapGenerationRevision: "REGIONAL_BIOMES_NAVAL_V2",
  };
}

function initialExplored(
  factions: readonly FactionIdV7[],
  seat: number,
): CoordV7[] {
  const created = createInitialMapStateV7(setupWith(factions));
  if (!created.ok) throw new Error(created.error.code);
  return [
    ...required(created.state.players.find((player) => player.seat === seat))
      .explored,
  ];
}

/**
 * A seed-2 board with every technology, the given pieces as the only units,
 * and every non-settlement piece tile cleared to Grass (or Shallow Water).
 * Treasure chests on piece or Grave tiles are removed.
 */
function arena(
  factions: readonly FactionIdV7[],
  pieces: readonly Piece[],
  options: ArenaOptions = {},
): GameStateV7 {
  const created = createInitialMapStateV7(
    setupWith(factions, 2, options.aiMode),
  );
  if (!created.ok) throw new Error(created.error.code);
  const base = created.state;
  const size = base.board.width;
  const water = options.water ?? [];
  const graves = options.graves ?? [];
  const fieldDefense = options.fieldDefense ?? [];
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
      activation: piece.attacked
        ? { ...READY, attacked: true, attacksUsed: 1 }
        : READY,
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
      researchedTechs: TECHNOLOGY_IDS_V7.filter(
        (tech) => !options.withoutTechs?.[candidate.seat]?.includes(tech),
      ),
      coins: 10_000,
      // Unlocked in advance so that the command tail emits no achievements.
      achievementEntitlements: candidate.achievementEntitlements.map(
        (entitlement) =>
          entitlement.achievement === "EXPLORER"
            ? { ...entitlement, unlocked: true }
            : entitlement,
      ),
      explored: sortedCoords(
        options.explored?.[candidate.seat] ?? allTiles(size),
      ),
    })),
    cities: base.cities.map((city) => ({ ...city, cityActionAvailable: true })),
    units,
    treasureChests: base.treasureChests.filter(
      (chest) => ![...cleared, ...graves].some((at) => same(at, chest)),
    ),
    graves: sortedCoords(graves),
    board: {
      ...base.board,
      tiles: base.board.tiles.map((tile) => {
        const defended = fieldDefense.some((at) => same(at, tile.at));
        if (water.some((at) => same(at, tile.at)))
          return {
            ...tile,
            biome: null,
            terrain: "SHALLOW_WATER" as const,
            resource: null,
            improvement: null,
            road: false,
            fieldDefense: false,
            site: null,
          };
        if (cleared.some((at) => same(at, tile.at)) && tile.site === null)
          return {
            ...tile,
            biome: tile.biome ?? "PLAINS",
            terrain: "GRASS" as const,
            resource: null,
            improvement: null,
            road: false,
            fieldDefense: defended,
          };
        return defended ? { ...tile, fieldDefense: true } : tile;
      }),
    },
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

function expectRejected(
  state: GameStateV7,
  actor: PlayerId,
  command: CommandV7,
  error: { readonly code: string; readonly params: Record<string, unknown> },
): void {
  const result = applyCommandV7(state, actor, command);
  expect(result).toEqual({ accepted: false, state, events: [], error });
  expect(result.state).toBe(state);
}

function unitCommands(
  state: GameStateV7,
  id: UnitStateV7["id"],
): readonly Extract<CommandV7, { unitId: UnitStateV7["id"] }>[] {
  const owner = required(state.units.find((unit) => unit.id === id)).ownerId;
  return queryPlayerCommandsV7(state, owner).filter(
    (command): command is Extract<CommandV7, { unitId: UnitStateV7["id"] }> =>
      "unitId" in command && command.unitId === id,
  );
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

function allTiles(size: number): CoordV7[] {
  const result: CoordV7[] = [];
  for (let y = 0; y < size; y += 1)
    for (let x = 0; x < size; x += 1) result.push({ x, y });
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
