import { describe, expect, it } from "vitest";
import { chooseNormalCommandV7 } from "../../src/ai/v7";
import {
  COMMAND_KIND_ORDER_V7,
  CULT_BASELINE_V1_TREE,
  DOMAIN_EVENT_KIND_ORDER_V7,
  FACTION_IDS_V7,
  FAVOUR_SOURCES_V7,
  FLAWLESS_BREAKING_EVENT_KINDS_V7,
  MARTYR_FAVOUR_V7,
  MIND_CONTROLLED_LOST_ABILITIES_V7,
  OFFERING_FAVOUR_V7,
  OFFERING_MINIMUM_LEVEL_V7,
  OFFERING_POPULATION_V7,
  PRIOR_RULESET_7_IDS,
  RULESET_7_ID,
  SAVE_STORAGE_KEY_V7,
  SEIZE_BROKEN_HP_V7,
  SEIZE_FAVOUR_MULTIPLIER_V7,
  TECHNOLOGY_IDS_V7,
  UNIT_ROLE_IDS_V7,
  applyCommandV7,
  canonicalHash,
  cityIncomeV7,
  cityOfferedPopulationV7,
  compareCommandsV7,
  createPlayableGameV7,
  createReplayV7,
  effectiveRoleRuleV7,
  factionHasFavourV7,
  favourOfV7,
  isRobedCultistV7,
  parseCommandV7,
  parseEventV7,
  parseGameStateV7,
  parseMatchSetupV7,
  previewOfferingV7,
  previewSacrificeV7,
  previewSeizeV7,
  projectEventsV7,
  queryPlayerCommandsV7,
  resolveCityGrowthV7,
  roleMechanicsV7,
  scoreV7,
  technologyCapabilitiesV7,
  unitFavourValueV7,
  unitRoleRuleV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type DomainEventV7,
  type FactionIdV7,
  type GameStateV7,
  type TechnologyIdV7,
  type UnitRoleIdV7,
} from "../../src/engine/index";
import {
  OBSOLETE_SAVE_STORAGE_KEYS_V7,
  createSaveEnvelopeV7,
  parseSaveV7,
} from "../../src/persistence/index";
import {
  cultCommandPresentationV7,
  viewFavourV7,
} from "../../src/render/cult-presentation-v7";
import { roleGlossaryV7 } from "../../src/render/unit-glossary-v7";
import { checkedV7 } from "../fixtures/v7-builders";
import { cultFieldV7, withFarmsV7, withFavourV7 } from "../fixtures/v7-cult";
import { cityOfV7 } from "../fixtures/v7-dinosaur-arena";
import {
  applyOkV7,
  goblinArenaV7,
  goblinSetupV7,
  seatIdV7,
  unitAtV7,
  type GoblinPieceV7,
} from "../fixtures/v7-goblin-arena";
import {
  martianFieldV7,
  offeredV7,
  playV7,
  rejectedV7,
} from "../fixtures/v7-martian";
import {
  at,
  attackV7,
  fieldV7,
  kindsV7,
  movedV7,
  unexploreV7,
  type FieldOptionsV7,
} from "../fixtures/v7-revision20";

/**
 * The Cultists of the Ancient Ones, engine bead E2 (`pulp_wars-mch9.4`,
 * docs/product/RULESET_7_CULTISTS.md sections 3, 5, and 8.2): Favour, the
 * Summoner's Sacrifice and Seize, a city's Offering, and the Chosen's
 * Martyr, with their Score and Flawless rules, events, previews, and saves.
 *
 * Every state here is built by hand; no match is played. The field is the
 * two-seat 11 x 11 board of `fieldV7`: seat 0 capital (8, 8) with territory
 * x 7 to 9, y 7 to 9; seat 1 capital (2, 8) with territory x 1 to 3,
 * y 7 to 9; everything else open Grass, all of it explored by both seats.
 */

/** A Summoner at (5, 2) ready to act, with `pieces` around it. */
const SUMMONER: GoblinPieceV7 = { seat: 0, role: "CAPTAIN", at: at(5, 2) };

const sacrifice = (
  state: GameStateV7,
  summoner: CoordV7,
  victim: CoordV7,
): CommandV7 => ({
  kind: "SACRIFICE",
  unitId: unitAtV7(state, summoner).id,
  victimUnitId: unitAtV7(state, victim).id,
});
const seize = (
  state: GameStateV7,
  summoner: CoordV7,
  victim: CoordV7,
): CommandV7 => ({
  kind: "SEIZE",
  unitId: unitAtV7(state, summoner).id,
  victimUnitId: unitAtV7(state, victim).id,
});

const favour = (state: GameStateV7, seat: number): number =>
  favourOfV7(state, seatIdV7(state, seat));

const ledger = (state: GameStateV7, seat: number) => {
  const entry = state.scoreLedger.find(
    (candidate) => candidate.playerId === seatIdV7(state, seat),
  );
  if (entry === undefined) throw new Error("no ledger entry");
  return entry;
};

const offering = (state: GameStateV7, seat = 0): CommandV7 => ({
  kind: "OFFERING",
  cityId: cityOfV7(state, seat).id,
});

describe("the Cult's Favour: identity", () => {
  // The identity is 7r73 now: the AI head start (`pulp_wars-w49.39`) took
  // it, so 7r72 is a prior identity.
  it("was 7r72 after 7r71, with both save keys obsolete now", () => {
    expect(RULESET_7_ID).toBe("pulp-wars-poc-7r73");
    expect(PRIOR_RULESET_7_IDS.slice(-2)).toEqual([
      "pulp-wars-poc-7r71",
      "pulp-wars-poc-7r72",
    ]);
    expect(PRIOR_RULESET_7_IDS).not.toContain(RULESET_7_ID);
    expect(SAVE_STORAGE_KEY_V7).toBe("pulpWars.save.v7r73.current");
    expect(OBSOLETE_SAVE_STORAGE_KEYS_V7.slice(-2)).toEqual([
      "pulpWars.save.v7r71.current",
      "pulpWars.save.v7r72.current",
    ]);
    expect(OBSOLETE_SAVE_STORAGE_KEYS_V7).not.toContain(SAVE_STORAGE_KEY_V7);
  });

  it("rejects a 7r71 setup, state, and save without migration", () => {
    const created = createPlayableGameV7(goblinSetupV7(["CULT", "ORIGINAL"]));
    if (!created.ok) throw new Error(created.error.code);
    const state = created.state;
    const setup = state.setup;
    const oldSetup = { ...setup, rulesetId: "pulp-wars-poc-7r71" };
    expect(parseMatchSetupV7(oldSetup)).toBeNull();
    // A 7r71 state has no `cult` block and names the old identity.
    const { cult: _cult, ...old } = state;
    void _cult;
    expect(
      parseGameStateV7({
        ...old,
        rulesetId: "pulp-wars-poc-7r71",
        setup: oldSetup,
      }),
    ).toBeNull();
    const save = createSaveEnvelopeV7(
      { state, replay: createReplayV7(setup) },
      "2026-10-10T12:00:00.000Z",
    );
    expect(parseSaveV7(JSON.stringify(save))).toMatchObject({ kind: "VALID" });
    expect(
      parseSaveV7(
        JSON.stringify({
          ...save,
          rulesetId: "pulp-wars-poc-7r71",
          setup: oldSetup,
          state: { ...save.state, rulesetId: "pulp-wars-poc-7r71" },
        }),
      ),
    ).toMatchObject({ kind: "INCOMPATIBLE" });
  });

  it("carries Favour and what a city gave up through a turn's commands and a save", () => {
    const state = withFavourV7(
      withFarmsV7(
        cultFieldV7([
          SUMMONER,
          { seat: 0, role: "FIGHTER", at: at(6, 4) },
          { seat: 1, role: "KNIGHT", at: at(5, 3), hp: 5 },
        ]),
        0,
        2,
      ),
      0,
      3,
    );
    const seized = playV7(state, seize(state, at(5, 2), at(5, 3))).state;
    const offered = playV7(seized, offering(seized)).state;
    expect(favour(offered, 0)).toBe(3 + 18 + 3);
    expect(cityOfferedPopulationV7(cityOfV7(offered, 0))).toBe(2);
    // Both survive the End Turn and the other seat's turn.
    const ended = applyOkV7(offered, seatIdV7(offered, 0), {
      kind: "END_TURN",
    }).state;
    const back = applyOkV7(ended, seatIdV7(ended, 1), { kind: "END_TURN" });
    expect(favour(back.state, 0)).toBe(24);
    expect(cityOfV7(back.state, 0)).toMatchObject({
      offeredPopulation: 2,
      population: 0,
      level: 2,
      cityActionAvailable: true,
    });
    expect(parseGameStateV7(JSON.parse(JSON.stringify(back.state)))).toEqual(
      back.state,
    );
    // A new Cult match saves with its empty Cult block.
    const fresh = createPlayableGameV7(goblinSetupV7(["CULT", "ORIGINAL"]));
    if (!fresh.ok) throw new Error(fresh.error.code);
    expect(fresh.state.cult).toEqual({ favour: [] });
    const save = createSaveEnvelopeV7(
      { state: fresh.state, replay: createReplayV7(fresh.state.setup) },
      "2026-10-10T12:00:00.000Z",
    );
    expect(parseSaveV7(JSON.stringify(save))).toMatchObject({ kind: "VALID" });
  });
});

