import { describe, expect, it } from "vitest";
import {
  TECHNOLOGY_IDS_V7,
  UNIT_ROLE_IDS_V7,
  WRECK_COINS_V7,
  applyCommandV7,
  effectiveRoleRuleV7,
  isEggLaidRoleV7,
  parseGameStateV7,
  playerIncomeV7,
  queryCombatPreviewV7,
  roleMechanicsV7,
  queryPlayerCommandsV7,
  queryUnitStatsV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type FactionIdV7,
  type GameStateV7,
  type TechnologyIdV7,
  type UnitRoleAbilityV7,
  type UnitRoleIdV7,
} from "../../src/engine/index";
import {
  frozenArenaV7,
  patchFrozenUnitV7,
  type FrozenIceV7,
  type FrozenUnitV7,
} from "../fixtures/v7-frozen-sea";
import {
  NAVAL_ARENA_CAPITALS_V7,
  NAVAL_TECHS_V7,
  acceptV7,
  navalUnitAtV7,
  navalUnitV7,
  rejectV7,
  seatV7,
} from "../fixtures/v7-naval-branch";
import { idleRecoveryOfV7 } from "../fixtures/v7-builders";

// `pulp_wars-5ti.11` (`7r45`): one focused test per interaction row of the
// frozen sea that the fold (`pulp_wars-5ti.9`) could only state from the
// code (docs/product/RULESET_7_CURRENT.md section 21.16), and the rule fix
// of the bead: a unit on ice has no fortification, so a Dwarf never digs in
// there.

const ALL: readonly TechnologyIdV7[] = TECHNOLOGY_IDS_V7;
const roleWith = (
  faction: FactionIdV7,
  ability: UnitRoleAbilityV7,
): UnitRoleIdV7 => {
  const role = UNIT_ROLE_IDS_V7.find((candidate) =>
    effectiveRoleRuleV7(candidate, faction).abilities.includes(ability),
  );
  if (role === undefined) throw new Error(`${faction} has no ${ability}`);
  return role;
};
/** Seat 0 is `faction`; seat 1 is Ice Folk and owns the ice by default. */
const scene = (
  faction: FactionIdV7,
  units: readonly FrozenUnitV7[],
  ice: readonly (CoordV7 | FrozenIceV7)[],
  technologies: readonly TechnologyIdV7[] = ALL,
): GameStateV7 =>
  frozenArenaV7({
    factions: [faction, "ICE_FOLK"],
    technologies: [technologies, ALL],
    units,
    ice: ice.map((entry): FrozenIceV7 =>
      "at" in entry ? entry : { at: entry, seat: 1 },
    ),
  });
const offered = (state: GameStateV7, seat: 0 | 1): readonly CommandV7[] =>
  queryPlayerCommandsV7(viewForV7(state, seatV7(state, seat).id));
const END: CommandV7 = { kind: "END_TURN" };
/** Seat 0 ends its turn, then seat 1: seat 0's next Start Turn. */
const round = (state: GameStateV7) => {
  const mine = acceptV7(state, 0, END);
  const theirs = acceptV7(mine.state, 1, END);
  return { state: theirs.state, events: [...mine.events, ...theirs.events] };
};
const checked = (state: GameStateV7): GameStateV7 => {
  const parsed = parseGameStateV7(state);
  if (parsed === null) throw new Error("the state is invalid");
  return parsed;
};
const same = (left: CoordV7, right: CoordV7): boolean =>
  left.x === right.x && left.y === right.y;
const withTile = (
  state: GameStateV7,
  at: CoordV7,
  patch: Partial<GameStateV7["board"]["tiles"][number]>,
): GameStateV7 =>
  checked({
    ...state,
    board: {
      ...state.board,
      tiles: state.board.tiles.map((tile) =>
        same(tile.at, at) ? { ...tile, ...patch } : tile,
      ),
    },
  });

const CAPITAL = NAVAL_ARENA_CAPITALS_V7[0];
/** Water next to seat 0's capital (5, 2), in its territory. */
const HOME_ICE: CoordV7 = { x: 5, y: 3 };
const SHORE: CoordV7 = { x: 2, y: 2 };
const ICE1: CoordV7 = { x: 2, y: 3 };
const ICE2: CoordV7 = { x: 2, y: 4 };
const ICE3: CoordV7 = { x: 2, y: 5 };

