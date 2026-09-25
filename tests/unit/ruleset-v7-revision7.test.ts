import { describe, expect, it } from "vitest";
import {
  chooseNormalCommandV7,
  projectPublicUnitForPolicyV7,
  scoreCommandV7,
} from "../../src/ai/v7";
import {
  IMPROVEMENT_IDS_V7,
  RULESET_7_ID,
  TECHNOLOGY_IDS_V7,
  UNIT_ROLE_IDS_V7,
  applyCommandV7,
  calculateCombatPreviewV7,
  cityIncomeV7,
  combinedNetworkCityIdsV7,
  combinedNetworkRoadKeysV7,
  createInitialMapStateV7,
  effectiveRoleRuleV7,
  parseCommandV7,
  parseEventV7,
  parseGameStateV7,
  projectEventsV7,
  previewEconomicV7,
  queryCombatPreviewV7,
  queryPlayerCommandsV7,
  recomputeLiveEconomyV7,
  seaTradeCityIdsV7,
  unitId,
  viewForV7,
  validateMovementPathV7,
  validatePlayerMovementPathV7,
  type CityStateV7,
  type CoordV7,
  type GameStateV7,
  type PlayerId,
  type PopulationContributionV7,
  type UnitRoleIdV7,
  type UnitStateV7,
} from "../../src/engine/index";
import {
  allTechsV7,
  checkedV7,
  exploredAllV7,
  initialV7,
  richV7,
  setupV7,
} from "../fixtures/v7-builders";
import { withPortV7 } from "../fixtures/v7-naval-builders";

const READY: UnitStateV7["activation"] = {
  moved: false,
  movedPathLength: 0,
  attacked: false,
  attacksUsed: 0,
  tendedThisTurn: false,
  inspired: false,
  overrunActive: false,
  recovered: false,
  captured: false,
  handled: false,
  specialActed: false,
};

