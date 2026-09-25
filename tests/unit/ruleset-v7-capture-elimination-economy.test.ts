import { describe, expect, it } from "vitest";
import {
  applyCommandV7,
  parseGameStateV7,
  recomputeLiveEconomyV7,
  type GameStateV7,
  type ImprovementIdV7,
  type PopulationContributionV7,
} from "../../src/engine/index";
import { checkedV7, initialV7 } from "../fixtures/v7-builders";

describe("Ruleset 7 capture elimination economy", () => {
  for (const improvement of ["PORT", "SHIPYARD"] as const) {
    it(`removes an eliminated owner's ${improvement} blockade before the single economy settlement`, () => {
      const fixture = captureAtDock(improvement, true);
      const result = applyCommandV7(fixture.state, fixture.actor, {
        kind: "CAPTURE",
        unitId: fixture.captorId,
      });

      expect(result.accepted).toBe(true);
      if (!result.accepted) return;
      expect(parseGameStateV7(result.state)).toEqual(result.state);
      expect(result.state.outcome).toEqual({
        kind: "VICTORY",
        winnerId: fixture.actor,
      });
      expect(
        result.state.units.some((unit) => unit.ownerId === fixture.formerOwner),
      ).toBe(false);
      expect(contributionAt(result.state, fixture.dockAt).amount).toBe(
        improvement === "SHIPYARD" ? 2 : 1,
      );
      expect(
        result.events.filter((event) => event.kind === "CITY_ECONOMY_CHANGED"),
      ).toEqual([]);
      expect(
        result.events.filter((event) => event.kind === "CITY_REWARD_QUEUED"),
      ).toHaveLength(improvement === "SHIPYARD" ? 1 : 0);
      expect(result.state.pendingChoices).toHaveLength(
        improvement === "SHIPYARD" ? 1 : 0,
      );
      expect(result.state.nextEntityId).toBe(fixture.state.nextEntityId);

      const kinds = result.events.map((event) => event.kind);
      const eliminationIndex = kinds.indexOf("PLAYER_ELIMINATED");
      expect(eliminationIndex).toBeGreaterThan(kinds.indexOf("CITY_CAPTURED"));
      expect(kinds.indexOf("UNIT_DIED")).toBeLessThan(eliminationIndex);
      if (improvement === "SHIPYARD")
        expect(kinds.indexOf("CITY_REWARD_QUEUED")).toBeLessThan(
          eliminationIndex,
        );
      expect(kinds.at(-1)).toBe("MATCH_ENDED");
    });
  }

  it("grows and queues one reward after an eliminated fleet unblocks another Shipyard", () => {
    const fixture = captureAtDock("PORT", true);
    const actorCity = required(
      fixture.state.cities.find((city) => city.ownerId === fixture.actor),
      "actor city missing",
    );
    const dock = required(
      fixture.state.board.tiles.find(
        (tile) =>
          tile.territoryCityId === actorCity.id &&
          tile.site === null &&
          tile.improvement === null &&
          !fixture.state.units.some((unit) => same(unit.at, tile.at)),
      ),
      "actor dock missing",
    );
    const blockader = required(
      fixture.state.units.find((unit) => unit.id === fixture.blockaderId),
      "blockader template missing",
    );
    const prepared = checkedV7({
      ...fixture.state,
      nextEntityId: fixture.state.nextEntityId + 2,
      board: {
        ...fixture.state.board,
        tiles: fixture.state.board.tiles.map((tile) =>
          same(tile.at, dock.at)
            ? {
                ...tile,
                biome: null,
                terrain: "SHALLOW_WATER" as const,
                resource: null,
                improvement: "SHIPYARD" as const,
                road: false,
                fieldDefense: false,
              }
            : tile,
        ),
      },
      populationContributions: [
        ...fixture.state.populationContributions,
        {
          id: fixture.state.nextEntityId + 1,
          cityId: actorCity.id,
          category: "LIVE" as const,
          amount: 0,
          source: {
            kind: "IMPROVEMENT" as const,
            improvement: "SHIPYARD" as const,
            at: dock.at,
          },
        },
      ],
      units: [
        ...fixture.state.units,
        {
          ...blockader,
          id: fixture.state.nextEntityId as GameStateV7["units"][number]["id"],
          at: dock.at,
        },
      ],
      treasureChests: fixture.state.treasureChests.filter(
        (chest) => !same(chest, dock.at),
      ),
    });
    const result = applyCommandV7(prepared, fixture.actor, {
      kind: "CAPTURE",
      unitId: fixture.captorId,
    });

    expect(result.accepted).toBe(true);
    if (!result.accepted) return;
    expect(parseGameStateV7(result.state)).toEqual(result.state);
    expect(contributionAt(result.state, dock.at).amount).toBe(2);
    expect(
      result.state.cities.find((city) => city.id === actorCity.id),
    ).toMatchObject({ level: 2, economicPopulation: 2, population: 0 });
    expect(result.state.pendingChoices).toEqual([
      {
        kind: "CITY_REWARD",
        cityId: actorCity.id,
        reachedLevel: 2,
        candidates: ["SURVEY", "STOCKPILE"],
      },
    ]);
    expect(result.state.nextEntityId).toBe(prepared.nextEntityId);

    const kinds = result.events.map((event) => event.kind);
    expect(
      kinds.filter((kind) => kind === "CITY_ECONOMY_CHANGED"),
    ).toHaveLength(1);
    expect(kinds.filter((kind) => kind === "CITY_LEVELED_UP")).toHaveLength(1);
    expect(kinds.filter((kind) => kind === "CITY_REWARD_QUEUED")).toHaveLength(
      1,
    );
    expect(kinds.indexOf("CITY_ECONOMY_CHANGED")).toBeLessThan(
      kinds.indexOf("CITY_LEVELED_UP"),
    );
    expect(kinds.indexOf("CITY_LEVELED_UP")).toBeLessThan(
      kinds.indexOf("CITY_REWARD_QUEUED"),
    );
    expect(kinds.indexOf("CITY_REWARD_QUEUED")).toBeLessThan(
      kinds.indexOf("UNIT_DIED"),
    );
    expect(kinds.indexOf("UNIT_DIED")).toBeLessThan(
      kinds.indexOf("PLAYER_ELIMINATED"),
    );
    expect(
      result.events
        .filter((event) => event.kind === "UNIT_DIED")
        .map((event) => event.unitId),
    ).toEqual(
      [fixture.blockaderId, fixture.state.nextEntityId].sort(
        (left, right) => left - right,
      ),
    );
  });

  it("keeps a surviving owner's Shipyard blockade and settles its captured reward once", () => {
    const fixture = captureAtDock("SHIPYARD", false);
    const result = applyCommandV7(fixture.state, fixture.actor, {
      kind: "CAPTURE",
      unitId: fixture.captorId,
    });

    expect(result.accepted).toBe(true);
    if (!result.accepted) return;
    expect(parseGameStateV7(result.state)).toEqual(result.state);
    expect(result.state.outcome).toBeNull();
    expect(
      result.state.players.find((player) => player.id === fixture.formerOwner)
        ?.status,
    ).toBe("ACTIVE");
    expect(
      result.state.units.find((unit) => unit.id === fixture.blockaderId),
    ).toMatchObject({ ownerId: fixture.formerOwner, at: fixture.dockAt });
    expect(contributionAt(result.state, fixture.dockAt).amount).toBe(0);
    expect(result.state.pendingChoices).toEqual([
      {
        kind: "CITY_REWARD",
        cityId: fixture.cityId,
        reachedLevel: 2,
        candidates: ["SURVEY", "STOCKPILE"],
      },
    ]);
    expect(
      result.events.filter((event) => event.kind === "CITY_REWARD_QUEUED"),
    ).toHaveLength(1);
    expect(
      result.events.some((event) => event.kind === "PLAYER_ELIMINATED"),
    ).toBe(false);
    expect(result.state.nextEntityId).toBe(fixture.state.nextEntityId);

    const rewarded = applyCommandV7(result.state, fixture.actor, {
      kind: "CHOOSE_CITY_REWARD",
      cityId: fixture.cityId,
      reachedLevel: 2,
      reward: "STOCKPILE",
    });
    expect(rewarded.accepted).toBe(true);
    if (!rewarded.accepted) return;
    expect(rewarded.state.pendingChoices).toEqual([]);
    expect(
      rewarded.state.cities
        .find((city) => city.id === fixture.cityId)
        ?.rewards.filter((reward) => reward.reachedLevel === 2),
    ).toEqual([{ reachedLevel: 2, reward: "STOCKPILE" }]);
    expect(
      rewarded.events.some((event) => event.kind === "CITY_REWARD_QUEUED"),
    ).toBe(false);
    expect(rewarded.state.nextEntityId).toBe(fixture.state.nextEntityId);
    expect(parseGameStateV7(rewarded.state)).toEqual(rewarded.state);
  });
});

