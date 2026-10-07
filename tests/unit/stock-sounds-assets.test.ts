import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  STOCK_SOUND_CHOICES_DOC_PATH,
  renderStockSoundChoicesV1,
  stockSoundChoicesMarkdownV1,
  stockSoundStatusRowsV1,
  stockSoundStatusTextV1,
} from "../../scripts/audio/stock-sound-choices";
import {
  THEME_MASTERS_V1,
  THEME_MUSIC_BIT_RATE_V1,
  THEME_MUSIC_FOLDER_V1,
  THEME_MUSIC_SAMPLE_RATE_V1,
  THEME_MUSIC_TARGET_LUFS_V1,
  integratedLufsV1,
  tailSecondsV1,
  themeMusicFileV1,
  trimPointsV1,
} from "../../scripts/audio/encode-themes";
import {
  THEME_RECORDS_AUTHOR_FIELDS_V1,
  THEME_RECORDS_AUTHOR_V1,
  THEME_RECORDS_DATE_V1,
  THEME_RECORDS_DOC_PATH,
  renderThemeRecordsV1,
  themeRecordFieldsV1,
  themeRecordsSectionV1,
} from "../../scripts/audio/theme-records";
import { soundAssetUrlsV7 } from "../../src/assets/asset-inventory-v7";
import { FACTION_IDS_V7 } from "../../src/engine/index";
import {
  SOUND_IDS_V1,
  SOUND_MANIFEST_V1,
  SOUND_THEMES_V1,
  SOUND_TITLE_THEME_ID_V1,
  THEME_MUSIC_OUTPUT_V1,
  THEME_MUSIC_PUBLIC_PATH_V1,
  THEME_MUSIC_TRACKS_V1,
  playableSoundV1,
  soundThemeOfFactionV1,
  themeMusicUrlV1,
  STOCK_SOUNDS_ENABLED_V1,
  STOCK_SOUNDS_V1,
  STOCK_SOUND_ALL_CLIPS_V1,
  STOCK_SOUND_BUNDLE_V1,
  STOCK_SOUND_CLIPS_V1,
  STOCK_SOUND_GENERATED_V1,
  STOCK_SOUND_LICENCE_V1,
  STOCK_SOUND_OUTPUT_V1,
  STOCK_SOUND_PUBLIC_PATH_V1,
  measureSynthSamplesV1,
  renderSynthRecipeV1,
  soundRecipeV1,
  stockSoundCandidateV1,
  stockSoundClipV1,
  stockSoundUrlV1,
  stockSoundV1,
  stockSoundsEnabledV1,
  type SoundIdV1,
} from "../../src/audio/index";

/**
 * The recorded clips and their provenance manifest (beads pulp_wars-2yc.20
 * and pulp_wars-2yc.24, docs/ui/SOUND.md "Stock recordings"): every sound
 * with recordings has a clip for each candidate, exactly one default and
 * still its synthesised fallback; the repository holds only short clips
 * under the game's own names, never a library file; and the document of
 * the choices is what the manifest says.
 */

const ROOT = resolve(import.meta.dirname, "../..");
const FOLDER = join(ROOT, STOCK_SOUND_OUTPUT_V1.folder);
/** The theme music's folder, inside the clips' (bead pulp_wars-2yc.27). */
const THEMES_FOLDER = join(ROOT, THEME_MUSIC_OUTPUT_V1.folder);
/**
 * No audio file in the repository's game folders may be larger, except
 * the theme music, which has a budget of its own below.
 */
const MAX_AUDIO_FILE_BYTES = 200_000;
/**
 * The theme music's own budget (bead pulp_wars-2yc.27): a theme is about
 * 100 seconds of stereo AAC at 112 kbit/s, 1.4 MB. One theme may not be
 * larger than this, nor all of them together (nine are 12.6 MB). It is
 * for the files of the theme manifest in their folder and for nothing
 * else; raise it on purpose, with a tenth theme.
 */
