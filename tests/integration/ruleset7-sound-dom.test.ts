// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { bootstrapRuleset7App } from "../../src/app/index";
import {
  AUDIO_SETTINGS_STORAGE_KEY_V1,
  MUSIC_SETTINGS_STORAGE_KEY_V1,
  SOUND_IDS_V1,
  playableSoundIdsV1,
  type PresentationStepCueV7,
} from "../../src/audio/index";
import {
  applyCommandV7,
  type GameStateV7,
  type PlayerEventEnvelopeV7,
  type PlayerViewV7,
  type UnitId,
} from "../../src/engine/index";
import { corePresentationPlanV7 } from "../../src/render/canvas/presentation-plan-v7";
import { Ruleset7DomAppView } from "../../src/render/dom/app-view-v7";
import {
  FixtureController,
  RecordingBoardHost,
  required,
  requiredButton,
  requiredElement,
  waitUntil,
} from "../fixtures/v7-dom-rig";
import { checkedV7, exploredAllV7, initialV7 } from "../fixtures/v7-builders";

/**
 * Sound in the interface (bead pulp_wars-2yc.10, docs/ui/SOUND.md): the
 * Settings toggle and volume, the match menu's mute, the sound test, the
 * gesture that opens the audio device, and the sounds an attack asks for.
 * jsdom has no WebAudio, so these tests read the audio's request log; one
 * installs a counting stand-in for `AudioContext`.
 */

const COORDINATE = /\b\d{1,2}, ?\d{1,2}\b/;

/** A host that announces the plan's steps, as the canvas host does. */
class AnnouncingBoardHost extends RecordingBoardHost {
  #listener: ((cue: PresentationStepCueV7) => void) | null = null;
  setPresentationStepListener(
    listener: ((cue: PresentationStepCueV7) => void) | null,
  ): void {
    this.#listener = listener;
  }
  override async presentBoundary(
    before?: PlayerViewV7,
    after?: PlayerViewV7,
    envelope?: PlayerEventEnvelopeV7,
  ): Promise<void> {
    if (before === undefined || after === undefined || envelope === undefined)
      return;
    for (const step of corePresentationPlanV7(before, envelope, after))
      this.#listener?.({ step, before, after, envelope, durationScale: 1 });
  }
}

/** A human Fighter beside an enemy Guard with 1 HP. */
function duelState(): GameStateV7 {
  const state = exploredAllV7(initialV7(1518));
  const attacker = required(
    state.units.find((unit) => unit.ownerId === state.humanPlayerId),
  );
  const target = required(
    state.units.find((unit) => unit.ownerId !== state.humanPlayerId),
  );
  return checkedV7({
    ...state,
    units: [
      { ...attacker, role: "FIGHTER", hp: 12, maxHp: 12, at: { x: 4, y: 4 } },
      { ...target, role: "GUARD", hp: 1, maxHp: 17, at: { x: 5, y: 4 } },
    ],
  });
}

let view: Ruleset7DomAppView | null = null;

function mountMatch(state: GameStateV7 = duelState()): {
  readonly controller: FixtureController;
  readonly host: AnnouncingBoardHost;
  readonly app: Ruleset7DomAppView;
} {
  const controller = new FixtureController(state);
  const host = new AnnouncingBoardHost();
  const app = new Ruleset7DomAppView(
    document,
    requiredElement<HTMLElement>("#app"),
    controller,
    { boardHost: host, settingsStorage: window.localStorage },
  );
  view = app;
  return { controller, host, app };
}

function openSettings(): void {
  requiredButton("compact-menu").click();
  requiredButton("settings").click();
}

function requested(app: Ruleset7DomAppView): string[] {
  return app.audio.log.map((entry) => entry.id);
}

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  window.localStorage.clear();
});

afterEach(() => {
  view?.destroy();
  view = null;
  Reflect.deleteProperty(window, "AudioContext");
});

