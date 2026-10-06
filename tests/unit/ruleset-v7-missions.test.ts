import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  MISSION_REGISTRY_V7,
  MissionBuildErrorV7,
  ORIGINAL_BASELINE_V5_TREE,
  FACTION_IDS_V7,
  RULESET_7_ID,
  appendReplayCommandV7,
  applyCommandV7,
  buildMissionStateV7,
  canonicalHash,
  canonicalJson,
  createInitialMapStateV7,
  createPlayableGameV7,
  createReplayV7,
  effectiveRoleRuleV7,
  factionTreeV7,
  forbiddenTechnologiesV7,
  generateInitialMapV7,
  generateInitialMapWithVillageCountV7,
  missionByIdV7,
  missionDefinitionV7,
  missionMatchSetupV7,
  missionSeatFactionsV7,
  parseGameStateV7,
  parseMatchSetupV7,
  parseReplayFileV7,
  queryPlayerCommandsV7,
  queryTechnologyTreeV7,
  randomState,
  runReplayV7,
  validateMatchSetupV7,
  validateMissionDefinitionV7,
  type FactionIdV7,
  type GameStateV7,
  type MatchSetupV7,
  type MissionDefinitionV7,
  type TechnologyIdV7,
} from "../../src/engine/index";
import { runAiMatchV7 } from "../../src/headless/v7";
import {
  STALE_MISSION_DIAGNOSTIC_V7,
  createSaveEnvelopeV7,
  parseSaveV7,
} from "../../src/persistence/v7";
import { browserSetupV7 } from "../fixtures/v7-builders";

// Mission setups (`pulp_wars-68k.2`, docs/product/CAMPAIGN.md sections 2 and
// 7.2): the registry, the authored-map builder, the MISSION setup and
// UNKNOWN_MISSION, forbidden technologies (Dry Land unchanged), the pinned
// initial-state hash per mission revision, saves, replays, the stale-mission
// diagnostic, and the headless `--mission` flag.

// The naval branch (`pulp_wars-5ti.2`): five technologies.
const NAVAL: readonly TechnologyIdV7[] = [
  "SHORECRAFT",
  "NAVIGATION",
  "NAVAL_ENGINEERING",
  "SEAMANSHIP",
  "SUBMERSIBLES",
];

/**
 * The pinned initial state of every registered mission revision and faction
 * choice. The hash leaves out the ruleset ID (an identity bump alone does
 * not change a mission), so a failure here means the built state changed:
 * a mission edit must bump that mission's `revision` and add its new pin
 * (old saves of the mission are then refused as stale); a rule or builder
 * change that alters a mission's state re-pins it (its identity bump
 * already invalidates saves).
 */
const PINNED_MISSION_HASHES: Readonly<Record<string, string>> = {
  // Re-pinned by map curiosities (`pulp_wars-737.2`): the setup's
  // `curiosities: false` and the empty `curiosities` list.
  "TEST_GROUNDS@1:ORIGINAL":
    "cdd43baf94ec2b7c8961a1b0732a381b281e6ea080ac79f91942c0eaf6b634aa",
  "TEST_GROUNDS@1:GOBLIN":
    "ed51a42b3e6e2a758ff872658f2184685002d92cbe761958ee4a1914dd91c9bc",
  // The AI-directive fixtures (`pulp_wars-68k.3`).
  "TEST_RUSH@1:ORIGINAL":
    "e441193ea8d2ba39b48b7e6bfe826898d8f9cf51722b2a9b890a3f17e271396c",
  "TEST_HOLD@1:ORIGINAL":
    "63f8feb4d5d7e1cb313b1c2bf4a09bee259ef73727773fdce351671ac4ed5925",
  "TEST_GUARD@1:ORIGINAL":
    "75569e71228d50c8bdf4977e655316676c8f0b626a657b8c6c00bf5cefc31a50",
  // Chapter One (`pulp_wars-68k.4`).
  "FRONTIER_1@1:ORIGINAL":
    "9030c7d3187c9c2faa38d3db36096dad1f2424420417667a4ca0916a00d74df6",
  "FRONTIER_2@1:ORIGINAL":
    "521f989c0cf7c0513e6c506103d7a5b34b2cb0c23ee5e61b9e86a714605ab76d",
  "FRONTIER_3@1:GOBLIN":
    "88df5acb386704a039494aa57ed41a63b3e03ece60479bcac595853b867b4f94",
  // Revision 2 (`pulp_wars-68k.6`): Sawmilling forbidden, two starting siege
  // units for you, a Skeleton in the Lich's place.
  "FRONTIER_4@2:ORIGINAL":
    "d4f54e0518201630107bb31217a250be10b4f48b236470454be5679d2538e1cb",
  "FRONTIER_4@2:GOBLIN":
    "bd8061605fc50d4ef4f8450993dbf9cacade241949b9d1644874828f0c42adfe",
  // The siege fixture of the Normal AI (`pulp_wars-68k.6`).
  "TEST_NECK@1:ORIGINAL":
    "12888fadf662936bf1658b22795874f9ec6d27caa67d6dcee32a8fe4fa5083e4",
  // The Human tuning labs (`pulp_wars-w49.3`, tuning 4).
  "LAB_SIEGE@1:ORIGINAL":
    "4dfd821eba726c3103d795c00fb6b02b8048e7904e1d216f4d26d9917a122466",
  // Tuning 5 (`pulp_wars-w49.4`): revision 2 of both, with Swordsmen.
  "LAB_BACKLINE@2:ORIGINAL":
    "2975321dbfb42083e68681f31ed09217232c4856c4b43d5feef85acd5ce1aef2",
  "LAB_LATE@2:ORIGINAL":
    "9aec749baf81daae59ec354bc9d322dfe1e91c4dcf00406ad02c106e3881b1ca",
  // Tuning 6 (`pulp_wars-w49.6`): numbers against a prepared line, one
  // fixture per attacking faction (the player is Human in each).
  "LAB_BREAKTHROUGH@1:ORIGINAL":
    "cc654d9551cb311b7df84efa0145ccc1365d8464fac195d73467ddf5575be4c9",
  "LAB_BREAKTHROUGH_GOBLIN@1:ORIGINAL":
    "2ef1db85daef0b3494d163f54e2525d767384c15823b76b32835754027280a6c",
  "LAB_BREAKTHROUGH_UNDEAD@1:ORIGINAL":
    "c7e71865750d1d0b1479577c359bf617b79beacb7bc6abce578475c89c3628e5",
};

