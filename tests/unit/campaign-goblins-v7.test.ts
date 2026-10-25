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
    }
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
    // The fourth retune (`pulp_wars-hmyk.29`, CAMPAIGN.md section 19.5):
    // the conquests and captures get a lax clock (about one and a half
    // times a good win); the hunt and the escort keep a meaningful one; the
    // hold-out keeps its length. G4's port is across the island since
    // `pulp_wars-hmyk.38` (section 19.6), so its clock is longer.
    expect(summary).toEqual([
      {
        kind: "DOMINATION",
        byRound: 20,
        bonus: ["WITHIN_ROUNDS 14", "UNIT_ALIVE"],
      },
      {
        kind: "CAPTURE",
        byRound: 20,
        bonus: ["WITHIN_ROUNDS 14", "KEEP_CITIES"],
      },
      { kind: "KILL", byRound: 15, bonus: ["WITHIN_ROUNDS 11", "KEEP_CITIES"] },
      {
        kind: "CAPTURE",
        byRound: 32,
        bonus: ["WITHIN_ROUNDS 24", "UNIT_ALIVE"],
      },
      {
        kind: "SURVIVE",
        byRound: undefined,
        bonus: ["KEEP_CITIES", "UNIT_ALIVE"],
      },
      {
        kind: "ESCORT",
        byRound: 14,
        bonus: ["WITHIN_ROUNDS 10", "KEEP_CITIES"],
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
    // G1 (fourth retune): the fort and its toll keep three and the rest
    // march from round 4; the fort may not learn Gathering or Farming
    // (with them it grew to level 4 in round 1).
    expect(seat("GOBLIN_1", 1).directive).toEqual([
      expect.objectContaining({ kind: "GUARD", garrison: 3, untilRound: 4 }),
      expect.objectContaining({
        kind: "GUARD",
        garrison: 3,
        others: { kind: "RUSH" },
      }),
    ]);
    for (const tech of ["GATHERING", "FARMING"])
      expect(seat("GOBLIN_1", 1).forbiddenTechnologies, tech).toContain(tech);
    // G2: the Unquiet keep five on the cove, their Wight among them, and
    // send the rest from round 4; they have no Leadership and no Land
    // Grants.
    expect(seat("GOBLIN_2", 1).directive).toEqual([
      expect.objectContaining({ kind: "GUARD", garrison: 5, untilRound: 4 }),
      expect.objectContaining({
        kind: "GUARD",
        garrison: 5,
        others: { kind: "RUSH" },
      }),
    ]);
    expect(
      seat("GOBLIN_2", 1).units.findIndex((unit) => unit.role === "SWORDSMAN"),
    ).toBeLessThan(5);
    for (const tech of ["ADMINISTRATION", "PLANNING"])
      expect(seat("GOBLIN_2", 1).forbiddenTechnologies, tech).toContain(tech);
    // G3: Snapjaw is a Plesiosaur one kill from Alpha; the crew starts with
    // a Diving Barrel and must learn Submersibles to build more, the tribes
    // may not learn them; the tribes hunt the wharf from round 3; the whole
    // sea is known (a submerged Plesiosaur is seen only on explored water).
    expect(seat("GOBLIN_3", 1).units).toContainEqual(
      expect.objectContaining({ tag: "SNAPJAW", role: "SUBMARINE", kills: 2 }),
    );
    expect(seat("GOBLIN_3", 0).technologies).not.toContain("SUBMERSIBLES");
    expect(seat("GOBLIN_3", 0).units).toContainEqual(
      expect.objectContaining({ role: "SUBMARINE" }),
    );
    expect(seat("GOBLIN_3", 1).forbiddenTechnologies).toContain("SUBMERSIBLES");
    expect(seat("GOBLIN_3", 1).directive).toEqual([
      { kind: "NORMAL", untilRound: 3 },
      { kind: "RUSH" },
    ]);
    expect(seat("GOBLIN_3", 0).reveal?.rects).toContainEqual({
      x0: 0,
      y0: 0,
      x1: 15,
      y1: 15,
    });
    // G4 (`pulp_wars-hmyk.38`): Port Kessler ten tiles from Egg Rock across
    // the island, the Moon Gun on the hill above it, the Lost Expedition
    // and a Gold Claim on the way; ten men at the port, seven of them on
    // its shore; no ships; the tribes storm Egg Rock; no waves.
    const g4 = mission("GOBLIN_4");
    expect(g4.source?.mapType).toBe("PANGEA");
    const landing = seat("GOBLIN_4", 0).cities[0]?.at;
    const port = g4.landmarks?.[0]?.at;
    if (landing === undefined || port === undefined) throw new Error("G4");
    expect(
      Math.max(Math.abs(landing.x - port.x), Math.abs(landing.y - port.y)),
    ).toBeGreaterThanOrEqual(10);
    expect(g4.curiosities).toEqual([
      { kind: "MOON_GUN", at: { x: 8, y: 10 } },
      { kind: "GOLD_CLAIM", at: { x: 9, y: 4 } },
      { kind: "LOST_EXPEDITION", at: { x: 2, y: 7 } },
    ]);
    expect(seat("GOBLIN_4", 1).units).toHaveLength(10);
    // Every village is on the crew's island, over land from Egg Rock
    // (retune 4's "returned" village was across water with no ships).
    const reached = new Set([`${String(landing.x)},${String(landing.y)}`]);
    const queue = [landing];
    for (let next = queue.shift(); next !== undefined; next = queue.shift())
      for (let dy = -1; dy <= 1; dy += 1)
        for (let dx = -1; dx <= 1; dx += 1) {
          const x = next.x + dx;
          const y = next.y + dy;
          const terrain = g4.terrain[y]?.[x];
          const key = `${String(x)},${String(y)}`;
          if (terrain === undefined || "~x".includes(terrain)) continue;
          if (reached.has(key)) continue;
          reached.add(key);
          queue.push({ x, y });
        }
    for (const village of g4.villages)
      expect(
        reached.has(`${String(village.x)},${String(village.y)}`),
        `${String(village.x)},${String(village.y)}`,
      ).toBe(true);
    expect(reached.has(`${String(port.x)},${String(port.y)}`)).toBe(true);
    expect(seat("GOBLIN_4", 1).directive).toEqual([
      expect.objectContaining({ kind: "GUARD", garrison: 7, untilRound: 4 }),
      expect.objectContaining({
        kind: "GUARD",
        garrison: 7,
        others: { kind: "RUSH" },
      }),
    ]);
    expect(seat("GOBLIN_4", 2).directive).toEqual([
      { kind: "NORMAL", untilRound: 4 },
      { kind: "ASSAULT", target: { x: 3, y: 3 } },
    ]);
    expect(g4.forbiddenTechnologies).toContain("SHORECRAFT");
    expect(g4.reinforcements ?? []).toEqual([]);
    // G5: the loyalists rush (their first landing party ashore at the
    // start), the saucers go for the Rock, four enemy waves, and the raft
    // crews row in in round 12.
    expect(seat("GOBLIN_5", 1).directive).toEqual({ kind: "RUSH" });
    expect(seat("GOBLIN_5", 2).directive).toMatchObject({ kind: "ASSAULT" });
    expect(
      (mission("GOBLIN_5").reinforcements ?? [])
        .filter((wave) => wave.seat !== 0)
        .map((wave) => wave.round)
        .sort((left, right) => left - right),
    ).toEqual([5, 7, 9, 11]);
    expect(
      (mission("GOBLIN_5").reinforcements ?? [])
        .filter((wave) => wave.seat === 0)
        .map((wave) => wave.round),
    ).toEqual([12]);
    // G6: the Lodge keeps four at its camps and sends the rest at the Hall
    // (its second choir starts on the road); the Thane's escort holds the
    // Gate.
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

  it("starts the enemies stronger than you and keeps waves for fine-tuning", () => {
    // `pulp_wars-hmyk.29` (CAMPAIGN.md section 19.5): the enemies outnumber
    // your side (yours and the Thane's escort in G6) from the start, so the
    // difficulty comes from them rather than from waves or the clock.
    for (const id of ORDER) {
      const definition = mission(id);
      const teams = definition.teams;
      const side = (index: number) => teams?.[index] ?? index;
      const count = (ours: boolean) =>
        definition.seats
          .filter((_, index) => (side(index) === side(0)) === ours)
          .reduce((sum, item) => sum + item.units.length, 0);
      expect(count(false), id).toBeGreaterThan(count(true));
    }
    // Some economy is back: every start has technology and at least 5
    // Coins, and every start but G3's and G4's lean landings has a town of
    // level 2 or more.
    for (const id of ORDER) {
      const start = seat(id, 0);
      expect(start.technologies.length, id).toBeGreaterThan(0);
      expect(start.coins, id).toBeGreaterThanOrEqual(5);
    }
    for (const id of ["GOBLIN_1", "GOBLIN_2", "GOBLIN_5", "GOBLIN_6"])
      expect(
        Math.max(...seat(id, 0).cities.map((city) => city.level ?? 1)),
        id,
      ).toBeGreaterThanOrEqual(2);
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
    // Waves only fine-tune: none but G5's landings (the story's), each
    // announced with a story line of its own.
    for (const id of ORDER) {
      const waves = mission(id).reinforcements ?? [];
      if (id !== "GOBLIN_5") expect(waves, id).toEqual([]);
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
