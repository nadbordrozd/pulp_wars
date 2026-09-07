/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { describe, expect, it } from "vitest";
import {
  applyCommandV7,
  appendReplayCommandV7,
  authorizeOmniscientArtifactV7,
  canonicalGameStateHashV7,
  createInitialMapStateV7,
  createReplayV7,
  createSafeLiveLogV7,
  packageOmniscientArtifactV7,
  parseGameStateV7,
  parsePlayerEventEnvelopeV7,
  projectEventsV7,
  queryAiReadyCommandsV7,
  queryCombatPreviewV7,
  queryPlayerCommandsV7,
  queryPublicSelectionV7,
  reachablePlayerMovementPathsV7,
  runReplayV7,
  TECHNOLOGY_IDS_V7,
  validateMovementPathV7,
  viewForV7,
  type CoordV7,
  type DomainEventV7,
  type GameStateV7,
  type PlayerId,
  type UnitStateV7,
} from "../../src/engine/index";
import { allTechsV7, checkedV7, initialV7 } from "../fixtures/v7-builders";

const READY: UnitStateV7["activation"] = {
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

describe("ruleset-7 observation safety and Concealment", () => {
  it("makes observation-equivalent hidden positions byte-identical across every public input", () => {
    const { state, line, alternate } = hiddenSaboteurScenario();
    const viewerId = state.humanPlayerId;
    const saboteur = state.units[1]!;
    const other = checkedV7({
      ...state,
      units: state.units.map((unit) =>
        unit.id === saboteur.id ? { ...unit, at: alternate } : unit,
      ),
    });
    const left = viewForV7(state, viewerId);
    const right = viewForV7(other, viewerId);
    expect(JSON.stringify(left)).toBe(JSON.stringify(right));
    expect(left.units.some((unit) => unit.id === saboteur.id)).toBe(false);
    expect(left.leaderboard[1]?.livingUnitCount).toBe(1);
    expect(JSON.stringify(queryPlayerCommandsV7(left))).toBe(
      JSON.stringify(queryPlayerCommandsV7(right)),
    );
    expect(JSON.stringify(queryAiReadyCommandsV7(left))).toBe(
      JSON.stringify(queryAiReadyCommandsV7(right)),
    );
    const leftMover = left.units.find((unit) => unit.ownerId === viewerId)!;
    const rightMover = right.units.find((unit) => unit.id === leftMover.id)!;
    expect(
      JSON.stringify(reachablePlayerMovementPathsV7(left, leftMover)),
    ).toBe(JSON.stringify(reachablePlayerMovementPathsV7(right, rightMover)));
    expect(queryPublicSelectionV7(left, line[2]!)).toEqual(
      queryPublicSelectionV7(right, line[2]!),
    );
    expect(
      queryCombatPreviewV7(left, state.units[0]!.id, saboteur.id),
    ).toBeNull();
    const leftAfter = checkedV7({
      ...state,
      commandIndex: state.commandIndex + 1,
      units: state.units.map((unit) =>
        unit.id === saboteur.id ? { ...unit, at: alternate } : unit,
      ),
    });
    const rightAfter = checkedV7({
      ...other,
      commandIndex: other.commandIndex + 1,
      units: other.units.map((unit) =>
        unit.id === saboteur.id ? { ...unit, at: line[2] } : unit,
      ),
    });
    expect(
      JSON.stringify(
        projectEventsV7(state, leftAfter, viewerId, [
          { kind: "UNIT_MOVED", unitId: saboteur.id, path: [alternate] },
        ]),
      ),
    ).toBe(
      JSON.stringify(
        projectEventsV7(other, rightAfter, viewerId, [
          { kind: "UNIT_MOVED", unitId: saboteur.id, path: [line[2]] },
        ]),
      ),
    );

    const guessed = applyCommandV7(state, viewerId, {
      kind: "ATTACK",
      unitId: state.units[0]!.id,
      targetUnitId: saboteur.id,
    });
    const unknown = applyCommandV7(state, viewerId, {
      kind: "ATTACK",
      unitId: state.units[0]!.id,
      targetUnitId: 999_999 as UnitStateV7["id"],
    });
    expect(guessed).toMatchObject({
      accepted: false,
      events: [],
      error: { code: "TARGET_NOT_FOUND" },
    });
    expect(unknown).toMatchObject({
      accepted: false,
      events: [],
      error: { code: "TARGET_NOT_FOUND" },
    });
    expect(guessed.state).toBe(state);
    expect(unknown.state).toBe(state);

    const healerState = checkedV7({
      ...state,
      units: state.units.map((unit) =>
        unit.ownerId === viewerId
          ? { ...unit, role: "MEDIC" as const, activation: READY }
          : unit,
      ),
    });
    const healer = healerState.units.find((unit) => unit.ownerId === viewerId)!;
    const guessedHeal = applyCommandV7(healerState, viewerId, {
      kind: "HEAL_ADJACENT",
      unitId: healer.id,
      targetUnitId: saboteur.id,
    });
    const unknownHeal = applyCommandV7(healerState, viewerId, {
      kind: "HEAL_ADJACENT",
      unitId: healer.id,
      targetUnitId: 999_999 as UnitStateV7["id"],
    });
    expect(guessedHeal).toMatchObject({
      accepted: false,
      events: [],
      error: { code: "HEAL_TARGET_NOT_FOUND" },
    });
    expect(unknownHeal).toMatchObject({
      accepted: false,
      events: [],
      error: { code: "HEAL_TARGET_NOT_FOUND" },
    });
  });

  it("uses radius-one ordinary, radius-two Scout, city, and cooperative allied detection without revealing terrain", () => {
    const { state, line } = hiddenSaboteurScenario();
    const saboteur = state.units[1]!;
    expect(viewForV7(state, state.humanPlayerId).units).not.toContainEqual(
      expect.objectContaining({ id: saboteur.id }),
    );
    const scout = checkedV7({
      ...state,
      units: state.units.map((unit) =>
        unit.ownerId === state.humanPlayerId
          ? { ...unit, role: "SCOUT" as const }
          : unit,
      ),
    });
    expect(viewForV7(scout, scout.humanPlayerId).units).toContainEqual(
      expect.objectContaining({ id: saboteur.id, at: line[2] }),
    );

    const cooperative = cooperativeDetectionScenario();
    const viewer = cooperative.players[1]!;
    const enemySaboteur = cooperative.units[0]!;
    const view = viewForV7(cooperative, viewer.id);
    expect(view.units).toContainEqual(
      expect.objectContaining({ id: enemySaboteur.id }),
    );
    const tile =
      view.board.tiles[
        enemySaboteur.at.y * view.board.width + enemySaboteur.at.x
      ];
    expect(tile).toEqual(expect.objectContaining({ explored: false }));
  });

  it("offers only authoritative-acceptable commands apart from accepted hidden contact shortening", () => {
    const states = [
      hiddenSaboteurScenario().state,
      ...([1, 3, 19] as const).map((seed) => allTechsV7(initialV7(seed))),
    ];
    for (const state of states) {
      const commands = queryPlayerCommandsV7(
        viewForV7(state, state.humanPlayerId),
      );
      const rejected = commands.flatMap((command) => {
        const result = applyCommandV7(state, state.humanPlayerId, command);
        return result.accepted ? [] : [{ command, error: result.error.code }];
      });
      expect(rejected, `seed ${state.setup.seed}`).toEqual([]);
    }
    const rich = states.find((state) => state.setup.seed === 1)!;
    const publicChest = viewForV7(rich, rich.humanPlayerId).treasureChests[0]!;
    expect(
      applyCommandV7(rich, rich.humanPlayerId, {
        kind: "BUILD_BARRACKS",
        at: publicChest,
      }),
    ).toMatchObject({
      accepted: false,
      events: [],
      error: { code: "INVALID_TILE" },
    });
  });

  it("redacts unexplored treasure coordinates and preserves observation equivalence when they move", () => {
    const state = initialV7(1);
    const viewer = state.players.find(
      (player) => player.id === state.humanPlayerId,
    )!;
    const explored = new Set(viewer.explored.map(coordKey));
    const hiddenChest = state.treasureChests.find(
      (chest) => !explored.has(coordKey(chest)),
    )!;
    const replacement = state.board.tiles.find(
      (tile) =>
        !explored.has(coordKey(tile.at)) &&
        tile.terrain !== "MOUNTAIN" &&
        tile.site === null &&
        tile.resource === null &&
        tile.improvement === null &&
        !state.units.some((unit) => same(unit.at, tile.at)) &&
        !state.treasureChests.some((chest) => same(chest, tile.at)),
    )!.at;
    const moved = checkedV7({
      ...state,
      treasureChests: state.treasureChests
        .map((chest) => (same(chest, hiddenChest) ? replacement : chest))
        .sort(compareCoords),
    });
    const left = viewForV7(state, viewer.id);
    const right = viewForV7(moved, viewer.id);
    expect(JSON.stringify(left)).toBe(JSON.stringify(right));
    expect(
      left.treasureChests.every((chest) => explored.has(coordKey(chest))),
    ).toBe(true);
  });

  it("offers optimistic paths, accepts hidden ZOC contact, consumes movement, and reveals before interruption", () => {
    const { state, line } = hiddenSaboteurScenario();
    const view = viewForV7(state, state.humanPlayerId);
    const mover = view.units.find((unit) => unit.ownerId === view.viewer.id)!;
    expect(
      reachablePlayerMovementPathsV7(view, mover).some(
        (reachable) =>
          JSON.stringify(reachable.path) === JSON.stringify(line.slice(1)),
      ),
    ).toBe(true);
    const moved = applyCommandV7(state, state.humanPlayerId, {
      kind: "MOVE",
      unitId: mover.id,
      path: line.slice(1),
    });
    expect(moved.accepted).toBe(true);
    if (!moved.accepted) return;
    expect(moved.state.units[0]).toMatchObject({
      at: line[1],
      activation: { moved: true, handled: true },
    });
    expect(moved.events).toContainEqual({
      kind: "UNIT_MOVE_INTERRUPTED",
      unitId: mover.id,
      at: line[1],
      reason: "ZOC",
    });
    const projected = projectEventsV7(
      state,
      moved.state,
      state.humanPlayerId,
      moved.events,
    );
    const revealIndex = projected.events.findIndex(
      (event) => event.kind === "UNIT_REVEALED",
    );
    const interruptionIndex = projected.events.findIndex(
      (event) => event.kind === "UNIT_MOVE_INTERRUPTED",
    );
    expect(revealIndex).toBeGreaterThanOrEqual(0);
    expect(revealIndex).toBeLessThan(interruptionIndex);
    expect(parsePlayerEventEnvelopeV7(projected)).toMatchObject({ ok: true });
  });

  it("does not reveal terrain around an occupied cell the mover never enters", () => {
    const { state: base, line } = hiddenSaboteurScenario();
    const initialExplored = base.board.tiles
      .map((tile) => tile.at)
      .filter(
        (at) =>
          distance(at, line[0]) <= 1 ||
          base.cities.some(
            (city) => city.ownerId === base.humanPlayerId && same(city.at, at),
          ),
      )
      .sort(compareCoords);
    const state = checkedV7({
      ...base,
      players: base.players.map((player) =>
        player.id === base.humanPlayerId
          ? {
              ...player,
              researchedTechs: TECHNOLOGY_IDS_V7,
              explored: initialExplored,
            }
          : player,
      ),
    });
    const mover = state.units.find(
      (unit) => unit.ownerId === state.humanPlayerId,
    )!;
    const validation = validateMovementPathV7(state, mover, [line[1], line[2]]);
    expect(validation).toMatchObject({
      legal: true,
      destination: line[1],
      traversedPath: [line[1]],
      interruption: { at: line[2], reason: "OCCUPIED" },
    });
    if (!validation.legal) return;
    const initiallyKnown = new Set(initialExplored.map(coordKey));
    const expectedRevealed = state.board.tiles
      .map((tile) => tile.at)
      .filter(
        (at) => distance(at, line[1]) <= 1 && !initiallyKnown.has(coordKey(at)),
      )
      .sort(compareCoords);
    expect(validation.revealed).toEqual(expectedRevealed);
    expect(validation.revealed.every((at) => distance(at, line[1]) <= 1)).toBe(
      true,
    );
  });

  it("omits fully hidden movement and emits only player-safe transition facts", () => {
    const { state, alternate } = hiddenSaboteurScenario();
    const saboteur = state.units[1]!;
    const after = checkedV7({
      ...state,
      commandIndex: state.commandIndex + 1,
      units: state.units.map((unit) =>
        unit.id === saboteur.id ? { ...unit, at: alternate } : unit,
      ),
    });
    const canonical: DomainEventV7[] = [
      { kind: "UNIT_MOVED", unitId: saboteur.id, path: [alternate] },
    ];
    const projected = projectEventsV7(
      state,
      after,
      state.humanPlayerId,
      canonical,
    );
    expect(projected.events).toEqual([]);
    expect(JSON.stringify(projected)).not.toContain(String(saboteur.id));
  });

  it("projects restored production markers from the viewer's after-state knowledge", () => {
    const before = initialV7(1_306);
    const city = before.cities.find(
      (candidate) => candidate.ownerId === before.humanPlayerId,
    )!;
    const at = before.board.tiles.find(
      (tile) =>
        tile.territoryCityId === city.id &&
        tile.site === null &&
        tile.improvement === null &&
        !before.units.some((unit) => same(unit.at, tile.at)) &&
        !before.treasureChests.some((chest) => same(chest, tile.at)),
    )!.at;
    const after = checkedV7({
      ...before,
      commandIndex: before.commandIndex + 1,
      board: {
        ...before.board,
        tiles: before.board.tiles.map((tile) =>
          same(tile.at, at)
            ? {
                ...tile,
                terrain: "MOUNTAIN" as const,
                resource: "ORE" as const,
              }
            : tile,
        ),
      },
    });
    const event: DomainEventV7 = {
      kind: "ECONOMIC_BUILDING_REMOVED",
      playerId: before.humanPlayerId,
      cityId: city.id,
      at,
      improvement: "MINE",
      populationContributionRemoved: 4,
      marketIncomeRemoved: 0,
      capacityDelta: 0,
      resourceRestored: "ORE",
    };
    const hidden = projectEventsV7(before, after, before.humanPlayerId, [
      event,
    ]);
    expect(hidden.events).toEqual([
      { ...event, resourceRestored: "UNKNOWN_RESOURCE" },
    ]);
    expect(parsePlayerEventEnvelopeV7(hidden)).toMatchObject({ ok: true });

    const surveyedBefore = checkedV7({
      ...before,
      players: before.players.map((player) =>
        player.id === before.humanPlayerId
          ? { ...player, researchedTechs: ["GATHERING", "SURVEYING"] }
          : player,
      ),
    });
    const surveyedAfter = checkedV7({
      ...after,
      players: after.players.map((player) =>
        player.id === after.humanPlayerId
          ? { ...player, researchedTechs: ["GATHERING", "SURVEYING"] }
          : player,
      ),
    });
    const revealed = projectEventsV7(
      surveyedBefore,
      surveyedAfter,
      before.humanPlayerId,
      [event],
    );
    expect(revealed.events).toEqual([event]);
    expect(parsePlayerEventEnvelopeV7(revealed)).toMatchObject({ ok: true });
  });

  it("records attack exposure, shares it, preserves it in canonical state, and clears it only at the anchor End Turn", () => {
    const state = exposedAttackScenario();
    const saboteur = state.units[0]!;
    const target = state.units[1]!;
    const attacked = applyCommandV7(state, state.humanPlayerId, {
      kind: "ATTACK",
      unitId: saboteur.id,
      targetUnitId: target.id,
    });
    expect(attacked.accepted).toBe(true);
    if (!attacked.accepted) return;
    expect(attacked.state.saboteurExposures).toEqual([
      {
        unitId: saboteur.id,
        anchorPlayerId: target.ownerId,
        reason: "ATTACK",
        clearsAtAnchorNextEndTurn: true,
      },
    ]);
    expect(
      parseGameStateV7(JSON.parse(JSON.stringify(attacked.state))),
    ).toEqual(attacked.state);
    const hiddenAt = farHiddenCoordinate(attacked.state, target.ownerId);
    const displaced = checkedV7({
      ...attacked.state,
      units: attacked.state.units.map((unit) =>
        unit.id === saboteur.id ? { ...unit, at: hiddenAt } : unit,
      ),
    });
    expect(viewForV7(displaced, target.ownerId).units).toContainEqual(
      expect.objectContaining({ id: saboteur.id, at: hiddenAt }),
    );
    expect(
      viewForV7(displaced, target.ownerId).unitStats.find(
        (stats) => stats.unitId === saboteur.id,
      )?.statuses,
    ).toContain("EXPOSED");
    const targetSeat = displaced.turnOrder.indexOf(target.ownerId);
    const targetTurn = checkedV7({ ...displaced, activeSeatIndex: targetSeat });
    const ended = applyCommandV7(targetTurn, target.ownerId, {
      kind: "END_TURN",
    });
    expect(ended.accepted).toBe(true);
    if (!ended.accepted) return;
    expect(ended.state.saboteurExposures).toEqual([]);
  });

  it("explicitly reveals a Defection source to the target side without revealing its terrain", () => {
    const before = defectionObservationScenario();
    const source = before.units.find((unit) => unit.role === "ENVOY")!;
    const target = before.units.find(
      (unit) => unit.ownerId !== source.ownerId && unit.role === "SABOTEUR",
    )!;
    const targetOwner = target.ownerId;
    const markId = before.nextEntityId;
    const after = checkedV7({
      ...before,
      nextEntityId: before.nextEntityId + 1,
      commandIndex: before.commandIndex + 1,
      defectionMarks: [
        {
          id: markId,
          sourceUnitId: source.id,
          targetUnitId: target.id,
          initiatingPlayerId: source.ownerId,
          recordedTargetOwnerId: targetOwner,
          reservedHomeCityId: source.homeCityId!,
          offeredAtCommandIndex: before.commandIndex + 1,
          phase: "WAITING_FOR_REPLY",
        },
      ],
    });
    const view = viewForV7(after, targetOwner);
    expect(
      view.board.tiles[source.at.y * view.board.width + source.at.x],
    ).toEqual({ at: source.at, explored: false });
    expect(view.units).toContainEqual(
      expect.objectContaining({ id: source.id, at: source.at }),
    );
    expect(view.defectionStatuses).toEqual([
      expect.objectContaining({
        visibility: "FULL",
        sourceUnitId: source.id,
        targetUnitId: target.id,
      }),
    ]);
    const projected = projectEventsV7(before, after, targetOwner, [
      {
        kind: "DEFECTION_OFFERED",
        markId,
        sourceUnitId: source.id,
        targetUnitId: target.id,
        initiatingPlayerId: source.ownerId,
        targetOwnerId: targetOwner,
        reservedHomeCityId: source.homeCityId!,
        offeredAtCommandIndex: before.commandIndex + 1,
      },
    ]);
    expect(projected.events[0]).toEqual({
      kind: "UNIT_REVEALED",
      unitId: source.id,
      at: source.at,
      reason: "DEFECTION",
    });
    expect(projected.events[1]).toMatchObject({ kind: "DEFECTION_OFFERED" });
  });

  it("reports blind Push as unknown and never identifies a concealed blocker", () => {
    const { state: hidden, line } = hiddenSaboteurScenario();
    const enemy = hidden.players.find(
      (player) => player.id !== hidden.humanPlayerId,
    )!;
    const existingEnemy = hidden.units.find(
      (unit) => unit.ownerId === enemy.id,
    )!;
    const blockerId = hidden.nextEntityId as UnitStateV7["id"];
    const state = checkedV7({
      ...hidden,
      nextEntityId: hidden.nextEntityId + 1,
      units: (
        [
          {
            ...hidden.units[0]!,
            role: "HEAVY",
            at: line[0],
            hp: 20,
            maxHp: 20,
          },
          {
            ...existingEnemy,
            role: "HEAVY",
            at: line[1],
            hp: 20,
            maxHp: 20,
            blackoutEligibleRound: null,
          },
          {
            ...existingEnemy,
            id: blockerId,
            role: "SABOTEUR",
            at: line[2],
            blackoutEligibleRound: 1,
          },
        ] satisfies UnitStateV7[]
      ).sort((left, right) => left.id - right.id),
    });
    const attacker = state.units.find(
      (unit) => unit.ownerId === state.humanPlayerId,
    )!;
    const defender = state.units.find(
      (unit) => unit.ownerId === enemy.id && unit.role === "HEAVY",
    )!;
    const view = viewForV7(state, state.humanPlayerId);
    expect(view.units.some((unit) => unit.id === blockerId)).toBe(false);
    expect(queryCombatPreviewV7(view, attacker.id, defender.id)?.push).toBe(
      "UNKNOWN_BEHIND_FOG",
    );
    const attacked = applyCommandV7(state, state.humanPlayerId, {
      kind: "ATTACK",
      unitId: attacker.id,
      targetUnitId: defender.id,
    });
    expect(attacked.accepted).toBe(true);
    if (!attacked.accepted) return;
    const projected = projectEventsV7(
      state,
      attacked.state,
      state.humanPlayerId,
      attacked.events,
    );
    expect(
      projected.events.find((event) => event.kind === "COMBAT_RESOLVED"),
    ).toMatchObject({ preview: { push: "UNKNOWN_BEHIND_FOG" } });
    expect(JSON.stringify(projected)).not.toContain(
      `"targetUnitId":${blockerId}`,
    );
  });

  it("keeps raw hashes behind an explicit spoiler capability while safe logs accept only projected batches", () => {
    const { state, alternate } = hiddenSaboteurScenario();
    const movedHidden = checkedV7({
      ...state,
      units: state.units.map((unit, index) =>
        index === 1 ? { ...unit, at: alternate } : unit,
      ),
    });
    expect(canonicalGameStateHashV7(state)).not.toBe(
      canonicalGameStateHashV7(movedHidden),
    );
    const access = authorizeOmniscientArtifactV7({
      purpose: "STATE_HASH",
      acknowledgeHiddenInformation: true,
    });
    expect(
      packageOmniscientArtifactV7(
        access,
        "STATE_HASH",
        canonicalGameStateHashV7(state),
      ),
    ).toMatchObject({
      classification: "OMNISCIENT",
      warning: "INCLUDES_HIDDEN_MAP_AND_UNITS",
    });
    expect(() => packageOmniscientArtifactV7(access, "REPLAY", {})).toThrow(
      /capability mismatch/,
    );
    const view = viewForV7(state, state.humanPlayerId);
    const batch = projectEventsV7(state, state, state.humanPlayerId, []);
    expect(createSafeLiveLogV7(view, [batch])).toMatchObject({
      classification: "PLAYER_SAFE",
      viewerId: state.humanPlayerId,
    });
    expect(() =>
      createSafeLiveLogV7(view, [{ ...batch, viewerId: state.players[1]!.id }]),
    ).toThrow(/projected batches/);
  });

  it("replays a naturally researched and trained concealed Saboteur exactly", () => {
    const setup = initialV7(1_337).setup;
    const created = createInitialMapStateV7(setup);
    if (!created.ok) throw new Error(created.error.code);
    let state = created.state;
    let replay = createReplayV7(setup);
    let trainedId: UnitStateV7["id"] | null = null;
    let movedStarter = false;
    const researchOrder = ["HUNTING", "MARKSMANSHIP", "FIELDCRAFT"] as const;
    for (let guard = 0; guard < 100 && trainedId === null; guard += 1) {
      const actor = state.turnOrder[state.activeSeatIndex]!;
      if (actor === state.humanPlayerId) {
        const view = viewForV7(state, actor);
        if (!movedStarter) {
          const starter = state.units.find((unit) => unit.ownerId === actor)!;
          const destination = state.board.tiles.find(
            (tile) =>
              distance(tile.at, starter.at) === 1 &&
              tile.terrain !== "MOUNTAIN" &&
              view.viewer.explored.some((at) => same(at, tile.at)) &&
              !state.units.some((unit) => same(unit.at, tile.at)),
          );
          if (!starter.activation.handled && destination !== undefined) {
            ({ state, replay } = acceptForReplay(state, replay, actor, {
              kind: "MOVE",
              unitId: starter.id,
              path: [destination.at],
            }));
            movedStarter = true;
          }
        }
        const player = state.players.find(
          (candidate) => candidate.id === actor,
        )!;
        const nextTech = researchOrder.find(
          (technology) => !player.researchedTechs.includes(technology),
        );
        if (nextTech !== undefined) {
          const research = queryPlayerCommandsV7(viewForV7(state, actor)).find(
            (command) =>
              command.kind === "RESEARCH" && command.tech === nextTech,
          );
          if (research !== undefined)
            ({ state, replay } = acceptForReplay(
              state,
              replay,
              actor,
              research,
            ));
        } else {
          const train = queryPlayerCommandsV7(viewForV7(state, actor)).find(
            (command) =>
              command.kind === "TRAIN" && command.role === "SABOTEUR",
          );
          if (train !== undefined) {
            const result = applyCommandV7(state, actor, train);
            if (!result.accepted) throw new Error(result.error.code);
            trainedId =
              result.events.find((event) => event.kind === "UNIT_TRAINED")
                ?.unitId ?? null;
            replay = appendReplayCommandV7(replay, train, result.state);
            state = result.state;
            break;
          }
        }
      }
      ({ state, replay } = acceptForReplay(state, replay, actor, {
        kind: "END_TURN",
      }));
    }
    expect(trainedId).not.toBeNull();
    const replayed = runReplayV7(replay);
    expect(replayed.stateHash).toBe(canonicalGameStateHashV7(state));
    const opponent = state.players.find(
      (player) => player.id !== state.humanPlayerId,
    )!;
    expect(viewForV7(replayed.state, opponent.id).units).not.toContainEqual(
      expect.objectContaining({ id: trainedId }),
    );
  });
});

function acceptForReplay(
  state: GameStateV7,
  replay: ReturnType<typeof createReplayV7>,
  actor: PlayerId,
  command: Parameters<typeof applyCommandV7>[2],
) {
  const result = applyCommandV7(state, actor, command);
  if (!result.accepted)
    throw new Error(`${command.kind}: ${result.error.code}`);
  return {
    state: result.state,
    replay: appendReplayCommandV7(replay, command, result.state),
  };
}

function hiddenSaboteurScenario(): {
  state: GameStateV7;
  line: readonly [CoordV7, CoordV7, CoordV7];
  alternate: CoordV7;
} {
  let state = allTechsV7(initialV7(779));
  const human = state.players.find(
    (player) => player.id === state.humanPlayerId,
  )!;
  const line = findGrassLine(state, human.id);
  const alternate = state.board.tiles
    .map((tile) => tile.at)
    .find(
      (at) =>
        !state.cities.some(
          (city) => city.ownerId === human.id && distance(city.at, at) <= 1,
        ) &&
        distance(at, line[0]) > 3 &&
        !state.treasureChests.some((chest) => same(chest, at)),
    )!;
  state = checkedV7({
    ...state,
    players: state.players.map((player) =>
      player.id === human.id
        ? {
            ...player,
            researchedTechs: player.researchedTechs.filter(
              (technology) => technology !== "MANEUVER",
            ),
            explored: state.board.tiles.map((tile) => tile.at),
          }
        : player,
    ),
    units: state.units.map((unit) =>
      unit.ownerId === human.id
        ? { ...unit, role: "RAIDER", at: line[0], activation: READY }
        : {
            ...unit,
            role: "SABOTEUR",
            at: line[2],
            hp: 10,
            maxHp: 10,
            activation: READY,
            blackoutEligibleRound: 1,
          },
    ),
  });
  return { state, line, alternate };
}

function cooperativeDetectionScenario(): GameStateV7 {
  const state = allTechsV7(initialV7WithThreePlayers());
  const line = findGrassLine(state, state.players[1]!.id);
  return checkedV7({
    ...state,
    setup: { ...state.setup, aiMode: "COOPERATIVE" },
    units: state.units.map((unit, index) =>
      index === 0
        ? {
            ...unit,
            role: "SABOTEUR",
            at: line[2],
            hp: 10,
            maxHp: 10,
            blackoutEligibleRound: 1,
          }
        : index === 1
          ? { ...unit, at: line[0] }
          : { ...unit, at: line[1] },
    ),
  });
}

function initialV7WithThreePlayers(): GameStateV7 {
  const base = initialV7(991);
  const setup = {
    ...base.setup,
    seed: 991,
    width: 14 as const,
    height: 14 as const,
    aiCount: 2 as const,
    factions: ["ORIGINAL", "ORIGINAL", "ORIGINAL"] as const,
  };
  const created = createInitialMapStateV7(setup);
  if (!created.ok) throw new Error(created.error.code);
  return checkedV7({
    ...created.state,
    activeSeatIndex: created.state.turnOrder.indexOf(
      created.state.humanPlayerId,
    ),
  });
}

function exposedAttackScenario(): GameStateV7 {
  const { state, line } = hiddenSaboteurScenario();
  return checkedV7({
    ...state,
    players: state.players.map((player) =>
      player.id === state.humanPlayerId
        ? { ...player, researchedTechs: TECHNOLOGY_IDS_V7 }
        : player,
    ),
    units: state.units.map((unit) =>
      unit.ownerId === state.humanPlayerId
        ? {
            ...unit,
            role: "SABOTEUR",
            at: line[0],
            blackoutEligibleRound: 1,
          }
        : {
            ...unit,
            role: "FIGHTER",
            at: line[1],
            blackoutEligibleRound: null,
          },
    ),
  });
}

function defectionObservationScenario(): GameStateV7 {
  let state = allTechsV7(initialV7(1_903));
  const initiator = state.players.find(
    (player) => player.id === state.humanPlayerId,
  )!;
  const targetOwner = state.players.find(
    (player) => player.id !== state.humanPlayerId,
  )!;
  const line = findGrassLine(state, targetOwner.id);
  state = checkedV7({
    ...state,
    commandIndex: 1,
    players: state.players.map((player) =>
      player.id === targetOwner.id
        ? {
            ...player,
            explored: player.explored.filter((at) => !same(at, line[0])),
          }
        : player,
    ),
    units: state.units.map((unit) =>
      unit.ownerId === initiator.id
        ? {
            ...unit,
            role: "ENVOY",
            at: line[0],
            hp: 7,
            maxHp: 7,
            blackoutEligibleRound: null,
          }
        : {
            ...unit,
            role: "SABOTEUR",
            at: line[1],
            hp: 10,
            maxHp: 10,
            blackoutEligibleRound: 1,
          },
    ),
  });
  return state;
}

function findGrassLine(
  state: GameStateV7,
  detectorOwnerId: PlayerId,
): readonly [CoordV7, CoordV7, CoordV7] {
  for (let y = 1; y < state.board.height - 1; y += 1)
    for (let x = 1; x < state.board.width - 2; x += 1) {
      const line = [
        { x, y },
        { x: x + 1, y },
        { x: x + 2, y },
      ] as const;
      if (
        line.every((at) => {
          const tile = state.board.tiles[at.y * state.board.width + at.x];
          return tile?.terrain === "GRASS" && tile.site === null;
        }) &&
        line.every(
          (at) =>
            !state.treasureChests.some((chest) => same(chest, at)) &&
            !state.cities.some(
              (city) =>
                city.ownerId === detectorOwnerId && distance(city.at, at) <= 1,
            ),
        )
      )
        return line;
    }
  throw new Error("No observation test line");
}

function farHiddenCoordinate(state: GameStateV7, viewerId: PlayerId): CoordV7 {
  const viewerUnits = state.units.filter((unit) => unit.ownerId === viewerId);
  const viewerCities = state.cities.filter((city) => city.ownerId === viewerId);
  const occupied = new Set(
    state.units.map((unit) => `${unit.at.y},${unit.at.x}`),
  );
  const at = state.board.tiles
    .map((tile) => tile.at)
    .find(
      (candidate) =>
        !occupied.has(`${candidate.y},${candidate.x}`) &&
        viewerUnits.every(
          (unit) =>
            distance(unit.at, candidate) > (unit.role === "SCOUT" ? 2 : 1),
        ) &&
        viewerCities.every((city) => distance(city.at, candidate) > 1),
    );
  if (at === undefined) throw new Error("No hidden coordinate");
  return at;
}

const distance = (left: CoordV7, right: CoordV7) =>
  Math.max(Math.abs(left.x - right.x), Math.abs(left.y - right.y));
const same = (left: CoordV7, right: CoordV7) =>
  left.x === right.x && left.y === right.y;
const coordKey = (at: CoordV7) => `${at.y},${at.x}`;
const compareCoords = (left: CoordV7, right: CoordV7) =>
  left.y - right.y || left.x - right.x;
