import { describe, expect, it } from "vitest";
import { endgamePlanForPolicyV7 } from "../../src/ai/v7-endgame";
import {
  FACTION_IDS_V7,
  MAP_GENERATION_REVISION_V7,
  RULESET_7_ID,
  SHOWCASE_UNIT_TEMPLATES_V7,
  showcaseUnitRoleV7,
  TECHNOLOGY_IDS_V7,
  UNIT_ROLE_IDS_V7,
  isNavalRoleV7,
  appendReplayCommandV7,
  applyCommandV7,
  arePlayersHostileV7,
  assignedUnitCountV7,
  canonicalHash,
  canonicalJson,
  cityUnitCapacityV7,
  createInitialMapStateV7,
  createInitialMapStateWithVillageCountV7,
  createPlayableGameV7,
  createReplayV7,
  effectiveRoleRuleV7,
  generateInitialMapV7,
  generateInitialMapWithVillageCountV7,
  growthSpentV7,
  parseGameStateV7,
  parseMatchSetupV7,
  playerIncomeV7,
  queryPlayerCommandsV7,
  queryTechnologyTreeV7,
  randomState,
  roadPopulationForCityV7,
  runReplayV7,
  showcaseStripCenterXV7,
  revision14VillageCountV7,
  spatialContributionAtV7,
  viewForV7,
  type AiCountV7,
  type CoordV7,
  type FactionIdV7,
  type GameStateV7,
  type MatchSetupV7,
  type TileStateV7,
} from "../../src/engine/index";
import { runAiMatchV7 } from "../../src/headless/v7";
import { createSaveEnvelopeV7, parseSaveV7 } from "../../src/persistence/v7";
import { mirrorOptionV7 } from "../fixtures/v7-builders";
import { revision39PlayableGameV7 } from "../fixtures/v7-revision13-map";

/**
 * Revision 18 section 5 (`pulp_wars-6gd.3`): the fixed `SHOWCASE` setup.
 * Every number of the section 5.3 ledger and income is recomputed here from
 * the engine's own ledger rules, not only compared with the built state.
 */

function showcaseSetup(
  factions: readonly FactionIdV7[],
  overrides: Partial<MatchSetupV7> = {},
): MatchSetupV7 {
  return {
    rulesetId: RULESET_7_ID,
    seed: 618,
    width: 16,
    height: 16,
    aiCount: (factions.length - 1) as AiCountV7,
    aiDifficulty: "NORMAL",
    aiMode: "RIVAL",
    humanColor: "CORAL",
    factions,
    mapType: "SHOWCASE",
    mapGenerationRevision: "REGIONAL_BIOMES_NAVAL_V4",
    curiosities: false,
    // pulp_wars-w5j.1: the test only mirror option for repeated factions.
    ...mirrorOptionV7(factions),
    ...overrides,
  };
}

function rawShowcase(
  factions: readonly FactionIdV7[],
  overrides: Partial<MatchSetupV7> = {},
): GameStateV7 {
  const created = createInitialMapStateV7(showcaseSetup(factions, overrides));
  if (!created.ok) throw new Error("Showcase initial state rejected");
  expect(created.mapAttempt).toBe(1);
  return created.state;
}

function playableShowcase(
  factions: readonly FactionIdV7[],
  overrides: Partial<MatchSetupV7> = {},
) {
  const created = createPlayableGameV7(showcaseSetup(factions, overrides));
  if (!created.ok) throw new Error("Showcase playable game rejected");
  return created;
}

function tile(state: GameStateV7, x: number, y: number): TileStateV7 {
  const found = state.board.tiles[y * state.board.width + x];
  if (found === undefined) throw new Error(`tile ${x},${y} missing`);
  return found;
}

const THREE: readonly FactionIdV7[] = ["ORIGINAL", "UNDEAD", "GOBLIN"];

