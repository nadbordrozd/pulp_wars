import {
  AUDIO_VOLUME_STEP_V1,
  SOUND_CATEGORIES_V1,
  SOUND_IDS_V1,
  SOUND_MANIFEST_V1,
  type GameAudioV1,
  type SoundCategoryV1,
} from "../../audio/index";
import { uiIconV7 } from "./ui-icons-v7";

/**
 * The sound controls and the sound test (bead pulp_wars-2yc.10,
 * docs/ui/SOUND.md): icons with short labels, no explanatory text.
 *
 * `soundControlsV7` is the on/off toggle and the volume slider of Settings.
 * `soundTestPanelV7` lists every sound of the manifest with a play button,
 * to audition them. Both act on the `GameAudioV1` they are given and keep
 * themselves in step with it; neither re-renders the screen around them,
 * so the slider keeps its pointer and keyboard focus.
 */

/** Marks controls whose click must not also make the interface click. */
export const SILENT_CLICK_ATTRIBUTE_V7 = "data-v7-silent-click";

const CATEGORY_LABELS: Readonly<Record<SoundCategoryV1, string>> = {
  combat: "Combat",
  economy: "Economy",
  ui: "Interface",
  ambience: "Ambience",
  music: "Music",
};

/** Draws the toggle's icon, state and name for the current preference. */
export function syncSoundToggleV7(
  documentRoot: Document,
  toggle: HTMLButtonElement,
  enabled: boolean,
): void {
  toggle.replaceChildren(
    uiIconV7(documentRoot, enabled ? "sound" : "sound-off"),
  );
  toggle.setAttribute("aria-pressed", String(enabled));
  toggle.dataset.sound = enabled ? "on" : "off";
  const label = enabled ? "Sound on" : "Sound off";
  toggle.setAttribute("aria-label", label);
  toggle.title = label;
}

export function soundControlsV7(
  documentRoot: Document,
  audio: GameAudioV1,
  options: {
    /** Suffix that keeps element ids unique when two sets are on a page. */
    readonly idSuffix?: string;
    /** Called when the preference could not be stored. */
    readonly onStoreFailed?: () => void;
  } = {},
): HTMLElement {
  const suffix = options.idSuffix ?? "";
  const row = documentRoot.createElement("div");
  row.className = "v7-sound-controls";
  row.dataset.v7SoundControls = "true";
  row.setAttribute("role", "group");
  row.setAttribute("aria-label", "Sound");
  const toggle = documentRoot.createElement("button");
  toggle.type = "button";
  toggle.className = "v7-icon-button v7-toggle v7-sound-toggle";
  toggle.dataset.action = `sound-toggle${suffix}`;
  toggle.setAttribute(SILENT_CLICK_ATTRIBUTE_V7, "");
  const slider = documentRoot.createElement("input");
  slider.type = "range";
  slider.id = `v7-sound-volume${suffix}`;
  slider.className = "v7-sound-volume";
  slider.min = "0";
  slider.max = "100";
  slider.step = String(AUDIO_VOLUME_STEP_V1);
  slider.setAttribute("aria-label", "Volume");
  const readout = documentRoot.createElement("output");
  readout.className = "v7-sound-volume-value";
  readout.htmlFor.add(slider.id);
  const sync = (): void => {
    const { enabled, volume } = audio.settings;
    syncSoundToggleV7(documentRoot, toggle, enabled);
    slider.value = String(volume);
    slider.setAttribute("aria-valuetext", `${volume}%`);
    readout.textContent = `${volume}%`;
  };
  sync();
  toggle.onclick = () => {
    if (!audio.setEnabled(!audio.settings.enabled)) options.onStoreFailed?.();
    sync();
    audio.play("ui.toggle");
  };
  slider.addEventListener("input", () => {
    if (!audio.setVolume(Number(slider.value))) options.onStoreFailed?.();
    sync();
  });
  // The new level is heard when the slider is let go.
  slider.addEventListener("change", () => audio.play("ui.toggle"));
  row.append(toggle, slider, readout);
  return row;
}

export function soundTestPanelV7(
  documentRoot: Document,
  audio: GameAudioV1,
): HTMLElement {
  const panel = documentRoot.createElement("section");
  panel.className = "v7-sound-test";
  panel.dataset.v7SoundTest = "true";
  panel.setAttribute("aria-label", "Sounds");
  for (const category of SOUND_CATEGORIES_V1) {
    const ids = SOUND_IDS_V1.filter(
      (id) => SOUND_MANIFEST_V1[id].category === category,
    );
    if (ids.length === 0) continue;
    const group = documentRoot.createElement("div");
    group.className = "v7-sound-test-group";
    group.dataset.category = category;
    const heading = documentRoot.createElement("h3");
    heading.textContent = CATEGORY_LABELS[category];
    const list = documentRoot.createElement("div");
    list.className = "v7-sound-test-list";
    for (const id of ids) {
      const play = documentRoot.createElement("button");
      play.type = "button";
      play.className = "v7-sound-test-button";
      play.dataset.action = `sound-test-${id}`;
      play.dataset.soundId = id;
      play.setAttribute(SILENT_CLICK_ATTRIBUTE_V7, "");
      play.title = id;
      const label = documentRoot.createElement("span");
      label.textContent = SOUND_MANIFEST_V1[id].label;
      play.append(
        uiIconV7(documentRoot, "play", "v7-ui-icon v7-sound-test-icon"),
        label,
      );
      play.onclick = () => {
        audio.unlock();
        audio.play(id);
      };
      list.append(play);
    }
    group.append(heading, list);
    panel.append(group);
  }
  return panel;
}
