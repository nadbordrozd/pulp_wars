import { describe, expect, it } from "vitest";
import {
  chooseNormalCommandV7,
  publicDangerForPolicyV7,
  publicStandTilesForPolicyV7,
  scoreCommandV7,
} from "../../src/ai/v7";
import {
  ICE_BRIDGE_FREEZE_PRIORITY_V7,
  ICE_CRACK_FREE_PRIORITY_V7,
  ICE_CRACK_HOME_PRIORITY_V7,
  ICE_CRACK_LANE_PRIORITY_V7,
  ICE_HOME_FREEZE_PRIORITY_V7,
  ICE_SEA_DUE_RESEARCH_PRIORITY_V7,
  iceCrackScoreV7,
  iceCrackedOpenTilesV7,
  iceFreezeScoreV7,
  iceSeaPlanV7,
  iceSeaResearchV7,
  type FrozenSeaToolsV7,
} from "../../src/ai/v7-frozen-sea";
import {
  parseGameStateV7,
  previewCrackIceV7,
  previewEconomicV7,
  queryPublicEconomicPotentialsV7,
  queryPlayerCommandsV7,
  unitIsIceboundV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type DomainEventV7,
  type GameStateV7,
  type PlayerViewV7,
  type TechnologyIdV7,
  type UnitId,
} from "../../src/engine/index";
import {
  frozenArenaV7,
  iceEntryV7,
  lineV7,
  type FrozenArenaOptionsV7,
  type FrozenIceV7,
} from "../fixtures/v7-frozen-sea";
import {
  ICE_AI_PIN_MAP_TYPES_V7,
  iceAiPinStateV7,
  iceAiPinTraceV7,
} from "../fixtures/v7-ice-ai-pins";
import {
  acceptV7,
  navalUnitAtV7,
  navalUnitV7,
  patchNavalUnitV7,
  seatV7,
} from "../fixtures/v7-naval-branch";
import pins from "../fixtures/v7-ice-ai-no-ice-folk-decisions.json";

// The frozen sea redesign, the AI (`pulp_wars-5ti.26`,
// docs/product/RULESET_7_ICE_REDESIGN.md section 3 and section 6, bead B):
// the Normal AI for and against permanent ice, on the authored strait of
// `v7-naval-branch.ts` (rows 0 to 2 and 8 to 10 land, rows 3 and 7 Shallow
// Water, rows 4 to 6 Deep Water, the islet on (9, 5); seat 0's capital on
// (5, 2) with the 3 x 3 footprint x 4 to 6, y 1 to 3, seat 1's on (5, 8),
// Ports on (4, 3) and (6, 7)). No test plays a turn or a match: each asks
// the policy for a decision on a hand-built state and checks it against the
// engine's previews and events.

const RIME: readonly TechnologyIdV7[] = ["SHORECRAFT"];
const PACK_ICE: readonly TechnologyIdV7[] = [...RIME, "NAVIGATION"];
const ICEBOUND: readonly TechnologyIdV7[] = [...PACK_ICE, "NAVAL_ENGINEERING"];
const BLACK_ICE: readonly TechnologyIdV7[] = [...ICEBOUND, "SEAMANSHIP"];
const GLACIER: readonly TechnologyIdV7[] = [...BLACK_ICE, "SUBMERSIBLES"];
const MILLING: readonly TechnologyIdV7[] = [
  ...RIME,
  "GATHERING",
  "FARMING",
  "MILLING",
];

/** The crossing the plan picks with Pack Ice: the column on x = 3. */
const COLUMN: readonly CoordV7[] = lineV7({ x: 3, y: 2 }, 0, 1, 5);
const WEST: CoordV7 = { x: 4, y: 3 };
const MIDDLE: CoordV7 = { x: 5, y: 3 };
const EAST: CoordV7 = { x: 6, y: 3 };

const viewOf = (state: GameStateV7, seat: 0 | 1 = 0): PlayerViewV7 =>
  viewForV7(state, seatV7(state, seat).id);

/** The same position on `seat`'s turn. */
function turnOf(state: GameStateV7, seat: 0 | 1): GameStateV7 {
  const parsed = parseGameStateV7({
    ...state,
    activeSeatIndex: state.turnOrder.indexOf(seatV7(state, seat).id),
  });
  if (parsed === null) throw new Error("the turn state is invalid");
  return parsed;
}

