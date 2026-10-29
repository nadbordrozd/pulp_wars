/**
 * Room codes and share links (`pulp_wars-eqc6.1`, docs/MULTIPLAYER.md
 * section 3): a hosted match is found by a short code of capital letters,
 * also its Firestore document ID. The letters leave out I and O, which read
 * as 1 and 0, so a code read aloud or copied by hand is unambiguous;
 * 24^5, about eight million codes, is plenty for a friendly game, and a
 * collision on creation draws another code.
 */

/** The letters of a room code: A to Z without I and O. */
export const ROOM_CODE_ALPHABET_V7 = "ABCDEFGHJKLMNPQRSTUVWXYZ";
/** The letters in a room code. */
export const ROOM_CODE_LENGTH_V7 = 5;
/** The Firestore rules hold the same pattern. */
export const ROOM_CODE_PATTERN_V7 = /^[A-HJ-NP-Z]{5}$/;
/** The query parameter of a share link: `?join=ABCDE`. */
export const JOIN_PARAMETER_V7 = "join";

/**
 * A fresh room code. `random` returns a float in [0, 1) like
 * `Math.random`; the browser passes a `crypto.getRandomValues` source
 * ({@link cryptoRandomV7}) and the tests a fixed sequence.
 */
export function generateRoomCodeV7(random: () => number): string {
  let code = "";
  for (let index = 0; index < ROOM_CODE_LENGTH_V7; index += 1) {
    const draw = Math.floor(random() * ROOM_CODE_ALPHABET_V7.length);
    code +=
      ROOM_CODE_ALPHABET_V7[
        Math.min(Math.max(draw, 0), ROOM_CODE_ALPHABET_V7.length - 1)
      ];
  }
  return code;
}

/** A `[0, 1)` source from `crypto.getRandomValues`, else `Math.random`. */
export function cryptoRandomV7(): () => number {
  const crypto = (
    globalThis as {
      readonly crypto?: {
        getRandomValues?(array: Uint32Array): Uint32Array;
      };
    }
  ).crypto;
  if (crypto?.getRandomValues === undefined) return Math.random;
  return () => {
    const array = new Uint32Array(1);
    crypto.getRandomValues?.(array);
    return (array[0] ?? 0) / 0x1_0000_0000;
  };
}

/**
 * A typed or pasted code made canonical, or null when it is not a code:
 * upper case, spaces and dashes dropped. A whole share link is accepted
 * too (its `join` parameter is read), so a guest may paste either.
 */
export function normalizeRoomCodeV7(raw: string): string | null {
  const trimmed = raw.trim();
  const fromLink = /[?&]join=([^&#\s]*)/i.exec(trimmed)?.[1];
  const text = (fromLink ?? trimmed).toUpperCase().replace(/[\s-]/g, "");
  return ROOM_CODE_PATTERN_V7.test(text) ? text : null;
}

/**
 * The share link of a code: the page's own address (origin and path, the
 * other parameters dropped) with `?join=CODE`.
 */
export function shareLinkV7(pageUrl: string, code: string): string {
  const url = new URL(pageUrl);
  url.search = "";
  url.hash = "";
  url.searchParams.set(JOIN_PARAMETER_V7, code);
  return url.toString();
}

/** The room code a page was opened with (`?join=CODE`), or null. */
export function joinCodeFromSearchV7(search: string): string | null {
  let value: string | null;
  try {
    value = new URLSearchParams(search).get(JOIN_PARAMETER_V7);
  } catch {
    return null;
  }
  return value === null ? null : normalizeRoomCodeV7(value);
}
