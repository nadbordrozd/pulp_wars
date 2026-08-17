import { describe, expect, it } from "vitest";
import { chooseNormalCommand, scoreCommand } from "../../src/ai/index";
import {
  applyCommand,
  calculateCombatPreview,
  canonicalHash,
  canonicalJson,
  queryPlayerCommands,
  viewFor,
  type CityState,
  type Coord,
  type GameState,
  type PlayerId,
  type TileState,
} from "../../src/engine/index";
import { gameStateBuilder } from "../fixtures/builders";

interface ForestContext {
  readonly state: GameState;
  readonly playerId: PlayerId;
  readonly city: CityState;
  readonly animal: TileState;
  readonly emptyForest: TileState;
}

function forestContext(): ForestContext {
  const base = gameStateBuilder();
  const playerId = base.turnOrder[base.activeSeatIndex];
  const city = base.cities.find((candidate) => candidate.ownerId === playerId);
  if (playerId === undefined || city === undefined) throw new Error("context");
  const territory = base.board.tiles.filter(
    (tile) =>
      tile.territoryCityId === city.id &&
      (tile.at.x !== city.at.x || tile.at.y !== city.at.y),
  );
  const animalBase = territory[0];
  const emptyBase = territory[1];
  if (animalBase === undefined || emptyBase === undefined)
    throw new Error("territory");
  const state: GameState = {
    ...base,
    board: {
      ...base.board,
      tiles: base.board.tiles.map((tile) =>
        sameCoord(tile.at, animalBase.at)
          ? {
              ...tile,
              terrain: "FOREST",
              resource: "ANIMAL",
              improvement: null,
            }
          : sameCoord(tile.at, emptyBase.at)
            ? {
                ...tile,
                terrain: "FOREST",
                resource: null,
                improvement: null,
              }
            : tile,
      ),
    },
    players: base.players.map((player) =>
      player.id === playerId
        ? {
            ...player,
            stars: 20,
            researchedTechs: ["HUNTING", "FORESTRY"],
          }
        : player,
    ),
  };
  const animal = state.board.tiles.find((tile) =>
    sameCoord(tile.at, animalBase.at),
  );
  const emptyForest = state.board.tiles.find((tile) =>
    sameCoord(tile.at, emptyBase.at),
  );
  if (animal === undefined || emptyForest === undefined)
    throw new Error("Prepared Forest tiles disappeared");
  return {
    state,
    playerId,
    city,
    animal,
    emptyForest,
  };
}

