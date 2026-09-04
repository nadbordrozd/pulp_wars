import { describe, expect, it } from "vitest";
import {
  RULESET_6_ID,
  SPATIAL_ECONOMY_REVISION,
  appendReplayCommandV6,
  canonicalGameStateHashV6,
  cityId,
  canonicalHash,
  createReplayV6,
  parseGameStateV6,
  playerId,
  type GameStateV6,
  type MatchSetupV6,
} from "../../src/engine/index";
import { createSaveEnvelopeV6, parseSaveV6 } from "../../src/persistence/index";

const setup: MatchSetupV6 = {
  rulesetId: RULESET_6_ID,
  seed: 42,
  width: 11,
  height: 11,
  aiCount: 1,
  aiDifficulty: "NORMAL",
  aiMode: "RIVAL",
  humanColor: "CORAL",
  factions: ["ORIGINAL", "CANDY"],
  mapGenerationRevision: SPATIAL_ECONOMY_REVISION,
};

describe("ruleset-6 persistence schema", () => {
  it("parses canonical Coin-facing v6 state and rejects legacy state arms", () => {
    const state = stateFixture();
    expect(parseGameStateV6(state)).toEqual(state);
    expect(parseGameStateV6({ ...state, schemaVersion: 5 })).toBeNull();
    expect(parseGameStateV6({ ...state, pendingChoice: null })).toBeNull();
    expect(
      parseGameStateV6({
        ...state,
        players: state.players.map((player) => ({
          ...player,
          stars: player.coins,
        })),
      }),
    ).toBeNull();
    const city = {
      id: cityId(1),
      ownerId: state.players[0]?.id ?? playerId(1),
      at: { x: 0, y: 0 },
      level: 3,
      permanentPopulation: 0,
      economicPopulation: 0,
      population: -5,
      isCapital: true,
      expanded: false,
      rewards: [],
    } as const;
    const negative = { ...state, nextEntityId: 2, cities: [city] };
    expect(parseGameStateV6(negative)).toEqual(negative);
    expect(canonicalGameStateHashV6(negative)).toBe(canonicalHash(negative));

    const swappedControllers = {
      ...state,
      humanPlayerId: state.players[1]?.id ?? playerId(2),
      players: state.players.map((player, index) => ({
        ...player,
        controller: index === 0 ? ("AI" as const) : ("HUMAN" as const),
      })),
    };
    expect(parseGameStateV6(swappedControllers)).toBeNull();

    const wrongHumanColor = {
      ...state,
      players: state.players.map((player, index) =>
        index === 0 ? { ...player, color: "GOLD" as const } : player,
      ),
    };
    expect(parseGameStateV6(wrongHumanColor)).toBeNull();
  });

  it("appends only fully parsed replay/state/setup boundaries", () => {
    const state = { ...stateFixture(), commandIndex: 1 };
    const replay = createReplayV6(setup);
    const appended = appendReplayCommandV6(replay, { kind: "END_TURN" }, state);
    expect(appended).toEqual({
      ...replay,
      commands: [{ kind: "END_TURN" }],
      checkpoints: [{ index: 1, stateHash: canonicalHash(state) }],
    });

    expect(() =>
      appendReplayCommandV6(replay, { kind: "END_TURN" }, {
        ...state,
        rulesetId: "pulp-wars-poc-5",
      } as unknown as GameStateV6),
    ).toThrowError(/INVALID_REPLAY/);

    expect(() =>
      appendReplayCommandV6(
        replay,
        { kind: "END_TURN" },
        {
          ...state,
          setup: { ...state.setup, seed: state.setup.seed + 1 },
        },
      ),
    ).toThrowError(/INVALID_REPLAY/);

    expect(() =>
      appendReplayCommandV6(
        { ...replay, version: 5 } as unknown as typeof replay,
        { kind: "END_TURN" },
        state,
      ),
    ).toThrowError(/INVALID_REPLAY/);
  });

  it("round-trips an exact v6 save and verifies its canonical hash", () => {
    const state = stateFixture();
    const envelope = createSaveEnvelopeV6(
      { state, replay: createReplayV6(setup) },
      "2026-08-30T12:00:00.000Z",
    );
    expect(envelope).toMatchObject({
      version: 6,
      rulesetId: "pulp-wars-poc-6",
      commandIndex: 0,
      stateHash: canonicalHash(state),
    });
    expect(parseSaveV6(JSON.stringify(envelope))).toEqual({
      kind: "VALID",
      save: envelope,
    });
    expect(
      parseSaveV6(
        JSON.stringify({
          ...envelope,
          stateHash: "0".repeat(64),
        }),
      ),
    ).toMatchObject({ kind: "CORRUPT" });
  });

  it("loads pre-treasure schema-6 saves as an empty chest collection without rewriting source bytes", () => {
    const state = stateFixture();
    const legacyState = Object.fromEntries(
      Object.entries(state).filter(([key]) => key !== "treasureChests"),
    );
    const current = createSaveEnvelopeV6(
      { state, replay: createReplayV6(setup) },
      "2026-08-30T12:00:00.000Z",
    );
    const legacyEnvelope = {
      ...current,
      state: legacyState,
      stateHash: canonicalHash(legacyState),
    };
    const source = JSON.stringify(legacyEnvelope);
    const parsed = parseSaveV6(source);
    expect(parsed).toMatchObject({
      kind: "VALID",
      save: { state: { treasureChests: [] } },
    });
    expect(source).toBe(JSON.stringify(legacyEnvelope));
    if (parsed.kind === "VALID") {
      expect(parsed.save.stateHash).toBe(canonicalHash(parsed.save.state));
      expect(parsed.save.stateHash).not.toBe(legacyEnvelope.stateHash);
    }
  });

  it("classifies recognized save versions 1 through 5 without touching source", () => {
    for (const version of [1, 2, 3, 4, 5]) {
      const source = JSON.stringify({
        format: "pulp-wars-save",
        version,
        opaque: "preserve me",
      });
      expect(parseSaveV6(source)).toMatchObject({ kind: "INCOMPATIBLE" });
      expect(source).toBe(
        JSON.stringify({
          format: "pulp-wars-save",
          version,
          opaque: "preserve me",
        }),
      );
    }
  });
});