describe("no fortification on ice (section 21.16; the 7r45 Dig In fix)", () => {
  it.each(["DIG_IN", "TUNNEL"] as const)(
    "a Dwarf unit with %s standing still on ice next to its own center is not dug in",
    (ability) => {
      const role = roleWith("DWARF", ability);
      const build = (at: CoordV7) =>
        scene(
          "DWARF",
          [
            { seat: 0, role, at },
            { seat: 1, role: "MARKSMAN", at: { x: 6, y: 4 } },
          ],
          [HOME_ICE, { x: 6, y: 4 }],
        );
      const facts = (built: GameStateV7, at: CoordV7) => {
        // The opponent's turn: the unit did not move on its own turn.
        const state = acceptV7(built, 0, END).state;
        const unit = navalUnitAtV7(state, at);
        const hunter = navalUnitAtV7(state, { x: 6, y: 4 });
        // The opponent's view: the public stat and the exact preview.
        const view = viewForV7(state, seatV7(state, 1).id);
        const stats = queryUnitStatsV7(view, unit.id);
        return {
          moved: unit.activation.moved,
          dugIn: stats?.dwarf?.dugIn,
          terms: JSON.stringify(stats?.stats ?? []).includes("DIG_IN"),
          preview: queryCombatPreviewV7(view, hunter.id, unit.id)?.dugIn,
        };
      };
      // On land next to the center: dug in, +1 Defense.
      const ashore = build({ x: 6, y: 2 });
      const land = facts(ashore, { x: 6, y: 2 });
      expect(land).toMatchObject({
        moved: false,
        dugIn: true,
        terms: true,
        preview: true,
      });
      // On the ice next to the same center: nothing.
      const frozen = build(HOME_ICE);
      const ice = facts(frozen, HOME_ICE);
      expect(ice).toEqual({
        moved: false,
        dugIn: false,
        terms: false,
        preview: false,
      });
      expect(Math.max(Math.abs(CAPITAL.x - 5), Math.abs(CAPITAL.y - 3))).toBe(
        1,
      );
    },
  );
});

describe("the Sunken Wreck under ice (section 21.16)", () => {
  const withWreck = (state: GameStateV7): GameStateV7 =>
    checked({
      ...state,
      setup: { ...state.setup, curiosities: true },
      curiosities: [{ kind: "WRECK", at: ICE3 }],
    });

  it("is salvaged by a land unit that ends a Move on it, a slide's end included, and by no ship", () => {
    // A Martian Tripod (a walker: only the Ice Folk, walkers, and flyers go
    // onto ice since `pulp_wars-y242`; a slipping Human Fighter before)
    // walks one tile of ice onto the Wreck.
    const slip = withWreck(
      scene(
        "MARTIAN",
        [
          { seat: 0, role: "CATAPULT", at: ICE2 },
          { seat: 0, role: "PATROL_BOAT", at: { x: 3, y: 5 } },
        ],
        [ICE1, ICE2, ICE3],
      ),
    );
    const walker = navalUnitAtV7(slip, ICE2);
    const coins = seatV7(slip, 0).coins;
    const walked = acceptV7(slip, 0, {
      kind: "MOVE",
      unitId: walker.id,
      path: [ICE3],
    });
    expect(walked.events).toContainEqual({
      kind: "WRECK_SALVAGED",
      playerId: seatV7(slip, 0).id,
      unitId: walker.id,
      at: ICE3,
      coins: WRECK_COINS_V7,
    });
    expect(seatV7(walked.state, 0).coins).toBe(coins + WRECK_COINS_V7);
    expect(walked.state.curiosities).toEqual([]);
    // The boat beside it cannot enter the ice, so it cannot salvage.
    const boat = navalUnitAtV7(slip, { x: 3, y: 5 });
    expect(
      rejectV7(slip, 0, { kind: "MOVE", unitId: boat.id, path: [ICE3] }),
    ).toMatchObject({ code: "MOVEMENT_ILLEGAL" });
    expect(
      offered(slip, 0).some(
        (command) =>
          command.kind === "MOVE" &&
          command.unitId === boat.id &&
          same(command.path.at(-1) as CoordV7, ICE3),
      ),
    ).toBe(false);
    // A Sled steps onto the ice (a full point from the shore) and Glides on
    // (half a point a tile; skating is plain movement since
    // `pulp_wars-ecnj`, 7r135) to its end, the Wreck.
    const slide = withWreck(
      frozenArenaV7({
        factions: ["ICE_FOLK", "ORIGINAL"],
        technologies: [ALL, ALL],
        units: [{ seat: 0, role: "RAIDER", at: SHORE }],
        ice: [ICE1, ICE2, ICE3].map((at) => ({ at, seat: 0 as const })),
      }),
    );
    const yeti = navalUnitAtV7(slide, SHORE);
    const slid = acceptV7(slide, 0, {
      kind: "MOVE",
      unitId: yeti.id,
      path: [ICE1, ICE2, ICE3],
    });
    expect(navalUnitV7(slid.state, yeti.id).at).toEqual(ICE3);
    expect(slid.events.some((event) => event.kind === "WRECK_SALVAGED")).toBe(
      true,
    );
  });
});

