import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  DEFAULT_CATEGORY_GAINS_V1,
  GameAudioV1,
  OTHER_PLAYER_BUILD_GAIN_V7,
  SOUND_MANIFEST_V1,
  STOCK_SOUND_CLIPS_V1,
  clearSoundFilesV1,
  createWebAudioOutputV1,
  prefetchSoundFilesV1,
  requestedSoundFilesV1,
  soundFileBytesV1,
  soundRecipeV1,
  stockSoundClipV1,
  stockSoundUrlV1,
  synthRecipeDurationMsV1,
  type SoundIdV1,
  type WebAudioOutputV1,
} from "../../src/audio/index";
import {
  installFakeAudioContext,
  type FakeAudioDeviceV1,
} from "../fixtures/fake-audio-context";

/**
 * A sound backed by a recorded clip (bead pulp_wars-2yc.20, docs/ui/SOUND.md
 * "Stock recordings"), on a stand-in device: the clip plays once it is
 * decoded, the synthesised sound until then and whenever the clip cannot
 * be fetched or decoded, and the mixer's detune, levels, stop and length
 * work for a clip as they do for a synthesised sound.
 */

/** A decoded clip is this long in the stand-in device. */
const CLIP_SECONDS = 0.777;
const HIT: SoundIdV1 = "impact.hit";
const BUILD: SoundIdV1 = "economy.build";

interface FetchLogV1 {
  readonly urls: string[];
}

type Reply = "OK" | "MISSING" | "BROKEN" | "OFFLINE" | "THROWS";

/** A window with a sound device and a `fetch` that answers per file. */
function browserWith(
  reply: (url: string) => Reply,
  log: FetchLogV1,
): { browser: Window & typeof globalThis; device: FakeAudioDeviceV1 } {
  const browser = {
    fetch(url: string): Promise<unknown> {
      log.urls.push(url);
      const answer = reply(url);
      if (answer === "THROWS") throw new Error("fetch is not allowed here");
      if (answer === "OFFLINE") return Promise.reject(new Error("offline"));
      return Promise.resolve({
        ok: answer !== "MISSING",
        status: answer === "MISSING" ? 404 : 200,
        arrayBuffer: () =>
          Promise.resolve(
            new TextEncoder().encode(answer === "BROKEN" ? "BAD" : "CLIP")
              .buffer,
          ),
      });
    },
  } as unknown as Window & typeof globalThis;
  const device = installFakeAudioContext(browser, {
    decode(data) {
      if (new TextDecoder().decode(data) !== "CLIP")
        throw new Error("Unable to decode audio data");
      return CLIP_SECONDS;
    },
  });
  return { browser, device };
}

/** Lets the fetch and the decode of every clip settle. */
async function settle(): Promise<void> {
  for (let turn = 0; turn < 20; turn += 1) await Promise.resolve();
}

function synthSeconds(id: SoundIdV1): number {
  const recipe = soundRecipeV1(id);
  if (recipe === null) throw new Error(`${id} has no recipe`);
  // The device's buffer is the rendered recipe, a whole number of samples.
  return Math.ceil((synthRecipeDurationMsV1(recipe) / 1000) * 44100) / 44100;
}

function required<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) throw new Error("missing");
  return value;
}

function start(
  output: WebAudioOutputV1,
  id: SoundIdV1,
  extra: { rate?: number; gain?: number; generated?: true } = {},
): { readonly stop: () => void } | null {
  return output.start({
    id,
    category: "combat",
    gain: extra.gain ?? 1,
    rate: extra.rate ?? 1,
    delaySeconds: 0,
    ...(extra.generated === true ? { generated: true } : {}),
  });
}

beforeEach(() => clearSoundFilesV1());
afterEach(() => clearSoundFilesV1());

