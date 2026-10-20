import { describe, expect, it } from "vitest";
import { validateMissionDirectivesV7 } from "../../src/ai/v7-directives";
import { CHAPTER_ICE_FOLK_V7 } from "../../src/campaign/chapter-ice-folk";
import {
  missionByIdV7,
  missionSeatFactionsV7,
  type MissionDefinitionV7,
} from "../../src/engine/index";

// The Ice Folk campaign, "The Long Winter" (`pulp_wars-hmyk.10`;
// docs/product/SAGA.md section 3.7, docs/product/CAMPAIGN.md, the Ice Folk
// campaign's section): six built missions of rising difficulty, one seat
// per faction, the clocks and stars that hand play set, and short
// player-facing text that never names a tile coordinate.

const ORDER = [
  "ICE_FOLK_1",
  "ICE_FOLK_2",
  "ICE_FOLK_3",
  "ICE_FOLK_4",
  "ICE_FOLK_5",
  "ICE_FOLK_6",
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

function waves(id: string): { seat: number; round: number }[] {
  return (mission(id).reinforcements ?? []).map((wave) => ({
    seat: wave.seat,
    round: wave.round,
  }));
}

/** Every player-facing string of the chapter, with where it comes from. */
function playerText(): { readonly where: string; readonly text: string }[] {
  const texts = [
    { where: "title", text: CHAPTER_ICE_FOLK_V7.title },
    { where: "intro", text: CHAPTER_ICE_FOLK_V7.intro },
    { where: "outro", text: CHAPTER_ICE_FOLK_V7.outro },
  ];
  for (const entry of CHAPTER_ICE_FOLK_V7.missions) {
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

describe("The Long Winter", () => {
  it("lists six built missions in order, all registered and none hidden", () => {
    expect(CHAPTER_ICE_FOLK_V7.number).toBe(8);
    expect(
      CHAPTER_ICE_FOLK_V7.missions.map((entry) => entry.missionId),
    ).toEqual(ORDER);
    expect(CHAPTER_ICE_FOLK_V7.missions.map((entry) => entry.number)).toEqual([
      1, 2, 3, 4, 5, 6,
    ]);
    for (const entry of CHAPTER_ICE_FOLK_V7.missions) {
      expect(entry.planned, entry.missionId).toBeUndefined();
      expect(mission(entry.missionId).hidden, entry.missionId).toBeUndefined();
      expect([...entry.unlocks]).toEqual([]);
    }
    expect(CHAPTER_ICE_FOLK_V7.startingFactions).toEqual([]);
    expect(CHAPTER_ICE_FOLK_V7.missions.map((entry) => entry.format)).toEqual([
      "CONQUEST",
      "KILL",
      "CAPTURE",
      "SURVIVE",
      "CAPTURE",
      "ESCORT",
    ]);
    expect(Object.isFrozen(CHAPTER_ICE_FOLK_V7)).toBe(true);
    expect(Object.isFrozen(CHAPTER_ICE_FOLK_V7.missions)).toBe(true);
  });

  it("seats you as the Ice Folk with Mother Rime and never gives two seats one faction", () => {
    for (const id of ORDER) {
      const definition = mission(id);
      expect(missionSeatFactionsV7(seat(id, 0)), id).toEqual(["ICE_FOLK"]);
      // Mother Rime is the Ice Witch in every mission.
      expect(tagged(id, 0, "RIME"), id).toMatchObject({ role: "CAPTAIN" });
      const factions = definition.seats.map((item) => item.faction);
      expect(new Set(factions).size, id).toBe(factions.length);
      expect(() => validateMissionDirectivesV7(definition), id).not.toThrow();
    }
    // The Frozen Abbot is a Lich.
    expect(tagged("ICE_FOLK_2", 1, "ABBOT")).toMatchObject({
      role: "CATAPULT",
    });
    expect(
      ORDER.map((id) => mission(id).seats.map((item) => item.faction)),
    ).toEqual([
      ["ICE_FOLK", "GOBLIN"],
      ["ICE_FOLK", "UNDEAD"],
      ["ICE_FOLK", "DWARF"],
      ["ICE_FOLK", "ORIGINAL", "CANDY"],
      ["ICE_FOLK", "CULT", "GOBLIN"],
      ["ICE_FOLK", "CULT", "UNDEAD", "DWARF"],
    ]);
    for (const id of ["ICE_FOLK_1", "ICE_FOLK_2", "ICE_FOLK_3"])
      expect(mission(id).teams, id).toBeUndefined();
    expect(mission("ICE_FOLK_4").teams).toEqual([0, 1, 1]);
    expect(mission("ICE_FOLK_5").teams).toEqual([0, 1, 1]);
    // At the summit the Thane's dwarves are yours.
    expect(mission("ICE_FOLK_6").teams).toEqual([0, 1, 1, 0]);
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
      {
        kind: "DOMINATION",
        byRound: undefined,
        bonus: ["WITHIN_ROUNDS 12", "UNIT_ALIVE"],
      },
      { kind: "KILL", byRound: 20, bonus: ["WITHIN_ROUNDS 15", "KEEP_CITIES"] },
      {
        kind: "CAPTURE",
        byRound: 22,
        bonus: ["WITHIN_ROUNDS 18", "KEEP_CITIES"],
      },
      {
        kind: "SURVIVE",
        byRound: undefined,
        bonus: ["KEEP_CITIES", "UNIT_ALIVE"],
      },
      {
        kind: "CAPTURE",
        byRound: 22,
        bonus: ["WITHIN_ROUNDS 18", "KEEP_CITIES"],
      },
      {
        kind: "ESCORT",
        byRound: 20,
        bonus: ["WITHIN_ROUNDS 16", "KEEP_CITIES"],
      },
    ]);
    expect(mission("ICE_FOLK_2").objective).toMatchObject({
      units: ["ABBOT"],
    });
    expect(mission("ICE_FOLK_3").objective).toMatchObject({
      places: ["ANVIL_BAY"],
    });
    expect(mission("ICE_FOLK_4").objective).toMatchObject({
      kind: "SURVIVE",
      rounds: 16,
      protect: [{ place: "WHITEWATER" }, { place: "FROSTFORD" }],
    });
    expect(mission("ICE_FOLK_5").objective).toMatchObject({
      places: ["EMBER_LODGE"],
    });
    expect(mission("ICE_FOLK_6").objective).toMatchObject({
      unit: "RIME",
      to: "SUMMIT",
      within: 0,
    });
    const alive = (id: string) =>
      mission(id).objective.bonus?.find((bonus) => bonus.kind === "UNIT_ALIVE");
    expect(alive("ICE_FOLK_1")).toEqual({ kind: "UNIT_ALIVE", unit: "RIME" });
    expect(alive("ICE_FOLK_4")).toEqual({ kind: "UNIT_ALIVE", unit: "RIME" });
  });

  it("builds the missions as hand play left them", () => {
    // I1: the Frostbite Boys start broke and play the Normal AI.
    expect(seat("ICE_FOLK_1", 1).coins).toBe(0);
    expect(seat("ICE_FOLK_1", 1).directive).toBeUndefined();
    // I2: the Abbot keeps four in the tomb and sends the rest; the first
    // Frost Giant joins you in round 10.
    expect(seat("ICE_FOLK_2", 1).directive).toMatchObject({
      kind: "GUARD",
      garrison: 4,
      others: { kind: "RUSH" },
    });
    expect(waves("ICE_FOLK_2")).toEqual([{ seat: 0, round: 10 }]);
    expect(mission("ICE_FOLK_2").reinforcements?.[0]?.units).toEqual([
      expect.objectContaining({ role: "JUGGERNAUT" }),
    ]);
    // I3: Icebound known; Anvil Bay builds no Ironclads or Diving Bells,
    // and its Ironclad comes home in round 12.
    expect(seat("ICE_FOLK_3", 0).technologies).toContain("NAVAL_ENGINEERING");
    for (const tech of ["NAVAL_ENGINEERING", "SUBMERSIBLES"])
      expect(seat("ICE_FOLK_3", 1).forbiddenTechnologies, tech).toContain(tech);
    expect(seat("ICE_FOLK_3", 1).directive).toMatchObject({
      kind: "GUARD",
      garrison: 3,
      others: { kind: "RUSH" },
    });
    expect(waves("ICE_FOLK_3")).toEqual([{ seat: 1, round: 12 }]);
    expect(mission("ICE_FOLK_3").reinforcements?.[0]?.units).toEqual([
      expect.objectContaining({ role: "BATTLESHIP" }),
    ]);
    // I4: the Wardens ride with Chivalry at Whitewater, the sweets march
    // at Frostford; both send waves.
    expect(seat("ICE_FOLK_4", 1).technologies).toContain("CHIVALRY");
    expect(seat("ICE_FOLK_4", 1).directive).toMatchObject({
      kind: "ASSAULT",
    });
    expect(seat("ICE_FOLK_4", 2).directive).toMatchObject({
      kind: "ASSAULT",
    });
    expect(waves("ICE_FOLK_4")).toEqual([
      { seat: 2, round: 4 },
      { seat: 1, round: 5 },
      { seat: 2, round: 8 },
      { seat: 1, round: 10 },
    ]);
    // I5: a Boom camp one level short of its Frost Giant; the Lodge
    // guards seven at home on little Favour; the Redcaps rush.
    expect(seat("ICE_FOLK_5", 0).cities[0]).toMatchObject({
      level: 4,
      rewards: expect.arrayContaining(["BOOM"]) as unknown,
    });
    expect(seat("ICE_FOLK_5", 1).favour).toBe(2);
    expect(seat("ICE_FOLK_5", 1).directive).toMatchObject({
      kind: "GUARD",
      garrison: 7,
    });
    expect(seat("ICE_FOLK_5", 2).directive).toMatchObject({ kind: "RUSH" });
    expect(waves("ICE_FOLK_5")).toEqual([
      { seat: 2, round: 5 },
      { seat: 2, round: 10 },
    ]);
    // I6: no Engineering at the start (the peaks are the road's walls);
    // the Lodge holds the slopes, the Unquiet climb out in rounds 4, 8
    // and 12, and the dwarves hold the Deep Gate.
    expect(seat("ICE_FOLK_6", 0).technologies).not.toContain("ENGINEERING");
    expect(seat("ICE_FOLK_6", 0).technologies).toContain("EXPLOSIVES");
    expect(seat("ICE_FOLK_6", 1).favour).toBe(4);
    expect(seat("ICE_FOLK_6", 1).directive).toMatchObject({ kind: "HOLD" });
    expect(seat("ICE_FOLK_6", 2).directive).toMatchObject({ kind: "RUSH" });
    expect(seat("ICE_FOLK_6", 3).directive).toMatchObject({ kind: "HOLD" });
    expect(waves("ICE_FOLK_6")).toEqual([
      { seat: 2, round: 4 },
      { seat: 2, round: 8 },
      { seat: 2, round: 12 },
    ]);
  });

  it("names every place and unit an objective talks about", () => {
    for (const entry of CHAPTER_ICE_FOLK_V7.missions) {
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
    for (const entry of CHAPTER_ICE_FOLK_V7.missions) {
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
      expect(text, where).not.toMatch(/[A-Z]{2,}_[A-Z]/);
    }
  });
});
