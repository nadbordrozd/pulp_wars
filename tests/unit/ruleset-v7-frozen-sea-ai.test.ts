import { describe, expect, it } from "vitest";
import {
  chooseNormalCommandV7,
  publicDangerForPolicyV7,
  publicStandTilesForPolicyV7,
  publicThreatenedTilesForPolicyV7,
  scoreCommandV7,
} from "../../src/ai/v7";
import {
  ICE_BRIDGE_BREAK_VALUE_V7,
  ICE_BRIDGE_FREEZE_PRIORITY_V7,
  ICE_BUILD_MOVE_PRIORITY_V7,
  ICE_CREW_LANDING_PRIORITY_V7,
  ICE_CROSS_MOVE_PRIORITY_V7,
  ICE_EXPOSED_TARGET_VALUE_V7,
  ICE_HOME_FREEZE_PRIORITY_V7,
  ICE_ICEBOUND_PRIORITY_V7,
  ICE_REFREEZE_PRIORITY_V7,
  ICE_SEA_DUE_RESEARCH_PRIORITY_V7,
  ICE_SEA_GLACIER_RESEARCH_PRIORITY_V7,
  ICE_SEA_PLAN_RESEARCH_PRIORITY_V7,
  ICE_STAGE_MOVE_PRIORITY_V7,
  iceCrossingMoveV7,
  iceFreezeReachesV7,
  iceFreezeScoreV7,
  iceHostileFreezersV7,
  iceLandingRejectedV7,
  iceMoveOntoHostileIceRejectedV7,
  iceSeaPlanV7,
  iceSeaResearchV7,
  iceShipMoveRejectedV7,
  iceSlideEndV7,
  iceTargetBonusV7,
  iceboundCrewLandingV7,
  type FrozenSeaToolsV7,
  type IcePlanV7,
} from "../../src/ai/v7-frozen-sea";
import { navalFleetFactsV7 } from "../../src/ai/v7-naval";
import {
  parseGameStateV7,
  previewFreezeV7,
  queryCombatPreviewV7,
  queryPlayerCommandsV7,
  queryThreatenedTilesV7,
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
  inTerritoryOfV7,
  lineV7,
  type FrozenArenaOptionsV7,
  type FrozenIceV7,
} from "../fixtures/v7-frozen-sea";
import {
  acceptV7,
  navalUnitAtV7,
  navalUnitV7,
  patchNavalUnitV7,
  seatV7,
} from "../fixtures/v7-naval-branch";

// The frozen sea for the Normal AI (`pulp_wars-5ti.5`,
// docs/product/RULESET_7_NAVAL_BRANCH.md sections 13.2 and 13.3): every rule
// on the authored strait of `v7-naval-branch.ts`. Rows 0 to 2 and 8 to 10 are
// land, rows 3 and 7 Shallow Water, rows 4 to 6 Deep Water, with the islet on
// (9, 5) and Shallow Water on its four orthogonal neighbours. Seat 0 has its
// capital on (5, 2) and a Port on (4, 3), seat 1 its capital on (5, 8) and a
// Port on (6, 7). No test plays a turn: each asks the policy for one
// decision on a hand-built state and checks what it projected against the
// engine's preview and events.

const RIME: readonly TechnologyIdV7[] = ["SHORECRAFT"];
const PACK_ICE: readonly TechnologyIdV7[] = [...RIME, "NAVIGATION"];
const ICEBOUND: readonly TechnologyIdV7[] = [...PACK_ICE, "NAVAL_ENGINEERING"];
const BLACK_ICE: readonly TechnologyIdV7[] = [...ICEBOUND, "SEAMANSHIP"];
const GLACIER: readonly TechnologyIdV7[] = [...BLACK_ICE, "SUBMERSIBLES"];
/** A technology that is not Naval: the free opener is spent. */
const NO_RIME: readonly TechnologyIdV7[] = ["SCOUTING"];

/** The crossing the plan picks with Pack Ice: the column on x = 3. */
const COLUMN: readonly CoordV7[] = lineV7({ x: 3, y: 2 }, 0, 1, 5);
const HEAD: CoordV7 = { x: 3, y: 2 };
const column = (
  count: number,
  entry: Omit<FrozenIceV7, "at"> = {},
): readonly FrozenIceV7[] =>
  COLUMN.slice(0, count).map((at) => ({ ...entry, at }));

const viewOf = (state: GameStateV7, seat: 0 | 1 = 0): PlayerViewV7 =>
  viewForV7(state, seatV7(state, seat).id);

/** The same position on `seat`'s turn (to ask the engine what it offers that seat). */
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

function publicUnit(view: PlayerViewV7, id: UnitId) {
  const unit = view.units.find((candidate) => candidate.id === id);
  if (unit === undefined) throw new Error("unit not visible");
  return unit;
}

/** The tools the policy lends the frozen-sea rules, rebuilt from its exports. */
function toolsOf(view: PlayerViewV7): FrozenSeaToolsV7 {
  return {
    isHostile: (ownerId) => ownerId !== view.viewer.id,
    isAllied: () => false,
    danger: (inView, unit, at) => publicDangerForPolicyV7(inView, unit, at),
    standTiles: (hostile) => publicStandTilesForPolicyV7(view, hostile),
    objective: () => undefined,
    commands: queryPlayerCommandsV7(view),
  };
}

const planOf = (view: PlayerViewV7): IcePlanV7 | null =>
  iceSeaPlanV7(view, toolsOf(view));

function requiredPlan(view: PlayerViewV7): IcePlanV7 {
  const plan = planOf(view);
  if (plan === null) throw new Error("no ice plan");
  return plan;
}

const candidates = (view: PlayerViewV7) =>
  chooseNormalCommandV7(view).candidates;

/** The best candidate of one unit, or undefined when it has none. */
function bestOf(view: PlayerViewV7, unitId: UnitId) {
  return candidates(view).find(
    (item) => "unitId" in item.command && item.command.unitId === unitId,
  );
}

const endOf = (command: CommandV7): CoordV7 | undefined =>
  command.kind === "MOVE" ? command.path.at(-1) : undefined;

/** The ends of the Moves in `commands` of one unit, as "x,y". */
function endsOf(commands: readonly CommandV7[], unitId: UnitId): string[] {
  return commands.flatMap((command) => {
    const end = endOf(command);
    return command.kind === "MOVE" &&
      command.unitId === unitId &&
      end !== undefined
      ? [`${String(end.x)},${String(end.y)}`]
      : [];
  });
}

const candidateEnds = (view: PlayerViewV7, unitId: UnitId): string[] =>
  endsOf(
    candidates(view).map((item) => item.command),
    unitId,
  );

const research = (tech: TechnologyIdV7): CommandV7 => ({
  kind: "RESEARCH",
  tech,
});

function frozenEvent(events: readonly DomainEventV7[]) {
  const event = events.find((entry) => entry.kind === "WATER_FROZEN");
  if (event?.kind !== "WATER_FROZEN") throw new Error("no Freeze");
  return event;
}

