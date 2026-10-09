import { describe, expect, it } from "vitest";
import {
  EGG_HP_V7,
  TECHNOLOGY_IDS_V7,
  UNIT_ROLE_IDS_V7,
  achievementProgressV7,
  applyCommandV7,
  assignedUnitCountV7,
  createPlayableGameV7,
  effectiveRoleRuleV7,
  eggActivationV7,
  estimateCombatV7,
  factionTreeV7,
  nestTilesV7,
  parseEventV7,
  parseGameStateV7,
  previewCityCapacityV7,
  previewDisbandV7,
  previewHatchV7,
  previewLayEggV7,
  projectEventsV7,
  queryCombatPreviewV7,
  queryPlayerCommandsV7,
  queryUnitStatsV7,
  recomputeLiveEconomyV7,
  unitSightRadiusAtV7,
  viewForV7,
  RULESET_7_ID,
  type CommandV7,
  type CoordV7,
  type DomainEventV7,
  type FactionIdV7,
  type GameStateV7,
  type MatchSetupV7,
  type PopulationContributionV7,
  type TechnologyIdV7,
  type TileStateV7,
  type UnitRoleIdV7,
} from "../../src/engine/index";
import { checkedV7, mirrorOptionV7 } from "../fixtures/v7-builders";
import {
  cityOfV7,
  eggEntryAtV7,
  rewardStateV7,
  withEggsV7,
  withKillsV7,
  withTileV7,
  type EggPieceV7,
} from "../fixtures/v7-dinosaur-arena";
import {
  applyOkV7,
  endTurnUntilV7,
  goblinArenaV7,
  sameV7,
  seatIdV7,
  unitAtV7,
  type GoblinArenaOptionsV7,
  type GoblinPieceV7,
} from "../fixtures/v7-goblin-arena";

// Revision 19 (`pulp_wars-c87.3`) Eggs: laying, the Egg unit, hatching,
// Shaman Hatch, Nesting, destruction, capture, and Disband
// (docs/product/RULESET_7_REVISION_19_DINOSAURS.md section 6).
//
// Two-seat arena: seat 0 capital (8, 8) with territory x 7-9, y 7-9; seat 1
// capital (2, 8) with territory x 1-3, y 7-9; villages (5, 5), (8, 5),
// (5, 8). The eight tiles around a capital are its nest tiles.

const EGG_LAID_ROLES = [
  "RAIDER",
  "MARKSMAN",
  "GUARD",
  // The ninth unit (7r55): the Stegosaurus (`CATAPULT`) and the
  // Triceratops (`SWORDSMAN`, the last role ID).
  "CATAPULT",
  "KNIGHT",
  "SWORDSMAN",
] as const satisfies readonly UnitRoleIdV7[];

const kinds = (events: readonly DomainEventV7[]): readonly string[] =>
  events.map((event) => event.kind);

/**
 * Every technology except `excluded` and the technologies that need them
 * (the state schema requires researched prerequisites).
 */
function without(...excluded: TechnologyIdV7[]): readonly TechnologyIdV7[] {
  const removed = new Set<TechnologyIdV7>(excluded);
  const nodes = factionTreeV7("DINOSAUR").nodes;
  for (let changed = true; changed;) {
    changed = false;
    for (const node of nodes)
      if (
        !removed.has(node.id) &&
        node.prerequisites.some((tech) => removed.has(tech))
      ) {
        removed.add(node.id);
        changed = true;
      }
  }
  return TECHNOLOGY_IDS_V7.filter((tech) => !removed.has(tech));
}

/** Exactly `techs` and their prerequisites, in technology order. */
function only(...techs: TechnologyIdV7[]): readonly TechnologyIdV7[] {
  const kept = new Set<TechnologyIdV7>(techs);
  const nodes = factionTreeV7("DINOSAUR").nodes;
  for (let changed = true; changed;) {
    changed = false;
    for (const node of nodes)
      if (kept.has(node.id))
        for (const tech of node.prerequisites)
          if (!kept.has(tech)) {
            kept.add(tech);
            changed = true;
          }
  }
  return TECHNOLOGY_IDS_V7.filter((tech) => kept.has(tech));
}

/** A Dinosaur seat 0 against `opponent`, with pieces and Eggs. */
function dino(
  pieces: readonly GoblinPieceV7[] = [],
  eggs: readonly EggPieceV7[] = [],
  options: GoblinArenaOptionsV7 & { readonly opponent?: FactionIdV7 } = {},
): GameStateV7 {
  const arena = goblinArenaV7(
    ["DINOSAUR", options.opponent ?? "ORIGINAL"],
    pieces.length === 0
      ? [{ seat: 1, role: "FIGHTER", at: { x: 1, y: 1 } }]
      : pieces,
    options,
  );
  // Explorer is already unlocked (the arena explores the whole board), so
  // event lists hold only the events of the rule under test.
  const explored = checkedV7({
    ...arena,
    players: arena.players.map((player) => ({
      ...player,
      achievementEntitlements: player.achievementEntitlements.map((entry) =>
        entry.achievement === "EXPLORER" &&
        player.researchedTechs.includes("SCOUTING")
          ? { ...entry, unlocked: true }
          : entry,
      ),
    })),
  });
  return eggs.length === 0 ? explored : withEggsV7(explored, eggs);
}

/** Clears land tiles to open Grass. */
function grass(state: GameStateV7, tiles: readonly CoordV7[]): GameStateV7 {
  return checkedV7({
    ...state,
    board: {
      ...state.board,
      tiles: state.board.tiles.map((tile) =>
        tiles.some((at) => sameV7(at, tile.at)) && tile.site === null
          ? {
              ...tile,
              biome: "PLAINS" as const,
              terrain: "GRASS" as const,
              resource: null,
              improvement: null,
              road: false,
              fieldDefense: false,
            }
          : tile,
      ),
    },
  });
}

function patchTile(
  state: GameStateV7,
  at: CoordV7,
  patch: Partial<TileStateV7>,
): GameStateV7 {
  return checkedV7({
    ...state,
    board: {
      ...state.board,
      tiles: state.board.tiles.map((tile) =>
        sameV7(tile.at, at) ? { ...tile, ...patch } : tile,
      ),
    },
  });
}

function patchPlayer(
  state: GameStateV7,
  seat: number,
  patch: Partial<GameStateV7["players"][number]>,
): GameStateV7 {
  return checkedV7({
    ...state,
    players: state.players.map((player) =>
      player.seat === seat ? { ...player, ...patch } : player,
    ),
  });
}

function patchCity(
  state: GameStateV7,
  seat: number,
  patch: Partial<GameStateV7["cities"][number]>,
): GameStateV7 {
  const city = cityOfV7(state, seat);
  return checkedV7({
    ...state,
    cities: state.cities.map((candidate) =>
      candidate.id === city.id ? { ...candidate, ...patch } : candidate,
    ),
  });
}

function lay(
  state: GameStateV7,
  role: UnitRoleIdV7,
  at: CoordV7,
  seat = 0,
): Extract<CommandV7, { kind: "LAY_EGG" }> {
  return { kind: "LAY_EGG", cityId: cityOfV7(state, seat).id, role, at };
}

/** A level-2 seat-0 capital with a Mine and a Forge with positive output. */
function withActiveForge(base: GameStateV7): GameStateV7 {
  const city = cityOfV7(base, 0);
  const forgeAt = { x: 9, y: 7 };
  const mineAt = { x: 9, y: 8 };
  const contributions: PopulationContributionV7[] = [
    {
      id: base.nextEntityId,
      cityId: city.id,
      category: "LIVE",
      amount: 1,
      source: { kind: "IMPROVEMENT", improvement: "MINE", at: mineAt },
    },
    {
      id: base.nextEntityId + 1,
      cityId: city.id,
      category: "LIVE",
      amount: 1,
      source: { kind: "IMPROVEMENT", improvement: "FORGE", at: forgeAt },
    },
  ];
  const candidate: GameStateV7 = {
    ...base,
    nextEntityId: base.nextEntityId + contributions.length,
    board: {
      ...base.board,
      tiles: base.board.tiles.map((tile) =>
        sameV7(tile.at, forgeAt) || sameV7(tile.at, mineAt)
          ? {
              ...tile,
              biome: "HIGHLANDS" as const,
              terrain: "MOUNTAIN" as const,
              resource: sameV7(tile.at, mineAt) ? ("ORE" as const) : null,
              improvement: sameV7(tile.at, mineAt)
                ? ("MINE" as const)
                : ("FORGE" as const),
              road: false,
            }
          : tile,
      ),
    },
    populationContributions: contributions,
  };
  const economy = recomputeLiveEconomyV7(
    base,
    candidate,
    candidate.populationContributions,
  );
  return checkedV7({
    ...candidate,
    cities: economy.cities.map((item) =>
      item.id === city.id
        ? {
            ...item,
            level: 2,
            population: item.permanentPopulation + item.economicPopulation - 2,
            rewards: [{ reachedLevel: 2, reward: "STOCKPILE" as const }],
          }
        : item,
    ),
    populationContributions: economy.populationContributions,
  });
}

const NEST = { x: 7, y: 7 } as const;