describe("the Dwarf Tunnel and eruption at ice (section 21.16)", () => {
  const mole = roleWith("DWARF", "TUNNEL");

  it("a tunnel never ends on ice and never passes under it", () => {
    // The islet (9, 5) is three steps from (9, 2) over (9, 3) and (9, 4).
    const state = scene(
      "DWARF",
      [{ seat: 0, role: mole, at: { x: 9, y: 2 } }],
      [
        { x: 9, y: 3 },
        { x: 9, y: 4 },
      ],
    );
    const unit = navalUnitAtV7(state, { x: 9, y: 2 });
    const tunnels = offered(state, 0).flatMap((command) =>
      command.kind === "TUNNEL" && command.unitId === unit.id
        ? [command.to]
        : [],
    );
    expect(tunnels.length).toBeGreaterThan(0);
    expect(tunnels.every((to) => to.y <= 2)).toBe(true);
    for (const to of [
      { x: 9, y: 3 },
      { x: 9, y: 5 },
    ])
      expect(
        rejectV7(state, 0, {
          kind: "TUNNEL",
          unitId: unit.id,
          to,
          rider: null,
        }),
      ).toEqual({
        code: "TUNNEL_NOT_LEGAL",
        params: { reason: "DESTINATION" },
      });
  });

  it("an eruption hits a land unit standing on ice and no ship frozen into it", () => {
    const state = scene(
      "DWARF",
      [
        { seat: 0, role: mole, at: { x: 2, y: 0 } },
        { seat: 1, role: "FIGHTER", at: ICE1 },
      ],
      [ICE1],
      ["SCOUTING", "RAIDING"],
    );
    const unit = navalUnitAtV7(state, { x: 2, y: 0 });
    const yeti = navalUnitAtV7(state, ICE1);
    const dug = acceptV7(state, 0, {
      kind: "TUNNEL",
      unitId: unit.id,
      to: SHORE,
      rider: null,
    });
    const next = round(dug.state);
    const surfaced = next.events.find(
      (event) => event.kind === "UNIT_SURFACED",
    );
    expect(surfaced).toMatchObject({
      results: [{ unitId: yeti.id, damage: 2 }],
    });
    expect(navalUnitV7(next.state, yeti.id).hp).toBe(yeti.hp - 2);
    expect(navalUnitV7(next.state, unit.id).at).toEqual(SHORE);
  });
});