describe("the Cult's Favour: the registry (sections 4, 5, 8.2, and 11)", () => {
  it("gives the Summoner Sacrifice and Seize, and the Chosen Martyr", () => {
    expect(effectiveRoleRuleV7("CAPTAIN", "CULT").abilities).toEqual([
      "ATTACK",
      "CAPTURE",
      "SACRIFICE",
      "SEIZE",
    ]);
    expect(effectiveRoleRuleV7("SWORDSMAN", "CULT").abilities).toEqual([
      "ATTACK",
      "CAPTURE",
      "MARTYR",
    ]);
    // No other role of any faction has them.
    for (const faction of FACTION_IDS_V7)
      for (const role of UNIT_ROLE_IDS_V7) {
        const abilities = effectiveRoleRuleV7(role, faction).abilities;
        const cult = (ability: "SACRIFICE" | "SEIZE" | "MARTYR") =>
          abilities.includes(ability);
        expect(cult("SACRIFICE") || cult("SEIZE"), `${faction} ${role}`).toBe(
          faction === "CULT" && role === "CAPTAIN",
        );
        expect(cult("MARTYR"), `${faction} ${role}`).toBe(
          faction === "CULT" && role === "SWORDSMAN",
        );
      }
  });

  it("names the seven robed cultists: not the Familiar, the Thing, or a ship", () => {
    const robed = UNIT_ROLE_IDS_V7.filter(
      (role) => roleMechanicsV7(role, "CULT").robed,
    );
    expect(robed).toEqual([
      "FIGHTER",
      "MARKSMAN",
      "GUARD",
      "CAPTAIN",
      "CATAPULT",
      "KNIGHT",
      "SWORDSMAN",
    ]);
    for (const faction of FACTION_IDS_V7)
      if (faction !== "CULT")
        for (const role of UNIT_ROLE_IDS_V7) {
          expect(roleMechanicsV7(role, faction).robed, faction).toBe(false);
          expect(roleMechanicsV7(role, faction).martyrFavour).toBe(0);
        }
    // A robed cultist is one in land form.
    const state = cultFieldV7(
      [
        { seat: 0, role: "FIGHTER", at: at(5, 2) },
        { seat: 0, role: "RAIDER", at: at(6, 2) },
        { seat: 0, role: "FIGHTER", at: at(4, 2), form: "EMBARKED" },
      ],
      { water: [at(4, 2)] },
    );
    expect(isRobedCultistV7(state, unitAtV7(state, at(5, 2)))).toBe(true);
    expect(isRobedCultistV7(state, unitAtV7(state, at(6, 2)))).toBe(false);
    expect(isRobedCultistV7(state, unitAtV7(state, at(4, 2)))).toBe(false);
  });

  it("pays 6 for a Martyr, the Chosen's value", () => {
    expect(MARTYR_FAVOUR_V7).toBe(6);
    expect(roleMechanicsV7("SWORDSMAN", "CULT").martyrFavour).toBe(6);
    expect(effectiveRoleRuleV7("SWORDSMAN", "CULT").cost).toBe(6);
    for (const role of UNIT_ROLE_IDS_V7)
      if (role !== "SWORDSMAN")
        expect(roleMechanicsV7(role, "CULT").martyrFavour, role).toBe(0);
  });

  it("holds the spec's numbers", () => {
    expect([
      SEIZE_BROKEN_HP_V7,
      SEIZE_FAVOUR_MULTIPLIER_V7,
      OFFERING_POPULATION_V7,
      OFFERING_FAVOUR_V7,
      OFFERING_MINIMUM_LEVEL_V7,
    ]).toEqual([5, 2, 2, 3, 2]);
    expect(FAVOUR_SOURCES_V7).toEqual([
      "SACRIFICE",
      "SEIZE",
      "OFFERING",
      "MARTYR",
    ]);
  });

  it("unlocks the Offering with Harvest Rites and shows the Summoner's support at Leadership", () => {
    const kinds = (tech: TechnologyIdV7): readonly string[] =>
      (
        CULT_BASELINE_V1_TREE.nodes.find((node) => node.id === tech)?.unlocks ??
        []
      ).map((unlock) => unlock.kind);
    expect(kinds("FARMING")).toContain("OFFERING");
    expect(kinds("ADMINISTRATION")).toContain("SUMMONER_SUPPORT");
    expect(technologyCapabilitiesV7(["GATHERING"], "CULT").offering).toBe(
      false,
    );
    expect(
      technologyCapabilitiesV7(["GATHERING", "FARMING"], "CULT").offering,
    ).toBe(true);
    // The capability exists in the Cult's tree only.
    for (const faction of FACTION_IDS_V7)
      expect(
        technologyCapabilitiesV7([...TECHNOLOGY_IDS_V7], faction).offering,
        faction,
      ).toBe(faction === "CULT");
    expect(FACTION_IDS_V7.filter(factionHasFavourV7)).toEqual(["CULT"]);
  });

  it("takes the Favour abilities from a mind-controlled unit (they need a Cult seat)", () => {
    expect(MIND_CONTROLLED_LOST_ABILITIES_V7).toEqual(
      expect.arrayContaining(["SACRIFICE", "SEIZE", "MARTYR"]),
    );
  });

  it("puts the commands and events in the frozen orders", () => {
    const order = COMMAND_KIND_ORDER_V7 as readonly string[];
    expect(
      order.slice(order.indexOf("STAMPEDE"), order.indexOf("CAPTURE") + 1),
    ).toEqual(["STAMPEDE", "SACRIFICE", "SEIZE", "CAPTURE"]);
    expect(order[order.indexOf("LAY_EGG") + 1]).toBe("OFFERING");
    expect(order.at(-1)).toBe("END_TURN");
    const events = DOMAIN_EVENT_KIND_ORDER_V7 as readonly string[];
    expect(
      events.slice(
        events.indexOf("UNIT_DISBANDED"),
        events.indexOf("SPOILS_AWARDED") + 1,
      ),
    ).toEqual([
      "UNIT_DISBANDED",
      "UNIT_SACRIFICED",
      "UNIT_SEIZED",
      "OFFERING_MADE",
      "FAVOUR_GAINED",
      "SPOILS_AWARDED",
    ]);
  });

  it("parses the three commands and nothing near them", () => {
    const unit = 12;
    const victim = 13;
    for (const kind of ["SACRIFICE", "SEIZE"] as const) {
      expect(
        parseCommandV7({ kind, unitId: unit, victimUnitId: victim }),
      ).toEqual({
        ok: true,
        value: { kind, unitId: unit, victimUnitId: victim },
      });
      expect(parseCommandV7({ kind, unitId: unit }).ok).toBe(false);
      expect(
        parseCommandV7({ kind, unitId: unit, targetUnitId: victim }).ok,
      ).toBe(false);
      // A unit never offers itself.
      expect(
        parseCommandV7({ kind, unitId: unit, victimUnitId: unit }).ok,
      ).toBe(false);
      expect(
        parseCommandV7({
          kind,
          unitId: unit,
          victimUnitId: victim,
          at: at(1, 1),
        }).ok,
      ).toBe(false);
    }
    expect(parseCommandV7({ kind: "OFFERING", cityId: 3 })).toEqual({
      ok: true,
      value: { kind: "OFFERING", cityId: 3 },
    });
    expect(parseCommandV7({ kind: "OFFERING", cityId: 3, unitId: 1 }).ok).toBe(
      false,
    );
    expect(parseCommandV7({ kind: "OFFERING" }).ok).toBe(false);
  });

  it("gives the Summoner and the Chosen their glossary lines", () => {
    const names = (role: UnitRoleIdV7) =>
      roleGlossaryV7(role, "CULT").map((entry) => entry.name);
    expect(names("CAPTAIN")).toEqual(
      expect.arrayContaining(["Sacrifice", "Seize"]),
    );
    expect(names("SWORDSMAN")).toContain("Martyr");
  });
});