function captureAtDock(
  improvement: Extract<ImprovementIdV7, "PORT" | "SHIPYARD">,
  finalCity: boolean,
): {
  readonly state: GameStateV7;
  readonly actor: GameStateV7["humanPlayerId"];
  readonly formerOwner: GameStateV7["humanPlayerId"];
  readonly cityId: GameStateV7["cities"][number]["id"];
  readonly captorId: GameStateV7["units"][number]["id"];
  readonly blockaderId: GameStateV7["units"][number]["id"];
  readonly dockAt: GameStateV7["board"]["tiles"][number]["at"];
} {
  const base = initialV7(improvement === "PORT" ? 73_001 : 73_002, 2);
  const actor = base.humanPlayerId;
  const formerOwner = required(
    base.players.find((player) => player.id !== actor),
    "former owner missing",
  ).id;
  const retired = required(
    base.players.find(
      (player) => player.id !== actor && player.id !== formerOwner,
    ),
    "retired player missing",
  );
  const target = required(
    base.cities.find((city) => city.ownerId === formerOwner),
    "target city missing",
  );
  const retiredCity = required(
    base.cities.find((city) => city.ownerId === retired.id),
    "retired city missing",
  );
  const captor = required(
    base.units.find((unit) => unit.ownerId === actor),
    "captor missing",
  );
  const blockader = required(
    base.units.find((unit) => unit.ownerId === formerOwner),
    "blockader missing",
  );
  const dock = required(
    base.board.tiles.find(
      (tile) =>
        tile.territoryCityId === target.id &&
        tile.site === null &&
        !base.units.some((unit) => same(unit.at, tile.at)),
    ),
    "dock tile missing",
  );
  const contribution: PopulationContributionV7 = {
    id: base.nextEntityId,
    cityId: target.id,
    category: "LIVE",
    amount: improvement === "SHIPYARD" ? 2 : 1,
    source: { kind: "IMPROVEMENT", improvement, at: dock.at },
  };
  const candidate: GameStateV7 = {
    ...base,
    nextEntityId: base.nextEntityId + 1,
    players: base.players.map((player) =>
      player.id === retired.id ? { ...player, status: "ELIMINATED" } : player,
    ),
    cities: base.cities.map((city) =>
      city.id === retiredCity.id
        ? { ...city, ownerId: finalCity ? actor : formerOwner }
        : city,
    ),
    board: {
      ...base.board,
      tiles: base.board.tiles.map((tile) =>
        same(tile.at, dock.at)
          ? {
              ...tile,
              biome: null,
              terrain: "SHALLOW_WATER" as const,
              resource: null,
              improvement,
              road: false,
              fieldDefense: false,
            }
          : tile,
      ),
    },
    populationContributions: [...base.populationContributions, contribution],
    units: base.units
      .filter((unit) => unit.ownerId !== retired.id)
      .map((unit) =>
        unit.id === captor.id
          ? {
              ...unit,
              at: target.at,
              captureEligible: true,
              activation: {
                ...unit.activation,
                moved: false,
                captured: false,
                handled: false,
              },
            }
          : unit.id === blockader.id
            ? {
                ...unit,
                homeCityId: target.id,
                role: "PATROL_BOAT" as const,
                form: "NAVAL" as const,
                at: dock.at,
                hp: 10,
                maxHp: 10,
              }
            : unit,
      ),
    treasureChests: base.treasureChests.filter(
      (chest) => !same(chest, dock.at),
    ),
  };
  const economy = recomputeLiveEconomyV7(
    candidate,
    candidate,
    candidate.populationContributions,
  );
  return {
    state: checkedV7({
      ...candidate,
      cities: economy.cities,
      populationContributions: economy.populationContributions,
    }),
    actor,
    formerOwner,
    cityId: target.id,
    captorId: captor.id,
    blockaderId: blockader.id,
    dockAt: dock.at,
  };
}

function contributionAt(
  state: GameStateV7,
  at: GameStateV7["board"]["tiles"][number]["at"],
): PopulationContributionV7 {
  return required(
    state.populationContributions.find(
      (contribution) =>
        contribution.source.at.x === at.x && contribution.source.at.y === at.y,
    ),
    "dock contribution missing",
  );
}

function required<T>(value: T | undefined, message: string): T {
  if (value === undefined) throw new Error(message);
  return value;
}

function same(
  left: { readonly x: number; readonly y: number },
  right: { readonly x: number; readonly y: number },
): boolean {
  return left.x === right.x && left.y === right.y;
}
