import { describe, expect, it } from "vitest";
import { scoreCommandV7 } from "../../src/ai/v7";
import {
  PRIOR_RULESET_7_IDS,
  RULESET_7_ID,
  SAVE_STORAGE_KEY_V7,
  effectiveRoleRuleV7,
  parseGameStateV7,
  queryAiReadyCommandsV7,
  queryPlayerCommandsV7,
  technologyCapabilitiesV7,
  unitIsSubmergedV7,
  unitSailsIceV7,
  viewForV7,
  type CityId,
  type CommandV7,
  type CoordV7,
  type DomainEventV7,
  type GameStateV7,
  type TechnologyIdV7,
  type UnitRoleIdV7,
} from "../../src/engine/index";
import { OBSOLETE_SAVE_STORAGE_KEYS_V7 } from "../../src/persistence/browser-v7";
import {
  frozenArenaV7,
  patchFrozenUnitV7,
  withFishingHolesV7,
  type FrozenArenaOptionsV7,
} from "../fixtures/v7-frozen-sea";
import {
  NAVAL_TECHS_V7,
  acceptV7,
  navalUnitAtV7,
  rejectV7,
  seatV7,
} from "../fixtures/v7-naval-branch";

// The Ice Folk sea beasts (`pulp_wars-lf1r`, `pulp-wars-poc-7r142`; the
// user, 2026-11-16: "I would prefer that the deep winter ... unlocked the
// defensive unit like with all the other factions and we find something else
// for the naval techs to do ... some sort of unit(s) that live on the frozen
// water and perform the same function as ships"). Deep Winter trains the
// Walrus again; Rime the Narwhal Riders, the Ice Fortress the Iceberg and
// Under the Ice the Orca, the three ship roles with the Human ships'
// numbers, trained at a Fishing Hole and swimming on ice as on water.
// Hand-built states on the authored strait (rows 0 to 2 and 8 to 10 land,
// rows 3 and 7 Shallow Water, rows 4 to 6 Deep Water; seat 0, the Ice Folk,
// has its capital on (5, 2); seat 1, the Humans, theirs on (5, 8)). No
// match is played.

const RIME: readonly TechnologyIdV7[] = ["SHORECRAFT"];
const PACK_ICE: readonly TechnologyIdV7[] = [...RIME, "NAVIGATION"];
const FORTRESS: readonly TechnologyIdV7[] = [...PACK_ICE, "NAVAL_ENGINEERING"];
const UNDER: readonly TechnologyIdV7[] = [
  ...RIME,
  "SEAMANSHIP",
  "SUBMERSIBLES",
];

const CAPITAL: CoordV7 = { x: 5, y: 2 };
// Seat 0's Shallow Water beside its capital, for its Fishing Holes.
const HOLE: CoordV7 = { x: 6, y: 3 };
const SECOND: CoordV7 = { x: 4, y: 3 };
// Open water, ice and land round a sea beast on (5, 3).
const START: CoordV7 = { x: 5, y: 3 };
const LAND: CoordV7 = { x: 6, y: 2 };
const DEEP: CoordV7 = { x: 5, y: 4 };

const arena = (
  ice0: readonly TechnologyIdV7[],
  options: Omit<FrozenArenaOptionsV7, "technologies"> = { units: [] },
): GameStateV7 =>
  frozenArenaV7({
    ports: [false, true],
    ...options,
    factions: ["ICE_FOLK", "ORIGINAL"],
    technologies: [ice0, NAVAL_TECHS_V7],
  });

/** Seat 0 with Fishing Holes on HOLE and SECOND (its own ice). */
const withHoles = (ice0: readonly TechnologyIdV7[]): GameStateV7 =>
  withFishingHolesV7(
    arena(ice0, { units: [], ice: [{ at: HOLE }, { at: SECOND }] }),
    [HOLE, SECOND],
  );

const capitalOf = (state: GameStateV7): CityId => {
  const city = state.cities.find(
    (candidate) => candidate.at.x === CAPITAL.x && candidate.at.y === CAPITAL.y,
  );
  if (city === undefined) throw new Error("no capital");
  return city.id;
};
const trainNaval = (
  state: GameStateV7,
  role: UnitRoleIdV7,
  at: CoordV7,
): CommandV7 =>
  ({
    kind: "TRAIN_NAVAL",
    cityId: capitalOf(state),
    at,
    role,
  }) as CommandV7;