describe("the Cult's Favour: the pool (section 3)", () => {
  it("starts at 0 and is public for every Cult seat", () => {
    const state = cultFieldV7([SUMMONER]);
    expect(state.cult).toEqual({ favour: [] });
    expect(favour(state, 0)).toBe(0);
    for (const seat of [0, 1]) {
      const view = viewForV7(state, seatIdV7(state, seat));
      expect(view.cult.favour).toEqual([
        { playerId: seatIdV7(state, 0), favour: 0 },
      ]);
      expect(viewFavourV7(view, seatIdV7(state, 0))).toBe(0);
      expect(viewFavourV7(view, seatIdV7(state, 1))).toBe(0);
    }
    const rich = withFavourV7(state, 0, 17);
    expect(favour(rich, 0)).toBe(17);
    expect(favour(rich, 1)).toBe(0);
    for (const seat of [0, 1])
      expect(viewForV7(rich, seatIdV7(rich, seat)).cult.favour).toEqual([
        { playerId: seatIdV7(rich, 0), favour: 17 },
      ]);
    // Favour is not a Score factor.
    expect(scoreV7(rich, seatIdV7(rich, 0))).toEqual(
      scoreV7(state, seatIdV7(state, 0)),
    );
  });

  it("is empty in a match without a Cult seat", () => {
    const state = fieldV7([{ seat: 0, role: "FIGHTER", at: at(5, 2) }], {
      factions: ["ORIGINAL", "GOBLIN"],
    });
    expect(state.cult).toEqual({ favour: [] });
    expect(viewForV7(state, seatIdV7(state, 0)).cult).toEqual({ favour: [] });
  });

  it("reads a view captured before the Cultists as no Favour", () => {
    const state = cultFieldV7([SUMMONER]);
    const { cult: _cult, ...before } = viewForV7(state, seatIdV7(state, 0));
    void _cult;
    expect(
      favourOfV7(
        before as Parameters<typeof favourOfV7>[0],
        seatIdV7(state, 0),
      ),
    ).toBe(0);
  });

  it("stores only what a state may hold", () => {
    const state = withFavourV7(cultFieldV7([SUMMONER]), 0, 4);
    expect(parseGameStateV7(JSON.parse(JSON.stringify(state)))).toEqual(state);
    const cult = seatIdV7(state, 0);
    const human = seatIdV7(state, 1);
    const withCult = (value: unknown): unknown => ({ ...state, cult: value });
    const { cult: _cult, ...without } = state;
    void _cult;
    for (const [label, input] of [
      ["no key", without],
      ["zero", withCult({ favour: [{ playerId: cult, favour: 0 }] })],
      ["negative", withCult({ favour: [{ playerId: cult, favour: -1 }] })],
      ["a fraction", withCult({ favour: [{ playerId: cult, favour: 1.5 }] })],
      [
        "another faction",
        withCult({ favour: [{ playerId: human, favour: 2 }] }),
      ],
      ["an unknown seat", withCult({ favour: [{ playerId: 99, favour: 2 }] })],
      [
        "twice",
        withCult({
          favour: [
            { playerId: cult, favour: 2 },
            { playerId: cult, favour: 3 },
          ],
        }),
      ],
      ["an extra key", withCult({ favour: [], strands: [] })],
      ["no list", withCult({})],
    ] as const)
      expect(parseGameStateV7(input), label).toBeNull();
    // An eliminated seat has none.
    expect(
      parseGameStateV7({
        ...state,
        players: state.players.map((player) =>
          player.id === cult ? { ...player, status: "ELIMINATED" } : player,
        ),
      }),
    ).toBeNull();
  });

  it("is gone when the seat is eliminated", () => {
    // A Human Fighter stands on the Cult's only city, ready to capture it.
    const state = withFavourV7(
      cultFieldV7(
        [
          { seat: 1, role: "FIGHTER", at: at(8, 8), captureEligible: true },
          { seat: 0, role: "FIGHTER", at: at(5, 2) },
        ],
        { activeSeat: 1 },
      ),
      0,
      9,
    );
    const result = applyOkV7(state, seatIdV7(state, 1), {
      kind: "CAPTURE",
      unitId: unitAtV7(state, at(8, 8)).id,
    });
    expect(kindsV7(result.events)).toContain("PLAYER_ELIMINATED");
    expect(result.state.cult).toEqual({ favour: [] });
    expect(
      viewForV7(result.state, seatIdV7(result.state, 1)).cult.favour,
    ).toEqual([]);
  });
});

