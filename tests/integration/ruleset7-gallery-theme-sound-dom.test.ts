// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type * as SoundManifestModule from "../../src/audio/sound-manifest";

/**
 * A theme registered in the manifest (bead pulp_wars-2yc.19,
 * docs/ui/SOUND.md "Theme music"), whatever its source. This file
 * registers two of its own in place of the game's nine, one entry each in
 * `SOUND_THEMES_V1`: a recording that cannot be fetched and has a
 * synthesised stand-in, and a synthesised tune that does not loop. Nothing
 * else is changed, and the audio plays them and the Gallery's rows become
 * playable.
 */
vi.mock("../../src/audio/sound-manifest", async (importOriginal) => {
  const original = await importOriginal<typeof SoundManifestModule>();
  const themes: readonly SoundManifestModule.SoundThemeEntryV1[] = [
    {
      id: "theme.undead",
      faction: "UNDEAD",
      loop: true,
      // A recording that cannot be loaded plays its fallback recipe.
      source: {
        kind: "FILE",
        url: "audio/theme-undead.ogg",
        fallback: {
          peak: 0.2,
          layers: [{ wave: "sine", ms: 500, hz: 220 }],
        },
      },
    },
    {
      id: "theme.goblin",
      faction: "GOBLIN",
      loop: false,
      source: {
        kind: "SYNTH",
        recipe: {
          peak: 0.2,
          layers: [{ wave: "triangle", ms: 3000, hz: 330 }],
        },
      },
    },
  ];
  return { ...original, SOUND_THEMES_V1: themes };
});

const { bootstrapRuleset7App } = await import("../../src/app/index");
const { DEFAULT_CATEGORY_GAINS_V1, playableSoundIdsV1, playableSoundV1 } =
  await import("../../src/audio/index");
const { installFakeAudioContext, uninstallFakeAudioContext } =
  await import("../fixtures/fake-audio-context");
const { RecordingBoardHost } = await import("../fixtures/v7-dom-rig");

let app: ReturnType<typeof bootstrapRuleset7App> | null = null;

function required<T extends Element = HTMLElement>(selector: string): T {
  const node = document.querySelector<T>(selector);
  if (node === null) throw new Error(`Missing ${selector}`);
  return node;
}

function playing(): string[] {
  return [
    ...document.querySelectorAll<HTMLElement>(
      '.v7-gallery-sound[data-playing="true"]',
    ),
  ].map((node) => node.dataset.soundRow ?? "");
}

/** Lets a theme's load settle, then moves the timers on. */
async function after(ms: number): Promise<void> {
  await vi.advanceTimersByTimeAsync(ms);
}

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  window.localStorage.clear();
  // The theme's recording is not there: its fallback recipe plays.
  vi.stubGlobal(
    "fetch",
    vi.fn(() => Promise.reject(new Error("offline"))),
  );
});

afterEach(() => {
  app?.destroy();
  app = null;
  vi.useRealTimers();
  vi.unstubAllGlobals();
  uninstallFakeAudioContext(window);
});

