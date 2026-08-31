// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  bootstrapRuleset6App,
  type Ruleset6BrowserController,
  type Ruleset6BrowserSnapshot,
} from "../../src/app/index";
import {
  canonicalHash,
  canonicalJson,
  createPlayableGameV6,
  queryPlayerCommandsV6,
  viewForV6,
  type CommandV6,
  type MatchSetupV6,
  type PlayerViewV6,
} from "../../src/engine/index";
import type {
  BoardHostV6,
  CanvasBoardHostCallbacksV6,
  CanvasBoardHostModelV6,
} from "../../src/render/canvas/board-host-v6";
import type { MapCommandTargetV6 } from "../../src/render/canvas/render-plan-v6";
import {
  Ruleset6DomAppView,
  type Ruleset6BrowserControllerPort,
} from "../../src/render/dom/app-view-v6";
import type { StorageAdapter } from "../../src/persistence/index";

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  window.localStorage.clear();
});

describe("playable ruleset-6 DOM shell", () => {
  it("boots the production v6 setup, constrains sizes, and launches explicit Candy seats", async () => {
    const host = new FakeBoardHostV6();
    const app = bootstrapRuleset6App(document, {
      storage: null,
      boardHost: host,
    });
    expect(document.querySelector("[data-v6-setup]")).not.toBeNull();
    expect(document.body.textContent).toContain("spatial economy");

    changeSelect("v6-ai-count", "3");
    expect(selectValues("v6-board-size")).toEqual(["16", "20", "25"]);
    expect(document.querySelectorAll("[data-faction-seat]")).toHaveLength(4);
    changeSelect("v6-ai-count", "1");
    changeSelect("v6-faction-0", "CANDY");
    changeSelect("v6-faction-1", "CANDY");
    changeSelect("v6-color", "TEAL");
    setInput("v6-seed", "9");
    submit("[data-v6-setup]");
    await waitUntil(() => app.controller.snapshot().phase === "ACTIVE");

    expect(app.controller.snapshot().view?.viewer).toMatchObject({
      faction: "CANDY",
      factionTreeId: "CANDY_BASELINE_V1",
      color: "TEAL",
    });
    expect(app.controller.snapshot().view?.setup.factions).toEqual([
      "CANDY",
      "CANDY",
    ]);
    expect(host.model?.view.schemaVersion).toBe(6);
    expect(document.body.textContent).toContain("Coins");
    expect(document.body.textContent).toContain("Round");
    expect(document.querySelector("[data-tech-tree]")).not.toBeNull();
    expect(document.body.textContent).toContain("Candy match launched.");
    app.destroy();
    expect(host.destroyCalls).toBeGreaterThan(0);
    expect(document.querySelector("#app")?.children).toHaveLength(0);
  });

  it("dispatches only exact current single/ambiguous map candidates and exposes research plus every offered action", async () => {
    const host = new FakeBoardHostV6();
    const app = bootstrapRuleset6App(document, {
      storage: null,
      boardHost: host,
    });
    submit("[data-v6-setup]");
    await waitUntil(() => app.controller.snapshot().phase === "ACTIVE");
    const initial = app.controller.snapshot();
    const wait = requireCommand(initial, "WAIT");
    host.callbacks?.onCommandCandidates([target(wait, { x: 0, y: 0 })], {
      x: 0,
      y: 0,
    });
    await waitUntil(() => app.controller.snapshot().commandIndex === 1);

    const next = app.controller.snapshot();
    const research = requireCommand(next, "RESEARCH");
    const end = requireCommand(next, "END_TURN");
    host.callbacks?.onCommandCandidates(
      [target(research, { x: 1, y: 1 }), target(end, { x: 1, y: 1 })],
      { x: 1, y: 1 },
    );
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
    const researchChoice = commandButton(research);
    researchChoice.click();
    await waitUntil(() => app.controller.snapshot().commandIndex === 2);
    expect(app.controller.snapshot().view?.viewer.researchedTechs).toContain(
      research.tech,
    );

    const offered = app.controller.snapshot().offeredCommands;
    for (const command of offered) {
      expect(commandButton(command)).toBeInstanceOf(HTMLButtonElement);
    }
    expect(document.querySelectorAll("[data-tech]").length).toBe(25);
    app.destroy();
  });

  it("resumes, restarts, deletes, recovers corrupt saves, and flushes on lifecycle boundaries", async () => {
    const storage = new MemoryStorage();
    const first = bootstrapRuleset6App(document, {
      storage,
      boardHost: new FakeBoardHostV6(),
      persistenceNow: () => "2026-08-31T18:00:00.000Z",
    });
    submit("[data-v6-setup]");
    await waitUntil(() => first.controller.snapshot().phase === "ACTIVE");
    window.dispatchEvent(new Event("pagehide"));
    expect(storage.writes).toBeGreaterThan(0);
    const hash = first.controller.snapshot().stateHash;
    first.destroy();

    document.body.innerHTML = '<div id="app"></div>';
    const resumed = bootstrapRuleset6App(document, {
      storage,
      boardHost: new FakeBoardHostV6(),
    });
    expect(resumed.controller.snapshot().phase).toBe("RESUMABLE");
    click("[data-action=resume]");
    await waitUntil(() => resumed.controller.snapshot().phase === "ACTIVE");
    expect(resumed.controller.snapshot().stateHash).toBe(hash);
    click("[data-action=restart]");
    await waitUntil(() => resumed.controller.snapshot().commandIndex === 0);
    click("[data-action=delete-save]");
    await waitUntil(() => resumed.controller.snapshot().phase === "EMPTY");
    expect(storage.removals).toBe(1);
    expect(document.body.textContent).toContain("Saved match deleted.");
    resumed.destroy();

    storage.setItem("pulpWars.save.current", "{ corrupt");
    document.body.innerHTML = '<div id="app"></div>';
    const recovery = bootstrapRuleset6App(document, {
      storage,
      boardHost: new FakeBoardHostV6(),
    });
    expect(recovery.controller.snapshot().phase).toBe("RECOVERY");
    expect(document.body.textContent).toContain("Nothing was overwritten");
    click("[data-action=delete-save]");
    await waitUntil(() => recovery.controller.snapshot().phase === "EMPTY");
    recovery.destroy();
  });

  it("publishes a new host identity and final success render for command-zero restart and replacement", async () => {
    const storage = new MemoryStorage();
    const firstHost = new FakeBoardHostV6();
    const first = bootstrapRuleset6App(document, {
      storage,
      boardHost: firstHost,
    });
    submit("[data-v6-setup]");
    await waitUntil(
      () =>
        document.body.textContent?.includes("Original match launched.") ===
        true,
    );
    expect(firstHost.updateIds.at(-1)).toBe(1);
    expect(first.controller.snapshot().commandIndex).toBe(0);

    click("[data-action=restart]");
    await waitUntil(() => firstHost.updateIds.at(-1) === 2);
    expect(first.controller.snapshot().commandIndex).toBe(0);
    expect(document.body.textContent).toContain(
      "The match restarted from its original setup.",
    );
    first.destroy();

    document.body.innerHTML = '<div id="app"></div>';
    const replacementHost = new FakeBoardHostV6();
    const replacement = bootstrapRuleset6App(document, {
      storage,
      boardHost: replacementHost,
    });
    expect(replacement.controller.snapshot().phase).toBe("RESUMABLE");
    click("[data-action=show-replace]");
    setInput("v6-seed", "9");
    submit("[data-v6-setup]");
    await waitUntil(
      () =>
        document.body.textContent?.includes("Original match launched.") ===
        true,
    );
    expect(replacement.controller.snapshot().view?.setup.seed).toBe(9);
    expect(replacementHost.updateIds).toContain(0);
    expect(replacementHost.updateIds.at(-1)).toBe(1);
    replacement.destroy();
  });

  it("renders all command families and locks mandatory city/Candy choices semantically", () => {
    const view = publicView("CANDY");
    const commands = commandCatalogue(view);
    const fake = new FakeController(view, commands);
    const host = new FakeBoardHostV6();
    const root = requireElement("#app");
    const app = new Ruleset6DomAppView(document, root, fake, {
      boardHost: host,
    });
    const renderedKinds = new Set(
      [...document.querySelectorAll<HTMLElement>("[data-command-kind]")].map(
        (node) => node.dataset.commandKind,
      ),
    );
    expect(renderedKinds).toEqual(
      new Set(commands.map((command) => command.kind)),
    );
    const farm = commands.find((command) => command.kind === "BUILD_FARM");
    if (farm === undefined) throw new Error("Missing farm command");
    commandButton(farm).click();
    expect(document.querySelector("[data-confirm-prepared]")).not.toBeNull();
    const roll = commands.find((command) => command.kind === "KAMIKAZE_ROLL");
    if (roll === undefined) throw new Error("Missing roll command");
    commandButton(roll).click();
    expect(
      document.querySelector("[data-confirm-prepared]")?.textContent,
    ).toContain("Roll North");

    const reward = commands.find(
      (
        command,
      ): command is Extract<CommandV6, { kind: "CHOOSE_CITY_REWARD" }> =>
        command.kind === "CHOOSE_CITY_REWARD",
    );
    if (reward === undefined) throw new Error("Missing reward command");
    fake.setSnapshot({
      ...fake.snapshot(),
      view: {
        ...view,
        pendingChoices: [
          {
            kind: "CITY_REWARD",
            cityId: reward.cityId,
            reachedLevel: reward.reachedLevel,
            candidates: [reward.reward],
          },
        ],
      },
      offeredCommands: [reward],
    });
    expect(document.body.textContent).toContain("Choose a city reward");
    expect(document.querySelectorAll("[data-command-kind]")).toHaveLength(1);

    const candify = commands.find(
      (
        command,
      ): command is Extract<CommandV6, { kind: "CHOOSE_CANDIFY_CITY" }> =>
        command.kind === "CHOOSE_CANDIFY_CITY",
    );
    if (candify === undefined) throw new Error("Missing Candify command");
    fake.setSnapshot({
      ...fake.snapshot(),
      view: {
        ...view,
        pendingChoices: [
          {
            kind: "CANDIFY_CITY",
            unitId: candify.unitId,
            candidateCityIds: [candify.cityId],
          },
        ],
      },
      offeredCommands: [candify],
    });
    expect(document.body.textContent).toContain("Choose a Candify city");
    app.destroy();
  });

  it("keeps map interaction observation-safe and makes completion read-only", async () => {
    const fixture = createPlayableGameV6(setup("ORIGINAL", 42));
    if (!fixture.ok) throw new Error(fixture.error.code);
    const view = viewForV6(fixture.state, fixture.state.humanPlayerId);
    const hash = canonicalHash(fixture.state);
    const fake = new FakeController(view, queryPlayerCommandsV6(view));
    const host = new FakeBoardHostV6();
    const app = new Ruleset6DomAppView(document, requireElement("#app"), fake, {
      boardHost: host,
    });
    expect(host.model?.view).toBe(view);
    host.callbacks?.onSelection({ kind: "TILE", at: { x: 0, y: 0 } });
    expect(canonicalHash(fixture.state)).toBe(hash);

    fake.setSnapshot({
      ...fake.snapshot(),
      phase: "COMPLETE",
      offeredCommands: [],
      view: {
        ...view,
        outcome: { kind: "VICTORY", winnerId: view.viewer.id },
      },
    });
    expect(host.model?.interactive).toBe(false);
    expect(document.body.textContent).toContain("Final map · read only");
    expect(document.body.textContent).toContain("Victory");
    app.destroy();
  });
});

