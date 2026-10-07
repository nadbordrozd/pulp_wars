import { SOUND_IDS_V1 } from "../src/audio/index";
import { ruleset7FixtureMountExpressionV7 } from "./browser-undead-fixture-v7";

/**
 * The sound step of the Ruleset 7 browser smoke (bead pulp_wars-2yc.10,
 * docs/ui/SOUND.md; dev server only, the fixture comes from
 * `tests/fixtures`). On the Undead showcase match it opens Settings, turns
 * sound off and on with the loudspeaker toggle, checks that the sound test
 * lists every sound, and then lets the Lich attack: the audio's request log
 * (`view.audio.log`, no loudspeaker involved) must name the shot and its
 * hit. Kept apart from the smoke's main file so a reviewer can run it alone
 * against a dev server.
 */

export interface SoundSmokeDriverV7 {
  evaluate<T>(expression: string, awaitPromise?: boolean): Promise<T>;
  waitForExpression(expression: string, attempts?: number): Promise<void>;
  pointerClick(selector: string): Promise<void>;
  pressEscape(): Promise<void>;
  openCompactMenuItem(action: string): Promise<void>;
  capture(name: string): Promise<void>;
}

const REVIEW = "globalThis.__SOUND_SMOKE__";
const AUDIO = `${REVIEW}.view.audio`;
const TOGGLE = '[data-action="sound-toggle"]';
const MUSIC_TOGGLE = '[data-action="music-toggle"]';
/** The fixture's viewer plays the Undead. */
const THEME_FILE = "assets/audio/themes/theme-undead.m4a";

export async function probeSoundV7(
  driver: SoundSmokeDriverV7,
): Promise<string> {
  await driver.evaluate(
    ruleset7FixtureMountExpressionV7({
      module: "/tests/fixtures/v7-undead-ui.ts",
      fixture: "undeadShowcaseFixtureV7",
      artSet: "CHIBI",
      global: "__SOUND_SMOKE__",
      extras: "at: fixtures.UNDEAD_SHOWCASE_V7",
    }),
    true,
  );
  await driver.waitForExpression(
    `${REVIEW}?.boardHost !== undefined && document.querySelector('canvas.board-canvas-v7') !== null`,
  );
  // Bead pulp_wars-2yc.27: the match knows its theme (the viewer's
  // faction's) and has fetched nothing for it before a gesture.
  const quiet = await driver.evaluate<{
    readonly scene: string | null;
    readonly requests: number;
  }>(
    `({ scene: ${AUDIO}.music.scene, requests: ${AUDIO}.music.requests.length })`,
  );
  if (quiet.scene !== "theme.undead" || quiet.requests !== 0)
    throw new Error(`Theme before a gesture: ${JSON.stringify(quiet)}`);
  // Settings: the toggle turns sound off and on again.
  await driver.openCompactMenuItem("settings");
  await driver.waitForExpression(
    `document.querySelector('${TOGGLE}')?.getAttribute('aria-pressed') === 'true' && document.querySelector('#v7-sound-volume') !== null && ${AUDIO}.settings.enabled === true`,
  );
  // Two levels: Music beside Sound, each a toggle and a slider.
  await driver.waitForExpression(
    `document.querySelector('${MUSIC_TOGGLE}')?.getAttribute('aria-pressed') === 'true' && document.querySelector('#v7-music-volume')?.type === 'range' && ${AUDIO}.settings.musicEnabled === true`,
  );
  // Opening the menu was the first gesture: the theme is asked for now
  // (where the browser has a sound device at all).
  await driver.waitForExpression(
    `${AUDIO}.unlocked !== true || ${AUDIO}.music.requests.some((url) => url.includes('${THEME_FILE}'))`,
    300,
  );
  const theme = await driver.evaluate<boolean>(`${AUDIO}.unlocked === true`);
  const listed = await driver.evaluate<number>(
    `document.querySelectorAll('[data-v7-sound-test] [data-sound-id]').length`,
  );
  if (listed !== SOUND_IDS_V1.length)
    throw new Error(
      `Sound test lists ${listed} of ${SOUND_IDS_V1.length} sounds`,
    );
  await driver.pointerClick(TOGGLE);
  await driver.waitForExpression(
    `document.querySelector('${TOGGLE}')?.getAttribute('aria-pressed') === 'false' && document.querySelector('${TOGGLE} svg')?.dataset.icon === 'sound-off' && ${AUDIO}.settings.enabled === false`,
  );
  const muted = await driver.evaluate<string>(`${AUDIO}.play('ui.click')`);
  if (muted !== "MUTED") throw new Error(`Sound off still answered ${muted}`);
  await driver.pointerClick(TOGGLE);
  await driver.waitForExpression(
    `document.querySelector('${TOGGLE}')?.getAttribute('aria-pressed') === 'true' && ${AUDIO}.settings.enabled === true`,
  );
  await driver.capture("sound-settings.png");
  await driver.pressEscape();
  await driver.waitForExpression(
    `document.querySelector('[data-v7-region="overlay-settings"]') === null`,
  );
  // An attack: the Lich's bolt and its hit are asked for, timed by the
  // board's own presentation steps.
  await driver.evaluate(
    `(() => { ${AUDIO}.clearLog(); const host = ${REVIEW}.boardHost; host.resetInspectionCycle(); host.activate(${REVIEW}.at.lich); host.activate(${REVIEW}.at.lichTarget); })()`,
  );
  await driver.waitForExpression(
    `${REVIEW}.traces.some((trace) => trace.command.kind === 'ATTACK' && trace.eventKinds.includes('COMBAT_RESOLVED'))`,
  );
  await driver.waitForExpression(
    `['attack.magic', 'impact.hit'].every((id) => ${AUDIO}.log.some((entry) => entry.id === id))`,
    300,
  );
  const log = await driver.evaluate<
    readonly { readonly id: string; readonly outcome: string }[]
  >(`${AUDIO}.log.map((entry) => ({ id: entry.id, outcome: entry.outcome }))`);
  if (log.some((entry) => entry.outcome === "MUTED"))
    throw new Error(`Sound on but muted: ${JSON.stringify(log)}`);
  const unknown = log.filter(
    (entry) => !(SOUND_IDS_V1 as readonly string[]).includes(entry.id),
  );
  if (unknown.length > 0)
    throw new Error(`Unknown sound ids: ${JSON.stringify(unknown)}`);
  await driver.evaluate(
    `(() => { ${REVIEW}?.view?.destroy?.(); delete globalThis.__SOUND_SMOKE__; })()`,
  );
  const ids = [...new Set(log.map((entry) => entry.id))];
  const outcomes = [...new Set(log.map((entry) => entry.outcome))];
  return `Music and Sound sliders, Undead theme ${theme ? "requested after the first gesture" : "not requested (no sound device)"}, toggle off (muted) and on, ${listed} sounds listed, Lich attack asked for ${ids.join(", ")} (${outcomes.join("/")})`;
}