/** `view` with the given tiles unexplored (the viewer has not seen them). */
function unexplored(
  view: PlayerViewV7,
  tiles: readonly CoordV7[],
): PlayerViewV7 {
  return {
    ...view,
    board: {
      ...view.board,
      tiles: view.board.tiles.map((tile) =>
        tiles.some((at) => at.x === tile.at.x && at.y === tile.at.y)
          ? { at: tile.at, explored: false as const }
          : tile,
      ),
    },
  };
}

describe("the ice plan of an Ice Folk seat: the crossing", () => {
  it("picks a straight crossing from its shore to the objective's shore", () => {
    const { state, view } = scene({
      technologies: [PACK_ICE, PACK_ICE],
      units: [{ seat: 0, role: "FIGHTER", at: { x: 2, y: 2 } }],
    });
    const plan = requiredPlan(view);
    expect(plan).toMatchObject({
      target: { x: 5, y: 8 },
      crossing: COLUMN,
      head: HEAD,
      next: 0,
      unfrozen: 5,
      complete: false,
      ready: false,
      needsPackIce: false,
      thawSafe: true,
      stand: HEAD,
      builders: [idAt(state, { x: 2, y: 2 })],
    });
    // The head is not the capital two tiles to the east: its garrison would
    // stand in the way of every unit that enters the ice in a straight line.
    expect(plan.head).not.toEqual({ x: 5, y: 2 });
  });

  it("has no plan for a seafaring seat, nor for an Ice Folk seat with nothing overseas", () => {
    const human = scene({
      factions: ["ORIGINAL", "ICE_FOLK"],
      units: [{ seat: 0, role: "FIGHTER", at: { x: 2, y: 2 } }],
    });
    expect(planOf(human.view)).toBeNull();
    // The hostile capital is out of sight: nothing known lies overseas.
    const blind = scene({
      technologies: [PACK_ICE, PACK_ICE],
      explored: [false, true],
      units: [{ seat: 0, role: "FIGHTER", at: { x: 2, y: 2 } }],
    });
    expect(planOf(blind.view)).toBeNull();
  });

  it("keeps to Shallow Water without Pack Ice, and asks for Pack Ice when only Deep Water leads across", () => {
    const { view } = scene({
      technologies: [RIME, PACK_ICE],
      units: [{ seat: 0, role: "FIGHTER", at: { x: 7, y: 1 } }],
    });
    const plan = requiredPlan(view);
    // Round the islet, whose neighbours are Shallow.
    expect(plan.crossing).toEqual([
      { x: 8, y: 3 },
      { x: 9, y: 4 },
      { x: 10, y: 5 },
      { x: 9, y: 6 },
      { x: 8, y: 7 },
    ]);
    expect(plan.needsPackIce).toBe(false);
    for (const at of plan.crossing)
      expect(
        view.board.tiles.find(
          (tile) => tile.at.x === at.x && tile.at.y === at.y,
        ),
      ).toMatchObject({ terrain: "SHALLOW_WATER" });
    // With the islet's waters unseen the only known way is the deep strait.
    const deep = unexplored(view, [
      { x: 9, y: 4 },
      { x: 8, y: 5 },
      { x: 10, y: 5 },
      { x: 9, y: 6 },
      { x: 9, y: 5 },
    ]);
    const deepPlan = requiredPlan(deep);
    expect(deepPlan.needsPackIce).toBe(true);
    expect(deepPlan.ready).toBe(false);
    expect(iceSeaResearchV7(deep, toolsOf(deep), deepPlan, () => true)).toEqual(
      {
        tech: "NAVIGATION",
        priority: ICE_SEA_PLAN_RESEARCH_PRIORITY_V7,
        strategic: 80,
      },
    );
    expect(scoreCommandV7(deep, research("NAVIGATION")).priority).toBe(
      ICE_SEA_PLAN_RESEARCH_PRIORITY_V7,
    );
  });

  it("takes the ice as a shortcut only when it saves more than three steps, and only for the units bound there", () => {
    const { state, view } = scene({
      technologies: [PACK_ICE, PACK_ICE],
      units: [
        { seat: 0, role: "FIGHTER", at: { x: 4, y: 1 } },
        { seat: 0, role: "FIGHTER", at: { x: 8, y: 1 } },
      ],
    });
    /** `view` with a land bridge down the column `x` (the viewer's knowledge of the board). */
    const bridged = (x: number): PlayerViewV7 => {
      const land = view.board.tiles.find(
        (tile) => tile.at.x === 0 && tile.at.y === 0,
      );
      if (land === undefined) throw new Error("no land tile");
      return {
        ...view,
        board: {
          ...view.board,
          tiles: view.board.tiles.map((tile) =>
            tile.at.x === x && tile.at.y >= 3 && tile.at.y <= 7
              ? { ...land, at: tile.at }
              : tile,
          ),
        },
      };
    };
    // A land bridge on the far west: a long walk round, six steps straight
    // over the ice from capital to capital (here the shortest way wins, not
    // the fewest tiles to freeze).
    const far = bridged(0);
    const plan = requiredPlan(far);
    expect(plan).toMatchObject({
      shortcut: true,
      target: { x: 5, y: 8 },
      crossing: lineV7({ x: 5, y: 2 }, 0, 1, 5),
    });
    // A land bridge beside the capitals: the walk is as short.
    expect(planOf(bridged(6))).toBeNull();
    // Only a unit whose objective is the target walks to the head.
    const bound = idAt(state, { x: 4, y: 1 });
    const other = idAt(state, { x: 8, y: 1 });
    const tools: FrozenSeaToolsV7 = {
      ...toolsOf(far),
      objective: (unitId) => (unitId === bound ? plan.target : { x: 9, y: 0 }),
    };
    expect(plan.builders).toEqual([bound]);
    expect(
      iceCrossingMoveV7(far, tools, plan, publicUnit(far, other), {
        x: 7,
        y: 1,
      }),
    ).toBeNull();
    expect(
      iceCrossingMoveV7(
        far,
        { ...tools, objective: () => plan.target },
        plan,
        publicUnit(far, other),
        { x: 7, y: 1 },
      ),
    ).toMatchObject({ kind: "STAGE", priority: ICE_STAGE_MOVE_PRIORITY_V7 });
  });

  it("keeps the crossing out of a visible Battleship's reach", () => {
    const { state, view } = scene({
      technologies: [PACK_ICE, GLACIER],
      units: [
        { seat: 0, role: "FIGHTER", at: { x: 2, y: 2 } },
        { seat: 1, role: "BATTLESHIP", at: { x: 1, y: 5 } },
      ],
    });
    const ship = navalUnitAtV7(state, { x: 1, y: 5 });
    const plan = requiredPlan(view);
    for (const at of plan.crossing)
      expect(
        Math.max(Math.abs(at.x - ship.at.x), Math.abs(at.y - ship.at.y)),
      ).toBeGreaterThan(3);
    expect(plan.crossing).toHaveLength(5);
  });

  it("gives the Build job to a near Witch for a short crossing, to the cheapest line unit otherwise", () => {
    const short = scene({
      technologies: [PACK_ICE, PACK_ICE],
      units: [
        { seat: 0, role: "CAPTAIN", at: { x: 2, y: 1 } },
        { seat: 0, role: "FIGHTER", at: { x: 8, y: 1 } },
      ],
      ice: column(3),
    });
    // Two tiles left: her one tile a turn finishes inside the 3 turns.
    expect(requiredPlan(short.view)).toMatchObject({
      unfrozen: 2,
      builders: [idAt(short.state, { x: 2, y: 1 })],
      thawSafe: true,
    });
    const long = scene({
      technologies: [PACK_ICE, PACK_ICE],
      units: [
        { seat: 0, role: "CAPTAIN", at: { x: 2, y: 1 } },
        { seat: 0, role: "FIGHTER", at: { x: 8, y: 1 } },
      ],
    });
    // Five tiles left: at her pace the first would thaw; a Yeti's two tiles
    // a turn finish in three turns.
    expect(requiredPlan(long.view)).toMatchObject({
      unfrozen: 5,
      builders: [idAt(long.state, { x: 8, y: 1 })],
      thawSafe: true,
    });
    // Without Rime nobody is bound to the job.
    const none = scene({
      technologies: [NO_RIME, PACK_ICE],
      ports: [false, true],
      units: [{ seat: 0, role: "FIGHTER", at: { x: 8, y: 1 } }],
    });
    expect(requiredPlan(none.view).builders).toEqual([]);
  });
});

