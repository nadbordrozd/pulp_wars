import { describe, expect, it } from "vitest";
import {
  applyCommandV7,
  playerId,
  projectEventsV7,
  queryPlayerCommandsV7,
  viewForV7,
} from "../../src/engine/index";
import { buildBoardRenderPlanV7 } from "../../src/render/canvas/board-renderer-v7";
import { corePresentationPlanV7 } from "../../src/render/canvas/presentation-plan-v7";
import { recruitmentRolePresentationV7 } from "../../src/render/dom/app-view-v7";
import {
  battleshipBombardmentV7,
  coastalV7,
  withPortV7,
} from "../fixtures/v7-naval-builders";
import { checkedV7 } from "../fixtures/v7-builders";

const READY = {
  moved: false,
  movedPathLength: 0,
  attacked: false,
  attacksUsed: 0 as const,
  healed: false,
  recovered: false,
  captured: false,
  handled: false,
  specialActed: false,
};

describe("Ruleset 7 naval public presentation", () => {
  it("binds water, Port status, exact Port recruitment, transport identity, and landing targets", () => {
    const portFixture = withPortV7(9001);
    const portView = viewForV7(
      portFixture.state,
      portFixture.state.humanPlayerId,
    );
    const train = queryPlayerCommandsV7(portView).find(
      (command) =>
        command.kind === "TRAIN_NAVAL" &&
        command.role === "PATROL_BOAT" &&
        command.at.x === portFixture.portAt.x &&
        command.at.y === portFixture.portAt.y,
    );
    expect(train).toEqual({
      kind: "TRAIN_NAVAL",
      cityId: expect.any(Number),
      at: portFixture.portAt,
      role: "PATROL_BOAT",
    });
    if (train?.kind !== "TRAIN_NAVAL") throw new Error("naval train missing");
    const recruited = applyCommandV7(
      portFixture.state,
      portFixture.state.humanPlayerId,
      train,
    );
    if (!recruited.accepted) throw new Error(recruited.error.code);
    const recruitmentEnvelope = projectEventsV7(
      portFixture.state,
      recruited.state,
      portFixture.state.humanPlayerId,
      recruited.events,
    );
    expect(recruitmentEnvelope.events).toContainEqual(
      expect.objectContaining({ kind: "NAVAL_UNIT_TRAINED" }),
    );
    expect(recruitmentEnvelope.events).not.toContainEqual(
      expect.objectContaining({ kind: "UNIT_REVEALED" }),
    );
    expect(
      corePresentationPlanV7(
        portView,
        recruitmentEnvelope,
        viewForV7(recruited.state, portFixture.state.humanPlayerId),
      ),
    ).toEqual([]);
    const portPlan = buildBoardRenderPlanV7(
      portView,
      train === undefined ? [] : [train],
      {
        selection: { kind: "TILE", at: portFixture.portAt },
        selectedUnitId: null,
        selectedAchievement: null,
      },
    );
    expect(portPlan.entries).toContainEqual(
      expect.objectContaining({
        kind: "TERRAIN",
        at: portFixture.portAt,
        assetId: "terrain-ruleset7-water-shallow",
      }),
    );
    expect(portPlan.entries).toContainEqual(
      expect.objectContaining({
        kind: "IMPROVEMENT",
        at: portFixture.portAt,
        assetId: "building-ruleset7-port",
      }),
    );
    expect(portPlan.entries).toContainEqual(
      expect.objectContaining({
        kind: "STATUS",
        at: portFixture.portAt,
        statusId: "ui-status-port-active",
      }),
    );

    const landUnit = portFixture.state.units.find(
      (unit) =>
        unit.ownerId === portFixture.state.humanPlayerId &&
        unit.form === "LAND",
    );
    if (landUnit === undefined) throw new Error("land unit missing");
    const embark = queryPlayerCommandsV7(portView).find(
      (command) =>
        command.kind === "MOVE" &&
        command.unitId === landUnit.id &&
        command.path.at(-1)?.x === portFixture.portAt.x &&
        command.path.at(-1)?.y === portFixture.portAt.y,
    );
    expect(embark).toBeDefined();
    if (embark?.kind !== "MOVE") return;
    const embarked = applyCommandV7(
      portFixture.state,
      portFixture.state.humanPlayerId,
      embark,
    );
    expect(embarked.accepted).toBe(true);
    if (!embarked.accepted) return;
    const readyEmbarked = checkedV7({
      ...embarked.state,
      units: embarked.state.units.map((candidate) =>
        candidate.id === landUnit.id
          ? { ...candidate, activation: READY }
          : candidate,
      ),
    });
    const embarkedView = viewForV7(
      readyEmbarked,
      portFixture.state.humanPlayerId,
    );
    const landings = queryPlayerCommandsV7(embarkedView).filter(
      (command) =>
        command.kind === "DISEMBARK" && command.unitId === landUnit.id,
    );
    expect(landings.length).toBeGreaterThan(0);
    const transportPlan = buildBoardRenderPlanV7(embarkedView, landings, {
      selection: { kind: "UNIT", unitId: landUnit.id },
      selectedUnitId: landUnit.id,
      selectedAchievement: null,
    });
    expect(transportPlan.entries).toContainEqual(
      expect.objectContaining({
        key: `unit:${landUnit.id}`,
        assetId: "unit-shared-embarked-transport",
        label: expect.stringContaining("passenger"),
      }),
    );
    expect(
      transportPlan.targets.every((target) => target.family === "DISEMBARK"),
    ).toBe(true);
    expect(transportPlan.targets.map((target) => target.command)).toEqual(
      landings,
    );
  });

  it("never offers a Monument on water and rejects an injected water placement as INVALID_TILE", () => {
    const fixture = coastalV7(9002);
    const state = {
      ...fixture.state,
      players: fixture.state.players.map((player) =>
        player.id === fixture.state.humanPlayerId
          ? {
              ...player,
              achievementEntitlements: player.achievementEntitlements.map(
                (entry) =>
                  entry.achievement === "EXPLORER"
                    ? { ...entry, unlocked: true }
                    : entry,
              ),
            }
          : player,
      ),
    };
    const view = viewForV7(state, state.humanPlayerId);
    expect(
      queryPlayerCommandsV7(view).some(
        (command) =>
          command.kind === "BUILD_MONUMENT" &&
          command.at.x === fixture.portAt.x &&
          command.at.y === fixture.portAt.y,
      ),
    ).toBe(false);
    expect(
      applyCommandV7(state, state.humanPlayerId, {
        kind: "BUILD_MONUMENT",
        achievement: "EXPLORER",
        at: fixture.portAt,
      }),
    ).toMatchObject({ accepted: false, error: { code: "INVALID_TILE" } });
    const mountain = state.board.tiles.find(
      (tile) =>
        tile.territoryCityId ===
          state.cities.find((city) => city.ownerId === state.humanPlayerId)
            ?.id &&
        tile.terrain === "MOUNTAIN" &&
        tile.resource === "ORE" &&
        tile.site === null &&
        tile.improvement === null,
    );
    if (mountain === undefined)
      throw new Error("concealed Ore mountain missing");
    const informed = viewForV7(state, state.humanPlayerId);
    const concealedOre = {
      ...informed,
      viewer: { ...informed.viewer, researchedTechs: ["GATHERING" as const] },
      board: {
        ...informed.board,
        tiles: informed.board.tiles.map((tile) =>
          tile.explored &&
          tile.at.x === mountain.at.x &&
          tile.at.y === mountain.at.y
            ? { ...tile, resource: null }
            : tile,
        ),
      },
    };
    expect(queryPlayerCommandsV7(concealedOre)).not.toContainEqual(
      expect.objectContaining({ kind: "BUILD_MONUMENT", at: mountain.at }),
    );
    expect(
      applyCommandV7(state, state.humanPlayerId, {
        kind: "BUILD_MONUMENT",
        achievement: "EXPLORER",
        at: mountain.at,
      }),
    ).toMatchObject({ accepted: false, error: { code: "INVALID_TILE" } });
  });

  it("uses public form transitions for camera movement and Battleship ranged fire", () => {
    const fixture = withPortV7(9003);
    const before = viewForV7(fixture.state, fixture.state.humanPlayerId);
    const unit = fixture.state.units.find(
      (candidate) => candidate.ownerId === fixture.state.humanPlayerId,
    );
    if (unit === undefined) throw new Error("unit missing");
    const embark = queryPlayerCommandsV7(before).find(
      (command) =>
        command.kind === "MOVE" &&
        command.unitId === unit.id &&
        command.path.at(-1)?.x === fixture.portAt.x &&
        command.path.at(-1)?.y === fixture.portAt.y,
    );
    if (embark?.kind !== "MOVE") throw new Error("embark missing");
    const result = applyCommandV7(
      fixture.state,
      fixture.state.humanPlayerId,
      embark,
    );
    if (!result.accepted) throw new Error(result.error.code);
    const envelope = projectEventsV7(
      fixture.state,
      result.state,
      fixture.state.humanPlayerId,
      result.events,
    );
    expect(
      corePresentationPlanV7(
        before,
        envelope,
        viewForV7(result.state, fixture.state.humanPlayerId),
      ),
    ).toContainEqual(
      expect.objectContaining({
        kind: "MOVE",
        unitId: unit.id,
        path: [unit.at, fixture.portAt],
      }),
    );

    const battle = battleshipBombardmentV7(9003, 2);
    const battleshipView = viewForV7(battle.state, battle.state.humanPlayerId);
    const bombardment = applyCommandV7(
      battle.state,
      battle.state.humanPlayerId,
      {
        kind: "ATTACK",
        unitId: battle.attackerId,
        targetUnitId: battle.defenderId,
      },
    );
    if (!bombardment.accepted) throw new Error(bombardment.error.code);
    const battleEnvelope = projectEventsV7(
      battle.state,
      bombardment.state,
      battle.state.humanPlayerId,
      bombardment.events,
    );
    expect(
      corePresentationPlanV7(
        battleshipView,
        battleEnvelope,
        viewForV7(bombardment.state, battle.state.humanPlayerId),
      ),
    ).toContainEqual(
      expect.objectContaining({
        kind: "RANGED",
        unitId: battle.attackerId,
      }),
    );
    const observer = battle.state.players.find(
      (player) =>
        player.id !== battle.state.humanPlayerId &&
        player.id !==
          battle.state.units.find(
            (candidate) => candidate.id === battle.defenderId,
          )?.ownerId,
    );
    if (observer === undefined) throw new Error("observer missing");
    const hiddenEnvelope = projectEventsV7(
      battle.state,
      bombardment.state,
      observer.id,
      bombardment.events,
    );
    expect(
      hiddenEnvelope.events.some((event) => event.kind === "COMBAT_RESOLVED"),
    ).toBe(false);
    const visibleBattle = checkedV7({
      ...battle.state,
      players: battle.state.players.map((player) =>
        player.id === observer.id
          ? {
              ...player,
              explored: battle.state.board.tiles.map((tile) => tile.at),
            }
          : player,
      ),
    });
    const visibleBombardment = applyCommandV7(
      visibleBattle,
      visibleBattle.humanPlayerId,
      {
        kind: "ATTACK",
        unitId: battle.attackerId,
        targetUnitId: battle.defenderId,
      },
    );
    if (!visibleBombardment.accepted)
      throw new Error(visibleBombardment.error.code);
    const visibleEnvelope = projectEventsV7(
      visibleBattle,
      visibleBombardment.state,
      observer.id,
      visibleBombardment.events,
    );
    expect(
      corePresentationPlanV7(
        viewForV7(visibleBattle, observer.id),
        visibleEnvelope,
        viewForV7(visibleBombardment.state, observer.id),
      ),
    ).toContainEqual(
      expect.objectContaining({
        kind: "RANGED",
        unitId: battle.attackerId,
      }),
    );
    expect(
      recruitmentRolePresentationV7("BATTLESHIP").restrictions.join(" "),
    ).toContain("choose movement or fire");
  });

  it("shows deduplicated recovery only for an owned vessel on legal non-allied water", () => {
    const fixture = withPortV7(9004);
    const source = viewForV7(fixture.state, fixture.state.humanPlayerId);
    const selected = source.units.find(
      (unit) => unit.ownerId === source.viewer.id,
    );
    const enemy = source.units.find(
      (unit) => unit.ownerId !== source.viewer.id,
    );
    if (selected === undefined || enemy === undefined)
      throw new Error("units missing");
    const adjacent = source.board.tiles.filter(
      (tile) =>
        tile.explored &&
        Math.max(
          Math.abs(tile.at.x - fixture.portAt.x),
          Math.abs(tile.at.y - fixture.portAt.y),
        ) === 1,
    );
    const secondPort = adjacent[0]?.at;
    const alliedWater = adjacent[1]?.at;
    if (secondPort === undefined) throw new Error("second Port tile missing");
    if (alliedWater === undefined) throw new Error("allied water missing");
    const ownId = enemy.ownerId;
    const humanId = selected.ownerId;
    const city = source.cities[0];
    if (city === undefined) throw new Error("city missing");
    const view = {
      ...source,
      setup: { ...source.setup, aiMode: "COOPERATIVE" as const },
      humanPlayerId: humanId,
      viewer: { ...source.viewer, id: ownId },
      units: source.units.map((unit) =>
        unit.id === selected.id
          ? {
              ...unit,
              ownerId: ownId,
              form: "NAVAL" as const,
              role: "PATROL_BOAT" as const,
              at: fixture.portAt,
            }
          : unit,
      ),
      board: {
        ...source.board,
        tiles: source.board.tiles.map((tile) =>
          tile.at.x === alliedWater.x && tile.at.y === alliedWater.y
            ? {
                ...tile,
                biome: null,
                terrain: "SHALLOW_WATER" as const,
                territoryOwnerId: playerId(3),
              }
            : tile.at.x === secondPort.x && tile.at.y === secondPort.y
              ? {
                  ...tile,
                  biome: null,
                  terrain: "SHALLOW_WATER" as const,
                }
              : tile,
        ),
      },
      naval: {
        ...source.naval,
        ownedPorts: [
          {
            at: fixture.portAt,
            cityId: city.id,
            status: "ACTIVE" as const,
          },
          {
            at: secondPort,
            cityId: city.id,
            status: "ACTIVE" as const,
          },
        ],
      },
    };
    const plan = buildBoardRenderPlanV7(view, [], {
      selection: { kind: "UNIT", unitId: selected.id },
      selectedUnitId: selected.id,
      selectedAchievement: null,
    });
    const recovery = plan.entries.filter((entry) =>
      entry.key.startsWith(`naval-recovery:${selected.id}:`),
    );
    expect(new Set(recovery.map((entry) => entry.key)).size).toBe(
      recovery.length,
    );
    expect(recovery.map((entry) => entry.at)).not.toContainEqual(alliedWater);

    const enemySelection = buildBoardRenderPlanV7(view, [], {
      selection: { kind: "UNIT", unitId: enemy.id },
      selectedUnitId: enemy.id,
      selectedAchievement: null,
    });
    expect(
      enemySelection.entries.some((entry) =>
        entry.key.startsWith("naval-recovery:"),
      ),
    ).toBe(false);
  });
});
