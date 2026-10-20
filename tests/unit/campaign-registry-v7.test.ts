import { describe, expect, it } from "vitest";
import {
  CAMPAIGNS_V7,
  CAMPAIGN_IDS_V7,
  type CampaignIdV7,
} from "../../src/campaign/campaigns";
import { CHAPTER_CANDY_V7 } from "../../src/campaign/chapter-candy";
import { CHAPTER_CULT_V7 } from "../../src/campaign/chapter-cult";
import { CHAPTER_DINOSAURS_V7 } from "../../src/campaign/chapter-dinosaurs";
import { CHAPTER_DWARVES_V7 } from "../../src/campaign/chapter-dwarves";
import { CHAPTER_GOBLINS_V7 } from "../../src/campaign/chapter-goblins";
import { CHAPTER_HUMANS_V7 } from "../../src/campaign/chapter-humans";
import { CHAPTER_ICE_FOLK_V7 } from "../../src/campaign/chapter-ice-folk";
import { CHAPTER_MARTIANS_V7 } from "../../src/campaign/chapter-martians";
import { CHAPTER_UNDEAD_V7 } from "../../src/campaign/chapter-undead";
import {
  CAMPAIGN_CHEAT_STORAGE_KEY_V7,
  CampaignCheatGestureV7,
  campaignCheatFromSearchV7,
  loadCampaignCheatV7,
  saveCampaignCheatV7,
} from "../../src/campaign/cheat-v7";
import {
  CAMPAIGN_CHAPTERS_V7,
  campaignByIdV7,
  campaignMissionV7,
  campaignPlatesV7,
} from "../../src/campaign/progress-v7";
import { missionByIdV7 } from "../../src/engine/index";
import type { StorageAdapter } from "../../src/persistence/index";

/**
 * The campaign registry and the testing cheat (`pulp_wars-hmyk.3`,
 * docs/product/CAMPAIGN.md section 14). The graph with built campaigns is
 * in campaign-graph-v7.test.ts.
 */
