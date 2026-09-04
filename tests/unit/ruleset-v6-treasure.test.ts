import { describe, expect, it } from "vitest";
import {
  RULESET_6_ID,
  SPATIAL_ECONOMY_REVISION,
  applyCommandV6,
  appendReplayCommandV6,
  createPlayableGameV6,
  createReplayV6,
  effectiveRoleRuleV6,
  generateInitialMapV6,
  nextBounded,
  placeTreasureChestsV6,
  parseGameStateV6,
  queryPlayerCommandsV6,
  runReplayV6,
  treasureChestCountV6,
  unitId,
  viewForV6,
  type CommandV6,
  type BoardStateV6,
  type CoordV6,
  type GameStateV6,
  type MatchSetupV6,
  type PlayerId,
} from "../../src/engine/index";
import { scoreCommandV6 } from "../../src/ai/v6";
import { parseEventV6 } from "../../src/engine/v6/event-schema";
import { buildRenderPlanV6 } from "../../src/render/canvas/render-plan-v6";

describe("ruleset-6 neutral treasure chests", () => {
  it.each([
    [11, 1, 2],
    [14, 2, 2],
    [16, 3, 2],
    [20, 3, 4],
    [25, 3, 5],
  ] as const)(
    "places %i-map treasures deterministically on eligible reachable land",
    (size, aiCount, expected) => {
      const first = generateInitialMapV6(setup(size, aiCount, 91));
      const second = generateInitialMapV6(setup(size, aiCount, 91));
      if (!first.ok || !second.ok) throw new Error("map generation failed");
      expect(first).toEqual(second);
      expect(treasureChestCountV6(size)).toBe(expected);
      expect(first.map.treasureChests).toHaveLength(expected);
      expect(new Set(first.map.treasureChests.map(coordKey))).toHaveLength(
        expected,
      );
      expect(first.map.treasureChests).toEqual(
        [...first.map.treasureChests].sort(compareCoords),
      );
      for (const chest of first.map.treasureChests) {
        const tile = first.map.board.tiles[chest.y * size + chest.x];
        expect(tile?.terrain).not.toBe("MOUNTAIN");
        expect(tile).toMatchObject({
          site: null,
          resource: null,
          improvement: null,
        });
      }
    },
  );

  it("fails safely with fewer chests when a constrained board has too few eligible cells", () => {
    const board: BoardStateV6 = {
      width: 11,
      height: 11,
      tiles: Array.from({ length: 121 }, (_value, index) => ({
        at: { x: index % 11, y: Math.floor(index / 11) },
        terrain:
          index === 0 || index === 1
            ? ("GRASS" as const)
            : ("MOUNTAIN" as const),
        resource: null,
        improvement: null,
        road: false,
        site: index === 0 ? ("CAPITAL" as const) : null,
        territoryCityId: null,
      })),
    };
    const initial = { algorithm: "MULBERRY32", version: 1, state: 17 } as const;
    const first = placeTreasureChestsV6(board, [{ x: 0, y: 0 }], initial);
    const second = placeTreasureChestsV6(board, [{ x: 0, y: 0 }], initial);
    expect(first).toEqual(second);
    expect(first.treasureChests).toEqual([{ x: 1, y: 0 }]);
    expect(first.random).not.toEqual(initial);
  });

  it.each(["ORIGINAL", "CANDY"] as const)(
    "captures a deterministic faction-appropriate HEAVY reward for %s",
    (faction) => {
      const fixture = movableTreasureFixture(faction, 1);
      const beforeNext = fixture.state.nextEntityId;
      const result = applyCommandV6(
        fixture.state,
        fixture.actor,
        fixture.command,
      );
      expect(result.accepted).toBe(true);
      if (!result.accepted) return;
      expect(result.state.treasureChests).toEqual([]);
      const heavy = result.state.units.find(
        (unit) => unit.id === unitId(beforeNext),
      );
      expect(heavy).toMatchObject({
        ownerId: fixture.actor,
        role: "HEAVY",
        hp: effectiveRoleRuleV6(faction, "HEAVY").maxHp,
        maxHp: effectiveRoleRuleV6(faction, "HEAVY").maxHp,
        activation: expect.objectContaining({ handled: true }),
      });
      expect(heavy?.at).toEqual(
        firstLegalHeavySpawn(fixture.state, fixture.destination),
      );
      expect(result.events.map((event) => event.kind)).toContain(
        "TREASURE_CAPTURED",
      );
      const event = result.events.find(
        (candidate) => candidate.kind === "TREASURE_CAPTURED",
      );
      expect(event).toMatchObject({
        requestedReward: "HEAVY",
        grantedReward: "HEAVY",
        heavyFallback: false,
        coinDelta: 0,
        spawnedUnitId: unitId(beforeNext),
      });
      expect(event === undefined ? null : parseEventV6(event)).toEqual({
        ok: true,
        value: event,
      });
      expect(
        event === undefined
          ? null
          : parseEventV6({ ...event, heavyFallback: true }),
      ).toEqual({ ok: false, field: "TREASURE_CAPTURED" });
    },
  );

  it("awards exactly five Coins on the coin branch and consumes the chest once", () => {
    const fixture = movableTreasureFixture("ORIGINAL", 0);
    const coinsBefore = fixture.state.players.find(
      (player) => player.id === fixture.actor,
    )?.coins;
    const result = applyCommandV6(
      fixture.state,
      fixture.actor,
      fixture.command,
    );
    expect(result.accepted).toBe(true);
    if (!result.accepted || coinsBefore === undefined) return;
    expect(
      result.state.players.find((player) => player.id === fixture.actor)?.coins,
    ).toBe(coinsBefore + 5);
    expect(result.state.treasureChests).toEqual([]);
    expect(result.events).toContainEqual(
      expect.objectContaining({
        kind: "TREASURE_CAPTURED",
        requestedReward: "COINS",
        grantedReward: "COINS",
        coinDelta: 5,
        heavyFallback: false,
      }),
    );
  });

  it("falls back atomically to Coins when the owning city is at unit capacity", () => {
    const fixture = movableTreasureFixture("ORIGINAL", 1);
    const city = fixture.state.cities.find(
      (candidate) => candidate.ownerId === fixture.actor,
    );
    const sourceUnit = fixture.state.units.find(
      (candidate) => candidate.ownerId === fixture.actor,
    );
    if (city === undefined || sourceUnit === undefined)
      throw new Error("missing fixture entities");
    const full: GameStateV6 = {
      ...fixture.state,
      nextEntityId: fixture.state.nextEntityId + 1,
      units: [
        ...fixture.state.units,
        {
          ...sourceUnit,
          id: unitId(fixture.state.nextEntityId),
          at: freeTile(fixture.state, [fixture.destination]),
          activation: { ...sourceUnit.activation, handled: true },
        },
      ],
    };
    expect(parseGameStateV6(full)).toEqual(full);
    const coinsBefore = full.players.find(
      (player) => player.id === fixture.actor,
    )?.coins;
    const result = applyCommandV6(full, fixture.actor, fixture.command);
    expect(result.accepted).toBe(true);
    if (!result.accepted || coinsBefore === undefined) return;
    expect(result.state.units).toHaveLength(full.units.length);
    expect(
      result.state.players.find((player) => player.id === fixture.actor)?.coins,
    ).toBe(coinsBefore + 5);
    expect(result.events).toContainEqual(
      expect.objectContaining({
        kind: "TREASURE_CAPTURED",
        requestedReward: "HEAVY",
        grantedReward: "COINS",
        heavyFallback: true,
      }),
    );
  });

  it("rejects Coin overflow without consuming the chest, PRNG draw, or move", () => {
    const fixture = movableTreasureFixture("ORIGINAL", 0);
    const overflow: GameStateV6 = {
      ...fixture.state,
      players: fixture.state.players.map((player) =>
        player.id === fixture.actor
          ? { ...player, coins: Number.MAX_SAFE_INTEGER - 4 }
          : player,
      ),
    };
    const result = applyCommandV6(overflow, fixture.actor, fixture.command);
    expect(result).toEqual({
      accepted: false,
      state: overflow,
      events: [],
      error: { code: "INTEGER_OVERFLOW", params: {} },
    });
  });

  it("exposes chests without hidden mechanics and renders them above fog", () => {
    const fixture = movableTreasureFixture("ORIGINAL", 0);
    const hidden = freeTile(
      fixture.state,
      fixture.state.players.flatMap((p) => p.explored),
    );
    const state = { ...fixture.state, treasureChests: [hidden] };
    for (const player of state.players) {
      expect(viewForV6(state, player.id).treasureChests).toEqual([hidden]);
    }
    const view = viewForV6(state, fixture.actor);
    const entries = buildRenderPlanV6(view).entries.filter(
      (entry) => coordKey(entry.at) === coordKey(hidden),
    );
    expect(entries.map((entry) => entry.kind)).toEqual(["FOG", "TREASURE"]);
  });

  it("values a legal direct chest move ahead of ordinary movement", () => {
    const fixture = movableTreasureFixture("ORIGINAL", 0);
    const view = viewForV6(fixture.state, fixture.actor);
    expect(scoreCommandV6(view, fixture.command)).toMatchObject({
      priority: 1330,
      strategicValue: 1,
      immediateValue: 5,
    });
  });

  it("replays a generated chest capture with the same reward and state hash", () => {
    const found = replayableCapture();
    const result = applyCommandV6(found.state, found.actor, found.command);
    if (!result.accepted) throw new Error(result.error.code);
    const replay = appendReplayCommandV6(
      createReplayV6(found.state.setup),
      found.command,
      result.state,
    );
    const replayed = runReplayV6(replay);
    expect(replayed.state).toEqual(result.state);
    expect(replayed.events).toContainEqual(
      expect.objectContaining({ kind: "TREASURE_CAPTURED" }),
    );
  });
});

