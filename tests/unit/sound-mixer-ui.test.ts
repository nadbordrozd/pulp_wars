import { describe, expect, it } from "vitest";
import {
  AUDIO_SETTINGS_STORAGE_KEY_V1,
  DEFAULT_AUDIO_SETTINGS_V1,
  DEFAULT_CATEGORY_GAINS_V1,
  DEFAULT_MAX_VOICES_V1,
  GameAudioV1,
  SoundMixerV1,
  audioVolumeGainV1,
  clampAudioVolumeV1,
  createWebAudioOutputV1,
  loadAudioSettingsV1,
  parseStoredAudioSettingsV1,
  storeAudioSettingsV1,
  type SoundIdV1,
  type SoundKeyV1,
  type SoundStartV1,
  type WebAudioOutputV1,
} from "../../src/audio/index";

/**
 * The mixer's policy, the stored preference and the gating of the game's
 * sound (bead pulp_wars-2yc.10, docs/ui/SOUND.md), on a fake device: this
 * file runs in Node, where there is no WebAudio at all.
 */

class FakeOutput implements WebAudioOutputV1 {
  readonly started: SoundStartV1[] = [];
  readonly stopped: SoundKeyV1[] = [];
  unlockCalls = 0;
  volume = -1;
  closed = false;
  unlocked = false;
  unlock(): void {
    this.unlockCalls += 1;
    this.unlocked = true;
  }
  setVolume(volume: number): void {
    this.volume = volume;
  }
  start(request: SoundStartV1): { stop: () => void } | null {
    if (!this.unlocked) return null;
    this.started.push(request);
    return { stop: () => this.stopped.push(request.id) };
  }
  durationMs(): number {
    return 200;
  }
  close(): void {
    this.closed = true;
  }
}

function memoryStorage(): {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  readonly values: Map<string, string>;
} {
  const values = new Map<string, string>();
  return {
    values,
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => void values.set(key, value),
    removeItem: (key) => void values.delete(key),
  };
}

function mixerRig(options: { maxVoices?: number; random?: number } = {}): {
  readonly mixer: SoundMixerV1;
  readonly output: FakeOutput;
  readonly advance: (ms: number) => void;
} {
  const output = new FakeOutput();
  output.unlocked = true;
  let now = 1000;
  return {
    output,
    advance: (ms) => {
      now += ms;
    },
    mixer: new SoundMixerV1({
      output,
      clock: () => now,
      random: () => options.random ?? 0.5,
      ...(options.maxVoices === undefined
        ? {}
        : { maxVoices: options.maxVoices }),
    }),
  };
}

