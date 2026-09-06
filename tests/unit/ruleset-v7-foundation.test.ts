import { describe, expect, it } from "vitest";
import {
  BLACKOUT_PHASE_ORDER_V7,
  COMMAND_KIND_ORDER_V7,
  DOMAIN_EVENT_KIND_ORDER_V7,
  FACTION_IDS_V7,
  FACTION_TREE_IDS_V7,
  IMPROVEMENT_IDS_V7,
  PLAYER_EVENT_KIND_ORDER_V7,
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
  type GameStateV7,
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

describe("ruleset-7 deterministic foundation", () => {
  it("freezes the exact v7 IDs and semantic orders", () => {
    expect(RULESET_7_ID).toBe("pulp-wars-poc-7");
    expect(FACTION_IDS_V7).toEqual(["ORIGINAL"]);
    expect(FACTION_TREE_IDS_V7).toEqual(["ORIGINAL_BASELINE_V2"]);
    expect(IMPROVEMENT_IDS_V7).toHaveLength(12);
    expect(UNIT_ROLE_IDS_V7).toEqual([
      "FIGHTER",
      "SCOUT",
      "ENVOY",
      "MARKSMAN",
      "GUARD",
      "RAIDER",
      "MEDIC",
      "CATAPULT",
      "SABOTEUR",
      "HEAVY",
      "LANCER",
      "BREACHER",
      "JUGGERNAUT",
    ]);
    expect(TECHNOLOGY_IDS_V7).toHaveLength(25);
    expect(COMMAND_KIND_ORDER_V7).toHaveLength(35);
    expect(DOMAIN_EVENT_KIND_ORDER_V7).toHaveLength(48);
    expect(PLAYER_EVENT_KIND_ORDER_V7.slice(-3)).toEqual([
      "UNIT_REVEALED",
      "UNIT_CONCEALED",
      "DEFECTION_ENDPOINT_STATUS",
    ]);
    expect(BLACKOUT_PHASE_ORDER_V7).toEqual(["PENDING", "ACTIVE", "RECOVERY"]);
    for (const order of [
      FACTION_IDS_V7,
      FACTION_TREE_IDS_V7,
      IMPROVEMENT_IDS_V7,
      UNIT_ROLE_IDS_V7,
      TECHNOLOGY_IDS_V7,
      COMMAND_KIND_ORDER_V7,
      DOMAIN_EVENT_KIND_ORDER_V7,
      PLAYER_EVENT_KIND_ORDER_V7,
    ])
      expect(Object.isFrozen(order)).toBe(true);
  });

  it("accepts only exact dense all-Original setup", () => {
    expect(parseMatchSetupV7(setup)).toEqual(setup);
    expect(
      parseMatchSetupV7({ ...setup, factions: ["ORIGINAL", "CANDY"] }),
    ).toBeNull();
    expect(
      parseMatchSetupV7({ ...setup, rulesetId: "pulp-wars-poc-6" }),
    ).toBeNull();
    expect(parseMatchSetupV7({ ...setup, scenario: "DEMO" })).toBeNull();
    expect(parseMatchSetupV7({ ...setup, width: 11, height: 14 })).toBeNull();
    const sparse = ["ORIGINAL", "ORIGINAL"] as unknown[];
    Reflect.deleteProperty(sparse, "1");
    expect(parseMatchSetupV7({ ...setup, factions: sparse })).toBeNull();
  });

  it("parses every new command arm with exact keys and rejects v6 arms", () => {
    for (const command of [
      { kind: "PURSUE", unitId: 1, path: [{ x: 2, y: 3 }] },
      { kind: "OFFER_DEFECTION", unitId: 1, targetUnitId: 2, homeCityId: 3 },
      { kind: "BLACKOUT_CITY", unitId: 1, cityId: 3 },
      { kind: "BUILD_BARRACKS", at: { x: 2, y: 3 } },
      { kind: "DISBAND", unitId: 1 },
      { kind: "END_PURSUIT", unitId: 1 },
    ])
      expect(parseCommandV7(command).ok).toBe(true);
    expect(
      parseCommandV7({
        kind: "ATTACK",
        unitId: 1,
        target: { kind: "UNIT", unitId: 2 },
      }).ok,
    ).toBe(false);
    expect(
      parseCommandV7({ kind: "KAMIKAZE_ROLL", unitId: 1, direction: "NORTH" })
        .ok,
    ).toBe(false);
    expect(
      parseCommandV7({ kind: "PURSUE", unitId: 1, path: [], extra: true }).ok,
    ).toBe(false);
    expect(
      parseCommandEnvelopeV7({
        format: "pulp-wars-command",
        version: 7,
        command: { kind: "END_TURN" },
      }),
    ).toMatchObject({ ok: true });
    expect(
      parseCommandEnvelopeV7({
        format: "pulp-wars-command",
        version: 6,
        command: { kind: "END_TURN" },
      }),
    ).toMatchObject({ ok: false });
  });

  it("strictly parses canonical v7 event envelopes", () => {
    expect(
      parseEventEnvelopeV7({
        format: "pulp-wars-events",
        version: 7,
        commandIndex: 4,
        events: [
          {
            kind: "PURSUIT_OPENED",
            unitId: 3,
            attacksUsed: 1,
            attacksRemaining: 2,
          },
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
          {
            kind: "DEFECTION_ENDPOINT_STATUS",
            unitId: 9,
            phase: "ARMED",
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

  it("rejects malformed authoritative timers, occupancy, IDs, and cross-references", () => {
    const created = createInitialMapStateV7(setup);
    if (!created.ok) throw new Error(created.error.code);
    const state = created.state;
    expect(parseGameStateV7(state)).toEqual(state);
    expect(parseGameStateV7({ ...state, schemaVersion: 6 })).toBeNull();
    expect(
      parseGameStateV7({
        ...state,
        defectionMarks: [
          {
            id: state.nextEntityId,
            sourceUnitId: state.units[0]?.id,
            targetUnitId: state.units[1]?.id,
            initiatingPlayerId: state.players[0]?.id,
            recordedTargetOwnerId: state.players[1]?.id,
            reservedHomeCityId: state.cities[0]?.id,
            offeredAtCommandIndex: 0,
            phase: "ARMED",
          },
        ],
      }),
    ).toBeNull();
    const first = state.units[0];
    if (first === undefined) throw new Error("fixture unit missing");
    expect(
      parseGameStateV7({
        ...state,
        units: [
          {
            ...first,
            activation: {
              ...first.activation,
              pursuitPhase: "PURSUIT_READY",
              attacksUsed: 1,
            },
          },
          ...state.units.slice(1),
        ],
      }),
    ).toBeNull();
    expect(
      parseGameStateV7({
        ...state,
        units: [first, { ...state.units[1], at: first.at }],
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
                  sourceOwnerId: state.players[1]?.id,
                  suppressedCoins: 4,
                },
              }
            : city,
        ),
      }),
    ).toBeNull();
    const sparseUnits = [...state.units] as unknown[];
    Reflect.deleteProperty(sparseUnits, "0");
    expect(
      parseGameStateV7({
        ...state,
        units: sparseUnits,
      } as unknown as GameStateV7),
    ).toBeNull();
  });

  it("round-trips the complete serialized gridlock-breaker state", () => {
    const created = createInitialMapStateV7(setup);
    if (!created.ok) throw new Error(created.error.code);
    const state = created.state;
    const human = state.players[0];
    const opponent = state.players[1];
    const humanCity = state.cities.find((city) => city.ownerId === human?.id);
    const opponentCity = state.cities.find(
      (city) => city.ownerId === opponent?.id,
    );
    const humanFighter = state.units.find((unit) => unit.ownerId === human?.id);
    const targetFighter = state.units.find(
      (unit) => unit.ownerId === opponent?.id,
    );
    if (
      human === undefined ||
      opponent === undefined ||
      humanCity === undefined ||
      opponentCity === undefined ||
      humanFighter === undefined ||
      targetFighter === undefined
    )
      throw new Error("initial fixture incomplete");
    const blocked = new Set(
      state.treasureChests.map((at) => `${at.y},${at.x}`),
    );
    const pair = state.board.tiles.find((tile) => {
      const next =
        state.board.tiles[tile.at.y * state.board.width + tile.at.x + 1];
      return (
        next !== undefined &&
        next.at.y === tile.at.y &&
        tile.site === null &&
        next.site === null &&
        !blocked.has(`${tile.at.y},${tile.at.x}`) &&
        !blocked.has(`${next.at.y},${next.at.x}`)
      );
    });
    if (pair === undefined) throw new Error("adjacent fixture pair missing");
    const pairTarget =
      state.board.tiles[pair.at.y * state.board.width + pair.at.x + 1];
    const barracksTile = state.board.tiles.find(
      (tile) =>
        tile.territoryCityId === humanCity.id &&
        tile.site === null &&
        tile.resource === null &&
        tile.improvement === null &&
        tile.at.x !== pair.at.x &&
        tile.at.y !== pair.at.y,
    );
    const saboteurTile = state.board.tiles.find(
      (tile) =>
        tile.site === null &&
        Math.max(
          Math.abs(tile.at.x - opponentCity.at.x),
          Math.abs(tile.at.y - opponentCity.at.y),
        ) === 1 &&
        !blocked.has(`${tile.at.y},${tile.at.x}`) &&
        `${tile.at.y},${tile.at.x}` !== `${pair.at.y},${pair.at.x}` &&
        `${tile.at.y},${tile.at.x}` !==
          `${pairTarget?.at.y},${pairTarget?.at.x}`,
    );
    const lancerTile = state.board.tiles.find(
      (tile) =>
        tile.site === null &&
        tile.terrain !== "MOUNTAIN" &&
        !blocked.has(`${tile.at.y},${tile.at.x}`) &&
        ![pair.at, pairTarget?.at, saboteurTile?.at].some(
          (at) => at?.x === tile.at.x && at.y === tile.at.y,
        ),
    );
    if (
      pairTarget === undefined ||
      barracksTile === undefined ||
      saboteurTile === undefined ||
      lancerTile === undefined
    )
      throw new Error("special-state fixture placement missing");
    const next = state.nextEntityId;
    const markId = next + 3;
    const special: GameStateV7 = {
      ...state,
      commandIndex: 1,
      nextEntityId: markId + 1,
      board: {
        ...state.board,
        tiles: state.board.tiles.map((tile) =>
          tile.at.x === barracksTile.at.x && tile.at.y === barracksTile.at.y
            ? { ...tile, improvement: "BARRACKS" as const }
            : tile,
        ),
      },
      players: state.players.map((player) =>
        player.id === human.id
          ? { ...player, spoilsClaimedCityIds: [opponentCity.id] }
          : player,
      ),
      cities: state.cities.map((city) =>
        city.id === opponentCity.id
          ? {
              ...city,
              blackout: {
                phase: "PENDING" as const,
                sourceUnitId: (next + 1) as typeof humanFighter.id,
                sourceOwnerId: human.id,
                plantedRound: 1,
              },
            }
          : city,
      ),
      units: [
        { ...humanFighter },
        { ...targetFighter, at: pairTarget.at },
        {
          id: next as typeof humanFighter.id,
          ownerId: human.id,
          homeCityId: humanCity.id,
          role: "ENVOY",
          at: pair.at,
          hp: 7,
          maxHp: 7,
          kills: 0,
          veteran: false,
          captureEligible: false,
          activation: {
            moved: false,
            movedPathLength: 0,
            attacked: false,
            attacksUsed: 0,
            pursuitPhase: "NONE",
            healed: false,
            recovered: false,
            captured: false,
            handled: true,
            specialActed: true,
          },
          blackoutEligibleRound: null,
        },
        {
          id: (next + 1) as typeof humanFighter.id,
          ownerId: human.id,
          homeCityId: null,
          role: "SABOTEUR",
          at: saboteurTile.at,
          hp: 10,
          maxHp: 10,
          kills: 0,
          veteran: false,
          captureEligible: false,
          activation: {
            moved: true,
            movedPathLength: 1,
            attacked: false,
            attacksUsed: 0,
            pursuitPhase: "NONE",
            healed: false,
            recovered: false,
            captured: false,
            handled: true,
            specialActed: true,
          },
          blackoutEligibleRound: 4,
        },
        {
          id: (next + 2) as typeof humanFighter.id,
          ownerId: human.id,
          homeCityId: null,
          role: "LANCER",
          at: lancerTile.at,
          hp: 12,
          maxHp: 12,
          kills: 1,
          veteran: false,
          captureEligible: false,
          activation: {
            moved: true,
            movedPathLength: 2,
            attacked: false,
            attacksUsed: 1,
            pursuitPhase: "PURSUIT_READY",
            healed: false,
            recovered: false,
            captured: false,
            handled: false,
            specialActed: false,
          },
          blackoutEligibleRound: null,
        },
      ],
      defectionMarks: [
        {
          id: markId,
          sourceUnitId: next as typeof humanFighter.id,
          targetUnitId: targetFighter.id,
          initiatingPlayerId: human.id,
          recordedTargetOwnerId: opponent.id,
          reservedHomeCityId: humanCity.id,
          offeredAtCommandIndex: 1,
          phase: "WAITING_FOR_REPLY",
        },
      ],
      saboteurExposures: [
        {
          unitId: (next + 1) as typeof humanFighter.id,
          anchorPlayerId: opponent.id,
          reason: "BLACKOUT",
          clearsAtAnchorNextEndTurn: true,
        },
      ],
    };
    expect(parseGameStateV7(special)).toEqual(special);
  });
});
