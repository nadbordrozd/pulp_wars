import { describe, expect, it } from "vitest";
import {
  NEUTRAL_OWNER_ID_V7,
  PROMOTION_KILLS_V7,
  viewForV7,
  type PublicUnitV7,
} from "../../src/engine/index";
import {
  promotionCandidateV7,
  promotionReadyV7,
} from "../../src/render/feedback-plan-v7";
import { promotionProgressV7 } from "../../src/render/unit-card-presentation-v7";
import {
  DINOSAUR_SHOWCASE_V7,
  dinosaurShowcaseFixtureV7,
} from "../fixtures/v7-dinosaur-ui";
import {
  UNIT_CARD_UI_V7,
  unitCardPromotionFixtureV7,
} from "../fixtures/v7-unit-card";

/**
 * Bead pulp_wars-2yc.106: the Promotion progress the dock's pips show,
 * read from the public unit: its kills toward the three, and nothing for a
 * unit that is never Promoted.
 */

const GAIN = "+5 maximum HP and a full heal";

function scene() {
  const state = unitCardPromotionFixtureV7();
  const view = viewForV7(state, state.humanPlayerId);
  const unitAt = (at: { x: number; y: number }): PublicUnitV7 => {
    const unit = view.units.find(
      (candidate) => candidate.at.x === at.x && candidate.at.y === at.y,
    );
    if (unit === undefined) throw new Error("fixture");
    return unit;
  };
  return { view, unitAt };
}

describe("Promotion progress", () => {
  it("counts the kills toward the Promotion", () => {
    const { view, unitAt } = scene();
    expect(PROMOTION_KILLS_V7).toBe(3);
    expect(promotionProgressV7(view, unitAt(UNIT_CARD_UI_V7.plain))).toEqual({
      kills: 2,
      needed: 3,
      ready: false,
      label: "Promotion: 2 of 3 kills",
      text: `At 3 kills it can be promoted once: ${GAIN}.`,
    });
    // A rival's kills are public: it waits for its Promotion.
    expect(promotionProgressV7(view, unitAt(UNIT_CARD_UI_V7.enemy))).toEqual({
      kills: 3,
      needed: 3,
      ready: true,
      label: "Promotion: 3 of 3 kills",
      text: `It can be promoted now: ${GAIN}.`,
    });
  });

  it("stops at the kills needed and waits for land when embarked", () => {
    const { view, unitAt } = scene();
    const plain = unitAt(UNIT_CARD_UI_V7.plain);
    const many = promotionProgressV7(view, { ...plain, kills: 7 });
    expect([many?.kills, many?.ready, many?.label]).toEqual([
      3,
      true,
      "Promotion: 3 of 3 kills",
    ]);
    const afloat: PublicUnitV7 = { ...plain, kills: 3, form: "EMBARKED" };
    expect(promotionProgressV7(view, afloat)?.text).toBe(
      `It can be promoted once it is back on land: ${GAIN}.`,
    );
    // It counts its kills afloat but is not Promoted there.
    expect(promotionCandidateV7(view, afloat)).toBe(true);
    expect(promotionReadyV7(view, afloat)).toBe(false);
  });

  it("is nothing for a unit that is never Promoted", () => {
    const { view, unitAt } = scene();
    const plain = unitAt(UNIT_CARD_UI_V7.plain);
    // A veteran (the Knight was promoted).
    expect(promotionProgressV7(view, unitAt(UNIT_CARD_UI_V7.inspired))).toBe(
      null,
    );
    for (const never of [
      { ...plain, veteran: true },
      { ...plain, form: "EGG" },
      { ...plain, ownerId: NEUTRAL_OWNER_ID_V7 },
      { ...plain, summoned: "HORROR", kills: 3 },
      { ...plain, hp: 0 },
    ] as readonly PublicUnitV7[]) {
      expect(promotionProgressV7(view, never)).toBe(null);
      expect(promotionReadyV7(view, never)).toBe(false);
    }
    // A dinosaur grows instead.
    const dinosaurs = dinosaurShowcaseFixtureV7();
    const dinosaurView = viewForV7(dinosaurs, dinosaurs.humanPlayerId);
    const anky = dinosaurView.units.find(
      (unit) =>
        unit.at.x === DINOSAUR_SHOWCASE_V7.ankylosaurus.x &&
        unit.at.y === DINOSAUR_SHOWCASE_V7.ankylosaurus.y,
    );
    if (anky === undefined) throw new Error("fixture");
    expect(promotionProgressV7(dinosaurView, anky)).toBe(null);
  });
});