/**
 * The map revision the pins were taken at. The village density
 * (`pulp_wars-ykw.2`) renamed the generator a setup names to
 * `REGIONAL_BIOMES_NAVAL_V3`; a mission board is authored, not generated,
 * so like the ruleset ID the name alone changes no mission and the pins
 * keep hashing the name they were taken with.
 */
const PINNED_MAP_GENERATION_REVISION = "REGIONAL_BIOMES_NAVAL_V2";

function missionStateHash(state: GameStateV7): string {
  // The Giant Spider (`pulp_wars-737.3`) added the `monsters` list, always
  // empty on a mission board, so the pins leave it out.
  // The Martian balance round (`pulp_wars-1wy.3`) added the per-turn lists
  // `beamedThisTurn` and `tractorUsedThisTurn`, empty in every initial
  // state, so the pins leave them out too: no mission has a Martian or Ice
  // Folk unit, so no mission revision changed.
  // The Candy revision (`pulp_wars-jdb.3`) added four lists, empty in every
  // initial state and left out too: no mission has a Candy unit.
  const {
    monsters,
    beamedThisTurn,
    tractorUsedThisTurn,
    sugarRush,
    crumbs,
    splattedThisTurn,
    tossedThisTurn,
    ice,
    ...rest
  } = state;
  expect([monsters, beamedThisTurn, tractorUsedThisTurn]).toEqual([[], [], []]);
  // The frozen sea (`pulp_wars-5ti.3`) added the `ice` list, empty in every
  // initial mission state and left out too.
  expect(ice).toEqual([]);
  expect([sugarRush, crumbs, splattedThisTurn, tossedThisTurn]).toEqual([
    [],
    [],
    [],
    [],
  ]);
  return canonicalHash({
    ...rest,
    rulesetId: "*",
    setup: {
      ...state.setup,
      rulesetId: "*",
      mapGenerationRevision: PINNED_MAP_GENERATION_REVISION,
    },
  });
}

/**
 * The 7r34 pins (`pulp_wars-68k.2`), before map curiosities
 * (`pulp_wars-737.2`) added the setup's `curiosities: false` and the empty
 * `curiosities` list: a mission state without those two keys still hashes
 * to them, so the curiosities changed nothing else in a mission.
 */
const PRE_CURIOSITY_MISSION_HASHES: Readonly<Record<string, string>> = {
  "TEST_GROUNDS@1:ORIGINAL":
    "2571d656f451581da64e24744b76489251536d04b7c06be06120cd79be7a6433",
  "TEST_GROUNDS@1:GOBLIN":
    "b82a6886fe8e938b35f21807277443e5a296d8bdf69284f59f65a5637917577b",
  // The AI-directive fixtures (`pulp_wars-68k.3`), pinned at 7r34.
  "TEST_RUSH@1:ORIGINAL":
    "243228c450a3067a06a06078af18ad3254c40fa43a723577d13b010903dc7f87",
  "TEST_HOLD@1:ORIGINAL":
    "ab9625959c3cea281c1a8628bea232302513cc0a5d928e416fad71419e6a4670",
  "TEST_GUARD@1:ORIGINAL":
    "493749a981bcc06da8f1346adedfef54c1dd0d6a491e7167376f4a8cceb5432a",
  // Chapter One (`pulp_wars-68k.4`), added after the curiosities: the same
  // states with the two curiosities keys left out.
  "FRONTIER_1@1:ORIGINAL":
    "f3da8d77afc147d8c5f13ff451bd7d669745cc1f5e2a91c1d44502b7aa752928",
  "FRONTIER_2@1:ORIGINAL":
    "97eaffcff5ad0bd5bec8a59ebf2f38b6cf2819d243b5dc325d2956b85c146d30",
  "FRONTIER_3@1:GOBLIN":
    "0e4d7ec0d44c70139bf1dd4b840dea8c25e70704219fb6e836c1b8b2e7775217",
  "FRONTIER_4@2:ORIGINAL":
    "83afb63b639d24c9eeb001181d65515a62ba632f00aa8bdaa45845f54fe966e0",
  "FRONTIER_4@2:GOBLIN":
    "8086b3eaccd3ed40218d8f022356072bf09368a9c54d594f94792deb425fee8c",
  "TEST_NECK@1:ORIGINAL":
    "2f66fa9637b24763b0193cd54cad72170fcf4912f8cf21d950c532a9da88bd02",
  // The Human tuning labs (tuning 4) were never built before map
  // curiosities; their digests here are the same reduction of the state.
  "LAB_SIEGE@1:ORIGINAL":
    "08e89649ece323a8d5284cc1895331f236d702a507a8c68df6ff443175b539ed",
  "LAB_BACKLINE@2:ORIGINAL":
    "bf278fe987b22356a48b8a199331a3435878bc5072ec31f85691371d6be31277",
  "LAB_LATE@2:ORIGINAL":
    "67247565f08469287eeae5e2a66f4b4a3a9f270e9d2d1d08bc1d595cb68e0643",
  // The breakthrough labs of tuning 6: the same reduction of the state.
  "LAB_BREAKTHROUGH@1:ORIGINAL":
    "6ccb8e03ac5fbde39f519a869f27842d9d04c76b6f4ae22a9edff82b63621c3d",
  "LAB_BREAKTHROUGH_GOBLIN@1:ORIGINAL":
    "1373e09cadca8389096d78651cdd32bcc90151e3238e2558381fed099388b9a6",
  "LAB_BREAKTHROUGH_UNDEAD@1:ORIGINAL":
    "1d5eeb851165e178d979abbb49cf65a9f24c3a23665ee5af8ed6a1e1df9682c4",
};

