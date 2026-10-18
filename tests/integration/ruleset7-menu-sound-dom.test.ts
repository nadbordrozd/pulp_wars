// @vitest-environment jsdom

import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  AUDIO_SETTINGS_STORAGE_KEY_V1,
  GameAudioV1,
  MUSIC_SETTINGS_STORAGE_KEY_V1,
  audioVolumeGainV1,
  type SoundKeyV1,
  type SoundStartV1,
  type WebAudioOutputV1,
} from "../../src/audio/index";
import type { GameStateV7 } from "../../src/engine/index";
import { Ruleset7DomAppView } from "../../src/render/dom/app-view-v7";
import {
  FixtureController,
  RecordingBoardHost,
  required,
  requiredButton,
  requiredElement,
} from "../fixtures/v7-dom-rig";
import { checkedV7, exploredAllV7, initialV7 } from "../fixtures/v7-builders";

/**
 * Music and Sound straight from the match menu (bead pulp_wars-2yc.67,
 * docs/ui/SOUND.md): the three-bar menu's first two rows are a toggle and
 * a small volume slider each, on the same preference as Settings. The
 * audio here has a fake device that records the gains and themes it is
 * given; nothing is ever played.
 */

const COORDINATE = /\b\d{1,2}, ?\d{1,2}\b/;

/** Records what the audio asks of the device; never makes a sound. */
class RecordingOutput implements WebAudioOutputV1 {
  readonly started: SoundStartV1[] = [];
  readonly stopped: SoundKeyV1[] = [];
  /** The effects' master gain, -1 until it is set. */
  volume = -1;
  /** The music's master gain, -1 until it is set. */
  musicVolume = -1;
  /** The themes asked for, in order (null is silence). */
  readonly music: (SoundKeyV1 | null)[] = [];
  unlocked = false;
  stockSounds = false;
  onMusicEnded: WebAudioOutputV1["onMusicEnded"] = null;
  soundSource(): "GENERATED" {
    return "GENERATED";
  }
  soundCandidate(): number | null {
    return null;
  }
  setPick(): void {}
  prepareCandidate(): Promise<boolean> {
    return Promise.resolve(false);
  }
  unlock(): void {
    this.unlocked = true;
  }
  setVolume(volume: number): void {
    this.volume = volume;
  }
  setMusicVolume(volume: number): void {
    this.musicVolume = volume;
  }
  setMusic(id: SoundKeyV1 | null): void {
    this.music.push(id);
  }
  musicState(): null {
    return null;
  }
  musicRequests(): readonly string[] {
    return [];
  }
  setPaused(): void {}
  start(request: SoundStartV1): { stop: () => void } | null {
    if (!this.unlocked) return null;
    this.started.push(request);
    return { stop: () => this.stopped.push(request.id) };
  }
  durationMs(): number {
    return 200;
  }
  close(): void {}
}

function matchState(): GameStateV7 {
  return checkedV7(exploredAllV7(initialV7(1518)));
}

let view: Ruleset7DomAppView | null = null;
let audio: GameAudioV1 | null = null;

function mountMatch(): {
  readonly app: Ruleset7DomAppView;
  readonly output: RecordingOutput;
  readonly host: RecordingBoardHost;
  readonly state: GameStateV7;
} {
  const state = matchState();
  const output = new RecordingOutput();
  audio = new GameAudioV1({ storage: window.localStorage, output });
  const host = new RecordingBoardHost();
  const app = new Ruleset7DomAppView(
    document,
    requiredElement<HTMLElement>("#app"),
    new FixtureController(state),
    { boardHost: host, settingsStorage: window.localStorage, audio },
  );
  view = app;
  return { app, output, host, state };
}

function remount(): ReturnType<typeof mountMatch> {
  view?.destroy();
  audio?.destroy();
  document.body.innerHTML = '<div id="app"></div>';
  return mountMatch();
}

function openMenu(): HTMLElement {
  requiredButton("compact-menu").click();
  return requiredElement<HTMLElement>("#v7-hud-menu");
}

function menuSlider(level: "music" | "sound"): HTMLInputElement {
  return requiredElement<HTMLInputElement>(`#v7-menu-${level}-volume`);
}

function slide(slider: HTMLInputElement, value: number): void {
  slider.value = String(value);
  slider.dispatchEvent(new Event("input", { bubbles: true }));
  slider.dispatchEvent(new Event("change", { bubbles: true }));
}

/** Opens Settings from the menu (which closes the menu). */
function openSettings(): void {
  if (document.querySelector("#v7-hud-menu") === null)
    requiredButton("compact-menu").click();
  requiredButton("settings").click();
}

