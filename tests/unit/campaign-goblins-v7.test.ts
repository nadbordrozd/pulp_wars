import { describe, expect, it } from "vitest";
import { validateMissionDirectivesV7 } from "../../src/ai/v7-directives";
import { CHAPTER_GOBLINS_V7 } from "../../src/campaign/chapter-goblins";
import {
  missionByIdV7,
  missionSeatFactionsV7,
  type MissionDefinitionV7,
} from "../../src/engine/index";

// The Goblin campaign, "The Big Score" (`pulp_wars-hmyk.8`;
// docs/product/SAGA.md section 3.3, docs/product/CAMPAIGN.md, the Goblin
// campaign's section): six built missions of rising difficulty, one seat
// per faction, the clocks and stars that hand play set, and short
// player-facing text that never names a tile coordinate.

const ORDER = [
  "GOBLIN_1",
  "GOBLIN_2",
  "GOBLIN_3",
  "GOBLIN_4",
  "GOBLIN_5",
  "GOBLIN_6",
];

function mission(id: string): MissionDefinitionV7 {
  const found = missionByIdV7(id);
  if (found === null) throw new Error(`${id} is not registered`);
  return found;
}

function seat(id: string, index: number): MissionDefinitionV7["seats"][number] {
  return mission(id).seats[index] as MissionDefinitionV7["seats"][number];
}

function tagged(id: string, tag: string) {
  return seat(id, 0).units.find((unit) => unit.tag === tag);
}