describe("ruleset-7 revision-18 Showcase setup", () => {
  // Every faction mix is accepted: ruleset-v7-revision18-showcase-mixes.test.ts.
  it("rejects SHOWCASE at every other size", () => {
    for (const size of [11, 14, 20, 25] as const) {
      const setup = showcaseSetup(["ORIGINAL", "UNDEAD"], {
        width: size,
        height: size,
      });
      expect(parseMatchSetupV7(setup)).toBeNull();
      expect(createInitialMapStateV7(setup)).toEqual({
        ok: false,
        error: { code: "INVALID_SETUP", params: {} },
      });
      expect(createPlayableGameV7(setup)).toEqual({
        ok: false,
        error: { code: "INVALID_SETUP", params: {} },
      });
    }
    // The village-count parity entry point has no Showcase board.
    expect(
      createInitialMapStateWithVillageCountV7(
        showcaseSetup(["ORIGINAL", "UNDEAD"]),
        4,
      ).ok,
    ).toBe(false);
  });

  it("keeps the five generated map types byte-identical", () => {
    // First-turn state hashes recorded at bf18c3f (identity
    // `pulp-wars-poc-7r18`), before SHOWCASE existed. Revision 19
    // (`pulp_wars-c87.2`) changes these states only through the identity and
    // the empty `eggs` list, so the same hashes return once both are undone.
    // Revision 21 (`pulp_wars-9s0.4`) adds four locked entitlements to every
    // player and nothing else; the hashes return once they are removed too.
    // The Martian revision (`pulp_wars-t6s.2`) adds the four empty lists
    // `shields`, `cooling`, `mindControlled`, and `mindControlCooldowns`; the
    // hashes return once they are removed as well.
    // Revision 20 section 6.3 (`pulp_wars-0hi.3`) gives the starting Human
    // Fighter 12 HP (was 10) and changes nothing else in these states; the
    // hashes return once that is undone as well.
    // The Pangea coast ring (`pulp_wars-9s0.2`) regenerates every Pangea
    // board (no land on the edge ring; 59.5-72% land), so PANGEA is re-pinned
    // to the coast-ring state under the same normalization (it was
    // d22fa74ce92472cc9f874af7f85852871b8976bbb7a15c68b57d2fc7dac48e65); the
    // other four map types are unchanged.
    // The Rift (`pulp_wars-9s0.5`) turns up to six land tiles of a 16 x 16
    // board into Rift tiles and changes nothing else; the hashes return once
    // each Rift tile gets back the terrain the generator without Rifts
    // (`PANGEA_COAST_RING`) gives it.
    // The village density (`pulp_wars-ykw.2`, 7r40) regenerates every board
    // and renames the map revision a setup names; the hashes return on the
    // 7r39 board that the parity rules keep (`CURIOSITIES` with the 7r39
    // village table) once the revision name is put back as well.
    const pinned = {
      DRY_LAND:
        "82f66f98a5ee995551537573fd5644730860105cd5da95ce14774e1abd2659af",
      PANGEA:
        "25cf84849d9a9821f8e9e5a5dc17894691b877e3c9429ed61369a5637f47d902",
      CONTINENTS:
        "419bfe6c00bd97018329c7d72d1016cf7c2cbcde3b891b139297bcc66cf9e598",
      ARCHIPELAGO:
        "f71a3fbed22ed8ed19f8a057c875557b2c11be645e336ec9ef828e84e0c97912",
      LAKES: "9f0352ed83f648af05dd101fe7634f4848646e1cf87b2dfe62417a82e59c42c2",
    } as const;
    for (const [mapType, hash] of Object.entries(pinned)) {
      const created = revision39PlayableGameV7(
        showcaseSetup(THREE, { mapType: mapType as MatchSetupV7["mapType"] }),
      );
      const {
        eggs,
        shields,
        cooling,
        mindControlled,
        mindControlCooldowns,
        chilled,
        // The Dwarf revision (`pulp_wars-78i.3`): three empty lists.
        burrowed,
        surfacedThisTurn,
        bombedThisTurn,
        // Map curiosities (`pulp_wars-737.2`): the empty list, and the
        // setup's `curiosities: false` below.
        curiosities,
        ...revision19State
      } = created.state;
      expect(eggs).toEqual([]);
      expect(curiosities).toEqual([]);
      expect([
        shields,
        cooling,
        mindControlled,
        mindControlCooldowns,
        chilled,
        burrowed,
        surfacedThisTurn,
        bombedThisTurn,
      ]).toEqual([[], [], [], [], [], [], [], []]);
      for (const player of revision19State.players)
        expect(player.achievementEntitlements.slice(3)).toEqual(
          ["CONQUEROR", "LAND_BARON", "SEA_DOG", "SLAYER"].map(
            (achievement) => ({ achievement, unlocked: false, spent: false }),
          ),
        );
      const humans = new Set(
        revision19State.players
          .filter((player) => player.faction === "ORIGINAL")
          .map((player) => player.id),
      );
      const fighters = revision19State.units.filter(
        (unit) => humans.has(unit.ownerId) && unit.role === "FIGHTER",
      );
      expect(fighters.length).toBeGreaterThan(0);
      for (const unit of fighters)
        expect([unit.hp, unit.maxHp]).toEqual([12, 12]);
      const setupOf = showcaseSetup(THREE, {
        mapType: mapType as MatchSetupV7["mapType"],
      });
      const withoutRifts = generateInitialMapWithVillageCountV7(
        setupOf,
        revision14VillageCountV7(setupOf),
        "PANGEA_COAST_RING",
      );
      if (!withoutRifts.ok) throw new Error(`${mapType} base rejected`);
      const { curiosities: option, ...setupBefore } = revision19State.setup;
      expect(option).toBe(false);
      // `pulp_wars-737.3`: the empty Monster list, left out.
      // `pulp_wars-1wy.3`: and the two empty per-turn Martian lists.
      const {
        monsters,
        beamedThisTurn,
        tractorUsedThisTurn,
        sugarRush,
        crumbs,
        splattedThisTurn,
        tossedThisTurn,
        // `pulp_wars-w49.15`: and the empty hunted list (Pack Hunt).
        huntedThisTurn,
        // `pulp_wars-w49.35`: and the empty Berserk list.
        berserkThisTurn,
        ice,
        // `pulp_wars-w49.17`: and the empty `ninthUnit` record.
        ninthUnit,
        // `pulp_wars-w49.33`: and the empty `barricades` list.
        barricades,
        // `pulp_wars-w49.30`: and the empty `giants` record.
        giants,
        ...withoutMonsters
      } = revision19State;
      expect(giants).toEqual({ swallowed: [] });
      expect(ninthUnit).toEqual({
        wightGraves: [],
        risenWights: [],
        crackedThisTurn: [],
      });
      expect(barricades).toEqual([]);
      expect(huntedThisTurn).toEqual([]);
      expect(berserkThisTurn).toEqual([]);
      expect(monsters).toEqual([]);
      // `pulp_wars-5ti.3`: and the empty ice list.
      expect(ice).toEqual([]);
      expect([beamedThisTurn, tractorUsedThisTurn]).toEqual([[], []]);
      // `pulp_wars-jdb.3`: and the four empty Candy lists.
      expect([sugarRush, crumbs, splattedThisTurn, tossedThisTurn]).toEqual([
        [],
        [],
        [],
        [],
      ]);
      const revision18State = {
        ...withoutMonsters,
        setup: setupBefore,
        board: {
          ...revision19State.board,
          tiles: revision19State.board.tiles.map((tile, index) =>
            tile.terrain === "RIFT"
              ? {
                  ...tile,
                  terrain: withoutRifts.map.board.tiles[index]?.terrain,
                }
              : tile,
          ),
        },
        players: revision19State.players.map((player) => ({
          ...player,
          // `pulp_wars-if6` (7r41): 3 starting Coins; the pins have 5.
          coins: player.coins + 2,
          achievementEntitlements: player.achievementEntitlements.slice(0, 3),
        })),
        units: revision19State.units.map((unit) =>
          fighters.includes(unit) ? { ...unit, hp: 10, maxHp: 10 } : unit,
        ),
      };
      expect(
        canonicalHash(
          JSON.parse(
            JSON.stringify(revision18State)
              .replaceAll(RULESET_7_ID, "pulp-wars-poc-7r18")
              .replaceAll(
                MAP_GENERATION_REVISION_V7,
                "REGIONAL_BIOMES_NAVAL_V2",
              ),
          ),
        ),
        mapType,
      ).toBe(hash);
    }
  });

  it("reports the fixed board as generation attempt 1 with no draw", () => {
    const setup = showcaseSetup(THREE, { seed: 4_000_000_001 });
    const generated = generateInitialMapV7(setup);
    if (!generated.ok) throw new Error("Showcase map rejected");
    expect(generated.map.attempt).toBe(1);
    expect(generated.map.attempts).toEqual([]);
    expect(generated.map.random).toEqual(randomState(4_000_000_001));
    expect(generated.map.villages).toEqual([]);
    expect(generated.map.treasureChests).toEqual([]);
    expect(generated.map.turnOrderSeats).toEqual([0, 1, 2]);
    expect(generated.map.capitals).toEqual([
      { x: 2, y: 7 },
      { x: 10, y: 7 },
      { x: 14, y: 7 },
    ]);
  });
});