describe("a registered faction theme", () => {
  it("is music the audio can play: never detuned, looping when it says so", () => {
    expect(playableSoundIdsV1().slice(-2)).toEqual([
      "theme.undead",
      "theme.goblin",
    ]);
    expect(playableSoundV1("theme.undead")).toMatchObject({
      category: "music",
      priority: 3,
      jitterCents: 0,
      loop: true,
    });
    expect(playableSoundV1("theme.goblin")?.loop).toBe(false);
  });

  it("makes its Gallery row playable, with a stop, while the others wait", async () => {
    vi.useFakeTimers();
    const device = installFakeAudioContext(window);
    app = bootstrapRuleset7App(document, {
      storage: null,
      settingsStorage: window.localStorage,
      galleryDemoHost: () => new RecordingBoardHost(),
    });
    required<HTMLButtonElement>('[data-action="gallery"]').click();
    required<HTMLButtonElement>('[data-action="gallery-tab-sounds"]').click();
    const rows = [
      ...document.querySelectorAll<HTMLElement>(
        '.v7-gallery-sound-group[data-group="themes"] .v7-gallery-sound',
      ),
    ];
    expect(
      rows.map((node) => [node.dataset.faction, node.dataset.pending ?? ""]),
    ).toEqual([
      ["ORIGINAL", "true"],
      ["UNDEAD", ""],
      ["GOBLIN", ""],
      ["DINOSAUR", "true"],
      ["MARTIAN", "true"],
      ["ICE_FOLK", "true"],
      ["DWARF", "true"],
      ["CANDY", "true"],
    ]);
    // A faction without a theme waits: named, focusable, not playable.
    const human = required<HTMLButtonElement>(
      '[data-sound-play="theme:ORIGINAL"]',
    );
    expect(human.getAttribute("aria-label")).toBe(
      "Play: Human theme, coming soon",
    );
    expect(human.getAttribute("aria-disabled")).toBe("true");
    expect(human.disabled).toBe(false);
    expect(human.dataset.soundId).toBeUndefined();
    const undead = required<HTMLButtonElement>(
      '[data-sound-play="theme:UNDEAD"]',
    );
    // A theme's row says where it comes from, like a card's.
    expect(undead.getAttribute("aria-label")).toBe(
      "Play: Undead theme. File: theme-undead.ogg",
    );
    expect(undead.querySelector(".v7-gallery-sound-origin")?.textContent).toBe(
      "theme-undead.ogg",
    );
    expect(
      required('[data-sound-play="theme:GOBLIN"]').getAttribute("aria-label"),
    ).toBe("Play: Goblin theme. Generated");
    expect(undead.getAttribute("aria-disabled")).toBeNull();
    expect(undead.dataset.soundId).toBe("theme.undead");
    expect(undead.textContent).toBe("UndeadThemetheme-undead.ogg");

    const audio = app.view.audio;
    audio.clearLog();
    human.click();
    expect(audio.log).toEqual([]);
    const sourcesBefore = device.sources.length;
    undead.click();
    expect(audio.log).toEqual([{ id: "theme.undead", outcome: "PLAYED" }]);
    expect(playing()).toEqual(["theme:UNDEAD"]);
    await after(0);
    // Its recording could not be fetched: the half-second stand-in plays,
    // through the music's own level.
    const first = device.sources[sourcesBefore];
    expect(first).toMatchObject({ rate: 1, stopped: false, at: 0 });
    expect(first?.seconds).toBeGreaterThan(0.45);
    expect(first?.seconds).toBeLessThan(0.7);
    // Once it has faded in it is at the mixer's music level.
    expect(first?.levelAt(0.45)).toBeCloseTo(
      DEFAULT_CATEGORY_GAINS_V1.music * device.musicGain(),
      6,
    );

    expect(audio.music.player).toMatchObject({ playing: "theme.undead" });
    const stop = required<HTMLButtonElement>(
      '[data-sound-row="theme:UNDEAD"] .v7-gallery-sound-stop',
    );
    expect(stop.hidden).toBe(false);
    expect(stop.getAttribute("aria-label")).toBe("Stop: Undead theme");
    // A loop does not end by itself.
    await after(60_000);
    expect(playing()).toEqual(["theme:UNDEAD"]);
    expect(audio.remainingMs("theme.undead")).toBe(Infinity);
    expect(audio.music.player).toMatchObject({ playing: "theme.undead" });

    // An effect plays over the music; another theme takes its place.
    required<HTMLButtonElement>('[data-sound-play="impact.hit"]').click();
    expect(audio.music.player).toMatchObject({ playing: "theme.undead" });
    required<HTMLButtonElement>('[data-sound-play="theme:GOBLIN"]').click();
    await after(0);
    expect(audio.music.player).toMatchObject({ playing: "theme.goblin" });
    expect(device.sources.at(-1)?.seconds).toBeGreaterThan(2.9);
    expect(device.sources.at(-1)?.loop).toBe(false);
    expect(playing()).toEqual(["impact.hit", "theme:GOBLIN"]);
    // The Goblin theme is three seconds long and does not loop: when it
    // is over its row is unmarked and nothing is held.
    await after(3100);
    expect(playing()).toEqual([]);
    expect(audio.music).toMatchObject({ audition: null, wanted: null });
    expect(audio.music.player).toMatchObject({
      playing: null,
      heldBuffers: 0,
    });

    // Stop ends a loop.
    undead.click();
    await after(0);
    expect(audio.music.player).toMatchObject({ playing: "theme.undead" });
    stop.click();
    expect(playing()).toEqual([]);
    expect(audio.remainingMs("theme.undead")).toBe(0);
    await after(1000);
    expect(device.sources.at(-1)?.stopped).toBe(true);
    expect(audio.music.player).toMatchObject({
      playing: null,
      heldBuffers: 0,
    });
  });
});
