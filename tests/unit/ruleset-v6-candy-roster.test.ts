import { describe, expect, it } from "vitest";
import {
  CANDY_BASELINE_TREE_V1,
  CARDINAL_DIRECTION_ORDER_V6,
  ORIGINAL_BASELINE_TREE,
  RULESET_6_ID,
  SPATIAL_ECONOMY_REVISION,
  TECHNOLOGY_IDS,
  UNIT_ROLE_IDS,
  appendReplayCommandV6,
  applyCommandV6,
  canonicalHash,
  cityId,
  createInitialMapStateV6,
  createReplayV6,
  effectiveRoleRuleV6,
  parseEventV6,
  parseGameStateV6,
  queryPlayerCommandsV6,
  unitId,
  validateMovementPathV6,
  viewForV6,
  wallId,
  type CoordV6,
  type GameStateV6,
  type MatchSetupV6,
  type UnitRoleId,
  type UnitStateV6,
} from "../../src/engine/index";
import { createSaveEnvelopeV6, parseSaveV6 } from "../../src/persistence/index";

const setup: MatchSetupV6 = {
  rulesetId: RULESET_6_ID,
  seed: 6_009,
  width: 11,
  height: 11,
  aiCount: 1,
  aiDifficulty: "NORMAL",
  aiMode: "RIVAL",
  humanColor: "CORAL",
  factions: ["CANDY", "ORIGINAL"],
  mapGenerationRevision: SPATIAL_ECONOMY_REVISION,
};

const FRESH = {
  moved: false,
  movedPathLength: 0,
  attacked: false,
  healed: false,
  recovered: false,
  captured: false,
  handled: false,
  specialActed: false,
} as const;

const CANDY_ROLE_ROWS = [
  ["FIGHTER", "Candy Warrior", 2, 10, 4, 4, 1, 1, null],
  ["SCOUT", "Jelly Scout", 3, 10, 3, 2, 2, 1, "SCOUTING"],
  ["MARKSMAN", "Gumball Guard", 3, 10, 4, 2, 1, 2, "MARKSMANSHIP"],
  ["GUARD", "Choco Engineer", 3, 15, 3, 6, 1, 1, "DRILL"],
  ["RAIDER", "Donut", 3, 10, 0, 2, 1, 0, "RAIDING"],
  ["MEDIC", "Marshmallow Medic", 4, 10, 1, 3, 1, 1, "MEDICINE"],
  ["HEAVY", "Jawbreaker", 5, 15, 6, 6, 1, 1, "METALLURGY"],
  ["BREACHER", "Candy Crusher", 5, 10, 8, 2, 1, 1, "EXPLOSIVES"],
  ["JUGGERNAUT", "Sugar Titan", null, 40, 8, 8, 1, 1, null],
] as const;

