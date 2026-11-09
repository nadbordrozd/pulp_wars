import { describe, expect, it } from "vitest";
import {
  RULESET_7_ID,
  TECHNOLOGY_DISPLAY_NAME_OVERRIDES_V7,
  factionTreeV7,
  fortificationLevelForUnitV7,
  parseGameStateV7,
  queryCombatPreviewV7,
  queryPlayerCommandsV7,
  technologyCapabilitiesV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type GameStateV7,
  type TechnologyIdV7,
  type UnitRoleIdV7,
} from "../../src/engine/index";
import { scoreCommandV7 } from "../../src/ai/v7";
import { martianMoveLabelV7 } from "../../src/render/canvas/martian-board-plan-v7";
import {
  FREEZE_DEEP_UNLOCK_V7,
  HARPOONS_UNLOCK_V7,
  ICE_FORTRESS_UNLOCK_V7,
  UNDER_THE_ICE_UNLOCK_V7,
} from "../../src/render/frozen-sea-presentation-v7";
import {
  DIVE_TERRAIN_V7,
  frozenArenaV7,
  iceEntryV7,
  patchFrozenUnitV7,
  withFishingHolesV7,
  type FrozenArenaOptionsV7,
} from "../fixtures/v7-frozen-sea";
import {
  acceptV7,
  navalUnitAtV7,
  navalUnitV7,
  rejectV7,
  seatV7,
} from "../fixtures/v7-naval-branch";

// The naval branch rebuilt (`pulp_wars-tzk6`, `pulp-wars-poc-7r137`,
// docs/product/ICE_FOLK_REDESIGN_2026-11.md section 3.4 and section 6,
// bead 4): Rime trains the Walrus, which swims; Pack Ice takes it onto
// Deep Water; Harpoons give +1 Attack against units afloat; the Ice
// Fortress upgrades a Fishing Hole; Under the Ice gives the dive and the
// holes' population. Glacier, Black Ice, Hoarfrost and the Ice Harbour are
// gone, and a captured dock stays a plain dock. Hand-built states on the
// authored strait (rows 0 to 2 and 8 to 10 land, rows 3 and 7 Shallow
// Water, rows 4 to 6 Deep Water; seat 0, the Ice Folk, has its capital on
// (5, 2) and a Port on (4, 3); seat 1, the Humans, theirs on (5, 8)).

const RIME: readonly TechnologyIdV7[] = ["SHORECRAFT"];
const PACK_ICE: readonly TechnologyIdV7[] = [...RIME, "NAVIGATION"];
const FORTRESS: readonly TechnologyIdV7[] = [...PACK_ICE, "NAVAL_ENGINEERING"];
const HARPOONS: readonly TechnologyIdV7[] = [...RIME, "SEAMANSHIP"];
const ALL: readonly TechnologyIdV7[] = [
  ...FORTRESS,
  "SEAMANSHIP",
  "SUBMERSIBLES",
];
const HUMAN_NAVAL: readonly TechnologyIdV7[] = ALL;

const SHORE: CoordV7 = { x: 2, y: 2 };
const SHALLOW: CoordV7 = { x: 2, y: 3 };
const DEEP: CoordV7 = { x: 2, y: 4 };

const arena = (
  options: Omit<FrozenArenaOptionsV7, "technologies"> & {
    readonly ice0?: readonly TechnologyIdV7[];
  },
): GameStateV7 =>
  frozenArenaV7({
    ...options,
    factions: ["ICE_FOLK", "ORIGINAL"],
    technologies: [options.ice0 ?? RIME, HUMAN_NAVAL],
  });

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

/** `state` with the unit on `from` set down on `to` (open water allowed). */
const placed = (state: GameStateV7, from: CoordV7, to: CoordV7) =>
  patchFrozenUnitV7(state, navalUnitAtV7(state, from).id, { at: to });

const move = (
  state: GameStateV7,
  from: CoordV7,
  path: readonly CoordV7[],
): CommandV7 => ({
  kind: "MOVE",
  unitId: navalUnitAtV7(state, from).id,
  path: [...path],
});
const attack = (
  state: GameStateV7,
  from: CoordV7,
  target: CoordV7,
): CommandV7 => ({
  kind: "ATTACK",
  unitId: navalUnitAtV7(state, from).id,
  targetUnitId: navalUnitAtV7(state, target).id,
});
const offered = (state: GameStateV7, seat: 0 | 1 = 0) =>
  queryPlayerCommandsV7(viewForV7(state, seatV7(state, seat).id));

