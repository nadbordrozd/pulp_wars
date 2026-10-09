import { describe, expect, it } from "vitest";
import {
  applyCommandV7,
  projectEventsV7,
  queryPlayerCommandsV7,
  viewForV7,
  type CoordV7,
  type GameStateV7,
  type PlayerViewV7,
} from "../../src/engine/index";
import {
  ROAD_LINK_SOUND_GAIN_V7,
  ROAD_LINK_SOUND_V7,
  soundCuesForBoundaryV7,
} from "../../src/audio/sound-events-v7";
import { CHIBI_OVERLAY_FRAME_V7 } from "../../src/render/canvas/board-renderer-v7";
import {
  BoardFeedbackV7,
  type BoardFeedbackModelV7,
} from "../../src/render/canvas/feedback-host-v7";
import {
  CITY_HOP_MS_V7,
  ROAD_GLOW_MS_V7,
  ROAD_HOP_MAX_MS_V7,
  ROAD_HOP_MIN_MS_V7,
  ROAD_LANDING_MS_V7,
  ROAD_LINK_STAGGER_MS_V7,
  ROAD_UNLINK_MS_V7,
  cityPipCentreV7,
  roadHopFrameV7,
  roadHopMsV7,
} from "../../src/render/canvas/feedback-motion-v7";
import {
  feedbackPlanV7,
  roadLinkChangesV7,
  type FeedbackPlanV7,
} from "../../src/render/feedback-plan-v7";
import { seatIdV7 } from "../fixtures/v7-goblin-arena";
import {
  ROAD_LINK_V7,
  roadLinkFixtureV7,
  roadLinkPairFixtureV7,
} from "../fixtures/v7-road-link-ui";

/**
 * Bead pulp_wars-v56v: Road population (RULESET_7_CURRENT.md section 9.3)
 * is a live value with no event, so a new or lost Road link is read by
 * comparing the viewer's views before and after a command. Hand-built
 * states only: no match is played.
 */

const same = (left: CoordV7, right: CoordV7): boolean =>
  left.x === right.x && left.y === right.y;

function cityAt(state: GameStateV7, at: CoordV7) {
  const city = state.cities.find((candidate) => same(candidate.at, at));
  if (city === undefined) throw new Error("no city");
  return city;
}

/** A command of the human seat, with the human's views and events. */
function step(
  state: GameStateV7,
  command: Parameters<typeof applyCommandV7>[2],
) {
  const applied = applyCommandV7(state, state.humanPlayerId, command);
  if (!applied.accepted) throw new Error(JSON.stringify(applied.error));
  const human = state.humanPlayerId;
  return {
    state: applied.state,
    before: viewForV7(state, human),
    after: viewForV7(applied.state, human),
    events: projectEventsV7(state, applied.state, human, applied.events),
  };
}

/** A hand-built change between two states, seen by the human. */
function boundary(before: GameStateV7, after: GameStateV7) {
  const human = before.humanPlayerId;
  const beforeView = viewForV7(before, human);
  return {
    before: beforeView,
    after: viewForV7(after, human),
    events: {
      format: "pulp-wars-player-events" as const,
      version: 7 as const,
      viewerId: beforeView.viewer.id,
      commandIndex: beforeView.commandIndex,
      events: [],
    },
  };
}

const linkedState = (): GameStateV7 =>
  step(roadLinkFixtureV7(), { kind: "BUILD_ROAD", at: ROAD_LINK_V7.build })
    .state;

/**
 * The Road on `at` is gone (only the tiles change: the stored population
 * is not settled again, which the detection does not read).
 */
const withoutRoad = (state: GameStateV7, at: CoordV7): GameStateV7 => ({
  ...state,
  board: {
    ...state.board,
    tiles: state.board.tiles.map((tile) =>
      same(tile.at, at) ? { ...tile, road: false } : tile,
    ),
  },
});

const ownedBy = (
  state: GameStateV7,
  at: CoordV7,
  ownerSeat: number,
): GameStateV7 => ({
  ...state,
  cities: state.cities.map((city) =>
    same(city.at, at)
      ? { ...city, ownerId: seatIdV7(state, ownerSeat), isCapital: false }
      : city,
  ),
});

/** The AI seat is the one playing. */
const aiTurn = (state: GameStateV7): GameStateV7 => ({
  ...state,
  activeSeatIndex: state.turnOrder.findIndex((id) => id === seatIdV7(state, 1)),
});