describe("ruleset-6 Candy roster", () => {
  it("registers an immutable equal-topology tree with the exact nine Candy labels", () => {
    expect(CANDY_BASELINE_TREE_V1).not.toBe(ORIGINAL_BASELINE_TREE);
    expect(Object.isFrozen(CANDY_BASELINE_TREE_V1)).toBe(true);
    expect(Object.isFrozen(CANDY_BASELINE_TREE_V1.roleRules)).toBe(true);
    expect(CANDY_BASELINE_TREE_V1.nodes).toEqual(ORIGINAL_BASELINE_TREE.nodes);
    expect(
      UNIT_ROLE_IDS.map((role) => CANDY_BASELINE_TREE_V1.roleRules[role].label),
    ).toEqual([
      "Candy Warrior",
      "Jelly Scout",
      "Gumball Guard",
      "Choco Engineer",
      "Donut",
      "Marshmallow Medic",
      "Jawbreaker",
      "Candy Crusher",
      "Sugar Titan",
    ]);
    expect(
      UNIT_ROLE_IDS.filter(
        (role) => CANDY_BASELINE_TREE_V1.roleRules[role].cost !== null,
      ),
    ).toEqual(UNIT_ROLE_IDS.slice(0, 8));
    expect(
      CANDY_BASELINE_TREE_V1.nodes.map((node) => [
        node.id,
        node.prerequisites,
        node.unlockedRoles,
      ]),
    ).toEqual(
      ORIGINAL_BASELINE_TREE.nodes.map((node) => [
        node.id,
        node.prerequisites,
        node.unlockedRoles,
      ]),
    );
    expect(UNIT_ROLE_IDS).not.toContain("CATAPULT");
  });

  it.each(CANDY_ROLE_ROWS)(
    "binds %s to the exact Candy label, cost, stats, and unlock",
    (role, label, cost, maxHp, attack2, defense2, move, range, technology) => {
      expect(effectiveRoleRuleV6("CANDY", role)).toMatchObject({
        role,
        label,
        cost,
        maxHp,
        attack2,
        defense2,
        move,
        range,
        technology,
      });
    },
  );

  it.each(UNIT_ROLE_IDS.slice(0, 8))(
    "trains Candy %s through its faction binding at the exact effective cost",
    (role) => {
      const state = trainingState(role);
      const city = ownCity(state);
      const result = applyCommandV6(state, state.humanPlayerId, {
        kind: "TRAIN",
        cityId: city.id,
        role,
      });
      expect(result.accepted).toBe(true);
      if (!result.accepted) return;
      const binding = effectiveRoleRuleV6("CANDY", role);
      expect(result.state.units.at(-1)).toMatchObject({
        ownerId: state.humanPlayerId,
        role,
        hp: binding.maxHp,
        maxHp: binding.maxHp,
      });
      expect(ownPlayer(result.state).coins).toBe(100 - must(binding.cost));
      expect(result.events).toEqual([
        expect.objectContaining({
          kind: "UNIT_TRAINED",
          role,
          cost: binding.cost,
        }),
      ]);
    },
  );

  it.each(
    CANDY_ROLE_ROWS.filter(
      (row): row is (typeof CANDY_ROLE_ROWS)[number] & { readonly 8: string } =>
        row[8] !== null,
    ),
  )(
    "keeps Candy %s training locked behind its exact technology",
    (role, _label, ...row) => {
      const technology = must(row[6]);
      const state = withOwnPlayer(trainingState(role), {
        researchedTechs: ["GATHERING"],
      });
      expectRejected(
        applyCommandV6(state, state.humanPlayerId, {
          kind: "TRAIN",
          cityId: ownCity(state).id,
          role,
        }),
        state,
        "TECH_REQUIRED",
      );
      expect(effectiveRoleRuleV6("CANDY", role).technology).toBe(technology);
    },
  );

  it("keeps every non-Donut mechanical role at baseline parity plus Candify", () => {
    for (const role of UNIT_ROLE_IDS.filter(
      (candidate) => candidate !== "RAIDER",
    )) {
      const candy = effectiveRoleRuleV6("CANDY", role);
      const original = effectiveRoleRuleV6("ORIGINAL", role);
      expect({
        ...candy,
        label: original.label,
        abilities: withoutCandify(candy.abilities),
      }).toEqual(original);
      expect(candy.abilities).toContain("CANDIFY");
    }
    expect(effectiveRoleRuleV6("CANDY", "GUARD").abilities).toContain(
      "BUILD_CHOCOLATE_WALL",
    );
  });

  it("substitutes exact Donut stats, Capture/Candify/Roll, and no Attack/Charge", () => {
    expect(effectiveRoleRuleV6("CANDY", "RAIDER")).toMatchObject({
      label: "Donut",
      cost: 3,
      maxHp: 10,
      attack2: 0,
      defense2: 2,
      move: 1,
      range: 0,
      technology: "RAIDING",
      abilities: [
        "CANDIFY",
        "CAPTURE",
        "KAMIKAZE_ROLL",
        "IGNORE_ZOC_WITH_MANEUVER",
      ],
    });
    const state = donutArena();
    const donut = ownUnit(state, "RAIDER");
    const commands = queryPlayerCommandsV6(
      viewForV6(state, state.humanPlayerId),
    );
    expect(
      commands.filter(
        (command) =>
          command.kind === "KAMIKAZE_ROLL" && command.unitId === donut.id,
      ),
    ).toEqual(
      CARDINAL_DIRECTION_ORDER_V6.map((direction) => ({
        kind: "KAMIKAZE_ROLL",
        unitId: donut.id,
        direction,
      })),
    );
    expect(
      commands.some(
        (command) => command.kind === "ATTACK" && command.unitId === donut.id,
      ),
    ).toBe(false);
    expectRejected(
      applyCommandV6(state, state.humanPlayerId, {
        kind: "ATTACK",
        unitId: donut.id,
        target: { kind: "UNIT", unitId: enemyUnit(state).id },
      }),
      state,
      "ATTACK_NOT_LEGAL",
    );
  });

  it("enforces Donut and Choco Engineer actor/type/activation/target precedence atomically", () => {
    const donutState = donutArena();
    const donut = ownUnit(donutState, "RAIDER");
    const edge = checked({
      ...donutState,
      units: donutState.units.map((unit) =>
        unit.id === donut.id ? { ...unit, at: { x: 0, y: donut.at.y } } : unit,
      ),
    });
    expectRejected(
      applyCommandV6(edge, edge.humanPlayerId, {
        kind: "KAMIKAZE_ROLL",
        unitId: ownUnit(edge, "FIGHTER").id,
        direction: "WEST",
      }),
      edge,
      "UNIT_TYPE_INVALID",
    );
    const acted = checked({
      ...edge,
      units: edge.units.map((unit) =>
        unit.id === donut.id
          ? { ...unit, activation: { ...unit.activation, moved: true } }
          : unit,
      ),
    });
    expectRejected(
      applyCommandV6(acted, acted.humanPlayerId, {
        kind: "KAMIKAZE_ROLL",
        unitId: donut.id,
        direction: "WEST",
      }),
      acted,
      "UNIT_ALREADY_ACTED",
    );
    expectRejected(
      applyCommandV6(edge, edge.humanPlayerId, {
        kind: "KAMIKAZE_ROLL",
        unitId: donut.id,
        direction: "WEST",
      }),
      edge,
      "ROLL_DIRECTION_INVALID",
    );

    const wallState = candyActionArena("GUARD");
    const engineer = ownUnit(wallState, "GUARD");
    expectRejected(
      applyCommandV6(wallState, wallState.humanPlayerId, {
        kind: "BUILD_CHOCOLATE_WALL",
        unitId: engineer.id,
        at: { x: -1, y: -1 },
      }),
      wallState,
      "TILE_NOT_FOUND",
    );
    const wallActed = checked({
      ...wallState,
      units: wallState.units.map((unit) => ({
        ...unit,
        activation: { ...unit.activation, recovered: true },
      })),
    });
    expectRejected(
      applyCommandV6(wallActed, wallActed.humanPlayerId, {
        kind: "BUILD_CHOCOLATE_WALL",
        unitId: engineer.id,
        at: { x: -1, y: -1 },
      }),
      wallActed,
      "UNIT_ALREADY_ACTED",
    );
  });

  it.each([
    "moved",
    "attacked",
    "healed",
    "recovered",
    "captured",
    "specialActed",
  ] as const)("rejects Donut Roll after prior %s state", (flag) => {
    const base = candyActionArena("RAIDER");
    const donut = ownUnit(base, "RAIDER");
    const state = checked({
      ...base,
      units: base.units.map((unit) =>
        unit.id === donut.id
          ? { ...unit, activation: { ...unit.activation, [flag]: true } }
          : unit,
      ),
    });
    expectRejected(
      applyCommandV6(state, state.humanPlayerId, {
        kind: "KAMIKAZE_ROLL",
        unitId: donut.id,
        direction: "EAST",
      }),
      state,
      "UNIT_ALREADY_ACTED",
    );
  });

  it("allows Donut Roll after Wait because handled alone is not terminal", () => {
    const state = candyActionArena("RAIDER");
    const donut = ownUnit(state, "RAIDER");
    const waited = applyCommandV6(state, state.humanPlayerId, {
      kind: "WAIT",
      unitId: donut.id,
    });
    expect(waited.accepted).toBe(true);
    if (!waited.accepted) return;
    expect(
      must(waited.state.units.find((unit) => unit.id === donut.id)).activation,
    ).toMatchObject({ handled: true, specialActed: false });
    const rolled = applyCommandV6(waited.state, waited.state.humanPlayerId, {
      kind: "KAMIKAZE_ROLL",
      unitId: donut.id,
      direction: "EAST",
    });
    expect(rolled.accepted).toBe(true);
    if (!rolled.accepted) return;
    expect(rolled.state.commandIndex).toBe(state.commandIndex + 2);
    expect(rolled.events.at(-1)).toEqual({
      kind: "UNIT_DIED",
      unitId: donut.id,
      cause: "KAMIKAZE_ROLL_SELF",
    });
  });

  it("lets Maneuver affect ordinary Donut movement while Roll ignores movement rules", () => {
    const state = donutArena();
    const donut = ownUnit(state, "RAIDER");
    const enemy = enemyUnit(state);
    const zocDestination = { x: donut.at.x + 1, y: donut.at.y + 1 };
    const normalized = checked({
      ...state,
      board: {
        ...state.board,
        tiles: state.board.tiles.map((tile) =>
          same(tile.at, zocDestination)
            ? {
                ...tile,
                terrain: "GRASS" as const,
                resource: null,
                improvement: null,
              }
            : tile,
        ),
      },
    });
    expect(chebyshev(zocDestination, enemy.at)).toBe(1);
    const without = withOwnPlayer(normalized, {
      researchedTechs: TECHNOLOGY_IDS.filter((tech) => tech !== "MANEUVER"),
    });
    expect(
      validateMovementPathV6(without, donut, [zocDestination]),
    ).toMatchObject({
      legal: true,
      stopped: true,
    });
    const withManeuver = withOwnPlayer(normalized, {
      researchedTechs: [...TECHNOLOGY_IDS],
    });
    expect(
      validateMovementPathV6(withManeuver, donut, [zocDestination]),
    ).toMatchObject({ legal: true, stopped: false });
  });

  it.each(CARDINAL_DIRECTION_ORDER_V6)(
    "Roll reaches the %s board edge in exact travel order",
    (direction) => {
      const base = candyActionArena("RAIDER");
      const donut = ownUnit(base, "RAIDER");
      const result = applyCommandV6(base, base.humanPlayerId, {
        kind: "KAMIKAZE_ROLL",
        unitId: donut.id,
        direction,
      });
      expect(result.accepted).toBe(true);
      if (!result.accepted) return;
      expect(
        result.events
          .filter((event) => event.kind === "DONUT_ROLL_STEP")
          .map((event) => event.at),
      ).toEqual(pathToEdge(base, donut.at, direction));
      expect(result.state.units).toEqual([]);
    },
  );

  it("retains Donut Capture while omitting Attack and Charge", () => {
    const base = arena();
    const village = must(
      base.board.tiles.find((tile) => tile.site === "VILLAGE"),
    );
    const state = checked({
      ...base,
      nextEntityId: base.nextEntityId + 1,
      units: [
        {
          ...makeUnit(base, base.nextEntityId, "OWN", "RAIDER", village.at, 10),
          captureEligible: true,
        },
      ],
    });
    const donut = ownUnit(state, "RAIDER");
    expect(
      queryPlayerCommandsV6(viewForV6(state, state.humanPlayerId)),
    ).toContainEqual({ kind: "CAPTURE", unitId: donut.id });
    const result = applyCommandV6(state, state.humanPlayerId, {
      kind: "CAPTURE",
      unitId: donut.id,
    });
    expect(result.accepted).toBe(true);
    if (!result.accepted) return;
    expect(result.events[0]?.kind).toBe("CITY_CAPTURED");
    expect(
      result.state.units.find((unit) => unit.id === donut.id),
    ).toMatchObject({
      role: "RAIDER",
      activation: { captured: true, handled: true },
    });
  });

  it("Roll reveals only its ordered path, damages every relationship/structure by 10, and removes the Donut last", () => {
    const base = donutArena();
    const donut = ownUnit(base, "RAIDER");
    const friendly = must(
      base.units.find(
        (unit) =>
          unit.ownerId === base.humanPlayerId && unit.role === "FIGHTER",
      ),
    );
    const hostile = enemyUnit(base);
    const wall = must(base.chocolateWalls[0]);
    const hiddenBefore = withOwnPlayer(base, {
      explored: ownPlayer(base).explored.filter(
        (at) => at.y !== donut.at.y || at.x <= donut.at.x,
      ),
    });
    const randomBefore = hiddenBefore.random;
    expect(
      queryPlayerCommandsV6(
        viewForV6(hiddenBefore, hiddenBefore.humanPlayerId),
      ),
    ).toContainEqual({
      kind: "KAMIKAZE_ROLL",
      unitId: donut.id,
      direction: "EAST",
    });
    const result = applyCommandV6(hiddenBefore, hiddenBefore.humanPlayerId, {
      kind: "KAMIKAZE_ROLL",
      unitId: donut.id,
      direction: "EAST",
    });
    expect(result.accepted).toBe(true);
    if (!result.accepted) return;
    const path = Array.from(
      { length: hiddenBefore.board.width - donut.at.x - 1 },
      (_value, index) => ({ x: donut.at.x + index + 1, y: donut.at.y }),
    );
    expect(
      result.events.filter((event) => event.kind === "DONUT_ROLL_STEP"),
    ).toEqual(
      path.map((at) => ({ kind: "DONUT_ROLL_STEP", unitId: donut.id, at })),
    );
    expect(
      result.events.filter((event) => event.kind === "TILES_REVEALED"),
    ).toEqual(
      path.map((at) => ({
        kind: "TILES_REVEALED",
        playerId: hiddenBefore.humanPlayerId,
        tiles: [at],
      })),
    );
    expect(
      result.events.filter((event) => event.kind === "ROLL_DAMAGE_RESOLVED"),
    ).toEqual([
      {
        kind: "ROLL_DAMAGE_RESOLVED",
        sourceUnitId: donut.id,
        target: { kind: "UNIT", unitId: friendly.id },
        at: friendly.at,
        damage: 8,
        hpBefore: 8,
        hpAfter: 0,
      },
      {
        kind: "ROLL_DAMAGE_RESOLVED",
        sourceUnitId: donut.id,
        target: { kind: "UNIT", unitId: hostile.id },
        at: hostile.at,
        damage: 10,
        hpBefore: 15,
        hpAfter: 5,
      },
      {
        kind: "ROLL_DAMAGE_RESOLVED",
        sourceUnitId: donut.id,
        target: { kind: "CHOCOLATE_WALL", wallId: wall.id },
        at: wall.at,
        damage: 10,
        hpBefore: 10,
        hpAfter: 0,
      },
    ]);
    expect(result.events.at(-1)).toEqual({
      kind: "UNIT_DIED",
      unitId: donut.id,
      cause: "KAMIKAZE_ROLL_SELF",
    });
    expect(result.state.units.some((unit) => unit.id === donut.id)).toBe(false);
    expect(result.state.units.some((unit) => unit.id === friendly.id)).toBe(
      false,
    );
    expect(result.state.units.find((unit) => unit.id === hostile.id)?.hp).toBe(
      5,
    );
    expect(result.state.chocolateWalls).toEqual([]);
    expect(result.state.random).toEqual(randomBefore);
    expect(result.events.every((event) => parseEventV6(event).ok)).toBe(true);
  });

  it("builds a 10 HP Chocolate Wall for one Coin over a Road and exhausts only the special", () => {
    const base = candyActionArena("GUARD");
    const engineer = ownUnit(base, "GUARD");
    const at = adjacentOpen(base, engineer.at);
    const state = checked({
      ...base,
      board: {
        ...base.board,
        tiles: base.board.tiles.map((tile) =>
          same(tile.at, at) ? { ...tile, road: true } : tile,
        ),
      },
    });
    expect(
      queryPlayerCommandsV6(viewForV6(state, state.humanPlayerId)),
    ).toContainEqual({
      kind: "BUILD_CHOCOLATE_WALL",
      unitId: engineer.id,
      at,
    });
    const result = applyCommandV6(state, state.humanPlayerId, {
      kind: "BUILD_CHOCOLATE_WALL",
      unitId: engineer.id,
      at,
    });
    expect(result.accepted).toBe(true);
    if (!result.accepted) return;
    expect(ownPlayer(result.state).coins).toBe(99);
    expect(result.state.chocolateWalls).toContainEqual({
      id: wallId(state.nextEntityId),
      ownerId: state.humanPlayerId,
      at,
      hp: 10,
    });
    expect(tileAt(result.state, at).road).toBe(true);
    expect(
      must(result.state.units.find((unit) => unit.id === engineer.id))
        .activation,
    ).toMatchObject({
      moved: false,
      handled: true,
      specialActed: true,
    });
    expect(result.events).toEqual([
      {
        kind: "CHOCOLATE_WALL_BUILT",
        playerId: state.humanPlayerId,
        unitId: engineer.id,
        wallId: wallId(state.nextEntityId),
        at,
        cost: 1,
        hp: 10,
      },
    ]);
  });

  it("orders Wall adjacency, invalid occupancy, alliance, and Coin validation atomically", () => {
    const base = candyActionArena("GUARD");
    const engineer = ownUnit(base, "GUARD");
    const at = adjacentOpen(base, engineer.at);
    const distant = must(
      base.board.tiles.find((tile) => chebyshev(tile.at, engineer.at) > 1),
    ).at;
    const nonAdjacentSite = withOwnPlayer(
      checked({
        ...base,
        board: {
          ...base.board,
          tiles: base.board.tiles.map((tile) =>
            same(tile.at, distant)
              ? {
                  ...tile,
                  terrain: "GRASS" as const,
                  resource: null,
                  improvement: null,
                  road: false,
                  site: "VILLAGE" as const,
                }
              : tile,
          ),
        },
      }),
      { coins: 0 },
    );
    expectRejected(
      applyCommandV6(nonAdjacentSite, nonAdjacentSite.humanPlayerId, {
        kind: "BUILD_CHOCOLATE_WALL",
        unitId: engineer.id,
        at: distant,
      }),
      nonAdjacentSite,
      "WALL_TARGET_NOT_ADJACENT",
    );

    const site = withOwnPlayer(
      checked({
        ...base,
        board: {
          ...base.board,
          tiles: base.board.tiles.map((tile) =>
            same(tile.at, at)
              ? {
                  ...tile,
                  terrain: "GRASS" as const,
                  resource: null,
                  improvement: null,
                  road: false,
                  site: "VILLAGE" as const,
                }
              : tile,
          ),
        },
      }),
      { coins: 0 },
    );
    expectRejected(
      applyCommandV6(site, site.humanPlayerId, {
        kind: "BUILD_CHOCOLATE_WALL",
        unitId: engineer.id,
        at,
      }),
      site,
      "WALL_INVALID_TILE",
    );

    const occupiedByUnit = withOwnPlayer(
      checked({
        ...base,
        nextEntityId: base.nextEntityId + 1,
        units: [
          ...base.units,
          makeUnit(base, base.nextEntityId, "ENEMY", "FIGHTER", at, 10),
        ],
      }),
      { coins: 0 },
    );
    expectRejected(
      applyCommandV6(occupiedByUnit, occupiedByUnit.humanPlayerId, {
        kind: "BUILD_CHOCOLATE_WALL",
        unitId: engineer.id,
        at,
      }),
      occupiedByUnit,
      "WALL_INVALID_TILE",
    );

    const occupiedByWall = withOwnPlayer(
      checked({
        ...base,
        nextEntityId: base.nextEntityId + 1,
        chocolateWalls: [
          {
            id: wallId(base.nextEntityId),
            ownerId: enemyPlayer(base).id,
            at,
            hp: 10,
          },
        ],
      }),
      { coins: 0 },
    );
    expectRejected(
      applyCommandV6(occupiedByWall, occupiedByWall.humanPlayerId, {
        kind: "BUILD_CHOCOLATE_WALL",
        unitId: engineer.id,
        at,
      }),
      occupiedByWall,
      "WALL_INVALID_TILE",
    );

    const allied = cooperativeActionArena("GUARD");
    const alliedEngineer = must(
      allied.state.units.find((unit) => unit.ownerId === allied.actor),
    );
    const noCoinsAllied = withPlayerById(allied.state, allied.actor, {
      coins: 0,
    });
    expectRejected(
      applyCommandV6(noCoinsAllied, allied.actor, {
        kind: "BUILD_CHOCOLATE_WALL",
        unitId: alliedEngineer.id,
        at: allied.target,
      }),
      noCoinsAllied,
      "ALLY_TERRITORY_FORBIDDEN",
    );

    const noCoins = withOwnPlayer(base, { coins: 0 });
    expectRejected(
      applyCommandV6(noCoins, noCoins.humanPlayerId, {
        kind: "BUILD_CHOCOLATE_WALL",
        unitId: engineer.id,
        at,
      }),
      noCoins,
      "INSUFFICIENT_COINS",
    );
  });

  it("damages and destroys a Chocolate Wall through ordinary combat events", () => {
    const base = candyActionArena("FIGHTER");
    const attacker = ownUnit(base, "FIGHTER");
    const at = adjacentOpen(base, attacker.at);
    const state = checked({
      ...base,
      nextEntityId: base.nextEntityId + 1,
      chocolateWalls: [
        {
          id: wallId(base.nextEntityId),
          ownerId: base.humanPlayerId,
          at,
          hp: 1,
        },
      ],
    });
    const wall = must(state.chocolateWalls[0]);
    const result = applyCommandV6(state, state.humanPlayerId, {
      kind: "ATTACK",
      unitId: attacker.id,
      target: { kind: "CHOCOLATE_WALL", wallId: wall.id },
    });
    expect(result.accepted).toBe(true);
    if (!result.accepted) return;
    expect(result.events[0]).toMatchObject({
      kind: "COMBAT_RESOLVED",
      preview: {
        target: { kind: "CHOCOLATE_WALL", wallId: wall.id },
        damageToDefender: 1,
        damageToAttacker: 0,
        defenderDies: true,
        noRetaliationReason: "STRUCTURE",
      },
    });
    expect(result.events[1]).toEqual({
      kind: "CHOCOLATE_WALL_DESTROYED",
      wallId: wall.id,
      ownerId: wall.ownerId,
      at,
      cause: "ATTACK",
    });
    expect(result.state.chocolateWalls).toEqual([]);
    expect(
      must(result.state.units.find((unit) => unit.id === attacker.id)).kills,
    ).toBe(0);
  });

  it.each([
    [
      "zero HP",
      (state: GameStateV6) => ({
        ...state,
        chocolateWalls: state.chocolateWalls.map((wall) => ({
          ...wall,
          hp: 0,
        })),
      }),
    ],
    [
      "HP above ten",
      (state: GameStateV6) => ({
        ...state,
        chocolateWalls: state.chocolateWalls.map((wall) => ({
          ...wall,
          hp: 11,
        })),
      }),
    ],
    [
      "unknown owner",
      (state: GameStateV6) => ({
        ...state,
        chocolateWalls: state.chocolateWalls.map((wall) => ({
          ...wall,
          ownerId: 999_999,
        })),
      }),
    ],
    [
      "unit occupancy",
      (state: GameStateV6) => ({
        ...state,
        chocolateWalls: state.chocolateWalls.map((wall) => ({
          ...wall,
          at: must(state.units[0]).at,
        })),
      }),
    ],
    [
      "wall occupancy",
      (state: GameStateV6) => ({
        ...state,
        nextEntityId: state.nextEntityId + 1,
        chocolateWalls: [
          ...state.chocolateWalls,
          { ...must(state.chocolateWalls[0]), id: wallId(state.nextEntityId) },
        ],
      }),
    ],
    [
      "settlement-site occupancy",
      (state: GameStateV6) => ({
        ...state,
        chocolateWalls: state.chocolateWalls.map((wall) => ({
          ...wall,
          at: ownCity(state).at,
        })),
      }),
    ],
  ] as const)("rejects persisted Wall %s", (_label, mutate) => {
    expect(parseGameStateV6(mutate(tiedCandifyArena()))).toBeNull();
  });

  it("Candify stays inside the chosen expanded footprint and transfers live economy deterministically", () => {
    const state = candifyEconomyArena();
    const candy = ownUnit(state, "HEAVY");
    const own = ownCity(state);
    const priorCityId = tileAt(state, candy.at).territoryCityId;
    const result = applyCommandV6(state, state.humanPlayerId, {
      kind: "CANDIFY",
      unitId: candy.id,
    });
    expect(result.accepted).toBe(true);
    if (!result.accepted) return;
    expect(result.state.units.some((unit) => unit.id === candy.id)).toBe(false);
    expect(tileAt(result.state, candy.at).territoryCityId).toBe(own.id);
    expect(
      result.state.populationContributions.find(
        (contribution) => contribution.source.kind === "IMPROVEMENT",
      )?.cityId,
    ).toBe(own.id);
    expect(
      result.state.cities.find((city) => city.id === own.id),
    ).toMatchObject({
      level: 2,
      economicPopulation: 2,
      population: 0,
    });
    expect(result.events.slice(0, 2)).toEqual([
      { kind: "UNIT_DIED", unitId: candy.id, cause: "CANDIFY" },
      {
        kind: "TILE_CANDIFIED",
        playerId: state.humanPlayerId,
        unitId: candy.id,
        cityId: own.id,
        at: candy.at,
        previousCityId: priorCityId,
        previousOwnerId: enemyPlayer(state).id,
      },
    ]);
    expect(
      result.events.filter((event) => event.kind === "CITY_ECONOMY_CHANGED"),
    ).toHaveLength(2);
    expect(result.state.pendingChoices).toContainEqual({
      kind: "CITY_REWARD",
      cityId: own.id,
      reachedLevel: 2,
      candidates: ["SURVEY", "STOCKPILE"],
    });

    const outside = outsideFootprintArena();
    expectRejected(
      applyCommandV6(outside, outside.humanPlayerId, {
        kind: "CANDIFY",
        unitId: ownUnit(outside, "HEAVY").id,
      }),
      outside,
      "CANDIFY_OUTSIDE_FOOTPRINT",
    );
  });

  it.each(UNIT_ROLE_IDS)("makes Candify functional for Candy %s", (role) => {
    const state = neutralCandifyArena(role, false, 1);
    const unit = ownUnit(state, role);
    expect(
      queryPlayerCommandsV6(viewForV6(state, state.humanPlayerId)),
    ).toContainEqual({ kind: "CANDIFY", unitId: unit.id });
    const result = applyCommandV6(state, state.humanPlayerId, {
      kind: "CANDIFY",
      unitId: unit.id,
    });
    expect(result.accepted).toBe(true);
    if (!result.accepted) return;
    expect(result.state.commandIndex).toBe(state.commandIndex + 1);
    expect(result.state.units).toEqual([]);
    expect(result.events).toEqual([
      { kind: "UNIT_DIED", unitId: unit.id, cause: "CANDIFY" },
      {
        kind: "TILE_CANDIFIED",
        playerId: state.humanPlayerId,
        unitId: unit.id,
        cityId: ownCity(state).id,
        at: unit.at,
        previousCityId: null,
        previousOwnerId: null,
      },
    ]);
  });

  it("enforces unexpanded 3x3 and expanded 5x5 Candify boundaries", () => {
    const unexpanded = neutralCandifyArena("FIGHTER", false, 2);
    expectRejected(
      applyCommandV6(unexpanded, unexpanded.humanPlayerId, {
        kind: "CANDIFY",
        unitId: ownUnit(unexpanded, "FIGHTER").id,
      }),
      unexpanded,
      "CANDIFY_OUTSIDE_FOOTPRINT",
    );
    const expanded = neutralCandifyArena("FIGHTER", true, 2);
    const result = applyCommandV6(expanded, expanded.humanPlayerId, {
      kind: "CANDIFY",
      unitId: ownUnit(expanded, "FIGHTER").id,
    });
    expect(result.accepted).toBe(true);
    if (!result.accepted) return;
    expect(
      tileAt(result.state, ownUnit(expanded, "FIGHTER").at).territoryCityId,
    ).toBe(ownCity(expanded).id);
  });

  it("rejects cooperative allied Candify before connectivity and nearest-city checks", () => {
    const fixture = cooperativeActionArena("FIGHTER");
    const unit = must(
      fixture.state.units.find(
        (candidate) => candidate.ownerId === fixture.actor,
      ),
    );
    expectRejected(
      applyCommandV6(fixture.state, fixture.actor, {
        kind: "CANDIFY",
        unitId: unit.id,
      }),
      fixture.state,
      "TARGET_ALLIED",
    );
  });

  it("rejects hostile Candify when removing the bridge would disconnect its city", () => {
    const state = disconnectingCandifyArena();
    expectRejected(
      applyCommandV6(state, state.humanPlayerId, {
        kind: "CANDIFY",
        unitId: ownUnit(state, "FIGHTER").id,
      }),
      state,
      "CANDIFY_WOULD_DISCONNECT",
    );
  });

  it("immediately resolves Candify to the single nearest viable city", () => {
    const fixture = nearestCandifyArena();
    const result = applyCommandV6(fixture.state, fixture.state.humanPlayerId, {
      kind: "CANDIFY",
      unitId: fixture.unit.id,
    });
    expect(result.accepted).toBe(true);
    if (!result.accepted) return;
    expect(result.state.commandIndex).toBe(fixture.state.commandIndex + 1);
    expect(result.state.pendingChoices).toEqual([]);
    expect(result.events[1]).toEqual({
      kind: "TILE_CANDIFIED",
      playerId: fixture.state.humanPlayerId,
      unitId: fixture.unit.id,
      cityId: fixture.nearest.id,
      at: fixture.unit.at,
      previousCityId: null,
      previousOwnerId: null,
    });
  });

  it("stores and resolves tied Candify choices with exact ordering and command indices", () => {
    const state = tiedCandifyArena();
    const unit = ownUnit(state, "FIGHTER");
    const started = applyCommandV6(state, state.humanPlayerId, {
      kind: "CANDIFY",
      unitId: unit.id,
    });
    expect(started.accepted).toBe(true);
    if (!started.accepted) return;
    const head = started.state.pendingChoices[0];
    expect(head?.kind).toBe("CANDIFY_CITY");
    if (head?.kind !== "CANDIFY_CITY") return;
    expect(started.state.commandIndex).toBe(state.commandIndex + 1);
    expect(started.state.units).toEqual(state.units);
    expect(started.events).toEqual([
      {
        kind: "CANDIFY_CITY_CHOICE_REQUIRED",
        playerId: state.humanPlayerId,
        unitId: unit.id,
        candidateCityIds: head.candidateCityIds,
      },
    ]);

    expectRejected(
      applyCommandV6(started.state, started.state.humanPlayerId, {
        kind: "CHOOSE_CANDIFY_CITY",
        unitId: unitId(unit.id + 100_000),
        cityId: cityId(999_999),
      }),
      started.state,
      "CANDIFY_CHOICE_INVALID",
    );
    expectRejected(
      applyCommandV6(started.state, started.state.humanPlayerId, {
        kind: "CHOOSE_CANDIFY_CITY",
        unitId: unit.id,
        cityId: cityId(999_999),
      }),
      started.state,
      "CITY_NOT_FOUND",
    );

    const outsiderId = cityId(started.state.nextEntityId);
    const outsiderState = checked({
      ...started.state,
      nextEntityId: started.state.nextEntityId + 1,
      cities: [
        ...started.state.cities,
        {
          id: outsiderId,
          ownerId: enemyPlayer(started.state).id,
          at: adjacentOpen(started.state, unit.at),
          level: 1,
          permanentPopulation: 0,
          economicPopulation: 0,
          population: 0,
          isCapital: false,
          expanded: false,
          rewards: [],
        },
      ],
    });
    expectRejected(
      applyCommandV6(outsiderState, outsiderState.humanPlayerId, {
        kind: "CHOOSE_CANDIFY_CITY",
        unitId: unit.id,
        cityId: outsiderId,
      }),
      outsiderState,
      "CITY_NOT_OWNED",
    );

    const first = must(head.candidateCityIds[0]);
    const second = must(head.candidateCityIds[1]);
    const narrowed = checked({
      ...started.state,
      pendingChoices: [
        { kind: "CANDIFY_CITY", unitId: unit.id, candidateCityIds: [first] },
      ],
    });
    expectRejected(
      applyCommandV6(narrowed, narrowed.humanPlayerId, {
        kind: "CHOOSE_CANDIFY_CITY",
        unitId: unit.id,
        cityId: second,
      }),
      narrowed,
      "CANDIFY_CITY_NOT_CANDIDATE",
    );

    const resolved = applyCommandV6(
      started.state,
      started.state.humanPlayerId,
      {
        kind: "CHOOSE_CANDIFY_CITY",
        unitId: unit.id,
        cityId: second,
      },
    );
    expect(resolved.accepted).toBe(true);
    if (!resolved.accepted) return;
    expect(resolved.state.commandIndex).toBe(state.commandIndex + 2);
    expect(resolved.state.pendingChoices).toEqual([]);
    expect(resolved.events).toEqual([
      { kind: "UNIT_DIED", unitId: unit.id, cause: "CANDIFY" },
      {
        kind: "TILE_CANDIFIED",
        playerId: state.humanPlayerId,
        unitId: unit.id,
        cityId: second,
        at: unit.at,
        previousCityId: null,
        previousOwnerId: null,
      },
    ]);
  });

  it("keeps Candify queries exact for visible hostile territory and equal under hidden hostile footprints", () => {
    const visible = candifyEconomyArena();
    const unit = ownUnit(visible, "HEAVY");
    expect(
      queryPlayerCommandsV6(viewForV6(visible, visible.humanPlayerId)),
    ).toContainEqual({ kind: "CANDIFY", unitId: unit.id });

    const controller = enemyCity(visible);
    const hiddenAt = must(
      visible.board.tiles.find(
        (tile) =>
          tile.territoryCityId === controller.id &&
          !same(tile.at, unit.at) &&
          !same(tile.at, controller.at) &&
          tile.improvement === null,
      ),
    ).at;
    const explored = ownPlayer(visible).explored.filter(
      (at) => !same(at, hiddenAt),
    );
    const hiddenA = withOwnPlayer(visible, { explored });
    const hiddenB = checked({
      ...hiddenA,
      board: {
        ...hiddenA.board,
        tiles: hiddenA.board.tiles.map((tile) =>
          same(tile.at, hiddenAt) ? { ...tile, territoryCityId: null } : tile,
        ),
      },
    });
    const viewA = viewForV6(hiddenA, hiddenA.humanPlayerId);
    const viewB = viewForV6(hiddenB, hiddenB.humanPlayerId);
    expect(viewA).toEqual(viewB);
    const commandsA = queryPlayerCommandsV6(viewA);
    const commandsB = queryPlayerCommandsV6(viewB);
    expect(commandsA).toEqual(commandsB);
    expect(commandsA).not.toContainEqual({ kind: "CANDIFY", unitId: unit.id });
  });

  it.each([
    [3, "MILITIA", "FIGHTER", "Candy Warrior"],
    [5, "JUGGERNAUT", "JUGGERNAUT", "Sugar Titan"],
  ] as const)(
    "resolves level-%i %s through the Candy faction role binding",
    (level, reward, role, label) => {
      const state = rewardState(level);
      const city = ownCity(state);
      const result = applyCommandV6(state, state.humanPlayerId, {
        kind: "CHOOSE_CITY_REWARD",
        cityId: city.id,
        reachedLevel: level,
        reward,
      });
      expect(result.accepted).toBe(true);
      if (!result.accepted) return;
      const granted = must(
        result.state.units.find((unit) => unit.ownerId === state.humanPlayerId),
      );
      expect(granted.role).toBe(role);
      expect(effectiveRoleRuleV6("CANDY", granted.role).label).toBe(label);
      expect(result.events).toContainEqual(
        expect.objectContaining({ kind: "UNIT_REWARD_GRANTED", role }),
      );
    },
  );

  it("persists a mixed-faction Candy Wall and Candy pending choice through hash/save/replay", () => {
    const base = tiedCandifyArena();
    const unit = ownUnit(base, "FIGHTER");
    const started = applyCommandV6(base, base.humanPlayerId, {
      kind: "CANDIFY",
      unitId: unit.id,
    });
    expect(started.accepted).toBe(true);
    if (!started.accepted) return;
    const pending = started.state.pendingChoices[0];
    expect(pending?.kind).toBe("CANDIFY_CITY");
    if (pending?.kind !== "CANDIFY_CITY") return;
    expect(pending.candidateCityIds).toHaveLength(2);
    const viewCommands = queryPlayerCommandsV6(
      viewForV6(started.state, started.state.humanPlayerId),
    );
    expect(viewCommands).toEqual(
      pending.candidateCityIds.map((cityId) => ({
        kind: "CHOOSE_CANDIFY_CITY",
        unitId: unit.id,
        cityId,
      })),
    );
    const replay = appendReplayCommandV6(
      createReplayV6(setup),
      { kind: "CANDIFY", unitId: unit.id },
      started.state,
    );
    const save = createSaveEnvelopeV6(
      { state: started.state, replay },
      "2026-08-31T12:00:00.000Z",
    );
    expect(parseSaveV6(JSON.stringify(save))).toEqual({ kind: "VALID", save });
    expect(save.stateHash).toBe(canonicalHash(started.state));
    expect(started.state.players.map((player) => player.faction)).toEqual([
      "CANDY",
      "ORIGINAL",
    ]);
  });
});