const offered = (state: GameStateV7, seat: 0 | 1 = 0) =>
  queryPlayerCommandsV7(viewForV7(state, seatV7(state, seat).id));
const move = (
  state: GameStateV7,
  from: CoordV7,
  path: readonly CoordV7[],
): CommandV7 => ({
  kind: "MOVE",
  unitId: navalUnitAtV7(state, from).id,
  path: [...path],
});
const trainedEvent = (events: readonly DomainEventV7[]) =>
  events.find(
    (event): event is Extract<DomainEventV7, { kind: "NAVAL_UNIT_TRAINED" }> =>
      event.kind === "NAVAL_UNIT_TRAINED",
  );

/** The same position on `seat`'s turn. */
function turnOf(state: GameStateV7, seat: 0 | 1): GameStateV7 {
  const parsed = parseGameStateV7({
    ...state,
    activeSeatIndex: state.turnOrder.indexOf(seatV7(state, seat).id),
  });
  if (parsed === null) throw new Error("the turn state is invalid");
  return parsed;
}

/** `state` with every pending city reward of seat 0 taken (the first). */
function settled(state: GameStateV7): GameStateV7 {
  let next = state;
  for (let choice = next.pendingChoices[0]; choice !== undefined;) {
    next = acceptV7(next, 0, {
      kind: "CHOOSE_CITY_REWARD",
      cityId: choice.cityId,
      reachedLevel: choice.reachedLevel,
      reward: choice.candidates[0] as never,
    }).state;
    choice = next.pendingChoices[0];
  }
  return next;
}

describe("the identity (pulp_wars-lf1r)", () => {
  // The Heal button (`pulp_wars-6y2r`) took 7r143 after it.
  it("was 7r142 after 7r141, both save keys obsolete now", () => {
    expect(RULESET_7_ID).toBe("pulp-wars-poc-7r144");
    expect(SAVE_STORAGE_KEY_V7).toBe("pulpWars.save.v7r144.current");
    expect(PRIOR_RULESET_7_IDS.at(-2)).toBe("pulp-wars-poc-7r142");
    expect(PRIOR_RULESET_7_IDS.at(-3)).toBe("pulp-wars-poc-7r141");
    expect(PRIOR_RULESET_7_IDS).not.toContain(RULESET_7_ID);
    expect(OBSOLETE_SAVE_STORAGE_KEYS_V7.at(-3)).toBe(
      "pulpWars.save.v7r141.current",
    );
    expect(OBSOLETE_SAVE_STORAGE_KEYS_V7).not.toContain(SAVE_STORAGE_KEY_V7);
  });
});

describe("the Walrus is Deep Winter's again", () => {
  it("is trainable with Deep Winter and not with Rime alone", () => {
    expect(effectiveRoleRuleV7("GUARD", "ICE_FOLK")).toMatchObject({
      label: "Walrus",
      technology: "FORTIFICATION",
    });
    expect(
      technologyCapabilitiesV7(RIME, "ICE_FOLK").trainableRoles,
    ).not.toContain("GUARD");
    expect(
      technologyCapabilitiesV7(["DRILL", "FORTIFICATION"], "ICE_FOLK")
        .trainableRoles,
    ).toContain("GUARD");
    const train = (state: GameStateV7): CommandV7 => ({
      kind: "TRAIN",
      cityId: capitalOf(state),
      role: "GUARD",
    });
    const rime = arena(RIME);
    expect(rejectV7(rime, 0, train(rime))).toEqual({
      code: "TECH_REQUIRED",
      params: { tech: "FORTIFICATION" },
    });
    // The arena's Fighter steps off the capital, where the Walrus appears.
    const built = arena(["DRILL", "FORTIFICATION"]);
    const deepWinter = patchFrozenUnitV7(
      built,
      navalUnitAtV7(built, CAPITAL).id,
      { at: { x: 4, y: 1 } },
    );
    expect(offered(deepWinter)).toContainEqual(train(deepWinter));
    const result = acceptV7(deepWinter, 0, train(deepWinter));
    expect(
      result.state.units.some(
        (unit) =>
          unit.role === "GUARD" &&
          unit.ownerId === seatV7(result.state, 0).id &&
          unit.form === "LAND",
      ),
    ).toBe(true);
  });
});

