import { describe, expect, it } from "vitest";
import {
  COMMAND_KIND_ORDER_V7,
  DOMAIN_EVENT_KIND_ORDER_V7,
  FACTION_IDS_V7,
  FREEZE_LINE_V7,
  GLACIER_ICE_TURNS_V7,
  ICE_CRUSH_DAMAGE_V7,
  ICE_SEA_DOG_UNITS_V7,
  ICE_TURNS_V7,
  NAVAL_ROLE_IDS_V7,
  PRIOR_RULESET_7_IDS,
  RULESET_7_ID,
  SEA_DOG_SHIPS_V7,
  TECHNOLOGY_DISPLAY_NAME_OVERRIDES_V7,
  UNIT_ROLE_IDS_V7,
  WITCH_FREEZE_RADIUS_V7,
  assertRuleset7Registry,
  createPlayableGameV7,
  createReplayV7,
  effectiveRoleRuleV7,
  factionTreeV7,
  factionUnlocksRoleV7,
  forbiddenTechnologiesV7,
  iceIsPermanentV7,
  isNavalRoleV7,
  parseCommandV7,
  parseGameStateV7,
  parseMatchSetupV7,
  parseReplayFileV7,
  queryPlayerCommandsV7,
  queryTechnologyTreeV7,
  showcaseStripCenterXV7,
  technologyCapabilitiesV7,
  unitFactionV7,
  viewForV7,
  type FactionIdV7,
  type GameStateV7,
  type MatchSetupV7,
  type TechnologyIdV7,
} from "../../src/engine/index";
import {
  OBSOLETE_SAVE_STORAGE_KEYS_V7,
  SAVE_STORAGE_KEY_V7,
  createSaveEnvelopeV7,
  parseSaveV7,
} from "../../src/persistence/index";
import { frozenArenaV7, patchFrozenUnitV7 } from "../fixtures/v7-frozen-sea";
import { goblinSetupV7 } from "../fixtures/v7-goblin-arena";
import { navalArenaV7, seatV7 } from "../fixtures/v7-naval-branch";

// The naval branch, engine step II (`pulp_wars-5ti.3`,
// docs/product/RULESET_7_NAVAL_BRANCH.md sections 2.2, 3, 8.3, 8.11, and
// 12): identity 7r44, the Ice Folk Naval tree, the `FREEZE` command, the
// three events, the ice list of the state, and the Showcase.

const NAVAL_BRANCH = [
  "SHORECRAFT",
  "NAVIGATION",
  "NAVAL_ENGINEERING",
  "SEAMANSHIP",
  "SUBMERSIBLES",
] as const satisfies readonly TechnologyIdV7[];
const SEAFARERS = FACTION_IDS_V7.filter((faction) => faction !== "ICE_FOLK");

