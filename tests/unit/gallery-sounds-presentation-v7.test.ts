import { describe, expect, it } from "vitest";
import {
  OTHER_PLAYER_BUILD_GAIN_V7,
  SOUND_IDS_V1,
  SOUND_MANIFEST_V1,
  SOUND_THEMES_V1,
  STOCK_SOUNDS_V1,
  STOCK_SOUND_CLIPS_V1,
  playableSoundIdsV1,
  playableSoundV1,
  soundRecipeV1,
  stockSoundCandidateV1,
  stockSoundV1,
  synthRecipeDurationMsV1,
  type SoundThemeEntryV1,
} from "../../src/audio/index";
import { FACTION_IDS_V7 } from "../../src/engine/index";
import {
  GALLERY_SOUND_GENERATED_TEXT_V7,
  GALLERY_SOUND_GROUP_IDS_V7,
  GALLERY_THEME_PENDING_TEXT_V7,
  gallerySoundCardLabelV7,
  gallerySoundChoiceIdsV7,
  gallerySoundChoicePlayLabelV7,
  gallerySoundChoiceUseLabelV7,
  gallerySoundChoicesV7,
  gallerySoundGroupOfV7,
  gallerySoundGroupsV7,
  gallerySoundHasNoteV7,
  gallerySoundOriginLabelV7,
  gallerySoundOriginV7,
  gallerySoundPlayLabelV7,
} from "../../src/render/gallery-sounds-presentation-v7";

/**
 * The Gallery's Sounds tab as data (bead pulp_wars-2yc.19, docs/ui/SOUND.md
 * "The Gallery's Sounds tab"): it lists the manifest, no more and no less,
 * and one theme row per faction.
 */

const COORDINATE = /\b\d{1,2}, ?\d{1,2}\b/;

const TEST_THEME: SoundThemeEntryV1 = {
  id: "theme.undead",
  faction: "UNDEAD",
  loop: true,
  source: { kind: "FILE", url: "audio/theme-undead.ogg" },
};

