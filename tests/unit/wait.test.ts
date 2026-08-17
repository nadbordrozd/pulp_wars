import { describe, expect, it } from "vitest";
import {
  appendReplayCommand,
  applyCommand,
  canonicalHash,
  createReplay,
  parseCommand,
  queryPlayerCommands,
  runReplay,
  viewFor,
  type Command,
  type GameState,
  type PlayerId,
} from "../../src/engine/index";
import { createSaveEnvelope, parseSave } from "../../src/persistence/index";
import { headless } from "../../src/headless/index";
import { gameStateBuilder } from "../fixtures/builders";

describe("Wait and handled attention state", () => {
  it("parses the exact version-3 Wait shape without accepting extras", () => {
    expect(parseCommand({ kind: "WAIT", unitId: 2 })).toEqual({
      ok: true,
      value: { kind: "WAIT", unitId: 2 },
    });
    expect(
      parseCommand({ kind: "WAIT", unitId: 2, extra: true }),
    ).toMatchObject({ ok: false, error: { code: "INVALID_COMMAND" } });
  });

  it("sets only handled, emits one event, consumes no PRNG, and rejects repeat atomically", () => {
    const state = gameStateBuilder();
    const actor = state.turnOrder[state.activeSeatIndex];
    const unit = state.units.find((candidate) => candidate.ownerId === actor);
    if (actor === undefined || unit === undefined)
      throw new Error("Missing unit");
    const beforeOther = offered(state, actor).filter(
      (command) => command.kind !== "WAIT",
    );
    const beforeUnit = unit;
    const result = applyCommand(state, { kind: "WAIT", unitId: unit.id });
    if (!result.ok) throw new Error(result.error.code);

    const afterUnit = result.state.units.find(
      (candidate) => candidate.id === unit.id,
    );
    expect(afterUnit).toEqual({
      ...beforeUnit,
      activation: { ...beforeUnit.activation, handled: true },
    });
    expect(result.state.random).toEqual(state.random);
    expect(result.state.commandIndex).toBe(state.commandIndex + 1);
    expect(result.events).toEqual([
      { kind: "UNIT_WAITED", playerId: actor, unitId: unit.id },
    ]);
    expect(
      offered(result.state, actor).filter((command) => command.kind !== "WAIT"),
    ).toEqual(beforeOther);

    const repeated = applyCommand(result.state, {
      kind: "WAIT",
      unitId: unit.id,
    });
    expect(repeated).toMatchObject({
      ok: false,
      error: { code: "UNIT_ALREADY_HANDLED", params: { unitId: unit.id } },
    });
    expect(repeated.state).toBe(result.state);
    expect(canonicalHash(repeated.state)).toBe(canonicalHash(result.state));
  });

  it("offers Wait for an otherwise exhausted unhandled owned unit and never for rivals or an inactive viewer", () => {
    const base = gameStateBuilder();
    const actor = base.turnOrder[base.activeSeatIndex];
    const unit = base.units.find((candidate) => candidate.ownerId === actor);
    const rival = base.units.find((candidate) => candidate.ownerId !== actor);
    if (actor === undefined || unit === undefined || rival === undefined)
      throw new Error("Missing units");
    const exhausted: GameState = {
      ...base,
      units: base.units.map((candidate) =>
        candidate.id === unit.id
          ? {
              ...candidate,
              ready: false,
              activation: {
                moved: true,
                attacked: true,
                recovered: true,
                captured: true,
                handled: false,
                escapeAvailable: false,
                specialActed: false,
              },
            }
          : candidate,
      ),
    };
    expect(offered(exhausted, actor)).toContainEqual({
      kind: "WAIT",
      unitId: unit.id,
    });
    expect(offered(exhausted, actor)).not.toContainEqual({
      kind: "WAIT",
      unitId: rival.id,
    });
    expect(queryPlayerCommands(viewFor(exhausted, rival.ownerId))).toEqual([]);
  });

  it("leaves promotion free, permits actions after waiting, and preserves idle auto-recovery", () => {
    const base = gameStateBuilder();
    const actor = base.turnOrder[base.activeSeatIndex];
    const unit = base.units.find((candidate) => candidate.ownerId === actor);
    if (actor === undefined || unit === undefined)
      throw new Error("Missing unit");
    const prepared: GameState = {
      ...base,
      units: base.units.map((candidate) =>
        candidate.id === unit.id
          ? { ...candidate, hp: 5, kills: 3, veteran: false }
          : candidate,
      ),
    };
    const promotedFirst = applyCommand(prepared, {
      kind: "PROMOTE",
      unitId: unit.id,
    });
    if (!promotedFirst.ok) throw new Error(promotedFirst.error.code);
    expect(
      promotedFirst.state.units.find((candidate) => candidate.id === unit.id)
        ?.activation.handled,
    ).toBe(false);

    const waited = applyCommand(prepared, { kind: "WAIT", unitId: unit.id });
    if (!waited.ok) throw new Error(waited.error.code);
    expect(offered(waited.state, actor)).toContainEqual({
      kind: "PROMOTE",
      unitId: unit.id,
    });
    expect(
      offered(waited.state, actor).some(
        (command) => command.kind === "MOVE" && command.unitId === unit.id,
      ),
    ).toBe(true);
    const promoted = applyCommand(waited.state, {
      kind: "PROMOTE",
      unitId: unit.id,
    });
    if (!promoted.ok) throw new Error(promoted.error.code);
    expect(
      promoted.state.units.find((candidate) => candidate.id === unit.id)
        ?.activation.handled,
    ).toBe(true);

    const idleWaited = applyCommand(prepared, {
      kind: "WAIT",
      unitId: unit.id,
    });
    if (!idleWaited.ok) throw new Error(idleWaited.error.code);
    const ended = applyCommand(idleWaited.state, { kind: "END_TURN" });
    if (!ended.ok) throw new Error(ended.error.code);
    expect(ended.events).toContainEqual({
      kind: "UNIT_RECOVERED",
      unitId: unit.id,
      amount: 4,
      automatic: true,
    });
  });

  it("resets handled on the owner's next Start Turn", () => {
    const initial = gameStateBuilder();
    const actor = initial.turnOrder[initial.activeSeatIndex];
    const unit = initial.units.find((candidate) => candidate.ownerId === actor);
    if (actor === undefined || unit === undefined)
      throw new Error("Missing unit");
    const waited = applyCommand(initial, { kind: "WAIT", unitId: unit.id });
    if (!waited.ok) throw new Error(waited.error.code);
    let state = waited.state;
    do {
      const ended = applyCommand(state, { kind: "END_TURN" });
      if (!ended.ok) throw new Error(ended.error.code);
      state = ended.state;
    } while (state.turnOrder[state.activeSeatIndex] !== actor);
    expect(
      state.units.find((candidate) => candidate.id === unit.id)?.activation,
    ).toMatchObject({ handled: false, moved: false, attacked: false });
  });

  it("round-trips Wait through headless, replay, and save integrity validation", async () => {
    const initial = gameStateBuilder();
    const actor = initial.turnOrder[initial.activeSeatIndex];
    const unit = initial.units.find((candidate) => candidate.ownerId === actor);
    if (actor === undefined || unit === undefined)
      throw new Error("Missing unit");
    const command = { kind: "WAIT", unitId: unit.id } as const;
    const waited = applyCommand(initial, command);
    if (!waited.ok) throw new Error(waited.error.code);
    const headlessWaited = await headless.apply(initial, command);
    if (!headlessWaited.ok) throw new Error(headlessWaited.error.code);
    expect(canonicalHash(headlessWaited.state)).toBe(
      canonicalHash(waited.state),
    );
    expect(
      (await headless.viewFor(headlessWaited.state, actor)).units.find(
        (candidate) => candidate.id === unit.id,
      )?.activation.handled,
    ).toBe(true);
    const replay = appendReplayCommand(
      createReplay(initial.setup),
      command,
      waited.state,
    );
    expect(runReplay(replay).stateHash).toBe(canonicalHash(waited.state));

    const playerTallies = waited.state.players.map((player) => ({
      playerId: player.id,
      kills: 0,
      losses: 0,
      citiesCaptured: 0,
    }));
    const save = createSaveEnvelope(
      {
        state: waited.state,
        replay,
        tallies: { citiesCaptured: 0, unitsDefeated: 0, unitsLost: 0 },
        playerTallies,
      },
      "2026-08-16T12:00:00.000Z",
    );
    expect(parseSave(JSON.stringify(save))).toMatchObject({
      kind: "VALID",
      save: {
        acceptedCommands: [command],
        state: { commandIndex: 1, units: expect.any(Array) },
      },
    });
  });
});

function offered(state: GameState, actor: PlayerId): readonly Command[] {
  return queryPlayerCommands(viewFor(state, actor)).map(
    ({ command }) => command,
  );
}
