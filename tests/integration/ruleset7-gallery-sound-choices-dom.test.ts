// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { bootstrapRuleset7App } from "../../src/app/index";
import {
  AUDIO_SETTINGS_STORAGE_KEY_V1,
  SOUND_IDS_V1,
  SOUND_MANIFEST_V1,
  SOUND_THEMES_V1,
  SOUND_TITLE_THEME_ID_V1,
  SOUND_CHOICE_SETS_V1,
  SOUND_DEFAULT_CLIPS_V1,
  STOCK_SOUND_PICKS_STORAGE_KEY_V1,
  clearSoundFilesV1,
  soundCandidateOrdinalV1,
  soundCandidateUrlV1,
  soundCandidateV1,
  soundChoiceSetV1,
  soundRecipeV1,
  stockSoundCandidateV1,
  stockSoundPickSummaryV1,
  synthRecipeDurationMsV1,
  type SoundIdV1,
} from "../../src/audio/index";
import {
  installFakeAudioContext,
  uninstallFakeAudioContext,
  type FakeAudioDeviceV1,
} from "../fixtures/fake-audio-context";
import { RecordingBoardHost } from "../fixtures/v7-dom-rig";

/**
 * Choosing between versions in the Gallery's Sounds tab (beads
 * pulp_wars-2yc.24 and pulp_wars-2yc.51, docs/ui/SOUND.md "Choosing between
 * recordings"): a sound lists its ElevenLabs takes ("New 1" is the
 * default), its old stock recordings ("Old 1" and on) and its synth under
 * its card; a line plays its version (fetched when asked for) and its Use
 * control picks it for this browser, which the game then plays and
 * remembers; "Copy my picks" hands the picks over as text. jsdom has no
 * WebAudio and no files: a recording device and a `fetch` stand in.
 */

/** Its default is an ElevenLabs take; other takes and three old recordings. */
const HIT: SoundIdV1 = "impact.hit";
/** None of its takes passed: the synth by default, its takes to compare. */
const TRAIN: SoundIdV1 = "unit.train";

function choiceSet(
  id: string,
): NonNullable<ReturnType<typeof soundChoiceSetV1>> {
  const set = soundChoiceSetV1(id);
  if (set === null) throw new Error(`${id} has nothing to choose`);
  return set;
}

/** Hit's ElevenLabs default, and Unit trained's first take. */
const HIT_NEW = choiceSet(HIT).default;
const TRAIN_TAKE = choiceSet(TRAIN).candidates[0]?.n ?? -1;

/** The menus' theme: the one piece of music the first gesture asks for. */
const TITLE_THEME_URL = ((): string => {
  const source = SOUND_THEMES_V1.find(
    (theme) => theme.id === SOUND_TITLE_THEME_ID_V1,
  )?.source;
  if (source?.kind !== "FILE") throw new Error("no title theme file");
  return source.url;
})();

/** In the stand-in device, candidate n of any sound decodes to this long. */
const seconds = (n: number): number => 0.5 + n / 10;

let app: ReturnType<typeof bootstrapRuleset7App> | null = null;
let device: FakeAudioDeviceV1;
let fetched: string[] = [];
let missing = new Set<string>();

function mount(): ReturnType<typeof bootstrapRuleset7App> {
  app = bootstrapRuleset7App(document, {
    storage: null,
    settingsStorage: window.localStorage,
    galleryDemoHost: () => new RecordingBoardHost(),
  });
  return app;
}

function required<T extends Element = HTMLElement>(selector: string): T {
  const node = document.querySelector<T>(selector);
  if (node === null) throw new Error(`Missing ${selector}`);
  return node;
}

function button(action: string): HTMLButtonElement {
  return required<HTMLButtonElement>(`[data-action="${action}"]`);
}

function openSounds(): HTMLElement {
  button("gallery").click();
  button("gallery-tab-sounds").click();
  return required("[data-v7-gallery-sounds]");
}

/**
 * The element of `className` whose `data-*` value `key` is `value`. The
 * Sounds tab is several thousand nodes, and jsdom answers a document-wide
 * attribute selector (`[data-sound-row="impact.hit"]`) by walking all of
 * them, several milliseconds each time: the listing test asks thousands of
 * times and used to run past its timeout on a loaded machine
 * (pulp_wars-2yc.64). The class narrows the walk to the cards; the dataset
 * comparison is the same exact match.
 */