describe("ruleset-7 revision-18 Showcase board", () => {
  const state = rawShowcase(["ORIGINAL", "UNDEAD", "GOBLIN", "ORIGINAL"]);

  it("is 192 land tiles over 64 water tiles with Shallow exactly on y = 12", () => {
    const land = state.board.tiles.filter((entry) => entry.biome !== null);
    const water = state.board.tiles.filter((entry) => entry.biome === null);
    expect(land).toHaveLength(192);
    expect(water).toHaveLength(64);
    expect(land.every((entry) => entry.at.y <= 11)).toBe(true);
    expect(land.every((entry) => entry.biome === "PLAINS")).toBe(true);
    for (const entry of water)
      expect(entry.terrain).toBe(
        entry.at.y === 12 ? "SHALLOW_WATER" : "DEEP_WATER",
      );
    expect(
      state.board.tiles
        .filter((entry) => entry.terrain === "SHALLOW_WATER")
        .every((entry) => entry.at.y === 12),
    ).toBe(true);
    for (let x = 0; x < 16; x += 1) {
      expect(tile(state, x, 12).resource).toBe(x % 4 === 0 ? "FISH" : null);
      expect(tile(state, x, 14).resource).toBe(x % 4 === 0 ? "PEARLS" : null);
      expect(tile(state, x, 13).resource).toBeNull();
      expect(tile(state, x, 15).resource).toBeNull();
    }
  });

  it("has the Mountain/Forest feature row and the resource row", () => {
    for (let x = 0; x < 16; x += 1) {
      const top = tile(state, x, 0);
      expect(top.terrain).toBe(x % 2 === 0 ? "MOUNTAIN" : "FOREST");
      expect(top.resource).toBe(
        x % 4 === 0 ? "ORE" : x % 4 === 1 ? "GAME" : null,
      );
      const second = tile(state, x, 1);
      expect(second.terrain).toBe("GRASS");
      expect(second.resource).toBe(
        x % 4 === 2 ? "FRUIT" : x % 4 === 3 ? "FERTILE_GROUND" : null,
      );
    }
    expect(state.treasureChests).toEqual([]);
    expect(state.graves).toEqual([]);
    expect(
      state.board.tiles.some(
        (entry) =>
          entry.site === "VILLAGE" ||
          entry.fieldDefense ||
          entry.improvement === "MONUMENT",
      ),
    ).toBe(false);
  });

  it("places seats in strips by seat count and leaves unused strips plain", () => {
    expect([0, 1].map((seat) => showcaseStripCenterXV7(seat, 1))).toEqual([
      2, 14,
    ]);
    expect([0, 1, 2].map((seat) => showcaseStripCenterXV7(seat, 2))).toEqual([
      2, 10, 14,
    ]);
    expect([0, 1, 2, 3].map((seat) => showcaseStripCenterXV7(seat, 3))).toEqual(
      [2, 6, 10, 14],
    );
    const two = rawShowcase(["GOBLIN", "UNDEAD"]);
    expect(
      two.cities.filter((city) => city.isCapital).map((city) => city.at),
    ).toEqual([
      { x: 2, y: 7 },
      { x: 14, y: 7 },
    ]);
    // Strips 1 and 2 (columns 5–7 and 9–11) and the neutral columns keep the
    // plain land and water rules.
    for (let y = 2; y < 16; y += 1)
      for (let x = 4; x <= 12; x += 1) {
        const entry = tile(two, x, y);
        expect(entry.site).toBeNull();
        expect(entry.improvement).toBeNull();
        expect(entry.road).toBe(false);
        expect(entry.territoryCityId).toBeNull();
        expect(entry.terrain).toBe(
          y <= 11 ? "GRASS" : y === 12 ? "SHALLOW_WATER" : "DEEP_WATER",
        );
        if (y <= 11) expect(entry.resource).toBeNull();
      }
    expect(two.units.some((unit) => unit.at.x >= 4 && unit.at.x <= 12)).toBe(
      false,
    );
    // Columns 0, 4, 8, and 12 stay neutral with all four strips in use.
    for (const x of [0, 4, 8, 12])
      for (let y = 0; y < 16; y += 1) {
        expect(tile(state, x, y).territoryCityId).toBeNull();
        expect(tile(state, x, y).road).toBe(false);
      }
  });
});

