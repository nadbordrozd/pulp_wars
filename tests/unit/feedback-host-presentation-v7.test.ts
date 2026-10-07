import { describe, expect, it } from "vitest";
import {
  PROMOTION_KILLS_V7,
  queryPlayerCommandsV7,
  viewForV7,
  type GameStateV7,
  type PlayerViewV7,
} from "../../src/engine/index";
import {
  BoardFeedbackV7,
  type BoardFeedbackModelV7,
} from "../../src/render/canvas/feedback-host-v7";
import {
  CITY_HOP_MS_V7,
  LEVEL_UP_RING_MS_V7,
  POPULATION_HOP_MS_V7,
  POPULATION_ICONS_PER_CITY_V7,
  POPULATION_ICON_CAP_V7,
  PROMOTION_CELEBRATION_MS_V7,
  PROMOTION_MARKER_POP_MS_V7,
} from "../../src/render/canvas/feedback-motion-v7";
import {
  EMPTY_FEEDBACK_PLAN_V7,
  type FeedbackPlanV7,
} from "../../src/render/feedback-plan-v7";
import { goblinArenaV7 } from "../fixtures/v7-goblin-arena";

/**
 * Bead pulp_wars-2yc.29: the board's feedback animations on a fake clock:
 * holds and launches, arrivals, hops, the Promotion marker, reduced motion
 * and the pause, with no real frame, canvas or timer.
 */
function rig(motion: "FULL" | "REDUCED" = "FULL") {
  let now = 1_000;
  let serial = 0;
  let draws = 0;
  let nextFrame = 1;
  const frames = new Map<number, () => void>();
  const feedback = new BoardFeedbackV7({
    now: () => now,
    draw: () => {
      serial += 1;
      draws += 1;
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
    camera: () => ({ offsetX: 10, offsetY: 20, zoom: 0.5 }),
    canvasClientRect: () => ({ left: 5, top: 7, width: 800, height: 600 }),
    raster: { readPixels: () => null, createSurface: () => null },
  });
  const state = scene();
  const view = viewForV7(state, state.humanPlayerId);
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
    view,
    model,
    /** Moves the clock on and runs the frames that were asked for. */
    advance(ms: number, step = 16): void {
      const end = now + ms;
      while (now < end) {
        now = Math.min(end, now + step);
        const due = [...frames.values()];
        frames.clear();
        for (const frame of due) frame();
      }
    },
    pendingFrames: () => frames.size,
    draws: () => draws,
    hostDraw: () => {
      serial += 1;
    },
  };
}

function scene(): GameStateV7 {
  const state = goblinArenaV7(
    ["ORIGINAL", "ORIGINAL"],
    [
      { seat: 0, role: "FIGHTER", at: { x: 4, y: 4 } },
      { seat: 0, role: "FIGHTER", at: { x: 6, y: 4 } },
      { seat: 1, role: "FIGHTER", at: { x: 8, y: 4 } },
    ],
  );
  return {
    ...state,
    units: state.units.map((unit, index) =>
      index === 2 ? { ...unit, kills: PROMOTION_KILLS_V7 } : unit,
    ),
  };
}

function withKills(view: PlayerViewV7, unitId: number): PlayerViewV7 {
  return {
    ...view,
    units: view.units.map((unit) =>
      unit.id === unitId ? { ...unit, kills: PROMOTION_KILLS_V7 } : unit,
    ),
  };
}

function populationPlan(
  view: PlayerViewV7,
  amount: number,
  leveledUp = false,
  sources = 1,
): FeedbackPlanV7 {
  const city = view.cities[0];
  if (city === undefined) throw new Error("fixture");
  const each = Math.floor(amount / sources);
  return {
    ...EMPTY_FEEDBACK_PLAN_V7,
    population: [
      {
        cityId: city.id,
        cityAt: city.at,
        amount,
        sources: Array.from({ length: sources }, (_, index) => ({
          at: { x: city.at.x - 1 - index, y: city.at.y },
          amount: index === 0 ? amount - each * (sources - 1) : each,
        })),
        leveledUp,
        meterBefore: { level: 1, population: 0 },
      },
    ],
  };
}