describe("ruleset-4 forest economy", () => {
  it("hunts Animal transactionally, orders events, and consumes no PRNG", () => {
    const { state, playerId, city, animal } = forestContext();
    const prepared: GameState = {
      ...state,
      cities: state.cities.map((candidate) =>
        candidate.id === city.id ? { ...candidate, population: 1 } : candidate,
      ),
    };
    const result = applyCommand(prepared, {
      kind: "HUNT_ANIMAL",
      at: animal.at,
    });
    if (!result.ok) throw new Error(result.error.code);
    expect(result.state.random).toBe(prepared.random);
    expect(
      result.state.players.find((player) => player.id === playerId)?.stars,
    ).toBe(18);
    expect(tileAt(result.state, animal.at)).toMatchObject({
      terrain: "FOREST",
      resource: null,
      improvement: null,
    });
    expect(
      result.state.cities.find((candidate) => candidate.id === city.id),
    ).toMatchObject({
      level: 2,
      population: 0,
    });
    expect(result.events).toEqual([
      {
        kind: "ANIMAL_HUNTED",
        playerId,
        cityId: city.id,
        at: animal.at,
        cost: 2,
        populationAdded: 1,
      },
      { kind: "CITY_LEVELED_UP", cityId: city.id, level: 2 },
    ]);
  });

  it("builds Lumber Mills on empty or hunted Forest and transfers the marker with territory", () => {
    const { state, playerId, city, animal } = forestContext();
    const hunted = applyCommand(state, { kind: "HUNT_ANIMAL", at: animal.at });
    if (!hunted.ok) throw new Error(hunted.error.code);
    const built = applyCommand(hunted.state, {
      kind: "BUILD_LUMBER_MILL",
      at: animal.at,
    });
    if (!built.ok) throw new Error(built.error.code);
    expect(tileAt(built.state, animal.at)).toMatchObject({
      resource: null,
      improvement: "LUMBER_MILL",
    });
    expect(built.events[0]).toEqual({
      kind: "LUMBER_MILL_BUILT",
      playerId,
      cityId: city.id,
      at: animal.at,
      cost: 3,
      populationAdded: 1,
    });
    const newOwner = built.state.players.find(
      (player) => player.id !== playerId,
    );
    if (newOwner === undefined) throw new Error("new owner");
    const transferred: GameState = {
      ...built.state,
      cities: built.state.cities.map((candidate) =>
        candidate.id === city.id
          ? { ...candidate, ownerId: newOwner.id }
          : candidate,
      ),
    };
    expect(tileAt(transferred, animal.at)?.improvement).toBe("LUMBER_MILL");
  });

  it("uses exact Hunt and Lumber rejection precedence with atomic identity", () => {
    const { state, playerId, city, animal, emptyForest } = forestContext();
    const player = state.players.find((candidate) => candidate.id === playerId);
    if (player === undefined) throw new Error("Missing active player");
    const variants: readonly [
      GameState,
      "HUNT_ANIMAL" | "BUILD_LUMBER_MILL",
      Coord,
      string,
    ][] = [
      [state, "HUNT_ANIMAL", { x: -1, y: -1 }, "TILE_NOT_FOUND"],
      [
        withExplored(state, playerId, []),
        "HUNT_ANIMAL",
        animal.at,
        "TILE_UNEXPLORED",
      ],
      [
        withPlayer(state, playerId, { researchedTechs: [] }),
        "HUNT_ANIMAL",
        animal.at,
        "HUNTING_REQUIRED",
      ],
      [state, "HUNT_ANIMAL", emptyForest.at, "ANIMAL_INVALID_TILE"],
      [
        withTerritory(state, animal.at, null),
        "HUNT_ANIMAL",
        animal.at,
        "TERRITORY_NOT_OWNED",
      ],
      [
        besieged(state, city, playerId),
        "HUNT_ANIMAL",
        animal.at,
        "CITY_BESIEGED",
      ],
      [overflowing(state, city), "HUNT_ANIMAL", animal.at, "INTEGER_OVERFLOW"],
      [
        withPlayer(state, playerId, { stars: 1 }),
        "HUNT_ANIMAL",
        animal.at,
        "INSUFFICIENT_STARS",
      ],
      [state, "BUILD_LUMBER_MILL", { x: -1, y: -1 }, "TILE_NOT_FOUND"],
      [
        withExplored(state, playerId, []),
        "BUILD_LUMBER_MILL",
        emptyForest.at,
        "TILE_UNEXPLORED",
      ],
      [
        withPlayer(state, playerId, { researchedTechs: ["HUNTING"] }),
        "BUILD_LUMBER_MILL",
        emptyForest.at,
        "FORESTRY_REQUIRED",
      ],
      [state, "BUILD_LUMBER_MILL", animal.at, "LUMBER_MILL_INVALID_TILE"],
      [
        withTerritory(state, emptyForest.at, null),
        "BUILD_LUMBER_MILL",
        emptyForest.at,
        "TERRITORY_NOT_OWNED",
      ],
      [
        besieged(state, city, playerId),
        "BUILD_LUMBER_MILL",
        emptyForest.at,
        "CITY_BESIEGED",
      ],
      [
        overflowing(state, city),
        "BUILD_LUMBER_MILL",
        emptyForest.at,
        "INTEGER_OVERFLOW",
      ],
      [
        withPlayer(state, playerId, { stars: 2 }),
        "BUILD_LUMBER_MILL",
        emptyForest.at,
        "INSUFFICIENT_STARS",
      ],
    ];
    expect(player.researchedTechs).toEqual(["HUNTING", "FORESTRY"]);
    expect(city.ownerId).toBe(playerId);
    for (const [candidate, kind, at, code] of variants) {
      const before = canonicalJson(candidate);
      const result = applyCommand(candidate, { kind, at });
      expect(result).toMatchObject({ ok: false, error: { code } });
      expect(result.state).toBe(candidate);
      expect(canonicalJson(result.state)).toBe(before);
      expect(result.state.random).toBe(candidate.random);
    }
  });

  it("redacts unexplored Forest content and public queries remain noninterfering", () => {
    const { state, playerId, animal, emptyForest } = forestContext();
    const viewer = state.players.find((player) => player.id === playerId);
    if (viewer === undefined) throw new Error("Missing viewer");
    const hidden = withExplored(
      state,
      playerId,
      viewer.explored.filter((at) => !sameCoord(at, animal.at)),
    );
    const hiddenView = viewFor(hidden, playerId);
    const tile = hiddenView.board.tiles.find((candidate) =>
      sameCoord(candidate.at, animal.at),
    );
    expect(tile).toEqual({ at: animal.at, explored: false });
    const firstCommands = queryPlayerCommands(hiddenView);
    const changedHidden: GameState = {
      ...hidden,
      board: {
        ...hidden.board,
        tiles: hidden.board.tiles.map((candidate) =>
          sameCoord(candidate.at, animal.at)
            ? { ...candidate, resource: null, improvement: "LUMBER_MILL" }
            : candidate,
        ),
      },
    };
    expect(viewFor(changedHidden, playerId)).toEqual(hiddenView);
    expect(queryPlayerCommands(viewFor(changedHidden, playerId))).toEqual(
      firstCommands,
    );
    const publicCommands = queryPlayerCommands(viewFor(state, playerId)).map(
      ({ command }) => command,
    );
    expect(publicCommands).toContainEqual({
      kind: "HUNT_ANIMAL",
      at: animal.at,
    });
    expect(publicCommands).toContainEqual({
      kind: "BUILD_LUMBER_MILL",
      at: emptyForest.at,
    });
  });

  it("Normal scores Hunt/Lumber separately and deterministically", () => {
    const { state, playerId, animal, emptyForest } = forestContext();
    const view = viewFor(state, playerId);
    expect(
      scoreCommand(view, { kind: "HUNT_ANIMAL", at: animal.at }),
    ).toMatchObject({
      priority: 880,
      immediateValue: 3,
    });
    expect(
      scoreCommand(view, { kind: "BUILD_LUMBER_MILL", at: emptyForest.at }),
    ).toMatchObject({
      priority: 880,
      immediateValue: 2,
    });
    const first = chooseNormalCommand(view);
    const second = chooseNormalCommand(view);
    expect(first).toEqual(second);
    expect(canonicalHash(first)).toBe(canonicalHash(second));
  });

  it("Forest ends movement without technology and Archery grants its single 3/2 defense", () => {
    const { state, playerId, emptyForest } = forestContext();
    const mover = state.units.find((unit) => unit.ownerId === playerId);
    if (mover === undefined) throw new Error("Missing mover");
    const movementState: GameState = {
      ...state,
      units: state.units.map((unit) =>
        unit.id === mover.id
          ? { ...unit, at: { x: emptyForest.at.x - 1, y: emptyForest.at.y } }
          : unit,
      ),
    };
    const move = applyCommand(movementState, {
      kind: "MOVE",
      unitId: mover.id,
      path: [emptyForest.at],
    });
    if (!move.ok) throw new Error(move.error.code);
    expect(move.state.units.find((unit) => unit.id === mover.id)?.at).toEqual(
      emptyForest.at,
    );

    const hostile = state.units.find((unit) => unit.ownerId !== playerId);
    if (hostile === undefined) throw new Error("Missing hostile defender");
    const defenderOwner = hostile.ownerId;
    const combatState: GameState = {
      ...state,
      players: state.players.map((player) =>
        player.id === defenderOwner
          ? { ...player, researchedTechs: [] }
          : player,
      ),
      units: state.units.map((unit) =>
        unit.id === mover.id
          ? { ...unit, at: { x: emptyForest.at.x - 1, y: emptyForest.at.y } }
          : unit.id === hostile.id
            ? { ...unit, at: emptyForest.at }
            : unit,
      ),
    };
    const ordinary = calculateCombatPreview(combatState, mover.id, {
      kind: "UNIT",
      unitId: hostile.id,
    });
    const archeryState: GameState = {
      ...combatState,
      players: combatState.players.map((player) =>
        player.id === defenderOwner
          ? { ...player, researchedTechs: ["HUNTING", "ARCHERY"] }
          : player,
      ),
    };
    const fortified = calculateCombatPreview(archeryState, mover.id, {
      kind: "UNIT",
      unitId: hostile.id,
    });
    expect(fortified.damageToDefender).toBeLessThan(ordinary.damageToDefender);
  });
});