describe("Dinosaur Eggs at ice (section 21.16)", () => {
  it("no Egg is laid on ice, and a Shaman standing on ice hatches an Egg ashore", () => {
    const shaman = roleWith("DINOSAUR", "HATCH");
    // Ice Folk Freeze (`pulp_wars-w49.37`): the Ice Folk seat has no Black
    // Ice here, which would leave the Shaman Frozen on its next turn.
    const state = frozenArenaV7({
      factions: ["DINOSAUR", "ICE_FOLK"],
      // Without Nesting, which would hatch the Egg within the round.
      technologies: [
        ALL.filter((tech) => tech !== "FORTIFICATION" && tech !== "EXPLOSIVES"),
        ALL.filter((tech) => tech !== "SEAMANSHIP" && tech !== "SUBMERSIBLES"),
      ],
      units: [{ seat: 0, role: shaman, at: HOME_ICE }],
      ice: [HOME_ICE, { x: 6, y: 3 }].map((at): FrozenIceV7 => ({
        at,
        seat: 1,
      })),
    });
    const lays = offered(state, 0).flatMap((command) =>
      command.kind === "LAY_EGG" ? [command] : [],
    );
    expect(lays.length).toBeGreaterThan(0);
    expect(lays.every((command) => command.at.y <= 2)).toBe(true);
    const role = UNIT_ROLE_IDS_V7.find((candidate) =>
      isEggLaidRoleV7(candidate, "DINOSAUR"),
    ) as UnitRoleIdV7;
    const cityId = (lays[0] as Extract<CommandV7, { kind: "LAY_EGG" }>).cityId;
    expect(
      rejectV7(state, 0, {
        kind: "LAY_EGG",
        cityId,
        role,
        at: { x: 6, y: 3 },
      }).code,
    ).toBe("INVALID_TILE");
    // An Egg ashore next to the Shaman on the ice.
    // A role that does not hatch by itself within the round.
    const lay = lays.find(
      (command) =>
        same(command.at, { x: 6, y: 2 }) &&
        (roleMechanicsV7(command.role, "DINOSAUR").hatchTurns ?? 0) >= 2,
    );
    if (lay === undefined) throw new Error("no nest on (6, 2)");
    const laid = acceptV7(state, 0, lay);
    const egg = navalUnitAtV7(laid.state, { x: 6, y: 2 });
    expect(egg.form).toBe("EGG");
    const next = round(laid.state);
    const priest = navalUnitAtV7(next.state, HOME_ICE);
    const hatch: CommandV7 = {
      kind: "HATCH",
      unitId: priest.id,
      eggUnitId: egg.id,
    };

    expect(offered(next.state, 0)).toContainEqual(hatch);
    const hatched = acceptV7(next.state, 0, hatch);
    expect(navalUnitV7(hatched.state, egg.id)).toMatchObject({
      form: "LAND",
      at: { x: 6, y: 2 },
    });
  });
});

describe("Candy Crumbs and Re-bake at ice (section 21.16)", () => {
  it("a Candy unit that dies on ice leaves no Crumbs, so nothing is re-baked there", () => {
    const baker = roleWith("CANDY", "REBAKE");
    const state = scene(
      "CANDY",
      [
        { seat: 0, role: "FIGHTER", at: ICE1 },
        { seat: 0, role: baker, at: SHORE },
        { seat: 1, role: "FIGHTER", at: ICE2 },
      ],
      [ICE1, ICE2],
    );
    const victim = navalUnitAtV7(state, ICE1);
    const weak = patchFrozenUnitV7(state, victim.id, { hp: 1 });
    const mine = acceptV7(weak, 0, END);
    const yeti = navalUnitAtV7(mine.state, ICE2);
    const killed = acceptV7(mine.state, 1, {
      kind: "ATTACK",
      unitId: yeti.id,
      targetUnitId: victim.id,
    });
    expect(killed.events).toContainEqual(
      expect.objectContaining({ kind: "UNIT_DIED", unitId: victim.id }),
    );
    expect(killed.state.crumbs).toEqual([]);
    expect(killed.state.graves).toEqual([]);
    const back = acceptV7(killed.state, 1, END);
    const confectioner = navalUnitAtV7(back.state, SHORE);
    expect(
      offered(back.state, 0).some((command) => command.kind === "REBAKE"),
    ).toBe(false);
    expect(
      rejectV7(back.state, 0, {
        kind: "REBAKE",
        unitId: confectioner.id,
        from: ICE1,
        at: ICE1,
      }).code,
    ).toBe("REBAKE_NOT_LEGAL");
  });
});

describe("Dwarf Assemble at ice (section 21.16)", () => {
  it("never builds a Gunner on ice; an Engineer standing on ice builds one ashore", () => {
    const engineer = roleWith("DWARF", "ASSEMBLE");
    const ashore = scene(
      "DWARF",
      [{ seat: 0, role: engineer, at: { x: 6, y: 2 } }],
      [HOME_ICE, { x: 6, y: 3 }],
    );
    const builder = navalUnitAtV7(ashore, { x: 6, y: 2 });
    const sites = offered(ashore, 0).flatMap((command) =>
      command.kind === "ASSEMBLE" && command.unitId === builder.id
        ? [command.to]
        : [],
    );
    expect(sites.length).toBeGreaterThan(0);
    expect(sites.every((to) => to.y <= 2)).toBe(true);
    expect(
      rejectV7(ashore, 0, {
        kind: "ASSEMBLE",
        unitId: builder.id,
        to: { x: 6, y: 3 },
      }),
    ).toEqual({ code: "INVALID_TILE", params: { action: "ASSEMBLE" } });
    const afloat = scene(
      "DWARF",
      [{ seat: 0, role: engineer, at: { x: 6, y: 3 } }],
      [HOME_ICE, { x: 6, y: 3 }],
    );
    const onIce = navalUnitAtV7(afloat, { x: 6, y: 3 });
    const built = acceptV7(afloat, 0, {
      kind: "ASSEMBLE",
      unitId: onIce.id,
      to: { x: 6, y: 2 },
    });
    expect(navalUnitAtV7(built.state, { x: 6, y: 2 }).form).toBe("LAND");
  });
});