describe("sound settings", () => {
  it("offers an icon toggle and a volume slider, and remembers both", () => {
    const { app } = mountMatch();
    openSettings();
    const controls = requiredElement<HTMLElement>("[data-v7-sound-controls]");
    const toggle = requiredButton("sound-toggle");
    const slider = requiredElement<HTMLInputElement>("#v7-sound-volume");
    // Icon and control, minimal text: the two names and the percentages.
    expect(controls.textContent).toBe("Music70%Sound70%");
    expect(controls.getAttribute("role")).toBe("group");
    expect(controls.getAttribute("aria-label")).toBe("Music and sound");
    expect(toggle.querySelector("svg")?.dataset.icon).toBe("sound");
    expect(toggle.getAttribute("aria-pressed")).toBe("true");
    expect(toggle.getAttribute("aria-label")).toBe("Sound on");
    expect(slider.getAttribute("aria-label")).toBe("Sound volume");
    expect(slider.value).toBe("70");
    const soundRow = requiredElement<HTMLElement>('[data-sound-level="sound"]');
    expect(soundRow.textContent).toBe("Sound70%");

    toggle.click();
    // The toggle changes in place: the dialog is not rebuilt around it.
    expect(toggle.isConnected).toBe(true);
    expect(toggle.getAttribute("aria-pressed")).toBe("false");
    expect(toggle.querySelector("svg")?.dataset.icon).toBe("sound-off");
    expect(app.audio.settings.enabled).toBe(false);
    expect(window.localStorage.getItem(AUDIO_SETTINGS_STORAGE_KEY_V1)).toBe(
      '{"enabled":false,"volume":70}',
    );
    slider.value = "35";
    slider.dispatchEvent(new Event("input", { bubbles: true }));
    expect(slider.getAttribute("aria-valuetext")).toBe("35%");
    expect(soundRow.textContent).toBe("Sound35%");
    // Music was not touched by either.
    expect(controls.textContent).toBe("Music70%Sound35%");
    expect(app.audio.settings).toEqual({
      enabled: false,
      volume: 35,
      musicEnabled: true,
      musicVolume: 70,
    });
    expect(window.localStorage.getItem(AUDIO_SETTINGS_STORAGE_KEY_V1)).toBe(
      '{"enabled":false,"volume":35}',
    );
    app.destroy();

    // A new session starts from the stored preference.
    document.body.innerHTML = '<div id="app"></div>';
    const next = mountMatch().app;
    expect(next.audio.settings).toEqual({
      enabled: false,
      volume: 35,
      musicEnabled: true,
      musicVolume: 70,
    });
    openSettings();
    expect(requiredButton("sound-toggle").getAttribute("aria-pressed")).toBe(
      "false",
    );
    expect(requiredElement<HTMLInputElement>("#v7-sound-volume").value).toBe(
      "35",
    );
  });

  it("offers Music its own toggle and slider, stored apart from Sound", () => {
    const { app } = mountMatch();
    openSettings();
    const controls = requiredElement<HTMLElement>("[data-v7-sound-controls]");
    // Music first, then Sound: two rows, each a toggle, a name, a slider.
    expect(
      [...controls.querySelectorAll<HTMLElement>("[data-sound-level]")].map(
        (row) => row.dataset.soundLevel,
      ),
    ).toEqual(["music", "sound"]);
    const toggle = requiredButton("music-toggle");
    const slider = requiredElement<HTMLInputElement>("#v7-music-volume");
    expect(toggle.querySelector("svg")?.dataset.icon).toBe("music");
    expect(toggle.getAttribute("aria-pressed")).toBe("true");
    expect(toggle.getAttribute("aria-label")).toBe("Music on");
    expect(slider.type).toBe("range");
    expect([slider.min, slider.max, slider.step]).toEqual(["0", "100", "5"]);
    expect(slider.getAttribute("aria-label")).toBe("Music volume");
    expect(slider.value).toBe("70");
    // The name is the slider's label, so a press on it reaches the slider.
    const name = requiredElement<HTMLLabelElement>(
      '[data-sound-level="music"] label',
    );
    expect(name.textContent).toBe("Music");
    expect(name.htmlFor).toBe(slider.id);
    // Both are ordinary focusable controls.
    expect(toggle.tabIndex).toBe(0);
    expect(slider.tabIndex).toBe(0);

    slider.value = "25";
    slider.dispatchEvent(new Event("input", { bubbles: true }));
    expect(slider.getAttribute("aria-valuetext")).toBe("25%");
    expect(app.audio.settings.musicVolume).toBe(25);
    expect(app.audio.settings.volume).toBe(70);
    toggle.click();
    expect(toggle.isConnected).toBe(true);
    expect(toggle.getAttribute("aria-pressed")).toBe("false");
    expect(toggle.getAttribute("aria-label")).toBe("Music off");
    expect(toggle.querySelector("svg")?.dataset.icon).toBe("music-off");
    expect(app.audio.settings.musicEnabled).toBe(false);
    expect(app.audio.settings.enabled).toBe(true);
    expect(window.localStorage.getItem(MUSIC_SETTINGS_STORAGE_KEY_V1)).toBe(
      '{"enabled":false,"volume":25}',
    );
    expect(window.localStorage.getItem(AUDIO_SETTINGS_STORAGE_KEY_V1)).toBe(
      '{"enabled":true,"volume":70}',
    );
    // Sound's toggle is the other one.
    expect(requiredButton("sound-toggle").getAttribute("aria-pressed")).toBe(
      "true",
    );
    app.destroy();

    document.body.innerHTML = '<div id="app"></div>';
    const next = mountMatch().app;
    expect(next.audio.settings).toEqual({
      enabled: true,
      volume: 70,
      musicEnabled: false,
      musicVolume: 25,
    });
    openSettings();
    expect(requiredButton("music-toggle").getAttribute("aria-pressed")).toBe(
      "false",
    );
    expect(requiredElement<HTMLInputElement>("#v7-music-volume").value).toBe(
      "25",
    );
    expect(requiredElement<HTMLInputElement>("#v7-sound-volume").value).toBe(
      "70",
    );
  });

  it("gives the music the single volume and mute stored before it had its own", () => {
    window.localStorage.setItem(
      AUDIO_SETTINGS_STORAGE_KEY_V1,
      '{"enabled":false,"volume":45}',
    );
    const { app } = mountMatch();
    expect(app.audio.settings).toEqual({
      enabled: false,
      volume: 45,
      musicEnabled: false,
      musicVolume: 45,
    });
    openSettings();
    expect(requiredElement<HTMLInputElement>("#v7-music-volume").value).toBe(
      "45",
    );
    expect(requiredButton("music-toggle").getAttribute("aria-pressed")).toBe(
      "false",
    );
    expect(requiredButton("sound-toggle").getAttribute("aria-pressed")).toBe(
      "false",
    );
  });

  it("leaves reduced motion and sound independent", () => {
    const { app } = mountMatch();
    openSettings();
    const motion = requiredElement<HTMLSelectElement>("#v7-motion");
    motion.value = "REDUCED";
    motion.dispatchEvent(new Event("change", { bubbles: true }));
    expect(app.audio.settings.enabled).toBe(true);
    expect(requiredButton("sound-toggle").getAttribute("aria-pressed")).toBe(
      "true",
    );
  });

  it("mutes from the match menu without closing it", () => {
    const { app } = mountMatch();
    requiredButton("compact-menu").click();
    const mute = requiredButton("mute");
    expect(mute.textContent).toBe("Sound");
    expect(mute.getAttribute("aria-pressed")).toBe("true");
    expect(mute.querySelector("svg")?.dataset.icon).toBe("sound");
    mute.click();
    expect(app.audio.settings.enabled).toBe(false);
    expect(mute.isConnected).toBe(true);
    expect(mute.getAttribute("aria-pressed")).toBe("false");
    expect(mute.querySelector("svg")?.dataset.icon).toBe("sound-off");
    expect(requiredButton("compact-menu").getAttribute("aria-expanded")).toBe(
      "true",
    );
    // Sounds asked for while muted are logged as muted, not played.
    app.audio.clearLog();
    app.audio.play("impact.hit");
    expect(app.audio.log).toEqual([{ id: "impact.hit", outcome: "MUTED" }]);
    mute.click();
    expect(app.audio.settings.enabled).toBe(true);
  });

  it("mutes the music from the match menu, apart from the sound", () => {
    const { app } = mountMatch();
    requiredButton("compact-menu").click();
    const music = requiredButton("mute-music");
    expect(music.textContent).toBe("Music");
    expect(music.getAttribute("aria-pressed")).toBe("true");
    expect(music.querySelector("svg")?.dataset.icon).toBe("music");
    // The two are next to each other at the top of the menu.
    expect(requiredButton("mute").nextElementSibling).toBe(music);
    music.click();
    expect(app.audio.settings.musicEnabled).toBe(false);
    expect(app.audio.settings.enabled).toBe(true);
    expect(music.isConnected).toBe(true);
    expect(music.getAttribute("aria-pressed")).toBe("false");
    expect(music.title).toBe("Music off");
    expect(music.querySelector("svg")?.dataset.icon).toBe("music-off");
    expect(requiredButton("mute").getAttribute("aria-pressed")).toBe("true");
    expect(requiredButton("compact-menu").getAttribute("aria-expanded")).toBe(
      "true",
    );
    // An effect is still played; a theme is not.
    app.audio.clearLog();
    app.audio.play("theme.goblin");
    expect(app.audio.log).toEqual([{ id: "theme.goblin", outcome: "MUTED" }]);
    music.click();
    expect(app.audio.settings.musicEnabled).toBe(true);
  });
});

