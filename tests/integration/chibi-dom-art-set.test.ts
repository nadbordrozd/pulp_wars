// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";
import {
  queryPlayerCommandsV7,
  viewForV7,
  type CoordV7,
  type GameStateV7,
} from "../../src/engine/index";
import type { Ruleset7BrowserSnapshot } from "../../src/app/index";
import type {
  BoardHostCallbacksV7,
  BoardHostModelV7,
  BoardHostV7,
} from "../../src/render/canvas/board-host-v7";
import {
  Ruleset7DomAppView,
  type Ruleset7ControllerPortV7,
} from "../../src/render/dom/app-view-v7";
import type { ChibiDomEnvironmentV7 } from "../../src/render/dom/chibi-dom-art-v7";
import type { ArtSetV7 } from "../../src/assets/chibi-art-v7";
import {
  UNDEAD_SHOWCASE_V7,
  undeadShowcaseFixtureV7,
  undeadUiArenaV7,
} from "../fixtures/v7-undead-ui";

/**
 * Rasters settle at once; every master reads back as an opaque 4 x 6 block
 * (so trimming is visible) and every mask as fully opaque. A URL containing
 * a fragment of `failing` fails to load.
 */
function environment(failing = "\u0000"): ChibiDomEnvironmentV7 {
  return {
    loadImage(url, settle) {
      settle(!url.includes(failing));
      return { url } as unknown as CanvasImageSource;
    },
    readPixels(image, width, height) {
      const source = image as unknown as {
        url?: string;
        pixels?: Uint8ClampedArray;
      };
      if (source.pixels !== undefined) return source.pixels;
      const pixels = new Uint8ClampedArray(width * height * 4);
      if (source.url?.endsWith(".mask.png")) pixels.fill(255);
      else
        for (let y = 2; y < 8; y += 1)
          for (let x = 3; x < 7; x += 1)
            pixels.set([216, 38, 44, 255], (y * width + x) * 4);
      return pixels;
    },
    createSurface: (pixels, width, height) =>
      ({ pixels, width, height }) as unknown as CanvasImageSource,
    encode: (surface) => {
      const { pixels } = surface as unknown as { pixels: Uint8ClampedArray };
      return `data:image/test;${pixels[0]},${pixels[1]},${pixels[2]}`;
    },
  };
}

class Host implements BoardHostV7 {
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
  destroy(): void {}
}

function snapshotOf(state: GameStateV7): Ruleset7BrowserSnapshot {
  const view = viewForV7(state, state.humanPlayerId);
  return {
    phase: "ACTIVE",
    view,
    offeredCommands: queryPlayerCommandsV7(view),
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
    } as Ruleset7BrowserSnapshot["ai"],
  };
}

function port(snapshot: Ruleset7BrowserSnapshot): Ruleset7ControllerPortV7 {
  return {
    snapshot: () => snapshot,
    subscribe: (listener: (value: Ruleset7BrowserSnapshot) => void) => {
      listener(snapshot);
      return () => undefined;
    },
    subscribeAcceptedBoundary: () => () => undefined,
  } as unknown as Ruleset7ControllerPortV7;
}

function mount(
  state: GameStateV7,
  artSet: ArtSetV7 | undefined,
  env: ChibiDomEnvironmentV7 = environment(),
  snapshot = snapshotOf(state),
) {
  document.body.innerHTML = '<div id="app"></div>';
  const host = new Host();
  const root = document.querySelector<HTMLElement>("#app");
  if (root === null) throw new Error("#app missing");
  const app = new Ruleset7DomAppView(document, root, port(snapshot), {
    boardHost: host,
    settingsStorage: null,
    ...(artSet === undefined ? {} : { artSet }),
    chibiDomEnvironment: env,
  });
  const select = (at: CoordV7): void => {
    const unit = snapshot.view?.units.find(
      (item) => item.at.x === at.x && item.at.y === at.y,
    );
    if (unit === undefined) throw new Error("unit missing");
    host.callbacks?.onSelection({ kind: "UNIT", unitId: unit.id });
  };
  const selectCapital = (): void => {
    const view = snapshot.view;
    const city = view?.cities.find(
      (entry) => entry.ownerId === view.viewer.id && entry.isCapital,
    );
    if (city === undefined) throw new Error("capital missing");
    host.callbacks?.onSelection({ kind: "CITY", cityId: city.id });
  };
  return { app, select, selectCapital };
}

/** The art of every image in the document: legacy id or chibi subject. */
function artList(selector = "img"): string[] {
  return [...document.querySelectorAll<HTMLImageElement>(selector)].map(
    (image) =>
      image.dataset.chibiSubject !== undefined
        ? `chibi:${image.dataset.chibiSubject}`
        : `legacy:${image.dataset.assetId ?? ""}`,
  );
}

const humanArena = () =>
  undeadUiArenaV7(
    [
      { seat: 0, role: "CAPTAIN", at: { x: 7, y: 7 } },
      { seat: 0, role: "FIGHTER", at: { x: 9, y: 7 } },
      { seat: 1, role: "KNIGHT", at: { x: 4, y: 7 } },
    ],
    [],
    ["ORIGINAL", "UNDEAD"],
  );

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
});

