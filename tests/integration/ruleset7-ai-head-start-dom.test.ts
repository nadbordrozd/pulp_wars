// @vitest-environment jsdom

import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  bootstrapRuleset7App,
  type BootstrappedRuleset7App,
} from "../../src/app/index";
import { AI_HEAD_START_COINS_STORAGE_KEY_V7 } from "../../src/app/ai-head-start-preference-v7";
import type { StorageAdapter } from "../../src/persistence/index";

/**
 * AI head start (`pulp_wars-w49.39`): the new-game control, its remembered
 * choice, the launched setup, and the read-only line in the match's
 * Settings, also after a resume. A match is created and never played.
 */
class MemoryStorage implements StorageAdapter {
  readonly values = new Map<string, string>();
  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
  removeItem(key: string): void {
    this.values.delete(key);
  }
}

let app: BootstrappedRuleset7App | null = null;

function boot(
  storage: StorageAdapter | null,
  settingsStorage: StorageAdapter | null,
): BootstrappedRuleset7App {
  app?.destroy();
  document.body.innerHTML = '<div id="app"></div>';
  app = bootstrapRuleset7App(document, {
    storage,
    settingsStorage,
    randomSeed: () => 4242,
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

function choose(id: string, value: string): void {
  const field = required<HTMLSelectElement>(`#${id}`);
  field.value = value;
  field.dispatchEvent(new Event("change", { bubbles: true }));
}

async function waitUntil(predicate: () => boolean): Promise<void> {
  for (let index = 0; index < 400; index += 1) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  throw new Error("Condition not reached");
}

const active = (running: BootstrappedRuleset7App): boolean =>
  running.controller.snapshot().phase === "ACTIVE" &&
  !running.controller.snapshot().transitioning;

function openSettings(): void {
  press("compact-menu");
  press("settings");
}

beforeEach(() => window.localStorage.clear());
afterEach(() => {
  app?.destroy();
  app = null;
});

describe("AI head start on the new-game screen", () => {
  it("is one labelled select in the Players group, None by default", () => {
    boot(null, new MemoryStorage());
    const field = required<HTMLSelectElement>("#v7-ai-head-start");
    const label = field.closest("label");
    expect(label?.firstChild?.textContent).toBe("AI head start");
    expect(label?.classList).toContain("v7-ai-head-start-choice");
    expect(field.value).toBe("0");
    expect([...field.options].map((option) => option.textContent)).toEqual([
      "None",
      "+5 Coins",
      "+10 Coins",
      "+20 Coins",
    ]);
    expect(field.getAttribute("aria-description")).toBe(
      "Every AI player starts with extra Coins.",
    );
    // Between Alliances and the Map heading.
    const labels = [
      ...required(".v7-setup-form").querySelectorAll(":scope > label, h3, h2"),
    ].map((node) => node.firstChild?.textContent ?? node.textContent);
    const index = labels.indexOf("AI head start");
    expect(labels[index - 1]).toBe("Alliances");
  });

  it("launches the chosen head start, remembers it, and shows it in the match's Settings, also after a resume", async () => {
    const saves = new MemoryStorage();
    const settings = new MemoryStorage();
    const first = boot(saves, settings);
    if (document.querySelector("#v7-ai-head-start") === null) press("new-game");
    choose("v7-ai-head-start", "10");
    expect(settings.getItem(AI_HEAD_START_COINS_STORAGE_KEY_V7)).toBe("10");
    press("launch");
    await waitUntil(() => active(first));
    const state = first.controller.snapshot().view;
    expect(state?.setup.aiHeadStart).toEqual({ coins: 10 });
    openSettings();
    const line = required(".v7-match-ai-head-start");
    expect(line.textContent).toBe("AI head start: +10 Coins");
    expect(line.dataset.v7AiHeadStart).toBe("10");

    // A later visit: the saved game still says what it was started with,
    // and the new-game screen starts on the remembered choice.
    const second = boot(saves, settings);
    press("resume");
    await waitUntil(() => active(second));
    expect(second.controller.snapshot().view?.setup.aiHeadStart).toEqual({
      coins: 10,
    });
    openSettings();
    expect(required(".v7-match-ai-head-start").textContent).toBe(
      "AI head start: +10 Coins",
    );
    boot(null, settings);
    expect(required<HTMLSelectElement>("#v7-ai-head-start").value).toBe("10");
  });

  it("launches no head start for None and says so in Settings", async () => {
    const settings = new MemoryStorage();
    settings.setItem(AI_HEAD_START_COINS_STORAGE_KEY_V7, "20");
    const running = boot(null, settings);
    expect(required<HTMLSelectElement>("#v7-ai-head-start").value).toBe("20");
    choose("v7-ai-head-start", "0");
    expect(settings.getItem(AI_HEAD_START_COINS_STORAGE_KEY_V7)).toBe("0");
    press("launch");
    await waitUntil(() => active(running));
    const setup = running.controller.snapshot().view?.setup;
    expect(setup !== undefined && "aiHeadStart" in setup).toBe(false);
    openSettings();
    expect(required(".v7-match-ai-head-start").textContent).toBe(
      "AI head start: None",
    );
  });

  it("hides the control on the Showcase, which launches without a head start and keeps the choice", async () => {
    const settings = new MemoryStorage();
    const running = boot(null, settings);
    choose("v7-ai-head-start", "20");
    choose("v7-map-type", "SHOWCASE");
    const label = required("#v7-ai-head-start").closest("label");
    expect(label?.hidden).toBe(true);
    expect(readFileSync("src/styles/v7.css", "utf8")).toMatch(
      /label\.v7-ai-head-start-choice\[hidden\] \{\s*display: none;\s*\}/,
    );
    press("launch");
    await waitUntil(() => active(running));
    const setup = running.controller.snapshot().view?.setup;
    expect(setup?.mapType).toBe("SHOWCASE");
    expect(setup !== undefined && "aiHeadStart" in setup).toBe(false);
    openSettings();
    expect(document.querySelector(".v7-match-ai-head-start")).toBeNull();
    expect(settings.getItem(AI_HEAD_START_COINS_STORAGE_KEY_V7)).toBe("20");
  });
});
