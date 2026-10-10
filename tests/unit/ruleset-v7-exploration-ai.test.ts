import { describe, expect, it } from "vitest";
import {
  chooseNormalCommandV7,
  inspectNormalTacticalFactsV7,
  type NormalAiDecisionV7,
} from "../../src/ai/v7";
import {
  campaignPlanForPolicyV7,
  type CampaignFactsV7,
} from "../../src/ai/v7-campaign";
import {
  EXPLORATION_POCKET_RADIUS_V7,
  explorationGoalV7,
  explorationHomeDangerV7,
  explorationProfileV7,
  explorationScoutsWantedV7,
  explorationStretchesV7,
  explorationSurveyV7,
  type ExplorationFactsV7,
} from "../../src/ai/v7-exploration";
import {
  RULESET_7_ID,
  effectiveRoleRuleV7,
  unitId,
  viewForV7,
  type CityStateV7,
  type CoordV7,
  type FactionIdV7,
  type GameStateV7,
  type MatchSetupV7,
  type PlayerViewV7,
  type PublicUnitV7,
  type TechnologyIdV7,
  type UnitRoleIdV7,
  type UnitStateV7,
} from "../../src/engine/index";
import { checkedV7 } from "../fixtures/v7-builders";
import { revision15PlayableGameV7 } from "../fixtures/v7-revision13-map";

/**
 * The exploration plan (`pulp_wars-nc6`, `src/ai/v7-exploration.ts`): every
 * rule on a small hand-built state with fog. No test plays a match.
 *
 * The board is the seed-2 DRY_LAND 11 x 11 layout with every tile that is
 * not a settlement turned to Grass: seat 0's capital at (2, 8), seat 1's at
 * (2, 2). Seat 0 is the policy's seat and has its starting technologies
 * (no Engineering, no Shorecraft) unless a test adds one.
 */
const HOME = { x: 2, y: 8 } as const;
const ENEMY = { x: 2, y: 2 } as const;
const SIZE = 11;

const READY: UnitStateV7["activation"] = {
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
};

interface Piece {
  readonly seat: number;
  readonly role: UnitRoleIdV7;
  readonly at: CoordV7;
}

interface Arena {
  readonly pieces: readonly Piece[];
  /** Tiles seat 0 has not explored. */
  readonly fog: readonly CoordV7[];
  /** Villages kept (the board's four are removed otherwise). */
  readonly villages?: readonly CoordV7[];
  readonly mountains?: readonly CoordV7[];
  /** Technologies seat 0 has besides its starting ones. */
  readonly techs?: readonly TechnologyIdV7[];
  readonly factions?: readonly [FactionIdV7, FactionIdV7];
}