describe("Gallery sounds", () => {
  it("lists every sound of the manifest exactly once, and nothing else", () => {
    const groups = gallerySoundGroupsV7();
    const effects = groups
      .filter((group) => group.id !== "THEMES")
      .flatMap((group) => group.entries);
    // A sound added to the manifest appears; one the Gallery made up, or a
    // sound listed twice, fails here.
    expect(effects.map((entry) => entry.key).sort()).toEqual(
      [...SOUND_IDS_V1].sort(),
    );
    expect(effects.map((entry) => entry.rowId)).toEqual(
      effects.map((entry) => entry.key),
    );
    // Everything playable is offered: the effects and the registered themes.
    const playable = groups
      .flatMap((group) => group.entries)
      .map((entry) => entry.key)
      .filter((key) => key !== null);
    expect([...playable].sort()).toEqual([...playableSoundIdsV1()].sort());
    for (const key of playable) expect(playableSoundV1(key)).not.toBeNull();
  });

  it("groups by the first part of the manifest id, in a fixed order", () => {
    const groups = gallerySoundGroupsV7();
    expect(groups.map((group) => [group.id, group.label])).toEqual([
      ["ATTACKS", "Attacks"],
      ["HITS", "Hits"],
      ["UNITS", "Units"],
      ["ABILITIES", "Abilities"],
      ["ECONOMY", "Cities and economy"],
      ["MATCH", "Turn and match"],
      ["INTERFACE", "Interface"],
      ["THEMES", "Themes"],
    ]);
    expect(groups.map((group) => group.id)).toEqual(
      GALLERY_SOUND_GROUP_IDS_V7.filter((id) => id !== "OTHER"),
    );
    // Every part of today's ids has a group: nothing falls into "Other".
    for (const id of SOUND_IDS_V1)
      expect(gallerySoundGroupOfV7(id), id).not.toBe("OTHER");
    expect(gallerySoundGroupOfV7("attack.melee")).toBe("ATTACKS");
    expect(gallerySoundGroupOfV7("special.freeze")).toBe("ABILITIES");
    expect(gallerySoundGroupOfV7("village.capture")).toBe("ECONOMY");
    expect(gallerySoundGroupOfV7("ui.error")).toBe("INTERFACE");
    // Inside a group the manifest's order is kept.
    for (const group of groups.filter((entry) => entry.id !== "THEMES"))
      expect(group.entries.map((entry) => entry.key)).toEqual(
        SOUND_IDS_V1.filter((id) => gallerySoundGroupOfV7(id) === group.id),
      );
  });

  it("names every sound, says when it plays and pictures what makes it", () => {
    for (const group of gallerySoundGroupsV7())
      for (const entry of group.entries) {
        if (entry.faction !== null) continue;
        const id = entry.rowId as (typeof SOUND_IDS_V1)[number];
        expect(gallerySoundHasNoteV7(id), id).toBe(true);
        // The name is the manifest's label; the note adds, never repeats.
        expect(entry.name).toBe(SOUND_MANIFEST_V1[id].label);
        expect(entry.when, id).not.toBe("");
        expect(entry.when.toLowerCase(), id).not.toBe(entry.name.toLowerCase());
        // A few words, and never a tile coordinate.
        expect(entry.when.split(" ").length, id).toBeLessThanOrEqual(4);
        expect(`${entry.name} ${entry.when}`).not.toMatch(COORDINATE);
        expect(gallerySoundPlayLabelV7(entry)).toBe(`Play: ${entry.name}`);
      }
    const byId = new Map(
      gallerySoundGroupsV7()
        .flatMap((group) => group.entries)
        .map((entry) => [entry.rowId, entry]),
    );
    // The unit that makes an attack's sound is its picture and its words.
    expect(byId.get("attack.magic")).toMatchObject({
      when: "Lich attacks",
      picture: {
        kind: "ART",
        subject: "PORTRAIT:UNDEAD:CATAPULT",
        faction: "UNDEAD",
      },
    });
    expect(byId.get("attack.rocket")?.when).toBe("Rocket Cart attacks");
    expect(byId.get("unit.death")?.picture).toEqual({
      kind: "ICON",
      icon: "skull",
    });
  });

  it("offers the two ends of a detuned sound, and the quiet building", () => {
    const entries = gallerySoundGroupsV7().flatMap((group) => group.entries);
    for (const entry of entries) {
      if (entry.faction !== null) continue;
      const id = entry.rowId as (typeof SOUND_IDS_V1)[number];
      const pitches = entry.variants.filter(
        (variant) => variant.id === "LOW" || variant.id === "HIGH",
      );
      // A sound the mixer detunes has a lower and a higher; a tune has none.
      expect(
        pitches.map((variant) => [variant.id, variant.detune]),
        id,
      ).toEqual(
        SOUND_MANIFEST_V1[id].jitterCents > 0
          ? [
              ["LOW", -1],
              ["HIGH", 1],
            ]
          : [],
      );
    }
    const build = entries.find((entry) => entry.rowId === "economy.build");
    expect(build?.variants.find((variant) => variant.id === "FAR")).toEqual({
      id: "FAR",
      label: "Play as another player's",
      gain: OTHER_PLAYER_BUILD_GAIN_V7,
    });
    expect(
      entries.filter((entry) =>
        entry.variants.some((variant) => variant.id === "FAR"),
      ).length,
    ).toBe(1);
    if (build === undefined) throw new Error("missing Build");
    expect(gallerySoundPlayLabelV7(build, build.variants[0])).toBe(
      "Play lower: Build",
    );
    // Only a sound of a second or more gets a stop control: a long tune,
    // or a sound one of whose recordings is that long.
    const long = entries
      .filter((entry) => entry.faction === null && entry.long)
      .map((entry) => entry.rowId);
    for (const entry of entries) {
      if (entry.faction !== null) continue;
      const id = entry.rowId as (typeof SOUND_IDS_V1)[number];
      const recipe = soundRecipeV1(id);
      const lengths = [
        recipe === null ? 0 : synthRecipeDurationMsV1(recipe),
        ...(stockSoundV1(id)?.candidates ?? []).map(
          (candidate) => (candidate.endSeconds - candidate.startSeconds) * 1000,
        ),
      ];
      expect(long.includes(id), id).toBe(Math.max(...lengths) >= 1000);
    }
    for (const id of [
      "impact.explosion",
      "achievement.unlocked",
      "achievement.monument",
      "match.victory",
      "match.defeat",
    ])
      expect(long, id).toContain(id);
    expect(long).not.toContain("impact.hit");
    expect(long).not.toContain("ui.click");
  });

  it("has a pending theme row for every faction while none is registered", () => {
    // No faction theme has been written yet.
    expect(SOUND_THEMES_V1).toEqual([]);
    const themes = gallerySoundGroupsV7().at(-1);
    expect(themes?.id).toBe("THEMES");
    expect(themes?.entries.map((entry) => entry.faction)).toEqual([
      ...FACTION_IDS_V7,
    ]);
    for (const entry of themes?.entries ?? []) {
      expect(entry.key).toBeNull();
      expect(entry.when).toBe(GALLERY_THEME_PENDING_TEXT_V7);
      expect(entry.rowId).toBe(`theme:${entry.faction}`);
      expect(entry.picture).toMatchObject({
        kind: "ART",
        faction: entry.faction,
      });
      expect(entry.variants).toEqual([]);
    }
    expect(themes?.entries.map((entry) => entry.name)).toEqual([
      "Human",
      "Undead",
      "Goblin",
      "Dinosaur",
      "Martian",
      "Ice Folk",
      "Dwarf",
      "Candy",
    ]);
  });

  it("makes a faction's row playable once its theme is in the manifest", () => {
    const themes = gallerySoundGroupsV7([TEST_THEME]).at(-1);
    const undead = themes?.entries.find((entry) => entry.faction === "UNDEAD");
    expect(undead).toMatchObject({
      key: "theme.undead",
      rowId: "theme:UNDEAD",
      name: "Undead",
      when: "Theme",
      long: true,
    });
    if (undead === undefined) throw new Error("missing Undead theme");
    expect(gallerySoundPlayLabelV7(undead)).toBe("Play: Undead theme");
    // The other factions are still pending.
    expect(
      themes?.entries
        .filter((entry) => entry.key === null)
        .map((entry) => entry.faction),
    ).toEqual(FACTION_IDS_V7.filter((faction) => faction !== "UNDEAD"));
  });

  it("keeps the theme manifest well formed", () => {
    // One theme per faction at most, ids of their own that start "theme.".
    expect(new Set(SOUND_THEMES_V1.map((theme) => theme.faction)).size).toBe(
      SOUND_THEMES_V1.length,
    );
    expect(new Set(SOUND_THEMES_V1.map((theme) => theme.id)).size).toBe(
      SOUND_THEMES_V1.length,
    );
    for (const theme of SOUND_THEMES_V1) {
      expect(theme.id.startsWith("theme.")).toBe(true);
      expect(FACTION_IDS_V7).toContain(theme.faction);
      expect((SOUND_IDS_V1 as readonly string[]).includes(theme.id)).toBe(
        false,
      );
    }
  });
});

