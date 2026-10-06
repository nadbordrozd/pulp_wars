import type { ArtSubjectV7 } from "../../assets/chibi-art-v7";
import {
  DEFAULT_AUDIO_SETTINGS_V1,
  SOUND_THEMES_V1,
  STOCK_SOUND_GENERATED_CHOICE_V1,
  stockSoundPickLinesV1,
  stockSoundPickSummaryV1,
  type GameAudioV1,
  type SoundKeyV1,
  type SoundPlayOptionsV1,
  type SoundThemeEntryV1,
} from "../../audio/index";
import { factionColourV7 } from "../canvas/faction-colours-v7";
import {
  GALLERY_SOUND_GENERATED_TEXT_V7,
  gallerySoundCardLabelV7,
  gallerySoundChoiceIdsV7,
  gallerySoundChoicePlayLabelV7,
  gallerySoundChoiceUseLabelV7,
  gallerySoundGroupsV7,
  gallerySoundOriginLabelV7,
  gallerySoundPlayLabelV7,
  type GallerySoundChoiceV7,
  type GallerySoundEntryV7,
  type GallerySoundVariantV7,
} from "../gallery-sounds-presentation-v7";
import type { ChibiDomBoxV7 } from "./chibi-dom-art-v7";
import { SILENT_CLICK_ATTRIBUTE_V7, soundControlsV7 } from "./sound-panel-v7";
import { uiIconV7 } from "./ui-icons-v7";

/**
 * The Gallery's Sounds tab (bead pulp_wars-2yc.19, docs/ui/SOUND.md "The
 * Gallery's Sounds tab"): every sound of the manifest as a card that plays
 * it, grouped, with a picture of what makes it; the faction themes last.
 *
 * A card plays through the game's own audio, at the player's volume. A
 * second press starts the sound again. While a sound plays its card is
 * marked, and a long sound has a stop button. With sound off or the volume
 * at zero the tab says so and offers to turn it on.
 *
 * A sound with recordings (bead pulp_wars-2yc.24, docs/ui/SOUND.md
 * "Choosing between recordings") lists them under its card as a numbered
 * row, each with a control that plays it and one that picks it for this
 * browser; the generated sound is the last of the row. A pick changes what
 * the game plays here at once and is remembered. "Copy my picks" hands the
 * picks to the developer as text.
 */

export interface GallerySoundsPanelOptionsV7 {
  /** Draws game art into a slot (the Gallery's own art loader). */
  readonly fillArt: (
    slot: HTMLElement,
    subject: ArtSubjectV7,
    box: ChibiDomBoxV7,
    ownerColor: string | undefined,
  ) => void;
  /** The registered themes; the manifest's by default (tests pass theirs). */
  readonly themes?: readonly SoundThemeEntryV1[];
  /**
   * Puts text on the clipboard; the browser's by default (a test passes
   * its own). When it fails the text is shown, selected, to copy by hand.
   */
  readonly copyText?: (text: string) => Promise<void>;
}

export interface GallerySoundsPanelV7 {
  readonly root: HTMLElement;
  /** Stops what the tab is playing (the Gallery was left). */
  silence(): void;
  /** Stops what the tab started and drops its timers and listeners. */
  destroy(): void;
}

/** The picture box of a card, in CSS px. */
const PICTURE_BOX: ChibiDomBoxV7 = { width: 40, height: 40 };
/** A device opened by this very press may need a moment to start. */
const DEVICE_RETRY_MS = 150;
/** A card is unmarked this long after its sound ends, never before. */
const END_MARGIN_MS = 15;

const VARIANT_GLYPHS: Readonly<Record<GallerySoundVariantV7["id"], string>> = {
  LOW: "♭",
  HIGH: "♯",
  FAR: "",
  GENERATED: "",
};

interface RowV7 {
  readonly entry: GallerySoundEntryV7;
  readonly node: HTMLElement;
  readonly play: HTMLButtonElement;
  readonly stop: HTMLButtonElement | null;
}