describe("ruleset-7 Normal AI exploration plan (pulp_wars-nc6)", () => {
  it("goes to the frontier that reveals the most, not to the nearest", () => {
    // One unexplored tile two steps east of the scout, and fifteen
    // unexplored tiles three steps north of it.
    const hole = [{ x: 10, y: 6 }];
    const state = arena({
      pieces: [{ seat: 0, role: "FIGHTER", at: { x: 7, y: 6 } }],
      fog: [...hole, ...block({ x: 6, y: 0 }, { x: 10, y: 2 })],
    });
    const scout = unitAt(state, { x: 7, y: 6 });
    const job = required(jobOf(state, scout.id));
    expect(job).toMatchObject({ job: "EXPLORE", safe: true });
    expect(job.at.y).toBe(3);
    const move = bestMove(decide(state), scout.id);
    expect(move.y).toBe(5);
    // With the block explored, the single tile is all that is left.
    const late = arena({
      pieces: [{ seat: 0, role: "FIGHTER", at: { x: 7, y: 6 } }],
      fog: hole,
    });
    expect(required(jobOf(late, scout.id)).at.x).toBe(9);
    expect(bestMove(decide(late), scout.id).x).toBe(8);
  });

  it("sends two scouts to different stretches of frontier", () => {
    const state = arena({
      pieces: [
        { seat: 0, role: "FIGHTER", at: { x: 6, y: 5 } },
        { seat: 0, role: "FIGHTER", at: { x: 6, y: 6 } },
      ],
      fog: [
        ...block({ x: 8, y: 0 }, { x: 10, y: 2 }),
        ...block({ x: 8, y: 8 }, { x: 10, y: 10 }),
      ],
    });
    const north = unitAt(state, { x: 6, y: 5 });
    const south = unitAt(state, { x: 6, y: 6 });
    const first = required(jobOf(state, north.id));
    const second = required(jobOf(state, south.id));
    expect(first.job).toBe("EXPLORE");
    expect(second.job).toBe("EXPLORE");
    // One goes to the block in the north-east, the other to the south-east.
    expect(Math.abs(first.at.y - second.at.y)).toBeGreaterThanOrEqual(4);
    const decision = decide(state);
    const up = first.at.y < second.at.y ? north : south;
    const down = up === north ? south : north;
    expect(bestMove(decision, up.id).y).toBeLessThan(up.at.y);
    expect(bestMove(decision, down.id).y).toBeGreaterThan(down.at.y);
  });

  it("keeps a scout out of a visible enemy's reach", () => {
    // The unexplored land lies east; a hostile Fighter stands on the
    // straight way to it (Move 1 and range 1: it reaches two tiles).
    const pieces: Piece[] = [{ seat: 0, role: "FIGHTER", at: { x: 5, y: 5 } }];
    const fog = block({ x: 9, y: 0 }, { x: 10, y: 10 });
    const open = arena({ pieces, fog });
    const scout = unitAt(open, { x: 5, y: 5 });
    // With nobody in the way the scout walks straight east.
    expect(bestMove(decide(open), scout.id).x).toBe(6);

    const hostile = { x: 8, y: 5 } as const;
    // (The enemy capital has its garrison: an empty one would be stormed.)
    const state = arena({
      pieces: [
        ...pieces,
        { seat: 1, role: "FIGHTER", at: hostile },
        { seat: 1, role: "FIGHTER", at: ENEMY },
      ],
      fog,
    });
    const job = required(jobOf(state, scout.id));
    expect(job).toMatchObject({ job: "EXPLORE", safe: true });
    expect(distance(job.at, hostile)).toBeGreaterThan(2);
    const decision = decide(state);
    // No Move the policy considers for the scout ends inside the reach.
    expect(movesOf(decision, scout.id).length).toBeGreaterThan(0);
    for (const at of movesOf(decision, scout.id))
      expect(distance(at, hostile), `${at.x},${at.y}`).toBeGreaterThan(2);
    // It still explores: around the enemy, toward its frontier tile.
    const move = bestMove(decision, scout.id);
    expect(move.x).toBeLessThan(6);
    expect(Math.abs(move.y - job.at.y)).toBeLessThan(
      Math.abs(scout.at.y - job.at.y),
    );
  });

  it("meets the enemy with company before an enemy city is known", () => {
    // No enemy city is known (the north-west is unexplored), and every
    // frontier tile lies inside the reach of one of three hostile Fighters.
    const fog = block({ x: 0, y: 0 }, { x: 4, y: 2 });
    const hostiles: Piece[] = [
      { seat: 1, role: "FIGHTER", at: { x: 1, y: 4 } },
      { seat: 1, role: "FIGHTER", at: { x: 4, y: 4 } },
      { seat: 1, role: "FIGHTER", at: { x: 6, y: 1 } },
    ];
    const reached = (at: CoordV7): boolean =>
      hostiles.some((hostile) => distance(hostile.at, at) <= 2);
    const lone = arena({
      pieces: [{ seat: 0, role: "FIGHTER", at: { x: 4, y: 7 } }, ...hostiles],
      fog,
    });
    const scout = unitAt(lone, { x: 4, y: 7 });
    // The first scout still goes (the rule from before the plan), to the
    // nearest frontier: no route is safe.
    const job = required(jobOf(lone, scout.id));
    expect(job.job).toBe("EXPLORE");
    expect(job.safe).toBeUndefined();
    // Alone, it does not step into the reach.
    for (const at of movesOf(decide(lone), scout.id))
      expect(reached(at), `${at.x},${at.y}`).toBe(false);
    // With an own fighting unit within three tiles of the tile it steps
    // onto, it is not alone there, and goes.
    const company = arena({
      pieces: [
        { seat: 0, role: "FIGHTER", at: { x: 4, y: 7 } },
        ...hostiles,
        { seat: 0, role: "FIGHTER", at: { x: 5, y: 6 } },
      ],
      fog,
    });
    expect(required(jobOf(company, scout.id)).job).toBe("EXPLORE");
    expect(movesOf(decide(company), scout.id).some(reached)).toBe(true);
  });

  it("counts Glide on the seat's own Snow", () => {
    // Two pockets of nine unexplored tiles, each four steps from the unit
    // at (1, 8): north of it, and east of it across the capital's land.
    const fog = [
      ...block({ x: 0, y: 1 }, { x: 2, y: 3 }),
      ...block({ x: 6, y: 7 }, { x: 8, y: 9 }),
    ];
    const goalOf = (factions: readonly [FactionIdV7, FactionIdV7]) => {
      const view = viewFor(
        arena({
          factions,
          pieces: [{ seat: 0, role: "FIGHTER", at: { x: 1, y: 8 } }],
          fog,
        }),
      );
      return {
        view,
        goal: required(
          explorationGoalV7(
            view,
            explorationSurveyV7(view, factsFor(view)),
            required(view.units[0]),
            {
              taken: new Uint8Array(SIZE * SIZE),
              tiers: [],
              home: () => false,
              allowUnsafe: false,
            },
          ),
        ),
      };
    };
    // A Human Fighter needs four turns either way and takes the first.
    expect(goalOf(["ORIGINAL", "ORIGINAL"]).goal.at.y).toBe(4);
    // The Ice Folk capital's land is Snow: the Yeti glides across it, is
    // east a turn sooner, and goes east.
    const ice = goalOf(["ICE_FOLK", "ORIGINAL"]);
    const snowAt = (at: CoordV7): boolean => {
      const tile = required(
        ice.view.board.tiles.find((item) => same(item.at, at)),
      );
      return tile.explored && tile.snow === true;
    };
    expect(snowAt({ x: 1, y: 8 })).toBe(true);
    expect(snowAt({ x: 3, y: 8 })).toBe(true);
    expect(snowAt({ x: 4, y: 8 })).toBe(false);
    expect(ice.goal.at.x).toBe(5);
  });

  it("stops exploring when no unexplored land can be reached", () => {
    // The unexplored corner lies behind Mountains (no Engineering).
    const wall = [
      ...block({ x: 7, y: 7 }, { x: 10, y: 7 }),
      ...block({ x: 7, y: 8 }, { x: 7, y: 10 }),
    ];
    const state = arena({
      pieces: [{ seat: 0, role: "FIGHTER", at: { x: 5, y: 6 } }],
      fog: block({ x: 9, y: 9 }, { x: 10, y: 10 }),
      mountains: wall,
    });
    const scout = unitAt(state, { x: 5, y: 6 });
    // No exploration job: the unit marches on the known enemy city.
    expect(required(jobOf(state, scout.id))).toMatchObject({
      job: "ATTACK",
      at: ENEMY,
    });
    // With Engineering the Mountains are a road, and it scouts.
    const climbing = arena({
      pieces: [{ seat: 0, role: "FIGHTER", at: { x: 5, y: 6 } }],
      fog: block({ x: 9, y: 9 }, { x: 10, y: 10 }),
      mountains: wall,
      techs: ["DRILL", "ENGINEERING"],
    });
    expect(required(jobOf(climbing, scout.id)).job).toBe("EXPLORE");
  });

  it("stops exploring when the only unexplored land lies under the enemy", () => {
    const pieces: Piece[] = [{ seat: 0, role: "FIGHTER", at: { x: 5, y: 6 } }];
    const fog = block({ x: 9, y: 4 }, { x: 10, y: 6 });
    const open = arena({ pieces, fog });
    const scout = unitAt(open, { x: 5, y: 6 });
    expect(required(jobOf(open, scout.id)).job).toBe("EXPLORE");
    // A hostile Fighter beside that frontier: every tile next to the
    // unexplored land is inside its reach.
    const held = arena({
      pieces: [...pieces, { seat: 1, role: "FIGHTER", at: { x: 8, y: 5 } }],
      fog,
    });
    expect(required(jobOf(held, scout.id)).job).toBe("ATTACK");
  });

  it("stops exploring while the enemy outweighs the units at home", () => {
    const fog = block({ x: 8, y: 0 }, { x: 10, y: 10 });
    const own: Piece[] = [
      { seat: 0, role: "FIGHTER", at: HOME },
      { seat: 0, role: "FIGHTER", at: { x: 6, y: 6 } },
    ];
    const calm = arena({ pieces: own, fog });
    const scout = unitAt(calm, { x: 6, y: 6 });
    expect(required(jobOf(calm, scout.id)).job).toBe("EXPLORE");
    // Two hostile Fighters three tiles from the capital, one Fighter on it.
    const pressed = arena({
      pieces: [
        ...own,
        { seat: 1, role: "FIGHTER", at: { x: 4, y: 5 } },
        { seat: 1, role: "FIGHTER", at: { x: 5, y: 5 } },
      ],
      fog,
    });
    expect(jobOf(pressed, scout.id)?.job).not.toBe("EXPLORE");
  });

  it("weighs the danger at home by unit strength", () => {
    const state = arena({
      pieces: [
        { seat: 0, role: "FIGHTER", at: HOME },
        { seat: 0, role: "FIGHTER", at: { x: 3, y: 8 } },
        { seat: 1, role: "FIGHTER", at: { x: 4, y: 6 } },
        { seat: 1, role: "FIGHTER", at: { x: 9, y: 2 } },
      ],
      fog: [],
    });
    const view = viewFor(state);
    const mine = view.units.filter((unit) => unit.ownerId === view.viewer.id);
    const theirs = view.units.filter((unit) => unit.ownerId !== view.viewer.id);
    const danger = (own: readonly PublicUnitV7[]): boolean =>
      explorationHomeDangerV7({
        ownCenters: [HOME],
        hostiles: theirs,
        own,
        strength: (unit) => unit.hp,
      });
    // Two units at home against one enemy within three tiles: no danger.
    expect(danger(mine)).toBe(false);
    // One against one: the bodies are needed. (The enemy seven tiles away
    // counts for nothing.)
    expect(danger(mine.slice(0, 1))).toBe(true);
    expect(danger([])).toBe(true);
  });

  it("keeps more scouts while much of the map is unexplored", () => {
    // Nine Fighters of a seat that no longer expands, the enemy city
    // known, and the eastern six columns unexplored (more than half).
    const pieces: Piece[] = block({ x: 1, y: 6 }, { x: 3, y: 9 })
      .filter((at) => !same(at, HOME))
      .slice(0, 9)
      .map((at) => ({ seat: 0, role: "FIGHTER", at }));
    const wide = arena({
      pieces,
      fog: block({ x: 5, y: 0 }, { x: 10, y: 10 }),
    });
    const scoutsOf = (state: GameStateV7): number =>
      [...plan(state, { expanding: false }).assignmentByUnitId.values()].filter(
        (item) => item.job === "EXPLORE",
      ).length;
    expect(scoutsOf(wide)).toBe(3);
    // Two columns left (under a fifth of the map): one scout, as before.
    const narrow = arena({
      pieces,
      fog: block({ x: 9, y: 0 }, { x: 10, y: 10 }),
    });
    expect(scoutsOf(narrow)).toBe(1);
    // Three Fighters: one scout, however dark the map.
    const small = arena({
      pieces: pieces.slice(0, 3),
      fog: block({ x: 8, y: 0 }, { x: 10, y: 10 }),
    });
    expect(scoutsOf(small)).toBe(1);
    // Everybody else still marches on the known city.
    const jobs = [
      ...plan(wide, { expanding: false }).assignmentByUnitId.values(),
    ].map((item) => item.job);
    expect(jobs.filter((job) => job === "ATTACK")).toHaveLength(6);
  });

  it("counts the scouts by share, stretches, and army", () => {
    const state = arena({
      pieces: [{ seat: 0, role: "FIGHTER", at: { x: 3, y: 8 } }],
      fog: block({ x: 5, y: 0 }, { x: 10, y: 10 }),
    });
    const survey = surveyOf(state);
    expect(survey.unexplored).toBe(66);
    expect(survey.share).toBe(54);
    const stretches = explorationStretchesV7(survey, () => true, 4);
    expect(stretches).toBe(3);
    expect(explorationScoutsWantedV7(survey, stretches, 9)).toBe(3);
    expect(explorationScoutsWantedV7(survey, stretches, 6)).toBe(2);
    expect(explorationScoutsWantedV7(survey, stretches, 2)).toBe(1);
    expect(explorationScoutsWantedV7(survey, 1, 9)).toBe(1);
    expect(explorationScoutsWantedV7(survey, 0, 9)).toBe(0);
    // A frontier nobody can reach is no stretch.
    expect(explorationStretchesV7(survey, () => false, 4)).toBe(0);
    const explored = surveyOf(
      arena({
        pieces: [{ seat: 0, role: "FIGHTER", at: { x: 3, y: 8 } }],
        fog: [],
      }),
    );
    expect(explored.unexplored).toBe(0);
    expect(explorationScoutsWantedV7(explored, 3, 9)).toBe(0);
  });

  it("sends the scout to a village nobody else can walk to", () => {
    // The scout has just revealed the village at (8, 8); the land beyond
    // is still unexplored.
    const fog = block({ x: 10, y: 0 }, { x: 10, y: 10 });
    const village = { x: 8, y: 8 } as const;
    const alone = arena({
      pieces: [{ seat: 0, role: "FIGHTER", at: { x: 6, y: 7 } }],
      fog,
      villages: [village],
    });
    const scout = unitAt(alone, { x: 6, y: 7 });
    expect(required(jobOf(alone, scout.id))).toMatchObject({
      job: "VILLAGE",
      at: village,
    });
    expect(distance(bestMove(decide(alone), scout.id), village)).toBe(1);
    // With a second capturer, one unit takes the village and the other
    // goes on exploring.
    const pair = arena({
      pieces: [
        { seat: 0, role: "FIGHTER", at: { x: 6, y: 7 } },
        { seat: 0, role: "FIGHTER", at: { x: 5, y: 7 } },
      ],
      fog,
      villages: [village],
    });
    const jobs = [
      required(jobOf(pair, unitAt(pair, { x: 6, y: 7 }).id)).job,
      required(jobOf(pair, unitAt(pair, { x: 5, y: 7 }).id)).job,
    ].sort();
    expect(jobs).toEqual(["EXPLORE", "VILLAGE"]);
  });

  it("plans the same whatever the unexplored tiles hide", () => {
    const fog = block({ x: 7, y: 0 }, { x: 10, y: 10 });
    const own: Piece[] = [
      { seat: 0, role: "FIGHTER", at: { x: 4, y: 6 } },
      { seat: 0, role: "FIGHTER", at: { x: 4, y: 8 } },
    ];
    const empty = arena({ pieces: own, fog });
    // A village, Mountains, and a hostile army on tiles seat 0 has not
    // explored.
    const hidden = arena({
      pieces: [
        ...own,
        { seat: 1, role: "FIGHTER", at: { x: 8, y: 6 } },
        { seat: 1, role: "FIGHTER", at: { x: 8, y: 7 } },
        { seat: 1, role: "FIGHTER", at: { x: 7, y: 8 } },
      ],
      fog,
      villages: [
        { x: 8, y: 8 },
        { x: 8, y: 5 },
      ],
      mountains: block({ x: 9, y: 0 }, { x: 10, y: 4 }),
    });
    expect(inspectNormalTacticalFactsV7(viewFor(hidden)).campaign).toEqual(
      inspectNormalTacticalFactsV7(viewFor(empty)).campaign,
    );
    for (const unit of empty.units)
      expect(movesOf(decide(hidden), unit.id)).toEqual(
        movesOf(decide(empty), unit.id),
      );
  });

  it("keeps the group behind a first scout that crosses Mountains", () => {
    // An Ice Folk seat that no longer expands, no enemy city known: two
    // Yetis scout and the third follows the first, as a group did before.
    const state = arena({
      factions: ["ICE_FOLK", "ORIGINAL"],
      pieces: [
        { seat: 0, role: "FIGHTER", at: { x: 3, y: 7 } },
        { seat: 0, role: "FIGHTER", at: { x: 3, y: 8 } },
        { seat: 0, role: "FIGHTER", at: { x: 3, y: 9 } },
      ],
      fog: block({ x: 0, y: 0 }, { x: 4, y: 4 }),
    });
    const jobs = [
      ...plan(state, { expanding: false }).assignmentByUnitId.values(),
    ];
    expect(jobs.map((job) => job.job)).toEqual([
      "EXPLORE",
      "EXPLORE",
      "EXPLORE",
    ]);
    expect(jobs[2]).toBe(jobs[0]);
    expect(jobs[1]?.at).not.toEqual(jobs[0]?.at);
  });

  it("reads each unit's own movement and Sight", () => {
    const human = viewFor(
      arena({
        pieces: [
          { seat: 0, role: "FIGHTER", at: { x: 3, y: 8 } },
          { seat: 0, role: "RAIDER", at: { x: 3, y: 9 } },
        ],
        fog: [],
      }),
    );
    const profile = (view: PlayerViewV7, at: CoordV7) =>
      explorationProfileV7(
        view,
        required(view.units.find((unit) => same(unit.at, at))),
      );
    expect(profile(human, { x: 3, y: 8 })).toEqual({
      terrain: "GROUND",
      move: 1,
      glides: false,
      sight: 1,
    });
    // The mounted scout: Move 2, Sight 2.
    expect(profile(human, { x: 3, y: 9 })).toMatchObject({
      terrain: "GROUND",
      move: 2,
      sight: 2,
    });
    const dwarf = viewFor(
      arena({
        factions: ["DWARF", "ORIGINAL"],
        pieces: [{ seat: 0, role: "RAIDER", at: { x: 3, y: 8 } }],
        fog: [],
      }),
    );
    // The Gyrocopter flies.
    expect(profile(dwarf, { x: 3, y: 8 }).terrain).toBe("FLY");
    const ice = viewFor(
      arena({
        factions: ["ICE_FOLK", "ORIGINAL"],
        pieces: [
          { seat: 0, role: "FIGHTER", at: { x: 3, y: 8 } },
          { seat: 0, role: "KNIGHT", at: { x: 3, y: 9 } },
        ],
        fog: [],
      }),
    );
    // The Yeti is Mountain-born and glides; the Sabretooth does neither.
    expect(profile(ice, { x: 3, y: 8 })).toMatchObject({
      terrain: "MOUNTAIN",
      glides: true,
    });
    expect(profile(ice, { x: 3, y: 9 })).toMatchObject({
      terrain: "GROUND",
      glides: false,
    });
  });

  it("sends a flyer over Mountains no walking scout can cross", () => {
    // A wall of Mountains across the board, the land behind it unexplored
    // but for the wall itself; no Engineering.
    const wall = block({ x: 7, y: 0 }, { x: 7, y: 10 });
    const fog = block({ x: 8, y: 0 }, { x: 10, y: 10 });
    const state = arena({
      factions: ["DWARF", "ORIGINAL"],
      pieces: [
        { seat: 0, role: "RAIDER", at: { x: 5, y: 6 } },
        { seat: 0, role: "FIGHTER", at: { x: 5, y: 7 } },
      ],
      fog,
      mountains: wall,
    });
    const gyrocopter = unitAt(state, { x: 5, y: 6 });
    const hammerer = unitAt(state, { x: 5, y: 7 });
    const job = required(jobOf(state, gyrocopter.id));
    expect(job).toMatchObject({ job: "EXPLORE", safe: true });
    expect(job.at.x).toBe(7);
    // The walker has no frontier it can stand on.
    expect(required(jobOf(state, hammerer.id)).job).toBe("ATTACK");
    const move = bestMove(decide(state), gyrocopter.id);
    expect(move.x).toBeGreaterThan(gyrocopter.at.x);
  });

  it("sees farther from a Mountain with Engineering", () => {
    // Two frontier tiles the same distance from the scout, one of them a
    // Mountain: with Engineering it shows a second row of tiles.
    const peak = { x: 7, y: 4 } as const;
    const state = arena({
      pieces: [{ seat: 0, role: "FIGHTER", at: { x: 5, y: 5 } }],
      fog: block({ x: 8, y: 0 }, { x: 10, y: 10 }),
      mountains: [peak],
      techs: ["DRILL", "ENGINEERING"],
    });
    const view = viewFor(state);
    const survey = explorationSurveyV7(view, factsFor(view));
    const index = peak.y * SIZE + peak.x;
    expect(survey.frontier("GROUND")).toContain(index);
    expect(survey.unexploredWithin(index, 1)).toBe(3);
    expect(survey.unexploredWithin(index, 2)).toBe(10);
    expect(survey.unexploredWithin(index, EXPLORATION_POCKET_RADIUS_V7)).toBe(
      21,
    );
    const scout = required(view.units[0]);
    const goal = required(
      explorationGoalV7(view, survey, scout, {
        taken: new Uint8Array(SIZE * SIZE),
        tiers: [],
        home: () => false,
        allowUnsafe: false,
      }),
    );
    expect(goal.at).toEqual(peak);
    expect(goal.safe).toBe(true);
    expect(goal.steps[scout.at.y * SIZE + scout.at.x]).toBe(2);
  });
});