/**
 * Where each sound comes from (bead pulp_wars-2yc.20, docs/ui/SOUND.md
 * "Stock recordings"): read from the provenance manifest, which is the
 * only list of recordings.
 */
describe("Gallery sound origins", () => {
  const entries = gallerySoundGroupsV7().flatMap((group) => group.entries);
  const effects = entries.filter((entry) => entry.faction === null);

  it("shows the library file and the cut of every recorded sound", () => {
    expect(STOCK_SOUND_CLIPS_V1.length).toBeGreaterThan(0);
    for (const clip of STOCK_SOUND_CLIPS_V1) {
      // A provenance row without a card fails here.
      const entry = effects.find((candidate) => candidate.rowId === clip.id);
      expect(entry, `${clip.id} has no card`).toBeDefined();
      const origin = entry?.origin;
      expect(origin?.kind, clip.id).toBe("RECORDED");
      if (origin?.kind !== "RECORDED" || entry === undefined) continue;
      expect(origin.library).toBe(clip.library);
      expect(origin.file).toBe(clip.originalFile);
      expect(origin.startSeconds).toBe(clip.startSeconds);
      expect(origin.endSeconds).toBe(clip.endSeconds);
      // The vendor folder and the file name exactly as the bundle has them.
      expect(origin.text).toBe(`${clip.library} / ${clip.originalFile}`);
      expect(origin.cut).toBe(`${clip.startSeconds}–${clip.endSeconds} s`);
      expect(gallerySoundOriginLabelV7(origin)).toBe(
        `Recorded: ${clip.library} / ${clip.originalFile}, ${clip.startSeconds}–${clip.endSeconds} s`,
      );
      expect(gallerySoundCardLabelV7(entry)).toBe(
        `Play: ${entry.name}. Recorded: ${origin.text}, ${origin.cut}`,
      );
    }
    const explosion = effects.find(
      (entry) => entry.rowId === "impact.explosion",
    );
    expect(explosion?.origin).toMatchObject({
      kind: "RECORDED",
      text: "DavidDumais - Explosion SFX Pack / EXPLReal_Medium Realistic Explosion 15_DDUMAIS_NONE.wav",
      cut: "0–1.05 s",
    });
  });

  it("says Generated for every sound without a recording, and no other", () => {
    const recorded = new Set(STOCK_SOUND_CLIPS_V1.map((clip) => clip.id));
    for (const entry of effects) {
      const expected = recorded.has(entry.rowId) ? "RECORDED" : "GENERATED";
      // A card whose origin disagrees with the manifest fails here.
      expect(entry.origin?.kind, entry.rowId).toBe(expected);
      expect(
        SOUND_MANIFEST_V1[entry.rowId as (typeof SOUND_IDS_V1)[number]].source
          .kind,
        entry.rowId,
      ).toBe(expected === "RECORDED" ? "FILE" : "SYNTH");
      if (expected === "RECORDED") continue;
      expect(entry.origin).toEqual({
        kind: "GENERATED",
        text: GALLERY_SOUND_GENERATED_TEXT_V7,
      });
      expect(gallerySoundCardLabelV7(entry)).toBe(
        `Play: ${entry.name}. Generated`,
      );
    }
    expect(
      effects.filter((entry) => entry.origin?.kind === "RECORDED").length,
    ).toBe(STOCK_SOUND_CLIPS_V1.length);
    expect(GALLERY_SOUND_GENERATED_TEXT_V7).toBe("Generated");
  });

  it("offers the generated version of a recorded sound, and of no other", () => {
    for (const entry of effects) {
      const generated = entry.variants.filter(
        (variant) => variant.id === "GENERATED",
      );
      if (entry.origin?.kind !== "RECORDED") {
        expect(generated, entry.rowId).toEqual([]);
        continue;
      }
      expect(generated, entry.rowId).toEqual([
        { id: "GENERATED", label: "Play generated", generated: true },
      ]);
      // It is the last control of the card.
      expect(entry.variants.at(-1)?.id).toBe("GENERATED");
      expect(gallerySoundPlayLabelV7(entry, generated[0])).toBe(
        `Play generated: ${entry.name}`,
      );
    }
  });

  it("shows every sound as generated when recordings are switched off", () => {
    const off = gallerySoundGroupsV7(SOUND_THEMES_V1, { stockSounds: false })
      .flatMap((group) => group.entries)
      .filter((entry) => entry.faction === null);
    expect(off.length).toBe(SOUND_IDS_V1.length);
    for (const entry of off) {
      expect(entry.origin?.kind, entry.rowId).toBe("GENERATED");
      expect(
        entry.variants.some((variant) => variant.id === "GENERATED"),
        entry.rowId,
      ).toBe(false);
    }
    expect(
      gallerySoundOriginV7("impact.explosion", { stockSounds: false }),
    ).toEqual({ kind: "GENERATED", text: "Generated" });
    expect(gallerySoundOriginV7("impact.explosion")?.kind).toBe("RECORDED");
  });

  it("shows a theme's source once one is registered", () => {
    const pending = gallerySoundGroupsV7([]).at(-1);
    for (const entry of pending?.entries ?? [])
      expect(entry.origin, entry.rowId).toBeNull();
    const themes = gallerySoundGroupsV7([
      TEST_THEME,
      {
        id: "theme.goblin",
        faction: "GOBLIN",
        loop: false,
        source: {
          kind: "SYNTH",
          recipe: { peak: 0.2, layers: [{ wave: "sine", ms: 300, hz: 220 }] },
        },
      },
    ]).at(-1);
    const undead = themes?.entries.find((entry) => entry.faction === "UNDEAD");
    // A registered file without a provenance row is named by its file.
    expect(undead?.origin).toEqual({ kind: "FILE", text: "theme-undead.ogg" });
    if (undead === undefined) throw new Error("missing Undead theme");
    expect(gallerySoundCardLabelV7(undead)).toBe(
      "Play: Undead theme. File: theme-undead.ogg",
    );
    expect(
      themes?.entries.find((entry) => entry.faction === "GOBLIN")?.origin,
    ).toEqual({ kind: "GENERATED", text: "Generated" });
    expect(gallerySoundOriginV7("theme.none")).toBeNull();
  });
});

