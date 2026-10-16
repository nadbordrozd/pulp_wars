import { describe, expect, it } from "vitest";
import {
  FAVOUR_CAP_V7,
  HERALD_HUNGER_FAVOUR_V7,
  applyCommandV7,
  favourOfV7,
  projectEventsV7,
  unitId,
  viewForV7,
  type CommandV7,
  type GameStateV7,
  type PlayerEventV7,
  type PlayerViewV7,
} from "../../src/engine/index";
import {
  HERALD_HUNGER_CHIP_V7,
  cultChannelChipsV7,
  cultChannelNoticePartsV7,
  daemonsShortV7,
  endTurnUnboundQuestionV7,
  heraldsHungryV7,
} from "../../src/render/cult-channel-presentation-v7";
import {
  FAVOUR_CAP_TEXT_V7,
  cultBoundaryNoticeV7,
  cultCommandPresentationV7,
  favourAtCapV7,
  favourBoardLabelV7,
  favourChipLabelV7,
  favourChipTextV7,
  favourChipTooltipV7,
  favourFullTextV7,
  favourGainLossTextV7,
  sacrificeTargetNameV7,
  seizeTargetNameV7,
  viewerFavourForfeitV7,
  viewerHungerDueV7,
} from "../../src/render/cult-presentation-v7";
import {
  feedbackPlanV7,
  tricklePayersV7,
} from "../../src/render/feedback-plan-v7";
import { withFavourV7 } from "../fixtures/v7-cult";
import {
  CULT_HUNGER_UI_V7,
  CULT_UI_V7,
  cultFavourUiFixtureV7,
  cultHungerUiFixtureV7,
} from "../fixtures/v7-cult-ui";
import { seatIdV7, unitAtV7 } from "../fixtures/v7-goblin-arena";

/**
 * The Cult redesign's Favour display (bead `pulp_wars-mch9.42`,
 * docs/product/RULESET_7_CULT_REDESIGN.md sections 6, 7.6 and 13): the chip
 * against the cap of 30, what a preview loses above it, the cue of what is
 * lost, the trickle's candles from the Summoners that paid, the Herald's
 * Hunger on its card and in the chip, the hungry End Turn question, and the
 * Unbound-by-Hunger notice. Hand-built states only: no match is played (the
 * Start Turn below is two End Turns, one per seat, with no AI).
 */

function capitalOf(state: GameStateV7) {
  const city = state.cities.find(
    (candidate) => candidate.ownerId === seatIdV7(state, 0),
  );
  if (city === undefined) throw new Error("no capital");
  return city;
}

const viewOf = (state: GameStateV7, seat = 0): PlayerViewV7 =>
  viewForV7(state, seatIdV7(state, seat));