describe("Road link: change detection", () => {
  it("links a city when the Road that joins it to the capital is built", () => {
    const state = roadLinkFixtureV7();
    const capital = cityAt(state, ROAD_LINK_V7.capital);
    const village = cityAt(state, ROAD_LINK_V7.village);
    const result = step(state, { kind: "BUILD_ROAD", at: ROAD_LINK_V7.build });
    expect(roadLinkChangesV7(result.before, result.after)).toEqual({
      linked: [
        {
          capitalId: capital.id,
          capitalAt: ROAD_LINK_V7.capital,
          cityId: village.id,
          cityAt: ROAD_LINK_V7.village,
          // Along the visible Road tiles, the cities at both ends.
          path: [
            { x: 8, y: 8 },
            { x: 8, y: 7 },
            { x: 8, y: 6 },
            { x: 8, y: 5 },
          ],
        },
      ],
      unlinked: [],
    });
    // Both cities gain their point from the other end of the Road.
    const plan = feedbackPlanV7(result.before, result.events, result.after);
    const gain = (cityId: number) =>
      plan.population.find((entry) => entry.cityId === cityId);
    expect(gain(capital.id)?.sources).toEqual([
      {
        at: ROAD_LINK_V7.village,
        amount: 1,
        road: {
          fromCityId: village.id,
          path: [
            { x: 8, y: 5 },
            { x: 8, y: 6 },
            { x: 8, y: 7 },
            { x: 8, y: 8 },
          ],
        },
      },
    ]);
    expect(gain(village.id)).toMatchObject({
      amount: 1,
      sources: [{ at: ROAD_LINK_V7.capital, road: { fromCityId: capital.id } }],
    });
    expect(plan.roadLinks).toHaveLength(1);
    expect(plan.roadUnlinks).toEqual([]);
  });

  it("finds nothing for a Road that links no new city", () => {
    const state = roadLinkFixtureV7();
    const road = queryPlayerCommandsV7(
      viewForV7(state, state.humanPlayerId),
    ).find(
      (command) =>
        command.kind === "BUILD_ROAD" &&
        !same(command.at, ROAD_LINK_V7.build) &&
        command.at.x <= 4,
    );
    if (road === undefined) throw new Error("no other Road offered");
    const result = step(state, road);
    expect(roadLinkChangesV7(result.before, result.after)).toEqual({
      linked: [],
      unlinked: [],
    });
    expect(
      feedbackPlanV7(result.before, result.events, result.after).roadLinks,
    ).toEqual([]);
  });

  it("links several cities at once, nearest first, each along its own Road", () => {
    const state = roadLinkPairFixtureV7();
    const capital = cityAt(state, ROAD_LINK_V7.capital);
    const village = cityAt(state, ROAD_LINK_V7.village);
    const second = cityAt(state, ROAD_LINK_V7.second);
    const result = step(state, {
      kind: "BUILD_ROAD",
      at: ROAD_LINK_V7.junction,
    });
    const { linked, unlinked } = roadLinkChangesV7(result.before, result.after);
    expect(unlinked).toEqual([]);
    expect(
      linked.map((link) => [link.cityId, link.path.length, link.capitalId]),
    ).toEqual([
      [village.id, 4, capital.id],
      [second.id, 4, capital.id],
    ]);
    for (const link of linked) {
      expect(link.path[0]).toEqual(ROAD_LINK_V7.capital);
      expect(link.path[1]).toEqual(ROAD_LINK_V7.junction);
      expect(link.path.at(-1)).toEqual(link.cityAt);
      // Every step is to one of the eight neighbours.
      for (let index = 1; index < link.path.length; index += 1) {
        const from = link.path[index - 1];
        const to = link.path[index];
        if (from === undefined || to === undefined) throw new Error("path");
        expect(Math.max(Math.abs(from.x - to.x), Math.abs(from.y - to.y))).toBe(
          1,
        );
      }
    }
    // The capital gains one point from each of them.
    const plan = feedbackPlanV7(result.before, result.events, result.after);
    const capitalGain = plan.population.find(
      (entry) => entry.cityId === capital.id,
    );
    expect(capitalGain?.amount).toBe(2);
    expect(
      capitalGain?.sources.map((source) => source.road?.fromCityId),
    ).toEqual([village.id, second.id]);
  });

  it("unlinks both cities, quietly, when the Road between them is cut", () => {
    const linked = linkedState();
    const capital = cityAt(linked, ROAD_LINK_V7.capital);
    const village = cityAt(linked, ROAD_LINK_V7.village);
    const cut = boundary(linked, withoutRoad(linked, ROAD_LINK_V7.build));
    expect(roadLinkChangesV7(cut.before, cut.after)).toEqual({
      linked: [],
      unlinked: [
        { cityId: capital.id, at: ROAD_LINK_V7.capital, amount: 1 },
        { cityId: village.id, at: ROAD_LINK_V7.village, amount: 1 },
      ],
    });
    // A lost link makes no sound.
    expect(
      soundCuesForBoundaryV7(cut.before, cut.events, cut.after).end,
    ).toEqual([]);
  });

  it("unlinks every other city, and links nothing, when the capital is lost", () => {
    const linked = linkedState();
    const village = cityAt(linked, ROAD_LINK_V7.village);
    const lost = boundary(linked, ownedBy(linked, ROAD_LINK_V7.capital, 1));
    expect(lost.after.naval.networkCityIds).toEqual([]);
    expect(roadLinkChangesV7(lost.before, lost.after)).toEqual({
      linked: [],
      // The capital is no longer the viewer's: only the village is shown.
      unlinked: [{ cityId: village.id, at: ROAD_LINK_V7.village, amount: 1 }],
    });
  });

  it("links every city of the network again when the capital is won back", () => {
    const pair = step(roadLinkPairFixtureV7(), {
      kind: "BUILD_ROAD",
      at: ROAD_LINK_V7.junction,
    }).state;
    const lostCapital = ownedBy(pair, ROAD_LINK_V7.capital, 1);
    const back = boundary(lostCapital, pair);
    const { linked, unlinked } = roadLinkChangesV7(back.before, back.after);
    expect(unlinked).toEqual([]);
    expect(linked.map((link) => link.cityAt)).toEqual([
      ROAD_LINK_V7.village,
      ROAD_LINK_V7.second,
    ]);
    // The capital changed hands: no meter gain, but both links fly.
    const plan = feedbackPlanV7(back.before, back.events, back.after);
    expect(plan.roadLinks).toHaveLength(2);
  });

  it("reads an AI turn the same way: the AI takes the linked village", () => {
    const linked = aiTurn(linkedState());
    const capital = cityAt(linked, ROAD_LINK_V7.capital);
    const taken = boundary(linked, ownedBy(linked, ROAD_LINK_V7.village, 1));
    expect(
      taken.after.turnOrder[taken.after.activeSeatIndex] ===
        taken.after.viewer.id,
    ).toBe(false);
    expect(roadLinkChangesV7(taken.before, taken.after)).toEqual({
      linked: [],
      unlinked: [{ cityId: capital.id, at: ROAD_LINK_V7.capital, amount: 1 }],
    });
  });

  it("reads a link made during an AI turn and plays one soft sound for it", () => {
    const before = aiTurn(roadLinkPairFixtureV7());
    const after = aiTurn(
      step(roadLinkPairFixtureV7(), {
        kind: "BUILD_ROAD",
        at: ROAD_LINK_V7.junction,
      }).state,
    );
    const watched = boundary(before, after);
    expect(
      roadLinkChangesV7(watched.before, watched.after).linked,
    ).toHaveLength(2);
    expect(
      soundCuesForBoundaryV7(watched.before, watched.events, watched.after).end,
    ).toEqual([
      { id: ROAD_LINK_SOUND_V7, delayMs: 0, gain: ROAD_LINK_SOUND_GAIN_V7 },
    ]);
  });
});