describe("sound test", () => {
  it("lists every sound with a play button in Settings", () => {
    const { app } = mountMatch();
    openSettings();
    const panel = requiredElement<HTMLElement>("[data-v7-sound-test]");
    const buttons = [
      ...panel.querySelectorAll<HTMLButtonElement>("[data-sound-id]"),
    ];
    expect(buttons.map((button) => button.dataset.soundId).sort()).toEqual(
      [...SOUND_IDS_V1].sort(),
    );
    for (const button of buttons) {
      expect(button.querySelector("svg")?.dataset.icon).toBe("play");
      // A short label: no sentence and no tile coordinate.
      expect((button.textContent ?? "").split(" ").length).toBeLessThanOrEqual(
        3,
      );
      expect(button.textContent ?? "").not.toMatch(COORDINATE);
    }
    expect(
      [...panel.querySelectorAll("h3")].map((heading) => heading.textContent),
    ).toEqual(["Combat", "Economy", "Interface"]);
    app.audio.clearLog();
    required(
      buttons.find((button) => button.dataset.soundId === "match.victory"),
    ).click();
    // The button plays its own sound, and no interface click on top.
    expect(requested(app)).toEqual(["match.victory"]);
  });

  it("is a tab of the Gallery, with the toggle and volume above it", () => {
    // The Sounds tab itself: tests/integration/ruleset7-gallery-sounds-dom.
    const app = bootstrapRuleset7App(document, {
      storage: null,
      settingsStorage: window.localStorage,
      galleryDemoHost: () => new RecordingBoardHost(),
    });
    requiredButton("gallery").click();
    // The header button of pulp_wars-2yc.10 became the tab.
    expect(document.querySelector('[data-action="gallery-sounds"]')).toBeNull();
    const tab = requiredButton("gallery-tab-sounds");
    expect(tab.textContent).toBe("Sounds");
    expect(tab.getAttribute("aria-selected")).toBe("false");
    expect(document.querySelector("[data-v7-gallery-sounds]")).toBeNull();
    tab.click();
    const panel = requiredElement<HTMLElement>("[data-v7-gallery-sounds]");
    expect(
      [...panel.querySelectorAll<HTMLElement>("[data-sound-play]")]
        .map((card) => card.dataset.soundId)
        .filter((id) => id !== undefined)
        .sort(),
    ).toEqual([...playableSoundIdsV1()].sort());
    expect(panel.querySelector("[data-v7-sound-controls]")).not.toBeNull();
    // The two levels are above the cards here too, with ids of their own.
    expect(
      panel.querySelector("#v7-music-volume-gallery, #v7-sound-volume-gallery"),
    ).not.toBeNull();
    expect(panel.querySelector("#v7-music-volume-gallery")).not.toBeNull();
    expect(panel.querySelector("#v7-sound-volume-gallery")).not.toBeNull();
    app.view.audio.clearLog();
    requiredElement<HTMLButtonElement>(
      '[data-sound-play="impact.hit"]',
    ).click();
    // The card plays its own sound, and no interface click on top.
    expect(app.view.audio.log.map((entry) => entry.id)).toEqual(["impact.hit"]);
    requiredButton("gallery-tab-units").click();
    expect(document.querySelector("[data-v7-gallery-sounds]")).toBeNull();
    app.destroy();
  });
});

