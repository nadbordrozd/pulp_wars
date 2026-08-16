import { describe, expect, it } from "vitest";
import {
  appendReplayCommand,
  applyCommand,
  canonicalHash,
  cityAssignedCountedUnitCount,
  createReplay,
  defenseBonusForUnit,
  getRuleset,
  legalCommands,
  movementDistance,
  previewCombat,
  queryPlayerCommands,
  roundHalfUp,
  runReplay,
  unitId,
  validateMovementPath,
  viewFor,
  type Command,
  type Coord,
  type GameState,
  type PlayerId,
  type PlayerState,
  type UnitState,
} from "../../src/engine/index";
import { gameStateBuilder, setupBuilder } from "../fixtures/builders";

function activePlayerId(state: GameState): PlayerId {
  const id = state.turnOrder[state.activeSeatIndex];
  if (id === undefined) throw new Error("Missing active player");
  return id;
}

function arenaState(
  attackerUpdate: Partial<UnitState> = {},
  defenderUpdate: Partial<UnitState> = {},
): {
  readonly state: GameState;
  readonly attacker: UnitState;
  readonly defender: UnitState;
} {
  const base = gameStateBuilder();
  const ownerId = activePlayerId(base);
  const attacker = base.units.find((unit) => unit.ownerId === ownerId);
  const defender = base.units.find((unit) => unit.ownerId !== ownerId);
  if (attacker === undefined || defender === undefined)
    throw new Error("Missing arena units");
  const nextAttacker: UnitState = {
    ...attacker,
    at: { x: 4, y: 4 },
    ...attackerUpdate,
  };
  const nextDefender: UnitState = {
    ...defender,
    at: { x: 5, y: 4 },
    ...defenderUpdate,
  };
  const explored = base.board.tiles.map((tile) => tile.at);
  const state: GameState = {
    ...base,
    players: base.players.map((player) => ({ ...player, explored })),
    board: {
      ...base.board,
      tiles: base.board.tiles.map((tile) => ({
        ...tile,
        terrain: "GRASS" as const,
        resource: null,
        improvement: null,
      })),
    },
    units: base.units.map((unit) =>
      unit.id === attacker.id
        ? nextAttacker
        : unit.id === defender.id
          ? nextDefender
          : unit,
    ),
  };
  return { state, attacker: nextAttacker, defender: nextDefender };
}

function replacePlayer(
  state: GameState,
  playerId: PlayerId,
  update: Partial<PlayerState>,
): GameState {
  return {
    ...state,
    players: state.players.map((player) =>
      player.id === playerId ? { ...player, ...update } : player,
    ),
  };
}

