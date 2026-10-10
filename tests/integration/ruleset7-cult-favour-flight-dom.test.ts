// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";
import type { CoordV7 } from "../../src/engine/index";
import type {
  BoardFeedbackPortV7,
  FeedbackLaunchV7,
} from "../../src/render/canvas/feedback-host-v7";
import { CoinFlightLayerV7 } from "../../src/render/dom/coin-flight-layer-v7";
import type {
  CoinGainV7,
  FavourGainV7,
} from "../../src/render/feedback-plan-v7";
import { CULT_UI_V7, cultFavourUiFixtureV7 } from "../fixtures/v7-cult-ui";
import {
  FixtureController,
  RecordingBoardHost,
  boardPlan,
  mount,
  required,
  requiredButton,
  requiredElement,
  waitUntil,
} from "../fixtures/v7-dom-rig";

/**
 * The Cultists (bead `pulp_wars-mch9.17`): Favour a Cult player gains flies
 * to the Favour chip as candles, in the coins' layer and by the coins'
 * rules: the chip shows the true Favour less what is still on its way,
 * pulses as each candle lands, always ends on the truth, and counts at once
 * with reduced motion. The two purses never mix.
 */
class FakePort implements BoardFeedbackPortV7 {
  now = 0;
  isAnimated = true;
  listener: ((timeMs: number) => boolean) | null = null;
  requested = 0;
  plans: unknown[] = [];
  animated(): boolean {
    return this.isAnimated;
  }
  timeMs(): number {
    return this.now;
  }
  durationScale(): number {
    return 1;
  }
  hold(plan: unknown): number {
    this.plans.push(plan);
    return this.plans.length;
  }
  launch(): FeedbackLaunchV7 {
    return { populationArrivalMs: null, levelUpMs: null };
  }
  finish(): void {}
  cellClientPoint(at: CoordV7): { readonly x: number; readonly y: number } {
    return { x: 100 + at.x * 60, y: 100 + at.y * 60 };
  }
  boardClientFrame() {
    return { left: 0, top: 0, right: 1280, bottom: 800 };
  }
  setFrameListener(listener: ((timeMs: number) => boolean) | null): void {
    this.listener = listener;
  }
  requestFrames(): void {
    this.requested += 1;
  }
  advance(ms: number): void {
    const end = this.now + ms;
    while (this.now < end) {
      this.now = Math.min(end, this.now + 16);
      this.listener?.(this.now);
    }
  }
}

const coins = (amount: number): CoinGainV7[] => [
  { cause: "INCOME", at: { x: 1, y: 2 }, amount },
];
const favour = (amount: number): FavourGainV7[] => [
  { source: "SACRIFICE", at: { x: 4, y: 3 }, amount },
];

function layerRig(truth: { coins: number; favour: number }) {
  document.body.innerHTML =
    '<p class="v7-coins"><img class="v7-economy-icon"></p><p class="v7-favour"><img class="v7-favour-icon"></p>';
  const port = new FakePort();
  const shown = { coins: truth.coins, favour: truth.favour, candles: 0 };
  const layer: CoinFlightLayerV7 = new CoinFlightLayerV7(document, {
    coinUrl: () => "coin.png",
    counterIcon: () => document.querySelector(".v7-economy-icon"),
    onBalance: () => {
      shown.coins = layer.displayed(truth.coins);
    },
    favour: {
      url: () => "candle.png",
      counterIcon: () => document.querySelector(".v7-favour-icon"),
      onBalance: (landed) => {
        shown.favour = layer.displayed(truth.favour, "FAVOUR");
        if (landed) shown.candles += 1;
      },
    },
  });
  document.body.append(layer.element);
  layer.attach(port);
  return { port, layer, shown };
}

describe("Favour in the flight layer", () => {
  it("holds Favour off its chip, counts each candle as it lands, and never touches the Coins", () => {
    const truth = { coins: 10, favour: 7 };
    const { port, layer, shown } = layerRig(truth);
    truth.favour = 19;
    const ticket = layer.hold([], favour(12));
    expect(layer.displayed(truth.favour, "FAVOUR")).toBe(7);
    expect(layer.displayed(truth.coins)).toBe(10);
    // No coin flies, so the coin sound has nothing to wait for.
    expect(layer.launch(ticket)).toBeNull();
    expect(port.requested).toBe(1);
    expect(layer.activeSprites()).toBeGreaterThan(1);
    for (const sprite of layer.element.querySelectorAll("img")) {
      expect(sprite.getAttribute("src")).toBe("candle.png");
      expect(sprite.dataset.purse).toBe("favour");
    }
    const seen = new Set<number>();
    for (let step = 0; step < 400 && layer.activeSprites() > 0; step += 1) {
      port.advance(16);
      seen.add(shown.favour);
      expect(shown.favour).toBeGreaterThanOrEqual(7);
      expect(shown.favour).toBeLessThanOrEqual(19);
    }
    expect(seen.size).toBeGreaterThan(2);
    expect(shown.favour).toBe(19);
    expect(shown.candles).toBeGreaterThan(1);
    expect(layer.pending("FAVOUR")).toBe(0);
    expect(shown.coins).toBe(10);
  });

  it("flies Coins and Favour of one boundary side by side, each to its own counter", () => {
    const truth = { coins: 10, favour: 0 };
    const { port, layer, shown } = layerRig(truth);
    truth.coins = 14;
    truth.favour = 3;
    const ticket = layer.hold(coins(4), favour(3));
    expect(layer.pending()).toBe(4);
    expect(layer.pending("FAVOUR")).toBe(3);
    expect(layer.launch(ticket)).toBeGreaterThan(0);
    const purses = [...layer.element.querySelectorAll("img")].map(
      (sprite) => [sprite.dataset.purse, sprite.getAttribute("src")] as const,
    );
    expect(new Set(purses.map((entry) => entry.join(":")))).toEqual(
      new Set(["coin:coin.png", "favour:candle.png"]),
    );
    layer.finish();
    expect(shown).toMatchObject({ coins: 14, favour: 3 });
    expect(layer.activeSprites()).toBe(0);
    port.advance(100);
    expect(layer.pending("FAVOUR")).toBe(0);
  });

  it("counts Favour at once in reduced motion, and without a Favour counter", () => {
    const truth = { coins: 0, favour: 0 };
    const { port, layer, shown } = layerRig(truth);
    port.isAnimated = false;
    truth.favour = 6;
    const ticket = layer.hold([], favour(6));
    expect(layer.displayed(truth.favour, "FAVOUR")).toBe(6);
    expect(layer.launch(ticket)).toBeNull();
    expect(layer.activeSprites()).toBe(0);
    expect(shown.candles).toBe(0);

    // A layer of a match without a Favour chip holds no Favour.
    const plain = new CoinFlightLayerV7(document, {
      coinUrl: () => "coin.png",
      counterIcon: () => document.querySelector(".v7-economy-icon"),
      onBalance: () => undefined,
    });
    plain.attach(new FakePort());
    plain.hold([], favour(6));
    expect(plain.pending("FAVOUR")).toBe(0);
  });
});