describe("sounds of play", () => {
  it("asks for the swing, the hit and the death of an attack", async () => {
    const { app, host, controller } = mountMatch();
    const before = required(controller.snapshot().view);
    const attacker = required(
      before.units.find((unit) => unit.ownerId === before.viewer.id),
    );
    const target = required(
      before.units.find((unit) => unit.ownerId !== before.viewer.id),
    );
    app.audio.clearLog();
    host.callbacks?.onSelection({ kind: "UNIT", unitId: attacker.id });
    expect(requested(app)).toEqual(["ui.select"]);
    app.audio.clearLog();
    host.callbacks?.onCommand({
      at: target.at,
      family: "ATTACK",
      command: {
        kind: "ATTACK",
        unitId: attacker.id,
        targetUnitId: target.id,
      },
    });
    await waitUntil(() => requested(app).includes("unit.death"));
    expect(requested(app).slice(0, 3)).toEqual([
      "attack.melee",
      "impact.hit",
      "unit.death",
    ]);
    // No device was ever opened: jsdom has no WebAudio.
    expect(app.audio.unlocked).toBe(false);
    expect(new Set(app.audio.log.map((entry) => entry.outcome))).toEqual(
      new Set(["LOCKED"]),
    );
  });

  it("clicks for buttons, ends the turn, and reports a refused command", async () => {
    const { app, host } = mountMatch();
    app.audio.clearLog();
    requiredButton("compact-menu").click();
    expect(requested(app)).toEqual(["ui.click"]);
    requiredButton("compact-menu").click();
    // A command the engine refuses.
    app.audio.clearLog();
    const refused = {
      kind: "ATTACK" as const,
      unitId: 9_999_998 as UnitId,
      targetUnitId: 9_999_999 as UnitId,
    };
    const state = duelState();
    expect(applyCommandV7(state, state.humanPlayerId, refused).accepted).toBe(
      false,
    );
    host.callbacks?.onCommand({
      at: { x: 5, y: 4 },
      family: "ATTACK",
      command: refused,
    });
    await waitUntil(() => requested(app).includes("ui.error"));
    expect(requested(app)).toEqual(["ui.error"]);
    app.audio.clearLog();
    requiredButton("end-turn").click();
    await waitUntil(() => requested(app).includes("turn.end"));
    expect(requested(app)).toEqual(["ui.click", "turn.end"]);
  });
});

