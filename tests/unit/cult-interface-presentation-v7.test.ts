import { describe, expect, it } from "vitest";
import {
  applyCommandV7,
  projectEventsV7,
  queryPlayerCommandsV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type GameStateV7,
  type PlayerViewV7,
  type UnitId,
} from "../../src/engine/index";
import { buildBoardRenderPlanV7 } from "../../src/render/canvas/board-renderer-v7";
import {
  BoardFeedbackV7,
  type BoardFeedbackModelV7,
} from "../../src/render/canvas/feedback-host-v7";
import {
  OFFERING_PIP_STAGGER_MS_V7,
  ROAD_UNLINK_MS_V7,
} from "../../src/render/canvas/feedback-motion-v7";
import { targetHighlightStyleV7 } from "../../src/render/canvas/target-highlight-v7";
import {
  SACRIFICE_AFFLICTED_V7,
  SEIZE_HEALTHY_V7,
  SEIZE_IMMUNE_V7,
  SEIZE_NO_HOLDER_V7,
  SUMMONER_ALREADY_ACTED_V7,
  cultBoundaryNoticeV7,
  favourEntriesV7,
  sacrificeUnavailableTextV7,
  seatHasFavourV7,
  seizeUnavailableTextV7,
} from "../../src/render/cult-presentation-v7";
import {
  EMPTY_FEEDBACK_PLAN_V7,
  feedbackPlanV7,
} from "../../src/render/feedback-plan-v7";
import { checkedV7 } from "../fixtures/v7-builders";
import { cultFieldV7 } from "../fixtures/v7-cult";
import {
  CULT_UI_V7,
  cultFavourUiFixtureV7,
  cultRivalUiFixtureV7,
} from "../fixtures/v7-cult-ui";
import { seatIdV7, unitAtV7 } from "../fixtures/v7-goblin-arena";
import { at, attackV7, patchUnitV7 } from "../fixtures/v7-revision20";

/**
 * The Cult interface (bead `pulp_wars-mch9.17`): what the board marks while
 * a Sacrifice or a Seize is aimed, why a button cannot be used, where a
 * gain of Favour comes from, what an Offering takes from its city's pips,
 * and what the notice says. Hand-built states only: no match is played.
 */

/** A command of `seat`, with the views and events of `viewerSeat`. */
function step(
  state: GameStateV7,
  command: CommandV7,
  seat = 0,
  viewerSeat = seat,
) {
  const applied = applyCommandV7(state, seatIdV7(state, seat), command);
  if (!applied.accepted) throw new Error(JSON.stringify(applied.error));
  const viewer = seatIdV7(state, viewerSeat);
  return {
    state: applied.state,
    before: viewForV7(state, viewer),
    after: viewForV7(applied.state, viewer),
    events: projectEventsV7(state, applied.state, viewer, applied.events),
  };
}

const idAt = (state: GameStateV7, where: CoordV7): UnitId =>
  unitAtV7(state, where).id;

const sacrificeOf = (state: GameStateV7, victim: CoordV7): CommandV7 => ({
  kind: "SACRIFICE",
  unitId: idAt(state, CULT_UI_V7.summoner),
  victimUnitId: idAt(state, victim),
});

const seizeOf = (state: GameStateV7, victim: CoordV7): CommandV7 => ({
  kind: "SEIZE",
  unitId: idAt(state, CULT_UI_V7.summoner),
  victimUnitId: idAt(state, victim),
});

function capitalOf(state: GameStateV7, seat: number) {
  const city = state.cities.find(
    (candidate) => candidate.ownerId === seatIdV7(state, seat),
  );
  if (city === undefined) throw new Error("no capital");
  return city;
}

function planOf(view: PlayerViewV7, kind: "SACRIFICE" | "SEIZE") {
  const summoner = view.units.find(
    (unit) =>
      unit.at.x === CULT_UI_V7.summoner.x &&
      unit.at.y === CULT_UI_V7.summoner.y,
  );
  if (summoner === undefined) throw new Error("no Summoner");
  return buildBoardRenderPlanV7(view, queryPlayerCommandsV7(view), {
    selection: { kind: "UNIT", unitId: summoner.id },
    selectedUnitId: summoner.id,
    selectedAchievement: null,
    cultPick: { kind, unitId: summoner.id },
  });
}