describe("the ice research of an Ice Folk seat", () => {
  it("buys Rime as soon as a crossing exists", () => {
    const { view } = scene({
      technologies: [NO_RIME, PACK_ICE],
      ports: [false, true],
      units: [{ seat: 0, role: "FIGHTER", at: { x: 2, y: 2 } }],
    });
    expect(queryPlayerCommandsV7(view)).toContainEqual(research("SHORECRAFT"));
    expect(
      iceSeaResearchV7(view, toolsOf(view), planOf(view), () => true),
    ).toEqual({
      tech: "SHORECRAFT",
      priority: ICE_SEA_PLAN_RESEARCH_PRIORITY_V7,
      strategic: 60,
    });
    expect(scoreCommandV7(view, research("SHORECRAFT")).priority).toBe(
      ICE_SEA_PLAN_RESEARCH_PRIORITY_V7,
    );
    expect(candidates(view).map((item) => item.command)).toContainEqual(
      research("SHORECRAFT"),
    );
  });

  it("asks for Icebound once a Battleship or Submarine is within 4 of an own unit", () => {
    const near = scene({
      technologies: [PACK_ICE, GLACIER],
      units: [
        { seat: 0, role: "FIGHTER", at: { x: 8, y: 2 } },
        { seat: 1, role: "BATTLESHIP", at: { x: 8, y: 6 } },
      ],
    });
    expect(
      scoreCommandV7(near.view, research("NAVAL_ENGINEERING")).priority,
    ).toBe(ICE_SEA_DUE_RESEARCH_PRIORITY_V7);
    // With Rime alone, Pack Ice is on the way to it.
    const early = scene({
      technologies: [RIME, GLACIER],
      units: [
        { seat: 0, role: "FIGHTER", at: { x: 8, y: 2 } },
        { seat: 1, role: "SUBMARINE", at: { x: 8, y: 6 } },
      ],
    });
    expect(
      iceSeaResearchV7(
        early.view,
        toolsOf(early.view),
        planOf(early.view),
        () => true,
      ),
    ).toMatchObject({
      tech: "NAVIGATION",
      priority: ICE_SEA_DUE_RESEARCH_PRIORITY_V7,
    });
    // A Patrol Boat, or a Battleship five tiles off, does not ask for it.
    const boat = scene({
      technologies: [PACK_ICE, GLACIER],
      units: [
        { seat: 0, role: "FIGHTER", at: { x: 8, y: 2 } },
        { seat: 1, role: "PATROL_BOAT", at: { x: 8, y: 6 } },
        { seat: 1, role: "BATTLESHIP", at: { x: 0, y: 7 } },
      ],
    });
    expect(
      scoreCommandV7(boat.view, research("NAVAL_ENGINEERING")).priority,
    ).toBeLessThan(ICE_SEA_DUE_RESEARCH_PRIORITY_V7);
  });

  it("asks for Black Ice once an enemy stands on its ice or a transport nears its land", () => {
    const trespass = scene({
      technologies: [PACK_ICE, GLACIER],
      factions: ["ICE_FOLK", "ORIGINAL"],
      units: [
        { seat: 0, role: "FIGHTER", at: { x: 2, y: 2 } },
        { seat: 1, role: "FIGHTER", at: { x: 8, y: 4 } },
      ],
      ice: [{ at: { x: 8, y: 4 } }, { at: { x: 8, y: 3 } }],
    });
    expect(scoreCommandV7(trespass.view, research("SEAMANSHIP")).priority).toBe(
      ICE_SEA_DUE_RESEARCH_PRIORITY_V7,
    );
    const base = frozenArenaV7({
      technologies: [PACK_ICE, GLACIER],
      units: [
        { seat: 0, role: "FIGHTER", at: { x: 2, y: 2 } },
        { seat: 1, role: "FIGHTER", at: { x: 1, y: 8 } },
      ],
    });
    const landing = viewOf(
      patchNavalUnitV7(base, idAt(base, { x: 1, y: 8 }), {
        at: { x: 7, y: 5 },
        form: "EMBARKED",
      }),
    );
    // (7, 5) is within 3 of the capital's territory.
    expect(scoreCommandV7(landing, research("SEAMANSHIP")).priority).toBe(
      ICE_SEA_DUE_RESEARCH_PRIORITY_V7,
    );
    const calm = viewOf(base);
    expect(scoreCommandV7(calm, research("SEAMANSHIP")).priority).toBeLessThan(
      ICE_SEA_DUE_RESEARCH_PRIORITY_V7,
    );
  });

  it("leaves Glacier for last", () => {
    const last = scene({
      technologies: [BLACK_ICE, GLACIER],
      units: [{ seat: 0, role: "FIGHTER", at: { x: 2, y: 2 } }],
    });
    expect(
      iceSeaResearchV7(
        last.view,
        toolsOf(last.view),
        planOf(last.view),
        () => true,
      ),
    ).toEqual({
      tech: "SUBMERSIBLES",
      priority: ICE_SEA_GLACIER_RESEARCH_PRIORITY_V7,
      strategic: 20,
    });
    const early = scene({
      technologies: [PACK_ICE, GLACIER],
      units: [{ seat: 0, role: "FIGHTER", at: { x: 2, y: 2 } }],
    });
    expect(
      iceSeaResearchV7(
        early.view,
        toolsOf(early.view),
        planOf(early.view),
        () => true,
      ),
    ).toBeNull();
  });

  it("asks a seafaring seat for nothing", () => {
    const { view } = scene({
      factions: ["ORIGINAL", "ICE_FOLK"],
      technologies: [NO_RIME, GLACIER],
      ports: [false, true],
      units: [{ seat: 0, role: "FIGHTER", at: { x: 2, y: 2 } }],
    });
    expect(iceSeaResearchV7(view, toolsOf(view), null, () => true)).toBeNull();
  });
});

