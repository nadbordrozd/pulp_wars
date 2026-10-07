import { describe, expect, it } from "vitest";
import {
  PROMOTION_KILLS_V7,
  applyCommandV7,
  projectEventsV7,
  queryPlayerCommandsV7,
  viewForV7,
  type CommandV7,
  type GameStateV7,
  type PlayerEventEnvelopeV7,
  type PlayerEventV7,
  type PlayerViewV7,
} from "../../src/engine/index";
import {
  feedbackPlanV7,
  promotionReadyUnitIdsV7,
  promotionReadyV7,
} from "../../src/render/feedback-plan-v7";
import { unitTurnStatesV7 } from "../../src/render/canvas/unit-turn-state-v7";
import { allTechsV7, exploredAllV7, initialV7 } from "../fixtures/v7-builders";
import { goblinArenaV7 } from "../fixtures/v7-goblin-arena";
import { dinosaurTendFixtureV7 } from "../fixtures/v7-area-support-ui";

/**
 * Bead pulp_wars-2yc.29: every Coin and population gain of a boundary maps
 * to the tile that earned it and to its amount, from the public views and
 * the projected events alone.
 */
function envelope(
  view: PlayerViewV7,
  events: readonly PlayerEventV7[],
): PlayerEventEnvelopeV7 {
  return {
    format: "pulp-wars-player-events",
    version: 7,
    viewerId: view.viewer.id,
    commandIndex: view.commandIndex,
    events,
  };
}

function step(state: GameStateV7, actor: number, command: CommandV7) {
  const applied = applyCommandV7(state, actor as never, command);
  if (!applied.accepted) throw new Error(JSON.stringify(applied.error));
  const human = state.humanPlayerId;
  return {
    state: applied.state,
    before: viewForV7(state, human),
    after: viewForV7(applied.state, human),
    events: projectEventsV7(state, applied.state, human, applied.events),
  };
}

const base = () => exploredAllV7(allTechsV7(initialV7()));