class FakeBoardHostV6 implements BoardHostV6 {
  callbacks: CanvasBoardHostCallbacksV6 | null = null;
  model: CanvasBoardHostModelV6 | null = null;
  destroyCalls = 0;
  readonly updateIds: Array<number | string> = [];

  mount(_container: HTMLElement, callbacks: CanvasBoardHostCallbacksV6): void {
    this.callbacks = callbacks;
  }
  update(model: CanvasBoardHostModelV6): void {
    this.model = model;
    this.updateIds.push(model.matchInstanceId);
  }
  activate(): void {}
  select(): void {}
  resetActivationCycle(): void {}
  zoom(): void {}
  focus(): void {}
  screenPoint(): null {
    return null;
  }
  destroy(): void {
    this.destroyCalls += 1;
    this.callbacks = null;
    this.model = null;
  }
}

class FakeController implements Ruleset6BrowserControllerPort {
  #snapshot: Ruleset6BrowserSnapshot;
  readonly #subscribers = new Set<
    (snapshot: Ruleset6BrowserSnapshot) => void
  >();

  constructor(view: PlayerViewV6, commands: readonly CommandV6[]) {
    this.#snapshot = {
      phase: "ACTIVE",
      view,
      offeredCommands: commands,
      commandIndex: view.commandIndex,
      stateHash: "public-test-state",
      savedAt: null,
      hasStoredSave: false,
      recovery: null,
      saveWarning: null,
      diagnostic: null,
      transitioning: false,
    };
  }
  snapshot(): Ruleset6BrowserSnapshot {
    return this.#snapshot;
  }
  subscribe(
    subscriber: (snapshot: Ruleset6BrowserSnapshot) => void,
  ): () => void {
    this.#subscribers.add(subscriber);
    subscriber(this.#snapshot);
    return () => this.#subscribers.delete(subscriber);
  }
  setSnapshot(snapshot: Ruleset6BrowserSnapshot): void {
    this.#snapshot = snapshot;
    this.#subscribers.forEach((subscriber) => subscriber(snapshot));
  }
  launch = vi.fn<Ruleset6BrowserController["launch"]>();
  resume = vi.fn<Ruleset6BrowserController["resume"]>();
  dispatch = vi.fn<Ruleset6BrowserController["dispatch"]>();
  progressAiTurns = vi.fn<Ruleset6BrowserController["progressAiTurns"]>();
  restart = vi.fn<Ruleset6BrowserController["restart"]>();
  deleteStoredSave = vi.fn<Ruleset6BrowserController["deleteStoredSave"]>();
  economicPreview = vi.fn<Ruleset6BrowserController["economicPreview"]>(() => ({
    ok: false,
    error: "NOT_OFFERED",
  }));
}

