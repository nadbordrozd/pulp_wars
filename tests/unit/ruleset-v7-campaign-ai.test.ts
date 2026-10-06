import { describe, expect, it } from "vitest";
import {
  chooseNormalCommandV7,
  inspectNormalTacticalFactsV7,
  type NormalAiDecisionV7,
} from "../../src/ai/v7";
import {
  RULESET_7_ID,
  TECHNOLOGY_IDS_V7,
  effectiveRoleRuleV7,
  unitId,
  viewForV7,
  type CityStateV7,
  type CoordV7,
  type GameStateV7,
  type MatchSetupV7,
  type PlayerViewV7,
  type TechnologyIdV7,
  type UnitRoleIdV7,
  type UnitStateV7,
} from "../../src/engine/index";
import { checkedV7 } from "../fixtures/v7-builders";
import { goblinArenaV7 } from "../fixtures/v7-goblin-arena";
import { revision15PlayableGameV7 } from "../fixtures/v7-revision13-map";

// The seed-2 DRY_LAND Human-mirror board (11 x 11): seat 0 capital (2, 8),
// seat 1 capital (2, 2); neutral villages at (5, 2), (2, 5), (8, 5), (8, 8).
const HOME = { x: 2, y: 8 } as const;
const ENEMY = { x: 2, y: 2 } as const;

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
  /** Keep the four neutral villages (default: removed). */
  readonly villages?: boolean;
  /** Tiles turned into Mountains (seat 0 has no Engineering then). */
  readonly mountains?: readonly CoordV7[];
  /** Seat 0's explored tiles (default: the whole board). */
  readonly explored?: readonly CoordV7[];
  readonly coins?: number;
  /** Seat 0's capital may still use its city action. */
  readonly cityAction?: boolean;
}