describe("the Cult's Sacrifice (section 5.1)", () => {
  const field = (
    victim: UnitRoleIdV7,
    extra: readonly GoblinPieceV7[] = [],
    options: FieldOptionsV7 = {},
  ) =>
    cultFieldV7(
      [SUMMONER, { seat: 0, role: victim, at: at(5, 3) }, ...extra],
      options,
    );

  it("removes the own unit beside the Summoner and pays its value", () => {
    const state = field("FIGHTER", [
      { seat: 1, role: "FIGHTER", at: at(1, 1) },
    ]);
    const command = sacrifice(state, at(5, 2), at(5, 3));
    const summoner = unitAtV7(state, at(5, 2));
    const victim = unitAtV7(state, at(5, 3));
    const actor = seatIdV7(state, 0);
    const view = viewForV7(state, actor);
    const preview = previewSacrificeV7(view, summoner.id, victim.id);
    expect(preview).toEqual({
      unitId: summoner.id,
      victimUnitId: victim.id,
      victimOwnerId: actor,
      role: "FIGHTER",
      at: at(5, 3),
      favour: 2,
      favourAfter: 2,
    });
    const result = playV7(state, command);
    expect(result.events).toEqual([
      {
        kind: "UNIT_SACRIFICED",
        playerId: actor,
        unitId: summoner.id,
        victimUnitId: victim.id,
        role: "FIGHTER",
        at: at(5, 3),
        favour: 2,
      },
      { kind: "UNIT_DIED", unitId: victim.id, cause: "SACRIFICED" },
      {
        kind: "FAVOUR_GAINED",
        playerId: actor,
        source: "SACRIFICE",
        amount: 2,
        favour: 2,
      },
    ]);
    expect(result.state.units.map((unit) => unit.id)).not.toContain(victim.id);
    expect(favour(result.state, 0)).toBe(2);
    expect(result.state.cult.favour).toEqual([{ playerId: actor, favour: 2 }]);
    // The Summoner used its primary action and has no kill for it.
    const after = unitAtV7(result.state, at(5, 2));
    expect(after.kills).toBe(0);
    expect(after.activation).toMatchObject({
      specialActed: true,
      handled: true,
      attacked: false,
    });
    expect(
      offeredV7(result.state, "SACRIFICE", "SEIZE", "ATTACK").filter(
        (offered) => "unitId" in offered && offered.unitId === summoner.id,
      ),
    ).toEqual([]);
    // Nothing is left behind.
    expect(result.state.graves).toEqual([]);
    expect(result.state.crumbs).toEqual([]);
  });

  it("is not a Loss in the Score, costs the Army value, and ends the flawless game", () => {
    const state = field("FIGHTER");
    const before = scoreV7(state, seatIdV7(state, 0));
    const result = playV7(state, sacrifice(state, at(5, 2), at(5, 3)));
    const after = scoreV7(result.state, seatIdV7(state, 0));
    expect(after.losses.count).toBe(0);
    expect(after.damage.count).toBe(0);
    expect(after.kills.count).toBe(0);
    expect(before.army.count - after.army.count).toBe(2);
    expect(ledger(state, 0).flawless).toBe(true);
    expect(ledger(result.state, 0)).toMatchObject({
      flawless: false,
      lossValue: 0,
      hpLost: 0,
      killValue: 0,
    });
    // The other seat is untouched.
    expect(ledger(result.state, 1)).toEqual(ledger(state, 1));
  });

  it("pays the value of every role, the Thing in the Cellar's 12 included", () => {
    const values: Readonly<Partial<Record<UnitRoleIdV7, number>>> = {
      FIGHTER: 2,
      GUARD: 3,
      RAIDER: 3,
      MARKSMAN: 4,
      CAPTAIN: 5,
      SWORDSMAN: 6,
      CATAPULT: 8,
      KNIGHT: 8,
      JUGGERNAUT: 12,
    };
    for (const [role, value] of Object.entries(values) as [
      UnitRoleIdV7,
      number,
    ][]) {
      const state = field(role);
      expect(unitFavourValueV7(state, unitAtV7(state, at(5, 3))), role).toBe(
        value,
      );
      const result = playV7(state, sacrifice(state, at(5, 2), at(5, 3)));
      // A Sacrificed Chosen pays its value and no Martyr on top.
      expect(favour(result.state, 0), role).toBe(value);
      expect(
        result.events.filter((event) => event.kind === "FAVOUR_GAINED"),
        role,
      ).toHaveLength(1);
    }
  });

  it("adds to the Favour the seat has, with no maximum", () => {
    const state = withFavourV7(field("JUGGERNAUT"), 0, 1_000_000);
    const result = playV7(state, sacrifice(state, at(5, 2), at(5, 3)));
    expect(favour(result.state, 0)).toBe(1_000_012);
    expect(result.events.at(-1)).toEqual({
      kind: "FAVOUR_GAINED",
      playerId: seatIdV7(state, 0),
      source: "SACRIFICE",
      amount: 12,
      favour: 1_000_012,
    });
  });

  it("may follow the Summoner's Move, and a hurt or exhausted victim is as good", () => {
    const state = cultFieldV7([
      { ...SUMMONER, activation: movedV7(1) },
      {
        seat: 0,
        role: "FIGHTER",
        at: at(6, 3),
        hp: 1,
        activation: { attacked: true, attacksUsed: 1, handled: true },
      },
    ]);
    const result = playV7(state, sacrifice(state, at(5, 2), at(6, 3)));
    expect(favour(result.state, 0)).toBe(2);
  });

  it("offers every own land unit around the Summoner, and only those", () => {
    const state = cultFieldV7([
      SUMMONER,
      { seat: 0, role: "FIGHTER", at: at(4, 1) },
      { seat: 0, role: "RAIDER", at: at(6, 3) },
      { seat: 0, role: "JUGGERNAUT", at: at(5, 3) },
      // Two tiles away.
      { seat: 0, role: "FIGHTER", at: at(7, 2) },
      // An enemy beside it.
      { seat: 1, role: "FIGHTER", at: at(4, 2) },
    ]);
    const summoner = unitAtV7(state, at(5, 2));
    expect(offeredV7(state, "SACRIFICE")).toEqual(
      [at(4, 1), at(6, 3), at(5, 3)]
        .map((where) => sacrifice(state, at(5, 2), where))
        .sort(compareCommandsV7),
    );
    // The query offers exactly what the reducer accepts.
    const actor = seatIdV7(state, 0);
    for (const victim of state.units) {
      const command: CommandV7 = {
        kind: "SACRIFICE",
        unitId: summoner.id,
        victimUnitId: victim.id,
      };
      if (victim.id === summoner.id) continue;
      expect(applyCommandV7(state, actor, command).accepted, victim.role).toBe(
        offeredV7(state, "SACRIFICE").some(
          (offered) =>
            offered.kind === "SACRIFICE" && offered.victimUnitId === victim.id,
        ),
      );
    }
    expect(rejectedV7(state, sacrifice(state, at(5, 2), at(7, 2)))).toEqual({
      code: "SACRIFICE_NOT_LEGAL",
      params: { reason: "VICTIM" },
    });
    expect(rejectedV7(state, sacrifice(state, at(5, 2), at(4, 2)))).toEqual({
      code: "SACRIFICE_NOT_LEGAL",
      params: { reason: "VICTIM" },
    });
    expect(
      rejectedV7(state, {
        kind: "SACRIFICE",
        unitId: summoner.id,
        victimUnitId: 9_999 as never,
      }),
    ).toEqual({ code: "SACRIFICE_NOT_LEGAL", params: { reason: "VICTIM" } });
  });

  it("is the Summoner's alone, once a turn, in land form", () => {
    // An Initiate cannot Sacrifice.
    const initiate = cultFieldV7([
      { seat: 0, role: "FIGHTER", at: at(5, 2) },
      { seat: 0, role: "FIGHTER", at: at(5, 3) },
    ]);
    expect(offeredV7(initiate, "SACRIFICE")).toEqual([]);
    expect(
      rejectedV7(initiate, sacrifice(initiate, at(5, 2), at(5, 3))),
    ).toEqual({ code: "UNIT_ROLE_INVALID", params: { role: "FIGHTER" } });
    // A Summoner that attacked has no action left.
    const spent = cultFieldV7([
      { ...SUMMONER, activation: { attacked: true, attacksUsed: 1 } },
      { seat: 0, role: "FIGHTER", at: at(5, 3) },
    ]);
    expect(
      rejectedV7(spent, sacrifice(spent, at(5, 2), at(5, 3))),
    ).toMatchObject({ code: "UNIT_ALREADY_ACTED" });
    // One Sacrifice a turn for each Summoner.
    const two = cultFieldV7([
      SUMMONER,
      { seat: 0, role: "FIGHTER", at: at(5, 3) },
      { seat: 0, role: "FIGHTER", at: at(4, 3) },
    ]);
    const first = playV7(two, sacrifice(two, at(5, 2), at(5, 3)));
    expect(
      rejectedV7(first.state, sacrifice(first.state, at(5, 2), at(4, 3))),
    ).toMatchObject({ code: "UNIT_ALREADY_ACTED" });
    // An embarked Summoner, and an embarked victim.
    const afloat = cultFieldV7(
      [
        { ...SUMMONER, form: "EMBARKED" },
        { seat: 0, role: "FIGHTER", at: at(5, 3) },
        { seat: 0, role: "CAPTAIN", at: at(6, 4) },
        { seat: 0, role: "FIGHTER", at: at(7, 4), form: "EMBARKED" },
      ],
      { water: [at(5, 2), at(7, 4)] },
    );
    expect(rejectedV7(afloat, sacrifice(afloat, at(5, 2), at(5, 3)))).toEqual({
      code: "SACRIFICE_NOT_LEGAL",
      params: { reason: "EMBARKED" },
    });
    expect(rejectedV7(afloat, sacrifice(afloat, at(6, 4), at(7, 4)))).toEqual({
      code: "SACRIFICE_NOT_LEGAL",
      params: { reason: "VICTIM" },
    });
    // Another Summoner is a victim like any unit.
    expect(offeredV7(afloat, "SACRIFICE")).toEqual([
      sacrifice(afloat, at(6, 4), at(5, 3)),
    ]);
  });

  it("may take the last unit of a city, and frees its slot", () => {
    const state = field("FIGHTER");
    const city = cityOfV7(state, 0);
    const homed = (item: GameStateV7) =>
      item.units.filter((unit) => unit.homeCityId === city.id).length;
    expect(homed(state)).toBe(2);
    const result = playV7(state, sacrifice(state, at(5, 2), at(5, 3)));
    expect(homed(result.state)).toBe(1);
  });

  it("never dodges a bite or the Plague", () => {
    const base = cultFieldV7(
      [
        SUMMONER,
        { seat: 0, role: "FIGHTER", at: at(5, 3) },
        { seat: 0, role: "FIGHTER", at: at(4, 3) },
        { seat: 1, role: "GUARD", at: at(1, 1) },
        { seat: 1, role: "CATAPULT", at: at(1, 2) },
      ],
      { factions: ["CULT", "UNDEAD"] },
    );
    const bitten = unitAtV7(base, at(5, 3));
    const plagued = unitAtV7(base, at(4, 3));
    const zombie = unitAtV7(base, at(1, 1));
    const lich = unitAtV7(base, at(1, 2));
    const state = checkedV7({
      ...base,
      bitten: [
        {
          unitId: bitten.id,
          biterPlayerId: zombie.ownerId,
          biterUnitId: zombie.id,
        },
      ],
      plagued: [
        { unitId: plagued.id, sourceUnitId: lich.id, turnsRemaining: 3 },
      ],
    });
    expect(offeredV7(state, "SACRIFICE")).toEqual([]);
    expect(rejectedV7(state, sacrifice(state, at(5, 2), at(5, 3)))).toEqual({
      code: "SACRIFICE_NOT_LEGAL",
      params: { reason: "BITTEN" },
    });
    expect(rejectedV7(state, sacrifice(state, at(5, 2), at(4, 3)))).toEqual({
      code: "SACRIFICE_NOT_LEGAL",
      params: { reason: "PLAGUED" },
    });
    // A healthy unit beside an Undead army leaves no Grave when Sacrificed.
    const clean = checkedV7({ ...state, bitten: [], plagued: [] });
    const result = playV7(clean, sacrifice(clean, at(5, 2), at(5, 3)));
    expect(result.state.graves).toEqual([]);
    expect(kindsV7(result.events)).not.toContain("GRAVE_CREATED");
  });

  it("needs a Cult seat: a mind-controlled Summoner offers nothing", () => {
    const state = martianFieldV7(
      [
        { seat: 0, role: "CAPTAIN", at: at(4, 2) },
        { seat: 1, role: "CAPTAIN", at: at(5, 2), controlledBy: at(4, 2) },
        // A second controlled cultist beside it (an own unit of the
        // Martian seat), and a Martian Grunt.
        { seat: 0, role: "FIGHTER", at: at(5, 3) },
        // A broken Cult Initiate, with the Grunt to hold it.
        { seat: 1, role: "FIGHTER", at: at(6, 2), hp: 3 },
      ],
      { factions: ["MARTIAN", "CULT"] },
    );
    const summoner = unitAtV7(state, at(5, 2));
    expect(summoner.ownerId).toBe(seatIdV7(state, 0));
    expect(unitRoleRuleV7(state, summoner).abilities).toEqual([
      "ATTACK",
      "CAPTURE",
    ]);
    expect(offeredV7(state, "SACRIFICE", "SEIZE")).toEqual([]);
    expect(rejectedV7(state, sacrifice(state, at(5, 2), at(5, 3)))).toEqual({
      code: "UNIT_ROLE_INVALID",
      params: { role: "CAPTAIN" },
    });
    expect(rejectedV7(state, seize(state, at(5, 2), at(6, 2)))).toEqual({
      code: "UNIT_ROLE_INVALID",
      params: { role: "CAPTAIN" },
    });
    expect(state.cult.favour).toEqual([]);
  });

  it("is told to the seats that saw the victim, and the Favour to everyone", () => {
    const state = field("FIGHTER");
    const command = sacrifice(state, at(5, 2), at(5, 3));
    const result = playV7(state, command);
    const human = seatIdV7(state, 1);
    const seen = projectEventsV7(state, result.state, human, result.events);
    expect(kindsV7(seen.events as readonly DomainEventV7[])).toEqual([
      "UNIT_SACRIFICED",
      "UNIT_DIED",
      "FAVOUR_GAINED",
    ]);
    // A seat that has not explored the victim's tile learns only the
    // Favour (it is public), with no unit and no tile.
    const hidden = unexploreV7(state, 1, [at(5, 2), at(5, 3)]);
    const fogged = playV7(hidden, command);
    const unseen = projectEventsV7(hidden, fogged.state, human, fogged.events);
    expect(unseen.events).toEqual([
      {
        kind: "FAVOUR_GAINED",
        playerId: seatIdV7(state, 0),
        source: "SACRIFICE",
        amount: 2,
        favour: 2,
      },
    ]);
    // The actor sees all of it.
    expect(
      kindsV7(
        projectEventsV7(hidden, fogged.state, seatIdV7(state, 0), fogged.events)
          .events as readonly DomainEventV7[],
      ),
    ).toEqual(["UNIT_SACRIFICED", "UNIT_DIED", "FAVOUR_GAINED"]);
  });
});

