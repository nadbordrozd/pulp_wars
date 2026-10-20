import { describe, expect, it } from "vitest";
import { validateMissionDirectivesV7 } from "../../src/ai/v7-directives";
import { CHAPTER_DWARVES_V7 } from "../../src/campaign/chapter-dwarves";
import {
  missionByIdV7,
  missionSeatFactionsV7,
  type MissionDefinitionV7,
} from "../../src/engine/index";

// The Dwarf campaign, "The Bottomless" (`pulp_wars-hmyk.9`;
// docs/product/SAGA.md section 3.4, docs/product/CAMPAIGN.md, the Dwarf
// campaign's section): six built missions of rising difficulty, one seat
// per faction, the clocks and stars that hand play set, and short
// player-facing text that never names a tile coordinate.

const ORDER = [
  "DWARF_1",
  "DWARF_2",
  "DWARF_3",
  "DWARF_4",
  "DWARF_5",
  "DWARF_6",
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
    { where: "title", text: CHAPTER_DWARVES_V7.title },
    { where: "intro", text: CHAPTER_DWARVES_V7.intro },
    { where: "outro", text: CHAPTER_DWARVES_V7.outro },
  ];
  for (const entry of CHAPTER_DWARVES_V7.missions) {
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

describe("The Bottomless", () => {
  it("lists six built missions in order, all registered and none hidden", () => {
    expect(CHAPTER_DWARVES_V7.missions.map((entry) => entry.missionId)).toEqual(
      ORDER,
    );
    expect(CHAPTER_DWARVES_V7.missions.map((entry) => entry.number)).toEqual([
      1, 2, 3, 4, 5, 6,
    ]);
    for (const entry of CHAPTER_DWARVES_V7.missions) {
      expect(entry.planned, entry.missionId).toBeUndefined();
      expect(mission(entry.missionId).hidden, entry.missionId).toBeUndefined();
      expect([...entry.unlocks]).toEqual([]);
    }
    expect(CHAPTER_DWARVES_V7.startingFactions).toEqual([]);
    expect(CHAPTER_DWARVES_V7.missions.map((entry) => entry.format)).toEqual([
      "SURVIVE",
      "CAPTURE",
      "ESCORT",
      "KILL",
      "ESCORT",
      "CAPTURE",
    ]);
    expect(Object.isFrozen(CHAPTER_DWARVES_V7)).toBe(true);
    expect(Object.isFrozen(CHAPTER_DWARVES_V7.missions)).toBe(true);
  });

  it("seats you as the Dwarves with the Thane's people and never gives two seats one faction", () => {
    for (const id of ORDER) {
      const definition = mission(id);
      expect(missionSeatFactionsV7(seat(id, 0)), id).toEqual(["DWARF"]);
      const factions = definition.seats.map((item) => item.faction);
      expect(new Set(factions).size, id).toBe(factions.length);
      expect(() => validateMissionDirectivesV7(definition), id).not.toThrow();
    }
    // The Thane and Tobbin are Engineers, the Mothership is the Martians'
    // Knight, and the Anvil is an Ironclad.
    expect(tagged("DWARF_1", 0, "TOBBIN")).toMatchObject({ role: "CAPTAIN" });
    expect(tagged("DWARF_3", 0, "THANE")).toMatchObject({ role: "CAPTAIN" });
    expect(tagged("DWARF_3", 0, "TOBBIN")).toMatchObject({ role: "CAPTAIN" });
    expect(tagged("DWARF_4", 1, "MOTHERSHIP")).toMatchObject({
      role: "KNIGHT",
    });
    expect(tagged("DWARF_5", 0, "ANVIL")).toMatchObject({ role: "BATTLESHIP" });
    expect(tagged("DWARF_6", 0, "THANE")).toMatchObject({ role: "CAPTAIN" });
    // Two-seat missions against one enemy; in the shaft, on the river and
    // at the Seal the enemies are one side, and at the Seal the Rangers
    // are yours.
    for (const id of ["DWARF_1", "DWARF_2", "DWARF_4"]) {
      expect(mission(id).seats, id).toHaveLength(2);
      expect(mission(id).teams, id).toBeUndefined();
    }
    expect(mission("DWARF_3").teams).toEqual([0, 1, 1]);
    expect(mission("DWARF_5").teams).toEqual([0, 1, 1]);
    expect(mission("DWARF_6").teams).toEqual([0, 1, 1, 0]);
    expect(seat("DWARF_6", 3).faction).toBe("ORIGINAL");
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
        kind: "SURVIVE",
        byRound: undefined,
        bonus: ["KEEP_CITIES", "UNIT_ALIVE"],
      },
      // The third retune (`pulp_wars-hmyk.21`): clocks cut by about a fifth
      // (D1's hold stays at twelve: a shorter hold would be easier).
      {
        kind: "CAPTURE",
        byRound: 16,
        bonus: ["WITHIN_ROUNDS 13", "KEEP_CITIES"],
      },
      {
        kind: "ESCORT",
        byRound: 16,
        bonus: ["WITHIN_ROUNDS 13", "UNIT_ALIVE"],
      },
      { kind: "KILL", byRound: 14, bonus: ["WITHIN_ROUNDS 11", "KEEP_CITIES"] },
      {
        kind: "ESCORT",
        byRound: 18,
        bonus: ["WITHIN_ROUNDS 15", "KEEP_CITIES"],
      },
      {
        kind: "CAPTURE",
        byRound: 16,
        bonus: ["WITHIN_ROUNDS 13", "UNIT_ALIVE"],
      },
    ]);
    expect(mission("DWARF_1").objective).toMatchObject({
      kind: "SURVIVE",
      rounds: 12,
      protect: [{ place: "COPPERSTEP" }],
    });
    expect(mission("DWARF_2").objective).toMatchObject({
      places: ["TUSK_CAMP", "GNASHS_CAMP", "IRON_DEN"],
    });
    expect(mission("DWARF_3").objective).toMatchObject({
      unit: "THANE",
      to: "BELLS_REST",
      within: 1,
    });
    expect(mission("DWARF_4").objective).toMatchObject({
      units: ["MOTHERSHIP"],
    });
    expect(mission("DWARF_5").objective).toMatchObject({
      unit: "ANVIL",
      to: "RIVER_LANDING",
      within: 1,
    });
    expect(mission("DWARF_6").objective).toMatchObject({
      places: ["DEEP_GATE"],
    });
    const alive = (id: string) =>
      mission(id).objective.bonus?.find((bonus) => bonus.kind === "UNIT_ALIVE");
    expect(alive("DWARF_1")).toEqual({ kind: "UNIT_ALIVE", unit: "TOBBIN" });
    expect(alive("DWARF_3")).toEqual({ kind: "UNIT_ALIVE", unit: "TOBBIN" });
    expect(alive("DWARF_6")).toEqual({ kind: "UNIT_ALIVE", unit: "THANE" });
  });

  it("builds the missions as hand play left them", () => {
    // D1: the Grey Shift knows nothing and storms Copperstep, with waves in
    // rounds 3, 5, 8 and 10.
    expect(seat("DWARF_1", 1).technologies).toEqual([]);
    expect(seat("DWARF_1", 1).directive).toMatchObject({ kind: "ASSAULT" });
    expect(
      (mission("DWARF_1").reinforcements ?? []).map((wave) => wave.round),
    ).toEqual([3, 5, 8, 10]);
    // D2: the clan learns Gathering and Hunting only; each camp keeps three
    // and the rest march from round 3; the dwarves start with Drill alone.
    expect(seat("DWARF_2", 1).technologies).toEqual(["GATHERING", "HUNTING"]);
    expect(seat("DWARF_2", 1).directive).toEqual([
      expect.objectContaining({ kind: "GUARD", garrison: 9, untilRound: 3 }),
      expect.objectContaining({
        kind: "GUARD",
        garrison: 9,
        others: { kind: "RUSH" },
      }),
    ]);
    expect(seat("DWARF_2", 0).technologies).toEqual(["DRILL"]);
    // D3: nobody climbs the peaks; the diggers hold their cave until
    // round 4; ten dead hold the gallery.
    for (const tech of ["ENGINEERING", "METALLURGY"])
      expect(mission("DWARF_3").forbiddenTechnologies, tech).toContain(tech);
    expect(seat("DWARF_3", 2).directive).toEqual([
      expect.objectContaining({ kind: "HOLD", untilRound: 4 }),
      expect.objectContaining({ kind: "RUSH" }),
    ]);
    expect(seat("DWARF_3", 1).directive).toMatchObject({
      kind: "GUARD",
      garrison: 10,
    });
    // D4: the Mothership keeps four at its field and sends the rest at the
    // Hold; troops beam down in rounds 3, 5, 8 and 11.
    expect(seat("DWARF_4", 1).directive).toMatchObject({
      kind: "GUARD",
      garrison: 4,
      others: { kind: "ASSAULT" },
    });
    expect(
      (mission("DWARF_4").reinforcements ?? []).map((wave) => wave.round),
    ).toEqual([3, 5, 8, 11]);
    // D5: a lean Dwarf navy without Submersibles; the Lodge's four ships and
    // no Shipyard builders; the Redcaps hunt from round 3.
    expect(seat("DWARF_5", 0).technologies).not.toContain("SUBMERSIBLES");
    expect(seat("DWARF_5", 2).directive).toEqual([
      { kind: "NORMAL", untilRound: 3 },
      { kind: "RUSH" },
    ]);
    expect(
      seat("DWARF_5", 1).units.filter((unit) => unit.role !== "CAPTAIN"),
    ).toHaveLength(4);
    expect(seat("DWARF_5", 1).forbiddenTechnologies).toContain(
      "NAVAL_ENGINEERING",
    );
    // D6: two Liches in the bowl, seven on the Gate, the dead climbing out
    // every third round (from round 3) and the Lodge's two waves; the
    // Rangers attack from round 8.
    expect(
      seat("DWARF_6", 1).units.filter((unit) => unit.role === "CATAPULT"),
    ).toHaveLength(2);
    expect(seat("DWARF_6", 1).directive).toMatchObject({
      kind: "GUARD",
      garrison: 7,
      others: { kind: "ASSAULT" },
    });
    expect(
      (mission("DWARF_6").reinforcements ?? []).map((wave) => wave.round),
    ).toEqual([3, 5, 6, 9, 9, 12]);
    expect(seat("DWARF_6", 3).directive).toEqual([
      { kind: "NORMAL", untilRound: 8 },
      { kind: "RUSH" },
    ]);
  });

  it("keeps the third retune's lean starts, aggressive enemies and announced waves", () => {
    // `pulp_wars-hmyk.21` (CAMPAIGN.md section 20.4): D1, D2 and D5 start
    // like a skirmish or close to it (one town, a few units); no Dwarf start
    // holds more than one town but D6's two; every enemy with an army
    // marches, assaults or hunts; every wave of missions 1 to 6 is
    // announced and carries its story line.
    for (const id of ["DWARF_1", "DWARF_2", "DWARF_5"]) {
      expect(seat(id, 0).cities, id).toHaveLength(1);
      expect(seat(id, 0).units.length, id).toBeLessThanOrEqual(4);
      expect(seat(id, 0).technologies.length, id).toBeLessThanOrEqual(4);
    }
    for (const id of ORDER)
      expect(seat(id, 0).cities.length, id).toBeLessThanOrEqual(
        id === "DWARF_6" ? 2 : 1,
      );
    for (const id of ["DWARF_1", "DWARF_2", "DWARF_3", "DWARF_4", "DWARF_6"]) {
      const enemy = seat(id, 1);
      expect(enemy.directive, id).toBeDefined();
    }
    for (const id of ORDER) {
      const waves = mission(id).reinforcements ?? [];
      expect(waves.length, id).toBeGreaterThanOrEqual(2);
      for (const wave of waves) {
        expect(wave.line, `${id} round ${String(wave.round)}`).toBeTypeOf(
          "string",
        );
        expect(wave.announce, `${id} round ${String(wave.round)}`).toBe(true);
      }
    }
  });

  it("names every place and unit an objective talks about", () => {
    for (const entry of CHAPTER_DWARVES_V7.missions) {
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
    for (const entry of CHAPTER_DWARVES_V7.missions) {
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
      expect(text, where).not.toMatch(/DWARF|[A-Z]{2,}_[A-Z]/);
    }
  });
});