/** The fixture with a Bitten Initiate and a Plagued Thing beside the Summoner. */
function afflicted(): GameStateV7 {
  const base = cultFieldV7(
    [
      { seat: 0, role: "CAPTAIN", at: CULT_UI_V7.summoner },
      { seat: 0, role: "JUGGERNAUT", at: CULT_UI_V7.thing },
      { seat: 0, role: "FIGHTER", at: CULT_UI_V7.initiate },
      { seat: 1, role: "GUARD", at: at(1, 1) },
      { seat: 1, role: "CATAPULT", at: at(1, 2) },
    ],
    { factions: ["CULT", "UNDEAD"] },
  );
  const zombie = unitAtV7(base, at(1, 1));
  return checkedV7({
    ...base,
    bitten: [
      {
        unitId: idAt(base, CULT_UI_V7.initiate),
        biterPlayerId: zombie.ownerId,
        biterUnitId: zombie.id,
      },
    ],
    plagued: [
      {
        unitId: idAt(base, CULT_UI_V7.thing),
        sourceUnitId: idAt(base, at(1, 2)),
        turnsRemaining: 3,
      },
    ],
  });
}

describe("the board while a Sacrifice or a Seize is aimed", () => {
  it("marks each own unit with the Help ring and its value, and nothing else", () => {
    const state = cultFavourUiFixtureV7();
    const plan = planOf(viewForV7(state, state.humanPlayerId), "SACRIFICE");
    expect(
      plan.targets.map((target) => [
        target.family,
        target.at,
        target.previewLabel,
        target.command,
      ]),
    ).toEqual([
      [
        "SACRIFICE",
        CULT_UI_V7.thing,
        "+12 Favour",
        sacrificeOf(state, CULT_UI_V7.thing),
      ],
      [
        "SACRIFICE",
        CULT_UI_V7.initiate,
        "+2 Favour",
        sacrificeOf(state, CULT_UI_V7.initiate),
      ],
    ]);
    expect(targetHighlightStyleV7("SACRIFICE")).toBe("SUPPORT");
    expect(plan.targets[0]?.semanticLabel).toBe(
      "Sacrifice this Thing in the Cellar: +12 Favour. It is gone for good. Choose a unit of yours next to it",
    );
    // No grey reason: every own unit beside it may be offered.
    expect(
      plan.entries.filter((entry) => entry.kind === "ABILITY_TARGET"),
    ).toEqual([]);
  });

  it("marks the broken enemy with the Attack mark and twice its value", () => {
    const state = cultFavourUiFixtureV7();
    const plan = planOf(viewForV7(state, state.humanPlayerId), "SEIZE");
    expect(
      plan.targets.map((target) => [
        target.family,
        target.at,
        target.previewLabel,
        target.command,
      ]),
    ).toEqual([
      [
        "SEIZE",
        CULT_UI_V7.knight,
        "+18 Favour",
        seizeOf(state, CULT_UI_V7.knight),
      ],
    ]);
    expect(targetHighlightStyleV7("SEIZE")).toBe("ATTACK");
  });

  it("greys a Plagued or Bitten own unit with its reason, and offers neither", () => {
    const state = afflicted();
    const view = viewForV7(state, state.humanPlayerId);
    const plan = planOf(view, "SACRIFICE");
    expect(plan.targets).toEqual([]);
    expect(
      plan.entries
        .filter((entry) => entry.kind === "ABILITY_TARGET")
        .map((entry) => [entry.at, entry.label])
        .sort((left, right) => String(left[1]).localeCompare(String(right[1]))),
    ).toEqual([
      [CULT_UI_V7.initiate, "Bitten"],
      [CULT_UI_V7.thing, "Plagued"],
    ]);
  });

  it("greys an enemy that cannot be Seized with the first failing rule", () => {
    // A broken Knight nobody holds, a healthy Fighter, a broken giant.
    const state = cultFieldV7([
      { seat: 0, role: "CAPTAIN", at: CULT_UI_V7.summoner },
      { seat: 1, role: "KNIGHT", at: CULT_UI_V7.knight, hp: 5 },
      { seat: 1, role: "FIGHTER", at: CULT_UI_V7.fighter },
      { seat: 1, role: "JUGGERNAUT", at: at(6, 1), hp: 3 },
    ]);
    const plan = planOf(viewForV7(state, state.humanPlayerId), "SEIZE");
    expect(plan.targets).toEqual([]);
    expect(
      plan.entries
        .filter((entry) => entry.kind === "ABILITY_TARGET")
        .map((entry) => [entry.at, entry.label])
        .sort((left, right) => String(left[1]).localeCompare(String(right[1]))),
    ).toEqual([
      [CULT_UI_V7.fighter, "Above 5 HP"],
      [at(6, 1), "Cannot be Seized"],
      [CULT_UI_V7.knight, "Nobody holds it"],
    ]);
  });
});

