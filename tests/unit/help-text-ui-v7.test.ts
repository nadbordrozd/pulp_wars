import { describe, expect, it } from "vitest";
import {
  FACTION_IDS_V7,
  UNIT_ROLE_IDS_V7,
  effectiveRoleRuleV7,
} from "../../src/engine/index";
import {
  HELP_KEYS_V7,
  HELP_SECTIONS_V7,
  helpWordCountV7,
} from "../../src/render/help-text-v7";
import { factionNameV7 } from "../../src/render/undead-presentation-v7";

/**
 * Help (bead pulp_wars-2yc.39): short, high level, the same for every
 * faction, with no formula and no table.
 */
const lines = (): string[] =>
  HELP_SECTIONS_V7.flatMap((section) => section.lines);

describe("Ruleset 7 Help text", () => {
  it("covers a first game in eight short sections", () => {
    expect(HELP_SECTIONS_V7.map((section) => section.title)).toEqual([
      "The goal",
      "Your turn",
      "Cities",
      "Resources and buildings",
      "Technology",
      "Fighting",
      "Fog and exploring",
      "Units and factions",
    ]);
    expect(new Set(HELP_SECTIONS_V7.map((section) => section.id)).size).toBe(
      HELP_SECTIONS_V7.length,
    );
    for (const section of HELP_SECTIONS_V7) {
      expect(section.lines.length, section.id).toBeGreaterThanOrEqual(1);
      expect(section.lines.length, section.id).toBeLessThanOrEqual(5);
      for (const line of section.lines) {
        expect(line.length, line).toBeLessThanOrEqual(120);
        expect(line, line).toMatch(/[.]$/);
      }
    }
  });

  it("reads in about two minutes", () => {
    // About 200 words a minute.
    expect(helpWordCountV7()).toBeLessThanOrEqual(400);
    expect(helpWordCountV7()).toBeGreaterThan(150);
  });

  it("spells out no formula, number table or coordinate", () => {
    for (const line of lines()) {
      expect(line, line).not.toMatch(/\d/);
      expect(line, line).not.toMatch(/[×*=%<>+]|\bper\b/);
      expect(line, line).not.toMatch(/\bHP\b/);
    }
  });

  it("goes into no faction and names no unit", () => {
    const text = lines().join(" ");
    for (const faction of FACTION_IDS_V7) {
      // "Human" aside (no line says it either), a faction's name never
      // appears.
      expect(text, faction).not.toContain(factionNameV7(faction));
      for (const role of UNIT_ROLE_IDS_V7)
        expect(text, `${faction} ${role}`).not.toMatch(
          new RegExp(`\\b${effectiveRoleRuleV7(role, faction).label}s?\\b`),
        );
    }
    // One line points at where a unit's abilities are explained.
    expect(HELP_SECTIONS_V7.at(-1)?.lines).toEqual([
      "Every faction has its own units and tricks. Tap ? on a unit, or open the Gallery, to read what each can do.",
    ]);
  });

  it("names the five branches and the first steps", () => {
    const text = lines().join(" ");
    for (const word of [
      "Settlement",
      "Wilds",
      "Mobility",
      "Industry",
      "Naval",
      "train",
      "move",
      "attack",
      "End the turn",
      "first technology is free",
      "borders",
      "population",
      "level",
      "reward",
      "capture",
      "promotion",
      "hidden",
    ])
      expect(text, word).toContain(word);
  });

  it("lists the keys of a match", () => {
    expect(HELP_KEYS_V7.map(([key]) => key)).toEqual([
      "Arrows",
      "Enter",
      "Tab",
      "Esc",
      "E",
      "T",
      "G",
      "+ / −",
    ]);
  });
});