describe("Ruleset 7 revision 7 networks and fortifications", () => {
  it("freezes the revision identity and removes the retired systems", () => {
    expect(RULESET_7_ID).toBe("pulp-wars-poc-7r11");
    expect(setupV7().mapGenerationRevision).toBe("REGIONAL_BIOMES_NAVAL_V2");
    expect(TECHNOLOGY_IDS_V7).toContain("ENGINEERING");
    expect(TECHNOLOGY_IDS_V7).not.toContain("GRAND_WORKS");
    expect(UNIT_ROLE_IDS_V7).not.toContain("SABOTEUR");
    expect(IMPROVEMENT_IDS_V7).not.toContain("GRAND_WORKS");
    for (const kind of ["EMBARK", "BLACKOUT_CITY", "BUILD_GRAND_WORKS"])
      expect(parseCommandV7({ kind })).toMatchObject({ ok: false });
  });

  it("rejects swapped or duplicate original-capital anchors and water field defenses", () => {
    const state = initialV7(17);
    const [first, second] = state.players;
    if (first === undefined || second === undefined)
      throw new Error("players missing");
    expect(
      parseGameStateV7({
        ...state,
        players: state.players.map((player) =>
          player.id === first.id
            ? { ...player, originalCapitalCityId: second.originalCapitalCityId }
            : player.id === second.id
              ? {
                  ...player,
                  originalCapitalCityId: first.originalCapitalCityId,
                }
              : player,
        ),
      }),
    ).toBeNull();
    expect(
      parseGameStateV7({
        ...state,
        players: state.players.map((player) =>
          player.id === second.id
            ? { ...player, originalCapitalCityId: first.originalCapitalCityId }
            : player,
        ),
      }),
    ).toBeNull();
    const water = state.board.tiles[0];
    if (water === undefined) throw new Error("tile missing");
    expect(
      parseGameStateV7({
        ...state,
        board: {
          ...state.board,
          tiles: state.board.tiles.map((tile) =>
            same(tile.at, water.at)
              ? {
                  ...tile,
                  biome: null,
                  terrain: "SHALLOW_WATER",
                  resource: null,
                  improvement: null,
                  road: false,
                  fieldDefense: true,
                }
              : tile,
          ),
        },
      }),
    ).toBeNull();
  });

  it("builds field defense atomically and rejects command-index overflow", () => {
    const base = richV7(allTechsV7(exploredAllV7(initialV7(31))));
    const unit = required(
      base.units.find((candidate) => candidate.ownerId === base.humanPlayerId),
    );
    const valid = applyCommandV7(base, base.humanPlayerId, {
      kind: "BUILD_FIELD_DEFENSE",
      unitId: unit.id,
    });
    expect(valid).toMatchObject({
      accepted: true,
      events: [
        expect.objectContaining({ kind: "FIELD_DEFENSE_BUILT", cost: 3 }),
      ],
    });
    if (valid.accepted)
      expect(
        valid.state.board.tiles.find((tile) => same(tile.at, unit.at))
          ?.fieldDefense,
      ).toBe(true);

    const overflow = checkedV7({
      ...base,
      commandIndex: Number.MAX_SAFE_INTEGER,
    });
    const rejected = applyCommandV7(overflow, overflow.humanPlayerId, {
      kind: "BUILD_FIELD_DEFENSE",
      unitId: unit.id,
    });
    expect(rejected).toMatchObject({
      accepted: false,
      error: { code: "INTEGER_OVERFLOW" },
      state: { commandIndex: Number.MAX_SAFE_INTEGER },
    });
  });

  it("values field defense under visible threat but skips safe interior spending", () => {
    const base = richV7(allTechsV7(exploredAllV7(initialV7(37))));
    const actor = required(
      base.units.find((unit) => unit.ownerId === base.humanPlayerId),
    );
    const command = { kind: "BUILD_FIELD_DEFENSE" as const, unitId: actor.id };
    expect(
      scoreCommandV7(viewForV7(base, base.humanPlayerId), command).priority,
    ).toBe(-1);
    const hostile = required(
      base.units.find((unit) => unit.ownerId !== base.humanPlayerId),
    );
    const hostileAt = required(
      neighbors(actor.at).find((at) => {
        const tile = tileAt(base, at);
        return tile !== undefined && tile.biome !== null && tile.site === null;
      }),
    );
    const threatened: GameStateV7 = {
      ...base,
      units: base.units.map((unitState) =>
        unitState.id === hostile.id
          ? {
              ...unitState,
              role: "FIGHTER",
              form: "LAND",
              at: hostileAt,
              hp: 10,
              maxHp: 10,
            }
          : unitState,
      ),
    };
    expect(
      scoreCommandV7(viewForV7(threatened, base.humanPlayerId), command)
        .priority,
    ).toBeGreaterThan(0);
  });

  it("adds field, city, and Walls defense before terrain and only for the owner", () => {
    const base = initialV7(43);
    const defender = required(
      base.units.find((unit) => unit.ownerId !== base.humanPlayerId),
    );
    const city = required(
      base.cities.find((candidate) => candidate.ownerId === defender.ownerId),
    );
    const attacker = required(
      base.units.find((unit) => unit.ownerId === base.humanPlayerId),
    );
    const at = city.at;
    const from = adjacentLand(base, at);
    const state: GameStateV7 = {
      ...base,
      players: base.players.map((player) =>
        player.id === defender.ownerId
          ? {
              ...player,
              researchedTechs: ["ENGINEERING"],
              explored: base.board.tiles.map((tile) => tile.at),
            }
          : { ...player, explored: base.board.tiles.map((tile) => tile.at) },
      ),
      cities: base.cities.map((candidate) =>
        candidate.id === city.id
          ? {
              ...candidate,
              rewards: [
                ...candidate.rewards.filter(
                  (reward) => reward.reachedLevel !== 3,
                ),
                { reachedLevel: 3, reward: "WALLS" },
              ],
            }
          : candidate,
      ),
      board: {
        ...base.board,
        tiles: base.board.tiles.map((tile) =>
          same(tile.at, at)
            ? { ...tile, fieldDefense: true, terrain: "FOREST" }
            : same(tile.at, from)
              ? { ...tile, biome: "PLAINS", terrain: "GRASS", resource: null }
              : tile,
        ),
      },
      units: [
        unit(
          attacker.id,
          attacker.ownerId,
          attacker.homeCityId,
          "FIGHTER",
          from,
        ),
        unit(defender.id, defender.ownerId, defender.homeCityId, "FIGHTER", at),
      ],
    };
    const preview = calculateCombatPreviewV7(state, attacker.id, defender.id);
    expect(preview).toMatchObject({
      fortificationLevel: 3,
      defense2: effectiveRoleRuleV7("FIGHTER").defense2 + 6,
      defenseBonusNumerator: 3,
      defenseBonusDenominator: 2,
    });
    const captured = {
      ...state,
      cities: state.cities.map((candidate) =>
        candidate.id === city.id
          ? { ...candidate, ownerId: attacker.ownerId }
          : candidate,
      ),
    };
    expect(
      calculateCombatPreviewV7(captured, attacker.id, defender.id)
        .fortificationLevel,
    ).toBe(0);
    const friendlyView = viewForV7(state, attacker.ownerId);
    expect(
      queryCombatPreviewV7(friendlyView, attacker.id, defender.id)
        ?.fortificationLevel,
    ).toBe(3);
    const capturedView = viewForV7(captured, attacker.ownerId);
    expect(
      queryCombatPreviewV7(capturedView, attacker.id, defender.id)
        ?.fortificationLevel,
    ).toBe(0);
    const projected = projectPublicUnitForPolicyV7(capturedView, defender.id, {
      at,
    });
    expect(
      projected.unitStats
        .find((entry) => entry.unitId === defender.id)
        ?.stats.find((stat) => stat.id === "DEFENSE")?.total,
    ).toEqual({ numerator: 3, denominator: 1 });
  });

  it("destroys hostile Field Defense through all four public command paths", () => {
    for (const scenario of [
      { reason: "OCCUPATION" as const, role: "FIGHTER" as const },
      { reason: "CATAPULT" as const, role: "CATAPULT" as const },
      { reason: "INSPIRED" as const, role: "FIGHTER" as const },
      { reason: "EXPLOSIVES" as const, role: "FIGHTER" as const },
    ]) {
      const base = exploredAllV7(allTechsV7(initialV7(47)));
      const actor = base.humanPlayerId;
      const enemy = required(
        base.players.find((player) => player.id !== actor),
      ).id;
      const actorUnit = required(
        base.units.find((candidate) => candidate.ownerId === actor),
      );
      const enemyUnit = required(
        base.units.find((candidate) => candidate.ownerId === enemy),
      );
      const enemyCity = required(
        base.cities.find((candidate) => candidate.ownerId === enemy),
      );
      const targetAt = { x: 3, y: 2 };
      const attackerAt =
        scenario.reason === "CATAPULT" ? { x: 1, y: 2 } : { x: 2, y: 2 };
      const attacker = {
        ...unit(
          actorUnit.id,
          actor,
          actorUnit.homeCityId,
          scenario.role,
          attackerAt,
        ),
        activation: {
          ...READY,
          inspired: scenario.reason === "INSPIRED",
        },
        ...(scenario.reason === "INSPIRED" || scenario.reason === "EXPLOSIVES"
          ? { veteran: true, kills: 3, hp: 15, maxHp: 15 }
          : {}),
      };
      const defender = unit(
        enemyUnit.id,
        enemy,
        enemyUnit.homeCityId,
        "GUARD",
        targetAt,
      );
      const state = checkedV7({
        ...base,
        treasureChests: base.treasureChests.filter(
          (at) => !same(at, attackerAt) && !same(at, targetAt),
        ),
        units:
          scenario.reason === "OCCUPATION"
            ? [attacker]
            : [attacker, defender].sort((left, right) => left.id - right.id),
        board: {
          ...base.board,
          tiles: base.board.tiles.map((tile) =>
            same(tile.at, targetAt)
              ? {
                  ...tile,
                  biome: "PLAINS",
                  terrain: "GRASS",
                  resource: null,
                  improvement: null,
                  road: false,
                  fieldDefense: true,
                  site: null,
                  territoryCityId: enemyCity.id,
                }
              : same(tile.at, attackerAt)
                ? {
                    ...tile,
                    biome: "PLAINS",
                    terrain: "GRASS",
                    resource: null,
                    improvement: null,
                    site: null,
                  }
                : tile,
          ),
        },
      });
      const command =
        scenario.reason === "OCCUPATION"
          ? ({ kind: "MOVE", unitId: attacker.id, path: [targetAt] } as const)
          : ({
              kind: "ATTACK",
              unitId: attacker.id,
              targetUnitId: defender.id,
            } as const);
      expect(queryPlayerCommandsV7(viewForV7(state, actor))).toContainEqual(
        command,
      );
      const result = applyCommandV7(state, actor, command);
      if (!result.accepted) throw new Error(result.error.code);
      expect(result.events).toContainEqual({
        kind: "FIELD_DEFENSE_DESTROYED",
        at: targetAt,
        reason: scenario.reason,
      });
      expect(tileAt(result.state, targetAt)?.fieldDefense).toBe(false);
    }
  });

  it("applies deterministic Battleship splash and gives a hidden victim owner redacted damage", () => {
    const created = createInitialMapStateV7({
      ...setupV7(59, 2),
      mapType: "ARCHIPELAGO",
    });
    if (!created.ok) throw new Error(created.error.code);
    const base = created.state;
    const [attackerOwner, targetOwner, victimOwner] = base.turnOrder;
    if (
      attackerOwner === undefined ||
      targetOwner === undefined ||
      victimOwner === undefined
    )
      throw new Error("owners missing");
    const attackerBase = required(
      base.units.find((u) => u.ownerId === attackerOwner),
    );
    const targetBase = required(
      base.units.find((u) => u.ownerId === targetOwner),
    );
    const victimBase = required(
      base.units.find((u) => u.ownerId === victimOwner),
    );
    const positions = splashWaterPositions(base);
    const state = checkedV7({
      ...base,
      activeSeatIndex: base.turnOrder.indexOf(attackerOwner),
      players: base.players.map((player) => ({
        ...player,
        explored:
          player.id === victimOwner
            ? [...player.explored, positions[2]].sort(
                (left, right) => left.y - right.y || left.x - right.x,
              )
            : base.board.tiles.map((tile) => tile.at),
      })),
      units: [
        unit(
          attackerBase.id,
          attackerOwner,
          attackerBase.homeCityId,
          "BATTLESHIP",
          positions[0],
          "NAVAL",
        ),
        unit(
          targetBase.id,
          targetOwner,
          targetBase.homeCityId,
          "PATROL_BOAT",
          positions[1],
          "NAVAL",
        ),
        unit(
          victimBase.id,
          victimOwner,
          victimBase.homeCityId,
          "PATROL_BOAT",
          positions[2],
          "NAVAL",
        ),
      ].sort((left, right) => left.id - right.id),
    });
    const result = applyCommandV7(state, attackerOwner, {
      kind: "ATTACK",
      unitId: attackerBase.id,
      targetUnitId: targetBase.id,
    });
    expect(result.accepted).toBe(true);
    if (!result.accepted) return;
    const combat = required(
      result.events.find((event) => event.kind === "COMBAT_RESOLVED"),
    );
    if (combat.kind !== "COMBAT_RESOLVED") return;
    expect(combat.preview.splash).toEqual([
      expect.objectContaining({ unitId: victimBase.id }),
    ]);
    const victimSplash = required(combat.preview.splash[0]);
    expect(
      result.state.units.find((unit) => unit.id === victimBase.id)?.hp,
    ).toBe(victimBase.hp - victimSplash.damage);
    const projected = projectEventsV7(
      state,
      result.state,
      victimOwner,
      result.events,
    );
    expect(projected.events).toEqual([
      {
        kind: "COMBAT_SPLASH_DAMAGE",
        splash: combat.preview.splash,
      },
    ]);
    expect(projected.events[0]).not.toHaveProperty("attackerId");
    expect(projected.events[0]).not.toHaveProperty("targetUnitId");
  });

  it("roots land Roads at the owner's original capital and applies current Road population", () => {
    const base = initialV7(67, 2);
    const owner = base.humanPlayerId;
    const original = required(
      base.cities.find(
        (city) =>
          city.id ===
          base.players.find((player) => player.id === owner)
            ?.originalCapitalCityId,
      ),
    );
    const foreign = required(
      base.cities.find((city) => city.ownerId !== owner),
    );
    const otherEnemy = required(
      base.cities.find(
        (city) => city.ownerId !== owner && city.ownerId !== foreign.ownerId,
      ),
    );
    const marketTile = required(
      base.board.tiles.find(
        (tile) =>
          tile.territoryCityId === foreign.id &&
          tile.site === null &&
          Math.max(
            Math.abs(tile.at.x - foreign.at.x),
            Math.abs(tile.at.y - foreign.at.y),
          ) === 1,
      ),
    );
    const route = chebyshevRoute(original.at, foreign.at);
    const routeKeys = new Set([...route.map(key), key(marketTile.at)]);
    const connected: GameStateV7 = {
      ...base,
      units: [],
      players: base.players.map((player) =>
        player.id === owner
          ? {
              ...player,
              researchedTechs: [
                ...new Set([...player.researchedTechs, "ROADS" as const]),
              ],
              explored: base.board.tiles.map((tile) => tile.at),
            }
          : player,
      ),
      cities: base.cities.map((city) =>
        city.id === foreign.id ? { ...city, ownerId: owner } : city,
      ),
      board: {
        ...base.board,
        tiles: base.board.tiles.map((tile) => ({
          ...tile,
          road: routeKeys.has(key(tile.at)),
          territoryCityId:
            same(tile.at, original.at) ||
            same(tile.at, foreign.at) ||
            same(tile.at, marketTile.at)
              ? tile.territoryCityId
              : routeKeys.has(key(tile.at))
                ? null
                : tile.territoryCityId,
          ...(same(tile.at, marketTile.at)
            ? { improvement: "MARKET" as const, resource: null }
            : {}),
        })),
      },
    };
    expect(combinedNetworkCityIdsV7(connected, owner)).toContain(foreign.id);
    expect(combinedNetworkRoadKeysV7(connected, owner)).toContain(
      `${marketTile.at.y},${marketTile.at.x}`,
    );
    const connectedEconomy = recomputeLiveEconomyV7(
      connected,
      connected,
      connected.populationContributions,
    );
    expect(
      connectedEconomy.cities.find((city) => city.id === original.id)
        ?.economicPopulation,
    ).toBe(original.economicPopulation + 1);
    expect(
      connectedEconomy.cities.find((city) => city.id === foreign.id)
        ?.economicPopulation,
    ).toBe(foreign.economicPopulation + 1);
    const connectedIncome = cityIncomeV7(
      connected,
      required(connected.cities.find((city) => city.id === foreign.id)),
    );
    const lostCapital: GameStateV7 = {
      ...connected,
      cities: connected.cities.map((city) =>
        city.id === original.id ? { ...city, ownerId: foreign.ownerId } : city,
      ),
    };
    expect(combinedNetworkCityIdsV7(lostCapital, owner).size).toBe(0);
    expect(
      cityIncomeV7(
        lostCapital,
        required(lostCapital.cities.find((city) => city.id === foreign.id)),
      ),
    ).toBe(connectedIncome);
    const recaptured: GameStateV7 = {
      ...lostCapital,
      cities: lostCapital.cities.map((city) =>
        city.id === original.id ? { ...city, ownerId: owner } : city,
      ),
    };
    expect(combinedNetworkCityIdsV7(recaptured, owner)).toContain(foreign.id);
    const disconnectedAt = required(route[Math.floor(route.length / 2)]);
    const disconnected: GameStateV7 = {
      ...connected,
      board: {
        ...connected.board,
        tiles: connected.board.tiles.map((tile) =>
          same(tile.at, disconnectedAt)
            ? { ...tile, territoryCityId: otherEnemy.id, road: true }
            : tile,
        ),
      },
    };
    expect(combinedNetworkCityIdsV7(disconnected, owner)).not.toContain(
      foreign.id,
    );
    const disconnectedEconomy = recomputeLiveEconomyV7(
      connected,
      disconnected,
      connected.populationContributions,
    );
    expect(
      disconnectedEconomy.cities.find((city) => city.id === foreign.id)
        ?.economicPopulation,
    ).toBe(foreign.economicPopulation);
    const reconnectedEconomy = recomputeLiveEconomyV7(
      disconnected,
      connected,
      connected.populationContributions,
    );
    expect(
      reconnectedEconomy.cities.find((city) => city.id === foreign.id)
        ?.economicPopulation,
    ).toBe(foreign.economicPopulation + 1);
    expect(
      reconnectedEconomy.cities.find((city) => city.id === foreign.id)?.rewards,
    ).toEqual(foreign.rewards);
  });

  it("generates bounded minimum and maximum samples for every map type with coastal non-dry settlements", () => {
    const mapTypes = [
      "DRY_LAND",
      "PANGEA",
      "CONTINENTS",
      "ARCHIPELAGO",
      "LAKES",
    ] as const;
    for (const [mapIndex, mapType] of mapTypes.entries()) {
      for (const size of [11, 25] as const) {
        const setup = {
          ...setupV7(73 + mapIndex * 10 + size),
          width: size,
          height: size,
          mapType,
        };
        const created = createInitialMapStateV7(setup);
        if (!created.ok) throw new Error(created.error.code);
        if (mapType === "DRY_LAND") continue;
        const components = landComponents(created.state);
        for (const component of components) {
          const inhabited = component.some((at) => {
            const tile = tileAt(created.state, at);
            return tile?.site === "CAPITAL" || tile?.site === "VILLAGE";
          });
          if (!inhabited) continue;
          expect(
            component.some((at) => {
              const tile = tileAt(created.state, at);
              return (
                (tile?.site === "CAPITAL" || tile?.site === "VILLAGE") &&
                neighbors(at).some(
                  (next) => tileAt(created.state, next)?.biome === null,
                )
              );
            }),
          ).toBe(true);
        }
      }
    }
  });

  it("caps Port water edges at five steps, supports chains, blocks land gaps, and caches dense queries", () => {
    const base = initialV7(71, 2);
    const owner = base.humanPlayerId;
    const cities = base.cities.slice(0, 3);
    if (cities.length !== 3) throw new Error("three cities missing");
    const chained = portGraph(base, owner, cities, [1, 6, 11]);
    const originalCapitalId = required(
      chained.players.find((player) => player.id === owner),
    ).originalCapitalCityId;
    expect(seaTradeCityIdsV7(chained, owner)).toEqual(
      new Set(
        cities
          .filter((city) => city.id !== originalCapitalId)
          .map((city) => city.id),
      ),
    );
    expect(combinedNetworkCityIdsV7(chained, owner)).toEqual(
      new Set(
        cities
          .filter((city) => city.id === originalCapitalId)
          .map((city) => city.id),
      ),
    );
    const chainedEconomy = recomputeLiveEconomyV7(chained, chained, []);
    expect(
      chainedEconomy.cities
        .filter((city) => cities.some((candidate) => candidate.id === city.id))
        .map((city) => [city.id, city.economicPopulation]),
    ).toEqual(cities.map((city) => [city.id, 0]));
    const shorecraftOnly = {
      ...chained,
      players: chained.players.map((player) =>
        player.id === owner
          ? { ...player, researchedTechs: ["SHORECRAFT" as const] }
          : player,
      ),
    };
    expect(seaTradeCityIdsV7(shorecraftOnly, owner)).toEqual(new Set());
    expect(combinedNetworkCityIdsV7(shorecraftOnly, owner)).toEqual(new Set());
    expect(
      recomputeLiveEconomyV7(shorecraftOnly, shorecraftOnly, [])
        .cities.filter((city) =>
          cities.some((candidate) => candidate.id === city.id),
        )
        .map((city) => city.economicPopulation),
    ).toEqual([0, 0, 0]);

    const tooFar = portGraph(base, owner, cities, [1, 6, 12]);
    expect(seaTradeCityIdsV7(tooFar, owner)).not.toContain(
      required(cities[2]).id,
    );

    const blocked = {
      ...chained,
      board: {
        ...chained.board,
        tiles: chained.board.tiles.map((tile) =>
          tile.at.x === 3 && tile.at.y === 1
            ? {
                ...tile,
                biome: "PLAINS" as const,
                terrain: "GRASS" as const,
                improvement: null,
                territoryCityId: null,
              }
            : tile,
        ),
      },
    };
    expect(seaTradeCityIdsV7(blocked, owner)).toEqual(
      new Set([required(cities[1]).id, required(cities[2]).id]),
    );

    const dense = densePortGraph(base, owner, cities);
    expect(
      dense.board.tiles.filter((tile) => tile.improvement === "PORT"),
    ).toHaveLength(25);
    const first = combinedNetworkCityIdsV7(dense, owner);
    for (let index = 0; index < 100; index += 1)
      expect(combinedNetworkCityIdsV7(dense, owner)).toBe(first);
  });

  it("keeps public road speed exact and independent from land and sea trade", () => {
    const base = initialV7(72, 2);
    const owner = base.humanPlayerId;
    const player = required(base.players.find((item) => item.id === owner));
    const original = required(
      base.cities.find((city) => city.id === player.originalCapitalCityId),
    );
    const remote = required(
      base.cities.find((city) => city.id !== original.id),
    );
    const destination = required(
      neighbors(remote.at).find((at) => {
        const tile = tileAt(base, at);
        return (
          tile !== undefined &&
          tile.biome !== null &&
          tile.site === null &&
          (tile.territoryCityId === null || tile.territoryCityId === remote.id)
        );
      }),
    );
    const mover = required(base.units.find((unit) => unit.ownerId === owner));
    const seaY = required(
      Array.from({ length: base.board.height }, (_, y) => y).find(
        (y) => !base.cities.some((city) => city.at.y === y),
      ),
    );
    const network = portGraph(base, owner, [original, remote], [1, 6], seaY);
    const state: GameStateV7 = {
      ...network,
      units: [unit(mover.id, owner, remote.id, "FIGHTER", remote.at)],
      board: {
        ...network.board,
        tiles: network.board.tiles.map((tile) => {
          const originalTile = required(tileAt(base, tile.at));
          if (same(tile.at, remote.at)) return originalTile;
          return same(tile.at, destination)
            ? { ...originalTile, road: true }
            : tile;
        }),
      },
    };
    const authoritative = validateMovementPathV7(
      state,
      required(state.units[0]),
      [destination],
    );
    expect(seaTradeCityIdsV7(state, owner)).toContain(remote.id);
    expect(combinedNetworkCityIdsV7(state, owner)).not.toContain(remote.id);
    expect(combinedNetworkRoadKeysV7(state, owner)).not.toContain(
      key(remote.at),
    );
    expect(combinedNetworkRoadKeysV7(state, owner)).not.toContain(
      key(destination),
    );
    const view = viewForV7(state, owner);
    const publicResult = validatePlayerMovementPathV7(
      view,
      required(view.units.find((candidate) => candidate.id === mover.id)),
      [destination],
    );
    expect(authoritative).toMatchObject({ legal: true, spentPoints2: 1 });
    expect(publicResult).toEqual(authoritative);
  });

  it("offers, previews, values, and applies a neutral Road network bridge", () => {
    const preResearch = researchRoadsState();
    const researched = applyCommandV7(preResearch, preResearch.humanPlayerId, {
      kind: "RESEARCH",
      tech: "ROADS",
    });
    if (!researched.accepted) throw new Error(researched.error.code);
    const connected = researched.state;
    const owner = connected.humanPlayerId;
    const bridge = required(
      connected.board.tiles.find((tile) => {
        if (!tile.road || tile.site !== null || tile.terrain === "MOUNTAIN")
          return false;
        const candidate = {
          ...connected,
          board: {
            ...connected.board,
            tiles: connected.board.tiles.map((item) =>
              same(item.at, tile.at) ? { ...item, road: false } : item,
            ),
          },
        };
        return combinedNetworkCityIdsV7(candidate, owner).size === 1;
      }),
    );
    const disconnectedRaw = {
      ...connected,
      board: {
        ...connected.board,
        tiles: connected.board.tiles.map((tile) =>
          same(tile.at, bridge.at)
            ? { ...tile, road: false, territoryCityId: null }
            : tile,
        ),
      },
    };
    const recalculated = recomputeLiveEconomyV7(
      connected,
      disconnectedRaw,
      connected.populationContributions,
    );
    const base = checkedV7({
      ...disconnectedRaw,
      cities: recalculated.cities,
      populationContributions: recalculated.populationContributions,
    });
    const command = { kind: "BUILD_ROAD" as const, at: bridge.at };
    const view = viewForV7(base, owner);
    expect(queryPlayerCommandsV7(view)).toContainEqual(command);
    const preview = previewEconomicV7(view, command);
    expect(preview).toMatchObject({
      ok: true,
      preview: {
        ownerCityId: null,
        cost: 2,
        populationDeltaByCity: base.cities
          .filter((city) => city.ownerId === owner)
          .map((city) => ({ cityId: city.id, delta: 1 })),
      },
    });
    const applied = applyCommandV7(base, owner, command);
    expect(applied).toMatchObject({
      accepted: true,
      events: expect.arrayContaining([
        expect.objectContaining({ kind: "ROAD_BUILT", cityId: null }),
      ]),
    });
    if (!applied.accepted || !preview.ok) return;
    expect(
      applied.state.cities
        .filter((city) => city.ownerId === owner)
        .map((city) => ({
          cityId: city.id,
          delta:
            city.economicPopulation -
            required(base.cities.find((before) => before.id === city.id))
              .economicPopulation,
        }))
        .filter((item) => item.delta !== 0),
    ).toEqual(preview.preview.populationDeltaByCity);
  });

  it("autoembarks only when a legal MOVE ends at a friendly Port and exhausts the unit", () => {
    const fixture = withPortV7(77);
    const unitState = required(
      fixture.state.units.find(
        (unit) => unit.ownerId === fixture.state.humanPlayerId,
      ),
    );
    const city = required(
      fixture.state.cities.find(
        (candidate) => candidate.ownerId === fixture.state.humanPlayerId,
      ),
    );
    const start = required(
      neighbors(city.at).find((at) => {
        const tile = tileAt(fixture.state, at);
        return (
          tile?.biome !== null &&
          tile?.site === null &&
          Math.max(
            Math.abs(at.x - fixture.portAt.x),
            Math.abs(at.y - fixture.portAt.y),
          ) === 2
        );
      }),
    );
    const staged = checkedV7({
      ...fixture.state,
      units: fixture.state.units.map((unit) =>
        unit.id === unitState.id
          ? { ...unit, at: start, role: "RAIDER" as const, activation: READY }
          : unit,
      ),
    });
    const command = required(
      queryPlayerCommandsV7(viewForV7(staged, staged.humanPlayerId)).find(
        (candidate) =>
          candidate.kind === "MOVE" &&
          candidate.unitId === unitState.id &&
          same(required(candidate.path.at(-1)), fixture.portAt),
      ),
    );
    if (command.kind !== "MOVE") throw new Error("embark move missing");
    expect(command.path).toHaveLength(2);
    const embarked = applyCommandV7(staged, staged.humanPlayerId, command);
    expect(embarked).toMatchObject({
      accepted: true,
      events: expect.arrayContaining([
        expect.objectContaining({
          kind: "UNIT_EMBARKED",
          unitId: unitState.id,
        }),
      ]),
    });
    if (!embarked.accepted) return;
    expect(
      embarked.state.units.find((unit) => unit.id === unitState.id),
    ).toMatchObject({
      form: "EMBARKED",
      at: fixture.portAt,
      activation: {
        moved: true,
        attacked: true,
        handled: true,
        specialActed: true,
      },
    });
    const afterPort = required(
      neighbors(fixture.portAt).find(
        (at) => tileAt(staged, at) !== undefined && !same(at, city.at),
      ),
    );
    const finalOnly = checkedV7({
      ...staged,
      units: staged.units.map((unit) =>
        unit.id === unitState.id
          ? { ...unit, at: city.at, activation: READY }
          : unit,
      ),
    });
    expect(
      applyCommandV7(finalOnly, finalOnly.humanPlayerId, {
        kind: "MOVE",
        unitId: unitState.id,
        path: [fixture.portAt, afterPort],
      }),
    ).toMatchObject({ accepted: false });
    expect(
      queryPlayerCommandsV7(viewForV7(staged, staged.humanPlayerId)).some(
        (candidate) => (candidate as { kind?: string }).kind === "EMBARK",
      ),
    ).toBe(false);
  });

  it("activates the existing land Road graph with current connected-city population", () => {
    const state = researchRoadsState();
    const owner = state.humanPlayerId;
    const ownedBefore = state.cities.filter((city) => city.ownerId === owner);
    expect(ownedBefore).toHaveLength(2);
    expect(ownedBefore.map((city) => city.economicPopulation)).toEqual([0, 0]);
    const result = applyCommandV7(state, owner, {
      kind: "RESEARCH",
      tech: "ROADS",
    });
    expect(result.accepted).toBe(true);
    if (!result.accepted) return;
    expect(
      result.state.cities
        .filter((city) => city.ownerId === owner)
        .map((city) => city.economicPopulation),
    ).toEqual([1, 1]);
    expect(result.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "TECH_RESEARCHED", tech: "ROADS" }),
        expect.objectContaining({ kind: "SEA_NETWORK_CHANGED" }),
      ]),
    );
    expect(parseGameStateV7(result.state)).toEqual(result.state);
  });

  it("keeps Raiding required for ordinary Pillage and checks action state first", () => {
    const state = exploredAllV7(initialV7(79));
    const actor = state.humanPlayerId;
    const sourceBase = required(
      state.units.find((unit) => unit.ownerId === actor),
    );
    const hostileCity = required(
      state.cities.find((city) => city.ownerId !== actor),
    );
    const target = required(
      state.board.tiles.find(
        (tile) => tile.territoryCityId === hostileCity.id && tile.site === null,
      ),
    );
    const ready = checkedV7({
      ...state,
      players: state.players.map((player) =>
        player.id === actor
          ? { ...player, researchedTechs: ["GATHERING"] }
          : player,
      ),
      board: {
        ...state.board,
        tiles: state.board.tiles.map((tile) =>
          same(tile.at, target.at)
            ? {
                ...tile,
                terrain: "GRASS",
                resource: null,
                improvement: "MARKET",
              }
            : tile,
        ),
      },
      units: [
        unit(sourceBase.id, actor, sourceBase.homeCityId, "FIGHTER", target.at),
      ],
    });
    expect(
      applyCommandV7(ready, actor, { kind: "PILLAGE", unitId: sourceBase.id }),
    ).toMatchObject({ accepted: false, error: { code: "TECH_REQUIRED" } });
    const acted = checkedV7({
      ...ready,
      units: ready.units.map((candidate) => ({
        ...candidate,
        activation: {
          ...candidate.activation,
          handled: true,
          specialActed: true,
        },
      })),
    });
    expect(
      applyCommandV7(acted, actor, { kind: "PILLAGE", unitId: sourceBase.id }),
    ).toMatchObject({ accepted: false, error: { code: "UNIT_ALREADY_ACTED" } });
    const movedGuard = checkedV7({
      ...ready,
      players: ready.players.map((player) =>
        player.id === actor
          ? {
              ...player,
              researchedTechs: [
                "GATHERING",
                "HUNTING",
                "SCOUTING",
                "RAIDING",
                "DRILL",
              ],
            }
          : player,
      ),
      units: ready.units.map((candidate) => ({
        ...candidate,
        role: "GUARD" as const,
        maxHp: 15,
        hp: 15,
        activation: {
          ...candidate.activation,
          moved: true,
          movedPathLength: 1,
        },
      })),
    });
    const pillage = { kind: "PILLAGE" as const, unitId: sourceBase.id };
    expect(queryPlayerCommandsV7(viewForV7(movedGuard, actor))).toContainEqual(
      pillage,
    );
    expect(applyCommandV7(movedGuard, actor, pillage)).toMatchObject({
      accepted: true,
      events: expect.arrayContaining([
        expect.objectContaining({ kind: "IMPROVEMENT_PILLAGED" }),
      ]),
    });
  });

  it("applies the active same-city Forge discount to offered land training", () => {
    const base = exploredAllV7(allTechsV7(initialV7(81)));
    const actor = base.humanPlayerId;
    const city = required(
      base.cities.find((candidate) => candidate.ownerId === actor),
    );
    const forgeTile = required(
      base.board.tiles.find(
        (tile) =>
          tile.territoryCityId === city.id &&
          tile.site === null &&
          tile.improvement === null &&
          neighbors(tile.at).some(
            (at) =>
              tileAt(base, at)?.territoryCityId === city.id &&
              tileAt(base, at)?.improvement === null,
          ),
      ),
    );
    const mineAt = required(
      neighbors(forgeTile.at).find(
        (at) =>
          tileAt(base, at)?.territoryCityId === city.id &&
          tileAt(base, at)?.improvement === null,
      ),
    );
    const forgeContributions: PopulationContributionV7[] = [
      {
        id: base.nextEntityId,
        cityId: city.id,
        category: "LIVE",
        amount: 1,
        source: { kind: "IMPROVEMENT", improvement: "MINE", at: mineAt },
      },
      {
        id: base.nextEntityId + 1,
        cityId: city.id,
        category: "LIVE",
        amount: 1,
        source: {
          kind: "IMPROVEMENT",
          improvement: "FORGE",
          at: forgeTile.at,
        },
      },
    ];
    const candidate: GameStateV7 = {
      ...base,
      nextEntityId: base.nextEntityId + forgeContributions.length,
      players: base.players.map((player) =>
        player.id === actor ? { ...player, coins: 100 } : player,
      ),
      units: base.units.filter((unitState) => unitState.ownerId !== actor),
      board: {
        ...base.board,
        tiles: base.board.tiles.map((tile) =>
          same(tile.at, forgeTile.at)
            ? {
                ...tile,
                biome: "HIGHLANDS" as const,
                terrain: "MOUNTAIN" as const,
                resource: null,
                improvement: "FORGE" as const,
                site: null,
              }
            : same(tile.at, mineAt)
              ? {
                  ...tile,
                  biome: "HIGHLANDS" as const,
                  terrain: "MOUNTAIN" as const,
                  resource: null,
                  improvement: "MINE" as const,
                  site: null,
                }
              : tile,
        ),
      },
      populationContributions: [
        ...base.populationContributions,
        ...forgeContributions,
      ],
    };
    const economy = recomputeLiveEconomyV7(
      base,
      candidate,
      candidate.populationContributions,
    );
    const state = checkedV7({
      ...candidate,
      cities: economy.cities.map((candidateCity) =>
        candidateCity.id === city.id
          ? {
              ...candidateCity,
              level: 2,
              population:
                candidateCity.permanentPopulation +
                candidateCity.economicPopulation -
                2,
              rewards: [{ reachedLevel: 2, reward: "STOCKPILE" as const }],
            }
          : candidateCity,
      ),
      populationContributions: economy.populationContributions,
    });
    const command = {
      kind: "TRAIN" as const,
      cityId: city.id,
      role: "FIGHTER" as const,
    };
    expect(queryPlayerCommandsV7(viewForV7(state, actor))).toContainEqual(
      command,
    );
    const discounted = applyCommandV7(state, actor, command);
    if (!discounted.accepted) throw new Error(discounted.error.code);
    expect(discounted.events).toContainEqual(
      expect.objectContaining({ kind: "UNIT_TRAINED", cost: 1 }),
    );

    const inactive = checkedV7({
      ...base,
      players: base.players.map((player) =>
        player.id === actor ? { ...player, coins: 100 } : player,
      ),
      units: base.units.filter((unitState) => unitState.ownerId !== actor),
    });
    const fullPrice = applyCommandV7(inactive, actor, command);
    if (!fullPrice.accepted) throw new Error(fullPrice.error.code);
    expect(fullPrice.events).toContainEqual(
      expect.objectContaining({ kind: "UNIT_TRAINED", cost: 2 }),
    );
  });

  it("preserves roads and Field Defense while Cultivate and Blast emit exact transitions", () => {
    const base = richV7(exploredAllV7(allTechsV7(initialV7(85))), 100);
    const actor = base.humanPlayerId;
    const city = required(
      base.cities.find((candidate) => candidate.ownerId === actor),
    );
    const [forest, mountain] = base.board.tiles.filter(
      (tile) => tile.territoryCityId === city.id && tile.site === null,
    );
    if (forest === undefined || mountain === undefined)
      throw new Error("terrain action tiles missing");
    const state = checkedV7({
      ...base,
      treasureChests: base.treasureChests.filter(
        (at) => !same(at, forest.at) && !same(at, mountain.at),
      ),
      units: base.units.filter(
        (candidate) =>
          !same(candidate.at, forest.at) && !same(candidate.at, mountain.at),
      ),
      board: {
        ...base.board,
        tiles: base.board.tiles.map((tile) =>
          same(tile.at, forest.at)
            ? {
                ...tile,
                biome: "WOODLAND",
                terrain: "FOREST",
                resource: null,
                improvement: null,
                road: true,
                fieldDefense: true,
              }
            : same(tile.at, mountain.at)
              ? {
                  ...tile,
                  biome: "HIGHLANDS",
                  terrain: "MOUNTAIN",
                  resource: null,
                  improvement: null,
                  road: true,
                  fieldDefense: false,
                }
              : tile,
        ),
      },
    });
    const cultivate = { kind: "CULTIVATE_FOREST" as const, at: forest.at };
    const blast = { kind: "BLAST_MOUNTAIN" as const, at: mountain.at };
    const offered = queryPlayerCommandsV7(viewForV7(state, actor));
    expect(offered).toEqual(expect.arrayContaining([cultivate, blast]));
    const cultivated = applyCommandV7(state, actor, cultivate);
    if (!cultivated.accepted) throw new Error(cultivated.error.code);
    expect(cultivated.events).toContainEqual({
      kind: "FOREST_CULTIVATED",
      playerId: actor,
      cityId: city.id,
      at: forest.at,
      cost: 4,
      terrainBefore: "FOREST",
      terrainAfter: "GRASS",
      resourceBefore: null,
      resourceAfter: "FERTILE_GROUND",
    });
    expect(tileAt(cultivated.state, forest.at)).toMatchObject({
      terrain: "GRASS",
      resource: "FERTILE_GROUND",
      road: true,
      fieldDefense: true,
    });
    const blasted = applyCommandV7(cultivated.state, actor, blast);
    if (!blasted.accepted) throw new Error(blasted.error.code);
    expect(blasted.events).toContainEqual({
      kind: "MOUNTAIN_BLASTED",
      playerId: actor,
      cityId: city.id,
      at: mountain.at,
      cost: 3,
      terrainBefore: "MOUNTAIN",
      terrainAfter: "GRASS",
      resourceBefore: null,
      resourceAfter: null,
    });
    expect(tileAt(blasted.state, mountain.at)).toMatchObject({
      terrain: "GRASS",
      road: true,
      fieldDefense: false,
    });
    for (const invalid of [
      {
        ...state,
        board: {
          ...state.board,
          tiles: state.board.tiles.map((tile) =>
            same(tile.at, forest.at)
              ? { ...tile, resource: "GAME" as const }
              : tile,
          ),
        },
      },
      {
        ...state,
        board: {
          ...state.board,
          tiles: state.board.tiles.map((tile) =>
            same(tile.at, mountain.at) ? { ...tile, fieldDefense: true } : tile,
          ),
        },
      },
    ] as const) {
      const command =
        tileAt(invalid, forest.at)?.resource === "GAME" ? cultivate : blast;
      const rejected = applyCommandV7(invalid, actor, command);
      expect(rejected).toMatchObject({ accepted: false, events: [] });
      expect(rejected.state).toBe(invalid);
    }
  });

  it("keeps pre-Drill Ore private and Blasts only revealed empty Mountains", () => {
    const base = richV7(exploredAllV7(initialV7(87)), 100);
    const actor = base.humanPlayerId;
    const city = required(
      base.cities.find((candidate) => candidate.ownerId === actor),
    );
    const [bareAt, oreAt] = base.board.tiles
      .filter((tile) => tile.territoryCityId === city.id && tile.site === null)
      .slice(0, 2)
      .map((tile) => tile.at);
    if (bareAt === undefined || oreAt === undefined)
      throw new Error("mountains missing");
    const beforeDrill = checkedV7({
      ...base,
      players: base.players.map((player) =>
        player.id === actor
          ? {
              ...player,
              researchedTechs: ["GATHERING"],
            }
          : player,
      ),
      treasureChests: base.treasureChests.filter(
        (at) => !same(at, bareAt) && !same(at, oreAt),
      ),
      units: base.units.filter(
        (unitState) =>
          !same(unitState.at, bareAt) && !same(unitState.at, oreAt),
      ),
      board: {
        ...base.board,
        tiles: base.board.tiles.map((tile) =>
          same(tile.at, bareAt) || same(tile.at, oreAt)
            ? {
                ...tile,
                biome: "HIGHLANDS",
                terrain: "MOUNTAIN",
                resource: same(tile.at, oreAt) ? "ORE" : null,
                improvement: null,
                road: false,
                fieldDefense: false,
              }
            : tile,
        ),
      },
    });
    const hiddenView = viewForV7(beforeDrill, actor);
    expect(
      hiddenView.board.tiles
        .filter(
          (tile) =>
            tile.explored && (same(tile.at, bareAt) || same(tile.at, oreAt)),
        )
        .map((tile) => (tile.explored ? tile.resource : "hidden")),
    ).toEqual([null, null]);
    expect(
      queryPlayerCommandsV7(hiddenView).some(
        (command) => command.kind === "BLAST_MOUNTAIN",
      ),
    ).toBe(false);
    expect(chooseNormalCommandV7(hiddenView).command?.kind).not.toBe(
      "BLAST_MOUNTAIN",
    );

    const afterDrill = checkedV7({
      ...beforeDrill,
      players: beforeDrill.players.map((player) =>
        player.id === actor
          ? {
              ...player,
              researchedTechs: [
                "GATHERING",
                "DRILL",
                "FORTIFICATION",
                "EXPLOSIVES",
              ],
            }
          : player,
      ),
    });
    const offered = queryPlayerCommandsV7(viewForV7(afterDrill, actor));
    expect(offered).toContainEqual({ kind: "BLAST_MOUNTAIN", at: bareAt });
    expect(offered).not.toContainEqual({ kind: "BLAST_MOUNTAIN", at: oreAt });
  });

  it("queues multi-level rewards one at a time and grants sequential Juggernauts", () => {
    const fixture = rewardSawmillState(91);
    const built = applyCommandV7(fixture.state, fixture.state.humanPlayerId, {
      kind: "BUILD_SAWMILL",
      at: fixture.at,
    });
    if (!built.accepted) throw new Error(built.error.code);
    expect(built.state.pendingChoices).toEqual([
      expect.objectContaining({
        kind: "CITY_REWARD",
        cityId: fixture.cityId,
        reachedLevel: 5,
      }),
    ]);
    expect(
      built.events.filter((event) => event.kind === "CITY_REWARD_QUEUED"),
    ).toHaveLength(1);
    const first = applyCommandV7(built.state, built.state.humanPlayerId, {
      kind: "CHOOSE_CITY_REWARD",
      cityId: fixture.cityId,
      reachedLevel: 5,
      reward: "JUGGERNAUT",
    });
    if (!first.accepted) throw new Error(first.error.code);
    expect(first.state.pendingChoices).toEqual([
      expect.objectContaining({ reachedLevel: 6 }),
    ]);
    const second = applyCommandV7(first.state, first.state.humanPlayerId, {
      kind: "CHOOSE_CITY_REWARD",
      cityId: fixture.cityId,
      reachedLevel: 6,
      reward: "JUGGERNAUT",
    });
    if (!second.accepted) throw new Error(second.error.code);
    const juggernauts = second.state.units.filter(
      (unit) =>
        unit.homeCityId === fixture.cityId && unit.role === "JUGGERNAUT",
    );
    expect(juggernauts).toHaveLength(2);
    expect(new Set(juggernauts.map((unit) => key(unit.at))).size).toBe(2);
  });

  it("keeps Juggernaut available and removes the center occupant when no adjacent land remains", () => {
    const fixture = rewardSawmillState(93);
    const cityTiles = fixture.state.board.tiles.filter(
      (tile) => tile.territoryCityId === fixture.cityId && tile.biome !== null,
    );
    let nextEntityId = fixture.state.nextEntityId;
    const occupied = checkedV7({
      ...fixture.state,
      nextEntityId: nextEntityId + cityTiles.length,
      units: cityTiles.map((tile) =>
        unit(
          unitId(nextEntityId++),
          fixture.state.humanPlayerId,
          fixture.cityId,
          "FIGHTER",
          tile.at,
        ),
      ),
    });
    const built = applyCommandV7(occupied, occupied.humanPlayerId, {
      kind: "BUILD_SAWMILL",
      at: fixture.at,
    });
    if (!built.accepted) throw new Error(built.error.code);
    expect(built.state.pendingChoices).toEqual([
      expect.objectContaining({ reachedLevel: 5 }),
    ]);
    const chosen = applyCommandV7(built.state, built.state.humanPlayerId, {
      kind: "CHOOSE_CITY_REWARD",
      cityId: fixture.cityId,
      reachedLevel: 5,
      reward: "JUGGERNAUT",
    });
    if (!chosen.accepted) throw new Error(chosen.error.code);
    expect(chosen.events).toContainEqual(
      expect.objectContaining({ kind: "UNIT_SPAWN_DISPLACED", to: null }),
    );
    expect(
      chosen.state.units.find(
        (unit) =>
          unit.role === "JUGGERNAUT" &&
          same(
            unit.at,
            required(
              chosen.state.cities.find((city) => city.id === fixture.cityId),
            ).at,
          ),
      ),
    ).toBeDefined();
  });

  it("repairs lost live population without repeating earned rewards", () => {
    const fixture = rewardSawmillState(95);
    const built = applyCommandV7(fixture.state, fixture.state.humanPlayerId, {
      kind: "BUILD_SAWMILL",
      at: fixture.at,
    });
    if (!built.accepted) throw new Error(built.error.code);
    let state = built.state;
    for (const reachedLevel of [5, 6] as const) {
      const chosen = applyCommandV7(state, state.humanPlayerId, {
        kind: "CHOOSE_CITY_REWARD",
        cityId: fixture.cityId,
        reachedLevel,
        reward: "TREASURY",
      });
      if (!chosen.accepted) throw new Error(chosen.error.code);
      state = chosen.state;
    }
    const rewards = required(
      state.cities.find((city) => city.id === fixture.cityId),
    ).rewards;
    const removed = applyCommandV7(state, state.humanPlayerId, {
      kind: "REDEVELOP",
      at: fixture.at,
    });
    if (!removed.accepted) throw new Error(removed.error.code);
    const repaired = applyCommandV7(
      removed.state,
      removed.state.humanPlayerId,
      {
        kind: "BUILD_SAWMILL",
        at: fixture.at,
      },
    );
    if (!repaired.accepted) throw new Error(repaired.error.code);
    expect(
      required(repaired.state.cities.find((city) => city.id === fixture.cityId))
        .rewards,
    ).toEqual(rewards);
    expect(
      repaired.events.some(
        (event) =>
          event.kind === "CITY_LEVELED_UP" || event.kind.includes("REWARD"),
      ),
    ).toBe(false);
  });

  it("offers and applies a non-empty Land Grant independently of recruitment capacity", () => {
    const fixture = rewardSawmillState(97);
    const city = required(
      fixture.state.cities.find((candidate) => candidate.id === fixture.cityId),
    );
    const positions = fixture.state.board.tiles
      .filter((tile) => tile.territoryCityId === city.id && tile.biome !== null)
      .slice(0, 6);
    expect(positions).toHaveLength(6);
    const full = checkedV7({
      ...fixture.state,
      nextEntityId: fixture.state.nextEntityId + positions.length,
      units: positions.map((tile, index) =>
        unit(
          unitId(fixture.state.nextEntityId + index),
          fixture.state.humanPlayerId,
          city.id,
          "FIGHTER",
          tile.at,
        ),
      ),
    });
    const command = { kind: "LAND_GRANT" as const, cityId: city.id };
    expect(
      queryPlayerCommandsV7(viewForV7(full, full.humanPlayerId)),
    ).toContainEqual(command);
    const result = applyCommandV7(full, full.humanPlayerId, command);
    if (!result.accepted) throw new Error(result.error.code);
    const event = required(
      result.events.find((candidate) => candidate.kind === "LAND_GRANTED"),
    );
    expect(event.kind === "LAND_GRANTED" && event.tiles.length).toBeGreaterThan(
      0,
    );
    expect(
      result.state.cities.find((candidate) => candidate.id === city.id)
        ?.landGrantUsed,
    ).toBe(true);
    const rival = required(
      result.state.players.find((player) => player.id !== full.humanPlayerId),
    );
    const rivalCity = required(
      result.state.cities.find((candidate) => candidate.ownerId === rival.id),
    );
    const captured = checkedV7({
      ...result.state,
      units: [],
      cities: result.state.cities.map((candidate) =>
        candidate.id === city.id
          ? { ...candidate, ownerId: rival.id }
          : candidate.id === rivalCity.id
            ? { ...candidate, ownerId: full.humanPlayerId }
            : candidate,
      ),
    });
    const recaptured = checkedV7({
      ...captured,
      cities: captured.cities.map((candidate) =>
        candidate.id === city.id
          ? { ...candidate, ownerId: full.humanPlayerId }
          : candidate.id === rivalCity.id
            ? { ...candidate, ownerId: rival.id }
            : candidate,
      ),
    });
    expect(
      recaptured.cities.find((candidate) => candidate.id === city.id)
        ?.landGrantUsed,
    ).toBe(true);
    expect(
      applyCommandV7(recaptured, full.humanPlayerId, command),
    ).toMatchObject({ accepted: false, events: [] });
    expect(
      parseEventV7({
        kind: "LAND_GRANTED",
        playerId: fixture.state.humanPlayerId,
        cityId: city.id,
        cost: 6,
        tiles: [],
      }),
    ).toMatchObject({ ok: false });
  });
});