describe("a sound with a recorded clip", () => {
  it("is in the manifest for this test to be about something", () => {
    expect(stockSoundClipV1(HIT)).not.toBeNull();
    expect(stockSoundClipV1(BUILD)).not.toBeNull();
    expect(SOUND_MANIFEST_V1[HIT].source.kind).toBe("FILE");
  });

  it("plays the synth until the clip is decoded, then the clip", async () => {
    const log: FetchLogV1 = { urls: [] };
    const { browser, device } = browserWith(() => "OK", log);
    const output = required(createWebAudioOutputV1(browser));
    expect(output.stockSounds).toBe(true);
    // No device, no fetch: nothing happens before the gesture.
    expect(log.urls).toEqual([]);
    expect(start(output, HIT)).toBeNull();
    output.unlock();
    // The clips are asked for; none has arrived yet.
    expect(log.urls).toEqual(
      STOCK_SOUND_CLIPS_V1.map((clip) => stockSoundUrlV1(clip)),
    );
    expect(output.soundSource(HIT)).toBe("GENERATED");
    expect(start(output, HIT)).not.toBeNull();
    expect(device.sources.at(-1)?.seconds).toBeCloseTo(synthSeconds(HIT), 6);
    expect(device.sources.at(-1)?.gain).toBe(1);
    expect(output.durationMs(HIT)).toBeCloseTo(synthSeconds(HIT) * 1000, 0);

    await settle();
    expect(output.soundSource(HIT)).toBe("RECORDED");
    expect(start(output, HIT)).not.toBeNull();
    expect(device.sources.at(-1)?.seconds).toBe(CLIP_SECONDS);
    expect(output.durationMs(HIT)).toBeCloseTo(CLIP_SECONDS * 1000, 6);
    // A sound without a clip is untouched.
    expect(output.soundSource("attack.melee")).toBe("GENERATED");
    start(output, "attack.melee");
    expect(device.sources.at(-1)?.seconds).toBeCloseTo(
      synthSeconds("attack.melee"),
      6,
    );
  });

  it("plays a clip at its manifest level, detuned and stoppable", async () => {
    const { browser, device } = browserWith(() => "OK", { urls: [] });
    const output = required(createWebAudioOutputV1(browser));
    output.unlock();
    await settle();
    const clip = required(stockSoundClipV1(HIT));
    const voice = required(start(output, HIT, { rate: 1.04, gain: 0.5 }));
    const source = required(device.sources.at(-1));
    expect(source.rate).toBe(1.04);
    expect(source.gain).toBeCloseTo(0.5 * clip.gain, 9);
    expect(source.loop).toBe(false);
    expect(source.stopped).toBe(false);
    voice.stop();
    expect(source.stopped).toBe(true);
  });

  it("still plays the synthesised sound when asked for it", async () => {
    const { browser, device } = browserWith(() => "OK", { urls: [] });
    const output = required(createWebAudioOutputV1(browser));
    output.unlock();
    await settle();
    expect(start(output, HIT, { generated: true, gain: 0.5 })).not.toBeNull();
    const source = required(device.sources.at(-1));
    expect(source.seconds).toBeCloseTo(synthSeconds(HIT), 6);
    // The clip's level does not apply to the synthesised sound.
    expect(source.gain).toBe(0.5);
    expect(output.durationMs(HIT, true)).toBeCloseTo(
      synthSeconds(HIT) * 1000,
      0,
    );
    expect(output.durationMs(HIT)).toBeCloseTo(CLIP_SECONDS * 1000, 6);
  });

  it.each([
    ["is missing", "MISSING"],
    ["cannot be decoded", "BROKEN"],
    ["cannot be fetched", "OFFLINE"],
    ["makes fetch throw", "THROWS"],
  ] as const)(
    "plays the synth, without an error, when the clip %s",
    async (_name, reply) => {
      const hitUrl = stockSoundUrlV1(required(stockSoundClipV1(HIT)));
      const { browser, device } = browserWith(
        (url) => (url === hitUrl ? reply : "OK"),
        { urls: [] },
      );
      const output = required(createWebAudioOutputV1(browser));
      expect(() => output.unlock()).not.toThrow();
      await settle();
      expect(output.unlocked).toBe(true);
      expect(output.soundSource(HIT)).toBe("GENERATED");
      expect(start(output, HIT)).not.toBeNull();
      expect(device.sources.at(-1)?.seconds).toBeCloseTo(synthSeconds(HIT), 6);
      expect(device.sources.at(-1)?.gain).toBe(1);
      // The other clips are not affected by the one that failed.
      expect(output.soundSource(BUILD)).toBe("RECORDED");
    },
  );

  it("plays every synth when the browser has no fetch at all", () => {
    const browser = {} as unknown as Window & typeof globalThis;
    const device = installFakeAudioContext(browser);
    const output = required(createWebAudioOutputV1(browser));
    expect(() => output.unlock()).not.toThrow();
    expect(start(output, HIT)).not.toBeNull();
    expect(device.sources.at(-1)?.seconds).toBeCloseTo(synthSeconds(HIT), 6);
  });

  it("fetches nothing and plays every synth with stock sounds off", async () => {
    const log: FetchLogV1 = { urls: [] };
    const { browser, device } = browserWith(() => "OK", log);
    const output = required(
      createWebAudioOutputV1(browser, { stockSounds: false }),
    );
    expect(output.stockSounds).toBe(false);
    output.unlock();
    await settle();
    expect(log.urls).toEqual([]);
    for (const clip of STOCK_SOUND_CLIPS_V1) {
      const id = clip.id as SoundIdV1;
      expect(output.soundSource(id), id).toBe("GENERATED");
      expect(start(output, id), id).not.toBeNull();
      expect(device.sources.at(-1)?.seconds, id).toBeCloseTo(
        synthSeconds(id),
        6,
      );
    }
  });

  it("forgets its clips when the device is closed", async () => {
    const { browser } = browserWith(() => "OK", { urls: [] });
    const output = required(createWebAudioOutputV1(browser));
    output.unlock();
    await settle();
    output.close();
    expect(output.soundSource(HIT)).toBe("GENERATED");
    expect(start(output, HIT)).toBeNull();
  });
});