describe("the Cult's Seize (section 5.2)", () => {
  /** A Summoner, a holder Initiate, and a seat-1 victim between them. */
  const field = (
    victim: UnitRoleIdV7,
    hp: number,
    enemy: FactionIdV7 = "ORIGINAL",
    extra: readonly GoblinPieceV7[] = [],
  ) =>
    cultFieldV7(
      [
        SUMMONER,
        { seat: 0, role: "FIGHTER", at: at(6, 4) },
        { seat: 1, role: victim, at: at(5, 3), hp },
        ...extra,
      ],
      { factions: ["CULT", enemy] },
    );

  it("kills a broken enemy held by a second cultist, for twice its value", () => {
    const state = field("FIGHTER", 5);
    const summoner = unitAtV7(state, at(5, 2));
    const holder = unitAtV7(state, at(6, 4));
    const victim = unitAtV7(state, at(5, 3));
    const actor = seatIdV7(state, 0);
    const command = seize(state, at(5, 2), at(5, 3));
    expect(offeredV7(state, "SEIZE")).toEqual([command]);
    expect(
      previewSeizeV7(viewForV7(state, actor), summoner.id, victim.id),
    ).toEqual({
      unitId: summoner.id,
      victimUnitId: victim.id,
      victimOwnerId: victim.ownerId,
      role: "FIGHTER",
      at: at(5, 3),
      favour: 4,
      favourAfter: 4,
      holderUnitId: holder.id,
    });
    const result = playV7(state, command);
    expect(result.events).toEqual([
      {
        kind: "UNIT_SEIZED",
        playerId: actor,
        unitId: summoner.id,
        holderUnitId: holder.id,
        victimUnitId: victim.id,
        victimOwnerId: victim.ownerId,
        role: "FIGHTER",
        at: at(5, 3),
        favour: 4,
      },
      { kind: "UNIT_DIED", unitId: victim.id, cause: "SACRIFICED" },
      {
        kind: "FAVOUR_GAINED",
        playerId: actor,
        source: "SEIZE",
        amount: 4,
        favour: 4,
      },
    ]);
    expect(result.state.units.map((unit) => unit.id)).not.toContain(victim.id);
    expect(favour(result.state, 0)).toBe(4);
    // A kill for the Summoner, which spent its action; the holder spent
    // nothing.
    expect(unitAtV7(result.state, at(5, 2))).toMatchObject({
      kills: 1,
      activation: { specialActed: true, handled: true },
    });
    expect(unitAtV7(result.state, at(6, 4)).activation).toEqual(
      holder.activation,
    );
    expect(
      offeredV7(result.state, "ATTACK", "MOVE").some(
        (offered) => "unitId" in offered && offered.unitId === holder.id,
      ),
    ).toBe(true);
  });

  it("is a kill in the Score: Kills for the Cult, a Loss for the victim's seat", () => {
    const state = field("KNIGHT", 5);
    const result = playV7(state, seize(state, at(5, 2), at(5, 3)));
    expect(ledger(result.state, 0)).toMatchObject({
      killValue: 9,
      lossValue: 0,
      hpLost: 0,
      flawless: true,
    });
    expect(ledger(result.state, 1)).toMatchObject({
      killValue: 0,
      lossValue: 9,
      hpLost: 5,
      flawless: false,
    });
    expect(scoreV7(result.state, seatIdV7(state, 0)).kills.count).toBe(9);
  });

  it("pays twice the value: a Fighter 4, a Guard 6, a Raider 8, a Knight 18, a Champion 12", () => {
    const expected: Readonly<Partial<Record<UnitRoleIdV7, number>>> = {
      FIGHTER: 4,
      GUARD: 6,
      RAIDER: 8,
      MARKSMAN: 8,
      CAPTAIN: 10,
      SWORDSMAN: 12,
      CATAPULT: 16,
      KNIGHT: 18,
    };
    for (const [role, value] of Object.entries(expected) as [
      UnitRoleIdV7,
      number,
    ][]) {
      const state = field(role, 5);
      const result = playV7(state, seize(state, at(5, 2), at(5, 3)));
      expect(favour(result.state, 0), role).toBe(value);
    }
  });

  it("needs a broken victim: 5 HP or less, whatever its Shield", () => {
    for (const hp of [1, 5]) {
      const state = field("KNIGHT", hp);
      expect(offeredV7(state, "SEIZE"), String(hp)).toHaveLength(1);
    }
    const healthy = field("KNIGHT", 6);
    expect(offeredV7(healthy, "SEIZE")).toEqual([]);
    expect(rejectedV7(healthy, seize(healthy, at(5, 2), at(5, 3)))).toEqual({
      code: "SEIZE_NOT_LEGAL",
      params: { reason: "HEALTHY" },
    });
    // A Martian Grunt at 5 HP behind a full Shield is broken.
    const shielded = martianFieldV7(
      [
        SUMMONER,
        { seat: 0, role: "FIGHTER", at: at(6, 4) },
        { seat: 1, role: "FIGHTER", at: at(5, 3), hp: 5 },
      ],
      { factions: ["CULT", "MARTIAN"] },
    );
    expect(shielded.shields.length).toBeGreaterThan(0);
    const result = playV7(shielded, seize(shielded, at(5, 2), at(5, 3)));
    expect(favour(result.state, 0)).toBe(
      2 * (effectiveRoleRuleV7("FIGHTER", "MARTIAN").cost ?? 0),
    );
    expect(result.state.shields).toEqual([]);
  });

  it("needs a holder: another robed cultist of the seat next to the victim", () => {
    const victim: GoblinPieceV7 = {
      seat: 1,
      role: "FIGHTER",
      at: at(5, 3),
      hp: 4,
    };
    const tryWith = (holders: readonly GoblinPieceV7[]) => {
      const state = cultFieldV7([SUMMONER, victim, ...holders]);
      return {
        state,
        offered: offeredV7(state, "SEIZE").length,
      };
    };
    // Nobody, a Familiar, the Thing, an enemy, a cultist two tiles from the
    // victim, and an embarked cultist hold nothing.
    for (const [label, holders] of [
      ["nobody", []],
      ["a Familiar", [{ seat: 0, role: "RAIDER", at: at(6, 4) }]],
      ["the Thing", [{ seat: 0, role: "JUGGERNAUT", at: at(6, 4) }]],
      ["an enemy", [{ seat: 1, role: "FIGHTER", at: at(6, 4) }]],
      ["too far", [{ seat: 0, role: "FIGHTER", at: at(7, 3) }]],
    ] as const) {
      const { state, offered } = tryWith(holders);
      expect(offered, label).toBe(0);
      expect(
        rejectedV7(state, seize(state, at(5, 2), at(5, 3))),
        label,
      ).toEqual({ code: "SEIZE_NOT_LEGAL", params: { reason: "NO_HOLDER" } });
    }
    // Every robed cultist holds, an exhausted or hurt one too.
    for (const role of [
      "FIGHTER",
      "GUARD",
      "MARKSMAN",
      "CAPTAIN",
      "CATAPULT",
      "KNIGHT",
      "SWORDSMAN",
    ] as const) {
      const { state } = tryWith([
        {
          seat: 0,
          role,
          at: at(6, 4),
          hp: 1,
          activation: { attacked: true, attacksUsed: 1, handled: true },
        },
      ]);
      expect(
        offeredV7(state, "SEIZE").filter(
          (offered) =>
            "unitId" in offered &&
            offered.unitId === unitAtV7(state, at(5, 2)).id,
        ),
        role,
      ).toHaveLength(1);
    }
    // With several holders the event names the one with the lowest ID.
    const state = cultFieldV7([
      SUMMONER,
      victim,
      { seat: 0, role: "FIGHTER", at: at(6, 4) },
      { seat: 0, role: "GUARD", at: at(4, 4) },
    ]);
    const result = playV7(state, seize(state, at(5, 2), at(5, 3)));
    expect(result.events[0]).toMatchObject({
      kind: "UNIT_SEIZED",
      holderUnitId: unitAtV7(state, at(6, 4)).id,
    });
  });

  it("takes only living one-slot enemies that are no giant", () => {
    const immune = (state: GameStateV7) => {
      expect(offeredV7(state, "SEIZE")).toEqual([]);
      return rejectedV7(state, seize(state, at(5, 2), at(5, 3)));
    };
    // A reward giant.
    expect(immune(field("JUGGERNAUT", 5))).toEqual({
      code: "SEIZE_NOT_LEGAL",
      params: { reason: "IMMUNE" },
    });
    // An Undead unit is not living.
    expect(immune(field("FIGHTER", 5, "UNDEAD"))).toEqual({
      code: "SEIZE_NOT_LEGAL",
      params: { reason: "IMMUNE" },
    });
    // A construct (the Dwarf Clockwork Gunner).
    expect(roleMechanicsV7("MARKSMAN", "DWARF").construct).toBe(true);
    expect(immune(field("MARKSMAN", 5, "DWARF"))).toEqual({
      code: "SEIZE_NOT_LEGAL",
      params: { reason: "IMMUNE" },
    });
    // A two-slot dinosaur.
    const big = UNIT_ROLE_IDS_V7.find(
      (role) =>
        role !== "JUGGERNAUT" &&
        roleMechanicsV7(role, "DINOSAUR").capacitySlots === 2,
    );
    if (big === undefined) throw new Error("no two-slot dinosaur");
    expect(immune(field(big, 5, "DINOSAUR"))).toEqual({
      code: "SEIZE_NOT_LEGAL",
      params: { reason: "IMMUNE" },
    });
    // A one-slot dinosaur is a victim.
    const small = field("RAIDER", 5, "DINOSAUR");
    expect(offeredV7(small, "SEIZE")).toHaveLength(1);
    // An own unit is a Sacrifice, never a Seizure; a far or embarked enemy
    // is no victim.
    const own = cultFieldV7([
      SUMMONER,
      { seat: 0, role: "FIGHTER", at: at(5, 3), hp: 2 },
      { seat: 0, role: "FIGHTER", at: at(6, 4) },
      { seat: 1, role: "FIGHTER", at: at(7, 2), hp: 2 },
    ]);
    expect(offeredV7(own, "SEIZE")).toEqual([]);
    expect(rejectedV7(own, seize(own, at(5, 2), at(5, 3)))).toEqual({
      code: "SEIZE_NOT_LEGAL",
      params: { reason: "VICTIM" },
    });
    expect(rejectedV7(own, seize(own, at(5, 2), at(7, 2)))).toEqual({
      code: "SEIZE_NOT_LEGAL",
      params: { reason: "VICTIM" },
    });
  });

  it("offers exactly the Seizures the reducer accepts", () => {
    const state = cultFieldV7([
      SUMMONER,
      { seat: 0, role: "FIGHTER", at: at(5, 3) },
      { seat: 1, role: "FIGHTER", at: at(4, 3), hp: 5 },
      { seat: 1, role: "KNIGHT", at: at(6, 3), hp: 3 },
      { seat: 1, role: "GUARD", at: at(4, 1), hp: 2 },
      { seat: 1, role: "MARKSMAN", at: at(6, 1), hp: 9 },
      { seat: 1, role: "JUGGERNAUT", at: at(5, 1), hp: 4 },
    ]);
    const actor = seatIdV7(state, 0);
    const summoner = unitAtV7(state, at(5, 2));
    const offered = offeredV7(state, "SEIZE");
    // The Fighter and the Knight stand next to the holder; the Guard is
    // broken but nobody holds it.
    expect(offered).toEqual(
      [at(4, 3), at(6, 3)]
        .map((where) => seize(state, at(5, 2), where))
        .sort(compareCommandsV7),
    );
    for (const victim of state.units) {
      if (victim.id === summoner.id) continue;
      const command: CommandV7 = {
        kind: "SEIZE",
        unitId: summoner.id,
        victimUnitId: victim.id,
      };
      expect(applyCommandV7(state, actor, command).accepted, victim.role).toBe(
        offered.some((item) => canonicalHash(item) === canonicalHash(command)),
      );
    }
  });

  it("leaves no Grave, no blast, and no rising", () => {
    // Three seats: the Undead make Graves for every other death.
    const arena = goblinArenaV7(
      ["CULT", "GOBLIN", "UNDEAD"],
      [
        { seat: 0, role: "CAPTAIN", at: at(6, 7) },
        { seat: 0, role: "FIGHTER", at: at(7, 9) },
        { seat: 0, role: "FIGHTER", at: at(5, 9) },
        { seat: 1, role: "CATAPULT", at: at(6, 8), hp: 3 },
        { seat: 2, role: "GUARD", at: at(1, 13) },
      ],
    );
    // The Goblin siege unit explodes when it dies.
    const victim = unitAtV7(arena, at(6, 8));
    expect(
      roleMechanicsV7(victim.role, "GOBLIN").deathBlastDamage,
    ).not.toBeNull();
    const zombie = unitAtV7(arena, at(1, 13));
    const state = checkedV7({
      ...arena,
      bitten: [
        {
          unitId: victim.id,
          biterPlayerId: zombie.ownerId,
          biterUnitId: zombie.id,
        },
      ],
    });
    const result = playV7(state, seize(state, at(6, 7), at(6, 8)));
    // (The arena's explored board unlocks an achievement at the first
    // command; it is no part of the Seizure.)
    expect(
      kindsV7(result.events).filter((kind) => kind !== "ACHIEVEMENT_UNLOCKED"),
    ).toEqual(["UNIT_SEIZED", "UNIT_DIED", "FAVOUR_GAINED"]);
    expect(result.state.graves).toEqual([]);
    expect(result.state.bitten).toEqual([]);
    // The cultists beside the wreck are unhurt, and nothing rose.
    expect(result.state.units).toHaveLength(state.units.length - 1);
    for (const unit of result.state.units)
      expect(unit.hp, unit.role).toBe(
        state.units.find((before) => before.id === unit.id)?.hp,
      );
    // No Plunder and no bounty for anyone.
    expect(result.state.players.map((player) => player.coins)).toEqual(
      state.players.map((player) => player.coins),
    );
  });

  it("releases the unit a Seized Brain controlled", () => {
    const state = martianFieldV7(
      [
        SUMMONER,
        { seat: 0, role: "FIGHTER", at: at(6, 4) },
        { seat: 1, role: "CAPTAIN", at: at(5, 3), hp: 4 },
        // The Brain's thrall: an Initiate of the Cult's.
        { seat: 0, role: "FIGHTER", at: at(3, 3), controlledBy: at(5, 3) },
      ],
      { factions: ["CULT", "MARTIAN"] },
    );
    const thrall = unitAtV7(state, at(3, 3));
    expect(thrall.ownerId).toBe(seatIdV7(state, 1));
    const result = playV7(state, seize(state, at(5, 2), at(5, 3)));
    expect(kindsV7(result.events)).toEqual(
      expect.arrayContaining(["UNIT_SEIZED", "UNIT_DIED", "UNIT_RELEASED"]),
    );
    expect(unitAtV7(result.state, at(3, 3)).ownerId).toBe(seatIdV7(state, 0));
    expect(result.state.mindControlled).toEqual([]);
  });

  it("counts for Promotion like any kill", () => {
    const base = field("FIGHTER", 2);
    const state = checkedV7({
      ...base,
      units: base.units.map((unit) =>
        unit.role === "CAPTAIN" ? { ...unit, kills: 2 } : unit,
      ),
    });
    const summoner = unitAtV7(state, at(5, 2));
    const result = playV7(state, seize(state, at(5, 2), at(5, 3)));
    expect(unitAtV7(result.state, at(5, 2)).kills).toBe(3);
    expect(offeredV7(result.state, "PROMOTE")).toEqual([
      { kind: "PROMOTE", unitId: summoner.id },
    ]);
  });

  it("is told to the victim's seat and to the seats that saw the victim", () => {
    const state = field("FIGHTER", 5);
    const result = playV7(state, seize(state, at(5, 2), at(5, 3)));
    for (const seat of [0, 1])
      expect(
        kindsV7(
          projectEventsV7(
            state,
            result.state,
            seatIdV7(state, seat),
            result.events,
          ).events as readonly DomainEventV7[],
        ),
        String(seat),
      ).toEqual(["UNIT_SEIZED", "UNIT_DIED", "FAVOUR_GAINED"]);
  });
});