function preCuriosityMissionStateHash(state: GameStateV7): string {
  const {
    curiosities,
    monsters,
    beamedThisTurn,
    tractorUsedThisTurn,
    sugarRush,
    crumbs,
    splattedThisTurn,
    tossedThisTurn,
    ice,
    ...rest
  } = state;
  const { curiosities: option, ...setup } = state.setup;
  expect([curiosities, monsters, option]).toEqual([[], [], false]);
  expect([beamedThisTurn, tractorUsedThisTurn]).toEqual([[], []]);
  // The frozen sea (`pulp_wars-5ti.3`) added the `ice` list, empty in every
  // initial mission state and left out too.
  expect(ice).toEqual([]);
  expect([sugarRush, crumbs, splattedThisTurn, tossedThisTurn]).toEqual([
    [],
    [],
    [],
    [],
  ]);
  return canonicalHash({
    ...rest,
    rulesetId: "*",
    setup: {
      ...setup,
      rulesetId: "*",
      mapGenerationRevision: PINNED_MAP_GENERATION_REVISION,
    },
  });
}

function testGrounds(): MissionDefinitionV7 {
  const mission = missionByIdV7("TEST_GROUNDS");
  if (mission === null) throw new Error("TEST_GROUNDS is not registered");
  return mission;
}

function groundsSetup(
  faction: FactionIdV7 = "ORIGINAL",
  overrides: Partial<MatchSetupV7> = {},
): MatchSetupV7 {
  const setup = missionMatchSetupV7(testGrounds(), faction);
  if (setup === null) throw new Error("no TEST_GROUNDS setup");
  return { ...setup, ...overrides };
}

/** A browser-legal generated-map setup (Human against Undead). */
function plainSetup(mapType: MatchSetupV7["mapType"]): MatchSetupV7 {
  return { ...browserSetupV7(), mapType };
}

function rawGrounds(faction: FactionIdV7 = "ORIGINAL"): GameStateV7 {
  const created = createInitialMapStateV7(groundsSetup(faction));
  if (!created.ok) throw new Error(created.error.code);
  return created.state;
}

function playableGrounds(faction: FactionIdV7 = "ORIGINAL"): GameStateV7 {
  const created = createPlayableGameV7(groundsSetup(faction));
  if (!created.ok) throw new Error(created.error.code);
  return created.state;
}

function tile(state: GameStateV7, x: number, y: number) {
  const found = state.board.tiles[y * state.board.width + x];
  if (found === undefined) throw new Error("off board");
  return found;
}

/** A definition edited for a build-time validation case. */
function edited(
  change: (mission: MissionDefinitionV7) => Partial<MissionDefinitionV7>,
): MissionDefinitionV7 {
  const base = JSON.parse(JSON.stringify(testGrounds())) as MissionDefinitionV7;
  return { ...base, ...change(base) };
}

function runCli(...args: readonly string[]): {
  readonly acceptedCommands: number;
  readonly termination: string;
  readonly errors: readonly unknown[];
  readonly metrics: {
    readonly rulesetId: string;
    readonly factionsBySeat: readonly string[];
  };
} {
  const output = execFileSync(
    process.execPath,
    [
      resolve("node_modules/tsx/dist/cli.mjs"),
      resolve("src/headless/cli.ts"),
      ...args,
    ],
    { encoding: "utf8", timeout: 30_000, stdio: ["ignore", "pipe", "pipe"] },
  );
  return JSON.parse(output) as ReturnType<typeof runCli>;
}