describe("the sea beasts are the Ice Folk ships", () => {
  it("are the three ship roles with the Human ships' numbers, never boarded", () => {
    const names: Partial<Record<UnitRoleIdV7, string>> = {
      PATROL_BOAT: "Narwhal Riders",
      BATTLESHIP: "Iceberg",
      SUBMARINE: "Orca",
    };
    for (const [role, label] of Object.entries(names)) {
      const ice = effectiveRoleRuleV7(role as UnitRoleIdV7, "ICE_FOLK");
      const human = effectiveRoleRuleV7(role as UnitRoleIdV7, "ORIGINAL");
      expect(ice.label).toBe(label);
      expect(ice.abilities).toContain("ICE_SWIMMER");
      expect([
        ice.cost,
        ice.maxHp,
        ice.attack2,
        ice.defense2,
        ice.move,
        ice.range,
        ice.technology,
      ]).toEqual([
        human.cost,
        human.maxHp,
        human.attack2,
        human.defense2,
        human.move,
        human.range,
        human.technology,
      ]);
    }
    expect(
      effectiveRoleRuleV7("PATROL_BOAT", "ICE_FOLK").abilities,
    ).not.toContain("RAM");
    expect(effectiveRoleRuleV7("SUBMARINE", "ICE_FOLK").abilities).toEqual(
      expect.arrayContaining(["SUBMERGED", "TORPEDO"]),
    );
  });

  it("each trains at a Fishing Hole with its technology and not without", () => {
    const cases: readonly [UnitRoleIdV7, readonly TechnologyIdV7[], string][] =
      [
        ["PATROL_BOAT", RIME, "SHORECRAFT"],
        ["BATTLESHIP", FORTRESS, "NAVAL_ENGINEERING"],
        ["SUBMARINE", UNDER, "SUBMERSIBLES"],
      ];
    for (const [role, techs, tech] of cases) {
      const state = withHoles(techs);
      const command = trainNaval(state, role, HOLE);
      expect(offered(state)).toContainEqual(command);
      const result = acceptV7(state, 0, command);
      const trained = navalUnitAtV7(result.state, HOLE);
      expect(trained).toMatchObject({ role, form: "NAVAL" });
      expect(unitSailsIceV7(result.state, trained)).toBe(true);
      expect(trainedEvent(result.events)).toMatchObject({
        role,
        dock: "FISHING_HOLE",
        discountSource: null,
        cost: effectiveRoleRuleV7(role, "ICE_FOLK").cost,
      });
      // Without the technology: refused, and not offered.
      const without = withHoles(RIME);
      if (role !== "PATROL_BOAT") {
        expect(rejectV7(without, 0, trainNaval(without, role, HOLE))).toEqual({
          code: "TECH_REQUIRED",
          params: { tech },
        });
        expect(offered(without)).not.toContainEqual(
          trainNaval(without, role, HOLE),
        );
      }
    }
    // Rime is the Patrol Boat's technology, and a Fishing Hole needs Rime: on
    // plain open water (no hole, no dock) nothing is trained.
    const open = withHoles(RIME);
    expect(rejectV7(open, 0, trainNaval(open, "PATROL_BOAT", START)).code).toBe(
      "INVALID_TILE",
    );
  });

  it("the Iceberg is 2 Coins cheaper at an Ice Fortress", () => {
    const holes = withHoles(FORTRESS);
    const fortified = settled(
      acceptV7(holes, 0, { kind: "BUILD_ICE_FORTRESS", at: HOLE }).state,
    );
    const cost = effectiveRoleRuleV7("BATTLESHIP", "ICE_FOLK").cost ?? 0;
    const atFortress = acceptV7(
      fortified,
      0,
      trainNaval(fortified, "BATTLESHIP", HOLE),
    );
    expect(trainedEvent(atFortress.events)).toMatchObject({
      dock: "ICE_FORTRESS",
      discountSource: "ICE_FORTRESS",
      cost: cost - 2,
    });
    expect(seatV7(atFortress.state, 0).coins).toBe(
      seatV7(fortified, 0).coins - (cost - 2),
    );
    const atHole = acceptV7(
      fortified,
      0,
      trainNaval(fortified, "BATTLESHIP", SECOND),
    );
    expect(trainedEvent(atHole.events)).toMatchObject({
      dock: "FISHING_HOLE",
      cost,
    });
  });

  it("the Normal AI sends a sea beast at a hostile boat over its ice", () => {
    const state = arena(PACK_ICE, {
      units: [
        { seat: 0, role: "PATROL_BOAT", at: { x: 2, y: 3 } },
        { seat: 1, role: "PATROL_BOAT", at: { x: 8, y: 4 } },
      ],
      ice: [
        { at: { x: 2, y: 3 } },
        { at: { x: 3, y: 3 } },
        { at: { x: 4, y: 3 } },
      ],
    });
    const view = viewForV7(state, seatV7(state, 0).id);
    const toward = move(state, { x: 2, y: 3 }, [
      { x: 3, y: 3 },
      { x: 4, y: 3 },
    ]);
    expect(offered(state)).toContainEqual(toward);
    expect(scoreCommandV7(view, toward).priority).toBeGreaterThan(0);
  });

  it("the Normal AI's offered training includes them", () => {
    const state = withHoles([...FORTRESS, "SEAMANSHIP", "SUBMERSIBLES"]);
    const view = viewForV7(state, seatV7(state, 0).id);
    const ready = queryAiReadyCommandsV7(view).map((item) =>
      "command" in item ? item.command : item,
    );
    for (const role of ["PATROL_BOAT", "BATTLESHIP", "SUBMARINE"] as const) {
      const command = trainNaval(state, role, HOLE);
      expect(JSON.stringify(ready)).toContain(JSON.stringify(command));
      expect(scoreCommandV7(view, command).priority).toBeGreaterThan(0);
    }
  });
});

