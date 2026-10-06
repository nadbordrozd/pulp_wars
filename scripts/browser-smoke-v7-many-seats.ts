/**
 * The many-players step of the Ruleset 7 browser smoke (bead
 * pulp_wars-ykw.5, docs/product/RULESET_7_MAP_SCALE.md section 10.3): from
 * a fresh front screen it chooses the most opponents the setup offers with
 * the keyboard, Dry Land and its smallest size (marked Crowded), launches,
 * plays the human's first End Turn at normal speed, checks that every AI
 * player took a turn and the turn-order strip followed, then saves and
 * quits, reads the player count on the resume screen and deletes the save.
 * It is deliberately light: one End Turn on the smallest board. It imports
 * nothing from the source tree, so it also runs against a deployed bundle.
 */

export interface ManySeatsSmokeDriverV7 {
  evaluate<T>(expression: string, awaitPromise?: boolean): Promise<T>;
  waitForExpression(expression: string, attempts?: number): Promise<void>;
  pointerClick(selector: string): Promise<void>;
  /** Types `keys` into the focused, closed select until it holds `value`. */
  typeSelectKeys(selector: string, keys: string, value: string): Promise<void>;
  openCompactMenuItem(action: string): Promise<void>;
  capture(name: string): Promise<void>;
}

const HUMAN_TURN = `(() => { const s = globalThis.__PULP_WARS_APP__?.controller.snapshot(); const v = s?.view; return s?.phase === 'ACTIVE' && !s.transitioning && !s.ai.active && v?.turnOrder[v.activeSeatIndex] === v.humanPlayerId && v.pendingChoices.length === 0; })()`;