class MemoryStorage implements StorageAdapter {
  readonly #values = new Map<string, string>();
  writes = 0;
  removals = 0;
  getItem(key: string): string | null {
    return this.#values.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.writes += 1;
    this.#values.set(key, value);
  }
  removeItem(key: string): void {
    this.removals += 1;
    this.#values.delete(key);
  }
}

function publicView(faction: "ORIGINAL" | "CANDY"): PlayerViewV6 {
  const created = createPlayableGameV6(setup(faction, 42));
  if (!created.ok) throw new Error(created.error.code);
  return viewForV6(created.state, created.state.humanPlayerId);
}

function setup(faction: "ORIGINAL" | "CANDY", seed: number): MatchSetupV6 {
  return {
    rulesetId: "pulp-wars-poc-6",
    mapGenerationRevision: "SPATIAL_ECONOMY",
    seed,
    width: 11,
    height: 11,
    aiCount: 1,
    aiDifficulty: "NORMAL",
    aiMode: "RIVAL",
    humanColor: "CORAL",
    factions: [faction, faction === "ORIGINAL" ? "CANDY" : "ORIGINAL"],
  };
}

function commandCatalogue(view: PlayerViewV6): readonly CommandV6[] {
  const unit = view.units.find(
    (candidate) => candidate.ownerId === view.viewer.id,
  );
  const city = view.cities.find(
    (candidate) => candidate.ownerId === view.viewer.id,
  );
  if (unit === undefined || city === undefined)
    throw new Error("Missing public entities");
  const at = city.at;
  return [
    { kind: "MOVE", unitId: unit.id, path: [at] },
    {
      kind: "ATTACK",
      unitId: unit.id,
      target: { kind: "UNIT", unitId: unit.id },
    },
    { kind: "KAMIKAZE_ROLL", unitId: unit.id, direction: "NORTH" },
    { kind: "HEAL_ADJACENT", unitId: unit.id, targetUnitId: unit.id },
    { kind: "RECOVER", unitId: unit.id },
    { kind: "CAPTURE", unitId: unit.id },
    { kind: "PROMOTE", unitId: unit.id },
    { kind: "WAIT", unitId: unit.id },
    { kind: "BUILD_CHOCOLATE_WALL", unitId: unit.id, at },
    { kind: "CANDIFY", unitId: unit.id },
    { kind: "RESEARCH", tech: "FARMING" },
    ...(
      [
        "HARVEST_FRUIT",
        "HUNT_GAME",
        "BUILD_FARM",
        "BUILD_LUMBER_CAMP",
        "BUILD_MINE",
        "BUILD_QUARRY",
        "BUILD_WINDMILL",
        "BUILD_SAWMILL",
        "BUILD_FORGE",
        "BUILD_STONEWORKS",
        "BUILD_WORKSHOP",
        "BUILD_GRAND_WORKS",
        "BUILD_MARKET",
        "CLEAR_FOREST",
        "REPLANT_FOREST",
        "BUILD_ROAD",
        "REDEVELOP",
      ] as const
    ).map((kind) => ({ kind, at })),
    { kind: "TRAIN", cityId: city.id, role: "FIGHTER" },
    { kind: "CHOOSE_CANDIFY_CITY", unitId: unit.id, cityId: city.id },
    {
      kind: "CHOOSE_CITY_REWARD",
      cityId: city.id,
      reachedLevel: 2,
      reward: "SURVEY",
    },
    { kind: "END_TURN" },
  ];
}

