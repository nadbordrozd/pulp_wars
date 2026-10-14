import { existsSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  ELEVENLABS_SFX_DOC_PATH,
  readPromptsV1,
  readRecordsV1,
} from "../../scripts/audio/elevenlabs-sfx-data";
import { renderElevenLabsSfxDocV1 } from "../../scripts/audio/elevenlabs-sfx-doc";
import { soundAssetUrlsV7 } from "../../src/assets/asset-inventory-v7";
import {
  ELEVENLABS_FIRST_TAKE_V1,
  ELEVENLABS_SOUNDS_V1,
  ELEVENLABS_SOUND_MODEL_V1,
  ELEVENLABS_SOUND_PROVENANCE_V1,
  SOUND_GENERATED_CHOICE_V1,
  SOUND_IDS_V1,
  SOUND_MANIFEST_V1,
  STOCK_SOUNDS_V1,
  STOCK_SOUND_OUTPUT_V1,
  elevenLabsSoundV1,
  isStockSoundChoiceV1,
  parseStockSoundPicksV1,
  soundCandidateUrlV1,
  soundCandidateV1,
  soundChoiceSetV1,
  soundRecipeV1,
  stockSoundChoiceV1,
  stockSoundV1,
} from "../../src/audio/index";

/**
 * The ElevenLabs sound effects (bead pulp_wars-2yc.51,
 * docs/audio/ELEVENLABS_SFX.md): every sound effect of the game has
 * ElevenLabs takes and plays one by default, except the sounds none of
 * whose takes passed their measurements, which keep their old default;
 * every take has a record of how it was made; and the stock recordings
 * and the synth stay selectable beside them.
 */

const ROOT = resolve(import.meta.dirname, "../..");
const FOLDER = join(ROOT, STOCK_SOUND_OUTPUT_V1.folder);
/** The sounds no take passed for: they keep their old default. */
const NO_PASSING_TAKE = ["unit.train"];
/** At most this many passing takes a sound. */
const MAX_KEPT = 3;
/** The longest a take may be (the victory fanfare's range). */
const MAX_TAKE_SECONDS = 2.8;
const MAX_CLIP_BYTES = 60_000;

