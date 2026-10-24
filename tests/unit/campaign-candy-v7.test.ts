import { describe, expect, it } from "vitest";
import { validateMissionDirectivesV7 } from "../../src/ai/v7-directives";
import { CHAPTER_CANDY_V7 } from "../../src/campaign/chapter-candy";
import {
  missionByIdV7,
  missionSeatFactionsV7,
  type MissionDefinitionV7,
} from "../../src/engine/index";

// The Candy campaign, "Sweet Dreams" (`pulp_wars-hmyk.11`;
// docs/product/SAGA.md section 3.8, docs/product/CAMPAIGN.md, the Candy
// campaign's section): six built missions of rising difficulty, one seat
// per faction, the clocks and stars that hand play set, and short
// player-facing text that never names a tile coordinate.

const ORDER = [
  "CANDY_1",
  "CANDY_2",
  "CANDY_3",
  "CANDY_4",
  "CANDY_5",
  "CANDY_6",
];

function mission(id: string): MissionDefinitionV7 {
  const found = missionByIdV7(id);
  if (found === null) throw new Error(`${id} is not registered`);
  return found;
}

function seat(id: string, index: number): MissionDefinitionV7["seats"][number] {
  return mission(id).seats[index] as MissionDefinitionV7["seats"][number];
}

function tagged(id: string, index: number, tag: string) {
  return seat(id, index).units.find((unit) => unit.tag === tag);
}