describe("board feedback: population", () => {
  it("holds the city's meter until its points arrive, then hops the city", () => {
    const { feedback, view, advance } = rig();
    const city = view.cities[0];
    if (city === undefined) throw new Error("fixture");
    const ticket = feedback.hold(populationPlan(view, 2));
    expect(feedback.boardFrame(view).cityMeter(city.id)).toEqual({
      level: 1,
      population: 0,
    });
    expect(feedback.boardFrame(view).cityHopCssPx(city.id)).toBe(0);
    const launch = feedback.launch(ticket);
    expect(launch.populationArrivalMs).toBe(POPULATION_HOP_MS_V7);
    expect(launch.levelUpMs).toBeNull();
    expect(feedback.snapshot().flights).toBe(2);
    advance(POPULATION_HOP_MS_V7 - 30);
    expect(feedback.boardFrame(view).cityMeter(city.id)?.population).toBe(0);
    advance(60);
    // The first point is in: the meter shows it and the city hops.
    expect(feedback.boardFrame(view).cityMeter(city.id)?.population).toBe(1);
    expect(feedback.boardFrame(view).cityHopCssPx(city.id)).toBeLessThan(0);
    advance(POPULATION_HOP_MS_V7);
    // Everything arrived: the true meter is back and nothing moves.
    expect(feedback.boardFrame(view).cityMeter(city.id)).toBeNull();
    advance(CITY_HOP_MS_V7 * 2);
    expect(feedback.boardFrame(view).cityHopCssPx(city.id)).toBe(0);
    expect(feedback.snapshot()).toMatchObject({
      flights: 0,
      bursts: 0,
      cityHops: [],
      heldCities: [],
      tickets: 0,
    });
  });

  it("caps the icons of a city and of the board, losing no point", () => {
    const { feedback, view, advance } = rig();
    const city = view.cities[0];
    if (city === undefined) throw new Error("fixture");
    feedback.launch(feedback.hold(populationPlan(view, 14, false, 2)));
    expect(feedback.snapshot().flights).toBe(POPULATION_ICONS_PER_CITY_V7);
    for (let batch = 0; batch < 6; batch += 1)
      feedback.launch(feedback.hold(populationPlan(view, 9)));
    expect(feedback.snapshot().flights).toBeLessThanOrEqual(
      POPULATION_ICON_CAP_V7,
    );
    advance(3_000);
    expect(feedback.snapshot()).toMatchObject({ flights: 0, heldCities: [] });
    expect(feedback.boardFrame(view).cityMeter(city.id)).toBeNull();
  });

  it("plays the level-up ring after the city's hop", () => {
    const { feedback, view, advance } = rig();
    const launch = feedback.launch(
      feedback.hold(populationPlan(view, 1, true)),
    );
    expect(launch.levelUpMs).toBe(POPULATION_HOP_MS_V7 + CITY_HOP_MS_V7);
    advance(POPULATION_HOP_MS_V7 + 20);
    expect(feedback.snapshot().bursts).toBe(1);
    advance(CITY_HOP_MS_V7 + LEVEL_UP_RING_MS_V7 + 60);
    expect(feedback.snapshot().bursts).toBe(0);
  });

  it("shows a gain with no tile to come from at once, with the hop", () => {
    const { feedback, view } = rig();
    const city = view.cities[0];
    if (city === undefined) throw new Error("fixture");
    const plan = populationPlan(view, 1);
    const atCity: FeedbackPlanV7 = {
      ...plan,
      population: plan.population.map((gain) => ({
        ...gain,
        sources: [{ at: gain.cityAt, amount: 1 }],
      })),
    };
    const launch = feedback.launch(feedback.hold(atCity));
    expect(launch.populationArrivalMs).toBe(0);
    expect(feedback.snapshot().flights).toBe(0);
    expect(feedback.boardFrame(view).cityMeter(city.id)).toBeNull();
    expect(feedback.snapshot().cityHops).toEqual([city.id]);
  });

  it("finishes at once: the true state shows and a late launch does nothing", () => {
    const { feedback, view } = rig();
    const city = view.cities[0];
    if (city === undefined) throw new Error("fixture");
    const first = feedback.hold(populationPlan(view, 3));
    const second = feedback.hold(populationPlan(view, 2));
    feedback.launch(first);
    feedback.finish();
    expect(feedback.boardFrame(view).cityMeter(city.id)).toBeNull();
    expect(feedback.launch(second)).toEqual({
      populationArrivalMs: null,
      levelUpMs: null,
    });
    expect(feedback.snapshot()).toMatchObject({ flights: 0, tickets: 0 });
  });

  it("ends everything when another match is shown", () => {
    const { feedback, view, model } = rig();
    feedback.launch(feedback.hold(populationPlan(view, 3)));
    feedback.sync(model({ matchInstanceId: 2 }));
    expect(feedback.snapshot()).toMatchObject({ flights: 0, heldCities: [] });
  });
});