describe("ruleset-7 revision-19 LAY_EGG legality", () => {
  it("rejects each requirement in the section 6.3 order and accepts the legal command", () => {
    const base = dino();
    const actor = base.humanPlayerId;
    const city = cityOfV7(base, 0);
    const enemyCity = cityOfV7(base, 1);
    const reject = (
      state: GameStateV7,
      command: CommandV7,
      code: string,
      params?: Record<string, unknown>,
    ): void => {
      const result = applyCommandV7(state, actor, command);
      expect(result).toMatchObject({
        accepted: false,
        events: [],
        error: params === undefined ? { code } : { code, params },
      });
      // Atomic: the input state is returned untouched.
      expect(result.state).toBe(state);
    };
    // 1. The city exists and the actor owns it.
    reject(
      base,
      { kind: "LAY_EGG", cityId: 999 as never, role: "RAIDER", at: NEST },
      "CITY_NOT_FOUND",
    );
    reject(
      base,
      { kind: "LAY_EGG", cityId: enemyCity.id, role: "RAIDER", at: NEST },
      "CITY_NOT_OWNED",
    );
    // A state that fails every later row at once: the action is spent, the
    // center is besieged, no technology, a full city, and no Coins.
    const everything = dino(
      [
        { seat: 1, role: "FIGHTER", at: city.at },
        { seat: 0, role: "FIGHTER", at: { x: 4, y: 3 } },
        { seat: 0, role: "FIGHTER", at: { x: 5, y: 3 } },
      ],
      [],
      { techs: { 0: [] }, coins: 0 },
    );
    const worst: CommandV7 = {
      kind: "LAY_EGG",
      cityId: city.id,
      role: "FIGHTER",
      at: { x: 40, y: 40 },
    };
    // 2. Its city action is available.
    reject(
      patchCity(everything, 0, { cityActionAvailable: false }),
      worst,
      "CITY_ACTION_SPENT",
      { cityId: city.id },
    );
    // 3. It is not besieged.
    reject(everything, worst, "CITY_BESIEGED", { cityId: city.id });
    // 4. The role is an egg-laid role of the actor's registration.
    const unbesieged = dino(
      [
        { seat: 1, role: "FIGHTER", at: { x: 1, y: 1 } },
        { seat: 0, role: "FIGHTER", at: { x: 4, y: 3 } },
        { seat: 0, role: "FIGHTER", at: { x: 5, y: 3 } },
      ],
      [],
      { techs: { 0: [] }, coins: 0 },
    );
    for (const role of [
      "FIGHTER",
      "CAPTAIN",
      "JUGGERNAUT",
      "PATROL_BOAT",
      "BATTLESHIP",
    ] as const)
      reject(unbesieged, { ...worst, role }, "UNIT_ROLE_INVALID", { role });
    // 5. The actor has researched the role's technology.
    reject(unbesieged, { ...worst, role: "RAIDER" }, "TECH_REQUIRED", {
      tech: "SCOUTING",
    });
    reject(unbesieged, { ...worst, role: "KNIGHT" }, "TECH_REQUIRED", {
      tech: "CHIVALRY",
    });
    // 6. `at` is on the board.
    const researched = patchPlayer(unbesieged, 0, {
      researchedTechs: only("SCOUTING"),
    });
    reject(researched, { ...worst, role: "RAIDER" }, "TILE_NOT_FOUND");
    // 7. `at` is a nest tile of the city (here: the center itself).
    reject(researched, lay(researched, "RAIDER", city.at), "INVALID_TILE", {
      action: "LAY_EGG",
    });
    // 8. Capacity (level 1 without Planning: two slots, both used).
    reject(researched, lay(researched, "RAIDER", NEST), "CITY_CAPACITY_FULL", {
      cityId: city.id,
    });
    // 9. Coins.
    const roomy = dino([], [], { techs: { 0: only("SCOUTING") }, coins: 3 });
    reject(roomy, lay(roomy, "RAIDER", NEST), "INSUFFICIENT_COINS", {
      cost: 4,
    });
    const funded = patchPlayer(roomy, 0, { coins: 4 });
    expect(
      applyCommandV7(funded, actor, lay(funded, "RAIDER", NEST)),
    ).toMatchObject({ accepted: true });
    // A Human seat has no egg-laid role.
    const human = goblinArenaV7(
      ["ORIGINAL", "DINOSAUR"],
      [{ seat: 1, role: "FIGHTER", at: { x: 1, y: 1 } }],
    );
    expect(
      applyCommandV7(human, human.humanPlayerId, lay(human, "RAIDER", NEST)),
    ).toMatchObject({
      accepted: false,
      error: { code: "UNIT_ROLE_INVALID", params: { role: "RAIDER" } },
    });
  });

  it("lays the Egg: cost, city action, unit, countdown, and event", () => {
    const state = dino([], [], {
      coins: 20,
      techs: { 0: without("FORTIFICATION") },
    });
    const actor = state.humanPlayerId;
    const city = cityOfV7(state, 0);
    const result = applyOkV7(state, actor, lay(state, "KNIGHT", NEST));
    const egg = unitAtV7(result.state, NEST);
    expect(egg).toEqual({
      id: state.nextEntityId,
      ownerId: actor,
      homeCityId: city.id,
      role: "KNIGHT",
      form: "EGG",
      at: NEST,
      hp: 6,
      maxHp: 6,
      kills: 0,
      veteran: false,
      captureEligible: false,
      activation: eggActivationV7(),
    });
    // Revision 20 section 3: a T-Rex Egg costs 14 and hatches in 4 turns.
    expect(result.state.eggs).toEqual([
      { unitId: egg.id, turnsRemaining: 4, laidThisTurn: true },
    ]);
    expect(result.events).toEqual([
      {
        kind: "EGG_LAID",
        playerId: actor,
        cityId: city.id,
        unitId: egg.id,
        role: "KNIGHT",
        cost: 14,
        at: NEST,
        hp: 6,
        turnsRemaining: 4,
      },
    ]);
    expect(parseEventV7(result.events[0]).ok).toBe(true);
    expect(result.state.nextEntityId).toBe(state.nextEntityId + 1);
    expect(result.state.random).toEqual(state.random);
    expect(
      result.state.players.find((player) => player.id === actor)?.coins,
    ).toBe(6);
    expect(cityOfV7(result.state, 0).cityActionAvailable).toBe(false);
    // The city action is shared: a second Egg, or a trained unit, must wait.
    expect(
      applyCommandV7(result.state, actor, lay(state, "RAIDER", { x: 8, y: 7 })),
    ).toMatchObject({ accepted: false, error: { code: "CITY_ACTION_SPENT" } });
    expect(
      applyCommandV7(result.state, actor, {
        kind: "TRAIN",
        cityId: city.id,
        role: "FIGHTER",
      }),
    ).toMatchObject({ accepted: false, error: { code: "CITY_ACTION_SPENT" } });
    // The state round-trips through the strict parser.
    expect(parseGameStateV7(JSON.parse(JSON.stringify(result.state)))).toEqual(
      result.state,
    );
  });

  it("accepts only nest tiles: the ring, land, this city's territory, no site, unit, or chest, Mountain with Engineering", () => {
    const base = dino();
    const actor = base.humanPlayerId;
    const city = cityOfV7(base, 0);
    expect(nestTilesV7(base, city)).toEqual([
      { x: 7, y: 7 },
      { x: 8, y: 7 },
      { x: 9, y: 7 },
      { x: 7, y: 8 },
      { x: 9, y: 8 },
      { x: 7, y: 9 },
      { x: 8, y: 9 },
      { x: 9, y: 9 },
    ]);
    const invalid = (state: GameStateV7, at: CoordV7): void => {
      expect(nestTilesV7(state, cityOfV7(state, 0))).not.toContainEqual(at);
      expect(
        queryPlayerCommandsV7(state, actor).filter(
          (command) => command.kind === "LAY_EGG" && sameV7(command.at, at),
        ),
      ).toEqual([]);
      expect(
        applyCommandV7(state, actor, lay(state, "RAIDER", at)),
      ).toMatchObject({
        accepted: false,
        error: { code: "INVALID_TILE", params: { action: "LAY_EGG" } },
      });
    };
    const valid = (state: GameStateV7, at: CoordV7): void => {
      expect(queryPlayerCommandsV7(state, actor)).toContainEqual(
        lay(state, "RAIDER", at),
      );
      expect(
        applyCommandV7(state, actor, lay(state, "RAIDER", at)).accepted,
      ).toBe(true);
    };
    // The center and a tile two away are not in the ring.
    invalid(base, city.at);
    invalid(base, { x: 6, y: 7 });
    // Territory of no city, and of another city.
    invalid(patchTile(base, NEST, { territoryCityId: null }), NEST);
    invalid(
      patchTile(base, NEST, { territoryCityId: cityOfV7(base, 1).id }),
      NEST,
    );
    // Water.
    invalid(
      dino([{ seat: 1, role: "FIGHTER", at: { x: 1, y: 1 } }], [], {
        water: [NEST],
      }),
      NEST,
    );
    // A unit of any owner (an own Caveman, a hostile Fighter, an own Egg).
    invalid(dino([{ seat: 0, role: "FIGHTER", at: NEST }]), NEST);
    invalid(dino([{ seat: 1, role: "FIGHTER", at: NEST }]), NEST);
    invalid(dino([], [{ seat: 0, role: "RAIDER", at: NEST }]), NEST);
    // A treasure chest.
    invalid(
      checkedV7({ ...grass(base, [NEST]), treasureChests: [NEST] }),
      NEST,
    );
    // A settlement site.
    invalid(patchTile(grass(base, [NEST]), NEST, { site: "VILLAGE" }), NEST);
    // A Mountain needs Engineering.
    const mountain = withTileV7(grass(base, [NEST]), NEST, {
      terrain: "MOUNTAIN",
    });
    valid(mountain, NEST);
    invalid(
      patchPlayer(mountain, 0, { researchedTechs: without("ENGINEERING") }),
      NEST,
    );
    // Forest, a Road, Field Defense, and an improved tile are all allowed.
    valid(withTileV7(grass(base, [NEST]), NEST, { terrain: "FOREST" }), NEST);
    valid(patchTile(base, NEST, { road: true, fieldDefense: true }), NEST);
    const forged = withActiveForge(base);
    valid(forged, { x: 9, y: 7 });
    valid(forged, { x: 9, y: 8 });
    // An Egg changes nothing on its tile.
    const laid = applyOkV7(
      forged,
      actor,
      lay(forged, "RAIDER", { x: 9, y: 7 }),
    );
    expect(laid.state.board).toEqual(forged.board);
  });

  it("lays on a Grave, which Raise Dead cannot use while the Egg stands", () => {
    // A Grave does not block a nest tile (matches with an Undead seat).
    const undead = dino(
      [{ seat: 1, role: "FIGHTER", at: { x: 1, y: 1 } }],
      [],
      {
        opponent: "UNDEAD",
      },
    );
    const graved = checkedV7({ ...undead, graves: [NEST] });
    const result = applyOkV7(
      graved,
      graved.humanPlayerId,
      lay(graved, "RAIDER", NEST),
    );
    expect(result.state.graves).toEqual([NEST]);
    // A Grave under an Egg is not eligible for Raise Dead while it stands.
    const necromancer = withEggsV7(
      checkedV7({
        ...goblinArenaV7(
          ["DINOSAUR", "UNDEAD"],
          [{ seat: 1, role: "CAPTAIN", at: { x: 6, y: 6 } }],
          { activeSeat: 1 },
        ),
        graves: [NEST],
      }),
      [{ seat: 0, role: "RAIDER", at: NEST }],
    );
    expect(
      applyCommandV7(necromancer, seatIdV7(necromancer, 1), {
        kind: "RAISE_DEAD",
        unitId: unitAtV7(necromancer, { x: 6, y: 6 }).id,
      }),
    ).toMatchObject({
      accepted: false,
      error: { code: "RAISE_DEAD_NOT_LEGAL", params: { reason: "NO_GRAVE" } },
    });
  });

  it("lays with an occupied center, while TRAIN still needs it empty", () => {
    const state = dino([
      { seat: 0, role: "FIGHTER", at: { x: 8, y: 8 } },
      { seat: 1, role: "FIGHTER", at: { x: 1, y: 1 } },
    ]);
    const actor = state.humanPlayerId;
    const city = cityOfV7(state, 0);
    expect(
      applyCommandV7(state, actor, {
        kind: "TRAIN",
        cityId: city.id,
        role: "FIGHTER",
      }),
    ).toMatchObject({
      accepted: false,
      error: { code: "CITY_SPAWN_OCCUPIED" },
    });
    expect(
      queryPlayerCommandsV7(state, actor).some(
        (command) => command.kind === "TRAIN",
      ),
    ).toBe(false);
    expect(queryPlayerCommandsV7(state, actor)).toContainEqual(
      lay(state, "RAIDER", NEST),
    );
    expect(
      applyCommandV7(state, actor, lay(state, "RAIDER", NEST)).accepted,
    ).toBe(true);
  });

  it("charges the printed cost minus Arms Industry, with a minimum of 1 and no other discount", () => {
    const plain = dino();
    for (const role of EGG_LAID_ROLES) {
      const event = applyOkV7(
        plain,
        plain.humanPlayerId,
        lay(plain, role, NEST),
      ).events[0];
      expect(event).toMatchObject({
        kind: "EGG_LAID",
        cost: effectiveRoleRuleV7(role, "DINOSAUR").cost,
      });
    }
    const forged = withActiveForge(plain);
    for (const [role, cost] of [
      ["RAIDER", 3],
      ["MARKSMAN", 3],
      ["GUARD", 4],
      ["CATAPULT", 6],
      ["SWORDSMAN", 7],
      ["KNIGHT", 13],
    ] as const) {
      const command = lay(forged, role, NEST);
      expect(
        applyOkV7(forged, forged.humanPlayerId, command).events[0],
      ).toMatchObject({ kind: "EGG_LAID", cost });
      expect(
        previewLayEggV7(
          viewForV7(forged, forged.humanPlayerId),
          command.cityId,
          role,
        ),
      ).toMatchObject({ cost, unavailableReason: null });
      // The offer equals the charge at the exact Coin boundary.
      const exact = patchPlayer(forged, 0, { coins: cost });
      expect(queryPlayerCommandsV7(exact, exact.humanPlayerId)).toContainEqual(
        command,
      );
      const short = patchPlayer(forged, 0, { coins: cost - 1 });
      expect(
        queryPlayerCommandsV7(short, short.humanPlayerId),
      ).not.toContainEqual(command);
      expect(applyCommandV7(short, short.humanPlayerId, command)).toMatchObject(
        {
          accepted: false,
          error: { code: "INSUFFICIENT_COINS", params: { cost } },
        },
      );
    }
  });

  it("offers one LAY_EGG per legal city, role, and nest tile in city, role, (y, x) order, all accepted", () => {
    const state = dino([
      { seat: 0, role: "FIGHTER", at: { x: 9, y: 9 } },
      { seat: 1, role: "FIGHTER", at: { x: 1, y: 1 } },
    ]);
    const actor = state.humanPlayerId;
    const offered = queryPlayerCommandsV7(state, actor).flatMap((command) =>
      command.kind === "LAY_EGG" ? [command] : [],
    );
    const tiles = nestTilesV7(state, cityOfV7(state, 0));
    expect(tiles).toHaveLength(7);
    // Capacity 3 (level 1 with Planning), one slot used: every role fits.
    expect(offered).toEqual(
      EGG_LAID_ROLES.flatMap((role) => tiles.map((at) => lay(state, role, at))),
    );
    for (const command of offered)
      expect(applyCommandV7(state, actor, command).accepted).toBe(true);
    // No free nest tile: nothing is offered for the city.
    const crowded = dino([
      ...tiles.map((at) => ({ seat: 1, role: "FIGHTER" as const, at })),
      { seat: 0, role: "FIGHTER" as const, at: { x: 9, y: 9 } },
    ]);
    expect(
      queryPlayerCommandsV7(crowded, actor).filter(
        (command) => command.kind === "LAY_EGG",
      ),
    ).toEqual([]);
    expect(
      previewLayEggV7(
        viewForV7(crowded, actor),
        cityOfV7(crowded, 0).id,
        "RAIDER",
      ),
    ).toMatchObject({ nestTiles: [], unavailableReason: "INVALID_TILE" });
  });

  it("previews laying with the reason that applies to any tile, in the legality order", () => {
    const base = dino([], [], { techs: { 0: without("FORTIFICATION") } });
    const actor = base.humanPlayerId;
    const city = cityOfV7(base, 0);
    // The T-Rex, a two-slot egg-laid role (revision 20: cost 14, hatch 4).
    const preview = (state: GameStateV7, role: UnitRoleIdV7 = "KNIGHT") =>
      previewLayEggV7(viewForV7(state, actor), city.id, role);
    expect(preview(base)).toEqual({
      cityId: city.id,
      role: "KNIGHT",
      cost: 14,
      slots: 2,
      usedSlots: 0,
      capacity: 3,
      hp: 6,
      turnsToHatch: 4,
      nestTiles: nestTilesV7(base, city),
      unavailableReason: null,
    });
    expect(preview(base, "SWORDSMAN")).toMatchObject({
      cost: 8,
      slots: 2,
      turnsToHatch: 2,
      unavailableReason: null,
    });
    // Not an egg-laid role, or not the viewer's city.
    expect(preview(base, "FIGHTER")).toBeNull();
    expect(
      previewLayEggV7(viewForV7(base, actor), cityOfV7(base, 1).id, "RAIDER"),
    ).toBeNull();
    const broke = patchPlayer(base, 0, { coins: 7 });
    expect(preview(broke)?.unavailableReason).toBe("INSUFFICIENT_COINS");
    const full = dino(
      [
        { seat: 0, role: "FIGHTER", at: { x: 4, y: 3 } },
        { seat: 0, role: "FIGHTER", at: { x: 5, y: 3 } },
        { seat: 0, role: "FIGHTER", at: { x: 6, y: 3 } },
        { seat: 1, role: "FIGHTER", at: { x: 1, y: 1 } },
      ],
      [],
      { coins: 0 },
    );
    // Revision 20: with Nesting the level-1 capital holds four slots
    // (level + 1, Planning, Nesting); three are used.
    expect(preview(full)).toMatchObject({
      usedSlots: 3,
      capacity: 4,
      unavailableReason: "CITY_CAPACITY_FULL",
    });
    expect(
      preview(patchPlayer(full, 0, { researchedTechs: without("CHIVALRY") }))
        ?.unavailableReason,
    ).toBe("TECH_REQUIRED");
    const besieged = dino([{ seat: 1, role: "FIGHTER", at: city.at }], [], {
      techs: { 0: [] },
      coins: 0,
    });
    expect(preview(besieged)?.unavailableReason).toBe("CITY_BESIEGED");
    expect(
      preview(patchCity(besieged, 0, { cityActionAvailable: false }))
        ?.unavailableReason,
    ).toBe("CITY_ACTION_SPENT");
    // Nesting: 10 HP and (revision 20) one more slot; since the Dinosaur
    // pass's correction (7r53) no turn off the hatch.
    expect(preview(dino())).toMatchObject({
      hp: 10,
      turnsToHatch: 4,
      capacity: 4,
    });
  });
});