describe("the audio device", () => {
  /** Counts the contexts made and the sources started. */
  function installAudioContext(): {
    readonly contexts: () => number;
    readonly started: () => number;
  } {
    let contexts = 0;
    let started = 0;
    const node = (): Record<string, unknown> => ({
      connect: () => undefined,
      disconnect: () => undefined,
      gain: { value: 1 },
      threshold: { value: 0 },
      knee: { value: 0 },
      ratio: { value: 1 },
      attack: { value: 0 },
      release: { value: 0 },
    });
    class FakeAudioContext {
      state = "running";
      currentTime = 0;
      destination = {};
      constructor() {
        contexts += 1;
      }
      createGain = node;
      createDynamicsCompressor = node;
      createBuffer(_channels: number, length: number): unknown {
        const data = new Float32Array(length);
        return { duration: length / 44100, getChannelData: () => data };
      }
      createBufferSource(): unknown {
        return {
          ...node(),
          buffer: null,
          playbackRate: { value: 1 },
          onended: null,
          start: () => {
            started += 1;
          },
          stop: () => undefined,
        };
      }
      resume = async (): Promise<void> => undefined;
      close = async (): Promise<void> => undefined;
    }
    Object.defineProperty(window, "AudioContext", {
      configurable: true,
      writable: true,
      value: FakeAudioContext,
    });
    return { contexts: () => contexts, started: () => started };
  }

  it("is created by the first gesture, not at mount", () => {
    const device = installAudioContext();
    const { app } = mountMatch();
    expect(device.contexts()).toBe(0);
    // Asking for a sound does not open the device either.
    expect(app.audio.play("impact.hit")).toBe("LOCKED");
    expect(device.contexts()).toBe(0);
    document.dispatchEvent(new Event("pointerup", { bubbles: true }));
    expect(device.contexts()).toBe(1);
    expect(app.audio.unlocked).toBe(true);
    expect(app.audio.play("impact.hit")).toBe("PLAYED");
    expect(device.started()).toBe(1);
    // Later gestures reuse the one device.
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "a" }));
    requiredButton("compact-menu").click();
    expect(device.contexts()).toBe(1);
  });

  it("stays closed while sound is off, and opens when turned on", () => {
    window.localStorage.setItem(
      AUDIO_SETTINGS_STORAGE_KEY_V1,
      '{"enabled":false,"volume":70}',
    );
    const device = installAudioContext();
    mountMatch();
    document.dispatchEvent(new Event("pointerup", { bubbles: true }));
    expect(device.contexts()).toBe(0);
    requiredButton("compact-menu").click();
    requiredButton("mute").click();
    expect(device.contexts()).toBe(1);
  });

  it("makes no sound while the tab is hidden", () => {
    const device = installAudioContext();
    const { app } = mountMatch();
    document.dispatchEvent(new Event("pointerup", { bubbles: true }));
    let visibility = "hidden";
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => visibility,
    });
    try {
      expect(app.audio.play("turn.start")).toBe("HIDDEN");
      expect(device.started()).toBe(0);
      visibility = "visible";
      expect(app.audio.play("turn.start")).toBe("PLAYED");
      expect(device.started()).toBe(1);
    } finally {
      Reflect.deleteProperty(document, "visibilityState");
    }
  });

  it("removes its listeners when the view is destroyed", () => {
    const device = installAudioContext();
    const { app } = mountMatch();
    app.destroy();
    view = null;
    document.dispatchEvent(new Event("pointerup", { bubbles: true }));
    expect(device.contexts()).toBe(0);
  });
});