describe("sound mixer", () => {
  it("coalesces the same sound within 60 ms and lets it through after", () => {
    const { mixer, output, advance } = mixerRig();
    expect(mixer.play("impact.hit")).toBe("PLAYED");
    expect(mixer.play("impact.hit")).toBe("COALESCED");
    advance(59);
    expect(mixer.play("impact.hit")).toBe("COALESCED");
    // A different sound is not held back.
    expect(mixer.play("unit.hurt")).toBe("PLAYED");
    advance(1);
    expect(mixer.play("impact.hit")).toBe("PLAYED");
    expect(output.started.map((start) => start.id)).toEqual([
      "impact.hit",
      "unit.hurt",
      "impact.hit",
    ]);
  });

  it("coalesces by the time a delayed sound starts", () => {
    const { mixer } = mixerRig();
    expect(mixer.play("impact.hit", { delayMs: 300 })).toBe("PLAYED");
    // Now is 300 ms before that start: a play now is a different moment.
    expect(mixer.play("impact.hit")).toBe("PLAYED");
    expect(mixer.play("impact.hit", { delayMs: 280 })).toBe("COALESCED");
  });

  it("caps the voices; a more important sound takes a lesser one's", () => {
    const { mixer, output, advance } = mixerRig({ maxVoices: 3 });
    // Three detail sounds (priority 1) fill the voices.
    expect(mixer.play("unit.step")).toBe("PLAYED");
    expect(mixer.play("special.pop")).toBe("PLAYED");
    expect(mixer.play("special.puff")).toBe("PLAYED");
    expect(mixer.activeVoices).toBe(3);
    // A jingle (priority 3) takes the oldest of them.
    expect(mixer.play("city.capture")).toBe("PLAYED");
    expect(output.stopped).toEqual(["unit.step"]);
    expect(mixer.activeVoices).toBe(3);
    // Fill with jingles; a detail sound then finds no voice.
    expect(mixer.play("match.victory")).toBe("PLAYED");
    expect(mixer.play("city.levelup")).toBe("PLAYED");
    expect(output.stopped).toEqual([
      "unit.step",
      "special.pop",
      "special.puff",
    ]);
    expect(mixer.play("ui.click")).toBe("DROPPED");
    // Voices free themselves when their sound is over.
    advance(250);
    expect(mixer.activeVoices).toBe(0);
    expect(mixer.play("ui.click")).toBe("PLAYED");
  });

  it("never plays more than the default eight voices", () => {
    const { mixer, output } = mixerRig();
    const ids: SoundIdV1[] = [
      "attack.melee",
      "attack.ranged",
      "attack.siege",
      "attack.ray",
      "attack.magic",
      "attack.rocket",
      "attack.gatling",
      "attack.cannon",
      "attack.pop",
      "impact.hit",
      "impact.heavy",
    ];
    for (const id of ids) mixer.play(id);
    expect(mixer.activeVoices).toBe(DEFAULT_MAX_VOICES_V1);
    expect(output.started.length - output.stopped.length).toBe(
      DEFAULT_MAX_VOICES_V1,
    );
  });

  it("detunes within the entry's range and applies the category level", () => {
    const low = mixerRig({ random: 0 });
    const mid = mixerRig({ random: 0.5 });
    const high = mixerRig({ random: 0.999999 });
    for (const rig of [low, mid, high]) rig.mixer.play("impact.hit");
    // impact.hit detunes by up to 70 cents either way.
    expect(low.output.started[0]?.rate).toBeCloseTo(2 ** (-70 / 1200), 5);
    expect(mid.output.started[0]?.rate).toBeCloseTo(1, 5);
    expect(high.output.started[0]?.rate).toBeCloseTo(2 ** (70 / 1200), 4);
    expect(mid.output.started[0]?.gain).toBeCloseTo(
      DEFAULT_CATEGORY_GAINS_V1.combat,
      5,
    );
    // A tune is never detuned.
    high.mixer.play("match.victory");
    expect(high.output.started[1]?.rate).toBe(1);
    expect(high.output.started[1]?.category).toBe("ui");
    // A quieter request and a delay are passed on.
    mid.mixer.play("economy.build", { gain: 0.5, delayMs: 120 });
    expect(mid.output.started[1]?.gain).toBeCloseTo(
      0.5 * DEFAULT_CATEGORY_GAINS_V1.economy,
      5,
    );
    expect(mid.output.started[1]?.delaySeconds).toBeCloseTo(0.12, 5);
  });

  it("turns a crowded moment down and stops everything on request", () => {
    const { mixer, output } = mixerRig();
    const ids: SoundIdV1[] = [
      "attack.melee",
      "attack.ranged",
      "attack.siege",
      "attack.ray",
      "attack.magic",
    ];
    for (const id of ids) mixer.play(id);
    expect(output.started[0]?.gain).toBeCloseTo(0.9, 5);
    expect(output.started[4]?.gain).toBeCloseTo(0.9 * 0.75, 5);
    mixer.stopAll();
    expect(output.stopped).toEqual(ids);
    expect(mixer.activeVoices).toBe(0);
  });

  it("plays a fixed detune instead of the random one on request", () => {
    // The Gallery's "lower" and "higher": the two ends of the range.
    const { mixer, output, advance } = mixerRig({ random: 0.5 });
    mixer.play("impact.hit", { detune: -1 });
    advance(100);
    mixer.play("impact.hit", { detune: 1 });
    advance(100);
    mixer.play("impact.hit", { detune: 7 });
    advance(100);
    // A tune has no range: it keeps its pitch.
    mixer.play("match.victory", { detune: 1 });
    const [low, high, clamped, tune] = output.started.map(
      (start) => start.rate,
    );
    expect(low).toBeCloseTo(Math.pow(2, -70 / 1200), 6);
    expect(high).toBeCloseTo(Math.pow(2, 70 / 1200), 6);
    expect(clamped).toBe(high);
    expect(tune).toBe(1);
  });

  it("stops one sound so that it can start again at once", () => {
    const { mixer, output, advance } = mixerRig();
    expect(mixer.remainingMs("match.victory")).toBe(0);
    expect(mixer.play("match.victory")).toBe("PLAYED");
    expect(mixer.play("impact.hit")).toBe("PLAYED");
    // The fake device says every sound lasts 200 ms.
    expect(mixer.remainingMs("match.victory")).toBe(200);
    advance(50);
    expect(mixer.remainingMs("match.victory")).toBe(150);
    // Within the coalescing window a plain replay would be dropped.
    expect(mixer.play("match.victory")).toBe("COALESCED");
    mixer.stop("match.victory");
    expect(output.stopped).toEqual(["match.victory"]);
    expect(mixer.remainingMs("match.victory")).toBe(0);
    expect(mixer.activeVoices).toBe(1);
    expect(mixer.play("match.victory")).toBe("PLAYED");
    expect(mixer.remainingMs("match.victory")).toBe(200);
    advance(200);
    expect(mixer.remainingMs("match.victory")).toBe(0);
    // Stopping a sound that is not playing does nothing.
    mixer.stop("ui.click");
    expect(output.stopped).toEqual(["match.victory"]);
  });

  it("does not know an id that is in neither manifest list", () => {
    const { mixer, output } = mixerRig();
    expect(mixer.play("theme.nobody")).toBe("UNAVAILABLE");
    expect(output.started).toEqual([]);
  });

  it("reports a device that cannot start", () => {
    const { mixer, output } = mixerRig();
    output.unlocked = false;
    expect(mixer.play("ui.click")).toBe("UNAVAILABLE");
    expect(mixer.activeVoices).toBe(0);
    // Nothing was recorded for coalescing either.
    output.unlocked = true;
    expect(mixer.play("ui.click")).toBe("PLAYED");
  });
});