function rewardSawmillState(seed: number): {
  readonly state: GameStateV7;
  readonly cityId: CityStateV7["id"];
  readonly at: CoordV7;
} {
  const base = exploredAllV7(allTechsV7(initialV7(seed)));
  const city = required(
    base.cities.find((candidate) => candidate.ownerId === base.humanPlayerId),
  );
  const at = required(
    base.board.tiles
      .map((tile) => tile.at)
      .find(
        (candidate) =>
          candidate.x > 0 &&
          candidate.y > 0 &&
          candidate.x < base.board.width - 1 &&
          candidate.y < base.board.height - 1 &&
          [candidate, ...neighbors(candidate)].every(
            (position) => tileAt(base, position)?.site === null,
          ),
      ),
  );
  const camps = neighbors(at);
  const campKeys = new Set(camps.map(key));
  const contributions: PopulationContributionV7[] = camps.map(
    (camp, index) => ({
      id: base.nextEntityId + index,
      cityId: city.id,
      category: "LIVE",
      amount: 1,
      source: { kind: "IMPROVEMENT", improvement: "LUMBER_CAMP", at: camp },
    }),
  );
  const permanent: PopulationContributionV7[] = camps
    .slice(0, 5)
    .map((source, index) => ({
      id: base.nextEntityId + contributions.length + index,
      cityId: city.id,
      category: "PERMANENT",
      amount: 1,
      source: { kind: "RESOURCE_ACTION", action: "HARVEST_FRUIT", at: source },
    }));
  return {
    cityId: city.id,
    at,
    state: checkedV7({
      ...base,
      nextEntityId: base.nextEntityId + contributions.length + permanent.length,
      treasureChests: [],
      units: [],
      players: base.players.map((player) =>
        player.id === base.humanPlayerId ? { ...player, coins: 1_000 } : player,
      ),
      board: {
        ...base.board,
        tiles: base.board.tiles.map((tile) =>
          same(tile.at, at) || campKeys.has(key(tile.at))
            ? {
                ...tile,
                biome: "WOODLAND" as const,
                terrain: "FOREST" as const,
                resource: null,
                improvement: campKeys.has(key(tile.at))
                  ? ("LUMBER_CAMP" as const)
                  : null,
                road: false,
                site: null,
                territoryCityId: city.id,
              }
            : tile,
        ),
      },
      cities: base.cities.map((candidate) =>
        candidate.id === city.id
          ? {
              ...candidate,
              level: 4,
              permanentPopulation: 5,
              economicPopulation: 8,
              population: 4,
              expanded: false,
              rewards: [
                { reachedLevel: 2, reward: "STOCKPILE" as const },
                { reachedLevel: 3, reward: "WALLS" as const },
                { reachedLevel: 4, reward: "TREASURY_8" as const },
              ],
            }
          : candidate,
      ),
      populationContributions: [...contributions, ...permanent],
    }),
  };
}

