import { describe, expect, it } from "vitest";
import {
  applyCommandV7,
  parseEventEnvelopeV7,
  parseGameStateV7,
  parsePlayerEventEnvelopeV7,
  previewMonumentV7,
  projectEventsV7,
  queryPlayerCommandsV7,
  unitId,
  viewForV7,
  type CoordV7,
  type GameStateV7,
  type PopulationContributionV7,
  type UnitStateV7,
} from "../../src/engine/index";
import {
  allTechsV7,
  checkedV7,
  exploredAllV7,
  initialV7,
  richV7,
} from "../fixtures/v7-builders";

describe("ruleset-7 achievements and Monuments", () => {
  it("starts with exact locked entitlements and strictly validates their lifetime state", () => {
    const state = initialV7(701);
    expect(
      state.players.every(
        (player) =>
          JSON.stringify(player.achievementEntitlements) ===
          JSON.stringify([
            { achievement: "ENGINEER", unlocked: false, spent: false },
            { achievement: "MUSTER", unlocked: false, spent: false },
          ]),
      ),
    ).toBe(true);
    const player = required(state.players[0], "player missing");
    const malformed = [
      [],
      [player.achievementEntitlements[0], player.achievementEntitlements[0]],
      [...player.achievementEntitlements].reverse(),
      [
        { achievement: "ENGINEER", unlocked: false, spent: true },
        player.achievementEntitlements[1],
      ],
    ];
    for (const achievementEntitlements of malformed)
      expect(
        parseGameStateV7({
          ...state,
          players: state.players.map((candidate) =>
            candidate.id === player.id
              ? { ...candidate, achievementEntitlements }
              : candidate,
          ),
        }),
      ).toBeNull();
    const withoutField = { ...player } as Record<string, unknown>;
    Reflect.deleteProperty(withoutField, "achievementEntitlements");
    expect(
      parseGameStateV7({ ...state, players: [withoutField, state.players[1]] }),
    ).toBeNull();
  });

  it("unlocks Engineer only from a final individual qualifying output of six", () => {
    const { state, forgeAt } = engineerBuildState();
    const before = viewForV7(state, state.humanPlayerId);
    expect(before.achievementProgress).toEqual([
      { achievement: "ENGINEER", currentMaximumOutput: 0, requiredOutput: 6 },
      {
        achievement: "MUSTER",
        currentDistinctTrainableRoles: 1,
        requiredDistinctTrainableRoles: 4,
      },
    ]);
    const result = applyCommandV7(state, state.humanPlayerId, {
      kind: "BUILD_FORGE",
      at: forgeAt,
    });
    if (!result.accepted) throw new Error(result.error.code);
    expect(result.events.at(-1)).toEqual({
      kind: "ACHIEVEMENT_UNLOCKED",
      playerId: state.humanPlayerId,
      achievement: "ENGINEER",
    });
    expect(result.state.players[0]?.achievementEntitlements[0]).toEqual({
      achievement: "ENGINEER",
      unlocked: true,
      spent: false,
    });
    expect(
      viewForV7(result.state, state.humanPlayerId).achievementProgress[0],
    ).toEqual({
      achievement: "ENGINEER",
      currentMaximumOutput: 6,
      requiredOutput: 6,
    });
    let settled = result.state;
    for (const reward of ["EXPAND", "TREASURY"] as const) {
      const head = required(settled.pendingChoices[0], "reward missing");
      const choice = applyCommandV7(settled, settled.humanPlayerId, {
        kind: "CHOOSE_CITY_REWARD",
        cityId: head.cityId,
        reachedLevel: head.reachedLevel,
        reward,
      });
      if (!choice.accepted) throw new Error(choice.error.code);
      settled = choice.state;
    }
    const removed = applyCommandV7(settled, settled.humanPlayerId, {
      kind: "REDEVELOP",
      at: forgeAt,
    });
    if (!removed.accepted) throw new Error(removed.error.code);
    expect(removed.state.players[0]?.achievementEntitlements[0]).toMatchObject({
      unlocked: true,
      spent: false,
    });
    expect(
      removed.events.some((event) => event.kind === "ACHIEVEMENT_UNLOCKED"),
    ).toBe(false);
    const rebuilt = applyCommandV7(removed.state, removed.state.humanPlayerId, {
      kind: "BUILD_FORGE",
      at: forgeAt,
    });
    if (!rebuilt.accepted) throw new Error(rebuilt.error.code);
    expect(
      rebuilt.events.some((event) => event.kind === "ACHIEVEMENT_UNLOCKED"),
    ).toBe(false);
  });

  it("unlocks simultaneous qualifications in ENGINEER then MUSTER order", () => {
    const staged = engineerBuildState();
    const city = required(
      staged.state.cities.find(
        (candidate) => candidate.ownerId === staged.state.humanPlayerId,
      ),
      "human city missing",
    );
    const occupied = new Set(
      staged.state.units.map((unit) => coordKey(unit.at)),
    );
    const positions = staged.state.board.tiles
      .filter(
        (candidate) =>
          candidate.territoryCityId === city.id &&
          candidate.site === null &&
          candidate.improvement === null &&
          !same(candidate.at, staged.forgeAt) &&
          !occupied.has(coordKey(candidate.at)),
      )
      .slice(0, 3);
    const roles = ["SCOUT", "GUARD", "RAIDER"] as const;
    const additions = roles.map((role, index) =>
      makeUnit(
        staged.state.nextEntityId + index,
        staged.state.humanPlayerId,
        city.id,
        role,
        required(positions[index], "role tile missing").at,
      ),
    );
    const state = checkedV7({
      ...staged.state,
      nextEntityId: staged.state.nextEntityId + additions.length,
      units: [...staged.state.units, ...additions].sort((a, b) => a.id - b.id),
    });
    const result = applyCommandV7(state, state.humanPlayerId, {
      kind: "BUILD_FORGE",
      at: staged.forgeAt,
    });
    if (!result.accepted) throw new Error(result.error.code);
    expect(
      result.events.flatMap((event) =>
        event.kind === "ACHIEVEMENT_UNLOCKED" ? [event.achievement] : [],
      ),
    ).toEqual(["ENGINEER", "MUSTER"]);
  });

  it("counts four distinct living trainable roles for Muster and excludes Juggernaut", () => {
    const state = musterTrainingState();
    expect(
      viewForV7(state, state.humanPlayerId).achievementProgress[1],
    ).toEqual({
      achievement: "MUSTER",
      currentDistinctTrainableRoles: 3,
      requiredDistinctTrainableRoles: 4,
    });
    const city = required(
      state.cities.find(
        (candidate) => candidate.ownerId === state.humanPlayerId,
      ),
      "human city missing",
    );
    const result = applyCommandV7(state, state.humanPlayerId, {
      kind: "TRAIN",
      cityId: city.id,
      role: "MARKSMAN",
    });
    if (!result.accepted) throw new Error(result.error.code);
    expect(result.events.map((event) => event.kind)).toEqual([
      "UNIT_TRAINED",
      "ACHIEVEMENT_UNLOCKED",
    ]);
    const withJuggernaut = checkedV7({
      ...state,
      nextEntityId: state.nextEntityId + 1,
      units: [
        ...state.units,
        makeUnit(
          state.nextEntityId,
          state.humanPlayerId,
          city.id,
          "JUGGERNAUT",
          {
            x: city.at.x + 1,
            y: city.at.y + 1,
          },
        ),
      ].sort((left, right) => left.id - right.id),
    });
    expect(
      viewForV7(withJuggernaut, withJuggernaut.humanPlayerId)
        .achievementProgress[1],
    ).toMatchObject({ currentDistinctTrainableRoles: 3 });
  });

  it("spends each entitlement once for a free +3 Monument and allows the other after removal", () => {
    let state = unlockEntitlement(
      levelTwoWithoutPopulation(
        exploredAllV7(richV7(allTechsV7(initialV7(703)))),
      ),
      "MUSTER",
    );
    const city = required(
      state.cities.find(
        (candidate) => candidate.ownerId === state.humanPlayerId,
      ),
      "human city missing",
    );
    const at = emptyOwnedTile(state, city.id);
    state = checkedV7({
      ...state,
      players: state.players.map((player) =>
        player.id === state.humanPlayerId ? { ...player, coins: 0 } : player,
      ),
      board: {
        ...state.board,
        tiles: state.board.tiles.map((candidate) =>
          same(candidate.at, at) ? { ...candidate, road: true } : candidate,
        ),
      },
    });
    const command = {
      kind: "BUILD_MONUMENT",
      achievement: "MUSTER",
      at,
    } as const;
    expect(
      applyCommandV7(state, state.humanPlayerId, {
        kind: "BUILD_MONUMENT",
        achievement: "ENGINEER",
        at,
      }),
    ).toMatchObject({
      accepted: false,
      error: { code: "ACHIEVEMENT_NOT_UNLOCKED" },
    });
    const nonempty = checkedV7({
      ...state,
      board: {
        ...state.board,
        tiles: state.board.tiles.map((candidate) =>
          same(candidate.at, at)
            ? {
                ...candidate,
                resource:
                  candidate.terrain === "GRASS"
                    ? "FRUIT"
                    : candidate.terrain === "FOREST"
                      ? "GAME"
                      : "ORE",
              }
            : candidate,
        ),
      },
    });
    expect(
      applyCommandV7(nonempty, nonempty.humanPlayerId, {
        kind: "BUILD_MONUMENT",
        achievement: "ENGINEER",
        at,
      }),
    ).toMatchObject({ accepted: false, error: { code: "INVALID_TILE" } });
    expect(
      queryPlayerCommandsV7(viewForV7(state, state.humanPlayerId)),
    ).toContainEqual(command);
    expect(
      previewMonumentV7(viewForV7(state, state.humanPlayerId), command),
    ).toMatchObject({
      ok: true,
      preview: {
        achievement: "MUSTER",
        cityId: city.id,
        populationAdded: 3,
        cityHasMonument: false,
        onePerCityAvailable: true,
        lostEmptyTile: true,
        complete: true,
      },
    });
    const coins = required(state.players[0], "player missing").coins;
    const built = applyCommandV7(state, state.humanPlayerId, command);
    if (!built.accepted) throw new Error(built.error.code);
    state = built.state;
    expect(state.players[0]?.coins).toBe(coins);
    expect(state.players[0]?.achievementEntitlements[1]).toMatchObject({
      unlocked: true,
      spent: true,
    });
    expect(tile(state, at).improvement).toBe("MONUMENT");
    expect(tile(state, at).road).toBe(true);
    expect(state.players[0]?.achievementEntitlements[0]?.unlocked).toBe(false);
    expect(populationAt(state, at)).toMatchObject({
      category: "LIVE",
      amount: 3,
      source: { kind: "MONUMENT", achievement: "MUSTER", at },
    });
    expect(built.events[0]).toMatchObject({
      kind: "MONUMENT_BUILT",
      achievement: "MUSTER",
      populationAdded: 3,
    });

    const sameCity = applyCommandV7(
      unlockEntitlement(state, "ENGINEER"),
      state.humanPlayerId,
      {
        kind: "BUILD_MONUMENT",
        achievement: "ENGINEER",
        at: emptyOwnedTile(state, city.id),
      },
    );
    expect(sameCity).toMatchObject({
      accepted: false,
      error: { code: "CITY_BUILDING_LIMIT" },
    });
    const removed = applyCommandV7(state, state.humanPlayerId, {
      kind: "REDEVELOP",
      at,
    });
    if (!removed.accepted) throw new Error(removed.error.code);
    expect(populationAt(removed.state, at)).toBeUndefined();
    expect(removed.state.players[0]?.achievementEntitlements[1]?.spent).toBe(
      true,
    );
    const retry = applyCommandV7(
      removed.state,
      removed.state.humanPlayerId,
      command,
    );
    expect(retry).toMatchObject({
      accepted: false,
      error: { code: "ACHIEVEMENT_ENTITLEMENT_SPENT" },
    });
    const secondState = unlockEntitlement(removed.state, "ENGINEER");
    const second = applyCommandV7(secondState, secondState.humanPlayerId, {
      kind: "BUILD_MONUMENT",
      achievement: "ENGINEER",
      at,
    });
    expect(second.accepted).toBe(true);
  });

  it("Pillages a Monument without refund or residual population", () => {
    const staged = capturedMonumentState();
    const attacker = required(
      staged.state.units.find(
        (unit) => unit.ownerId === staged.state.humanPlayerId,
      ),
      "attacker missing",
    );
    const state = checkedV7({
      ...staged.state,
      units: staged.state.units.map((unit) =>
        unit.id === attacker.id
          ? {
              ...unit,
              at: staged.monumentAt,
              captureEligible: false,
              activation: readyActivation(),
            }
          : unit,
      ),
    });
    const before = required(
      state.players.find((player) => player.id === staged.formerOwnerId),
      "former owner missing",
    ).achievementEntitlements;
    const result = applyCommandV7(state, state.humanPlayerId, {
      kind: "PILLAGE",
      unitId: attacker.id,
    });
    if (!result.accepted) throw new Error(result.error.code);
    expect(result.events[0]).toMatchObject({
      kind: "IMPROVEMENT_PILLAGED",
      improvement: "MONUMENT",
      coinDelta: 1,
    });
    expect(tile(result.state, staged.monumentAt).improvement).toBeNull();
    expect(populationAt(result.state, staged.monumentAt)).toBeUndefined();
    expect(
      result.state.players.find((player) => player.id === staged.formerOwnerId)
        ?.achievementEntitlements,
    ).toEqual(before);
  });

  it("keeps captured provenance current-owner-only without spending captor entitlements", () => {
    const { state, monumentAt, targetCityId, formerOwnerId } =
      capturedMonumentState();
    const beforeEntitlements = required(
      state.players[0],
      "player missing",
    ).achievementEntitlements;
    const targetCity = required(
      state.cities.find((city) => city.id === targetCityId),
      "target city missing",
    );
    const attacker = state.units.find(
      (unit) =>
        unit.ownerId === state.humanPlayerId && same(unit.at, targetCity.at),
    );
    const capturingUnit = required(attacker, "capturing unit missing");
    const captured = applyCommandV7(state, state.humanPlayerId, {
      kind: "CAPTURE",
      unitId: capturingUnit.id,
    });
    if (!captured.accepted) throw new Error(captured.error.code);
    expect(captured.state.players[0]?.achievementEntitlements).toEqual(
      beforeEntitlements,
    );
    expect(populationAt(captured.state, monumentAt)).toMatchObject({
      cityId: targetCityId,
      amount: 3,
      source: { kind: "MONUMENT", achievement: "ENGINEER" },
    });
    const currentView = viewForV7(captured.state, captured.state.humanPlayerId);
    expect(currentView.populationContributions).toContainEqual(
      expect.objectContaining({
        source: expect.objectContaining({
          kind: "MONUMENT",
          visibility: "FULL",
          achievement: "ENGINEER",
        }),
      }),
    );
    expect(currentView.improvementValues).toContainEqual({
      at: monumentAt,
      improvement: "MONUMENT",
      level: 3,
      measure: "POPULATION",
      contributingTiles: [],
    });
    const formerView = viewForV7(captured.state, formerOwnerId);
    expect(formerView.populationContributions).toContainEqual(
      expect.objectContaining({
        amount: 3,
        source: {
          kind: "MONUMENT",
          visibility: "BUILDING_ONLY",
          at: monumentAt,
        },
      }),
    );
    expect(formerView.populationContributions).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: expect.objectContaining({ achievement: "ENGINEER" }),
        }),
      ]),
    );
    expect(
      formerView.players.every(
        (player) => !("achievementEntitlements" in player),
      ),
    ).toBe(true);
  });

  it("does not offer or preview a Monument through unknown Mountain resources", () => {
    const base = levelTwoWithoutPopulation(
      unlockEntitlement(exploredAllV7(initialV7(707)), "ENGINEER"),
    );
    const city = required(
      base.cities.find((candidate) => candidate.ownerId === base.humanPlayerId),
      "human city missing",
    );
    const at = emptyOwnedTile(base, city.id);
    const make = (resource: "ORE" | null) =>
      checkedV7({
        ...base,
        board: {
          ...base.board,
          tiles: base.board.tiles.map((candidate) =>
            same(candidate.at, at)
              ? { ...candidate, terrain: "MOUNTAIN", resource }
              : candidate,
          ),
        },
      });
    const empty = make(null);
    const ore = make("ORE");
    const left = viewForV7(empty, empty.humanPlayerId);
    const right = viewForV7(ore, ore.humanPlayerId);
    expect(JSON.stringify(left)).toBe(JSON.stringify(right));
    const command = {
      kind: "BUILD_MONUMENT",
      achievement: "ENGINEER",
      at,
    } as const;
    expect(queryPlayerCommandsV7(left)).not.toContainEqual(command);
    expect(queryPlayerCommandsV7(right)).not.toContainEqual(command);
    expect(previewMonumentV7(left, command)).toEqual({
      ok: false,
      error: "NOT_OFFERED",
    });
    expect(previewMonumentV7(right, command)).toEqual({
      ok: false,
      error: "NOT_OFFERED",
    });
  });

  it("does not offer or preview a Monument on a visible treasure chest", () => {
    const base = levelTwoWithoutPopulation(
      unlockEntitlement(exploredAllV7(initialV7(707)), "ENGINEER"),
    );
    const city = required(
      base.cities.find((candidate) => candidate.ownerId === base.humanPlayerId),
      "human city missing",
    );
    const at = emptyOwnedTile(base, city.id);
    const state = checkedV7({
      ...base,
      treasureChests: [...base.treasureChests, at].sort(
        (left, right) => left.y - right.y || left.x - right.x,
      ),
    });
    const command = {
      kind: "BUILD_MONUMENT",
      achievement: "ENGINEER",
      at,
    } as const;
    const view = viewForV7(state, state.humanPlayerId);
    expect(queryPlayerCommandsV7(view)).not.toContainEqual(command);
    expect(previewMonumentV7(view, command)).toEqual({
      ok: false,
      error: "NOT_OFFERED",
    });
    expect(applyCommandV7(state, state.humanPlayerId, command)).toMatchObject({
      accepted: false,
      error: { code: "INVALID_TILE" },
    });
  });

  it("uses exact canonical/player Monument event boundaries and rejects generic Monument provenance", () => {
    const unlocked = unlockEntitlement(
      exploredAllV7(initialV7(704)),
      "ENGINEER",
    );
    const state = checkedV7({
      ...unlocked,
      players: unlocked.players.map((player) => ({
        ...player,
        explored: unlocked.board.tiles.map((tile) => tile.at),
      })),
    });
    const city = required(
      state.cities.find(
        (candidate) => candidate.ownerId === state.humanPlayerId,
      ),
      "human city missing",
    );
    const at = emptyOwnedTile(state, city.id);
    const built = applyCommandV7(state, state.humanPlayerId, {
      kind: "BUILD_MONUMENT",
      achievement: "ENGINEER",
      at,
    });
    if (!built.accepted) throw new Error(built.error.code);
    const canonical = required(
      built.events.find((event) => event.kind === "MONUMENT_BUILT"),
      "Monument event missing",
    );
    expect(built.events.map((event) => event.kind)).toEqual([
      "MONUMENT_BUILT",
      "CITY_ECONOMY_CHANGED",
      "CITY_LEVELED_UP",
      "CITY_REWARD_QUEUED",
    ]);
    expect(
      parseEventEnvelopeV7({
        format: "pulp-wars-events",
        version: 7,
        commandIndex: built.state.commandIndex,
        events: [canonical],
      }),
    ).toMatchObject({ ok: true });
    const projected = projectEventsV7(state, built.state, state.humanPlayerId, [
      canonical,
    ]);
    expect(projected.events[0]).toMatchObject({ visibility: "FULL" });
    expect(parsePlayerEventEnvelopeV7(projected)).toMatchObject({ ok: true });
    expect(
      parseEventEnvelopeV7({
        format: "pulp-wars-events",
        version: 7,
        commandIndex: built.state.commandIndex,
        events: projected.events,
      }),
    ).toMatchObject({ ok: false });
    expect(
      parsePlayerEventEnvelopeV7({ ...projected, events: [canonical] }),
    ).toMatchObject({ ok: false });
    const opponentId = required(
      state.players.find((player) => player.id !== state.humanPlayerId),
      "opponent missing",
    ).id;
    const opponentProjected = projectEventsV7(state, built.state, opponentId, [
      canonical,
    ]);
    expect(opponentProjected.events).toEqual([
      {
        kind: "MONUMENT_BUILT",
        visibility: "BUILDING_ONLY",
        cityId: city.id,
        at,
        populationAdded: 3,
      },
    ]);
    expect(parsePlayerEventEnvelopeV7(opponentProjected)).toMatchObject({
      ok: true,
    });
    expect(
      parsePlayerEventEnvelopeV7({
        ...opponentProjected,
        events: [
          {
            ...opponentProjected.events[0],
            playerId: state.humanPlayerId,
            achievement: "ENGINEER",
          },
        ],
      }),
    ).toMatchObject({ ok: false });

    const contribution = required(
      populationAt(built.state, at),
      "Monument contribution missing",
    );
    expect(
      parseGameStateV7({
        ...built.state,
        populationContributions: built.state.populationContributions.map(
          (item) =>
            item.id === contribution.id
              ? {
                  ...item,
                  source: { kind: "IMPROVEMENT", improvement: "MONUMENT", at },
                }
              : item,
        ),
      }),
    ).toBeNull();
    expect(
      parseGameStateV7({
        ...built.state,
        populationContributions: built.state.populationContributions.map(
          (item) =>
            item.id === contribution.id
              ? {
                  ...item,
                  source: {
                    ...item.source,
                    originalPlayerId: state.humanPlayerId,
                  },
                }
              : item,
        ),
      }),
    ).toBeNull();
    expect(
      parseGameStateV7({
        ...built.state,
        players: built.state.players.map((player) =>
          player.id === built.state.humanPlayerId
            ? {
                ...player,
                achievementEntitlements: player.achievementEntitlements.map(
                  (item) =>
                    item.achievement === "ENGINEER"
                      ? { ...item, spent: false }
                      : item,
                ),
              }
            : player,
        ),
      }),
    ).toBeNull();
    expect(
      parseEventEnvelopeV7({
        format: "pulp-wars-events",
        version: 7,
        commandIndex: 1,
        events: [
          {
            kind: "ECONOMIC_BUILDING_BUILT",
            playerId: state.humanPlayerId,
            cityId: city.id,
            at,
            improvement: "MONUMENT",
            cost: 0,
            populationContribution: 3,
            marketIncome: 0,
            capacityDelta: 0,
          },
        ],
      }),
    ).toMatchObject({ ok: false });
  });
});

