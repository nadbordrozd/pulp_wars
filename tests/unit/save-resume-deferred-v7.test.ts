// Fast resume (bead pulp_wars-2yc.95): the browser loads a save from its
// stored state (schema, invariants, hash) without replaying the command
// log, and checks the log afterwards with verifySaveReplayV7. Small
// hand-built games only; no match is played.
import { describe, expect, it } from "vitest";
import {
  FACTION_IDS_V7,
  RULESET_7_ID,
  appendReplayCommandV7,
  applyCommandV7,
  canonicalHash,
  canonicalJson,
  createPlayableGameV7,
  createReplayV7,
  distinctFactionsV7,
  queryPlayerCommandsV7,
  runReplayV7,
  viewForV7,
  type CommandV7,
  type GameStateV7,
  type MatchSetupV7,
  type ReplayFileV7,
} from "../../src/engine/index";
import {
  BrowserPersistenceV7,
  MAX_SAVE_BYTES_V7,
  SAVE_STORAGE_KEY_V7,
  createSaveEnvelopeV7,
  parseSaveV7,
  verifySaveReplayV7,
  type SaveEnvelopeV7,
} from "../../src/persistence/index";
import { verificationOfMessageV7 } from "../../src/app/save-history-v7";

const setup: MatchSetupV7 = {
  rulesetId: RULESET_7_ID,
  seed: 8,
  width: 11,
  height: 11,
  aiCount: 1,
  aiDifficulty: "NORMAL",
  aiMode: "RIVAL",
  humanColor: "CORAL",
  factions: distinctFactionsV7(2),
  mapType: "DRY_LAND",
  mapGenerationRevision: "REGIONAL_BIOMES_NAVAL_V4",
  curiosities: false,
};
const SAVED_AT = "2026-10-18T12:00:00.000Z";

interface PlayedV7 {
  readonly state: GameStateV7;
  readonly replay: ReplayFileV7;
}

function start(): PlayedV7 {
  const created = createPlayableGameV7(setup);
  if (!created.ok) throw new Error(created.error.code);
  return { state: created.state, replay: createReplayV7(setup) };
}

function play(game: PlayedV7, pick: (offered: CommandV7[]) => CommandV7) {
  const actor = game.state.turnOrder[game.state.activeSeatIndex];
  if (actor === undefined) throw new Error("no active seat");
  const command = pick([
    ...queryPlayerCommandsV7(viewForV7(game.state, actor)),
  ]);
  const applied = applyCommandV7(game.state, actor, command);
  if (!applied.accepted) throw new Error(applied.error.code);
  return {
    state: applied.state,
    replay: appendReplayCommandV7(game.replay, command, applied.state),
  };
}

const endTurn = (offered: CommandV7[]): CommandV7 => {
  const command = offered.find((item) => item.kind === "END_TURN");
  if (command === undefined) throw new Error("END_TURN not offered");
  return command;
};
const notEndTurn = (offered: CommandV7[]): CommandV7 => {
  const command = offered.find((item) => item.kind !== "END_TURN");
  if (command === undefined) throw new Error("nothing but END_TURN offered");
  return command;
};

/** A few commands of a small game: an action, End Turn, the AI's End Turn. */
function shortGame(): PlayedV7 {
  let game = start();
  game = play(game, notEndTurn);
  game = play(game, endTurn);
  game = play(game, endTurn);
  return game;
}

function saveOf(game: PlayedV7): SaveEnvelopeV7 {
  return createSaveEnvelopeV7(game, SAVED_AT);
}

function valid(source: string, replay: "VERIFY" | "DEFER"): SaveEnvelopeV7 {
  const loaded = parseSaveV7(source, { replay });
  if (loaded.kind !== "VALID") throw new Error(loaded.diagnostic);
  return loaded.save;
}

class MemoryStorageV7 {
  readonly values = new Map<string, string>();
  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
  removeItem(key: string): void {
    this.values.delete(key);
  }
}

