/**
 * The Web Worker that checks a resumed save's command log (bead
 * `pulp_wars-2yc.95`, `save-history-v7.ts`). It receives the save as JSON,
 * parses it with the full replay (`parseSaveV7`'s default `VERIFY`) and
 * replies `{ ok: true }` or `{ ok: false, diagnostic }`; anything that
 * throws replies `{ failed }`, which the page counts as unchecked.
 */
import { parseSaveV7 } from "../persistence/v7";

addEventListener("message", (event: MessageEvent<unknown>) => {
  try {
    if (typeof event.data !== "string") {
      postMessage({ failed: "not text" });
      return;
    }
    const parsed = parseSaveV7(event.data);
    postMessage(
      parsed.kind === "VALID"
        ? { ok: true }
        : { ok: false, diagnostic: parsed.diagnostic },
    );
  } catch (error) {
    postMessage({
      failed: error instanceof Error ? error.message : String(error),
    });
  }
});