describe("ruleset-7 revision-18 Showcase cities", () => {
  const factions: readonly FactionIdV7[] = [
    "ORIGINAL",
    "UNDEAD",
    "GOBLIN",
    "UNDEAD",
  ];
  const state = rawShowcase(factions);
  const expectedTiles = (cx: number) =>
    [
      // North
      [cx - 1, 2, "FOREST", null, "LUMBER_CAMP", false, 1],
      [cx + 1, 2, "MOUNTAIN", "ORE", "MINE", false, 2],
      [cx - 1, 3, "GRASS", null, "SAWMILL", false, 2],
      [cx + 1, 3, "GRASS", null, "FORGE", false, 2],
      [cx - 1, 4, "FOREST", null, "LUMBER_CAMP", false, 1],
      [cx, 4, "GRASS", null, null, true, null],
      [cx + 1, 4, "MOUNTAIN", "ORE", "MINE", false, 2],
      // Capital
      [cx - 1, 6, "GRASS", "FERTILE_GROUND", "FARM", false, 2],
      [cx, 6, "GRASS", null, null, true, null],
      [cx + 1, 6, "GRASS", "FERTILE_GROUND", "FARM", false, 2],
      [cx - 1, 7, "GRASS", null, "WINDMILL", false, 2],
      [cx + 1, 7, "GRASS", null, "MARKET", false, null],
      [cx - 1, 8, "GRASS", "FERTILE_GROUND", "FARM", false, 2],
      [cx, 8, "GRASS", null, null, true, null],
      [cx + 1, 8, "GRASS", null, null, false, null],
      // Coast
      [cx - 1, 10, "GRASS", "FERTILE_GROUND", "FARM", false, 2],
      [cx, 10, "GRASS", null, null, true, null],
      [cx + 1, 10, "FOREST", "GAME", null, false, null],
      [cx - 1, 11, "GRASS", null, "WORKSHOP", false, 2],
      [cx + 1, 11, "GRASS", "FRUIT", null, false, null],
      [cx - 1, 12, "SHALLOW_WATER", null, "PORT", false, 2],
      [cx, 12, "SHALLOW_WATER", null, null, false, null],
      [cx + 1, 12, "SHALLOW_WATER", null, "SHIPYARD", false, 3],
      // The neutral Road tiles and the North city's top-middle tile
      [cx, 2, "GRASS", null, null, false, null],
      [cx, 5, "GRASS", null, null, true, null],
      [cx, 9, "GRASS", null, null, true, null],
    ] as const;

  it("gives every seat three walled cities with the section 5.3 templates", () => {
    expect(state.cities).toHaveLength(12);
    expect(state.pendingChoices).toEqual([]);
    state.players.forEach((player, seat) => {
      const cx = showcaseStripCenterXV7(seat, 3);
      const capitalId = 2 * seat + 1;
      const northId = 9 + 2 * seat;
      const coastId = 10 + 2 * seat;
      expect(player.originalCapitalCityId).toBe(capitalId);
      const byId = (id: number) => {
        const city = state.cities.find((entry) => entry.id === id);
        if (city === undefined) throw new Error(`city ${id} missing`);
        return city;
      };
      const common = {
        ownerId: player.id,
        expanded: false,
        landGrantUsed: false,
        cityActionAvailable: false,
      };
      expect(byId(capitalId)).toEqual({
        ...common,
        id: capitalId,
        at: { x: cx, y: 7 },
        isCapital: true,
        level: 5,
        permanentPopulation: 4,
        economicPopulation: 10,
        population: 0,
        rewards: [
          { reachedLevel: 2, reward: "SURVEY" },
          { reachedLevel: 3, reward: "WALLS" },
          { reachedLevel: 4, reward: "BOOM" },
          // The economy rejig (7r54): the giant is a level-6 reward.
          { reachedLevel: 5, reward: "TREASURY" },
        ],
      });
      expect(byId(northId)).toEqual({
        ...common,
        id: northId,
        at: { x: cx, y: 3 },
        isCapital: false,
        level: 4,
        permanentPopulation: 0,
        economicPopulation: 11,
        population: 2,
        rewards: [
          { reachedLevel: 2, reward: "SURVEY" },
          { reachedLevel: 3, reward: "WALLS" },
          { reachedLevel: 4, reward: "TREASURY_6" },
        ],
      });
      expect(byId(coastId)).toEqual({
        ...common,
        id: coastId,
        at: { x: cx, y: 11 },
        isCapital: false,
        // The naval branch (`pulp_wars-5ti.2`): every technology is
        // researched, so Harbours adds 1 to the Port and 1 to the Shipyard
        // (8 -> 10) and the Coast city is level 4 (it was 3).
        level: 4,
        permanentPopulation: 0,
        economicPopulation: 10,
        population: 1,
        rewards: [
          { reachedLevel: 2, reward: "SURVEY" },
          { reachedLevel: 3, reward: "WALLS" },
          { reachedLevel: 4, reward: "TREASURY_6" },
        ],
      });
      expect(tile(state, cx, 7).site).toBe("CAPITAL");
      expect(tile(state, cx, 3).site).toBe("CITY");
      expect(tile(state, cx, 11).site).toBe("CITY");
      // Territory: exactly the centered 3 x 3 footprint of each city.
      for (const [id, cy] of [
        [northId, 3],
        [capitalId, 7],
        [coastId, 11],
      ] as const) {
        const owned = state.board.tiles
          .filter((entry) => entry.territoryCityId === id)
          .map((entry) => entry.at);
        const footprint: CoordV7[] = [];
        for (let y = cy - 1; y <= cy + 1; y += 1)
          for (let x = cx - 1; x <= cx + 1; x += 1) footprint.push({ x, y });
        expect(owned).toEqual(footprint);
      }
      for (const [x, y, terrain, resource, improvement, road] of expectedTiles(
        cx,
      )) {
        const entry = tile(state, x, y);
        expect(
          {
            terrain: entry.terrain,
            resource: entry.resource,
            improvement: entry.improvement,
            road: entry.road,
          },
          `${x},${y}`,
        ).toEqual({ terrain, resource, improvement, road });
      }
      expect(tile(state, cx, 5).territoryCityId).toBeNull();
      expect(tile(state, cx, 9).territoryCityId).toBeNull();
    });
    // Ten of the eleven improvements appear; the Monument does not.
    expect(
      new Set(
        state.board.tiles.flatMap((entry) =>
          entry.improvement === null ? [] : [entry.improvement],
        ),
      ).size,
    ).toBe(10);
  });

  it("shows Walls on every city and no reward choice in the public view", () => {
    for (const player of state.players) {
      const view = viewForV7(state, player.id);
      expect(view.pendingChoices).toEqual([]);
      expect(view.cities).toHaveLength(12);
      for (const city of view.cities)
        expect(city.rewards.some((reward) => reward.reward === "WALLS")).toBe(
          true,
        );
    }
  });

  it("stores the ordinary population ledger, recomputed from the engine rules", () => {
    const graph = { board: state.board, cities: state.cities };
    state.players.forEach((player, seat) => {
      const cx = showcaseStripCenterXV7(seat, 3);
      const capitalId = 2 * seat + 1;
      const records = state.populationContributions.filter((entry) =>
        state.cities.some(
          (city) => city.id === entry.cityId && city.ownerId === player.id,
        ),
      );
      // Permanent: the capital's Boom (3, at its center) and one harvested
      // Fruit (1) at (cx + 1, 8). No other permanent record exists.
      expect(records.filter((entry) => entry.category === "PERMANENT")).toEqual(
        [
          {
            id: expect.any(Number) as number,
            cityId: capitalId,
            category: "PERMANENT",
            amount: 3,
            source: {
              kind: "CITY_REWARD",
              reward: "BOOM",
              reachedLevel: 4,
              at: { x: cx, y: 7 },
            },
          },
          {
            id: expect.any(Number) as number,
            cityId: capitalId,
            category: "PERMANENT",
            amount: 1,
            source: {
              kind: "RESOURCE_ACTION",
              action: "HARVEST_FRUIT",
              at: { x: cx + 1, y: 8 },
            },
          },
        ],
      );
      // Live: one record per improvement except the Market, with the value
      // the spatial rules compute and the section 5.3 table states.
      const live = records.filter((entry) => entry.category === "LIVE");
      const improved = expectedTiles(cx).filter(
        ([, , , , improvement]) =>
          improvement !== null && improvement !== "MARKET",
      );
      expect(live).toHaveLength(improved.length);
      for (const [x, y, , , improvement, , amount] of improved) {
        const record = live.find(
          (entry) => entry.source.at.x === x && entry.source.at.y === y,
        );
        expect(record?.source, `${x},${y}`).toEqual({
          kind: "IMPROVEMENT",
          improvement,
          at: { x, y },
        });
        expect(record?.amount, `${x},${y}`).toBe(amount);
        if (improvement !== "PORT" && improvement !== "SHIPYARD")
          expect(
            spatialContributionAtV7(graph, { x, y }, improvement ?? "FARM")
              .population,
            `${x},${y}`,
          ).toBe(amount);
      }
      // The Market pays 2 Coins: one adjacent family (agriculture).
      expect(
        spatialContributionAtV7(graph, { x: cx + 1, y: 7 }, "MARKET")
          .marketIncome,
      ).toBe(2);
    });
    // Road population: +2 for a capital, +1 for each other city; and
    // population = permanent + live - growthSpent(level), within 0..level.
    for (const city of state.cities) {
      const entries = state.populationContributions.filter(
        (entry) => entry.cityId === city.id,
      );
      const sum = (category: string) =>
        entries
          .filter((entry) => entry.category === category)
          .reduce((total, entry) => total + entry.amount, 0);
      const road = roadPopulationForCityV7(state, city);
      expect(road).toBe(city.isCapital ? 2 : 1);
      // North (odd ID) holds 10; Coast (even ID) 9: 7 and, with Harbours,
      // one more from each dock (`pulp_wars-5ti.2`).
      expect(sum("LIVE")).toBe(city.isCapital ? 8 : city.id % 2 === 1 ? 10 : 9);
      expect(city.economicPopulation).toBe(sum("LIVE") + road);
      expect(city.permanentPopulation).toBe(sum("PERMANENT"));
      expect(city.population).toBe(
        city.permanentPopulation +
          city.economicPopulation -
          growthSpentV7(city.level),
      );
      expect(city.population).toBeGreaterThanOrEqual(0);
      expect(city.population).toBeLessThanOrEqual(city.level);
    }
  });

  // Tuning 1 (`pulp_wars-w49.3`, 7r46): land trade pays 2 Coins, so the two
  // connected cities pay 6 each and the total is 19 (17 before). Tuning 3
  // (`pulp_wars-w49.3`): the capital of a Road-linked seat earns land trade
  // too (9, was 7), so the total is 21.
  // Tuning 4: land trade pays 1 Coin, so 8 + 5 + 5 = 18.
  it("pays the stated first income: 18 Coins, or 15 for a Goblin seat", () => {
    state.players.forEach((player, seat) => {
      const income = playerIncomeV7(state, player.id);
      const goblin = player.faction === "GOBLIN";
      expect(income.totalCoins).toBe(goblin ? 15 : 18);
      expect(income.cities).toEqual([
        { cityId: 2 * seat + 1, coins: goblin ? 7 : 8 },
        { cityId: 9 + 2 * seat, coins: goblin ? 4 : 5 },
        { cityId: 10 + 2 * seat, coins: goblin ? 4 : 5 },
      ]);
    });
    // The first seat's Start Turn runs at creation and pays that income.
    for (const [faction, coins] of [
      ["ORIGINAL", 21],
      ["UNDEAD", 21],
      ["GOBLIN", 18],
    ] as const) {
      const created = playableShowcase([faction, "ORIGINAL"]);
      expect(created.state.players.map((player) => player.coins)).toEqual([
        coins,
        3,
      ]);
      expect(created.events[0]).toEqual({
        kind: "TURN_STARTED",
        playerId: 1,
        coins,
      });
    }
  });
});

