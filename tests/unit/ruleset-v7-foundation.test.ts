import { describe, expect, it } from "vitest";
import {
  ACHIEVEMENT_IDS_V7,
  BLACKOUT_PHASE_ORDER_V7,
  COMMAND_KIND_ORDER_V7,
  DOMAIN_EVENT_KIND_ORDER_V7,
  FACTION_IDS_V7,
  FACTION_TREE_IDS_V7,
  IMPROVEMENT_IDS_V7,
  PLAYER_EVENT_KIND_ORDER_V7,
  RESOURCE_IDS_V7,
  RULESET_7_ID,
  TECHNOLOGY_IDS_V7,
  UNIT_ROLE_IDS_V7,
  createInitialMapStateV7,
  parseCommandEnvelopeV7,
  parseCommandV7,
  parseEventEnvelopeV7,
  parseGameStateV7,
  parseMatchSetupV7,
  parsePlayerEventEnvelopeV7,
  type MatchSetupV7,
} from "../../src/engine/index";

const setup: MatchSetupV7 = {
  rulesetId: RULESET_7_ID,
  seed: 0,
  width: 11,
  height: 11,
  aiCount: 1,
  aiDifficulty: "NORMAL",
  aiMode: "RIVAL",
  humanColor: "CORAL",
  factions: ["ORIGINAL", "ORIGINAL"],
  mapGenerationRevision: "SPATIAL_ECONOMY",
};