describe("a mind-controlled Ice Folk unit (section 21.16)", () => {
  const brain = roleWith("MARTIAN", "MIND_CONTROL");
  /**
   * Seat 0 is Martian and controls the Yeti (or `role`) of seat 1 on the
   * shore.
   */
  const controlled = (
    technologies: readonly TechnologyIdV7[],
    ice: readonly FrozenIceV7[],
    extra: readonly FrozenUnitV7[] = [],
    role: "FIGHTER" | "CAPTAIN" = "FIGHTER",
  ): GameStateV7 => {
    const base = frozenArenaV7({
      factions: ["MARTIAN", "ICE_FOLK"],
      technologies: [technologies, ALL],
      units: [
        { seat: 0, role: brain, at: { x: 1, y: 1 } },
        { seat: 1, role, at: SHORE },
        ...extra,
      ],
      ice,
    });
    const yeti = navalUnitAtV7(base, SHORE);
    const martian = seatV7(base, 0).id;
    return checked({
      ...base,
      units: base.units.map((unit) =>
        unit.id === yeti.id
          ? {
              ...unit,
              ownerId: martian,
              homeCityId: null,
              captureEligible: false,
            }
          : unit,
      ),
      mindControlled: [
        {
          unitId: yeti.id,
          brainUnitId: navalUnitAtV7(base, { x: 1, y: 1 }).id,
          originalOwnerId: yeti.ownerId,
        },
      ],
    });
  };

  it("a controlled Witch's Cold Snap freezes with the controller's Rime, and the ice is the controller's", () => {
    // The one Freeze effect (`pulp_wars-xv0t`, 7r133): the line `FREEZE` a
    // controlled Yeti had is gone; the Witch's Cold Snap freezes her ring.
    const state = controlled(NAVAL_TECHS_V7, [], [], "CAPTAIN");
    const witch = navalUnitAtV7(state, SHORE);
    const snap: CommandV7 = { kind: "COLD_SNAP", unitId: witch.id };
    expect(offered(state, 0)).toContainEqual(snap);
    const frozen = acceptV7(state, 0, snap);
    // The frozen sea redesign: permanent, sound ice of the controller (its
    // thickness is the controller's own Glacier, which a Martian tree has
    // not): the three Shallow Water tiles south of her.
    const martian = seatV7(state, 0).id;
    expect(frozen.state.ice).toEqual([
      { at: { x: 1, y: 3 }, ownerId: martian, cracked: false },
      { at: ICE1, ownerId: martian, cracked: false },
      { at: { x: 3, y: 3 }, ownerId: martian, cracked: false },
    ]);
    // Without the controller's Rime she makes no ice, whatever her own seat
    // researched (her open land still goes to Snow).
    const bare = controlled([], [], [], "CAPTAIN");
    const cast = applyCommandV7(bare, seatV7(bare, 0).id, {
      kind: "COLD_SNAP",
      unitId: navalUnitAtV7(bare, SHORE).id,
    });
    expect(cast.accepted ? cast.state.ice : []).toEqual([]);
  });

  it("Glides on ice like every Ice Folk body (skating is plain movement, `pulp_wars-ecnj`)", () => {
    const state = controlled(
      [],
      [ICE1, ICE2, ICE3].map((at) => ({ at, seat: 1 as const })),
    );
    const yeti = navalUnitAtV7(state, SHORE);
    // From the bare shore the step onto the ice is a full one: its whole
    // Move 1 (half, a skate, before 7r135).
    acceptV7(state, 0, { kind: "MOVE", unitId: yeti.id, path: [ICE1] });
    expect(
      rejectV7(state, 0, {
        kind: "MOVE",
        unitId: yeti.id,
        path: [ICE1, ICE2],
      }),
    ).toEqual({
      code: "MOVEMENT_ILLEGAL",
      params: { reason: "BUDGET_EXCEEDED" },
    });
    // On the ice, half a Move a tile: two tiles for its Move 1.
    const onIce = patchFrozenUnitV7(state, yeti.id, { at: ICE1 });
    const glided = acceptV7(onIce, 0, {
      kind: "MOVE",
      unitId: yeti.id,
      path: [ICE2, ICE3],
    });
    expect(navalUnitV7(glided.state, yeti.id).at).toEqual(ICE3);
  });

  it("Black Ice follows the seat that owns the ice: a Martian seat has none", () => {
    // The Martian seat owns ice and has researched Seamanship (Hover Pods
    // in its tree); the Ice Folk seat owns ice with Black Ice. The frozen
    // sea redesign (`pulp_wars-5ti.25`): Black Ice freezes on entry.
    const state = controlled(
      NAVAL_TECHS_V7,
      [
        { at: { x: 7, y: 3 }, seat: 0 },
        { at: { x: 6, y: 4 }, seat: 1 },
        { at: { x: 8, y: 6 }, seat: 0 },
        { at: { x: 8, y: 7 }, seat: 1 },
      ],
      [
        { seat: 1, role: "RAIDER", at: { x: 6, y: 4 } },
        // A Tripod (a walker; a Grunt before `pulp_wars-y242`: no ground
        // unit of another kind than the Ice Folk enters ice now).
        { seat: 0, role: "CATAPULT", at: { x: 8, y: 6 } },
      ],
    );
    const grunt = navalUnitAtV7(state, { x: 8, y: 6 });
    const sled = navalUnitAtV7(state, { x: 6, y: 4 });
    // The Tripod steps from its seat's ice onto the Ice Folk ice: Frozen.
    const stepped = acceptV7(state, 0, {
      kind: "MOVE",
      unitId: grunt.id,
      path: [{ x: 8, y: 7 }],
    });
    expect(stepped.events).toContainEqual(
      expect.objectContaining({
        kind: "UNITS_FROZEN",
        source: "BLACK_ICE",
        results: [expect.objectContaining({ unitId: grunt.id })],
      }),
    );
    // The Sled steps onto the Martian ice: nothing.
    const theirs = acceptV7(acceptV7(stepped.state, 0, END).state, 1, {
      kind: "MOVE",
      unitId: sled.id,
      path: [{ x: 7, y: 3 }],
    });
    expect(
      theirs.events.some(
        (event) =>
          event.kind === "UNITS_FROZEN" && event.source === "BLACK_ICE",
      ),
    ).toBe(false);
  });
});

