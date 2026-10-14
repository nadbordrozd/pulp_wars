import {
  ELEVENLABS_SOUNDS_V1,
  elevenLabsSoundV1,
  type ElevenLabsTakeV1,
} from "./elevenlabs-sounds";
import {
  STOCK_SOUNDS_V1,
  STOCK_SOUND_GENERATED_CHOICE_V1,
  stockSoundUrlV1,
  stockSoundV1,
  type StockSoundCandidateV1,
} from "./stock-sounds";

/**
 * What each game sound can play (beads pulp_wars-2yc.24 and
 * pulp_wars-2yc.51, docs/ui/SOUND.md "Choosing between recordings"): its
 * ElevenLabs takes, the stock recordings it had before them, and the
 * synthesised sound (number 0). One list for the audio device, the
 * start-of-game fetch, the stored picks and the Gallery, made from the two
 * provenance manifests (`elevenlabs-sounds.json`, `stock-sounds.json`).
 *
 * The default is the sound's ElevenLabs default. A sound none of whose
 * takes passed its measurements keeps the default it had (a stock
 * recording or the synthesised sound). Numbers never collide: stock
 * recordings are 1 to 4, ElevenLabs takes 101 and up, so a pick stored
 * before the ElevenLabs takes existed still names the same recording.
 */

/** An ElevenLabs take as one of a sound's candidates. */
export interface ElevenLabsCandidateV1 extends ElevenLabsTakeV1 {
  readonly origin: "ELEVENLABS";
}

/** A stock recording as one of a sound's candidates. */
export interface StockCandidateV1 extends StockSoundCandidateV1 {
  readonly origin: "STOCK";
}

export type SoundCandidateV1 = ElevenLabsCandidateV1 | StockCandidateV1;

/** A candidate with the sound it belongs to. */
export type SoundClipV1 = SoundCandidateV1 & { readonly id: string };

export interface SoundChoiceSetV1 {
  readonly id: string;
  /** The candidate played without a pick; 0 for the synthesised sound. */
  readonly default: number;
  /**
   * The ElevenLabs takes (the default first, then the others in the order
   * they measured), then the stock recordings in their own order.
   */
  readonly candidates: readonly SoundCandidateV1[];
}

/** What a pick or a default of 0 means: the synthesised sound. */
export const SOUND_GENERATED_CHOICE_V1 = STOCK_SOUND_GENERATED_CHOICE_V1;

function choiceSet(id: string): SoundChoiceSetV1 {
  const generated = elevenLabsSoundV1(id);
  const stock = stockSoundV1(id);
  const takes: ElevenLabsCandidateV1[] = (generated?.takes ?? []).map(
    (take) => ({ ...take, origin: "ELEVENLABS" as const }),
  );
  const recordings: StockCandidateV1[] = (stock?.candidates ?? []).map(
    (candidate) => ({ ...candidate, origin: "STOCK" as const }),
  );
  return {
    id,
    default: generated?.default ?? stock?.default ?? SOUND_GENERATED_CHOICE_V1,
    candidates: [...takes, ...recordings],
  };
}

/**
 * Every game sound that has something to choose between: the ElevenLabs
 * manifest's order, then any sound that has only stock recordings.
 */
export const SOUND_CHOICE_SETS_V1: readonly SoundChoiceSetV1[] = [
  ...ELEVENLABS_SOUNDS_V1.map((sound) => sound.id),
  ...STOCK_SOUNDS_V1.map((sound) => sound.id).filter(
    (id) => elevenLabsSoundV1(id) === null,
  ),
].map(choiceSet);

const SETS = new Map(SOUND_CHOICE_SETS_V1.map((set) => [set.id, set]));

/** What a game sound can play; null for a sound with nothing to choose. */
export function soundChoiceSetV1(id: string): SoundChoiceSetV1 | null {
  return SETS.get(id) ?? null;
}

/** One candidate of a game sound; null when there is no such candidate. */
export function soundCandidateV1(id: string, n: number): SoundClipV1 | null {
  const candidate = SETS.get(id)?.candidates.find((entry) => entry.n === n);
  return candidate === undefined ? null : { id, ...candidate };
}

/** Every candidate of every sound. */
export const SOUND_ALL_CLIPS_V1: readonly SoundClipV1[] =
  SOUND_CHOICE_SETS_V1.flatMap((set) =>
    set.candidates.map((candidate) => ({ id: set.id, ...candidate })),
  );

/**
 * The default clip of each sound whose default is a file: what the game
 * fetches at its start and plays without a pick.
 */
export const SOUND_DEFAULT_CLIPS_V1: readonly SoundClipV1[] =
  SOUND_CHOICE_SETS_V1.flatMap((set) => {
    const clip = soundCandidateV1(set.id, set.default);
    return clip === null ? [] : [clip];
  });

/** A candidate's length in seconds. */
export function soundCandidateSecondsV1(candidate: SoundCandidateV1): number {
  return candidate.origin === "ELEVENLABS"
    ? candidate.seconds
    : candidate.endSeconds - candidate.startSeconds;
}

/** Where the browser fetches a candidate's clip. */
export function soundCandidateUrlV1(candidate: {
  readonly file: string;
}): string {
  return stockSoundUrlV1(candidate);
}

/**
 * A candidate's place among its kind: an ElevenLabs take's position among
 * the sound's takes ("New 1" is the first), a stock recording's position
 * among its recordings ("Old 1").
 */
export function soundCandidateOrdinalV1(
  id: string,
  candidate: SoundCandidateV1,
): number {
  const same =
    SETS.get(id)?.candidates.filter(
      (entry) => entry.origin === candidate.origin,
    ) ?? [];
  return same.findIndex((entry) => entry.n === candidate.n) + 1;
}