describe("ruleset-7 Normal AI campaign (pulp_wars-9s0.1)", () => {
  it("keeps a known enemy city as a standing objective after losses", () => {
    const home: Piece = { seat: 0, role: "FIGHTER", at: { x: 3, y: 8 } };
    const front: Piece[] = [
      { seat: 0, role: "FIGHTER", at: { x: 2, y: 4 } },
      { seat: 0, role: "FIGHTER", at: { x: 3, y: 4 } },
    ];
    // The enemy city is explored, not visible: no own unit is near it.
    const before = arena({ pieces: [home, ...front] });
    const after = arena({ pieces: [home] });
    for (const state of [before, after]) {
      const fresh = unitAt(state, home.at);
      expect(jobOf(state, fresh.id)).toMatchObject({
        job: "ATTACK",
        at: ENEMY,
      });
      expect(campaign(state).atWar).toBe(true);
    }
    // While the wave is out, the fresh unit follows it at once.
    const follow = bestMove(decide(before), unitAt(before, home.at).id);
    expect(distance(follow, ENEMY)).toBeLessThan(distance(home.at, ENEMY));
    // With every unit at the front lost, the next wave forms at home (the
    // capital holds three units) and sets out again.
    expect(campaign(after).targets).toEqual([
      expect.objectContaining({ assigned: 1, home: 1, needed: 3, push: false }),
    ]);
    const others: Piece[] = [
      { seat: 0, role: "FIGHTER", at: { x: 3, y: 9 } },
      { seat: 0, role: "FIGHTER", at: { x: 2, y: 9 } },
    ];
    const wave = arena({ pieces: [home, ...others] });
    expect(campaign(wave).targets).toEqual([
      expect.objectContaining({ assigned: 3, home: 3, needed: 3, push: true }),
    ]);
    for (const piece of [home, ...others]) {
      const to = bestMove(decide(wave), unitAt(wave, piece.at).id);
      expect(distance(to, ENEMY)).toBeLessThan(distance(piece.at, ENEMY));
    }
  });

  it("marches around an obstacle toward a known enemy city", () => {
    // A mountain wall across the board with one gap at (8, 5). No step
    // from (5, 6) is closer to the city in a straight line.
    const wall: CoordV7[] = [];
    for (let x = 0; x <= 7; x += 1) wall.push({ x, y: 5 });
    const state = arena({
      pieces: [{ seat: 0, role: "FIGHTER", at: { x: 5, y: 6 } }],
      mountains: wall,
    });
    const fighter = unitAt(state, { x: 5, y: 6 });
    expect(jobOf(state, fighter.id)).toMatchObject({ job: "ATTACK" });
    let current = state;
    let at: CoordV7 = fighter.at;
    // It walks east along the wall, through the gap, and back to the city.
    for (let turn = 0; turn < 20 && distance(at, ENEMY) > 3; turn += 1) {
      at = bestMove(decide(current), fighter.id);
      current = relocate(current, fighter.id, at);
    }
    expect(distance(at, ENEMY)).toBe(3);
    expect(at.y).toBeLessThan(5);
  });

  it("sets out in waves instead of one unit at a time", () => {
    const first: Piece = { seat: 0, role: "FIGHTER", at: { x: 3, y: 8 } };
    // One unit at home, and the capital can still train another: it waits
    // inside the home zone (two tiles around the capital).
    const alone = arena({ pieces: [first] });
    const waiting = movesOf(decide(alone), unitAt(alone, first.at).id);
    expect(waiting.every((to) => distance(to, HOME) <= 2)).toBe(true);
    // One unit out is not a wave: the unit at home still waits.
    const scout: Piece = { seat: 0, role: "FIGHTER", at: { x: 2, y: 4 } };
    const scouted = arena({ pieces: [first, scout] });
    expect(campaign(scouted).targets).toEqual([
      expect.objectContaining({ home: 1, out: 1, push: false }),
    ]);
    expect(
      movesOf(decide(scouted), unitAt(scouted, first.at).id).every(
        (to) => distance(to, HOME) <= 2,
      ),
    ).toBe(true);
    // The unit that is out keeps marching.
    expect(
      distance(bestMove(decide(scouted), unitAt(scouted, scout.at).id), ENEMY),
    ).toBeLessThan(distance(scout.at, ENEMY));
  });

  it("gives land production a standing share while at war", () => {
    const trainPriority = (state: GameStateV7) =>
      decide(state).candidates.find(
        (candidate) => candidate.command.kind === "TRAIN",
      )?.score.priority;
    const one: Piece[] = [{ seat: 0, role: "FIGHTER", at: { x: 3, y: 8 } }];
    // A level-1 capital holds two units: one of two is under two thirds.
    const short = arena({ pieces: one, coins: 20, cityAction: true });
    expect(campaign(short)).toMatchObject({ atWar: true, warTraining: true });
    expect(trainPriority(short)).toBe(1205);
    // Before any enemy city is known, production keeps its old place.
    const peace = arena({
      pieces: one,
      coins: 20,
      cityAction: true,
      explored: around(HOME, 2),
    });
    expect(campaign(peace)).toMatchObject({ atWar: false, warTraining: false });
    expect(trainPriority(peace)).toBe(1080);
  });

  it("sends the nearest capturer to every unclaimed village", () => {
    const state = arena({
      villages: true,
      pieces: [
        { seat: 0, role: "FIGHTER", at: { x: 3, y: 8 } },
        { seat: 0, role: "FIGHTER", at: { x: 7, y: 8 } },
        { seat: 0, role: "CAPTAIN", at: { x: 3, y: 9 } },
      ],
    });
    expect(jobOf(state, unitAt(state, { x: 3, y: 8 }).id)).toMatchObject({
      job: "VILLAGE",
      at: { x: 2, y: 5 },
    });
    expect(jobOf(state, unitAt(state, { x: 7, y: 8 }).id)).toMatchObject({
      job: "VILLAGE",
      at: { x: 8, y: 8 },
    });
    // A unit that cannot capture marches on the enemy city instead.
    expect(jobOf(state, unitAt(state, { x: 3, y: 9 }).id)).toMatchObject({
      job: "ATTACK",
      at: ENEMY,
    });
  });

  it("scouts the frontier in two directions before an enemy is known", () => {
    const state = arena({
      pieces: [
        { seat: 0, role: "FIGHTER", at: { x: 2, y: 7 } },
        { seat: 0, role: "FIGHTER", at: { x: 3, y: 8 } },
        { seat: 0, role: "FIGHTER", at: { x: 3, y: 9 } },
      ],
      explored: around(HOME, 2),
    });
    const jobs = campaign(state).assignments;
    expect(jobs.map((item) => item.job)).toEqual([
      "EXPLORE",
      "EXPLORE",
      "EXPLORE",
    ]);
    const [first, second, third] = jobs.map((item) => item.at);
    // Two scouts take stretches of frontier at least four tiles apart; the
    // third unit follows the first scout.
    expect(distance(required(first), required(second))).toBeGreaterThanOrEqual(
      4,
    );
    expect(third).toEqual(first);
    const scout = unitAt(state, { x: 2, y: 7 });
    const goal = required(jobOf(state, scout.id)).at;
    expect(
      distance(bestMove(decide(state), scout.id), goal),
    ).toBeLessThanOrEqual(distance(scout.at, goal));
  });

  it("engages a hostile unit next to an own city", () => {
    const state = arena({
      pieces: [
        { seat: 1, role: "FIGHTER", at: { x: 4, y: 8 } },
        { seat: 0, role: "FIGHTER", at: { x: 2, y: 6 } },
        { seat: 0, role: "FIGHTER", at: { x: 9, y: 1 } },
      ],
    });
    expect(jobOf(state, unitAt(state, { x: 2, y: 6 }).id)).toMatchObject({
      job: "DEFEND",
      at: { x: 4, y: 8 },
    });
    // A unit far from home keeps its target.
    expect(jobOf(state, unitAt(state, { x: 9, y: 1 }).id)).toMatchObject({
      job: "ATTACK",
    });
  });

  it("keeps the garrison on a center while a defender engages the invader", () => {
    const state = arena({
      pieces: [
        { seat: 1, role: "FIGHTER", at: { x: 4, y: 8 } },
        { seat: 0, role: "GUARD", at: HOME },
        { seat: 0, role: "GUARD", at: { x: 3, y: 7 } },
      ],
    });
    // The Guard on the center has no job and makes no Move off it.
    const garrison = unitAt(state, HOME);
    expect(jobOf(state, garrison.id)).toBeUndefined();
    expect(movesOf(decide(state), garrison.id)).toEqual([]);
    // The Guard next to it engages the Fighter two tiles from the center.
    expect(jobOf(state, unitAt(state, { x: 3, y: 7 }).id)).toMatchObject({
      job: "DEFEND",
      at: { x: 4, y: 8 },
    });
  });

  it("opens a front against every hostile seat in reach", () => {
    // Three seats (14 x 14): the viewer's capital (2, 2), hostile capitals
    // (11, 2) and (11, 11). Vampires (the Undead Knight role) cannot
    // capture, so the villages are no errand of theirs. (The Human Knight
    // captures since tuning 2, 7r47.)
    const state = goblinArenaV7(
      ["UNDEAD", "ORIGINAL", "ORIGINAL"],
      [
        { seat: 0, role: "KNIGHT", at: { x: 3, y: 2 } },
        { seat: 0, role: "KNIGHT", at: { x: 3, y: 3 } },
        { seat: 0, role: "KNIGHT", at: { x: 2, y: 3 } },
        { seat: 0, role: "KNIGHT", at: { x: 1, y: 3 } },
      ],
    );
    const jobs = campaign(state).assignments;
    expect(jobs.map((item) => item.job)).toEqual([
      "ATTACK",
      "ATTACK",
      "ATTACK",
      "ATTACK",
    ]);
    const byTarget = new Map<string, number>();
    for (const item of jobs)
      byTarget.set(
        `${item.at.x},${item.at.y}`,
        (byTarget.get(`${item.at.x},${item.at.y}`) ?? 0) + 1,
      );
    // Every unit is nearest to one capital; a pair still marches on the
    // other seat's.
    expect([...byTarget].sort()).toEqual([
      ["11,11", 2],
      ["11,2", 2],
    ]);
  });

  it("lands a stranded transport where it can walk to a target", () => {
    // Two seats (11 x 11): the viewer's capital (8, 8), the hostile capital
    // (2, 8). A transport on a pond at (5, 2) has no water route, and own
    // units stand on every landing tile the naval plan would use (the coast
    // nearest the target).
    const pond = { x: 5, y: 2 };
    const blocked: CoordV7[] = [
      { x: 4, y: 3 },
      { x: 5, y: 3 },
      { x: 6, y: 3 },
      { x: 4, y: 2 },
      { x: 6, y: 2 },
    ];
    const field = goblinArenaV7(
      ["ORIGINAL", "ORIGINAL"],
      [
        { seat: 0, role: "FIGHTER", at: pond, form: "EMBARKED" },
        ...blocked.map((at) => ({ seat: 0, role: "KNIGHT", at }) as const),
      ],
      { water: [pond], coins: 0 },
    );
    const state = checkedV7({
      ...field,
      setup: { ...field.setup, mapType: "LAKES" },
      cities: field.cities.map((city) => ({
        ...city,
        cityActionAvailable: false,
      })),
    });
    const transport = unitAt(state, pond);
    const landings = decide(state).candidates.filter(
      (candidate) =>
        candidate.command.kind === "DISEMBARK" &&
        candidate.command.unitId === transport.id,
    );
    // It used to wait there for the rest of the match; now it lands (below
    // every planned landing, 1335) on a tile with a land route to the city.
    expect(landings.length).toBeGreaterThan(0);
    expect(landings.every((item) => item.score.priority === 810)).toBe(true);
  });

  it("sends a Raider to the front instead of circling its home city", () => {
    const state = arena({
      pieces: [
        { seat: 0, role: "RAIDER", at: { x: 3, y: 8 } },
        { seat: 0, role: "FIGHTER", at: { x: 3, y: 9 } },
        { seat: 0, role: "FIGHTER", at: { x: 2, y: 9 } },
      ],
    });
    const raider = unitAt(state, { x: 3, y: 8 });
    const decision = decide(state);
    const move = required(
      decision.candidates.find(
        (candidate) =>
          candidate.command.kind === "MOVE" &&
          candidate.command.unitId === raider.id,
      ),
    );
    // A march (700), not the picket (710) that used to keep it at home.
    expect(move.score.priority).toBe(700);
    expect(distance(bestMove(decision, raider.id), ENEMY)).toBeLessThan(6);
  });
});

