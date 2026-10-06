// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type * as SoundManifestModule from "../../src/audio/sound-manifest";

/**
 * A faction theme registered in the manifest (bead pulp_wars-2yc.19,
 * docs/ui/SOUND.md "Faction themes"). The game has no theme yet, so this
 * file registers two for itself, the way a later bead will: one entry each
 * in `SOUND_THEMES_V1`. Nothing else is changed, and the audio plays them
 * and the Gallery's rows become playable.
 */
vi.mock("../../src/audio/sound-manifest", async (importOriginal) => {
  const original = await importOriginal<typeof SoundManifestModule>();
  const themes: readonly SoundManifestModule.SoundThemeEntryV1[] = [
    {
      id: "theme.undead",
      faction: "UNDEAD",
      loop: true,
      // A recording that has not loaded plays its fallback recipe.
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

  it("makes its Gallery row playable, with a stop, while the others wait", () => {
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

    app.view.audio.clearLog();
    undead.click();
    expect(app.view.audio.log).toEqual([
      { id: "theme.undead", outcome: "PLAYED" },
    ]);
    const first = device.sources.at(-1);
    expect(first).toMatchObject({ loop: true, rate: 1, stopped: false });
    expect(first?.gain).toBeCloseTo(DEFAULT_CATEGORY_GAINS_V1.music, 6);
    expect(playing()).toEqual(["theme:UNDEAD"]);
    const stop = required<HTMLButtonElement>(
      '[data-sound-row="theme:UNDEAD"] .v7-gallery-sound-stop',
    );
    expect(stop.hidden).toBe(false);
    expect(stop.getAttribute("aria-label")).toBe("Stop: Undead theme");
    // A loop does not end by itself.
    vi.advanceTimersByTime(60_000);
    expect(playing()).toEqual(["theme:UNDEAD"]);
    expect(app.view.audio.remainingMs("theme.undead")).toBe(Infinity);

    // An effect plays over the music; another theme takes its place.
    required<HTMLButtonElement>('[data-sound-play="impact.hit"]').click();
    expect(first?.stopped).toBe(false);
    required<HTMLButtonElement>('[data-sound-play="theme:GOBLIN"]').click();
    expect(first?.stopped).toBe(true);
    expect(device.sources.at(-1)).toMatchObject({ loop: false });
    expect(playing()).toEqual(["impact.hit", "theme:GOBLIN"]);
    // The Goblin theme is three seconds long and does not loop.
    vi.advanceTimersByTime(3100);
    expect(playing()).toEqual([]);

    // Stop ends a loop.
    undead.click();
    stop.click();
    expect(device.sources.at(-1)?.stopped).toBe(true);
    expect(playing()).toEqual([]);
    expect(app.view.audio.remainingMs("theme.undead")).toBe(0);
  });
});