describe("ruleset-7 revision-18 Showcase players and units", () => {
  it("starts every seat with 23 technologies, 256 explored cells, and 3 Coins", () => {
    const state = rawShowcase(["GOBLIN", "ORIGINAL", "UNDEAD"]);
    expect(TECHNOLOGY_IDS_V7).toHaveLength(25);
    for (const player of state.players) {
      expect(player.researchedTechs).toEqual(TECHNOLOGY_IDS_V7);
      expect(player.explored).toHaveLength(256);
      expect(player.coins).toBe(3);
      expect(player.status).toBe("ACTIVE");
      expect(player.achievementEntitlements).toEqual([
        { achievement: "EXPLORER", unlocked: false, spent: false },
        { achievement: "ENGINEER", unlocked: false, spent: false },
        { achievement: "MUSTER", unlocked: false, spent: false },
        // Revision 21.
        { achievement: "CONQUEROR", unlocked: false, spent: false },
        { achievement: "LAND_BARON", unlocked: false, spent: false },
        { achievement: "SEA_DOG", unlocked: false, spent: false },
        { achievement: "SLAYER", unlocked: false, spent: false },
      ]);
      // Every unit of every seat is visible to every seat.
      // (The ninth unit, `pulp_wars-w49.17`, 7r55: twelve units a seat.)
      expect(viewForV7(state, player.id).units).toHaveLength(36);
    }
    expect(state.turnOrder).toEqual([1, 2, 3]);
    expect(state.activeSeatIndex).toBe(0);
    expect(state.round).toBe(1);
  });

  it("unlocks Explorer and Muster, not Engineer or Sea Dog, at each seat's first evaluation", () => {
    const created = playableShowcase(["UNDEAD", "GOBLIN", "ORIGINAL"]);
    // Explorer, Engineer, Muster, then the revision-21 Conqueror, Land Baron,
    // Sea Dog, and Slayer: three cities complete no Land Baron. The naval
    // branch (`pulp_wars-5ti.2`): with the Submarine every seat has three
    // ships, which was Sea Dog until the economy rejig (7r54: five). Its
    // seven trainable land roles and three ships are Muster (six kinds).
    // All 256 tiles are explored, which is Explorer.
    const unlocked = (state: GameStateV7, seat: number) =>
      state.players[seat]?.achievementEntitlements.map(
        (entry) => entry.unlocked,
      );
    const REST = [false, false, false, false];
    expect(
      created.events.filter((event) => event.kind === "ACHIEVEMENT_UNLOCKED"),
    ).toEqual([
      { kind: "ACHIEVEMENT_UNLOCKED", playerId: 1, achievement: "EXPLORER" },
      { kind: "ACHIEVEMENT_UNLOCKED", playerId: 1, achievement: "MUSTER" },
    ]);
    expect(unlocked(created.state, 0)).toEqual([true, false, true, ...REST]);
    expect(unlocked(created.state, 1)).toEqual([
      false,
      false,
      false,
      false,
      false,
      false,
      false,
    ]);
    let state = created.state;
    for (const seat of [1, 2]) {
      const ended = applyCommandV7(
        state,
        state.turnOrder[state.activeSeatIndex] as never,
        { kind: "END_TURN" },
      );
      if (!ended.accepted) throw new Error("END_TURN rejected");
      state = ended.state;
      expect(unlocked(state, seat)).toEqual([true, false, true, ...REST]);
    }
    // Nothing is left to research for any faction.
    for (const player of state.players) {
      const tree = queryTechnologyTreeV7(state, player.id);
      expect(tree.nodes).toHaveLength(25);
      expect(tree.nodes.every((node) => node.state === "OWNED")).toBe(true);
    }
    expect(
      queryPlayerCommandsV7(state, state.humanPlayerId).some(
        (command) => command.kind === "RESEARCH",
      ),
    ).toBe(false);
  });

  it("gives every seat ten units with the section 5.4 roles, tiles, forms, homes, and IDs", () => {
    const factions: readonly FactionIdV7[] = [
      "ORIGINAL",
      "UNDEAD",
      "GOBLIN",
      "ORIGINAL",
    ];
    const state = rawShowcase(factions);
    // The ninth unit (`pulp_wars-w49.17`, 7r55): every role, the heavy
    // line role last (`SHOWCASE_ROLE_IDS_V7`).
    expect(SHOWCASE_UNIT_TEMPLATES_V7.map((entry) => entry.role)).toEqual(
      UNIT_ROLE_IDS_V7,
    );
    expect(state.units).toHaveLength(48);
    // IDs: capital 2s + 1 and FIGHTER 2s + 2; then North and Coast cities
    // (9–16), the 16 ledger records per seat (17–80), then ten units each.
    expect(state.populationContributions.map((entry) => entry.id)).toEqual(
      Array.from({ length: 64 }, (_, index) => 17 + index),
    );
    // (The four ninth units take 121 to 124, after every other unit, so no
    // older unit has a new ID.)
    expect(state.nextEntityId).toBe(125);
    const table = [
      ["FIGHTER", 0, 7, "LAND", "CAPITAL"],
      ["RAIDER", -1, 5, "LAND", "NORTH"],
      ["MARKSMAN", 0, 5, "LAND", "NORTH"],
      ["GUARD", 1, 5, "LAND", "NORTH"],
      ["CAPTAIN", -1, 9, "LAND", "CAPITAL"],
      ["CATAPULT", 0, 9, "LAND", "CAPITAL"],
      ["KNIGHT", 1, 9, "LAND", "CAPITAL"],
      ["JUGGERNAUT", 1, 8, "LAND", "CAPITAL"],
      ["PATROL_BOAT", 0, 12, "NAVAL", "COAST"],
      ["BATTLESHIP", 0, 13, "NAVAL", "COAST"],
      // The naval branch (`pulp_wars-5ti.2`): east of the Battleship.
      ["SUBMARINE", 1, 13, "NAVAL", "COAST"],
    ] as const;
    state.players.forEach((player, seat) => {
      const cx = showcaseStripCenterXV7(seat, 3);
      const homes = {
        CAPITAL: 2 * seat + 1,
        NORTH: 9 + 2 * seat,
        COAST: 10 + 2 * seat,
      };
      const own = state.units.filter((unit) => unit.ownerId === player.id);
      expect(own).toHaveLength(12);
      // The ninth unit: on the Road tile south of the North center, homed
      // there, with the last entity IDs. A faction whose heavy is a unit
      // it already had keeps that unit on its old tile, as the heavy role,
      // and fields its new unit here (`showcaseUnitRoleV7`).
      expect(own[11], `${player.faction} ninth`).toMatchObject({
        id: 121 + seat,
        homeCityId: homes.NORTH,
        role: showcaseUnitRoleV7("SWORDSMAN", player.faction),
        form: "LAND",
        at: { x: cx, y: 4 },
      });
      table.forEach(([templateRole, dx, y, form, home], index) => {
        const role = showcaseUnitRoleV7(templateRole, player.faction);
        const rule = effectiveRoleRuleV7(role, player.faction);
        expect(own[index], `${player.faction} ${role}`).toEqual({
          id: index === 0 ? 2 * seat + 2 : 81 + 10 * seat + (index - 1),
          ownerId: player.id,
          homeCityId: homes[home],
          role,
          form,
          at: { x: cx + dx, y },
          hp: rule.maxHp,
          maxHp: rule.maxHp,
          kills: 0,
          veteran: false,
          captureEligible: false,
          activation: {
            moved: false,
            movedPathLength: 0,
            attacked: false,
            attacksUsed: 0,
            tendedThisTurn: false,
            inspired: false,
            overrunActive: false,
            escapeAvailable: false,
            recovered: false,
            captured: false,
            handled: false,
            specialActed: false,
          },
        });
      });
      // Within capacity: Capital 5 of 7, North 3 of 6, Coast 3 of 6 (level 4, with the Submarine), each
      // capacity one higher for a Goblin seat. Revision 19 (root decision):
      // a Dinosaur capital starts at 8 of 7 slots, because the Triceratops,
      // T-Rex, and Brontosaurus homed to it use two slots each
      // (tests/unit/ruleset-v7-dinosaur-faction.test.ts).
      const bonus = player.faction === "GOBLIN" ? 1 : 0;
      for (const [home, assigned, capacity] of [
        ["CAPITAL", player.faction === "DINOSAUR" ? 8 : 5, 7],
        // (7r55: North also homes the ninth unit.)
        ["NORTH", 4, 6],
        ["COAST", 3, 6],
      ] as const) {
        const city = state.cities.find((entry) => entry.id === homes[home]);
        if (city === undefined) throw new Error("home city missing");
        expect(assignedUnitCountV7(state, city.id)).toBe(assigned);
        expect(cityUnitCapacityV7(state, city)).toBe(capacity + bonus);
      }
      // Both docks start empty.
      expect(
        state.units.some(
          (unit) =>
            unit.at.y === 12 && (unit.at.x === cx - 1 || unit.at.x === cx + 1),
        ),
      ).toBe(false);
    });
    expect(
      FACTION_IDS_V7.map(
        (faction) => effectiveRoleRuleV7("JUGGERNAUT", faction).label,
      ),
    ).toEqual([
      "Juggernaut",
      "Abomination",
      "Troll",
      "Brontosaurus",
      "Colossus",
      "Frost Giant",
      // The Dwarf revision (`pulp_wars-78i.3`).
      "Brass Titan",
      // The Candy revision (`pulp_wars-jdb.3`).
      "Gingerbread Giant",
    ]);
  });
});

