import { describe, expect, it } from "vitest";
import legacyReplay from "../fixtures/legacy-replay-v1.json";
import legacyReplayV2 from "../fixtures/legacy-replay-v2.json";
import legacyReplayV4 from "../fixtures/legacy-replay-v4.json";
import {
  ReplayError,
  appendReplayCommand,
  applyCommand,
  canonicalHash,
  createReplay,
  runReplay,
  type Command,
} from "../../src/engine/index";
import {
  gameStateBuilder,
  replayBuilder,
  setupBuilder,
} from "../fixtures/builders";

describe("replay checkpoints", () => {
  it("reconstructs a Huge v5 replay at the initial boundary", () => {
    const setup = setupBuilder({
      seed: 25,
      width: 25,
      height: 25,
      aiCount: 3,
    });
    const replay = createReplay(setup);
    const first = runReplay(replay);
    const second = runReplay(replay);
    expect(first).toEqual(second);
    expect(first.state.setup).toEqual(setup);
    expect(first.state.board.tiles).toHaveLength(625);
  });

  it("replays the same commands to identical state, events, and hash", () => {
    const replay = replayBuilder(8);
    const first = runReplay(replay);
    const second = runReplay(replay);
    expect(first).toEqual(second);
    expect(first.stateHash).toBe(canonicalHash(first.state));
    expect(first.acceptedCommands).toBe(8);
  });

  it("supports deterministic command-boundary stops", () => {
    const replay = replayBuilder(8);
    const stopped = runReplay(replay, { stopAfter: 3 });
    expect(stopped.acceptedCommands).toBe(3);
    expect(stopped.state.commandIndex).toBe(3);
  });

  it("fails atomically on checkpoint mismatch", () => {
    const replay = replayBuilder(2);
    const corrupt = {
      ...replay,
      checkpoints: replay.checkpoints.map((checkpoint) =>
        checkpoint.index === 2
          ? { ...checkpoint, stateHash: "0".repeat(64) }
          : checkpoint,
      ),
    };
    expect(() => runReplay(corrupt)).toThrowError(ReplayError);
    try {
      runReplay(corrupt);
    } catch (error) {
      expect(error).toMatchObject({ code: "CHECKPOINT_MISMATCH", index: 2 });
    }
  });

  it("fails when a logged command is rejected", () => {
    const replay = replayBuilder(0);
    const rejected = {
      ...replay,
      commands: [{ kind: "RESEARCH", tech: "MINING" }],
    } as const;
    expect(() => runReplay(rejected)).toThrowError(/COMMAND_REJECTED/);
  });

  it("reports a recognized v1 replay as incompatible", () => {
    expect(() =>
      runReplay(legacyReplay as unknown as ReturnType<typeof createReplay>),
    ).toThrowError(/INCOMPATIBLE_REPLAY/);
  });

  it("reports a recognized v2 replay as incompatible", () => {
    expect(() =>
      runReplay(legacyReplayV2 as unknown as ReturnType<typeof createReplay>),
    ).toThrowError(/INCOMPATIBLE_REPLAY/);
  });

  it("reports a recognized v3 replay as incompatible", () => {
    expect(() =>
      runReplay({
        format: "pulp-wars-replay",
        version: 3,
      } as unknown as ReturnType<typeof createReplay>),
    ).toThrowError(/INCOMPATIBLE_REPLAY/);
  });

  it("reports a recognized v4 replay as incompatible", () => {
    expect(() =>
      runReplay(legacyReplayV4 as unknown as ReturnType<typeof createReplay>),
    ).toThrowError(/INCOMPATIBLE_REPLAY/);
  });

  it("replays economic commands deterministically without consuming PRNG state", () => {
    const setup = setupBuilder({ seed: 0xa11c_e123 });
    let state = gameStateBuilder(setup);
    let replay = createReplay(setup);
    const random = state.random;
    const commands: readonly Command[] = [
      { kind: "RESEARCH", tech: "CLIMBING" },
      { kind: "END_TURN" },
      { kind: "RESEARCH", tech: "HUNTING" },
      { kind: "END_TURN" },
    ];
    for (const command of commands) {
      const result = applyCommand(state, command);
      if (!result.ok) throw new Error(result.error.code);
      state = result.state;
      replay = appendReplayCommand(replay, command, state);
    }
    expect(state.random).toBe(random);
    const first = runReplay(replay);
    const second = runReplay(replay);
    expect(first).toEqual(second);
    expect(first.stateHash).toBe(canonicalHash(state));
  });
});