function withExplored(
  state: GameState,
  playerId: PlayerId,
  explored: readonly Coord[],
): GameState {
  return withPlayer(state, playerId, { explored });
}

function withPlayer(
  state: GameState,
  playerId: PlayerId,
  update: Partial<GameState["players"][number]>,
): GameState {
  return {
    ...state,
    players: state.players.map((player) =>
      player.id === playerId ? { ...player, ...update } : player,
    ),
  };
}

function withTerritory(
  state: GameState,
  at: Coord,
  territoryCityId: CityState["id"] | null,
): GameState {
  return {
    ...state,
    board: {
      ...state.board,
      tiles: state.board.tiles.map((tile) =>
        sameCoord(tile.at, at) ? { ...tile, territoryCityId } : tile,
      ),
    },
  };
}

function besieged(
  state: GameState,
  city: CityState,
  playerId: PlayerId,
): GameState {
  const hostile = state.units.find((unit) => unit.ownerId !== playerId);
  const friendly = state.units.find((unit) => unit.ownerId === playerId);
  if (hostile === undefined || friendly === undefined) throw new Error("units");
  return {
    ...state,
    units: state.units.map((unit) =>
      unit.id === hostile.id
        ? { ...unit, at: city.at }
        : unit.id === friendly.id
          ? { ...unit, at: { x: 0, y: 0 } }
          : unit,
    ),
  };
}

function overflowing(state: GameState, city: CityState): GameState {
  return {
    ...state,
    cities: state.cities.map((candidate) =>
      candidate.id === city.id
        ? {
            ...candidate,
            level: Number.MAX_SAFE_INTEGER,
            population: Number.MAX_SAFE_INTEGER,
          }
        : candidate,
    ),
  };
}

function tileAt(state: GameState, at: Coord): TileState | undefined {
  return state.board.tiles.find((tile) => sameCoord(tile.at, at));
}

function sameCoord(left: Coord, right: Coord): boolean {
  return left.x === right.x && left.y === right.y;
}
