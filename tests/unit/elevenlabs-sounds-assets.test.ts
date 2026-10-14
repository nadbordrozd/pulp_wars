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
  SOUND_USER_PICKS_V1,
  STOCK_SOUNDS_V1,
  STOCK_SOUND_OUTPUT_V1,
  elevenLabsSoundV1,
  isStockSoundChoiceV1,
  parseStockSoundPicksV1,
  soundCandidateUrlV1,
  soundCandidateV1,
  soundChoiceSetV1,
  soundRecipeV1,
  soundUserPickV1,
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
/**
 * The sounds added after the takes were made: only the user's own
 * recording (the firework rocket's impact, 2026-10-14).
 */
const NO_TAKES = ["impact.rocket"];
/**
 * The versions the user chose by ear, which play first: the firework
 * rocket's recording, and the listening of 2026-10-14 (bead
 * pulp_wars-2yc.52; "New 2" of the Gallery is the second take of its
 * row, "Old 1" the first stock recording). City lost's #2 is its Old 1
 * made shorter, at the user's request.
 */
const USER_PICKED: Readonly<Record<string, number>> = {
  "attack.rocket": 2,
  "impact.rocket": 1,
  "support.rally": 1, // Old 1
  "support.dark": 1, // Old 1
  "special.mind": 109, // New 2
  "special.hatch": 102, // New 3
  "special.sparkle": 104, // New 2
  "special.dizzy": 105, // New 2
  "cult.herald": 2, // Old 2
  "cult.sacrifice": 1, // Old 1
  "city.lost": 2, // Old 1, shorter
  "reward.chosen": 104, // New 2
  "economy.build": 1, // Old 1
  "economy.harvest": 105, // New 2
  "turn.end": 1, // Old 1
  "ui.select": 1, // UIClick_Operating System UI Cursor
  "ui.click": 1, // UIClick_UI Click 33_CB Sounddesign
};
/** At most this many passing takes a sound. */
const MAX_KEPT = 3;
/** The longest a take may be (the victory fanfare's range). */
const MAX_TAKE_SECONDS = 2.8;
const MAX_CLIP_BYTES = 60_000;

