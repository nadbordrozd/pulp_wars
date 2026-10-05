/**
 * The Gallery step of the Ruleset 7 browser smoke (bead pulp_wars-ic8):
 * from a fresh front screen it opens the Gallery with a pointer click,
 * checks the full unit table, hides a faction and a set of rows with the
 * filter chips (remembered in localStorage), opens a unit's detail and
 * waits for its animation preview to play on the real board host, closes
 * it with Escape and goes Back. Kept apart from the smoke's main file so a
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
  // units and the one Egg, whose row is empty for the seven other factions.
  if (
    table.factions.join() !==
      "ORIGINAL,UNDEAD,GOBLIN,DINOSAUR,MARTIAN,ICE_FOLK,DWARF,CANDY" ||
    table.cells !== 97 ||
    table.empty !== 7 ||
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
  return `${table.cells} unit cells in ${table.factions.length} faction columns, filtered to ${filtered.cells.length} and remembered, Lich detail played its attack, Escape and Back returned focus`;
}
