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

const ORDER = [
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
];
/** The built missions; the rest are designed and carry a plan. */
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
  // Missions 9 and 10 (`pulp_wars-v642.4`).
  "FRONTIER_9",
  "FRONTIER_10",
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
    const definition = missionByIdV7(entry.missionId);
    for (const item of definition?.seats ?? [])
      for (const city of item.cities)
        if (city.name !== undefined)
          texts.push({ where: `${entry.missionId} city`, text: city.name });
  }
  return texts;
}

describe("Chapter One data", () => {
  it("lists ten missions in order: the built ones registered, the rest designed", () => {
    expect(CHAPTER_ONE_V7.missions.map((entry) => entry.missionId)).toEqual(
      ORDER,
    );
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
    expect(planned).toHaveLength(ORDER.length - BUILT.length);
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
      // Revision 3 (`pulp_wars-v642.10`): four rounds more for the raids.
      byRound: 24,
      bonus: [{ kind: "WITHIN_ROUNDS", rounds: 20 }, { kind: "KEEP_CITIES" }],
    });
    // The Doctor is a Necromancer of seat 0, and the gate a neutral village.
    expect(
      seat(road, 0).units.filter((unit) => unit.tag !== undefined),
    ).toEqual([
      { role: "CAPTAIN", at: { x: 5, y: 11 }, home: 1, tag: "ARCHIVIST" },
    ]);
    expect(road.landmarks).toEqual([
      { tag: "IRONBRAID_GATE", at: { x: 14, y: 2 }, name: "Ironbraid Gate" },
    ]);
    expect(road.villages).toContainEqual({ x: 14, y: 2 });
    // The whole fort guards the pass; the raiders hold their camp until
    // round 6 and then rush; their waves come in rounds 9 and 13.
    // Revision 2 (`pulp_wars-v642.8`): the fort is the problem, a garrison
    // of seven that cannot grow (no Fruit), and the Undead research their
    // way to the Lich's range and Pestilence instead of starting with nine
    // technologies.
    // Revision 3 (`pulp_wars-v642.10`, the danger pass): what the fort
    // trains beyond its seven rushes your towns, and the raiders storm
    // Gallows Cross from round 3.
    expect(road.revision).toBe(3);
    expect(seat(road, 1).directive).toEqual({
      kind: "GUARD",
      zone: [{ x0: 9, y0: 7, x1: 11, y1: 9 }],
      garrison: 7,
      others: { kind: "RUSH" },
    });
    expect(
      seat(road, 1)
        .units.map((unit) => unit.role)
        .sort(),
    ).toEqual(
      [
        "GUARD",
        "GUARD",
        "MARKSMAN",
        "MARKSMAN",
        "FIGHTER",
        "FIGHTER",
        "FIGHTER",
      ].sort(),
    );
    expect(seat(road, 1).technologies).not.toContain("GATHERING");
    expect(seat(road, 1).forbiddenTechnologies).toEqual(
      expect.arrayContaining(["GATHERING", "ADMINISTRATION", "PLANNING"]),
    );
    expect([...seat(road, 0).technologies].sort()).toEqual(
      ["ADMINISTRATION", "GATHERING", "HUNTING", "SCOUTING"].sort(),
    );
    expect(missionSeatDirectivesV7(seat(road, 2))).toEqual([
      {
        kind: "HOLD",
        zone: [{ x0: 13, y0: 13, x1: 15, y1: 15 }],
        untilRound: 3,
      },
      {
        kind: "GUARD",
        zone: [{ x0: 13, y0: 13, x1: 15, y1: 15 }],
        garrison: 1,
        others: { kind: "ASSAULT", target: { x: 5, y: 11 } },
        untilRound: 10,
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
      [2, 9, 4],
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
      name: "The Deep Gate",
      at: { x: 5, y: 6 },
      level: 4,
      rewards: ["STOCKPILE", "WALLS", "BOOM"],
    });
    expect(
      seat(gate, 0).units.filter((unit) => unit.tag !== undefined),
    ).toEqual([{ role: "CAPTAIN", at: { x: 5, y: 6 }, tag: "THANE" }]);
    // The Ice Folk rush from the start; the Baron holds until round 6;
    // both assault the Deep Gate in rounds 5 (6) to 10 (`pulp_wars-v642.5`).
    const schedule = (index: number) =>
      missionSeatDirectivesV7(seat(gate, index)).map((directive) => [
        directive.kind,
        directive.untilRound,
        directive.kind === "ASSAULT" ? directive.target : undefined,
      ]);
    expect(schedule(1)).toEqual([
      ["RUSH", 5, undefined],
      ["ASSAULT", 11, { x: 5, y: 6 }],
      ["RUSH", undefined, undefined],
    ]);
    expect(schedule(2)).toEqual([
      ["HOLD", 6, undefined],
      ["ASSAULT", 11, { x: 5, y: 6 }],
      ["RUSH", undefined, undefined],
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
    // Revision 2 (`pulp_wars-v642.8`): no Hunting and no Clockwork to
    // start; Blasting Charges are researched, never given.
    expect(gate.revision).toBe(2);
    expect([...seat(gate, 0).technologies].sort()).toEqual(
      [
        "ADMINISTRATION",
        "DRILL",
        "ENGINEERING",
        "FORTIFICATION",
        "GATHERING",
      ].sort(),
    );
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
      // The campaign difficulty pass (`pulp_wars-v642.7`): a build-up on a
      // bigger board against a clock.
      FRONTIER_3: {
        human: ["GOBLIN"],
        ai: "UNDEAD",
        // Revision 5 (`pulp_wars-v642.10`): the plain for three rounds,
        // then the raids.
        directive: "HOLD",
        size: 16,
        map: "DRY_LAND",
        objective: {
          kind: "CAPTURE",
          places: ["BARROW"],
          byRound: 26,
          bonus: [
            { kind: "WITHIN_ROUNDS", rounds: 20 },
            { kind: "KEEP_CITIES" },
          ],
        },
        aiForbidden: [
          "GATHERING",
          "FARMING",
          "MILLING",
          "ADMINISTRATION",
          "PLANNING",
          "MARKSMANSHIP",
          "FIELDCRAFT",
          "SCOUTING",
          "ROADS",
          "COMMERCE",
          "RAIDING",
          "CHIVALRY",
          // The danger pass (`pulp_wars-v642.10`).
          "SAWMILLING",
          "EXPLOSIVES",
          "METALLURGY",
          "FORESTRY",
        ],
      },
      // The difficulty pass: a front rank to break, against a clock.
      FRONTIER_4: {
        human: ["ORIGINAL", "GOBLIN"],
        ai: "UNDEAD",
        directive: "GUARD",
        size: 16,
        map: "CONTINENTS",
        objective: {
          kind: "CAPTURE",
          places: ["GATE"],
          byRound: 14,
          bonus: [
            { kind: "WITHIN_ROUNDS", rounds: 9 },
            { kind: "KEEP_CITIES" },
          ],
        },
        aiForbidden: [
          "ADMINISTRATION",
          "PLANNING",
          "SAWMILLING",
          "SCOUTING",
          "ROADS",
          "COMMERCE",
          "RAIDING",
          "CHIVALRY",
          "MARKSMANSHIP",
          "FIELDCRAFT",
          "FORTIFICATION",
          "EXPLOSIVES",
          // The danger pass (`pulp_wars-v642.10`): no Wights.
          "METALLURGY",
        ],
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
      // The whole Naval branch is forbidden everywhere; nothing else (since
      // `pulp_wars-v642.7` mission 4 forbids Sawmilling to the Undead seat
      // only, so your Catapults can be rebuilt).
      expect([...definition.forbiddenTechnologies].sort()).toEqual(
        [...NAVAL].sort(),
      );
    }
    // Mission 3 (revision 5, `pulp_wars-v642.10`): the dead hold the plain
    // for three rounds, then three keep the Barrow while the rest storm
    // Wolfden until round 11, and from the new moon they hold the plain.
    expect(missionSeatDirectivesV7(seat(mission("FRONTIER_3"), 1))).toEqual([
      {
        kind: "HOLD",
        zone: [{ x0: 0, y0: 0, x1: 15, y1: 5 }],
        untilRound: 4,
      },
      {
        kind: "GUARD",
        zone: [{ x0: 11, y0: 3, x1: 13, y1: 5 }],
        garrison: 3,
        others: { kind: "ASSAULT", target: { x: 10, y: 13 } },
        untilRound: 11,
      },
      { kind: "HOLD", zone: [{ x0: 0, y0: 0, x1: 15, y1: 6 }] },
    ]);
    // Mission 3 is a build-up: one camp, three units, no technology.
    expect(seat(mission("FRONTIER_3"), 0).cities).toHaveLength(1);
    expect(seat(mission("FRONTIER_3"), 0).units).toHaveLength(3);
    expect(seat(mission("FRONTIER_3"), 0).technologies).toEqual([]);
    expect(seat(mission("FRONTIER_3"), 1).cities).toHaveLength(3);
    // Mission 4 (revision 6, `pulp_wars-v642.10`): the gate and the tower
    // keep seven; every other bone-man storms Camp Concord.
    expect(seat(mission("FRONTIER_4"), 1).directive).toEqual({
      kind: "GUARD",
      zone: [
        { x0: 9, y0: 5, x1: 11, y1: 7 },
        { x0: 10, y0: 9, x1: 12, y1: 11 },
      ],
      garrison: 7,
      others: { kind: "ASSAULT", target: { x: 2, y: 9 } },
    });
  });

  it("builds missions 7 and 8 as designed: the frozen sea against a clock, and a hunt", () => {
    // Mission 7: the Ice Folk cross the strait on ice to the Crater. It is
    // the build-up mission of the campaign difficulty pass
    // (`pulp_wars-v642.8`, revision 2): one town and no technology against
    // three native cities and the Baron's port, on a bigger board with a
    // longer clock.
    const island = mission("FRONTIER_7");
    expect(island.revision).toBe(3);
    expect(island.size).toBe(20);
    expect(island.source?.mapType).toBe("ARCHIPELAGO");
    expect(island.source?.seed).toBe(2);
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
      byRound: 30,
      bonus: [{ kind: "WITHIN_ROUNDS", rounds: 24 }, { kind: "KEEP_CITIES" }],
    });
    expect(seat(island, 0).cities).toHaveLength(1);
    expect(seat(island, 0).technologies).toEqual([]);
    expect(seat(island, 1).cities).toHaveLength(3);
    // You discover the frozen sea yourself, and no seat is forbidden it
    // mission-wide: the Baron sails, and the natives alone may not. The
    // natives cannot grow either (no Fruit, no Lumber Camp, no Mines).
    expect(island.forbiddenTechnologies).toEqual([]);
    expect(seat(island, 0).forbiddenTechnologies).toBeUndefined();
    for (const technology of [...NAVAL, "GATHERING", "FORESTRY", "DRILL"])
      expect(seat(island, 1).forbiddenTechnologies).toContain(technology);
    expect(seat(island, 2).technologies).toContain("NAVIGATION");
    expect(seat(island, 2).forbiddenTechnologies).toContain(
      "NAVAL_ENGINEERING",
    );
    // The Baron has a Port and a ship. Revision 3 (`pulp_wars-v642.10`, the
    // danger pass): he raids Coldharbour from round 7 to 11 with a landing
    // party on your spur, holds his island again until round 16, and then
    // makes for the Crater; his landing of round 14 brings another ship.
    expect(island.improvements).toContainEqual({
      at: { x: 15, y: 6 },
      improvement: "PORT",
    });
    expect(seat(island, 2).units.map((unit) => unit.role)).toContain(
      "PATROL_BOAT",
    );
    expect(missionSeatDirectivesV7(seat(island, 2))).toEqual([
      {
        kind: "HOLD",
        zone: [{ x0: 12, y0: 0, x1: 19, y1: 7 }],
        untilRound: 7,
      },
      { kind: "ASSAULT", target: { x: 4, y: 5 }, untilRound: 12 },
      {
        kind: "HOLD",
        zone: [{ x0: 12, y0: 0, x1: 19, y1: 7 }],
        untilRound: 16,
      },
      { kind: "ASSAULT", target: { x: 7, y: 15 } },
    ]);
    // He knows Coldharbour from the start (an assault marches only on a
    // known city).
    expect(seat(island, 2).reveal.rects).toContainEqual({
      x0: 3,
      y0: 4,
      x1: 5,
      y1: 6,
    });
    expect(
      island.reinforcements?.map((wave) => [
        wave.seat,
        wave.round,
        wave.units.map((unit) => unit.role),
      ]),
    ).toEqual([
      [2, 7, ["FIGHTER", "MARKSMAN"]],
      [2, 14, ["FIGHTER", "FIGHTER", "MARKSMAN", "GUARD", "PATROL_BOAT"]],
    ]);
    // The raiders come ashore on your spur, beside Hjorna's village.
    for (const unit of island.reinforcements?.[0]?.units ?? [])
      expect(unit.at.y).toBeLessThanOrEqual(8);
    // The Crater is the Dinosaur town on the shore that faces you, kept by
    // a garrison of three, and the strait is water on every column.
    const crater = island.landmarks?.find((mark) => mark.tag === "CRATER");
    expect(crater?.at).toEqual({ x: 7, y: 15 });
    expect(seat(island, 1).cities.map((city) => city.at)).toContainEqual(
      crater?.at,
    );
    expect(seat(island, 1).directive).toEqual({
      kind: "GUARD",
      zone: [{ x0: 6, y0: 14, x1: 8, y1: 16 }],
      garrison: 3,
    });
    for (const row of [9, 10, 11])
      expect(island.terrain[row]).toBe("~".repeat(20));
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
    // A build-up (`pulp_wars-v642.9`, revision 2): a longer clock.
    expect(hunt.objective).toEqual({
      kind: "KILL",
      units: ["OVERMIND"],
      byRound: 26,
      bonus: [
        { kind: "WITHIN_ROUNDS", rounds: 18 },
        { kind: "UNIT_ALIVE", unit: "OLD_QUEEN" },
      ],
    });
    expect([...hunt.forbiddenTechnologies].sort()).toEqual([...NAVAL].sort());
    expect(seat(hunt, 0).forbiddenTechnologies).toBeUndefined();
    // One nest and no technology: Engineering (the climb over the Rim and
    // the Pass) is the player's to research; the Martians may never climb.
    expect(seat(hunt, 0).technologies).toEqual([]);
    expect(seat(hunt, 0).cities).toHaveLength(1);
    // The Old Queen is a T-Rex: grown on the hunters, her bite ends the
    // hunt. The Overmind is a Brain, the Martian seat's first unit, on its
    // walled capital; the colony has two cities, the thralls two.
    const queen = seat(hunt, 0).units.find((unit) => unit.tag === "OLD_QUEEN");
    expect(queen?.role).toBe("KNIGHT");
    const martians = seat(hunt, 1);
    expect(martians.units[0]).toEqual({
      role: "CAPTAIN",
      at: { x: 12, y: 4 },
      tag: "OVERMIND",
    });
    expect(martians.cities[0]?.at).toEqual({ x: 12, y: 4 });
    expect(martians.cities[0]?.rewards).toContain("WALLS");
    expect(martians.cities).toHaveLength(2);
    expect(seat(hunt, 2).cities).toHaveLength(2);
    // No Colossus in the guard: with one, every Spitter was shot off the
    // Rim.
    expect(martians.units.map((unit) => unit.role)).not.toContain("JUGGERNAUT");
    expect(martians.directive).toEqual({
      kind: "GUARD",
      zone: [{ x0: 10, y0: 3, x1: 14, y1: 7 }],
      garrison: 9,
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
    // Revision 3 (`pulp_wars-v642.10`, the danger pass): the thralls keep
    // their camps only until round 3, then assault the nest; three waves of
    // three follow them, from round 6.
    expect(hunt.revision).toBe(3);
    expect(seat(hunt, 2).directive).toEqual([
      {
        kind: "HOLD",
        zone: [{ x0: 2, y0: 12, x1: 12, y1: 14 }],
        untilRound: 3,
      },
      { kind: "ASSAULT", target: { x: 4, y: 3 } },
    ]);
    expect(
      hunt.reinforcements?.map((wave) => [
        wave.seat,
        wave.round,
        wave.units.length,
      ]),
    ).toEqual([
      [2, 6, 3],
      [2, 12, 3],
      [2, 18, 3],
    ]);
    expect(() => validateMissionDirectivesV7(hunt)).not.toThrow();
  });

  it("builds missions 9 and 10 with an ally: seats, teams, directives, and objectives", () => {
    // Mission 9: the Martians and the Candy kingdom against the Undead and
    // the Goblins; hold the ally's capital for sixteen rounds.
    const rescue = mission("FRONTIER_9");
    expect(rescue.size).toBe(16);
    expect(rescue.source?.mapType).toBe("LAKES");
    expect(rescue.seats.map((item) => item.faction)).toEqual([
      "MARTIAN",
      "CANDY",
      "UNDEAD",
      "GOBLIN",
    ]);
    expect(rescue.teams).toEqual([0, 0, 1, 1]);
    expect(rescue.objective).toEqual({
      kind: "SURVIVE",
      rounds: 16,
      protect: [{ place: "SUGARCREST" }],
      bonus: [
        { kind: "UNIT_ALIVE", unit: "PRALINE" },
        { kind: "HOLD_PLACE", place: "RIFTWATCH" },
      ],
    });
    // Sugarcrest is the ally's capital, and the Queen its giant.
    expect(seat(rescue, 1).cities[0]?.at).toEqual({ x: 7, y: 8 });
    expect(
      seat(rescue, 1).units.find((unit) => unit.tag === "PRALINE")?.role,
    ).toBe("JUGGERNAUT");
    // Riftwatch is a neutral village at the start.
    expect(rescue.villages).toContainEqual({ x: 5, y: 14 });
    // The ally holds the land of its two cities; the Undead rush, and the
    // Goblins storm Sugarcrest from round 4 (revision 3, `pulp_wars-v642.10`:
    // they rushed, and stood off the walls).
    expect(seat(rescue, 1).directive).toEqual({
      kind: "HOLD",
      zone: [
        { x0: 5, y0: 6, x1: 9, y1: 10 },
        { x0: 7, y0: 4, x1: 9, y1: 5 },
      ],
    });
    expect(seat(rescue, 2).directive).toEqual({ kind: "RUSH" });
    expect(missionSeatDirectivesV7(seat(rescue, 3))).toEqual([
      {
        kind: "HOLD",
        zone: [{ x0: 10, y0: 12, x1: 15, y1: 15 }],
        untilRound: 4,
      },
      { kind: "ASSAULT", target: { x: 7, y: 8 } },
    ]);
    // Revision 3: no Confectioner in the kingdom.
    expect(rescue.revision).toBe(3);
    expect(seat(rescue, 1).units.map((unit) => unit.role)).not.toContain(
      "CAPTAIN",
    );
    // A band of Rift cuts your strip off: seven tiles in one column.
    const rift = rescue.terrain.flatMap((row, y) =>
      [...row].flatMap((cell, x) =>
        cell === "x" ? [`${String(x)},${String(y)}`] : [],
      ),
    );
    expect(rift).toEqual(["4,0", "4,1", "4,2", "4,12", "4,13", "4,14", "4,15"]);
    expect(
      rescue.reinforcements?.map((wave) => [wave.seat, wave.round]),
    ).toEqual([
      [2, 4],
      [3, 6],
      [2, 8],
      [3, 10],
      [2, 12],
      [3, 12],
      // Revision 3: the dead rise in your strip, and two more waves of
      // both besiegers come with siege engines.
      [2, 5],
      [2, 10],
      [2, 9],
      [3, 9],
      [2, 11],
      [3, 11],
    ]);

    // Mission 10: the Humans and the Goblins against the Cultists and the
    // Undead; capture the Lodge by round 24.
    const finale = mission("FRONTIER_10");
    expect(finale.size).toBe(20);
    expect(finale.source?.mapType).toBe("PANGEA");
    expect(finale.seats.map((item) => item.faction)).toEqual([
      "ORIGINAL",
      "GOBLIN",
      "CULT",
      "UNDEAD",
    ]);
    expect(finale.teams).toEqual([0, 0, 1, 1]);
    expect(finale.objective).toEqual({
      kind: "CAPTURE",
      places: ["LODGE"],
      byRound: 24,
      bonus: [{ kind: "WITHIN_ROUNDS", rounds: 20 }, { kind: "KEEP_CITIES" }],
    });
    // The Lodge is the Cult's walled capital.
    expect(seat(finale, 2).cities[0]).toMatchObject({
      at: { x: 10, y: 2 },
      rewards: ["STOCKPILE", "WALLS"],
    });
    expect(finale.landmarks).toEqual([{ tag: "LODGE", at: { x: 10, y: 2 } }]);
    // The ally grows, then marches; the Lodge guards its summit; the
    // thralls rush.
    expect(seat(finale, 1).directive).toEqual([
      { kind: "NORMAL", untilRound: 10 },
      { kind: "RUSH" },
    ]);
    expect(seat(finale, 2).directive).toEqual({
      kind: "GUARD",
      zone: [{ x0: 8, y0: 0, x1: 12, y1: 4 }],
      garrison: 8,
    });
    // Revision 5 (`pulp_wars-v642.10`, the danger pass): the thralls storm
    // Northwatch from the first round.
    expect(finale.revision).toBe(5);
    expect(seat(finale, 3).directive).toEqual({
      kind: "ASSAULT",
      target: { x: 4, y: 8 },
    });
    expect(seat(finale, 0).cities[1]).toMatchObject({
      name: "Northwatch",
      at: { x: 4, y: 8 },
    });
    // The four villages within an easy walk of your towns are gone.
    for (const at of [
      { x: 1, y: 8 },
      { x: 3, y: 16 },
      { x: 7, y: 17 },
      { x: 10, y: 14 },
    ])
      expect(finale.villages).not.toContainEqual(at);
    // The Cult meets the player with what makes it the Cult: Favour for
    // the first summons, two Summoners, the Great Summoning known, and no
    // Offering (its Favour is paid in blood). Revision 4 (the Cult
    // redesign's retune, `pulp_wars-mch9.46`): 8 Favour (the Herald costs
    // 18), and Gibbering Masses (with Engineering, its prerequisite) for
    // the summit's wall; still no Tentacles.
    const lodge = seat(finale, 2);
    expect(lodge.favour).toBe(8);
    expect(lodge.technologies).toContain("ADMINISTRATION");
    expect(lodge.technologies).toContain("EXPLOSIVES");
    expect(lodge.technologies).toContain("ENGINEERING");
    expect(lodge.technologies).toContain("METALLURGY");
    expect(lodge.forbiddenTechnologies).toContain("FARMING");
    expect(lodge.forbiddenTechnologies).toContain("CHIVALRY");
    expect(lodge.units.filter((unit) => unit.role === "CAPTAIN")).toHaveLength(
      2,
    );
    // (Revision 3, the Cult redesign's roster, `pulp_wars-mch9.31`: the
    // Caller and the Chosen retired, so no `KNIGHT` or `SWORDSMAN`.)
    for (const role of ["JUGGERNAUT", "CATAPULT", "GUARD", "MARKSMAN"])
      expect(
        lodge.units.some((unit) => unit.role === role),
        role,
      ).toBe(true);
    for (const role of ["KNIGHT", "SWORDSMAN"])
      expect(
        lodge.units.some((unit) => unit.role === role),
        role,
      ).toBe(false);
    expect(
      finale.reinforcements?.map((wave) => [wave.seat, wave.round]),
    ).toEqual([
      [3, 5],
      [3, 10],
      [2, 8],
      [2, 12],
      [2, 17],
    ]);

    for (const definition of [rescue, finale]) {
      expect(() => validateMissionDirectivesV7(definition)).not.toThrow();
      // You are never handicapped, and nobody sails.
      expect(seat(definition, 0).forbiddenTechnologies).toBeUndefined();
      expect([...definition.forbiddenTechnologies].sort()).toEqual(
        [...NAVAL].sort(),
      );
    }
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

  // Story names (`pulp_wars-v642.5`): the board says what the story says.
  it("gives every city a story name that the briefing's places agree with", () => {
    const bare = (name: string): string =>
      name.replace(/^the\s+/i, "").toLowerCase();
    for (const entry of CHAPTER_ONE_V7.missions) {
      const definition = mission(entry.missionId);
      const boardNames = new Map<string, string>();
      for (const item of definition.seats)
        for (const city of item.cities) {
          expect(city.name, `${entry.missionId} city`).toBeTypeOf("string");
          boardNames.set(`${city.at.x},${city.at.y}`, city.name as string);
        }
      for (const landmark of definition.landmarks ?? []) {
        const key = `${landmark.at.x},${landmark.at.y}`;
        const onBoard = boardNames.get(key) ?? landmark.name;
        expect(onBoard, `${entry.missionId} ${landmark.tag}`).toBeTypeOf(
          "string",
        );
        // "the Lodge" in a sentence is "The Lodge" on the board.
        expect(bare(onBoard as string)).toBe(
          bare(entry.names?.[landmark.tag] ?? ""),
        );
      }
      for (const name of boardNames.values()) {
        expect(name, entry.missionId).not.toMatch(/\d/);
        expect(name.length, name).toBeLessThanOrEqual(16);
      }
    }
    // The places the briefings and hints name are cities on the board.
    const named = (id: string, ...places: string[]): void => {
      const all = mission(id).seats.flatMap((item) =>
        item.cities.map((city) => city.name),
      );
      for (const place of places) expect(all, id).toContain(place);
    };
    named("FRONTIER_1", "Fort Hollow");
    named("FRONTIER_2", "Muckgate", "Stinkwell", "The Warrens");
    named("FRONTIER_4", "Bone Gate");
    named("FRONTIER_5", "Kessler's Toll");
    named("FRONTIER_6", "The Deep Gate");
    named("FRONTIER_8", "The Glass Ship");
    named("FRONTIER_9", "Sugarcrest");
    named("FRONTIER_10", "The Lodge", "Hollow Barrow", "Grubnak's Hall");
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