describe("the game's audio over a recorded clip", () => {
  async function audioWithClips(): Promise<{
    audio: GameAudioV1;
    device: FakeAudioDeviceV1;
    clock: { now: number };
  }> {
    const { browser, device } = browserWith(() => "OK", { urls: [] });
    const clock = { now: 1000 };
    const audio = new GameAudioV1({
      storage: null,
      output: required(createWebAudioOutputV1(browser)),
      clock: () => clock.now,
      random: () => 0.5,
    });
    audio.unlock();
    await settle();
    return { audio, device, clock };
  }

  it("reports the clip as the source once it is decoded", async () => {
    const { audio } = await audioWithClips();
    expect(audio.stockSounds).toBe(true);
    expect(audio.soundSource(HIT)).toBe("RECORDED");
    expect(audio.soundSource("attack.melee")).toBe("GENERATED");
    const silent = new GameAudioV1({ storage: null, output: null });
    expect(silent.stockSounds).toBe(true);
    expect(silent.soundSource(HIT)).toBeNull();
  });

  it("detunes a clip by its playback rate and keeps the category level", async () => {
    const { audio, device } = await audioWithClips();
    const clip = required(stockSoundClipV1(HIT));
    const cents = SOUND_MANIFEST_V1[HIT].jitterCents;
    expect(cents).toBeGreaterThan(0);
    expect(audio.play(HIT, { detune: 1 })).toBe("PLAYED");
    const sharp = required(device.sources.at(-1));
    expect(sharp.seconds).toBe(CLIP_SECONDS);
    expect(sharp.rate).toBeCloseTo(Math.pow(2, cents / 1200), 9);
    expect(sharp.gain).toBeCloseTo(
      DEFAULT_CATEGORY_GAINS_V1.combat * clip.gain,
      9,
    );
    audio.stop(HIT);
    expect(audio.play(HIT, { detune: -1 })).toBe("PLAYED");
    expect(device.sources.at(-1)?.rate).toBeCloseTo(
      Math.pow(2, -cents / 1200),
      9,
    );
    // The random detune of a match: the middle of the range here.
    audio.stop(HIT);
    expect(audio.play(HIT)).toBe("PLAYED");
    expect(device.sources.at(-1)?.rate).toBeCloseTo(1, 9);
  });

  it("plays another player's building quieter, from the clip", async () => {
    const { audio, device } = await audioWithClips();
    const clip = required(stockSoundClipV1(BUILD));
    expect(audio.play(BUILD, { gain: OTHER_PLAYER_BUILD_GAIN_V7 })).toBe(
      "PLAYED",
    );
    const far = required(device.sources.at(-1));
    expect(far.seconds).toBe(CLIP_SECONDS);
    expect(far.gain).toBeCloseTo(
      OTHER_PLAYER_BUILD_GAIN_V7 *
        DEFAULT_CATEGORY_GAINS_V1.economy *
        clip.gain,
      9,
    );
  });

  it("knows how long a clip has left, and stops and restarts it", async () => {
    const { audio, device, clock } = await audioWithClips();
    expect(audio.remainingMs(HIT)).toBe(0);
    audio.play(HIT, { detune: 0 });
    expect(audio.remainingMs(HIT)).toBeCloseTo(CLIP_SECONDS * 1000, 6);
    clock.now += 300;
    expect(audio.remainingMs(HIT)).toBeCloseTo(CLIP_SECONDS * 1000 - 300, 6);
    // Pressed again inside the coalescing window: stop makes room for it.
    expect(audio.play(HIT)).toBe("PLAYED");
    clock.now += 10;
    expect(audio.play(HIT)).toBe("COALESCED");
    const first = required(device.sources.at(-1));
    audio.stop(HIT);
    expect(first.stopped).toBe(true);
    expect(audio.remainingMs(HIT)).toBe(0);
    expect(audio.play(HIT)).toBe("PLAYED");
    clock.now += CLIP_SECONDS * 1000 + 1;
    expect(audio.remainingMs(HIT)).toBe(0);
  });

  it("gives the generated version its own length and no clip level", async () => {
    const { audio, device } = await audioWithClips();
    expect(audio.play(HIT, { generated: true, detune: 0 })).toBe("PLAYED");
    const generated = required(device.sources.at(-1));
    expect(generated.seconds).toBeCloseTo(synthSeconds(HIT), 6);
    expect(generated.gain).toBeCloseTo(DEFAULT_CATEGORY_GAINS_V1.combat, 9);
    expect(audio.remainingMs(HIT)).toBeCloseTo(synthSeconds(HIT) * 1000, 0);
  });

  it("keeps the volume and the mute for a clip", async () => {
    const { audio, device } = await audioWithClips();
    audio.setVolume(50);
    expect(device.masterGain()).toBeCloseTo(0.25, 9);
    const before = device.sources.length;
    audio.play(HIT);
    expect(device.sources.length).toBe(before + 1);
    const voice = required(device.sources.at(-1));
    audio.setEnabled(false);
    expect(voice.stopped).toBe(true);
    expect(audio.play(HIT)).toBe("MUTED");
    expect(device.sources.length).toBe(before + 1);
  });
});

