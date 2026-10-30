// Developer mode and the campaign progress (`pulp_wars-5xki`,
// `pulp_wars-6o5t`; docs/product/CAMPAIGN.md section 25.1): a mission won in
// developer mode is recorded only when the normal game had it open too (its
// campaign open by the campaign graph, the mission first or after a won
// one); a win of a mission only developer mode opened records nothing, so
// testing never shortcuts the campaign graph or the faction locks. No match
// is played: the stored match is a launched mission marked won by hand.
import { describe, expect, it } from "vitest";
import { Ruleset7BrowserController } from "../../src/app/index";
import { campaignMissionOpenNormallyV7 } from "../../src/campaign/progress-v7";
import {
  canonicalHash,
  missionByIdV7,
  missionMatchSetupV7,
  missionSeatFactionsV7,
} from "../../src/engine/index";
import {
  CAMPAIGN_PROGRESS_STORAGE_KEY_V7,
  SAVE_STORAGE_KEY_V7,
  type SaveEnvelopeV7,
} from "../../src/persistence/index";
import { MemoryStorage } from "./ruleset7-browser-controller.shared";

const AT = "2026-10-03T12:00:00.000Z";
const won = () => ({ firstWonAt: AT, bestRounds: 12 });

/** Progress of version 2 with these campaigns' completed missions. */
function progress(
  campaigns: Record<string, readonly string[]>,
): Record<string, { firstWonAt: string; bestRounds: number }> {
  return Object.fromEntries(
    Object.values(campaigns)
      .flat()
      .map((id) => [id, won()]),
  );
}

function seedProgress(
  storage: MemoryStorage,
  campaigns: Record<string, readonly string[]>,
): void {
  storage.setItem(
    CAMPAIGN_PROGRESS_STORAGE_KEY_V7,
    JSON.stringify({
      format: "pulp-wars-campaign-progress",
      version: 2,
      campaigns: Object.fromEntries(
        Object.entries(campaigns).map(([id, missions]) => [
          id,
          {
            completed: Object.fromEntries(missions.map((m) => [m, won()])),
          },
        ]),
      ),
    }),
  );
}

/** A stored save of `missionId` whose human has just won. */
async function wonMissionSave(
  missionId: string,
  campaigns: Record<string, readonly string[]> = {},
): Promise<MemoryStorage> {
  const storage = new MemoryStorage();
  seedProgress(storage, campaigns);
  const controller = new Ruleset7BrowserController({ storage });
  const mission = missionByIdV7(missionId);
  if (mission === null) throw new Error(`no ${missionId}`);
  const faction = missionSeatFactionsV7(mission.seats[0] as never)[0];
  const setup = missionMatchSetupV7(mission, faction);
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

function resumed(storage: MemoryStorage, developerMode: boolean) {
  const controller = new Ruleset7BrowserController({ storage, developerMode });
  expect(controller.snapshot().phase).toBe("COMPLETE");
  const result = controller.campaignProgress();
  controller.destroy();
  return result;
}

const OPENERS = { HUMANS: ["HUMAN_6"], UNDEAD: ["UNDEAD_6"] } as const;
const GOBLINS_1_TO_5 = [
  "GOBLIN_1",
  "GOBLIN_2",
  "GOBLIN_3",
  "GOBLIN_4",
  "GOBLIN_5",
] as const;

describe("a mission open in the normal game", () => {
  it("is mission 1 of an open campaign, or follows a won mission", () => {
    expect(campaignMissionOpenNormallyV7("HUMAN_1", {})).toBe(true);
    expect(campaignMissionOpenNormallyV7("HUMAN_2", {})).toBe(false);
    expect(
      campaignMissionOpenNormallyV7("HUMAN_2", progress({ H: ["HUMAN_1"] })),
    ).toBe(true);
    // A won mission stays open: winning it again may only raise its stars.
    expect(
      campaignMissionOpenNormallyV7("HUMAN_1", progress({ H: ["HUMAN_1"] })),
    ).toBe(true);
  });

  it("needs its campaign open by the graph", () => {
    // The Goblins open once the Humans and the Undead are both completed.
    const goblinsDone = progress({ GOBLINS: GOBLINS_1_TO_5 });
    expect(campaignMissionOpenNormallyV7("GOBLIN_1", {})).toBe(false);
    expect(campaignMissionOpenNormallyV7("GOBLIN_6", goblinsDone)).toBe(false);
    expect(
      campaignMissionOpenNormallyV7(
        "GOBLIN_6",
        progress({ HUMANS: ["HUMAN_6"], GOBLINS: GOBLINS_1_TO_5 }),
      ),
    ).toBe(false);
    expect(
      campaignMissionOpenNormallyV7(
        "GOBLIN_6",
        progress({ ...OPENERS, GOBLINS: GOBLINS_1_TO_5 }),
      ),
    ).toBe(true);
    expect(
      campaignMissionOpenNormallyV7(
        "GOBLIN_6",
        progress({ ...OPENERS, GOBLINS: GOBLINS_1_TO_5.slice(0, 4) }),
      ),
    ).toBe(false);
  });

  it("is never a mission in no chapter", () => {
    expect(campaignMissionOpenNormallyV7("TEST_GROUNDS", {})).toBe(false);
  });
});

describe("developer mode and campaign progress", () => {
  it("records a dev-mode win of a mission the normal game had open", async () => {
    const dev = resumed(await wonMissionSave("HUMAN_1"), true);
    expect(Object.keys(dev.completed)).toEqual(["HUMAN_1"]);
    expect(dev.lastWin).toMatchObject({ missionId: "HUMAN_1" });
    const normal = resumed(await wonMissionSave("HUMAN_1"), false);
    expect(Object.keys(normal.completed)).toEqual(["HUMAN_1"]);
  });

  it("records GOBLIN_6 in developer mode after the openers and missions 1 to 5", async () => {
    const storage = await wonMissionSave("GOBLIN_6", {
      ...OPENERS,
      GOBLINS: GOBLINS_1_TO_5,
    });
    const dev = resumed(storage, true);
    expect(dev.completed.GOBLIN_6).toMatchObject({ stars: expect.any(Number) });
    expect(dev.lastWin).toMatchObject({ missionId: "GOBLIN_6" });
  });

  it("does not record a win of a mission only developer mode opened", async () => {
    // The Goblin campaign is still locked: the Humans and Undead are not won.
    const locked = await wonMissionSave("GOBLIN_6", {
      GOBLINS: GOBLINS_1_TO_5,
    });
    const dev = resumed(locked, true);
    expect(dev.completed.GOBLIN_6).toBeUndefined();
    expect(dev.lastWin).toBeNull();
    // The previous mission is not won.
    const skipped = await wonMissionSave("HUMAN_3", { HUMANS: ["HUMAN_1"] });
    const devSkipped = resumed(skipped, true);
    expect(Object.keys(devSkipped.completed)).toEqual(["HUMAN_1"]);
    expect(devSkipped.lastWin).toBeNull();
    // The same save in the normal game records it: the rule is dev mode's.
    const normal = resumed(
      await wonMissionSave("HUMAN_3", { HUMANS: ["HUMAN_1"] }),
      false,
    );
    expect(Object.keys(normal.completed)).toEqual(["HUMAN_1", "HUMAN_3"]);
  });
});
