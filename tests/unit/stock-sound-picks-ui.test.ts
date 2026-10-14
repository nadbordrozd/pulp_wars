import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { soundAssetUrlsV7 } from "../../src/assets/asset-inventory-v7";
import {
  DEFAULT_CATEGORY_GAINS_V1,
  GameAudioV1,
  SOUND_ALL_CLIPS_V1,
  SOUND_CHOICE_SETS_V1,
  SOUND_DEFAULT_CLIPS_V1,
  SOUND_TITLE_THEME_ID_V1,
  STOCK_SOUND_PICKS_STORAGE_KEY_V1,
  clearSoundFilesV1,
  createWebAudioOutputV1,
  isStockSoundChoiceV1,
  loadStockSoundPicksV1,
  parseStockSoundPicksV1,
  soundCandidateUrlV1,
  soundCandidateV1,
  soundChoiceSetV1,
  soundRecipeV1,
  stockSoundCandidateV1,
  stockSoundChoiceV1,
  stockSoundPickLinesV1,
  stockSoundPickSummaryV1,
  stockSoundV1,
  storeStockSoundPicksV1,
  synthRecipeDurationMsV1,
  type SoundIdV1,
  type StockSoundPicksV1,
  type WebAudioOutputV1,
} from "../../src/audio/index";
import type { StorageAdapter } from "../../src/persistence/index";
import {
  installFakeAudioContext,
  type FakeAudioDeviceV1,
} from "../fixtures/fake-audio-context";

/**
 * A sound with several recordings (beads pulp_wars-2yc.24 and
 * pulp_wars-2yc.51, docs/ui/SOUND.md "Choosing between recordings"), on a
 * stand-in device: only the default (an ElevenLabs take) is fetched when
 * the device opens, another take or an old stock recording when it is
 * asked for or picked; a pick changes what the sound plays at once, is
 * stored, survives a reload, and is ignored when its candidate no longer
 * exists.
 */

/**
 * A sound whose default is an ElevenLabs take, with other takes and three
 * old stock recordings (1 to 3) to pick.
 */
const HIT: SoundIdV1 = "impact.hit";
/** Its ElevenLabs default, and its second take. */
const HIT_NEW = required(soundChoiceSetV1(HIT)).default;
const HIT_NEW_2 = required(
  required(soundChoiceSetV1(HIT)).candidates.filter(
    (candidate) => candidate.origin === "ELEVENLABS",
  )[1],
).n;
/**
 * A sound that plays the synth by default (none of its takes passed) and
 * has ElevenLabs takes to pick.
 */
const TRAIN: SoundIdV1 = "unit.train";
const TRAIN_TAKE = required(required(soundChoiceSetV1(TRAIN)).candidates[0]).n;
/** Something with nothing to choose: a theme. */
const THEME = SOUND_TITLE_THEME_ID_V1;

/** In the stand-in device, candidate n of any sound decodes to this long. */
const seconds = (n: number): number => 0.5 + n / 10;

type Reply = "OK" | "MISSING";

function browserWith(
  log: string[],
  reply: (url: string) => Reply = () => "OK",
): { browser: Window & typeof globalThis; device: FakeAudioDeviceV1 } {
  const browser = {
    fetch(url: string): Promise<unknown> {
      log.push(url);
      const ok = reply(url) === "OK";
      return Promise.resolve({
        ok,
        status: ok ? 200 : 404,
        // The bytes name the candidate, so the device can tell them apart.
        arrayBuffer: () =>
          Promise.resolve(new TextEncoder().encode(`CLIP ${url}`).buffer),
      });
    },
  } as unknown as Window & typeof globalThis;
  const device = installFakeAudioContext(browser, {
    decode(data) {
      const n = /-(\d+)\.m4a$/.exec(new TextDecoder().decode(data))?.[1];
      if (n === undefined) throw new Error("Unable to decode audio data");
      return seconds(Number(n));
    },
  });
  return { browser, device };
}