const MAX_THEME_BYTES = 1_700_000;
const MAX_THEMES_TOTAL_BYTES = 14_000_000;
/** A theme is a loop of about 100 seconds (THEME_MUSIC.md). */
const THEME_SECONDS = { min: 90, max: 120 } as const;

/** The theme files, by their path: the only audio allowed to be large. */
const THEME_PATHS = new Set(
  THEME_MUSIC_TRACKS_V1.map((track) => join(THEMES_FOLDER, track.file)),
);
/** What a clip is expected to stay under. */
const MAX_CLIP_BYTES = 60_000;
/**
 * Every clip together, the alternatives included (78 clips are 0.9 MB).
 * Bead pulp_wars-2yc.24 kept the 1.5 MB of bead pulp_wars-2yc.20: raise it
 * on purpose, and not past about 3 MB.
 */
const MAX_TOTAL_BYTES = 1_500_000;
/** The longest clip the game needs (a fanfare). */
const MAX_CLIP_SECONDS = 3.2;
/** A sound keeps at most this many recordings to choose from. */
const MAX_CANDIDATES = 4;
const AUDIO_EXTENSIONS = new Set([
  ".wav",
  ".aif",
  ".aiff",
  ".caf",
  ".flac",
  ".mp3",
  ".m4a",
  ".aac",
  ".ogg",
  ".oga",
  ".opus",
  ".webm",
  ".bwf",
  ".rf64",
  ".w64",
]);

function audioFilesUnder(folder: string): string[] {
  if (!existsSync(folder)) return [];
  return readdirSync(folder, { recursive: true })
    .map((entry) => join(folder, String(entry)))
    .filter((path) => AUDIO_EXTENSIONS.has(extname(path).toLowerCase()));
}