// The frozen sea took `7r44`. `pulp_wars-5ti.11` took `7r45` for one rule
// fix (no Dig In on ice; tests/unit/ruleset-v7-frozen-sea-interactions.test.ts),
// with no shape change, and `pulp_wars-w49.3` took `7r46` for tuning 1
// (tests/unit/ruleset-v7-tuning-1.test.ts) and `7r47` for tuning 2
// (tests/unit/ruleset-v7-tuning-2.test.ts), so `7r44` to `7r46` are the
// last prior identities here (before `7r47` and `7r48`, the outgoing
// identities of tunings 5 and 6).
describe("the frozen sea identity (7r44, then 7r45 for the ice fortification fix, then 7r46 and 7r47 for tunings 1 and 2)", () => {
  it("is 7r47 with 7r44 to 7r46 last in the gap-free prior list and their save keys obsolete", () => {
    expect(RULESET_7_ID).toBe("pulp-wars-poc-7r66");
    expect(PRIOR_RULESET_7_IDS.slice(-23, -19)).toEqual([
      "pulp-wars-poc-7r43",
      "pulp-wars-poc-7r44",
      "pulp-wars-poc-7r45",
      "pulp-wars-poc-7r46",
    ]);
    expect(PRIOR_RULESET_7_IDS).toHaveLength(65);
    expect(PRIOR_RULESET_7_IDS).not.toContain(RULESET_7_ID);
    expect(SAVE_STORAGE_KEY_V7).toBe("pulpWars.save.v7r66.current");
    expect(OBSOLETE_SAVE_STORAGE_KEYS_V7.slice(-22, -19)).toEqual([
      "pulpWars.save.v7r44.current",
      "pulpWars.save.v7r45.current",
      "pulpWars.save.v7r46.current",
    ]);
    expect(OBSOLETE_SAVE_STORAGE_KEYS_V7).not.toContain(SAVE_STORAGE_KEY_V7);
  });

  it("rejects a 7r44 setup, state, replay, and save without migration", () => {
    const setup = goblinSetupV7(["ORIGINAL", "UNDEAD"]);
    const created = createPlayableGameV7(setup);
    if (!created.ok) throw new Error(created.error.code);
    const { state } = created;
    expect(state.rulesetId).toBe("pulp-wars-poc-7r66");
    const oldSetup = { ...setup, rulesetId: "pulp-wars-poc-7r44" };
    expect(parseMatchSetupV7(oldSetup)).toBeNull();
    expect(
      parseGameStateV7({
        ...state,
        rulesetId: "pulp-wars-poc-7r44",
        setup: oldSetup,
      }),
    ).toBeNull();
    expect(
      parseReplayFileV7({
        format: "pulp-wars-replay",
        version: 7,
        setup: oldSetup,
        commands: [],
        checkpoints: [],
      }),
    ).toEqual({ kind: "INCOMPATIBLE_REPLAY" });
    const save = createSaveEnvelopeV7(
      { state, replay: createReplayV7(setup) },
      "2026-10-05T12:00:00.000Z",
    );
    expect(parseSaveV7(JSON.stringify(save))).toMatchObject({ kind: "VALID" });
    expect(
      parseSaveV7(
        JSON.stringify({
          ...save,
          rulesetId: "pulp-wars-poc-7r44",
          setup: oldSetup,
          state: { ...save.state, rulesetId: "pulp-wars-poc-7r44" },
        }),
      ),
    ).toMatchObject({ kind: "INCOMPATIBLE" });
    // A state without the `ice` list is not a current state.
    const { ice: _ice, ...withoutIce } = state;
    void _ice;
    expect(parseGameStateV7(withoutIce)).toBeNull();
    expect(state.ice).toEqual([]);
  });
});

describe("the frozen sea shapes", () => {
  it("puts FREEZE and the three events where the spec puts them, with the constants", () => {
    const after = <T>(order: readonly T[], kind: T) =>
      order[order.indexOf(kind) + 1];
    expect(after(COMMAND_KIND_ORDER_V7, "COLD_SNAP")).toBe("FREEZE");
    expect(after(COMMAND_KIND_ORDER_V7, "FREEZE")).toBe("TUNNEL");
    expect(after(DOMAIN_EVENT_KIND_ORDER_V7, "UNITS_CHILLED")).toBe(
      "WATER_FROZEN",
    );
    expect(after(DOMAIN_EVENT_KIND_ORDER_V7, "WATER_FROZEN")).toBe(
      "ICE_MELTED",
    );
    expect(after(DOMAIN_EVENT_KIND_ORDER_V7, "ICE_MELTED")).toBe(
      "UNITS_CRUSHED",
    );
    expect(after(DOMAIN_EVENT_KIND_ORDER_V7, "UNITS_CRUSHED")).toBe(
      "UNIT_SUGAR_RUSHED",
    );
    expect([
      ICE_TURNS_V7,
      GLACIER_ICE_TURNS_V7,
      FREEZE_LINE_V7,
      WITCH_FREEZE_RADIUS_V7,
      ICE_CRUSH_DAMAGE_V7,
      ICE_SEA_DOG_UNITS_V7,
      // The economy rejig (`pulp_wars-w49.16`, 7r54): 5 units on the ice (3).
    ]).toEqual([3, 5, 2, 1, 3, 5]);
    expect(ICE_SEA_DOG_UNITS_V7).toBe(SEA_DOG_SHIPS_V7);
    expect(() => assertRuleset7Registry()).not.toThrow();
  });

  it("parses FREEZE with exactly a unit and a tile", () => {
    const command = { kind: "FREEZE", unitId: 3, at: { x: 2, y: 3 } };
    expect(parseCommandV7(command)).toEqual({ ok: true, value: command });
    for (const broken of [
      { kind: "FREEZE", unitId: 3 },
      { kind: "FREEZE", at: { x: 2, y: 3 } },
      { kind: "FREEZE", unitId: 3, at: { x: 2 } },
      { kind: "FREEZE", unitId: 0, at: { x: 2, y: 3 } },
      { kind: "FREEZE", unitId: 3, at: { x: 2, y: 3 }, targetUnitId: 4 },
    ])
      expect(parseCommandV7(broken).ok).toBe(false);
  });
});

