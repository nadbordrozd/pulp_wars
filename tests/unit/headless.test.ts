import { describe, expect, it } from "vitest";
import { headless, runAiBatch, runAiMatch } from "../../src/headless/index";
import { setupBuilder } from "../fixtures/builders";

describe("headless match foundations", () => {
  it("creates, views, and advances the same DOM-free match model", async () => {
    const created = await headless.create(setupBuilder());
    if (!created.ok) throw new Error(created.error.code);
    const viewerId = created.state.players[0]?.id;
    if (viewerId === undefined) throw new Error("Missing headless viewer");
    const view = await headless.viewFor(created.state, viewerId);
    expect(view.board.tiles.some((tile) => !tile.explored)).toBe(true);
    const applied = await headless.apply(created.state, { kind: "END_TURN" });
    if (!applied.ok) throw new Error(applied.error.code);
    expect(applied.state.commandIndex).toBe(1);
    expect(applied.events.map((event) => event.kind)).toEqual([
      "INCOME_PREVIEWED",
      "TURN_ENDED",
      "TURN_STARTED",
      "INCOME_AWARDED",
    ]);
  });
});

describe("complete deterministic AI matches", () => {
  it("repeats command/event/checkpoint logs and final hashes byte-for-byte", () => {
    const setup = setupBuilder({ seed: 0 });
    const first = runAiMatch(setup, { maxCommands: 1_000, maxRounds: 100 });
    const second = runAiMatch(setup, {
      maxCommands: 1_000,
      maxRounds: 100,
    });
    expect(first.commandLog).toEqual(second.commandLog);
    expect(first.events).toEqual(second.events);
    expect(first.stateHash).toBe(second.stateHash);
    expect(first.termination).toBe("OUTCOME");
    expect(first.errors).toEqual([]);
    expect(first.stalls).toEqual([]);
    expect(first.commandLog).toHaveLength(first.acceptedCommands);
    expect(
      Math.max(
        ...first.commandLog.reduce<number[]>((turns, record, index, log) => {
          const previous = log[index - 1];
          if (previous === undefined || previous.playerId !== record.playerId) {
            turns.push(1);
          } else {
            turns[turns.length - 1] = (turns.at(-1) ?? 0) + 1;
          }
          return turns;
        }, []),
      ),
    ).toBeLessThanOrEqual(128);
  }, 30_000);

  it("summarizes a fixed cross-setup batch corpus", async () => {
    const summary = await runAiBatch({
      seeds: [0],
      aiCounts: [1, 2, 3],
      maxCommands: 1,
      maxRounds: 5,
    });
    expect(summary).toMatchObject({
      matches: 3,
      completed: 0,
      capped: 3,
      errors: 0,
      stalls: 0,
      outcomes: { COMMAND_CAP: 3 },
    });
    expect(summary.entries.map((entry) => entry.finalHash)).toEqual([
      "cdccc1907ba9c5949ff6c821167ace40659c955bd3dee1e41b99c91c7cd56f22",
      "e9e38005fa4b16e164bf2b24f9adb966bf7246f9b2fb813198886eacb2b03a99",
      "592657c7dee7b4a54c9d01520e8cdf6119947b3220c1f6da188939464f040ea3",
    ]);
    expect(
      summary.entries.map((entry) => entry.metrics.factionsBySeat),
    ).toEqual([
      ["ORIGINAL", "ORIGINAL"],
      ["ORIGINAL", "ORIGINAL", "ORIGINAL"],
      ["ORIGINAL", "ORIGINAL", "ORIGINAL", "ORIGINAL"],
    ]);
  }, 30_000);

  it("accepts Huge as an explicit batch size for every AI count", async () => {
    const summary = await runAiBatch({
      seeds: [0],
      aiCounts: [1, 2, 3],
      boardSize: 25,
      maxCommands: 1,
      maxRounds: 5,
    });
    expect(summary).toMatchObject({
      matches: 3,
      completed: 0,
      capped: 3,
      errors: 0,
      stalls: 0,
    });
    expect(summary.entries.every((entry) => entry.commands === 1)).toBe(true);
  });

  it("repeats a complete cooperative match without rewriting the human seat", () => {
    const cooperative = setupBuilder({
      seed: 0,
      aiCount: 2,
      width: 14,
      height: 14,
      aiMode: "COOPERATIVE",
    });
    const first = runAiMatch(cooperative, {
      maxCommands: 2_000,
      maxRounds: 500,
    });
    const second = runAiMatch(cooperative, {
      maxCommands: 2_000,
      maxRounds: 500,
    });
    expect(first.termination).toBe("OUTCOME");
    expect(first.outcome?.kind).toMatch(/VICTORY|DEFEAT/);
    expect(
      first.state.players.find(
        (player) => player.id === first.state.humanPlayerId,
      )?.controller,
    ).toBe("HUMAN");
    expect(first.commandLog).toEqual(second.commandLog);
    expect(first.events).toEqual(second.events);
    expect(first.stateHash).toBe(second.stateHash);
    expect(first.errors).toEqual([]);
    expect(first.stalls).toEqual([]);
  }, 60_000);

  it("accepts Large cooperative batches as an explicit option", async () => {
    const summary = await runAiBatch({
      seeds: [0],
      aiCounts: [1, 2, 3],
      boardSize: 20,
      aiMode: "COOPERATIVE",
      maxCommands: 1,
      maxRounds: 5,
    });
    expect(summary).toMatchObject({
      matches: 3,
      completed: 0,
      capped: 3,
      errors: 0,
      stalls: 0,
    });
  });
});