/**
 * The recordings a sound can be set to play (bead pulp_wars-2yc.24,
 * docs/ui/SOUND.md "Choosing between recordings"): read from the
 * provenance manifest, with the default and this browser's pick marked.
 */
describe("Gallery sound choices", () => {
  const entriesWith = (
    options: Parameters<typeof gallerySoundGroupsV7>[1] = {},
  ) =>
    gallerySoundGroupsV7(SOUND_THEMES_V1, options)
      .flatMap((group) => group.entries)
      .filter((entry) => entry.faction === null);
  const entryOf = (
    id: string,
    options: Parameters<typeof gallerySoundGroupsV7>[1] = {},
  ) => {
    const entry = entriesWith(options).find(
      (candidate) => candidate.rowId === id,
    );
    if (entry === undefined) throw new Error(`no card for ${id}`);
    return entry;
  };

  it("lists a sound's recordings in order, then the generated sound", () => {
    expect(gallerySoundChoiceIdsV7()).toEqual(
      STOCK_SOUNDS_V1.map((sound) => sound.id),
    );
    for (const entry of entriesWith()) {
      const sound = stockSoundV1(entry.rowId);
      if (sound === null) {
        // A sound without recordings has nothing to choose.
        expect(entry.choices, entry.rowId).toEqual([]);
        continue;
      }
      expect(entry.choices.map((choice) => choice.n)).toEqual([
        ...sound.candidates.map((candidate) => candidate.n),
        0,
      ]);
      expect(entry.choices.map((choice) => choice.label)).toEqual([
        ...sound.candidates.map((candidate) => String(candidate.n)),
        "Generated",
      ]);
      // Exactly one default and one in use, and without a pick the same.
      expect(
        entry.choices.filter((choice) => choice.isDefault).map((c) => c.n),
        entry.rowId,
      ).toEqual([sound.default]);
      expect(
        entry.choices.filter((choice) => choice.chosen).map((c) => c.n),
        entry.rowId,
      ).toEqual([sound.default]);
      for (const choice of entry.choices) {
        if (choice.n === 0) {
          expect(choice.origin).toEqual({
            kind: "GENERATED",
            text: "Generated",
          });
          expect(choice.note).toBe("");
          continue;
        }
        const clip = stockSoundCandidateV1(entry.rowId, choice.n);
        if (clip === null) throw new Error("missing candidate");
        expect(choice.origin).toMatchObject({
          kind: "RECORDED",
          library: clip.library,
          file: clip.originalFile,
          text: `${clip.library} / ${clip.originalFile}`,
          cut: `${clip.startSeconds}–${clip.endSeconds} s`,
        });
        expect(choice.note).toBe(clip.note);
      }
      if (entry.key !== null)
        expect(gallerySoundChoicesV7(entry.key)).toEqual(entry.choices);
    }
  });

  it("names a choice's controls with its whole origin and its note", () => {
    const hit = entryOf("impact.hit");
    const first = hit.choices[0];
    const second = hit.choices[1];
    const generated = hit.choices.at(-1);
    const clip = stockSoundCandidateV1("impact.hit", 2);
    if (
      first === undefined ||
      second === undefined ||
      generated === undefined ||
      clip === null
    )
      throw new Error("missing choice");
    expect(gallerySoundChoicePlayLabelV7(hit, second)).toBe(
      `Play recording 2 of Hit: ${clip.library} / ${clip.originalFile}, ${clip.startSeconds}–${clip.endSeconds} s. ${clip.note}`,
    );
    expect(gallerySoundChoicePlayLabelV7(hit, first)).toMatch(
      /^Play recording 1 of Hit \(default\): /,
    );
    expect(gallerySoundChoicePlayLabelV7(hit, generated)).toBe(
      "Play generated: Hit",
    );
    expect(gallerySoundChoiceUseLabelV7(hit, second)).toBe(
      "Use recording 2 for Hit",
    );
    expect(gallerySoundChoiceUseLabelV7(hit, generated)).toBe(
      "Use the generated sound for Hit",
    );
    // A sound that is generated by default says so on that choice.
    const death = entryOf("unit.death");
    const deathGenerated = death.choices.at(-1);
    if (deathGenerated === undefined) throw new Error("missing choice");
    expect(deathGenerated.isDefault).toBe(true);
    expect(gallerySoundChoicePlayLabelV7(death, deathGenerated)).toBe(
      "Play generated: Death (default)",
    );
  });

  it("shows the picked recording as the card's origin and marks it", () => {
    const picks = { "impact.hit": 3, "unit.death": 1, "impact.heavy": 0 };
    const hit = entryOf("impact.hit", { picks });
    const clip = stockSoundCandidateV1("impact.hit", 3);
    if (clip === null) throw new Error("missing candidate");
    expect(hit.origin).toMatchObject({
      kind: "RECORDED",
      file: clip.originalFile,
    });
    expect(
      hit.choices.filter((choice) => choice.chosen).map((c) => c.n),
    ).toEqual([3]);
    // The default is still marked: the pick is this browser's alone.
    expect(
      hit.choices.filter((choice) => choice.isDefault).map((c) => c.n),
    ).toEqual([1]);
    expect(gallerySoundOriginV7("impact.hit", { picks })).toEqual(hit.origin);

    // A sound that is generated by default, set to its recording.
    const death = entryOf("unit.death", { picks });
    expect(death.origin?.kind).toBe("RECORDED");
    expect(death.variants.map((variant) => variant.id)).toContain("GENERATED");
    expect(entryOf("unit.death").origin?.kind).toBe("GENERATED");
    expect(
      entryOf("unit.death").variants.map((variant) => variant.id),
    ).not.toContain("GENERATED");

    // A recorded sound set to its generated version.
    const heavy = entryOf("impact.heavy", { picks });
    expect(heavy.origin).toEqual({ kind: "GENERATED", text: "Generated" });
    expect(heavy.choices.at(-1)?.chosen).toBe(true);
    expect(gallerySoundCardLabelV7(heavy)).toBe("Play: Heavy hit. Generated");

    // A pick the sound does not have is no pick.
    expect(entryOf("impact.hit", { picks: { "impact.hit": 99 } })).toEqual(
      entryOf("impact.hit"),
    );
  });

  it("offers no choice with the recordings switched off", () => {
    expect(gallerySoundChoiceIdsV7({ stockSounds: false })).toEqual([]);
    for (const entry of entriesWith({
      stockSounds: false,
      picks: { "impact.hit": 2 },
    })) {
      expect(entry.choices, entry.rowId).toEqual([]);
      expect(entry.origin?.kind, entry.rowId).toBe("GENERATED");
    }
  });
});
