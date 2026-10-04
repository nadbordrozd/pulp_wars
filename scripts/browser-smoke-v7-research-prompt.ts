import { ruleset7FixtureMountExpressionV7 } from "./browser-undead-fixture-v7";

/**
 * The research prompt step of the Ruleset 7 browser smoke (bead
 * pulp_wars-gl1, docs/ui/SCREEN_FLOW.md "Research prompts"; dev server only,
 * the fixture comes from `tests/fixtures`). On the research prompt match (a
 * Fruit in the human's territory and no technology) it checks that the
 * Fruit's dock offers "Research Gathering", that pressing it opens the
 * technology screen with Gathering selected and its Research control
 * focused, that researching it there is accepted, and that Escape returns
 * to the same tile with Harvest on offer. Kept apart from the smoke's main
 * file so a reviewer can run it alone against a dev server.
 */

export interface ResearchPromptSmokeDriverV7 {
  evaluate<T>(expression: string, awaitPromise?: boolean): Promise<T>;
  waitForExpression(expression: string, attempts?: number): Promise<void>;
  pointerClick(selector: string): Promise<void>;
  pressEscape(): Promise<void>;
  capture(name: string): Promise<void>;
}

const REVIEW = "globalThis.__RESEARCH_PROMPT_SMOKE__";

export async function probeResearchPromptV7(
  driver: ResearchPromptSmokeDriverV7,
): Promise<string> {
  await driver.evaluate(
    ruleset7FixtureMountExpressionV7({
      module: "/tests/fixtures/v7-research-prompt.ts",
      fixture: "researchPromptSmokeFixtureV7",
      artSet: "CHIBI",
      global: "__RESEARCH_PROMPT_SMOKE__",
      extras: "at: fixtures.RESEARCH_PROMPT_UI_V7",
    }),
    true,
  );
  await driver.waitForExpression(
    `${REVIEW}?.boardHost !== undefined && document.querySelector('canvas.board-canvas-v7') !== null`,
  );
  await driver.evaluate(
    `(() => { const host = ${REVIEW}.boardHost; host.resetInspectionCycle(); host.activate(${REVIEW}.at.fruit); })()`,
  );
  const prompt = '[data-action="research-prompt-gathering"]';
  await driver.waitForExpression(
    `document.querySelector('.v7-selection-dock h2')?.textContent === 'Fruit' && document.querySelector('${prompt}:not(:disabled)')?.textContent === 'Research Gathering' && document.querySelector('[data-action="command-harvest_fruit"]') === null`,
  );
  await driver.capture("research-prompt-dock.png");
  await driver.pointerClick(prompt);
  await driver.waitForExpression(
    `document.querySelector('[data-v7-region="overlay-tech"]') !== null && document.querySelector('[data-action="tech-gathering"]')?.dataset.selected === 'true' && document.activeElement?.dataset.action === 'research-gathering'`,
  );
  await driver.capture("research-prompt-tech.png");
  await driver.pointerClick('[data-action="research-gathering"]');
  await driver.waitForExpression(
    `${REVIEW}.traces.some((trace) => trace.command.kind === 'RESEARCH' && trace.command.tech === 'GATHERING') && ${REVIEW}.snapshotView().viewer.researchedTechs.includes('GATHERING')`,
  );
  await driver.pressEscape();
  await driver.waitForExpression(
    `document.querySelector('[data-v7-region="overlay-tech"]') === null && document.querySelector('.v7-selection-dock h2')?.textContent === 'Fruit' && document.querySelector('${prompt}') === null && document.activeElement?.dataset.action === 'command-harvest_fruit'`,
  );
  await driver.evaluate(
    `(() => { ${REVIEW}?.view?.destroy?.(); delete globalThis.__RESEARCH_PROMPT_SMOKE__; })()`,
  );
  return "Fruit offered Research Gathering, Tech opened on it, researched, Harvest on return";
}
