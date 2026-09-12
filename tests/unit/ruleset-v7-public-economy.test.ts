import { describe, expect, it } from "vitest";
import {
  applyCommandV7,
  cityIncomeV7,
  previewEconomicV7,
  queryAiReadyCommandsV7,
  queryPlayerCommandsV7,
  queryPublicEconomicPotentialsV7,
  scorePublicSpatialPlanV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type GameStateV7,
  type PlayerViewV7,
} from "../../src/engine/index";
import {
  allTechsV7,
  checkedV7,
  exploredAllV7,
  initialV7,
  richV7,
} from "../fixtures/v7-builders";

describe("ruleset-7 pure public economy", () => {
  it("routes authoritative compatibility calls through the same PlayerView calculation", () => {
    const first = farmPreviewState(7_280);
    const hiddenAt = required(
      first.state.board.tiles.find(
        (tile) =>
          tile.territoryCityId === null &&
          !same(tile.at, first.target) &&
          !first.state.units.some((unit) => same(unit.at, tile.at)),
      ),
      "hidden tile missing",
    ).at;
    const hiddenUnitId = required(
      first.state.units.find(
        (unit) => unit.ownerId !== first.state.humanPlayerId,
      ),
      "enemy unit missing",
    ).id;
    const conceal = (resource: "GAME" | null) =>
      checkedV7({
        ...first.state,
        players: first.state.players.map((player) =>
          player.id === first.state.humanPlayerId
            ? {
                ...player,
                explored: player.explored.filter((at) => !same(at, hiddenAt)),
              }
            : player,
        ),
        board: {
          ...first.state.board,
          tiles: first.state.board.tiles.map((tile) =>
            same(tile.at, hiddenAt)
              ? { ...tile, terrain: "FOREST" as const, resource }
              : tile,
          ),
        },
        units: first.state.units.map((unit) =>
          unit.id === hiddenUnitId
            ? {
                ...unit,
                role: "SABOTEUR" as const,
                at: hiddenAt,
                hp: resource === "GAME" ? 10 : 9,
                maxHp: 10,
                blackoutEligibleRound: 1,
              }
            : unit,
        ),
      });
    const states = [conceal("GAME"), conceal(null)];
    const views = states.map((state) => viewForV7(state, state.humanPlayerId));
    expect(JSON.stringify(views[0])).toBe(JSON.stringify(views[1]));
    expect(
      views.every((view) =>
        view.units.every((unit) => unit.id !== hiddenUnitId),
      ),
    ).toBe(true);
    const command = { kind: "BUILD_FARM", at: first.target } as const;
    const publicResults = views.map((view) => previewEconomicV7(view, command));
    expect(publicResults[0]).toEqual(publicResults[1]);
    expect(
      JSON.stringify(
        queryPublicEconomicPotentialsV7(required(views[0], "view missing")),
      ),
    ).toBe(
      JSON.stringify(
        queryPublicEconomicPotentialsV7(required(views[1], "view missing")),
      ),
    );
    expect(
      scorePublicSpatialPlanV7(required(views[0], "view missing"), command),
    ).toBe(
      scorePublicSpatialPlanV7(required(views[1], "view missing"), command),
    );
    for (let index = 0; index < states.length; index += 1)
      expect(
        previewEconomicV7(
          required(states[index], "state missing"),
          first.state.humanPlayerId,
          command,
        ),
      ).toEqual(publicResults[index]);
    expect(publicResults[0]).toMatchObject({
      ok: true,
      preview: {
        cost: 5,
        resultingContribution: 2,
        outputTransitions: [
          {
            at: first.target,
            improvement: "FARM",
            measure: "POPULATION",
            before: 0,
            after: 2,
            change: "CREATED",
          },
        ],
      },
    });
  });

  it("matches accepted reducer population, income, and level deltas", () => {
    const staged = farmPreviewState(7_281);
    const view = viewForV7(staged.state, staged.state.humanPlayerId);
    const command = { kind: "BUILD_FARM", at: staged.target } as const;
    const preview = previewEconomicV7(view, command);
    const result = applyCommandV7(
      staged.state,
      staged.state.humanPlayerId,
      command,
    );
    if (!result.accepted || !preview.ok) throw new Error("build not accepted");
    const beforeCity = required(
      staged.state.cities.find((city) => city.id === staged.cityId),
      "before city missing",
    );
    const afterCity = required(
      result.state.cities.find((city) => city.id === staged.cityId),
      "after city missing",
    );
    expect(preview.preview.populationDeltaByCity).toEqual([
      { cityId: staged.cityId, delta: 2 },
    ]);
    expect(preview.preview.levelsReached).toEqual(
      result.events.flatMap((event) =>
        event.kind === "CITY_LEVELED_UP" ? [event.level] : [],
      ),
    );
    expect(
      afterCity.permanentPopulation +
        afterCity.economicPopulation -
        beforeCity.permanentPopulation -
        beforeCity.economicPopulation,
    ).toBe(2);
  });

  it("matches reducer deltas for every exact offered economic target in a public map", () => {
    const state = richV7(allTechsV7(exploredAllV7(initialV7(7_288))));
    const view = viewForV7(state, state.humanPlayerId);
    const economicKinds = new Set([
      "HARVEST_FRUIT",
      "HUNT_GAME",
      "BUILD_FARM",
      "BUILD_LUMBER_CAMP",
      "BUILD_MINE",
      "BUILD_WINDMILL",
      "BUILD_SAWMILL",
      "BUILD_FORGE",
      "BUILD_WORKSHOP",
      "BUILD_GRAND_WORKS",
      "BUILD_MARKET",
      "CLEAR_FOREST",
      "REPLANT_FOREST",
      "BUILD_ROAD",
      "REDEVELOP",
    ]);
    const commands = queryPlayerCommandsV7(view).filter(
      (command): command is Extract<CommandV7, { at: CoordV7 }> =>
        "at" in command && economicKinds.has(command.kind),
    );
    expect(commands.length).toBeGreaterThan(0);
    for (const command of commands) {
      const preview = previewEconomicV7(view, command);
      const result = applyCommandV7(state, state.humanPlayerId, command);
      expect(result.accepted, JSON.stringify(command)).toBe(true);
      expect(preview.ok, JSON.stringify(command)).toBe(true);
      if (!result.accepted || !preview.ok) continue;
      const populationDeltaByCity = state.cities
        .map((city) => {
          const after = required(
            result.state.cities.find((candidate) => candidate.id === city.id),
            "after city missing",
          );
          return {
            cityId: city.id,
            delta:
              after.permanentPopulation +
              after.economicPopulation -
              city.permanentPopulation -
              city.economicPopulation,
          };
        })
        .filter((entry) => entry.delta !== 0);
      const coinIncomeDeltaByCity = state.cities
        .map((city) => {
          const after = required(
            result.state.cities.find((candidate) => candidate.id === city.id),
            "income city missing",
          );
          return {
            cityId: city.id,
            delta:
              cityIncomeV7(result.state, after) - cityIncomeV7(state, city),
          };
        })
        .filter((entry) => entry.delta !== 0);
      expect(preview.preview.populationDeltaByCity).toEqual(
        populationDeltaByCity,
      );
      expect(preview.preview.coinIncomeDeltaByCity).toEqual(
        coinIncomeDeltaByCity,
      );
      expect(preview.preview.levelsReached).toEqual(
        result.events.flatMap((event) =>
          event.kind === "CITY_LEVELED_UP" ? [event.level] : [],
        ),
      );
    }
  });

  it("rejects Clear Forest coin overflow and accepts the last safe value", () => {
    const base = richV7(allTechsV7(exploredAllV7(initialV7(7_289))));
    const command = queryPlayerCommandsV7(
      viewForV7(base, base.humanPlayerId),
    ).find((candidate) => candidate.kind === "CLEAR_FOREST");
    if (command?.kind !== "CLEAR_FOREST")
      throw new Error("Clear Forest command missing");
    const withCoins = (coins: number) =>
      checkedV7({
        ...base,
        players: base.players.map((player) =>
          player.id === base.humanPlayerId ? { ...player, coins } : player,
        ),
      });

    const overflow = withCoins(Number.MAX_SAFE_INTEGER);
    expect(
      previewEconomicV7(viewForV7(overflow, overflow.humanPlayerId), command),
    ).toEqual({ ok: false, error: "NOT_OFFERED" });
    expect(
      applyCommandV7(overflow, overflow.humanPlayerId, command),
    ).toMatchObject({
      accepted: false,
      error: { code: "INTEGER_OVERFLOW" },
    });

    const lastSafe = withCoins(Number.MAX_SAFE_INTEGER - 1);
    expect(
      previewEconomicV7(lastSafe, lastSafe.humanPlayerId, command),
    ).toMatchObject({ ok: true, preview: { cost: 0 } });
    const accepted = applyCommandV7(lastSafe, lastSafe.humanPlayerId, command);
    if (!accepted.accepted) throw new Error(accepted.error.code);
    expect(
      accepted.state.players.find(
        (player) => player.id === lastSafe.humanPlayerId,
      )?.coins,
    ).toBe(Number.MAX_SAFE_INTEGER);
  });

  it("offers Mine only for revealed Ore after Engineering", () => {
    const staged = farmPreviewState(7_282);
    const mountain = emptyOwnedTile(staged.state, staged.cityId, [
      staged.target,
    ]);
    const hidden = checkedV7({
      ...staged.state,
      players: staged.state.players.map((player) =>
        player.id === staged.state.humanPlayerId
          ? {
              ...player,
              researchedTechs: player.researchedTechs.filter(
                (tech) =>
                  tech !== "ENGINEERING" &&
                  tech !== "METALLURGY" &&
                  tech !== "GRAND_WORKS",
              ),
              coins: 0,
            }
          : player,
      ),
      board: {
        ...staged.state.board,
        tiles: staged.state.board.tiles.map((tile) =>
          same(tile.at, mountain)
            ? {
                ...tile,
                terrain: "MOUNTAIN" as const,
                resource: "ORE",
              }
            : tile,
        ),
      },
    });
    const hiddenView = viewForV7(hidden, hidden.humanPlayerId);
    expect(tileInView(hiddenView, mountain)).toMatchObject({ resource: null });
    expect(potential(hiddenView, "BUILD_MINE").targets).toBe(0);

    const knownState = checkedV7({
      ...hidden,
      players: hidden.players.map((player) =>
        player.id === hidden.humanPlayerId
          ? {
              ...player,
              researchedTechs: [...player.researchedTechs, "ENGINEERING"],
            }
          : player,
      ),
    });
    const knownView = viewForV7(knownState, knownState.humanPlayerId);
    expect(knownView.viewer.coins).toBe(0);
    expect(potential(knownView, "BUILD_MINE").targets).toBeGreaterThan(0);
  });

  it("applies after-state resource visibility to removal and Clear planning", () => {
    const staged = farmPreviewState(7_283);
    const baseView = viewForV7(staged.state, staged.state.humanPlayerId);
    const withoutGathering: PlayerViewV7 = {
      ...baseView,
      viewer: {
        ...baseView.viewer,
        researchedTechs: baseView.viewer.researchedTechs.filter(
          (tech) => tech !== "GATHERING",
        ),
      },
    };
    const withFarm: PlayerViewV7 = {
      ...withoutGathering,
      board: {
        ...withoutGathering.board,
        tiles: withoutGathering.board.tiles.map((tile) =>
          same(tile.at, staged.target) && tile.explored
            ? { ...tile, resource: null, improvement: "FARM" as const }
            : tile,
        ),
      },
      cities: withoutGathering.cities.map((city) =>
        city.id === staged.cityId
          ? { ...city, economicPopulation: 2, population: 2 }
          : city,
      ),
      populationContributions: [],
    };
    expect(
      previewEconomicV7(withFarm, {
        kind: "REDEVELOP",
        at: staged.target,
      }),
    ).toMatchObject({
      ok: true,
      preview: { resourceRestored: "FERTILE_GROUND" },
    });

    const mountainAt = emptyOwnedViewTile(withFarm, staged.cityId, [
      staged.target,
    ]);
    const processorOnMountain = patchViewTile(withFarm, mountainAt, {
      terrain: "MOUNTAIN",
      resource: null,
      improvement: "FORGE",
    });
    expect(
      previewEconomicV7(processorOnMountain, {
        kind: "REDEVELOP",
        at: mountainAt,
      }),
    ).toMatchObject({
      ok: true,
      preview: { resourceRestored: null },
    });

    const mine = patchViewTile(withFarm, mountainAt, {
      terrain: "MOUNTAIN",
      resource: null,
      improvement: "MINE",
    });
    const beforeEngineering: PlayerViewV7 = {
      ...mine,
      viewer: {
        ...mine.viewer,
        researchedTechs: mine.viewer.researchedTechs.filter(
          (tech) => tech !== "ENGINEERING",
        ),
      },
    };
    expect(
      previewEconomicV7(beforeEngineering, {
        kind: "REDEVELOP",
        at: mountainAt,
      }),
    ).toMatchObject({ ok: true, preview: { resourceRestored: null } });
    expect(
      previewEconomicV7(mine, { kind: "REDEVELOP", at: mountainAt }),
    ).toMatchObject({ ok: true, preview: { resourceRestored: "ORE" } });

    const forestAt = emptyOwnedViewTile(withFarm, staged.cityId, [
      staged.target,
      mountainAt,
    ]);
    const forest = patchViewTile(withFarm, forestAt, {
      terrain: "FOREST",
      resource: null,
      improvement: null,
    });
    expect(
      scorePublicSpatialPlanV7(forest, {
        kind: "CLEAR_FOREST",
        at: forestAt,
      }),
    ).toBeLessThanOrEqual(0);
  });

  it("uses frozen reward and achievement ordinals in AI-ready content tie-breaks", () => {
    const staged = farmPreviewState(7_284);
    const base = viewForV7(staged.state, staged.state.humanPlayerId);
    const rewardView: PlayerViewV7 = {
      ...base,
      pendingChoices: [
        {
          kind: "CITY_REWARD",
          cityId: staged.cityId,
          reachedLevel: 5,
          candidates: ["JUGGERNAUT", "TREASURY"],
        },
      ],
    };
    const rewardContent = queryAiReadyCommandsV7(rewardView).map(
      (candidate) => candidate.tuple[10],
    );
    expect(rewardContent).toEqual([-6, -7]);

    const monumentView: PlayerViewV7 = {
      ...base,
      viewer: {
        ...base.viewer,
        achievementEntitlements: [
          { achievement: "ENGINEER", unlocked: true, spent: false },
          { achievement: "MUSTER", unlocked: true, spent: false },
        ],
      },
    };
    const monuments = queryAiReadyCommandsV7(monumentView).filter(
      (candidate) => candidate.command.kind === "BUILD_MONUMENT",
    );
    expect(monuments.some((candidate) => candidate.tuple[10] === 0)).toBe(true);
    expect(monuments.some((candidate) => candidate.tuple[10] === -1)).toBe(
      true,
    );
  });

  it("requires two positive processor types and an actually legal Grand Works site", () => {
    const staged = farmPreviewState(7_286);
    const base = viewForV7(staged.state, staged.state.humanPlayerId);
    const cells = processorPlanCells(base, staged.cityId);
    const positive = patchViewTiles(base, [
      { at: cells.target, resource: null, improvement: null },
      { at: cells.windmill, resource: null, improvement: "WINDMILL" },
      { at: cells.farm, resource: null, improvement: "FARM" },
      { at: cells.forge, resource: null, improvement: "FORGE" },
      { at: cells.mine, resource: null, improvement: "MINE" },
    ]);
    expect(potential(positive, "BUILD_GRAND_WORKS").targets).toBeGreaterThan(0);

    const zeroForge = patchViewTile(positive, cells.mine, {
      improvement: null,
      resource: null,
    });
    expect(potential(zeroForge, "BUILD_GRAND_WORKS").targets).toBe(0);

    const duplicate = patchViewTile(positive, cells.target, {
      improvement: "GRAND_WORKS",
    });
    expect(potential(duplicate, "BUILD_GRAND_WORKS").targets).toBe(0);
  });

  it("uses an exposed exact Market output with partially hidden contributors at the floor", () => {
    const staged = farmPreviewState(7_287);
    const base = viewForV7(staged.state, staged.state.humanPlayerId);
    const city = required(
      base.cities.find((candidate) => candidate.id === staged.cityId),
      "income city missing",
    );
    const marketAt = emptyOwnedViewTile(base, city.id, [staged.target]);
    const hiddenAt = emptyOwnedViewTile(base, city.id, [
      staged.target,
      marketAt,
    ]);
    const patched = patchViewTiles(base, [
      { at: staged.target, resource: "FRUIT", improvement: null },
      { at: marketAt, resource: null, improvement: "MARKET" },
    ]);
    const view: PlayerViewV7 = {
      ...patched,
      board: {
        ...patched.board,
        tiles: patched.board.tiles.map((tile) =>
          same(tile.at, hiddenAt) ? { at: tile.at, explored: false } : tile,
        ),
      },
      cities: patched.cities.map((candidate) =>
        candidate.id === city.id
          ? {
              ...candidate,
              level: 6,
              permanentPopulation: 12,
              economicPopulation: 0,
              population: -8,
              rewards: [
                { reachedLevel: 2, reward: "STOCKPILE" },
                { reachedLevel: 3, reward: "WALLS" },
                { reachedLevel: 4, reward: "EXPAND" },
                { reachedLevel: 5, reward: "TREASURY" },
                { reachedLevel: 6, reward: "TREASURY" },
              ],
            }
          : candidate,
      ),
      improvementValues: [
        {
          at: marketAt,
          improvement: "MARKET",
          level: 2,
          measure: "COIN_INCOME",
          contributingTiles: [],
        },
      ],
    };
    expect(
      previewEconomicV7(view, { kind: "HARVEST_FRUIT", at: staged.target }),
    ).toMatchObject({
      ok: true,
      preview: {
        populationDeltaByCity: [{ cityId: city.id, delta: 1 }],
        coinIncomeDeltaByCity: [{ cityId: city.id, delta: 1 }],
      },
    });
    expect(
      previewEconomicV7(
        { ...view, improvementValues: [] },
        { kind: "HARVEST_FRUIT", at: staged.target },
      ),
    ).toEqual({ ok: false, error: "NOT_OFFERED" });
  });

  it("is bounds-safe and keeps expansion/Monument planning deterministic", () => {
    const staged = farmPreviewState(7_285);
    const base = viewForV7(staged.state, staged.state.humanPlayerId);
    expect(
      previewEconomicV7(base, {
        kind: "BUILD_ROAD",
        at: { x: -1, y: 0 },
      }),
    ).toEqual({ ok: false, error: "NOT_OFFERED" });
    expect(
      previewEconomicV7(base, {
        kind: "BUILD_ROAD",
        at: { x: base.board.width, y: 0 },
      }),
    ).toEqual({ ok: false, error: "NOT_OFFERED" });

    const entitlementView: PlayerViewV7 = {
      ...base,
      viewer: {
        ...base.viewer,
        achievementEntitlements: [
          { achievement: "ENGINEER", unlocked: true, spent: false },
          { achievement: "MUSTER", unlocked: false, spent: false },
        ],
      },
    };
    const monument = required(
      queryAiReadyCommandsV7(entitlementView).find(
        (candidate) => candidate.command.kind === "BUILD_MONUMENT",
      ),
      "Monument command missing",
    ).command;
    expect(scorePublicSpatialPlanV7(entitlementView, monument)).toBe(
      scorePublicSpatialPlanV7(entitlementView, monument),
    );

    const twoCities = twoCityEmptyEconomyView(base);
    const firstCity = required(
      twoCities.cities
        .filter((city) => city.ownerId === twoCities.viewer.id)
        .sort((left, right) => left.id - right.id)[0],
      "first planning city missing",
    );
    const monumentAt = emptyOwnedViewTile(twoCities, firstCity.id);
    const monumentPlan = {
      kind: "BUILD_MONUMENT",
      achievement: "ENGINEER",
      at: monumentAt,
    } as const;
    expect(scorePublicSpatialPlanV7(twoCities, monumentPlan)).toBe(-29);

    const expandCity = required(
      base.cities.find((city) => city.id === staged.cityId),
      "expand city missing",
    );
    const outer = required(
      base.board.tiles.find(
        (tile) =>
          tile.explored &&
          tile.territoryCityId === null &&
          chebyshev(tile.at, expandCity.at) === 2,
      ),
      "visible expansion tile missing",
    ).at;
    const expandView: PlayerViewV7 = {
      ...patchViewTile(base, outer, {
        terrain: "GRASS",
        resource: "FERTILE_GROUND",
        improvement: null,
        site: null,
      }),
      pendingChoices: [
        {
          kind: "CITY_REWARD",
          cityId: staged.cityId,
          reachedLevel: 4,
          candidates: ["EXPAND", "BOOM"],
        },
      ],
    };
    const expand: CommandV7 = {
      kind: "CHOOSE_CITY_REWARD",
      cityId: staged.cityId,
      reachedLevel: 4,
      reward: "EXPAND",
    };
    expect(scorePublicSpatialPlanV7(expandView, expand)).toBeGreaterThan(0);
  });
});

