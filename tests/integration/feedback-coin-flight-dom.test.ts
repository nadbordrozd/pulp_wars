// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";
import type { CoordV7, GameStateV7 } from "../../src/engine/index";
import type {
  BoardFeedbackPortV7,
  FeedbackLaunchV7,
} from "../../src/render/canvas/feedback-host-v7";
import {
  COIN_POP_MS_V7,
  COIN_STAGGER_MS_V7,
  coinBurstOffsetV7,
  coinLandingAfterMsV7,
  COIN_SPRITE_CAP_V7,
} from "../../src/render/canvas/feedback-motion-v7";
import { CoinFlightLayerV7 } from "../../src/render/dom/coin-flight-layer-v7";
import { feedbackSoundCuesV7 } from "../../src/render/dom/app-view-v7";
import type { CoinGainV7 } from "../../src/render/feedback-plan-v7";
import { allTechsV7, exploredAllV7, initialV7 } from "../fixtures/v7-builders";
import {
  FixtureController,
  RecordingBoardHost,
  mount,
  requiredElement,
  waitUntil,
} from "../fixtures/v7-dom-rig";

/**
 * Bead pulp_wars-2yc.29: the Coins' flight layer and the HUD counter. The
 * counter shows the true balance less the Coins still on their way and
 * always ends on the true balance; reduced motion and a board without
 * feedback count at once.
 */
class FakePort implements BoardFeedbackPortV7 {
  now = 0;
  isAnimated = true;
  scale = 1;
  listener: ((timeMs: number) => boolean) | null = null;
  requested = 0;
  held = 0;
  launched = 0;
  finished = 0;
  animated(): boolean {
    return this.isAnimated;
  }
  timeMs(): number {
    return this.now;
  }
  durationScale(): number {
    return this.scale;
  }
  hold(): number {
    this.held += 1;
    return this.held;
  }
  launch(): FeedbackLaunchV7 {
    this.launched += 1;
    return { populationArrivalMs: null, levelUpMs: null };
  }
  finish(): void {
    this.finished += 1;
  }
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
  /** Runs frames up to `ms` later. */
  advance(ms: number): void {
    const end = this.now + ms;
    while (this.now < end) {
      this.now = Math.min(end, this.now + 16);
      this.listener?.(this.now);
    }
  }
}

function layerRig(trueBalance: { value: number }) {
  document.body.innerHTML =
    '<p class="v7-coins"><img class="v7-economy-icon"><span class="v7-coin-balance"></span></p>';
  const port = new FakePort();
  const shown: { value: number; landings: number } = {
    value: trueBalance.value,
    landings: 0,
  };
  const layer: CoinFlightLayerV7 = new CoinFlightLayerV7(document, {
    coinUrl: () => "coin.png",
    counterIcon: () => document.querySelector(".v7-economy-icon"),
    onBalance: (landed) => {
      shown.value = layer.displayed(trueBalance.value);
      if (landed) shown.landings += 1;
    },
  });
  document.body.append(layer.element);
  layer.attach(port);
  return { port, layer, shown };
}

const gains = (...amounts: number[]): CoinGainV7[] =>
  amounts.map((amount, index) => ({
    cause: "INCOME",
    at: { x: index, y: 2 },
    amount,
  }));