function movableTreasureFixture(
  faction: "ORIGINAL" | "CANDY",
  reward: 0 | 1,
): {
  readonly state: GameStateV6;
  readonly actor: PlayerId;
  readonly command: Extract<CommandV6, { readonly kind: "MOVE" }>;
  readonly destination: CoordV6;
} {
  const created = createPlayableGameV6(setup(11, 1, 37, [faction, faction]));
  if (!created.ok) throw new Error("game creation failed");
  const actor = created.state.turnOrder[created.state.activeSeatIndex];
  if (actor === undefined) throw new Error("missing actor");
  const move = queryPlayerCommandsV6(viewForV6(created.state, actor)).find(
    (command): command is Extract<CommandV6, { readonly kind: "MOVE" }> =>
      command.kind === "MOVE" && command.path.length === 1,
  );
  if (move === undefined) throw new Error("missing move");
  const destination = move.path[0];
  if (destination === undefined) throw new Error("missing destination");
  const randomSeed = randomSeedForReward(reward);
  const state: GameStateV6 = {
    ...created.state,
    random: { algorithm: "MULBERRY32", version: 1, state: randomSeed },
    treasureChests: [destination],
  };
  if (parseGameStateV6(state) === null) throw new Error("invalid fixture");
  return { state, actor, command: move, destination };
}