describe("recorded sound clips", () => {
  it("gives every sound with recordings one default and a synth fallback", () => {
    expect(STOCK_SOUNDS_V1.length).toBeGreaterThan(0);
    const ids = STOCK_SOUNDS_V1.map((sound) => sound.id);
    expect(new Set(ids).size, "one entry per sound").toBe(ids.length);
    for (const sound of STOCK_SOUNDS_V1) {
      expect(SOUND_IDS_V1 as readonly string[], sound.id).toContain(sound.id);
      const id = sound.id as SoundIdV1;
      expect(sound.candidates.length, sound.id).toBeGreaterThan(0);
      expect(sound.candidates.length, sound.id).toBeLessThanOrEqual(
        MAX_CANDIDATES,
      );
      const numbers = sound.candidates.map((candidate) => candidate.n);
      expect(new Set(numbers).size, `${sound.id}: numbers`).toBe(
        numbers.length,
      );
      for (const n of numbers) {
        expect(Number.isInteger(n), `${sound.id} #${n}`).toBe(true);
        expect(n, `${sound.id} #${n}`).toBeGreaterThan(0);
      }
      // Exactly one default: one of the candidates, or the generated sound.
      expect([0, ...numbers], `${sound.id}: default`).toContain(sound.default);
      expect(
        sound.candidates.filter((candidate) => candidate.n === sound.default),
        sound.id,
      ).toHaveLength(sound.default === 0 ? 0 : 1);
      expect(["high", "medium", "low"], sound.id).toContain(sound.confidence);
      expect(sound.why.length, sound.id).toBeGreaterThan(10);
      if (sound.listenFirst !== undefined) {
        expect(sound.listenFirst.length, sound.id).toBeGreaterThan(10);
        // "Listen first" is about what already plays in the game.
        expect(sound.default, sound.id).toBeGreaterThan(0);
      }
      // The synthesised sound is still there, and still a sound.
      const recipe = soundRecipeV1(id);
      expect(recipe, sound.id).not.toBeNull();
      if (recipe === null) continue;
      const measured = measureSynthSamplesV1(renderSynthRecipeV1(recipe));
      expect(measured.rms, sound.id).toBeGreaterThan(0.01);
      const source = SOUND_MANIFEST_V1[id].source;
      const clip = stockSoundClipV1(id);
      if (sound.default === 0) {
        // Generated by default: the recordings are only there to compare.
        expect(clip, sound.id).toBeNull();
        expect(source.kind, sound.id).toBe("SYNTH");
        continue;
      }
      expect(clip?.n, sound.id).toBe(sound.default);
      expect(source.kind, sound.id).toBe("FILE");
      if (source.kind !== "FILE" || clip === null) continue;
      expect(source.url, sound.id).toBe(stockSoundUrlV1(clip));
      expect(source.gain, sound.id).toBe(clip.gain);
      expect(source.fallback, sound.id).toBe(recipe);
    }
  });

  it("accounts for every game sound: recordings, or the reason for none", () => {
    const generated = STOCK_SOUND_GENERATED_V1.map((entry) => entry.id);
    expect(new Set(generated).size).toBe(generated.length);
    for (const id of SOUND_IDS_V1) {
      const recorded = stockSoundV1(id) !== null;
      expect(generated.includes(id), id).toBe(!recorded);
      expect(SOUND_MANIFEST_V1[id].source.kind, id).toBe(
        stockSoundClipV1(id) === null ? "SYNTH" : "FILE",
      );
    }
    for (const entry of STOCK_SOUND_GENERATED_V1) {
      expect(SOUND_IDS_V1 as readonly string[], entry.id).toContain(entry.id);
      expect(entry.why.length, entry.id).toBeGreaterThan(10);
      expect(entry.wanted.length, entry.id).toBeGreaterThan(10);
    }
    expect(STOCK_SOUNDS_V1.length + STOCK_SOUND_GENERATED_V1.length).toBe(
      SOUND_IDS_V1.length,
    );
  });

  it("records where each candidate was cut from and how", () => {
    expect(STOCK_SOUND_LICENCE_V1).toMatch(/Sonniss/);
    expect(STOCK_SOUND_BUNDLE_V1).toMatch(/Sonniss/);
    for (const clip of STOCK_SOUND_ALL_CLIPS_V1) {
      const name = `${clip.id} #${clip.n}`;
      expect(stockSoundCandidateV1(clip.id, clip.n), name).toEqual(clip);
      expect(clip.part, name).toBeGreaterThanOrEqual(1);
      expect(clip.part, name).toBeLessThanOrEqual(9);
      expect(clip.library, name).toMatch(/^\S.* - .*\S$/);
      expect(clip.originalFile, name).toMatch(/\.wav$/i);
      expect(clip.startSeconds, name).toBeGreaterThanOrEqual(0);
      expect(clip.endSeconds, name).toBeGreaterThan(clip.startSeconds);
      expect(
        clip.endSeconds - clip.startSeconds,
        `${name} is one short event`,
      ).toBeLessThanOrEqual(MAX_CLIP_SECONDS);
      expect(clip.fadeInMs, name).toBeGreaterThan(0);
      expect(clip.fadeOutMs, name).toBeGreaterThan(0);
      expect(clip.highpassHz, name).toBeGreaterThanOrEqual(0);
      expect(clip.gain, name).toBeGreaterThan(0);
      expect(clip.gain, name).toBeLessThanOrEqual(1);
      expect(clip.take.length, name).toBeGreaterThan(10);
      // Its character in a line, for the person who chooses.
      expect(clip.note.length, name).toBeGreaterThan(10);
      expect(clip.note, name).not.toMatch(/\n/);
    }
    // Two candidates of a sound are never the same stretch of the same file.
    for (const sound of STOCK_SOUNDS_V1) {
      const cuts = sound.candidates.map(
        (candidate) =>
          `${candidate.library}/${candidate.originalFile}@${candidate.startSeconds}`,
      );
      expect(new Set(cuts).size, sound.id).toBe(cuts.length);
    }
  });

  it("names the clips after the game's sounds, never after a library file", () => {
    for (const clip of STOCK_SOUND_ALL_CLIPS_V1) {
      // The sound's id with dashes, and the candidate's number.
      expect(clip.file, `${clip.id} #${clip.n}`).toBe(
        `${clip.id.replaceAll(".", "-")}-${clip.n}.m4a`,
      );
      expect(clip.file.toLowerCase()).not.toBe(clip.originalFile.toLowerCase());
    }
    const files = STOCK_SOUND_ALL_CLIPS_V1.map((clip) => clip.file);
    expect(new Set(files).size, "one file per candidate").toBe(files.length);
    const originals = new Set(
      STOCK_SOUND_ALL_CLIPS_V1.map((clip) => clip.originalFile.toLowerCase()),
    );
    for (const path of audioFilesUnder(join(ROOT, "public")))
      expect(
        originals.has((path.split("/").at(-1) ?? "").toLowerCase()),
        `${path} is a library file`,
      ).toBe(false);
  });

  it("holds a clip for every candidate and nothing else, each small and an MP4 file", () => {
    const expected = STOCK_SOUND_ALL_CLIPS_V1.map((clip) => clip.file).sort();
    // The theme music has a folder of its own in there, and nothing else.
    const entries = readdirSync(FOLDER, { withFileTypes: true });
    expect(
      entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name),
    ).toEqual([THEME_MUSIC_OUTPUT_V1.folder.split("/").at(-1)]);
    expect(
      entries
        .filter((entry) => !entry.isDirectory())
        .map((entry) => entry.name)
        .sort(),
    ).toEqual(expected);
    let total = 0;
    for (const file of expected) {
      const path = join(FOLDER, file);
      const bytes = statSync(path).size;
      total += bytes;
      expect(bytes, `${file} is ${bytes} bytes`).toBeLessThan(MAX_CLIP_BYTES);
      // An MP4 container: the "ftyp" box comes first.
      expect(readFileSync(path).toString("latin1", 4, 8), file).toBe("ftyp");
    }
    expect(total, `all clips are ${total} bytes`).toBeLessThan(MAX_TOTAL_BYTES);
  });

  it("keeps every audio file of the game under the size limit", () => {
    // A library file is tens of megabytes of WAV; a clip is a few kilobytes.
    const files = [
      ...audioFilesUnder(join(ROOT, "public")),
      ...audioFilesUnder(join(ROOT, "src")),
    ];
    // Every one of them is a clip of the provenance manifest, another
    // file the game fetches at its start, or a theme of the theme manifest.
    expect(files.map((path) => path.split("/").at(-1)).sort()).toEqual(
      [
        ...new Set([
          ...STOCK_SOUND_ALL_CLIPS_V1.map((clip) => clip.file),
          ...soundAssetUrlsV7().map((url) => url.split("/").at(-1) ?? url),
          ...THEME_MUSIC_TRACKS_V1.map((track) => track.file),
        ]),
      ].sort(),
    );
    for (const path of files) {
      const bytes = statSync(path).size;
      expect(
        [".wav", ".aif", ".aiff", ".bwf", ".rf64", ".w64", ".flac"],
        `${path} is an uncompressed recording`,
      ).not.toContain(extname(path).toLowerCase());
      // A theme has its own budget; the limit on everything else stands.
      if (THEME_PATHS.has(path)) continue;
      expect(
        bytes,
        `${path} is ${bytes} bytes: only short clips belong in the repository`,
      ).toBeLessThanOrEqual(MAX_AUDIO_FILE_BYTES);
      expect(
        [".wav", ".aif", ".aiff", ".bwf", ".rf64", ".w64", ".flac"],
        `${path} is an uncompressed recording`,
      ).not.toContain(extname(path).toLowerCase());
    }
  });

  it("finds no large or uncompressed audio file anywhere in the repository", () => {
    const skipped = new Set(["node_modules", "dist", ".git", ".claude"]);
    const offenders = readdirSync(ROOT)
      .filter((entry) => !skipped.has(entry))
      .map((entry) => join(ROOT, entry))
      .filter((path) => statSync(path).isDirectory())
      .flatMap(audioFilesUnder)
      .filter(
        (path) =>
          statSync(path).size >
            (THEME_PATHS.has(path) ? MAX_THEME_BYTES : MAX_AUDIO_FILE_BYTES) ||
          /\.(wav|aiff?|bwf|rf64|w64|flac|caf)$/i.test(path),
      );
    expect(offenders).toEqual([]);
  });

  it("lists only the default clips for the game's start, and none with the switch off", () => {
    const urls = soundAssetUrlsV7();
    expect(urls).toEqual(
      STOCK_SOUND_CLIPS_V1.map((clip) => stockSoundUrlV1(clip)),
    );
    expect(urls.length).toBe(
      STOCK_SOUNDS_V1.filter((sound) => sound.default !== 0).length,
    );
    // One clip a sound: no alternative is fetched at the start.
    for (const clip of STOCK_SOUND_ALL_CLIPS_V1) {
      const isDefault = stockSoundV1(clip.id)?.default === clip.n;
      expect(urls.includes(stockSoundUrlV1(clip)), clip.file).toBe(isDefault);
      expect(
        stockSoundUrlV1(clip).endsWith(STOCK_SOUND_PUBLIC_PATH_V1 + clip.file),
      ).toBe(true);
    }
    expect(soundAssetUrlsV7(false)).toEqual([]);
  });

  it("lists the picked clip of a sound instead of its default", () => {
    const hit = "impact.hit";
    const death = "unit.death";
    const picked = soundAssetUrlsV7(true, { [hit]: 2, [death]: 1 });
    const url = (id: string, n: number): string => {
      const clip = stockSoundCandidateV1(id, n);
      if (clip === null) throw new Error(`${id} #${n}`);
      return stockSoundUrlV1(clip);
    };
    expect(picked).toContain(url(hit, 2));
    expect(picked).not.toContain(url(hit, 1));
    expect(picked).toContain(url(death, 1));
    expect(picked.length).toBe(soundAssetUrlsV7().length + 1);
    // The generated sound picked: no clip for that sound.
    expect(soundAssetUrlsV7(true, { [hit]: 0 })).not.toContain(url(hit, 1));
    expect(soundAssetUrlsV7(true, { [hit]: 0 }).length).toBe(
      soundAssetUrlsV7().length - 1,
    );
    // A pick the sound does not have is no pick.
    expect(soundAssetUrlsV7(true, { [hit]: 99 })).toEqual(soundAssetUrlsV7());
    expect(soundAssetUrlsV7(false, { [hit]: 2 })).toEqual([]);
  });
});