describe("a sea beast lives on the water and the ice", () => {
  const scene = (
    ice0: readonly TechnologyIdV7[],
    ice: readonly CoordV7[],
    role: UnitRoleIdV7 = "PATROL_BOAT",
  ) =>
    arena(ice0, {
      units: [{ seat: 0, role, at: START }],
      ice: ice.map((at) => ({ at })),
    });

  it("moves onto and through ice and over open water, but never onto land", () => {
    const iced = { x: 4, y: 3 };
    const beyond = { x: 3, y: 3 };
    const state = scene(RIME, [iced, beyond]);
    // Onto ice, and through two ice tiles (the border freeze never locks it in).
    const onto = acceptV7(state, 0, move(state, START, [iced]));
    expect(navalUnitAtV7(onto.state, iced).role).toBe("PATROL_BOAT");
    acceptV7(state, 0, move(state, START, [iced, beyond]));
    // The ice stays.
    expect(
      onto.state.ice.some(
        (entry) => entry.at.x === iced.x && entry.at.y === iced.y,
      ),
    ).toBe(true);
    // Open water.
    acceptV7(state, 0, move(state, START, [{ x: 6, y: 3 }]));
    // Never onto land, and it never Glides: three ice tiles are one too many.
    rejectV7(state, 0, move(state, START, [LAND]));
    const long = scene(RIME, [iced, beyond, { x: 2, y: 3 }]);
    rejectV7(long, 0, move(long, START, [iced, beyond, { x: 2, y: 3 }]));
  });

  it("needs Pack Ice for Deep Water, open or iced", () => {
    const openRime = scene(RIME, []);
    rejectV7(openRime, 0, move(openRime, START, [DEEP]));
    const openPack = scene(PACK_ICE, []);
    acceptV7(openPack, 0, move(openPack, START, [DEEP]));
    const icedRime = scene(RIME, [DEEP]);
    rejectV7(icedRime, 0, move(icedRime, START, [DEEP]));
    const icedPack = scene(PACK_ICE, [DEEP]);
    acceptV7(icedPack, 0, move(icedPack, START, [DEEP]));
  });

  it("the Orca stays Submerged under ice: attacked only from the next tile", () => {
    const state = turnOf(
      arena(UNDER, {
        units: [
          { seat: 0, role: "SUBMARINE", at: START },
          { seat: 1, role: "MARKSMAN", at: { x: 5, y: 1 } },
          { seat: 1, role: "FIGHTER", at: { x: 4, y: 2 } },
        ],
        ice: [{ at: START }],
      }),
      1,
    );
    const orca = navalUnitAtV7(state, START);
    expect(unitIsSubmergedV7(state, orca)).toBe(true);
    const attack = (from: CoordV7): CommandV7 => ({
      kind: "ATTACK",
      unitId: navalUnitAtV7(state, from).id,
      targetUnitId: orca.id,
    });
    // The Marksman two tiles away may not shoot it; the Fighter beside it
    // may strike.
    expect(offered(state, 1)).not.toContainEqual(attack({ x: 5, y: 1 }));
    rejectV7(state, 1, attack({ x: 5, y: 1 }));
    expect(offered(state, 1)).toContainEqual(attack({ x: 4, y: 2 }));
  });
});