function scene(
  options: FrozenArenaOptionsV7,
  seat: 0 | 1 = 0,
): { readonly state: GameStateV7; readonly view: PlayerViewV7 } {
  const state = frozenArenaV7(options);
  return { state, view: viewOf(state, seat) };
}

const idAt = (state: GameStateV7, at: CoordV7): UnitId =>
  navalUnitAtV7(state, at).id;

const same = (left: CoordV7, right: CoordV7): boolean =>
  left.x === right.x && left.y === right.y;

/** The tools of the policy for the tests that call a rule directly. */
function toolsOf(view: PlayerViewV7): FrozenSeaToolsV7 {
  return {
    isHostile: (ownerId) => ownerId !== view.viewer.id,
    isAllied: () => false,
    danger: (inView, unit, at) => publicDangerForPolicyV7(inView, unit, at),
    standTiles: (hostile) => publicStandTilesForPolicyV7(view, hostile),
    objective: () => undefined,
    commands: queryPlayerCommandsV7(view),
    route: () => null,
    plannedThrough: () => false,
  };
}

const candidates = (view: PlayerViewV7) =>
  chooseNormalCommandV7(view).candidates;

/** The best candidate of one unit, or undefined when it has none. */
function bestOf(view: PlayerViewV7, unitId: UnitId) {
  return candidates(view).find(
    (item) => "unitId" in item.command && item.command.unitId === unitId,
  );
}

const crack = (
  unitId: UnitId,
  at: CoordV7,
): Extract<CommandV7, { kind: "CRACK_ICE" }> => ({
  kind: "CRACK_ICE",
  unitId,
  at,
});

function eventOf<K extends DomainEventV7["kind"]>(
  events: readonly DomainEventV7[],
  kind: K,
): Extract<DomainEventV7, { kind: K }> {
  const event = events.find((entry) => entry.kind === kind);
  if (event === undefined) throw new Error(`no ${kind}`);
  return event as Extract<DomainEventV7, { kind: K }>;
}

const column = (count: number): readonly FrozenIceV7[] =>
  COLUMN.slice(0, count).map((at) => ({ at }));

describe("the Ice Folk seat: a crossing is built once", () => {
  it("rebuilds a tile a Crack broke out of its crossing with the crossing's own Freeze", () => {
    // The crossing (3, 3) to (3, 7) with (3, 5) cracked open; the builder
    // stands on the ice before the gap (no Coins for home ice).
    const { state, view } = scene({
      technologies: [PACK_ICE, PACK_ICE],
      coins: [0, 60],
      units: [{ seat: 0, role: "FIGHTER", at: { x: 3, y: 4 } }],
      ice: [...column(2), ...COLUMN.slice(3).map((at) => ({ at }))],
    });
    const builder = idAt(state, { x: 3, y: 4 });
    const plan = iceSeaPlanV7(view, toolsOf(view));
    expect(plan).toMatchObject({
      crossing: COLUMN,
      next: 2,
      stand: { x: 3, y: 4 },
      builders: [builder],
    });
    const best = bestOf(view, builder);
    expect(best?.command).toEqual({
      kind: "FREEZE",
      unitId: builder,
      at: { x: 3, y: 5 },
    });
    expect(best?.score.priority).toBe(ICE_BRIDGE_FREEZE_PRIORITY_V7);
    const result = acceptV7(state, 0, best?.command as CommandV7);
    expect(eventOf(result.events, "WATER_FROZEN").tiles).toEqual([
      { x: 3, y: 5 },
    ]);
    // Complete again: nobody freezes it any more (the old refreeze is gone).
    const after = viewOf(result.state);
    expect(iceSeaPlanV7(after, toolsOf(after))?.complete).toBe(true);
    expect(
      candidates(after).filter((item) => item.command.kind === "FREEZE"),
    ).toEqual([]);
  });
});

