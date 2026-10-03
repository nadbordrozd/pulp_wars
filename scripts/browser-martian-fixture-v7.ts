import { ruleset7FixtureMountExpressionV7 } from "./browser-undead-fixture-v7";

/**
 * Browser expression for the Martian UI fixtures (bead pulp_wars-t6s.4; dev
 * server only, because it imports `tests/fixtures`). It replaces the
 * running app with a `Ruleset7DomAppView` over a local fixture controller
 * and exposes `globalThis.__MARTIAN_REVIEW__` ({ boardHost, traces, view,
 * snapshotView, at, duel }). Used by the Martian review script.
 */
export type MartianUiFixtureNameV7 =
  | "martianUiFixtureV7"
  | "martianDuelFixtureV7"
  // The Mind Control revision (bead pulp_wars-b5f.3): a controlled unit of
  // each other kind.
  | "martianControlGoblinFixtureV7"
  | "martianControlKnightFixtureV7"
  | "martianControlYetiFixtureV7"
  | "martianControlHammererFixtureV7";

/**
 * The Mind Control revision (bead pulp_wars-b5f.3): a browser expression
 * counting the board canvas pixels near the control visual's dark casing
 * (the Martian faction colour's dark shade) in the box over the cell `at`,
 * from above the head down to the feet, under the mounted fixture's camera.
 * Compared before and after a Mind Control it says whether the taken unit
 * wears the halo.
 */
export function controlCasingPixelsExpressionV7(at: {
  readonly x: number;
  readonly y: number;
}): string {
  return `(async () => {
      const { factionColourShadesV7 } = await import('/src/render/canvas/faction-colours-v7.ts');
      const canvas = document.querySelector('canvas.board-canvas-v7');
      const ratio = canvas.width / canvas.getBoundingClientRect().width;
      const tile = Number(canvas.dataset.tileCssPx ?? '80') * ratio;
      const centre = globalThis.__MARTIAN_REVIEW__.boardHost.cellCentreCssPx(${JSON.stringify(at)});
      const left = Math.max(0, Math.round(centre.x * ratio - tile * 0.6));
      const top = Math.max(0, Math.round(centre.y * ratio - tile * 1.3));
      const width = Math.min(canvas.width - left, Math.round(tile * 1.2));
      const height = Math.min(canvas.height - top, Math.round(tile * 1.8));
      const pixels = canvas.getContext('2d').getImageData(left, top, width, height).data;
      const dark = factionColourShadesV7('MARTIAN').dark;
      const want = [1, 3, 5].map((offset) => Number.parseInt(dark.slice(offset, offset + 2), 16));
      let count = 0;
      for (let index = 0; index < pixels.length; index += 4)
        if (Math.abs(pixels[index] - want[0]) + Math.abs(pixels[index + 1] - want[1]) + Math.abs(pixels[index + 2] - want[2]) <= 24) count += 1;
      return count;
    })()`;
}

export function martianFixtureMountExpressionV7(
  fixture: MartianUiFixtureNameV7,
  artSet: "LEGACY" | "CHIBI",
): string {
  return ruleset7FixtureMountExpressionV7({
    module: "/tests/fixtures/v7-martian-ui.ts",
    fixture,
    artSet,
    global: "__MARTIAN_REVIEW__",
    extras: "at: fixtures.MARTIAN_UI_V7, duel: fixtures.MARTIAN_DUEL_V7",
  });
}
