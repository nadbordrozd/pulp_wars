import { describe, expect, it } from "vitest";
import { CAMPAIGNS_V7 } from "../../src/campaign/campaigns";
import {
  FACTION_UNLOCK_CAMPAIGNS_V7,
  completedCampaignCountV7,
  factionLockTextV7,
  factionLockV7,
  factionsNewlyUnlockedV7,
  unlockedFactionV7,
} from "../../src/campaign/faction-locks-v7";
import {
  campaignBuiltV7,
  type CampaignCompletedV7,
} from "../../src/campaign/progress-v7";
import type { FactionIdV7 } from "../../src/engine/index";

/**
 * Faction locks (`pulp_wars-5xki`, docs/product/CAMPAIGN.md section 25):
 * Ice Folk after any 4 completed campaigns, Candy after any 5, the
 * Cultists after any 6; never in developer mode.
 */
const AT = "2026-10-27T12:00:00.000Z";

/** The first `count` campaigns completed (their last mission won). */
function completedCampaigns(count: number, easy = false): CampaignCompletedV7 {
  const built = CAMPAIGNS_V7.filter(campaignBuiltV7);
  expect(built.length).toBeGreaterThanOrEqual(count);
  return Object.fromEntries(
    built
      .slice(0, count)
      .map((campaign) => [
        campaign.chapter?.missions.at(-1)?.missionId ?? "",
        { firstWonAt: AT, bestRounds: 12, stars: 1, ...(easy ? { easy } : {}) },
      ]),
  );
}

const LOCKED: readonly FactionIdV7[] = ["ICE_FOLK", "CANDY", "CULT"];

function lockedAt(completed: CampaignCompletedV7): FactionIdV7[] {
  return LOCKED.filter((faction) => factionLockV7(faction, completed) !== null);
}

describe("faction locks", () => {
  it("lock Ice Folk until 4 campaigns, Candy until 5, the Cultists until 6", () => {
    expect(FACTION_UNLOCK_CAMPAIGNS_V7).toEqual({
      ICE_FOLK: 4,
      CANDY: 5,
      CULT: 6,
    });
    expect(lockedAt({})).toEqual(["ICE_FOLK", "CANDY", "CULT"]);
    expect(lockedAt(completedCampaigns(3))).toEqual([
      "ICE_FOLK",
      "CANDY",
      "CULT",
    ]);
    expect(lockedAt(completedCampaigns(4))).toEqual(["CANDY", "CULT"]);
    expect(lockedAt(completedCampaigns(5))).toEqual(["CULT"]);
    expect(lockedAt(completedCampaigns(6))).toEqual([]);
    // The other six factions are never locked.
    for (const faction of [
      "ORIGINAL",
      "UNDEAD",
      "GOBLIN",
      "DINOSAUR",
      "MARTIAN",
      "DWARF",
    ] as const)
      expect(factionLockV7(faction, {}), faction).toBeNull();
  });

  it("count a campaign completed when its last mission is won, on Easy too", () => {
    expect(completedCampaignCountV7(completedCampaigns(4, true))).toBe(4);
    expect(lockedAt(completedCampaigns(4, true))).toEqual(["CANDY", "CULT"]);
    // Every mission but the last of a campaign does not complete it.
    const humans = CAMPAIGNS_V7[0]?.chapter?.missions ?? [];
    const partial = Object.fromEntries(
      humans
        .slice(0, -1)
        .map((entry) => [entry.missionId, { firstWonAt: AT, bestRounds: 9 }]),
    );
    expect(completedCampaignCountV7(partial)).toBe(0);
  });

  it("say how to unlock, with the count so far", () => {
    const text = (
      faction: FactionIdV7,
      completed: CampaignCompletedV7,
    ): string => {
      const lock = factionLockV7(faction, completed);
      if (lock === null) throw new Error(`${faction} is not locked`);
      return factionLockTextV7(lock);
    };
    const three = completedCampaigns(3);
    expect(text("ICE_FOLK", three)).toBe(
      "Complete any 4 campaigns to unlock (3/4)",
    );
    expect(text("CANDY", three)).toBe(
      "Complete any 5 campaigns to unlock (3/5)",
    );
    expect(text("CULT", three)).toBe(
      "Complete any 6 campaigns to unlock (3/6)",
    );
    expect(text("CULT", completedCampaigns(5))).toBe(
      "Complete any 6 campaigns to unlock (5/6)",
    );
  });

  it("lock nothing in developer mode", () => {
    for (const faction of LOCKED)
      expect(factionLockV7(faction, {}, true)).toBeNull();
    expect(unlockedFactionV7("CULT", ["ORIGINAL", "CULT"], {}, true)).toBe(
      "CULT",
    );
  });

  it("name the factions a win unlocked", () => {
    expect(
      factionsNewlyUnlockedV7(completedCampaigns(3), completedCampaigns(4)),
    ).toEqual(["ICE_FOLK"]);
    expect(
      factionsNewlyUnlockedV7(completedCampaigns(5), completedCampaigns(6)),
    ).toEqual(["CULT"]);
    expect(
      factionsNewlyUnlockedV7(completedCampaigns(4), completedCampaigns(4)),
    ).toEqual([]);
    expect(factionsNewlyUnlockedV7({}, completedCampaigns(6))).toEqual([
      "ICE_FOLK",
      "CANDY",
      "CULT",
    ]);
  });

  it("swap a locked pick for the first open faction", () => {
    expect(
      unlockedFactionV7("CULT", ["ICE_FOLK", "ORIGINAL", "UNDEAD"], {}),
    ).toBe("ORIGINAL");
    expect(unlockedFactionV7("GOBLIN", ["ORIGINAL"], {})).toBe("GOBLIN");
  });
});
