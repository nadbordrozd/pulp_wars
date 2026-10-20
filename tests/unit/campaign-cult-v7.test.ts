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
      // Retune 3 (`pulp_wars-hmyk.21`): the clocks are about a fifth
      // shorter.
      { kind: "KILL", byRound: 8, bonus: ["WITHIN_ROUNDS 6", "UNIT_ALIVE"] },
      {
        kind: "CAPTURE",
        byRound: 15,
        bonus: ["WITHIN_ROUNDS 12", "KEEP_CITIES"],
      },
      {
        kind: "ESCORT",
        byRound: 13,
        bonus: ["WITHIN_ROUNDS 10", "KEEP_CITIES"],
      },
      {
        kind: "SURVIVE",
        byRound: undefined,
        bonus: ["KEEP_CITIES", "UNIT_ALIVE"],
      },
      { kind: "KILL", byRound: 16, bonus: ["WITHIN_ROUNDS 13", "UNIT_ALIVE"] },
      {
        kind: "CAPTURE",
        byRound: 16,
        bonus: ["WITHIN_ROUNDS 12", "UNIT_ALIVE"],
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

  it("builds the missions as the third retune left them", () => {
    // `pulp_wars-hmyk.21` (CAMPAIGN.md section 23.4, not play-tested): thin
    // or skirmish starts, bigger enemies that march early, announced waves.
    // Every wave of every mission has a story line and is announced.
    for (const id of ORDER)
      for (const wave of mission(id).reinforcements ?? []) {
        expect(wave.line, id).toBeTypeOf("string");
        expect(wave.announce, id).toBe(true);
      }
    // CU1: a skirmish start (Greyhood, three units, Gathering and
    // Leadership); Hobb is the south road's garrison of one; from round 3
    // the rest of the patrol storms Greyhood; a second patrol in round 5.
    expect(seat("CULT_1", 0).technologies).toEqual([
      "GATHERING",
      "ADMINISTRATION",
    ]);
    expect(seat("CULT_1", 0).units).toHaveLength(3);
    expect(seat("CULT_1", 1).directive).toEqual([
      expect.objectContaining({ kind: "GUARD", garrison: 1, untilRound: 3 }),
      expect.objectContaining({
        kind: "GUARD",
        garrison: 1,
        others: expect.objectContaining({ kind: "ASSAULT" }) as unknown,
      }),
    ]);
    expect(waves("CULT_1")).toEqual([{ seat: 1, round: 5 }]);
    // CU2: a thin start (one town, no Masses yet); the Marquis's archive
    // guard keeps six at Cinderfield from round 3 and sends the rest; three
    // waves.
    expect(seat("CULT_2", 0).cities).toHaveLength(1);
    expect(seat("CULT_2", 0).technologies).not.toContain("METALLURGY");
    expect(seat("CULT_2", 1).directive).toEqual([
      expect.objectContaining({ kind: "GUARD", garrison: 12, untilRound: 3 }),
      expect.objectContaining({
        kind: "GUARD",
        garrison: 6,
        others: { kind: "RUSH" },
        fromRound: 3,
      }),
    ]);
    expect(waves("CULT_2")).toEqual([
      { seat: 1, round: 4 },
      { seat: 1, round: 8 },
      { seat: 1, round: 12 },
    ]);
    // CU3: the tribes hunt the Galleon's lane with their boats until round
    // 3 and then sail on the Cove, without Boarding, rams or new
    // Plesiosaurs (hand play: a boarded escort); the Skimmers rush; three
    // waves of ships.
    expect(seat("CULT_3", 1).directive).toMatchObject([
      { kind: "GUARD", garrison: 1, ships: true, untilRound: 3 },
      { kind: "ASSAULT", fromRound: 3 },
    ]);
    for (const tech of ["SEAMANSHIP", "SUBMERSIBLES"])
      expect(seat("CULT_3", 1).forbiddenTechnologies, tech).toContain(tech);
    expect(seat("CULT_3", 2).directive).toEqual([
      { kind: "NORMAL", untilRound: 3 },
      { kind: "RUSH" },
    ]);
    expect(waves("CULT_3")).toEqual([
      { seat: 1, round: 3 },
      { seat: 2, round: 6 },
      { seat: 1, round: 9 },
    ]);
    // CU4: a thin start (the Seal-works alone, five units); no Steam Moles
    // or Gunners under the circle (hand play); two keep the Gate and the
    // rest storm the Seal-works from round 2; five waves.
    expect(seat("CULT_4", 0).cities).toHaveLength(1);
    expect(seat("CULT_4", 0).units).toHaveLength(5);
    for (const tech of ["MARKSMANSHIP", "FORTIFICATION"])
      expect(seat("CULT_4", 1).forbiddenTechnologies, tech).toContain(tech);
    expect(seat("CULT_4", 1).directive).toEqual([
      expect.objectContaining({ kind: "GUARD", garrison: 2, untilRound: 2 }),
      expect.objectContaining({
        kind: "GUARD",
        garrison: 2,
        others: expect.objectContaining({ kind: "ASSAULT" }) as unknown,
      }),
    ]);
    expect(seat("CULT_4", 2).directive).toEqual([
      { kind: "NORMAL", untilRound: 2 },
      { kind: "RUSH" },
    ]);
    expect(waves("CULT_4")).toEqual([
      { seat: 2, round: 4 },
      { seat: 1, round: 6 },
      { seat: 2, round: 8 },
      { seat: 1, round: 10 },
      { seat: 2, round: 12 },
    ]);
    // CU5: a skirmish start (the road to Stargazers and Hexers only); Rime guards her
    // own tile alone, so she never leaves the Crown (SAGA.md section 4,
    // E2's fallback), and from round 3 the rest of her guard sallies on
    // Hood Hollow; the sweets storm it from round 2; the Redcaps rush; five
    // waves.
    expect(seat("CULT_5", 0).technologies).toEqual([
      "GATHERING",
      "ADMINISTRATION",
      "HUNTING",
      "MARKSMANSHIP",
      "FORESTRY",
      "SAWMILLING",
    ]);
    expect(seat("CULT_5", 0).units).toHaveLength(4);
    const rime = tagged("CULT_5", 1, "RIME");
    const crown = [
      { x0: rime?.at.x, y0: rime?.at.y, x1: rime?.at.x, y1: rime?.at.y },
    ];
    expect(seat("CULT_5", 1).directive).toEqual([
      { kind: "GUARD", zone: crown, garrison: 1, untilRound: 3 },
      {
        kind: "GUARD",
        zone: crown,
        garrison: 1,
        others: expect.objectContaining({ kind: "ASSAULT" }) as unknown,
        fromRound: 3,
      },
    ]);
    expect(seat("CULT_5", 2).directive).toEqual([
      { kind: "NORMAL", untilRound: 2 },
      expect.objectContaining({ kind: "ASSAULT" }),
    ]);
    expect(seat("CULT_5", 3).directive).toEqual({ kind: "RUSH" });
    expect(waves("CULT_5")).toEqual([
      { seat: 1, round: 5 },
      { seat: 2, round: 6 },
      { seat: 1, round: 9 },
      { seat: 2, round: 11 },
      { seat: 1, round: 13 },
    ]);
    // CU6, the saga's hardest: The Stars Are Right (Explosives) and Favour
    // short of a Great Summoning, on a thin start (ten units, seven
    // technologies); twelve keep the Gate and six storm the Seal-works from
    // round 3, with no Gunners or Steam Moles; the Rangers rush from round
    // 2 and the dead storm the Seal-works from round 3; nine waves.
    expect(seat("CULT_6", 0).technologies).toContain("EXPLOSIVES");
    expect(seat("CULT_6", 0).technologies).toHaveLength(7);
    expect(seat("CULT_6", 0).units).toHaveLength(10);
    expect(seat("CULT_6", 0).favour).toBe(6);
    expect(seat("CULT_6", 1).directive).toMatchObject([
      { kind: "GUARD", garrison: 18, untilRound: 3 },
      { kind: "GUARD", garrison: 12, others: { kind: "ASSAULT" } },
    ]);
    for (const tech of ["MARKSMANSHIP", "FORTIFICATION"])
      expect(seat("CULT_6", 1).forbiddenTechnologies, tech).toContain(tech);
    expect(seat("CULT_6", 1).units[0]).toMatchObject({ role: "JUGGERNAUT" });
    expect(seat("CULT_6", 2).directive).toEqual([
      { kind: "NORMAL", untilRound: 2 },
      { kind: "RUSH" },
    ]);
    expect(seat("CULT_6", 3).directive).toEqual([
      { kind: "NORMAL", untilRound: 3 },
      expect.objectContaining({ kind: "ASSAULT" }),
    ]);
    expect(waves("CULT_6")).toEqual([
      { seat: 2, round: 4 },
      { seat: 3, round: 5 },
      { seat: 1, round: 6 },
      { seat: 2, round: 7 },
      { seat: 3, round: 9 },
      { seat: 2, round: 10 },
      { seat: 1, round: 11 },
      { seat: 3, round: 12 },
      { seat: 2, round: 13 },
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