describe("ruleset-7 revision-19 Egg state parsing", () => {
  const state = dino([], [{ seat: 0, role: "GUARD", at: NEST }]);
  const egg = unitAtV7(state, NEST);
  const entry = eggEntryAtV7(state, NEST);
  const withUnit = (patch: Record<string, unknown>): unknown => ({
    ...state,
    units: state.units.map((unit) =>
      unit.id === egg.id ? { ...unit, ...patch } : unit,
    ),
  });

  it("accepts an Egg on a land nest tile with its countdown entry", () => {
    expect(parseGameStateV7(JSON.parse(JSON.stringify(state)))).toEqual(state);
    expect(entry).toEqual({
      unitId: egg.id,
      turnsRemaining: 2,
      laidThisTurn: false,
    });
    expect(parseGameStateV7(withUnit({ hp: 10, maxHp: 10 }))).not.toBeNull();
    expect(
      parseGameStateV7({
        ...state,
        eggs: [{ ...entry, turnsRemaining: 1, laidThisTurn: true }],
      }),
    ).not.toBeNull();
  });

  it("rejects every malformed Egg of section 6.1", () => {
    const rejected = (candidate: unknown, label: string): void =>
      expect(parseGameStateV7(candidate), label).toBeNull();
    // Entries and Egg units must match one to one.
    rejected({ ...state, eggs: [] }, "Egg without an entry");
    rejected(
      {
        ...state,
        eggs: [entry],
        units: state.units.map((unit) =>
          unit.id === egg.id
            ? {
                ...unit,
                form: "LAND",
                hp: 20,
                maxHp: 20,
                activation: { ...unit.activation },
              }
            : unit,
        ),
      },
      "entry without an Egg",
    );
    rejected({ ...state, eggs: [entry, entry] }, "duplicate entry");
    const two = withEggsV7(state, [
      { seat: 0, role: "RAIDER", at: { x: 8, y: 7 } },
    ]);
    rejected({ ...two, eggs: [...two.eggs].reverse() }, "unsorted entries");
    // The countdown is 1 to the role's hatch time; the flag is a boolean.
    rejected({ ...state, eggs: [{ ...entry, turnsRemaining: 0 }] }, "zero");
    rejected({ ...state, eggs: [{ ...entry, turnsRemaining: 3 }] }, "over");
    rejected({ ...state, eggs: [{ ...entry, laidThisTurn: 0 }] }, "flag");
    // Only an egg-laid role of a Dinosaur seat.
    for (const role of ["FIGHTER", "CAPTAIN", "JUGGERNAUT"] as const)
      rejected(withUnit({ role }), `role ${role}`);
    // Only 6 or 10 maximum HP, no kills, not veteran, not capture eligible,
    // and the exhausted activation at all times.
    rejected(withUnit({ hp: 5, maxHp: 5 }), "maxHp 5");
    rejected(withUnit({ hp: 8, maxHp: 8 }), "maxHp 8");
    rejected(withUnit({ hp: 20, maxHp: 20 }), "role maxHp");
    rejected(withUnit({ kills: 1 }), "kills");
    rejected(withUnit({ veteran: true }), "veteran");
    rejected(withUnit({ captureEligible: true }), "captureEligible");
    for (const [key, value] of Object.entries({
      moved: false,
      attacked: false,
      attacksUsed: 0,
      handled: false,
      recovered: false,
      captured: false,
      specialActed: false,
      inspired: true,
      tendedThisTurn: true,
      movedPathLength: 1,
    }))
      rejected(
        withUnit({ activation: { ...egg.activation, [key]: value } }),
        `activation.${key}`,
      );
    // A home city that exists and is its owner's.
    rejected(withUnit({ homeCityId: null }), "orphan Egg");
    rejected(withUnit({ homeCityId: cityOfV7(state, 1).id }), "foreign home");
    rejected(withUnit({ homeCityId: 999 }), "missing home");
    // A land tile of the home city's territory next to its center.
    rejected(withUnit({ at: { x: 6, y: 7 } }), "outside the ring");
    rejected(withUnit({ at: { x: 4, y: 3 } }), "far away");
    rejected(
      patchTileRaw(state, NEST, { territoryCityId: null }),
      "neutral tile",
    );
    rejected(
      patchTileRaw(state, NEST, {
        biome: null,
        terrain: "SHALLOW_WATER",
      }),
      "water",
    );
    // Never an Egg of a seat that is not Dinosaur, or in a match without one.
    rejected(
      {
        ...state,
        players: state.players.map((player) =>
          player.seat === 0
            ? {
                ...player,
                faction: "ORIGINAL",
                factionTreeId: "ORIGINAL_BASELINE_V5",
              }
            : player,
        ),
        setup: { ...state.setup, factions: ["ORIGINAL", "ORIGINAL"] },
      },
      "no Dinosaur seat",
    );
    rejected(
      withUnit({
        ownerId: seatIdV7(state, 1),
        homeCityId: cityOfV7(state, 1).id,
        at: { x: 1, y: 7 },
      }),
      "Human Egg",
    );
    // An Egg takes no status.
    const undead = dino(
      [{ seat: 1, role: "CATAPULT", at: { x: 1, y: 1 } }],
      [{ seat: 0, role: "GUARD", at: NEST }],
      { opponent: "UNDEAD" },
    );
    const undeadEgg = unitAtV7(undead, NEST);
    rejected(
      {
        ...undead,
        plagued: [
          {
            unitId: undeadEgg.id,
            sourceUnitId: unitAtV7(undead, { x: 1, y: 1 }).id,
            turnsRemaining: 3,
          },
        ],
      },
      "plagued Egg",
    );
    rejected(
      {
        ...undead,
        bitten: [
          {
            unitId: undeadEgg.id,
            biterPlayerId: seatIdV7(undead, 1),
            biterUnitId: unitAtV7(undead, { x: 1, y: 1 }).id,
          },
        ],
      },
      "bitten Egg",
    );
  });

  function patchTileRaw(
    source: GameStateV7,
    at: CoordV7,
    patch: Partial<TileStateV7>,
  ): unknown {
    return {
      ...source,
      board: {
        ...source.board,
        tiles: source.board.tiles.map((tile) =>
          sameV7(tile.at, at) ? { ...tile, ...patch } : tile,
        ),
      },
    };
  }
});