async function settle(): Promise<void> {
  for (let turn = 0; turn < 30; turn += 1) await Promise.resolve();
}

function required<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) throw new Error("missing");
  return value;
}

function url(id: string, n: number): string {
  return soundCandidateUrlV1(required(soundCandidateV1(id, n)));
}

const defaultUrls = (): string[] =>
  SOUND_DEFAULT_CLIPS_V1.map((clip) => soundCandidateUrlV1(clip)).sort();

function synthSeconds(id: SoundIdV1): number {
  const recipe = required(soundRecipeV1(id));
  return Math.ceil((synthRecipeDurationMsV1(recipe) / 1000) * 44100) / 44100;
}

function start(
  output: WebAudioOutputV1,
  id: SoundIdV1,
  candidate?: number,
): { readonly stop: () => void } | null {
  return output.start({
    id,
    category: "combat",
    gain: 1,
    rate: 1,
    delaySeconds: 0,
    ...(candidate === undefined ? {} : { candidate }),
  });
}

function memoryStorage(initial: Record<string, string> = {}): StorageAdapter & {
  readonly values: Map<string, string>;
} {
  const values = new Map(Object.entries(initial));
  return {
    values,
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => void values.set(key, value),
    removeItem: (key) => void values.delete(key),
  };
}

beforeEach(() => clearSoundFilesV1());
afterEach(() => clearSoundFilesV1());

describe("the manifest's sounds with recordings", () => {
  it("has the sounds this test is about", () => {
    expect(HIT_NEW).toBeGreaterThanOrEqual(101);
    expect(HIT_NEW_2).toBeGreaterThanOrEqual(101);
    expect(required(stockSoundV1(HIT)).candidates.length).toBeGreaterThan(2);
    expect(required(soundChoiceSetV1(TRAIN)).default).toBe(0);
    expect(TRAIN_TAKE).toBeGreaterThanOrEqual(101);
    expect(soundChoiceSetV1(THEME)).toBeNull();
    // The alternatives are more than the defaults.
    expect(SOUND_ALL_CLIPS_V1.length).toBeGreaterThan(
      SOUND_DEFAULT_CLIPS_V1.length,
    );
  });
});