function arena(): GameStateV6 {
  return arenaFor(setup);
}

function arenaFor(matchSetup: MatchSetupV6): GameStateV6 {
  const created = createInitialMapStateV6(matchSetup);
  if (!created.ok) throw new Error(created.error.code);
  const state = created.state;
  return checked({
    ...state,
    activeSeatIndex: state.turnOrder.indexOf(state.humanPlayerId),
    players: state.players.map((player) => ({
      ...player,
      coins: 100,
      researchedTechs: [...TECHNOLOGY_IDS],
      explored: state.board.tiles.map((tile) => tile.at),
    })),
    units: [],
    chocolateWalls: [],
    pendingChoices: [],
  });
}

function trainingState(role: UnitRoleId): GameStateV6 {
  const base = arena();
  const city = ownCity(base);
  const player = ownPlayer(base);
  const technology = effectiveRoleRuleV6("CANDY", role).technology;
  return checked({
    ...base,
    players: base.players.map((candidate) =>
      candidate.id === player.id
        ? {
            ...candidate,
            coins: 100,
            researchedTechs:
              technology === null ? ["GATHERING"] : [...TECHNOLOGY_IDS],
          }
        : candidate,
    ),
    board: {
      ...base.board,
      tiles: base.board.tiles.map((tile) =>
        same(tile.at, city.at) ? { ...tile, terrain: "GRASS" as const } : tile,
      ),
    },
  });
}