describe("the Ice Folk Naval tree (section 2.2)", () => {
  it("keeps the IDs, tiers, prerequisites, and costs, with the ice unlocks and no ship", () => {
    const tree = factionTreeV7("ICE_FOLK");
    const human = factionTreeV7("ORIGINAL");
    const unlocks = (tech: TechnologyIdV7) =>
      tree.nodes.find((node) => node.id === tech)?.unlocks;
    expect(unlocks("SHORECRAFT")).toEqual([
      { kind: "COMMAND", command: "HARVEST_FISH" },
      { kind: "COMMAND", command: "BUILD_PORT" },
      { kind: "FREEZE", depth: "SHALLOW" },
    ]);
    expect(unlocks("NAVIGATION")).toEqual([
      { kind: "COMMAND", command: "GATHER_PEARLS" },
      { kind: "SEA_TRADE_INCOME", coins: 1 },
      { kind: "FREEZE", depth: "DEEP" },
    ]);
    expect(unlocks("NAVAL_ENGINEERING")).toEqual([
      { kind: "COMMAND", command: "BUILD_SHIPYARD" },
      { kind: "NAVAL_TRAINING_DISCOUNT", coins: 2 },
      { kind: "ICEBOUND" },
    ]);
    expect(unlocks("SEAMANSHIP")).toEqual([{ kind: "BLACK_ICE" }]);
    expect(unlocks("SUBMERSIBLES")).toEqual([
      { kind: "HARBOURS", population: 1 },
      { kind: "GLACIER", iceTurns: 5 },
    ]);
    for (const tech of NAVAL_BRANCH) {
      const node = tree.nodes.find((entry) => entry.id === tech);
      const reference = human.nodes.find((entry) => entry.id === tech);
      expect(node?.unlockedRoles, tech).toEqual([]);
      expect([node?.tier, node?.branch, node?.prerequisites], tech).toEqual([
        reference?.tier,
        reference?.branch,
        reference?.prerequisites,
      ]);
    }
    expect(TECHNOLOGY_DISPLAY_NAME_OVERRIDES_V7.ICE_FOLK).toEqual({
      FORTIFICATION: "Deep Winter",
      EXPLOSIVES: "Brittle",
      SHORECRAFT: "Rime",
      NAVIGATION: "Pack Ice",
      NAVAL_ENGINEERING: "Icebound",
      SEAMANSHIP: "Black Ice",
      SUBMERSIBLES: "Glacier",
      // The ninth unit (7r55): the nodes named for their unit.
      SAWMILLING: "Boulders",
      CHIVALRY: "Sabretooths",
      METALLURGY: "Mammoths",
    });
  });

  it("reads every ice rule through the capabilities, never a raw technology", () => {
    const of = (techs: readonly TechnologyIdV7[]) =>
      technologyCapabilitiesV7(techs, "ICE_FOLK");
    const facts = (techs: readonly TechnologyIdV7[]) => {
      const caps = of(techs);
      return [
        caps.freezeWater,
        caps.icebound,
        caps.blackIce,
        caps.iceTurns,
        caps.iceCover,
        caps.harbourPopulation,
      ];
    };
    expect(facts([])).toEqual(["NONE", false, false, 3, false, 0]);
    expect(facts(["SHORECRAFT"])).toEqual([
      "SHALLOW",
      false,
      false,
      3,
      false,
      0,
    ]);
    expect(facts(["SHORECRAFT", "NAVIGATION"])).toEqual([
      "DEEP",
      false,
      false,
      3,
      false,
      0,
    ]);
    expect(facts(["SHORECRAFT", "NAVIGATION", "NAVAL_ENGINEERING"])).toEqual([
      "DEEP",
      true,
      false,
      3,
      false,
      0,
    ]);
    expect(facts(["SHORECRAFT", "SEAMANSHIP"])).toEqual([
      "SHALLOW",
      false,
      true,
      3,
      false,
      0,
    ]);
    expect(facts(["SHORECRAFT", "SEAMANSHIP", "SUBMERSIBLES"])).toEqual([
      "SHALLOW",
      false,
      true,
      5,
      true,
      1,
    ]);
    // No ship, no Ram, and no Board, whatever the seat researched.
    const all = of(NAVAL_BRANCH);
    expect(all.trainableRoles.some((role) => isNavalRoleV7(role))).toBe(false);
    expect([all.ram, all.boarding]).toEqual([false, false]);
    expect(all.commands).not.toContain("BOARD");
    expect(all.commands).toEqual(
      expect.arrayContaining([
        "HARVEST_FISH",
        "GATHER_PEARLS",
        "BUILD_PORT",
        "BUILD_SHIPYARD",
      ]),
    );
    for (const role of NAVAL_ROLE_IDS_V7) {
      expect(factionUnlocksRoleV7("ICE_FOLK", role), role).toBe(false);
      for (const faction of SEAFARERS)
        expect(factionUnlocksRoleV7(faction, role), faction).toBe(true);
    }
  });

  it("leaves every seafaring tree as it was: no ice rule, the ships, the Ram, and Board", () => {
    for (const faction of SEAFARERS) {
      const caps = technologyCapabilitiesV7(NAVAL_BRANCH, faction);
      expect(
        [
          caps.freezeWater,
          caps.icebound,
          caps.blackIce,
          caps.iceTurns,
          caps.iceCover,
        ],
        faction,
      ).toEqual(["NONE", false, false, 3, false]);
      expect(
        [caps.ram, caps.boarding, caps.harbourPopulation],
        faction,
      ).toEqual([true, true, 1]);
      expect(caps.trainableRoles, faction).toEqual(
        expect.arrayContaining([...NAVAL_ROLE_IDS_V7]),
      );
    }
  });

  it("gives FREEZE to every Ice Folk land role and to no other role", () => {
    for (const faction of FACTION_IDS_V7)
      for (const role of UNIT_ROLE_IDS_V7)
        expect(
          effectiveRoleRuleV7(role, faction).abilities.includes("FREEZE"),
          `${faction} ${role}`,
        ).toBe(
          // (The ninth unit, 7r55: the heavy role is the Mammoth.)
          faction === "ICE_FOLK" && !isNavalRoleV7(role),
        );
  });

  it("shows the branch in the public technology tree and forbids it on Dry Land", () => {
    const state = navalArenaV7({
      factions: ["ICE_FOLK", "ORIGINAL"],
      technologies: [["SHORECRAFT"], []],
      units: [],
    });
    const tree = queryTechnologyTreeV7(state, state.humanPlayerId);
    const naval = tree.nodes.filter((node) => node.branch === "NAVAL");
    expect(naval.map((node) => node.id)).toEqual(NAVAL_BRANCH);
    expect(naval.flatMap((node) => node.unlockedRoleRules)).toEqual([]);
    expect(tree.nodes.find((node) => node.id === "SEAMANSHIP")).toMatchObject({
      state: "AVAILABLE",
      cost: 7,
    });
    const dry: MatchSetupV7 = goblinSetupV7(["ICE_FOLK", "ORIGINAL"]);
    expect(dry.mapType).toBe("DRY_LAND");
    expect([...forbiddenTechnologiesV7(dry).keys()]).toEqual(NAVAL_BRANCH);
    const created = createPlayableGameV7(dry);
    if (!created.ok) throw new Error(created.error.code);
    expect(
      queryPlayerCommandsV7(
        viewForV7(created.state, created.state.humanPlayerId),
      ).some(
        (command) =>
          command.kind === "FREEZE" ||
          (command.kind === "RESEARCH" &&
            (NAVAL_BRANCH as readonly string[]).includes(command.tech)),
      ),
    ).toBe(false);
  });
});

