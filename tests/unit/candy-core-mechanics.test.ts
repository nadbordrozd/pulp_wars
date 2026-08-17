import { describe, expect, it } from "vitest";
import {
  applyCommand,
  canonicalHash,
  effectiveUnitLabel,
  effectiveUnitRule,
  previewCombat,
  queryPlayerCommands,
  viewFor,
  wallId,
  unitId,
  type GameState,
  type UnitActivation,
  type UnitState,
} from "../../src/engine/index";
import { gameStateBuilder, setupBuilder } from "../fixtures/builders";

const fresh = (): UnitActivation => ({
  moved: false,
  attacked: false,
  recovered: false,
  captured: false,
  handled: false,
  escapeAvailable: false,
  specialActed: false,
});

function candyArena(type: UnitState["type"]): {
  state: GameState;
  actor: UnitState;
  humanId: GameState["humanPlayerId"];
  enemyId: GameState["humanPlayerId"];
} {
  const base = gameStateBuilder(
    setupBuilder({ factions: ["CANDY", "ORIGINAL"] }),
  );
  const human = base.players.find((player) => player.controller === "HUMAN");
  if (human === undefined) throw new Error("Missing Candy human");
  const enemy = base.players.find((player) => player.id !== human.id);
  const source = base.units.find((unit) => unit.ownerId === human.id);
  if (enemy === undefined || source === undefined)
    throw new Error("Missing Candy arena entities");
  const rule = effectiveUnitRule(base.rulesetId, "CANDY", type);
  const actor: UnitState = {
    ...source,
    type,
    at: { x: 2, y: 5 },
    hp: rule.maxHp,
    maxHp: rule.maxHp,
    ready: true,
    captureEligible: false,
    activation: fresh(),
  };
  return {
    actor,
    humanId: human.id,
    enemyId: enemy.id,
    state: {
      ...base,
      activeSeatIndex: base.turnOrder.indexOf(human.id),
      players: base.players.map((player) =>
        player.id === human.id
          ? { ...player, stars: 20, explored: [{ x: 2, y: 5 }] }
          : player,
      ),
      units: [actor],
      chocolateWalls: [],
    },
  };
}

function cloneUnit(
  source: UnitState,
  id: number,
  ownerId: UnitState["ownerId"],
  at: UnitState["at"],
  hp: number,
): UnitState {
  return {
    ...source,
    id: unitId(id),
    ownerId,
    homeCityId: null,
    capacityExempt: true,
    at,
    hp,
    maxHp: Math.max(10, hp),
    ready: true,
    activation: fresh(),
  };
}

describe("Candy effective roster", () => {
  it("keeps Warrior and Archer parity while replacing Rider mechanics and labels", () => {
    const base = gameStateBuilder();
    expect(effectiveUnitRule(base.rulesetId, "CANDY", "WARRIOR")).toEqual(
      effectiveUnitRule(base.rulesetId, "ORIGINAL", "WARRIOR"),
    );
    expect(effectiveUnitRule(base.rulesetId, "CANDY", "ARCHER")).toEqual(
      effectiveUnitRule(base.rulesetId, "ORIGINAL", "ARCHER"),
    );
    expect(effectiveUnitRule(base.rulesetId, "CANDY", "RIDER")).toMatchObject({
      cost: 3,
      maxHp: 10,
      attack: 0,
      defense: 1,
      move: 1,
      range: 0,
      abilities: ["FORTIFY"],
    });
    expect([
      effectiveUnitLabel("CANDY", "WARRIOR"),
      effectiveUnitLabel("CANDY", "ARCHER"),
      effectiveUnitLabel("CANDY", "DEFENDER"),
      effectiveUnitLabel("CANDY", "RIDER"),
    ]).toEqual(["Candy Warrior", "Gumball Guard", "Choco Engineer", "Donut"]);
  });

  it("enumerates Donut move-one and four safe-information Roll intents, never Attack or Escape", () => {
    const arena = candyArena("RIDER");
    const view = viewFor(arena.state, arena.humanId);
    const commands = queryPlayerCommands(view).map(({ command }) => command);
    expect(
      commands.filter((command) => command.kind === "KAMIKAZE_ROLL"),
    ).toEqual(
      ["NORTH", "WEST", "EAST", "SOUTH"].map((direction) => ({
        kind: "KAMIKAZE_ROLL",
        unitId: arena.actor.id,
        direction,
      })),
    );
    expect(commands.some((command) => command.kind === "ATTACK")).toBe(false);
    expect(commands.some((command) => command.kind === "ESCAPE_MOVE")).toBe(
      false,
    );
    expect(
      commands
        .filter((command) => command.kind === "MOVE")
        .every(
          (command) => command.kind !== "MOVE" || command.path.length === 1,
        ),
    ).toBe(true);
  });
});

