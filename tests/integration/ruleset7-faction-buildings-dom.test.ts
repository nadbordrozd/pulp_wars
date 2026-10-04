// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";
import {
  queryPlayerCommandsV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type FactionIdV7,
  type PlayerViewV7,
} from "../../src/engine/index";
import type { Ruleset7BrowserSnapshot } from "../../src/app/index";
import type {
  BoardHostCallbacksV7,
  BoardHostModelV7,
  BoardHostV7,
} from "../../src/render/canvas/board-host-v7";
import { buildBoardRenderPlanV7 } from "../../src/render/canvas/board-renderer-v7";
import {
  Ruleset7DomAppView,
  type Ruleset7ControllerPortV7,
} from "../../src/render/dom/app-view-v7";
import { FACTION_BUILDINGS_HELP_V7 } from "../../src/render/faction-buildings-v7";
import { undeadUiArenaV7 } from "../fixtures/v7-undead-ui";

/**
 * Faction building looks in the interface (epic pulp_wars-xdh, bead
 * pulp_wars-xdh.2, docs/ui/SCREEN_FLOW.md "Faction buildings"): the tile
 * dock and the build buttons name a building as its faction has it, add one
 * flavour line that says what it counts as, and the Help mentions it.
 */

type Tile = PlayerViewV7["board"]["tiles"][number];

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
});

interface Fixture {
  readonly view: PlayerViewV7;
  readonly offered: readonly CommandV7[];
  readonly farm: CoordV7;
  readonly forge: CoordV7;
  readonly site: CoordV7;
}

/**
 * A two-seat arena: a Farm and a Forge on two Grass tiles of `owner`'s
 * territory and, on a third tile of the viewer's, offered Farm, Windmill
 * and Forge builds.
 */
function fixture(
  viewer: FactionIdV7,
  opponent: FactionIdV7,
  owner: "VIEWER" | "OPPONENT" = "VIEWER",
): Fixture {
  const state = undeadUiArenaV7([], [], [viewer, opponent]);
  const live = viewForV7(state, state.humanPlayerId);
  const other = live.players.find((player) => player.id !== live.viewer.id);
  if (other === undefined) throw new Error("no opponent");
  const cityCells = new Set(
    live.cities.map((city) => `${city.at.x},${city.at.y}`),
  );
  const free = live.board.tiles.filter(
    (tile) =>
      tile.explored &&
      tile.terrain === "GRASS" &&
      tile.improvement === null &&
      tile.site === null &&
      tile.territoryOwnerId === live.viewer.id &&
      !cityCells.has(`${tile.at.x},${tile.at.y}`),
  );
  const [farm, forge, site] = free;
  if (farm === undefined || forge === undefined || site === undefined)
    throw new Error("the arena has no three free tiles in the viewer's land");
  const ownerId = owner === "VIEWER" ? live.viewer.id : other.id;
  const same = (left: CoordV7, right: CoordV7) =>
    left.x === right.x && left.y === right.y;
  const tiles = live.board.tiles.map((tile): Tile => {
    if (!tile.explored) return tile;
    if (same(tile.at, farm.at))
      return {
        ...tile,
        resource: null,
        improvement: "FARM",
        territoryOwnerId: ownerId,
      };
    if (same(tile.at, forge.at))
      return {
        ...tile,
        resource: null,
        improvement: "FORGE",
        territoryOwnerId: ownerId,
      };
    return tile;
  });
  const view: PlayerViewV7 = { ...live, board: { ...live.board, tiles } };
  return {
    view,
    farm: farm.at,
    forge: forge.at,
    site: site.at,
    offered: [
      ...queryPlayerCommandsV7(view),
      { kind: "BUILD_FARM", at: site.at },
      { kind: "BUILD_WINDMILL", at: site.at },
      { kind: "BUILD_FORGE", at: site.at },
    ] as CommandV7[],
  };
}

function open(data: Fixture): {
  readonly app: Ruleset7DomAppView;
  readonly host: RecordingBoardHost;
} {
  const host = new RecordingBoardHost();
  const app = new Ruleset7DomAppView(
    document,
    required<HTMLElement>("#app"),
    new StaticController(data.view, data.offered),
    { boardHost: host, settingsStorage: null },
  );
  return { app, host };
}

const dockTitle = (): string | null =>
  required(".v7-selection-dock h2").textContent;

const actionLabels = (): (string | null)[] =>
  [...document.querySelectorAll(".v7-selection-dock .v7-action-label")].map(
    (node) => node.textContent,
  );

