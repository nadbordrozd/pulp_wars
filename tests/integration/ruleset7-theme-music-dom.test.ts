// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { bootstrapRuleset7App } from "../../src/app/index";
import {
  SOUND_THEMES_V1,
  THEME_MUSIC_PUBLIC_PATH_V1,
  type SoundKeyV1,
} from "../../src/audio/index";
import type {
  BoardHostModelV7,
  BoardHostV7,
} from "../../src/render/canvas/board-host-v7";
import {
  installFakeAudioContext,
  uninstallFakeAudioContext,
  type FakeAudioDeviceV1,
} from "../fixtures/fake-audio-context";
import { RecordingBoardHost } from "../fixtures/v7-dom-rig";

/**
 * Where the themes play (bead pulp_wars-2yc.27, docs/ui/SOUND.md "Where
 * the themes play"), in the interface: the title theme on the menu and its
 * screens, the chosen faction's on New game, the viewer's own faction's
 * for a match and its end, the title theme again back on the menu, and
 * nothing fetched before the first gesture. A stand-in device and `fetch`
 * take the place of the browser's.
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

const THEME_SECONDS = 30;
const TITLE = "theme.title";

let app: ReturnType<typeof bootstrapRuleset7App> | null = null;
let device: FakeAudioDeviceV1;
let fetched: string[] = [];

function mount(): ReturnType<typeof bootstrapRuleset7App> {
  document.body.innerHTML = '<div id="app"></div>';
  app = bootstrapRuleset7App(document, {
    boardHost: new Host(),
    randomSeed: () => 7,
    settingsStorage: window.localStorage,
    galleryDemoHost: () => new RecordingBoardHost(),
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

async function waitUntil(predicate: () => boolean): Promise<void> {
  for (let index = 0; index < 400; index += 1) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  throw new Error("Condition not reached");
}

async function settle(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

function themeUrl(id: string): string {
  const source = SOUND_THEMES_V1.find((theme) => theme.id === id)?.source;
  if (source?.kind !== "FILE") throw new Error(`${id} has no file`);
  return source.url;
}

function themesFetched(): string[] {
  return fetched.filter((url) => url.includes(THEME_MUSIC_PUBLIC_PATH_V1));
}

function chooseFaction(faction: string): void {
  const field = required<HTMLSelectElement>(
    "[data-v7-front='setup'] #v7-faction-0",
  );
  field.value = faction;
  field.dispatchEvent(new Event("change", { bubbles: true }));
}

beforeEach(() => {
  window.localStorage.clear();
  fetched = [];
  vi.stubGlobal(
    "fetch",
    vi.fn((url: string) => {
      fetched.push(url);
      return Promise.resolve({
        ok: true,
        status: 200,
        arrayBuffer: () =>
          Promise.resolve(
            new TextEncoder().encode(
              url.includes(THEME_MUSIC_PUBLIC_PATH_V1) ? "THEME" : "CLIP",
            ).buffer,
          ),
      });
    }),
  );
  device = installFakeAudioContext(window, {
    decode: (data) =>
      new TextDecoder().decode(data) === "THEME" ? THEME_SECONDS : 0.4,
  });
});

afterEach(() => {
  app?.destroy();
  app = null;
  vi.unstubAllGlobals();
  uninstallFakeAudioContext(window);
});

describe("theme music in the interface", () => {
  it("asks for nothing before a gesture, then starts the title theme", async () => {
    const mounted = mount();
    await settle();
    const audio = mounted.view.audio;
    // The menu knows its theme, and nothing was fetched or decoded for it.
    expect(audio.music).toMatchObject({
      scene: TITLE,
      wanted: null,
      player: null,
      requests: [],
    });
    expect(themesFetched()).toEqual([]);
    expect(device.contexts()).toBe(0);
    expect(device.decodes()).toBe(0);
    // The first key press (or click) anywhere is the gesture.
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown" }));
    await settle();
    expect(device.contexts()).toBe(1);
    expect(themesFetched()).toEqual([themeUrl(TITLE)]);
    expect(audio.music).toMatchObject({ scene: TITLE, wanted: TITLE });
    expect(audio.music.player).toMatchObject({
      playing: TITLE,
      heldBuffers: 1,
    });
    // It plays through the music's gain, at the Music level.
    const theme = device.sources.find(
      (source) => source.seconds === THEME_SECONDS,
    );
    expect(theme?.stopped).toBe(false);
    expect(theme?.levelAt(1)).toBeGreaterThan(0);
    expect(device.musicGain()).toBeCloseTo(0.49, 6);
  });

  it("keeps the title theme through the menu's screens", async () => {
    const mounted = mount();
    const audio = mounted.view.audio;
    const scenes: (SoundKeyV1 | null)[] = [];
    for (const [open, close] of [
      ["new-game", "front-back"],
      ["campaign", "front-back"],
      ["front-settings", "front-back"],
      ["gallery", "gallery-back"],
    ] as const) {
      press(open);
      scenes.push(audio.music.scene);
      press(close);
      scenes.push(audio.music.scene);
    }
    expect(scenes).toEqual(Array.from({ length: 8 }, () => TITLE));
    await settle();
    // One theme, fetched once, played once: no screen started it again.
    expect(themesFetched()).toEqual([themeUrl(TITLE)]);
    expect(
      device.sources.filter((source) => source.seconds === THEME_SECONDS),
    ).toHaveLength(1);
  });

  it("is silent on the Gallery's Sounds tab and returns on the others", () => {
    const mounted = mount();
    const audio = mounted.view.audio;
    press("gallery");
    expect(audio.music.scene).toBe(TITLE);
    press("gallery-tab-sounds");
    expect(audio.music).toMatchObject({ scene: null, wanted: null });
    press("gallery-tab-units");
    expect(audio.music).toMatchObject({ scene: TITLE, wanted: TITLE });
    // Left on the Sounds tab, the Gallery is silent when it opens again.
    press("gallery-tab-sounds");
    press("gallery-back");
    expect(audio.music.scene).toBe(TITLE);
    press("gallery");
    expect(audio.music.scene).toBeNull();
  });

  it("previews the faction chosen on New game, one theme at a time", async () => {
    const mounted = mount();
    const audio = mounted.view.audio;
    press("new-game");
    // Until the player chooses, the title theme plays on.
    expect(audio.music.scene).toBe(TITLE);
    chooseFaction("GOBLIN");
    expect(audio.music).toMatchObject({
      scene: "theme.goblin",
      wanted: "theme.goblin",
    });
    chooseFaction("UNDEAD");
    chooseFaction("CANDY");
    expect(audio.music.scene).toBe("theme.candy");
    await settle();
    // Previews never stack: only the last choice is heard.
    expect(audio.music.player).toMatchObject({ playing: "theme.candy" });
    expect(audio.music.player?.heldBuffers).toBeLessThanOrEqual(2);
    // An opponent's faction is not a preview.
    const other = required<HTMLSelectElement>(
      "[data-v7-front='setup'] #v7-faction-1",
    );
    other.value = "MARTIAN";
    other.dispatchEvent(new Event("change", { bubbles: true }));
    expect(audio.music.scene).toBe("theme.candy");
    // Back on the menu the title theme returns, and New game starts with
    // it again.
    press("front-back");
    expect(audio.music.scene).toBe(TITLE);
    press("new-game");
    expect(audio.music.scene).toBe(TITLE);
  });

  it("plays the viewer's faction theme for a match, then the title theme again", async () => {
    const mounted = mount();
    const audio = mounted.view.audio;
    press("new-game");
    chooseFaction("GOBLIN");
    await settle();
    press("launch");
    await waitUntil(() => mounted.controller.snapshot().phase === "ACTIVE");
    expect(mounted.controller.snapshot().view?.viewer.faction).toBe("GOBLIN");
    expect(audio.music).toMatchObject({
      scene: "theme.goblin",
      wanted: "theme.goblin",
    });
    await settle();
    // The theme chosen on New game plays on into the match: one fetch.
    expect(themesFetched()).toEqual([
      themeUrl(TITLE),
      themeUrl("theme.goblin"),
    ]);
    expect(audio.music.player).toMatchObject({ playing: "theme.goblin" });
    // The match's own screens do not change it.
    press("compact-menu");
    press("settings");
    expect(audio.music.scene).toBe("theme.goblin");
    expect(document.querySelector("#v7-music-volume")).not.toBeNull();
    // Save & quit: the title theme takes over.
    press("close-overlay");
    if (document.querySelector('[data-action="main-menu"]') === null)
      press("compact-menu");
    press("main-menu");
    await waitUntil(() => mounted.controller.snapshot().phase !== "ACTIVE");
    expect(audio.music).toMatchObject({ scene: TITLE, wanted: TITLE });
    await settle();
    expect(themesFetched().at(-1)).toBe(themeUrl(TITLE));
    expect(audio.music.player).toMatchObject({ playing: TITLE });
  });

  it("gives another faction's match that faction's theme", async () => {
    const mounted = mount();
    press("new-game");
    chooseFaction("UNDEAD");
    press("launch");
    await waitUntil(() => mounted.controller.snapshot().phase === "ACTIVE");
    expect(mounted.view.audio.music.scene).toBe("theme.undead");
    await settle();
    expect(mounted.view.audio.music.player).toMatchObject({
      playing: "theme.undead",
    });
    expect(themesFetched()).not.toContain(themeUrl("theme.goblin"));
  });
});