describe("why a Summoner's button cannot be used", () => {
  const reasons = (state: GameStateV7) => {
    const view = viewForV7(state, state.humanPlayerId);
    const summoner = view.units.find(
      (unit) =>
        unit.at.x === CULT_UI_V7.summoner.x &&
        unit.at.y === CULT_UI_V7.summoner.y,
    );
    if (summoner === undefined) throw new Error("no Summoner");
    return [
      sacrificeUnavailableTextV7(view, summoner, false),
      seizeUnavailableTextV7(view, summoner, false),
    ];
  };

  it("names the engine's reason, the nearest to a Seizure first", () => {
    expect(reasons(afflicted())).toEqual([SACRIFICE_AFFLICTED_V7, null]);
    const field = (pieces: Parameters<typeof cultFieldV7>[0]) =>
      cultFieldV7([
        { seat: 0, role: "CAPTAIN", at: CULT_UI_V7.summoner },
        ...pieces,
      ]);
    expect(
      reasons(
        field([
          { seat: 1, role: "KNIGHT", at: CULT_UI_V7.knight, hp: 5 },
          { seat: 1, role: "FIGHTER", at: CULT_UI_V7.fighter },
        ]),
      ),
    ).toEqual([null, SEIZE_NO_HOLDER_V7]);
    expect(
      reasons(field([{ seat: 1, role: "FIGHTER", at: CULT_UI_V7.fighter }])),
    ).toEqual([null, SEIZE_HEALTHY_V7]);
    expect(
      reasons(
        field([{ seat: 1, role: "JUGGERNAUT", at: CULT_UI_V7.fighter, hp: 2 }]),
      ),
    ).toEqual([null, SEIZE_IMMUNE_V7]);
    // Nobody beside it: neither button is shown.
    expect(reasons(field([]))).toEqual([null, null]);
  });

  it("says a Summoner that acted has acted", () => {
    const spent = patchUnitV7(cultFavourUiFixtureV7(), CULT_UI_V7.summoner, {
      activation: {
        ...unitAtV7(cultFavourUiFixtureV7(), CULT_UI_V7.summoner).activation,
        specialActed: true,
      },
    });
    expect(reasons(spent)).toEqual([
      SUMMONER_ALREADY_ACTED_V7,
      SUMMONER_ALREADY_ACTED_V7,
    ]);
  });

  it("gives no button to another seat's Summoner or to an offered command", () => {
    const state = cultRivalUiFixtureV7();
    const view = viewForV7(state, state.humanPlayerId);
    for (const unit of view.units) {
      expect(sacrificeUnavailableTextV7(view, unit, false)).toBeNull();
      expect(seizeUnavailableTextV7(view, unit, false)).toBeNull();
    }
    const own = viewForV7(cultFavourUiFixtureV7(), seatIdV7(state, 0));
    for (const unit of own.units)
      expect(sacrificeUnavailableTextV7(own, unit, true)).toBeNull();
  });
});

describe("the public Favour pools of a view", () => {
  it("lists every Cult seat and no other", () => {
    const state = cultRivalUiFixtureV7();
    const view = viewForV7(state, state.humanPlayerId);
    expect(favourEntriesV7(view)).toEqual([
      { playerId: seatIdV7(state, 1), favour: 11 },
    ]);
    expect(seatHasFavourV7(view, seatIdV7(state, 0))).toBe(false);
    expect(seatHasFavourV7(view, seatIdV7(state, 1))).toBe(true);
    // A view captured before the Cultists has no pools.
    const old = { ...view, cult: undefined } as unknown as PlayerViewV7;
    expect(favourEntriesV7(old)).toEqual([]);
  });
});

describe("where a gain of Favour comes from", () => {
  it("is the victim's tile for a Sacrifice and a Seizure", () => {
    const state = cultFavourUiFixtureV7();
    const sacrificed = step(state, sacrificeOf(state, CULT_UI_V7.thing));
    expect(
      feedbackPlanV7(sacrificed.before, sacrificed.events, sacrificed.after),
    ).toMatchObject({
      favour: [{ source: "SACRIFICE", at: CULT_UI_V7.thing, amount: 12 }],
      populationLosses: [],
      coins: [],
    });
    const seized = step(state, seizeOf(state, CULT_UI_V7.knight));
    expect(
      feedbackPlanV7(seized.before, seized.events, seized.after).favour,
    ).toEqual([{ source: "SEIZE", at: CULT_UI_V7.knight, amount: 18 }]);
  });

  it("is nothing for another seat: its Favour is read off the leaderboard", () => {
    const state = cultFavourUiFixtureV7();
    const seen = step(state, seizeOf(state, CULT_UI_V7.knight), 0, 1);
    expect(seen.events.events.map((event) => event.kind)).toContain(
      "FAVOUR_GAINED",
    );
    expect(feedbackPlanV7(seen.before, seen.events, seen.after).favour).toEqual(
      [],
    );
  });

  it("is the city for an Offering, with the population it gave up", () => {
    const state = cultFavourUiFixtureV7();
    const capital = capitalOf(state, 0);
    const offered = step(state, { kind: "OFFERING", cityId: capital.id });
    const plan = feedbackPlanV7(offered.before, offered.events, offered.after);
    expect(plan.favour).toEqual([
      { source: "OFFERING", at: capital.at, amount: 3 },
    ]);
    expect(plan.populationLosses).toEqual([
      { cityId: capital.id, at: capital.at, amount: 2 },
    ]);
    // An Offering is no population gain.
    expect(plan.population).toEqual([]);
  });

  it("is the tile a Chosen died on for a Martyr", () => {
    const state = cultFieldV7(
      [
        { seat: 0, role: "SWORDSMAN", at: at(5, 3), hp: 2 },
        { seat: 1, role: "KNIGHT", at: at(5, 4) },
      ],
      { activeSeat: 1 },
    );
    const run = attackV7(state, at(5, 4), at(5, 3));
    const cult = seatIdV7(state, 0);
    const before = viewForV7(state, cult);
    const after = viewForV7(run.state, cult);
    const events = projectEventsV7(state, run.state, cult, run.events);
    expect(feedbackPlanV7(before, events, after).favour).toEqual([
      { source: "MARTYR", at: at(5, 3), amount: 6 },
    ]);
    expect(cultBoundaryNoticeV7(events.events, before, after)).toEqual({
      text: "Martyr: +6 Favour",
      toast: true,
    });
  });

  it("is empty in the empty plan", () => {
    expect(EMPTY_FEEDBACK_PLAN_V7).toMatchObject({
      favour: [],
      populationLosses: [],
    });
  });
});

