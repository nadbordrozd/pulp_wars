import { describe, expect, it } from "vitest";
import {
  OTHER_PLAYER_BUILD_GAIN_V7,
  SOUND_IDS_V1,
  SOUND_MANIFEST_V1,
  SOUND_THEMES_V1,
  playableSoundIdsV1,
  playableSoundV1,
  type SoundThemeEntryV1,
} from "../../src/audio/index";
import { FACTION_IDS_V7 } from "../../src/engine/index";
import {
  GALLERY_SOUND_GROUP_IDS_V7,
  GALLERY_THEME_PENDING_TEXT_V7,
  gallerySoundGroupOfV7,
  gallerySoundGroupsV7,
  gallerySoundHasNoteV7,
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
      const pitches = entry.variants.filter((variant) => variant.id !== "FAR");
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
    expect(build?.variants.at(-1)).toEqual({
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
    // Only the long tunes get a stop control.
    expect(
      entries
        .filter((entry) => entry.faction === null && entry.long)
        .map((entry) => entry.rowId),
    ).toEqual([
      "achievement.unlocked",
      "achievement.monument",
      "match.victory",
      "match.defeat",
    ]);
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