describe("the rebuilt branch: each node's unlocks, in the tree and on its card", () => {
  it("is ruleset 7r137", () => {
    expect(RULESET_7_ID).toBe("pulp-wars-poc-7r137");
  });

  it("Rime trains the Walrus; Pack Ice, the Ice Fortress, Harpoons and Under the Ice", () => {
    const tree = factionTreeV7("ICE_FOLK");
    const node = (tech: TechnologyIdV7) =>
      tree.nodes.find((entry) => entry.id === tech);
    expect(node("SHORECRAFT")?.unlockedRoles).toEqual(["GUARD"]);
    expect(tree.roleRules.GUARD).toMatchObject({
      label: "Walrus",
      technology: "SHORECRAFT",
      cost: 4,
    });
    // Deep Winter (the Ice Folk Fortification) no longer trains it.
    expect(node("FORTIFICATION")?.unlockedRoles).toEqual([]);
    expect(node("NAVIGATION")?.unlocks).toContainEqual({
      kind: "FREEZE",
      depth: "DEEP",
    });
    expect(node("NAVAL_ENGINEERING")?.unlocks).toEqual([
      { kind: "COMMAND", command: "BUILD_ICE_FORTRESS" },
    ]);
    expect(node("SEAMANSHIP")?.unlocks).toEqual([{ kind: "HARPOONS" }]);
    expect(node("SUBMERSIBLES")?.unlocks).toEqual([{ kind: "UNDER_THE_ICE" }]);
    expect(TECHNOLOGY_DISPLAY_NAME_OVERRIDES_V7.ICE_FOLK).toMatchObject({
      SHORECRAFT: "Rime",
      NAVIGATION: "Pack Ice",
      NAVAL_ENGINEERING: "Ice Fortress",
      SEAMANSHIP: "Harpoons",
      SUBMERSIBLES: "Under the Ice",
    });
    // The card lines (section 3.4), one number each at most.
    expect(FREEZE_DEEP_UNLOCK_V7).toBe(
      "Ice: your freezes make ice on deep water too, and Walruses swim there",
    );
    expect(HARPOONS_UNLOCK_V7).toBe(
      "Harpoons: +1 Attack against ships and boats",
    );
    expect(ICE_FORTRESS_UNLOCK_V7).toBe(
      "Ice Fortress: fortify a Fishing Hole: a unit on it is fortified and shoots 1 further",
    );
    expect(UNDER_THE_ICE_UNLOCK_V7).toBe(
      "Under the Ice: dive between your Fishing Holes; each hole gives +1 population",
    );
    for (const line of [
      HARPOONS_UNLOCK_V7,
      ICE_FORTRESS_UNLOCK_V7,
      UNDER_THE_ICE_UNLOCK_V7,
    ])
      expect((line.match(/\d+/g) ?? []).length).toBeLessThanOrEqual(1);
    // No other faction gets any of it.
    for (const faction of ["ORIGINAL", "GOBLIN", "CULT"] as const) {
      const caps = technologyCapabilitiesV7(ALL, faction);
      expect([caps.harpoons, caps.underTheIce], faction).toEqual([
        false,
        false,
      ]);
      expect(caps.commands).not.toContain("BUILD_ICE_FORTRESS");
    }
  });
});

