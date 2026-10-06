/**
 * The Undead terrain review with the faction grass switch (bead
 * pulp_wars-2yc.14): the scene of ./review-scenes.ts, "before" being the
 * same page with `?faction-grass=0` (the ashen ground stays, its border is
 * straight, and no other faction ground is drawn).
 */
import type { LookSwitchShot } from "../look-switch-review";

export { sceneUndead } from "./review-scenes";

export const SWITCH_PARAMETER = "faction-grass";

export const REVIEW_SHOTS: readonly LookSwitchShot[] = [
  {
    name: "undead-grass-switch",
    scene: "sceneUndead",
    zoomIn: 1,
    crop: [240, 200, 960, 590],
    zoom: [600, 560, 320, 250],
  },
];