describe("the ice list of a state (section 8.3)", () => {
  const base = (): GameStateV7 =>
    frozenArenaV7({
      units: [
        { seat: 0, role: "FIGHTER", at: { x: 2, y: 3 } },
        { seat: 1, role: "PATROL_BOAT", at: { x: 8, y: 6 } },
      ],
      ice: [{ at: { x: 2, y: 3 } }, { at: { x: 3, y: 4 } }],
    });
  const withIce = (state: GameStateV7, ice: readonly unknown[]): unknown => ({
    ...state,
    ice,
  });
  const owner = (state: GameStateV7) => seatV7(state, 0).id;

  it("accepts sorted entries on water and rejects every malformed one", () => {
    const state = base();
    expect(parseGameStateV7(state)).not.toBeNull();
    const entry = (
      x: number,
      y: number,
      turnsLeft = 3,
      ownerId = owner(state),
    ) => ({
      at: { x, y },
      ownerId,
      turnsLeft,
    });
    const keep = entry(2, 3);
    const rejected: readonly (readonly [string, readonly unknown[]])[] = [
      ["off the board", [keep, entry(11, 3)]],
      ["on a land tile", [entry(2, 2), keep]],
      ["on a dock", [keep, entry(4, 3)]],
      ["a duplicate", [keep, keep]],
      ["unsorted", [entry(3, 4), keep]],
      ["turnsLeft below 0", [entry(2, 3, -1)]],
      ["turnsLeft above 5", [entry(2, 3, 6)]],
      ["a fractional turnsLeft", [entry(2, 3, 1.5)]],
      ["an owner that is not a player", [entry(2, 3, 3, 99 as never)]],
      ["an extra key", [{ ...keep, permanent: true }]],
      ["a missing key", [{ at: keep.at, ownerId: keep.ownerId }]],
      // A land unit stands on water only on ice.
      ["no ice under a land unit on water", [entry(3, 4)]],
    ];
    for (const [label, ice] of rejected)
      expect(parseGameStateV7(withIce(state, ice)), label).toBeNull();
    for (const turnsLeft of [0, 1, 5])
      expect(
        parseGameStateV7(withIce(state, [entry(2, 3, turnsLeft)])),
        String(turnsLeft),
      ).not.toBeNull();
    expect(parseGameStateV7({ ...state, ice: "ice" })).toBeNull();
  });

  it("rejects any ice in a match without an Ice Folk seat", () => {
    const state = navalArenaV7({ units: [] });
    expect(state.setup.factions).not.toContain("ICE_FOLK");
    expect(
      parseGameStateV7(
        withIce(state, [
          { at: { x: 2, y: 3 }, ownerId: owner(state), turnsLeft: 3 },
        ]),
      ),
    ).toBeNull();
  });

  it("rejects an Ice Folk unit afloat and a ship of an Ice Folk seat", () => {
    const state = base();
    const yeti = state.units.find((unit) => unit.at.x === 2 && unit.at.y === 3);
    const boat = state.units.find((unit) => unit.role === "PATROL_BOAT");
    if (yeti === undefined || boat === undefined) throw new Error("no units");
    expect(unitFactionV7(state, yeti)).toBe("ICE_FOLK");
    const patched = (id: number, patch: Record<string, unknown>): unknown => ({
      ...state,
      units: state.units.map((unit) =>
        unit.id === id ? { ...unit, ...patch } : unit,
      ),
    });
    expect(parseGameStateV7(patched(yeti.id, { form: "EMBARKED" }))).toBeNull();
    expect(
      parseGameStateV7(
        patched(yeti.id, { form: "NAVAL", role: "PATROL_BOAT" }),
      ),
    ).toBeNull();
    // The Human boat handed to the Ice Folk seat.
    expect(
      parseGameStateV7(
        patched(boat.id, { ownerId: owner(state), homeCityId: null }),
      ),
    ).toBeNull();
  });

  it("lists the ice a viewer has explored, with `permanent`", () => {
    const state = frozenArenaV7({
      units: [],
      explored: [true, false],
      ice: [
        { at: { x: 5, y: 3 }, turnsLeft: 2 },
        { at: { x: 2, y: 5 }, turnsLeft: 1 },
        // Next to seat 1's capital, which seat 1 has explored.
        { at: { x: 5, y: 7 }, turnsLeft: 3 },
      ],
    });
    const home = state.ice.find((entry) => entry.at.y === 3);
    if (home === undefined) throw new Error("no home ice");
    expect(iceIsPermanentV7(state, home)).toBe(true);
    expect(viewForV7(state, owner(state)).ice).toEqual([
      {
        at: { x: 5, y: 3 },
        ownerId: owner(state),
        turnsLeft: 2,
        permanent: true,
      },
      {
        at: { x: 2, y: 5 },
        ownerId: owner(state),
        turnsLeft: 1,
        permanent: false,
      },
      {
        at: { x: 5, y: 7 },
        ownerId: owner(state),
        turnsLeft: 3,
        permanent: false,
      },
    ]);
    expect(viewForV7(state, seatV7(state, 1).id).ice).toEqual([
      {
        at: { x: 5, y: 7 },
        ownerId: owner(state),
        turnsLeft: 3,
        permanent: false,
      },
    ]);
  });
});