describe("Road link: motion", () => {
  it("hops through every Road tile, settling on each", () => {
    const points = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 200, y: 0 },
    ];
    expect(roadHopFrameV7(points, 0, 100)).toMatchObject({ x: 0, y: 0 });
    expect(roadHopFrameV7(points, 0.5, 100)).toMatchObject({ x: 100, y: 0 });
    expect(roadHopFrameV7(points, 1, 100)).toMatchObject({ x: 200, y: 0 });
    // Up in the air half way through a hop.
    expect(roadHopFrameV7(points, 0.25, 100).y).toBeLessThan(-20);
    expect(roadHopFrameV7(points, 0.75, 100).y).toBeLessThan(-20);
    expect(roadHopFrameV7(points, 0.02, 100).scale).toBeLessThan(1);
  });

  it("takes a hop per tile, within its bounds", () => {
    expect(roadHopMsV7(1)).toBe(ROAD_HOP_MIN_MS_V7);
    expect(roadHopMsV7(3)).toBe(630);
    expect(roadHopMsV7(40)).toBe(ROAD_HOP_MAX_MS_V7);
  });

  it("lands on the board's own pip column", () => {
    const column = CHIBI_OVERLAY_FRAME_V7.populationColumn;
    // The renderer draws pip i at left 46, top 62 - 7 - 9 i (7 px pips).
    for (const [zoom, slot] of [
      [1, 0],
      [0.5, 2],
      [1.5, 1],
    ] as const)
      expect(cityPipCentreV7({ x: 10, y: 20 }, zoom, slot)).toEqual({
        x: 10 + (column.left + 3.5) * zoom,
        y: 20 + (column.bottom - 7 - 9 * slot + 3.5) * zoom,
      });
  });
});