describe("the sound file store", () => {
  const bytes = (text: string) => ({
    ok: true,
    status: 200,
    arrayBuffer: () => Promise.resolve(new TextEncoder().encode(text).buffer),
  });

  it("fetches a file once", async () => {
    let calls = 0;
    const fetchFile = (): Promise<ReturnType<typeof bytes>> => {
      calls += 1;
      return Promise.resolve(bytes("CLIP"));
    };
    const first = soundFileBytesV1("a.m4a", fetchFile);
    expect(soundFileBytesV1("a.m4a", fetchFile)).toBe(first);
    expect(new TextDecoder().decode(await first)).toBe("CLIP");
    expect(calls).toBe(1);
    expect(requestedSoundFilesV1()).toEqual(["a.m4a"]);
  });

  it("forgets a failed fetch, so it can be tried again", async () => {
    let online = false;
    const fetchFile = (): Promise<ReturnType<typeof bytes>> =>
      online
        ? Promise.resolve(bytes("CLIP"))
        : Promise.resolve({ ...bytes(""), ok: false, status: 404 });
    await expect(soundFileBytesV1("a.m4a", fetchFile)).rejects.toThrow(/404/);
    expect(requestedSoundFilesV1()).toEqual([]);
    online = true;
    expect(
      new TextDecoder().decode(await soundFileBytesV1("a.m4a", fetchFile)),
    ).toBe("CLIP");
  });

  it("prefetches without waiting and without throwing", async () => {
    expect(() =>
      prefetchSoundFilesV1(["a.m4a", "b.m4a"], (url) => {
        if (url === "a.m4a") throw new Error("no fetch");
        return Promise.reject(new Error("offline"));
      }),
    ).not.toThrow();
    await settle();
    expect(requestedSoundFilesV1()).toEqual([]);
  });
});
