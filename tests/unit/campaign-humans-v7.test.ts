import { describe, expect, it } from "vitest";
import { validateMissionDirectivesV7 } from "../../src/ai/v7-directives";
import { CHAPTER_HUMANS_V7 } from "../../src/campaign/chapter-humans";
import {
  missionByIdV7,
  missionSeatFactionsV7,
  type MissionDefinitionV7,
} from "../../src/engine/index";

// The Humans campaign, "The Marshal's Law" (`pulp_wars-hmyk.4`;
// docs/product/SAGA.md section 3.1, docs/product/CAMPAIGN.md section 15):
// six built missions of rising difficulty, one seat per faction, the
// clocks and stars that hand play set, and short player-facing text that
// never names a tile coordinate.

const ORDER = [
  "HUMAN_1",
  "HUMAN_2",
  "HUMAN_3",
  "HUMAN_4",
  "HUMAN_5",
  "HUMAN_6",
];

function mission(id: string): MissionDefinitionV7 {
  const found = missionByIdV7(id);
  if (found === null) throw new Error(`${id} is not registered`);
  return found;
}

/** Every player-facing string of the chapter, with where it comes from. */
function playerText(): { readonly where: string; readonly text: string }[] {
  const texts = [
    { where: "title", text: CHAPTER_HUMANS_V7.title },
    { where: "intro", text: CHAPTER_HUMANS_V7.intro },
    { where: "outro", text: CHAPTER_HUMANS_V7.outro },
  ];
  for (const entry of CHAPTER_HUMANS_V7.missions) {
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

describe("The Marshal's Law", () => {
  it("lists six built missions in order, all registered and none hidden", () => {
    expect(CHAPTER_HUMANS_V7.missions.map((entry) => entry.missionId)).toEqual(
      ORDER,
    );
    expect(CHAPTER_HUMANS_V7.missions.map((entry) => entry.number)).toEqual([
      1, 2, 3, 4, 5, 6,
    ]);
    for (const entry of CHAPTER_HUMANS_V7.missions) {
      expect(entry.planned, entry.missionId).toBeUndefined();
      expect(mission(entry.missionId).hidden, entry.missionId).toBeUndefined();
    }
    expect(CHAPTER_HUMANS_V7.missions.map((entry) => entry.format)).toEqual([
      "CONQUEST",
      "CAPTURE",
      "ESCORT",
      "SURVIVE",
      "KILL",
      "CAPTURE",
    ]);
    expect(Object.isFrozen(CHAPTER_HUMANS_V7)).toBe(true);
    expect(Object.isFrozen(CHAPTER_HUMANS_V7.missions)).toBe(true);
  });

  it("seats you as the Humans and never gives two seats one faction", () => {
    for (const id of ORDER) {
      const definition = mission(id);
      expect(
        missionSeatFactionsV7(
          definition.seats[0] as MissionDefinitionV7["seats"][number],
        ),
        id,
      ).toEqual(["ORIGINAL"]);
      const factions = definition.seats.map((item) => item.faction);
      expect(new Set(factions).size, id).toBe(factions.length);
      expect(() => validateMissionDirectivesV7(definition), id).not.toThrow();
    }
    // The finale's three enemies are one team; Fort Hollow has the dead
    // as allies.
    expect(mission("HUMAN_6").teams).toEqual([0, 1, 1, 1]);
    expect(mission("HUMAN_4").teams).toEqual([0, 1, 1, 0]);
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
        bonus: ["WITHIN_ROUNDS", "KEEP_CITIES"],
      },
      {
        kind: "CAPTURE",
        byRound: 30,
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
        rounds: 12,
        bonus: ["KEEP_CITIES", "UNIT_ALIVE"],
      },
      {
        kind: "KILL",
        byRound: 20,
        rounds: undefined,
        bonus: ["WITHIN_ROUNDS", "KEEP_CITIES"],
      },
      {
        kind: "CAPTURE",
        byRound: 26,
        rounds: undefined,
        bonus: ["WITHIN_ROUNDS", "KEEP_CITIES"],
      },
    ]);
  });

  it("builds the late missions as hand play left them", () => {
    // H5: the Golden Goose is a tagged Dreadnought on the open sea, and the
    // Redcaps learn nothing but the sea.
    const broadsides = mission("HUMAN_5");
    const redcaps = broadsides.seats[1] as MissionDefinitionV7["seats"][number];
    expect(
      redcaps.units.filter((unit) => unit.tag === "GOLDEN_GOOSE"),
    ).toMatchObject([{ role: "BATTLESHIP", at: { x: 15, y: 9 } }]);
    for (const tech of ["GATHERING", "DRILL", "ENGINEERING", "FORESTRY"])
      expect(redcaps.forbiddenTechnologies, tech).toContain(tech);
    // H6: a Troll holds the Hall's gate, and the Redcaps' garrison stands
    // on the gates of the Hall and the three toll forts.
    const hall = mission("HUMAN_6");
    const goblins = hall.seats[1] as MissionDefinitionV7["seats"][number];
    expect(goblins.units[0]).toMatchObject({
      role: "JUGGERNAUT",
      at: { x: 10, y: 4 },
    });
    expect(hall.landmarks).toEqual([
      { tag: "KESSLER_HALL", at: { x: 10, y: 4 } },
    ]);
    expect(goblins.technologies).toEqual([]);
    for (const tech of ["DRILL", "ENGINEERING"])
      expect(goblins.forbiddenTechnologies, tech).toContain(tech);
  });

  it("keeps the second retune's lean starts and established enemies", () => {
    // `pulp_wars-hmyk.19` (CAMPAIGN.md section 15.5): H2 and H5 start like
    // a skirmish (one town, a few units, two technologies at most), and no
    // Human start holds more than one town but H4's fort and mill. (The
    // fourth retune, section 15.6, gave H2's fort a third Fighter.)
    const seat0 = (id: string) =>
      mission(id).seats[0] as MissionDefinitionV7["seats"][number];
    for (const id of ["HUMAN_2", "HUMAN_5"]) {
      expect(seat0(id).cities, id).toHaveLength(1);
      expect(seat0(id).units.length, id).toBeLessThanOrEqual(4);
      expect(seat0(id).technologies.length, id).toBeLessThanOrEqual(2);
      expect(seat0(id).reveal.radius, id).toBe(1);
    }
    expect(seat0("HUMAN_2").technologies).toEqual([]);
    for (const id of ORDER)
      expect(seat0(id).cities.length, id).toBeLessThanOrEqual(
        id === "HUMAN_4" ? 2 : 1,
      );
    // Every enemy starts with more towns than you (H4's besiegers come in
    // three waves instead).
    for (const id of ORDER.filter((item) => item !== "HUMAN_4")) {
      const definition = mission(id);
      const teams = definition.teams;
      const enemyTowns = definition.seats
        .slice(1)
        .filter((_, index) => teams === undefined || teams[index + 1] !== 0)
        .reduce((sum, item) => sum + item.cities.length, 0);
      expect(enemyTowns, id).toBeGreaterThan(seat0(id).cities.length);
    }
    // The Baron holds the toll on the Frontier's side of the ridge, and
    // every wave carries its story line.
    const hall = mission("HUMAN_6");
    expect(
      (hall.seats[1] as MissionDefinitionV7["seats"][number]).cities.map(
        (city) => city.name,
      ),
    ).toContain("Kessler's Toll");
    for (const id of ["HUMAN_4", "HUMAN_6"])
      for (const wave of mission(id).reinforcements ?? [])
        expect(wave.line, `${id} round ${String(wave.round)}`).toBeTypeOf(
          "string",
        );
  });

  it("keeps the fourth retune's strong enemy starts", () => {
    // `pulp_wars-hmyk.25` (CAMPAIGN.md section 15.6): the enemies outnumber
    // you from the start, and the difficulty comes from them rather than
    // from waves: H4 keeps three waves, H6 one.
    for (const id of ORDER) {
      const definition = mission(id);
      const teams = definition.teams;
      const ours = (definition.seats[0] as MissionDefinitionV7["seats"][number])
        .units.length;
      const theirs = definition.seats
        .slice(1)
        .filter((_, index) => teams === undefined || teams[index + 1] !== 0)
        .reduce((sum, item) => sum + item.units.length, 0);
      expect(theirs, id).toBeGreaterThan(ours);
    }
    expect(
      mission("HUMAN_4").reinforcements?.map((wave) => wave.round),
    ).toEqual([6, 7, 8]);
    expect(
      mission("HUMAN_6").reinforcements?.map((wave) => wave.round),
    ).toEqual([9]);
    // H6: two Trolls hold the Hall and a third Weir Toll's gate.
    const goblins = mission("HUMAN_6")
      .seats[1] as MissionDefinitionV7["seats"][number];
    expect(
      goblins.units
        .filter((unit) => unit.role === "JUGGERNAUT")
        .map((unit) => unit.at),
    ).toEqual([
      { x: 10, y: 4 },
      { x: 10, y: 3 },
      { x: 4, y: 11 },
    ]);
  });

  it("names every place and unit an objective talks about", () => {
    for (const entry of CHAPTER_HUMANS_V7.missions) {
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
    for (const entry of CHAPTER_HUMANS_V7.missions) {
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
      expect(text, where).not.toMatch(/HUMAN_|ORIGINAL|[A-Z]{2,}_[A-Z]/);
    }
  });
});