describe("five-unit rules and training", () => {
  it("publishes exact immutable stats, abilities, costs, and unlocks", () => {
    const rules = getRuleset("pulp-wars-poc-5");
    expect(rules?.units).toEqual({
      WARRIOR: {
        type: "WARRIOR",
        cost: 2,
        maxHp: 10,
        attack: 2,
        defense: 2,
        move: 1,
        range: 1,
        abilities: ["DASH", "FORTIFY"],
        technology: null,
      },
      ARCHER: {
        type: "ARCHER",
        cost: 3,
        maxHp: 10,
        attack: 2,
        defense: 1,
        move: 1,
        range: 2,
        abilities: ["DASH", "FORTIFY"],
        technology: "ARCHERY",
      },
      DEFENDER: {
        type: "DEFENDER",
        cost: 3,
        maxHp: 15,
        attack: 1,
        defense: 3,
        move: 1,
        range: 1,
        abilities: ["FORTIFY"],
        technology: "STRATEGY",
      },
      RIDER: {
        type: "RIDER",
        cost: 3,
        maxHp: 10,
        attack: 2,
        defense: 1,
        move: 2,
        range: 1,
        abilities: ["DASH", "ESCAPE", "FORTIFY"],
        technology: "RIDING",
      },
      CATAPULT: {
        type: "CATAPULT",
        cost: 8,
        maxHp: 10,
        attack: 4,
        defense: 0,
        move: 1,
        range: 3,
        abilities: [],
        technology: "MATHEMATICS",
      },
    });
    expect(Object.isFrozen(rules?.units)).toBe(true);
    expect(Object.isFrozen(rules?.units.RIDER.abilities)).toBe(true);
  });

  it.each([
    ["WARRIOR", [], 2, 10],
    ["ARCHER", ["ARCHERY"], 3, 10],
    ["DEFENDER", ["STRATEGY"], 3, 15],
    ["RIDER", ["RIDING"], 3, 10],
    ["CATAPULT", ["MATHEMATICS"], 8, 10],
  ] as const)(
    "trains %s at exact cost and full HP but not ready",
    (type, techs, cost, hp) => {
      const base = gameStateBuilder();
      const ownerId = activePlayerId(base);
      const city = base.cities.find(
        (candidate) => candidate.ownerId === ownerId,
      );
      const unit = base.units.find(
        (candidate) => candidate.ownerId === ownerId,
      );
      if (city === undefined || unit === undefined)
        throw new Error("Missing training fixture");
      const state = replacePlayer(
        {
          ...base,
          units: base.units.map((candidate) =>
            candidate.id === unit.id
              ? { ...candidate, at: { x: city.at.x + 1, y: city.at.y } }
              : candidate,
          ),
        },
        ownerId,
        { stars: 20, researchedTechs: techs },
      );
      const result = applyCommand(state, {
        kind: "TRAIN",
        cityId: city.id,
        unit: type,
      });
      if (!result.ok) throw new Error(result.error.code);
      expect(
        result.state.players.find((player) => player.id === ownerId)?.stars,
      ).toBe(20 - cost);
      expect(result.state.units.at(-1)).toMatchObject({
        id: state.nextEntityId,
        type,
        hp,
        maxHp: hp,
        homeCityId: city.id,
        capacityExempt: false,
        ready: false,
        kills: 0,
        veteran: false,
      });
      expect(result.events).toEqual([
        expect.objectContaining({
          kind: "UNIT_TRAINED",
          cityId: city.id,
          unit: type,
          cost,
        }),
      ]);
    },
  );

  it("enforces unlock, stars, ownership, siege, reward, capacity, and empty spawn gates", () => {
    const base = gameStateBuilder();
    const ownerId = activePlayerId(base);
    const city = base.cities.find((candidate) => candidate.ownerId === ownerId);
    const own = base.units.find((candidate) => candidate.ownerId === ownerId);
    const enemy = base.units.find((candidate) => candidate.ownerId !== ownerId);
    if (city === undefined || own === undefined || enemy === undefined)
      throw new Error("Missing gates");
    const command = { kind: "TRAIN", cityId: city.id, unit: "ARCHER" } as const;
    expect(applyCommand(base, command)).toMatchObject({
      ok: false,
      error: { code: "UNIT_TYPE_LOCKED" },
    });
    let empty: GameState = {
      ...base,
      units: base.units.map((unit) =>
        unit.id === own.id
          ? { ...unit, at: { x: city.at.x + 1, y: city.at.y } }
          : unit,
      ),
    };
    empty = replacePlayer(empty, ownerId, {
      researchedTechs: ["ARCHERY"],
      stars: 2,
    });
    expect(applyCommand(empty, command)).toMatchObject({
      ok: false,
      error: { code: "INSUFFICIENT_STARS" },
    });
    expect(
      applyCommand(replacePlayer(empty, ownerId, { stars: 20 }), command).ok,
    ).toBe(true);
    const besieged = {
      ...replacePlayer(empty, ownerId, { stars: 20 }),
      units: empty.units.map((unit) =>
        unit.id === enemy.id ? { ...unit, at: city.at } : unit,
      ),
    };
    expect(applyCommand(besieged, command)).toMatchObject({
      ok: false,
      error: { code: "CITY_BESIEGED" },
    });
    const pending: GameState = {
      ...replacePlayer(empty, ownerId, { stars: 20 }),
      pendingChoice: { kind: "CITY_REWARD", cityId: city.id, level: 2 },
    };
    expect(applyCommand(pending, command)).toMatchObject({
      ok: false,
      error: { code: "PENDING_CHOICE" },
    });
    const occupied = replacePlayer(base, ownerId, {
      researchedTechs: ["ARCHERY"],
      stars: 20,
    });
    expect(applyCommand(occupied, command)).toMatchObject({
      ok: false,
      error: { code: "CITY_SPAWN_OCCUPIED" },
    });
    const atCapacity: GameState = {
      ...replacePlayer(empty, ownerId, {
        researchedTechs: ["ARCHERY"],
        stars: 20,
      }),
      units: [
        ...empty.units,
        {
          ...own,
          id: unitId(100),
          at: { x: 0, y: 0 },
          capacityExempt: false,
        },
      ],
    };
    expect(applyCommand(atCapacity, command)).toMatchObject({
      ok: false,
      error: { code: "CITY_CAPACITY_FULL" },
    });
    const enemyCity = base.cities.find(
      (candidate) => candidate.ownerId !== ownerId,
    );
    if (enemyCity === undefined) throw new Error("Missing enemy city");
    expect(
      applyCommand(base, { ...command, cityId: enemyCity.id }),
    ).toMatchObject({ ok: false, error: { code: "CITY_NOT_OWNED" } });
  });
});