describe("ElevenLabs sound effects", () => {
  it("gives every sound effect an ElevenLabs default, but the listed few", () => {
    expect(ELEVENLABS_SOUNDS_V1.map((sound) => sound.id)).toEqual([
      ...SOUND_IDS_V1,
    ]);
    for (const id of SOUND_IDS_V1) {
      const sound = elevenLabsSoundV1(id);
      if (sound === null) throw new Error(`${id} has no takes`);
      expect(sound.takes.length, id).toBeGreaterThan(0);
      const set = soundChoiceSetV1(id);
      const source = SOUND_MANIFEST_V1[id].source;
      if (NO_PASSING_TAKE.includes(id)) {
        // No take passed: the old default stays, the takes are there to hear.
        expect(sound.default, id).toBeNull();
        expect(
          sound.takes.every((take) => !take.passed),
          id,
        ).toBe(true);
        expect(set?.default, id).toBe(
          stockSoundV1(id)?.default ?? SOUND_GENERATED_CHOICE_V1,
        );
        continue;
      }
      expect(sound.default, id).toBe(sound.takes[0]?.n);
      expect(set?.default, id).toBe(sound.default);
      const take = sound.takes[0];
      expect(take?.passed, id).toBe(true);
      // The game plays the take, with the synth as its fallback.
      expect(source.kind, id).toBe("FILE");
      if (source.kind !== "FILE" || take === undefined) continue;
      expect(source.url, id).toBe(soundCandidateUrlV1(take));
      expect(source.gain, id).toBe(take.gain);
      expect(source.fallback, id).toBe(soundRecipeV1(id));
    }
    expect(
      ELEVENLABS_SOUNDS_V1.filter((sound) => sound.default === null).map(
        (sound) => sound.id,
      ),
    ).toEqual(NO_PASSING_TAKE);
  });

  it("numbers, names and sizes every take, and records its provenance", () => {
    expect(ELEVENLABS_SOUND_PROVENANCE_V1).toMatch(
      /^ElevenLabs sound effects, generated \d{4}-\d{2}-\d{2}/,
    );
    expect(ELEVENLABS_SOUND_MODEL_V1).toBe(readPromptsV1().model);
    const records = readRecordsV1().takes;
    for (const sound of ELEVENLABS_SOUNDS_V1) {
      const numbers = sound.takes.map((take) => take.n);
      expect(new Set(numbers).size, sound.id).toBe(numbers.length);
      expect(
        sound.takes.filter((take) => take.passed).length,
        sound.id,
      ).toBeLessThanOrEqual(MAX_KEPT);
      for (const take of sound.takes) {
        const name = `${sound.id} #${take.n}`;
        // Never a stock candidate's number.
        expect(take.n, name).toBeGreaterThanOrEqual(ELEVENLABS_FIRST_TAKE_V1);
        expect(
          stockSoundV1(sound.id)?.candidates.map((c) => c.n) ?? [],
          name,
        ).not.toContain(take.n);
        expect(take.file, name).toBe(
          `${sound.id.replaceAll(".", "-")}-${take.n}.m4a`,
        );
        expect(take.generated, name).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(ELEVENLABS_SOUND_PROVENANCE_V1, name).toContain(take.generated);
        expect(take.gain, name).toBeGreaterThan(0);
        expect(take.gain, name).toBeLessThanOrEqual(1);
        expect(take.seconds, name).toBeGreaterThan(0);
        expect(take.seconds, name).toBeLessThanOrEqual(MAX_TAKE_SECONDS);
        expect(take.prompt.length, name).toBeGreaterThan(10);
        expect(take.note.length, name).toBeGreaterThan(10);
        // The clip is there, small, and an MP4 file.
        const path = join(FOLDER, take.file);
        expect(existsSync(path), name).toBe(true);
        expect(statSync(path).size, name).toBeLessThan(MAX_CLIP_BYTES);
        expect(readFileSync(path).toString("latin1", 4, 8), name).toBe("ftyp");
        // Its generation is on record, with the prompt it was made from.
        const record = records.find(
          (entry) => entry.id === sound.id && entry.n === take.n,
        );
        expect(record, name).toBeDefined();
        expect(record?.prompt.startsWith(take.prompt), name).toBe(true);
        expect(record?.model, name).toBe(ELEVENLABS_SOUND_MODEL_V1);
        expect(record?.date, name).toBe(take.generated);
      }
    }
  });

  it("records every take ever generated, with what was asked", () => {
    const records = readRecordsV1();
    const prompts = readPromptsV1();
    expect(records.takes.length).toBeGreaterThanOrEqual(
      SOUND_IDS_V1.length * prompts.takes,
    );
    for (const take of records.takes) {
      const name = `${take.id} #${take.n}`;
      expect(SOUND_IDS_V1 as readonly string[], name).toContain(take.id);
      expect(take.durationSeconds, name).toBeGreaterThanOrEqual(0.5);
      expect(take.durationSeconds, name).toBeLessThanOrEqual(30);
      expect(take.promptInfluence, name).toBeGreaterThanOrEqual(0);
      expect(take.promptInfluence, name).toBeLessThanOrEqual(1);
      expect(take.model, name).toBe(prompts.model);
      // The raw take lives outside the repository.
      expect(take.rawFile, name).toMatch(/^[a-z-]+-\d+\.wav$/);
      expect(existsSync(join(ROOT, take.rawFile)), name).toBe(false);
    }
    // No key, no header beyond the cost.
    const text = JSON.stringify(records);
    expect(text).not.toMatch(/xi-api-key|api[_-]?key|sk_[a-z0-9]{8}/i);
  });

  it("fetches only each sound's default at the start, ElevenLabs or old", () => {
    const urls = soundAssetUrlsV7();
    for (const sound of ELEVENLABS_SOUNDS_V1)
      for (const take of sound.takes)
        expect(urls.includes(soundCandidateUrlV1(take)), take.file).toBe(
          take.n === sound.default,
        );
  });

  it("keeps every old recording and the synth selectable", () => {
    for (const stock of STOCK_SOUNDS_V1)
      for (const candidate of stock.candidates) {
        const name = `${stock.id} #${candidate.n}`;
        expect(isStockSoundChoiceV1(stock.id, candidate.n), name).toBe(true);
        expect(soundCandidateV1(stock.id, candidate.n)?.file, name).toBe(
          candidate.file,
        );
        expect(soundCandidateV1(stock.id, candidate.n)?.origin, name).toBe(
          "STOCK",
        );
        // A pick stored before the takes existed still names the recording.
        const picks = parseStockSoundPicksV1(
          JSON.stringify({ [stock.id]: candidate.n }),
        );
        expect(stockSoundChoiceV1(stock.id, picks), name).toBe(candidate.n);
      }
    for (const id of SOUND_IDS_V1) {
      expect(isStockSoundChoiceV1(id, SOUND_GENERATED_CHOICE_V1), id).toBe(
        true,
      );
      for (const take of elevenLabsSoundV1(id)?.takes ?? [])
        expect(isStockSoundChoiceV1(id, take.n), `${id} #${take.n}`).toBe(true);
    }
  });

  it("orders a sound's choices: new takes (the default first), old, synth", () => {
    for (const id of SOUND_IDS_V1) {
      const set = soundChoiceSetV1(id);
      if (set === null) throw new Error(id);
      const origins = set.candidates.map((candidate) => candidate.origin);
      const firstStock = origins.indexOf("STOCK");
      if (firstStock >= 0)
        expect(
          origins.slice(firstStock).every((o) => o === "STOCK"),
          id,
        ).toBe(true);
      const sound = elevenLabsSoundV1(id);
      if (sound?.default !== null && sound !== null)
        expect(set.candidates[0]?.n, id).toBe(sound.default);
    }
  });

  it("documents every sound and every take as the data says", async () => {
    const doc = readFileSync(ELEVENLABS_SFX_DOC_PATH, "utf8");
    expect(doc).toBe(await renderElevenLabsSfxDocV1());
    for (const sound of ELEVENLABS_SOUNDS_V1) {
      expect(doc, sound.id).toContain(`\`${sound.id}\``);
      for (const take of sound.takes) expect(doc).toContain(`#${take.n}`);
    }
    for (const id of NO_PASSING_TAKE) expect(doc).toContain(`\`${id}\``);
  });
});