describe("Kamikaze Roll", () => {
  it.each([
    ["NORTH", { x: 5, y: 4 }, { x: 5, y: 0 }],
    ["EAST", { x: 6, y: 5 }, { x: 10, y: 5 }],
    ["SOUTH", { x: 5, y: 6 }, { x: 5, y: 10 }],
    ["WEST", { x: 4, y: 5 }, { x: 0, y: 5 }],
  ] as const)(
    "traverses the exact %s cardinal path through its edge cell",
    (direction, first, last) => {
      const arena = candyArena("RIDER");
      const state: GameState = {
        ...arena.state,
        units: [{ ...arena.actor, at: { x: 5, y: 5 } }],
      };
      const result = applyCommand(state, {
        kind: "KAMIKAZE_ROLL",
        unitId: arena.actor.id,
        direction,
      });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      const steps = result.events
        .filter((event) => event.kind === "DONUT_ROLL_STEP")
        .map((event) => event.at);
      expect(steps).toHaveLength(5);
      expect(steps[0]).toEqual(first);
      expect(steps.at(-1)).toEqual(last);
      expect(steps).not.toContainEqual({ x: 5, y: 5 });
      expect(result.state.units).toEqual([]);
    },
  );

  it("reveals only traversed cells and resolves fixed damage/deaths strictly in travel order", () => {
    const arena = candyArena("RIDER");
    const friendly = cloneUnit(
      arena.actor,
      arena.state.nextEntityId,
      arena.humanId,
      { x: 3, y: 5 },
      10,
    );
    const promoted = cloneUnit(
      arena.actor,
      arena.state.nextEntityId + 1,
      arena.enemyId,
      { x: 4, y: 5 },
      15,
    );
    const hostile = cloneUnit(
      arena.actor,
      arena.state.nextEntityId + 2,
      arena.enemyId,
      { x: 6, y: 5 },
      10,
    );
    const wallAt = { x: 5, y: 5 };
    const state: GameState = {
      ...arena.state,
      nextEntityId: arena.state.nextEntityId + 4,
      board: {
        ...arena.state.board,
        tiles: arena.state.board.tiles.map((tile) =>
          tile.at.x === wallAt.x && tile.at.y === wallAt.y
            ? { ...tile, site: null }
            : tile,
        ),
      },
      units: [arena.actor, friendly, promoted, hostile],
      chocolateWalls: [
        {
          id: wallId(arena.state.nextEntityId + 3),
          ownerId: arena.humanId,
          at: wallAt,
          hp: 10,
        },
      ],
    };
    const beforeHash = canonicalHash(state);
    const result = applyCommand(state, {
      kind: "KAMIKAZE_ROLL",
      unitId: arena.actor.id,
      direction: "EAST",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.random).toEqual(state.random);
    expect(result.state.commandIndex).toBe(state.commandIndex + 1);
    expect(canonicalHash(state)).toBe(beforeHash);
    expect(result.state.units.map((unit) => [unit.id, unit.hp])).toEqual([
      [promoted.id, 5],
    ]);
    expect(result.state.chocolateWalls).toEqual([]);
    expect(
      result.events
        .filter((event) => event.kind === "DONUT_ROLL_STEP")
        .map((event) => event.at),
    ).toEqual(
      Array.from({ length: 8 }, (_, index) => ({ x: index + 3, y: 5 })),
    );
    expect(
      result.events
        .filter((event) => event.kind === "ROLL_DAMAGE_RESOLVED")
        .map((event) => [event.target.kind, event.hpBefore, event.hpAfter]),
    ).toEqual([
      ["UNIT", 10, 0],
      ["UNIT", 15, 5],
      ["CHOCOLATE_WALL", 10, 0],
      ["UNIT", 10, 0],
    ]);
    expect(
      result.events
        .filter((event) => event.kind === "UNIT_DIED")
        .map((event) => [event.unitId, event.cause]),
    ).toEqual([
      [friendly.id, "KAMIKAZE_ROLL"],
      [hostile.id, "KAMIKAZE_ROLL"],
      [arena.actor.id, "KAMIKAZE_ROLL_SELF"],
    ]);
    const playerAfter = result.state.players.find(
      (player) => player.id === arena.humanId,
    );
    if (playerAfter === undefined) throw new Error("Missing rolling player");
    const explored = playerAfter.explored;
    expect(explored).toContainEqual({ x: 10, y: 5 });
    expect(explored).not.toContainEqual({ x: 10, y: 4 });
  });

  it("uses the frozen rejection order and preserves byte-identical state", () => {
    const arena = candyArena("WARRIOR");
    const invalidType = applyCommand(arena.state, {
      kind: "KAMIKAZE_ROLL",
      unitId: arena.actor.id,
      direction: "EAST",
    });
    expect(invalidType).toEqual({
      ok: false,
      state: arena.state,
      error: { code: "UNIT_TYPE_INVALID", params: { expected: "CANDY_DONUT" } },
    });
    const donut = candyArena("RIDER");
    const acted: GameState = {
      ...donut.state,
      units: [
        {
          ...donut.actor,
          at: { x: 0, y: 0 },
          activation: { ...fresh(), moved: true },
        },
      ],
    };
    expect(
      applyCommand(acted, {
        kind: "KAMIKAZE_ROLL",
        unitId: donut.actor.id,
        direction: "NORTH",
      }),
    ).toMatchObject({
      ok: false,
      state: acted,
      error: { code: "UNIT_ALREADY_ACTED" },
    });
    const edge: GameState = {
      ...donut.state,
      units: [{ ...donut.actor, at: { x: 0, y: 0 } }],
    };
    expect(
      applyCommand(edge, {
        kind: "KAMIKAZE_ROLL",
        unitId: donut.actor.id,
        direction: "NORTH",
      }),
    ).toMatchObject({
      ok: false,
      state: edge,
      error: { code: "ROLL_DIRECTION_INVALID" },
    });
  });

  it("keeps Roll available after Wait while each outward edge direction is rejected", () => {
    const arena = candyArena("RIDER");
    const waited = applyCommand(arena.state, {
      kind: "WAIT",
      unitId: arena.actor.id,
    });
    expect(waited.ok).toBe(true);
    if (!waited.ok) return;
    expect(
      applyCommand(waited.state, {
        kind: "KAMIKAZE_ROLL",
        unitId: arena.actor.id,
        direction: "EAST",
      }).ok,
    ).toBe(true);

    for (const [at, direction] of [
      [{ x: 5, y: 0 }, "NORTH"],
      [{ x: 10, y: 5 }, "EAST"],
      [{ x: 5, y: 10 }, "SOUTH"],
      [{ x: 0, y: 5 }, "WEST"],
    ] as const) {
      const state: GameState = {
        ...arena.state,
        units: [{ ...arena.actor, at }],
      };
      expect(
        applyCommand(state, {
          kind: "KAMIKAZE_ROLL",
          unitId: arena.actor.id,
          direction,
        }),
      ).toMatchObject({
        ok: false,
        state,
        error: { code: "ROLL_DIRECTION_INVALID", params: { direction } },
      });
    }
  });
});

describe("Choco Engineer and Chocolate Walls", () => {
  it.each([
    ["plain Grass", "GRASS", null, null],
    ["Fruit", "GRASS", "FRUIT", null],
    ["Ore", "MOUNTAIN", "ORE", null],
    ["Animal", "FOREST", "ANIMAL", null],
    ["Mine", "MOUNTAIN", null, "MINE"],
    ["Lumber Mill", "FOREST", null, "LUMBER_MILL"],
  ] as const)(
    "builds without altering allowed %s terrain content",
    (_label, terrain, resource, improvement) => {
      const arena = candyArena("DEFENDER");
      const at = { x: 3, y: 5 };
      const state: GameState = {
        ...arena.state,
        players: arena.state.players.map((player) =>
          player.id === arena.humanId
            ? { ...player, stars: 1, explored: [arena.actor.at, at] }
            : player,
        ),
        board: {
          ...arena.state.board,
          tiles: arena.state.board.tiles.map((tile) =>
            same(tile.at, at)
              ? { ...tile, terrain, resource, improvement, site: null }
              : tile,
          ),
        },
      };
      const result = applyCommand(state, {
        kind: "BUILD_CHOCOLATE_WALL",
        unitId: arena.actor.id,
        at,
      });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(
        result.state.board.tiles.find((tile) => same(tile.at, at)),
      ).toMatchObject({ terrain, resource, improvement, site: null });
    },
  );

  it("builds on a resource tile for one star, exhausts the Engineer, and exposes only explored walls", () => {
    const arena = candyArena("DEFENDER");
    const at = { x: 3, y: 5 };
    const state: GameState = {
      ...arena.state,
      players: arena.state.players.map((player) =>
        player.id === arena.humanId
          ? { ...player, stars: 1, explored: [arena.actor.at, at] }
          : player,
      ),
      board: {
        ...arena.state.board,
        tiles: arena.state.board.tiles.map((tile) =>
          same(tile.at, at)
            ? {
                ...tile,
                terrain: "FOREST",
                resource: "ANIMAL",
                improvement: null,
                site: null,
              }
            : tile,
        ),
      },
    };
    const result = applyCommand(state, {
      kind: "BUILD_CHOCOLATE_WALL",
      unitId: arena.actor.id,
      at,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(
      result.state.players.find((player) => player.id === arena.humanId)?.stars,
    ).toBe(0);
    expect(
      result.state.board.tiles.find((tile) => same(tile.at, at)),
    ).toMatchObject({ terrain: "FOREST", resource: "ANIMAL" });
    expect(result.state.chocolateWalls).toEqual([
      { id: wallId(state.nextEntityId), ownerId: arena.humanId, at, hp: 10 },
    ]);
    expect(result.state.units[0]).toMatchObject({
      ready: false,
      activation: { handled: true, specialActed: true },
    });
    expect(viewFor(result.state, arena.humanId).chocolateWalls).toMatchObject([
      { kind: "CHOCOLATE_WALL", maxHp: 10 },
    ]);
    const hiddenEnemy = result.state.players.find(
      (player) => player.id === arena.enemyId,
    );
    if (hiddenEnemy === undefined) throw new Error("Missing hidden enemy");
    expect(
      viewFor(
        {
          ...result.state,
          players: result.state.players.map((player) =>
            player.id === hiddenEnemy.id ? { ...player, explored: [] } : player,
          ),
        },
        hiddenEnemy.id,
      ).chocolateWalls,
    ).toEqual([]);
  });

  it("blocks ordinary occupancy and accepts attacks on owned walls with zero defense or retaliation", () => {
    const arena = candyArena("WARRIOR");
    const at = { x: 3, y: 5 };
    const state: GameState = {
      ...arena.state,
      nextEntityId: arena.state.nextEntityId + 1,
      players: arena.state.players.map((player) =>
        player.id === arena.humanId
          ? { ...player, explored: [arena.actor.at, at] }
          : player,
      ),
      board: {
        ...arena.state.board,
        tiles: arena.state.board.tiles.map((tile) =>
          same(tile.at, at) ? { ...tile, site: null } : tile,
        ),
      },
      chocolateWalls: [
        {
          id: wallId(arena.state.nextEntityId),
          ownerId: arena.humanId,
          at,
          hp: 10,
        },
      ],
    };
    expect(
      queryPlayerCommands(viewFor(state, arena.humanId)).some(({ command }) => {
        const destination =
          command.kind === "MOVE" ? command.path.at(-1) : undefined;
        return destination !== undefined && same(destination, at);
      }),
    ).toBe(false);
    const target = {
      kind: "CHOCOLATE_WALL" as const,
      wallId: wallId(arena.state.nextEntityId),
    };
    expect(previewCombat(state, arena.actor.id, target)).toMatchObject({
      ok: true,
      preview: {
        target,
        damageToDefender: 9,
        damageToAttacker: 0,
        defenderDies: false,
        advances: false,
        noRetaliationReason: "STRUCTURE",
      },
    });
    const hit = applyCommand(state, {
      kind: "ATTACK",
      unitId: arena.actor.id,
      target,
    });
    expect(hit.ok).toBe(true);
    if (!hit.ok) return;
    expect(hit.state.chocolateWalls[0]?.hp).toBe(1);
    expect(hit.events.map((event) => event.kind)).toEqual(["COMBAT_RESOLVED"]);
    const wall = state.chocolateWalls[0];
    if (wall === undefined) throw new Error("Missing Chocolate Wall");
    const fragile: GameState = {
      ...state,
      chocolateWalls: [{ ...wall, hp: 9 }],
    };
    const destroyed = applyCommand(fragile, {
      kind: "ATTACK",
      unitId: arena.actor.id,
      target,
    });
    expect(destroyed.ok).toBe(true);
    if (!destroyed.ok) return;
    expect(destroyed.state.chocolateWalls).toEqual([]);
    expect(destroyed.state.units[0]?.at).toEqual(at);
    expect(destroyed.events.map((event) => event.kind)).toEqual([
      "COMBAT_RESOLVED",
      "CHOCOLATE_WALL_DESTROYED",
      "UNIT_MOVED",
      "TILES_REVEALED",
    ]);
  });

  it("keeps Build available after Wait", () => {
    const arena = candyArena("DEFENDER");
    const at = { x: 3, y: 5 };
    const state: GameState = {
      ...arena.state,
      players: arena.state.players.map((player) =>
        player.id === arena.humanId
          ? { ...player, explored: [arena.actor.at, at] }
          : player,
      ),
      board: {
        ...arena.state.board,
        tiles: arena.state.board.tiles.map((tile) =>
          same(tile.at, at) ? { ...tile, site: null } : tile,
        ),
      },
    };
    const waited = applyCommand(state, {
      kind: "WAIT",
      unitId: arena.actor.id,
    });
    expect(waited.ok).toBe(true);
    if (!waited.ok) return;
    expect(
      applyCommand(waited.state, {
        kind: "BUILD_CHOCOLATE_WALL",
        unitId: arena.actor.id,
        at,
      }).ok,
    ).toBe(true);
  });

  it("uses the frozen tile/order gates before charging the final star", () => {
    const arena = candyArena("DEFENDER");
    const adjacent = { x: 3, y: 5 };
    const far = { x: 8, y: 8 };
    const base: GameState = {
      ...arena.state,
      players: arena.state.players.map((player) =>
        player.id === arena.humanId
          ? { ...player, stars: 0, explored: [arena.actor.at] }
          : player,
      ),
      board: {
        ...arena.state.board,
        tiles: arena.state.board.tiles.map((tile) =>
          same(tile.at, adjacent) || same(tile.at, far)
            ? { ...tile, site: null }
            : tile,
        ),
      },
    };
    expect(
      applyCommand(base, {
        kind: "BUILD_CHOCOLATE_WALL",
        unitId: arena.actor.id,
        at: { x: -1, y: -1 },
      }),
    ).toMatchObject({
      ok: false,
      state: base,
      error: { code: "TILE_NOT_FOUND" },
    });
    expect(
      applyCommand(base, {
        kind: "BUILD_CHOCOLATE_WALL",
        unitId: arena.actor.id,
        at: far,
      }),
    ).toMatchObject({
      ok: false,
      state: base,
      error: { code: "TILE_UNEXPLORED" },
    });
    const explored: GameState = {
      ...base,
      players: base.players.map((player) =>
        player.id === arena.humanId
          ? { ...player, explored: [arena.actor.at, adjacent, far] }
          : player,
      ),
    };
    expect(
      applyCommand(explored, {
        kind: "BUILD_CHOCOLATE_WALL",
        unitId: arena.actor.id,
        at: far,
      }),
    ).toMatchObject({
      ok: false,
      state: explored,
      error: { code: "WALL_TARGET_NOT_ADJACENT" },
    });
    const occupied: GameState = {
      ...explored,
      units: [
        arena.actor,
        cloneUnit(
          arena.actor,
          explored.nextEntityId,
          arena.enemyId,
          adjacent,
          10,
        ),
      ],
      nextEntityId: explored.nextEntityId + 1,
    };
    expect(
      applyCommand(occupied, {
        kind: "BUILD_CHOCOLATE_WALL",
        unitId: arena.actor.id,
        at: adjacent,
      }),
    ).toMatchObject({
      ok: false,
      state: occupied,
      error: { code: "WALL_INVALID_TILE" },
    });
    expect(
      applyCommand(explored, {
        kind: "BUILD_CHOCOLATE_WALL",
        unitId: arena.actor.id,
        at: adjacent,
      }),
    ).toMatchObject({
      ok: false,
      state: explored,
      error: { code: "INSUFFICIENT_STARS", params: { cost: 1 } },
    });
  });

  it("permits attacking an allied wall but forbids building in allied AI territory before the star gate", () => {
    const base = gameStateBuilder(
      setupBuilder({
        aiCount: 2,
        width: 14,
        height: 14,
        aiMode: "COOPERATIVE",
        factions: ["ORIGINAL", "CANDY", "CANDY"],
      }),
    );
    const [actorOwner, wallOwner] = base.players.filter(
      (player) => player.controller === "AI",
    );
    const actorSource = base.units.find(
      (unit) => unit.ownerId === actorOwner?.id,
    );
    const alliedCity = base.cities.find(
      (city) => city.ownerId === wallOwner?.id,
    );
    if (
      actorOwner === undefined ||
      wallOwner === undefined ||
      actorSource === undefined ||
      alliedCity === undefined
    )
      throw new Error("Missing cooperative Candy fixture");
    const wallTile = base.board.tiles.find(
      (tile) =>
        tile.territoryCityId === alliedCity.id &&
        tile.site === null &&
        tile.at.x > 0,
    );
    if (wallTile === undefined) throw new Error("Missing allied wall tile");
    const actorAt = { x: wallTile.at.x - 1, y: wallTile.at.y };
    const actor: UnitState = {
      ...actorSource,
      type: "WARRIOR",
      at: actorAt,
      hp: 10,
      maxHp: 10,
      ready: true,
      activation: fresh(),
    };
    const target = {
      kind: "CHOCOLATE_WALL" as const,
      wallId: wallId(base.nextEntityId),
    };
    const state: GameState = {
      ...base,
      activeSeatIndex: base.turnOrder.indexOf(actorOwner.id),
      nextEntityId: base.nextEntityId + 1,
      players: base.players.map((player) =>
        player.id === actorOwner.id
          ? { ...player, stars: 0, explored: [actorAt, wallTile.at] }
          : player,
      ),
      units: [actor],
      chocolateWalls: [
        {
          id: target.wallId,
          ownerId: wallOwner.id,
          at: wallTile.at,
          hp: 9,
        },
      ],
    };
    expect(previewCombat(state, actor.id, target)).toMatchObject({
      ok: true,
      preview: { defenderDies: true, advances: false },
    });
    expect(
      queryPlayerCommands(viewFor(state, actorOwner.id)).some(
        ({ command }) =>
          command.kind === "ATTACK" &&
          command.target.kind === "CHOCOLATE_WALL" &&
          command.target.wallId === target.wallId,
      ),
    ).toBe(true);
    const attacked = applyCommand(state, {
      kind: "ATTACK",
      unitId: actor.id,
      target,
    });
    expect(attacked.ok).toBe(true);
    if (!attacked.ok) return;
    expect(attacked.state.chocolateWalls).toEqual([]);
    expect(attacked.state.units[0]?.at).toEqual(actorAt);

    const engineerState: GameState = {
      ...state,
      units: [{ ...actor, type: "DEFENDER" }],
    };
    expect(
      applyCommand(engineerState, {
        kind: "BUILD_CHOCOLATE_WALL",
        unitId: actor.id,
        at: wallTile.at,
      }),
    ).toMatchObject({
      ok: false,
      state: engineerState,
      error: { code: "WALL_INVALID_TILE" },
    });
    const noWall: GameState = { ...engineerState, chocolateWalls: [] };
    expect(
      applyCommand(noWall, {
        kind: "BUILD_CHOCOLATE_WALL",
        unitId: actor.id,
        at: wallTile.at,
      }),
    ).toMatchObject({
      ok: false,
      state: noWall,
      error: { code: "ALLY_TERRITORY_FORBIDDEN" },
    });
  });

  it("rejects duplicate wall occupancy at the authoritative state boundary", () => {
    const arena = candyArena("WARRIOR");
    const at = { x: 3, y: 5 };
    const invalid: GameState = {
      ...arena.state,
      nextEntityId: arena.state.nextEntityId + 2,
      board: {
        ...arena.state.board,
        tiles: arena.state.board.tiles.map((tile) =>
          same(tile.at, at) ? { ...tile, site: null } : tile,
        ),
      },
      chocolateWalls: [
        {
          id: wallId(arena.state.nextEntityId),
          ownerId: arena.humanId,
          at,
          hp: 10,
        },
        {
          id: wallId(arena.state.nextEntityId + 1),
          ownerId: arena.enemyId,
          at,
          hp: 10,
        },
      ],
    };
    expect(
      applyCommand(invalid, { kind: "WAIT", unitId: arena.actor.id }),
    ).toEqual({
      ok: false,
      state: invalid,
      error: { code: "INVALID_STATE", params: { field: "chocolateWalls" } },
    });
  });
});

function same(
  left: { x: number; y: number },
  right: { x: number; y: number },
): boolean {
  return left.x === right.x && left.y === right.y;
}
