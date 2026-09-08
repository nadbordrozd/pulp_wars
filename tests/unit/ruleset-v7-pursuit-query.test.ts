/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { describe, expect, it } from "vitest";
import {
  TECHNOLOGY_IDS_V7,
  applyCommandV7,
  effectiveRoleRuleV7,
  previewBlackoutV7,
  previewDisbandV7,
  previewEconomicV7,
  queryCombatPreviewV7,
  queryPlayerCommandsV7,
  queryPursuitPreviewV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type GameStateV7,
  type PlayerId,
  type UnitRoleIdV7,
  type UnitStateV7,
} from "../../src/engine/index";
import {
  checkedV7,
  exploredAllV7,
  initialV7,
  richV7,
} from "../fixtures/v7-builders";

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

describe("ruleset-7 public query Pursuit lock", () => {
  it("offers only reducer-accepted active-sequence commands through READY and MOVED, then restores the turn", () => {
    const fixture = pursuitFixture();
    const beforeView = viewForV7(fixture.state, fixture.actor);
    const beforeCommands = queryPlayerCommandsV7(beforeView);
    const economic = beforeCommands.find(
      (command) => previewEconomicV7(beforeView, command).ok,
    );
    const research = {
      kind: "RESEARCH" as const,
      tech: "GRAND_WORKS" as const,
    };
    const otherAttack = {
      kind: "ATTACK" as const,
      unitId: fixture.fighterId,
      targetUnitId: fixture.otherTargetId,
    };
    const blackout = {
      kind: "BLACKOUT_CITY" as const,
      unitId: fixture.saboteurId,
      cityId: fixture.enemyCityId,
    };
    expect(economic).toBeDefined();
    expect(beforeCommands).toContainEqual(research);
    expect(beforeCommands.some((command) => command.kind === "TRAIN")).toBe(
      true,
    );
    expect(beforeCommands).toContainEqual(otherAttack);
    expect(beforeCommands).toContainEqual({
      kind: "PROMOTE",
      unitId: fixture.fighterId,
    });
    expect(beforeCommands).toContainEqual({
      kind: "WAIT",
      unitId: fixture.fighterId,
    });
    expect(previewBlackoutV7(beforeView, blackout).ok).toBe(true);

    const opened = openPursuit(fixture);
    const openView = viewForV7(opened, fixture.actor);
    const openCommands = queryPlayerCommandsV7(openView);
    expect(queryPlayerCommandsV7(opened, fixture.actor)).toEqual(openCommands);
    expect(new Set(openCommands.map((command) => command.kind))).toEqual(
      new Set(["PURSUE", "END_PURSUIT"]),
    );
    expect(
      openCommands.every(
        (command) => "unitId" in command && command.unitId === fixture.lancerId,
      ),
    ).toBe(true);
    for (const command of openCommands)
      expect(
        applyCommandV7(opened, fixture.actor, command).accepted,
        JSON.stringify(command),
      ).toBe(true);

    expect(
      queryCombatPreviewV7(openView, fixture.fighterId, fixture.otherTargetId),
    ).toBeNull();
    expect(
      queryCombatPreviewV7(
        opened,
        fixture.actor,
        fixture.fighterId,
        fixture.otherTargetId,
      ),
    ).toBeNull();
    expect(previewEconomicV7(openView, economic!)).toEqual({
      ok: false,
      error: "NOT_OFFERED",
    });
    expect(previewEconomicV7(opened, fixture.actor, economic!)).toEqual({
      ok: false,
      error: "NOT_OFFERED",
    });
    expect(previewBlackoutV7(openView, blackout)).toEqual({
      ok: false,
      error: "NOT_PREVIEWABLE",
    });
    expect(previewBlackoutV7(opened, fixture.actor, blackout)).toEqual({
      ok: false,
      error: "NOT_PREVIEWABLE",
    });
    expect(
      previewDisbandV7(opened, fixture.actor, fixture.fighterId),
    ).toBeNull();
    expect(queryPursuitPreviewV7(openView, fixture.lancerId)).toEqual(
      queryPursuitPreviewV7(opened, fixture.actor, fixture.lancerId),
    );

    const pursue = openCommands.find(
      (command): command is Extract<CommandV7, { kind: "PURSUE" }> =>
        command.kind === "PURSUE" &&
        command.path.some((at) => at.x === 4 && at.y === 5),
    );
    expect(pursue).toBeDefined();
    const moved = applyCommandV7(opened, fixture.actor, pursue!);
    expect(moved.accepted).toBe(true);
    if (!moved.accepted) return;
    const movedCommands = queryPlayerCommandsV7(moved.state, fixture.actor);
    expect(new Set(movedCommands.map((command) => command.kind))).toEqual(
      new Set(["ATTACK", "END_PURSUIT"]),
    );
    for (const command of movedCommands)
      expect(
        applyCommandV7(moved.state, fixture.actor, command).accepted,
        JSON.stringify(command),
      ).toBe(true);
    expect(
      queryCombatPreviewV7(
        moved.state,
        fixture.actor,
        fixture.lancerId,
        fixture.pursuitTargetId,
      ),
    ).not.toBeNull();

    const ended = applyCommandV7(moved.state, fixture.actor, {
      kind: "END_PURSUIT",
      unitId: fixture.lancerId,
    });
    expect(ended.accepted).toBe(true);
    if (!ended.accepted) return;
    const restored = queryPlayerCommandsV7(ended.state, fixture.actor);
    expect(restored).toContainEqual(research);
    expect(restored.some((command) => command.kind === "TRAIN")).toBe(true);
    expect(restored).toContainEqual(otherAttack);
    expect(restored).toContainEqual({ kind: "END_TURN" });
    expect(previewEconomicV7(ended.state, fixture.actor, economic!).ok).toBe(
      true,
    );
  });

  it("keeps pending reward choice precedence over an open sequence", () => {
    const fixture = pursuitFixture();
    const opened = openPursuit(fixture);
    const openView = viewForV7(opened, fixture.actor);
    const city = openView.cities.find(
      (candidate) => candidate.ownerId === fixture.actor,
    )!;
    const economic = queryPlayerCommandsV7(fixture.state, fixture.actor).find(
      (command) => previewEconomicV7(fixture.state, fixture.actor, command).ok,
    )!;
    const choiceView = {
      ...openView,
      pendingChoices: [
        {
          kind: "CITY_REWARD" as const,
          cityId: city.id,
          reachedLevel: 2,
          candidates: ["SURVEY", "STOCKPILE"] as const,
        },
      ],
    };
    expect(queryPlayerCommandsV7(choiceView)).toEqual([
      {
        kind: "CHOOSE_CITY_REWARD",
        cityId: city.id,
        reachedLevel: 2,
        reward: "SURVEY",
      },
      {
        kind: "CHOOSE_CITY_REWARD",
        cityId: city.id,
        reachedLevel: 2,
        reward: "STOCKPILE",
      },
    ]);
    expect(queryPursuitPreviewV7(choiceView, fixture.lancerId)).toBeNull();
    expect(
      queryCombatPreviewV7(
        choiceView,
        fixture.fighterId,
        fixture.otherTargetId,
      ),
    ).toBeNull();
    expect(previewEconomicV7(choiceView, economic)).toEqual({
      ok: false,
      error: "NOT_OFFERED",
    });
  });

  it("depends only on equal public views while hidden enemy positions differ", () => {
    const fixture = pursuitFixture();
    const opened = openPursuit(fixture);
    const explored = opened.board.tiles
      .map((tile) => tile.at)
      .filter(
        (at) =>
          (at.x <= 6 && at.y >= 4 && at.y <= 6) || (at.x >= 7 && at.y >= 7),
      );
    const hiddenId = fixture.otherTargetId;
    const variant = (at: CoordV7) =>
      checkedV7({
        ...opened,
        players: opened.players.map((player) =>
          player.id === fixture.actor ? { ...player, explored } : player,
        ),
        units: opened.units.map((unit) =>
          unit.id === hiddenId ? { ...unit, at } : unit,
        ),
      });
    const left = viewForV7(variant({ x: 0, y: 0 }), fixture.actor);
    const right = viewForV7(variant({ x: 0, y: 1 }), fixture.actor);
    expect(left).toEqual(right);
    expect(queryPlayerCommandsV7(left)).toEqual(queryPlayerCommandsV7(right));
    expect(queryPursuitPreviewV7(left, fixture.lancerId)).toEqual(
      queryPursuitPreviewV7(right, fixture.lancerId),
    );
  });

  it("defensively serializes multiple open sequences by stored unit order", () => {
    const fixture = pursuitFixture();
    const opened = openPursuit(fixture);
    const secondRule = effectiveRoleRuleV7("LANCER");
    const multiOpen = checkedV7({
      ...opened,
      units: opened.units.map((unit) =>
        unit.id === fixture.fighterId
          ? {
              ...unit,
              role: "LANCER" as const,
              hp: secondRule.maxHp,
              maxHp: secondRule.maxHp,
              activation: {
                ...READY,
                attacksUsed: 1 as const,
                pursuitPhase: "PURSUIT_READY" as const,
              },
            }
          : unit,
      ),
    });
    const commands = queryPlayerCommandsV7(multiOpen, fixture.actor);
    expect(
      commands.every(
        (command) => "unitId" in command && command.unitId === fixture.lancerId,
      ),
    ).toBe(true);
    expect(
      queryPursuitPreviewV7(multiOpen, fixture.actor, fixture.fighterId),
    ).toBeNull();
    expect(
      queryCombatPreviewV7(
        multiOpen,
        fixture.actor,
        fixture.fighterId,
        fixture.otherTargetId,
      ),
    ).toBeNull();
    for (const command of commands)
      expect(
        applyCommandV7(multiOpen, fixture.actor, command).accepted,
        JSON.stringify(command),
      ).toBe(true);
  });
});