function byData(className: string, key: string, value: string): HTMLElement {
  const node = [...document.getElementsByClassName(className)].find(
    (element): element is HTMLElement =>
      element instanceof HTMLElement && element.dataset[key] === value,
  );
  if (node === undefined) throw new Error(`Missing .${className} ${value}`);
  return node;
}

function row(id: string): HTMLElement {
  return byData("v7-gallery-sound", "soundRow", id);
}

function card(id: string): HTMLButtonElement {
  return byData("v7-gallery-sound-play", "soundPlay", id) as HTMLButtonElement;
}

/** A control under one card, looked for within that card only. */
function inRow(id: string, selector: string): HTMLButtonElement {
  const node = row(id).querySelector<HTMLButtonElement>(selector);
  if (node === null) throw new Error(`Missing ${selector} under ${id}`);
  return node;
}

function choices(id: string): HTMLElement[] {
  return [...row(id).querySelectorAll<HTMLElement>(".v7-gallery-sound-choice")];
}

function choicePlay(id: string, n: number): HTMLButtonElement {
  return inRow(id, `.v7-gallery-sound-choice-play[data-choice="${n}"]`);
}

function choiceUse(id: string, n: number): HTMLButtonElement {
  return inRow(id, `.v7-gallery-sound-choice-use[data-choice="${n}"]`);
}

function chosen(id: string): string[] {
  return choices(id)
    .filter((node) => node.dataset.chosen === "true")
    .map((node) => node.dataset.choice ?? "");
}

function url(id: string, n: number): string {
  const clip = soundCandidateV1(id, n);
  if (clip === null) throw new Error(`${id} #${n}`);
  return soundCandidateUrlV1(clip);
}

function synthSeconds(id: SoundIdV1): number {
  const recipe = soundRecipeV1(id);
  if (recipe === null) throw new Error(`${id} has no recipe`);
  return Math.ceil((synthRecipeDurationMsV1(recipe) / 1000) * 44100) / 44100;
}

function storedPicks(): unknown {
  const value = window.localStorage.getItem(STOCK_SOUND_PICKS_STORAGE_KEY_V1);
  return value === null ? null : JSON.parse(value);
}

function key(target: Element, value: string): KeyboardEvent {
  const event = new KeyboardEvent("keydown", {
    key: value,
    bubbles: true,
    cancelable: true,
  });
  target.dispatchEvent(event);
  return event;
}

/** Lets a fetch, a decode and the play after them settle. */
async function settle(): Promise<void> {
  for (let turn = 0; turn < 40; turn += 1) await Promise.resolve();
}

beforeEach(() => {
  // The mixer's clock (`Date.now`) says whether a card still plays: with
  // the machine's own clock a slow run let a short sound end between two
  // presses. Nothing here waits for a timer, only for promises.
  vi.useFakeTimers();
  document.body.innerHTML = '<div id="app"></div>';
  window.localStorage.clear();
  clearSoundFilesV1();
  fetched = [];
  missing = new Set();
  // The bytes name the file, so the device can tell the recordings apart.
  Object.defineProperty(window, "fetch", {
    configurable: true,
    writable: true,
    value: (address: string): Promise<unknown> => {
      fetched.push(address);
      const ok = !missing.has(address);
      return Promise.resolve({
        ok,
        status: ok ? 200 : 404,
        arrayBuffer: () =>
          Promise.resolve(new TextEncoder().encode(`CLIP ${address}`).buffer),
      });
    },
  });
  device = installFakeAudioContext(window, {
    decode(data) {
      const n = /-(\d+)\.m4a$/.exec(new TextDecoder().decode(data))?.[1];
      if (n === undefined) throw new Error("Unable to decode audio data");
      return seconds(Number(n));
    },
  });
});

afterEach(() => {
  app?.destroy();
  app = null;
  vi.useRealTimers();
  uninstallFakeAudioContext(window);
  Reflect.deleteProperty(window, "fetch");
  Reflect.deleteProperty(window.navigator, "clipboard");
  clearSoundFilesV1();
});