describe("board feedback: reduced motion and pause", () => {
  it("holds nothing and hops nothing in reduced motion", () => {
    const { feedback, view, pendingFrames } = rig("REDUCED");
    const city = view.cities[0];
    const tile = view.board.tiles.find(
      (item) => item.explored && item.territoryCityId === city?.id,
    );
    if (city === undefined || tile === undefined) throw new Error("fixture");
    expect(feedback.animated()).toBe(false);
    const ticket = feedback.hold(populationPlan(view, 2, true));
    // The meter fills at once.
    expect(feedback.boardFrame(view).cityMeter(city.id)).toBeNull();
    expect(feedback.launch(ticket)).toEqual({
      populationArrivalMs: null,
      levelUpMs: null,
    });
    feedback.territoryClick(view, tile.at);
    expect(feedback.snapshot()).toMatchObject({
      flights: 0,
      bursts: 0,
      cityHops: [],
    });
    expect(pendingFrames()).toBe(0);
    const frame = feedback.boardFrame(view);
    expect(frame.pulse).toBe(0);
    expect(frame.chevronBounceCssPx).toBe(0);
  });

  it("drops running animations when the player switches to reduced motion", () => {
    const { feedback, view, model } = rig();
    feedback.launch(feedback.hold(populationPlan(view, 3)));
    feedback.sync(model({ motion: "REDUCED" }));
    expect(feedback.snapshot()).toMatchObject({ flights: 0, heldCities: [] });
  });

  it("stands still while Settings is open and goes on afterwards", () => {
    const { feedback, view, model, advance } = rig();
    const city = view.cities[0];
    if (city === undefined) throw new Error("fixture");
    feedback.launch(feedback.hold(populationPlan(view, 1)));
    advance(100);
    feedback.sync(model({ presentationPaused: true }));
    const frozen = feedback.timeMs();
    advance(5_000);
    expect(feedback.timeMs()).toBe(frozen);
    expect(feedback.snapshot().flights).toBe(1);
    feedback.sync(model());
    advance(POPULATION_HOP_MS_V7);
    expect(feedback.snapshot().flights).toBe(0);
  });

  it("is twice as fast at Fast animation speed", () => {
    const { feedback, view, model } = rig();
    feedback.sync(model({ animationSpeed: "FAST" }));
    expect(feedback.durationScale()).toBe(0.5);
    expect(
      feedback.launch(feedback.hold(populationPlan(view, 1)))
        .populationArrivalMs,
    ).toBe(POPULATION_HOP_MS_V7 / 2);
  });
});

describe("board feedback: frames", () => {
  it("draws once per frame and leaves a frame the host already drew", () => {
    const { feedback, view, advance, draws, hostDraw } = rig();
    feedback.launch(feedback.hold(populationPlan(view, 1)));
    const before = draws();
    advance(16, 16);
    advance(16, 16);
    expect(draws()).toBeGreaterThan(before);
    // The host draws every frame (a presentation, its ambient loop).
    const settled = draws();
    for (let frame = 0; frame < 5; frame += 1) {
      hostDraw();
      advance(16, 16);
    }
    expect(draws()).toBe(settled);
  });

  it("asks for no frame when nothing moves", () => {
    const { feedback, view, advance, pendingFrames } = rig();
    expect(pendingFrames()).toBe(0);
    feedback.launch(feedback.hold(populationPlan(view, 1)));
    expect(pendingFrames()).toBe(1);
    advance(3_000);
    expect(pendingFrames()).toBe(0);
  });

  it("runs a frame listener while it asks for more", () => {
    const { feedback, advance, pendingFrames } = rig();
    let left = 3;
    const seen: number[] = [];
    feedback.setFrameListener((time) => {
      seen.push(time);
      left -= 1;
      return left > 0;
    });
    feedback.requestFrames();
    advance(200);
    expect(seen).toHaveLength(3);
    expect(pendingFrames()).toBe(0);
  });

  it("gives tile centres and the board frame in client coordinates", () => {
    const { feedback } = rig();
    // Camera (10, 20) at zoom 0.5, 128 px world tiles, canvas at (5, 7).
    expect(feedback.cellClientPoint({ x: 2, y: 1 })).toEqual({
      x: 5 + 10 + 2 * 64,
      y: 7 + 20 + 64,
    });
    expect(feedback.boardClientFrame()).toEqual({
      left: 5,
      top: 7,
      right: 805,
      bottom: 607,
    });
  });
});

