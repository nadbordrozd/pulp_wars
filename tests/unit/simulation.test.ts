import { describe, expect, it } from "vitest";
import {
  applyCommand,
  FACTION_IDS,
  canonicalHash,
  canonicalJson,
  capturableTargetForUnit,
  captureEligibility,
  createGame,
  generateInitialMap,
  legalCommands,
  parseMatchSetup,
  randomState,
  revealAfterUnitStep,
  revealRadius,
  validateMapInvariants,
  viewFor,
  type Command,
  type GameState,
  type MatchSetup,
  type PlayerState,
  type UnitState,
} from "../../src/engine/index";
import { gameStateBuilder, setupBuilder } from "../fixtures/builders";
import v4MapCorpus from "../fixtures/v4-map-corpus.json";

describe("deterministic simulation kernel", () => {
  it("creates byte-identical state for identical setup", () => {
    const first = createGame(setupBuilder());
    const second = createGame(setupBuilder());
    expect(first).toEqual(second);
    if (first.ok && second.ok) {
      expect(canonicalJson(first.state)).toBe(canonicalJson(second.state));
      expect(canonicalHash(first.state)).toBe(canonicalHash(second.state));
    }
  });

  it("creates starting players, capitals, Warriors, and radius-two knowledge", () => {
    const state = gameStateBuilder();
    expect(state.board.tiles).toHaveLength(121);
    expect(state.board.tiles[0]?.at).toEqual({ x: 0, y: 0 });
    expect(state.board.tiles[120]?.at).toEqual({ x: 10, y: 10 });
    expect(state.players.map(({ id }) => id)).toEqual([1, 2]);
    const activePlayerId = state.turnOrder[state.activeSeatIndex];
    expect(
      state.players.map((player) => ({
        id: player.id,
        stars: player.stars,
      })),
    ).toEqual(
      state.players.map((player) => ({
        id: player.id,
        stars: player.id === activePlayerId ? 7 : 5,
      })),
    );
    expect(state.players.every((player) => player.explored.length === 25)).toBe(
      true,
    );
    expect(state.cities).toHaveLength(2);
    expect(
      state.cities.every((city) => city.isCapital && city.level === 1),
    ).toBe(true);
    expect(state.units).toHaveLength(2);
    expect(
      state.units.every(
        (unit) =>
          unit.type === "WARRIOR" &&
          unit.ready &&
          unit.hp === 10 &&
          unit.homeCityId !== null,
      ),
    ).toBe(true);
    expect(state.cities.map(({ id }) => id)).toEqual([1, 3]);
    expect(state.units.map(({ id }) => id)).toEqual([2, 4]);
    expect(state.nextEntityId).toBe(5);
    expect(Object.isFrozen(state)).toBe(true);
  });

  it("advances turns and rounds deterministically", () => {
    let state = gameStateBuilder();
    const initialOrder = state.turnOrder;
    for (let index = 0; index < 3; index += 1) {
      const result = applyCommand(state, { kind: "END_TURN" });
      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error(result.error.code);
      expect(result.events.map((event) => event.kind)).toEqual([
        "INCOME_PREVIEWED",
        "TURN_ENDED",
        "TURN_STARTED",
        "INCOME_AWARDED",
      ]);
      state = result.state;
    }
    expect(state.commandIndex).toBe(3);
    expect(state.activeSeatIndex).toBe(1);
    expect(state.round).toBe(2);
    const active = initialOrder[1];
    if (active === undefined) throw new Error("Missing active player");
    expect(
      legalCommands(state, active)
        .map(({ command }) => command)
        .filter(
          (command) =>
            command.kind === "RESEARCH" || command.kind === "END_TURN",
        ),
    ).toEqual([
      { kind: "RESEARCH", tech: "CLIMBING" },
      { kind: "RESEARCH", tech: "RIDING" },
      { kind: "RESEARCH", tech: "HUNTING" },
      { kind: "RESEARCH", tech: "ORGANIZATION" },
      { kind: "END_TURN" },
    ]);
  });

  it("skips eliminated seats and increments the round only on wrap", () => {
    const original = gameStateBuilder(
      setupBuilder({ aiCount: 3, width: 16, height: 16 }),
    );
    const eliminatedIds = [original.turnOrder[1], original.turnOrder[2]];
    const players: readonly PlayerState[] = original.players.map((player) => ({
      ...player,
      status: eliminatedIds.includes(player.id) ? "ELIMINATED" : "ACTIVE",
    }));
    let state: GameState = { ...original, players };
    const first = applyCommand(state, { kind: "END_TURN" });
    if (!first.ok) throw new Error(first.error.code);
    state = first.state;
    expect(state.activeSeatIndex).toBe(3);
    expect(state.round).toBe(1);
    const second = applyCommand(state, { kind: "END_TURN" });
    if (!second.ok) throw new Error(second.error.code);
    expect(second.state.activeSeatIndex).toBe(0);
    expect(second.state.round).toBe(2);
  });

  it("marks occupation only after the occupying owner's next Start Turn", () => {
    const original = gameStateBuilder();
    const activeId = original.turnOrder[original.activeSeatIndex];
    const village = original.board.tiles.find(
      (tile) => tile.site === "VILLAGE",
    );
    if (activeId === undefined || village === undefined) {
      throw new Error("Missing fixture occupation target");
    }
    const unit = original.units.find(
      (candidate) => candidate.ownerId === activeId,
    );
    if (unit === undefined) throw new Error("Missing fixture unit");
    const occupying: UnitState = {
      ...unit,
      at: village.at,
      captureEligible: false,
    };
    let state: GameState = {
      ...original,
      units: original.units.map((candidate) =>
        candidate.id === unit.id ? occupying : candidate,
      ),
    };
    expect(captureEligibility(state, unit.id)).toMatchObject({
      eligible: false,
      reason: "NOT_MARKED_AT_TURN_START",
      target: { kind: "NEUTRAL_VILLAGE" },
    });
    for (let index = 0; index < state.turnOrder.length; index += 1) {
      const result = applyCommand(state, { kind: "END_TURN" });
      if (!result.ok) throw new Error(result.error.code);
      state = result.state;
    }
    expect(captureEligibility(state, unit.id)).toMatchObject({
      eligible: true,
      target: { kind: "NEUTRAL_VILLAGE" },
    });
    const ownCity = state.cities.find((city) => city.ownerId === unit.ownerId);
    if (ownCity === undefined) throw new Error("Missing fixture home city");
    const movedAway: GameState = {
      ...state,
      units: state.units.map((candidate) =>
        candidate.id === unit.id ? { ...candidate, at: ownCity.at } : candidate,
      ),
    };
    expect(captureEligibility(movedAway, unit.id)).toMatchObject({
      eligible: false,
      reason: "NOT_OCCUPYING_TARGET",
    });
    const enemyCity = state.cities.find(
      (city) => city.ownerId !== unit.ownerId,
    );
    if (enemyCity === undefined) throw new Error("Missing enemy city");
    expect(
      capturableTargetForUnit(state, { ...unit, at: enemyCity.at }),
    ).toEqual({ kind: "ENEMY_CITY", cityId: enemyCity.id, at: enemyCity.at });
  });

  it("clips reveal radii, persists prior exploration, and applies mountain vision", () => {
    const state = gameStateBuilder();
    const clipped = revealRadius(state.board, [], { x: 0, y: 0 }, 2);
    expect(clipped.explored).toHaveLength(9);
    const persisted = revealRadius(
      state.board,
      clipped.explored,
      { x: 10, y: 10 },
      1,
    );
    expect(persisted.explored).toHaveLength(13);
    expect(persisted.revealed).toHaveLength(4);
    const mountain = state.board.tiles.find(
      (tile) => tile.terrain === "MOUNTAIN",
    );
    if (mountain === undefined) throw new Error("Generated map lacks mountain");
    const normal = revealAfterUnitStep(state.board, [], mountain.at, {
      hasClimbing: false,
    });
    const climbing = revealAfterUnitStep(state.board, [], mountain.at, {
      hasClimbing: true,
    });
    expect(climbing.explored.length).toBeGreaterThan(normal.explored.length);
  });

  it("filters every unexplored tile and entity from a player's view", () => {
    const state = gameStateBuilder();
    const viewer = state.players[0];
    if (viewer === undefined) throw new Error("Missing viewer");
    const view = viewFor(state, viewer.id);
    const hiddenTile = view.board.tiles.find((tile) => !tile.explored);
    expect(hiddenTile).toBeDefined();
    expect(hiddenTile).not.toHaveProperty("terrain");
    expect(hiddenTile).not.toHaveProperty("resource");
    expect(hiddenTile).not.toHaveProperty("site");
    expect(
      view.cities.every((city) =>
        viewer.explored.some((at) => at.x === city.at.x && at.y === city.at.y),
      ),
    ).toBe(true);
    expect(
      view.units.every((unit) =>
        viewer.explored.some((at) => at.x === unit.at.x && at.y === unit.at.y),
      ),
    ).toBe(true);
    expect(view.cities.length).toBeLessThan(state.cities.length);
    expect(view.units.length).toBeLessThan(state.units.length);
    expect(view.players[0]).not.toHaveProperty("explored");

    const enemyCity = state.cities.find((city) => city.ownerId !== viewer.id);
    if (enemyCity === undefined) throw new Error("Missing hidden city");
    const territoryEdge = state.board.tiles.find(
      (tile) =>
        tile.territoryCityId === enemyCity.id &&
        (tile.at.x !== enemyCity.at.x || tile.at.y !== enemyCity.at.y),
    );
    if (territoryEdge === undefined) throw new Error("Missing territory edge");
    const edgeKnowledge: GameState = {
      ...state,
      players: state.players.map((player) =>
        player.id === viewer.id
          ? { ...player, explored: [territoryEdge.at] }
          : player,
      ),
    };
    const edgeView = viewFor(edgeKnowledge, viewer.id);
    expect(
      edgeView.board.tiles.find(
        (tile) =>
          tile.at.x === territoryEdge.at.x && tile.at.y === territoryEdge.at.y,
      ),
    ).toMatchObject({
      explored: true,
      territoryOwnerId: enemyCity.ownerId,
      territoryCenter: null,
      territoryCityId: null,
    });
  });

  it("rejects stale or illegal unit commands atomically", () => {
    const state = gameStateBuilder();
    const city = state.cities[0];
    if (city === undefined) throw new Error("Missing city");
    const command: Command = {
      kind: "TRAIN",
      cityId: city.id,
      unit: "WARRIOR",
    };
    const result = applyCommand(state, command);
    expect(result).toMatchObject({
      ok: false,
      error: {
        code: "CITY_SPAWN_OCCUPIED",
        params: {},
      },
    });
    expect(result.state).toBe(state);
    expect(result.state.random).toBe(state.random);
    expect(result.state.commandIndex).toBe(0);
    expect("events" in result).toBe(false);
  });

  it("rejects invalid setup choices with stable codes", () => {
    const result = createGame(
      setupBuilder({ aiCount: 3, width: 11, height: 11 }),
    );
    expect(result).toEqual({
      ok: false,
      error: {
        code: "INVALID_SETUP",
        params: { field: "dimensionsForAiCount" },
      },
    });
  });

  it("creates the exact explicit Large map", () => {
    expect(
      parseMatchSetup({ ...setupBuilder(), width: 20, height: 20 }),
    ).toMatchObject({ width: 20, height: 20, aiMode: "RIVAL" });
    const result = createGame({
      ...setupBuilder(),
      width: 20,
      height: 20,
    });
    if (!result.ok) throw new Error(result.error.code);
    expect(result.state.board.tiles).toHaveLength(400);
    expect(
      result.state.board.tiles.filter((tile) => tile.site !== null),
    ).toHaveLength(20);
    expect(
      result.state.board.tiles.filter((tile) => tile.terrain === "MOUNTAIN"),
    ).toHaveLength(72);
    expect(
      result.state.board.tiles.filter((tile) => tile.terrain === "FOREST"),
    ).toHaveLength(96);
  });

  it("requires the v5 aiMode and exact seat-ordered faction fields", () => {
    const rival = setupBuilder();
    const { aiMode: _aiMode, ...missing } = rival;
    void _aiMode;
    expect(parseMatchSetup(missing)).toBeNull();
    expect(parseMatchSetup({ ...rival, aiMode: undefined })).toBeNull();
    expect(parseMatchSetup({ ...rival, aiMode: "COOPERATIVE" })).toEqual({
      ...rival,
      aiMode: "COOPERATIVE",
    });
    expect(createGame({ ...rival, aiMode: "COOPERATIVE" })).toMatchObject({
      ok: true,
      state: { setup: { aiMode: "COOPERATIVE" } },
    });
    const { factions: _factions, ...missingFactions } = rival;
    void _factions;
    expect(parseMatchSetup(missingFactions)).toBeNull();
    expect(parseMatchSetup({ ...rival, factions: undefined })).toBeNull();
    expect(parseMatchSetup({ ...rival, factions: ["ORIGINAL"] })).toBeNull();
    expect(
      parseMatchSetup({ ...rival, factions: ["ORIGINAL", "SOUR"] }),
    ).toBeNull();
    expect(
      parseMatchSetup({
        ...rival,
        factions: Object.assign(["ORIGINAL", "CANDY"], { extra: true }),
      }),
    ).toBeNull();
    const sparse = new Array(2) as unknown[];
    sparse[0] = "ORIGINAL";
    expect(parseMatchSetup({ ...rival, factions: sparse })).toBeNull();
    expect(FACTION_IDS).toEqual(["ORIGINAL", "CANDY"]);
    expect(Object.isFrozen(FACTION_IDS)).toBe(true);
  });

  it("threads immutable faction identity without changing map or PRNG", () => {
    const original = createGame(
      setupBuilder({
        seed: 0xcafe,
        aiCount: 2,
        width: 14,
        height: 14,
        factions: ["ORIGINAL", "ORIGINAL", "ORIGINAL"],
      }),
    );
    const mixed = createGame(
      setupBuilder({
        seed: 0xcafe,
        aiCount: 2,
        width: 14,
        height: 14,
        factions: ["CANDY", "ORIGINAL", "CANDY"],
      }),
    );
    if (!original.ok || !mixed.ok) throw new Error("Faction setup rejected");
    expect(mixed.state.players.map((player) => player.faction)).toEqual([
      "CANDY",
      "ORIGINAL",
      "CANDY",
    ]);
    expect(mixed.state.board).toEqual(original.state.board);
    expect(mixed.state.random).toEqual(original.state.random);
    expect(mixed.state.turnOrder).toEqual(original.state.turnOrder);
    expect(mixed.state.cities).toEqual(original.state.cities);
    expect(mixed.state.units).toEqual(original.state.units);
    expect(
      viewFor(mixed.state, mixed.state.humanPlayerId).players.map(
        (player) => player.faction,
      ),
    ).toEqual(["CANDY", "ORIGINAL", "CANDY"]);

    const tampered = {
      ...mixed.state,
      players: mixed.state.players.map((player, index) =>
        index === 0 ? { ...player, faction: "ORIGINAL" as const } : player,
      ),
    };
    const rejected = applyCommand(tampered, { kind: "END_TURN" });
    expect(rejected).toMatchObject({
      ok: false,
      error: { code: "INVALID_STATE", params: { field: "players" } },
    });
    expect(rejected.state).toBe(tampered);
  });

  it("rejects unsupported non-square dimensions 25 x 16", () => {
    const result = createGame({
      ...setupBuilder(),
      width: 25,
      height: 16,
    } as MatchSetup);
    expect(result).toMatchObject({
      ok: false,
      error: { code: "INVALID_SETUP", params: { field: "dimensions" } },
    });
  });

  it.each([
    [1, 28],
    [2, 27],
    [3, 26],
  ] as const)(
    "creates an exact Huge map for %i AI with %i neutral villages",
    (aiCount, expectedVillages) => {
      const setup = setupBuilder({
        aiCount,
        width: 25,
        height: 25,
        seed: 0,
      });
      const first = createGame(setup);
      const second = createGame(setup);
      if (!first.ok || !second.ok) throw new Error("Huge map creation failed");
      expect(canonicalJson(first.state)).toBe(canonicalJson(second.state));
      expect(first.state.board.tiles).toHaveLength(625);
      expect(
        first.state.board.tiles.filter((tile) => tile.site === "CAPITAL"),
      ).toHaveLength(aiCount + 1);
      expect(
        first.state.board.tiles.filter((tile) => tile.site === "VILLAGE"),
      ).toHaveLength(expectedVillages);
      expect(
        first.state.board.tiles.filter((tile) => tile.terrain === "MOUNTAIN"),
      ).toHaveLength(113);
      expect(
        first.state.board.tiles.filter((tile) => tile.terrain === "FOREST"),
      ).toHaveLength(150);
      expect(
        validateMapInvariants(first.state.board, aiCount + 1, expectedVillages),
      ).toEqual([]);
    },
  );

  it("reports deterministic bounded map-generation failure context", () => {
    const impossible = setupBuilder({
      aiCount: 3,
      width: 11,
      height: 11,
    }) as MatchSetup;
    const first = generateInitialMap(impossible, randomState(impossible.seed));
    const second = generateInitialMap(impossible, randomState(impossible.seed));
    expect(first).toEqual(second);
    expect(first).toMatchObject({
      ok: false,
      error: {
        code: "MAP_GENERATION_FAILED",
        params: { seed: impossible.seed, attempts: 256 },
      },
    });
  });
});