function engineerBuildState(): { state: GameStateV7; forgeAt: CoordV7 } {
  const base = exploredAllV7(richV7(allTechsV7(initialV7(702))));
  const city = required(
    base.cities.find((candidate) => candidate.ownerId === base.humanPlayerId),
    "human city missing",
  );
  const candidates = base.board.tiles.filter(
    (candidate) =>
      candidate.territoryCityId === city.id && candidate.site === null,
  );
  const forge = required(
    candidates.find(
      (candidate) =>
        candidates.filter(
          (other) =>
            !same(other.at, candidate.at) &&
            chebyshev(other.at, candidate.at) === 1,
        ).length >= 2,
    ),
    "forge tile missing",
  );
  const mines = candidates
    .filter(
      (candidate) =>
        !same(candidate.at, forge.at) &&
        chebyshev(candidate.at, forge.at) === 1,
    )
    .slice(0, 2);
  const contributions: PopulationContributionV7[] = mines.map(
    (mine, index) => ({
      id: base.nextEntityId + index,
      cityId: city.id,
      category: "LIVE",
      amount: 4,
      source: { kind: "IMPROVEMENT", improvement: "MINE", at: mine.at },
    }),
  );
  return {
    forgeAt: forge.at,
    state: checkedV7({
      ...base,
      nextEntityId: base.nextEntityId + contributions.length,
      treasureChests: [],
      board: {
        ...base.board,
        tiles: base.board.tiles.map((candidate) =>
          mines.some((mine) => same(mine.at, candidate.at))
            ? {
                ...candidate,
                terrain: "MOUNTAIN",
                resource: null,
                improvement: "MINE",
              }
            : same(candidate.at, forge.at)
              ? { ...candidate, resource: null, improvement: null }
              : candidate,
        ),
      },
      cities: base.cities.map((candidate) =>
        candidate.id === city.id
          ? {
              ...candidate,
              level: 3,
              economicPopulation: 8,
              population: 3,
              rewards: [
                { reachedLevel: 2, reward: "STOCKPILE" },
                { reachedLevel: 3, reward: "WALLS" },
              ],
            }
          : candidate,
      ),
      populationContributions: contributions,
    }),
  };
}

