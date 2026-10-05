import { describe, expect, it } from "vitest";
import {
  ACHIEVEMENT_IDS_V7,
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
  // pulp_wars-w5j.1: every seat plays a different faction.
  factions: ["ORIGINAL", "UNDEAD"],
  mapType: "DRY_LAND",
  mapGenerationRevision: "REGIONAL_BIOMES_NAVAL_V3",
  curiosities: false,
};

describe("ruleset-7 revision-8 deterministic foundation", () => {
  it("freezes the exact identity and registries", () => {
    expect(RULESET_7_ID).toBe("pulp-wars-poc-7r40");
    expect(FACTION_IDS_V7).toEqual([
      "ORIGINAL",
      "UNDEAD",
      "GOBLIN",
      "DINOSAUR",
      "MARTIAN",
      "ICE_FOLK",
      // The Dwarf revision (`pulp_wars-78i.3`).
      "DWARF",
      "CANDY",
    ]);
    expect(FACTION_TREE_IDS_V7).toEqual([
      "ORIGINAL_BASELINE_V5",
      "UNDEAD_BASELINE_V1",
      "GOBLIN_BASELINE_V1",
      "DINOSAUR_BASELINE_V1",
      "MARTIAN_BASELINE_V1",
      "ICE_FOLK_BASELINE_V1",
      "DWARF_BASELINE_V1",
      "CANDY_BASELINE_V1",
    ]);
    expect(RESOURCE_IDS_V7).toEqual([
      "FRUIT",
      "FERTILE_GROUND",
      "GAME",
      "ORE",
      "FISH",
      "PEARLS",
    ]);
    expect(IMPROVEMENT_IDS_V7).toEqual([
      "FARM",
      "LUMBER_CAMP",
      "MINE",
      "WINDMILL",
      "SAWMILL",
      "FORGE",
      "WORKSHOP",
      "MARKET",
      "MONUMENT",
      "PORT",
      "SHIPYARD",
    ]);
    expect(ACHIEVEMENT_IDS_V7).toEqual([
      "EXPLORER",
      "ENGINEER",
      "MUSTER",
      // Revision 21.
      "CONQUEROR",
      "LAND_BARON",
      "SEA_DOG",
      "SLAYER",
    ]);
    expect(UNIT_ROLE_IDS_V7).toEqual([
      "FIGHTER",
      "RAIDER",
      "MARKSMAN",
      "GUARD",
      "CAPTAIN",
      "CATAPULT",
      "KNIGHT",
      "JUGGERNAUT",
      "PATROL_BOAT",
      "BATTLESHIP",
    ]);
    expect(TECHNOLOGY_IDS_V7).toHaveLength(23);
    // Revision 20 removes STAMPEDE (46 -> 45 command kinds). The Martian
    // revision adds BEAM_DOWN, MIND_CONTROL, and TRACTOR_BEAM (48) and four
    // event kinds (72 -> 76); the Ice Folk revision THROW_BOLAS and
    // COLD_SNAP (50) and UNITS_CHILLED (77); the Dwarf revision TUNNEL,
    // BOMB_RUN, and ASSEMBLE (53) and four event kinds (81).
    expect(COMMAND_KIND_ORDER_V7).toHaveLength(56);
    expect(COMMAND_KIND_ORDER_V7).not.toContain("STAMPEDE");
    // The Mind Control revision adds UNIT_RELEASED (82 event kinds).
    // Map curiosities (pulp_wars-737.2) add FOUNTAIN_HEALED, SHRINE_CLAIMED,
    // and WRECK_SALVAGED (85 event kinds); the Giant Spider (pulp_wars-737.3)
    // MONSTER_REGENERATED, NEUTRAL_TURN_STARTED, NEUTRAL_TURN_ENDED, and
    // MONSTER_BOUNTY_AWARDED (89); the Candy revision seven more (96).
    expect(DOMAIN_EVENT_KIND_ORDER_V7).toHaveLength(96);
    // Revision 19 inserts HATCH after KABOOM (and, until revision 20,
    // STAMPEDE between them), LAY_EGG after TRAIN_NAVAL, EGG_LAID and
    // EGG_HATCHED after NAVAL_UNIT_TRAINED, and UNIT_GREW after
    // UNIT_PROMOTED (Dinosaur spec section 10).
    expect(
      COMMAND_KIND_ORDER_V7.slice(
        COMMAND_KIND_ORDER_V7.indexOf("KABOOM"),
        COMMAND_KIND_ORDER_V7.indexOf("KABOOM") + 8,
      ),
    ).toEqual([
      "KABOOM",
      "HATCH",
      // The Martian revision inserts its three commands right after HATCH.
      "BEAM_DOWN",
      "MIND_CONTROL",
      "TRACTOR_BEAM",
      // The Ice Folk revision inserts its two right after TRACTOR_BEAM.
      "THROW_BOLAS",
      "COLD_SNAP",
      "TUNNEL",
    ]);
    expect(
      COMMAND_KIND_ORDER_V7.slice(
        COMMAND_KIND_ORDER_V7.indexOf("TRAIN_NAVAL"),
        COMMAND_KIND_ORDER_V7.indexOf("TRAIN_NAVAL") + 3,
      ),
    ).toEqual(["TRAIN_NAVAL", "LAY_EGG", "BUILD_FIELD_DEFENSE"]);
    expect(
      DOMAIN_EVENT_KIND_ORDER_V7.slice(
        DOMAIN_EVENT_KIND_ORDER_V7.indexOf("NAVAL_UNIT_TRAINED"),
        DOMAIN_EVENT_KIND_ORDER_V7.indexOf("NAVAL_UNIT_TRAINED") + 4,
      ),
    ).toEqual([
      "NAVAL_UNIT_TRAINED",
      "EGG_LAID",
      "EGG_HATCHED",
      "UNIT_EMBARKED",
    ]);
    expect(
      DOMAIN_EVENT_KIND_ORDER_V7.slice(
        DOMAIN_EVENT_KIND_ORDER_V7.indexOf("UNIT_PROMOTED"),
        DOMAIN_EVENT_KIND_ORDER_V7.indexOf("UNIT_PROMOTED") + 3,
      ),
    ).toEqual(["UNIT_PROMOTED", "UNIT_GREW", "UNIT_DIED"]);
    // Revision 17 inserts KABOOM after WAIL and EXPLOSION_RESOLVED after
    // WAIL_RESOLVED (Goblin spec section 9).
    expect(
      COMMAND_KIND_ORDER_V7.slice(
        COMMAND_KIND_ORDER_V7.indexOf("WAIL"),
        COMMAND_KIND_ORDER_V7.indexOf("WAIL") + 3,
      ),
    ).toEqual(["WAIL", "KABOOM", "HATCH"]);
    expect(
      DOMAIN_EVENT_KIND_ORDER_V7.slice(
        DOMAIN_EVENT_KIND_ORDER_V7.indexOf("WAIL_RESOLVED"),
        DOMAIN_EVENT_KIND_ORDER_V7.indexOf("WAIL_RESOLVED") + 3,
      ),
    ).toEqual(["WAIL_RESOLVED", "EXPLOSION_RESOLVED", "IMPROVEMENT_PILLAGED"]);
    // Revision 14 inserts the Start Turn Plague events after TURN_STARTED;
    // revision 15 adds PLAGUE_EXPIRED after PLAGUE_SPREAD; revision 17 adds
    // Troll regeneration after Windmill healing; the Martian revision adds
    // the Shield recharge after it; map curiosities (`pulp_wars-737.2`) add
    // the Fountain heal between Windmill healing and Troll regeneration,
    // and the Giant Spider (`pulp_wars-737.3`) its regeneration after it.
    expect(DOMAIN_EVENT_KIND_ORDER_V7.slice(0, 10)).toEqual([
      "TURN_STARTED",
      "PLAGUE_DAMAGED",
      "PLAGUE_SPREAD",
      "PLAGUE_EXPIRED",
      "WINDMILL_HEALING_RESOLVED",
      "FOUNTAIN_HEALED",
      "UNITS_REGENERATED",
      "MONSTER_REGENERATED",
      "SHIELDS_RECHARGED",
      "INCOME_AWARDED",
    ]);
    expect(PLAYER_EVENT_KIND_ORDER_V7.slice(-3)).toEqual([
      "COMBAT_SPLASH_DAMAGE",
      "UNIT_REVEALED",
      "UNIT_CONCEALED",
    ]);
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

  it("accepts only exact dense setups with registered factions", () => {
    expect(parseMatchSetupV7(setup)).toEqual(setup);
    expect(
      parseMatchSetupV7({ ...setup, factions: ["ORIGINAL", "NOT_A_FACTION"] }),
    ).toBeNull();
    // pulp_wars-w5j.1: a repeated faction is refused (DUPLICATE_FACTION).
    expect(
      parseMatchSetupV7({ ...setup, factions: ["ORIGINAL", "ORIGINAL"] }),
    ).toBeNull();
    for (const rulesetId of [
      "pulp-wars-poc-6",
      "pulp-wars-poc-7",
      "pulp-wars-poc-7r2",
      "pulp-wars-poc-7r3",
      "pulp-wars-poc-7r12",
    ])
      expect(parseMatchSetupV7({ ...setup, rulesetId })).toBeNull();
    expect(parseMatchSetupV7({ ...setup, scenario: "DEMO" })).toBeNull();
    const sparse = ["ORIGINAL", "UNDEAD"] as unknown[];
    Reflect.deleteProperty(sparse, "1");
    expect(parseMatchSetupV7({ ...setup, factions: sparse })).toBeNull();
  });

  it("parses retained/new commands exactly and rejects removed r2 arms", () => {
    for (const command of [
      { kind: "ATTACK", unitId: 1, targetUnitId: 2 },
      { kind: "BUILD_FIELD_DEFENSE", unitId: 1 },
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

  it("strictly parses canonical current event envelopes", () => {
    expect(
      parseEventEnvelopeV7({
        format: "pulp-wars-events",
        version: 7,
        commandIndex: 4,
        events: [
          {
            kind: "FIELD_DEFENSE_BUILT",
            playerId: 1,
            unitId: 2,
            at: { x: 2, y: 3 },
            cost: 3,
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
