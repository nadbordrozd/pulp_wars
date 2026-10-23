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
    }
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
      // Retune 4 (`pulp_wars-hmyk.31`, CAMPAIGN.md section 22.5): the
      // conquests' clocks are about one and a half good wins, the escort's
      // stays close and the hold keeps its length.
      {
        kind: "DOMINATION",
        byRound: 22,
        bonus: ["WITHIN_ROUNDS 15", "UNIT_ALIVE"],
      },
      { kind: "KILL", byRound: 18, bonus: ["WITHIN_ROUNDS 14", "KEEP_CITIES"] },
      {
        kind: "CAPTURE",
        byRound: 22,
        bonus: ["WITHIN_ROUNDS 16", "KEEP_CITIES"],
      },
      {
        kind: "SURVIVE",
        byRound: undefined,
        bonus: ["KEEP_CITIES", "UNIT_ALIVE"],
      },
      {
        kind: "CAPTURE",
        byRound: 22,
        bonus: ["WITHIN_ROUNDS 16", "KEEP_CITIES"],
      },
      {
        kind: "ESCORT",
        byRound: 18,
        bonus: ["WITHIN_ROUNDS 14", "KEEP_CITIES"],
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
      rounds: 13,
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
    // Every chapter objective names its mission's clock.
    for (const entry of CHAPTER_ICE_FOLK_V7.missions) {
      const { objective } = mission(entry.missionId);
      const clock =
        "byRound" in objective && objective.byRound !== undefined
          ? objective.byRound
          : "rounds" in objective
            ? objective.rounds
            : undefined;
      expect(entry.objective, entry.missionId).toContain(String(clock));
    }
  });

  it("builds the missions as the fourth retune left them", () => {
    // `pulp_wars-hmyk.31` (CAMPAIGN.md section 22.5, hand-played): eased
    // from the third retune toward the middle. The enemies outnumber your
    // side (yours and the dwarves' in I6) from the start and attack, so the
    // difficulty comes from them rather than from waves or the clock.
    for (const id of ORDER) {
      const definition = mission(id);
      const side = (index: number) => definition.teams?.[index] ?? index;
      const count = (ours: boolean) =>
        definition.seats
          .filter((_, index) => (side(index) === side(0)) === ours)
          .reduce((sum, item) => sum + item.units.length, 0);
      expect(count(false), id).toBeGreaterThan(count(true));
    }
    // Every hostile seat attacks: RUSH, an ASSAULT, or a GUARD that sends
    // the rest.
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
            (last?.kind === "GUARD" && last.others !== undefined),
          `${id} seat ${String(index)}`,
        ).toBe(true);
      }
    }
    // Some economy is back: every start has technology, at least 5 Coins
    // and a town of level 2 or more, and every mission has neutral
    // villages to take.
    for (const id of ORDER) {
      const start = seat(id, 0);
      expect(start.technologies.length, id).toBeGreaterThan(0);
      expect(start.coins, id).toBeGreaterThanOrEqual(5);
      expect(
        Math.max(...start.cities.map((city) => city.level ?? 1)),
        id,
      ).toBeGreaterThanOrEqual(2);
      expect(mission(id).villages.length, id).toBeGreaterThan(0);
    }
    // Waves only fine-tune: every enemy wave is announced with a story line
    // (the player's own giant of I2 has the line only).
    const rounds = (id: string) =>
      (mission(id).reinforcements ?? []).map((wave) => [wave.seat, wave.round]);
    for (const id of ORDER)
      for (const wave of mission(id).reinforcements ?? []) {
        expect(wave.line, id).toBeTypeOf("string");
        if (wave.seat !== 0) expect(wave.announce, id).toBe(true);
      }
    // I1: one level 2 camp and four units against eight Goblins with no
    // Coins, who hold four rounds and then send all but three; no waves.
    expect(seat("ICE_FOLK_1", 0).units).toHaveLength(4);
    expect(seat("ICE_FOLK_1", 1).units).toHaveLength(8);
    expect(seat("ICE_FOLK_1", 1).coins).toBe(0);
    expect(seat("ICE_FOLK_1", 1).directive).toMatchObject([
      { kind: "GUARD", untilRound: 4 },
      { kind: "GUARD", garrison: 3, others: { kind: "RUSH" }, fromRound: 4 },
    ]);
    expect(rounds("ICE_FOLK_1")).toEqual([]);
    // I2: sixteen dead (retune 3's first wave on the board), the tomb holds
    // three rounds, then the Abbot and four stay and the rest march; no
    // waves of the dead; the first Frost Giant joins you in round 10.
    expect(seat("ICE_FOLK_2", 1).units).toHaveLength(16);
    expect(seat("ICE_FOLK_2", 1).directive).toMatchObject([
      { kind: "GUARD", untilRound: 3 },
      { kind: "GUARD", garrison: 5, others: { kind: "RUSH" }, fromRound: 3 },
    ]);
    expect(rounds("ICE_FOLK_2")).toEqual([[0, 10]]);
    expect(
      (mission("ICE_FOLK_2").reinforcements ?? []).find(
        (wave) => wave.seat === 0,
      )?.units,
    ).toEqual([expect.objectContaining({ role: "JUGGERNAUT" })]);
    // I3: Rime, Pack Ice and Icebound known; Anvil Bay builds no Ironclads
    // or Diving Bells, holds five and sends the rest; no landing parties,
    // and its Ironclad comes home in round 11.
    expect(seat("ICE_FOLK_3", 0).technologies).toEqual(
      expect.arrayContaining(["SHORECRAFT", "NAVIGATION", "NAVAL_ENGINEERING"]),
    );
    for (const tech of ["NAVAL_ENGINEERING", "SUBMERSIBLES"])
      expect(seat("ICE_FOLK_3", 1).forbiddenTechnologies, tech).toContain(tech);
    expect(seat("ICE_FOLK_3", 1).directive).toMatchObject({
      kind: "GUARD",
      garrison: 5,
      others: { kind: "RUSH" },
    });
    expect(rounds("ICE_FOLK_3")).toEqual([[1, 11]]);
    expect((mission("ICE_FOLK_3").reinforcements ?? [])[0]?.units).toEqual([
      expect.objectContaining({ role: "BATTLESHIP" }),
    ]);
    // I4: both Snow Line towns, six units; the Wardens ride with Chivalry
    // and rifles and the sweets march; two waves, the sweets in round 6 and
    // the Wardens in round 8.
    expect(seat("ICE_FOLK_4", 0).cities).toHaveLength(2);
    expect(seat("ICE_FOLK_4", 0).units).toHaveLength(6);
    expect(seat("ICE_FOLK_4", 1).technologies).toContain("CHIVALRY");
    expect(
      seat("ICE_FOLK_4", 1).units.filter((unit) => unit.role === "MARKSMAN"),
    ).toHaveLength(3);
    expect(seat("ICE_FOLK_4", 1).directive).toMatchObject({
      kind: "ASSAULT",
    });
    expect(seat("ICE_FOLK_4", 2).directive).toMatchObject({
      kind: "ASSAULT",
    });
    expect(rounds("ICE_FOLK_4")).toEqual([
      [2, 6],
      [1, 8],
    ]);
    // I5: Hoarfrost Camp at level 3 behind walls (a Frost Giant a few
    // rounds of growth away); the Lodge has ten keepers and Favour 1, holds
    // eight and sends two from round 1; the Redcaps rush; no waves.
    expect(seat("ICE_FOLK_5", 0).cities[0]).toMatchObject({
      level: 3,
      rewards: ["STOCKPILE", "WALLS"],
    });
    expect(seat("ICE_FOLK_5", 1).units).toHaveLength(10);
    expect(seat("ICE_FOLK_5", 1).favour).toBe(1);
    expect(seat("ICE_FOLK_5", 1).directive).toMatchObject({
      kind: "GUARD",
      garrison: 8,
      others: { kind: "RUSH" },
    });
    expect(seat("ICE_FOLK_5", 2).directive).toMatchObject({ kind: "RUSH" });
    expect(rounds("ICE_FOLK_5")).toEqual([]);
    // I6: no Engineering at the start (the peaks are the road's walls);
    // the climb is seen; the Lodge has eleven units and Favour 3, holds the
    // slopes and then sends three at Rime Camp, with no ambush below the
    // summit; the Unquiet have ten on the board and one wave in round 8;
    // the dwarves hold the Deep Gate.
    expect(seat("ICE_FOLK_6", 0).technologies).not.toContain("ENGINEERING");
    expect(seat("ICE_FOLK_6", 0).units).toHaveLength(9);
    expect(seat("ICE_FOLK_6", 1).units).toHaveLength(11);
    expect(seat("ICE_FOLK_6", 1).favour).toBe(3);
    expect(seat("ICE_FOLK_6", 1).directive).toMatchObject([
      { kind: "HOLD", untilRound: 4 },
      { kind: "GUARD", garrison: 8, others: { kind: "ASSAULT" } },
    ]);
    expect(seat("ICE_FOLK_6", 2).units).toHaveLength(10);
    expect(seat("ICE_FOLK_6", 2).directive).toMatchObject({ kind: "RUSH" });
    expect(seat("ICE_FOLK_6", 3).directive).toMatchObject({ kind: "HOLD" });
    expect(rounds("ICE_FOLK_6")).toEqual([[2, 8]]);
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