describe("sound preference", () => {
  it("defaults to on at 70%, and survives malformed values", () => {
    expect(DEFAULT_AUDIO_SETTINGS_V1).toEqual({ enabled: true, volume: 70 });
    expect(parseStoredAudioSettingsV1(null)).toEqual(DEFAULT_AUDIO_SETTINGS_V1);
    expect(parseStoredAudioSettingsV1("not json")).toEqual(
      DEFAULT_AUDIO_SETTINGS_V1,
    );
    expect(parseStoredAudioSettingsV1("7")).toEqual(DEFAULT_AUDIO_SETTINGS_V1);
    expect(
      parseStoredAudioSettingsV1('{"enabled":"yes","volume":"loud"}'),
    ).toEqual(DEFAULT_AUDIO_SETTINGS_V1);
    expect(parseStoredAudioSettingsV1('{"enabled":false,"volume":33}')).toEqual(
      { enabled: false, volume: 35 },
    );
    expect(clampAudioVolumeV1(140)).toBe(100);
    expect(clampAudioVolumeV1(-5)).toBe(0);
    expect(clampAudioVolumeV1(Number.NaN)).toBe(70);
    expect(audioVolumeGainV1(100)).toBe(1);
    expect(audioVolumeGainV1(50)).toBeCloseTo(0.25, 5);
    expect(audioVolumeGainV1(0)).toBe(0);
  });

  it("is stored under its own key and read back", () => {
    const storage = memoryStorage();
    expect(storeAudioSettingsV1(storage, { enabled: false, volume: 40 })).toBe(
      true,
    );
    expect(storage.values.get(AUDIO_SETTINGS_STORAGE_KEY_V1)).toBe(
      '{"enabled":false,"volume":40}',
    );
    expect(loadAudioSettingsV1(storage)).toEqual({
      enabled: false,
      volume: 40,
    });
    expect(loadAudioSettingsV1(null)).toEqual(DEFAULT_AUDIO_SETTINGS_V1);
    const broken = {
      getItem: (): string | null => {
        throw new Error("denied");
      },
      setItem: (): void => {
        throw new Error("denied");
      },
      removeItem: (): void => undefined,
    };
    expect(loadAudioSettingsV1(broken)).toEqual(DEFAULT_AUDIO_SETTINGS_V1);
    expect(storeAudioSettingsV1(broken, DEFAULT_AUDIO_SETTINGS_V1)).toBe(false);
  });
});

