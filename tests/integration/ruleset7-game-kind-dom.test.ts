// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  bootstrapRuleset7App,
  type BootstrappedRuleset7App,
} from "../../src/app/index";
import type {
  BoardHostModelV7,
  BoardHostV7,
} from "../../src/render/canvas/board-host-v7";
import { SAVE_STORAGE_KEY_V7, isRegularGameV7 } from "../../src/engine/index";
import { quickBoardSizeV7 } from "../../src/render/quick-start-v7";
import { parseSaveV7, type StorageAdapter } from "../../src/persistence/index";

/**
 * Regular and custom games (bead `pulp_wars-2yc.103`): the new-game screen
 * launches a regular game with only the quick choices made, and a custom
 * game once anything under Custom game differs from its default. Matches
 * are created and never played (the human moves first; no turn is ended).
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

function boot(saves: StorageAdapter | null = null): BootstrappedRuleset7App {
  app?.destroy();
  document.body.innerHTML = '<div id="app"></div>';
  app = bootstrapRuleset7App(document, {
    storage: saves,
    settingsStorage: new MemoryStorage(),
    boardHost: new Host(),
    randomSeed: () => 4242,
    randomDraw: () => 0,
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

const launchLabel = (): string =>
  required('[data-action="launch"]').textContent;
const chipShown = (): boolean => !required(".v7-custom-chip").hidden;
const resetShown = (): boolean =>
  !required('[data-action="setup-regular"]').hidden;

async function waitUntil(predicate: () => boolean): Promise<void> {
  for (let index = 0; index < 400; index += 1) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  throw new Error("Condition not reached");
}

async function launch(running: BootstrappedRuleset7App) {
  press("launch");
  await waitUntil(
    () =>
      running.controller.snapshot().phase === "ACTIVE" &&
      !running.controller.snapshot().transitioning,
  );
  const setup = running.controller.snapshot().view?.setup;
  if (setup === undefined) throw new Error("No setup");
  return setup;
}

beforeEach(() => window.localStorage.clear());
afterEach(() => {
  app?.destroy();
  app = null;
});

describe("Regular and custom games on the new-game screen", () => {
  it("launches a regular game with only the quick choices made", async () => {
    const running = boot();
    press("new-game");
    expect(launchLabel()).toBe("Start regular game");
    expect(chipShown()).toBe(false);
    expect(required(".v7-setup-form").dataset.gameKind).toBe("regular");
    // The quick path: mode, tribe, opponents, difficulty.
    press("game-mode-perfection");
    press("tribe-goblin");
    press("ai-count-3");
    press("difficulty-harder");
    // Opening Custom game alone changes nothing.
    press("setup-advanced");
    expect(launchLabel()).toBe("Start regular game");
    expect(resetShown()).toBe(false);
    expect(required(".v7-custom-note").textContent).toContain(
      "No stars in custom games.",
    );
    const setup = await launch(running);
    expect(setup).toMatchObject({
      gameKind: "REGULAR",
      gameMode: "PERFECTION",
      aiCount: 3,
      aiDifficulty: "HARDER",
    });
    expect(setup.factions[0]).toBe("GOBLIN");
    expect(isRegularGameV7(setup)).toBe(true);
  });

  it("makes a custom game of any change under Custom game", async () => {
    const changes: readonly [string, () => void][] = [
      ["Alliances", () => press("ai-mode-cooperative")],
      ["AI head start", () => choose("v7-ai-head-start", "20")],
      ["Map", () => choose("v7-map-type", "DRY_LAND")],
      ["Size", () => choose("v7-board-size", "14")],
      [
        "Curiosities",
        () => {
          const box = required<HTMLInputElement>("#v7-curiosities");
          box.checked = false;
          box.dispatchEvent(new Event("change", { bubbles: true }));
        },
      ],
      ["Use seed", () => press("seed-mode-seed")],
      ["Opponent's faction", () => choose("v7-faction-1", "DWARF")],
    ];
    for (const [name, change] of changes) {
      const running = boot();
      press("new-game");
      press("setup-advanced");
      change();
      expect(launchLabel(), name).toBe("Start custom game");
      expect(chipShown(), name).toBe(true);
      expect(resetShown(), name).toBe(true);
      const setup = await launch(running);
      expect(setup.gameKind, name).toBe("CUSTOM");
      expect(isRegularGameV7(setup), name).toBe(false);
    }
  });

  it("the kind is saved with the match", async () => {
    for (const custom of [false, true]) {
      const saves = new MemoryStorage();
      const running = boot(saves);
      press("new-game");
      if (custom) press("ai-mode-cooperative");
      await launch(running);
      await waitUntil(() => saves.getItem(SAVE_STORAGE_KEY_V7) !== null);
      const loaded = parseSaveV7(saves.getItem(SAVE_STORAGE_KEY_V7) ?? "");
      expect(loaded.kind).toBe("VALID");
      if (loaded.kind === "VALID")
        expect(loaded.save.setup.gameKind).toBe(custom ? "CUSTOM" : "REGULAR");
    }
  });

  it("the Showcase is a custom game", async () => {
    const running = boot();
    press("new-game");
    choose("v7-map-type", "SHOWCASE");
    expect(launchLabel()).toBe("Start custom game");
    const setup = await launch(running);
    expect(setup).toMatchObject({ mapType: "SHOWCASE", gameKind: "CUSTOM" });
  });

  it("a value set back to its default, or Back to regular, makes it regular again", async () => {
    const running = boot();
    press("new-game");
    press("setup-advanced");
    choose("v7-board-size", "14");
    expect(launchLabel()).toBe("Start custom game");
    choose("v7-board-size", String(quickBoardSizeV7("CONTINENTS", 1)));
    expect(launchLabel()).toBe("Start regular game");
    press("ai-mode-cooperative");
    choose("v7-faction-1", "DWARF");
    press("seed-mode-seed");
    expect(launchLabel()).toBe("Start custom game");
    press("setup-regular");
    expect(launchLabel()).toBe("Start regular game");
    expect(chipShown()).toBe(false);
    expect(required<HTMLSelectElement>("#v7-ai-mode").value).toBe("RIVAL");
    const setup = await launch(running);
    expect(setup).toMatchObject({
      gameKind: "REGULAR",
      aiMode: "RIVAL",
      mapType: "CONTINENTS",
      width: 11,
    });
  });
});
