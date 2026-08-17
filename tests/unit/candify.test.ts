import { describe, expect, it } from "vitest";
import {
  appendReplayCommand,
  applyCommand,
  canonicalHash,
  canonicalJson,
  createReplay,
  legalCommands,
  parseCommand,
  queryPlayerCommands,
  runReplay,
  viewFor,
  wallId,
  type Command,
  type Coord,
  type CityState,
  type GameState,
  type ReplayFile,
  type UnitType,
} from "../../src/engine/index";
import { chooseNormalCommand } from "../../src/ai/index";
import { headless } from "../../src/headless/index";
import { createSaveEnvelope, parseSave } from "../../src/persistence/index";
import { gameStateBuilder, setupBuilder } from "../fixtures/builders";

const FRESH = {
  moved: false,
  attacked: false,
  recovered: false,
  captured: false,
  handled: false,
  escapeAvailable: false,
  specialActed: false,
} as const;

describe("Candify", () => {
  it("parses only the exact v5 command shapes", () => {
    expect(parseCommand({ kind: "CANDIFY", unitId: 2 })).toMatchObject({
      ok: true,
    });
    expect(
      parseCommand({ kind: "CHOOSE_CANDIFY_CITY", unitId: 2, cityId: 1 }),
    ).toMatchObject({ ok: true });
    expect(parseCommand({ kind: "CANDIFY", unitId: 2, at: null })).toEqual({
      ok: false,
      error: { code: "INVALID_COMMAND", params: { field: "CANDIFY" } },
    });
  });

  it.each(["WARRIOR", "ARCHER", "DEFENDER", "RIDER", "CATAPULT"] as const)(
    "lets a Candy %s directly sacrifice onto neutral land without altering its contents",
    (type) => {
      const { state, humanId, unitId, target, city } = neutralFrontier(type);
      const beforeTile = tileAt(state, target);
      const result = applyCommand(state, { kind: "CANDIFY", unitId });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.events).toEqual([
        { kind: "UNIT_DIED", unitId, cause: "CANDIFY" },
        {
          kind: "TILE_CANDIFIED",
          playerId: humanId,
          unitId,
          cityId: city.id,
          at: target,
          previousCityId: null,
          previousOwnerId: null,
        },
      ]);
      expect(result.state.units.some((unit) => unit.id === unitId)).toBe(false);
      expect(tileAt(result.state, target)).toEqual({
        ...beforeTile,
        territoryCityId: city.id,
        territoryCenter: city.at,
      });
      expect(result.state.random).toBe(state.random);
      expect(result.state.commandIndex).toBe(state.commandIndex + 1);
    },
  );

  it("allows Candify after Move and Wait, but rejects every terminal activation", () => {
    const arena = neutralFrontier("DEFENDER");
    const moved = withActivation(
      arena.state,
      arena.unitId,
      {
        moved: true,
        handled: true,
      },
      false,
    );
    expect(
      applyCommand(moved, { kind: "CANDIFY", unitId: arena.unitId }).ok,
    ).toBe(true);
    const waited = withActivation(arena.state, arena.unitId, { handled: true });
    expect(
      queryPlayerCommands(viewFor(waited, arena.humanId)).some(
        ({ command }) => command.kind === "CANDIFY",
      ),
    ).toBe(true);
    for (const flag of [
      "attacked",
      "recovered",
      "captured",
      "specialActed",
    ] as const) {
      const acted = withActivation(arena.state, arena.unitId, {
        [flag]: true,
        handled: true,
      });
      const result = applyCommand(acted, {
        kind: "CANDIFY",
        unitId: arena.unitId,
      });
      expect(result).toMatchObject({
        ok: false,
        error: { code: "UNIT_ALREADY_ACTED" },
      });
      if (!result.ok) expect(result.state).toBe(acted);
    }
  });

  it("allows the free Promote lifecycle action before Candify", () => {
    const arena = neutralFrontier("WARRIOR");
    const promotable = {
      ...arena.state,
      units: arena.state.units.map((unit) =>
        unit.id === arena.unitId ? { ...unit, kills: 3 } : unit,
      ),
    };
    const promoted = applyCommand(promotable, {
      kind: "PROMOTE",
      unitId: arena.unitId,
    });
    expect(promoted.ok).toBe(true);
    if (!promoted.ok) return;
    expect(
      applyCommand(promoted.state, {
        kind: "CANDIFY",
        unitId: arena.unitId,
      }).ok,
    ).toBe(true);
  });

  it("rejects Original units, friendly/settlement/non-frontier tiles, and exposes no wall action", () => {
    const arena = neutralFrontier("WARRIOR");
    const original = {
      ...arena.state,
      players: arena.state.players.map((player) =>
        player.id === arena.humanId
          ? { ...player, faction: "ORIGINAL" as const }
          : player,
      ),
      setup: {
        ...arena.state.setup,
        factions: arena.state.setup.factions.map((faction, seat) =>
          seat === 0 ? ("ORIGINAL" as const) : faction,
        ),
      },
    };
    expect(
      applyCommand(original, { kind: "CANDIFY", unitId: arena.unitId }),
    ).toMatchObject({
      ok: false,
      error: { code: "CANDY_FACTION_REQUIRED" },
    });
    const wallAt = mustFind(
      arena.state.board.tiles.find(
        (tile) =>
          tile.site === null &&
          !arena.state.units.some((unit) => sameCoord(unit.at, tile.at)),
      ),
      "wall tile",
    ).at;
    const wall = {
      id: wallId(arena.state.nextEntityId),
      ownerId: arena.humanId,
      at: wallAt,
      hp: 10,
    };
    const withWall = {
      ...arena.state,
      nextEntityId: arena.state.nextEntityId + 1,
      chocolateWalls: [wall],
    };
    expect(
      legalCommands(withWall, arena.humanId).some(
        ({ command }) =>
          command.kind === "CANDIFY" && command.unitId === (wall.id as number),
      ),
    ).toBe(false);

    const friendly = {
      ...arena.state,
      units: arena.state.units.map((unit) =>
        unit.id === arena.unitId ? { ...unit, at: arena.city.at } : unit,
      ),
    };
    expect(
      applyCommand(friendly, { kind: "CANDIFY", unitId: arena.unitId }),
    ).toMatchObject({
      ok: false,
      error: { code: "CANDIFY_INVALID_TILE" },
    });

    const settlement = {
      ...arena.state,
      board: {
        ...arena.state.board,
        tiles: arena.state.board.tiles.map((tile) =>
          sameCoord(tile.at, arena.target)
            ? { ...tile, site: "VILLAGE" as const }
            : tile,
        ),
      },
    };
    expect(
      applyCommand(settlement, { kind: "CANDIFY", unitId: arena.unitId }),
    ).toMatchObject({
      ok: false,
      error: { code: "CANDIFY_INVALID_TILE" },
    });

    const noFrontier = {
      ...arena.state,
      board: {
        ...arena.state.board,
        tiles: arena.state.board.tiles.map((tile) =>
          tile.territoryCityId === arena.city.id &&
          chebyshev(tile.at, arena.target) === 1
            ? { ...tile, territoryCityId: null, territoryCenter: null }
            : tile,
        ),
      },
    };
    expect(
      applyCommand(noFrontier, { kind: "CANDIFY", unitId: arena.unitId }),
    ).toMatchObject({
      ok: false,
      error: { code: "CANDIFY_NO_ADJACENT_CITY" },
    });
  });

  it("persists a stable tied-nearest choice, globally locks commands, then resolves stored candidates", async () => {
    const fixture = replayToCandifyTie();
    const started = applyAndAppend(fixture.state, fixture.replay, {
      kind: "CANDIFY",
      unitId: fixture.unitId,
    });
    expect(started.result.ok).toBe(true);
    if (!started.result.ok) return;
    const pending = started.result.state.pendingChoice;
    expect(pending?.kind).toBe("CANDIFY_CITY");
    if (pending?.kind !== "CANDIFY_CITY") return;
    expect(pending.candidateCityIds).toEqual(
      [...pending.candidateCityIds].sort((left, right) => left - right),
    );
    expect(started.result.events).toEqual([
      {
        kind: "CANDIFY_CITY_CHOICE_REQUIRED",
        playerId: fixture.humanId,
        unitId: fixture.unitId,
        candidateCityIds: pending.candidateCityIds,
      },
    ]);
    expect(started.result.state.units).toEqual(fixture.state.units);
    expect(started.result.state.board).toBe(fixture.state.board);
    const blocked = applyCommand(started.result.state, { kind: "END_TURN" });
    expect(blocked).toMatchObject({
      ok: false,
      error: { code: "PENDING_CHOICE", params: { kind: "CANDIFY_CITY" } },
    });
    if (!blocked.ok) expect(blocked.state).toBe(started.result.state);

    const offered = queryPlayerCommands(
      viewFor(started.result.state, fixture.humanId),
    ).map(({ command }) => command);
    expect(offered).toEqual(
      pending.candidateCityIds.map((cityId) => ({
        kind: "CHOOSE_CANDIFY_CITY",
        unitId: fixture.unitId,
        cityId,
      })),
    );
    const aiChoice = chooseNormalCommand(
      viewFor(started.result.state, fixture.humanId),
    ).command;
    expect(aiChoice).toMatchObject({
      kind: "CHOOSE_CANDIFY_CITY",
      unitId: fixture.unitId,
    });
    expect(
      aiChoice?.kind === "CHOOSE_CANDIFY_CITY" &&
        pending.candidateCityIds.includes(aiChoice.cityId),
    ).toBe(true);

    const save = createSaveEnvelope(
      {
        state: started.result.state,
        replay: started.replay,
        tallies: { citiesCaptured: 1, unitsDefeated: 0, unitsLost: 0 },
        playerTallies: started.result.state.players.map((player) => ({
          playerId: player.id,
          kills: 0,
          losses: 0,
          citiesCaptured: player.id === fixture.humanId ? 1 : 0,
        })),
      },
      "2026-08-17T00:00:00.000Z",
    );
    const loaded = parseSave(JSON.stringify(save));
    expect(loaded.kind).toBe("VALID");
    if (loaded.kind !== "VALID") return;
    expect(loaded.save.state.pendingChoice).toEqual(pending);
    expect(canonicalHash(loaded.save.state)).toBe(
      canonicalHash(started.result.state),
    );

    const chosenCityId = pending.candidateCityIds[0];
    expect(chosenCityId).toBeDefined();
    if (chosenCityId === undefined) return;
    const chosen = applyAndAppend(started.result.state, started.replay, {
      kind: "CHOOSE_CANDIFY_CITY",
      unitId: fixture.unitId,
      cityId: chosenCityId,
    });
    expect(chosen.result.ok).toBe(true);
    if (!chosen.result.ok) return;
    expect(chosen.result.events.map((event) => event.kind)).toEqual([
      "UNIT_DIED",
      "TILE_CANDIFIED",
    ]);
    const replayed = runReplay(chosen.replay);
    expect(replayed.stateHash).toBe(canonicalHash(chosen.result.state));
    expect(canonicalJson(replayed.state)).toBe(
      canonicalJson(chosen.result.state),
    );
    const headlessRun = await headless.run(chosen.replay);
    expect(headlessRun.stateHash).toBe(replayed.stateHash);
    expect(headlessRun.events).toEqual(replayed.events);
  }, 20_000);

  it("uses exact choice validation order without recomputing stored candidates", () => {
    const fixture = replayToCandifyTie();
    const started = applyCommand(fixture.state, {
      kind: "CANDIFY",
      unitId: fixture.unitId,
    });
    expect(started.ok).toBe(true);
    if (!started.ok || started.state.pendingChoice?.kind !== "CANDIFY_CITY")
      return;
    const firstCandidate = started.state.pendingChoice.candidateCityIds[0];
    expect(firstCandidate).toBeDefined();
    if (firstCandidate === undefined) return;
    expect(
      applyCommand(started.state, {
        kind: "CHOOSE_CANDIFY_CITY",
        unitId: (fixture.unitId + 1000) as typeof fixture.unitId,
        cityId: firstCandidate,
      }),
    ).toMatchObject({ ok: false, error: { code: "CANDIFY_CHOICE_INVALID" } });
    const enemyCity = started.state.cities.find(
      (city) => city.ownerId !== fixture.humanId,
    );
    expect(enemyCity).toBeDefined();
    if (enemyCity === undefined) return;
    expect(
      applyCommand(started.state, {
        kind: "CHOOSE_CANDIFY_CITY",
        unitId: fixture.unitId,
        cityId: enemyCity.id,
      }),
    ).toMatchObject({ ok: false, error: { code: "CITY_NOT_OWNED" } });
    expect(
      applyCommand(started.state, {
        kind: "CHOOSE_CANDIFY_CITY",
        unitId: fixture.unitId,
        cityId: (started.state.nextEntityId + 1000) as typeof enemyCity.id,
      }),
    ).toMatchObject({ ok: false, error: { code: "CITY_NOT_FOUND" } });

    const extraOwned = {
      ...started.state,
      cities: started.state.cities.map((city) =>
        city.id === enemyCity.id ? { ...city, ownerId: fixture.humanId } : city,
      ),
    };
    expect(
      applyCommand(extraOwned, {
        kind: "CHOOSE_CANDIFY_CITY",
        unitId: fixture.unitId,
        cityId: enemyCity.id,
      }),
    ).toMatchObject({
      ok: false,
      error: { code: "CANDIFY_CITY_NOT_CANDIDATE" },
    });
  }, 20_000);

  it("annexes hostile leaf territory, preserves tile content, and reports former ownership", () => {
    const arena = hostileFrontier(false);
    const before = tileAt(arena.state, arena.target);
    const result = applyCommand(arena.state, {
      kind: "CANDIFY",
      unitId: arena.unitId,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.events[1]).toEqual({
      kind: "TILE_CANDIFIED",
      playerId: arena.humanId,
      unitId: arena.unitId,
      cityId: arena.city.id,
      at: arena.target,
      previousCityId: arena.enemyCity.id,
      previousOwnerId: arena.enemyCity.ownerId,
    });
    expect(tileAt(result.state, arena.target)).toEqual({
      ...before,
      territoryCityId: arena.city.id,
      territoryCenter: arena.city.at,
    });
  });

  it("rejects hostile articulation theft atomically before city selection", () => {
    const arena = hostileFrontier(true);
    expect(
      queryPlayerCommands(viewFor(arena.state, arena.humanId)).some(
        ({ command }) =>
          command.kind === "CANDIFY" && command.unitId === arena.unitId,
      ),
    ).toBe(false);
    const before = canonicalJson(arena.state);
    const result = applyCommand(arena.state, {
      kind: "CANDIFY",
      unitId: arena.unitId,
    });
    expect(result).toMatchObject({
      ok: false,
      error: { code: "CANDIFY_WOULD_DISCONNECT" },
    });
    if (!result.ok) {
      expect(result.state).toBe(arena.state);
      expect(canonicalJson(result.state)).toBe(before);
    }
  });

  it("forbids cooperative AI annexation of allied territory", () => {
    const arena = alliedFrontier();
    const result = applyCommand(arena.state, {
      kind: "CANDIFY",
      unitId: arena.unitId,
    });
    expect(result).toMatchObject({
      ok: false,
      error: { code: "TARGET_ALLIED" },
    });
    if (!result.ok) expect(result.state).toBe(arena.state);
  });

  it("does not reveal a Candified tile or its ownership to an unexplored viewer", () => {
    const arena = neutralFrontier("WARRIOR");
    const opponent = mustFind(
      arena.state.players.find((player) => player.id !== arena.humanId),
      "opponent",
    );
    const hiddenState = {
      ...arena.state,
      players: arena.state.players.map((player) =>
        player.id === opponent.id
          ? {
              ...player,
              explored: player.explored.filter(
                (at) => !sameCoord(at, arena.target),
              ),
            }
          : player,
      ),
    };
    const before = viewFor(hiddenState, opponent.id);
    const result = applyCommand(hiddenState, {
      kind: "CANDIFY",
      unitId: arena.unitId,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const after = viewFor(result.state, opponent.id);
    expect(tileViewAt(before, arena.target)).toEqual({
      at: arena.target,
      explored: false,
    });
    expect(tileViewAt(after, arena.target)).toEqual(
      tileViewAt(before, arena.target),
    );
    expect(after.units).toEqual(before.units);
    expect(after.cities).toEqual(before.cities);
    expect(after.chocolateWalls).toEqual(before.chocolateWalls);
  });
});

function neutralFrontier(type: UnitType) {
  const setup = setupBuilder({ factions: ["CANDY", "ORIGINAL"] });
  const initial = gameStateBuilder(setup);
  const human = mustFind(
    initial.players.find((player) => player.controller === "HUMAN"),
    "human",
  );
  const city = mustFind(
    initial.cities.find((candidate) => candidate.ownerId === human.id),
    "human city",
  );
  const unit = mustFind(
    initial.units.find((candidate) => candidate.ownerId === human.id),
    "human unit",
  );
  const target = initial.board.tiles.find(
    (tile) =>
      tile.site === null &&
      tile.territoryCityId === null &&
      initial.board.tiles.some(
        (owned) =>
          owned.territoryCityId === city.id &&
          chebyshev(owned.at, tile.at) === 1,
      ),
  )?.at;
  if (target === undefined) throw new Error("No neutral Candify frontier");
  const activeSeatIndex = initial.turnOrder.indexOf(human.id);
  return {
    humanId: human.id,
    unitId: unit.id,
    city,
    target,
    state: {
      ...initial,
      activeSeatIndex,
      players: initial.players.map((player) =>
        player.id === human.id
          ? { ...player, explored: initial.board.tiles.map((tile) => tile.at) }
          : player,
      ),
      units: initial.units.map((candidate) =>
        candidate.id === unit.id
          ? {
              ...candidate,
              type,
              at: target,
              ready: true,
              captureEligible: false,
              activation: FRESH,
            }
          : candidate,
      ),
    },
  };
}

function hostileFrontier(disconnect: boolean) {
  for (let seed = 0; seed < 100; seed += 1) {
    const base = neutralFrontierForSeed(seed, "WARRIOR");
    const enemyCity = base.state.cities.find(
      (city) => city.ownerId !== base.humanId,
    );
    if (enemyCity === undefined) continue;
    const path = neutralPathFromCity(base.state, enemyCity, base.target);
    if (path === null) continue;
    let tiles = base.state.board.tiles.map((tile) =>
      path.some((at) => sameCoord(at, tile.at))
        ? {
            ...tile,
            territoryCityId: enemyCity.id,
            territoryCenter: enemyCity.at,
          }
        : tile,
    );
    if (disconnect) {
      const prior = path.at(-2);
      const extension = adjacentCoords(base.state, base.target).find((at) => {
        const tile = tiles.find((candidate) => sameCoord(candidate.at, at));
        return (
          tile?.site === null &&
          tile.territoryCityId === null &&
          (prior === undefined || chebyshev(prior, at) > 1) &&
          !tiles.some(
            (candidate) =>
              candidate.territoryCityId === enemyCity.id &&
              !sameCoord(candidate.at, base.target) &&
              chebyshev(candidate.at, at) === 1,
          )
        );
      });
      if (extension === undefined) continue;
      tiles = tiles.map((tile) =>
        sameCoord(tile.at, extension)
          ? {
              ...tile,
              territoryCityId: enemyCity.id,
              territoryCenter: enemyCity.at,
            }
          : tile,
      );
    }
    return {
      ...base,
      enemyCity,
      state: { ...base.state, board: { ...base.state.board, tiles } },
    };
  }
  throw new Error("Unable to create hostile Candify frontier");
}

function alliedFrontier() {
  const setup = setupBuilder({
    seed: 0,
    aiCount: 2,
    width: 14,
    height: 14,
    aiMode: "COOPERATIVE",
    factions: ["ORIGINAL", "CANDY", "ORIGINAL"],
  });
  const initial = gameStateBuilder(setup);
  const actor = mustFind(
    initial.players.find(
      (player) => player.controller === "AI" && player.faction === "CANDY",
    ),
    "Candy AI",
  );
  const ally = mustFind(
    initial.players.find(
      (player) => player.controller === "AI" && player.id !== actor.id,
    ),
    "allied AI",
  );
  const city = mustFind(
    initial.cities.find((candidate) => candidate.ownerId === actor.id),
    "Candy AI city",
  );
  const alliedCity = mustFind(
    initial.cities.find((candidate) => candidate.ownerId === ally.id),
    "allied AI city",
  );
  const unit = mustFind(
    initial.units.find((candidate) => candidate.ownerId === actor.id),
    "Candy AI unit",
  );
  const target = initial.board.tiles.find(
    (tile) =>
      tile.site === null &&
      tile.territoryCityId === null &&
      initial.board.tiles.some(
        (owned) =>
          owned.territoryCityId === city.id &&
          chebyshev(owned.at, tile.at) === 1,
      ),
  )?.at;
  if (target === undefined) throw new Error("No allied frontier target");
  const path = neutralPathFromCity(initial, alliedCity, target);
  if (path === null) throw new Error("No allied territory path");
  return {
    unitId: unit.id,
    target,
    state: {
      ...initial,
      activeSeatIndex: initial.turnOrder.indexOf(actor.id),
      board: {
        ...initial.board,
        tiles: initial.board.tiles.map((tile) =>
          path.some((at) => sameCoord(at, tile.at))
            ? {
                ...tile,
                territoryCityId: alliedCity.id,
                territoryCenter: alliedCity.at,
              }
            : tile,
        ),
      },
      players: initial.players.map((player) =>
        player.id === actor.id
          ? { ...player, explored: initial.board.tiles.map((tile) => tile.at) }
          : player,
      ),
      units: initial.units.map((candidate) =>
        candidate.id === unit.id
          ? { ...candidate, at: target, ready: true, activation: FRESH }
          : candidate,
      ),
    },
  };
}

function neutralFrontierForSeed(seed: number, type: UnitType) {
  const setup = setupBuilder({ seed, factions: ["CANDY", "ORIGINAL"] });
  const initial = gameStateBuilder(setup);
  const human = mustFind(
    initial.players.find((player) => player.controller === "HUMAN"),
    "human",
  );
  const city = mustFind(
    initial.cities.find((candidate) => candidate.ownerId === human.id),
    "human city",
  );
  const unit = mustFind(
    initial.units.find((candidate) => candidate.ownerId === human.id),
    "human unit",
  );
  const target = initial.board.tiles.find(
    (tile) =>
      tile.site === null &&
      tile.territoryCityId === null &&
      initial.board.tiles.some(
        (owned) =>
          owned.territoryCityId === city.id &&
          chebyshev(owned.at, tile.at) === 1,
      ),
  )?.at;
  if (target === undefined) throw new Error("No neutral Candify frontier");
  return {
    humanId: human.id,
    unitId: unit.id,
    city,
    target,
    state: {
      ...initial,
      activeSeatIndex: initial.turnOrder.indexOf(human.id),
      players: initial.players.map((player) =>
        player.id === human.id
          ? { ...player, explored: initial.board.tiles.map((tile) => tile.at) }
          : player,
      ),
      units: initial.units.map((candidate) =>
        candidate.id === unit.id
          ? { ...candidate, type, at: target, ready: true, activation: FRESH }
          : candidate,
      ),
    },
  };
}

function neutralPathFromCity(
  state: GameState,
  city: CityState,
  target: Coord,
): readonly Coord[] | null {
  const queue = state.board.tiles
    .filter((tile) => tile.territoryCityId === city.id)
    .map((tile) => [tile.at] as readonly Coord[]);
  const visited = new Set(
    queue.map((path) => key(mustFind(path[0], "territory path start"))),
  );
  while (queue.length > 0) {
    const path = queue.shift();
    if (path === undefined) break;
    const current = mustFind(path.at(-1), "territory path end");
    for (const at of adjacentCoords(state, current)) {
      const atKey = key(at);
      if (visited.has(atKey)) continue;
      const tile = tileAt(state, at);
      if (
        !sameCoord(at, target) &&
        (tile.site !== null || tile.territoryCityId !== null)
      )
        continue;
      const next = [...path, at];
      if (sameCoord(at, target)) return next.slice(1);
      visited.add(atKey);
      queue.push(next);
    }
  }
  return null;
}

function adjacentCoords(state: GameState, at: Coord): readonly Coord[] {
  const result: Coord[] = [];
  for (let y = at.y - 1; y <= at.y + 1; y += 1) {
    for (let x = at.x - 1; x <= at.x + 1; x += 1) {
      if (
        (x !== at.x || y !== at.y) &&
        x >= 0 &&
        y >= 0 &&
        x < state.board.width &&
        y < state.board.height
      )
        result.push({ x, y });
    }
  }
  return result;
}

function withActivation(
  state: GameState,
  unitId: number,
  activation: Partial<GameState["units"][number]["activation"]>,
  ready = true,
): GameState {
  return {
    ...state,
    units: state.units.map((unit) =>
      unit.id === unitId
        ? { ...unit, ready, activation: { ...unit.activation, ...activation } }
        : unit,
    ),
  };
}

interface TiedCandifyFixture {
  readonly state: GameState;
  readonly replay: ReplayFile;
  readonly humanId: GameState["humanPlayerId"];
  readonly unitId: GameState["units"][number]["id"];
}

let tiedCandifyFixture: TiedCandifyFixture | null = null;

function replayToCandifyTie(): TiedCandifyFixture {
  if (tiedCandifyFixture !== null) return tiedCandifyFixture;
  for (let seed = 0; seed < 200; seed += 1) {
    const setup = setupBuilder({
      seed,
      width: 20,
      height: 20,
      factions: ["CANDY", "ORIGINAL"],
    });
    let state = gameStateBuilder(setup);
    let replay = createReplay(setup);
    const human = mustFind(
      state.players.find((player) => player.controller === "HUMAN"),
      "human",
    );
    const capital = mustFind(
      state.cities.find((city) => city.ownerId === human.id),
      "capital",
    );
    const unit = mustFind(
      state.units.find((candidate) => candidate.ownerId === human.id),
      "founder",
    );
    const villages = state.board.tiles.filter(
      (tile) => tile.site === "VILLAGE" && chebyshev(tile.at, capital.at) === 6,
    );
    for (const village of villages) {
      const target = state.board.tiles.find(
        (tile) =>
          tile.site === null &&
          chebyshev(tile.at, capital.at) === 3 &&
          chebyshev(tile.at, village.at) === 3,
      )?.at;
      if (target === undefined) continue;
      const route = straightRoute(capital.at, village.at);
      const capitalExtensionRoute = straightRoute(capital.at, target);
      const villageExtensionRoute = straightRoute(village.at, target);
      if (
        route.length !== 6 ||
        capitalExtensionRoute.length !== 3 ||
        villageExtensionRoute.length !== 3 ||
        [...route, ...capitalExtensionRoute, ...villageExtensionRoute].some(
          (at) => tileAt(state, at).terrain === "MOUNTAIN",
        )
      )
        continue;
      let failed = false;
      for (const destination of route) {
        ({ state, replay } = advanceToHuman(state, replay, human.id));
        const move = legalCommands(state, human.id)
          .map(({ command }) => command)
          .find(
            (command): command is Extract<Command, { kind: "MOVE" }> =>
              command.kind === "MOVE" &&
              command.unitId === unit.id &&
              sameCoord(command.path.at(-1), destination),
          );
        if (move === undefined) {
          failed = true;
          break;
        }
        ({ state, replay } = accepted(state, replay, move));
        ({ state, replay } = accepted(state, replay, { kind: "END_TURN" }));
      }
      if (failed) continue;
      ({ state, replay } = advanceToHuman(state, replay, human.id));
      const capture: Command = { kind: "CAPTURE", unitId: unit.id };
      const captured = applyAndAppend(state, replay, capture);
      if (!captured.result.ok) continue;
      state = captured.result.state;
      replay = captured.replay;
      ({ state, replay } = accepted(state, replay, { kind: "END_TURN" }));

      // Vacate the captured center without occupying its extension route.
      ({ state, replay } = advanceToHuman(state, replay, human.id));
      const villageFirstStep = villageExtensionRoute[0];
      if (villageFirstStep === undefined) continue;
      const sideMove = legalCommands(state, human.id)
        .map(({ command }) => command)
        .filter(
          (command): command is Extract<Command, { kind: "MOVE" }> =>
            command.kind === "MOVE" && command.unitId === unit.id,
        )
        .find(
          (command) =>
            !sameCoord(command.path.at(-1), villageFirstStep) &&
            tileAt(
              state,
              mustFind(command.path.at(-1), "side move destination"),
            ).territoryCityId !== null,
        );
      if (sideMove === undefined) continue;
      ({ state, replay } = accepted(state, replay, sideMove));
      ({ state, replay } = accepted(state, replay, { kind: "END_TURN" }));

      ({ state, replay } = advanceToHuman(state, replay, human.id));
      const ownedCities = state.cities
        .filter((city) => city.ownerId === human.id)
        .sort((left, right) => left.id - right.id);
      if (ownedCities.length !== 2) continue;
      const trainedIds: number[] = [];
      for (const city of ownedCities) {
        const train = legalCommands(state, human.id)
          .map(({ command }) => command)
          .find(
            (command): command is Extract<Command, { kind: "TRAIN" }> =>
              command.kind === "TRAIN" &&
              command.cityId === city.id &&
              command.unit === "WARRIOR",
          );
        if (train === undefined) {
          failed = true;
          break;
        }
        const trained = applyAndAppend(state, replay, train);
        if (!trained.result.ok) {
          failed = true;
          break;
        }
        const event = trained.result.events.find(
          (candidate) => candidate.kind === "UNIT_TRAINED",
        );
        if (event?.kind !== "UNIT_TRAINED") {
          failed = true;
          break;
        }
        trainedIds.push(event.unitId);
        state = trained.result.state;
        replay = trained.replay;
      }
      if (failed || trainedIds.length !== 2) continue;
      ({ state, replay } = accepted(state, replay, { kind: "END_TURN" }));

      const extensionRoutes = [capitalExtensionRoute, villageExtensionRoute];
      for (let step = 0; step < 2 && !failed; step += 1) {
        ({ state, replay } = advanceToHuman(state, replay, human.id));
        for (let index = 0; index < trainedIds.length; index += 1) {
          const trainedId = trainedIds[index];
          const destination = extensionRoutes[index]?.[step];
          if (trainedId === undefined || destination === undefined) {
            failed = true;
            break;
          }
          const move = legalCommands(state, human.id)
            .map(({ command }) => command)
            .find(
              (command): command is Extract<Command, { kind: "MOVE" }> =>
                command.kind === "MOVE" &&
                command.unitId === trainedId &&
                sameCoord(command.path.at(-1), destination),
            );
          if (move === undefined) {
            failed = true;
            break;
          }
          ({ state, replay } = accepted(state, replay, move));
          if (step === 1) {
            const candify: Command = {
              kind: "CANDIFY",
              unitId: trainedId as typeof unit.id,
            };
            const applied = applyAndAppend(state, replay, candify);
            if (!applied.result.ok) {
              failed = true;
              break;
            }
            state = applied.result.state;
            replay = applied.replay;
          }
        }
        if (!failed)
          ({ state, replay } = accepted(state, replay, { kind: "END_TURN" }));
      }
      if (failed) continue;

      for (let turn = 0; turn < 12; turn += 1) {
        ({ state, replay } = advanceToHuman(state, replay, human.id));
        const founder = state.units.find(
          (candidate) => candidate.id === unit.id,
        );
        if (founder === undefined) {
          failed = true;
          break;
        }
        if (sameCoord(founder.at, target)) break;
        const move = legalCommands(state, human.id)
          .map(({ command }) => command)
          .filter(
            (command): command is Extract<Command, { kind: "MOVE" }> =>
              command.kind === "MOVE" && command.unitId === unit.id,
          )
          .sort(
            (left, right) =>
              chebyshev(
                mustFind(left.path.at(-1), "left move destination"),
                target,
              ) -
              chebyshev(
                mustFind(right.path.at(-1), "right move destination"),
                target,
              ),
          )[0];
        if (move === undefined) {
          failed = true;
          break;
        }
        ({ state, replay } = accepted(state, replay, move));
        if (!sameCoord(move.path.at(-1), target))
          ({ state, replay } = accepted(state, replay, { kind: "END_TURN" }));
      }
      if (failed) continue;
      const candify = legalCommands(state, human.id)
        .map(({ command }) => command)
        .find(
          (command) => command.kind === "CANDIFY" && command.unitId === unit.id,
        );
      if (candify !== undefined) {
        tiedCandifyFixture = {
          state,
          replay,
          humanId: human.id,
          unitId: unit.id,
        };
        return tiedCandifyFixture;
      }
    }
  }
  throw new Error("Unable to construct deterministic tied Candify replay");
}

function advanceToHuman(
  state: GameState,
  replay: ReplayFile,
  humanId: number,
): { state: GameState; replay: ReplayFile } {
  while (state.turnOrder[state.activeSeatIndex] !== humanId) {
    ({ state, replay } = accepted(state, replay, { kind: "END_TURN" }));
  }
  return { state, replay };
}

function accepted(state: GameState, replay: ReplayFile, command: Command) {
  const applied = applyAndAppend(state, replay, command);
  if (!applied.result.ok)
    throw new Error(`${command.kind} rejected: ${applied.result.error.code}`);
  return { state: applied.result.state, replay: applied.replay };
}

function applyAndAppend(
  state: GameState,
  replay: ReplayFile,
  command: Command,
) {
  const result = applyCommand(state, command);
  return {
    result,
    replay: result.ok
      ? appendReplayCommand(replay, command, result.state)
      : replay,
  };
}

function straightRoute(from: Coord, to: Coord): readonly Coord[] {
  const route: Coord[] = [];
  let current = from;
  while (!sameCoord(current, to)) {
    current = {
      x: current.x + Math.sign(to.x - current.x),
      y: current.y + Math.sign(to.y - current.y),
    };
    route.push(current);
  }
  return route;
}

function tileAt(state: GameState, at: Coord) {
  const tile = state.board.tiles.find((candidate) =>
    sameCoord(candidate.at, at),
  );
  if (tile === undefined) throw new Error("Tile missing");
  return tile;
}

function tileViewAt(view: ReturnType<typeof viewFor>, at: Coord) {
  return view.board.tiles.find((tile) => sameCoord(tile.at, at));
}

function key(at: Coord): string {
  return `${at.x},${at.y}`;
}

function mustFind<T>(value: T | undefined, label: string): T {
  if (value === undefined) throw new Error(`Missing ${label}`);
  return value;
}

function chebyshev(left: Coord, right: Coord): number {
  return Math.max(Math.abs(left.x - right.x), Math.abs(left.y - right.y));
}

function sameCoord(left: Coord | undefined, right: Coord): boolean {
  return left?.x === right.x && left.y === right.y;
}