describe("the builders: a bridge frozen toward the far shore", () => {
  it("walks the builder to the head, and Freezes the first two tiles from it", () => {
    const { state, view } = scene({
      technologies: [PACK_ICE, PACK_ICE],
      units: [
        { seat: 0, role: "FIGHTER", at: { x: 2, y: 2 } },
        { seat: 0, role: "RAIDER", at: { x: 6, y: 1 } },
      ],
    });
    const builder = idAt(state, { x: 2, y: 2 });
    const first = bestOf(view, builder);
    expect(first?.command).toEqual({
      kind: "MOVE",
      unitId: builder,
      path: [HEAD],
    });
    expect(first?.score.priority).toBe(ICE_BUILD_MOVE_PRIORITY_V7);
    const moved = acceptV7(state, 0, first?.command as CommandV7).state;
    const atHead = viewOf(moved);
    const freeze = bestOf(atHead, builder);
    expect(freeze?.command).toEqual({
      kind: "FREEZE",
      unitId: builder,
      at: { x: 3, y: 3 },
    });
    expect(freeze?.score.priority).toBe(ICE_BRIDGE_FREEZE_PRIORITY_V7);
    // What the policy read is the engine's preview, and the preview is the
    // resolution.
    const scored = iceFreezeScoreV7(
      atHead,
      toolsOf(atHead),
      planOf(atHead),
      freeze?.command as Extract<CommandV7, { kind: "FREEZE" }>,
    );
    expect(scored).toMatchObject({ reason: "BRIDGE", strategic: 20 });
    expect(scored?.preview).toEqual(
      previewFreezeV7(atHead, builder, { x: 3, y: 3 }),
    );
    const result = acceptV7(moved, 0, freeze?.command as CommandV7);
    const event = frozenEvent(result.events);
    expect(event.tiles).toEqual(scored?.preview.tiles);
    expect(event.icebound).toEqual(scored?.preview.icebound);
    expect(event.tiles).toEqual(COLUMN.slice(0, 2));
    expect(requiredPlan(viewOf(result.state))).toMatchObject({
      next: 2,
      unfrozen: 3,
      stand: { x: 3, y: 4 },
    });
  });

  it("steps onto the newest ice, slides to its end, and Freezes the next two", () => {
    const { state, view } = scene({
      technologies: [PACK_ICE, PACK_ICE],
      units: [
        { seat: 0, role: "FIGHTER", at: HEAD },
        { seat: 0, role: "FIGHTER", at: { x: 3, y: 1 } },
      ],
      ice: column(2),
    });
    const builder = idAt(state, HEAD);
    expect(requiredPlan(view).builders).toEqual([builder]);
    const step = bestOf(view, builder);
    expect(step?.score.priority).toBe(ICE_BUILD_MOVE_PRIORITY_V7);
    expect(endOf(step?.command as CommandV7)).toEqual({ x: 3, y: 4 });
    // The offered Move is the slide: the engine puts the unit on the tip.
    const slid = acceptV7(state, 0, step?.command as CommandV7).state;
    expect(navalUnitV7(slid, builder).at).toEqual({ x: 3, y: 4 });
    const onTip = viewOf(slid);
    const freeze = bestOf(onTip, builder);
    expect(freeze?.command).toEqual({
      kind: "FREEZE",
      unitId: builder,
      at: { x: 3, y: 5 },
    });
    const result = acceptV7(slid, 0, freeze?.command as CommandV7);
    expect(frozenEvent(result.events).tiles).toEqual(COLUMN.slice(2, 4));
    // One Freeze short of the far shore: the wave may go.
    expect(requiredPlan(viewOf(result.state))).toMatchObject({
      unfrozen: 1,
      ready: true,
    });
  });

  it("never Freezes without a reason", () => {
    // A Yeti on the shore away from the crossing: every Freeze it is
    // offered makes ice nobody needs.
    const idle = scene({
      technologies: [PACK_ICE, PACK_ICE],
      units: [
        { seat: 0, role: "FIGHTER", at: HEAD },
        { seat: 0, role: "FIGHTER", at: { x: 9, y: 2 } },
      ],
    });
    const far = idAt(idle.state, { x: 9, y: 2 });
    const offered = queryPlayerCommandsV7(idle.view).filter(
      (command) => command.kind === "FREEZE" && command.unitId === far,
    );
    expect(offered.length).toBeGreaterThan(0);
    expect(
      candidates(idle.view).filter(
        (item) => item.command.kind === "FREEZE" && item.command.unitId === far,
      ),
    ).toEqual([]);
    // A complete crossing with fresh ice and a unit beside it: a Freeze
    // would only refresh it.
    const complete = scene({
      technologies: [PACK_ICE, PACK_ICE],
      units: [{ seat: 0, role: "FIGHTER", at: HEAD }],
      ice: column(5),
    });
    expect(
      queryPlayerCommandsV7(complete.view).some(
        (command) => command.kind === "FREEZE",
      ),
    ).toBe(true);
    expect(
      candidates(complete.view).filter(
        (item) => item.command.kind === "FREEZE",
      ),
    ).toEqual([]);
  });

  it("refreezes a crossing tile about to thaw while a unit still has to pass it", () => {
    const options = (wave: boolean): FrozenArenaOptionsV7 => ({
      technologies: [PACK_ICE, PACK_ICE],
      units: [
        { seat: 0, role: "FIGHTER", at: { x: 3, y: 5 } },
        ...(wave
          ? [{ seat: 0 as const, role: "FIGHTER" as const, at: { x: 2, y: 1 } }]
          : []),
      ],
      ice: [
        ...column(3, { turnsLeft: 3 }),
        { at: { x: 3, y: 6 }, turnsLeft: 1 },
        { at: { x: 3, y: 7 }, turnsLeft: 1 },
      ],
    });
    const waiting = scene(options(true));
    const keeper = idAt(waiting.state, { x: 3, y: 5 });
    const command: Extract<CommandV7, { kind: "FREEZE" }> = {
      kind: "FREEZE",
      unitId: keeper,
      at: { x: 3, y: 6 },
    };
    const scored = iceFreezeScoreV7(
      waiting.view,
      toolsOf(waiting.view),
      planOf(waiting.view),
      command,
    );
    expect(scored).toMatchObject({
      reason: "REFREEZE",
      priority: ICE_REFREEZE_PRIORITY_V7,
      strategic: 12,
    });
    expect(scored?.preview.refreshed).toEqual(COLUMN.slice(3, 5));
    expect(candidates(waiting.view).map((item) => item.command)).toContainEqual(
      command,
    );
    const result = acceptV7(waiting.state, 0, command);
    expect(frozenEvent(result.events).tiles).toEqual(scored?.preview.tiles);
    expect(iceEntryV7(result.state, { x: 3, y: 6 })?.turnsLeft).toBe(3);
    // The same ice with nobody left behind it is let go.
    const alone = scene(options(false));
    expect(
      iceFreezeScoreV7(alone.view, toolsOf(alone.view), planOf(alone.view), {
        ...command,
        unitId: idAt(alone.state, { x: 3, y: 5 }),
      }),
    ).toBeNull();
  });
});

