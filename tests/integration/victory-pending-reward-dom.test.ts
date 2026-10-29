// @vitest-environment jsdom

import { afterEach, describe, expect, it } from "vitest";
import {
  appendReplayCommandV7,
  createReplayV7,
  type CommandV7,
  type GameStateV7,
} from "../../src/engine/index";
import { Ruleset7BrowserController } from "../../src/app/index";
import type {
  BoardHostModelV7,
  BoardHostV7,
} from "../../src/render/canvas/board-host-v7";
import { Ruleset7DomAppView } from "../../src/render/dom/app-view-v7";
import {
  CAMPAIGN_PROGRESS_STORAGE_KEY_V7,
  SAVE_STORAGE_KEY_V7,
  SETTINGS_STORAGE_KEY,
  TRIBE_STARS_STORAGE_KEY_V7,
  createSaveEnvelopeV7,
} from "../../src/persistence/index";
import { checkedV7 } from "../fixtures/v7-builders";
import {
  applyOkV7,
  goblinArenaV7,
  unitAtV7,
} from "../fixtures/v7-goblin-arena";
import { MemoryStorage } from "./ruleset7-browser-controller.shared";

/**
 * The skirmish that froze on its Victory dialog (bead pulp_wars-2ha0). The
 * winning capture takes the last enemy city along a Road: the city joins
 * the winner's road network, the capital gains a population and levels
 * up, and the won state still holds that level's city reward. The reward
 * dialog was drawn under the Victory dialog; the modal isolation kept the
 * first modal (the reward) live and made the Victory dialog inert, so no
 * button worked, and the autosaved state brought it back on every reload.
 * A small hand-built two-seat board, one command from the win; no match is
 * played.
 */
const AT = "2026-10-29T12:00:00.000Z";
const at = (x: number, y: number) => ({ x, y });
/** The Road from the rival's city (2, 8) to the human capital (8, 8). */
const ROAD = new Set(["3,8", "4,8", "5,7", "6,8", "7,8"]);

function beforeWinV7(): GameStateV7 {
  const base = goblinArenaV7(
    ["ORIGINAL", "UNDEAD"],
    [{ seat: 0, role: "FIGHTER", at: at(2, 8), captureEligible: true }],
    { techs: { 1: [] } },
  );
  const capital = base.cities.find(
    (city) => city.ownerId === base.humanPlayerId,
  );
  if (capital === undefined) throw new Error("no capital");
  const hunt = base.board.tiles.find(
    (tile) =>
      tile.territoryCityId === capital.id &&
      (tile.at.x !== capital.at.x || tile.at.y !== capital.at.y),
  );
  if (hunt === undefined) throw new Error("no territory");
  return checkedV7({
    ...base,
    setup: { ...base.setup, gameKind: "REGULAR" },
    round: 6,
    nextEntityId: base.nextEntityId + 1,
    board: {
      ...base.board,
      tiles: base.board.tiles.map((tile) =>
        ROAD.has(`${tile.at.x},${tile.at.y}`) ? { ...tile, road: true } : tile,
      ),
    },
    // One population short of level 2: the Road link adds it.
    cities: base.cities.map((city) =>
      city.id === capital.id
        ? { ...city, population: 1, permanentPopulation: 1 }
        : city,
    ),
    populationContributions: [
      ...base.populationContributions,
      {
        id: base.nextEntityId,
        cityId: capital.id,
        category: "PERMANENT",
        amount: 1,
        source: { kind: "RESOURCE_ACTION", action: "HUNT_GAME", at: hunt.at },
      },
    ],
  });
}

function captureV7(state: GameStateV7): CommandV7 {
  return { kind: "CAPTURE", unitId: unitAtV7(state, at(2, 8)).id };
}

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

/** Progress kept in the same browser, which leaving the match must keep. */
const OTHER_PROGRESS = [
  [SETTINGS_STORAGE_KEY, "settings"],
  [CAMPAIGN_PROGRESS_STORAGE_KEY_V7, "campaign"],
  [TRIBE_STARS_STORAGE_KEY_V7, "stars"],
] as const;

function storageWith(
  state: GameStateV7,
  commands: readonly CommandV7[],
  states: readonly GameStateV7[],
): MemoryStorage {
  let replay = createReplayV7(state.setup);
  commands.forEach((command, index) => {
    const after = states[index];
    if (after === undefined) throw new Error("missing state");
    replay = appendReplayCommandV7(replay, command, after);
  });
  const storage = new MemoryStorage();
  const saved = states.at(-1) ?? state;
  storage.setItem(
    SAVE_STORAGE_KEY_V7,
    JSON.stringify(createSaveEnvelopeV7({ state: saved, replay }, AT)),
  );
  for (const [key, value] of OTHER_PROGRESS) storage.setItem(key, value);
  return storage;
}

