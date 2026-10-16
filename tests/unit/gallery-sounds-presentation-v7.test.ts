import { describe, expect, it } from "vitest";
import {
  OTHER_PLAYER_BUILD_GAIN_V7,
  SOUND_IDS_V1,
  SOUND_MANIFEST_V1,
  SOUND_CHOICE_SETS_V1,
  SOUND_DEFAULT_CLIPS_V1,
  SOUND_THEMES_V1,
  elevenLabsSoundV1,
  playableSoundIdsV1,
  playableSoundV1,
  soundCandidateSecondsV1,
  soundCandidateV1,
  soundChoiceSetV1,
  soundRecipeV1,
  soundUserPickV1,
  stockSoundCandidateV1,
  stockSoundV1,
  synthRecipeDurationMsV1,
  type SoundThemeEntryV1,
} from "../../src/audio/index";
import { OFFERED_FACTION_IDS_V7 } from "../../src/engine/index";
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
      ["CULT", "Cultists"],
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
    // The Cultists' own sounds have a row of their own (pulp_wars-mch9.24).
    expect(gallerySoundGroupOfV7("cult.ribbit")).toBe("CULT");
    expect(
      groups
        .find((group) => group.id === "CULT")
        ?.entries.map((entry) => [entry.key, entry.name, entry.origin?.kind]),
    ).toEqual([
      ["cult.ribbit", "Frog croak", "ELEVENLABS"],
      ["cult.pamphlets", "Paper rustle", "ELEVENLABS"],
      ["cult.proclaim", "Proclaim", "ELEVENLABS"],
      ["cult.summon", "Summoning", "ELEVENLABS"],
      // The user's picks of 2026-10-14: an old recording each.
      ["cult.herald", "Herald arrives", "RECORDED"],
      ["cult.starfall", "Falling star", "ELEVENLABS"],
      ["cult.snap", "Strand snaps", "ELEVENLABS"],
      ["cult.unbound", "Daemon unbound", "ELEVENLABS"],
      ["cult.tentacle", "Tentacle", "ELEVENLABS"],
      ["cult.sacrifice", "Sacrifice", "RECORDED"],
    ]);
    // Inside a group the manifest's order is kept.
    for (const group of groups.filter((entry) => entry.id !== "THEMES"))
      expect(group.entries.map((entry) => entry.key)).toEqual(
        SOUND_IDS_V1.filter((id) => gallerySoundGroupOfV7(id) === group.id),
      );
  });

  it("keeps the silent Monument's card, marked as not played", () => {
    // The user, 2026-10-14: "for monument let's not have a sound effect at
    // all". The event is silent (sound-events-v7.ts); the card stays.
    const monument = gallerySoundGroupsV7()
      .flatMap((group) => group.entries)
      .find((entry) => entry.rowId === "achievement.monument");
    expect(monument?.when).toBe("Not played");
    expect(monument?.key).toBe("achievement.monument");
  });

  it("names every sound, says when it plays and pictures what makes it", () => {
    for (const group of gallerySoundGroupsV7())
      for (const entry of group.entries) {
        if (entry.theme) continue;
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
      if (entry.theme) continue;
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
      .filter((entry) => !entry.theme && entry.long)
      .map((entry) => entry.rowId);
    for (const entry of entries) {
      if (entry.theme) continue;
      const id = entry.rowId as (typeof SOUND_IDS_V1)[number];
      const recipe = soundRecipeV1(id);
      const lengths = [
        recipe === null ? 0 : synthRecipeDurationMsV1(recipe),
        ...(soundChoiceSetV1(id)?.candidates ?? []).map(
          (candidate) => soundCandidateSecondsV1(candidate) * 1000,
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

  it("has a playable theme row for every faction, and one for the title theme", () => {
    // Bead pulp_wars-2yc.27: the themes are in the manifest.
    const themes = gallerySoundGroupsV7().at(-1);
    expect(themes?.id).toBe("THEMES");
    expect(themes?.entries.map((entry) => entry.faction)).toEqual([
      ...OFFERED_FACTION_IDS_V7,
      null,
    ]);
    for (const entry of themes?.entries ?? []) {
      // Each plays its manifest entry and says which file that is.
      const theme = SOUND_THEMES_V1.find(
        (candidate) => candidate.faction === entry.faction,
      );
      expect(entry.key, entry.rowId).toBe(theme?.id);
      expect(entry.theme, entry.rowId).toBe(true);
      expect(entry.when, entry.rowId).toBe("Theme");
      expect(entry.long, entry.rowId).toBe(true);
      expect(entry.variants).toEqual([]);
      expect(entry.choices).toEqual([]);
      expect(entry.origin, entry.rowId).toEqual({
        kind: "FILE",
        text: `${theme?.id.replace(".", "-")}.m4a`,
      });
    }
    const title = themes?.entries.at(-1);
    expect(title).toMatchObject({
      key: "theme.title",
      rowId: "theme:TITLE",
      name: "Title",
      picture: { kind: "ICON", icon: "music" },
    });
    if (title === undefined) throw new Error("missing title theme");
    expect(gallerySoundCardLabelV7(title)).toBe(
      "Play: Title theme. File: theme-title.m4a",
    );
    // No effect card is a theme row: those follow Sound, these Music.
    for (const group of gallerySoundGroupsV7().slice(0, -1))
      for (const entry of group.entries) expect(entry.theme).toBe(false);
  });

  it("has a pending theme row for every faction without a theme", () => {
    const themes = gallerySoundGroupsV7([]).at(-1);
    expect(themes?.id).toBe("THEMES");
    expect(themes?.entries.map((entry) => entry.faction)).toEqual([
      ...OFFERED_FACTION_IDS_V7,
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
      "Cultists",
    ]);
  });

  it("makes a faction's row playable once its theme is in the manifest", () => {
    const themes = gallerySoundGroupsV7([TEST_THEME]).at(-1);
    const undead = themes?.entries.find((entry) => entry.faction === "UNDEAD");
    expect(themes?.entries).toHaveLength(OFFERED_FACTION_IDS_V7.length);
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
    ).toEqual(OFFERED_FACTION_IDS_V7.filter((faction) => faction !== "UNDEAD"));
  });

  it("keeps the theme manifest well formed", () => {
    // One theme per faction at most (and one of no faction, the title
    // theme), ids of their own that start "theme.".
    expect(new Set(SOUND_THEMES_V1.map((theme) => theme.faction)).size).toBe(
      SOUND_THEMES_V1.length,
    );
    expect(new Set(SOUND_THEMES_V1.map((theme) => theme.id)).size).toBe(
      SOUND_THEMES_V1.length,
    );
    for (const theme of SOUND_THEMES_V1) {
      expect(theme.id.startsWith("theme.")).toBe(true);
      if (theme.faction === null) expect(theme.label).toBe("Title");
      else expect(OFFERED_FACTION_IDS_V7).toContain(theme.faction);
      expect((SOUND_IDS_V1 as readonly string[]).includes(theme.id)).toBe(
        false,
      );
    }
  });
});

/**
 * Where each sound comes from (beads pulp_wars-2yc.20 and pulp_wars-2yc.51,
 * docs/ui/SOUND.md "Stock recordings"): read from the provenance
 * manifests, which are the only lists of takes and recordings.
 */
describe("Gallery sound origins", () => {
  const entries = gallerySoundGroupsV7().flatMap((group) => group.entries);
  const effects = entries.filter((entry) => !entry.theme);

  it("shows the take, its prompt and its length for every ElevenLabs default", () => {
    expect(SOUND_DEFAULT_CLIPS_V1.length).toBeGreaterThan(0);
    for (const clip of SOUND_DEFAULT_CLIPS_V1) {
      // A provenance row without a card fails here.
      const entry = effects.find((candidate) => candidate.rowId === clip.id);
      expect(entry, `${clip.id} has no card`).toBeDefined();
      const origin = entry?.origin;
      // The user's own pick (a recording or a take) plays ahead of the
      // measured default, and reads "Pick".
      if (clip.userPick) {
        expect(origin?.kind, clip.id).toBe(
          clip.origin === "STOCK" ? "RECORDED" : "ELEVENLABS",
        );
        if (origin?.kind === "ELEVENLABS")
          expect(origin.take, clip.id).toBe("Pick");
        continue;
      }
      expect(origin?.kind, clip.id).toBe("ELEVENLABS");
      if (
        origin?.kind !== "ELEVENLABS" ||
        entry === undefined ||
        clip.origin !== "ELEVENLABS"
      )
        continue;
      expect(origin.take).toBe("New 1");
      expect(origin.prompt).toBe(clip.prompt);
      expect(origin.generated).toBe(clip.generated);
      expect(origin.seconds).toBe(clip.seconds);
      expect(origin.text).toBe(`ElevenLabs, generated ${clip.generated}`);
      expect(origin.cut).toBe(`${clip.seconds} s`);
      expect(gallerySoundOriginLabelV7(origin)).toBe(
        `ElevenLabs new 1: ${clip.prompt} (${clip.seconds} s, generated ${clip.generated})`,
      );
      expect(gallerySoundCardLabelV7(entry)).toBe(
        `Play: ${entry.name}. ${gallerySoundOriginLabelV7(origin)}`,
      );
    }
  });

  it("shows the library file and the cut of an old recording in use", () => {
    const picks = { "impact.explosion": 1 };
    const explosion = gallerySoundGroupsV7(SOUND_THEMES_V1, { picks })
      .flatMap((group) => group.entries)
      .find((entry) => entry.rowId === "impact.explosion");
    const clip = stockSoundCandidateV1("impact.explosion", 1);
    if (explosion === undefined || clip === null) throw new Error("missing");
    expect(explosion.origin).toMatchObject({
      kind: "RECORDED",
      library: clip.library,
      file: clip.originalFile,
      startSeconds: clip.startSeconds,
      endSeconds: clip.endSeconds,
      text: "DavidDumais - Explosion SFX Pack / EXPLReal_Medium Realistic Explosion 15_DDUMAIS_NONE.wav",
      cut: "0–1.05 s",
    });
    if (explosion.origin?.kind !== "RECORDED") throw new Error("not recorded");
    expect(gallerySoundOriginLabelV7(explosion.origin)).toBe(
      `Recorded: ${clip.library} / ${clip.originalFile}, ${clip.startSeconds}–${clip.endSeconds} s`,
    );
    expect(gallerySoundCardLabelV7(explosion)).toBe(
      `Play: ${explosion.name}. Recorded: ${explosion.origin.text}, ${explosion.origin.cut}`,
    );
  });

  it("says Synth for every sound without a default clip, and no other", () => {
    const recorded = new Map(
      SOUND_DEFAULT_CLIPS_V1.map((clip) => [
        clip.id,
        clip.origin === "STOCK" ? "RECORDED" : "ELEVENLABS",
      ]),
    );
    for (const entry of effects) {
      const expected = recorded.get(entry.rowId) ?? "GENERATED";
      // A card whose origin disagrees with the manifest fails here.
      expect(entry.origin?.kind, entry.rowId).toBe(expected);
      expect(
        SOUND_MANIFEST_V1[entry.rowId as (typeof SOUND_IDS_V1)[number]].source
          .kind,
        entry.rowId,
      ).toBe(expected === "GENERATED" ? "SYNTH" : "FILE");
      if (expected !== "GENERATED") continue;
      expect(entry.origin).toEqual({
        kind: "GENERATED",
        text: GALLERY_SOUND_GENERATED_TEXT_V7,
      });
      expect(gallerySoundCardLabelV7(entry)).toBe(`Play: ${entry.name}. Synth`);
    }
    expect(
      effects.filter((entry) => entry.origin?.kind !== "GENERATED").length,
    ).toBe(SOUND_DEFAULT_CLIPS_V1.length);
    // The user's own picks of a recording: the firework rocket's two
    // halves, and the old recordings chosen on 2026-10-14.
    expect(
      effects
        .filter((entry) => entry.origin?.kind === "RECORDED")
        .map((entry) => entry.rowId),
    ).toEqual([
      "attack.rocket",
      "impact.rocket",
      "support.rally",
      "support.dark",
      "cult.herald",
      "cult.sacrifice",
      "city.lost",
      "economy.build",
      "turn.end",
      "ui.select",
      "ui.click",
    ]);
    // The one sound none of whose takes passed (docs/audio/ELEVENLABS_SFX.md).
    expect(
      effects
        .filter((entry) => entry.origin?.kind === "GENERATED")
        .map((entry) => entry.rowId),
    ).toEqual(["unit.train"]);
    expect(GALLERY_SOUND_GENERATED_TEXT_V7).toBe("Synth");
  });

  it("offers the synth version of a sound with a clip, and of no other", () => {
    for (const entry of effects) {
      const generated = entry.variants.filter(
        (variant) => variant.id === "GENERATED",
      );
      if (
        entry.origin?.kind !== "RECORDED" &&
        entry.origin?.kind !== "ELEVENLABS"
      ) {
        expect(generated, entry.rowId).toEqual([]);
        continue;
      }
      expect(generated, entry.rowId).toEqual([
        { id: "GENERATED", label: "Play synth", generated: true },
      ]);
      // It is the last control of the card.
      expect(entry.variants.at(-1)?.id).toBe("GENERATED");
      expect(gallerySoundPlayLabelV7(entry, generated[0])).toBe(
        `Play synth: ${entry.name}`,
      );
    }
  });

  it("shows every sound as synth when recordings are switched off", () => {
    const off = gallerySoundGroupsV7(SOUND_THEMES_V1, { stockSounds: false })
      .flatMap((group) => group.entries)
      .filter((entry) => !entry.theme);
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
    ).toEqual({ kind: "GENERATED", text: "Synth" });
    expect(gallerySoundOriginV7("impact.explosion")?.kind).toBe("ELEVENLABS");
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
    ).toEqual({ kind: "GENERATED", text: "Synth" });
    expect(gallerySoundOriginV7("theme.none")).toBeNull();
  });
});

/**
 * What a sound can be set to play (beads pulp_wars-2yc.24 and
 * pulp_wars-2yc.51, docs/ui/SOUND.md "Choosing between recordings"): its
 * ElevenLabs takes, its old stock recordings and the synth, read from the
 * provenance manifests, with the default and this browser's pick marked.
 */
describe("Gallery sound choices", () => {
  const entriesWith = (
    options: Parameters<typeof gallerySoundGroupsV7>[1] = {},
  ) =>
    gallerySoundGroupsV7(SOUND_THEMES_V1, options)
      .flatMap((group) => group.entries)
      .filter((entry) => !entry.theme);
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
  const HIT_NEW = soundChoiceSetV1("impact.hit")?.default ?? -1;

  it("lists new takes (the default first), old recordings, then the synth", () => {
    expect(gallerySoundChoiceIdsV7()).toEqual(
      SOUND_CHOICE_SETS_V1.map((sound) => sound.id),
    );
    expect(gallerySoundChoiceIdsV7()).toEqual([...SOUND_IDS_V1]);
    for (const entry of entriesWith()) {
      const sound = soundChoiceSetV1(entry.rowId);
      if (sound === null) throw new Error(`${entry.rowId} has no choices`);
      expect(entry.choices.map((choice) => choice.n)).toEqual([
        ...sound.candidates.map((candidate) => candidate.n),
        0,
      ]);
      // The pick reads "Pick"; every other take and recording keeps its
      // place in its manifest ("New 3" is the third take with or without
      // a pick of "New 2").
      const takes = (elevenLabsSoundV1(entry.rowId)?.takes ?? []).map(
        (take) => take.n,
      );
      const recordings = (stockSoundV1(entry.rowId)?.candidates ?? []).map(
        (candidate) => candidate.n,
      );
      expect(entry.choices.map((choice) => choice.label)).toEqual([
        ...sound.candidates.map((candidate) =>
          candidate.userPick
            ? "Pick"
            : candidate.origin === "ELEVENLABS"
              ? `New ${takes.indexOf(candidate.n) + 1}`
              : `Old ${recordings.indexOf(candidate.n) + 1}`,
        ),
        "Synth",
      ]);
      expect(
        entry.choices.filter((choice) => choice.label === "Pick").length,
        entry.rowId,
      ).toBe(soundUserPickV1(entry.rowId) === null ? 0 : 1);
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
          expect(choice.origin).toEqual({ kind: "GENERATED", text: "Synth" });
          expect(choice.note).toBe("");
          continue;
        }
        const clip = soundCandidateV1(entry.rowId, choice.n);
        if (clip === null) throw new Error("missing candidate");
        expect(choice.note).toBe(clip.note);
        if (clip.origin === "ELEVENLABS") {
          expect(choice.origin).toMatchObject({
            kind: "ELEVENLABS",
            take: choice.label,
            prompt: clip.prompt,
            cut: `${clip.seconds} s`,
          });
          continue;
        }
        expect(choice.origin).toMatchObject({
          kind: "RECORDED",
          library: clip.library,
          file: clip.originalFile,
          text: `${clip.library} / ${clip.originalFile}`,
          cut: `${clip.startSeconds}–${clip.endSeconds} s`,
        });
      }
      if (entry.key !== null)
        expect(gallerySoundChoicesV7(entry.key)).toEqual(entry.choices);
    }
  });

  it("shows the move sounds side by side under Units, with their takes", () => {
    // Bead pulp_wars-2yc.57: footsteps on land, an oar dip afloat.
    const units = gallerySoundGroupsV7().find((group) => group.id === "UNITS");
    const keys = units?.entries.map((entry) => entry.rowId) ?? [];
    expect(keys.indexOf("unit.step.naval")).toBe(keys.indexOf("unit.step") + 1);
    const land = entryOf("unit.step");
    const naval = entryOf("unit.step.naval");
    expect(land).toMatchObject({ name: "Footsteps", when: "Unit walks" });
    expect(naval).toMatchObject({
      name: "Ship moves",
      when: "Ship sails",
      picture: { kind: "ART", faction: "ORIGINAL" },
    });
    for (const entry of [land, naval]) {
      const sound = soundChoiceSetV1(entry.rowId);
      // New 1 is the default take, at least one more new take to choose,
      // and the synth last.
      expect(entry.choices[0]).toMatchObject({
        label: "New 1",
        isDefault: true,
        n: sound?.default,
      });
      expect(
        entry.choices.filter((choice) => choice.label.startsWith("New "))
          .length,
        entry.rowId,
      ).toBeGreaterThanOrEqual(2);
      expect(entry.choices.at(-1)?.label).toBe("Synth");
    }
    // The land sound keeps its chess-piece recordings to compare.
    expect(land.choices.some((choice) => choice.label === "Old 1")).toBe(true);
  });

  it("names a choice's controls with its whole origin and its note", () => {
    const hit = entryOf("impact.hit");
    const first = hit.choices[0];
    const second = hit.choices[1];
    const old2 = hit.choices.find((choice) => choice.n === 2);
    const generated = hit.choices.at(-1);
    const take = soundCandidateV1("impact.hit", second?.n ?? -1);
    const clip = stockSoundCandidateV1("impact.hit", 2);
    if (
      first === undefined ||
      second === undefined ||
      old2 === undefined ||
      generated === undefined ||
      clip === null ||
      take === null ||
      take.origin !== "ELEVENLABS"
    )
      throw new Error("missing choice");
    expect(first.n).toBe(HIT_NEW);
    expect(gallerySoundChoicePlayLabelV7(hit, second)).toBe(
      `Play new 2 of Hit: ${take.prompt} (${take.seconds} s, ElevenLabs, generated ${take.generated}). ${take.note}`,
    );
    expect(gallerySoundChoicePlayLabelV7(hit, first)).toMatch(
      /^Play new 1 of Hit \(default\): .*ElevenLabs, generated /,
    );
    expect(old2.label).toBe("Old 2");
    expect(gallerySoundChoicePlayLabelV7(hit, old2)).toBe(
      `Play old recording 2 of Hit: ${clip.library} / ${clip.originalFile}, ${clip.startSeconds}–${clip.endSeconds} s. ${clip.note}`,
    );
    expect(gallerySoundChoicePlayLabelV7(hit, generated)).toBe(
      "Play synth: Hit",
    );
    expect(gallerySoundChoiceUseLabelV7(hit, second)).toBe("Use new 2 for Hit");
    expect(gallerySoundChoiceUseLabelV7(hit, old2)).toBe(
      "Use old recording 2 for Hit",
    );
    expect(gallerySoundChoiceUseLabelV7(hit, generated)).toBe(
      "Use the synth sound for Hit",
    );
    // A sound that plays the synth by default says so on that choice.
    const train = entryOf("unit.train");
    const trainSynth = train.choices.at(-1);
    if (trainSynth === undefined) throw new Error("missing choice");
    expect(trainSynth.isDefault).toBe(true);
    expect(gallerySoundChoicePlayLabelV7(train, trainSynth)).toBe(
      "Play synth: Unit trained (default)",
    );
  });

  it("puts the user's pick first for the firework rocket, the takes and old ones after", () => {
    const rocket = entryOf("attack.rocket");
    const takes = soundChoiceSetV1("attack.rocket")?.candidates.filter(
      (candidate) => candidate.origin === "ELEVENLABS",
    );
    expect(rocket.choices.map((choice) => choice.label)).toEqual([
      "Pick",
      ...(takes ?? []).map((_, index) => `New ${index + 1}`),
      "Old 1",
      "Synth",
    ]);
    expect(rocket.choices.map((choice) => choice.n)).toEqual([
      2,
      ...(takes ?? []).map((take) => take.n),
      1,
      0,
    ]);
    const [pick] = rocket.choices;
    if (pick === undefined) throw new Error("missing choice");
    expect(pick).toMatchObject({ isDefault: true, chosen: true });
    expect(rocket.origin).toMatchObject({
      kind: "RECORDED",
      library: "Pole Position - The Warfare 2 Library",
      cut: "0.308–0.587 s",
    });
    expect(gallerySoundChoicePlayLabelV7(rocket, pick)).toMatch(
      /^Play your pick of Rocket launch \(default\): Pole Position - The Warfare 2 Library \/ RPG - FIRING AND IMPACT/,
    );
    expect(gallerySoundChoiceUseLabelV7(rocket, pick)).toBe(
      "Use your pick for Rocket launch",
    );
    const old1 = rocket.choices.find((choice) => choice.n === 1);
    if (old1 === undefined) throw new Error("missing choice");
    expect(gallerySoundChoiceUseLabelV7(rocket, old1)).toBe(
      "Use old recording 1 for Rocket launch",
    );
    // An ElevenLabs take picked in this browser still plays instead.
    const first = takes?.[0];
    if (first === undefined) throw new Error("attack.rocket has no take");
    const picked = entryOf("attack.rocket", {
      picks: { "attack.rocket": first.n },
    });
    expect(picked.origin?.kind).toBe("ELEVENLABS");
    expect(
      picked.choices.filter((choice) => choice.chosen).map((c) => c.n),
    ).toEqual([first.n]);
    // The impact half: its own card, the pick and the synth.
    const hit = entryOf("impact.rocket");
    expect(hit.name).toBe("Rocket hit");
    expect(hit.when).toBe("Rocket Cart's rocket lands");
    expect(hit.choices.map((choice) => choice.label)).toEqual([
      "Pick",
      "Synth",
    ]);
    expect(hit.choices[0]?.isDefault).toBe(true);
  });

  it("shows the picked recording as the card's origin and marks it", () => {
    const train = soundChoiceSetV1("unit.train")?.candidates[0]?.n ?? -1;
    const picks = { "impact.hit": 3, "unit.train": train, "impact.heavy": 0 };
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
    ).toEqual([HIT_NEW]);
    expect(gallerySoundOriginV7("impact.hit", { picks })).toEqual(hit.origin);

    // A sound that plays the synth by default, set to a take.
    const picked = entryOf("unit.train", { picks });
    expect(picked.origin?.kind).toBe("ELEVENLABS");
    expect(picked.variants.map((variant) => variant.id)).toContain("GENERATED");
    expect(entryOf("unit.train").origin?.kind).toBe("GENERATED");
    expect(
      entryOf("unit.train").variants.map((variant) => variant.id),
    ).not.toContain("GENERATED");

    // A sound with a take set to its synth version.
    const heavy = entryOf("impact.heavy", { picks });
    expect(heavy.origin).toEqual({ kind: "GENERATED", text: "Synth" });
    expect(heavy.choices.at(-1)?.chosen).toBe(true);
    expect(gallerySoundCardLabelV7(heavy)).toBe("Play: Heavy hit. Synth");

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