describe("Catapult siege boundary", () => {
  it("uses the normative integer-rational damage vectors", () => {
    const plain = arenaState({ type: "CATAPULT" }, { at: { x: 7, y: 4 } });
    expect(roundHalfUp(4 * 4 * 9, 6 * 2)).toBe(12);
    expect(
      previewCombat(plain.state, plain.attacker.id, plain.defender.id),
    ).toMatchObject({
      ok: true,
      preview: {
        damageToDefender: 10,
        damageToAttacker: 0,
        defenderDies: true,
        advances: false,
        noRetaliationReason: "DEFENDER_DIED",
      },
    });

    const ordinaryBonus: GameState = {
      ...plain.state,
      board: {
        ...plain.state.board,
        tiles: plain.state.board.tiles.map((tile) =>
          tile.at.x === plain.defender.at.x && tile.at.y === plain.defender.at.y
            ? { ...tile, terrain: "MOUNTAIN" as const }
            : tile,
        ),
      },
    };
    expect(
      previewCombat(ordinaryBonus, plain.attacker.id, plain.defender.id),
    ).toMatchObject({
      ok: true,
      preview: { damageToDefender: 10, defenderDies: true },
    });

    const defenderCity = plain.state.cities.find(
      (city) => city.ownerId === plain.defender.ownerId,
    );
    if (defenderCity === undefined) throw new Error("Missing defender city");
    const cityWall: GameState = {
      ...plain.state,
      cities: plain.state.cities.map((city) =>
        city.id === defenderCity.id
          ? {
              ...city,
              at: plain.defender.at,
              level: 3,
              rewardLevel3: "CITY_WALL" as const,
            }
          : city,
      ),
    };
    expect(
      previewCombat(cityWall, plain.attacker.id, plain.defender.id),
    ).toMatchObject({
      ok: true,
      preview: {
        damageToDefender: 6,
        damageToAttacker: 0,
        defenderDies: false,
        noRetaliationReason: "OUT_OF_RANGE",
      },
    });

    const promotedWarrior: GameState = {
      ...plain.state,
      units: plain.state.units.map((unit) =>
        unit.id === plain.defender.id
          ? { ...unit, hp: 15, maxHp: 15, veteran: true }
          : unit,
      ),
    };
    expect(
      previewCombat(promotedWarrior, plain.attacker.id, plain.defender.id),
    ).toMatchObject({
      ok: true,
      preview: { damageToDefender: 12, defenderDies: false },
    });
  });

  it("attacks at range three but not four without leaking a fogged target", () => {
    for (const distance of [1, 2, 3] as const) {
      const arena = arenaState(
        { type: "CATAPULT" },
        { at: { x: 4 + distance, y: 4 } },
      );
      expect(
        legalCommands(arena.state, arena.attacker.ownerId).some(
          ({ command }) =>
            command.kind === "ATTACK" && command.targetId === arena.defender.id,
        ),
      ).toBe(true);
    }
    const outOfRange = arenaState({ type: "CATAPULT" }, { at: { x: 8, y: 4 } });
    expect(
      legalCommands(outOfRange.state, outOfRange.attacker.ownerId).some(
        ({ command }) =>
          command.kind === "ATTACK" &&
          command.targetId === outOfRange.defender.id,
      ),
    ).toBe(false);

    const owner = outOfRange.state.players.find(
      (player) => player.id === outOfRange.attacker.ownerId,
    );
    if (owner === undefined) throw new Error("Missing Catapult owner");
    const hidden = replacePlayer(outOfRange.state, owner.id, {
      explored: [outOfRange.attacker.at],
    });
    const view = viewFor(hidden, owner.id);
    expect(view.units.some((unit) => unit.id === outOfRange.defender.id)).toBe(
      false,
    );
    expect(
      queryPlayerCommands(view).some(
        ({ command }) =>
          command.kind === "ATTACK" &&
          command.targetId === outOfRange.defender.id,
      ),
    ).toBe(false);
  });

  it("may attack before moving, but Move ends attack and grants no Escape", () => {
    const arena = arenaState({ type: "CATAPULT" }, { at: { x: 6, y: 4 } });
    expect(
      applyCommand(arena.state, {
        kind: "ATTACK",
        unitId: arena.attacker.id,
        targetId: arena.defender.id,
      }).ok,
    ).toBe(true);
    const moved = applyCommand(arena.state, {
      kind: "MOVE",
      unitId: arena.attacker.id,
      path: [{ x: 5, y: 4 }],
    });
    if (!moved.ok) throw new Error(moved.error.code);
    expect(
      applyCommand(moved.state, {
        kind: "ATTACK",
        unitId: arena.attacker.id,
        targetId: arena.defender.id,
      }),
    ).toMatchObject({ ok: false, error: { code: "UNIT_NOT_READY" } });
    expect(
      legalCommands(moved.state, arena.attacker.ownerId).some(
        ({ kind }) => kind === "ESCAPE_MOVE",
      ),
    ).toBe(false);
  });

  it("stays locked until Mathematics and uses ordinary city capacity", () => {
    const base = gameStateBuilder();
    const ownerId = activePlayerId(base);
    const city = base.cities.find((candidate) => candidate.ownerId === ownerId);
    const founder = base.units.find(
      (candidate) => candidate.ownerId === ownerId,
    );
    if (city === undefined || founder === undefined)
      throw new Error("Missing Catapult training fixture");
    const openCity: GameState = {
      ...replacePlayer(base, ownerId, { stars: 20 }),
      units: base.units.map((unit) =>
        unit.id === founder.id
          ? { ...unit, at: { x: city.at.x + 1, y: city.at.y } }
          : unit,
      ),
    };
    const command = {
      kind: "TRAIN",
      cityId: city.id,
      unit: "CATAPULT",
    } as const;
    expect(applyCommand(openCity, command)).toMatchObject({
      ok: false,
      error: { code: "UNIT_TYPE_LOCKED" },
    });
    const unlocked = replacePlayer(openCity, ownerId, {
      stars: 20,
      researchedTechs: ["HUNTING", "FORESTRY", "MATHEMATICS"],
    });
    const trained = applyCommand(unlocked, command);
    if (!trained.ok) throw new Error(trained.error.code);
    expect(
      trained.state.players.find((player) => player.id === ownerId)?.stars,
    ).toBe(12);
    expect(trained.state.units.at(-1)).toMatchObject({
      type: "CATAPULT",
      homeCityId: city.id,
      capacityExempt: false,
      ready: false,
    });
    expect(applyCommand(trained.state, command)).toMatchObject({
      ok: false,
      error: { code: "CITY_CAPACITY_FULL" },
    });
  });

  it("uses the generic Wait, recovery, and promotion lifecycle", () => {
    const arena = arenaState({ type: "CATAPULT", hp: 5, kills: 3 });
    const waited = applyCommand(arena.state, {
      kind: "WAIT",
      unitId: arena.attacker.id,
    });
    if (!waited.ok) throw new Error(waited.error.code);
    expect(
      waited.state.units.find((unit) => unit.id === arena.attacker.id),
    ).toMatchObject({
      type: "CATAPULT",
      hp: 5,
      activation: { handled: true },
    });
    const recovered = applyCommand(waited.state, {
      kind: "RECOVER",
      unitId: arena.attacker.id,
    });
    if (!recovered.ok) throw new Error(recovered.error.code);
    expect(
      recovered.state.units.find((unit) => unit.id === arena.attacker.id)?.hp,
    ).toBe(7);
    const promoted = applyCommand(waited.state, {
      kind: "PROMOTE",
      unitId: arena.attacker.id,
    });
    if (!promoted.ok) throw new Error(promoted.error.code);
    expect(
      promoted.state.units.find((unit) => unit.id === arena.attacker.id),
    ).toMatchObject({ hp: 15, maxHp: 15, veteran: true });
  });
});

