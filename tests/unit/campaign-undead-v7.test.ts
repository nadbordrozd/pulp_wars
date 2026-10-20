import { describe, expect, it } from "vitest";
import { validateMissionDirectivesV7 } from "../../src/ai/v7-directives";
import { CHAPTER_UNDEAD_V7 } from "../../src/campaign/chapter-undead";
import {
  missionByIdV7,
  missionSeatFactionsV7,
  type MissionDefinitionV7,
} from "../../src/engine/index";

// The Undead campaign, "The Long Sleep" (`pulp_wars-hmyk.5`;
// docs/product/SAGA.md section 3.2, docs/product/CAMPAIGN.md section 16):
// six built missions of rising difficulty, one seat per faction, the
// clocks and stars that hand play set, and short player-facing text that
// never names a tile coordinate.

const ORDER = [
  "UNDEAD_1",
  "UNDEAD_2",
  "UNDEAD_3",
  "UNDEAD_4",
  "UNDEAD_5",
  "UNDEAD_6",
];

function mission(id: string): MissionDefinitionV7 {
  const found = missionByIdV7(id);
  if (found === null) throw new Error(`${id} is not registered`);
  return found;
}

/** Every player-facing string of the chapter, with where it comes from. */
function playerText(): { readonly where: string; readonly text: string }[] {
  const texts = [
    { where: "title", text: CHAPTER_UNDEAD_V7.title },
    { where: "intro", text: CHAPTER_UNDEAD_V7.intro },
    { where: "outro", text: CHAPTER_UNDEAD_V7.outro },
  ];
  for (const entry of CHAPTER_UNDEAD_V7.missions) {
    texts.push(
      { where: `${entry.missionId} name`, text: entry.name },
      { where: `${entry.missionId} briefing`, text: entry.briefing },
      { where: `${entry.missionId} objective`, text: entry.objective },
      { where: `${entry.missionId} closing`, text: entry.closing },
      ...entry.hints.map((text, index) => ({
        where: `${entry.missionId} hint ${String(index + 1)}`,
        text,
      })),
      ...Object.values(entry.names ?? {}).map((text) => ({
        where: `${entry.missionId} name of a place or unit`,
        text,
      })),
    );
    for (const item of mission(entry.missionId).seats)
      for (const city of item.cities)
        if (city.name !== undefined)
          texts.push({ where: `${entry.missionId} city`, text: city.name });
  }
  return texts;
}

