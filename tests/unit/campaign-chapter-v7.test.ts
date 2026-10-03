import { describe, expect, it } from "vitest";
import { validateMissionDirectivesV7 } from "../../src/ai/v7-directives";
import { CHAPTER_ONE_V7 } from "../../src/campaign/chapter-1";
import {
  MISSION_REGISTRY_V7,
  missionByIdV7,
  missionSeatFactionsV7,
  type FactionIdV7,
  type MissionDefinitionV7,
} from "../../src/engine/index";

// Campaign Chapter One (`pulp_wars-68k.4`, docs/product/CAMPAIGN.md sections
// 4.3, 5, 6, and 8.3): the chapter data names exactly the registered,
// non-hidden missions in order; the unlock table makes every mission
// playable when it opens; the AI directives, forbidden technologies, and
// faction choices are the design's; and the player-facing text is short and
// never names a tile coordinate.

const NAVAL = ["SHORECRAFT", "NAVIGATION", "NAVAL_ENGINEERING"] as const;

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
    );
  }
  return texts;
}

describe("Chapter One data", () => {
  it("lists the four Frontier missions in order, each registered and not hidden", () => {
    expect(CHAPTER_ONE_V7.missions.map((entry) => entry.missionId)).toEqual([
      "FRONTIER_1",
      "FRONTIER_2",
      "FRONTIER_3",
      "FRONTIER_4",
    ]);
    expect(CHAPTER_ONE_V7.missions.map((entry) => entry.number)).toEqual([
      1, 2, 3, 4,
    ]);
    for (const entry of CHAPTER_ONE_V7.missions) {
      const definition = mission(entry.missionId);
      expect(definition.hidden).toBeUndefined();
      expect(definition.objective).toEqual({ kind: "DOMINATION" });
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

  it("unlocks Goblins with mission 2 and Undead with mission 4, and every mission is playable when it opens", () => {
    expect(CHAPTER_ONE_V7.startingFactions).toEqual(["ORIGINAL"]);
    expect(CHAPTER_ONE_V7.missions.map((entry) => [...entry.unlocks])).toEqual([
      [],
      ["GOBLIN"],
      [],
      ["UNDEAD"],
    ]);
    const unlocked = new Set<FactionIdV7>(CHAPTER_ONE_V7.startingFactions);
    for (const entry of CHAPTER_ONE_V7.missions) {
      const choices = missionSeatFactionsV7(seat(mission(entry.missionId), 0));
      // A fixed faction must be unlocked; a choice lists unlocked options
      // only, and here every option is unlocked by the time it opens.
      for (const faction of choices) expect(unlocked.has(faction)).toBe(true);
      for (const faction of entry.unlocks) unlocked.add(faction);
    }
    expect([...unlocked].sort()).toEqual(["GOBLIN", "ORIGINAL", "UNDEAD"]);
  });

  it("matches the design's seats, directives, and forbidden technologies", () => {
    const expected: Record<
      string,
      {
        readonly human: readonly FactionIdV7[];
        readonly ai: FactionIdV7;
        readonly directive: string;
        readonly size: number;
      }
    > = {
      FRONTIER_1: {
        human: ["ORIGINAL"],
        ai: "GOBLIN",
        directive: "RUSH",
        size: 11,
      },
      FRONTIER_2: {
        human: ["ORIGINAL"],
        ai: "GOBLIN",
        directive: "NORMAL",
        size: 14,
      },
      FRONTIER_3: {
        human: ["GOBLIN"],
        ai: "UNDEAD",
        directive: "HOLD",
        size: 14,
      },
      FRONTIER_4: {
        human: ["ORIGINAL", "GOBLIN"],
        ai: "UNDEAD",
        directive: "GUARD",
        size: 16,
      },
    };
    for (const [id, want] of Object.entries(expected)) {
      const definition = mission(id);
      expect(definition.size).toBe(want.size);
      expect(definition.seats).toHaveLength(2);
      expect(definition.aiMode).toBe("RIVAL");
      expect(missionSeatFactionsV7(seat(definition, 0))).toEqual(want.human);
      expect(seat(definition, 1).faction).toBe(want.ai);
      expect(seat(definition, 1).directive?.kind ?? "NORMAL").toBe(
        want.directive,
      );
      expect(() => validateMissionDirectivesV7(definition)).not.toThrow();
      // The whole Naval branch is forbidden everywhere; nothing else.
      expect([...definition.forbiddenTechnologies].sort()).toEqual(
        [...NAVAL].sort(),
      );
    }
    // Mission 3 holds the north to the ridge until the new moon.
    expect(seat(mission("FRONTIER_3"), 1).directive).toEqual({
      kind: "HOLD",
      zone: [{ x0: 0, y0: 0, x1: 13, y1: 6 }],
      untilRound: 16,
    });
    // Mission 4 guards the gate with four.
    expect(seat(mission("FRONTIER_4"), 1).directive).toEqual({
      kind: "GUARD",
      zone: [{ x0: 10, y0: 7, x1: 12, y1: 9 }],
      garrison: 4,
    });
  });

  it("joins the Bone Neck shores only by the one-tile isthmus", () => {
    const terrain = mission("FRONTIER_4").terrain;
    const land = (x: number, y: number): boolean => {
      const cell = terrain[y]?.[x];
      return cell !== undefined && cell !== "~";
    };
    // Flood the west shore over land (eight neighbours, as units move).
    const seen = new Set<string>();
    const queue: [number, number][] = [[3, 8]];
    while (queue.length > 0) {
      const [x, y] = queue.pop() as [number, number];
      const key = `${String(x)},${String(y)}`;
      if (seen.has(key) || !land(x, y) || x >= 10) continue;
      seen.add(key);
      for (let dy = -1; dy <= 1; dy += 1)
        for (let dx = -1; dx <= 1; dx += 1) queue.push([x + dx, y + dy]);
    }
    const crossing = [...seen].filter((key) => Number(key.split(",")[0]) > 6);
    expect(crossing.sort()).toEqual(["7,8", "8,8", "9,8"]);
  });

  it("keeps player-facing text short, plain, and free of tile coordinates", () => {
    for (const entry of CHAPTER_ONE_V7.missions) {
      expect(entry.hints.length).toBeGreaterThan(0);
      expect(entry.hints.length).toBeLessThanOrEqual(3);
      for (const hint of entry.hints)
        expect(hint.length).toBeLessThanOrEqual(60);
      expect(entry.briefing.length).toBeLessThanOrEqual(400);
      expect(entry.closing.length).toBeLessThanOrEqual(200);
      expect(entry.objective).toBe("Capture every enemy city.");
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