describe("Ruleset 7 faction buildings in the interface", () => {
  it("names an Undead Farm a Graveyard in the dock, with one flavour line", () => {
    const data = fixture("UNDEAD", "ORIGINAL");
    const { app, host } = open(data);
    host.callbacks?.onSelection({ kind: "TILE", at: data.farm });
    expect(dockTitle()).toBe("Graveyard");
    const flavour = required(".v7-selection-dock .v7-building-flavour");
    expect(flavour.textContent).toBe(
      "Quiet plots, tended for later. Counts as a Farm.",
    );
    expect(flavour.dataset.factionBuilding).toBe("UNDEAD:FARM");
    expect(
      document.querySelectorAll(".v7-selection-dock .v7-building-flavour"),
    ).toHaveLength(1);
    // No coordinates anywhere in the dock (the standing UI text rule).
    expect(required(".v7-selection-dock").textContent).not.toMatch(
      /\(\s*\d+\s*,\s*\d+\s*\)|\b\d+\s*,\s*\d+\b/,
    );
    // The board says the same: the plan's label and art subject.
    const entry = buildBoardRenderPlanV7(data.view, [], {
      selection: null,
      selectedUnitId: null,
      selectedAchievement: null,
    }).entries.find(
      (item) =>
        item.kind === "IMPROVEMENT" &&
        item.at.x === data.farm.x &&
        item.at.y === data.farm.y,
    );
    expect([entry?.label, entry?.artSubject]).toEqual([
      "Graveyard",
      "IMPROVEMENT:UNDEAD:FARM",
    ]);
    // A shared building keeps its name and has no flavour line.
    host.callbacks?.onSelection({ kind: "TILE", at: data.forge });
    expect(dockTitle()).toBe("Forge");
    expect(document.querySelector(".v7-building-flavour")).toBeNull();
    app.destroy();
  });

  it("follows the territory owner, not the viewer: a captured Farm changes name", () => {
    // The same Farm in the Human opponent's territory, seen by the Undead.
    const lost = fixture("UNDEAD", "ORIGINAL", "OPPONENT");
    const first = open(lost);
    first.host.callbacks?.onSelection({ kind: "TILE", at: lost.farm });
    expect(dockTitle()).toBe("Farm");
    expect(document.querySelector(".v7-building-flavour")).toBeNull();
    first.app.destroy();
    document.body.innerHTML = '<div id="app"></div>';
    // A Human viewer looking at the Undead opponent's Farm sees a Graveyard.
    const theirs = fixture("ORIGINAL", "UNDEAD", "OPPONENT");
    const second = open(theirs);
    second.host.callbacks?.onSelection({ kind: "TILE", at: theirs.farm });
    expect(dockTitle()).toBe("Graveyard");
    expect(required(".v7-building-flavour").textContent).toContain(
      "Counts as a Farm.",
    );
    second.app.destroy();
  });

  it("names the viewer's build buttons as its faction has the buildings", () => {
    const data = fixture("UNDEAD", "ORIGINAL");
    const { app, host } = open(data);
    host.callbacks?.onSelection({ kind: "TILE", at: data.site });
    expect(actionLabels()).toEqual(
      expect.arrayContaining(["Graveyard", "Bone Mill", "Forge"]),
    );
    expect(actionLabels()).not.toContain("Farm");
    expect(actionLabels()).not.toContain("Windmill");
    const graveyard = required<HTMLButtonElement>(
      '[data-action="command-build_farm"]',
    );
    expect(graveyard.title).toBe(
      "Graveyard · Quiet plots, tended for later. Counts as a Farm.",
    );
    expect(graveyard.dataset.factionBuilding).toBe("true");
    const forge = required<HTMLButtonElement>(
      '[data-action="command-build_forge"]',
    );
    expect(forge.title).toBe("Forge");
    expect(forge.dataset.factionBuilding).toBeUndefined();
    app.destroy();
  });

  it("keeps a match without such a faction exactly as it was", () => {
    const data = fixture("ORIGINAL", "GOBLIN");
    const { app, host } = open(data);
    host.callbacks?.onSelection({ kind: "TILE", at: data.farm });
    expect(dockTitle()).toBe("Farm");
    expect(document.querySelector(".v7-building-flavour")).toBeNull();
    host.callbacks?.onSelection({ kind: "TILE", at: data.site });
    expect(actionLabels()).toEqual(
      expect.arrayContaining(["Farm", "Windmill", "Forge"]),
    );
    expect(document.querySelector("[data-faction-building]")).toBeNull();
    required<HTMLButtonElement>('[data-action="compact-menu"]').click();
    required<HTMLButtonElement>('[data-action="help"]').click();
    expect(required(".v7-help-tips").textContent).not.toContain(
      FACTION_BUILDINGS_HELP_V7,
    );
    app.destroy();
  });

  it("mentions it once in the Help of a match that has such a faction", () => {
    const data = fixture("ORIGINAL", "UNDEAD");
    const { app } = open(data);
    required<HTMLButtonElement>('[data-action="compact-menu"]').click();
    required<HTMLButtonElement>('[data-action="help"]').click();
    const tips = [...document.querySelectorAll(".v7-help-tips li")].map(
      (node) => node.textContent,
    );
    expect(
      tips.filter((tip) => tip === FACTION_BUILDINGS_HELP_V7),
    ).toHaveLength(1);
    expect(FACTION_BUILDINGS_HELP_V7).toBe(
      "Some buildings look and are named differently in a faction's territory (an Undead Farm is a Graveyard). They work the same.",
    );
    app.destroy();
  });
});