describe("the mission registry", () => {
  it("registers TEST_GROUNDS revision 1 as a hidden fixture", () => {
    const mission = testGrounds();
    expect(mission).toMatchObject({ revision: 1, hidden: true, size: 11 });
    expect(Object.isFrozen(mission)).toBe(true);
    expect(missionDefinitionV7({ id: "TEST_GROUNDS", revision: 1 })).toBe(
      mission,
    );
    expect(missionDefinitionV7({ id: "TEST_GROUNDS", revision: 2 })).toBe(null);
    expect(missionDefinitionV7({ id: "NO_SUCH", revision: 1 })).toBe(null);
    expect(new Set(MISSION_REGISTRY_V7.map((item) => item.id)).size).toBe(
      MISSION_REGISTRY_V7.length,
    );
  });

  it("builds every registered mission for every faction choice into a valid playable state", () => {
    for (const mission of MISSION_REGISTRY_V7) {
      expect(() => validateMissionDefinitionV7(mission)).not.toThrow();
      for (const faction of missionSeatFactionsV7(
        mission.seats[0] as MissionDefinitionV7["seats"][number],
      )) {
        const setup = missionMatchSetupV7(mission, faction);
        if (setup === null) throw new Error(`${mission.id} ${faction}`);
        expect(parseMatchSetupV7(setup)).toEqual(setup);
        const raw = createInitialMapStateV7(setup);
        if (!raw.ok) throw new Error(raw.error.code);
        expect(raw.mapAttempt).toBe(1);
        expect(parseGameStateV7(raw.state)).not.toBeNull();
        const created = createPlayableGameV7(setup);
        expect(created.ok).toBe(true);
      }
    }
  });

  it("pins the initial state of every registered mission revision and faction choice", () => {
    const actual: Record<string, string> = {};
    const preCuriosity: Record<string, string> = {};
    for (const mission of MISSION_REGISTRY_V7)
      for (const faction of missionSeatFactionsV7(
        mission.seats[0] as MissionDefinitionV7["seats"][number],
      )) {
        const setup = missionMatchSetupV7(mission, faction);
        if (setup === null) throw new Error(`${mission.id} ${faction}`);
        const raw = createInitialMapStateV7(setup);
        if (!raw.ok) throw new Error(raw.error.code);
        const label = `${mission.id}@${String(mission.revision)}:${faction}`;
        actual[label] = missionStateHash(raw.state);
        preCuriosity[label] = preCuriosityMissionStateHash(raw.state);
      }
    // A mismatch: bump the edited mission's revision (section 2.4).
    expect(actual).toEqual(PINNED_MISSION_HASHES);
    expect(preCuriosity).toEqual(PRE_CURIOSITY_MISSION_HASHES);
  });

  it("offers seat 0's choices through missionMatchSetupV7 and refuses others", () => {
    const mission = testGrounds();
    expect(missionMatchSetupV7(mission)).toEqual({
      rulesetId: RULESET_7_ID,
      seed: mission.seed,
      width: 11,
      height: 11,
      aiCount: 1,
      aiDifficulty: "NORMAL",
      aiMode: "RIVAL",
      humanColor: "CORAL",
      factions: ["ORIGINAL", "UNDEAD"],
      mapType: "MISSION",
      mapGenerationRevision: "REGIONAL_BIOMES_NAVAL_V4",
      curiosities: false,
      mission: { id: "TEST_GROUNDS", revision: 1 },
    });
    expect(missionMatchSetupV7(mission, "GOBLIN", "TEAL")).toMatchObject({
      factions: ["GOBLIN", "UNDEAD"],
      humanColor: "TEAL",
    });
    expect(missionMatchSetupV7(mission, "UNDEAD")).toBeNull();
    expect(missionMatchSetupV7(mission, "MARTIAN")).toBeNull();
  });
});

describe("the MISSION setup", () => {
  it("accepts a registered mission with either faction choice and any human color", () => {
    for (const faction of ["ORIGINAL", "GOBLIN"] as const)
      for (const humanColor of ["CORAL", "VIOLET"] as const) {
        const setup = groundsSetup(faction, { humanColor });
        expect(validateMatchSetupV7(setup)).toEqual({ ok: true, setup });
      }
  });

  it("refuses every field that does not match the definition", () => {
    const setup = groundsSetup();
    const invalid = { ok: false, error: { code: "INVALID_SETUP", params: {} } };
    for (const change of [
      { width: 14, height: 14 },
      { height: 14 },
      { aiCount: 2, factions: ["ORIGINAL", "UNDEAD", "GOBLIN"] },
      { aiMode: "COOPERATIVE" },
      { seed: setup.seed + 1 },
      { factions: ["DINOSAUR", "UNDEAD"] },
      { factions: ["ORIGINAL", "GOBLIN"] },
      { factions: ["ORIGINAL"] },
      { allowDuplicateFactions: true },
      { mission: { id: "TEST_GROUNDS", revision: 0 } },
      { mission: { id: "TEST_GROUNDS", revision: 1.5 } },
      { mission: { id: "", revision: 1 } },
      { mission: { id: 7, revision: 1 } },
      { mission: { id: "TEST_GROUNDS", revision: 1, extra: true } },
      { mission: undefined },
      { aiDifficulty: "HARD" },
      { mapGenerationRevision: "OTHER" },
    ] as const) {
      const input = JSON.parse(
        JSON.stringify({ ...setup, ...change }),
      ) as unknown;
      expect(validateMatchSetupV7(input), JSON.stringify(change)).toEqual(
        invalid,
      );
    }
    // Only a MISSION setup may carry the mission key.
    expect(
      validateMatchSetupV7({
        ...plainSetup("CONTINENTS"),
        mission: { id: "TEST_GROUNDS", revision: 1 },
      }),
    ).toEqual(invalid);
    expect(
      validateMatchSetupV7({ ...plainSetup("CONTINENTS"), mapType: "MISSION" }),
    ).toEqual(invalid);
  });

  it("refuses an unknown mission ID or a revision other than the current one with UNKNOWN_MISSION", () => {
    for (const mission of [
      { id: "NO_SUCH_MISSION", revision: 1 },
      { id: "TEST_GROUNDS", revision: 2 },
    ]) {
      const result = validateMatchSetupV7(
        groundsSetup("ORIGINAL", { mission }),
      );
      expect(result).toEqual({
        ok: false,
        error: { code: "UNKNOWN_MISSION", params: mission },
      });
      expect(
        createInitialMapStateV7(groundsSetup("ORIGINAL", { mission })),
      ).toMatchObject({ ok: false, error: { code: "UNKNOWN_MISSION" } });
      expect(() =>
        createReplayV7(groundsSetup("ORIGINAL", { mission })),
      ).toThrow("UNKNOWN_MISSION");
    }
  });
});