function farmPreviewState(seed: number): {
  readonly state: GameStateV7;
  readonly cityId: GameStateV7["cities"][number]["id"];
  readonly target: CoordV7;
} {
  const base = richV7(allTechsV7(exploredAllV7(initialV7(seed))));
  const city = required(
    base.cities.find((candidate) => candidate.ownerId === base.humanPlayerId),
    "city missing",
  );
  const target = emptyOwnedTile(base, city.id);
  return {
    cityId: city.id,
    target,
    state: checkedV7({
      ...base,
      treasureChests: base.treasureChests.filter(
        (chest) => !same(chest, target),
      ),
      board: {
        ...base.board,
        tiles: base.board.tiles.map((tile) =>
          same(tile.at, target)
            ? {
                ...tile,
                terrain: "GRASS" as const,
                resource: "FERTILE_GROUND" as const,
                improvement: null,
                site: null,
              }
            : tile,
        ),
      },
    }),
  };
}

function emptyOwnedTile(
  state: GameStateV7,
  cityId: GameStateV7["cities"][number]["id"],
  excluded: readonly CoordV7[] = [],
): CoordV7 {
  return required(
    state.board.tiles.find(
      (tile) =>
        tile.territoryCityId === cityId &&
        tile.site === null &&
        tile.resource === null &&
        tile.improvement === null &&
        !excluded.some((at) => same(at, tile.at)) &&
        !state.treasureChests.some((chest) => same(chest, tile.at)),
    ),
    "empty owned tile missing",
  ).at;
}

