// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { bootstrapRuleset7App } from "../../src/app/index";
import {
  AUDIO_SETTINGS_STORAGE_KEY_V1,
  DEFAULT_CATEGORY_GAINS_V1,
  OTHER_PLAYER_BUILD_GAIN_V7,
  SOUND_IDS_V1,
  SOUND_MANIFEST_V1,
  STOCK_SOUND_CLIPS_V1,
  audioVolumeGainV1,
  type SoundIdV1,
} from "../../src/audio/index";
import { FACTION_IDS_V7 } from "../../src/engine/index";
import { GALLERY_FILTERS_STORAGE_KEY_V7 } from "../../src/render/gallery-presentation-v7";
import { gallerySoundGroupsV7 } from "../../src/render/gallery-sounds-presentation-v7";
import {
  installFakeAudioContext,
  uninstallFakeAudioContext,
  type FakeAudioDeviceV1,
} from "../fixtures/fake-audio-context";
import { RecordingBoardHost } from "../fixtures/v7-dom-rig";

/**
 * The Gallery's Sounds tab (bead pulp_wars-2yc.19, docs/ui/SOUND.md "The
 * Gallery's Sounds tab"): every sound of the manifest as a card that plays
 * it through the game's own audio, the playing state and the stop control,
 * the notice when nothing would be heard, the pending faction themes and
 * the keyboard. jsdom has no WebAudio: a recording `AudioContext` stands in
 * for the device.
 */

const COORDINATE = /\b\d{1,2}, ?\d{1,2}\b/;

let app: ReturnType<typeof bootstrapRuleset7App> | null = null;

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

/** Opens the Gallery's Sounds tab from the front screen. */
function openSounds(): HTMLElement {
  button("gallery").click();
  button("gallery-tab-sounds").click();
  return required("[data-v7-gallery-sounds]");
}

function card(id: string): HTMLButtonElement {
  return required<HTMLButtonElement>(`[data-sound-play="${id}"]`);
}

function row(id: string): HTMLElement {
  return required(`[data-sound-row="${id}"]`);
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

function playing(): string[] {
  return [
    ...document.querySelectorAll<HTMLElement>(
      '.v7-gallery-sound[data-playing="true"]',
    ),
  ].map((node) => node.dataset.soundRow ?? "");
}

let device: FakeAudioDeviceV1;

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  window.localStorage.clear();
  device = installFakeAudioContext(window);
});

afterEach(() => {
  app?.destroy();
  app = null;
  vi.useRealTimers();
  uninstallFakeAudioContext(window);
});