class StaticController implements Ruleset7ControllerPortV7 {
  readonly #snapshot: Ruleset7BrowserSnapshot;
  constructor(view: PlayerViewV7, offeredCommands: readonly CommandV7[]) {
    this.#snapshot = {
      phase: "ACTIVE",
      view,
      offeredCommands,
      savedAt: null,
      hasStoredSave: false,
      recovery: null,
      saveWarning: null,
      diagnostic: null,
      transitioning: false,
      ai: {
        active: false,
        fastForward: false,
        policySlices: 0,
        acceptedCommands: 0,
        lastSliceMilliseconds: 0,
        maximumSliceMilliseconds: 0,
      },
    };
  }
  snapshot(): Ruleset7BrowserSnapshot {
    return this.#snapshot;
  }
  subscribe(
    subscriber: (snapshot: Ruleset7BrowserSnapshot) => void,
  ): () => void {
    subscriber(this.#snapshot);
    return () => undefined;
  }
  subscribeAcceptedBoundary(): () => void {
    return () => undefined;
  }
  readonly launch: Ruleset7ControllerPortV7["launch"] = async () => ({
    ok: false,
    code: "INVALID_SETUP",
    diagnostic: "Static fixture",
  });
  readonly resume: Ruleset7ControllerPortV7["resume"] = async () => false;
  readonly returnToMenu: Ruleset7ControllerPortV7["returnToMenu"] = async () =>
    false;
  readonly dispatch: Ruleset7ControllerPortV7["dispatch"] = async () => ({
    accepted: false,
    reason: "NOT_OFFERED",
  });
  readonly progressAiTurns: Ruleset7ControllerPortV7["progressAiTurns"] =
    async () => ({
      ok: false,
      cancelled: true,
      acceptedCommands: 0,
      diagnostic: "No AI",
    });
  readonly restart: Ruleset7ControllerPortV7["restart"] = async () => ({
    ok: false,
    code: "CONTROLLER_DESTROYED",
    diagnostic: "No restart",
  });
  readonly deleteStoredSave: Ruleset7ControllerPortV7["deleteStoredSave"] =
    async () => false;
  readonly setFastForward: Ruleset7ControllerPortV7["setFastForward"] =
    () => {};
  readonly exportSafeLog: Ruleset7ControllerPortV7["exportSafeLog"] = () =>
    null;
  readonly exportDebugBundle: Ruleset7ControllerPortV7["exportDebugBundle"] =
    () => ({ ok: false, reason: "NO_ACTIVE_MATCH" });
}

class RecordingBoardHost implements BoardHostV7 {
  callbacks: BoardHostCallbacksV7 | null = null;
  lastModel: BoardHostModelV7 | null = null;
  mount(container: HTMLElement, callbacks: BoardHostCallbacksV7): void {
    this.callbacks = callbacks;
    container.append(document.createElement("canvas"));
  }
  update(model: BoardHostModelV7): void {
    this.lastModel = model;
  }
  activate(): void {}
  zoom(): void {}
  focus(): void {}
  async presentBoundary(): Promise<void> {}
  finishPresentations(): void {}
  destroy(): void {}
}

function required<T extends Element = HTMLElement>(selector: string): T {
  const node = document.querySelector<T>(selector);
  if (node === null) throw new Error(`Missing ${selector}`);
  return node;
}