describe("the recordings a device fetches", () => {
  it("fetches only each sound's default when it opens", async () => {
    const log: string[] = [];
    const { browser } = browserWith(log);
    const output = required(createWebAudioOutputV1(browser));
    output.unlock();
    await settle();
    expect([...log].sort()).toEqual(defaultUrls());
    expect(log).toContain(url(HIT, HIT_NEW));
    expect(log).not.toContain(url(HIT, HIT_NEW_2));
    expect(log).not.toContain(url(HIT, 1));
    // A sound that plays the synth by default fetches none of its takes.
    expect(log).not.toContain(url(TRAIN, TRAIN_TAKE));
    expect(output.soundCandidate(HIT)).toBe(HIT_NEW);
    expect(output.soundSource(HIT)).toBe("RECORDED");
    expect(output.soundCandidate(TRAIN)).toBe(0);
    expect(output.soundSource(TRAIN)).toBe("GENERATED");
    expect(output.soundCandidate(THEME)).toBeNull();
  });

  it("fetches an alternative when it is asked for, and plays it by its number", async () => {
    const log: string[] = [];
    const { browser, device } = browserWith(log);
    const output = required(createWebAudioOutputV1(browser));
    // Nothing can be prepared before the device has opened.
    expect(await output.prepareCandidate(HIT, 2)).toBe(false);
    expect(log).toEqual([]);
    output.unlock();
    await settle();
    // Not loaded yet: it is that recording or nothing, never the default.
    expect(start(output, HIT, 2)).toBeNull();
    expect(output.durationMs(HIT, false, 2)).toBe(0);
    expect(await output.prepareCandidate(HIT, 2)).toBe(true);
    expect(log.filter((entry) => entry === url(HIT, 2))).toHaveLength(1);
    expect(start(output, HIT, 2)).not.toBeNull();
    const heard = required(device.sources.at(-1));
    expect(heard.seconds).toBe(seconds(2));
    expect(heard.gain).toBe(required(stockSoundCandidateV1(HIT, 2)).gain);
    expect(output.durationMs(HIT, false, 2)).toBeCloseTo(seconds(2) * 1000, 6);
    // Asked for again, it is not fetched again.
    expect(await output.prepareCandidate(HIT, 2)).toBe(true);
    expect(log.filter((entry) => entry === url(HIT, 2))).toHaveLength(1);
    // The game still plays the default.
    expect(output.soundCandidate(HIT)).toBe(HIT_NEW);
    expect(start(output, HIT)).not.toBeNull();
    expect(device.sources.at(-1)?.seconds).toBe(seconds(HIT_NEW));
    // Another ElevenLabs take is fetched the same way.
    expect(await output.prepareCandidate(HIT, HIT_NEW_2)).toBe(true);
    expect(start(output, HIT, HIT_NEW_2)).not.toBeNull();
    expect(device.sources.at(-1)?.seconds).toBe(seconds(HIT_NEW_2));
    expect(device.sources.at(-1)?.gain).toBe(
      required(soundCandidateV1(HIT, HIT_NEW_2)).gain,
    );
    // A candidate the sound does not have cannot be prepared or played.
    expect(await output.prepareCandidate(HIT, 99)).toBe(false);
    expect(start(output, HIT, 99)).toBeNull();
    expect(await output.prepareCandidate(THEME, 1)).toBe(false);
  });

  it("says a recording is not ready when it cannot be fetched", async () => {
    const log: string[] = [];
    const { browser } = browserWith(log, (address) =>
      address === url(HIT, 3) ? "MISSING" : "OK",
    );
    const output = required(createWebAudioOutputV1(browser));
    output.unlock();
    await settle();
    expect(await output.prepareCandidate(HIT, 3)).toBe(false);
    expect(start(output, HIT, 3)).toBeNull();
    // It can be asked for again.
    expect(await output.prepareCandidate(HIT, 3)).toBe(false);
    expect(log.filter((entry) => entry === url(HIT, 3))).toHaveLength(2);
  });
});