describe("Gallery Sounds tab", () => {
  it("is the Gallery's last tab and is remembered like the others", () => {
    mount();
    button("gallery").click();
    const tabs = [...document.querySelectorAll<HTMLElement>('[role="tab"]')];
    expect(tabs.at(-1)?.textContent).toBe("Sounds");
    expect(document.querySelector("[data-v7-gallery-sounds]")).toBeNull();
    button("gallery-tab-sounds").click();
    const tab = button("gallery-tab-sounds");
    expect(tab.getAttribute("aria-selected")).toBe("true");
    expect(required("#v7-gallery-panel").dataset.tab).toBe("sounds");
    expect(required("#v7-gallery-panel").getAttribute("aria-labelledby")).toBe(
      tab.id,
    );
    // No table and no filters: cards.
    expect(document.querySelector(".v7-gallery-table")).toBeNull();
    expect(document.querySelector(".v7-gallery-filters")).toBeNull();
    expect(
      JSON.parse(
        window.localStorage.getItem(GALLERY_FILTERS_STORAGE_KEY_V7) ?? "{}",
      ),
    ).toMatchObject({ tab: "SOUNDS" });
    // The arrow keys still walk the tabs, wrapping from Sounds to Units.
    key(tab, "ArrowRight");
    expect(button("gallery-tab-units").getAttribute("aria-selected")).toBe(
      "true",
    );
    key(button("gallery-tab-units"), "ArrowLeft");
    expect(button("gallery-tab-sounds").getAttribute("aria-selected")).toBe(
      "true",
    );
    app?.destroy();
    // A new visit opens on the remembered tab.
    document.body.innerHTML = '<div id="app"></div>';
    mount();
    button("gallery").click();
    expect(document.querySelector("[data-v7-gallery-sounds]")).not.toBeNull();
  });

  it("lists every manifest sound once, grouped, with a picture and few words", () => {
    mount();
    const panel = openSounds();
    const cards = [
      ...panel.querySelectorAll<HTMLButtonElement>("[data-sound-play]"),
    ];
    // The manifest is the list: nothing missing, nothing extra, no repeat.
    expect(
      cards
        .map((node) => node.dataset.soundId)
        .filter((id) => id !== undefined),
    ).toEqual(
      gallerySoundGroupsV7()
        .flatMap((group) => group.entries)
        .map((entry) => entry.key)
        .filter((id) => id !== null),
    );
    expect(
      cards
        .map((node) => node.dataset.soundId)
        .filter((id) => id !== undefined)
        .sort(),
    ).toEqual([...SOUND_IDS_V1].sort());
    expect(
      [...panel.querySelectorAll(".v7-gallery-sound-group")].map((group) => [
        group.querySelector("h2")?.textContent,
        group.querySelectorAll("[data-sound-play]").length,
      ]),
    ).toEqual(
      gallerySoundGroupsV7().map((group) => [
        group.label,
        group.entries.length,
      ]),
    );
    for (const node of cards) {
      expect(node.type).toBe("button");
      const name = node.querySelector(".v7-gallery-sound-name")?.textContent;
      const when = node.querySelector(".v7-gallery-sound-when")?.textContent;
      expect(name).toBeTruthy();
      expect(when).toBeTruthy();
      expect(node.getAttribute("aria-label")).toMatch(
        new RegExp(`^Play: ${name ?? ""}`),
      );
      // A picture: game art (with the loudspeaker until it loads) or a glyph.
      const picture = node.querySelector<HTMLElement>(
        ".v7-gallery-sound-picture",
      );
      expect(picture?.getAttribute("aria-hidden")).toBe("true");
      expect(picture?.querySelector("svg, img")).not.toBeNull();
      expect(node.textContent ?? "").not.toMatch(COORDINATE);
    }
    expect(card("attack.ranged").getAttribute("aria-label")).toBe(
      "Play: Arrow shot. Generated",
    );
    expect(card("city.capture").textContent).toBe(
      "City capturedYou take a cityGenerated",
    );
    // No manifest id is shown as text.
    for (const id of SOUND_IDS_V1)
      expect(panel.textContent ?? "", id).not.toContain(id);
  });

  it("plays a card through the mixer at the player's volume, and marks it", () => {
    vi.useFakeTimers();
    const mounted = mount();
    openSounds();
    // The Gallery and tab buttons clicked on the way here.
    const before = device.sources.length;
    mounted.view.audio.clearLog();
    const victory = card("match.victory");
    victory.click();
    expect(mounted.view.audio.log).toEqual([
      { id: "match.victory", outcome: "PLAYED" },
    ]);
    expect(device.sources.length).toBe(before + 1);
    const source = device.sources.at(-1);
    // The mixer's category level, and the stored volume as master gain.
    expect(source?.gain).toBeCloseTo(DEFAULT_CATEGORY_GAINS_V1.ui, 6);
    expect(source?.rate).toBe(1);
    expect(source?.loop).toBe(false);
    expect(device.masterGain()).toBeCloseTo(audioVolumeGainV1(70), 6);
    // The card shows that it plays, and a long sound can be stopped.
    expect(playing()).toEqual(["match.victory"]);
    const stop = required<HTMLButtonElement>(
      '[data-sound-row="match.victory"] .v7-gallery-sound-stop',
    );
    expect(stop.hidden).toBe(false);
    expect(stop.getAttribute("aria-label")).toBe("Stop: Victory");
    // A short sound has no stop control at all.
    expect(
      row("impact.hit").querySelector(".v7-gallery-sound-stop"),
    ).toBeNull();

    // Another card overlaps, as the mixer lets effects do.
    card("impact.hit").click();
    expect(playing()).toEqual(["impact.hit", "match.victory"]);
    expect(source?.stopped).toBe(false);
    // The short one is over first.
    vi.advanceTimersByTime(400);
    expect(playing()).toEqual(["match.victory"]);

    // A second press starts it again from the beginning.
    victory.click();
    expect(source?.stopped).toBe(true);
    expect(device.sources.at(-1)).not.toBe(source);
    expect(device.sources.at(-1)?.stopped).toBe(false);
    expect(playing()).toEqual(["match.victory"]);
    // It ends by itself after its length.
    vi.advanceTimersByTime(1700);
    expect(playing()).toEqual(["match.victory"]);
    vi.advanceTimersByTime(300);
    expect(playing()).toEqual([]);
    expect(stop.hidden).toBe(true);

    // The stop control cuts it and gives the focus back to the card.
    victory.click();
    stop.focus();
    stop.click();
    expect(device.sources.at(-1)?.stopped).toBe(true);
    expect(playing()).toEqual([]);
    expect(stop.hidden).toBe(true);
    expect(document.activeElement).toBe(victory);
    // No interface click was added to any of it.
    expect(
      mounted.view.audio.log.some((entry) => entry.id === "ui.click"),
    ).toBe(false);
  });

  it("follows the volume slider and the toggle of its own bar", () => {
    const mounted = mount();
    openSounds();
    const slider = required<HTMLInputElement>("#v7-sound-volume-gallery");
    expect(slider.value).toBe("70");
    slider.value = "40";
    slider.dispatchEvent(new Event("input", { bubbles: true }));
    expect(mounted.view.audio.settings.volume).toBe(40);
    card("ui.error").click();
    expect(device.masterGain()).toBeCloseTo(audioVolumeGainV1(40), 6);
    expect(window.localStorage.getItem(AUDIO_SETTINGS_STORAGE_KEY_V1)).toBe(
      '{"enabled":true,"volume":40}',
    );
  });

  it("offers a detuned sound's lower and higher, and the quiet building", () => {
    mount();
    openSounds();
    const hit = row("impact.hit");
    const variants = [
      ...hit.querySelectorAll<HTMLButtonElement>(".v7-gallery-sound-variant"),
    ];
    expect(variants.map((node) => node.getAttribute("aria-label"))).toEqual([
      "Play lower: Hit",
      "Play higher: Hit",
      "Play generated: Hit",
    ]);
    const cents = SOUND_MANIFEST_V1["impact.hit"].jitterCents;
    variants[0]?.click();
    expect(device.sources.at(-1)?.rate).toBeCloseTo(2 ** (-cents / 1200), 6);
    expect(playing()).toEqual(["impact.hit"]);
    variants[1]?.click();
    expect(device.sources.at(-1)?.rate).toBeCloseTo(2 ** (cents / 1200), 6);
    // A tune is never detuned: it has no variants.
    expect(
      row("match.victory").querySelector(".v7-gallery-sound-variant"),
    ).toBeNull();
    // Another player's building is heard quieter than one's own.
    const far = required<HTMLButtonElement>(
      '[data-sound-row="economy.build"] [data-variant="far"]',
    );
    expect(far.getAttribute("aria-label")).toBe(
      "Play as another player's: Build",
    );
    card("economy.build").click();
    const own = device.sources.at(-1)?.gain ?? 0;
    far.click();
    expect(device.sources.at(-1)?.gain).toBeCloseTo(
      own * OTHER_PLAYER_BUILD_GAIN_V7,
      6,
    );
  });

  it("says that sound is off and turns it on from the tab", () => {
    window.localStorage.setItem(
      AUDIO_SETTINGS_STORAGE_KEY_V1,
      '{"enabled":false,"volume":70}',
    );
    const mounted = mount();
    const panel = openSounds();
    const notice = required(".v7-gallery-sounds-notice");
    expect(notice.hidden).toBe(false);
    expect(notice.getAttribute("role")).toBe("status");
    expect(notice.textContent).toBe("Sound is offTurn on");
    expect(panel.dataset.muted).toBe("true");
    // A card does not pretend to play: nothing reaches the device, the
    // card is not marked, and the notice is pointed at.
    card("impact.hit").click();
    expect(device.contexts()).toBe(0);
    expect(playing()).toEqual([]);
    expect(notice.dataset.nudged).toBe("true");
    button("gallery-sounds-unmute").click();
    expect(mounted.view.audio.settings).toEqual({ enabled: true, volume: 70 });
    expect(notice.hidden).toBe(true);
    expect(notice.dataset.nudged).toBeUndefined();
    expect(panel.dataset.muted).toBe("false");
    // The bar's toggle shows the new state and has the focus.
    const toggle = button("sound-toggle-gallery");
    expect(toggle.getAttribute("aria-pressed")).toBe("true");
    expect(document.activeElement).toBe(toggle);
    card("impact.hit").click();
    expect(playing()).toEqual(["impact.hit"]);

    // The bar's own toggle brings the notice back and cuts what plays.
    toggle.click();
    expect(notice.hidden).toBe(false);
    expect(playing()).toEqual([]);
    expect(device.sources.at(-1)?.stopped).toBe(true);
  });

  it("says that the volume is at zero and turns it up", () => {
    window.localStorage.setItem(
      AUDIO_SETTINGS_STORAGE_KEY_V1,
      '{"enabled":true,"volume":0}',
    );
    const mounted = mount();
    openSounds();
    const notice = required(".v7-gallery-sounds-notice");
    expect(notice.hidden).toBe(false);
    expect(notice.textContent).toBe("Volume is at 0Turn up");
    const before = device.sources.length;
    card("impact.hit").click();
    expect(device.sources.length).toBe(before);
    button("gallery-sounds-unmute").click();
    expect(mounted.view.audio.settings).toEqual({ enabled: true, volume: 70 });
    expect(required<HTMLInputElement>("#v7-sound-volume-gallery").value).toBe(
      "70",
    );
    expect(notice.hidden).toBe(true);
    // Dragging the slider back to zero shows it again.
    const slider = required<HTMLInputElement>("#v7-sound-volume-gallery");
    slider.value = "0";
    slider.dispatchEvent(new Event("input", { bubbles: true }));
    expect(notice.hidden).toBe(false);
    expect(notice.textContent).toBe("Volume is at 0Turn up");
  });

  it("says so when the browser has no sound device", () => {
    uninstallFakeAudioContext(window);
    vi.useFakeTimers();
    mount();
    openSounds();
    const notice = required(".v7-gallery-sounds-notice");
    expect(notice.hidden).toBe(true);
    card("impact.hit").click();
    // One more try a moment later, in case the press itself woke the device.
    expect(notice.hidden).toBe(true);
    vi.advanceTimersByTime(200);
    expect(notice.hidden).toBe(false);
    expect(notice.textContent).toBe("No sound on this device");
    expect(button("gallery-sounds-unmute").hidden).toBe(true);
    expect(playing()).toEqual([]);
  });

  it("shows a pending theme row for every faction", () => {
    const mounted = mount();
    openSounds();
    const group = required('.v7-gallery-sound-group[data-group="themes"]');
    expect(group.querySelector("h2")?.textContent).toBe("Themes");
    const rows = [...group.querySelectorAll<HTMLElement>(".v7-gallery-sound")];
    expect(rows.map((node) => node.dataset.faction)).toEqual([
      ...FACTION_IDS_V7,
    ]);
    mounted.view.audio.clearLog();
    const before = device.sources.length;
    for (const node of rows) {
      expect(node.dataset.pending).toBe("true");
      const play = node.querySelector<HTMLButtonElement>("[data-sound-play]");
      // Focusable and named, but not playable: aria-disabled, not disabled.
      expect(play?.getAttribute("aria-disabled")).toBe("true");
      expect(play?.disabled).toBe(false);
      expect(play?.dataset.soundId).toBeUndefined();
      expect(play?.getAttribute("aria-label")).toMatch(
        /^Play: .+ theme, coming soon$/,
      );
      expect(play?.querySelector(".v7-gallery-sound-when")?.textContent).toBe(
        "Coming soon",
      );
      // The faction's portrait in its colour, no play mark, no extras.
      expect(
        play
          ?.querySelector<HTMLElement>(".v7-gallery-sound-picture")
          ?.style.getPropertyValue("--faction"),
      ).not.toBe("");
      expect(play?.querySelector(".v7-gallery-sound-mark svg")).toBeNull();
      expect(node.querySelector(".v7-gallery-sound-extras")).toBeNull();
      play?.click();
    }
    expect(mounted.view.audio.log).toEqual([]);
    expect(device.sources.length).toBe(before);
    expect(playing()).toEqual([]);
    expect(
      required('[data-sound-play="theme:UNDEAD"]').getAttribute("aria-label"),
    ).toBe("Play: Undead theme, coming soon");
  });

  it("moves between cards and their controls with the arrow keys", () => {
    mount();
    const panel = openSounds();
    const cards = [
      ...panel.querySelectorAll<HTMLButtonElement>("[data-sound-play]"),
    ];
    const first = cards[0];
    const second = cards[1];
    if (first === undefined || second === undefined)
      throw new Error("missing cards");
    // Tab walks the cards; a card's variants are reached with the arrows.
    for (const node of cards) expect(node.tabIndex).toBe(0);
    for (const node of panel.querySelectorAll<HTMLElement>(
      ".v7-gallery-sound-variant",
    ))
      expect(node.tabIndex).toBe(-1);
    first.focus();
    expect(key(first, "ArrowDown").defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(second);
    key(second, "ArrowUp");
    expect(document.activeElement).toBe(first);
    // Up on the first card stays put.
    key(first, "ArrowUp");
    expect(document.activeElement).toBe(first);
    // Right goes through the card's own controls, then on to the next card.
    // The second card (the arrow) is generated: a lower and a higher.
    second.focus();
    key(second, "ArrowRight");
    const lower = document.activeElement as HTMLElement;
    expect(lower.getAttribute("aria-label")).toBe("Play lower: Arrow shot");
    key(lower, "ArrowRight");
    expect(document.activeElement?.getAttribute("aria-label")).toBe(
      "Play higher: Arrow shot",
    );
    const third = cards[2];
    if (third === undefined) throw new Error("missing cards");
    key(document.activeElement as HTMLElement, "ArrowRight");
    expect(document.activeElement).toBe(third);
    key(third, "ArrowLeft");
    expect(document.activeElement?.getAttribute("aria-label")).toBe(
      "Play higher: Arrow shot",
    );
    // Down from a variant goes to the next card.
    key(document.activeElement as HTMLElement, "ArrowDown");
    expect(document.activeElement).toBe(third);
    // Left from a card is the last control of the card before it.
    key(second, "ArrowLeft");
    expect(first.closest(".v7-gallery-sound")).toBe(
      (document.activeElement as HTMLElement).closest(".v7-gallery-sound"),
    );
    expect(document.activeElement).not.toBe(first);
    key(second, "End");
    expect(document.activeElement).toBe(cards.at(-1));
    // The last card is a pending theme: it can still be reached and read.
    expect(cards.at(-1)?.getAttribute("aria-disabled")).toBe("true");
    key(cards.at(-1) as HTMLElement, "Home");
    expect(document.activeElement).toBe(first);
    // A hidden stop control is skipped; a shown one is a stop on the way.
    const victory = card("match.victory");
    const defeat = card("match.defeat");
    victory.focus();
    key(victory, "ArrowRight");
    expect(document.activeElement).toBe(defeat);
    victory.click();
    victory.focus();
    key(victory, "ArrowRight");
    expect(document.activeElement?.getAttribute("aria-label")).toBe(
      "Stop: Victory",
    );
    // The volume slider keeps its own arrow keys.
    const slider = required<HTMLInputElement>("#v7-sound-volume-gallery");
    slider.focus();
    expect(key(slider, "ArrowRight").defaultPrevented).toBe(false);
    expect(document.activeElement).toBe(slider);
    // Escape still leaves the Gallery.
    key(first, "Escape");
    expect(document.querySelector("[data-v7-gallery]")).toBeNull();
  });

  it("stops what it plays when the tab or the Gallery is left", () => {
    mount();
    openSounds();
    card("match.victory").click();
    const first = device.sources.at(-1);
    expect(first?.stopped).toBe(false);
    button("gallery-tab-units").click();
    expect(first?.stopped).toBe(true);
    button("gallery-tab-sounds").click();
    expect(playing()).toEqual([]);
    card("match.defeat").click();
    const second = device.sources.at(-1);
    button("gallery-back").click();
    expect(second?.stopped).toBe(true);
    // Back in the Gallery the tab is silent and unmarked.
    button("gallery").click();
    expect(playing()).toEqual([]);
  });
});

/**
 * Where each sound comes from (bead pulp_wars-2yc.20, docs/ui/SOUND.md
 * "Stock recordings"): the card of a recorded sound shows the library file
 * it was cut from and the cut, a generated one says so, and a recorded card
 * also plays the generated sound it replaced.
 */
describe("Gallery Sounds tab: origins", () => {
  function origin(id: string): HTMLElement {
    return required(`[data-sound-row="${id}"] .v7-gallery-sound-origin`);
  }

  it("shows the origin file and the cut of every recorded sound", () => {
    mount();
    openSounds();
    expect(STOCK_SOUND_CLIPS_V1.length).toBeGreaterThan(0);
    for (const clip of STOCK_SOUND_CLIPS_V1) {
      // A provenance row without a card fails here (the card is required).
      expect(row(clip.id).dataset.origin).toBe("recorded");
      const node = origin(clip.id);
      expect(node.dataset.soundOrigin).toBe("recorded");
      const text = `${clip.library} / ${clip.originalFile}`;
      const cut = `${clip.startSeconds}–${clip.endSeconds} s`;
      // The folder and the file name exactly as the bundle has them.
      expect(
        node.querySelector(".v7-gallery-sound-origin-library")?.textContent,
      ).toBe(`${clip.library} /`);
      expect(
        node.querySelector(".v7-gallery-sound-origin-file")?.textContent,
      ).toBe(clip.originalFile);
      expect(
        node.querySelector(".v7-gallery-sound-origin-cut")?.textContent,
      ).toBe(cut);
      expect(node.textContent).toBe(`${text} ${cut}`);
      // The whole name on hover and for a screen reader, however it wraps.
      expect(node.title).toBe(`Recorded: ${text}, ${cut}`);
      const play = card(clip.id);
      expect(play.getAttribute("aria-label")).toBe(
        `Play: ${SOUND_MANIFEST_V1[clip.id as SoundIdV1].label}. Recorded: ${text}, ${cut}`,
      );
      expect(play.title).toBe(play.getAttribute("aria-label"));
    }
    expect(origin("impact.explosion").textContent).toBe(
      "DavidDumais - Explosion SFX Pack / EXPLReal_Medium Realistic Explosion 15_DDUMAIS_NONE.wav 0–1.05 s",
    );
  });

  it("says Generated on every other card, and agrees with the manifest", () => {
    mount();
    openSounds();
    const recorded = new Set(STOCK_SOUND_CLIPS_V1.map((clip) => clip.id));
    for (const id of SOUND_IDS_V1) {
      const node = origin(id);
      // A card whose origin disagrees with the manifest fails here.
      expect(node.dataset.soundOrigin, id).toBe(
        SOUND_MANIFEST_V1[id].source.kind === "FILE" ? "recorded" : "generated",
      );
      expect(node.dataset.soundOrigin === "recorded", id).toBe(
        recorded.has(id),
      );
      if (recorded.has(id)) continue;
      expect(node.textContent, id).toBe("Generated");
      expect(node.title, id).toBe("Generated");
      expect(card(id).getAttribute("aria-label"), id).toBe(
        `Play: ${SOUND_MANIFEST_V1[id].label}. Generated`,
      );
      expect(
        row(id).querySelector('[data-variant="generated"]'),
        id,
      ).toBeNull();
    }
    expect(
      document.querySelectorAll('.v7-gallery-sound[data-origin="recorded"]')
        .length,
    ).toBe(STOCK_SOUND_CLIPS_V1.length);
    // A theme that is not there yet has no origin to show.
    expect(
      document.querySelector(
        '[data-sound-row="theme:UNDEAD"] .v7-gallery-sound-origin',
      ),
    ).toBeNull();
  });

  it("plays the generated sound of a recorded card from its own control", () => {
    const view = mount().view;
    openSounds();
    const play = vi.spyOn(view.audio, "play");
    const generated = required<HTMLButtonElement>(
      '[data-sound-row="impact.hit"] [data-variant="generated"]',
    );
    // Each control is named after what it plays.
    expect(generated.textContent).toBe("Generated");
    expect(generated.getAttribute("aria-label")).toBe("Play generated: Hit");
    expect(generated.title).toBe("Play generated: Hit");
    generated.click();
    expect(play).toHaveBeenLastCalledWith("impact.hit", { generated: true });
    expect(playing()).toEqual(["impact.hit"]);
    // The card itself plays the sound as a match does.
    card("impact.hit").click();
    expect(play).toHaveBeenLastCalledWith("impact.hit", {});
    // The variants are reached with the arrow keys, the new one last.
    const controls = [
      ...row("impact.hit").querySelectorAll<HTMLElement>(
        ".v7-gallery-sound-play, .v7-gallery-sound-variant",
      ),
    ].filter((node) => !node.hidden);
    expect(controls.at(-1)).toBe(generated);
    controls.at(-2)?.focus();
    key(controls.at(-2) as HTMLElement, "ArrowRight");
    expect(document.activeElement).toBe(generated);
  });

  it("shows every card as generated with ?stock-sounds=0", () => {
    window.history.replaceState(null, "", "?stock-sounds=0");
    try {
      const view = mount().view;
      expect(view.audio.stockSounds).toBe(false);
      openSounds();
      expect(
        document.querySelectorAll('.v7-gallery-sound[data-origin="recorded"]')
          .length,
      ).toBe(0);
      expect(document.querySelector('[data-variant="generated"]')).toBeNull();
      for (const id of SOUND_IDS_V1)
        expect(origin(id).textContent, id).toBe("Generated");
    } finally {
      window.history.replaceState(null, "", window.location.pathname);
    }
  });
});