describe("The Long Sleep", () => {
  it("lists six built missions in order, all registered and none hidden", () => {
    expect(CHAPTER_UNDEAD_V7.missions.map((entry) => entry.missionId)).toEqual(
      ORDER,
    );
    expect(CHAPTER_UNDEAD_V7.missions.map((entry) => entry.number)).toEqual([
      1, 2, 3, 4, 5, 6,
    ]);
    for (const entry of CHAPTER_UNDEAD_V7.missions) {
      expect(entry.planned, entry.missionId).toBeUndefined();
      expect(mission(entry.missionId).hidden, entry.missionId).toBeUndefined();
    }
    expect(CHAPTER_UNDEAD_V7.missions.map((entry) => entry.format)).toEqual([
      "CONQUEST",
      "SURVIVE",
      "CAPTURE",
      "ESCORT",
      "KILL",
      "ALLY",
    ]);
    expect(Object.isFrozen(CHAPTER_UNDEAD_V7)).toBe(true);
    expect(Object.isFrozen(CHAPTER_UNDEAD_V7.missions)).toBe(true);
  });

  it("seats you as the Undead and never gives two seats one faction", () => {
    for (const id of ORDER) {
      const definition = mission(id);
      expect(
        missionSeatFactionsV7(
          definition.seats[0] as MissionDefinitionV7["seats"][number],
        ),
        id,
      ).toEqual(["UNDEAD"]);
      const factions = definition.seats.map((item) => item.faction);
      expect(new Set(factions).size, id).toBe(factions.length);
      expect(() => validateMissionDirectivesV7(definition), id).not.toThrow();
    }
    // Mallory's Lodge and the toll-men are one team; on the summit the
    // Rangers are your allies against the Lodge and the Whitefang.
    expect(mission("UNDEAD_5").teams).toEqual([0, 1, 1]);
    expect(mission("UNDEAD_6").teams).toEqual([0, 1, 1, 0]);
  });

  it("keeps the objectives, clocks and stars that hand play set", () => {
    const summary = ORDER.map((id) => {
      const { objective } = mission(id);
      return {
        kind: objective.kind,
        byRound: "byRound" in objective ? objective.byRound : undefined,
        rounds: "rounds" in objective ? objective.rounds : undefined,
        bonus: objective.bonus?.map((bonus) => bonus.kind),
      };
    });
    expect(summary).toEqual([
      {
        kind: "DOMINATION",
        byRound: 20,
        rounds: undefined,
        bonus: ["WITHIN_ROUNDS", "UNIT_ALIVE"],
      },
      {
        kind: "SURVIVE",
        byRound: undefined,
        rounds: 14,
        bonus: ["KEEP_CITIES", "UNIT_ALIVE"],
      },
      {
        kind: "CAPTURE",
        byRound: 20,
        rounds: undefined,
        bonus: ["WITHIN_ROUNDS", "KEEP_CITIES"],
      },
      {
        kind: "ESCORT",
        byRound: 22,
        rounds: undefined,
        bonus: ["WITHIN_ROUNDS", "KEEP_CITIES"],
      },
      {
        kind: "KILL",
        byRound: 20,
        rounds: undefined,
        bonus: ["WITHIN_ROUNDS", "KEEP_CITIES"],
      },
      {
        kind: "SURVIVE",
        byRound: undefined,
        rounds: 16,
        bonus: ["UNIT_ALIVE", "KEEP_CITIES"],
      },
    ]);
  });

  it("builds the missions as hand play left them", () => {
    const seat = (id: string, index: number) =>
      mission(id).seats[index] as MissionDefinitionV7["seats"][number];
    // U1: a skirmish start (retune 2, `pulp_wars-hmyk.20`): one level 1
    // tower and no technology against two camps that know only Hunting.
    const marquis = seat("UNDEAD_1", 0);
    expect(marquis.technologies).toEqual([]);
    expect(marquis.cities).toHaveLength(1);
    expect(marquis.cities[0]?.level).toBe(1);
    const company = seat("UNDEAD_1", 1);
    expect(company.technologies).toEqual(["HUNTING"]);
    for (const tech of ["GATHERING", "MARKSMANSHIP", "DRILL", "SCOUTING"])
      expect(company.forbiddenTechnologies, tech).toContain(tech);
    // U3: the dredgers sail a fixed fleet and raise no Force Fields.
    const dredgers = seat("UNDEAD_3", 1);
    for (const tech of ["SHORECRAFT", "NAVIGATION", "FORTIFICATION"])
      expect(dredgers.forbiddenTechnologies, tech).toContain(tech);
    // U4: the summit stair is a landmark on bare ground, not a village.
    const hall = mission("UNDEAD_4");
    expect(hall.landmarks).toEqual([
      { tag: "SUMMIT_STAIR", at: { x: 13, y: 1 } },
    ]);
    expect(hall.villages).not.toContainEqual({ x: 13, y: 1 });
    // U5: Brother Mallory is a Summoner on Greyhood's centre, ringed by
    // Idol Bearers.
    const lodge = seat("UNDEAD_5", 1);
    expect(lodge.units[0]).toMatchObject({
      role: "CAPTAIN",
      at: { x: 9, y: 5 },
      tag: "MALLORY",
    });
    expect(lodge.units.filter((unit) => unit.role === "GUARD")).toHaveLength(4);
    // U6: the Lodge (after a muster at Greyhood) and the Whitefang both go
    // for the Rangers' Lodge; the Rangers keep to their walls.
    const summit = mission("UNDEAD_6");
    expect(summit.landmarks).toEqual([
      { tag: "THE_LODGE", at: { x: 9, y: 2 } },
    ]);
    const assault = { kind: "ASSAULT", target: { x: 9, y: 2 } };
    expect(seat("UNDEAD_6", 1).directive).toEqual([
      expect.objectContaining({ kind: "GUARD", untilRound: 4 }),
      assault,
    ]);
    expect(seat("UNDEAD_6", 2).directive).toEqual(assault);
    expect(seat("UNDEAD_6", 3).directive).toMatchObject({ kind: "HOLD" });
  });

  it("names every place and unit an objective talks about", () => {
    for (const entry of CHAPTER_UNDEAD_V7.missions) {
      const definition = mission(entry.missionId);
      const tags = [
        ...(definition.landmarks ?? []).map((landmark) => landmark.tag),
        ...definition.seats.flatMap((item) =>
          item.units.flatMap((unit) =>
            unit.tag === undefined ? [] : [unit.tag],
          ),
        ),
      ];
      for (const tag of tags)
        expect(entry.names?.[tag], `${entry.missionId} ${tag}`).toBeTypeOf(
          "string",
        );
    }
  });

  it("keeps player-facing text short, plain, and free of tile coordinates", () => {
    for (const entry of CHAPTER_UNDEAD_V7.missions) {
      expect(entry.hints.length).toBeGreaterThan(0);
      expect(entry.hints.length).toBeLessThanOrEqual(3);
      for (const hint of entry.hints)
        expect(hint.length, hint).toBeLessThanOrEqual(60);
      expect(entry.briefing.length, entry.missionId).toBeLessThanOrEqual(400);
      expect(entry.closing.length, entry.missionId).toBeLessThanOrEqual(240);
      expect(entry.objective.length, entry.missionId).toBeLessThanOrEqual(44);
      expect(entry.objective).toMatch(/\.$/);
      for (const item of mission(entry.missionId).seats)
        for (const city of item.cities) {
          expect(city.name, entry.missionId).toBeTypeOf("string");
          expect(city.name, entry.missionId).not.toMatch(/\d/);
          expect((city.name as string).length).toBeLessThanOrEqual(16);
        }
    }
    for (const { where, text } of playerText()) {
      expect(text.trim(), where).not.toBe("");
      expect(text, where).not.toMatch(/\d\s*,\s*\d/);
      expect(text, where).not.toMatch(/\b[xy]\s*[=:]?\s*\d/i);
      expect(text, where).not.toMatch(/\b(row|column|tile)s?\s+\d/i);
      expect(text, where).not.toMatch(/UNDEAD|[A-Z]{2,}_[A-Z]/);
    }
  });
});