function candyActionArena(role: UnitRoleId): GameStateV6 {
  const base = arena();
  const at = centerOfOpenTriple(base);
  return addEntities(base, [
    { owner: "OWN", role, at, hp: effectiveRoleRuleV6("CANDY", role).maxHp },
  ]);
}

function donutArena(): GameStateV6 {
  const base = arena();
  const run = openHorizontal(base, 4);
  const donutAt = must(run[0]);
  const friendlyAt = must(run[1]);
  const hostileAt = must(run[2]);
  const wallAt = must(run[3]);
  let state = addEntities(base, [
    { owner: "OWN", role: "RAIDER", at: donutAt, hp: 10 },
    { owner: "OWN", role: "FIGHTER", at: friendlyAt, hp: 8 },
    { owner: "ENEMY", role: "GUARD", at: hostileAt, hp: 15 },
  ]);
  state = checked({
    ...state,
    nextEntityId: state.nextEntityId + 1,
    chocolateWalls: [
      {
        id: wallId(state.nextEntityId),
        ownerId: enemyPlayer(state).id,
        at: wallAt,
        hp: 10,
      },
    ],
  });
  return state;
}

function candifyEconomyArena(): GameStateV6 {
  const base = arena();
  const own = ownCity(base);
  const enemy = enemyCity(base);
  const target = must(
    base.board.tiles.find(
      (tile) =>
        tile.site === null &&
        chebyshev(tile.at, own.at) === 2 &&
        base.board.tiles.some(
          (neighbor) =>
            neighbor.territoryCityId === own.id &&
            chebyshev(neighbor.at, tile.at) === 1,
        ),
    ),
  ).at;
  const contributionId = base.nextEntityId;
  const unitEntityId = contributionId + 1;
  return checked({
    ...base,
    nextEntityId: unitEntityId + 1,
    board: {
      ...base.board,
      tiles: base.board.tiles.map((tile) =>
        same(tile.at, target)
          ? {
              ...tile,
              terrain: "GRASS" as const,
              resource: null,
              improvement: "FARM" as const,
              territoryCityId: enemy.id,
            }
          : tile,
      ),
    },
    cities: base.cities.map((city) =>
      city.id === own.id
        ? { ...city, expanded: true }
        : city.id === enemy.id
          ? {
              ...city,
              level: 2,
              economicPopulation: 2,
              population: 0,
            }
          : city,
    ),
    populationContributions: [
      {
        id: contributionId,
        cityId: enemy.id,
        category: "LIVE",
        amount: 2,
        source: { kind: "IMPROVEMENT", improvement: "FARM", at: target },
      },
    ],
    units: [makeUnit(base, unitEntityId, "OWN", "HEAVY", target, 15)],
  });
}