describe("ruleset-7 revision-19 Egg unit", () => {
  it("rejects every unit command naming an Egg with UNIT_IS_EGG and offers only Disband", () => {
    const state = dino(
      [
        { seat: 0, role: "CAPTAIN", at: { x: 6, y: 6 } },
        { seat: 1, role: "FIGHTER", at: { x: 6, y: 7 } },
      ],
      [{ seat: 0, role: "SWORDSMAN", at: NEST, hp: 3 }],
    );
    const actor = state.humanPlayerId;
    const egg = unitAtV7(state, NEST);
    const target = unitAtV7(state, { x: 6, y: 7 });
    const commands: readonly CommandV7[] = [
      { kind: "MOVE", unitId: egg.id, path: [{ x: 6, y: 8 }] },
      { kind: "ATTACK", unitId: egg.id, targetUnitId: target.id },
      { kind: "RALLY", unitId: egg.id },
      { kind: "TEND_WOUNDED", unitId: egg.id },
      { kind: "HATCH", unitId: egg.id, eggUnitId: egg.id },
      { kind: "RECOVER", unitId: egg.id },
      { kind: "CAPTURE", unitId: egg.id },
      { kind: "PROMOTE", unitId: egg.id },
      { kind: "PILLAGE", unitId: egg.id },
      { kind: "WAIT", unitId: egg.id },
      { kind: "BUILD_FIELD_DEFENSE", unitId: egg.id },
      { kind: "DISEMBARK", unitId: egg.id, at: { x: 6, y: 8 } },
      { kind: "KABOOM", unitId: egg.id },
      { kind: "RAISE_DEAD", unitId: egg.id },
      { kind: "DEVOUR", unitId: egg.id },
      { kind: "WAIL", unitId: egg.id },
    ];
    for (const command of commands)
      expect(applyCommandV7(state, actor, command), command.kind).toEqual({
        accepted: false,
        state,
        events: [],
        error: { code: "UNIT_IS_EGG", params: { unitId: egg.id } },
      });
    // The ordinary unit errors come first for a foreign Egg.
    const foreign = checkedV7({
      ...state,
      activeSeatIndex: state.turnOrder.indexOf(seatIdV7(state, 1)),
    });
    expect(
      applyCommandV7(foreign, seatIdV7(state, 1), {
        kind: "WAIT",
        unitId: egg.id,
      }),
    ).toMatchObject({ accepted: false, error: { code: "UNIT_NOT_OWNED" } });
    expect(
      queryPlayerCommandsV7(state, actor).filter(
        (command) => "unitId" in command && command.unitId === egg.id,
      ),
    ).toEqual([{ kind: "DISBAND", unitId: egg.id }]);
    // An Egg is never a unit waiting for orders: it is handled at all times.
    expect(egg.activation.handled).toBe(true);
  });

  it("never retaliates, and defends with 1 with no cover or fortification", () => {
    for (const change of [
      {},
      { terrain: "FOREST" as const },
      { terrain: "MOUNTAIN" as const },
      { fieldDefense: true },
    ]) {
      const state = withTileV7(
        dino(
          [{ seat: 1, role: "FIGHTER", at: { x: 6, y: 7 } }],
          [{ seat: 0, role: "GUARD", at: NEST, maxHp: 10 }],
          { activeSeat: 1 },
        ),
        NEST,
        change,
      );
      const human = seatIdV7(state, 1);
      const attacker = unitAtV7(state, { x: 6, y: 7 });
      const egg = unitAtV7(state, NEST);
      const preview = queryCombatPreviewV7(state, human, attacker.id, egg.id);
      expect(preview).toMatchObject({
        defense2: 2,
        defenseBonusNumerator: 1,
        defenseBonusDenominator: 1,
        fortificationLevel: 0,
        // Nesting's +4 HP lets an Egg survive one Fighter hit.
        damageToDefender: 6,
        defenderDies: false,
        retaliation: false,
        noRetaliationReason: "OUT_OF_RANGE",
        damageToAttacker: 0,
        push: "BLOCKED",
        defenderArmoured: false,
        defenderBitten: false,
        plagued: [],
      });
      expect(estimateCombatV7(state, attacker.id, egg.id)).toEqual(preview);
      const result = applyOkV7(state, human, {
        kind: "ATTACK",
        unitId: attacker.id,
        targetUnitId: egg.id,
      });
      expect(
        result.events.find((event) => event.kind === "COMBAT_RESOLVED"),
      ).toMatchObject({ preview: { ...preview, attacksRemaining: 0 } });
      expect(unitAtV7(result.state, NEST)).toMatchObject({
        form: "EGG",
        hp: 4,
      });
      expect(unitAtV7(result.state, { x: 6, y: 7 }).hp).toBe(12);
    }
    // An Egg is never the attacker of an estimate either.
    const state = dino(
      [{ seat: 1, role: "FIGHTER", at: { x: 6, y: 7 } }],
      [{ seat: 0, role: "GUARD", at: NEST }],
    );
    expect(
      estimateCombatV7(
        state,
        unitAtV7(state, NEST).id,
        unitAtV7(state, { x: 6, y: 7 }).id,
      ),
    ).toBeNull();
  });

  it("is destroyed by one Fighter hit at 6 HP and needs two Goblin hits", () => {
    const human = dino(
      [{ seat: 1, role: "FIGHTER", at: { x: 6, y: 7 } }],
      [{ seat: 0, role: "RAIDER", at: NEST }],
      { activeSeat: 1 },
    );
    expect(
      estimateCombatV7(
        human,
        unitAtV7(human, { x: 6, y: 7 }).id,
        unitAtV7(human, NEST).id,
      ),
    ).toMatchObject({ damageToDefender: 6, defenderDies: true });
    const goblin = dino(
      [{ seat: 1, role: "FIGHTER", at: { x: 6, y: 7 } }],
      [{ seat: 0, role: "RAIDER", at: NEST }],
      { activeSeat: 1, opponent: "GOBLIN" },
    );
    expect(
      estimateCombatV7(
        goblin,
        unitAtV7(goblin, { x: 6, y: 7 }).id,
        unitAtV7(goblin, NEST).id,
      ),
    ).toMatchObject({ damageToDefender: 4, defenderDies: false });
  });

  it("projects no zone of control, while the hatched unit does", () => {
    // A Human Knight walks past the nest tile over open Grass (a Human
    // Raider ignores zones of control since tuning 4).
    const path = [
      { x: 6, y: 6 },
      { x: 5, y: 6 },
    ];
    const withEgg = grass(
      dino(
        [{ seat: 1, role: "KNIGHT", at: { x: 7, y: 6 } }],
        [{ seat: 0, role: "GUARD", at: NEST }],
        { activeSeat: 1 },
      ),
      path,
    );
    const mover = unitAtV7(withEgg, { x: 7, y: 6 });
    expect(
      applyCommandV7(withEgg, seatIdV7(withEgg, 1), {
        kind: "MOVE",
        unitId: mover.id,
        path,
      }).accepted,
    ).toBe(true);
    const hatched = grass(
      dino(
        [
          { seat: 1, role: "KNIGHT", at: { x: 7, y: 6 } },
          { seat: 0, role: "GUARD", at: NEST },
        ],
        [],
        { activeSeat: 1 },
      ),
      path,
    );
    expect(
      applyCommandV7(hatched, seatIdV7(hatched, 1), {
        kind: "MOVE",
        unitId: unitAtV7(hatched, { x: 7, y: 6 }).id,
        path,
      }),
    ).toMatchObject({
      accepted: false,
      error: { code: "MOVEMENT_ILLEGAL", params: { reason: "ZOC_STOPS_MOVE" } },
    });
  });

  it("blocks enemy movement, lets its owner's units pass, and is never a destination", () => {
    const state = grass(
      dino(
        [
          { seat: 0, role: "RAIDER", at: { x: 6, y: 6 } },
          { seat: 1, role: "RAIDER", at: { x: 1, y: 1 } },
        ],
        [{ seat: 0, role: "GUARD", at: NEST }],
      ),
      [{ x: 8, y: 7 }],
    );
    const actor = state.humanPlayerId;
    const own = unitAtV7(state, { x: 6, y: 6 });
    // Own units pass through the Egg (revision 18) and cannot stop on it.
    const through = applyOkV7(state, actor, {
      kind: "MOVE",
      unitId: own.id,
      path: [NEST, { x: 8, y: 7 }],
    });
    expect(unitAtV7(through.state, { x: 8, y: 7 }).id).toBe(own.id);
    expect(unitAtV7(through.state, NEST).form).toBe("EGG");
    expect(
      applyCommandV7(state, actor, {
        kind: "MOVE",
        unitId: own.id,
        path: [NEST],
      }),
    ).toMatchObject({
      accepted: false,
      error: { code: "MOVEMENT_ILLEGAL", params: { reason: "OCCUPIED" } },
    });
    expect(
      queryPlayerCommandsV7(state, actor).some(
        (command) =>
          command.kind === "MOVE" &&
          sameV7(command.path.at(-1) ?? { x: -1, y: -1 }, NEST),
      ),
    ).toBe(false);
    // An enemy neither ends on it nor passes it.
    const enemyTurn = grass(
      dino(
        [{ seat: 1, role: "RAIDER", at: { x: 6, y: 8 } }],
        [{ seat: 0, role: "GUARD", at: NEST }],
        { activeSeat: 1 },
      ),
      [{ x: 8, y: 7 }],
    );
    const enemy = unitAtV7(enemyTurn, { x: 6, y: 8 });
    for (const moves of [[NEST], [NEST, { x: 8, y: 7 }]])
      expect(
        applyCommandV7(enemyTurn, seatIdV7(state, 1), {
          kind: "MOVE",
          unitId: enemy.id,
          path: moves,
        }),
      ).toMatchObject({
        accepted: false,
        error: { code: "MOVEMENT_ILLEGAL", params: { reason: "OCCUPIED" } },
      });
  });

  it("is out of an ally's reach: allied units never enter its owner's territory", () => {
    // Cooperative AIs on the three-seat board: seat 1 Dinosaur (capital
    // (11, 11)) and seat 2 are allied; the Egg is on the nest tile (10, 10).
    const arena = withEggsV7(
      goblinArenaV7(
        ["ORIGINAL", "DINOSAUR", "ORIGINAL"],
        [{ seat: 2, role: "RAIDER", at: { x: 8, y: 8 } }],
        { aiMode: "COOPERATIVE", activeSeat: 2 },
      ),
      [{ seat: 1, role: "GUARD", at: { x: 10, y: 10 } }],
    );
    const ally = seatIdV7(arena, 2);
    const mover = unitAtV7(arena, { x: 8, y: 8 });
    for (const path of [
      [
        { x: 9, y: 9 },
        { x: 10, y: 10 },
      ],
      [{ x: 9, y: 9 }],
    ])
      expect(
        applyCommandV7(arena, ally, { kind: "MOVE", unitId: mover.id, path }),
      ).toMatchObject({
        accepted: path.length === 1,
        ...(path.length === 1 ? {} : { error: { code: "MOVEMENT_ILLEGAL" } }),
      });
    // The ally cannot attack it either.
    expect(
      queryPlayerCommandsV7(arena, ally).some(
        (command) =>
          command.kind === "ATTACK" &&
          command.targetUnitId === unitAtV7(arena, { x: 10, y: 10 }).id,
      ),
    ).toBe(false);
  });

  it("reveals nothing, never recovers, and is not healed, Tended, or Rallied", () => {
    // Windmill at (9, 9); the damaged Egg at (9, 8) is next to it and to the
    // Shaman at (8, 7).
    const arena = dino(
      [
        { seat: 0, role: "CAPTAIN", at: { x: 8, y: 7 } },
        { seat: 1, role: "FIGHTER", at: { x: 1, y: 1 } },
      ],
      [{ seat: 0, role: "KNIGHT", at: { x: 9, y: 8 }, hp: 2 }],
    );
    const windmillAt = { x: 9, y: 9 };
    const state = checkedV7({
      ...arena,
      nextEntityId: arena.nextEntityId + 1,
      board: {
        ...arena.board,
        tiles: arena.board.tiles.map((tile) =>
          sameV7(tile.at, windmillAt)
            ? {
                ...tile,
                biome: "PLAINS" as const,
                terrain: "GRASS" as const,
                resource: null,
                improvement: "WINDMILL" as const,
              }
            : tile,
        ),
      },
      populationContributions: [
        {
          id: arena.nextEntityId,
          cityId: cityOfV7(arena, 0).id,
          category: "LIVE" as const,
          amount: 0,
          source: {
            kind: "IMPROVEMENT" as const,
            improvement: "WINDMILL" as const,
            at: windmillAt,
          },
        },
      ],
    });
    const actor = state.humanPlayerId;
    const egg = unitAtV7(state, { x: 9, y: 8 });
    const shaman = unitAtV7(state, { x: 8, y: 7 });
    expect(unitSightRadiusAtV7(state, egg)).toBe(0);
    // The Shaman has no Tend or War Drums target: the Egg is not one.
    for (const kind of ["TEND_WOUNDED", "RALLY"] as const) {
      expect(
        applyCommandV7(state, actor, { kind, unitId: shaman.id }),
      ).toMatchObject({
        accepted: false,
        error: { code: "HEAL_TARGET_NOT_FOUND" },
      });
      expect(queryPlayerCommandsV7(state, actor)).not.toContainEqual({
        kind,
        unitId: shaman.id,
      });
    }
    // A full round: no idle recovery at End Turn and no Windmill healing.
    const round = endTurnUntilV7(state, actor);
    expect(
      round.events.filter(
        (event) =>
          (event.kind === "UNIT_RECOVERED" && event.unitId === egg.id) ||
          event.kind === "WINDMILL_HEALING_RESOLVED" ||
          event.kind === "UNITS_REGENERATED",
      ),
    ).toEqual([]);
    expect(unitAtV7(round.state, { x: 9, y: 8 })).toMatchObject({
      form: "EGG",
      hp: 2,
      activation: eggActivationV7(),
    });
    // The same tile heals a hatched unit, so the Windmill is live.
    const hatchedArena = checkedV7({
      ...state,
      eggs: [],
      units: state.units.map((unit) =>
        unit.id === egg.id
          ? {
              ...unit,
              form: "LAND" as const,
              hp: 10,
              maxHp: 28,
              activation: shaman.activation,
            }
          : unit,
      ),
    });
    expect(kinds(endTurnUntilV7(hatchedArena, actor).events)).toContain(
      "WINDMILL_HEALING_RESOLVED",
    );
  });

  it("uses the slots of the unit inside from laying, unchanged by hatching", () => {
    const state = dino([], [], { techs: { 0: without("FORTIFICATION") } });
    const actor = state.humanPlayerId;
    const city = cityOfV7(state, 0);
    // A T-Rex Egg (two slots; revision 20: hatch time 4).
    const laid = applyOkV7(state, actor, lay(state, "KNIGHT", NEST));
    expect(assignedUnitCountV7(laid.state, city.id)).toBe(2);
    expect(previewCityCapacityV7(laid.state, city.id)).toMatchObject({
      capacity: 3,
      assigned: 2,
      available: 1,
    });
    const first = endTurnUntilV7(laid.state, actor).state;
    expect(unitAtV7(first, NEST).form).toBe("EGG");
    expect(assignedUnitCountV7(first, city.id)).toBe(2);
    // One slot left: a second T-Rex Egg does not fit.
    expect(
      applyCommandV7(first, actor, lay(first, "KNIGHT", { x: 8, y: 7 })),
    ).toMatchObject({ accepted: false, error: { code: "CITY_CAPACITY_FULL" } });
    const second = endTurnUntilV7(first, actor).state;
    expect(unitAtV7(second, NEST).form).toBe("EGG");
    const third = endTurnUntilV7(second, actor).state;
    expect(unitAtV7(third, NEST).form).toBe("EGG");
    const fourth = endTurnUntilV7(third, actor).state;
    expect(unitAtV7(fourth, NEST)).toMatchObject({ form: "LAND", hp: 28 });
    expect(assignedUnitCountV7(fourth, city.id)).toBe(2);
  });

  it("publishes an Egg's stats, countdown, and form to every viewer who sees it", () => {
    const state = dino(
      [{ seat: 1, role: "FIGHTER", at: { x: 1, y: 1 } }],
      [
        {
          seat: 0,
          role: "KNIGHT",
          at: NEST,
          maxHp: 10,
          hp: 7,
          turnsRemaining: 2,
          laidThisTurn: true,
        },
      ],
    );
    const egg = unitAtV7(state, NEST);
    const terrain = withTileV7(state, NEST, {
      terrain: "FOREST",
      fieldDefense: true,
    });
    for (const viewerSeat of [0, 1]) {
      const view = viewForV7(terrain, seatIdV7(terrain, viewerSeat));
      expect(view.units.find((unit) => unit.id === egg.id)).toMatchObject({
        form: "EGG",
        role: "KNIGHT",
        hp: 7,
        maxHp: 10,
      });
      expect(view.eggs).toEqual([
        { unitId: egg.id, turnsRemaining: 2, laidThisTurn: true },
      ]);
      const stats = queryUnitStatsV7(view, egg.id);
      expect(stats).toMatchObject({
        minimumRange: 0,
        maximumRange: 0,
        abilities: [],
        statuses: [],
        dinosaur: {
          capacitySlots: 2,
          growthStage: null,
          killsToNextStage: null,
          armourReduction: 0,
          acid: false,
          runUpBonus: 0,
          runUpMaximum: 0,
          egg: { turnsRemaining: 2, hatchesAs: "KNIGHT" },
        },
      });
      expect(
        stats?.stats.map((entry) => [
          entry.id,
          entry.current,
          entry.total.numerator / entry.total.denominator,
          entry.modifiers.length,
        ]),
      ).toEqual([
        ["HP", 7, 10, 0],
        ["ATTACK", null, 0, 0],
        ["DEFENSE", null, 1, 0],
        ["MOVE", null, 0, 0],
        ["RANGE", null, 0, 0],
        ["SIGHT", null, 0, 0],
      ]);
      expect(stats?.stats[0]?.base.sourceLabel).toBe("T-Rex Egg base");
    }
    // Hidden with its tile, like any unit.
    const hidden = patchPlayer(state, 1, {
      explored: (
        state.players.find((player) => player.seat === 1)?.explored ?? []
      ).filter((at) => !sameV7(at, NEST)),
    });
    const view = viewForV7(hidden, seatIdV7(hidden, 1));
    expect(view.eggs).toEqual([]);
    expect(view.units.some((unit) => unit.form === "EGG")).toBe(false);
    // The leaderboard unit count includes Eggs, which are units.
    expect(
      viewForV7(state, seatIdV7(state, 1)).leaderboard.find(
        (entry) => entry.playerId === seatIdV7(state, 0),
      )?.livingUnitCount,
    ).toBe(1);
  });
});

