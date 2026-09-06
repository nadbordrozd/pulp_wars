import { describe, expect, it } from "vitest";
import {
  RULESET_7_ID,
  ReplayErrorV7,
  SAVE_STORAGE_KEY_V7,
  canonicalHash,
  createInitialMapStateV7,
  createReplayV7,
  parseReplayFileV7,
  runReplayV7,
  type MatchSetupV7,
} from "../../src/engine/index";
import { createSaveEnvelopeV7, parseSaveV7 } from "../../src/persistence/index";

const setup: MatchSetupV7 = {
  rulesetId: RULESET_7_ID,
  seed: 42,
  width: 11,
  height: 11,
  aiCount: 1,
  aiDifficulty: "NORMAL",
  aiMode: "RIVAL",
  humanColor: "CORAL",
  factions: ["ORIGINAL", "ORIGINAL"],
  mapGenerationRevision: "SPATIAL_ECONOMY",
};

describe("ruleset-7 save and replay foundation", () => {
  it("uses an independent v7 save key and round-trips a canonical initial save", () => {
    expect(SAVE_STORAGE_KEY_V7).toBe("pulpWars.save.v7.current");
    const created = createInitialMapStateV7(setup);
    if (!created.ok) throw new Error(created.error.code);
    const replay = createReplayV7(setup);
    const save = createSaveEnvelopeV7(
      { state: created.state, replay },
      "2026-09-06T12:00:00.000Z",
    );
    expect(parseSaveV7(JSON.stringify(save))).toEqual({ kind: "VALID", save });
    expect(save.stateHash).toBe(canonicalHash(created.state));
    expect(runReplayV7(replay)).toMatchObject({
      acceptedCommands: 0,
      stateHash: save.stateHash,
    });
  });

  it("classifies every v1-v6 artifact as incompatible without migration", () => {
    for (const version of [1, 2, 3, 4, 5, 6]) {
      const replay = { format: "pulp-wars-replay", version, opaque: "keep" };
      expect(parseReplayFileV7(replay)).toEqual({
        kind: "INCOMPATIBLE_REPLAY",
      });
      const source = JSON.stringify({
        format: "pulp-wars-save",
        version,
        opaque: "keep",
      });
      expect(parseSaveV7(source)).toMatchObject({ kind: "INCOMPATIBLE" });
      expect(source).toBe(
        JSON.stringify({ format: "pulp-wars-save", version, opaque: "keep" }),
      );
    }
  });

  it("rejects unknown fields, malformed checkpoints, hash drift, and unsupported command execution", () => {
    const created = createInitialMapStateV7(setup);
    if (!created.ok) throw new Error(created.error.code);
    const replay = createReplayV7(setup);
    expect(parseReplayFileV7({ ...replay, unknown: true })).toEqual({
      kind: "INVALID_REPLAY",
    });
    expect(
      parseReplayFileV7({
        ...replay,
        checkpoints: [{ index: 1, stateHash: "0".repeat(64) }],
      }),
    ).toEqual({ kind: "INVALID_REPLAY" });
    const save = createSaveEnvelopeV7(
      { state: created.state, replay },
      "2026-09-06T12:00:00.000Z",
    );
    expect(
      parseSaveV7(JSON.stringify({ ...save, stateHash: "0".repeat(64) })),
    ).toMatchObject({ kind: "CORRUPT" });
    const withCommand = {
      ...replay,
      commands: [{ kind: "END_TURN" }],
    } as const;
    expect(() => runReplayV7(withCommand)).toThrowError(ReplayErrorV7);
    try {
      runReplayV7(withCommand);
    } catch (error) {
      expect((error as ReplayErrorV7).code).toBe(
        "COMMAND_REPLAY_NOT_IMPLEMENTED",
      );
    }
  });

  it("does not copy the v6 missing-treasure normalization", () => {
    const created = createInitialMapStateV7(setup);
    if (!created.ok) throw new Error(created.error.code);
    const save = createSaveEnvelopeV7(
      { state: created.state, replay: createReplayV7(setup) },
      "2026-09-06T12:00:00.000Z",
    );
    const state = Object.fromEntries(
      Object.entries(save.state).filter(([key]) => key !== "treasureChests"),
    );
    expect(
      parseSaveV7(
        JSON.stringify({ ...save, state, stateHash: canonicalHash(state) }),
      ),
    ).toMatchObject({ kind: "CORRUPT" });
  });
});