/** Every player-facing string of the chapter, with where it comes from. */
function playerText(): { readonly where: string; readonly text: string }[] {
  const texts = [
    { where: "title", text: CHAPTER_GOBLINS_V7.title },
    { where: "intro", text: CHAPTER_GOBLINS_V7.intro },
    { where: "outro", text: CHAPTER_GOBLINS_V7.outro },
  ];
  for (const entry of CHAPTER_GOBLINS_V7.missions) {
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

describe("The Big Score", () => {
  it("lists six built missions in order, all registered and none hidden", () => {
    expect(CHAPTER_GOBLINS_V7.missions.map((entry) => entry.missionId)).toEqual(
      ORDER,
    );
    expect(CHAPTER_GOBLINS_V7.missions.map((entry) => entry.number)).toEqual([
      1, 2, 3, 4, 5, 6,
    ]);
    for (const entry of CHAPTER_GOBLINS_V7.missions) {
      expect(entry.planned, entry.missionId).toBeUndefined();
      expect(mission(entry.missionId).hidden, entry.missionId).toBeUndefined();
      expect([...entry.unlocks]).toEqual([]);
    }
    expect(CHAPTER_GOBLINS_V7.startingFactions).toEqual([]);
    expect(CHAPTER_GOBLINS_V7.missions.map((entry) => entry.format)).toEqual([
      "CONQUEST",
      "CAPTURE",
      "KILL",
      "CAPTURE",
      "SURVIVE",
      "ESCORT",
    ]);
    expect(Object.isFrozen(CHAPTER_GOBLINS_V7)).toBe(true);
    expect(Object.isFrozen(CHAPTER_GOBLINS_V7.missions)).toBe(true);
  });

  it("seats you as the Goblins with the crew and never gives two seats one faction", () => {
    for (const id of ORDER) {
      const definition = mission(id);
      expect(missionSeatFactionsV7(seat(id, 0)), id).toEqual(["GOBLIN"]);
      const factions = definition.seats.map((item) => item.faction);
      expect(new Set(factions).size, id).toBe(factions.length);
      expect(() => validateMissionDirectivesV7(definition), id).not.toThrow();
    }
    // Grubnak is a Warboss, Snikkit a Goblin, Mogga an Ogre, and the
    // getaway cart a Scrap Buggy.
    expect(tagged("GOBLIN_1", "GRUBNAK")).toMatchObject({ role: "CAPTAIN" });
    expect(tagged("GOBLIN_1", "SNIKKIT")).toMatchObject({ role: "FIGHTER" });
    expect(tagged("GOBLIN_4", "SNIKKIT")).toMatchObject({ role: "FIGHTER" });
    expect(tagged("GOBLIN_2", "MOGGA")).toMatchObject({ role: "SWORDSMAN" });
    expect(tagged("GOBLIN_5", "MOGGA")).toMatchObject({ role: "SWORDSMAN" });
    expect(tagged("GOBLIN_6", "GETAWAY")).toMatchObject({ role: "KNIGHT" });
    // The island's missions are three-way brawls (rival seats, no teams);
    // in the getaway the Lodge and the Unquiet are one side and the Thane's
    // escort is yours.
    for (const id of ["GOBLIN_1", "GOBLIN_2", "GOBLIN_3", "GOBLIN_4"])
      expect(mission(id).teams, id).toBeUndefined();
    expect(mission("GOBLIN_4").seats).toHaveLength(3);
    expect(mission("GOBLIN_5").seats).toHaveLength(3);
    expect(mission("GOBLIN_5").teams).toBeUndefined();
    expect(mission("GOBLIN_6").teams).toEqual([0, 1, 1, 0]);
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
    // The third retune (`pulp_wars-hmyk.21`): clocks cut by about a fifth.
    expect(summary).toEqual([
      {
        kind: "DOMINATION",
        byRound: 14,
        bonus: ["WITHIN_ROUNDS 10", "UNIT_ALIVE"],
      },
      {
        kind: "CAPTURE",
        byRound: 14,
        bonus: ["WITHIN_ROUNDS 12", "KEEP_CITIES"],
      },
      { kind: "KILL", byRound: 13, bonus: ["WITHIN_ROUNDS 10", "KEEP_CITIES"] },
      {
        kind: "CAPTURE",
        byRound: 16,
        bonus: ["WITHIN_ROUNDS 13", "UNIT_ALIVE"],
      },
      {
        kind: "SURVIVE",
        byRound: undefined,
        bonus: ["KEEP_CITIES", "UNIT_ALIVE"],
      },
      {
        kind: "ESCORT",
        byRound: 16,
        bonus: ["WITHIN_ROUNDS 13", "KEEP_CITIES"],
      },
    ]);
    expect(mission("GOBLIN_5").objective).toMatchObject({
      kind: "SURVIVE",
      rounds: 16,
      protect: [{ place: "SMUGGLERS_ROCK" }],
    });
    expect(mission("GOBLIN_6").objective).toMatchObject({
      unit: "GETAWAY",
      to: "IRONBRAID_GATE",
      within: 2,
    });
    const alive = (id: string) =>
      mission(id).objective.bonus?.find((bonus) => bonus.kind === "UNIT_ALIVE");
    expect(alive("GOBLIN_1")).toEqual({ kind: "UNIT_ALIVE", unit: "SNIKKIT" });
    expect(alive("GOBLIN_4")).toEqual({ kind: "UNIT_ALIVE", unit: "SNIKKIT" });
    expect(alive("GOBLIN_5")).toEqual({ kind: "UNIT_ALIVE", unit: "MOGGA" });
  });

  it("builds the missions as hand play left them", () => {
    // G1 (third retune): the fort and its toll keep three and the rest
    // march from round 3.
    expect(seat("GOBLIN_1", 1).directive).toEqual([
      expect.objectContaining({ kind: "GUARD", garrison: 3, untilRound: 3 }),
      expect.objectContaining({
        kind: "GUARD",
        garrison: 3,
        others: { kind: "RUSH" },
      }),
    ]);
    // G2: the Unquiet keep four on the cove and send the rest from round 3;
    // they have no Leadership and no Land Grants.
    expect(seat("GOBLIN_2", 1).directive).toEqual([
      expect.objectContaining({ kind: "GUARD", garrison: 4, untilRound: 3 }),
      expect.objectContaining({
        kind: "GUARD",
        garrison: 4,
        others: { kind: "RUSH" },
      }),
    ]);
    for (const tech of ["ADMINISTRATION", "PLANNING"])
      expect(seat("GOBLIN_2", 1).forbiddenTechnologies, tech).toContain(tech);
    // G3: Snapjaw is a Plesiosaur one kill from Alpha; the crew knows no
    // Submersibles (it starts with one Diving Barrel it cannot rebuild) and
    // the tribes may not learn them; the tribes hunt the wharf from round 2.
    expect(seat("GOBLIN_3", 1).units).toContainEqual(
      expect.objectContaining({ tag: "SNAPJAW", role: "SUBMARINE", kills: 2 }),
    );
    expect(seat("GOBLIN_3", 0).technologies).not.toContain("SUBMERSIBLES");
    expect(seat("GOBLIN_3", 0).units).toContainEqual(
      expect.objectContaining({ role: "SUBMARINE" }),
    );
    expect(seat("GOBLIN_3", 1).forbiddenTechnologies).toContain("SUBMERSIBLES");
    expect(seat("GOBLIN_3", 1).directive).toEqual([
      { kind: "NORMAL", untilRound: 2 },
      { kind: "RUSH" },
    ]);
    // G4: the Moon Gun on the hill above the neck; ten men at the port,
    // seven of them on the headland; no ships; the tribes storm Egg Rock;
    // four announced waves.
    const g4 = mission("GOBLIN_4");
    expect(g4.curiosities).toEqual([{ kind: "MOON_GUN", at: { x: 2, y: 1 } }]);
    expect(seat("GOBLIN_4", 1).units).toHaveLength(10);
    expect(seat("GOBLIN_4", 1).directive).toEqual([
      expect.objectContaining({ kind: "GUARD", garrison: 7, untilRound: 3 }),
      expect.objectContaining({
        kind: "GUARD",
        garrison: 7,
        others: { kind: "RUSH" },
      }),
    ]);
    expect(seat("GOBLIN_4", 2).directive).toEqual([
      { kind: "NORMAL", untilRound: 3 },
      { kind: "ASSAULT", target: { x: 6, y: 2 } },
    ]);
    expect(g4.forbiddenTechnologies).toContain("SHORECRAFT");
    expect((g4.reinforcements ?? []).map((wave) => wave.round)).toEqual([
      4, 6, 8, 11,
    ]);
    // G5: the loyalists rush, the saucers go for the Rock, seven enemy
    // waves, and the raft crews land in round 13.
    expect(seat("GOBLIN_5", 1).directive).toEqual({ kind: "RUSH" });
    expect(seat("GOBLIN_5", 2).directive).toMatchObject({ kind: "ASSAULT" });
    expect(
      (mission("GOBLIN_5").reinforcements ?? [])
        .filter((wave) => wave.seat !== 0)
        .map((wave) => wave.round)
        .sort((left, right) => left - right),
    ).toEqual([3, 4, 6, 8, 9, 12, 12]);
    expect(
      (mission("GOBLIN_5").reinforcements ?? [])
        .filter((wave) => wave.seat === 0)
        .map((wave) => wave.round),
    ).toEqual([13]);
    // G6: the Lodge keeps four at its camps and sends the rest at the Hall;
    // the Thane's escort holds the Gate.
    expect(seat("GOBLIN_6", 1).directive).toMatchObject({
      kind: "GUARD",
      garrison: 4,
      others: { kind: "ASSAULT" },
    });
    expect(seat("GOBLIN_6", 3)).toMatchObject({
      faction: "DWARF",
      directive: { kind: "HOLD" },
    });
  });

  it("keeps the third retune's lean starts, aggressive enemies and announced waves", () => {
    // `pulp_wars-hmyk.21` (CAMPAIGN.md section 19.4): G1 to G3 start like a
    // skirmish (one town, a few units, at most three technologies); no
    // other start holds more than one town; every enemy marches or hunts
    // from round 3 at the latest; every wave of missions 2 to 6 is
    // announced and carries its story line.
    for (const id of ["GOBLIN_1", "GOBLIN_2", "GOBLIN_3"]) {
      expect(seat(id, 0).cities, id).toHaveLength(1);
      expect(seat(id, 0).units.length, id).toBeLessThanOrEqual(3);
      expect(seat(id, 0).technologies.length, id).toBeLessThanOrEqual(3);
    }
    expect(seat("GOBLIN_1", 0).technologies).toEqual([]);
    expect(seat("GOBLIN_2", 0).technologies).toEqual([]);
    for (const id of ORDER) {
      expect(seat(id, 0).cities.length, id).toBe(1);
      for (const enemy of mission(id).seats.slice(1)) {
        expect(enemy.directive, `${id} ${String(enemy.faction)}`).toBeDefined();
      }
    }
    for (const id of ORDER.slice(1)) {
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
    for (const entry of CHAPTER_GOBLINS_V7.missions) {
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
    for (const entry of CHAPTER_GOBLINS_V7.missions) {
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
      expect(text, where).not.toMatch(/GOBLIN|[A-Z]{2,}_[A-Z]/);
    }
  });
});