describe("ruleset-7 revision-19 hatching", () => {
  it("hatches at the owner's Start Turn after the role's hatch time, ready to act", () => {
    for (const [role, hatchTurns, hp] of [
      ["RAIDER", 1, 12],
      ["MARKSMAN", 1, 10],
      ["GUARD", 2, 20],
      // Revision 20: the Triceratops hatches in 2 turns with 20 HP and the
      // T-Rex in 4.
      ["SWORDSMAN", 2, 20],
      ["KNIGHT", 4, 28],
    ] as const) {
      // The Industry reshuffle (`pulp_wars-w49.21`, 7r56): the
      // Ankylosaurus is laid with Nesting, which takes no turn off the
      // hatch; the others are laid without it, as before.
      const start = dino([], [], {
        techs: {
          0: role === "GUARD" ? TECHNOLOGY_IDS_V7 : without("FORTIFICATION"),
        },
      });
      const actor = start.humanPlayerId;
      let state = applyOkV7(start, actor, lay(start, role, NEST)).state;
      const egg = unitAtV7(state, NEST);
      expect(eggEntryAtV7(state, NEST)).toEqual({
        unitId: egg.id,
        turnsRemaining: hatchTurns,
        laidThisTurn: true,
      });
      for (let turn = 1; turn <= hatchTurns; turn += 1) {
        // The flag is kept across the other player's turn.
        const ended = applyOkV7(state, actor, { kind: "END_TURN" });
        expect(eggEntryAtV7(ended.state, NEST)).toEqual(
          eggEntryAtV7(state, NEST),
        );
        expect(kinds(ended.events)).not.toContain("EGG_HATCHED");
        const next = applyOkV7(ended.state, seatIdV7(start, 1), {
          kind: "END_TURN",
        });
        state = next.state;
        const hatch = next.events.filter(
          (event) => event.kind === "EGG_HATCHED",
        );
        if (turn < hatchTurns) {
          expect(hatch).toEqual([]);
          expect(eggEntryAtV7(state, NEST)).toEqual({
            unitId: egg.id,
            turnsRemaining: hatchTurns - turn,
            laidThisTurn: false,
          });
          expect(unitAtV7(state, NEST)).toEqual(egg);
          continue;
        }
        expect(hatch).toEqual([
          {
            kind: "EGG_HATCHED",
            playerId: actor,
            unitId: egg.id,
            role,
            at: NEST,
            cause: "TIME",
            sourceUnitId: null,
          },
        ]);
        expect(parseEventV7(hatch[0]).ok).toBe(true);
        expect(state.eggs).toEqual([]);
        const hatched = unitAtV7(state, NEST);
        expect(hatched).toMatchObject({
          id: egg.id,
          form: "LAND",
          role,
          hp,
          maxHp: hp,
          kills: 0,
          veteran: false,
          homeCityId: egg.homeCityId,
          captureEligible: false,
        });
        // A fresh activation: it can move and act this turn.
        expect(hatched.activation).toMatchObject({
          moved: false,
          attacked: false,
          attacksUsed: 0,
          handled: false,
          specialActed: false,
        });
        expect(
          queryPlayerCommandsV7(state, actor).some(
            (command) => command.kind === "MOVE" && command.unitId === egg.id,
          ),
        ).toBe(true);
      }
    }
  });

  it("reveals the hatchling's sight, while laying reveals nothing", () => {
    const arena = dino([], [], { techs: { 0: without("FORTIFICATION") } });
    const actor = arena.humanPlayerId;
    // The owner has explored only its own territory.
    const state = patchPlayer(arena, 0, {
      explored: arena.board.tiles
        .filter((tile) => tile.territoryCityId === cityOfV7(arena, 0).id)
        .map((tile) => tile.at),
    });
    const laid = applyOkV7(state, actor, lay(state, "RAIDER", NEST));
    expect(kinds(laid.events)).toEqual(["EGG_LAID"]);
    expect(laid.state.players).toEqual(
      state.players.map((player) =>
        player.id === actor ? { ...player, coins: player.coins - 4 } : player,
      ),
    );
    const round = endTurnUntilV7(laid.state, actor);
    const own = round.events.slice(
      round.events.findIndex(
        (event) => event.kind === "TURN_STARTED" && event.playerId === actor,
      ),
    );
    const hatchIndex = kinds(own).indexOf("EGG_HATCHED");
    expect(hatchIndex).toBeGreaterThan(0);
    // One TILES_REVEALED for the step, right after the hatch: the Raptor
    // sees two tiles (Scouting).
    const revealed = own[hatchIndex + 1];
    if (revealed?.kind !== "TILES_REVEALED") throw new Error("no reveal");
    expect(revealed.playerId).toBe(actor);
    expect(revealed.tiles).toContainEqual({ x: 5, y: 5 });
    expect(revealed.tiles).toContainEqual({ x: 6, y: 9 });
    expect(revealed.tiles).not.toContainEqual({ x: 4, y: 7 });
    expect(revealed.tiles).toHaveLength(25 - 9);
  });

  it("runs after Plague and before Windmill healing and income, and counts for that turn's Muster", () => {
    // Seat 0 Dinosaur: a plagued Caveman on its first plagued turn next to
    // a Raptor Egg, a Shaman, a Spitter, an Ankylosaurus, and a T-Rex:
    // five trainable roles on the board until the Egg hatches into the
    // sixth (Muster takes six since the economy rejig, 7r54; four before).
    const arena = dino(
      [
        { seat: 0, role: "FIGHTER", at: { x: 8, y: 7 }, hp: 9 },
        { seat: 0, role: "CAPTAIN", at: { x: 5, y: 2 } },
        { seat: 0, role: "MARKSMAN", at: { x: 5, y: 1 } },
        { seat: 0, role: "GUARD", at: { x: 4, y: 1 } },
        { seat: 0, role: "KNIGHT", at: { x: 4, y: 2 } },
        { seat: 1, role: "CATAPULT", at: { x: 1, y: 1 } },
      ],
      [{ seat: 0, role: "RAIDER", at: NEST, turnsRemaining: 1 }],
      { opponent: "UNDEAD", activeSeat: 1 },
    );
    const dinosaurId = seatIdV7(arena, 0);
    const caveman = unitAtV7(arena, { x: 8, y: 7 });
    const egg = unitAtV7(arena, NEST);
    const windmillAt = { x: 9, y: 7 };
    const state = checkedV7({
      ...arena,
      nextEntityId: arena.nextEntityId + 1,
      plagued: [
        {
          unitId: caveman.id,
          sourceUnitId: unitAtV7(arena, { x: 1, y: 1 }).id,
          turnsRemaining: 3,
        },
      ],
      board: {
        ...arena.board,
        tiles: arena.board.tiles.map((tile) =>
          sameV7(tile.at, windmillAt)
            ? {
                ...tile,
                biome: "PLAINS" as const,
                terrain: "GRASS" as const,
                resource: null,
                improvement: "WINDMILL" as const,
              }
            : tile,
        ),
      },
      populationContributions: [
        {
          id: arena.nextEntityId,
          cityId: cityOfV7(arena, 0).id,
          category: "LIVE" as const,
          amount: 0,
          source: {
            kind: "IMPROVEMENT" as const,
            improvement: "WINDMILL" as const,
            at: windmillAt,
          },
        },
      ],
    });
    expect(
      achievementProgressV7(state, dinosaurId).find(
        (entry) => entry.achievement === "MUSTER",
      ),
    ).toMatchObject({ currentDistinctTrainableRoles: 5 });
    const result = applyOkV7(state, seatIdV7(state, 1), { kind: "END_TURN" });
    const order = kinds(result.events);
    const at = (kind: string): number => order.indexOf(kind);
    expect(at("TURN_STARTED")).toBeGreaterThan(-1);
    expect(at("PLAGUE_DAMAGED")).toBeGreaterThan(at("TURN_STARTED"));
    expect(at("EGG_HATCHED")).toBeGreaterThan(at("PLAGUE_DAMAGED"));
    expect(at("WINDMILL_HEALING_RESOLVED")).toBeGreaterThan(at("EGG_HATCHED"));
    expect(at("INCOME_AWARDED")).toBeGreaterThan(
      at("WINDMILL_HEALING_RESOLVED"),
    );
    expect(at("ACHIEVEMENT_UNLOCKED")).toBeGreaterThan(at("INCOME_AWARDED"));
    expect(
      result.events.find((event) => event.kind === "ACHIEVEMENT_UNLOCKED"),
    ).toMatchObject({ playerId: dinosaurId, achievement: "MUSTER" });
    // The Egg stayed immune through the Plague step: the Caveman spread to
    // no one, and the hatchling is not plagued.
    expect(order).not.toContain("PLAGUE_SPREAD");
    expect(result.state.plagued.map((entry) => entry.unitId)).toEqual([
      caveman.id,
    ]);
    expect(unitAtV7(result.state, NEST)).toMatchObject({
      id: egg.id,
      form: "LAND",
    });
    // The Windmill healed the Caveman (9 - 2 Plague, then to its maximum:
    // 10 again since pulp_wars-0hi.3) but not the Egg.
    expect(
      result.events.find((event) => event.kind === "WINDMILL_HEALING_RESOLVED"),
    ).toMatchObject({ results: [{ unitId: caveman.id, hpAfter: 10 }] });
  });

  it("does not count an Egg for Muster", () => {
    const state = dino(
      [
        { seat: 0, role: "FIGHTER", at: { x: 5, y: 3 } },
        { seat: 0, role: "CAPTAIN", at: { x: 5, y: 2 } },
        { seat: 0, role: "MARKSMAN", at: { x: 5, y: 1 } },
        // Muster takes six kinds since the economy rejig (7r54).
        { seat: 0, role: "GUARD", at: { x: 4, y: 1 } },
        { seat: 0, role: "KNIGHT", at: { x: 4, y: 2 } },
        { seat: 1, role: "FIGHTER", at: { x: 1, y: 1 } },
      ],
      [{ seat: 0, role: "RAIDER", at: NEST, turnsRemaining: 1 }],
    );
    const actor = state.humanPlayerId;
    const progress = (candidate: GameStateV7) =>
      achievementProgressV7(candidate, actor).find(
        (entry) => entry.achievement === "MUSTER",
      );
    expect(progress(state)).toMatchObject({
      currentDistinctTrainableRoles: 5,
    });
    // Any command re-evaluates achievements: the Egg still does not count.
    const waited = applyOkV7(state, actor, {
      kind: "WAIT",
      unitId: unitAtV7(state, { x: 5, y: 3 }).id,
    });
    expect(kinds(waited.events)).not.toContain("ACHIEVEMENT_UNLOCKED");
    const round = endTurnUntilV7(waited.state, actor);
    expect(progress(round.state)).toMatchObject({
      currentDistinctTrainableRoles: 6,
    });
    expect(kinds(round.events)).toContain("ACHIEVEMENT_UNLOCKED");
  });

  it("hatches while the city is besieged or over capacity", () => {
    const state = dino(
      [
        { seat: 1, role: "FIGHTER", at: { x: 8, y: 8 } },
        { seat: 0, role: "JUGGERNAUT", at: { x: 5, y: 3 } },
        { seat: 0, role: "JUGGERNAUT", at: { x: 4, y: 3 } },
      ],
      [{ seat: 0, role: "KNIGHT", at: NEST, turnsRemaining: 1 }],
      { activeSeat: 1, coins: 0 },
    );
    const city = cityOfV7(state, 0);
    expect(assignedUnitCountV7(state, city.id)).toBe(6);
    const result = applyOkV7(state, seatIdV7(state, 1), { kind: "END_TURN" });
    expect(kinds(result.events)).toContain("EGG_HATCHED");
    expect(unitAtV7(result.state, NEST)).toMatchObject({
      form: "LAND",
      role: "KNIGHT",
      hp: 28,
    });
    expect(assignedUnitCountV7(result.state, city.id)).toBe(6);
  });
});

