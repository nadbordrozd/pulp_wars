import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  AUDIO_SETTINGS_STORAGE_KEY_V1,
  DEFAULT_AUDIO_SETTINGS_V1,
  DEFAULT_CATEGORY_GAINS_V1,
  GameAudioV1,
  MUSIC_CROSSFADE_SECONDS_V1,
  MUSIC_SETTINGS_STORAGE_KEY_V1,
  MusicPlayerV1,
  SOUND_THEMES_V1,
  SOUND_TITLE_THEME_ID_V1,
  THEME_MUSIC_PUBLIC_PATH_V1,
  THEME_MUSIC_TRACKS_V1,
  audioVolumeGainV1,
  clearSoundFilesV1,
  createWebAudioOutputV1,
  loadAudioSettingsV1,
  parseStoredAudioSettingsV1,
  soundThemeOfFactionV1,
  storeAudioSettingsV1,
  themeForSceneV1,
  type MusicTrackV1,
  type SoundKeyV1,
  type SoundThemeEntryV1,
} from "../../src/audio/index";
import {
  OFFERED_FACTION_IDS_V7,
  type FactionIdV7,
} from "../../src/engine/index";
import {
  installFakeAudioContext,
  type FakeAudioDeviceV1,
  type FakeAudioSourceV1,
} from "../fixtures/fake-audio-context";

/**
 * The theme music (bead pulp_wars-2yc.27, docs/ui/SOUND.md "Theme music")
 * on a stand-in device that keeps time: a theme is loaded when it is first
 * wanted and only the one that plays is held, two themes cross without
 * ever adding up to more than one, a loop's next pass starts on the audio
 * clock under the end of the last, Music and Sound are two levels with
 * two stored values, and the screen decides which theme plays.
 */

/** A decoded theme is this long in the stand-in device; a clip is short. */
const THEME_SECONDS = 20;
const CLIP_SECONDS = 0.5;

const TITLE = SOUND_TITLE_THEME_ID_V1;
const GOBLIN: SoundKeyV1 = "theme.goblin";
const UNDEAD: SoundKeyV1 = "theme.undead";

function themeGain(id: SoundKeyV1): number {
  const track = THEME_MUSIC_TRACKS_V1.find((entry) => entry.id === id);
  if (track === undefined) throw new Error(`No theme ${id}`);
  return DEFAULT_CATEGORY_GAINS_V1.music * track.gain;
}

function required<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) throw new Error("missing");
  return value;
}