describe("a pick on the device", () => {
  it("changes what the sound plays at once, and back", async () => {
    const log: string[] = [];
    const { browser, device } = browserWith(log);
    const output = required(createWebAudioOutputV1(browser));
    output.unlock();
    await settle();

    output.setPick(HIT, 2);
    // Until the picked recording has arrived the synthesised sound plays.
    expect(output.soundCandidate(HIT)).toBe(0);
    expect(start(output, HIT)).not.toBeNull();
    expect(device.sources.at(-1)?.seconds).toBeCloseTo(synthSeconds(HIT), 6);
    await settle();
    expect(log).toContain(url(HIT, 2));
    expect(output.soundCandidate(HIT)).toBe(2);
    expect(start(output, HIT)).not.toBeNull();
    expect(device.sources.at(-1)?.seconds).toBe(seconds(2));
    expect(device.sources.at(-1)?.gain).toBe(
      required(stockSoundCandidateV1(HIT, 2)).gain,
    );
    expect(output.durationMs(HIT)).toBeCloseTo(seconds(2) * 1000, 6);

    // The generated sound can be picked too.
    output.setPick(HIT, 0);
    expect(output.soundCandidate(HIT)).toBe(0);
    expect(output.soundSource(HIT)).toBe("GENERATED");
    expect(start(output, HIT)).not.toBeNull();
    expect(device.sources.at(-1)?.seconds).toBeCloseTo(synthSeconds(HIT), 6);
    expect(device.sources.at(-1)?.gain).toBe(1);

    // No pick is the default again.
    output.setPick(HIT, null);
    expect(output.soundCandidate(HIT)).toBe(HIT_NEW);
    expect(start(output, HIT)).not.toBeNull();
    expect(device.sources.at(-1)?.seconds).toBe(seconds(HIT_NEW));
  });

  it("gives a sound that plays the synth by default a take", async () => {
    const log: string[] = [];
    const { browser, device } = browserWith(log);
    const output = required(createWebAudioOutputV1(browser));
    output.unlock();
    await settle();
    output.setPick(TRAIN, TRAIN_TAKE);
    await settle();
    expect(log).toContain(url(TRAIN, TRAIN_TAKE));
    expect(output.soundCandidate(TRAIN)).toBe(TRAIN_TAKE);
    expect(output.soundSource(TRAIN)).toBe("RECORDED");
    expect(start(output, TRAIN)).not.toBeNull();
    expect(device.sources.at(-1)?.seconds).toBe(seconds(TRAIN_TAKE));
    expect(device.sources.at(-1)?.gain).toBe(
      required(soundCandidateV1(TRAIN, TRAIN_TAKE)).gain,
    );
  });

  it("fetches the picked recording, not the default, when it opens", async () => {
    const log: string[] = [];
    const { browser, device } = browserWith(log);
    const output = required(
      createWebAudioOutputV1(browser, {
        picks: { [HIT]: 3, [TRAIN]: TRAIN_TAKE, "impact.heavy": 0 },
      }),
    );
    output.unlock();
    await settle();
    expect(log).toContain(url(HIT, 3));
    expect(log).not.toContain(url(HIT, HIT_NEW));
    expect(log).toContain(url(TRAIN, TRAIN_TAKE));
    expect(log).not.toContain(
      url("impact.heavy", required(soundChoiceSetV1("impact.heavy")).default),
    );
    expect(output.soundCandidate(HIT)).toBe(3);
    expect(start(output, HIT)).not.toBeNull();
    expect(device.sources.at(-1)?.seconds).toBe(seconds(3));
    expect(output.soundSource("impact.heavy")).toBe("GENERATED");
  });

  it("ignores a pick of a recording the sound does not have", async () => {
    const log: string[] = [];
    const { browser, device } = browserWith(log);
    const output = required(
      createWebAudioOutputV1(browser, {
        picks: { [HIT]: 99, [THEME]: 1, "no.such.sound": 1 },
      }),
    );
    output.unlock();
    await settle();
    expect([...log].sort()).toEqual(defaultUrls());
    expect(output.soundCandidate(HIT)).toBe(HIT_NEW);
    output.setPick(HIT, 2);
    await settle();
    output.setPick(HIT, 99);
    output.setPick(HIT, 1.5);
    expect(output.soundCandidate(HIT)).toBe(2);
    expect(start(output, HIT)).not.toBeNull();
    expect(device.sources.at(-1)?.seconds).toBe(seconds(2));
  });

  it("plays the synth when the picked recording cannot be loaded", async () => {
    const { browser, device } = browserWith([], (address) =>
      address === url(HIT, 2) ? "MISSING" : "OK",
    );
    const output = required(
      createWebAudioOutputV1(browser, { picks: { [HIT]: 2 } }),
    );
    output.unlock();
    await settle();
    expect(output.soundCandidate(HIT)).toBe(0);
    expect(output.soundSource(HIT)).toBe("GENERATED");
    expect(start(output, HIT)).not.toBeNull();
    expect(device.sources.at(-1)?.seconds).toBeCloseTo(synthSeconds(HIT), 6);
  });

  it("does nothing with the recordings switched off", async () => {
    const log: string[] = [];
    const { browser, device } = browserWith(log);
    const output = required(
      createWebAudioOutputV1(browser, {
        stockSounds: false,
        picks: { [HIT]: 2 },
      }),
    );
    output.unlock();
    output.setPick(TRAIN, TRAIN_TAKE);
    expect(await output.prepareCandidate(HIT, 2)).toBe(false);
    await settle();
    expect(log).toEqual([]);
    expect(output.soundCandidate(HIT)).toBe(0);
    expect(start(output, HIT, 2)).toBeNull();
    expect(start(output, HIT)).not.toBeNull();
    expect(device.sources.at(-1)?.seconds).toBeCloseTo(synthSeconds(HIT), 6);
  });
});