function setup(): MatchSetupV7 {
  return {
    rulesetId: RULESET_7_ID,
    seed: 2,
    width: 11,
    height: 11,
    aiCount: 1,
    aiDifficulty: "NORMAL",
    aiMode: "RIVAL",
    humanColor: "CORAL",
    factions: ["ORIGINAL", "ORIGINAL"],
    allowDuplicateFactions: true,
    mapType: "DRY_LAND",
    mapGenerationRevision: "REGIONAL_BIOMES_NAVAL_V4",
    curiosities: false,
  };
}

/**
 * The seed-2 board with seat 0 active and the given pieces as the only
 * units (their tiles cleared to Grass). Seat 0 holds its capital only, so
 * the endgame siege mode is off.
 */
function arena(options: Arena): GameStateV7 {
  const base = revision15PlayableGameV7(setup()).state;
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
  for (let y = 0; y < base.board.height; y += 1)
    for (let x = 0; x < base.board.width; x += 1) every.push({ x, y });
  const mountains = options.mountains ?? [];
  const mountain = required(
    base.board.tiles.find(
      (tile) => tile.terrain === "MOUNTAIN" && tile.resource === null,
    ),
  );
  const cleared = options.pieces.map((piece) => piece.at);
  // Without Engineering (and so without what depends on it) Mountains block.
  const techs: readonly TechnologyIdV7[] =
    mountains.length === 0 ? TECHNOLOGY_IDS_V7 : seat(0).researchedTechs;
  return checkedV7({
    ...base,
    nextEntityId,
    activeSeatIndex: base.turnOrder.indexOf(seat(0).id),
    players: base.players.map((player) => ({
      ...player,
      researchedTechs: player.seat === 0 ? techs : TECHNOLOGY_IDS_V7,
      coins: player.seat === 0 ? (options.coins ?? 0) : 0,
      explored:
        player.seat === 0 && options.explored !== undefined
          ? options.explored
          : every,
    })),
    cities: base.cities.map((city): CityStateV7 => ({
      ...city,
      cityActionAvailable:
        options.cityAction === true && city.ownerId === seat(0).id,
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
        if (tile.site === "VILLAGE" && options.villages !== true)
          return { ...tile, ...plain, terrain: "GRASS" as const, site: null };
        return cleared.some((at) => same(at, tile.at)) && tile.site === null
          ? { ...tile, ...plain, terrain: "GRASS" as const }
          : tile;
      }),
    },
  });
}