let view: Ruleset7DomAppView | null = null;
let controller: Ruleset7BrowserController | null = null;

function mount(storage: MemoryStorage): Ruleset7DomAppView {
  document.body.innerHTML = '<div id="app"></div>';
  const root = document.querySelector<HTMLElement>("#app");
  if (root === null) throw new Error("no root");
  controller = new Ruleset7BrowserController({
    storage,
    savedHistoryVerifier: null,
  });
  view = new Ruleset7DomAppView(document, root, controller, {
    boardHost: new Host(),
    settingsStorage: null,
    randomSeed: () => 7,
    randomDraw: () => 0,
  });
  return view;
}

async function waitUntil(predicate: () => boolean): Promise<void> {
  for (let index = 0; index < 400; index += 1) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  throw new Error("Condition not reached");
}

function press(action: string): void {
  const node = document.querySelector<HTMLButtonElement>(
    `[data-action="${action}"]`,
  );
  if (node === null) throw new Error(`Missing ${action}`);
  node.click();
}

/** The Victory dialog is the one live modal: nothing else is up or inert. */
function expectLiveVictory(): HTMLElement {
  const results = document.querySelector<HTMLElement>(".v7-results");
  expect(results).not.toBeNull();
  expect(results?.dataset.outcome).toBe("victory");
  expect(document.querySelector(".v7-mandatory-choice")).toBeNull();
  expect(document.querySelectorAll('[aria-modal="true"]')).toHaveLength(1);
  expect(results?.inert).toBe(false);
  expect(results?.closest("[inert]")).toBeNull();
  for (const action of ["restart", "results-menu"]) {
    const button = results?.querySelector(`[data-action="${action}"]`);
    expect(button, action).not.toBeNull();
    expect(button?.closest("[inert]"), action).toBeNull();
  }
  return results as HTMLElement;
}

afterEach(() => {
  view?.destroy();
  controller?.destroy();
  view = null;
  controller = null;
  document.body.innerHTML = "";
});

describe("a win that also levels a city up (pulp_wars-2ha0)", () => {
  it("ends the match with the level's city reward still queued", () => {
    const before = beforeWinV7();
    const won = applyOkV7(before, before.humanPlayerId, captureV7(before));
    expect(won.state.outcome).toEqual({
      kind: "VICTORY",
      winnerId: before.humanPlayerId,
    });
    expect(won.state.pendingChoices).toHaveLength(1);
    expect(won.state.pendingChoices[0]?.reachedLevel).toBe(2);
  });

  it("shows a live Victory dialog when the capture wins the match", async () => {
    const before = beforeWinV7();
    const app = mount(storageWith(before, [], []));
    press("resume");
    await waitUntil(() => controller?.snapshot().phase === "ACTIVE");
    await app.dispatchForReview(captureV7(before));
    expect(controller?.snapshot().phase).toBe("COMPLETE");
    expect(controller?.snapshot().view?.pendingChoices).toHaveLength(1);
    // The won match's achievements come first, each with its Continue.
    while (document.querySelector('[data-action="dismiss-achievement"]'))
      press("dismiss-achievement");
    expectLiveVictory();
    press("results-menu");
    await waitUntil(() => controller?.snapshot().phase === "EMPTY");
  });

  it("opens the autosaved won match on a live Victory dialog, and Main menu leaves it", async () => {
    const before = beforeWinV7();
    const command = captureV7(before);
    const won = applyOkV7(before, before.humanPlayerId, command).state;
    const storage = storageWith(before, [command], [won]);
    mount(storage);
    expect(controller?.snapshot().phase).toBe("COMPLETE");
    expect(controller?.snapshot().view?.pendingChoices).toHaveLength(1);
    expectLiveVictory();
    press("results-menu");
    await waitUntil(() => controller?.snapshot().phase === "EMPTY");
    expect(storage.getItem(SAVE_STORAGE_KEY_V7)).toBeNull();
    for (const [key, value] of OTHER_PROGRESS)
      expect(storage.getItem(key)).toBe(value);
  });

  it("starts the same match again from the autosaved won match", async () => {
    const before = beforeWinV7();
    const command = captureV7(before);
    const won = applyOkV7(before, before.humanPlayerId, command).state;
    mount(storageWith(before, [command], [won]));
    expectLiveVictory();
    press("restart");
    await waitUntil(() => controller?.snapshot().phase === "ACTIVE");
    expect(document.querySelector(".v7-results")).toBeNull();
  });
});