describe("the wave: it waits at the head and slides across", () => {
  const wave = (ice: number): FrozenArenaOptionsV7 => ({
    technologies: [PACK_ICE, PACK_ICE],
    units: [
      { seat: 0, role: "FIGHTER", at: COLUMN[ice - 1] ?? HEAD },
      { seat: 0, role: "FIGHTER", at: HEAD },
      { seat: 0, role: "RAIDER", at: { x: 4, y: 2 } },
      { seat: 0, role: "FIGHTER", at: { x: 7, y: 1 } },
    ],
    ice: column(ice),
  });

  it("holds off the crossing while it is short of the far shore", () => {
    const { state, view } = scene(wave(2));
    const waiting = idAt(state, HEAD);
    const sled = idAt(state, { x: 4, y: 2 });
    expect(requiredPlan(view).ready).toBe(false);
    // The engine offers both the step onto the ice.
    expect(endsOf(queryPlayerCommandsV7(view), waiting)).toContain("3,3");
    expect(endsOf(queryPlayerCommandsV7(view), sled)).toContain("3,3");
    for (const unit of [waiting, sled])
      for (const end of candidateEnds(view, unit))
        expect(["3,3", "3,4", "3,5", "3,6", "3,7"]).not.toContain(end);
    expect(
      iceCrossingMoveV7(
        view,
        toolsOf(view),
        requiredPlan(view),
        publicUnit(view, waiting),
        { x: 3, y: 3 },
      ),
    ).toEqual({ kind: "HOLD" });
    // A unit farther back walks toward the head.
    const back = idAt(state, { x: 7, y: 1 });
    const stage = bestOf(view, back);
    expect(stage?.score.priority).toBe(ICE_STAGE_MOVE_PRIORITY_V7);
    const end = endOf(stage?.command as CommandV7) as CoordV7;
    expect(Math.abs(end.x - HEAD.x)).toBeLessThan(Math.abs(7 - HEAD.x));
  });

  it("crosses by the offered slide once the crossing is one Freeze short", () => {
    const { state, view } = scene(wave(4));
    const waiting = idAt(state, HEAD);
    expect(requiredPlan(view)).toMatchObject({ unfrozen: 1, ready: true });
    const cross = bestOf(view, waiting);
    expect(cross?.score.priority).toBe(ICE_CROSS_MOVE_PRIORITY_V7);
    // It slides up to the builder on the tip.
    expect(endOf(cross?.command as CommandV7)).toEqual({ x: 3, y: 5 });
    const result = acceptV7(state, 0, cross?.command as CommandV7);
    expect(navalUnitV7(result.state, waiting).at).toEqual({ x: 3, y: 5 });
    // The builder's last Freeze comes before the wave's Moves.
    const builder = idAt(state, { x: 3, y: 6 });
    expect(bestOf(view, builder)?.command).toEqual({
      kind: "FREEZE",
      unitId: builder,
      at: { x: 3, y: 7 },
    });
    expect(bestOf(view, builder)?.score.priority).toBeGreaterThan(
      cross?.score.priority ?? 0,
    );
  });

  it("goes on over a complete crossing and lands", () => {
    const { state, view } = scene(wave(5));
    const lead = idAt(state, { x: 3, y: 7 });
    expect(requiredPlan(view)).toMatchObject({
      complete: true,
      ready: true,
      builders: [],
      stand: null,
    });
    // The lead unit steps ashore; the next slides up behind it.
    const ashore = bestOf(view, lead);
    expect(ashore?.command.kind).toBe("MOVE");
    expect(endOf(ashore?.command as CommandV7)?.y).toBe(8);
    const next = bestOf(view, idAt(state, HEAD));
    expect(next?.score.priority).toBe(ICE_CROSS_MOVE_PRIORITY_V7);
    expect(endOf(next?.command as CommandV7)).toEqual({ x: 3, y: 6 });
    // A unit that has crossed has the ordinary policy again.
    const landed = acceptV7(state, 0, ashore?.command as CommandV7).state;
    const after = viewOf(landed);
    expect(
      iceCrossingMoveV7(
        after,
        toolsOf(after),
        requiredPlan(after),
        publicUnit(after, lead),
        { x: 4, y: 8 },
      ),
    ).toBeNull();
  });
});