/** Lets fetches and decodes settle. */
async function settle(): Promise<void> {
  for (let turn = 0; turn < 20; turn += 1) await Promise.resolve();
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

beforeEach(() => {
  vi.useFakeTimers();
  clearSoundFilesV1();
});

afterEach(() => {
  vi.useRealTimers();
  clearSoundFilesV1();
});

/** Moves the audio clock and the timers together, in small steps. */
async function run(device: FakeAudioDeviceV1, seconds: number): Promise<void> {
  const step = 0.05;
  for (let done = 0; done < seconds - 1e-9; done += step) {
    device.advance(step);
    await vi.advanceTimersByTimeAsync(step * 1000);
  }
}

// ------------------------------------------------------------ the player

interface RigV1 {
  readonly device: FakeAudioDeviceV1;
  readonly player: MusicPlayerV1;
  /** The themes asked for, in order. */
  readonly loads: string[];
  /** Ends the pending load of a theme (true: decoded; false: failed). */
  finish(id: string, ok?: boolean): Promise<void>;
  readonly ended: [string, string][];
  /** The sources that play a theme of this length. */
  sources(seconds: number): FakeAudioSourceV1[];
}

/** Each theme of the rig has its own length, so its sources can be told. */
const LENGTHS: Readonly<Record<string, number>> = {
  "theme.a": 20,
  "theme.b": 21,
  "theme.c": 22,
  "theme.once": 3,
};

function playerRig(
  overrides: Partial<Pick<MusicTrackV1, "overlapSeconds" | "gain">> = {},
): RigV1 {
  const browser = {} as unknown as Window & typeof globalThis;
  const device = installFakeAudioContext(browser);
  const Context = Reflect.get(
    browser,
    "AudioContext",
  ) as new () => AudioContext;
  const context = new Context();
  const destination = context.createGain();
  destination.connect(context.destination);
  const loads: string[] = [];
  const ended: [string, string][] = [];
  const pending = new Map<
    string,
    { resolve: (buffer: AudioBuffer) => void; reject: (error: Error) => void }[]
  >();
  const player = new MusicPlayerV1({
    context,
    destination,
    onEnded: (id, reason) => ended.push([id, reason]),
    track: (id) =>
      LENGTHS[id] === undefined
        ? null
        : {
            id,
            loop: id !== "theme.once",
            gain: overrides.gain ?? 1,
            overlapSeconds: overrides.overlapSeconds ?? 0,
            load: () => {
              loads.push(id);
              return new Promise<AudioBuffer>((resolve, reject) => {
                pending.set(id, [
                  ...(pending.get(id) ?? []),
                  { resolve, reject },
                ]);
              });
            },
          },
  });
  return {
    device,
    player,
    loads,
    ended,
    async finish(id, ok = true) {
      const next = required(pending.get(id)?.shift());
      if (ok)
        next.resolve(
          context.createBuffer(1, required(LENGTHS[id]) * 48_000, 48_000),
        );
      else next.reject(new Error("offline"));
      await settle();
    },
    sources: (seconds) =>
      device.sources.filter((source) => source.seconds === seconds),
  };
}

const A = "theme.a" as SoundKeyV1;
const B = "theme.b" as SoundKeyV1;
const C = "theme.c" as SoundKeyV1;
const ONCE = "theme.once" as SoundKeyV1;

describe("the music player", () => {
  it("loads a theme when it is first asked for, and holds only that one", async () => {
    const rig = playerRig();
    expect(rig.loads).toEqual([]);
    expect(rig.player.state).toMatchObject({
      wanted: null,
      playing: null,
      loading: null,
      heldBuffers: 0,
      loads: 0,
    });
    rig.player.set(A);
    expect(rig.loads).toEqual([A]);
    expect(rig.player.state).toMatchObject({
      wanted: A,
      playing: null,
      loading: A,
      heldBuffers: 0,
    });
    // Nothing is heard until it is decoded.
    expect(rig.device.sources).toEqual([]);
    await rig.finish(A);
    expect(rig.player.state).toMatchObject({
      wanted: A,
      playing: A,
      loading: null,
      heldBuffers: 1,
      heldBytes: 20 * 48_000 * 4,
    });
    expect(rig.sources(20)).toHaveLength(1);
    // Asking for it again changes nothing: no second load, no restart.
    rig.player.set(A);
    expect(rig.loads).toEqual([A]);
    expect(rig.sources(20)).toHaveLength(1);
    // It fades in from silence.
    const first = required(rig.sources(20)[0]);
    expect(first.levelAt(0)).toBe(0);
    await run(rig.device, 0.5);
    expect(first.levelAt(rig.device.now())).toBeCloseTo(1, 6);
  });

  it("crosses two themes without ever adding up to more than one", async () => {
    const rig = playerRig();
    rig.player.set(A);
    await rig.finish(A);
    await run(rig.device, 2);
    const a = required(rig.sources(20)[0]);
    rig.player.set(B);
    // The old theme plays on at full level while the new one loads.
    await run(rig.device, 1);
    expect(a.levelAt(rig.device.now())).toBeCloseTo(1, 6);
    expect(rig.player.state).toMatchObject({ playing: A, loading: B });
    await rig.finish(B);
    const b = required(rig.sources(21)[0]);
    const from = rig.device.now();
    expect(rig.player.state).toMatchObject({
      playing: B,
      heldBuffers: 2,
      peakHeldBuffers: 2,
    });
    // Across the crossfade the two levels add up to one theme, never more.
    let overlapped = 0;
    for (let step = 0; step <= 20; step += 1) {
      const time = from + (MUSIC_CROSSFADE_SECONDS_V1 * step) / 20;
      const sum = a.levelAt(time) + b.levelAt(time);
      expect(sum, `at ${time}`).toBeLessThanOrEqual(1 + 1e-9);
      expect(sum, `at ${time}`).toBeCloseTo(1, 6);
      if (a.levelAt(time) > 0.05 && b.levelAt(time) > 0.05) overlapped += 1;
    }
    // Both are heard for most of it: a crossfade, not a cut.
    expect(overlapped).toBeGreaterThan(12);
    expect(a.levelAt(from + MUSIC_CROSSFADE_SECONDS_V1)).toBeCloseTo(0, 6);
    expect(b.levelAt(from + MUSIC_CROSSFADE_SECONDS_V1)).toBeCloseTo(1, 6);
    // When it is over the old theme is stopped and its sound let go.
    await run(rig.device, MUSIC_CROSSFADE_SECONDS_V1 + 0.2);
    expect(a.stopped).toBe(true);
    expect(b.stopped).toBe(false);
    expect(rig.player.state).toMatchObject({
      playing: B,
      heldBuffers: 1,
      heldBytes: 21 * 48_000 * 4,
    });
    expect(rig.player.state.voices.map((voice) => voice.id)).toEqual([B]);
  });

  it("keeps the two levels under one theme when the first was still fading in", async () => {
    const rig = playerRig();
    rig.player.set(A);
    await rig.finish(A);
    rig.player.set(B);
    await rig.finish(B);
    // B has just begun to fade in over A; C replaces it at once.
    await run(rig.device, 0.2);
    rig.player.set(C);
    await rig.finish(C);
    const from = rig.device.now();
    const [a, b, c] = [20, 21, 22].map((seconds) =>
      required(rig.sources(seconds)[0]),
    );
    // What was already fading out (A) is cut: never three at once.
    expect(required(a).stopped).toBe(true);
    expect(rig.player.state.heldBuffers).toBe(2);
    for (let step = 0; step <= 20; step += 1) {
      const time = from + (MUSIC_CROSSFADE_SECONDS_V1 * step) / 20;
      expect(
        required(a).levelAt(time) +
          required(b).levelAt(time) +
          required(c).levelAt(time),
      ).toBeLessThanOrEqual(1 + 1e-9);
    }
    expect(rig.player.state.peakHeldBuffers).toBe(2);
  });

  it("drops a theme that was replaced while it loaded, unheard", async () => {
    const rig = playerRig();
    rig.player.set(A);
    await rig.finish(A);
    rig.player.set(B);
    rig.player.set(C);
    expect(rig.loads).toEqual([A, B, C]);
    // B arrives late and is dropped: A plays on until C is ready.
    await rig.finish(B);
    expect(rig.sources(21)).toEqual([]);
    expect(rig.player.state).toMatchObject({
      playing: A,
      loading: C,
      heldBuffers: 1,
    });
    await rig.finish(C);
    expect(rig.player.state).toMatchObject({ playing: C, wanted: C });
    // Going back to the theme that still plays needs no load at all.
    const rig2 = playerRig();
    rig2.player.set(A);
    await rig2.finish(A);
    rig2.player.set(B);
    rig2.player.set(A);
    await rig2.finish(B);
    expect(rig2.loads).toEqual([A, B]);
    expect(rig2.sources(21)).toEqual([]);
    expect(rig2.player.state).toMatchObject({
      playing: A,
      wanted: A,
      loading: null,
      heldBuffers: 1,
    });
  });

  it("holds at most two decoded themes however often the theme changes", async () => {
    const rig = playerRig();
    const order = [A, B, C, A, C, B, A, B];
    for (const id of order) {
      rig.player.set(id);
      await rig.finish(id);
      expect(rig.player.state.heldBuffers).toBeLessThanOrEqual(2);
      await run(rig.device, 1.5);
      expect(rig.player.state.heldBuffers).toBe(1);
    }
    expect(rig.player.state).toMatchObject({
      playing: B,
      loads: order.length,
      heldBuffers: 1,
      peakHeldBuffers: 2,
    });
    // Silence lets go of the last one too.
    rig.player.set(null);
    await run(rig.device, 1);
    expect(rig.player.state).toMatchObject({
      playing: null,
      wanted: null,
      heldBuffers: 0,
      heldBytes: 0,
    });
  });

  it("starts the next pass of a loop under the end of the last, on the clock", async () => {
    const overlap = 2;
    const rig = playerRig({ overlapSeconds: overlap });
    rig.player.set(A);
    await rig.finish(A);
    const start = rig.device.now();
    await run(rig.device, 2 * (20 - overlap) + 3);
    const passes = rig.sources(20);
    expect(passes).toHaveLength(3);
    // Each pass starts exactly `overlap` before the one before it ends.
    expect(passes.map((pass) => pass.at)).toEqual([
      start,
      start + 18,
      start + 36,
    ]);
    // One buffer, played again: nothing was loaded for the loop.
    expect(rig.loads).toEqual([A]);
    expect(rig.player.state.heldBuffers).toBe(1);
    const [first, second] = [required(passes[0]), required(passes[1])];
    // The ending pass is whole until the join, then goes down to nothing
    // at its last sample, while the new pass is at full level under it.
    expect(first.levelAt(start + 17.9)).toBeCloseTo(1, 6);
    expect(first.levelAt(start + 19)).toBeCloseTo(0.5, 6);
    expect(first.levelAt(start + 19.999)).toBeLessThan(0.001);
    expect(second.levelAt(start + 18)).toBe(0);
    expect(second.levelAt(start + 18.02)).toBeCloseTo(1, 6);
    expect(second.levelAt(start + 19)).toBeCloseTo(1, 6);
    // There is no moment without sound across two joins.
    for (let time = start + 17; time < start + 39; time += 0.05)
      expect(
        Math.max(...passes.map((pass) => pass.levelAt(time))),
        `at ${time}`,
      ).toBeGreaterThan(0.99);
  });

  it("joins a loop that has no overlap on the sample", async () => {
    const rig = playerRig();
    rig.player.set(A);
    await rig.finish(A);
    const start = rig.device.now();
    await run(rig.device, 41);
    const passes = rig.sources(20);
    expect(passes.map((pass) => pass.at)).toEqual([
      start,
      start + 20,
      start + 40,
    ]);
    expect(required(passes[0]).levelAt(start + 19.999)).toBeCloseTo(1, 6);
    expect(required(passes[1]).levelAt(start + 20)).toBeCloseTo(1, 6);
  });

  it("hands over no pass while it is paused, and goes on afterwards", async () => {
    const rig = playerRig({ overlapSeconds: 2 });
    rig.player.set(A);
    await rig.finish(A);
    const start = rig.device.now();
    await run(rig.device, 10);
    rig.player.pause();
    expect(rig.player.state.paused).toBe(true);
    // The tab is hidden for a minute: the audio clock stands still.
    await vi.advanceTimersByTimeAsync(60_000);
    expect(rig.sources(20)).toHaveLength(1);
    rig.player.resume();
    await run(rig.device, 9);
    // The next pass starts where the clock says, as if no time had passed.
    expect(rig.sources(20).map((pass) => pass.at)).toEqual([start, start + 18]);
  });

  it("says when a theme that does not loop has ended, or could not be loaded", async () => {
    const rig = playerRig();
    rig.player.set(ONCE);
    await rig.finish(ONCE);
    await run(rig.device, 3.2);
    expect(rig.ended).toEqual([[ONCE, "ENDED"]]);
    expect(rig.player.state).toMatchObject({
      playing: null,
      wanted: null,
      heldBuffers: 0,
    });
    // A theme that cannot be loaded leaves the one that plays in place.
    rig.player.set(A);
    await rig.finish(A);
    rig.player.set(B);
    await rig.finish(B, false);
    expect(rig.ended).toEqual([
      [ONCE, "ENDED"],
      [B, "FAILED"],
    ]);
    expect(rig.player.state).toMatchObject({ playing: A, wanted: A });
    rig.player.set("theme.nobody" as SoundKeyV1);
    expect(rig.ended.at(-1)).toEqual(["theme.nobody", "FAILED"]);
  });
});

// ------------------------------------------------------------ the device

type Reply = "OK" | "MISSING";

function browserWith(reply: (url: string) => Reply = () => "OK"): {
  browser: Window & typeof globalThis;
  device: FakeAudioDeviceV1;
  urls: string[];
} {
  const urls: string[] = [];
  const browser = {
    fetch(url: string): Promise<unknown> {
      urls.push(url);
      const ok = reply(url) === "OK";
      return Promise.resolve({
        ok,
        status: ok ? 200 : 404,
        arrayBuffer: () =>
          Promise.resolve(
            new TextEncoder().encode(
              url.includes(THEME_MUSIC_PUBLIC_PATH_V1) ? "THEME" : "CLIP",
            ).buffer,
          ),
      });
    },
  } as unknown as Window & typeof globalThis;
  const device = installFakeAudioContext(browser, {
    decode: (data) =>
      new TextDecoder().decode(data) === "THEME" ? THEME_SECONDS : CLIP_SECONDS,
  });
  return { browser, device, urls };
}

function gameAudio(
  options: {
    readonly storage?: ReturnType<typeof memoryStorage>;
    readonly reply?: (url: string) => Reply;
    readonly isHidden?: () => boolean;
  } = {},
): {
  audio: GameAudioV1;
  device: FakeAudioDeviceV1;
  urls: string[];
  themeUrls: () => string[];
  themeSources: () => FakeAudioSourceV1[];
} {
  const { browser, device, urls } = browserWith(options.reply);
  const audio = new GameAudioV1({
    storage: options.storage ?? null,
    output: required(createWebAudioOutputV1(browser)),
    ...(options.isHidden === undefined ? {} : { isHidden: options.isHidden }),
  });
  return {
    audio,
    device,
    urls,
    themeUrls: () =>
      urls.filter((url) => url.includes(THEME_MUSIC_PUBLIC_PATH_V1)),
    themeSources: () =>
      device.sources.filter((source) => source.seconds === THEME_SECONDS),
  };
}

function themeUrl(id: SoundKeyV1): string {
  const theme = required(SOUND_THEMES_V1.find((entry) => entry.id === id));
  if (theme.source.kind !== "FILE") throw new Error(`${id} is not a file`);
  return theme.source.url;
}

describe("theme music on the device", () => {
  it("fetches and decodes no theme before one is wanted", async () => {
    const { audio, device, urls } = gameAudio();
    // Nothing at all before a gesture, whatever the screen asks for.
    audio.setMusic(TITLE);
    await settle();
    expect(urls).toEqual([]);
    expect(device.contexts()).toBe(0);
    expect(audio.music).toMatchObject({
      scene: TITLE,
      wanted: null,
      player: null,
      requests: [],
    });
    audio.destroy();

    // With no theme asked for, the gesture loads the effects' clips only.
    const quiet = gameAudio();
    quiet.audio.unlock();
    await settle();
    expect(quiet.urls.length).toBeGreaterThan(0);
    expect(quiet.themeUrls()).toEqual([]);
    expect(quiet.device.decodes()).toBe(quiet.urls.length);
    expect(quiet.themeSources()).toEqual([]);
    expect(quiet.audio.music).toMatchObject({ wanted: null, requests: [] });
    expect(quiet.audio.music.player).toMatchObject({
      heldBuffers: 0,
      loads: 0,
    });
  });

  it("starts the screen's theme with the first gesture: one file, one buffer", async () => {
    const { audio, device, urls, themeUrls, themeSources } = gameAudio();
    audio.setMusic(TITLE);
    audio.unlock();
    await settle();
    // The title theme and no other; every other fetch is an effect's clip.
    expect(themeUrls()).toEqual([themeUrl(TITLE)]);
    expect(audio.music.requests).toEqual([themeUrl(TITLE)]);
    expect(device.decodes()).toBe(urls.length);
    expect(audio.music).toMatchObject({ scene: TITLE, wanted: TITLE });
    expect(audio.music.player).toMatchObject({
      playing: TITLE,
      heldBuffers: 1,
      loads: 1,
    });
    const [source] = themeSources();
    expect(themeSources()).toHaveLength(1);
    await run(device, 1);
    // Through the music level: its own gain, the mixer's music level and
    // the Music slider (70% by default), and not the effects' master.
    expect(required(source).levelAt(device.now())).toBeCloseTo(
      themeGain(TITLE) * audioVolumeGainV1(70),
      6,
    );
    expect(device.musicGain()).toBeCloseTo(audioVolumeGainV1(70), 9);
    expect(required(source).rate).toBe(1);
    // A later gesture, or the same theme again, loads nothing more.
    audio.unlock();
    audio.setMusic(TITLE);
    await settle();
    expect(themeUrls()).toHaveLength(1);
    expect(themeSources()).toHaveLength(1);
  });

  it("changes theme with the screen, holding one at a time", async () => {
    const { audio, device, themeUrls, themeSources } = gameAudio();
    audio.setMusic(TITLE);
    audio.unlock();
    await settle();
    await run(device, 1);
    const title = required(themeSources()[0]);
    // A match as the Goblins: their theme takes over from the title's.
    audio.setMusic(GOBLIN);
    await settle();
    expect(themeUrls()).toEqual([themeUrl(TITLE), themeUrl(GOBLIN)]);
    const goblin = required(themeSources()[1]);
    const from = device.now();
    const volume = audioVolumeGainV1(70);
    const loudest = Math.max(themeGain(TITLE), themeGain(GOBLIN)) * volume;
    let both = 0;
    for (let step = 0; step <= 16; step += 1) {
      const time = from + (MUSIC_CROSSFADE_SECONDS_V1 * step) / 16;
      const sum = title.levelAt(time) + goblin.levelAt(time);
      expect(sum).toBeLessThanOrEqual(loudest + 1e-9);
      if (title.levelAt(time) > 0 && goblin.levelAt(time) > 0) both += 1;
    }
    expect(both).toBeGreaterThan(10);
    await run(device, 1);
    expect(title.stopped).toBe(true);
    expect(goblin.levelAt(device.now())).toBeCloseTo(
      themeGain(GOBLIN) * volume,
      6,
    );
    expect(audio.music.player).toMatchObject({
      playing: GOBLIN,
      heldBuffers: 1,
      peakHeldBuffers: 2,
    });
    // Back to the menu, into another match, and so on: never more than
    // two decoded themes, and one once the crossfade is over.
    for (const id of [TITLE, UNDEAD, TITLE, GOBLIN, UNDEAD]) {
      audio.setMusic(id);
      await settle();
      expect(audio.music.player?.heldBuffers).toBeLessThanOrEqual(2);
      await run(device, 1);
      expect(audio.music.player).toMatchObject({
        playing: id,
        heldBuffers: 1,
        heldBytes: THEME_SECONDS * 48_000 * 2 * 4,
      });
    }
    expect(audio.music.player?.peakHeldBuffers).toBe(2);
    expect(audio.music.player?.loads).toBe(7);
  });

  it("does not decode the themes skipped through on the way to one", async () => {
    const { audio, device, themeUrls, themeSources } = gameAudio();
    audio.unlock();
    await settle();
    const clips = device.decodes();
    // The player runs through the factions on New game faster than a
    // theme loads: each is asked for, only the last is decoded and heard.
    audio.setMusic(GOBLIN);
    audio.setMusic(UNDEAD);
    audio.setMusic(TITLE);
    await settle();
    expect(themeUrls()).toEqual([
      themeUrl(GOBLIN),
      themeUrl(UNDEAD),
      themeUrl(TITLE),
    ]);
    expect(device.decodes()).toBe(clips + 1);
    expect(themeSources()).toHaveLength(1);
    expect(audio.music.player).toMatchObject({
      playing: TITLE,
      heldBuffers: 1,
      peakHeldBuffers: 1,
    });
  });

  it("loops a theme with the overlap its recording was measured to need", async () => {
    const { audio, device, themeSources } = gameAudio();
    audio.setMusic(TITLE);
    audio.unlock();
    await settle();
    const overlap = required(
      THEME_MUSIC_TRACKS_V1.find((track) => track.id === TITLE),
    ).loopOverlapSeconds;
    expect(overlap).toBeGreaterThan(0);
    await run(device, 2 * (THEME_SECONDS - overlap) + 1);
    const passes = themeSources();
    expect(passes).toHaveLength(3);
    const [first, second, third] = passes.map((pass) => pass.at);
    expect(required(second) - required(first)).toBeCloseTo(
      THEME_SECONDS - overlap,
      9,
    );
    expect(required(third) - required(second)).toBeCloseTo(
      THEME_SECONDS - overlap,
      9,
    );
    // No pass is a looping source: the player schedules each one.
    for (const pass of passes) expect(pass.loop).toBe(false);
  });

  it("has two levels: Music at zero silences the music and not an effect", async () => {
    const { audio, device, themeSources } = gameAudio();
    audio.setMusic(TITLE);
    audio.unlock();
    await settle();
    await run(device, 1);
    const theme = required(themeSources()[0]);
    audio.setMusicVolume(0);
    expect(device.musicGain()).toBe(0);
    expect(theme.levelAt(device.now())).toBe(0);
    // The effects are untouched.
    expect(device.masterGain()).toBeCloseTo(audioVolumeGainV1(70), 9);
    expect(audio.play("impact.hit")).toBe("PLAYED");
    const effect = required(device.sources.at(-1));
    expect(effect.seconds).not.toBe(THEME_SECONDS);
    expect(effect.levelAt(device.now())).toBeGreaterThan(0);
    // At zero nothing is held either.
    await run(device, 1);
    expect(theme.stopped).toBe(true);
    expect(audio.music).toMatchObject({ scene: TITLE, wanted: null });
    expect(audio.music.player).toMatchObject({ playing: null, heldBuffers: 0 });
    // Turned up again, the screen's theme comes back.
    audio.setMusicVolume(40);
    await settle();
    await run(device, 1);
    const again = required(themeSources().at(-1));
    expect(again).not.toBe(theme);
    expect(again.levelAt(device.now())).toBeCloseTo(
      themeGain(TITLE) * audioVolumeGainV1(40),
      6,
    );
  });

  it("has two levels: Sound at zero or off silences the effects and not the music", async () => {
    const { audio, device, themeSources } = gameAudio();
    audio.setMusic(TITLE);
    audio.unlock();
    await settle();
    await run(device, 1);
    const theme = required(themeSources()[0]);
    const level = themeGain(TITLE) * audioVolumeGainV1(70);
    audio.setVolume(0);
    expect(device.masterGain()).toBe(0);
    expect(audio.play("impact.hit")).toBe("PLAYED");
    expect(required(device.sources.at(-1)).levelAt(device.now())).toBe(0);
    expect(theme.levelAt(device.now())).toBeCloseTo(level, 6);
    audio.setVolume(70);
    audio.setEnabled(false);
    expect(audio.play("impact.hit")).toBe("MUTED");
    expect(theme.stopped).toBe(false);
    expect(theme.levelAt(device.now())).toBeCloseTo(level, 6);
    expect(audio.music.player).toMatchObject({ playing: TITLE });
    // Music off ends the music; the effects' switch is its own.
    audio.setEnabled(true);
    audio.setMusicEnabled(false);
    await run(device, 1);
    expect(theme.stopped).toBe(true);
    expect(audio.play("impact.hit")).toBe("PLAYED");
    expect(audio.settings).toEqual({
      enabled: true,
      volume: 70,
      musicEnabled: false,
      musicVolume: 70,
    });
  });

  it("opens the device for music alone, and for nothing with both off", async () => {
    const storage = memoryStorage();
    storeAudioSettingsV1(storage, {
      enabled: false,
      volume: 70,
      musicEnabled: false,
      musicVolume: 70,
    });
    const off = gameAudio({ storage });
    off.audio.setMusic(TITLE);
    off.audio.unlock();
    await settle();
    expect(off.device.contexts()).toBe(0);
    expect(off.urls).toEqual([]);
    // Turning Music on is a gesture of its own, and starts the theme.
    off.audio.setMusicEnabled(true);
    await settle();
    expect(off.device.contexts()).toBe(1);
    expect(off.themeUrls()).toEqual([themeUrl(TITLE)]);
    expect(off.audio.play("impact.hit")).toBe("MUTED");
    expect(off.audio.music.player).toMatchObject({ playing: TITLE });
  });

  it("pauses with a hidden tab and goes on when it is shown", async () => {
    let hidden = false;
    const { audio, device, themeSources } = gameAudio({
      isHidden: () => hidden,
    });
    audio.setMusic(TITLE);
    audio.unlock();
    await settle();
    await run(device, 3);
    audio.play("match.victory");
    const effect = required(device.sources.at(-1));
    hidden = true;
    audio.visibilityChanged();
    await settle();
    // The clock stops: the theme is not stopped, it waits where it is.
    expect(device.state()).toBe("suspended");
    expect(effect.stopped).toBe(true);
    expect(required(themeSources()[0]).stopped).toBe(false);
    expect(audio.music.player).toMatchObject({ playing: TITLE, paused: true });
    const at = device.now();
    await run(device, 30);
    expect(device.now()).toBe(at);
    expect(themeSources()).toHaveLength(1);
    expect(audio.play("impact.hit")).toBe("HIDDEN");
    // A gesture cannot start the clock of a hidden tab.
    audio.unlock();
    await settle();
    expect(device.state()).toBe("suspended");
    hidden = false;
    audio.visibilityChanged();
    await settle();
    expect(device.state()).toBe("running");
    expect(audio.music.player).toMatchObject({ playing: TITLE, paused: false });
    await run(device, 1);
    expect(device.now()).toBeCloseTo(at + 1, 6);
    expect(themeSources()).toHaveLength(1);
    expect(audio.play("impact.hit")).toBe("PLAYED");
  });

  it("plays a theme over the screen's own for the Gallery, and gives it back", async () => {
    const { audio, device, themeSources } = gameAudio();
    audio.setMusic(TITLE);
    expect(audio.play(GOBLIN)).toBe("LOCKED");
    audio.unlock();
    await settle();
    expect(audio.play(GOBLIN)).toBe("PLAYED");
    expect(audio.log.at(-1)).toEqual({ id: GOBLIN, outcome: "PLAYED" });
    expect(audio.remainingMs(GOBLIN)).toBe(Infinity);
    expect(audio.remainingMs(TITLE)).toBe(0);
    await settle();
    await run(device, 1);
    expect(audio.music).toMatchObject({
      scene: TITLE,
      audition: GOBLIN,
      wanted: GOBLIN,
    });
    expect(audio.music.player).toMatchObject({ playing: GOBLIN });
    // Another theme takes its place: one music voice.
    expect(audio.play(UNDEAD)).toBe("PLAYED");
    expect(audio.remainingMs(GOBLIN)).toBe(0);
    await settle();
    await run(device, 1);
    expect(audio.music.player).toMatchObject({
      playing: UNDEAD,
      heldBuffers: 1,
    });
    // An effect plays over the music and does not end it.
    expect(audio.play("impact.hit")).toBe("PLAYED");
    expect(required(themeSources().at(-1)).stopped).toBe(false);
    // Stopped, the screen's own theme returns.
    audio.stop(UNDEAD);
    expect(audio.remainingMs(UNDEAD)).toBe(0);
    await settle();
    await run(device, 1);
    expect(audio.music).toMatchObject({ audition: null, wanted: TITLE });
    expect(audio.music.player).toMatchObject({ playing: TITLE });
    // With Music off a theme is not played, whatever Sound says.
    audio.setMusicEnabled(false);
    expect(audio.play(GOBLIN)).toBe("MUTED");
    audio.setMusicEnabled(true);
    audio.setMusicVolume(0);
    expect(audio.play(GOBLIN)).toBe("MUTED");
    audio.setMusicVolume(70);
    audio.setEnabled(false);
    expect(audio.play(GOBLIN)).toBe("PLAYED");
  });

  it("tells its listeners when a theme could not be loaded", async () => {
    const { audio } = gameAudio({
      reply: (url) =>
        url.includes(THEME_MUSIC_PUBLIC_PATH_V1) ? "MISSING" : "OK",
    });
    audio.unlock();
    await settle();
    let told = 0;
    audio.subscribe(() => (told += 1));
    expect(audio.play(GOBLIN)).toBe("PLAYED");
    await settle();
    expect(told).toBe(1);
    expect(audio.remainingMs(GOBLIN)).toBe(0);
    expect(audio.music).toMatchObject({ audition: null, wanted: null });
    expect(audio.music.player).toMatchObject({ playing: null, heldBuffers: 0 });
  });
});

// ------------------------------------------------------------- the scene

describe("which theme a screen plays", () => {
  it("plays the title theme on the menus", () => {
    expect(themeForSceneV1({ kind: "MENU" })).toBe(TITLE);
    expect(themeForSceneV1({ kind: "SETUP", preview: null })).toBe(TITLE);
  });

  it("plays the chosen faction's theme on New game once one was chosen", () => {
    for (const faction of OFFERED_FACTION_IDS_V7)
      expect(themeForSceneV1({ kind: "SETUP", preview: faction })).toBe(
        required(soundThemeOfFactionV1(faction)).id,
      );
    expect(themeForSceneV1({ kind: "SETUP", preview: "GOBLIN" })).toBe(GOBLIN);
  });

  it("plays the viewing player's own faction theme for the whole match", () => {
    const themes = OFFERED_FACTION_IDS_V7.map((faction) =>
      themeForSceneV1({ kind: "MATCH", viewer: faction }),
    );
    // Every faction has its own, and none is the title theme.
    expect(new Set(themes).size).toBe(OFFERED_FACTION_IDS_V7.length);
    expect(themes).not.toContain(TITLE);
    expect(themes).not.toContain(null);
    expect(themeForSceneV1({ kind: "MATCH", viewer: "UNDEAD" })).toBe(UNDEAD);
    expect(themeForSceneV1({ kind: "MATCH", viewer: "ORIGINAL" })).toBe(
      "theme.human",
    );
    // The Cultists (`pulp_wars-mch9.3`) are registered without a theme: a
    // match shown to a Cult seat is silent, and New game keeps the title
    // theme (the screen never offers them).
    expect(themeForSceneV1({ kind: "MATCH", viewer: "CULT" })).toBeNull();
    expect(themeForSceneV1({ kind: "SETUP", preview: "CULT" })).toBe(TITLE);
  });

  it("changes at the hand-over when two people share the screen", () => {
    // The viewer is who the screen is shown to: it changes when the next
    // human takes over, and stays through the AI turns in between.
    const viewers: FactionIdV7[] = [
      "GOBLIN",
      "GOBLIN",
      "UNDEAD",
      "UNDEAD",
      "GOBLIN",
    ];
    expect(
      viewers.map((viewer) => themeForSceneV1({ kind: "MATCH", viewer })),
    ).toEqual([GOBLIN, GOBLIN, UNDEAD, UNDEAD, GOBLIN]);
  });

  it("is silent on the Gallery's Sounds tab, and without a theme", () => {
    expect(themeForSceneV1({ kind: "SOUNDS" })).toBeNull();
    const only: readonly SoundThemeEntryV1[] = [
      {
        id: "theme.goblin",
        faction: "GOBLIN",
        loop: true,
        source: { kind: "FILE", url: "theme-goblin.m4a" },
      },
    ];
    expect(themeForSceneV1({ kind: "MENU" }, only)).toBeNull();
    expect(
      themeForSceneV1({ kind: "MATCH", viewer: "UNDEAD" }, only),
    ).toBeNull();
    expect(
      themeForSceneV1({ kind: "SETUP", preview: "UNDEAD" }, only),
    ).toBeNull();
    expect(themeForSceneV1({ kind: "SETUP", preview: "GOBLIN" }, only)).toBe(
      "theme.goblin",
    );
  });

  it("is what the audio is asked for: one switch per change of scene", async () => {
    const { audio, device, themeUrls } = gameAudio();
    audio.unlock();
    const scenes = [
      themeForSceneV1({ kind: "MENU" }),
      themeForSceneV1({ kind: "SETUP", preview: null }),
      themeForSceneV1({ kind: "SETUP", preview: "GOBLIN" }),
      themeForSceneV1({ kind: "MATCH", viewer: "GOBLIN" }),
      themeForSceneV1({ kind: "MATCH", viewer: "GOBLIN" }),
      themeForSceneV1({ kind: "MENU" }),
    ];
    for (const scene of scenes) {
      audio.setMusic(scene);
      await settle();
      await run(device, 1);
    }
    // The menu and New game share the title theme; the theme chosen on
    // New game plays on into the match without starting again.
    expect(themeUrls()).toEqual([
      themeUrl(TITLE),
      themeUrl(GOBLIN),
      themeUrl(TITLE),
    ]);
  });
});

// -------------------------------------------------------- the preference

describe("the Music and Sound preference", () => {
  it("defaults to both on at 70%", () => {
    expect(DEFAULT_AUDIO_SETTINGS_V1).toEqual({
      enabled: true,
      volume: 70,
      musicEnabled: true,
      musicVolume: 70,
    });
    expect(parseStoredAudioSettingsV1(null, null)).toEqual(
      DEFAULT_AUDIO_SETTINGS_V1,
    );
  });

  it("gives the music the stored single volume and mute of before", () => {
    // What a browser stored while there was one level only.
    expect(
      parseStoredAudioSettingsV1('{"enabled":true,"volume":30}', null),
    ).toEqual({
      enabled: true,
      volume: 30,
      musicEnabled: true,
      musicVolume: 30,
    });
    // A player who had muted the game does not get music.
    expect(
      parseStoredAudioSettingsV1('{"enabled":false,"volume":55}', null),
    ).toEqual({
      enabled: false,
      volume: 55,
      musicEnabled: false,
      musicVolume: 55,
    });
    const storage = memoryStorage();
    storage.setItem(
      AUDIO_SETTINGS_STORAGE_KEY_V1,
      '{"enabled":false,"volume":20}',
    );
    const audio = new GameAudioV1({ storage, output: null });
    expect(audio.settings).toEqual({
      enabled: false,
      volume: 20,
      musicEnabled: false,
      musicVolume: 20,
    });
    // Reading alone writes nothing.
    expect(storage.values.has(MUSIC_SETTINGS_STORAGE_KEY_V1)).toBe(false);
  });

  it("stores the two levels apart, so that neither follows the other", () => {
    const storage = memoryStorage();
    storage.setItem(
      AUDIO_SETTINGS_STORAGE_KEY_V1,
      '{"enabled":true,"volume":30}',
    );
    const audio = new GameAudioV1({ storage, output: null });
    // The first change of either stores both, each under its key.
    expect(audio.setVolume(80)).toBe(true);
    expect(storage.values.get(AUDIO_SETTINGS_STORAGE_KEY_V1)).toBe(
      '{"enabled":true,"volume":80}',
    );
    expect(storage.values.get(MUSIC_SETTINGS_STORAGE_KEY_V1)).toBe(
      '{"enabled":true,"volume":30}',
    );
    expect(audio.setMusicVolume(13)).toBe(true);
    expect(audio.setMusicEnabled(false)).toBe(true);
    expect(storage.values.get(AUDIO_SETTINGS_STORAGE_KEY_V1)).toBe(
      '{"enabled":true,"volume":80}',
    );
    expect(storage.values.get(MUSIC_SETTINGS_STORAGE_KEY_V1)).toBe(
      '{"enabled":false,"volume":15}',
    );
    // A new session reads both back; the music no longer follows Sound.
    expect(loadAudioSettingsV1(storage)).toEqual({
      enabled: true,
      volume: 80,
      musicEnabled: false,
      musicVolume: 15,
    });
    expect(audio.setEnabled(false)).toBe(true);
    expect(new GameAudioV1({ storage, output: null }).settings).toEqual({
      enabled: false,
      volume: 80,
      musicEnabled: false,
      musicVolume: 15,
    });
  });

  it("survives a malformed music value", () => {
    expect(
      parseStoredAudioSettingsV1('{"enabled":true,"volume":40}', "not json"),
    ).toEqual({
      enabled: true,
      volume: 40,
      musicEnabled: true,
      musicVolume: 40,
    });
    expect(
      parseStoredAudioSettingsV1(null, '{"enabled":false,"volume":140}'),
    ).toEqual({
      enabled: true,
      volume: 70,
      musicEnabled: false,
      musicVolume: 100,
    });
    const listeners: boolean[] = [];
    const audio = new GameAudioV1({ storage: null, output: null });
    audio.subscribe((settings) => listeners.push(settings.musicEnabled));
    audio.setMusicEnabled(false);
    audio.setMusicEnabled(false);
    audio.setMusicVolume(70);
    expect(listeners).toEqual([false]);
  });
});