describe("the notice of a Cult boundary", () => {
  it("says what the viewer's offering paid, and a Seizure of the viewer's unit", () => {
    const state = cultFavourUiFixtureV7();
    const notice = (
      command: CommandV7,
      viewerSeat = 0,
    ): ReturnType<typeof cultBoundaryNoticeV7> => {
      const run = step(state, command, 0, viewerSeat);
      return cultBoundaryNoticeV7(run.events.events, run.before, run.after);
    };
    expect(notice(sacrificeOf(state, CULT_UI_V7.initiate))).toEqual({
      text: "Initiate Sacrificed: +2 Favour",
      toast: true,
    });
    expect(notice(seizeOf(state, CULT_UI_V7.knight))).toEqual({
      text: "Knight Seized: +18 Favour",
      toast: true,
    });
    expect(
      notice({ kind: "OFFERING", cityId: capitalOf(state, 0).id }),
    ).toEqual({ text: "Offering: +3 Favour, −2 population", toast: true });
    // The Human seat is told its Knight was Seized, and no more.
    expect(notice(seizeOf(state, CULT_UI_V7.knight), 1)).toEqual({
      text: "Player 1 Seized your Knight",
      toast: true,
    });
    expect(notice(sacrificeOf(state, CULT_UI_V7.initiate), 1)).toBeNull();
    expect(
      notice({ kind: "OFFERING", cityId: capitalOf(state, 0).id }, 1),
    ).toBeNull();
  });
});

describe("an Offering on the board", () => {
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
    const model: BoardFeedbackModelV7 = {
      matchInstanceId: 1,
      view,
      offeredCommands: queryPlayerCommandsV7(view),
      interactive: true,
      motion,
      animationSpeed: "NORMAL",
      presentationPaused: false,
    };
    feedback.sync(model);
    return {
      feedback,
      advance(ms: number): void {
        const end = now + ms;
        while (now < end) {
          now = Math.min(end, now + 16);
          const due = [...frames.values()];
          frames.clear();
          for (const frame of due) frame();
        }
      },
    };
  }

  function offering() {
    const state = cultFavourUiFixtureV7();
    const run = step(state, {
      kind: "OFFERING",
      cityId: capitalOf(state, 0).id,
    });
    return {
      plan: feedbackPlanV7(run.before, run.events, run.after),
      after: run.after,
    };
  }

  it("lets the two pips the city gave up rise and fade, one after the other", () => {
    const { plan, after } = offering();
    const { feedback, advance } = rig("FULL", after);
    feedback.launch(feedback.hold(plan));
    expect(feedback.snapshot().pipCues).toEqual(["UNLINK", "UNLINK"]);
    // The city's meter is the true one at once: nothing is held.
    expect(feedback.snapshot().heldCities).toEqual([]);
    advance(ROAD_UNLINK_MS_V7 + 20);
    expect(feedback.snapshot().pipCues).toEqual(["UNLINK"]);
    advance(OFFERING_PIP_STAGGER_MS_V7 + 20);
    expect(feedback.snapshot().pipCues).toEqual([]);
  });

  it("draws nothing with reduced motion: the notice carries the numbers", () => {
    const { plan, after } = offering();
    const { feedback } = rig("REDUCED", after);
    feedback.launch(feedback.hold(plan));
    expect(feedback.snapshot()).toMatchObject({ pipCues: [], tickets: 0 });
  });
});
