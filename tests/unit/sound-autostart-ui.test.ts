import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  GameAudioV1,
  SOUND_THEMES_V1,
  SOUND_TITLE_THEME_ID_V1,
  THEME_MUSIC_PUBLIC_PATH_V1,
  clearSoundFilesV1,
  createWebAudioOutputV1,
  soundFileBytesV1,
  storeAudioSettingsV1,
  type SoundKeyV1,
} from "../../src/audio/index";
import {
  installFakeAudioContext,
  type FakeAudioDeviceV1,
  type FakeAudioSourceV1,
} from "../fixtures/fake-audio-context";

/**
 * Bead pulp_wars-2yc.107: the music did not always start once the game had
 * loaded. Its file was fetched only when the first gesture asked for it,
 * and only then decoded. The start now fetches the title theme with the
 * art (src/app/v7-preload-boot.ts), and once the game is up the device
 * opens without waiting for a gesture (`startWhenAllowed`): where the
 * browser allows sound the theme starts at once, from the bytes already
 * fetched; where it does not, the device waits suspended with the theme
 * decoded, and the first gesture starts it. The preference is respected,
 * and a slow file holds nothing back.
 */

const TITLE = SOUND_TITLE_THEME_ID_V1;
const THEME_SECONDS = 20;
const CLIP_SECONDS = 0.5;

function required<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) throw new Error("missing");
  return value;
}

async function settle(): Promise<void> {
  for (let turn = 0; turn < 20; turn += 1) await Promise.resolve();
}

async function run(device: FakeAudioDeviceV1, seconds: number): Promise<void> {
  const step = 0.05;
  for (let done = 0; done < seconds - 1e-9; done += step) {
    device.advance(step);
    await vi.advanceTimersByTimeAsync(step * 1000);
  }
}

function themeUrl(id: SoundKeyV1): string {
  const theme = required(SOUND_THEMES_V1.find((entry) => entry.id === id));
  if (theme.source.kind !== "FILE") throw new Error(`${id} is not a file`);
  return theme.source.url;
}

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => void values.set(key, value),
    removeItem: (key: string) => void values.delete(key),
  };
}

interface Reply {
  readonly ok: boolean;
  readonly status: number;
  arrayBuffer(): Promise<ArrayBuffer>;
}

