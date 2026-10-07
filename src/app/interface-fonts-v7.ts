/**
 * The interface faces of Ruleset 7 (bead pulp_wars-2yc.35,
 * docs/ui/STYLE.md): Bowlby One for display capitals and Public Sans for
 * everything else, bundled from their Fontsource packages by `main.ts`.
 *
 * A stylesheet face is fetched only when text first uses it, and a Canvas
 * never waits for one: a board label drawn before its face arrived would be
 * set in the fallback. The start therefore asks for the faces by name beside
 * the art preload. It never fails and never holds the game longer than its
 * budget; a face that did not arrive falls back to the system face.
 */
export const INTERFACE_FONT_FACES_V7 = Object.freeze([
  '500 16px "Public Sans"',
  '600 16px "Public Sans"',
  '700 16px "Public Sans"',
  '800 16px "Public Sans"',
  '400 32px "Bowlby One"',
] as const);

export const INTERFACE_FONT_BUDGET_MS_V7 = 2500;

export async function loadInterfaceFontsV7(
  documentRoot: Document,
  budgetMs: number = INTERFACE_FONT_BUDGET_MS_V7,
): Promise<void> {
  const fonts = (documentRoot as { fonts?: FontFaceSet }).fonts;
  if (fonts === undefined || typeof fonts.load !== "function") return;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const budget = new Promise<void>((resolve) => {
    timer = globalThis.setTimeout(resolve, budgetMs);
  });
  try {
    await Promise.race([
      Promise.allSettled(
        INTERFACE_FONT_FACES_V7.map((face) => fonts.load(face)),
      ),
      budget,
    ]);
  } catch {
    // A browser without the Font Loading API draws with the fallback face.
  } finally {
    if (timer !== undefined) globalThis.clearTimeout(timer);
  }
}
