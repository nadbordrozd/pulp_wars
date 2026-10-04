import { ruleset7FixtureMountExpressionV7 } from "./browser-undead-fixture-v7";

/**
 * The map curiosities step of the Ruleset 7 browser smoke (bead
 * pulp_wars-737.6, docs/product/RULESET_7_MAP_CURIOSITIES.md section 13.4;
 * dev server only, the fixture comes from `tests/fixtures`). On the
 * curiosities UI fixture (a 16 x 16 board with the Giant Spider on its
 * lair, a Fountain of Youth, a Shrine and a Sunken Wreck) in the default
 * look it checks that the board plans every curiosity and the provoked
 * Spider, that the Spider's dock says "Neutral", that a Fighter stepping
 * onto the Shrine claims it and is Promoted, and that End Turn plays the
 * neutral turn (the Spider attacks the Fighter beside it) and the Fountain
 * heals the unit standing on it. Kept apart from the smoke's main file so a
 * reviewer can run it alone against a dev server.
 */

export interface CuriositiesSmokeDriverV7 {
  evaluate<T>(expression: string, awaitPromise?: boolean): Promise<T>;
  waitForExpression(expression: string, attempts?: number): Promise<void>;
  pointerClick(selector: string): Promise<void>;
  capture(name: string): Promise<void>;
}

const REVIEW = "globalThis.__CURIOSITIES_SMOKE__";

interface Coord {
  readonly x: number;
  readonly y: number;
}

