import { describe, expect, it } from "vitest";
import { validateMissionDirectivesV7 } from "../../src/ai/v7-directives";
import { CAMPAIGNS_V7 } from "../../src/campaign/campaigns";
import { CHAPTER_CULT_V7 } from "../../src/campaign/chapter-cult";
import {
  missionByIdV7,
  missionSeatFactionsV7,
  type MissionDefinitionV7,
} from "../../src/engine/index";

// The Cult campaign, "The Long Night" (`pulp_wars-hmyk.12`;
// docs/product/SAGA.md section 3.9, docs/product/CAMPAIGN.md, the Cult
// campaign's section): the saga's finale, six built missions of rising
// difficulty, one seat per faction, the clocks and stars that hand play
// set, and short player-facing text that never names a tile coordinate.

const ORDER = ["CULT_1", "CULT_2", "CULT_3", "CULT_4", "CULT_5", "CULT_6"];

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
    { where: "title", text: CHAPTER_CULT_V7.title },
    { where: "intro", text: CHAPTER_CULT_V7.intro },
    { where: "outro", text: CHAPTER_CULT_V7.outro },
  ];
  for (const entry of CHAPTER_CULT_V7.missions) {
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

describe("The Long Night", () => {
  it("lists six built missions in order, all registered and none hidden", () => {
    expect(CHAPTER_CULT_V7.number).toBe(9);
    expect(CHAPTER_CULT_V7.missions.map((entry) => entry.missionId)).toEqual(
      ORDER,
    );
    expect(CHAPTER_CULT_V7.missions.map((entry) => entry.number)).toEqual([
      1, 2, 3, 4, 5, 6,
    ]);
    for (const entry of CHAPTER_CULT_V7.missions) {
      expect(entry.planned, entry.missionId).toBeUndefined();
      expect(mission(entry.missionId).hidden, entry.missionId).toBeUndefined();
    }
    expect(CHAPTER_CULT_V7.missions.map((entry) => entry.format)).toEqual([
      "KILL",
      "CAPTURE",
      "ESCORT",
      "SURVIVE",
      "KILL",
      "CAPTURE",
    ]);
    expect(Object.isFrozen(CHAPTER_CULT_V7)).toBe(true);
    expect(Object.isFrozen(CHAPTER_CULT_V7.missions)).toBe(true);
  });

  it("is the saga's finale on the campaign map, and the prologue points at the saga", () => {
    const cult = CAMPAIGNS_V7.find((campaign) => campaign.id === "CULT");
    expect(cult).toMatchObject({
      title: "The Long Night",
      subtitle: "The finale",
      tier: 3,
      chapter: CHAPTER_CULT_V7,
    });
    // The last closing is the saga's ending, the outro its epilogue.
    const last = CHAPTER_CULT_V7.missions.at(-1);
    expect(last?.closing).toMatch(/It eats the door first/);
    expect(CHAPTER_CULT_V7.outro).toMatch(/invoices/);
    expect(CHAPTER_CULT_V7.outro).toMatch(/blinks\.$/);
  });

  it("seats you as the Cult with Mr. Pettigrew and never gives two seats one faction", () => {
    for (const id of ORDER) {
      const definition = mission(id);
      expect(missionSeatFactionsV7(seat(id, 0)), id).toEqual(["CULT"]);
      const factions = definition.seats.map((item) => item.faction);
      expect(new Set(factions).size, id).toBe(factions.length);
      expect(() => validateMissionDirectivesV7(definition), id).not.toThrow();
    }
    // Pettigrew is the Lodge's minute-taker, an Initiate, at the first
    // meeting and a Summoner from the second; the Galleon carries the egg.
    expect(tagged("CULT_1", 0, "PETTIGREW")).toMatchObject({
      role: "FIGHTER",
    });
    for (const id of ["CULT_2", "CULT_4", "CULT_5", "CULT_6"])
      expect(tagged(id, 0, "PETTIGREW"), id).toMatchObject({
        role: "CAPTAIN",
      });
    expect(tagged("CULT_3", 0, "GALLEON")).toMatchObject({
      role: "BATTLESHIP",
    });
    expect(tagged("CULT_5", 0, "VOLE")).toMatchObject({ role: "CATAPULT" });
    expect(tagged("CULT_1", 1, "HOBB")).toMatchObject({ role: "RAIDER" });
    expect(tagged("CULT_5", 1, "RIME")).toMatchObject({ role: "CAPTAIN" });
    expect(
      ORDER.map((id) => mission(id).seats.map((item) => item.faction)),
    ).toEqual([
      ["CULT", "ORIGINAL"],
      ["CULT", "UNDEAD"],
      ["CULT", "DINOSAUR", "MARTIAN"],
      ["CULT", "DWARF", "GOBLIN"],
      ["CULT", "ICE_FOLK", "CANDY", "GOBLIN"],
      ["CULT", "DWARF", "ORIGINAL", "UNDEAD"],
    ]);
    expect(mission("CULT_1").teams).toBeUndefined();
    expect(mission("CULT_2").teams).toBeUndefined();
    expect(mission("CULT_3").teams).toEqual([0, 1, 1]);
    expect(mission("CULT_4").teams).toEqual([0, 1, 1]);
    // The Redcaps are hired for the climb.
    expect(mission("CULT_5").teams).toEqual([0, 1, 1, 0]);
    // On the Long Night the whole Pact stands against the Lodge.
    expect(mission("CULT_6").teams).toEqual([0, 1, 1, 1]);
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
      // Retune 4 (`pulp_wars-hmyk.33`): lax conquest clocks, a meaningful
      // escort and kill clock, the hold kept.
      { kind: "KILL", byRound: 12, bonus: ["WITHIN_ROUNDS 8", "UNIT_ALIVE"] },
      {
        kind: "CAPTURE",
        byRound: 20,
        bonus: ["WITHIN_ROUNDS 15", "KEEP_CITIES"],
      },
      {
        kind: "ESCORT",
        byRound: 12,
        bonus: ["WITHIN_ROUNDS 10", "KEEP_CITIES"],
      },
      {
        kind: "SURVIVE",
        byRound: undefined,
        bonus: ["KEEP_CITIES", "UNIT_ALIVE"],
      },
      { kind: "KILL", byRound: 18, bonus: ["WITHIN_ROUNDS 14", "UNIT_ALIVE"] },
      {
        kind: "CAPTURE",
        byRound: 18,
        bonus: ["WITHIN_ROUNDS 13", "UNIT_ALIVE"],
      },
    ]);
    expect(mission("CULT_1").objective).toMatchObject({ units: ["HOBB"] });
    expect(mission("CULT_2").objective).toMatchObject({
      places: ["CINDERFIELD"],
    });
    expect(mission("CULT_3").objective).toMatchObject({
      unit: "GALLEON",
      to: "LAMPLIGHT_COVE",
      within: 1,
    });
    expect(mission("CULT_4").objective).toMatchObject({
      kind: "SURVIVE",
      rounds: 12,
      protect: [{ place: "SEAL_WORKS" }],
    });
    expect(mission("CULT_5").objective).toMatchObject({ units: ["RIME"] });
    expect(mission("CULT_6").objective).toMatchObject({
      places: ["DEEP_GATE"],
    });
    const alive = (id: string) =>
      mission(id).objective.bonus?.find((bonus) => bonus.kind === "UNIT_ALIVE");
    for (const id of ["CULT_1", "CULT_4", "CULT_6"])
      expect(alive(id), id).toEqual({ kind: "UNIT_ALIVE", unit: "PETTIGREW" });
    expect(alive("CULT_5")).toEqual({ kind: "UNIT_ALIVE", unit: "VOLE" });
  });

  it("builds the missions as the fourth retune left them", () => {
    // `pulp_wars-hmyk.33` (CAMPAIGN.md section 23.5, hand-played): eased
    // from the third retune toward the middle. The enemies outnumber the
    // Lodge from the start and attack, so the difficulty comes from them
    // rather than from waves or the clock (the Redcaps of CU5 are hired
    // help and do not count for the Lodge).
    for (const id of ORDER) {
      const definition = mission(id);
      const side = (index: number) => definition.teams?.[index] ?? index;
      const enemies = definition.seats
        .filter((_, index) => side(index) !== side(0))
        .reduce((sum, item) => sum + item.units.length, 0);
      expect(enemies, id).toBeGreaterThan(seat(id, 0).units.length);
    }
    // Every hostile seat attacks: RUSH, an ASSAULT, or a GUARD that sends
    // the rest; CU3's tribes hunt the Galleon's lane with their boats (a
    // GUARD of the lane with ships, the original's E7).
    for (const id of ORDER) {
      const definition = mission(id);
      const side = (index: number) => definition.teams?.[index] ?? index;
      for (const [index, item] of definition.seats.entries()) {
        if (side(index) === side(0)) continue;
        const entries = Array.isArray(item.directive)
          ? item.directive
          : [item.directive];
        const last = entries[entries.length - 1];
        expect(
          last?.kind === "RUSH" ||
            last?.kind === "ASSAULT" ||
            (last?.kind === "GUARD" &&
              (last.others !== undefined || last.ships === true)),
          `${id} seat ${String(index)}`,
        ).toBe(true);
      }
    }
    // Some economy is back: every start has technology, at least 5 Coins, a
    // town of level 2 or more and its Favour set, and every mission has
    // neutral villages to take.
    for (const id of ORDER) {
      const start = seat(id, 0);
      expect(start.technologies.length, id).toBeGreaterThan(0);
      expect(start.coins, id).toBeGreaterThanOrEqual(5);
      expect(start.favour, id).toBeTypeOf("number");
      expect(
        Math.max(...start.cities.map((city) => city.level ?? 1)),
        id,
      ).toBeGreaterThanOrEqual(2);
      expect(mission(id).villages.length, id).toBeGreaterThan(0);
    }
    // Waves only fine-tune: each is announced with a story line.
    for (const id of ORDER)
      for (const wave of mission(id).reinforcements ?? []) {
        expect(wave.line, id).toBeTypeOf("string");
        expect(wave.announce, id).toBe(true);
      }
    expect(ORDER.map((id) => waves(id))).toEqual([
      [],
      [],
      [{ seat: 1, round: 4 }],
      [{ seat: 1, round: 8 }],
      [],
      [{ seat: 2, round: 8 }],
    ]);
    // CU1: Greyhood with Pettigrew, Mallory and an Initiate (Leadership
    // and Hunting); nine Rangers: Hobb and his escort keep the south road,
    // the rest storm Greyhood from round 3.
    expect(seat("CULT_1", 0).technologies).toEqual([
      "GATHERING",
      "ADMINISTRATION",
      "HUNTING",
    ]);
    expect(seat("CULT_1", 0).units).toHaveLength(3);
    expect(seat("CULT_1", 1).units).toHaveLength(9);
    expect(seat("CULT_1", 1).directive).toEqual([
      expect.objectContaining({ kind: "GUARD", garrison: 2, untilRound: 3 }),
      expect.objectContaining({
        kind: "GUARD",
        garrison: 2,
        others: expect.objectContaining({ kind: "ASSAULT" }) as unknown,
      }),
    ]);
    // CU2: one town (no Masses yet), five units; thirteen dead with three
    // Wights; all hold to round 3, then six stay and the rest rush.
    expect(seat("CULT_2", 0).cities).toHaveLength(1);
    expect(seat("CULT_2", 0).units).toHaveLength(5);
    expect(seat("CULT_2", 0).technologies).not.toContain("METALLURGY");
    expect(seat("CULT_2", 1).units).toHaveLength(13);
    expect(
      seat("CULT_2", 1).units.filter((unit) => unit.role === "SWORDSMAN"),
    ).toHaveLength(3);
    expect(seat("CULT_2", 1).directive).toEqual([
      expect.objectContaining({ kind: "GUARD", garrison: 13, untilRound: 3 }),
      expect.objectContaining({
        kind: "GUARD",
        garrison: 6,
        others: { kind: "RUSH" },
        fromRound: 3,
      }),
    ]);
    // CU3: the original's seven with two Krakens; the tribes hunt the lane
    // all game with their boats, without Boarding, rams or new
    // Plesiosaurs; the Skimmers rush; the War Raft is the one wave.
    expect(seat("CULT_3", 0).units).toHaveLength(7);
    expect(
      seat("CULT_3", 0).units.filter((unit) => unit.role === "SUBMARINE"),
    ).toHaveLength(2);
    expect(seat("CULT_3", 1).directive).toMatchObject({
      kind: "GUARD",
      garrison: 1,
      ships: true,
    });
    for (const tech of ["SEAMANSHIP", "SUBMERSIBLES"])
      expect(seat("CULT_3", 1).forbiddenTechnologies, tech).toContain(tech);
    expect(seat("CULT_3", 2).directive).toEqual([
      { kind: "NORMAL", untilRound: 3 },
      { kind: "RUSH" },
    ]);
    expect((mission("CULT_3").reinforcements ?? [])[0]?.units).toEqual([
      expect.objectContaining({ role: "BATTLESHIP" }),
    ]);
    // CU4: the Seal-works and Hood Hollow, seven units; no Steam Moles or
    // Gunners under the circle (hand play); two keep the Gate and the rest
    // storm the Seal-works from round 4, and so does the horde; the
    // story's Steam Tank is the one wave.
    expect(seat("CULT_4", 0).cities).toHaveLength(2);
    expect(seat("CULT_4", 0).units).toHaveLength(7);
    for (const tech of ["MARKSMANSHIP", "FORTIFICATION"])
      expect(seat("CULT_4", 1).forbiddenTechnologies, tech).toContain(tech);
    expect(seat("CULT_4", 1).directive).toEqual([
      expect.objectContaining({ kind: "GUARD", garrison: 2, untilRound: 3 }),
      expect.objectContaining({
        kind: "GUARD",
        garrison: 2,
        others: expect.objectContaining({ kind: "ASSAULT" }) as unknown,
      }),
    ]);
    expect(seat("CULT_4", 2).directive).toEqual([
      { kind: "NORMAL", untilRound: 3 },
      expect.objectContaining({ kind: "ASSAULT" }),
    ]);
    expect((mission("CULT_4").reinforcements ?? [])[0]?.units).toEqual([
      expect.objectContaining({ role: "JUGGERNAUT" }),
    ]);
    // CU5: eight units with Masses known; Rime guards her own tile alone,
    // so she never leaves the Crown (SAGA.md section 4, E2's fallback);
    // one camp only and no Familiars for the guard, who sally from round
    // 8; the sweets storm from round 7; the Redcaps rush.
    expect(seat("CULT_5", 0).units).toHaveLength(8);
    expect(seat("CULT_5", 0).technologies).toContain("METALLURGY");
    expect(seat("CULT_5", 1).cities).toHaveLength(1);
    expect(seat("CULT_5", 1).forbiddenTechnologies).toContain("SCOUTING");
    const rime = tagged("CULT_5", 1, "RIME");
    const crown = [
      { x0: rime?.at.x, y0: rime?.at.y, x1: rime?.at.x, y1: rime?.at.y },
    ];
    expect(seat("CULT_5", 1).directive).toEqual([
      { kind: "GUARD", zone: crown, garrison: 1, untilRound: 8 },
      {
        kind: "GUARD",
        zone: crown,
        garrison: 1,
        others: expect.objectContaining({ kind: "ASSAULT" }) as unknown,
        fromRound: 8,
      },
    ]);
    expect(seat("CULT_5", 2).directive).toEqual([
      { kind: "NORMAL", untilRound: 6 },
      expect.objectContaining({ kind: "ASSAULT" }),
    ]);
    expect(seat("CULT_5", 3).directive).toEqual({ kind: "RUSH" });
    // CU6, the finale: the Lodge's eighteen with The Stars Are Right
    // (Explosives) and Favour short of a Great Summoning; the dwarves have
    // no Gunners, Steam Moles or new Steam Tanks (no Metallurgy), hold the
    // Gate with all twelve to round 5 and then send three; the Rangers
    // rush from round 5 and the dead storm the Seal-works from round 7.
    expect(seat("CULT_6", 0).technologies).toEqual(
      expect.arrayContaining(["EXPLOSIVES", "METALLURGY"]),
    );
    expect(seat("CULT_6", 0).units).toHaveLength(18);
    expect(seat("CULT_6", 0).favour).toBe(10);
    expect(seat("CULT_6", 1).units).toHaveLength(12);
    expect(seat("CULT_6", 1).directive).toMatchObject([
      { kind: "GUARD", garrison: 12, untilRound: 5 },
      { kind: "GUARD", garrison: 9, others: { kind: "ASSAULT" } },
    ]);
    for (const tech of ["METALLURGY", "MARKSMANSHIP", "FORTIFICATION"])
      expect(seat("CULT_6", 1).forbiddenTechnologies, tech).toContain(tech);
    expect(seat("CULT_6", 1).units[0]).toMatchObject({ role: "JUGGERNAUT" });
    expect(seat("CULT_6", 2).directive).toEqual([
      { kind: "NORMAL", untilRound: 4 },
      { kind: "RUSH" },
    ]);
    expect(seat("CULT_6", 3).directive).toEqual([
      { kind: "NORMAL", untilRound: 6 },
      expect.objectContaining({ kind: "ASSAULT" }),
    ]);
  });

  it("names every place and unit an objective talks about", () => {
    for (const entry of CHAPTER_CULT_V7.missions) {
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
    for (const entry of CHAPTER_CULT_V7.missions) {
      expect(entry.hints.length).toBeGreaterThan(0);
      expect(entry.hints.length).toBeLessThanOrEqual(3);
      for (const hint of entry.hints)
        expect(hint.length, hint).toBeLessThanOrEqual(60);
      expect(entry.briefing.length, entry.missionId).toBeLessThanOrEqual(400);
      expect(entry.closing.length, entry.missionId).toBeLessThanOrEqual(280);
      expect(entry.objective.length, entry.missionId).toBeLessThanOrEqual(44);
      expect(entry.objective).toMatch(/\.$/);
      // The briefings are the minutes of the Lodge's meetings.
      expect(entry.briefing, entry.missionId).toMatch(/Item one/);
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