function unit(
  id: UnitStateV7["id"],
  ownerId: PlayerId,
  homeCityId: UnitStateV7["homeCityId"],
  role: UnitRoleIdV7,
  at: CoordV7,
  form: UnitStateV7["form"] = "LAND",
): UnitStateV7 {
  const rule = effectiveRoleRuleV7(role);
  return {
    id,
    ownerId,
    homeCityId,
    role,
    at,
    form,
    hp: rule.maxHp,
    maxHp: rule.maxHp,
    kills: 0,
    veteran: false,
    captureEligible: false,
    activation: READY,
  };
}

function portGraph(
  base: GameStateV7,
  owner: PlayerId,
  cities: readonly CityStateV7[],
  xs: readonly number[],
  y = 1,
): GameStateV7 {
  const ports = xs.map((x, index) => ({
    at: { x, y },
    cityId: required(cities[Math.min(index, cities.length - 1)]).id,
  }));
  return {
    ...base,
    units: [],
    players: base.players.map((player) =>
      player.id === owner
        ? {
            ...player,
            researchedTechs: TECHNOLOGY_IDS_V7,
            explored: base.board.tiles.map((tile) => tile.at),
          }
        : player,
    ),
    cities: base.cities.map((city) =>
      cities.some((candidate) => candidate.id === city.id)
        ? { ...city, ownerId: owner }
        : city,
    ),
    board: {
      ...base.board,
      tiles: base.board.tiles.map((tile) => {
        const port = ports.find((candidate) => same(candidate.at, tile.at));
        const corridor = tile.at.y === y && tile.at.x >= 1 && tile.at.x <= 12;
        return corridor
          ? {
              ...tile,
              biome: null,
              terrain: "SHALLOW_WATER" as const,
              resource: null,
              improvement: port === undefined ? null : ("PORT" as const),
              road: false,
              fieldDefense: false,
              site: null,
              territoryCityId: port?.cityId ?? null,
            }
          : tile;
      }),
    },
  };
}

