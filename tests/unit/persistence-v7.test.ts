import { describe, expect, it } from "vitest";
import {
  RULESET_7_ID,
  SAVE_STORAGE_KEY_V7,
  appendReplayCommandV7,
  applyCommandV7,
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
    expect(SAVE_STORAGE_KEY_V7).toBe("pulpWars.save.v7r2.current");
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

  it("round-trips a command-bearing v7 save through reducer replay", () => {
    const created = createInitialMapStateV7(setup);
    if (!created.ok) throw new Error(created.error.code);
    const actor = created.state.turnOrder[created.state.activeSeatIndex];
    if (actor === undefined) throw new Error("active actor missing");
    const applied = applyCommandV7(created.state, actor, {
      kind: "RESEARCH",
      tech: "HUNTING",
    });
    if (!applied.accepted) throw new Error(applied.error.code);
    const replay = appendReplayCommandV7(
      createReplayV7(setup),
      { kind: "RESEARCH", tech: "HUNTING" },
      applied.state,
    );
    const save = createSaveEnvelopeV7(
      { state: applied.state, replay },
      "2026-09-06T12:30:00.000Z",
    );
    expect(parseSaveV7(JSON.stringify(save))).toEqual({ kind: "VALID", save });
    expect(runReplayV7(replay).state).toEqual(applied.state);
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

  it("preserves the r1 development identity as incompatible and never executes it", () => {
    const developmentSetup = {
      ...setup,
      rulesetId: "pulp-wars-poc-7",
    };
    const developmentReplay = {
      format: "pulp-wars-replay",
      version: 7,
      setup: developmentSetup,
      commands: [{ kind: "UNKNOWN_DEVELOPMENT_COMMAND" }],
      checkpoints: [],
    };
    expect(parseReplayFileV7(developmentReplay)).toEqual({
      kind: "INCOMPATIBLE_REPLAY",
    });
    expect(() => runReplayV7(developmentReplay)).toThrowError(
      "INCOMPATIBLE_REPLAY",
    );

    const created = createInitialMapStateV7(setup);
    if (!created.ok) throw new Error(created.error.code);
    const current = createSaveEnvelopeV7(
      { state: created.state, replay: createReplayV7(setup) },
      "2026-09-06T12:00:00.000Z",
    );
    const developmentState = {
      ...current.state,
      rulesetId: "pulp-wars-poc-7",
      setup: developmentSetup,
      players: current.state.players.map((player) => ({
        ...player,
        factionTreeId: "ORIGINAL_BASELINE_V2",
      })),
    };
    const developmentSave = {
      ...current,
      rulesetId: "pulp-wars-poc-7",
      setup: developmentSetup,
      state: developmentState,
      randomState: developmentState.random,
      stateHash: canonicalHash(developmentState),
    };
    const source = JSON.stringify(developmentSave);
    expect(parseSaveV7(source)).toMatchObject({ kind: "INCOMPATIBLE" });
    expect(source).toBe(JSON.stringify(developmentSave));
  });

  it("rejects mixed and unknown r1/r2 identities without fallback", () => {
    const created = createInitialMapStateV7(setup);
    if (!created.ok) throw new Error(created.error.code);
    const replay = createReplayV7(setup);
    const save = createSaveEnvelopeV7(
      { state: created.state, replay },
      "2026-09-06T12:00:00.000Z",
    );

    expect(
      parseReplayFileV7({
        ...replay,
        setup: { ...setup, rulesetId: "pulp-wars-poc-unknown" },
      }),
    ).toEqual({ kind: "INVALID_REPLAY" });
    expect(
      parseSaveV7(
        JSON.stringify({
          ...save,
          setup: { ...setup, rulesetId: "pulp-wars-poc-7" },
        }),
      ),
    ).toMatchObject({ kind: "CORRUPT" });
    expect(
      parseSaveV7(
        JSON.stringify({
          ...save,
          state: {
            ...save.state,
            players: save.state.players.map((player, index) =>
              index === 0
                ? { ...player, factionTreeId: "ORIGINAL_BASELINE_V2" }
                : player,
            ),
          },
        }),
      ),
    ).toMatchObject({ kind: "CORRUPT" });
    expect(
      parseSaveV7(
        JSON.stringify({ ...save, rulesetId: "pulp-wars-poc-unknown" }),
      ),
    ).toMatchObject({ kind: "INCOMPATIBLE" });
  });

  it("rejects unknown fields, malformed checkpoints, hash drift, and rejected command execution", () => {
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
      commands: [
        { kind: "MOVE", unitId: created.state.units[0]?.id, path: [] },
      ],
    } as const;
    expect(() => runReplayV7(withCommand)).toThrowError("COMMAND_REJECTED");
    try {
      runReplayV7(withCommand);
    } catch (error) {
      expect((error as { code: string }).code).toBe("COMMAND_REJECTED");
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