describe("ruleset-7 revision-3 deterministic foundation", () => {
  it("freezes the exact identity and registries", () => {
    expect(RULESET_7_ID).toBe("pulp-wars-poc-7r3");
    expect(FACTION_IDS_V7).toEqual(["ORIGINAL"]);
    expect(FACTION_TREE_IDS_V7).toEqual(["ORIGINAL_BASELINE_V4"]);
    expect(RESOURCE_IDS_V7).toEqual(["FRUIT", "FERTILE_GROUND", "GAME"]);
    expect(IMPROVEMENT_IDS_V7).toEqual([
      "FARM",
      "LUMBER_CAMP",
      "MINE",
      "WINDMILL",
      "SAWMILL",
      "FORGE",
      "WORKSHOP",
      "GRAND_WORKS",
      "MARKET",
      "MONUMENT",
    ]);
    expect(ACHIEVEMENT_IDS_V7).toEqual(["ENGINEER", "MUSTER"]);
    expect(UNIT_ROLE_IDS_V7).toEqual([
      "FIGHTER",
      "SCOUT",
      "MARKSMAN",
      "GUARD",
      "RAIDER",
      "MEDIC",
      "CATAPULT",
      "SABOTEUR",
      "HEAVY",
      "HORSE_ARCHER",
      "BREACHER",
      "JUGGERNAUT",
    ]);
    expect(TECHNOLOGY_IDS_V7).toHaveLength(21);
    expect(COMMAND_KIND_ORDER_V7).toHaveLength(30);
    expect(DOMAIN_EVENT_KIND_ORDER_V7).toHaveLength(44);
    expect(PLAYER_EVENT_KIND_ORDER_V7.slice(-2)).toEqual([
      "UNIT_REVEALED",
      "UNIT_CONCEALED",
    ]);
    expect(BLACKOUT_PHASE_ORDER_V7).toEqual(["PENDING", "ACTIVE", "RECOVERY"]);
    for (const order of [
      FACTION_IDS_V7,
      FACTION_TREE_IDS_V7,
      RESOURCE_IDS_V7,
      IMPROVEMENT_IDS_V7,
      ACHIEVEMENT_IDS_V7,
      UNIT_ROLE_IDS_V7,
      TECHNOLOGY_IDS_V7,
      COMMAND_KIND_ORDER_V7,
      DOMAIN_EVENT_KIND_ORDER_V7,
      PLAYER_EVENT_KIND_ORDER_V7,
    ])
      expect(Object.isFrozen(order)).toBe(true);
  });

  it("accepts only exact dense all-Original revision-3 setup", () => {
    expect(parseMatchSetupV7(setup)).toEqual(setup);
    expect(
      parseMatchSetupV7({ ...setup, factions: ["ORIGINAL", "CANDY"] }),
    ).toBeNull();
    for (const rulesetId of [
      "pulp-wars-poc-6",
      "pulp-wars-poc-7",
      "pulp-wars-poc-7r2",
    ])
      expect(parseMatchSetupV7({ ...setup, rulesetId })).toBeNull();
    expect(parseMatchSetupV7({ ...setup, scenario: "DEMO" })).toBeNull();
    const sparse = ["ORIGINAL", "ORIGINAL"] as unknown[];
    Reflect.deleteProperty(sparse, "1");
    expect(parseMatchSetupV7({ ...setup, factions: sparse })).toBeNull();
  });

  it("parses retained/new commands exactly and rejects removed r2 arms", () => {
    for (const command of [
      { kind: "ATTACK", unitId: 1, targetUnitId: 2 },
      { kind: "BLACKOUT_CITY", unitId: 1, cityId: 3 },
      { kind: "BUILD_MINE", at: { x: 2, y: 3 } },
      { kind: "BUILD_MONUMENT", achievement: "ENGINEER", at: { x: 2, y: 3 } },
      { kind: "DISBAND", unitId: 1 },
    ])
      expect(parseCommandV7(command).ok).toBe(true);
    for (const command of [
      { kind: "PURSUE", unitId: 1, path: [{ x: 2, y: 3 }] },
      { kind: "END_PURSUIT", unitId: 1 },
      { kind: "OFFER_DEFECTION", unitId: 1, targetUnitId: 2, homeCityId: 3 },
      { kind: "BUILD_BARRACKS", at: { x: 2, y: 3 } },
      { kind: "BUILD_QUARRY", at: { x: 2, y: 3 } },
    ])
      expect(parseCommandV7(command).ok).toBe(false);
    expect(
      parseCommandEnvelopeV7({
        format: "pulp-wars-command",
        version: 7,
        command: { kind: "END_TURN" },
      }),
    ).toMatchObject({ ok: true });
  });

  it("strictly parses canonical combat and Blackout event envelopes", () => {
    expect(
      parseEventEnvelopeV7({
        format: "pulp-wars-events",
        version: 7,
        commandIndex: 4,
        events: [
          {
            kind: "BLACKOUT_PLANTED",
            cityId: 1,
            sourceUnitId: 2,
            sourceOwnerId: 1,
            targetOwnerId: 2,
            actionRound: 4,
            eligibleRound: 7,
          },
          { kind: "SPOILS_AWARDED", playerId: 1, cityId: 4, coins: 2 },
        ],
      }),
    ).toMatchObject({ ok: true });
    expect(
      parsePlayerEventEnvelopeV7({
        format: "pulp-wars-player-events",
        version: 7,
        viewerId: 1,
        commandIndex: 4,
        events: [
          {
            kind: "UNIT_REVEALED",
            unitId: 9,
            at: { x: 2, y: 3 },
            reason: "DETECTED",
          },
        ],
      }),
    ).toMatchObject({ ok: true });
    expect(
      parseEventEnvelopeV7({
        format: "pulp-wars-events",
        version: 7,
        commandIndex: 4,
        events: [
          {
            kind: "BLACKOUT_PLANTED",
            cityId: 1,
            sourceUnitId: 2,
            sourceOwnerId: 1,
            targetOwnerId: 2,
            actionRound: 4,
            eligibleRound: 8,
          },
        ],
      }),
    ).toMatchObject({ ok: false });
    expect(
      parseEventEnvelopeV7({
        format: "pulp-wars-events",
        version: 7,
        commandIndex: 4,
        events: [
          {
            kind: "SPOILS_AWARDED",
            playerId: 1,
            cityId: 4,
            coins: 2,
            hidden: true,
          },
        ],
      }),
    ).toMatchObject({ ok: false });
  });

  it("rejects obsolete identity and removed state machinery", () => {
    const created = createInitialMapStateV7(setup);
    if (!created.ok) throw new Error(created.error.code);
    const state = created.state;
    expect(parseGameStateV7(state)).toEqual(state);
    expect(
      parseGameStateV7({ ...state, rulesetId: "pulp-wars-poc-7r2" }),
    ).toBeNull();
    expect(parseGameStateV7({ ...state, defectionMarks: [] })).toBeNull();
    expect(
      parseGameStateV7({
        ...state,
        players: state.players.map((player, index) =>
          index === 0
            ? { ...player, factionTreeId: "ORIGINAL_BASELINE_V3" }
            : player,
        ),
      }),
    ).toBeNull();
    expect(
      parseGameStateV7({
        ...state,
        players: state.players.map((player, index) =>
          index === 0
            ? { ...player, factionTreeId: "ORIGINAL_UNKNOWN" }
            : player,
        ),
      }),
    ).toBeNull();
    const first = required(state.units[0], "first unit missing");
    expect(
      parseGameStateV7({
        ...state,
        units: [
          {
            ...first,
            activation: { ...first.activation, pursuitPhase: "NONE" },
          },
          ...state.units.slice(1),
        ],
      }),
    ).toBeNull();
    expect(
      parseGameStateV7({
        ...state,
        units: [
          first,
          { ...required(state.units[1], "second unit missing"), at: first.at },
        ],
      }),
    ).toBeNull();
    expect(
      parseGameStateV7({
        ...state,
        cities: state.cities.map((city, index) =>
          index === 0
            ? {
                ...city,
                blackout: {
                  phase: "ACTIVE",
                  sourceOwnerId: required(state.players[1], "source missing")
                    .id,
                  suppressedCoins: 4,
                },
              }
            : city,
        ),
      }),
    ).toBeNull();
    const sparseUnits = [...state.units] as unknown[];
    Reflect.deleteProperty(sparseUnits, "0");
    expect(parseGameStateV7({ ...state, units: sparseUnits })).toBeNull();
  });
});

function required<T>(value: T | undefined, message: string): T {
  if (value === undefined) throw new Error(message);
  return value;
}
