// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";
import { bootstrapRuleset7App } from "../../src/app/index";
import { CAMPAIGN_DIFFICULTY_STORAGE_KEY_V7 } from "../../src/app/quick-start-preference-v7";
import {
  required,
  requiredButton,
  seedProgress,
  settle,
  waitUntil,
  won,
} from "./ruleset7-campaign-dom.shared";

/**
 * Easy mode on the campaign screens (`pulp_wars-q6cc`): the briefing's
 * Normal / Easy choice, remembered per browser, carried by the launched
 * mission setup (so Retry mission keeps it), and the "Easy" tag of a
 * mission only ever won on Easy. Matches are created and never played.
 */
beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  window.localStorage.clear();
});

async function openBriefing(missionId = "human_1"): Promise<void> {
  requiredButton('[data-action="campaign"]').click();
  await settle();
  requiredButton('[data-action="campaign-open-humans"]').click();
  await settle();
  requiredButton(`[data-action="mission-${missionId}"]`).click();
  await settle();
}

const pressedLevel = (): string[] =>
  [
    ...document.querySelectorAll<HTMLButtonElement>(
      '.v7-briefing-difficulty .v7-picker-segment[aria-pressed="true"]',
    ),
  ].map((node) => node.value);

describe("Easy mode in the campaign", () => {
  it("offers Normal and Easy on the briefing, remembers the choice, and launches and retries the mission on Easy", async () => {
    const app = bootstrapRuleset7App(document);
    await openBriefing();
    expect(
      [
        ...document.querySelectorAll(
          ".v7-briefing-difficulty .v7-picker-segment",
        ),
      ].map((node) => node.textContent),
    ).toEqual(["Normal", "Easy"]);
    expect(pressedLevel()).toEqual(["NORMAL"]);
    const note = (): string =>
      required(
        document.querySelector("[data-v7-region='campaign-difficulty-note']"),
      ).textContent;
    expect(note()).toBe("The AI plays its best, with no head start.");
    requiredButton('[data-action="campaign-difficulty-easy"]').click();
    await settle();
    expect(pressedLevel()).toEqual(["EASY"]);
    expect(note()).toBe("The AI is cautious and makes the odd mistake.");
    expect(
      window.localStorage.getItem(CAMPAIGN_DIFFICULTY_STORAGE_KEY_V7),
    ).toBe("EASY");
    requiredButton('[data-action="campaign-start"]').click();
    const active = (): boolean =>
      app.controller.snapshot().phase === "ACTIVE" &&
      !app.controller.snapshot().transitioning;
    await waitUntil(active);
    expect(required(app.controller.snapshot().view).setup).toMatchObject({
      mapType: "MISSION",
      mission: { id: "HUMAN_1" },
      aiDifficulty: "EASY",
    });
    // Retry mission restarts the same setup: still Easy.
    const restarted = await app.controller.restart();
    expect(restarted.ok).toBe(true);
    await waitUntil(active);
    expect(required(app.controller.snapshot().view).setup.aiDifficulty).toBe(
      "EASY",
    );
    app.destroy();
    // The next visit's briefing opens on Easy.
    document.body.innerHTML = '<div id="app"></div>';
    const again = bootstrapRuleset7App(document);
    await openBriefing();
    expect(pressedLevel()).toEqual(["EASY"]);
    requiredButton('[data-action="campaign-difficulty-normal"]').click();
    await settle();
    expect(
      window.localStorage.getItem(CAMPAIGN_DIFFICULTY_STORAGE_KEY_V7),
    ).toBe("NORMAL");
    again.destroy();
  });

  it("tags a mission only ever won on Easy, and only that one", async () => {
    seedProgress({
      HUMAN_1: { ...won(9), stars: 2, easy: true },
      HUMAN_2: { ...won(14), stars: 1 },
    });
    const app = bootstrapRuleset7App(document);
    requiredButton('[data-action="campaign"]').click();
    await settle();
    requiredButton('[data-action="campaign-open-humans"]').click();
    await settle();
    const card = (id: string): HTMLElement =>
      requiredButton(`[data-action="mission-${id}"]`);
    expect(card("human_1").querySelector(".v7-easy-tag")?.textContent).toBe(
      "Easy",
    );
    expect(card("human_1").getAttribute("aria-label")).toContain("won on Easy");
    expect(card("human_2").querySelector(".v7-easy-tag")).toBeNull();
    expect(card("human_2").getAttribute("aria-label")).not.toContain("Easy");
    app.destroy();
  });
});
