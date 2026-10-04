import { ruleset7FixtureMountExpressionV7 } from "./browser-undead-fixture-v7";

/**
 * The Candy step of the Ruleset 7 browser smoke (bead pulp_wars-jdb.6,
 * docs/product/RULESET_7_CANDY.md section 15; dev server only, the fixture
 * comes from `tests/fixtures`). On the Candy UI fixture in the default look
 * it checks that the board plans the Crumbs and the Rushed, Crashed and
 * Splatted markers, that arming the Sugar Rush and choosing a tile only the
 * Rush reaches sends `SUGAR_RUSH` and then the Move, that the moved unit's
 * dock says "Rushed", that a Re-bake from the dock bakes the fallen unit
 * back, and that nothing in the dock names a tile. Kept apart from the
 * smoke's main file so a reviewer can run it alone against a dev server.
 */

export interface CandySmokeDriverV7 {
  evaluate<T>(expression: string, awaitPromise?: boolean): Promise<T>;
  waitForExpression(expression: string, attempts?: number): Promise<void>;
  pointerClick(selector: string): Promise<void>;
  capture(name: string): Promise<void>;
}

const REVIEW = "globalThis.__CANDY_SMOKE__";

interface Coord {
  readonly x: number;
  readonly y: number;
}

export async function probeCandyV7(
  driver: CandySmokeDriverV7,
): Promise<string> {
  await driver.evaluate(
    ruleset7FixtureMountExpressionV7({
      module: "/tests/fixtures/v7-candy-ui.ts",
      fixture: "candyUiFixtureV7",
      artSet: "CHIBI",
      global: "__CANDY_SMOKE__",
      extras: "at: fixtures.CANDY_UI_V7",
    }),
    true,
  );
  await driver.waitForExpression(
    `${REVIEW}?.boardHost !== undefined && document.querySelector('canvas.board-canvas-v7') !== null`,
  );
  const at = await driver.evaluate<Record<string, Coord>>(`${REVIEW}.at`);
  const pieces = await driver.evaluate<{
    readonly crumbs: number;
    readonly markers: readonly string[];
  }>(
    `(async () => {
      const { buildBoardRenderPlanV7 } = await import('/src/render/canvas/board-renderer-v7.ts');
      const entries = buildBoardRenderPlanV7(${REVIEW}.snapshotView(), [], { selection: null, selectedUnitId: null, selectedAchievement: null }).entries;
      const markers = new Set();
      for (const entry of entries) {
        if (entry.candy?.rushed) markers.add(entry.candy.frenzy !== null ? 'frenzy' : entry.candy.home ? 'rushed-home' : 'rushed');
        if (entry.candy?.crashed) markers.add('crashed');
        if (entry.candy?.splatted) markers.add('splatted');
      }
      return { crumbs: entries.filter((entry) => entry.kind === 'CRUMBS').length, markers: [...markers].sort() };
    })()`,
    true,
  );
  if (
    pieces.crumbs !== 2 ||
    pieces.markers.join() !== "crashed,frenzy,rushed-home,splatted"
  )
    throw new Error(`Candy markers missing: ${JSON.stringify(pieces)}`);
  // Arm the Sugar Rush of the fresh Gumdrop and choose a tile only the
  // Rush reaches: SUGAR_RUSH, then the Move.
  await driver.evaluate(
    `(() => { const host = ${REVIEW}.boardHost; host.resetInspectionCycle(); host.activate(${JSON.stringify(at.gumdrop)}); document.querySelector('canvas.board-canvas-v7')?.focus(); })()`,
  );
  await driver.waitForExpression(
    `document.querySelector('[data-action="candy-sugar-rush"]:not([aria-disabled="true"]):not(:disabled)') !== null`,
  );
  await driver.pointerClick('[data-action="candy-sugar-rush"]');
  await driver.waitForExpression(
    `document.querySelector('[data-v7-candy-pick="sugar_rush"]') !== null`,
  );
  const reach = await driver.evaluate<Coord | null>(
    `(async () => {
      const engine = await import('/src/engine/index.ts');
      const view = ${REVIEW}.snapshotView();
      const unit = view.units.find((candidate) => candidate.at.x === ${at.gumdrop?.x} && candidate.at.y === ${at.gumdrop?.y});
      return engine.previewSugarRushV7(view, unit.id)?.newDestinations[0] ?? null;
    })()`,
    true,
  );
  if (reach === null) throw new Error("The Rush reaches no new tile");
  await driver.capture("candy-sugar-rush-armed.png");
  await driver.evaluate(
    `${REVIEW}.boardHost.activate(${JSON.stringify(reach)})`,
  );
  await driver.waitForExpression(
    `(() => { const kinds = ${REVIEW}.traces.map((trace) => trace.command.kind); return kinds.length >= 2 && kinds[0] === 'SUGAR_RUSH' && kinds[1] === 'MOVE' && ${REVIEW}.traces[0].eventKinds.includes('UNIT_SUGAR_RUSHED'); })()`,
  );
  await driver.waitForExpression(
    `(() => { const view = ${REVIEW}.snapshotView(); const unit = view.units.find((candidate) => candidate.at.x === ${reach.x} && candidate.at.y === ${reach.y}); return unit !== undefined && view.sugarRush.some((entry) => entry.unitId === unit.id && entry.phase === 'RUSHED') && document.querySelector('canvas[data-candy-effect]') === null; })()`,
    300,
  );
  // The moved unit stays selected; select it if the dock was closed.
  await driver.evaluate(
    `(() => { if (document.querySelector('.v7-selection-dock [data-unit-status="rushed"]') !== null) return; const host = ${REVIEW}.boardHost; host.resetInspectionCycle(); host.activate(${JSON.stringify(reach)}); })()`,
  );
  await driver.waitForExpression(
    `document.querySelector('.v7-selection-dock [data-unit-status="rushed"]')?.textContent === 'Rushed' && document.querySelector('[data-action="candy-sugar-rush"]')?.dataset.disabledReason === 'Already rushed'`,
  );
  // A Re-bake from the dock: the Confectioner bakes the fallen unit back.
  await driver.evaluate(
    `(() => { const host = ${REVIEW}.boardHost; host.resetInspectionCycle(); host.activate(${JSON.stringify(at.confectioner)}); })()`,
  );
  await driver.waitForExpression(
    `document.querySelector('.v7-selection-dock h2')?.textContent === 'Confectioner' && document.querySelector('[data-action="candy-rebake"]:not([aria-disabled="true"]):not(:disabled)') !== null && (document.querySelector('[data-action="command-tend_wounded"]')?.textContent ?? '').includes('Frosting')`,
  );
  await driver.pointerClick('[data-action="candy-rebake"]');
  await driver.waitForExpression(
    `document.querySelector('[data-v7-candy-pick="rebake"] [data-action="rebake-0"]') !== null`,
  );
  const dockText = await driver.evaluate<string>(
    `document.querySelector('.v7-selection-dock')?.textContent ?? ''`,
  );
  if (/\(\s*\d+\s*,\s*\d+\s*\)/.test(dockText))
    throw new Error(`The Candy dock names a tile: ${dockText}`);
  await driver.capture("candy-rebake-aimed.png");
  await driver.pointerClick('[data-action="rebake-0"]');
  await driver.waitForExpression(
    `${REVIEW}.traces.some((trace) => trace.command.kind === 'REBAKE' && trace.eventKinds.includes('UNIT_REBAKED'))`,
  );
  await driver.waitForExpression(
    `${REVIEW}.snapshotView().crumbs.length === 1 && (document.body.textContent ?? '').includes('re-baked a') && document.querySelector('canvas[data-candy-effect]') === null`,
    300,
  );
  await driver.evaluate(
    `(() => { ${REVIEW}?.view?.destroy?.(); delete globalThis.__CANDY_SMOKE__; })()`,
  );
  return `Crumbs and the Rushed, Crashed, Splatted and Sugar Frenzy markers planned, Sugar Rush armed and sent before its Move, "Rushed" in the dock, Re-bake from the dock`;
}