function musterTrainingState(): GameStateV7 {
  const base = exploredAllV7(richV7(allTechsV7(initialV7(705))));
  const city = required(
    base.cities.find((candidate) => candidate.ownerId === base.humanPlayerId),
    "human city missing",
  );
  const positions = base.board.tiles
    .filter(
      (candidate) =>
        candidate.territoryCityId === city.id && candidate.site === null,
    )
    .slice(0, 4);
  const [fighterAt, scoutAt, guardAt, barracksAt] = positions.map(
    (item) => item.at,
  ) as [CoordV7, CoordV7, CoordV7, CoordV7];
  const fighter = required(
    base.units.find((unit) => unit.ownerId === base.humanPlayerId),
    "fighter missing",
  );
  const added = [
    makeUnit(base.nextEntityId, base.humanPlayerId, city.id, "SCOUT", scoutAt),
    makeUnit(
      base.nextEntityId + 1,
      base.humanPlayerId,
      city.id,
      "GUARD",
      guardAt,
    ),
  ];
  return checkedV7({
    ...base,
    nextEntityId: base.nextEntityId + added.length,
    treasureChests: [],
    board: {
      ...base.board,
      tiles: base.board.tiles.map((candidate) =>
        same(candidate.at, barracksAt)
          ? { ...candidate, resource: null, improvement: "BARRACKS" }
          : candidate,
      ),
    },
    units: [
      ...base.units.map((unit) =>
        unit.id === fighter.id ? { ...unit, at: fighterAt } : unit,
      ),
      ...added,
    ].sort((left, right) => left.id - right.id),
  });
}

