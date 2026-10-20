import { describe, expect, it, vi } from "vitest";
import type * as CampaignsModule from "../../src/campaign/campaigns";
import type { CampaignIdV7 } from "../../src/campaign/campaigns";
import {
  campaignByIdV7,
  campaignCompletedV7,
  campaignFactionChoicesV7,
  campaignMissionCardsV7,
  campaignMissionV7,
  campaignNewlyOpenedV7,
  campaignPlatesV7,
  type CampaignCompletedV7,
  type CampaignPlateV7,
} from "../../src/campaign/progress-v7";
import { fixtureLastMissionV7 } from "../fixtures/v7-campaign-graph";

// The faction campaigns built from fixture missions (Candy stays unbuilt).
vi.mock("../../src/campaign/campaigns", async (importOriginal) => {
  const original = await importOriginal<typeof CampaignsModule>();
  const { fixtureCampaignsV7 } = await import("../fixtures/v7-campaign-graph");
  return {
    ...original,
    CAMPAIGNS_V7: fixtureCampaignsV7(original.CAMPAIGNS_V7),
  };
});

/**
 * The campaign graph (`pulp_wars-hmyk.3`, docs/product/CAMPAIGN.md section
 * 14.2): Humans and Undead open at the start; the middle four when both
 * are completed; the last three when all four are.
 */
const AT = "2026-10-03T12:00:00.000Z";

function finished(...ids: CampaignIdV7[]): CampaignCompletedV7 {
  return Object.fromEntries(
    ids.map((id) => [
      fixtureLastMissionV7(id),
      { firstWonAt: AT, bestRounds: 10, stars: 1 },
    ]),
  );
}

function statuses(
  completed: CampaignCompletedV7,
  cheat = false,
): Record<string, string> {
  return Object.fromEntries(
    campaignPlatesV7(completed, cheat).map((plate) => [
      plate.campaign.id,
      plate.status,
    ]),
  );
}

const MIDDLE: CampaignIdV7[] = ["DINOSAURS", "MARTIANS", "GOBLINS", "DWARVES"];

function plateOf(
  completed: CampaignCompletedV7,
  id: CampaignIdV7,
): CampaignPlateV7 | undefined {
  return campaignPlatesV7(completed).find((plate) => plate.campaign.id === id);
}