describe("the mission builder (TEST_GROUNDS)", () => {
  it("lays out the authored terrain, water classes, biomes, resources, and sites", () => {
    const state = rawGrounds();
    expect(tile(state, 0, 0)).toMatchObject({
      terrain: "MOUNTAIN",
      biome: "WOODLAND",
    });
    expect(tile(state, 3, 0)).toMatchObject({
      terrain: "FOREST",
      resource: "GAME",
    });
    // Water orthogonally next to land is Shallow, otherwise Deep.
    expect(tile(state, 9, 0)).toMatchObject({
      terrain: "SHALLOW_WATER",
      biome: null,
    });
    expect(tile(state, 10, 0)).toMatchObject({
      terrain: "DEEP_WATER",
      resource: "PEARLS",
    });
    expect(tile(state, 10, 5)).toMatchObject({
      terrain: "SHALLOW_WATER",
      resource: "FISH",
    });
    expect(tile(state, 5, 3).terrain).toBe("RIFT");
    expect(tile(state, 5, 5)).toMatchObject({
      biome: "PLAINS",
      site: "VILLAGE",
    });
    expect(tile(state, 2, 9).biome).toBe("HIGHLANDS");
    expect(tile(state, 2, 8).site).toBe("CAPITAL");
    expect(tile(state, 2, 3).site).toBe("CITY");
    expect(tile(state, 7, 2).site).toBe("CAPITAL");
    expect(tile(state, 1, 9)).toMatchObject({
      resource: "FERTILE_GROUND",
      improvement: "FARM",
    });
    expect(tile(state, 8, 1)).toMatchObject({
      terrain: "MOUNTAIN",
      resource: "ORE",
      improvement: "MINE",
    });
    expect(tile(state, 7, 5).road).toBe(true);
    expect(tile(state, 6, 3).fieldDefense).toBe(true);
    expect(state.treasureChests).toEqual([{ x: 5, y: 9 }]);
    expect(state.graves).toEqual([{ x: 5, y: 7 }]);
  });

  it("gives every city its 3 x 3 footprint and the Showcase entity IDs", () => {
    const state = rawGrounds();
    expect(state.cities.map((city) => [city.id, city.ownerId])).toEqual([
      [1, 1],
      [3, 2],
      [5, 1],
      [6, 2],
    ]);
    for (const city of state.cities)
      for (let dy = -1; dy <= 1; dy += 1)
        for (let dx = -1; dx <= 1; dx += 1)
          expect(
            tile(state, city.at.x + dx, city.at.y + dy).territoryCityId,
          ).toBe(city.id);
    expect(
      state.board.tiles.filter((item) => item.territoryCityId !== null),
    ).toHaveLength(36);
    expect(state.players.map((player) => player.originalCapitalCityId)).toEqual(
      [1, 3],
    );
    // Seat s: capital 2s + 1, first unit 2s + 2; then the other cities, the
    // ledger, and the other units in seat order.
    expect(state.units.map((unit) => [unit.id, unit.role, unit.at])).toEqual([
      [2, "FIGHTER", { x: 2, y: 8 }],
      [4, "FIGHTER", { x: 7, y: 2 }],
      [18, "GUARD", { x: 3, y: 8 }],
      [19, "RAIDER", { x: 2, y: 3 }],
      [20, "GUARD", { x: 7, y: 3 }],
      [21, "MARKSMAN", { x: 7, y: 8 }],
    ]);
    expect(state.nextEntityId).toBe(22);
    expect(state.units.find((unit) => unit.id === 19)?.homeCityId).toBe(5);
  });

  it("fills the population ledger to each city's level from the ordinary rules", () => {
    const state = rawGrounds();
    expect(
      state.cities.map((city) => [
        city.level,
        city.rewards.map((reward) => reward.reward),
        city.permanentPopulation,
        city.economicPopulation,
        city.population,
      ]),
    ).toEqual([
      // Capital L3: Farm 2 live, three harvests.
      [3, ["SURVEY", "WALLS"], 3, 2, 0],
      // Undead capital L4: BOOM 3, three harvests; Mine 2 and Road 1 live.
      [4, ["SURVEY", "WALLS", "BOOM"], 6, 3, 0],
      // Human city L2: two harvests.
      [2, ["STOCKPILE"], 2, 0, 0],
      // Undead city L1: its Road population alone.
      [1, [], 0, 1, 1],
    ]);
    expect(
      state.populationContributions.map((entry) => [
        entry.id,
        entry.cityId,
        entry.category,
        entry.amount,
        entry.source.kind === "RESOURCE_ACTION"
          ? entry.source.action
          : entry.source.kind,
        entry.source.at,
      ]),
    ).toEqual([
      [7, 1, "PERMANENT", 1, "HARVEST_FRUIT", { x: 1, y: 7 }],
      [8, 1, "PERMANENT", 1, "HARVEST_FRUIT", { x: 2, y: 7 }],
      [9, 1, "PERMANENT", 1, "HARVEST_FRUIT", { x: 3, y: 7 }],
      [10, 1, "LIVE", 2, "IMPROVEMENT", { x: 1, y: 9 }],
      [11, 5, "PERMANENT", 1, "HARVEST_FRUIT", { x: 1, y: 2 }],
      [12, 5, "PERMANENT", 1, "HARVEST_FRUIT", { x: 2, y: 2 }],
      [13, 3, "PERMANENT", 3, "CITY_REWARD", { x: 7, y: 2 }],
      [14, 3, "PERMANENT", 1, "HARVEST_FRUIT", { x: 6, y: 1 }],
      [15, 3, "PERMANENT", 1, "HARVEST_FRUIT", { x: 7, y: 1 }],
      [16, 3, "PERMANENT", 1, "HARVEST_FRUIT", { x: 6, y: 2 }],
      [17, 3, "LIVE", 2, "IMPROVEMENT", { x: 8, y: 1 }],
    ]);
    expect(state.pendingChoices).toEqual([]);
  });

  it("creates the seats from the definition: factions, Coins, technologies, exploration", () => {
    const state = rawGrounds("GOBLIN");
    const [human, undead] = state.players;
    expect(human).toMatchObject({
      faction: "GOBLIN",
      factionTreeId: "GOBLIN_BASELINE_V1",
      controller: "HUMAN",
      color: "CORAL",
      coins: 5,
      researchedTechs: [],
    });
    expect(undead).toMatchObject({
      faction: "UNDEAD",
      controller: "AI",
      coins: 7,
      researchedTechs: [
        "GATHERING",
        "SCOUTING",
        "ROADS",
        "DRILL",
        "FORTIFICATION",
      ],
    });
    // Radius 2 around (2, 8) and (2, 3): x 0–4, y 1–10 (50 cells).
    expect(human?.explored).toHaveLength(50);
    expect(human?.explored).toContainEqual({ x: 4, y: 1 });
    expect(human?.explored).not.toContainEqual({ x: 7, y: 2 });
    // The Undead also see the reveal rectangle over the human capital.
    expect(undead?.explored).toContainEqual({ x: 1, y: 9 });
    expect(undead?.explored).toContainEqual({ x: 3, y: 7 });
    expect(undead?.explored).not.toContainEqual({ x: 0, y: 9 });
    expect(state.turnOrder).toEqual([1, 2]);
    expect(state.random).toEqual(randomState(testGrounds().seed));
    expect(state.round).toBe(1);
  });

  it("resolves the starting units through the chosen faction at full HP", () => {
    for (const faction of ["ORIGINAL", "GOBLIN"] as const) {
      const state = rawGrounds(faction);
      for (const unit of state.units) {
        const owner = state.players.find(
          (player) => player.id === unit.ownerId,
        );
        const maxHp = effectiveRoleRuleV7(
          unit.role,
          owner?.faction ?? "ORIGINAL",
        ).maxHp;
        expect(unit).toMatchObject({
          hp: maxHp,
          maxHp,
          kills: 0,
          form: "LAND",
        });
      }
    }
    expect(rawGrounds("ORIGINAL").units[0]?.maxHp).not.toBe(
      rawGrounds("GOBLIN").units[0]?.maxHp,
    );
  });

  it("reports the authored board as generation attempt 1 with no draw, and has no village count", () => {
    const generated = generateInitialMapV7(groundsSetup());
    if (!generated.ok) throw new Error(generated.error.code);
    expect(generated.map).toMatchObject({
      attempt: 1,
      attempts: [],
      capitals: [
        { x: 2, y: 8 },
        { x: 7, y: 2 },
      ],
      villages: [
        { x: 4, y: 1 },
        { x: 5, y: 5 },
      ],
      turnOrderSeats: [0, 1],
      treasureChests: [{ x: 5, y: 9 }],
      random: randomState(testGrounds().seed),
    });
    expect(
      generated.map.board.tiles.every((item) => item.territoryCityId === null),
    ).toBe(true);
    expect(generateInitialMapWithVillageCountV7(groundsSetup(), 4)).toEqual({
      ok: false,
      error: { code: "INVALID_SETUP", params: {} },
    });
  });

  it("refuses definitions it cannot honour at build time", () => {
    const setup = groundsSetup();
    const cases: readonly [string, MissionDefinitionV7][] = [
      [
        "must be forbidden",
        edited(() => ({ forbiddenTechnologies: ["SHORECRAFT"] })),
      ],
      [
        "without water",
        edited((base) => ({
          terrain: base.terrain.map((row) => row.replaceAll("~", ".")),
          resources: base.resources.map((row) => row.replace(/[sp]/g, ".")),
          forbiddenTechnologies: [],
        })),
      ],
      [
        "Graves need an Undead seat",
        edited((base) => ({
          seats: [
            base.seats[0] as MissionDefinitionV7["seats"][number],
            {
              ...(base.seats[1] as MissionDefinitionV7["seats"][number]),
              faction: "DWARF",
            },
          ],
        })),
      ],
      [
        "edge ring",
        edited((base) => ({
          seats: [
            {
              ...(base.seats[0] as MissionDefinitionV7["seats"][number]),
              cities: [{ at: { x: 0, y: 4 }, level: 1, rewards: [] }],
              units: [{ role: "FIGHTER", at: { x: 0, y: 4 } }],
            },
            base.seats[1] as MissionDefinitionV7["seats"][number],
          ],
        })),
      ],
      [
        "which seat 0 may choose",
        edited((base) => ({
          graves: [],
          seats: [
            base.seats[0] as MissionDefinitionV7["seats"][number],
            {
              ...(base.seats[1] as MissionDefinitionV7["seats"][number]),
              faction: "GOBLIN",
            },
          ],
        })),
      ],
      [
        "does not fit its terrain",
        edited((base) => ({
          resources: [
            "o" + (base.resources[0] as string).slice(1).replace("g", "."),
            ...base.resources.slice(1),
          ].map((row, y) => (y === 0 ? "s" + row.slice(1) : row)),
        })),
      ],
      [
        "cannot stand there",
        edited((base) => ({
          seats: [
            {
              ...(base.seats[0] as MissionDefinitionV7["seats"][number]),
              units: [
                { role: "FIGHTER", at: { x: 2, y: 8 } },
                { role: "GUARD", at: { x: 10, y: 8 } },
              ],
            },
            base.seats[1] as MissionDefinitionV7["seats"][number],
          ],
        })),
      ],
      [
        "harvested Grass tiles",
        edited((base) => ({
          seats: [
            {
              ...(base.seats[0] as MissionDefinitionV7["seats"][number]),
              cities: [
                {
                  at: { x: 2, y: 8 },
                  level: 5,
                  rewards: ["SURVEY", "WALLS", "TREASURY_6", "TREASURY"],
                },
                ...(base.seats[0]?.cities.slice(1) ?? []),
              ],
            },
            base.seats[1] as MissionDefinitionV7["seats"][number],
          ],
        })),
      ],
      [
        "starts with the forbidden",
        edited((base) => ({
          seats: [
            {
              ...(base.seats[0] as MissionDefinitionV7["seats"][number]),
              technologies: ["SHORECRAFT"],
            },
            base.seats[1] as MissionDefinitionV7["seats"][number],
          ],
        })),
      ],
      [
        "do not match its level",
        edited((base) => ({
          seats: [
            {
              ...(base.seats[0] as MissionDefinitionV7["seats"][number]),
              cities: [
                { at: { x: 2, y: 8 }, level: 3, rewards: ["WALLS", "SURVEY"] },
                ...(base.seats[0]?.cities.slice(1) ?? []),
              ],
            },
            base.seats[1] as MissionDefinitionV7["seats"][number],
          ],
        })),
      ],
      ["layer is not", edited((base) => ({ terrain: base.terrain.slice(1) }))],
    ];
    for (const [message, mission] of cases) {
      let thrown: unknown = null;
      try {
        // The setup plays the edited AI seats' factions.
        buildMissionStateV7(mission, {
          ...setup,
          factions: mission.seats.map((seat, index) =>
            typeof seat.faction === "string"
              ? seat.faction
              : (setup.factions[index] as FactionIdV7),
          ),
        });
      } catch (error) {
        thrown = error;
      }
      expect(thrown, message).toBeInstanceOf(MissionBuildErrorV7);
      expect(String((thrown as Error).message), message).toContain(message);
    }
  });
});

