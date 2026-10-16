import { describe, expect, it } from "vitest";
import {
  activeMissionDirectiveV7,
  directivePlanForViewV7,
  leashReadyCommandsV7,
  zoneContainsV7,
} from "../../src/ai/v7-directives";
import {
  applyCommandV7,
  arePlayersAlliedV7,
  createPlayableGameV7,
  favourOfV7,
  missionByIdV7,
  missionMatchSetupV7,
  missionOutcomeV7,
  missionStatusV7,
  missionTaggedUnitsV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type GameStateV7,
  type MissionDefinitionV7,
  type PlayerId,
} from "../../src/engine/index";

// Missions 9 and 10 of the campaign (`pulp_wars-v642.4`;
// docs/product/CAMPAIGN.md sections 9.3 and 11): the rescue of Sugarcrest
// and the capture of the Lodge. Every state is the mission's initial state
// with a city or a unit changed by hand; the only commands applied are End
// Turns, one seat after another (no seat is played).

function definition(id: string): MissionDefinitionV7 {
  const mission = missionByIdV7(id);
  if (mission === null) throw new Error(`${id} is not registered`);
  return mission;
}

function start(id: string): GameStateV7 {
  const setup = missionMatchSetupV7(definition(id));
  if (setup === null) throw new Error(`${id}: no setup`);
  const created = createPlayableGameV7(setup);
  if (!created.ok) throw new Error(created.error.code);
  return created.state;
}

function seatId(state: GameStateV7, seat: number): PlayerId {
  const player = state.players[seat];
  if (player === undefined) throw new Error(`no seat ${String(seat)}`);
  return player.id;
}

const at = (x: number, y: number): CoordV7 => ({ x, y });
const key = (coord: CoordV7): string => `${String(coord.x)},${String(coord.y)}`;

function cityTaken(state: GameStateV7, where: CoordV7, by: PlayerId) {
  return {
    ...state,
    cities: state.cities.map((city) =>
      city.at.x === where.x && city.at.y === where.y
        ? { ...city, ownerId: by }
        : city,
    ),
  };
}

/** Ends turns, seat after seat, until the match ends or `round` begins. */
function endTurnsUntil(state: GameStateV7, round: number): GameStateV7 {
  let current = state;
  while (current.outcome === null && current.round < round) {
    const actor = current.turnOrder[current.activeSeatIndex] as PlayerId;
    const applied = applyCommandV7(current, actor, { kind: "END_TURN" });
    if (!applied.accepted) throw new Error(applied.error.code);
    current = applied.state;
  }
  return current;
}

/** The tiles a ground unit reaches from `from` over the layers alone. */
function walkable(mission: MissionDefinitionV7, from: CoordV7): Set<string> {
  const land = (x: number, y: number): boolean => {
    const cell = mission.terrain[y]?.[x];
    return cell !== undefined && cell !== "~" && cell !== "x";
  };
  const seen = new Set<string>();
  const queue: CoordV7[] = [from];
  while (queue.length > 0) {
    const next = queue.pop() as CoordV7;
    if (seen.has(key(next)) || !land(next.x, next.y)) continue;
    seen.add(key(next));
    for (let dy = -1; dy <= 1; dy += 1)
      for (let dx = -1; dx <= 1; dx += 1)
        queue.push(at(next.x + dx, next.y + dy));
  }
  return seen;
}