describe("Icebound and home ice", () => {
  it("Freezes a Battleship in before anything else, and the blows on it are then unanswered", () => {
    const { state, view } = scene({
      technologies: [ICEBOUND, GLACIER],
      units: [
        { seat: 0, role: "FIGHTER", at: { x: 8, y: 2 } },
        { seat: 0, role: "FIGHTER", at: { x: 9, y: 2 } },
        { seat: 1, role: "BATTLESHIP", at: { x: 8, y: 4 } },
      ],
    });
    const yeti = idAt(state, { x: 8, y: 2 });
    const ship = idAt(state, { x: 8, y: 4 });
    const best = candidates(view)[0];
    expect(best?.command).toEqual({
      kind: "FREEZE",
      unitId: yeti,
      at: { x: 8, y: 3 },
    });
    expect(best?.score.priority).toBe(ICE_ICEBOUND_PRIORITY_V7);
    const scored = iceFreezeScoreV7(
      view,
      toolsOf(view),
      planOf(view),
      best?.command as Extract<CommandV7, { kind: "FREEZE" }>,
    );
    expect(scored?.reason).toBe("ICEBOUND");
    expect(scored?.preview.icebound).toEqual([ship]);
    const result = acceptV7(state, 0, best?.command as CommandV7);
    expect(frozenEvent(result.events).icebound).toEqual([ship]);
    expect(
      unitIsIceboundV7(result.state, navalUnitV7(result.state, ship)),
    ).toBe(true);
    // Before the Freeze the ship is out of the Yetis' reach; a Yeti that
    // walks onto the new ice beside it strikes with no reply.
    const after = viewOf(result.state);
    const other = idAt(state, { x: 9, y: 2 });
    const walked = patchNavalUnitV7(result.state, other, {
      at: { x: 8, y: 3 },
    });
    expect(queryCombatPreviewV7(viewOf(walked), other, ship)).toMatchObject({
      icebound: true,
      retaliation: false,
      noRetaliationReason: "ICEBOUND",
      damageToAttacker: 0,
    });
    expect(after.ice.map((entry) => entry.at)).toEqual([
      { x: 8, y: 3 },
      { x: 8, y: 4 },
    ]);
  });

  it("counts every ship the Witch's ring binds", () => {
    const { state, view } = scene({
      technologies: [ICEBOUND, GLACIER],
      units: [
        { seat: 0, role: "CAPTAIN", at: { x: 8, y: 3 } },
        { seat: 1, role: "PATROL_BOAT", at: { x: 7, y: 4 } },
        { seat: 1, role: "PATROL_BOAT", at: { x: 9, y: 4 } },
      ],
    });
    const witch = idAt(state, { x: 8, y: 3 });
    const command: Extract<CommandV7, { kind: "FREEZE" }> = {
      kind: "FREEZE",
      unitId: witch,
      at: { x: 8, y: 3 },
    };
    const scored = iceFreezeScoreV7(view, toolsOf(view), planOf(view), command);
    expect(scored?.reason).toBe("ICEBOUND");
    expect(scored?.preview.icebound).toHaveLength(2);
    const one = scene({
      technologies: [ICEBOUND, GLACIER],
      units: [
        { seat: 0, role: "CAPTAIN", at: { x: 8, y: 3 } },
        { seat: 1, role: "PATROL_BOAT", at: { x: 7, y: 4 } },
      ],
    });
    const single = iceFreezeScoreV7(
      one.view,
      toolsOf(one.view),
      planOf(one.view),
      { ...command, unitId: idAt(one.state, { x: 8, y: 3 }) },
    );
    // Four times a Patrol Boat's 5 Coins for each; the capital's Yeti
    // reaches the western boat (3 more) and not the eastern one.
    expect(single?.strategic).toBe(23);
    expect(scored?.strategic).toBe(43);
    expect(candidates(view)[0]?.command).toEqual(command);
    const result = acceptV7(state, 0, command);
    expect(frozenEvent(result.events).icebound).toEqual(
      scored?.preview.icebound,
    );
  });

  it("sinks the ship instead when its own blow does it", () => {
    const base = frozenArenaV7({
      technologies: [ICEBOUND, GLACIER],
      units: [
        { seat: 0, role: "FIGHTER", at: { x: 8, y: 2 } },
        { seat: 1, role: "PATROL_BOAT", at: { x: 8, y: 3 } },
      ],
    });
    const yeti = idAt(base, { x: 8, y: 2 });
    const boat = idAt(base, { x: 8, y: 3 });
    const state = patchNavalUnitV7(base, boat, { hp: 1 });
    const view = viewOf(state);
    expect(queryCombatPreviewV7(view, yeti, boat)?.defenderDies).toBe(true);
    expect(
      iceFreezeScoreV7(view, toolsOf(view), planOf(view), {
        kind: "FREEZE",
        unitId: yeti,
        at: { x: 8, y: 3 },
      })?.reason,
    ).not.toBe("ICEBOUND");
    expect(bestOf(view, yeti)?.command).toEqual({
      kind: "ATTACK",
      unitId: yeti,
      targetUnitId: boat,
    });
  });

  it("Freezes its own waters beside a center a hostile ship has come near", () => {
    const { state, view } = scene({
      technologies: [RIME, GLACIER],
      units: [{ seat: 1, role: "PATROL_BOAT", at: { x: 6, y: 5 } }],
    });
    const garrison = idAt(state, { x: 5, y: 2 });
    const best = candidates(view).find(
      (item) =>
        item.command.kind === "FREEZE" && item.command.unitId === garrison,
    );
    expect(best?.score.priority).toBe(ICE_HOME_FREEZE_PRIORITY_V7);
    const scored = iceFreezeScoreV7(
      view,
      toolsOf(view),
      planOf(view),
      best?.command as Extract<CommandV7, { kind: "FREEZE" }>,
    );
    expect(scored?.reason).toBe("HOME");
    const result = acceptV7(state, 0, best?.command as CommandV7);
    const made = frozenEvent(result.events).tiles;
    expect(made).toEqual(scored?.preview.tiles);
    // Ice in the seat's own territory never melts.
    const home = made.filter((at) => inTerritoryOfV7(result.state, 0, at));
    expect(home.length).toBeGreaterThan(0);
    for (const at of home)
      expect(
        viewOf(result.state).ice.find(
          (entry) => entry.at.x === at.x && entry.at.y === at.y,
        )?.permanent,
      ).toBe(true);
    // A city without a dock keeps its Port sites clear: a Port cannot be
    // built on ice, and this ice would stay for good.
    const dockless = scene({
      technologies: [RIME, GLACIER],
      ports: [false, true],
      units: [{ seat: 1, role: "PATROL_BOAT", at: { x: 6, y: 5 } }],
    });
    expect(
      queryPlayerCommandsV7(dockless.view).some(
        (command) => command.kind === "BUILD_PORT",
      ),
    ).toBe(true);
    expect(
      candidates(dockless.view).filter(
        (item) => item.command.kind === "FREEZE",
      ),
    ).toEqual([]);
    // With no ship near, the same Freeze has no reason.
    const calm = scene({ technologies: [RIME, GLACIER], units: [] });
    expect(
      candidates(calm.view).filter(
        (item) =>
          item.command.kind === "FREEZE" &&
          iceFreezeScoreV7(
            calm.view,
            toolsOf(calm.view),
            planOf(calm.view),
            item.command,
          )?.reason === "HOME",
      ),
    ).toEqual([]);
  });
});