/** Every player-facing string of the chapter, with where it comes from. */
function playerText(): { readonly where: string; readonly text: string }[] {
  const texts = [
    { where: "title", text: CHAPTER_CANDY_V7.title },
    { where: "intro", text: CHAPTER_CANDY_V7.intro },
    { where: "outro", text: CHAPTER_CANDY_V7.outro },
  ];
  for (const entry of CHAPTER_CANDY_V7.missions) {
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

describe("Sweet Dreams", () => {
  it("lists six built missions in order, all registered and none hidden", () => {
    expect(CHAPTER_CANDY_V7.missions.map((entry) => entry.missionId)).toEqual(
      ORDER,
    );
    expect(CHAPTER_CANDY_V7.missions.map((entry) => entry.number)).toEqual([
      1, 2, 3, 4, 5, 6,
    ]);
    for (const entry of CHAPTER_CANDY_V7.missions) {
      expect(entry.planned, entry.missionId).toBeUndefined();
      expect(mission(entry.missionId).hidden, entry.missionId).toBeUndefined();
    }
    expect(CHAPTER_CANDY_V7.missions.map((entry) => entry.format)).toEqual([
      "CONQUEST",
      "CAPTURE",
      "KILL",
      "CAPTURE",
      "ESCORT",
      "SURVIVE",
    ]);
    expect(Object.isFrozen(CHAPTER_CANDY_V7)).toBe(true);
    expect(Object.isFrozen(CHAPTER_CANDY_V7.missions)).toBe(true);
  });

  it("seats you as the Candy with Praline's people and never gives two seats one faction", () => {
    for (const id of ORDER) {
      const definition = mission(id);
      expect(missionSeatFactionsV7(seat(id, 0)), id).toEqual(["CANDY"]);
      const factions = definition.seats.map((item) => item.faction);
      expect(new Set(factions).size, id).toBe(factions.length);
      expect(() => validateMissionDirectivesV7(definition), id).not.toThrow();
    }
    // Queen Praline is a Gingerbread Giant, Madame Nougat a Confectioner,
    // and the Sovereign the Crown's Battleship.
    for (const id of ["CANDY_1", "CANDY_4", "CANDY_5", "CANDY_6"])
      expect(tagged(id, 0, "PRALINE"), id).toMatchObject({
        role: "JUGGERNAUT",
      });
    for (const id of ["CANDY_2", "CANDY_5"])
      expect(tagged(id, 0, "NOUGAT"), id).toMatchObject({ role: "CAPTAIN" });
    expect(tagged("CANDY_3", 1, "SOVEREIGN")).toMatchObject({
      role: "BATTLESHIP",
    });
    // Two seats until the long night, which seats the Martians of Red Dust
    // beside you against the nightmares and the horde.
    for (const id of ORDER.slice(0, 5)) {
      expect(mission(id).seats, id).toHaveLength(2);
      expect(mission(id).teams, id).toBeUndefined();
    }
    expect(mission("CANDY_6").teams).toEqual([0, 1, 1, 0]);
    expect(mission("CANDY_6").seats.map((item) => item.faction)).toEqual([
      "CANDY",
      "UNDEAD",
      "GOBLIN",
      "MARTIAN",
    ]);
  });

  it("keeps the objectives, clocks and stars that hand play set", () => {
    const summary = ORDER.map((id) => {
      const { objective } = mission(id);
      return {
        kind: objective.kind,
        byRound: "byRound" in objective ? objective.byRound : undefined,
        bonus: objective.bonus?.map((bonus) =>
          bonus.kind === "WITHIN_ROUNDS"
            ? `WITHIN_ROUNDS ${String(bonus.rounds)}`
            : bonus.kind,
        ),
      };
    });
    expect(summary).toEqual([
      // Retune 4 (`pulp_wars-hmyk.32`): the conquest clocks lax (about half
      // as long again as a good win), the hunt and the escort tighter.
      {
        kind: "DOMINATION",
        byRound: 20,
        bonus: ["WITHIN_ROUNDS 14", "UNIT_ALIVE"],
      },
      {
        kind: "CAPTURE",
        byRound: 30,
        bonus: ["WITHIN_ROUNDS 22", "UNIT_ALIVE"],
      },
      { kind: "KILL", byRound: 16, bonus: ["WITHIN_ROUNDS 12", "KEEP_CITIES"] },
      {
        kind: "CAPTURE",
        byRound: 24,
        bonus: ["WITHIN_ROUNDS 18", "UNIT_ALIVE"],
      },
      {
        kind: "ESCORT",
        byRound: 18,
        bonus: ["WITHIN_ROUNDS 14", "UNIT_ALIVE"],
      },
      {
        kind: "SURVIVE",
        byRound: undefined,
        bonus: ["UNIT_ALIVE", "KEEP_CITIES"],
      },
    ]);
    expect(mission("CANDY_2").objective).toMatchObject({
      places: ["RIFTWATCH"],
    });
    expect(mission("CANDY_3").objective).toMatchObject({
      units: ["SOVEREIGN"],
    });
    expect(mission("CANDY_4").objective).toMatchObject({
      places: ["WICK_CHAPEL"],
    });
    expect(mission("CANDY_5").objective).toMatchObject({
      unit: "PRALINE",
      to: "DREAMING_PALACE",
      within: 1,
    });
    expect(mission("CANDY_6").objective).toMatchObject({
      kind: "SURVIVE",
      rounds: 15,
      protect: [{ place: "SUGARCREST" }],
    });
    const alive = (id: string) =>
      mission(id).objective.bonus?.find((bonus) => bonus.kind === "UNIT_ALIVE");
    expect(alive("CANDY_1")).toEqual({ kind: "UNIT_ALIVE", unit: "PRALINE" });
    expect(alive("CANDY_2")).toEqual({ kind: "UNIT_ALIVE", unit: "NOUGAT" });
    expect(alive("CANDY_4")).toEqual({ kind: "UNIT_ALIVE", unit: "PRALINE" });
    expect(alive("CANDY_5")).toEqual({ kind: "UNIT_ALIVE", unit: "NOUGAT" });
    expect(alive("CANDY_6")).toEqual({ kind: "UNIT_ALIVE", unit: "PRALINE" });
  });

  it("builds the missions as the fourth retune left them", () => {
    // `pulp_wars-hmyk.32` (CAMPAIGN.md section 21.5, hand-played): some
    // economy back, strong enemy starts that march early, and almost no
    // waves.
    // C1: Sugarcrest and Gumdrop, Gathering and Hunting; three goblins hold
    // the camps and the rest storm Gumdrop from the first round.
    expect(seat("CANDY_1", 0).technologies).toEqual(["GATHERING", "HUNTING"]);
    expect(seat("CANDY_1", 0).cities).toHaveLength(2);
    expect(seat("CANDY_1", 1).directive).toMatchObject({
      kind: "GUARD",
      garrison: 3,
      others: { kind: "ASSAULT", target: { x: 5, y: 9 } },
    });
    // C2: Crafting known (workshops from round 1) and the old Pie Launcher;
    // the runaways hold home three rounds and then rampage; a T-Rex Egg
    // four turns from hatching in the Nest.
    expect(seat("CANDY_2", 0).technologies).toEqual([
      "GATHERING",
      "HUNTING",
      "DRILL",
    ]);
    expect(seat("CANDY_2", 0).cities).toHaveLength(2);
    expect(
      seat("CANDY_2", 0).units.filter((unit) => unit.role === "CATAPULT"),
    ).toHaveLength(1);
    expect(
      seat("CANDY_2", 1).units.find((unit) => unit.egg !== undefined),
    ).toMatchObject({ role: "KNIGHT", egg: 4 });
    expect(seat("CANDY_2", 1).directive).toMatchObject([
      { kind: "GUARD", untilRound: 3 },
      { kind: "GUARD", garrison: 4, others: { kind: "RUSH" }, fromRound: 3 },
    ]);
    // C3: the squadron, penniless, is leashed to its anchorage (E7) until
    // round 8 and then sails north on Sugarcrest, into the open lake; no
    // Shipyard and no Port of its own.
    expect(seat("CANDY_3", 0).technologies).toEqual([
      "SHORECRAFT",
      "NAVIGATION",
      "SEAMANSHIP",
    ]);
    expect(seat("CANDY_3", 1).coins).toBe(0);
    expect(seat("CANDY_3", 1).directive).toMatchObject([
      { kind: "HOLD", ships: true, untilRound: 8 },
      { kind: "ASSAULT", target: { x: 7, y: 6 }, fromRound: 8 },
    ]);
    expect(seat("CANDY_3", 1).forbiddenTechnologies).toContain(
      "NAVAL_ENGINEERING",
    );
    expect(
      (mission("CANDY_3").improvements ?? []).filter(
        (item) => item.improvement === "PORT",
      ),
    ).toHaveLength(2);
    // C4: Sugarcrest and Gumdrop with a Confectioner; Favour 2; the chapel
    // keeps five and the rest storm Gumdrop from the first round.
    expect(seat("CANDY_4", 0).cities).toHaveLength(2);
    expect(
      seat("CANDY_4", 0).units.some((unit) => unit.role === "CAPTAIN"),
    ).toBe(true);
    expect(seat("CANDY_4", 1).favour).toBe(2);
    expect(seat("CANDY_4", 1).directive).toMatchObject({
      kind: "GUARD",
      garrison: 5,
      others: { kind: "ASSAULT", target: { x: 10, y: 7 } },
    });
    // C5: the door is a pair of Dimensional Gates (E1), the only way across
    // with the naval branch forbidden; Riftwatch back and a Marshmallow for
    // the far gate; every nightmare holds its own ground until round 6.
    expect(mission("CANDY_5").curiosities).toEqual([
      { kind: "GATES", at: { x: 4, y: 5 }, partner: { x: 13, y: 3 } },
    ]);
    expect(mission("CANDY_5").forbiddenTechnologies).toContain("SHORECRAFT");
    expect(
      seat("CANDY_5", 1).units.filter((unit) => unit.role === "CATAPULT"),
    ).toHaveLength(1);
    expect(seat("CANDY_5", 0).cities).toHaveLength(2);
    expect(seat("CANDY_5", 0).units).toHaveLength(6);
    expect(seat("CANDY_5", 1).directive).toMatchObject([
      { kind: "GUARD", garrison: 10, untilRound: 6 },
      { kind: "GUARD", garrison: 6, others: { kind: "RUSH" }, fromRound: 6 },
    ]);
    // C6: Pie Launchers known and a Pie on the walls; the horde storms
    // Gumdrop first and Sugarcrest from round 8.
    expect(seat("CANDY_6", 0).coins).toBe(5);
    expect(seat("CANDY_6", 0).technologies).toContain("SAWMILLING");
    expect(seat("CANDY_6", 0).units).toHaveLength(6);
    expect(seat("CANDY_6", 2).directive).toEqual([
      { kind: "ASSAULT", target: { x: 9, y: 13 }, untilRound: 8 },
      { kind: "ASSAULT", target: { x: 6, y: 13 } },
    ]);
    expect(seat("CANDY_6", 3).directive).toMatchObject({ kind: "HOLD" });
  });

  it("keeps the fourth retune's strong enemy starts (pulp_wars-hmyk.32)", () => {
    // CAMPAIGN.md section 21.5: every enemy side starts with more units than
    // you (the Martians of Red Dust in C6 are yours and do not count), and
    // the difficulty comes from them rather than from waves or the clock.
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
    // Every enemy marches, assaults or holds its ground.
    for (const id of ORDER) expect(seat(id, 1).directive, id).toBeDefined();
    // Three waves are left in the campaign, all in the long night, each
    // announced with its story line.
    const rounds = (id: string) =>
      (mission(id).reinforcements ?? []).map((wave) => [wave.seat, wave.round]);
    expect(ORDER.map(rounds)).toEqual([
      [],
      [],
      [],
      [],
      [],
      [
        [1, 7],
        [2, 9],
        [1, 13],
      ],
    ]);
    for (const id of ORDER)
      for (const wave of mission(id).reinforcements ?? []) {
        expect(wave.line, id).toBeTypeOf("string");
        expect(wave.announce, id).toBe(true);
      }
    // Some economy back: every mission starts with two towns and 5 or 6
    // Coins.
    expect(ORDER.map((id) => seat(id, 0).cities.length)).toEqual([
      2, 2, 2, 2, 2, 2,
    ]);
    expect(ORDER.map((id) => seat(id, 0).coins)).toEqual([5, 5, 6, 5, 5, 5]);
    for (const [id, revision] of [
      ["CANDY_1", 3],
      ["CANDY_2", 4],
      ["CANDY_3", 4],
      ["CANDY_4", 3],
      ["CANDY_5", 3],
      ["CANDY_6", 4],
    ] as const)
      expect(mission(id).revision, id).toBe(revision);
  });

  it("names every place and unit an objective talks about", () => {
    for (const entry of CHAPTER_CANDY_V7.missions) {
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
    for (const entry of CHAPTER_CANDY_V7.missions) {
      expect(entry.hints.length).toBeGreaterThan(0);
      expect(entry.hints.length).toBeLessThanOrEqual(3);
      for (const hint of entry.hints)
        expect(hint.length, hint).toBeLessThanOrEqual(60);
      expect(entry.briefing.length, entry.missionId).toBeLessThanOrEqual(400);
      expect(entry.closing.length, entry.missionId).toBeLessThanOrEqual(280);
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
      expect(text, where).not.toMatch(/CANDY|[A-Z]{2,}_[A-Z]/);
    }
  });
});