describe("Gallery Sounds tab: the recordings of a sound", () => {
  it("lists new takes, old recordings and the synth under every card", () => {
    mount();
    openSounds();
    expect(SOUND_CHOICE_SETS_V1.map((sound) => sound.id)).toEqual([
      ...SOUND_IDS_V1,
    ]);
    for (const sound of SOUND_CHOICE_SETS_V1) {
      const items = choices(sound.id);
      expect(row(sound.id).dataset.choices, sound.id).toBe("true");
      expect(items.map((node) => node.dataset.choice)).toEqual([
        ...sound.candidates.map((candidate) => String(candidate.n)),
        "0",
      ]);
      // Exactly one is the default, and without a pick it is the one in use.
      expect(
        items
          .filter((node) => node.dataset.default === "true")
          .map((node) => node.dataset.choice),
        sound.id,
      ).toEqual([String(sound.default)]);
      expect(chosen(sound.id), sound.id).toEqual([String(sound.default)]);
      const label = SOUND_MANIFEST_V1[sound.id as SoundIdV1].label;
      expect(
        row(sound.id)
          .querySelector(".v7-gallery-sound-choices")
          ?.getAttribute("aria-label"),
      ).toBe(`Versions of ${label}`);
      for (const candidate of sound.candidates) {
        // The user's pick reads "Pick"; every other take and recording
        // keeps its place in its manifest ("New 3" stays "New 3").
        const pick = candidate.userPick;
        const ordinal = soundCandidateOrdinalV1(sound.id, candidate);
        const play = choicePlay(sound.id, candidate.n);
        const isDefault = candidate.n === sound.default;
        const def = isDefault ? " (default)" : "";
        const item = play.closest<HTMLElement>(".v7-gallery-sound-choice");
        expect(
          play.querySelector(".v7-gallery-sound-choice-default")?.textContent,
          `${sound.id} #${candidate.n}`,
        ).toBe(isDefault ? "default" : undefined);
        const use = choiceUse(sound.id, candidate.n);
        if (candidate.origin === "ELEVENLABS") {
          const take = pick ? "Pick" : `New ${ordinal}`;
          const name = pick ? "your pick" : take.toLowerCase();
          // "New 1", the prompt and the length are shown; the whole of it
          // and the note are in the name and the title.
          expect(item?.dataset.soundOrigin).toBe("elevenlabs");
          expect(
            play.querySelector(".v7-gallery-sound-choice-number")?.textContent,
          ).toBe(take);
          expect(
            play.querySelector(".v7-gallery-sound-choice-file")?.textContent,
          ).toBe(candidate.prompt);
          expect(
            play.querySelector(".v7-gallery-sound-choice-cut")?.textContent,
          ).toBe(`${candidate.seconds} s`);
          expect(play.getAttribute("aria-label")).toBe(
            `Play ${name} of ${label}${def}: ${candidate.prompt} (${candidate.seconds} s, ElevenLabs, generated ${candidate.generated}). ${candidate.note}`,
          );
          expect(use.getAttribute("aria-label")).toBe(
            `Use ${name} for ${label}`,
          );
        } else {
          const name = pick ? "your pick" : `old recording ${ordinal}`;
          const origin = `${candidate.library} / ${candidate.originalFile}`;
          const cut = `${candidate.startSeconds}–${candidate.endSeconds} s`;
          expect(item?.dataset.soundOrigin).toBe("recorded");
          expect(
            play.querySelector(".v7-gallery-sound-choice-number")?.textContent,
          ).toBe(pick ? "Pick" : `Old ${ordinal}`);
          expect(
            play.querySelector(".v7-gallery-sound-choice-file")?.textContent,
          ).toBe(candidate.originalFile);
          expect(
            play.querySelector(".v7-gallery-sound-choice-cut")?.textContent,
          ).toBe(cut);
          expect(play.getAttribute("aria-label")).toBe(
            `Play ${name} of ${label}${def}: ${origin}, ${cut}. ${candidate.note}`,
          );
          expect(use.getAttribute("aria-label")).toBe(
            `Use ${name} for ${label}`,
          );
        }
        expect(play.title).toBe(play.getAttribute("aria-label"));
        expect(use.getAttribute("aria-pressed")).toBe(String(isDefault));
        expect(use.textContent).toBe(isDefault ? "In use" : "Use");
        expect(play.type).toBe("button");
        expect(use.type).toBe("button");
      }
      // The synth closes the row.
      const generated = choicePlay(sound.id, 0);
      expect(
        generated.querySelector(".v7-gallery-sound-choice-file")?.textContent,
      ).toBe("Synth");
      expect(generated.getAttribute("aria-label")).toBe(
        `Play synth: ${label}${sound.default === 0 ? " (default)" : ""}`,
      );
      expect(choiceUse(sound.id, 0).getAttribute("aria-label")).toBe(
        `Use the synth sound for ${label}`,
      );
    }
    expect(document.querySelectorAll(".v7-gallery-sound-choices").length).toBe(
      SOUND_CHOICE_SETS_V1.length,
    );
    // A theme has no row.
    expect(
      row("theme:UNDEAD").querySelector(".v7-gallery-sound-choice"),
    ).toBeNull();
    // No manifest id is shown as text, here either.
    for (const id of SOUND_IDS_V1)
      expect(row(id).textContent ?? "", id).not.toContain(id);
  });

  it("marks the synth as the default of a sound none of whose takes passed", () => {
    mount();
    openSounds();
    expect(choiceSet(TRAIN).default).toBe(0);
    expect(row(TRAIN).dataset.origin).toBe("generated");
    expect(chosen(TRAIN)).toEqual(["0"]);
    expect(
      choicePlay(TRAIN, 0).querySelector(".v7-gallery-sound-choice-default")
        ?.textContent,
    ).toBe("default");
    expect(choiceUse(TRAIN, 0).getAttribute("aria-pressed")).toBe("true");
    expect(choiceUse(TRAIN, TRAIN_TAKE).getAttribute("aria-pressed")).toBe(
      "false",
    );
    // Its card is still a synth card: no "Synth" variant beside it.
    expect(row(TRAIN).querySelector('[data-variant="generated"]')).toBeNull();
  });

  it("fetches an alternative when it is played, not before, and plays it", async () => {
    const view = mount().view;
    openSounds();
    // Opening the Gallery was the first gesture: the defaults were asked
    // for, and the menus' title theme (the one theme, bead 2yc.27).
    await settle();
    expect([...fetched].sort()).toEqual(
      [
        ...SOUND_DEFAULT_CLIPS_V1.map((clip) => soundCandidateUrlV1(clip)),
        TITLE_THEME_URL,
      ].sort(),
    );
    expect(fetched).not.toContain(url(HIT, 2));
    const play = vi.spyOn(view.audio, "play");
    const before = device.sources.length;
    // The Gallery and tab buttons clicked on the way here.
    view.audio.clearLog();

    choicePlay(HIT, 2).click();
    expect(row(HIT).dataset.loadingChoice).toBe("2");
    await settle();
    expect(fetched.filter((entry) => entry === url(HIT, 2))).toHaveLength(1);
    expect(row(HIT).dataset.loadingChoice).toBeUndefined();
    expect(play).toHaveBeenLastCalledWith(HIT, { candidate: 2 });
    expect(device.sources.length).toBe(before + 1);
    expect(device.sources.at(-1)?.seconds).toBe(seconds(2));
    // The card is marked as playing, and so is that line.
    expect(row(HIT).dataset.playing).toBe("true");
    expect(row(HIT).dataset.playingChoice).toBe("2");
    expect(choicePlay(HIT, 2).dataset.heard).toBe("true");
    expect(choicePlay(HIT, HIT_NEW).dataset.heard).toBe("false");
    // Hearing it did not pick it.
    expect(chosen(HIT)).toEqual([String(HIT_NEW)]);
    expect(storedPicks()).toBeNull();
    expect(view.audio.soundCandidate(HIT)).toBe(HIT_NEW);

    // Played again, it is not fetched again.
    choicePlay(HIT, 2).click();
    await settle();
    expect(fetched.filter((entry) => entry === url(HIT, 2))).toHaveLength(1);
    expect(device.sources.at(-1)?.seconds).toBe(seconds(2));

    // The default's own line plays the default; the last line the synth.
    choicePlay(HIT, HIT_NEW).click();
    await settle();
    expect(device.sources.at(-1)?.seconds).toBe(seconds(HIT_NEW));
    expect(row(HIT).dataset.playingChoice).toBe(String(HIT_NEW));
    expect(choicePlay(HIT, 2).dataset.heard).toBe("false");
    choicePlay(HIT, 0).click();
    expect(play).toHaveBeenLastCalledWith(HIT, { generated: true });
    expect(device.sources.at(-1)?.seconds).toBeCloseTo(synthSeconds(HIT), 6);
    expect(row(HIT).dataset.playingChoice).toBeUndefined();
    // No interface click was added to any of it.
    expect(view.audio.log.some((entry) => entry.id === "ui.click")).toBe(false);
  });

  it("says so when a recording cannot be loaded", async () => {
    missing.add(url(HIT, 3));
    mount();
    openSounds();
    await settle();
    const before = device.sources.length;
    const notice = required(".v7-gallery-sounds-notice");
    expect(notice.hidden).toBe(true);
    choicePlay(HIT, 3).click();
    await settle();
    expect(device.sources.length).toBe(before);
    expect(row(HIT).dataset.playing).toBe("false");
    expect(notice.hidden).toBe(false);
    expect(notice.dataset.reason).toBe("file");
    expect(notice.textContent).toBe("That recording could not be loaded");
    // Another line still plays, and takes the notice away.
    choicePlay(HIT, 2).click();
    await settle();
    expect(device.sources.length).toBe(before + 1);
    expect(notice.hidden).toBe(true);
  });

  it("says there is no sound device when a line is played without one", async () => {
    uninstallFakeAudioContext(window);
    mount();
    openSounds();
    const notice = required(".v7-gallery-sounds-notice");
    choicePlay(HIT, 2).click();
    await settle();
    expect(fetched).toEqual([]);
    expect(notice.hidden).toBe(false);
    expect(notice.dataset.reason).toBe("device");
    expect(notice.textContent).toBe("No sound on this device");
    expect(row(HIT).dataset.playing).toBe("false");
    // A pick is still taken and stored: it is a preference, not a sound.
    choiceUse(HIT, 2).click();
    expect(chosen(HIT)).toEqual(["2"]);
    expect(storedPicks()).toEqual({ [HIT]: 2 });
  });

  it("points at the notice instead of playing with sound off", async () => {
    window.localStorage.setItem(
      AUDIO_SETTINGS_STORAGE_KEY_V1,
      '{"enabled":false,"volume":70}',
    );
    mount();
    openSounds();
    choicePlay(HIT, 2).click();
    await settle();
    expect(fetched).toEqual([]);
    expect(device.contexts()).toBe(0);
    expect(required(".v7-gallery-sounds-notice").dataset.nudged).toBe("true");
  });
});

