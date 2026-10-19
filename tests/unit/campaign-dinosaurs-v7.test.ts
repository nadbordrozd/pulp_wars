import { describe, expect, it } from "vitest";
import { validateMissionDirectivesV7 } from "../../src/ai/v7-directives";
import { CHAPTER_DINOSAURS_V7 } from "../../src/campaign/chapter-dinosaurs";
import {
  missionByIdV7,
  missionSeatFactionsV7,
  type MissionDefinitionV7,
} from "../../src/engine/index";

// The Dinosaur campaign, "The Egg Thief" (`pulp_wars-hmyk.6`;
// docs/product/SAGA.md section 3.5, docs/product/CAMPAIGN.md, the Dinosaur
// campaign's section): six built missions of rising difficulty, one seat
// per faction, the clocks and stars that hand play set, and short
// player-facing text that never names a tile coordinate.

const ORDER = [
  "DINOSAUR_1",
  "DINOSAUR_2",
  "DINOSAUR_3",
  "DINOSAUR_4",
  "DINOSAUR_5",
  "DINOSAUR_6",
];

function mission(id: string): MissionDefinitionV7 {
  const found = missionByIdV7(id);
  if (found === null) throw new Error(`${id} is not registered`);
  return found;
}

function seat(id: string, index: number): MissionDefinitionV7["seats"][number] {
  return mission(id).seats[index] as MissionDefinitionV7["seats"][number];
}