class FeedbackHost extends RecordingBoardHost {
  readonly feedback = new FakePort();
}

describe("the Favour chip in the app", () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="app"></div>';
    window.localStorage.clear();
  });

  const shownFavour = (): number =>
    Number(requiredElement<HTMLElement>(".v7-favour-balance").textContent);

  async function seize(
    controller: FixtureController,
    host: RecordingBoardHost,
  ): Promise<void> {
    const view = required(controller.snapshot().view);
    const summoner = required(
      view.units.find(
        (unit) =>
          unit.at.x === CULT_UI_V7.summoner.x &&
          unit.at.y === CULT_UI_V7.summoner.y,
      ),
    );
    host.callbacks?.onSelection({ kind: "UNIT", unitId: summoner.id });
    requiredButton("cult-seize").click();
    host.callbacks?.onCommand(required(boardPlan(host).targets[0]));
    await waitUntil(() => controller.accepted.length === 1);
  }

  it("holds a Seizure's Favour off the chip until its candles land, then pulses and shows the truth", async () => {
    const controller = new FixtureController(cultFavourUiFixtureV7());
    const host = new FeedbackHost();
    const app = mount(controller, host);
    expect(shownFavour()).toBe(7);
    await seize(controller, host);
    // The state has the Favour at once; the chip waits for the candles.
    expect(shownFavour()).toBe(7);
    expect(
      requiredElement<HTMLElement>(".v7-favour").getAttribute("aria-label"),
    ).toBe("25 Favour");
    await waitUntil(() => host.feedback.requested > 0);
    // The candles leave the victim's tile.
    const sprite = requiredElement<HTMLImageElement>(
      '.v7-feedback-coin[data-purse="favour"]',
    );
    expect(sprite.getAttribute("src")).toMatch(/^data:image\/svg\+xml,/);
    expect(sprite.style.transform).toContain(
      `translate3d(${(100 + CULT_UI_V7.knight.x * 60 - 12).toFixed(2)}px, ${(100 + CULT_UI_V7.knight.y * 60 - 12).toFixed(2)}px, 0)`,
    );
    host.feedback.advance(3_000);
    expect(shownFavour()).toBe(25);
    expect(
      requiredElement<HTMLElement>(".v7-favour").classList.contains(
        "is-favour-landing",
      ),
    ).toBe(true);
    // The Coins' counter did not move.
    expect(
      requiredElement<HTMLElement>(".v7-coins").classList.contains(
        "is-coin-landing",
      ),
    ).toBe(false);
    app.destroy();
  });

  it("shows the Favour at once in reduced motion", async () => {
    const controller = new FixtureController(cultFavourUiFixtureV7());
    const host = new FeedbackHost();
    host.feedback.isAnimated = false;
    const app = mount(controller, host);
    await seize(controller, host);
    expect(shownFavour()).toBe(25);
    expect(document.querySelectorAll(".v7-feedback-coin").length).toBe(0);
    app.destroy();
  });

  it("tells the board which city gave up population in an Offering", async () => {
    const controller = new FixtureController(cultFavourUiFixtureV7());
    const host = new FeedbackHost();
    const app = mount(controller, host);
    const view = required(controller.snapshot().view);
    const capital = required(
      view.cities.find((city) => city.ownerId === view.viewer.id),
    );
    host.callbacks?.onSelection({ kind: "CITY", cityId: capital.id });
    requiredButton("command-offering").click();
    await waitUntil(() => controller.accepted.length === 1);
    expect(host.feedback.plans.at(-1)).toMatchObject({
      favour: [{ source: "OFFERING", at: capital.at, amount: 3 }],
      populationLosses: [{ cityId: capital.id, at: capital.at, amount: 2 }],
    });
    app.destroy();
  });
});
