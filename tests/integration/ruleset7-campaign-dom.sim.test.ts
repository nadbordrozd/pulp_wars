// @vitest-environment jsdom

// Whole-game simulations split out of
// ruleset7-campaign-dom.test.ts (`pulp_wars-bwry`): they
// play AI matches, so they run only in `npm run test:sim`.

import { beforeEach, describe, expect, it } from "vitest";
import { bootstrapRuleset7App } from "../../src/app/index";
import { CHAPTER_ONE_V7 } from "../../src/campaign/chapter-1";
import {
  CAMPAIGN_PROGRESS_STORAGE_KEY_V7,
  SAVE_STORAGE_KEY_V7,
} from "../../src/persistence/index";
import {
  missionLostSaveV7,
  missionWonSaveV7,
  missionWinFixtureV7,
} from "../fixtures/v7-campaign-ui";
import {
  AT,
  won,
  seedProgress,
  settle,
  waitUntil,
  requiredButton,
  required,
} from "./ruleset7-campaign-dom.shared";

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  window.localStorage.clear();
});

describe("Ruleset 7 mission dialogs", () => {
  it("records a win before the dialog, announces the unlock, and Next mission opens its briefing", async () => {
    seedProgress({ FRONTIER_1: won(20) });
    window.localStorage.setItem(
      SAVE_STORAGE_KEY_V7,
      missionWonSaveV7(AT, "FRONTIER_2"),
    );
    const app = bootstrapRuleset7App(document);
    expect(app.controller.snapshot().phase).toBe("COMPLETE");
    await settle();
    const dialog = required(
      document.querySelector<HTMLElement>("[data-v7-region='results']"),
    );
    expect(dialog.dataset.outcome).toBe("victory");
    expect(dialog.querySelector("h2")?.textContent).toBe("Mission complete");
    expect(dialog.querySelector(".v7-campaign-story")?.textContent).toBe(
      CHAPTER_ONE_V7.missions[1]?.closing,
    );
    const notice = required(
      dialog.querySelector<HTMLElement>("[data-v7-region='unlock-notice']"),
    );
    expect(notice.dataset.faction).toBe("GOBLIN");
    expect(notice.textContent).toBe("New faction: Goblin");
    expect(
      [...dialog.querySelectorAll("button")].map((node) => node.textContent),
    ).toEqual(["Next mission", "Campaign", "Main menu"]);
    expect(
      JSON.parse(
        window.localStorage.getItem(CAMPAIGN_PROGRESS_STORAGE_KEY_V7) ?? "",
      ).completed,
    ).toMatchObject({ FRONTIER_1: won(20), FRONTIER_2: {} });
    requiredButton('[data-action="campaign-next"]').click();
    await waitUntil(() => app.controller.snapshot().phase === "EMPTY");
    await settle();
    expect(window.localStorage.getItem(SAVE_STORAGE_KEY_V7)).toBeNull();
    const briefing = required(
      document.querySelector<HTMLElement>("[data-v7-region='briefing']"),
    );
    expect(briefing.dataset.missionId).toBe("FRONTIER_3");
    expect(briefing.querySelector("h2")?.textContent).toBe("Green Tide");
    expect(document.activeElement?.id).toBe("v7-briefing-title");
    expect(document.querySelector(".v7-briefing-lead-text")?.textContent).toBe(
      "You leadGoblin",
    );
    // The campaign list now shows the Goblin unlocked.
    requiredButton('[data-action="campaign-back"]').click();
    await settle();
    expect(
      [...document.querySelectorAll<HTMLElement>(".v7-campaign-faction")]
        .filter((entry) => entry.dataset.unlocked === "true")
        .map((entry) => entry.dataset.faction),
    ).toEqual(["ORIGINAL", "GOBLIN"]);
    app.destroy();
  }, 60_000);

  it("Campaign from a Victory without an unlock returns to the updated list", async () => {
    const fixture = missionWinFixtureV7("FRONTIER_1");
    window.localStorage.setItem(
      SAVE_STORAGE_KEY_V7,
      missionWonSaveV7(AT, "FRONTIER_1"),
    );
    const next = bootstrapRuleset7App(document);
    await settle();
    const dialog = required(
      document.querySelector<HTMLElement>("[data-v7-region='results']"),
    );
    expect(dialog.querySelector("[data-v7-region='unlock-notice']")).toBeNull();
    expect(
      JSON.parse(
        window.localStorage.getItem(CAMPAIGN_PROGRESS_STORAGE_KEY_V7) ?? "",
      ).completed.FRONTIER_1.bestRounds,
    ).toBe(fixture.after.state.round);
    requiredButton('[data-action="campaign-menu"]').click();
    await waitUntil(() => next.controller.snapshot().phase === "EMPTY");
    await settle();
    expect(document.querySelector("[data-v7-campaign]")).not.toBeNull();
    expect(
      [...document.querySelectorAll<HTMLElement>(".v7-mission-card")].map(
        (card) => card.dataset.status,
      ),
    ).toEqual(["done", "open", "locked", "locked"]);
    next.destroy();
  }, 60_000);

  it("a lost mission records nothing, and Retry restarts the same mission", async () => {
    window.localStorage.setItem(
      SAVE_STORAGE_KEY_V7,
      missionLostSaveV7(AT, "FRONTIER_1"),
    );
    const app = bootstrapRuleset7App(document);
    expect(app.controller.snapshot().phase).toBe("COMPLETE");
    await settle();
    const dialog = required(
      document.querySelector<HTMLElement>("[data-v7-region='results']"),
    );
    expect(dialog.dataset.outcome).toBe("defeat");
    expect(dialog.querySelector("h2")?.textContent).toBe("Mission failed");
    expect(dialog.querySelector("[data-v7-region='unlock-notice']")).toBeNull();
    expect(
      window.localStorage.getItem(CAMPAIGN_PROGRESS_STORAGE_KEY_V7),
    ).toBeNull();
    requiredButton('[data-action="mission-retry"]').click();
    await waitUntil(
      () =>
        app.controller.snapshot().phase === "ACTIVE" &&
        !app.controller.snapshot().transitioning,
    );
    expect(app.controller.snapshot().view).toMatchObject({
      commandIndex: 0,
      setup: { mapType: "MISSION", mission: { id: "FRONTIER_1" } },
    });
    app.destroy();
  });
});
