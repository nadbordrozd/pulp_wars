import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { soundAssetUrlsV7 } from "../../src/assets/asset-inventory-v7";
import {
  SOUND_IDS_V1,
  SOUND_MANIFEST_V1,
  STOCK_SOUNDS_ENABLED_V1,
  STOCK_SOUND_CLIPS_V1,
  STOCK_SOUND_LICENCE_V1,
  STOCK_SOUND_OUTPUT_V1,
  STOCK_SOUND_PUBLIC_PATH_V1,
  measureSynthSamplesV1,
  renderSynthRecipeV1,
  soundRecipeV1,
  stockSoundClipV1,
  stockSoundUrlV1,
  stockSoundsEnabledV1,
  type SoundIdV1,
} from "../../src/audio/index";

/**
 * The recorded clips and their provenance manifest (bead pulp_wars-2yc.20,
 * docs/ui/SOUND.md "Stock recordings"): every recorded sound has a clip, a
 * provenance row and still its synthesised fallback; the repository holds
 * only short clips under the game's own names, never a library file.
 */

const ROOT = resolve(import.meta.dirname, "../..");
const FOLDER = join(ROOT, STOCK_SOUND_OUTPUT_V1.folder);
/** No audio file in the repository's game folders may be larger. */
const MAX_AUDIO_FILE_BYTES = 200_000;
/** What a clip is expected to stay under. */
const MAX_CLIP_BYTES = 60_000;
const MAX_TOTAL_BYTES = 1_500_000;
/** The longest clip the game needs (a fanfare). */
const MAX_CLIP_SECONDS = 3.2;
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
  it("gives every provenance row a game sound, a clip and a synth fallback", () => {
    expect(STOCK_SOUND_CLIPS_V1.length).toBeGreaterThan(0);
    const ids = STOCK_SOUND_CLIPS_V1.map((clip) => clip.id);
    expect(new Set(ids).size, "one clip per sound").toBe(ids.length);
    for (const clip of STOCK_SOUND_CLIPS_V1) {
      expect(SOUND_IDS_V1 as readonly string[], clip.id).toContain(clip.id);
      const id = clip.id as SoundIdV1;
      const source = SOUND_MANIFEST_V1[id].source;
      expect(source.kind, clip.id).toBe("FILE");
      if (source.kind !== "FILE") continue;
      expect(source.url, clip.id).toBe(stockSoundUrlV1(clip));
      expect(source.url.endsWith(STOCK_SOUND_PUBLIC_PATH_V1 + clip.file)).toBe(
        true,
      );
      expect(source.gain, clip.id).toBe(clip.gain);
      expect(clip.gain, clip.id).toBeGreaterThan(0);
      expect(clip.gain, clip.id).toBeLessThanOrEqual(1);
      // The synthesised sound is still there, and still a sound.
      const recipe = soundRecipeV1(id);
      expect(recipe, clip.id).not.toBeNull();
      expect(source.fallback, clip.id).toBe(recipe);
      if (recipe === null) continue;
      const measured = measureSynthSamplesV1(renderSynthRecipeV1(recipe));
      expect(measured.rms, clip.id).toBeGreaterThan(0.01);
      expect(existsSync(join(FOLDER, clip.file)), clip.file).toBe(true);
    }
  });

  it("leaves every other sound synthesised", () => {
    for (const id of SOUND_IDS_V1) {
      const recorded = stockSoundClipV1(id) !== null;
      expect(SOUND_MANIFEST_V1[id].source.kind, id).toBe(
        recorded ? "FILE" : "SYNTH",
      );
    }
  });

  it("records where each clip was cut from and how", () => {
    expect(STOCK_SOUND_LICENCE_V1).toMatch(/Sonniss/);
    for (const clip of STOCK_SOUND_CLIPS_V1) {
      expect(clip.library, clip.id).toMatch(/^\S.* - .*\S$/);
      expect(clip.originalFile, clip.id).toMatch(/\.wav$/i);
      expect(clip.startSeconds, clip.id).toBeGreaterThanOrEqual(0);
      expect(clip.endSeconds, clip.id).toBeGreaterThan(clip.startSeconds);
      expect(
        clip.endSeconds - clip.startSeconds,
        `${clip.id} is one short event`,
      ).toBeLessThanOrEqual(MAX_CLIP_SECONDS);
      expect(clip.fadeInMs, clip.id).toBeGreaterThan(0);
      expect(clip.fadeOutMs, clip.id).toBeGreaterThan(0);
      expect(clip.highpassHz, clip.id).toBeGreaterThanOrEqual(0);
      expect(clip.take.length, clip.id).toBeGreaterThan(10);
      expect(clip.why.length, clip.id).toBeGreaterThan(10);
    }
  });

  it("names the clips after the game's sounds, never after a library file", () => {
    for (const clip of STOCK_SOUND_CLIPS_V1) {
      expect(clip.file, clip.id).toBe(`${clip.id.replaceAll(".", "-")}.m4a`);
      expect(clip.file.toLowerCase()).not.toBe(clip.originalFile.toLowerCase());
    }
    const originals = new Set(
      STOCK_SOUND_CLIPS_V1.map((clip) => clip.originalFile.toLowerCase()),
    );
    for (const path of audioFilesUnder(join(ROOT, "public")))
      expect(
        originals.has((path.split("/").at(-1) ?? "").toLowerCase()),
        `${path} is a library file`,
      ).toBe(false);
  });

  it("holds only the clips of the manifest, each small and an MP4 file", () => {
    const expected = STOCK_SOUND_CLIPS_V1.map((clip) => clip.file).sort();
    expect(readdirSync(FOLDER).sort()).toEqual(expected);
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
    // Every one of them is a file the audio manifest plays.
    expect(files.map((path) => path.split("/").at(-1)).sort()).toEqual(
      soundAssetUrlsV7()
        .map((url) => url.split("/").at(-1))
        .sort(),
    );
    for (const path of files) {
      const bytes = statSync(path).size;
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
          statSync(path).size > MAX_AUDIO_FILE_BYTES ||
          /\.(wav|aiff?|bwf|rf64|w64|flac|caf)$/i.test(path),
      );
    expect(offenders).toEqual([]);
  });

  it("lists the clips for the game's start, and none with the switch off", () => {
    expect(soundAssetUrlsV7()).toEqual(
      STOCK_SOUND_CLIPS_V1.map((clip) => stockSoundUrlV1(clip)),
    );
    expect(soundAssetUrlsV7(false)).toEqual([]);
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