function neutralCandifyArena(
  role: UnitRoleId,
  expanded: boolean,
  distance: 1 | 2,
): GameStateV6 {
  const base = arena();
  const city = ownCity(base);
  const target = must(
    base.board.tiles.find(
      (tile) =>
        tile.site === null &&
        chebyshev(tile.at, city.at) === distance &&
        base.board.tiles.some(
          (neighbor) =>
            neighbor.territoryCityId === city.id &&
            chebyshev(neighbor.at, tile.at) === 1,
        ),
    ),
  ).at;
  return checked({
    ...base,
    nextEntityId: base.nextEntityId + 1,
    board: {
      ...base.board,
      tiles: base.board.tiles.map((tile) =>
        same(tile.at, target)
          ? { ...tile, improvement: null, territoryCityId: null }
          : tile,
      ),
    },
    cities: base.cities.map((candidate) =>
      candidate.id === city.id ? { ...candidate, expanded } : candidate,
    ),
    units: [
      makeUnit(
        base,
        base.nextEntityId,
        "OWN",
        role,
        target,
        effectiveRoleRuleV6("CANDY", role).maxHp,
      ),
    ],
  });
}

function cooperativeActionArena(role: "FIGHTER" | "GUARD"): {
  readonly state: GameStateV6;
  readonly actor: GameStateV6["players"][number]["id"];
  readonly target: CoordV6;
} {
  const cooperativeSetup: MatchSetupV6 = {
    ...setup,
    seed: 6_010,
    width: 14,
    height: 14,
    aiCount: 2,
    aiMode: "COOPERATIVE",
    factions: ["ORIGINAL", "CANDY", "ORIGINAL"],
  };
  const base = arenaFor(cooperativeSetup);
  const actor = must(
    base.players.find(
      (player) => player.controller === "AI" && player.faction === "CANDY",
    ),
  );
  const ally = must(
    base.players.find(
      (player) =>
        player.controller === "AI" &&
        player.id !== actor.id &&
        player.faction === "ORIGINAL",
    ),
  );
  const actorCity = must(base.cities.find((city) => city.ownerId === actor.id));
  const allyCity = must(base.cities.find((city) => city.ownerId === ally.id));
  const target = must(
    base.board.tiles.find(
      (tile) => tile.site === null && chebyshev(tile.at, actorCity.at) === 1,
    ),
  ).at;
  const state = checked({
    ...base,
    activeSeatIndex: base.turnOrder.indexOf(actor.id),
    nextEntityId: base.nextEntityId + 1,
    board: {
      ...base.board,
      tiles: base.board.tiles.map((tile) =>
        same(tile.at, target)
          ? { ...tile, improvement: null, territoryCityId: allyCity.id }
          : tile,
      ),
    },
    units: [
      makeUnitForOwner(
        base,
        base.nextEntityId,
        actor.id,
        role,
        role === "GUARD" ? actorCity.at : target,
        effectiveRoleRuleV6("CANDY", role).maxHp,
      ),
    ],
  });
  if (role === "GUARD") {
    const engineer = must(state.units[0]);
    const adjacentTarget = must(
      state.board.tiles.find(
        (tile) =>
          tile.site === null &&
          tile.territoryCityId === allyCity.id &&
          chebyshev(tile.at, engineer.at) === 1,
      ),
    ).at;
    return { state, actor: actor.id, target: adjacentTarget };
  }
  return { state, actor: actor.id, target };
}