describe("mission 9, Sugar and Spite", () => {
  it("cuts your strip off from the kingdom: no ground unit crosses the Rift and the lake", () => {
    const mission = definition("FRONTIER_9");
    const yours = walkable(mission, at(2, 13));
    // Your capital, your town, and the village in the north of the strip.
    for (const coord of [at(2, 13), at(2, 8), at(2, 5)])
      expect(yours.has(key(coord)), key(coord)).toBe(true);
    // Sugarcrest, Gumdrop, Riftwatch, and both enemy capitals are beyond.
    for (const coord of [at(7, 8), at(8, 5), at(5, 14), at(14, 1), at(14, 14)])
      expect(yours.has(key(coord)), key(coord)).toBe(false);
    // The besiegers walk to the kingdom: it is one land with their camps.
    const theirs = walkable(mission, at(14, 1));
    for (const coord of [at(7, 8), at(8, 5), at(5, 14), at(14, 14)])
      expect(theirs.has(key(coord)), key(coord)).toBe(true);
    // Nobody sails the lakes.
    expect(mission.forbiddenTechnologies).toContain("SHORECRAFT");
  });

  it("makes the Candy seat your ally and the besiegers each other's", () => {
    const state = start("FRONTIER_9");
    const [you, candy, undead, goblin] = [0, 1, 2, 3].map((seat) =>
      seatId(state, seat),
    ) as [PlayerId, PlayerId, PlayerId, PlayerId];
    expect(arePlayersAlliedV7(state, you, candy)).toBe(true);
    expect(arePlayersAlliedV7(state, undead, goblin)).toBe(true);
    expect(arePlayersAlliedV7(state, you, undead)).toBe(false);
    expect(arePlayersAlliedV7(state, candy, goblin)).toBe(false);
  });

  it("is won when round 16 ends with Sugarcrest standing, with a star for the Queen", () => {
    const state = start("FRONTIER_9");
    expect(missionStatusV7(state)?.clock).toEqual({
      kind: "SURVIVE",
      lastRound: 16,
      roundsLeft: 16,
    });
    const last = endTurnsUntil(state, 16);
    expect(last.round).toBe(16);
    expect(last.outcome).toBeNull();
    const done = endTurnsUntil(last, 17);
    expect(done.outcome).toEqual({
      kind: "VICTORY",
      winnerId: state.humanPlayerId,
      cause: "SURVIVED",
    });
    // Nobody moved: the Queen lives, and Riftwatch is still nobody's.
    expect(missionStatusV7(done)?.bonus.map((goal) => goal.met)).toEqual([
      true,
      false,
    ]);
    expect(missionStatusV7(done)?.stars).toBe(2);
  });

  it("is lost when Sugarcrest falls, and only then", () => {
    const state = start("FRONTIER_9");
    const undead = seatId(state, 2);
    const decided = (after: GameStateV7) =>
      missionOutcomeV7({ round: after.round }, after, undead);
    expect(decided(state)).toBeNull();
    // Gumdrop, the kingdom's town, may fall.
    expect(decided(cityTaken(state, at(8, 5), undead))).toBeNull();
    // Your own town too.
    expect(decided(cityTaken(state, at(2, 8), undead))).toBeNull();
    expect(decided(cityTaken(state, at(7, 8), undead))).toEqual({
      kind: "DEFEAT",
      humanId: state.humanPlayerId,
      defeatedByPlayerId: undead,
      cause: "PLACE_LOST",
    });
  });

  it("counts the third star for Riftwatch in your hands or the kingdom's, and the second for the Queen", () => {
    const state = start("FRONTIER_9");
    const goals = (after: GameStateV7) =>
      missionStatusV7(after)?.bonus.map((goal) => goal.met);
    expect(goals(state)).toEqual([true, false]);
    // Riftwatch is a neutral village at the start: a city of yours there
    // is the star, a Goblin city is not.
    const village = state.cities.find(
      (city) => city.at.x === 5 && city.at.y === 14,
    );
    expect(village).toBeUndefined();
    const town = {
      ...(state.cities.find(
        (city) => city.at.x === 2 && city.at.y === 8,
      ) as GameStateV7["cities"][number]),
      id: 999 as never,
      at: at(5, 14),
    };
    const held = (owner: PlayerId): GameStateV7 => ({
      ...state,
      cities: [...state.cities, { ...town, ownerId: owner }],
    });
    expect(goals(held(state.humanPlayerId))).toEqual([true, true]);
    expect(goals(held(seatId(state, 1)))).toEqual([true, true]);
    expect(goals(held(seatId(state, 3)))).toEqual([true, false]);
    const queen = missionTaggedUnitsV7(
      definition("FRONTIER_9"),
      state.setup,
    ).get("PRALINE");
    expect(
      goals({
        ...state,
        units: state.units.filter((unit) => unit.id !== queen),
      }),
    ).toEqual([false, false]);
  });

  it("keeps the ally on the land of its two cities (HOLD), for the whole mission", () => {
    const state = start("FRONTIER_9");
    const candy = seatId(state, 1);
    const mission = definition("FRONTIER_9");
    for (const round of [1, 8, 16]) {
      const view = viewForV7({ ...state, round }, candy);
      const plan = directivePlanForViewV7(view);
      expect(plan?.directive.kind, String(round)).toBe("HOLD");
      if (plan === null || plan.directive.kind !== "HOLD") continue;
      const zone = plan.directive.zone;
      // Every Candy unit starts inside the zone and is leashed to it.
      const own = view.units.filter((unit) => unit.ownerId === candy);
      expect(own).toHaveLength(mission.seats[1]?.units.length ?? -1);
      for (const unit of own) {
        expect(zoneContainsV7(zone, unit.at), key(unit.at)).toBe(true);
        expect(plan.leashed.has(unit.id)).toBe(true);
      }
      // The zone is the land of the two cities and nothing more: both
      // centers, and no tile three or more away from both.
      expect(zoneContainsV7(zone, at(7, 8))).toBe(true);
      expect(zoneContainsV7(zone, at(8, 5))).toBe(true);
      expect(zoneContainsV7(zone, at(9, 11))).toBe(false);
      expect(zoneContainsV7(zone, at(7, 3))).toBe(false);
      // The leash: a Move that ends outside is taken from the ready
      // commands; one that stays inside, an attack, and End Turn are kept.
      const queen = missionTaggedUnitsV7(mission, state.setup).get("PRALINE");
      if (queen === undefined) throw new Error("no Queen");
      const move = (to: CoordV7): { readonly command: CommandV7 } => ({
        command: { kind: "MOVE", unitId: queen, path: [to] } as CommandV7,
      });
      const out = move(at(9, 11));
      const inside = move(at(8, 9));
      const end = { command: { kind: "END_TURN" } as CommandV7 };
      expect(leashReadyCommandsV7(view, plan, [out, inside, end])).toEqual([
        inside,
        end,
      ]);
    }
    // You have no directive: the human seat never does.
    expect(
      activeMissionDirectiveV7(viewForV7(state, state.humanPlayerId)),
    ).toBeNull();
  });

  it("musters every wave out of your sight, in the besiegers' own camps", () => {
    const state = start("FRONTIER_9");
    const mission = definition("FRONTIER_9");
    const explored = new Set(
      viewForV7(state, state.humanPlayerId)
        .board.tiles.filter((tile) => tile.explored)
        .map((tile) => key(tile.at)),
    );
    const waves = mission.reinforcements ?? [];
    expect(waves.length).toBeGreaterThan(0);
    for (const wave of waves) {
      expect([2, 3]).toContain(wave.seat);
      for (const unit of wave.units) {
        expect(explored.has(key(unit.at)), key(unit.at)).toBe(false);
        // East of the eastern lake: nine tiles or more from your capital.
        expect(unit.at.x).toBeGreaterThanOrEqual(11);
      }
    }
    // The later waves bring the siege engines.
    expect(
      waves.map(
        (wave) => wave.units.filter((unit) => unit.role === "CATAPULT").length,
      ),
    ).toEqual([1, 1, 2, 2, 2, 1]);
  });
});

