import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { format } from "prettier";
import {
  SOUND_IDS_V1,
  SOUND_MANIFEST_V1,
} from "../../src/audio/sound-manifest";
import {
  SOUND_USER_PICKS_V1,
  soundCandidateOrdinalV1,
  soundCandidateV1,
  soundUserPickV1,
} from "../../src/audio/sound-choices";
import {
  ELEVENLABS_SFX_CLIPS_PATH,
  ELEVENLABS_SFX_DOC_PATH,
  ELEVENLABS_SFX_MEASUREMENTS_PATH,
  ROOT,
  readJsonV1,
  readPromptsV1,
  readRecordsV1,
} from "./elevenlabs-sfx-data";
import type { ElevenLabsManifestV1 } from "./elevenlabs-sfx-encode";
import {
  ATTACK_TRIM_KINDS,
  ELEVENLABS_SFX_KIND_RULES,
} from "./elevenlabs-sfx-measure";
import type { JudgedTakeV1, SoundSelectionV1 } from "./elevenlabs-sfx-select";

/**
 * Writes `docs/audio/ELEVENLABS_SFX.md` (bead pulp_wars-2yc.51) from the
 * prompts, the generation records, the measurements and the encoded
 * clips, so the document says exactly what the data says. A unit test
 * keeps it current: `npm run audio:elevenlabs-sfx -- doc`.
 */

type MeasuredSoundV1 = SoundSelectionV1 & {
  readonly kind: string;
  readonly minSeconds: number;
  readonly maxSeconds: number;
};

const cell = (text: string): string =>
  text.replace(/\|/g, "\\|").replace(/\n/g, " ");

const pct = (share: number): string => `${Math.round(share * 100)}%`;

function label(id: string): string {
  return (
    (SOUND_MANIFEST_V1 as Readonly<Record<string, { label: string }>>)[id]
      ?.label ?? id
  );
}

/**
 * The versions the user chose by ear (`src/audio/sound-picks.json`): what
 * each sound plays, what the Gallery called it when it was chosen, and
 * what the user said.
 */
function picksSectionV1(): string[] {
  if (SOUND_USER_PICKS_V1.length === 0) return [];
  const lines = [
    "## The user's picks",
    "",
    "The user listened in the Gallery and chose a version for these sounds",
    "([sound-picks.json](../../src/audio/sound-picks.json)). A pick plays by",
    "default, ahead of the measured default of the tables below, which stays",
    'a choice. It reads "Pick" in the Gallery, first in its row; the other',
    "versions keep the numbers they had. A browser's own pick still wins.",
    "",
    "| Sound | Name | Plays | Its number in the Gallery | The user said |",
    "| --- | --- | --- | --- | --- |",
  ];
  for (const pick of SOUND_USER_PICKS_V1) {
    const clip = soundCandidateV1(pick.id, pick.n);
    if (clip === null) throw new Error(`${pick.id} has no #${pick.n}`);
    const plays =
      clip.origin === "ELEVENLABS"
        ? `#${clip.n}, a take: ${clip.prompt}`
        : `#${clip.n}, a recording: ${clip.library} / \`${clip.originalFile}\`, ${clip.startSeconds}–${clip.endSeconds} s`;
    const was = `${clip.origin === "ELEVENLABS" ? "New" : "Old"} ${soundCandidateOrdinalV1(pick.id, clip)}`;
    lines.push(
      `| \`${pick.id}\` | ${cell(label(pick.id))} | ${cell(plays)} | ${was} | ${cell(pick.said)} (${pick.date}) |`,
    );
  }
  lines.push("");
  return lines;
}