// The Ice Folk freeze rework (`pulp_wars-s55m.1`): no ship is ever in the
// ice; a Frozen ship is refused what a Frozen land unit is refused.
describe("a Frozen ship's Recover and Promote (section 21.3)", () => {
  it("is promoted while Frozen, and recovers idle as usual", () => {
    // (3, 3) is next to seat 0's Port on (4, 3).
    const at: CoordV7 = { x: 3, y: 3 };
    const base = scene("ORIGINAL", [{ seat: 0, role: "BATTLESHIP", at }], []);
    const ship = navalUnitAtV7(base, at);
    const hurt = patchFrozenUnitV7(base, ship.id, { hp: 10, kills: 3 });
    const frozen = parseGameStateV7({
      ...hurt,
      frozen: [{ unitId: ship.id, turnsLeft: 1 }],
    });
    if (frozen === null) throw new Error("invalid");
    expect(
      queryUnitStatsV7(viewForV7(frozen, seatV7(frozen, 0).id), ship.id)
        ?.frozen,
    ).toEqual({ turnsLeft: 1 });
    // `pulp_wars-3u8d` (7r131): no Recover command (it was refused while
    // Frozen); idle recovery heals it as usual (section 21.3).
    expect(idleRecoveryOfV7(hurt, ship.id)).not.toBeNull();
    expect(idleRecoveryOfV7(frozen, ship.id)).toEqual(
      idleRecoveryOfV7(hurt, ship.id),
    );
    const promoted = acceptV7(frozen, 0, { kind: "PROMOTE", unitId: ship.id });
    expect(navalUnitV7(promoted.state, ship.id)).toMatchObject({
      veteran: true,
      hp: ship.maxHp + 5,
      at,
    });
  });
});