function replayableCapture(): ReturnType<typeof movableTreasureFixture> {
  for (let seed = 0; seed < 2_000; seed += 1) {
    const created = createPlayableGameV6(setup(11, 1, seed));
    if (!created.ok) continue;
    const actor = created.state.turnOrder[created.state.activeSeatIndex];
    if (actor === undefined) continue;
    const chestKeys = new Set(created.state.treasureChests.map(coordKey));
    const command = queryPlayerCommandsV6(viewForV6(created.state, actor)).find(
      (
        candidate,
      ): candidate is Extract<CommandV6, { readonly kind: "MOVE" }> => {
        const destination =
          candidate.kind === "MOVE" ? candidate.path.at(-1) : undefined;
        return (
          destination !== undefined && chestKeys.has(coordKey(destination))
        );
      },
    );
    if (command === undefined) continue;
    const destination = command.path.at(-1);
    if (destination === undefined) continue;
    return {
      state: created.state,
      actor,
      command,
      destination,
    };
  }
  throw new Error("no deterministic adjacent treasure fixture found");
}

function setup(
  size: 11 | 14 | 16 | 20 | 25,
  aiCount: 1 | 2 | 3,
  seed: number,
  factions?: MatchSetupV6["factions"],
): MatchSetupV6 {
  return {
    rulesetId: RULESET_6_ID,
    seed,
    width: size,
    height: size,
    aiCount,
    aiDifficulty: "NORMAL",
    aiMode: "RIVAL",
    humanColor: "CORAL",
    factions:
      factions ??
      Array.from({ length: aiCount + 1 }, () => "ORIGINAL" as const),
    mapGenerationRevision: SPATIAL_ECONOMY_REVISION,
  };
}

function randomSeedForReward(reward: 0 | 1): number {
  for (let state = 0; state < 100; state += 1) {
    if (
      nextBounded({ algorithm: "MULBERRY32", version: 1, state }, 2).value ===
      reward
    ) {
      return state;
    }
  }
  throw new Error("missing deterministic reward seed");
}

function freeTile(state: GameStateV6, excluded: readonly CoordV6[]): CoordV6 {
  const excludedKeys = new Set(excluded.map(coordKey));
  const occupied = new Set(state.units.map((unit) => coordKey(unit.at)));
  const tile = state.board.tiles.find(
    (candidate) =>
      candidate.terrain === "GRASS" &&
      candidate.site === null &&
      !excludedKeys.has(coordKey(candidate.at)) &&
      !occupied.has(coordKey(candidate.at)),
  );
  if (tile === undefined) throw new Error("missing free tile");
  return tile.at;
}

function coordKey(at: CoordV6): string {
  return `${at.x},${at.y}`;
}

function compareCoords(left: CoordV6, right: CoordV6): number {
  return left.y - right.y || left.x - right.x;
}

function firstLegalHeavySpawn(
  state: GameStateV6,
  at: CoordV6,
): CoordV6 | undefined {
  const occupied = new Set(state.units.map((unit) => coordKey(unit.at)));
  const walls = new Set(state.chocolateWalls.map((wall) => coordKey(wall.at)));
  const chests = new Set(state.treasureChests.map(coordKey));
  const candidates: CoordV6[] = [];
  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      if (dx !== 0 || dy !== 0) candidates.push({ x: at.x + dx, y: at.y + dy });
    }
  }
  return candidates.sort(compareCoords).find((candidate) => {
    const tile =
      state.board.tiles[candidate.y * state.board.width + candidate.x];
    return (
      tile?.at.x === candidate.x &&
      tile.at.y === candidate.y &&
      tile.terrain !== "MOUNTAIN" &&
      !occupied.has(coordKey(candidate)) &&
      !walls.has(coordKey(candidate)) &&
      !chests.has(coordKey(candidate))
    );
  });
}