describe("the Ice Folk seat builds its economy on the ice", () => {
  it("freezes own-territory water for a Fishing Hole, then cuts the Fishing Hole there", () => {
    // The Yeti beside the capital is the crossing's builder; the garrison
    // is free for home ice.
    const { state, view } = scene({
      technologies: [RIME, RIME],
      ports: [false, true],
      units: [{ seat: 0, role: "FIGHTER", at: { x: 6, y: 1 } }],
    });
    const garrison = idAt(state, { x: 5, y: 2 });
    const freeze = candidates(view).find(
      (item) =>
        item.command.kind === "FREEZE" && item.command.unitId === garrison,
    );
    expect(freeze?.score.priority).toBe(ICE_HOME_FREEZE_PRIORITY_V7);
    const command = freeze?.command as Extract<CommandV7, { kind: "FREEZE" }>;
    const scored = iceFreezeScoreV7(
      view,
      toolsOf(view),
      iceSeaPlanV7(view, toolsOf(view)),
      command,
    );
    expect(scored?.reason).toBe("HOME");
    // No Fishing Hole is on offer before the Freeze.
    const frozen = acceptV7(state, 0, command);
    const tiles = eventOf(frozen.events, "WATER_FROZEN").tiles;
    expect(tiles).toEqual(scored?.preview.tiles);
    const site = tiles.find((at) =>
      [WEST, MIDDLE, EAST].some((t) => same(t, at)),
    );
    if (site === undefined) throw new Error("no home tile frozen");
    const hole: CommandV7 = { kind: "BUILD_FISHING_HOLE", at: site };
    expect(queryPlayerCommandsV7(view)).not.toContainEqual(hole);
    // The economic chooser takes it: +1 population for 3 Coins.
    const after = viewOf(frozen.state);
    const built = candidates(after).find(
      (item) =>
        item.command.kind === "BUILD_FISHING_HOLE" &&
        same(item.command.at, site),
    );
    expect(built?.score.priority).toBeGreaterThanOrEqual(1140);
    // The preview's +1 (the redesign's preview fix) is the build's.
    const preview = previewEconomicV7(after, hole);
    if (!preview.ok) throw new Error("no preview");
    const population = (at: GameStateV7): number =>
      at.cities.find((city) => city.ownerId === seatV7(at, 0).id)
        ?.economicPopulation ?? -1;
    const result = acceptV7(frozen.state, 0, hole);
    expect(eventOf(result.events, "ECONOMIC_BUILDING_BUILT")).toMatchObject({
      improvement: "FISHING_HOLE",
    });
    expect(preview.preview.populationDeltaByCity).toEqual([
      {
        cityId: preview.preview.ownerCityId,
        delta: population(result.state) - population(frozen.state),
      },
    ]);
    expect(population(result.state) - population(frozen.state)).toBe(1);
    // Without the Coins for a building there is no reason to freeze it.
    const broke = scene({
      technologies: [RIME, RIME],
      ports: [false, true],
      coins: [0, 60],
      units: [{ seat: 0, role: "FIGHTER", at: { x: 6, y: 1 } }],
    });
    expect(
      iceFreezeScoreV7(
        broke.view,
        toolsOf(broke.view),
        iceSeaPlanV7(broke.view, toolsOf(broke.view)),
        command,
      ),
    ).toBeNull();
  });

  it("plans a Fishing Hole on every water tile of its territory; no other seat plans one", () => {
    // The capital's waters (4, 3), (5, 3), (6, 3): one of them ice already.
    const ice = scene({
      technologies: [[], RIME],
      ports: [false, true],
      units: [],
      ice: [{ at: MIDDLE }],
    });
    expect(
      queryPublicEconomicPotentialsV7(ice.view).find(
        (potential) => potential.command === "BUILD_FISHING_HOLE",
      )?.targets,
    ).toBe(3);
    const human = scene({
      factions: ["ORIGINAL", "ICE_FOLK"],
      technologies: [[], RIME],
      ports: [false, true],
      units: [],
    });
    expect(
      queryPublicEconomicPotentialsV7(human.view).map(
        (potential) => potential.command,
      ),
    ).not.toContain("BUILD_FISHING_HOLE");
  });

  it("takes another seat's ice in its territory to build on it", () => {
    // Ice of the Human seat (a captor's, say) in the capital's waters.
    const { state, view } = scene({
      technologies: [RIME, RIME],
      ports: [false, true],
      units: [{ seat: 0, role: "FIGHTER", at: { x: 6, y: 1 } }],
      ice: [{ at: EAST, seat: 1 }],
    });
    const command: Extract<CommandV7, { kind: "FREEZE" }> = {
      kind: "FREEZE",
      unitId: idAt(state, { x: 5, y: 2 }),
      at: EAST,
    };
    const scored = iceFreezeScoreV7(
      view,
      toolsOf(view),
      iceSeaPlanV7(view, toolsOf(view)),
      command,
    );
    expect(scored).toMatchObject({
      reason: "HOME",
      priority: ICE_HOME_FREEZE_PRIORITY_V7,
    });
    expect(scored?.preview.taken).toEqual([EAST]);
    const result = acceptV7(state, 0, command);
    expect(iceEntryV7(result.state, EAST)?.ownerId).toBe(seatV7(state, 0).id);
    expect(queryPlayerCommandsV7(viewOf(result.state))).toContainEqual({
      kind: "BUILD_FISHING_HOLE",
      at: EAST,
    });
  });

  it("builds an Ice Harbour on its ice through the economic chooser", () => {
    const { state, view } = scene({
      technologies: [RIME, RIME],
      ports: [false, true],
      units: [],
      ice: [{ at: MIDDLE }],
    });
    const port: CommandV7 = { kind: "BUILD_PORT", at: MIDDLE };
    const offered = candidates(view).find(
      (item) =>
        item.command.kind === "BUILD_PORT" && same(item.command.at, MIDDLE),
    );
    expect(offered?.score.priority).toBeGreaterThanOrEqual(1140);
    const result = acceptV7(state, 0, port);
    expect(eventOf(result.events, "PORT_BUILT")).toMatchObject({
      at: MIDDLE,
      iceMade: false,
    });
    expect(iceEntryV7(result.state, MIDDLE)?.ownerId).toBe(seatV7(state, 0).id);
  });

  it("puts its Windmill on the ice between a Fishing Hole and a Farm", () => {
    const resources = Array.from({ length: 11 }, (_, y) =>
      y === 2 ? "......e...." : "...........",
    );
    const base = frozenArenaV7({
      ports: [false, true],
      technologies: [MILLING, RIME],
      units: [],
      resources,
      improvements: [{ at: { x: 6, y: 2 }, improvement: "FARM" }],
      ice: [{ at: WEST }, { at: MIDDLE }],
    });
    const state = acceptV7(base, 0, {
      kind: "BUILD_FISHING_HOLE",
      at: WEST,
    }).state;
    const view = viewOf(state);
    // Every Windmill on offer, the policy's first is the one on the ice:
    // it counts the Fishing Hole and the Farm (+2).
    const mills = candidates(view).filter(
      (item) => item.command.kind === "BUILD_WINDMILL",
    );
    expect(mills.length).toBeGreaterThan(1);
    const first = mills[0]?.command;
    if (first === undefined || !("at" in first)) throw new Error("no mill");
    expect(first.at).toEqual(MIDDLE);
    expect(mills[0]?.score.priority).toBeGreaterThanOrEqual(1140);
    const result = acceptV7(state, 0, first);
    expect(eventOf(result.events, "ECONOMIC_BUILDING_BUILT")).toMatchObject({
      improvement: "WINDMILL",
      populationContribution: 2,
    });
  });
});