function target(
  command: CommandV6,
  at: { x: number; y: number },
): MapCommandTargetV6 {
  return { family: "SELF_ABILITY", at, id: 1, ownerId: 1, command };
}

function requireCommand<K extends CommandV6["kind"]>(
  snapshot: Ruleset6BrowserSnapshot,
  kind: K,
): Extract<CommandV6, { kind: K }> {
  const command = snapshot.offeredCommands.find(
    (candidate): candidate is Extract<CommandV6, { kind: K }> =>
      candidate.kind === kind,
  );
  if (command === undefined) throw new Error(`Missing ${kind}`);
  return command;
}

function commandButton(command: CommandV6): HTMLButtonElement {
  const encoded = canonicalJson(command);
  const nodes = [
    ...document.querySelectorAll<HTMLButtonElement>("[data-command]"),
  ];
  const button = nodes.find((node) => node.dataset.command === encoded);
  if (button === undefined)
    throw new Error(`Missing command button ${encoded}`);
  return button;
}

function requireElement(selector: string): HTMLElement {
  const node = document.querySelector<HTMLElement>(selector);
  if (node === null) throw new Error(`Missing ${selector}`);
  return node;
}

function changeSelect(id: string, value: string): void {
  const select = document.querySelector<HTMLSelectElement>(`#${id}`);
  if (select === null) throw new Error(`Missing ${id}`);
  select.value = value;
  select.dispatchEvent(new Event("change", { bubbles: true }));
}

function setInput(id: string, value: string): void {
  const input = document.querySelector<HTMLInputElement>(`#${id}`);
  if (input === null) throw new Error(`Missing ${id}`);
  input.value = value;
}

function selectValues(id: string): readonly string[] {
  const select = document.querySelector<HTMLSelectElement>(`#${id}`);
  if (select === null) throw new Error(`Missing ${id}`);
  return [...select.options].map((option) => option.value);
}

function submit(selector: string): void {
  const form = document.querySelector<HTMLFormElement>(selector);
  if (form === null) throw new Error(`Missing ${selector}`);
  form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
}

function click(selector: string): void {
  const node = document.querySelector<HTMLButtonElement>(selector);
  if (node === null) throw new Error(`Missing ${selector}`);
  node.click();
}

async function waitUntil(predicate: () => boolean): Promise<void> {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  throw new Error("Timed out waiting for DOM shell transition");
}