/** Tiles within `radius` of `center` on the 11 x 11 board. */
function around(center: CoordV7, radius: number): CoordV7[] {
  const result: CoordV7[] = [];
  for (let y = 0; y < 11; y += 1)
    for (let x = 0; x < 11; x += 1)
      if (distance({ x, y }, center) <= radius) result.push({ x, y });
  return result;
}

function relocate(
  state: GameStateV7,
  id: UnitStateV7["id"],
  at: CoordV7,
): GameStateV7 {
  return checkedV7({
    ...state,
    units: state.units.map((unit) => (unit.id === id ? { ...unit, at } : unit)),
  });
}

function viewFor(state: GameStateV7): PlayerViewV7 {
  return viewForV7(state, required(state.turnOrder[state.activeSeatIndex]));
}

function decide(state: GameStateV7): NormalAiDecisionV7 {
  return chooseNormalCommandV7(viewFor(state));
}

function campaign(state: GameStateV7) {
  return inspectNormalTacticalFactsV7(viewFor(state)).campaign;
}

function jobOf(state: GameStateV7, id: UnitStateV7["id"]) {
  return campaign(state).assignments.find((item) => item.unitId === id);
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

const same = (left: CoordV7, right: CoordV7): boolean =>
  left.x === right.x && left.y === right.y;
const distance = (left: CoordV7, right: CoordV7): number =>
  Math.max(Math.abs(left.x - right.x), Math.abs(left.y - right.y));