describe("board feedback: the city hop on a territory click", () => {
  it("hops the city whose territory holds the tile, and no other", () => {
    const { feedback, view, advance } = rig();
    const tile = view.board.tiles.find(
      (item) =>
        item.explored &&
        item.territoryCityId !== null &&
        item.site === null &&
        view.cities.some((city) => city.id === item.territoryCityId),
    );
    const outside = view.board.tiles.find(
      (item) => item.explored && item.territoryCityId === null,
    );
    if (
      tile === undefined ||
      !tile.explored ||
      tile.territoryCityId === null ||
      outside === undefined
    )
      throw new Error("fixture");
    feedback.territoryClick(view, outside.at);
    expect(feedback.snapshot().cityHops).toEqual([]);
    feedback.territoryClick(view, tile.at);
    expect(feedback.snapshot().cityHops).toEqual([tile.territoryCityId]);
    advance(CITY_HOP_MS_V7 * 0.35);
    expect(
      feedback.boardFrame(view).cityHopCssPx(tile.territoryCityId),
    ).toBeLessThan(-5);
    for (const city of view.cities)
      if (city.id !== tile.territoryCityId)
        expect(feedback.boardFrame(view).cityHopCssPx(city.id)).toBe(0);
    advance(CITY_HOP_MS_V7);
    expect(feedback.snapshot().cityHops).toEqual([]);
  });

  it("hops another player's visible city too", () => {
    const { feedback, view } = rig();
    const foreign = view.cities.find((city) => city.ownerId !== view.viewer.id);
    if (foreign === undefined) throw new Error("fixture");
    feedback.territoryClick(view, foreign.at);
    expect(feedback.snapshot().cityHops).toEqual([foreign.id]);
  });
});

