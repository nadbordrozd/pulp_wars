import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import {
  GAME_THEME_FACTIONS_V1,
  THEME_IMITATION_PHRASES_V1,
  THEME_MUSIC_DOC_PATH,
  THEME_NAME_DENYLIST_V1,
  THEME_VOCAL_WORDS_V1,
  codePointLengthV1,
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
 * The faction theme prompts (beads pulp_wars-2yc.21 and pulp_wars-2yc.23,
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

/** Every entry that has a Suno Styles-field string: factions, then extras. */
const styleLongEntries = [
  ...Object.entries(data.factions).map(([key, entry]) => ({
    key,
    styleLong: entry.sunoStyleLong,
    tempo: entry.tempo,
    metre: entry.metre,
    loop: true,
    promptVersion: entry.promptVersion,
  })),
  ...data.extras.map((extra) => ({
    key: extra.id,
    styleLong: extra.sunoStyleLong,
    tempo: extra.tempo,
    metre: extra.metre,
    loop: extra.loop,
    promptVersion: extra.promptVersion,
  })),
];

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

  it("has a Suno Styles-field string for every faction and extra, within 1000 characters", () => {
    expect(data.schemaVersion).toBe(2);
    expect(data.shared.budgets.sunoStyleLongChars).toBe(1000);
    expect(styleLongEntries).toHaveLength(FACTION_IDS_V7.length + 3);
    for (const entry of styleLongEntries) {
      expect(typeof entry.styleLong, entry.key).toBe("string");
      const length = codePointLengthV1(entry.styleLong);
      expect(length, entry.key).toBeLessThanOrEqual(1000);
      // It uses the room the short tags do not have.
      expect(length, entry.key).toBeGreaterThan(
        data.shared.budgets.sunoStyleChars,
      );
      expect(entry.styleLong, entry.key).not.toMatch(/[\n\r]/);
      expect(entry.promptVersion, entry.key).toBeGreaterThanOrEqual(2);
    }
    // A looping theme leaves room for a small edit.
    for (const entry of styleLongEntries.filter((each) => each.loop)) {
      expect(codePointLengthV1(entry.styleLong), entry.key).toBeLessThanOrEqual(
        980,
      );
      expect(
        codePointLengthV1(entry.styleLong),
        entry.key,
      ).toBeGreaterThanOrEqual(850);
    }
    expect(new Set(styleLongEntries.map((entry) => entry.styleLong)).size).toBe(
      styleLongEntries.length,
    );
  });

  it("says instrumental, the tempo, the metre and the form in every Styles-field string", () => {
    for (const entry of styleLongEntries) {
      const text = entry.styleLong;
      const said = text.indexOf("instrumental, no vocals");
      expect(said, entry.key).toBeGreaterThanOrEqual(0);
      expect(said, entry.key).toBeLessThan(200);
      expect(text, entry.key).toContain(`${entry.tempo.target} BPM`);
      expect(
        [...text.matchAll(/(\d+) BPM/g)].map((match) => Number(match[1])),
        entry.key,
      ).toEqual([entry.tempo.target]);
      expect(text, entry.key).toContain(entry.metre.signature);
      expect(text, entry.key).toContain(data.shared.motif);
      expect(text, entry.key).toContain("never dark or grim");
      expect(text, entry.key).toContain("close and fairly dry mix");
      if (entry.loop) {
        expect(text, entry.key).toContain("A-B-A form, B section");
        expect(text, entry.key).toMatch(/steady (plucked )?map pulse/);
        expect(text, entry.key).toContain("loopable");
        expect(text, entry.key).toContain("no fade-out");
      } else {
        expect(text, entry.key).toContain("does not repeat");
        expect(text, entry.key).not.toContain("loopable");
      }
    }
  });

  it("keeps every Styles-field string clear of the deny-lists", () => {
    for (const entry of styleLongEntries) {
      expect(
        wordsFoundV1(entry.styleLong, THEME_NAME_DENYLIST_V1),
        entry.key,
      ).toEqual([]);
      expect(
        wordsFoundV1(entry.styleLong, THEME_IMITATION_PHRASES_V1),
        entry.key,
      ).toEqual([]);
      // "vocals" is named once, in the statement that forbids them.
      expect(
        wordsFoundV1(
          entry.styleLong.replace("instrumental, no vocals", ""),
          THEME_VOCAL_WORDS_V1,
        ),
        entry.key,
      ).toEqual([]);
    }
  });

  it("names each faction's lead and rhythm instruments in its Styles-field string", () => {
    // The first word or two of a palette entry is how the string names it.
    const named: Record<string, readonly string[]> = {
      ORIGINAL: ["trumpet", "French horn", "snare drum", "timpani", "lute"],
      UNDEAD: ["harpsichord", "reed organ", "bass clarinet", "xylophone"],
      GOBLIN: ["bassoon", "bass clarinet", "junk percussion", "tuba"],
      DINOSAUR: ["ocarina", "tuba and trombone", "toms", "log drums"],
      MARTIAN: ["theremin", "vibraphone", "synth bass", "bongos"],
      ICE_FOLK: ["celesta", "glass harmonica", "frame drum", "sleigh bells"],
      DWARF: ["tuba and euphonium", "concertina", "anvil", "steam hiss"],
      CANDY: ["toy piano", "glockenspiel", "ukulele", "woodblocks"],
    };
    expect(Object.keys(named).sort()).toEqual([...FACTION_IDS_V7].sort());
    for (const [key, instruments] of Object.entries(named)) {
      for (const instrument of instruments) {
        expect(data.factions[key]?.sunoStyleLong, key).toContain(instrument);
      }
    }
  });

  it("reports a Styles-field string that is missing, too long or has drifted", () => {
    const base = data.factions.UNDEAD?.sunoStyleLong ?? "";
    const problemsFor = (sunoStyleLong: string): string =>
      validateThemePromptsV1(withFaction("UNDEAD", { sunoStyleLong })).join(
        "\n",
      );
    expect(
      validateThemePromptsV1(
        withFaction("UNDEAD", {
          sunoStyleLong: undefined as unknown as string,
        }),
      ).join("\n"),
    ).toContain("UNDEAD: the Suno Styles-field string is missing");
    expect(
      problemsFor(`${base}, ${"pizzicato strings, ".repeat(4)}celesta`),
    ).toMatch(
      /UNDEAD: the Suno Styles-field string is \d+ characters, over the budget of 1000/,
    );
    // Characters are counted as code points: 1000 astral characters fit.
    expect(codePointLengthV1("\u{1D11E}".repeat(1000))).toBe(1000);
    expect(
      problemsFor("harpsichord waltz, instrumental, 96 BPM, 3/4"),
    ).toContain("no longer than the short tags");
    expect(
      problemsFor(base.replace("instrumental, no vocals, ", "")),
    ).toContain(
      'must say "instrumental, no vocals" within its first 200 characters',
    );
    expect(problemsFor(base.replace("96 BPM", "104 BPM"))).toContain(
      'UNDEAD: the Suno Styles-field string does not state the tempo, "96 BPM"',
    );
    expect(
      problemsFor(base.replace("96 BPM", "96 BPM, not 196 bpm")),
    ).toContain('states another tempo, "196 bpm"');
    expect(problemsFor(base.replace("3/4", "4/4"))).toContain(
      'UNDEAD: the Suno Styles-field string does not state the metre, "3/4"',
    );
    expect(
      problemsFor(base.replace("rising three-note call", "fanfare")),
    ).toContain("does not name the shared opening");
    expect(problemsFor(base.replace("loopable", "repeating"))).toContain(
      'does not say "loopable"',
    );
    expect(
      problemsFor(base.replace(", A-B-A form", ",\nA-B-A form")),
    ).toContain("must be one line");
    expect(problemsFor(base.replace("music box", "wordless choir"))).toContain(
      "UNDEAD: a prompt asks for a voice (choir)",
    );
    expect(
      problemsFor(base.replace("graveyard waltz", "Danse Macabre")),
    ).toContain(
      "UNDEAD: a prompt names an artist or a franchise (danse macabre)",
    );
    expect(
      problemsFor(base.replace("Spooky-fun", "Sounds like a spooky")),
    ).toContain("UNDEAD: a prompt asks for an imitation");
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
    expect(section).toContain("Schema version 2;");
    for (const entry of styleLongEntries) {
      // The Styles-field form comes first, with its length, then the tags.
      const heading = `**Suno — Styles field (up to 1000 characters)** (${codePointLengthV1(entry.styleLong)} characters):\n\n\`\`\`text\n${entry.styleLong}\n\`\`\`\n\n**Suno, short tags (fallback, up to 200 characters)**`;
      expect(section, entry.key).toContain(heading);
    }
    for (const entry of Object.values(data.factions)) {
      expect(section).toContain(sunoStyleV1(data.shared, entry));
      expect(section).toContain(sunoExcludeV1(data.shared, entry));
      expect(section).toContain(longPromptV1(data.shared, entry));
      expect(section).toContain(entry.sunoStructure.join("\n"));
    }
  });

  it("names a registered theme as the manifest does", () => {
    // A registered theme uses the data's theme id: a faction's its
    // faction's, a theme of no faction (the title theme) an extra's.
    expect(SOUND_THEMES_V1.length).toBeGreaterThan(0);
    for (const theme of SOUND_THEMES_V1) {
      if (theme.faction === null)
        expect(data.extras.map((extra) => extra.id)).toContain(theme.id);
      else expect(data.factions[theme.faction]?.themeId).toBe(theme.id);
    }
  });
});