function rig(motion: "FULL" | "REDUCED", view: PlayerViewV7) {
  let now = 1_000;
  let nextFrame = 1;
  let serial = 0;
  const frames = new Map<number, () => void>();
  const feedback = new BoardFeedbackV7({
    now: () => now,
    draw: () => {
      serial += 1;
    },
    drawSerial: () => serial,
    browser: () => ({
      requestAnimationFrame: (callback: FrameRequestCallback) => {
        const id = nextFrame;
        nextFrame += 1;
        frames.set(id, () => callback(now));
        return id;
      },
      cancelAnimationFrame: (id: number) => {
        frames.delete(id);
      },
    }),
    camera: () => ({ offsetX: 0, offsetY: 0, zoom: 1 }),
    canvasClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 }),
  });
  const model = (
    patch: Partial<BoardFeedbackModelV7> = {},
  ): BoardFeedbackModelV7 => ({
    matchInstanceId: 1,
    view,
    offeredCommands: queryPlayerCommandsV7(view),
    interactive: true,
    motion,
    animationSpeed: "NORMAL",
    presentationPaused: false,
    ...patch,
  });
  feedback.sync(model());
  return {
    feedback,
    model,
    advance(ms: number, stepMs = 16): void {
      const end = now + ms;
      while (now < end) {
        now = Math.min(end, now + stepMs);
        const due = [...frames.values()];
        frames.clear();
        for (const frame of due) frame();
      }
    },
    pendingFrames: () => frames.size,
  };
}

function linkPlan(pair = false): {
  readonly plan: FeedbackPlanV7;
  readonly after: PlayerViewV7;
} {
  const result = step(pair ? roadLinkPairFixtureV7() : roadLinkFixtureV7(), {
    kind: "BUILD_ROAD",
    at: pair ? ROAD_LINK_V7.junction : ROAD_LINK_V7.build,
  });
  return {
    plan: feedbackPlanV7(result.before, result.events, result.after),
    after: result.after,
  };
}