describe("v4 varied-resource map smoke coverage", () => {
  it("matches canonical seed-zero hashes and counts in both AI modes", () => {
    expect(v4MapCorpus.rulesetId).toBe("pulp-wars-poc-4");
    for (const fixture of v4MapCorpus.cases) {
      const setup = setupBuilder({
        seed: v4MapCorpus.seed,
        aiCount: fixture.aiCount as 1 | 2 | 3,
        width: fixture.size as MatchSetup["width"],
        height: fixture.size as MatchSetup["height"],
      });
      const rival = createGame(setup);
      const cooperative = createGame({ ...setup, aiMode: "COOPERATIVE" });
      if (!rival.ok || !cooperative.ok)
        throw new Error(
          `Failed v4 corpus case ${fixture.aiCount}/${fixture.size}`,
        );
      expect(canonicalHash(rival.state.board)).toBe(fixture.boardHash);
      expect(canonicalHash(cooperative.state.board)).toBe(fixture.boardHash);
      expect(
        rival.state.board.tiles.filter((tile) => tile.terrain === "MOUNTAIN"),
      ).toHaveLength(fixture.mountains);
      expect(
        rival.state.board.tiles.filter((tile) => tile.terrain === "FOREST"),
      ).toHaveLength(fixture.forests);
      expect(
        rival.state.board.tiles.filter((tile) => tile.resource === "ANIMAL"),
      ).toHaveLength(fixture.animals);
    }
  });

  it("checks a bounded paired sample across every supported size and AI count", () => {
    const mixes = new Set<string>();
    let exactlyTwo = 0;
    let moreThanTwo = 0;
    const failures: string[] = [];
    for (const fixture of v4MapCorpus.cases) {
      const aiCount = fixture.aiCount as 1 | 2 | 3;
      const width = fixture.size as MatchSetup["width"];
      for (let seed = 0; seed < 10; seed += 1) {
        const setup = setupBuilder({ aiCount, width, height: width, seed });
        const rival = createGame(setup);
        const cooperative = createGame({ ...setup, aiMode: "COOPERATIVE" });
        if (!rival.ok || !cooperative.ok) {
          failures.push(`${aiCount}/${width}/${seed}:create`);
          continue;
        }
        if (
          canonicalHash(rival.state.board) !==
          canonicalHash(cooperative.state.board)
        )
          failures.push(`${aiCount}/${width}/${seed}:mode-map-hash`);
        const invariantFailures = validateMapInvariants(
          rival.state.board,
          aiCount + 1,
          width === 20
            ? 20 - aiCount - 1
            : width === 25
              ? 30 - aiCount - 1
              : aiCount * 2 + 2,
        );
        if (invariantFailures.length)
          failures.push(
            `${aiCount}/${width}/${seed}:${invariantFailures.join(",")}`,
          );
        const expectedCells = width * width;
        if (
          rival.state.board.tiles.filter((tile) => tile.terrain === "MOUNTAIN")
            .length !== Math.floor((expectedCells * 18 + 50) / 100)
        )
          failures.push(`${aiCount}/${width}/${seed}:mountains`);
        if (
          rival.state.board.tiles.filter((tile) => tile.terrain === "FOREST")
            .length !== Math.floor((expectedCells * 24 + 50) / 100)
        )
          failures.push(`${aiCount}/${width}/${seed}:forests`);
        if (!rival.state.board.tiles.some((tile) => tile.resource === "ANIMAL"))
          failures.push(`${aiCount}/${width}/${seed}:animals`);
        for (const settlement of rival.state.board.tiles.filter(
          (tile) => tile.site === "CAPITAL" || tile.site === "VILLAGE",
        )) {
          const territory = rival.state.board.tiles.filter((tile) =>
            sameTestCoord(tile.territoryCenter, settlement.at),
          );
          const opportunities = territory.filter(
            (tile) =>
              !sameTestCoord(tile.at, settlement.at) &&
              (tile.resource !== null || tile.terrain === "FOREST"),
          ).length;
          if (opportunities < 2)
            failures.push(`${aiCount}/${width}/${seed}:opportunities`);
          if (opportunities === 2) exactlyTwo += 1;
          if (opportunities > 2) moreThanTwo += 1;
          mixes.add(
            ["FRUIT", "ORE", "ANIMAL"]
              .map(
                (resource) =>
                  territory.filter((tile) => tile.resource === resource).length,
              )
              .concat(
                territory.filter((tile) => tile.terrain === "FOREST").length,
              )
              .join(","),
          );
        }
      }
    }
    expect(failures).toEqual([]);
    expect(mixes.size).toBeGreaterThan(1);
    expect(exactlyTwo).toBeGreaterThan(0);
    expect(moreThanTwo).toBeGreaterThan(0);
  }, 30_000);
});

function sameTestCoord(
  left: { readonly x: number; readonly y: number } | null,
  right: { readonly x: number; readonly y: number },
): boolean {
  return left !== null && left.x === right.x && left.y === right.y;
}