describe("forbidden technologies", () => {
  it("are the Dry Land Naval branch, a mission's list, or nothing", () => {
    expect([
      ...forbiddenTechnologiesV7(plainSetup("DRY_LAND")).entries(),
    ]).toEqual(NAVAL.map((tech) => [tech, "DRY_LAND"]));
    expect([...forbiddenTechnologiesV7(groundsSetup()).entries()]).toEqual(
      NAVAL.map((tech) => [tech, "MISSION"]),
    );
    for (const mapType of [
      "PANGEA",
      "CONTINENTS",
      "ARCHIPELAGO",
      "LAKES",
    ] as const)
      expect(forbiddenTechnologiesV7(plainSetup(mapType)).size).toBe(0);
    // Every faction tree shares the Human tree's branches, so the Dry Land
    // set read from it is the set every tree's Naval nodes form.
    for (const faction of FACTION_IDS_V7)
      expect(
        factionTreeV7(faction)
          .nodes.filter((node) => node.branch === "NAVAL")
          .map((node) => node.id),
      ).toEqual(NAVAL);
    expect(
      ORIGINAL_BASELINE_V5_TREE.nodes
        .filter((node) => node.branch === "NAVAL")
        .map((node) => node.id),
    ).toEqual(NAVAL);
  });

  it("refuses a mission's forbidden research with TECH_REQUIRED reason MISSION and no state change", () => {
    const state = playableGrounds();
    const human = state.humanPlayerId;
    for (const tech of NAVAL) {
      const result = applyCommandV7(state, human, { kind: "RESEARCH", tech });
      expect(result.accepted).toBe(false);
      if (result.accepted) continue;
      expect(result.error).toEqual({
        code: "TECH_REQUIRED",
        params: { tech, reason: "MISSION" },
      });
      expect(canonicalJson(result.state)).toBe(canonicalJson(state));
    }
    // An allowed tier-1 technology is still the free opener.
    const opener = applyCommandV7(state, human, {
      kind: "RESEARCH",
      tech: "HUNTING",
    });
    expect(opener.accepted).toBe(true);
  });

  it("shows forbidden nodes DISABLED at their ordinary cost and never offers them", () => {
    const state = playableGrounds();
    const tree = queryTechnologyTreeV7(state, state.humanPlayerId);
    for (const tech of NAVAL)
      expect(tree.nodes.find((node) => node.id === tech)).toMatchObject({
        state: "DISABLED",
        affordable: false,
      });
    // The ordinary tier-1 cost is 5 (the city count does not matter since
    // tuning 4); the free opener (cost 0) applies to Hunting but never to
    // the disabled Shorecraft.
    expect(tree.nodes.find((node) => node.id === "SHORECRAFT")?.cost).toBe(5);
    expect(tree.nodes.find((node) => node.id === "HUNTING")).toMatchObject({
      state: "AVAILABLE",
      cost: 0,
    });
    const offers = queryPlayerCommandsV7(state, state.humanPlayerId).filter(
      (command) => command.kind === "RESEARCH",
    );
    expect(offers.length).toBeGreaterThan(0);
    for (const command of offers)
      if (command.kind === "RESEARCH")
        expect(NAVAL).not.toContain(command.tech);
  });

  it("keeps the Dry Land behaviour: TECH_REQUIRED reason DRY_LAND, DISABLED, never offered", () => {
    const created = createPlayableGameV7(plainSetup("DRY_LAND"));
    if (!created.ok) throw new Error(created.error.code);
    const state = created.state;
    const actor = state.turnOrder[state.activeSeatIndex];
    if (actor === undefined) throw new Error("no actor");
    const result = applyCommandV7(state, actor, {
      kind: "RESEARCH",
      tech: "SHORECRAFT",
    });
    expect(result.accepted).toBe(false);
    if (!result.accepted)
      expect(result.error).toEqual({
        code: "TECH_REQUIRED",
        params: { tech: "SHORECRAFT", reason: "DRY_LAND" },
      });
    const tree = queryTechnologyTreeV7(state, actor);
    for (const tech of NAVAL)
      expect(tree.nodes.find((node) => node.id === tech)?.state).toBe(
        "DISABLED",
      );
    // One city, no technology: the ordinary tier-1 cost 5, never the opener.
    expect(tree.nodes.find((node) => node.id === "SHORECRAFT")?.cost).toBe(5);
    expect(
      queryPlayerCommandsV7(state, actor).some(
        (command) =>
          command.kind === "RESEARCH" && NAVAL.includes(command.tech),
      ),
    ).toBe(false);
  });
});