describe("feedback plan: Coins", () => {
  it("maps every Coin event of the viewer to its source tile and amount", () => {
    const state = base();
    const view = viewForV7(state, state.humanPlayerId);
    const viewer = view.viewer.id;
    const capital = view.cities.find((city) => city.ownerId === viewer);
    const enemy = view.units.find((unit) => unit.ownerId !== viewer);
    const own = view.units.find((unit) => unit.ownerId === viewer);
    if (capital === undefined || enemy === undefined || own === undefined)
      throw new Error("fixture");
    const tile = { x: 0, y: 0 };
    const events = [
      {
        kind: "INCOME_AWARDED",
        playerId: viewer,
        totalCoins: 5,
        cities: [{ cityId: capital.id, coins: 4 }],
      },
      {
        kind: "CITY_REWARD_CHOSEN",
        playerId: viewer,
        cityId: capital.id,
        reachedLevel: 2,
        reward: "STOCKPILE",
        coinDelta: 6,
      },
      {
        kind: "CITY_REWARD_AUTOMATICALLY_GRANTED",
        playerId: viewer,
        cityId: capital.id,
        reachedLevel: 9,
        reward: "TREASURY",
        coins: 12,
      },
      { kind: "UNIT_DIED", unitId: enemy.id, cause: "ATTACK" },
      { kind: "PLUNDER_AWARDED", playerId: viewer, kills: 1, coins: 2 },
      {
        kind: "IMPROVEMENT_PILLAGED",
        playerId: viewer,
        unitId: own.id,
        cityId: capital.id,
        at: { x: 3, y: 0 },
        improvement: "FARM",
        resourceRestored: null,
        coinDelta: 3,
      },
      {
        kind: "TREASURE_CAPTURED",
        playerId: viewer,
        unitId: own.id,
        at: { x: 4, y: 0 },
        requestedReward: "COINS",
        grantedReward: "COINS",
        coinDelta: 5,
        knightFallback: false,
        spawnedUnitId: null,
        spawnedAt: null,
        homeCityId: null,
      },
      {
        kind: "SPOILS_AWARDED",
        playerId: viewer,
        cityId: capital.id,
        coins: 2,
      },
      {
        kind: "UNIT_DISBANDED",
        playerId: viewer,
        unitId: own.id,
        role: own.role,
        coinDelta: 1,
      },
      {
        kind: "MONSTER_BOUNTY_AWARDED",
        playerId: viewer,
        unitId: enemy.id,
        coins: 10,
      },
      {
        kind: "WRECK_SALVAGED",
        playerId: viewer,
        unitId: own.id,
        at: tile,
        coins: 8,
      },
      {
        kind: "PEARLS_GATHERED",
        playerId: viewer,
        cityId: capital.id,
        at: { x: 5, y: 0 },
        cost: 2,
        coinsReceived: 4,
        coinDelta: 2,
      },
    ] as unknown as readonly PlayerEventV7[];
    const plan = feedbackPlanV7(view, envelope(view, events), view);
    expect(plan.coins).toEqual([
      // The income no city accounts for (1) comes from the capital too.
      { cause: "INCOME", at: capital.at, amount: 5 },
      { cause: "REWARD", at: capital.at, amount: 18 },
      { cause: "PLUNDER", at: enemy.at, amount: 2 },
      { cause: "PILLAGE", at: { x: 3, y: 0 }, amount: 3 },
      { cause: "CHEST", at: { x: 4, y: 0 }, amount: 5 },
      { cause: "SPOILS", at: capital.at, amount: 2 },
      { cause: "REFUND", at: own.at, amount: 1 },
      { cause: "BOUNTY", at: enemy.at, amount: 10 },
      { cause: "SALVAGE", at: tile, amount: 8 },
      { cause: "HARVEST", at: { x: 5, y: 0 }, amount: 2 },
    ]);
    expect(plan.coinTotal).toBe(56);
  });

  it("shows no Coins of another player and none for a loss", () => {
    const state = base();
    const view = viewForV7(state, state.humanPlayerId);
    const other = view.players.find((player) => player.id !== view.viewer.id);
    const city = view.cities[0];
    if (other === undefined || city === undefined) throw new Error("fixture");
    const plan = feedbackPlanV7(
      view,
      envelope(view, [
        {
          kind: "INCOME_AWARDED",
          playerId: other.id,
          totalCoins: 9,
          cities: [{ cityId: city.id, coins: 9 }],
        },
        {
          kind: "INCOME_AWARDED",
          playerId: view.viewer.id,
          totalCoins: -2,
          cities: [{ cityId: city.id, coins: -2 }],
        },
      ] as unknown as readonly PlayerEventV7[]),
      view,
    );
    expect(plan.coins).toEqual([]);
    expect(plan.coinTotal).toBe(0);
  });

  it("pays the real start-of-turn income from the paying cities", () => {
    let state = base();
    const human = state.humanPlayerId;
    state = step(state, human, { kind: "END_TURN" }).state;
    let last = null as ReturnType<typeof step> | null;
    for (let guard = 0; guard < 4; guard += 1) {
      const active = state.turnOrder[state.activeSeatIndex];
      if (active === undefined || active === human) break;
      last = step(state, active, { kind: "END_TURN" });
      state = last.state;
    }
    if (last === null) throw new Error("no round");
    const plan = feedbackPlanV7(last.before, last.events, last.after);
    const income = last.events.events.find(
      (event) => event.kind === "INCOME_AWARDED" && event.playerId === human,
    );
    if (income?.kind !== "INCOME_AWARDED") throw new Error("no income");
    expect(income.totalCoins).toBeGreaterThan(0);
    expect(plan.coinTotal).toBe(income.totalCoins);
    expect(plan.coinTotal).toBe(
      last.after.viewer.coins - last.before.viewer.coins,
    );
    for (const gain of plan.coins)
      expect(
        last.after.cities.some(
          (city) =>
            city.ownerId === human &&
            city.at.x === gain.at.x &&
            city.at.y === gain.at.y,
        ),
      ).toBe(true);
  });
});

