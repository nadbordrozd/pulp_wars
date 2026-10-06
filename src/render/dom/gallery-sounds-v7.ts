import type { ArtSubjectV7 } from "../../assets/chibi-art-v7";
import {
  DEFAULT_AUDIO_SETTINGS_V1,
  SOUND_THEMES_V1,
  type GameAudioV1,
  type SoundKeyV1,
  type SoundThemeEntryV1,
} from "../../audio/index";
import { factionColourV7 } from "../canvas/faction-colours-v7";
import {
  gallerySoundGroupsV7,
  gallerySoundPlayLabelV7,
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
};

interface RowV7 {
  readonly entry: GallerySoundEntryV7;
  readonly node: HTMLElement;
  readonly play: HTMLButtonElement;
  readonly stop: HTMLButtonElement | null;
}

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
        : "device";
    noticeText.textContent = !enabled
      ? "Sound is off"
      : volume === 0
        ? "Volume is at 0"
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

  const setPlaying = (row: RowV7, playing: boolean): void => {
    row.node.dataset.playing = String(playing);
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

  const started = (row: RowV7, key: SoundKeyV1): void => {
    silent = false;
    setPlaying(row, true);
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

  const play = (row: RowV7, variant: GallerySoundVariantV7 | null): void => {
    const key = row.entry.key;
    if (key === null || destroyed) return;
    const { enabled, volume } = audio.settings;
    if (!enabled || volume === 0) {
      // Nothing would be heard: point at the notice instead.
      notice.dataset.nudged = "true";
      notice.scrollIntoView?.({ block: "nearest" });
      return;
    }
    const request = {
      ...(variant?.detune === undefined ? {} : { detune: variant.detune }),
      ...(variant?.gain === undefined ? {} : { gain: variant.gain }),
    };
    const attempt = (last: boolean): void => {
      if (destroyed) return;
      audio.unlock();
      // A second press starts the sound again from its beginning.
      audio.stop(key);
      const outcome = audio.play(key, request);
      if (outcome === "PLAYED") {
        started(row, key);
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
      syncNotice();
    };
    attempt(false);
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

    const playLabel = gallerySoundPlayLabelV7(entry);
    const playButton = control(
      "v7-gallery-sound-play",
      "gallery-sound-play",
      pending ? `${playLabel}, ${entry.when.toLowerCase()}` : playLabel,
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
        if (glyph === "") button.append(uiIconV7(documentRoot, "sight"));
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
    rows.set(entry.rowId, row);
    playButton.onclick = () => play(row, null);
    return node;
  };

  root.append(bar, notice);
  for (const group of gallerySoundGroupsV7(options.themes ?? SOUND_THEMES_V1)) {
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
  syncNotice();

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
    },
  };
}
