import { describe, expect, it } from "vitest";
import { chooseNormalCommand } from "../../src/ai/index";
import {
  appendReplayCommand,
  applyCommand,
  canonicalHash,
  createReplay,
  mineEligibility,
  queryPlayerCommands,
  runReplay,
  viewFor,
  type CityState,
  type Command,
  type GameState,
  type PlayerId,
  type PlayerState,
  type TileState,
} from "../../src/engine/index";
import { headless } from "../../src/headless/index";
import { createSaveEnvelope, parseSave } from "../../src/persistence/index";
import { gameStateBuilder, setupBuilder } from "../fixtures/builders";

function context(state: GameState): {
  readonly playerId: PlayerId;
  readonly player: PlayerState;
  readonly city: CityState;
  readonly fruit: TileState;
  readonly ore: TileState;
  readonly ordinaryMountain: TileState;
} {
  const playerId = state.turnOrder[state.activeSeatIndex];
  const player = state.players.find((candidate) => candidate.id === playerId);
  const city = state.cities.find((candidate) => candidate.ownerId === playerId);
  const fruit = state.board.tiles.find(
    (tile) => tile.territoryCityId === city?.id && tile.resource === "FRUIT",
  );
  const ore = state.board.tiles.find(
    (tile) => tile.territoryCityId === city?.id && tile.resource === "ORE",
  );
  const ordinaryMountain = state.board.tiles.find(
    (tile) =>
      tile.territoryCityId === city?.id &&
      tile.terrain === "MOUNTAIN" &&
      tile.resource === null,
  );
  if (
    playerId === undefined ||
    player === undefined ||
    city === undefined ||
    fruit === undefined ||
    ore === undefined ||
    ordinaryMountain === undefined
  )
    throw new Error("Missing mixed-resource fixture context");
  return { playerId, player, city, fruit, ore, ordinaryMountain };
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

function readyForFruit(state: GameState): GameState {
  const { playerId, player } = context(state);
  return replacePlayer(state, playerId, {
    stars: 20,
    researchedTechs: [...player.researchedTechs, "ORGANIZATION"],
  });
}

function variedResourceState(): GameState {
  return gameStateBuilder(setupBuilder({ seed: 3 }));
}

describe("fruit harvesting transactions", () => {
  it("charges, consumes, grows, orders events, locks the reward, and uses no PRNG", () => {
    const original = readyForFruit(variedResourceState());
    const { playerId, city, fruit } = context(original);
    const prepared: GameState = {
      ...original,
      cities: original.cities.map((candidate) =>
        candidate.id === city.id ? { ...candidate, population: 1 } : candidate,
      ),
    };
    const random = prepared.random;
    const result = applyCommand(prepared, {
      kind: "HARVEST_FRUIT",
      at: fruit.at,
    });
    if (!result.ok) throw new Error(result.error.code);
    expect(result.state.random).toBe(random);
    expect(result.state.commandIndex).toBe(prepared.commandIndex + 1);
    expect(
      result.state.players.find((player) => player.id === playerId)?.stars,
    ).toBe(18);
    expect(
      result.state.board.tiles.find((tile) => sameCoord(tile.at, fruit.at))
        ?.resource,
    ).toBeNull();
    expect(
      result.state.cities.find((item) => item.id === city.id),
    ).toMatchObject({
      level: 2,
      population: 0,
    });
    expect(result.state.pendingChoice).toEqual({
      kind: "CITY_REWARD",
      cityId: city.id,
      level: 2,
    });
    expect(result.events).toEqual([
      {
        kind: "FRUIT_HARVESTED",
        playerId,
        cityId: city.id,
        at: fruit.at,
        cost: 2,
        populationAdded: 1,
      },
      { kind: "CITY_LEVELED_UP", cityId: city.id, level: 2 },
    ]);
  });

  it("requires no unit and remains legal when a unit occupies the fruit", () => {
    const original = readyForFruit(variedResourceState());
    const { playerId, fruit } = context(original);
    const noUnit: GameState = {
      ...original,
      units: original.units.filter((unit) => unit.ownerId !== playerId),
    };
    expect(
      queryPlayerCommands(viewFor(noUnit, playerId)).map(
        ({ command }) => command,
      ),
    ).toContainEqual({ kind: "HARVEST_FRUIT", at: fruit.at });
    const occupied: GameState = {
      ...original,
      units: original.units.map((unit) =>
        unit.ownerId === playerId ? { ...unit, at: fruit.at } : unit,
      ),
    };
    expect(
      queryPlayerCommands(viewFor(occupied, playerId)).map(
        ({ command }) => command,
      ),
    ).toContainEqual({ kind: "HARVEST_FRUIT", at: fruit.at });
  });

  it("uses the exact rejection order and leaves rejected state byte-identical", () => {
    const base = variedResourceState();
    const { playerId, player, city, fruit } = context(base);
    const hiddenFruit = base.board.tiles.find(
      (tile) =>
        tile.resource === "FRUIT" &&
        !player.explored.some((at) => sameCoord(at, tile.at)),
    );
    const emptyGrass = base.board.tiles.find(
      (tile) =>
        tile.terrain === "GRASS" &&
        tile.resource === null &&
        player.explored.some((at) => sameCoord(at, tile.at)),
    );
    const neutralFruit = base.board.tiles.find(
      (tile) => tile.resource === "FRUIT" && tile.territoryCityId === null,
    );
    const enemy = base.units.find((unit) => unit.ownerId !== playerId);
    if (
      hiddenFruit === undefined ||
      emptyGrass === undefined ||
      neutralFruit === undefined ||
      enemy === undefined
    )
      throw new Error("Missing rejection-order fixture");
    const withTech = readyForFruit(base);
    const cases: readonly {
      readonly state: GameState;
      readonly command: Command;
      readonly code: string;
    }[] = [
      {
        state: base,
        command: { kind: "HARVEST_FRUIT", at: { x: -1, y: -1 } },
        code: "TILE_NOT_FOUND",
      },
      {
        state: withTech,
        command: { kind: "HARVEST_FRUIT", at: hiddenFruit.at },
        code: "TILE_UNEXPLORED",
      },
      {
        state: base,
        command: { kind: "HARVEST_FRUIT", at: fruit.at },
        code: "ORGANIZATION_REQUIRED",
      },
      {
        state: withTech,
        command: { kind: "HARVEST_FRUIT", at: emptyGrass.at },
        code: "FRUIT_INVALID_TILE",
      },
      {
        state: replacePlayer(withTech, playerId, {
          explored: [...player.explored, neutralFruit.at],
        }),
        command: { kind: "HARVEST_FRUIT", at: neutralFruit.at },
        code: "TERRITORY_NOT_OWNED",
      },
      {
        state: {
          ...withTech,
          units: withTech.units.map((unit) =>
            unit.id === enemy.id ? { ...unit, at: city.at } : unit,
          ),
        },
        command: { kind: "HARVEST_FRUIT", at: fruit.at },
        code: "CITY_BESIEGED",
      },
      {
        state: {
          ...withTech,
          cities: withTech.cities.map((candidate) =>
            candidate.id === city.id ? { ...candidate, level: 3 } : candidate,
          ),
          players: withTech.players.map((candidate) =>
            candidate.id === playerId ? { ...candidate, stars: 0 } : candidate,
          ),
        },
        command: { kind: "HARVEST_FRUIT", at: fruit.at },
        code: "INSUFFICIENT_STARS",
      },
      {
        state: replacePlayer(withTech, playerId, { stars: 1 }),
        command: { kind: "HARVEST_FRUIT", at: fruit.at },
        code: "INSUFFICIENT_STARS",
      },
      {
        state: {
          ...withTech,
          pendingChoice: { kind: "CITY_REWARD", cityId: city.id, level: 2 },
        },
        command: { kind: "HARVEST_FRUIT", at: { x: -1, y: -1 } },
        code: "PENDING_CHOICE",
      },
    ];
    for (const item of cases) {
      const beforeHash = canonicalHash(item.state);
      const result = applyCommand(item.state, item.command);
      expect(result).toMatchObject({ ok: false, error: { code: item.code } });
      if (result.ok) throw new Error("Expected rejection");
      expect(result.state).toBe(item.state);
      expect(result.state.commandIndex).toBe(item.state.commandIndex);
      expect(canonicalHash(result.state)).toBe(beforeHash);
    }
  });

  it("rejects ordinary mountains and keeps Mine legal at level 3", () => {
    const base = variedResourceState();
    const { playerId, player, city, ore, ordinaryMountain } = context(base);
    const mining = replacePlayer(base, playerId, {
      stars: 20,
      researchedTechs: [...player.researchedTechs, "CLIMBING", "MINING"],
    });
    expect(
      mineEligibility(mining, context(mining).player, ordinaryMountain.at),
    ).toMatchObject({
      legal: false,
      error: { code: "MINE_INVALID_TILE" },
    });
    const maximum: GameState = {
      ...mining,
      cities: mining.cities.map((candidate) =>
        candidate.id === city.id ? { ...candidate, level: 3 } : candidate,
      ),
    };
    const result = applyCommand(maximum, { kind: "BUILD_MINE", at: ore.at });
    expect(result).toMatchObject({
      ok: true,
      state: {
        cities: expect.arrayContaining([
          expect.objectContaining({ id: city.id, level: 3, population: 2 }),
        ]),
      },
    });
  });
});

describe("fruit observation, replay, save, and AI participation", () => {
  it("never leaks hidden resources and enumerates only explored owned fruit", () => {
    const base = readyForFruit(variedResourceState());
    const { playerId, player, fruit } = context(base);
    const hiddenFruit = base.board.tiles.find(
      (tile) =>
        tile.resource === "FRUIT" &&
        !player.explored.some((at) => sameCoord(at, tile.at)),
    );
    if (hiddenFruit === undefined) throw new Error("Missing hidden fruit");
    const view = viewFor(base, playerId);
    expect(
      view.board.tiles.find((tile) => sameCoord(tile.at, hiddenFruit.at)),
    ).toEqual({ at: hiddenFruit.at, explored: false });
    const harvests = queryPlayerCommands(view)
      .map(({ command }) => command)
      .filter(
        (command): command is Extract<Command, { kind: "HARVEST_FRUIT" }> =>
          command.kind === "HARVEST_FRUIT",
      );
    expect(harvests).toContainEqual({ kind: "HARVEST_FRUIT", at: fruit.at });
    expect(
      harvests.some((command) => sameCoord(command.at, hiddenFruit.at)),
    ).toBe(false);
  });

  it("round-trips a v5 fruit command through replay, headless, and save deterministically", async () => {
    const setup = setupBuilder({ seed: 3 });
    let state = gameStateBuilder(setup);
    let replay = createReplay(setup);
    const { fruit } = context(state);
    for (const command of [
      { kind: "RESEARCH", tech: "ORGANIZATION" },
      { kind: "HARVEST_FRUIT", at: fruit.at },
    ] as const) {
      const result = applyCommand(state, command);
      if (!result.ok) throw new Error(result.error.code);
      state = result.state;
      replay = appendReplayCommand(replay, command, state);
    }
    const first = runReplay(replay);
    const second = runReplay(replay);
    const headlessResult = await headless.run(replay);
    expect(first).toEqual(second);
    expect(headlessResult).toEqual(first);
    expect(first.events.some((event) => event.kind === "FRUIT_HARVESTED")).toBe(
      true,
    );
    const save = createSaveEnvelope(
      {
        state,
        replay,
        tallies: { citiesCaptured: 0, unitsDefeated: 0, unitsLost: 0 },
        playerTallies: state.players.map((player) => ({
          playerId: player.id,
          kills: 0,
          losses: 0,
          citiesCaptured: 0,
        })),
      },
      "2026-08-15T12:00:00.000Z",
    );
    expect(save.version).toBe(5);
    const loaded = parseSave(JSON.stringify(save));
    expect(loaded).toMatchObject({ kind: "VALID" });
    if (loaded.kind !== "VALID") throw new Error(`Save load: ${loaded.kind}`);
    expect(loaded.save.stateHash).toBe(canonicalHash(state));
  });

  it("Normal selects and applies public fruit at growth priority repeatably", () => {
    const original = gameStateBuilder(setupBuilder({ seed: 3 }));
    const { playerId, player } = context(original);
    const state = replacePlayer(original, playerId, {
      stars: 2,
      researchedTechs: [
        "CLIMBING",
        "RIDING",
        "HUNTING",
        "ORGANIZATION",
        "MINING",
        "FORESTRY",
        "ARCHERY",
        "STRATEGY",
        "MATHEMATICS",
      ],
    });
    const decision = chooseNormalCommand(viewFor(state, playerId));
    expect(decision.command?.kind).toBe("HARVEST_FRUIT");
    expect(decision.candidates[0]?.score).toMatchObject({
      priority: 880,
      immediateValue: 3,
    });
    expect(player.status).toBe("ACTIVE");
    if (decision.command === null) throw new Error("Missing AI decision");
    const first = applyCommand(state, decision.command);
    const second = applyCommand(state, decision.command);
    if (!first.ok || !second.ok) throw new Error("AI fruit command rejected");
    expect(first.events).toContainEqual({
      kind: "FRUIT_HARVESTED",
      playerId,
      cityId: context(state).city.id,
      at:
        decision.command.kind === "HARVEST_FRUIT"
          ? decision.command.at
          : { x: -1, y: -1 },
      cost: 2,
      populationAdded: 1,
    });
    expect(first.events).toEqual(second.events);
    expect(canonicalHash(first.state)).toBe(canonicalHash(second.state));
  });
});

function sameCoord(
  left: { readonly x: number; readonly y: number },
  right: { readonly x: number; readonly y: number },
): boolean {
  return left.x === right.x && left.y === right.y;
}
