/**
 * Scenes for the mountain restyle review (bead pulp_wars-2yc.1,
 * docs/art/COMPOSED_TERRAIN.md). Loaded in the browser through the Vite
 * dev server by scripts/art/look-switch-review.ts; nothing here is part of
 * the game build.
 *
 * The restyle has no switch: the "before" side is another server, a
 * checkout of the commit before it (`SWITCH_BEFORE_URL`), and this module
 * is copied there. Every scene is one an earlier review already drew: the
 * mountain scenes of the composed terrain, a faction's territory, a coast.
 */
export {
  sceneM1 as sceneHeavy,
  sceneM3 as sceneMines,
  sceneM4 as sceneOverview,
  sceneM5 as sceneSnow,
  sceneM6 as sceneBlocks,
} from "../chibi/forest-review-scenes";
export {
  sceneCandy as sceneCandyTerritory,
  sceneMartian as sceneMartianTerritory,
} from "../faction-forests/review-scenes";
export { sceneIceFolk as sceneCoast } from "../coast-sand/review-scenes";
import type { LookSwitchShot } from "../look-switch-review";

/** No such switch exists: the two sides are two servers. */
export const SWITCH_PARAMETER = "mountain-restyle";

const TERRITORY = [240, 200, 960, 590] as const;

export const REVIEW_SHOTS: readonly LookSwitchShot[] = [
  {
    name: "blocks-2x3",
    scene: "sceneBlocks",
    zoomIn: 1,
    drag: [120, 300],
    crop: [400, 275, 720, 560],
    zoom: [455, 340, 210, 265],
  },
  {
    name: "mountain-heavy",
    scene: "sceneHeavy",
    zoomIn: 1,
    crop: [240, 180, 960, 642],
  },
  {
    name: "mines-city-units",
    scene: "sceneMines",
    zoomIn: 1,
    drag: [-70, -80],
    crop: [410, 165, 575, 570],
    zoom: [560, 300, 300, 290],
  },
  { name: "overview", scene: "sceneOverview", zoomIn: 0 },
  {
    name: "snow",
    scene: "sceneSnow",
    zoomIn: 1,
    drag: [-70, -80],
    crop: [410, 165, 575, 570],
    zoom: [560, 300, 300, 290],
  },
  {
    name: "martian-territory",
    scene: "sceneMartianTerritory",
    zoomIn: 1,
    crop: TERRITORY,
    zoom: [960, 200, 240, 300],
  },
  {
    name: "candy-territory",
    scene: "sceneCandyTerritory",
    zoomIn: 1,
    crop: TERRITORY,
    zoom: [960, 200, 240, 300],
  },
  {
    name: "coast",
    scene: "sceneCoast",
    zoomIn: 1,
    crop: [240, 60, 960, 840],
    zoom: [560, 60, 300, 300],
  },
];