function disconnectingCandifyArena(): GameStateV6 {
  const base = arena();
  const run = must(
    Array.from({ length: base.board.height - 2 }, (_value, index) => index + 1)
      .flatMap((y) =>
        Array.from(
          { length: base.board.width - 4 },
          (_inner, index) => index + 1,
        ).map(
          (x) =>
            [
              tileAt(base, { x, y }),
              tileAt(base, { x: x + 1, y }),
              tileAt(base, { x: x + 2, y }),
              tileAt(base, { x: x + 1, y: y + 1 }),
            ] as const,
        ),
      )
      .find((tiles) => tiles.every((tile) => tile.site === null)),
  );
  const [enemyAtTile, targetTile, tailTile, ownAtTile] = run;
  const own = ownCity(base);
  const enemy = enemyCity(base);
  const cities = base.cities.map((city) =>
    city.id === own.id
      ? { ...city, at: ownAtTile.at, expanded: false }
      : city.id === enemy.id
        ? { ...city, at: enemyAtTile.at, expanded: false }
        : city,
  );
  const board = {
    ...base.board,
    tiles: base.board.tiles.map((tile) => {
      const cleared =
        tile.territoryCityId === own.id || tile.territoryCityId === enemy.id
          ? { ...tile, territoryCityId: null }
          : tile;
      if (same(tile.at, ownAtTile.at)) {
        return {
          ...cleared,
          terrain: "GRASS" as const,
          resource: null,
          improvement: null,
          road: false,
          site: "CITY" as const,
          territoryCityId: own.id,
        };
      }
      if (same(tile.at, enemyAtTile.at)) {
        return {
          ...cleared,
          terrain: "GRASS" as const,
          resource: null,
          improvement: null,
          road: false,
          site: "CITY" as const,
          territoryCityId: enemy.id,
        };
      }
      if (same(tile.at, targetTile.at) || same(tile.at, tailTile.at)) {
        return { ...cleared, site: null, territoryCityId: enemy.id };
      }
      return cleared;
    }),
  };
  return checked({
    ...base,
    nextEntityId: base.nextEntityId + 1,
    board,
    cities,
    units: [
      makeUnit(base, base.nextEntityId, "OWN", "FIGHTER", targetTile.at, 10),
    ],
  });
}