describe("mission saves and replays", () => {
  function playedGrounds(): {
    readonly state: GameStateV7;
    readonly replay: ReturnType<typeof createReplayV7>;
  } {
    const setup = groundsSetup("GOBLIN");
    const created = createPlayableGameV7(setup);
    if (!created.ok) throw new Error(created.error.code);
    let state = created.state;
    let replay = createReplayV7(setup);
    for (let step = 0; step < 6; step += 1) {
      const actor = state.turnOrder[state.activeSeatIndex];
      if (actor === undefined) throw new Error("actor missing");
      const offered = queryPlayerCommandsV7(state, actor);
      const command =
        step % 3 === 2
          ? ({ kind: "END_TURN" } as const)
          : (offered.find((entry) => entry.kind === "MOVE") ??
            ({ kind: "END_TURN" } as const));
      const result = applyCommandV7(state, actor, command);
      if (!result.accepted) throw new Error(`${command.kind} rejected`);
      state = result.state;
      replay = appendReplayCommandV7(replay, command, state);
    }
    return { state, replay };
  }

  it("round-trips a played mission through save and replay", () => {
    const { state, replay } = playedGrounds();
    expect(state.commandIndex).toBe(6);
    const replayed = runReplayV7(JSON.parse(JSON.stringify(replay)));
    expect(replayed.stateHash).toBe(canonicalHash(state));
    const save = createSaveEnvelopeV7(
      { state, replay },
      "2026-10-03T12:00:00.000Z",
    );
    const loaded = parseSaveV7(JSON.stringify(save));
    if (loaded.kind !== "VALID") throw new Error(loaded.diagnostic);
    expect(loaded.save.setup).toEqual(groundsSetup("GOBLIN"));
    expect(loaded.save.stateHash).toBe(canonicalHash(state));
  });

  it("refuses a save or replay of a revised or removed mission as stale, not corrupt", () => {
    const { state, replay } = playedGrounds();
    const save = createSaveEnvelopeV7(
      { state, replay },
      "2026-10-03T12:00:00.000Z",
    );
    for (const mission of [
      { id: "TEST_GROUNDS", revision: 2 },
      { id: "REMOVED_MISSION", revision: 1 },
    ]) {
      const setup = { ...save.setup, mission };
      const stale = {
        ...save,
        setup,
        state: { ...save.state, setup },
      };
      expect(parseSaveV7(JSON.stringify(stale))).toEqual({
        kind: "INCOMPATIBLE",
        diagnostic: STALE_MISSION_DIAGNOSTIC_V7,
      });
      const staleReplay = JSON.parse(
        JSON.stringify({ ...replay, setup }),
      ) as unknown;
      expect(parseReplayFileV7(staleReplay)).toEqual({
        kind: "INCOMPATIBLE_REPLAY",
      });
      expect(() => runReplayV7(staleReplay)).toThrow(
        expect.objectContaining({ code: "INCOMPATIBLE_REPLAY" }),
      );
    }
    expect(STALE_MISSION_DIAGNOSTIC_V7).toBe(
      "This mission was updated since the game was saved. Start it again from the campaign.",
    );
  });
});