describe("movement, fog, ZOC, Dash, and Escape", () => {
  it("validates explicit adjacent paths, occupancy, fog terminals, mountains, and newly revealed ZOC", () => {
    const {
      state: base,
      attacker,
      defender,
    } = arenaState({ type: "RIDER" }, { at: { x: 9, y: 9 } });
    expect(
      validateMovementPath(base, attacker, [{ x: 6, y: 4 }], 2),
    ).toMatchObject({ legal: false, reason: "NOT_ADJACENT" });
    const occupied: GameState = {
      ...base,
      units: base.units.map((unit) =>
        unit.id === defender.id ? { ...unit, at: { x: 5, y: 4 } } : unit,
      ),
    };
    expect(
      validateMovementPath(occupied, attacker, [{ x: 5, y: 4 }], 2),
    ).toMatchObject({ legal: false, reason: "OCCUPIED" });
    const owner = base.players.find((player) => player.id === attacker.ownerId);
    if (owner === undefined) throw new Error("Missing owner");
    const fog = replacePlayer(base, owner.id, { explored: [attacker.at] });
    expect(
      validateMovementPath(
        fog,
        attacker,
        [
          { x: 5, y: 4 },
          { x: 6, y: 4 },
        ],
        2,
      ),
    ).toMatchObject({ legal: false, reason: "UNEXPLORED_INTERMEDIATE" });
    const mountain: GameState = {
      ...base,
      board: {
        ...base.board,
        tiles: base.board.tiles.map((tile) =>
          tile.at.x === 5 && tile.at.y === 4
            ? { ...tile, terrain: "MOUNTAIN" }
            : tile,
        ),
      },
    };
    expect(
      validateMovementPath(mountain, attacker, [{ x: 5, y: 4 }], 2),
    ).toMatchObject({ legal: false, reason: "CLIMBING_REQUIRED" });
    const climbing = replacePlayer(mountain, owner.id, {
      researchedTechs: ["CLIMBING"],
    });
    expect(
      validateMovementPath(
        climbing,
        attacker,
        [
          { x: 5, y: 4 },
          { x: 6, y: 4 },
        ],
        2,
      ),
    ).toMatchObject({ legal: false, reason: "MOUNTAIN_STOPS_MOVE" });
    const hiddenEnemy = replacePlayer(
      {
        ...base,
        units: base.units.map((unit) =>
          unit.id === defender.id ? { ...unit, at: { x: 6, y: 4 } } : unit,
        ),
      },
      owner.id,
      { explored: [attacker.at, { x: 5, y: 4 }] },
    );
    expect(
      validateMovementPath(
        hiddenEnemy,
        attacker,
        [
          { x: 5, y: 4 },
          { x: 5, y: 5 },
        ],
        2,
      ),
    ).toMatchObject({
      legal: true,
      destination: { x: 5, y: 4 },
      traversedPath: [{ x: 5, y: 4 }],
      interruption: { at: { x: 5, y: 4 }, reason: "ZOC" },
    });
  });

  it("uses stable shortest legal summaries and mountain radius-two reveal", () => {
    const { state: base, attacker } = arenaState(
      { type: "RIDER" },
      { at: { x: 9, y: 9 } },
    );
    const moves = legalCommands(base, attacker.ownerId).filter(
      (summary) => summary.kind === "MOVE",
    );
    const destinations = moves.map((summary) => {
      if (summary.command.kind !== "MOVE") throw new Error("Wrong summary");
      return summary.command.path.at(-1);
    });
    expect(new Set(destinations.map((at) => `${at?.x},${at?.y}`)).size).toBe(
      destinations.length,
    );
    expect(moves).toEqual(
      legalCommands(base, attacker.ownerId).filter(
        (summary) => summary.kind === "MOVE",
      ),
    );

    const owner = base.players.find((player) => player.id === attacker.ownerId);
    if (owner === undefined) throw new Error("Missing owner");
    const target = { x: 5, y: 4 };
    const mountain = replacePlayer(
      {
        ...base,
        board: {
          ...base.board,
          tiles: base.board.tiles.map((tile) =>
            tile.at.x === target.x && tile.at.y === target.y
              ? { ...tile, terrain: "MOUNTAIN" }
              : tile,
          ),
        },
      },
      owner.id,
      { explored: [attacker.at], researchedTechs: ["CLIMBING"] },
    );
    const moved = applyCommand(mountain, {
      kind: "MOVE",
      unitId: attacker.id,
      path: [target],
    });
    if (!moved.ok) throw new Error(moved.error.code);
    expect(
      moved.state.players.find((player) => player.id === owner.id)?.explored,
    ).toHaveLength(25);
  });

  it("allows Dash attacks, stops Defender after Move, and grants Rider exactly one Escape", () => {
    const warriorArena = arenaState({}, { at: { x: 6, y: 4 } });
    const movedWarrior = applyCommand(warriorArena.state, {
      kind: "MOVE",
      unitId: warriorArena.attacker.id,
      path: [{ x: 5, y: 4 }],
    });
    if (!movedWarrior.ok) throw new Error(movedWarrior.error.code);
    expect(
      applyCommand(movedWarrior.state, {
        kind: "ATTACK",
        unitId: warriorArena.attacker.id,
        targetId: warriorArena.defender.id,
      }).ok,
    ).toBe(true);

    const defenderArena = arenaState(
      { type: "DEFENDER", hp: 15, maxHp: 15 },
      { at: { x: 6, y: 4 } },
    );
    const movedDefender = applyCommand(defenderArena.state, {
      kind: "MOVE",
      unitId: defenderArena.attacker.id,
      path: [{ x: 5, y: 4 }],
    });
    if (!movedDefender.ok) throw new Error(movedDefender.error.code);
    expect(
      applyCommand(movedDefender.state, {
        kind: "ATTACK",
        unitId: defenderArena.attacker.id,
        targetId: defenderArena.defender.id,
      }),
    ).toMatchObject({ ok: false, error: { code: "UNIT_NOT_READY" } });

    const riderArena = arenaState({ type: "RIDER" });
    const attacked = applyCommand(riderArena.state, {
      kind: "ATTACK",
      unitId: riderArena.attacker.id,
      targetId: riderArena.defender.id,
    });
    if (!attacked.ok) throw new Error(attacked.error.code);
    expect(
      attacked.state.units.find((unit) => unit.id === riderArena.attacker.id),
    ).toMatchObject({
      ready: true,
      activation: { attacked: true, escapeAvailable: true },
    });
    const escaped = applyCommand(attacked.state, {
      kind: "ESCAPE_MOVE",
      unitId: riderArena.attacker.id,
      path: [
        { x: 3, y: 4 },
        { x: 2, y: 4 },
      ],
    });
    if (!escaped.ok) throw new Error(escaped.error.code);
    expect(
      escaped.state.units.find((unit) => unit.id === riderArena.attacker.id),
    ).toMatchObject({
      at: { x: 2, y: 4 },
      ready: false,
      activation: { attacked: true, escapeAvailable: false },
    });
    expect(
      applyCommand(escaped.state, {
        kind: "ESCAPE_MOVE",
        unitId: riderArena.attacker.id,
        path: [{ x: 1, y: 4 }],
      }),
    ).toMatchObject({ ok: false });
    expect(
      applyCommand(escaped.state, {
        kind: "ATTACK",
        unitId: riderArena.attacker.id,
        targetId: riderArena.defender.id,
      }),
    ).toMatchObject({ ok: false });
  });
});

