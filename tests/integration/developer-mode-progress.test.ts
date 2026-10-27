// Developer mode keeps mission wins out of the campaign progress
// (`pulp_wars-5xki`, docs/product/CAMPAIGN.md section 25): a completed
// mission save resumed by a controller in developer mode records nothing,
// the same save resumed in the normal game records its win. No match is
// played: the stored match is a launched mission marked won by hand.
import { describe, expect, it } from "vitest";
import { Ruleset7BrowserController } from "../../src/app/index";
import {
  canonicalHash,
  missionByIdV7,
  missionMatchSetupV7,
} from "../../src/engine/index";
import {
  SAVE_STORAGE_KEY_V7,
  type SaveEnvelopeV7,
} from "../../src/persistence/index";
import { MemoryStorage } from "./ruleset7-browser-controller.shared";

/** A stored HUMAN_1 save whose human has just won. */
async function wonMissionSave(): Promise<MemoryStorage> {
  const storage = new MemoryStorage();
  const controller = new Ruleset7BrowserController({ storage });
  const mission = missionByIdV7("HUMAN_1");
  if (mission === null) throw new Error("no HUMAN_1");
  const setup = missionMatchSetupV7(mission, "ORIGINAL");
  if (setup === null) throw new Error("no setup");
  const launched = await controller.launch(setup);
  if (!launched.ok) throw new Error(launched.diagnostic);
  controller.flushPersistence();
  controller.destroy();
  const source = storage.getItem(SAVE_STORAGE_KEY_V7);
  if (source === null) throw new Error("no save");
  const save = JSON.parse(source) as SaveEnvelopeV7;
  const state = {
    ...save.state,
    outcome: {
      kind: "VICTORY" as const,
      winnerId: save.state.humanPlayerId,
      cause: "PLACES_CAPTURED" as const,
    },
  };
  storage.setItem(
    SAVE_STORAGE_KEY_V7,
    JSON.stringify({ ...save, state, stateHash: canonicalHash(state) }),
  );
  return storage;
}

describe("developer mode and campaign progress", () => {
  it("does not record a mission won in developer mode; the normal game does", async () => {
    const dev = await wonMissionSave();
    const inDev = new Ruleset7BrowserController({
      storage: dev,
      developerMode: true,
    });
    expect(inDev.snapshot().phase).toBe("COMPLETE");
    expect(inDev.campaignProgress().completed).toEqual({});
    expect(inDev.campaignProgress().lastWin).toBeNull();
    inDev.destroy();

    const normal = await wonMissionSave();
    const inNormal = new Ruleset7BrowserController({ storage: normal });
    expect(inNormal.snapshot().phase).toBe("COMPLETE");
    expect(Object.keys(inNormal.campaignProgress().completed)).toEqual([
      "HUMAN_1",
    ]);
    inNormal.destroy();
  });
});