function factsFor(view: PlayerViewV7): ExplorationFactsV7 {
  return {
    isHostile: (ownerId) => ownerId !== view.viewer.id,
    isAllied: () => false,
    confine: null,
  };
}

function setup(factions: readonly [FactionIdV7, FactionIdV7]): MatchSetupV7 {
  return {
    rulesetId: RULESET_7_ID,
    seed: 2,
    width: SIZE,
    height: SIZE,
    aiCount: 1,
    aiDifficulty: "NORMAL",
    aiMode: "RIVAL",
    humanColor: "CORAL",
    factions: [...factions],
    allowDuplicateFactions: true,
    mapType: "DRY_LAND",
    mapGenerationRevision: "REGIONAL_BIOMES_NAVAL_V4",
    curiosities: false,
  };
}

/** The flattened seed-2 board with seat 0 active and the given pieces. */
function arena(options: Arena): GameStateV7 {
  const base = revision15PlayableGameV7(
    setup(options.factions ?? ["ORIGINAL", "ORIGINAL"]),
  ).state;
  const seat = (index: number) =>
    required(base.players.find((player) => player.seat === index));
  let nextEntityId = base.nextEntityId;
  const units = options.pieces.map((piece): UnitStateV7 => {
    const owner = seat(piece.seat);
    const rule = effectiveRoleRuleV7(piece.role, owner.faction);
    const id = unitId(nextEntityId);
    nextEntityId += 1;
    return {
      id,
      ownerId: owner.id,
      homeCityId:
        base.cities.find((city) => city.ownerId === owner.id)?.id ?? null,
      role: piece.role,
      form: "LAND",
      at: piece.at,
      hp: rule.maxHp,
      maxHp: rule.maxHp,
      kills: 0,
      veteran: false,
      captureEligible: false,
      activation: READY,
    };
  });
  const every: CoordV7[] = [];
  for (let y = 0; y < SIZE; y += 1)
    for (let x = 0; x < SIZE; x += 1) every.push({ x, y });
  const mountains = options.mountains ?? [];
  const villages = options.villages ?? [];
  const mountain = required(
    base.board.tiles.find(
      (tile) => tile.terrain === "MOUNTAIN" && tile.resource === null,
    ),
  );
  const fog = options.fog;
  return checkedV7({
    ...base,
    nextEntityId,
    activeSeatIndex: base.turnOrder.indexOf(seat(0).id),
    players: base.players.map((player) => ({
      ...player,
      researchedTechs:
        player.seat === 0
          ? [...player.researchedTechs, ...(options.techs ?? [])]
          : player.researchedTechs,
      coins: 0,
      explored:
        player.seat === 0
          ? every.filter((at) => !fog.some((hidden) => same(hidden, at)))
          : every,
    })),
    cities: base.cities.map((city): CityStateV7 => ({
      ...city,
      cityActionAvailable: false,
    })),
    units,
    treasureChests: [],
    board: {
      ...base.board,
      tiles: base.board.tiles.map((tile) => {
        const plain = {
          biome: tile.biome ?? ("PLAINS" as const),
          resource: null,
          improvement: null,
          road: false,
          fieldDefense: false,
        };
        if (mountains.some((at) => same(at, tile.at)))
          return {
            ...mountain,
            at: tile.at,
            territoryCityId: tile.territoryCityId,
          };
        if (tile.site === "VILLAGE")
          return villages.some((at) => same(at, tile.at))
            ? tile
            : { ...tile, ...plain, terrain: "GRASS" as const, site: null };
        return tile.site === null
          ? { ...tile, ...plain, terrain: "GRASS" as const }
          : tile;
      }),
    },
  });
}