describe("every seat against the ice", () => {
  /** A Human seat 0 against an Ice Folk seat 1 with ice on the column x = 3, rows 7 to `top`. */
  const against = (
    units: FrozenArenaOptionsV7["units"],
    ice: readonly FrozenIceV7[] = lineV7({ x: 3, y: 8 }, 0, -1, 4).map(
      (at) => ({ at, seat: 1 as const }),
    ),
  ): FrozenArenaOptionsV7 => ({
    factions: ["ORIGINAL", "ICE_FOLK"],
    technologies: [GLACIER, BLACK_ICE],
    units,
    ice,
  });

  it("follows the slide in the threat estimate", () => {
    const { state, view } = scene(
      against([{ seat: 1, role: "FIGHTER", at: { x: 3, y: 8 } }]),
    );
    const yeti = publicUnit(view, idAt(state, { x: 3, y: 8 }));
    // One step onto (3, 7) and the slide to (3, 4): it strikes row 3.
    const stands = publicStandTilesForPolicyV7(view, yeti);
    expect(stands).toContainEqual({ x: 3, y: 4 });
    // The slide is forced: it does not stop on the ice short of the end.
    expect(stands).not.toContainEqual({ x: 3, y: 6 });
    const reach = publicThreatenedTilesForPolicyV7(view, yeti);
    expect(reach).toEqual(
      expect.arrayContaining([
        { x: 2, y: 3 },
        { x: 3, y: 3 },
        { x: 4, y: 3 },
      ]),
    );
    // The engine's own query agrees.
    expect(queryThreatenedTilesV7(view, yeti.id)).toEqual(
      expect.arrayContaining([
        { x: 2, y: 3 },
        { x: 3, y: 3 },
        { x: 4, y: 3 },
      ]),
    );
    // And the Move the estimate assumed is one the engine offers its owner
    // on its turn.
    expect(
      endsOf(queryPlayerCommandsV7(viewOf(turnOf(state, 1), 1)), yeti.id),
    ).toContain("3,4");
    // A unit, or a zone of control, on the ice stops the slide there.
    expect(
      iceSlideEndV7(
        view,
        { x: 3, y: 7 },
        0,
        -1,
        (at) => at.y === 5,
        () => false,
      ),
    ).toEqual({ x: 3, y: 6 });
    expect(
      iceSlideEndV7(
        view,
        { x: 3, y: 7 },
        0,
        -1,
        () => false,
        (at) => at.y === 6,
      ),
    ).toEqual({ x: 3, y: 6 });
  });

  it("keeps a ship out of the Freeze reach of a seat that has been seen to Freeze", () => {
    const { state, view } = scene(
      against([
        { seat: 0, role: "PATROL_BOAT", at: { x: 6, y: 5 } },
        { seat: 1, role: "FIGHTER", at: { x: 3, y: 8 } },
      ]),
    );
    const boat = idAt(state, { x: 6, y: 5 });
    const yeti = idAt(state, { x: 3, y: 8 });
    const tools = toolsOf(view);
    // The Yeti on the shore and the one in the capital.
    expect(iceHostileFreezersV7(view, tools).map((unit) => unit.id)).toEqual([
      idAt(state, { x: 5, y: 8 }),
      yeti,
    ]);
    // Beside the tile the Yeti slides to, and two tiles from it in a line.
    expect(iceFreezeReachesV7(view, tools, { x: 4, y: 4 })).toBe(true);
    expect(iceFreezeReachesV7(view, tools, { x: 5, y: 4 })).toBe(true);
    expect(iceFreezeReachesV7(view, tools, { x: 6, y: 4 })).toBe(false);
    const offered = endsOf(queryPlayerCommandsV7(view), boat);
    expect(offered).toContain("4,4");
    expect(offered).toContain("5,4");
    const kept = candidateEnds(view, boat);
    expect(kept.length).toBeGreaterThan(0);
    for (const end of kept) {
      const [x, y] = end.split(",").map(Number) as [number, number];
      expect(iceFreezeReachesV7(view, tools, { x, y })).toBe(false);
      expect(
        iceShipMoveRejectedV7(view, tools, publicUnit(view, boat), { x, y }),
      ).toBe(false);
    }
    expect(kept).not.toContain("4,4");
    expect(kept).not.toContain("5,4");
    // The projection is the engine's: with the boat on (5, 4) the Ice Folk
    // seat slides its Yeti to (3, 4) and is offered the Freeze that locks
    // the boat in, two tiles down the line.
    const sailed = patchNavalUnitV7(state, boat, { at: { x: 5, y: 4 } });
    const theirs = turnOf(sailed, 1);
    const slide = queryPlayerCommandsV7(viewOf(theirs, 1)).find(
      (command) =>
        command.kind === "MOVE" &&
        command.unitId === yeti &&
        endOf(command)?.x === 3 &&
        endOf(command)?.y === 4,
    );
    if (slide === undefined) throw new Error("the slide is not offered");
    const slid = acceptV7(theirs, 1, slide).state;
    expect(
      previewFreezeV7(viewOf(slid, 1), yeti, { x: 4, y: 4 })?.icebound,
    ).toEqual([boat]);
    // A boat already in reach may go anywhere.
    const inReach = viewOf(sailed);
    expect(
      iceShipMoveRejectedV7(
        inReach,
        toolsOf(inReach),
        publicUnit(inReach, boat),
        { x: 4, y: 4 },
      ),
    ).toBe(false);
    // A seat that has not been seen to Freeze is not assumed to.
    const unseen = scene(
      against(
        [
          { seat: 0, role: "PATROL_BOAT", at: { x: 6, y: 5 } },
          { seat: 1, role: "FIGHTER", at: { x: 3, y: 8 } },
        ],
        [],
      ),
    );
    expect(iceHostileFreezersV7(unseen.view, toolsOf(unseen.view))).toEqual([]);
  });

  it("does not end a Move on the ice of a hostile Ice Folk seat (Black Ice)", () => {
    const { state, view } = scene(
      against(
        [{ seat: 0, role: "FIGHTER", at: { x: 3, y: 2 } }],
        lineV7({ x: 3, y: 2 }, 0, 1, 5).map((at) => ({ at, seat: 1 as const })),
      ),
    );
    const fighter = idAt(state, { x: 3, y: 2 });
    expect(endsOf(queryPlayerCommandsV7(view), fighter)).toContain("3,3");
    expect(candidateEnds(view, fighter)).not.toContain("3,3");
    expect(
      iceMoveOntoHostileIceRejectedV7(
        view,
        toolsOf(view),
        publicUnit(view, fighter),
        { x: 3, y: 3 },
      ),
    ).toBe(true);
    // Why: a unit that stands there at the Ice Folk Start Turn is Frozen.
    const stepped = acceptV7(state, 0, {
      kind: "MOVE",
      unitId: fighter,
      path: [{ x: 3, y: 3 }],
    }).state;
    const turn = acceptV7(stepped, 0, { kind: "END_TURN" });
    expect(
      turn.events.some(
        (event) =>
          event.kind === "UNITS_FROZEN" &&
          event.source === "BLACK_ICE" &&
          event.results.some((entry) => entry.unitId === fighter),
      ),
    ).toBe(true);
    // A unit already on such ice may move along it; its own seat's ice is
    // no trap.
    const onIce = viewOf(stepped);
    expect(
      iceMoveOntoHostileIceRejectedV7(
        onIce,
        toolsOf(onIce),
        publicUnit(onIce, fighter),
        { x: 3, y: 4 },
      ),
    ).toBe(false);
    const own = scene({
      technologies: [PACK_ICE, PACK_ICE],
      units: [{ seat: 0, role: "FIGHTER", at: HEAD }],
      ice: column(5),
    });
    expect(
      iceMoveOntoHostileIceRejectedV7(
        own.view,
        toolsOf(own.view),
        publicUnit(own.view, idAt(own.state, HEAD)),
        { x: 3, y: 7 },
      ),
    ).toBe(false);
  });

  it("lands beside the ice, not on it", () => {
    const base = frozenArenaV7(
      against(
        [{ seat: 0, role: "FIGHTER", at: { x: 1, y: 2 } }],
        [{ at: { x: 3, y: 7 }, seat: 1 }],
      ),
    );
    const cargo = idAt(base, { x: 1, y: 2 });
    const state = patchNavalUnitV7(base, cargo, {
      at: { x: 2, y: 7 },
      form: "EMBARKED",
    });
    const view = viewOf(state);
    const onIce: Extract<CommandV7, { kind: "DISEMBARK" }> = {
      kind: "DISEMBARK",
      unitId: cargo,
      at: { x: 3, y: 7 },
    };
    const landings = queryPlayerCommandsV7(view).filter(
      (command) => command.kind === "DISEMBARK",
    );
    expect(landings).toContainEqual(onIce);
    expect(landings).toContainEqual({ ...onIce, at: { x: 2, y: 8 } });
    expect(iceLandingRejectedV7(view, toolsOf(view), onIce)).toBe(true);
    expect(
      iceLandingRejectedV7(view, toolsOf(view), {
        ...onIce,
        at: { x: 2, y: 8 },
      }),
    ).toBe(false);
    expect(candidates(view).map((item) => item.command)).not.toContainEqual(
      onIce,
    );
  });

  it("writes an icebound ship off and lands the crew of an icebound transport", () => {
    const base = frozenArenaV7(
      against(
        [
          { seat: 0, role: "FIGHTER", at: { x: 1, y: 2 } },
          { seat: 0, role: "PATROL_BOAT", at: { x: 8, y: 7 } },
          { seat: 0, role: "PATROL_BOAT", at: { x: 8, y: 4 } },
        ],
        [
          { at: { x: 2, y: 7 }, seat: 1 },
          { at: { x: 8, y: 7 }, seat: 1 },
        ],
      ),
    );
    const cargo = idAt(base, { x: 1, y: 2 });
    const state = patchNavalUnitV7(base, cargo, {
      at: { x: 2, y: 7 },
      form: "EMBARKED",
    });
    const view = viewOf(state);
    // The frozen boat is no ship of the fleet; the free one is.
    expect(
      navalFleetFactsV7(
        view,
        (owner) => owner !== view.viewer.id,
      ).ownPatrolBoats.map((unit) => unit.id),
    ).toEqual([idAt(state, { x: 8, y: 4 })]);
    expect(
      publicThreatenedTilesForPolicyV7(
        viewOf(state, 1),
        publicUnit(viewOf(state, 1), idAt(state, { x: 8, y: 7 })),
      ),
    ).toEqual([]);
    const land: Extract<CommandV7, { kind: "DISEMBARK" }> = {
      kind: "DISEMBARK",
      unitId: cargo,
      at: { x: 2, y: 8 },
    };
    expect(queryPlayerCommandsV7(view)).toContainEqual(land);
    expect(iceboundCrewLandingV7(view, toolsOf(view), land)).toBe(10);
    const best = bestOf(view, cargo);
    expect(best?.command.kind).toBe("DISEMBARK");
    expect(best?.score.priority).toBeGreaterThanOrEqual(
      ICE_CREW_LANDING_PRIORITY_V7,
    );
    const landed = acceptV7(state, 0, best?.command as CommandV7).state;
    expect(navalUnitV7(landed, cargo).form).toBe("LAND");
    expect(iceEntryV7(landed, navalUnitV7(landed, cargo).at)).toBeUndefined();
  });

  it("values the kill of the unit that holds thawing ice: the bridge breaks", () => {
    const { state, view } = scene(
      against(
        [
          { seat: 0, role: "MARKSMAN", at: { x: 3, y: 1 } },
          { seat: 1, role: "FIGHTER", at: { x: 3, y: 3 } },
        ],
        [
          { at: { x: 3, y: 3 }, seat: 1, turnsLeft: 1 },
          { at: { x: 3, y: 4 }, seat: 1, turnsLeft: 3 },
        ],
      ),
    );
    const archer = idAt(state, { x: 3, y: 1 });
    const holder = idAt(state, { x: 3, y: 3 });
    const weak = patchNavalUnitV7(state, holder, { hp: 1 });
    const weakView = viewOf(weak);
    const kill = queryCombatPreviewV7(weakView, archer, holder);
    const chip = queryCombatPreviewV7(view, archer, holder);
    if (kill === null || chip === null) throw new Error("no preview");
    expect(kill.defenderDies).toBe(true);
    expect(chip.defenderDies).toBe(false);
    expect(
      iceTargetBonusV7(
        weakView,
        toolsOf(weakView),
        publicUnit(weakView, holder),
        kill,
      ),
    ).toBe(ICE_EXPOSED_TARGET_VALUE_V7 + ICE_BRIDGE_BREAK_VALUE_V7);
    // A hit that does not kill leaves the holder on its tile.
    expect(
      iceTargetBonusV7(view, toolsOf(view), publicUnit(view, holder), chip),
    ).toBe(ICE_EXPOSED_TARGET_VALUE_V7);
    // The score of the attack carries it.
    const attack: CommandV7 = {
      kind: "ATTACK",
      unitId: archer,
      targetUnitId: holder,
    };
    const land = frozenArenaV7(
      against(
        [
          { seat: 0, role: "MARKSMAN", at: { x: 3, y: 1 } },
          { seat: 1, role: "FIGHTER", at: { x: 2, y: 2 } },
        ],
        [{ at: { x: 3, y: 4 }, seat: 1 }],
      ),
    );
    expect(idAt(land, { x: 2, y: 2 })).toBe(holder);
    const onLand = patchNavalUnitV7(land, holder, { hp: 1 });
    expect(
      scoreCommandV7(weakView, attack).strategicValue -
        scoreCommandV7(viewOf(onLand), attack).strategicValue,
    ).toBeGreaterThanOrEqual(
      ICE_EXPOSED_TARGET_VALUE_V7 + ICE_BRIDGE_BREAK_VALUE_V7,
    );
    // Why: the unit held the tile (ice never melts under a land unit); with
    // it dead the tile melts at its owner's End Turn, and the tile behind
    // it, with turns left, does not.
    const killed = acceptV7(weak, 0, attack);
    expect(killed.state.units.some((unit) => unit.id === holder)).toBe(false);
    const ended = acceptV7(killed.state, 0, { kind: "END_TURN" });
    const melt = acceptV7(ended.state, 1, { kind: "END_TURN" });
    expect(
      melt.events.flatMap((event) =>
        event.kind === "ICE_MELTED" ? event.tiles : [],
      ),
    ).toEqual([{ x: 3, y: 3 }]);
    // With the holder alive the same End Turn melts nothing.
    const held = acceptV7(acceptV7(weak, 0, { kind: "END_TURN" }).state, 1, {
      kind: "END_TURN",
    });
    expect(held.events.some((event) => event.kind === "ICE_MELTED")).toBe(
      false,
    );
  });

  it("changes nothing in a match without an Ice Folk seat", () => {
    const { state, view } = scene({
      factions: ["ORIGINAL", "UNDEAD"],
      units: [
        { seat: 0, role: "FIGHTER", at: { x: 2, y: 2 } },
        { seat: 0, role: "PATROL_BOAT", at: { x: 2, y: 3 } },
        { seat: 1, role: "PATROL_BOAT", at: { x: 8, y: 6 } },
      ],
    });
    const tools = toolsOf(view);
    expect(view.ice).toEqual([]);
    expect(planOf(view)).toBeNull();
    expect(iceHostileFreezersV7(view, tools)).toEqual([]);
    const boat = publicUnit(view, idAt(state, { x: 2, y: 3 }));
    for (const command of queryPlayerCommandsV7(view)) {
      const end = endOf(command);
      if (command.kind !== "MOVE" || end === undefined) continue;
      const actor = publicUnit(view, command.unitId);
      expect(iceShipMoveRejectedV7(view, tools, actor, end)).toBe(false);
      expect(iceMoveOntoHostileIceRejectedV7(view, tools, actor, end)).toBe(
        false,
      );
    }
    expect(iceFreezeReachesV7(view, tools, boat.at)).toBe(false);
  });
});