/** Every player-facing string of the chapter, with where it comes from. */
function playerText(): { readonly where: string; readonly text: string }[] {
  const texts = [
    { where: "title", text: CHAPTER_DINOSAURS_V7.title },
    { where: "intro", text: CHAPTER_DINOSAURS_V7.intro },
    { where: "outro", text: CHAPTER_DINOSAURS_V7.outro },
  ];
  for (const entry of CHAPTER_DINOSAURS_V7.missions) {
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

describe("The Egg Thief", () => {
  it("lists six built missions in order, all registered and none hidden", () => {
    expect(
      CHAPTER_DINOSAURS_V7.missions.map((entry) => entry.missionId),
    ).toEqual(ORDER);
    expect(CHAPTER_DINOSAURS_V7.missions.map((entry) => entry.number)).toEqual([
      1, 2, 3, 4, 5, 6,
    ]);
    for (const entry of CHAPTER_DINOSAURS_V7.missions) {
      expect(entry.planned, entry.missionId).toBeUndefined();
      expect(mission(entry.missionId).hidden, entry.missionId).toBeUndefined();
      expect([...entry.unlocks]).toEqual([]);
    }
    expect(CHAPTER_DINOSAURS_V7.startingFactions).toEqual([]);
    expect(CHAPTER_DINOSAURS_V7.missions.map((entry) => entry.format)).toEqual([
      "CONQUEST",
      "KILL",
      "ESCORT",
      "KILL",
      "ESCORT",
      "CAPTURE",
    ]);
    expect(Object.isFrozen(CHAPTER_DINOSAURS_V7)).toBe(true);
    expect(Object.isFrozen(CHAPTER_DINOSAURS_V7.missions)).toBe(true);
  });

  it("seats you as the Dinosaurs with the Old Queen and never gives two seats one faction", () => {
    for (const id of ORDER) {
      const definition = mission(id);
      expect(missionSeatFactionsV7(seat(id, 0)), id).toEqual(["DINOSAUR"]);
      const factions = definition.seats.map((item) => item.faction);
      expect(new Set(factions).size, id).toBe(factions.length);
      expect(() => validateMissionDirectivesV7(definition), id).not.toThrow();
      // The Old Queen is a T-Rex in every mission.
      expect(
        seat(id, 0).units.find((unit) => unit.tag === "OLD_QUEEN"),
        id,
      ).toMatchObject({ role: "KNIGHT" });
    }
    // Thornbury's lodge and his Redcap trackers are one side; so are the
    // circus and its roustabouts, the Unquiet and the Redcaps, the Lodge
    // and the Unquiet; Quaxx's saucers fight on your side.
    expect(mission("DINOSAUR_2").teams).toEqual([0, 1, 1]);
    expect(mission("DINOSAUR_4").teams).toEqual([0, 1, 1]);
    expect(mission("DINOSAUR_5").teams).toEqual([0, 1, 1, 0]);
    expect(mission("DINOSAUR_6").teams).toEqual([0, 1, 1]);
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
      { kind: "KILL", byRound: 20, bonus: ["WITHIN_ROUNDS 16", "UNIT_ALIVE"] },
      {
        kind: "ESCORT",
        byRound: 22,
        bonus: ["WITHIN_ROUNDS 18", "KEEP_CITIES"],
      },
      { kind: "KILL", byRound: 18, bonus: ["WITHIN_ROUNDS 14", "UNIT_ALIVE"] },
      {
        kind: "ESCORT",
        byRound: 18,
        bonus: ["WITHIN_ROUNDS 14", "KEEP_CITIES"],
      },
      {
        kind: "CAPTURE",
        byRound: 18,
        bonus: ["WITHIN_ROUNDS 14", "UNIT_ALIVE"],
      },
    ]);
    for (const id of ["DINOSAUR_1", "DINOSAUR_2", "DINOSAUR_4", "DINOSAUR_6"])
      expect(
        mission(id).objective.bonus?.find(
          (bonus) => bonus.kind === "UNIT_ALIVE",
        ),
        id,
      ).toEqual({ kind: "UNIT_ALIVE", unit: "OLD_QUEEN" });
  });

  it("builds the missions as hand play left them", () => {
    // DN1: a Guard and a rifle on each poacher camp; you start with a
    // Raptor and Land Grants.
    const poachers = seat("DINOSAUR_1", 1).units.map((unit) => unit.role);
    expect(poachers.filter((role) => role === "GUARD")).toHaveLength(2);
    expect(poachers.filter((role) => role === "MARKSMAN")).toHaveLength(2);
    expect(seat("DINOSAUR_1", 0).technologies).toContain("PLANNING");
    // DN2: Thornbury on a peak walled in by peaks, leashed to it; the peaks
    // are closed to you.
    const thornbury = seat("DINOSAUR_2", 1).units[0];
    expect(thornbury).toMatchObject({ tag: "THORNBURY", role: "MARKSMAN" });
    const at = (thornbury as { at: { x: number; y: number } }).at;
    const dn2 = mission("DINOSAUR_2");
    for (let dy = -1; dy <= 1; dy += 1)
      for (let dx = -1; dx <= 1; dx += 1)
        expect(dn2.terrain[at.y + dy]?.[at.x + dx], `${dx} ${dy}`).toBe("^");
    expect(seat("DINOSAUR_2", 1).directive).toEqual({
      kind: "GUARD",
      zone: [{ x0: at.x, y0: at.y, x1: at.x, y1: at.y }],
      garrison: 1,
    });
    for (const tech of ["ENGINEERING", "METALLURGY", "EXPLOSIVES"])
      expect(seat("DINOSAUR_2", 0).forbiddenTechnologies, tech).toContain(tech);
    // DN3: the Baron learns nothing (his fleet keeps to the shallows), the
    // Dugout's Horned Prows are yours, and the old Sea Serpent is placed.
    const dn3 = mission("DINOSAUR_3");
    expect(seat("DINOSAUR_3", 1).technologies).toEqual([]);
    expect(seat("DINOSAUR_3", 0).technologies).toContain("SEAMANSHIP");
    expect(dn3.curiosities).toEqual([
      { kind: "SEA_SERPENT", at: { x: 8, y: 13 } },
    ]);
    expect(dn3.landmarks).toEqual([
      { tag: "BIG_TOP_BAY", at: { x: 13, y: 3 }, name: "Big Top Bay" },
    ]);
    // DN4: eight Guards in a full ring round the ringmaster, leashed to
    // the ring; the freed beasts arrive in rounds 6 and 10.
    const circus = seat("DINOSAUR_4", 1);
    expect(circus.units[0]).toMatchObject({ role: "CAPTAIN", tag: "KESSLER" });
    expect(circus.units.filter((unit) => unit.role === "GUARD")).toHaveLength(
      8,
    );
    expect(circus.directive).toMatchObject({ kind: "GUARD", garrison: 9 });
    expect(
      (mission("DINOSAUR_4").reinforcements ?? [])
        .filter((wave) => wave.seat === 0)
        .map((wave) => wave.round),
    ).toEqual([6, 10]);
    // DN5: no Ghouls for the Unquiet; the Redcaps hold the gaps.
    expect(seat("DINOSAUR_5", 1).forbiddenTechnologies).toContain("SCOUTING");
    expect(seat("DINOSAUR_5", 2).directive).toMatchObject({
      kind: "GUARD",
      others: { kind: "RUSH" },
    });
    // DN6: the Lodge can call the Herald from the start and sends all but
    // its garrison at Mire's Edge.
    const lodge = seat("DINOSAUR_6", 1);
    expect(lodge.favour).toBe(16);
    expect(lodge.technologies).toContain("EXPLOSIVES");
    expect(lodge.directive).toMatchObject({
      kind: "GUARD",
      garrison: 8,
      others: { kind: "ASSAULT", target: { x: 6, y: 11 } },
    });
  });

  it("names every place and unit an objective talks about", () => {
    for (const entry of CHAPTER_DINOSAURS_V7.missions) {
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
    for (const entry of CHAPTER_DINOSAURS_V7.missions) {
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
      expect(text, where).not.toMatch(/DINOSAUR|[A-Z]{2,}_[A-Z]/);
    }
  });
});
