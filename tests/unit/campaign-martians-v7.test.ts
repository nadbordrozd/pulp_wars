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
    }
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
      // Retune 4 (`pulp_wars-hmyk.28`): the conquests' clocks lax again,
      // the escort and the hunt still pressing, the hold as long as ever.
      {
        kind: "DOMINATION",
        byRound: 20,
        rounds: undefined,
        bonus: ["WITHIN_ROUNDS", "UNIT_ALIVE"],
      },
      {
        kind: "CAPTURE",
        byRound: 22,
        rounds: undefined,
        bonus: ["WITHIN_ROUNDS", "KEEP_CITIES"],
      },
      {
        kind: "ESCORT",
        byRound: 16,
        rounds: undefined,
        bonus: ["WITHIN_ROUNDS", "KEEP_CITIES"],
      },
      {
        kind: "SURVIVE",
        byRound: undefined,
        rounds: 16,
        bonus: ["KEEP_CITIES", "HOLD_PLACE"],
      },
      // M5's revision 5 (`pulp_wars-hmyk.36`): 18, about one and a half
      // times its hand-played wins (rounds 11 and 12).
      {
        kind: "CAPTURE",
        byRound: 18,
        rounds: undefined,
        bonus: ["WITHIN_ROUNDS", "KEEP_CITIES"],
      },
      {
        kind: "KILL",
        byRound: 16,
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

  it("keeps the fourth retune's strong enemy starts (pulp_wars-hmyk.28)", () => {
    const seat = (id: string, index: number) =>
      mission(id).seats[index] as MissionDefinitionV7["seats"][number];
    // CAMPAIGN.md section 18.5: the enemies outnumber you from the start
    // (your allies, Sugarcrest and the Rangers, do not count), and the
    // difficulty comes from them rather than from waves.
    for (const id of ORDER) {
      const definition = mission(id);
      const teams = definition.teams;
      const ours = seat(id, 0).units.length;
      const theirs = definition.seats
        .slice(1)
        .filter((_, index) => teams === undefined || teams[index + 1] !== 0)
        .reduce((sum, item) => sum + item.units.length, 0);
      expect(theirs, id).toBeGreaterThan(ours);
    }
    const waves = (id: string) =>
      (mission(id).reinforcements ?? []).map((wave) => wave.round);
    expect(waves("MARTIAN_1")).toEqual([]);
    expect(waves("MARTIAN_2")).toEqual([]);
    expect(waves("MARTIAN_3")).toEqual([8]);
    expect(waves("MARTIAN_4")).toEqual([5, 10]);
    expect(waves("MARTIAN_5")).toEqual([]);
    expect(waves("MARTIAN_6")).toEqual([5, 9]);
    for (const id of ORDER)
      for (const wave of mission(id).reinforcements ?? []) {
        expect(wave.announce, id).toBe(true);
        expect(wave.line, id).toBeTypeOf("string");
      }
    // Every hostile seat that has a directive attacks (the Lodge holds its
    // hall in M5 and its hills in M6).
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
    // Some economy back: M1 and M2 start from one level 2 town, and every
    // mission starts with a Saucer to beam with.
    for (const id of ["MARTIAN_1", "MARTIAN_2"]) {
      expect(seat(id, 0).cities, id).toHaveLength(1);
      expect(seat(id, 0).cities[0]?.level, id).toBe(2);
    }
    for (const id of ORDER)
      expect(
        seat(id, 0).units.some((unit) => unit.role === "RAIDER"),
        id,
      ).toBe(true);
    for (const [id, revision] of [
      ["MARTIAN_1", 4],
      ["MARTIAN_2", 3],
      ["MARTIAN_3", 4],
      ["MARTIAN_4", 3],
      ["MARTIAN_5", 5],
      ["MARTIAN_6", 3],
    ] as const)
      expect(mission(id).revision, id).toBe(revision);
  });

  it("gives M5's Redcaps towns and units that survive ranged fire (pulp_wars-hmyk.36)", () => {
    // CAMPAIGN.md section 18.6: retune 4's eight Goblins and Bomb Chuckers
    // were no peril ("they get one shotted from distance").
    const definition = mission("MARTIAN_5");
    const redcaps = definition.seats[2] as MissionDefinitionV7["seats"][number];
    expect(redcaps.faction).toBe("GOBLIN");
    expect(redcaps.directive).toEqual({ kind: "RUSH" });
    expect(redcaps.cities).toHaveLength(4);
    expect(
      redcaps.cities.filter((city) => city.level === 2).length,
    ).toBeGreaterThanOrEqual(2);
    // An Orc Brute on every Redcap centre, Ogres and a Warboss behind.
    for (const city of redcaps.cities)
      expect(
        redcaps.units.find(
          (unit) => unit.at.x === city.at.x && unit.at.y === city.at.y,
        )?.role,
        city.name,
      ).toBe("GUARD");
    const count = (role: string) =>
      redcaps.units.filter((unit) => unit.role === role).length;
    expect(count("SWORDSMAN")).toBeGreaterThanOrEqual(3);
    expect(count("CAPTAIN")).toBe(1);
    expect(count("FIGHTER")).toBeLessThanOrEqual(1);
    // Coins to keep training, but no Brute factory (with Fortification
    // they walled the road with two new Brutes a turn).
    expect(redcaps.coins).toBeGreaterThan(0);
    expect(redcaps.technologies).not.toContain("FORTIFICATION");
    expect(redcaps.forbiddenTechnologies).toContain("FORTIFICATION");
    // No Climbing: a Brain on the bare mountain beside the hall's centre
    // took it past the whole ring.
    for (const tech of ["ENGINEERING", "METALLURGY"])
      expect(definition.seats[0]?.forbiddenTechnologies, tech).toContain(tech);
    expect(definition.objective).toMatchObject({
      kind: "CAPTURE",
      byRound: 18,
    });
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
