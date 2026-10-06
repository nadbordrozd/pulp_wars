import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import {
  GAME_THEME_FACTIONS_V1,
  THEME_MUSIC_DOC_PATH,
  generatedSectionV1,
  loadThemePromptsV1,
  longPromptV1,
  renderThemePromptSectionV1,
  sunoExcludeV1,
  sunoStyleV1,
  validateThemePromptsV1,
  wordsFoundV1,
  type ThemeFactionPromptV1,
  type ThemePromptsV1,
} from "../../scripts/audio/theme-prompts";
import { SOUND_THEMES_V1 } from "../../src/audio/sound-manifest";
import {
  FACTION_DISPLAY_NAMES_V7,
  FACTION_IDS_V7,
} from "../../src/engine/index";

/**
 * The faction theme prompts (bead pulp_wars-2yc.21,
 * docs/audio/THEME_MUSIC.md): the data file covers exactly the game's
 * factions, every prompt keeps the rules, and the document shows the data.
 */

const data = await loadThemePromptsV1();

/** The data with one faction's entry changed. */
function withFaction(
  key: string,
  change: Partial<ThemeFactionPromptV1>,
): ThemePromptsV1 {
  const entry = data.factions[key];
  if (entry === undefined) throw new Error(`No entry for ${key}`);
  return {
    ...data,
    factions: { ...data.factions, [key]: { ...entry, ...change } },
  };
}