describe("the stored picks", () => {
  it("keeps the picks a sound can have and drops the rest", () => {
    expect(parseStockSoundPicksV1(null)).toEqual({});
    expect(parseStockSoundPicksV1("not json")).toEqual({});
    expect(parseStockSoundPicksV1("[1,2]")).toEqual({});
    expect(parseStockSoundPicksV1('"impact.hit"')).toEqual({});
    expect(
      parseStockSoundPicksV1(
        JSON.stringify({
          [TRAIN]: TRAIN_TAKE,
          [HIT]: 2,
          "impact.heavy": 0,
          "impact.ice": 99,
          "impact.splat": "2",
          "impact.shield": 1.5,
          [THEME]: 1,
          "no.such.sound": 1,
        }),
      ),
    ).toEqual({ [HIT]: 2, "impact.heavy": 0, [TRAIN]: TRAIN_TAKE });
    expect(isStockSoundChoiceV1(HIT, 0)).toBe(true);
    expect(isStockSoundChoiceV1(HIT, 3)).toBe(true);
    expect(isStockSoundChoiceV1(HIT, 4)).toBe(false);
    expect(isStockSoundChoiceV1(HIT, HIT_NEW)).toBe(true);
    expect(isStockSoundChoiceV1(HIT, HIT_NEW_2)).toBe(true);
    expect(isStockSoundChoiceV1(THEME, 0)).toBe(false);
  });

  it("says what a sound plays with and without a pick", () => {
    expect(stockSoundChoiceV1(HIT)).toBe(HIT_NEW);
    expect(stockSoundChoiceV1(HIT, { [HIT]: 3 })).toBe(3);
    expect(stockSoundChoiceV1(HIT, { [HIT]: HIT_NEW_2 })).toBe(HIT_NEW_2);
    expect(stockSoundChoiceV1(HIT, { [HIT]: 0 })).toBe(0);
    expect(stockSoundChoiceV1(HIT, { [HIT]: 99 })).toBe(HIT_NEW);
    expect(stockSoundChoiceV1(TRAIN)).toBe(0);
    expect(stockSoundChoiceV1(TRAIN, { [TRAIN]: TRAIN_TAKE })).toBe(TRAIN_TAKE);
    expect(stockSoundChoiceV1(THEME, { [THEME]: 1 })).toBeNull();
  });

  it("is stored under its own key and read back", () => {
    const storage = memoryStorage();
    expect(loadStockSoundPicksV1(storage)).toEqual({});
    expect(
      storeStockSoundPicksV1(storage, { [HIT]: 2, [TRAIN]: TRAIN_TAKE }),
    ).toBe(true);
    expect(storage.values.get(STOCK_SOUND_PICKS_STORAGE_KEY_V1)).toBe(
      JSON.stringify({ [HIT]: 2, [TRAIN]: TRAIN_TAKE }),
    );
    expect(loadStockSoundPicksV1(storage)).toEqual({
      [HIT]: 2,
      [TRAIN]: TRAIN_TAKE,
    });
    // No picks left: the key goes away.
    expect(storeStockSoundPicksV1(storage, {})).toBe(true);
    expect(storage.values.has(STOCK_SOUND_PICKS_STORAGE_KEY_V1)).toBe(false);
    expect(loadStockSoundPicksV1(null)).toEqual({});
  });

  it("never throws on a storage that refuses", () => {
    const broken: StorageAdapter = {
      getItem: () => {
        throw new Error("denied");
      },
      setItem: () => {
        throw new Error("full");
      },
      removeItem: () => {
        throw new Error("denied");
      },
    };
    expect(loadStockSoundPicksV1(broken)).toEqual({});
    expect(storeStockSoundPicksV1(broken, { [HIT]: 2 })).toBe(false);
    expect(storeStockSoundPicksV1(broken, {})).toBe(false);
  });
});