describe("board feedback: the Promotion marker", () => {
  it("marks every visible unit that waits, bobbing only the viewer's", () => {
    const { feedback, view, advance } = rig();
    const own = view.units.find((unit) => unit.ownerId === view.viewer.id);
    const enemy = view.units.find((unit) => unit.ownerId !== view.viewer.id);
    if (own === undefined || enemy === undefined) throw new Error("fixture");
    const ready = withKills(view, own.id);
    advance(400);
    const frame = feedback.boardFrame(ready);
    expect(frame.promotionMarker(own.id)).toMatchObject({
      own: true,
      scale: 1,
    });
    expect(frame.promotionMarker(own.id)?.bobCssPx).toBeLessThan(0);
    // The enemy's kills are public on a visible unit: a still marker.
    expect(frame.promotionMarker(enemy.id)).toEqual({
      own: false,
      scale: 1,
      bobCssPx: 0,
    });
    // No marker without the kills, and none for a unit not in the view.
    expect(feedback.boardFrame(view).promotionMarker(own.id)).toBeNull();
    expect(frame.promotionMarker(99_999)).toBeNull();
  });

  it("celebrates an earned Promotion, then grows the marker in", () => {
    const { feedback, view, advance } = rig();
    const own = view.units.find((unit) => unit.ownerId === view.viewer.id);
    if (own === undefined) throw new Error("fixture");
    const ready = withKills(view, own.id);
    const ticket = feedback.hold({
      ...EMPTY_FEEDBACK_PLAN_V7,
      promotionsEarned: [{ unitId: own.id, at: own.at, own: true }],
    });
    // Held back until the kill has played.
    expect(feedback.boardFrame(ready).promotionMarker(own.id)).toBeNull();
    feedback.launch(ticket);
    expect(feedback.snapshot()).toMatchObject({
      unitHops: [own.id],
      bursts: 1,
    });
    advance(120);
    expect(feedback.boardFrame(ready).unitHopCssPx(own.id)).toBeLessThan(0);
    expect(feedback.boardFrame(ready).promotionMarker(own.id)).toBeNull();
    advance(PROMOTION_CELEBRATION_MS_V7 * 0.6 - 120 + 30);
    const growing = feedback.boardFrame(ready).promotionMarker(own.id);
    expect(growing?.scale).toBeGreaterThan(0);
    expect(growing?.scale).toBeLessThan(1);
    advance(PROMOTION_MARKER_POP_MS_V7 + PROMOTION_CELEBRATION_MS_V7);
    expect(feedback.boardFrame(ready).promotionMarker(own.id)?.scale).toBe(1);
    expect(feedback.snapshot()).toMatchObject({ unitHops: [], bursts: 0 });
  });

  it("clears the marker when the unit is promoted, with a flourish", () => {
    const { feedback, view, advance } = rig();
    const own = view.units.find((unit) => unit.ownerId === view.viewer.id);
    if (own === undefined) throw new Error("fixture");
    const promoted: PlayerViewV7 = {
      ...view,
      units: view.units.map((unit) =>
        unit.id === own.id
          ? { ...unit, kills: PROMOTION_KILLS_V7, veteran: true }
          : unit,
      ),
    };
    feedback.launch(
      feedback.hold({
        ...EMPTY_FEEDBACK_PLAN_V7,
        promoted: [{ unitId: own.id, at: own.at, own: true }],
      }),
    );
    expect(feedback.boardFrame(promoted).promotionMarker(own.id)).toBeNull();
    expect(feedback.snapshot().bursts).toBe(1);
    advance(1_000);
    expect(feedback.snapshot().bursts).toBe(0);
  });

  it("shows the marker at once, still, in reduced motion", () => {
    const { feedback, view } = rig("REDUCED");
    const own = view.units.find((unit) => unit.ownerId === view.viewer.id);
    if (own === undefined) throw new Error("fixture");
    const ready = withKills(view, own.id);
    feedback.launch(
      feedback.hold({
        ...EMPTY_FEEDBACK_PLAN_V7,
        promotionsEarned: [{ unitId: own.id, at: own.at, own: true }],
      }),
    );
    expect(feedback.boardFrame(ready).promotionMarker(own.id)).toEqual({
      own: true,
      scale: 1,
      bobCssPx: -0,
    });
    expect(feedback.boardFrame(ready).unitHopCssPx(own.id)).toBe(0);
  });

  it("keeps the ambient loop on only for the viewer's waiting unit", () => {
    const { feedback, view, model } = rig();
    const own = view.units.find((unit) => unit.ownerId === view.viewer.id);
    if (own === undefined) throw new Error("fixture");
    // Only the enemy waits: nothing bobs.
    expect(feedback.wantsAmbientFrames()).toBe(false);
    feedback.sync(model({ view: withKills(view, own.id) }));
    expect(feedback.wantsAmbientFrames()).toBe(true);
    feedback.sync(model({ view: withKills(view, own.id), interactive: false }));
    expect(feedback.wantsAmbientFrames()).toBe(false);
  });
});

describe("board feedback: the yet-to-move states", () => {
  it("gives the board each unit's state and keeps it while a command settles", () => {
    const { feedback, view, model } = rig();
    const own = view.units.filter((unit) => unit.ownerId === view.viewer.id);
    const enemy = view.units.find((unit) => unit.ownerId !== view.viewer.id);
    const frame = feedback.boardFrame(view);
    for (const unit of own) expect(frame.turnState(unit.id)).toBe("FRESH");
    expect(frame.turnState(enemy?.id ?? -1)).toBeNull();
    // No command is offered for a moment: nothing turns spent.
    feedback.sync(model({ offeredCommands: [] }));
    for (const unit of own)
      expect(feedback.boardFrame(view).turnState(unit.id)).toBe("FRESH");
    const handled: PlayerViewV7 = {
      ...view,
      units: view.units.map((unit) =>
        unit.id === own[0]?.id
          ? { ...unit, activation: { ...unit.activation, handled: true } }
          : unit,
      ),
    };
    feedback.sync(
      model({ view: handled, offeredCommands: queryPlayerCommandsV7(handled) }),
    );
    expect(feedback.boardFrame(handled).turnState(own[0]?.id ?? -1)).toBe(
      "SPENT",
    );
  });
});