describe("campaign graph", () => {
  it("opens the two openers first and locks the rest behind them", () => {
    expect(statuses({})).toEqual({
      HUMANS: "OPEN",
      UNDEAD: "OPEN",
      DINOSAURS: "LOCKED",
      MARTIANS: "LOCKED",
      GOBLINS: "LOCKED",
      DWARVES: "LOCKED",
      ICE_FOLK: "LOCKED",
      CULT: "LOCKED",
      CANDY: "SOON",
    });
    const dinosaurs = plateOf({}, "DINOSAURS");
    expect(dinosaurs?.waitingFor.map((campaign) => campaign.id)).toEqual([
      "HUMANS",
      "UNDEAD",
    ]);
  });

  it("needs both openers completed, not just one, and only the last mission counts", () => {
    // Humans' first mission alone completes nothing.
    expect(
      statuses({ TEST_GROUNDS: { firstWonAt: AT, bestRounds: 9 } }).HUMANS,
    ).toBe("OPEN");
    const humans = campaignByIdV7("HUMANS");
    if (humans === null) throw new Error("no Humans");
    expect(
      campaignCompletedV7(humans, {
        TEST_GROUNDS: { firstWonAt: AT, bestRounds: 9 },
      }),
    ).toBe(false);
    expect(campaignCompletedV7(humans, finished("HUMANS"))).toBe(true);
    const one = statuses(finished("HUMANS"));
    expect(one.HUMANS).toBe("DONE");
    expect(MIDDLE.map((id) => one[id])).toEqual([
      "LOCKED",
      "LOCKED",
      "LOCKED",
      "LOCKED",
    ]);
    expect(
      plateOf(finished("HUMANS"), "DINOSAURS")?.waitingFor.map(
        (campaign) => campaign.id,
      ),
    ).toEqual(["UNDEAD"]);
    const both = statuses(finished("HUMANS", "UNDEAD"));
    expect(MIDDLE.map((id) => both[id])).toEqual([
      "OPEN",
      "OPEN",
      "OPEN",
      "OPEN",
    ]);
    expect([both.ICE_FOLK, both.CULT, both.CANDY]).toEqual([
      "LOCKED",
      "LOCKED",
      "SOON",
    ]);
  });

  it("opens the last three only when all four of the middle are completed", () => {
    const three = statuses(
      finished("HUMANS", "UNDEAD", "DINOSAURS", "MARTIANS", "GOBLINS"),
    );
    expect([three.ICE_FOLK, three.CULT]).toEqual(["LOCKED", "LOCKED"]);
    const all = statuses(finished("HUMANS", "UNDEAD", ...MIDDLE));
    expect([all.ICE_FOLK, all.CULT, all.CANDY]).toEqual([
      "OPEN",
      "OPEN",
      "SOON",
    ]);
  });

  it("names the campaigns a win opens", () => {
    expect(
      campaignNewlyOpenedV7(finished("HUMANS"), finished("HUMANS", "UNDEAD")),
    ).toEqual(MIDDLE);
    expect(campaignNewlyOpenedV7({}, finished("HUMANS"))).toEqual([]);
  });

  it("with the cheat, opens every built campaign and every mission; Coming soon stays", () => {
    expect(statuses({}, true)).toEqual({
      HUMANS: "OPEN",
      UNDEAD: "OPEN",
      DINOSAURS: "OPEN",
      MARTIANS: "OPEN",
      GOBLINS: "OPEN",
      DWARVES: "OPEN",
      ICE_FOLK: "OPEN",
      CULT: "OPEN",
      CANDY: "SOON",
    });
    const cult = campaignMissionV7("TEST_KILL");
    if (cult === null) throw new Error("no Cult fixture");
    expect(cult.campaign.id).toBe("CULT");
    expect(
      campaignMissionCardsV7(cult.chapter, {}).map((card) => card.status),
    ).toEqual(["OPEN", "LOCKED"]);
    expect(
      campaignMissionCardsV7(cult.chapter, {}, true).map((card) => card.status),
    ).toEqual(["OPEN", "OPEN"]);
    // Progress is still what was won: a won mission stays done.
    expect(
      campaignMissionCardsV7(
        cult.chapter,
        { TEST_KILL: { firstWonAt: AT, bestRounds: 4 } },
        true,
      ).map((card) => card.status),
    ).toEqual(["DONE", "OPEN"]);
  });

  it("counts a campaign's missions and stars on its plate", () => {
    const humans = plateOf(
      { TEST_GROUNDS: { firstWonAt: AT, bestRounds: 9, stars: 1 } },
      "HUMANS",
    );
    expect(humans).toMatchObject({
      status: "OPEN",
      missionsWon: 1,
      missionCount: 2,
      stars: 1,
    });
  });

  it("offers a mission's whole faction choice: no faction is locked", () => {
    // TEST_GROUNDS offers Human or Goblin to seat 0; a fixed seat offers
    // its one faction; an unknown mission offers none (pulp_wars-hmyk.22).
    expect(campaignFactionChoicesV7("TEST_GROUNDS")).toEqual([
      "ORIGINAL",
      "GOBLIN",
    ]);
    expect(campaignFactionChoicesV7("TEST_RUSH")).toHaveLength(1);
    expect(campaignFactionChoicesV7("FRONTIER_4")).toEqual([]);
  });

  it("ignores the retired prologue's stored wins", () => {
    // pulp_wars-hmyk.22: Frontier progress is kept in storage and changes
    // nothing on the map, whatever was won there.
    const frontier: CampaignCompletedV7 = Object.fromEntries(
      Array.from({ length: 10 }, (_, index) => [
        `FRONTIER_${String(index + 1)}`,
        { firstWonAt: AT, bestRounds: 12, stars: 3 },
      ]),
    );
    expect(statuses(frontier)).toEqual(statuses({}));
    expect(
      campaignPlatesV7(frontier).map((plate) => plate.campaign.id),
    ).toEqual(campaignPlatesV7({}).map((plate) => plate.campaign.id));
    expect(campaignMissionV7("FRONTIER_1")).toBeNull();
    expect(campaignByIdV7("FRONTIER")).toBeNull();
  });
});