describe("the Ice Folk seat plays its Black Ice", () => {
  it("strikes the enemy its Black Ice froze on entry", () => {
    // The Ice Folk crossing (3, 3) to (3, 7); a Human Fighter steps onto
    // its end from the shore on its own turn and is Frozen at once.
    const base = frozenArenaV7({
      technologies: [BLACK_ICE, PACK_ICE],
      units: [
        { seat: 0, role: "FIGHTER", at: { x: 4, y: 8 } },
        { seat: 1, role: "FIGHTER", at: { x: 2, y: 8 } },
      ],
      ice: column(5),
    });
    const intruder = idAt(base, { x: 2, y: 8 });
    const stepped = acceptV7(turnOf(base, 1), 1, {
      kind: "MOVE",
      unitId: intruder,
      path: [{ x: 3, y: 7 }],
    });
    expect(eventOf(stepped.events, "UNITS_FROZEN")).toMatchObject({
      source: "BLACK_ICE",
    });
    const view = viewOf(turnOf(stepped.state, 0));
    const yeti = idAt(base, { x: 4, y: 8 });
    expect(bestOf(view, yeti)?.command).toEqual({
      kind: "ATTACK",
      unitId: yeti,
      targetUnitId: intruder,
    });
  });
});

describe("the Ice Folk seat researches Glacier when its ice is cracked", () => {
  it("raises Glacier to the due research after two hostile Cracks of its crossing", () => {
    // The Ice Folk crossing (3, 3) to (3, 7); two Human Patrol Boats beside
    // it crack (3, 4) and (3, 6) on their turn.
    const base = frozenArenaV7({
      technologies: [[...PACK_ICE, "SEAMANSHIP"], PACK_ICE],
      units: [
        { seat: 1, role: "PATROL_BOAT", at: { x: 2, y: 4 } },
        { seat: 1, role: "PATROL_BOAT", at: { x: 4, y: 6 } },
      ],
      ice: column(5),
    });
    const theirs = turnOf(base, 1);
    const once = acceptV7(
      theirs,
      1,
      crack(idAt(base, { x: 2, y: 4 }), { x: 3, y: 4 }),
    );
    expect(eventOf(once.events, "ICE_CRACKED")).toMatchObject({
      at: { x: 3, y: 4 },
      broken: true,
    });
    const twice = acceptV7(
      once.state,
      1,
      crack(idAt(base, { x: 4, y: 6 }), { x: 3, y: 6 }),
    );
    const research = (state: GameStateV7) => {
      const view = viewOf(turnOf(state, 0));
      return {
        view,
        gaps: iceCrackedOpenTilesV7(view, iceSeaPlanV7(view, toolsOf(view))),
        want: iceSeaResearchV7(
          view,
          toolsOf(view),
          iceSeaPlanV7(view, toolsOf(view)),
          () => true,
        ),
      };
    };
    const one = research(once.state);
    expect(one.gaps).toEqual([{ x: 3, y: 4 }]);
    expect(one.want?.tech).not.toBe("SUBMERSIBLES");
    const two = research(twice.state);
    expect(two.gaps).toEqual([
      { x: 3, y: 4 },
      { x: 3, y: 6 },
    ]);
    expect(two.want).toEqual({
      tech: "SUBMERSIBLES",
      priority: ICE_SEA_DUE_RESEARCH_PRIORITY_V7,
      strategic: 45,
    });
    expect(
      scoreCommandV7(two.view, { kind: "RESEARCH", tech: "SUBMERSIBLES" })
        .priority,
    ).toBe(ICE_SEA_DUE_RESEARCH_PRIORITY_V7);
  });

  it("reads a hole in its home ice as a Crack", () => {
    // Own ice all round (5, 4), with (5, 4) open: but (5, 4) is outside
    // the capital's 3 x 3 footprint, so it is no hole of the home ice.
    const ring = [
      WEST,
      MIDDLE,
      EAST,
      { x: 4, y: 4 },
      { x: 6, y: 4 },
      { x: 4, y: 5 },
      { x: 5, y: 5 },
      { x: 6, y: 5 },
    ];
    const { view } = scene({
      technologies: [PACK_ICE, PACK_ICE],
      ports: [false, true],
      units: [],
      ice: ring.map((at) => ({ at })),
    });
    expect(iceCrackedOpenTilesV7(view, null)).toEqual([]);
    // The footprint's (5, 3) open with its water all round own ice: a hole.
    const opened = scene({
      technologies: [PACK_ICE, PACK_ICE],
      ports: [false, true],
      units: [],
      ice: [WEST, EAST, { x: 4, y: 4 }, { x: 5, y: 4 }, { x: 6, y: 4 }].map(
        (at) => ({ at }),
      ),
    });
    expect(iceCrackedOpenTilesV7(opened.view, null)).toEqual([MIDDLE]);
  });
});