export async function probeCuriositiesV7(
  driver: CuriositiesSmokeDriverV7,
): Promise<string> {
  await driver.evaluate(
    ruleset7FixtureMountExpressionV7({
      module: "/tests/fixtures/v7-curiosities-ui.ts",
      fixture: "curiositiesWoundedSpiderFixtureV7",
      artSet: "CHIBI",
      global: "__CURIOSITIES_SMOKE__",
      extras: "at: fixtures.CURIOSITIES_UI_V7",
    }),
    true,
  );
  await driver.waitForExpression(
    `${REVIEW}?.boardHost !== undefined && document.querySelector('canvas.board-canvas-v7') !== null`,
  );
  const at = await driver.evaluate<Record<string, Coord>>(`${REVIEW}.at`);
  const pieces = await driver.evaluate<readonly string[]>(
    `(async () => {
      const { buildBoardRenderPlanV7 } = await import('/src/render/canvas/board-renderer-v7.ts');
      return buildBoardRenderPlanV7(${REVIEW}.snapshotView(), [], { selection: null, selectedUnitId: null, selectedAchievement: null })
        .entries.filter((entry) => entry.kind === 'CURIOSITY' || entry.monster !== undefined)
        .map((entry) => entry.artSubject + (entry.monster?.provoked ? ':provoked' : ''))
        .sort();
    })()`,
    true,
  );
  if (
    pieces.join() !==
    "CURIOSITY:FOUNTAIN,CURIOSITY:SHRINE,CURIOSITY:WEB,CURIOSITY:WRECK,UNIT:MONSTER_GIANT_SPIDER:provoked"
  )
    throw new Error(`Curiosity pieces missing: ${JSON.stringify(pieces)}`);
  // The Spider's dock: its name, "Neutral", no owner and no faction.
  await driver.evaluate(
    `(() => { ${REVIEW}.boardHost.activate(${JSON.stringify(at.spider)}); document.querySelector('canvas.board-canvas-v7')?.focus(); })()`,
  );
  await driver.waitForExpression(
    `document.querySelector('.v7-selection-dock h2')?.textContent === 'Giant Spider' && document.querySelector('.v7-selection-dock [data-unit-status="neutral"]')?.textContent === 'Neutral' && document.querySelector('.v7-selection-dock .v7-faction-chip') === null`,
  );
  await driver.capture("curiosities-spider-dock.png");
  // A Shrine claim: the Fighter steps onto it and is Promoted.
  await driver.evaluate(
    `(() => { const host = ${REVIEW}.boardHost; host.resetInspectionCycle(); host.activate(${JSON.stringify(at.pilgrim)}); host.activate(${JSON.stringify(at.shrine)}); })()`,
  );
  await driver.waitForExpression(
    `${REVIEW}.traces.some((trace) => trace.command.kind === 'MOVE' && trace.eventKinds.includes('SHRINE_CLAIMED') && trace.eventKinds.includes('UNIT_PROMOTED'))`,
  );
  await driver.waitForExpression(
    `(() => { const view = ${REVIEW}.snapshotView(); const unit = view.units.find((candidate) => candidate.at.x === ${at.shrine?.x} && candidate.at.y === ${at.shrine?.y}); return unit?.veteran === true && !view.curiosities.some((curiosity) => curiosity.kind === 'SHRINE') && (document.body.textContent ?? '').includes('Shrine: your Fighter was Promoted'); })()`,
  );
  // End Turn: the neutral turn, then the next seat's Fountain heal.
  const before = await driver.evaluate<{ bait: number; bather: number }>(
    `(() => { const view = ${REVIEW}.snapshotView(); const hp = (at) => view.units.find((unit) => unit.at.x === at.x && unit.at.y === at.y)?.hp ?? -1; return { bait: hp(${JSON.stringify(at.bait)}), bather: hp(${JSON.stringify(at.bather)}) }; })()`,
  );
  // The fixture's board is fully explored, so the first accepted command
  // unlocks Explorer: its notice is dismissed before End Turn.
  for (let notices = 0; notices < 4; notices += 1) {
    const open = await driver.evaluate<boolean>(
      `document.querySelector('[data-action="dismiss-achievement"]') !== null`,
    );
    if (!open) break;
    await driver.pointerClick('[data-action="dismiss-achievement"]');
    await driver.waitForExpression(
      `document.querySelectorAll('[data-v7-region="achievement-notice"]').length === 0 || document.querySelector('[data-action="dismiss-achievement"]') !== null`,
    );
  }
  await driver.waitForExpression(
    `document.querySelector('[data-action="end-turn"]:not(:disabled)') !== null && document.querySelector('[data-v7-region="achievement-notice"]') === null`,
  );
  await driver.pointerClick('[data-action="end-turn"]');
  await driver.waitForExpression(
    `${REVIEW}.traces.some((trace) => trace.command.kind === 'END_TURN' && ['NEUTRAL_TURN_STARTED', 'COMBAT_RESOLVED', 'MONSTER_REGENERATED', 'NEUTRAL_TURN_ENDED', 'FOUNTAIN_HEALED'].every((kind) => trace.eventKinds.includes(kind)))`,
  );
  // The playback ends (no cue left on the effects canvas) and the log
  // names the neutral turn.
  await driver.waitForExpression(
    `(document.body.textContent ?? '').includes('The wilds stir') && document.querySelector('canvas[data-support-effect]') === null`,
    300,
  );
  const after = await driver.evaluate<{ bait: number; bather: number }>(
    `(() => { const view = ${REVIEW}.snapshotView(); const hp = (at) => view.units.find((unit) => unit.at.x === at.x && unit.at.y === at.y)?.hp ?? -1; return { bait: hp(${JSON.stringify(at.bait)}), bather: hp(${JSON.stringify(at.bather)}) }; })()`,
  );
  if (after.bait >= before.bait || after.bather <= before.bather)
    throw new Error(
      `Neutral turn or Fountain heal missing: ${JSON.stringify({ before, after })}`,
    );
  await driver.capture("curiosities-neutral-turn.png");
  await driver.evaluate(
    `(() => { ${REVIEW}?.view?.destroy?.(); delete globalThis.__CURIOSITIES_SMOKE__; })()`,
  );
  return `Spider, lair, Fountain, Shrine and Wreck planned, Spider dock "Neutral", Shrine claimed (Fighter Promoted), neutral turn hit the Fighter for ${before.bait - after.bait}, Fountain healed +${after.bather - before.bather}`;
}