/** Every tile of the rectangle from `from` to `to`, both included. */
function block(from: CoordV7, to: CoordV7): CoordV7[] {
  const result: CoordV7[] = [];
  for (let y = from.y; y <= to.y; y += 1)
    for (let x = from.x; x <= to.x; x += 1) result.push({ x, y });
  return result;
}

function viewFor(state: GameStateV7): PlayerViewV7 {
  return viewForV7(state, required(state.turnOrder[state.activeSeatIndex]));
}

function surveyOf(state: GameStateV7) {
  const view = viewFor(state);
  return explorationSurveyV7(view, factsFor(view));
}

function decide(state: GameStateV7): NormalAiDecisionV7 {
  return chooseNormalCommandV7(viewFor(state));
}

function jobOf(state: GameStateV7, id: UnitStateV7["id"]) {
  return inspectNormalTacticalFactsV7(viewFor(state)).campaign.assignments.find(
    (item) => item.unitId === id,
  );
}

/** The campaign plan of an army seat with the given facts. */
function plan(state: GameStateV7, army: { readonly expanding: boolean }) {
  const view = viewFor(state);
  const facts: CampaignFactsV7 = {
    isHostile: (ownerId) => ownerId !== view.viewer.id,
    isAllied: () => false,
    keepsObjective: () => false,
    freeLandSlots: 0,
    seaTarget: null,
    army: {
      holds: () => false,
      slowMelee: () => false,
      strength: (unit) => unit.hp,
      expanding: army.expanding,
    },
  };
  return campaignPlanForPolicyV7(view, facts);
}

/** The end tile of the policy's best Move for the unit. */
function bestMove(
  decision: NormalAiDecisionV7,
  id: UnitStateV7["id"],
): CoordV7 {
  return required(movesOf(decision, id)[0]);
}

/** The end tiles of every Move the policy considers for the unit. */
function movesOf(
  decision: NormalAiDecisionV7,
  id: UnitStateV7["id"],
): CoordV7[] {
  return decision.candidates.flatMap((candidate) =>
    candidate.command.kind === "MOVE" &&
    candidate.command.unitId === id &&
    candidate.score.priority >= 0
      ? [required(candidate.command.path.at(-1))]
      : [],
  );
}

function unitAt(state: GameStateV7, at: CoordV7): UnitStateV7 {
  return required(state.units.find((unit) => same(unit.at, at)));
}

function required<T>(value: T | undefined | null): T {
  if (value === undefined || value === null)
    throw new Error("fixture value missing");
  return value;
}

function same(left: CoordV7, right: CoordV7): boolean {
  return left.x === right.x && left.y === right.y;
}

function distance(left: CoordV7, right: CoordV7): number {
  return Math.max(Math.abs(left.x - right.x), Math.abs(left.y - right.y));
}
