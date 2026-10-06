/**
 * The bytes of the sound files (bead pulp_wars-2yc.20, docs/ui/SOUND.md
 * "Stock recordings"). A browser cannot decode a sound before the player's
 * first gesture (the audio device does not exist yet), but it can fetch
 * the file: the game's start asks for every clip here, without waiting for
 * any of them, and the audio device decodes what has arrived when it
 * opens.
 *
 * A file is fetched once. A fetch that fails is forgotten, so it can be
 * tried again; until a clip is decoded its synthesised fallback plays.
 */

export type SoundFileFetchV1 = (url: string) => Promise<{
  readonly ok: boolean;
  readonly status: number;
  arrayBuffer(): Promise<ArrayBuffer>;
}>;

const files = new Map<string, Promise<ArrayBuffer>>();

/**
 * The bytes of a sound file: the fetch already under way, or a new one.
 * Rejects when the file cannot be fetched.
 */
export function soundFileBytesV1(
  url: string,
  fetchFile: SoundFileFetchV1,
): Promise<ArrayBuffer> {
  const known = files.get(url);
  if (known !== undefined) return known;
  let pending: Promise<ArrayBuffer>;
  try {
    pending = fetchFile(url).then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${url}`);
      return response.arrayBuffer();
    });
  } catch (error) {
    pending = Promise.reject(
      error instanceof Error ? error : new Error(String(error)),
    );
  }
  files.set(url, pending);
  pending.catch(() => {
    if (files.get(url) === pending) files.delete(url);
  });
  return pending;
}

/**
 * Starts fetching sound files and returns at once. Nothing waits for them
 * and a failure is silent: the synthesised sound plays instead.
 */
export function prefetchSoundFilesV1(
  urls: readonly string[],
  fetchFile: SoundFileFetchV1,
): void {
  for (const url of urls)
    soundFileBytesV1(url, fetchFile).catch(() => undefined);
}

/** The files asked for so far (a test and smoke hook). */
export function requestedSoundFilesV1(): readonly string[] {
  return [...files.keys()];
}

/** Forgets every file (tests). */
export function clearSoundFilesV1(): void {
  files.clear();
}