/** The document, before Prettier lays out its tables. */
export function elevenLabsSfxMarkdownV1(): string {
  const prompts = readPromptsV1();
  const records = readRecordsV1();
  const measured = readJsonV1<{ sounds: readonly MeasuredSoundV1[] }>(
    ELEVENLABS_SFX_MEASUREMENTS_PATH,
    { sounds: [] },
  ).sounds;
  const clips = readJsonV1<ElevenLabsManifestV1 | null>(
    ELEVENLABS_SFX_CLIPS_PATH,
    null,
  );
  const clipSounds = clips?.sounds ?? [];
  // The takes the user made and handed over are not generated (round 0).
  const generatedTakes = records.takes.filter(
    (take) => take.supplied === undefined,
  );
  const suppliedTakes = records.takes.filter(
    (take) => take.supplied !== undefined,
  );
  const rounds = [...new Set(generatedTakes.map((take) => take.round))].sort();
  const takesOf = (round: number): number =>
    generatedTakes.filter((take) => take.round === round).length;
  const failedIn = (round: number): number =>
    measured
      .flatMap((sound) => sound.takes)
      .filter(
        (take) =>
          take.round === round &&
          !take.pass &&
          !take.failures.some(
            (failure) =>
              failure.startsWith("passed, but") ||
              failure.startsWith("retired: "),
          ),
      ).length;
  const cost = records.takes.reduce(
    (sum, take) => sum + Number(take.cost?.["character-cost"] ?? 0),
    0,
  );
  const kept = measured.reduce((sum, sound) => sum + sound.kept.length, 0);
  const offered = measured.reduce(
    (sum, sound) => sum + sound.offered.length,
    0,
  );
  const none = measured.filter((sound) => sound.kept.length === 0);
  // Sounds added after the takes were made (no take was ever asked for).
  const later = SOUND_IDS_V1.filter(
    (id) => !measured.some((sound) => sound.id === id),
  );
  // Sounds whose recording the user chose by ear: it plays ahead of the takes.
  const picked = measured.filter((sound) => soundUserPickV1(sound.id) !== null);
  const regenerated = prompts.sounds.filter(
    (sound) => (sound.revisions ?? []).length > 0,
  );
  const files = clipSounds.flatMap((sound) => sound.takes);
  const bytes = files.reduce((sum, take) => {
    const path = join(ROOT, clips?.output.folder ?? "", take.file);
    return sum + (existsSync(path) ? statSync(path).size : 0);
  }, 0);
  const lines: string[] = [
    "# ElevenLabs sound effects",
    "",
    "<!-- Generated by scripts/audio/elevenlabs-sfx-doc.ts from docs/audio/elevenlabs-sfx-*.json. Do not edit by hand: run `npm run audio:elevenlabs-sfx -- doc`. -->",
    "",
    "Bead `pulp_wars-2yc.51`. The user, 2026-10-14: replace every sound effect",
    "with ElevenLabs generations and keep the old ones in the Gallery to",
    "compare. Every sound effect of the game was generated anew with the",
    `ElevenLabs sound-effects model (\`${prompts.model}\`), several takes each;`,
    "each take was measured, held to rules for its kind of sound, and the",
    "best-measuring take became the sound's default. The other passing takes,",
    "the stock recordings the sound had, and the synthesised sound stay in the",
    "Gallery as choices. The theme music is not a sound effect and is",
    "unchanged.",
    "",
    "**Nobody listened.** Neither the developer nor the tools can hear, so",
    "every choice below was made by measurement alone: length, onset, tail,",
    "loudness, brightness, the spread of energy, clipping and how alike the",
    "takes are. The measurements say whether a take is the right shape; only",
    "a listener can say whether it is the right sound.",
    "",
    "## How to choose",
    "",
    "1. Open the Gallery and its **Sounds** tab. Under each card is a row of",
    "   versions: **New 1** (marked default), **New 2**, **New 3** are the",
    "   ElevenLabs takes, **Old 1** and on the stock recordings the sound had",
    "   ([STOCK_SOUND_CHOICES.md](STOCK_SOUND_CHOICES.md)), and **Synth** the",
    "   synthesised sound.",
    "2. Press a line to hear it; a take that is not in use is fetched then.",
    "   Press **Use** on the one you like: the game plays it from then on, in",
    "   that browser only. A pick made before this bead still stands.",
    "3. Press **Copy my picks** and paste the text to the developer. A take is",
    "   named by its number (101 and up) and its prompt.",
    "",
    "## The count",
    "",
    `- ${measured.length} sound effects, every one of the game's (${SOUND_IDS_V1.length})${
      later.length === 0
        ? ""
        : ` but ${later.map((id) => `\`${id}\``).join(", ")}, added later with the user's own recording`
    }.`,
    `- ${generatedTakes.length} takes generated in ${rounds.length} rounds: ${rounds
      .map((round) => `${takesOf(round)} in round ${round}`)
      .join(", ")}.`,
    ...(suppliedTakes.length === 0
      ? []
      : [
          `- ${suppliedTakes.length} takes the user made with ElevenLabs and handed over, brought in by \`import\` (round 0) and played by default whatever they measure: ${suppliedTakes
            .map(
              (take) =>
                `\`${take.id}\` #${take.n} (\`${take.supplied?.file ?? ""}\`, ${take.date})`,
            )
            .join(", ")}.`,
        ]),
    `- ${rounds.map((round) => `${failedIn(round)} of round ${round}`).join(", ")} failed their rules. ${regenerated.length} prompts were revised and their failed takes generated again (round 2), and the ${
      prompts.sounds.filter((sound) =>
        (sound.revisions ?? []).some((revision) => revision.round === 3),
      ).length
    } sounds still short of takes once more (round 3).${
      rounds.some((round) => round > 3)
        ? ` Bead \`pulp_wars-2yc.52\` added rounds 4 to 6, new prompts for the sounds whose takes the user heard and did not want (${prompts.sounds
            .filter((sound) => (sound.retired ?? []).length > 0)
            .map((sound) => `\`${sound.id}\``)
            .join(
              ", ",
            )}; their old takes are retired, kept to choose but never the default), and the first two rounds of its new sounds.`
        : ""
    }`,
    `- ${kept} takes kept: ${measured.filter((sound) => sound.kept.length > 0).length} sounds play a new take by default, ${measured.filter((sound) => sound.kept.length >= 2).length} of them with at least one other to choose.`,
    `- ${none.length} ${none.length === 1 ? "sound" : "sounds"} with no passing take, which ${none.length === 1 ? "keeps its" : "keep their"} old default: ${
      none
        .map(
          (sound) =>
            `\`${sound.id}\` (${offered > 0 && sound.offered.length > 0 ? `the best ${sound.offered.length} failed takes offered to listen to` : "nothing offered"})`,
        )
        .join(", ") || "none"
    }.`,
    ...(picked.length === 0
      ? []
      : [
          `- ${picked.length} ${picked.length === 1 ? "sound plays" : "sounds play"} the version the user chose by ear ahead of ${picked.length === 1 ? "its" : "their"} measured default, which stays a choice ([The user's picks](#the-users-picks)).`,
        ]),
    `- ${files.length} clips, ${(bytes / 1e6).toFixed(2)} MB together: AAC at 96 kbit/s like the stock clips.`,
    `- The service reported a cost of ${cost} credits in all (its \`character-cost\` header, summed over every take).`,
    "",
    ...picksSectionV1(),
    "## Listen to these first",
    "",
    "The least certain defaults: a sound with fewer than two passing takes",
    "(nothing to compare by measurement), and the voices and jingles, whose",
    "character a measurement cannot judge.",
    "",
    "| Sound | Name | Default | Why first |",
    "| --- | --- | --- | --- |",
  ];
  for (const sound of measured) {
    // The user's own take was chosen by ear: nothing to listen to first.
    if (
      suppliedTakes.some(
        (take) => take.id === sound.id && take.n === sound.kept[0],
      )
    )
      continue;
    const why =
      sound.kept.length === 0
        ? "No take passed: the old default plays."
        : sound.kept.length === 1
          ? "Only one take passed."
          : sound.kind === "vocal" || sound.kind === "stinger"
            ? `A ${sound.kind === "vocal" ? "voice" : "jingle"}: measured for shape only.`
            : null;
    if (why === null) continue;
    lines.push(
      `| \`${sound.id}\` | ${cell(label(sound.id))} | ${sound.kept[0] === undefined ? "old" : `#${sound.kept[0]}`} | ${why} |`,
    );
  }
  lines.push(
    "",
    "## The prompts",
    "",
    "Every prompt names the sound and the event in a sentence and ends with",
    "the style it shares with the others:",
    "",
    `- Effects: "${prompts.styleSuffix}"`,
    `- Jingles: "${prompts.stingerSuffix}"`,
    `- Voices and creatures: "${prompts.vocalSuffix}"`,
    "",
    "A voice is wordless: a grunt, a groan, a shout. The prompts, their",
    "revisions and the reason for each revision are in",
    "[elevenlabs-sfx-prompts.json](elevenlabs-sfx-prompts.json); every request",
    "(the whole text, the length asked, the prompt influence, the model, the",
    "day and the cost) is in [elevenlabs-sfx-records.json](elevenlabs-sfx-records.json).",
    "The model takes no seed, so a take cannot be made again; the raw takes",
    "are kept outside the repository and only the encoded clips are in it.",
    "",
    "## How the takes were judged",
    "",
    "Each raw take (16-bit PCM at 44.1 kHz) is measured as the clip it would",
    "become ([How a take becomes a clip](#how-a-take-becomes-a-clip)):",
    "",
    "- **Trimmed** at 40 dB under its loudest 5 ms. For the kinds that start",
    `  at the attack (${ATTACK_TRIM_KINDS.join(", ")}), anything more than 10 ms`,
    "  before the sound first comes within 10 dB of its loudest is left out.",
    "- **Onset**: from the start of the clip to within 10 dB of its loudest.",
    "- **Tail**: from the last moment within 20 dB of its loudest to its end.",
    "- **Loudness**: K-weighted (ITU-R BS.1770), the loudest 400 ms, or the",
    "  whole clip when shorter; at the stored peak of 0.708.",
    "- **Crest**: peak over RMS. **Centroid**: the spectral centre of mass.",
    "  **Under 1 kHz**: the share of energy below 1 kHz.",
    "- **Clipped**: the share of samples in runs of three or more at full",
    "  scale. ElevenLabs delivers its takes mastered hot, so single samples",
    "  at full scale are common and harmless; a run is a flat-topped wave.",
    "",
    "A take fails when it is silent (peak under -30 dBFS), clipped (over",
    "0.1% of samples in flat runs), shorter than its sound's shortest length,",
    "longer than its longest (over 10% of its energy past it), busy before",
    "its attack (over 10% of its energy), hissy (over 75% of its energy above",
    "4 kHz, 90% for a bright sound), or when it breaks its kind's rules:",
    "",
    "| Kind | Onset at most | Centroid | Under 1 kHz at least | Crest at least | Tail at most |",
    "| --- | --- | --- | --- | --- | --- |",
  );
  for (const [kind, rules] of Object.entries(ELEVENLABS_SFX_KIND_RULES))
    lines.push(
      `| ${kind} | ${rules.onsetMs} ms | ${
        rules.minCentroidHz === undefined && rules.maxCentroidHz === undefined
          ? "any"
          : `${rules.minCentroidHz ?? 0}–${rules.maxCentroidHz ?? "∞"} Hz`
      } | ${rules.minLowShare === undefined ? "any" : pct(rules.minLowShare)} | ${rules.minCrestDb} dB | ${pct(rules.maxTailShare)} of the clip |`,
    );
  lines.push(
    "",
    "Of the passing takes, the one with the lowest score is the default. The",
    "score adds the distance of its length from the middle of the sound's",
    "range, its onset against its kind's limit, its tail's share of the",
    "clip, any energy past the longest length or before the attack, and the",
    "kind's preference (brighter for bells and chimes, lower for booms,",
    "shorter for clicks and steps). A passing take whose spectrum and",
    "loudness shape are 98.5% alike to a better one is dropped as a",
    "near-duplicate. At most three are kept.",
    "",
    "Three rules were calibrated after the first round, before any take was",
    "chosen, and every take was measured again under them:",
    "",
    "- **Clipping** first counted every sample at full scale. Nearly every",
    "  take has a few, so it now counts flat runs of three or more.",
    "- **A bright sound's centroid** had to be above 1.5 kHz, which failed",
    "  bells pitched exactly where the synthesised sounds are (0.5 to 1.6 kHz);",
    "  it is 1 kHz now.",
    "- **Harvest** was judged as a hit, which wants energy under 1 kHz; a",
    "  leafy rustle has little. It is judged as a pop.",
    "",
    "Where no take passed after three rounds, the sound keeps the default it",
    "had, and the best two takes that failed only on their shape (length,",
    "onset, tail, brightness; never a clipped or hissy one) are offered in",
    "the Gallery to listen to.",
    "",
    "## How a take becomes a clip",
    "",
    "`npm run audio:elevenlabs-sfx -- encode` takes the stretch measured",
    "above, from 3 ms before it starts, cuts it at the sound's longest length",
    "when it runs on, fades both ends (2 ms in; out over the last few",
    "milliseconds, or over a fifth of the clip when it was cut), scales its",
    "peak to 0.708 (-3 dB) like every stock clip, and encodes it with",
    "`afconvert` as AAC-LC at 96 kbit/s with its timestamps zeroed. The file",
    "is the sound's id with dashes and the take's number",
    "(`impact-hit-102.m4a`).",
    "",
    "Its level (`gain`) makes it as loud as the sound's previous default: the",
    "stock recording at its level, or the synthesised sound, measured the",
    "same way. A take quieter than that even at full level plays at 1.",
    ...prompts.sounds.flatMap((sound) =>
      sound.loudness === undefined
        ? []
        : [
            `\`${sound.id}\` is matched instead to \`${sound.loudness.like}\`'s reference, ${sound.loudness.offsetDb} dB: ${sound.loudness.reason}`,
          ],
    ),
    "",
    "The game reads `src/audio/elevenlabs-sounds.json` (each take's file,",
    "level, length, prompt and a line on its character, and the default);",
    "[elevenlabs-sfx-clips.json](elevenlabs-sfx-clips.json) has the rest: the",
    "stretch kept, the loudness and the reference it was matched to. Only",
    "the default is fetched at the game's start; another take, like an old",
    "recording, is fetched when it is heard or picked.",
    "",
    "## Every sound",
    "",
    "The default of each sound and what it measured. Length and the range",
    "are in seconds, onset and tail in ms, loudness in LUFS as stored.",
    "",
    "| Sound | Kind | Range | Takes | Kept | Default | Length | Onset | Tail | Centroid | Under 1 kHz | Loudness | Level | Matched to | Confidence |",
    "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |",
  );
  for (const sound of measured) {
    const best = sound.takes.find((take) => take.n === sound.kept[0]);
    const clip = clipSounds
      .find((entry) => entry.id === sound.id)
      ?.takes.find((take) => take.n === sound.kept[0]);
    const reference = clipSounds.find(
      (entry) => entry.id === sound.id,
    )?.reference;
    const m = best?.measured;
    lines.push(
      `| \`${sound.id}\` | ${sound.kind} | ${sound.minSeconds}–${sound.maxSeconds} | ${sound.takes.length} | ${sound.kept.length} | ${
        best === undefined ? "old" : `#${best.n}`
      } | ${m?.clipSeconds ?? ""} | ${m?.onsetMs ?? ""} | ${m?.tailMs ?? ""} | ${m?.centroidHz ?? ""} | ${
        m === undefined ? "" : pct(m.bands[0] + m.bands[1])
      } | ${clip?.lufs ?? ""} | ${clip?.gain ?? ""} | ${cell(reference?.source ?? "")} | ${sound.confidence} |`,
    );
  }
  lines.push("", "### Why each default", "");
  for (const sound of measured) lines.push(`- \`${sound.id}\`: ${sound.why}`);
  lines.push(
    "",
    "## Every take",
    "",
    "All the takes, kept or not, with what failed. Clipped is the share of",
    "samples in flat runs at full scale.",
    "",
    "| Sound | Take | Round | Result | Score | Length | Onset | Tail | Centroid | Under 1 kHz | Crest | Clipped | Why not |",
    "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |",
  );
  const result = (sound: MeasuredSoundV1, take: JudgedTakeV1): string =>
    sound.kept[0] === take.n
      ? "default"
      : sound.kept.includes(take.n)
        ? "kept"
        : sound.offered.includes(take.n)
          ? "offered"
          : (sound.retired ?? []).includes(take.n)
            ? "retired"
            : "rejected";
  for (const sound of measured)
    for (const take of [...sound.takes].sort((a, b) => a.n - b.n)) {
      const m = take.measured;
      lines.push(
        `| \`${sound.id}\` | #${take.n} | ${take.round} | ${result(sound, take)} | ${take.score} | ${m.clipSeconds} | ${m.onsetMs} | ${m.tailMs} | ${m.centroidHz} | ${pct(m.bands[0] + m.bands[1])} | ${m.crestDb} | ${(m.clippedRunShare * 100).toFixed(2)}% | ${cell(take.failures.join("; "))} |`,
      );
    }
  lines.push(
    "",
    "## Making it again",
    "",
    "```sh",
    "npm run audio:elevenlabs-sfx -- generate --group attack --out <raw folder>   # one group at a time; resumable",
    "npm run audio:elevenlabs-sfx -- measure --out <raw folder>",
    "npm run audio:elevenlabs-sfx -- generate --round 2 --out <raw folder>        # the revisions of round 2",
    "npm run audio:elevenlabs-sfx -- encode --out <raw folder>",
    "npm run audio:elevenlabs-sfx -- doc",
    "```",
    "",
    "The key is read from `ELEVENLAB_API_KEY` and never written anywhere. A",
    "take on record is never asked for again. Nothing plays a sound.",
    "",
  );
  return lines.join("\n");
}

/** The document as it is checked in: laid out by Prettier. */
export async function renderElevenLabsSfxDocV1(): Promise<string> {
  return format(elevenLabsSfxMarkdownV1(), {
    parser: "markdown",
    proseWrap: "preserve",
  });
}

/** Whether the checked-in document is current. */
export async function elevenLabsSfxDocIsCurrentV1(): Promise<boolean> {
  if (!existsSync(ELEVENLABS_SFX_DOC_PATH)) return false;
  return (
    readFileSync(ELEVENLABS_SFX_DOC_PATH, "utf8") ===
    (await renderElevenLabsSfxDocV1())
  );
}