describe("the Cult's Offering (section 5.3)", () => {
  /** A level-2 Cult capital with 2 population and its city action. */
  const grown = (farms = 2, options: FieldOptionsV7 = {}) =>
    withFarmsV7(
      cultFieldV7([{ seat: 0, role: "FIGHTER", at: at(5, 2) }], options),
      0,
      farms,
    );

  it("gives up 2 population for good and pays 3 Favour, as the city action", () => {
    const state = grown();
    const city = cityOfV7(state, 0);
    expect([city.level, city.population]).toEqual([2, 2]);
    const actor = seatIdV7(state, 0);
    const command = offering(state);
    expect(offeredV7(state, "OFFERING")).toEqual([command]);
    expect(previewOfferingV7(viewForV7(state, actor), city.id)).toEqual({
      cityId: city.id,
      population: 2,
      populationAfter: 0,
      favour: 3,
      favourAfter: 3,
    });
    const income = cityIncomeV7(state, city);
    const result = playV7(state, command);
    expect(result.events).toEqual([
      {
        kind: "OFFERING_MADE",
        playerId: actor,
        cityId: city.id,
        at: city.at,
        population: 2,
        favour: 3,
      },
      {
        kind: "CITY_ECONOMY_CHANGED",
        cityId: city.id,
        economicBefore: 4,
        economicAfter: 4,
        populationBefore: 2,
        populationAfter: 0,
        marketBefore: 0,
        marketAfter: 0,
      },
      {
        kind: "FAVOUR_GAINED",
        playerId: actor,
        source: "OFFERING",
        amount: 3,
        favour: 3,
      },
    ]);
    const after = cityOfV7(result.state, 0);
    expect(after).toMatchObject({
      level: 2,
      population: 0,
      economicPopulation: 4,
      offeredPopulation: 2,
      cityActionAvailable: false,
    });
    expect(cityOfferedPopulationV7(after)).toBe(2);
    expect(favour(result.state, 0)).toBe(3);
    // Its income is what it was (the population is not below 0).
    expect(cityIncomeV7(result.state, after)).toBe(income);
    // The city action is spent: nothing is trained there this turn.
    expect(offeredV7(state, "TRAIN").length).toBeGreaterThan(0);
    expect(offeredV7(result.state, "TRAIN", "OFFERING", "LAND_GRANT")).toEqual(
      [],
    );
    // The view shows what the city gave up.
    expect(
      viewForV7(result.state, seatIdV7(state, 1)).cities.find(
        (item) => item.id === city.id,
      ),
    ).toMatchObject({ population: 0, offeredPopulation: 2 });
    expect(
      viewForV7(state, actor).cities.find((item) => item.id === city.id),
    ).not.toHaveProperty("offeredPopulation");
    // Neither a Loss nor the end of a flawless game.
    expect(ledger(result.state, 0)).toEqual(ledger(state, 0));
  });

  it("has a floor: a city with less than 2 population offers nothing", () => {
    // One Farm: level 2 with 0 population.
    const poor = grown(1);
    expect([cityOfV7(poor, 0).level, cityOfV7(poor, 0).population]).toEqual([
      2, 0,
    ]);
    expect(offeredV7(poor, "OFFERING")).toEqual([]);
    expect(rejectedV7(poor, offering(poor))).toEqual({
      code: "OFFERING_NOT_LEGAL",
      params: { reason: "POPULATION" },
    });
    // After its one Offering the level-2 city is at 0 and offers no more,
    // on its next turn either.
    const state = grown();
    const once = playV7(state, offering(state)).state;
    const next = checkedV7({
      ...once,
      cities: once.cities.map((city) => ({
        ...city,
        cityActionAvailable: true,
      })),
    });
    expect(offeredV7(next, "OFFERING")).toEqual([]);
    expect(rejectedV7(next, offering(next))).toEqual({
      code: "OFFERING_NOT_LEGAL",
      params: { reason: "POPULATION" },
    });
    // Four Farms: level 3 with 3 population, one Offering (3 -> 1).
    const rich = grown(4);
    expect([cityOfV7(rich, 0).level, cityOfV7(rich, 0).population]).toEqual([
      3, 3,
    ]);
    const after = playV7(rich, offering(rich)).state;
    expect(cityOfV7(after, 0)).toMatchObject({ level: 3, population: 1 });
  });

  it("puts the city 2 population further from its next level, and never takes a level", () => {
    const state = grown();
    const after = cityOfV7(playV7(state, offering(state)).state, 0);
    // Level 2 keeps its level with 0 population.
    expect(after.level).toBe(2);
    // One more Farm (6 live) would have made level 3; now it does not.
    const without = resolveCityGrowthV7(cityOfV7(state, 0), 0, 6);
    expect(without.city.level).toBe(3);
    const withOffering = resolveCityGrowthV7(after, 0, 6);
    expect(withOffering.reachedLevels).toEqual([]);
    expect(withOffering.city).toMatchObject({ level: 2, population: 2 });
    // Two more Farms (8 live) do.
    expect(resolveCityGrowthV7(after, 0, 8).city).toMatchObject({
      level: 3,
      population: 1,
    });
  });

  it("needs Harvest Rites, level 2, the city action, no siege, and a Cult seat", () => {
    // No Farming.
    const noTech = grown(2, { techs: { 0: ["GATHERING"], 1: [] } });
    expect(offeredV7(noTech, "OFFERING")).toEqual([]);
    expect(rejectedV7(noTech, offering(noTech))).toEqual({
      code: "TECH_REQUIRED",
      params: { tech: "FARMING" },
    });
    // Level 1.
    const small = cultFieldV7([{ seat: 0, role: "FIGHTER", at: at(5, 2) }]);
    expect(cityOfV7(small, 0).level).toBe(1);
    expect(rejectedV7(small, offering(small))).toEqual({
      code: "OFFERING_NOT_LEGAL",
      params: { reason: "LEVEL" },
    });
    // The city action is spent.
    const base = grown();
    const spent = checkedV7({
      ...base,
      cities: base.cities.map((city) => ({
        ...city,
        cityActionAvailable: false,
      })),
    });
    expect(rejectedV7(spent, offering(spent))).toMatchObject({
      code: "CITY_ACTION_SPENT",
    });
    // Besieged.
    const besieged = withFarmsV7(
      cultFieldV7([
        { seat: 0, role: "FIGHTER", at: at(5, 2) },
        { seat: 1, role: "FIGHTER", at: at(8, 8) },
      ]),
      0,
      2,
    );
    expect(rejectedV7(besieged, offering(besieged))).toMatchObject({
      code: "CITY_BESIEGED",
    });
    // Another seat's city, and an unknown city.
    expect(rejectedV7(base, offering(base, 1))).toMatchObject({
      code: "CITY_NOT_OWNED",
    });
    expect(
      rejectedV7(base, { kind: "OFFERING", cityId: 9_999 as never }),
    ).toMatchObject({ code: "CITY_NOT_FOUND" });
    // A Human city of the same shape, with Farming: no Harvest Rites.
    const human = withFarmsV7(
      fieldV7([{ seat: 0, role: "FIGHTER", at: at(5, 2) }], {
        factions: ["ORIGINAL", "CULT"],
      }),
      0,
      2,
    );
    expect(offeredV7(human, "OFFERING")).toEqual([]);
    expect(rejectedV7(human, offering(human))).toEqual({
      code: "TECH_REQUIRED",
      params: { tech: "FARMING" },
    });
  });

  it("keeps what a city gave up through a save, and refuses a wrong amount", () => {
    const state = grown();
    const after = playV7(state, offering(state)).state;
    expect(parseGameStateV7(JSON.parse(JSON.stringify(after)))).toEqual(after);
    const withCity = (patch: Record<string, unknown>): unknown => ({
      ...after,
      cities: after.cities.map((city) =>
        city.id === cityOfV7(after, 0).id ? { ...city, ...patch } : city,
      ),
    });
    for (const [label, patch] of [
      ["zero", { offeredPopulation: 0 }],
      ["odd", { offeredPopulation: 1, population: 1 }],
      ["negative", { offeredPopulation: -2, population: 4 }],
      ["a population that ignores it", { population: 2 }],
    ] as const)
      expect(parseGameStateV7(withCity(patch)), label).toBeNull();
    // A level-1 city never made one.
    const small = cultFieldV7([{ seat: 0, role: "FIGHTER", at: at(5, 2) }]);
    expect(
      parseGameStateV7({
        ...small,
        cities: small.cities.map((city) => ({
          ...city,
          offeredPopulation: 2,
          population: city.population - 2,
        })),
      }),
    ).toBeNull();
  });
});

