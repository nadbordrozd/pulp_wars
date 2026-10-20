import type {
  CampaignDefinitionV7,
  CampaignIdV7,
} from "../../src/campaign/campaigns";
import type {
  CampaignChapterV7,
  CampaignMissionEntryV7,
} from "../../src/campaign/chapter";

/**
 * A campaign registry with the faction campaigns built
 * (`pulp_wars-hmyk.3`): the real registry builds only the Humans so far
 * (`pulp_wars-hmyk.4`), so the tests of the campaign graph give each a
 * chapter of the hidden fixture missions (`TEST_*`, registered and in no
 * campaign), the Humans' included. Candy is kept unbuilt ("Coming
 * soon", its real chapter taken away since `pulp_wars-hmyk.11` built it), so
 * the graph tests keep a campaign that is not written. Use it through
 * `vi.mock` of `src/campaign/campaigns`.
 */
export const FIXTURE_CAMPAIGN_MISSIONS_V7: Readonly<
  Partial<Record<CampaignIdV7, readonly string[]>>
> = {
  HUMANS: ["TEST_GROUNDS", "TEST_RUSH"],
  UNDEAD: ["TEST_HOLD"],
  DINOSAURS: ["TEST_GUARD"],
  MARTIANS: ["TEST_ASSAULT"],
  GOBLINS: ["TEST_ESCORT"],
  DWARVES: ["TEST_SURVIVE"],
  ICE_FOLK: ["TEST_CAPTURE"],
  CULT: ["TEST_KILL", "TEST_GUARD_RAID"],
};

function entry(missionId: string, number: number): CampaignMissionEntryV7 {
  return {
    missionId,
    number,
    name: `Trial ${String(number)}`,
    format: "CONQUEST",
    briefing: "A fixture briefing.",
    objective: "Win the fixture.",
    hints: [],
    closing: "The fixture is won.",
  };
}

export function fixtureCampaignsV7(
  campaigns: readonly CampaignDefinitionV7[],
): readonly CampaignDefinitionV7[] {
  return campaigns.map((campaign) => {
    if (campaign.id === "CANDY") return { ...campaign, chapter: null };
    const missions = FIXTURE_CAMPAIGN_MISSIONS_V7[campaign.id];
    if (missions === undefined) return campaign;
    const chapter: CampaignChapterV7 = {
      id: `FIXTURE_${campaign.id}`,
      number: 1,
      title: campaign.title,
      intro: `The ${campaign.name} fixture.`,
      missions: missions.map((id, index) => entry(id, index + 1)),
      outro: "The end of the fixture.",
    };
    return { ...campaign, chapter };
  });
}

/** The last mission of a fixture campaign: winning it completes it. */
export function fixtureLastMissionV7(id: CampaignIdV7): string {
  const missions = FIXTURE_CAMPAIGN_MISSIONS_V7[id] ?? [];
  const last = missions.at(-1);
  if (last === undefined) throw new Error(`${id} has no fixture missions`);
  return last;
}
