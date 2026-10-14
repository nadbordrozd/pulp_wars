import type { SfxKindV1, SfxPromptV1 } from "./elevenlabs-sfx-data";
import {
  NEAR_DUPLICATE_SIMILARITY,
  takeFailuresV1,
  takeScoreV1,
  takeSimilarityV1,
  type TakeMeasurementV1,
} from "./elevenlabs-sfx-measure";

/**
 * Choosing among a sound's ElevenLabs takes by measurement (bead
 * pulp_wars-2yc.51): every take is judged by the rules of its kind, a
 * passing take that is nearly the same as a better one is dropped, and of
 * the rest the best-scoring is the default and up to two more are kept as
 * choices. Pure: no file, no service.
 */

/** At most this many takes of a sound are kept (the default and two more). */
export const ELEVENLABS_SFX_KEEP = 3;

export interface JudgedTakeV1 {
  readonly n: number;
  readonly round: number;
  readonly take: number;
  readonly pass: boolean;
  /** The rules it broke, or why a passing take was dropped. */
  readonly failures: readonly string[];
  readonly score: number;
  readonly measured: TakeMeasurementV1;
}

export interface SoundSelectionV1 {
  readonly id: string;
  readonly takes: readonly JudgedTakeV1[];
  /** The kept takes, best first; the first is the default. Empty: none passed. */
  readonly kept: readonly number[];
  /**
   * When no take passed: the best two that failed only on their shape
   * (length, onset, tail, brightness), offered to listen to beside the
   * previous default, which stays. Never a clipped or silent take.
   */
  readonly offered: readonly number[];
  /**
   * Takes the user heard and did not want as the default (the prompt's
   * `retired`): kept to choose, after the others, never the default.
   */
  readonly retired: readonly number[];
  readonly confidence: "high" | "medium" | "low";
  /** Why the default was picked, in a sentence. */
  readonly why: string;
}

/** Failures that keep a take out of the Gallery altogether. */
const HARD_FAILURES: readonly string[] = [
  "clipped",
  "silent",
  "squashed",
  "hissy",
  "busy lead-in",
];

/** Kinds whose character a measurement says little about. */
const CHARACTER_KINDS: readonly SfxKindV1[] = ["vocal", "stinger", "effect"];