describe("the Cult's Martyr (section 8.2)", () => {
  it("pays 6 Favour when an enemy kills a Chosen", () => {
    const state = cultFieldV7(
      [
        { seat: 0, role: "SWORDSMAN", at: at(5, 3), hp: 2 },
        { seat: 1, role: "KNIGHT", at: at(5, 4) },
      ],
      { activeSeat: 1 },
    );
    const chosen = unitAtV7(state, at(5, 3));
    const run = attackV7(state, at(5, 4), at(5, 3));
    expect(run.target).toBeUndefined();
    const died = run.events.findIndex(
      (event) => event.kind === "UNIT_DIED" && event.unitId === chosen.id,
    );
    expect(run.events[died + 1]).toEqual({
      kind: "FAVOUR_GAINED",
      playerId: seatIdV7(state, 0),
      source: "MARTYR",
      amount: 6,
      favour: 6,
    });
    expect(favour(run.state, 0)).toBe(6);
    // It is an ordinary Loss for the Cult and a Kill for the Human seat.
    expect(ledger(run.state, 0)).toMatchObject({
      lossValue: 6,
      flawless: false,
    });
    expect(ledger(run.state, 1)).toMatchObject({ killValue: 6 });
    // The Favour is public: the killer's seat is told.
    expect(
      kindsV7(
        projectEventsV7(state, run.state, seatIdV7(state, 1), run.events)
          .events as readonly DomainEventV7[],
      ),
    ).toContain("FAVOUR_GAINED");
  });

  it("pays when a Chosen dies striking, on the Cult's own turn", () => {
    // A Chosen at 1 HP attacks a Guard and dies of the answer.
    const state = cultFieldV7([
      { seat: 0, role: "SWORDSMAN", at: at(5, 3), hp: 1 },
      { seat: 1, role: "GUARD", at: at(5, 4) },
    ]);
    const run = attackV7(state, at(5, 3), at(5, 4));
    expect(run.attacker).toBeUndefined();
    expect(favour(run.state, 0)).toBe(6);
    expect(kindsV7(run.events)).toContain("FAVOUR_GAINED");
  });

  it("adds to the Favour the seat has, once for each Chosen", () => {
    const state = withFavourV7(
      cultFieldV7(
        [
          { seat: 0, role: "SWORDSMAN", at: at(5, 3), hp: 1 },
          { seat: 1, role: "KNIGHT", at: at(5, 4) },
        ],
        { activeSeat: 1 },
      ),
      0,
      10,
    );
    expect(favour(attackV7(state, at(5, 4), at(5, 3)).state, 0)).toBe(16);
  });

  it("pays nothing for another unit's death, or for a Chosen that survives", () => {
    const state = cultFieldV7(
      [
        { seat: 0, role: "FIGHTER", at: at(5, 3), hp: 2 },
        { seat: 0, role: "SWORDSMAN", at: at(7, 3) },
        { seat: 1, role: "KNIGHT", at: at(5, 4) },
        { seat: 1, role: "FIGHTER", at: at(7, 4) },
      ],
      { activeSeat: 1 },
    );
    const killed = attackV7(state, at(5, 4), at(5, 3));
    expect(killed.target).toBeUndefined();
    expect(killed.state.cult.favour).toEqual([]);
    const hurt = attackV7(state, at(7, 4), at(7, 3));
    expect(hurt.target).toBeDefined();
    expect(hurt.state.cult.favour).toEqual([]);
  });

  it("pays nothing for a mind-controlled Chosen: Favour needs a Cult seat", () => {
    const state = martianFieldV7(
      [
        { seat: 0, role: "CAPTAIN", at: at(2, 2) },
        {
          seat: 1,
          role: "SWORDSMAN",
          at: at(5, 3),
          hp: 1,
          controlledBy: at(2, 2),
        },
        { seat: 1, role: "KNIGHT", at: at(5, 4) },
      ],
      { factions: ["MARTIAN", "CULT"], activeSeat: 1 },
    );
    const chosen = unitAtV7(state, at(5, 3));
    expect(chosen.ownerId).toBe(seatIdV7(state, 0));
    const result = applyOkV7(state, seatIdV7(state, 1), {
      kind: "ATTACK",
      unitId: unitAtV7(state, at(5, 4)).id,
      targetUnitId: chosen.id,
    });
    expect(result.state.units.map((unit) => unit.id)).not.toContain(chosen.id);
    expect(result.state.cult.favour).toEqual([]);
    expect(kindsV7(result.events)).not.toContain("FAVOUR_GAINED");
  });

  it("pays the Chosen's own seat when another Cult seat Seizes it", () => {
    const state = cultFieldV7(
      [
        SUMMONER,
        { seat: 0, role: "FIGHTER", at: at(6, 4) },
        { seat: 1, role: "SWORDSMAN", at: at(5, 3), hp: 5 },
      ],
      { factions: ["CULT", "CULT"] },
    );
    const result = playV7(state, seize(state, at(5, 2), at(5, 3)));
    expect(
      result.events.filter((event) => event.kind === "FAVOUR_GAINED"),
    ).toEqual([
      {
        kind: "FAVOUR_GAINED",
        playerId: seatIdV7(state, 1),
        source: "MARTYR",
        amount: 6,
        favour: 6,
      },
      {
        kind: "FAVOUR_GAINED",
        playerId: seatIdV7(state, 0),
        source: "SEIZE",
        amount: 12,
        favour: 12,
      },
    ]);
    expect([favour(result.state, 0), favour(result.state, 1)]).toEqual([12, 6]);
    expect(viewForV7(result.state, seatIdV7(state, 1)).cult.favour).toEqual([
      { playerId: seatIdV7(state, 0), favour: 12 },
      { playerId: seatIdV7(state, 1), favour: 6 },
    ]);
  });

  it("pays nothing to a seat that falls with its Chosen", () => {
    // The Human Fighter takes the Cult's last city; its Chosen is removed.
    const state = cultFieldV7(
      [
        { seat: 1, role: "FIGHTER", at: at(8, 8), captureEligible: true },
        { seat: 0, role: "SWORDSMAN", at: at(5, 2) },
      ],
      { activeSeat: 1 },
    );
    const result = applyOkV7(state, seatIdV7(state, 1), {
      kind: "CAPTURE",
      unitId: unitAtV7(state, at(8, 8)).id,
    });
    expect(result.state.units.some((unit) => unit.role === "SWORDSMAN")).toBe(
      false,
    );
    expect(kindsV7(result.events)).not.toContain("FAVOUR_GAINED");
    expect(result.state.cult.favour).toEqual([]);
  });
});

