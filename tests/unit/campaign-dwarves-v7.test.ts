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
    }
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
      // The fourth retune (`pulp_wars-hmyk.30`): the conquests' clocks lax
      // again, the escorts and the hunt still pressing (D1's hold stays at
      // twelve: a shorter hold would be easier).
      {
        kind: "CAPTURE",
        byRound: 24,
        bonus: ["WITHIN_ROUNDS 18", "KEEP_CITIES"],
      },
      {
        kind: "ESCORT",
        byRound: 18,
        bonus: ["WITHIN_ROUNDS 14", "UNIT_ALIVE"],
      },
      { kind: "KILL", byRound: 16, bonus: ["WITHIN_ROUNDS 12", "KEEP_CITIES"] },
      {
        kind: "ESCORT",
        byRound: 20,
        bonus: ["WITHIN_ROUNDS 16", "KEEP_CITIES"],
      },
      {
        kind: "CAPTURE",
        byRound: 20,
        bonus: ["WITHIN_ROUNDS 15", "UNIT_ALIVE"],
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
    // D1: the Grey Shift knows nothing and storms Copperstep; the old
    // foreman's wave comes in round 7.
    expect(seat("DWARF_1", 1).technologies).toEqual([]);
    expect(seat("DWARF_1", 1).directive).toMatchObject({ kind: "ASSAULT" });
    expect(
      (mission("DWARF_1").reinforcements ?? []).map((wave) => wave.round),
    ).toEqual([7]);
    // D2: the clan learns Gathering and Hunting only; each camp keeps three
    // and the rest march from round 2; the dwarves start with a Steam Mole.
    expect(seat("DWARF_2", 1).technologies).toEqual(["GATHERING", "HUNTING"]);
    expect(seat("DWARF_2", 1).directive).toEqual([
      expect.objectContaining({ kind: "GUARD", garrison: 9, untilRound: 2 }),
      expect.objectContaining({
        kind: "GUARD",
        garrison: 9,
        others: { kind: "RUSH" },
      }),
    ]);
    expect(seat("DWARF_2", 0).technologies).toEqual([
      "HUNTING",
      "MARKSMANSHIP",
      "DRILL",
      "FORTIFICATION",
    ]);
    expect(seat("DWARF_2", 0).units.some((unit) => unit.role === "GUARD")).toBe(
      true,
    );
    // D3: nobody climbs the peaks; the diggers hold their cave until
    // round 5; ten dead hold the gallery.
    for (const tech of ["ENGINEERING", "METALLURGY"])
      expect(mission("DWARF_3").forbiddenTechnologies, tech).toContain(tech);
    expect(seat("DWARF_3", 2).directive).toEqual([
      expect.objectContaining({ kind: "HOLD", untilRound: 5 }),
      expect.objectContaining({ kind: "RUSH" }),
    ]);
    expect(seat("DWARF_3", 1).directive).toMatchObject({
      kind: "GUARD",
      garrison: 10,
    });
    // D4: the Mothership keeps four at its field and sends the rest at the
    // Hold.
    expect(seat("DWARF_4", 1).directive).toMatchObject({
      kind: "GUARD",
      garrison: 4,
      others: { kind: "ASSAULT" },
    });
    // D5: a Dwarf navy without Submersibles, whose only Ironclad is the
    // Anvil; the Lodge's four ships and no Shipyard builders; the Redcaps
    // hunt from round 3.
    expect(seat("DWARF_5", 0).technologies).not.toContain("SUBMERSIBLES");
    expect(seat("DWARF_5", 0).forbiddenTechnologies).toEqual([
      "NAVAL_ENGINEERING",
    ]);
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
    // D6: two Liches in the bowl and seven on the Gate; no Gyrocopter at
    // the start; the Rangers attack from round 6.
    expect(
      seat("DWARF_6", 1).units.filter((unit) => unit.role === "CATAPULT"),
    ).toHaveLength(2);
    expect(seat("DWARF_6", 1).directive).toMatchObject({
      kind: "GUARD",
      garrison: 7,
      others: { kind: "ASSAULT" },
    });
    expect(
      seat("DWARF_6", 0).units.some((unit) => unit.role === "RAIDER"),
    ).toBe(false);
    expect(seat("DWARF_6", 0).technologies).not.toContain("SCOUTING");
    expect(seat("DWARF_6", 3).directive).toEqual([
      { kind: "NORMAL", untilRound: 6 },
      { kind: "RUSH" },
    ]);
  });

  it("keeps the fourth retune's strong enemy starts (pulp_wars-hmyk.30)", () => {
    // CAMPAIGN.md section 20.5: every enemy side starts with more units than
    // you (the Rangers in D6 are yours and do not count), and the difficulty
    // comes from them rather than from waves.
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
    // Every enemy with an army marches, assaults or holds its ground.
    for (const id of ["DWARF_1", "DWARF_2", "DWARF_3", "DWARF_4", "DWARF_6"])
      expect(seat(id, 1).directive, id).toBeDefined();
    // One wave is left in the campaign, the old foreman's in D1, announced
    // with its story line.
    const waves = (id: string) =>
      (mission(id).reinforcements ?? []).map((wave) => wave.round);
    expect(ORDER.map(waves)).toEqual([[7], [], [], [], [], []]);
    for (const id of ORDER)
      for (const wave of mission(id).reinforcements ?? []) {
        expect(wave.line, id).toBeTypeOf("string");
        expect(wave.announce, id).toBe(true);
      }
    // Some economy back: D1, D3, D4 and D6 start with two towns; D2 and D5
    // with one.
    expect(ORDER.map((id) => seat(id, 0).cities.length)).toEqual([
      2, 1, 2, 2, 1, 2,
    ]);
    for (const [id, revision] of [
      ["DWARF_1", 3],
      ["DWARF_2", 3],
      ["DWARF_3", 3],
      ["DWARF_4", 4],
      ["DWARF_5", 4],
      ["DWARF_6", 4],
    ] as const)
      expect(mission(id).revision, id).toBe(revision);
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