function closeSettings(): void {
  document.dispatchEvent(
    new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
  );
}

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  window.localStorage.clear();
});

afterEach(() => {
  view?.destroy();
  view = null;
  audio?.destroy();
  audio = null;
});

describe("the match menu's Music and Sound rows", () => {
  it("puts Music and Sound first, each a toggle and a small slider", () => {
    mountMatch();
    const menu = openMenu();
    const rows = [...menu.children].slice(0, 2) as HTMLElement[];
    expect(rows.map((row) => row.dataset.soundLevel)).toEqual([
      "music",
      "sound",
    ]);
    // Minimal text: the two names, no numbers, no coordinates.
    expect(rows.map((row) => row.textContent)).toEqual(["Music", "Sound"]);
    expect(COORDINATE.test(menu.textContent ?? "")).toBe(false);
    for (const [row, level, name] of [
      [rows[0], "music", "Music"],
      [rows[1], "sound", "Sound"],
    ] as const) {
      const toggle = required(row?.querySelector("button"));
      const slider = required(
        row?.querySelector<HTMLInputElement>('input[type="range"]'),
      );
      expect(toggle.getAttribute("aria-pressed")).toBe("true");
      expect(toggle.title).toBe(`${name} on`);
      expect(toggle.querySelector("svg")?.dataset.icon).toBe(level);
      expect(slider.id).toBe(`v7-menu-${level}-volume`);
      expect([slider.min, slider.max, slider.step]).toEqual(["0", "100", "5"]);
      expect(slider.value).toBe("70");
      expect(slider.getAttribute("aria-label")).toBe(`${name} volume`);
      expect(slider.getAttribute("aria-valuetext")).toBe("70%");
      // Both are ordinary focusable controls, reached with Tab.
      expect(toggle.tabIndex).toBe(0);
      expect(slider.tabIndex).toBe(0);
      expect(slider.disabled).toBe(false);
    }
    // The screens follow them, as before.
    expect(
      [...menu.querySelectorAll<HTMLElement>(".v7-menu-item")]
        .map((item) => item.dataset.action)
        .slice(0, 4),
    ).toEqual(["mute-music", "mute", "leaderboard", "achievements"]);
  });

  it("changes the music in place and Settings shows it", () => {
    const { app, output } = mountMatch();
    // A gesture has opened the (fake) device: the match's theme is asked for.
    app.audio.unlock();
    expect(output.music.at(-1)).toEqual(expect.stringMatching(/^theme\./));
    openMenu();
    const slider = menuSlider("music");
    slide(slider, 25);
    // The menu stays open and the slider is the same element.
    expect(slider.isConnected).toBe(true);
    expect(requiredButton("compact-menu").getAttribute("aria-expanded")).toBe(
      "true",
    );
    expect(slider.getAttribute("aria-valuetext")).toBe("25%");
    expect(app.audio.settings.musicVolume).toBe(25);
    expect(app.audio.settings.volume).toBe(70);
    expect(output.musicVolume).toBeCloseTo(audioVolumeGainV1(25), 5);
    const toggle = requiredButton("mute-music");
    toggle.click();
    expect(toggle.isConnected).toBe(true);
    expect(toggle.getAttribute("aria-pressed")).toBe("false");
    expect(toggle.querySelector("svg")?.dataset.icon).toBe("music-off");
    expect(
      required(toggle.closest<HTMLElement>(".v7-menu-audio")).dataset.sound,
    ).toBe("off");
    // Music off asks the device for silence; the effects go on.
    expect(output.music.at(-1)).toBeNull();
    expect(app.audio.settings.enabled).toBe(true);
    expect(window.localStorage.getItem(MUSIC_SETTINGS_STORAGE_KEY_V1)).toBe(
      '{"enabled":false,"volume":25}',
    );
    expect(window.localStorage.getItem(AUDIO_SETTINGS_STORAGE_KEY_V1)).toBe(
      '{"enabled":true,"volume":70}',
    );

    openSettings();
    expect(requiredButton("music-toggle").getAttribute("aria-pressed")).toBe(
      "false",
    );
    expect(requiredElement<HTMLInputElement>("#v7-music-volume").value).toBe(
      "25",
    );
    expect(requiredButton("sound-toggle").getAttribute("aria-pressed")).toBe(
      "true",
    );
    expect(requiredElement<HTMLInputElement>("#v7-sound-volume").value).toBe(
      "70",
    );
  });

  it("mutes the effects from the menu so nothing reaches the device", () => {
    const { app, output } = mountMatch();
    app.audio.unlock();
    openMenu();
    slide(menuSlider("sound"), 40);
    expect(output.volume).toBeCloseTo(audioVolumeGainV1(40), 5);
    expect(app.audio.settings.volume).toBe(40);
    requiredButton("mute").click();
    expect(app.audio.settings.enabled).toBe(false);
    output.started.length = 0;
    app.audio.clearLog();
    expect(app.audio.play("impact.hit")).toBe("MUTED");
    expect(output.started).toEqual([]);
    // Music is the other level.
    expect(app.audio.settings.musicEnabled).toBe(true);
    expect(requiredButton("mute-music").getAttribute("aria-pressed")).toBe(
      "true",
    );
    // Turning the slider to zero is silence too, with the toggle still on.
    requiredButton("mute").click();
    slide(menuSlider("sound"), 0);
    expect(output.volume).toBe(0);
    expect(menuSlider("sound").getAttribute("aria-valuetext")).toBe("0%");
  });

  it("shows what Settings set, and remembers both across sessions", () => {
    const { app } = mountMatch();
    openSettings();
    requiredButton("sound-toggle").click();
    const settingsMusic = requiredElement<HTMLInputElement>("#v7-music-volume");
    settingsMusic.value = "55";
    settingsMusic.dispatchEvent(new Event("input", { bubbles: true }));
    closeSettings();
    expect(document.querySelector("#v7-music-volume")).toBeNull();
    openMenu();
    expect(requiredButton("mute").getAttribute("aria-pressed")).toBe("false");
    expect(menuSlider("music").value).toBe("55");
    expect(app.audio.settings).toEqual({
      enabled: false,
      volume: 70,
      musicEnabled: true,
      musicVolume: 55,
    });
    slide(menuSlider("sound"), 15);

    remount();
    openMenu();
    expect(requiredButton("mute").getAttribute("aria-pressed")).toBe("false");
    expect(requiredButton("mute-music").getAttribute("aria-pressed")).toBe(
      "true",
    );
    expect(menuSlider("sound").value).toBe("15");
    expect(menuSlider("music").value).toBe("55");
  });

  it("keeps working after the HUD is redrawn around the open menu", () => {
    const { app, host, state } = mountMatch();
    openMenu();
    const toggle = requiredButton("mute");
    const slider = menuSlider("sound");
    // A board selection redraws the match; the HUD is reconciled in place.
    const unit = required(
      state.units.find(
        (candidate) => candidate.ownerId === state.humanPlayerId,
      ),
    );
    required(host.callbacks).onSelection({ kind: "UNIT", unitId: unit.id });
    expect(document.querySelector("#v7-hud-menu")).not.toBeNull();
    expect(requiredButton("mute")).toBe(toggle);
    expect(menuSlider("sound")).toBe(slider);
    toggle.click();
    expect(app.audio.settings.enabled).toBe(false);
    // The live element shows it, not a detached copy.
    expect(toggle.getAttribute("aria-pressed")).toBe("false");
    slide(slider, 30);
    expect(app.audio.settings.volume).toBe(30);
    expect(slider.getAttribute("aria-valuetext")).toBe("30%");
  });

  it("fits a 320 px phone: the menu and its rows stay narrow", () => {
    const css = readFileSync("src/styles/v7.css", "utf8");
    const rule = (selector: string): string => {
      const start = css.indexOf(`\n${selector} {`);
      if (start < 0) throw new Error(`Missing ${selector}`);
      return css.slice(start, css.indexOf("\n}", start));
    };
    const rem = (source: string, property: string): number => {
      const match = new RegExp(`${property}:\\s*([0-9.]+)rem`).exec(source);
      return Number(required(match)[1]);
    };
    const menu = rule(".v7-hud-menu");
    const row = rule(".v7-menu-audio");
    // 16 px to the rem and the em at 100%; the menu is never wider than the
    // screen (bead pulp_wars-2yc.98: its least width is in em, so it widens
    // with the UI size, and capped by the screen).
    const least =
      /min-width:\s*min\(([0-9.]+)em, calc\(100vw - 1\.5rem\)\)/.exec(menu);
    const minWidth = Number(required(least)[1]);
    expect(minWidth * 16).toBeLessThanOrEqual(320 - 24);
    expect(menu).toContain("max-width: calc(100vw - 1.5rem)");
    const columns =
      /grid-template-columns:\s*minmax\(([0-9.]+)rem, auto\) minmax\(([0-9.]+)rem, 1fr\)/.exec(
        row,
      );
    const toggleRem = Number(required(columns)[1]);
    const sliderRem = Number(required(columns)[2]);
    expect(toggleRem + sliderRem + rem(row, "gap")).toBeLessThanOrEqual(
      minWidth,
    );
    // A thumb-sized slider.
    expect(rule(".v7-menu-volume")).toContain("min-height: 44px");
  });
});