describe("theme music files", () => {
  it("has a theme for every faction of the game, and the title theme", () => {
    for (const faction of FACTION_IDS_V7) {
      const theme = soundThemeOfFactionV1(faction);
      expect(theme, faction).not.toBeNull();
      expect(
        SOUND_THEMES_V1.filter((entry) => entry.faction === faction),
        `${faction}: one theme`,
      ).toHaveLength(1);
    }
    const title = SOUND_THEMES_V1.find(
      (theme) => theme.id === SOUND_TITLE_THEME_ID_V1,
    );
    expect(title?.faction).toBeNull();
    expect(title?.label).toBe("Title");
    expect(SOUND_THEMES_V1).toHaveLength(FACTION_IDS_V7.length + 1);
    expect(new Set(SOUND_THEMES_V1.map((theme) => theme.id)).size).toBe(
      SOUND_THEMES_V1.length,
    );
  });

  it("registers each encoded theme as looping music at its measured level", () => {
    expect(THEME_MUSIC_TRACKS_V1.map((track) => track.id)).toEqual(
      SOUND_THEMES_V1.map((theme) => theme.id),
    );
    for (const track of THEME_MUSIC_TRACKS_V1) {
      const theme = SOUND_THEMES_V1.find((entry) => entry.id === track.id);
      expect(theme?.loop, track.id).toBe(true);
      expect(theme?.loopOverlapSeconds, track.id).toBe(
        track.loopOverlapSeconds,
      );
      expect(theme?.source, track.id).toEqual({
        kind: "FILE",
        url: themeMusicUrlV1(track),
        gain: track.gain,
      });
      expect(
        themeMusicUrlV1(track).endsWith(
          THEME_MUSIC_PUBLIC_PATH_V1 + track.file,
        ),
      ).toBe(true);
      expect(
        playableSoundV1(track.id as `theme.${string}`),
        track.id,
      ).toMatchObject({ category: "music", jitterCents: 0, loop: true });
    }
  });

  it("holds one small AAC file per theme in its folder, and nothing else", () => {
    expect(THEME_MUSIC_OUTPUT_V1).toEqual({
      folder: THEME_MUSIC_FOLDER_V1,
      codec: "AAC-LC",
      channels: 2,
      sampleRate: THEME_MUSIC_SAMPLE_RATE_V1,
      bitRate: THEME_MUSIC_BIT_RATE_V1,
      targetLufs: THEME_MUSIC_TARGET_LUFS_V1,
    });
    expect(readdirSync(THEMES_FOLDER).sort()).toEqual(
      THEME_MUSIC_TRACKS_V1.map((track) => track.file).sort(),
    );
    let total = 0;
    for (const track of THEME_MUSIC_TRACKS_V1) {
      // The game's own name: the theme's id with dashes.
      expect(track.file, track.id).toBe(themeMusicFileV1(track.id));
      const path = join(THEMES_FOLDER, track.file);
      const bytes = statSync(path).size;
      total += bytes;
      expect(bytes, `${track.file}: the manifest's size`).toBe(track.bytes);
      expect(bytes, `${track.file} is ${bytes} bytes`).toBeLessThanOrEqual(
        MAX_THEME_BYTES,
      );
      // An MP4 container, never an uncompressed recording.
      expect(readFileSync(path).toString("latin1", 4, 8), track.file).toBe(
        "ftyp",
      );
      expect(extname(track.file)).toBe(".m4a");
    }
    expect(total, `all themes are ${total} bytes`).toBeLessThanOrEqual(
      MAX_THEMES_TOTAL_BYTES,
    );
  });

  it("records where each theme came from and what was done to it", () => {
    expect(THEME_MASTERS_V1.map((master) => master.id)).toEqual(
      THEME_MUSIC_TRACKS_V1.map((track) => track.id),
    );
    for (const track of THEME_MUSIC_TRACKS_V1) {
      const master = THEME_MASTERS_V1.find((entry) => entry.id === track.id);
      expect(track.master, track.id).toBe(master?.master);
      expect(track.faction, track.id).toBe(master?.faction);
      expect(track.prompt, track.id).toBe(master?.prompt);
      // The master's name is its author's; the game's file has its own.
      expect(track.master, track.id).toMatch(/\.wav$/);
      expect(track.file.toLowerCase()).not.toBe(track.master.toLowerCase());
      expect(track.seconds, track.id).toBeGreaterThanOrEqual(THEME_SECONDS.min);
      expect(track.seconds, track.id).toBeLessThanOrEqual(THEME_SECONDS.max);
      expect(
        track.headTrimSeconds + track.seconds + track.tailTrimSeconds,
        track.id,
      ).toBeCloseTo(track.masterSeconds, 2);
      // The level brings every theme to the same loudness without clipping.
      expect(track.lufs + 20 * Math.log10(track.gain), track.id).toBeCloseTo(
        THEME_MUSIC_OUTPUT_V1.targetLufs,
        1,
      );
      expect(track.gain, track.id).toBeGreaterThan(0.5);
      expect(track.gain, track.id).toBeLessThan(1.5);
      expect(track.peakDb + 20 * Math.log10(track.gain), track.id).toBeLessThan(
        -1,
      );
      // The next pass of the loop starts under the dying last note.
      expect(track.loopOverlapSeconds, track.id).toBeGreaterThan(0);
      expect(track.loopOverlapSeconds, track.id).toBeLessThanOrEqual(4);
    }
  });

  it("has a record in the document for every theme (npx tsx scripts/audio/theme-records.ts render)", async () => {
    const doc = readFileSync(THEME_RECORDS_DOC_PATH, "utf8");
    expect(themeRecordsSectionV1(doc)).toBe(await renderThemeRecordsV1(doc));
    for (const track of THEME_MUSIC_TRACKS_V1) {
      expect(doc, track.id).toContain(
        `### ${track.id}, ${THEME_RECORDS_DATE_V1}`,
      );
      const fields = new Map(themeRecordFieldsV1(track));
      expect(fields.get("Service")).toBe("Suno");
      expect(fields.get("Take chosen"), track.id).toContain(track.master);
      // What only the author knows is left for the author.
      for (const field of THEME_RECORDS_AUTHOR_FIELDS_V1)
        expect(fields.get(field), `${track.id}: ${field}`).toMatch(
          new RegExp(`^${THEME_RECORDS_AUTHOR_V1}`),
        );
    }
    // What the author wrote into such a cell survives a new rendering.
    const filled = doc.replace(
      `| Model or version      | ${THEME_RECORDS_AUTHOR_V1}`,
      "| Model or version      | v9 (as shown)             ",
    );
    expect(filled).not.toBe(doc);
    expect(await renderThemeRecordsV1(filled)).toContain("v9 (as shown)");
    // The plan's terms decide commercial use: the document says so.
    expect(doc).toMatch(
      /plan's terms[^.]*decide whether it may be used\s+commercially/,
    );
  });

  it("is not fetched at the game's start", () => {
    for (const url of soundAssetUrlsV7())
      expect(url.includes(THEME_MUSIC_PUBLIC_PATH_V1), url).toBe(false);
    for (const track of THEME_MUSIC_TRACKS_V1)
      expect(soundAssetUrlsV7()).not.toContain(themeMusicUrlV1(track));
  });

  it("keeps the masters out: no WAV is checked in, and Git refuses one", () => {
    const ignored = readFileSync(join(ROOT, ".gitignore"), "utf8");
    for (const pattern of ["*.wav", "*.aif", "*.aiff", "*.flac", "*.caf"])
      expect(ignored.split("\n"), pattern).toContain(pattern);
    for (const master of THEME_MASTERS_V1)
      expect(
        audioFilesUnder(join(ROOT, "public")).map((path) =>
          (path.split("/").at(-1) ?? "").toLowerCase(),
        ),
      ).not.toContain(master.master.toLowerCase());
  });
});

