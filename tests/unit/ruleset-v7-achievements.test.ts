import { describe, expect, it } from "vitest";
import {
  applyCommandV7,
  parseEventEnvelopeV7,
  parseGameStateV7,
  parsePlayerEventEnvelopeV7,
  previewMonumentV7,
  projectEventsV7,
  queryPlayerCommandsV7,
  queryPublicEconomicPotentialsV7,
  scorePublicSpatialPlanV7,
  unitId,
  viewForV7,
  type CoordV7,
  type GameStateV7,
  type PopulationContributionV7,
  type UnitStateV7,
  MONUMENT_POPULATION_V7,
  TECHNOLOGY_IDS_V7,
  effectiveRoleRuleV7,
} from "../../src/engine/index";
import {
  allTechsV7,
  checkedV7,
  exploredAllV7,
  initialV7,
  richV7,
} from "../fixtures/v7-builders";

describe("ruleset-7 achievements and Monuments", () => {
  // The economy rejig (`pulp_wars-w49.16`, 7r54): Explorer needs half the
  // board's tiles and no technology (100 tiles and Scouting before).
  it("unlocks Explorer without Scouting, once, at the first evaluation that finds half the map explored", () => {
    const state = exploredAllV7(richV7(initialV7(711)));
    const owner = required(
      state.players.find((player) => player.id === state.humanPlayerId),
      "owner missing",
    );
    expect(owner.researchedTechs).toEqual([]);
    expect(owner.explored).toHaveLength(121);
    expect(
      viewForV7(state, state.humanPlayerId).achievementProgress[0],
    ).toEqual({
      achievement: "EXPLORER",
      currentExploredTiles: owner.explored.length,
      requiredExploredTiles: 61,
    });
    expect(owner.achievementEntitlements[0]).toMatchObject({
      unlocked: false,
      spent: false,
    });
    // The first command that evaluates achievements (a research here; a
    // Wait evaluates none) finds the tiles: no Scouting is needed.
    const waited = applyCommandV7(state, state.humanPlayerId, {
      kind: "RESEARCH",
      tech: "GATHERING",
    });
    if (!waited.accepted) throw new Error(waited.error.code);
    expect(waited.events.map((event) => event.kind)).toEqual([
      "TECH_RESEARCHED",
      "ACHIEVEMENT_UNLOCKED",
    ]);
    expect(waited.events.at(-1)).toMatchObject({
      kind: "ACHIEVEMENT_UNLOCKED",
      playerId: state.humanPlayerId,
      achievement: "EXPLORER",
    });
    expect(waited.state.players[0]?.achievementEntitlements[0]).toMatchObject({
      unlocked: true,
      spent: false,
    });
    // Scouting adds nothing to it.
    const researched = applyCommandV7(waited.state, state.humanPlayerId, {
      kind: "RESEARCH",
      tech: "SCOUTING",
    });
    if (!researched.accepted) throw new Error(researched.error.code);
    expect(researched.events.map((event) => event.kind)).toEqual([
      "TECH_RESEARCHED",
    ]);
  });

  it("unlocks Explorer at the exact 60 to 61 explored-tile crossing of an 11 by 11 board", () => {
    const full = exploredAllV7(initialV7(713));
    const enabled = checkedV7({
      ...full,
      players: full.players.map((player) =>
        player.id === full.humanPlayerId
          ? { ...player, researchedTechs: ["GATHERING"] }
          : player,
      ),
    });
    const move = queryPlayerCommandsV7(enabled, enabled.humanPlayerId).find(
      (command) => command.kind === "MOVE",
    );
    if (move?.kind !== "MOVE") throw new Error("move missing");
    const destination = required(move.path.at(-1), "destination missing");
    const far = enabled.board.tiles
      .filter(
        (tile) => chebyshev(tile.at, destination) > 3 && tile.site === null,
      )
      .slice(0, 60);
    expect(far).toHaveLength(60);
    const absent = new Set(
      [destination, ...far.map((tile) => tile.at)].map(coordKey),
    );
    const state = checkedV7({
      ...enabled,
      players: enabled.players.map((player) =>
        player.id === enabled.humanPlayerId
          ? {
              ...player,
              explored: enabled.board.tiles
                .filter((tile) => !absent.has(coordKey(tile.at)))
                .map((tile) => tile.at),
            }
          : player,
      ),
    });
    expect(state.players[0]?.explored).toHaveLength(60);
    const result = applyCommandV7(state, state.humanPlayerId, move);
    if (!result.accepted) throw new Error(result.error.code);
    expect(result.state.players[0]?.explored).toHaveLength(61);
    expect(
      result.events.filter((event) => event.kind === "ACHIEVEMENT_UNLOCKED"),
    ).toEqual([
      {
        kind: "ACHIEVEMENT_UNLOCKED",
        playerId: state.humanPlayerId,
        achievement: "EXPLORER",
      },
    ]);
  });

  // The economy rejig (`pulp_wars-w49.16`, 7r54): a mill at 7 and six
  // kinds, with no technology. A Forge at its cap of 6 and four kinds,
  // which completed Engineer and Muster before, no longer do. (The new
  // boundaries are in tests/unit/ruleset-v7-economy-rejig.test.ts.)
  it("leaves Engineer locked with a Forge at 6 and Muster locked with four kinds", () => {
    const forge = engineerBuildState();
    const built = applyCommandV7(forge.state, forge.state.humanPlayerId, {
      kind: "BUILD_FORGE",
      at: forge.forgeAt,
    });
    if (!built.accepted) throw new Error(built.error.code);
    expect(
      built.events.some(
        (event) =>
          event.kind === "ACHIEVEMENT_UNLOCKED" &&
          event.achievement === "ENGINEER",
      ),
    ).toBe(false);
    expect(
      viewForV7(built.state, built.state.humanPlayerId).achievementProgress[1],
    ).toEqual({
      achievement: "ENGINEER",
      currentMaximumOutput: 6,
      requiredOutput: 7,
    });
    expect(built.state.players[0]?.achievementEntitlements[1]?.unlocked).toBe(
      false,
    );

    const muster = musterTrainingState();
    const city = required(
      muster.cities.find(
        (candidate) => candidate.ownerId === muster.humanPlayerId,
      ),
      "city missing",
    );
    const trained = applyCommandV7(muster, muster.humanPlayerId, {
      kind: "TRAIN",
      cityId: city.id,
      role: "MARKSMAN",
    });
    if (!trained.accepted) throw new Error(trained.error.code);
    expect(
      trained.events.some(
        (event) =>
          event.kind === "ACHIEVEMENT_UNLOCKED" &&
          event.achievement === "MUSTER",
      ),
    ).toBe(false);
    expect(
      viewForV7(trained.state, trained.state.humanPlayerId)
        .achievementProgress[2],
    ).toEqual({
      achievement: "MUSTER",
      currentDistinctTrainableRoles: 4,
      requiredDistinctTrainableRoles: 6,
    });
  });
  it("starts with exact locked entitlements and strictly validates their lifetime state", () => {
    const state = initialV7(701);
    expect(
      state.players.every(
        (player) =>
          JSON.stringify(player.achievementEntitlements) ===
          JSON.stringify([
            { achievement: "EXPLORER", unlocked: false, spent: false },
            { achievement: "ENGINEER", unlocked: false, spent: false },
            { achievement: "MUSTER", unlocked: false, spent: false },
            // Revision 21 appends four more (their rules are covered by
            // ruleset-v7-revision21-achievements.test.ts).
            { achievement: "CONQUEROR", unlocked: false, spent: false },
            { achievement: "LAND_BARON", unlocked: false, spent: false },
            { achievement: "SEA_DOG", unlocked: false, spent: false },
            { achievement: "SLAYER", unlocked: false, spent: false },
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
    // The economy rejig (7r54): no achievement needs a technology, so an
    // unlocked Explorer, Engineer, or Muster is valid with nothing
    // researched (it was invalid without Scouting, Engineering, or Drill).
    for (const achievement of ["EXPLORER", "ENGINEER", "MUSTER"] as const)
      for (const spent of [false, true])
        expect(
          parseGameStateV7({
            ...state,
            players: state.players.map((candidate) =>
              candidate.id === player.id
                ? {
                    ...candidate,
                    achievementEntitlements:
                      candidate.achievementEntitlements.map((item) =>
                        item.achievement === achievement
                          ? { ...item, unlocked: true, spent }
                          : item,
                      ),
                  }
                : candidate,
            ),
          }),
        ).not.toBeNull();
    const withoutField = { ...player } as Record<string, unknown>;
    Reflect.deleteProperty(withoutField, "achievementEntitlements");
    expect(
      parseGameStateV7({ ...state, players: [withoutField, state.players[1]] }),
    ).toBeNull();
  });

  it("keeps an unlocked Engineer when its building is removed, and never unlocks it twice", () => {
    const { state, forgeAt } = engineerBuildState();
    const before = viewForV7(state, state.humanPlayerId);
    // Revision 21 appends four entries after the revision-5 three. The
    // economy rejig (7r54): half the board, a mill at 7, six kinds.
    expect(before.achievementProgress.slice(0, 3)).toEqual([
      {
        achievement: "EXPLORER",
        currentExploredTiles: state.players[0]?.explored.length,
        requiredExploredTiles: 61,
      },
      { achievement: "ENGINEER", currentMaximumOutput: 0, requiredOutput: 7 },
      {
        achievement: "MUSTER",
        currentDistinctTrainableRoles: 1,
        requiredDistinctTrainableRoles: 6,
      },
    ]);
    // An Engineer earned earlier (a mill at 7 elsewhere): the Forge here
    // reaches its cap of 6, which is below the goal.
    const earned = checkedV7({
      ...state,
      players: state.players.map((player) =>
        player.id === state.humanPlayerId
          ? {
              ...player,
              achievementEntitlements: player.achievementEntitlements.map(
                (item) =>
                  item.achievement === "ENGINEER"
                    ? { ...item, unlocked: true }
                    : item,
              ),
            }
          : player,
      ),
    });
    const result = applyCommandV7(earned, earned.humanPlayerId, {
      kind: "BUILD_FORGE",
      at: forgeAt,
    });
    if (!result.accepted) throw new Error(result.error.code);
    expect(
      result.events.some(
        (event) =>
          event.kind === "ACHIEVEMENT_UNLOCKED" &&
          event.achievement === "ENGINEER",
      ),
    ).toBe(false);
    expect(result.state.players[0]?.achievementEntitlements[1]).toEqual({
      achievement: "ENGINEER",
      unlocked: true,
      spent: false,
    });
    expect(
      viewForV7(result.state, state.humanPlayerId).achievementProgress[1],
    ).toEqual({
      achievement: "ENGINEER",
      currentMaximumOutput: 6,
      requiredOutput: 7,
    });
    let settled = result.state;
    for (const reward of ["TREASURY"] as const) {
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
    expect(removed.state.players[0]?.achievementEntitlements[1]).toMatchObject({
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

  it("unlocks simultaneous qualifications in canonical order (Explorer, then Muster)", () => {
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
          !same(candidate.at, staged.forgeAt) &&
          !occupied.has(coordKey(candidate.at)),
      )
      .slice(0, 5);
    // Six kinds with the starting Fighter (Muster takes six since the
    // economy rejig, 7r54; the Forge's 6 no longer completes Engineer).
    const roles = [
      "RAIDER",
      "GUARD",
      "MARKSMAN",
      "CAPTAIN",
      "CATAPULT",
    ] as const;
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
    ).toEqual(["EXPLORER", "MUSTER"]);
  });

  it("counts six distinct living trainable roles for Muster and excludes Juggernaut", () => {
    const base = musterTrainingState();
    expect(viewForV7(base, base.humanPlayerId).achievementProgress[2]).toEqual({
      achievement: "MUSTER",
      currentDistinctTrainableRoles: 3,
      requiredDistinctTrainableRoles: 6,
    });
    const city = required(
      base.cities.find((candidate) => candidate.ownerId === base.humanPlayerId),
      "human city missing",
    );
    // A Captain and a Catapult beside the three: five kinds; the trained
    // Marksman is the sixth (the fourth completed Muster before the
    // economy rejig, 7r54).
    const taken = new Set(base.units.map((unit) => coordKey(unit.at)));
    const free = base.board.tiles
      .filter(
        (candidate) =>
          candidate.territoryCityId === city.id &&
          candidate.site === null &&
          !taken.has(coordKey(candidate.at)),
      )
      .slice(0, 2);
    const state = checkedV7({
      ...base,
      nextEntityId: base.nextEntityId + 2,
      units: [
        ...base.units,
        ...(["CAPTAIN", "CATAPULT"] as const).map((role, index) => ({
          ...makeUnit(
            base.nextEntityId + index,
            base.humanPlayerId,
            city.id,
            role,
            required(free[index], "role tile missing").at,
          ),
          homeCityId: null,
        })),
      ].sort((left, right) => left.id - right.id),
    });
    expect(
      viewForV7(state, state.humanPlayerId).achievementProgress[2],
    ).toMatchObject({ currentDistinctTrainableRoles: 5 });
    const result = applyCommandV7(state, state.humanPlayerId, {
      kind: "TRAIN",
      cityId: city.id,
      role: "MARKSMAN",
    });
    if (!result.accepted) throw new Error(result.error.code);
    expect(result.events.map((event) => event.kind)).toEqual([
      "UNIT_TRAINED",
      "ACHIEVEMENT_UNLOCKED",
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
        .achievementProgress[2],
    ).toMatchObject({ currentDistinctTrainableRoles: 5 });
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
                      : "GAME",
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
    expect(state.players[0]?.achievementEntitlements[2]).toMatchObject({
      unlocked: true,
      spent: true,
    });
    expect(tile(state, at).improvement).toBe("MONUMENT");
    expect(tile(state, at).road).toBe(true);
    expect(state.players[0]?.achievementEntitlements[1]?.unlocked).toBe(false);
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
    expect(removed.state.players[0]?.achievementEntitlements[2]?.spent).toBe(
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
      coinDelta: 3,
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
    // Revision 21: capturing another player's city unlocks the captor's
    // Conqueror; no entitlement is spent and no other one changes.
    expect(captured.state.players[0]?.achievementEntitlements.slice(1)).toEqual(
      beforeEntitlements
        .slice(1)
        .map((entitlement) =>
          entitlement.achievement === "CONQUEROR"
            ? { ...entitlement, unlocked: true }
            : entitlement,
        ),
    );
    expect(
      captured.state.players[0]?.achievementEntitlements.every(
        (entitlement) => !entitlement.spent,
      ),
    ).toBe(true);
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

  it("keeps Monument sites on hidden Ore and empty Mountains equivalent until Engineering", () => {
    const base = levelTwoWithoutPopulation(
      unlockEntitlement(exploredAllV7(initialV7(707)), "EXPLORER"),
    );
    const city = required(
      base.cities.find((candidate) => candidate.ownerId === base.humanPlayerId),
      "human city missing",
    );
    const at = emptyOwnedTile(base, city.id);
    const mountain = (resource: "ORE" | null, prospecting: boolean) =>
      checkedV7({
        ...base,
        players: base.players.map((player) =>
          player.id === base.humanPlayerId
            ? {
                ...player,
                researchedTechs: TECHNOLOGY_IDS_V7.filter(
                  (technology) =>
                    player.researchedTechs.includes(technology) ||
                    (prospecting &&
                      (technology === "DRILL" || technology === "ENGINEERING")),
                ),
              }
            : player,
        ),
        board: {
          ...base.board,
          tiles: base.board.tiles.map((candidate) =>
            same(candidate.at, at)
              ? { ...candidate, terrain: "MOUNTAIN", resource }
              : candidate,
          ),
        },
      });
    const command = {
      kind: "BUILD_MONUMENT",
      achievement: "EXPLORER",
      at,
    } as const;
    const hiddenStates = [mountain("ORE", false), mountain(null, false)];
    const hiddenViews = hiddenStates.map((state) =>
      viewForV7(state, state.humanPlayerId),
    );
    const hiddenOreView = required(hiddenViews[0], "hidden Ore view missing");
    const hiddenEmptyView = required(
      hiddenViews[1],
      "hidden empty view missing",
    );
    expect(JSON.stringify(hiddenOreView)).toBe(JSON.stringify(hiddenEmptyView));
    expect(queryPublicEconomicPotentialsV7(hiddenOreView)).toEqual(
      queryPublicEconomicPotentialsV7(hiddenEmptyView),
    );
    for (let index = 0; index < hiddenStates.length; index += 1) {
      const state = required(hiddenStates[index], "hidden state missing");
      const view = required(hiddenViews[index], "hidden view missing");
      expect(queryPlayerCommandsV7(view)).not.toContainEqual(command);
      expect(previewMonumentV7(view, command)).toEqual({
        ok: false,
        error: "NOT_OFFERED",
      });
      expect(scorePublicSpatialPlanV7(view, command)).toBe(0);
      expect(applyCommandV7(state, state.humanPlayerId, command)).toMatchObject(
        {
          accepted: false,
          error: { code: "TECH_REQUIRED", params: { tech: "ENGINEERING" } },
        },
      );
    }

    const revealedEmpty = mountain(null, true);
    const revealedEmptyView = viewForV7(
      revealedEmpty,
      revealedEmpty.humanPlayerId,
    );
    expect(queryPlayerCommandsV7(revealedEmptyView)).toContainEqual(command);
    expect(previewMonumentV7(revealedEmptyView, command)).toMatchObject({
      ok: true,
    });
    expect(
      applyCommandV7(revealedEmpty, revealedEmpty.humanPlayerId, command)
        .accepted,
    ).toBe(true);

    const revealedOre = mountain("ORE", true);
    const revealedOreView = viewForV7(revealedOre, revealedOre.humanPlayerId);
    expect(queryPlayerCommandsV7(revealedOreView)).not.toContainEqual(command);
    expect(previewMonumentV7(revealedOreView, command)).toEqual({
      ok: false,
      error: "NOT_OFFERED",
    });
    const potential = (view: typeof revealedEmptyView) =>
      required(
        queryPublicEconomicPotentialsV7(view).find(
          (entry) => entry.command === "BUILD_MONUMENT",
        ),
        "Monument potential missing",
      );
    expect(potential(revealedEmptyView).targets).toBe(
      potential(revealedOreView).targets + 1,
    );
    expect(
      applyCommandV7(revealedOre, revealedOre.humanPlayerId, command),
    ).toMatchObject({ accepted: false, error: { code: "INVALID_TILE" } });
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
    // (All explored and no technology needed since the economy rejig: the
    // command's evaluation also completes Explorer.)
    expect(built.events.map((event) => event.kind)).toEqual([
      "MONUMENT_BUILT",
      "CITY_ECONOMY_CHANGED",
      "CITY_LEVELED_UP",
      "CITY_REWARD_QUEUED",
      "ACHIEVEMENT_UNLOCKED",
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
        base.board.tiles.filter(
          (other) =>
            other.site === null &&
            !same(other.at, candidate.at) &&
            chebyshev(other.at, candidate.at) === 1 &&
            chebyshev(other.at, city.at) <= 2,
        ).length >= 6,
    ),
    "forge tile missing",
  );
  const mines = base.board.tiles
    .filter(
      (candidate) =>
        candidate.site === null &&
        !same(candidate.at, forge.at) &&
        chebyshev(candidate.at, forge.at) === 1 &&
        chebyshev(candidate.at, city.at) <= 2,
    )
    .slice(0, 6);
  if (mines.length !== 6) throw new Error("six Mine supports missing");
  const liveContributions: PopulationContributionV7[] = mines.map(
    (mine, index) => ({
      id: base.nextEntityId + index,
      cityId: city.id,
      category: "LIVE",
      amount: 2,
      source: { kind: "IMPROVEMENT", improvement: "MINE", at: mine.at },
    }),
  );
  const permanentContributions: PopulationContributionV7[] = [
    {
      id: base.nextEntityId + liveContributions.length,
      cityId: city.id,
      category: "PERMANENT",
      amount: 1,
      source: {
        kind: "RESOURCE_ACTION",
        action: "HARVEST_FRUIT",
        at: forge.at,
      },
    },
  ];
  const contributions = [...liveContributions, ...permanentContributions];
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
                resource: "ORE",
                improvement: "MINE",
                territoryCityId: city.id,
              }
            : same(candidate.at, forge.at)
              ? {
                  ...candidate,
                  terrain: "GRASS",
                  resource: null,
                  improvement: null,
                }
              : candidate,
        ),
      },
      cities: base.cities.map((candidate) =>
        candidate.id === city.id
          ? {
              ...candidate,
              level: 4,
              permanentPopulation: 1,
              economicPopulation: 12,
              population: 4,
              expanded: false,
              rewards: [
                { reachedLevel: 2, reward: "STOCKPILE" },
                { reachedLevel: 3, reward: "WALLS" },
                { reachedLevel: 4, reward: "TREASURY_6" },
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
  const [fighterAt, scoutAt, guardAt] = positions.map((item) => item.at) as [
    CoordV7,
    CoordV7,
    CoordV7,
  ];
  const fighter = required(
    base.units.find((unit) => unit.ownerId === base.humanPlayerId),
    "fighter missing",
  );
  const added = [
    {
      ...makeUnit(
        base.nextEntityId,
        base.humanPlayerId,
        city.id,
        "RAIDER",
        scoutAt,
      ),
      homeCityId: null,
    },
    {
      ...makeUnit(
        base.nextEntityId + 1,
        base.humanPlayerId,
        city.id,
        "GUARD",
        guardAt,
      ),
      homeCityId: null,
    },
  ];
  return checkedV7({
    ...base,
    nextEntityId: base.nextEntityId + added.length,
    treasureChests: [],
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
    amount: MONUMENT_POPULATION_V7,
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
  achievement: "EXPLORER" | "ENGINEER" | "MUSTER",
): GameStateV7 {
  return checkedV7({
    ...state,
    players: state.players.map((player) =>
      player.id === state.humanPlayerId
        ? {
            ...player,
            researchedTechs: TECHNOLOGY_IDS_V7.filter(
              (tech) =>
                player.researchedTechs.includes(tech) ||
                (achievement === "EXPLORER" && tech === "SCOUTING") ||
                (achievement === "MUSTER" && tech === "DRILL") ||
                (achievement === "ENGINEER" &&
                  (tech === "DRILL" || tech === "ENGINEERING")),
            ),
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
  const maxHp = effectiveRoleRuleV7(role, "ORIGINAL").maxHp;
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
    form: "LAND",
  };
}

function readyActivation(): UnitStateV7["activation"] {
  return {
    moved: false,
    movedPathLength: 0,
    attacked: false,
    attacksUsed: 0,
    tendedThisTurn: false,
    inspired: false,
    overrunActive: false,
    escapeAvailable: false,
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