function capturedMonumentState(): {
  state: GameStateV7;
  monumentAt: CoordV7;
  targetCityId: GameStateV7["cities"][number]["id"];
  formerOwnerId: GameStateV7["players"][number]["id"];
} {
  const base = exploredAllV7(allTechsV7(initialV7(706)));
  const target = required(
    base.cities.find((city) => city.ownerId !== base.humanPlayerId),
    "target city missing",
  );
  const monumentAt = required(
    base.board.tiles.find(
      (candidate) =>
        candidate.territoryCityId === target.id && candidate.site === null,
    ),
    "Monument tile missing",
  ).at;
  const retreat = required(
    base.board.tiles.find(
      (candidate) =>
        candidate.territoryCityId === target.id &&
        candidate.site === null &&
        !same(candidate.at, monumentAt),
    ),
    "retreat tile missing",
  ).at;
  const attacker = required(
    base.units.find((unit) => unit.ownerId === base.humanPlayerId),
    "attacker missing",
  );
  const defender = required(
    base.units.find((unit) => unit.ownerId === target.ownerId),
    "defender missing",
  );
  const contribution: PopulationContributionV7 = {
    id: base.nextEntityId,
    cityId: target.id,
    category: "LIVE",
    amount: 3,
    source: { kind: "MONUMENT", achievement: "ENGINEER", at: monumentAt },
  };
  return {
    monumentAt,
    targetCityId: target.id,
    formerOwnerId: target.ownerId,
    state: checkedV7({
      ...base,
      nextEntityId: base.nextEntityId + 1,
      treasureChests: [],
      board: {
        ...base.board,
        tiles: base.board.tiles.map((candidate) =>
          same(candidate.at, monumentAt)
            ? { ...candidate, resource: null, improvement: "MONUMENT" }
            : candidate,
        ),
      },
      cities: base.cities.map((candidate) =>
        candidate.id === target.id
          ? {
              ...candidate,
              level: 2,
              economicPopulation: 3,
              population: 1,
              rewards: [{ reachedLevel: 2, reward: "SURVEY" }],
            }
          : candidate,
      ),
      populationContributions: [contribution],
      players: base.players.map((player) =>
        player.id === target.ownerId
          ? {
              ...player,
              explored: base.board.tiles.map((item) => item.at),
              achievementEntitlements: player.achievementEntitlements.map(
                (item) =>
                  item.achievement === "ENGINEER"
                    ? { ...item, unlocked: true, spent: true }
                    : item,
              ),
            }
          : player,
      ),
      units: base.units.map((unit) =>
        unit.id === attacker.id
          ? {
              ...unit,
              at: target.at,
              captureEligible: true,
              activation: readyActivation(),
            }
          : unit.id === defender.id
            ? { ...unit, at: retreat }
            : unit,
      ),
    }),
  };
}