describe("headless mission matches", () => {
  it(
    "plays TEST_GROUNDS Normal against Normal with no policy error",
    { timeout: 120_000 },
    () => {
      for (const faction of ["ORIGINAL", "GOBLIN"] as const) {
        const result = runAiMatchV7(groundsSetup(faction), { maxRounds: 8 });
        expect(result.errors).toEqual([]);
        expect(result.stalls).toEqual([]);
        expect(result.acceptedCommands).toBeGreaterThan(8);
        expect(parseGameStateV7(result.state)).not.toBeNull();
        // The AI never researches a forbidden technology.
        for (const player of result.state.players)
          for (const tech of NAVAL)
            expect(player.researchedTechs).not.toContain(tech);
      }
    },
  );

  it(
    "runs `--map-type mission --mission <ID>` on the CLI and refuses misuse",
    { timeout: 120_000 },
    () => {
      const common = [
        "match",
        "--ruleset",
        RULESET_7_ID,
        "--map-type",
        "mission",
        "--mission",
        "TEST_GROUNDS",
        "--max-commands",
        "3",
      ] as const;
      expect(runCli(...common)).toMatchObject({
        acceptedCommands: 3,
        termination: "COMMAND_CAP",
        errors: [],
        metrics: {
          rulesetId: RULESET_7_ID,
          factionsBySeat: ["ORIGINAL", "UNDEAD"],
        },
      });
      expect(
        runCli(...common, "--factions", "goblin,undead").metrics.factionsBySeat,
      ).toEqual(["GOBLIN", "UNDEAD"]);
      for (const [extra, message] of [
        [
          ["--factions", "dwarf,undead"],
          /--factions for mission TEST_GROUNDS must be original\|goblin,undead/,
        ],
        [["--seed", "3"], /--seed does not apply to --map-type mission/],
        [["--size", "11"], /--size does not apply to --map-type mission/],
      ] as const)
        expect(() => runCli(...common, ...extra)).toThrow(message);
      expect(() =>
        runCli(
          "match",
          "--ruleset",
          RULESET_7_ID,
          "--map-type",
          "mission",
          "--mission",
          "NO_SUCH",
        ),
      ).toThrow(/--mission NO_SUCH is not a registered mission/);
      expect(() =>
        runCli("match", "--ruleset", RULESET_7_ID, "--map-type", "mission"),
      ).toThrow(/--map-type mission requires --mission <ID>/);
      expect(() =>
        runCli("match", "--ruleset", RULESET_7_ID, "--mission", "TEST_GROUNDS"),
      ).toThrow(/--mission requires --map-type mission/);
    },
  );
});