describe("ruleset-7 revision-19 Shaman Hatch", () => {
  const SHAMAN = { x: 6, y: 6 } as const;
  const base = (
    egg: Partial<EggPieceV7> = {},
    activation: GoblinPieceV7["activation"] = {},
  ): GameStateV7 =>
    dino(
      [
        { seat: 0, role: "CAPTAIN", at: SHAMAN, activation },
        { seat: 1, role: "FIGHTER", at: { x: 1, y: 1 } },
      ],
      [{ seat: 0, role: "KNIGHT", at: NEST, ...egg }],
    );

  it("hatches an adjacent Egg laid earlier at once into an exhausted unit", () => {
    // The Shaman may have moved; it needs no technology and no Coins.
    const state = patchPlayer(
      base({}, { moved: true, movedPathLength: 1 }),
      0,
      {
        researchedTechs: only("ADMINISTRATION", "CHIVALRY"),
        coins: 0,
      },
    );
    const actor = state.humanPlayerId;
    const shaman = unitAtV7(state, SHAMAN);
    const egg = unitAtV7(state, NEST);
    const command: CommandV7 = {
      kind: "HATCH",
      unitId: shaman.id,
      eggUnitId: egg.id,
    };
    const view = viewForV7(state, actor);
    expect(queryPlayerCommandsV7(view)).toContainEqual(command);
    expect(previewHatchV7(view, shaman.id, egg.id)).toEqual({
      unitId: shaman.id,
      eggUnitId: egg.id,
      role: "KNIGHT",
      at: NEST,
      hp: 28,
      turnsSaved: 4,
    });
    const result = applyOkV7(state, actor, command);
    expect(result.events[0]).toEqual({
      kind: "EGG_HATCHED",
      playerId: actor,
      unitId: egg.id,
      role: "KNIGHT",
      at: NEST,
      cause: "SHAMAN",
      sourceUnitId: shaman.id,
    });
    expect(parseEventV7(result.events[0]).ok).toBe(true);
    expect(result.state.eggs).toEqual([]);
    const hatched = unitAtV7(result.state, NEST);
    expect(hatched).toMatchObject({
      id: egg.id,
      form: "LAND",
      hp: 28,
      maxHp: 28,
      kills: 0,
    });
    // Exhausted for the rest of this turn, like a newly trained unit.
    expect(hatched.activation).toEqual(eggActivationV7());
    expect(
      queryPlayerCommandsV7(result.state, actor).filter(
        (candidate) => "unitId" in candidate && candidate.unitId === egg.id,
      ),
    ).toEqual([]);
    expect(unitAtV7(result.state, SHAMAN).activation).toMatchObject({
      specialActed: true,
      handled: true,
    });
    expect(applyCommandV7(result.state, actor, command)).toMatchObject({
      accepted: false,
      error: { code: "UNIT_ALREADY_ACTED" },
    });
    // Ready at the owner's next Start Turn.
    const next = endTurnUntilV7(result.state, actor).state;
    expect(unitAtV7(next, NEST).activation.handled).toBe(false);
  });

  it("is not legal or offered on an Egg laid this turn, and is from the owner's next turn", () => {
    const start = dino(
      [
        { seat: 0, role: "CAPTAIN", at: SHAMAN },
        { seat: 1, role: "FIGHTER", at: { x: 1, y: 1 } },
      ],
      [],
      { techs: { 0: without("FORTIFICATION") } },
    );
    const actor = start.humanPlayerId;
    // (A Triceratops Egg: the Ankylosaurus needs Nesting since 7r56.)
    const laid = applyOkV7(start, actor, lay(start, "SWORDSMAN", NEST)).state;
    const shaman = unitAtV7(laid, SHAMAN);
    const egg = unitAtV7(laid, NEST);
    const command: CommandV7 = {
      kind: "HATCH",
      unitId: shaman.id,
      eggUnitId: egg.id,
    };
    expect(applyCommandV7(laid, actor, command)).toEqual({
      accepted: false,
      state: laid,
      events: [],
      error: { code: "HATCH_NOT_LEGAL", params: { reason: "LAID_THIS_TURN" } },
    });
    expect(queryPlayerCommandsV7(laid, actor)).not.toContainEqual(command);
    expect(
      previewHatchV7(viewForV7(laid, actor), shaman.id, egg.id),
    ).toBeNull();
    // The flag survives the other player's turn and a save round-trip, and
    // only the owner's Start Turn clears it.
    const ended = applyOkV7(laid, actor, { kind: "END_TURN" }).state;
    expect(eggEntryAtV7(ended, NEST).laidThisTurn).toBe(true);
    expect(parseGameStateV7(JSON.parse(JSON.stringify(ended)))?.eggs).toEqual(
      ended.eggs,
    );
    const next = applyOkV7(ended, seatIdV7(start, 1), {
      kind: "END_TURN",
    }).state;
    expect(eggEntryAtV7(next, NEST)).toEqual({
      unitId: egg.id,
      turnsRemaining: 1,
      laidThisTurn: false,
    });
    expect(queryPlayerCommandsV7(next, actor)).toContainEqual(command);
    expect(
      previewHatchV7(viewForV7(next, actor), shaman.id, egg.id),
    ).toMatchObject({ turnsSaved: 1, hp: 20 });
    const hatched = applyOkV7(next, actor, command);
    expect(unitAtV7(hatched.state, NEST)).toMatchObject({
      form: "LAND",
      hp: 20,
    });
  });

  it("rejects every other illegal Hatch atomically", () => {
    const state = dino(
      [
        { seat: 0, role: "CAPTAIN", at: SHAMAN },
        { seat: 0, role: "FIGHTER", at: { x: 6, y: 7 } },
        { seat: 0, role: "CAPTAIN", at: { x: 4, y: 3 } },
        { seat: 1, role: "CAPTAIN", at: { x: 5, y: 7 } },
      ],
      [
        { seat: 0, role: "KNIGHT", at: NEST },
        { seat: 0, role: "RAIDER", at: { x: 9, y: 9 } },
      ],
    );
    const actor = state.humanPlayerId;
    const shaman = unitAtV7(state, SHAMAN);
    const caveman = unitAtV7(state, { x: 6, y: 7 });
    const far = unitAtV7(state, { x: 4, y: 3 });
    const foreign = unitAtV7(state, { x: 5, y: 7 });
    const egg = unitAtV7(state, NEST);
    const distant = unitAtV7(state, { x: 9, y: 9 });
    const hatch = (unitId: number, eggUnitId: number): CommandV7 =>
      ({ kind: "HATCH", unitId, eggUnitId }) as CommandV7;
    const rejected = (
      candidate: GameStateV7,
      command: CommandV7,
      error: Record<string, unknown>,
    ): void =>
      expect(applyCommandV7(candidate, actor, command)).toEqual({
        accepted: false,
        state: candidate,
        events: [],
        error,
      });
    rejected(state, hatch(9999, egg.id), {
      code: "UNIT_NOT_FOUND",
      params: { unitId: 9999 },
    });
    rejected(state, hatch(foreign.id, egg.id), {
      code: "UNIT_NOT_OWNED",
      params: { unitId: foreign.id },
    });
    rejected(state, hatch(caveman.id, egg.id), {
      code: "UNIT_ROLE_INVALID",
      params: { role: "FIGHTER" },
    });
    const noEgg = { code: "HATCH_NOT_LEGAL", params: { reason: "NO_EGG" } };
    // Unknown, not an Egg, not adjacent, and not the Shaman's own neighbour.
    rejected(state, hatch(shaman.id, 9999), noEgg);
    rejected(state, hatch(shaman.id, caveman.id), noEgg);
    rejected(state, hatch(shaman.id, distant.id), noEgg);
    rejected(state, hatch(far.id, egg.id), noEgg);
    // Only those four own adjacent Eggs are offered.
    expect(
      queryPlayerCommandsV7(state, actor).filter(
        (command) => command.kind === "HATCH",
      ),
    ).toEqual([hatch(shaman.id, egg.id)]);
    // A used primary action.
    const acted = checkedV7({
      ...state,
      units: state.units.map((unit) =>
        unit.id === shaman.id
          ? {
              ...unit,
              activation: {
                ...unit.activation,
                specialActed: true,
                handled: true,
              },
            }
          : unit,
      ),
    });
    rejected(acted, hatch(shaman.id, egg.id), {
      code: "UNIT_ALREADY_ACTED",
      params: { unitId: shaman.id },
    });
    // An enemy Egg is not the actor's.
    const enemy = goblinArenaV7(
      ["DINOSAUR", "DINOSAUR"],
      [{ seat: 0, role: "CAPTAIN", at: { x: 4, y: 8 } }],
    );
    const enemyEgg = withEggsV7(enemy, [
      { seat: 1, role: "RAIDER", at: { x: 3, y: 7 } },
    ]);
    rejected(
      enemyEgg,
      hatch(
        unitAtV7(enemyEgg, { x: 4, y: 8 }).id,
        unitAtV7(enemyEgg, { x: 3, y: 7 }).id,
      ),
      noEgg,
    );
    // An embarked Shaman.
    const afloat = withEggsV7(
      goblinArenaV7(
        ["DINOSAUR", "ORIGINAL"],
        [
          { seat: 0, role: "CAPTAIN", at: { x: 6, y: 6 }, form: "EMBARKED" },
          { seat: 1, role: "FIGHTER", at: { x: 1, y: 1 } },
        ],
        { water: [{ x: 6, y: 6 }] },
      ),
      [{ seat: 0, role: "KNIGHT", at: NEST }],
    );
    rejected(
      afloat,
      hatch(unitAtV7(afloat, { x: 6, y: 6 }).id, unitAtV7(afloat, NEST).id),
      { code: "HATCH_NOT_LEGAL", params: { reason: "EMBARKED" } },
    );
    expect(
      queryPlayerCommandsV7(afloat, actor).some(
        (command) => command.kind === "HATCH",
      ),
    ).toBe(false);
  });
});

describe("ruleset-7 revision-19 Nesting", () => {
  it("gives laid Eggs +4 HP and no turn off the hatch, read at lay time", () => {
    // The Dinosaur pass, correction (`pulp_wars-w49.15`, 7r53): Nesting no
    // longer takes a turn off (it did: Ankylosaurus and Triceratops 1, the
    // T-Rex 3). The base turns are Raptor 1, Spitter 1, Ankylosaurus 2,
    // Triceratops 2, T-Rex 4.
    for (const [role, plain, nested] of [
      ["RAIDER", 1, 1],
      ["MARKSMAN", 1, 1],
      ["GUARD", 2, 2],
      ["SWORDSMAN", 2, 2],
      ["KNIGHT", 4, 4],
    ] as const) {
      for (const [techs, hp, turns] of [
        [without("FORTIFICATION"), EGG_HP_V7, plain],
        [TECHNOLOGY_IDS_V7, EGG_HP_V7 + 4, nested],
      ] as const) {
        const state = dino([], [], { techs: { 0: techs } });
        // The Industry reshuffle (7r56): the Ankylosaurus is laid with
        // Nesting only.
        if (role === "GUARD" && !techs.includes("FORTIFICATION")) {
          expect(
            applyCommandV7(state, state.humanPlayerId, lay(state, role, NEST)),
          ).toMatchObject({
            accepted: false,
            error: {
              code: "TECH_REQUIRED",
              params: { tech: "FORTIFICATION" },
            },
          });
          continue;
        }
        const result = applyOkV7(
          state,
          state.humanPlayerId,
          lay(state, role, NEST),
        );
        expect(result.events[0]).toMatchObject({ hp, turnsRemaining: turns });
        expect(unitAtV7(result.state, NEST)).toMatchObject({ hp, maxHp: hp });
        expect(eggEntryAtV7(result.state, NEST).turnsRemaining).toBe(turns);
      }
    }
  });

  it("changes no Egg already on the board when it is researched", () => {
    const start = dino([], [], {
      techs: { 0: without("FORTIFICATION") },
    });
    const actor = start.humanPlayerId;
    const laid = applyOkV7(start, actor, lay(start, "KNIGHT", NEST)).state;
    const researched = applyOkV7(laid, actor, {
      kind: "RESEARCH",
      tech: "FORTIFICATION",
    }).state;
    expect(unitAtV7(researched, NEST)).toEqual(unitAtV7(laid, NEST));
    expect(researched.eggs).toEqual(laid.eggs);
    // The next Egg is laid with Nesting.
    const round = endTurnUntilV7(researched, actor).state;
    const next = applyOkV7(round, actor, lay(round, "RAIDER", { x: 8, y: 7 }));
    expect(next.events[0]).toMatchObject({ hp: 10, turnsRemaining: 1 });
    expect(unitAtV7(next.state, NEST)).toMatchObject({ hp: 6, maxHp: 6 });
  });
});