function nearestCandifyArena(): {
  readonly state: GameStateV6;
  readonly unit: UnitStateV6;
  readonly nearest: GameStateV6["cities"][number];
} {
  const base = arena();
  const [nearAt, targetAt, farTerritoryAt, farAt] = openHorizontal(base, 4);
  const first = must(base.cities[0]);
  const second = must(base.cities[1]);
  const cities = base.cities.map((city) =>
    city.id === first.id
      ? {
          ...city,
          ownerId: base.humanPlayerId,
          at: must(nearAt),
          expanded: true,
        }
      : {
          ...city,
          ownerId: base.humanPlayerId,
          at: must(farAt),
          expanded: true,
          isCapital: false,
        },
  );
  const board = {
    ...base.board,
    tiles: base.board.tiles.map((tile) => {
      const cleared =
        tile.territoryCityId === first.id || tile.territoryCityId === second.id
          ? { ...tile, territoryCityId: null }
          : tile;
      if (same(tile.at, must(nearAt))) {
        return {
          ...cleared,
          terrain: "GRASS" as const,
          resource: null,
          improvement: null,
          road: false,
          site: "CITY" as const,
          territoryCityId: first.id,
        };
      }
      if (same(tile.at, must(farAt)) || same(tile.at, must(farTerritoryAt))) {
        return {
          ...cleared,
          ...(same(tile.at, must(farAt))
            ? {
                terrain: "GRASS" as const,
                resource: null,
                improvement: null,
                road: false,
                site: "CITY" as const,
              }
            : { site: null }),
          territoryCityId: second.id,
        };
      }
      if (same(tile.at, must(targetAt))) {
        return { ...cleared, site: null, territoryCityId: null };
      }
      return cleared;
    }),
  };
  const unit = makeUnit(
    base,
    base.nextEntityId,
    "OWN",
    "FIGHTER",
    must(targetAt),
    10,
  );
  const state = checked({
    ...base,
    nextEntityId: base.nextEntityId + 1,
    board,
    cities,
    units: [unit],
  });
  return {
    state,
    unit: must(state.units.find((candidate) => candidate.id === unit.id)),
    nearest: must(state.cities.find((city) => city.id === first.id)),
  };
}

function outsideFootprintArena(): GameStateV6 {
  const base = arena();
  const own = ownCity(base);
  const enemy = enemyCity(base);
  const target = must(
    base.board.tiles.find(
      (tile) => tile.site === null && chebyshev(tile.at, own.at) === 3,
    ),
  ).at;
  return checked({
    ...base,
    nextEntityId: base.nextEntityId + 1,
    board: {
      ...base.board,
      tiles: base.board.tiles.map((tile) =>
        same(tile.at, target) ? { ...tile, territoryCityId: enemy.id } : tile,
      ),
    },
    units: [makeUnit(base, base.nextEntityId, "OWN", "HEAVY", target, 15)],
  });
}