describe("the theme encoder's measurements", () => {
  const rate = 48_000;
  const tone = (seconds: number, level: number): Float32Array =>
    Float32Array.from(
      { length: Math.round(seconds * rate) },
      (_, index) => level * Math.sin((2 * Math.PI * 997 * index) / rate),
    );

  it("measures loudness as BS.1770 does", () => {
    // A full-scale 997 Hz sine in one channel is -3.01 LUFS; in two, 0.
    expect(integratedLufsV1([tone(3, 1)], rate)).toBeCloseTo(-3.01, 1);
    expect(integratedLufsV1([tone(3, 1), tone(3, 1)], rate)).toBeCloseTo(0, 1);
    expect(integratedLufsV1([tone(3, 0.1)], rate)).toBeCloseTo(-23.01, 1);
    // Silence is gated out, not averaged in.
    const half = new Float32Array(rate * 6);
    half.set(tone(3, 0.1));
    expect(integratedLufsV1([half], rate)).toBeCloseTo(-23.01, 0);
    expect(integratedLufsV1([new Float32Array(rate)], rate)).toBe(-Infinity);
  });

  it("trims a stray click and the silence at both ends", () => {
    const sound = new Float32Array(rate * 3);
    // A click, a pause, a second of tone, then silence.
    sound[10] = 0.01;
    sound.set(tone(1, 0.2), rate);
    const { start, end } = trimPointsV1([sound], rate);
    expect(start / rate).toBeCloseTo(0.995, 2);
    expect(end / rate).toBeCloseTo(2, 2);
  });

  it("finds how long the last note takes to die away", () => {
    // Ten seconds at one level, then two seconds 20 dB down.
    const sound = new Float32Array(rate * 12);
    sound.set(tone(10, 0.3));
    sound.set(tone(2, 0.03), rate * 10);
    expect(tailSecondsV1([sound], rate)).toBeCloseTo(2, 1);
    // A track that ends at its usual level has next to no tail.
    expect(tailSecondsV1([tone(10, 0.3)], rate)).toBeLessThan(0.1);
  });
});