describe("ruleset-7 revision-19 Egg destruction", () => {
  it("dies to an attack with kill credit, the advance, and no Grave", () => {
    // An Undead opponent enables Graves; the attacker is a Skeleton with two
    // kills, so the Egg is its Promotion kill.
    const arena = dino(
      [
        { seat: 1, role: "FIGHTER", at: { x: 6, y: 7 } },
        { seat: 0, role: "FIGHTER", at: { x: 4, y: 3 } },
      ],
      // A two-slot T-Rex Egg (the Triceratops uses one slot since
      // pulp_wars-c87.8).
      [{ seat: 0, role: "KNIGHT", at: NEST }],
      { opponent: "UNDEAD", activeSeat: 1 },
    );
    const state = withKillsV7(arena, { x: 6, y: 7 }, 2);
    const undeadId = seatIdV7(state, 1);
    const attacker = unitAtV7(state, { x: 6, y: 7 });
    const egg = unitAtV7(state, NEST);
    const city = cityOfV7(state, 0);
    expect(assignedUnitCountV7(state, city.id)).toBe(3);
    const preview = queryCombatPreviewV7(state, undeadId, attacker.id, egg.id);
    expect(preview).toMatchObject({
      defenderDies: true,
      advances: true,
      retaliation: false,
      noRetaliationReason: "DEFENDER_DIED",
      defenderInfected: false,
      defenderBittenRises: false,
    });
    const result = applyOkV7(state, undeadId, {
      kind: "ATTACK",
      unitId: attacker.id,
      targetUnitId: egg.id,
    });
    expect(kinds(result.events)).toEqual([
      "COMBAT_RESOLVED",
      "UNIT_DIED",
      "UNIT_MOVED",
    ]);
    expect(result.events[1]).toEqual({
      kind: "UNIT_DIED",
      unitId: egg.id,
      cause: "ATTACK",
    });
    expect(result.state.graves).toEqual([]);
    expect(result.state.eggs).toEqual([]);
    // Its slots free at once.
    expect(assignedUnitCountV7(result.state, city.id)).toBe(1);
    expect(unitAtV7(result.state, NEST)).toMatchObject({
      id: attacker.id,
      kills: 3,
    });
    expect(queryPlayerCommandsV7(result.state, undeadId)).toContainEqual({
      kind: "PROMOTE",
      unitId: attacker.id,
    });
  });

  it("grows a Dinosaur that destroys an Egg", () => {
    const arena = goblinArenaV7(
      ["DINOSAUR", "DINOSAUR"],
      [{ seat: 0, role: "RAIDER", at: { x: 4, y: 7 } }],
    );
    const state = withEggsV7(arena, [
      { seat: 1, role: "KNIGHT", at: { x: 3, y: 7 } },
    ]);
    const raptor = unitAtV7(state, { x: 4, y: 7 });
    const result = applyOkV7(state, state.humanPlayerId, {
      kind: "ATTACK",
      unitId: raptor.id,
      targetUnitId: unitAtV7(state, { x: 3, y: 7 }).id,
    });
    expect(kinds(result.events).slice(0, 4)).toEqual([
      "COMBAT_RESOLVED",
      "UNIT_DIED",
      "UNIT_GREW",
      "UNIT_MOVED",
    ]);
    expect(unitAtV7(result.state, { x: 3, y: 7 })).toMatchObject({
      id: raptor.id,
      kills: 1,
      maxHp: 16,
      hp: 16,
    });
  });

  it("is never infected, bitten, or plagued, and a Zombie kill leaves no rising", () => {
    // A weak Zombie only damages the 10-HP Egg: no bite.
    const chip = dino(
      [{ seat: 1, role: "GUARD", at: { x: 6, y: 7 }, hp: 3 }],
      [{ seat: 0, role: "GUARD", at: NEST, maxHp: 10 }],
      { opponent: "UNDEAD", activeSeat: 1 },
    );
    const undeadId = seatIdV7(chip, 1);
    const bitten = applyOkV7(chip, undeadId, {
      kind: "ATTACK",
      unitId: unitAtV7(chip, { x: 6, y: 7 }).id,
      targetUnitId: unitAtV7(chip, NEST).id,
    });
    expect(unitAtV7(bitten.state, NEST).hp).toBeLessThan(10);
    expect(bitten.state.bitten).toEqual([]);
    expect(
      bitten.events.find((event) => event.kind === "COMBAT_RESOLVED"),
    ).toMatchObject({ preview: { defenderBitten: false } });
    // A healthy Zombie kills it: destroyed, no Infect rising.
    const kill = dino(
      [{ seat: 1, role: "GUARD", at: { x: 6, y: 7 } }],
      [{ seat: 0, role: "GUARD", at: NEST }],
      { opponent: "UNDEAD", activeSeat: 1 },
    );
    const killed = applyOkV7(kill, undeadId, {
      kind: "ATTACK",
      unitId: unitAtV7(kill, { x: 6, y: 7 }).id,
      targetUnitId: unitAtV7(kill, NEST).id,
    });
    // (A Zombie never advances.)
    expect(kinds(killed.events)).toEqual(["COMBAT_RESOLVED", "UNIT_DIED"]);
    expect(killed.state.units).toHaveLength(1);
    expect(killed.state.graves).toEqual([]);
    // A Lich hit on an Egg, and its splash onto one, plague nothing there.
    const lich = dino(
      [
        { seat: 1, role: "CATAPULT", at: { x: 4, y: 7 }, hp: 1 },
        { seat: 0, role: "FIGHTER", at: { x: 6, y: 7 } },
      ],
      [
        { seat: 0, role: "GUARD", at: NEST, maxHp: 10 },
        { seat: 0, role: "RAIDER", at: { x: 7, y: 8 }, maxHp: 10 },
      ],
      { opponent: "UNDEAD", activeSeat: 1 },
    );
    const lichUnit = unitAtV7(lich, { x: 4, y: 7 });
    const direct = applyOkV7(lich, undeadId, {
      kind: "ATTACK",
      unitId: lichUnit.id,
      targetUnitId: unitAtV7(lich, NEST).id,
    });
    // The Caveman next to the Egg is plagued by the splash; no Egg is.
    expect(direct.state.plagued.map((entry) => entry.unitId)).toEqual([
      unitAtV7(lich, { x: 6, y: 7 }).id,
    ]);
    const splash = applyOkV7(lich, undeadId, {
      kind: "ATTACK",
      unitId: lichUnit.id,
      targetUnitId: unitAtV7(lich, { x: 6, y: 7 }).id,
    });
    expect(splash.state.plagued.map((entry) => entry.unitId)).toEqual([
      unitAtV7(lich, { x: 6, y: 7 }).id,
    ]);
    expect(unitAtV7(splash.state, NEST).hp).toBeLessThan(10);
    expect(unitAtV7(splash.state, { x: 7, y: 8 }).hp).toBeLessThan(10);
  });

  it("dies to a Wail with the ordinary formula and leaves no Grave", () => {
    const state = dino(
      [{ seat: 1, role: "MARKSMAN", at: { x: 5, y: 7 } }],
      [{ seat: 0, role: "GUARD", at: NEST, hp: 1 }],
      { opponent: "UNDEAD", activeSeat: 1 },
    );
    const undeadId = seatIdV7(state, 1);
    const banshee = unitAtV7(state, { x: 5, y: 7 });
    const egg = unitAtV7(state, NEST);
    const result = applyOkV7(state, undeadId, {
      kind: "WAIL",
      unitId: banshee.id,
    });
    expect(kinds(result.events)).toEqual(["WAIL_RESOLVED", "UNIT_DIED"]);
    expect(result.events[1]).toEqual({
      kind: "UNIT_DIED",
      unitId: egg.id,
      cause: "WAIL",
    });
    expect(result.state.graves).toEqual([]);
    expect(result.state.eggs).toEqual([]);
    expect(unitAtV7(result.state, { x: 5, y: 7 }).kills).toBe(1);
    // A full-HP Egg defends with 1: the Banshee (Attack 1) deals 2.
    const full = dino(
      [{ seat: 1, role: "MARKSMAN", at: { x: 5, y: 7 } }],
      [{ seat: 0, role: "GUARD", at: NEST }],
      { opponent: "UNDEAD", activeSeat: 1 },
    );
    const wail = applyOkV7(full, undeadId, {
      kind: "WAIL",
      unitId: unitAtV7(full, { x: 5, y: 7 }).id,
    });
    expect(wail.events[0]).toMatchObject({
      kind: "WAIL_RESOLVED",
      results: [{ damage: 2, dies: false }],
    });
  });

  it("dies to splash, a Kaboom, and a death blast, each with Plunder and no Grave", () => {
    // Bomb splash: the Bomb Chucker hits the Caveman; the 1-HP Egg next to
    // it dies of the splash.
    const bomb = dino(
      [
        { seat: 1, role: "MARKSMAN", at: { x: 4, y: 7 } },
        { seat: 0, role: "GUARD", at: { x: 6, y: 7 } },
      ],
      [{ seat: 0, role: "GUARD", at: NEST, hp: 1 }],
      { opponent: "GOBLIN", activeSeat: 1, coins: 10 },
    );
    const goblinId = seatIdV7(bomb, 1);
    const coins = (state: GameStateV7): number =>
      state.players.find((player) => player.id === goblinId)?.coins ?? -1;
    const splashed = applyOkV7(bomb, goblinId, {
      kind: "ATTACK",
      unitId: unitAtV7(bomb, { x: 4, y: 7 }).id,
      targetUnitId: unitAtV7(bomb, { x: 6, y: 7 }).id,
    });
    expect(splashed.events).toContainEqual({
      kind: "UNIT_DIED",
      unitId: unitAtV7(bomb, NEST).id,
      cause: "SPLASH",
    });
    expect(splashed.events).toContainEqual({
      kind: "PLUNDER_AWARDED",
      playerId: goblinId,
      kills: 1,
      coins: 2,
    });
    expect(coins(splashed.state)).toBe(12);
    expect(unitAtV7(splashed.state, { x: 4, y: 7 }).kills).toBe(1);
    expect(splashed.state.eggs).toEqual([]);
    // Kaboom: a Goblin (6 fixed damage since `pulp_wars-w49.35`, 5 before)
    // next to a 5-HP Egg.
    const kaboom = dino(
      [{ seat: 1, role: "FIGHTER", at: { x: 6, y: 7 } }],
      [
        { seat: 0, role: "GUARD", at: NEST, hp: 5 },
        { seat: 0, role: "RAIDER", at: { x: 7, y: 8 }, maxHp: 10 },
      ],
      { opponent: "GOBLIN", activeSeat: 1, coins: 10 },
    );
    const blown = applyOkV7(kaboom, goblinId, {
      kind: "KABOOM",
      unitId: unitAtV7(kaboom, { x: 6, y: 7 }).id,
    });
    expect(blown.events).toContainEqual({
      kind: "UNIT_DIED",
      unitId: unitAtV7(kaboom, NEST).id,
      cause: "EXPLOSION",
    });
    expect(blown.events).toContainEqual({
      kind: "PLUNDER_AWARDED",
      playerId: goblinId,
      kills: 1,
      coins: 2,
    });
    // The Nesting Egg takes the same fixed 6 and survives.
    expect(unitAtV7(blown.state, { x: 7, y: 8 })).toMatchObject({
      form: "EGG",
      hp: 4,
    });
    expect(blown.state.eggs.map((entry) => entry.unitId)).toEqual([
      unitAtV7(kaboom, { x: 7, y: 8 }).id,
    ]);
    // Death blast: a Dinosaur kills a Bomb Chucker next to its own Egg.
    const blast = dino(
      [
        { seat: 0, role: "KNIGHT", at: { x: 5, y: 6 } },
        { seat: 1, role: "MARKSMAN", at: { x: 6, y: 6 }, hp: 1 },
      ],
      [{ seat: 0, role: "GUARD", at: NEST, hp: 2 }],
      { opponent: "GOBLIN", coins: 10 },
    );
    const blasted = applyOkV7(blast, blast.humanPlayerId, {
      kind: "ATTACK",
      unitId: unitAtV7(blast, { x: 5, y: 6 }).id,
      targetUnitId: unitAtV7(blast, { x: 6, y: 6 }).id,
    });
    expect(blasted.events).toContainEqual({
      kind: "UNIT_DIED",
      unitId: unitAtV7(blast, NEST).id,
      cause: "EXPLOSION",
    });
    expect(blasted.events).toContainEqual({
      kind: "PLUNDER_AWARDED",
      playerId: goblinId,
      kills: 1,
      coins: 2,
    });
    for (const result of [splashed, blown, blasted])
      expect(result.state.graves).toEqual([]);
  });

  it("lets Overrun, Ram, and Rampage continue through a destroyed Egg", () => {
    for (const [factions, eggSeat] of [
      [["ORIGINAL", "DINOSAUR"], 1],
      [["GOBLIN", "DINOSAUR"], 1],
      [["DINOSAUR", "DINOSAUR"], 1],
    ] as const) {
      const arena = goblinArenaV7(factions, [
        { seat: 0, role: "KNIGHT", at: { x: 4, y: 7 } },
        { seat: 1, role: "FIGHTER", at: { x: 2, y: 6 } },
      ]);
      const state = withEggsV7(arena, [
        { seat: eggSeat, role: "RAIDER", at: { x: 3, y: 7 }, hp: 1 },
      ]);
      const actor = state.humanPlayerId;
      const knight = unitAtV7(state, { x: 4, y: 7 });
      const egg = unitAtV7(state, { x: 3, y: 7 });
      const preview = queryCombatPreviewV7(state, actor, knight.id, egg.id);
      expect(preview, factions[0]).toMatchObject({
        defenderDies: true,
        advances: true,
        overrunAdvance: true,
        overrunContinues: true,
        attacksRemaining: 1,
      });
      const result = applyOkV7(state, actor, {
        kind: "ATTACK",
        unitId: knight.id,
        targetUnitId: egg.id,
      });
      const advanced = unitAtV7(result.state, { x: 3, y: 7 });
      expect(advanced.id).toBe(knight.id);
      expect(advanced.activation.overrunActive).toBe(true);
      expect(queryPlayerCommandsV7(result.state, actor)).toContainEqual({
        kind: "ATTACK",
        unitId: knight.id,
        targetUnitId: unitAtV7(state, { x: 2, y: 6 }).id,
      });
    }
  });

  it("is never pushed and never a Push destination", () => {
    // A wounded Juggernaut cannot kill the Nesting Egg: it stays in place.
    // The tile behind it, (8, 7), is free land a unit could be pushed onto.
    const state = grass(
      dino(
        [{ seat: 1, role: "JUGGERNAUT", at: { x: 6, y: 7 }, hp: 4 }],
        [{ seat: 0, role: "GUARD", at: NEST, maxHp: 10 }],
        { activeSeat: 1 },
      ),
      [{ x: 8, y: 7 }],
    );
    const humanId = seatIdV7(state, 1);
    const juggernaut = unitAtV7(state, { x: 6, y: 7 });
    const egg = unitAtV7(state, NEST);
    const onEgg = applyOkV7(state, humanId, {
      kind: "ATTACK",
      unitId: juggernaut.id,
      targetUnitId: egg.id,
    });
    expect(
      onEgg.events.find((event) => event.kind === "COMBAT_RESOLVED"),
    ).toMatchObject({ preview: { defenderDies: false, push: "BLOCKED" } });
    expect(kinds(onEgg.events)).not.toContain("UNIT_PUSHED");
    expect(unitAtV7(onEgg.state, NEST).id).toBe(egg.id);
    // The same Juggernaut pushes a Caveman, but never onto an Egg's tile.
    const blocked = dino(
      [
        { seat: 1, role: "JUGGERNAUT", at: { x: 5, y: 7 }, hp: 4 },
        { seat: 0, role: "FIGHTER", at: { x: 6, y: 7 } },
      ],
      [{ seat: 0, role: "GUARD", at: NEST }],
      { activeSeat: 1 },
    );
    const attacker = unitAtV7(blocked, { x: 5, y: 7 });
    const caveman = unitAtV7(blocked, { x: 6, y: 7 });
    expect(estimateCombatV7(blocked, attacker.id, caveman.id)).toMatchObject({
      defenderDies: false,
      push: "BLOCKED",
    });
    const result = applyOkV7(blocked, humanId, {
      kind: "ATTACK",
      unitId: attacker.id,
      targetUnitId: caveman.id,
    });
    expect(kinds(result.events)).not.toContain("UNIT_PUSHED");
    expect(unitAtV7(result.state, { x: 6, y: 7 }).id).toBe(caveman.id);
    // Without the Egg the same attack pushes the Caveman onto that tile.
    const free = grass(
      dino(
        [
          { seat: 1, role: "JUGGERNAUT", at: { x: 5, y: 7 }, hp: 4 },
          { seat: 0, role: "FIGHTER", at: { x: 6, y: 7 } },
        ],
        [],
        { activeSeat: 1 },
      ),
      [NEST],
    );
    expect(
      estimateCombatV7(
        free,
        unitAtV7(free, { x: 5, y: 7 }).id,
        unitAtV7(free, { x: 6, y: 7 }).id,
      ),
    ).toMatchObject({ push: "WILL_PUSH" });
  });
});