describe("campaign registry", () => {
  it("lists the nine faction campaigns in three tiers", () => {
    expect(CAMPAIGNS_V7.map((campaign) => campaign.id)).toEqual([
      ...CAMPAIGN_IDS_V7,
    ]);
    const tier = (n: number): CampaignIdV7[] =>
      CAMPAIGNS_V7.filter((campaign) => campaign.tier === n).map(
        (campaign) => campaign.id,
      );
    expect(tier(1)).toEqual(["HUMANS", "UNDEAD"]);
    expect(tier(2)).toEqual(["DINOSAURS", "MARTIANS", "GOBLINS", "DWARVES"]);
    expect(tier(3)).toEqual(["ICE_FOLK", "CULT", "CANDY"]);
    for (const campaign of CAMPAIGNS_V7)
      expect([...campaign.prerequisites], campaign.id).toEqual(
        campaign.tier === 1 ? [] : campaign.tier === 2 ? tier(1) : tier(2),
      );
    expect(new Set(CAMPAIGNS_V7.map((campaign) => campaign.faction)).size).toBe(
      9,
    );
    expect(Object.isFrozen(CAMPAIGNS_V7)).toBe(true);
  });

  it("retires the prologue: no Frontier campaign, chapter, mission or picture", () => {
    // pulp_wars-hmyk.22: "drop the original campaign we designed".
    expect(CAMPAIGNS_V7).toHaveLength(9);
    expect(CAMPAIGN_IDS_V7).not.toContain("FRONTIER");
    expect(campaignByIdV7("FRONTIER")).toBeNull();
    for (let number = 1; number <= 10; number += 1) {
      const id = `FRONTIER_${String(number)}`;
      expect(campaignMissionV7(id), id).toBeNull();
      expect(missionByIdV7(id), id).toBeNull();
    }
    expect(
      CAMPAIGNS_V7.map((campaign) => campaign.picture).filter(
        (picture) => picture === "campaign-frontier",
      ),
    ).toEqual([]);
  });

  it("gives every campaign its six-mission chapter, the Humans first", () => {
    expect(CAMPAIGN_CHAPTERS_V7).toEqual([
      CHAPTER_HUMANS_V7,
      CHAPTER_UNDEAD_V7,
      CHAPTER_DINOSAURS_V7,
      CHAPTER_MARTIANS_V7,
      CHAPTER_GOBLINS_V7,
      CHAPTER_DWARVES_V7,
      CHAPTER_ICE_FOLK_V7,
      CHAPTER_CULT_V7,
      CHAPTER_CANDY_V7,
    ]);
    const humans = campaignByIdV7("HUMANS");
    expect(humans?.chapter).toBe(CHAPTER_HUMANS_V7);
    expect(humans?.title).toBe("The Marshal's Law");
    expect(campaignMissionV7("HUMAN_6")).toMatchObject({
      campaign: { id: "HUMANS" },
      chapter: CHAPTER_HUMANS_V7,
      entry: { number: 6 },
    });
    const undead = campaignByIdV7("UNDEAD");
    expect(undead?.chapter).toBe(CHAPTER_UNDEAD_V7);
    expect(undead?.title).toBe("The Long Sleep");
    expect(campaignMissionV7("UNDEAD_6")).toMatchObject({
      campaign: { id: "UNDEAD" },
      chapter: CHAPTER_UNDEAD_V7,
      entry: { number: 6 },
    });
    const dinosaurs = campaignByIdV7("DINOSAURS");
    expect(dinosaurs?.chapter).toBe(CHAPTER_DINOSAURS_V7);
    expect(dinosaurs?.title).toBe("The Egg Thief");
    expect(campaignMissionV7("DINOSAUR_6")).toMatchObject({
      campaign: { id: "DINOSAURS" },
      chapter: CHAPTER_DINOSAURS_V7,
      entry: { number: 6 },
    });
    const martians = campaignByIdV7("MARTIANS");
    expect(martians?.chapter).toBe(CHAPTER_MARTIANS_V7);
    expect(martians?.title).toBe("Signal from Home");
    expect(campaignMissionV7("MARTIAN_6")).toMatchObject({
      campaign: { id: "MARTIANS" },
      chapter: CHAPTER_MARTIANS_V7,
      entry: { number: 6 },
    });
    const goblins = campaignByIdV7("GOBLINS");
    expect(goblins?.chapter).toBe(CHAPTER_GOBLINS_V7);
    expect(goblins?.title).toBe("The Big Score");
    expect(campaignMissionV7("GOBLIN_6")).toMatchObject({
      campaign: { id: "GOBLINS" },
      chapter: CHAPTER_GOBLINS_V7,
      entry: { number: 6 },
    });
    const dwarves = campaignByIdV7("DWARVES");
    expect(dwarves?.chapter).toBe(CHAPTER_DWARVES_V7);
    expect(dwarves?.title).toBe("The Bottomless");
    expect(campaignMissionV7("DWARF_6")).toMatchObject({
      campaign: { id: "DWARVES" },
      chapter: CHAPTER_DWARVES_V7,
      entry: { number: 6 },
    });
    const iceFolk = campaignByIdV7("ICE_FOLK");
    expect(iceFolk?.chapter).toBe(CHAPTER_ICE_FOLK_V7);
    expect(iceFolk?.title).toBe("The Long Winter");
    expect(campaignMissionV7("ICE_FOLK_6")).toMatchObject({
      campaign: { id: "ICE_FOLK" },
      chapter: CHAPTER_ICE_FOLK_V7,
      entry: { number: 6 },
    });
    const cult = campaignByIdV7("CULT");
    expect(cult?.chapter).toBe(CHAPTER_CULT_V7);
    expect(cult?.title).toBe("The Long Night");
    expect(cult?.subtitle).toBe("The finale");
    expect(campaignMissionV7("CULT_6")).toMatchObject({
      campaign: { id: "CULT" },
      chapter: CHAPTER_CULT_V7,
      entry: { number: 6 },
    });
    const candy = campaignByIdV7("CANDY");
    expect(candy?.chapter).toBe(CHAPTER_CANDY_V7);
    expect(candy?.title).toBe("Sweet Dreams");
    expect(campaignMissionV7("CANDY_6")).toMatchObject({
      campaign: { id: "CANDY" },
      chapter: CHAPTER_CANDY_V7,
      entry: { number: 6 },
    });
    expect(campaignByIdV7("NOWHERE")).toBeNull();
  });

  it("shows the openers open, and every other campaign locked until the cheat", () => {
    for (const cheat of [false, true]) {
      const plates = campaignPlatesV7({}, cheat);
      expect(plates.map((plate) => [plate.campaign.id, plate.status])).toEqual([
        // The Humans campaign (`pulp_wars-hmyk.4`): tier 1, open from the
        // start.
        ["HUMANS", "OPEN"],
        // The Undead campaign (`pulp_wars-hmyk.5`): tier 1, open from the
        // start.
        ["UNDEAD", "OPEN"],
        // The Dinosaur campaign (`pulp_wars-hmyk.6`): tier 2, locked until
        // the Humans and the Undead are finished; the cheat opens it.
        ["DINOSAURS", cheat ? "OPEN" : "LOCKED"],
        // The Martian campaign (`pulp_wars-hmyk.7`): tier 2, locked the
        // same way.
        ["MARTIANS", cheat ? "OPEN" : "LOCKED"],
        // The Goblin campaign (`pulp_wars-hmyk.8`): tier 2, locked the
        // same way.
        ["GOBLINS", cheat ? "OPEN" : "LOCKED"],
        // The Dwarf campaign (`pulp_wars-hmyk.9`): tier 2, locked the
        // same way.
        ["DWARVES", cheat ? "OPEN" : "LOCKED"],
        // The Ice Folk campaign (`pulp_wars-hmyk.10`): tier 3, locked
        // until the four middle campaigns are finished; the cheat opens it.
        ["ICE_FOLK", cheat ? "OPEN" : "LOCKED"],
        // The Cult campaign (`pulp_wars-hmyk.12`), the saga's finale: tier
        // 3, locked the same way.
        ["CULT", cheat ? "OPEN" : "LOCKED"],
        // The Candy campaign (`pulp_wars-hmyk.11`): tier 3, locked until
        // the four middle campaigns are finished; the cheat opens it.
        ["CANDY", cheat ? "OPEN" : "LOCKED"],
      ]);
      for (const plate of plates)
        expect(plate, plate.campaign.id).toMatchObject({
          missionsWon: 0,
          missionCount: 6,
          stars: 0,
        });
    }
    // The Humans' last mission won: the Humans campaign is done.
    const done = Object.fromEntries(
      CHAPTER_HUMANS_V7.missions.map((entry) => [
        entry.missionId,
        { firstWonAt: "2026-10-03T12:00:00.000Z", bestRounds: 12, stars: 1 },
      ]),
    );
    expect(campaignPlatesV7(done)[0]).toMatchObject({
      campaign: { id: "HUMANS" },
      status: "DONE",
      missionsWon: 6,
      stars: 6,
    });
  });
});