describe("feedback plan: population", () => {
  it("sends a harvest's point from the resource tile to its city", () => {
    const state = base();
    const human = state.humanPlayerId;
    const view = viewForV7(state, human);
    const harvest = queryPlayerCommandsV7(view).find(
      (command) =>
        command.kind === "HARVEST_FRUIT" || command.kind === "HUNT_GAME",
    );
    if (
      harvest === undefined ||
      (harvest.kind !== "HARVEST_FRUIT" && harvest.kind !== "HUNT_GAME")
    )
      throw new Error("no harvest offered");
    const result = step(state, human, harvest);
    const plan = feedbackPlanV7(result.before, result.events, result.after);
    expect(plan.population).toHaveLength(1);
    const gain = plan.population[0];
    const city = result.after.cities.find((item) => item.id === gain?.cityId);
    expect(gain).toMatchObject({
      amount: 1,
      cityAt: city?.at,
      sources: [{ at: harvest.at, amount: 1 }],
      leveledUp: false,
      meterBefore: { level: 1, population: 0 },
    });
    // The harvest costs Coins: nothing flies to the counter.
    expect(plan.coins).toEqual([]);
  });

  it("names a new building as the source and reports the level-up", () => {
    let state = base();
    const human = state.humanPlayerId;
    let levelled = false;
    for (let guard = 0; guard < 6 && !levelled; guard += 1) {
      const view = viewForV7(state, human);
      if (view.pendingChoices.length > 0) break;
      const command = queryPlayerCommandsV7(view).find(
        (candidate) =>
          candidate.kind === "BUILD_FARM" ||
          candidate.kind === "BUILD_LUMBER_CAMP" ||
          candidate.kind === "HARVEST_FRUIT" ||
          candidate.kind === "HUNT_GAME",
      );
      if (command === undefined || !("at" in command)) break;
      const result = step(state, human, command);
      state = result.state;
      const plan = feedbackPlanV7(result.before, result.events, result.after);
      const gain = plan.population[0];
      if (gain === undefined) continue;
      expect(gain.sources.reduce((sum, source) => sum + source.amount, 0)).toBe(
        gain.amount,
      );
      expect(gain.sources[0]?.at).toEqual(command.at);
      levelled = gain.leveledUp;
    }
    expect(levelled).toBe(true);
  });

  it("gives another player's visible city its gain without a hidden source", () => {
    const state = base();
    const human = state.humanPlayerId;
    const before = viewForV7(state, human);
    const foreign = before.cities.find((city) => city.ownerId !== human);
    if (foreign === undefined) throw new Error("fixture");
    const after: PlayerViewV7 = {
      ...before,
      cities: before.cities.map((city) =>
        city.id === foreign.id
          ? {
              ...city,
              permanentPopulation: city.permanentPopulation + 1,
              population: city.population + 1,
            }
          : city,
      ),
    };
    const plan = feedbackPlanV7(before, envelope(before, []), after);
    expect(plan.population).toEqual([
      {
        cityId: foreign.id,
        cityAt: foreign.at,
        amount: 1,
        // No projected event names a tile: the point appears at the city.
        sources: [{ at: foreign.at, amount: 1 }],
        leveledUp: false,
        meterBefore: { level: foreign.level, population: foreign.population },
      },
    ]);
  });

  it("ignores a city that lost population or changed hands", () => {
    const state = base();
    const before = viewForV7(state, state.humanPlayerId);
    const [first, second] = before.cities;
    if (first === undefined || second === undefined) throw new Error("fixture");
    const after: PlayerViewV7 = {
      ...before,
      cities: before.cities.map((city) =>
        city.id === first.id
          ? { ...city, ownerId: second.ownerId, permanentPopulation: 5 }
          : city,
      ),
    };
    expect(
      feedbackPlanV7(before, envelope(before, []), after).population,
    ).toEqual([]);
  });
});

describe("feedback plan: Promotions", () => {
  const arena = (kills: number, veteran = false): GameStateV7 => {
    const state = goblinArenaV7(
      ["ORIGINAL", "ORIGINAL"],
      [
        { seat: 0, role: "FIGHTER", at: { x: 4, y: 4 } },
        { seat: 1, role: "FIGHTER", at: { x: 5, y: 4 }, hp: 1 },
        { seat: 1, role: "MARKSMAN", at: { x: 8, y: 4 } },
      ],
    );
    return {
      ...state,
      units: state.units.map((unit, index) =>
        index === 0
          ? { ...unit, kills, veteran }
          : index === 2
            ? { ...unit, kills: PROMOTION_KILLS_V7 }
            : unit,
      ),
    };
  };

  it("is ready exactly when PROMOTE is legal, from public facts", () => {
    for (const [kills, veteran] of [
      [PROMOTION_KILLS_V7 - 1, false],
      [PROMOTION_KILLS_V7, false],
      [PROMOTION_KILLS_V7, true],
    ] as const) {
      const state = arena(kills, veteran);
      const view = viewForV7(state, state.humanPlayerId);
      const unit = view.units.find((item) => item.ownerId === view.viewer.id);
      if (unit === undefined) throw new Error("fixture");
      expect(promotionReadyV7(view, unit)).toBe(
        queryPlayerCommandsV7(view).some(
          (command) => command.kind === "PROMOTE" && command.unitId === unit.id,
        ),
      );
    }
  });

  it("marks a visible enemy unit by its public kills, and no hidden one", () => {
    const state = arena(0);
    const human = state.humanPlayerId;
    const view = viewForV7(state, human);
    const enemy = view.units.find(
      (unit) => unit.ownerId !== human && unit.kills >= PROMOTION_KILLS_V7,
    );
    if (enemy === undefined) throw new Error("fixture");
    expect(promotionReadyUnitIdsV7(view).has(enemy.id)).toBe(true);
    // A unit the viewer cannot see is not in the view, so it has no marker.
    const hidden: PlayerViewV7 = {
      ...view,
      units: view.units.filter((unit) => unit.id !== enemy.id),
    };
    expect(promotionReadyUnitIdsV7(hidden).has(enemy.id)).toBe(false);
  });

  it("agrees with PROMOTE for every unit of a Dinosaur seat, its Egg included", () => {
    const state = dinosaurTendFixtureV7();
    const grown: GameStateV7 = {
      ...state,
      units: state.units.map((unit) =>
        unit.ownerId === state.humanPlayerId ? { ...unit, kills: 9 } : unit,
      ),
    };
    const view = viewForV7(grown, grown.humanPlayerId);
    const own = view.units.filter((unit) => unit.ownerId === view.viewer.id);
    expect(own.some((unit) => unit.form === "EGG")).toBe(true);
    for (const unit of own)
      expect(promotionReadyV7(view, unit)).toBe(
        queryPlayerCommandsV7(view).some(
          (command) => command.kind === "PROMOTE" && command.unitId === unit.id,
        ),
      );
  });

  it("reports the kill that earns a Promotion, then the Promotion", () => {
    let state = arena(PROMOTION_KILLS_V7 - 1);
    const human = state.humanPlayerId;
    const view = viewForV7(state, human);
    const attack = queryPlayerCommandsV7(view).find(
      (command) => command.kind === "ATTACK",
    );
    if (attack === undefined) throw new Error("no attack offered");
    const fought = step(state, human, attack);
    state = fought.state;
    const earned = feedbackPlanV7(fought.before, fought.events, fought.after);
    const unit = fought.after.units.find((item) => item.ownerId === human);
    expect(earned.promotionsEarned).toEqual([
      { unitId: unit?.id, at: unit?.at, own: true },
    ]);
    expect(earned.promoted).toEqual([]);

    const promoted = step(state, human, {
      kind: "PROMOTE",
      unitId: unit?.id as never,
    });
    const plan = feedbackPlanV7(
      promoted.before,
      promoted.events,
      promoted.after,
    );
    expect(plan.promotionsEarned).toEqual([]);
    expect(plan.promoted).toEqual([
      { unitId: unit?.id, at: unit?.at, own: true },
    ]);
    // The marker goes with the Promotion.
    expect(promotionReadyUnitIdsV7(promoted.after).has(unit?.id ?? -1)).toBe(
      false,
    );
  });
});

