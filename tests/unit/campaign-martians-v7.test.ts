import { describe, expect, it } from "vitest";
import { validateMissionDirectivesV7 } from "../../src/ai/v7-directives";
import { CHAPTER_MARTIANS_V7 } from "../../src/campaign/chapter-martians";
import {
  missionByIdV7,
  missionSeatFactionsV7,
  type MissionDefinitionV7,
} from "../../src/engine/index";

// The Martian campaign, "Signal from Home" (`pulp_wars-hmyk.7`;
// docs/product/SAGA.md section 3.6, docs/product/CAMPAIGN.md section 18):
// six built missions of rising difficulty, one seat per faction, the
// clocks and stars that hand play set, and short player-facing text that
// never names a tile coordinate.

const ORDER = [
  "MARTIAN_1",
  "MARTIAN_2",
  "MARTIAN_3",
  "MARTIAN_4",
  "MARTIAN_5",
  "MARTIAN_6",
];

function mission(id: string): MissionDefinitionV7 {
  const found = missionByIdV7(id);
  if (found === null) throw new Error(`${id} is not registered`);
  return found;
}

/** Every player-facing string of the chapter, with where it comes from. */
function playerText(): { readonly where: string; readonly text: string }[] {
  const texts = [
    { where: "title", text: CHAPTER_MARTIANS_V7.title },
    { where: "intro", text: CHAPTER_MARTIANS_V7.intro },
    { where: "outro", text: CHAPTER_MARTIANS_V7.outro },
  ];
  for (const entry of CHAPTER_MARTIANS_V7.missions) {
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

describe("Signal from Home", () => {
  it("lists six built missions in order, all registered and none hidden", () => {
    expect(
      CHAPTER_MARTIANS_V7.missions.map((entry) => entry.missionId),
    ).toEqual(ORDER);
    expect(CHAPTER_MARTIANS_V7.missions.map((entry) => entry.number)).toEqual([
      1, 2, 3, 4, 5, 6,
    ]);
    for (const entry of CHAPTER_MARTIANS_V7.missions) {
      expect(entry.planned, entry.missionId).toBeUndefined();
      expect(mission(entry.missionId).hidden, entry.missionId).toBeUndefined();
      expect([...entry.unlocks]).toEqual([]);
    }
    expect(CHAPTER_MARTIANS_V7.startingFactions).toEqual([]);
    expect(CHAPTER_MARTIANS_V7.missions.map((entry) => entry.format)).toEqual([
      "CONQUEST",
      "CAPTURE",
      "ESCORT",
      "SURVIVE",
      "CAPTURE",
      "KILL",
    ]);
    expect(Object.isFrozen(CHAPTER_MARTIANS_V7)).toBe(true);
    expect(Object.isFrozen(CHAPTER_MARTIANS_V7.missions)).toBe(true);
  });

  it("seats you as the Martians and never gives two seats one faction", () => {
    for (const id of ORDER) {
      const definition = mission(id);
      expect(
        missionSeatFactionsV7(
          definition.seats[0] as MissionDefinitionV7["seats"][number],
        ),
        id,
      ).toEqual(["MARTIAN"]);
      const factions = definition.seats.map((item) => item.faction);
      expect(new Set(factions).size, id).toBe(factions.length);
      expect(() => validateMissionDirectivesV7(definition), id).not.toThrow();
    }
    // Sugarcrest is your ally against the dead; the Lodge and its Redcaps
    // are one team; at Red Dust the Rangers fight beside you.
    expect(mission("MARTIAN_4").teams).toEqual([0, 1, 0]);
    expect(mission("MARTIAN_5").teams).toEqual([0, 1, 1]);
    expect(mission("MARTIAN_6").teams).toEqual([0, 1, 1, 0]);
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
      // Retune 3 (`pulp_wars-hmyk.21`): every clock shortened (M1 has one now).
      {
        kind: "DOMINATION",
        byRound: 15,
        rounds: undefined,
        bonus: ["WITHIN_ROUNDS", "UNIT_ALIVE"],
      },
      {
        kind: "CAPTURE",
        byRound: 14,
        rounds: undefined,
        bonus: ["WITHIN_ROUNDS", "KEEP_CITIES"],
      },
      {
        kind: "ESCORT",
        byRound: 13,
        rounds: undefined,
        bonus: ["WITHIN_ROUNDS", "KEEP_CITIES"],
      },
      {
        kind: "SURVIVE",
        byRound: undefined,
        rounds: 16,
        bonus: ["KEEP_CITIES", "HOLD_PLACE"],
      },
      {
        kind: "CAPTURE",
        byRound: 15,
        rounds: undefined,
        bonus: ["WITHIN_ROUNDS", "KEEP_CITIES"],
      },
      {
        kind: "KILL",
        byRound: 14,
        rounds: undefined,
        bonus: ["WITHIN_ROUNDS", "KEEP_CITIES"],
      },
    ]);
  });

  it("builds the missions as hand play left them", () => {
    const seat = (id: string, index: number) =>
      mission(id).seats[index] as MissionDefinitionV7["seats"][number];
    // M1 (retune 3): the scrap camps learn little: no rifles, Raiding or
    // Chivalry, and no farms.
    const raiders = seat("MARTIAN_1", 1);
    for (const tech of ["MARKSMANSHIP", "RAIDING", "CHIVALRY", "FARMING"])
      expect(raiders.forbiddenTechnologies, tech).toContain(tech);
    // M2 (retune 3): Millford's militia has Drill, Walls and rifles, but
    // still no economy of its own.
    const militia = seat("MARTIAN_2", 1);
    expect(militia.technologies).toEqual([
      "HUNTING",
      "MARKSMANSHIP",
      "DRILL",
      "FORTIFICATION",
    ]);
    for (const tech of ["GATHERING", "ADMINISTRATION", "FARMING"])
      expect(militia.forbiddenTechnologies, tech).toContain(tech);
    // M3: the Crater is a camp of units, not a town (a Saucer would beam
    // the core across from beside it); Ray Hollow is the only Martian town.
    const glass = seat("MARTIAN_3", 0);
    expect(glass.cities.map((city) => city.name)).toEqual(["Ray Hollow"]);
    expect(
      glass.units.find((unit) => unit.tag === "CORE_WALKER"),
    ).toMatchObject({ role: "CATAPULT" });
    // M4: the dead come on; Sugarcrest holds its walls.
    expect(seat("MARTIAN_4", 1).directive).toEqual({ kind: "RUSH" });
    expect(seat("MARTIAN_4", 2).directive).toMatchObject({ kind: "HOLD" });
    // M5: the Lodge guards the hall and calls no Horrors (no Summoner).
    const lodge = seat("MARTIAN_5", 1);
    expect(lodge.directive).toMatchObject({ kind: "GUARD" });
    expect(lodge.units.some((unit) => unit.role === "CAPTAIN")).toBe(false);
    // M6: three Stargazers off the camps' centres; the Lodge learns
    // nothing and the Martians have no Raiding.
    const circle = seat("MARTIAN_6", 1);
    expect(circle.technologies).toEqual([]);
    const gazers = circle.units.filter((unit) => unit.tag !== undefined);
    expect(gazers.map((unit) => unit.tag)).toEqual([
      "STARGAZER_1",
      "STARGAZER_2",
      "STARGAZER_3",
    ]);
    const centres = circle.cities.map((city) => city.at);
    for (const gazer of gazers) expect(centres).not.toContainEqual(gazer.at);
    expect(seat("MARTIAN_6", 0).forbiddenTechnologies).toContain("RAIDING");
  });

  it("is much harder after retune 3 (pulp_wars-hmyk.21)", () => {
    const seat = (id: string, index: number) =>
      mission(id).seats[index] as MissionDefinitionV7["seats"][number];
    // Three missions start like a skirmish: one level 1 town and at most
    // three units, almost no technology, almost no Coins.
    for (const id of ["MARTIAN_1", "MARTIAN_2", "MARTIAN_5"]) {
      const start = seat(id, 0);
      expect(start.cities, id).toHaveLength(1);
      expect(start.cities[0]?.level, id).toBe(1);
      expect(start.units.length, id).toBeLessThanOrEqual(3);
      expect(start.technologies.length, id).toBeLessThanOrEqual(2);
      expect(start.coins, id).toBeLessThanOrEqual(3);
      expect(start.reveal.radius, id).toBe(1);
    }
    // The other three start thin: one town, at most five units and five
    // technologies, at most 3 Coins.
    for (const id of ["MARTIAN_3", "MARTIAN_4", "MARTIAN_6"]) {
      const start = seat(id, 0);
      expect(start.cities, id).toHaveLength(1);
      expect(start.units.length, id).toBeLessThanOrEqual(5);
      expect(start.technologies.length, id).toBeLessThanOrEqual(5);
      expect(start.coins, id).toBeLessThanOrEqual(3);
    }
    // Every hostile seat that has a directive attacks (the Lodge of M5
    // holds its hall, and the Rangers of M6 are on your side).
    for (const id of ORDER)
      for (const [index, item] of mission(id).seats.entries()) {
        if (index === 0 || item.directive === undefined) continue;
        if (mission(id).teams?.[index] === 0) continue;
        if (id === "MARTIAN_5" && index === 1) continue;
        if (id === "MARTIAN_6" && index === 1) continue;
        const entries = Array.isArray(item.directive)
          ? item.directive
          : [item.directive];
        const last = entries[entries.length - 1];
        expect(
          last?.kind === "RUSH" ||
            last?.kind === "ASSAULT" ||
            (last?.kind === "GUARD" && last.others !== undefined),
          `${id} seat ${String(index)}`,
        ).toBe(true);
      }
    // Every mission from the second on sends at least two announced enemy
    // waves with a story line of their own.
    for (const id of ORDER.slice(1)) {
      const hostile = (mission(id).reinforcements ?? []).filter(
        (wave) => wave.seat !== 0 && mission(id).teams?.[wave.seat] !== 0,
      );
      expect(hostile.length, id).toBeGreaterThanOrEqual(2);
      for (const wave of hostile) {
        expect(wave.announce, id).toBe(true);
        expect(wave.line, id).toBeTypeOf("string");
      }
    }
    for (const [id, revision] of [
      ["MARTIAN_1", 3],
      ["MARTIAN_2", 2],
      ["MARTIAN_3", 3],
      ["MARTIAN_4", 2],
      ["MARTIAN_5", 3],
      ["MARTIAN_6", 2],
    ] as const)
      expect(mission(id).revision, id).toBe(revision);
  });

  it("names every place and unit an objective talks about", () => {
    for (const entry of CHAPTER_MARTIANS_V7.missions) {
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
    for (const entry of CHAPTER_MARTIANS_V7.missions) {
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
      expect(text, where).not.toMatch(/MARTIAN|[A-Z]{2,}_[A-Z]/);
    }
  });
});
