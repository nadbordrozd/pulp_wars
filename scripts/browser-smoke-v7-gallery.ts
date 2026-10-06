import { SOUND_IDS_V1 } from "../src/audio/index";

/**
 * The Gallery step of the Ruleset 7 browser smoke (bead pulp_wars-ic8):
 * from a fresh front screen it opens the Gallery with a pointer click,
 * checks the full unit table, hides a faction and a set of rows with the
 * filter chips (remembered in localStorage), opens a unit's detail and
 * waits for its animation preview to play on the real board host, closes
 * it with Escape and goes Back. On the way it opens the Sounds tab (bead
 * pulp_wars-2yc.19), checks that every manifest sound has a card and plays
 * one with a pointer click. Kept apart from the smoke's main file so a
 * reviewer can run it alone against a dev server.
 */

export interface GallerySmokeDriverV7 {
  evaluate<T>(expression: string): Promise<T>;
  waitForExpression(expression: string, attempts?: number): Promise<void>;
  pointerClick(selector: string): Promise<void>;
  pressEscape(): Promise<void>;
  capture(name: string): Promise<void>;
}

export const GALLERY_SMOKE_STORAGE_KEY_V7 = "pulpWars.ruleset7.gallery.v1";

export async function probeGalleryV7(
  driver: GallerySmokeDriverV7,
): Promise<string> {
  await driver.evaluate(
    `localStorage.removeItem(${JSON.stringify(GALLERY_SMOKE_STORAGE_KEY_V7)})`,
  );
  await driver.waitForExpression(
    `document.querySelector('[data-action="gallery"]') !== null`,
  );
  await driver.pointerClick('[data-action="gallery"]');
  await driver.waitForExpression(
    `document.querySelector('[data-v7-gallery] .v7-gallery-table') !== null`,
  );
  const table = await driver.evaluate<{
    readonly factions: readonly string[];
    readonly cells: number;
    readonly empty: number;
    readonly overflow: number;
  }>(
    `({ factions: [...document.querySelectorAll('.v7-gallery-faction')].map((th) => th.dataset.faction), cells: document.querySelectorAll('.v7-gallery-cell').length, empty: document.querySelectorAll('.v7-gallery-cell-wrap.is-empty').length, overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth })`,
  );
  // Eight factions (the Candy since pulp_wars-jdb.3): twelve rows of eight
  // (the Submarine since pulp_wars-5ti.2)
  // units and the one Egg, whose row is empty for the seven other factions;
  // the Ice Folk have no ships and no transport (pulp_wars-5ti.3): four
  // more empty cells. Tuning 5 (`pulp_wars-w49.4`): the Swordsman's row,
  // a unit for the Humans and an empty cell for the seven other factions.
  if (
    table.factions.join() !==
      "ORIGINAL,UNDEAD,GOBLIN,DINOSAUR,MARTIAN,ICE_FOLK,DWARF,CANDY" ||
    table.cells !== 94 ||
    table.empty !== 18 ||
    table.overflow > 0
  )
    throw new Error(`Gallery table is incomplete: ${JSON.stringify(table)}`);
  // The live CHIBI rasters draw into the tiles.
  await driver.waitForExpression(
    `[...document.querySelectorAll('.v7-gallery-tile')].every((tile) => tile.dataset.state === 'ready')`,
  );
  await driver.capture("gallery-units.png");
  await driver.pointerClick(
    '[data-filter="factions"] .v7-gallery-chip[data-value="GOBLIN"]',
  );
  await driver.pointerClick('[data-action="gallery-rows-none"]');
  await driver.pointerClick(
    '[data-filter="rows"] .v7-gallery-chip[data-value="CATAPULT"]',
  );
  const filtered = await driver.evaluate<{
    readonly cells: readonly string[];
    readonly stored: string | null;
  }>(
    `({ cells: [...document.querySelectorAll('.v7-gallery-cell')].map((cell) => cell.dataset.row + ':' + cell.dataset.faction), stored: localStorage.getItem(${JSON.stringify(GALLERY_SMOKE_STORAGE_KEY_V7)}) })`,
  );
  const storedFilters = JSON.parse(filtered.stored ?? "{}") as {
    readonly factions?: readonly string[];
    readonly unitRows?: readonly string[];
  };
  // The Catapult row of the seven factions left after hiding the Goblins.
  if (
    filtered.cells.length !== 7 ||
    filtered.cells.some(
      (cell) => !cell.startsWith("CATAPULT:") || cell.endsWith(":GOBLIN"),
    ) ||
    storedFilters.factions?.includes("GOBLIN") !== false ||
    storedFilters.unitRows?.join() !== "CATAPULT"
  )
    throw new Error(`Gallery filters failed: ${JSON.stringify(filtered)}`);
  await driver.pointerClick(
    '.v7-gallery-cell[data-row="CATAPULT"][data-faction="UNDEAD"]',
  );
  await driver.waitForExpression(
    `document.querySelector('.v7-gallery-detail #v7-gallery-detail-title')?.textContent === 'Lich'`,
  );
  const opened = await driver.evaluate<string | null>(
    `document.activeElement?.getAttribute('data-action') ?? null`,
  );
  // The Lich's attack plays on the demo board's own canvas. Full motion
  // starts it at once; under the reduced-motion setting an earlier probe
  // may have stored, the preview waits for its cue, so the cue is pressed.
  await driver.pointerClick('[data-action="gallery-cue-attack"]');
  await driver.waitForExpression(
    `document.querySelector('.v7-gallery-demo')?.dataset.demoState === 'done' && document.querySelector('.v7-gallery-demo-board canvas.board-canvas-v7')?.width > 0`,
  );
  const detail = await driver.evaluate<{
    readonly stats: number;
    readonly cues: readonly string[];
  }>(
    `({ stats: document.querySelectorAll('.v7-gallery-detail .v7-stat').length, cues: [...document.querySelectorAll('.v7-gallery-cue')].map((cue) => cue.dataset.cue)})`,
  );
  if (
    detail.stats !== 7 ||
    detail.cues.join() !== "ATTACK" ||
    opened !== "gallery-detail-close"
  )
    throw new Error(
      `Gallery detail is incomplete: ${JSON.stringify({ ...detail, opened })}`,
    );
  await driver.capture("gallery-detail.png");
  await driver.pressEscape();
  await driver.waitForExpression(
    `document.querySelector('.v7-gallery-detail') === null && document.activeElement?.dataset.row === 'CATAPULT'`,
  );
  // The Terrain tab (bead pulp_wars-2yc.3): the faction filter carries over
  // (seven grounds, no Goblin one), every swatch is drawn, and a detail's
  // sample board is drawn by the board host with the pieces under it.
  await driver.pointerClick('[data-action="gallery-tab-terrain"]');
  await driver.waitForExpression(
    `document.querySelector('.v7-gallery-table')?.getAttribute('aria-label') === 'Terrain' && [...document.querySelectorAll('.v7-gallery-swatch-tile')].every((tile) => tile.dataset.state === 'ready')`,
  );
  const terrain = await driver.evaluate<{
    readonly rows: readonly string[];
    readonly grass: readonly string[];
    readonly same: number;
    readonly overflow: number;
  }>(
    `({ rows: [...document.querySelectorAll('.v7-gallery-table tbody tr')].map((row) => row.dataset.row), grass: [...document.querySelectorAll('.v7-gallery-cell[data-row="GRASS"]')].map((cell) => cell.dataset.faction), same: document.querySelectorAll('.v7-gallery-cell-wrap.is-same').length, overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth })`,
  );
  if (
    terrain.rows[0] !== "GRASS" ||
    !terrain.rows.includes("FOREST") ||
    terrain.grass.length !== 7 ||
    terrain.grass.includes("GOBLIN") ||
    terrain.same === 0 ||
    terrain.overflow > 0
  )
    throw new Error(
      `Gallery terrain is incomplete: ${JSON.stringify(terrain)}`,
    );
  await driver.capture("gallery-terrain.png");
  await driver.pointerClick(
    '.v7-gallery-cell[data-row="FOREST"][data-faction="ORIGINAL"]',
  );
  await driver.waitForExpression(
    `document.querySelector('.v7-gallery-detail #v7-gallery-detail-title')?.textContent === 'Forest' && document.querySelector('.v7-gallery-terrain-board canvas.board-canvas-v7')?.width > 0 && document.querySelectorAll('.v7-gallery-piece').length > 0 && [...document.querySelectorAll('.v7-gallery-detail .v7-gallery-swatch-tile')].every((tile) => tile.dataset.state === 'ready')`,
  );
  const pieces = await driver.evaluate<number>(
    `document.querySelectorAll('.v7-gallery-piece').length`,
  );
  await driver.capture("gallery-terrain-detail.png");
  await driver.pressEscape();
  await driver.waitForExpression(
    `document.querySelector('.v7-gallery-detail') === null && document.activeElement?.dataset.row === 'FOREST'`,
  );
  const sounds = await probeGallerySoundsV7(driver, table.factions.length);
  await driver.pointerClick('[data-action="gallery-tab-units"]');
  await driver.waitForExpression(
    `document.querySelector('.v7-gallery-cell[data-row="CATAPULT"]') !== null && document.querySelector('[data-v7-gallery-sounds]') === null`,
  );
  // Reset the remembered filters, then go Back to the front screen.
  await driver.pointerClick('[data-action="gallery-factions-all"]');
  await driver.pointerClick('[data-action="gallery-rows-all"]');
  await driver.pointerClick('[data-action="gallery-back"]');
  await driver.waitForExpression(
    `document.querySelector('[data-v7-gallery]') === null && document.activeElement?.dataset.action === 'gallery'`,
  );
  await driver.evaluate(
    `localStorage.removeItem(${JSON.stringify(GALLERY_SMOKE_STORAGE_KEY_V7)})`,
  );
  return `${table.cells} unit cells in ${table.factions.length} faction columns, filtered to ${filtered.cells.length} and remembered, Lich detail played its attack, Terrain tab with ${terrain.rows.length} rows and a Forest sample board over ${pieces} pieces, ${sounds}, Escape and Back returned focus`;
}

