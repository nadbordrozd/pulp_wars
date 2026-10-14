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

const BUILT = ["FRONTIER_1", "FRONTIER_2", "FRONTIER_3", "FRONTIER_4"];

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
  it("lists ten missions in order: the first four registered and built, the rest designed", () => {
    expect(CHAPTER_ONE_V7.missions.map((entry) => entry.missionId)).toEqual([
      ...BUILT,
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
    expect(planned).toHaveLength(6);
    for (const plan of planned) {
      expect(plan.leads).toHaveLength(1);
      expect(plan.opponents).toHaveLength(2);
      expect([14, 16, 20]).toContain(plan.size);
    }
    expect(
      planned.filter((plan) => (plan.allies ?? []).length > 0),
    ).toHaveLength(2);
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