/** The generated sound of a recorded card, as its "Generated" control. */
const GENERATED_REQUEST: SoundPlayOptionsV1 = { generated: true };

export function gallerySoundsPanelV7(
  documentRoot: Document,
  audio: GameAudioV1,
  options: GallerySoundsPanelOptionsV7,
): GallerySoundsPanelV7 {
  const root = documentRoot.createElement("section");
  root.className = "v7-gallery-sounds-panel";
  root.dataset.v7GallerySounds = "true";
  root.setAttribute("aria-label", "Sounds");

  const rows = new Map<string, RowV7>();
  const timers = new Map<SoundKeyV1, ReturnType<typeof setTimeout>>();
  let retry: ReturnType<typeof setTimeout> | null = null;
  /** The device could not play the last request. */
  let silent = false;
  /** The last request was for a recording that could not be loaded. */
  let unloaded = false;
  let destroyed = false;

  // ------------------------------------------------- volume and the notice

  const bar = documentRoot.createElement("div");
  bar.className = "v7-gallery-sounds-bar";
  const drawControls = (): void => {
    bar.replaceChildren(
      soundControlsV7(documentRoot, audio, { idSuffix: "-gallery" }),
    );
  };
  drawControls();

  const notice = documentRoot.createElement("p");
  notice.className = "v7-gallery-sounds-notice";
  notice.setAttribute("role", "status");
  const noticeText = documentRoot.createElement("span");
  const unmute = documentRoot.createElement("button");
  unmute.type = "button";
  unmute.className = "v7-gallery-sounds-unmute";
  unmute.dataset.action = "gallery-sounds-unmute";
  unmute.setAttribute(SILENT_CLICK_ATTRIBUTE_V7, "");
  notice.append(uiIconV7(documentRoot, "sound-off"), noticeText, unmute);

  const syncNotice = (): void => {
    const { enabled, volume } = audio.settings;
    const quiet = !enabled || volume === 0;
    notice.hidden = !quiet && !silent;
    root.dataset.muted = String(quiet);
    notice.dataset.reason = !enabled
      ? "off"
      : volume === 0
        ? "volume"
        : unloaded
          ? "file"
          : "device";
    noticeText.textContent = !enabled
      ? "Sound is off"
      : volume === 0
        ? "Volume is at 0"
        : unloaded
          ? "That recording could not be loaded"
          : "No sound on this device";
    unmute.hidden = !quiet;
    unmute.textContent = !quiet ? "" : !enabled ? "Turn on" : "Turn up";
    if (!quiet) delete notice.dataset.nudged;
  };

  unmute.onclick = () => {
    audio.setEnabled(true);
    if (audio.settings.volume === 0)
      audio.setVolume(DEFAULT_AUDIO_SETTINGS_V1.volume);
    // The toggle and the slider are redrawn at the new preference, and take
    // the focus the vanishing button held.
    drawControls();
    bar.querySelector<HTMLElement>("button")?.focus();
    audio.unlock();
    audio.play("ui.toggle");
  };

  // ------------------------------------------------------ playing and state

  const setPlaying = (
    row: RowV7,
    playing: boolean,
    choice: number | null = null,
  ): void => {
    row.node.dataset.playing = String(playing);
    // Which of the numbered recordings is heard, when one of them is.
    if (playing && choice !== null)
      row.node.dataset.playingChoice = String(choice);
    else delete row.node.dataset.playingChoice;
    if (row.stop !== null) row.stop.hidden = !playing;
  };

  const clearTimer = (key: SoundKeyV1): void => {
    const timer = timers.get(key);
    if (timer === undefined) return;
    clearTimeout(timer);
    timers.delete(key);
  };

  /** Unmarks the cards whose sound is over (or was cut by another). */
  const refresh = (): void => {
    for (const row of rows.values()) {
      const key = row.entry.key;
      if (key === null || row.node.dataset.playing !== "true") continue;
      if (audio.remainingMs(key) > 0) continue;
      clearTimer(key);
      setPlaying(row, false);
    }
  };

  const started = (
    row: RowV7,
    key: SoundKeyV1,
    choice: number | null,
  ): void => {
    silent = false;
    unloaded = false;
    setPlaying(row, true, choice);
    clearTimer(key);
    const remaining = audio.remainingMs(key);
    if (Number.isFinite(remaining))
      timers.set(
        key,
        setTimeout(
          () => {
            timers.delete(key);
            refresh();
          },
          Math.ceil(remaining) + END_MARGIN_MS,
        ),
      );
    refresh();
    syncNotice();
  };

  /** False (and the notice is pointed at) when nothing would be heard. */
  const audible = (): boolean => {
    const { enabled, volume } = audio.settings;
    if (enabled && volume !== 0) return true;
    notice.dataset.nudged = "true";
    notice.scrollIntoView?.({ block: "nearest" });
    return false;
  };

  /**
   * Plays a row's sound: as the game does, or as `request` says (a detune,
   * a level, the generated sound, one recording by its number).
   */
  const playRequest = (rowId: string, request: SoundPlayOptionsV1): void => {
    const attempt = (last: boolean): void => {
      // The card may have been drawn again since the press.
      const row = rows.get(rowId);
      const key = row?.entry.key ?? null;
      if (destroyed || row === undefined || key === null) return;
      audio.unlock();
      // A second press starts the sound again from its beginning.
      audio.stop(key);
      const outcome = audio.play(key, request);
      if (outcome === "PLAYED") {
        started(row, key, request.candidate ?? null);
        return;
      }
      setPlaying(row, false);
      if (!last && (outcome === "UNAVAILABLE" || outcome === "LOCKED")) {
        // The press itself opened the device; it may be running in a moment.
        if (retry !== null) clearTimeout(retry);
        retry = setTimeout(() => {
          retry = null;
          attempt(true);
        }, DEVICE_RETRY_MS);
        return;
      }
      // A hidden tab is silent on purpose; anything else is the device.
      silent = outcome !== "HIDDEN" && outcome !== "MUTED";
      unloaded = false;
      syncNotice();
    };
    attempt(false);
  };

  const play = (row: RowV7, variant: GallerySoundVariantV7 | null): void => {
    if (row.entry.key === null || destroyed || !audible()) return;
    playRequest(row.entry.rowId, {
      ...(variant?.detune === undefined ? {} : { detune: variant.detune }),
      ...(variant?.gain === undefined ? {} : { gain: variant.gain }),
      ...(variant?.generated === true ? { generated: true } : {}),
    });
  };

  /**
   * Plays one of a sound's choices: the generated sound, or one recording.
   * A recording that is not the one in use is fetched first.
   */
  const playChoice = (row: RowV7, choice: GallerySoundChoiceV7): void => {
    const key = row.entry.key;
    if (key === null || destroyed || !audible()) return;
    const rowId = row.entry.rowId;
    if (choice.n === STOCK_SOUND_GENERATED_CHOICE_V1) {
      playRequest(rowId, GENERATED_REQUEST);
      return;
    }
    // The press opens the device if nothing has yet; the fetch needs it.
    audio.unlock();
    row.node.dataset.loadingChoice = String(choice.n);
    void audio.prepareCandidate(key, choice.n).then((ready) => {
      const current = rows.get(rowId);
      if (current !== undefined) delete current.node.dataset.loadingChoice;
      if (destroyed || current === undefined) return;
      if (!ready) {
        // There is no device, or the file could not be fetched or decoded.
        silent = true;
        unloaded = audio.unlocked;
        syncNotice();
        return;
      }
      playRequest(rowId, { candidate: choice.n });
    });
  };

  /** Picks a choice for this browser; picking the default forgets the pick. */
  const useChoice = (row: RowV7, choice: GallerySoundChoiceV7): void => {
    const key = row.entry.key;
    if (key === null || destroyed) return;
    audio.unlock();
    audio.setPick(key, choice.isDefault ? null : choice.n);
  };

  const stop = (row: RowV7): void => {
    const key = row.entry.key;
    if (key === null) return;
    audio.stop(key);
    clearTimer(key);
    setPlaying(row, false);
    row.play.focus();
  };

  // ------------------------------------------------------------- the cards

  const picture = (entry: GallerySoundEntryV7): HTMLElement => {
    const frame = documentRoot.createElement("span");
    frame.className = "v7-gallery-sound-picture";
    frame.setAttribute("aria-hidden", "true");
    if (entry.picture.kind === "ICON") {
      frame.dataset.picture = "icon";
      frame.append(uiIconV7(documentRoot, entry.picture.icon));
      return frame;
    }
    frame.dataset.picture = "art";
    const colour =
      entry.picture.faction === null
        ? undefined
        : factionColourV7(entry.picture.faction);
    if (colour !== undefined) frame.style.setProperty("--faction", colour);
    // The loudspeaker shows until the art has loaded, and if it never does.
    const slot = documentRoot.createElement("span");
    slot.className = "v7-gallery-sound-art";
    frame.append(
      uiIconV7(documentRoot, "sound", "v7-ui-icon v7-gallery-sound-fallback"),
      slot,
    );
    options.fillArt(slot, entry.picture.subject, PICTURE_BOX, colour);
    return frame;
  };

  const control = (
    className: string,
    action: string,
    label: string,
  ): HTMLButtonElement => {
    const node = documentRoot.createElement("button");
    node.type = "button";
    node.className = className;
    node.dataset.action = action;
    node.dataset.soundControl = "true";
    node.setAttribute(SILENT_CLICK_ATTRIBUTE_V7, "");
    node.setAttribute("aria-label", label);
    node.title = label;
    return node;
  };

  const card = (entry: GallerySoundEntryV7): HTMLElement => {
    const node = documentRoot.createElement("li");
    node.className = "v7-gallery-sound";
    node.dataset.soundRow = entry.rowId;
    node.dataset.playing = "false";
    if (entry.faction !== null) node.dataset.faction = entry.faction;
    const pending = entry.key === null;
    if (pending) node.dataset.pending = "true";
    if (entry.origin !== null)
      node.dataset.origin = entry.origin.kind.toLowerCase();
    if (entry.choices.length > 0) node.dataset.choices = "true";

    // The name of the control says what it plays and where that comes from.
    const playButton = control(
      "v7-gallery-sound-play",
      "gallery-sound-play",
      pending
        ? `${gallerySoundPlayLabelV7(entry)}, ${entry.when.toLowerCase()}`
        : gallerySoundCardLabelV7(entry),
    );
    playButton.dataset.soundPlay = entry.rowId;
    playButton.dataset.focusKey = `sound:${entry.rowId}`;
    if (entry.key !== null) playButton.dataset.soundId = entry.key;
    // A pending theme keeps its place in the keyboard order and says why
    // it cannot be played, so it is not a disabled (unfocusable) button.
    if (pending) playButton.setAttribute("aria-disabled", "true");
    const words = documentRoot.createElement("span");
    words.className = "v7-gallery-sound-words";
    const name = documentRoot.createElement("span");
    name.className = "v7-gallery-sound-name";
    name.textContent = entry.name;
    words.append(name);
    if (entry.when !== "") {
      const when = documentRoot.createElement("span");
      when.className = "v7-gallery-sound-when";
      when.textContent = entry.when;
      words.append(when);
    }
    if (entry.origin !== null) {
      // Where the sound comes from: the library and the file of a
      // recording and the stretch cut from it, or "Generated". The library
      // has a line, the file name up to two (it wraps anywhere and is cut
      // after them); the whole of it is in the title and in the name of
      // the control.
      const origin = documentRoot.createElement("span");
      origin.className = "v7-gallery-sound-origin";
      origin.dataset.soundOrigin = entry.origin.kind.toLowerCase();
      origin.title = gallerySoundOriginLabelV7(entry.origin);
      const part = (className: string, text: string): HTMLElement => {
        const node = documentRoot.createElement("span");
        node.className = className;
        node.textContent = text;
        return node;
      };
      if (entry.origin.kind === "RECORDED")
        origin.append(
          part("v7-gallery-sound-origin-library", `${entry.origin.library} /`),
          " ",
          part("v7-gallery-sound-origin-file", entry.origin.file),
          " ",
          part("v7-gallery-sound-origin-cut", entry.origin.cut),
        );
      else
        origin.append(part("v7-gallery-sound-origin-file", entry.origin.text));
      words.append(origin);
    }
    const mark = documentRoot.createElement("span");
    mark.className = "v7-gallery-sound-mark";
    mark.setAttribute("aria-hidden", "true");
    if (!pending) {
      const bars = documentRoot.createElement("span");
      bars.className = "v7-gallery-sound-bars";
      bars.append(
        documentRoot.createElement("i"),
        documentRoot.createElement("i"),
        documentRoot.createElement("i"),
      );
      mark.append(uiIconV7(documentRoot, "play"), bars);
    }
    playButton.append(picture(entry), words, mark);
    node.append(playButton);

    let stopButton: HTMLButtonElement | null = null;
    if (!pending && (entry.variants.length > 0 || entry.long)) {
      const extras = documentRoot.createElement("span");
      extras.className = "v7-gallery-sound-extras";
      for (const variant of entry.variants) {
        const button = control(
          "v7-gallery-sound-variant",
          "gallery-sound-variant",
          gallerySoundPlayLabelV7(entry, variant),
        );
        button.dataset.variant = variant.id.toLowerCase();
        button.dataset.soundId = entry.rowId;
        // Tab moves from card to card; the arrow keys reach these.
        button.tabIndex = -1;
        const glyph = VARIANT_GLYPHS[variant.id];
        if (variant.id === "GENERATED") {
          // The synthesised sound this recording replaced, named in words.
          button.classList.add("v7-gallery-sound-variant-generated");
          button.textContent = GALLERY_SOUND_GENERATED_TEXT_V7;
        } else if (glyph === "") button.append(uiIconV7(documentRoot, "sight"));
        else button.textContent = glyph;
        button.onclick = () => play(row, variant);
        extras.append(button);
      }
      if (entry.long) {
        stopButton = control(
          "v7-gallery-sound-stop",
          "gallery-sound-stop",
          gallerySoundPlayLabelV7(entry).replace(/^Play/, "Stop"),
        );
        stopButton.dataset.soundId = entry.rowId;
        stopButton.hidden = true;
        const square = documentRoot.createElement("span");
        square.className = "v7-gallery-sound-stop-mark";
        square.setAttribute("aria-hidden", "true");
        stopButton.append(square);
        stopButton.onclick = () => stop(row);
        extras.append(stopButton);
      }
      node.append(extras);
    }
    const row: RowV7 = { entry, node, play: playButton, stop: stopButton };
    if (entry.choices.length > 0) node.append(choiceList(row));
    rows.set(entry.rowId, row);
    playButton.onclick = () => play(row, null);
    return node;
  };

  /**
   * The recordings of a sound and its generated version as a numbered
   * list: each line plays one (its number, the file it was cut from and
   * the stretch) and has a control that picks it for this browser. The
   * default is marked, and so is the one in use.
   */
  const choiceList = (row: RowV7): HTMLElement => {
    const { entry } = row;
    const list = documentRoot.createElement("ul");
    list.className = "v7-gallery-sound-choices";
    list.setAttribute("aria-label", `Recordings of ${entry.name}`);
    for (const choice of entry.choices) {
      const item = documentRoot.createElement("li");
      item.className = "v7-gallery-sound-choice";
      item.dataset.choice = String(choice.n);
      item.dataset.default = String(choice.isDefault);
      item.dataset.chosen = String(choice.chosen);
      item.dataset.soundOrigin = choice.origin.kind.toLowerCase();

      const playLabel = gallerySoundChoicePlayLabelV7(entry, choice);
      const playButton = control(
        "v7-gallery-sound-choice-play",
        "gallery-sound-choice-play",
        playLabel,
      );
      playButton.dataset.soundId = entry.rowId;
      playButton.dataset.choice = String(choice.n);
      playButton.dataset.focusKey = `sound:${entry.rowId}:play:${choice.n}`;
      playButton.tabIndex = -1;
      const part = (className: string, text: string): HTMLElement => {
        const span = documentRoot.createElement("span");
        span.className = className;
        span.textContent = text;
        return span;
      };
      const number = part("v7-gallery-sound-choice-number", choice.label);
      number.setAttribute("aria-hidden", "true");
      if (choice.origin.kind === "RECORDED")
        playButton.append(
          number,
          // One line, cut short; the whole origin is in the title.
          part("v7-gallery-sound-choice-file", choice.origin.file),
          part("v7-gallery-sound-choice-cut", choice.origin.cut),
        );
      else {
        number.textContent = "";
        number.append(uiIconV7(documentRoot, "sound"));
        playButton.append(
          number,
          part("v7-gallery-sound-choice-file", choice.origin.text),
        );
      }
      if (choice.isDefault)
        playButton.append(part("v7-gallery-sound-choice-default", "default"));
      playButton.onclick = () => {
        const current = rows.get(entry.rowId);
        if (current !== undefined) playChoice(current, choice);
      };

      const useButton = control(
        "v7-gallery-sound-choice-use",
        "gallery-sound-choice-use",
        gallerySoundChoiceUseLabelV7(entry, choice),
      );
      useButton.dataset.soundId = entry.rowId;
      useButton.dataset.choice = String(choice.n);
      useButton.dataset.focusKey = `sound:${entry.rowId}:use:${choice.n}`;
      useButton.tabIndex = -1;
      useButton.setAttribute("aria-pressed", String(choice.chosen));
      useButton.textContent = choice.chosen ? "In use" : "Use";
      useButton.onclick = () => {
        const current = rows.get(entry.rowId);
        if (current !== undefined) useChoice(current, choice);
      };
      item.append(playButton, useButton);
      list.append(item);
    }
    return list;
  };

  // ------------------------------------------------------------- the picks

  const groupsNow = (): ReturnType<typeof gallerySoundGroupsV7> =>
    gallerySoundGroupsV7(options.themes ?? SOUND_THEMES_V1, {
      stockSounds: audio.stockSounds,
      picks: audio.picks,
    });

  /**
   * How many sounds have a pick, a control that copies the picks as text
   * for the developer, and one that forgets them. The text is also shown,
   * so it can be copied by hand where the clipboard is not allowed.
   */
  const picksBar = documentRoot.createElement("div");
  picksBar.className = "v7-gallery-sounds-picks";
  picksBar.dataset.v7SoundPicks = "true";
  const choosable = gallerySoundChoiceIdsV7({
    stockSounds: audio.stockSounds,
  }).length;
  picksBar.hidden = choosable === 0;
  const picksText = documentRoot.createElement("p");
  picksText.className = "v7-gallery-sounds-picks-text";
  const picksCount = documentRoot.createElement("strong");
  picksCount.dataset.soundPickCount = "true";
  picksText.append(
    picksCount,
    ` ${choosable} sounds have recordings. Play the numbered ones under a card and press Use on the one you like: the game plays it from then on, in this browser.`,
  );
  const picksButton = (action: string, text: string): HTMLButtonElement => {
    const node = documentRoot.createElement("button");
    node.type = "button";
    node.className = "v7-gallery-sounds-picks-button";
    node.dataset.action = action;
    node.setAttribute(SILENT_CLICK_ATTRIBUTE_V7, "");
    node.textContent = text;
    return node;
  };
  const copyButton = picksButton("gallery-sound-picks-copy", "Copy my picks");
  const resetButton = picksButton("gallery-sound-picks-reset", "Reset picks");
  const picksStatus = documentRoot.createElement("span");
  picksStatus.className = "v7-gallery-sounds-picks-status";
  picksStatus.setAttribute("role", "status");
  const picksOutput = documentRoot.createElement("textarea");
  picksOutput.className = "v7-gallery-sounds-picks-output";
  picksOutput.readOnly = true;
  picksOutput.hidden = true;
  picksOutput.rows = 4;
  picksOutput.setAttribute("aria-label", "Your picks, as text");
  picksOutput.dataset.soundPickOutput = "true";
  const picksActions = documentRoot.createElement("span");
  picksActions.className = "v7-gallery-sounds-picks-actions";
  picksActions.append(copyButton, resetButton, picksStatus);
  picksBar.append(picksText, picksActions, picksOutput);

  const syncPicks = (): void => {
    const count = stockSoundPickLinesV1(audio.picks).length;
    picksBar.dataset.picks = String(count);
    picksCount.textContent =
      count === 0
        ? "No picks yet."
        : count === 1
          ? "1 pick."
          : `${count} picks.`;
    resetButton.hidden = count === 0;
    // A summary on show follows the picks.
    if (!picksOutput.hidden)
      picksOutput.value = stockSoundPickSummaryV1(audio.picks);
  };

  const copyText =
    options.copyText ??
    ((text: string): Promise<void> => {
      const clipboard = documentRoot.defaultView?.navigator?.clipboard;
      return clipboard === undefined
        ? Promise.reject(new Error("No clipboard"))
        : clipboard.writeText(text);
    });

  copyButton.onclick = () => {
    const text = stockSoundPickSummaryV1(audio.picks);
    picksOutput.value = text;
    picksOutput.hidden = false;
    picksStatus.textContent = "";
    let copied: Promise<void>;
    try {
      copied = copyText(text);
    } catch (error) {
      copied = Promise.reject(
        error instanceof Error ? error : new Error(String(error)),
      );
    }
    copied.then(
      () => {
        if (!destroyed) picksStatus.textContent = "Copied";
      },
      () => {
        if (destroyed) return;
        // No clipboard here: the text is selected, to copy by hand.
        picksStatus.textContent = "Select the text below and copy it";
        picksOutput.focus();
        picksOutput.select();
      },
    );
  };

  resetButton.onclick = () => {
    audio.clearPicks();
    picksStatus.textContent = "Picks cleared";
    copyButton.focus();
  };

  /**
   * Draws the cards of the sounds whose choice changed again: the origin
   * line, the name of the play control and the marks of the numbered row
   * all say what the sound is set to play.
   */
  const redrawChoices = (): void => {
    const focused = documentRoot.activeElement;
    const focusKey =
      focused instanceof HTMLElement && root.contains(focused)
        ? focused.dataset.focusKey
        : undefined;
    for (const group of groupsNow())
      for (const entry of group.entries) {
        const row = rows.get(entry.rowId);
        if (row === undefined || entry.choices.length === 0) continue;
        const before = row.entry.choices.find((choice) => choice.chosen)?.n;
        const after = entry.choices.find((choice) => choice.chosen)?.n;
        if (before === after) continue;
        // What was playing is no longer what the card says.
        if (entry.key !== null && row.node.dataset.playing === "true") {
          audio.stop(entry.key);
          clearTimer(entry.key);
        }
        row.node.replaceWith(card(entry));
      }
    if (focusKey !== undefined)
      for (const node of root.querySelectorAll<HTMLElement>("[data-focus-key]"))
        if (node.dataset.focusKey === focusKey) {
          node.focus();
          break;
        }
    syncPicks();
  };

  root.append(bar, notice, picksBar);
  for (const group of groupsNow()) {
    const section = documentRoot.createElement("section");
    section.className = "v7-gallery-sound-group";
    section.dataset.group = group.id.toLowerCase();
    const heading = documentRoot.createElement("h2");
    heading.id = `v7-gallery-sound-group-${group.id.toLowerCase()}`;
    heading.textContent = group.label;
    section.setAttribute("aria-labelledby", heading.id);
    const list = documentRoot.createElement("ul");
    list.className = "v7-gallery-sound-list";
    list.setAttribute("aria-labelledby", heading.id);
    for (const entry of group.entries) list.append(card(entry));
    section.append(heading, list);
    root.append(section);
  }

  // -------------------------------------------------------------- keyboard

  /**
   * The card above or below: the nearest row in that direction, and in it
   * the card nearest to this one's column. Without a layout (a test's
   * document) it is the previous or next card.
   */
  const cardBeside = (
    cards: readonly HTMLElement[],
    index: number,
    step: 1 | -1,
  ): HTMLElement | undefined => {
    const from = cards[index];
    if (from === undefined) return undefined;
    const origin = from.getBoundingClientRect();
    if (origin.height === 0)
      return index + step < 0 ? undefined : cards[index + step];
    let best: HTMLElement | undefined;
    let bestRow = Infinity;
    let bestColumn = Infinity;
    for (const candidate of cards) {
      const rect = candidate.getBoundingClientRect();
      const rowGap = (rect.top - origin.top) * step;
      if (rowGap < 1) continue;
      const columnGap = Math.abs(rect.left - origin.left);
      if (
        rowGap < bestRow - 1 ||
        (Math.abs(rowGap - bestRow) <= 1 && columnGap < bestColumn)
      ) {
        best = candidate;
        bestRow = rowGap;
        bestColumn = columnGap;
      }
    }
    return best;
  };

  /**
   * Up and Down step to the card above or below, Left and Right through
   * every control in order (a card's variants and stop included), Home and
   * End go to the first and last card. Tab still walks the cards in order.
   */
  root.addEventListener("keydown", (event) => {
    const target = event.target;
    if (
      !(target instanceof HTMLElement) ||
      target.dataset.soundControl !== "true" ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey
    )
      return;
    const cards = [...root.querySelectorAll<HTMLElement>("[data-sound-play]")];
    const controls = [
      ...root.querySelectorAll<HTMLElement>("[data-sound-control]"),
    ].filter((node) => !node.hidden);
    const row = target.closest<HTMLElement>(".v7-gallery-sound");
    const cardIndex = cards.findIndex((node) => row?.contains(node) === true);
    let next: HTMLElement | undefined;
    switch (event.key) {
      case "ArrowDown":
        next = cardBeside(cards, cardIndex, 1);
        break;
      case "ArrowUp":
        next = cardBeside(cards, cardIndex, -1);
        break;
      case "ArrowRight":
        next = controls[controls.indexOf(target) + 1];
        break;
      case "ArrowLeft": {
        const index = controls.indexOf(target);
        next = index > 0 ? controls[index - 1] : undefined;
        break;
      }
      case "Home":
        next = cards[0];
        break;
      case "End":
        next = cards.at(-1);
        break;
      default:
        return;
    }
    event.preventDefault();
    event.stopPropagation();
    next?.focus();
  });

  // The toggle, the slider, the match menu: whatever changes the
  // preference also updates the notice and the cards.
  const unsubscribe = audio.subscribe(() => {
    refresh();
    syncNotice();
  });
  const unsubscribePicks = audio.subscribePicks(redrawChoices);
  syncNotice();
  syncPicks();

  /** Ends what the tab was playing (a looping theme would go on). */
  const silence = (): void => {
    if (retry !== null) clearTimeout(retry);
    retry = null;
    for (const row of rows.values()) {
      const key = row.entry.key;
      if (key === null || row.node.dataset.playing !== "true") continue;
      audio.stop(key);
      clearTimer(key);
      setPlaying(row, false);
    }
  };

  return {
    root,
    silence,
    destroy(): void {
      if (destroyed) return;
      silence();
      destroyed = true;
      unsubscribe();
      unsubscribePicks();
    },
  };
}