describe("campaign cheat", () => {
  it("toggles after seven quick taps, and a slow tap starts the count again", () => {
    const gesture = new CampaignCheatGestureV7();
    const results = [0, 300, 600, 900, 1200, 1500].map((at) => gesture.tap(at));
    expect(results.every((done) => !done)).toBe(true);
    expect(gesture.tap(1800)).toBe(true);
    // The count starts afresh after a toggle.
    expect(gesture.tap(1900)).toBe(false);
    const slow = new CampaignCheatGestureV7();
    for (const at of [0, 300, 600, 900, 1200, 1500]) slow.tap(at);
    // A pause longer than 800 ms: this tap is the first of a new count.
    expect(slow.tap(3000)).toBe(false);
    for (const at of [3300, 3600, 3900, 4200, 4500])
      expect(slow.tap(at)).toBe(false);
    expect(slow.tap(4800)).toBe(true);
  });

  it("toggles when 'pulpwars' is typed, ignoring case and named keys", () => {
    const gesture = new CampaignCheatGestureV7();
    const typed = [..."xxPulpWar"].map((key) => gesture.key(key));
    expect(typed.every((done) => !done)).toBe(true);
    expect(gesture.key("Shift")).toBe(false);
    expect(gesture.key("s")).toBe(true);
    expect(gesture.key("p")).toBe(false);
  });

  it("reads the address and stores the switch, guarding storage", () => {
    expect(campaignCheatFromSearchV7("?campaign-cheat=1")).toBe(true);
    expect(campaignCheatFromSearchV7("?x=2&campaign-cheat=0")).toBe(false);
    expect(campaignCheatFromSearchV7("?campaign-cheat=yes")).toBeNull();
    expect(campaignCheatFromSearchV7("")).toBeNull();
    const values = new Map<string, string>();
    const storage: StorageAdapter = {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => void values.set(key, value),
      removeItem: (key) => void values.delete(key),
    };
    expect(loadCampaignCheatV7(storage)).toBe(false);
    saveCampaignCheatV7(storage, true);
    expect(values.get(CAMPAIGN_CHEAT_STORAGE_KEY_V7)).toBe("1");
    expect(loadCampaignCheatV7(storage)).toBe(true);
    saveCampaignCheatV7(storage, false);
    expect(values.has(CAMPAIGN_CHEAT_STORAGE_KEY_V7)).toBe(false);
    const failing: StorageAdapter = {
      getItem: () => {
        throw new Error("denied");
      },
      setItem: () => {
        throw new Error("denied");
      },
      removeItem: () => {
        throw new Error("denied");
      },
    };
    expect(loadCampaignCheatV7(failing)).toBe(false);
    expect(() => saveCampaignCheatV7(failing, true)).not.toThrow();
    expect(loadCampaignCheatV7(null)).toBe(false);
  });
});
