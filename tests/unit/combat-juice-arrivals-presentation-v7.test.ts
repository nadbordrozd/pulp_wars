import { describe, expect, it } from "vitest";
import {
  applyCommandV7,
  projectEventsV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type GameStateV7,
  type PlayerEventEnvelopeV7,
  type PlayerId,
  type PlayerViewV7,
} from "../../src/engine/index";
import { combatJuiceSpawnsV7 } from "../../src/render/canvas/combat-juice-v7";
import {
  corePresentationPlanV7,
  type CorePresentationStepV7,
} from "../../src/render/canvas/presentation-plan-v7";
import {
  COMBAT_JUICE_REWARD_UI_V7,
  COMBAT_JUICE_UI_V7,
  combatJuiceChestFixtureV7,
  combatJuiceEnemyTurnFixtureV7,
  combatJuiceRewardCommandV7,
  combatJuiceRewardFixtureV7,
} from "../fixtures/v7-combat-juice-ui";
import { cityOfV7, rewardStateV7 } from "../fixtures/v7-dinosaur-arena";
import { goblinArenaV7, seatIdV7 } from "../fixtures/v7-goblin-arena";

/**
 * Bead pulp_wars-b9mc: a unit gained from a city's reward (the giant, a
 * Militia, one that pushes the unit on the center aside) or from a
 * treasure chest drops in with the spawn pop of a trained unit, on the
 * viewer's own turn and when another seat's turn is played back to it; a
 * unit that walks out of the fog does not. Small hand-built boundaries.
 */

const at = COMBAT_JUICE_REWARD_UI_V7;

interface BoundaryV7 {
  readonly before: PlayerViewV7;
  readonly after: PlayerViewV7;
  readonly envelope: PlayerEventEnvelopeV7;
  readonly steps: readonly CorePresentationStepV7[];
  readonly state: GameStateV7;
}

/** One command by `actor`, as `viewer` sees it. */
function boundary(
  state: GameStateV7,
  command: CommandV7,
  actor: PlayerId,
  viewer: PlayerId = state.humanPlayerId,
): BoundaryV7 {
  const result = applyCommandV7(state, actor, command);
  if (!result.accepted) throw new Error(result.error.code);
  const before = viewForV7(state, viewer);
  const after = viewForV7(result.state, viewer);
  const envelope = projectEventsV7(state, result.state, viewer, result.events);
  return {
    before,
    after,
    envelope,
    steps: corePresentationPlanV7(before, envelope, after),
    state: result.state,
  };
}

const spawnsOf = (played: BoundaryV7) =>
  combatJuiceSpawnsV7(played.before, played.after, played.envelope);

const newUnits = (played: BoundaryV7) =>
  played.after.units.filter(
    (unit) => !played.before.units.some((prior) => prior.id === unit.id),
  );

const unitIdAt = (state: GameStateV7, cell: CoordV7): number => {
  const unit = state.units.find(
    (candidate) => candidate.at.x === cell.x && candidate.at.y === cell.y,
  );
  if (unit === undefined) throw new Error(`no unit at ${cell.x},${cell.y}`);
  return unit.id;
};

function moveOntoChest(state: GameStateV7, seat: 0 | 1): BoundaryV7 {
  return boundary(
    state,
    {
      kind: "MOVE",
      unitId: unitIdAt(state, at.chestMover) as never,
      path: [at.chest],
    },
    seatIdV7(state, seat),
  );
}