describe("Gallery Sounds tab: picking a recording", () => {
  it("makes the game play the picked recording at once, and remembers it", async () => {
    const view = mount().view;
    openSounds();
    await settle();
    const use = choiceUse(HIT, 2);
    use.focus();
    use.click();
    await settle();

    expect(view.audio.picks).toEqual({ [HIT]: 2 });
    expect(storedPicks()).toEqual({ [HIT]: 2 });
    expect(fetched).toContain(url(HIT, 2));
    expect(view.audio.soundCandidate(HIT)).toBe(2);
    // The row marks it; the default keeps its own mark.
    expect(chosen(HIT)).toEqual(["2"]);
    expect(choiceUse(HIT, 2).getAttribute("aria-pressed")).toBe("true");
    expect(choiceUse(HIT, 2).textContent).toBe("In use");
    expect(choiceUse(HIT, HIT_NEW).getAttribute("aria-pressed")).toBe("false");
    expect(choiceUse(HIT, HIT_NEW).textContent).toBe("Use");
    expect(
      choicePlay(HIT, HIT_NEW).querySelector(
        ".v7-gallery-sound-choice-default",
      ),
    ).not.toBeNull();
    // The card was drawn again; the focus is on the same control.
    expect(document.activeElement).toBe(choiceUse(HIT, 2));
    // The card says what the sound plays now.
    const picked = stockSoundCandidateV1(HIT, 2);
    if (picked === null) throw new Error("missing candidate");
    expect(
      row(HIT).querySelector(".v7-gallery-sound-origin-file")?.textContent,
    ).toBe(picked.originalFile);
    expect(card(HIT).getAttribute("aria-label")).toBe(
      `Play: Hit. Recorded: ${picked.library} / ${picked.originalFile}, ${picked.startSeconds}–${picked.endSeconds} s`,
    );
    // The card plays the sound as a match does: the picked recording.
    card(HIT).click();
    expect(device.sources.at(-1)?.seconds).toBe(seconds(2));
    // What the game itself asks for is the picked recording too.
    view.audio.stop(HIT);
    expect(view.audio.play(HIT)).toBe("PLAYED");
    expect(device.sources.at(-1)?.seconds).toBe(seconds(2));
    // The other cards are as they were.
    expect(chosen("impact.heavy")).toEqual([
      String(choiceSet("impact.heavy").default),
    ]);
    expect(required("[data-sound-pick-count]").textContent).toBe("1 pick.");

    // Another take can be picked the same way.
    const second = choiceSet(HIT).candidates[1]?.n ?? -1;
    choiceUse(HIT, second).click();
    await settle();
    expect(view.audio.picks).toEqual({ [HIT]: second });
    expect(fetched).toContain(url(HIT, second));
    card(HIT).click();
    expect(device.sources.at(-1)?.seconds).toBe(seconds(second));

    // Picking the default again forgets the pick.
    choiceUse(HIT, HIT_NEW).click();
    await settle();
    expect(view.audio.picks).toEqual({});
    expect(storedPicks()).toBeNull();
    expect(chosen(HIT)).toEqual([String(HIT_NEW)]);
    expect(required("[data-sound-pick-count]").textContent).toBe(
      "No picks yet.",
    );
    card(HIT).click();
    expect(device.sources.at(-1)?.seconds).toBe(seconds(HIT_NEW));
  });

  it("can set a sound back to its synth version", async () => {
    const view = mount().view;
    openSounds();
    await settle();
    expect(row(HIT).dataset.origin).toBe("elevenlabs");
    choiceUse(HIT, 0).click();
    expect(view.audio.picks).toEqual({ [HIT]: 0 });
    expect(chosen(HIT)).toEqual(["0"]);
    expect(row(HIT).dataset.origin).toBe("generated");
    expect(
      row(HIT).querySelector(".v7-gallery-sound-origin")?.textContent,
    ).toBe("Synth");
    expect(card(HIT).getAttribute("aria-label")).toBe("Play: Hit. Synth");
    // The card is the synth now: no "Synth" variant beside the pitches.
    expect(row(HIT).querySelector('[data-variant="generated"]')).toBeNull();
    card(HIT).click();
    expect(device.sources.at(-1)?.seconds).toBeCloseTo(synthSeconds(HIT), 6);
    expect(view.audio.soundSource(HIT)).toBe("GENERATED");
  });

  it("can give a sound that plays the synth by default a take", async () => {
    const view = mount().view;
    openSounds();
    await settle();
    expect(fetched).not.toContain(url(TRAIN, TRAIN_TAKE));
    choiceUse(TRAIN, TRAIN_TAKE).click();
    await settle();
    expect(fetched).toContain(url(TRAIN, TRAIN_TAKE));
    expect(view.audio.picks).toEqual({ [TRAIN]: TRAIN_TAKE });
    expect(chosen(TRAIN)).toEqual([String(TRAIN_TAKE)]);
    expect(row(TRAIN).dataset.origin).toBe("elevenlabs");
    // A card with a clip: its synth version is beside it again.
    expect(
      row(TRAIN).querySelector('[data-variant="generated"]'),
    ).not.toBeNull();
    card(TRAIN).click();
    expect(device.sources.at(-1)?.seconds).toBe(seconds(TRAIN_TAKE));
    // The synth is still marked as the default.
    expect(
      choicePlay(TRAIN, 0).querySelector(".v7-gallery-sound-choice-default"),
    ).not.toBeNull();
  });

  it("applies the stored picks after a reload", async () => {
    mount();
    openSounds();
    await settle();
    choiceUse(HIT, 3).click();
    choiceUse(TRAIN, TRAIN_TAKE).click();
    await settle();
    app?.destroy();
    app = null;
    clearSoundFilesV1();
    fetched = [];
    document.body.innerHTML = '<div id="app"></div>';

    const view = mount().view;
    expect(view.audio.picks).toEqual({ [HIT]: 3, [TRAIN]: TRAIN_TAKE });
    // The Gallery opens on the remembered Sounds tab.
    button("gallery").click();
    await settle();
    // The picked recordings were fetched, not the default they replace.
    expect(fetched).toContain(url(HIT, 3));
    expect(fetched).not.toContain(url(HIT, HIT_NEW));
    expect(fetched).toContain(url(TRAIN, TRAIN_TAKE));
    expect(chosen(HIT)).toEqual(["3"]);
    expect(chosen(TRAIN)).toEqual([String(TRAIN_TAKE)]);
    expect(required("[data-sound-pick-count]").textContent).toBe("2 picks.");
    card(HIT).click();
    expect(device.sources.at(-1)?.seconds).toBe(seconds(3));
  });

  it("ignores a stored pick whose recording no longer exists", async () => {
    window.localStorage.setItem(
      STOCK_SOUND_PICKS_STORAGE_KEY_V1,
      JSON.stringify({
        [HIT]: 99,
        [SOUND_TITLE_THEME_ID_V1]: 1,
        nonsense: 2,
      }),
    );
    const view = mount().view;
    openSounds();
    await settle();
    expect(view.audio.picks).toEqual({});
    expect(chosen(HIT)).toEqual([String(HIT_NEW)]);
    expect(fetched).toContain(url(HIT, HIT_NEW));
    expect(required("[data-sound-pick-count]").textContent).toBe(
      "No picks yet.",
    );
    card(HIT).click();
    expect(device.sources.at(-1)?.seconds).toBe(seconds(HIT_NEW));
  });

  it("reaches every line with the arrow keys, card by card with Tab", () => {
    mount();
    const panel = openSounds();
    const hit = card(HIT);
    // Tab walks the cards; the lines under a card are reached with the arrows.
    expect(hit.tabIndex).toBe(0);
    for (const node of panel.querySelectorAll<HTMLElement>(
      ".v7-gallery-sound-choice-play, .v7-gallery-sound-choice-use",
    )) {
      expect(node.tabIndex).toBe(-1);
      expect(node.dataset.soundControl).toBe("true");
    }
    const order = [
      ...row(HIT).querySelectorAll<HTMLElement>("[data-sound-control]"),
    ].filter((node) => !node.hidden);
    // The card, its pitches and synth version, then the lines in order.
    const takes = choiceSet(HIT).candidates.filter(
      (candidate) => candidate.origin === "ELEVENLABS",
    );
    expect(order.map((node) => node.getAttribute("aria-label"))).toEqual([
      hit.getAttribute("aria-label"),
      "Play lower: Hit",
      "Play higher: Hit",
      "Play synth: Hit",
      ...takes.flatMap((take, index) => [
        choicePlay(HIT, take.n).getAttribute("aria-label"),
        `Use new ${index + 1} for Hit`,
      ]),
      ...[1, 2, 3].flatMap((n) => [
        choicePlay(HIT, n).getAttribute("aria-label"),
        `Use old recording ${n} for Hit`,
      ]),
      "Play synth: Hit",
      "Use the synth sound for Hit",
    ]);
    hit.focus();
    for (const next of order.slice(1)) {
      const from = document.activeElement as HTMLElement;
      expect(key(from, "ArrowRight").defaultPrevented).toBe(true);
      expect(document.activeElement).toBe(next);
    }
    // Right from the last line is the next card; Left comes back.
    const last = document.activeElement as HTMLElement;
    key(last, "ArrowRight");
    expect(document.activeElement).toBe(card("impact.heavy"));
    key(card("impact.heavy"), "ArrowLeft");
    expect(document.activeElement).toBe(last);
    // Up and Down from a line go to the cards above and below.
    key(last, "ArrowDown");
    expect(document.activeElement).toBe(card("impact.heavy"));
    // Enter and Space press a line as they press any button.
    expect(choiceUse(HIT, 2).tagName).toBe("BUTTON");
  });
});

