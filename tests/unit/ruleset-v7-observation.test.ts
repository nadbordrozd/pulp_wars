/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { describe, expect, it } from "vitest";
import {
  applyCommandV7,
  authorizeOmniscientArtifactV7,
  canonicalGameStateHashV7,
  createSafeLiveLogV7,
  packageOmniscientArtifactV7,
  parsePlayerEventEnvelopeV7,
  projectEventsV7,
  queryAiReadyCommandsV7,
  queryCombatPreviewV7,
  queryPlayerCommandsV7,
  queryPublicSelectionV7,
  reachablePlayerMovementPathsV7,
  TECHNOLOGY_IDS_V7,
  unitId,
  validateMovementPathV7,
  viewForV7,
  type CoordV7,
  type DomainEventV7,
  type GameStateV7,
  type PlayerId,
  type UnitStateV7,
} from "../../src/engine/index";
import {
  allTechsV7,
  checkedV7,
  exploredAllV7,
  initialV7,
} from "../fixtures/v7-builders";

const READY: UnitStateV7["activation"] = {
  moved: false,
  movedPathLength: 0,
  attacked: false,
  attacksUsed: 0,
  healed: false,
  recovered: false,
  captured: false,
  handled: false,
  specialActed: false,
};

describe("ruleset-7 observation safety and Concealment", () => {
  it("projects a newly trained unit through its visible fact without a reveal transition", () => {
    let before = exploredAllV7(initialV7(1_299));
    const city = before.cities.find(
      (candidate) => candidate.ownerId === before.humanPlayerId,
    )!;
    const existing = before.units.find(
      (candidate) => candidate.ownerId === before.humanPlayerId,
    )!;
    const empty = before.board.tiles.find(
      (tile) =>
        tile.territoryCityId === city.id &&
        tile.site === null &&
        !same(tile.at, city.at) &&
        !before.units.some((unit) => same(unit.at, tile.at)) &&
        !before.treasureChests.some((chest) => same(chest, tile.at)),
    )!;
    before = checkedV7({
      ...before,
      units: before.units.map((unit) =>
        unit.id === existing.id ? { ...unit, at: empty.at } : unit,
      ),
    });
    const trained: UnitStateV7 = {
      ...existing,
      id: unitId(before.nextEntityId),
      at: city.at,
      activation: { ...existing.activation, handled: true },
    };
    const after = checkedV7({
      ...before,
      nextEntityId: before.nextEntityId + 1,
      commandIndex: before.commandIndex + 1,
      units: [...before.units, trained],
    });
    const trainedFact: DomainEventV7 = {
      kind: "UNIT_TRAINED",
      playerId: before.humanPlayerId,
      cityId: city.id,
      unitId: trained.id,
      role: trained.role,
      cost: 2,
      at: city.at,
    };
    const projected = projectEventsV7(before, after, before.humanPlayerId, [
      trainedFact,
    ]);
    expect(projected.events).toEqual([trainedFact]);
    expect(
      projected.events.some((event) => event.kind === "UNIT_REVEALED"),
    ).toBe(false);
    expect(parsePlayerEventEnvelopeV7(projected)).toMatchObject({ ok: true });

    const observer = before.players.find(
      (player) => player.id !== before.humanPlayerId,
    )!;
    const observerBefore = checkedV7({
      ...before,
      players: before.players.map((player) =>
        player.id === observer.id
          ? { ...player, explored: before.board.tiles.map((tile) => tile.at) }
          : player,
      ),
    });
    const observerAfter = checkedV7({
      ...after,
      players: observerBefore.players,
    });
    const observerProjection = projectEventsV7(
      observerBefore,
      observerAfter,
      observer.id,
      [trainedFact],
    );
    expect(observerProjection.events).toEqual([
      {
        kind: "UNIT_REVEALED",
        unitId: trained.id,
        at: trained.at,
        reason: "DETECTED",
      },
    ]);
  });

  it("makes observation-equivalent hidden positions byte-identical across every public input", () => {
    const { state, line, alternate } = hiddenScoutScenario();
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

  it("offers only authoritative-acceptable commands apart from accepted hidden contact shortening", () => {
    const states = [
      hiddenScoutScenario().state,
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
        kind: "BUILD_MINE",
        at: publicChest,
      }),
    ).toMatchObject({
      accepted: false,
      events: [],
      error: { code: "INVALID_COMMAND" },
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
    const { state, line } = hiddenScoutScenario();
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

  it("interrupts at ZOC revealed on an earlier step while keeping command-start known ZOC strict", () => {
    const fixture = hiddenZocAfterRevealScenario();
    const before = JSON.stringify(fixture.state);
    const hiddenView = viewForV7(fixture.state, fixture.state.humanPlayerId);
    const publicMover = hiddenView.units.find(
      (unit) => unit.id === fixture.moverId,
    )!;
    expect(hiddenView.units.some((unit) => unit.id === fixture.hostileId)).toBe(
      false,
    );
    expect(
      queryPlayerCommandsV7(hiddenView).some(
        (command) =>
          command.kind === "MOVE" &&
          command.unitId === fixture.moverId &&
          JSON.stringify(command.path) === JSON.stringify(fixture.path),
      ),
    ).toBe(true);
    expect(
      reachablePlayerMovementPathsV7(hiddenView, publicMover).some(
        (reachable) =>
          JSON.stringify(reachable.path) === JSON.stringify(fixture.path),
      ),
    ).toBe(true);

    const moved = applyCommandV7(fixture.state, fixture.state.humanPlayerId, {
      kind: "MOVE",
      unitId: fixture.moverId,
      path: fixture.path,
    });
    expect(moved.accepted).toBe(true);
    expect(JSON.stringify(fixture.state)).toBe(before);
    if (!moved.accepted) return;
    expect(
      moved.state.units.find((unit) => unit.id === fixture.moverId),
    ).toMatchObject({
      at: fixture.path[1],
      activation: { moved: true, handled: true },
    });
    expect(moved.events).toContainEqual({
      kind: "UNIT_MOVED",
      unitId: fixture.moverId,
      path: fixture.path.slice(0, 2),
    });
    expect(moved.events).toContainEqual({
      kind: "UNIT_MOVE_INTERRUPTED",
      unitId: fixture.moverId,
      at: fixture.path[1],
      reason: "ZOC",
    });
    expect(moved.events).toContainEqual(
      expect.objectContaining({
        kind: "TILES_REVEALED",
        playerId: fixture.state.humanPlayerId,
        tiles: expect.arrayContaining([fixture.hostileAt]),
      }),
    );
    expect(
      viewForV7(moved.state, moved.state.humanPlayerId).units.some(
        (unit) => unit.id === fixture.hostileId,
      ),
    ).toBe(true);

    const known = checkedV7({
      ...fixture.state,
      players: fixture.state.players.map((player) =>
        player.id === fixture.state.humanPlayerId
          ? {
              ...player,
              explored: [...player.explored, fixture.hostileAt].sort(
                compareCoords,
              ),
            }
          : player,
      ),
    });
    const knownView = viewForV7(known, known.humanPlayerId);
    expect(knownView.units.some((unit) => unit.id === fixture.hostileId)).toBe(
      true,
    );
    expect(
      queryPlayerCommandsV7(knownView).some(
        (command) =>
          command.kind === "MOVE" &&
          command.unitId === fixture.moverId &&
          JSON.stringify(command.path) === JSON.stringify(fixture.path),
      ),
    ).toBe(false);
    expect(
      applyCommandV7(known, known.humanPlayerId, {
        kind: "MOVE",
        unitId: fixture.moverId,
        path: fixture.path,
      }),
    ).toMatchObject({
      accepted: false,
      error: { code: "MOVEMENT_ILLEGAL", params: { reason: "ZOC_STOPS_MOVE" } },
    });
  });

  it("does not reveal terrain beyond a newly detected Scout ZOC stop", () => {
    const { state: base, line } = hiddenScoutScenario();
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
      interruption: { at: line[1], reason: "ZOC" },
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
    const { state, alternate } = hiddenScoutScenario();
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
                terrain: "GRASS" as const,
                resource: "FERTILE_GROUND" as const,
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
      improvement: "FARM",
      populationContributionRemoved: 2,
      marketIncomeRemoved: 0,
      resourceRestored: "FERTILE_GROUND",
    };
    const revealed = projectEventsV7(before, after, before.humanPlayerId, [
      event,
    ]);
    expect(revealed.events).toEqual([event]);
    expect(parsePlayerEventEnvelopeV7(revealed)).toMatchObject({ ok: true });

    const oreAfter = checkedV7({
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
    const oreEvent: DomainEventV7 = {
      kind: "ECONOMIC_BUILDING_REMOVED",
      playerId: before.humanPlayerId,
      cityId: city.id,
      at,
      improvement: "MINE",
      populationContributionRemoved: 2,
      marketIncomeRemoved: 0,
      resourceRestored: "ORE",
    };
    const hiddenOre = projectEventsV7(before, oreAfter, before.humanPlayerId, [
      oreEvent,
    ]);
    expect(hiddenOre.events).toEqual([{ ...oreEvent, resourceRestored: null }]);
    expect(parsePlayerEventEnvelopeV7(hiddenOre)).toMatchObject({ ok: true });

    const engineeringBefore = allTechsV7(before);
    const engineeringAfter = checkedV7({
      ...oreAfter,
      players: engineeringBefore.players,
    });
    const visibleOre = projectEventsV7(
      engineeringBefore,
      engineeringAfter,
      before.humanPlayerId,
      [oreEvent],
    );
    expect(visibleOre.events).toEqual([oreEvent]);
    expect(parsePlayerEventEnvelopeV7(visibleOre)).toMatchObject({ ok: true });
  });

  it("reports blind Push as unknown and never identifies a concealed blocker", () => {
    const { state: hidden, line } = hiddenScoutScenario();
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
          },
          {
            ...existingEnemy,
            id: blockerId,
            role: "SCOUT",
            at: line[2],
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

  it("keeps an off-board edge Push blocked in its preview and projected event", () => {
    const base = exploredAllV7(allTechsV7(initialV7(2_401)));
    const attackerAt = { x: 9, y: 5 };
    const defenderAt = { x: 10, y: 5 };
    const aliasedTile = { x: 0, y: 6 };
    const state = checkedV7({
      ...base,
      treasureChests: base.treasureChests.filter(
        (at) => ![attackerAt, defenderAt].some((used) => same(at, used)),
      ),
      units: base.units.map((unit) =>
        unit.ownerId === base.humanPlayerId
          ? {
              ...unit,
              role: "HEAVY" as const,
              at: attackerAt,
              hp: 20,
              maxHp: 20,
              activation: READY,
            }
          : {
              ...unit,
              role: "HEAVY" as const,
              at: defenderAt,
              hp: 20,
              maxHp: 20,
              activation: READY,
            },
      ),
      board: {
        ...base.board,
        tiles: base.board.tiles.map((tile) =>
          [attackerAt, defenderAt, aliasedTile].some((at) => same(tile.at, at))
            ? {
                ...tile,
                terrain: "GRASS" as const,
                resource: null,
                improvement: null,
                site: null,
                road: false,
              }
            : tile,
        ),
      },
    });
    const attacker = state.units.find(
      (unit) => unit.ownerId === state.humanPlayerId,
    )!;
    const defender = state.units.find(
      (unit) => unit.ownerId !== state.humanPlayerId,
    )!;
    expect(
      queryCombatPreviewV7(
        viewForV7(state, state.humanPlayerId),
        attacker.id,
        defender.id,
      ),
    ).toMatchObject({ defenderDies: false, push: "BLOCKED" });

    const attacked = applyCommandV7(state, state.humanPlayerId, {
      kind: "ATTACK",
      unitId: attacker.id,
      targetUnitId: defender.id,
    });
    expect(attacked.accepted).toBe(true);
    if (!attacked.accepted) return;
    expect(
      attacked.events.find((event) => event.kind === "COMBAT_RESOLVED"),
    ).toMatchObject({ preview: { push: "BLOCKED" } });
    expect(
      projectEventsV7(
        state,
        attacked.state,
        state.humanPlayerId,
        attacked.events,
      ).events.find((event) => event.kind === "COMBAT_RESOLVED"),
    ).toMatchObject({ preview: { push: "BLOCKED" } });
  });

  it("keeps raw hashes behind an explicit spoiler capability while safe logs accept only projected batches", () => {
    const { state, alternate } = hiddenScoutScenario();
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
});

function hiddenScoutScenario(): {
  state: GameStateV7;
  line: readonly [CoordV7, CoordV7, CoordV7];
  alternate: CoordV7;
} {
  let state = allTechsV7(initialV7(779));
  const human = state.players.find(
    (player) => player.id === state.humanPlayerId,
  )!;
  const line = findGrassLine(state, human.id);
  const hostileAt = state.board.tiles
    .map((tile) => tile.at)
    .find(
      (at) =>
        distance(at, line[1]) === 1 &&
        !line.some((item) => same(item, at)) &&
        !state.cities.some((city) => same(city.at, at)) &&
        !state.treasureChests.some((chest) => same(chest, at)),
    )!;
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
    activeSeatIndex: state.turnOrder.indexOf(human.id),
    board: {
      ...state.board,
      tiles: state.board.tiles.map((tile) =>
        line.some((at) => same(at, tile.at))
          ? {
              ...tile,
              terrain: "GRASS" as const,
              resource: null,
              improvement: null,
              territoryCityId: null,
            }
          : tile,
      ),
    },
    players: state.players.map((player) =>
      player.id === human.id
        ? {
            ...player,
            researchedTechs: player.researchedTechs,
            explored: state.board.tiles
              .map((tile) => tile.at)
              .filter(
                (at) =>
                  !same(at, line[2]) &&
                  !same(at, hostileAt) &&
                  !same(at, alternate),
              ),
          }
        : player,
    ),
    units: state.units.map((unit) =>
      unit.ownerId === human.id
        ? { ...unit, role: "RAIDER", at: line[0], activation: READY }
        : {
            ...unit,
            role: "SCOUT",
            at: hostileAt,
            hp: 10,
            maxHp: 10,
            activation: READY,
          },
    ),
  });
  return { state, line, alternate };
}

function hiddenZocAfterRevealScenario(): {
  readonly state: GameStateV7;
  readonly moverId: UnitStateV7["id"];
  readonly hostileId: UnitStateV7["id"];
  readonly hostileAt: CoordV7;
  readonly path: readonly [CoordV7, CoordV7, CoordV7];
} {
  const base = allTechsV7(initialV7(780));
  const mover = base.units.find((unit) => unit.ownerId === base.humanPlayerId)!;
  const hostile = base.units.find(
    (unit) => unit.ownerId !== base.humanPlayerId,
  )!;
  const contributed = new Set(
    base.populationContributions.map((entry) => coordKey(entry.source.at)),
  );
  let geometry:
    | {
        start: CoordV7;
        path: readonly [CoordV7, CoordV7, CoordV7];
        hostileAt: CoordV7;
      }
    | undefined;
  for (let y = 1; y < base.board.height - 2 && geometry === undefined; y += 1)
    for (let x = 1; x < base.board.width - 3; x += 1) {
      const start = { x, y: y + 2 };
      const path = [
        { x: x + 1, y: y + 2 },
        { x: x + 2, y: y + 1 },
        { x: x + 3, y },
      ] as const;
      const hostileAt = { x: x + 3, y: y + 2 };
      const cells = [start, ...path, hostileAt];
      if (
        cells.every((at) => {
          const tile = base.board.tiles[at.y * base.board.width + at.x];
          return (
            tile?.site === null &&
            tile.improvement === null &&
            !contributed.has(coordKey(at)) &&
            !base.treasureChests.some((chest) => same(chest, at))
          );
        })
      ) {
        geometry = { start, path, hostileAt };
        break;
      }
    }
  if (geometry === undefined) throw new Error("No hidden ZOC geometry");
  const water = new Set(
    [geometry.start, ...geometry.path, geometry.hostileAt].map(coordKey),
  );
  const state = checkedV7({
    ...base,
    activeSeatIndex: base.turnOrder.indexOf(base.humanPlayerId),
    board: {
      ...base.board,
      tiles: base.board.tiles.map((tile) =>
        water.has(coordKey(tile.at))
          ? {
              ...tile,
              biome: null,
              terrain: "SHALLOW_WATER" as const,
              resource: null,
              improvement: null,
              road: false,
              site: null,
            }
          : tile,
      ),
    },
    players: base.players.map((player) =>
      player.id === base.humanPlayerId
        ? {
            ...player,
            explored: [
              ...base.cities
                .filter((city) => city.ownerId === base.humanPlayerId)
                .map((city) => city.at),
              geometry.start,
              ...geometry.path,
            ].sort(compareCoords),
          }
        : player,
    ),
    units: base.units.map((unit) =>
      unit.id === mover.id
        ? {
            ...unit,
            role: "PATROL_BOAT" as const,
            form: "NAVAL" as const,
            at: geometry.start,
            hp: 10,
            maxHp: 10,
            activation: READY,
          }
        : unit.id === hostile.id
          ? {
              ...unit,
              role: "PATROL_BOAT" as const,
              form: "NAVAL" as const,
              at: geometry.hostileAt,
              hp: 10,
              maxHp: 10,
              activation: READY,
            }
          : unit,
    ),
    treasureChests: base.treasureChests.filter(
      (chest) => !water.has(coordKey(chest)),
    ),
  });
  return {
    state,
    moverId: mover.id,
    hostileId: hostile.id,
    hostileAt: geometry.hostileAt,
    path: geometry.path,
  };
}

function findGrassLine(
  state: GameStateV7,
  detectorOwnerId: PlayerId,
): readonly [CoordV7, CoordV7, CoordV7] {
  for (let y = 1; y < state.board.height - 1; y += 1)
    for (let x = 1; x < state.board.width - 2; x += 1) {
      const line = [
        { x: x + 2, y: y + 2 },
        { x: x + 1, y: y + 1 },
        { x, y },
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

const distance = (left: CoordV7, right: CoordV7) =>
  Math.max(Math.abs(left.x - right.x), Math.abs(left.y - right.y));
const same = (left: CoordV7, right: CoordV7) =>
  left.x === right.x && left.y === right.y;
const coordKey = (at: CoordV7) => `${at.y},${at.x}`;
const compareCoords = (left: CoordV7, right: CoordV7) =>
  left.y - right.y || left.x - right.x;