describe("ruleset-7 revision-19 Eggs and city capture", () => {
  const showcase = (factions: readonly FactionIdV7[]): MatchSetupV7 => ({
    rulesetId: RULESET_7_ID,
    seed: 1,
    width: 16,
    height: 16,
    aiCount: (factions.length - 1) as 1 | 2 | 3,
    aiDifficulty: "NORMAL",
    aiMode: "RIVAL",
    humanColor: "CORAL",
    factions: [...factions],
    ...mirrorOptionV7(factions),
    mapType: "SHOWCASE",
    mapGenerationRevision: "REGIONAL_BIOMES_NAVAL_V4",
    curiosities: false,
  });

  it("destroys exactly the Eggs homed to the captured city, in ID order, with no credit or Plunder", () => {
    // The Showcase gives every seat three cities. The Dinosaur seat lays two
    // Eggs at North (one per turn) and one at the Coast, and a Goblin
    // capturer takes North.
    const created = createPlayableGameV7(showcase(["DINOSAUR", "GOBLIN"]));
    if (!created.ok) throw new Error(created.error.code);
    let state = created.state;
    const dinosaurId = state.humanPlayerId;
    const goblinId = seatIdV7(state, 1);
    const [, north, coast] = state.cities.filter(
      (city) => city.ownerId === dinosaurId,
    );
    if (north === undefined || coast === undefined)
      throw new Error("city missing");
    const layFirst = (cityId: number, role: UnitRoleIdV7): void => {
      const command = queryPlayerCommandsV7(state, dinosaurId).find(
        (candidate) =>
          candidate.kind === "LAY_EGG" &&
          candidate.cityId === cityId &&
          candidate.role === role,
      );
      if (command === undefined) throw new Error("no LAY_EGG offered");
      state = applyOkV7(state, dinosaurId, command).state;
    };
    // A T-Rex Egg (two turns with Nesting) at North, then a Raptor Egg there
    // and one at the Coast on the next turn.
    layFirst(north.id, "KNIGHT");
    state = endTurnUntilV7(state, dinosaurId).state;
    layFirst(north.id, "RAIDER");
    layFirst(coast.id, "RAIDER");
    const northEggs = state.units.filter(
      (unit) => unit.form === "EGG" && unit.homeCityId === north.id,
    );
    const coastEggs = state.units.filter(
      (unit) => unit.form === "EGG" && unit.homeCityId === coast.id,
    );
    expect(northEggs).toHaveLength(2);
    expect(coastEggs).toHaveLength(1);
    // Put a capture-ready Goblin on the North center, on the Goblin's turn.
    const capturer = state.units.find(
      (unit) => unit.ownerId === goblinId && unit.role === "FIGHTER",
    );
    if (capturer === undefined) throw new Error("capturer missing");
    const ready = checkedV7({
      ...state,
      activeSeatIndex: state.turnOrder.indexOf(goblinId),
      units: state.units
        .filter((unit) => !sameV7(unit.at, north.at))
        .map((unit) =>
          unit.id === capturer.id
            ? {
                ...unit,
                at: north.at,
                captureEligible: true,
                activation: {
                  ...unit.activation,
                  moved: false,
                  attacked: false,
                  attacksUsed: 0,
                  recovered: false,
                  captured: false,
                  specialActed: false,
                  handled: false,
                },
              }
            : unit,
        ),
    });
    const coinsBefore = ready.players.find(
      (player) => player.id === goblinId,
    )?.coins;
    const result = applyOkV7(ready, goblinId, {
      kind: "CAPTURE",
      unitId: capturer.id,
    });
    expect(result.events.slice(0, 3)).toEqual([
      {
        kind: "CITY_CAPTURED",
        cityId: north.id,
        from: dinosaurId,
        to: goblinId,
      },
      ...northEggs
        .map((egg) => egg.id)
        .sort((left, right) => left - right)
        .map((unitId) => ({
          kind: "UNIT_DIED",
          unitId,
          cause: "CITY_CAPTURED",
        })),
    ]);
    for (const event of result.events)
      expect(parseEventV7(event).ok).toBe(true);
    // Removals: no kill credit, no Plunder (the Goblin has Commerce), no
    // Grave; the Coast Egg and every other unit stay.
    expect(kinds(result.events)).not.toContain("PLUNDER_AWARDED");
    expect(kinds(result.events)).not.toContain("PLAYER_ELIMINATED");
    expect(
      result.state.units.find((unit) => unit.id === capturer.id)?.kills,
    ).toBe(0);
    const spoils = result.events.some(
      (event) => event.kind === "SPOILS_AWARDED",
    );
    expect(
      result.state.players.find((player) => player.id === goblinId)?.coins,
    ).toBe((coinsBefore ?? 0) + (spoils ? 2 : 0));
    expect(result.state.eggs.map((entry) => entry.unitId)).toEqual(
      coastEggs.map((egg) => egg.id),
    );
    expect(result.state.units.filter((unit) => unit.form === "EGG")).toEqual(
      coastEggs,
    );
    // The former owner's hatched units homed there are orphaned, not lost.
    expect(
      result.state.units.filter(
        (unit) => unit.ownerId === dinosaurId && unit.homeCityId === north.id,
      ),
    ).toEqual([]);
    expect(result.state.units.length).toBe(ready.units.length - 2);
    // The other viewer sees the Egg deaths it could see.
    const projected = projectEventsV7(
      ready,
      result.state,
      dinosaurId,
      result.events,
    ).events;
    expect(
      projected.filter(
        (event) =>
          event.kind === "UNIT_DIED" && event.cause === "CITY_CAPTURED",
      ),
    ).toHaveLength(2);
  });

  it("removes the Eggs of a last city before the elimination events", () => {
    const state = dino(
      [
        { seat: 1, role: "FIGHTER", at: { x: 8, y: 8 }, captureEligible: true },
        { seat: 0, role: "FIGHTER", at: { x: 4, y: 3 } },
      ],
      [
        { seat: 0, role: "RAIDER", at: NEST },
        { seat: 0, role: "KNIGHT", at: { x: 9, y: 9 } },
      ],
      { activeSeat: 1 },
    );
    const humanId = seatIdV7(state, 1);
    const result = applyOkV7(state, humanId, {
      kind: "CAPTURE",
      unitId: unitAtV7(state, { x: 8, y: 8 }).id,
    });
    const deaths = result.events.flatMap((event) =>
      event.kind === "UNIT_DIED" ? [[event.unitId, event.cause]] : [],
    );
    expect(deaths).toEqual([
      [unitAtV7(state, NEST).id, "CITY_CAPTURED"],
      [unitAtV7(state, { x: 9, y: 9 }).id, "CITY_CAPTURED"],
      [unitAtV7(state, { x: 4, y: 3 }).id, "ELIMINATION"],
    ]);
    expect(kinds(result.events).indexOf("PLAYER_ELIMINATED")).toBeGreaterThan(
      kinds(result.events).lastIndexOf("UNIT_DIED"),
    );
    expect(result.state.eggs).toEqual([]);
    expect(result.state.units.map((unit) => unit.ownerId)).toEqual([humanId]);
  });
});

describe("ruleset-7 revision-19 Abandon Egg (Disband)", () => {
  it("removes an own Egg for half the printed cost, on the laying turn, without a city action", () => {
    for (const [role, refund] of [
      ["RAIDER", 2],
      ["MARKSMAN", 2],
      ["GUARD", 2],
      ["SWORDSMAN", 4],
      ["KNIGHT", 7],
    ] as const) {
      const start = dino([], [], { coins: 20 });
      const actor = start.humanPlayerId;
      const laid = applyOkV7(start, actor, lay(start, role, NEST)).state;
      const egg = unitAtV7(laid, NEST);
      const coins = laid.players.find((player) => player.id === actor)?.coins;
      expect(cityOfV7(laid, 0).cityActionAvailable).toBe(false);
      const command: CommandV7 = { kind: "DISBAND", unitId: egg.id };
      expect(queryPlayerCommandsV7(laid, actor)).toContainEqual(command);
      expect(previewDisbandV7(laid, actor, egg.id)).toEqual({
        unitId: egg.id,
        refund,
        homeCityId: egg.homeCityId,
        complete: true,
      });
      const result = applyOkV7(laid, actor, command);
      expect(result.events).toEqual([
        {
          kind: "UNIT_DISBANDED",
          playerId: actor,
          unitId: egg.id,
          role,
          coinDelta: refund,
        },
      ]);
      expect(result.state.eggs).toEqual([]);
      expect(result.state.units.some((unit) => unit.id === egg.id)).toBe(false);
      expect(
        result.state.players.find((player) => player.id === actor)?.coins,
      ).toBe((coins ?? 0) + refund);
      expect(assignedUnitCountV7(result.state, cityOfV7(laid, 0).id)).toBe(0);
    }
  });

  it("needs Administration and is never legal for another player's Egg", () => {
    const state = dino(
      [{ seat: 1, role: "FIGHTER", at: { x: 1, y: 1 } }],
      [{ seat: 0, role: "KNIGHT", at: NEST }],
      { techs: { 0: without("ADMINISTRATION") } },
    );
    const actor = state.humanPlayerId;
    const egg = unitAtV7(state, NEST);
    expect(
      applyCommandV7(state, actor, { kind: "DISBAND", unitId: egg.id }),
    ).toMatchObject({
      accepted: false,
      error: { code: "TECH_REQUIRED", params: { tech: "ADMINISTRATION" } },
    });
    expect(
      queryPlayerCommandsV7(state, actor).filter(
        (command) => "unitId" in command && command.unitId === egg.id,
      ),
    ).toEqual([]);
    expect(previewDisbandV7(state, actor, egg.id)).toBeNull();
    const foreign = checkedV7({
      ...state,
      activeSeatIndex: state.turnOrder.indexOf(seatIdV7(state, 1)),
    });
    expect(
      applyCommandV7(foreign, seatIdV7(state, 1), {
        kind: "DISBAND",
        unitId: egg.id,
      }),
    ).toMatchObject({ accepted: false, error: { code: "UNIT_NOT_OWNED" } });
  });
});

describe("ruleset-7 revision-19 Eggs and reward displacement", () => {
  it("never moves an Egg and never chooses an Egg's tile", () => {
    // A Shaman garrisons the center; Eggs hold the first two ring tiles
    // (placeholders keep the fixture's Farms off those tiles).
    const { state: rewardState, command } = rewardStateV7(
      "MILITIA",
      "DINOSAUR",
      [
        { role: "CAPTAIN", at: { x: 8, y: 8 } },
        { role: "FIGHTER", at: { x: 7, y: 7 } },
        { role: "FIGHTER", at: { x: 8, y: 7 } },
      ],
    );
    const state = withEggsV7(
      checkedV7({
        ...rewardState,
        units: rewardState.units.filter(
          (unit) =>
            unit.ownerId !== rewardState.humanPlayerId ||
            unit.role !== "FIGHTER",
        ),
      }),
      [
        { seat: 0, role: "RAIDER", at: { x: 7, y: 7 } },
        { seat: 0, role: "MARKSMAN", at: { x: 8, y: 7 } },
      ],
    );
    const actor = state.humanPlayerId;
    const occupant = unitAtV7(state, { x: 8, y: 8 });
    const eggs = state.units.filter((unit) => unit.form === "EGG");
    const result = applyOkV7(state, actor, command);
    // Tuning 6 (`pulp_wars-w49.6`, 7r49): the Shaman stays on the center
    // and the Caveman appears on the first free cell beside it, past the
    // two Eggs (before, the Caveman took the center and the Shaman was
    // displaced to that cell).
    expect(
      result.events.some((event) => event.kind === "UNIT_SPAWN_DISPLACED"),
    ).toBe(false);
    expect(result.state.units.filter((unit) => unit.form === "EGG")).toEqual(
      eggs,
    );
    expect(unitAtV7(result.state, { x: 8, y: 8 })).toEqual(occupant);
    expect(unitAtV7(result.state, { x: 9, y: 7 })).toMatchObject({
      role: "FIGHTER",
      form: "LAND",
    });
    // No reward creates an Egg.
    expect(result.state.eggs).toEqual(state.eggs);
  });
});

describe("ruleset-7 revision-19 Egg event projection", () => {
  it("shows EGG_LAID without its cost, EGG_HATCHED, and Egg deaths to viewers who explored the tile", () => {
    const start = dino([], [], { techs: { 0: without("FORTIFICATION") } });
    const actor = start.humanPlayerId;
    const other = seatIdV7(start, 1);
    const blind = patchPlayer(start, 1, {
      explored: (
        start.players.find((player) => player.seat === 1)?.explored ?? []
      ).filter((at) => !sameV7(at, NEST)),
    });
    for (const [state, sees] of [
      [start, true],
      [blind, false],
    ] as const) {
      const laid = applyOkV7(state, actor, lay(state, "RAIDER", NEST));
      const owner = projectEventsV7(state, laid.state, actor, laid.events);
      expect(owner.events).toEqual(laid.events);
      const projected = projectEventsV7(state, laid.state, other, laid.events);
      expect(projected.events).toEqual(
        sees ? [{ ...laid.events[0], cost: null }] : [],
      );
      const round = endTurnUntilV7(laid.state, actor);
      // Project the Start Turn that hatched it (the opponent's END_TURN).
      const ended = applyOkV7(laid.state, actor, { kind: "END_TURN" }).state;
      const hatch = applyOkV7(ended, other, { kind: "END_TURN" });
      expect(hatch.state).toEqual(round.state);
      const seen = projectEventsV7(
        ended,
        hatch.state,
        other,
        hatch.events,
      ).events;
      expect(seen.filter((event) => event.kind === "EGG_HATCHED")).toEqual(
        sees
          ? hatch.events.filter((event) => event.kind === "EGG_HATCHED")
          : [],
      );
      expect(
        projectEventsV7(ended, hatch.state, actor, hatch.events).events.filter(
          (event) => event.kind === "EGG_HATCHED",
        ),
      ).toHaveLength(1);
    }
    // An Egg death is projected like any unit death.
    const fight = dino(
      [{ seat: 1, role: "FIGHTER", at: { x: 6, y: 7 } }],
      [{ seat: 0, role: "RAIDER", at: NEST }],
      { activeSeat: 1 },
    );
    const killed = applyOkV7(fight, other, {
      kind: "ATTACK",
      unitId: unitAtV7(fight, { x: 6, y: 7 }).id,
      targetUnitId: unitAtV7(fight, NEST).id,
    });
    for (const viewer of [actor, other])
      expect(
        projectEventsV7(fight, killed.state, viewer, killed.events).events,
      ).toContainEqual({
        kind: "UNIT_DIED",
        unitId: unitAtV7(fight, NEST).id,
        cause: "ATTACK",
      });
  });
});

describe("ruleset-7 revision-19 Showcase with a Dinosaur seat", () => {
  it("still starts with ten hatched units and no Egg", () => {
    for (const role of UNIT_ROLE_IDS_V7) expect(role).toBeTruthy();
    const created = createPlayableGameV7({
      rulesetId: RULESET_7_ID,
      seed: 1,
      width: 16,
      height: 16,
      aiCount: 1,
      aiDifficulty: "NORMAL",
      aiMode: "RIVAL",
      humanColor: "CORAL",
      factions: ["DINOSAUR", "DINOSAUR"],
      allowDuplicateFactions: true,
      mapType: "SHOWCASE",
      mapGenerationRevision: "REGIONAL_BIOMES_NAVAL_V4",
      curiosities: false,
    });
    if (!created.ok) throw new Error(created.error.code);
    expect(created.state.eggs).toEqual([]);
    expect(created.state.units).toHaveLength(24);
    expect(
      created.state.units.every(
        (unit) => unit.form === "LAND" || unit.form === "NAVAL",
      ),
    ).toBe(true);
    expect(created.state.units.every((unit) => unit.kills === 0)).toBe(true);
    expect(kinds(created.events)).not.toContain("EGG_LAID");
    expect(kinds(created.events)).not.toContain("EGG_HATCHED");
  });
});