describe("Gallery Sounds tab: the picks as text", () => {
  it("says how many sounds have recordings and how many have a pick", () => {
    mount();
    openSounds();
    const bar = required("[data-v7-sound-picks]");
    expect(bar.hidden).toBe(false);
    expect(required(".v7-gallery-sounds-picks-text").textContent).toBe(
      `No picks yet. ${SOUND_CHOICE_SETS_V1.length} sounds have versions: New (ElevenLabs), Old (the recordings before) and Synth. Press Use on the one you like: the game plays it from then on, in this browser.`,
    );
    // Nothing to forget yet.
    expect(button("gallery-sound-picks-reset").hidden).toBe(true);
    expect(button("gallery-sound-picks-copy").textContent).toBe(
      "Copy my picks",
    );
    expect(
      required<HTMLTextAreaElement>("[data-sound-pick-output]").hidden,
    ).toBe(true);
  });

  it("copies the picks as compact text and shows it", async () => {
    const written: string[] = [];
    Object.defineProperty(window.navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: (text: string): Promise<void> => {
          written.push(text);
          return Promise.resolve();
        },
      },
    });
    const view = mount().view;
    openSounds();
    await settle();
    choiceUse(HIT, 2).click();
    choiceUse(TRAIN, TRAIN_TAKE).click();
    choiceUse("impact.heavy", 0).click();
    await settle();
    const expected = stockSoundPickSummaryV1(view.audio.picks);
    button("gallery-sound-picks-copy").click();
    await settle();
    expect(written).toEqual([expected]);
    expect(JSON.parse(expected)).toMatchObject({
      pulpWarsSoundPicks: 1,
      picks: { [HIT]: 2, "impact.heavy": 0, [TRAIN]: TRAIN_TAKE },
    });
    const output = required<HTMLTextAreaElement>("[data-sound-pick-output]");
    expect(output.hidden).toBe(false);
    expect(output.readOnly).toBe(true);
    expect(output.value).toBe(expected);
    expect(output.getAttribute("aria-label")).toBe("Your picks, as text");
    const status = required(".v7-gallery-sounds-picks-status");
    expect(status.getAttribute("role")).toBe("status");
    expect(status.textContent).toBe("Copied");
    // The text on show follows a later pick.
    choiceUse(HIT, 3).click();
    await settle();
    expect(output.value).toBe(stockSoundPickSummaryV1(view.audio.picks));
    expect(JSON.parse(output.value)).toMatchObject({ picks: { [HIT]: 3 } });
  });

  it("shows the text selected, to copy by hand, where there is no clipboard", async () => {
    mount();
    openSounds();
    await settle();
    choiceUse(HIT, 2).click();
    await settle();
    button("gallery-sound-picks-copy").click();
    await settle();
    const output = required<HTMLTextAreaElement>("[data-sound-pick-output]");
    expect(output.hidden).toBe(false);
    expect(JSON.parse(output.value)).toMatchObject({ picks: { [HIT]: 2 } });
    expect(required(".v7-gallery-sounds-picks-status").textContent).toBe(
      "Select the text below and copy it",
    );
    expect(document.activeElement).toBe(output);
    expect(output.selectionStart).toBe(0);
    expect(output.selectionEnd).toBe(output.value.length);
  });

  it("forgets every pick from its reset control", async () => {
    const view = mount().view;
    openSounds();
    await settle();
    choiceUse(HIT, 2).click();
    choiceUse(TRAIN, TRAIN_TAKE).click();
    await settle();
    const reset = button("gallery-sound-picks-reset");
    expect(reset.hidden).toBe(false);
    reset.click();
    await settle();
    expect(view.audio.picks).toEqual({});
    expect(storedPicks()).toBeNull();
    expect(chosen(HIT)).toEqual([String(HIT_NEW)]);
    expect(chosen(TRAIN)).toEqual(["0"]);
    expect(row(TRAIN).dataset.origin).toBe("generated");
    expect(reset.hidden).toBe(true);
    expect(required(".v7-gallery-sounds-picks-status").textContent).toBe(
      "Picks cleared",
    );
    expect(document.activeElement).toBe(button("gallery-sound-picks-copy"));
    card(HIT).click();
    expect(device.sources.at(-1)?.seconds).toBe(seconds(HIT_NEW));
  });

  it("offers no choice, and fetches nothing, with ?stock-sounds=0", async () => {
    window.localStorage.setItem(
      STOCK_SOUND_PICKS_STORAGE_KEY_V1,
      JSON.stringify({ [HIT]: 2 }),
    );
    window.history.replaceState(null, "", "?stock-sounds=0");
    try {
      const view = mount().view;
      openSounds();
      await settle();
      expect(view.audio.stockSounds).toBe(false);
      expect(view.audio.picks).toEqual({});
      expect(document.querySelector(".v7-gallery-sound-choices")).toBeNull();
      expect(document.querySelector('[data-choices="true"]')).toBeNull();
      expect(required("[data-v7-sound-picks]").hidden).toBe(true);
      card(HIT).click();
      expect(device.sources.at(-1)?.seconds).toBeCloseTo(synthSeconds(HIT), 6);
      // No clip at all; the title theme is music, not a recording of a
      // sound, and the switch does not concern it.
      expect(fetched).toEqual([TITLE_THEME_URL]);
      // The stored pick is kept for a visit with the recordings on.
      expect(storedPicks()).toEqual({ [HIT]: 2 });
    } finally {
      window.history.replaceState(null, "", window.location.pathname);
    }
  });
});