describe("the Walrus swims (root decision 1)", () => {
  const walrus = (ice0: readonly TechnologyIdV7[] = RIME) =>
    arena({ ice0, units: [{ seat: 0, role: "GUARD", at: SHORE }] });

  it("moves onto open Shallow Water as a land unit, one point a tile; Deep Water only with Pack Ice", () => {
    const state = walrus();
    expect(offered(state)).toContainEqual(move(state, SHORE, [SHALLOW]));
    const swum = acceptV7(state, 0, move(state, SHORE, [SHALLOW]));
    const unit = navalUnitAtV7(swum.state, SHALLOW);
    expect(unit).toMatchObject({ role: "GUARD", form: "LAND" });
    expect(iceEntryV7(swum.state, SHALLOW)).toBeUndefined();
    expect(parseGameStateV7(swum.state)).not.toBeNull();
    // Water is one point a tile (no Glide on water): Move 1 stops there.
    expect(
      rejectV7(state, 0, move(state, SHORE, [SHALLOW, DEEP])).params,
    ).toEqual({ reason: "BUDGET_EXCEEDED" });
    // From the Shallow Water, Deep Water needs Pack Ice.
    const afloat = placed(state, SHORE, SHALLOW);
    expect(rejectV7(afloat, 0, move(afloat, SHALLOW, [DEEP])).code).toBe(
      "MOVEMENT_ILLEGAL",
    );
    const packed = placed(walrus(PACK_ICE), SHORE, SHALLOW);
    expect(offered(packed)).toContainEqual(move(packed, SHALLOW, [DEEP]));
    acceptV7(packed, 0, move(packed, SHALLOW, [DEEP]));
    // Pack Ice is needed to enter Deep Water, not to stand on it (a Walrus
    // a Brain released there): it may swim back to Shallow Water.
    const stranded = placed(state, SHORE, DEEP);
    expect(offered(stranded)).toContainEqual(move(stranded, DEEP, [SHALLOW]));
  });

  it("never enters a dock, and no other Ice Folk ground unit swims", () => {
    const docked = arena({
      units: [
        { seat: 0, role: "GUARD", at: { x: 3, y: 2 } },
        { seat: 0, role: "FIGHTER", at: SHORE },
      ],
    });
    const port = docked.board.tiles.find(
      (tile) => tile.at.x === 4 && tile.at.y === 3,
    );
    expect(port?.improvement).toBe("PORT");
    expect(
      rejectV7(docked, 0, move(docked, { x: 3, y: 2 }, [{ x: 4, y: 3 }])).code,
    ).toBe("MOVEMENT_ILLEGAL");
    expect(rejectV7(docked, 0, move(docked, SHORE, [SHALLOW])).code).toBe(
      "MOVEMENT_ILLEGAL",
    );
  });

  it("attacks a ship and a land unit from the water", () => {
    const ship = placed(
      arena({
        units: [
          { seat: 0, role: "GUARD", at: SHORE },
          { seat: 1, role: "PATROL_BOAT", at: DEEP },
        ],
      }),
      SHORE,
      SHALLOW,
    );
    expect(offered(ship)).toContainEqual(attack(ship, SHALLOW, DEEP));
    const hit = acceptV7(ship, 0, attack(ship, SHALLOW, DEEP));
    expect(hit.events.map((event) => event.kind)).toContain("COMBAT_RESOLVED");
    const land = placed(
      arena({
        units: [
          { seat: 0, role: "GUARD", at: SHORE },
          { seat: 1, role: "FIGHTER", at: { x: 1, y: 2 } },
        ],
      }),
      SHORE,
      SHALLOW,
    );
    expect(offered(land)).toContainEqual(attack(land, SHALLOW, { x: 1, y: 2 }));
    acceptV7(land, 0, attack(land, SHALLOW, { x: 1, y: 2 }));
  });

  it("keeps Frostbite on the water: a land unit that strikes it from the shore is Frozen", () => {
    const state = turnOf(
      placed(
        arena({
          units: [
            { seat: 0, role: "GUARD", at: SHORE },
            { seat: 1, role: "FIGHTER", at: { x: 1, y: 2 } },
          ],
        }),
        SHORE,
        SHALLOW,
      ),
      1,
    );
    const fighter = navalUnitAtV7(state, { x: 1, y: 2 });
    const result = acceptV7(state, 1, attack(state, { x: 1, y: 2 }, SHALLOW));
    expect(result.events).toContainEqual(
      expect.objectContaining({
        kind: "UNITS_FROZEN",
        source: "FROSTBITE",
        results: [{ unitId: fighter.id, turnsLeft: 2 }],
      }),
    );
  });

  it("its swim is a plain Move on the board (no hover-launch label)", () => {
    const state = walrus();
    const view = viewForV7(state, seatV7(state, 0).id);
    const swim = move(state, SHORE, [SHALLOW]);
    if (swim.kind !== "MOVE") throw new Error("not a move");
    expect(martianMoveLabelV7(view, swim)).toBeNull();
  });

  it("the Normal AI may take the Walrus out over the water", () => {
    const state = arena({
      units: [
        { seat: 0, role: "GUARD", at: SHORE },
        { seat: 1, role: "PATROL_BOAT", at: DEEP },
      ],
    });
    const view = viewForV7(state, seatV7(state, 0).id);
    const swim = move(state, SHORE, [SHALLOW]);
    // The water step is one of the policy's own candidates (not refused as
    // a landing or a Move onto hostile ice).
    expect(scoreCommandV7(view, swim).priority).toBeGreaterThan(0);
  });
});

