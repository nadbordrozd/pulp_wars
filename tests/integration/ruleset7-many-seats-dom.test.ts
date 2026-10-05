// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";
import { bootstrapRuleset7App } from "../../src/app/index";
import {
  FACTION_IDS_V7,
  MAP_GENERATION_REVISION_V7,
  RULESET_7_ID,
  SAVE_STORAGE_KEY_V7,
  createPlayableGameV7,
  createReplayV7,
  type MatchSetupV7,
} from "../../src/engine/index";
import { createSaveEnvelopeV7 } from "../../src/persistence/v7";
import { FACTION_COLOURS_V7 } from "../../src/render/canvas/faction-colours-v7";

/**
 * Many seats (`pulp_wars-ykw.3`): the setup screen still offers at most
 * three opponents (its redesign is `pulp_wars-ykw.5`), but the match
 * interface must not break on a match with more players. An eight-seat
 * match reaches the browser here the only way it can today, as a saved
 * match, and is resumed.
 */

const SETUP: MatchSetupV7 = {
  rulesetId: RULESET_7_ID,
  seed: 5,
  width: 11,
  height: 11,
  aiCount: FACTION_IDS_V7.length - 1,
  aiDifficulty: "NORMAL",
  aiMode: "RIVAL",
  humanColor: "CORAL",
  factions: [...FACTION_IDS_V7],
  mapType: "DRY_LAND",
  mapGenerationRevision: MAP_GENERATION_REVISION_V7,
  curiosities: false,
};

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  window.localStorage.clear();
});

describe("Ruleset 7 interface with eight players", () => {
  it("keeps the setup screen at three opponents", () => {
    const app = bootstrapRuleset7App(document, { storage: null });
    const select = document.querySelector<HTMLSelectElement>("#v7-ai-count");
    if (select === null) throw new Error("Missing #v7-ai-count");
    expect([...select.options].map((option) => option.value)).toEqual([
      "1",
      "2",
      "3",
    ]);
    app.destroy();
  });

  it("resumes an eight-player match and lists every player in its faction colour", async () => {
    const created = createPlayableGameV7(SETUP);
    if (!created.ok) throw new Error(created.error.code);
    window.localStorage.setItem(
      SAVE_STORAGE_KEY_V7,
      JSON.stringify(
        createSaveEnvelopeV7(
          { state: created.state, replay: createReplayV7(SETUP) },
          "2026-10-05T10:00:00.000Z",
        ),
      ),
    );
    const app = bootstrapRuleset7App(document);
    await waitUntil(() => app.controller.snapshot().phase === "RESUMABLE");
    requiredButton('[data-action="resume"]').click();
    await waitUntil(() => app.controller.snapshot().phase === "ACTIVE");
    expect(document.querySelector(".v7-match-root")).not.toBeNull();
    const view = app.controller.snapshot().view;
    if (view === null) throw new Error("public view missing");
    expect(view.players).toHaveLength(FACTION_IDS_V7.length);
    expect(view.leaderboard).toHaveLength(FACTION_IDS_V7.length);
    if (document.querySelector('[data-action="leaderboard"]') === null)
      requiredButton('[data-action="compact-menu"]').click();
    requiredButton('[data-action="leaderboard"]').click();
    const rows = [
      ...document.querySelectorAll<HTMLElement>(".v7-leaderboard-row"),
    ];
    expect(rows).toHaveLength(FACTION_IDS_V7.length);
    const colours = rows.map((row) => row.style.getPropertyValue("--player"));
    expect(colours).toEqual(
      view.leaderboard.map((entry) => FACTION_COLOURS_V7[entry.faction]),
    );
    // Eight factions, eight different owner colours.
    expect(new Set(colours).size).toBe(FACTION_IDS_V7.length);
    app.destroy();
  });
});

function requiredButton(selector: string): HTMLButtonElement {
  const node = document.querySelector<HTMLButtonElement>(selector);
  if (node === null) throw new Error(`Missing ${selector}`);
  return node;
}

async function waitUntil(predicate: () => boolean): Promise<void> {
  for (let index = 0; index < 400; index += 1) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  throw new Error("Condition not reached");
}