describe("unit turn states", () => {
  it("is FRESH with a Move, ACTIVE without one, SPENT when handled", () => {
    const spent = {
      moved: true,
      attacked: true,
      handled: true,
      movedPathLength: 1,
      attacksUsed: 1,
    };
    const state = goblinArenaV7(
      ["ORIGINAL", "ORIGINAL"],
      [
        { seat: 0, role: "FIGHTER", at: { x: 4, y: 4 } },
        { seat: 0, role: "FIGHTER", at: { x: 6, y: 4 }, activation: spent },
        {
          seat: 0,
          role: "FIGHTER",
          at: { x: 4, y: 6 },
          activation: { moved: true, movedPathLength: 1 },
        },
        { seat: 1, role: "FIGHTER", at: { x: 8, y: 8 } },
      ],
    );
    const view = viewForV7(state, state.humanPlayerId);
    const commands = queryPlayerCommandsV7(view);
    const states = unitTurnStatesV7(view, commands);
    const at = (x: number, y: number) =>
      states.get(
        view.units.find((unit) => unit.at.x === x && unit.at.y === y)?.id ?? -1,
      );
    expect(at(4, 4)).toBe("FRESH");
    expect(at(6, 4)).toBe("SPENT");
    expect(at(4, 6)).toBe("ACTIVE");
    // Another player's unit has no state.
    expect(at(8, 8)).toBeUndefined();
  });

  it("has no states outside the viewer's turn or after the match", () => {
    const state = goblinArenaV7(
      ["ORIGINAL", "ORIGINAL"],
      [
        { seat: 0, role: "FIGHTER", at: { x: 4, y: 4 } },
        { seat: 1, role: "FIGHTER", at: { x: 8, y: 8 } },
      ],
      { activeSeat: 1 },
    );
    const view = viewForV7(state, state.humanPlayerId);
    expect(unitTurnStatesV7(view, []).size).toBe(0);
    const mine = viewForV7(
      goblinArenaV7(
        ["ORIGINAL", "ORIGINAL"],
        [
          { seat: 0, role: "FIGHTER", at: { x: 4, y: 4 } },
          { seat: 1, role: "FIGHTER", at: { x: 8, y: 8 } },
        ],
      ),
      state.humanPlayerId,
    );
    expect(
      unitTurnStatesV7(
        { ...mine, outcome: { kind: "VICTORY", winnerId: mine.viewer.id } },
        queryPlayerCommandsV7(mine),
      ).size,
    ).toBe(0);
  });
});