describe("faction theme prompts", () => {
  it("has one entry for every faction of the game and no other", () => {
    expect(Object.keys(data.factions).sort()).toEqual(
      [...FACTION_IDS_V7].sort(),
    );
    for (const id of FACTION_IDS_V7) {
      expect(data.factions[id]?.name).toBe(FACTION_DISPLAY_NAMES_V7[id]);
    }
    expect(GAME_THEME_FACTIONS_V1.map((faction) => faction.id)).toEqual([
      ...FACTION_IDS_V7,
    ]);
  });

  it("passes every check", () => {
    expect(validateThemePromptsV1(data)).toEqual([]);
  });

  it("keeps every Suno string within its budget", () => {
    const { budgets } = data.shared;
    for (const entry of Object.values(data.factions)) {
      expect(sunoStyleV1(data.shared, entry).length).toBeLessThanOrEqual(
        budgets.sunoStyleChars,
      );
      expect(sunoExcludeV1(data.shared, entry).length).toBeLessThanOrEqual(
        budgets.sunoExcludeChars,
      );
    }
    for (const extra of data.extras) {
      expect(extra.sunoStyle.length).toBeLessThanOrEqual(
        budgets.sunoStyleChars,
      );
      expect(extra.sunoExclude.length).toBeLessThanOrEqual(
        budgets.sunoExcludeChars,
      );
    }
  });

  it("says instrumental and the length in every long prompt", () => {
    for (const entry of Object.values(data.factions)) {
      const prompt = longPromptV1(data.shared, entry);
      expect(prompt).toContain("Instrumental only, no vocals");
      expect(prompt).toContain(`${data.shared.length.targetSeconds} seconds`);
      expect(prompt).not.toMatch(/[\n\r]/);
    }
  });

  it("gives every theme its own id, file and tempo", () => {
    const entries = Object.values(data.factions);
    expect(new Set(entries.map((entry) => entry.themeId)).size).toBe(
      entries.length,
    );
    expect(new Set(entries.map((entry) => entry.outputFile)).size).toBe(
      entries.length,
    );
    expect(new Set(entries.map((entry) => entry.tempo.target)).size).toBe(
      entries.length,
    );
  });

  it("reports a faction of the game that has no entry", () => {
    const factions = [
      ...GAME_THEME_FACTIONS_V1,
      { id: "PIRATE", name: "Pirate" },
    ];
    expect(validateThemePromptsV1(data, factions)).toEqual([
      "PIRATE: the faction exists in the game and has no theme prompt",
    ]);
  });

  it("reports an entry for a faction the game does not have", () => {
    const factions = GAME_THEME_FACTIONS_V1.filter(
      (faction) => faction.id !== "CANDY",
    );
    expect(validateThemePromptsV1(data, factions)).toEqual([
      "CANDY: a theme prompt for a faction the game does not have",
    ]);
  });

  it("reports a Suno string over its budget", () => {
    const long = withFaction("UNDEAD", {
      sunoStyle: `${data.factions.UNDEAD?.sunoStyle ?? ""}, ${"pizzicato strings, ".repeat(6)}celesta`,
    });
    expect(validateThemePromptsV1(long).join("\n")).toMatch(
      /UNDEAD: the Suno style string is \d+ characters, over the budget of 200/,
    );
    const exclude = withFaction("UNDEAD", {
      sunoExclude: "saxophone solo, ".repeat(8),
    });
    expect(validateThemePromptsV1(exclude).join("\n")).toMatch(
      /UNDEAD: the Suno exclude string is \d+ characters, over the budget/,
    );
  });

  it("reports a request for a voice, outside the sentence that forbids it", () => {
    for (const change of [
      { sunoStyle: "sea shanty, male choir, accordion, 100 bpm" },
      { sunoStructure: ["[Instrumental]", "[A: wordless chant]"] },
      {
        longPrompt:
          "A short rising three-note call, then a singer joins with lyrics.",
      },
    ] satisfies Partial<ThemeFactionPromptV1>[]) {
      expect(
        validateThemePromptsV1(withFaction("DWARF", change)).join("\n"),
      ).toContain("DWARF: a prompt asks for a voice");
    }
    // The exclude string is where those words belong.
    expect(
      validateThemePromptsV1(
        withFaction("DWARF", { sunoExclude: "male choir, chant" }),
      ),
    ).toEqual([]);
  });

  it("reports an artist, a franchise or an imitation phrase", () => {
    const named = withFaction("MARTIAN", {
      sunoStyle: "theremin, like Mars Attacks, 126 bpm",
    });
    expect(validateThemePromptsV1(named).join("\n")).toContain(
      "MARTIAN: a prompt names an artist or a franchise (mars attacks)",
    );
    const imitation = withFaction("MARTIAN", {
      sunoExclude: "in the style of a pop band",
    });
    expect(validateThemePromptsV1(imitation).join("\n")).toContain(
      "MARTIAN: a prompt asks for an imitation",
    );
    // Whole words only: "rapid" is not "rap", "wrapped" is not "rap".
    expect(
      wordsFoundV1("a rapid, wrapped Burtonesque hum-drum", ["rap"]),
    ).toEqual([]);
    expect(wordsFoundV1("No Vocals, please", ["vocals"])).toEqual(["vocals"]);
  });

  it("reports structure text a service could sing", () => {
    const sung = withFaction("CANDY", {
      sunoStructure: ["[Instrumental]", "[A] la la la"],
    });
    expect(validateThemePromptsV1(sung).join("\n")).toContain(
      "has text outside one pair of brackets",
    );
  });

  it("reports two themes of one metre at nearly one tempo", () => {
    const human = data.factions.ORIGINAL;
    if (human === undefined) throw new Error("No Human entry");
    const close = withFaction("MARTIAN", {
      tempo: { ...human.tempo, target: human.tempo.target + 4 },
    });
    expect(validateThemePromptsV1(close).join("\n")).toMatch(
      /ORIGINAL and MARTIAN: both are in 4\/4/,
    );
  });

  it("is shown in full, and up to date, in the document", async () => {
    const doc = await readFile(THEME_MUSIC_DOC_PATH, "utf8");
    const section = generatedSectionV1(doc);
    expect(section).not.toBeNull();
    // Run `npm run audio:theme-prompts -- render` after changing the data.
    expect(section).toBe(await renderThemePromptSectionV1(data));
    for (const entry of Object.values(data.factions)) {
      expect(section).toContain(sunoStyleV1(data.shared, entry));
      expect(section).toContain(sunoExcludeV1(data.shared, entry));
      expect(section).toContain(longPromptV1(data.shared, entry));
      expect(section).toContain(entry.sunoStructure.join("\n"));
    }
  });

  it("names a registered theme as the manifest does", () => {
    // No theme is registered yet; one that is must use the data's theme id.
    for (const theme of SOUND_THEMES_V1) {
      expect(data.factions[theme.faction]?.themeId).toBe(theme.id);
    }
  });
});
