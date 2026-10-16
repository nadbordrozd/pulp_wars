// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  bootstrapRuleset7App,
  type BootstrappedRuleset7App,
} from "../../src/app/index";
import {
  QUICK_DIFFICULTY_STORAGE_KEY_V7,
  QUICK_LAST_MAP_STORAGE_KEY_V7,
} from "../../src/app/quick-start-preference-v7";
import {
  OFFERED_FACTION_IDS_V7,
  matchDifficultyV7,
} from "../../src/engine/index";
import type {
  BoardHostModelV7,
  BoardHostV7,
} from "../../src/render/canvas/board-host-v7";
import {
  quickBoardSizeV7,
  quickHeadStartCoinsV7,
  randomOpponentFactionsV7,
} from "../../src/render/quick-start-v7";
import type { StorageAdapter } from "../../src/persistence/index";

/**
 * Quick start (bead `pulp_wars-2yc.54`): the new-game screen asks the game
 * mode, the tribe, Opponents and Difficulty, and derives the rest; Advanced
 * settings hold every other option and override. Matches are created and
 * never played (the human moves first; no turn is ended).
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

const BLOCKED: StorageAdapter = {
  getItem: () => {
    throw new Error("blocked");
  },
  setItem: () => {
    throw new Error("blocked");
  },
  removeItem: () => undefined,
};

let app: BootstrappedRuleset7App | null = null;

function boot(
  settings: StorageAdapter | null,
  options: {
    readonly saves?: StorageAdapter | null;
    readonly randomDraw?: () => number;
  } = {},
): BootstrappedRuleset7App {
  app?.destroy();
  document.body.innerHTML = '<div id="app"></div>';
  app = bootstrapRuleset7App(document, {
    storage: options.saves ?? null,
    settingsStorage: settings,
    boardHost: new Host(),
    randomSeed: () => 4242,
    randomDraw: options.randomDraw ?? (() => 0),
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

const fieldValue = (id: string): string =>
  required<HTMLSelectElement>(`#${id}`).value;

const pressed = (group: string): string[] =>
  [
    ...required(group).querySelectorAll<HTMLButtonElement>(
      '.v7-picker-segment[aria-pressed="true"]',
    ),
  ].map((node) => node.value);

const quickMap = (): string => required(".v7-quick-map-text").textContent;

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

async function launch(running: BootstrappedRuleset7App) {
  press("launch");
  await waitUntil(() => active(running));
  const setup = running.controller.snapshot().view?.setup;
  if (setup === undefined) throw new Error("No setup");
  return setup;
}

beforeEach(() => window.localStorage.clear());
afterEach(() => {
  app?.destroy();
  app = null;
});

describe("Quick start on the new-game screen", () => {
  it("asks only the mode, the tribe, Opponents and Difficulty, with everything else under a closed Advanced settings", () => {
    boot(new MemoryStorage());
    press("new-game");
    const form = required(".v7-setup-form");
    const quick = [...form.querySelectorAll<HTMLElement>(".v7-quick-choice")];
    expect(quick.map((node) => node.firstChild?.textContent)).toEqual([
      "Opponents",
      "Difficulty",
    ]);
    // Opponents 1 to 8 and the four levels, as rows of buttons.
    expect(
      [
        ...required(".v7-opponents-choice").querySelectorAll(
          ".v7-picker-segment",
        ),
      ].map((node) => node.textContent),
    ).toEqual(["1", "2", "3", "4", "5", "6", "7", "8"]);
    expect(
      [
        ...required(".v7-difficulty-choice").querySelectorAll(
          ".v7-picker-segment",
        ),
      ].map((node) => node.textContent),
    ).toEqual(["Normal", "Hard", "Harder", "Brutal"]);
    expect(pressed(".v7-opponents-choice")).toEqual(["1"]);
    expect(pressed(".v7-difficulty-choice")).toEqual(["NORMAL"]);
    // The map and its size, nothing about how they were chosen.
    expect(quickMap()).toBe("Continents · 11 × 11");
    const shown = form.cloneNode(true) as HTMLElement;
    for (const hidden of shown.querySelectorAll("[hidden]")) hidden.remove();
    expect(shown.textContent).not.toMatch(/land|crowd|formula|per player/i);
    // Advanced settings: closed, holding every other option.
    const toggle = required<HTMLButtonElement>(
      '[data-action="setup-advanced"]',
    );
    const advanced = required("#v7-setup-advanced");
    expect(toggle.textContent).toBe("Advanced settings");
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(toggle.getAttribute("aria-controls")).toBe(advanced.id);
    expect(advanced.hidden).toBe(true);
    for (const id of [
      "v7-ai-mode",
      "v7-ai-head-start",
      "v7-map-type",
      "v7-board-size",
      "v7-curiosities",
      "v7-seed",
      "v7-faction-1",
    ])
      expect(advanced.querySelector(`#${id}`), id).not.toBeNull();
    press("setup-advanced");
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(advanced.hidden).toBe(false);
    // Pre-filled with what the quick path picks.
    expect(fieldValue("v7-map-type")).toBe("CONTINENTS");
    expect(fieldValue("v7-board-size")).toBe("11");
    expect(fieldValue("v7-ai-head-start")).toBe("0");
    expect(fieldValue("v7-ai-mode")).toBe("RIVAL");
    expect(required<HTMLInputElement>("#v7-curiosities").checked).toBe(true);
    press("setup-advanced");
    expect(advanced.hidden).toBe(true);
  });

  it("starts on the defaults: Continents 11 × 11, one random opponent, no head start, curiosities, free-for-all", async () => {
    const running = boot(new MemoryStorage(), { randomDraw: () => 3 });
    const setup = await launch(running);
    const opponent = randomOpponentFactionsV7(
      OFFERED_FACTION_IDS_V7,
      "ORIGINAL",
      () => 3,
    )[0];
    expect(opponent).not.toBe("UNDEAD");
    expect(setup).toMatchObject({
      mapType: "CONTINENTS",
      width: 11,
      height: 11,
      aiCount: 1,
      aiMode: "RIVAL",
      curiosities: true,
      gameMode: "DOMINATION",
      factions: ["ORIGINAL", opponent],
      aiDifficulty: "NORMAL",
    });
    expect("aiHeadStart" in setup).toBe(false);
  });

  it("sizes the board from the opponents and sets the head start from the difficulty, without a word about either", async () => {
    const settings = new MemoryStorage();
    const running = boot(settings);
    press("ai-count-4");
    const size = quickBoardSizeV7("CONTINENTS", 4);
    expect(size).toBeGreaterThan(11);
    expect(fieldValue("v7-ai-count")).toBe("4");
    expect(fieldValue("v7-board-size")).toBe(String(size));
    expect(quickMap()).toBe(`Continents · ${size} × ${size}`);
    // The size moved by itself: no "Size changed" note, no gold ring.
    expect(required(".v7-setup-note").hidden).toBe(true);
    expect(required("#v7-board-size-control").dataset.moved).toBe("false");
    press("difficulty-hard");
    expect(pressed(".v7-difficulty-choice")).toEqual(["HARD"]);
    expect(fieldValue("v7-ai-head-start")).toBe(
      String(quickHeadStartCoinsV7("HARD", "CONTINENTS", size, 4)),
    );
    press("difficulty-brutal");
    const coins = quickHeadStartCoinsV7("BRUTAL", "CONTINENTS", size, 4);
    expect(fieldValue("v7-ai-head-start")).toBe(String(coins));
    expect(required("#v7-ai-head-start-control").textContent).toBe(
      `+${coins} Coins`,
    );
    expect(settings.getItem(QUICK_DIFFICULTY_STORAGE_KEY_V7)).toBe("BRUTAL");
    const setup = await launch(running);
    // The setup names the difficulty for the skirmish stars
    // (pulp_wars-2yc.69).
    expect(setup).toMatchObject({
      mapType: "CONTINENTS",
      width: size,
      aiCount: 4,
      aiHeadStart: { coins },
      aiDifficulty: "BRUTAL",
    });
    expect(new Set(setup.factions).size).toBe(5);
  });

  it("remembers the difficulty for the next visit, and works with blocked storage", async () => {
    const settings = new MemoryStorage();
    settings.setItem(QUICK_DIFFICULTY_STORAGE_KEY_V7, "HARDER");
    boot(settings);
    expect(pressed(".v7-difficulty-choice")).toEqual(["HARDER"]);
    expect(fieldValue("v7-ai-head-start")).toBe(
      String(quickHeadStartCoinsV7("HARDER", "CONTINENTS", 11, 1)),
    );
    const running = boot(BLOCKED);
    expect(pressed(".v7-difficulty-choice")).toEqual(["NORMAL"]);
    press("difficulty-hard");
    press("ai-count-2");
    const setup = await launch(running);
    expect(setup).toMatchObject({
      mapType: "CONTINENTS",
      aiCount: 2,
      width: quickBoardSizeV7("CONTINENTS", 2),
    });
  });

  it("cycles Continents, Lakes, Pangea from game to game and remembers where it is", async () => {
    const settings = new MemoryStorage();
    for (const expected of ["CONTINENTS", "LAKES", "PANGEA", "CONTINENTS"]) {
      const running = boot(settings);
      expect(fieldValue("v7-map-type")).toBe(expected);
      const setup = await launch(running);
      expect(setup.mapType).toBe(expected);
      expect(setup.width).toBe(quickBoardSizeV7(expected as "LAKES", 1));
      expect(settings.getItem(QUICK_LAST_MAP_STORAGE_KEY_V7)).toBe(expected);
    }
    // A map chosen under Advanced, outside the cycle, leaves it where it is.
    const running = boot(settings);
    expect(fieldValue("v7-map-type")).toBe("LAKES");
    choose("v7-map-type", "ARCHIPELAGO");
    expect(quickMap()).toMatch(/^Archipelago · /);
    expect((await launch(running)).mapType).toBe("ARCHIPELAGO");
    boot(settings);
    expect(fieldValue("v7-map-type")).toBe("LAKES");
  });

  it("moves on to the next map and new opponents within one page, without storage", async () => {
    let draws = 0;
    const running = boot(null, {
      saves: new MemoryStorage(),
      randomDraw: () => (draws += 1),
    });
    // The page's first new game drew its opponents.
    expect(draws).toBeGreaterThan(0);
    const drawn = draws;
    const first = await launch(running);
    expect(first.mapType).toBe("CONTINENTS");
    press("compact-menu");
    press("main-menu");
    await waitUntil(() => document.querySelector(".v7-main-menu") !== null);
    press("new-game");
    // A new game after one was started: the next map, opponents drawn again.
    expect(fieldValue("v7-map-type")).toBe("LAKES");
    expect(quickMap()).toBe(
      `Lakes · ${quickBoardSizeV7("LAKES", 1)} × ${quickBoardSizeV7("LAKES", 1)}`,
    );
    expect(draws).toBeGreaterThan(drawn);
    expect(required('[data-action="launch"]').textContent).toBe(
      "Start new game",
    );
  });

  it("keeps a size or head start set under Advanced, until a new difficulty takes the head start back", async () => {
    const running = boot(new MemoryStorage());
    press("setup-advanced");
    choose("v7-board-size", "14");
    press("ai-count-2");
    expect(fieldValue("v7-board-size")).toBe("14");
    expect(quickMap()).toBe("Continents · 14 × 14");
    choose("v7-ai-head-start", "20");
    press("ai-count-3");
    expect(fieldValue("v7-ai-head-start")).toBe("20");
    expect(fieldValue("v7-board-size")).toBe("14");
    press("difficulty-hard");
    const coins = quickHeadStartCoinsV7("HARD", "CONTINENTS", 14, 3);
    expect(fieldValue("v7-ai-head-start")).toBe(String(coins));
    // Alliances and Curiosities are set under Advanced too.
    press("ai-mode-cooperative");
    required<HTMLInputElement>("#v7-curiosities").click();
    const setup = await launch(running);
    expect(setup).toMatchObject({
      width: 14,
      aiCount: 3,
      aiMode: "COOPERATIVE",
      curiosities: false,
      aiHeadStart: { coins },
      aiDifficulty: "HARD",
    });
  });

  it("launches a head start set by hand as Normal, which the stars read back from the head start", async () => {
    const running = boot(new MemoryStorage());
    press("setup-advanced");
    press("ai-count-2");
    choose("v7-ai-head-start", "10");
    const setup = await launch(running);
    expect(setup).toMatchObject({
      aiHeadStart: { coins: 10 },
      aiDifficulty: "NORMAL",
    });
    // On this board +10 is Harder's head start.
    expect(quickHeadStartCoinsV7("HARDER", setup.mapType, setup.width, 2)).toBe(
      10,
    );
    expect(matchDifficultyV7(setup)).toBe("HARDER");
  });

  it("draws the opponents from every other tribe, and a tribe the player takes moves its opponent", () => {
    boot(new MemoryStorage(), { randomDraw: () => 5 });
    press("ai-count-8");
    const seats = (): string[] =>
      [...document.querySelectorAll<HTMLElement>(".v7-setup-seat")].map(
        (cell) => cell.dataset.faction ?? "",
      );
    expect(seats()).toEqual([
      "ORIGINAL",
      ...randomOpponentFactionsV7(OFFERED_FACTION_IDS_V7, "ORIGINAL", () => 5),
    ]);
    const taken = seats()[1] ?? "";
    press(`tribe-${taken.toLowerCase().replace("_", "-")}`);
    expect(seats()[0]).toBe(taken);
    expect(new Set(seats()).size).toBe(OFFERED_FACTION_IDS_V7.length);
    // Each opponent's picker shows its faction.
    expect(required("#v7-faction-1-control").textContent).toBe(
      required<HTMLSelectElement>("#v7-faction-1").selectedOptions[0]
        ?.textContent,
    );
  });

  it("hides the difficulty on the Showcase and names it in the map line", () => {
    boot(new MemoryStorage());
    choose("v7-map-type", "SHOWCASE");
    expect(required(".v7-difficulty-choice").hidden).toBe(true);
    expect(quickMap()).toBe("Showcase · 16 × 16");
    choose("v7-map-type", "PANGEA");
    expect(required(".v7-difficulty-choice").hidden).toBe(false);
    expect(quickMap()).toBe(
      `Pangea · ${quickBoardSizeV7("PANGEA", 1)} × ${quickBoardSizeV7("PANGEA", 1)}`,
    );
  });
});