describe("the document of the choices", () => {
  it("is what the manifest says (npm run audio:stock-sound-choices -- render)", async () => {
    expect(readFileSync(STOCK_SOUND_CHOICES_DOC_PATH, "utf8")).toBe(
      await renderStockSoundChoicesV1(),
    );
  });

  it("gives every game sound a status", () => {
    const rows = stockSoundStatusRowsV1();
    expect(rows.map((row) => row.id)).toEqual([...SOUND_IDS_V1]);
    const text = stockSoundChoicesMarkdownV1();
    for (const row of rows) {
      const sound = stockSoundV1(row.id);
      expect(row.status, row.id).toBe(
        sound === null
          ? "GENERATED"
          : sound.default === 0
            ? "GENERATED_OPTIONS"
            : sound.candidates.length === 1
              ? "RECORDED_SINGLE"
              : "RECORDED_OPTIONS",
      );
      // Its row in the table of every sound.
      expect(text, row.id).toContain(
        `| \`${row.id}\` | ${row.label} | ${stockSoundStatusTextV1(row)} |`,
      );
    }
    expect(
      stockSoundStatusTextV1({
        id: "x",
        label: "X",
        status: "RECORDED_OPTIONS",
        candidates: 3,
        default: 1,
      }),
    ).toBe("Recorded — 3 options awaiting your pick");
  });

  it("names every candidate's origin and note, and what to listen to first", () => {
    const text = stockSoundChoicesMarkdownV1();
    for (const clip of STOCK_SOUND_ALL_CLIPS_V1) {
      expect(text, `${clip.id} #${clip.n}`).toContain(
        `${clip.library} / \`${clip.originalFile}\``,
      );
      expect(text, `${clip.id} #${clip.n}`).toContain(
        clip.note.replaceAll("|", "\\|"),
      );
    }
    const first = text.slice(
      text.indexOf("## Listen to these first"),
      text.indexOf("## Every sound"),
    );
    for (const sound of STOCK_SOUNDS_V1)
      expect(first.includes(`| \`${sound.id}\` |`), sound.id).toBe(
        sound.listenFirst !== undefined,
      );
    for (const entry of STOCK_SOUND_GENERATED_V1)
      expect(text, entry.id).toContain(entry.wanted);
  });
});

describe("the ?stock-sounds switch", () => {
  it("is on by default and reads 0, off and false as off", () => {
    expect(STOCK_SOUNDS_ENABLED_V1).toBe(true);
    expect(stockSoundsEnabledV1("")).toBe(true);
    expect(stockSoundsEnabledV1("?art=legacy")).toBe(true);
    for (const off of ["0", "off", "false", "OFF", " False "])
      expect(
        stockSoundsEnabledV1(`?stock-sounds=${encodeURIComponent(off)}`),
        off,
      ).toBe(false);
    for (const on of ["1", "on", "true", "maybe", ""])
      expect(stockSoundsEnabledV1(`?stock-sounds=${on}`), on).toBe(true);
    expect(stockSoundsEnabledV1("?starfield=0&stock-sounds=0")).toBe(false);
  });
});