function densePortGraph(
  base: GameStateV7,
  owner: PlayerId,
  cities: readonly CityStateV7[],
): GameStateV7 {
  const ports = Array.from({ length: 25 }, (_, index) => ({
    at: { x: 1 + (index % 5), y: 1 + Math.floor(index / 5) },
    cityId: required(cities[index % cities.length]).id,
  }));
  return {
    ...base,
    units: [],
    players: base.players.map((player) =>
      player.id === owner
        ? {
            ...player,
            researchedTechs: TECHNOLOGY_IDS_V7,
            explored: base.board.tiles.map((tile) => tile.at),
          }
        : player,
    ),
    cities: base.cities.map((city) =>
      cities.some((candidate) => candidate.id === city.id)
        ? { ...city, ownerId: owner }
        : city,
    ),
    board: {
      ...base.board,
      tiles: base.board.tiles.map((tile) => {
        const port = ports.find((candidate) => same(candidate.at, tile.at));
        return port === undefined
          ? tile
          : {
              ...tile,
              biome: null,
              terrain: "SHALLOW_WATER" as const,
              resource: null,
              improvement: "PORT" as const,
              road: false,
              fieldDefense: false,
              site: null,
              territoryCityId: port.cityId,
            };
      }),
    },
  };
}

function researchRoadsState(): GameStateV7 {
  const base = initialV7(83);
  const owner = base.humanPlayerId;
  const capital = required(base.cities.find((city) => city.ownerId === owner));
  const villageAndRoute = required(
    base.board.tiles
      .filter(
        (tile) => tile.site === "VILLAGE" && tile.territoryCityId === null,
      )
      .map((village) => ({
        village,
        route: roadRoute(base, owner, capital.at, village.at),
      }))
      .find((item) => item.route !== null),
  );
  const village = villageAndRoute.village;
  const route = required(villageAndRoute.route);
  const actor = required(base.units.find((unit) => unit.ownerId === owner));
  const prepared = checkedV7({
    ...base,
    players: base.players.map((player) =>
      player.id === owner
        ? {
            ...player,
            coins: 10_000,
            explored: base.board.tiles.map((tile) => tile.at),
          }
        : player,
    ),
    units: base.units.map((unit) =>
      unit.id === actor.id
        ? { ...unit, at: village.at, captureEligible: true }
        : unit,
    ),
  });
  const captured = applyCommandV7(prepared, owner, {
    kind: "CAPTURE",
    unitId: actor.id,
  });
  if (!captured.accepted) throw new Error(captured.error.code);
  const newCity = required(
    captured.state.cities.find((city) => same(city.at, village.at)),
  );
  const researched = checkedV7({
    ...captured.state,
    players: captured.state.players.map((player) =>
      player.id === owner
        ? {
            ...player,
            coins: 10_000,
            researchedTechs: ["GATHERING", "SCOUTING"],
          }
        : player,
    ),
  });
  return checkedV7({
    ...researched,
    board: {
      ...researched.board,
      tiles: researched.board.tiles.map((tile) => ({
        ...tile,
        road: tile.site === null && route.some((at) => same(at, tile.at)),
        territoryCityId: same(tile.at, village.at)
          ? newCity.id
          : tile.territoryCityId,
      })),
    },
  });
}