describe("Harpoons", () => {
  const scene = (ice0: readonly TechnologyIdV7[]) =>
    arena({
      ice0,
      units: [
        { seat: 0, role: "FIGHTER", at: SHALLOW },
        { seat: 1, role: "PATROL_BOAT", at: DEEP },
      ],
      ice: [{ at: SHALLOW }],
    });

  it("a Yeti's attack on a boat has +1 Attack, in the preview and the result", () => {
    const view = (state: GameStateV7) => viewForV7(state, seatV7(state, 0).id);
    const yeti = (state: GameStateV7) => navalUnitAtV7(state, SHALLOW).id;
    const boat = (state: GameStateV7) => navalUnitAtV7(state, DEEP).id;
    const plain = scene(RIME);
    const sharp = scene(HARPOONS);
    const before = queryCombatPreviewV7(view(plain), yeti(plain), boat(plain));
    const after = queryCombatPreviewV7(view(sharp), yeti(sharp), boat(sharp));
    if (before === null || after === null) throw new Error("no preview");
    expect(before.harpoon).toBe(false);
    expect(after.harpoon).toBe(true);
    expect(after.attack2 - before.attack2).toBe(2);
    expect(after.damageToDefender).toBeGreaterThan(before.damageToDefender);
    const result = acceptV7(sharp, 0, attack(sharp, SHALLOW, DEEP));
    const resolved = result.events.find(
      (event) => event.kind === "COMBAT_RESOLVED",
    );
    if (resolved?.kind !== "COMBAT_RESOLVED") throw new Error("no combat");
    expect(resolved.preview.harpoon).toBe(true);
    expect(resolved.preview.damageToDefender).toBe(after.damageToDefender);
    expect(navalUnitV7(result.state, boat(sharp)).hp).toBe(
      navalUnitV7(sharp, boat(sharp)).hp - after.damageToDefender,
    );
  });

  it("never against a land unit, nor for another faction", () => {
    const land = arena({
      ice0: HARPOONS,
      units: [
        { seat: 0, role: "FIGHTER", at: SHORE },
        { seat: 1, role: "FIGHTER", at: { x: 1, y: 2 } },
      ],
    });
    const preview = queryCombatPreviewV7(
      viewForV7(land, seatV7(land, 0).id),
      navalUnitAtV7(land, SHORE).id,
      navalUnitAtV7(land, { x: 1, y: 2 }).id,
    );
    expect(preview?.harpoon).toBe(false);
  });
});