function stateFixture(): GameStateV6 {
  const human = playerId(1);
  const opponent = playerId(2);
  return {
    schemaVersion: 6,
    rulesetId: RULESET_6_ID,
    setup,
    random: { algorithm: "MULBERRY32", version: 1, state: 42 },
    humanPlayerId: human,
    nextEntityId: 1,
    commandIndex: 0,
    round: 1,
    activeSeatIndex: 0,
    turnOrder: [human, opponent],
    board: {
      width: 11,
      height: 11,
      tiles: Array.from({ length: 121 }, (_value, index) => ({
        at: { x: index % 11, y: Math.floor(index / 11) },
        terrain: "GRASS" as const,
        resource: null,
        improvement: null,
        road: false,
        site: null,
        territoryCityId: null,
      })),
    },
    players: [
      {
        id: human,
        seat: 0,
        controller: "HUMAN",
        color: "CORAL",
        faction: "ORIGINAL",
        factionTreeId: "ORIGINAL_BASELINE",
        status: "ACTIVE",
        coins: 5,
        researchedTechs: ["GATHERING"],
        explored: [],
      },
      {
        id: opponent,
        seat: 1,
        controller: "AI",
        color: "TEAL",
        faction: "CANDY",
        factionTreeId: "CANDY_BASELINE_V1",
        status: "ACTIVE",
        coins: 5,
        researchedTechs: ["GATHERING"],
        explored: [],
      },
    ],
    cities: [],
    populationContributions: [],
    units: [],
    chocolateWalls: [],
    treasureChests: [],
    pendingChoices: [],
    outcome: null,
  };
}