function adjacentLand(state: GameStateV7, at: CoordV7): CoordV7 {
  return required(
    neighbors(at).find((next) => {
      const tile = tileAt(state, next);
      return tile !== undefined && tile.biome !== null && tile.site === null;
    }),
  );
}

function splashWaterPositions(
  state: GameStateV7,
): readonly [CoordV7, CoordV7, CoordV7] {
  for (const target of state.board.tiles) {
    if (target.biome !== null || target.terrain !== "SHALLOW_WATER") continue;
    const victim = neighbors(target.at).find((at) => {
      const tile = tileAt(state, at);
      return tile?.biome === null && tile.terrain === "SHALLOW_WATER";
    });
    if (victim === undefined) continue;
    const attacker = state.board.tiles.find(
      (tile) =>
        tile.biome === null &&
        tile.terrain === "SHALLOW_WATER" &&
        Math.max(
          Math.abs(tile.at.x - target.at.x),
          Math.abs(tile.at.y - target.at.y),
        ) >= 2 &&
        Math.max(
          Math.abs(tile.at.x - target.at.x),
          Math.abs(tile.at.y - target.at.y),
        ) <= 3 &&
        !same(tile.at, victim),
    );
    if (attacker !== undefined) return [attacker.at, target.at, victim];
  }
  throw new Error("splash water formation missing");
}