describe("the Ice Fortress", () => {
  // (6, 3) and (5, 3) are seat 0's water beside its capital.
  const HOLE: CoordV7 = { x: 6, y: 3 };
  const SECOND: CoordV7 = { x: 5, y: 3 };
  const built = (
    ice0: readonly TechnologyIdV7[],
    units: FrozenArenaOptionsV7["units"] = [],
  ): GameStateV7 =>
    withFishingHolesV7(
      arena({
        ice0,
        units,
        ice: [{ at: HOLE }, { at: SECOND }],
      }),
      [HOLE, SECOND],
    );
  const fortress = (at: CoordV7): CommandV7 => ({
    kind: "BUILD_ICE_FORTRESS",
    at,
  });
  const contribution = (state: GameStateV7, at: CoordV7) =>
    state.populationContributions.find(
      (entry) =>
        entry.source.kind === "IMPROVEMENT" &&
        entry.source.at.x === at.x &&
        entry.source.at.y === at.y,
    );

  it("upgrades an own Fishing Hole in place for 5 Coins: 2 population (3 with Under the Ice)", () => {
    const state = built(FORTRESS);
    expect(offered(state)).toContainEqual(fortress(HOLE));
    const coins = seatV7(state, 0).coins;
    const result = acceptV7(state, 0, fortress(HOLE));
    expect(
      result.state.board.tiles.find(
        (tile) => tile.at.x === HOLE.x && tile.at.y === HOLE.y,
      )?.improvement,
    ).toBe("ICE_FORTRESS");
    expect(seatV7(result.state, 0).coins).toBe(coins - 5);
    expect(result.events[0]).toMatchObject({
      kind: "ECONOMIC_BUILDING_BUILT",
      improvement: "ICE_FORTRESS",
      cost: 5,
      populationContribution: 1,
    });
    expect(contribution(result.state, HOLE)?.amount).toBe(2);
    expect(contribution(result.state, SECOND)?.amount).toBe(1);
    const under = built([...FORTRESS, "SEAMANSHIP", "SUBMERSIBLES"]);
    expect(contribution(under, SECOND)?.amount).toBe(2);
    expect(
      contribution(acceptV7(under, 0, fortress(HOLE)).state, HOLE)?.amount,
    ).toBe(3);
  });

  it("is one per city, only on an active own Fishing Hole, and needs Naval Engineering", () => {
    const state = built(FORTRESS);
    const first = settled(acceptV7(state, 0, fortress(HOLE)).state);
    expect(rejectV7(first, 0, fortress(SECOND)).code).toBe(
      "CITY_BUILDING_LIMIT",
    );
    expect(offered(first)).not.toContainEqual(fortress(SECOND));
    // Not on plain ice, and not without the technology.
    const plain = arena({ ice0: FORTRESS, units: [], ice: [{ at: HOLE }] });
    expect(rejectV7(plain, 0, fortress(HOLE)).code).toBe("INVALID_TILE");
    expect(rejectV7(built(PACK_ICE), 0, fortress(HOLE))).toEqual({
      code: "TECH_REQUIRED",
      params: { tech: "NAVAL_ENGINEERING" },
    });
    // Another faction never builds one.
    const humans = frozenArenaV7({
      factions: ["ORIGINAL", "ICE_FOLK"],
      technologies: [ALL, ALL],
      units: [],
    });
    expect(
      offered(humans).some((command) => command.kind === "BUILD_ICE_FORTRESS"),
    ).toBe(false);
  });

  it("a Snow Hunter on it is fortified and shoots 3 tiles", () => {
    const TARGET: CoordV7 = { x: 6, y: 6 };
    const scene = (upgrade: boolean) => {
      let state = built(FORTRESS, [
        { seat: 0, role: "MARKSMAN", at: { x: 7, y: 2 } },
        { seat: 1, role: "PATROL_BOAT", at: TARGET },
      ]);
      if (upgrade) state = settled(acceptV7(state, 0, fortress(HOLE)).state);
      return placed(state, { x: 7, y: 2 }, HOLE);
    };
    const onHole = scene(false);
    expect(rejectV7(onHole, 0, attack(onHole, HOLE, TARGET)).code).toBe(
      "TARGET_OUT_OF_RANGE",
    );
    const onFortress = scene(true);
    const hunter = navalUnitAtV7(onFortress, HOLE);
    expect(fortificationLevelForUnitV7(onFortress, hunter)).toBe(1);
    expect(
      fortificationLevelForUnitV7(onHole, navalUnitAtV7(onHole, HOLE)),
    ).toBe(0);
    expect(offered(onFortress)).toContainEqual(
      attack(onFortress, HOLE, TARGET),
    );
    const preview = queryCombatPreviewV7(
      viewForV7(onFortress, seatV7(onFortress, 0).id),
      hunter.id,
      navalUnitAtV7(onFortress, TARGET).id,
    );
    expect(preview?.maximumRange).toBe(3);
    acceptV7(onFortress, 0, attack(onFortress, HOLE, TARGET));
    // The Humans' boat sees the Hunter fortified (its public preview).
    const theirs = turnOf(placed(onFortress, TARGET, { x: 6, y: 4 }), 1);
    const back = queryCombatPreviewV7(
      viewForV7(theirs, seatV7(theirs, 1).id),
      navalUnitAtV7(theirs, { x: 6, y: 4 }).id,
      hunter.id,
    );
    expect(back?.fortificationLevel).toBe(1);
  });

  it("the Normal AI builds it, on the hole that faces a hostile ship", () => {
    // A Human boat at (7, 4) is one tile from HOLE and two from SECOND.
    const state = built(FORTRESS, [
      { seat: 1, role: "PATROL_BOAT", at: { x: 7, y: 4 } },
    ]);
    const view = viewForV7(state, seatV7(state, 0).id);
    const near = scoreCommandV7(view, fortress(HOLE));
    const far = scoreCommandV7(view, fortress(SECOND));
    const rank = (score: typeof near): readonly number[] => [
      score.priority,
      score.strategicValue,
      score.immediateValue,
      score.futureValue,
      score.safetyValue,
      score.objectiveValue,
    ];
    expect(near.priority).toBeGreaterThan(0);
    const first = rank(near).findIndex(
      (value, index) => value !== rank(far)[index],
    );
    expect(first).toBeGreaterThanOrEqual(0);
    expect(rank(near)[first]).toBeGreaterThan(rank(far)[first] ?? 0);
  });
});