function unlockEntitlement(
  state: GameStateV7,
  achievement: "ENGINEER" | "MUSTER",
): GameStateV7 {
  return checkedV7({
    ...state,
    players: state.players.map((player) =>
      player.id === state.humanPlayerId
        ? {
            ...player,
            achievementEntitlements: player.achievementEntitlements.map(
              (item) =>
                item.achievement === achievement
                  ? { ...item, unlocked: true }
                  : item,
            ),
          }
        : player,
    ),
  });
}

function levelTwoWithoutPopulation(state: GameStateV7): GameStateV7 {
  return checkedV7({
    ...state,
    cities: state.cities.map((city) =>
      city.ownerId === state.humanPlayerId
        ? {
            ...city,
            level: 2,
            population: -2,
            rewards: [{ reachedLevel: 2, reward: "STOCKPILE" }],
          }
        : city,
    ),
  });
}

function emptyOwnedTile(state: GameStateV7, cityId: number): CoordV7 {
  return required(
    state.board.tiles.find(
      (candidate) =>
        candidate.territoryCityId === cityId &&
        candidate.site === null &&
        candidate.resource === null &&
        candidate.improvement === null &&
        !state.treasureChests.some((chest) => same(chest, candidate.at)),
    ),
    "empty owned tile missing",
  ).at;
}

