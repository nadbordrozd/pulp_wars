/**
 * Game states for the Undead terrain review (bead pulp_wars-2yc.14,
 * docs/art/FACTION_GRASS.md, docs/art/FACTION_FORESTS.md). Loaded in the
 * browser through the Vite dev server by scripts/art/look-switch-review.ts;
 * nothing here is part of the game build.
 *
 *   npx vite --port 6593 --strictPort &
 *   CHROME_PATH=... npx tsx scripts/art/look-switch-review.ts \
 *     scripts/art/undead-terrain/review-scenes.ts <out-dir>
 *
 * The forested border scene of the faction forests review: the Human
 * capital on the left, the Undead one on the right with its ashen ground,
 * its dead wood, a Graveyard (its Farm) and units, and a neutral row under
 * both. "Before" is the same page with `?faction-forests=0`.
 */
import type { GameStateV7 } from "../../../src/engine/index";
import { sceneUndead as forestedUndead } from "../faction-forests/review-scenes";
import type { LookSwitchShot } from "../look-switch-review";

export const sceneUndead = (): GameStateV7 => forestedUndead();

export const SWITCH_PARAMETER = "faction-forests";

export const REVIEW_SHOTS: readonly LookSwitchShot[] = [
  { name: "undead-normal", scene: "sceneUndead", zoomIn: 0 },
  {
    name: "undead-near",
    scene: "sceneUndead",
    zoomIn: 1,
    crop: [240, 200, 960, 590],
    zoom: [840, 500, 320, 250],
  },
];
