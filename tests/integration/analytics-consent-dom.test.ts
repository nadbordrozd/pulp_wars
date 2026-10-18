// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  ANALYTICS_CONSENT_STORAGE_KEY_V7,
  ANALYTICS_CONSENT_TEXT_V7,
  createGameAnalyticsV7,
  type GameAnalyticsV7,
} from "../../src/app/analytics-v7";
import {
  bootstrapRuleset7App,
  type BootstrappedRuleset7App,
} from "../../src/app/index";
import type {
  BoardHostModelV7,
  BoardHostV7,
} from "../../src/render/canvas/board-host-v7";

/**
 * Play statistics in the app (bead pulp_wars-2yc.101): the consent banner
 * on the front screens until answered, never over a match; the Settings
 * toggle; a launch's match_start. The tracker runs in PREVIEW, so no script
 * is ever loaded. A match is created and never played.
 */
class Host implements BoardHostV7 {
  model: BoardHostModelV7 | null = null;
  mount(container: HTMLElement): void {
    container.replaceChildren(document.createElement("canvas"));
  }
  update(model: BoardHostModelV7): void {
    this.model = model;
  }
  activate(): void {}
  zoom(): void {}
  focus(): void {}
  destroy(): void {}
}

let app: BootstrappedRuleset7App | null = null;
let page: Record<string, unknown> = {};

function tracker(): GameAnalyticsV7 {
  page = {};
  return createGameAnalyticsV7("PREVIEW", {
    global: page,
    document,
    storage: window.localStorage,
    hostname: "nadbordrozd.github.io",
  });
}

function boot(analytics: GameAnalyticsV7 | null = tracker()) {
  app?.destroy();
  document.body.innerHTML = '<div id="app"></div>';
  app = bootstrapRuleset7App(document, {
    storage: null,
    boardHost: new Host(),
    randomSeed: () => 7,
    randomDraw: () => 0,
    ...(analytics === null ? {} : { analytics }),
  });
  return app;
}

function required<T extends Element = HTMLElement>(selector: string): T {
  const node = document.querySelector<T>(selector);
  if (node === null) throw new Error(`Missing ${selector}`);
  return node;
}

function press(action: string): void {
  required<HTMLButtonElement>(`[data-action="${action}"]`).click();
}

const banner = (): HTMLElement | null =>
  document.querySelector(".v7-consent-banner");

async function waitUntil(predicate: () => boolean): Promise<void> {
  for (let index = 0; index < 400; index += 1) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  throw new Error("Condition not reached");
}

/** The `event` entries the tracker queued: [name, params]. */
function events(): [string, Record<string, unknown>][] {
  return ((page.dataLayer as ArrayLike<unknown>[] | undefined) ?? [])
    .map((entry) => Array.from(entry))
    .filter((entry) => entry[0] === "event")
    .map((entry) => [entry[1], entry[2]] as [string, Record<string, unknown>]);
}

async function launch(running: BootstrappedRuleset7App): Promise<void> {
  press("new-game");
  press("launch");
  await waitUntil(
    () =>
      running.controller.snapshot().phase === "ACTIVE" &&
      !running.controller.snapshot().transitioning,
  );
}

beforeEach(() => window.localStorage.clear());
afterEach(() => {
  app?.destroy();
  app = null;
});

describe("play statistics consent", () => {
  it("asks once at the foot of the front screen; Accept is stored", () => {
    boot();
    const strip = banner();
    expect(strip).not.toBeNull();
    // Not a dialog: it blocks nothing and takes no focus.
    expect(strip?.tagName).toBe("ASIDE");
    expect(strip?.getAttribute("role")).toBeNull();
    expect(strip?.contains(document.activeElement)).toBe(false);
    expect(strip?.querySelector("p")?.textContent).toBe(
      ANALYTICS_CONSENT_TEXT_V7,
    );
    // Still there on the other front screens until answered.
    press("front-settings");
    expect(banner()).not.toBeNull();
    press("front-back");
    press("analytics-accept");
    expect(banner()).toBeNull();
    expect(window.localStorage.getItem(ANALYTICS_CONSENT_STORAGE_KEY_V7)).toBe(
      "granted",
    );
    // The next visit remembers it.
    boot();
    expect(banner()).toBeNull();
  });

  it("Decline is stored and the banner does not come back", () => {
    boot();
    press("analytics-decline");
    expect(banner()).toBeNull();
    expect(window.localStorage.getItem(ANALYTICS_CONSENT_STORAGE_KEY_V7)).toBe(
      "denied",
    );
    boot();
    expect(banner()).toBeNull();
  });

  it("never shows over a match, and comes back on the menu if unanswered", async () => {
    const running = boot();
    await launch(running);
    expect(document.querySelector(".v7-front-shell")).toBeNull();
    expect(banner()).toBeNull();
    press("compact-menu");
    press("main-menu");
    await waitUntil(() => document.querySelector(".v7-main-menu") !== null);
    expect(banner()).not.toBeNull();
  });

  it("Settings changes the choice later", () => {
    boot();
    press("analytics-decline");
    press("front-settings");
    const toggle = (): HTMLButtonElement =>
      required<HTMLButtonElement>('[data-action="analytics-consent"]');
    expect(toggle().textContent).toBe("Share anonymous play statistics: off");
    expect(toggle().getAttribute("aria-pressed")).toBe("false");
    expect(required(".v7-analytics-note").textContent).toContain("No ads");
    toggle().click();
    expect(toggle().getAttribute("aria-pressed")).toBe("true");
    expect(toggle().textContent).toBe("Share anonymous play statistics: on");
    expect(window.localStorage.getItem(ANALYTICS_CONSENT_STORAGE_KEY_V7)).toBe(
      "granted",
    );
    toggle().click();
    expect(window.localStorage.getItem(ANALYTICS_CONSENT_STORAGE_KEY_V7)).toBe(
      "denied",
    );
  });

  it("is absent where analytics is off", () => {
    boot(null);
    expect(banner()).toBeNull();
    press("front-settings");
    expect(document.querySelector('[data-action="analytics-consent"]')).toBe(
      null,
    );
  });

  it("a launch sends match_start with its source once accepted", async () => {
    const running = boot();
    press("analytics-accept");
    await launch(running);
    const started = events().filter(([name]) => name === "match_start");
    expect(started).toHaveLength(1);
    const setup = running.controller.snapshot().view?.setup;
    expect(started[0]?.[1]).toEqual(
      expect.objectContaining({
        source: "quick_start",
        map_size: setup?.width,
        opponents: setup?.aiCount,
        map_type: setup?.mapType.toLowerCase(),
      }),
    );
  });

  it("sends nothing from a launch while unanswered or declined", async () => {
    const running = boot();
    await launch(running);
    expect(events()).toEqual([]);
  });
});