describe("fishing, Pearls, and Port income under ice (section 21.16)", () => {
  it("Fish and Pearls under ice are harvested as on open water, and the ice stays", () => {
    const pearls: CoordV7 = { x: 6, y: 3 };
    const build = (ice: readonly CoordV7[]) =>
      withTile(
        withTile(scene("ORIGINAL", [], ice), HOME_ICE, { resource: "FISH" }),
        pearls,
        { resource: "PEARLS" },
      );
    const open = build([]);
    const frozen = build([HOME_ICE, pearls]);
    const economic = (state: GameStateV7) =>
      offered(state, 0).filter(
        (command) =>
          command.kind === "HARVEST_FISH" || command.kind === "GATHER_PEARLS",
      );
    expect(economic(open)).toEqual([
      { kind: "HARVEST_FISH", at: HOME_ICE },
      { kind: "GATHER_PEARLS", at: pearls },
    ]);
    expect(economic(frozen)).toEqual(economic(open));
    let state = frozen;
    for (const command of economic(frozen)) {
      const before = seatV7(state, 0).coins;
      const done = acceptV7(state, 0, command);
      const plain = acceptV7(open, 0, command);
      expect(seatV7(done.state, 0).coins - before).toBe(
        seatV7(plain.state, 0).coins - seatV7(open, 0).coins,
      );
      state = done.state;
    }
    expect(state.ice.map((entry) => entry.at)).toEqual([HOME_ICE, pearls]);
    expect(state.board.tiles.filter((tile) => tile.resource !== null)).toEqual(
      [],
    );
  });

  it("a Port ringed by ice keeps its population and income", () => {
    const ring: readonly CoordV7[] = [
      { x: 3, y: 3 },
      { x: 5, y: 3 },
      { x: 3, y: 4 },
      { x: 4, y: 4 },
      { x: 5, y: 4 },
    ];
    const open = scene("ORIGINAL", [], []);
    const frozen = scene("ORIGINAL", [], ring);
    const id = seatV7(open, 0).id;
    expect(playerIncomeV7(frozen, id)).toEqual(playerIncomeV7(open, id));
    expect(viewForV7(frozen, id).naval).toEqual(viewForV7(open, id).naval);
    expect(frozen.cities).toEqual(open.cities);
  });
});

describe("a Submarine next to ice (section 21.16)", () => {
  it("cannot enter ice, cannot torpedo a unit standing on it, and is attacked from the ice only at distance 1", () => {
    const sub: CoordV7 = { x: 3, y: 4 };
    const state = scene(
      "ORIGINAL",
      [
        { seat: 0, role: "SUBMARINE", at: sub },
        { seat: 1, role: "FIGHTER", at: ICE2 },
        { seat: 1, role: "MARKSMAN", at: { x: 1, y: 4 } },
      ],
      [ICE1, ICE2, { x: 1, y: 4 }, { x: 3, y: 3 }],
    );
    const boat = navalUnitAtV7(state, sub);
    const yeti = navalUnitAtV7(state, ICE2);
    const hunter = navalUnitAtV7(state, { x: 1, y: 4 });
    expect(
      rejectV7(state, 0, {
        kind: "MOVE",
        unitId: boat.id,
        path: [{ x: 3, y: 3 }],
      }).code,
    ).toBe("MOVEMENT_ILLEGAL");
    expect(
      rejectV7(state, 0, {
        kind: "ATTACK",
        unitId: boat.id,
        targetUnitId: yeti.id,
      }),
    ).toEqual({ code: "ATTACK_NOT_LEGAL", params: { reason: "NOT_AFLOAT" } });
    expect(
      offered(state, 0).some(
        (command) => command.kind === "ATTACK" && command.unitId === boat.id,
      ),
    ).toBe(false);
    const theirs = acceptV7(state, 0, END).state;
    const attacks = offered(theirs, 1).flatMap((command) =>
      command.kind === "ATTACK" && command.targetUnitId === boat.id
        ? [command.unitId]
        : [],
    );
    // The Yeti beside it may strike; the Snow Hunter two tiles away not.
    expect(attacks).toEqual([yeti.id]);
    expect(
      rejectV7(theirs, 1, {
        kind: "ATTACK",
        unitId: hunter.id,
        targetUnitId: boat.id,
      }).code,
    ).toBe("TARGET_OUT_OF_RANGE");
    const hit = acceptV7(theirs, 1, {
      kind: "ATTACK",
      unitId: yeti.id,
      targetUnitId: boat.id,
    });
    expect(navalUnitV7(hit.state, boat.id).hp).toBeLessThan(boat.hp);
  });
});
