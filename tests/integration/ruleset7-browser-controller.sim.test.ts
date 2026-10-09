// Whole-game simulations split out of
// ruleset7-browser-controller.test.ts (`pulp_wars-bwry`): they
// play AI matches, so they run only in `npm run test:sim`.

import { describe, expect, it } from "vitest";
import { Ruleset7BrowserController } from "../../src/app/index";
import {
  CAMPAIGN_PROGRESS_STORAGE_KEY_V7,
  SAVE_STORAGE_KEY_V7,
  createSaveEnvelopeV7,
  type StorageAdapter,
} from "../../src/persistence/index";
import { missionWinFixtureV7 } from "../fixtures/v7-campaign-ui";
import {
  immediateEndTurnWork,
  MemoryStorage,
} from "./ruleset7-browser-controller.shared";

/**
 * Campaign progress (`pulp_wars-68k.5`, docs/product/CAMPAIGN.md sections
 * 4.1 and 7.2): the controller records a chapter mission's win before any
 * subscriber (and so the Victory dialog) sees the outcome, and again when a
 * completed mission save is resumed.
 */
describe("Ruleset 7 browser controller campaign progress", () => {
  const savedAt = "2026-10-03T12:00:00.000Z";

  it("records a mission win before the Victory snapshot, with its unlocks", async () => {
    const fixture = missionWinFixtureV7("FRONTIER_1");
    const storage = new MemoryStorage();
    storage.setItem(
      SAVE_STORAGE_KEY_V7,
      JSON.stringify(createSaveEnvelopeV7(fixture.before, savedAt)),
    );
    const controller = new Ruleset7BrowserController({
      storage,
      persistenceNow: () => savedAt,
      createAiPolicyWork: immediateEndTurnWork,
    });
    expect(controller.snapshot().phase).toBe("RESUMABLE");
    expect(controller.campaignProgress()).toMatchObject({
      status: "OK",
      completed: {},
      lastWin: null,
    });
    expect(await controller.resume()).toBe(true);
    const seenAtVictory: (string | null)[] = [];
    controller.subscribe((snapshot) => {
      if (snapshot.view?.outcome?.kind === "VICTORY")
        seenAtVictory.push(storage.getItem(CAMPAIGN_PROGRESS_STORAGE_KEY_V7));
    });
    const result = await controller.dispatch(fixture.winningCommand);
    expect(result.accepted).toBe(true);
    expect(controller.snapshot().phase).toBe("COMPLETE");
    expect(seenAtVictory.length).toBeGreaterThan(0);
    expect(seenAtVictory.every((entry) => entry !== null)).toBe(true);
    const rounds = fixture.after.state.round;
    expect(
      JSON.parse(storage.getItem(CAMPAIGN_PROGRESS_STORAGE_KEY_V7) ?? ""),
    ).toEqual({
      format: "pulp-wars-campaign-progress",
      version: 1,
      completed: { FRONTIER_1: { firstWonAt: savedAt, bestRounds: rounds } },
    });
    // Mission 1 unlocks nothing; the win is reported for the dialog.
    expect(controller.campaignProgress()).toMatchObject({
      status: "OK",
      completed: { FRONTIER_1: { bestRounds: rounds } },
      lastWin: { missionId: "FRONTIER_1", firstWin: true, unlocked: [] },
    });
    controller.destroy();
  }, 60_000);

  it("records again when a completed mission save is resumed, keeping the first win and the best rounds", () => {
    const fixture = missionWinFixtureV7("FRONTIER_1");
    const rounds = fixture.after.state.round;
    const storage = new MemoryStorage();
    storage.setItem(
      SAVE_STORAGE_KEY_V7,
      JSON.stringify(createSaveEnvelopeV7(fixture.after, savedAt)),
    );
    const first = new Ruleset7BrowserController({
      storage,
      persistenceNow: () => "2026-10-04T08:00:00.000Z",
    });
    expect(first.snapshot().phase).toBe("COMPLETE");
    expect(first.campaignProgress()).toMatchObject({
      completed: {
        FRONTIER_1: {
          firstWonAt: "2026-10-04T08:00:00.000Z",
          bestRounds: rounds,
        },
      },
      lastWin: { missionId: "FRONTIER_1", firstWin: true },
    });
    first.destroy();
    // A better earlier record is kept; reloading the dialog is idempotent.
    storage.setItem(
      CAMPAIGN_PROGRESS_STORAGE_KEY_V7,
      JSON.stringify({
        format: "pulp-wars-campaign-progress",
        version: 1,
        completed: {
          FRONTIER_1: { firstWonAt: savedAt, bestRounds: rounds - 3 },
          REMOVED_MISSION: { firstWonAt: savedAt, bestRounds: 9 },
        },
      }),
    );
    const second = new Ruleset7BrowserController({ storage });
    expect(second.campaignProgress()).toMatchObject({
      completed: {
        FRONTIER_1: { firstWonAt: savedAt, bestRounds: rounds - 3 },
        REMOVED_MISSION: { bestRounds: 9 },
      },
      lastWin: { missionId: "FRONTIER_1", firstWin: false, unlocked: [] },
    });
    second.destroy();
  }, 60_000);

  it("records nothing while progress is unreadable, and reset clears it", () => {
    const fixture = missionWinFixtureV7("FRONTIER_1");
    const storage = new MemoryStorage();
    storage.setItem(CAMPAIGN_PROGRESS_STORAGE_KEY_V7, "{ not json");
    storage.setItem(
      SAVE_STORAGE_KEY_V7,
      JSON.stringify(createSaveEnvelopeV7(fixture.after, savedAt)),
    );
    const controller = new Ruleset7BrowserController({ storage });
    expect(controller.snapshot().phase).toBe("COMPLETE");
    expect(storage.getItem(CAMPAIGN_PROGRESS_STORAGE_KEY_V7)).toBe(
      "{ not json",
    );
    expect(controller.campaignProgress()).toMatchObject({
      status: "UNREADABLE",
      completed: {},
      lastWin: null,
    });
    expect(controller.resetCampaignProgress()).toBe(true);
    expect(storage.getItem(CAMPAIGN_PROGRESS_STORAGE_KEY_V7)).toBeNull();
    expect(controller.campaignProgress()).toMatchObject({
      status: "OK",
      completed: {},
    });
    controller.destroy();
  }, 60_000);

  it("survives restricted storage: progress reads fail without breaking the match", () => {
    const fixture = missionWinFixtureV7("FRONTIER_1");
    const save = JSON.stringify(createSaveEnvelopeV7(fixture.after, savedAt));
    const storage: StorageAdapter = {
      getItem: (key) => {
        if (key === CAMPAIGN_PROGRESS_STORAGE_KEY_V7) throw new Error("denied");
        return key === SAVE_STORAGE_KEY_V7 ? save : null;
      },
      setItem: () => {
        throw new Error("denied");
      },
      removeItem: () => {
        throw new Error("denied");
      },
    };
    const controller = new Ruleset7BrowserController({ storage });
    expect(controller.snapshot().phase).toBe("COMPLETE");
    expect(controller.campaignProgress().status).toBe("UNREADABLE");
    expect(controller.resetCampaignProgress()).toBe(false);
    controller.destroy();
  }, 60_000);
});