describe("CHIBI art set in the Ruleset 7 DOM", () => {
  it("keeps LEGACY markup free of chibi art, with or without the option", () => {
    const state = undeadShowcaseFixtureV7();
    const surfaces = (artSet: ArtSetV7 | undefined): string => {
      const { app, select, selectCapital } = mount(state, artSet);
      select(UNDEAD_SHOWCASE_V7.necromancer);
      const unit = document.body.innerHTML;
      selectCapital();
      const city = document.body.innerHTML;
      app.destroy();
      return `${unit}\n${city}`;
    };
    const legacy = surfaces("LEGACY");
    expect(surfaces(undefined)).toBe(legacy);
    expect(legacy).not.toContain("v7-chibi-art");
    expect(legacy).not.toContain("data-art-set");
    expect(legacy).toContain('data-asset-id="unit-original-captain-v7r10"');
    expect(legacy).toContain("v7-undead-badge");
  });

  it("draws an Undead unit's own chibi art in the dock and its commands, without the placeholder badge", () => {
    const { app, select } = mount(undeadShowcaseFixtureV7(), "CHIBI");
    select(UNDEAD_SHOWCASE_V7.necromancer);
    const dock = document.querySelector<HTMLElement>(".v7-selection-dock");
    const identity = dock?.querySelector<HTMLElement>(".v7-identity-art");
    expect(identity?.dataset.artSet).toBe("chibi");
    expect(identity?.querySelector(".v7-undead-badge")).toBeNull();
    const image = identity?.querySelector<HTMLImageElement>("img");
    expect(image?.dataset.chibiSubject).toBe("UNIT:UNDEAD:CAPTAIN");
    // Recoloured through the mask with the unit owner's colour (Coral).
    expect(image?.getAttribute("src")).toBe("data:image/test;240,103,98");
    expect(image?.style.width).toBe("1rem");
    expect(image?.style.height).toBe("1.5rem");
    expect(image?.dataset.chibiScale).toBe("4");
    const actions = artList(
      ".v7-selection-dock .v7-context-action > .v7-art-frame",
    );
    expect(actions).toContain("chibi:ICON:ACTION:UNDEAD:RALLY");
    expect(actions).toContain("chibi:ICON:ACTION:RAISE_DEAD");
    // The raster replaces the vector Raise Dead glyph.
    expect(
      document.querySelector(
        '[data-action="command-raise_dead"] .v7-command-icon',
      ),
    ).toBeNull();
    app.destroy();
  });

  it("trains with faction portraits and shows chibi technology cards, rewards and economy icons", () => {
    // A fresh Undead capital with room to train (the showcase's is full).
    const { app, selectCapital } = mount(
      undeadUiArenaV7([{ seat: 0, role: "CAPTAIN", at: { x: 7, y: 7 } }]),
      "CHIBI",
    );
    selectCapital();
    const trains = artList(".v7-train-action > .v7-art-frame");
    expect(trains.length).toBeGreaterThan(0);
    for (const art of trains) expect(art).toMatch(/^chibi:PORTRAIT:UNDEAD:/);
    expect(document.querySelector(".v7-train-action .v7-undead-badge")).toBe(
      null,
    );
    for (const icon of document.querySelectorAll<HTMLImageElement>(
      ".v7-economy-icon",
    ))
      expect(icon.dataset.artSet).toBe("chibi");
    document.querySelector<HTMLButtonElement>('[data-action="tech"]')?.click();
    const cards = [
      ...document.querySelectorAll<HTMLElement>(".v7-tech-card .v7-tech-art"),
    ];
    expect(cards).toHaveLength(23);
    for (const card of cards) expect(card.dataset.artSet).toBe("chibi");
    expect(
      document
        .querySelector('[data-action="tech-drill"] img')
        ?.getAttribute("data-chibi-subject"),
    ).toBe("UNIT:UNDEAD:GUARD");
    app.destroy();

    const human = snapshotOf(humanArena());
    const view = human.view;
    const city = view?.cities.find((entry) => entry.ownerId === view.viewer.id);
    if (view === null || city === undefined) throw new Error("fixture");
    const rewardApp = mount(humanArena(), "CHIBI", environment(), {
      ...human,
      view: {
        ...view,
        pendingChoices: [
          {
            kind: "CITY_REWARD",
            cityId: city.id,
            reachedLevel: 3,
            candidates: ["SURVEY", "MILITIA"],
          },
        ],
      },
      offeredCommands: (["SURVEY", "MILITIA"] as const).map((reward) => ({
        kind: "CHOOSE_CITY_REWARD" as const,
        cityId: city.id,
        reachedLevel: 3,
        reward,
      })),
    });
    expect(artList(".v7-reward-action > .v7-art-frame")).toEqual([
      "chibi:ICON:REWARD:SURVEY",
      "chibi:PORTRAIT:FIGHTER",
    ]);
    rewardApp.app.destroy();
  });

  it("keeps the legacy art per subject when a chibi raster cannot load", () => {
    const legacy = mount(humanArena(), "LEGACY");
    legacy.select({ x: 7, y: 7 });
    const legacyArt = artList();
    legacy.app.destroy();
    // Every chibi raster fails: CHIBI falls back to exactly the legacy art.
    const failing = mount(humanArena(), "CHIBI", environment("/assets/chibi/"));
    failing.select({ x: 7, y: 7 });
    expect(artList()).toEqual(legacyArt);
    failing.app.destroy();
    // Only the captain's map raster fails: the dock keeps its legacy sprite
    // while the command icons stay chibi.
    const partial = mount(humanArena(), "CHIBI", environment("chibi-captain."));
    partial.select({ x: 7, y: 7 });
    expect(artList(".v7-identity-art img")).toEqual([
      "legacy:unit-original-captain-v7r10",
    ]);
    expect(artList(".v7-context-action > .v7-art-frame")).toContain(
      "chibi:ICON:ACTION:WAIT",
    );
    partial.app.destroy();
  });
});