describe("game audio", () => {
  it("opens no device before a gesture and logs what it was asked", () => {
    const output = new FakeOutput();
    const audio = new GameAudioV1({ storage: null, output });
    expect(audio.settings).toEqual(DEFAULT_AUDIO_SETTINGS_V1);
    expect(output.unlockCalls).toBe(0);
    expect(audio.unlocked).toBe(false);
    expect(audio.play("impact.hit")).toBe("LOCKED");
    expect(output.started).toEqual([]);
    audio.unlock();
    expect(output.unlockCalls).toBe(1);
    expect(audio.unlocked).toBe(true);
    expect(audio.play("impact.hit")).toBe("PLAYED");
    expect(audio.log).toEqual([
      { id: "impact.hit", outcome: "LOCKED" },
      { id: "impact.hit", outcome: "PLAYED" },
    ]);
    audio.clearLog();
    expect(audio.log).toEqual([]);
    audio.destroy();
    expect(output.closed).toBe(true);
    expect(audio.play("impact.hit")).toBe("LOCKED");
  });

  it("is silent without a device", () => {
    const audio = new GameAudioV1({ storage: null, output: null });
    audio.unlock();
    expect(audio.unlocked).toBe(false);
    expect(audio.play("ui.click")).toBe("LOCKED");
    audio.playCues([{ id: "attack.melee", delayMs: 0 }]);
    expect(audio.log.map((entry) => entry.outcome)).toEqual([
      "LOCKED",
      "LOCKED",
    ]);
    // Node has no window and no WebAudio: no device can be made.
    expect(createWebAudioOutputV1(null)).toBeNull();
    expect(Reflect.get(globalThis, "AudioContext")).toBeUndefined();
  });

  it("mutes, restores and persists the preference", () => {
    const storage = memoryStorage();
    const output = new FakeOutput();
    const audio = new GameAudioV1({ storage, output });
    const seen: boolean[] = [];
    const unsubscribe = audio.subscribe((settings) =>
      seen.push(settings.enabled),
    );
    audio.unlock();
    expect(output.volume).toBeCloseTo(0.49, 5);
    audio.play("impact.heavy");
    expect(audio.setEnabled(false)).toBe(true);
    // Turning sound off cuts what is playing.
    expect(output.stopped).toEqual(["impact.heavy"]);
    expect(audio.play("impact.hit")).toBe("MUTED");
    expect(storage.values.get(AUDIO_SETTINGS_STORAGE_KEY_V1)).toBe(
      '{"enabled":false,"volume":70}',
    );
    expect(audio.setVolume(23)).toBe(true);
    expect(audio.settings).toEqual({ enabled: false, volume: 25 });
    expect(output.volume).toBeCloseTo(0.0625, 5);
    expect(audio.setEnabled(true)).toBe(true);
    expect(audio.play("impact.hit")).toBe("PLAYED");
    expect(seen).toEqual([false, false, true]);
    unsubscribe();
    // A new session reads the stored preference.
    const next = new GameAudioV1({ storage, output: new FakeOutput() });
    expect(next.settings).toEqual({ enabled: true, volume: 25 });
  });

  it("opens no device while sound is off, until it is turned on", () => {
    const storage = memoryStorage();
    storeAudioSettingsV1(storage, { enabled: false, volume: 70 });
    const output = new FakeOutput();
    const audio = new GameAudioV1({ storage, output });
    audio.unlock();
    expect(output.unlockCalls).toBe(0);
    // Turning sound on is a gesture of its own.
    audio.setEnabled(true);
    expect(output.unlockCalls).toBe(1);
    expect(audio.play("ui.toggle")).toBe("PLAYED");
  });

  it("makes no sound while the tab is hidden", () => {
    let hidden = false;
    const output = new FakeOutput();
    const audio = new GameAudioV1({
      storage: null,
      output,
      isHidden: () => hidden,
    });
    audio.unlock();
    expect(audio.play("turn.start")).toBe("PLAYED");
    hidden = true;
    expect(audio.play("impact.hit")).toBe("HIDDEN");
    expect(output.started.map((start) => start.id)).toEqual(["turn.start"]);
    hidden = false;
    expect(audio.play("impact.hit")).toBe("PLAYED");
  });

  it("scales cue delays with the animation speed", () => {
    const output = new FakeOutput();
    const audio = new GameAudioV1({ storage: null, output });
    audio.unlock();
    audio.playCues(
      [
        { id: "attack.melee", delayMs: 0 },
        { id: "impact.hit", delayMs: 128 },
        { id: "economy.build", delayMs: 0, gain: 0.6 },
      ],
      0.5,
    );
    expect(
      output.started.map((start) => [start.id, start.delaySeconds]),
    ).toEqual([
      ["attack.melee", 0],
      ["impact.hit", 0.064],
      ["economy.build", 0],
    ]);
    expect(output.started[2]?.gain).toBeCloseTo(
      0.6 * DEFAULT_CATEGORY_GAINS_V1.economy,
      5,
    );
  });

  it("keeps a bounded log", () => {
    const audio = new GameAudioV1({ storage: null, output: null });
    for (let i = 0; i < 200; i += 1) audio.play("ui.click");
    expect(audio.log.length).toBe(64);
  });
});