describe("the picks as text for the developer", () => {
  it("lists each pick with the file it names, in the manifest's order", () => {
    const picks: StockSoundPicksV1 = {
      [TRAIN]: TRAIN_TAKE,
      [HIT]: 2,
      "impact.heavy": 0,
    };
    const hit = required(stockSoundCandidateV1(HIT, 2));
    const train = required(soundCandidateV1(TRAIN, TRAIN_TAKE));
    if (train.origin !== "ELEVENLABS") throw new Error("not a take");
    expect(stockSoundPickLinesV1(picks)).toEqual([
      {
        id: HIT,
        pick: 2,
        default: HIT_NEW,
        source: `${hit.library} / ${hit.originalFile}`,
      },
      {
        id: "impact.heavy",
        pick: 0,
        default: required(soundChoiceSetV1("impact.heavy")).default,
        source: "generated",
      },
      {
        id: TRAIN,
        pick: TRAIN_TAKE,
        default: 0,
        source: `ElevenLabs: ${train.prompt}`,
      },
    ]);
    const text = stockSoundPickSummaryV1(picks);
    const parsed = JSON.parse(text) as {
      pulpWarsSoundPicks: number;
      picks: Record<string, number>;
      sources: Record<string, string>;
    };
    expect(parsed.pulpWarsSoundPicks).toBe(1);
    expect(parsed.picks).toEqual({
      [HIT]: 2,
      "impact.heavy": 0,
      [TRAIN]: TRAIN_TAKE,
    });
    expect(parsed.sources[HIT]).toBe(`#2 ${hit.library} / ${hit.originalFile}`);
    expect(parsed.sources["impact.heavy"]).toBe("generated");
    // One sound a line, so it reads in a message.
    expect(text.split("\n")).toContain(`    ${JSON.stringify(HIT)}: 2,`);
    // The text can be stored as picks as it is.
    expect(parseStockSoundPicksV1(JSON.stringify(parsed.picks))).toEqual(
      parsed.picks,
    );
  });

  it("says when a pick is the default already, and when there are none", () => {
    const parsed = JSON.parse(stockSoundPickSummaryV1({ [HIT]: HIT_NEW })) as {
      sources: Record<string, string>;
    };
    expect(parsed.sources[HIT]).toMatch(
      new RegExp(`^#${HIT_NEW} ElevenLabs: .* \\(already the default\\)$`),
    );
    expect(JSON.parse(stockSoundPickSummaryV1({}))).toEqual({
      pulpWarsSoundPicks: 1,
      picks: {},
    });
    expect(JSON.parse(stockSoundPickSummaryV1({ [HIT]: 99 }))).toEqual({
      pulpWarsSoundPicks: 1,
      picks: {},
    });
  });
});

