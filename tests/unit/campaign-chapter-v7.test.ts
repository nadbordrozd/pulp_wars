import { describe, expect, it } from "vitest";
import { validateMissionDirectivesV7 } from "../../src/ai/v7-directives";
import {
  CAMPAIGN_FORMAT_LABELS_V7,
  CHAPTER_ONE_V7,
} from "../../src/campaign/chapter-1";
import {
  FACTION_IDS_V7,
  MISSION_REGISTRY_V7,
  missionByIdV7,
  missionSeatDirectivesV7,
  missionSeatFactionsV7,
  type FactionIdV7,
  type MissionDefinitionV7,
} from "../../src/engine/index";

// The campaign, part one (`pulp_wars-68k.4`, reworked by `pulp_wars-v642.1`;
// docs/product/CAMPAIGN.md sections 9 to 11): the chapter data lists ten
// missions in order, the first four built and the rest designed; the unlock
// table hands out every faction with the Cultists last and makes every
// mission playable when it opens; the built missions' seats, directives,
// objectives and forbidden technologies are the design's; and the
// player-facing text is short and never names a tile coordinate.

const NAVAL = [
  "SHORECRAFT",
  "NAVIGATION",
  "NAVAL_ENGINEERING",
  "SEAMANSHIP",
  "SUBMERSIBLES",
] as const;

// The missions that are registered and built, one per line so that the
// builders of missions 5 to 10 each add their own.
const BUILT = [
  "FRONTIER_1",
  "FRONTIER_2",
  "FRONTIER_3",
  "FRONTIER_4",
  // `pulp_wars-v642.2`.
  "FRONTIER_5",
  "FRONTIER_6",
  // Missions 7 and 8 (`pulp_wars-v642.3`).
  "FRONTIER_7",
  "FRONTIER_8",
];

function mission(id: string): MissionDefinitionV7 {
  const found = missionByIdV7(id);
  if (found === null) throw new Error(`${id} is not registered`);
  return found;
}

function seat(definition: MissionDefinitionV7, index: number) {
  const found = definition.seats[index];
  if (found === undefined) throw new Error(`${definition.id} seat ${index}`);
  return found;
}

/** Every player-facing string of the chapter, with where it comes from. */
function playerText(): { readonly where: string; readonly text: string }[] {
  const texts = [
    { where: "title", text: CHAPTER_ONE_V7.title },
    { where: "intro", text: CHAPTER_ONE_V7.intro },
    { where: "outro", text: CHAPTER_ONE_V7.outro },
    ...Object.values(CAMPAIGN_FORMAT_LABELS_V7).map((text) => ({
      where: "format",
      text,
    })),
  ];
  for (const entry of CHAPTER_ONE_V7.missions) {
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
  }
  return texts;
}