describe("ElevenLabs sound effects", () => {
  it("gives every sound effect an ElevenLabs default, but the listed few", () => {
    expect(ELEVENLABS_SOUNDS_V1.map((sound) => sound.id)).toEqual(
      SOUND_IDS_V1.filter((id) => !NO_TAKES.includes(id)),
    );
    expect(
      Object.fromEntries(SOUND_USER_PICKS_V1.map((pick) => [pick.id, pick.n])),
    ).toEqual(USER_PICKED);
    // In the sound manifest's order, one each.
    expect(SOUND_USER_PICKS_V1.map((pick) => pick.id)).toEqual(
      SOUND_IDS_V1.filter((id) => USER_PICKED[id] !== undefined),
    );
    for (const id of SOUND_IDS_V1) {
      const set = soundChoiceSetV1(id);
      const source = SOUND_MANIFEST_V1[id].source;
      const pick = soundUserPickV1(id)?.n;
      if (pick !== undefined) {
        // The user's pick plays, the takes stay to choose.
        expect(set?.default, id).toBe(pick);
        expect(set?.candidates[0], id).toMatchObject({
          n: pick,
          origin: pick >= ELEVENLABS_FIRST_TAKE_V1 ? "ELEVENLABS" : "STOCK",
          userPick: true,
        });
        expect(
          set?.candidates.filter((candidate) => candidate.userPick).length,
          id,
        ).toBe(1);
        const clip = soundCandidateV1(id, pick);
        expect(source.kind, id).toBe("FILE");
        if (source.kind !== "FILE" || clip === null) continue;
        expect(source.url, id).toBe(soundCandidateUrlV1(clip));
        expect(source.gain, id).toBe(clip.gain);
        for (const take of elevenLabsSoundV1(id)?.takes ?? [])
          expect(isStockSoundChoiceV1(id, take.n), `${id} #${take.n}`).toBe(
            true,
          );
        continue;
      }
      const sound = elevenLabsSoundV1(id);
      if (sound === null) throw new Error(`${id} has no takes`);
      expect(sound.takes.length, id).toBeGreaterThan(0);
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
        // A take the user supplied names its file instead of a model.
        if (record?.supplied === undefined)
          expect(record?.model, name).toBe(ELEVENLABS_SOUND_MODEL_V1);
        else expect(take.prompt, name).toContain(record.supplied.file);
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
      if (take.supplied !== undefined) {
        // The user's own file (bead pulp_wars-2yc.52): imported, round 0,
        // and what was asked of the service is not known.
        expect(take.round, name).toBe(0);
        expect(take.promptInfluence, name).toBeNull();
        expect(
          prompts.sounds
            .find((sound) => sound.id === take.id)
            ?.supplied?.map((entry) => entry.file),
          name,
        ).toContain(take.supplied.file);
        expect(take.rawFile, name).toMatch(/^[a-z-]+-\d+\.wav$/);
        continue;
      }
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
          take.n === soundChoiceSetV1(sound.id)?.default,
        );
    // A sound the user picked a recording for fetches that, not its take.
    const rocket = soundCandidateV1("attack.rocket", 2);
    if (rocket === null) throw new Error("attack.rocket #2 is missing");
    expect(urls).toContain(soundCandidateUrlV1(rocket));
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

  it("orders a sound's choices: the user's pick, new takes (the default first), old, synth", () => {
    for (const id of SOUND_IDS_V1) {
      const set = soundChoiceSetV1(id);
      if (set === null) throw new Error(id);
      const picked = set.candidates.filter((candidate) => candidate.userPick);
      expect(picked.length, id).toBeLessThanOrEqual(1);
      expect(set.candidates.slice(0, picked.length), id).toEqual(picked);
      const rest = set.candidates.slice(picked.length);
      const origins = rest.map((candidate) => candidate.origin);
      const firstStock = origins.indexOf("STOCK");
      if (firstStock >= 0)
        expect(
          origins.slice(firstStock).every((o) => o === "STOCK"),
          id,
        ).toBe(true);
      // The takes keep the manifest's order (the measured default first),
      // without the pick.
      const sound = elevenLabsSoundV1(id);
      expect(
        rest
          .filter((candidate) => candidate.origin === "ELEVENLABS")
          .map((candidate) => candidate.n),
        id,
      ).toEqual(
        (sound?.takes ?? [])
          .map((take) => take.n)
          .filter((n) => n !== picked[0]?.n),
      );
      if (sound?.default !== null && sound !== null && picked.length === 0)
        expect(rest[0]?.n, id).toBe(sound.default);
    }
  });

  it("keeps the takes the user retired to choose, never as the default", () => {
    // "for village captured generate something new i don't like any of
    // these" (2026-10-14): new takes of new prompts, the old ones kept.
    const prompts = readPromptsV1();
    const records = readRecordsV1().takes;
    const retired = new Map(
      prompts.sounds.flatMap((sound) =>
        (sound.retired ?? []).map((entry) => [`${sound.id} #${entry.n}`, 1]),
      ),
    );
    expect([...retired.keys()]).toEqual(
      expect.arrayContaining([
        "village.capture #103",
        "village.capture #106",
        "village.capture #107",
      ]),
    );
    for (const sound of ELEVENLABS_SOUNDS_V1)
      for (const take of sound.takes) {
        if (!retired.has(`${sound.id} #${take.n}`)) continue;
        expect(take.passed, `${sound.id} #${take.n}`).toBe(false);
        expect(sound.default, sound.id).not.toBe(take.n);
        expect(isStockSoundChoiceV1(sound.id, take.n)).toBe(true);
      }
    const village = elevenLabsSoundV1("village.capture");
    const fresh = records.filter(
      (take) => take.id === "village.capture" && take.round >= 4,
    );
    expect(fresh.length).toBeGreaterThanOrEqual(3);
    expect(fresh.length).toBeLessThanOrEqual(5);
    expect(fresh.map((take) => take.n)).toContain(village?.default);
    expect(soundChoiceSetV1("village.capture")?.default).toBe(village?.default);
  });

  it("gives every kind of unit a short hurt sound, the user's own for Goblins and Dinosaurs", () => {
    // Bead pulp_wars-2yc.52: "here are two effects i generated for
    // creatures taking damage. generate others as appropriate."
    const hurt = SOUND_IDS_V1.filter((id) => id.startsWith("unit.hurt."));
    expect(hurt).toHaveLength(12);
    const records = readRecordsV1().takes;
    const supplied: Readonly<Record<string, string>> = {
      "unit.hurt.goblin": "goblin_taking_damage_#2-1791924587712.wav",
      "unit.hurt.dinosaur": "dinosaur_taking_dama_#1-1791924507764.wav",
    };
    for (const id of hurt) {
      const sound = elevenLabsSoundV1(id);
      if (sound === null) throw new Error(`${id} has no takes`);
      expect(soundChoiceSetV1(id)?.default, id).toBe(sound.default);
      for (const take of sound.takes) {
        expect(take.seconds, `${id} #${take.n}`).toBeGreaterThanOrEqual(0.2);
        expect(take.seconds, `${id} #${take.n}`).toBeLessThanOrEqual(0.7);
      }
      const file = supplied[id];
      if (file !== undefined) {
        // The user's file is the only take and the default.
        expect(
          sound.takes.map((take) => take.n),
          id,
        ).toEqual([101]);
        expect(sound.default, id).toBe(101);
        expect(sound.takes[0]?.prompt, id).toBe(
          `The user's ElevenLabs generation: ${file}`,
        );
        expect(sound.takes[0]?.generated, id).toBe("2026-10-13");
        continue;
      }
      // Three takes or more asked for, measured, the best the default.
      expect(
        records.filter((take) => take.id === id && take.round >= 1).length,
        id,
      ).toBeGreaterThanOrEqual(3);
      expect(sound.takes[0]?.passed, id).toBe(true);
      expect(sound.default, id).toBe(sound.takes[0]?.n);
    }
  });

  it("plays one discreet generic death, 6 dB under the hurt sounds, the groans kept to choose", () => {
    // Bead pulp_wars-2yc.52: "have a generic sound on death and make it
    // more discreet than the current groan. units die a lot".
    const death = elevenLabsSoundV1("unit.death");
    if (death === null || death.default === null)
      throw new Error("unit.death has no default take");
    const records = readRecordsV1().takes;
    const fresh = records.filter(
      (take) => take.id === "unit.death" && take.round >= 4,
    );
    expect(fresh.length).toBeGreaterThanOrEqual(3);
    expect(fresh.length).toBeLessThanOrEqual(5);
    expect(fresh.map((take) => take.n)).toContain(death.default);
    expect(soundChoiceSetV1("unit.death")?.default).toBe(death.default);
    // No voice was asked for.
    for (const take of fresh) expect(take.prompt).toMatch(/no voice/);
    // The groans stay, never the default.
    for (const n of [101, 102, 103]) {
      const take = death.takes.find((entry) => entry.n === n);
      expect(take?.passed, `#${n}`).toBe(false);
      expect(isStockSoundChoiceV1("unit.death", n), `#${n}`).toBe(true);
    }
    // Its level: matched to 6 dB under the hurt sounds' reference.
    const clips = JSON.parse(
      readFileSync(join(ROOT, "docs/audio/elevenlabs-sfx-clips.json"), "utf8"),
    ) as {
      sounds: readonly {
        id: string;
        reference: { lufs: number };
        takes: readonly { n: number; lufs: number; gain: number }[];
      }[];
    };
    const of = (id: string) => clips.sounds.find((sound) => sound.id === id);
    const hurtReference = of("unit.hurt")?.reference.lufs ?? 0;
    const deathReference = of("unit.death")?.reference.lufs ?? 0;
    expect(deathReference).toBeCloseTo(hurtReference - 6, 1);
    for (const id of SOUND_IDS_V1.filter((sound) =>
      sound.startsWith("unit.hurt."),
    ))
      expect(of(id)?.reference.lufs, id).toBe(hurtReference);
    const played = of("unit.death")?.takes.find((t) => t.n === death.default);
    if (played === undefined) throw new Error("no clip for the default");
    expect(
      played.lufs + 20 * Math.log10(played.gain),
      "the death as played, in LUFS",
    ).toBeCloseTo(deathReference, 0);
  });

  it("plays City lost's old chord made shorter, and keeps the whole one", () => {
    const full = stockSoundV1("city.lost")?.candidates.find((c) => c.n === 1);
    const short = soundCandidateV1("city.lost", 2);
    if (full === undefined || short === null || short.origin !== "STOCK")
      throw new Error("city.lost #1 and #2 are missing");
    expect(soundChoiceSetV1("city.lost")?.default).toBe(2);
    expect(short.originalFile).toBe(full.originalFile);
    expect(short.startSeconds).toBe(full.startSeconds);
    expect(short.endSeconds - short.startSeconds).toBeLessThanOrEqual(
      (full.endSeconds - full.startSeconds) / 2,
    );
    expect(short.fadeOutMs).toBeGreaterThanOrEqual(300);
    expect(short.gain).toBe(full.gain);
    expect(isStockSoundChoiceV1("city.lost", 1)).toBe(true);
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