function chebyshevRoute(from: CoordV7, to: CoordV7): CoordV7[] {
  const route: CoordV7[] = [];
  let current = from;
  while (!same(current, to)) {
    current = {
      x: current.x + Math.sign(to.x - current.x),
      y: current.y + Math.sign(to.y - current.y),
    };
    route.push(current);
  }
  return route;
}

function roadRoute(
  state: GameStateV7,
  owner: PlayerId,
  from: CoordV7,
  to: CoordV7,
): CoordV7[] | null {
  const queue: CoordV7[][] = [[from]];
  const seen = new Set([key(from)]);
  while (queue.length > 0) {
    const path = required(queue.shift());
    const current = required(path.at(-1));
    if (same(current, to)) return path;
    for (const next of neighbors(current)) {
      const tile = tileAt(state, next);
      if (tile === undefined || tile.biome === null || seen.has(key(next)))
        continue;
      const territory = state.cities.find(
        (city) => city.id === tile.territoryCityId,
      );
      if (
        !same(next, to) &&
        tile.territoryCityId !== null &&
        territory?.ownerId !== owner
      )
        continue;
      seen.add(key(next));
      queue.push([...path, next]);
    }
  }
  return null;
}

function landComponents(state: GameStateV7): CoordV7[][] {
  const remaining = new Set(
    state.board.tiles
      .filter((tile) => tile.biome !== null)
      .map((tile) => key(tile.at)),
  );
  const result: CoordV7[][] = [];
  while (remaining.size > 0) {
    const first = remaining.values().next().value as string;
    const coordinateParts = first.split(",").map(Number);
    const y = required(coordinateParts[0]);
    const x = required(coordinateParts[1]);
    const queue: CoordV7[] = [{ x, y }];
    const component: CoordV7[] = [];
    remaining.delete(first);
    while (queue.length > 0) {
      const current = required(queue.shift());
      component.push(current);
      for (const next of neighbors(current)) {
        const nextKey = key(next);
        if (!remaining.has(nextKey)) continue;
        remaining.delete(nextKey);
        queue.push(next);
      }
    }
    result.push(component);
  }
  return result;
}

function neighbors(at: CoordV7): CoordV7[] {
  const result: CoordV7[] = [];
  for (let dy = -1; dy <= 1; dy += 1)
    for (let dx = -1; dx <= 1; dx += 1)
      if (dx !== 0 || dy !== 0) result.push({ x: at.x + dx, y: at.y + dy });
  return result;
}

function tileAt(state: GameStateV7, at: CoordV7) {
  return state.board.tiles.find((tile) => same(tile.at, at));
}

function same(left: CoordV7, right: CoordV7): boolean {
  return left.x === right.x && left.y === right.y;
}

function key(at: CoordV7): string {
  return `${at.y},${at.x}`;
}

function required<T>(value: T | null | undefined): T {
  if (value === null || value === undefined)
    throw new Error("required fixture missing");
  return value;
}
