// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { bootstrapRuleset7App } from "../../src/app/index";
import {
  AUDIO_SETTINGS_STORAGE_KEY_V1,
  SOUND_IDS_V1,
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
    // Icon and control, minimal text: only the percentage is written out.
    expect(controls.textContent).toBe("70%");
    expect(toggle.querySelector("svg")?.dataset.icon).toBe("sound");
    expect(toggle.getAttribute("aria-pressed")).toBe("true");
    expect(toggle.getAttribute("aria-label")).toBe("Sound on");
    expect(slider.getAttribute("aria-label")).toBe("Volume");
    expect(slider.value).toBe("70");

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
    expect(controls.textContent).toBe("35%");
    expect(window.localStorage.getItem(AUDIO_SETTINGS_STORAGE_KEY_V1)).toBe(
      '{"enabled":false,"volume":35}',
    );
    app.destroy();

    // A new session starts from the stored preference.
    document.body.innerHTML = '<div id="app"></div>';
    const next = mountMatch().app;
    expect(next.audio.settings).toEqual({ enabled: false, volume: 35 });
    openSettings();
    expect(requiredButton("sound-toggle").getAttribute("aria-pressed")).toBe(
      "false",
    );
    expect(requiredElement<HTMLInputElement>("#v7-sound-volume").value).toBe(
      "35",
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

  it("opens from the Gallery, with the toggle and volume above it", () => {
    const app = bootstrapRuleset7App(document, {
      storage: null,
      settingsStorage: window.localStorage,
      galleryDemoHost: () => new RecordingBoardHost(),
    });
    requiredButton("gallery").click();
    const sounds = requiredButton("gallery-sounds");
    expect(sounds.textContent).toBe("Sounds");
    expect(sounds.getAttribute("aria-pressed")).toBe("false");
    expect(document.querySelector("[data-v7-sound-test]")).toBeNull();
    sounds.click();
    const panel = requiredElement<HTMLElement>("[data-v7-sound-test]");
    expect(panel.querySelectorAll("[data-sound-id]").length).toBe(
      SOUND_IDS_V1.length,
    );
    expect(panel.querySelector("[data-v7-sound-controls]")).not.toBeNull();
    expect(document.querySelector('[role="tablist"]')).toBeNull();
    expect(requiredButton("gallery-sounds").getAttribute("aria-pressed")).toBe(
      "true",
    );
    app.view.audio.clearLog();
    requiredButton("sound-test-impact.hit").click();
    expect(app.view.audio.log.map((entry) => entry.id)).toEqual(["impact.hit"]);
    // The same button returns to the tables.
    requiredButton("gallery-sounds").click();
    expect(document.querySelector("[data-v7-sound-test]")).toBeNull();
    expect(document.querySelector('[role="tablist"]')).not.toBeNull();
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