describe("the Showcase with an Ice Folk seat (section 3.3)", () => {
  const setup = (factions: readonly FactionIdV7[]): MatchSetupV7 => ({
    rulesetId: RULESET_7_ID,
    seed: 1,
    width: 16,
    height: 16,
    aiCount: 3,
    aiDifficulty: "NORMAL",
    aiMode: "RIVAL",
    humanColor: "CORAL",
    factions: [...factions],
    mapType: "SHOWCASE",
    mapGenerationRevision: "REGIONAL_BIOMES_NAVAL_V4",
    curiosities: false,
  });

  it("gives it no ship: the tiles of its three boats are its ice, and a Freeze and a slide are within a walk", () => {
    const created = createPlayableGameV7(
      setup(["ICE_FOLK", "ORIGINAL", "UNDEAD", "GOBLIN"]),
    );
    if (!created.ok) throw new Error(created.error.code);
    const { state } = created;
    const ice = seatV7(state, 0);
    const cx = showcaseStripCenterXV7(0, 3);
    const own = state.units.filter((unit) => unit.ownerId === ice.id);
    // (The ninth unit, 7r55: eight and the Musk Ox.)
    expect(own).toHaveLength(9);
    expect(own.every((unit) => unit.form === "LAND")).toBe(true);
    expect(state.ice).toEqual([
      { at: { x: cx, y: 12 }, ownerId: ice.id, turnsLeft: 5 },
      { at: { x: cx, y: 13 }, ownerId: ice.id, turnsLeft: 5 },
      { at: { x: cx + 1, y: 13 }, ownerId: ice.id, turnsLeft: 5 },
    ]);
    // The one in its Coast city's territory is permanent.
    expect(state.ice.map((entry) => iceIsPermanentV7(state, entry))).toEqual([
      true,
      false,
      false,
    ]);
    // Every other seat keeps its three ships and its entity IDs.
    for (const seat of [1, 2, 3] as const) {
      const player = state.players.find((entry) => entry.seat === seat);
      expect(
        state.units.filter(
          (unit) => unit.ownerId === player?.id && unit.form === "NAVAL",
        ),
      ).toHaveLength(3);
    }
    const reference = createPlayableGameV7(
      setup(["DWARF", "ORIGINAL", "UNDEAD", "GOBLIN"]),
    );
    if (!reference.ok) throw new Error(reference.error.code);
    expect(state.nextEntityId).toBe(reference.state.nextEntityId);
    expect(
      state.units
        .filter((unit) => unit.ownerId !== ice.id)
        .map((unit) => unit.id),
    ).toEqual(
      reference.state.units
        .filter((unit) => unit.ownerId !== seatV7(reference.state, 0).id)
        .map((unit) => unit.id),
    );
    // No ship can be trained on the first turn; with the Yeti on the Coast
    // center (a walk of the first turns) a Freeze of the home ice and a Move
    // onto it are on offer.
    expect(
      queryPlayerCommandsV7(viewForV7(state, ice.id)).some(
        (command) => command.kind === "TRAIN_NAVAL",
      ),
    ).toBe(false);
    const yeti = own.find((unit) => unit.role === "FIGHTER");
    if (yeti === undefined) throw new Error("no Yeti");
    const ashore = patchFrozenUnitV7(state, yeti.id, {
      at: { x: cx, y: 11 },
    });
    const commands = queryPlayerCommandsV7(viewForV7(ashore, ice.id));
    expect(commands.some((command) => command.kind === "FREEZE")).toBe(true);
    expect(commands.some((command) => command.kind === "TRAIN_NAVAL")).toBe(
      false,
    );
    // A Move onto the home ice is on offer on the first turn.
    expect(
      commands.some(
        (command) =>
          command.kind === "MOVE" &&
          command.path.at(-1)?.x === cx &&
          (command.path.at(-1)?.y ?? 0) >= 12,
      ),
    ).toBe(true);
  });
});