export async function probeManySeatsV7(
  driver: ManySeatsSmokeDriverV7,
): Promise<string> {
  // The main menu (pulp_wars-2yc.18): New game opens the setup form.
  await driver.waitForExpression(
    `document.querySelector('nav.v7-main-menu [data-action="new-game"]') !== null && globalThis.__PULP_WARS_APP__?.controller.snapshot().phase === 'EMPTY'`,
  );
  await driver.pointerClick('[data-action="new-game"]');
  await driver.waitForExpression(
    `document.querySelector('[data-v7-front="setup"] .v7-front-panel #v7-ai-count') !== null && document.querySelector('.v7-main-menu') === null`,
  );
  const counts = await driver.evaluate<readonly string[]>(
    `[...document.querySelectorAll('#v7-ai-count option')].map((option) => option.value)`,
  );
  const most = counts.at(-1) ?? "";
  // One opponent per other faction: more than the three of the old setup.
  if (counts[0] !== "1" || counts.length < 4 || most !== String(counts.length))
    throw new Error(`Opponent counts are wrong: ${JSON.stringify(counts)}`);
  const seats = counts.length + 1;
  await driver.evaluate(`document.querySelector('#v7-ai-count').focus()`);
  await driver.typeSelectKeys("#v7-ai-count", most, most);
  // The seats' emblems settle (a settled portrait redraws the form) before
  // the next select is typed into.
  await driver.waitForExpression(
    `document.querySelectorAll('.v7-setup-seat').length === ${seats} && document.querySelector('.v7-setup-seat [data-chibi-state="loading"]') === null`,
  );
  await driver.evaluate(`document.querySelector('#v7-map-type').focus()`);
  await driver.typeSelectKeys("#v7-map-type", "D", "DRY_LAND");
  await driver.evaluate(`document.querySelector('#v7-board-size').focus()`);
  // Repeated "1" keys cycle through the sizes that start with 1, so the
  // probe presses as many as lead from the current size to 11 x 11.
  const presses = await driver.evaluate<number>(
    `(() => { const size = document.querySelector('#v7-board-size'); const ones = [...size.options].filter((option) => (option.textContent ?? '').startsWith('1')).map((option) => option.value); return (ones.indexOf('11') - ones.indexOf(size.value) + ones.length) % ones.length; })()`,
  );
  if (presses > 0)
    await driver.typeSelectKeys("#v7-board-size", "1".repeat(presses), "11");
  const setup = await driver.evaluate<{
    readonly sizes: readonly string[];
    readonly crowded: readonly string[];
    readonly chip: boolean;
    readonly villages: string;
    readonly showcaseDisabled: boolean;
    readonly showcaseLabel: string;
    readonly seatCells: number;
    readonly factions: number;
    readonly overflow: number;
  }>(
    `(() => { const size = document.querySelector('#v7-board-size'); const showcase = document.querySelector('#v7-map-type option[value="SHOWCASE"]'); const chip = document.querySelector('.v7-crowded-chip'); const cells = [...document.querySelectorAll('.v7-setup-seat')]; return { sizes: [...size.options].map((option) => option.value), crowded: [...size.options].filter((option) => option.dataset.crowded === 'true').map((option) => option.value), chip: chip instanceof HTMLElement && !chip.hidden && chip.getBoundingClientRect().width > 0 && chip.textContent === 'Crowded', villages: document.querySelector('.v7-setup-villages')?.textContent ?? '', showcaseDisabled: showcase?.disabled === true, showcaseLabel: showcase?.textContent ?? '', seatCells: cells.length, factions: new Set(cells.map((cell) => cell.dataset.faction)).size, overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth }; })()`,
  );
  if (
    setup.sizes[0] !== "11" ||
    !setup.crowded.includes("11") ||
    setup.crowded.length === setup.sizes.length ||
    !setup.chip ||
    !/^(No villages|Up to \d+ villages?)$/.test(setup.villages) ||
    !setup.showcaseDisabled ||
    !/^Showcase \(up to \d+ opponents\)$/.test(setup.showcaseLabel) ||
    setup.seatCells !== seats ||
    setup.factions !== seats ||
    setup.overflow > 0
  )
    throw new Error(`Many-players setup is wrong: ${JSON.stringify(setup)}`);
  await driver.capture("many-seats-setup-desktop.png");
  await driver.pointerClick('[data-action="launch"]');
  // The players before the human in the turn order play their first turn.
  await driver.waitForExpression(HUMAN_TURN, 900);
  const started = await driver.evaluate<{
    readonly players: number;
    readonly width: number;
    readonly mapType: string;
    readonly round: number;
    readonly chips: number;
    readonly activeViewer: boolean;
    readonly overflow: number;
  }>(
    `(() => { const view = globalThis.__PULP_WARS_APP__.controller.snapshot().view; const chips = [...document.querySelectorAll('.v7-turn-chip')]; return { players: view.players.length, width: view.setup.width, mapType: view.setup.mapType, round: view.round, chips: chips.length, activeViewer: chips.filter((chip) => chip.dataset.active === 'true').length === 1 && chips.find((chip) => chip.dataset.active === 'true')?.dataset.viewer === 'true', overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth }; })()`,
  );
  if (
    started.players !== seats ||
    started.width !== 11 ||
    started.mapType !== "DRY_LAND" ||
    started.round !== 1 ||
    started.chips !== seats ||
    !started.activeViewer ||
    started.overflow > 0
  )
    throw new Error(`Many-players launch failed: ${JSON.stringify(started)}`);
  await driver.capture("many-seats-hud-desktop.png");
  // Record every player who becomes active and every status the HUD shows
  // while the opponents play, at normal speed (no Fast Forward).
  await driver.evaluate(
    `(() => { const app = globalThis.__PULP_WARS_APP__; const record = { active: [], statuses: [], startedAt: performance.now() }; globalThis.__V7_MANY_SEATS__ = record; const note = () => { const view = app.controller.snapshot().view; const id = view?.turnOrder[view.activeSeatIndex]; if (id !== undefined && !record.active.includes(id)) record.active.push(id); const status = document.querySelector('.v7-turn-status')?.textContent ?? ''; if (status !== '' && record.statuses.at(-1) !== status) record.statuses.push(status); }; record.unsubscribe = app.controller.subscribe(note); record.observer = new MutationObserver(note); record.observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true }); })()`,
  );
  await driver.pointerClick('[data-action="end-turn"]');
  await driver.waitForExpression(
    `globalThis.__PULP_WARS_APP__?.controller.snapshot().phase === 'ERROR' || (${HUMAN_TURN} && globalThis.__PULP_WARS_APP__.controller.snapshot().view.round === 2)`,
    1800,
  );
  const round = await driver.evaluate<{
    readonly phase: string;
    readonly active: number;
    readonly statuses: readonly string[];
    readonly milliseconds: number;
    readonly eliminated: number;
  }>(
    `(() => { const record = globalThis.__V7_MANY_SEATS__; record.unsubscribe(); record.observer.disconnect(); const snapshot = globalThis.__PULP_WARS_APP__.controller.snapshot(); return { phase: snapshot.phase, active: record.active.length, statuses: record.statuses, milliseconds: Math.round(performance.now() - record.startedAt), eliminated: snapshot.view.players.filter((player) => player.status === 'ELIMINATED').length }; })()`,
  );
  const places = round.statuses.filter((status) =>
    new RegExp(`is playing… \\(\\d+ of ${seats - 1}\\)$`).test(status),
  );
  // Every player was active once, and the status counted the opponents.
  if (
    round.phase !== "ACTIVE" ||
    round.active !== seats ||
    round.eliminated !== 0 ||
    places.length === 0 ||
    round.statuses.at(-1) !== "Your turn"
  )
    throw new Error(`Many-players End Turn failed: ${JSON.stringify(round)}`);
  // Leave: save and quit, read the player count, delete the save.
  await driver.openCompactMenuItem("main-menu");
  await driver.waitForExpression(
    `globalThis.__PULP_WARS_APP__?.controller.snapshot().phase === 'RESUMABLE' && (document.querySelector('.v7-resume-summary')?.textContent ?? '').endsWith(' · ${seats} players · Dry land')`,
  );
  await driver.pointerClick('[data-action="delete-save"]');
  await driver.waitForExpression(
    `document.querySelector('[data-v7-setup]') !== null && globalThis.__PULP_WARS_APP__?.controller.snapshot().phase === 'EMPTY'`,
  );
  return `${seats} players on Dry Land 11 × 11 (Crowded), End Turn through ${seats - 1} opponents in ${round.milliseconds} ms at normal speed (${places.length} counted statuses), save, quit and delete`;
}