describe("mission 10, The Stars Are Right", () => {
  it("is lost when round 24 ends with the Lodge standing: the last toll", () => {
    const state = start("FRONTIER_10");
    expect(missionStatusV7(state)?.clock).toEqual({
      kind: "DEADLINE",
      lastRound: 24,
      roundsLeft: 24,
    });
    const last = endTurnsUntil(state, 24);
    expect(last.round).toBe(24);
    expect(last.outcome).toBeNull();
    expect(missionStatusV7(last)?.clock?.roundsLeft).toBe(1);
    const done = endTurnsUntil(last, 25);
    expect(done.outcome).toMatchObject({
      kind: "DEFEAT",
      humanId: state.humanPlayerId,
      cause: "OUT_OF_TIME",
    });
  });

  it("is won by the Lodge in your hands or your ally's, never by a lesser city", () => {
    const state = start("FRONTIER_10");
    const [you, goblin, cult] = [0, 1, 2].map((seat) =>
      seatId(state, seat),
    ) as [PlayerId, PlayerId, PlayerId];
    const decided = (after: GameStateV7, actor: PlayerId) =>
      missionOutcomeV7({ round: after.round }, after, actor);
    expect(decided(state, you)).toBeNull();
    // The Cult's towns and the thralls' barrow are not the objective.
    expect(decided(cityTaken(state, at(7, 2), you), you)).toBeNull();
    expect(decided(cityTaken(state, at(7, 5), you), you)).toBeNull();
    for (const taker of [you, goblin])
      expect(decided(cityTaken(state, at(10, 2), taker), taker)).toEqual({
        kind: "VICTORY",
        winnerId: you,
        cause: "PLACES_CAPTURED",
      });
    expect(arePlayersAlliedV7(state, you, goblin)).toBe(true);
    expect(arePlayersAlliedV7(state, you, cult)).toBe(false);
    expect(arePlayersAlliedV7(state, cult, seatId(state, 3))).toBe(true);
    // The stars: by round 20, and every city of yours kept.
    const won = (round: number): GameStateV7 => ({
      ...cityTaken(state, at(10, 2), you),
      round,
    });
    const met = (after: GameStateV7) =>
      missionStatusV7(after)?.bonus.map((goal) => goal.met);
    expect(met(won(20))).toEqual([true, true]);
    expect(met(won(21))).toEqual([false, true]);
    expect(met(cityTaken(won(20), at(4, 8), cult))).toEqual([true, false]);
  });

  it("starts the Lodge with Favour for its first Horror, shown to everyone", () => {
    const state = start("FRONTIER_10");
    const cult = seatId(state, 2);
    expect(favourOfV7(state, cult)).toBe(9);
    // Favour is public: your view carries the Lodge's.
    expect(favourOfV7(viewForV7(state, state.humanPlayerId), cult)).toBe(9);
    // No seat but the Cult's has any.
    for (const seat of [0, 1, 3])
      expect(favourOfV7(state, seatId(state, seat))).toBe(0);
  });

  it("lets the ally grow until round 10 and sends it to war from then on", () => {
    const state = start("FRONTIER_10");
    const goblin = seatId(state, 1);
    const kind = (round: number): string | null =>
      activeMissionDirectiveV7(viewForV7({ ...state, round }, goblin))?.kind ??
      null;
    // NORMAL reads as no directive: the ordinary policy.
    expect([1, 5, 9].map(kind)).toEqual([null, null, null]);
    expect([10, 11, 24].map(kind)).toEqual(["RUSH", "RUSH", "RUSH"]);
    expect(
      directivePlanForViewV7(viewForV7({ ...state, round: 9 }, goblin)),
    ).toBeNull();
    const plan = directivePlanForViewV7(
      viewForV7({ ...state, round: 10 }, goblin),
    );
    expect(plan?.campaign.kind).toBe("RUSH");
    // A rushing seat is not leashed: it may go where the war is.
    expect(plan?.leashed.size).toBe(0);
  });

  it("guards the summit with eight and keeps the rest of the lodge free", () => {
    const state = start("FRONTIER_10");
    const cult = seatId(state, 2);
    const plan = directivePlanForViewV7(viewForV7(state, cult));
    expect(plan?.directive.kind).toBe("GUARD");
    expect(plan?.garrison).toHaveLength(8);
    expect(plan?.leashed.size).toBe(8);
    const units = new Map(state.units.map((unit) => [unit.id, unit]));
    // Revision 2 (`pulp_wars-v642.6`): the ring holds the Thing, two Idol
    // Bearers, a Chosen, both Summoners, and two Hexers, so a Knight's
    // Overrun ends on the first Idol Bearer or Chosen it meets instead of
    // running through the summit. Revision 3 (`pulp_wars-mch9.31`): the
    // Chosen retired, so a third Idol Bearer stands in its place.
    expect(
      (plan?.garrison ?? []).map((id) => units.get(id)?.role).sort(),
    ).toEqual(
      [
        "CAPTAIN",
        "CAPTAIN",
        "GUARD",
        "GUARD",
        "GUARD",
        "JUGGERNAUT",
        "MARKSMAN",
        "MARKSMAN",
      ].sort(),
    );
    for (const id of plan?.garrison ?? []) {
      const unit = units.get(id);
      expect(unit?.ownerId).toBe(cult);
      if (unit === undefined || plan === null) continue;
      expect(
        plan.directive.kind === "GUARD" &&
          zoneContainsV7(plan.directive.zone, unit.at),
      ).toBe(true);
    }
    // The Lodge itself is inside the guarded zone.
    expect(
      plan !== null &&
        plan.directive.kind === "GUARD" &&
        zoneContainsV7(plan.directive.zone, at(10, 2)),
    ).toBe(true);
  });

  it("brings the thralls' waves to the barrow and the lodge's behind the summit", () => {
    const mission = definition("FRONTIER_10");
    const waves = mission.reinforcements ?? [];
    const distance = (left: CoordV7, right: CoordV7): number =>
      Math.max(Math.abs(left.x - right.x), Math.abs(left.y - right.y));
    for (const wave of waves.filter((item) => item.seat === 3))
      for (const unit of wave.units)
        expect(distance(unit.at, at(7, 5))).toBeLessThanOrEqual(2);
    // The lodge's waves arrive east of the Lodge, away from the slope and
    // the goat path an attacker climbs.
    for (const wave of waves.filter((item) => item.seat === 2))
      for (const unit of wave.units) {
        expect(unit.at.x).toBeGreaterThanOrEqual(12);
        expect(distance(unit.at, at(10, 2))).toBeLessThanOrEqual(3);
      }
    // The last two bring a Summoner: the circle can form again.
    expect(
      waves
        .filter((item) => item.seat === 2)
        .map((wave) => wave.units.some((unit) => unit.role === "CAPTAIN")),
    ).toEqual([false, true, true]);
  });
});