describe("the game's audio and the picks", () => {
  function audioOn(
    storage: StorageAdapter | null,
    log: string[] = [],
    options: { stockSounds?: boolean } = {},
  ): { audio: GameAudioV1; device: FakeAudioDeviceV1; log: string[] } {
    const { browser, device } = browserWith(log);
    const audio = new GameAudioV1({
      storage,
      output: required(createWebAudioOutputV1(browser, options)),
      clock: () => 1000,
      random: () => 0.5,
    });
    return { audio, device, log };
  }

  it("applies a pick at once, stores it, and tells its listeners", async () => {
    const storage = memoryStorage();
    const { audio, device, log } = audioOn(storage);
    const seen: StockSoundPicksV1[] = [];
    const unsubscribe = audio.subscribePicks((picks) => seen.push(picks));
    audio.unlock();
    await settle();
    expect(audio.picks).toEqual({});
    expect(audio.soundChoice(HIT)).toBe(HIT_NEW);
    expect(audio.soundChoice(THEME)).toBeNull();

    expect(audio.setPick(HIT, 2)).toBe(true);
    await settle();
    expect(audio.picks).toEqual({ [HIT]: 2 });
    expect(audio.soundChoice(HIT)).toBe(2);
    expect(audio.soundCandidate(HIT)).toBe(2);
    expect(seen).toEqual([{ [HIT]: 2 }]);
    expect(storage.values.get(STOCK_SOUND_PICKS_STORAGE_KEY_V1)).toBe(
      JSON.stringify({ [HIT]: 2 }),
    );
    expect(log).toContain(url(HIT, 2));
    // What the game plays for that sound is the picked recording.
    expect(audio.play(HIT, { detune: 0 })).toBe("PLAYED");
    const heard = required(device.sources.at(-1));
    expect(heard.seconds).toBe(seconds(2));
    expect(heard.gain).toBeCloseTo(
      DEFAULT_CATEGORY_GAINS_V1.combat *
        required(stockSoundCandidateV1(HIT, 2)).gain,
      9,
    );
    expect(audio.remainingMs(HIT)).toBeCloseTo(seconds(2) * 1000, 6);

    // A pick the sound does not have changes nothing.
    expect(audio.setPick(HIT, 99)).toBe(false);
    expect(audio.setPick(THEME, 0)).toBe(false);
    expect(audio.picks).toEqual({ [HIT]: 2 });
    expect(seen).toHaveLength(1);

    unsubscribe();
    expect(audio.setPick(HIT, null)).toBe(true);
    expect(audio.picks).toEqual({});
    expect(audio.soundCandidate(HIT)).toBe(HIT_NEW);
    expect(storage.values.has(STOCK_SOUND_PICKS_STORAGE_KEY_V1)).toBe(false);
    expect(seen).toHaveLength(1);
  });

  it("plays one recording by its number once it is prepared", async () => {
    const { audio, device } = audioOn(null);
    expect(await audio.prepareCandidate(HIT, 3)).toBe(false);
    audio.unlock();
    await settle();
    expect(audio.play(HIT, { candidate: 3 })).toBe("UNAVAILABLE");
    expect(await audio.prepareCandidate(HIT, 3)).toBe(true);
    expect(audio.play(HIT, { candidate: 3, detune: 0 })).toBe("PLAYED");
    expect(device.sources.at(-1)?.seconds).toBe(seconds(3));
    expect(audio.remainingMs(HIT)).toBeCloseTo(seconds(3) * 1000, 6);
    // Hearing it did not pick it.
    expect(audio.picks).toEqual({});
    expect(audio.soundCandidate(HIT)).toBe(HIT_NEW);
  });

  it("keeps the picks over a reload", async () => {
    const storage = memoryStorage();
    const first = audioOn(storage);
    first.audio.unlock();
    first.audio.setPick(HIT, 3);
    first.audio.setPick(TRAIN, TRAIN_TAKE);
    first.audio.setPick("impact.heavy", 0);
    first.audio.destroy();
    clearSoundFilesV1();

    const second = audioOn(storage);
    expect(second.audio.picks).toEqual({
      [HIT]: 3,
      "impact.heavy": 0,
      [TRAIN]: TRAIN_TAKE,
    });
    // The game's start fetches the picked recordings, not the defaults.
    const preload = soundAssetUrlsV7(true, loadStockSoundPicksV1(storage));
    expect(preload).toContain(url(HIT, 3));
    expect(preload).not.toContain(url(HIT, HIT_NEW));
    expect(preload).toContain(url(TRAIN, TRAIN_TAKE));
    expect(preload).not.toContain(
      url("impact.heavy", required(soundChoiceSetV1("impact.heavy")).default),
    );
    second.audio.unlock();
    await settle();
    expect([...second.log].sort()).toEqual([...preload].sort());
    expect(second.audio.soundCandidate(HIT)).toBe(3);
    expect(second.audio.soundCandidate(TRAIN)).toBe(TRAIN_TAKE);
    expect(second.audio.soundSource("impact.heavy")).toBe("GENERATED");
    expect(second.audio.play(HIT, { detune: 0 })).toBe("PLAYED");
    expect(second.device.sources.at(-1)?.seconds).toBe(seconds(3));
  });

  it("ignores a stored pick whose recording no longer exists", async () => {
    const storage = memoryStorage({
      [STOCK_SOUND_PICKS_STORAGE_KEY_V1]: JSON.stringify({
        [HIT]: 99,
        [THEME]: 1,
        "impact.ice": 2,
      }),
    });
    const { audio, device, log } = audioOn(storage);
    expect(audio.picks).toEqual({ "impact.ice": 2 });
    expect(audio.soundChoice(HIT)).toBe(HIT_NEW);
    audio.unlock();
    await settle();
    expect(log).toContain(url(HIT, HIT_NEW));
    expect(log).toContain(url("impact.ice", 2));
    expect(audio.soundCandidate(HIT)).toBe(HIT_NEW);
    expect(audio.play(HIT, { detune: 0 })).toBe("PLAYED");
    expect(device.sources.at(-1)?.seconds).toBe(seconds(HIT_NEW));
    expect(soundAssetUrlsV7(true, loadStockSoundPicksV1(storage))).toContain(
      url(HIT, HIT_NEW),
    );
  });

  it("forgets every pick at once", async () => {
    const storage = memoryStorage();
    const { audio } = audioOn(storage);
    audio.unlock();
    audio.setPick(HIT, 2);
    audio.setPick(TRAIN, TRAIN_TAKE);
    await settle();
    expect(audio.clearPicks()).toBe(true);
    expect(audio.picks).toEqual({});
    expect(storage.values.has(STOCK_SOUND_PICKS_STORAGE_KEY_V1)).toBe(false);
    expect(audio.soundCandidate(HIT)).toBe(HIT_NEW);
    expect(audio.soundCandidate(TRAIN)).toBe(0);
  });

  it("has no picks with the recordings switched off", async () => {
    const storage = memoryStorage({
      [STOCK_SOUND_PICKS_STORAGE_KEY_V1]: JSON.stringify({ [HIT]: 2 }),
    });
    const { audio, device, log } = audioOn(storage, [], {
      stockSounds: false,
    });
    expect(audio.picks).toEqual({});
    expect(audio.soundChoice(HIT)).toBeNull();
    expect(audio.setPick(HIT, 3)).toBe(false);
    audio.unlock();
    await settle();
    expect(log).toEqual([]);
    expect(audio.play(HIT, { detune: 0 })).toBe("PLAYED");
    expect(device.sources.at(-1)?.seconds).toBeCloseTo(synthSeconds(HIT), 6);
    // The stored picks are kept for the next visit with recordings on.
    expect(storage.values.get(STOCK_SOUND_PICKS_STORAGE_KEY_V1)).toBe(
      JSON.stringify({ [HIT]: 2 }),
    );
    expect(soundAssetUrlsV7(false, { [HIT]: 2 })).toEqual([]);
  });

  it("is silent and pickless without a device", async () => {
    const audio = new GameAudioV1({ storage: null, output: null });
    expect(audio.setPick(HIT, 2)).toBe(true);
    expect(audio.picks).toEqual({ [HIT]: 2 });
    expect(audio.soundCandidate(HIT)).toBeNull();
    expect(await audio.prepareCandidate(HIT, 2)).toBe(false);
  });
});

describe("every sound with recordings", () => {
  it("can be set to each of its candidates and to the generated sound", () => {
    for (const sound of SOUND_CHOICE_SETS_V1) {
      expect(isStockSoundChoiceV1(sound.id, 0), sound.id).toBe(true);
      for (const candidate of sound.candidates)
        expect(
          stockSoundChoiceV1(sound.id, { [sound.id]: candidate.n }),
          `${sound.id} #${candidate.n}`,
        ).toBe(candidate.n);
    }
  });
});
