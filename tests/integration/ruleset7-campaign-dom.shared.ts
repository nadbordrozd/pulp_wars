// Helpers shared by ruleset7-campaign-dom.test.ts and its
// whole-game simulations in ruleset7-campaign-dom.sim.test.ts
// (`pulp_wars-bwry`).

import { CAMPAIGN_PROGRESS_STORAGE_KEY_V7 } from "../../src/persistence/index";

/**
 * The campaign screens (`pulp_wars-68k.5`, docs/product/CAMPAIGN.md
 * sections 4 and 5): the Skirmish / Campaign switch, the mission list, the
 * briefing with its filtered faction choice, the mission label in Settings
 * and on the resume screen, the mission Victory and Defeat dialogs, the
 * unlock notice, and Reset progress.
 */
export const AT = "2026-10-03T12:00:00.000Z";

export const won = (bestRounds = 12) => ({ firstWonAt: AT, bestRounds });

export function seedProgress(completed: Record<string, unknown>): void {
  window.localStorage.setItem(
    CAMPAIGN_PROGRESS_STORAGE_KEY_V7,
    JSON.stringify({
      format: "pulp-wars-campaign-progress",
      version: 1,
      completed,
    }),
  );
}

export async function settle(): Promise<void> {
  for (let index = 0; index < 5; index += 1)
    await new Promise((resolve) => setTimeout(resolve, 0));
}

export async function waitUntil(predicate: () => boolean): Promise<void> {
  for (let index = 0; index < 400; index += 1) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  throw new Error("Condition not reached");
}

export function requiredButton(selector: string): HTMLButtonElement {
  const node = document.querySelector<HTMLButtonElement>(selector);
  if (node === null) throw new Error(`Missing ${selector}`);
  return node;
}

export function required<T>(value: T | null | undefined): T {
  if (value === null || value === undefined)
    throw new Error("Required value missing");
  return value;
}