interface PursuitFixture {
  readonly state: GameStateV7;
  readonly actor: PlayerId;
  readonly lancerId: UnitStateV7["id"];
  readonly pursuitVictimId: UnitStateV7["id"];
  readonly pursuitTargetId: UnitStateV7["id"];
  readonly fighterId: UnitStateV7["id"];
  readonly otherTargetId: UnitStateV7["id"];
  readonly saboteurId: UnitStateV7["id"];
  readonly enemyCityId: GameStateV7["cities"][number]["id"];
}

function pursuitFixture(): PursuitFixture {
  const base = richV7(exploredAllV7(initialV7()));
  const actor = base.humanPlayerId;
  const enemy = base.players.find((player) => player.id !== actor)!.id;
  const homeCity = base.cities.find((city) => city.ownerId === actor)!;
  const enemyCity = base.cities.find((city) => city.ownerId === enemy)!;
  const firstId = base.units.find((unit) => unit.ownerId === actor)!.id;
  const secondId = base.units.find((unit) => unit.ownerId === enemy)!.id;
  const nextId = base.nextEntityId;
  const units = [
    makeUnit(firstId, actor, "LANCER", { x: 2, y: 5 }, 10, homeCity.id),
    makeUnit(secondId, enemy, "FIGHTER", { x: 3, y: 5 }, 1),
    makeUnit(nextId, enemy, "FIGHTER", { x: 5, y: 5 }),
    {
      ...makeUnit(nextId + 1, actor, "FIGHTER", { x: 2, y: 8 }),
      kills: 3,
    },
    makeUnit(nextId + 2, enemy, "FIGHTER", { x: 3, y: 8 }),
    makeUnit(nextId + 3, actor, "SABOTEUR", { x: 7, y: 2 }),
  ].sort((left, right) => left.id - right.id);
  const state = checkedV7({
    ...base,
    nextEntityId: nextId + 4,
    players: base.players.map((player) =>
      player.id === actor
        ? {
            ...player,
            researchedTechs: TECHNOLOGY_IDS_V7.filter(
              (tech) => tech !== "GRAND_WORKS",
            ),
          }
        : player,
    ),
    treasureChests: [],
    units,
    board: {
      ...base.board,
      tiles: base.board.tiles.map((tile) =>
        units.some((unit) => same(unit.at, tile.at))
          ? {
              ...tile,
              terrain: "GRASS" as const,
              resource: null,
              improvement: null,
              site: null,
            }
          : tile,
      ),
    },
  });
  return {
    state,
    actor,
    lancerId: firstId,
    pursuitVictimId: secondId,
    pursuitTargetId: nextId as UnitStateV7["id"],
    fighterId: (nextId + 1) as UnitStateV7["id"],
    otherTargetId: (nextId + 2) as UnitStateV7["id"],
    saboteurId: (nextId + 3) as UnitStateV7["id"],
    enemyCityId: enemyCity.id,
  };
}