function populationAt(state: GameStateV7, at: CoordV7) {
  return state.populationContributions.find((item) => same(item.source.at, at));
}

function tile(state: GameStateV7, at: CoordV7) {
  return required(
    state.board.tiles[at.y * state.board.width + at.x],
    "tile missing",
  );
}

function makeUnit(
  id: number,
  ownerId: UnitStateV7["ownerId"],
  homeCityId: NonNullable<UnitStateV7["homeCityId"]>,
  role: UnitStateV7["role"],
  at: CoordV7,
): UnitStateV7 {
  const maxHp = role === "GUARD" ? 15 : role === "JUGGERNAUT" ? 40 : 10;
  return {
    id: unitId(id),
    ownerId,
    homeCityId,
    role,
    at,
    hp: maxHp,
    maxHp,
    kills: 0,
    veteran: false,
    captureEligible: false,
    activation: readyActivation(),
    blackoutEligibleRound: null,
  };
}

function readyActivation(): UnitStateV7["activation"] {
  return {
    moved: false,
    movedPathLength: 0,
    attacked: false,
    attacksUsed: 0,
    pursuitPhase: "NONE",
    healed: false,
    recovered: false,
    captured: false,
    handled: false,
    specialActed: false,
  };
}

const same = (left: CoordV7, right: CoordV7) =>
  left.x === right.x && left.y === right.y;
const chebyshev = (left: CoordV7, right: CoordV7) =>
  Math.max(Math.abs(left.x - right.x), Math.abs(left.y - right.y));
const coordKey = (at: CoordV7) => `${at.y},${at.x}`;
function required<T>(value: T | undefined, message: string): T {
  if (value === undefined) throw new Error(message);
  return value;
}