describe("Under the Ice and the dive", () => {
  const holes = (ice0: readonly TechnologyIdV7[]) =>
    withFishingHolesV7(
      arena({
        ice0,
        terrain: DIVE_TERRAIN_V7,
        ports: [false, true],
        units: [{ seat: 0, role: "FIGHTER", at: { x: 4, y: 1 } }],
        ice: [{ at: { x: 4, y: 1 } }, { at: { x: 6, y: 3 } }],
      }),
      [
        { x: 4, y: 1 },
        { x: 6, y: 3 },
      ],
    );

  it("refuses the dive without Under the Ice and accepts it with it", () => {
    const without = holes(RIME);
    expect(
      rejectV7(without, 0, move(without, { x: 4, y: 1 }, [{ x: 6, y: 3 }]))
        .code,
    ).toBe("MOVEMENT_ILLEGAL");
    const withIt = holes(ALL);
    const dived = acceptV7(
      withIt,
      0,
      move(withIt, { x: 4, y: 1 }, [{ x: 6, y: 3 }]),
    );
    expect(navalUnitAtV7(dived.state, { x: 6, y: 3 }).role).toBe("FIGHTER");
  });
});

describe("one Crack breaks any ice, and a captured dock stays a plain dock", () => {
  it("breaks the Ice Folk ice in one Crack whatever they researched", () => {
    const state = frozenArenaV7({
      factions: ["ORIGINAL", "ICE_FOLK"],
      technologies: [ALL, ALL],
      units: [{ seat: 0, role: "FIGHTER", at: SHORE }],
      ice: [{ at: SHALLOW, seat: 1 }],
    });
    const result = acceptV7(state, 0, {
      kind: "CRACK_ICE",
      unitId: navalUnitAtV7(state, SHORE).id,
      at: SHALLOW,
    });
    expect(iceEntryV7(result.state, SHALLOW)).toBeUndefined();
  });

  it("a Cold Snap beside an Ice Folk Port leaves it open water, and Under the Ice adds to its population", () => {
    const PORT: CoordV7 = { x: 4, y: 3 };
    const role: UnitRoleIdV7 = "CAPTAIN";
    const state = arena({
      ice0: [...ALL, "GATHERING", "ADMINISTRATION"],
      units: [{ seat: 0, role, at: { x: 4, y: 2 } }],
    });
    const port = () =>
      state.board.tiles.find(
        (tile) => tile.at.x === PORT.x && tile.at.y === PORT.y,
      );
    expect(port()?.improvement).toBe("PORT");
    const snapped = acceptV7(state, 0, {
      kind: "COLD_SNAP",
      unitId: navalUnitAtV7(state, { x: 4, y: 2 }).id,
    });
    expect(iceEntryV7(snapped.state, PORT)).toBeUndefined();
    expect(
      snapped.state.board.tiles.find(
        (tile) => tile.at.x === PORT.x && tile.at.y === PORT.y,
      )?.improvement,
    ).toBe("PORT");
    // Its water neighbours are ice.
    expect(iceEntryV7(snapped.state, { x: 3, y: 3 })).toBeDefined();
    // A dock of an Ice Folk seat with Under the Ice gives 1 + 1.
    const dock = snapped.state.populationContributions.find(
      (entry) =>
        entry.source.kind === "IMPROVEMENT" &&
        entry.source.at.x === PORT.x &&
        entry.source.at.y === PORT.y,
    );
    expect(dock?.amount).toBe(2);
  });
});