describe("coin flight layer", () => {
  it("keeps the gain off the counter, counts each coin as it lands, and ends true", () => {
    const balance = { value: 40 };
    const { port, layer, shown } = layerRig(balance);
    // The boundary is accepted: the state has the Coins at once.
    balance.value = 53;
    const ticket = layer.hold(gains(8, 5));
    expect(layer.displayed(balance.value)).toBe(40);
    const lead = layer.launch(ticket);
    // The first coin: its hop, then a toss of 1.0 to 1.3 s.
    expect(lead).toBeGreaterThanOrEqual(COIN_POP_MS_V7 + 1_000);
    expect(lead).toBeLessThanOrEqual(COIN_POP_MS_V7 + 1_300);
    expect(port.requested).toBe(1);
    // 8 Coins fly as five sprites, 5 Coins as four.
    expect(layer.activeSprites()).toBe(9);
    expect(COIN_STAGGER_MS_V7).toBeGreaterThan(100);
    expect(layer.displayed(balance.value)).toBe(40);
    const seen = new Set<number>();
    for (let step = 0; step < 400 && layer.activeSprites() > 0; step += 1) {
      port.advance(16);
      seen.add(shown.value);
      expect(shown.value).toBeGreaterThanOrEqual(40);
      expect(shown.value).toBeLessThanOrEqual(53);
    }
    // It ticked up through intermediate values, never overshooting.
    expect(seen.size).toBeGreaterThan(3);
    expect(shown.value).toBe(53);
    expect(layer.displayed(balance.value)).toBe(53);
    expect(layer.pending()).toBe(0);
    expect(shown.landings).toBeGreaterThanOrEqual(5);
    // Every sprite is back in the pool, hidden.
    for (const sprite of layer.element.querySelectorAll("img"))
      expect((sprite as HTMLElement).style.visibility).toBe("hidden");
  });

  it("never drifts across overlapping launches and a finish", () => {
    const balance = { value: 10 };
    const { port, layer, shown } = layerRig(balance);
    balance.value += 7;
    const first = layer.hold(gains(7));
    balance.value += 30;
    const second = layer.hold(gains(10, 10, 10));
    expect(layer.displayed(balance.value)).toBe(10);
    layer.launch(first);
    port.advance(600);
    layer.launch(second);
    port.advance(900);
    // Spending while coins fly lowers the true balance at once.
    balance.value -= 4;
    port.advance(200);
    layer.finish();
    expect(shown.value).toBe(balance.value);
    expect(layer.pending()).toBe(0);
    expect(layer.activeSprites()).toBe(0);
    // A ticket dropped by the finish launches nothing later.
    expect(layer.launch(second)).toBeNull();
    expect(layer.displayed(balance.value)).toBe(43);
  });

  it("caps the sprites on screen and reuses them", () => {
    const balance = { value: 0 };
    const { port, layer } = layerRig(balance);
    const cities = Array.from({ length: 40 }, () => 6);
    balance.value = 240;
    layer.launch(layer.hold(gains(...cities)));
    expect(layer.activeSprites()).toBe(COIN_SPRITE_CAP_V7);
    // A second burst while the first is in the air: no sprite is free, so
    // its Coins are counted at once.
    balance.value += 12;
    expect(layer.launch(layer.hold(gains(12)))).toBeNull();
    expect(layer.activeSprites()).toBe(COIN_SPRITE_CAP_V7);
    port.advance(6_000);
    expect(layer.displayed(balance.value)).toBe(252);
    balance.value += 3;
    layer.launch(layer.hold(gains(3)));
    port.advance(4_000);
    expect(layer.element.querySelectorAll("img").length).toBe(
      COIN_SPRITE_CAP_V7,
    );
    expect(layer.displayed(balance.value)).toBe(255);
  });

  it("flies each coin from its tile to the counter's icon", () => {
    const balance = { value: 1 };
    const { port, layer } = layerRig(balance);
    layer.launch(
      layer.hold([{ cause: "CHEST", at: { x: 5, y: 4 }, amount: 1 }]),
    );
    const sprite = layer.element.querySelector("img") as HTMLImageElement;
    expect(sprite.getAttribute("src")).toBe("coin.png");
    // The first frame is at the tile (jsdom lays everything out at 0, 0).
    expect(sprite.style.transform).toContain(
      `translate3d(${(100 + 5 * 60 - 12).toFixed(2)}px, ${(100 + 4 * 60 - 12).toFixed(2)}px, 0)`,
    );
    // After the hop it stands straight above its tile, at the top of the hop.
    port.advance(COIN_POP_MS_V7);
    const hop = coinBurstOffsetV7(0, 1);
    const hopped = /translate3d\((-?[\d.]+)px, (-?[\d.]+)px/.exec(
      sprite.style.transform,
    );
    expect(Number(hopped?.[1])).toBeCloseTo(100 + 5 * 60 - 12 + hop.x, 0);
    expect(Number(hopped?.[2])).toBeLessThan(100 + 4 * 60 - 12 - 10);
    port.advance(
      coinLandingAfterMsV7({
        from: { x: 400, y: 340 },
        burst: hop,
        to: { x: 0, y: 0 },
      }) -
        COIN_POP_MS_V7 -
        17,
    );
    // Almost landed: close to the counter's icon, at the layer's origin.
    const match = /translate3d\((-?[\d.]+)px, (-?[\d.]+)px/.exec(
      sprite.style.transform,
    );
    expect(Math.abs(Number(match?.[1]) + 12)).toBeLessThan(12);
    expect(Math.abs(Number(match?.[2]) + 12)).toBeLessThan(12);
  });

  it("counts at once in reduced motion: no sprite, no hold", () => {
    const balance = { value: 20 };
    const { port, layer, shown } = layerRig(balance);
    port.isAnimated = false;
    balance.value = 29;
    const ticket = layer.hold(gains(9));
    expect(layer.displayed(balance.value)).toBe(29);
    expect(layer.launch(ticket)).toBeNull();
    expect(layer.activeSprites()).toBe(0);
    expect(port.requested).toBe(0);
    expect(shown.landings).toBe(0);
  });

  it("is twice as fast at Fast animation speed", () => {
    const balance = { value: 5 };
    const { port, layer } = layerRig(balance);
    port.scale = 0.5;
    const fast = layer.launch(layer.hold(gains(1))) ?? 0;
    port.scale = 1;
    layer.finish();
    expect(layer.launch(layer.hold(gains(1)))).toBeCloseTo(fast * 2, 6);
  });
});

describe("feedback sounds", () => {
  it("delays the coin and level-up sounds to their landing, adding none", () => {
    const cues = [
      { id: "economy.coin", delayMs: 0 },
      { id: "city.levelup", delayMs: 140 },
      { id: "unit.levelup", delayMs: 280 },
    ] as const;
    expect(feedbackSoundCuesV7(cues, { coinMs: null, levelUpMs: null })).toBe(
      cues,
    );
    expect(feedbackSoundCuesV7(cues, { coinMs: 840, levelUpMs: 700 })).toEqual([
      { id: "economy.coin", delayMs: 840 },
      { id: "city.levelup", delayMs: 840 },
      { id: "unit.levelup", delayMs: 280 },
    ]);
  });

  it("delays a Road link's soft sparkle to the first Road icon's landing", () => {
    // Bead pulp_wars-v56v.
    const cues = [
      { id: "city.levelup", delayMs: 0 },
      { id: "special.sparkle", delayMs: 0, gain: 0.5 },
    ] as const;
    expect(
      feedbackSoundCuesV7(cues, { coinMs: null, levelUpMs: null, roadMs: 630 }),
    ).toEqual([
      { id: "city.levelup", delayMs: 0 },
      { id: "special.sparkle", delayMs: 630, gain: 0.5 },
    ]);
    // Reduced motion: no icon flies, the sound plays with the glow.
    expect(
      feedbackSoundCuesV7(cues, {
        coinMs: null,
        levelUpMs: null,
        roadMs: null,
      }),
    ).toBe(cues);
  });
});

class FeedbackHost extends RecordingBoardHost {
  readonly feedback = new FakePort();
}

describe("the HUD counter in the app", () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="app"></div>';
  });

  const richState = (): GameStateV7 => exploredAllV7(allTechsV7(initialV7()));

  it("mounts the flight layer between the HUD and the dialogs", () => {
    const controller = new FixtureController(richState());
    const app = mount(controller, new FeedbackHost());
    const layer = requiredElement<HTMLElement>(".v7-feedback-layer");
    expect(layer.getAttribute("role")).toBe("presentation");
    expect(layer.parentElement?.classList.contains("v7-match-root")).toBe(true);
    expect(requiredElement<HTMLElement>(".v7-match-shell").dataset.motion).toBe(
      "full",
    );
    app.destroy();
  });

  const balance = (): number =>
    Number(requiredElement<HTMLElement>(".v7-coin-balance").textContent);

  function clearForest(controller: FixtureController) {
    const command = controller
      .snapshot()
      .offeredCommands.find((candidate) => candidate.kind === "CLEAR_FOREST");
    if (command === undefined) throw new Error("no Clear Forest offered");
    return command;
  }

  it("holds a gain off the counter until its coins land, then shows the truth", async () => {
    const controller = new FixtureController(richState());
    const host = new FeedbackHost();
    const app = mount(controller, host);
    const before = balance();
    await controller.dispatch(clearForest(controller));
    const truth = controller.snapshot().view?.viewer.coins ?? 0;
    expect(truth).toBeGreaterThan(before);
    // The state changed at once; the counter waits for the coins.
    expect(balance()).toBe(before);
    await waitUntil(() => host.feedback.requested > 0);
    expect(host.feedback.held).toBe(1);
    expect(host.feedback.launched).toBe(1);
    expect(balance()).toBe(before);
    host.feedback.advance(2_000);
    expect(balance()).toBe(truth);
    expect(
      requiredElement<HTMLElement>(".v7-coins").classList.contains(
        "is-coin-landing",
      ),
    ).toBe(true);
    // The accessible label always had the true balance.
    expect(
      requiredElement<HTMLElement>(".v7-coins").getAttribute("aria-label"),
    ).toContain(`${truth} Coins`);
    app.destroy();
  });

  it("shows the true balance at once in reduced motion and without feedback", async () => {
    for (const host of [new FeedbackHost(), new RecordingBoardHost()]) {
      document.body.innerHTML = '<div id="app"></div>';
      if (host instanceof FeedbackHost) host.feedback.isAnimated = false;
      const controller = new FixtureController(richState());
      const app = mount(controller, host);
      const before = balance();
      await controller.dispatch(clearForest(controller));
      const truth = controller.snapshot().view?.viewer.coins ?? 0;
      expect(truth).toBeGreaterThan(before);
      expect(balance()).toBe(truth);
      expect(document.querySelectorAll(".v7-feedback-coin").length).toBe(0);
      app.destroy();
    }
  });
});