const SOUNDS_AUDIO = "globalThis.__PULP_WARS_APP__.view.audio";
const SOUNDS_PLAYED = "match.victory";

/**
 * The Sounds tab (bead pulp_wars-2yc.19, docs/ui/SOUND.md): a card for
 * every sound of the manifest, a pending theme row per faction, and one
 * sound played by a pointer click: the audio is asked for it, the card
 * shows that it plays, and its stop control ends it. A browser without a
 * sound device shows the tab's notice instead of a playing card.
 */
async function probeGallerySoundsV7(
  driver: GallerySmokeDriverV7,
  factions: number,
): Promise<string> {
  await driver.pointerClick('[data-action="gallery-tab-sounds"]');
  await driver.waitForExpression(
    `document.querySelector('[data-v7-gallery-sounds]') !== null && document.querySelector('[data-action="gallery-tab-sounds"]')?.getAttribute('aria-selected') === 'true'`,
  );
  const listed = await driver.evaluate<{
    readonly ids: readonly string[];
    readonly groups: number;
    readonly pending: number;
    readonly themes: number;
    readonly enabled: boolean;
    readonly noticeHidden: boolean;
    readonly overflow: number;
  }>(
    `({ ids: [...document.querySelectorAll('[data-v7-gallery-sounds] [data-sound-play][data-sound-id]')].map((card) => card.dataset.soundId), groups: document.querySelectorAll('.v7-gallery-sound-group').length, pending: document.querySelectorAll('.v7-gallery-sound-group[data-group="themes"] .v7-gallery-sound[data-pending="true"] [aria-disabled="true"]').length, themes: document.querySelectorAll('.v7-gallery-sound-group[data-group="themes"] .v7-gallery-sound').length, enabled: ${SOUNDS_AUDIO}.settings.enabled, noticeHidden: document.querySelector('.v7-gallery-sounds-notice')?.hidden === true, overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth })`,
  );
  // Every manifest sound once; one theme row per faction column, none of
  // them playable while the manifest has no theme; sound is on.
  if (
    [...listed.ids].sort().join() !== [...SOUND_IDS_V1].sort().join() ||
    listed.groups < 2 ||
    listed.themes !== factions ||
    listed.pending !== factions ||
    !listed.enabled ||
    !listed.noticeHidden ||
    listed.overflow > 0
  )
    throw new Error(`Gallery sounds are incomplete: ${JSON.stringify(listed)}`);
  await driver.evaluate(`${SOUNDS_AUDIO}.clearLog()`);
  await driver.pointerClick(`[data-sound-play="${SOUNDS_PLAYED}"]`);
  // The card's own sound, and no interface click on top of it.
  await driver.waitForExpression(
    `${SOUNDS_AUDIO}.log.some((entry) => entry.id === '${SOUNDS_PLAYED}' && (entry.outcome === 'PLAYED' || document.querySelector('.v7-gallery-sounds-notice')?.hidden === false))`,
  );
  const played = await driver.evaluate<{
    readonly log: readonly string[];
    readonly playing: readonly string[];
    readonly stopHidden: boolean;
  }>(
    `({ log: ${SOUNDS_AUDIO}.log.map((entry) => entry.id + ':' + entry.outcome), playing: [...document.querySelectorAll('.v7-gallery-sound[data-playing="true"]')].map((row) => row.dataset.soundRow), stopHidden: document.querySelector('[data-sound-row="${SOUNDS_PLAYED}"] .v7-gallery-sound-stop')?.hidden === true })`,
  );
  const heard = played.log.includes(`${SOUNDS_PLAYED}:PLAYED`);
  if (
    played.log.some((entry) => !entry.startsWith(`${SOUNDS_PLAYED}:`)) ||
    played.log.some((entry) => entry.endsWith(":MUTED")) ||
    (heard && (played.playing.join() !== SOUNDS_PLAYED || played.stopHidden))
  )
    throw new Error(`Gallery sound did not play: ${JSON.stringify(played)}`);
  await driver.capture("gallery-sounds.png");
  if (heard) {
    await driver.pointerClick(
      `[data-sound-row="${SOUNDS_PLAYED}"] .v7-gallery-sound-stop`,
    );
    await driver.waitForExpression(
      `document.querySelectorAll('.v7-gallery-sound[data-playing="true"]').length === 0 && ${SOUNDS_AUDIO}.remainingMs('${SOUNDS_PLAYED}') === 0`,
    );
  }
  return `Sounds tab with ${listed.ids.length} sounds in ${listed.groups} groups and ${listed.pending} pending themes, Victory ${heard ? "played and stopped" : "asked for (no sound device)"}`;
}