describe("Road link: board feedback", () => {
  it("sends an icon each way along the Road; each city's pips fill as it lands", () => {
    const { plan, after } = linkPlan();
    const { feedback, advance, pendingFrames } = rig("FULL", after);
    const [capitalId, villageId] = [
      plan.roadLinks[0]?.capitalId,
      plan.roadLinks[0]?.cityId,
    ];
    if (capitalId === undefined || villageId === undefined)
      throw new Error("no link");
    const ticket = feedback.hold(plan);
    // Held at the old meter while the presentation plays.
    expect(feedback.boardFrame(after).cityMeter(capitalId)).toEqual({
      level: 1,
      population: 0,
    });
    const launch = feedback.launch(ticket);
    const way = roadHopMsV7(3);
    expect(launch.roadArrivalMs).toBe(way);
    expect(feedback.snapshot().roadFlights).toBe(2);
    advance(way - 40);
    // On the way: nothing is in yet, nothing blocks the board.
    expect(feedback.boardFrame(after).cityMeter(villageId)?.population).toBe(0);
    advance(60);
    // Landed: the meters tick up, the cities hop, the pips sparkle.
    expect(feedback.boardFrame(after).cityMeter(capitalId)).toBeNull();
    expect(feedback.boardFrame(after).cityMeter(villageId)).toBeNull();
    expect(feedback.snapshot()).toMatchObject({
      roadFlights: 0,
      pipCues: ["LANDING", "LANDING"],
    });
    expect(feedback.snapshot().cityHops).toEqual(
      expect.arrayContaining([capitalId, villageId]),
    );
    advance(Math.max(ROAD_LANDING_MS_V7, CITY_HOP_MS_V7) + 40);
    expect(feedback.snapshot()).toMatchObject({
      roadFlights: 0,
      pipCues: [],
      cityHops: [],
      heldCities: [],
    });
    expect(pendingFrames()).toBe(0);
  });

  it("staggers several links of one Road, and fills the capital by one each", () => {
    const { plan, after } = linkPlan(true);
    const { feedback, advance } = rig("FULL", after);
    const capitalId = plan.roadLinks[0]?.capitalId;
    if (capitalId === undefined) throw new Error("no link");
    const launch = feedback.launch(feedback.hold(plan));
    expect(feedback.snapshot().roadFlights).toBe(4);
    const way = roadHopMsV7(3);
    expect(launch.roadArrivalMs).toBe(way);
    advance(way + 20);
    // The first link's icon is in; the second's follows.
    expect(feedback.boardFrame(after).cityMeter(capitalId)?.population).toBe(1);
    advance(ROAD_LINK_STAGGER_MS_V7);
    expect(feedback.boardFrame(after).cityMeter(capitalId)).toBeNull();
    expect(feedback.snapshot().roadFlights).toBe(0);
  });

  it("flies a link whose city shows no gain without touching its meter", () => {
    const { plan, after } = linkPlan();
    const link = plan.roadLinks[0];
    if (link === undefined) throw new Error("no link");
    // As for a city just captured onto the Roads: no gain of its own.
    const captured: FeedbackPlanV7 = {
      ...plan,
      population: plan.population.filter((gain) => gain.cityId !== link.cityId),
    };
    const { feedback, advance } = rig("FULL", after);
    feedback.launch(feedback.hold(captured));
    expect(feedback.snapshot()).toMatchObject({
      roadFlights: 2,
      heldCities: [link.capitalId],
    });
    advance(roadHopMsV7(3) + 20);
    expect(feedback.snapshot()).toMatchObject({
      roadFlights: 0,
      heldCities: [],
    });
    expect(feedback.snapshot().cityHops).toContain(link.cityId);
  });

  it("lets a lost link's pip rise and fade, with no icon on the Road", () => {
    const linked = linkedState();
    const cut = boundary(linked, withoutRoad(linked, ROAD_LINK_V7.build));
    const plan = feedbackPlanV7(cut.before, cut.events, cut.after);
    const { feedback, advance } = rig("FULL", cut.after);
    const launch = feedback.launch(feedback.hold(plan));
    expect(launch.roadArrivalMs).toBeUndefined();
    expect(feedback.snapshot()).toMatchObject({
      roadFlights: 0,
      pipCues: ["UNLINK", "UNLINK"],
    });
    advance(ROAD_UNLINK_MS_V7 + 20);
    expect(feedback.snapshot().pipCues).toEqual([]);
  });

  it("glows both cities' pips, still, in reduced motion, and shows the meters at once", () => {
    const { plan, after } = linkPlan();
    const { feedback, model, advance, pendingFrames } = rig("REDUCED", after);
    const link = plan.roadLinks[0];
    if (link === undefined) throw new Error("no link");
    const ticket = feedback.hold(plan);
    expect(feedback.boardFrame(after).cityMeter(link.capitalId)).toBeNull();
    const launch = feedback.launch(ticket);
    expect(launch).toEqual({ populationArrivalMs: null, levelUpMs: null });
    expect(feedback.snapshot()).toMatchObject({
      roadFlights: 0,
      flights: 0,
      cityHops: [],
      pipCues: ["GLOW", "GLOW"],
    });
    // The host's next update keeps the glow (it does not move).
    feedback.sync(model());
    expect(feedback.snapshot().pipCues).toEqual(["GLOW", "GLOW"]);
    expect(feedback.boardFrame(after).cityHopCssPx(link.cityId)).toBe(0);
    advance(ROAD_GLOW_MS_V7 + 20);
    expect(feedback.snapshot().pipCues).toEqual([]);
    expect(pendingFrames()).toBe(0);
  });

  it("shows nothing for a lost link in reduced motion", () => {
    const linked = linkedState();
    const cut = boundary(linked, withoutRoad(linked, ROAD_LINK_V7.build));
    const plan = feedbackPlanV7(cut.before, cut.events, cut.after);
    const { feedback, pendingFrames } = rig("REDUCED", cut.after);
    feedback.launch(feedback.hold(plan));
    expect(feedback.snapshot()).toMatchObject({ pipCues: [], tickets: 0 });
    expect(pendingFrames()).toBe(0);
  });
});