function emptyOwnedViewTile(
  view: PlayerViewV7,
  cityId: GameStateV7["cities"][number]["id"],
  excluded: readonly CoordV7[] = [],
): CoordV7 {
  return required(
    view.board.tiles.find(
      (tile) =>
        tile.explored &&
        tile.territoryCityId === cityId &&
        tile.site === null &&
        tile.resource === null &&
        tile.improvement === null &&
        !excluded.some((at) => same(at, tile.at)),
    ),
    "empty public tile missing",
  ).at;
}

function patchViewTile(
  view: PlayerViewV7,
  at: CoordV7,
  patch: Partial<
    Extract<PlayerViewV7["board"]["tiles"][number], { explored: true }>
  >,
): PlayerViewV7 {
  return {
    ...view,
    board: {
      ...view.board,
      tiles: view.board.tiles.map((tile) =>
        same(tile.at, at) && tile.explored ? { ...tile, ...patch } : tile,
      ),
    },
  };
}

function patchViewTiles(
  view: PlayerViewV7,
  patches: readonly {
    readonly at: CoordV7;
    readonly improvement?: Extract<
      PlayerViewV7["board"]["tiles"][number],
      { explored: true }
    >["improvement"];
    readonly resource?: Extract<
      PlayerViewV7["board"]["tiles"][number],
      { explored: true }
    >["resource"];
  }[],
): PlayerViewV7 {
  return patches.reduce(
    (result, patch) => patchViewTile(result, patch.at, patch),
    view,
  );
}

