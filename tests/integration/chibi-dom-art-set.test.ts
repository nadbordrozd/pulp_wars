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
import type { StorageAdapter } from "../../src/persistence/index";
import {
  UNDEAD_SHOWCASE_V7,
  undeadShowcaseFixtureV7,
  undeadUiArenaV7,
} from "../fixtures/v7-undead-ui";
import {
  GOBLIN_SHOWCASE_V7,
  goblinShowcaseFixtureV7,
} from "../fixtures/v7-goblin-ui";
import {
  DINOSAUR_SHOWCASE_V7,
  dinosaurCityFixtureV7,
  dinosaurShowcaseFixtureV7,
} from "../fixtures/v7-dinosaur-ui";
import { FACTION_COLOURS_V7 } from "../../src/render/canvas/faction-colours-v7";

/**
 * The fake recolour encodes the owner colour; since bead pulp_wars-b5f.4 it
 * is the owner faction's colour.
 */
function recoloured(faction: keyof typeof FACTION_COLOURS_V7): string {
  const hex = Number.parseInt(FACTION_COLOURS_V7[faction].slice(1), 16);
  return `data:image/test;${(hex >> 16) & 255},${(hex >> 8) & 255},${hex & 255}`;
}

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
  settingsStorage: StorageAdapter | null = null,
) {
  document.body.innerHTML = '<div id="app"></div>';
  const host = new Host();
  const root = document.querySelector<HTMLElement>("#app");
  if (root === null) throw new Error("#app missing");
  const app = new Ruleset7DomAppView(document, root, port(snapshot), {
    boardHost: host,
    settingsStorage,
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
    // The Necromancer of the new direction (bead pulp_wars-3tq.12): fixed
    // faction colours, so the master is shown and nothing is recoloured to
    // the owner (the fixture paints every master in the key colour).
    expect(image?.dataset.chibiAssetId).toBe(
      "chibi-direction-undead-necromancer",
    );
    expect(image?.getAttribute("src")).toBe("data:image/test;216,38,44");
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
    // The ninth unit (`pulp_wars-w49.17`): the Wight has no art yet, so
    // its card shows the Skeleton's portrait with the faction badge that
    // marks a stand-in; no other card has the badge.
    const badged = [
      ...document.querySelectorAll<HTMLElement>(".v7-train-action"),
    ].filter((action) => action.querySelector(".v7-undead-badge") !== null);
    expect(badged).toHaveLength(1);
    expect(badged[0]?.textContent).toContain("Wight");
    for (const icon of document.querySelectorAll<HTMLImageElement>(
      ".v7-economy-icon",
    ))
      expect(icon.dataset.artSet).toBe("chibi");
    document.querySelector<HTMLButtonElement>('[data-action="tech"]')?.click();
    const cards = [
      ...document.querySelectorAll<HTMLElement>(".v7-tech-card .v7-tech-art"),
    ];
    expect(cards).toHaveLength(25);
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
    // Only the captain's map rasters fail (the new direction's and the
    // default one): the dock keeps its legacy sprite while the command icons
    // stay chibi.
    const partial = mount(humanArena(), "CHIBI", environment("-captain."));
    partial.select({ x: 7, y: 7 });
    expect(artList(".v7-identity-art img")).toEqual([
      "legacy:unit-original-captain-v7r10",
    ]);
    expect(artList(".v7-context-action > .v7-art-frame")).toContain(
      "chibi:ICON:ACTION:WAIT",
    );
    partial.app.destroy();
  });
  it("draws the new direction's Human art by default, falls back per piece, and leaves the other factions' art alone (pulp_wars-3tq.6)", () => {
    const identity = (): HTMLImageElement | null =>
      document.querySelector<HTMLImageElement>(".v7-identity-art img");
    const assetIds = (selector: string): (string | undefined)[] =>
      [...document.querySelectorAll<HTMLImageElement>(selector)].map(
        (image) => image.dataset.chibiAssetId,
      );
    // A Human unit shows the direction's sprite, as authored: fixed colours,
    // so the master is used and nothing is recoloured to the owner.
    const human = mount(humanArena(), "CHIBI");
    human.select({ x: 7, y: 7 });
    expect(identity()?.dataset.chibiAssetId).toBe("chibi-direction-captain");
    expect(identity()?.getAttribute("src")).toBe("data:image/test;216,38,44");
    human.selectCapital();
    const trained = assetIds(".v7-action-card img, .v7-selection-dock img");
    expect(trained).toContain("chibi-direction-portrait-fighter");
    expect(trained).toContain("chibi-direction-city-1");
    human.app.destroy();
    // A direction raster that fails to load falls back to the classic
    // asset of that piece alone, in the owner's colour.
    const failing = mount(
      humanArena(),
      "CHIBI",
      environment("chibi-direction-captain."),
    );
    failing.select({ x: 7, y: 7 });
    expect(identity()?.dataset.chibiAssetId).toBe("chibi-captain");
    expect(identity()?.getAttribute("src")).toBe(recoloured("ORIGINAL"));
    failing.select({ x: 9, y: 7 });
    expect(identity()?.dataset.chibiAssetId).toBe("chibi-direction-fighter");
    failing.app.destroy();
    // Undead units, portraits, command icons and cities are converted too
    // (bead pulp_wars-3tq.12): they resolve to the direction's Undead art,
    // never to its Human art.
    const undead = mount(undeadShowcaseFixtureV7(), "CHIBI");
    undead.select(UNDEAD_SHOWCASE_V7.necromancer);
    expect(identity()?.dataset.chibiAssetId).toBe(
      "chibi-direction-undead-necromancer",
    );
    expect(identity()?.getAttribute("src")).toBe("data:image/test;216,38,44");
    expect(assetIds(".v7-selection-dock img")).toContain(
      "chibi-direction-icon-action-raise-dead",
    );
    undead.selectCapital();
    const undeadArt = assetIds(".v7-action-card img, .v7-selection-dock img");
    expect(undeadArt.length).toBeGreaterThan(0);
    const directed = undeadArt.filter(
      (id) =>
        id !== undefined &&
        id.startsWith("chibi-direction-") &&
        (id.includes("portrait") || id.includes("city")),
    );
    expect(directed.length).toBeGreaterThan(0);
    expect(directed.every((id) => id?.includes("undead") === true)).toBe(true);
    expect(undeadArt).toContain("chibi-direction-undead-city-1");
    expect(undeadArt).not.toContain("chibi-undead-city-1");
    undead.app.destroy();
    // An Undead direction raster that fails to load falls back to the
    // classic Undead asset of that piece, in the owner's colour.
    const failingUndead = mount(
      undeadShowcaseFixtureV7(),
      "CHIBI",
      environment("chibi-direction-undead-necromancer."),
    );
    failingUndead.select(UNDEAD_SHOWCASE_V7.necromancer);
    expect(identity()?.dataset.chibiAssetId).toBe("chibi-undead-necromancer");
    expect(identity()?.getAttribute("src")).toBe(recoloured("UNDEAD"));
    failingUndead.app.destroy();
    // The developer option returns the interface to the previous art.
    const classicStorage = {
      getItem: (key: string) =>
        key === "pulpWars.ruleset7.boardClassicLook.v1"
          ? '{"classic":true}'
          : null,
      setItem: () => undefined,
      removeItem: () => undefined,
    };
    const classic = mount(
      humanArena(),
      "CHIBI",
      environment(),
      undefined,
      classicStorage,
    );
    classic.select({ x: 7, y: 7 });
    expect(identity()?.dataset.chibiAssetId).toBe("chibi-captain");
    expect(identity()?.getAttribute("src")).toBe(recoloured("ORIGINAL"));
    classic.app.destroy();
    // The classic look keeps the classic Undead art, in the owner's colour.
    const classicUndead = mount(
      undeadShowcaseFixtureV7(),
      "CHIBI",
      environment(),
      undefined,
      classicStorage,
    );
    classicUndead.select(UNDEAD_SHOWCASE_V7.necromancer);
    expect(identity()?.dataset.chibiAssetId).toBe("chibi-undead-necromancer");
    expect(identity()?.getAttribute("src")).toBe(recoloured("UNDEAD"));
    classicUndead.selectCapital();
    const classicArt = assetIds(".v7-action-card img, .v7-selection-dock img");
    expect(classicArt).toContain("chibi-undead-city-1");
    expect(
      classicArt.filter((id) => id?.startsWith("chibi-direction-") === true),
    ).toEqual([]);
    classicUndead.app.destroy();
  });

  it("draws the Goblin direction art by default, the classic Goblin art in the Classic look and LEGACY art in LEGACY, and falls back per piece (pulp_wars-3tq.9)", () => {
    const identity = (): HTMLImageElement | null =>
      document.querySelector<HTMLImageElement>(".v7-identity-art img");
    const assetIds = (selector: string): (string | undefined)[] =>
      [...document.querySelectorAll<HTMLImageElement>(selector)].map(
        (image) => image.dataset.chibiAssetId,
      );
    // A Goblin unit shows the direction's sprite as authored: fixed colours,
    // so the master is used and nothing is recoloured to the owner.
    const goblin = mount(goblinShowcaseFixtureV7(), "CHIBI");
    for (const [at, id] of [
      [GOBLIN_SHOWCASE_V7.kaboom, "chibi-direction-goblin-goblin"],
      [GOBLIN_SHOWCASE_V7.warboss, "chibi-direction-goblin-orc-warboss"],
      [GOBLIN_SHOWCASE_V7.troll, "chibi-direction-goblin-troll"],
      [GOBLIN_SHOWCASE_V7.scrapBuggy, "chibi-direction-goblin-scrap-buggy"],
      [GOBLIN_SHOWCASE_V7.rocketCart, "chibi-direction-goblin-rocket-cart"],
      [GOBLIN_SHOWCASE_V7.bombChucker, "chibi-direction-goblin-bomb-chucker"],
    ] as const) {
      goblin.select(at);
      expect(identity()?.dataset.chibiAssetId, id).toBe(id);
      expect(identity()?.getAttribute("src"), id).toBe(
        "data:image/test;216,38,44",
      );
      // Its own faction art: no stand-in badge.
      expect(document.querySelector(".v7-identity-art .v7-goblin-badge")).toBe(
        null,
      );
    }
    // The Human rival keeps the Human direction art.
    goblin.select(GOBLIN_SHOWCASE_V7.enemyFighter);
    expect(identity()?.dataset.chibiAssetId).toBe("chibi-direction-fighter");
    // The technology tree's unit cards are the Goblin direction sprites.
    document.querySelector<HTMLButtonElement>('[data-action="tech"]')?.click();
    expect(
      document.querySelector<HTMLImageElement>('[data-action="tech-drill"] img')
        ?.dataset.chibiAssetId,
    ).toBe("chibi-direction-goblin-orc-brute");
    goblin.app.destroy();
    // The city dock and its training cards (a fresh Goblin capital with
    // room to train): the Goblin city and portraits, never the Human ones.
    const arena = () =>
      undeadUiArenaV7(
        [{ seat: 0, role: "CAPTAIN", at: { x: 7, y: 7 } }],
        [],
        ["GOBLIN", "ORIGINAL"],
      );
    const city = mount(arena(), "CHIBI");
    city.selectCapital();
    const cityArt = assetIds(".v7-action-card img, .v7-selection-dock img");
    expect(
      cityArt.filter((id) => id?.startsWith("chibi-direction-goblin-city-")),
    ).not.toEqual([]);
    const portraits = cityArt.filter((id) => id?.includes("portrait"));
    expect(portraits.length).toBeGreaterThan(0);
    for (const id of portraits)
      expect(id).toMatch(/^chibi-direction-portrait-goblin-/);
    expect(cityArt).not.toContain("chibi-direction-city-1");
    expect(cityArt.filter((id) => id?.startsWith("chibi-goblin-"))).toEqual([]);
    city.app.destroy();

    // A direction raster that fails to load falls back to the classic
    // Goblin sprite of that piece alone, in the owner's colour.
    const failing = mount(
      goblinShowcaseFixtureV7(),
      "CHIBI",
      environment("chibi-direction-goblin-goblin."),
    );
    failing.select(GOBLIN_SHOWCASE_V7.kaboom);
    expect(identity()?.dataset.chibiAssetId).toBe("chibi-goblin-goblin");
    expect(identity()?.getAttribute("src")).toBe(recoloured("GOBLIN"));
    failing.select(GOBLIN_SHOWCASE_V7.troll);
    expect(identity()?.dataset.chibiAssetId).toBe(
      "chibi-direction-goblin-troll",
    );
    failing.app.destroy();

    // The developer option returns the interface to the previous art.
    const classic = mount(arena(), "CHIBI", environment(), undefined, {
      getItem: (key: string) =>
        key === "pulpWars.ruleset7.boardClassicLook.v1"
          ? '{"classic":true}'
          : null,
      setItem: () => undefined,
      removeItem: () => undefined,
    });
    classic.select({ x: 7, y: 7 });
    expect(identity()?.dataset.chibiAssetId).toBe("chibi-goblin-orc-warboss");
    expect(identity()?.getAttribute("src")).toBe(recoloured("GOBLIN"));
    classic.selectCapital();
    const classicArt = assetIds(".v7-action-card img, .v7-selection-dock img");
    expect(
      classicArt.filter((id) => id?.startsWith("chibi-direction-goblin-")),
    ).toEqual([]);
    expect(
      classicArt.filter((id) => id?.startsWith("chibi-goblin-city-")),
    ).not.toEqual([]);
    classic.app.destroy();

    // LEGACY never draws any of it.
    const legacy = mount(goblinShowcaseFixtureV7(), "LEGACY");
    legacy.select(GOBLIN_SHOWCASE_V7.kaboom);
    expect(document.body.innerHTML).not.toContain("chibi-direction-goblin");
    expect(document.body.innerHTML).not.toContain("v7-chibi-art");
    legacy.app.destroy();
  });

  it("draws the Goblin Kaboom! and WAAAGH! command icons in CHIBI and keeps the code-drawn bomb in LEGACY", () => {
    const bomb = () =>
      document.querySelector(
        '[data-action="command-kaboom"] svg[data-icon="bomb"]',
      );
    const legacy = mount(goblinShowcaseFixtureV7(), "LEGACY");
    legacy.select(GOBLIN_SHOWCASE_V7.kaboom);
    expect(bomb()).not.toBeNull();
    expect(document.body.innerHTML).not.toContain("v7-chibi-art");
    legacy.select(GOBLIN_SHOWCASE_V7.warboss);
    expect(artList(".v7-context-action > .v7-art-frame")).not.toContain(
      "chibi:ICON:ACTION:GOBLIN:RALLY",
    );
    legacy.app.destroy();

    const chibi = mount(goblinShowcaseFixtureV7(), "CHIBI");
    chibi.select(GOBLIN_SHOWCASE_V7.kaboom);
    expect(artList(".v7-context-action > .v7-art-frame")).toContain(
      "chibi:ICON:ACTION:KABOOM",
    );
    // The PixelLab bomb replaces the vector Kaboom! glyph.
    expect(bomb()).toBeNull();
    chibi.select(GOBLIN_SHOWCASE_V7.warboss);
    expect(artList(".v7-context-action > .v7-art-frame")).toContain(
      "chibi:ICON:ACTION:GOBLIN:RALLY",
    );
    expect(
      document.querySelector<HTMLImageElement>(
        '[data-action="command-rally"] img',
      )?.dataset.chibiAssetId,
    ).toBe("chibi-icon-action-goblin-rally");
    chibi.app.destroy();

    // Without its raster, Kaboom! keeps its vector bomb and WAAAGH! falls
    // back to the Human Rally horn.
    const failing = mount(
      goblinShowcaseFixtureV7(),
      "CHIBI",
      environment("chibi-icon-action-goblin-rally."),
    );
    failing.select(GOBLIN_SHOWCASE_V7.warboss);
    expect(
      document.querySelector<HTMLImageElement>(
        '[data-action="command-rally"] img',
      )?.dataset.chibiAssetId,
    ).toBe("chibi-icon-action-rally");
    failing.app.destroy();
    const noBomb = mount(
      goblinShowcaseFixtureV7(),
      "CHIBI",
      environment("chibi-icon-action-kaboom."),
    );
    noBomb.select(GOBLIN_SHOWCASE_V7.kaboom);
    expect(bomb()).not.toBeNull();
    noBomb.app.destroy();
  });

  it("draws the Dinosaur direction art by default: units, Eggs, lay cards and the city, the classic art in the Classic look, and falls back per piece (pulp_wars-3tq.13)", () => {
    const KEY = "data:image/test;216,38,44";
    const RECOLOURED = recoloured("DINOSAUR");
    const identity = (): HTMLImageElement | null =>
      document.querySelector<HTMLImageElement>(".v7-identity-art img");
    const assetIds = (selector: string): (string | undefined)[] =>
      [...document.querySelectorAll<HTMLImageElement>(selector)].map(
        (image) => image.dataset.chibiAssetId,
      );
    // A Dinosaur unit shows the direction's sprite as authored: fixed
    // colours, so the master is used and nothing is recoloured to the owner.
    const dinosaur = mount(dinosaurShowcaseFixtureV7(), "CHIBI");
    for (const [at, id] of [
      [
        DINOSAUR_SHOWCASE_V7.triceratops,
        "chibi-direction-dinosaur-triceratops",
      ],
      [DINOSAUR_SHOWCASE_V7.laneCaveman, "chibi-direction-dinosaur-caveman"],
      [DINOSAUR_SHOWCASE_V7.shaman, "chibi-direction-dinosaur-shaman"],
      [DINOSAUR_SHOWCASE_V7.bigRaptor, "chibi-direction-dinosaur-raptor"],
      [DINOSAUR_SHOWCASE_V7.alphaTRex, "chibi-direction-dinosaur-t-rex"],
      [DINOSAUR_SHOWCASE_V7.spitter, "chibi-direction-dinosaur-spitter"],
      [
        DINOSAUR_SHOWCASE_V7.ankylosaurus,
        "chibi-direction-dinosaur-ankylosaurus",
      ],
      [
        DINOSAUR_SHOWCASE_V7.brontosaurus,
        "chibi-direction-dinosaur-brontosaurus",
      ],
      // An Egg's dock: the new Egg, whatever unit is inside.
      [DINOSAUR_SHOWCASE_V7.tRexEgg, "chibi-direction-dinosaur-egg"],
      [DINOSAUR_SHOWCASE_V7.damagedEgg, "chibi-direction-dinosaur-egg"],
    ] as const) {
      dinosaur.select(at);
      expect(identity()?.dataset.chibiAssetId, id).toBe(id);
      expect(identity()?.getAttribute("src"), id).toBe(KEY);
      // Its own faction art: no stand-in badge, and no code-drawn Egg.
      expect(
        document.querySelector(".v7-identity-art .v7-dinosaur-badge"),
        id,
      ).toBeNull();
      expect(document.querySelector(".v7-egg-figure"), id).toBeNull();
    }
    // The Human rival keeps the Human direction art.
    dinosaur.select(DINOSAUR_SHOWCASE_V7.pushTarget);
    expect(identity()?.dataset.chibiAssetId).toBe("chibi-direction-juggernaut");
    dinosaur.app.destroy();

    // The city dock and its Lay Egg cards: the Dinosaur camp and portraits.
    const city = mount(dinosaurCityFixtureV7(), "CHIBI");
    city.selectCapital();
    const cityArt = assetIds(".v7-action-card img, .v7-selection-dock img");
    expect(cityArt).toContain("chibi-direction-dinosaur-city-1");
    expect(cityArt).not.toContain("chibi-dinosaur-city-1");
    const directed = cityArt.filter(
      (id) =>
        id?.startsWith("chibi-direction-") === true && /portrait|city/.test(id),
    );
    expect(directed.length).toBeGreaterThan(1);
    expect(directed.every((id) => id?.includes("dinosaur") === true)).toBe(
      true,
    );
    expect(
      cityArt.filter((id) => id?.startsWith("chibi-portrait-") === true),
    ).toEqual([]);
    city.app.destroy();

    // A Dinosaur direction raster that fails to load falls back to the
    // classic Dinosaur asset of that piece, in the owner's colour.
    const failing = mount(
      dinosaurShowcaseFixtureV7(),
      "CHIBI",
      environment("chibi-direction-dinosaur-shaman."),
    );
    failing.select(DINOSAUR_SHOWCASE_V7.shaman);
    expect(identity()?.dataset.chibiAssetId).toBe("chibi-dinosaur-shaman");
    expect(identity()?.getAttribute("src")).toBe(RECOLOURED);
    failing.select(DINOSAUR_SHOWCASE_V7.spitter);
    expect(identity()?.dataset.chibiAssetId).toBe(
      "chibi-direction-dinosaur-spitter",
    );
    failing.app.destroy();

    // The classic look keeps the classic Dinosaur art, in the owner's
    // colour; LEGACY has no chibi art at all.
    const classicStorage = {
      getItem: (key: string) =>
        key === "pulpWars.ruleset7.boardClassicLook.v1"
          ? '{"classic":true}'
          : null,
      setItem: () => undefined,
      removeItem: () => undefined,
    };
    const classic = mount(
      dinosaurShowcaseFixtureV7(),
      "CHIBI",
      environment(),
      undefined,
      classicStorage,
    );
    classic.select(DINOSAUR_SHOWCASE_V7.alphaTRex);
    expect(identity()?.dataset.chibiAssetId).toBe("chibi-dinosaur-t-rex");
    expect(identity()?.getAttribute("src")).toBe(RECOLOURED);
    classic.select(DINOSAUR_SHOWCASE_V7.tRexEgg);
    expect(identity()?.dataset.chibiAssetId).toBe("chibi-dinosaur-egg");
    expect(identity()?.getAttribute("src")).toBe(RECOLOURED);
    classic.app.destroy();
    const legacy = mount(dinosaurShowcaseFixtureV7(), "LEGACY");
    legacy.select(DINOSAUR_SHOWCASE_V7.tRexEgg);
    expect(document.body.innerHTML).not.toContain("chibi-direction-dinosaur");
    expect(document.body.innerHTML).not.toContain("v7-chibi-art");
    expect(document.querySelector(".v7-egg-figure")).not.toBeNull();
    legacy.app.destroy();
  });
});