describe("the Cult's Favour: events, flawless, and the dock's stand-in", () => {
  it("validates the four events and the new cause of death", () => {
    const good: readonly DomainEventV7[] = [
      {
        kind: "UNIT_SACRIFICED",
        playerId: 1 as never,
        unitId: 5 as never,
        victimUnitId: 6 as never,
        role: "JUGGERNAUT",
        at: at(1, 1),
        favour: 12,
      },
      {
        kind: "UNIT_SEIZED",
        playerId: 1 as never,
        unitId: 5 as never,
        holderUnitId: 7 as never,
        victimUnitId: 6 as never,
        victimOwnerId: 2 as never,
        role: "KNIGHT",
        at: at(1, 1),
        favour: 18,
      },
      {
        kind: "OFFERING_MADE",
        playerId: 1 as never,
        cityId: 3 as never,
        at: at(1, 1),
        population: 2,
        favour: 3,
      },
      {
        kind: "FAVOUR_GAINED",
        playerId: 1 as never,
        source: "MARTYR",
        amount: 6,
        favour: 6,
      },
      { kind: "UNIT_DIED", unitId: 6 as never, cause: "SACRIFICED" },
    ];
    for (const event of good)
      expect(parseEventV7(event).ok, event.kind).toBe(true);
    const raw = JSON.parse(JSON.stringify(good)) as readonly Record<
      string,
      unknown
    >[];
    const bad: readonly Record<string, unknown>[] = [
      // A unit never offers itself.
      { ...raw[0], victimUnitId: 5 },
      { ...raw[0], favour: 0 },
      // The holder is a third unit; the victim is another seat's; never a
      // reward giant; twice a value is even.
      { ...raw[1], holderUnitId: 5 },
      { ...raw[1], victimOwnerId: 1 },
      { ...raw[1], role: "JUGGERNAUT" },
      { ...raw[1], favour: 9 },
      { ...raw[2], population: 3 },
      { ...raw[2], favour: 4 },
      { ...raw[3], source: "GIFT" },
      { ...raw[3], amount: 0 },
      { ...raw[3], amount: 7 },
      { ...raw[3], unitId: 6 },
    ];
    for (const event of bad)
      expect(parseEventV7(event).ok, JSON.stringify(event)).toBe(false);
  });

  it("lists the Sacrifice among the events that end a flawless game", () => {
    expect(FLAWLESS_BREAKING_EVENT_KINDS_V7).toContain("UNIT_SACRIFICED");
  });

  it("names a button by its victim's unit, never by an ID or a tile", () => {
    const state = withFarmsV7(
      cultFieldV7([
        SUMMONER,
        { seat: 0, role: "FIGHTER", at: at(6, 4) },
        { seat: 0, role: "JUGGERNAUT", at: at(4, 1) },
        { seat: 1, role: "KNIGHT", at: at(5, 3), hp: 5 },
      ]),
      0,
      2,
    );
    const view = viewForV7(state, seatIdV7(state, 0));
    const buttons = queryPlayerCommandsV7(view).flatMap((command) => {
      const button = cultCommandPresentationV7(view, command);
      return button === null ? [] : [button];
    });
    expect(buttons.map((button) => [button.label, button.chip])).toEqual([
      ["Sacrifice Thing in the Cellar", "+12 Favour"],
      ["Seize Knight", "+18 Favour"],
      ["Offering", "+3 Favour · −2 population"],
    ]);
    for (const button of buttons) {
      expect(`${button.label} ${button.chip} ${button.tooltip}`).not.toMatch(
        /\d+,\s*\d+|#\d|\bu\d|_/,
      );
      expect(button.tooltip.length).toBeGreaterThan(20);
    }
    // Any other command has no Cult button.
    expect(cultCommandPresentationV7(view, { kind: "END_TURN" })).toBeNull();
  });
});

describe("the Cult's Favour: the older Normal policy tolerates the commands", () => {
  /** Plays the active seat's whole turn with the Normal AI. */
  function turn(start: GameStateV7): readonly CommandV7[] {
    let state = start;
    const actor = state.turnOrder[state.activeSeatIndex];
    if (actor === undefined) throw new Error("no active seat");
    const commands: CommandV7[] = [];
    for (let step = 0; step < 200; step += 1) {
      const view = viewForV7(state, actor);
      const command = chooseNormalCommandV7(view).command;
      if (command === null) throw new Error("the policy chose nothing");
      expect(queryPlayerCommandsV7(view)).toContainEqual(command);
      commands.push(command);
      if (command.kind === "END_TURN") return commands;
      state = applyOkV7(state, actor, command).state;
    }
    throw new Error("the turn did not end");
  }

  it("never picks a Sacrifice, a Seizure, or an Offering, and ends its turn", () => {
    // A Cult AI seat (seat 1) with all three on offer.
    const state = withFarmsV7(
      fieldV7(
        [
          { seat: 1, role: "CAPTAIN", at: at(4, 4) },
          { seat: 1, role: "FIGHTER", at: at(4, 5) },
          { seat: 1, role: "JUGGERNAUT", at: at(3, 4) },
          { seat: 1, role: "SWORDSMAN", at: at(3, 5) },
          { seat: 0, role: "KNIGHT", at: at(5, 5), hp: 3 },
          { seat: 0, role: "FIGHTER", at: at(8, 7) },
        ],
        { factions: ["ORIGINAL", "CULT"], activeSeat: 1, coins: 30 },
      ),
      1,
      2,
    );
    const offered = new Set(
      offeredV7(state, "SACRIFICE", "SEIZE", "OFFERING").map(
        (command) => command.kind,
      ),
    );
    expect([...offered].sort()).toEqual(["OFFERING", "SACRIFICE", "SEIZE"]);
    const commands = turn(state);
    expect(commands.at(-1)?.kind).toBe("END_TURN");
    for (const command of commands)
      expect(["SACRIFICE", "SEIZE", "OFFERING"]).not.toContain(command.kind);
    // Every candidate the policy scored is one it may pick.
    const decision = chooseNormalCommandV7(
      viewForV7(state, seatIdV7(state, 1)),
    );
    for (const candidate of decision.candidates)
      expect(["SACRIFICE", "SEIZE", "OFFERING"]).not.toContain(
        candidate.command.kind,
      );
  });

  it("plays a turn against a Cult seat that holds Favour", () => {
    const state = withFavourV7(
      cultFieldV7(
        [
          SUMMONER,
          { seat: 0, role: "FIGHTER", at: at(5, 3) },
          { seat: 1, role: "KNIGHT", at: at(3, 5) },
          { seat: 1, role: "MARKSMAN", at: at(3, 6) },
        ],
        { activeSeat: 1, coins: 30 },
      ),
      0,
      21,
    );
    expect(turn(state).at(-1)?.kind).toBe("END_TURN");
  });
});