export function selectTakesV1(
  sound: Pick<
    SfxPromptV1,
    "id" | "kind" | "minSeconds" | "maxSeconds" | "retired"
  >,
  takes: readonly {
    readonly n: number;
    readonly round: number;
    readonly take: number;
    readonly measured: TakeMeasurementV1;
  }[],
  /**
   * Takes the user made and handed over (bead pulp_wars-2yc.52): kept
   * first, the first of them the default, whatever they measure. The
   * rules choose among generated takes; the user chose these by ear.
   */
  supplied: readonly number[] = [],
): SoundSelectionV1 {
  const retiredReason = new Map(
    (sound.retired ?? []).map((entry) => [entry.n, entry.reason]),
  );
  const outsideRules = new Map<number, readonly string[]>();
  const judged = takes.map((take) => {
    const measuredFailures = takeFailuresV1(sound, take.measured);
    const reason = retiredReason.get(take.n);
    if (supplied.includes(take.n)) outsideRules.set(take.n, measuredFailures);
    // A retired take passed once; it is judged again, and kept to choose
    // when it still passes, but it never ranks for the default.
    const failures = supplied.includes(take.n)
      ? []
      : reason === undefined || measuredFailures.length > 0
        ? measuredFailures
        : [`retired: ${reason}`];
    return {
      ...take,
      failures,
      pass: failures.length === 0,
      score: takeScoreV1(sound, take.measured),
    };
  });
  const own = supplied.flatMap((n) => {
    const take = judged.find((entry) => entry.n === n);
    return take === undefined ? [] : [take];
  });
  const retired = judged
    .filter(
      (take) =>
        retiredReason.has(take.n) &&
        take.failures.every((failure) => failure.startsWith("retired: ")),
    )
    .map((take) => take.n);
  const ranked = judged
    .filter((take) => take.pass && !supplied.includes(take.n))
    .sort((a, b) => a.score - b.score || a.n - b.n);
  const kept: typeof ranked = [...own];
  const dropped = new Map<number, string>();
  for (const take of ranked) {
    const twin = kept.find(
      (other) =>
        takeSimilarityV1(other.measured, take.measured) >=
        NEAR_DUPLICATE_SIMILARITY,
    );
    if (twin !== undefined) dropped.set(take.n, `near-duplicate of #${twin.n}`);
    else if (kept.length - own.length >= ELEVENLABS_SFX_KEEP)
      dropped.set(take.n, "passed, but three better takes were kept");
    else kept.push(take);
  }
  const final: JudgedTakeV1[] = judged.map((take) => {
    const reason = dropped.get(take.n);
    return reason === undefined
      ? take
      : { ...take, pass: false, failures: [reason] };
  });
  const best = kept[0];
  const second = kept[1];
  const confidence: SoundSelectionV1["confidence"] =
    own.length > 0
      ? "high"
      : best === undefined || kept.length < 2
        ? "low"
        : CHARACTER_KINDS.includes(sound.kind) ||
            (second !== undefined && second.score - best.score < 0.05)
          ? "medium"
          : "high";
  const outside = best === undefined ? [] : (outsideRules.get(best.n) ?? []);
  const why =
    best === undefined
      ? "No take passed its rules; the sound keeps its previous default."
      : own.length > 0
        ? `#${best.n} is the user's own, chosen by ear and kept whatever it measures: ` +
          `${best.measured.clipSeconds} s for a range of ${sound.minSeconds}–${sound.maxSeconds} s, ` +
          `onset ${best.measured.onsetMs} ms, tail ${best.measured.tailMs} ms, ` +
          `centred near ${best.measured.centroidHz} Hz` +
          (outside.length === 0
            ? "; it passes the rules too."
            : `; by the rules it would have failed: ${outside.join("; ")}.`)
        : `#${best.n} scored best (${best.score}) of ${kept.length} kept: ` +
          `${best.measured.clipSeconds} s for a range of ${sound.minSeconds}–${sound.maxSeconds} s, ` +
          `onset ${best.measured.onsetMs} ms, tail ${best.measured.tailMs} ms, ` +
          `centred near ${best.measured.centroidHz} Hz` +
          (second === undefined
            ? "."
            : `; the next, #${second.n}, scored ${second.score}.`);
  const offered =
    kept.length > 0
      ? []
      : judged
          .filter(
            (take) =>
              !retiredReason.has(take.n) &&
              !take.failures.some((failure) =>
                HARD_FAILURES.some((hard) => failure.startsWith(hard)),
              ),
          )
          .sort((a, b) => a.score - b.score || a.n - b.n)
          .slice(0, 2)
          .map((take) => take.n);
  return {
    id: sound.id,
    takes: final,
    kept: kept.map((take) => take.n),
    offered,
    retired,
    confidence,
    why:
      (offered.length === 0
        ? why
        : `${why} The best two that failed only on their shape (#${offered.join(", #")}) are offered to listen to.`) +
      (retired.length === 0
        ? ""
        : ` Retired by the user, kept to choose but never the default: #${retired.join(", #")}.`),
  };
}

/** A take's character in a line, from its measurements. */
export function takeNoteV1(m: TakeMeasurementV1): string {
  const low = Math.round((m.bands[0] + m.bands[1]) * 100);
  const centre =
    m.centroidHz >= 1000
      ? `${(m.centroidHz / 1000).toFixed(1)} kHz`
      : `${m.centroidHz} Hz`;
  const attack =
    m.onsetMs <= 10
      ? "hard attack"
      : m.onsetMs <= 40
        ? "quick attack"
        : `swells over ${m.onsetMs} ms`;
  return `${m.clipSeconds} s, ${attack}, centred near ${centre}, ${low}% of its energy under 1 kHz, crest ${m.crestDb} dB.`;
}