function rig(
  options: {
    readonly startSuspended?: boolean;
    readonly autoplayPolicy?: string;
    readonly storage?: ReturnType<typeof memoryStorage>;
    /** Holds a theme's fetch until the test lets it go. */
    readonly holdThemes?: boolean;
  } = {},
) {
  const urls: string[] = [];
  const held: (() => void)[] = [];
  const bytes = (url: string): ArrayBuffer =>
    new TextEncoder().encode(
      url.includes(THEME_MUSIC_PUBLIC_PATH_V1) ? "THEME" : "CLIP",
    ).buffer;
  const browser = {
    ...(options.autoplayPolicy === undefined
      ? {}
      : {
          navigator: { getAutoplayPolicy: () => options.autoplayPolicy },
        }),
    fetch(url: string): Promise<Reply> {
      urls.push(url);
      const reply: Reply = {
        ok: true,
        status: 200,
        arrayBuffer: () => Promise.resolve(bytes(url)),
      };
      if (
        options.holdThemes === true &&
        url.includes(THEME_MUSIC_PUBLIC_PATH_V1)
      )
        return new Promise((resolve) => held.push(() => resolve(reply)));
      return Promise.resolve(reply);
    },
  } as unknown as Window & typeof globalThis;
  const device = installFakeAudioContext(browser, {
    decode: (data) =>
      new TextDecoder().decode(data) === "THEME" ? THEME_SECONDS : CLIP_SECONDS,
    ...(options.startSuspended === undefined
      ? {}
      : { startSuspended: options.startSuspended }),
  });
  const audio = new GameAudioV1({
    storage: options.storage ?? null,
    output: required(createWebAudioOutputV1(browser)),
  });
  return {
    audio,
    device,
    urls,
    /** What the start's preload does: the theme's bytes into the store. */
    preloadTitle: () =>
      soundFileBytesV1(themeUrl(TITLE), (url) =>
        (browser.fetch as unknown as (url: string) => Promise<Reply>)(url),
      ).catch(() => undefined),
    releaseThemes: () => {
      for (const release of held.splice(0)) release();
    },
    themeUrls: () =>
      urls.filter((url) => url.includes(THEME_MUSIC_PUBLIC_PATH_V1)),
    themeSources: (): FakeAudioSourceV1[] =>
      device.sources.filter((source) => source.seconds === THEME_SECONDS),
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

describe("music once the game has loaded", () => {
  it("starts the title theme at once where the browser allows sound, from the bytes the start fetched", async () => {
    const { audio, device, preloadTitle, themeUrls, themeSources } = rig();
    void preloadTitle();
    audio.setMusic(TITLE);
    await settle();
    // Before the game has loaded nothing is opened.
    expect(device.contexts()).toBe(0);
    audio.startWhenAllowed();
    await settle();
    expect(device.contexts()).toBe(1);
    expect(audio.unlocked).toBe(true);
    expect(audio.music.player).toMatchObject({ playing: TITLE, paused: false });
    // One fetch of the theme: the start's.
    expect(themeUrls()).toEqual([themeUrl(TITLE)]);
    expect(themeSources()).toHaveLength(1);
    await run(device, 1);
    expect(required(themeSources()[0]).levelAt(device.now())).toBeGreaterThan(
      0,
    );
    expect(audio.play("impact.hit")).toBe("PLAYED");
    audio.destroy();
  });

  it("waits for the first gesture where the browser does not allow sound yet, with the theme already decoded", async () => {
    const { audio, device, preloadTitle, themeUrls, themeSources } = rig({
      startSuspended: true,
    });
    void preloadTitle();
    audio.setMusic(TITLE);
    audio.startWhenAllowed();
    await settle();
    expect(device.contexts()).toBe(1);
    expect(device.state()).toBe("suspended");
    // Decoded and in place, the clock not running: nothing is heard.
    expect(audio.music.player).toMatchObject({
      playing: TITLE,
      heldBuffers: 1,
      paused: true,
    });
    expect(audio.unlocked).toBe(false);
    expect(audio.play("impact.hit")).toBe("LOCKED");
    await run(device, 5);
    expect(device.now()).toBe(0);
    // The first gesture: the clock runs and the theme is heard at once,
    // with nothing more fetched.
    audio.unlock();
    await settle();
    expect(device.state()).toBe("running");
    expect(audio.unlocked).toBe(true);
    expect(audio.music.player).toMatchObject({ playing: TITLE, paused: false });
    await run(device, 1);
    expect(required(themeSources()[0]).levelAt(device.now())).toBeGreaterThan(
      0,
    );
    expect(themeUrls()).toEqual([themeUrl(TITLE)]);
    expect(themeSources()).toHaveLength(1);
    expect(audio.play("impact.hit")).toBe("PLAYED");
    audio.destroy();
  });

  it("starts when the browser lets the waiting device run by itself", async () => {
    const { audio, device } = rig({ startSuspended: true });
    audio.setMusic(TITLE);
    audio.startWhenAllowed();
    await settle();
    expect(audio.music.player).toMatchObject({ paused: true });
    device.allow();
    await settle();
    expect(audio.unlocked).toBe(true);
    expect(audio.music.player).toMatchObject({ playing: TITLE, paused: false });
    audio.destroy();
  });

  it("opens nothing before a gesture where the browser says sound needs one", async () => {
    const { audio, device, themeUrls } = rig({ autoplayPolicy: "disallowed" });
    audio.setMusic(TITLE);
    audio.startWhenAllowed();
    await settle();
    expect(device.contexts()).toBe(0);
    expect(themeUrls()).toEqual([]);
    audio.unlock();
    await settle();
    expect(device.contexts()).toBe(1);
    expect(audio.music.player).toMatchObject({ playing: TITLE });
    audio.destroy();
  });

  it("respects the preference: nothing with both off, no theme with Music off", async () => {
    const off = memoryStorage();
    storeAudioSettingsV1(off, {
      enabled: false,
      volume: 70,
      musicEnabled: false,
      musicVolume: 70,
    });
    const silent = rig({ storage: off });
    silent.audio.setMusic(TITLE);
    silent.audio.startWhenAllowed();
    await settle();
    expect(silent.device.contexts()).toBe(0);
    expect(silent.urls).toEqual([]);
    silent.audio.destroy();

    const noMusic = memoryStorage();
    storeAudioSettingsV1(noMusic, {
      enabled: true,
      volume: 70,
      musicEnabled: true,
      musicVolume: 0,
    });
    const effects = rig({ storage: noMusic });
    effects.audio.setMusic(TITLE);
    effects.audio.startWhenAllowed();
    await settle();
    expect(effects.device.contexts()).toBe(1);
    expect(effects.themeUrls()).toEqual([]);
    expect(effects.audio.music.wanted).toBeNull();
    effects.audio.destroy();
  });

  it("holds nothing back for a slow theme file: it plays when it arrives", async () => {
    const {
      audio,
      device,
      preloadTitle,
      releaseThemes,
      themeSources,
      themeUrls,
    } = rig({ holdThemes: true });
    void preloadTitle();
    audio.setMusic(TITLE);
    audio.startWhenAllowed();
    await settle();
    // The effects play meanwhile; the theme is still on its way.
    expect(audio.play("impact.hit")).toBe("PLAYED");
    expect(themeSources()).toEqual([]);
    expect(audio.music.player).toMatchObject({ loading: TITLE });
    await run(device, 3);
    releaseThemes();
    await settle();
    expect(themeSources()).toHaveLength(1);
    expect(audio.music.player).toMatchObject({ playing: TITLE });
    // The start's fetch was the only one.
    expect(themeUrls()).toEqual([themeUrl(TITLE)]);
    audio.destroy();
  });

  it("fetches the theme itself when the start's fetch failed", async () => {
    const { audio, themeSources, themeUrls } = rig();
    const failed = soundFileBytesV1(themeUrl(TITLE), () =>
      Promise.reject(new Error("offline")),
    ).catch(() => undefined);
    await failed;
    audio.setMusic(TITLE);
    audio.startWhenAllowed();
    await settle();
    expect(themeUrls()).toEqual([themeUrl(TITLE)]);
    expect(themeSources()).toHaveLength(1);
    audio.destroy();
  });
});