function tiedCandifyArena(): GameStateV6 {
  const base = arena();
  const run = openHorizontal(base, 3);
  const left = must(run[0]);
  const target = must(run[1]);
  const right = must(run[2]);
  const wallAt = must(
    base.board.tiles.find(
      (tile) =>
        tile.site === null &&
        !same(tile.at, left) &&
        !same(tile.at, target) &&
        !same(tile.at, right),
    ),
  ).at;
  const [first, second] = base.cities;
  if (first === undefined || second === undefined)
    throw new Error("Missing cities");
  const owner = base.humanPlayerId;
  const cities = base.cities.map((city) =>
    city.id === first.id
      ? { ...city, ownerId: owner, at: left, expanded: true }
      : city.id === second.id
        ? {
            ...city,
            ownerId: owner,
            at: right,
            expanded: true,
            isCapital: false,
          }
        : city,
  );
  return checked({
    ...base,
    nextEntityId: base.nextEntityId + 2,
    cities,
    board: {
      ...base.board,
      tiles: base.board.tiles.map((tile) =>
        same(tile.at, left)
          ? {
              ...tile,
              terrain: "GRASS" as const,
              resource: null,
              improvement: null,
              road: false,
              site: "CITY" as const,
              territoryCityId: first.id,
            }
          : same(tile.at, right)
            ? {
                ...tile,
                terrain: "GRASS" as const,
                resource: null,
                improvement: null,
                road: false,
                site: "CITY" as const,
                territoryCityId: second.id,
              }
            : same(tile.at, target)
              ? { ...tile, territoryCityId: null }
              : tile,
      ),
    },
    units: [makeUnit(base, base.nextEntityId, "OWN", "FIGHTER", target, 10)],
    chocolateWalls: [
      {
        id: wallId(base.nextEntityId + 1),
        ownerId: base.humanPlayerId,
        at: wallAt,
        hp: 7,
      },
    ],
  });
}

function rewardState(level: 3 | 5): GameStateV6 {
  const base = arena();
  const city = ownCity(base);
  const population = -((level * (level + 1)) / 2 - 1);
  const candidates =
    level === 3
      ? (["WALLS", "MILITIA"] as const)
      : (["JUGGERNAUT", "TREASURY"] as const);
  return checked({
    ...base,
    cities: base.cities.map((candidate) =>
      candidate.id === city.id
        ? { ...candidate, level, population }
        : candidate,
    ),
    pendingChoices: [
      { kind: "CITY_REWARD", cityId: city.id, reachedLevel: level, candidates },
    ],
  });
}

function addEntities(
  state: GameStateV6,
  specs: readonly {
    readonly owner: "OWN" | "ENEMY";
    readonly role: UnitRoleId;
    readonly at: CoordV6;
    readonly hp: number;
  }[],
): GameStateV6 {
  return checked({
    ...state,
    nextEntityId: state.nextEntityId + specs.length,
    units: specs.map((spec, index) =>
      makeUnit(
        state,
        state.nextEntityId + index,
        spec.owner,
        spec.role,
        spec.at,
        spec.hp,
      ),
    ),
  });
}

function makeUnit(
  state: GameStateV6,
  id: number,
  owner: "OWN" | "ENEMY",
  role: UnitRoleId,
  at: CoordV6,
  hp: number,
): UnitStateV6 {
  const ownerId = owner === "OWN" ? state.humanPlayerId : enemyPlayer(state).id;
  return makeUnitForOwner(state, id, ownerId, role, at, hp);
}

function makeUnitForOwner(
  state: GameStateV6,
  id: number,
  ownerId: GameStateV6["players"][number]["id"],
  role: UnitRoleId,
  at: CoordV6,
  hp: number,
): UnitStateV6 {
  const faction = must(
    state.players.find((player) => player.id === ownerId),
  ).faction;
  const maxHp = effectiveRoleRuleV6(faction, role).maxHp;
  return {
    id: unitId(id),
    ownerId,
    homeCityId: null,
    role,
    at,
    hp,
    maxHp,
    kills: 0,
    veteran: false,
    captureEligible: false,
    activation: FRESH,
  };
}

function withOwnPlayer(
  state: GameStateV6,
  values: Partial<GameStateV6["players"][number]>,
): GameStateV6 {
  return checked({
    ...state,
    players: state.players.map((player) =>
      player.id === state.humanPlayerId ? { ...player, ...values } : player,
    ),
  });
}

function withPlayerById(
  state: GameStateV6,
  playerId: GameStateV6["players"][number]["id"],
  values: Partial<GameStateV6["players"][number]>,
): GameStateV6 {
  return checked({
    ...state,
    players: state.players.map((player) =>
      player.id === playerId ? { ...player, ...values } : player,
    ),
  });
}

function openHorizontal(state: GameStateV6, length: number): CoordV6[] {
  for (let y = 1; y < state.board.height - 1; y += 1) {
    for (let x = 1; x <= state.board.width - length - 1; x += 1) {
      const cells = Array.from({ length }, (_value, index) =>
        tileAt(state, { x: x + index, y }),
      );
      if (cells.every((tile) => tile.site === null)) {
        return cells.map((tile) => tile.at);
      }
    }
  }
  throw new Error("No open horizontal run");
}

function centerOfOpenTriple(state: GameStateV6): CoordV6 {
  return must(openHorizontal(state, 3)[1]);
}

function adjacentOpen(state: GameStateV6, at: CoordV6): CoordV6 {
  return must(
    state.board.tiles.find(
      (tile) =>
        tile.site === null &&
        chebyshev(tile.at, at) === 1 &&
        !state.units.some((unit) => same(unit.at, tile.at)),
    ),
  ).at;
}

function pathToEdge(
  state: GameStateV6,
  start: CoordV6,
  direction: (typeof CARDINAL_DIRECTION_ORDER_V6)[number],
): readonly CoordV6[] {
  const delta =
    direction === "NORTH"
      ? { x: 0, y: -1 }
      : direction === "EAST"
        ? { x: 1, y: 0 }
        : direction === "SOUTH"
          ? { x: 0, y: 1 }
          : { x: -1, y: 0 };
  const path: CoordV6[] = [];
  for (
    let at = { x: start.x + delta.x, y: start.y + delta.y };
    at.x >= 0 &&
    at.y >= 0 &&
    at.x < state.board.width &&
    at.y < state.board.height;
    at = { x: at.x + delta.x, y: at.y + delta.y }
  ) {
    path.push(at);
  }
  return path;
}

function tileAt(state: GameStateV6, at: CoordV6) {
  return must(state.board.tiles[at.y * state.board.width + at.x]);
}

function ownPlayer(state: GameStateV6) {
  return must(
    state.players.find((player) => player.id === state.humanPlayerId),
  );
}

function enemyPlayer(state: GameStateV6) {
  return must(
    state.players.find((player) => player.id !== state.humanPlayerId),
  );
}

function ownCity(state: GameStateV6) {
  return must(
    state.cities.find((city) => city.ownerId === state.humanPlayerId),
  );
}

function enemyCity(state: GameStateV6) {
  return must(
    state.cities.find((city) => city.ownerId !== state.humanPlayerId),
  );
}

function ownUnit(state: GameStateV6, role: UnitRoleId) {
  return must(
    state.units.find(
      (unit) => unit.ownerId === state.humanPlayerId && unit.role === role,
    ),
  );
}

function enemyUnit(state: GameStateV6) {
  return must(state.units.find((unit) => unit.ownerId !== state.humanPlayerId));
}

function checked(input: GameStateV6): GameStateV6 {
  const parsed = parseGameStateV6(input);
  if (parsed === null) throw new Error("Invalid Candy test state");
  return parsed;
}

function expectRejected(
  result: ReturnType<typeof applyCommandV6>,
  state: GameStateV6,
  code: string,
): void {
  expect(result.accepted).toBe(false);
  if (result.accepted) return;
  expect(result.error.code).toBe(code);
  expect(result.state).toBe(state);
  expect(result.events).toEqual([]);
}

function withoutCandify(abilities: readonly string[]): readonly string[] {
  return abilities.filter(
    (ability) => ability !== "CANDIFY" && ability !== "BUILD_CHOCOLATE_WALL",
  );
}

function chebyshev(left: CoordV6, right: CoordV6): number {
  return Math.max(Math.abs(left.x - right.x), Math.abs(left.y - right.y));
}

function same(left: CoordV6, right: CoordV6): boolean {
  return left.x === right.x && left.y === right.y;
}

function must<T>(value: T | undefined | null): T {
  if (value === undefined || value === null)
    throw new Error("Missing fixture value");
  return value;
}