describe("combat, recovery, promotion, and determinism", () => {
  it("uses exact rational half-up damage and preview equals resolution", () => {
    expect(roundHalfUp(9, 2)).toBe(5);
    expect(roundHalfUp(7, 2)).toBe(4);
    const { state, attacker, defender } = arenaState();
    const preview = previewCombat(state, attacker.id, defender.id);
    expect(preview).toEqual({
      ok: true,
      preview: {
        attackerId: attacker.id,
        defenderId: defender.id,
        damageToDefender: 5,
        damageToAttacker: 5,
        defenderDies: false,
        attackerDies: false,
        advances: false,
        noRetaliationReason: null,
      },
    });
    const result = applyCommand(state, {
      kind: "ATTACK",
      unitId: attacker.id,
      targetId: defender.id,
    });
    if (!result.ok || !preview.ok) throw new Error("Combat failed");
    expect(result.events[0]).toEqual({
      kind: "COMBAT_RESOLVED",
      preview: preview.preview,
    });
    expect(result.state.units.find((unit) => unit.id === attacker.id)?.hp).toBe(
      5,
    );
    expect(result.state.units.find((unit) => unit.id === defender.id)?.hp).toBe(
      5,
    );
  });

  it("uses the greatest defense bonus and all retaliation suppression reasons", () => {
    const base = arenaState();
    const defenderCity = base.state.cities.find(
      (city) => city.ownerId === base.defender.ownerId,
    );
    if (defenderCity === undefined) throw new Error("Missing defender city");
    const cityState: GameState = {
      ...base.state,
      cities: base.state.cities.map((city) =>
        city.id === defenderCity.id
          ? {
              ...city,
              at: base.defender.at,
              level: 3,
              rewardLevel3: "CITY_WALL",
            }
          : city,
      ),
      board: {
        ...base.state.board,
        tiles: base.state.board.tiles.map((tile) =>
          tile.at.x === base.defender.at.x && tile.at.y === base.defender.at.y
            ? { ...tile, terrain: "MOUNTAIN" }
            : tile,
        ),
      },
    };
    expect(defenseBonusForUnit(cityState, base.defender)).toEqual({
      numerator: 4,
      denominator: 1,
    });
    const normalCity: GameState = {
      ...cityState,
      cities: cityState.cities.map((city) =>
        city.id === defenderCity.id ? { ...city, rewardLevel3: null } : city,
      ),
      board: {
        ...cityState.board,
        tiles: cityState.board.tiles.map((tile) =>
          tile.at.x === base.defender.at.x && tile.at.y === base.defender.at.y
            ? { ...tile, terrain: "GRASS" }
            : tile,
        ),
      },
    };
    expect(defenseBonusForUnit(normalCity, base.defender)).toEqual({
      numerator: 3,
      denominator: 2,
    });
    const mountainOnly: GameState = {
      ...base.state,
      board: cityState.board,
    };
    expect(defenseBonusForUnit(mountainOnly, base.defender)).toEqual({
      numerator: 3,
      denominator: 2,
    });
    const walled = previewCombat(cityState, base.attacker.id, base.defender.id);
    if (!walled.ok) throw new Error(walled.error.code);
    expect(walled.preview.damageToDefender).toBeLessThan(5);

    const killedArena = arenaState({}, { hp: 1 });
    const killed = previewCombat(
      killedArena.state,
      killedArena.attacker.id,
      killedArena.defender.id,
    );
    expect(killed).toMatchObject({
      ok: true,
      preview: {
        damageToAttacker: 0,
        defenderDies: true,
        noRetaliationReason: "DEFENDER_DIED",
      },
    });
    const rangedArena = arenaState({ type: "ARCHER" }, { at: { x: 6, y: 4 } });
    const ranged = previewCombat(
      rangedArena.state,
      rangedArena.attacker.id,
      rangedArena.defender.id,
    );
    expect(ranged).toMatchObject({
      ok: true,
      preview: { damageToAttacker: 0, noRetaliationReason: "OUT_OF_RANGE" },
    });
    const defenderOwner = base.state.players.find(
      (player) => player.id === base.defender.ownerId,
    );
    if (defenderOwner === undefined) throw new Error("Missing defender owner");
    const hidden = replacePlayer(base.state, defenderOwner.id, {
      explored: defenderOwner.explored.filter(
        (at) => at.x !== base.attacker.at.x || at.y !== base.attacker.at.y,
      ),
    });
    expect(
      previewCombat(hidden, base.attacker.id, base.defender.id),
    ).toMatchObject({
      ok: true,
      preview: {
        damageToAttacker: 0,
        noRetaliationReason: "ATTACKER_UNEXPLORED",
      },
    });
  });

  it("resolves defender-first death, melee advance, retaliation kills, kill credit, and capacity cleanup", () => {
    const killArena = arenaState({}, { hp: 1, capacityExempt: false });
    const enemyCity = killArena.state.cities.find(
      (city) => city.ownerId === killArena.defender.ownerId,
    );
    if (enemyCity === undefined) throw new Error("Missing home city");
    const before = cityAssignedCountedUnitCount(killArena.state, enemyCity.id);
    const killed = applyCommand(killArena.state, {
      kind: "ATTACK",
      unitId: killArena.attacker.id,
      targetId: killArena.defender.id,
    });
    if (!killed.ok) throw new Error(killed.error.code);
    expect(killed.events.slice(0, 3).map((event) => event.kind)).toEqual([
      "COMBAT_RESOLVED",
      "UNIT_DIED",
      "UNIT_MOVED",
    ]);
    expect(
      killed.state.units.find((unit) => unit.id === killArena.attacker.id),
    ).toMatchObject({ at: killArena.defender.at, kills: 1 });
    expect(
      killed.state.units.some((unit) => unit.id === killArena.defender.id),
    ).toBe(false);
    expect(cityAssignedCountedUnitCount(killed.state, enemyCity.id)).toBe(
      before - 1,
    );

    const retaliationArena = arenaState({ hp: 1 });
    const retaliation = applyCommand(retaliationArena.state, {
      kind: "ATTACK",
      unitId: retaliationArena.attacker.id,
      targetId: retaliationArena.defender.id,
    });
    if (!retaliation.ok) throw new Error(retaliation.error.code);
    expect(retaliation.events.map((event) => event.kind)).toEqual([
      "COMBAT_RESOLVED",
      "UNIT_DIED",
    ]);
    expect(retaliation.events[1]).toMatchObject({
      cause: "RETALIATION",
      unitId: retaliationArena.attacker.id,
    });
    expect(
      retaliation.state.units.find(
        (unit) => unit.id === retaliationArena.defender.id,
      )?.kills,
    ).toBe(1);
  });

  it("does not advance a ranged kill", () => {
    const arena = arenaState({ type: "ARCHER" }, { at: { x: 6, y: 4 }, hp: 1 });
    const result = applyCommand(arena.state, {
      kind: "ATTACK",
      unitId: arena.attacker.id,
      targetId: arena.defender.id,
    });
    if (!result.ok) throw new Error(result.error.code);
    expect(
      result.state.units.find((unit) => unit.id === arena.attacker.id)?.at,
    ).toEqual(arena.attacker.at);
    expect(result.events.some((event) => event.kind === "UNIT_MOVED")).toBe(
      false,
    );
  });

  it("makes attack advance wait for the next Start Turn before capture while promotion stays free", () => {
    const arena = arenaState({ kills: 2 }, { hp: 1 });
    const villageState: GameState = {
      ...arena.state,
      board: {
        ...arena.state.board,
        tiles: arena.state.board.tiles.map((tile) =>
          tile.at.x === arena.defender.at.x && tile.at.y === arena.defender.at.y
            ? {
                ...tile,
                site: "VILLAGE",
                territoryCenter: arena.defender.at,
                territoryCityId: null,
              }
            : tile,
        ),
      },
    };
    const attacked = applyCommand(villageState, {
      kind: "ATTACK",
      unitId: arena.attacker.id,
      targetId: arena.defender.id,
    });
    if (!attacked.ok) throw new Error(attacked.error.code);
    expect(
      attacked.state.units.find((unit) => unit.id === arena.attacker.id),
    ).toMatchObject({
      at: arena.defender.at,
      kills: 3,
      captureEligible: false,
      activation: { attacked: true },
    });
    expect(
      applyCommand(attacked.state, {
        kind: "CAPTURE",
        unitId: arena.attacker.id,
      }),
    ).toMatchObject({ ok: false, error: { code: "CAPTURE_NOT_ELIGIBLE" } });
    const promoted = applyCommand(attacked.state, {
      kind: "PROMOTE",
      unitId: arena.attacker.id,
    });
    if (!promoted.ok) throw new Error(promoted.error.code);
    let state = promoted.state;
    for (let index = 0; index < state.turnOrder.length; index += 1) {
      const ended = applyCommand(state, { kind: "END_TURN" });
      if (!ended.ok) throw new Error(ended.error.code);
      state = ended.state;
    }
    expect(
      state.units.find((unit) => unit.id === arena.attacker.id),
    ).toMatchObject({
      veteran: true,
      captureEligible: true,
      activation: { attacked: false },
    });
    expect(
      applyCommand(state, { kind: "CAPTURE", unitId: arena.attacker.id }).ok,
    ).toBe(true);
  });

  it("recovers exact friendly/foreign amounts, auto-recovers only idle units, and promotes once after acting", () => {
    const base = gameStateBuilder();
    const ownerId = activePlayerId(base);
    const city = base.cities.find((candidate) => candidate.ownerId === ownerId);
    const unit = base.units.find((candidate) => candidate.ownerId === ownerId);
    if (city === undefined || unit === undefined)
      throw new Error("Missing recovery fixture");
    const hurt: GameState = {
      ...base,
      units: base.units.map((candidate) =>
        candidate.id === unit.id ? { ...candidate, hp: 5 } : candidate,
      ),
    };
    const recovered = applyCommand(hurt, { kind: "RECOVER", unitId: unit.id });
    if (!recovered.ok) throw new Error(recovered.error.code);
    expect(
      recovered.state.units.find((candidate) => candidate.id === unit.id)?.hp,
    ).toBe(9);
    expect(recovered.events).toEqual([
      { kind: "UNIT_RECOVERED", unitId: unit.id, amount: 4, automatic: false },
    ]);

    const foreign: GameState = {
      ...hurt,
      units: hurt.units.map((candidate) =>
        candidate.id === unit.id
          ? { ...candidate, at: { x: 0, y: 0 } }
          : candidate,
      ),
    };
    const foreignRecovery = applyCommand(foreign, {
      kind: "RECOVER",
      unitId: unit.id,
    });
    if (!foreignRecovery.ok) throw new Error(foreignRecovery.error.code);
    expect(
      foreignRecovery.state.units.find((candidate) => candidate.id === unit.id)
        ?.hp,
    ).toBe(7);

    const ended = applyCommand(hurt, { kind: "END_TURN" });
    if (!ended.ok) throw new Error(ended.error.code);
    expect(ended.events[0]).toEqual({
      kind: "UNIT_RECOVERED",
      unitId: unit.id,
      amount: 4,
      automatic: true,
    });
    const movedHurt: GameState = {
      ...hurt,
      units: hurt.units.map((candidate) =>
        candidate.id === unit.id
          ? {
              ...candidate,
              activation: { ...candidate.activation, moved: true },
            }
          : candidate,
      ),
    };
    const noAuto = applyCommand(movedHurt, { kind: "END_TURN" });
    if (!noAuto.ok) throw new Error(noAuto.error.code);
    expect(noAuto.events.some((event) => event.kind === "UNIT_RECOVERED")).toBe(
      false,
    );

    const promotable: GameState = {
      ...hurt,
      units: hurt.units.map((candidate) =>
        candidate.id === unit.id
          ? {
              ...candidate,
              hp: 2,
              kills: 3,
              ready: false,
              activation: { ...candidate.activation, attacked: true },
            }
          : candidate,
      ),
    };
    const promoted = applyCommand(promotable, {
      kind: "PROMOTE",
      unitId: unit.id,
    });
    if (!promoted.ok) throw new Error(promoted.error.code);
    expect(
      promoted.state.units.find((candidate) => candidate.id === unit.id),
    ).toMatchObject({
      hp: 15,
      maxHp: 15,
      veteran: true,
      ready: false,
      activation: { attacked: true },
    });
    expect(
      applyCommand(promoted.state, { kind: "PROMOTE", unitId: unit.id }),
    ).toMatchObject({ ok: false, error: { code: "PROMOTION_NOT_ELIGIBLE" } });
  });

  it("rejects stale combat atomically and produces deterministic state/event hashes", () => {
    const arena = arenaState({}, { hp: 1 });
    const command = {
      kind: "ATTACK",
      unitId: arena.attacker.id,
      targetId: arena.defender.id,
    } as const;
    const first = applyCommand(arena.state, command);
    const second = applyCommand(arena.state, command);
    if (!first.ok || !second.ok) throw new Error("Combat failed");
    expect(first.events).toEqual(second.events);
    expect(canonicalHash(first.state)).toBe(canonicalHash(second.state));
    const stale = applyCommand(first.state, command);
    expect(stale).toMatchObject({ ok: false });
    expect(stale.state).toBe(first.state);
    expect(stale.state.commandIndex).toBe(first.state.commandIndex);
  });

  it("replays a deterministic movement-to-combat sequence with matching checkpoints", () => {
    const setup = setupBuilder();
    let state = gameStateBuilder(setup);
    let replay = createReplay(setup);
    const attackerOwner = activePlayerId(state);
    const attacker = state.units.find((unit) => unit.ownerId === attackerOwner);
    const target = state.units.find((unit) => unit.ownerId !== attackerOwner);
    if (attacker === undefined || target === undefined)
      throw new Error("Missing replay units");
    let attacked = false;
    for (let count = 0; count < 80 && !attacked; count += 1) {
      let command: Command = { kind: "END_TURN" };
      if (activePlayerId(state) === attackerOwner) {
        const current = state.units.find((unit) => unit.id === attacker.id);
        const defender = state.units.find((unit) => unit.id === target.id);
        if (current === undefined || defender === undefined)
          throw new Error("Replay combatant disappeared");
        if (movementDistance(current.at, defender.at) <= 1) {
          command = {
            kind: "ATTACK",
            unitId: current.id,
            targetId: defender.id,
          };
          attacked = true;
        } else if (current.activation.moved) {
          command = { kind: "END_TURN" };
        } else {
          const step = shortestGrassStep(state, current.at, defender.at);
          command = { kind: "MOVE", unitId: current.id, path: [step] };
        }
      }
      const applied = applyCommand(state, command);
      if (!applied.ok)
        throw new Error(`${command.kind}: ${applied.error.code}`);
      state = applied.state;
      replay = appendReplayCommand(replay, command, state);
    }
    expect(attacked).toBe(true);
    const result = runReplay(replay);
    expect(result.stateHash).toBe(canonicalHash(state));
    expect(
      result.events.some((event) => event.kind === "COMBAT_RESOLVED"),
    ).toBe(true);
  });
});