/** A command of `seat` seen by `viewerSeat`. */
function step(
  state: GameStateV7,
  command: CommandV7,
  seat = 0,
  viewerSeat = 0,
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

/**
 * The Cult seat's next Start Turn as it sees it: it ends its turn, the
 * other seat ends its own at once (no AI plays), and the Cult's check runs.
 */
function nextStartTurn(state: GameStateV7) {
  const ended = applyCommandV7(state, seatIdV7(state, 0), { kind: "END_TURN" });
  if (!ended.accepted) throw new Error(JSON.stringify(ended.error));
  return step(ended.state, { kind: "END_TURN" }, 1, 0);
}

describe("the Favour chip against the cap", () => {
  it("reads 'n / 30', is full at the cap, and says the Hunger due", () => {
    expect(FAVOUR_CAP_V7).toBe(30);
    expect(favourChipTextV7(12)).toBe("12 / 30");
    expect(FAVOUR_CAP_TEXT_V7).toBe("/ 30");
    expect(favourAtCapV7(29)).toBe(false);
    expect(favourAtCapV7(30)).toBe(true);
    expect(favourChipLabelV7(12, 0)).toBe("12 of 30 Favour");
    expect(favourChipLabelV7(30, 2)).toBe(
      "30 of 30 Favour, full. Hunger −2 a turn",
    );
    expect(favourChipTooltipV7(12, 0)).toMatch(/^Favour: .*up to 30/);
    expect(favourChipTooltipV7(12, 0)).not.toMatch(/Full|Hunger/);
    expect(favourChipTooltipV7(30, 4)).toMatch(
      /Full: anything more is lost\. Hunger −4 a turn$/,
    );
  });

  it("counts the Hunger of the viewer's bound Heralds only", () => {
    const state = cultHungerUiFixtureV7(5);
    expect(viewerHungerDueV7(viewOf(state))).toBe(HERALD_HUNGER_FAVOUR_V7);
    // The rival sees the Herald but owes nothing.
    expect(viewerHungerDueV7(viewOf(state, 1))).toBe(0);
    expect(viewerHungerDueV7(viewOf(cultFavourUiFixtureV7()))).toBe(0);
  });
});

describe("what a preview loses above the cap", () => {
  it("says the part of a Sacrifice, a Seizure and an Offering that is lost", () => {
    expect(favourGainLossTextV7(12, 0)).toBe("+12 Favour");
    expect(favourGainLossTextV7(12, 7)).toBe("+12 Favour (7 lost)");
    expect(favourBoardLabelV7(12)).toBe("+12 Favour");
    expect(favourBoardLabelV7(12, 7)).toBe("+12 (7 lost)");
    expect(sacrificeTargetNameV7("Thing", 12, 7)).toBe(
      "Sacrifice this Thing: +12 Favour (7 lost). It is gone for good.",
    );
    expect(seizeTargetNameV7("Knight", 18, "Initiate", 8)).toBe(
      "Seize this Knight: +18 Favour (8 lost). Your Initiate holds it down.",
    );
    // The engine's own previews carry the same part.
    const state = withFavourV7(cultFavourUiFixtureV7(), 0, 25);
    const view = viewOf(state);
    expect(viewerFavourForfeitV7(view, 12)).toBe(7);
    expect(viewerFavourForfeitV7(view, 5)).toBe(0);
    const summoner = unitAtV7(state, CULT_UI_V7.summoner).id;
    expect(
      cultCommandPresentationV7(view, {
        kind: "SACRIFICE",
        unitId: summoner,
        victimUnitId: unitAtV7(state, CULT_UI_V7.thing).id,
      })?.chip,
    ).toBe("+12 Favour (7 lost)");
    expect(
      cultCommandPresentationV7(view, {
        kind: "SEIZE",
        unitId: summoner,
        victimUnitId: unitAtV7(state, CULT_UI_V7.knight).id,
      })?.chip,
    ).toBe("+18 Favour (13 lost)");
    const capital = capitalOf(state);
    expect(
      cultCommandPresentationV7(view, {
        kind: "OFFERING",
        cityId: capital.id,
      })?.chip,
    ).toBe("+6 Favour (1 lost) · −2 population");
  });
});

describe("the cue of Favour lost above the cap", () => {
  it("flies only what was banked and keeps the rest for the chip's puff", () => {
    const state = withFavourV7(cultFavourUiFixtureV7(), 0, 20);
    const seized = step(state, {
      kind: "SEIZE",
      unitId: unitAtV7(state, CULT_UI_V7.summoner).id,
      victimUnitId: unitAtV7(state, CULT_UI_V7.knight).id,
    });
    expect(favourOfV7(seized.after, seized.after.viewer.id)).toBe(30);
    const plan = feedbackPlanV7(seized.before, seized.events, seized.after);
    expect(plan.favour).toEqual([
      { source: "SEIZE", at: CULT_UI_V7.knight, amount: 10 },
    ]);
    expect(plan.favourLost).toBe(8);
    expect(plan.favourHunger).toBe(0);
    expect(
      cultBoundaryNoticeV7(seized.events.events, seized.before, seized.after)
        ?.text,
    ).toBe("Knight Seized: +18 Favour (8 lost)");
  });

  it("flies nothing at the cap, and names a gain no notice names", () => {
    const state = withFavourV7(cultFavourUiFixtureV7(), 0, 30);
    const capital = capitalOf(state);
    const offered = step(state, {
      kind: "OFFERING",
      cityId: capital.id,
    });
    const plan = feedbackPlanV7(offered.before, offered.events, offered.after);
    expect(plan.favour).toEqual([]);
    expect(plan.favourLost).toBe(6);
    expect(
      cultBoundaryNoticeV7(offered.events.events, offered.before, offered.after)
        ?.text,
    ).toBe("Offering: +6 Favour (6 lost), −2 population");
    // A trickle or a daemon's kill cut by the cap: "Favour full: 1 lost".
    const trickle: PlayerEventV7 = {
      kind: "FAVOUR_GAINED",
      playerId: offered.after.viewer.id,
      source: "TRICKLE",
      amount: 1,
      forfeited: 1,
      favour: 30,
    };
    expect(
      cultBoundaryNoticeV7([trickle], offered.after, offered.after)?.text,
    ).toBe(favourFullTextV7(1));
    expect(favourFullTextV7(1)).toBe("Favour full: 1 lost");
  });
});

describe("the trickle and the Hunger at the Start Turn", () => {
  it("flies a candle from the Summoner that paid, and counts the Hunger eaten", () => {
    const state = cultHungerUiFixtureV7(4, true);
    const start = nextStartTurn(state);
    const kinds = start.events.events.map((event) =>
      event.kind === "FAVOUR_GAINED" || event.kind === "FAVOUR_SPENT"
        ? `${event.kind}:${"source" in event ? event.source : event.purpose}`
        : event.kind,
    );
    expect(kinds).toContain("FAVOUR_GAINED:TRICKLE");
    expect(kinds).toContain("FAVOUR_SPENT:HUNGER");
    expect(tricklePayersV7(start.before, start.after)).toEqual([
      CULT_HUNGER_UI_V7.summoner,
    ]);
    const plan = feedbackPlanV7(start.before, start.events, start.after);
    expect(plan.favour).toEqual([
      { source: "TRICKLE", at: CULT_HUNGER_UI_V7.summoner, amount: 1 },
    ]);
    expect(plan.favourHunger).toBe(2);
    expect(plan.favourLost).toBe(0);
    // 4 + 1 − 2: the Herald stays bound and nothing is announced.
    expect(favourOfV7(start.after, start.after.viewer.id)).toBe(3);
    expect(
      cultBoundaryNoticeV7(start.events.events, start.before, start.after)
        ?.text ?? "",
    ).not.toMatch(/Herald|Hunger/);
  });

  it("names the Hunger when the Herald breaks loose for want of it", () => {
    const state = cultHungerUiFixtureV7(1);
    const start = nextStartTurn(state);
    const unbound = start.events.events.find(
      (event) => event.kind === "DAEMON_UNBOUND",
    );
    expect(unbound).toMatchObject({ reason: "HUNGER" });
    expect(
      cultChannelNoticePartsV7(start.events.events, start.before, start.after),
    ).toContain("Your Herald went hungry and broke loose");
    const text =
      cultBoundaryNoticeV7(start.events.events, start.before, start.after)
        ?.text ?? "";
    expect(text).toContain("Your Herald went hungry and broke loose");
    expect(text).not.toMatch(/HUNGER|\d+, ?\d+/);
  });
});

describe("the Herald's Hunger on its card and at End Turn", () => {
  it("shows 'Hunger 2' on a bound Herald's card, to any viewer", () => {
    const state = cultHungerUiFixtureV7(5);
    for (const seat of [0, 1]) {
      const view = viewOf(state, seat);
      const herald = view.units.find(
        (unit) =>
          unit.at.x === CULT_HUNGER_UI_V7.herald.x &&
          unit.at.y === CULT_HUNGER_UI_V7.herald.y,
      );
      if (herald === undefined) throw new Error("no Herald");
      const chip = cultChannelChipsV7(view, herald).find(
        (entry) => entry.id === "hunger",
      );
      expect(chip?.label).toBe(HERALD_HUNGER_CHIP_V7);
      expect(chip?.label).toBe("Hunger 2");
      expect(chip?.status).toMatch(/eats 2 Favour/);
    }
    // Nobody else has it.
    const view = viewOf(state);
    for (const unit of view.units)
      if (unit.summoned !== "HERALD")
        expect(
          cultChannelChipsV7(view, unit).some((chip) => chip.id === "hunger"),
        ).toBe(false);
  });

  it("finds the Herald the next Start Turn cannot feed, after the trickle", () => {
    expect(heraldsHungryV7(viewOf(cultHungerUiFixtureV7(1)))).toEqual([
      {
        unitId: unitAtV7(cultHungerUiFixtureV7(1), CULT_HUNGER_UI_V7.herald).id,
        name: "Herald",
      },
    ]);
    expect(heraldsHungryV7(viewOf(cultHungerUiFixtureV7(2)))).toEqual([]);
    // The Summoner's strand pays 1 before the Hunger: 1 + 1 feeds it.
    expect(heraldsHungryV7(viewOf(cultHungerUiFixtureV7(1, true)))).toEqual([]);
    expect(
      heraldsHungryV7(viewOf(cultHungerUiFixtureV7(0, true))),
    ).toHaveLength(1);
    // A Herald short of its strands breaks loose first: it is asked about
    // as short, not as hungry.
    const short = cultHungerUiFixtureV7(0);
    const loose = {
      ...short,
      cult: { ...short.cult, strands: short.cult.strands.slice(0, 1) },
    };
    expect(heraldsHungryV7(viewOf(loose))).toEqual([]);
    expect(daemonsShortV7(viewOf(loose))).toHaveLength(1);
    // The rival's view has no hungry Herald of its own.
    expect(heraldsHungryV7(viewOf(cultHungerUiFixtureV7(0), 1))).toEqual([]);
  });

  it("asks one question for short daemons and hungry Heralds", () => {
    const horror = {
      unitId: unitId(1),
      name: "Horror",
      strands: 0,
      control: 1,
    };
    const herald = { unitId: unitId(2), name: "Herald" };
    expect(endTurnUnboundQuestionV7([horror])).toBe(
      "The Horror will be Unbound.",
    );
    expect(endTurnUnboundQuestionV7([], [herald])).toBe(
      "The Herald will go hungry and break loose.",
    );
    expect(endTurnUnboundQuestionV7([horror], [herald, herald])).toBe(
      "The Horror will be Unbound. 2 Heralds will go hungry and break loose.",
    );
  });
});