describe("Spawn pop: units from a city's reward", () => {
  it("drops the giant onto the center once its Guard has slid aside", () => {
    const state = combatJuiceRewardFixtureV7();
    const guard = unitIdAt(state, at.capital);
    const played = boundary(
      state,
      combatJuiceRewardCommandV7(state),
      state.humanPlayerId,
    );
    const giant = played.after.units.find((unit) => unit.role === "JUGGERNAUT");
    expect(giant?.at).toEqual(at.capital);
    expect(spawnsOf(played)).toEqual([{ unitId: giant?.id, at: at.capital }]);
    // The Guard slides off in the playback's steps; the pop starts on the
    // frame that shows the result, so the giant lands on the empty center.
    expect(
      played.steps.filter(
        (step) => step.kind === "MOVE" && step.unitId === guard,
      ),
    ).toEqual([
      expect.objectContaining({
        path: [at.capital, at.pushedTo],
        pushSlide: true,
      }),
    ]);
  });

  it("drops both Goblins of a Goblin Militia", () => {
    const fixture = rewardStateV7("MILITIA", "GOBLIN");
    const played = boundary(
      fixture.state,
      fixture.command,
      fixture.state.humanPlayerId,
    );
    const goblins = newUnits(played);
    expect(goblins).toHaveLength(2);
    expect(spawnsOf(played)).toEqual(
      goblins.map((unit) => ({ unitId: unit.id, at: unit.at })),
    );
  });

  it("drops another seat's giant for a viewer who sees the city, but not the Guard it pushes", () => {
    const fixture = rewardStateV7("JUGGERNAUT", "ORIGINAL", [
      { role: "GUARD", at: at.capital },
    ]);
    const owner = seatIdV7(fixture.state, 0);
    const watcher = seatIdV7(fixture.state, 1);
    const played = boundary(fixture.state, fixture.command, owner, watcher);
    // The reward is the owner's alone; the watcher learns of the giant by
    // its reveal and sees the push.
    expect(
      played.envelope.events.some(
        (event) => event.kind === "UNIT_REWARD_GRANTED",
      ),
    ).toBe(false);
    const giant = played.after.units.find((unit) => unit.role === "JUGGERNAUT");
    expect(giant).toBeDefined();
    expect(spawnsOf(played)).toEqual([{ unitId: giant?.id, at: at.capital }]);
  });
});

describe("Spawn pop: units from a treasure chest", () => {
  it("drops the chest's unit beside the chest, not the unit that opened it", () => {
    const state = combatJuiceChestFixtureV7(0);
    const mover = unitIdAt(state, at.chestMover);
    const played = moveOntoChest(state, 0);
    const event = played.envelope.events.find(
      (candidate) => candidate.kind === "TREASURE_CAPTURED",
    );
    if (event?.kind !== "TREASURE_CAPTURED") throw new Error("no chest");
    expect(event.spawnedUnitId).not.toBeNull();
    const spawns = spawnsOf(played);
    expect(spawns).toEqual([
      { unitId: event.spawnedUnitId, at: event.spawnedAt },
    ]);
    expect(spawns.some((spawn) => spawn.unitId === mover)).toBe(false);
  });

  it("drops another seat's chest unit when its turn is played back", () => {
    const state = combatJuiceChestFixtureV7(1);
    const played = moveOntoChest(state, 1);
    expect(
      played.envelope.events.some(
        (event) => event.kind === "TREASURE_CAPTURED",
      ),
    ).toBe(false);
    const [found, ...rest] = newUnits(played);
    expect(rest).toEqual([]);
    expect(found?.ownerId).toBe(seatIdV7(state, 1));
    expect(spawnsOf(played)).toEqual([{ unitId: found?.id, at: found?.at }]);
  });
});

describe("Spawn pop: another seat's arrivals", () => {
  it("drops an enemy recruit on its city", () => {
    const state = combatJuiceEnemyTurnFixtureV7();
    const goblin = seatIdV7(state, 1);
    const city = cityOfV7(state, 1);
    const played = boundary(
      state,
      { kind: "TRAIN", cityId: city.id, role: "FIGHTER" },
      goblin,
    );
    const [trained] = newUnits(played);
    expect(trained?.at).toEqual(city.at);
    expect(spawnsOf(played)).toEqual([{ unitId: trained?.id, at: city.at }]);
  });

  it("does not drop a unit that walks out of the fog", () => {
    const from = { x: 4, y: 2 };
    const to = { x: 4, y: 3 };
    const arena = goblinArenaV7(
      ["ORIGINAL", "GOBLIN"],
      [
        { seat: 1, role: "FIGHTER", at: from },
        { seat: 1, role: "FIGHTER", at: to },
        { seat: 0, role: "FIGHTER", at: COMBAT_JUICE_UI_V7.fighter },
      ],
      { activeSeat: 1 },
    );
    // The Goblin on `to` makes way, so its tile is grass; the viewer has
    // not explored the walker's tile.
    const human = arena.humanPlayerId;
    const state: GameStateV7 = {
      ...arena,
      units: arena.units.filter(
        (unit) => !(unit.at.x === to.x && unit.at.y === to.y),
      ),
      players: arena.players.map((player) =>
        player.id === human
          ? {
              ...player,
              explored: player.explored.filter(
                (cell) => !(cell.x === from.x && cell.y === from.y),
              ),
            }
          : player,
      ),
    };
    const played = boundary(
      state,
      {
        kind: "MOVE",
        unitId: unitIdAt(state, from) as never,
        path: [to],
      },
      seatIdV7(state, 1),
    );
    expect(newUnits(played)).toHaveLength(1);
    expect(spawnsOf(played)).toEqual([]);
  });
});