function shortestGrassStep(
  state: GameState,
  from: Coord,
  target: Coord,
): Coord {
  const queue: Coord[] = [from];
  const previous = new Map<string, Coord | null>([[key(from), null]]);
  let found: Coord | null = null;
  while (queue.length > 0 && found === null) {
    const current = queue.shift();
    if (current === undefined) break;
    for (const next of neighbors(state, current)) {
      const nextKey = key(next);
      if (previous.has(nextKey)) continue;
      if (movementDistance(next, target) === 1) {
        previous.set(nextKey, current);
        found = next;
        break;
      }
      previous.set(nextKey, current);
      queue.push(next);
    }
  }
  if (found === null) throw new Error("No grass route to combat");
  let step = found;
  let prior = previous.get(key(step));
  while (prior !== null && prior !== undefined && key(prior) !== key(from)) {
    step = prior;
    prior = previous.get(key(step));
  }
  return step;
}

function neighbors(state: GameState, at: Coord): readonly Coord[] {
  return state.board.tiles
    .filter(
      (tile) =>
        tile.terrain === "GRASS" &&
        movementDistance(tile.at, at) === 1 &&
        !state.units.some(
          (unit) =>
            unit.hp > 0 && unit.at.x === tile.at.x && unit.at.y === tile.at.y,
        ),
    )
    .map((tile) => tile.at)
    .sort((left, right) => left.y - right.y || left.x - right.x);
}

function key(at: Coord): string {
  return `${at.x},${at.y}`;
}