function processorPlanCells(view: PlayerViewV7, cityId: number) {
  const cells = view.board.tiles.filter(
    (
      tile,
    ): tile is Extract<
      PlayerViewV7["board"]["tiles"][number],
      { explored: true }
    > => tile.explored && tile.territoryCityId === cityId && tile.site === null,
  );
  for (const target of cells)
    for (const windmill of cells)
      for (const farm of cells)
        for (const forge of cells)
          for (const mine of cells) {
            const values = [target, windmill, farm, forge, mine];
            if (
              new Set(values.map((tile) => `${tile.at.y},${tile.at.x}`)).size <
              5
            )
              continue;
            if (
              chebyshev(target.at, windmill.at) === 1 &&
              chebyshev(target.at, forge.at) === 1 &&
              chebyshev(windmill.at, farm.at) === 1 &&
              chebyshev(forge.at, mine.at) === 1
            )
              return {
                target: target.at,
                windmill: windmill.at,
                farm: farm.at,
                forge: forge.at,
                mine: mine.at,
              };
          }
  throw new Error("processor plan cells missing");
}

function twoCityEmptyEconomyView(view: PlayerViewV7): PlayerViewV7 {
  const ownedCities = view.cities.slice(0, 2);
  const cityIds = new Set(ownedCities.map((city) => city.id));
  return {
    ...view,
    viewer: {
      ...view.viewer,
      achievementEntitlements: [
        { achievement: "ENGINEER", unlocked: true, spent: false },
        { achievement: "MUSTER", unlocked: false, spent: false },
      ],
    },
    leaderboard: view.leaderboard.map((entry) => ({
      ...entry,
      cityCount: entry.isViewer ? ownedCities.length : 0,
    })),
    cities: ownedCities.map((city) => ({
      ...city,
      ownerId: view.viewer.id,
      blackout: null,
    })),
    board: {
      ...view.board,
      tiles: view.board.tiles.map((tile) =>
        tile.explored &&
        tile.territoryCityId !== null &&
        cityIds.has(tile.territoryCityId)
          ? {
              ...tile,
              terrain: "MOUNTAIN" as const,
              resource: null,
              improvement: null,
              road: false,
              territoryOwnerId: view.viewer.id,
            }
          : tile,
      ),
    },
    units: view.units.filter((unit) => unit.ownerId === view.viewer.id),
    unitStats: view.unitStats.filter((stats) =>
      view.units.some(
        (unit) => unit.id === stats.unitId && unit.ownerId === view.viewer.id,
      ),
    ),
    improvementValues: [],
    populationContributions: [],
    pendingChoices: [],
  };
}

function tileInView(view: PlayerViewV7, at: CoordV7) {
  return required(
    view.board.tiles.find((tile) => same(tile.at, at)),
    "public tile missing",
  );
}

function potential(
  view: PlayerViewV7,
  command: ReturnType<
    typeof queryPublicEconomicPotentialsV7
  >[number]["command"],
) {
  return required(
    queryPublicEconomicPotentialsV7(view).find(
      (candidate) => candidate.command === command,
    ),
    "economic potential missing",
  );
}

function required<T>(value: T | undefined, message: string): T {
  if (value === undefined) throw new Error(message);
  return value;
}

function same(left: CoordV7, right: CoordV7): boolean {
  return left.x === right.x && left.y === right.y;
}

function chebyshev(left: CoordV7, right: CoordV7): number {
  return Math.max(Math.abs(left.x - right.x), Math.abs(left.y - right.y));
}