describe("Chapter One data", () => {
  it("lists ten missions in order: the built ones registered, the rest designed", () => {
    expect(CHAPTER_ONE_V7.missions.map((entry) => entry.missionId)).toEqual([
      "FRONTIER_1",
      "FRONTIER_2",
      "FRONTIER_3",
      "FRONTIER_4",
      "FRONTIER_5",
      "FRONTIER_6",
      "FRONTIER_7",
      "FRONTIER_8",
      "FRONTIER_9",
      "FRONTIER_10",
    ]);
    expect(CHAPTER_ONE_V7.missions.map((entry) => entry.number)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
    ]);
    for (const entry of CHAPTER_ONE_V7.missions) {
      const definition = missionByIdV7(entry.missionId);
      // Exactly the missions that are not registered carry a plan.
      expect(definition === null, entry.missionId).toBe(
        entry.planned !== undefined,
      );
      expect(BUILT.includes(entry.missionId), entry.missionId).toBe(
        definition !== null,
      );
      if (definition !== null) expect(definition.hidden).toBeUndefined();
    }
    // Every registered mission outside the chapter is a hidden fixture.
    const chapter = new Set(
      CHAPTER_ONE_V7.missions.map((entry) => entry.missionId),
    );
    for (const definition of MISSION_REGISTRY_V7)
      if (!chapter.has(definition.id)) expect(definition.hidden).toBe(true);
    expect(Object.isFrozen(CHAPTER_ONE_V7)).toBe(true);
    expect(Object.isFrozen(CHAPTER_ONE_V7.missions)).toBe(true);
  });

  it("covers every format, with several opponents in most later missions and an ally in two", () => {
    expect(CHAPTER_ONE_V7.missions.map((entry) => entry.format)).toEqual([
      "CONQUEST",
      "CAPTURE",
      "CAPTURE",
      "CAPTURE",
      "ESCORT",
      "SURVIVE",
      "CAPTURE",
      "KILL",
      "ALLY",
      "CAPTURE",
    ]);
    const planned = CHAPTER_ONE_V7.missions.flatMap((entry) =>
      entry.planned === undefined ? [] : [entry.planned],
    );
    expect(planned).toHaveLength(10 - BUILT.length);
    for (const plan of planned) {
      expect(plan.leads).toHaveLength(1);
      expect(plan.opponents).toHaveLength(2);
      expect([14, 16, 20]).toContain(plan.size);
    }
    // Missions 9 and 10 have an ally, while they are still only designed.
    expect(
      planned.filter((plan) => (plan.allies ?? []).length > 0),
    ).toHaveLength(
      ["FRONTIER_9", "FRONTIER_10"].filter((id) => !BUILT.includes(id)).length,
    );
  });

  it("builds missions 5 and 6 to the design: an escort and a hold-out against two enemies", () => {
    // Mission 5, "Dead Men's Road" (`pulp_wars-v642.2`).
    const road = mission("FRONTIER_5");
    expect([road.size, road.source?.mapType, road.source?.seed]).toEqual([
      16,
      "DRY_LAND",
      9,
    ]);
    expect(road.seats.map((item) => item.faction)).toEqual([
      "UNDEAD",
      "ORIGINAL",
      "ICE_FOLK",
    ]);
    // The toll-men and the raiders are one side.
    expect(road.teams).toEqual([0, 1, 1]);
    expect(road.objective).toEqual({
      kind: "ESCORT",
      unit: "ARCHIVIST",
      to: "IRONBRAID_GATE",
      within: 1,
      byRound: 20,
      bonus: [{ kind: "WITHIN_ROUNDS", rounds: 16 }, { kind: "KEEP_CITIES" }],
    });
    // The Doctor is a Necromancer of seat 0, and the gate a neutral village.
    expect(
      seat(road, 0).units.filter((unit) => unit.tag !== undefined),
    ).toEqual([
      { role: "CAPTAIN", at: { x: 5, y: 11 }, home: 1, tag: "ARCHIVIST" },
    ]);
    expect(road.landmarks).toEqual([
      { tag: "IRONBRAID_GATE", at: { x: 14, y: 2 } },
    ]);
    expect(road.villages).toContainEqual({ x: 14, y: 2 });
    // The whole fort guards the pass; the raiders hold their camp until
    // round 6 and then rush; their waves come in rounds 9 and 13.
    expect(seat(road, 1).directive).toEqual({
      kind: "GUARD",
      zone: [{ x0: 9, y0: 7, x1: 11, y1: 9 }],
      garrison: 6,
    });
    expect(missionSeatDirectivesV7(seat(road, 2))).toEqual([
      {
        kind: "HOLD",
        zone: [{ x0: 13, y0: 13, x1: 15, y1: 15 }],
        untilRound: 6,
      },
      { kind: "RUSH" },
    ]);
    expect(
      (road.reinforcements ?? []).map((wave) => [
        wave.seat,
        wave.round,
        wave.units.length,
      ]),
    ).toEqual([
      [2, 9, 3],
      [2, 13, 4],
    ]);
    // Nobody climbs (the Yetis are Mountain-born), and neither enemy city
    // can grow to a giant or blast the mountains.
    expect([...road.forbiddenTechnologies].sort()).toEqual(
      [...NAVAL, "ENGINEERING", "METALLURGY"].sort(),
    );
    expect(seat(road, 0).forbiddenTechnologies).toBeUndefined();
    for (const index of [1, 2])
      expect(seat(road, index).forbiddenTechnologies).toEqual(
        expect.arrayContaining(["FORESTRY", "FARMING", "EXPLOSIVES"]),
      );
    expect(() => validateMissionDirectivesV7(road)).not.toThrow();

    // Mission 6, "The Deep Gate" (`pulp_wars-v642.2`).
    const gate = mission("FRONTIER_6");
    expect([gate.size, gate.source?.mapType, gate.source?.seed]).toEqual([
      14,
      "DRY_LAND",
      18,
    ]);
    expect(gate.seats.map((item) => item.faction)).toEqual([
      "DWARF",
      "ICE_FOLK",
      "ORIGINAL",
    ]);
    expect(gate.aiMode).toBe("RIVAL");
    expect(gate.teams).toBeUndefined();
    expect(gate.objective).toEqual({
      kind: "SURVIVE",
      rounds: 14,
      protect: [{ place: "DEEP_GATE" }],
      bonus: [{ kind: "KEEP_CITIES" }, { kind: "UNIT_ALIVE", unit: "THANE" }],
    });
    expect(gate.landmarks).toEqual([{ tag: "DEEP_GATE", at: { x: 5, y: 6 } }]);
    expect(seat(gate, 0).cities[0]).toEqual({
      at: { x: 5, y: 6 },
      level: 4,
      rewards: ["STOCKPILE", "WALLS", "BOOM"],
    });
    expect(
      seat(gate, 0).units.filter((unit) => unit.tag !== undefined),
    ).toEqual([{ role: "CAPTAIN", at: { x: 5, y: 6 }, tag: "THANE" }]);
    // The Ice Folk rush from the start; the Baron holds until round 6.
    expect(missionSeatDirectivesV7(seat(gate, 1))).toEqual([{ kind: "RUSH" }]);
    expect(
      missionSeatDirectivesV7(seat(gate, 2)).map((directive) => [
        directive.kind,
        directive.untilRound,
      ]),
    ).toEqual([
      ["HOLD", 6],
      ["RUSH", undefined],
    ]);
    // Three waves a side that escalate to a giant, from two directions (the
    // peaks north of the gate, the valley east of it), and the relief.
    const waves = (gate.reinforcements ?? []).map((wave) => ({
      seat: wave.seat,
      round: wave.round,
      roles: wave.units.map((unit) => unit.role),
      north: wave.units.every((unit) => unit.at.y <= 3),
      east: wave.units.every((unit) => unit.at.x >= 8),
    }));
    const of = (index: number) => waves.filter((wave) => wave.seat === index);
    expect(of(1).map((wave) => wave.round)).toEqual([3, 7, 11]);
    expect(of(2).map((wave) => wave.round)).toEqual([6, 9, 12]);
    expect(of(0).map((wave) => wave.round)).toEqual([9]);
    expect(of(1).every((wave) => wave.north)).toBe(true);
    expect(of(2).every((wave) => wave.east)).toBe(true);
    for (const index of [1, 2]) {
      const [first, second, last] = of(index);
      expect(first?.roles).not.toContain("JUGGERNAUT");
      expect(second?.roles).not.toContain("JUGGERNAUT");
      expect(last?.roles).toContain("JUGGERNAUT");
    }
    // The Humans come through a door: the Dwarves alone walk the peaks
    // (the Yetis are Mountain-born). Nobody has land to grant or to farm.
    expect(seat(gate, 0).technologies).toContain("ENGINEERING");
    expect(seat(gate, 2).forbiddenTechnologies).toEqual([
      "ENGINEERING",
      "METALLURGY",
    ]);
    expect([...gate.forbiddenTechnologies].sort()).toEqual(
      [...NAVAL, "PLANNING", "FARMING", "MILLING"].sort(),
    );
    expect(() => validateMissionDirectivesV7(gate)).not.toThrow();
  });

  it("unlocks every faction, one mission at a time from mission 4, with the Cultists last", () => {
    expect(CHAPTER_ONE_V7.startingFactions).toEqual(["ORIGINAL"]);
    expect(CHAPTER_ONE_V7.missions.map((entry) => [...entry.unlocks])).toEqual([
      [],
      ["GOBLIN"],
      [],
      ["UNDEAD"],
      ["DWARF"],
      ["ICE_FOLK"],
      ["DINOSAUR"],
      ["MARTIAN"],
      ["CANDY"],
      ["CULT"],
    ]);
    const unlocked = new Set<FactionIdV7>(CHAPTER_ONE_V7.startingFactions);
    for (const entry of CHAPTER_ONE_V7.missions) {
      const definition = missionByIdV7(entry.missionId);
      const choices =
        definition === null
          ? (entry.planned?.leads ?? [])
          : missionSeatFactionsV7(seat(definition, 0));
      expect(choices.length).toBeGreaterThan(0);
      // The faction you lead is unlocked by the time the mission opens.
      for (const faction of choices)
        expect(unlocked.has(faction), `${entry.missionId} ${faction}`).toBe(
          true,
        );
      // A mission never unlocks what is unlocked already.
      for (const faction of entry.unlocks) {
        expect(unlocked.has(faction), `${entry.missionId} ${faction}`).toBe(
          false,
        );
        unlocked.add(faction);
      }
    }
    expect([...unlocked].sort()).toEqual([...FACTION_IDS_V7].sort());
  });

  it("matches the design's seats, directives, objectives, and forbidden technologies", () => {
    const expected: Record<
      string,
      {
        readonly human: readonly FactionIdV7[];
        readonly ai: FactionIdV7;
        readonly directive: string;
        readonly size: number;
        readonly map: string;
        readonly objective: MissionDefinitionV7["objective"];
        readonly aiForbidden: readonly string[];
      }
    > = {
      FRONTIER_1: {
        human: ["ORIGINAL"],
        ai: "GOBLIN",
        directive: "RUSH",
        size: 11,
        map: "DRY_LAND",
        objective: {
          kind: "DOMINATION",
          bonus: [
            { kind: "WITHIN_ROUNDS", rounds: 12 },
            { kind: "KEEP_CITIES" },
          ],
        },
        aiForbidden: [
          "ENGINEERING",
          "METALLURGY",
          "MARKSMANSHIP",
          "FIELDCRAFT",
          "SCOUTING",
          "ROADS",
          "COMMERCE",
          "RAIDING",
          "CHIVALRY",
        ],
      },
      FRONTIER_2: {
        human: ["ORIGINAL"],
        ai: "GOBLIN",
        directive: "NORMAL",
        size: 14,
        map: "DRY_LAND",
        objective: {
          kind: "CAPTURE",
          places: ["WARRENS"],
          bonus: [
            { kind: "WITHIN_ROUNDS", rounds: 18 },
            { kind: "KEEP_CITIES" },
          ],
        },
        aiForbidden: ["MARKSMANSHIP", "FIELDCRAFT", "METALLURGY"],
      },
      FRONTIER_3: {
        human: ["GOBLIN"],
        ai: "UNDEAD",
        directive: "HOLD",
        size: 14,
        map: "DRY_LAND",
        objective: {
          kind: "CAPTURE",
          places: ["BARROW"],
          bonus: [
            { kind: "WITHIN_ROUNDS", rounds: 15 },
            { kind: "KEEP_CITIES" },
          ],
        },
        aiForbidden: [],
      },
      FRONTIER_4: {
        human: ["ORIGINAL", "GOBLIN"],
        ai: "UNDEAD",
        directive: "GUARD",
        size: 16,
        map: "CONTINENTS",
        objective: {
          kind: "CAPTURE",
          places: ["GATE"],
          bonus: [
            { kind: "WITHIN_ROUNDS", rounds: 12 },
            { kind: "KEEP_CITIES" },
          ],
        },
        aiForbidden: ["ADMINISTRATION", "PLANNING"],
      },
    };
    for (const [id, want] of Object.entries(expected)) {
      const definition = mission(id);
      expect(definition.size).toBe(want.size);
      expect(definition.source?.mapType, id).toBe(want.map);
      expect(definition.seats).toHaveLength(2);
      expect(definition.aiMode).toBe("RIVAL");
      expect(definition.teams).toBeUndefined();
      expect(missionSeatFactionsV7(seat(definition, 0))).toEqual(want.human);
      expect(seat(definition, 1).faction).toBe(want.ai);
      expect(
        missionSeatDirectivesV7(seat(definition, 1))[0]?.kind ?? "NORMAL",
      ).toBe(want.directive);
      expect(() => validateMissionDirectivesV7(definition)).not.toThrow();
      expect(definition.objective, id).toEqual(want.objective);
      // You are never handicapped: only the AI seat has a list of its own.
      expect(seat(definition, 0).forbiddenTechnologies).toBeUndefined();
      expect([...(seat(definition, 1).forbiddenTechnologies ?? [])]).toEqual(
        want.aiForbidden,
      );
      // The whole Naval branch is forbidden everywhere; nothing else, except
      // Sawmilling in mission 4 (`pulp_wars-68k.6`: no siege unit is built).
      expect([...definition.forbiddenTechnologies].sort()).toEqual(
        [...NAVAL, ...(id === "FRONTIER_4" ? ["SAWMILLING"] : [])].sort(),
      );
    }
    // Mission 3 holds the plain around the Barrow until the new moon.
    expect(seat(mission("FRONTIER_3"), 1).directive).toEqual({
      kind: "HOLD",
      zone: [{ x0: 0, y0: 0, x1: 13, y1: 4 }],
      untilRound: 16,
    });
    // Mission 4 guards the gate with four.
    expect(seat(mission("FRONTIER_4"), 1).directive).toEqual({
      kind: "GUARD",
      zone: [{ x0: 9, y0: 5, x1: 11, y1: 7 }],
      garrison: 4,
    });
  });

  it("builds missions 7 and 8 as designed: the frozen sea against a clock, and a hunt", () => {
    // Mission 7: the Ice Folk cross the strait on ice to the Crater.
    const island = mission("FRONTIER_7");
    expect(island.size).toBe(16);
    expect(island.source?.mapType).toBe("ARCHIPELAGO");
    expect(island.seats.map((item) => item.faction)).toEqual([
      "ICE_FOLK",
      "DINOSAUR",
      "ORIGINAL",
    ]);
    expect(island.aiMode).toBe("RIVAL");
    expect(island.teams).toBeUndefined();
    expect(island.objective).toEqual({
      kind: "CAPTURE",
      places: ["CRATER"],
      byRound: 18,
      bonus: [{ kind: "WITHIN_ROUNDS", rounds: 14 }, { kind: "KEEP_CITIES" }],
    });
    // You own the frozen sea but Icebound, and no seat is forbidden it
    // mission-wide: the Baron sails, and the natives alone may not.
    expect(island.forbiddenTechnologies).toEqual([]);
    expect(seat(island, 0).forbiddenTechnologies).toBeUndefined();
    for (const technology of [
      "SHORECRAFT",
      "NAVIGATION",
      "SEAMANSHIP",
      "SUBMERSIBLES",
    ] as const)
      expect(seat(island, 0).technologies).toContain(technology);
    expect(seat(island, 0).technologies).not.toContain("NAVAL_ENGINEERING");
    for (const technology of NAVAL)
      expect(seat(island, 1).forbiddenTechnologies).toContain(technology);
    expect(seat(island, 2).technologies).toContain("NAVIGATION");
    expect(seat(island, 2).forbiddenTechnologies).toEqual([
      "NAVAL_ENGINEERING",
    ]);
    // The Baron has a Port and a ship, and the landing of round 8 brings
    // another.
    expect(island.improvements).toEqual([
      { at: { x: 11, y: 2 }, improvement: "PORT" },
    ]);
    expect(seat(island, 2).units.map((unit) => unit.role)).toContain(
      "PATROL_BOAT",
    );
    expect(island.reinforcements).toHaveLength(1);
    expect(island.reinforcements?.[0]?.seat).toBe(2);
    expect(island.reinforcements?.[0]?.round).toBe(8);
    expect(
      island.reinforcements?.[0]?.units.map((unit) => unit.role),
    ).toContain("PATROL_BOAT");
    // The Crater is the Dinosaur town across the strait, kept by a
    // garrison of three, and the strait is water on every column.
    const crater = island.landmarks?.find((mark) => mark.tag === "CRATER");
    expect(crater?.at).toEqual({ x: 5, y: 11 });
    expect(seat(island, 1).cities.map((city) => city.at)).toContainEqual(
      crater?.at,
    );
    expect(seat(island, 1).directive).toEqual({
      kind: "GUARD",
      zone: [{ x0: 4, y0: 10, x1: 6, y1: 12 }],
      garrison: 3,
    });
    expect(island.terrain[7]).toBe("~".repeat(16));
    expect(island.terrain[8]).toBe("~".repeat(16));
    expect(() => validateMissionDirectivesV7(island)).not.toThrow();

    // Mission 8: the Dinosaurs hunt the Overmind in its crater.
    const hunt = mission("FRONTIER_8");
    expect(hunt.size).toBe(16);
    expect(hunt.source?.mapType).toBe("PANGEA");
    expect(hunt.seats.map((item) => item.faction)).toEqual([
      "DINOSAUR",
      "MARTIAN",
      "ORIGINAL",
    ]);
    // The Martians and their thralls are one side.
    expect(hunt.teams).toEqual([0, 1, 1]);
    expect(hunt.objective).toEqual({
      kind: "KILL",
      units: ["OVERMIND"],
      byRound: 20,
      bonus: [
        { kind: "WITHIN_ROUNDS", rounds: 15 },
        { kind: "UNIT_ALIVE", unit: "OLD_QUEEN" },
      ],
    });
    expect([...hunt.forbiddenTechnologies].sort()).toEqual([...NAVAL].sort());
    expect(seat(hunt, 0).forbiddenTechnologies).toBeUndefined();
    // You climb: every way but the long southern road crosses a Mountain.
    expect(seat(hunt, 0).technologies).toContain("ENGINEERING");
    // The Old Queen is your giant; the Overmind is a Brain, the Martian
    // seat's first unit, on its walled capital, with a Colossus beside it.
    const queen = seat(hunt, 0).units.find((unit) => unit.tag === "OLD_QUEEN");
    expect(queen?.role).toBe("JUGGERNAUT");
    const martians = seat(hunt, 1);
    expect(martians.units[0]).toEqual({
      role: "CAPTAIN",
      at: { x: 12, y: 4 },
      tag: "OVERMIND",
    });
    expect(martians.cities[0]?.at).toEqual({ x: 12, y: 4 });
    expect(martians.cities[0]?.rewards).toContain("WALLS");
    expect(martians.units[1]?.role).toBe("JUGGERNAUT");
    expect(martians.directive).toEqual({
      kind: "GUARD",
      zone: [{ x0: 10, y0: 3, x1: 14, y1: 7 }],
      garrison: 6,
    });
    // No Mothership, and nothing that grows the crater into a second
    // Colossus.
    for (const technology of [
      "CHIVALRY",
      "ENGINEERING",
      "EXPLOSIVES",
      "FARMING",
      "FORESTRY",
    ] as const)
      expect(martians.forbiddenTechnologies).toContain(technology);
    // The thralls rush, and three waves of three follow them.
    expect(seat(hunt, 2).directive).toEqual({ kind: "RUSH" });
    expect(
      hunt.reinforcements?.map((wave) => [
        wave.seat,
        wave.round,
        wave.units.length,
      ]),
    ).toEqual([
      [2, 5, 3],
      [2, 9, 3],
      [2, 13, 3],
    ]);
    expect(() => validateMissionDirectivesV7(hunt)).not.toThrow();
  });

  it("names every place and unit an objective talks about", () => {
    for (const entry of CHAPTER_ONE_V7.missions) {
      const definition = missionByIdV7(entry.missionId);
      if (definition === null) continue;
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

  it("joins the Bone Neck shores only by the two tiles of the neck", () => {
    const terrain = mission("FRONTIER_4").terrain;
    const land = (x: number, y: number): boolean => {
      const cell = terrain[y]?.[x];
      return cell !== undefined && cell !== "~";
    };
    // Flood the west shore over land (eight neighbours, as units move),
    // stopping at the gate's column.
    const seen = new Set<string>();
    const queue: [number, number][] = [[2, 9]];
    while (queue.length > 0) {
      const [x, y] = queue.pop() as [number, number];
      const key = `${String(x)},${String(y)}`;
      if (seen.has(key) || !land(x, y) || x >= 9) continue;
      seen.add(key);
      for (let dy = -1; dy <= 1; dy += 1)
        for (let dx = -1; dx <= 1; dx += 1) queue.push([x + dx, y + dy]);
    }
    const crossing = [...seen].filter((key) => Number(key.split(",")[0]) > 6);
    expect(crossing.sort()).toEqual(["7,6", "8,6"]);
  });

  it("keeps player-facing text short, plain, and free of tile coordinates", () => {
    for (const entry of CHAPTER_ONE_V7.missions) {
      expect(entry.hints.length).toBeGreaterThan(0);
      expect(entry.hints.length).toBeLessThanOrEqual(3);
      for (const hint of entry.hints)
        expect(hint.length, hint).toBeLessThanOrEqual(60);
      expect(entry.briefing.length, entry.missionId).toBeLessThanOrEqual(400);
      expect(entry.closing.length, entry.missionId).toBeLessThanOrEqual(240);
      // One line for the tracker of the top bar.
      expect(entry.objective.length, entry.missionId).toBeLessThanOrEqual(44);
      expect(entry.objective).toMatch(/\.$/);
    }
    for (const { where, text } of playerText()) {
      expect(text.trim(), where).not.toBe("");
      // No "(3, 8)", "3,8", "x 7", "y=2", or "row 8" style coordinates.
      expect(text, where).not.toMatch(/\d\s*,\s*\d/);
      expect(text, where).not.toMatch(/\b[xy]\s*[=:]?\s*\d/i);
      expect(text, where).not.toMatch(/\b(row|column|tile)s?\s+\d/i);
      // No engine identifiers in player text.
      expect(text, where).not.toMatch(/FRONTIER_|ORIGINAL|[A-Z]{2,}_[A-Z]/);
    }
  });
});