describe("ruleset-7 revision-18 Showcase determinism", () => {
  it("gives equal setups equal states and ignores the seed for everything but setup.seed and random", () => {
    const first = playableShowcase(THREE, { seed: 7 });
    const repeat = playableShowcase(THREE, { seed: 7 });
    expect(canonicalHash(repeat.state)).toBe(canonicalHash(first.state));
    expect(first.mapAttempt).toBe(1);
    const other = playableShowcase(THREE, { seed: 4_294_967_295 });
    expect(canonicalHash(other.state)).not.toBe(canonicalHash(first.state));
    expect(other.state.random).toEqual(randomState(4_294_967_295));
    expect(first.state.random).toEqual(randomState(7));
    expect(
      canonicalJson({
        ...other.state,
        setup: first.state.setup,
        random: first.state.random,
      }),
    ).toBe(canonicalJson(first.state));
    expect(other.events).toEqual(first.events);
  });

  it("keeps board, cities, records, positions, and IDs across faction mixes", () => {
    const base = rawShowcase(["ORIGINAL", "ORIGINAL", "ORIGINAL"]);
    const mixed = rawShowcase(["GOBLIN", "UNDEAD", "GOBLIN"]);
    expect(mixed.board).toEqual(base.board);
    expect(mixed.cities).toEqual(base.cities);
    expect(mixed.populationContributions).toEqual(base.populationContributions);
    expect(mixed.nextEntityId).toBe(base.nextEntityId);
    expect(mixed.turnOrder).toEqual(base.turnOrder);
    const placement = (state: GameStateV7) =>
      state.units.map(({ id, ownerId, homeCityId, role, form, at }) => ({
        id,
        ownerId,
        homeCityId,
        role,
        form,
        at,
      }));
    expect(placement(mixed)).toEqual(placement(base));
    expect(mixed.units.map((unit) => unit.maxHp)).not.toEqual(
      base.units.map((unit) => unit.maxHp),
    );
  });
});