describe("fast resume of a save (pulp_wars-2yc.95)", () => {
  it("loads a save without the replay to exactly what the full replay loads", () => {
    const game = shortGame();
    const source = JSON.stringify(saveOf(game));
    const deferred = valid(source, "DEFER");
    const verified = valid(source, "VERIFY");
    expect(deferred).toEqual(verified);
    expect(parseSaveV7(source)).toEqual({ kind: "VALID", save: verified });
    // The canonical hash of the state resumed without a replay is the hash
    // the full replay of its log reaches.
    const replayed = runReplayV7({ ...game.replay, checkpoints: [] });
    expect(canonicalHash(deferred.state)).toBe(replayed.stateHash);
    expect(canonicalJson(deferred.state)).toBe(canonicalJson(replayed.state));
    expect(deferred.stateHash).toBe(replayed.stateHash);
    expect(verifySaveReplayV7(deferred)).toEqual({ ok: true });
  });

  it("loads a save written before the change, a command-free one included", () => {
    // The envelope is unchanged: a save written by the earlier build is the
    // same JSON as one written now, and both modes read it alike.
    for (const game of [start(), shortGame()]) {
      const source = JSON.stringify(saveOf(game));
      expect(valid(source, "DEFER")).toEqual(valid(source, "VERIFY"));
    }
  });

  it("the browser repository resumes without the replay", () => {
    const game = shortGame();
    const save = saveOf(game);
    const tampered = tamperedState(save);
    const storage = new MemoryStorageV7();
    storage.setItem(SAVE_STORAGE_KEY_V7, JSON.stringify(tampered));
    // The log does not lead to this state: the full parse rejects it, the
    // browser's deferred one resumes it and leaves the log to the check.
    expect(parseSaveV7(JSON.stringify(tampered))).toMatchObject({
      kind: "CORRUPT",
    });
    const loaded = new BrowserPersistenceV7(storage).loadSave();
    if (loaded.kind !== "VALID") throw new Error(loaded.kind);
    expect(loaded.save.state).toEqual(tampered.state);
    expect(verifySaveReplayV7(loaded.save)).toEqual({
      ok: false,
      diagnostic: "Saved command replay validation failed.",
    });
  });

  it("rejects a changed state whose hash was not updated, in both modes", () => {
    const save = saveOf(shortGame());
    const state = {
      ...save.state,
      players: save.state.players.map((player, index) =>
        index === 0 ? { ...player, coins: player.coins + 7 } : player,
      ),
    };
    const source = JSON.stringify({ ...save, state });
    for (const replay of ["VERIFY", "DEFER"] as const)
      expect(parseSaveV7(source, { replay })).toEqual({
        kind: "CORRUPT",
        diagnostic:
          "Saved match schema or deterministic integrity validation failed.",
      });
  });

  it("finds a log that leads elsewhere: the full parse rejects it, the deferred check reports it", () => {
    // Two different games of the same length: the state of one with the
    // log of the other.
    const kept = shortGame();
    let other = start();
    other = play(other, endTurn);
    other = play(other, notEndTurn);
    other = play(other, endTurn);
    expect(other.replay.commands).toHaveLength(kept.replay.commands.length);
    const save = saveOf(kept);
    const swapped = { ...save, acceptedCommands: other.replay.commands };
    const source = JSON.stringify(swapped);
    expect(parseSaveV7(source)).toEqual({
      kind: "CORRUPT",
      diagnostic: "Saved command replay validation failed.",
    });
    const deferred = valid(source, "DEFER");
    expect(deferred.state).toEqual(kept.state);
    expect(verifySaveReplayV7(deferred)).toEqual({
      ok: false,
      diagnostic: "Saved command replay validation failed.",
    });
  });

  it("rejects a malformed log or envelope in the deferred mode too", () => {
    const save = saveOf(shortGame());
    const cases: unknown[] = [
      { ...save, acceptedCommands: [{ kind: "NOT_A_COMMAND" }] },
      { ...save, acceptedCommands: save.acceptedCommands.slice(1) },
      { ...save, commandIndex: save.commandIndex + 1 },
      {
        ...save,
        randomState: { ...save.randomState, state: save.randomState.state + 1 },
      },
      { ...save, extra: true },
      { ...save, stateHash: "0".repeat(64) },
    ];
    for (const item of cases)
      expect(
        parseSaveV7(JSON.stringify(item), { replay: "DEFER" }),
      ).toMatchObject({ kind: "CORRUPT" });
  });

  it("checks replay checkpoints where they are and returns the final hash", () => {
    const game = shortGame();
    const commands = game.replay.commands;
    const plain = runReplayV7({ ...game.replay, checkpoints: [] });
    expect(plain.stateHash).toBe(canonicalHash(game.state));
    expect(runReplayV7(game.replay).stateHash).toBe(plain.stateHash);
    const second = game.replay.checkpoints[1];
    if (second === undefined) throw new Error("checkpoint missing");
    expect(() =>
      runReplayV7({
        ...game.replay,
        checkpoints: [
          second,
          { index: commands.length, stateHash: "0".repeat(64) },
        ],
      }),
    ).toThrowError(`CHECKPOINT_MISMATCH at command index ${commands.length}`);
    expect(() =>
      runReplayV7({
        ...game.replay,
        checkpoints: [{ index: 0, stateHash: "0".repeat(64) }],
      }),
    ).toThrowError("CHECKPOINT_MISMATCH at command index 0");
  });

  it("reads the worker's reply defensively", () => {
    expect(verificationOfMessageV7({ ok: true })).toEqual({ ok: true });
    expect(verificationOfMessageV7({ ok: false, diagnostic: "x" })).toEqual({
      ok: false,
      diagnostic: "x",
    });
    for (const reply of [null, "ok", { ok: false }, { failed: "boom" }, {}])
      expect(verificationOfMessageV7(reply)).toBeNull();
  });

  it("leaves room under the size cap for a very long nine-seat 25 x 25 game", () => {
    // Measured (docs/architecture/PERFORMANCE.md): a nine-seat 25 x 25 save
    // holds 190 to 275 KB of state and 49 to 56 bytes a command; one had
    // 11,208 commands (904 KB) at round 101. The real starting save of such
    // a game, with 120 KB more state and 20,000 commands of 55 bytes (about
    // round 170), is still under the cap.
    const large: MatchSetupV7 = {
      ...setup,
      width: 25,
      height: 25,
      aiCount: FACTION_IDS_V7.length - 1,
      factions: [...FACTION_IDS_V7],
    };
    const created = createPlayableGameV7(large);
    if (!created.ok) throw new Error(created.error.code);
    const save = createSaveEnvelopeV7(
      { state: created.state, replay: createReplayV7(large) },
      SAVED_AT,
    );
    const typical = { kind: "MOVE", unitId: 4120, path: [{ x: 12, y: 14 }] };
    expect(JSON.stringify(typical).length + 1).toBe(55);
    const bytes = new TextEncoder().encode(
      JSON.stringify({
        ...save,
        acceptedCommands: Array.from({ length: 20_000 }, () => typical),
      }),
    ).byteLength;
    expect(bytes + 120_000).toBeLessThan(MAX_SAVE_BYTES_V7);
  });
});

/** The save with a state changed and its hash updated to match. */
function tamperedState(save: SaveEnvelopeV7): SaveEnvelopeV7 {
  const state = {
    ...save.state,
    players: save.state.players.map((player, index) =>
      index === 0 ? { ...player, coins: player.coins + 7 } : player,
    ),
  };
  return { ...save, state, stateHash: canonicalHash(state) };
}
