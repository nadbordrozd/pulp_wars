/**
 * The Goblin dry grass in the real game (bead pulp_wars-2yc.53,
 * docs/art/TEXTURED_GROUNDS.md): the scenes of the faction grounds' review
 * (scripts/art/faction-grounds/review-scenes.ts) for the Goblins alone,
 * run through scripts/art/look-switch-review.ts with `SWITCH_BEFORE_URL`
 * naming a server on the commit before (this file and that module copied
 * to the same paths there). No match is played and no PixelLab call is
 * made.
 *
 *   CHROME_PATH=... SWITCH_GAME_URL=http://localhost:6593/ \
 *     SWITCH_BEFORE_URL=http://localhost:6594/ npx tsx \
 *     scripts/art/look-switch-review.ts \
 *     scripts/art/textured-grounds/goblin-review-scenes.ts <out-dir>
 */
import type { LookSwitchShot } from "../look-switch-review";

export {
  sceneGoblinField,
  sceneGoblinGround,
} from "../faction-grounds/review-scenes";

/** No switch: "before" is another server. */
export const SWITCH_PARAMETER = "goblin-dry-grass-review";

export const REVIEW_SHOTS: readonly LookSwitchShot[] = [
  {
    name: "goblin-desktop",
    scene: "sceneGoblinGround",
    zoomIn: 0,
    zoom: [520, 300, 400, 260],
  },
  {
    name: "goblin-selected",
    scene: "sceneGoblinGround",
    zoomIn: 1,
    click: [600, 500],
    zoom: [520, 300, 400, 260],
  },
  {
    name: "goblin-phone",
    scene: "sceneGoblinGround",
    zoomIn: 0,
    size: [390, 844],
  },
  {
    name: "goblin-field",
    scene: "sceneGoblinField",
    zoomIn: 0,
    size: [1440, 1500],
  },
];