function openPursuit(fixture: PursuitFixture): GameStateV7 {
  const result = applyCommandV7(fixture.state, fixture.actor, {
    kind: "ATTACK",
    unitId: fixture.lancerId,
    targetUnitId: fixture.pursuitVictimId,
  });
  if (!result.accepted) throw new Error(result.error.code);
  expect(
    result.state.units.find((unit) => unit.id === fixture.lancerId)?.activation,
  ).toMatchObject({
    attacksUsed: 1,
    pursuitPhase: "PURSUIT_READY",
    attacked: false,
    handled: false,
  });
  return result.state;
}

function makeUnit(
  id: number,
  ownerId: PlayerId,
  role: UnitRoleIdV7,
  at: CoordV7,
  hp = effectiveRoleRuleV7(role).maxHp,
  homeCityId: UnitStateV7["homeCityId"] = null,
): UnitStateV7 {
  const rule = effectiveRoleRuleV7(role);
  return {
    id: id as UnitStateV7["id"],
    ownerId,
    homeCityId,
    role,
    at,
    hp,
    maxHp: rule.maxHp,
    kills: 0,
    veteran: false,
    captureEligible: false,
    activation: READY,
    blackoutEligibleRound: role === "SABOTEUR" ? 1 : null,
  };
}

function same(left: CoordV7, right: CoordV7): boolean {
  return left.x === right.x && left.y === right.y;
}