describe("ruleset-7 revision-18 Showcase play", () => {
  it("passes the state schema and offers every role of every faction a command on turn 1", () => {
    for (const faction of FACTION_IDS_V7) {
      const created = playableShowcase([faction, "ORIGINAL", "UNDEAD"]);
      const state = created.state;
      expect(parseGameStateV7(JSON.parse(JSON.stringify(state)))).toEqual(
        state,
      );
      const commands = queryPlayerCommandsV7(state, state.humanPlayerId);
      const own = state.units.filter(
        (unit) => unit.ownerId === state.humanPlayerId,
      );
      // The frozen sea (`pulp_wars-5ti.3`): an Ice Folk seat has no ships.
      const shipless = faction === "ICE_FOLK";
      expect(own).toHaveLength(shipless ? 9 : 12);
      for (const unit of own) {
        const offered = commands.filter(
          (command) => "unitId" in command && command.unitId === unit.id,
        );
        expect(offered.length, `${faction} ${unit.role}`).toBeGreaterThan(0);
        // Every offered command of the unit is accepted by the engine.
        for (const command of offered)
          expect(
            applyCommandV7(state, state.humanPlayerId, command).accepted,
            `${faction} ${unit.role} ${command.kind}`,
          ).toBe(true);
      }
      // Training is possible from the first turn, on land and at the docks
      // (a Dinosaur seat lays its egg-laid roles as Eggs, revision 19).
      const trained = new Set(
        commands.flatMap((command) =>
          command.kind === "TRAIN" ||
          command.kind === "TRAIN_NAVAL" ||
          command.kind === "LAY_EGG"
            ? [command.role]
            : [],
        ),
      );
      expect([...trained].sort()).toEqual(
        UNIT_ROLE_IDS_V7.filter(
          (role) =>
            role !== "JUGGERNAUT" &&
            // (The ninth unit, 7r55: every seat trains its heavy.)
            !(shipless && isNavalRoleV7(role)),
        ).sort(),
      );
      expect(commands.at(-1)).toEqual({ kind: "END_TURN" });
    }
  }, 120_000);

  it("does not start in the Normal AI endgame siege mode", () => {
    for (const aiMode of ["RIVAL", "COOPERATIVE"] as const) {
      const state = playableShowcase(
        ["ORIGINAL", "UNDEAD", "GOBLIN", "ORIGINAL"],
        { aiMode },
      ).state;
      for (const player of state.players) {
        const view = viewForV7(state, player.id);
        expect(
          endgamePlanForPolicyV7(view, (ownerId) =>
            arePlayersHostileV7(state, player.id, ownerId),
          ),
        ).toBeNull();
      }
    }
  });

  it("round-trips a played Showcase match through save and replay", () => {
    const setup = showcaseSetup(["UNDEAD", "GOBLIN"], { seed: 99 });
    const created = createPlayableGameV7(setup);
    if (!created.ok) throw new Error("Showcase rejected");
    let state = created.state;
    let replay = createReplayV7(setup);
    for (let step = 0; step < 6; step += 1) {
      const actor = state.turnOrder[state.activeSeatIndex];
      if (actor === undefined) throw new Error("actor missing");
      const offered = queryPlayerCommandsV7(state, actor);
      const command =
        step % 3 === 2
          ? { kind: "END_TURN" as const }
          : (offered.find((entry) => entry.kind === "MOVE") ??
            ({ kind: "END_TURN" } as const));
      const result = applyCommandV7(state, actor, command);
      if (!result.accepted) throw new Error(`${command.kind} rejected`);
      state = result.state;
      replay = appendReplayCommandV7(replay, command, state);
    }
    expect(state.commandIndex).toBe(6);
    const replayed = runReplayV7(JSON.parse(JSON.stringify(replay)));
    expect(replayed.stateHash).toBe(canonicalHash(state));
    const save = createSaveEnvelopeV7(
      { state, replay },
      "2026-10-01T00:00:00.000Z",
    );
    const loaded = parseSaveV7(JSON.stringify(save));
    if (loaded.kind !== "VALID") throw new Error(loaded.diagnostic);
    expect(loaded.save.setup.mapType).toBe("SHOWCASE");
    expect(loaded.save.stateHash).toBe(canonicalHash(state));
    expect(canonicalHash(loaded.save.state)).toBe(canonicalHash(state));
  });

  // Every faction plays as a Normal seat in a two-seat and a four-seat match.
  it.each<readonly [readonly FactionIdV7[]]>([
    [["ORIGINAL", "UNDEAD"]],
    [["GOBLIN", "GOBLIN"]],
    [["UNDEAD", "GOBLIN", "ORIGINAL", "GOBLIN"]],
  ])(
    "plays Normal against Normal %j for 20 rounds with no policy error",
    { timeout: 600_000 },
    (factions) => {
      const result = runAiMatchV7(showcaseSetup(factions), { maxRounds: 20 });
      expect(result.errors).toEqual([]);
      expect(result.stalls).toEqual([]);
      expect(["OUTCOME", "ROUND_CAP"]).toContain(result.termination);
      expect(
        result.termination === "ROUND_CAP" ? result.rounds : 20,
      ).toBeGreaterThanOrEqual(20);
      expect(result.acceptedCommands).toBeGreaterThan(40);
      expect(parseGameStateV7(result.state)).not.toBeNull();
    },
  );
});