describe("every other seat cracks the ice where it gains", () => {
  /** A Human seat 0 against an Ice Folk seat 1. */
  const against = (
    units: FrozenArenaOptionsV7["units"],
    ice: readonly FrozenIceV7[],
    ice1: readonly TechnologyIdV7[] = BLACK_ICE,
  ): FrozenArenaOptionsV7 => ({
    factions: ["ORIGINAL", "ICE_FOLK"],
    technologies: [GLACIER, ice1],
    units,
    ice,
  });

  it("cracks an own icebound ship free before anything else", () => {
    const { state, view } = scene(
      against(
        [
          { seat: 0, role: "PATROL_BOAT", at: { x: 8, y: 4 } },
          { seat: 0, role: "PATROL_BOAT", at: { x: 8, y: 5 } },
        ],
        [{ at: { x: 8, y: 4 }, seat: 1 }],
      ),
    );
    const frozen = idAt(state, { x: 8, y: 4 });
    const helper = idAt(state, { x: 8, y: 5 });
    expect(unitIsIceboundV7(view, navalUnitV7(state, frozen))).toBe(true);
    const best = candidates(view)[0];
    expect(best?.command).toEqual(crack(helper, { x: 8, y: 4 }));
    expect(best?.score.priority).toBe(ICE_CRACK_FREE_PRIORITY_V7);
    expect(
      iceCrackScoreV7(view, toolsOf(view), crack(helper, { x: 8, y: 4 })),
    ).toMatchObject({ reason: "FREE", preview: { broken: true } });
    const result = acceptV7(state, 0, best?.command as CommandV7);
    expect(eventOf(result.events, "ICE_CRACKED").freed).toEqual([frozen]);
    // The freed boat sails this turn.
    expect(
      queryPlayerCommandsV7(viewOf(result.state)).some(
        (command) => command.kind === "MOVE" && command.unitId === frozen,
      ),
    ).toBe(true);
  });

  it("cracks thick ice twice in one turn when two units stand beside it, and not with one", () => {
    const options = (two: boolean) =>
      against(
        [
          { seat: 0, role: "PATROL_BOAT", at: { x: 8, y: 4 } },
          { seat: 0, role: "PATROL_BOAT", at: { x: 8, y: 5 } },
          ...(two
            ? [
                {
                  seat: 0 as const,
                  role: "PATROL_BOAT" as const,
                  at: { x: 7, y: 4 },
                },
              ]
            : []),
        ],
        [{ at: { x: 8, y: 4 }, seat: 1 }],
        GLACIER,
      );
    const alone = scene(options(false));
    const helper = idAt(alone.state, { x: 8, y: 5 });
    expect(previewCrackIceV7(alone.view, helper, { x: 8, y: 4 })?.broken).toBe(
      false,
    );
    expect(
      iceCrackScoreV7(
        alone.view,
        toolsOf(alone.view),
        crack(helper, { x: 8, y: 4 }),
      ),
    ).toBeNull();
    expect(
      candidates(alone.view).some((item) => item.command.kind === "CRACK_ICE"),
    ).toBe(false);
    const { state, view } = scene(options(true));
    const first = candidates(view)[0];
    expect(first?.command.kind).toBe("CRACK_ICE");
    expect(first?.score.priority).toBe(ICE_CRACK_FREE_PRIORITY_V7);
    const cracked = acceptV7(state, 0, first?.command as CommandV7);
    expect(eventOf(cracked.events, "ICE_CRACKED").broken).toBe(false);
    const second = candidates(viewOf(cracked.state))[0];
    expect(second?.command.kind).toBe("CRACK_ICE");
    expect(second?.score.priority).toBe(ICE_CRACK_FREE_PRIORITY_V7);
    const broken = acceptV7(cracked.state, 0, second?.command as CommandV7);
    expect(eventOf(broken.events, "ICE_CRACKED")).toMatchObject({
      broken: true,
      freed: [idAt(state, { x: 8, y: 4 })],
    });
  });

  /** The Ice Folk bridge (3, 7) to (3, 3) toward the Human capital (5, 2). */
  const BRIDGE: readonly FrozenIceV7[] = lineV7({ x: 3, y: 8 }, 0, -1, 5).map(
    (at) => ({ at, seat: 1 as const }),
  );

  it("breaks a bridge tile near its capital while an Ice Folk unit is near", () => {
    const { state, view } = scene(
      against(
        [
          { seat: 0, role: "FIGHTER", at: { x: 2, y: 2 } },
          { seat: 1, role: "FIGHTER", at: { x: 3, y: 8 } },
        ],
        BRIDGE,
      ),
    );
    const cracker = idAt(state, { x: 2, y: 2 });
    const command = crack(cracker, { x: 3, y: 3 });
    expect(queryPlayerCommandsV7(view)).toContainEqual(command);
    expect(iceCrackScoreV7(view, toolsOf(view), command)).toMatchObject({
      reason: "BRIDGE",
      priority: ICE_CRACK_HOME_PRIORITY_V7,
      // Two from the capital, and joined over the ice to the Yeti.
      strategic: 25,
    });
    const best = bestOf(view, cracker);
    expect(best?.command).toEqual(command);
    expect(best?.score.priority).toBe(ICE_CRACK_HOME_PRIORITY_V7);
    const result = acceptV7(state, 0, command);
    expect(eventOf(result.events, "ICE_CRACKED").broken).toBe(true);
    expect(iceEntryV7(result.state, { x: 3, y: 3 })).toBeUndefined();
    // With no Ice Folk unit in sight the ice is left alone.
    const blind: PlayerViewV7 = {
      ...view,
      units: view.units.filter((unit) => unit.ownerId === view.viewer.id),
    };
    expect(iceCrackScoreV7(blind, toolsOf(blind), command)).toBeNull();
  });

  it("never cracks the ice under its own planned Move, nor instead of a kill", () => {
    // An own Fighter already stands on the bridge at (3, 4): its Move to
    // (3, 3) is one the policy plans.
    const walker = scene(
      against(
        [
          { seat: 0, role: "FIGHTER", at: { x: 2, y: 2 } },
          { seat: 0, role: "FIGHTER", at: { x: 3, y: 4 } },
          { seat: 1, role: "FIGHTER", at: { x: 3, y: 8 } },
        ],
        BRIDGE,
      ),
    );
    const cracker = idAt(walker.state, { x: 2, y: 2 });
    const command = crack(cracker, { x: 3, y: 3 });
    expect(queryPlayerCommandsV7(walker.view)).toContainEqual(command);
    expect(
      queryPlayerCommandsV7(walker.view).some(
        (offered) =>
          offered.kind === "MOVE" &&
          offered.unitId === idAt(walker.state, { x: 3, y: 4 }) &&
          offered.path.some((at) => same(at, { x: 3, y: 3 })),
      ),
    ).toBe(true);
    expect(scoreCommandV7(walker.view, command).priority).toBeLessThan(
      ICE_CRACK_HOME_PRIORITY_V7,
    );
    expect(
      candidates(walker.view).map((item) => item.command),
    ).not.toContainEqual(command);
    // A 1-HP Ice Folk unit beside the cracker: it strikes instead.
    const base = frozenArenaV7(
      against(
        [
          { seat: 0, role: "FIGHTER", at: { x: 2, y: 2 } },
          { seat: 1, role: "FIGHTER", at: { x: 3, y: 8 } },
          { seat: 1, role: "FIGHTER", at: { x: 1, y: 2 } },
        ],
        BRIDGE,
      ),
    );
    const weak = patchNavalUnitV7(base, idAt(base, { x: 1, y: 2 }), { hp: 1 });
    const view = viewOf(weak);
    expect(iceCrackScoreV7(view, toolsOf(view), command)).toBeNull();
    expect(bestOf(view, cracker)?.command).toEqual({
      kind: "ATTACK",
      unitId: cracker,
      targetUnitId: idAt(weak, { x: 1, y: 2 }),
    });
  });

  /** An Ice Folk wall across the strait on row 6, `open` left as water. */
  const wall = (open: readonly CoordV7[] = []): readonly FrozenIceV7[] =>
    Array.from({ length: 11 }, (_, x) => ({ x, y: 6 }))
      .filter((at) => !open.some((tile) => same(tile, at)))
      .map((at) => ({ at, seat: 1 as const }));

  it("a ship cracks the ice that is the next step of its route", () => {
    const { state, view } = scene(
      against([{ seat: 0, role: "PATROL_BOAT", at: { x: 6, y: 5 } }], wall()),
    );
    const boat = idAt(state, { x: 6, y: 5 });
    const cracks = queryPlayerCommandsV7(view).filter(
      (command): command is Extract<CommandV7, { kind: "CRACK_ICE" }> =>
        command.kind === "CRACK_ICE" && command.unitId === boat,
    );
    expect(cracks.length).toBe(3);
    const best = bestOf(view, boat);
    expect(best?.command.kind).toBe("CRACK_ICE");
    expect(best?.score.priority).toBe(ICE_CRACK_LANE_PRIORITY_V7);
    // Exactly one of its three Cracks is the lane.
    expect(
      candidates(view).filter(
        (item) =>
          item.command.kind === "CRACK_ICE" && item.command.unitId === boat,
      ),
    ).toHaveLength(1);
    const result = acceptV7(state, 0, best?.command as CommandV7);
    expect(eventOf(result.events, "ICE_CRACKED").broken).toBe(true);
    // With a way round two steps long, the boat sails and cracks nothing.
    const round = scene(
      against(
        [{ seat: 0, role: "PATROL_BOAT", at: { x: 6, y: 5 } }],
        wall([{ x: 7, y: 6 }]),
      ),
    );
    expect(
      candidates(round.view).some((item) => item.command.kind === "CRACK_ICE"),
    ).toBe(false);
  });

  it("follows a Sled's slide through a zone of control in the threat estimate", () => {
    // The Ice Folk bridge, a Human Fighter on its ice at (2, 5) whose zone
    // covers (3, 4) to (3, 6), and a Yeti and a Sled on the Ice Folk shore.
    const { state, view } = scene(
      against(
        [
          { seat: 0, role: "FIGHTER", at: { x: 2, y: 5 } },
          { seat: 1, role: "FIGHTER", at: { x: 3, y: 8 } },
          { seat: 1, role: "RAIDER", at: { x: 4, y: 8 } },
        ],
        [...BRIDGE, { at: { x: 2, y: 5 }, seat: 1 }],
      ),
    );
    const yeti = view.units.find(
      (unit) => unit.id === idAt(state, { x: 3, y: 8 }),
    );
    const sled = view.units.find(
      (unit) => unit.id === idAt(state, { x: 4, y: 8 }),
    );
    if (yeti === undefined || sled === undefined) throw new Error("not seen");
    // The Yeti's slide stops in the zone; the Sled's Runners go on to the
    // end of the ice.
    expect(publicStandTilesForPolicyV7(view, yeti)).toContainEqual({
      x: 3,
      y: 6,
    });
    expect(publicStandTilesForPolicyV7(view, yeti)).not.toContainEqual({
      x: 3,
      y: 3,
    });
    expect(publicStandTilesForPolicyV7(view, sled)).toContainEqual({
      x: 3,
      y: 3,
    });
    // The engine offers the Sled that Move on its turn, and the Yeti not.
    const theirs = queryPlayerCommandsV7(viewOf(turnOf(state, 1), 1));
    const endsAt = (unitId: UnitId, at: CoordV7): boolean =>
      theirs.some(
        (command) =>
          command.kind === "MOVE" &&
          command.unitId === unitId &&
          same(command.path.at(-1) as CoordV7, at),
      );
    expect(endsAt(sled.id, { x: 3, y: 3 })).toBe(true);
    expect(endsAt(yeti.id, { x: 3, y: 3 })).toBe(false);
  });
});

describe("a match without an Ice Folk seat decides as before", () => {
  const expected = pins as Record<string, unknown>;
  for (const mapType of [...ICE_AI_PIN_MAP_TYPES_V7, "STRAIT" as const])
    it(`${mapType}: the first decisions are those recorded before the change`, () => {
      const state = iceAiPinStateV7(mapType);
      expect(state.ice).toEqual([]);
      expect(
        state.players.some((player) => player.faction === "ICE_FOLK"),
      ).toBe(false);
      expect(iceAiPinTraceV7(state)).toEqual(expected[mapType]);
    });
});
